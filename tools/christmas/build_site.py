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
  swags     shopfront garlands: the street life's shops / cafes / restaurants (data/streetlife/<tile>.json pois with
            their facade: x, y, z, normal, width, eaves) on the decorated streets or near the trees
  wreaths   door wreaths on about a third of the houses (data/streetlife address numbers) on the decorated streets
  streets   the decorated streets' centre lines: the city decorates the street lamps along them (lamp motifs)
"""
import json, math, os, glob, hashlib

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "models", "christmas", "site.json")
SPACING, HEIGHT, HEIGHT_TRAM, OFFSET0 = 18.0, 6.8, 7.3, 9.0

# the decorated areas: centre, radius (m) and the streets (UrbIS / OSM names, FR part) inside it
AREAS = [
    {"id": "stjob", "centre": (1150, 525), "radius": 420,
     "streets": ["Chaussée de Saint-Job", "Place de Saint-Job"]},
    {"id": "stpierre", "centre": (-720, -500), "radius": 520,
     "streets": ["Rue Xavier De Bue", "Chaussée d'Alsemberg", "Parvis Saint-Pierre"]},
]
TREES = [
    # Place de Saint-Job: the clearing at the square's west end (1115, 533): 9.8 m from the nearest plane tree's crown
    # and from the square's edge (tools/christmas/build_site.py clearing()); the star faces the square's long axis (east)
    {"id": "stjob", "x": 1115.0, "z": 533.0, "scale": 1.0, "face": (1.0, -0.15)},
    # Parvis Saint-Pierre: the forecourt before the church's west tower (-718, -491): 8.8 m clear; star toward the parvis
    {"id": "stpierre", "x": -718.5, "z": -491.0, "scale": 0.9, "face": (-1.0, -0.35)},
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

# building wall segments in a 10 m grid: (ax, az, bx, bz, base, eaves)
GRID = {}
for b in bld.values():
    for ring in b["footprint"]:
        for i in range(len(ring)):
            ax, az = ring[i - 1]; bx, bz = ring[i]
            seg = (ax, az, bx, bz, b["base"], b["top"])          # (UrbIS eaves = the LOWEST roof point: the top)
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
                    ax, az, bx, bz, base, eaves = seg
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

# ------------------------------------------------------------------------------------------------ shopfront swags
SHOP_KINDS = {"shop", "cafe", "restaurant", "bakery", "pharmacy", "fastfood", "bar", "supermarket", "bank"}
swags = []
deco_names = {s for a in AREAS for s in a["streets"]}
for p in pois:
    f = p["face"]
    if p.get("kind") not in SHOP_KINDS: continue
    on_street = fr(f.get("street")) in deco_names and any(near_area(f["x"], f["z"], a) for a in AREAS)
    near_tree = any(math.hypot(f["x"] - t["x"], f["z"] - t["z"]) < 160 for t in TREES)
    if not (on_street or near_tree): continue
    W = max(2.0, min(f["w"], 9.9))
    low = f["eaves"] - f["y"] < 4.0
    y = f["y"] + (2.55 if low else 3.0) + (0.68 if low else 0.8) + 0.28     # over the fascia + its cornice (viewer/shops)
    n = max(1, round(W / 1.6)); sc = W / (n * 1.6)
    tx, tz = -f["nz"], f["nx"]
    for k in range(n):
        u = -W / 2 + (k + 0.5) * W / n
        swags.append({"x": round(f["x"] + tx * u, 3), "y": round(y, 3), "z": round(f["z"] + tz * u, 3), "nx": f["nx"], "nz": f["nz"], "sx": round(sc, 3), "shop": p.get("name") or p["id"]})

# ------------------------------------------------------------------------------------------------ door wreaths
wreaths = []
shop_pts = [(p["face"]["x"], p["face"]["z"]) for p in pois]
for n_ in numbers:
    if n_.get("fr") not in deco_names: continue
    if not any(near_area(n_["x"], n_["z"], a) for a in AREAS): continue
    if h01(n_["id"] + "wreath") > 0.33: continue
    if any(math.hypot(n_["x"] - x, n_["z"] - z) < 3.0 for x, z in shop_pts): continue
    if any(math.hypot(n_["x"] - w["x"], n_["z"] - w["z"]) < 4.0 for w in wreaths): continue
    wreaths.append({"x": round(n_["x"], 3), "y": round(n_["y"] + 1.7, 3), "z": round(n_["z"], 3), "nx": n_["nx"], "nz": n_["nz"], "n": n_.get("n")})

site = {
    "version": 1, "generated_by": "tools/christmas/build_site.py",
    "season": {"from": "12-01", "to": "01-06", "note": "date-driven; ?xmas=1 forces it on, ?xmas=0 off"},
    "trees": [{"id": t["id"], "x": t["x"], "z": t["z"], "scale": t["scale"], "yaw": round(math.atan2(t["face"][0], t["face"][1]), 4)} for t in TREES],
    "spans": spans, "swags": swags, "wreaths": wreaths, "streets": streets,
    "counts": {"spans": len(spans), "swags": len(swags), "wreaths": len(wreaths), "streets": len(streets)},
}
json.dump(site, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(json.dumps(site["counts"]), {a["id"]: sum(1 for s in spans if s["area"] == a["id"]) for a in AREAS}, f"{os.path.getsize(OUT) // 1024} KB")
