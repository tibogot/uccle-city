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
| `debug/index.html` | 2D tile viewer: roads, buildings, terrain contours (screenshots in `docs/img/`). |
| `viewer/index.html` | Minimal 3D viewer (three.js r180 WebGPURenderer + TSL, WebGL2 fallback). |
| `tools/check_roads.mjs` | Node check: runs `buildRoadNetwork` on a tile's `roads.json`. |

## Run the pipeline

```sh
python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt
../venv/bin/python pipeline/fetch_osm.py            # one Overpass request for the whole area
../venv/bin/python pipeline/fetch_urbis.py          # UrbIS sheets listed in pipeline/sources.json (G4's for now)
../venv/bin/python pipeline/run_tile.py G4 --id-field INSPIRE_ID --layer BuildingSolids
node tools/check_roads.mjs G4                         # build roads.json with the road engine, list its issues
```

## View a tile

```sh
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/debug/index.html?tile=G4     (2D)
# open http://localhost:8000/viewer/index.html?tile=G4    (3D; &view=stjob or &view=walk)
```
