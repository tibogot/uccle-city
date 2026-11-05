"""Full pipeline for one or more tiles. Raw inputs must already be in data/raw/ (fetch_osm.py, fetch_urbis.py).

    python pipeline/run_tile.py G4 [F4 ...] | --all  [--network] [--skip-buildings] [--skip-terrain]
                                [--id-field X] [--height-field H] [--layer L]

UrbIS 3D Constructions (SHP):  --id-field INSPIRE_ID --layer BuildingSolids  (the defaults)

Roads: --network first rebuilds data/roads/network.json from OSM (build_roads.py --all) and cleans it
with the road engine (refine_roads.mjs, needs Node 22+). Each tile's roads.json is then cut from that
network (cut_roads.py), so ids are shared across tiles. Without --network the existing network.json
is used. A missing UrbIS input skips that layer with a message (never substitutes data).
"""
from __future__ import annotations

import argparse
import shutil
import subprocess
import sys
from pathlib import Path

from common import DATA, RAW, all_tiles

RAW_DSM = RAW / "urbis" / "dsm"

HERE = Path(__file__).resolve().parent


def step(args, exe=None):
    cmd = [exe or sys.executable, *args]
    print(f"\n$ {' '.join(map(str, cmd))}", file=sys.stderr)
    return subprocess.call(cmd, cwd=HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--network", action="store_true", help="rebuild + refine data/roads/network.json first")
    ap.add_argument("--skip-buildings", action="store_true")
    ap.add_argument("--skip-terrain", action="store_true")
    ap.add_argument("--id-field", default="INSPIRE_ID")
    ap.add_argument("--height-field")
    ap.add_argument("--layer", default="BuildingSolids", help="buildings: only layers whose name contains this")
    a = ap.parse_args()
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tiles]
    if not tiles:
        ap.error("give tile names or --all")
    failed = []
    network = DATA / "roads" / "network.json"
    if a.network or not network.exists():
        node = shutil.which("node")
        if step(["build_roads.py", "--all"]) or not node or step(["refine_roads.mjs", str(network)], exe=node):
            failed.append("network")
    for t in tiles:
        if step(["cut_roads.py", "--tile", t]):
            failed.append(f"{t}:roads")
        if step(["build_features.py", "--tile", t]):
            failed.append(f"{t}:features")
        # measured street surfaces (optional layer, viewer ?roads=surface): needs fetch_urbis.py landcover
        if any((RAW / "urbis" / "landcover").rglob("*.gpkg")) and step(["build_surfaces.py", "--tile", t]):
            failed.append(f"{t}:surfaces")
        if not a.skip_terrain and step(["build_terrain.py", "--tile", t]):
            failed.append(f"{t}:terrain")
        if not a.skip_buildings:
            cmd = ["build_buildings.py", "--tile", t, "--id-field", a.id_field, "--layer", a.layer]
            if a.height_field:
                cmd += ["--height-field", a.height_field]
            if step(cmd):
                failed.append(f"{t}:buildings")
    # trees need the buildings of the neighbouring tiles (to mask roofs), so they run after all buildings
    for t in tiles:
        if (RAW_DSM.exists() and any(RAW_DSM.rglob("*.tif"))) and step(["build_trees.py", "--tile", t]):
            failed.append(f"{t}:trees")
        if not a.skip_buildings:
            if step(["build_roofcolors.py", "--tile", t]):          # orthophoto 2024 via WMS (cached in data/raw/ortho)
                failed.append(f"{t}:roofcolors")
            if step(["tag_landmarks.py", "--tile", t]):             # needs data/raw/osm/landmarks.json
                failed.append(f"{t}:landmarks")
            if step(["build_ortho_lod.py", "--tile", t]):           # far-LOD photo from the cached orthophoto
                failed.append(f"{t}:ortho")
    step(["build_manifest.py"])
    if failed:
        print(f"\nFAILED: {failed}", file=sys.stderr)
        sys.exit(1)
    print(f"\nBuilt {len(tiles)} tile(s). Open viewer/index.html?tile=<name> via a local server (see README).", file=sys.stderr)


if __name__ == "__main__":
    main()
