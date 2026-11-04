# Handoff: where the project stands and what's left

**Full list of open work: `docs/TODO.md`.**

Read this first when resuming (with Claude or by hand). Rendering and performance plan: `docs/RENDER_PLAN.md`; what we learned from slop-newyork, game-engine-v1 and three r187: `docs/RESEARCH.md`. Details are in `docs/PLAN.md`
(roadmap and history) and `docs/CONTRACT.md` (data format, v0.7).

## Rules that still hold

- `github.com/tibogot/game-engine-v1` is a READ-ONLY reference: never modify or push to it.
- Don't edit `vendor/roads/` or `vendor/slop-trees/` (copied code, see their `ORIGIN.md`).
  If you must, log it in that folder's `CHANGES.md` with the reason.
- Never substitute mocked or made-up data: if a dataset can't be fetched, say so.
- Work on branch `claude/foundation`.

## How to run

```
python3 -m http.server 8765        # from the repo root
open http://localhost:8765/viewer/index.html?tile=G4
```
Useful URL params: `far=0..6` (far-LOD ring), `clock=HH:MM`, `timescale=N`, `trams=0`, `worker=0`, `tile=A1..H4`, `ring=0|1|2` (neighbour tiles), `yaw=deg` (walk facing), `view=stjob|walk`, `at=x,z`, `cam=x,z,height`,
`time=golden|midday|overcast|twilight|night`, `fx=0` (no post effects), `trees=simple`
(old leaf-card trees), `sunlight=1` (cascaded shadows), `warmup=0` (no boot shader warm-up), `log=0` (dev log collapsed). Use Chrome/Edge with WebGPU for real
speed; headless screenshots use the slower WebGL2 fallback.

Deploy (Vercel): static, no build step. `vercel.json` redirects `/` to `/viewer/index.html` and sets
cache headers; `.vercelignore` leaves out the pipeline, tools and docs. Import the repo in Vercel
(framework "Other") or run `vercel` from the repo root.

Pipeline (raw data must be fetched first, see README): `python pipeline/run_tile.py --all --network`.

## Done (all pushed)

- Data: UrbIS 3D buildings, DTM, DSM, transport, orthophoto 2024 (all CC0) + OSM (ODbL).
  32 tiles of 500 m (A1–H4) built.
- Roads: full network through the road engine; 14 errors left inside tiles (23/32 tiles clean).
- Viewer (`viewer/`): three.js r187 WebGPU + TSL. Terrain, roads with painted markings and
  real surfaces (setts, pavers), tram rails, procedural façades with interior-mapped windows,
  real roof colours, landmarks (church) with stone, tracery and stained glass, cornices /
  ridge caps / buttresses as real geometry, slop-newyork trees on ~47k LiDAR tree positions,
  sky + IBL + shadows + GTAO/SSR/bloom, time-of-day presets, a walk mode.

## Remaining, in priority order

1. **Check on a real GPU (WebGPU)** in a browser: performance with all trees (1,600 per tile,
   47k total), the night-window speckle seen in software rendering, buttress/cornice look.
2. **Church**: done: deep (parallax) openings, tracery, rose window, belfry louvres,
   buttresses, ribs. Rose window on the main front. Left: compare materials with a photo of
   Saint-Job, oculi on the dome drum, lantern detail.
3. **Houses**: (chimneys, eaves + gutters done) shopfronts from OSM `shop=*`, gable attic
   windows, parallax window reveals.
4. **Night and props**: (street lamps done, procedural placement: `viewer/lamps.js`; bus stops,
   signals, bike racks, benches done from OSM points: `viewer/furniture.js`; shopfronts done from
   OSM shops; tram platforms, shelters and overhead wires done: `viewer/tram.js`) parked cars done
   (procedural, `viewer/cars.js`, simple model). Tram 92 runs on STIB's real timetable
   (`viewer/tramline.js`, `pipeline/build_transit.py`). Left: shop name signs, bins, bollards,
   better car and tram models (Blender), live STIB vehicle positions, more lines.
5. **Ground**: OSM land-cover mask + procedural grass done (`viewer/ground.js`). Left: UrbIS
   Land cover (gardens / paving / lawns), hedges.
6. **Roads**: the ~12 remaining bad spots (Alsemberg/Brugmann sharp Y, crowded rings in
   C4/F2; run `node tools/check_roads.mjs --all`), bump on setts and kerbs, wet look,
   manholes; the marking atlas is ~24 MB per tile, so shrink it before streaming.
7. **Multi-tile streaming + LOD**: done: tiles load around the player and unload behind
   (`?ring=`), tile CPU work in a web worker (`viewer/tileWorker.bundle.js`, rebuild with
   `node tools/build_worker.mjs` after editing tileData.js / heightmap.js / facadeGeom.js /
   landcover.js / roadData.js; `cd tools/worker && npm install` first). Left: tree LOD /
   impostors, far tiles with the draped orthophoto. Whole Brussels region (~650 tiles,
   ~1.2 GB of tile data) is the realistic maximum with UrbIS.

## Continuing in Cursor / Claude (local machine)

1. Clone `tibogot/uccle-city`, branch `claude/foundation` (all work is there; nothing merged to main).
2. Serve the repo root: `python3 -m http.server 8765`, open
   `http://localhost:8765/viewer/index.html?tile=G4` in Chrome/Edge (WebGPU). Do the browser check
   in `docs/TODO.md` section 0 first.
3. Python pipeline: `python3 -m venv ../venv && ../venv/bin/pip install -r pipeline/requirements.txt`.
   Raw data (`data/raw/`, git-ignored) is NOT in the repo: re-fetch with `fetch_osm.py`,
   `fetch_urbis.py`, the GTFS curl in `pipeline/build_transit.py`, and `build_roofcolors.py`
   (orthophoto). The built tiles in `data/tiles/` ARE committed, so the viewer works without them.
4. Tile worker bundle: after editing `viewer/tileData.js`, `heightmap.js`, `facadeGeom.js`,
   `landcover.js`, `roadData.js` or `vendor/roads/`: `cd tools/worker && npm install && cd ../.. &&
   node tools/build_worker.mjs` (commit `viewer/tileWorker.bundle.js`).
5. Tell the assistant: "read HANDOFF.md, docs/TODO.md, docs/PLAN.md and docs/CONTRACT.md, then
   continue with <item>". Suggested next: extend the area to all of Uccle (TODO section 1), then
   your Blender kit (`docs/BLENDER.md`, with your meshoptimizer rules).

## Blender assets

Plan for better houses/props made in Blender without losing performance: `docs/BLENDER.md`.

## Tips for the next session

- Pipeline order matters: `build_features.py` rewrites `features.json`, so run `build_trees.py`
  after it (as `run_tile.py` does). Python venv: `/home/user/venv` in the cloud container
  (`../venv` from the repo, see README).

- Start by asking Claude to read `HANDOFF.md`, `docs/PLAN.md` and `docs/CONTRACT.md`.
- Screenshots in headless Chromium take 1–3 minutes per frame (software WebGL2); keep the
  viewport small (about 1000 px wide).
