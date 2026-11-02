"""Download OSM data for the whole study box (+ margin) with ONE Overpass request.

Output: data/raw/osm/area.json (Overpass JSON: nodes with lat/lon, ways with node refs,
relations with members). Re-run only when you want fresher OSM.

    python pipeline/fetch_osm.py [--margin 250] [--endpoint URL]
"""
from __future__ import annotations

import argparse
import json
import math
import sys
import time
import urllib.error
import urllib.parse
import urllib.request

from common import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, RAW

DEFAULT_ENDPOINT = "https://overpass-api.de/api/interpreter"
# Tried in order when --endpoint is not given. kumi.systems can lag behind OSM by weeks or months:
# check osm_base in the output (it is recorded in every roads.json and in the manifest).
FALLBACKS = ["https://overpass.kumi.systems/api/interpreter"]

QUERY = """
[out:json][timeout:300][bbox:{s},{w},{n},{e}];
(
  way["highway"];
  way["railway"~"^(tram|light_rail|rail)$"];
  way["junction"="roundabout"];
  node["natural"="tree"];
  way["natural"="tree_row"];
  way["leisure"~"^(park|garden|playground|pitch)$"];
  relation["leisure"~"^(park|garden)$"];
  way["landuse"~"^(grass|forest|cemetery|meadow|recreation_ground|village_green)$"];
  relation["landuse"~"^(grass|forest|cemetery)$"];
  way["natural"~"^(wood|water|scrub)$"];
  relation["natural"~"^(wood|water)$"];
  node["highway"~"^(crossing|traffic_signals|bus_stop|street_lamp|stop|give_way|turning_circle)$"];
  node["railway"~"^(tram_stop|crossing|level_crossing)$"];
  node["public_transport"];
  node["amenity"~"^(bench|bicycle_parking|fountain)$"];
);
(._; >;);
out body qt;
"""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--margin", type=float, default=250.0, help="metres added around the study box")
    ap.add_argument("--endpoint", help=f"Overpass endpoint (default: {DEFAULT_ENDPOINT}, then {FALLBACKS})")
    args = ap.parse_args()

    lat_m = args.margin / 111_320.0
    lon_m = args.margin / (111_320.0 * math.cos(math.radians((LAT_MIN + LAT_MAX) / 2)))
    s, w, n, e = LAT_MIN - lat_m, LON_MIN - lon_m, LAT_MAX + lat_m, LON_MAX + lon_m
    q = QUERY.format(s=f"{s:.6f}", w=f"{w:.6f}", n=f"{n:.6f}", e=f"{e:.6f}")

    out = RAW / "osm" / "area.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    body = urllib.parse.urlencode({"data": q}).encode()
    endpoints = [args.endpoint] if args.endpoint else [DEFAULT_ENDPOINT, *FALLBACKS]
    t0 = time.time()
    data = None
    for ep in endpoints:
        req = urllib.request.Request(ep, data=body, headers={"User-Agent": "uccle-city-pipeline/0.1 (one-off study-area extract)"})
        print(f"Overpass {ep}: bbox s={s:.5f} w={w:.5f} n={n:.5f} e={e:.5f} -> {out}", file=sys.stderr)
        try:
            with urllib.request.urlopen(req, timeout=400) as r:
                data = r.read()
            args.endpoint = ep
            break
        except (urllib.error.URLError, OSError) as err:
            print(f"  failed: {err}", file=sys.stderr)
    if data is None:
        raise SystemExit("all Overpass endpoints failed")
    doc = json.loads(data)
    if "elements" not in doc:
        raise SystemExit(f"unexpected Overpass reply: {data[:500]!r}")
    if doc.get("remark"):
        print("Overpass remark:", doc["remark"], file=sys.stderr)
    doc["_query"] = {"bbox": [s, w, n, e], "endpoint": args.endpoint, "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    out.write_bytes(json.dumps(doc).encode())
    kinds = {}
    for el in doc["elements"]:
        kinds[el["type"]] = kinds.get(el["type"], 0) + 1
    print(f"ok {len(data)/1e6:.1f} MB in {time.time()-t0:.0f}s, {kinds}, osm_base={doc.get('osm3s', {}).get('timestamp_osm_base')}", file=sys.stderr)


if __name__ == "__main__":
    main()
