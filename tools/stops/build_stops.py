"""STIB STOPS AND STREET AD PANELS, placed per tile: data/stops/<T>.json (+ summary.json). Deterministic.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/stops/build_stops.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw

Inputs
  STIB stops        Brussels Mobility WFS bm_public_transport:stib_stops (<raw>/streetlife/stib_stops.json): position,
                    FR / NL names, mode, lines
  served lines      the STIB GTFS (data/raw/gtfs/stib.zip of THIS checkout, CC BY 4.0 "Source: STIB-MIVB - Open Data"):
                    stop_times -> trips -> routes per stop_id (the WFS line list where the GTFS has none), and each
                    line's own colour / text colour (routes.txt)
  shelters          OSM (<raw>/osm/area.json): bus_stop / platform nodes with shelter=yes matched on ref:STIB_MIVB = the
                    WFS stop_id, else within 15 m; bus platform WAYS with shelter=yes within 15 m. A TRAM stop next to an
                    OSM tram platform way (tram.js draws the platform and its shelter) gets no sidewalk shelter.
  the street        data/tiles/<T>/: roads.json (centrelines), surfaces.json (UrbIS raised surfaces: sidewalks, squares),
                    buildings.json (footprints), features.json (trees, OSM points: benches, bike racks, signals,
                    crossings), terrain (DTM); data/streetlife/<T>.json house numbers = the doors
Rules
  kerb        walking from the WFS point away from the road centreline (the WFS point is often in the carriageway),
              the first UrbIS sidewalk / square; the sidewalk DEPTH = how far it runs before it ends or a building
              starts. No measured sidewalk: the kerb is the road engine's half width.
  pole        0.45 m behind the kerb at the stop (slid up to 3 m along the kerb if a tree, bench, rack or signal is
              there); its flag looks along the street
  shelter     its open side to the road, the roof edge 0.6 m behind the kerb, when the sidewalk is >= 2.45 m deep; on
              a 2.1 - 2.45 m sidewalk its back to the road (0.45 m behind the kerb, open toward the façades, as on
              narrow Brussels pavements); narrower: none (counted). Beside the pole (the pole at its open end), else
              the other side, else further along; clear of trees (0.9 m), buildings, doors (1.2 m), driveways
              (service roads, 2.5 m), benches / racks / signals (0.6 m)
  ad panel    the free-standing double-sided lit panel: 18 m along every MAIN road (trunk / primary / secondary /
              tertiary) out of every junction where >= 3 roads meet with >= 1 main road, the right-hand sidewalk
              first; ranked (more main roads, an UrbIS square within 40 m first), greedy with >= 150 m between
              panels, >= 25 m from any stop, >= 4 m from crossings; across the sidewalk (faces along the street) when
              it is >= 3.5 m deep, along it (faces the road) when >= 2.3 m, else none. 1.5 m always left to walk.
  height      the walking surface (DTM + the measured kerb lift) at the footprint's corners: the piece stands at the
              uphill corner (legs run 0.5 m into the ground: no floating foot on a slope); the drop is reported
Frame (viewer/stops): yaw = atan2(nx, nz) of the unit normal TOWARD the road: local +z = the road side.
"""
from __future__ import annotations

import argparse, csv, io, json, math, re, sys, time, zipfile
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon, box as sbox
from shapely import affinity

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "tools" / "streetlife"))
from common import TILES, all_tiles, wgs_to_local, l72_to_local  # noqa: E402
from build_streetlife import Tile, heading_to_road  # noqa: E402

CONTRACT = "stops-0.1"
OUT = ROOT / "data" / "stops"
SIDEWALK = {4, 5}                                  # surfaces.json classes: square, sidewalk (not medians)
MAIN = {"trunk", "primary", "secondary", "tertiary", "trunk_link", "primary_link", "secondary_link", "tertiary_link"}
NOT_ROAD = {"footway", "path", "steps", "cycleway", "track", "bridleway", "corridor", "pedestrian"}
N_POSTERS = 8
# footprints (local frame: x along the kerb, z toward the road), from tools/blender/stibStops.py
SHELTER = dict(x=(-2.0, 2.0), z=(-0.75, 0.80))     # roof outline (Blender y -> -z)
PANEL = dict(x=(-0.1, 0.1), z=(-0.72, 0.72))       # adpanel: faces along +-x, 1.40 m along z
POLE_R = 0.25


def r2(v): return round(float(v), 2)


def r4(v): return round(float(v), 4)


def h01(s):
    h = 2166136261
    for ch in s.encode():
        h ^= ch; h = (h * 16777619) & 0xffffffff
    return h / 4294967296


# ------------------------------------------------------------------------------------------------ GTFS: lines per stop
def gtfs_lines(zpath: Path):
    if not zpath.exists():
        print("no GTFS at", zpath, "(lines and colours from the WFS only)", file=sys.stderr)
        return {}, {}, None
    z = zipfile.ZipFile(zpath)
    rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), "utf-8-sig"))
    routes = {r["route_id"]: r for r in rd("routes.txt")}
    trip_route = {t["trip_id"]: t["route_id"] for t in rd("trips.txt")}
    per = {}
    for st in rd("stop_times.txt"):
        r = trip_route.get(st["trip_id"])
        if r: per.setdefault(st["stop_id"], set()).add(routes[r]["route_short_name"])
    colours = {r["route_short_name"]: ("#" + (r["route_color"] or "888888"), "#" + (r["route_text_color"] or "FFFFFF"), r["route_type"]) for r in routes.values()}
    feed = next(rd("feed_info.txt"))
    return per, colours, f"STIB-MIVB GTFS {feed['feed_version']} ({feed['feed_start_date']}), CC BY 4.0"


def line_key(s):
    m = re.match(r"([A-Za-z]*)(\d+)", s)
    return (1 if m and m.group(1) else 0, int(m.group(2)) if m else 999, s)


# ------------------------------------------------------------------------------------------------ OSM shelters, platforms
def osm_sources(raw: Path):
    area = json.loads((raw / "osm" / "area.json").read_text(encoding="utf-8"))["elements"]
    nodes = {e["id"]: e for e in area if e["type"] == "node"}
    by_ref, pts, bus_ways, tram_ways = {}, [], [], []
    for e in area:
        t = e.get("tags") or {}
        if e["type"] == "node" and (t.get("highway") == "bus_stop" or t.get("public_transport") == "platform" or t.get("railway") == "tram_stop"):
            x, z = wgs_to_local(e["lon"], e["lat"])
            sh = t.get("shelter")
            ref = t.get("ref:STIB_MIVB")
            if ref:
                for r in re.split(r"[;,]", ref): by_ref[r.strip()] = sh
            if sh == "yes": pts.append((float(x), float(z)))
        if e["type"] == "way" and t.get("public_transport") == "platform":
            line = [wgs_to_local(nodes[n]["lon"], nodes[n]["lat"]) for n in e.get("nodes", []) if n in nodes]
            if len(line) < 2: continue
            ls = LineString([(float(a), float(b)) for a, b in line])
            if t.get("tram") == "yes" or t.get("railway") == "platform": tram_ways.append((ls, t.get("shelter") == "yes"))
            elif t.get("shelter") == "yes": bus_ways.append(ls)
    return by_ref, pts, bus_ways, tram_ways


# ------------------------------------------------------------------------------------------------ per tile helpers
class Street:
    def __init__(self, T: Tile, name: str):
        self.T = T
        d = TILES / name
        f = json.loads((d / "features.json").read_text(encoding="utf-8"))
        self.trees = [(t["x"], t["z"]) for t in f.get("trees", [])]
        self.things = [(p["x"], p["z"]) for p in f.get("points", []) if p["kind"] in ("bench", "bicycle_parking", "traffic_signals", "fountain", "street_lamp")]
        self.crossings = [(p["x"], p["z"]) for p in f.get("points", []) if p["kind"] == "crossing"]
        sl = ROOT / "data" / "streetlife" / f"{name}.json"
        self.doors = []
        if sl.exists():
            s = json.loads(sl.read_text(encoding="utf-8"))
            self.doors = [(n["x"], n["z"]) for n in s.get("numbers", [])]
        self.drive = [LineString(r["line"]) for r in T.roads if r["hw"] == "service" and len(r["line"]) > 1]
        self.squares = [p for p, h in T.raised if False]          # (filled below: class 4 polygons)
        sf = d / "surfaces.json"
        self.square_polys = []
        if sf.exists():
            for s in json.loads(sf.read_text(encoding="utf-8"))["surfaces"]:
                if s["c"] == 4 and s["rings"] and len(s["rings"][0]) >= 3:
                    p = Polygon(s["rings"][0]).buffer(0)
                    if p.area > 300: self.square_polys.append(p)

    def walkable(self, x, z):
        """on a measured sidewalk / square (UrbIS), and not in a building"""
        T = self.T
        if not T.rtree: return False
        q = Point(x, z)
        if not any(self.T.raised[i][1] < 0.14 and T.raised[i][0].contains(q) for i in T.rtree.query(q)): return False
        return not any(T.solids[i]["poly"].contains(q) for i in T.tree.query(q))

    def kerb(self, x, z, nx, nz, s0=-2.5, s1=12.0):
        """walk from (x, z) along -n (away from the road): (s_kerb, depth) of the first measured sidewalk, or None"""
        s, k = s0, None
        while s <= s1:
            if self.walkable(x - nx * s, z - nz * s):
                k = s; break
            s += 0.1
        if k is None: return None
        lo = k - 0.1
        for _ in range(8):                                   # refine the kerb line to ~1 cm
            mid = (lo + k) / 2
            if self.walkable(x - nx * mid, z - nz * mid): k = mid
            else: lo = mid
        e = k
        while e < k + 12 and self.walkable(x - nx * (e + 0.05), z - nz * (e + 0.05)): e += 0.05
        return k, e - k

    def footprint(self, cx, cz, yaw, fx, fz):
        """the rotated rectangle (local x range fx, z range fz) at (cx, cz), yaw (local +z -> (sin, cos))"""
        cs, sn = math.cos(yaw), math.sin(yaw)
        pts = []
        for lx, lz in ((fx[0], fz[0]), (fx[1], fz[0]), (fx[1], fz[1]), (fx[0], fz[1])):
            pts.append((cx + lx * cs + lz * sn, cz - lx * sn + lz * cs))
        return Polygon(pts)

    def clear(self, poly, why, tree=0.9, door=1.2, drive=2.5, thing=0.6, cross=0.0):
        T = self.T
        if any(T.solids[i]["poly"].intersects(poly) for i in T.tree.query(poly)): why.append("building"); return False
        if any(poly.distance(Point(p)) < tree for p in self.trees if abs(p[0] - poly.centroid.x) < 8 and abs(p[1] - poly.centroid.y) < 8): why.append("tree"); return False
        if any(poly.distance(Point(p)) < door for p in self.doors if abs(p[0] - poly.centroid.x) < 8 and abs(p[1] - poly.centroid.y) < 8): why.append("door"); return False
        if any(poly.distance(l) < drive for l in self.drive): why.append("driveway"); return False
        if any(poly.distance(Point(p)) < thing for p in self.things if abs(p[0] - poly.centroid.x) < 8 and abs(p[1] - poly.centroid.y) < 8): why.append("furniture"); return False
        if cross and any(poly.distance(Point(p)) < cross for p in self.crossings): why.append("crossing"); return False
        return True

    def height(self, cx, cz, yaw, feet, bury=0.10):
        """the walking surface (DTM + measured kerb lift) under the piece's FEET (local x, z): it stands at the highest
        foot minus `bury` (the lowest rail may sink that much into the paving), never below the feet's mean; returns
        (y, drop = y - the lowest foot: the gap the 0.5 m legs bridge under the downhill side)"""
        cs, sn = math.cos(yaw), math.sin(yaw)
        ys = [self.T.floor_y(cx + lx * cs + lz * sn, cz - lx * sn + lz * cs) for lx, lz in feet]
        y = max(max(ys) - bury, sum(ys) / len(ys))
        return y, y - min(ys)


SHELTER_FEET = [(-1.87, 0.0), (-1.66, -0.62), (0.1, -0.62), (1.86, -0.62), (1.86, 0.55), (0.42, -0.46), (1.56, -0.46)]
PANEL_FEET = [(0, 0), (-0.08, -0.7), (0.08, 0.7)]
MAX_DROP = 0.42


def place_tile(name, src, stats):
    T = Tile(name)
    S = Street(T, name)
    out = {"contract": CONTRACT, "tile": name, "stops": [], "panels": [], "candidates": []}
    by_ref, sh_pts, bus_ways, tram_ways = src["osm"]
    for f in sorted((src["stib"] or {}).get("features", []), key=lambda f: str(f["properties"].get("stop_id"))):
        x, z = l72_to_local(*f["geometry"]["coordinates"][:2])
        if not T.inside(x, z): continue
        p = f["properties"]
        sid = str(p.get("stop_id"))
        (tx, tz), (nx, nz), d, rr = heading_to_road(T, x, z)
        wfs_lines = [s for s in re.split(r"[{},\s]+", p.get("line") or "") if s]
        g = src["gtfs"].get(sid)
        lines = sorted(g, key=line_key) if g else sorted(wfs_lines, key=line_key)
        stats["lines_gtfs" if g else "lines_wfs"] += 1
        if g and set(g) != set(wfs_lines): stats["lines_differ"] += 1
        col = src["colours"]
        rec = {"id": "stib:" + sid, "fr": p.get("name_fr"), "nl": p.get("name_nl"), "mode": p.get("mode"),
               "lines": [{"n": l, "bg": col.get(l, ("#555555", "#FFFFFF"))[0], "fg": col.get(l, ("#555555", "#FFFFFF"))[1]} for l in lines]}
        why = []
        # sheltered?
        osm_sh = by_ref.get(sid)
        near_sh = any(math.hypot(a - x, b - z) < 15 for a, b in sh_pts) or any(w.distance(Point(x, z)) < 15 for w in bus_ways)
        sheltered = osm_sh == "yes" or (osm_sh is None and near_sh)
        tram_plat = [(w, s) for w, s in tram_ways if w.distance(Point(x, z)) < 25] if p.get("mode") == "Tram" else []
        # the kerb
        k = S.kerb(x, z, nx, nz)
        if k is None:
            half = rr["half"] if rr else 3.0
            sk, depth, measured = (half - (d or 0)), 2.6, False
        else:
            sk, depth = k; measured = True
        yaw = math.atan2(nx, nz)
        # pole: 0.45 m behind the kerb, slid along the kerb if something stands there
        pole = None
        for a in (0, 0.6, -0.6, 1.2, -1.2, 2.0, -2.0, 3.0, -3.0):
            px, pz = x - nx * (sk + 0.45) + tx * a, z - nz * (sk + 0.45) + tz * a
            w = []
            if S.clear(Point(px, pz).buffer(0.05), w, tree=0.45, door=0.6, drive=1.0, thing=0.4):
                pole = (px, pz, a); break
        if pole is None:
            pole = (x - nx * (sk + 0.45), z - nz * (sk + 0.45), 0); why.append("pole: nothing clear within 3 m, kept at the stop")
        py = T.floor_y(pole[0], pole[1])
        rec["pole"] = {"x": r2(pole[0]), "y": r2(py), "z": r2(pole[1]), "yaw": r4(yaw)}
        if tram_plat:
            # on the tram island: the pole goes on the platform's centre line nearest the stop (tram.js draws the slab, 25 cm)
            w = min(tram_plat, key=lambda ws: ws[0].distance(Point(x, z)))[0]
            q = w.interpolate(w.project(Point(x, z)))
            rec["pole"] = {"x": r2(q.x), "y": r2(T.ground(q.x, q.y) + 0.25), "z": r2(q.y), "yaw": r4(yaw), "platform": True}
            stats["poles_on_platform"] += 1
        rec["shelter"] = None
        if sheltered and tram_plat:
            stats["shelter_on_tram_platform"] += 1; why.append("shelter: on the OSM tram platform (tram.js)")
        elif sheltered:
            stats["sheltered"] += 1
            if depth >= 2.45: mode, off, syaw = "open", sk + 0.6 + 0.80, yaw
            elif depth >= 2.1: mode, off, syaw = "back", sk + 0.45 + 0.75, yaw + math.pi
            else: mode = None
            if not mode:
                stats["shelter_no_room"] += 1; why.append(f"shelter: sidewalk {depth:.2f} m (< 2.1 m)")
            else:
                placed = None
                pa = pole[2]
                for a in (pa - 2.55, pa + 2.55, pa - 3.6, pa + 3.6, pa - 5.0, pa + 5.0, pa - 7.0, pa + 7.0):
                    cx, cz = x - nx * off + tx * a, z - nz * off + tz * a
                    poly = S.footprint(cx, cz, syaw, SHELTER["x"], SHELTER["z"])
                    if poly.distance(Point(pole[0], pole[1])) < 0.35: continue
                    w = []
                    if not S.clear(poly, w): why.append(f"shelter at {a:+.1f} m: {w[-1]}"); continue
                    y, drop = S.height(cx, cz, syaw, SHELTER_FEET)
                    if drop > MAX_DROP: why.append(f"shelter at {a:+.1f} m: slope (drop {drop:.2f} m)"); stats["shelter_try_slope"] += 1; continue
                    placed = (cx, cz, poly, y, drop); break
                if placed:
                    cx, cz, poly, y, drop = placed
                    stats["drop_max"] = max(stats["drop_max"], drop)
                    pa_ = int(h01(sid + "a") * N_POSTERS); pb_ = (pa_ + 1 + int(h01(sid + "b") * (N_POSTERS - 1))) % N_POSTERS
                    rec["shelter"] = {"x": r2(cx), "y": r2(y), "z": r2(cz), "yaw": r4(syaw), "mode": mode, "drop": r2(drop), "posters": [pa_, pb_]}
                    stats["shelters"] += 1; stats["shelter_" + mode] += 1
                else:
                    stats["shelter_blocked"] += 1
        rec["kerb"] = {"measured": measured, "depth": r2(depth), "wfsToKerb": r2(sk)}
        if why: rec["notes"] = why[-3:]
        out["stops"].append(rec)
        stats["stops"] += 1
    # ---- ad panel candidates (ranked + spaced globally in main())
    deg = {}
    for r in T.roads:
        if r["hw"] in NOT_ROAD or r["hw"] is None: continue
        for e in (r["a"], r["b"]): deg.setdefault(e, []).append(r)
    for node, rs in deg.items():
        mains = [r for r in rs if r["hw"] in MAIN]
        if len(rs) < 3 or not mains: continue
        n0 = T.nodes[node]
        sq = any(p.distance(Point(n0["x"], n0["z"])) < 40 for p in S.square_polys)
        for r in mains:
            line = LineString(r["line"] if r["a"] == node else list(reversed(r["line"])))
            if line.length < 30: continue
            q, q2 = line.interpolate(18.0), line.interpolate(18.5)
            tx_, tz_ = (q2.x - q.x) / 0.5, (q2.y - q.y) / 0.5
            for side in (-1, 1):                         # -1: right-hand side looking away from the junction
                nx_, nz_ = -tz_ * side, tx_ * side       # unit normal from the sidewalk TOWARD the centreline: walk outward = -n
                k = S.kerb(q.x, q.y, nx_, nz_, s0=0.5, s1=14.0)
                if k is None: continue
                sk, depth = k
                yaw = math.atan2(nx_, nz_)
                if depth >= 3.5: kind, off, pyaw, fx, fz = "across", sk + 0.6 + 0.72, yaw, PANEL["x"], PANEL["z"]
                elif depth >= 2.3: kind, off, pyaw, fx, fz = "along", sk + 0.6 + 0.10, yaw + math.pi / 2, PANEL["x"], PANEL["z"]
                else: continue
                cx, cz = q.x - nx_ * off, q.y - nz_ * off
                poly = S.footprint(cx, cz, pyaw, (fx[0] - 0.05, fx[1] + 0.05), fz)
                if not T.inside(cx, cz): continue
                w = []
                if not S.clear(poly, w, cross=4.0): stats["panel_blocked_" + w[-1]] += 1; continue
                y, drop = S.height(cx, cz, pyaw, PANEL_FEET, bury=0.0)
                y = S.T.floor_y(cx, cz)                       # (one foot pillar: on the ground at its centre; the case is 0.42 m up)
                if drop > MAX_DROP: stats["panel_blocked_slope"] += 1; continue
                out["candidates"].append({"x": r2(cx), "y": r2(y), "z": r2(cz), "yaw": r4(pyaw), "kind": kind, "drop": r2(drop),
                                          "score": len(mains) * 2 + (3 if sq else 0) + (1 if side < 0 else 0), "node": node, "road": r["id"]})
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", type=Path, required=True, help="the data/raw holding streetlife/stib_stops.json and osm/area.json")
    a = ap.parse_args()
    t0 = time.time()
    stib = json.loads((a.raw / "streetlife" / "stib_stops.json").read_text(encoding="utf-8"))
    per, colours, gsrc = gtfs_lines(ROOT / "data" / "raw" / "gtfs" / "stib.zip")
    print(f"GTFS: {len(per)} stops with lines, {len(colours)} lines ({time.time() - t0:.0f}s)", file=sys.stderr)
    src = {"stib": stib, "gtfs": per, "colours": colours, "osm": osm_sources(a.raw)}
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tiles]
    from collections import Counter
    stats = Counter(); stats["drop_max"] = 0.0
    docs = {}
    for t in tiles:
        if not (TILES / t / "buildings.json").exists(): continue
        docs[t] = place_tile(t, src, stats)
    # ---- the ad panels: ranked candidates, greedy with spacing (city-wide), away from the stops
    stops = [(s["pole"]["x"], s["pole"]["z"]) for d in docs.values() for s in d["stops"]]
    cands = sorted([(c, t) for t, d in docs.items() for c in d.pop("candidates")], key=lambda ct: (-ct[0]["score"], ct[0]["node"], ct[0]["road"], ct[0]["x"]))
    kept = []
    for c, t in cands:
        if any(math.hypot(c["x"] - k["x"], c["z"] - k["z"]) < 150 for k, _ in kept): stats["panel_spacing"] += 1; continue
        if any(math.hypot(c["x"] - x, c["z"] - z) < 25 for x, z in stops): stats["panel_near_stop"] += 1; continue
        kept.append((c, t))
    for c, t in kept:
        key = f"{c['node']}:{c['road']}"
        pa_ = int(h01(key + "a") * N_POSTERS); pb_ = (pa_ + 1 + int(h01(key + "b") * (N_POSTERS - 1))) % N_POSTERS
        docs[t]["panels"].append({k: c[k] for k in ("x", "y", "z", "yaw", "kind", "drop")} | {"posters": [pa_, pb_]})
        stats["panels"] += 1; stats["panel_" + c["kind"]] += 1
        stats["drop_max"] = max(stats["drop_max"], c["drop"])
    OUT.mkdir(parents=True, exist_ok=True)
    per_tile = {}
    for t, d in docs.items():
        d["counts"] = {"stops": len(d["stops"]), "shelters": sum(1 for s in d["stops"] if s["shelter"]), "panels": len(d["panels"])}
        d["sources"] = {"stib": "Brussels Mobility WFS bm_public_transport:stib_stops", "lines": gsrc or "WFS",
                        "shelters": "OpenStreetMap (c) OpenStreetMap contributors, ODbL", "street": "UrbIS (CC0) via data/tiles"}
        per_tile[t] = d["counts"]
        (OUT / f"{t}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    summary = {"contract": CONTRACT, "tiles": len(docs), "stats": {k: (round(v, 2) if isinstance(v, float) else v) for k, v in sorted(stats.items())}, "perTile": per_tile}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary["stats"], indent=1), f"\n{time.time() - t0:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
