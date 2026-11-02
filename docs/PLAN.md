# Plan

## Where things stand (end of session 1, 2026-11-02)

Done:

- `vendor/roads/` holds the road lab, copied unchanged from game-engine-v1 @ `60e7f43`
  (see `vendor/roads/ORIGIN.md`).
- `docs/CONTRACT.md` v0.1 fixes the coordinates, tile grid and file formats.
- `CREDITS.md` has the licence notes. The UrbIS rows are **unverified**.
- `pipeline/` has the scripts:
  - fetch: `fetch_osm.py`, `fetch_urbis.py`
  - build: `build_roads.py`, `build_features.py`, `build_terrain.py`, `build_buildings.py`
  - finish: `build_manifest.py`, `run_tile.py`
- `debug/index.html` is the 2D tile viewer.

**Blocked:** the session's network policy denied `overpass-api.de`,
`datastore.brussels` and `urbisdownload.datastore.brussels`. So no real data
was downloaded and **sample tile G4 was not built**. The scripts were
smoke-tested only on throwaway synthetic inputs kept outside the repo. Those
inputs covered:

- a cross junction, a roundabout, a `oneway=-1` street, a tram, a road cut at
  the buffer;
- a plane-shaped GeoTIFF;
- a box building, a gable building (PolyhedralSurface Z) and a 2D footprint.

The tests checked the geometry: id and topology, oneway reversal, roundabout
collapse, triangle winding, terrain row order, and the viewer's readout.

### Session 1b: finish sample tile G4 (once the hosts are allowed)

1. In the environment settings, allow `overpass-api.de`, `datastore.brussels`
   and `urbisdownload.datastore.brussels`, plus any host the UrbIS downloads
   redirect to.
2. `python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt`
3. `../venv/bin/python pipeline/fetch_osm.py`
4. On datastore.brussels, find the UrbIS 3D buildings, DTM and transport
   datasets. Then:
   - put their URLs in `pipeline/sources.json`;
   - check each licence page and update `CREDITS.md` (URL and date);
   - run `pipeline/fetch_urbis.py`.
5. Look at what the 3D buildings file actually is: format, layers, and the
   building-id field. Run
   `pipeline/run_tile.py G4 --id-field <field>`. If the buildings come as
   CityGML with separate Roof/Wall layers, check `build_buildings.py`'s
   grouping.
6. Check the result in `debug/index.html?tile=G4`:
   - OSM roads and UrbIS buildings line up (expect under 1–2 m offset);
   - contours look plausible (Saint-Job sits in the Geleytsbeek valley, around
     65–80 m TAW, unverified).
7. Commit `data/tiles/G4/*` and `manifest.json` (target under 2 MB). Add a
   `data/LICENSE` (ODbL, see CREDITS.md).

## Session 2: full-area road import

Goal: `data/roads/network.json` for the whole study box, one road-lab network
that `buildRoadNetwork(data, { ground })` builds with **no errors** and few
warnings, plus per-tile `roads.json` cut from it.

1. Run `build_roads.py --all`. Load the result in the road lab: either wrap
   `vendor/roads/road-lab.html` in a `tools/road-lab.html` whose imports point
   at `../vendor/roads/`, or use the lab's Import button. Write a Node script,
   `tools/check_network.mjs`, that imports `vendor/roads/roadNetwork.js`, builds
   the network with `ground` from the terrain tiles, and prints `issues` grouped
   by code. Make this the regression check.
2. Fix the converter against the issue list. Expected trouble spots:
   - **dual carriageways and split junctions:** two one-way OSM ways become two
     `oneWay` roads. Decide whether to merge them into one two-way road with a
     `raised` centre (`lanes.center`), or keep them separate and rely on the
     engine's `split` nodes;
   - **short pieces:** `road-swallowed` errors come from junction trims longer
     than the road. Merge nodes closer than about 8 m into one junction (the
     classic OSM "junction cluster" problem);
   - **roundabouts:** check that `ring.radius` against real kerbs gives no
     `ring-small` errors. Flared one-way entries into a ring may need `split`
     nodes;
   - **mini roundabouts** and **turning circles**: decide how to show them;
   - PI radii that get clamped (`tight-bend` style warnings) are expected at
     sharp OSM corners. Tune the `SIMPLIFY_TOL` / `MIN_PI_RADIUS` defaults;
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
   Report gaps but don't merge the geometries.
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
   from the per-building `roof` / `walls` ranges.
4. Roads: build the network with `buildRoadNetwork(data, { ground })`, using
   `ground` from the terrain tiles. Turn it into meshes with
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
