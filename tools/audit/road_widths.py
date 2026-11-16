"""ROAD WIDTHS AUDIT (citydefects 2026-11-16, owner: "roads feel too narrow vs reality").
For every OSM way with a width tag (width / width:carriageway / est_width), compare with the MEASURED carriageway the
city draws (UrbIS street surfaces, data/tiles/<T>/surfaces.json, classes roadway / tramRoad / tramSite / parking):
perpendicular rays every 5 m along the way to the first non-carriage edge, both sides, median. Also the road engine's
own stack width (roads.json lanes or the type default) where UrbIS has no surface.
    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/audit/road_widths.py [--out docs/citydefects/road_widths.json]
"""
import json, math, sys, statistics as st
from pathlib import Path
import pyproj
from shapely.geometry import Polygon, LineString, Point
from shapely.strtree import STRtree
from shapely.ops import unary_union

ROOT = Path(__file__).resolve().parents[2]
O_E, O_N = 148643.0, 165394.0
T = pyproj.Transformer.from_crs("EPSG:4326", "EPSG:31370", always_xy=True)
CARR = {0, 1, 2, 3}
DRIVEN = {"primary", "secondary", "tertiary", "residential", "unclassified", "living_street", "trunk", "primary_link", "secondary_link", "tertiary_link"}

def num(v):
    try: return float(str(v).replace(",", ".").split()[0].rstrip("m"))
    except Exception: return None

osm = json.load(open(ROOT / "data/raw/osm/area.json", encoding="utf-8"))["elements"]
nodes = {e["id"]: e for e in osm if e["type"] == "node"}
def xz(n):
    E, N = T.transform(n["lon"], n["lat"]); return (E - O_E, O_N - N)

# measured carriageway polygons of all tiles
polys = []
for f in sorted((ROOT / "data/tiles").glob("*/surfaces.json")):
    d = json.load(open(f))
    for s in d["surfaces"]:
        if s["c"] not in CARR: continue
        try:
            p = Polygon(s["rings"][0], s["rings"][1:]).buffer(0)
            if not p.is_empty: polys.append(p)
        except Exception: pass
tree = STRtree(polys)
print(f"{len(polys)} measured carriageway polygons", file=sys.stderr)

def inside(x, z):
    pt = Point(x, z)
    return any(polys[i].contains(pt) for i in tree.query(pt))

def ray(x, z, dx, dz):
    d = 0.1
    while d < 20:
        if not inside(x + dx * d, z + dz * d): return d
        d += 0.1
    return None

rows = []
for e in osm:
    if e["type"] != "way": continue
    t = e.get("tags", {})
    if t.get("highway") not in DRIVEN: continue
    w = num(t.get("width:carriageway") or t.get("width") or t.get("est_width"))
    if not w: continue
    pts = [xz(nodes[i]) for i in e["nodes"] if i in nodes]
    if len(pts) < 2: continue
    line = LineString(pts)
    meas = []
    s = 2.5
    while s < line.length - 2.5:
        p = line.interpolate(s); q = line.interpolate(min(line.length, s + 0.5))
        dx, dz = q.x - p.x, q.y - p.y; L = math.hypot(dx, dz) or 1; dx /= L; dz /= L
        if inside(p.x, p.y):
            a, b = ray(p.x, p.y, -dz, dx), ray(p.x, p.y, dz, -dx)
            if a and b: meas.append(a + b)
        s += 5
    if len(meas) < 2: continue
    m = st.median(meas)
    rows.append({"osm": e["id"], "name": t.get("name", "")[:40], "highway": t["highway"], "tag": w, "key": "width:carriageway" if "width:carriageway" in t else ("width" if "width" in t else "est_width"),
                 "lanes": t.get("lanes"), "measured": round(m, 2), "diff": round(m - w, 2), "samples": len(meas)})

d = [r["diff"] for r in rows]
summ = {"ways": len(rows), "median_diff_m": round(st.median(d), 2) if d else None, "mean_diff_m": round(st.mean(d), 2) if d else None,
        "measured_narrower_by_1m_plus": sum(1 for x in d if x < -1), "measured_wider_by_1m_plus": sum(1 for x in d if x > 1),
        "within_1m": sum(1 for x in d if abs(x) <= 1)}
print(json.dumps(summ, indent=1))
for r in sorted(rows, key=lambda r: r["diff"])[:12]: print(r)
out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else None
if out: json.dump({"summary": summ, "rows": rows}, open(ROOT / out, "w"), indent=1)
