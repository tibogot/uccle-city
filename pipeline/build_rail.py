"""The railway of Uccle for the viewer -> data/rail/rail.json (one file for all tiles: the lines are continuous).

Sources (all already in data/raw, see README):
  - OSM (ODbL, data/raw/osm/area.json): every railway=rail way (track centrelines, one way per track, bridge / tunnel /
    layer tags, railway:preferred_direction), the stop positions (railway=stop) and halts, the platforms
    (railway=platform areas, height 0.76 m), switches.
  - UrbIS Land cover 2026 (CC0) "Bridges" (TYPE RAB = rail bridge, ROB = road over rail, PB = footbridge) and "Tunnels".
  - The tiles' 1 m DTM grids (data/tiles/*/terrain.u16, UrbIS DTM 2021, CC0) for the track heights.

Heights. The DTM is bare earth: the ballast bed on embankments and in cuttings IS in it, the decks of bridges are not
(it drops to the road below) and tunnels are not. Per track point the bed height is the 75th percentile of the DTM in
a 2.5 m disc (the ballast crest, not the ditches), then a 30 m robust smoothing along the track (rails have no
1 m bumps); on bridges (OSM bridge=yes or inside a UrbIS RAB polygon, +4 m for the abutment slopes) and in tunnels the
height is interpolated between the two ends. Where tracks meet (switches, shared nodes), the ends are pulled to their
mean and blended back over 40 m. Rail top = bed + RAIL_ABOVE_BED.

Routes for the timetable (pipeline/build_trains.py): the directed track graph (preferred_direction=forward: the
way's direction only, i.e. Belgian left-hand running comes from OSM) searched between the stations' stop positions:
  124S / 124N   L124 Forest-Est <-> Holleken (S1 and the IC Bruxelles-Midi - Braine-l'Alleud, which pass non-stop)
  26W / 26E     L26 Boondael <-> the line's western end in the OSM extract (towards Beersel) (S5, S7)
  9W / 9E       Holleken -> Linkebeek -> L26/5 chord -> Saint-Job -> Boondael and back (S9, S19)
Each route: a 2 m polyline with heights, and the distance along it of every station it passes.

    python pipeline/build_rail.py
"""
from __future__ import annotations

import heapq
import json
import math
from collections import defaultdict

import numpy as np
from shapely import from_wkb
from shapely.geometry import LineString, Point, Polygon, shape
from shapely.strtree import STRtree

from common import DATA, RAW, TILES, l72_to_local, round2, wgs_to_local

OUT = DATA / "rail" / "rail.json"
RAIL_ABOVE_BED = 0.30            # rail top above the ballast crest (sleeper 0.22 + rail 0.17, sunk ~0.09 in the ballast)
STEP = 2.0                       # densify tracks to this (m)
BRIDGE_PAD = 4.0                 # interpolate this far beyond a bridge's ends (abutment slopes in the 1 m DTM)


# ------------------------------------------------------------------------------------------------ terrain
class Terrain:
    """All tiles' 1 m DTM grids, sampled bilinearly in local metres (NaN outside the built tiles)."""

    def __init__(self):
        man = json.loads((TILES / "manifest.json").read_text())
        self.tiles = {}
        for t in man["tiles"]:
            hp = TILES / t["name"] / "terrain.json"
            if not hp.exists():
                continue
            h = json.loads(hp.read_text())
            raw = np.fromfile(TILES / t["name"] / "terrain.u16", dtype="<u2").astype(np.float32)
            raw[raw == h["nodata"]] = np.nan
            self.tiles[(round(h["x0"] / 500), round(h["z0"] / 500))] = (h, (raw / 100).reshape(h["rows"], h["cols"]))
        self.boxes = [(h["x0"], h["z0"], h["x0"] + h["size"], h["z0"] + h["size"]) for h, _ in self.tiles.values()]

    def inside(self, x, z):
        return (math.floor(x / 500), math.floor(z / 500)) in self.tiles

    def __call__(self, x, z):
        t = self.tiles.get((math.floor(x / 500), math.floor(z / 500)))
        if not t:
            return float("nan")
        h, a = t
        c = min(max((x - h["x0"]) / h["step"], 0), h["cols"] - 1.001)
        r = min(max((z - h["z0"]) / h["step"], 0), h["rows"] - 1.001)
        c0, r0 = int(c), int(r)
        fc, fr = c - c0, r - r0
        return float((a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr)


def densify(pts, step=STEP):
    out = [pts[0]]
    for a, b in zip(pts, pts[1:]):
        L = math.hypot(b[0] - a[0], b[1] - a[1])
        n = max(1, math.ceil(L / step))
        for k in range(1, n + 1):
            out.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    return out


def cumlen(pts):
    c = [0.0]
    for a, b in zip(pts, pts[1:]):
        c.append(c[-1] + math.hypot(b[0] - a[0], b[1] - a[1]))
    return c


def smooth_profile(s, y, win=30.0):
    """Robust smoothing along the arc length: a running median (win) then a running mean (win / 2); NaNs filled by
    linear interpolation first (bridges, tunnels, outside the tiles)."""
    s, y = np.asarray(s), np.asarray(y, dtype=float)
    ok = ~np.isnan(y)
    if ok.sum() == 0:
        return y
    y = np.interp(s, s[ok], y[ok])
    base = np.array([np.median(y[(s >= v - 150) & (s <= v + 150)]) for v in s])
    bad = (y - base > 1.0) | (base - y > 1.5)          # decks over the line, holes, walls: not the bed
    if bad.any() and (~bad).sum() > 1:
        y = np.interp(s, s[~bad], y[~bad])
    med = np.array([np.median(y[(s >= v - win / 2) & (s <= v + win / 2)]) for v in s])
    return np.array([med[(s >= v - win / 4) & (s <= v + win / 4)].mean() for v in s])


# ------------------------------------------------------------------------------------------------ main
def main():
    terr = Terrain()
    d = json.loads((RAW / "osm" / "area.json").read_text(encoding="utf-8"))
    nodes = {e["id"]: e for e in d["elements"] if e["type"] == "node"}
    loc = {}

    def P(nid):
        if nid not in loc:
            n = nodes[nid]
            loc[nid] = tuple(float(v) for v in wgs_to_local(n["lon"], n["lat"]))
        return loc[nid]

    ways = [w for w in d["elements"] if w["type"] == "way" and w.get("tags", {}).get("railway") == "rail"
            and all(n in nodes for n in w["nodes"])]
    print(f"OSM rail ways: {len(ways)}")

    # UrbIS bridges / tunnels (local metres)
    import glob

    import pyogrio
    gp = glob.glob(str(RAW / "urbis" / "landcover" / "**" / "*.gpkg"), recursive=True)[0]
    urb = {}
    for lay in ("Bridges", "Tunnels"):
        meta, _, geom, fields = pyogrio.raw.read(gp, layer=lay)
        names = list(meta["fields"])
        out = []
        for k in range(len(geom)):
            g = from_wkb(geom[k])
            polys = list(g.geoms) if g.geom_type == "MultiPolygon" else [g]
            for pg in polys:
                ring = [l72_to_local(x, y) for x, y in pg.exterior.coords]
                lp = Polygon(ring)
                c = lp.centroid
                if not terr.inside(c.x, c.y):
                    continue
                out.append({"id": str(fields[names.index("INSPIRE_ID")][k]).rsplit("/", 1)[-1], "type": str(fields[names.index("TYPE")][k]),
                            "level": str(fields[names.index("LVL")][k]), "poly": lp})
        urb[lay] = out
    # every bridge: a rail bridge's deck is not in the DTM; a road bridge OVER the rail is (its deck reads as ground)
    rab = list(urb["Bridges"])
    rab_tree = STRtree([b["poly"] for b in rab])
    print(f"UrbIS bridges in the tiles: {len(urb['Bridges'])} ({len(rab)} rail bridges), tunnels {len(urb['Tunnels'])}")

    # ---- the drawn tracks: every rail way touching a built tile (not in a tunnel), densified, with heights
    tracks = []
    for w in ways:
        t = w["tags"]
        pts = [P(n) for n in w["nodes"]]
        if not any(terr.inside(x, z) for x, z in pts) and not any(terr.inside(x, z) for x, z in densify(pts, 20)):
            continue
        tracks.append({"way": w, "pts": pts, "tunnel": t.get("tunnel") in ("yes", "building_passage") or t.get("layer", "0").startswith("-"),
                       "bridge": t.get("bridge") == "yes"})
    print(f"tracks touching the tiles: {len(tracks)}")

    # chains: ways joined end to end where exactly one continues (so a straight run of many OSM ways is one profile)
    by_end = defaultdict(list)
    for i, tr in enumerate(tracks):
        by_end[tr["way"]["nodes"][0]].append(i)
        by_end[tr["way"]["nodes"][-1]].append(i)

    # per-point bed heights, per track (on its own densified points), bridges / tunnels as NaN
    # roads OSM maps over the railway (layer >= 1 or bridge=yes, crossing a rail way): their decks are in the DTM too
    over = []
    rail_union = [LineString([P(n) for n in w["nodes"]]) for w in ways]
    rail_tree0 = STRtree(rail_union)
    for w in d["elements"]:
        t = w.get("tags", {})
        if w["type"] == "way" and "highway" in t and (t.get("bridge") == "yes" or t.get("layer", "0") not in ("0", "") and not t.get("layer", "0").startswith("-"))                 and all(n in nodes for n in w["nodes"]):
            g = LineString([P(n) for n in w["nodes"]])
            if any(rail_union[k].intersects(g) for k in rail_tree0.query(g)):
                over.append(g.buffer(7.0))
    over_tree = STRtree(over)
    print(f"roads mapped over the railway: {len(over)}")

    def on_rab(x, z):
        pt = Point(x, z)
        if any(over[k].contains(pt) for k in over_tree.query(pt)):
            return True
        return any(rab[k]["poly"].buffer(BRIDGE_PAD).contains(Point(x, z)) for k in rab_tree.query(Point(x, z).buffer(BRIDGE_PAD)))

    def bed_raw(x, z):
        v = [terr(x + dx, z + dz) for dx, dz in ((0, 0), (1.2, 0), (-1.2, 0), (0, 1.2), (0, -1.2), (0.9, 0.9), (-0.9, 0.9), (0.9, -0.9), (-0.9, -0.9))]
        v = [a for a in v if not math.isnan(a)]
        return float(np.percentile(v, 75)) if v else float("nan")

    for tr in tracks:
        dp = densify(tr["pts"])
        s = cumlen(dp)
        # bridge points: OSM bridge on the way, or inside a UrbIS rail bridge (+ pad)
        raw = []
        for (x, z) in dp:
            if tr["tunnel"] or tr["bridge"] or on_rab(x, z):
                raw.append(float("nan"))
            else:
                raw.append(bed_raw(x, z))
        tr["dp"], tr["s"], tr["raw"] = dp, s, raw

    # bridges / tunnels mapped as their own short ways: borrow the neighbours' raw heights (concatenate the chain
    # through nodes of degree 2) before smoothing, so the interpolation across a bridge uses both ends
    def chain_from(i, seen):
        """Walk forward / backward through degree-2 joins; returns a list of (track index, reversed?)."""
        chain = [(i, False)]
        seen.add(i)
        for direction in (1, -1):
            cur, rev = i, False
            while True:
                w = tracks[cur]["way"]["nodes"]
                end = (w[-1] if not rev else w[0]) if direction == 1 else (w[0] if not rev else w[-1])
                nxt = [k for k in by_end[end] if k != cur]
                if len(nxt) != 1 or nxt[0] in seen or len(by_end[end]) != 2:
                    break
                k = nxt[0]
                kw = tracks[k]["way"]["nodes"]
                krev = (kw[-1] == end) if direction == 1 else (kw[0] == end)
                seen.add(k)
                if direction == 1:
                    chain.append((k, krev))
                else:
                    chain.insert(0, (k, krev))
                cur, rev = k, krev
        return chain

    seen, chains = set(), []
    for i in range(len(tracks)):
        if i not in seen:
            chains.append(chain_from(i, seen))
    for ch in chains:
        X, Z, R, owner = [], [], [], []
        for k, rev in ch:
            tr = tracks[k]
            dp, raw = (tr["dp"][::-1], tr["raw"][::-1]) if rev else (tr["dp"], tr["raw"])
            first = not X
            for j, ((x, z), r) in enumerate(zip(dp, raw)):
                if not first and j == 0:
                    continue
                X.append(x); Z.append(z); R.append(r); owner.append((k, rev, j))
        s = cumlen(list(zip(X, Z)))
        Y = smooth_profile(s, R)
        for (k, rev, j), y in zip(owner, Y):
            tr = tracks[k]
            n = len(tr["dp"])
            tr.setdefault("y", [None] * n)[n - 1 - j if rev else j] = float(y)
        # shared first point of each joined way (skipped above): the previous way's last value
        for k, rev in ch:
            tr = tracks[k]
            if tr["y"][0 if not rev else -1] is None or any(v is None for v in tr["y"]):
                ys = np.array([np.nan if v is None else v for v in tr["y"]], dtype=float)
                ok = ~np.isnan(ys)
                tr["y"] = list(np.interp(np.arange(len(ys)), np.nonzero(ok)[0], ys[ok])) if ok.any() else [0.0] * len(ys)

    # a whole short way under a deck (a road over the line along all of it): both its ends disagree with the tracks it
    # joins by > 1 m -> its profile is the straight line between their values
    node_in = defaultdict(set)
    for k, tr in enumerate(tracks):
        for n in tr["way"]["nodes"]:
            node_in[n].add(k)

    def val_at(k, node):
        tr = tracks[k]; x, z = P(node)
        j = min(range(len(tr["dp"])), key=lambda q: (tr["dp"][q][0] - x) ** 2 + (tr["dp"][q][1] - z) ** 2)
        return tr["y"][j]
    fixed = 0
    for k, tr in enumerate(tracks):
        a, b = tr["way"]["nodes"][0], tr["way"]["nodes"][-1]
        oa = [val_at(q, a) for q in node_in[a] if q != k]
        ob = [val_at(q, b) for q in node_in[b] if q != k]
        if oa and ob and abs(tr["y"][0] - np.median(oa)) > 1.0 and abs(tr["y"][-1] - np.median(ob)) > 1.0:
            s_ = np.array(tr["s"])
            tr["y"] = list(np.median(oa) + (np.median(ob) - np.median(oa)) * s_ / s_[-1])
            fixed += 1
    print(f"ways re-levelled between their neighbours (decks over the whole way): {fixed}")

    # switches: ends meeting at a node of degree > 2 get the mean, blended back over 40 m
    for node, idx in by_end.items():
        if len(idx) < 2:
            continue
        vals = []
        for k in idx:
            tr = tracks[k]
            vals.append(tr["y"][0] if tr["way"]["nodes"][0] == node else tr["y"][-1])
        m = float(np.mean(vals))
        for k in idx:
            tr = tracks[k]
            atStart = tr["way"]["nodes"][0] == node
            s = np.array(tr["s"]); L = s[-1]
            dist = s if atStart else L - s
            delta = m - (tr["y"][0] if atStart else tr["y"][-1])
            w = np.clip(1 - dist / 40.0, 0, 1)
            w = w * w * (3 - 2 * w)
            tr["y"] = list(np.array(tr["y"]) + delta * w)

    # mid-way junctions (a branch way ending on a node in the middle of another): snap the branch end to the main track
    node_of = {}
    for k, tr in enumerate(tracks):
        for j, n in enumerate(tr["way"]["nodes"]):
            node_of.setdefault(n, []).append((k, j))
    for k, tr in enumerate(tracks):
        for end_i, nid in ((0, tr["way"]["nodes"][0]), (-1, tr["way"]["nodes"][-1])):
            hosts = [(kk, j) for kk, j in node_of.get(nid, []) if kk != k and 0 < j < len(tracks[kk]["way"]["nodes"]) - 1]
            if not hosts:
                continue
            kk, _ = hosts[0]
            hx, hz = P(nid)
            hdp = tracks[kk]["dp"]
            jj = min(range(len(hdp)), key=lambda q: (hdp[q][0] - hx) ** 2 + (hdp[q][1] - hz) ** 2)
            target = tracks[kk]["y"][jj]
            s = np.array(tr["s"]); L = s[-1]
            dist = s if end_i == 0 else L - s
            delta = target - tr["y"][end_i]
            w = np.clip(1 - dist / 40.0, 0, 1)
            tr["y"] = list(np.array(tr["y"]) + delta * (w * w * (3 - 2 * w)))

    # last resort: a way still steeper than 3.5 % somewhere (two lines at different levels joined by a switch blend, a
    # deck the masks missed) is relaxed with its ends held (Laplacian, on the 2 m points) until it is under 3.5 %
    relaxed = 0
    for tr in tracks:
        y = np.array(tr["y"], dtype=float); s = np.array(tr["s"])
        if len(y) < 3:
            continue
        g = np.abs(np.diff(y)) / np.maximum(np.diff(s), 0.1)
        if g.max() <= 0.035:
            continue
        for it in range(4000):
            y[1:-1] = 0.5 * y[1:-1] + 0.25 * (y[:-2] + y[2:])
            if it % 50 == 0 and (np.abs(np.diff(y)) / np.maximum(np.diff(s), 0.1)).max() <= 0.035:
                break
        tr["y"] = list(y); relaxed += 1
    print(f"ways relaxed to <= 3.5 %: {relaxed}")

    # ---- output tracks (the drawn ones: not in tunnels, inside or near the tiles)
    out_tracks = []
    for tr in tracks:
        if tr["tunnel"]:
            continue
        t = tr["way"]["tags"]
        out_tracks.append({
            "id": f"w{tr['way']['id']}", "ref": t.get("ref", ""), "usage": t.get("usage", ""), "service": t.get("service", ""),
            "electrified": t.get("electrified") == "contact_line", "bridge": tr["bridge"], "maxspeed": t.get("maxspeed"),
            "nodes": [tr["way"]["nodes"][0], tr["way"]["nodes"][-1]],
            "pts": [[round2(x), round(y + RAIL_ABOVE_BED, 3), round2(z)] for (x, z), y in zip(tr["dp"], tr["y"])],
        })
    print(f"drawn tracks: {len(out_tracks)}, {sum(cumlen([(p[0], p[2]) for p in t['pts']])[-1] for t in out_tracks) / 1000:.1f} km")

    # height lookup for any point near a track (routes, platforms, bridges): nearest drawn / tunnel track point
    allpts = np.array([(x, z, y + RAIL_ABOVE_BED) for tr in tracks for (x, z), y in zip(tr["dp"], tr["y"])])
    from scipy.spatial import cKDTree
    kd = cKDTree(allpts[:, :2])

    def rail_y(x, z):
        dd, ii = kd.query((x, z), k=4)
        w = 1 / np.maximum(dd, 0.05)
        return float((allpts[ii, 2] * w).sum() / w.sum())

    # ---- stations and stops
    stations = {}
    for e in d["elements"]:
        t = e.get("tags", {})
        if e["type"] == "node" and t.get("train") == "yes" and t.get("railway") in ("stop", "halt", "station"):
            nm = t.get("name:fr") or t.get("name", "").split(" - ")[0]
            st = stations.setdefault(nm, {"name": nm, "stops": [], "uic": None})
            x, z = P(e["id"])
            if t.get("railway") == "stop":
                st["stops"].append(e["id"])
            else:
                st["halt"] = [round2(x), round2(z)]
                st["uic"] = t.get("uic_ref")
    print("stations in the OSM extract:", ", ".join(sorted(stations)))

    # ---- platforms (railway=platform areas near a stop)
    stop_pts = [(P(n), nm) for nm, st in stations.items() for n in st["stops"]]
    platforms = []
    for w in d["elements"]:
        t = w.get("tags", {})
        if w["type"] != "way" or t.get("railway") != "platform" or not all(n in nodes for n in w["nodes"]):
            continue
        ring = [P(n) for n in w["nodes"]]
        c = Polygon(ring).centroid if len(ring) > 3 else LineString(ring).centroid
        if not terr.inside(c.x, c.y):
            continue
        near = min(stop_pts, key=lambda q: (q[0][0] - c.x) ** 2 + (q[0][1] - c.y) ** 2)
        if math.hypot(near[0][0] - c.x, near[0][1] - c.y) > 250:
            continue
        top = rail_y(c.x, c.y) + float(t.get("height", "0.76"))
        platforms.append({"id": f"w{w['id']}", "station": near[1], "ref": t.get("ref"), "shelter": t.get("shelter") == "yes",
                          "area": w["nodes"][0] == w["nodes"][-1], "top": round(top, 3),
                          "ring": [[round2(x), round2(z)] for x, z in ring]})
    print(f"platforms: {len(platforms)}")

    # ---- bridges and tunnels (UrbIS), with what crosses them (OSM)
    road_lines = []
    for w in d["elements"]:
        t = w.get("tags", {})
        if w["type"] == "way" and ("highway" in t or "waterway" in t) and all(n in nodes for n in w["nodes"]):
            road_lines.append((t, LineString([P(n) for n in w["nodes"]])))
    rtree = STRtree([g for _, g in road_lines])
    rail_lines = [(tr, LineString(tr["dp"])) for tr in tracks]
    railtree = STRtree([g for _, g in rail_lines])
    bridges = []
    for b in urb["Bridges"]:
        pg = b["poly"]
        under = sorted({road_lines[k][0].get("name", road_lines[k][0].get("highway", road_lines[k][0].get("waterway")))
                        for k in rtree.query(pg) if road_lines[k][1].intersects(pg)} - {None})
        rails = sorted({rail_lines[k][0]["way"]["tags"].get("ref", "") for k in railtree.query(pg) if rail_lines[k][1].intersects(pg)})
        c = pg.centroid
        rec = {"id": b["id"], "type": b["type"], "level": b["level"], "centre": [round2(c.x), round2(c.y)], "area": round(pg.area),
               "ring": [[round2(x), round2(z)] for x, z in pg.exterior.coords], "roads": under, "lines": rails,
               "ground": round(terr(c.x, c.y), 2)}
        if rails:
            rec["railTop"] = round(rail_y(c.x, c.y), 2)
        bridges.append(rec)
    bridges.sort(key=lambda b: b["id"])
    print(f"bridges: {len(bridges)} ({sum(1 for b in bridges if b['type'] == 'RAB')} RAB)")

    # ---- routes: directed track graph over the whole OSM extract
    edge_way = {}
    for k, tr in enumerate(tracks):
        tr["np"] = np.array(tr["dp"])
        ns = tr["way"]["nodes"]
        for a, b in zip(ns, ns[1:]):
            edge_way[(a, b)] = k
    G = defaultdict(list)
    for w in ways:
        t = w["tags"]
        if t.get("service") in ("yard", "siding", "spur") or t.get("tunnel") == "building_passage":
            continue
        ns = w["nodes"]
        both = t.get("railway:preferred_direction") not in ("forward", "backward")
        fwd = t.get("railway:preferred_direction") != "backward"
        for a, b in zip(ns, ns[1:]):
            L = math.dist(P(a), P(b))
            if fwd or both:
                G[a].append((b, L))
            if not fwd or both:
                G[b].append((a, L))

    def route(src, dst):
        dist, prev, pq = {}, {}, []
        for s in src:
            dist[s] = 0.0
            heapq.heappush(pq, (0.0, s))
        dst = set(dst)
        while pq:
            dv, u = heapq.heappop(pq)
            if dv > dist.get(u, 1e18):
                continue
            if u in dst:
                path = [u]
                while path[-1] in prev:
                    path.append(prev[path[-1]])
                return path[::-1]
            for v, L in G[u]:
                nd = dv + L
                if nd < dist.get(v, 1e18):
                    dist[v] = nd; prev[v] = u
                    heapq.heappush(pq, (nd, v))
        return None

    # the western end of L26 inside the extract (towards Beersel): the L26 way end farthest south-west
    l26_ends = [n for w in ways if w["tags"].get("ref") == "L26" for n in (w["nodes"][0], w["nodes"][-1])]
    deg = defaultdict(int)
    for w in ways:
        for n in (w["nodes"][0], w["nodes"][-1]):
            deg[n] += 1
    for w in ways:
        for n in w["nodes"][1:-1]:
            deg[n] += 2
    west = [n for n in l26_ends if deg[n] == 1 and P(n)[0] < -1000]
    print("L26 western ends:", [(n, [round(v) for v in P(n)]) for n in west])
    S = lambda nm: stations[nm]["stops"]
    defs = {
        "124S": (S("Forest-Est"), S("Holleken")), "124N": (S("Holleken"), S("Forest-Est")),
        "26W": (S("Boondael"), west), "26E": (west, S("Boondael")),
        "9W": (S("Boondael"), S("Holleken")), "9E": (S("Holleken"), S("Boondael")),
    }
    routes = {}
    for rid, (a, b) in defs.items():
        path = route(a, b)
        if not path:
            raise SystemExit(f"no route {rid}")
        pts, ys = [], []
        for a, b in zip(path, path[1:]):
            seg = densify([P(a), P(b)])
            k = edge_way.get((a, b), edge_way.get((b, a)))
            for q in (seg if not pts else seg[1:]):
                pts.append(q)
                if k is None:
                    ys.append(float("nan")); continue
                tr = tracks[k]; arr = tr["np"]
                j = int(np.argmin((arr[:, 0] - q[0]) ** 2 + (arr[:, 1] - q[1]) ** 2))
                ys.append(tr["y"][j] + RAIL_ABOVE_BED)
        s = cumlen(pts)
        ys = list(np.interp(s, np.array(s)[~np.isnan(ys)], np.array(ys)[~np.isnan(ys)]))
        # stations passed: a stop node on the path (exact), else a station halt within 40 m of the line
        anchors = {}
        on = {n: i for i, n in enumerate(path)}
        cpath = cumlen([P(n) for n in path])
        for nm, st in stations.items():
            hit = [on[n] for n in st["stops"] if n in on]
            if hit:
                anchors[nm] = round(cpath[hit[0]], 1)
        ls = LineString(pts)
        vis = [i for i, (x, z) in enumerate(pts) if terr.inside(x, z)]
        routes[rid] = {"length": round(s[-1], 1), "anchors": anchors, "inTiles": [round(s[vis[0]], 1), round(s[vis[-1]], 1)] if vis else None,
                       "start": [round2(v) for v in pts[0]], "end": [round2(v) for v in pts[-1]],
                       "pts": [[round2(x), round(y, 2), round2(z)] for (x, z), y in zip(pts, ys)]}
        print(f"route {rid}: {s[-1] / 1000:.2f} km, stations {anchors}")

    OUT.parent.mkdir(parents=True, exist_ok=True)
    doc = {
        "contract": "rail-0.1",
        "source": "OSM (ODbL, (c) OpenStreetMap contributors, extract " + d["_query"]["fetched"] + "); UrbIS Land cover Bridges / "
                  "Tunnels and DTM 2021 (CC0, Paradigm / urban.brussels)",
        "railAboveBed": RAIL_ABOVE_BED,
        "tracks": out_tracks, "platforms": platforms, "bridges": bridges,
        "tunnels": [{"id": t["id"], "type": t["type"], "centre": [round2(t["poly"].centroid.x), round2(t["poly"].centroid.y)], "area": round(t["poly"].area)} for t in urb["Tunnels"]],
        "stations": {k: {"halt": v.get("halt"), "uic": v.get("uic"), "stops": [[round2(c) for c in P(n)] for n in v["stops"]]} for k, v in stations.items()},
        "routes": routes,
    }
    OUT.write_text(json.dumps(doc, separators=(",", ":")), encoding="utf-8")
    print(f"-> {OUT} ({OUT.stat().st_size / 1e6:.2f} MB)")


if __name__ == "__main__":
    main()
