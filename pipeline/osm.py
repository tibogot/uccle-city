"""Load the Overpass extract (data/raw/osm/area.json) and project it to local metres."""
from __future__ import annotations

from dataclasses import dataclass, field

from common import RAW, read_json, wgs_to_local


@dataclass
class OsmData:
    nodes: dict = field(default_factory=dict)      # id -> {"x","z","tags"}
    ways: dict = field(default_factory=dict)       # id -> {"nodes":[ids],"tags"}
    relations: dict = field(default_factory=dict)  # id -> {"members":[...],"tags"}
    meta: dict = field(default_factory=dict)

    def coords(self, node_ids):
        out = []
        for nid in node_ids:
            n = self.nodes.get(nid)
            if n is not None:
                out.append((n["x"], n["z"]))
        return out


def load_osm(path=None) -> OsmData:
    path = path or (RAW / "osm" / "area.json")
    if not path.exists():
        raise SystemExit(f"missing {path} — run pipeline/fetch_osm.py first")
    doc = read_json(path)
    d = OsmData()
    d.meta = {
        "osm_base": doc.get("osm3s", {}).get("timestamp_osm_base"),
        "fetched": doc.get("_query", {}).get("fetched"),
        "bbox": doc.get("_query", {}).get("bbox"),
    }
    lons, lats, ids = [], [], []
    for el in doc["elements"]:
        t = el["type"]
        if t == "node":
            ids.append(el["id"])
            lons.append(el["lon"])
            lats.append(el["lat"])
            d.nodes[el["id"]] = {"tags": el.get("tags", {})}
        elif t == "way":
            d.ways[el["id"]] = {"nodes": el.get("nodes", []), "tags": el.get("tags", {})}
        elif t == "relation":
            d.relations[el["id"]] = {"members": el.get("members", []), "tags": el.get("tags", {})}
    if ids:
        xs, zs = wgs_to_local(lons, lats)  # pyproj vectorises over lists
        for nid, x, z in zip(ids, xs, zs):
            d.nodes[nid]["x"] = float(x)
            d.nodes[nid]["z"] = float(z)
    return d


def multipolygons(d: OsmData, rel):
    """Assemble an OSM multipolygon relation into shapely polygons (outer/inner rings joined by shared ends)."""
    from shapely.geometry import Polygon
    from shapely.ops import unary_union

    def rings(role):
        segs = [list(d.ways[m["ref"]]["nodes"]) for m in rel["members"]
                if m["type"] == "way" and m.get("role", "outer") in role and m["ref"] in d.ways]
        out = []
        while segs:
            cur = segs.pop(0)
            changed = True
            while cur[0] != cur[-1] and changed:
                changed = False
                for k, s in enumerate(segs):
                    if s[0] == cur[-1]:
                        cur += s[1:]
                    elif s[-1] == cur[-1]:
                        cur += s[::-1][1:]
                    elif s[-1] == cur[0]:
                        cur = s + cur[1:]
                    elif s[0] == cur[0]:
                        cur = s[::-1] + cur[1:]
                    else:
                        continue
                    segs.pop(k)
                    changed = True
                    break
            pts = d.coords(cur)
            if cur[0] == cur[-1] and len(pts) >= 4:
                out.append(Polygon(pts).buffer(0))
        return out

    outer = unary_union(rings(("outer", ""))) if rel else None
    inner = rings(("inner",))
    if outer is None or outer.is_empty:
        return None
    if inner:
        outer = outer.difference(unary_union(inner))
    return outer
