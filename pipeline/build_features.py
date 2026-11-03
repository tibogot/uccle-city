"""OSM trees, parks/green areas, tram/foot lines and point features -> data/tiles/<T>/features.json (CONTRACT §5.4).

    python pipeline/build_features.py --tile G4
"""
from __future__ import annotations

import argparse
import sys

from shapely import prepare
from shapely.geometry import LineString, MultiLineString, MultiPolygon, Point, Polygon, box

from common import CONTRACT, TILES, polygon_out, round2, study_polygon_local, tile_bounds, write_json
from osm import load_osm, multipolygons

AREA_KIND = [
    (("leisure", "park"), "park"), (("leisure", "garden"), "garden"), (("leisure", "playground"), "playground"),
    (("leisure", "pitch"), "pitch"), (("landuse", "grass"), "grass"), (("landuse", "meadow"), "grass"),
    (("landuse", "village_green"), "grass"), (("landuse", "recreation_ground"), "park"),
    (("landuse", "forest"), "wood"), (("natural", "wood"), "wood"), (("natural", "scrub"), "scrub"),
    (("natural", "water"), "water"), (("landuse", "cemetery"), "cemetery"),
]
LINE_KIND = {"footway": "footway", "path": "path", "cycleway": "cycleway", "steps": "steps",
             "pedestrian": "pedestrian", "track": "path", "bridleway": "path"}
POINT_KIND = {
    ("highway", "crossing"): "crossing", ("highway", "traffic_signals"): "traffic_signals",
    ("highway", "bus_stop"): "bus_stop", ("highway", "street_lamp"): "street_lamp", ("highway", "stop"): "stop",
    ("highway", "give_way"): "give_way", ("highway", "turning_circle"): "turning_circle",
    ("highway", "mini_roundabout"): "mini_roundabout",
    ("railway", "tram_stop"): "tram_stop", ("railway", "crossing"): "rail_crossing", ("railway", "level_crossing"): "level_crossing",
    ("amenity", "bench"): "bench", ("amenity", "bicycle_parking"): "bicycle_parking", ("amenity", "fountain"): "fountain",
}
SHOP_AMENITIES = ("cafe", "restaurant", "bar", "pub", "fast_food", "pharmacy", "bank", "ice_cream")
KEEP_TAGS = ("shop", "amenity", "shelter", "tram", "bus", "name", "crossing", "crossing:markings", "crossing:signals", "ref", "route_ref", "network", "operator",
             "surface", "lit", "bicycle", "foot", "layer", "bridge", "tunnel", "railway", "highway", "public_transport")


def area_kind(tags):
    for (k, v), kind in AREA_KIND:
        if tags.get(k) == v:
            return kind
    return None


def lines_of(g):
    if g.is_empty:
        return []
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, MultiLineString):
        return list(g.geoms)
    return [x for x in getattr(g, "geoms", []) if isinstance(x, LineString)]


def polys_of(g):
    if g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    if isinstance(g, MultiPolygon):
        return list(g.geoms)
    return [x for x in getattr(g, "geoms", []) if isinstance(x, Polygon)]


def build(osm, tile):
    x0, z0, x1, z1 = tile_bounds(tile)
    clip = box(x0, z0, x1, z1).intersection(study_polygon_local())
    out = {"contract": CONTRACT, "tile": tile, "source": {"osm": osm.meta.get("osm_base")},
           "trees": [], "treeRows": [], "areas": [], "lines": [], "points": []}

    prepare(clip)

    def inside(x, z):
        return x0 <= x < x1 and z0 <= z < z1 and clip.covers(Point(x, z))

    for nid, n in osm.nodes.items():
        if "x" not in n or not n["tags"]:
            continue
        t = n["tags"]
        if not inside(n["x"], n["z"]):
            continue
        if t.get("natural") == "tree":
            tree = {"id": f"osm:n{nid}", "x": round2(n["x"]), "z": round2(n["z"])}
            for src, dst in (("species", "species"), ("genus", "genus"), ("leaf_type", "leafType"),
                             ("height", "height"), ("diameter_crown", "crown")):
                if src in t:
                    v = t[src]
                    if dst in ("height", "crown"):
                        try:
                            v = float(str(v).replace("m", "").strip())
                        except ValueError:
                            continue
                    tree[dst] = v
            out["trees"].append(tree)
            continue
        kind = next((kd for (k, v), kd in POINT_KIND.items() if t.get(k) == v), None)
        if kind is None and (t.get("shop") or t.get("amenity") in SHOP_AMENITIES):
            kind = "shop"                                   # ground-floor shopfronts (viewer/shopfronts)
        if kind is None and t.get("public_transport") in ("platform", "stop_position"):
            kind = "pt_" + t["public_transport"]
        if kind:
            out["points"].append({"id": f"osm:n{nid}", "kind": kind, "x": round2(n["x"]), "z": round2(n["z"]),
                                  "tags": {k: t[k] for k in KEEP_TAGS if k in t}})

    for wid, w in osm.ways.items():
        t = w["tags"]
        pts = osm.coords(w["nodes"])
        if len(pts) < 2:
            continue
        closed = w["nodes"][0] == w["nodes"][-1] and len(pts) >= 4
        ak = area_kind(t)
        if ak and closed:
            for p in polys_of(Polygon(pts).buffer(0).intersection(clip)):
                a = {"id": f"osm:w{wid}", "kind": ak, "rings": polygon_out(p)}
                if "name" in t:
                    a["name"] = t["name"]
                out["areas"].append(a)
            continue
        if t.get("natural") == "tree_row":
            for g in lines_of(LineString(pts).intersection(clip)):
                out["treeRows"].append({"id": f"osm:w{wid}", "line": [[round2(x), round2(z)] for x, z in g.coords]})
            continue
        kind = None
        if t.get("railway") == "tram":
            kind = "tram"
        elif t.get("railway") in ("rail", "light_rail"):
            kind = "rail"
        elif t.get("railway") == "platform" or t.get("public_transport") == "platform":
            kind = "platform"                               # tram / bus platform edge (line or closed outline)
        elif t.get("highway") in LINE_KIND:
            kind = LINE_KIND[t["highway"]]
        if kind:
            for g in lines_of(LineString(pts).intersection(clip)):
                out["lines"].append({"id": f"osm:w{wid}", "kind": kind, "line": [[round2(x), round2(z)] for x, z in g.coords],
                                     "tags": {k: t[k] for k in KEEP_TAGS if k in t}})

    for rid, r in osm.relations.items():
        t = r["tags"]
        ak = area_kind(t)
        if not ak or t.get("type") != "multipolygon":
            continue
        g = multipolygons(osm, r)
        if g is None:
            continue
        for p in polys_of(g.intersection(clip)):
            a = {"id": f"osm:r{rid}", "kind": ak, "rings": polygon_out(p)}
            if "name" in t:
                a["name"] = t["name"]
            out["areas"].append(a)

    out["counts"] = {k: len(out[k]) for k in ("trees", "treeRows", "areas", "lines", "points")}
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    args = ap.parse_args()
    tile = args.tile.upper()
    doc = build(load_osm(), tile)
    path = TILES / tile / "features.json"
    write_json(path, doc)
    print(f"{path}: {doc['counts']}", file=sys.stderr)


if __name__ == "__main__":
    main()
