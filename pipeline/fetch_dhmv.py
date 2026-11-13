"""Fetch the Flemish 1 m DTM (DHMV II) for the tiles that cross the Brussels region border.

The UrbIS DTM (data/raw/urbis/dtm) stops at the Brussels region border; every tile reaching into Flanders
(Drogenbos, Linkebeek, Sint-Genesius-Rode, Beersel...) had a NODATA area there. This fetches the Flemish DTM for
those tiles from Digitaal Vlaanderen's INSPIRE WCS, already in EPSG:31370 and on our 1 m grid (pixel centres on
whole Lambert-72 metres, = the tiles' terrain corners), with server-side bilinear resampling, plus a PAD margin so
build_terrain.py can feather the seam the same way on both sides of a tile edge.

    python pipeline/fetch_dhmv.py --border          # every tile whose terrain.json has nodata
    python pipeline/fetch_dhmv.py D10 E10 ...       # given tiles

Output: data/raw/dhmv/tiles/<T>.tif (float32, nodata -9999, ~1.2 MB each). Raw data: never committed / deployed.

Source: "Digitaal Hoogtemodel Vlaanderen II, DTM, raster, 1 m" (Digitaal Vlaanderen), WCS
https://geo.api.vlaanderen.be/el-dtm/wcs coverage EL.GridCoverage.DTM. Licence: Modellicentie Gratis Hergebruik
(free re-use, attribution "Digitaal Vlaanderen"). Heights in m TAW (Ostend), as the UrbIS DTM: checked by
tools/terrain/border_check.py (docs/HORIZON.md).
WCS notes (2026-11-13): the 2.0.1 interface 403s on CRS URLs in the query (Azure gateway) and its subsetting CRS is
fixed to EPSG:4258; the 1.0.0 interface takes crs=EPSG:31370 + bbox + resx/resy + format=GeoTIFF +
interpolation=bilinear and returns a plain GeoTIFF.
"""
from __future__ import annotations

import argparse
import sys
import time
import urllib.request
from pathlib import Path

from common import ORIGIN_E, ORIGIN_N, RAW, TILE, TILES, all_tiles, read_json, tile_bounds

WCS = "https://geo.api.vlaanderen.be/el-dtm/wcs"
COVERAGE = "EL.GridCoverage.DTM"
PAD = 32                 # metres of margin around each tile (>= build_terrain.py FEATHER + smoothing radius)
OUT = RAW / "dhmv" / "tiles"


def wcs_url(e0, n0, e1, n1, res):
    """GeoTIFF of [e0, e1] x [n0, n1] (L72 pixel EDGES) at `res` m, bilinear."""
    return (f"{WCS}?service=WCS&version=1.0.0&request=GetCoverage&coverage={COVERAGE}&format=GeoTIFF"
            f"&crs=EPSG:31370&bbox={e0},{n0},{e1},{n1}&resx={res}&resy={res}&interpolation=bilinear")


def get(url: str, dest: Path, tries=4):
    for k in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=300) as r:
                ctype = r.headers.get("Content-Type", "")
                data = r.read()
            if "tiff" not in ctype:
                raise RuntimeError(f"not a GeoTIFF ({ctype}): {data[:300]!r}")
            tmp = dest.with_suffix(".part")
            tmp.write_bytes(data)
            tmp.replace(dest)
            return len(data)
        except Exception as e:  # noqa: BLE001
            print(f"  retry {k + 1}: {e}", file=sys.stderr)
            time.sleep(3 * (k + 1))
    raise SystemExit(f"failed: {url}")


def fetch_tile(t: str, force=False):
    OUT.mkdir(parents=True, exist_ok=True)
    dest = OUT / f"{t}.tif"
    if dest.exists() and not force:
        print(f"  have {dest.name}")
        return
    x0, z0, x1, z1 = tile_bounds(t)
    # tile corner (x0, z0) = L72 (ORIGIN_E + x0, ORIGIN_N - z0): pixel centres on whole metres -> edges at .5
    e0, e1 = ORIGIN_E + x0 - PAD - 0.5, ORIGIN_E + x1 + PAD + 0.5
    n0, n1 = ORIGIN_N - z1 - PAD - 0.5, ORIGIN_N - z0 + PAD + 0.5
    n = get(wcs_url(e0, n0, e1, n1, 1), dest)
    print(f"  {t}: {n / 1e6:.1f} MB")


def border_tiles():
    out = []
    for t in all_tiles():
        p = TILES / t / "terrain.json"
        if p.exists() and read_json(p).get("nodataCount", 0) > 0:
            out.append(t)
        # tiles already filled keep their DHMV file (build_terrain records it in "fill")
        elif p.exists() and read_json(p).get("fill"):
            out.append(t)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--border", action="store_true", help="every tile with DTM nodata (the region border)")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    tiles = [t.upper() for t in a.tiles] + (border_tiles() if a.border else [])
    if not tiles:
        ap.error("give tiles or --border")
    print(f"DHMV II for {len(tiles)} tiles: {' '.join(tiles)}", file=sys.stderr)
    for t in tiles:
        fetch_tile(t, a.force)


if __name__ == "__main__":
    main()
