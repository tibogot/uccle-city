"""PETROL STATIONS, laid out per tile: data/fuel/<T>.json (+ data/fuel/summary.json). Deterministic.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/fuel/build_fuel.py --raw C:/Users/tibog/Downloads/uccle-city/data/raw

Inputs (never substituted: a missing input is reported and the station falls back to the next rule, listed in the doc)
  stations     every amenity=fuel (node / area) of data/raw/fuel/osm_fuel.json (tools/fuel/fetch_fuel.py, OSM API round
               each station of the street-life POI pull) that lies on a city tile: position, brand / name / operator,
               compressed_air, opening_hours, fuel:*
  canopy       1. the UrbIS DSM - DTM (<raw>/urbis/dsm, dtm; 0.5 m, 2021): the flat (3x3 roughness < 0.35 m) 3.4-7.8 m high
                  blob outside the UrbIS footprints nearest the station (<= 25 m): its minimum rotated rectangle and its
                  median height = the canopy's top
               2. OSM building=roof / man_made=canopy within 20 m (outside Brussels: no DSM)
               3. tools/fuel/survey.json "canopy": {w, d, at: osm, align: road}: a size read on the aerial's scale bar
                  (look only), centred on the OSM point, long side along the nearest road
  type, shop, car wash, scheme: tools/fuel/survey.json (what was seen, look only; docs/assets/FUEL.md)
  the street   data/tiles/<T>/: terrain (DTM 1 m), buildings (UrbIS footprints + wall triangles), roads (the engine's
               centrelines and half widths), surfaces (the measured kerb lift)
Layout (a canopy's frame: local x along its long side, +z toward the nearest named road; yaw as viewer/stops: local z ->
(sin yaw, cos yaw), local x -> (cos yaw, -sin yaw))
  islands      rows along x: max(1, round(d / 8)) rows of max(1, round(w / 9.5)) islands (5.0 x 1.3 m kerbed), the
               column at one end of each island (alternating), one double-sided dispenser, crash bumpers at both ends
  canopy       deck + soffit, fascia (0.95 m) on the four sides with rounded corners, LED panels on a ~3 m grid, the brand
               sign on both long sides, solar panels on top where seen; its top = the DSM height
  forecourt    a concrete slab: the canopy rectangle grown by 3 m (2.5 m behind) and shrunk on any side that would enter a
               building or the carriageway; heights on a 1 m grid = the walking surface + 3 cm; a skirt goes 0.25 m down
  totem        on the road side, 1.2 m behind the kerb, at the canopy's end clear of buildings; faces along the road
  shop         'building': a glazed front (1.5 m bays, a sliding door in the middle) + a signage band on the UrbIS wall
               facing the canopy (the real wall plane from the wall triangles); 'none': a pay terminal
  under        pumps along a building whose own overhang is the canopy (the UrbIS solid is drawn to the ground): islands
               2.6 m outside the wall facing the road, a fascia band on the wall at 3.4 m
  kerbside     one island 2.4 m in front of the house / garage facing the road, a tall price sign
  air / water  where OSM compressed_air=yes: at the back corner of the canopy, clear of buildings
  car wash     an OSM amenity=car_wash within 45 m that no UrbIS solid already draws: the wash box there
  bays         white lane edges 3.2 m each side of every island row (on the slab), a drainage channel along its road edge
  height       every piece stands on the walking surface at its own point (+ the slab's 3 cm); islands, columns, totems,
               plinths go 0.3-0.5 m into the ground (JOINS: no floating foot on a slope)
Output per station: { id, name, brand, scheme, type, canopy, slab, inst: { <piece>: [x, y, z, yaw, sx, sy, sz, 0] ... },
colliders (what the car / walker meet, drawn: columns, islands, dispensers, totem, shop front, air stand, wash box) }
"""
from __future__ import annotations

import argparse, json, math, sys, time
from pathlib import Path

import numpy as np
import rasterio
from rasterio.features import rasterize
from rasterio.merge import merge
from rasterio.transform import from_origin
from scipy import ndimage
from shapely.geometry import LineString, MultiPoint, Point, Polygon

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
sys.path.insert(0, str(ROOT / "tools" / "streetlife"))
from common import l72_to_local, local_to_l72, tile_of_point, wgs_to_local  # noqa: E402
from build_streetlife import Tile  # noqa: E402

CONTRACT = "fuel-0.1"
OUT = ROOT / "data" / "fuel"
SURVEY = json.loads((HERE / "survey.json").read_text(encoding="utf-8"))
SCHEMES = SURVEY["schemes"]
FASCIA = 0.95                     # fascia height (m), tools/blender/fuelKit.py
ISLAND = (5.0, 1.3)               # island length / width
SLAB_Y = 0.03                     # the slab's top over the walking surface


def r2(v): return round(float(v), 2)
def r3(v): return round(float(v), 3)
def r4(v): return round(float(v), 4)


# ------------------------------------------------------------------------------------------------ DSM canopy
def mosaic(src: Path, b):
    keep = []
    for f in sorted(src.rglob("*.tif")):
        with rasterio.open(f) as ds:
            bb = ds.bounds
            if bb.right > b[0] and bb.left < b[2] and bb.top > b[1] and bb.bottom < b[3]:
                keep.append(f)
    if not keep:
        return None
    dss = [rasterio.open(f) for f in keep]
    try:
        a, _ = merge(dss, bounds=b, res=0.5, nodata=np.nan, dtype="float64")
    finally:
        for d in dss: d.close()
    a = a[0]; a[a < -1000] = np.nan
    return a


def dsm_canopy(raw: Path, T: Tile, x, z):
    """the canopy blob nearest (x, z): (rect polygon local, median height over the DTM, fill) or None"""
    e, n = local_to_l72(x, z)
    R = 40.0
    b = (e - R, n - R, e + R, n + R)
    s, t = mosaic(raw / "urbis" / "dsm", b), mosaic(raw / "urbis" / "dtm", b)
    if s is None or t is None or np.isnan(s).mean() > 0.5:
        return None
    h = s - t
    tr = from_origin(b[0], b[3], 0.5, 0.5)
    polys = [Polygon([local_to_l72(px, pz) for px, pz in sd["ring"]]) for sd in T.solids if sd["poly"].distance(Point(x, z)) < 70]
    bm = rasterize([(p, 1) for p in polys if p.is_valid], out_shape=h.shape, transform=tr, fill=0) if polys else np.zeros(h.shape, np.uint8)
    rough = ndimage.generic_filter(np.nan_to_num(s), np.std, size=3)
    m = (h > 3.4) & (h < 7.8) & (rough < 0.35) & (bm == 0)
    m = ndimage.binary_opening(m, iterations=1)
    lab, nl = ndimage.label(m)
    best = None
    for i in range(1, nl + 1):
        cells = np.argwhere(lab == i)
        if len(cells) < 120:                                     # 30 m2
            continue
        pts = [l72_to_local(b[0] + (c[1] + 0.5) * 0.5, b[3] - (c[0] + 0.5) * 0.5) for c in cells]
        hull = MultiPoint(pts).convex_hull
        d = hull.distance(Point(x, z))
        if d > 25:
            continue
        rr = hull.minimum_rotated_rectangle
        fill = len(cells) * 0.25 / rr.area
        if best is None or d < best[0]:
            best = (d, rr, float(np.median(h[lab == i])), fill, len(cells) * 0.25)
    return best and {"rect": best[1], "h": best[2], "fill": best[3], "area": best[4], "dist": best[0]}


def rect_frame(rr: Polygon):
    """centre, unit long axis, long, short of a rectangle polygon"""
    c = list(rr.exterior.coords)
    e = [(c[1][0] - c[0][0], c[1][1] - c[0][1]), (c[2][0] - c[1][0], c[2][1] - c[1][1])]
    L = [math.hypot(*v) for v in e]
    k = 0 if L[0] >= L[1] else 1
    ax = (e[k][0] / L[k], e[k][1] / L[k])
    return (rr.centroid.x, rr.centroid.y), ax, L[k], L[1 - k]


# ------------------------------------------------------------------------------------------------ frames
class Frame:
    """local x along, z toward the road; yaw as viewer/stops (rotation about Y)"""
    def __init__(self, cx, cz, zx, zz):
        l = math.hypot(zx, zz) or 1
        self.cx, self.cz, self.zx, self.zz = cx, cz, zx / l, zz / l
        self.yaw = math.atan2(self.zx, self.zz)
        self.xx, self.xz = math.cos(self.yaw), -math.sin(self.yaw)

    def w(self, lx, lz):
        return self.cx + self.xx * lx + self.zx * lz, self.cz + self.xz * lx + self.zz * lz

    def rect(self, x0, x1, z0, z1):
        return Polygon([self.w(x0, z0), self.w(x1, z0), self.w(x1, z1), self.w(x0, z1)])


def toward_road(T: Tile, x, z):
    """(unit vector toward the nearest named road, distance, road) from (x, z)"""
    nr = T.nearest_road(x, z, 70.0, True) or T.nearest_road(x, z, 70.0, False)
    if not nr:
        return None
    d, ln, rr = nr
    q = ln.interpolate(ln.project(Point(x, z)))
    vx, vz = q.x - x, q.y - z
    l = math.hypot(vx, vz) or 1
    # the road's own direction there (for along-road things)
    s = ln.project(Point(x, z))
    a, b2 = ln.interpolate(max(0, s - 1)), ln.interpolate(min(ln.length, s + 1))
    tl = math.hypot(b2.x - a.x, b2.y - a.y) or 1
    return (vx / l, vz / l), d, rr, ((b2.x - a.x) / tl, (b2.y - a.y) / tl)


def kerb_dist(T: Tile, x, z):
    """distance from (x, z) to the nearest carriageway edge (road centreline distance - the engine's half width); + = off it"""
    best = None
    p = Point(x, z)
    for i in T.segtree.query(p.buffer(40)):
        ln, rr = T.segs[i]
        if rr["hw"] in ("service", "footway", "path", "cycleway", "pedestrian", "steps", "track"):
            continue
        d = ln.distance(p) - rr["half"]
        if best is None or d < best:
            best = d
    return best if best is not None else 99.0


def in_building(T: Tile, poly, tol=0.15):
    q = poly.buffer(-tol) if poly.area > 0.5 else poly
    return any(T.solids[j]["poly"].intersects(q) for j in T.tree.query(q))


# ------------------------------------------------------------------------------------------------ one station
class Station:
    def __init__(self, sid, x, z, tags, T: Tile, raw: Path, osm):
        self.id, self.x, self.z, self.tags, self.T, self.raw, self.osm = sid, x, z, tags, T, raw, osm
        self.sv = SURVEY["stations"].get(sid, {})
        self.inst = {}
        self.col = []
        self.notes = []
        self.scheme = SCHEMES.index(self.sv.get("scheme", "brook"))

    def put(self, piece, x, z, yaw, y=None, s=(1, 1, 1), dy=0.0):
        if y is None:
            y = self.y(x, z)
        self.inst.setdefault(piece, []).extend([r3(x), r3(y + dy), r3(z), r4(yaw), r3(s[0]), r3(s[1]), r3(s[2]), 0])

    def y(self, x, z):
        """the slab / walking surface at (x, z)"""
        return self.T.floor_y(x, z) + (SLAB_Y if self.slab_poly is not None and self.slab_poly.contains(Point(x, z)) else 0.0)

    slab_poly = None

    # ---- the canopy rectangle (centre, long axis, w, d, top over ground)
    def canopy(self):
        T, sv = self.T, self.sv
        how = sv.get("canopy")
        if how == "dsm":
            c = dsm_canopy(self.raw, T, self.x, self.z)
            if c:
                (cx, cz), ax, w, d = rect_frame(c["rect"])
                w, d = w + 0.8, d + 0.8                             # (the 3x3 roughness + opening eat ~0.4 m round the blob)
                roof = self.osm_roof(c["rect"])
                if roof is not None and roof[1].area > w * d:
                    (cx, cz), ax, w, d = rect_frame(roof[1].minimum_rotated_rectangle)
                    self.notes.append(f"canopy: OSM way {roof[2]} (building=roof) over the DSM blob: {w:.1f} x {d:.1f} m, the DSM's {c['h']:.2f} m high")
                    return cx, cz, ax, w, d, c["h"], "osm+dsm"
                if "depth" in sv:
                    d = sv["depth"]
                self.notes.append(f"canopy from the DSM: {w:.1f} x {d:.1f} m, {c['h']:.2f} m high, fill {c['fill']:.2f}")
                return cx, cz, ax, w, d, c["h"], "dsm"
            self.notes.append("no DSM canopy found: OSM roof next")
            how = "osm"
        if how == "osm":
            best = self.osm_roof(Point(self.x, self.z).buffer(20))
            if best:
                (cx, cz), ax, w, d = rect_frame(best[1].minimum_rotated_rectangle)
                self.notes.append(f"canopy from OSM way {best[2]} (building=roof): {w:.1f} x {d:.1f} m, height 5.3 m (no DSM)")
                return cx, cz, ax, w, d, 5.3, "osm"
            self.notes.append("no OSM roof either")
            return None
        if False:
            best = None
            for e in self.osm:
                t = e.get("tags") or {}
                if e["type"] != "way" or not (t.get("building") == "roof" or t.get("man_made") == "canopy"):
                    continue
                g = e.get("geometry") or []
                if len(g) < 4:
                    continue
                poly = Polygon([wgs_to_local(p["lon"], p["lat"]) for p in g])
                d = poly.distance(Point(self.x, self.z))
                if d < 20 and 25 < poly.area < 800 and (best is None or d < best[0]):
                    best = (d, poly, e["id"])
            if best:
                (cx, cz), ax, w, d = rect_frame(best[1].minimum_rotated_rectangle)
                self.notes.append(f"canopy from OSM way {best[2]} (building=roof): {w:.1f} x {d:.1f} m, height 5.3 m (no DSM)")
                return cx, cz, ax, w, d, 5.3, "osm"
            self.notes.append("no OSM roof either")
            return None
        if isinstance(how, dict):
            tr = toward_road(T, self.x, self.z)
            ax = tr[3] if tr else (1.0, 0.0)
            self.notes.append(f"canopy from the survey: {how['w']} x {how['d']} m at the OSM point, along the road, 5.3 m (no DSM)")
            return self.x, self.z, ax, how["w"], how["d"], 5.3, "survey"
        return None

    def osm_roof(self, area):
        """the OSM building=roof / man_made=canopy polygon meeting `area` (largest overlap): (overlap, poly, way id)"""
        best = None
        for e in self.osm:
            t = e.get("tags") or {}
            if e["type"] != "way" or not (t.get("building") == "roof" or t.get("man_made") == "canopy"):
                continue
            g = e.get("geometry") or []
            if len(g) < 4:
                continue
            poly = Polygon([wgs_to_local(p["lon"], p["lat"]) for p in g])
            if not poly.is_valid or not 25 < poly.area < 800:
                continue
            ov = poly.intersection(area).area
            if ov > 1.0 and (best is None or ov > best[0]):
                best = (ov, poly, e["id"])
        return best

    def frame_at(self, cx, cz, ax):
        """local x along ax, +z toward the road"""
        tr = toward_road(self.T, cx, cz)
        zx, zz = -ax[1], ax[0]
        if tr and zx * tr[0][0] + zz * tr[0][1] < 0:
            zx, zz = -zx, -zz
        return Frame(cx, cz, zx, zz)

    # ---- the forecourt slab: a rectangle in frame F grown by margins, shrunk where it would enter a building / the road
    def slab(self, F: Frame, x0, x1, z0, z1, grow=(3.0, 3.0, 2.5, 3.0)):
        T = self.T
        m = list(grow)            # -x, +x, -z (back), +z (front)
        for k in range(4):
            while m[k] > 0:
                p = F.rect(x0 - m[0], x1 + m[1], z0 - m[2], z1 + m[3])
                bad = in_building(T, p, 0.2)
                if not bad:
                    # the front / ends must stay off the carriageway (0.3 m short of the kerb line)
                    corners = list(p.exterior.coords)[:4]
                    bad = any(kerb_dist(T, cx, cz) < 0.3 for cx, cz in corners)
                if not bad:
                    break
                m[k] = round(m[k] - 0.25, 2)
            m[k] = max(0.0, m[k])
        X0, X1, Z0, Z1 = x0 - m[0], x1 + m[1], z0 - m[2], z1 + m[3]
        poly = F.rect(X0, X1, Z0, Z1)
        nx, nz = max(2, int(math.ceil((X1 - X0) / 1.0)) + 1), max(2, int(math.ceil((Z1 - Z0) / 1.0)) + 1)
        ys = []
        for j in range(nz):
            for i in range(nx):
                lx, lz = X0 + (X1 - X0) * i / (nx - 1), Z0 + (Z1 - Z0) * j / (nz - 1)
                wx, wz = F.w(lx, lz)
                ys.append(r3(T.floor_y(wx, wz) + SLAB_Y))
        self.slab_poly = poly
        return {"cx": r3(F.cx), "cz": r3(F.cz), "yaw": r4(F.yaw), "x": [r2(X0), r2(X1)], "z": [r2(Z0), r2(Z1)], "nx": nx, "nz": nz, "ys": ys}

    # ---- pieces
    def island(self, F: Frame, lx, lz, k, with_column, deck_y=None):
        """an island along local x at (lx, lz): kerb, bumpers, dispenser, column (local x end +-1.8)"""
        x, z = F.w(lx, lz)
        y = self.y(x, z)
        self.put("island", x, z, F.yaw, y=y)
        self.col.append(("island", F.rect(lx - ISLAND[0] / 2, lx + ISLAND[0] / 2, lz - ISLAND[1] / 2, lz + ISLAND[1] / 2), y, y + 0.16))
        top = y + 0.16
        for e in (-1, 1):
            bx, bz = F.w(lx + e * (ISLAND[0] / 2 - 0.25), lz)
            self.put("bumper", bx, bz, F.yaw + (0 if e > 0 else math.pi), y=top)
        cs = 1 if k % 2 == 0 else -1
        dx, dz = F.w(lx - cs * 0.55, lz)
        self.put("dispenser", dx, dz, F.yaw, y=top)
        self.col.append(("dispenser", F.rect(lx - cs * 0.55 - 0.6, lx - cs * 0.55 + 0.6, lz - 0.3, lz + 0.3), top, top + 1.95))
        if with_column and deck_y is not None:
            px, pz = F.w(lx + cs * 1.65, lz)
            cy = y - 0.5
            self.put("canopy_column", px, pz, F.yaw, y=cy, s=(1, deck_y - cy, 1))
            self.put("column_base", px, pz, F.yaw, y=top)
            self.col.append(("column", F.rect(lx + cs * 1.65 - 0.2, lx + cs * 1.65 + 0.2, lz - 0.2, lz + 0.2), y, deck_y))

    def canopy_pieces(self, F: Frame, w, d, top, solar):
        """deck, fascia, corners, lights, signs, solar on top (absolute top y)"""
        R = 0.35                                                    # corner radius (tools/blender/fuelKit.py)
        under = top - FASCIA                                        # fascia bottom
        deck = under + 0.12                                         # the soffit
        cy = top
        self.put("canopy_deck", F.cx, F.cz, F.yaw, y=deck, s=(w - 0.3, 1, d - 0.3))
        for side, (lx, lz, yaw, L) in enumerate(((0, d / 2, F.yaw, w), (0, -d / 2, F.yaw + math.pi, w),
                                                 (w / 2, 0, F.yaw + math.pi / 2, d), (-w / 2, 0, F.yaw - math.pi / 2, d))):
            x, z = F.w(lx, lz)
            self.put("canopy_fascia", x, z, yaw, y=cy, s=(L - 2 * R, 1, 1))
        for ex, ez, yaw in ((1, 1, F.yaw), (-1, 1, F.yaw - math.pi / 2), (-1, -1, F.yaw + math.pi), (1, -1, F.yaw + math.pi / 2)):
            x, z = F.w(ex * w / 2, ez * d / 2)
            self.put("canopy_corner", x, z, yaw, y=cy)
        # brand signs: centred on both long sides, and on the short ends when they are >= 6 m
        for lz, yaw in ((d / 2, F.yaw), (-d / 2, F.yaw + math.pi)):
            x, z = F.w(0, lz)
            self.put("fascia_sign", x, z, yaw, y=cy - FASCIA / 2)
        if d >= 6.0:
            for lx, yaw in ((w / 2, F.yaw + math.pi / 2), (-w / 2, F.yaw - math.pi / 2)):
                x, z = F.w(lx, 0)
                self.put("fascia_sign", x, z, yaw, y=cy - FASCIA / 2)
        # LED panels on a ~3 m grid
        nx, nz = max(1, round((w - 1.0) / 3.0)), max(1, round((d - 1.0) / 3.0))
        for i in range(nx):
            for j in range(nz):
                lx, lz = -w / 2 + w * (i + 0.5) / nx, -d / 2 + d * (j + 0.5) / nz
                x, z = F.w(lx, lz)
                self.put("canopy_light", x, z, F.yaw, y=deck)
        if solar:
            self.put("solar", F.cx, F.cz, F.yaw, y=top - 0.12, s=(w - 1.0, 1, d - 1.0))
        self.col.append(("canopy", F.rect(-w / 2, w / 2, -d / 2, d / 2), under, top))

    def totem(self, F: Frame, w, d, tall=True):
        """on the road side, as close to the kerb as 1.2 m allows, beside an end of the canopy clear of buildings; faces
        along the road"""
        T = self.T
        for ex in (1, -1):
            lx = ex * (w / 2 + 0.9)
            for lz in np.arange(d / 2 + 8.0, d / 2 - 1.6, -0.25):
                x, z = F.w(lx, lz)
                if kerb_dist(T, x, z) < 1.2:
                    continue
                if in_building(T, F.rect(lx - 0.8, lx + 0.8, lz - 0.4, lz + 0.4), 0.05):
                    continue
                if self.slab_poly is not None and not self.slab_poly.buffer(4.0).contains(Point(x, z)):
                    continue
                self.put("totem", x, z, F.yaw + math.pi / 2)
                self.col.append(("totem", F.rect(lx - 0.25, lx + 0.25, lz - 0.7, lz + 0.7), self.y(x, z), self.y(x, z) + 5.6))
                for bx in (-0.9, 0.9):
                    qx, qz = F.w(lx, lz + bx)
                    self.put("bollard", qx, qz, F.yaw)
                return True
        self.notes.append("no room for the totem on the road side")
        return False

    def shopfront(self, F: Frame, w, d):
        """a glazed front + signage band on the UrbIS wall facing the canopy (within 8 m of it)"""
        T = self.T
        canopy = F.rect(-w / 2, w / 2, -d / 2, d / 2)
        best = None
        for j in T.tree.query(canopy.buffer(8.0)):
            sd = T.solids[j]
            ring = sd["ring"][:-1] if sd["ring"][0] == sd["ring"][-1] else sd["ring"]
            for k in range(len(ring)):
                (ax, az), (bx, bz) = ring[k], ring[(k + 1) % len(ring)]
                L = math.hypot(bx - ax, bz - az)
                if L < 3.0:
                    continue
                tx, tz = (bx - ax) / L, (bz - az) / L
                nx, nz = tz, -tx
                mx, mz = (ax + bx) / 2, (az + bz) / 2
                if sd["poly"].contains(Point(mx + nx * 0.3, mz + nz * 0.3)):
                    nx, nz = -nx, -nz
                seg = LineString([(ax, az), (bx, bz)])
                dist = seg.distance(canopy)
                if dist > 8.0:
                    continue
                # faces the canopy
                c = canopy.centroid
                if (c.x - mx) * nx + (c.y - mz) * nz <= 0:
                    continue
                # the open side: nothing built right in front of it
                if any(i2 != j and T.solids[i2]["poly"].contains(Point(mx + nx * 0.6, mz + nz * 0.6)) for i2 in T.tree.query(Point(mx + nx * 0.6, mz + nz * 0.6))):
                    continue
                score = dist - min(L, 10) * 0.15
                if best is None or score < best[0]:
                    best = (score, j, ax, az, tx, tz, nx, nz, L)
        if not best:
            self.notes.append("no shop wall within 8 m of the canopy")
            return False
        _, j, ax, az, tx, tz, nx, nz, L = best
        # the stretch of the wall nearest the canopy centre, up to 9 m
        c = canopy.centroid
        u = min(max((c.x - ax) * tx + (c.y - az) * tz, 0), L)
        span = min(L - 0.6, 9.0)
        u0 = min(max(u - span / 2, 0.3), L - 0.3 - span)
        y0 = T.floor_y(ax + tx * (u0 + span / 2) + nx * 0.5, az + tz * (u0 + span / 2) + nz * 0.5)
        off, rnx, rnz = T.wall_offset(j, ax, az, tx, tz, nx, nz, u0, u0 + span, y0)
        n_bays = max(2, int(span // 1.5))
        bay = span / n_bays
        yaw = math.atan2(rnx, rnz)                               # local +z = out of the wall
        mid = n_bays // 2
        for i in range(n_bays):
            uu = u0 + (i + 0.5) * bay
            x, z = ax + tx * uu + rnx * (off + 0.04), az + tz * uu + rnz * (off + 0.04)
            self.put("shopdoor" if i == mid else "shopfront", x, z, yaw, s=(bay / 1.5, 1, 1))
        uc = u0 + span / 2
        x, z = ax + tx * uc + rnx * (off + 0.04), az + tz * uc + rnz * (off + 0.04)
        yb = self.y(x, z)
        self.put("shopsign", x, z, yaw, y=yb + 3.2, s=(span + 0.3, 1, 1))
        self.put("fascia_sign", x + rnx * 0.12, z + rnz * 0.12, yaw, y=yb + 3.6)
        for e in (-1, 1):
            ue = uc + e * (span / 2 + 0.6)
            if 0.2 < ue < L - 0.2:
                self.put("bollard", ax + tx * ue + rnx * (off + 0.7), az + tz * ue + rnz * (off + 0.7), yaw)
        self.col.append(("shopfront", Polygon([(ax + tx * u0 + rnx * off, az + tz * u0 + rnz * off), (ax + tx * (u0 + span) + rnx * off, az + tz * (u0 + span) + rnz * off),
                                               (ax + tx * (u0 + span) + rnx * (off + 0.25), az + tz * (u0 + span) + rnz * (off + 0.25)), (ax + tx * u0 + rnx * (off + 0.25), az + tz * u0 + rnz * (off + 0.25))]), yb, yb + 3.4))
        self.shop = {"bu": T.solids[j]["bu"], "span": r2(span), "bays": n_bays}
        return True

    def build(self):
        T, sv = self.T, self.sv
        typ = sv.get("type", "canopy")
        out = {"id": self.id, "name": sv.get("name") or self.tags.get("name"), "brand": self.tags.get("brand") or self.tags.get("name"),
               "operator": self.tags.get("operator"), "scheme": self.scheme, "schemeName": SCHEMES[self.scheme], "type": typ,
               "osm": {"x": r2(self.x), "z": r2(self.z)}}
        self.shop = None
        if typ == "canopy":
            c = self.canopy()
            if not c:
                typ = out["type"] = "kerbside"
                self.notes.append("no canopy: laid out as kerbside")
        if typ == "canopy":
            cx, cz, ax, w, d, h, src = c
            F = self.frame_at(cx, cz, ax)
            out["slab"] = self.slab(F, -w / 2, w / 2, -d / 2, d / 2)
            gy = self.y(cx, cz)
            top = gy + h
            deck_y = top - FASCIA + 0.12
            out["canopy"] = {"cx": r3(cx), "cz": r3(cz), "yaw": r4(F.yaw), "w": r2(w), "d": r2(d), "top": r3(top), "h": r2(h), "src": src,
                             "pitched": bool(sv.get("pitched"))}
            self.canopy_pieces(F, w, d, top, sv.get("solar"))
            rows, k = max(1, round(d / 8.0)), max(1, round(w / 9.5))
            while k > 1 and w < k * (ISLAND[0] + 1.6):
                k -= 1
            n = 0
            for r in range(rows):
                lz = -d / 2 + d * (r + 0.5) / rows
                for i in range(k):
                    lx = -w / 2 + w * (i + 0.5) / k
                    self.island(F, lx, lz, n, True, deck_y)
                    n += 1
            out["islands"] = n
            for r in range(rows):                                   # lane edges each side of every row
                lz = -d / 2 + d * (r + 0.5) / rows
                for e in (-1, 1):
                    zz = lz + e * 3.2
                    x, z = F.w(0, zz)
                    if self.slab_poly.buffer(-0.2).contains(Point(x, z)):
                        self.put("line", x, z, F.yaw, s=(max(2.0, w - 1.0), 1, 1))
            self.totem(F, w, d)
            S = out["slab"]
            gx, gz = F.w((S["x"][0] + S["x"][1]) / 2, S["z"][1] - 0.45)    # the drainage channel along the road edge
            n_g = max(1, int(S["x"][1] - S["x"][0] - 1.2))           # whole 1 m channel units (never stretched)
            for i in range(n_g):
                gx, gz = F.w((S["x"][0] + S["x"][1]) / 2 + (i - (n_g - 1) / 2), S["z"][1] - 0.45)
                self.put("grate", gx, gz, F.yaw)
            if sv.get("shop") == "building":
                self.shopfront(F, w, d)
            if sv.get("paypoint") or sv.get("shop") == "none":
                lx, lz = 0.0, -d / 2 + 0.6
                x, z = F.w(lx, lz)
                self.put("paypoint", x, z, F.yaw)
                self.col.append(("paypoint", F.rect(lx - 0.35, lx + 0.35, lz - 0.3, lz + 0.3), self.y(x, z), self.y(x, z) + 2.2))
            if self.tags.get("compressed_air") == "yes":
                for ex in (-1, 1):
                    lx, lz = ex * (w / 2 + 1.0), -d / 2 + 0.6
                    x, z = F.w(lx, lz)
                    foot = F.rect(lx - 0.5, lx + 0.5, lz - 0.5, lz + 0.5)
                    if not in_building(T, foot, 0.05) and kerb_dist(T, x, z) > 1.0:
                        self.put("airstand", x, z, F.yaw)
                        self.col.append(("airstand", F.rect(lx - 0.25, lx + 0.25, lz - 0.2, lz + 0.2), self.y(x, z), self.y(x, z) + 1.4))
                        break
            self.carwash(F)
        elif typ in ("under", "kerbside"):
            ok = self.along_building(out, typ)
            if not ok:
                return None
        out["inst"] = self.inst
        out["colliders"] = [{"kind": k, "ring": [[r2(a), r2(b)] for a, b in list(p.exterior.coords)[:-1]], "y0": r2(y0), "y1": r2(y1)} for k, p, y0, y1 in self.col]
        out["shop"] = self.shop
        out["notes"] = self.notes
        out["counts"] = {k: len(v) // 8 for k, v in sorted(self.inst.items())}
        return out

    def carwash(self, F: Frame):
        for e in self.osm:
            t = e.get("tags") or {}
            if t.get("amenity") != "car_wash" or e["type"] != "node":
                continue
            x, z = wgs_to_local(e["lon"], e["lat"])
            x, z = float(x), float(z)
            if math.hypot(x - self.x, z - self.z) > 45:
                continue
            if any(self.T.solids[j]["poly"].contains(Point(x, z)) for j in self.T.tree.query(Point(x, z))):
                self.notes.append(f"car wash (OSM node {e['id']}) inside an UrbIS solid: already drawn as a building")
                continue
            for yaw in (F.yaw, F.yaw + math.pi / 2):
                G = Frame(x, z, math.sin(yaw), math.cos(yaw))
                foot = G.rect(-2.4, 2.4, -3.9, 3.9)
                if not in_building(self.T, foot, 0.1) and not (self.slab_poly is not None and foot.intersects(self.slab_poly.buffer(-1.0))):
                    self.put("carwash", x, z, yaw)
                    self.col.append(("carwash", foot, self.y(x, z), self.y(x, z) + 3.7))
                    self.notes.append(f"car wash at OSM node {e['id']}")
                    break
            else:
                self.notes.append(f"car wash (OSM node {e['id']}): no room for the box")

    def along_building(self, out, typ):
        """'under' / 'kerbside': islands outside the wall of the building at the OSM point that faces the road"""
        T = self.T
        p = Point(self.x, self.z)
        cand = sorted(((T.solids[j]["poly"].distance(p), j) for j in T.tree.query(p.buffer(15))))
        if not cand:
            self.notes.append("no building near the point")
            return False
        j = cand[0][1]
        sd = T.solids[j]
        ring = sd["ring"][:-1] if sd["ring"][0] == sd["ring"][-1] else sd["ring"]
        best = None
        for k in range(len(ring)):
            (ax, az), (bx, bz) = ring[k], ring[(k + 1) % len(ring)]
            L = math.hypot(bx - ax, bz - az)
            if L < 4.0:
                continue
            tx, tz = (bx - ax) / L, (bz - az) / L
            nx, nz = tz, -tx
            mx, mz = (ax + bx) / 2, (az + bz) / 2
            if sd["poly"].contains(Point(mx + nx * 0.3, mz + nz * 0.3)):
                nx, nz = -nx, -nz
            kd = kerb_dist(T, mx + nx * 0.5, mz + nz * 0.5)
            if kd < (3.2 if typ == "under" else 2.2):               # no room in front for an island (and a car)
                continue
            if any(i2 != j and T.solids[i2]["poly"].contains(Point(mx + nx * 2.5, mz + nz * 2.5)) for i2 in T.tree.query(Point(mx + nx * 2.5, mz + nz * 2.5))):
                continue
            tr = toward_road(T, mx, mz)
            facing = (tr[0][0] * nx + tr[0][1] * nz) if tr else 0
            dpt = LineString([(ax, az), (bx, bz)]).distance(p)
            score = dpt * 0.3 - facing * 3 + kd * 0.05
            if best is None or score < best[0]:
                best = (score, ax, az, tx, tz, nx, nz, L, kd)
        if not best:
            self.notes.append("no wall with room in front of it")
            return False
        _, ax, az, tx, tz, nx, nz, L, kd = best
        p_u = min(max((self.x - ax) * tx + (self.z - az) * tz, 0), L)
        off_out = 2.6 if typ == "under" else 2.4
        off_out = min(off_out, kd - (2.4 if typ == "under" else 1.3))
        off_out = max(off_out, 1.2)
        n = 1 if typ == "kerbside" else max(1, min(2, int(L // 7)))
        span = n * 6.5
        u0 = min(max(p_u - span / 2, 0.5), max(0.5, L - 0.5 - span))
        yaw_wall = math.atan2(nx, nz)
        # frame: local x along the wall, +z out of it
        cu = u0 + span / 2
        F = Frame(ax + tx * cu + nx * off_out, az + tz * cu + nz * off_out, nx, nz)
        if F.xx * tx + F.xz * tz < 0:
            pass                                                     # (islands are symmetric along x)
        out["slab"] = self.slab(F, -span / 2, span / 2, -off_out, 1.3, grow=(1.0, 1.0, 0.0, 2.0))
        for i in range(n):
            lx = -span / 2 + 6.5 * (i + 0.5)
            self.island(F, lx, 0.0, i, False)
        out["islands"] = n
        wx, wz = ax + tx * cu, az + tz * cu
        y0 = T.floor_y(wx + nx * 0.5, wz + nz * 0.5)
        if typ == "under":
            # the fascia band of the overhang on the wall at 3.4 m
            off, rnx, rnz = T.wall_offset(j, ax, az, tx, tz, nx, nz, u0, u0 + span, y0)
            self.put("shopsign", wx + rnx * (off + 0.04), wz + rnz * (off + 0.04), math.atan2(rnx, rnz), y=y0 + 3.4, s=(span + 1.0, 1, 1))
            self.put("fascia_sign", wx + rnx * (off + 0.16), wz + rnz * (off + 0.16), math.atan2(rnx, rnz), y=y0 + 3.8)
        # the price sign at the end of the forecourt toward the road
        lx = span / 2 + 1.2
        x, z = F.w(lx, 1.0)
        if not in_building(T, F.rect(lx - 0.8, lx + 0.8, 0.6, 1.4), 0.05) and kerb_dist(T, x, z) > 0.9:
            self.put("totem", x, z, F.yaw + math.pi / 2)
            self.col.append(("totem", F.rect(lx - 0.25, lx + 0.25, 1.0 - 0.7, 1.0 + 0.7), self.y(x, z), self.y(x, z) + 5.6))
        else:
            self.notes.append("no room for the price sign")
        out["wall"] = {"bu": sd["bu"], "u": [r2(u0), r2(u0 + span)], "out": r2(off_out)}
        if self.tags.get("compressed_air") == "yes":
            lx = -span / 2 - 1.0
            x, z = F.w(lx, 0.0)
            if not in_building(T, F.rect(lx - 0.4, lx + 0.4, -0.4, 0.4), 0.05) and kerb_dist(T, x, z) > 1.0:
                self.put("airstand", x, z, F.yaw)
                self.col.append(("airstand", F.rect(lx - 0.25, lx + 0.25, -0.2, 0.2), self.y(x, z), self.y(x, z) + 1.4))
        self.carwash(F)
        return True


# ------------------------------------------------------------------------------------------------ main
def load_osm():
    doc = json.loads((ROOT / "data" / "raw" / "fuel" / "osm_fuel.json").read_text(encoding="utf-8"))
    return doc["elements"]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, required=True, help="the main checkout's data/raw (UrbIS DSM / DTM)")
    ap.add_argument("--only", default=None)
    a = ap.parse_args()
    t0 = time.time()
    els = load_osm()
    stations = []
    for e in els:
        t = e.get("tags") or {}
        if t.get("amenity") != "fuel":
            continue
        if e["type"] == "node":
            x, z = wgs_to_local(e["lon"], e["lat"])
        else:
            g = e.get("geometry") or []
            if not g:
                continue
            poly = Polygon([wgs_to_local(p["lon"], p["lat"]) for p in g])
            x, z = poly.centroid.x, poly.centroid.y
        x, z = float(x), float(z)
        tile = tile_of_point(x, z)
        if tile and (OUT.parent / "tiles" / tile).exists():
            stations.append((f"{e['type'][0]}{e['id']}", x, z, t, tile))
    stations.sort(key=lambda s: s[0])
    tiles_cache, per_tile, summary = {}, {}, []
    for sid, x, z, tags, tile in stations:
        if a.only and sid != a.only:
            continue
        T = tiles_cache.get(tile) or tiles_cache.setdefault(tile, Tile(tile))
        near = [e for e in els if (e["type"] == "node" and math.hypot(*(np.array(wgs_to_local(e["lon"], e["lat"])) - (x, z))) < 90)
                or (e["type"] == "way" and e.get("geometry") and math.hypot(*(np.array(wgs_to_local(e["geometry"][0]["lon"], e["geometry"][0]["lat"])) - (x, z))) < 120)]
        S = Station(sid, x, z, tags, T, a.raw, near)
        rec = S.build()
        if not rec:
            print(f"{sid} ({tile}): NOT placed: {S.notes}")
            continue
        per_tile.setdefault(tile, []).append(rec)
        summary.append({k: rec.get(k) for k in ("id", "name", "brand", "operator", "schemeName", "type", "islands", "canopy", "shop", "wall", "notes", "counts")} | {"tile": tile})
        print(f"{sid} ({tile}) {rec['type']:8s} {rec.get('islands')} islands  {rec['name']}  {rec['counts']}")
        for n in S.notes: print("     ", n)
    OUT.mkdir(parents=True, exist_ok=True)
    if not a.only:
        for f in OUT.glob("*.json"): f.unlink()
    for tile, recs in per_tile.items():
        (OUT / f"{tile}.json").write_text(json.dumps({"contract": CONTRACT, "tile": tile, "schemes": SCHEMES, "stations": recs}, separators=(",", ":")), encoding="utf-8")
    if not a.only:
        (OUT / "summary.json").write_text(json.dumps({"contract": CONTRACT, "built": time.strftime("%Y-%m-%d"), "stations": summary,
                                                      "tiles": sorted(per_tile), "sources": ["OSM (c) OpenStreetMap contributors, ODbL", "UrbIS DSM / DTM 2021, Paradigm, CC0", "UrbIS buildings 3D, Paradigm, CC0"]}, indent=1), encoding="utf-8")
    print(f"{sum(len(v) for v in per_tile.values())} stations on {len(per_tile)} tiles in {time.time() - t0:.0f} s")


if __name__ == "__main__":
    main()
