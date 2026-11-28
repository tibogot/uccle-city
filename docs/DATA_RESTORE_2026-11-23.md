# data/raw restore, 2026-11-23

## What was lost, and why

On 2026-11-23 a manual `git worktree remove --force` on a temporary worktree followed that worktree's `data/raw`
junction. It deleted the contents of the main checkout's `data/raw`: 3,129 files, all git-ignored and never
committed. The count comes from `tools/merge.mjs`'s own before and after count, for example
`data/raw 3129 -> 3129 files` in `uccle-jobs/merge-*.log`. `tools/road_audit/node_modules` was also wiped and has
been reinstalled.

The live site and the committed tiles were not affected, because they use built, committed data. Every branch
worktree's `data/raw` is a junction to the same folder, so they all saw it empty.

`tools/merge.mjs` removes worktrees safely: it unlinks the junctions first and counts `data/raw` before and after.
The hand-typed command skipped both steps.

Nothing was restored from a backup, because none exists. Everything below was **re-fetched from the original
sources** with the project's own fetch code, into `data/raw` only. Each server got one request at a time, with a
generic user agent and no personal details. Overpass was queried only on overpass-api.de.

## Restored: 2,718 files (vs 3,129): 411 not restored

| family | files | source (fetched 2026-11-23, UTC) | fetcher | vs what the committed tiles were built from |
|---|---|---|---|---|
| `urbis/buildings3d` | 528 | 38 sheets `UrbISBuildings3D_31370_SHP_<sheet>_20261003.zip` from urbisdownload.datastore.brussels, plus their unzipped folders | `pipeline/fetch_urbis.py` (pinned in `sources.json`) | **same**: pinned dated files; building meshes are byte-identical (below) |
| `urbis/dtm` | 132 | 44 sheets `DTM_31370_TIFF_<sheet>_20211009_50.zip` | same | **same**: terrain byte-identical |
| `urbis/dsm` | 132 | 44 sheets `UrbISDSM_31370_TIFF_<sheet>_20211009_50.zip` | same | **same**: trees identical |
| `urbis/transport` | 84 | 42 sheets `UrbISNetwork_31370_GPKG_<sheet>_20261002.zip` | same | same pinned files (only used to check names) |
| `urbis/landcover` | 2 | `UrbISLandCover_31370_GPKG_04000_20261002.zip` (whole region) | same | **same** file: street-surface footprints match to <= 0.05 m² per tile |
| `urbis/topo_roadline` | 120 | Brussels Mobility WFS `bm_urbis_topo:road_line`, per-tile bbox | `build_surfaces.fetch_topo`, called on its own, sequentially (scratch wrapper) | same: kerb-check lengths identical |
| `urbis/topo_poles` | 360 | WFS `bm_urbis_topo:pole_point / pole_line / street_furniture_line`, per tile | same | **proven identical**: all 120 `street_furniture_line` files match the gate's pre-loss sha1 (`.cache/gate/hashes.json`) byte for byte, once GeoServer's `"timeStamp"` is put back (all were fetched 2026-11-05 01:21-01:26Z) |
| `markings` | 840 | WFS, 7 layers x 120 tiles (`pipeline/fetch_markings.py` layers and bboxes) | `fetch_markings.fetch`, sequential instead of its 6 threads | same: rebuilt `markings.json` equal by value |
| `ortho` | 120 | UrbIS WMS `Ortho2024NS`, 25 cm, `geoservices-grid.irisnet.be/geoserver/urbisgrid/wms` | `build_roofcolors.fetch` | **same**: the rebuilt tile `ortho.jpg` and every `roofColor` are byte-identical |
| `dhmv/tiles` | 20 | Digitaal Vlaanderen WCS `geo.api.vlaanderen.be/el-dtm/wcs`, border tiles | `fetch_dhmv.fetch_tile` (`--border` list) | same: border terrain only (not in the samples); horizon stats identical |
| `horizon` | 62 | DHMV 10 m (16 chunks), mosaics (UrbIS WMS, Vlaanderen OMWRGB25VL WMS, Wallonia SPW ORTHO_2021), Copernicus GLO-30 cache, `heights.u16`, `tileortho/` (20 `_bxl.jpg`, 18 `_vl.png`) | `build_horizon.py` fetch and height functions; `fill_ortho_border.py` fetch step. Run without writing `data/horizon` | **same**: height stats equal to `data/horizon/heights.json`; `fill_ortho_border` re-run in the check dir gives byte-identical `ortho.jpg` on A5, H11 and E10 |
| `osm/area.json`, `landmarks.json` | 2 | overpass-api.de, osm_base **2026-11-23T20:26:01Z** (was 2026-11-04T16:46:22Z) | `pipeline/fetch_osm.py --endpoint https://overpass-api.de/api/interpreter` | **drift**: 15,417,577 vs 15,395,089 bytes (+0.15 %) |
| `osm/bus_routes.json`, `emergency_pois.json` | 2 | overpass-api.de, osm_base 2026-11-23T20:39Z / 20:41Z | `tools/trafmix/fetch_osm.py` queries, overpass-api.de only | drift (fresh OSM) |
| `osm/barriers.json`, `forecourts.json` | 2 | overpass-api.de, 2026-11-23T20:52Z / 20:50Z | **no script in the repo** (an agent's ad-hoc query, `docs/assets/GARDENS.md`); the query was rebuilt from that description: barrier ways and `barrier~gate` nodes, and `amenity=parking`, retail, commercial and industrial landuse, and shop ways inside OSM relation 58253, with `out geom`. The query is stored in each file's `_query` | barriers: 289,485 vs 295,895 bytes, way counts **exactly** the documented 226 hedges, 135 walls, 128 fences and 12 retaining walls. forecourts: 154,998 vs 149,638 bytes. Not byte-identical (the old query text is unknown) |
| `streetlife` | 4 + 120 `addr/` | Brussels Mobility WFS (stib_stops 431, villo 53, pointpostal 247); UrbIS AddressNumbers WFS per tile | `tools/streetlife/fetch_streetlife.py` | drift possible (live layers); not used by the sample tiles |
| `gtfs/stib.zip`, `sncb.zip` | 2 | `api-management-discovery-production.azure-api.net/api/gtfs/feed/{stibmivb,nmbssncb}/static` | the curl lines in `build_transit.py` / `build_trains.py` | **changed**: today's feeds (STIB 20261123-20261220, SNCB from 20261120). The committed `data/transit` was built from older feeds (`--date 20261103`). A rebuild needs a date inside the new feed |
| `trees/bm_trees_uccle.json` | 1 | WFS `bm_public_space:trees`, `commune='UCCLE'` | the query in `docs/trees/SPECIES_DATA.md` | same counts as documented: 2,107 trees, 1,597 alive |
| `textures/polyhaven`, `textures/ambientcg`, `textures/trees` | 176 | Poly Haven API, ambientCG (CC0) | `tools/textures/fetch_textures.py`, `fetch_tree_textures.py` | same assets (CC0 libraries, not versioned) |
| `refs/trees/textures` | 8 | Wikimedia Commons | `tools/textures/fetch_tree_refs.py` | same files, with licences in `SOURCES.json` |
| `fuel/osm_fuel.json` | 1 | OSM API 0.6 `map` around each station | `tools/fuel/fetch_fuel.py` | drift (fresh OSM, 3,193 elements) |

Counts use `tools/merge.mjs` `countFiles` (files below `data/raw`, recursively).

## Not restored (411 files)

There is no fetcher for these, or they were outputs or hand-made files:

- **Owner-supplied or behind a login.** Ask the owner:
  - `megascans/` (Fab/Megascans downloads);
  - `animations/mixamo/` (Adobe login);
  - `refs/nte/` (the owner's Neverness to Everness references, "refs outside git").
- **Free packs downloaded by hand.** No script exists; they can be fetched again (all CC0):
  - `characters/ual1`, `ual2` (Quaternius Universal Animation Library);
  - `characters/polypizza`;
  - `cars/quaternius` (poly.pizza bundle);
  - `cars/kenney/kit` (Kenney Car Kit 3.1).
  The committed, converted assets in `viewer/`/`assets` are unaffected.
- **Reference photos saved by agents.** These came from Wikimedia Commons and similar, and their `SOURCES.md` lists
  were lost with them:
  - `refs/augustin`, `calevoet`, `facadekit`, `falcons`, `observatory`, `police_rouge`, `saint*`, `sauvagere`,
    `stalle`, `stjob`, `townhall`, `trains`, `tram`, `vanbuuren`, `wolvendael`;
  - `refs/trees` (other than `textures/`);
  - `weather_refs/`.
  They were only used for side-by-side checks. Re-collect them per job when needed.
- **Generated work files.** Each can be rebuilt by its tool:
  - `texfactory/out`, `texfactory/_work` (`tools/texturefactory`);
  - `textures/_work`, `textures/christmas` (fir atlas, reviews);
  - `audit/` (`tools/dump_road_surfaces.mjs`, `audit_*.py`);
  - `trees_inventory/` (exploration samples).
- **`tram2tools/camfit.js`.** This was code kept in `data/raw` and is **lost**. Its method is described in the tram
  docs. Rule: code never lives in `data/raw`.

## Sample-tile rebuild (G4, H9, E6)

The tiles were rebuilt into `C:/Users/tibog/Downloads/uccle-restore-check/data`, a copy of the committed `data/`
without `raw`. The pipeline ran with `UCCLE_DATA` pointing there and `common.RAW` pointing at the restored
`data/raw`. The run followed `run_tile.py`'s steps:

1. `cut_roads`, `build_features`, `build_surfaces`, `build_terrain`, `build_buildings`;
2. `build_trees`, `filter_road_trees`, `build_roofcolors`, `tag_landmarks`, `build_ortho_lod`;
3. `build_markings`;
4. `tools/orient_buildings.mjs`, the post-step from 2026-11-13, run on a copy.

The committed `data/` was never written (`git status` clean).

| file | G4 | H9 | E6 | why it differs |
|---|---|---|---|---|
| `terrain.json`, `terrain.u16` | identical | identical | identical | |
| `buildings.bin` | identical | identical | identical | after the orient step (without it, the vertices are equal and 1,275 / 494 / 1,209 triangles are wound the other way) |
| `buildings.json` | equal except 24 values | equal except 8 values | equal except 66 values | `base` / `height` ±0.01 m rounding; every `roofColor` is identical |
| `ortho.jpg` | identical | identical | identical | |
| `roads.json` (committed network) | equal except `meta.generated` | same | same | |
| `roads.json` (network rebuilt from today's OSM) | 109 / 109 roads identical | 32 / 32 | 118 / 118 | city-wide: 4,634 vs 4,637 roads, 3 removed and 16 changed, none in these tiles (I1, O2, F2, F3, C5, C8, E3, J4, K2, L2) |
| `features.json` | ±0.01 m on 3 tree heights; 1 tree now matched to an OSM tree | ±0.01 m on 1 tree height | ±0.01 m on 5 tree heights; 1 tree OSM-matched | OSM drift (new `natural=tree` nodes) |
| `markings.json` | equal | equal | equal | apart from `crossings[].photo`, which `photo_surfaces`/the roads round-2 tools add later |
| `surfaces.json` | same polygons and counts | footprint sym. diff 0.01 m² | 0.05 m² | a few smoothed rings have different vertex counts (H9 `pointsAdded` 312 -> 325, E6 1360 -> 1385); `photo` is added later. With today's code the names change too: the committed files predate `fix_text` (2026-11-17, "Ã¨" -> "è"), which is a code change, not data |

**Result:** every UrbIS, WMS and WCS input reproduces the committed tiles, so the pinned and dated sources are the
same data. The only data drift is OSM, which moved 19 days (2026-11-04 -> 2026-11-23): +0.15 % in `area.json`, 19 of
4,637 network roads, and 1 tree match per tile in two of the samples. Small differences remain in surface smoothing
and in 0.01 m rounding. They come from how the committed files were produced at the time (later tools re-wrote
them), not from the raw data.

## Open

- `streetlife/osm_pois.json` (3,161 POIs, overpass-api.de, 2026-11-23T20:57Z) needed two retries: Overpass answered
  502/504 for about 15 minutes. `fuel/osm_fuel.json` was then fetched from it. Both are fresh OSM, so they drift.
- `data/transit` rebuilds need a `--date` inside the new GTFS feeds. The SNCB re-use form is still the owner's to
  send (`docs/DATA_LICENCES.md`).
- Owner: the Megascans, Mixamo and NTE reference folders, if they existed locally.
- Rule kept: never `git worktree remove --force` by hand. Use `tools/merge.mjs`, which unlinks the junctions and
  counts `data/raw` (gate row `worktreeRemoveCheck`).
