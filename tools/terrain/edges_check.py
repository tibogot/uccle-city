"""Shared tile edges of the 1 m terrain grids (road fix round 3): every pair of neighbouring tiles has the same corner
row / column on their common edge; their heights must match. Prints the mean / max per direction and the worst pairs.

    python tools/terrain/edges_check.py [tiles_dir=data/tiles]
"""
import json
import sys
from pathlib import Path

import numpy as np

D = Path(sys.argv[1] if len(sys.argv) > 1 else "data/tiles")
man = json.loads((Path("data/tiles") / "manifest.json").read_text(encoding="utf-8"))
tiles = {t["name"]: t for t in man["tiles"] if t["status"] == "built"}


def grid(name):
    h = json.loads((D / name / "terrain.json").read_text(encoding="utf-8"))
    g = np.fromfile(D / name / "terrain.u16", dtype="<u2").reshape(h["rows"], h["cols"]).astype(np.float64)
    g[g == h["nodata"]] = np.nan
    return h, g / 100.0


cache = {}
def G(n):
    if n not in cache:
        cache[n] = grid(n)
    return cache[n]


res = {"EW": [], "NS": []}
for a, ta in tiles.items():
    for b, tb in tiles.items():
        if ta["bounds"]["x"][1] == tb["bounds"]["x"][0] and ta["bounds"]["z"] == tb["bounds"]["z"]:
            d = G(a)[1][:, -1] - G(b)[1][:, 0]          # a's east column = b's west column
            res["EW"].append((a, b, np.nanmean(np.abs(d)), np.nanmax(np.abs(d))))
        if ta["bounds"]["z"][1] == tb["bounds"]["z"][0] and ta["bounds"]["x"] == tb["bounds"]["x"]:
            d = G(a)[1][-1, :] - G(b)[1][0, :]          # a's south row = b's north row
            res["NS"].append((a, b, np.nanmean(np.abs(d)), np.nanmax(np.abs(d))))
for k, L in res.items():
    if not L:
        continue
    L.sort(key=lambda r: -r[3])
    print(f"{k}: {len(L)} edges, mean of means {np.mean([r[2] for r in L]):.4f} m, max {L[0][3]:.3f} m; worst: " +
          ", ".join(f"{a}/{b} {m:.3f}/{x:.2f}" for a, b, m, x in L[:5]))
