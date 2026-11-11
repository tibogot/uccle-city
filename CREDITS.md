# Credits and data licences

> **Status (2026-11-02, session 1b):** every dataset row below was checked against
> the dataset's own page on that date. The UrbIS rows were checked through the
> datastore.brussels metadata API (`backend.datastore.brussels/rest/metadata/datasetfulldetail/<id>`),
> which is what the dataset pages display. The OSM row was checked on
> https://www.openstreetmap.org/copyright.

## Datasets

| Dataset | Used for | Licence | Attribution to show | Verified |
|---|---|---|---|---|
| OpenStreetMap, via the Overpass API (G4 was fetched from the `overpass.kumi.systems` mirror; `overpass-api.de` reset connections from this environment) | streets, lanes, oneway, roundabouts, tram lines, crossings, trees, parks | **ODbL 1.0** (Open Data Commons Open Database License), from the OpenStreetMap Foundation. The copyright page says: credit OpenStreetMap and its contributors; if you alter or build upon the data, distribute the result only under the same licence. | "© OpenStreetMap contributors", linking to https://www.openstreetmap.org/copyright | 2026-11-02, https://www.openstreetmap.org/copyright |
| **UrbIS - 3D Constructions**, Paradigm (paradigm.brussels), dataset `e9ec2aa4-cffd-11ee-bccc-00090ffe0001`. Release used: `20261003` (SHP, 1 km sheets). | building solids (LoD2): roofs, walls, footprints | **CC0 1.0** ("Creative Commons (CC-0) - no conditions for reuse, the data is in the public domain", https://creativecommons.org/publicdomain/zero/1.0/). Access: "No limitations to public access". | Not required by CC0. We credit voluntarily: "UrbIS – © Paradigm (paradigm.brussels), CC0". | 2026-11-02, https://datastore.brussels/web/data/dataset/e9ec2aa4-cffd-11ee-bccc-00090ffe0001 |
| **Digital terrain model** (DTM 2021, from the LiDAR flight of 2021-10-09, 0.5 m GeoTIFF), Paradigm, dataset `1d7bd49d-fe83-4388-af85-6f5dc8ec7909`. Note: it is listed as "Digital terrain model", not as an UrbIS product. | terrain heightmap | **CC0 1.0** (same wording as above). Access: "No limitations to public access". | Not required. Voluntary: "Digital terrain model 2021 – © Paradigm (paradigm.brussels), CC0". | 2026-11-02, https://datastore.brussels/web/data/dataset/1d7bd49d-fe83-4388-af85-6f5dc8ec7909. The metadata does **not** state the height datum or embed a CRS in the GeoTIFFs (see CONTRACT 2.1). |
| **Orthophoto 2024 (North-South axis)**, Paradigm, dataset `791c9293-e20e-4189-8bdc-e73f8b2fa54c`, read through the raster WMS `geoservices-grid.irisnet.be/geoserver/urbisgrid/wms` (layer `Ortho2024NS`, 25 cm/px) | real roof colours (`roofColor`); the image itself is not published | **CC0 1.0** (same wording as the other Paradigm datasets) | Not required. Voluntary: "Orthophoto 2024 – © Paradigm (paradigm.brussels), CC0". | 2026-11-03, https://datastore.brussels/web/data/dataset/791c9293-e20e-4189-8bdc-e73f8b2fa54c |
| **UrbIS - Digital surface model** (DSM 2021, 0.5 m, same LiDAR flight as the DTM), Paradigm, dataset `8c2d921e-6a53-11ed-bfb5-010101010000` | trees: canopy height model (DSM − DTM) → tree positions, heights, crowns | **CC0 1.0** (same wording as the other Paradigm datasets) | Not required. Voluntary: "UrbIS Digital surface model 2021 – © Paradigm (paradigm.brussels), CC0". | 2026-11-03, https://datastore.brussels/web/data/dataset/8c2d921e-6a53-11ed-bfb5-010101010000 |
| **UrbIS - Land cover** (*Occupation du sol*), Paradigm, dataset `b718705d-f70f-11ee-8282-00090ffe0001`. Release used: `20261002` (GPKG, whole region, sheet code 04000), https://urbisdownload.datastore.brussels/UrbIS/Vector/M8/UrbIS-Landcover/GPKG/UrbISLandCover_31370_GPKG_04000_20261002.zip | measured street surfaces (`StreetSurfaces`: roadway, sidewalk, junction, median, tram, parking, square) -> `data/tiles/<T>/surfaces.json`, drawn with `?roads=surface` | **CC0 1.0** (dataset page; Atom rights "No limitations to public access") | Not required. Voluntary: "UrbIS Land cover – © Paradigm (paradigm.brussels), CC0". | 2026-11-04, https://datastore.brussels/web/data/dataset/b718705d-f70f-11ee-8282-00090ffe0001 |
| **UrbIS - Topo** road lines (kerb `BR0101L`), Paradigm, served by Brussels Mobility as WFS layer `bm_urbis_topo:road_line` (https://data-mobility.irisnet.be/geoserver/ows) | the kerbs derived from Land cover are checked against the surveyed kerb lines (`surfaces.json` `kerbCheck`); the bollards drawn with `?roads=surface` are the surveyed fixed bollards (`CR5702P`, layer `bm_urbis_topo:pole_point`) and bollard lines (`CR57L`, `pole_line`) | **CC0 1.0** (UrbIS Topo; record https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/10ded91e-6a63-11ed-9d77-010101010000) | Not required. Voluntary, as above. | 2026-11-04 |
| **UrbIS - Transport networks**, Paradigm, dataset `af847c40-848b-11ee-9a1f-00090ffe0001`. Release used: `20261002` (GPKG). | checking the OSM road graph and street names (not in any output file yet) | **CC0 1.0** (same wording). Access: "No limitations to public access". | Not required. Voluntary, as above. | 2026-11-02, https://datastore.brussels/web/data/dataset/af847c40-848b-11ee-9a1f-00090ffe0001 |

The exact download URLs, the Atom feeds that list every sheet and release, and
the check dates are in `pipeline/sources.json`.

### What this means for our files

- **ODbL share-alike.** Everything under `data/tiles/` and `data/roads/` that is
  built from OSM is a *derivative database*. If it is published (and pushing it
  to a public GitHub repo counts), it must be offered under **ODbL 1.0** with
  the OSM attribution above. Done: `data/LICENSE` licenses `data/` as ODbL 1.0 with the attributions, and
  code keeps its own licence.
- **Mixing UrbIS into an ODbL database.** UrbIS and the DTM are CC0, so they
  add no conditions: they can go into the ODbL `data/` folder freely. UrbIS-only
  layers (buildings, terrain) are still kept in their own files with their own
  source tag, so they can be reused outside the ODbL database.
- **Overpass API usage policy.** overpass-api.de is a free shared service. Use
  one bounding-box query for the whole study area, cache the result in
  `data/raw/osm/`, and don't hammer it (their guidance: well under 10,000
  queries and 1 GB a day per user). `pipeline/fetch_osm.py` makes one request.
  The kumi.systems and maps.mail.ru mirrors are separate free services; the same restraint applies.
  `data/raw/osm/landmarks.json` (places of worship) came from maps.mail.ru, osm_base
  2026-11-03.
  Its data can lag: the extract used for G4 has `timestamp_osm_base`
  2026-06-01T08:52:28Z, five months before the fetch.

## Code and libraries

| Component | Licence | Notes |
|---|---|---|
| `vendor/roads/` (from tibogot/game-engine-v1 @ 60e7f43) | No licence file upstream, same owner as this repo | See `vendor/roads/ORIGIN.md`. |
| three.js (3D viewer, later) | MIT | |
| proj4js (browser projection, if used) | MIT | |
| pyproj / PROJ | MIT | pipeline |
| shapely / GEOS | BSD-3 / LGPL-2.1 | pipeline |
| numpy | BSD-3 | pipeline |
| pyogrio / GDAL | MIT / MIT | pipeline (reads UrbIS vector formats) |
| rasterio | BSD-3 | pipeline (reads the DTM) |
| mapbox-earcut (Python) | ISC | pipeline (triangulates 3D faces) |
| scipy | BSD-3 | pipeline (tree peaks in the canopy height model) |
| mrdoob/slop-newyork (techniques and adapted code in `viewer/lighting.js`, `post.js`, `tslkit.js`, `facades.js` interiors, `trees.js` approach) | MIT, © 2026 Mr.doob | Notice kept in `viewer/tslkit.js`; source credited in each file header. |
| mrdoob/slop-newyork pedestrians (`vendor/slop-ped/pedestrians.js`: bodies, clothes shader, GPU skinning, `PersonRig` gait), commit `536a907c`; the crowd's baked clips (`models/pedestrians/clips.*`) are generated from that gait code by `tools/peds/bakeGait.mjs` | MIT, © 2026 Mr.doob | `vendor/slop-ped/LICENSE` and `ORIGIN.md`. Used by `viewer/pedestrians/` and `labs/pedestrian-lab.html`. No third-party animation clips (no Mixamo, no UAL yet) |
| Quaternius **Universal Animation Library** (Standard, free tier; https://quaternius.com/packs/universalanimationlibrary.html, downloaded from https://quaternius.itch.io/universal-animation-library on 2026-11-11, raw in `data/raw/characters/ual1/`, git-ignored) | **CC0 1.0** (License.txt in the pack) | Clips Sitting_Idle_Loop, Sitting_Talking_Loop, Idle_Talking_Loop retargeted onto the crowd skeleton by `tools/peds/bakeGait.mjs` into `models/pedestrians/clips.bin` (sit, sitTalk, talk) |
| mrdoob/slop-newyork tree system (`vendor/slop-trees/`: `trees.js`, `building-collision.js`, tree material), commit `737b7691` | MIT, © Mr.doob | `vendor/slop-trees/LICENSE` and `ORIGIN.md`. Used by `viewer/treesSlop.js` |

## 3D models (CC0 packs, Car Lab comparison)

Raw downloads in `data/raw/cars/<source>/` (git-ignored, read as data only). Converted by `tools/cars/convertPacks.mjs`
into `models/cars/kenney.glb` and `models/cars/quaternius.glb` (palette baked to vertex colours, rescaled, re-oriented);
used by the Car Lab (`labs/car-lab.html?mode=compare`, `?mode=street`) and as optional drive-mode cars (`?car=`).
Not in the city's parked cars (the owner picks first).

| Asset | Author / source | Licence | Used | Verified |
|---|---|---|---|---|
| **Car Kit** 3.1 (2026-04-02), kenney.nl/assets/car-kit | Kenney (www.kenney.nl) | **CC0 1.0** (`License.txt` in the pack: "You can use this content for personal, educational, and commercial purposes. Support by crediting 'Kenney' or 'www.kenney.nl' (this is not a requirement)") | hatchback-sports, sedan, taxi, suv, van, delivery | 2026-11-05, the pack's License.txt and the asset page |
| **Cars Pack** (Nov 2018), quaternius.com/packs/cars.html; GLBs from the poly.pizza "Cars Bundle" (poly.pizza/bundle/Cars-Bundle-FE5IWe6OMk; the Google Drive download was over quota) | Quaternius (quaternius.com) | **CC0 1.0** (asset page: "CC0 … free to use in personal and commercial projects"; poly.pizza lists each model "Public Domain (CC0)") | NormalCar1 (saloon), NormalCar2 (small hatchback), Taxi, SUV, Police car | 2026-11-05, quaternius.com/packs/cars.html and the poly.pizza bundle page |

Credit shown voluntarily in the Car Lab: "Kenney (kenney.nl), CC0", "Quaternius (quaternius.com), CC0".

`models/cars/faceted.glb` is ours: generated entirely by `tools/blender/carFaceted.py` (generic proportions of European
car classes, no real brand's design, no logos; plate characters are random, no real registration). The taxi livery
(black, yellow chequer band, amber TAXI roof sign) follows photos of Brussels taxis on Wikimedia Commons (Category:Taxis
in Brussels, e.g. "Taxi in Brussels 2026.jpg", "Skoda Taxis in Brussels.jpg"), used as reference only, not included.

## 3D characters (third-person slot, Capsule Lab and `?view=third`)

Raw downloads in `data/raw/characters/polypizza/` (git-ignored, read as data only). Converted by
`tools/characters/convertCharacters.mjs` into `models/characters/hoodie.glb` and `casual.glb` (7 of 24 clips kept,
buffer compacted); at load `viewer/character/characterModel.js` merges the four parts into one skinned mesh with the
material colours baked to vertex colours.

| Asset | Author / source | Licence | Used | Verified |
|---|---|---|---|---|
| **Hoodie Character** (poly.pizza/m/gKLBoRsyKe) and **Casual Character** (poly.pizza/m/kZ3DmIoGip), from the **Ultimate Modular Men Pack** (Feb 2022), quaternius.com/packs/ultimatemodularcharacters.html (the pack's Google Drive download was over quota) | Quaternius (quaternius.com) | **CC0 1.0** (pack page: "CC0", linked to creativecommons.org/publicdomain/zero/1.0; poly.pizza lists both "Public Domain (CC0)") | the meshes, skeleton and the Idle_Neutral / Walk / Run clips (Run also held as the jump / fall pose) | 2026-11-05, the pack page and both poly.pizza pages |

Not used: Quaternius' newer packs under the "Quaternius Asset Licence" (only the CC0 pack above is used), and
three.js's example Soldier.glb (Mixamo, not shippable; it was only loaded by URL in a test, never copied).

## Public transport

| Data | Licence | Notes |
|---|---|---|
| STIB-MIVB GTFS static feed (line 92 shapes, stops, timetable), via the Belgian Mobility open-data platform, data.belgianmobility.io | CC BY 4.0 | **Source: STIB-MIVB – Open Data – 20261026** (GTFS 2_24_20261026_010708). Raw feed in `data/raw/gtfs/` (not committed); derived `data/transit/stib-92.json` by `pipeline/build_transit.py`. Shown in the viewer's log. |

## Build tools

| Tool | Licence | Use |
|---|---|---|
| esbuild 0.25 | MIT | `tools/build_worker.mjs` bundles the tile worker (`viewer/tileWorker.bundle.js`) |
| three.js earcut (inside the worker bundle) | ISC / MIT | road polygon triangulation (via vendor/roads) |

## Falcon reference photos (docs/falcons/compare_*.jpg only, never shipped with the viewer)

The realism checks of the Saint-Job falcons (docs/FALCONS.md) put these Wikimedia Commons photos beside our renders,
credited in each image. The originals stay in `data/raw/refs/falcons/` (git-ignored; SOURCES.json has the page URLs).

| File (Wikimedia Commons) | Author | Licence |
|---|---|---|
| Peregrine falcon chicks on Derby Cathedral 2018.jpg | Nick Moyes | CC BY-SA 4.0 |
| Wanderfalkenjunge Allenberg.jpg | Martin Lindner | CC BY-SA 4.0 |
| Peregrine Falcon, Town Hall, Leeds - geograph.org.uk - 4878908.jpg | Mark Stevenson | CC BY-SA 2.0 |
| Les tours de la Cathédrale St-Michel (2008).jpg | Eric PROCES | CC BY-SA 4.0 |
| Falco peregrinus St John's Church Bath 5.jpg | Stewart Black | CC BY 2.0 |
| Falco peregrinus -England -flying-8.jpg | Steve Childs | CC BY 2.0 |
| Faucon pelerin ND reims 1530624.jpg | G.Garitan | CC BY-SA 4.0 |

