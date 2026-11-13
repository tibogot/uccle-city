"""EGLISE NOTRE-DAME DU ROSAIRE (Uccle, wikidata Q3580420; 1930s, rubble-stone, a tall north-east tower): the
measurements the scripted model is built from (same method as tools/russian_measure.py).

    python tools/rosaire_measure.py [--dump]          (numpy, tifffile, pyproj; reads data/tiles + data/raw)

Writes models/rosaire/site.json (+ site_dtm.bin/.json) for tools/blender/rosaire.py, the city and the checks:
  - the UrbIS 3D building solid the model replaces (tile I2, CC0): solid 542948, BU_ID building/1720868 (OSM way
    224918682 "Eglise Notre-Dame du Rosaire", ref:UrbIS 7605777);
  - the BUILDING FRAME: u along the nave (the north front -> the south apse), w to its right (WEST), origin = the
    middle of the front between the side walls (OSM outline = the wall faces);
  - the UrbIS solid's LoD2 levels and the DSM 2021 (0.5 m) peaks; the ground along every side (DTM 2021);
  - the ground patch around the church for the AO bake: DTM, u16 centimetres above 90 m TAW.
City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (south), heights m TAW.
"""
import json, math, os, sys, struct
from pathlib import Path
import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
for cand in (ROOT.parent / "uccle-city" / "data" / "raw", ROOT.parent.parent.parent / "data" / "raw"):
    if not (RAW / "urbis").exists() and (cand / "urbis").exists(): RAW = cand
OUT = ROOT / "models" / "rosaire"
OUT.mkdir(parents=True, exist_ok=True)
SHEET = "149166"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
TILE, SOLID = "I2", "542948"
OSM_WAY = 224918682
GROUND_BASE = 90.0
# the frame: the side walls' direction (OSM west wall (1268.96,-1247.67)->(1278.84,-1207.63), east wall
# (1291.26,-1249.21)->(1300.06,-1213.28): 76.1 deg) and the front line (the gable wall between the towers)
AXIS_DEG = 76.15
WEST_PT, EAST_PT, FRONT_PT = (1268.96, -1247.67), (1291.26, -1249.21), (1278.6, -1253.95)


def osm_outline():
    from pyproj import Transformer
    t = Transformer.from_crs(4326, 31370, always_xy=True)
    d = json.load(open(RAW / "osm" / "area.json", encoding="utf8"))
    nodes = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
    w = next(e for e in d["elements"] if e["type"] == "way" and e["id"] == OSM_WAY)
    pts = [t.transform(nodes[n]["lon"], nodes[n]["lat"]) for n in w["nodes"]][:-1]
    return [[round(e - ORIGIN_E, 3), round(ORIGIN_N - n, 3)] for e, n in pts]


def solid():
    B = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json"))
    b = next(b for b in B["buildings"] if b["id"].endswith("/" + SOLID))
    raw = open(ROOT / "data" / "tiles" / TILE / "buildings.bin", "rb").read()
    V, T = struct.unpack("<II", raw[:8])
    pos = np.frombuffer(raw, np.float32, 3 * V, 8).reshape(-1, 3)
    idx = np.frombuffer(raw, np.uint32, 3 * T, 8 + 12 * V).reshape(-1, 3)
    f = b["roof"]["first"]; n = b["roof"]["count"] + b["walls"]["count"]
    return b, pos[idx[f:f + n]]


def read(kind):
    sub = next(p for p in (RAW / "urbis" / kind).iterdir() if p.is_dir() and SHEET in p.name)
    a = tifffile.imread(next(sub.glob("*.tif"))).astype(np.float64)
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


def main():
    b, tris = solid()
    osm = osm_outline()
    ang = math.radians(AXIS_DEG); ca, sa = math.cos(ang), math.sin(ang)
    # origin: on the front line, half-way between the side walls
    wv = lambda p: -p[0] * sa + p[1] * ca; uv_ = lambda p: p[0] * ca + p[1] * sa
    wm = (wv(WEST_PT) + wv(EAST_PT)) / 2; um = uv_(FRONT_PT)
    ox, oz = um * ca - wm * sa, um * sa + wm * ca
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    L_osm = [[round(v, 3) for v in loc(x, z)] for x, z in osm]
    L_urb = [[round(v, 3) for v in loc(x, z)] for x, z in b["footprint"][0]]
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(ang):.2f} deg")
    print("OSM (u, w):"); [print(f"  {u:7.2f} {w:7.2f}") for u, w in L_osm]
    print("UrbIS (u, w):"); [print(f"  {u:7.2f} {w:7.2f}") for u, w in L_urb]

    P = tris.reshape(-1, 3)
    U = np.array([loc(x, z) for x, z in P[:, [0, 2]]])
    levels = []
    for y in sorted(set(np.round(P[:, 1], 2))):
        m = np.abs(P[:, 1] - y) < 0.006
        uu, ww = U[m, 0], U[m, 1]
        levels.append(dict(h=float(y), n=int(m.sum()), u=[round(float(uu.min()), 2), round(float(uu.max()), 2)], w=[round(float(ww.min()), 2), round(float(ww.max()), 2)]))
    for l in levels: print(f"  level {l['h']:6.2f}  n {l['n']:4d}  u {l['u']}  w {l['w']}")
    top = P[np.argmax(P[:, 1])]; tu, tw = loc(top[0], top[2])
    print(f"solid top {top[1]:.2f} at (u {tu:.2f}, w {tw:.2f})")
    dsm_a, dsm_t = read("dsm"); dtm_a, dtm_t = read("dtm")
    dsm, dtm = sampler(dsm_a, dsm_t), sampler(dtm_a, dtm_t)
    def peak(u, w, rad):
        us_, ws_ = np.meshgrid(np.arange(u - rad, u + rad + 1e-6, 0.1), np.arange(w - rad, w + rad + 1e-6, 0.1))
        X, Z = city(us_, ws_); v = dsm(X, Z); i = np.argmax(v)
        return dict(max=round(float(v.max()), 2), at=[round(float(us_.ravel()[i]), 2), round(float(ws_.ravel()[i]), 2)])
    peaks = {"tower": peak(float(tu), float(tw), 3.0)}
    print("DSM peaks:", peaks)
    def stats(u0, u1, w0, w1):
        UU, WW = np.meshgrid(np.arange(u0, u1 + 1e-6, 0.25), np.arange(w0, w1 + 1e-6, 0.25))
        X, Z = city(UU, WW); v = dsm(X, Z)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    roof = {"nave_ridge": stats(8.0, 40.0, -0.5, 0.5), "nave": stats(8.0, 40.0, -10.0, 10.0)}
    print("roof DSM:", roof)
    ground = {}
    for name, pts in {"front": [(-1.5, w) for w in np.arange(-12.0, 12.1, 1.0)], "porch": [(-2.0, 0.0), (-4.0, 0.0), (-6.0, 0.0)],
                      "west": [(u, 12.5) for u in np.arange(0.0, 46.0, 2.0)], "east": [(u, -12.5) for u in np.arange(0.0, 46.0, 2.0)],
                      "south": [(58.0, w) for w in np.arange(-8.0, 8.1, 1.0)]}.items():
        X, Z = city(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))
        g = dtm(X, Z); ground[name] = dict(min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2))
    print("ground (DTM):", ground)

    cxm, czm = city(28.0, 0.0)
    gx0, gz0, step = math.floor(cxm - 75.0), math.floor(czm - 75.0), 0.5
    xs = np.arange(gx0, gx0 + 150.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 150.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    Gd = dtm(Xg, Zg)
    (np.round((Gd - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(Gd.min()), 2), max=round(float(Gd.max()), 2)), open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0), OSM way 225781830 (ODbL); details from photos (docs/landmarks/CHURCHES2.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW",
                           origin_city=[round(ox, 3), round(oz, 3)], rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): along the nave, north front -> south apse; w = (-sin r, cos r): the west side"),
                solids={"church": dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, base=b["base"], eaves=b["eaves"], top=b["top"])},
                footprint_local={"osm": L_osm, "urbis": L_urb},
                urbis_levels=levels, solid_top=dict(h=round(float(top[1]), 2), uw=[round(float(tu), 2), round(float(tw), 2)]),
                dsm_peaks=peaks, roof=roof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-10.0, 62.01, 1.0)
        print("DSM - 100, rows w, columns u")
        print("       " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-16.0, 16.01, 1.0):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:6.1f} " + "".join(f"{h - 100:5.0f}" for h in dsm(X, Z)))


if __name__ == "__main__":
    main()
