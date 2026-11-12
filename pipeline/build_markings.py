"""Measured road markings of a tile -> data/tiles/<T>/markings.json (local metres, CONTRACT axes).

    python pipeline/build_markings.py [T ...]          # default: every tile that has raw markings

Inputs: data/raw/markings/<T>.<layer>.geojson (pipeline/fetch_markings.py) and the OSM extract (data/raw/osm/area.json).
What comes out, every item with its source and source id (docs/ROADS_V2_RESEARCH.md §4.1 "the survey decides"):

  crossings  one record per real crossing, in this order of trust:
               bm    Brussels Mobility crossing polygon (pedestrian_crossing_surfaces_2d)
               topo  UrbIS Topo CR2301L: the two edge lines of a crossing, paired here (when no BM polygon covers it)
               osm   an OSM crossing node on a car way, marked (crossing:markings, or crossing=marked|zebra|
                     uncontrolled|traffic_signals: the Belgian convention, flagged rule=true), when no measured
                     crossing is within OSM_MATCH m. Geometry is derived later from the measured carriageway.
             { id, src, poly (bm/topo: the outline), c, axis (road-axis heading, rad: the stripes run along it),
               along (band width along the road, m), across (m), osm?, signals?, confirm[] (other sources that agree) }
  stops      UrbIS Topo CR2302L stop lines and CR2303L give-way lines { id, src, kind, line }
  lines      UrbIS Topo longitudinal lines CR21*/CR22* { id, src, type, kind: solid|dashed|cycle, line }
  arrows     UrbIS Topo CR24*P points { id, type, x, z, angle }
  bm         Brussels Mobility marking inventory, raw (mark_type legend unknown): lines, polys, points
  signs      Brussels Mobility give-way (B1) and stop (B5) signs { id, code, x, z }
  osm        crossing nodes (also unmarked ones, for the checker) and control nodes (give_way / stop / traffic_signals)
             on car ways { id, x, z, th (way heading at the node, rad), kind, dir (+1 way direction, -1 against, 0) }
Items are kept when they touch the tile grown by KEEP m (a crossing over the tile edge comes whole). Nothing is
invented here: no evidence, no record.
"""
from __future__ import annotations

import json
import math
import sys
from collections import defaultdict
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon, box
from shapely.strtree import STRtree

from build_roads import is_car_road
from common import RAW, TILES, l72_to_local, round2, tile_bounds, write_json
from osm import load_osm

SRC = RAW / "markings"
KEEP = 30.0
OSM_MATCH = 6.0            # m: an OSM crossing node this close to a measured crossing is the same crossing
OSM_NEAR_OUTLINE = 3.0     # m: ... or this close to a measured crossing's outline (long diagonal polygons)
AXIS_SEARCH = 15.0         # m: the road axis of a measured crossing = the nearest OSM car way within this
PAIR_GAP = (1.8, 7.0)      # m: the two CR2301L edge lines of one crossing are this far apart
MARKED = {"zebra", "marked", "uncontrolled", "traffic_signals"}
SOLID = {"CR21L", "CR2101L"}
DASHED = {"CR22L", "CR2201L", "CR2202L", "CR2205L"}
CYCLE = {"CR2204L"}


def load(tile, layer):
    f = SRC / f"{tile}.{layer}.geojson"
    if not f.exists():
        return None
    return json.loads(f.read_text(encoding="utf-8")).get("features", [])


def loc(c):
    x, z = l72_to_local(c[0], c[1])
    return [round2(x), round2(z)]


def lines_of(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "LineString":
        return [[loc(p) for p in c]]
    if t == "MultiLineString":
        return [[loc(p) for p in part] for part in c]
    return []


def rings_of(geom):
    t, c = geom["type"], geom["coordinates"]
    if t == "Polygon":
        return [[loc(p) for p in c[0]]]
    if t == "MultiPolygon":
        return [[loc(p) for p in poly[0]] for poly in c]
    return []


def heading(a, b):
    return math.atan2(b[1] - a[1], b[0] - a[0])


def axis_diff(a, b):
    d = abs(a - b) % math.pi
    return min(d, math.pi - d)


class Ways:
    """OSM car ways as segments, for the road axis at a point and the way heading at a node."""

    def __init__(self, osm):
        self.segs, self.lines = [], []
        self.node_way = {}
        for wid, w in osm.ways.items():
            if not is_car_road(w["tags"]):
                continue
            ns = [n for n in w["nodes"] if n in osm.nodes]
            for k in range(len(ns) - 1):
                a, b = osm.nodes[ns[k]], osm.nodes[ns[k + 1]]
                self.segs.append((wid, (a["x"], a["z"]), (b["x"], b["z"])))
                self.lines.append(LineString([(a["x"], a["z"]), (b["x"], b["z"])]))
            for k, n in enumerate(ns):
                self.node_way.setdefault(n, (wid, ns, k, w["tags"]))
        self.tree = STRtree(self.lines)

    def axis_at(self, x, z, r=AXIS_SEARCH):
        p = Point(x, z)
        best = None
        for i in self.tree.query(p.buffer(r)):
            d = self.lines[int(i)].distance(p)
            if d <= r and (best is None or d < best[0]):
                best = (d, int(i))
        if best is None:
            return None, None
        _, a, b = self.segs[best[1]]
        return heading(a, b), best[0]

    def at_node(self, osm, nid):
        if nid not in self.node_way:
            return None
        wid, ns, k, tags = self.node_way[nid]
        a = osm.nodes[ns[max(0, k - 1)]]
        b = osm.nodes[ns[min(len(ns) - 1, k + 1)]]
        return wid, math.atan2(b["z"] - a["z"], b["x"] - a["x"]), tags


def rect_frame(ring, axis):
    """Width along `axis` and length across it of an outline (its extent in the axis frame)."""
    ax, az = math.cos(axis), math.sin(axis)
    u = [p[0] * ax + p[1] * az for p in ring]
    v = [-p[0] * az + p[1] * ax for p in ring]
    return round2(max(u) - min(u)), round2(max(v) - min(v))


def build(tile, osm, ways):
    feats = {l: load(tile, l) for l in ("bm_urbis_topo_marking_line", "bm_urbis_topo_marking_point",
                                        "bm_pedestrian_pedestrian_crossing_surfaces_2d", "bm_equipment_marking_line",
                                        "bm_equipment_marking_polygon", "bm_equipment_marking_point", "bm_equipment_traffic_signs")}
    if all(v is None for v in feats.values()):
        return None
    x0, z0, x1, z1 = tile_bounds(tile)
    keep = box(x0 - KEEP, z0 - KEEP, x1 + KEEP, z1 + KEEP)
    near = lambda g: g.intersects(keep)
    out = {"version": 1, "tile": tile, "keepM": KEEP, "crossings": [], "stops": [], "lines": [], "arrows": [],
           "bm": {"lines": [], "polys": [], "points": []}, "signs": [], "osm": {"crossings": [], "control": []},
           "sources": {"urbisTopo": "CC0 1.0 (bm_urbis_topo marking_line / marking_point)",
                       "brusselsMobility": "bm_pedestrian / bm_equipment layers (licence asked, docs/roads/brussels_mobility_request.md)",
                       "osm": "© OpenStreetMap contributors (ODbL)"}}

    # --- Brussels Mobility crossing polygons
    for f in feats["bm_pedestrian_pedestrian_crossing_surfaces_2d"] or []:
        for ring in rings_of(f["geometry"]):
            poly = Polygon(ring)
            if not poly.is_valid or poly.area < 2 or not near(poly):
                continue
            c = poly.centroid
            axis, dist = ways.axis_at(c.x, c.y)
            if axis is None:      # no car way near: the outline's short side is along the road
                r = list(poly.minimum_rotated_rectangle.exterior.coords)
                s = sorted([(math.dist(r[k], r[k + 1]), heading(r[k], r[k + 1])) for k in range(2)])
                axis = s[0][1]
            along, across = rect_frame(ring[:-1], axis)
            out["crossings"].append({"id": f"bm:{f['properties'].get('crossing_id')}", "src": "bm", "poly": ring[:-1],
                                     "c": [round2(c.x), round2(c.y)], "axis": round(axis, 4), "along": along, "across": across,
                                     "confirm": []})

    # --- UrbIS Topo marking lines
    zebra_edges = []
    for f in feats["bm_urbis_topo_marking_line"] or []:
        t = f["properties"].get("topo_type")
        uid = f["properties"].get("urbis_id")
        for line in lines_of(f["geometry"]):
            if len(line) < 2 or not near(LineString(line)):
                continue
            if t == "CR2301L":
                zebra_edges.append((uid, line))
            elif t in ("CR2302L", "CR2303L"):
                out["stops"].append({"id": f"topo:{uid}", "src": "topo", "type": t, "kind": "stop" if t == "CR2302L" else "giveway", "line": line})
            elif t in SOLID | DASHED | CYCLE:
                out["lines"].append({"id": f"topo:{uid}", "src": "topo", "type": t,
                                     "kind": "solid" if t in SOLID else "dashed" if t in DASHED else "cycle", "line": line})
            else:
                out["lines"].append({"id": f"topo:{uid}", "src": "topo", "type": t, "kind": "other", "line": line})

    # pair CR2301L edges into crossings: near-parallel, PAIR_GAP apart, overlapping along their length
    used = set()
    bm_polys = [(c, Polygon(c["poly"]).buffer(1.0)) for c in out["crossings"]]
    E = [(uid, line, LineString(line)) for uid, line in zebra_edges]
    single = 0
    for i, (ua, la, ga) in enumerate(E):
        if i in used:
            continue
        ha = heading(la[0], la[-1])
        best = None
        for j in range(i + 1, len(E)):
            if j in used:
                continue
            ub, lb, gb = E[j]
            if axis_diff(ha, heading(lb[0], lb[-1])) > math.radians(12):
                continue
            d = ga.distance(gb)
            if not (PAIR_GAP[0] <= ga.centroid.distance(gb) <= PAIR_GAP[1] + 3) or d > PAIR_GAP[1]:
                continue
            # overlap along a's direction
            ax, az = math.cos(ha), math.sin(ha)
            pa = sorted(p[0] * ax + p[1] * az for p in la)
            pb = sorted(p[0] * ax + p[1] * az for p in lb)
            ov = min(pa[-1], pb[-1]) - max(pa[0], pb[0])
            if ov < 0.5 * min(pa[-1] - pa[0], pb[-1] - pb[0]):
                continue
            if best is None or d < best[0]:
                best = (d, j)
        if best is None:
            single += 1
            continue
        j = best[1]
        used.update((i, j))
        ub, lb, gb = E[j]
        hull = LineString(la).union(LineString(lb)).convex_hull
        if hull.geom_type != "Polygon":
            continue
        c = hull.centroid
        dup = [b for b, bp in bm_polys if bp.contains(c)]
        if dup:
            dup[0]["confirm"].append(f"topo:{ua}+{ub}")
            continue
        ring = [[round2(x), round2(z)] for x, z in list(hull.exterior.coords)[:-1]]
        axis = ha + math.pi / 2          # the edge lines run across the road
        ra, _ = ways.axis_at(c.x, c.y)
        if ra is not None and axis_diff(ra, axis) < math.radians(35):
            axis = ra
        along, across = rect_frame(ring, axis)
        out["crossings"].append({"id": f"topo:{ua}+{ub}", "src": "topo", "poly": ring, "c": [round2(c.x), round2(c.y)],
                                 "axis": round(axis, 4), "along": along, "across": across, "confirm": []})
    out["topoUnpairedEdges"] = single

    for f in feats["bm_urbis_topo_marking_point"] or []:
        p = f["geometry"]["coordinates"]
        x, z = loc(p)
        if keep.contains(Point(x, z)):
            out["arrows"].append({"id": f"topo:{f['properties'].get('urbis_id')}", "src": "topo", "type": f["properties"].get("topo_type"),
                                  "x": x, "z": z, "angle": f["properties"].get("angle")})

    # --- Brussels Mobility inventory (raw; the mark_type legend is not published)
    for f in feats["bm_equipment_marking_line"] or []:
        p = f["properties"]
        for line in lines_of(f["geometry"]):
            if len(line) >= 2 and near(LineString(line)):
                out["bm"]["lines"].append({"id": f"bm:{p.get('gid')}", "type": p.get("mark_type"), "material": p.get("material"), "line": line})
    for f in feats["bm_equipment_marking_polygon"] or []:
        p = f["properties"]
        for ring in rings_of(f["geometry"]):
            if len(ring) >= 4 and near(Polygon(ring)):
                out["bm"]["polys"].append({"id": f"bm:{p.get('gid')}", "type": p.get("mark_type"), "material": p.get("material"), "poly": ring[:-1]})
    for f in feats["bm_equipment_marking_point"] or []:
        p = f["properties"]
        if f["geometry"]["type"] == "Point":
            x, z = loc(f["geometry"]["coordinates"])
            if keep.contains(Point(x, z)):
                out["bm"]["points"].append({"id": f"bm:{p.get('gid')}", "type": p.get("mark_type"), "x": x, "z": z, "angle": p.get("angle")})
    for f in feats["bm_equipment_traffic_signs"] or []:
        code = (f["properties"].get("code") or "").strip()
        if code in ("B1", "B5") and f["geometry"]["type"] == "Point":
            x, z = loc(f["geometry"]["coordinates"])
            if keep.contains(Point(x, z)):
                out["signs"].append({"id": f"bm:{f['properties'].get('gid')}", "code": code, "x": x, "z": z})

    # --- OSM crossing and control nodes on car ways
    measured = [Polygon(c["poly"]) if c.get("poly") and len(c["poly"]) >= 3 else Point(*c["c"]) for c in out["crossings"]]
    for nid, n in osm.nodes.items():
        t = n["tags"]
        if not t or not keep.contains(Point(n["x"], n["z"])):
            continue
        hw = t.get("highway")
        is_x = hw == "crossing" or ("crossing" in t and hw != "traffic_signals") or (hw == "traffic_signals" and t.get("crossing"))
        ctrl = hw in ("give_way", "stop", "traffic_signals")
        if not (is_x or ctrl):
            continue
        at = ways.at_node(osm, nid)
        if at is None:
            continue
        wid, th, wtags = at
        x, z = round2(n["x"]), round2(n["z"])
        if is_x:
            mk = t.get("crossing:markings")
            cr = t.get("crossing")
            marked = (mk not in (None, "no")) if mk is not None else (cr in MARKED or t.get("crossing_ref") == "zebra")
            rec = {"id": f"osm:{nid}", "x": x, "z": z, "th": round(th, 4), "way": wid, "crossing": cr, "markings": mk,
                   "marked": marked, "rule": mk is None, "signals": cr == "traffic_signals" or hw == "traffic_signals"}
            out["osm"]["crossings"].append(rec)
            if marked:
                # the same crossing when the node is within OSM_MATCH of a measured centre OR within OSM_NEAR_OUTLINE of
                # a measured OUTLINE (round 2: the long diagonal BM polygons at Alsemberg / Brugmann have their
                # centres 9-12 m from the OSM nodes on the tram and car ways they cross: each node became a band of
                # its own, 2-3 crossings stacked on one), or within OSM_MATCH of an OSM crossing already kept
                pt = Point(x, z)
                cands = []
                for c, shp in zip(out["crossings"], measured):
                    d = pt.distance(shp) if isinstance(shp, Polygon) else pt.distance(Point(*c["c"]))
                    lim = OSM_NEAR_OUTLINE if isinstance(shp, Polygon) else OSM_MATCH
                    d0 = pt.distance(Point(*c["c"]))
                    if d <= lim or d0 <= OSM_MATCH:
                        cands.append((min(d, d0), c))
                cands.sort(key=lambda q: q[0])
                hit = [cands[0][1]] if cands else []
                if hit:
                    hit[0]["confirm"].append(rec["id"])
                    if rec["signals"]:
                        hit[0]["signals"] = True
                else:
                    out["crossings"].append({"id": rec["id"], "src": "osm", "poly": None, "c": [x, z], "axis": round(th, 4),
                                             "along": None, "across": None, "osm": nid, "rule": rec["rule"],
                                             "signals": rec["signals"], "confirm": []})
                    measured.append(Point(x, z))
        if ctrl:
            d = t.get("direction") or t.get("traffic_signals:direction")
            dirv = 1 if d in ("forward",) else -1 if d in ("backward",) else 0
            if wtags.get("oneway") in ("yes", "1", "true") and dirv == 0:
                dirv = 1
            if wtags.get("oneway") == "-1" and dirv == 0:
                dirv = -1
            out["osm"]["control"].append({"id": f"osm:{nid}", "x": x, "z": z, "th": round(th, 4), "way": wid,
                                          "kind": hw, "dir": dirv})
    c = defaultdict(int)
    for k in out["crossings"]:
        c[k["src"]] += 1
    out["counts"] = {"crossings": dict(c), "stops": len(out["stops"]), "lines": len(out["lines"]), "arrows": len(out["arrows"]),
                     "bmLines": len(out["bm"]["lines"]), "bmPolys": len(out["bm"]["polys"]), "signs": len(out["signs"]),
                     "osmCrossings": len(out["osm"]["crossings"]), "osmControl": len(out["osm"]["control"])}
    return out


def main():
    tiles = [t.upper() for t in sys.argv[1:]] or sorted({p.name.split(".")[0] for p in SRC.glob("*.geojson")})
    osm = load_osm()
    ways = Ways(osm)
    for t in tiles:
        doc = build(t, osm, ways)
        if doc is None:
            print(f"{t}: no raw markings (run pipeline/fetch_markings.py)", file=sys.stderr)
            continue
        write_json(TILES / t / "markings.json", doc)
        print(f"{t}: {doc['counts']}", file=sys.stderr)


if __name__ == "__main__":
    main()
