"""GARE D'UCCLE-CALEVOET (the passenger building on line 124, Chaussee d'Alsemberg 1067): the measurements the scripted
model is built from.

    python tools/calevoet_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/calevoet_station/site.json (+ site_dtm.bin/.json):
  - the UrbIS 3D building solid the model replaces: 534568 (BU_ID building/1585341, tile D6, CC0);
  - the BUILDING FRAME: origin = the footprint's bbox centre in the frame, rotation = the plan's orientation (length-weighted
    edge angle mod 90) + 90 deg so that u runs ALONG the tracks (u+ = south-south-east, towards the Dieweg / Rue Engeland
    end), w across (w+ = the track side, west-south-west);
  - the roof read in the UrbIS DSM 2021 (0.5 m, CC0): profiles along and across, ridge per section;
  - the ground (DTM 2021) along every facade, 1 m out;
  - a ground patch for the lab and the AO bake: DTM 0.5 m, u16 cm above 40 m.
--dump: the DSM - 50 m on the building-frame grid (0.5 m).

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
OUT = ROOT / "models" / "calevoet_station"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
SOLID, TILE, SHEET = "534568", "D6", "147164"


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


def main():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json", encoding="utf-8"))
    b = next(b for b in d["buildings"] if b["id"].split("/")[-1] == SOLID)
    fp = [[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]]
    sol = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=fp, base=b["base"], eaves=b["eaves"], top=b["top"])
    sx = sy = 0.0
    for i in range(len(fp)):
        (x1, z1), (x2, z2) = fp[i], fp[(i + 1) % len(fp)]
        L = math.hypot(x2 - x1, z2 - z1); a = 4 * math.atan2(z2 - z1, x2 - x1)
        sx += L * math.cos(a); sy += L * math.sin(a)
    rot = math.atan2(sy, sx) / 4 + math.pi / 2
    ca, sa = math.cos(rot), math.sin(rot)
    # origin: the bbox centre in the frame
    ox0, oz0 = float(np.mean([p[0] for p in fp])), float(np.mean([p[1] for p in fp]))
    l0 = [((x - ox0) * ca + (z - oz0) * sa, -(x - ox0) * sa + (z - oz0) * ca) for x, z in fp]
    cu = (min(p[0] for p in l0) + max(p[0] for p in l0)) / 2; cw = (min(p[1] for p in l0) + max(p[1] for p in l0)) / 2
    ox, oz = ox0 + cu * ca - cw * sa, oz0 + cu * sa + cw * ca
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    FL = [[round(v, 3) for v in loc(*p)] for p in fp]
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(rot):.3f} deg")
    print("footprint (u, w):", FL)
    dsm, dtm = sampler("dsm"), sampler("dtm")
    prof = {}
    for w in (-3.0, -2.0, -1.0, 0.0, 1.0, 2.0, 3.0):
        us = np.arange(-25.0, 25.01, 0.25); X, Z = city(us, np.full_like(us, w))
        prof[f"along_w{w:g}"] = [[round(float(a), 2), round(float(b_), 2)] for a, b_ in zip(us, dsm(X, Z))]
    for u in np.arange(-22.0, 22.01, 2.0):
        ws = np.arange(-8.0, 8.01, 0.25); X, Z = city(np.full_like(ws, u), ws)
        prof[f"across_u{u:g}"] = [[round(float(a), 2), round(float(b_), 2)] for a, b_ in zip(ws, dsm(X, Z))]
    ground = []
    n = len(FL); cu_, cw_ = np.mean([p[0] for p in FL]), np.mean([p[1] for p in FL])
    for i in range(n):
        (u1, w1), (u2, w2) = FL[i], FL[(i + 1) % n]
        le = math.hypot(u2 - u1, w2 - w1)
        if le < 0.3: continue
        nu, nw = (w2 - w1) / le, -(u2 - u1) / le
        mu, mw = (u1 + u2) / 2, (w1 + w2) / 2
        if nu * (mu - cu_) + nw * (mw - cw_) < 0: nu, nw = -nu, -nw
        ts = np.linspace(0.0, 1.0, max(2, int(le) + 1))
        X, Z = city(u1 + (u2 - u1) * ts + nu, w1 + (w2 - w1) * ts + nw); g = dtm(X, Z)
        ground.append(dict(edge=i, a=FL[i], b=FL[(i + 1) % n], min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2),
                           samples=[round(float(x), 2) for x in g]))
        print("ground", {k: v for k, v in ground[-1].items() if k != "samples"})
    step = 0.5; gx0, gz0 = math.floor(ox - 100.0), math.floor(oz - 100.0)
    xs = np.arange(gx0, gx0 + 200.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 200.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs); G = dtm(Xg, Zg)
    if np.isnan(G).any(): sys.exit("DTM patch has holes")
    OUT.mkdir(parents=True, exist_ok=True)
    (np.round((G - 40.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=40.0, encoding="u16le, centimetres above 40 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(name="Gare d'Uccle-Calevoet (passenger building), Chaussee d'Alsemberg 1067, Uccle",
                source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); facades from the photos (data/raw/refs/calevoet/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z): along the tracks, u+ = south-south-east; w = (-sin r, cos r): w+ = the track side"),
                solid=sol, footprint_local=FL, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-25.0, 25.01, 0.5)
        print("DSM - 50 m (x10, i.e. decimetres); cols u (-25..25 step 0.5), rows w")
        for w in np.arange(-8.0, 8.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:5.1f} " + "".join(f"{int(round((h - 50) * 10)):4d}" for h in dsm(X, Z)))


if __name__ == "__main__":
    main()
