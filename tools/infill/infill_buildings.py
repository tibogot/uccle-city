"""Infill buildings: houses UrbIS 3D has NO geometry for (a null shape in the BuildingSolids SHP), rebuilt as a simple
solid from measured data and appended to the tile -> data/tiles/<T>/buildings.json + buildings.bin.

    python tools/infill/infill_buildings.py            # every entry of data/overrides.json "infillBuildings"
    python tools/infill/infill_buildings.py --check    # print what would change, write nothing

Why: 631 of the 41,231 UrbIS solids of the Uccle sheets are null shapes (2026-10-03 extract; shops2 2026-11-16). One of
them is Place de Saint-Job 22 (Maison Dandoy, BU 1584080): a lawn and a "tree" stood in the row instead (the CHM
canopy model saw the house's roof as a tree).

Each entry (data/overrides.json infillBuildings.<id>):
  tile, bu (UrbIS building id), footprint [[x, z], ...] (local metres, CONTRACT; the party walls ON the neighbours'
  footprint edges, the front on the street line), base (m, the DTM at the front), eaves, ridge (m, from the UrbIS DSM
  2021: tools/infill/README in docs/SHOPS2.md), ridgeAlong: [i, j] = the footprint edge the ridge runs parallel to (a
  gable roof: the ridge at mid-depth, the two other edges are gable ends), roofColor (linear rgb), _why / _source.
The script is idempotent: the tile's earlier infill solids (source "infill") are removed first (they are always the
last ones), then re-appended; CHM trees (features.json trees, source urbis-chm) whose trunk stands inside an infill
footprint are dropped (moved to features.json treesDropped with their why).
"""
from __future__ import annotations

import argparse
import array
import json
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
TILES = ROOT / "data" / "tiles"


def inside(x, z, poly):
    c = False
    for i in range(len(poly)):
        x1, z1 = poly[i]; x2, z2 = poly[(i + 1) % len(poly)]
        if (z1 > z) != (z2 > z) and x < (x2 - x1) * (z - z1) / (z2 - z1) + x1:
            c = not c
    return c


def ccw(poly):
    """the footprint counter-clockwise seen from above (+y up, z south: the signed area in (x, -z))"""
    a = sum(poly[i][0] * (-poly[(i + 1) % len(poly)][1]) - poly[(i + 1) % len(poly)][0] * (-poly[i][1]) for i in range(len(poly)))
    return poly if a > 0 else poly[::-1]


def solid(e):
    """a gable house: the ridge parallel to edge ridgeAlong at mid-depth; -> (positions, roof tris, wall tris)"""
    fp = [tuple(p) for p in e["footprint"]]
    assert len(fp) == 4, "infill: a quad footprint only (front, party, back, party)"
    i, j = e["ridgeAlong"]
    # the four corners in order a b (the ridge edge), c d (the opposite edge, c next to b)
    a, b = fp[i], fp[j]
    c, d = fp[(j + 1) % 4], fp[(i - 1) % 4]
    base, eav, rid = e["base"], e["eaves"], e["ridge"]
    m1 = ((a[0] + d[0]) / 2, (a[1] + d[1]) / 2)          # ridge ends: mid of the gable edges
    m2 = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
    P, roof, walls = [], [], []

    def v(x, y, z):
        P.append((x, y, z)); return len(P) - 1

    def tri(lst, p, q, r, up=None):
        # wind (p, q, r) so its normal points along `up` (a 3-vector)
        ax, ay, az = P[p]; bx, by, bz = P[q]; cx, cy, cz = P[r]
        e1 = (bx - ax, by - ay, bz - az); e2 = (cx - ax, cy - ay, cz - az)
        n = (e1[1] * e2[2] - e1[2] * e2[1], e1[2] * e2[0] - e1[0] * e2[2], e1[0] * e2[1] - e1[1] * e2[0])
        lst.append((p, q, r) if sum(n[k] * up[k] for k in range(3)) >= 0 else (p, r, q))

    cxm = sum(p[0] for p in fp) / 4; czm = sum(p[1] for p in fp) / 4

    def outward(p, q):
        # the horizontal normal of edge p-q pointing away from the footprint's centre
        tx, tz = q[0] - p[0], q[1] - p[1]
        nx, nz = tz, -tx
        mx, mz = (p[0] + q[0]) / 2, (p[1] + q[1]) / 2
        if (mx - cxm) * nx + (mz - czm) * nz < 0:
            nx, nz = -nx, -nz
        return (nx, 0.0, nz)

    # roof: two slopes (a b m2 m1) and (d m1 m2 c), normals up
    A, B, C, D = v(a[0], eav, a[1]), v(b[0], eav, b[1]), v(c[0], eav, c[1]), v(d[0], eav, d[1])
    M1, M2 = v(m1[0], rid, m1[1]), v(m2[0], rid, m2[1])
    for p, q, r in ((A, B, M2), (A, M2, M1), (D, M1, M2), (D, M2, C)):
        tri(roof, p, q, r, (0, 1, 0))
    # walls: the eaves walls (a-b, c-d) rectangles; the gable walls (b-c, d-a) pentagons
    for p, q in ((a, b), (c, d)):
        o = outward(p, q)
        p0, q0, p1, q1 = v(p[0], base, p[1]), v(q[0], base, q[1]), v(p[0], eav, p[1]), v(q[0], eav, q[1])
        tri(walls, p0, q0, q1, o); tri(walls, p0, q1, p1, o)
    for p, q, m in ((b, c, m2), (d, a, m1)):
        o = outward(p, q)
        p0, q0, p1, q1, mm = v(p[0], base, p[1]), v(q[0], base, q[1]), v(p[0], eav, p[1]), v(q[0], eav, q[1]), v(m[0], rid, m[1])
        tri(walls, p0, q0, q1, o); tri(walls, p0, q1, p1, o); tri(walls, p1, q1, mm, o)
    return P, roof, walls


def apply(tile, entries, check=False):
    jf, bf, ff = TILES / tile / "buildings.json", TILES / tile / "buildings.bin", TILES / tile / "features.json"
    doc = json.loads(jf.read_text(encoding="utf-8"))
    raw = bf.read_bytes()
    V, T = struct.unpack("<II", raw[:8])
    Pf = array.array("f"); Pf.frombytes(raw[8:8 + 12 * V])
    If = array.array("I"); If.frombytes(raw[8 + 12 * V:8 + 12 * V + 12 * T])
    # strip earlier infills (the tail): triangles from the first infill's roof on, their vertices from the smallest index
    old = [b for b in doc["buildings"] if b.get("source") == "infill"]
    if old:
        t0 = min(b["roof"]["first"] for b in old)
        assert all(b["roof"]["first"] >= t0 for b in doc["buildings"] if b.get("source") == "infill")
        v0 = min(If[k] for k in range(3 * t0, 3 * T))
        assert all(If[k] < v0 for k in range(3 * t0)), "infill: earlier infill vertices are not at the tail"
        doc["buildings"] = [b for b in doc["buildings"] if b.get("source") != "infill"]
        Pf = Pf[:3 * v0]; If = If[:3 * t0]; V, T = v0, t0
    added = []
    for key, e in entries:
        P, roof, walls = solid(e)
        vb = V
        for p in P:
            Pf.extend(p)
        V += len(P)
        first = T
        for t in roof + walls:
            If.extend((vb + t[0], vb + t[1], vb + t[2]))
        T += len(roof) + len(walls)
        fp = ccw([[round(p[0], 2), round(p[1], 2)] for p in e["footprint"]])
        rec = {"id": "infill:" + key, "source": "infill", "footprint": [fp], "base": e["base"], "eaves": e["eaves"], "top": e["ridge"],
               "height": round(e["ridge"] - e["base"], 2), "roof": {"first": first, "count": len(roof)},
               "walls": {"first": first + len(roof), "count": len(walls)},
               "attrs": {"BU_ID": "https://databrussels.be/id/building/" + str(e["bu"]), "INFILL": e.get("_source", "")},
               "roofColor": e["roofColor"]}
        doc["buildings"].append(rec)
        added.append(rec["id"])
    doc["count"] = len(doc["buildings"])
    # CHM trees under an infill roof (the house seen as a tree): dropped
    feats = json.loads(ff.read_text(encoding="utf-8"))
    polys = [e["footprint"] for _, e in entries]
    keep, drop = [], []
    for t in feats.get("trees", []):
        (drop if t.get("source") == "urbis-chm" and any(inside(t["x"], t["z"], p) for p in polys) else keep).append(t)
    print(f"{tile}: infill {added}; trees dropped {[t['id'] for t in drop]}; V {V} T {T}")
    if check:
        return
    if drop:
        feats["trees"] = keep
        td = feats.setdefault("treesDropped", [])
        ids = {t["id"] for t in drop}
        td[:] = [t for t in td if t.get("id") not in ids] + [t | {"why": "under an infill building's roof (tools/infill)"} for t in drop]
        if isinstance(feats.get("counts"), dict) and "trees" in feats["counts"]:
            feats["counts"]["trees"] = len(keep)
        ff.write_text(json.dumps(feats, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    bf.write_bytes(struct.pack("<II", V, T) + Pf.tobytes() + If.tobytes())
    jf.write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    a = ap.parse_args()
    ov = json.loads((ROOT / "data" / "overrides.json").read_text(encoding="utf-8"))
    by = {}
    for k, e in (ov.get("infillBuildings") or {}).items():
        if k.startswith("_"):
            continue
        by.setdefault(e["tile"], []).append((k, e))
    for tile, entries in sorted(by.items()):
        apply(tile, entries, a.check)


if __name__ == "__main__":
    sys.exit(main())
