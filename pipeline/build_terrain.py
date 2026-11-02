"""DTM raster(s) -> data/tiles/<T>/terrain.u16 + terrain.json (CONTRACT §5.3).

Reads every raster under data/raw/urbis/dtm/ (GeoTIFF, ASCII grid, XYZ, IMG, VRT), reprojects
to EPSG:31370 if needed, and resamples bilinearly onto the tile's 1 m, 501 x 501 corner grid.

    python pipeline/build_terrain.py --tile G4 [--src data/raw/urbis/dtm]
"""
from __future__ import annotations

import argparse
import sys
from pathlib import Path

import numpy as np
import rasterio
from rasterio.crs import CRS as RioCRS
from rasterio.transform import from_origin
from rasterio.warp import Resampling, reproject, transform_bounds

from common import CONTRACT, L72_PROJ4, ORIGIN_E, ORIGIN_N, RAW, TERRAIN_STEP, TILE, TILES, tile_bounds, write_json

EXTS = {".tif", ".tiff", ".asc", ".xyz", ".img", ".vrt", ".bil", ".flt"}
NODATA = 65535


def find_rasters(src: Path):
    return sorted(p for p in src.rglob("*") if p.suffix.lower() in EXTS and p.is_file())


def build(tile: str, src: Path):
    files = find_rasters(src)
    if not files:
        raise SystemExit(f"no DTM raster under {src} (see pipeline/sources.json 'dtm')")
    x0, z0, _, _ = tile_bounds(tile)
    n = int(round(TILE / TERRAIN_STEP)) + 1
    e_w = ORIGIN_E + x0                  # easting of column 0
    n_n = ORIGIN_N - z0                  # northing of row 0 (tile's north edge)
    half = TERRAIN_STEP / 2
    dst_transform = from_origin(e_w - half, n_n + half, TERRAIN_STEP, TERRAIN_STEP)
    l72 = RioCRS.from_proj4(L72_PROJ4)
    dst_bounds = (e_w - half, n_n - TILE - half, e_w + TILE + half, n_n + half)

    out = np.full((n, n), np.nan, dtype=np.float64)
    used = []
    for f in files:
        with rasterio.open(f) as ds:
            src_crs = ds.crs
            if src_crs is None:
                print(f"  {f.name}: no CRS in file, assuming EPSG:31370", file=sys.stderr)
                src_crs = RioCRS.from_epsg(31370)
            same = src_crs.to_epsg() == 31370
            dst_crs = src_crs if same else l72
            b = ds.bounds if same else transform_bounds(src_crs, l72, *ds.bounds)
            if b[2] < dst_bounds[0] or b[0] > dst_bounds[2] or b[3] < dst_bounds[1] or b[1] > dst_bounds[3]:
                continue
            tmp = np.full((n, n), np.nan, dtype=np.float64)
            reproject(
                source=rasterio.band(ds, 1), destination=tmp,
                src_transform=ds.transform, src_crs=src_crs, src_nodata=ds.nodata,
                dst_transform=dst_transform, dst_crs=dst_crs, dst_nodata=np.nan,
                resampling=Resampling.bilinear,
            )
            fill = np.isnan(out) & ~np.isnan(tmp)
            out[fill] = tmp[fill]
            used.append({"file": f.name, "res": [abs(ds.transform.a), abs(ds.transform.e)], "crs": str(src_crs)})
    if not used:
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
           "source": "urbis-dtm", "inputs": used}
    write_json(tdir / "terrain.json", hdr, indent=1)
    return hdr


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    ap.add_argument("--src", type=Path, default=RAW / "urbis" / "dtm")
    args = ap.parse_args()
    hdr = build(args.tile.upper(), args.src)
    print(f"terrain {hdr['tile']}: {hdr['min']}..{hdr['max']} m, nodata {hdr['nodataCount']}, from {[u['file'] for u in hdr['inputs']]}", file=sys.stderr)


if __name__ == "__main__":
    main()
