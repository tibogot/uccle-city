"""Full pipeline for one tile. Raw inputs must already be in data/raw/ (fetch_osm.py, fetch_urbis.py).

    python pipeline/run_tile.py G4 [--skip-buildings] [--skip-terrain] [--id-field X] [--height-field H]

A missing UrbIS input skips that layer with a message (never substitutes data).
"""
from __future__ import annotations

import argparse
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent


def step(args):
    print(f"\n$ {' '.join(args)}", file=sys.stderr)
    return subprocess.call([sys.executable, *args], cwd=HERE)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tile")
    ap.add_argument("--skip-buildings", action="store_true")
    ap.add_argument("--skip-terrain", action="store_true")
    ap.add_argument("--id-field")
    ap.add_argument("--height-field")
    a = ap.parse_args()
    t = a.tile.upper()
    failed = []
    for name, cmd in (("roads", ["build_roads.py", "--tile", t]), ("features", ["build_features.py", "--tile", t])):
        if step(cmd):
            failed.append(name)
    if not a.skip_terrain and step(["build_terrain.py", "--tile", t]):
        failed.append("terrain")
    if not a.skip_buildings:
        cmd = ["build_buildings.py", "--tile", t]
        if a.id_field:
            cmd += ["--id-field", a.id_field]
        if a.height_field:
            cmd += ["--height-field", a.height_field]
        if step(cmd):
            failed.append("buildings")
    step(["build_manifest.py"])
    if failed:
        print(f"\nFAILED layers: {failed}", file=sys.stderr)
        sys.exit(1)
    print(f"\nTile {t} built. Open debug/index.html via a local server (see README).", file=sys.stderr)


if __name__ == "__main__":
    main()
