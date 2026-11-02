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
| `viewer/index.html` | 3D viewer (three.js r180 WebGPURenderer + TSL, WebGL2 fallback); road surfaces and paint in `viewer/roadPaint.js`. |
| `tools/check_roads.mjs` | Node check: runs `buildRoadNetwork` on a tile's `roads.json` (`--all`: every tile). |
| `tools/plot_area.mjs` | SVG of a road network around a point (ids, errors), for writing `pipeline/overrides.json`. |

## Run the pipeline

```sh
python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt
../venv/bin/python pipeline/fetch_osm.py            # one Overpass request for the whole area
../venv/bin/python pipeline/find_sheets.py          # UrbIS sheet URLs for the whole grid -> sources.json
../venv/bin/python pipeline/fetch_urbis.py          # ~790 MB into data/raw/urbis/
../venv/bin/python pipeline/run_tile.py --all --network   # network -> refine (Node 22) -> cut, + terrain/buildings/features
node tools/check_roads.mjs --all                     # road-engine errors per tile
```

## View a tile

```sh
python3 -m http.server 8000      # from the repo root
# open http://localhost:8000/debug/index.html?tile=G4     (2D)
# open http://localhost:8000/viewer/index.html?tile=G4    (3D; &view=walk, &at=x,z for a spot, e.g. ?tile=C3&at=-609,309&view=walk)
```
