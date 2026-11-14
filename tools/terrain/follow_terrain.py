"""After a terrain rebuild (road fix round 3: build_terrain.py --resample exact on all 120 tiles), the tile data that was
DERIVED from data/tiles/<T>/terrain.u16 follows it, nothing else is touched:

  buildings.json  each building's `base` (build_buildings.py: the lowest DTM sample on the footprint's outer ring + its
                  centroid) and `height` (= top - base). The UrbIS 3D solids keep their own geometry (buildings.bin is
                  not built from the terrain: no building in the city is a 2D extrusion), so only these numbers move.
                  The centroid build_buildings used is the full footprint's (before its 5 cm simplification); here the
                  old base is reproduced from the stored ring first, and the base moves by the new - old minimum.
  features.json   the `y` of the trees filter_road_trees.py moved off the carriageway ("moved"): it re-sampled them
                  from terrain.u16 (the other trees' y come from the raw 0.5 m DTM at the LiDAR peak: unchanged).

    python tools/terrain/follow_terrain.py <old_tiles_dir> [--write]       (new = data/tiles)
Writes with pipeline/common.write_json (byte-identical formatting). Prints per-tile counts and the largest changes.
"""
import argparse
import sys
from pathlib import Path

import numpy as np

sys.path.insert(0, str(Path(__file__).resolve().parents[2] / "pipeline"))
from common import TILES, read_json, round2, write_json  # noqa: E402


def sampler(d: Path, tile: str, clamp: bool):
    h = read_json(d / tile / "terrain.json")
    g = np.fromfile(d / tile / "terrain.u16", dtype="<u2").reshape(h["rows"], h["cols"])

    def at(x, z):       # build_buildings.py Ground.at (clamp=False) / filter_road_trees.py terrain_sampler (clamp=True)
        c = (x - h["x0"]) / h["step"]; r = (z - h["z0"]) / h["step"]
        if clamp:
            c = min(max(c, 0), h["cols"] - 1); r = min(max(r, 0), h["rows"] - 1)
        elif c < 0 or r < 0 or c > h["cols"] - 1 or r > h["rows"] - 1:
            return None
        c0, r0 = min(int(c), h["cols"] - 2), min(int(r), h["rows"] - 2)
        fc, fr = c - c0, r - r0
        q = [int(g[r0, c0]), int(g[r0, c0 + 1]), int(g[r0 + 1, c0]), int(g[r0 + 1, c0 + 1])]
        if h["nodata"] in q:
            return None
        return ((q[0] * (1 - fc) + q[1] * fc) * (1 - fr) + (q[2] * (1 - fc) + q[3] * fc) * fr) / 100
    return at


def ring_min(at, ring):
    pts = list(ring)
    if pts:
        a = np.array(pts, dtype=np.float64)
        pts = pts + [(float(a[:, 0].mean()), float(a[:, 1].mean()))]
    s = [v for v in (at(x, z) for x, z in pts) if v is not None]
    return min(s) if s else None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("old", type=Path)
    ap.add_argument("--write", action="store_true")
    a = ap.parse_args()
    tiles = [t["name"] for t in read_json(TILES / "manifest.json")["tiles"] if t["status"] == "built"]
    tot = {"buildings": 0, "baseMoved": 0, "trees": 0, "treesMoved": 0}
    worst = []
    for T in tiles:
        oldB, newB = sampler(a.old, T, False), sampler(TILES, T, False)
        oldT, newT = sampler(a.old, T, True), sampler(TILES, T, True)
        bp = TILES / T / "buildings.json"
        doc = read_json(bp)
        nb = 0
        for b in doc["buildings"]:
            ring = (b.get("footprint") or [[]])[0]
            o, n = ring_min(oldB, ring), ring_min(newB, ring)
            tot["buildings"] += 1
            if o is None or n is None or b.get("base") is None:
                continue
            base = round2(n) if abs(o - b["base"]) < 0.006 else round2(b["base"] + (n - o))
            if base != b["base"]:
                worst.append((abs(base - b["base"]), T, b["id"], b["base"], base))
                b["base"] = base
                b["height"] = round2(b["top"] - base)
                nb += 1
        fp = TILES / T / "features.json"
        feats = read_json(fp)
        nt = 0
        for t in feats.get("trees", []):
            if "moved" not in t or "y" not in t:
                continue
            tot["trees"] += 1
            y = newT(t["x"], t["z"])
            if y is not None and round2(y) != t["y"]:
                t["y"] = round2(y); nt += 1
        tot["baseMoved"] += nb; tot["treesMoved"] += nt
        if nb or nt:
            print(f"{T}: {nb} building bases, {nt} moved trees' y")
        if a.write:
            if nb:
                write_json(bp, doc)
            if nt:
                write_json(fp, feats)
    worst.sort(reverse=True)
    print(tot)
    print("largest base changes:", [(t, i, o, n) for _, t, i, o, n in worst[:8]])


if __name__ == "__main__":
    main()
