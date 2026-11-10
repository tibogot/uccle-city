"""VILLA VAN BUUREN (Avenue Leo Errera 41, 1928): the measurements the scripted model is built from.

    python tools/vanbuuren_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/vanbuuren/site.json (+ site_dtm.bin/.json) for tools/blender/vanbuuren.py, the photo poses, the lab and
the city:
  - the UrbIS 3D building solid the model replaces: 550409 (BU_ID building/1776799, tile G2, CC0) ONLY. 509389 is the
    tall grey rendered building against the villa's north side (kept, listed for the record);
  - the BUILDING FRAME: origin = the mean of the villa's footprint vertices, rotation = the plan's orientation
    (length-weighted mean of the edges of BOTH solids mod 90 deg, the prep's -7.95 deg); u ~ east, w ~ south;
  - the footprint in the frame, the roof parts measured in the UrbIS DSM 2021 (0.5 m, CC0): ridge lines (the DSM's
    maximum across each roof), the north wing's flat top, profiles; the ground (DTM 2021) along every facade;
  - the ground patch for the lab and the AO bake: DTM 0.5 m (sheets 148166 + 149166 mosaicked), u16 cm above 50 m.
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
OUT = ROOT / "models" / "vanbuuren"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
SOLID, NEIGHBOUR, TILE = "550409", "509389", "G2"
SHEETS = ["148166", "149166"]


def read_sheet(kind, sheet):
    d = RAW / "urbis" / kind
    sub = next(p for p in d.iterdir() if p.is_dir() and sheet in p.name)
    tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
    return tifffile.imread(tif).astype(np.float64), tfw


def mosaic(kind):
    """bilinear sampler over several 1 km sheets (each picks its own points)"""
    sh = [read_sheet(kind, s) for s in SHEETS]
    def f(x, z):
        x, z = np.broadcast_arrays(np.asarray(x, float), np.asarray(z, float))
        out = np.full(x.shape, np.nan)
        for a, t in sh:
            c = (x + ORIGIN_E - t[4]) / t[0]; r = (t[5] - (ORIGIN_N - z)) / -t[3]
            ok = (c > -1) & (r > -1) & (c < a.shape[1]) & (r < a.shape[0]) & np.isnan(out)     # the half-pixel seam between sheets: clamped
            c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
            fc, fr = c - c0, r - r0
            v = (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
            out[ok] = v[ok]
        return out
    return f


def main():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json", encoding="utf-8"))
    sol = {}
    for b in d["buildings"]:
        sid = b["id"].split("/")[-1]
        if sid in (SOLID, NEIGHBOUR):
            sol[sid] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                            base=b["base"], eaves=b["eaves"], top=b["top"])
    fp = sol[SOLID]["footprint"]
    # orientation of both solids (the prep's frame rotation), origin = the villa's footprint mean
    sx = sy = 0.0
    for s in sol.values():
        f_ = s["footprint"]
        for i in range(len(f_)):
            (x1, z1), (x2, z2) = f_[i], f_[(i + 1) % len(f_)]
            L = math.hypot(x2 - x1, z2 - z1); a = 4 * math.atan2(z2 - z1, x2 - x1)
            sx += L * math.cos(a); sy += L * math.sin(a)
    rot = math.atan2(sy, sx) / 4
    ox, oz = float(np.mean([p[0] for p in fp])), float(np.mean([p[1] for p in fp]))
    ca, sa = math.cos(rot), math.sin(rot)
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    L = [[round(v, 3) for v in loc(*p)] for p in fp]
    LN = [[round(v, 3) for v in loc(*p)] for p in sol[NEIGHBOUR]["footprint"]]
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(rot):.3f} deg (u ~ east, w ~ south)")
    for u, w in L: print(f"  {u:7.2f} {w:7.2f}")
    dsm, dtm = mosaic("dsm"), mosaic("dtm")

    def grid(u0, u1, w0, w1, st=0.25):
        U, W = np.meshgrid(np.arange(u0, u1 + 1e-6, st), np.arange(w0, w1 + 1e-6, st)); X, Z = city(U, W); return U, W, dsm(X, Z)
    def stats(u0, u1, w0, w1):
        _, _, v = grid(u0, u1, w0, w1)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    # ridge lines: the DSM maximum across each roof (position and height, sampled along the ridge)
    def ridge_w(u0, u1, w0, w1):       # an east-west ridge: for each u, the w of the max
        U, W, v = grid(u0, u1, w0, w1, 0.1); i = v.argmax(0)
        ws = W[i, np.arange(v.shape[1])]; hs = v.max(0)
        return dict(w=round(float(np.median(ws)), 2), h_p50=round(float(np.median(hs)), 2), h_p90=round(float(np.percentile(hs, 90)), 2), u_range=[u0, u1])
    def ridge_u(u0, u1, w0, w1):       # a north-south ridge: for each w, the u of the max
        U, W, v = grid(u0, u1, w0, w1, 0.1); i = v.argmax(1)
        us = U[np.arange(v.shape[0]), i]; hs = v.max(1)
        return dict(u=round(float(np.median(us)), 2), h_p50=round(float(np.median(hs)), 2), h_p90=round(float(np.percentile(hs, 90)), 2), w_range=[w0, w1])
    roof = dict(
        ridge_A_ns=ridge_u(-1.5, 2.5, -3.5, 7.5),
        ridge_B_ew_south=ridge_w(-5.0, -1.5, 2.0, 5.5) | {"east_part": ridge_w(2.0, 5.0, 2.0, 5.5)},
        ridge_C_ew_north=ridge_w(-6.5, -1.5, -3.0, 0.0) | {"east_part": ridge_w(2.0, 5.0, -3.0, 0.0)},
        north_wing_top=stats(-4.0, 2.5, -6.5, -3.0),
        nw_wing=stats(-7.5, -3.5, -9.5, -6.0),
        porch_canopy=stats(6.4, 8.6, -3.2, 1.2),
    )
    for k, v in roof.items(): print("roof", k, v)
    prof = {}
    for name, (u0, u1, w) in {"ew_at_w3.6": (-8, 8, 3.6), "ew_at_w-1.6": (-9, 8, -1.6), "ew_at_w6.0": (-7, 8, 6.0), "ew_at_w-5.0": (-9, 8, -5.0)}.items():
        us = np.arange(u0, u1 + 1e-6, 0.25); X, Z = city(us, np.full_like(us, w))
        prof[name] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(us, dsm(X, Z))]
    for name, (w0, w1, u) in {"ns_at_u0.55": (-9, 10, 0.55), "ns_at_u-3": (-9, 10, -3.0), "ns_at_u4.5": (-9, 10, 4.5)}.items():
        ws = np.arange(w0, w1 + 1e-6, 0.25); X, Z = city(np.full_like(ws, u), ws)
        prof[name] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(ws, dsm(X, Z))]
    # ground along each footprint edge, 1 m out (DTM)
    ground = []
    n = len(L)
    for i in range(n):
        (u1, w1), (u2, w2) = L[i], L[(i + 1) % n]
        le = math.hypot(u2 - u1, w2 - w1); nu, nw = (w2 - w1) / le, -(u2 - u1) / le       # outward for a cw ring in (u, w)?
        mu, mw = (u1 + u2) / 2, (w1 + w2) / 2
        # pick the side away from the centroid
        if nu * mu + nw * mw < 0: nu, nw = -nu, -nw
        ts = np.linspace(0.1, 0.9, 9)
        X, Z = city(u1 + (u2 - u1) * ts + nu, w1 + (w2 - w1) * ts + nw); g = dtm(X, Z)
        ground.append(dict(edge=i, a=L[i], b=L[(i + 1) % n], min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2)))
    for g in ground: print("ground", g)
    # ground patch (city axes) for the lab and the AO bake
    step = 0.5; gx0, gz0 = math.floor(ox - 110.0), math.floor(oz - 110.0)
    xs = np.arange(gx0, gx0 + 220.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 220.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs); G = dtm(Xg, Zg)
    if np.isnan(G).any(): sys.exit("DTM patch has holes")
    OUT.mkdir(parents=True, exist_ok=True)
    (np.round((G - 50.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheets {', '.join(SHEETS)}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=50.0, encoding="u16le, centimetres above 50 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(name="Villa van Buuren (Musee David et Alice van Buuren), Avenue Leo Errera 41, Uccle",
                source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); facades from the photos (data/raw/refs/vanbuuren/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z): ~east; w = (-sin r, cos r): ~south"),
                solid=sol[SOLID], neighbour=dict(note="509389 = the tall grey building against the villa's north side, NOT the villa (kept as UrbIS)", **sol[NEIGHBOUR]),
                footprint_local=L, neighbour_footprint_local=LN, roof=roof, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-12.0, 12.01, 0.5)
        print("       " + "".join(f"{u:6.1f}" for u in us_))
        for w in np.arange(-12.0, 12.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:6.1f} " + "".join(f"{h:6.1f}" for h in dsm(X, Z)))


if __name__ == "__main__":
    main()
