"""THE CASTLE ON THE GELEYTSBEEK: the Papenkasteel / Chateau de Stalle (Rue Papenkasteel 99, Uccle, 1685-1688, listed
16 Oct 1975, heritage inventory 27820): the measurements the scripted model is built from.

    python tools/papenkasteel_measure.py [--dump] [--png out.png]     (numpy, tifffile; reads data/tiles + data/raw/urbis)

Writes models/papenkasteel/site.json (+ site_dtm.bin/.json):
  - the UrbIS 3D building solids the model replaces (tile E7, CC0): 528339 (the house + tower + the two low annexes,
    BU_ID building/1726277) and 528019 (the outbuilding range on the south side of the courtyard, BU_ID null);
  - the BUILDING FRAME: origin = the house footprint's bbox centre in the frame, rotation = the plan's orientation
    (length-weighted edge angle mod 90): u runs along the courtyard front of the main range (u+ = north-east),
    w across (w+ = the courtyard side, south-east);
  - the roofs read in the UrbIS DSM 2021 (0.5 m, CC0) - a MOSAIC of the sheets 147164 / 148164 (the castle straddles
    E 148000: the hero_prep tool read one sheet and clamped the west half);
  - the ground (DTM 2021) along every facade, 1 m out;
  - a ground patch for the lab and the AO bake: DTM 0.5 m, u16 cm above 40 m.
--dump prints DSM - 49 m (decimetres) on the frame grid; --png writes a shaded DSM-above-ground plot with the footprints.

City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (south), heights m TAW.
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
import tifffile

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
if not (RAW / "urbis").exists():
    RAW = ROOT.parent.parent.parent / "data" / "raw"
OUT = ROOT / "models" / "papenkasteel"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
TILE = "E7"
HOUSE, RANGE = "528339", "528019"
SHEETS = ("147163", "147164", "148163", "148164")


class Mosaic:
    """Bilinear sampler over several 0.5 m UrbIS sheets (nodata < -1000 -> nan)."""
    def __init__(self, kind):
        self.parts = []
        d = RAW / "urbis" / kind
        for s in SHEETS:
            sub = next((p for p in d.iterdir() if p.is_dir() and s in p.name), None)
            if not sub: continue
            a = tifffile.imread(next(sub.glob("*.tif"))).astype(np.float64)
            a[a < -1000] = np.nan
            t = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
            self.parts.append((a, t))

    def __call__(self, x, z):
        x, z = np.broadcast_arrays(np.asarray(x, float), np.asarray(z, float))
        out = np.full(x.shape, np.nan)
        E, N = x + ORIGIN_E, ORIGIN_N - z
        for a, t in self.parts:
            c = (E - t[4]) / t[0]; r = (t[5] - N) / -t[3]
            ok = (c >= 0) & (r >= 0) & (c < a.shape[1] - 1) & (r < a.shape[0] - 1) & np.isnan(out)
            if not ok.any(): continue
            cc, rr = c[ok], r[ok]
            c0 = np.floor(cc).astype(int); r0 = np.floor(rr).astype(int); fc, fr = cc - c0, rr - r0
            out[ok] = (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
        # the half-pixel seams between sheets: the nearest pixel of a sheet within one pixel
        for a, t in self.parts:
            miss = np.isnan(out)
            if not miss.any(): break
            c = (E[miss] - t[4]) / t[0]; r = (t[5] - N[miss]) / -t[3]
            ok = (c > -1) & (r > -1) & (c < a.shape[1]) & (r < a.shape[0])
            idx = np.flatnonzero(miss)[ok]
            out.flat[idx] = a[np.clip(np.round(r[ok]).astype(int), 0, a.shape[0] - 1), np.clip(np.round(c[ok]).astype(int), 0, a.shape[1] - 1)]
        return out


def main():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json", encoding="utf-8"))
    sols = {}
    for b in d["buildings"]:
        sid = b["id"].split("/")[-1]
        if sid in (HOUSE, RANGE):
            sols[sid] = dict(id=b["id"], solid=sid, bu=b["attrs"].get("BU_ID"), tile=TILE,
                             footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]], base=b["base"], eaves=b["eaves"], top=b["top"])
    fp = sols[HOUSE]["footprint"]
    sx = sy = 0.0
    for i in range(len(fp)):
        (x1, z1), (x2, z2) = fp[i], fp[(i + 1) % len(fp)]
        L = math.hypot(x2 - x1, z2 - z1); a = 4 * math.atan2(z2 - z1, x2 - x1)
        sx += L * math.cos(a); sy += L * math.sin(a)
    rot = math.atan2(sy, sx) / 4
    ca, sa = math.cos(rot), math.sin(rot)
    ox0, oz0 = float(np.mean([p[0] for p in fp])), float(np.mean([p[1] for p in fp]))
    l0 = [((x - ox0) * ca + (z - oz0) * sa, -(x - ox0) * sa + (z - oz0) * ca) for x, z in fp]
    cu = (min(p[0] for p in l0) + max(p[0] for p in l0)) / 2; cw = (min(p[1] for p in l0) + max(p[1] for p in l0)) / 2
    ox, oz = ox0 + cu * ca - cw * sa, oz0 + cu * sa + cw * ca
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    for s in sols.values():
        s["footprint_local"] = [[round(v, 3) for v in loc(*p)] for p in s["footprint"]]
    print(f"frame: origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(rot):.3f} deg")
    for s in sols.values():
        print(s["solid"], "base", s["base"], "eaves", s["eaves"], "top", s["top"], "footprint (u, w):", s["footprint_local"])
    dsm, dtm = Mosaic("dsm"), Mosaic("dtm")
    # the DSM on the frame grid, 0.25 m, u -30..30, w -25..40
    us = np.arange(-30.0, 30.001, 0.25); ws = np.arange(-25.0, 40.001, 0.25)
    U, W = np.meshgrid(us, ws); X, Z = city(U, W)
    S = dsm(X, Z); G = dtm(X, Z)
    prof = {}
    for w in np.arange(-14.0, 16.01, 1.0):
        X1, Z1 = city(us, np.full_like(us, w))
        prof[f"along_w{w:g}"] = [round(float(v), 2) for v in dsm(X1, Z1)]
    for u in np.arange(-26.0, 26.01, 1.0):
        X1, Z1 = city(np.full_like(ws, u), ws)
        prof[f"across_u{u:g}"] = [round(float(v), 2) for v in dsm(X1, Z1)]
    ground = {}
    for sid, s in sols.items():
        FL = s["footprint_local"]; n = len(FL); cu_, cw_ = np.mean([p[0] for p in FL]), np.mean([p[1] for p in FL])
        gl = []
        for i in range(n):
            (u1, w1), (u2, w2) = FL[i], FL[(i + 1) % n]
            le = math.hypot(u2 - u1, w2 - w1)
            if le < 0.3: continue
            nu, nw = (w2 - w1) / le, -(u2 - u1) / le
            # outward: the midpoint pushed 0.3 m must be outside the polygon
            mu, mw = (u1 + u2) / 2, (w1 + w2) / 2
            if inside((mu + nu * 0.3, mw + nw * 0.3), FL): nu, nw = -nu, -nw
            ts = np.linspace(0.0, 1.0, max(2, int(le) + 1))
            X1, Z1 = city(u1 + (u2 - u1) * ts + nu, w1 + (w2 - w1) * ts + nw); g = dtm(X1, Z1)
            gl.append(dict(edge=i, a=FL[i], b=FL[(i + 1) % n], min=round(float(np.nanmin(g)), 2), max=round(float(np.nanmax(g)), 2),
                           mean=round(float(np.nanmean(g)), 2), samples=[round(float(x), 2) for x in g]))
            print(sid, "ground", {k: v for k, v in gl[-1].items() if k != "samples"})
        ground[sid] = gl
    # roof statistics inside each footprint (eroded 0.5 m)
    for sid, s in sols.items():
        FL = s["footprint_local"]
        m = np.array([[inside((u, w), FL) and dist_edge((u, w), FL) > 0.5 for u in us] for w in ws])
        v = S[m]; v = v[~np.isnan(v)]
        s["dsm"] = dict(p50=round(float(np.percentile(v, 50)), 2), p90=round(float(np.percentile(v, 90)), 2), max=round(float(v.max()), 2), n=int(v.size))
        print(sid, "DSM", s["dsm"])
    step = 0.5; gx0, gz0 = math.floor(ox - 100.0), math.floor(oz - 100.0)
    xs = np.arange(gx0, gx0 + 200.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 200.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs); GG = dtm(Xg, Zg)
    if np.isnan(GG).any(): sys.exit("DTM patch has holes")
    OUT.mkdir(parents=True, exist_ok=True)
    (np.round((GG - 40.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheets {', '.join(SHEETS)}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=40.0, encoding="u16le, centimetres above 40 m TAW, row-major (z rows, x columns)", min=round(float(GG.min()), 2), max=round(float(GG.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(name="Papenkasteel (Chateau de Stalle), Rue Papenkasteel 99, Uccle: the castle on the Geleytsbeek",
                source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); facades from the references (models/papenkasteel/NOTES.md)",
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", origin_city=[round(ox, 3), round(oz, 3)],
                           rotation_rad=round(rot, 6), rotation_deg=round(math.degrees(rot), 3),
                           axes="u = (cos r, sin r) in city (x, z); w = (-sin r, cos r)"),
                solids=list(sols.values()), profiles=dict(u=[round(float(v), 2) for v in us], w=[round(float(v), 2) for v in ws], **prof), ground=ground)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    if "--dump" in sys.argv:
        uu = np.arange(-24.0, 24.01, 0.5)
        print("DSM - 49 m (decimetres); cols u (-24..24 step 0.5), rows w")
        for w in np.arange(-16.0, 30.01, 0.5):
            X1, Z1 = city(uu, np.full_like(uu, w))
            print(f"{w:5.1f} " + "".join(f"{int(round((h - 49) * 10)):4d}" if not np.isnan(h) else "   ." for h in dsm(X1, Z1)))
    if "--png" in sys.argv:
        from PIL import Image, ImageDraw
        H = S - G
        gz_, gx_ = np.gradient(np.nan_to_num(S), 0.25)
        sh = np.clip(0.55 + (-gx_ * 0.7 - gz_ * 0.7) * 0.3, 0, 1)
        col = np.clip(H / 26, 0, 1)
        rgb = np.stack([sh * (60 + 195 * col), sh * (200 - 80 * col), sh * (220 - 200 * col)], -1)
        rgb = np.nan_to_num(rgb).astype(np.uint8)
        im = Image.fromarray(rgb).resize((len(us) * 4, len(ws) * 4), Image.NEAREST)
        dr = ImageDraw.Draw(im)
        P = lambda u, w: ((u + 30) * 16, (w + 25) * 16)
        for s in sols.values():
            FL = s["footprint_local"]; dr.line([P(*p) for p in FL + [FL[0]]], fill=(255, 0, 0), width=2)
        for u in range(-30, 31, 5): dr.line([P(u, -25), P(u, 40)], fill=(255, 255, 255) if u == 0 else (90, 90, 90)); dr.text(P(u + 0.1, -24.5), str(u), fill=(255, 255, 0))
        for w in range(-25, 41, 5): dr.line([P(-30, w), P(30, w)], fill=(255, 255, 255) if w == 0 else (90, 90, 90)); dr.text(P(-29.8, w + 0.1), str(w), fill=(255, 255, 0))
        im.save(sys.argv[sys.argv.index("--png") + 1])


def inside(pt, poly):
    x, z = pt; c = False
    for i in range(len(poly)):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1: c = not c
    return c


def dist_edge(pt, poly):
    best = 1e9
    for i in range(len(poly)):
        ax, az = poly[i]; bx, bz = poly[(i + 1) % len(poly)]
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1
        t = max(0, min(1, ((pt[0] - ax) * dx + (pt[1] - az) * dz) / L2))
        best = min(best, math.hypot(pt[0] - ax - t * dx, pt[1] - az - t * dz))
    return best


if __name__ == "__main__":
    main()
