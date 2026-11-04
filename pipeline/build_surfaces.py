"""UrbIS Land cover StreetSurfaces (measured roadway / sidewalk / junction / median / parking / tram site polygons)
-> data/tiles/<T>/surfaces.json (CONTRACT §5.6), plus the kerb lines derived from them.

    python pipeline/build_surfaces.py --tile I6 [--no-topo]

Input: the region GeoPackage of UrbIS Land cover (sources.json "landcover", fetch_urbis.py landcover) and,
for a check only, the UrbIS Topo kerb lines (topo_type BR0101L) of the tile from the Brussels Mobility WFS
(sources.json "topo_roadline", cached in data/raw/urbis/topo_roadline/<T>.geojson).

What is written (local metres, CONTRACT §2):
  surfaces  every level-0 StreetSurfaces polygon cut to the tile: class code `c` (CLASS below), UrbIS TYPE,
            street name, hierarchy, rings (outer + holes, CONTRACT ring rules).
  kerbs     the boundary between RAISED surfaces (sidewalks, medians) and LOW ones (roadway, junctions, tram,
            parking, squares), as polylines oriented so the raised side is on the LEFT: for a segment
            (dx, dz) the raised side is at +(-dz, dx). The viewer extrudes the kerb face along them.
  edges     the outer boundary of all surfaces (where the street meets private land), split into
            raised / low, without the tile border: the viewer hangs a skirt from them down into the terrain.
The surfaces come from the same Paradigm survey as the UrbIS buildings, so they fit together (see
docs/ROADS_RESEARCH.md §1; tools/audit_surfaces.py measures it).

Levels other than 0 (bridges +1, tunnels -1) are counted and left out for now.
A missing input stops with a message: nothing is ever made up.
"""
from __future__ import annotations

import argparse
import json
import sys
import time
import urllib.request
from pathlib import Path

import numpy as np
import pyogrio
import shapely
from shapely.geometry import LineString, MultiLineString, Point, Polygon, box
from shapely.ops import linemerge, unary_union

from common import CONTRACT, RAW, TILES, l72_to_local, local_to_l72, polygon_out, read_json, round2, tile_bounds, write_json

HERE = Path(__file__).resolve().parent
LANDCOVER = RAW / "urbis" / "landcover"
TOPO = RAW / "urbis" / "topo_roadline"

# class codes used by the viewer (viewer/surfaces.js SURF_CLASS mirrors this)
CLASS = {"roadway": 0, "tramRoad": 1, "tramSite": 2, "parking": 3, "square": 4, "sidewalk": 5, "median": 6, "path": 7}
TYPE_CLASS = {"S": "roadway", "I": "roadway", "A": "roadway", "B": "roadway", "IL": "roadway", "G": "roadway",
              "SC": "tramRoad", "IC": "tramRoad", "C": "tramSite", "AC": "tramSite", "K": "parking", "P": "square",
              "SW": "sidewalk", "M": "median", "T": "path"}
RAISED = {"sidewalk", "median"}
PRECISION = 0.01        # snap to 1 cm (the output precision) so neighbours share vertices exactly
SLIVER = 0.2            # m², dropped
KERB_TOL = 0.08         # m: a raised edge closer than this to a low surface is a kerb
MIN_LINE = 0.25         # m: shorter kerb / edge pieces are dropped


def gpkg_path() -> Path:
    files = sorted(LANDCOVER.rglob("*.gpkg"))
    if not files:
        sys.exit(f"no UrbIS Land cover GeoPackage under {LANDCOVER}: run  python pipeline/fetch_urbis.py landcover")
    return files[-1]


def to_local(geom):
    return shapely.transform(geom, lambda c: np.column_stack(l72_to_local(c[:, 0], c[:, 1])))


def lines_of(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, LineString):
        return [g]
    if isinstance(g, MultiLineString):
        return list(g.geoms)
    return [x for p in getattr(g, "geoms", []) for x in lines_of(p)]


def polys_of(g):
    if g is None or g.is_empty:
        return []
    if isinstance(g, Polygon):
        return [g]
    return [x for p in getattr(g, "geoms", []) for x in polys_of(p)]


def line_out(l):
    pts = [[round2(x), round2(z)] for x, z in l.coords]
    return [p for k, p in enumerate(pts) if k == 0 or p != pts[k - 1]]


def orient_left(line, region):
    """Reverse the line if `region` lies on its right (sampled at the longest segment)."""
    c = np.asarray(line.coords)
    seg = np.diff(c, axis=0)
    k = int(np.argmax(np.hypot(seg[:, 0], seg[:, 1])))
    d = seg[k] / (np.hypot(*seg[k]) or 1)
    mid = (c[k] + c[k + 1]) / 2
    left = Point(mid[0] - d[1] * 0.3, mid[1] + d[0] * 0.3)
    return line if region.contains(left) else LineString(c[::-1])


def fetch_topo(tile, e0, n0, e1, n1):
    """UrbIS Topo road lines of the tile from the Brussels Mobility WFS (cached). None if it can't be fetched."""
    TOPO.mkdir(parents=True, exist_ok=True)
    f = TOPO / f"{tile}.geojson"
    if not f.exists():
        url = read_json(HERE / "sources.json")["sources"]["topo_roadline"]["wfs"].format(e0=e0, n0=n0, e1=e1, n1=n1)
        print(f"  GET {url}", file=sys.stderr)
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "uccle-city-pipeline/0.1"})
            with urllib.request.urlopen(req, timeout=120) as r:
                data = r.read()
            json.loads(data)
        except Exception as e:          # the check is optional: report, never substitute
            print(f"  topo road lines not fetched ({e}); kerb check skipped", file=sys.stderr)
            return None
        f.write_bytes(data)
    return json.loads(f.read_text(encoding="utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--tile", required=True)
    ap.add_argument("--no-topo", action="store_true", help="skip the UrbIS Topo kerb check (no WFS query)")
    a = ap.parse_args()
    tile = a.tile.upper()
    x0, z0, x1, z1 = tile_bounds(tile)
    tbox = box(x0, z0, x1, z1)
    e0, n1 = local_to_l72(x0, z0)
    e1, n0 = local_to_l72(x1, z1)
    src = gpkg_path()
    meta, _, wkb, fields = pyogrio.raw.read(src, layer="StreetSurfaces", bbox=(e0 - 2, n0 - 2, e1 + 2, n1 + 2), encoding="cp1252")   # the GPKG text is cp1252, not the UTF-8 it claims
    F = {k: fields[i] for i, k in enumerate(meta["fields"])}
    geoms = shapely.from_wkb(wkb)
    other_lvl, unknown, rows = {}, {}, []
    for k, g in enumerate(geoms):
        lvl, typ = int(F["LVL"][k]), str(F["TYPE"][k])
        if lvl != 0:
            other_lvl[lvl] = other_lvl.get(lvl, 0) + 1
            continue
        cls = TYPE_CLASS.get(typ)
        if cls is None:
            unknown[typ] = unknown.get(typ, 0) + 1
            continue
        g = shapely.set_precision(to_local(g).buffer(0), PRECISION)
        for p in polys_of(g.intersection(tbox)):
            p = shapely.set_precision(p, PRECISION)
            for q in polys_of(p):
                if q.area >= SLIVER:
                    name = F["STRNAMEFRE"][k]
                    rows.append({"cls": cls, "type": typ, "name": None if name is None else str(name),
                                 "hier": None if F["HIERARCHY"][k] is None else str(F["HIERARCHY"][k]),
                                 "id": str(F["INSPIRE_ID"][k]).rsplit(".", 1)[-1], "geom": q})
    if not rows:
        print(f"{tile}: no StreetSurfaces in the tile", file=sys.stderr)
    raised = unary_union([r["geom"] for r in rows if r["cls"] in RAISED]) if rows else Polygon()
    low = unary_union([r["geom"] for r in rows if r["cls"] not in RAISED]) if rows else Polygon()
    border = tbox.exterior.buffer(0.02)
    shapely.prepare(raised)
    # kerbs: raised boundary lying on a low surface
    kerb_geom = raised.boundary.intersection(low.buffer(KERB_TOL, join_style="mitre")).difference(border)
    kerbs = [orient_left(l, raised) for l in lines_of(linemerge(lines_of(kerb_geom))) if l.length >= MIN_LINE]
    lowb = low.buffer(KERB_TOL, join_style="mitre")
    edges_r = [l for l in lines_of(linemerge(lines_of(raised.boundary.difference(lowb).difference(border)))) if l.length >= MIN_LINE]
    edges_l = [l for l in lines_of(linemerge(lines_of(low.boundary.difference(raised.buffer(KERB_TOL, join_style="mitre")).difference(border)))) if l.length >= MIN_LINE]
    edges = [{"raised": 1, "line": line_out(orient_left(l, raised))} for l in edges_r] + \
            [{"raised": 0, "line": line_out(orient_left(l, low))} for l in edges_l]

    # optional check against the surveyed kerb lines (UrbIS Topo BR0101L)
    check = None
    topo = None if a.no_topo else fetch_topo(tile, e0, n0, e1, n1)
    if topo is not None:
        tk = [to_local(shapely.geometry.shape(f["geometry"])) for f in topo["features"] if f["properties"].get("topo_type") == "BR0101L"]
        tk = unary_union(tk).intersection(tbox) if tk else None
        if tk is not None and not tk.is_empty and kerbs:
            ours = MultiLineString(kerbs)
            # every metre along the surveyed kerb: distance to the nearest derived kerb
            pts = [l.interpolate(s) for l in lines_of(tk) for s in np.arange(0, l.length, 1.0)]
            d = shapely.distance(np.array(pts, dtype=object), ours)
            check = {"topoKerbLength": round(sum(l.length for l in lines_of(tk)), 1),
                     "derivedKerbLength": round(sum(l.length for l in kerbs), 1),
                     "topoWithin": {f"{t}m": round(float((d <= t).mean()), 3) for t in (0.1, 0.25, 0.5, 1.0)},
                     "medianDistance": round(float(np.median(d)), 3)}
            print(f"  kerb check vs UrbIS Topo BR0101L: {check}", file=sys.stderr)

    counts = {}
    for r in rows:
        counts[r["type"]] = counts.get(r["type"], 0) + 1
    areas = {}
    for r in rows:
        areas[r["cls"]] = areas.get(r["cls"], 0) + r["geom"].area
    doc = {
        "contract": CONTRACT, "tile": tile,
        "source": {"dataset": "UrbIS Land cover StreetSurfaces (Paradigm, CC0 1.0)", "file": src.name,
                   "built": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())},
        "classes": CLASS,
        "counts": {"surfaces": len(rows), "byType": counts, "kerbs": len(kerbs), "edges": len(edges),
                   "skippedLevels": other_lvl, "unknownTypes": unknown,
                   "area": {k: round(v, 1) for k, v in sorted(areas.items())},
                   "kerbLength": round(sum(l.length for l in kerbs), 1)},
        "kerbCheck": check,
        "surfaces": [{"c": CLASS[r["cls"]], "type": r["type"], "name": r["name"], "hier": r["hier"], "id": r["id"],
                      "rings": polygon_out(r["geom"])} for r in rows],
        "kerbs": [line_out(l) for l in kerbs],
        "edges": edges,
    }
    out = TILES / tile / "surfaces.json"
    write_json(out, doc)
    print(f"{tile}: {len(rows)} surfaces {counts}, {len(kerbs)} kerb lines ({doc['counts']['kerbLength']} m), "
          f"{len(edges)} outer edges -> {out} ({out.stat().st_size // 1024} KB)", file=sys.stderr)


if __name__ == "__main__":
    main()
