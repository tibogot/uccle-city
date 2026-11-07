"""ÉGLISE SAINT-PIERRE D'UCCLE (Parvis Saint-Pierre, Uccle-Centre): the measurements the scripted model is built from.

    python tools/stpierre_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/stpierre/site.json (+ site_dtm.bin/.json) for tools/blender/stpierre.py, the lab and the city:
  - the UrbIS 3D building solid the model replaces (tile E3, CC0): solid 546128, BU_ID building/1594643 (OSM way
    226144437 "Église Saint-Pierre - Sint-Pieterskerk", ref:UrbIS 5015545, wikidata Q3583753);
  - the BUILDING FRAME: u along the church's axis (west front -> chevet, ~ENE), w to its right (the south side), origin =
    the middle of the west front's footprint edge (the two footprint corners of the 1782 front, measured: the front is
    square to the axis within 0.2 deg); rotation = the front edge's normal;
  - the roof levels in the UrbIS DSM 2021 (0.5 m, CC0; the church straddles sheets 147165 and 148165: mosaicked):
    profiles across the nave and the 1938-50 north aisle ("4th nave"), along the ridges, the tower, the east annexes,
    the ground along every side (DTM 2021);
  - the ground patch around the church for the lab and the AO bake: DTM, u16 centimetres above 20 m TAW.
--dump: prints the DSM on a building-frame grid (0.5 m) for checking the parts.

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
OUT = ROOT / "models" / "stpierre"
OUT.mkdir(parents=True, exist_ok=True)
SHEETS = ["147165", "148165"]                         # west + east km sheets (same northing): side by side
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
TILE = "E3"
SOLIDS = {"church": "546128"}
GROUND_BASE = 20.0
# the 1782 west front's footprint corners (north, south): its edge gives the frame
FRONT = [(-711.41, -501.94), (-706.31, -483.06)]


def load_solids():
    out = {}
    for T in ("E3", "E4"):
        d = json.load(open(ROOT / "data" / "tiles" / T / "buildings.json"))
        for b in d["buildings"]:
            sid = b["id"].split("/")[-1]
            for k, v in SOLIDS.items():
                if sid == v and k not in out:
                    out[k] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=T, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                                  base=b["base"], eaves=b["eaves"], top=b["top"])
    if len(out) != len(SOLIDS): sys.exit("solid not found")
    return out


def read_mosaic(kind):
    arrs, tfw0 = [], None
    for s in SHEETS:
        d = RAW / "urbis" / kind
        sub = next(p for p in d.iterdir() if p.is_dir() and s in p.name)
        tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
        a = tifffile.imread(tif).astype(np.float64)
        if tfw0 is None: tfw0 = tfw
        else: assert abs(tfw[4] - (tfw0[4] + sum(x.shape[1] for x in arrs) * tfw0[0])) < 0.01 and abs(tfw[5] - tfw0[5]) < 0.01, "sheets not adjacent"
        arrs.append(a)
    return np.hstack(arrs), tfw0


def sampler(a, tfw):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - tfw[4]) / tfw[0] - 0.5        # pixel centres
        r = (tfw[5] - (ORIGIN_N - z)) / -tfw[3] - 0.5
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def main():
    sol = load_solids()
    (ax, az), (bx, bz) = FRONT
    ang = math.atan2(bz - az, bx - ax) - math.pi / 2        # the front edge's normal, pointing into the church (east)
    if math.cos(ang) < 0: ang += math.pi
    ca, sa = math.cos(ang), math.sin(ang)
    ox, oz = (ax + bx) / 2, (az + bz) / 2
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    L = {k: [[round(v, 2) for v in loc(x, z)] for x, z in s["footprint"]] for k, s in sol.items()}
    print(f"frame: origin city ({ox:.2f}, {oz:.2f}), rotation {math.degrees(ang):.2f} deg (u = east along the axis, w = south)")
    for k, v in L.items():
        print(k); [print(f"  {u:7.2f} {w:7.2f}") for u, w in v]

    dsm_a, dsm_t = read_mosaic("dsm"); dtm_a, dtm_t = read_mosaic("dtm")
    dsm, dtm = sampler(dsm_a, dsm_t), sampler(dtm_a, dtm_t)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)

    prof = {}
    for name, u in {"tower_u3": 3.0, "nave_u10": 10.0, "nave_u20": 20.0, "nave_u30": 30.0, "nave_u40": 40.0, "east_u46": 46.0, "annex_u52": 52.0}.items():
        ws_ = np.arange(-18.0, 14.01, 0.25); X, Z = city(np.full_like(ws_, u), ws_)
        prof[name] = [[round(float(w), 2), round(float(h), 2)] for w, h in zip(ws_, dsm(X, Z))]
    for name, w in {"ridge": 0.0, "tower_axis": 0.25, "aisle4_ridge": -12.0, "south_eave": 9.0, "annex": 3.0}.items():
        us_ = np.arange(-4.0, 60.01, 0.25); X, Z = city(us_, np.full_like(us_, w))
        prof[name] = [[round(float(u), 2), round(float(h), 2)] for u, h in zip(us_, dsm(X, Z))]

    def stats(u0, u1, w0, w1):
        U, W = np.meshgrid(np.arange(u0, u1 + 1e-6, 0.25), np.arange(w0, w1 + 1e-6, 0.25))
        X, Z = city(U, W); v = dsm(X, Z)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    parts = {"nave_ridge": stats(10.0, 45.0, -0.3, 0.3), "south_eave": stats(10.0, 45.0, 8.6, 9.0), "north_valley": stats(10.0, 40.0, -8.6, -8.0),
             "aisle4_ridge": stats(10.0, 40.0, -12.3, -11.7), "tower_top": stats(1.5, 4.5, -1.5, 1.5), "annex_east": stats(50.0, 55.0, -10.0, 8.0)}
    for k, v in parts.items(): print(f"roof {k:13s} {v}")

    ground = {}
    for name, pts in {"west": [(-2.0, w) for w in np.arange(-15.0, 10.1, 1.0)], "east": [(58.0, w) for w in np.arange(-14.0, 10.1, 1.0)],
                      "north": [(u, -18.0) for u in np.arange(0.0, 56.0, 1.0)], "south": [(u, 12.0) for u in np.arange(0.0, 56.0, 1.0)],
                      "door": [(-1.0, 0.0), (-2.0, 0.0), (-4.0, 0.0)]}.items():
        X, Z = city(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))
        g = dtm(X, Z); ground[name] = dict(min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2))
    print("ground (DTM):", ground)

    cxm, czm = city(26.0, -2.0)
    gx0, gz0, step = math.floor(cxm - 110.0), math.floor(czm - 110.0), 0.5
    xs = np.arange(gx0, gx0 + 220.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 220.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    G = dtm(Xg, Zg)
    (np.round((G - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheets {'+'.join(SHEETS)}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); openings / details from the photos (data/raw/refs/saint-pierre/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW",
                           origin_city=[round(ox, 3), round(oz, 3)], rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): along the church axis, west front -> chevet; w = (-sin r, cos r): the south side"),
                solids=sol, footprint_local=L, roof=parts, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-3.0, 58.01, 0.5)
        print("        " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-18.0, 13.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:6.1f}  " + "".join(f"{h - 50:5.1f}" for h in dsm(X, Z)))
        print("DTM - 49")
        for w in np.arange(-18.0, 13.01, 2.0):
            X, Z = city(us_[::4], np.full_like(us_[::4], w))
            print(f"{w:6.1f}  " + "".join(f"{h - 49:5.2f}" for h in dtm(X, Z)))


if __name__ == "__main__":
    main()
