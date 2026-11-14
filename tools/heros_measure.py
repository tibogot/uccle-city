"""SQUARE DES HEROS (Uccle; Square de Wolvendael until 4 Dec 1937): the measurements the hero place is built from.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/heros_measure.py      (numpy, rasterio, pyproj, shapely)

Writes
  models/heros/site.json        the place in city coordinates: the OSM park, lawns, paths, steps, the monument's
                                octagonal retaining wall + obelisk base (OSM flowerbed multipolygon r15607183), benches,
                                the Bruxelles Mobilite tree inventory round it, the monument frame (centre, rotation,
                                ground levels, the DSM's top of the obelisk) -> tools/blender/heros.py, viewer/heros/
  models/heros/site_dtm.bin/.json  the UrbIS DTM 2021 patch (0.5 m) over the square: the ground mesh, the AO bake
  data/overrides.json "parkSquares"  the UrbIS street surface that covers the square (be/id/streetsurface/40047, class
                                square: the tiles drew it as one raised setts plaza) minus the OSM park: the paved strip
                                round the park stays (as sidewalk paving), the park itself is the hero ground's
City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (z grows SOUTH), heights m TAW.
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
from pyproj import Transformer
from shapely.geometry import Polygon, LineString, Point, box, mapping
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
for cand in (ROOT.parent / "uccle-city" / "data" / "raw",):
    if not (RAW / "urbis").exists() and (cand / "urbis").exists(): RAW = cand
OUT = ROOT / "models" / "heros"
OUT.mkdir(parents=True, exist_ok=True)
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
SHEET = "148165"
GROUND_BASE = 40.0
PARK = 23542633
GRASS = [1154611804, 1154611808, 1154611809]
PATHS = [30374774, 30374782, 30374783, 30374784, 1154611803, 1154611805]          # surface=compacted (dolomite)
STEPS = [1154611802, 1154611806]
SIDEWALKS = [506752595, 580476861, 580476862, 580476864, 1511914373, 1023259266]
BED = 15607183                                                                     # the monument (flowerbed multipolygon)
SURFACE_ID = "be/id/streetsurface/40047"
SURF_TILES = ["E3", "E4", "F4", "F3"]
PLATFORM_R = 4.05                                                                 # the memorial's round platform (photos + the DSM ring)
BOX = (-580.0, -540.0, -470.0, -440.0)                                             # x0, z0, x1, z1 of interest
T = Transformer.from_crs(4326, 31370, always_xy=True)


def to_city(lon, lat):
    e, n = T.transform(lon, lat)
    return [round(e - ORIGIN_E, 3), round(ORIGIN_N - n, 3)]


def read(kind):
    sub = next(p for p in (RAW / "urbis" / kind).iterdir() if p.is_dir() and SHEET in p.name)
    import rasterio
    with rasterio.open(next(sub.glob("*.tif"))) as ds: a = ds.read(1).astype(np.float64)
    return a, [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]


def sampler(a, tfw):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - tfw[4]) / tfw[0] - 0.5
        r = (tfw[5] - (ORIGIN_N - z)) / -tfw[3] - 0.5
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def osm():
    d = json.load(open(RAW / "osm" / "area.json", encoding="utf8"))
    nodes = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
    ways = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
    rels = {e["id"]: e for e in d["elements"] if e["type"] == "relation"}
    line = lambda wid: [to_city(nodes[n]["lon"], nodes[n]["lat"]) for n in ways[wid]["nodes"]]
    benches = []
    x0, z0, x1, z1 = BOX
    for e in nodes.values():
        tg = e.get("tags") or {}
        if tg.get("amenity") in ("bench", "waste_basket") or tg.get("highway") == "street_lamp":
            p = to_city(e["lon"], e["lat"])
            if x0 < p[0] < x1 and z0 < p[1] < z1: benches.append(dict(osm=f"n{e['id']}", kind=tg.get("amenity") or "street_lamp", at=p, tags=tg))
    return nodes, ways, rels, line, benches


def trees_inventory():
    p = RAW / "trees" / "bm_trees_uccle.json"
    d = json.load(open(p, encoding="utf8"))
    out = []
    x0, z0, x1, z1 = BOX
    for f in d["features"]:
        g = f["geometry"]; c = g["coordinates"][0] if g["type"] == "MultiPoint" else g["coordinates"]
        x, z = c[0] - ORIGIN_E, ORIGIN_N - c[1]
        pr = f["properties"]
        if x0 < x < x1 and z0 < z < z1 and pr.get("status") == "en vie":
            out.append(dict(at=[round(x, 2), round(z, 2)], species=pr.get("essence"), h=pr.get("hauteur"), crown=pr.get("crown_diam"),
                            girth_cm=pr.get("circumference"), street=pr.get("voirie")))
    return out


def street_surface():
    """The UrbIS square surface 40047 as one polygon (the tiles carry it clipped to each tile)."""
    parts, meta = [], None
    for t in SURF_TILES:
        d = json.load(open(ROOT / "data" / "tiles" / t / "surfaces.json", encoding="utf8"))
        for s in d["surfaces"]:
            if s["id"] == SURFACE_ID:
                parts.append(Polygon(s["rings"][0], s["rings"][1:]).buffer(0)); meta = meta or {k: v for k, v in s.items() if k not in ("rings",)}
    return unary_union(parts).buffer(0.01).buffer(-0.01), meta


def main():
    nodes, ways, rels, line, benches = osm()
    park = line(PARK)
    grass = {f"w{w}": line(w) for w in GRASS}
    paths = {f"w{w}": dict(line=line(w), tags=ways[w].get("tags")) for w in PATHS}
    steps = {f"w{w}": dict(line=line(w), tags=ways[w].get("tags")) for w in STEPS}
    walks = {f"w{w}": dict(line=line(w), tags=ways[w].get("tags")) for w in SIDEWALKS}
    rel = rels[BED]
    wall = next(line(m["ref"]) for m in rel["members"] if m["role"] == "outer")
    base = next(line(m["ref"]) for m in rel["members"] if m["role"] == "inner")
    W = np.array(wall[:-1]); B = np.array(base[:-1])
    cx, cz = Polygon(wall).centroid.x, Polygon(wall).centroid.y
    bx, bz = B.mean(0)
    # the obelisk's square: its edge from the 1st to the 2nd OSM vertex gives the frame's rotation; u = toward the front
    # (south, +z: the main face with the inscription looks down the 12 steps to Avenue De Fre and the Wolvendael park)
    ex, ez = B[1] - B[0]
    edge = math.atan2(ez, ex)
    # the four candidate normals; the front = the one nearest +z (south)
    cands = [edge + k * math.pi / 2 for k in range(4)]
    rot = max(cands, key=lambda a: math.sin(a))
    rot = math.atan2(math.sin(rot), math.cos(rot))
    ca, sa = math.cos(rot), math.sin(rot)
    loc = lambda x, z: [round((x - cx) * ca + (z - cz) * sa, 3), round(-(x - cx) * sa + (z - cz) * ca, 3)]
    wall_l = [loc(*p) for p in W]; base_l = [loc(*p) for p in B]
    r_wall = [math.hypot(*p) for p in wall_l]
    side_base = [float(np.hypot(*(B[(i + 1) % 4] - B[i]))) for i in range(4)]
    print(f"monument centre ({cx:.3f}, {cz:.3f}), obelisk base centre ({bx:.3f}, {bz:.3f}), front rotation {math.degrees(rot):.2f} deg")
    print(f"  wall circumradius {min(r_wall):.2f}-{max(r_wall):.2f}, obelisk base sides {[round(s, 2) for s in side_base]}")
    print("  wall (u, w):", wall_l); print("  base (u, w):", base_l)

    dtm_a, dtm_t = read("dtm"); dsm_a, dsm_t = read("dsm")
    dtm, dsm = sampler(dtm_a, dtm_t), sampler(dsm_a, dsm_t)
    # ground round the monument: the terrace level
    angs = np.linspace(0, 2 * math.pi, 48, endpoint=False)
    ring = lambda r: dtm(cx + r * np.cos(angs), cz + r * np.sin(angs))
    terrace = {f"r{r}": dict(min=round(float(ring(r).min()), 2), med=round(float(np.median(ring(r))), 2), max=round(float(ring(r).max()), 2)) for r in (4.5, 6, 8, 10)}
    us = np.arange(-1.5, 1.51, 0.1)
    U, Wg = np.meshgrid(us, us)
    X = cx + U * ca - Wg * sa; Z = cz + U * sa + Wg * ca
    top = float(dsm(X, Z).max())
    print("terrace (DTM):", terrace, " DSM top over the obelisk:", round(top, 2))

    # the steps: their ends' ground (DTM)
    for k, s in steps.items():
        a, b = s["line"][0], s["line"][-1]
        s["ground"] = [round(float(dtm(*a)), 2), round(float(dtm(*b)), 2)]
        s["length"] = round(math.hypot(b[0] - a[0], b[1] - a[1]), 2)
        print("steps", k, s["tags"].get("step_count"), "ground", s["ground"], "length", s["length"])

    # the DTM patch
    x0, z0, x1, z1 = -585.0, -545.0, -465.0, -440.0
    step = 0.5
    xs = np.arange(x0, x1 + 1e-6, step); zs = np.arange(z0, z1 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    Gd = dtm(Xg, Zg)
    (np.round((Gd - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=x0, z0=z0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(Gd.min()), 2), max=round(float(Gd.max()), 2)), open(OUT / "site_dtm.json", "w"), indent=1)

    # the street surface: the UrbIS square minus the park, cut into pieces without holes
    surf, meta = street_surface()
    parkP = Polygon(park).buffer(0)
    rest = surf.difference(parkP)
    pcx, pcz = parkP.centroid.x, parkP.centroid.y
    quads = [box(-1e4, -1e4, pcx, pcz), box(pcx, -1e4, 1e4, pcz), box(-1e4, pcz, pcx, 1e4), box(pcx, pcz, 1e4, 1e4)]
    pieces = []
    for q in quads:
        g = rest.intersection(q)
        for p in getattr(g, "geoms", [g]):
            if p.geom_type == "Polygon" and p.area > 0.5:
                p = p.simplify(0.02)
                pieces.append(dict(rings=[[[round(x, 3), round(z, 3)] for x, z in p.exterior.coords[:-1]]] + [[[round(x, 3), round(z, 3)] for x, z in r.coords[:-1]] for r in p.interiors],
                                   area=round(p.area, 1)))
    print(f"surface {SURFACE_ID}: {surf.area:.0f} m2, park {parkP.area:.0f} m2, the strip left {rest.area:.0f} m2 in {len(pieces)} pieces (holes: {sum(len(p['rings']) - 1 for p in pieces)})")
    ovp = ROOT / "data" / "overrides.json"
    ov = json.load(open(ovp, encoding="utf8"))
    ov["parkSquares"] = [dict(id=SURFACE_ID, name="Square des Heros", cls=5,
                              why="UrbIS maps the whole square (lawns, dolomite paths, the war memorial's terrace) as one street surface of class "
                                  "'square': the tiles drew it as a raised setts plaza. The park itself (OSM way 23542633) is the hero place's own "
                                  "ground (viewer/heros/); the strip of the surface round it stays, as sidewalk paving.",
                              source="UrbIS StreetSurfaces 40047 minus OSM leisure=park w23542633; Commons / heritage.uccle.be photos (docs/landmarks/HEROS.md)",
                              switch="?heros=old: the setts plaza as before", pieces=pieces)]
    txt = json.dumps(ov, indent=2, ensure_ascii=False) + chr(10)
    open(ovp, "w", encoding="utf8", newline=chr(10)).write(txt)

    # the dolomite (OSM surface=compacted): the park minus its lawns, minus the memorial's round platform (r PLATFORM_R)
    lawns = unary_union([Polygon(r).buffer(0) for r in grass.values()])
    plat = Point(cx, cz).buffer(PLATFORM_R, 64)
    dol = parkP.difference(lawns).difference(plat)
    dolomite = []
    for p in getattr(dol, "geoms", [dol]):
        if p.geom_type == "Polygon" and p.area > 0.3:
            p = p.simplify(0.03)
            dolomite.append(dict(rings=[[[round(x, 3), round(z, 3)] for x, z in p.exterior.coords[:-1]]] + [[[round(x, 3), round(z, 3)] for x, z in r.coords[:-1]] for r in p.interiors],
                                 area=round(p.area, 1)))
    print(f"dolomite: {len(dolomite)} pieces, {sum(d['area'] for d in dolomite):.0f} m2; lawns {lawns.intersection(parkP).area:.0f} m2")
    site = dict(source="OSM (ODbL) via data/raw/osm/area.json; UrbIS DTM / DSM 2021 0.5 m and StreetSurfaces (CC0); Bruxelles Mobilite tree "
                       "inventory (CC0); dimensions not in the data from photos (docs/landmarks/HEROS.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N (south); heights m TAW", origin_city=[round(cx, 3), round(cz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z): toward the monument's front (south, the 12 steps); w = (-sin r, cos r)"),
                monument=dict(wall_city=W.round(3).tolist(), base_city=B.round(3).tolist(), wall_uw=wall_l, base_uw=base_l,
                              wall_radius=[round(min(r_wall), 3), round(max(r_wall), 3)], base_sides=[round(s, 3) for s in side_base],
                              base_centre_uw=loc(bx, bz), dsm_top=round(top, 2), terrace=terrace,
                              ground_at_centre=round(float(dtm(cx, cz)), 2)),
                park=park, grass=grass, dolomite=dolomite, platform_r=PLATFORM_R, paths=paths, steps=steps, sidewalks=walks, points=benches, trees=trees_inventory(),
                surface=dict(id=SURFACE_ID, meta=meta, area=round(surf.area, 1)))
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    print("trees:", len(site["trees"]), " points:", len(benches))


if __name__ == "__main__":
    main()
