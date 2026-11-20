"""Fetch the raw OSM inputs of the traffic mix (claude/trafmix, docs/TRAFMIX.md) into data/raw/osm/ (the shared raw
store, git-ignored; NEVER loaded by the viewer: tools/trafmix/build_trafmix.py trims it to data/transit/trafmix.json).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/trafmix/fetch_osm.py [--raw data/raw]

  bus_routes.json      rel[type=route][route=bus] in the box, `out geom` (~32 MB)
  emergency_pois.json  amenity=fire_station | police | hospital, emergency=ambulance_station, `out center tags`
Overpass API (OpenStreetMap contributors, ODbL). A generic user agent, no personal details; mirrors tried in turn with
a back-off when one is at capacity.
"""
import argparse, json, time, urllib.parse, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent.parent
BOX = "50.765,4.30,50.825,4.40"
QUERIES = {
    "bus_routes.json": f'[out:json][timeout:180];rel["type"="route"]["route"="bus"]({BOX});out geom;',
    "emergency_pois.json": f'[out:json][timeout:60];(nwr["amenity"~"fire_station|police|hospital"]({BOX});nwr["emergency"="ambulance_station"]({BOX}););out center tags;',
}
MIRRORS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
UA = "osm-data-fetch/1.0"


def fetch(q):
    wait = 5
    for rnd in range(4):
        for url in MIRRORS:
            try:
                req = urllib.request.Request(url, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": UA})
                with urllib.request.urlopen(req, timeout=240) as r:
                    b = r.read()
                d = json.loads(b)
                if "elements" in d: return b
            except Exception as e:
                print(f"  {url}: {str(e)[:80]}")
        time.sleep(wait); wait *= 2
    raise SystemExit("Overpass: every mirror failed")


def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--raw", default=str(ROOT / "data" / "raw"))
    out = Path(ap.parse_args().raw) / "osm"; out.mkdir(parents=True, exist_ok=True)
    for name, q in QUERIES.items():
        b = fetch(q); (out / name).write_bytes(b)
        print(f"{name}: {len(b) // 1024} KB, {len(json.loads(b)['elements'])} elements")


if __name__ == "__main__":
    main()
