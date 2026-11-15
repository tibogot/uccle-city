"""PUBLIC ART KIT: the sites (models/publicart/site.json) from real data, for tools/blender/publicart.py and the city
(viewer/publicart/). Deterministic. docs/publicart/PUBLIC_ART_KIT.md.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/publicart/build_site.py

Inputs (all real data):
  data/publicart/inventory.json   the items (positions = OSM nodes / ways, city metres)
  data/tiles/<T>/buildings.json   the UrbIS 3D solids of the Dix Monolithes (7 standing + 3 lying, footprints + tops):
                                  the stones' positions, sections, orientations and heights; hidden in the city
  data/tiles/<T>/surfaces.json    the roundabout's UrbIS median (be/id/streetsurface/40050): the island (circle fit)
  data/tiles/<T>/terrain.*        the 1 m DTM (UrbIS 2021): the ground under each piece (the un-carved grid, as the
                                  viewer's Heightmap.ground)
  data/tiles/<T>/roads.json       the nearest road centreline: which way a milestone / the Gobert memorial faces
  OSM way 245080563               the Gobert memorial's outline (UrbIS 6155638; not in the tiles' solids): its line
Facing: yaw = atan2(fx, fz) of the piece's front (three.js +Z of the local frame), x east, z south.
"""
import json, math, os, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
TILES = os.path.join(ROOT, "data", "tiles")
MAN = json.load(open(os.path.join(TILES, "manifest.json")))
INV = json.load(open(os.path.join(ROOT, "data", "publicart", "inventory.json"), encoding="utf-8"))
ITEMS = {it["id"]: it for it in INV["items"]}
OUT = os.path.join(ROOT, "models", "publicart", "site.json")


def tile_of(x, z):
    for t in MAN["tiles"]:
        b = t["bounds"]
        if b["x"][0] <= x < b["x"][1] and b["z"][0] <= z < b["z"][1]: return t["name"]
    raise SystemExit(f"no tile at {x}, {z}")


_HM = {}
def ground(x, z):
    """bilinear on the tile's 1 m DTM (cm, u16 LE), like viewer/heightmap.js sample(orig)"""
    T = tile_of(x, z)
    if T not in _HM:
        h = json.load(open(os.path.join(TILES, T, "terrain.json")))
        raw = open(os.path.join(TILES, T, "terrain.u16"), "rb").read()
        vals = [int.from_bytes(raw[i:i + 2], "little") for i in range(0, len(raw), 2)]
        lo = min(v for v in vals if v != h["nodata"])
        _HM[T] = (h, [(lo if v == h["nodata"] else v) / 100 for v in vals])
    h, y = _HM[T]
    c = min(max((x - h["x0"]) / h["step"], 0), h["cols"] - 1); r = min(max((z - h["z0"]) / h["step"], 0), h["rows"] - 1)
    c0 = min(int(c), h["cols"] - 2); r0 = min(int(r), h["rows"] - 2); fc, fr = c - c0, r - r0; i = r0 * h["cols"] + c0
    return (y[i] * (1 - fc) + y[i + 1] * fc) * (1 - fr) + (y[i + h["cols"]] * (1 - fc) + y[i + h["cols"] + 1] * fc) * fr


def nearest_road(x, z):
    T = tile_of(x, z)
    d = json.load(open(os.path.join(TILES, T, "roads.json"), encoding="utf-8"))
    N = {n["id"]: (n["x"], n["z"]) for n in d["nodes"]}
    best = None
    for r in d["roads"]:
        if r["meta"].get("highway") in ("footway", "path", "cycleway", "steps", "service", None): continue
        pts = [N[r["a"]]] + [(p["x"], p["z"]) for p in r["pts"]] + [N[r["b"]]]
        for (ax, az), (bx, bz) in zip(pts, pts[1:]):
            dx, dz = bx - ax, bz - az; L = dx * dx + dz * dz or 1
            t = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L)); qx, qz = ax + t * dx, az + t * dz
            dd = math.hypot(x - qx, z - qz)
            if best is None or dd < best[0]: best = (dd, r["meta"].get("name"), qx, qz)
    return best


def yaw_to(x, z, tx, tz): return math.atan2(tx - x, tz - z)
def r3(v): return round(float(v), 3)


def monolithes():
    it = ITEMS["monolithes"]
    x0, z0 = it["city_xz"]; T = tile_of(x0, z0)
    # the island: the roundabout median surface (UrbIS street surface 40050), least-squares circle (Kasa)
    S = json.load(open(os.path.join(TILES, T, "surfaces.json"), encoding="utf-8"))
    ring = next(s for s in S["surfaces"] if s["id"] == "be/id/streetsurface/40050")["rings"][0]
    n = len(ring)
    import numpy as np
    A = np.c_[2 * np.array([p[0] for p in ring]), 2 * np.array([p[1] for p in ring]), np.ones(n)]
    b = np.array([p[0] ** 2 + p[1] ** 2 for p in ring])
    a_, b_, c_ = np.linalg.lstsq(A, b, rcond=None)[0]
    cx, cz = float(a_), float(b_); R = math.sqrt(c_ + a_ * a_ + b_ * b_)
    y0 = ground(cx, cz)
    B = json.load(open(os.path.join(TILES, T, "buildings.json")))
    stones = []
    for bld in B["buildings"]:
        fp = bld["footprint"][0]
        mx = sum(p[0] for p in fp) / len(fp); mz = sum(p[1] for p in fp) / len(fp)
        if math.hypot(mx - cx, mz - cz) > R - 1: continue
        e = [(fp[(i + 1) % 4][0] - fp[i][0], fp[(i + 1) % 4][1] - fp[i][1]) for i in range(4)]
        L0 = (math.hypot(*e[0]) + math.hypot(*e[2])) / 2; L1 = (math.hypot(*e[1]) + math.hypot(*e[3])) / 2
        long_ = e[0] if L0 >= L1 else e[1]
        stones.append({"urbis": bld["id"].split("/")[-1], "x": r3(mx - cx), "z": r3(mz - cz),
                       "len": r3(max(L0, L1)), "wid": r3(min(L0, L1)),
                       "axis_yaw": r3(math.atan2(long_[0], long_[1])),          # the long side's direction (yaw of +Z)
                       "top": r3(bld["top"] - y0), "base_urbis": bld["base"], "top_urbis": bld["top"], "lying": bld["height"] < 3})
    stones.sort(key=lambda s: s["urbis"])
    # the heritage record counts 7 standing stones; UrbIS has 6: the 7th (south-west group, between 514510 and 515111)
    # stands on the aerial and in Street View; placed there BY EYE from the aerial (not traced), its section / axis / top
    # like its neighbours' (1.45 m, the record's 6.00 m)
    if sum(1 for s in stones if not s["lying"]) == 6:
        stones.append({"urbis": "none (aerial)", "x": -7.5, "z": 10.1, "len": 1.45, "wid": 1.38, "axis_yaw": 0.31,
                       "top": r3(6.0 + 27.95 - y0), "base_urbis": None, "top_urbis": None, "lying": False,
                       "source": "heritage record (7 standing) + Google aerial / Street View, by eye; not in UrbIS"})
    return {"id": "monolithes", "tile": T, "x": r3(cx), "z": r3(cz), "y": r3(y0), "yaw": 0.0,
            "island": {"r": r3(R), "fit_residual_m": r3(max(abs(math.hypot(p[0] - cx, p[1] - cz) - R) for p in ring)),
                       "source": "UrbIS street surface 40050 (median), circle fit"},
            "stones": stones, "hide_solids": [f"https://databrussels.be/id/buildingsolid/{s['urbis']}" for s in stones if s["base_urbis"] is not None],
            "ground_samples": {"centre": r3(y0), "edge_n": r3(ground(cx, cz - R)), "edge_s": r3(ground(cx, cz + R)),
                               "edge_e": r3(ground(cx + R, cz)), "edge_w": r3(ground(cx - R, cz))}}


def simple(id_, facing, note, **kw):
    it = ITEMS[id_]; x, z = it["city_xz"]
    out = {"id": id_, "tile": tile_of(x, z), "x": r3(x), "z": r3(z), "y": r3(ground(x, z))}
    if facing == "road":
        d, name, qx, qz = nearest_road(x, z)
        out.update(yaw=r3(yaw_to(x, z, qx, qz)), faces=f"the nearest road ({name}, {d:.1f} m)")
    else:
        out.update(yaw=r3(facing), faces=note)
    out.update(kw)
    return out


def gobert():
    # OSM way 245080563 (outline, WGS84 -> city metres with pipeline/common.py wgs_to_local): its two far ends; the
    # memorial's line runs between them, the front faces Avenue De Fre
    sys.path.insert(0, os.path.join(ROOT, "pipeline"))
    from common import wgs_to_local
    a = wgs_to_local(4.3423212, 50.8029437); b = wgs_to_local(4.3424072, 50.8029674)
    a = (float(a[0]), float(a[1])); b = (float(b[0]), float(b[1]))
    cx, cz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    ux, uz = (b[0] - a[0]), (b[1] - a[1]); L = math.hypot(ux, uz); ux /= L; uz /= L
    d, name, qx, qz = nearest_road(cx, cz)
    nx, nz = -uz, ux
    if nx * (qx - cx) + nz * (qz - cz) < 0: nx, nz = -nx, -nz
    return {"id": "gobert", "tile": tile_of(cx, cz), "x": r3(cx), "z": r3(cz), "y": r3(ground(cx, cz)),
            "yaw": r3(math.atan2(nx, nz)), "faces": f"{name} ({d:.1f} m)", "osm_length_m": r3(L),
            "source": "OSM way 245080563 (UrbIS 6155638): the central pier + the two dated panels",
            "ground_samples": {k: r3(ground(cx + ux * s, cz + uz * s)) for k, s in (("west_end", -L / 2 - 3), ("centre", 0), ("east_end", L / 2 + 3))}}


site = {
    "about": "Public art kit sites (tools/publicart/build_site.py). City metres x east, z south, y m TAW; yaw = atan2(fx, fz) of the front.",
    "pieces": [
        monolithes(),
        # the V: front toward the square's north apex (Brugmann x Wolvendael), where the paths meet (aerial + photos)
        simple("evades", math.pi, "north, toward the square's apex where the paths from Brugmann / Wolvendael meet (aerial, photos)"),
        gobert(),
        simple("km5", "road", None, numeral="5", kind="milestone"),
        simple("milestone0", "road", None, numeral="0", kind="milestone"),
        simple("milestone1", "road", None, numeral="1", kind="milestone"),
        simple("charlesquint1", "road", None, kind="boundary"),
        simple("charlesquint2", "road", None, kind="boundary"),
    ],
}
json.dump(site, open(OUT, "w", encoding="utf-8"), indent=1, ensure_ascii=False)
for p in site["pieces"]: print(p["id"], p["tile"], p["x"], p["z"], p["y"], p.get("yaw"), p.get("faces", ""))
m = site["pieces"][0]
print("island", m["island"], m["ground_samples"])
for s in m["stones"]: print(" ", s)
print("gobert", site["pieces"][2])
