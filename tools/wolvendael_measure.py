"""CHATEAU DE WOLVENDAEL (Parc de Wolvendael, Uccle; today the Ecole d'art d'Uccle) + ITS POND: the measurements the
scripted model and the pond are built from.

    python tools/wolvendael_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/wolvendael_chateau/site.json (+ site_dtm.bin/.json) for tools/blender/wolvendael_chateau.py, the photo
poses, the lab, the pond (viewer/water/) and the city:
  - the UrbIS 3D building solids the model replaces: 537523 (the house, an L: the long pond-side block + the south-west
    part that runs back to the street) and 538880 (the low annex behind it, BU_ID building/1587095), tile F4, CC0;
  - the BUILDING FRAME (the prep's): origin = the mean of both footprints' vertices, rotation = the plan's orientation
    (-33.57 deg). u runs along the long pond front (u+ = north-east end), w across it (w- = the pond side, north-west);
  - the roof read in the UrbIS DSM 2021 (0.5 m, CC0): the main block's ridge, the south-west part's hip ridge, the
    chimneys (local maxima), profiles across and along;
  - the ground (DTM 2021) along every facade, 1 m out;
  - THE POND: OSM way 31664019 (natural=water; UrbIS Land cover has no water block here: the park is one green block
    28215), its water level from the DSM / DTM returns on the open water (flat 46.73), the open-water mask from the DSM;
  - the ground patch for the lab, the AO bake and the pond: DTM 0.5 m, u16 cm above 40 m.
--dump: the DSM on the building-frame grid (0.5 m).

City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (south), heights m TAW.
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
if not (RAW / "urbis").exists():                     # a worktree: data/raw lives in the main checkout
    RAW = ROOT.parent.parent.parent / "data" / "raw"
OUT = ROOT / "models" / "wolvendael_chateau"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
HOUSE, ANNEX, TILE, SHEET = "537523", "538880", "F4", "148165"
POND_OSM = "osm:w31664019"


def read_sheet(kind):
    d = RAW / "urbis" / kind
    sub = next(p for p in d.iterdir() if p.is_dir() and SHEET in p.name)
    tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
    return tifffile.imread(tif).astype(np.float64), tfw


def sampler(kind):
    a, t = read_sheet(kind)
    def f(x, z):
        x, z = np.broadcast_arrays(np.asarray(x, float), np.asarray(z, float))
        c = (x + ORIGIN_E - t[4]) / t[0]; r = (t[5] - (ORIGIN_N - z)) / -t[3]
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = c - c0, r - r0
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def inside(x, z, poly):
    x, z = np.asarray(x, float), np.asarray(z, float); c = np.zeros(x.shape, bool)
    for i in range(len(poly)):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
        m = (z1 > z) != (z2 > z)
        with np.errstate(divide="ignore", invalid="ignore"):
            xc = (x2 - x1) * (z - z1) / (z2 - z1 + 1e-12) + x1
        c ^= m & (x < xc)
    return c


def main():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json", encoding="utf-8"))
    sol = {}
    for b in d["buildings"]:
        sid = b["id"].split("/")[-1]
        if sid in (HOUSE, ANNEX):
            sol[sid] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                            base=b["base"], eaves=b["eaves"], top=b["top"])
    allp = [p for s in sol.values() for p in s["footprint"]]
    sx = sy = 0.0
    for s in sol.values():
        f_ = s["footprint"]
        for i in range(len(f_)):
            (x1, z1), (x2, z2) = f_[i], f_[(i + 1) % len(f_)]
            L = math.hypot(x2 - x1, z2 - z1); a = 4 * math.atan2(z2 - z1, x2 - x1)
            sx += L * math.cos(a); sy += L * math.sin(a)
    rot = math.atan2(sy, sx) / 4
    ox, oz = float(np.mean([p[0] for p in allp])), float(np.mean([p[1] for p in allp]))
    ca, sa = math.cos(rot), math.sin(rot)
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    FL = {k: [[round(v, 3) for v in loc(*p)] for p in s["footprint"]] for k, s in sol.items()}
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(rot):.3f} deg (u+ ~ north-east along the pond front, w- = the pond side)")
    for k, L in FL.items(): print(" ", k, L)
    dsm, dtm = sampler("dsm"), sampler("dtm")

    def grid(u0, u1, w0, w1, st=0.1):
        U, W = np.meshgrid(np.arange(u0, u1 + 1e-6, st), np.arange(w0, w1 + 1e-6, st)); X, Z = city(U, W); return U, W, dsm(X, Z)
    def ridge_w(u0, u1, w0, w1):        # a ridge along u: per u column, the w of the max
        U, W, v = grid(u0, u1, w0, w1); i = v.argmax(0)
        ws = W[i, np.arange(v.shape[1])]; hs = v.max(0)
        return dict(w=round(float(np.median(ws)), 2), h_p50=round(float(np.median(hs)), 2), h_p90=round(float(np.percentile(hs, 90)), 2), u_range=[u0, u1])
    def ridge_u(u0, u1, w0, w1):        # a ridge along w
        U, W, v = grid(u0, u1, w0, w1); i = v.argmax(1)
        us = U[np.arange(v.shape[0]), i]; hs = v.max(1)
        return dict(u=round(float(np.median(us)), 2), h_p50=round(float(np.median(hs)), 2), h_p90=round(float(np.percentile(hs, 90)), 2), w_range=[w0, w1])
    def peak(u0, u1, w0, w1):           # a chimney: the DSM's maximum and the centroid of what stands > 0.5 m over the roof around it
        U, W, v = grid(u0, u1, w0, w1, 0.05); m = v > v.max() - 0.45
        return dict(u=round(float(U[m].mean()), 2), w=round(float(W[m].mean()), 2), top=round(float(v.max()), 2), top_p90=round(float(np.percentile(v[m], 90)), 2),
                    extent_u=round(float(U[m].max() - U[m].min()), 2), extent_w=round(float(W[m].max() - W[m].min()), 2))
    roof = dict(
        main_ridge=ridge_w(5.0, 18.0, -10.0, -4.0),
        main_ridge_west=ridge_w(-0.2, 1.2, -10.0, -4.0),
        sw_hip_ridge=ridge_u(-10.5, -2.5, -6.0, 1.5),
        chimney_ne=peak(11.5, 14.5, -9.0, -5.0),
        chimney_c=peak(0.5, 3.5, -9.5, -6.0),
    )
    for k, v in roof.items(): print("roof", k, v)
    prof = {}
    for u in (-9.0, -6.5, -4.0, 2.0, 7.5, 10.0, 16.0, 19.5):
        ws = np.arange(-13.0, 8.01, 0.25); X, Z = city(np.full_like(ws, u), ws)
        prof[f"across_u{u:g}"] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(ws, dsm(X, Z))]
    for w in (-10.5, -9.0, -7.0, -5.0, -3.5, 0.0, 2.0):
        us = np.arange(-15.0, 23.01, 0.25); X, Z = city(us, np.full_like(us, w))
        prof[f"along_w{w:g}"] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(us, dsm(X, Z))]
    # ground along each footprint edge, 1 m out (DTM): min / max / mean and a sample every metre
    ground = {}
    for k, L in FL.items():
        n = len(L); cu, cw = np.mean([p[0] for p in L]), np.mean([p[1] for p in L]); out = []
        for i in range(n):
            (u1, w1), (u2, w2) = L[i], L[(i + 1) % n]
            le = math.hypot(u2 - u1, w2 - w1); nu, nw = (w2 - w1) / le, -(u2 - u1) / le
            mu, mw = (u1 + u2) / 2, (w1 + w2) / 2
            if nu * (mu - cu) + nw * (mw - cw) < 0: nu, nw = -nu, -nw
            ts = np.linspace(0.0, 1.0, max(2, int(le) + 1))
            X, Z = city(u1 + (u2 - u1) * ts + nu, w1 + (w2 - w1) * ts + nw); g = dtm(X, Z)
            out.append(dict(edge=i, a=L[i], b=L[(i + 1) % n], min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2),
                            samples=[round(float(x), 2) for x in g]))
        ground[k] = out
        for g in out: print("ground", k, {kk: vv for kk, vv in g.items() if kk != "samples"})
    # THE POND
    feats = json.load(open(ROOT / "data" / "tiles" / TILE / "features.json", encoding="utf-8"))
    ring = next(a for a in feats["areas"] if a["id"] == POND_OSM)["rings"][0]
    rx, rz = [p[0] for p in ring], [p[1] for p in ring]
    X, Z = np.meshgrid(np.arange(min(rx) - 4, max(rx) + 4, 0.25), np.arange(min(rz) - 4, max(rz) + 4, 0.25))
    inn = inside(X, Z, ring); hs, ht = dsm(X, Z), dtm(X, Z)
    flat = inn & (np.abs(hs - ht) < 0.05)
    level = float(np.percentile(ht[flat], 20))
    openw = inn & (hs < level + 0.06)                                       # the open water the LiDAR saw (no tree, no reed over it)
    bank = inside(X, Z, ring) & (ht > level + 0.25)
    pond = dict(osm=POND_OSM, ring_city=ring, ring_local=[[round(v, 3) for v in loc(*p)] for p in ring], water_level=round(level, 2),
                note="water level = p20 of the DTM where the DSM returns the same (open water); UrbIS Land cover has no water block here",
                open_water_m2=round(float(openw.sum()) * 0.0625, 1), polygon_m2=round(float(inn.sum()) * 0.0625, 1),
                bank_above_0_25_inside_m2=round(float(bank.sum()) * 0.0625, 1),
                dtm_inside=dict(p05=round(float(np.percentile(ht[inn], 5)), 2), p50=round(float(np.percentile(ht[inn], 50)), 2), p95=round(float(np.percentile(ht[inn], 95)), 2)))
    print("pond", {k: v for k, v in pond.items() if not k.startswith("ring")})
    # ground patch (city axes) for the lab, the AO bake and the pond: covers the house, the lawn and the pond
    step = 0.5; gx0, gz0 = math.floor(ox - 120.0), math.floor(oz - 140.0)
    xs = np.arange(gx0, gx0 + 240.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 240.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs); G = dtm(Xg, Zg)
    if np.isnan(G).any(): sys.exit("DTM patch has holes")
    OUT.mkdir(parents=True, exist_ok=True)
    (np.round((G - 40.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=40.0, encoding="u16le, centimetres above 40 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(name="Chateau de Wolvendael (Ecole d'art d'Uccle), Parc de Wolvendael, Uccle",
                source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); OSM (ODbL) for the pond; facades from the photos (data/raw/refs/wolvendael/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z): along the pond front, u+ = north-east; w = (-sin r, cos r): w- = the pond side (north-west)"),
                solids={k: s for k, s in sol.items()}, footprint_local=FL, roof=roof, profiles=prof, ground=ground, pond=pond)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-14.0, 22.01, 0.5)
        print("DSM - 40 m; cols u, rows w")
        print("      " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-13.0, 9.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:5.1f} " + "".join(f"{h - 40:5.1f}" for h in dsm(X, Z)))


if __name__ == "__main__":
    main()
