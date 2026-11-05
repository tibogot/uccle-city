"""UrbIS Land cover StreetSurfaces (measured roadway / sidewalk / junction / median / parking / tram site polygons)
-> data/tiles/<T>/surfaces.json (CONTRACT §5.6), plus the kerb lines derived from them.

    python pipeline/build_surfaces.py --tile I6 [--tile I5 ...] | --all  [--no-topo]

Input: the region GeoPackage of UrbIS Land cover (sources.json "landcover", fetch_urbis.py landcover) and,
for a check only, the UrbIS Topo kerb lines (topo_type BR0101L) of the tile from the Brussels Mobility WFS
(sources.json "topo_roadline", cached in data/raw/urbis/topo_roadline/<T>.geojson).

What is written (local metres, CONTRACT §2):
  surfaces  every level-0 StreetSurfaces polygon cut to the tile: class code `c` (CLASS below), UrbIS TYPE,
            street name, hierarchy, rings (outer + holes, CONTRACT ring rules).
  kerbs     the boundary between RAISED surfaces (sidewalks, medians) and LOW ones (roadway, junctions, tram,
            parking, squares), as polylines oriented so the raised side is on the LEFT: for a segment
            (dx, dz) the raised side is at +(-dz, dx). The viewer extrudes the kerb face along them.
  edges     the outer boundary of all surfaces (where the street meets private land), split into
            raised / low, without the tile border: the viewer hangs a skirt from them down into the terrain.
The surfaces come from the same Paradigm survey as the UrbIS buildings, so they fit together (see
docs/ROADS_RESEARCH.md §1; tools/audit_surfaces.py measures it).

Levels other than 0 (bridges +1, tunnels -1) are counted and left out for now.
A missing input stops with a message: nothing is ever made up.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
import pyogrio
import shapely
from shapely.geometry import LineString, MultiLineString, Point, Polygon, box
from shapely.ops import linemerge, split, unary_union

from common import CONTRACT, RAW, TILES, all_tiles, l72_to_local, local_to_l72, polygon_out, read_json, round2, tile_bounds, write_json

HERE = Path(__file__).resolve().parent
LANDCOVER = RAW / "urbis" / "landcover"
TOPO = RAW / "urbis"          # <key>/<T>[.layer].geojson per sources.json WFS key (topo_roadline, topo_poles)
BOLLARD_STEP = 1.5             # m between bollards along a UrbIS bollard line (CR57L)

# class codes used by the viewer (viewer/surfaces.js SURF_CLASS mirrors this)
CLASS = {"roadway": 0, "tramRoad": 1, "tramSite": 2, "parking": 3, "square": 4, "sidewalk": 5, "median": 6, "path": 7}
TYPE_CLASS = {"S": "roadway", "I": "roadway", "A": "roadway", "B": "roadway", "IL": "roadway", "G": "roadway",
              "SC": "tramRoad", "IC": "tramRoad", "C": "tramSite", "AC": "tramSite", "K": "parking", "P": "square",
              "SW": "sidewalk", "M": "median", "T": "path"}
# raised on a kerb: sidewalks, medians and squares (Place de Saint-Job: the square stands at sidewalk height,
# kerbed all round, verified on site by the owner 2026-11-05)
RAISED = {"sidewalk", "median", "square"}
MERGE = ("sidewalk", "median", "square")      # adjacent pieces of these classes become one polygon
PRECISION = 0.01        # snap to 1 cm (the output precision) so neighbours share vertices exactly
SLIVER = 0.2            # m², dropped
KERB_TOL = 0.08         # m: a raised edge closer than this to a low surface is a kerb
MIN_LINE = 0.25         # m: shorter kerb / edge pieces are dropped


def gpkg_path() -> Path:
    files = sorted(LANDCOVER.rglob("*.gpkg"))
    if not files:
        sys.exit(f"no UrbIS Land cover GeoPackage under {LANDCOVER}: run  python pipeline/fetch_urbis.py landcover")
    return files[-1]


def to_local(geom):
    return shapely.transform(geom, lambda c: np.column_stack(l72_to_local(c[:, 0], c[:, 1])))


def lines_of(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, MultiLineString):
        return list(g.geoms)
    return [x for p in getattr(g, "geoms", []) for x in lines_of(p)]


def polys_of(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [x for p in getattr(g, "geoms", []) for x in polys_of(p)]


def line_out(l):
    pts = [[round2(x), round2(z)] for x, z in l.coords]
    return [p for k, p in enumerate(pts) if k == 0 or p != pts[k - 1]]


def orient_left(line, region):
    """Reverse the line if `region` lies on its right (sampled at the longest segment)."""
    c = np.asarray(line.coords)
    seg = np.diff(c, axis=0)
    k = int(np.argmax(np.hypot(seg[:, 0], seg[:, 1])))
    d = seg[k] / (np.hypot(*seg[k]) or 1)
    mid = (c[k] + c[k + 1]) / 2
    left = Point(mid[0] - d[1] * 0.3, mid[1] + d[0] * 0.3)
    return line if region.contains(left) else LineString(c[::-1])


def merge_same_class(rows):
    """Adjacent polygons of the same RAISED class (the survey cuts one sidewalk into many pieces at every street
    section) become one polygon, so the viewer triangulates and paves them as one continuous surface."""
    out = [r for r in rows if r["cls"] not in MERGE]
    for cls in MERGE:
        group = [r for r in rows if r["cls"] == cls]
        if not group:
            continue
        tree = shapely.STRtree([r["geom"] for r in group])
        for p in polys_of(shapely.set_precision(unary_union([r["geom"] for r in group]), PRECISION)):
            if p.area < SLIVER:
                continue
            # attributes of the largest piece inside (names only matter for squares)
            parts = [group[i] for i in tree.query(p, predicate="intersects") if group[i]["geom"].representative_point().within(p)]
            best = max(parts, key=lambda r: r["geom"].area) if parts else group[0]
            out.append({**best, "geom": p, "merged": len(parts)})
    return out


def _turn(a, b, c):
    """Turning angle (deg) at b of the polyline a-b-c."""
    u, v = b - a, c - b
    lu, lv = np.hypot(*u), np.hypot(*v)
    if lu < 1e-9 or lv < 1e-9:
        return 0.0
    return float(np.degrees(np.arccos(np.clip(np.dot(u, v) / (lu * lv), -1, 1))))


def _catmull(p0, p1, p2, p3, n):
    """n points strictly between p1 and p2 on the centripetal Catmull-Rom spline (alpha 0.5)."""
    def tj(ti, a, b):
        return ti + max(np.hypot(*(b - a)), 1e-6) ** 0.5
    t0 = 0.0; t1 = tj(t0, p0, p1); t2 = tj(t1, p1, p2); t3 = tj(t2, p2, p3)
    out = []
    for k in range(1, n + 1):
        t = t1 + (t2 - t1) * k / (n + 1)
        a1 = (t1 - t) / (t1 - t0) * p0 + (t - t0) / (t1 - t0) * p1
        a2 = (t2 - t) / (t2 - t1) * p1 + (t - t1) / (t2 - t1) * p2
        a3 = (t3 - t) / (t3 - t2) * p2 + (t - t2) / (t3 - t2) * p3
        b1 = (t2 - t) / (t2 - t0) * a1 + (t - t0) / (t2 - t0) * a2
        b2 = (t3 - t) / (t3 - t1) * a2 + (t - t1) / (t3 - t1) * a3
        out.append((t2 - t) / (t2 - t1) * b1 + (t - t1) / (t2 - t1) * b2)
    return out


def smooth_line(coords):
    """A survey line whose vertices sample a curve (gentle turns of 2-40 deg at each vertex, segments up to 12 m)
    gets points on a centripetal Catmull-Rom spline through its vertices: about one per 4 deg of turn and at least
    every 0.5 m in bends; straight runs and sharp corners (> 40 deg) are left as they are. Every original vertex
    stays, so a line shared by two polygons is smoothed the same way for both."""
    c = np.asarray(coords, dtype=float)
    n = len(c)
    if n < 3:
        return c, 0
    turn = np.zeros(n)
    for k in range(1, n - 1):
        turn[k] = _turn(c[k - 1], c[k], c[k + 1])
    curvy = (turn > 2) & (turn < 40)
    out, added = [c[0]], 0
    for k in range(n - 1):
        a, b = c[k], c[k + 1]
        L = np.hypot(*(b - a))
        # a segment is part of a curve when both its ends bend gently (an end of the line counts as its neighbour)
        ca = curvy[k] if 0 < k else curvy[min(1, n - 1)]
        cb = curvy[k + 1] if k + 1 < n - 1 else curvy[max(n - 2, 0)]
        if ca and cb and 0.6 < L < 12:
            p0 = c[k - 1] if k > 0 else 2 * a - b
            p3 = c[k + 2] if k + 2 < n else 2 * b - a
            tsum = (turn[k] + turn[k + 1]) / 2
            m = int(np.clip(max(np.ceil(tsum / 4), np.ceil(L / 0.5) if tsum > 6 else 0) - 1, 0, 23))   # new points
            if m:
                out.extend(_catmull(p0, a, b, p3, m))
                added += m
        out.append(b)
    return np.asarray(out), added


def smooth_network(rows, tbox):
    """Smooth every boundary of the surface partition ONCE (the shared edges between polygons, cut at their
    junction nodes), then rebuild the polygons from the smoothed edges: neighbours stay watertight."""
    if not rows:
        return rows, {}
    edges = lines_of(linemerge(lines_of(unary_union([r["geom"].boundary for r in rows]))))
    new_edges, added = [], 0
    for e in edges:
        c, n = smooth_line(e.coords)
        added += n
        new_edges.append(LineString(c))
    noded = unary_union(new_edges)
    faces = [f for f in polys_of(shapely.GeometryCollection(list(shapely.polygonize(lines_of(noded)).geoms))) if f.area >= 0.05]
    tree = shapely.STRtree([r["geom"] for r in rows])
    groups = {}
    for f in faces:
        pt = f.representative_point()
        hit = [i for i in tree.query(pt, predicate="intersects")]
        if not hit:
            continue                                     # a gap between surfaces, not a surface
        i = min(hit, key=lambda i: rows[i]["geom"].area)
        groups.setdefault(i, []).append(f)
    out = []
    for i, fs in groups.items():
        g = shapely.set_precision(unary_union(fs), PRECISION)
        for p in polys_of(g):
            if p.area >= SLIVER:
                out.append({**rows[i], "geom": p})
    area0 = sum(r["geom"].area for r in rows)
    area1 = sum(r["geom"].area for r in out)
    return out, {"pointsAdded": added, "areaChange": round(area1 - area0, 2), "polygons": [len(rows), len(out)]}


def split_holes(rows):
    """Polygons with holes (a merged sidewalk round a block) are cut along a north-south line through each hole,
    so the viewer only gets simple rings (clipped per grid cell cheaply). Same class, height and paving on both
    sides of the cut, so it does not show."""
    out = []
    for r in rows:
        todo = [r["geom"]]
        while todo:
            g = todo.pop()
            if not g.interiors:
                if g.area >= SLIVER:
                    out.append({**r, "geom": g})
                continue
            hx = shapely.Polygon(g.interiors[0]).representative_point().x
            x0, z0, x1, z1 = g.bounds
            cut = LineString([(hx, z0 - 1), (hx, z1 + 1)])
            pieces = polys_of(shapely.set_precision(shapely.GeometryCollection(list(split(g, cut).geoms)), PRECISION))
            if len(pieces) < 2:                          # should not happen; keep it whole rather than lose it
                out.append({**r, "geom": g})
                continue
            todo.extend(pieces)
    return out


def course_deg(p):
    """Direction of the stone rows on a square: the long side of its minimum rotated rectangle, degrees from +x
    toward +z (as data/overrides.json plazas courseDeg)."""
    r = np.asarray(p.minimum_rotated_rectangle.exterior.coords)
    s = [r[1] - r[0], r[2] - r[1]]
    v = max(s, key=lambda d: np.hypot(*d))
    return round(float(np.degrees(np.arctan2(v[1], v[0]))), 1)


def fetch_topo(tile, e0, n0, e1, n1, key="topo_roadline", layer=None):
    """UrbIS Topo features of the tile from the Brussels Mobility WFS (cached). None if it can't be fetched."""
    d = TOPO / key
    d.mkdir(parents=True, exist_ok=True)
    f = d / f"{tile}{'.' + layer if layer else ''}.geojson"
    if not f.exists():
        url = read_json(HERE / "sources.json")["sources"][key]["wfs"].format(e0=e0, n0=n0, e1=e1, n1=n1, layer=layer)
        print(f"  GET {url}", file=sys.stderr)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            json.loads(data)
        except Exception as e:          # optional layers: report, never substitute
            print(f"  {key} {layer or ''} not fetched ({e}); skipped", file=sys.stderr)
            return None
        f.write_bytes(data)
    return json.loads(f.read_text(encoding="utf-8"))


def bollards_of(tile, e0, n0, e1, n1, tbox):
    """Surveyed bollards (UrbIS Topo CR5702P fixed bollard points, and CR57L bollard lines sampled every
    BOLLARD_STEP): [[x, z], ...] in the tile, or None if the WFS can't be reached."""
    pts = []
    pp = fetch_topo(tile, e0, n0, e1, n1, "topo_poles", "pole_point")
    pl = fetch_topo(tile, e0, n0, e1, n1, "topo_poles", "pole_line")
    if pp is None and pl is None:
        return None
    for f in (pp or {}).get("features", []):
        if f["properties"].get("topo_type") == "CR5702P":
            for p in shapely.get_parts(to_local(shapely.geometry.shape(f["geometry"]))):
                pts.append(p)
    for f in (pl or {}).get("features", []):
        if f["properties"].get("topo_type") == "CR57L":
            for l in lines_of(to_local(shapely.geometry.shape(f["geometry"]))):
                n = max(1, int(round(l.length / BOLLARD_STEP)))
                pts += [l.interpolate(k / n, normalized=True) for k in range(n + 1)]
    out = []
    for p in pts:
        if tbox.contains(p) and not any(abs(p.x - q[0]) < 0.3 and abs(p.y - q[1]) < 0.3 for q in out):
            out.append([round2(p.x), round2(p.y)])
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", action="append", help="tile name (repeatable)")
    ap.add_argument("--all", action="store_true", help="every tile of the grid that touches the study area (120)")
    ap.add_argument("--no-topo", action="store_true", help="skip the UrbIS Topo layers (kerb check, bollards: no WFS query)")
    a = ap.parse_args()
    tiles = list(all_tiles()) if a.all else [t.upper() for t in (a.tile or [])]
    if not tiles:
        ap.error("give --tile T (repeatable) or --all")
    failed = []
    for t in tiles:
        try:
            build_tile(t, a.no_topo)
        except Exception as e:          # report and go on: one bad tile must not stop the batch
            print(f"{t}: FAILED {e!r}", file=sys.stderr)
            failed.append(t)
    if failed:
        sys.exit(f"failed: {failed}")


def build_tile(tile, no_topo=False):
    a = argparse.Namespace(no_topo=no_topo)
    x0, z0, x1, z1 = tile_bounds(tile)
    tbox = box(x0, z0, x1, z1)
    e0, n1 = local_to_l72(x0, z0)
    e1, n0 = local_to_l72(x1, z1)
    src = gpkg_path()
    meta, _, wkb, fields = pyogrio.raw.read(src, layer="StreetSurfaces", bbox=(e0 - 2, n0 - 2, e1 + 2, n1 + 2), encoding="cp1252")   # the GPKG text is cp1252, not the UTF-8 it claims
    F = {k: fields[i] for i, k in enumerate(meta["fields"])}
    geoms = shapely.from_wkb(wkb)
    other_lvl, unknown, rows = {}, {}, []
    for k, g in enumerate(geoms):
        lvl, typ = int(F["LVL"][k]), str(F["TYPE"][k])
        if lvl != 0:
            other_lvl[lvl] = other_lvl.get(lvl, 0) + 1
            continue
        cls = TYPE_CLASS.get(typ)
        if cls is None:
            unknown[typ] = unknown.get(typ, 0) + 1
            continue
        g = shapely.set_precision(to_local(g).buffer(0), PRECISION)
        for p in polys_of(g.intersection(tbox)):
            p = shapely.set_precision(p, PRECISION)
            for q in polys_of(p):
                if q.area >= SLIVER:
                    name = F["STRNAMEFRE"][k]
                    rows.append({"cls": cls, "type": typ, "name": None if name is None else str(name),
                                 "hier": None if F["HIERARCHY"][k] is None else str(F["HIERARCHY"][k]),
                                 "id": str(F["INSPIRE_ID"][k]).rsplit(".", 1)[-1], "geom": q})
    if not rows:
        print(f"{tile}: no StreetSurfaces in the tile", file=sys.stderr)
    n_in = len(rows)
    rows = merge_same_class(rows)
    rows, smooth_stats = smooth_network(rows, tbox)
    rows = split_holes(rows)
    for r in rows:
        if r["cls"] == "square":
            r["course"] = course_deg(r["geom"])
    raised =unary_union([r["geom"] for r in rows if r["cls"] in RAISED]) if rows else Polygon()
    low = unary_union([r["geom"] for r in rows if r["cls"] not in RAISED]) if rows else Polygon()
    border = tbox.exterior.buffer(0.02)
    shapely.prepare(raised)
    # kerbs: raised boundary lying on a low surface
    kerb_geom = raised.boundary.intersection(low.buffer(KERB_TOL, join_style="mitre")).difference(border)
    kerbs = [orient_left(l, raised) for l in lines_of(linemerge(lines_of(kerb_geom))) if l.length >= MIN_LINE]
    lowb = low.buffer(KERB_TOL, join_style="mitre")
    edges_r = [l for l in lines_of(linemerge(lines_of(raised.boundary.difference(lowb).difference(border)))) if l.length >= MIN_LINE]
    edges_l = [l for l in lines_of(linemerge(lines_of(low.boundary.difference(raised.buffer(KERB_TOL, join_style="mitre")).difference(border)))) if l.length >= MIN_LINE]
    edges = [{"raised": 1, "line": line_out(orient_left(l, raised))} for l in edges_r] + \
            [{"raised": 0, "line": line_out(orient_left(l, low))} for l in edges_l]

    # optional check against the surveyed kerb lines (UrbIS Topo BR0101L)
    check = None
    topo = None if a.no_topo else fetch_topo(tile, e0, n0, e1, n1)
    if topo is not None:
        tk = [to_local(shapely.geometry.shape(f["geometry"])) for f in topo["features"] if f["properties"].get("topo_type") == "BR0101L"]
        tk = unary_union(tk).intersection(tbox) if tk else None
        if tk is not None and not tk.is_empty and kerbs:
            ours = MultiLineString(kerbs)
            # every metre along the surveyed kerb: distance to the nearest derived kerb
            pts = [l.interpolate(s) for l in lines_of(tk) for s in np.arange(0, l.length, 1.0)]
            d = shapely.distance(np.array(pts, dtype=object), ours)
            check = {"topoKerbLength": round(sum(l.length for l in lines_of(tk)), 1),
                     "derivedKerbLength": round(sum(l.length for l in kerbs), 1),
                     "topoWithin": {f"{t}m": round(float((d <= t).mean()), 3) for t in (0.1, 0.25, 0.5, 1.0)},
                     "medianDistance": round(float(np.median(d)), 3)}
            print(f"  kerb check vs UrbIS Topo BR0101L: {check}", file=sys.stderr)

    bollards = None if a.no_topo else bollards_of(tile, e0, n0, e1, n1, tbox)
    counts = {}
    for r in rows:
        counts[r["type"]] = counts.get(r["type"], 0) + 1
    areas = {}
    for r in rows:
        areas[r["cls"]] = areas.get(r["cls"], 0) + r["geom"].area
    doc = {
        "contract": CONTRACT, "tile": tile,
        "source": {"dataset": "UrbIS Land cover StreetSurfaces (Paradigm, CC0 1.0)", "file": src.name,
                   "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
        "classes": CLASS,
        "counts": {"surfaces": len(rows), "byType": counts, "kerbs": len(kerbs), "edges": len(edges),
                   "skippedLevels": other_lvl, "unknownTypes": unknown,
                   "area": {k: round(v, 1) for k, v in sorted(areas.items())},
                   "kerbLength": round(sum(l.length for l in kerbs), 1), "inputPolygons": n_in, "smoothing": smooth_stats},
        "kerbCheck": check,
        "surfaces": [{"c": CLASS[r["cls"]], "type": r["type"], "name": r["name"], "hier": r["hier"], "id": r["id"],
                      **({"course": r["course"]} if "course" in r else {}), "rings": polygon_out(r["geom"])} for r in rows],
        "kerbs": [line_out(l) for l in kerbs],
        "bollards": bollards,
        "edges": edges,
    }
    out = TILES / tile / "surfaces.json"
    write_json(out, doc)
    print(f"{tile}: {len(rows)} surfaces {counts}, {len(kerbs)} kerb lines ({doc['counts']['kerbLength']} m), "
          f"{len(edges)} outer edges -> {out} ({out.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
