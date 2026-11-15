"""LANDMARK CHURCHES ROUND 5 (branch claude/landmark5): the measurements the scripted models are built from (same method as
tools/rosaire_measure.py / russian_measure.py), for

    sacrecoeur  Eglise du Sacre-Coeur / Heilig Hartkerk, Rue Vanderkindere (Uccle, wikidata Q62570896; 1952):
                OSM way 226396246 (ref:UrbIS 7598015), UrbIS solid 729884 (BU_ID building/1712839), tile F1
    saintmarc   Eglise Saint-Marc / Sint-Markuskerk, Avenue De Fre 76 (Uccle, wikidata Q62570700; inaugurated 1970):
                OSM way 225781790 (ref:UrbIS 7605637), UrbIS solid 548515 (BU_ID building/1719656), tile G3

    python tools/landmark5_measure.py sacrecoeur|saintmarc [--dump]      (numpy, tifffile, pyproj; reads data/tiles + data/raw)

Writes models/<name>/site.json (+ site_dtm.bin/.json, site_dsm.bin/.json) for tools/blender/<name>.py, the city and the checks:
  - the UrbIS 3D solid the model replaces (CC0) and its LoD2 levels;
  - the BUILDING FRAME: u along the main axis (the entrance front -> the back), w to its right seen from the entrance
    (the same handedness as Rosaire: P(u, w, h) = Blender (u, -w, h - OY)); origin = the middle of the entrance front;
  - the DSM 2021 (0.5 m) on a 0.25 m building-frame grid (site_dsm: the model's heights are checked against it) and the
    ground patch round the church (DTM; u16 centimetres above 90 m TAW) for the AO bake and the joins.
The UrbIS rasters come in 1 km sheets: points are sampled from the sheet they fall in (a church on a sheet border).
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
ORIGIN_E, ORIGIN_N = 148643.0, 165394.0
GROUND_BASE = 90.0

CHURCHES = {
    # the frame: the axis from the OSM side walls (east (-253.62,-1626.12)->(-251.15,-1571.73) 87.40 deg, west
    # (-273.87,-1627.86)->(-272.29,-1597.41) 87.03 deg) and the DSM ridge line (fitted below); origin on the nave's
    # front wall (OSM (-269.79,-1630.35)->(-257.66,-1631.06)) half-way between its ends. u: north front -> south choir.
    "sacrecoeur": dict(way=226396246, tile="F1", solid="729884", axis_deg=87.2, front=((-269.79, -1630.35), (-257.66, -1631.06)),
                       name="Eglise du Sacre-Coeur (Heilig Hartkerk), Rue Vanderkindere", box=(-12.0, 72.0, -22.0, 22.0)),
    # the square church: the axis from the OSM long walls; the entrance front faces north-east onto Avenue De Fre (set
    # after the first dump, see SAINTMARC.md)
    # the square church (1970): u from the entrance front on Avenue De Fre (south) to the back (north), w to the EAST;
    # the axis from the OSM back wall (437.63,-645.67)->(467.40,-644.43) (2.39 deg) turned to point north; origin on the
    # front line (OSM (441.21,-620.17)->(467.16,-619.14)) half-way
    "saintmarc": dict(way=225781790, tile="G3", solid="548515", axis_deg=-87.61, front=((441.21, -620.17), (467.16, -619.14)),
                      name="Eglise Saint-Marc (Sint-Markuskerk), Avenue De Fre", box=(-14.0, 40.0, -24.0, 24.0), base=50.0),
    # castle1 (branch claude/castle1): the Chateau Latour de Frein, Rue Engeland 555 (1899-1903, Henri Maquet, neo-Renaissance;
    # Ucclensia 221): the long front faces north-north-east onto the drive from Rue Engeland. The axis from the OSM front
    # walls (29.5 deg: 81.02,2301.06 -> 102.39,2313.14 and 114.39,2320.11 -> 135.74,2332.18) turned to point INTO the
    # building (119.5 deg); origin on the central avant-corps' front (OSM 106.22,2306.41 -> 118.29,2313.25) half-way.
    "latourdefrein": dict(way=30498629, tile="G9", solid="538562", axis_deg=119.5, front=((106.219, 2306.412), (118.292, 2313.245)),
                          name="Chateau Latour de Frein, Rue Engeland 555", box=(-16.0, 58.0, -44.0, 44.0)),
}


def osm_outline(way):
    from pyproj import Transformer
    t = Transformer.from_crs(4326, 31370, always_xy=True)
    d = json.load(open(RAW / "osm" / "area.json", encoding="utf8"))
    nodes = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
    w = next(e for e in d["elements"] if e["type"] == "way" and e["id"] == way)
    pts = [t.transform(nodes[n]["lon"], nodes[n]["lat"]) for n in w["nodes"]][:-1]
    return [[round(e - ORIGIN_E, 3), round(ORIGIN_N - n, 3)] for e, n in pts]


def solid(tile, sid):
    B = json.load(open(ROOT / "data" / "tiles" / tile / "buildings.json"))
    b = next(b for b in B["buildings"] if b["id"].endswith("/" + sid))
    raw = open(ROOT / "data" / "tiles" / tile / "buildings.bin", "rb").read()
    V, T = struct.unpack("<II", raw[:8])
    pos = np.frombuffer(raw, np.float32, 3 * V, 8).reshape(-1, 3)
    idx = np.frombuffer(raw, np.uint32, 3 * T, 8 + 12 * V).reshape(-1, 3)
    f = b["roof"]["first"]; n = b["roof"]["count"] + b["walls"]["count"]
    return b, pos[idx[f:f + n]]


_sheets = {}
def sheet(kind, name):
    k = (kind, name)
    if k not in _sheets:
        sub = next(p for p in (RAW / "urbis" / kind).iterdir() if p.is_dir() and name in p.name)
        a = tifffile.imread(next(sub.glob("*.tif"))).astype(np.float64)
        _sheets[k] = (a, [float(v) for v in open(next(sub.glob("*.tfw"))).read().split()])
    return _sheets[k]


def sample(kind, x, z):
    """bilinear, each point from the 1 km sheet it falls in"""
    x, z = np.asarray(x, float), np.asarray(z, float)
    E = x + ORIGIN_E; N = ORIGIN_N - z
    out = np.full(np.shape(x), np.nan)
    keys = (np.floor(E / 1000).astype(int) * 1000 + np.floor(N / 1000).astype(int))
    for key in np.unique(keys):
        m = keys == key
        a, t = sheet(kind, f"{key // 1000}{key % 1000:03d}")
        c = (E[m] - t[4]) / t[0] - 0.5
        r = (t[5] - N[m]) / -t[3] - 0.5
        c0 = np.clip(np.floor(c).astype(int), 0, a.shape[1] - 2); r0 = np.clip(np.floor(r).astype(int), 0, a.shape[0] - 2)
        fc, fr = np.clip(c - c0, 0, 1), np.clip(r - r0, 0, 1)
        out[m] = (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return out


def main():
    name = sys.argv[1]
    C = CHURCHES[name]
    global GROUND_BASE
    GROUND_BASE = C.get("base", GROUND_BASE)       # u16 centimetres above this (the ground at Saint-Marc is ~67 m TAW)
    OUT = ROOT / "models" / name; OUT.mkdir(parents=True, exist_ok=True)
    b, tris = solid(C["tile"], C["solid"])
    osm = osm_outline(C["way"])
    ang = math.radians(C["axis_deg"] if C["axis_deg"] is not None else 0.0); ca, sa = math.cos(ang), math.sin(ang)
    if C["front"]:
        (ax_, az_), (bx_, bz_) = C["front"]; ox, oz = (ax_ + bx_) / 2, (az_ + bz_) / 2
    else:
        ox, oz = np.mean([p[0] for p in osm]), np.mean([p[1] for p in osm])
    loc = lambda x, z: ((x - ox) * ca + (z - oz) * sa, -(x - ox) * sa + (z - oz) * ca)
    city = lambda u, w: (ox + u * ca - w * sa, oz + u * sa + w * ca)
    L_osm = [[round(v, 3) for v in loc(x, z)] for x, z in osm]
    L_urb = [[round(v, 3) for v in loc(x, z)] for x, z in b["footprint"][0]]
    print(f"{name}: frame origin city ({ox:.3f}, {oz:.3f}), rotation {math.degrees(ang):.2f} deg")
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
    print(f"solid top {top[1]:.2f} at (u {tu:.2f}, w {tw:.2f}); base {b['base']} eaves {b['eaves']}")

    # the DSM on the building-frame grid
    u0, u1, w0, w1 = C["box"]; st = 0.25
    us_, ws_ = np.arange(u0, u1 + 1e-6, st), np.arange(w0, w1 + 1e-6, st)
    UU, WW = np.meshgrid(us_, ws_)
    X, Z = city(UU, WW)
    D = sample("dsm", X, Z); Gr = sample("dtm", X, Z)
    (np.round((D - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dsm.bin")
    json.dump(dict(source="UrbIS DSM 2021 (CC0), 0.5 m, bilinear, on the building frame", u0=u0, w0=w0, step=st, cols=len(us_), rows=len(ws_),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (w rows, u columns)"),
              open(OUT / "site_dsm.json", "w"), indent=1)
    # ridge lines: the sub-sample DSM maximum across each u row (where the roof is above 112)
    ridge = []
    for j, u in enumerate(us_):
        col = D[:, j]; k = int(np.nanargmax(col))
        if col[k] > (Gr[:, j].min() + 10) and 0 < k < len(col) - 1:
            a_, b_, c_ = col[k - 1], col[k], col[k + 1]; den = a_ - 2 * b_ + c_
            off = 0.5 * (a_ - c_) / den if abs(den) > 1e-9 else 0.0
            ridge.append((round(float(u), 2), round(float(ws_[k] + off * st), 3), round(float(b_), 2)))
    if "--dump" in sys.argv:
        print("ridge (u, w, h):"); [print("  ", r) for r in ridge[::4]]
        uu = np.arange(u0, u1 + 1e-6, 1.0)
        print("DSM - 100 (rows w, columns u)")
        print("       " + "".join(f"{u:5.0f}" for u in uu))
        for w in np.arange(w0, w1 + 1e-6, 1.0):
            X1, Z1 = city(uu, np.full_like(uu, w))
            print(f"{w:6.1f} " + "".join(f"{h - 100:5.1f}" if h > 99 else "    ." for h in sample("dsm", X1, Z1)))
        print("DTM - 100 (rows w, columns u)")
        for w in np.arange(w0, w1 + 1e-6, 2.0):
            X1, Z1 = city(uu, np.full_like(uu, w))
            print(f"{w:6.1f} " + "".join(f"{h - 100:5.1f}" for h in sample("dtm", X1, Z1)))

    # the ground patch (AO bake, contact)
    cxm, czm = city((u0 + u1) / 2, 0.0)
    gx0, gz0, step = math.floor(cxm - 75.0), math.floor(czm - 75.0), 0.5
    xs = np.arange(gx0, gx0 + 150.0 + 1e-6, step); zs = np.arange(gz0, gz0 + 150.0 + 1e-6, step)
    Xg, Zg = np.meshgrid(xs, zs)
    Gd = sample("dtm", Xg, Zg)
    (np.round((Gd - GROUND_BASE) * 100).astype("<u2")).tofile(OUT / "site_dtm.bin")
    json.dump(dict(source="UrbIS DTM 2021 (CC0), 0.5 m, bilinear", x0=gx0, z0=gz0, step=step, cols=len(xs), rows=len(zs),
                   base=GROUND_BASE, encoding=f"u16le, centimetres above {GROUND_BASE} m TAW, row-major (z rows, x columns)",
                   min=round(float(Gd.min()), 2), max=round(float(Gd.max()), 2)), open(OUT / "site_dtm.json", "w"), indent=1)
    site = dict(source=f"UrbIS 3D BuildingSolids + DSM/DTM 2021 0.5 m (paradigm.brussels, CC0), OSM way {C['way']} (ODbL); details from photos (docs/landmarks/{name.upper()}.md)",
                name=C["name"],
                frame=dict(city="city local: x = L72 E - 148643, z = 165394 - N; heights m TAW",
                           origin_city=[round(ox, 3), round(oz, 3)], rotation_rad=round(ang, 6), rotation_deg=round(math.degrees(ang), 3),
                           axes="u = (cos r, sin r) in city (x, z): from the entrance front to the back; w = (-sin r, cos r)"),
                solids={"church": dict(id=b["id"], bu=b["attrs"].get("BU_ID"), tile=C["tile"], base=b["base"], eaves=b["eaves"], top=b["top"])},
                footprint_local={"osm": L_osm, "urbis": L_urb},
                urbis_levels=levels, solid_top=dict(h=round(float(top[1]), 2), uw=[round(float(tu), 2), round(float(tw), 2)]),
                ridge_dsm=ridge[::2])
    json.dump(site, open(OUT / "site.json", "w"), indent=1)


if __name__ == "__main__":
    main()
