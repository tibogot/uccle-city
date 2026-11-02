# Credits and data licences

> **Status (2026-11-02):** this was written from my own knowledge. The data hosts
> (`overpass-api.de`, `datastore.brussels`, `urbisdownload.datastore.brussels`)
> were blocked from the session that wrote it, so no licence page was opened.
> Every row marked **UNVERIFIED** must be checked against the dataset's own page
> before the processed data is published, and this table updated with the URL
> and the date checked.

## Datasets

| Dataset | Used for | Licence | Attribution to show | Verified |
|---|---|---|---|---|
| OpenStreetMap, via the Overpass API (overpass-api.de) | streets, lanes, oneway, roundabouts, tram lines, crossings, trees, parks | **ODbL 1.0** (Open Database License). Individual map content is under DbCL 1.0. | "© OpenStreetMap contributors", linking to https://www.openstreetmap.org/copyright | Licence: well established, but the copyright page was not reopened. **UNVERIFIED** today. |
| UrbIS 3D buildings ("3D Constructions"), paradigm.brussels (formerly CIRB/CIBG), from datastore.brussels | building footprints, roofs, walls | I believe UrbIS has been open data since 2016 under the Brussels-Capital Region open-data licence, more recently stated as **CC BY 4.0**. | I believe "Source: UrbIS – © paradigm.brussels" (older wording: "© CIRB/CIBG"). | **UNVERIFIED** |
| UrbIS digital terrain model (DTM / MNT), paradigm.brussels, datastore.brussels | terrain heightmap | Same as above (UrbIS family). | Same as above | **UNVERIFIED**. Also check the resolution, format, height datum (expected TAW/DNG) and whether it is part of UrbIS or a separate Brussels Environment / urban.brussels product. |
| UrbIS transport network (road axes / street network), paradigm.brussels, datastore.brussels | street names and checking the OSM road graph | Same as above (UrbIS family). | Same as above | **UNVERIFIED** |

### What this means for our files

- **ODbL share-alike.** Everything under `data/tiles/` and `data/roads/` that is
  built from OSM is a *derivative database*. If it is published (and pushing it
  to a public GitHub repo counts), it must be offered under **ODbL 1.0** with
  the OSM attribution above. Plan: license `data/` as ODbL 1.0 with both
  attributions, and keep code under its own licence.
- **Mixing UrbIS (CC BY 4.0) into an ODbL database.** CC BY 4.0 content can be
  included in an ODbL database as long as UrbIS gets its attribution. Keep
  UrbIS-only layers (buildings, terrain) in their own files with their own
  source tag, so they can be licensed under CC BY 4.0 alone if that is ever
  wanted. *(Legal interpretation, not verified.)*
- **Overpass API usage policy.** overpass-api.de is a free shared service. Use
  one bounding-box query for the whole study area, cache the result in
  `data/raw/osm/`, and don't hammer it (their guidance: well under 10,000
  queries and 1 GB a day per user). `pipeline/fetch_osm.py` makes one request.

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
