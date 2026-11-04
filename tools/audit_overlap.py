"""Buildings standing on the road: intersect every UrbIS footprint with the road engine's carriageways
(kerb to kerb) and junction outlines, per tile. Lists the worst spots with coordinates and street names so
they can be visited in the viewer (?at=x,z&view=walk).

    node tools/dump_road_surfaces.mjs            # first: data/raw/audit/<T>.roads.json
    python tools/audit_overlap.py [--min 1.0] [--top 40] [--json data/raw/audit/overlap.json]

Overlap depth = how far the road reaches into the building (the largest distance from the building's outline
to a point of the overlap), which is what you see on screen; area alone flags long thin slivers.
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from shapely.geometry import Polygon
from shapely.strtree import STRtree
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
TILES = ROOT / "data" / "tiles"
AUDIT = ROOT / "data" / "raw" / "audit"


def poly(pts):
    try:
        p = Polygon(pts).buffer(0)
        return p if p.area > 0.01 else None
    except Exception:
        return None


def depth(ov, b):
    """How deep the overlap reaches into building b (m): max distance from b's outline over ov's vertices."""
    ring = b.exterior
    pts = [pt for g in getattr(ov, "geoms", [ov]) for pt in g.exterior.coords]
    return max((ring.distance(__import__("shapely").geometry.Point(p)) for p in pts), default=0.0)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--min", type=float, default=1.0, help="report overlaps deeper than this (m)")
    ap.add_argument("--top", type=int, default=40)
    ap.add_argument("--json", type=Path, default=AUDIT / "overlap.json")
    a = ap.parse_args()
    man = json.loads((TILES / "manifest.json").read_text(encoding="utf-8"))
    hits, per_tile = [], {}
    for t in man["tiles"]:
        f = AUDIT / f"{t['name']}.roads.json"
        bf = TILES / t["name"] / "buildings.json"
        if not f.exists() or not bf.exists():
            continue
        rd = json.loads(f.read_text(encoding="utf-8"))
        surf = [(r, poly(r["poly"])) for r in rd["roads"]] + [({"id": n["id"], "type": "junction", "name": None}, poly(n["poly"])) for n in rd["nodes"]]
        surf = [(r, p) for r, p in surf if p is not None]
        if not surf:
            continue
        tree = STRtree([p for _, p in surf])
        bd = json.loads(bf.read_text(encoding="utf-8"))
        n = 0
        for b in bd["buildings"]:
            fp = b["footprint"]
            bp = poly(fp[0]) if fp else None
            if bp is None or bp.area < 8:            # sheds and kiosks
                continue
            idx = tree.query(bp, predicate="intersects")
            if len(idx) == 0:
                continue
            ov = unary_union([surf[i][1].intersection(bp) for i in idx])
            if ov.is_empty or ov.area < 0.5:
                continue
            dmax = depth(ov, bp) if ov.geom_type in ("Polygon", "MultiPolygon") else 0.0
            if dmax < a.min:
                continue
            roads = sorted({(surf[i][0].get("name") or surf[i][0].get("type") or "?") for i in idx if surf[i][1].intersects(bp)})
            c = ov.centroid
            hits.append({"tile": t["name"], "x": round(c.x, 1), "z": round(c.y, 1), "depth": round(dmax, 2), "area": round(ov.area, 1),
                         "buildingArea": round(bp.area, 1), "height": b.get("height"), "roads": roads, "id": b["id"].rsplit("/", 1)[-1]})
            n += 1
        per_tile[t["name"]] = n
    hits.sort(key=lambda h: -h["depth"])
    a.json.parent.mkdir(parents=True, exist_ok=True)
    a.json.write_text(json.dumps({"min": a.min, "perTile": per_tile, "hits": hits}, ensure_ascii=False, indent=1), encoding="utf-8")
    total = len(hits)
    bins = {k: sum(1 for h in hits if lo <= h["depth"] < hi) for k, (lo, hi) in
            {"1-2 m": (1, 2), "2-4 m": (2, 4), "4-8 m": (4, 8), "8 m+": (8, 1e9)}.items()}
    print(f"buildings reaching >= {a.min} m into the road: {total}  {bins}")
    worst = sorted(per_tile.items(), key=lambda kv: -kv[1])[:10]
    print("worst tiles:", ", ".join(f"{k} {v}" for k, v in worst))
    for h in hits[: a.top]:
        print(f"  {h['tile']:4} x {h['x']:8.1f} z {h['z']:8.1f}  {h['depth']:5.2f} m deep, {h['area']:6.1f} m2  {', '.join(map(str, h['roads']))[:60]}")
    print(f"-> {a.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
