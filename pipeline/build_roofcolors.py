"""Real roof colours from the 2024 orthophoto -> buildings.json roofColor (CONTRACT 5.2, from 0.7).

The UrbIS orthophoto 2024 (CC0, Paradigm) is a true ortho: roofs line up with the UrbIS footprints,
even on tall buildings. For each building this samples the photo under its roof triangles and keeps
the median colour of the SUNLIT half (pixels at or above the building's median luminance; vegetation
from overhanging trees excluded), so the shadowed slopes of the photo don't get baked into the albedo. Green-dominant results (the photo's cast on dark slate,
moss) are pulled 70 % toward grey: roofs here are hardly ever green. The colour is stored as linear RGB
albedo (sRGB decoded, x0.85 for the photo's exposure).

The photo is fetched once per tile from the Brussels raster WMS (layer Ortho2024NS, 25 cm/px) into
data/raw/ortho/<T>.jpg (git-ignored).

    python pipeline/build_roofcolors.py --tile G4
"""
from __future__ import annotations

import argparse
import struct
import sys
import urllib.request

import numpy as np
from PIL import Image, ImageDraw

from common import ORIGIN_E, ORIGIN_N, RAW, TILES, read_json, tile_bounds, write_json

WMS = "https://geoservices-grid.irisnet.be/geoserver/urbisgrid/wms"
LAYER = "Ortho2024NS"
PX = 0.25                      # metres per pixel
EXPOSURE = 0.85


def fetch(tile):
    out = RAW / "ortho" / f"{tile}.jpg"
    if out.exists() and out.stat().st_size > 0:
        return out
    x0, z0, x1, z1 = tile_bounds(tile)
    e0, e1, n0, n1 = ORIGIN_E + x0, ORIGIN_E + x1, ORIGIN_N - z1, ORIGIN_N - z0
    n = int(round((x1 - x0) / PX))
    url = (f"{WMS}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={LAYER}&STYLES=&SRS=EPSG:31370"
           f"&BBOX={e0},{n0},{e1},{n1}&WIDTH={n}&HEIGHT={n}&FORMAT=image/jpeg")
    out.parent.mkdir(parents=True, exist_ok=True)
    req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
    with urllib.request.urlopen(req, timeout=300) as r:
        data = r.read()
    if not data.startswith(b"\xff\xd8"):
        raise SystemExit(f"WMS did not return a JPEG for {tile}: {data[:200]!r}")
    out.write_bytes(data)
    return out


def srgb_to_linear(c):
    c = c / 255.0
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def build(tile):
    img = np.asarray(Image.open(fetch(tile)).convert("RGB"))
    H, W, _ = img.shape
    x0, z0, _, _ = tile_bounds(tile)
    doc = read_json(TILES / tile / "buildings.json")
    raw = (TILES / tile / "buildings.bin").read_bytes()
    V, T = struct.unpack_from("<II", raw)
    P = np.frombuffer(raw, "<f4", V * 3, 8).reshape(-1, 3)
    I = np.frombuffer(raw, "<u4", T * 3, 8 + V * 12).reshape(-1, 3)
    lum_w = np.array([0.2126, 0.7152, 0.0722])
    done = 0
    for b in doc["buildings"]:
        r0, rc = b["roof"]["first"], b["roof"]["count"]
        if rc == 0:
            continue
        mask = Image.new("L", (W, H), 0)
        d = ImageDraw.Draw(mask)
        for t in range(r0, r0 + rc):
            pts = [((P[i, 0] - x0) / PX, (P[i, 2] - z0) / PX) for i in I[t]]
            d.polygon(pts, fill=1)
        m = np.asarray(mask, bool)
        if m.sum() < 6:
            continue
        px = srgb_to_linear(img[m].astype(np.float64))
        # drop vegetation (trees overhanging the roof) when enough roof pixels remain
        veg = (px[:, 1] > px[:, 0] * 1.12) & (px[:, 1] > px[:, 2] * 1.02)
        if (~veg).sum() >= max(6, 0.15 * len(px)):
            px = px[~veg]
        lum = px @ lum_w
        lit = px[lum >= np.median(lum)]
        col = np.median(lit, axis=0) * EXPOSURE
        if col[1] > col[0] * 1.05 and col[1] > col[2]:
            g = float(col @ lum_w)
            col = g + (col - g) * 0.3
        b["roofColor"] = [round(float(v), 3) for v in col]
        done += 1
    doc["roofColorSource"] = {"layer": LAYER, "wms": WMS, "pxM": PX, "rule": "median of the sunlit half, vegetation excluded, green casts 70% to grey, linear, x0.85"}
    write_json(TILES / tile / "buildings.json", doc)
    return done, len(doc["buildings"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    a = ap.parse_args()
    done, n = build(a.tile.upper())
    print(f"roof colours {a.tile.upper()}: {done}/{n} buildings", file=sys.stderr)


if __name__ == "__main__":
    main()
