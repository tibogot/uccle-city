"""Fill pipeline/sources.json 'urls' from each dataset's INSPIRE Atom feed.

UrbIS data is published per 1 km sheet named after its south-west corner in km
(EPSG:31370): sheet '149164' covers E 149000-150000, N 164000-165000. This picks,
for every sheet that touches the tile grid (or --tiles), the newest release in the
wanted format, and writes the URLs into sources.json.

    python pipeline/find_sheets.py                 # sheets for the whole 32-tile grid
    python pipeline/find_sheets.py --tiles G4 F4   # only these tiles
    python pipeline/find_sheets.py --dry-run
"""
from __future__ import annotations

import argparse
import json
import math
import re
import urllib.request
from pathlib import Path

from common import ORIGIN_E, ORIGIN_N, all_tiles, tile_bounds

HERE = Path(__file__).resolve().parent
FORMAT = {"buildings3d": "SHP", "dtm": "TIFF", "transport": "GPKG", "dsm": "TIFF"}


def sheets_for(tiles, pad=0.0):
    out = set()
    for t in tiles:
        x0, z0, x1, z1 = tile_bounds(t)
        e0, e1 = ORIGIN_E + x0 - pad, ORIGIN_E + x1 + pad
        n0, n1 = ORIGIN_N - z1 - pad, ORIGIN_N - z0 + pad
        for e in range(math.floor(e0 / 1000), math.ceil(e1 / 1000)):
            for n in range(math.floor(n0 / 1000), math.ceil(n1 / 1000)):
                out.add(f"{e:03d}{n:03d}")
    return sorted(out)


def latest(feed_xml: str, fmt: str):
    """{sheet: (url, date)} — newest release per sheet in the given format."""
    best = {}
    for url in re.findall(r'href="([^"]+\.zip)"', feed_xml):
        if f"/{fmt}/" not in url:
            continue
        m = re.search(r"_(\d{6})_(\d{8})", url)
        if not m:
            continue                                   # whole-region archives have a 5-digit code
        sheet, date = m.groups()
        if sheet not in best or date > best[sheet][1]:
            best[sheet] = (url, date)
    return best


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tiles", nargs="*")
    ap.add_argument("--dry-run", action="store_true")
    a = ap.parse_args()
    tiles = [t.upper() for t in a.tiles] if a.tiles else list(all_tiles())
    want = sheets_for(tiles)
    path = HERE / "sources.json"
    cfg = json.loads(path.read_text(encoding="utf-8"))
    for key, src in cfg["sources"].items():
        fmt = FORMAT.get(key)
        if not fmt or not src.get("atom"):
            continue
        with urllib.request.urlopen(urllib.request.Request(src["atom"], headers={"User-Agent": "uccle-city-pipeline/0.1"}), timeout=120) as r:
            avail = latest(r.read().decode("utf-8-sig"), fmt)
        urls = [avail[s][0] for s in want if s in avail]
        missing = [s for s in want if s not in avail]
        print(f"[{key}] {len(urls)}/{len(want)} sheets" + (f", not published: {missing}" if missing else ""))
        src["urls"] = urls
        src["sheets"] = {s: avail[s][1] for s in want if s in avail}
    if not a.dry_run:
        path.write_text(json.dumps(cfg, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
        print(f"wrote {path}")


if __name__ == "__main__":
    main()
