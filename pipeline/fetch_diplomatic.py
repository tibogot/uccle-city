"""Download the diplomatic places (embassies, consulates, residences, delegations) of the study box (+ margin) from
OSM with ONE Overpass request (TODO 4b, embassy flags; the OSM attribution is in CREDITS.md).

Output: data/raw/osm/diplomatic.json (Overpass JSON: nodes / ways / relations with their tags and a `center`; ways
with their outline `geometry`). The request carries only the query and a generic user agent.

    python pipeline/fetch_diplomatic.py [--margin 250] [--endpoint URL]

Which of them really fly a flag is NOT in OSM: data/places/embassy_flags.json records that per place (looked at on
street-level imagery, look only), and only those get a flag (rule docs/rules/embassy-flags.md).
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
from fetch_osm import DEFAULT_ENDPOINT, FALLBACKS

QUERY = """
[out:json][timeout:120][bbox:{s},{w},{n},{e}];
(
  nwr["office"="diplomatic"];
  nwr["amenity"="embassy"];
  nwr["diplomatic"];
);
out tags center qt;
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
    out = RAW / "osm" / "diplomatic.json"
    out.parent.mkdir(parents=True, exist_ok=True)
    body = urllib.parse.urlencode({"data": q}).encode()
    data = None
    for ep in [args.endpoint] if args.endpoint else [DEFAULT_ENDPOINT, *FALLBACKS]:
        req = urllib.request.Request(ep, data=body, headers={"User-Agent": "uccle-city-pipeline/0.1"})
        print(f"Overpass {ep} -> {out}", file=sys.stderr)
        try:
            with urllib.request.urlopen(req, timeout=180) as r:
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
    doc["_query"] = {"bbox": [s, w, n, e], "endpoint": args.endpoint, "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
    out.write_text(json.dumps(doc, indent=1, ensure_ascii=False), encoding="utf-8")
    for el in doc["elements"]:
        t = el.get("tags", {})
        c = el.get("center") or ({"lat": el["lat"], "lon": el["lon"]} if "lat" in el else None)
        if c is None and el.get("bounds"):
            b = el["bounds"]; c = {"lat": (b["minlat"] + b["maxlat"]) / 2, "lon": (b["minlon"] + b["maxlon"]) / 2}
        c = c or {"lat": 0.0, "lon": 0.0}
        print(f"  {el['type']}/{el['id']}  {t.get('diplomatic', t.get('office', t.get('amenity', '?'))):<12} "
              f"{t.get('country', '--'):<3} {c['lat']:.5f},{c['lon']:.5f}  {t.get('name', t.get('name:en', ''))}", file=sys.stderr)
    print(f"ok {len(doc['elements'])} place(s), osm_base={doc.get('osm3s', {}).get('timestamp_osm_base')}", file=sys.stderr)


if __name__ == "__main__":
    main()
