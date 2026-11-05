"""Buildings standing on the road, BEFORE / AFTER ?roads=surface, for one or more tiles (sibling of audit_overlap.py,
same depth measure: how far the road reaches into the building's footprint).

    node tools/dump_road_surfaces.mjs --tile I6      # before: the engine's carriageways + junction pads
    node tools/dump_surface_roads.mjs I6             # after: what ?roads=surface actually draws as road
    python tools/audit_surfaces.py I6 [--min 1.0] [--json data/raw/audit/surfaces-I6.json]

Reported per tile, buildings of >= 8 m² reaching >= --min metres into:
  engine     the road engine's carriageways and junction outlines (today's default view)
  roadway    the measured UrbIS low surfaces (roadway, junction, tram, parking, square) of surfaces.json
  sidewalk   the measured UrbIS sidewalks
  drawn      the asphalt actually drawn with ?roads=surface (measured roadway + the engine's markings clipped
             to it + the engine roads UrbIS does not map), from dump_surface_roads.mjs
"""
from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

import shapely
from shapely.geometry import Polygon
from shapely.ops import unary_union
from shapely.strtree import STRtree

sys.path.insert(0, str(Path(__file__).resolve().parent))
from audit_overlap import AUDIT, TILES, depth, poly  # noqa: E402

LOW = {0, 1, 2, 3, 4}
SIDEWALK = {5}


def hits(buildings, surf, min_depth):
    """[(building id, depth, area, x, z)] for buildings reaching >= min_depth into the union of `surf` polygons."""
    surf = [p for p in surf if p is not None and not p.is_empty]
    if not surf:
        return []
    tree = STRtree(surf)
    out = []
    for b in buildings:
        fp = b["footprint"]
        bp = poly(fp[0]) if fp else None
        if bp is None or bp.area < 8:
            continue
        idx = tree.query(bp, predicate="intersects")
        if len(idx) == 0:
            continue
        ov = unary_union([surf[i].intersection(bp) for i in idx])
        if ov.is_empty or ov.area < 0.5 or ov.geom_type not in ("Polygon", "MultiPolygon"):
            continue
        d = depth(ov, bp)
        if d >= min_depth:
            c = ov.centroid
            out.append({"id": b["id"].rsplit("/", 1)[-1], "depth": round(d, 2), "area": round(ov.area, 1), "x": round(c.x, 1), "z": round(c.y, 1)})
    return sorted(out, key=lambda h: -h["depth"])


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="+")
    ap.add_argument("--min", type=float, default=1.0)
    ap.add_argument("--json", type=Path)
    a = ap.parse_args()
    report = {}
    for t in (x.upper() for x in a.tiles):
        bd = json.loads((TILES / t / "buildings.json").read_text(encoding="utf-8"))["buildings"]
        r = {}
        f = AUDIT / f"{t}.roads.json"
        if f.exists():
            e = json.loads(f.read_text(encoding="utf-8"))
            r["engine"] = hits(bd, [poly(x["poly"]) for x in e["roads"]] + [poly(x["poly"]) for x in e["nodes"]], a.min)
        sf = TILES / t / "surfaces.json"
        if sf.exists():
            s = json.loads(sf.read_text(encoding="utf-8"))["surfaces"]
            mk = lambda x: Polygon(x["rings"][0], x["rings"][1:]).buffer(0)
            r["roadway"] = hits(bd, [mk(x) for x in s if x["c"] in LOW], a.min)
            r["sidewalk"] = hits(bd, [mk(x) for x in s if x["c"] in SIDEWALK], a.min)
        df = AUDIT / f"{t}.surface-drawn.json"
        if df.exists():
            d = json.loads(df.read_text(encoding="utf-8"))
            tris = [Polygon([(q[0], q[1]), (q[2], q[3]), (q[4], q[5])]) for q in d["asphalt"]]
            # union per 50 m block (a single union of 70k triangles is slow)
            blocks = {}
            for p in tris:
                if p.area > 1e-4:
                    c = p.centroid
                    blocks.setdefault((int(c.x // 50), int(c.y // 50)), []).append(p)
            r["drawn"] = hits(bd, [shapely.union_all(v, grid_size=0.005) for v in blocks.values()], a.min)
        report[t] = r
        print(f"{t}: buildings reaching >= {a.min} m into ... " + ", ".join(f"{k} {len(v)}" for k, v in r.items()))
        for k, v in r.items():
            for h in v[:5]:
                print(f"   {k:8} x {h['x']:7.1f} z {h['z']:7.1f}  {h['depth']:5.2f} m deep, {h['area']:6.1f} m2")
    if a.json:
        a.json.parent.mkdir(parents=True, exist_ok=True)
        a.json.write_text(json.dumps({"min": a.min, "tiles": report}, indent=1), encoding="utf-8")
        print(f"-> {a.json}", file=sys.stderr)


if __name__ == "__main__":
    main()
