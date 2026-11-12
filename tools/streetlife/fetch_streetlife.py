"""Fetch the raw data of the street-life layer (one-off; cached in data/raw/streetlife/, git-ignored).

    python tools/streetlife/fetch_streetlife.py [--raw DIR] [--only osm,stib,villo,post,addr] [--force]

What and from where (never substituted: a source that can't be fetched is reported and left out):
  osm_pois.json      Overpass: every shop / amenity / craft / office / healthcare POI of the Uccle box as nodes, ways and
                     relations ("out center": a way's centre point), all tags (name, brand, opening_hours, addr:*).
                     The city's area.json has nodes only and no fuel / post box / recycling / bicycle rental / ATM.
                     Licence ODbL (c) OpenStreetMap contributors.
  stib_stops.json    Brussels Mobility WFS bm_public_transport:stib_stops (stop id, FR / NL name, lines, mode).
  villo.json         Brussels Mobility WFS bm_bike:villo (the Villo! stations).
  pointpostal.json   Brussels Mobility WFS bm_other:pointpostal (bpost letter boxes and post points).
  addr/<T>.json      UrbIS AddressNumbers (geoservices-urbis urbisvector WFS) of tile T + 30 m: police number, FR / NL
                     street name, the UrbIS building (BU_ID), the cartographic angle. UrbIS: CC0 (check per dataset).
Coordinates of the WFS layers are asked in EPSG:31370 (Lambert 72), as the rest of the pipeline.
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
from pathlib import Path

HERE = Path(__file__).resolve().parent
ROOT = HERE.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, all_tiles, local_to_l72, tile_bounds  # noqa: E402

UA = {"User-Agent": "uccle-city-pipeline/0.1 (street-life extract)"}
OVERPASS = ["https://overpass-api.de/api/interpreter", "https://overpass.private.coffee/api/interpreter", "https://overpass.kumi.systems/api/interpreter"]
MOBILITY = ("https://data-mobility.irisnet.be/geoserver/ows?service=WFS&version=2.0.0&request=GetFeature"
            "&typeNames={layer}&outputFormat=application/json&srsName=EPSG:31370&bbox={e0},{n0},{e1},{n1},EPSG:31370")
URBIS = ("https://geoservices-urbis.irisnet.be/geoserver/urbisvector/wfs?service=WFS&version=2.0.0&request=GetFeature"
         "&typeNames=urbisvector:AddressNumbers&outputFormat=application/json&srsName=EPSG:31370"
         "&bbox={e0},{n0},{e1},{n1},EPSG:31370&count=5000{page}")

AMENITY = ("cafe|restaurant|bar|pub|fast_food|pharmacy|bank|atm|ice_cream|fuel|post_box|post_office|recycling|"
           "bicycle_rental|school|kindergarten|college|place_of_worship|library|townhall|police|doctors|dentist|clinic|"
           "hospital|veterinary|cinema|theatre|arts_centre|community_centre|marketplace|car_wash|charging_station|"
           "car_rental|bureau_de_change|money_transfer|nightclub|driving_school|vending_machine|parcel_locker|"
           "waste_basket|toilets|drinking_water|social_facility|childcare")
QUERY = f"""
[out:json][timeout:240][bbox:{{s}},{{w}},{{n}},{{e}}];
(
  nwr["shop"];
  nwr["amenity"~"^({AMENITY})$"];
  nwr["craft"];
  nwr["office"]["name"];
  nwr["healthcare"]["name"];
  nwr["tourism"~"^(hotel|guest_house|museum|gallery)$"];
  nwr["leisure"~"^(fitness_centre|sports_centre)$"]["name"];
);
out center tags;
"""


def default_raw() -> Path:
    """data/raw of this checkout, else of the main checkout when this is a git worktree (.claude/worktrees/<x>)."""
    own = ROOT / "data" / "raw"
    if own.exists():
        return own
    for p in ROOT.parents:
        if (p / "data" / "raw").exists() and (p / ".git").exists():
            return p / "data" / "raw"
    return own


def get(url, data=None, timeout=300):
    req = urllib.request.Request(url, data=data, headers=UA)
    with urllib.request.urlopen(req, timeout=timeout) as r:
        return r.read()


def box_l72(margin=250.0):
    lat_m = margin / 111_320.0
    lon_m = margin / (111_320.0 * math.cos(math.radians((LAT_MIN + LAT_MAX) / 2)))
    return LAT_MIN - lat_m, LON_MIN - lon_m, LAT_MAX + lat_m, LON_MAX + lon_m


def fetch_osm(out: Path):
    s, w, n, e = box_l72()
    q = QUERY.format(s=f"{s:.6f}", w=f"{w:.6f}", n=f"{n:.6f}", e=f"{e:.6f}")
    body = urllib.parse.urlencode({"data": q}).encode()
    for ep in OVERPASS:
        try:
            t0 = time.time()
            raw = get(ep, body, 400)
            doc = json.loads(raw)
            if "elements" not in doc:
                raise ValueError(raw[:300])
            doc["_query"] = {"bbox": [s, w, n, e], "endpoint": ep, "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
                             "osm_base": doc.get("osm3s", {}).get("timestamp_osm_base")}
            out.write_bytes(json.dumps(doc).encode())
            print(f"osm: {len(doc['elements'])} POIs from {ep} in {time.time() - t0:.0f} s -> {out}", file=sys.stderr)
            return
        except (urllib.error.URLError, OSError, ValueError) as err:
            print(f"osm: {ep} failed: {err}", file=sys.stderr)
    print("osm: NOT fetched (all endpoints failed)", file=sys.stderr)


def l72_box(margin=300.0):
    """The Uccle tiles' extent in Lambert 72 (+ margin)."""
    xs, zs = [], []
    for t in all_tiles():
        x0, z0, x1, z1 = tile_bounds(t)
        xs += [x0, x1]; zs += [z0, z1]
    e0, n1 = local_to_l72(min(xs) - margin, min(zs) - margin)
    e1, n0 = local_to_l72(max(xs) + margin, max(zs) + margin)
    return e0, n0, e1, n1


def fetch_mobility(layer: str, out: Path):
    e0, n0, e1, n1 = l72_box()
    url = MOBILITY.format(layer=layer, e0=e0, n0=n0, e1=e1, n1=n1)
    try:
        raw = get(url, timeout=200)
        doc = json.loads(raw)
        doc["_query"] = {"url": url, "fetched": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())}
        out.write_bytes(json.dumps(doc).encode())
        print(f"{layer}: {len(doc.get('features', []))} features -> {out}", file=sys.stderr)
    except Exception as err:            # report, never substitute
        print(f"{layer}: NOT fetched ({err})", file=sys.stderr)


def fetch_addresses(d: Path, force: bool):
    d.mkdir(parents=True, exist_ok=True)
    tiles = list(all_tiles())
    for k, t in enumerate(tiles):
        f = d / f"{t}.json"
        if f.exists() and not force:
            continue
        x0, z0, x1, z1 = tile_bounds(t)
        e0, n1 = local_to_l72(x0 - 30, z0 - 30)
        e1, n0 = local_to_l72(x1 + 30, z1 + 30)
        feats, start = [], 0
        try:
            while True:
                doc = json.loads(get(URBIS.format(e0=e0, n0=n0, e1=e1, n1=n1, page=f"&startIndex={start}&sortBy=INSPIRE_ID" if start else ""), timeout=200))
                page = doc.get("features", [])
                feats += page
                if len(page) < 5000:
                    break
                start += len(page)
        except Exception as err:
            print(f"addresses {t}: NOT fetched ({err})", file=sys.stderr)
            continue
        slim = [{"e": round(ft["geometry"]["coordinates"][0], 2), "n": round(ft["geometry"]["coordinates"][1], 2),
                 **{k2: ft["properties"].get(k2) for k2 in ("POLICENUM", "BOXNUMBER", "STRNAMEFRE", "STRNAMEDUT", "BU_ID", "CARTOANGLE", "INSPIRE_ID", "ZIPCODE", "MUNNAMEFRE", "MUNNAMEDUT")}}
                for ft in feats if ft.get("geometry")]
        f.write_text(json.dumps({"tile": t, "source": "UrbIS AddressNumbers (urbisvector WFS)", "fetched": time.strftime("%Y-%m-%d"), "features": slim}), encoding="utf-8")
        print(f"addresses {t} ({k + 1}/{len(tiles)}): {len(feats)}", file=sys.stderr)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--raw", type=Path, default=None)
    ap.add_argument("--only", default="osm,stib,villo,post,addr")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args()
    raw = (a.raw or default_raw()) / "streetlife"
    raw.mkdir(parents=True, exist_ok=True)
    only = set(a.only.split(","))
    jobs = [("osm", "osm_pois.json", lambda f: fetch_osm(f)),
            ("stib", "stib_stops.json", lambda f: fetch_mobility("bm_public_transport:stib_stops", f)),
            ("villo", "villo.json", lambda f: fetch_mobility("bm_bike:villo", f)),
            ("post", "pointpostal.json", lambda f: fetch_mobility("bm_other:pointpostal", f))]
    for key, name, fn in jobs:
        f = raw / name
        if key in only and (a.force or not f.exists()):
            fn(f)
    if "addr" in only:
        fetch_addresses(raw / "addr", a.force)


if __name__ == "__main__":
    main()
