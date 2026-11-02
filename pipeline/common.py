"""Shared constants and helpers. Mirrors docs/CONTRACT.md — change both together."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path

from pyproj import CRS, Transformer

CONTRACT = "0.2"

ROOT = Path(__file__).resolve().parent.parent
# UCCLE_DATA overrides the data folder (used for throwaway smoke tests outside the repo).
DATA = Path(os.environ.get("UCCLE_DATA", ROOT / "data"))
RAW = DATA / "raw"
TILES = DATA / "tiles"

# Study box (WGS84)
LON_MIN, LON_MAX = 4.327, 4.372
LAT_MIN, LAT_MAX = 50.7905, 50.8075

# EPSG:31370 with the pinned BD72 -> WGS84 (3) Helmert (CONTRACT §2.1)
L72_PROJ4 = (
    "+proj=lcc +lat_0=90 +lat_1=51.16666723333333 +lat_2=49.8333339 "
    "+lon_0=4.367486666666666 +x_0=150000.013 +y_0=5400088.438 +ellps=intl "
    "+towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs"
)
L72 = CRS.from_proj4(L72_PROJ4)
_WGS_TO_L72 = Transformer.from_crs("EPSG:4326", L72, always_xy=True)

ORIGIN_E, ORIGIN_N = 148643.0, 165394.0

TILE = 500.0
I_RANGE = (-4, 3)
J_RANGE = (-2, 1)
COLS = "ABCDEFGH"
TERRAIN_STEP = 1.0
ROAD_BUFFER = 150.0


def round2(v: float) -> float:
    return round(float(v), 2)


# ---------------------------------------------------------------- coordinates

def wgs_to_l72(lon, lat):
    return _WGS_TO_L72.transform(lon, lat)


def l72_to_local(e, n):
    return e - ORIGIN_E, -(n - ORIGIN_N)


def local_to_l72(x, z):
    return x + ORIGIN_E, ORIGIN_N - z


def wgs_to_local(lon, lat):
    """Scalars or sequences (sequences come back as numpy arrays)."""
    e, n = wgs_to_l72(lon, lat)
    if isinstance(e, (list, tuple)):
        import numpy as np

        e, n = np.asarray(e), np.asarray(n)
    return l72_to_local(e, n)


def study_box_local():
    """Local x/z extent of the WGS84 study box (projected corners)."""
    xs, zs = [], []
    for lon in (LON_MIN, LON_MAX):
        for lat in (LAT_MIN, LAT_MAX):
            x, z = wgs_to_local(lon, lat)
            xs.append(x)
            zs.append(z)
    return (min(xs), max(xs)), (min(zs), max(zs))


def study_polygon_local():
    """Study box as a local-metre shapely polygon (edges densified, they are not straight lines in L72)."""
    from shapely.geometry import Polygon

    pts = []
    n = 20
    for k in range(n):
        pts.append((LON_MIN + (LON_MAX - LON_MIN) * k / n, LAT_MAX))
    for k in range(n):
        pts.append((LON_MAX, LAT_MAX - (LAT_MAX - LAT_MIN) * k / n))
    for k in range(n):
        pts.append((LON_MAX - (LON_MAX - LON_MIN) * k / n, LAT_MIN))
    for k in range(n):
        pts.append((LON_MIN, LAT_MIN + (LAT_MAX - LAT_MIN) * k / n))
    return Polygon([wgs_to_local(lo, la) for lo, la in pts])


# ---------------------------------------------------------------- tiles

def tile_name(i: int, j: int) -> str:
    return f"{COLS[i - I_RANGE[0]]}{j - J_RANGE[0] + 1}"


def tile_ij(name: str):
    name = name.strip().upper()
    i = COLS.index(name[0]) + I_RANGE[0]
    j = int(name[1:]) - 1 + J_RANGE[0]
    if not (I_RANGE[0] <= i <= I_RANGE[1] and J_RANGE[0] <= j <= J_RANGE[1]):
        raise ValueError(f"tile {name} outside grid")
    return i, j


def tile_bounds(name: str):
    """(x0, z0, x1, z1) in local metres."""
    i, j = tile_ij(name)
    return i * TILE, j * TILE, (i + 1) * TILE, (j + 1) * TILE


def tile_of_point(x: float, z: float) -> str | None:
    i, j = math.floor(x / TILE), math.floor(z / TILE)
    if I_RANGE[0] <= i <= I_RANGE[1] and J_RANGE[0] <= j <= J_RANGE[1]:
        return tile_name(i, j)
    return None


def all_tiles():
    for j in range(J_RANGE[0], J_RANGE[1] + 1):
        for i in range(I_RANGE[0], I_RANGE[1] + 1):
            yield tile_name(i, j)


def tile_wgs_bbox(name: str, buffer: float = 0.0):
    """(south, west, north, east) WGS84 bbox covering a tile + buffer (for Overpass)."""
    x0, z0, x1, z1 = tile_bounds(name)
    inv = Transformer.from_crs(L72, "EPSG:4326", always_xy=True)
    lons, lats = [], []
    for x in (x0 - buffer, x1 + buffer):
        for z in (z0 - buffer, z1 + buffer):
            lon, lat = inv.transform(*local_to_l72(x, z))
            lons.append(lon)
            lats.append(lat)
    return min(lats), min(lons), max(lats), max(lons)


# ---------------------------------------------------------------- io

def write_json(path: Path, obj, indent=None):
    path.parent.mkdir(parents=True, exist_ok=True)
    with open(path, "w", encoding="utf-8") as f:
        json.dump(obj, f, ensure_ascii=False, indent=indent, separators=(",", ":") if indent is None else None)
        f.write("\n")


def read_json(path: Path):
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def signed_area(pts) -> float:
    """Shoelace on [x, z] — same sign as roadMath.polygonArea."""
    a = 0.0
    n = len(pts)
    for k in range(n):
        p, q = pts[k], pts[(k + 1) % n]
        a += p[0] * q[1] - q[0] * p[1]
    return a / 2


def ring_out(coords, outer: bool):
    """Shapely ring coords -> contract ring: no closing point, 0.01 m, outer positive / hole negative."""
    pts = [[round2(x), round2(z)] for x, z, *_ in coords]
    if len(pts) > 1 and pts[0] == pts[-1]:
        pts.pop()
    a = signed_area(pts)
    if (outer and a < 0) or (not outer and a > 0):
        pts.reverse()
    return pts


def polygon_out(poly):
    return [ring_out(poly.exterior.coords, True)] + [ring_out(r.coords, False) for r in poly.interiors]


if __name__ == "__main__":
    (xa, xb), (za, zb) = study_box_local()
    print(f"study box local x {xa:.1f}..{xb:.1f}  z {za:.1f}..{zb:.1f}")
    x, z = wgs_to_local(4.36586, 50.79415)
    print(f"Saint-Job local ({x:.2f}, {z:.2f}) tile {tile_of_point(x, z)} bounds {tile_bounds(tile_of_point(x, z))}")
    print("G4 wgs bbox+150m", tile_wgs_bbox("G4", ROAD_BUFFER))
    print("tiles", list(all_tiles()))
