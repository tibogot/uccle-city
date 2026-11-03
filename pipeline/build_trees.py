"""Trees from LiDAR: canopy height model (UrbIS DSM - DTM) -> tree tops -> data/tiles/<T>/features.json trees.

OSM maps very few of Uccle's trees (3 in G4), but the 2021 LiDAR flight that made the DTM also made
the UrbIS digital surface model. DSM - DTM is a canopy height model (CHM); its local peaks outside
buildings are tree tops:

  1. read DSM and DTM (0.5 m) for the tile + MARGIN, CHM = DSM - DTM
  2. mask buildings: every UrbIS footprint of this tile and its 8 neighbours, grown by 1.5 m
  3. smooth (Gaussian, 0.5 m), candidate peaks = local maxima in a 2.5 m window with CHM >= MIN_H
  4. greedy suppression, tallest first: a peak closer than the crown radius of a taller accepted
     tree is dropped. Crown radius = clamp(0.18 h + 0.8, 1.2, 7.0) m, capped at 0.6 x the distance
     to the nearest taller tree
  5. OSM trees within 3 m of a LiDAR tree lend it their tags (species, genus, leaf type);
     OSM trees with no LiDAR match are kept as they are

The result replaces features.json "trees" (CONTRACT 5.4): { x, z, y, id, height, crown, source, ... }.
Run after build_features.py and build_buildings.py.

    python pipeline/build_trees.py --tile G4
"""
from __future__ import annotations

import argparse
import math
import sys

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.merge import merge
from rasterio.transform import from_origin
from scipy import ndimage
from shapely.geometry import Point, Polygon

from common import ORIGIN_E, ORIGIN_N, RAW, TILES, l72_to_local, read_json, round2, study_polygon_local, tile_bounds, tile_ij, tile_name, I_RANGE, J_RANGE, write_json

RES = 0.5
MARGIN = 10.0
MIN_H = 3.0
BUILDING_GROW = 1.5
OSM_MATCH = 3.0


def crown_of(h):
    return min(7.0, max(1.2, 0.18 * h + 0.8))


def read_mosaic(src, bounds):
    files = sorted(src.rglob("*.tif"))
    e0, n0, e1, n1 = bounds
    keep = []
    for f in files:
        with rasterio.open(f) as ds:
            b = ds.bounds
            if b.right > e0 and b.left < e1 and b.top > n0 and b.bottom < n1:
                keep.append(f)
    if not keep:
        raise SystemExit(f"no rasters under {src} cover {bounds}")
    dss = [rasterio.open(f) for f in keep]
    try:
        nod = dss[0].nodata
        arr, tr = merge(dss, bounds=bounds, res=RES, nodata=np.nan, dtype="float64")
    finally:
        for d in dss:
            d.close()
    a = arr[0]
    if nod is not None and not np.isnan(nod):
        a[a == nod] = np.nan
    a[a < -1000] = np.nan
    return a, tr, [f.parent.name + "/" + f.name for f in keep]


def neighbour_footprints(tile):
    i, j = tile_ij(tile)
    rings = []
    for di in (-1, 0, 1):
        for dj in (-1, 0, 1):
            ii, jj = i + di, j + dj
            if not (I_RANGE[0] <= ii <= I_RANGE[1] and J_RANGE[0] <= jj <= J_RANGE[1]):
                continue
            p = TILES / tile_name(ii, jj) / "buildings.json"
            if p.exists():
                rings += [b["footprint"] for b in read_json(p)["buildings"]]
    return rings


def build(tile):
    x0, z0, x1, z1 = tile_bounds(tile)
    # EPSG:31370 window (north-up), MARGIN around the tile
    e0, e1 = ORIGIN_E + x0 - MARGIN, ORIGIN_E + x1 + MARGIN
    n0, n1 = ORIGIN_N - z1 - MARGIN, ORIGIN_N - z0 + MARGIN
    bounds = (e0, n0, e1, n1)
    dsm, tr, dsm_in = read_mosaic(RAW / "urbis" / "dsm", bounds)
    dtm, tr2, dtm_in = read_mosaic(RAW / "urbis" / "dtm", bounds)
    if dsm.shape != dtm.shape:
        h = min(dsm.shape[0], dtm.shape[0]); w = min(dsm.shape[1], dtm.shape[1])
        dsm, dtm = dsm[:h, :w], dtm[:h, :w]
    chm = np.nan_to_num(dsm - dtm, nan=0.0)
    chm[chm < 0] = 0

    # buildings (footprints are local x/z; convert to L72)
    rings = neighbour_footprints(tile)
    shapes = []
    for fp in rings:
        outer = [(ORIGIN_E + x, ORIGIN_N - z) for x, z in fp[0]]
        if len(outer) >= 3:
            shapes.append((Polygon(outer).buffer(BUILDING_GROW), 1))
    mask = rasterize(shapes, out_shape=chm.shape, transform=tr, fill=0, dtype="uint8") if shapes else np.zeros(chm.shape, "uint8")
    chm[mask > 0] = 0

    sm = ndimage.gaussian_filter(chm, 1.0)
    peak = (sm == ndimage.maximum_filter(sm, size=5)) & (sm >= MIN_H)
    rr, cc = np.nonzero(peak)
    hs = sm[rr, cc]
    order = np.argsort(-hs)
    # greedy suppression on a coarse grid
    cell = 8.0
    grid = {}
    trees = []
    for k in order:
        r, c, h = rr[k], cc[k], float(hs[k])
        e = tr.c + (c + 0.5) * tr.a
        n = tr.f + (r + 0.5) * tr.e
        gi, gj = int(e // cell), int(n // cell)
        near_d, blocked = math.inf, False
        for a in range(gi - 1, gi + 2):
            for b in range(gj - 1, gj + 2):
                for t in grid.get((a, b), ()):
                    d = math.hypot(t[0] - e, t[1] - n)
                    near_d = min(near_d, d)
                    blocked = blocked or d < t[3]        # inside a taller tree's crown
        if blocked:
            continue
        cr = crown_of(h)
        if near_d < math.inf:
            cr = max(1.0, min(cr, 0.6 * near_d))
        t = (e, n, h, cr, float(dtm[r, c]) if not np.isnan(dtm[r, c]) else None)
        grid.setdefault((gi, gj), []).append(t)
        trees.append(t)

    study = study_polygon_local()
    out = []
    for e, n, h, cr, ground in trees:
        x, z = l72_to_local(e, n)
        if not (x0 <= x < x1 and z0 <= z < z1) or not study.covers(Point(x, z)):
            continue
        rec = {"x": round2(x), "z": round2(z), "id": f"chm:{int(round(e * 2))}_{int(round(n * 2))}", "height": round2(h),
               "crown": round2(cr), "source": "urbis-chm"}
        if ground is not None:
            rec["y"] = round2(ground)
        out.append(rec)

    fpath = TILES / tile / "features.json"
    feats = read_json(fpath)
    osm = [t for t in feats.get("trees", []) if t.get("source", "osm") == "osm" or str(t.get("id", "")).startswith("osm:")]
    matched = 0
    for t in osm:
        best, bd = None, OSM_MATCH
        for c in out:
            d = math.hypot(c["x"] - t["x"], c["z"] - t["z"])
            if d < bd:
                best, bd = c, d
        if best is not None:
            for k in ("species", "genus", "leafType"):
                if t.get(k):
                    best[k] = t[k]
            best["osm"] = t["id"]
            matched += 1
        else:
            out.append({**t, "source": "osm"})
    feats["trees"] = out
    feats["treesSource"] = {"chm": {"dsm": dsm_in, "dtm": dtm_in, "minHeight": MIN_H, "res": RES}, "osmMatched": matched,
                            "osmOnly": sum(1 for t in out if t.get("source") == "osm")}
    write_json(fpath, feats)
    hs = [t["height"] for t in out if "height" in t]
    return len(out), matched, (np.percentile(hs, [10, 50, 90]).round(1).tolist() if hs else [])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    a = ap.parse_args()
    n, m, pct = build(a.tile.upper())
    print(f"trees {a.tile.upper()}: {n} ({m} OSM matched), height p10/50/90 {pct}", file=sys.stderr)


if __name__ == "__main__":
    main()
