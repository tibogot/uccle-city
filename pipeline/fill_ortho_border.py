"""Region border: the tiles' small orthophotos (data/tiles/<T>/ortho.jpg, the far tiles' colour and the textured
ground's far blend) are WHITE past the Brussels region border (the UrbIS ortho stops there). This fills those pixels
from the Flemish orthophoto (Digitaal Vlaanderen OMWRGB25VL, winter 2025, Modellicentie Gratis Hergebruik), colour-
matched to the Brussels summer photo with the same per-channel LUT as the horizon ring (pipeline/build_horizon.py).

    python pipeline/fill_ortho_border.py [T ...]      (default: every tile whose terrain has a DHMV fill)

Cache: data/raw/horizon/tileortho/<T>_vl.png. Idempotent: only pixels that are white in the UrbIS photo are replaced,
and the original is kept once as data/raw/horizon/tileortho/<T>_bxl.jpg.
"""
from __future__ import annotations

import io
import shutil
import sys

import numpy as np
from PIL import Image
from scipy.ndimage import binary_dilation, binary_opening

from build_horizon import RAWH, WMS_VL, apply_lut, http, l72_box, vl_lut
from common import TILES, all_tiles, read_json, tile_bounds

CACHE = RAWH / "tileortho"


def main():
    tiles = [t.upper() for t in sys.argv[1:]] or [t for t in all_tiles()
                                                 if (TILES / t / "terrain.json").exists() and read_json(TILES / t / "terrain.json").get("fill")]
    CACHE.mkdir(parents=True, exist_ok=True)
    lut = vl_lut("inner")
    for t in tiles:
        src = TILES / t / "ortho.jpg"
        keep = CACHE / f"{t}_bxl.jpg"
        if not keep.exists():
            shutil.copyfile(src, keep)
        b = np.asarray(Image.open(keep).convert("RGB")).astype(np.float32)
        H, W = b.shape[:2]
        white = (b >= 244).all(-1)
        white = binary_opening(white, iterations=1)            # not a white roof pixel or two
        if white.mean() < 0.001:
            print(f"  {t}: no white area, unchanged")
            continue
        white = binary_dilation(white, iterations=2)          # the JPEG ringing along the region line
        f = CACHE / f"{t}_vl.png"
        if not f.exists():
            x0, z0, x1, z1 = tile_bounds(t)
            e0, n0, e1, n1 = l72_box(x0, z0, x1, z1)
            q = (f"{WMS_VL[0]}?SERVICE=WMS&VERSION=1.1.1&REQUEST=GetMap&LAYERS={WMS_VL[1]}&STYLES=&SRS=EPSG:31370"
                 f"&BBOX={e0},{n0},{e1},{n1}&WIDTH={W}&HEIGHT={H}&FORMAT=image/png&TRANSPARENT=TRUE")
            Image.open(io.BytesIO(http(q, "image"))).convert("RGBA").save(f)
        v = np.asarray(Image.open(f)).astype(np.float32)
        ok = v[..., 3] > 200
        vm = apply_lut(v, lut)
        out = b.copy()
        put = white & ok
        out[put] = vm[put]
        Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)).save(src, quality=78, optimize=True)
        print(f"  {t}: {put.mean() * 100:.1f} % of the photo filled from the Flemish ortho ({(white & ~ok).mean() * 100:.2f} % left white)")


if __name__ == "__main__":
    main()
