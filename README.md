# uccle-city

The foundation for a 3D city of part of Uccle (Brussels), built from real data
and running in the browser with three.js (WebGPURenderer + TSL).

The study area runs from Uccle centre to Saint-Job (lon 4.327–4.372,
lat 50.7905–50.8075). It is cut into 500 m tiles named `A1` to `H4`.

| Path | What |
|---|---|
| `docs/CONTRACT.md` | **The spec**: coordinates, tile grid, file formats. Read it first. |
| `docs/PLAN.md` | Status and the next sessions. |
| `CREDITS.md` | Data sources and licences. |
| `vendor/roads/` | Road lab from game-engine-v1, unchanged (`ORIGIN.md`). |
| `pipeline/` | Python: download (OSM Overpass, UrbIS), then build tile files. |
| `data/tiles/` | Processed tiles + `manifest.json`. `data/raw/` is git-ignored. |
| `debug/index.html` | 2D tile viewer: roads, buildings, terrain contours. |

## Run the pipeline

```sh
python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt
../venv/bin/python pipeline/fetch_osm.py            # one Overpass request for the whole area
# put the UrbIS URLs in pipeline/sources.json (or drop the files in data/raw/urbis/<key>/), then:
../venv/bin/python pipeline/fetch_urbis.py
../venv/bin/python pipeline/run_tile.py G4 --id-field <building id field>
```

## View a tile

```sh
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/debug/index.html?tile=G4
```
