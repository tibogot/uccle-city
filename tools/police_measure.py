"""UCCLE POLICE STATION (Commissariat Central "Marlow", Rue Rouge 17, police zone 5342): the measurements the scripted
model (tools/blender/police_rouge.py), the lab and the city are built from.

    python tools/police_measure.py [--dump] [--yard]       (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/police_rouge/site.json (+ site_dtm.bin/.json):
  - the UrbIS 3D building solids the model replaces: 528055 (the station: two flat-roofed wings, BU building/1674458)
    and 528772 (the low link behind it, the same BU), tile E4, CC0; the neighbours it touches (531654 = the school's
    stair block, kept; 528056 = the neighbour's double garage, kept) for reference;
  - the BUILDING FRAME: origin = the mean of both footprints' vertices, rotation = the plan's orientation (-34.3 deg).
    u runs north-east toward Rue Rouge (u+ = the street side, bearing 56 deg), w along the street (w+ = south-east,
    bearing 146 deg);
  - the roof read in the UrbIS DSM 2021 (0.5 m, CC0): the flat roofs' levels (p10 / p50 / p90 inside, eroded), the
    roof equipment (cells > 0.6 m above the roof's p50);
  - the ground (DTM 2021) along every facade 1 m out, and THE YARD: DTM profiles across the yard to Rue Rouge (the
    retaining wall along the sidewalk is the step in them);
  - the ground patch for the lab and the AO bake: DTM 0.5 m, u16 cm above 40 m.
--dump: the DSM on the building-frame grid (0.5 m); --yard: the DTM over the yard (0.5 m).
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
OUT = ROOT / "models" / "police_rouge"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
MAIN, LINK, TILE, SHEET = "528055", "528772", "E4", "148165"
NEIGH = ["531654", "528056"]


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
        if sid in (MAIN, LINK, *NEIGH):
            sol[sid] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=TILE, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                            base=b["base"], eaves=b["eaves"], top=b["top"])
    own = [MAIN, LINK]
    allp = [p for k in own for p in sol[k]["footprint"]]
    sx = sy = 0.0
    for k in own:
        f_ = sol[k]["footprint"]
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
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(rot):.3f} deg (u+ = north-east to Rue Rouge, w+ = south-east along it)")
    for k, L in FL.items(): print(" ", k, L)
    dsm, dtm = sampler("dsm"), sampler("dtm")

    def stats_box(u0, u1, w0, w1):
        U, W = np.meshgrid(np.arange(u0 + 0.7, u1 - 0.7, 0.1), np.arange(w0 + 0.7, w1 - 0.7, 0.1)); X, Z = city(U, W); v = dsm(X, Z)
        p50 = float(np.percentile(v, 50)); hi = v > p50 + 0.6
        return dict(p10=round(float(np.percentile(v, 10)), 2), p50=round(p50, 2), p90=round(float(np.percentile(v, 90)), 2), max=round(float(v.max()), 2),
                    equipment_m2=round(float(hi.sum()) * 0.01, 1))
    # (wing boxes from the footprint below, rounded)
    roof = dict(wing_a=stats_box(-0.2, 14.8, -6.9, 7.8), wing_b=stats_box(-4.8, 5.3, 5.7, 19.7), link=stats_box(-6.4, -0.6, 3.4, 9.5))
    for k, v in roof.items(): print("roof", k, v)

    def blobs(u0, u1, w0, w1, base):
        st = 0.25
        U, W = np.meshgrid(np.arange(u0, u1, st), np.arange(w0, w1, st)); X, Z = city(U, W); v = dsm(X, Z)
        m = v > base + 0.6; seen = np.zeros_like(m); out = []
        for i in range(m.shape[0]):
            for j in range(m.shape[1]):
                if not m[i, j] or seen[i, j]: continue
                st_ = [(i, j)]; seen[i, j] = True; cells = []
                while st_:
                    a, b = st_.pop(); cells.append((a, b))
                    for da, db in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        q, r_ = a + da, b + db
                        if 0 <= q < m.shape[0] and 0 <= r_ < m.shape[1] and m[q, r_] and not seen[q, r_]: seen[q, r_] = True; st_.append((q, r_))
                if len(cells) < 3: continue
                us = [U[a, b] for a, b in cells]; ws = [W[a, b] for a, b in cells]; hs = [v[a, b] for a, b in cells]
                out.append(dict(u=round(float(np.mean(us)), 2), w=round(float(np.mean(ws)), 2), du=round(max(us) - min(us) + st, 2), dw=round(max(ws) - min(ws) + st, 2),
                                top=round(float(max(hs)), 2), cells=len(cells)))
        return out
    equip = dict(wing_a=blobs(0.3, 14.3, -6.4, 7.3, roof["wing_a"]["p50"]), wing_b=blobs(-4.3, 4.8, 6.2, 19.2, roof["wing_b"]["p50"]))
    for k, v in equip.items():
        for e in v: print("equipment", k, e)
    ground = {}
    for k in own:
        L = FL[k]; n = len(L); out = []
        P_ = sol[k]["footprint"]
        for i in range(n):
            (u1, w1), (u2, w2) = L[i], L[(i + 1) % n]
            le = math.hypot(u2 - u1, w2 - w1); nu, nw = (w2 - w1) / le, -(u2 - u1) / le
            mu, mw = (u1 + u2) / 2, (w1 + w2) / 2
            X0, Z0 = city(mu + nu * 0.3, mw + nw * 0.3)
            if inside(X0, Z0, P_): nu, nw = -nu, -nw
            ts = np.linspace(0.0, 1.0, max(2, int(le) + 1))
            X, Z = city(u1 + (u2 - u1) * ts + nu, w1 + (w2 - w1) * ts + nw); g = dtm(X, Z)
            out.append(dict(edge=i, a=L[i], b=L[(i + 1) % n], out=[round(nu, 2), round(nw, 2)], min=round(float(g.min()), 2), max=round(float(g.max()), 2),
                            mean=round(float(g.mean()), 2), samples=[round(float(x), 2) for x in g]))
        ground[k] = out
        for g in out: print("ground", k, {kk: vv for kk, vv in g.items() if kk != "samples"})
    prof = {}
    for w in (-8.0, -4.0, 0.0, 4.0, 8.0, 10.0, 14.0, 18.0, 22.0, 26.0):
        us = np.arange(5.0, 40.01, 0.25); X, Z = city(us, np.full_like(us, w))
        prof[f"dtm_w{w:g}"] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(us, dtm(X, Z))]
        prof[f"dsm_w{w:g}"] = [[round(float(a), 2), round(float(b), 2)] for a, b in zip(us, dsm(X, Z))]
    steps = {}
    for w in (-8.0, -4.0, 0.0, 4.0, 8.0, 14.0, 18.0, 22.0):
        p = np.array(prof[f"dtm_w{w:g}"]); sel = (p[:, 0] > 21) & (p[:, 0] < 33)
        q = p[sel]; dz = np.diff(q[:, 1]); i = int(np.argmin(dz))
        steps[f"w{w:g}"] = dict(u=round(float(q[i, 0] + 0.125), 2), drop_per_25cm=round(float(dz[i]), 2), yard=round(float(q[max(0, i - 6), 1]), 2), street=round(float(q[min(len(q) - 1, i + 6), 1]), 2))
        print("yard step", w, steps[f"w{w:g}"])
    step = 0.5; gx0, gz0 = math.floor(ox - 100.0), math.floor(oz - 100.0)
    xs = np.arange(gx0, gx0 + 200.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 200.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs); G = dtm(Xg, Zg)
    if np.isnan(G).any(): sys.exit("DTM patch has holes")
    OUT.mkdir(parents=True, exist_ok=True)
    (np.round((G - 40.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=40.0, encoding="u16le, centimetres above 40 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(name="Commissariat de police d'Uccle (Commissariat Central Marlow), Rue Rouge 17, 1180 Uccle",
                source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m + Ortho 2024 (paradigm.brussels, CC0); facades looked at on Google Street View (Apr 2024, look-only, never traced or stored): models/police_rouge/NOTES.md",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z): u+ = north-east, toward Rue Rouge; w = (-sin r, cos r): w+ = south-east, along the street"),
                solids={k: s for k, s in sol.items()}, footprint_local=FL, roof=roof, equipment=equip, ground=ground, yard_steps=steps, profiles=prof)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        us_ = np.arange(-8.0, 30.01, 0.5)
        print("DSM - 40 m; cols u, rows w")
        print("      " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-12.0, 24.01, 0.5):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:5.1f} " + "".join(f"{h - 40:5.1f}" for h in dsm(X, Z)))
    if "--yard" in sys.argv:
        us_ = np.arange(10.0, 36.01, 0.5)
        print("DTM - 40 m; cols u, rows w")
        print("      " + "".join(f"{u:5.1f}" for u in us_))
        for w in np.arange(-12.0, 30.01, 1.0):
            X, Z = city(us_, np.full_like(us_, w))
            print(f"{w:5.1f} " + "".join(f"{h - 40:5.1f}" for h in dtm(X, Z)))


if __name__ == "__main__":
    main()
