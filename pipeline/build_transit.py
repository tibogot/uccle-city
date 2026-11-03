"""Real timetable of a STIB line for the viewer -> data/transit/stib-<line>.json.

Source: the STIB-MIVB GTFS static feed from the Belgian Mobility open-data platform
(https://data.belgianmobility.io, CC BY 4.0, attribution "Source: STIB-MIVB – Open Data – <feed date>"),
downloaded to data/raw/gtfs/stib.zip (git-ignored):
    curl -L -o data/raw/gtfs/stib.zip https://api-management-discovery-production.azure-api.net/api/gtfs/feed/stibmivb/static

For three service days (the first weekday, Saturday and Sunday on or after --date, all inside the
feed's validity) the output holds every trip of the line: its shape (in local metres, CONTRACT
frame), and per stop the distance along that shape and the arrival / departure time (seconds after
midnight, may pass 24 h). The viewer moves trams along the shapes by these times.

    python pipeline/build_transit.py [--line 92] [--date 20261103]
"""
from __future__ import annotations

import argparse
import csv
import datetime as dt
import io
import json
import math
import sys
import zipfile

from common import DATA, RAW, wgs_to_local


def secs(t):
    h, m, s = (int(v) for v in t.split(":"))
    return h * 3600 + m * 60 + s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--line", default="92")
    ap.add_argument("--date", default=dt.date.today().strftime("%Y%m%d"))
    a = ap.parse_args()
    z = zipfile.ZipFile(RAW / "gtfs" / "stib.zip")
    rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), "utf-8-sig"))
    feed = next(rd("feed_info.txt"))
    route = next(r for r in rd("routes.txt") if r["route_short_name"] == a.line)
    cal = list(rd("calendar.txt"))
    extra = list(rd("calendar_dates.txt"))
    d0 = dt.datetime.strptime(a.date, "%Y%m%d").date()
    lo = dt.datetime.strptime(feed["feed_start_date"], "%Y%m%d").date()
    hi = dt.datetime.strptime(feed["feed_end_date"], "%Y%m%d").date()
    d0 = max(d0, lo)

    def first(pred):
        d = d0
        while not pred(d):
            d += dt.timedelta(days=1)
        if d > hi:
            raise SystemExit(f"no {pred} day inside the feed ({lo}..{hi})")
        return d

    days = {"weekday": first(lambda d: d.weekday() < 5), "saturday": first(lambda d: d.weekday() == 5),
            "sunday": first(lambda d: d.weekday() == 6)}
    names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]

    def services(day):
        ds = day.strftime("%Y%m%d")
        on = {c["service_id"] for c in cal if c["start_date"] <= ds <= c["end_date"] and c[names[day.weekday()]] == "1"}
        for e in extra:
            if e["date"] == ds:
                (on.add if e["exception_type"] == "1" else on.discard)(e["service_id"])
        return on

    svc = {k: services(d) for k, d in days.items()}
    trips = {}
    for t in rd("trips.txt"):
        if t["route_id"] != route["route_id"]:
            continue
        on = [k for k, s in svc.items() if t["service_id"] in s]
        if on:
            trips[t["trip_id"]] = {"days": on, "dir": int(t.get("direction_id") or 0), "shape": t["shape_id"],
                                   "head": t.get("trip_headsign", "")}
    shape_ids = {t["shape"] for t in trips.values()}
    shapes = {}
    for r in rd("shapes.txt"):
        if r["shape_id"] in shape_ids:
            shapes.setdefault(r["shape_id"], []).append((int(r["shape_pt_sequence"]), float(r["shape_pt_lon"]), float(r["shape_pt_lat"])))
    shp = {}
    for sid, pts in shapes.items():
        pts.sort()
        xs, zs = wgs_to_local([p[1] for p in pts], [p[2] for p in pts])
        line = [[round(float(x), 2), round(float(zz), 2)] for x, zz in zip(xs, zs)]
        cum = [0.0]
        for i in range(1, len(line)):
            cum.append(cum[-1] + math.dist(line[i - 1], line[i]))
        shp[sid] = {"line": line, "cum": cum}
    stops_used = {}
    st = {}
    for r in rd("stop_times.txt"):
        if r["trip_id"] in trips:
            st.setdefault(r["trip_id"], []).append((int(r["stop_sequence"]), r["stop_id"], secs(r["arrival_time"]), secs(r["departure_time"])))
            stops_used[r["stop_id"]] = None
    stops = {}
    for s in rd("stops.txt"):
        if s["stop_id"] in stops_used:
            x, zz = wgs_to_local(float(s["stop_lon"]), float(s["stop_lat"]))
            stops[s["stop_id"]] = {"name": s["stop_name"], "x": round(float(x), 2), "z": round(float(zz), 2)}

    def along(sid, x, zz, start):
        """Distance along the shape of the nearest point to (x, z), not before `start`."""
        L, cum = shp[sid]["line"], shp[sid]["cum"]
        best = (1e18, start)
        for i in range(1, len(L)):
            (ax, az), (bx, bz) = L[i - 1], L[i]
            dx, dz = bx - ax, bz - az
            l2 = dx * dx + dz * dz or 1e-9
            t = max(0.0, min(1.0, ((x - ax) * dx + (zz - az) * dz) / l2))
            d = cum[i - 1] + t * math.sqrt(l2)
            if d + 1 < start:
                continue
            e = (ax + dx * t - x) ** 2 + (az + dz * t - zz) ** 2
            if e < best[0]:
                best = (e, d)
        return best[1]

    out_trips = []
    for tid, t in trips.items():
        seq = sorted(st.get(tid, []))
        if len(seq) < 2:
            continue
        pos, d = [], 0.0
        for _, sid, arr, dep in seq:
            s = stops[sid]
            d = along(t["shape"], s["x"], s["z"], d)
            pos.append([round(d, 1), arr, dep, sid])
        out_trips.append({"id": tid, "days": t["days"], "dir": t["dir"], "shape": t["shape"], "head": t["head"], "stops": pos})
    out_trips.sort(key=lambda t: t["stops"][0][1])
    doc = {"line": a.line, "route": route["route_long_name"], "color": "#" + route["route_color"],
           "textColor": "#" + route["route_text_color"],
           "source": f"Source: STIB-MIVB – Open Data – {feed['feed_start_date']} (GTFS {feed['feed_version']}, CC BY 4.0, via data.belgianmobility.io)",
           "days": {k: d.strftime("%Y%m%d") for k, d in days.items()},
           "shapes": {k: v["line"] for k, v in shp.items()}, "stops": stops, "trips": out_trips}
    out = DATA / "transit" / f"stib-{a.line}.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False))
    per = {k: sum(1 for t in out_trips if k in t["days"]) for k in days}
    print(f"line {a.line} {route['route_long_name']}: {len(out_trips)} trips {per}, {len(shp)} shapes, {len(stops)} stops -> {out} ({out.stat().st_size // 1024} kB)", file=sys.stderr)


if __name__ == "__main__":
    main()
