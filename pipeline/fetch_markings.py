"""Measured road markings per tile from the Brussels Mobility WFS (cached in data/raw/markings/<T>.<layer>.geojson).

    python pipeline/fetch_markings.py [T ...]          # default: every tile of the grid (120)

Layers (sources.json "markings"; docs/ROADS_V2_RESEARCH.md §3.2):
  bm_urbis_topo:marking_line     UrbIS Topo (CC0): CR2301L zebra edges, CR2302L stop lines, CR2303L give-way,
                                 CR21*L continuous / CR22*L dashed lines, CR2204L cycle-track lines
  bm_urbis_topo:marking_point    UrbIS Topo (CC0): CR24*P arrows and logos
  bm_pedestrian:pedestrian_crossing_surfaces_2d   Brussels Mobility crossing polygons
  bm_equipment:marking_line / marking_polygon / marking_point   Brussels Mobility marking inventory (regional roads;
                                 mark_type legend not published: docs/roads/brussels_mobility_request.md)
  bm_equipment:traffic_signs     Brussels Mobility sign inventory (stop / give-way signs where surveyed)
Each tile's box is grown by MARGIN so a crossing over the tile edge comes whole. A layer that can't be fetched is
reported and left out (never substituted). The Brussels Mobility layers' licence is not stated on the WFS: asked in
docs/roads/brussels_mobility_request.md; until then they are used for building and checking, credited in CREDITS.md.
"""
from __future__ import annotations

import json
import sys
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

from common import RAW, all_tiles, local_to_l72, read_json, tile_bounds

HERE = Path(__file__).resolve().parent
OUT = RAW / "markings"
MARGIN = 30.0
LAYERS = ["bm_urbis_topo:marking_line", "bm_urbis_topo:marking_point", "bm_pedestrian:pedestrian_crossing_surfaces_2d",
          "bm_equipment:marking_line", "bm_equipment:marking_polygon", "bm_equipment:marking_point", "bm_equipment:traffic_signs"]


def layer_file(tile: str, layer: str) -> Path:
    return OUT / f"{tile}.{layer.replace(':', '_')}.geojson"


def bbox(tile: str):
    x0, z0, x1, z1 = tile_bounds(tile)
    e0, n1 = local_to_l72(x0 - MARGIN, z0 - MARGIN)
    e1, n0 = local_to_l72(x1 + MARGIN, z1 + MARGIN)
    return e0, n0, e1, n1


def fetch(tile: str, layer: str, url_t: str):
    f = layer_file(tile, layer)
    if f.exists() and f.stat().st_size > 0:
        return tile, layer, "cached", None
    e0, n0, e1, n1 = bbox(tile)
    url = url_t.format(layer=layer, e0=e0, n0=n0, e1=e1, n1=n1)
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
        with urllib.request.urlopen(req, timeout=180) as r:
            data = r.read()
        doc = json.loads(data)
    except Exception as e:          # report, never substitute
        return tile, layer, "failed", str(e)
    f.write_bytes(data)
    return tile, layer, "ok", len(doc.get("features", []))


def main():
    tiles = [t.upper() for t in sys.argv[1:]] or list(all_tiles())
    url_t = read_json(HERE / "sources.json")["sources"]["markings"]["wfs"]
    OUT.mkdir(parents=True, exist_ok=True)
    jobs = [(t, l) for t in tiles for l in LAYERS]
    failed = []
    with ThreadPoolExecutor(6) as ex:
        for tile, layer, st, info in ex.map(lambda j: fetch(j[0], j[1], url_t), jobs):
            if st == "failed":
                failed.append((tile, layer, info))
            if st != "cached":
                print(f"{tile} {layer}: {st} {info}", file=sys.stderr)
    print(f"{len(jobs) - len(failed)}/{len(jobs)} layer files in {OUT}", file=sys.stderr)
    if failed:
        print(f"FAILED: {failed}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
