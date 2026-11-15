"""SHRUBS AND BED PLANTS, placed per tile from data: data/plants/<T>.json (+ summary.json). Deterministic.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/plants/build_plants.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw
    ... --tile D8 --debug <dir>        (one tile, with a plan-view PNG: zones, CHM shrubs, beds, plants)

DATA (docs/FOLIAGE.md "City"):
  green     the orthophoto (raw 0.25 m, resampled to the 0.5 m grid): vegetation = G above max(R, B) (the lab's index)
  height    the LiDAR canopy height model (UrbIS DSM - DTM 2021, 0.5 m): 0.35-3.2 m over green = a SHRUB mass (real
            positions and sizes); > 3.2 m = trees (drawn by the tree system: only shade-plants under them)
  land      UrbIS street surfaces (surfaces.json: roadway, sidewalk, square (4), median (6) ...), UrbIS building
            footprints (this tile + neighbours), OSM areas (features.json: park, garden, grass, scrub, wood,
            playground, pitch, cemetery), the front-garden kit (data/gardens/<T>.json: walls, railings, hedge runs:
            no plant grows on a wall / hedge line)
ZONES (what a plant is, from where it stands):
  front     private land (not a street surface, not a building) within 16 m of a street surface
  park      OSM park / garden / village_green / cemetery areas (minus streets and buildings)
  square    UrbIS squares (class 4) where the orthophoto is green (planted beds)
  island    UrbIS medians / traffic islands (class 6) where the orthophoto is green
  scrub     OSM natural=scrub
RULES (seeded by the world position: the same tile always grows the same plants; no plant inventory exists):
  shrubs    every CHM shrub blob (connected component) in a zone is filled with plants on a grid of ~its own size; the
            species by height and zone (box balls / lavender low, hydrangea / rose mid, laurel / rhododendron tall),
            the scale from the measured height
  beds      front gardens: a planted bed along the façade (45 % of fronts, where the ground in front of the wall is
            green), a shrub row behind 30 % of the railings (terraces: "low wall + railing, shrubs behind"); squares /
            islands: low beds where green and the CHM is low; each bed = a rounded strip (centre, direction, length,
            width) the city draws as mulch and keeps the grass out of (smooth outline: no saw-tooth)
Output per tile: { contract, tile, types, zones, plants: [x, z, type, yaw (0-255), scale x 100, zone, ...] (6 per
plant), beds: [cx, cz, angle x 1000, length x 100, width x 100, zone, ...] (6 per bed), counts }.
"""
from __future__ import annotations

import argparse, json, math, sys, time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.merge import merge
from PIL import Image, ImageDraw
from scipy import ndimage

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import ORIGIN_E, ORIGIN_N, all_tiles, tile_bounds, tile_ij, tile_name, I_RANGE, J_RANGE  # noqa: E402

CONTRACT = "plants-0.1"
OUT = ROOT / "data" / "plants"
TILES = ROOT / "data" / "tiles"
RES = 0.5
MARGIN = 20.0
TYPES = ["box_ball", "laurel", "rhododendron", "hydrangea", "rose", "lavender", "bulbs", "geranium"]
TI = {t: i for i, t in enumerate(TYPES)}
H_MODEL = {"box_ball": 0.72, "laurel": 1.44, "rhododendron": 1.29, "hydrangea": 0.92, "rose": 0.93, "lavender": 0.61, "bulbs": 0.48, "geranium": 0.37}
ZONES = ["front", "park", "square", "island", "scrub"]
ZI = {z: i for i, z in enumerate(ZONES)}
SHRUB_LO, SHRUB_HI = 0.35, 3.2


def h01(x, z, salt=0):
    """= viewer/foliage/placement.js hash2 (floor(x * 100), floor(z * 100), salt)"""
    xi, zi = int(math.floor(x * 100)) & 0xffffffff, int(math.floor(z * 100)) & 0xffffffff
    imul = lambda a, b: (a * b) & 0xffffffff
    h = imul(xi, 73856093) ^ imul(zi, 19349663) ^ imul((salt + 1) & 0xffffffff, 83492791)
    h = imul(h ^ (h >> 13), 1274126177)
    return ((h ^ (h >> 16)) & 0xffffffff) / 4294967296


def pick(mix, u):
    for k, w in mix:
        if u < w: return k
        u -= w
    return mix[-1][0]


# species mixes (Street View look of Uccle's fronts and parks, docs/FOLIAGE.md "City": hydrangeas, roses, lavender and box
# in the front beds; laurel / rhododendron / box masses in the villa gardens and parks)
SHRUB_MIX = {
    "front": [(0.9, [("box_ball", 0.4), ("lavender", 0.18), ("rose", 0.2), ("hydrangea", 0.22)]),
              (1.7, [("hydrangea", 0.32), ("rhododendron", 0.28), ("laurel", 0.22), ("rose", 0.1), ("box_ball", 0.08)]),
              (9.0, [("laurel", 0.55), ("rhododendron", 0.45)])],
    "park": [(0.9, [("box_ball", 0.3), ("hydrangea", 0.3), ("rose", 0.15), ("lavender", 0.25)]),
             (1.7, [("rhododendron", 0.4), ("laurel", 0.35), ("hydrangea", 0.25)]),
             (9.0, [("laurel", 0.5), ("rhododendron", 0.5)])],
    "square": [(0.9, [("lavender", 0.35), ("box_ball", 0.3), ("rose", 0.2), ("hydrangea", 0.15)]),
               (9.0, [("laurel", 0.5), ("rhododendron", 0.3), ("hydrangea", 0.2)])],
    "island": [(0.9, [("lavender", 0.35), ("box_ball", 0.35), ("rose", 0.3)]),
               (9.0, [("laurel", 0.6), ("box_ball", 0.4)])],
    "scrub": [(1.2, [("laurel", 0.5), ("rhododendron", 0.3), ("hydrangea", 0.2)]),
              (9.0, [("laurel", 0.65), ("rhododendron", 0.35)])],
}
BED_MIX = {
    "front": [("hydrangea", 0.26), ("rose", 0.22), ("lavender", 0.2), ("box_ball", 0.12), ("bulbs", 0.12), ("rhododendron", 0.08)],
    "square": [("lavender", 0.3), ("rose", 0.25), ("box_ball", 0.2), ("bulbs", 0.15), ("hydrangea", 0.1)],
    "island": [("lavender", 0.35), ("box_ball", 0.3), ("rose", 0.2), ("bulbs", 0.15)],
}
ROW_MIX = [("box_ball", 0.35), ("hydrangea", 0.3), ("laurel", 0.15), ("rose", 0.2)]


def read_mosaic(src, bounds):
    files = []
    for f in sorted(src.rglob("*.tif")):
        with rasterio.open(f) as ds:
            b = ds.bounds
            if b.right > bounds[0] and b.left < bounds[2] and b.top > bounds[1] and b.bottom < bounds[3]: files.append(f)
    if not files: raise SystemExit(f"no rasters under {src} cover {bounds}")
    dss = [rasterio.open(f) for f in files]
    try:
        nod = dss[0].nodata
        arr, _ = merge(dss, bounds=bounds, res=RES, nodata=np.nan, dtype="float64")
    finally:
        for d in dss: d.close()
    a = arr[0]
    if nod is not None and not np.isnan(nod): a[a == nod] = np.nan
    a[a < -1000] = np.nan
    return a


class Grid:
    """the 0.5 m raster over the tile + MARGIN: col c <-> x = gx0 + (c + .5) RES, row r <-> z = gz0 + (r + .5) RES (north up)"""
    def __init__(self, tile):
        x0, z0, x1, z1 = tile_bounds(tile)
        self.x0, self.z0, self.x1, self.z1 = x0, z0, x1, z1
        self.gx0, self.gz0 = x0 - MARGIN, z0 - MARGIN
        self.n = int(round((x1 - x0 + 2 * MARGIN) / RES))

    def img(self):
        return Image.new("L", (self.n, self.n), 0)

    def poly(self, draw, rings, v=255):
        # outer ring filled, holes cut (enough for footprints / areas)
        for k, r in enumerate(rings):
            pts = [((p[0] - self.gx0) / RES, (p[1] - self.gz0) / RES) for p in r]
            if len(pts) >= 3: draw.polygon(pts, fill=(v if k == 0 else 0))

    def line(self, draw, pts, width, v=255):
        q = [((p[0] - self.gx0) / RES, (p[1] - self.gz0) / RES) for p in pts]
        if len(q) >= 2: draw.line(q, fill=v, width=max(1, int(round(width / RES))), joint="curve")

    def cell(self, x, z):
        return int((z - self.gz0) / RES), int((x - self.gx0) / RES)


def load(p):
    return json.loads(Path(p).read_text(encoding="utf8")) if Path(p).exists() else None


def neighbours(tile):
    i, j = tile_ij(tile)
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ii, jj = i + di, j + dj
            if I_RANGE[0] <= ii <= I_RANGE[1] and J_RANGE[0] <= jj <= J_RANGE[1]: yield tile_name(ii, jj)


def build(tile, raw: Path, debug: Path | None = None):
    t0 = time.time()
    G = Grid(tile)
    N = G.n
    # ---- rasters: green, CHM
    e0, e1 = ORIGIN_E + G.gx0, ORIGIN_E + G.gx0 + N * RES
    n1, n0 = ORIGIN_N - G.gz0, ORIGIN_N - G.gz0 - N * RES
    dsm = read_mosaic(raw / "urbis" / "dsm", (e0, n0, e1, n1))
    dtm = read_mosaic(raw / "urbis" / "dtm", (e0, n0, e1, n1))
    h = min(dsm.shape[0], dtm.shape[0], N); w = min(dsm.shape[1], dtm.shape[1], N)
    chm = np.zeros((N, N)); chm[:h, :w] = np.nan_to_num(dsm[:h, :w] - dtm[:h, :w], nan=0.0)
    chm[chm < 0] = 0
    green = np.zeros((N, N))
    for t in neighbours(tile):                      # the orthophotos of this tile and its neighbours (the margin)
        f = raw / "ortho" / f"{t}.jpg"
        if not f.exists(): continue
        tx0, tz0, tx1, tz1 = tile_bounds(t)
        c0, r0 = int(round((tx0 - G.gx0) / RES)), int(round((tz0 - G.gz0) / RES))
        k = int(round(500 / RES))
        if c0 >= N or r0 >= N or c0 + k <= 0 or r0 + k <= 0: continue
        im = np.asarray(Image.open(f).convert("RGB").resize((k, k), Image.BOX), dtype=np.float32)
        gi = np.clip((im[..., 1] - np.maximum(im[..., 0], im[..., 2]) * 0.98) / 18.0, 0, 1)
        a0, b0 = max(0, r0), max(0, c0)
        a1, b1 = min(N, r0 + k), min(N, c0 + k)
        green[a0:a1, b0:b1] = gi[a0 - r0:a1 - r0, b0 - c0:b1 - c0]
    # ---- land
    bld, street = G.img(), G.img()
    db, ds = ImageDraw.Draw(bld), ImageDraw.Draw(street)
    sq, isl = G.img(), G.img()
    dq, di = ImageDraw.Draw(sq), ImageDraw.Draw(isl)
    island_ids = {}
    for t in neighbours(tile):
        bd = load(TILES / t / "buildings.json")
        if bd:
            for b in bd["buildings"]: G.poly(db, b["footprint"])
        sd = load(TILES / t / "surfaces.json")
        if sd:
            for s in sd["surfaces"]:
                if s.get("c") == 7: continue                      # park paths: plants may stand beside them
                G.poly(ds, s["rings"])
                if t == tile and s.get("c") == 4: G.poly(dq, s["rings"])
                if t == tile and s.get("c") == 6: G.poly(di, s["rings"], 255)
    bldA, streetA = np.asarray(bld) > 0, np.asarray(street) > 0
    sqA, islA = np.asarray(sq) > 0, np.asarray(isl) > 0
    feats = load(TILES / tile / "features.json") or {}
    park, scrub = G.img(), G.img()
    dp, dsc = ImageDraw.Draw(park), ImageDraw.Draw(scrub)
    for a in feats.get("areas", []):
        if a["kind"] in ("park", "garden", "cemetery"): G.poly(dp, a["rings"])
        elif a["kind"] == "scrub": G.poly(dsc, a["rings"])
    parkA, scrubA = np.asarray(park) > 0, np.asarray(scrub) > 0
    # no plant on the front-garden kit's walls, railings and hedges (gardens doc), nor in a tree trunk
    block = G.img(); dbk = ImageDraw.Draw(block)
    gd = load(ROOT / "data" / "gardens" / f"{tile}.json")
    rails = []
    if gd:
        for sgm in gd["segs"]: G.line(dbk, [(sgm[0], sgm[2]), (sgm[3], sgm[5])], 1.0)
        for hr in gd["hedges"]: G.line(dbk, hr["points"], (hr.get("width") or 0.7) + 0.9)
        for sgm in gd["segs"]:
            st = gd["styles"][sgm[6]]
            if st.get("kind") == "rail" and not st.get("hedge"): rails.append(sgm)
        for p in gd["pillars"]: dbk.ellipse([(p[0] - G.gx0) / RES - 1, (p[2] - G.gz0) / RES - 1, (p[0] - G.gx0) / RES + 1, (p[2] - G.gz0) / RES + 1], fill=255)
    # railway land: ballast, cess and embankment are no garden (the railway's own scrub is left to the tree system)
    for t in neighbours(tile):
        fd = feats if t == tile else load(TILES / t / "features.json")
        for ln in (fd or {}).get("lines", []):
            if ln.get("kind") in ("rail",):
                pts = ln.get("points") or ln.get("line") or ln.get("coords")
                if pts: G.line(dbk, pts, 16.0)
    for tr in feats.get("trees", []):
        r = 0.6 / RES; cx, cz = (tr["x"] - G.gx0) / RES, (tr["z"] - G.gz0) / RES
        dbk.ellipse([cx - r, cz - r, cx + r, cz + r], fill=255)
    blockA = np.asarray(block) > 0
    # distances (m)
    dBld = ndimage.distance_transform_edt(~bldA) * RES
    dStreet = ndimage.distance_transform_edt(~streetA) * RES
    private = ~bldA & ~streetA
    front = private & (dStreet <= 16) & ~parkA
    zone = np.full((N, N), -1, np.int8)
    zone[front] = ZI["front"]
    zone[parkA & private] = ZI["park"]
    zone[scrubA & private] = ZI["scrub"]
    zone[sqA & (green > 0.3)] = ZI["square"]
    zone[islA & (green > 0.3)] = ZI["island"]
    inside = np.zeros((N, N), bool)
    m0 = int(MARGIN / RES); inside[m0:N - m0, m0:N - m0] = True
    ok = inside & ~blockA & (dBld >= 0.45) & (zone >= 0)
    plants, beds = [], []
    taken = np.zeros((N, N), bool)                      # claimed cells (no two plants on one spot)

    def free(x, z, r):
        rr, cc = G.cell(x, z); k = int(math.ceil(r / RES))
        a0, a1, b0, b1 = max(0, rr - k), min(N, rr + k + 1), max(0, cc - k), min(N, cc + k + 1)
        return not taken[a0:a1, b0:b1].any()

    def claim(x, z, r):
        rr, cc = G.cell(x, z); k = max(0, int(math.ceil(r / RES)) - 1)
        taken[max(0, rr - k):min(N, rr + k + 1), max(0, cc - k):min(N, cc + k + 1)] = True

    def put(x, z, typ, scale, zn, r):
        rr, cc = G.cell(x, z)
        if not (0 <= rr < N and 0 <= cc < N) or not ok[rr, cc] or not free(x, z, r): return False
        plants.append([round(x, 2), round(z, 2), TI[typ], int(h01(x, z, 31) * 255), int(round(scale * 100)), zn])
        claim(x, z, r)
        return True

    # ---- 1. shrubs: the LiDAR's low vegetation over green, blob by blob
    shrubM = ok & (chm >= SHRUB_LO) & (chm <= SHRUB_HI) & (green > 0.2)
    shrubM = ndimage.binary_opening(shrubM, iterations=1)
    lab, nl = ndimage.label(shrubM)
    objs = ndimage.find_objects(lab)
    for k, sl in enumerate(objs):
        if sl is None: continue
        m = lab[sl] == k + 1
        area = m.sum() * RES * RES
        if area < 0.5: continue
        hs = chm[sl][m]; hh = float(np.percentile(hs, 75))
        zs = zone[sl][m]; zn = int(np.bincount(zs.astype(np.int64)).argmax())
        zname = ZONES[zn]
        # plant spacing ~ the shrub's own size; a big blob is several plants
        sp = max(0.8, min(2.6, hh * 0.95))
        rows, cols = np.nonzero(m)
        xs = G.gx0 + (cols + sl[1].start + 0.5) * RES; zs_ = G.gz0 + (rows + sl[0].start + 0.5) * RES
        hsv = chm[sl][m]
        cells = {}
        for x, z, hv in zip(xs, zs_, hsv):
            key = (math.floor(x / sp), math.floor(z / sp))
            if key not in cells or h01(x, z, 3) > cells[key][3]: cells[key] = (x, z, hv, h01(x, z, 3))
        for (x, z, hv, _) in cells.values():
            jx, jz = (h01(x, z, 4) - 0.5) * 0.3, (h01(x, z, 5) - 0.5) * 0.3
            x += jx; z += jz
            mix = next(mx for lim, mx in SHRUB_MIX[zname] if hv <= lim)
            typ = pick(mix, h01(x, z, 6))
            sc = max(0.6, min(2.3 if zname in ("park", "scrub") else 1.8, hv / H_MODEL[typ] * (0.85 + 0.2 * h01(x, z, 7))))
            put(x, z, typ, sc, zn, 0.35 * sc * H_MODEL[typ] + 0.2)
    # ---- 2. beds along the façades in front gardens (where the ground in front of the wall is green and low)
    bedZoneF = ok & (zone == ZI["front"]) & (dBld <= 1.6) & (green > 0.18) & (chm < SHRUB_LO + 0.3)
    bdA, nb = ndimage.label(bedZoneF, structure=np.ones((3, 3)))
    for k, sl in enumerate(ndimage.find_objects(bdA)):
        if sl is None: continue
        m = bdA[sl] == k + 1
        if m.sum() * RES * RES < 1.2: continue
        rows, cols = np.nonzero(m)
        xs = G.gx0 + (cols + sl[1].start + 0.5) * RES; zs_ = G.gz0 + (rows + sl[0].start + 0.5) * RES
        cx0, cz0 = float(xs.mean()), float(zs_.mean())
        if h01(cx0, cz0, 21) > 0.45: continue                  # 45 % of the fronts have a façade bed
        add_beds(xs, zs_, "front", ZI["front"], beds, put, dBld, G)
    # ---- 3. squares and islands: low beds where green, CHM low
    for zname in ("square", "island"):
        zm = ok & (zone == ZI[zname]) & (chm < SHRUB_LO + 0.2)
        lb, n2 = ndimage.label(zm, structure=np.ones((3, 3)))
        for k, sl in enumerate(ndimage.find_objects(lb)):
            if sl is None: continue
            m = lb[sl] == k + 1
            if m.sum() * RES * RES < 3: continue
            rows, cols = np.nonzero(m)
            xs = G.gx0 + (cols + sl[1].start + 0.5) * RES; zs_ = G.gz0 + (rows + sl[0].start + 0.5) * RES
            if h01(float(xs.mean()), float(zs_.mean()), 22) > (0.5 if zname == "square" else 0.3): continue   # mown grass otherwise
            add_beds(xs, zs_, zname, ZI[zname], beds, put, None, G)
    # ---- 4. a shrub row behind some railings (terraces: low wall + railing, shrubs behind)
    for sgm in rails:
        x0, z0, x1, z1 = sgm[0], sgm[2], sgm[3], sgm[5]
        L = math.hypot(x1 - x0, z1 - z0)
        if L < 1.5 or h01(x0, z0, 41) > 0.3: continue
        nx, nz = -(z1 - z0) / L, (x1 - x0) / L
        # the garden side: the side further from the street
        r1, c1 = G.cell((x0 + x1) / 2 + nx * 0.8, (z0 + z1) / 2 + nz * 0.8)
        r2, c2 = G.cell((x0 + x1) / 2 - nx * 0.8, (z0 + z1) / 2 - nz * 0.8)
        if not (0 <= r1 < N and 0 <= c1 < N and 0 <= r2 < N and 0 <= c2 < N): continue
        if dStreet[r2, c2] > dStreet[r1, c1]: nx, nz = -nx, -nz
        n = max(1, int(L / 0.9))
        typ = pick(ROW_MIX, h01(x0, z0, 42))
        for i in range(n):
            f = (i + 0.5) / n
            x, z = x0 + (x1 - x0) * f + nx * 0.55, z0 + (z1 - z0) * f + nz * 0.55
            put(x, z, typ, 0.75 + 0.35 * h01(x, z, 43), ZI["front"], 0.3)
    counts = {"plants": len(plants), "beds": len(beds), "byType": {t: 0 for t in TYPES}, "byZone": {z: 0 for z in ZONES}}
    for p in plants: counts["byType"][TYPES[p[2]]] += 1; counts["byZone"][ZONES[p[5]]] += 1
    doc = {"contract": CONTRACT, "tile": tile, "types": TYPES, "zones": ZONES,
           "plants": [v for p in plants for v in p], "beds": [v for b in beds for v in b], "counts": counts,
           "sources": "orthophoto green (UrbIS ortho), LiDAR CHM (UrbIS DSM - DTM 2021), UrbIS surfaces + buildings, OSM areas, data/gardens"}
    OUT.mkdir(parents=True, exist_ok=True)
    (OUT / f"{tile}.json").write_text(json.dumps(doc, separators=(",", ":")), encoding="utf8")
    if debug: plan(debug, tile, G, zone, shrubM, plants, beds, green)
    return counts, time.time() - t0


def add_beds(xs, zs, zname, zn, beds, put, dBld, G):
    """a bed blob -> rounded strips along its main axis (PCA), filled with bed plants every ~0.55 m"""
    P = np.stack([xs, zs], 1)
    c = P.mean(0)
    cov = np.cov((P - c).T) if len(P) > 2 else np.eye(2)
    ev, V = np.linalg.eigh(cov)
    d = V[:, 1]
    u = (P - c) @ d; v = (P - c) @ np.array([-d[1], d[0]])
    # split long blobs into strips of <= 4 m
    u0, u1 = float(u.min()), float(u.max())
    L = u1 - u0 + RES
    width = float(min(1.6, max(0.7, (np.percentile(v, 90) - np.percentile(v, 10)) + RES)))
    nseg = max(1, int(math.ceil(L / 4.0)))
    for s in range(nseg):
        a, b = u0 + L * s / nseg, u0 + L * (s + 1) / nseg
        sel = (u >= a - 1e-6) & (u <= b + 1e-6)
        if sel.sum() < 3: continue
        vm = float(np.median(v[sel]))
        seg = b - a
        if seg < 0.8: continue
        cc = c + d * ((a + b) / 2) + np.array([-d[1], d[0]]) * vm
        cxv, czv = float(cc[0]), float(cc[1])
        ang = math.atan2(d[1], d[0])
        mix = BED_MIX[zname]
        main = pick(mix, h01(cxv, czv, 51)); second = pick(mix, h01(cxv, czv, 52))
        placed = 0
        rows = 2 if width > 1.1 else 1
        n = max(1, int(seg / 0.6))
        for i in range(n):
            for rw in range(rows):
                t = (i + 0.5 + (0.5 if rw else 0)) / n - 0.5
                off = (rw - (rows - 1) / 2) * width * 0.45
                x = cxv + d[0] * t * (seg - 0.3) - d[1] * off
                z = czv + d[1] * t * (seg - 0.3) + d[0] * off
                typ = main if h01(x, z, 53) < 0.65 else second
                sc = 0.75 + 0.35 * h01(x, z, 54)
                if put(x, z, typ, sc, zn, 0.22): placed += 1
        if placed: beds.append([round(cxv, 2), round(czv, 2), int(round(ang * 1000)), int(round(seg * 100)), int(round(width * 100)), zn])


def plan(out: Path, tile, G, zone, shrubM, plants, beds, green):
    out.mkdir(parents=True, exist_ok=True)
    N = G.n
    rgb = np.zeros((N, N, 3), np.uint8)
    rgb[..., 1] = (green * 90).astype(np.uint8)
    cols = [(200, 160, 60), (60, 160, 60), (160, 60, 200), (60, 120, 220), (120, 90, 40)]
    for k, c in enumerate(cols): rgb[zone == k] = (np.array(c) * 0.45).astype(np.uint8)
    rgb[shrubM] = (40, 220, 90)
    im = Image.fromarray(rgb).resize((N * 2, N * 2), Image.NEAREST)
    d = ImageDraw.Draw(im)
    for b in beds:
        cx, cz, a, L, W = b[0], b[1], b[2] / 1000, b[3] / 100, b[4] / 100
        dx, dz = math.cos(a), math.sin(a)
        pts = [(cx + dx * L / 2 * sx - dz * W / 2 * sy, cz + dz * L / 2 * sx + dx * W / 2 * sy) for sx, sy in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
        d.polygon([((x - G.gx0) / RES * 2, (z - G.gz0) / RES * 2) for x, z in pts], outline=(160, 110, 60))
    pc = [(30, 120, 30), (20, 90, 40), (200, 60, 150), (90, 120, 230), (220, 30, 50), (150, 110, 220), (240, 220, 40), (250, 60, 40)]
    for p in plants:
        x, z = (p[0] - G.gx0) / RES * 2, (p[1] - G.gz0) / RES * 2
        r = max(1.5, p[4] / 100 * H_MODEL[TYPES[p[2]]] / RES)
        d.ellipse([x - r, z - r, x + r, z + r], outline=pc[p[2]])
    im.save(out / f"plants_{tile}.png")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", action="append")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", default="C:/Users/tibog/Downloads/uccle-city/data/raw")
    ap.add_argument("--debug")
    a = ap.parse_args()
    tiles = list(all_tiles()) if a.all else (a.tile or ["D8"])
    raw = Path(a.raw)
    summary = {"contract": CONTRACT, "tiles": {}, "total": {"plants": 0, "beds": 0, "byType": {t: 0 for t in TYPES}, "byZone": {z: 0 for z in ZONES}}}
    for t in tiles:
        if not (TILES / t / "buildings.json").exists(): continue
        c, dt = build(t, raw, Path(a.debug) if a.debug else None)
        summary["tiles"][t] = c
        T = summary["total"]; T["plants"] += c["plants"]; T["beds"] += c["beds"]
        for k, v in c["byType"].items(): T["byType"][k] += v
        for k, v in c["byZone"].items(): T["byZone"][k] += v
        print(f"{t}: {c['plants']} plants, {c['beds']} beds  {c['byZone']}  ({dt:.1f} s)", flush=True)
    if a.all: (OUT / "summary.json").write_text(json.dumps(summary, indent=1), encoding="utf8")
    print(json.dumps(summary["total"]))


if __name__ == "__main__":
    main()
