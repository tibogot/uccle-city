"""FRONT GARDENS, placed per tile: data/gardens/<T>.json (+ summary.json). Deterministic.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/gardens/build_gardens.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw
    ... --tile I6 --debug <dir>          (one tile, with a plan view PNG of the strips, runs, openings and pieces)

Inputs (docs/assets/GARDENS.md)
  faces       the city's own street faces and front doors (tools/gardens/faces.mjs = viewer/facadeGeom.js analyseBuildings
              + viewer/interior/facadeWindows.js faceOpenings: the widest street face carries the door, in its door bay)
  street      data/tiles/<T>/surfaces.json (UrbIS street surfaces: roadway, sidewalk, square, ramp...), buildings.json,
              the DTM (terrain.u16), roads.json; the neighbour tiles' surfaces and buildings within 40 m (rays cross edges)
  driveways   UrbIS Topo CR42L (the driveway line drawn ON the property line, <raw>/urbis/topo_poles/<T>.street_furniture_line
              .geojson), the UrbIS ramp surfaces (dropped kerbs) behind which a strip ends, OSM service roads
  OSM         <worktree>/data/raw/osm/barriers.json (barrier=wall / fence / hedge / gate ways, Overpass), forecourts.json
              (amenity=parking, landuse=retail / commercial / industrial, shop areas), the tiles' OSM shop points
Rules
  strip       every street face (not a party wall, not a landmark, >= 2 m wide) casts rays every 0.5 m along its normal:
              the first UrbIS street surface it meets (before any other building) is the PROPERTY LINE; the gap is the
              front garden's depth. A face is a garden front when >= 50 % of its rays hit at 1.0 - 35 m (median >= 1.0 m):
              no garden for houses built on the sidewalk line, for shops (a street-life shopfront on the face, an OSM shop
              point in or just in front of the building), or where the strip crosses an OSM parking / commercial area.
  plot        the run follows the hit points (the measured sidewalk's back edge, smoothed by Douglas-Peucker 6 cm); for
              detached houses it extends up to 4 m beyond the face's ends while the rays keep hitting at a similar depth
              and no other house's front claims the spot (the nearer face wins). Runs that end within 2 m of each other
              at an angle are mitred to a shared corner.
  openings    the front door (projected along the face normal onto the run): a pedestrian gate 1.0 m between two pillars,
              drawn OPEN (swung into the garden 70 - 100 deg) so the walker gets through; driveways (CR42L / ramp hits /
              OSM service roads crossing the run): a car opening (pillars both sides, a closed double gate on ~55 %)
  style       per house (hash of BU_ID) but plausible per street: each street name has a dominant style that ~60 % of its
              houses take; terraced fronts (shallow gaps, party walls) and villas (deep gaps, detached) draw from different
              mixes. An OSM barrier within 1.2 m of >= 40 % of the run wins (wall / railing fence / hedge).
  height      the base follows the lower of the sidewalk (DTM + measured kerb lift) and the garden ground (DTM) at each
              vertex (sampled every <= 1.5 m, so the line never floats more than 3 cm over the ground); pieces run 0.35 m
              below it (JOINS). Where the garden is higher than the sidewalk, the wall grows to retain it (top >= garden
              + 0.25 m): no buried railing.
Frame: segments go from (x0, y0, z0) to (x1, y1, z1); local +z (the street side) = the right-hand normal (dz, -dx) /
len of that direction when the garden is on the left.
"""
from __future__ import annotations

import argparse, json, math, subprocess, sys, time
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw
from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.ops import unary_union

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "tools" / "streetlife"))
from common import TILES, all_tiles, tile_bounds, wgs_to_local, l72_to_local, tile_of_point  # noqa: E402
from build_streetlife import Tile  # noqa: E402

CONTRACT = "gardens-0.1"
OUT = ROOT / "data" / "gardens"
RES, MARGIN, REACH = 0.2, 40.0, 35.0
STREET_CLASSES = {0, 1, 2, 3, 4, 5, 6, 8}            # every UrbIS street surface but paths (7: park paths)
RAMP = 8
MIN_GAP, MIN_FACE = 1.0, 2.0
EXT = 12.0                                          # how far a run may extend past its face's ends (detached houses)
CAP_T = 0.08                                        # cap thickness (the kit's caps: 8 cm slab)
BURY = 0.35


def r2(v): return round(float(v), 2)


def r3(v): return round(float(v), 3)


def h01(s, salt=""):
    h = 2166136261
    for ch in (str(s) + "|" + salt).encode():
        h ^= ch; h = (h * 16777619) & 0xffffffff
    return h / 4294967296


# ------------------------------------------------------------------------------------------------ styles
# kinds: rail = low wall + railing (+ pillars), wall = brick wall with a cap, hedge = a clipped hedge on the line (the
# foliage system's hedges, viewer/foliage/hedges.js) with pillars at the openings, open = nothing
# brick: 0 red-brown, 1 dark purple-brown (Brussels "klinker"), 2 orange-red, 3 sand / yellow, 4 white render
# cap: 0 blue-stone slab, 1 white concrete slab, 2 concrete saddle; rail: 0 spear (wrought iron), 1 flat bars (modern),
# 2 rings band (Art Deco); paint: 0 black, 1 anthracite, 2 dark green
# round 2, after the look check (docs/assets/GARDENS.md "Look check"): Uccle's villa streets are HEDGE streets (Alphonse
# XIII, Lancaster, Dupuich, Brunard, Brugmann: clipped privet / yew / beech / laurel on the line, often on a low brick
# wall), the terraces low walls + railings with shrubs behind; tall brick walls are rarer (Henri Pirenne)
TERRACE_MIX = [("rail", 0.34), ("railhedge", 0.20), ("wall", 0.16), ("wallhedge", 0.10), ("hedge", 0.10), ("modern", 0.05), ("open", 0.05)]
VILLA_MIX = [("rail", 0.08), ("railhedge", 0.20), ("wall", 0.08), ("wallhedge", 0.14), ("hedge", 0.38), ("modern", 0.06), ("open", 0.06)]
HEDGE_SPECIES = [("privet", 0.34), ("beech", 0.26), ("laurel", 0.16), ("hornbeam", 0.12), ("box", 0.12)]


def pick(mix, u):
    for k, w in mix:
        if u < w: return k
        u -= w
    return mix[-1][0]


def make_style(kind, seed, villa):
    """a full style record from a kind and a seed (all choices hashed)"""
    u = lambda salt: h01(seed, salt)
    brick = pick([(0, 0.34), (1, 0.26), (2, 0.16), (3, 0.12), (4, 0.12)], u("brick"))
    s = {"kind": kind, "brick": brick, "cap": pick([(0, 0.6), (1, 0.25), (2, 0.15)], u("cap")), "rail": -1, "paint": 0,
         "wallH": 0.0, "railH": 0.0, "pillar": 1, "hedge": None, "hedgeH": 0.0}
    if kind in ("rail", "railhedge"):
        s["wallH"] = 0.32 + 0.28 * u("wh")
        s["rail"] = pick([(0, 0.62), (2, 0.2), (1, 0.18)], u("rail"))
        s["railH"] = 0.75 + 0.3 * u("rh")
        s["paint"] = pick([(0, 0.62), (1, 0.22), (2, 0.16)], u("paint"))
        if s["rail"] == 0 and s["paint"] != 1 and u("gild") < 0.3: s["gilded"] = 1      # gilded lance tips
    elif kind == "modern":
        s["kind"] = "rail"; s["brick"] = pick([(4, 0.4), (1, 0.3), (3, 0.3)], u("mb"))
        s["wallH"] = 0.3 + 0.3 * u("wh"); s["rail"] = 1; s["railH"] = 0.8 + 0.25 * u("rh"); s["paint"] = 1; s["cap"] = 1 if s["brick"] == 4 else pick([(0, 0.5), (1, 0.5)], u("mc"))
    elif kind == "wall":
        s["wallH"] = (0.45 + 0.5 * u("wh")) if not villa else (0.7 + 1.1 * u("wh"))
    elif kind == "wallhedge":                         # a low brick wall with a clipped hedge behind it
        s["wallH"] = 0.3 + 0.3 * u("wh")
    if kind in ("railhedge", "hedge", "wallhedge"):
        sp = pick(HEDGE_SPECIES, u("sp"))
        if kind == "railhedge" and sp == "box": sp = "privet"
        s["hedge"] = sp
        s["hedgeH"] = (0.5 + 0.25 * u("hh")) if sp == "box" else (1.1 + 0.6 * u("hh")) if kind in ("railhedge", "wallhedge") else (1.0 + 0.8 * u("hh"))
        if kind == "railhedge": s["kind"] = "rail"
        if kind == "wallhedge": s["kind"] = "wall"
    if kind == "hedge":
        s["wallH"] = 0.0
    if s["brick"] == 4: s["pillar"] = 2
    return s


def osm_style(tags, seed, villa):
    b = tags.get("barrier")
    if b in ("wall", "retaining_wall"):
        s = make_style("wall", seed, villa)
        try: s["wallH"] = max(0.3, min(2.2, float(tags.get("height", "").replace("m", "")) - CAP_T))
        except ValueError: pass
        if tags.get("material") in ("concrete",) or tags.get("wall") == "concrete": s["brick"] = 4
        return s
    if b == "fence":
        ft = tags.get("fence_type") or tags.get("material") or ""
        if ft in ("wood", "chain_link", "wire", "paling", "split_rail", "pole"):
            return make_style("hedge", seed, villa)              # (no wooden / wire fence pieces: a hedge hides them)
        s = make_style("rail", seed, villa)
        if ft in ("bars", "metal", "railing"): s["rail"] = 0 if h01(seed, "fr") < 0.7 else 1
        try:
            hh = float(tags.get("height", "").replace("m", ""))
            if hh < 1.0: s["wallH"] = 0.0; s["railH"] = max(0.6, hh)       # a railing straight on the ground
        except ValueError: pass
        return s
    if b == "hedge":
        return make_style("hedge", seed, villa)
    return None


# ------------------------------------------------------------------------------------------------ the street raster
class Raster:
    """street surfaces (class + 1) and building ids at RES over the tile + MARGIN, from this tile and its neighbours"""

    def __init__(self, name):
        x0, z0, x1, z1 = tile_bounds(name)
        self.X0, self.Z0 = x0 - MARGIN, z0 - MARGIN
        self.N = int(round((x1 - x0 + 2 * MARGIN) / RES))
        st = Image.new("L", (self.N, self.N), 0)
        bd = Image.new("I", (self.N, self.N), 0)
        ds, db = ImageDraw.Draw(st), ImageDraw.Draw(bd)
        self.polys, self.pcls = [], []
        self.bpolys, self.bkey = [], []
        px = lambda ring: [((x - self.X0) / RES, (z - self.Z0) / RES) for x, z in ring]
        box = Polygon([(self.X0, self.Z0), (self.X0 + self.N * RES, self.Z0), (self.X0 + self.N * RES, self.Z0 + self.N * RES), (self.X0, self.Z0 + self.N * RES)])
        i0 = ord(name[0])
        j0 = int(name[1:])
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                nb = f"{chr(i0 + di)}{j0 + dj}"
                d = TILES / nb
                if not (d / "surfaces.json").exists(): continue
                for s in drawn_surfaces(nb):
                    if s["c"] not in STREET_CLASSES or not s["rings"] or len(s["rings"][0]) < 3: continue
                    p = Polygon(s["rings"][0]).buffer(0)
                    if p.is_empty or not p.intersects(box): continue
                    ds.polygon(px(s["rings"][0]), fill=s["c"] + 1)
                    self.polys.append(p); self.pcls.append(s["c"])
                bj = json.loads((d / "buildings.json").read_text(encoding="utf-8"))
                for k, b in enumerate(bj["buildings"]):
                    ring = b["footprint"][0]
                    if len(ring) < 3: continue
                    p = Polygon(ring)
                    if not p.is_valid: p = p.buffer(0)
                    if p.is_empty or not p.intersects(box): continue
                    gid = len(self.bkey) + 1
                    self.bkey.append((nb, k)); self.bpolys.append(p)
                    db.polygon(px(ring), fill=gid)
        self.st = np.asarray(st, dtype=np.uint8)
        self.bd = np.asarray(bd, dtype=np.int32)
        self.ptree = STRtree(self.polys)
        self.btree = STRtree(self.bpolys)
        self.gid = {k: i + 1 for i, k in enumerate(self.bkey)}

    def cells(self, x, z):
        i = np.floor((x - self.X0) / RES).astype(np.int64); j = np.floor((z - self.Z0) / RES).astype(np.int64)
        ok = (i >= 0) & (j >= 0) & (i < self.N) & (j < self.N)
        i = np.clip(i, 0, self.N - 1); j = np.clip(j, 0, self.N - 1)
        return i, j, ok

    def march(self, ox, oz, nx, nz, own, step=0.1, reach=REACH):
        """rays (arrays): (dist to the first street cell or nan, its class, blocked by another building first)"""
        d = np.arange(0.0, reach, step)
        X = ox[:, None] + nx[:, None] * d[None, :]; Z = oz[:, None] + nz[:, None] * d[None, :]
        i, j, ok = self.cells(X, Z)
        s = np.where(ok, self.st[j, i], 0).astype(np.int32); b = np.where(ok, self.bd[j, i], 0)
        sh = s > 0
        bh = (b > 0) & (b != own[:, None])
        fs = np.where(sh.any(1), sh.argmax(1), 10 ** 6); fb = np.where(bh.any(1), bh.argmax(1), 10 ** 6)
        hit = fs < fb
        dist = np.where(hit, d[np.minimum(fs, len(d) - 1)], np.nan)
        cls = np.where(hit, s[np.arange(len(ox)), np.minimum(fs, len(d) - 1)] - 1, -1)
        return dist, cls, (fb < fs) & (fb < 10 ** 6)

    def refine(self, ox, oz, nx, nz, d):
        """the exact entry into the street surfaces near the coarse hit d (shapely); d when nothing better"""
        a = (ox + nx * max(0.0, d - 0.45), oz + nz * max(0.0, d - 0.45)); b = (ox + nx * (d + 0.25), oz + nz * (d + 0.25))
        seg = LineString([a, b]); o = Point(ox, oz)
        best = None
        for k in self.ptree.query(seg):
            g = seg.intersection(self.polys[k])
            if g.is_empty: continue
            dd = o.distance(g)
            if best is None or dd < best: best = dd
        return d if best is None else best

    def in_building(self, x, z, own=None):
        i, j, ok = self.cells(np.array([x]), np.array([z]))
        g = int(self.bd[j[0], i[0]]) if ok[0] else 0
        return g > 0 and g != own


# ------------------------------------------------------------------------------------------------ inputs
_DRAWN = {}


def drawn_surfaces(name):
    """a tile's street surfaces AS THE CITY DRAWS THEM (tools/gardens/drawnSurfaces.mjs: surfaces.json after
    viewer/surfaces.js taperSteps / smoothCurves / rampKerbPoints): the runs stand on the drawn paving's back edge,
    not on the raw UrbIS edge a splined edge may lie up to ~1 m in front of (the round-1 lawn strip)"""
    if name not in _DRAWN:
        if len(_DRAWN) > 24: _DRAWN.clear()
        r = subprocess.run(["node", str(HERE / "drawnSurfaces.mjs"), name], capture_output=True, text=True, cwd=str(ROOT))
        if r.returncode: raise RuntimeError(r.stderr[-2000:])
        _DRAWN[name] = json.loads(r.stdout).get(name, [])
    return _DRAWN[name]


def node_faces(name):
    r = subprocess.run(["node", str(HERE / "faces.mjs"), name], capture_output=True, text=True, cwd=str(ROOT))
    if r.returncode: raise RuntimeError(r.stderr[-2000:])
    return json.loads(r.stdout)["faces"]


def load_osm(worktree_raw: Path):
    bars, gates, fore = [], [], []
    f = worktree_raw / "osm" / "barriers.json"
    if f.exists():
        for e in json.loads(f.read_text(encoding="utf-8"))["elements"]:
            t = e.get("tags") or {}
            if e["type"] == "way" and t.get("barrier") in ("wall", "retaining_wall", "fence", "hedge"):
                pts = [tuple(map(float, wgs_to_local(g["lon"], g["lat"]))) for g in e["geometry"]]
                if len(pts) >= 2: bars.append((LineString(pts), t, e["id"]))
            elif e["type"] == "node" and "gate" in (t.get("barrier") or ""):
                gates.append((tuple(map(float, wgs_to_local(e["lon"], e["lat"]))), t))
    else:
        print("no", f, "(OSM barriers not used)", file=sys.stderr)
    f = worktree_raw / "osm" / "forecourts.json"
    if f.exists():
        for e in json.loads(f.read_text(encoding="utf-8"))["elements"]:
            g = e.get("geometry") or []
            if e["type"] != "way" or len(g) < 4: continue
            p = Polygon([tuple(map(float, wgs_to_local(q["lon"], q["lat"]))) for q in g]).buffer(0)
            if not p.is_empty: fore.append((p, e.get("tags") or {}))
    return bars, gates, fore


def driveway_lines(raw: Path, name):
    f = raw / "urbis" / "topo_poles" / f"{name}.street_furniture_line.geojson"
    out = []
    if not f.exists(): return out, False
    for ft in json.loads(f.read_text(encoding="utf-8"))["features"]:
        if ft["properties"].get("topo_type") != "CR42L": continue
        g = shape(ft["geometry"])
        for ln in (g.geoms if hasattr(g, "geoms") else [g]):
            out.append(LineString([l72_to_local(x, y)[:2] for x, y, *_ in ln.coords]))
    return out, True


# ------------------------------------------------------------------------------------------------ geometry helpers
def dp(pts, eps):
    """Douglas-Peucker on [(x, z, ...)] keeping the extra fields of kept points"""
    if len(pts) < 3: return pts
    a, b = np.array(pts[0][:2]), np.array(pts[-1][:2])
    ab = b - a; L = np.hypot(*ab) or 1e-9
    best, k = -1, 0
    for i in range(1, len(pts) - 1):
        p = np.array(pts[i][:2]); d = abs(ab[0] * (p[1] - a[1]) - ab[1] * (p[0] - a[0])) / L
        if d > best: best, k = d, i
    if best <= eps: return [pts[0], pts[-1]]
    return dp(pts[:k + 1], eps)[:-1] + dp(pts[k:], eps)


def resample(line, step):
    """[(x, z)] -> points every <= step, every original vertex kept"""
    out = [line[0]]
    for k in range(1, len(line)):
        (ax, az), (bx, bz) = line[k - 1], line[k]
        L = math.hypot(bx - ax, bz - az); n = max(1, math.ceil(L / step - 1e-6))
        for i in range(1, n + 1): out.append((ax + (bx - ax) * i / n, az + (bz - az) * i / n))
    return out


def arclen(line):
    s = [0.0]
    for k in range(1, len(line)): s.append(s[-1] + math.hypot(line[k][0] - line[k - 1][0], line[k][1] - line[k - 1][1]))
    return s


def cut(line, s0, s1):
    """the sub-polyline between arc lengths s0 < s1"""
    S = arclen(line); out = []
    def at(s):
        for k in range(1, len(line)):
            if s <= S[k] + 1e-9:
                t = (s - S[k - 1]) / ((S[k] - S[k - 1]) or 1e-9)
                return (line[k - 1][0] + (line[k][0] - line[k - 1][0]) * t, line[k - 1][1] + (line[k][1] - line[k - 1][1]) * t)
        return line[-1]
    out.append(at(s0))
    for k in range(len(line)):
        if s0 + 1e-6 < S[k] < s1 - 1e-6: out.append(line[k])
    out.append(at(s1))
    return out


def point_at(line, s):
    return cut(line, s, s + 1e-4)[0] if s < arclen(line)[-1] else line[-1]


# ------------------------------------------------------------------------------------------------ one tile
def place_tile(name, raw, wraw, osm, stats, debug=None):
    t0 = time.time()
    T = Tile(name)
    R = Raster(name)
    faces = node_faces(name)
    bars, osm_gates, fore = osm
    x0, z0, x1, z1 = tile_bounds(name)
    tb = Polygon([(x0 - 50, z0 - 50), (x1 + 50, z0 - 50), (x1 + 50, z1 + 50), (x0 - 50, z1 + 50)])
    bars = [b for b in bars if b[0].intersects(tb)]
    bar_tree = STRtree([b[0] for b in bars]) if bars else None
    fore = [f for f in fore if f[0].intersects(tb)]
    fore_tree = STRtree([f[0] for f in fore]) if fore else None
    drives, topo_ok = driveway_lines(raw, name)
    drive_tree = STRtree(drives) if drives else None
    service = [LineString(r["line"]) for r in T.roads if r["hw"] == "service" and len(r["line"]) > 1]
    feats = json.loads((TILES / name / "features.json").read_text(encoding="utf-8"))
    shops = [Point(p["x"], p["z"]) for p in feats.get("points", []) if p["kind"] == "shop"]
    # street names: the nearest named road (for the per-street dominant style)
    bdoc = json.loads((TILES / name / "buildings.json").read_text(encoding="utf-8"))["buildings"]
    own_bu = {}
    for k, b in enumerate(bdoc):
        own_bu[k] = (b.get("attrs") or {}).get("BU_ID") or b["id"]

    # ---- 1. rays from every candidate face
    samples = []          # dicts: face index, u, hit (x, z), gap, cls, core
    cand = []
    for fi, f in enumerate(faces):
        if not f["street"] or f["partyH"] >= 999 or f["landmark"] or f["width"] < MIN_FACE: continue
        if f["shopW"] and f["shopW"] > 0.5: stats["skip_shopfront"] += 1; continue
        cand.append(fi)
    shop_bi = set()
    for p in shops:
        for k in R.btree.query(p.buffer(6.0)):
            if R.bpolys[k].distance(p) < 6.0 and R.bkey[k][0] == name: shop_bi.add(R.bkey[k][1])
    for fi in cand:
        f = faces[fi]
        if f["bi"] in shop_bi: stats["skip_shop"] += 1; continue
        ax, az = f["a"]; bx, bz = f["b"]; W = f["width"]; tx, tz = (bx - ax) / W, (bz - az) / W; nx, nz = f["nx"], f["nz"]
        own = R.gid.get((name, f["bi"]), -1)
        us = list(np.arange(0.25, W - 0.24, 0.5)) or [W / 2]
        ext = [-k for k in np.arange(0.5, EXT + 0.01, 0.5)] + [W + k for k in np.arange(0.5, EXT + 0.01, 0.5)]
        U = np.array(us + ext)
        ox = ax + tx * U + nx * 0.15; oz = az + tz * U + nz * 0.15
        dist, cls, blocked = R.march(ox, oz, np.full(len(U), nx), np.full(len(U), nz), np.full(len(U), own))
        for k, u in enumerate(U):
            core = k < len(us)
            if not core and R.in_building(ox[k], oz[k], own): continue
            if np.isnan(dist[k]): samples.append(dict(fi=fi, u=float(u), core=core, gap=None, why="blocked" if blocked[k] else "none")); continue
            samples.append(dict(fi=fi, u=float(u), core=core, ext=0.0 if core else float(max(-u, u - W)), gap=float(dist[k]) + 0.15, cls=int(cls[k]), ox=float(ox[k]), oz=float(oz[k]), d=float(dist[k])))

    by_face = defaultdict(list)
    for s in samples: by_face[s["fi"]].append(s)
    gardens = {}
    for fi, ss in by_face.items():
        core = [s for s in ss if s["core"]]
        hits = [s for s in core if s["gap"] is not None]
        if not core: continue
        gaps = sorted(s["gap"] for s in hits)
        med = gaps[len(gaps) // 2] if gaps else 0
        if len(hits) < 0.5 * len(core): stats["face_nohit"] += 1; continue
        if med < MIN_GAP: stats["face_on_line"] += 1; continue
        gardens[fi] = med
    # refine the accepted hits; drop samples outside a garden face, gaps far from the face's median, forecourts
    keep = []
    for s in samples:
        fi = s["fi"]
        if fi not in gardens or s["gap"] is None: continue
        f = faces[fi]; med = gardens[fi]
        if s["gap"] < MIN_GAP * 0.8 or abs(s["gap"] - med) > max(1.5, med * 0.35): continue
        d = R.refine(s["ox"], s["oz"], f["nx"], f["nz"], s["d"])
        s["x"] = s["ox"] + f["nx"] * d; s["z"] = s["oz"] + f["nz"] * d; s["gap"] = d + 0.15
        if fore_tree is not None:
            ray = LineString([(s["ox"], s["oz"]), (s["x"], s["z"])])
            if any(fore[k][0].intersection(ray).length > 0.5 for k in fore_tree.query(ray)):
                stats["forecourt_samples"] += 1; continue
        keep.append(s)
    # conflicts: a spot claimed by two faces goes to the face it lies in front of, else the one whose end is nearer (plots split
    # half way between detached houses), then the shallower gap
    grid = defaultdict(list)
    for i, s in enumerate(keep): grid[(int(s["x"] // 1), int(s["z"] // 1))].append(i)
    drop = set()
    for i, s in enumerate(keep):
        cx, cz = int(s["x"] // 1), int(s["z"] // 1)
        for di in (-1, 0, 1):
            for dj in (-1, 0, 1):
                for j in grid.get((cx + di, cz + dj), []):
                    o = keep[j]
                    if o["fi"] == s["fi"] or math.hypot(o["x"] - s["x"], o["z"] - s["z"]) > 0.75: continue
                    if (o["ext"], o["gap"], o["fi"]) < (s["ext"], s["gap"], s["fi"]): drop.add(i)
    keep = [s for i, s in enumerate(keep) if i not in drop]

    # ---- 2. runs per face (consecutive samples), simplified
    runs = []
    per = defaultdict(list)
    for s in keep: per[s["fi"]].append(s)
    for fi, ss in per.items():
        ss.sort(key=lambda s: s["u"])
        cur = [ss[0]]
        def flush(c):
            if len(c) < 2: return
            if not any(q["core"] for q in c): return
            pts = [(q["x"], q["z"]) for q in c]
            L = arclen(pts)[-1]
            if L < 1.5: return
            runs.append({"fi": fi, "pts": [(p[0], p[1]) for p in dp(pts, 0.06)], "samples": c})
        for s in ss[1:]:
            p = cur[-1]
            if s["u"] - p["u"] > 0.75 or math.hypot(s["x"] - p["x"], s["z"] - p["z"]) > 1.3 or abs(s["gap"] - p["gap"]) > 1.2:
                flush(cur); cur = [s]
            else: cur.append(s)
        flush(cur)
    # runs start / end half a sample beyond their first / last sample (the samples are 0.5 m apart)
    for r in runs:
        p = r["pts"]
        for end in (0, -1):
            a, b = (p[0], p[1]) if end == 0 else (p[-1], p[-2])
            L = math.hypot(a[0] - b[0], a[1] - b[1]) or 1
            q = (a[0] + (a[0] - b[0]) / L * 0.25, a[1] + (a[1] - b[1]) / L * 0.25)
            if end == 0: p[0] = q
            else: p[-1] = q
    # mitre: runs ending within 2 m of another run's end at an angle get the corner point
    def end_dir(r, end):
        p = r["pts"]; a, b = (p[0], p[1]) if end == 0 else (p[-1], p[-2]); L = math.hypot(a[0] - b[0], a[1] - b[1]) or 1
        return a, ((a[0] - b[0]) / L, (a[1] - b[1]) / L)
    joined = set()
    for i, ra in enumerate(runs):
        for ea in (0, -1):
            if (i, ea) in joined: continue
            (pa, da) = end_dir(ra, ea)
            best = None
            for j, rb in enumerate(runs):
                if j == i: continue
                for eb in (0, -1):
                    if (j, eb) in joined: continue
                    (pb, db) = end_dir(rb, eb)
                    gapd = math.hypot(pa[0] - pb[0], pa[1] - pb[1])
                    if gapd > 3.0: continue
                    cosang = da[0] * -db[0] + da[1] * -db[1]
                    if cosang > 0.94:                       # nearly straight: the two runs simply meet (end to end)
                        if gapd < 1.2: best = best or (gapd, j, eb, None)
                        continue
                    # intersection of the two end rays
                    den = da[0] * db[1] - da[1] * db[0]
                    if abs(den) < 1e-6: continue
                    t = ((pb[0] - pa[0]) * db[1] - (pb[1] - pa[1]) * db[0]) / den
                    u = ((pb[0] - pa[0]) * da[1] - (pb[1] - pa[1]) * da[0]) / den
                    if -0.6 < t < 2.5 and -0.6 < u < 2.5 and (best is None or gapd < best[0]):
                        best = (gapd, j, eb, (pa[0] + da[0] * t, pa[1] + da[1] * t))
            if best is None: continue
            _, j, eb, c = best
            rb = runs[j]
            if c is None:                                  # end to end: meet in the middle
                (pb, _) = end_dir(rb, eb); c = ((pa[0] + pb[0]) / 2, (pa[1] + pb[1]) / 2)
                if ea == 0: ra["pts"][0] = c
                else: ra["pts"][-1] = c
                if eb == 0: rb["pts"][0] = c
                else: rb["pts"][-1] = c
            else:
                if ea == 0: ra["pts"].insert(0, c) if math.hypot(c[0] - pa[0], c[1] - pa[1]) > 0.05 else None
                else: ra["pts"].append(c) if math.hypot(c[0] - pa[0], c[1] - pa[1]) > 0.05 else None
                if eb == 0: rb["pts"].insert(0, c) if math.hypot(c[0] - rb["pts"][0][0], c[1] - rb["pts"][0][1]) > 0.05 else None
                else: rb["pts"].append(c) if math.hypot(c[0] - rb["pts"][-1][0], c[1] - rb["pts"][-1][1]) > 0.05 else None
                ra.setdefault("corner", set()).add(ea); rb.setdefault("corner", set()).add(eb)
                stats["mitred_corners"] += 1
            joined.add((i, ea)); joined.add((j, eb))
            ra.setdefault("joined", set()).add(ea); rb.setdefault("joined", set()).add(eb)

    # ---- 3. per street, a dominant style
    def street_of(f):
        cx, cz = (f["a"][0] + f["b"][0]) / 2, (f["a"][1] + f["b"][1]) / 2
        nr = T.nearest_road(cx + f["nx"] * 8, cz + f["nz"] * 8, 40, named=True)
        return nr[2]["name"] if nr else ""

    styles, style_ix = [], {}
    def style_id(s):
        key = json.dumps(s, sort_keys=True)
        if key not in style_ix: style_ix[key] = len(styles); styles.append(s)
        return style_ix[key]

    out_segs, out_pillars, out_gates, out_hedges, out_gardens = [], [], [], [], []
    run_metres = Counter()
    for ri, r in enumerate(runs):
        f = faces[r["fi"]]
        bu = str(f["bu"])
        line = r["pts"]
        L = arclen(line)[-1]
        if L < 1.5: continue
        villa = gardens[r["fi"]] > 5.0 or f["partyH"] == 0
        street = street_of(f)
        # OSM barrier along the run?
        st = None
        if bar_tree is not None:
            ls = LineString(line); best = (0, None)
            for k in bar_tree.query(ls.buffer(1.2)):
                ov = ls.intersection(bars[k][0].buffer(1.2)).length / L
                if ov > best[0]: best = (ov, bars[k])
            if best[0] >= 0.4:
                st = osm_style(best[1][1], bu, villa)
                if st: st["osm"] = 1; stats["osm_runs"] += 1; stats["osm_" + best[1][1].get("barrier", "?")] += 1
        if st is None:
            mix = VILLA_MIX if villa else TERRACE_MIX
            dom = pick(mix, h01(street or bu, "street-kind" + ("v" if villa else "t")))
            kind = dom if (street and h01(bu, "follow") < 0.6) else pick(mix, h01(bu, "kind"))
            seed = (street + "|dom") if (street and kind == dom and h01(bu, "same-look") < 0.65) else bu
            gap = gardens[r["fi"]]
            if gap < 2.5 and kind in ("railhedge", "hedge", "wallhedge"): kind = "rail" if kind == "railhedge" else "wall"   # no hedge in a 1-2.5 m strip
            st = make_style(kind, seed, villa)
            if st["hedge"] and gap < 4.0: st["hedgeH"] = min(st["hedgeH"], 1.3)
        if st["kind"] == "open":
            stats["open_fronts"] += 1
            out_gardens.append({"bu": bu, "gap": r2(gardens[r["fi"]]), "len": r2(L), "kind": "open"})
            continue
        sid = style_id(st)
        # ---- openings (arc length intervals on this run)
        ops = []
        ls = LineString(line)
        if f.get("door"):
            dx, dz = f["door"]["x"], f["door"]["z"]
            ray = LineString([(dx + f["nx"] * 0.1, dz + f["nz"] * 0.1), (dx + f["nx"] * (REACH + 1), dz + f["nz"] * (REACH + 1))])
            q = ray.intersection(ls)
            if not q.is_empty:
                q = q if q.geom_type == "Point" else min(getattr(q, "geoms", [q]), key=lambda g: g.distance(Point(dx, dz)))
                s = ls.project(q if q.geom_type == "Point" else q.centroid)
                # round 2: 1.3 m between the pillars' centres (0.94 m clear: a real garden gate, and the walker's 0.6 m
                # body gets through); no gate where a building stands right behind the line (an annex, a garage)
                gp = ls.interpolate(s)
                if R.in_building(gp.x - f["nx"] * 0.6, gp.y - f["nz"] * 0.6): stats["door_gate_blocked"] += 1
                else: ops.append([s - 0.65, s + 0.65, "ped"]); stats["door_gates"] += 1
            else: stats["door_off_run"] += 1
        for dl in ([drives[k] for k in drive_tree.query(ls.buffer(1.5))] if drive_tree is not None else []):
            if dl.distance(ls) > 1.5: continue
            a = ls.project(Point(dl.coords[0])); b = ls.project(Point(dl.coords[-1]))
            a, b = min(a, b), max(a, b)
            if b - a < 1.8:
                c = (a + b) / 2; a, b = c - 1.4, c + 1.4
            ops.append([a, b, "car"]); stats["drive_topo"] += 1
        # ramp hits (dropped kerbs behind which the strip ends) where UrbIS Topo has no line
        rs = [q for q in r["samples"] if q.get("cls") == RAMP]
        if rs and not any(o[2] == "car" for o in ops):
            ss = sorted(ls.project(Point(q["x"], q["z"])) for q in rs)
            grp = [[ss[0], ss[0]]]
            for v in ss[1:]:
                if v - grp[-1][1] < 0.8: grp[-1][1] = v
                else: grp.append([v, v])
            for a, b in grp:
                if b - a >= 1.5: ops.append([a - 0.25, b + 0.25, "car"]); stats["drive_ramp"] += 1
        for sl in service:
            q = sl.intersection(ls)
            if q.is_empty: continue
            for g in getattr(q, "geoms", [q]):
                if g.geom_type != "Point": continue
                s = ls.project(g)
                if not any(o[0] - 0.5 < s < o[1] + 0.5 for o in ops if o[2] == "car"): ops.append([s - 1.6, s + 1.6, "car"]); stats["drive_osm"] += 1
        # merge: a door inside / against a driveway walks through the driveway; overlapping driveways join
        ops.sort()
        merged = []
        for o in ops:
            o[0] = max(0.0, o[0]); o[1] = min(L, o[1])
            if o[1] - o[0] < 0.6: continue
            if merged and o[0] < merged[-1][1] + 0.5:
                m = merged[-1]; m[1] = max(m[1], o[1]); m[2] = "car" if "car" in (m[2], o[2]) else "ped"
                if m[2] == "car" and o[2] == "ped": stats["door_in_driveway"] += 1
            else: merged.append(o)
        for o in merged:                                  # slivers at the run ends join the opening
            if o[0] < 0.6: o[0] = 0.0
            if L - o[1] < 0.6: o[1] = L
        # ---- solid stretches between the openings
        solid, s = [], 0.0
        for o in merged:
            if o[0] - s > 0.05: solid.append((s, o[0]))
            s = o[1]
        if L - s > 0.05: solid.append((s, L))
        PW = 0.36 if st["kind"] != "hedge" else 0.0      # pillar width (pillars stand ON the run line)
        # pillars: run ends (unless joined straight to a neighbour: the neighbour puts one there), opening jambs,
        # corners > 25 deg, and so that no bay is longer than 3.2 m (rail) / 6 m (wall)
        pil = set()
        has_pillars = st["kind"] in ("rail", "wall") and not (st["kind"] == "wall" and st["wallH"] < 0.5 and h01(bu, "nopil") < 0.5)
        if st["kind"] == "rail" and st["wallH"] == 0.0: has_pillars = True
        if has_pillars:
            pil.add(0.0); pil.add(round(L, 3))
            for o in merged:
                if o[0] > 0.01: pil.add(round(o[0], 3))
                if o[1] < L - 0.01: pil.add(round(o[1], 3))
            S = arclen(line)
            for k in range(1, len(line) - 1):
                a = math.atan2(line[k][1] - line[k - 1][1], line[k][0] - line[k - 1][0]); b = math.atan2(line[k + 1][1] - line[k][1], line[k + 1][0] - line[k][0])
                turn = abs((b - a + math.pi) % (2 * math.pi) - math.pi)
                if turn > math.radians(25): pil.add(round(S[k], 3))
        elif st["kind"] == "hedge":
            for o in merged:                               # hedges get gate pillars at openings only
                if o[0] > 0.01: pil.add(round(o[0], 3))
                if o[1] < L - 0.01: pil.add(round(o[1], 3))
        maxbay = 3.2 if st["kind"] == "rail" else 6.0
        if has_pillars:
            for a, b in solid:
                inner = sorted(p for p in pil if a - 1e-3 <= p <= b + 1e-3)
                pts_ = sorted(set([a, b] + inner))
                for k in range(1, len(pts_)):
                    n = math.ceil((pts_[k] - pts_[k - 1]) / maxbay - 1e-6)
                    for i in range(1, n): pil.add(round(pts_[k - 1] + (pts_[k] - pts_[k - 1]) * i / n, 3))
        # ---- the 3D base line: vertices every <= 1.5 m, at the lower of the sidewalk and the garden ground
        nxf, nzf = f["nx"], f["nz"]                         # (toward the street)
        def ys(x, z):
            street_y = T.floor_y(x + nxf * 0.15, z + nzf * 0.15)
            garden_y = T.ground(x - nxf * 0.4, z - nzf * 0.4)
            return street_y, garden_y
        for (a, b) in solid:
            if st["kind"] == "hedge":
                pts = resample(cut(line, a, b), 0.5)
                if arclen(pts)[-1] >= 1.0:
                    out_hedges.append({"points": [[r2(x), r2(z)] for x, z in [(x - nxf * 0.45, z - nzf * 0.45) for x, z in pts]],
                                       "species": st["hedge"], "height": r2(st["hedgeH"]), "width": r2(0.5 if st["hedge"] == "box" else 0.7)})
                    run_metres["hedge"] += arclen(pts)[-1]
                continue
            # wall pieces stop at the pillars' faces (half a pillar in from each pillar)
            cuts = sorted(set([a, b] + [p for p in pil if a < p < b]))
            for k in range(1, len(cuts)):
                sa, sb = cuts[k - 1], cuts[k]
                sa2 = sa + (PW / 2 - 0.02 if has_pillars and any(abs(sa - p) < 1e-3 for p in pil) else 0.0)
                sb2 = sb - (PW / 2 - 0.02 if has_pillars and any(abs(sb - p) < 1e-3 for p in pil) else 0.0)
                if sb2 - sa2 < 0.15: continue
                pts = resample(cut(line, sa2, sb2), 1.5)
                Y = [ys(x, z) for x, z in pts]
                base = [min(sy, gy) - 0.0 for sy, gy in Y]
                hmin = max(st["wallH"], max(gy - by + 0.25 - CAP_T for (sy, gy), by in zip(Y, base)) if st["wallH"] > 0 else 0)
                if st["wallH"] > 0 and hmin > st["wallH"] + 0.01: stats["retaining"] += 1
                wh = hmin
                for i in range(1, len(pts)):
                    (xa, za), (xb, zb) = pts[i - 1], pts[i]
                    out_segs.append([r2(xa), r2(base[i - 1]), r2(za), r2(xb), r2(base[i]), r2(zb), sid, r2(wh)])
                    run_metres["wall" if st["wallH"] > 0 else "rail_only"] += math.hypot(xb - xa, zb - za)
                    if st["rail"] >= 0: run_metres["railing"] += math.hypot(xb - xa, zb - za)
                if st["hedge"]:
                    hp = resample(cut(line, sa2, sb2), 0.5)
                    if arclen(hp)[-1] >= 1.0:
                        out_hedges.append({"points": [[r2(x - nxf * 0.5), r2(z - nzf * 0.5)] for x, z in hp], "species": st["hedge"],
                                           "height": r2(max(st["hedgeH"], wh + CAP_T + st["railH"] * 0.8)), "width": 0.6})
                        run_metres["hedge"] += arclen(hp)[-1]
        # pillars
        for p in sorted(pil):
            x, z = point_at(line, min(p, L - 1e-3)) if p < L else line[-1]
            k = max(1, min(len(line) - 1, next((i for i, s_ in enumerate(arclen(line)) if s_ >= p), len(line) - 1)))
            yaw = math.atan2(nxf, nzf)
            Y = [ys(x + dx, z + dz) for dx, dz in ((0.18, 0.18), (-0.18, 0.18), (0.18, -0.18), (-0.18, -0.18))]
            by = min(min(a_, b_) for a_, b_ in Y)
            top = max(gy for _, gy in Y)
            h = max((st["wallH"] + CAP_T + st["railH"] + 0.12) if st["kind"] == "rail" else (st["wallH"] + CAP_T + 0.15) if st["kind"] == "wall" else 1.1, top - by + 0.4)
            out_pillars.append([r2(x), r2(by), r2(z), round(yaw, 4), r2(h), sid])
        # gates
        for o in merged:
            a, b = o[0], o[1]
            w = b - a - (PW - 0.04 if has_pillars or st["kind"] == "hedge" else 0)
            c = (a + b) / 2
            x, z = point_at(line, c)
            pa = point_at(line, max(0.0, c - w / 2)); pb = point_at(line, min(L, c + w / 2))
            dxl, dzl = pb[0] - pa[0], pb[1] - pa[1]
            if (-dzl) * nxf + dxl * nzf < 0:                # local +z (= (-dz, dx)) must be the street side
                pa, pb = pb, pa; dxl, dzl = -dxl, -dzl
            w = math.hypot(dxl, dzl)
            yaw = math.atan2(-dzl, dxl)                    # local +x along the run (pa -> pb)
            gy = max(max(ys(*pa)), max(ys(*pb)), max(ys(x, z)))
            if o[2] == "ped":
                if w < 0.7 or w > 1.6: continue
                ang = 1.2 + 0.5 * h01(bu, "open")             # open into the garden (70 - 100 deg)
                out_gates.append([r2(pa[0]), r2(gy), r2(pa[1]), round(yaw, 4), r2(w), 0, round(ang, 3), sid]); stats["ped_gates"] += 1
            else:
                if 2.2 <= w <= 4.6 and h01(bu, "cargate" + str(round(c))) < 0.55:
                    out_gates.append([r2(pa[0]), r2(gy), r2(pa[1]), round(yaw, 4), r2(w), 1, 0.0, sid]); stats["car_gates"] += 1
                else: stats["car_open"] += 1
        stats["gardens"] += 1
        out_gardens.append({"bu": bu, "gap": r2(gardens[r["fi"]]), "len": r2(L), "kind": st["kind"], "style": sid, "osm": bool(st.get("osm")),
                            "ops": [[r2(o[0]), r2(o[1]), o[2]] for o in merged]})
    # keep the pieces of this tile's buildings only (runs may reach a few metres over the edge)
    doc = {"contract": CONTRACT, "tile": name, "styles": styles, "segs": out_segs, "pillars": out_pillars, "gates": out_gates,
           "hedges": out_hedges, "gardens": out_gardens,
           "counts": {"faces": len(cand), "gardenFaces": len(gardens), "runs": len(runs), "segs": len(out_segs), "pillars": len(out_pillars),
                      "gates": len(out_gates), "hedges": len(out_hedges), "metres": {k: round(v, 1) for k, v in run_metres.items()}},
           "topo": topo_ok}
    for k, v in run_metres.items(): stats["m_" + k] += v
    stats["tiles"] += 1
    if debug: draw_debug(debug, name, R, faces, gardens, runs, doc)
    print(f"{name}: {len(gardens)} garden faces, {len(runs)} runs, {len(out_segs)} segs, {len(out_pillars)} pillars, {len(out_gates)} gates, "
          f"{len(out_hedges)} hedges, {time.time() - t0:.1f} s", file=sys.stderr)
    return doc


def draw_debug(out, name, R, faces, gardens, runs, doc):
    x0, z0, _, _ = tile_bounds(name)
    S = 4  # px per m
    W = int(500 * S)
    im = Image.new("RGB", (W, W), (245, 245, 240)); d = ImageDraw.Draw(im)
    P = lambda x, z: ((x - x0) * S, (z - z0) * S)
    for p, c in zip(R.polys, R.pcls):
        col = {5: (200, 200, 205), 4: (215, 210, 200), 8: (240, 180, 120)}.get(c, (150, 150, 155))
        if p.geom_type == "Polygon": d.polygon([P(*q) for q in p.exterior.coords], fill=col)
    for p in R.bpolys:
        if p.geom_type == "Polygon": d.polygon([P(*q) for q in p.exterior.coords], fill=(120, 100, 90))
    for fi, f in enumerate(faces):
        if fi in gardens: d.line([P(*f["a"]), P(*f["b"])], fill=(0, 160, 0), width=2)
        if f.get("door"): d.ellipse([P(f["door"]["x"] - 0.5, f["door"]["z"] - 0.5), P(f["door"]["x"] + 0.5, f["door"]["z"] + 0.5)], fill=(0, 0, 255))
    for r in runs:
        d.line([P(*q) for q in r["pts"]], fill=(255, 0, 0), width=1)
    for s in doc["segs"]:
        st = doc["styles"][s[6]]
        col = (180, 30, 30) if st["kind"] == "wall" else (20, 20, 20)
        d.line([P(s[0], s[2]), P(s[3], s[5])], fill=col, width=3)
    for h in doc["hedges"]:
        d.line([P(*q) for q in h["points"]], fill=(40, 140, 40), width=4)
    for p in doc["pillars"]:
        d.rectangle([P(p[0] - 0.25, p[2] - 0.25), P(p[0] + 0.25, p[2] + 0.25)], fill=(230, 120, 0))
    for g in doc["gates"]:
        ex = math.cos(g[3]) * g[4]; ez = -math.sin(g[3]) * g[4]
        d.line([P(g[0], g[2]), P(g[0] + ex, g[2] + ez)], fill=(0, 120, 255) if g[5] == 0 else (255, 0, 200), width=4)
    Path(out).mkdir(parents=True, exist_ok=True)
    im.save(Path(out) / f"{name}_plan.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", action="append")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", default=str(ROOT / "data" / "raw"), help="the main checkout's data/raw (UrbIS Topo CR42L)")
    ap.add_argument("--osm", default=str(ROOT / "data" / "raw"), help="where osm/barriers.json + osm/forecourts.json are")
    ap.add_argument("--debug", default=None)
    a = ap.parse_args()
    tiles = list(all_tiles()) if a.all else (a.tile or ["I6"])
    OUT.mkdir(parents=True, exist_ok=True)
    osm = load_osm(Path(a.osm))
    stats = Counter()
    t0 = time.time()
    per = {}
    for name in tiles:
        if not (TILES / name / "surfaces.json").exists(): continue
        doc = place_tile(name, Path(a.raw), Path(a.osm), osm, stats, a.debug)
        (OUT / f"{name}.json").write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
        per[name] = doc["counts"]
    if a.all:
        summ = {"contract": CONTRACT, "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "tiles": per,
                "stats": {k: (round(v, 1) if isinstance(v, float) else v) for k, v in sorted(stats.items())}}
        (OUT / "summary.json").write_text(json.dumps(summ, indent=1), encoding="utf-8")
    print(json.dumps({k: (round(v, 1) if isinstance(v, float) else v) for k, v in sorted(stats.items())}), file=sys.stderr)
    print(f"{len(per)} tiles, {time.time() - t0:.0f} s", file=sys.stderr)


if __name__ == "__main__":
    main()
