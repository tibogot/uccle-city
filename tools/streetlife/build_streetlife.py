"""Build the street-life layer per tile: data/streetlife/<T>.json (deterministic: same inputs, same bytes).

    python tools/streetlife/build_streetlife.py I6 I5 J6     # or --all
    python tools/streetlife/build_streetlife.py --all --raw C:/.../uccle-city/data/raw

Inputs (raw: run fetch_streetlife.py first; tile files: data/tiles/<T>/):
  OSM POIs (osm_pois.json: shop / amenity / craft ..., nodes + ways' centres; ODbL)      -> shops, cafés, fuel, ...
  STIB stops (Brussels Mobility WFS)                                                    -> stop poles (+ shelters OSM tags)
  Villo stations, bpost letter boxes (Brussels Mobility WFS)                            -> Villo terminals + docks, post boxes
  UrbIS AddressNumbers (urbisvector WFS) per tile                                       -> house numbers on the façades
  buildings.json (UrbIS 3D solids' footprints), roads.json (OSM centrelines + names), surfaces.json (UrbIS street
  surfaces: sidewalks), terrain.json/.u16 (UrbIS DTM)                                    -> where things go, how high

Every POI that belongs on a building is attached to the nearest STREET-FACING footprint edge of its building (not a
party wall, an outward normal that looks at a street within 35 m) at ground-floor height (the ground outside the wall
+ the sidewalk kerb). Shopfronts on one edge never overlap (intervals). Names, brands, numbers and stop names are copied
from the data as they are; a POI without a name gets no text (never invented). Coordinates: local metres (CONTRACT).
"""
from __future__ import annotations

import argparse
import json
import math
import re
import sys
import time
from pathlib import Path

import numpy as np
from shapely import STRtree
from shapely.geometry import LineString, Point, Polygon

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(HERE))
from common import TILES, all_tiles, l72_to_local, tile_bounds, wgs_to_local  # noqa: E402
from fetch_streetlife import default_raw  # noqa: E402

CONTRACT = "streetlife-0.1"
OUT = ROOT / "data" / "streetlife"
KERB = 0.13                 # viewer/surfaces.js KERB: sidewalks / squares stand this far above the road deck
RAISED = {4: 0.13, 5: 0.13, 6: 0.15}     # surfaces.json class -> lift (square, sidewalk, median)
STREET_REACH = 35.0
SHOP_MAX_W, SHOP_MIN_W = 6.5, 2.2


def r2(v):
    return round(float(v), 2)


# ------------------------------------------------------------------------------------------------ classification

FOOD = {"cafe": "cafe", "ice_cream": "cafe", "bar": "bar", "pub": "bar", "restaurant": "restaurant", "fast_food": "fastfood",
        "nightclub": "bar"}
FACADE_AMENITY = {"pharmacy": "pharmacy", "bank": "bank", "post_office": "post", "library": "civic", "cinema": "civic",
                  "theatre": "civic", "arts_centre": "civic", "community_centre": "civic", "veterinary": "shop",
                  "driving_school": "shop", "bureau_de_change": "shop", "money_transfer": "shop", "car_rental": "shop",
                  "townhall": "civic", "police": "civic", "school": "school", "kindergarten": "school", "college": "school"}
SHOP_KIND = {"bakery": "bakery", "pastry": "bakery", "supermarket": "supermarket", "chemist": "shop"}
NO_NAME_TEXT = {"doctors", "dentist"}            # skipped: brass plates with personal names, not shop fronts


def classify(t):
    a, s = t.get("amenity"), t.get("shop")
    if a == "fuel":
        return "fuel"
    if a in FOOD:
        return FOOD[a]
    if a in FACADE_AMENITY:
        return FACADE_AMENITY[a]
    if a == "atm":
        return "atm"
    if a == "post_box":
        return "postbox"
    if a == "recycling" and (t.get("recycling:glass_bottles") == "yes" or t.get("recycling:glass") == "yes"):
        return "glass"
    if a == "bicycle_rental":
        return "villo"
    if s:
        if s in ("vacant", "no", "yes") and not t.get("name"):
            return None
        return SHOP_KIND.get(s, "shop")
    if t.get("craft") and t.get("name"):
        return "shop"
    if t.get("tourism") in ("hotel", "guest_house") and t.get("name"):
        return "hotel"
    return None


FUEL_GRADES = [("fuel:diesel", "Diesel"), ("fuel:octane_95", "95"), ("fuel:e10", "E10"), ("fuel:octane_98", "98"),
               ("fuel:lpg", "LPG"), ("fuel:cng", "CNG"), ("fuel:adblue", "AdBlue")]


def split_name(name: str):
    """OSM Brussels names are 'FR - NL' (same text twice when the name is the same in both): (fr, nl or None)."""
    if not name:
        return None, None
    parts = [p.strip() for p in re.split(r"\s+-\s+", name) if p.strip()]
    if len(parts) == 2:
        return parts[0], parts[1]
    return name.strip(), None


# ------------------------------------------------------------------------------------------------ tile context

class Tile:
    def __init__(self, name):
        self.name = name
        d = TILES / name
        self.x0, self.z0, self.x1, self.z1 = tile_bounds(name)
        hdr = json.loads((d / "terrain.json").read_text(encoding="utf-8"))
        raw = np.fromfile(d / "terrain.u16", dtype="<u2").astype(np.float64)
        lo = raw[raw != hdr["nodata"]].min()
        raw[raw == hdr["nodata"]] = lo
        self.hdr, self.dtm = hdr, raw.reshape(hdr["rows"], hdr["cols"]) / 100.0
        bd = json.loads((d / "buildings.json").read_text(encoding="utf-8"))
        self.solids = []
        for b in bd["buildings"]:
            ring = b["footprint"][0]
            if len(ring) < 3:
                continue
            poly = Polygon(ring)
            if not poly.is_valid:
                poly = poly.buffer(0)
            if poly.is_empty or poly.geom_type != "Polygon":
                continue
            self.solids.append({"ring": [tuple(p) for p in ring], "poly": poly, "bu": (b.get("attrs") or {}).get("BU_ID") or b["id"],
                                "base": b["base"], "top": b["top"], "eaves": b.get("eaves") or b["top"], "landmark": bool((b.get("attrs") or {}).get("_landmark"))})
        self.tree = STRtree([s["poly"] for s in self.solids])
        rd = json.loads((d / "roads.json").read_text(encoding="utf-8"))
        N = {n["id"]: n for n in rd["nodes"]}
        self.roads, segs = [], []
        for r in rd["roads"]:
            pts = [N[r["a"]], *r["pts"], N[r["b"]]]
            line = [(p["x"], p["z"]) for p in pts]
            hw = r.get("meta", {}).get("highway")
            half = 0.0
            for side in ("left", "right"):
                half = max(half, sum(l.get("width", 0) for l in (r.get("lanes") or {}).get(side, []) if l.get("type") != "sidewalk"))
            rr = {"id": r["id"], "a": r["a"], "b": r["b"], "line": line, "name": r.get("meta", {}).get("name"), "hw": hw, "half": half or 3.0}
            self.roads.append(rr)
            if hw in ("footway", "path", "steps", "cycleway", "track", "bridleway", "corridor"):
                continue
            for k in range(1, len(line)):
                segs.append((LineString([line[k - 1], line[k]]), rr))
        self.segs = segs
        self.segtree = STRtree([s[0] for s in segs])
        self.nodes = N
        sf = d / "surfaces.json"
        self.raised = []
        if sf.exists():
            for s in json.loads(sf.read_text(encoding="utf-8"))["surfaces"]:
                if s["c"] in RAISED and s["rings"] and len(s["rings"][0]) >= 3:
                    p = Polygon(s["rings"][0], s["rings"][1:])
                    if not p.is_valid:
                        p = p.buffer(0)
                    self.raised.append((p, RAISED[s["c"]]))
        self.rtree = STRtree([p for p, _ in self.raised]) if self.raised else None
        self._edges = {}

    def inside(self, x, z):
        return self.x0 <= x < self.x1 and self.z0 <= z < self.z1

    def ground(self, x, z):
        h = self.hdr
        c = min(max((x - h["x0"]) / h["step"], 0), h["cols"] - 1.001)
        r = min(max((z - h["z0"]) / h["step"], 0), h["rows"] - 1.001)
        c0, r0 = int(c), int(r)
        fc, fr = c - c0, r - r0
        D = self.dtm
        return (D[r0, c0] * (1 - fc) + D[r0, c0 + 1] * fc) * (1 - fr) + (D[r0 + 1, c0] * (1 - fc) + D[r0 + 1, c0 + 1] * fc) * fr

    def lift(self, x, z):
        """the kerb lift of a raised surface (sidewalk / square / median) at (x, z), else 0"""
        if not self.rtree:
            return 0.0
        p = Point(x, z)
        for i in self.rtree.query(p):
            poly, h = self.raised[i]
            if poly.contains(p):
                return h
        return 0.0

    def floor_y(self, x, z):
        """the walking surface at (x, z): DTM + the kerb lift where a sidewalk is measured"""
        return self.ground(x, z) + self.lift(x, z)

    def nearest_road(self, x, z, reach=40.0, named=False):
        p = Point(x, z)
        best = None
        for i in self.segtree.query(p.buffer(reach)):
            ln, rr = self.segs[i]
            if named and not rr["name"]:
                continue
            d = ln.distance(p)
            if best is None or d < best[0]:
                best = (d, ln, rr)
        return best

    def edges_of(self, si):
        """street-facing, non-party footprint edges of solid si: (ax, az, bx, bz, nx, nz, length)"""
        if si in self._edges:
            return self._edges[si]
        s = self.solids[si]
        ring = s["ring"]
        if ring[0] == ring[-1]:
            ring = ring[:-1]
        area2 = sum(ring[k][0] * ring[(k + 1) % len(ring)][1] - ring[(k + 1) % len(ring)][0] * ring[k][1] for k in range(len(ring)))
        out = []
        for k in range(len(ring)):
            (ax, az), (bx, bz) = ring[k], ring[(k + 1) % len(ring)]
            L = math.hypot(bx - ax, bz - az)
            if L < 1.2:
                continue
            tx, tz = (bx - ax) / L, (bz - az) / L
            # outward normal: x-east, z-south; a CCW ring in (x, z) (positive area2) has its outside on the right of a->b... test it
            nx, nz = tz, -tx
            mx, mz = (ax + bx) / 2, (az + bz) / 2
            if s["poly"].contains(Point(mx + nx * 0.3, mz + nz * 0.3)):
                nx, nz = -nx, -nz
            # party wall: another solid right outside at 3 sample points along the edge
            party = 0
            for f in (0.2, 0.5, 0.8):
                px, pz = ax + (bx - ax) * f + nx * 0.4, az + (bz - az) * f + nz * 0.4
                q = Point(px, pz)
                if any(j != si and self.solids[j]["poly"].contains(q) for j in self.tree.query(q)):
                    party += 1
            if party >= 2:
                continue
            nr = self.nearest_road(mx + nx * 0.5, mz + nz * 0.5, STREET_REACH)
            if not nr:
                continue
            d, ln, rr = nr
            qp = ln.interpolate(ln.project(Point(mx, mz)))
            vx, vz = qp.x - mx, qp.y - mz
            vl = math.hypot(vx, vz) or 1
            if (vx * nx + vz * nz) / vl < 0.5:
                continue
            out.append((ax, az, bx, bz, nx, nz, L, d, rr))
        del area2
        self._edges[si] = out
        return out


# ------------------------------------------------------------------------------------------------ attach to a façade

class Facades:
    def __init__(self, T: Tile):
        self.T = T
        self.used = {}           # (si, edge index) -> [(u0, u1)]

    def candidates(self, x, z, bu=None, reach=20.0):
        T = self.T
        p = Point(x, z)
        out = []
        for si in T.tree.query(p.buffer(reach)):
            s = T.solids[si]
            if s["landmark"] or (bu and s["bu"] != bu):
                continue
            inside = s["poly"].contains(p)
            for ei, e in enumerate(T.edges_of(si)):
                ax, az, bx, bz, nx, nz, L, rd, rr = e
                d = LineString([(ax, az), (bx, bz)]).distance(p)
                if d > reach:
                    continue
                score = d + (0 if inside else 4.0) + 0.02 * rd
                out.append((score, si, ei, e))
        out.sort(key=lambda c: (c[0], c[1], c[2]))
        return out

    def attach(self, x, z, want_w, bu=None, reach=20.0, occupy=True):
        for score, si, ei, e in self.candidates(x, z, bu, reach):
            ax, az, bx, bz, nx, nz, L, rd, rr = e
            tx, tz = (bx - ax) / L, (bz - az) / L
            u = (x - ax) * tx + (z - az) * tz
            w = min(want_w, L - 0.6)
            if w < SHOP_MIN_W and occupy:
                continue
            w = max(w, 0.3)
            u = min(max(u, w / 2 + 0.3), L - w / 2 - 0.3) if L > w + 0.6 else L / 2
            if occupy:
                taken = self.used.setdefault((si, ei), [])
                u, w = self._fit(u, w, L, taken)
                if w < SHOP_MIN_W:
                    continue
                taken.append((u - w / 2, u + w / 2))
            s = self.T.solids[si]
            px, pz = ax + tx * u, az + tz * u
            ox, oz = px + nx * 1.2, pz + nz * 1.2
            yb = max(min(self.T.floor_y(ox, oz), s["base"] + 1.5), s["base"] - 0.5)
            # the sidewalk in front: from the wall to the kerb, along the normal (wall -> road centreline - half the carriageway)
            nr = self.T.nearest_road(px + nx * 0.5, pz + nz * 0.5, STREET_REACH)
            side = r2(max(0.0, nr[0] + 0.5 - nr[2]["half"])) if nr else None
            return {"si": int(si), "bu": s["bu"], "x": r2(px), "z": r2(pz), "nx": round(nx, 4), "nz": round(nz, 4), "w": r2(w), "y": r2(yb),
                    "edgeL": r2(L), "u": r2(u), "eaves": r2(s["eaves"]), "street": rr["name"], "dist": r2(score), "side": side}
        return None

    @staticmethod
    def _fit(u, w, L, taken):
        """slide / shrink [u - w/2, u + w/2] off the shopfronts already on this edge"""
        for _ in range(4):
            hit = [(a, b) for a, b in taken if a < u + w / 2 + 0.25 and b > u - w / 2 - 0.25]
            if not hit:
                return u, w
            a, b = hit[0]
            left_room = a - 0.25 - 0.3          # space to the left of the obstacle (from the edge start 0.3)
            right_room = L - 0.3 - (b + 0.25)
            if u < (a + b) / 2 and left_room > SHOP_MIN_W:
                w = min(w, left_room); u = a - 0.25 - w / 2
            elif right_room > SHOP_MIN_W:
                w = min(w, right_room); u = b + 0.25 + w / 2
            else:
                return u, 0.0
        return u, w


# ------------------------------------------------------------------------------------------------ hours

DAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"]


def parse_hours(s):
    """OSM opening_hours, the common forms only ('Mo-Fr 08:00-18:00; Sa 09:00-12:00', '24/7'): per weekday a list of
    [open, close] minutes; None when it is not one of those forms (the lab then lights the sign every evening)."""
    if not s:
        return None
    s = s.strip()
    if s == "24/7":
        return [[[0, 1440]] for _ in DAYS]
    week = [[] for _ in DAYS]
    try:
        for rule in s.split(";"):
            rule = rule.strip()
            if not rule:
                continue
            m = re.match(r"^((?:[A-Z][a-z](?:-[A-Z][a-z])?,?)+)\s+(.+)$", rule)
            if not m:
                return None
            days = set()
            for part in m.group(1).split(","):
                if "-" in part:
                    a, b = part.split("-")
                    ia, ib = DAYS.index(a), DAYS.index(b)
                    k = ia
                    while True:
                        days.add(k)
                        if k == ib:
                            break
                        k = (k + 1) % 7
                elif part:
                    days.add(DAYS.index(part))
            spans = m.group(2).strip()
            if spans == "off":
                for k in days:
                    week[k] = []
                continue
            sp = []
            for t in spans.split(","):
                a, b = t.strip().split("-")
                ha, ma = map(int, a.split(":")); hb, mb = map(int, b.split(":"))
                sp.append([ha * 60 + ma, hb * 60 + mb if hb * 60 + mb > ha * 60 + ma else hb * 60 + mb + 1440])
            for k in days:
                week[k] = sp
    except (ValueError, IndexError):
        return None
    return week


# ------------------------------------------------------------------------------------------------ the build

def load_raw(raw: Path):
    src = {}
    f = raw / "osm_pois.json"
    src["osm"] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    for k, n in (("stib", "stib_stops.json"), ("villo", "villo.json"), ("post", "pointpostal.json")):
        f = raw / n
        src[k] = json.loads(f.read_text(encoding="utf-8")) if f.exists() else None
    area = raw.parent / "osm" / "area.json"
    src["shelters"] = []
    if area.exists():      # bus / tram stop nodes with shelter=yes (the city's own OSM extract)
        for e in json.loads(area.read_text(encoding="utf-8"))["elements"]:
            t = e.get("tags") or {}
            if e["type"] == "node" and t.get("shelter") == "yes" and (t.get("highway") == "bus_stop" or t.get("public_transport") == "platform" or t.get("railway") == "tram_stop"):
                x, z = wgs_to_local(e["lon"], e["lat"])
                src["shelters"].append((float(x), float(z), e["id"]))
    src["addr_dir"] = raw / "addr"
    return src


def wfs_local(ft):
    e, n = ft["geometry"]["coordinates"][:2]
    return l72_to_local(e, n)


def heading_to_road(T, x, z, named=False):
    """(dir along the nearest road (unit), normal toward the road, distance) at (x, z)"""
    nr = T.nearest_road(x, z, 60.0 if named else 40.0, named)
    if not nr:
        return (1.0, 0.0), (0.0, 1.0), None, None
    d, ln, rr = nr
    s = ln.project(Point(x, z))
    a, b = ln.coords[0], ln.coords[-1]
    L = math.hypot(b[0] - a[0], b[1] - a[1]) or 1
    tx, tz = (b[0] - a[0]) / L, (b[1] - a[1]) / L
    q = ln.interpolate(s)
    vx, vz = q.x - x, q.y - z
    nx, nz = (-tz, tx) if (-tz * vx + tx * vz) >= 0 else (tz, -tx)
    return (tx, tz), (nx, nz), d, rr


def build_tile(name: str, src) -> dict:
    t0 = time.time()
    T = Tile(name)
    F = Facades(T)
    out = {"contract": CONTRACT, "tile": name, "bounds": {"x": [T.x0, T.x1], "z": [T.z0, T.z1]}, "pois": [], "fuel": [], "stops": [],
           "villo": [], "postboxes": [], "glass": [], "plates": [], "numbers": [], "skipped": {}}
    skip = out["skipped"]

    def skipped(k):
        skip[k] = skip.get(k, 0) + 1

    # ---- OSM POIs (nodes + way centres), sorted for a stable attach order (named first, then id)
    pois = []
    for e in (src["osm"] or {}).get("elements", []):
        t = e.get("tags") or {}
        kind = classify(t)
        if not kind:
            continue
        if e["type"] == "node":
            lon, lat = e["lon"], e["lat"]
        elif "center" in e:
            lon, lat = e["center"]["lon"], e["center"]["lat"]
        else:
            continue
        x, z = wgs_to_local(lon, lat)
        x, z = float(x), float(z)
        if not T.inside(x, z):
            continue
        pois.append((0 if t.get("name") or t.get("brand") else 1, f"{e['type'][0]}{e['id']}", x, z, kind, t))
    pois.sort(key=lambda p: (p[0], p[1]))
    villo_wfs = [(*wfs_local(f), f["properties"]) for f in (src["villo"] or {}).get("features", [])]
    post_wfs = [(*wfs_local(f), f["properties"]) for f in (src["post"] or {}).get("features", []) if f["properties"].get("type_code") == "PBUS"]

    for _, pid, x, z, kind, t in pois:
        pname = t.get("name") or t.get("brand")
        rec = {"id": "osm:" + pid, "kind": kind, "cat": t.get("shop") or t.get("amenity") or t.get("craft") or t.get("tourism"),
               "x": r2(x), "z": r2(z)}
        if pname:
            rec["name"] = pname
        if t.get("outdoor_seating"):
            rec["seating"] = t["outdoor_seating"]
        if t.get("brand") and t.get("brand") != pname:
            rec["brand"] = t["brand"]
        h = parse_hours(t.get("opening_hours"))
        if t.get("opening_hours"):
            rec["hours"] = t["opening_hours"]
        if h:
            rec["week"] = h
        if kind == "fuel":
            dirv, nrm, d, rr = heading_to_road(T, x, z, named=True)
            grades = [lab for k, lab in FUEL_GRADES if t.get(k) == "yes"]
            # the canopy: over the forecourt between the point and the road (a point inside a building = the shop)
            cx, cz = x, z
            inb = any(T.solids[j]["poly"].contains(Point(x, z)) for j in T.tree.query(Point(x, z)))
            if d is not None and (inb or d > 14):
                shift = max(0.0, d - 9.0)
                cx, cz = x + nrm[0] * shift, z + nrm[1] * shift
            yaw = math.atan2(dirv[1], dirv[0])
            tot = (cx + nrm[0] * 7.5 + dirv[0] * 8.5, cz + nrm[1] * 7.5 + dirv[1] * 8.5)
            rec.update({"cx": r2(cx), "cz": r2(cz), "y": r2(T.ground(cx, cz)), "yaw": round(yaw, 4), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4),
                        "grades": grades, "totem": [r2(tot[0]), r2(tot[1]), r2(T.floor_y(*tot))], "road": rr["name"] if rr else None,
                        "inBuilding": inb})
            out["fuel"].append(rec)
            continue
        if kind == "postbox":
            # the WFS (bpost's own list) wins when it has a box within 10 m (dedupe); else the OSM point
            if any(math.hypot(px - x, pz - z) < 10 for px, pz, _ in post_wfs):
                skipped("postbox (OSM, also in the bpost WFS)")
                continue
            dirv, nrm, d, rr = heading_to_road(T, x, z)
            out["postboxes"].append({"id": rec["id"], "x": r2(x), "z": r2(z), "y": r2(T.floor_y(x, z)), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4),
                                     "operator": t.get("operator") or t.get("brand"), "ref": t.get("ref"), "src": "osm"})
            continue
        if kind == "glass":
            dirv, nrm, d, rr = heading_to_road(T, x, z)
            out["glass"].append({"id": rec["id"], "x": r2(x), "z": r2(z), "y": r2(T.floor_y(x, z)), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4),
                                 "underground": t.get("location") == "underground", "operator": t.get("operator")})
            continue
        if kind == "villo":
            if any(math.hypot(px - x, pz - z) < 25 for px, pz, _ in villo_wfs):
                skipped("villo (OSM, also in the Villo WFS)")
                continue
            dirv, nrm, d, rr = heading_to_road(T, x, z)
            out["villo"].append({"id": rec["id"], "name": t.get("name"), "x": r2(x), "z": r2(z), "y": r2(T.floor_y(x, z)), "tx": round(dirv[0], 4),
                                 "tz": round(dirv[1], 4), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4), "stands": int(t["capacity"]) if (t.get("capacity") or "").isdigit() else None, "src": "osm"})
            continue
        if kind == "atm":
            fa = F.attach(x, z, 0.9, reach=12.0, occupy=False)
            if not fa:
                skipped("atm: no street façade within 12 m")
                continue
            rec["face"] = fa
            out["pois"].append(rec)
            continue
        want = SHOP_MAX_W if kind in ("supermarket", "restaurant", "bank") else 5.5
        fa = F.attach(x, z, want)
        if not fa:
            skipped(f"{kind}: no free street façade within 20 m")
            continue
        rec["face"] = fa
        if kind == "bank" and t.get("atm") == "yes":
            rec["atm"] = True
        out["pois"].append(rec)

    # ---- STIB stops
    shelters = src["shelters"]
    for f in sorted((src["stib"] or {}).get("features", []), key=lambda f: str(f["properties"].get("stop_id"))):
        x, z = wfs_local(f)
        if not T.inside(x, z):
            continue
        p = f["properties"]
        dirv, nrm, d, rr = heading_to_road(T, x, z)
        lines = [s for s in re.split(r"[{},\s]+", p.get("line") or "") if s]
        sh = min((math.hypot(sx - x, sz - z) for sx, sz, _ in shelters), default=99)
        out["stops"].append({"id": "stib:" + str(p.get("stop_id")), "fr": p.get("name_fr"), "nl": p.get("name_nl"), "lines": lines, "mode": p.get("mode"),
                             "x": r2(x), "z": r2(z), "y": r2(T.floor_y(x, z)), "tx": round(dirv[0], 4), "tz": round(dirv[1], 4),
                             "nx": round(nrm[0], 4), "nz": round(nrm[1], 4), "roadDist": r2(d) if d is not None else None, "shelter": sh < 15})

    # ---- Villo (WFS)
    for x, z, p in sorted(villo_wfs, key=lambda v: v[2].get("villo_id") or 0):
        if not T.inside(x, z):
            continue
        dirv, nrm, d, rr = heading_to_road(T, x, z)
        out["villo"].append({"id": f"villo:{p.get('villo_id')}", "name": p.get("name_fr"), "nameNl": p.get("name_nl"), "x": r2(x), "z": r2(z),
                             "y": r2(T.floor_y(x, z)), "tx": round(dirv[0], 4), "tz": round(dirv[1], 4), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4),
                             "stands": p.get("bike_stands"), "src": "wfs"})

    # ---- bpost letter boxes (WFS)
    for x, z, p in sorted(post_wfs, key=lambda v: v[2].get("gid") or 0):
        if not T.inside(x, z):
            continue
        dirv, nrm, d, rr = heading_to_road(T, x, z)
        out["postboxes"].append({"id": f"bpost:{p.get('gid')}", "x": r2(x), "z": r2(z), "y": r2(T.floor_y(x, z)), "nx": round(nrm[0], 4), "nz": round(nrm[1], 4),
                                 "operator": p.get("postaloperator"), "ref": p.get("name_fr"), "src": "wfs"})

    # ---- house numbers (UrbIS AddressNumbers): on the street-facing wall of their own building
    af = src["addr_dir"] / f"{name}.json"
    seen = set()
    if af.exists():
        for a in sorted(json.loads(af.read_text(encoding="utf-8"))["features"], key=lambda a: a.get("INSPIRE_ID") or ""):
            x, z = l72_to_local(a["e"], a["n"])
            if not T.inside(x, z) or not a.get("POLICENUM"):
                continue
            bu = a.get("BU_ID")
            fa = F.attach(x, z, 0.3, bu=bu, reach=12.0, occupy=False) if bu else None
            if not fa:
                fa = F.attach(x, z, 0.3, reach=6.0, occupy=False)
            if not fa:
                skipped("number: no street façade of its building")
                continue
            key = (a["POLICENUM"], round(fa["x"]), round(fa["z"]))
            if key in seen:
                continue
            seen.add(key)
            out["numbers"].append({"n": a["POLICENUM"], "x": fa["x"], "z": fa["z"], "y": fa["y"], "nx": fa["nx"], "nz": fa["nz"],
                                   "fr": a.get("STRNAMEFRE"), "nl": a.get("STRNAMEDUT"), "id": a.get("INSPIRE_ID")})
    else:
        skip["numbers: no UrbIS address file"] = 1

    # ---- bilingual street plates at the junctions where differently named streets meet
    deg = {}
    for rr in T.roads:
        if not rr["name"] or rr["hw"] in ("footway", "path", "steps", "cycleway", "track", "service", "bridleway"):
            continue
        for end, k0, k1 in (("a", 0, 1), ("b", -1, -2)):
            nid = rr[end]
            p0, p1 = rr["line"][k0], rr["line"][k1]
            L = math.hypot(p1[0] - p0[0], p1[1] - p0[1]) or 1
            deg.setdefault(nid, []).append((rr, ((p1[0] - p0[0]) / L, (p1[1] - p0[1]) / L)))
    placed = []
    for nid in sorted(deg):
        arms = deg[nid]
        names = sorted({a[0]["name"] for a in arms})
        if len(names) < 2:
            continue
        n = T.nodes[nid]
        jx, jz = n["x"], n["z"]
        if not T.inside(jx, jz):
            continue
        for nm in names:
            arm = next(a for a in arms if a[0]["name"] == nm)
            rr, (dx, dz) = arm
            if any(p["name"] == nm and math.hypot(p["jx"] - jx, p["jz"] - jz) < 30 for p in placed):
                continue
            fr, nl = split_name(nm)
            # the corner façades: walls within 22 m of the junction, parallel to this arm, on either side of it
            best = {}
            for si in T.tree.query(Point(jx, jz).buffer(22)):
                for e in T.edges_of(si):
                    ax, az, bx, bz, nx, nz, L, rd, er = e
                    tx, tz = (bx - ax) / L, (bz - az) / L
                    if abs(tx * dx + tz * dz) < 0.82:          # parallel to the arm
                        continue
                    lat = ((ax + bx) / 2 - jx) * -dz + ((az + bz) / 2 - jz) * dx     # + = left of the arm
                    side = 1 if lat > 0 else -1
                    if (-dz * nx + dx * nz) * lat >= 0 or abs(lat) > 18 or abs(lat) < 2:   # the wall must look at the arm
                        continue
                    # the end of the wall nearer the junction, 0.5 m in from the corner
                    da, db = (ax - jx) * dx + (az - jz) * dz, (bx - jx) * dx + (bz - jz) * dz
                    if max(da, db) < 1.0:
                        continue
                    if da < db:
                        u = max(0.5, -da + 1.2) if da < 0 else 0.5
                        u = min(u, L - 0.5); px, pz = ax + tx * u, az + tz * u
                    else:
                        u = max(0.5, -db + 1.2) if db < 0 else 0.5
                        u = min(u, L - 0.5); px, pz = bx - tx * u, bz - tz * u
                    along = (px - jx) * dx + (pz - jz) * dz
                    if along < 0 or along > 24:
                        continue
                    sc = along + abs(lat) * 0.5
                    if side not in best or sc < best[side][0]:
                        s = T.solids[si]
                        best[side] = (sc, px, pz, nx, nz, s)
            for side in sorted(best):
                sc, px, pz, nx, nz, s = best[side]
                yb = T.floor_y(px + nx * 1.0, pz + nz * 1.0)
                out["plates"].append({"name": nm, "fr": fr, "nl": nl, "x": r2(px + nx * 0.02), "z": r2(pz + nz * 0.02), "y": r2(yb + 2.7),
                                      "nx": round(nx, 4), "nz": round(nz, 4), "mount": "wall", "jx": r2(jx), "jz": r2(jz)})
            if not best:
                # no corner wall: a plate on its own post at the sidewalk corner (the arm's side away from the next arm)
                off = rr["half"] + 1.2
                px, pz = jx + dx * (off + 2.0) - dz * off, jz + dz * (off + 2.0) + dx * off
                out["plates"].append({"name": nm, "fr": fr, "nl": nl, "x": r2(px), "z": r2(pz), "y": r2(T.floor_y(px, pz)), "nx": round(-dz, 4), "nz": round(dx, 4),
                                      "tx": round(dx, 4), "tz": round(dz, 4), "mount": "post", "jx": r2(jx), "jz": r2(jz)})
            placed.append({"name": nm, "jx": jx, "jz": jz})
    for p in out["plates"]:
        del p["jx"], p["jz"]

    # ---- counts + timing
    from collections import Counter
    c = Counter(p["kind"] for p in out["pois"])
    out["counts"] = {**dict(sorted(c.items())), "fuel": len(out["fuel"]), "stops": len(out["stops"]), "villo": len(out["villo"]),
                     "postboxes": len(out["postboxes"]), "glass": len(out["glass"]), "plates": len(out["plates"]), "numbers": len(out["numbers"]),
                     "named": sum(1 for p in out["pois"] if p.get("name")) + sum(1 for p in out["fuel"] if p.get("name"))}
    out["buildMs"] = round((time.time() - t0) * 1000)
    return out


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("tiles", nargs="*")
    ap.add_argument("--all", action="store_true")
    ap.add_argument("--raw", type=Path, default=None)
    a = ap.parse_args()
    raw = (a.raw or default_raw()) / "streetlife"
    src = load_raw(raw)
    tiles = list(all_tiles()) if a.all else [t.upper() for t in a.tiles]
    OUT.mkdir(parents=True, exist_ok=True)
    meta = {"osm": (src["osm"] or {}).get("_query"), "stib": (src["stib"] or {}).get("_query"), "villo": (src["villo"] or {}).get("_query"),
            "post": (src["post"] or {}).get("_query")}
    total = {}
    for t in tiles:
        if not (TILES / t / "buildings.json").exists():
            continue
        d = build_tile(t, src)
        ms = d.pop("buildMs")
        d["sources"] = {"osm": "OpenStreetMap (c) OpenStreetMap contributors, ODbL; extract " + str((meta["osm"] or {}).get("osm_base")),
                        "stib": "Brussels Mobility WFS bm_public_transport:stib_stops", "villo": "Brussels Mobility WFS bm_bike:villo",
                        "post": "Brussels Mobility WFS bm_other:pointpostal (bpost letter boxes)", "addresses": "UrbIS AddressNumbers (CC0)",
                        "buildings": "UrbIS 3D (CC0)"}
        (OUT / f"{t}.json").write_text(json.dumps(d, ensure_ascii=False, separators=(",", ":"), sort_keys=True), encoding="utf-8")
        for k, v in d["counts"].items():
            total[k] = total.get(k, 0) + v
        print(f"{t}: {ms} ms {d['counts']} skipped {d['skipped']}", file=sys.stderr)
    (OUT / "summary.json").write_text(json.dumps({"tiles": len(tiles), "counts": dict(sorted(total.items()))}, indent=1), encoding="utf-8")
    print("total", dict(sorted(total.items())), file=sys.stderr)


if __name__ == "__main__":
    main()
