"""Fetch the raw OSM data round every petrol station (one-off; cached in data/raw/fuel/, git-ignored).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/fuel/fetch_fuel.py [--force] [--pois <raw>/streetlife/osm_pois.json]

Stations   every amenity=fuel of the street-life extract (data/raw/streetlife/osm_pois.json, the Overpass POI pull of the
           Uccle box; tools/streetlife/fetch_streetlife.py) that lies on a city tile.
Round each the OSM API 0.6 "map" call on a box of +-90 m (everything mapped there: the fuel node / area, buildings,
           a canopy mapped as building=roof / man_made=canopy, car washes, compressed air, vending machines, charging
           points, service roads = the entrances, parking, landuse, kerbs, barriers), written as one Overpass-style
           JSON (elements: nodes with lat / lon, ways with "geometry"), deduplicated over the stations.
           (The Overpass mirrors timed out / 502'd on the 'around' query on 2026-11-14.)
Licence ODbL (c) OpenStreetMap contributors. Never substituted: a box that fails is reported and the run fails.
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.request
import xml.etree.ElementTree as ET
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import all_tiles, tile_bounds, wgs_to_local  # noqa: E402

UA = {"User-Agent": "uccle-city-pipeline/0.1 (fuel station extract)"}
API = "https://api.openstreetmap.org/api/0.6/map?bbox={w:.6f},{s:.6f},{e:.6f},{n:.6f}"
R = 90.0


def default_pois() -> Path:
    for p in [ROOT, *ROOT.parents]:
        q = p / "data" / "raw" / "streetlife" / "osm_pois.json"
        if q.exists():
            return q
        q = p / "uccle-city" / "data" / "raw" / "streetlife" / "osm_pois.json"
        if q.exists():
            return q
    raise SystemExit("no osm_pois.json: run tools/streetlife/fetch_streetlife.py or pass --pois")


def on_tiles(x, z):
    for t in all_tiles():
        x0, z0, x1, z1 = tile_bounds(t)
        if x0 <= x < x1 and z0 <= z < z1:
            return t
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--pois", type=Path, default=None)
    a = ap.parse_args()
    out = ROOT / "data" / "raw" / "fuel" / "osm_fuel.json"
    if out.exists() and not a.force:
        print("cached:", out); return
    out.parent.mkdir(parents=True, exist_ok=True)
    pois = json.loads((a.pois or default_pois()).read_text(encoding="utf-8"))
    stations = []
    for e in pois["elements"]:
        if (e.get("tags") or {}).get("amenity") != "fuel":
            continue
        lat, lon = (e["lat"], e["lon"]) if e["type"] == "node" else (e["center"]["lat"], e["center"]["lon"])
        x, z = wgs_to_local(lon, lat)
        t = on_tiles(float(x), float(z))
        if t:
            stations.append((f"{e['type'][0]}{e['id']}", lat, lon, t))
    print(f"{len(stations)} stations on the tiles")
    nodes, ways, rels = {}, {}, {}
    for sid, lat, lon, t in stations:
        dl, dn = R / 111_320.0, R / (111_320.0 * math.cos(math.radians(lat)))
        url = API.format(w=lon - dn, s=lat - dl, e=lon + dn, n=lat + dl)
        t0 = time.time()
        raw = urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=120).read()
        root = ET.fromstring(raw)
        for el in root:
            tags = {k.get("k"): k.get("v") for k in el.findall("tag")}
            if el.get("id") is None:
                continue
            i = int(el.get("id"))
            if el.tag == "node":
                nodes[i] = {"type": "node", "id": i, "lat": float(el.get("lat")), "lon": float(el.get("lon")), **({"tags": tags} if tags else {})}
            elif el.tag == "way":
                ways[i] = {"type": "way", "id": i, "nodes": [int(n.get("ref")) for n in el.findall("nd")], **({"tags": tags} if tags else {})}
            elif el.tag == "relation":
                rels[i] = {"type": "relation", "id": i, "members": [{"type": m.get("type"), "ref": int(m.get("ref")), "role": m.get("role")} for m in el.findall("member")],
                           **({"tags": tags} if tags else {})}
        print(f"  {sid} ({t}): {len(raw) // 1024} KB in {time.time() - t0:.1f} s")
        time.sleep(1.0)                                         # (be gentle with the API)
    for w in ways.values():
        w["geometry"] = [{"lat": nodes[n]["lat"], "lon": nodes[n]["lon"]} for n in w["nodes"] if n in nodes]
    doc = {"elements": [*[n for n in nodes.values() if "tags" in n], *ways.values(), *rels.values()],
           "_query": {"source": "OSM API 0.6 map, +-90 m round each station", "stations": [s[0] for s in stations],
                      "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()), "licence": "ODbL (c) OpenStreetMap contributors"}}
    out.write_bytes(json.dumps(doc).encode())
    print(f"osm: {len(doc['elements'])} elements -> {out}")


if __name__ == "__main__":
    main()
