"""VILLA VAN BUUREN (Avenue Leo Errera 41, 1928, Uccle): the measurements a scripted model would be built from.

    python tools/vanbuuren_measure.py [--dump]          (numpy, tifffile; reads data/tiles + data/raw/urbis)

PREPARATION ONLY (2026-11-10): nothing is modelled yet. Writes models/vanbuuren/site.json:
  - the UrbIS 3D building solids of the villa (tile G2, CC0): 550409 (main body) and 509389 (the taller part), with
    footprints, base / eaves / top;
  - the plan's orientation (length-weighted mean of the footprint edges, mod 90 deg) and the building frame;
  - the UrbIS DSM 2021 (0.5 m, CC0) inside each solid (p50 / p90 / max, eroded 0.5 m) and the ground (DTM 2021)
    around the footprint; --dump prints the DSM above ground on a building-frame grid (0.5 m) for reading the
    gables, ridges and the chimney.
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
OUT = ROOT / "models" / "vanbuuren"
OUT.mkdir(parents=True, exist_ok=True)
SHEET, TILE, SOLIDS = "148166", "G2", ["550409", "509389"]
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0


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


def main():
    d = json.load(open(ROOT / "data" / "tiles" / TILE / "buildings.json", encoding="utf-8"))
    solids = []
    for b in d["buildings"]:
        sid = b["id"].split("/")[-1]
        if sid in SOLIDS:
            solids.append(dict(id=b["id"], solid=sid, bu=b["attrs"].get("BU_ID"), footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                               base=b["base"], eaves=b["eaves"], top=b["top"]))
    if len(solids) != len(SOLIDS): sys.exit(f"solids not found: {SOLIDS}")
    # orientation: length-weighted edge angle mod 90
    sx = sy = 0
    for s in solids:
        fp = s["footprint"]
        for i in range(len(fp)):
            (x1, z1), (x2, z2) = fp[i], fp[(i + 1) % len(fp)]
            L = math.hypot(x2 - x1, z2 - z1); a = math.atan2(z2 - z1, x2 - x1) * 4
            sx += L * math.cos(a); sy += L * math.sin(a)
    rot = math.atan2(sy, sx) / 4
    allpts = np.array([p for s in solids for p in s["footprint"]])
    origin = allpts.mean(0)
    dsm = sampler(*read_sheet("dsm")); dtm = sampler(*read_sheet("dtm"))
    cr, sr = math.cos(rot), math.sin(rot)
    to_city = lambda u, w: (origin[0] + u * cr - w * sr, origin[1] + u * sr + w * cr)
    for s in solids:
        fp = s["footprint"]
        xs, zs = np.meshgrid(np.arange(min(p[0] for p in fp), max(p[0] for p in fp), 0.25), np.arange(min(p[1] for p in fp), max(p[1] for p in fp), 0.25))
        pts = [(x, z) for x, z in zip(xs.ravel(), zs.ravel()) if inside((x, z), fp) and dist_edge((x, z), fp) > 0.5]
        h = dsm([p[0] for p in pts], [p[1] for p in pts]) if pts else np.array([np.nan])
        s["dsm"] = dict(p50=round(float(np.percentile(h, 50)), 2), p90=round(float(np.percentile(h, 90)), 2), max=round(float(h.max()), 2), n=len(pts))
        ring = []
        for i in range(len(fp)):
            (x1, z1), (x2, z2) = fp[i], fp[(i + 1) % len(fp)]
            L = math.hypot(x2 - x1, z2 - z1)
            for t in np.arange(0, L, 1.0):
                x, z = x1 + (x2 - x1) * t / L, z1 + (z2 - z1) * t / L
                nx, nz = (z2 - z1) / L, -(x2 - x1) / L                 # one side; keep the one outside
                for sgn in (1, -1):
                    px, pz = x + sgn * nx * 1.2, z + sgn * nz * 1.2
                    if not any(inside((px, pz), o["footprint"]) for o in solids): ring.append(float(dtm(px, pz))); break
        s["ground_around"] = dict(min=round(min(ring), 2), p50=round(float(np.median(ring)), 2), max=round(max(ring), 2))
    site = dict(name="Villa van Buuren (Musee David et Alice van Buuren), Avenue Leo Errera 41, Uccle", built=1928,
                sources="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (CC0); photos: data/raw/refs/vanbuuren/SOURCES.md",
                frame=dict(origin_city=[round(origin[0], 3), round(origin[1], 3)], rotation_rad=round(rot, 6),
                           note="u along rotation, w perpendicular (city x/z rotated)"),
                solids=solids)
    json.dump(site, open(OUT / "site.json", "w", encoding="utf-8"), indent=1)
    for s in solids: print(s["solid"], "base", s["base"], "eaves", s["eaves"], "top", s["top"], "DSM", s["dsm"], "ground", s["ground_around"])
    print("rotation deg", round(math.degrees(rot), 2), "origin", origin.round(2).tolist())
    if "--dump" in sys.argv:
        us = np.arange(-16, 16.01, 0.5); ws = np.arange(-16, 16.01, 0.5)
        g = solids[0]["base"]
        print("DSM - base (m), rows w (top = -w), cols u; '.' outside both footprints")
        for w in ws:
            row = []
            for u in us:
                x, z = to_city(u, w)
                inn = any(inside((x, z), s["footprint"]) for s in solids)
                row.append(f"{dsm(x, z) - g:4.0f}" if inn else "   .")
            print(f"{w:6.1f} " + "".join(row))


if __name__ == "__main__":
    main()
