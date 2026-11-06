"""The real SNCB timetable through Uccle for the viewer -> data/transit/sncb-uccle.json.

Source: the NMBS/SNCB GTFS static feed (scheduled timetable), published free of charge on the Belgian National Access
Point (transportdata.be, dataset "SNCB GFTS - scheduled timetable and real-time data") and downloaded with the same
discovery API as STIB's feed (pipeline/build_transit.py), to data/raw/gtfs/sncb.zip (git-ignored):
    curl -L -o data/raw/gtfs/sncb.zip https://api-management-discovery-production.azure-api.net/api/gtfs/feed/nmbssncb/static
Licence: SNCB's open data is offered under its standard licence agreement for re-use of timetable data (accept the
conditions on belgiantrain.be "Public data"; free, no support). See docs/trains/RESEARCH.md: check the conditions before
the public site ships this file.

The feed has no shapes and lists only the stations a train CALLS at. The track comes from OSM (pipeline/build_rail.py,
data/rail/rail.json routes 124S/124N, 26W/26E, 9W/9E). Each trip that calls at, or passes through, Uccle is put on one
route by its line (S1 / IC / P: L124; S5 / S7: L26; S9 / S19: Linkebeek - L26/5 - Saint-Job) and direction; every
station of the trip gets its distance along the route: the station's stop position when the route passes it, else
(stations beyond the route's ends) the route end's distance plus 1.08 x the straight line to the station (an estimate:
the line's real length out there is not in our data). A non-stopping IC thus crosses Uccle on the times interpolated
between Bruxelles-Midi and Braine-l'Alleud.

Per trip: [[d, arrival, departure, calls], ...] in seconds after midnight of the service day (may pass 24 h). Calls with
no dwell in the feed (arrival = departure, minute resolution) get 20 s either side.

    python pipeline/build_trains.py [--weekday 20261110 --saturday 20261107 --sunday 20261108]
"""
from __future__ import annotations

import argparse
import csv
import io
import json
import math
import zipfile
from collections import defaultdict

from common import DATA, RAW, wgs_to_local

ROUTES_OF = {"S1": ("124S", "124N"), "IC": ("124S", "124N"), "P": ("124S", "124N"), "L": ("124S", "124N"),
             "S5": ("26W", "26E"), "S7": ("26W", "26E"), "S9": ("9W", "9E"), "S19": ("9W", "9E")}
CODES = {"8814118": "Forest-Est", "8814126": "Uccle-Stalle", "8814134": "Uccle-Calevoet", "8814142": "Linkebeek",
         "8814159": "Holleken", "8814431": "Moensberg", "8814449": "Saint-Job", "8814464": "Vivier d'Oie",
         "8814456": "Boondael"}
UCCLE = {"8814126", "8814134", "8814431", "8814449", "8814464", "8814142"}   # (Linkebeek: the tile E10 is ours)
EXTRAP = 1.08


def secs(t):
    h, m, s = (int(v) for v in t.split(":"))
    return h * 3600 + m * 60 + s


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--weekday", default="20261110")
    ap.add_argument("--saturday", default="20261107")
    ap.add_argument("--sunday", default="20261108")
    a = ap.parse_args()
    days = {"weekday": a.weekday, "saturday": a.saturday, "sunday": a.sunday}
    names = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"]
    import datetime as dt
    dow = {k: names[dt.datetime.strptime(v, "%Y%m%d").weekday()] for k, v in days.items()}

    rail = json.loads((DATA / "rail" / "rail.json").read_text(encoding="utf-8"))
    routes = rail["routes"]
    z = zipfile.ZipFile(RAW / "gtfs" / "sncb.zip")
    rd = lambda n: csv.DictReader(io.TextIOWrapper(z.open(n), "utf-8-sig"))
    feed = next(rd("feed_info.txt"))
    for k, v in days.items():
        if not (feed["feed_start_date"].strip() <= v <= feed["feed_end_date"].strip()):
            raise SystemExit(f"{k} {v} outside the feed ({feed['feed_start_date']}..{feed['feed_end_date']})")
    svc = defaultdict(set)                               # service_id -> day types
    for r in rd("calendar.txt"):
        for k, v in days.items():
            if r["start_date"] <= v <= r["end_date"] and r[dow[k]] == "1":
                svc[r["service_id"]].add(k)
    want = set(days.values())
    for r in rd("calendar_dates.txt"):
        if r["date"] in want:
            k = next(kk for kk, vv in days.items() if vv == r["date"])
            (svc[r["service_id"]].add if r["exception_type"] == "1" else svc[r["service_id"]].discard)(k)
    routes_txt = {r["route_id"]: r for r in rd("routes.txt")}
    trips = {}
    for r in rd("trips.txt"):
        if svc.get(r["service_id"]):
            trips[r["trip_id"]] = r
    coords, sname = {}, {}
    for r in rd("stops.txt"):
        code = r["stop_id"].split(":")[-1].split("_")[0].lstrip("S")
        if r["stop_lat"]:
            coords.setdefault(code, wgs_to_local(float(r["stop_lon"]), float(r["stop_lat"])))
            sname.setdefault(code, r["stop_name"])
    seq = defaultdict(list)
    for r in rd("stop_times.txt"):
        if r["trip_id"] in trips:
            sid = r["stop_id"].split(":")[-1]
            code, _, plat = sid.partition("_")
            seq[r["trip_id"]].append((int(r["stop_sequence"]), code.lstrip("S"), plat, secs(r["arrival_time"]), secs(r["departure_time"])))
    print(f"feed {feed['feed_version']}: {len(trips)} trips on the three days")

    # the stations each route passes (on-route), by GTFS code
    name2code = {v.lower(): k for k, v in CODES.items()}
    out, skipped = [], defaultdict(int)
    for tid, s in seq.items():
        s.sort()
        codes = [x[1] for x in s]
        if not any(c in UCCLE or c in ("8814118", "8814159", "8814456") for c in codes):
            # pass-through candidates: consecutive calls Bruxelles-Midi / Forest-Midi - (L124 south) and back
            south = {"8814167", "8814175", "8814266", "8814258"}
            north = {"8814001", "8814373"}
            if not any((p in north and q in south) or (p in south and q in north) for p, q in zip(codes, codes[1:])):
                continue
        tr = trips[tid]
        line = routes_txt[tr["route_id"]]["route_short_name"]
        cands = ROUTES_OF.get(line)
        if not cands:
            skipped[line] += 1
            continue
        best = None
        for rid in cands:
            R = routes[rid]
            anchors = {name2code[k.lower()]: v for k, v in R["anchors"].items() if k.lower() in name2code}
            sx, sz = R["start"]; ex, ez = R["end"]; L = R["length"]
            ds = []
            for (_, c, plat, arr, dep) in s:
                if c in anchors:
                    ds.append((anchors[c], c, plat, arr, dep, True))
                elif c in coords:
                    x, zz = coords[c]
                    d0, d1 = math.hypot(x - sx, zz - sz), math.hypot(x - ex, zz - ez)
                    ds.append((-EXTRAP * d0 if d0 < d1 else L + EXTRAP * d1, c, plat, arr, dep, False))
            # the part of the trip around the route: from the last stop before its start to the first after its end
            i0 = max([i for i, q in enumerate(ds) if q[0] <= 0] or [0])
            i1 = min([i for i, q in enumerate(ds) if q[0] >= L] or [len(ds) - 1])
            part = ds[i0:i1 + 1]
            mono = all(b[0] > a_[0] for a_, b in zip(part, part[1:]))
            score = sum(1 for q in part if q[5]) + (5 if mono and len(part) >= 2 and part[0][0] <= R["inTiles"][0] and part[-1][0] >= R["inTiles"][1] else 0)
            if mono and len(part) >= 2 and (best is None or score > best[0]):
                best = (score, rid, part)
        if not best or best[0] < 5:
            skipped[line + " (no route fits)"] += 1
            continue
        _, rid, part = best
        stops = []
        for k, (d, c, plat, arr, dep, on) in enumerate(part):
            if on and 0 < k < len(part) - 1 and dep - arr < 40:
                arr, dep = arr - 20, dep + 20
            stops.append([round(d, 1), arr, dep, 1, plat or "", CODES.get(c, sname.get(c, c))])
        dtypes = sorted(svc[tr["service_id"]])
        out.append({"id": tid.split(":")[-1] if False else tr["trip_short_name"] or tid, "line": line, "head": tr["trip_headsign"],
                    "route": rid, "days": dtypes, "units": 2 if line == "IC" else 1, "stops": stops})
    out.sort(key=lambda t: (t["stops"][0][2], t["id"]))
    per = defaultdict(int)
    for t in out:
        for dday in t["days"]:
            per[(dday, t["line"])] += 1
    print("trips per day and line:", dict(sorted(per.items())))
    print("skipped:", dict(skipped))
    doc = {
        "source": f"NMBS/SNCB GTFS static feed (feed_version {feed['feed_version']}, valid {feed['feed_start_date'].strip()}-{feed['feed_end_date'].strip()}), "
                  "via transportdata.be; track geometry OSM (ODbL)",
        "dates": days, "trips": out,
    }
    p = DATA / "transit" / "sncb-uccle.json"
    p.write_text(json.dumps(doc, separators=(",", ":"), ensure_ascii=False), encoding="utf-8")
    print(f"-> {p} ({p.stat().st_size / 1e3:.0f} kB, {len(out)} trips)")


if __name__ == "__main__":
    main()
