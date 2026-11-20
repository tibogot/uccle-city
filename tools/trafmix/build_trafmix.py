"""THE TRAFFIC MIX'S DATA (claude/trafmix, docs/TRAFMIX.md): the bus lines that run through the built city on their OSM
route relations, their stops, and the emergency services' bases. Deterministic -> data/transit/trafmix.json.

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/trafmix/build_trafmix.py

Inputs (the raw store, data/raw/osm/, fetched once from the Overpass API, (c) OpenStreetMap contributors, ODbL):
  bus_routes.json       rel[type=route][route=bus] in (50.765, 4.30, 50.825, 4.40), `out geom` (ways with their
                        geometry, stop / platform nodes with lat / lon)
  emergency_pois.json   amenity=fire_station | police | hospital, emergency=ambulance_station (out center)
  data/stops/<T>.json   the drawn STIB stop poles (tools/stops/build_stops.py) with the lines each serves (STIB GTFS)
Output, per route VARIANT (one direction of one line, as OSM maps it):
  ref, op (STIB | De Lijn), colour, from / to, pts [[x, z], ...] local metres every ~4 m (the part inside the built
  tiles + 60 m, the longest run), len, stops [{ id, x, z, at }] (at = metres along pts; the drawn STIB pole when one
  serving the line stands within 35 m of the OSM stop, else the OSM platform / stop node; only stops on the RIGHT of
  the direction of travel, 0.5-14 m off the line), headway (minutes per hour band, see HEADWAY)
Places: police (Rue Rouge), fire (PASI Chenaie), hospitals.
"""
from __future__ import annotations

import json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import wgs_to_local  # noqa: E402

RAW = ROOT / "data" / "raw" / "osm"
OUT = ROOT / "data" / "transit" / "trafmix.json"
MAN = json.loads((ROOT / "data" / "tiles" / "manifest.json").read_text())
TB = [(t["bounds"]["x"], t["bounds"]["z"]) for t in MAN["tiles"] if t.get("status") == "built"]
MARGIN = 60.0
OPS = {"STIB/MIVB": "STIB", "De Lijn": "De Lijn"}

# Headways (minutes between buses, one direction) per hour band, weekday. No STIB GTFS in the raw store (the stops'
# lines came from it, its timetable was not kept): ESTIMATES from the published frequency classes of the lines
# (STIB "every 7-12 min at peak" trunk lines 38 / 41 / 43 / 60 / 37, 15-20 min the others; De Lijn regional R-lines
# 2-4 an hour); 0 = no service. Bands: [0-5, 5-7, 7-9.5, 9.5-16, 16-19, 19-21, 21-24].
BANDS = [0, 5, 7, 9.5, 16, 19, 21, 24]
TRUNK = [0, 15, 8, 12, 8, 15, 20]
MAIN = [0, 20, 12, 15, 12, 20, 30]
MINOR = [0, 30, 15, 20, 15, 30, 30]
DELIJN = [0, 30, 15, 30, 15, 30, 60]
NOCTIS = [30, 0, 0, 0, 0, 0, 0]        # Noctis: Friday / Saturday nights only (the variant's `nights` flag)
HEADWAY = {"38": TRUNK, "41": TRUNK, "43": TRUNK, "60": TRUNK, "37": TRUNK, "48": MAIN, "74": MAIN, "75": MAIN,
           "50": MINOR, "54": MINOR, "N10": NOCTIS, "N11": NOCTIS, "N12": NOCTIS}


def inside(x, z, m=MARGIN):
    for (x0, x1), (z0, z1) in TB:
        if x0 - m <= x <= x1 + m and z0 - m <= z <= z1 + m: return True
    return False


def local(lat, lon):
    x, z = wgs_to_local(lon, lat)
    return float(x), float(z)


def chain(ways):
    """Member ways (each a list of points) in relation order -> one polyline (each way turned to continue the last;
    None marks a gap > 40 m: an unmapped piece; the clip below keeps the longest run)."""
    d = lambda p, q: (p[0] - q[0]) ** 2 + (p[1] - q[1]) ** 2
    ways = [w for w in ways if len(w) >= 2]
    if not ways: return []
    line = list(ways[0])
    if len(ways) > 1:
        n = ways[1]
        if min(d(line[0], n[0]), d(line[0], n[-1])) < min(d(line[-1], n[0]), d(line[-1], n[-1])): line.reverse()
    for w in ways[1:]:
        end = next(p for p in reversed(line) if p is not None)
        if d(end, w[-1]) < d(end, w[0]): w = w[::-1]
        if d(end, w[0]) > 40 ** 2: line.append(None); line.extend(w)
        else: line.extend(w[1:])
    return line


def resample(pts, step=4.0):
    out = [pts[0]]
    acc = 0.0
    for i in range(1, len(pts)):
        ax, az = pts[i - 1]; bx, bz = pts[i]
        L = math.hypot(bx - ax, bz - az)
        if L < 1e-6: continue
        t = step - acc
        while t <= L:
            out.append((ax + (bx - ax) * t / L, az + (bz - az) * t / L)); t += step
        acc = (acc + L) % step
    if math.hypot(out[-1][0] - pts[-1][0], out[-1][1] - pts[-1][1]) > 0.5: out.append(pts[-1])
    return out


def runs_inside(line):
    """The polyline's runs inside the built area (None = a gap) -> the longest, resampled."""
    runs, cur = [], []
    for p in line:
        if p is None or not inside(*p):
            if len(cur) > 1: runs.append(cur)
            cur = []
            continue
        cur.append(p)
    if len(cur) > 1: runs.append(cur)
    if not runs: return None
    best = max(runs, key=lambda r: sum(math.hypot(r[i][0] - r[i - 1][0], r[i][1] - r[i - 1][1]) for i in range(1, len(r))))
    return resample(best)


def project(pts, cum, x, z):
    """-> (at, lateral signed (+ = left of travel), distance)"""
    best = (0.0, 0.0, 1e18)
    for i in range(1, len(pts)):
        ax, az = pts[i - 1]; bx, bz = pts[i]
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz
        if L2 < 1e-9: continue
        t = max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / L2))
        px, pz = ax + dx * t, az + dz * t
        d = math.hypot(x - px, z - pz)
        if d < best[2]:
            L = math.sqrt(L2)
            # left of travel: forward (dx, dz) turned 90 deg: in the local frame x east, z SOUTH (z = -north), so the left
            # of a heading (fx, fz) is (fz, -fx)... (checked against a stop on the right-hand kerb in E4)
            lat = ((x - px) * (dz / L) - (z - pz) * (dx / L))
            best = (cum[i - 1] + L * t, lat, d)
    return best


def load_poles():
    poles = {}
    for f in (ROOT / "data" / "stops").glob("*.json"):
        if f.name == "summary.json": continue
        d = json.loads(f.read_text(encoding="utf8"))
        for s in d.get("stops", []):
            if s.get("mode") != "Bus": continue
            for l in s.get("lines", []):
                poles.setdefault(l["n"], []).append((s["pole"]["x"], s["pole"]["z"], s["id"], s.get("fr")))
    return poles


def main():
    data = json.loads((RAW / "bus_routes.json").read_text(encoding="utf8"))
    poles = load_poles()
    nodes = {e["id"]: e for e in data["elements"] if e["type"] == "node"}
    variants, stats = [], {"relations": 0, "kept": 0, "stops": 0, "stopsPole": 0, "stopsLeft": 0}
    for r in data["elements"]:
        if r["type"] != "relation": continue
        t = r.get("tags", {})
        op = OPS.get(t.get("operator") or t.get("network"))
        ref = t.get("ref")
        if not op or not ref: continue
        stats["relations"] += 1
        ways, stops = [], []
        for m in r.get("members", []):
            if m["type"] == "way" and m.get("role", "") in ("", "forward", "backward") and "geometry" in m:
                ways.append([local(g["lat"], g["lon"]) for g in m["geometry"]])
            elif m["type"] == "node" and m.get("role", "").startswith(("platform", "stop")):
                n = nodes.get(m["ref"]) or m
                if "lat" in n: stops.append((m.get("role"), local(n["lat"], n["lon"]), (n.get("tags") or {}).get("name")))
        line = chain(ways)
        pts = runs_inside(line) if line else None
        if not pts or len(pts) < 50: continue                  # < ~200 m in the city: not one of ours
        cum = [0.0]
        for i in range(1, len(pts)): cum.append(cum[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
        # stops: platforms preferred (a stop_position and its platform give one stop), matched to the drawn poles
        got = []
        for role, (x, z), name in sorted(stops, key=lambda s: 0 if s[0].startswith("platform") else 1):
            if not inside(x, z, 0): continue
            at, lat, d = project(pts, cum, x, z)
            if d > 40 or at < 8 or at > cum[-1] - 8: continue
            pid, px, pz = None, x, z
            if op == "STIB":
                cand = [(math.hypot(p[0] - x, p[1] - z), p) for p in poles.get(ref, [])]
                cand = [c for c in cand if c[0] < 35]
                if cand:
                    _, p = min(cand, key=lambda c: c[0]); px, pz, pid = p[0], p[1], p[2]
                    at, lat, d = project(pts, cum, px, pz)
            if any(abs(g["at"] - at) < 25 for g in got): continue
            # right-hand kerb only (Belgium drives on the right): lat < 0 = right of travel
            if lat > -0.5 or d > 14:
                stats["stopsLeft"] += 1
                continue
            got.append({"id": pid or f"osm:{round(x)},{round(z)}", "name": name, "x": round(px, 2), "z": round(pz, 2), "at": round(at, 1)})
            stats["stops"] += 1; stats["stopsPole"] += 1 if pid else 0
        got.sort(key=lambda g: g["at"])
        hw = HEADWAY.get(ref, DELIJN if op == "De Lijn" else MINOR)
        variants.append({"ref": ref, "op": op, "colour": t.get("colour"), "from": t.get("from"), "to": t.get("to"), "rel": r["id"],
                         "nights": ref.startswith("N"), "len": round(cum[-1], 1), "headway": hw,
                         "pts": [[round(x, 2), round(z, 2)] for x, z in pts], "stops": got})
        stats["kept"] += 1
    # duplicates (two relations mapping the same direction): keep the longer
    seen, out = {}, []
    for v in sorted(variants, key=lambda v: -v["len"]):
        k = (v["ref"], round(v["pts"][0][0] / 50), round(v["pts"][0][1] / 50), round(v["pts"][-1][0] / 50), round(v["pts"][-1][1] / 50))
        if k in seen: continue
        seen[k] = 1; out.append(v)
    out.sort(key=lambda v: (v["op"], v["ref"], v["rel"]))
    pois = json.loads((RAW / "emergency_pois.json").read_text(encoding="utf8"))
    places = {"police": [], "fire": [], "hospital": []}
    for e in pois["elements"]:
        t = e.get("tags", {}); c = e.get("center") or e
        x, z = local(c["lat"], c["lon"])
        a = t.get("amenity") or t.get("emergency")
        k = {"police": "police", "fire_station": "fire", "hospital": "hospital"}.get(a)
        if k and inside(x, z, 300): places[k].append({"name": t.get("name"), "x": round(x, 1), "z": round(z, 1), "osm": f"{e['type']}/{e['id']}"})
    doc = {"contract": "trafmix-0.1", "sources": {"routes": "OpenStreetMap route relations (Overpass, " + data["osm3s"]["timestamp_osm_base"] + "), (c) OpenStreetMap contributors, ODbL",
                                                   "poles": "data/stops (STIB-MIVB GTFS lines, CC BY 4.0)", "headways": "estimates by line class (no STIB timetable in the raw store), docs/TRAFMIX.md"},
           "bands": BANDS, "stats": stats, "places": places, "routes": out}
    OUT.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False), encoding="utf8")
    print(f"{len(out)} route variants ({stats}); places " + ", ".join(f"{k} {len(v)}" for k, v in places.items()) + f" -> {OUT} ({OUT.stat().st_size // 1024} KB)")
    for v in out: print(f"  {v['op']:7s} {v['ref']:4s} {v['len']:7.0f} m  {len(v['stops']):2d} stops  {v['from']} -> {v['to']}")


if __name__ == "__main__":
    main()
