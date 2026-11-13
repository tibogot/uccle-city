"""Alignment check: Flemish DTM (DHMV II, fetch_dhmv.py) vs the Brussels UrbIS DTM where both exist.

For every tile with a data/raw/dhmv/tiles/<T>.tif, compares both on the tile + margin 1 m grid:
height difference (UrbIS - DHMV) stats, a least-squares fit of a constant vertical offset + a horizontal shift
(d ~ dz + sx * dDHMV/dx + sy * dDHMV/dy, on cells with slope), the difference by distance to the border, and the
seam after build_terrain (step across the border in the built terrain.u16).

    python tools/terrain/border_check.py [--src ../data/raw/urbis/dtm] [--json out.json]
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import numpy as np
from scipy.ndimage import distance_transform_edt

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from build_terrain import FILL_DIR, PAD, fill_grid, urbis_grid  # noqa: E402
from common import ORIGIN_E, ORIGIN_N, RAW, TERRAIN_STEP, TILE, TILES, read_json, tile_bounds  # noqa: E402


def check(tile, src):
    x0, z0, _, _ = tile_bounds(tile)
    n = int(round(TILE / TERRAIN_STEP)) + 1
    P = int(PAD)
    e_w, n_n = ORIGIN_E + x0 - PAD, ORIGIN_N - z0 + PAD
    b, _ = urbis_grid(src, e_w, n_n, n + 2 * P)
    f = fill_grid(FILL_DIR / f"{tile}.tif", e_w, n_n, n + 2 * P)
    both = ~np.isnan(b) & ~np.isnan(f)
    if both.sum() < 100:
        return None
    d = b - f
    # distance (m) of each UrbIS cell to the nearest no-UrbIS cell (the region border / a hole)
    dist = distance_transform_edt(~np.isnan(b))
    gy, gx = np.gradient(np.where(np.isnan(f), 0, f))      # per metre; gy = d/drow (row = south)
    m = both & (dist > 3) & (np.abs(d) < 2) & (np.hypot(gx, gy) > 0.05)
    fit = None
    if m.sum() > 500:
        A = np.stack([np.ones(m.sum()), gx[m], gy[m]], 1)
        sol, *_ = np.linalg.lstsq(A, d[m], rcond=None)
        # d = b - f ~ dz + sx*gx + sy*gy  =>  b(p) ~ f(p + s): DHMV must move by -s to sit on UrbIS
        fit = {"dz": float(sol[0]), "shiftE": float(sol[1]), "shiftN": float(-sol[2]), "cells": int(m.sum())}
    bands = {}
    for lo, hi in ((0, 2), (2, 5), (5, 20), (20, 1e9)):
        mm = both & (dist > lo) & (dist <= hi)
        if mm.sum():
            bands[f"{lo}-{hi if hi < 1e9 else 'inf'}m"] = {"cells": int(mm.sum()), "median": float(np.median(d[mm])),
                                                          "p95abs": float(np.percentile(np.abs(d[mm]), 95))}
    out = {"tile": tile, "cells": int(both.sum()), "mean": float(d[both].mean()), "median": float(np.median(d[both])),
           "p05": float(np.percentile(d[both], 5)), "p95": float(np.percentile(d[both], 95)),
           "maxAbs": float(np.abs(d[both]).max()), "fit": fit, "byBorderDistance": bands}
    # the built tile: the largest step between neighbouring cells across the UrbIS / DHMV seam vs the same steps inside
    h = read_json(TILES / tile / "terrain.json")
    if h.get("fill"):
        g = np.fromfile(TILES / tile / "terrain.u16", dtype="<u2").reshape(n, n).astype(np.float64) / 100
        src_b = ~np.isnan(b[P:P + n, P:P + n])
        cross = (src_b[:, 1:] != src_b[:, :-1])
        stepx = np.abs(np.diff(g, axis=1))
        crossy = (src_b[1:, :] != src_b[:-1, :])
        stepy = np.abs(np.diff(g, axis=0))
        steps = np.concatenate([stepx[cross], stepy[crossy]])
        allst = np.concatenate([stepx.ravel(), stepy.ravel()])
        if steps.size:
            out["seamStep"] = {"cellPairs": int(steps.size), "median": float(np.median(steps)),
                               "p99": float(np.percentile(steps, 99)), "max": float(steps.max()),
                               "tileMedianStep": float(np.median(allst)), "tileP99Step": float(np.percentile(allst, 99))}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", type=Path, default=RAW / "urbis" / "dtm")
    ap.add_argument("--json", type=Path)
    a = ap.parse_args()
    rows = []
    for p in sorted(FILL_DIR.glob("*.tif")):
        r = check(p.stem, a.src)
        if not r:
            continue
        rows.append(r)
        fit = r["fit"] or {}
        ss = r.get("seamStep", {})
        print(f"{r['tile']:>4} cells {r['cells']:>7}  mean {r['mean']:+.3f}  median {r['median']:+.3f}  p5/p95 {r['p05']:+.2f}/{r['p95']:+.2f}"
              f"  max|d| {r['maxAbs']:.2f}  fit dz {fit.get('dz', float('nan')):+.3f} shift E {fit.get('shiftE', float('nan')):+.3f}"
              f" N {fit.get('shiftN', float('nan')):+.3f} m   seam step p99 {ss.get('p99', float('nan')):.3f} max {ss.get('max', float('nan')):.2f}"
              f" (tile p99 {ss.get('tileP99Step', float('nan')):.3f})")
    if rows:
        w = np.array([r["cells"] for r in rows], float)
        fits = [r["fit"] for r in rows if r["fit"]]
        fw = np.array([f["cells"] for f in fits], float)
        allr = {"tiles": len(rows), "cells": int(w.sum()),
                "meanDiff": float((w * [r["mean"] for r in rows]).sum() / w.sum()),
                "medianOfMedians": float(np.median([r["median"] for r in rows])),
                "maxAbs": float(max(r["maxAbs"] for r in rows)),
                "fitDz": float((fw * [f["dz"] for f in fits]).sum() / fw.sum()),
                "fitShiftE": float((fw * [f["shiftE"] for f in fits]).sum() / fw.sum()),
                "fitShiftN": float((fw * [f["shiftN"] for f in fits]).sum() / fw.sum())}
        print("ALL", json.dumps({k: round(v, 3) if isinstance(v, float) else v for k, v in allr.items()}))
        if a.json:
            a.json.write_text(json.dumps({"summary": allr, "tiles": rows}, indent=1))


if __name__ == "__main__":
    main()
