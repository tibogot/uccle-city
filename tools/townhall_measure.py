"""UCCLE TOWN HALL (Maison communale, Place Jean Vander Elst 29): the measurements the scripted model is built from.

    python tools/townhall_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/townhall/site.json (+ site_dtm.bin/.json) for tools/blender/townhall.py, the lab and the city:
  - the UrbIS 3D building solid the model replaces (solid 547183, BU_ID building/1596445, tile D3, CC0): footprint,
    base / eaves / top;
  - the BUILDING FRAME: the plan's orientation (length-weighted mean of the footprint edges, mod 90 deg) and its axis of
    symmetry (the east portico, the north and south wings and the north-west / south-west blocks are mirror images:
    the footprint's offsets averaged in pairs give the idealised plan below, every number read from the footprint);
  - the roof levels measured in the UrbIS DSM 2021 (0.5 m, CC0) inside each roof part (p50 / p90 / max, eroded 0.75 m),
    the mansard profiles (DSM across each eave, in the building frame) and the ground (UrbIS DTM 2021) along every facade;
  - the ground patch around the building for the lab and the AO bake: DTM, u16 centimetres above 50 m TAW.
--dump: prints the DSM on a building-frame grid (u east, w south, 0.5 m) for checking the roof parts.

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
OUT = ROOT / "models" / "townhall"
OUT.mkdir(parents=True, exist_ok=True)
SHEET = "147165"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
SOLID = "547183"
TILE = "D3"


def load_solid():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json"))
    for b in d["buildings"]:
        if b["id"].split("/")[-1] == SOLID:
            return dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                        base=b["base"], eaves=b["eaves"], top=b["top"])
    sys.exit("solid not found")


def read_sheet(kind):
    d = RAW / "urbis" / kind
    sub = next(p for p in d.iterdir() if p.is_dir() and SHEET in p.name)
    tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
    return tifffile.imread(tif).astype(np.float64), tfw


def sampler(a, tfw):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - tfw[4]) / tfw[0]
        r = (tfw[5] - (ORIGIN_N - z)) / -tfw[3]
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = c - c0, r - r0
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def frame_of(fp):
    """orientation (rad) of the plan: length-weighted mean edge direction mod 90 deg"""
    s = c = 0.0
    for i in range(len(fp)):
        (ax, az), (bx, bz) = fp[i], fp[(i + 1) % len(fp)]
        L = math.hypot(bx - ax, bz - az); t = 4 * math.atan2(bz - az, bx - ax)
        s += L * math.sin(t); c += L * math.cos(t)
    return math.atan2(s, c) / 4


def main():
    solid = load_solid()
    fp = solid["footprint"]
    ang = frame_of(fp)
    ca, sa = math.cos(ang), math.sin(ang)
    # first guess of the origin, then the axis of symmetry (w) from the mirror pairs, the u origin = mid of u extremes
    ox, oz = sum(p[0] for p in fp) / len(fp), sum(p[1] for p in fp) / len(fp)
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    L = [loc(*p) for p in fp]
    ws = sorted(w for _, w in L); us = sorted(u for u, _ in L)
    w_axis = (ws[0] + ws[-1]) / 2; u_mid = (us[0] + us[-1]) / 2
    ox, oz = ox + u_mid * ca - w_axis * sa, oz + u_mid * sa + w_axis * ca
    L = [loc(*p) for p in fp]
    print(f"frame: origin city ({ox:.2f}, {oz:.2f}), rotation {math.degrees(ang):.2f} deg (u = east along the wings, w = south)")
    for u, w in L: print(f"  {u:7.2f} {w:7.2f}")
    # idealised symmetric plan: pairs (w, -w) averaged; the offsets named by what they are
    def near(u0, tol=0.6): return [w for u, w in L if abs(u - u0) < tol]
    absw = lambda vals: round(float(np.mean([abs(v) for v in vals])), 2)
    u_e = round(float(np.median([u for u, w in L if u > 12 and u < 13])), 2)                    # east facade
    u_por = round(float(np.max([u for u, w in L])), 2)                                           # portico front
    w_por = absw([w for u, w in L if u > 13])
    w_main = absw([w for u, w in L if 7 < u < 13 and 10 < abs(w) < 12.5])                        # main block half width
    u_wing = (round(float(np.mean([u for u, w in L if abs(w) > 15 and u < 0])), 2), round(float(np.mean([u for u, w in L if abs(w) > 15 and u > 0])), 2))
    w_wing = absw([w for u, w in L if abs(w) > 15])
    u_blk = (round(float(np.mean([u for u, w in L if u < -10 and 12.5 < abs(w) < 14.5])), 2), round(float(np.mean([u for u, w in L if -7 < u < -5 and 12.5 < abs(w) < 14.5])), 2))
    w_blk = absw([w for u, w in L if u < -5 and 12.5 < abs(w) < 14.5])
    u_w = u_blk[0]
    u_wpav = round(float(np.min([u for u, w in L])), 2)
    w_wpav = absw([w for u, w in L if u < -13.5])
    plan = dict(u_east=u_e, u_portico=u_por, w_portico=w_por, w_main=w_main, u_wing=list(u_wing), w_wing=w_wing,
                u_block=list(u_blk), w_block=w_blk, u_west=u_w, u_west_pavilion=u_wpav, w_west_pavilion=w_wpav)
    print("plan (building frame, m):", plan)

    dsm_a, dsm_t = read_sheet("dsm"); dtm_a, dtm_t = read_sheet("dtm")
    dsm, dtm = sampler(dsm_a, dsm_t), sampler(dtm_a, dtm_t)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)

    def stats(u0, u1, w0, w1, er=0.75):
        U, W = np.meshgrid(np.arange(u0 + er, u1 - er + 1e-6, 0.25), np.arange(w0 + er, w1 - er + 1e-6, 0.25))
        X, Z = city(U, W); v = dsm(X, Z)
        return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p90", 90), ("max", 100))}
    # roof parts (the DSM shows each as its own level: banded roof_dsm.png in data/raw/refs/townhall/analysis)
    wm, ww, wb = plan["w_main"], plan["w_wing"], plan["w_block"]
    parts = {
        "core_terrasson": stats(-6.5, 7.0, -wm + 3, wm - 3),
        "east_pavilion_top": stats(7.6, 11.0, -3.6, 3.6, 0.2),
        "west_pavilion": stats(u_wpav, -6.5, -plan["w_west_pavilion"], plan["w_west_pavilion"], 0.5),
        "wing_n": stats(u_wing[0], u_wing[1], -ww, -wm, 0.6),
        "wing_s": stats(u_wing[0], u_wing[1], wm, ww, 0.6),
        "block_nw": stats(u_blk[0], u_blk[1], -wb, -plan["w_west_pavilion"], 0.6),
        "block_sw": stats(u_blk[0], u_blk[1], plan["w_west_pavilion"], wb, 0.6),
        "portico": stats(u_e, u_por, -w_por, w_por, 0.25),
    }
    for k, v in parts.items(): print(f"roof {k:18s} {v}")
    # mansard profiles: DSM along u (east facade, centre bays and outer bays) and along w (north / south wings)
    prof = {}
    for name, (u0, u1, w) in {"east_centre": (2.0, 15.0, 0.0), "east_outer_n": (2.0, 15.0, -8.0), "east_outer_s": (2.0, 15.0, 8.0),
                              "west_centre": (-16.0, -2.0, 0.0)}.items():
        us_ = np.arange(u0, u1 + 1e-6, 0.25); X, Z = city(us_, np.full_like(us_, w))
        prof[name] = [[round(float(u), 2), round(float(h), 2)] for u, h in zip(us_, dsm(X, Z))]
    for name, (w0, w1, u) in {"north_wing": (-19.0, -8.0, 2.5), "south_wing": (8.0, 19.0, 2.5), "north_core": (-15.0, -4.0, 10.0),
                              "south_core": (4.0, 15.0, 10.0)}.items():
        ws_ = np.arange(w0, w1 + 1e-6, 0.25); X, Z = city(np.full_like(ws_, u), ws_)
        prof[name] = [[round(float(w), 2), round(float(h), 2)] for w, h in zip(ws_, dsm(X, Z))]
    # ground along every facade (1 m out), DTM
    ground = {}
    for name, pts in {"east": [(u_e + 1.0, w) for w in np.arange(-wm, wm + 0.1, 1.0)], "west": [(u_wpav - 1.0, w) for w in np.arange(-wb, wb + 0.1, 1.0)],
                      "north": [(u, -ww - 1.0) for u in np.arange(u_blk[0], u_wing[1] + 0.1, 1.0)], "south": [(u, ww + 1.0) for u in np.arange(u_blk[0], u_wing[1] + 0.1, 1.0)]}.items():
        X, Z = city(np.array([p[0] for p in pts]), np.array([p[1] for p in pts]))
        g = dtm(X, Z); ground[name] = dict(min=round(float(g.min()), 2), max=round(float(g.max()), 2), mean=round(float(g.mean()), 2))
    print("ground (DTM 1 m out):", ground)
    # ground patch for the lab and the AO bake (city axes)
    gx0, gz0, gx1, gz1, step = ox - 110.0, oz - 110.0, ox + 110.0, oz + 110.0, 0.5
    gx0, gz0 = math.floor(gx0), max(math.floor(gz0), ORIGIN_N - 165999.0)   # sheet 147165 ends at N 166000 (z -606)
    gx1, gz1 = gx0 + 220.0, gz0 + 220.0
    xs = np.arange(gx0, gx1 + 1e-6, step); zs = np.arange(gz0, gz1 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    G = dtm(Xg, Zg)
    (np.round((G - 50.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=50.0, encoding="u16le, centimetres above 50 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); bays / storeys / details from the photos (data/raw/refs/townhall/SOURCES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW",
                           origin_city=[round(ox, 3), round(oz, 3)], rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): east along the wings; w = (-sin r, cos r): south; symmetric about w = 0"),
                solid=solid, footprint_local=[[round(u, 2), round(w, 2)] for u, w in L], plan=plan, roof=parts, profiles=prof, ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-15.0, 15.01, 0.5)
        print("        " + "".join(f"{u:6.1f}" for u in us_))
        for w in np.arange(-17.0, 17.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:6.1f}  " + "".join(f"{h:6.1f}" for h in dsm(X, Z)))


if __name__ == "__main__":
    main()
