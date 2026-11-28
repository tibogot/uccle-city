"""WHERE THE CHRISTMAS DECORATIONS GO (docs/CHRISTMAS.md): models/christmas/site.json for viewer/christmas/xmasCity.js.

    python tools/christmas/build_site.py

From the city's own data only (no invented positions):
  trees     the two squares' firs: Place de Saint-Job (the widest clearing of the UrbIS square surface "P", away from
            the drawn plane trees' crowns) and the Parvis Saint-Pierre (the paved forecourt "SW" before the church's west
            front); x, z here, the city sets them on its drawn ground (world.walkY)
  spans     light garlands across the shopping streets: along each named street's centre line (roads.json) every
            SPACING m, a perpendicular ray each side to the first UrbIS building wall (buildings.json footprints); a span
            hangs between the two walls at HEIGHT m over each wall's ground (the building's base), only when both
            walls are tall enough (eaves) and the street is 7-26 m wide
  fronts    the shopfronts that get garlands: the street life's shops / cafes / restaurants (data/streetlife/<tile>.json
            pois with their facade: x, y, z, normal, width, eaves) on the decorated streets or near the trees; the city
            hangs the swag modules on each front's cornice / fascia box (viewer/shops/shopLayout.js frontFamily)
  chalets   the Christmas market on Place de Saint-Job (owner, 2026-11-17): 4-8 chalets on the open paving round the fir
  config    per-street switches (spans / swags / wreaths / lamps) and the chalets: tune here, no code
  wreaths   door wreaths on about a third of the houses (data/streetlife address numbers) on the decorated streets
  streets   the decorated streets' centre lines: the city decorates the street lamps along them (lamp motifs)
"""
import json, math, os, glob, hashlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "models", "christmas", "site.json")
SPACING, HEIGHT, HEIGHT_TRAM, OFFSET0 = 18.0, 6.8, 7.3, 9.0
TREE_RADIUS = 160.0                                  # m: the shops round a square's fir that get swags (any street)

# the decorated areas: centre, radius (m) and the streets (UrbIS / OSM names, FR part) inside it
AREAS = [
    {"id": "stjob", "centre": (1150, 525), "radius": 420,
     "streets": ["Chaussée de Saint-Job", "Place de Saint-Job"]},
    {"id": "stpierre", "centre": (-720, -500), "radius": 520,
     "streets": ["Rue Xavier De Bue", "Chaussée d'Alsemberg", "Parvis Saint-Pierre"]},
]
TREES = [
    # Place de Saint-Job (owner: "in the square"): the centre of the square's paving (1127, 530): 8.3 m from the nearest
    # drawn plane tree's crown, 7.8 m from any wall (the first pick, (1115, 533), was 2.9 m from the square's 3 m
    # pavilion: the branches went into it, browser turn 1), 16 m from the tram; the star faces the square's long axis
    {"id": "stjob", "x": 1127.0, "z": 530.0, "scale": 1.0, "face": (1.0, -0.15)},
    # Parvis Saint-Pierre: the open forecourt before the church's west front (-723, -495): 11 m from the walls, on the
    # paving (the first pick, (-718.5, -491), put the branches at the side door: browser turn 2); star toward the parvis
    {"id": "stpierre", "x": -723.0, "z": -495.0, "scale": 0.9, "face": (-1.0, -0.35)},
]

manifest = json.load(open(os.path.join(ROOT, "data", "map", "map.json"), encoding="utf-8"))
TILES = [t for t in manifest["tiles"] if any(abs(t["x0"] + 250 - a["centre"][0]) < a["radius"] + 400 and abs(t["z0"] + 250 - a["centre"][1]) < a["radius"] + 400 for a in AREAS)]
fr = lambda n: (n or "").split(" - ")[0].strip()
h01 = lambda s: int(hashlib.md5(s.encode()).hexdigest()[:8], 16) / 0xFFFFFFFF


# ------------------------------------------------------------------------------------------------ data
roads, bld, pois, numbers, trams = {}, {}, [], [], []
for t in TILES:
    d = os.path.join(ROOT, "data", "tiles", t["name"])
    if os.path.exists(os.path.join(d, "roads.json")):
        r = json.load(open(os.path.join(d, "roads.json"), encoding="utf-8"))
        nodes = {n["id"]: (n["x"], n["z"]) for n in r["nodes"]}
        for x in r["roads"]:
            if x["id"] in roads or x["a"] not in nodes or x["b"] not in nodes: continue
            pts = [nodes[x["a"]]] + [(p["x"], p["z"]) for p in x["pts"]] + [nodes[x["b"]]]
            roads[x["id"]] = {"name": fr(x["meta"].get("name")), "pts": pts}
    if os.path.exists(os.path.join(d, "surfaces.json")):
        trams += [f["rings"][0] for f in json.load(open(os.path.join(d, "surfaces.json"), encoding="utf-8"))["surfaces"] if f["c"] in (1, 2)]
    if os.path.exists(os.path.join(d, "buildings.json")):
        for b in json.load(open(os.path.join(d, "buildings.json"), encoding="utf-8"))["buildings"]:
            bld.setdefault(b["id"], b)
    sl = os.path.join(ROOT, "data", "streetlife", t["name"] + ".json")
    if os.path.exists(sl):
        s = json.load(open(sl, encoding="utf-8"))
        pois += [p for p in s.get("pois", []) if p.get("face")]
        numbers += s.get("numbers", [])

# (claude/xmas1, rule xmas-fit-current-city) the buildings the city does NOT draw: the UrbIS solids a scripted model
# replaces (models/<name>/<name>.json placement.hides_bu_ids / hides_solids, viewer/tileData.js hideBuildings): nothing
# hangs on them (the Parvis Saint-Pierre's garlands were hooked on the hidden church solid, under the Saint-Pierre
# model); and the retail boxes (data/overrides.json buildingLooks shed: plain clad walls, no house door): no wreath
HIDDEN = set()
for fp in glob.glob(os.path.join(ROOT, "models", "*", "*.json")):
    try: pl = json.load(open(fp, encoding="utf-8")).get("placement") or {}
    except Exception: continue
    if isinstance(pl, dict): HIDDEN.update(pl.get("hides_bu_ids") or []); HIDDEN.update(pl.get("hides_solids") or [])
SHED = {k for k, v in json.load(open(os.path.join(ROOT, "data", "overrides.json"), encoding="utf-8")).get("buildingLooks", {}).items() if isinstance(v, dict) and v.get("shed")}
hidden = lambda b: b["id"] in HIDDEN or (b.get("attrs") or {}).get("BU_ID") in HIDDEN
shed = lambda b: ((b.get("attrs") or {}).get("BU_ID") or "").rsplit("/", 1)[-1] in SHED
bld = {k: b for k, b in bld.items() if not hidden(b)}

# building wall segments in a 10 m grid: (ax, az, bx, bz, base, eaves)
GRID = {}
for b in bld.values():
    for ring in b["footprint"]:
        for i in range(len(ring)):
            ax, az = ring[i - 1]; bx, bz = ring[i]
            seg = (ax, az, bx, bz, b["base"], b["top"], shed(b))  # (UrbIS eaves = the LOWEST roof point: the top)
            for gx in range(int(math.floor(min(ax, bx) / 10)), int(math.floor(max(ax, bx) / 10)) + 1):
                for gz in range(int(math.floor(min(az, bz) / 10)), int(math.floor(max(az, bz) / 10)) + 1):
                    GRID.setdefault((gx, gz), []).append(seg)


def ray_wall(px, pz, dx, dz, maxd=16.0):
    """the first building wall along the ray: (distance, base, eaves) or None"""
    best = None; seen = set()
    for k in range(int(maxd / 5) + 2):
        gx, gz = int(math.floor((px + dx * k * 5) / 10)), int(math.floor((pz + dz * k * 5) / 10))
        for ox in (-1, 0, 1):
            for oz in (-1, 0, 1):
                for seg in GRID.get((gx + ox, gz + oz), ()):
                    if id(seg) in seen: continue
                    seen.add(id(seg))
                    ax, az, bx, bz, base, eaves, _ = seg
                    ex, ez = bx - ax, bz - az
                    den = dx * ez - dz * ex
                    if abs(den) < 1e-9: continue
                    t = ((ax - px) * ez - (az - pz) * ex) / den
                    u = ((ax - px) * dz - (az - pz) * dx) / den
                    if 0.5 < t < maxd and 0 <= u <= 1 and (best is None or t < best[0]): best = (t, base, eaves)
    return best


def pip(x, z, r):
    c = False
    for i in range(len(r)):
        x0, z0 = r[i]; x1, z1 = r[i - 1]
        if (z0 > z) != (z1 > z) and x < (x1 - x0) * (z - z0) / (z1 - z0) + x0: c = not c
    return c


def over_tram(pa, pb):
    """the span crosses a tram track (UrbIS tramRoad / tramSite surface): its contact wire hangs at ~6 m"""
    for k in range(1, 20):
        x = pa[0] + (pb[0] - pa[0]) * k / 20; z = pa[2] + (pb[2] - pa[2]) * k / 20
        if any(pip(x, z, r) for r in trams): return True
    return False


def near_area(x, z, a): return math.hypot(x - a["centre"][0], z - a["centre"][1]) <= a["radius"]


# ------------------------------------------------------------------------------------------------ spans
spans, streets = [], []
for a in AREAS:
    for rid, r in roads.items():
        if r["name"] not in a["streets"]: continue
        pts = r["pts"]
        if not any(near_area(x, z, a) for x, z in pts): continue
        streets.append({"area": a["id"], "name": r["name"], "pts": [[round(x, 2), round(z, 2)] for x, z in pts]})
        L = [0.0]
        for i in range(1, len(pts)): L.append(L[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
        s = OFFSET0
        while s < L[-1] - OFFSET0 + 1e-6:
            i = max(1, next(k for k in range(1, len(L)) if L[k] >= s))
            f = (s - L[i - 1]) / max(L[i] - L[i - 1], 1e-9)
            x = pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f; z = pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f
            tx, tz = pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]; tl = math.hypot(tx, tz); tx, tz = tx / tl, tz / tl
            nx, nz = -tz, tx
            s += SPACING
            if not near_area(x, z, a): continue
            A, B = ray_wall(x, z, nx, nz), ray_wall(x, z, -nx, -nz)
            if not A or not B: continue
            width = A[0] + B[0]
            if not (7.0 <= width <= 26.0): continue
            pa = (x + nx * A[0], 0, z + nz * A[0]); pb = (x - nx * B[0], 0, z - nz * B[0])
            tram = over_tram(pa, pb)
            H = HEIGHT_TRAM if tram else HEIGHT
            ya, yb = A[1] + H, B[1] + H
            if A[2] < ya + 0.8 or B[2] < yb + 0.8: continue          # a wall too low to hold it (its roof's top)
            pa = (pa[0], ya, pa[2]); pb = (pb[0], yb, pb[2])
            mid = ((pa[0] + pb[0]) / 2, (pa[2] + pb[2]) / 2)
            if any(math.hypot(mid[0] - q["mid"][0], mid[1] - q["mid"][1]) < 11 for q in spans): continue
            spans.append({"area": a["id"], "street": r["name"], "a": [round(v, 3) for v in pa], "b": [round(v, 3) for v in pb],
                          "mid": [round(mid[0], 2), round(mid[1], 2)], "width": round(width, 2),
                          "sag": round(0.3 + 0.02 * width, 2), "motif": not tram, "tram": tram})
for q in spans: q.pop("mid")

# ------------------------------------------------------------------------------------------------ shopfronts (the city hangs the swags)
# per front: the POI fields viewer/shops/shopLayout.js frontFamily() needs (classic cornice or modern fascia box: the
# garland's height and how far out it hangs are decided in the city, from the same rule the shop kit draws with)
SHOP_KINDS = {"shop", "cafe", "restaurant", "bakery", "pharmacy", "fastfood", "bar", "supermarket", "bank"}
fronts = []
deco_names = {s for a in AREAS for s in a["streets"]}
for p in pois:
    f = p["face"]
    if p.get("kind") not in SHOP_KINDS or f.get("bu") in HIDDEN: continue
    street = fr(f.get("street"))
    on_street = street in deco_names and any(near_area(f["x"], f["z"], a) for a in AREAS)
    near_tree = any(math.hypot(f["x"] - t["x"], f["z"] - t["z"]) < TREE_RADIUS for t in TREES)
    if not (on_street or near_tree): continue
    fronts.append({"id": p["id"], "kind": p.get("kind"), "cat": p.get("cat"), "name": p.get("name"), "street": street,
                   "x": round(f["x"], 3), "y": round(f["y"], 3), "z": round(f["z"], 3), "nx": f["nx"], "nz": f["nz"], "w": f["w"], "eaves": f["eaves"]})

# ------------------------------------------------------------------------------------------------ door wreaths
def on_house_wall(x, z, d=0.6):
    """a drawn house wall within d m (not hidden: dropped from GRID; not a retail box)"""
    hit = False
    gx, gz = int(math.floor(x / 10)), int(math.floor(z / 10))
    for seg in (s_ for ox in (-1, 0, 1) for oz in (-1, 0, 1) for s_ in GRID.get((gx + ox, gz + oz), ())):
        ax, az, bx, bz, _, _, is_shed = seg
        ex, ez = bx - ax, bz - az; L = ex * ex + ez * ez or 1e-9
        t = max(0, min(1, ((x - ax) * ex + (z - az) * ez) / L))
        if math.hypot(ax + t * ex - x, az + t * ez - z) <= d:
            if is_shed: return False
            hit = True
    return hit


wreaths = []
shop_pts = [(p["face"]["x"], p["face"]["z"]) for p in pois]
for n_ in numbers:
    if n_.get("fr") not in deco_names: continue
    if not any(near_area(n_["x"], n_["z"], a) for a in AREAS): continue
    if h01(n_["id"] + "wreath") > 0.33: continue
    if any(math.hypot(n_["x"] - x, n_["z"] - z) < 3.0 for x, z in shop_pts): continue
    if any(math.hypot(n_["x"] - w["x"], n_["z"] - w["z"]) < 4.0 for w in wreaths): continue
    if not on_house_wall(n_["x"], n_["z"]): continue
    wreaths.append({"x": round(n_["x"], 3), "y": round(n_["y"] + 1.7, 3), "z": round(n_["z"], 3), "nx": n_["nx"], "nz": n_["nz"], "n": n_.get("n"), "street": n_.get("fr")})


# ------------------------------------------------------------------------------------------------ the market chalets (Place de Saint-Job)
def street_furniture(tiles):
    """(claude/xmasreview) the drawn street furniture a chalet must stand clear of: (x, z, radius) points. The same list
    as tools/christmas/siteFit.mjs streetFurniture (the gate row's authority): street-name plate posts and postboxes
    (data/streetlife), road-sign poles, plate posts and Villo pieces (data/streetkit), bins, boxes, hoops, benches
    (data/furniture), bicycle parkings (the tiles' feature points). The first market put a chalet's roof through the
    Place de Saint-Job plate post (1117.7, 538.3): the build only knew trees, walls, shops and the fir"""
    out = []
    def load(*parts):
        fp = os.path.join(ROOT, "data", *parts)
        return json.load(open(fp, encoding="utf-8")) if os.path.exists(fp) else {}
    for t in tiles:
        sl = load("streetlife", f"{t}.json")
        out += [(q["x"], q["z"], 0.1) for q in sl.get("plates", []) if q.get("mount") == "post"]
        out += [(q["x"], q["z"], 0.35) for q in sl.get("postboxes", [])]
        out += [(q["x"], q["z"], 1.6 if q.get("shelter") else 0.3) for q in sl.get("stops", [])]
        sk = load("streetkit", f"{t}.json")
        out += [(q["x"], q["z"], 0.1) for q in sk.get("signs", []) + sk.get("posts", [])]
        for v in sk.get("villo", []) if isinstance(sk.get("villo"), list) else []:
            out += [(q["x"], q["z"], 0.5) for q in v.get("bikes", []) + v.get("docks", [])]
            if v.get("totem"): out.append((v["totem"]["x"], v["totem"]["z"], 0.4))
        fu = load("furniture", f"{t}.json")
        for k in ("bins", "boxes", "hoops", "benches", "banks"):
            out += [(q["x"], q["z"], 0.6) for q in fu.get(k) or [] if "x" in q]
        fe = load("tiles", t, "features.json")
        out += [(q["x"], q["z"], 0.8) for q in fe.get("points", []) if q.get("kind") == "bicycle_parking"]
    return out


FURNITURE_CLEAR = 0.5                                 # m: a chalet's footprint (roof + propped shutter) to any furniture
CUSTOMER_DEPTH = 1.5                                  # m: the customers' strip in front of the hatch
# the fir seen whole from the square's main approach: the default boot / tour spot (viewer/places.js stjob-street, the
# Place de Saint-Job street view): no chalet within 0.5 m of the sightline to the fir's foot (the furniture fix first
# put one right in front of it from there)
FIR_VIEWS = [(1102.0, 542.0)]
FIR_CROWN = 2.95                                      # m: the fir's lowest branches' reach (5.9 m wide, x the scale)


def chalets_on_square():
    """4-8 chalets on the square's open paving (UrbIS surface "P"), in two rows facing a 4 m aisle along the square's long
    axis, beside the fir: each footprint (3.6 x 2.8 m: roof overhangs + the propped shutter in front) inside the paving
    with 2.5 m to spare, 1.0 m clear of every drawn tree's trunk, 3 m off the fir's planter, 1.2 m between chalets,
    4 m from any shop's front, 2.5 m in from the paving's edge (the parked cars); one aisle; nearest to the fir first"""
    sq = None
    for t in ("I6", "I5"):
        fp = os.path.join(ROOT, "data", "tiles", t, "surfaces.json")
        for s_ in json.load(open(fp, encoding="utf-8"))["surfaces"]:
            if s_["c"] == 4 and fr(s_.get("name")) == "Place de Saint-Job" and (sq is None or len(s_["rings"][0]) > len(sq)): sq = s_["rings"][0]
    trees_ = []
    for t in ("I6", "I5"):
        trees_ += [(q["x"], q["z"]) for q in json.load(open(os.path.join(ROOT, "data", "tiles", t, "features.json"), encoding="utf-8"))["trees"]]
    fir = TREES[0]
    furn = street_furniture(("I6", "I5"))
    walls_ = [r for b in bld.values() for r in b["footprint"] if any(math.hypot(px - 1140, pz - 525) < 120 for px, pz in r)]
    wall_pts = []                                     # (the walls sampled every 0.25 m)
    for r in walls_:
        for i in range(len(r)):
            ax, az = r[i - 1]; bx, bz = r[i]; L = math.hypot(bx - ax, bz - az); n = max(1, int(L / 0.25))
            wall_pts += [(ax + (bx - ax) * k / n, az + (bz - az) * k / n) for k in range(n)]
    # the long axis (PCA of the ring)
    cx = sum(x for x, _ in sq) / len(sq); cz = sum(z for _, z in sq) / len(sq)
    sxx = sum((x - cx) ** 2 for x, _ in sq); szz = sum((z - cz) ** 2 for _, z in sq); sxz = sum((x - cx) * (z - cz) for x, z in sq)
    ang = 0.5 * math.atan2(2 * sxz, sxx - szz); ux, uz = math.cos(ang), math.sin(ang); vx, vz = -uz, ux
    def edist(x, z):
        d = 1e9
        for i in range(len(sq)):
            ax, az = sq[i - 1]; bx, bz = sq[i]; dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1e-9
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); d = min(d, math.hypot(ax + t * dx - x, az + t * dz - z))
        return d
    HW, FR, BK = 1.8, 1.45, 1.35                     # half width, front (shutter) and back reach from the centre
    picks = []
    # the aisle: the axis line through the fir's side of the square's centre
    for s_, oo in [(k * 0.5, o * 0.5) for k in range(-160, 161) for o in range(-6, 7)]:
        for side in (-1, 1):
            off = oo + side * (2.0 + FR)              # (the front faces the aisle; the aisle may sit off the centre line)
            x = cx + ux * s_ + vx * off; z = cz + uz * s_ + vz * off
            fx, fz = -side * vx, -side * vz           # the front's outward normal: toward the aisle
            corners = [(x + ux * a * HW + fx * b, z + uz * a * HW + fz * b) for a in (-1, 1) for b in (FR, -BK)]
            if not all(pip(qx, qz, sq) and edist(qx, qz) >= 2.5 for qx, qz in corners): continue   # (the parking along the edges)
            def rect_d(px, pz):
                lx = (px - x) * ux + (pz - z) * uz; ly = (px - x) * fx + (pz - z) * fz
                ddx = max(abs(lx) - HW, 0); ddy = max(ly - FR, -BK - ly, 0)
                return math.hypot(ddx, ddy)
            if any(rect_d(tx, tz) < 1.0 for tx, tz in trees_): continue
            # walls (the square's pavilion, browser turn 2 / tools/audit/xmasCheck.mjs): no corner inside a building, 1 m clear
            if any(pip(qx, qz, r) for qx, qz in corners + [(x, z)] for r in walls_) or any(rect_d(wx, wz) < 1.0 for wx, wz in wall_pts): continue
            if rect_d(fir["x"], fir["z"]) < 1.4 + 3.0: continue
            # (claude/xmasreview) street furniture clear of the footprint; the customers' strip in front of the hatch
            # clear of the fir's crown (the first market had two hatches 1.3 m from its lowest branches)
            if any(rect_d(fx_, fz_) < r_ + FURNITURE_CLEAR for fx_, fz_, r_ in furn): continue
            def front_d(px, pz):
                lx = (px - x) * ux + (pz - z) * uz; ly = (px - x) * fx + (pz - z) * fz
                return math.hypot(max(abs(lx) - HW, 0), max(ly - (FR + CUSTOMER_DEPTH), FR - ly, 0))
            if front_d(fir["x"], fir["z"]) < FIR_CROWN * fir["scale"] + 0.3: continue
            if any(rect_d(vx_ + (fir["x"] - vx_) * k / 60, vz_ + (fir["z"] - vz_) * k / 60) < 0.5 for vx_, vz_ in FIR_VIEWS for k in range(61)): continue
            if any(rect_d(q["x"], q["z"]) < 4.0 for q in fronts): continue
            picks.append((math.hypot(x - fir["x"], z - fir["z"]), x, z, fx, fz, oo))
    picks.sort()
    out = []
    aisle = None
    for d, x, z, fx, fz, oo in picks:
        if len(out) >= 6: break
        if aisle is not None and abs(oo - aisle) > 0.01: continue
        aisle = oo
        if any(math.hypot(x - q["x"], z - q["z"]) < 2 * HW + 1.2 and abs((x - q["x"]) * fx + (z - q["z"]) * fz) < FR + BK for q in out): continue
        if any(math.hypot(x - q["x"], z - q["z"]) < 3.0 for q in out): continue
        out.append({"x": round(x, 3), "z": round(z, 3), "yaw": round(math.atan2(fx, fz), 4), "tone": round(h01(f"chalet{len(out)}"), 3)})
    return out


chalets = chalets_on_square()

# per-street switches (tune later without code: the city reads these): a street absent here = everything on
CONFIG = {"chalets": True,
          "streets": {name: {"spans": True, "swags": True, "wreaths": True, "lamps": True} for name in sorted(deco_names)}}
site = {
    "version": 2, "generated_by": "tools/christmas/build_site.py",
    "season": {"from": "12-01", "to": "01-06", "note": "date-driven; ?xmas=1 forces it on, ?xmas=0 off; ?xmaschalets=0 without the market"},
    "config": CONFIG,
    # (claude/xmas1) the selection rules, so tools/audit/xmasCheck.mjs can re-derive the decorated fronts from the CURRENT
    # street life and fail a stale site.json (rule xmas-fit-current-city)
    "select": {"areas": [{"id": a["id"], "centre": list(a["centre"]), "radius": a["radius"], "streets": a["streets"]} for a in AREAS],
               "shopKinds": sorted(SHOP_KINDS), "treeRadius": TREE_RADIUS},
    "trees": [{"id": t["id"], "x": t["x"], "z": t["z"], "scale": t["scale"], "yaw": round(math.atan2(t["face"][0], t["face"][1]), 4)} for t in TREES],
    "chalets": chalets, "spans": spans, "fronts": fronts, "wreaths": wreaths, "streets": streets,
    "counts": {"spans": len(spans), "fronts": len(fronts), "wreaths": len(wreaths), "streets": len(streets), "chalets": len(chalets)},
}
json.dump(site, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(site["counts"]), {a["id"]: sum(1 for s in spans if s["area"] == a["id"]) for a in AREAS}, f"{os.path.getsize(OUT) // 1024} KB")
