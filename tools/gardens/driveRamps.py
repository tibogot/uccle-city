"""DROPPED KERBS AT THE GARAGE DRIVES (claude/reality2, rule garage-has-drive, class C5).

pipeline/build_surfaces.py drops the kerb (class "ramp", cut out of the sidewalk, RAMP_DEPTH deep behind the kerb, the
driveway's width + RAMP_FLARE each side) where UrbIS Topo has a driveway line (CR42L). The garage drives of
tools/gardens/build_gardens.py (data/gardens/<T>.json drives: a rectangle from the painted garage door to the sidewalk's
back edge) reach the sidewalk where UrbIS often surveyed no driveway: the car would climb a full kerb. This patches
data/tiles/<T>/surfaces.json in place, the same cut as the pipeline's: for each drive whose crossing of the sidewalk
(the drive's axis carried on to the nearest kerb within 8 m) meets no ramp yet, the kerb piece across the drive's width
+ RAMP_FLARE each side is buffered RAMP_DEPTH onto the raised side and cut out of the sidewalk polygons as "ramp"; the
flanks (the low walls at a ramp's sides) are traced again for the whole tile as the pipeline does. Idempotent (a drive
with a ramp already is skipped); counts in surfaces.json counts.droppedKerbs.garages.

  python tools/gardens/driveRamps.py --all | --tile T [...]   (after build_gardens.py; then build_gardens.py again:
                                                                the ramps are a street surface its rays read)
"""
from __future__ import annotations

import argparse
import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
import shapely  # noqa: E402
from shapely.geometry import LineString, MultiLineString, Point, Polygon  # noqa: E402
from shapely.ops import linemerge, substring, unary_union  # noqa: E402

import build_surfaces as bs  # noqa: E402
from common import polygon_out, write_json  # noqa: E402

KERB_REACH = 8.0          # m from the drive's sidewalk end to its kerb at most
CLASS = bs.CLASS


def poly_of(rings):
    return Polygon(rings[0], rings[1:])


def patch(tile: str) -> dict:
    sp = ROOT / "data" / "tiles" / tile / "surfaces.json"
    gp = ROOT / "data" / "gardens" / f"{tile}.json"
    if not sp.exists() or not gp.exists():
        return {"tile": tile, "skipped": "no data"}
    surf = json.loads(sp.read_text(encoding="utf-8"))
    drives = json.loads(gp.read_text(encoding="utf-8")).get("drives") or []
    kerbs = [LineString(k) for k in surf.get("kerbs") or [] if len(k) >= 2]
    if not drives or not kerbs:
        return {"tile": tile, "drives": len(drives), "added": 0}
    rows = []
    for s in surf["surfaces"]:
        g = shapely.make_valid(poly_of(s["rings"]))
        rows.append({"rec": s, "geom": g})
    ramps = [r["geom"] for r in rows if r["rec"]["c"] == CLASS["ramp"]]
    ramp_u = unary_union(ramps) if ramps else Polygon()
    zones, added, had, far = [], 0, 0, 0
    for d in drives:
        r = d["ring"]
        if len(r) != 4:
            continue
        # the door edge r[0] r[1], the sidewalk edge r[3] r[2]: the axis from the door's middle through the sidewalk end
        m0 = ((r[0][0] + r[1][0]) / 2, (r[0][1] + r[1][1]) / 2); m1 = ((r[2][0] + r[3][0]) / 2, (r[2][1] + r[3][1]) / 2)
        L = math.hypot(m1[0] - m0[0], m1[1] - m0[1]) or 1
        nx, nz = (m1[0] - m0[0]) / L, (m1[1] - m0[1]) / L
        hw = math.hypot(r[1][0] - r[0][0], r[1][1] - r[0][1]) / 2
        axis = LineString([m1, (m1[0] + nx * KERB_REACH, m1[1] + nz * KERB_REACH)])
        hit = None
        for k in kerbs:
            q = axis.intersection(k)
            if q.is_empty:
                continue
            q = q if q.geom_type == "Point" else min(getattr(q, "geoms", [q]), key=lambda g: Point(m1).distance(g))
            q = q if q.geom_type == "Point" else q.centroid
            if hit is None or Point(m1).distance(q) < Point(m1).distance(hit[1]):
                hit = (k, q)
        if hit is None:
            far += 1
            continue
        k, q = hit
        corridor = LineString([m1, (q.x, q.y)]).buffer(hw, cap_style="flat")
        if not ramp_u.is_empty and corridor.intersection(ramp_u).area > 0.3:
            had += 1
            continue
        c = k.project(q)
        zones.append(substring(k, max(0, c - hw - bs.RAMP_FLARE), min(k.length, c + hw + bs.RAMP_FLARE)))
        added += 1
    if not zones:
        return {"tile": tile, "drives": len(drives), "added": 0, "hadRamp": had, "noKerb": far}

    def one_side(z):
        for g in (z, z.simplify(0.02)):
            try:
                return g.buffer(bs.RAMP_DEPTH, single_sided=True)
            except shapely.errors.GEOSException:
                pass
        return Polygon()
    drop = unary_union([one_side(z) for z in zones if z.length > 0.5])
    out_rows = []
    for r in rows:
        rec = r["rec"]
        if rec["c"] != CLASS["sidewalk"] or not r["geom"].intersects(drop):
            out_rows.append({**rec}); continue
        for p_ in bs.polys_of(shapely.set_precision(r["geom"].intersection(drop), bs.PRECISION)):
            if p_.area >= 0.1:
                out_rows.append({**rec, "c": CLASS["ramp"], "geom": p_})
        for p_ in bs.polys_of(shapely.set_precision(r["geom"].difference(drop), bs.PRECISION)):
            if p_.area >= bs.SLIVER:
                out_rows.append({**rec, "geom": p_})
    # simple rings only (the pipeline's split_holes), back to the file's records
    split_in = [{"rec": rr, "geom": rr.pop("geom")} for rr in out_rows if "geom" in rr]
    kept = [rr for rr in out_rows if "geom" not in rr]
    pieces = bs.split_holes([{**x["rec"], "geom": x["geom"]} for x in split_in])
    new = [*kept, *[{**{k: v for k, v in p.items() if k != "geom"}, "rings": polygon_out(p["geom"])} for p in pieces]]
    surf["surfaces"] = new
    # the flanks for every ramp of the tile, as the pipeline traces them
    allr = [poly_of(s["rings"]) for s in new if s["c"] == CLASS["ramp"]]
    side = [poly_of(s["rings"]) for s in new if s["c"] == CLASS["sidewalk"]]
    ru, su = unary_union(allr), unary_union(side)
    if not ru.is_empty:
        fl = ru.boundary.intersection(su.buffer(bs.KERB_TOL, join_style="mitre")).difference(MultiLineString(kerbs).buffer(0.05))
        surf["flanks"] = [bs.line_out(bs.orient_left(l, ru)) for l in bs.lines_of(linemerge(bs.lines_of(fl))) if l.length >= 0.1]
    dk = surf.setdefault("counts", {}).setdefault("droppedKerbs", {})
    dk["garages"] = dk.get("garages", 0) + added
    dk["rampPolygons"] = sum(1 for s in new if s["c"] == CLASS["ramp"])
    surf["counts"]["surfaces"] = len(new)
    write_json(sp, surf)
    return {"tile": tile, "drives": len(drives), "added": added, "hadRamp": had, "noKerb": far}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", action="append")
    ap.add_argument("--all", action="store_true")
    a = ap.parse_args()
    tiles = a.tile or []
    if a.all:
        tiles = sorted(p.stem for p in (ROOT / "data" / "gardens").glob("*.json") if p.stem[0].isalpha() and p.stem[1:].isdigit())
    tot = {"added": 0, "hadRamp": 0, "noKerb": 0}
    for t in tiles:
        r = patch(t)
        for k in tot:
            tot[k] += r.get(k, 0)
        print(json.dumps(r), file=sys.stderr)
    print(f"garage drive dropped kerbs: {tot}")


if __name__ == "__main__":
    main()
