"""CHAPELLE DE STALLE (Notre-Dame de Bon-Secours, rue de Stalle 50, Uccle): the measurements the scripted model is built from.

    python tools/stalle_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/stalle/site.json (+ site_dtm.bin/.json) for tools/blender/stalle.py, the lab and the city:
  - the UrbIS 3D building solids the model replaces (tile D5, CC0): the chapel (solid 530292, BU_ID building/1714263,
    OSM way 243989500 "Chapelle de Stalle - Stallekapel", ref:UrbIS 7630770) and the sacristan's house of 1711 against
    its south-west corner (solid 525640, BU_ID building/1711913);
  - the BUILDING FRAME: u along the chapel's axis (west front -> chevet, ~ENE), w to its right (south side), origin = the
    middle of the west front's footprint edge; orientation = the length-weighted mean of the chapel's footprint edges
    (mod 90 deg);
  - the roof levels in the UrbIS DSM 2021 (0.5 m, CC0): profiles across the nave (aisle eaves, clerestory, ridge) and
    along the ridge (west gable, bell-cote, choir, apse), the sacristan's house, the ground along every side (DTM 2021);
  - the ground patch around the chapel for the lab and the AO bake: DTM, u16 centimetres above 20 m TAW.
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
OUT = ROOT / "models" / "stalle"
OUT.mkdir(parents=True, exist_ok=True)
SHEET = "147165"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
TILE = "D5"
SOLIDS = {"chapel": "530292", "house": "525640"}
GROUND_BASE = 20.0


def load_solids():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json"))
    out = {}
    for b in d["buildings"]:
        sid = b["id"].split("/")[-1]
        for k, v in SOLIDS.items():
            if sid == v:
                out[k] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                              base=b["base"], eaves=b["eaves"], top=b["top"])
    if len(out) != len(SOLIDS): sys.exit("solid not found")
    return out


def read_sheet(kind):
    d = RAW / "urbis" / kind
    sub = next(p for p in d.iterdir() if p.is_dir() and SHEET in p.name)
    tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
    return tifffile.imread(tif).astype(np.float64), tfw


def sampler(a, tfw):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - tfw[4]) / tfw[0] - 0.5        # pixel centres
        r = (tfw[5] - (ORIGIN_N - z)) / -tfw[3] - 0.5
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def frame_of(fp):
    s = c = 0.0
    for i in range(len(fp)):
        (ax, az), (bx, bz) = fp[i], fp[(i + 1) % len(fp)]
        L = math.hypot(bx - ax, bz - az); t = 4 * math.atan2(bz - az, bx - ax)
        s += L * math.sin(t); c += L * math.cos(t)
    return math.atan2(s, c) / 4


def main():
    sol = load_solids()
    fp = sol["chapel"]["footprint"]
    ang = frame_of(fp)
    # u must run west -> east (the chevet is east of the west front): pick the quadrant whose u points to +x
    while math.cos(ang) < 0.5: ang += math.pi / 2
    while math.cos(ang) < math.cos(ang - math.pi / 2): ang -= math.pi / 2
    ca, sa = math.cos(ang), math.sin(ang)
    # origin: middle of the west front edge (the footprint's two westmost points)
    loc0 = lambda x, z, ox, oz: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    us = sorted(fp, key=lambda p: loc0(p[0], p[1], 0, 0)[0])
    a, b = us[0], us[1]
    ox, oz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
    # the west front edge is not exactly square to the mean frame: measure it
    L = {k: [list(map(lambda v: round(v, 2), loc0(x, z, ox, oz))) for x, z in s["footprint"]] for k, s in sol.items()}
    print(f"frame: origin city ({ox:.2f}, {oz:.2f}), rotation {math.degrees(ang):.2f} deg (u = east along the axis, w = south)")
    for k, v in L.items():
        print(k); [print(f"  {u:7.2f} {w:7.2f}") for u, w in v]

    dsm_a, dsm_t = read_sheet("dsm"); dtm_a, dtm_t = read_sheet("dtm")
    dsm, dtm = sampler(dsm_a, dsm_t), sampler(dtm_a, dtm_t)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)

    prof = {}
    for name, u in {"nave_u2": 2.0, "nave_u4": 4.0, "nave_u6": 6.0, "nave_u8": 8.0, "nave_u10": 10.0, "choir_u13": 13.0, "choir_u15": 15.0}.items():
        ws_ = np.arange(-7.0, 7.01, 0.25); X, Z = city(np.full_like(ws_, u), ws_)
        prof[name] = [[round(float(w), 2), round(float(h), 2)] for w, h in zip(ws_, dsm(X, Z))]
    for name, w in {"ridge": 0.0, "ridge_n05": -0.5, "ridge_s05": 0.5, "aisle_n": -3.4, "aisle_s": 3.4}.items():
        us_ = np.arange(-3.0, 22.01, 0.25); X, Z = city(us_, np.full_like(us_, w))
        prof[name] = [[round(float(u), 2), round(float(h), 2)] for u, h in zip(us_, dsm(X, Z))]

    def stats(u0, u1, w0, w1):
        U, W = np.meshgrid(np.arange(u0, u1 + 1e-6, 0.25), np.arange(w0, w1 + 1e-6, 0.25))
        X, Z = city(U, W); v = dsm(X, Z)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    parts = {"nave_ridge": stats(1.0, 9.0, -0.3, 0.3), "aisle_n": stats(1.0, 9.0, -3.8, -3.0), "aisle_s": stats(1.0, 9.0, 3.0, 3.8),
             "belfry": stats(1.0, 4.5, -1.2, 1.2), "choir_ridge": stats(12.0, 15.0, -0.3, 0.3)}
    for k, v in parts.items(): print(f"roof {k:12s} {v}")

    ground = {}
    allfp = [p for v in L.values() for p in v]
    umin, umax = min(p[0] for p in allfp), max(p[0] for p in allfp)
    for name, pts in {"west": [(-1.0, w) for w in np.arange(-4.0, 4.1, 1.0)], "east": [(umax + 1.0, w) for w in np.arange(-3.0, 3.1, 1.0)],
                      "north": [(u, -5.2) for u in np.arange(0.0, umax, 1.0)], "south": [(u, 5.2) for u in np.arange(0.0, umax, 1.0)],
                      "door": [(-1.5, 0.0), (-2.5, 0.0), (-3.5, 0.0)]}.items():
        X, Z = city(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))
        g = dtm(X, Z); ground[name] = dict(min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2))
    print("ground (DTM):", ground)

    gx0, gz0, step = math.floor(ox - 100.0), math.floor(oz - 100.0), 0.5
    xs = np.arange(gx0, gx0 + 200.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 200.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    G = dtm(Xg, Zg)
    (np.round((G - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); openings / details from the photos (data/raw/refs/stalle/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW",
                           origin_city=[round(ox, 3), round(oz, 3)], rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): along the chapel axis, west front -> chevet; w = (-sin r, cos r): the south side"),
                solids=sol, footprint_local=L, roof=parts, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-4.0, 22.01, 0.5)
        print("        " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-7.0, 12.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:6.1f}  " + "".join(f"{h - 30:5.1f}" for h in dsm(X, Z)))
        print("DTM - 30")
        for w in np.arange(-7.0, 12.01, 1.0):
            X, Z = city(us_[::2], np.full_like(us_[::2], w))
            print(f"{w:6.1f}  " + "".join(f"{h - 30:10.2f}" for h in dtm(X, Z)))


if __name__ == "__main__":
    main()
