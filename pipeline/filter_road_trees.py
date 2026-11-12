"""Trees standing on the carriageway -> moved onto the nearest sidewalk / median / verge, or dropped.

build_trees.py places a tree at each LiDAR canopy-height PEAK. A street tree's crown leans over the road, so its
peak often lies over the carriageway, metres from the trunk in its pit on the sidewalk. Drawn there, the trunk
stands in the middle of the road (and the car hits it). This step checks every tree of a tile against the MEASURED
UrbIS street surfaces (surfaces.json, pipeline/build_surfaces.py; the viewer draws exactly these):

  1. a tree is ON THE CARRIAGEWAY when its point is covered by a roadway, tram roadway or parking surface, or lies
     within TRAM_ENV of a tram track (a tram reservation's grass verges keep their tree rows), and no other
     surface class covers it. Trees on sidewalks (tree pits), medians, central reservations, squares,
     paths and outside the measured street are never touched;
  2. it MOVES to the nearest point that is CLEAR metres outside every carriageway surface (the trunk + a margin),
     not inside a building footprint, inside the tile, at most clamp(0.8 x crown, MOVE_MIN, MOVE_MAX) away (the
     peak is at most about a crown radius from its trunk);
  3. it is DROPPED when there is no such point, or when the new spot is within DUP of another tree (the trunk the
     crown belongs to is probably there already).

features.json: moved trees keep their id and get "moved": [x, z] (where the peak was); "y" is re-sampled from the
tile's terrain.u16 (DTM). Dropped trees go to "treesDropped" (with "why"); the summary is "treesRoadFilter".
Idempotent (a moved tree is off the carriageway). Run after build_trees.py and build_surfaces.py:

    python pipeline/filter_road_trees.py --tile G4 [--dry-run] [--report out.json]
    python pipeline/filter_road_trees.py --all
"""
from __future__ import annotations

import argparse
import json
import math
import sys

import numpy as np
from shapely.geometry import LineString, Point, Polygon
from shapely.ops import nearest_points, unary_union
from shapely.strtree import STRtree

from common import TILES, all_tiles, read_json, round2, tile_bounds, write_json

CARRIAGE = {0, 1, 3}         # surfaces.json classes: roadway, tramRoad (shared with trams), parking
TRAM_SITE = 2                # a tram reservation: only its tracks' envelope counts (its verges have real tree rows)
TRAM_ENV = 1.6               # m from an OSM tram track centreline: the tram's half width (1.15 m) + a margin
CLEAR = 0.6                  # m: trunk radius (<= 0.5 m) + a margin from the carriageway edge
MOVE_MIN, MOVE_MAX = 1.5, 4.0
DUP = 1.8                    # m: a moved tree this close to another tree is a duplicate


def polys_of(surf):
    out = []
    for s in surf["surfaces"]:
        r = s["rings"]
        if not r or len(r[0]) < 3:
            continue
        p = Polygon(r[0], [h for h in r[1:] if len(h) >= 3])
        if not p.is_valid:
            p = p.buffer(0)
        if not p.is_empty:
            out.append((s["c"], p))
    return out


def terrain_sampler(tile):
    h = read_json(TILES / tile / "terrain.json")
    g = np.fromfile(TILES / tile / "terrain.u16", dtype="<u2").reshape(h["rows"], h["cols"])

    def at(x, z):
        c = min(max((x - h["x0"]) / h["step"], 0), h["cols"] - 1)
        r = min(max((z - h["z0"]) / h["step"], 0), h["rows"] - 1)
        c0, r0 = min(int(c), h["cols"] - 2), min(int(r), h["rows"] - 2)
        fc, fr = c - c0, r - r0
        q = [int(g[r0, c0]), int(g[r0, c0 + 1]), int(g[r0 + 1, c0]), int(g[r0 + 1, c0 + 1])]
        if h["nodata"] in q:
            return None
        return ((q[0] * (1 - fc) + q[1] * fc) * (1 - fr) + (q[2] * (1 - fc) + q[3] * fc) * fr) / 100
    return at


def run(tile, dry=False):
    fpath, spath = TILES / tile / "features.json", TILES / tile / "surfaces.json"
    if not spath.exists() or not fpath.exists():
        return None
    feats, surf = read_json(fpath), read_json(spath)
    x0, z0, x1, z1 = tile_bounds(tile)
    polys = polys_of(surf)
    cls = [c for c, _ in polys]
    geoms = [p for _, p in polys]
    idx = STRtree(geoms)
    tracks = [LineString(l["line"]) for l in feats.get("lines", []) if l.get("kind") == "tram" and len(l.get("line", [])) >= 2]
    tram_env = unary_union([t.buffer(TRAM_ENV) for t in tracks]) if tracks else None
    parts = [p for c, p in polys if c in CARRIAGE] + ([tram_env] if tram_env is not None else [])
    carriage = unary_union(parts) if parts else None
    if carriage is None:
        return {"tile": tile, "trees": len(feats.get("trees", [])), "onCarriageway": 0, "moved": 0, "dropped": 0, "byClass": {}, "moveDist": {"median": 0, "max": 0}, "dropWhy": {}, "movedList": [], "droppedList": []}
    keepout = carriage.buffer(CLEAR)
    blds = []
    bpath = TILES / tile / "buildings.json"
    if bpath.exists():
        for b in read_json(bpath)["buildings"]:
            fp = b.get("footprint") or []
            if fp and len(fp[0]) >= 3:
                p = Polygon(fp[0], [h for h in fp[1:] if len(h) >= 3])
                blds.append(p if p.is_valid else p.buffer(0))
    bidx = STRtree(blds) if blds else None
    ground = terrain_sampler(tile)

    trees = feats.get("trees", [])
    flagged, by_class = [], {}
    for i, t in enumerate(trees):
        pt = Point(t["x"], t["z"])
        hit = {cls[k] for k in idx.query(pt) if geoms[k].covers(pt)}
        on_tracks = tram_env is not None and tram_env.covers(pt)
        if hit and (hit <= CARRIAGE or (on_tracks and hit <= CARRIAGE | {TRAM_SITE})):
            flagged.append(i)
            k = str(min(hit))
            by_class[k] = by_class.get(k, 0) + 1
    flagged_set = set(flagged)
    # where the other trees stand (grid), for the duplicate test
    cell = 4.0
    grid = {}
    for i, t in enumerate(trees):
        if i not in flagged_set:
            grid.setdefault((int(t["x"] // cell), int(t["z"] // cell)), []).append((t["x"], t["z"]))

    def near_tree(x, z):
        gi, gj = int(x // cell), int(z // cell)
        for a in range(gi - 1, gi + 2):
            for b in range(gj - 1, gj + 2):
                for px, pz in grid.get((a, b), ()):
                    if (px - x) ** 2 + (pz - z) ** 2 < DUP * DUP:
                        return True
        return False

    def in_building(x, z):
        if not bidx:
            return False
        p = Point(x, z)
        return any(blds[k].covers(p) for k in bidx.query(p))

    moved, dropped, out = [], [], []
    boundary = keepout.boundary
    for i, t in enumerate(trees):
        if i not in flagged_set:
            out.append(t)
            continue
        pt = Point(t["x"], t["z"])
        lim = min(MOVE_MAX, max(MOVE_MIN, 0.8 * float(t.get("crown") or 3.0)))
        q = nearest_points(boundary, pt)[0]
        d = pt.distance(q)
        why = None
        nx = nz = None
        if d > lim:
            why = f"no clear ground within {lim:.1f} m (nearest {d:.1f} m)"
        else:
            # one step past the edge, away from the carriageway
            ux, uz = (q.x - pt.x) / (d or 1), (q.y - pt.y) / (d or 1)
            nx, nz = q.x + ux * 0.05, q.y + uz * 0.05
            if keepout.covers(Point(nx, nz)):
                why = "the nearest edge leads into another carriageway"
            elif not (x0 <= nx < x1 and z0 <= nz < z1):
                why = "the clear ground is in the next tile"
            elif in_building(nx, nz):
                why = "the clear ground is inside a building"
            elif near_tree(nx, nz):
                why = f"another tree within {DUP} m of the clear ground (its crown's own trunk)"
        if why:
            dropped.append({**t, "why": why})
            continue
        y = ground(nx, nz)
        nt = {**t, "x": round2(nx), "z": round2(nz), "moved": [t["x"], t["z"]]}
        if y is not None:
            nt["y"] = round2(y)
        out.append(nt)
        moved.append(nt)
        grid.setdefault((int(nx // cell), int(nz // cell)), []).append((nx, nz))
    rep = {"tile": tile, "trees": len(trees), "onCarriageway": len(flagged), "moved": len(moved), "dropped": len(dropped), "byClass": by_class,
           "moveDist": {"median": round2(float(np.median([math.hypot(m["x"] - m["moved"][0], m["z"] - m["moved"][1]) for m in moved]))) if moved else 0,
                        "max": round2(max([math.hypot(m["x"] - m["moved"][0], m["z"] - m["moved"][1]) for m in moved], default=0))},
           "dropWhy": {}}
    for d in dropped:
        k = d["why"].split(" (")[0].split(" within")[0]
        rep["dropWhy"][k] = rep["dropWhy"].get(k, 0) + 1
    rep["movedList"] = [[m["moved"][0], m["moved"][1], m["x"], m["z"], m.get("height")] for m in moved]
    rep["droppedList"] = [[d["x"], d["z"], d.get("height"), d["why"]] for d in dropped]
    if not dry and (moved or dropped):
        feats["trees"] = out
        feats["treesDropped"] = (feats.get("treesDropped") or []) + dropped
        prev = feats.get("treesRoadFilter") or {}
        feats["treesRoadFilter"] = {"classes": sorted(CARRIAGE), "tramEnvelope": TRAM_ENV, "clear": CLEAR, "move": [MOVE_MIN, MOVE_MAX], "dup": DUP,
                                    "moved": prev.get("moved", 0) + len(moved), "dropped": prev.get("dropped", 0) + len(dropped)}
        if "counts" in feats:
            feats["counts"]["trees"] = len(out)
        write_json(fpath, feats)
    return rep


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", action="append", default=[])
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--report")
    a = ap.parse_args()
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tile]
    reps = []
    for t in tiles:
        r = run(t, a.dry_run)
        if r is None:
            continue
        reps.append(r)
        print(f"{t}: {r['trees']} trees, {r['onCarriageway']} on the carriageway {r['byClass']} -> {r['moved']} moved "
              f"(median {r['moveDist']['median']} m, max {r['moveDist']['max']} m), {r['dropped']} dropped {r['dropWhy']}", file=sys.stderr)
    tot = {k: sum(r[k] for r in reps) for k in ("trees", "onCarriageway", "moved", "dropped")}
    print(f"TOTAL {len(reps)} tiles: {tot}" + (" (dry run)" if a.dry_run else ""), file=sys.stderr)
    if a.report:
        with open(a.report, "w") as f:
            json.dump({"total": tot, "tiles": reps}, f)


if __name__ == "__main__":
    main()
