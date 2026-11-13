"""STREET FURNITURE KIT 2, placed per tile: data/furniture/<T>.json (+ summary.json). Deterministic.
docs/assets/FURNITURE2.md has the rules with the counts.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/furniture/build_furniture.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw

Inputs
  OSM (<raw>/osm/area.json)   amenity=bench nodes (backrest, material, direction), amenity=bicycle_parking nodes
                              (bicycle_parking=stands|shed|..., capacity), leisure=park ways (park benches)
  the street (data/tiles/<T>) roads.json, surfaces.json (UrbIS sidewalks / squares), buildings.json, features.json
                              (trees, crossings, signals, fountains); data/streetlife/<T>.json (house numbers = doors,
                              the glass-container sites); data/stops/<T>.json (the STIB poles, shelters, ad panels: kept clear)
Rules (local frame of every piece: x along the kerb, +z = the road side, yaw = atan2(nx, nz) of the normal TOWARD the road)
  bench     the OSM point. backrest=no -> bench_backless; inside an OSM park / > 20 m from a car road -> bench_park; else
            bench_street. material=metal -> metal slats (iVar.x = 1). Facing: OSM direction= when mapped; on a measured
            sidewalk / square within 20 m of a road: facing the road, the front >= 0.6 m behind the kerb (slid back if
            the point is nearer or on the carriageway); elsewhere facing the nearest footpath (or road) within 15 m.
            Clear of buildings, trees (0.35 m), doors (0.9 m), driveways (1.5 m), crossings (1.5 m), the STIB furniture
            (0.5 m), other benches; slid up to 3 m along / 1 m across, else kept at the OSM point and noted.
  hoops     stands / rack / safe_loops: ceil(capacity / 2) hoops (2 bikes each), 3 when no capacity, at most 10, in a
            row along the kerb. Sidewalk >= 3.0 m deep: each hoop's plane ACROSS the sidewalk (bikes perpendicular to
            the kerb), 1.0 m apart, 1.15 m behind the kerb; 2.0 - 3.0 m: the plane ALONG the kerb (bikes parallel to
            it), 2.2 m apart, 0.7 m behind the kerb; narrower: no hoops (counted). Away from roads (squares, parks): the
            row at the OSM point along the nearest road. A hoop that hits something is dropped (the rest stays).
            wall_loops / floor (painted bays): nothing drawn (counted).
  bike box  bicycle_parking=shed (the parking.brussels box, 5 bikes): on the sidewalk along the kerb when the OSM point
            is on a sidewalk >= 4.2 m deep (door to the walkway, 1.5 m left to walk), else in the parking lane against
            the kerb (door to the sidewalk) when the kerb is >= 3.6 m from the road's centreline; the viewer drops the
            parked cars on its footprint (viewer/furniture2/cityFurniture.js keepCarsClear)
  bins      OSM maps 1 waste basket in all of Uccle: placed by rule, in this order, >= 1.5 m walkway always left:
            (1) every STIB stop: a column bin 1.6 m along the kerb from the pole (away from the shelter), 0.45 m behind
            the kerb, its mouth to the walkway; (2) every group of benches (within 12 m): one round bin 0.45 m beyond a
            bench's end; (3) every UrbIS square >= 300 m2: one round bin per 800 m2 (max 4) 1.2 m inside its edge;
            (4) main roads (trunk..tertiary): a column bin every 100 m of road, sides alternating, where no bin stands
            within 50 m. Bins >= 15 m apart (rule 1 and 2 may stand closer to each other: 8 m). Clear of trees, doors,
            driveways, crossings (2 m), the STIB furniture, benches, hoops, boxes.
  glass     the street-life glass-container sites (OSM, Bruxelles-Propreté, data/streetlife/<T>.json glass, not the
            underground ones): a white-glass bank + a coloured-glass bank side by side along the kerb, mouths to the
            walkway (on a sidewalk) or to the street (on a verge / green)
  height    the walking surface (DTM + the measured kerb lift) under the footprint's corners: the piece stands at the
            highest corner minus 3 cm (never below the mean); legs / posts run 0.3 m below the origin; a drop > 0.27 m
            is rejected (slid / dropped / noted)
"""
from __future__ import annotations

import argparse, json, math, sys, time
from collections import Counter
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon
from shapely.strtree import STRtree

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "tools" / "streetlife"))
sys.path.insert(0, str(ROOT / "tools" / "stops"))
from common import TILES, all_tiles, wgs_to_local  # noqa: E402
from build_streetlife import Tile, heading_to_road  # noqa: E402
from build_stops import Street, SHELTER, PANEL, MAIN, NOT_ROAD, h01  # noqa: E402

CONTRACT = "furniture2-0.1"
OUT = ROOT / "data" / "furniture"
# footprints in the piece's local frame (x along, z toward the road), from tools/blender/streetFurniture.py
FOOT = {
    "bench_street": ((-0.90, 0.90), (-0.30, 0.25)), "bench_park": ((-0.95, 0.95), (-0.36, 0.29)),
    "bench_backless": ((-0.90, 0.90), (-0.23, 0.23)), "hoop": ((-0.38, 0.38), (-0.06, 0.06)),
    "bikebox": ((-1.0, 1.0), (-1.09, 1.09)), "bin_round": ((-0.26, 0.26), (-0.26, 0.26)),
    "bin_column": ((-0.2, 0.2), (-0.23, 0.23)), "glassbank": ((-0.83, 0.83), (-0.48, 0.48)),
}
BIKE_ENV = ((-0.9, 0.9), (-0.32, 0.32))             # a hoop with its two bikes (along the hoop's plane)
MAX_DROP = 0.27


def r2(v): return round(float(v), 2)


def r4(v): return round(float(v), 4)


def foot_poly(S, cx, cz, yaw, fp, grow=0.0):
    return S.footprint(cx, cz, yaw, (fp[0][0] - grow, fp[0][1] + grow), (fp[1][0] - grow, fp[1][1] + grow))


def corners(fp):
    (x0, x1), (z0, z1) = fp
    return [(x0, z0), (x1, z0), (x1, z1), (x0, z1), (0.0, 0.0)]


class Furn:
    """per tile: the street (build_stops.Street), the stop furniture to keep clear of, what is placed so far"""
    def __init__(self, name, src):
        self.T = T = Tile(name)
        self.S = Street(T, name)
        f = json.loads((TILES / name / "features.json").read_text(encoding="utf-8"))
        self.fixed = [(p["x"], p["z"]) for p in f.get("points", []) if p["kind"] in ("traffic_signals", "fountain", "street_lamp")]
        self.crossings = [(p["x"], p["z"]) for p in f.get("points", []) if p["kind"] == "crossing"]
        # tram tracks (OSM centrelines): nothing in the parking lane within reach of a tram (1.15 m half width + 0.5 m)
        self.rails = [LineString(l["line"]) for l in f.get("lines", []) if l.get("kind") == "tram" and len(l.get("line", [])) > 1]
        self.trees = self.S.trees
        self.doors = self.S.doors
        self.drive = self.S.drive
        self.tree_idx = STRtree([Point(p) for p in self.trees]) if self.trees else None
        # the stop furniture (data/stops)
        self.stops_doc = None
        self.blocks = []                                              # polygons placed (stops, then ours)
        sp = ROOT / "data" / "stops" / f"{name}.json"
        if sp.exists():
            d = json.loads(sp.read_text(encoding="utf-8"))
            self.stops_doc = d
            for s in d["stops"]:
                self.blocks.append(("stop", Point(s["pole"]["x"], s["pole"]["z"]).buffer(0.15)))
                if s.get("shelter"):
                    sh = s["shelter"]; self.blocks.append(("stop", self.S.footprint(sh["x"], sh["z"], sh["yaw"], SHELTER["x"], SHELTER["z"])))
            for p in d["panels"]:
                self.blocks.append(("stop", self.S.footprint(p["x"], p["z"], p["yaw"], PANEL["x"], PANEL["z"])))
        # footpaths (benches in parks face them), parks
        self.paths = [LineString(r["line"]) for r in T.roads if r["hw"] in ("footway", "path", "pedestrian", "cycleway", "steps") and len(r["line"]) > 1]
        self.parks = [p for p in src["parks"] if p.intersects(Polygon([(T.x0, T.z0), (T.x1, T.z0), (T.x1, T.z1), (T.x0, T.z1)]))]

    def near_pts(self, poly, pts, r):
        c = poly.centroid
        return any(abs(p[0] - c.x) < 10 and abs(p[1] - c.y) < 10 and poly.distance(Point(p)) < r for p in pts)

    def clear(self, poly, why, tree=0.35, door=0.9, drive=1.5, cross=1.5, stop=0.5, own=0.3, fixed=0.5, building=True):
        T = self.T
        if building and any(T.solids[i]["poly"].intersects(poly) for i in T.tree.query(poly)): why.append("building"); return False
        if tree and self.tree_idx is not None:
            for i in self.tree_idx.query(poly.buffer(tree)):
                if poly.distance(Point(self.trees[i])) < tree: why.append("tree"); return False
        if door and self.near_pts(poly, self.doors, door): why.append("door"); return False
        if drive and any(poly.distance(l) < drive for l in self.drive if l.distance(poly.centroid) < 20): why.append("driveway"); return False
        if cross and self.near_pts(poly, self.crossings, cross): why.append("crossing"); return False
        if fixed and self.near_pts(poly, self.fixed, fixed): why.append("signal/fountain/lamp"); return False
        for kind, b in self.blocks:
            r = stop if kind == "stop" else own
            if r is not None and b.distance(poly) < r: why.append(kind); return False
        return True

    def height(self, cx, cz, yaw, fp, bury=0.03):
        return self.S.height(cx, cz, yaw, corners(fp), bury)

    def kerb_at(self, x, z):
        """(t, n, d_road, rr, kerb) at (x, z): along / toward-road unit vectors, the road, the measured kerb
        (s_kerb along -n from (x, z): kerb point = (x, z) - n * s_kerb; depth) or None"""
        (tx, tz), (nx, nz), d, rr = heading_to_road(self.T, x, z)
        k = self.S.kerb(x, z, nx, nz) if d is not None and d < 30 else None
        return (tx, tz), (nx, nz), d, rr, k


# ------------------------------------------------------------------------------------------------ benches
def compass_yaw(deg):
    """OSM direction= (the way the sitter looks, compass degrees) -> yaw (local +z = the look)"""
    a = math.radians(float(deg))
    fx, fz = math.sin(a), -math.cos(a)                                   # local x = east, z = south
    return math.atan2(fx, fz)


def place_benches(F: Furn, nodes, out, stats):
    T, S = F.T, F.S
    for e in nodes:
        t = e["tags"]
        x, z = e["x"], e["z"]
        why = []
        in_park = any(p.contains(Point(x, z)) for p in F.parks)
        (tx, tz), (nx, nz), d, rr, k = F.kerb_at(x, z)
        # a street bench: on a measured sidewalk / square near a road, or just off it (<= 3 m: the point is often drawn
        # at the kerb or on the carriageway); anything farther is a park / garden bench at its own point
        street = not in_park and d is not None and ((d < 20 and S.walkable(x, z)) or (k is not None and d < 12 and k[0] <= 3.0))
        piece = "bench_backless" if t.get("backrest") == "no" else ("bench_street" if street else "bench_park")
        fp = FOOT[piece]
        metal = 1 if t.get("material") in ("metal", "steel") else 0
        tone = round(0.25 + 0.6 * h01(str(e["id"]) + "t"), 2)
        cands = []
        if street and k is not None:
            sk, depth = k
            yaw = math.atan2(nx, nz)
            # the bench's front (local z max) >= 0.6 m behind the kerb; keep the OSM distance when it is farther
            s_here = -sk                                                    # (x, z) is s_here behind the kerb (negative: on the road)
            need = 0.6 + fp[1][1]
            back = max(s_here, need)
            if depth < need - fp[1][0] + 0.05: why.append(f"sidewalk {depth:.2f} m: the bench takes it whole")
            base = (x - nx * (sk + back), z - nz * (sk + back))
            for a in (0, 0.5, -0.5, 1.0, -1.0, 1.6, -1.6, 2.3, -2.3, 3.0, -3.0):
                for b in (0, 0.3, 0.6, 1.0):
                    cands.append((base[0] + tx * a - nx * b, base[1] + tz * a - nz * b, yaw))
        else:
            if t.get("direction") and str(t["direction"]).replace(".", "", 1).isdigit():
                yaw = compass_yaw(t["direction"])
            else:
                best = None
                for ln in F.paths:
                    dd = ln.distance(Point(x, z))
                    if dd < 15 and (best is None or dd < best[0]): best = (dd, ln)
                if best and best[0] > 0.3:
                    q = best[1].interpolate(best[1].project(Point(x, z)))
                    yaw = math.atan2(q.x - x, q.y - z)
                elif best:
                    s0 = best[1].project(Point(x, z)); p0 = best[1].interpolate(max(0, s0 - 0.5)); p1 = best[1].interpolate(s0 + 0.5)
                    yaw = math.atan2(-(p1.y - p0.y), p1.x - p0.x) if p1.distance(p0) > 0 else math.atan2(nx, nz)
                else:
                    yaw = math.atan2(nx, nz)
            if t.get("direction") and street and k is not None: pass
            for a in (0, 0.4, -0.4, 0.8, -0.8, 1.3, -1.3):
                for b in (0, 0.4, -0.4):
                    ax, az = math.cos(yaw), -math.sin(yaw)                  # local x in world (rotation Y by yaw)
                    bx, bz = math.sin(yaw), math.cos(yaw)                   # local z (the look)
                    cands.append((x + ax * a + bx * b, z + az * a + bz * b, yaw))
        if t.get("direction") and street and k is not None:
            dy = compass_yaw(t["direction"])
            cands = [(cx, cz, dy) for cx, cz, _ in cands]
            stats["bench_direction_tag"] += 1
        placed = None
        for cx, cz, yw in cands:
            poly = foot_poly(S, cx, cz, yw, fp)
            w = []
            if street and not all(S.walkable(px, pz) for px, pz in list(poly.exterior.coords)[:4]): w.append("off the sidewalk")
            elif not F.clear(poly, w): pass
            else:
                y, drop = F.height(cx, cz, yw, fp)
                if drop > MAX_DROP: w.append(f"slope {drop:.2f}")
                else: placed = (cx, cz, yw, y, drop, poly); break
            if w and len(why) < 3: why.append(w[-1])
        if placed is None:
            cx, cz, yw = cands[0]
            y, drop = F.height(cx, cz, yw, fp)
            if drop > MAX_DROP:                      # never a floating foot: the downhill legs reach 0.3 m down, the uphill
                y = y - drop + MAX_DROP; drop = MAX_DROP; stats["bench_sunk_uphill"] += 1     # ones go deeper into the ground
            placed = (cx, cz, yw, y, drop, foot_poly(S, cx, cz, yw, fp))
            stats["bench_kept_blocked"] += 1
        cx, cz, yw, y, drop, poly = placed
        moved = math.hypot(cx - x, cz - z)
        stats["bench_moved_m_max"] = max(stats["bench_moved_m_max"], round(moved, 2))
        if moved > 0.05: stats["bench_moved"] += 1
        rec = {"id": f"osm:n{e['id']}", "piece": piece, "x": r2(cx), "y": r2(y), "z": r2(cz), "yaw": r4(yw), "var": metal, "tone": tone, "drop": r2(drop), "moved": r2(moved)}
        if why and placed is not None and moved > 0.05: rec["notes"] = why[:3]
        out["benches"].append(rec)
        F.blocks.append(("bench", poly))
        stats["benches"] += 1; stats[piece] += 1; stats["bench_metal"] += metal


# ------------------------------------------------------------------------------------------------ bike parking
def place_bikes(F: Furn, nodes, out, stats):
    T, S = F.T, F.S
    for e in nodes:
        t = e["tags"]
        x, z = e["x"], e["z"]
        kind = t.get("bicycle_parking") or "stands"
        (tx, tz), (nx, nz), d, rr, k = F.kerb_at(x, z)
        yaw_road = math.atan2(nx, nz)
        if kind == "shed":
            place_box(F, e, out, stats, (tx, tz), (nx, nz), d, rr, k)
            continue
        if kind in ("wall_loops", "floor", "lockers", "building"):
            stats["bikes_not_drawn_" + kind] += 1; continue
        try: cap = int(str(t.get("capacity", "")).split(";")[0])
        except ValueError: cap = 0
        n = min(10, max(1, math.ceil(cap / 2))) if cap > 0 else 3
        stats["hoops_wanted"] += n
        if k is not None and d is not None and d < 20:
            sk, depth = k
            if depth >= 3.0: plane, off, step, hyaw = "across", 1.15, 1.0, yaw_road + math.pi / 2
            elif depth >= 2.0: plane, off, step, hyaw = "along", 0.7, 2.2, yaw_road
            else: stats["bike_rows_no_room"] += 1; stats["hoops_no_room"] += n; continue
            s_here = -sk
            back = off if s_here < off + 0.8 else min(s_here, depth - 1.6)         # (keep the OSM depth when it fits)
            base = (x - nx * (sk + back), z - nz * (sk + back))
            along = (tx, tz)
        else:
            plane, step, hyaw = "free", 1.0, yaw_road + math.pi / 2
            base = (x, z); along = (tx, tz)
        stats["bike_rows_" + plane] += 1
        best = None
        for shift in (0, 1.0, -1.0, 2.0, -2.0, 3.0, -3.0, 4.0, -4.0):
            hoops = []
            for i in range(n):
                a = shift + (i - (n - 1) / 2) * step
                hx, hz = base[0] + along[0] * a, base[1] + along[1] * a
                env = foot_poly(S, hx, hz, hyaw, BIKE_ENV)
                w = []
                if plane != "free" and not all(S.walkable(px, pz) for px, pz in list(env.exterior.coords)[:4]): continue
                if not F.clear(env, w, tree=0.25, door=0.6, drive=1.2, cross=1.0, stop=0.4, own=0.2): continue
                y, drop = F.height(hx, hz, hyaw, FOOT["hoop"], bury=0.0)
                if drop > MAX_DROP: continue
                hoops.append((hx, hz, y, env))
            if best is None or len(hoops) > len(best[1]): best = (shift, hoops)
            if len(hoops) == n: break
        hoops = best[1] if best else []
        stats["hoops"] += len(hoops); stats["hoops_dropped"] += n - len(hoops)
        if not hoops: stats["bike_rows_blocked"] += 1; continue
        for hx, hz, y, env in hoops:
            out["hoops"].append({"x": r2(hx), "y": r2(y), "z": r2(hz), "yaw": r4(hyaw), "id": f"osm:n{e['id']}"})
            F.blocks.append(("hoop", env))
        stats["bike_rows"] += 1


def place_box(F: Furn, e, out, stats, t_, n_, d, rr, k):
    S = F.S
    x, z = e["x"], e["z"]
    (tx, tz), (nx, nz) = t_, n_
    yaw = math.atan2(nx, nz)
    fp = FOOT["bikebox"]
    if k is None:
        cands = [(x, z, yaw, "free")]
    else:
        sk, depth = k
        on_walk = S.walkable(x, z)
        kc = (x - nx * sk, z - nz * sk)                                      # the kerb point
        road_half = (d or 0) + sk if d is not None else 3.0                 # centreline -> kerb
        cands = []
        if on_walk and depth >= 4.2:
            cands += [(kc[0] - nx * (0.5 + 1.09) + tx * a, kc[1] - nz * (0.5 + 1.09) + tz * a, yaw, "sidewalk") for a in (0, 1, -1, 2, -2, 3, -3)]
        if road_half >= 3.6:
            cands += [(kc[0] + nx * (0.08 + 1.09) + tx * a, kc[1] + nz * (0.08 + 1.09) + tz * a, yaw, "lane") for a in (0, 1, -1, 2, -2, 3, -3, 4, -4)]
        if not cands and depth >= 3.0:
            cands += [(kc[0] - nx * (0.4 + 1.09) + tx * a, kc[1] - nz * (0.4 + 1.09) + tz * a, yaw, "sidewalk") for a in (0, 1, -1, 2, -2)]
    placed = None
    for cx, cz, yw, mode in cands:
        poly = foot_poly(S, cx, cz, yw, fp)
        w = []
        if mode == "lane":
            # on the carriageway beside the kerb: nothing walkable under it, no crossing / driveway / stop, a tree pit
            # is on the sidewalk (not checked)
            if any(S.walkable(px, pz) for px, pz in list(poly.buffer(-0.15).exterior.coords)[:4]): continue
            if not F.clear(poly, w, tree=0.0, door=0.0, drive=2.0, cross=3.0, stop=1.0, own=0.3, fixed=0.3): continue
            if any(poly.distance(r) < 1.65 for r in F.rails): stats["boxes_try_tram"] += 1; continue
        else:
            if not F.clear(poly, w, tree=0.4, door=1.2, drive=1.5, cross=2.0, stop=0.6, own=0.3): continue
        y, drop = F.height(cx, cz, yw, fp, bury=0.0)
        if mode == "lane": y = min(F.T.ground(px, pz) for px, pz in list(poly.exterior.coords)[:4]) + 0.0
        if drop > MAX_DROP + 0.1: continue
        placed = (cx, cz, yw, y, mode, poly); break
    if not placed:
        stats["boxes_no_room"] += 1; return
    cx, cz, yw, y, mode, poly = placed
    out["boxes"].append({"x": r2(cx), "y": r2(y), "z": r2(cz), "yaw": r4(yw), "mode": mode, "id": f"osm:n{e['id']}"})
    F.blocks.append(("box", poly))
    stats["boxes"] += 1; stats["boxes_" + mode] += 1


# ------------------------------------------------------------------------------------------------ bins
def bin_ok(F: Furn, cx, cz, yaw, piece, need_walk=True, others=None, min_d=15.0):
    S = F.S
    fp = FOOT[piece]
    poly = foot_poly(S, cx, cz, yaw, fp)
    if need_walk and not all(S.walkable(px, pz) for px, pz in list(poly.exterior.coords)[:4]): return None
    if others is not None and any(math.hypot(cx - b["x"], cz - b["z"]) < min_d for b in others): return None
    if not F.clear(poly, [], tree=0.35, door=0.8, drive=1.5, cross=2.0, stop=0.3, own=0.3): return None
    y, drop = F.height(cx, cz, yaw, fp, bury=0.0)
    if drop > 0.2: return None
    return y, poly


def walk_left(F: Furn, x, z, nx, nz, sk, depth, front):
    """is a 1.5 m walkway left behind a piece whose back is `front` m behind the kerb?"""
    return depth - front >= 1.5


def place_bins(F: Furn, out, stats):
    S, T = F.S, F.T
    bins = out["bins"]
    def add(cx, cz, yaw, piece, why, y, poly):
        bins.append({"x": r2(cx), "y": r2(y), "z": r2(cz), "yaw": r4(yaw), "piece": piece, "why": why})
        F.blocks.append(("bin", poly)); stats["bins"] += 1; stats["bins_" + why] += 1
    # (1) STIB stops
    for s in (F.stops_doc or {}).get("stops", []):
        if s["pole"].get("platform"): stats["bins_skip_tram_platform"] += 1; continue
        px, pz, yaw = s["pole"]["x"], s["pole"]["z"], s["pole"]["yaw"]
        nx, nz = math.sin(yaw), math.cos(yaw)                               # toward the road
        tx, tz = nz, -nx                                                    # along the kerb (local +x)
        depth = s["kerb"]["depth"]
        if depth < 0.45 + 0.46 + 1.5: stats["bins_stop_no_room"] += 1; continue
        sides = [1, -1]
        if s.get("shelter"):
            sh = s["shelter"]
            side = 1 if (sh["x"] - px) * tx + (sh["z"] - pz) * tz < 0 else -1
            sides = [side, -side]
        done = False
        for sd in sides:
            for a in (1.6, 2.2, 2.9):
                cx, cz = px + tx * a * sd, pz + tz * a * sd
                r = bin_ok(F, cx, cz, yaw + math.pi, "bin_column", others=bins, min_d=8.0)
                if r: add(cx, cz, yaw + math.pi, "bin_column", "stop", *r); done = True; break
            if done: break
        if not done: stats["bins_stop_blocked"] += 1
    # (2) bench groups
    groups = []
    for b in out["benches"]:
        g = next((g for g in groups if any(math.hypot(b["x"] - c["x"], b["z"] - c["z"]) < 12 for c in g)), None)
        (g.append(b) if g else groups.append([b]))
    for g in groups:
        done = False
        for b in g:
            ax, az = math.cos(b["yaw"]), -math.sin(b["yaw"])
            half = FOOT[b["piece"]][0][1]
            for sd in (1, -1):
                cx, cz = b["x"] + ax * sd * (half + 0.45 + 0.26), b["z"] + az * sd * (half + 0.45 + 0.26)
                street = b["piece"] != "bench_park"
                r = bin_ok(F, cx, cz, b["yaw"], "bin_round", need_walk=street, others=bins, min_d=8.0)
                if r: add(cx, cz, b["yaw"], "bin_round", "bench", *r); done = True; break
            if done: break
        if not done: stats["bins_bench_blocked"] += 1
    # (3) squares
    for poly in S.square_polys:
        if not (T.x0 <= poly.centroid.x < T.x1 and T.z0 <= poly.centroid.y < T.z1): continue
        n = min(4, max(1, int(poly.area // 800)))
        ring = poly.buffer(-1.2)
        if ring.is_empty: continue
        if ring.geom_type == "MultiPolygon": ring = max(ring.geoms, key=lambda p: p.area)
        L = ring.exterior.length
        placed = 0
        for i in range(n * 6):
            if placed >= n: break
            q = ring.exterior.interpolate((i / (n * 6) * L + 7.0 * (i % 6)) % L)
            q2 = poly.exterior.interpolate(poly.exterior.project(q))
            yaw = math.atan2(q2.x - q.x, q2.y - q.y)                        # back to the square's edge... mouth inward
            r = bin_ok(F, q.x, q.y, yaw, "bin_round", others=bins, min_d=max(15.0, L / (n + 1) * 0.6))
            if r: add(q.x, q.y, yaw, "bin_round", "square", *r); placed += 1
        if placed < n: stats["bins_square_short"] += n - placed
    # (4) main roads every 100 m, sides alternating
    side = 1
    for rd in T.roads:
        if rd["hw"] not in MAIN: continue
        line = LineString(rd["line"])
        L = line.length
        s = 50.0
        while s < L - 10:
            q, q2 = line.interpolate(s), line.interpolate(min(L, s + 0.5))
            dx, dz = q2.x - q.x, q2.y - q.y
            l = math.hypot(dx, dz) or 1
            tx, tz = dx / l, dz / l
            for sd in (side, -side):
                nx, nz = -tz * sd, tx * sd                                    # toward the centreline from the sidewalk
                k = S.kerb(q.x, q.y, nx, nz, s0=0.5, s1=14.0)
                if k is None: continue
                sk, depth = k
                if depth < 0.45 + 0.46 + 1.5: stats["bins_main_narrow"] += 1; continue
                yaw = math.atan2(nx, nz)
                ok = None
                for a in (0, 2, -2, 4, -4, 7, -7):
                    cx, cz = q.x - nx * (sk + 0.45 + 0.23) + tx * a, q.y - nz * (sk + 0.45 + 0.23) + tz * a
                    if not T.inside(cx, cz): continue
                    r = bin_ok(F, cx, cz, yaw + math.pi, "bin_column", others=bins, min_d=50.0)
                    if r: ok = (cx, cz, r); break
                if ok:
                    add(ok[0], ok[1], yaw + math.pi, "bin_column", "main_road", *ok[2]); break
            side = -side
            s += 100.0


# ------------------------------------------------------------------------------------------------ glass banks
def place_glass(F: Furn, name, out, stats):
    sl = ROOT / "data" / "streetlife" / f"{name}.json"
    if not sl.exists(): return
    for g in json.loads(sl.read_text(encoding="utf-8")).get("glass", []):
        if g.get("underground"): stats["glass_underground_kept_streetlife"] += 1; continue
        nx, nz = g["nx"], g["nz"]                                            # streetlife: the outward normal (toward the street)
        # on the sidewalk: the mouths (local +z) to the walkway, away from the kerb; off it (a verge, a green): toward the
        # street, where people come from
        on_walk = F.S.walkable(g["x"], g["z"])
        yaw = math.atan2(nx, nz) + (math.pi if on_walk else 0.0)
        stats["glass_on_sidewalk" if on_walk else "glass_off_sidewalk"] += 1
        tx, tz = nz, -nx
        best = None
        for b in (0, 0.3, -0.3, 0.6):
            for a in (0, 0.8, -0.8, 1.6, -1.6):
                cx, cz = g["x"] + tx * a - nx * b, g["z"] + tz * a - nz * b
                pair = [(cx + tx * s * 0.88, cz + tz * s * 0.88) for s in (-1, 1)]
                polys = [foot_poly(F.S, px, pz, yaw, FOOT["glassbank"]) for px, pz in pair]
                if all(F.clear(p, [], tree=0.3, door=0.8, drive=1.2, cross=1.5, stop=0.4, own=0.3) for p in polys):
                    best = (pair, polys); break
            if best: break
        if not best:
            stats["glass_kept_blocked"] += 1
            pair = [(g["x"] + tx * s * 0.88, g["z"] + tz * s * 0.88) for s in (-1, 1)]
            best = (pair, [foot_poly(F.S, px, pz, yaw, FOOT["glassbank"]) for px, pz in pair])
        for k, ((px, pz), poly) in enumerate(zip(*best)):
            y, drop = F.height(px, pz, yaw, FOOT["glassbank"], bury=0.0)
            if drop > MAX_DROP: y = y - drop + MAX_DROP; drop = MAX_DROP; stats["banks_sunk_uphill"] += 1
            out["banks"].append({"x": r2(px), "y": r2(y), "z": r2(pz), "yaw": r4(yaw), "var": k, "id": g["id"]})
            F.blocks.append(("bank", poly))
            stats["banks"] += 1
        stats["glass_sites"] += 1


# ------------------------------------------------------------------------------------------------ main
def osm_sources(raw: Path):
    area = json.loads((raw / "osm" / "area.json").read_text(encoding="utf-8"))["elements"]
    nodes = {e["id"]: e for e in area if e["type"] == "node"}
    benches, bikes, parks = [], [], []
    for e in area:
        t = e.get("tags") or {}
        if e["type"] == "node" and t.get("amenity") in ("bench", "bicycle_parking"):
            if t.get("access") == "private" or t.get("indoor") == "yes" or t.get("level") not in (None, "0"): continue
            x, z = wgs_to_local(e["lon"], e["lat"])
            rec = {"id": e["id"], "x": float(x), "z": float(z), "tags": t}
            (benches if t["amenity"] == "bench" else bikes).append(rec)
        if e["type"] == "way" and t.get("leisure") == "park":
            pts = [wgs_to_local(nodes[n]["lon"], nodes[n]["lat"]) for n in e.get("nodes", []) if n in nodes]
            if len(pts) >= 4:
                p = Polygon([(float(a), float(b)) for a, b in pts]).buffer(0)
                if not p.is_empty: parks.append(p)
    return benches, bikes, parks


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", type=Path, required=True)
    a = ap.parse_args()
    t0 = time.time()
    benches, bikes, parks = osm_sources(a.raw)
    src = {"parks": parks}
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tiles]
    stats = Counter(); stats["bench_moved_m_max"] = 0.0
    OUT.mkdir(parents=True, exist_ok=True)
    per_tile = {}
    for name in tiles:
        if not (TILES / name / "buildings.json").exists(): continue
        F = Furn(name, src)
        T = F.T
        out = {"contract": CONTRACT, "tile": name, "benches": [], "hoops": [], "boxes": [], "bins": [], "banks": []}
        mine = lambda L: sorted([e for e in L if T.inside(e["x"], e["z"])], key=lambda e: e["id"])
        place_bikes(F, [e for e in mine(bikes) if (e["tags"].get("bicycle_parking") == "shed")], out, stats)     # boxes first (biggest)
        place_glass(F, name, out, stats)
        place_benches(F, mine(benches), out, stats)
        place_bikes(F, [e for e in mine(bikes) if (e["tags"].get("bicycle_parking") != "shed")], out, stats)
        place_bins(F, out, stats)
        out["counts"] = {k: len(out[k]) for k in ("benches", "hoops", "boxes", "bins", "banks")}
        out["sources"] = {"benches, bike parking, parks": "OpenStreetMap (c) OpenStreetMap contributors, ODbL",
                          "street": "UrbIS (CC0) via data/tiles", "stops": "data/stops (STIB / OSM)", "glass sites": "data/streetlife (OSM)",
                          "bins": "rule-based (docs/assets/FURNITURE2.md): OSM maps almost none"}
        per_tile[name] = out["counts"]
        if any(out["counts"].values()):
            (OUT / f"{name}.json").write_text(json.dumps(out, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
        else:
            (OUT / f"{name}.json").unlink(missing_ok=True)
        print(name, out["counts"], f"{time.time() - t0:.0f}s", file=sys.stderr)
    summary = {"contract": CONTRACT, "tiles": len(per_tile), "stats": {k: (round(v, 2) if isinstance(v, float) else v) for k, v in sorted(stats.items())},
               "perTile": {k: v for k, v in per_tile.items() if any(v.values())}}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary["stats"], indent=1), f"\n{time.time() - t0:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
