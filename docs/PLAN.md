# Plan

## Where things stand (end of session 1b, 2026-11-02)

Session 1 (no network) wrote the vendored road lab, the contract, the pipeline
and the 2D debug page. Session 1b downloaded the real data and built the
sample tile **G4**. It is committed in `data/tiles/G4/` (1.7 MB) with
`data/tiles/manifest.json`.

### Data sources (all found, licences checked)

| Dataset | Where | Licence | Notes |
|---|---|---|---|
| OSM | Overpass, `overpass.kumi.systems` mirror | ODbL | `overpass-api.de` reset every connection from this environment. The mirror's data is from **2026-06-01** (5 months old). `fetch_osm.py` now falls back to the mirror on its own. Refetch from the main server when it is reachable. |
| UrbIS - 3D Constructions | datastore.brussels, per 1 km sheet | CC0 | SHP, one MultiPolygon Z per building solid. Release 2026-10-03. |
| Digital terrain model 2021 | datastore.brussels, per 1 km sheet | CC0 | 0.5 m GeoTIFF, no CRS tag in the files (only `.tfw`). |
| UrbIS - Transport networks | datastore.brussels, per 1 km sheet | CC0 | GPKG: `StreetAxes`, `StreetNodes`, `Railways`. Release 2026-10-02. Downloaded, used only for the alignment check below. |

How to find more sheets: every dataset has an INSPIRE Atom feed (URL in
`pipeline/sources.json`, key `atom`) that lists each sheet and each release
with its bbox. Sheet `EEENNN` covers E EEE000–EEE999, N NNN000–NNN999
(EPSG:31370). The full 32-tile grid (E 146643–150643, N 164394–166394) needs
sheets E 146–150 × N 164–166 (15 sheets per dataset); a whole-region archive also exists (sheet code
`21001` for vector, `04000` for the DTM).

### G4 results

```
../venv/bin/python pipeline/fetch_osm.py
../venv/bin/python pipeline/fetch_urbis.py
../venv/bin/python pipeline/run_tile.py G4 --id-field INSPIRE_ID --layer BuildingSolids
node tools/check_roads.mjs G4
```

- **Roads:** 92 roads, 89 nodes (23 cut at the 150 m buffer, 20 roads with a
  tram, 3 signal nodes, 0 roundabouts). `buildRoadNetwork` (style `eu`, `ground`
  from `terrain.u16`) runs in Node 22 in about 0.3 s. Result: 44 junctions,
  4 continuations, 41 ends, 468 lane-graph paths, 7 blocks. The format is right:
  no `dangling` or parse errors, and the lab's Import accepts it (it only checks
  for `nodes` and `roads` arrays). The engine reports **28 errors and 93
  warnings**, all geometric:
  - `road-swallowed` ×16: short OSM pieces between close junctions;
  - `tight-bend` ×12: OSM kinks next to a junction, where the engine has to
    shrink the PI radius to about 0 m;
  - `overlap` ×5, `arm-overlap` ×2, `sharp-junction` ×2;
  - info: `radius-clamped` ×47, `short-blend` ×22, `design-radius` ×15.

  These are Session 2's work (see below). Same counts with `--flat`.
- **Buildings:** 598 UrbIS solids (1,109 read from 2 sheets; the others have
  their centroid outside G4). 45k vertices, 26k triangles. Heights 1.6–58 m,
  median 10.6 m. Every mesh has positive volume, so the winding is outward.
  111 of 9,598 roof triangles face down (soffits and overhangs, flipped up by
  the roof rule).
- **Terrain:** 65.3–97.0 m, no nodata. Place de Saint-Job is at 70.5 m, inside
  the expected 65–80 m. Sheets are mosaicked before resampling, so there is no
  seam at E 150000 (which crosses G4).
- **Alignment:** OSM road centrelines (non-service) are a median 0.54 m from
  the UrbIS street axes (p90 1.9 m, max 8 m around the Place de Saint-Job
  square). No road centreline runs through a UrbIS building.
- **Debug page:** `docs/img/debug-G4.png` (whole tile) and
  `docs/img/debug-G4-saint-job.png` (zoomed on the square) show roads, the
  buffer, buildings by height, 1 m contours with height tint, the tram line, a
  park, and points. No console errors.

### Data problems found

1. **The DTM GeoTIFFs have no CRS.** The pipeline assumes EPSG:31370 (it says so
   in the log). The metadata does not name the height datum either. The values
   agree with the UrbIS 3D heights to about 1 m, so the DTM is taken as TAW.
2. **UrbIS walls go below the DTM.** The lowest vertex of a building is a median
   1.0 m under the lowest DTM sample around its footprint (5 %–95 %: 1.5 m
   below to 0.1 m below). The 3D model and the 2021 LiDAR disagree slightly, or
   the walls are modelled down to a lower ground. `base` stays the DTM value
   (CONTRACT 5.2).
3. **OSM data is 5 months old** (mirror lag, see above).
4. **Few OSM trees:** 3 tree nodes in G4, no tree rows. OSM does not map
   Uccle's street trees densely. A municipal or Brussels Environment tree
   inventory could fill this later; none is used now.
5. **Place de Saint-Job is not a roundabout in OSM**, so G4 has no roundabout to
   test the ring code against. The real roundabout test has to come from
   another tile.

### Other changes in 1b

- `pipeline/build_terrain.py`: mosaics the 31370 sheets before bilinear
  resampling, and treats float32-min as nodata.
- `pipeline/build_buildings.py` / `run_tile.py`: `--layer` matches a substring
  (UrbIS layer names carry the sheet number). Input paths are recorded relative
  to `data/raw/urbis/<key>/`, so they include the release folder and its date.
- `pipeline/fetch_osm.py`: falls back to the kumi mirror.
- `tools/check_roads.mjs`: builds a tile's `roads.json` with the road engine and
  prints issues grouped by code. Exit code 1 if there are errors. This also
  confirms that `vendor/roads` runs in Node 22 as plain ES modules
  (`vendor/roads/ORIGIN.md` still says this is unchecked; it is left untouched
  under the vendor rule).
- `docs/CONTRACT.md` is now **v0.2** (clarifications only, see its change list).
- `data/LICENSE` (ODbL, with attributions).

## Session 2: full-area road import

Goal: `data/roads/network.json` for the whole study box, one road-lab network
that `buildRoadNetwork(data, { ground })` builds with **no errors** and few
warnings, plus per-tile `roads.json` cut from it.

0. Data first: add the remaining sheets to `pipeline/sources.json` (E 146–150 ×
   N 164–166 for all three UrbIS datasets, from the Atom feeds), then build
   terrain and buildings for all 32 tiles. Try `overpass-api.de` again for
   fresher OSM, and record which endpoint was used.
1. Run `build_roads.py --all`. Load the result in the road lab: either wrap
   `vendor/roads/road-lab.html` in a `tools/road-lab.html` whose imports point
   at `../vendor/roads/`, or use the lab's Import button. Extend
   `tools/check_roads.mjs` (it already does this for one tile) to read
   `data/roads/network.json` with `ground` stitched from all terrain tiles.
   Make this the regression check. Baseline on G4 alone: 28 errors, 93 warnings.
2. Fix the converter against the issue list. Expected trouble spots:
   - **dual carriageways and split junctions:** two one-way OSM ways become two
     `oneWay` roads. Decide whether to merge them into one two-way road with a
     `raised` centre (`lanes.center`), or keep them separate and rely on the
     engine's `split` nodes;
   - **short pieces:** `road-swallowed` errors (16 in G4) come from junction trims longer
     than the road. Merge nodes closer than about 8 m into one junction (the
     classic OSM "junction cluster" problem);
   - **roundabouts:** check that `ring.radius` against real kerbs gives no
     `ring-small` errors. Flared one-way entries into a ring may need `split`
     nodes;
   - **mini roundabouts** and **turning circles**: decide how to show them;
   - **`tight-bend` errors** (12 in G4): a PI close to a junction gets the type
     radius (25 m local, 80 m avenue), the engine shrinks it to almost 0 because
     the tangent is too short, and then the road is narrower than its bend.
     Fix in the converter: drop PIs closer to an end node than the junction trim
     (about road width + corner radius), and/or cap `r` by the available tangent
     length. Tune `SIMPLIFY_TOL` / `MIN_PI_RADIUS` after that;
   - **Place de Saint-Job** is a square of separate residential ways in OSM
     (`r14387667_0`, `r32234433_0` both report `tight-bend`). Check it against
     the UrbIS axes and the orthophoto before deciding how to model it;
   - **bridges and tunnels:** the railway crossings around Uccle-Stalle /
     Saint-Job (line 124). Use `layer` / `bridge` from `meta` to set
     `profile.mode` and grade separation.
3. Lane stacks: check the tag coverage (`lanes`, `cycleway*`, `parking:*`,
   `sidewalk*`) on the real data. Add `turn:lanes` → `sections` (turn pockets)
   where OSM has it.
4. Trams: the road engine has no tram lane. Keep `meta.tram` on roads and draw
   the rails from `features.lines` (kind `tram`) in the viewer. Lines 4, 92 and
   97 pass through or near the area (unverified). Optionally add a `tram`
   entry to the lane types upstream in game-engine-v1, never in `vendor/`.
5. Use the UrbIS transport network to check OSM street names and connectivity.
   Report gaps but don't merge the geometries. The GPKG has `StreetAxes`
   (fields `STRNAMEFRE`, `STRNAMEDUT`, `HIERARCHY`, `LVL`, `SLOPE`,
   `STARTSN_ID`/`ENDSN_ID`), `StreetNodes` and `Railways`. In G4 the OSM
   centrelines are a median 0.54 m from these axes.
6. Junction control: signals on approach nodes are already mapped. Add
   `crossing` nodes → crosswalk placement when the engine supports it.
7. Per-tile cut: build every tile's `roads.json` from `network.json`, so all
   tiles share one id space. Update the manifest.

Done when: the check script reports 0 errors for the full network, all 32
tiles have `roads.json`, and the debug page shows them.

## Session 3: 3D viewer (three.js WebGPURenderer + TSL)

Goal: `viewer/index.html` streams tiles from the manifest and renders terrain,
buildings and the road engine's meshes in one y-up scene in local metres.

1. Setup: three.js r17x+ through an import map (pin an exact version) with
   `three/webgpu` and `three/tsl`. Use `WebGPURenderer` with its WebGL2
   fallback, and an orbit camera plus a street-level fly or walk mode.
2. Terrain: per tile, a `PlaneGeometry(500, 500, 500, 500)` displaced on the
   CPU from `terrain.u16`. Or upload the u16 data as a texture and displace in
   a TSL vertex node. Shared edges make the seams exact. Shade with a TSL
   slope/height material for now.
3. Buildings: one `BufferGeometry` per tile from `buildings.bin` (index
   buffer, computed flat normals). Roof and wall groups get separate materials
   from the per-building `roof` / `walls` ranges. G4 is 598 buildings, 26k
   triangles, so one draw call per material per tile is plenty. Walls reach
   about 1 m under the terrain (CONTRACT 5.2): let them sink, don't clip.
   `attrs.BU_ID` groups solids into buildings for picking.
4. Roads: build the network with `buildRoadNetwork(data, { ground })`, using
   `ground` from the terrain tiles (`loadGround` in `tools/check_roads.mjs` is
   the reference lookup). Until Session 2 is done, expect the G4 errors listed
   above; skip or flag roads with `error` issues rather than failing the tile. Turn it into meshes with
   `vendor/roads/mesh/laneRoadMesh.js` (needs `three` resolvable for earcut).
   Lift the road a few cm, or use polygonOffset. Make sure the terrain doesn't
   poke through: flatten the heightmap under the road corridor, see the
   upstream terrain grading in game-engine-v1.
5. Trees and features: instanced trees from `features.trees`, flat park
   polygons, tram rails as thin extrusions along `features.lines`.
6. Streaming: load tiles in a ring around the camera from `manifest.json` and
   dispose them outside it. Show a stats overlay (draw calls, triangles, tiles).
7. Check against reality: Place de Saint-Job, Avenue De Fré and Chaussée
   d'Alsemberg / Uccle centre seen at street level. Note mismatches for the
   data sessions.

Done when: tile G4 plus its 8 neighbours render at 60 fps on a mid laptop, and
roads sit on the terrain with no z-fighting.
