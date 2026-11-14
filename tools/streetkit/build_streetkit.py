"""THE STREET KIT, placed per tile: data/streetkit/<T>.json (+ summary.json) and the face atlas
models/streetkit/streetkit_faces.png (tools/streetkit/faceAtlas.py: the sign faces + the Villo station strips).
Deterministic (same inputs, same bytes).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/streetkit/build_streetkit.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw

Inputs (all real data; where a rule decides, it is written here and in docs/assets/STREETKIT.md)
  OSM (<raw>/osm/area.json, ODbL)   highway=give_way / stop nodes (+ direction=forward|backward), traffic_sign=BE:* nodes
                                    and ways, highway=crossing nodes, amenity=parking_entrance / parking nodes, the ways'
                                    maxspeed / oneway / source:maxspeed / highway (via the tiles' roads.json meta)
  the street (data/tiles/<T>/)      roads.json centrelines + the graph, UrbIS sidewalks (surfaces.json), buildings,
                                    trees, OSM points, house numbers = doors (data/streetlife): the stops builder's Street
  street-name plates                data/streetlife/<T>.json plates with mount = post (the street life layer draws the
                                    enamel plate with its text; the kit draws the post and its clamps)
  Villo stations                    data/streetlife/<T>.json villo (Brussels Mobility WFS bm_bike:villo: number, FR / NL
                                    name, bike_stands; OSM amenity=bicycle_rental where the WFS has none)
Rules (Belgian code; a sign stands on the RIGHT of the traffic it addresses, 0.4 m behind the measured kerb, its face
toward that traffic)
  B1 / B5      every OSM give_way / stop node: on the road through it, facing the traffic going (direction=forward /
               backward on the OSM way, else toward the node's nearer junction)
  BE:* nodes   traffic_sign=BE:B1 / B5 / C1 / C3 / D7 / C43 nodes, the same way (codes without a face are skipped)
  F19 / C1     one-way roads (OSM oneway): F19 4 m into the road at every junction where its flow starts, C1 facing the
               wrong way 4 m before every junction where its flow ends (segments >= 12 m)
  C43 50 / 70  at a junction where a road of a lower speed meets it: the faster road's start, for the traffic entering
               it (the Brussels-wide 30 makes 50 the signed exception); >= 150 m between repeats of one road + facing
  C43 30       where the SAME street (name) drops from 50 / 70 to 30
  F4a          zone 30 entries: a 30 road tagged source:maxspeed / maxspeed:type = BE:zone30 entered from a faster road
  F12a / C43 20 living streets (highway=living_street) entered from another street / 20 roads entered from a faster one
  F49          marked crossings without signals (crossing=uncontrolled / marked / zebra) on main roads (tertiary and up)
               or roads >= 50 km/h: one per direction of travel, 1 m before the crossing
  E9a          public car parks: OSM amenity=parking_entrance / parking nodes (not access=private / no / customers): on
               the nearest road's side of the node, facing its traffic
  B15          a main road (secondary and up) 35 m before a junction where a side road has a B1 / B5
  D7 / C3      OSM ways tagged traffic_sign BE:D7 (cycle tracks) / C3: at their ends, for the traffic entering them
  poles        signs within 1.5 m on one side facing alike share a pole (2 plates at most, the code's order of
               precedence on top); the same face within 25 m facing alike is dropped (road splits); a pole is kept off
               buildings, trees (0.5 m), doors (0.8 m), driveways, other furniture (slid up to 3 m along the road) and
               every carriageway
Frame: yaw = atan2(fx, fz) of the face's outward normal (three.js local +Z); plates sit 0.088 m in front of the pole
axis; y = the walking surface under the pole (DTM + measured kerb lift) - 0.02 m (the pole runs 0.35 m into the ground).
"""
from __future__ import annotations

import argparse, json, math, re, sys, time
from collections import Counter, defaultdict
from pathlib import Path

from shapely.geometry import LineString, Point, Polygon

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "tools" / "streetlife"))
sys.path.insert(0, str(ROOT / "tools" / "stops"))
sys.path.insert(0, str(HERE))
from common import TILES, all_tiles, wgs_to_local  # noqa: E402
from build_streetlife import Tile  # noqa: E402
from build_stops import Street  # noqa: E402
from signShapes import FACES, FACE_INDEX, FACE_SHAPE, SHAPES  # noqa: E402
import faceAtlas  # noqa: E402

CONTRACT = "streetkit-0.1"
OUT = ROOT / "data" / "streetkit"
ATLAS = ROOT / "models" / "streetkit" / "streetkit_faces.png"
CAR = {"motorway", "trunk", "primary", "secondary", "tertiary", "unclassified", "residential", "living_street", "service",
       "trunk_link", "primary_link", "secondary_link", "tertiary_link", "road"}
MAIN = {"trunk", "primary", "secondary", "tertiary", "trunk_link", "primary_link", "secondary_link", "tertiary_link"}
MAJOR = {"trunk", "primary", "secondary", "trunk_link", "primary_link", "secondary_link"}
PRECEDENCE = ["B5", "B1", "B15", "B9", "C1", "C3", "C43_70", "C43_50", "C43_30", "C43_20", "D7", "F4a", "F12a", "F19", "F49", "E9a"]
AXIS = 0.088                 # the plate face in front of the pole axis
GAP = 0.05                   # between two stacked plates
TOP1, TOP2 = 2.95, 3.45      # the top plate's top edge on the short (3.10 m) / tall (3.60 m) pole


def r2(v): return round(float(v), 2)
def r4(v): return round(float(v), 4)


def h01(s):
    h = 2166136261
    for ch in s.encode():
        h ^= ch; h = (h * 16777619) & 0xffffffff
    # murmur3's finaliser: FNV alone leaves "id:0", "id:1", ... correlated (the bikes bunched at one end of a row)
    h ^= h >> 16; h = (h * 0x85ebca6b) & 0xffffffff; h ^= h >> 13; h = (h * 0xc2b2ae35) & 0xffffffff; h ^= h >> 16
    return h / 4294967296


def speed(v):
    try: return int(str(v).split()[0])
    except (TypeError, ValueError): return None


# ------------------------------------------------------------------------------------------------ OSM
def osm_sources(raw: Path):
    area = json.loads((raw / "osm" / "area.json").read_text(encoding="utf-8"))["elements"]
    nodes = {e["id"]: e for e in area if e["type"] == "node"}
    ways = {e["id"]: e for e in area if e["type"] == "way"}
    on_way = defaultdict(list)                  # node id -> [(way, index)] of car roads (for direction=forward / backward)
    for w in ways.values():
        if (w.get("tags") or {}).get("highway") in CAR:
            for i, n in enumerate(w.get("nodes", [])): on_way[n].append((w, i))
    pts = []
    for e in nodes.values():
        t = e.get("tags") or {}
        if not t: continue
        hw, am = t.get("highway"), t.get("amenity")
        want = hw in ("give_way", "stop", "crossing") or am in ("parking_entrance", "parking") or any(k.startswith("traffic_sign") for k in t)
        if not want: continue
        x, z = wgs_to_local(e["lon"], e["lat"])
        pts.append({"id": e["id"], "x": float(x), "z": float(z), "tags": t})
    pts.sort(key=lambda p: p["id"])
    sign_ways = []
    for w in sorted(ways.values(), key=lambda w: w["id"]):
        t = w.get("tags") or {}
        v = t.get("traffic_sign") or ""
        cs = ["C3"] if "C3" in v.upper() else [c for c in codes_of(v) if c == "D7"]
        if not cs: continue
        line = []
        for n in w.get("nodes", []):
            if n in nodes:
                x, z = wgs_to_local(nodes[n]["lon"], nodes[n]["lat"]); line.append((float(x), float(z)))
        if len(line) >= 2: sign_ways.append({"id": w["id"], "codes": cs, "line": line, "oneway": str(t.get("oneway")) == "yes"})
    return {"nodes": nodes, "ways": ways, "on_way": on_way, "points": pts, "sign_ways": sign_ways}


def way_dir_at(src, nid, fwd=True):
    """the travel direction (unit, local x / z) of an OSM car way through node nid, along (fwd) or against its order"""
    for w, i in src["on_way"].get(nid, []):
        ns = w["nodes"]
        a, b = ns[max(0, i - 1)], ns[min(len(ns) - 1, i + 1)]
        if a == b or a not in src["nodes"] or b not in src["nodes"]: continue
        ax, az = wgs_to_local(src["nodes"][a]["lon"], src["nodes"][a]["lat"])
        bx, bz = wgs_to_local(src["nodes"][b]["lon"], src["nodes"][b]["lat"])
        dx, dz = float(bx - ax), float(bz - az); L = math.hypot(dx, dz) or 1
        return (dx / L, dz / L) if fwd else (-dx / L, -dz / L)
    return None


def codes_of(v):
    """traffic_sign values -> our face codes (BE:B1;BE:C11 -> [B1]; C43 with its number)"""
    out = []
    for c in re.split(r"[;,]", v or ""):
        c = c.strip().upper().replace("BE:", "")
        m = re.match(r"C43\[?(\d+)\]?", c)
        if m and f"C43_{m.group(1)}" in FACE_INDEX: out.append(f"C43_{m.group(1)}"); continue
        c = {"D07": "D7"}.get(c, c)
        if c.startswith("C3"): c = "C3"
        if c in FACE_INDEX: out.append(c)
    return out


# ------------------------------------------------------------------------------------------------ per tile
class Roads:
    """the tile's road graph: car roads with their meta, node degree, lines oriented from a node"""
    def __init__(self, T: Tile, name):
        rd = json.loads((TILES / name / "roads.json").read_text(encoding="utf-8"))
        meta = {r["id"]: r for r in rd["roads"]}
        self.T = T
        self.roads = []
        self.at = defaultdict(list)
        for r in T.roads:
            m = (meta[r["id"]].get("meta") or {})
            if r["hw"] not in CAR: continue
            rr = dict(r, meta=m, speed=speed(m.get("maxspeed")), oneway=str(m.get("oneway") or "no"), osm=m.get("osm"), ls=LineString(r["line"]))
            if rr["ls"].length < 0.5: continue
            self.roads.append(rr)
            self.at[r["a"]].append(rr); self.at[r["b"]].append(rr)

    def deg(self, n): return len(self.at.get(n, []))

    def from_node(self, r, n):
        """r's line oriented away from node n"""
        return r["ls"] if r["a"] == n else LineString(list(reversed(r["line"])))

    def flow(self, r):
        """the one-way flow line (None: two-way)"""
        o = r["oneway"]
        if o in ("yes", "true", "1"): return r["ls"]
        if o == "-1": return LineString(list(reversed(r["line"])))
        return None

    def enters(self, r, n):
        """can traffic enter r from node n"""
        f = self.flow(r)
        return f is None or (r["a"] == n) == (f.coords[0] == tuple(r["line"][0]))

    def nearest(self, x, z, reach=10.0):
        p = Point(x, z); best = None
        for r in self.roads:
            d = r["ls"].distance(p)
            if d < reach and (best is None or d < best[0]): best = (d, r)
        return best


def tangent(ls, s):
    s = max(0.0, min(ls.length, s))
    a, b = ls.interpolate(max(0.0, s - 0.5)), ls.interpolate(min(ls.length, s + 0.5))
    dx, dz = b.x - a.x, b.y - a.y; L = math.hypot(dx, dz) or 1
    return dx / L, dz / L


class Placer:
    def __init__(self, T, S, R):
        self.T, self.S, self.R = T, S, R

    def on_carriageway(self, x, z):
        p = Point(x, z)
        for i in self.T.segtree.query(p.buffer(12)):
            ln, rr = self.T.segs[i]
            if rr["hw"] in CAR and ln.distance(p) < rr["half"] + 0.25: return True
        return False

    def spot(self, qx, qz, hx, hz, mode="kerb", slide=(0, -1, 1, -2, 2, -3, 3, -5, 5), why=None):
        """the pole for a sign at centreline point q addressing traffic heading h: on the right, behind the kerb"""
        rx, rz = -hz, hx
        for a in slide:
            x0, z0 = qx + hx * a, qz + hz * a
            if mode == "path":
                px, pz = x0 + rx * 1.3, z0 + rz * 1.3; measured = False
            else:
                k = self.S.kerb(x0, z0, -rx, -rz, s0=1.0, s1=14.0)
                if k is not None:
                    px, pz = x0 + rx * (k[0] + 0.4), z0 + rz * (k[0] + 0.4); measured = True
                else:
                    p0 = Point(x0, z0)
                    half = max([r["half"] for r in self.R.roads if r["ls"].distance(p0) < 0.6] or [3.0])
                    px, pz = x0 + rx * (half + 0.6), z0 + rz * (half + 0.6); measured = False
            if not self.T.inside(px, pz): continue
            w = []
            if not self.S.clear(Point(px, pz).buffer(0.05), w, tree=0.5, door=0.8, drive=1.2, thing=0.4):
                if why is not None: why[w[-1]] += 1
                continue
            if not (measured and self.S.walkable(px, pz)) and self.on_carriageway(px, pz):
                if why is not None: why["carriageway"] += 1
                continue
            return px, pz, measured
        return None


def place_tile(name, src, stats, villo_rank):
    T = Tile(name)
    S = Street(T, name)
    R = Roads(T, name)
    P = Placer(T, S, R)
    req = []                                        # (code, qx, qz, hx, hz, mode, why)

    def want(code, qx, qz, hx, hz, mode="kerb", src_="rule"):
        req.append((code, qx, qz, hx, hz, mode, src_))

    # ---- OSM points: give way / stop / traffic_sign / crossings / parking
    gw_nodes = []
    for p in src["points"]:
        x, z, t = p["x"], p["z"], p["tags"]
        if not T.inside(x, z): continue
        hw, am = t.get("highway"), t.get("amenity")
        codes = []
        if hw == "give_way": codes.append("B1")
        if hw == "stop": codes.append("B5")
        for k, v in t.items():
            if k == "traffic_sign" or k.startswith("traffic_sign:"):
                for c in codes_of(v):
                    if c not in codes: codes.append(c)
        if codes:
            nr = R.nearest(x, z, 10.0)
            if not nr: stats["sign_no_road"] += len(codes); continue
            d, r = nr
            s = r["ls"].project(Point(x, z)); q = r["ls"].interpolate(s)
            tx, tz = tangent(r["ls"], s)
            dirtag = t.get("direction") or ("forward" if any(k.endswith(":forward") for k in t) else "backward" if any(k.endswith(":backward") for k in t) else None)
            h = None
            if dirtag in ("forward", "backward"):
                h = way_dir_at(src, p["id"], dirtag == "forward")
                if h: h = (tx, tz) if h[0] * tx + h[1] * tz >= 0 else (-tx, -tz); stats["dir_from_osm"] += 1
            if h is None:
                # toward the nearer junction end of the road (degree >= 3), else the nearer end
                da, db = s, r["ls"].length - s
                ja, jb = R.deg(r["a"]) >= 3, R.deg(r["b"]) >= 3
                toward_b = (db <= da) if ja == jb else jb
                h = (tx, tz) if toward_b else (-tx, -tz); stats["dir_from_junction"] += 1
                node = r["b"] if toward_b else r["a"]
            else:
                node = r["b"] if (h[0] * tx + h[1] * tz) > 0 else r["a"]
            for c in codes: want(c, q.x, q.y, h[0], h[1], src_="osm")
            if "B1" in codes or "B5" in codes: gw_nodes.append((node, r))
            continue
        if hw == "crossing":
            cr = t.get("crossing"); mk = t.get("crossing:markings")
            if cr == "traffic_signals" or t.get("crossing:signals") == "yes": continue
            if not (cr in ("uncontrolled", "marked", "zebra") or mk == "zebra"): continue
            nr = R.nearest(x, z, 3.0)
            if not nr: continue
            r = nr[1]
            if not (r["hw"] in MAIN or (r["speed"] or 30) >= 50): continue
            s = r["ls"].project(Point(x, z)); q = r["ls"].interpolate(s); tx, tz = tangent(r["ls"], s)
            fl = R.flow(r)
            for sg in (1, -1):
                if fl is not None:
                    fx, fz = tangent(fl, fl.project(q))
                    if (fx * tx + fz * tz) * sg < 0: continue
                want("F49", q.x - tx * sg * 1.0, q.y - tz * sg * 1.0, tx * sg, tz * sg, src_="osm")
            continue
        if am in ("parking_entrance", "parking"):
            if t.get("access") in ("private", "no", "customers", "permissive_private"): continue
            nr = R.nearest(x, z, 30.0)
            if not nr: continue
            r = nr[1]
            s = r["ls"].project(Point(x, z)); q = r["ls"].interpolate(s); tx, tz = tangent(r["ls"], s)
            side = (x - q.x) * -tz + (z - q.y) * tx            # > 0: the node is on the right of +t
            h = (tx, tz) if side >= 0 else (-tx, -tz)
            fl = R.flow(r)
            if fl is not None:
                fx, fz = tangent(fl, fl.project(q))
                if fx * h[0] + fz * h[1] < 0: continue          # (one-way the other way: the sign would face nobody)
            want("E9a", q.x - h[0] * 2.0, q.y - h[1] * 2.0, h[0], h[1], src_="osm")

    # ---- one-way roads: F19 where the flow starts, C1 where it ends (at junctions)
    for r in R.roads:
        fl = R.flow(r)
        if fl is None or fl.length < 12: continue
        a = r["a"] if fl.coords[0] == tuple(r["line"][0]) else r["b"]
        b = r["b"] if a == r["a"] else r["a"]
        if R.deg(a) >= 3:
            q = fl.interpolate(4.0); tx, tz = tangent(fl, 4.0)
            want("F19", q.x, q.y, tx, tz)
        if R.deg(b) >= 3:
            q = fl.interpolate(fl.length - 4.0); tx, tz = tangent(fl, fl.length - 4.0)
            want("C1", q.x, q.y, -tx, -tz)

    # ---- speed transitions at junctions (and living streets)
    for n, rs in sorted(R.at.items()):
        if len(rs) < 2: continue
        for r in rs:
            sr = r["speed"]
            if not sr or not R.enters(r, n): continue
            others = [q for q in rs if q is not r and q["speed"]]
            if not others: continue
            ln = R.from_node(r, n)
            if ln.length < 20: continue
            code = None
            if sr in (50, 70) and any(q["speed"] < sr for q in others): code = f"C43_{sr}"
            elif sr == 30 and any(q["speed"] >= 50 for q in others):
                way = src["ways"].get(r["osm"]) or {}
                wt = way.get("tags") or {}
                if any(q["speed"] >= 50 and q["name"] and q["name"] == r["name"] for q in others): code = "C43_30"
                elif "zone30" in (wt.get("source:maxspeed", "") + wt.get("maxspeed:type", "")).lower(): code = "F4a"
            elif r["hw"] == "living_street" and any(q["hw"] != "living_street" for q in others): code = "F12a"
            elif sr == 20 and r["hw"] != "living_street" and any(q["speed"] > 20 for q in others): code = "C43_20"
            if not code: continue
            q = ln.interpolate(5.0); tx, tz = tangent(ln, 5.0)
            want(code, q.x, q.y, tx, tz)

    # ---- B15 on main roads before a junction where a side road gives way
    for n, rside in gw_nodes:
        for m in R.at.get(n, []):
            if m is rside or m["hw"] not in MAJOR: continue
            ln = R.from_node(m, n)
            if ln.length < 50 or not R.enters(m, n) and R.flow(m) is not None and False: continue
            fl = R.flow(m)
            q = ln.interpolate(35.0); tx, tz = tangent(ln, 35.0)
            h = (-tx, -tz)                                     # traffic on m heading toward the junction
            if fl is not None:
                fx, fz = tangent(fl, fl.project(q))
                if fx * h[0] + fz * h[1] < 0: continue
            want("B15", q.x, q.y, h[0], h[1])

    # ---- ways with traffic_sign tags (cycle tracks D7, C3 zones): at their ends, for the traffic entering
    # (cycle tracks are not in the tiles' road graph: their OSM ways' own geometry)
    for w in src["sign_ways"]:
        line = w["line"]
        if not any(T.x0 - 5 <= x < T.x1 + 5 and T.z0 - 5 <= z < T.z1 + 5 for x, z in line): continue
        ls = LineString(line)
        if ls.length < 8: continue
        for code in w["codes"]:
            mode = "path" if code == "D7" else "kerb"
            ends = [LineString(line)] + ([LineString(list(reversed(line)))] if not w["oneway"] else [])
            for l2 in ends:
                q = l2.interpolate(2.0); tx, tz = tangent(l2, 2.0)
                want(code, q.x, q.y, tx, tz, mode, src_="osm")

    # ---- place the poles; merge onto shared poles; drop repeats
    why = Counter()
    placed = []                                        # [code, px, pz, fx, fz, measured, src]
    for code, qx, qz, hx, hz, mode, s_ in req:
        if not (T.x0 - 2 <= qx < T.x1 + 2 and T.z0 - 2 <= qz < T.z1 + 2): continue      # (roads.json runs past the tile: its neighbour places it)
        sp = P.spot(qx, qz, hx, hz, mode, why=why)
        if not sp: stats[f"sign_unplaced_{code}"] += 1; continue
        px, pz, measured = sp
        fx, fz = -hx, -hz
        if any(c == code and math.hypot(px - x, pz - z) < 25 and fx * a + fz * b > 0.8 for c, x, z, a, b, *_ in placed):
            stats["sign_repeat_dropped"] += 1; continue
        if code.startswith("C43_5") or code.startswith("C43_7"):
            if any(c == code and math.hypot(px - x, pz - z) < 150 and fx * a + fz * b > 0.8 for c, x, z, a, b, *_ in placed):
                stats["sign_speed_repeat_dropped"] += 1; continue
        placed.append([code, px, pz, fx, fz, measured, s_])
    for k, v in why.items(): stats["slide_" + k] += v
    poles = []
    for code, px, pz, fx, fz, measured, s_ in sorted(placed, key=lambda p: PRECEDENCE.index(p[0])):
        host = None
        for pl in poles:
            if len(pl["codes"]) < 2 and math.hypot(pl["x"] - px, pl["z"] - pz) < 1.5 and pl["fx"] * fx + pl["fz"] * fz > 0.85: host = pl; break
        if host: host["codes"].append(code); stats["plates_shared"] += 1
        else: poles.append({"x": px, "z": pz, "fx": fx, "fz": fz, "codes": [code], "measured": measured, "src": s_})
    out_signs = []
    for pl in sorted(poles, key=lambda p: (round(p["x"], 2), round(p["z"], 2))):
        hs = [SHAPES[FACE_SHAPE[c]]["h"] for c in pl["codes"]]
        tall = len(hs) > 1 and sum(hs) + GAP > 1.05 or len(hs) > 1
        top = TOP2 if tall else TOP1
        y = T.floor_y(pl["x"], pl["z"]) - 0.02
        plates, e = [], top
        for c, h in zip(pl["codes"], hs):
            plates.append({"code": c, "face": FACE_INDEX[c], "shape": FACE_SHAPE[c], "h": r2(e - h / 2)})
            e -= h + GAP
            stats["face_" + c] += 1
        yaw = math.atan2(pl["fx"], pl["fz"])
        out_signs.append({"x": r2(pl["x"]), "y": r2(y), "z": r2(pl["z"]), "yaw": r4(yaw), "tall": tall, "plates": plates,
                          "kerb": pl["measured"], "src": pl["src"]})
        stats["poles"] += 1; stats["poles_tall" if tall else "poles_short"] += 1

    # ---- street-name plate posts (the street life's post-mounted plates)
    sl = json.loads((ROOT / "data" / "streetlife" / f"{name}.json").read_text(encoding="utf-8")) if (ROOT / "data" / "streetlife" / f"{name}.json").exists() else {}
    posts = []
    for p in sl.get("plates", []):
        if p.get("mount") == "wall": continue
        posts.append({"x": p["x"], "y": p["y"], "z": p["z"], "yaw": r4(math.atan2(p["nx"], p["nz"]))})
        stats["plate_posts"] += 1

    # ---- Villo stations
    villo = []
    for v in sl.get("villo", []):
        st = place_villo(T, S, R, v, villo_rank, stats)
        if st: villo.append(st)
    return {"contract": CONTRACT, "tile": name, "signs": out_signs, "posts": posts, "villo": villo}


def place_villo(T, S, R, v, rank, stats):
    """the station: a dock row along the kerb (stands = the WFS / OSM count), the totem at one end, bikes in ~half the
    docks (the live occupancy is not data we hold: a fixed hash per dock stands in for it, documented)"""
    x, z, nx, nz, tx, tz = v["x"], v["z"], v["nx"], v["nz"], v["tx"], v["tz"]
    n = int(v.get("stands") or 0)
    if n <= 0: stats["villo_no_stands"] += 1; n = 10
    n = min(n, 40)

    def kerb_at(bx, bz):
        """signed distance from b to the kerb along -n (away from the road): > 0 the kerb is further from the road"""
        if S.walkable(bx, bz):
            s = 0.0
            while s > -8 and S.walkable(bx - nx * (s - 0.1), bz - nz * (s - 0.1)): s -= 0.1
            return s
        k = S.kerb(bx, bz, nx, nz, s0=0.0, s1=8.0)
        return k[0] if k else None

    k0 = kerb_at(x, z)
    depth = None
    if k0 is not None:
        e = k0 + 0.05
        while e < k0 + 12 and S.walkable(x - nx * e, z - nz * e): e += 0.1
        depth = e - k0
    nr = R.nearest(x - nx * (k0 or 0), z - nz * (k0 or 0), 25.0)
    c = nr[0] if nr else 6.0                                  # kerb -> centreline
    if depth is not None and depth >= 3.6: mode, off = "sidewalk", 1.95       # docks 1.95 m behind the kerb, bikes toward the road
    else: mode, off = "lane", -0.3                            # docks 0.3 m out in the parking lane at the kerb, bikes into it
    stats["villo_" + mode] += 1
    yaw_n = math.atan2(nx, nz)
    best = None
    for shift in (0.0, 3.0, -3.0, 6.0, -6.0):
        docks = []
        for i in range(n):
            u = shift + (i - (n - 1) / 2) * 0.85
            bx, bz = x + tx * u, z + tz * u
            k = kerb_at(bx, bz)
            if k is None: k = k0 if k0 is not None else 0.0
            dx, dz = bx - nx * (k + off), bz - nz * (k + off)
            ok = T.inside(dx, dz) or True
            poly = S.footprint(dx + nx * 0.95, dz + nz * 0.95, yaw_n, (-0.3, 0.3), (-1.0, 1.0))      # the dock + its bike
            w = []
            if not S.clear(poly, w, tree=0.3, door=0.6, drive=1.0, thing=0.3, cross=1.5): continue
            docks.append((i, u, dx, dz))
        if best is None or len(docks) > len(best[1]): best = (shift, docks)
        if len(docks) == n: break
    shift, docks = best
    if not docks: stats["villo_unplaced"] += 1; return None
    stats["villo_docks"] += len(docks); stats["villo_docks_wanted"] += n
    out = {"id": v["id"], "name": v.get("name"), "nameNl": v.get("nameNl"), "mode": mode, "stands": v.get("stands"), "docks": [], "bikes": []}
    for i, u, dx, dz in docks:
        out["docks"].append({"x": r2(dx), "y": r2(T.floor_y(dx, dz) - 0.01), "z": r2(dz), "yaw": r4(yaw_n)})
        if h01(f"{v['id']}:{i}") < 0.55:
            bx, bz = dx + nx * 0.42, dz + nz * 0.42
            rx, rz = bx + nx * 1.08, bz + nz * 1.08
            y = max(T.floor_y(bx, bz), T.floor_y(rx, rz)) - 0.01
            out["bikes"].append({"x": r2(bx), "y": r2(y), "z": r2(bz), "yaw": r4(yaw_n)})
    # the totem: in line with the docks, 1.0 m past the clearer end
    ends = sorted(docks, key=lambda d: d[1])
    for (i, u, dx, dz), sgn in ((ends[-1], 1), (ends[0], -1)):
        px, pz = dx + tx * sgn * 1.0, dz + tz * sgn * 1.0
        w = []
        if S.clear(S.footprint(px, pz, yaw_n, (-0.26, 0.26), (-0.16, 0.16)), w, tree=0.3, door=0.6, drive=1.0, thing=0.3):
            break
    num = int(re.sub(r"\D", "", str(v["id"])) or 0) if str(v["id"]).startswith("villo:") else None
    out["totem"] = {"x": r2(px), "y": r2(T.floor_y(px, pz) - 0.01), "z": r2(pz), "yaw": r4(math.atan2(-nx, -nz)), "strip": rank.get(v["id"], -1), "num": num}
    # the parking-lane space the station takes (cars keep clear): the row's rectangle, x along the row
    us = [d[1] for d in docks]
    cx, cz = x + tx * (min(us) + max(us)) / 2, z + tz * (min(us) + max(us)) / 2
    k = kerb_at(cx, cz) or 0.0
    out["area"] = {"x": r2(cx - nx * (k + off - 0.95)), "z": r2(cz - nz * (k + off - 0.95)), "yaw": r4(math.atan2(tx, tz)), "hx": r2((max(us) - min(us)) / 2 + 1.6), "hz": 1.2}
    out["notes"] = {"sidewalk": r2(depth) if depth is not None else None, "kerbToCentre": r2(c)}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", type=Path, required=True)
    a = ap.parse_args()
    t0 = time.time()
    src = osm_sources(a.raw)
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tiles]
    # the Villo stations of ALL tiles, ranked by number (the strips of the face atlas)
    stations = {}
    for t in all_tiles():
        f = ROOT / "data" / "streetlife" / f"{t}.json"
        if not f.exists(): continue
        for v in json.loads(f.read_text(encoding="utf-8")).get("villo", []): stations[v["id"]] = v
    order = sorted(stations.values(), key=lambda v: (int(re.sub(r"\D", "", v["id"]) or 0) if v["id"].startswith("villo:") else 10 ** 6, v["id"]))
    rank = {v["id"]: i for i, v in enumerate(order[:64])}
    faceAtlas.build(str(ATLAS), [(re.sub(r"\D", "", v["id"]) if v["id"].startswith("villo:") else "", v.get("name") or "", v.get("nameNl")) for v in order[:64]])
    stats = Counter()
    docs = {}
    for t in tiles:
        if not (TILES / t / "buildings.json").exists(): continue
        docs[t] = place_tile(t, src, stats, rank)
    OUT.mkdir(parents=True, exist_ok=True)
    per = {}
    for t, d in docs.items():
        d["counts"] = {"poles": len(d["signs"]), "plates": sum(len(s["plates"]) for s in d["signs"]), "posts": len(d["posts"]),
                       "villo": len(d["villo"]), "docks": sum(len(v["docks"]) for v in d["villo"]), "bikes": sum(len(v["bikes"]) for v in d["villo"])}
        d["sources"] = {"signs": "OpenStreetMap (c) OpenStreetMap contributors, ODbL (nodes + way tags) + the rules of tools/streetkit/build_streetkit.py",
                        "plates": "data/streetlife (OSM street names, UrbIS communes)", "villo": "Brussels Mobility WFS bm_bike:villo via data/streetlife",
                        "street": "UrbIS (CC0) via data/tiles"}
        per[t] = d["counts"]
        (OUT / f"{t}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
    summary = {"contract": CONTRACT, "tiles": len(docs), "stations": len(order), "stats": dict(sorted(stats.items())), "perTile": per}
    (OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf-8")
    print(json.dumps(summary["stats"], indent=1), f"\n{time.time() - t0:.0f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
