"""Cut the whole-area network into per-tile roads.json files (CONTRACT 5.1 "Tiling").

    python pipeline/cut_roads.py --tile G4      # one tile
    python pipeline/cut_roads.py                # every tile in the grid

Input: data/roads/network.json (build_roads.py --all, then refine_roads.mjs). Every tile gets the
roads with any part within ROAD_BUFFER (150 m) of the tile, cut at that buffer, so all tiles share
one id space: a road or node has the same id in every tile it appears in. A road cut at the buffer
ends at a new node c<roadId>_a / c<roadId>_b with meta.cut = true. Clipping is done on the PI
polyline (end node, PIs, end node); PIs inside the buffer keep their radius.
"""
from __future__ import annotations

import argparse
import copy
import sys
import time

from shapely.geometry import LineString, MultiLineString, Point, box

from common import CONTRACT, DATA, ROAD_BUFFER, TILES, all_tiles, read_json, round2, tile_bounds, write_json


def cut(net, tile, buffer=ROAD_BUFFER):
    x0, z0, x1, z1 = tile_bounds(tile)
    region = box(x0 - buffer, z0 - buffer, x1 + buffer, z1 + buffer)
    nodes = {n["id"]: n for n in net["nodes"]}
    out_nodes, out_roads, cuts = {}, [], 0

    def keep_node(nid):
        out_nodes.setdefault(nid, copy.deepcopy(nodes[nid]))
        return nid

    def cut_node(nid, x, z):
        out_nodes[nid] = {"id": nid, "x": round2(x), "z": round2(z), "meta": {"cut": True}}
        return nid

    for rd in net["roads"]:
        A, B = nodes[rd["a"]], nodes[rd["b"]]
        pts = [(A["x"], A["z"])] + [(p["x"], p["z"]) for p in rd["pts"]] + [(B["x"], B["z"])]
        line = LineString(pts)
        if region.contains(line):
            out_roads.append(copy.deepcopy(rd))
            keep_node(rd["a"])
            keep_node(rd["b"])
            continue
        clipped = line.intersection(region)
        if clipped.is_empty:
            continue
        geoms = list(clipped.geoms) if isinstance(clipped, MultiLineString) else [clipped] if isinstance(clipped, LineString) else \
            [g for g in getattr(clipped, "geoms", []) if isinstance(g, LineString)]
        geoms = [g for g in geoms if g.length >= 2]
        radius = {(round2(p["x"]), round2(p["z"])): p.get("r") for p in rd["pts"]}
        for k, g in enumerate(geoms):
            c = list(g.coords)
            rid = rd["id"] + (f"_{k}" if len(geoms) > 1 else "")
            a_orig = Point(c[0]).distance(Point(pts[0])) < 0.05
            b_orig = Point(c[-1]).distance(Point(pts[-1])) < 0.05
            a = keep_node(rd["a"]) if a_orig else cut_node(f"c{rid}_a", *c[0])
            b = keep_node(rd["b"]) if b_orig else cut_node(f"c{rid}_b", *c[-1])
            cuts += (not a_orig) + (not b_orig)
            inner = []
            for x, z in c[1:-1]:
                p = {"x": round2(x), "z": round2(z)}
                r = radius.get((p["x"], p["z"]))
                if r is not None:
                    p["r"] = r
                inner.append(p)
            r2 = copy.deepcopy(rd)
            r2.update(id=rid, a=a, b=b, pts=inner)
            r2["meta"]["cut"] = True
            out_roads.append(r2)

    meta = {k: v for k, v in net.get("meta", {}).items() if k not in ("refine", "stats", "tile", "bufferM")}
    refine = net.get("meta", {}).get("refine", {})
    meta.update({"contract": CONTRACT, "tile": tile, "bufferM": buffer, "from": "data/roads/network.json",
                 "refineActions": refine.get("actions"), "generated": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                 "stats": {"roads": len(out_roads), "nodes": len(out_nodes), "cut": cuts,
                           "roundabouts": sum(1 for n in out_nodes.values() if n.get("kind") == "roundabout"),
                           "tram": sum(1 for r in out_roads if r["meta"].get("tram"))}})
    ids = len(out_nodes) + len(out_roads)
    return {"version": net.get("version", 1), "style": "eu", "terrain": "flat", "nextId": ids + 1,
            "nodes": list(out_nodes.values()), "roads": out_roads, "meta": meta}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", nargs="*")
    ap.add_argument("--network", default=str(DATA / "roads" / "network.json"))
    a = ap.parse_args()
    net = read_json(a.network)
    if "refine" not in net.get("meta", {}):
        print("WARNING: network.json has no meta.refine — run node pipeline/refine_roads.mjs on it first", file=sys.stderr)
    for t in [x.upper() for x in a.tile] if a.tile else all_tiles():
        doc = cut(net, t)
        if not doc["roads"]:
            print(f"{t}: no roads", file=sys.stderr)
            continue
        write_json(TILES / t / "roads.json", doc)
        print(f"{t}: {doc['meta']['stats']}", file=sys.stderr)


if __name__ == "__main__":
    main()
