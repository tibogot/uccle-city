"""EGLISE SAINT-AUGUSTIN (Place de l'Altitude Cent, Forest; L. Guiannotte + A. Watteyne, 1933-35, consecrated 1935 /
inaugurated 1936; reinforced concrete, Art Deco; OSM way 40614983, ref:UrbIS 5077320, wikidata Q3581005): the
measurements the scripted model is built from.

    ../venv/Scripts/python tools/augustin_measure.py [--dump]      (the pipeline venv: numpy, pyogrio, shapely, rasterio)

The church stands in Forest, ~180 m north of Uccle's border: the city tiles drop its UrbIS solid (they keep only the
buildings inside Uccle) but tile E1's terrain (UrbIS DTM) covers the Place. Reads the raw UrbIS sheet 147167 (CC0):
  - the 3D BuildingSolid 514999 (BU_ID building/1732283, 376 faces, base 100.46, top 154.70): every horizontal face
    (the roof levels) and the footprint, in the BUILDING FRAME: origin = the tower's axis (the centre of the cross at
    154.70), u along the arm towards the ENTRANCE (the long north-west arm: porch + west front), w to its right;
    rotation from the tower's square faces at 132.71 / 139.06 (their long edges);
  - the UrbIS DSM 2021 (0.5 m, CC0) on a building-frame grid (0.5 m) -> site_dsm.bin (u16 cm above 100 m), the profiles
    along / across the arms and the tower;
  - the UrbIS DTM 2021: the ground around the church (the Place, a roundabout): site_dtm.bin, u16 centimetres above
    90 m TAW, 240 m square, 0.5 m (lab ground, AO bake, contact).
City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (south), heights m TAW.
"""
import json, math, os, sys, glob
from pathlib import Path
import numpy as np

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
for cand in (RAW, ROOT.parent / "uccle-city" / "data" / "raw", ROOT.parent.parent.parent / "data" / "raw"):
    if (cand / "urbis" / "dsm").exists(): RAW = cand; break
OUT = ROOT / "models" / "augustin"
OUT.mkdir(parents=True, exist_ok=True)
SHEET = "147167"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
SOLID = "514999"
GROUND_BASE = 90.0


def read_solid():
    import pyogrio
    from shapely import wkb
    f = glob.glob(str(RAW / "urbis" / "buildings3d" / f"*{SHEET}*" / "shp" / f"*{SHEET}_BuildingSolids.shp"))[0]
    meta, fids, geoms, fields = pyogrio.raw.read(f, bbox=(147700, 167320, 147790, 167400), return_fids=True)
    names = list(meta["fields"])
    for i, g in enumerate(geoms):
        if fields[names.index("INSPIRE_ID")][i].endswith("/" + SOLID):
            s = wkb.loads(bytes(g))
            polys = [np.array(p.exterior.coords)[:-1] for p in s.geoms]
            return dict(id=fields[names.index("INSPIRE_ID")][i], bu=fields[names.index("BU_ID")][i]), polys
    sys.exit("solid not found")


def raster(kind):
    import rasterio
    t = glob.glob(str(RAW / "urbis" / kind / f"*{SHEET}*" / "*.tif"))[0]
    with rasterio.open(t) as s: return s.read(1).astype(np.float64), s.transform


def sampler(a, T):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - T.c) / T.a - 0.5
        r = ((ORIGIN_N - z) - T.f) / T.e - 0.5
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def main():
    sol, polys = read_solid()
    city = [np.column_stack([p[:, 0] - ORIGIN_E, ORIGIN_N - p[:, 1], p[:, 2]]) for p in polys]
    # the tower axis: the centre of the topmost face (the cross's top, 154.70)
    top = max(city, key=lambda p: p[:, 2].mean())
    ox, oz = float(top[:, 0].mean()), float(top[:, 1].mean())
    # rotation: the tower's square shoulders (132.71: two 1.5 x 6.3 m faces) -> their long edges give the arms' axes
    edges = []
    for p in city:
        if abs(p[:, 2].mean() - 132.71) < 0.05:
            for i in range(len(p)):
                d = p[(i + 1) % len(p), :2] - p[i, :2]
                if np.hypot(*d) > 4: edges.append(math.atan2(d[1], d[0]))
    a0 = float(np.mean([(e % (math.pi / 2)) for e in edges]))           # modulo 90 deg
    # u = towards the entrance: the arm whose end lies farthest from the tower axis (the long north-west arm)
    base = max(city, key=lambda p: (abs(p[:, 2].mean() - p[0, 2]) < 0.05) * len(p) * (p[0, 2] < 101))
    best = None
    for k in range(4):
        ang = a0 + k * math.pi / 2
        ca, sa = math.cos(ang), math.sin(ang)
        reach = max((x - ox) * ca + (z - oz) * sa for x, z, _ in base)
        if best is None or reach > best[1]: best = (ang, reach)
    ang = best[0]
    ca, sa = math.cos(ang), math.sin(ang)
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    cityf = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    print(f"frame: origin city ({ox:.2f}, {oz:.2f}), rotation {math.degrees(ang):.2f} deg (u = to the entrance, reach {best[1]:.2f} m)")

    levels = {}
    walls = 0
    for p in city:
        if np.ptp(p[:, 2]) < 0.05:
            z = round(float(p[0, 2]), 2)
            levels.setdefault(str(z), []).append([[round(v, 2) for v in loc(x, zz)] for x, zz, _ in p])
        else: walls += 1
    foot = levels[min(levels, key=float)]
    print(f"{len(city)} faces: {walls} walls, horizontal levels: " + ", ".join(f"{k} x{len(v)}" for k, v in sorted(levels.items(), key=lambda kv: float(kv[0]))))

    dsm_a, T = raster("dsm"); dtm_a, _ = raster("dtm")
    dsm, dtm = sampler(dsm_a, T), sampler(dtm_a, T)
    # the DSM on a building-frame grid, 0.5 m, u, w in -32..32
    us = np.arange(-32.0, 32.01, 0.5); ws = np.arange(-32.0, 32.01, 0.5)
    U, W = np.meshgrid(us, ws)
    X, Zc = cityf(U, W)
    D = dsm(X, Zc)
    (np.round((D - 100.0) * 100).clip(0, 65000).astype("<u2")).tofile(OUT / "site_dsm.bin")
    json.dump(dict(source=f"UrbIS DSM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear, resampled on the building frame", u0=-32.0, w0=-32.0, step=0.5,
                   cols=len(us), rows=len(ws), base=100.0, encoding="u16le, centimetres above 100 m TAW, row-major (w rows, u columns)"),
              open(OUT / "site_dsm.json", "w"), indent=1)

    prof = {}
    for name, w in {"axis_u": 0.0, "u_w+4": 4.0, "u_w-4": -4.0, "u_w+10": 10.0, "u_w-10": -10.0}.items():
        uu = np.arange(-32.0, 32.01, 0.25); X, Z2 = cityf(uu, np.full_like(uu, w))
        prof[name] = [[round(float(a), 2), round(float(h), 2)] for a, h in zip(uu, dsm(X, Z2))]
    for name, u in {"axis_w": 0.0, "w_u+4": 4.0, "w_u-4": -4.0, "w_u+10": 10.0, "w_u-10": -10.0}.items():
        ww = np.arange(-32.0, 32.01, 0.25); X, Z2 = cityf(np.full_like(ww, u), ww)
        prof[name] = [[round(float(a), 2), round(float(h), 2)] for a, h in zip(ww, dsm(X, Z2))]

    def stats(u0, u1, w0, w1):
        Uq, Wq = np.meshgrid(np.arange(u0, u1 + 1e-6, 0.25), np.arange(w0, w1 + 1e-6, 0.25))
        Xq, Zq = cityf(Uq, Wq); v = dsm(Xq, Zq)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    parts = {"tower_body": stats(-4.5, 4.5, -4.5, 4.5), "tower_core": stats(-1.0, 1.0, -1.0, 1.0)}

    # the ground: along a ring 3 m outside the footprint's box and on a 240 m patch
    gx = []
    for t in np.linspace(0, 2 * math.pi, 73)[:-1]:
        for r in (30.0, 36.0, 45.0):
            X, Z2 = cityf(r * math.cos(t), r * math.sin(t)); gx.append(float(dtm(X, Z2)))
    ground = dict(ring_min=round(min(gx), 2), ring_max=round(max(gx), 2), ring_mean=round(float(np.mean(gx)), 2))
    fu = [p for poly in foot for p in poly]
    near = []
    for (u, w) in fu:
        n = math.hypot(u, w) or 1
        X, Z2 = cityf(u + u / n * 1.0, w + w / n * 1.0); near.append(float(dtm(X, Z2)))
    ground.update(foot_min=round(min(near), 2), foot_max=round(max(near), 2), foot_mean=round(float(np.mean(near)), 2), solid_base=round(float(min(p[:, 2].min() for p in city)), 2))
    print("ground (DTM):", ground)
    for k, v in parts.items(): print(f"dsm {k:11s} {v}")

    gx0, gz0, step = math.floor(ox - 120.0), math.floor(oz - 120.0), 0.5
    xs = np.arange(gx0, gx0 + 240.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 240.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    G = dtm(Xg, Zg)
    (np.round((G - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(G.min()), 2), max=round(float(G.max()), 2)), open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids (sheet 147167) + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); openings / details from the photos (docs/landmarks/AUGUSTIN.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): from the tower axis towards the entrance arm; w = (-sin r, cos r)"),
                solid=dict(sol, base=round(float(min(p[:, 2].min() for p in city)), 2), top=round(float(max(p[:, 2].max() for p in city)), 2),
                           footprint_city=[[[round(x, 2), round(z, 2)] for x, z, _ in p] for p in city if abs(p[:, 2].mean() - min(q[:, 2].min() for q in city)) < 0.05]),
                levels_local=levels, dsm=parts, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        step = 1.0
        uu = np.arange(-30.0, 30.01, step)
        print("DSM - 100 (rows w, cols u)")
        print("       " + "".join(f"{u:4.0f}" for u in uu))
        for w in np.arange(-30.0, 30.01, step):
            X, Z2 = cityf(uu, np.full_like(uu, w))
            print(f"{w:6.1f} " + "".join(f"{h - 100:4.0f}" for h in dsm(X, Z2)))


if __name__ == "__main__":
    main()
