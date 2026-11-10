"""Bake the whole-Uccle map (minimap + full map, viewer/map/) from our own data.

    python tools/build_map.py [--raw <data/raw folder>]

Writes data/map/map.json (index, roads graph with bilingual names, boundary, transit, landmarks, area labels)
and data/map/geo.bin (per 500 m tile: simplified building footprints, land cover, paths, rail, tram tracks),
so the map never loads a tile's buildings.json / features.json at runtime. Format: docs/MAP.md.

Inputs (all already used by the city):
  data/tiles/manifest.json, data/tiles/<T>/buildings.json (UrbIS 3D, CC0), data/tiles/<T>/features.json (OSM, ODbL)
  data/roads/network.json (OSM through the road engine), data/transit/stib-92.json (STIB GTFS, CC BY 4.0)
  pipeline/uccle_boundary.geojson (OSM relation 58253), models/stjob/stjob.json, models/townhall/townhall.json
  <raw>/osm/area.json (name:fr / name:nl of the streets, railway halts, castles), <raw>/osm/landmarks.json (churches)
<raw> defaults to data/raw (git-ignored; in a worktree pass the main checkout's data/raw).
Needs pyproj + shapely (pipeline/requirements.txt).
"""
from __future__ import annotations

import argparse
import json
import math
import struct
import sys
from collections import defaultdict
from pathlib import Path

from pyproj import CRS, Transformer
from shapely.geometry import LineString, MultiPolygon, Polygon, Point
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"
OUT = DATA / "map"

# CONTRACT §2.1 (pipeline/common.py): EPSG:31370 with the pinned Helmert, local = (E - OE, -(N - ON))
L72 = CRS.from_proj4(
    "+proj=lcc +lat_0=90 +lat_1=51.16666723333333 +lat_2=49.8333339 +lon_0=4.367486666666666 +x_0=150000.013 "
    "+y_0=5400088.438 +ellps=intl +towgs84=-106.8686,52.2978,-103.7239,0.3366,-0.457,1.8422,-1.2747 +units=m +no_defs")
WGS = Transformer.from_crs("EPSG:4326", L72, always_xy=True)
OE, ON = 148643.0, 165394.0


def to_local(lon, lat):
    e, n = WGS.transform(lon, lat)
    return e - OE, -(n - ON)


# ------------------------------------------------------------------ layers of geo.bin
LAYERS = ["bld0", "bld1", "bld2", "park", "garden", "grass", "wood", "scrub", "water", "cemetery", "pitch", "playground",
          "paths", "steps", "rail", "tram"]
LID = {k: i for i, k in enumerate(LAYERS)}
AREA_KIND = {"park": "park", "garden": "garden", "grass": "grass", "wood": "wood", "scrub": "scrub", "water": "water",
             "cemetery": "cemetery", "pitch": "pitch", "playground": "playground"}
LINE_KIND = {"footway": "paths", "path": "paths", "cycleway": "paths", "pedestrian": "paths", "steps": "steps",
             "rail": "rail", "tram": "tram"}
Q = 10.0   # geo.bin: decimetres relative to the tile's corner, int16

# roads: class ids (viewer/map/mapData.js ROAD_CLASS) and fallback carriageway widths (m)
ROAD_CLASS = {"primary": 0, "secondary": 1, "secondary_link": 1, "tertiary": 2, "unclassified": 3, "residential": 3,
              "living_street": 4, "service": 5}
CLASS_W = [12.0, 10.0, 8.0, 6.0, 5.0, 3.5]

# Heroes: the city's own models where they stand (placements in their model files / branches)
HEROES = [
    # (id, fr, nl, x, z, source)
    ("stjob", "Église Saint-Job", "Sint-Jobkerk", None, None, "models/stjob/stjob.json measured.octagon_centre_city"),
    ("townhall", "Maison communale d'Uccle", "Gemeentehuis van Ukkel", None, None, "models/townhall/townhall.json measured.frame.origin_city"),
    # claude/observatory models/observatory/observatory.json bounds_city x 546.1..736.9, z -37.4..197.3 (centre)
    ("observatory", "Observatoire royal de Belgique", "Koninklijke Sterrenwacht van België", 641.5, 80.0, "claude/observatory bounds_city centre"),
    # claude/saint-pierre models/stpierre/stpierre.json placement.city_local_position
    ("stpierre", "Église Saint-Pierre", "Sint-Pieterskerk", -708.86, -492.5, "claude/saint-pierre placement"),
]

NL_HINT = ("straat", "laan", "steenweg", "weg", "plein", "dreef", "baan", "lei", "pad", "berg", "steeg", "hof", "kaai",
           "dal", "veld", "bos", "wegel", "park", "tuin", "square", "gaarde", "vest", "gracht", "kerk", "vijver")
FR_HINT = ("rue", "avenue", "chaussée", "place", "chemin", "drève", "boulevard", "square", "clos", "allée", "sentier",
           "venelle", "montagne", "parc", "jardin", "rond-point", "impasse", "cour", "quai", "église", "chapelle",
           "cimetière", "bois", "étang", "plateau", "petite", "vieux", "vieille", "galerie", "passage", "dreve")


def split_names(name: str, tags: dict | None):
    """(fr, nl) for an OSM name: name:fr / name:nl when tagged, else the two halves of "A - B" by their words."""
    fr = (tags or {}).get("name:fr")
    nl = (tags or {}).get("name:nl")
    if fr and nl:
        return fr, nl
    parts = [p.strip() for p in name.split(" - ")] if " - " in name else [name]
    if len(parts) == 2:
        a, b = parts
        a_fr = a.split(" ")[0].lower() in FR_HINT or a.lower().startswith(("rue ", "avenue ", "chaussée ", "place "))
        b_fr = b.split(" ")[0].lower() in FR_HINT
        if b_fr and not a_fr:
            a, b = b, a
        return fr or a, nl or b
    return fr or name, nl or name


def ring_q(coords, ox, oz):
    out = []
    for x, z in coords:
        qx, qz = round((x - ox) * Q), round((z - oz) * Q)
        if out and out[-2] == qx and out[-1] == qz:
            continue
        out += [qx, qz]
    return out


def clamp16(v):
    return max(-32768, min(32767, v))


class Chunk:
    """One tile's layers: [layer u8][items u32] then per item [rings u8] then per ring [n u16][n x (i16 x, i16 z)]."""

    def __init__(self):
        self.items = defaultdict(list)    # layer -> [[ring(flat q ints), ...], ...]

    def poly(self, layer, geom, ox, oz):
        polys = [geom] if isinstance(geom, Polygon) else list(getattr(geom, "geoms", []))
        for p in polys:
            if not isinstance(p, Polygon) or p.is_empty or p.area < 0.5:
                continue
            rings = [ring_q(list(p.exterior.coords)[:-1], ox, oz)] + [ring_q(list(r.coords)[:-1], ox, oz) for r in p.interiors if Polygon(r).area > 2]
            rings = [r for r in rings if len(r) >= 6][:255]
            if rings:
                self.items[LID[layer]].append(rings)

    def line(self, layer, coords, ox, oz):
        r = ring_q(coords, ox, oz)
        if len(r) >= 4:
            self.items[LID[layer]].append([r])

    def bytes(self):
        b = bytearray()
        for lid in sorted(self.items):
            items = self.items[lid]
            b += struct.pack("<BI", lid, len(items))
            for rings in items:
                b += struct.pack("<B", len(rings))
                for r in rings:
                    n = len(r) // 2
                    if n > 65535:
                        r, n = r[:131070], 65535
                    b += struct.pack("<H", n)
                    b += struct.pack(f"<{2 * n}h", *[clamp16(v) for v in r])
        return bytes(b)


def simplify_line(coords, tol):
    if len(coords) < 3:
        return coords
    return list(LineString(coords).simplify(tol, preserve_topology=False).coords)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", default=str(DATA / "raw"))
    args = ap.parse_args()
    raw = Path(args.raw)
    OUT.mkdir(parents=True, exist_ok=True)
    manifest = json.loads((DATA / "tiles" / "manifest.json").read_text(encoding="utf-8"))
    tiles = [t for t in manifest["tiles"] if t["status"] != "missing"]

    # ---------------------------------------------------------------- per tile: footprints, land cover, lines
    blob = bytearray()
    tindex = []
    area_names = defaultdict(lambda: {"kind": None, "name": None, "geoms": []})
    stats = defaultdict(int)
    for t in tiles:
        name = t["name"]
        ox, oz = t["bounds"]["x"][0], t["bounds"]["z"][0]
        ch = Chunk()
        bdoc = json.loads((DATA / "tiles" / name / "buildings.json").read_text(encoding="utf-8"))
        groups = defaultdict(lambda: {"polys": [], "h": 0.0})
        for b in bdoc["buildings"]:
            key = (b.get("attrs") or {}).get("BU_ID") or b["id"]
            fp = b["footprint"]
            try:
                p = Polygon(fp[0], fp[1:]).buffer(0)
            except Exception:
                continue
            if p.is_empty:
                continue
            g = groups[key]
            g["polys"].append(p)
            g["h"] = max(g["h"], float(b.get("height") or (b.get("top", 0) - b.get("base", 0))))
        for g in groups.values():
            u = unary_union(g["polys"]) if len(g["polys"]) > 1 else g["polys"][0]
            u = u.simplify(0.35, preserve_topology=True)
            tone = "bld2" if g["h"] >= 18 else "bld1" if g["h"] >= 9 else "bld0"
            ch.poly(tone, u, ox, oz)
            stats["buildings"] += 1
        feats = json.loads((DATA / "tiles" / name / "features.json").read_text(encoding="utf-8"))
        for a in feats.get("areas", []):
            layer = AREA_KIND.get(a["kind"])
            if not layer:
                continue
            rings = a["rings"]
            try:
                p = Polygon(rings[0], rings[1:]).buffer(0)
            except Exception:
                continue
            ch.poly(layer, p.simplify(0.6, preserve_topology=True), ox, oz)
            stats[f"area:{layer}"] += 1
            if a.get("name"):
                rec = area_names[a["id"]]
                rec["kind"], rec["name"] = layer, a["name"]
                rec["geoms"].append(p)
        for ln in feats.get("lines", []):
            layer = LINE_KIND.get(ln["kind"])
            if not layer:
                continue
            ch.line(layer, simplify_line(ln["line"], 0.3), ox, oz)
            stats[f"line:{layer}"] += 1
        data = ch.bytes()
        tindex.append({"name": name, "x0": ox, "z0": oz, "off": len(blob), "len": len(data)})
        blob += data
    (OUT / "geo.bin").write_bytes(bytes(blob))

    # ---------------------------------------------------------------- roads (graph + bilingual names)
    net = json.loads((DATA / "roads" / "network.json").read_text(encoding="utf-8"))
    osm_tags = {}
    area_path = raw / "osm" / "area.json"
    halts, castles, nodes_ll, tram_names = [], [], {}, []
    if area_path.exists():
        area = json.loads(area_path.read_text(encoding="utf-8"))
        for e in area["elements"]:
            tg = e.get("tags") or {}
            if e["type"] == "way" and tg.get("highway"):
                osm_tags[e["id"]] = tg
            if e["type"] == "node":
                nodes_ll[e["id"]] = (e["lon"], e["lat"])
                if tg.get("name") and (tg.get("railway") == "tram_stop" or (tg.get("public_transport") in ("platform", "stop_position") and tg.get("tram") == "yes")):
                    tram_names.append((e["lon"], e["lat"], tg["name"], tg))
                if tg.get("railway") in ("halt", "station") and tg.get("name") and tg.get("train") != "no" and tg.get("subway") != "yes":
                    halts.append(e)
            if e["type"] == "way" and tg.get("historic") == "castle" and tg.get("name") and tg.get("name") != "Château":
                castles.append(e)
    else:
        print(f"warning: {area_path} missing: street names keep OSM's 'name' only, no stations or castles", file=sys.stderr)

    node_ix = {n["id"]: i for i, n in enumerate(net["nodes"])}
    nodes = [[round(n["x"], 1), round(n["z"], 1)] for n in net["nodes"]]
    names, name_ix = [], {}
    roads = []
    for r in net["roads"]:
        m = r.get("meta") or {}
        cls = ROAD_CLASS.get(m.get("highway"), 5)
        lanes = r.get("lanes") or {}
        w = sum(l.get("width", 0) for s in ("left", "right") for l in (lanes.get(s) or []) if l.get("type") != "sidewalk")
        w = w or CLASS_W[cls]
        nm = m.get("name")
        nid = -1
        if nm:
            ways = m.get("osmWays") or [m.get("osm")]
            tags = next((osm_tags[w_] for w_ in ways if w_ in osm_tags), None)
            fr, nl = split_names(nm.replace("’", "'"), tags)
            fr, nl = fr.replace("’", "'"), nl.replace("’", "'")
            key = (fr, nl)
            if key not in name_ix:
                name_ix[key] = len(names)
                names.append([fr, nl])
            nid = name_ix[key]
        a, b = net["nodes"][node_ix[r["a"]]], net["nodes"][node_ix[r["b"]]]
        pts = [(a["x"], a["z"])] + [(p["x"], p["z"]) for p in r["pts"]] + [(b["x"], b["z"])]
        pts = simplify_line(pts, 0.4)
        flat, px, pz = [], 0, 0
        for x, z in pts:      # decimetres, delta-coded
            qx, qz = round(x * Q), round(z * Q)
            flat += [qx - px, qz - pz]
            px, pz = qx, qz
        oneway = 1 if (m.get("oneway") == "yes" or r["type"] == "oneWay") else 0
        roads.append([nid, cls, round(w, 1), node_ix[r["a"]], node_ix[r["b"]], oneway, flat])

    # ---------------------------------------------------------------- boundary
    geo = json.loads((ROOT / "pipeline" / "uccle_boundary.geojson").read_text(encoding="utf-8"))
    ring = geo["features"][0]["geometry"]["coordinates"][0]
    bpoly = Polygon([to_local(lo, la) for lo, la, *_ in ring]).simplify(1.0)
    boundary = [[round(x, 1), round(z, 1)] for x, z in list(bpoly.exterior.coords)[:-1]]

    # extent: the tile grid
    ex = [min(t["bounds"]["x"][0] for t in tiles), min(t["bounds"]["z"][0] for t in tiles),
          max(t["bounds"]["x"][1] for t in tiles), max(t["bounds"]["z"][1] for t in tiles)]
    clip = Polygon([(ex[0] - 400, ex[1] - 400), (ex[2] + 400, ex[1] - 400), (ex[2] + 400, ex[3] + 400), (ex[0] - 400, ex[3] + 400)])
    inside = lambda x, z: ex[0] - 300 <= x <= ex[2] + 300 and ex[1] - 300 <= z <= ex[3] + 300

    # ---------------------------------------------------------------- transit: tram 92 (STIB GTFS)
    tr = json.loads((DATA / "transit" / "stib-92.json").read_text(encoding="utf-8"))
    shapes = []
    for sid, pts in tr["shapes"].items():
        g = LineString(pts).intersection(clip)
        for part in getattr(g, "geoms", [g]):
            if part.is_empty or part.length < 50:
                continue
            shapes.append([[round(x, 1), round(z, 1)] for x, z in part.simplify(1.0).coords])
    # one line per direction is enough: drop shapes covered by a longer one
    shapes.sort(key=len, reverse=True)
    keep = []
    for s in shapes:
        ls = LineString(s)
        if any(LineString(k).buffer(6).contains(ls) for k in keep):
            continue
        keep.append(s)
    stops = defaultdict(list)
    for sid, s in tr["stops"].items():
        if inside(s["x"], s["z"]):
            stops[s["name"]].append((s["x"], s["z"]))
    stop_list = []
    tram_local = [(*to_local(lo, la), split_names(n2, tg)[0], tg) for lo, la, n2, tg in tram_names]
    for nm, ps in stops.items():     # platforms of one stop (both directions) -> one point when close
        groups = []
        for p in ps:
            for g in groups:
                if math.hypot(p[0] - g[0][0], p[1] - g[0][1]) < 300:
                    g.append(p)
                    break
            else:
                groups.append([p])
        for g in groups:
            x, z = sum(p[0] for p in g) / len(g), sum(p[1] for p in g) / len(g)
            # the stop's name as OSM writes it (GTFS has upper case without accents): nearest OSM tram stop within 150 m
            best, label = 150.0, None
            for lo, la, n2, tg in tram_local:
                d = math.hypot(lo - x, la - z)
                if d < best:
                    best, label = d, n2
            stop_list.append([label or nm.title(), round(x, 1), round(z, 1)])

    # ---------------------------------------------------------------- landmarks
    lms = []
    sj = json.loads((ROOT / "models" / "stjob" / "stjob.json").read_text(encoding="utf-8"))
    th = json.loads((ROOT / "models" / "townhall" / "townhall.json").read_text(encoding="utf-8"))
    for hid, fr, nl, x, z, src in HEROES:
        if hid == "stjob":
            x, z = sj["measured"]["octagon_centre_city"]
        elif hid == "townhall":
            x, z = th["measured"]["frame"]["origin_city"]
        lms.append({"id": hid, "kind": "hero", "fr": fr, "nl": nl, "x": round(x, 1), "z": round(z, 1)})
    lm_path = raw / "osm" / "landmarks.json"
    if lm_path.exists():
        lm = json.loads(lm_path.read_text(encoding="utf-8"))
        lnodes = {e["id"]: (e["lon"], e["lat"]) for e in lm["elements"] if e["type"] == "node"}
        for e in lm["elements"]:
            tg = e.get("tags") or {}
            if not tg.get("name") or not (tg.get("amenity") == "place_of_worship" or tg.get("building") in ("church", "chapel")):
                continue
            if e["type"] == "node":
                x, z = to_local(e["lon"], e["lat"])
            elif e["type"] == "way":
                pts = [to_local(*lnodes[n]) for n in e["nodes"] if n in lnodes]
                if len(pts) < 3:
                    continue
                c = Polygon(pts).buffer(0).representative_point()
                x, z = c.x, c.y
            else:
                continue
            if not inside(x, z):
                continue
            if any(l["kind"] == "hero" and math.hypot(l["x"] - x, l["z"] - z) < 70 for l in lms):
                continue     # the hero is this church
            fr, nl = split_names(tg["name"], tg)
            lms.append({"id": f"osm{e['type'][0]}{e['id']}", "kind": "church", "fr": fr, "nl": nl, "x": round(x, 1), "z": round(z, 1)})
    for e in halts:
        x, z = to_local(e["lon"], e["lat"])
        if not inside(x, z):
            continue
        fr, nl = split_names(e["tags"]["name"], e["tags"])
        lms.append({"id": f"osmn{e['id']}", "kind": "station", "fr": fr, "nl": nl, "x": round(x, 1), "z": round(z, 1)})
    for e in castles:
        pts = [to_local(*nodes_ll[n]) for n in e["nodes"] if n in nodes_ll]
        if len(pts) < 3:
            continue
        c = Polygon(pts).buffer(0).representative_point()
        if not inside(c.x, c.y):
            continue
        fr, nl = split_names(e["tags"]["name"], e["tags"])
        lms.append({"id": f"osmw{e['id']}", "kind": "castle", "fr": fr, "nl": nl, "x": round(c.x, 1), "z": round(c.y, 1)})

    # ---------------------------------------------------------------- area labels (named parks, woods, cemeteries, ponds)
    area_labels = []
    for aid, rec in area_names.items():
        u = unary_union(rec["geoms"])
        if u.area < 4000:
            continue
        c = u.representative_point()
        fr, nl = split_names(rec["name"], None)
        area_labels.append({"kind": rec["kind"], "fr": fr, "nl": nl, "x": round(c.x, 1), "z": round(c.y, 1), "area": round(u.area)})
    area_labels.sort(key=lambda a: -a["area"])

    doc = {
        "version": 1,
        "generated_by": "tools/build_map.py",
        "build": manifest.get("build"),
        "credits": "© OpenStreetMap contributors (ODbL) · UrbIS © CIRB/BRIC CC0 · STIB-MIVB GTFS CC BY 4.0",
        "extent": ex,
        "tileSize": manifest["tileSize"],
        "layers": LAYERS,
        "q": Q,
        "tiles": tindex,
        "names": names,
        "nodes": nodes,
        "roadFields": ["name", "class", "width", "a", "b", "oneway", "dpts(dm, delta)"],
        "roads": roads,
        "boundary": boundary,
        "tram": {"line": tr["line"], "color": tr["color"], "shapes": keep, "stops": stop_list, "source": tr["source"]},
        "landmarks": lms,
        "areas": area_labels,
    }
    (OUT / "map.json").write_text(json.dumps(doc, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    kb = lambda p: (OUT / p).stat().st_size / 1024
    print(f"map.json {kb('map.json'):.0f} KB, geo.bin {kb('geo.bin'):.0f} KB; {len(tiles)} tiles, {len(roads)} roads, "
          f"{len(names)} street names, {len(lms)} landmarks, {len(stop_list)} tram stops, {len(keep)} tram shapes, {len(area_labels)} area labels")
    print(dict(stats))


if __name__ == "__main__":
    main()
