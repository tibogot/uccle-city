"""DTM raster(s) -> data/tiles/<T>/terrain.u16 + terrain.json (CONTRACT §5.3).

Reads every raster under data/raw/urbis/dtm/ (GeoTIFF, ASCII grid, XYZ, IMG, VRT), reprojects
to EPSG:31370 if needed, and resamples bilinearly onto the tile's 1 m, 501 x 501 corner grid.

REGION BORDER: past the Brussels region border the UrbIS DTM has no data. Where data/raw/dhmv/tiles/<T>.tif
exists (pipeline/fetch_dhmv.py: the Flemish DTM, DHMV II 1 m, on the same grid + a margin) those cells are filled
from it. The UrbIS values are never changed (building bases, rail, trees stay valid); the Flemish values get the
local UrbIS - DHMV difference along the seam (smoothed), faded out over FEATHER m into Flanders, so the seam has no
step. The seam work runs on the tile + PAD grid so both sides of a tile edge get the same values.

    python pipeline/build_terrain.py --tile G4 [--src data/raw/urbis/dtm] [--fill data/raw/dhmv/tiles | --no-fill]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS as RioCRS
from rasterio.transform import from_origin
from rasterio.merge import merge
from rasterio.warp import Resampling, reproject, transform_bounds

from common import CONTRACT, L72_PROJ4, ORIGIN_E, ORIGIN_N, RAW, TERRAIN_STEP, TILE, TILES, tile_bounds, write_json

EXTS = {".tif", ".tiff", ".asc", ".xyz", ".img", ".vrt", ".bil", ".flt"}
NODATA = 65535
FILL_DIR = RAW / "dhmv" / "tiles"
PAD = 32             # margin (m) the seam work sees around the tile; fetch_dhmv.py fetches the same margin
FEATHER = 12.0       # the seam correction fades to 0 over this many metres into the filled area
SMOOTH = 4           # box half-width (m) of the seam residual smoothing (the per-cell difference is ~5 cm noise)


def find_rasters(src: Path):
    return sorted(p for p in src.rglob("*") if p.suffix.lower() in EXTS and p.is_file())


def urbis_grid(src: Path, e_w: float, n_n: float, n: int):
    """UrbIS DTM resampled onto the n x n, 1 m grid whose (0, 0) corner is L72 (e_w, n_n). NaN = no data."""
    files = find_rasters(src)
    if not files:
        raise SystemExit(f"no DTM raster under {src} (see pipeline/sources.json 'dtm')")
    half = TERRAIN_STEP / 2
    dst_transform = from_origin(e_w - half, n_n + half, TERRAIN_STEP, TERRAIN_STEP)
    l72 = RioCRS.from_proj4(L72_PROJ4)
    size = (n - 1) * TERRAIN_STEP
    dst_bounds = (e_w - half, n_n - size - half, e_w + size + half, n_n + half)

    out = np.full((n, n), np.nan, dtype=np.float64)
    used = []
    native = []          # EPSG:31370 sheets touching the tile: mosaicked first so bilinear works across sheet seams
    for f in files:
        with rasterio.open(f) as ds:
            src_crs = ds.crs
            if src_crs is None:
                src_crs = RioCRS.from_epsg(31370)      # the UrbIS GeoTIFFs carry no CRS tag (CONTRACT)
            same = src_crs.to_epsg() == 31370
            b = ds.bounds if same else transform_bounds(src_crs, l72, *ds.bounds)
            if b[2] < dst_bounds[0] or b[0] > dst_bounds[2] or b[3] < dst_bounds[1] or b[1] > dst_bounds[3]:
                continue
            used.append({"file": f.relative_to(src).as_posix(), "res": [abs(ds.transform.a), abs(ds.transform.e)], "crs": str(src_crs)})
            if same:
                native.append(f)
                continue
            tmp = np.full((n, n), np.nan, dtype=np.float64)
            reproject(
                source=rasterio.band(ds, 1), destination=tmp,
                src_transform=ds.transform, src_crs=src_crs, src_nodata=ds.nodata,
                dst_transform=dst_transform, dst_crs=l72, dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )
            fill = np.isnan(out) & ~np.isnan(tmp)
            out[fill] = tmp[fill]
    if native:
        pad = 4.0
        mb = (dst_bounds[0] - pad, dst_bounds[1] - pad, dst_bounds[2] + pad, dst_bounds[3] + pad)
        dss = [rasterio.open(f) for f in native]
        src_nod = dss[0].nodata
        try:
            mos, mtr = merge(dss, bounds=mb, nodata=np.nan, dtype="float64",
                             resampling=Resampling.bilinear)
        finally:
            for d in dss:
                d.close()
        a = mos[0]
        if src_nod is not None and not np.isnan(src_nod):
            a[a == src_nod] = np.nan
        a[a < -1000] = np.nan            # UrbIS DTM nodata is -3.4e38 (float32 min)
        tmp = np.full((n, n), np.nan, dtype=np.float64)
        reproject(source=a, destination=tmp, src_transform=mtr, src_crs=RioCRS.from_epsg(31370), src_nodata=np.nan,
                  dst_transform=dst_transform, dst_crs=RioCRS.from_epsg(31370), dst_nodata=np.nan,
                  resampling=Resampling.bilinear)
        fill = np.isnan(out) & ~np.isnan(tmp)
        out[fill] = tmp[fill]
    return out, used


def urbis_grid_exact(src: Path, e_w: float, n_n: float, n: int, rad: float = 1.0):
    """--resample exact (road fix round 2, docs/collisions/ROAD_FIX2.md): the same 1 m corner grid, every value a
    function of its own L72 position only, so two tiles sharing an edge row get identical values.

    Why: urbis_grid mosaics the 0.5 m sheets with rasterio.merge onto bounds that are not on the sheets' pixel grid (the
    sheets' origins are at x.134 / y.072 m); merge reads each sheet through a fractional window rounded to whole pixels,
    so the part of the tile taken from the second sheet comes out stretched by a fraction of a pixel, growing away from
    the sheet seam (H5: rows 394-500, i.e. south of northing 165000, up to 0.09 m mean, 1.4 m on steep ground). The
    next tile's mosaic starts at its own seam: the shared north-south edge rows differed by 3-9 cm mean, up to 1 m.
    Here: the sheets are mosaicked on their own pixel grid (bounds snapped outward: a plain copy, no resampling), then
    each corner is a separable tent (triangle) filter of half-width `rad` m over the 0.5 m pixels round its exact
    position (GDAL's bilinear when downsampling 0.5 -> 1 m is that tent: the tiles untouched by the bug match it to
    4 mm mean). NaN where less than half the tent's weight has data. EPSG:31370 sheets only (all of UrbIS's)."""
    files = find_rasters(src)
    e1, n1 = e_w + (n - 1) * TERRAIN_STEP, n_n - (n - 1) * TERRAIN_STEP
    m = rad + 2.0
    dss = [rasterio.open(f) for f in files]
    used, use = [], []
    try:
        for f, d in zip(files, dss):
            b = d.bounds
            if b.right < e_w - m or b.left > e1 + m or b.top < n1 - m or b.bottom > n_n + m:
                continue
            if d.crs is not None and d.crs.to_epsg() != 31370:
                raise SystemExit(f"{f.name}: --resample exact needs EPSG:31370 sheets")
            use.append(d)
            used.append({"file": f.relative_to(src).as_posix(), "res": [abs(d.transform.a), abs(d.transform.e)], "crs": str(d.crs)})
        if not use:
            return np.full((n, n), np.nan), used
        t = use[0].transform
        res = t.a
        L = t.c + np.floor((e_w - m - t.c) / res) * res
        R = t.c + np.ceil((e1 + m - t.c) / res) * res
        T = t.f - np.floor((t.f - (n_n + m)) / res) * res
        B = t.f - np.ceil((t.f - (n1 - m)) / res) * res
        mos, mtr = merge(use, bounds=(L, B, R, T), res=res, nodata=np.nan, dtype="float64")
    finally:
        for d in dss:
            d.close()
    a = mos[0]
    a[a < -1000] = np.nan
    px0 = (e_w - mtr.c) / res - 0.5                  # pixel coords (centres on integers) of the first corner
    py0 = (mtr.f - n_n) / res - 0.5
    k = int(round(TERRAIN_STEP / res))
    rp = rad / res

    def taps(p):
        f = p - np.floor(p)
        ks = np.arange(int(np.floor(f - rp)) + 1, int(np.ceil(f + rp)))
        w = np.maximum(0.0, 1 - np.abs(ks - f) / rp)
        return ks, w / w.sum()
    kx, wx = taps(px0)
    ky, wy = taps(py0)
    ix = int(np.floor(px0)) + np.arange(n) * k
    iy = int(np.floor(py0)) + np.arange(n) * k
    acc = np.zeros((n, n))
    wsum = np.zeros((n, n))
    for dy, wyv in zip(ky, wy):
        rows_ = a[iy + dy]
        for dx, wxv in zip(kx, wx):
            v = rows_[:, ix + dx]
            ok = ~np.isnan(v)
            acc[ok] += v[ok] * (wyv * wxv)
            wsum[ok] += wyv * wxv
    out = np.where(wsum >= 0.5, acc / np.maximum(wsum, 1e-12), np.nan)
    return out, used


def fill_grid(path: Path, e_w: float, n_n: float, n: int):
    """The DHMV tile file on the same grid (its pixel centres are whole L72 metres: a plain window read)."""
    with rasterio.open(path) as ds:
        t = ds.transform
        c0 = (e_w - (t.c + t.a / 2)) / t.a
        r0 = (n_n - (t.f + t.e / 2)) / t.e
        if abs(c0 - round(c0)) > 1e-6 or abs(r0 - round(r0)) > 1e-6 or abs(t.a - TERRAIN_STEP) > 1e-9:
            raise SystemExit(f"{path.name}: not on the 1 m grid (re-run fetch_dhmv.py --force)")
        c0, r0 = int(round(c0)), int(round(r0))
        if c0 < 0 or r0 < 0 or c0 + n > ds.width or r0 + n > ds.height:
            raise SystemExit(f"{path.name}: does not cover the tile + margin (re-run fetch_dhmv.py --force)")
        a = ds.read(1, window=((r0, r0 + n), (c0, c0 + n))).astype(np.float64)
        if ds.nodata is not None:
            a[a == ds.nodata] = np.nan
        a[a < -1000] = np.nan
    return a


def box_sum(a: np.ndarray, r: int):
    """Sum over a (2r+1)^2 window around each cell (zero outside), via a summed-area table."""
    k = 2 * r + 1
    s = np.zeros((a.shape[0] + k, a.shape[1] + k))
    s[1:, 1:] = np.pad(a, r).cumsum(0).cumsum(1)
    return s[k:, k:] - s[:-k, k:] - s[k:, :-k] + s[:-k, :-k]


def seam_fill(b: np.ndarray, f: np.ndarray):
    """Fill the NaNs of b (UrbIS) from f (DHMV) with the seam correction. Returns (grid, stats)."""
    from scipy.ndimage import distance_transform_edt
    have_b = ~np.isnan(b)
    both = have_b & ~np.isnan(f)
    need = ~have_b & ~np.isnan(f)
    st = {}
    out = b.copy()
    if not need.any():
        return out, st
    # the residual on the UrbIS cells along the seam (within SMOOTH + 2 m of a cell to fill), box-smoothed
    near = both & (distance_transform_edt(~need) <= SMOOTH + 2)
    res = np.where(near, b - f, 0.0)
    w = near.astype(np.float64)
    num, den = box_sum(res, SMOOTH), box_sum(w, SMOOTH)
    corr = np.zeros_like(b)
    if near.any():
        st = {"cells": int(near.sum()), "mean": round(float(res[near].mean()), 3),
              "median": round(float(np.median(res[near])), 3), "maxAbs": round(float(np.abs(res[near]).max()), 3)}
        with np.errstate(invalid="ignore", divide="ignore"):
            rs = num / den
        # each filled cell: the smoothed residual at its nearest seam cell, faded out over FEATHER
        dist, (ri, ci) = distance_transform_edt(~near, return_indices=True)
        corr = np.nan_to_num(rs[ri, ci]) * np.clip(1 - dist / FEATHER, 0, 1)
    out[need] = f[need] + corr[need]
    return out, st


RESAMPLE = "mosaic"   # "exact": urbis_grid_exact (--resample exact); the data in data/tiles is still "mosaic" (see ROAD_FIX2.md)


def build(tile: str, src: Path, fill_dir: Path | None = FILL_DIR):
    grid = urbis_grid_exact if RESAMPLE == "exact" else urbis_grid
    x0, z0, _, _ = tile_bounds(tile)
    n = int(round(TILE / TERRAIN_STEP)) + 1
    e_w = ORIGIN_E + x0                  # easting of column 0
    n_n = ORIGIN_N - z0                  # northing of row 0 (tile's north edge)
    fpath = fill_dir / f"{tile}.tif" if fill_dir else None
    fill_info = None
    if fpath and fpath.exists():
        P = int(round(PAD / TERRAIN_STEP))
        big, used = grid(src, e_w - PAD, n_n + PAD, n + 2 * P)
        before = np.isnan(big[P:P + n, P:P + n]).sum()
        big, seam = seam_fill(big, fill_grid(fpath, e_w - PAD, n_n + PAD, n + 2 * P))
        out = big[P:P + n, P:P + n].copy()
        fill_info = {"source": "DHMV II DTM 1 m (Digitaal Vlaanderen)", "file": f"dhmv/tiles/{fpath.name}",
                     "cells": int(before - np.isnan(out).sum()), "feather": FEATHER, "seamResidual": seam}
    else:
        out, used = grid(src, e_w, n_n, n)
    if not used and not fill_info:
        raise SystemExit(f"no DTM raster under {src} covers tile {tile}")

    valid = ~np.isnan(out)
    if not valid.any():
        raise SystemExit("DTM covers the tile bbox but all samples are nodata")
    lo, hi = float(np.nanmin(out)), float(np.nanmax(out))
    if lo < 0 or hi > 400:
        print(f"  WARNING: heights {lo:.1f}..{hi:.1f} m look wrong for Uccle (expect ~40..130 m TAW) — check units/datum", file=sys.stderr)
    enc = np.full((n, n), NODATA, dtype="<u2")
    enc[valid] = np.clip(np.round(out[valid] * 100), 0, NODATA - 1).astype("<u2")
    tdir = TILES / tile
    tdir.mkdir(parents=True, exist_ok=True)
    (tdir / "terrain.u16").write_bytes(enc.tobytes())
    hdr = {"contract": CONTRACT, "tile": tile, "x0": x0, "z0": z0, "size": TILE, "step": TERRAIN_STEP,
           "cols": n, "rows": n, "encoding": "u16le-cm", "nodata": NODATA,
           "min": round(lo, 2), "max": round(hi, 2), "nodataCount": int((~valid).sum()),
           "source": "urbis-dtm+dhmv2" if fill_info else "urbis-dtm", "inputs": used}
    if RESAMPLE == "exact":
        hdr["resample"] = "exact-tent1m"
    if fill_info:
        hdr["fill"] = fill_info
    write_json(tdir / "terrain.json", hdr, indent=1)
    return hdr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    ap.add_argument("--src", type=Path, default=RAW / "urbis" / "dtm")
    ap.add_argument("--fill", type=Path, default=FILL_DIR, help="DHMV tiles (fetch_dhmv.py) for cells past the region border")
    ap.add_argument("--no-fill", action="store_true")
    ap.add_argument("--resample", choices=["mosaic", "exact"], default="mosaic",
                    help="exact: every corner from its own position (tile edges match; docs/collisions/ROAD_FIX2.md)")
    ap.add_argument("--out", type=Path, default=None, help="write here instead of data/tiles (a trial build)")
    args = ap.parse_args()
    global RESAMPLE, TILES
    RESAMPLE = args.resample
    if args.out:
        TILES = args.out
    hdr = build(args.tile.upper(), args.src, None if args.no_fill else args.fill)
    fill = hdr.get("fill")
    extra = f", filled {fill['cells']} cells from DHMV (seam {fill['seamResidual']})" if fill else ""
    print(f"terrain {hdr['tile']}: {hdr['min']}..{hdr['max']} m, nodata {hdr['nodataCount']}{extra}", file=sys.stderr)


if __name__ == "__main__":
    main()
