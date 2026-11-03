"""Tag UrbIS buildings that are landmarks (churches, chapels, synagogues...) from OSM.

Reads data/raw/osm/landmarks.json (Overpass: amenity=place_of_worship and building=church|chapel|
cathedral ways and relations, with their nodes; see fetch_osm.py --landmarks) and sets, on every
building of the tile whose footprint lies at least 30 % inside such an outline (and every other solid
with the same UrbIS BU_ID),
    attrs._landmark = { "kind": "church" | "chapel" | "synagogue" | "orthodox" | "worship",
                        "name": ..., "osm": "way/<id>", "material"?: ..., "colour"?: ..., "roofMaterial"?: ... }
The viewer gives landmarks their own façade (stone, tall arched stained-glass windows, a portal).

    python pipeline/tag_landmarks.py --tile G4
"""
from __future__ import annotations

import argparse
import sys

from shapely.geometry import Polygon

from common import RAW, TILES, read_json, wgs_to_local, write_json


def outlines():
    p = RAW / "osm" / "landmarks.json"
    if not p.exists():
        return []
    d = read_json(p)
    nodes = {e["id"]: (e["lon"], e["lat"]) for e in d["elements"] if e["type"] == "node"}
    ways = {e["id"]: e for e in d["elements"] if e["type"] == "way"}
    out = []

    def poly(node_ids):
        pts = [nodes[n] for n in node_ids if n in nodes]
        if len(pts) < 4:
            return None
        xs, zs = wgs_to_local([p[0] for p in pts], [p[1] for p in pts])
        pg = Polygon(list(zip(xs, zs))).buffer(0)
        return pg if not pg.is_empty else None

    for e in d["elements"]:
        t = e.get("tags", {})
        if e["type"] not in ("way", "relation") or not t:
            continue
        if e["type"] == "way":
            pg = poly(e["nodes"])
        else:
            outer = [poly(ways[m["ref"]]["nodes"]) for m in e.get("members", []) if m["type"] == "way" and m.get("role") == "outer" and m["ref"] in ways]
            outer = [o for o in outer if o is not None]
            pg = outer[0] if outer else None
            for o in outer[1:]:
                pg = pg.union(o)
        if pg is None:
            continue
        rel, b = t.get("religion"), t.get("building")
        kind = ("synagogue" if rel == "jewish" else "orthodox" if "orthodox" in (t.get("denomination") or "")
                else "chapel" if b == "chapel" or "chapel" in (t.get("name") or "").lower() or "chapelle" in (t.get("name") or "").lower()
                else "church" if rel == "christian" or b in ("church", "cathedral") else "worship")
        info = {"kind": kind, "name": t.get("name"), "osm": f"{e['type']}/{e['id']}"}
        for k, kk in (("building:material", "material"), ("building:colour", "colour"), ("roof:material", "roofMaterial"), ("roof:colour", "roofColour")):
            if t.get(k):
                info[kk] = t[k]
        out.append((pg, info))
    return out


def build(tile):
    marks = outlines()
    doc = read_json(TILES / tile / "buildings.json")
    n = 0
    for b in doc["buildings"]:
        b.get("attrs", {}).pop("_landmark", None)
        fp = Polygon(b["footprint"][0]).buffer(0)
        if fp.is_empty or fp.area < 1:
            continue
        for pg, info in marks:
            if fp.intersects(pg) and fp.intersection(pg).area >= 0.3 * fp.area:
                b.setdefault("attrs", {})["_landmark"] = info
                n += 1
                break
    # every solid of a tagged UrbIS building (same BU_ID) is part of the landmark (annexes, chapels, towers)
    by_bu = {b["attrs"]["BU_ID"]: b["attrs"]["_landmark"] for b in doc["buildings"]
             if b.get("attrs", {}).get("_landmark") and b["attrs"].get("BU_ID")}
    for b in doc["buildings"]:
        a = b.setdefault("attrs", {})
        if not a.get("_landmark") and a.get("BU_ID") in by_bu:
            a["_landmark"] = by_bu[a["BU_ID"]]
            n += 1
    write_json(TILES / tile / "buildings.json", doc)
    return n, len(marks)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    a = ap.parse_args()
    n, m = build(a.tile.upper())
    print(f"landmarks {a.tile.upper()}: {n} building solids tagged ({m} OSM outlines)", file=sys.stderr)


if __name__ == "__main__":
    main()
