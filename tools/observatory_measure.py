"""ROYAL OBSERVATORY OF BELGIUM (Uccle): the measurements the scripted model is built from.

    python tools/observatory_measure.py            (numpy, tifffile, pillow; reads data/tiles + data/raw/urbis)

Writes models/observatory/site.json (+ site_dtm.bin/.json) for tools/blender/observatory.py, the lab and the city:
  - the UrbIS 3D building solids the model replaces (city tiles H4/H5, CC0): id, BU_ID, footprint (city local x/z),
    base / eaves / top;
  - every PART of the plan below (a footprint piece with one wall height): the wall top and roof crown measured in the
    UrbIS DSM 2021 (0.5 m, CC0) inside the part (eroded 1 m: p10 / p50 / p95 / max);
  - every DOME: centre refined on the DSM, a sphere fitted to the DSM points of its cap (radius, springing height,
    top), the tower radius from the UrbIS footprint arc;
  - the ground: UrbIS DTM 2021 (0.5 m, CC0) around the campus, u16 centimetres above 60 m TAW.

City local frame (docs/CONTRACT.md): x = Lambert72 E - 148643, z = 165394 - N (south), heights m TAW.
The plan (parts, which tower carries which dome) is read from the orthophoto + DSM + the owner's photos and the
1880s plan (Van Rysselberghe), see data/raw/refs/observatory/SOURCES.md; numbers come from the data.
"""
import json, math, os, sys
from pathlib import Path
import numpy as np
import tifffile
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parent.parent
RAW = Path(os.environ.get("UCCLE_RAW", ROOT / "data" / "raw"))
if not (RAW / "urbis").exists():                     # a worktree: data/raw lives in the main checkout
    RAW = ROOT.parent.parent.parent / "data" / "raw"
OUT = ROOT / "models" / "observatory"
OUT.mkdir(parents=True, exist_ok=True)
SHEET = "149165"
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0

# ---------------------------------------------------------------------------------------------- the solids replaced
SOLIDS = {   # UrbIS buildingsolid id -> role (what it is on the campus)
    "543656": "main building (front pavilion + rear block), central axis",
    "515276": "west wing with the small equatorial tower (SW corner)",
    "609573": "medium equatorial (copper dome on a square block) + east meridian hall (barrel vault) + annexes",
    "646426": "great equatorial: block + round tower with the copper dome",
    "510692": "low connecting galleries (centre)",
    "729717": "low front gallery (west)",
    "528775": "low front gallery (east)",
    "541130": "east front pavilion",
    "516320": "east wing with two small round towers (white domes, one open)",
    "541039": "east block",
    "541038": "low annex south of the medium equatorial",
    "508133": "glazed-roof annex (no BU_ID in UrbIS)",
    "511731": "low barrel-roofed hall",
    "729655": "west front block",
    "528692": "west front wing",
    "515962": "east front wing",
    "515606": "west residence (hip roof)",
    "515963": "east residence (hip roof)",
    "515247": "west tall block",
    "515272": "west block (south)",
    "548562": "west block (wing)",
    "525982": "west pavilion with a dome",
    "508676": "south-west pavilion with a dome",
    "545137": "octagonal pavilion",
}

# ---------------------------------------------------------------------------------------------- the plan (parts)
# each part: solid, polygon (city local x, z; from the UrbIS footprint, split where the DSM roof height steps),
# roof kind: flat (zinc deck, measured level) | low (low zinc hip over a rectangle: walls to the edge level, crown) |
# hip (steep slate hip: walls to the eaves, ridge) | barrel (vault along x) | pyramid (octagon), style.
R = lambda x0, x1, z0, z1: [[x0, z0], [x1, z0], [x1, z1], [x0, z1]]
PARTS = [
    # main building: the tall front pavilion (DSM 112.6 at the walls, 114.0 crown) and the lower rear block (108.1)
    dict(id="main_front", solid="543656", poly=R(645.4, 662.5, 21.9, 45.6), roof="flat", style="hero"),   # attic to 113.9-114.5 (DSM at the front; 0003_P01)
    dict(id="main_rear", solid="543656", poly=[[645.4, 45.6], [662.5, 45.6], [662.4, 60.7], [665.4, 60.8], [665.3, 68.2], [660.4, 68.1],
                                               [660.4, 75.5], [647.4, 75.5], [647.4, 68.2], [642.6, 68.2], [642.6, 60.8], [645.6, 60.8]], roof="flat", style="hero"),
    dict(id="west_wing", solid="515276", poly=[[634.0, 74.9], [647.4, 74.9], [647.4, 75.5], [655.6, 75.5], [655.7, 106.2], [644.4, 106.3],
                                              [644.4, 110.0], [639.3, 110.0], [638.4, 104.4], [634.0, 100.9]], roof="flat", style="std"),
    dict(id="links", solid="510692", poly=None, roof="flat", style="gallery"),
    dict(id="eq_n", solid="609573", poly=[[665.0, 85.6], [674.2, 85.8], [674.2, 96.8], [665.0, 96.8]], roof="flat", style="std"),
    dict(id="eq_block", solid="609573", poly=[[661.9, 96.8], [677.0, 96.8], [677.0, 112.2], [661.9, 112.2]], roof="flat", style="hero"),
    dict(id="eq_w", solid="609573", poly=[[655.7, 102.9], [661.9, 102.9], [661.9, 106.2], [655.7, 106.2]], roof="flat", style="gallery"),
    dict(id="eq_s", solid="609573", poly=[[665.8, 112.2], [673.4, 112.2], [673.4, 120.4], [665.8, 120.4]], roof="flat", style="std"),
    dict(id="meridian", solid="609573", poly=[[677.0, 94.8], [701.1, 94.9], [701.1, 112.3], [685.8, 112.3], [685.8, 110.3], [680.6, 110.3],
                                             [680.6, 114.2], [678.2, 114.2], [678.2, 112.2], [677.0, 112.2]], roof="flat", style="std",
         barrel=dict(x0=678.6, x1=699.6, zc=103.75, span=9.4, slits=[684.5, 693.5])),
    dict(id="great_eq", solid="646426", poly=[[650.0, 155.2], [650.0, 142.9], [650.8, 142.9], [650.8, 141.2], [656.9, 141.2], [656.9, 142.9],
                                             [657.7, 142.9], [657.6, 154.8]], roof="flat", style="hero"),
    dict(id="gallery_w", solid="729717", poly=None, roof="flat", style="gallery"),
    dict(id="gallery_e", solid="528775", poly=None, roof="flat", style="gallery"),
    dict(id="pav_e", solid="541130", poly=None, roof="flat", style="std"),
    dict(id="east_wing", solid="516320", poly=None, roof="flat", style="gallery"),
    dict(id="block_e", solid="541039", poly=None, roof="flat", style="std"),
    dict(id="annex_s", solid="541038", poly=None, roof="flat", style="gallery"),
    dict(id="glazed", solid="508133", poly=None, roof="flat", style="gallery"),
    dict(id="hall_s", solid="511731", poly=None, roof="flat", style="gallery", barrel=dict(x0=681.3, x1=696.4, zc=132.4, span=6.6, low=True)),
    dict(id="front_w", solid="729655", poly=None, roof="flat", style="std"),
    dict(id="wing_w_n", solid="528692", poly=[[587.5, -30.9], [602.7, -30.9], [602.7, -21.5], [587.5, -21.5]], roof="flat", style="std"),
    dict(id="wing_w", solid="528692", poly=[[593.8, -21.5], [602.7, -21.5], [602.7, -18.8], [608.1, -18.8], [608.0, 12.7], [593.8, 12.7]], roof="flat", style="hero"),
    dict(id="wing_e_n", solid="515962", poly=[[705.1, -30.8], [721.5, -30.7], [721.5, -18.8], [705.1, -18.8]], roof="flat", style="std"),
    dict(id="wing_e", solid="515962", poly=[[699.8, -18.8], [714.1, -18.8], [714.1, 16.9], [708.8, 16.9], [708.7, 29.2], [699.8, 29.1]], roof="flat", style="hero"),
    dict(id="wing_e_s", solid="515962", poly=[[713.6, 12.3], [717.3, 12.3], [717.3, 17.3], [713.6, 17.3]], roof="flat", style="gallery"),
    dict(id="house_w", solid="515606", poly=[[572.1, -36.6], [587.5, -36.6], [587.5, -18.9], [572.1, -18.9]], roof="hip", style="std"),
    dict(id="house_e", solid="515963", poly=[[721.5, -36.5], [736.1, -36.5], [736.1, -18.7], [721.5, -18.7]], roof="hip", style="std"),
    dict(id="tall_w", solid="515247", poly=None, roof="flat", style="std"),
    dict(id="block_w", solid="515272", poly=None, roof="flat", style="std"),
    dict(id="wing_ww", solid="548562", poly=[[546.9, 56.7], [576.5, 56.7], [576.5, 70.2], [546.9, 70.2]], roof="flat", style="std"),
    dict(id="pav_w", solid="525982", poly=None, roof="flat", style="std"),
    dict(id="pav_sw", solid="508676", poly=None, roof="flat", style="std"),
    dict(id="octagon", solid="545137", poly=None, roof="pyramid", style="std"),
]
# domes: approximate centre (refined on the DSM), the tower's wall radius from the footprint arc (None: the dome sits
# on the roof of its block, drum radius = dome radius + 0.35), material and slit, from the photos + orthophoto
DOMES = [
    dict(id="great", at=(653.9, 158.3), tower=5.3, part="great_eq", mat="copper_patina", slit=False, slit_az=180),
    dict(id="medium", at=(669.6, 104.6), tower=None, part="eq_block", mat="copper_patina", slit=False, slit_az=180),
    dict(id="small", at=(638.4, 104.4), tower=4.3, part="west_wing", mat="zinc_roof", slit=False, slit_az=200),
    # the south one is open in the owner's two photos (slit towards the photographers: WSW and NW) and in the 2021
    # DSM / orthophoto (a dark slit, a dip in the cap); the north one, under trees in the data, is shown closed
    dict(id="east_open", at=(707.0, 47.6), tower=3.6, part="east_wing", mat="painted_metal_white", slit=True, slit_az=235),
    dict(id="east_n", at=(720.0, 30.0), tower=3.25, part="east_wing", mat="painted_metal_white", slit=False, slit_az=150, top_from="east_open", cone=True),   # 0003_P05: a pointed slate roof
    # the pavilions' domes are copper (inventory 0003_P06, P08: verdigris with rust streaks; the orthophoto's grey was glare)
    dict(id="pav_w", at=(574.3, 115.6), tower=None, part="pav_w", mat="copper_patina", slit=False, slit_az=180),
    dict(id="pav_sw", at=(592.7, 166.0), tower=None, part="pav_sw", mat="copper_patina", slit=False, slit_az=170),
]


def load_solids():
    out = {}
    for t in ("H4", "H5"):
        d = json.load(open(ROOT / "data" / "tiles" / t / "buildings.json"))
        for b in d["buildings"]:
            sid = b["id"].split("/")[-1]
            if sid in SOLIDS:
                out[sid] = dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=t, footprint=[[round(x, 2), round(z, 2)] for x, z in b["footprint"][0]],
                                base=b["base"], eaves=b["eaves"], top=b["top"], role=SOLIDS[sid])
    missing = set(SOLIDS) - set(out)
    if missing: sys.exit(f"missing solids {missing}")
    return out


def read_sheet(kind):
    d = RAW / "urbis" / kind
    sub = next(p for p in d.iterdir() if p.is_dir() and SHEET in p.name)
    tif = next(sub.glob("*.tif")); tfw = [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()]
    return tifffile.imread(tif).astype(np.float64), tfw


def sampler(a, tfw):
    def f(x, z):
        x, z = np.asarray(x, float), np.asarray(z, float)
        c = (x + ORIGIN_E - tfw[4]) / tfw[0]                 # tfw: pixel size, rotation x2, -pixel size, top-left pixel centre
        r = (tfw[5] - (ORIGIN_N - z)) / -tfw[3]
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = c - c0, r - r0
        return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return f


def part_stats(dsm, poly, x0=500, z0=-60, n=600):
    """DSM percentiles inside the polygon, eroded by 1 m (0.5 m grid)."""
    img = Image.new("L", (n, n), 0)
    ImageDraw.Draw(img).polygon([((x - x0) * 2, (z - z0) * 2) for x, z in poly], fill=1)
    m = np.array(img).astype(bool); e = m.copy()
    for _ in range(2): e[1:-1, 1:-1] &= e[:-2, 1:-1] & e[2:, 1:-1] & e[1:-1, :-2] & e[1:-1, 2:]
    if e.sum() < 4: e = m
    jj, ii = np.nonzero(e)
    v = dsm(x0 + ii / 2 + 0.25, z0 + jj / 2 + 0.25)
    return {k: round(float(np.percentile(v, q)), 2) for k, q in (("p10", 10), ("p50", 50), ("p95", 95), ("max", 100))}


def fit_dome(dsm, at, tower):
    """Refine the centre (the cap's centroid), then fit z = zc + sqrt(R^2 - d^2) to the cap (d < 0.7 R) by grid search."""
    x, z = at
    g = np.arange(-6, 6.01, 0.5); X, Z = np.meshgrid(x + g, z + g)
    H = dsm(X, Z); top = H.max()
    m = H > top - 2.0
    cx, cz = float(X[m].mean()), float(Z[m].mean())
    g = np.arange(-7, 7.01, 0.25); X, Z = np.meshgrid(cx + g, cz + g); H = dsm(X, Z)
    D = np.hypot(X - cx, Z - cz)
    best = None
    for Rr in np.arange(2.0, 6.51, 0.05):
        sel = D < 0.7 * Rr
        for zc in np.arange(top - Rr - 1.0, top - Rr + 1.01, 0.05):
            pred = zc + np.sqrt(np.maximum(Rr * Rr - D[sel] ** 2, 0))
            err = np.median(np.abs(pred - H[sel]))
            if best is None or err < best[0]: best = (err, Rr, zc)
    err, Rr, zc = best
    prof = [(float(r), round(float(np.median(dsm(cx + r * np.cos(np.linspace(0, 6.28, 32)), cz + r * np.sin(np.linspace(0, 6.28, 32))))), 2))
            for r in np.arange(0, 7.01, 0.5)]
    return dict(centre=[round(cx, 2), round(cz, 2)], radius=round(float(Rr), 2), springing=round(float(zc), 2), top=round(float(zc + Rr), 2),
                dsm_top=round(float(top), 2), fit_err=round(float(err), 3), profile=prof)


def main():
    solids = load_solids()
    dsm_a, dsm_t = read_sheet("dsm"); dtm_a, dtm_t = read_sheet("dtm")
    dsm, dtm = sampler(dsm_a, dsm_t), sampler(dtm_a, dtm_t)
    parts = []
    for p in PARTS:
        poly = p["poly"] or solids[p["solid"]]["footprint"]
        st = part_stats(dsm, poly)
        q = dict(p, poly=poly, dsm=st, base=solids[p["solid"]]["base"])
        xs, zs = [v[0] for v in poly], [v[1] for v in poly]
        q["ground"] = round(float(np.min(dtm(np.array(xs), np.array(zs)))), 2)
        parts.append(q)
    domes = {}
    for d in DOMES:
        f = fit_dome(dsm, d["at"], d["tower"])
        if d.get("top_from"):      # under trees: the DSM cap is the canopy; same dome as its twin
            f = dict(domes[d["top_from"]]["fit"], centre=list(d["at"]), note=f"under trees: dome as {d['top_from']}, centre from the UrbIS arc")
        domes[d["id"]] = dict(d, fit=f, ground=round(float(dtm(*d["at"])), 2))
    # ground patch for the lab and the AO bake
    gx0, gz0, gx1, gz1, step = 520.0, -60.0, 760.0, 215.0, 0.5
    xs = np.arange(gx0, gx1 + 1e-6, step); zs = np.arange(gz0, gz1 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    G = dtm(Xg, Zg)
    (np.round((G - 60.0) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source=f"UrbIS DTM 2021 (CC0), sheet {SHEET}, 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   encoding="u16le, centimetres above 60 m TAW, row-major (z rows, x columns)", min=round(float(G.min()), 2), max=round(float(G.max()), 2)),
              open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source="UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0); plan from the orthophoto, the owner's photos and the 1880s plan",
                frame="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW", solids=solids, parts=parts, domes=domes)
    json.dump(site, open(OUT / "site.json", "w"), indent=1)
    for d in domes.values():
        f = d["fit"]; print(f"dome {d['id']:10s} centre {f['centre']} R {f['radius']} springing {f['springing']} top {f['top']} (dsm {f['dsm_top']}, err {f['fit_err']})")
    for p in parts: print(f"part {p['id']:11s} base {p['base']:.2f} ground {p['ground']:.2f} dsm {p['dsm']}")


if __name__ == "__main__":
    main()
