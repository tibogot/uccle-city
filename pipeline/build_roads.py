"""OSM streets -> road-lab saved-data JSON (CONTRACT §5.1).

    python pipeline/build_roads.py --tile G4          # data/tiles/G4/roads.json (tile + 150 m buffer)
    python pipeline/build_roads.py --all              # data/roads/network.json (study box + margin, no cut)

The output is what vendor/roads/roadNetwork.js buildRoadNetwork() takes (style 'eu').
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
from collections import defaultdict
from pathlib import Path

from shapely.geometry import LineString, MultiLineString, Point, box
from shapely.ops import unary_union

from common import CONTRACT, DATA, ROAD_BUFFER, TILES, round2, study_box_local, tile_bounds, write_json
import dual
from osm import load_osm

# Defaults copied from vendor/roads/roadCrossSection.js ROAD_TYPES (only the types we emit).
TYPE_DEFAULTS = {
    "alley": {"radius": 12, "center": {"width": 0, "kind": "none"}, "drive": 2.6, "bike": None, "parking": None, "sidewalk": 1.2},
    "local": {"radius": 25, "center": {"width": 0, "kind": "line"}, "drive": 3.0, "bike": None, "parking": 2.2, "sidewalk": 2.5},
    "collector": {"radius": 60, "center": {"width": 0, "kind": "line"}, "drive": 3.25, "bike": 1.6, "parking": None, "sidewalk": 3.0},
    "avenue": {"radius": 80, "center": {"width": 0, "kind": "line"}, "drive": 3.25, "bike": None, "parking": 2.3, "sidewalk": 3.5},
    "oneWay": {"radius": 25, "center": {"width": 0, "kind": "line"}, "drive": 3.2, "bike": 1.5, "parking": 2.2, "sidewalk": 2.5},
}
DEFAULT_DRIVE_LANES = {"alley": 1, "local": 1, "collector": 1, "avenue": 2, "oneWay": 1}

HIGHWAY_TYPE = {
    "primary": "avenue", "primary_link": "avenue", "secondary": "avenue",
    "secondary_link": "collector", "tertiary": "collector", "tertiary_link": "collector",
    "residential": "local", "unclassified": "local",
    "living_street": "alley", "service": "alley",
}
SKIP_SERVICE = {"parking_aisle", "driveway", "drive-through", "emergency_access"}

SIMPLIFY_TOL = 0.75
MIN_PI_RADIUS = 6.0
TRAM_BUFFER = 3.5


# ---------------------------------------------------------------- tag helpers

def is_car_road(tags) -> bool:
    hw = tags.get("highway")
    if hw not in HIGHWAY_TYPE:
        return False
    if tags.get("area") == "yes":
        return False
    if hw == "service" and tags.get("service") in SKIP_SERVICE:
        return False
    if tags.get("access") in ("no",) and tags.get("motor_vehicle") not in ("yes", "destination"):
        return False
    return True


def oneway_dir(tags) -> int:
    """+1 forward one-way, -1 reverse one-way, 0 two-way. Roundabouts are handled elsewhere."""
    v = tags.get("oneway")
    if v in ("yes", "true", "1"):
        return 1
    if v == "-1" or v == "reverse":
        return -1
    if tags.get("junction") == "roundabout" and v != "no":
        return 1
    return 0


def to_int(v):
    try:
        return int(str(v).split(";")[0])
    except (TypeError, ValueError):
        return None


def side_flags(tags, key, yes_values, reverse: bool):
    """Return (left, right) booleans for tags like sidewalk=both|left|right / key:left / key:right / key:both."""
    left = right = None
    v = tags.get(key)
    if v is not None:
        if v == "both" or v in yes_values:
            left = right = True
        elif v == "left":
            left, right = True, False
        elif v == "right":
            left, right = False, True
        elif v in ("no", "none"):
            left = right = False
    b = tags.get(f"{key}:both")
    if b is not None:
        left = right = b in yes_values or b == "yes"
    lv, rv = tags.get(f"{key}:left"), tags.get(f"{key}:right")
    if lv is not None:
        left = lv in yes_values or lv == "yes"
    if rv is not None:
        right = rv in yes_values or rv == "yes"
    if reverse:
        left, right = right, left
    return left, right


def parking_flags(tags, reverse):
    yes = {"lane", "street_side", "on_street", "half_on_kerb", "on_kerb", "shoulder", "parallel", "diagonal", "perpendicular", "marked"}
    left, right = side_flags(tags, "parking", yes, False)
    # older scheme: parking:lane:<side>=parallel|...|no_parking|no_stopping
    for side in ("both", "left", "right"):
        v = tags.get(f"parking:lane:{side}")
        if v is None:
            continue
        flag = v in yes
        if side in ("both", "left"):
            left = flag
        if side in ("both", "right"):
            right = flag
    if reverse:
        left, right = right, left
    return left, right


def sharrow_flags(tags, reverse):
    """(left, right): OSM cycleway=shared_lane on that side (painted bike symbols in the traffic lane)."""
    def sh(v):
        return v == "shared_lane"
    left = right = sh(tags.get("cycleway")) or sh(tags.get("cycleway:both"))
    if "cycleway:left" in tags:
        left = sh(tags["cycleway:left"])
    if "cycleway:right" in tags:
        right = sh(tags["cycleway:right"])
    if reverse:
        left, right = right, left
    return left, right


def lane_stack(rtype, tags, ow, reverse):
    """Custom `lanes` stack when OSM says more than the type default; else None."""
    keys = ("lanes", "lanes:forward", "lanes:backward", "cycleway", "cycleway:both", "cycleway:left", "cycleway:right",
            "parking:both", "parking:left", "parking:right", "parking:lane:both", "parking:lane:left", "parking:lane:right",
            "sidewalk", "sidewalk:both", "sidewalk:left", "sidewalk:right")
    if not any(k in tags for k in keys) and not (ow and rtype in ("avenue", "collector")):
        return None
    d = TYPE_DEFAULTS[rtype]
    n = to_int(tags.get("lanes"))
    fwd, bwd = to_int(tags.get("lanes:forward")), to_int(tags.get("lanes:backward"))
    if reverse:
        fwd, bwd = bwd, fwd
    if ow:
        fwd, bwd = (fwd or n or DEFAULT_DRIVE_LANES[rtype]), 0
    else:
        if fwd is None and bwd is None:
            if n:
                fwd, bwd = (n + 1) // 2, n // 2
            else:
                fwd = bwd = DEFAULT_DRIVE_LANES[rtype]
        elif fwd is None:
            fwd = max(1, (n or bwd + 1) - bwd)
        elif bwd is None:
            bwd = max(0 if ow else 1, (n or fwd + 1) - fwd)
    bike_yes = {"lane", "track", "opposite_lane", "shared_lane"}
    bl, br = side_flags(tags, "cycleway", bike_yes, reverse)
    shl, shr = sharrow_flags(tags, reverse)
    pl, pr = parking_flags(tags, reverse)
    sl, sr = side_flags(tags, "sidewalk", {"yes", "separate"}, reverse)

    # Lanes the tags do not state are marked "guess": true (type defaults), and an OSM shared_lane bike lane
    # "sharrow": true (bike symbols in the traffic lane, not a lane of its own). The road engine reads the stack as
    # it is (paint v1, the parked cars); the tile worker's paint v2 (viewer/streets/measuredPaint.js) paints no guess
    # and turns sharrow lanes back into symbols (docs/ROADS_V2_RESEARCH.md phase 1, "no evidence, no paint").
    def side(drive_n, bike, bike_guess, sharrow, parking, park_guess, sidewalk):
        out = [{"type": "driving", "width": d["drive"]} for _ in range(drive_n)]
        if bike:
            out.append({"type": "bike", "width": d["bike"] or 1.5, **({"guess": True} if bike_guess else {}), **({"sharrow": True} if sharrow else {})})
        if parking:
            out.append({"type": "parking", "width": d["parking"] or 2.2, **({"guess": True} if park_guess else {})})
        if sidewalk is not False:
            out.append({"type": "sidewalk", "width": d["sidewalk"]})
        return out

    default_bike = d["bike"] is not None
    default_park = d["parking"] is not None
    right = side(fwd, br if br is not None else (default_bike and not ow), br is None, shr, pr if pr is not None else default_park, pr is None, sr)
    left = side(bwd, bl if bl is not None else (default_bike and not ow), bl is None, shl, pl if pl is not None else default_park, pl is None, sl)
    center = dict(d["center"])
    if center.get("kind") == "line":
        center["guess"] = True          # no OSM tag says there is a centre line (the measured lines decide, v2)
    return {"center": center, "left": left, "right": right}


# ---------------------------------------------------------------- geometry helpers

def circumradius(a, b, c):
    ab = math.dist(a, b)
    bc = math.dist(b, c)
    ca = math.dist(c, a)
    cross = abs((b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]))
    if cross < 1e-9:
        return math.inf
    return ab * bc * ca / (2 * cross)


def pis_from_polyline(pts, rtype):
    """Dense polyline (incl. both end nodes) -> simplified interior PIs with radii."""
    if len(pts) <= 2:
        return []
    simp = list(LineString(pts).simplify(SIMPLIFY_TOL, preserve_topology=False).coords)
    simp[0], simp[-1] = pts[0], pts[-1]
    out = []
    rmax = TYPE_DEFAULTS[rtype]["radius"]
    for k in range(1, len(simp) - 1):
        r = circumradius(simp[k - 1], simp[k], simp[k + 1])
        r = max(MIN_PI_RADIUS, min(rmax, r))
        out.append({"x": round2(simp[k][0]), "z": round2(simp[k][1]), "r": round2(r)})
    return out


# ---------------------------------------------------------------- build

def build(osm, region=None, tile=None, buffer=0.0, collapse_dual=True):
    nodes = dict(osm.nodes)          # dual.collapse moves some nodes onto centrelines
    ways = {wid: w for wid, w in osm.ways.items() if is_car_road(w["tags"]) and len(w["nodes"]) >= 2}

    # --- roundabouts: connected junction=roundabout ways -> one centre node
    ring_ways = [wid for wid, w in ways.items() if w["tags"].get("junction") in ("roundabout", "circular")]
    parent = {}

    def find(a):
        while parent.setdefault(a, a) != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    for wid in ring_ways:
        ns = ways[wid]["nodes"]
        for nid in ns:
            parent.setdefault(nid, nid)
        for p, q in zip(ns, ns[1:]):
            parent[find(p)] = find(q)
    groups = defaultdict(set)
    for wid in ring_ways:
        for nid in ways[wid]["nodes"]:
            groups[find(nid)].add(nid)
    ring_of = {}       # osm node id -> roundabout key
    rings = {}         # key -> {"id","x","z","radius","lanes","ways":[...]}
    for root, members in groups.items():
        pts = [(nodes[n]["x"], nodes[n]["z"]) for n in members if n in nodes]
        if len(pts) < 3:
            continue
        cx = sum(p[0] for p in pts) / len(pts)
        cz = sum(p[1] for p in pts) / len(pts)
        rc = sum(math.dist((cx, cz), p) for p in pts) / len(pts)
        rw = [wid for wid in ring_ways if ways[wid]["nodes"][0] in members]
        lanes = max([to_int(ways[w]["tags"].get("lanes")) or 1 for w in rw] or [1])
        lanes = max(1, min(3, lanes))
        lane_w = 5.2 if lanes == 1 else 4.6           # same as roadJunction.js buildRoundaboutGeometry
        key = f"n{min(rw)}" if rw else f"n{root}"
        rings[key] = {"id": key, "x": cx, "z": cz, "centerline": rc, "radius": rc + lanes * lane_w / 2, "lanes": lanes, "ways": rw}
        for n in members:
            ring_of[n] = key
    ring_way_set = {w for r in rings.values() for w in r["ways"]}

    # --- dual carriageways -> one two-way road with a median (see dual.py)
    splits, dual_report = set(), []
    if collapse_dual:
        ov = Path(__file__).resolve().parent / "overrides.json"
        skip = json.loads(ov.read_text(encoding="utf-8")).get("dual", {}).get("skipWays", []) if ov.exists() else []
        splits, ring_join, dual_report = dual.collapse(ways, nodes, ring_of, oneway_dir, lane_stack, HIGHWAY_TYPE, skip)
        ring_of.update(ring_join)

    # --- vertices: way ends + nodes shared by several ways
    use = defaultdict(int)
    for wid, w in ways.items():
        if wid in ring_way_set:
            continue
        ns = w["nodes"]
        for k, nid in enumerate(ns):
            use[nid] += 2 if k in (0, len(ns) - 1) else 1
    for nid in list(use):
        if nid in ring_of:
            use[nid] = 99
    vertex = {nid for nid, c in use.items() if c >= 2}

    # --- pieces between vertices
    pieces = []
    for wid, w in ways.items():
        if wid in ring_way_set:
            continue
        tags = w["tags"]
        ns = [n for n in w["nodes"] if n in nodes]
        ow = oneway_dir(tags)
        reverse = ow == -1
        if reverse:
            ns = ns[::-1]
        start = 0
        k = 0
        for idx in range(1, len(ns)):
            if ns[idx] in vertex or idx == len(ns) - 1:
                seg = ns[start: idx + 1]
                # a closed stretch (loop back to the same vertex) becomes two roads
                halves = [seg[: len(seg) // 2 + 1], seg[len(seg) // 2:]] if seg[0] == seg[-1] and len(seg) >= 4 else [seg]
                for h in halves:
                    if len(h) >= 2 and h[0] != h[-1]:
                        pieces.append({"way": wid, "k": k, "nodes": h, "tags": tags, "ow": ow != 0, "reverse": reverse})
                        k += 1
                start = idx

    # --- type + stack per piece, then merge chains through degree-2 nodes with identical attributes
    for p in pieces:
        t = p["tags"]
        rtype = t.get("__type") or HIGHWAY_TYPE[t["highway"]]
        if p["ow"] and rtype not in ("avenue", "collector"):
            rtype = "oneWay"
        p["type"] = rtype
        p["lanes"] = t["__lanes"] if "__lanes" in t else lane_stack(rtype, t, p["ow"], p["reverse"])
        p["sig"] = (rtype, repr(p["lanes"]), p["ow"], t.get("name"), t.get("bridge"), t.get("tunnel"), t.get("layer"))

    signals = {nid for nid, n in nodes.items() if n["tags"].get("highway") == "traffic_signals"}
    ends = defaultdict(list)
    for idx, p in enumerate(pieces):
        ends[p["nodes"][0]].append(idx)
        ends[p["nodes"][-1]].append(idx)
    merged = set()
    out_pieces = []
    for idx, p in enumerate(pieces):
        if idx in merged:
            continue
        merged.add(idx)
        chain = list(p["nodes"])
        ids = [(p["way"], p["k"])]
        for direction in ("fwd", "bwd"):
            while True:
                tip = chain[-1] if direction == "fwd" else chain[0]
                cand = [j for j in ends[tip] if j not in merged]
                if len(ends[tip]) != 2 or len(cand) != 1 or tip in ring_of or tip in signals:
                    break
                q = pieces[cand[0]]
                if q["sig"] != p["sig"]:
                    break
                qn = q["nodes"]
                if direction == "fwd":
                    if qn[0] == tip:
                        chain += qn[1:]
                    elif not p["ow"] and qn[-1] == tip:
                        chain += qn[::-1][1:]
                    else:
                        break
                else:
                    if qn[-1] == tip:
                        chain = qn[:-1] + chain
                    elif not p["ow"] and qn[0] == tip:
                        chain = qn[::-1][:-1] + chain
                    else:
                        break
                merged.add(cand[0])
                ids.append((q["way"], q["k"]))
                if chain[0] == chain[-1]:
                    break
            if chain[0] == chain[-1]:
                break
        if chain[0] == chain[-1]:
            # a closed loop with no junction on it: split in two so a road has two distinct nodes
            mid = len(chain) // 2
            out_pieces.append({**p, "nodes": chain[: mid + 1], "ids": ids})
            out_pieces.append({**p, "nodes": chain[mid:], "ids": ids, "k": p["k"] + 1000})
        else:
            out_pieces.append({**p, "nodes": chain, "ids": ids})

    # --- tram corridors
    trams = [LineString(osm.coords(w["nodes"])) for w in osm.ways.values()
             if w["tags"].get("railway") == "tram" and len(w["nodes"]) >= 2]
    tram_zone = unary_union([t.buffer(TRAM_BUFFER) for t in trams]) if trams else None

    # --- geometry per piece (roundabout ends snap to the ring centre)
    region_poly = region
    data_nodes = {}
    data_roads = []
    cut_count = 0

    def node_meta(nid):
        t = nodes[nid]["tags"]
        m = {"osm": nid}
        if t.get("highway") == "traffic_signals":
            m["signals"] = True
        if t.get("highway") == "crossing" or t.get("crossing"):
            m["crossing"] = True
        if t.get("highway") == "mini_roundabout":
            m["mini"] = True
        return m

    def add_node(key, x, z, extra):
        if key not in data_nodes:
            data_nodes[key] = {"id": key, "x": round2(x), "z": round2(z), **extra}
        return key

    for p in out_pieces:
        ns = p["nodes"]
        pts = [(nodes[n]["x"], nodes[n]["z"]) for n in ns]
        a_key = b_key = None
        if ns[0] in ring_of:
            r = rings[ring_of[ns[0]]]
            pts = [(r["x"], r["z"])] + [q for q in pts[1:] if math.dist(q, (r["x"], r["z"])) > r["radius"] + 3]
            a_key = r["id"]
        if ns[-1] in ring_of:
            r = rings[ring_of[ns[-1]]]
            pts = [q for q in pts[:-1] if math.dist(q, (r["x"], r["z"])) > r["radius"] + 3] + [(r["x"], r["z"])]
            b_key = r["id"]
        if a_key and a_key == b_key:
            continue
        if len(pts) < 2:
            continue
        line = LineString(pts)
        if line.length < 2:
            continue
        way_id, k = p["way"], p["k"]
        meta = {"osm": way_id, "highway": p["tags"]["highway"]}
        if len(p["ids"]) > 1:
            meta["osmWays"] = sorted({w for w, _ in p["ids"]})
        if "__dual" in p["tags"]:
            meta["dual"] = p["tags"]["__dual"]
        for tag in ("name", "maxspeed", "surface", "bridge", "tunnel", "layer", "lanes", "oneway"):
            if tag in p["tags"]:
                meta[tag] = p["tags"][tag]
        if tram_zone is not None and line.length > 0:
            inside = line.intersection(tram_zone).length / line.length
            if inside > 0.5:
                meta["tram"] = True

        # clip to the region (tile + buffer). Pieces fully inside are kept whole.
        parts = [(line, True, True)]
        if region_poly is not None and not region_poly.contains(line):
            clipped = line.intersection(region_poly)
            if clipped.is_empty:
                continue
            geoms = list(clipped.geoms) if isinstance(clipped, MultiLineString) else [clipped] if isinstance(clipped, LineString) else \
                [g for g in getattr(clipped, "geoms", []) if isinstance(g, LineString)]
            parts = []
            for g in geoms:
                c = list(g.coords)
                a_cut = Point(c[0]).distance(Point(pts[0])) > 0.05
                b_cut = Point(c[-1]).distance(Point(pts[-1])) > 0.05
                parts.append((g, not a_cut, not b_cut))

        for pi, (g, a_orig, b_orig) in enumerate(parts):
            c = list(g.coords)
            if g.length < 2:
                continue
            rid = f"r{way_id}_{k}" + (f"_{pi}" if len(parts) > 1 else "")
            if a_orig:
                ka = a_key or add_node(f"n{ns[0]}", c[0][0], c[0][1], {"meta": node_meta(ns[0])})
            else:
                ka = add_node(f"c{rid}_a", c[0][0], c[0][1], {"meta": {"cut": True}})
                cut_count += 1
            if b_orig:
                kb = b_key or add_node(f"n{ns[-1]}", c[-1][0], c[-1][1], {"meta": node_meta(ns[-1])})
            else:
                kb = add_node(f"c{rid}_b", c[-1][0], c[-1][1], {"meta": {"cut": True}})
                cut_count += 1
            road = {"id": rid, "a": ka, "b": kb, "type": p["type"], "pts": pis_from_polyline(c, p["type"]),
                    "sections": [], "profile": {"mode": "terrain"}, "meta": dict(meta)}
            if p["lanes"]:
                road["lanes"] = p["lanes"]
            if not (a_orig and b_orig):
                road["meta"]["cut"] = True
            data_roads.append(road)

    for r in rings.values():
        if any(rd["a"] == r["id"] or rd["b"] == r["id"] for rd in data_roads):
            data_nodes[r["id"]] = {"id": r["id"], "x": round2(r["x"]), "z": round2(r["z"]), "kind": "roundabout",
                                   "ring": {"radius": round2(r["radius"]), "lanes": r["lanes"]},
                                   "meta": {"osmWays": r["ways"], "centerlineRadius": round2(r["centerline"])}}

    # --- junction control from signals on the node or on an approach within 30 m
    deg = defaultdict(int)
    for rd in data_roads:
        deg[rd["a"]] += 1
        deg[rd["b"]] += 1
    for nid in splits:                  # where a dual carriageway's two halves meet its centreline
        n = data_nodes.get(f"n{nid}")
        if n and deg[n["id"]] == 3 and n.get("kind") != "roundabout":
            n["kind"] = "split"
            n.setdefault("meta", {})["dualSplit"] = True
    for nkey, n in data_nodes.items():
        if n.get("meta", {}).get("signals") and deg[nkey] >= 3:
            n["control"] = "signal"
    for sid in signals:
        if f"n{sid}" in data_nodes:
            continue
        sx, sz = nodes[sid]["x"], nodes[sid]["z"]
        best, bd = None, 30.0
        for nkey, n in data_nodes.items():
            if deg[nkey] >= 3 and n.get("kind") != "roundabout":
                dd = math.hypot(n["x"] - sx, n["z"] - sz)
                if dd < bd:
                    best, bd = nkey, dd
        if best:
            data_nodes[best]["control"] = "signal"

    used = {rd["a"] for rd in data_roads} | {rd["b"] for rd in data_roads}
    out_nodes = [n for k, n in data_nodes.items() if k in used]
    doc = {
        "version": 1, "style": "eu", "terrain": "flat", "nextId": len(out_nodes) + len(data_roads) + 1,
        "nodes": out_nodes, "roads": data_roads,
        "meta": {"contract": CONTRACT, "tile": tile, "bufferM": buffer, "source": "osm",
                 "osmBase": osm.meta.get("osm_base"), "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                 "dual": dual_report,
                 "stats": {"dual": len(dual_report), "roads": len(data_roads), "nodes": len(out_nodes), "roundabouts": sum(1 for n in out_nodes if n.get("kind") == "roundabout"),
                           "cut": cut_count, "tram": sum(1 for r in data_roads if r["meta"].get("tram")),
                           "signals": sum(1 for n in out_nodes if n.get("control") == "signal")}},
    }
    return doc


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--buffer", type=float, default=ROAD_BUFFER)
    args = ap.parse_args()
    osm = load_osm()
    if args.tile:
        x0, z0, x1, z1 = tile_bounds(args.tile)
        region = box(x0 - args.buffer, z0 - args.buffer, x1 + args.buffer, z1 + args.buffer)
        doc = build(osm, region, args.tile.upper(), args.buffer)
        out = TILES / args.tile.upper() / "roads.json"
    elif args.all:
        (xa, xb), (za, zb) = study_box_local()
        region = box(xa - args.buffer, za - args.buffer, xb + args.buffer, zb + args.buffer)
        doc = build(osm, region, None, args.buffer)
        out = DATA / "roads" / "network.json"
    else:
        ap.error("--tile NAME or --all")
    write_json(out, doc)
    print(f"{out}: {doc['meta']['stats']}", file=sys.stderr)


if __name__ == "__main__":
    main()
