"""Small orthophoto per tile for the viewer's far level of detail -> data/tiles/<T>/ortho.jpg.

From the cached 2024 orthophoto (data/raw/ortho/<T>.jpg, 25 cm/px, fetched by build_roofcolors.py from
the Brussels raster WMS, UrbIS CC0), resampled to 512 x 512 px (~1 m/px), JPEG q78. Only drawn on
tiles far from the player (beyond the full-detail ring), where 1 m/px is plenty.

    python pipeline/build_ortho_lod.py --tile G4
"""
from __future__ import annotations

import argparse
import sys

from PIL import Image

from common import RAW, TILES

SIZE = 512


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    a = ap.parse_args()
    t = a.tile.upper()
    src = RAW / "ortho" / f"{t}.jpg"
    if not src.exists():
        raise SystemExit(f"{src} missing: run build_roofcolors.py --tile {t} first (it fetches the orthophoto)")
    out = TILES / t / "ortho.jpg"
    Image.open(src).convert("RGB").resize((SIZE, SIZE), Image.LANCZOS).save(out, quality=78, optimize=True)
    print(f"ortho LOD {t}: {out.stat().st_size // 1024} kB", file=sys.stderr)


if __name__ == "__main__":
    main()
