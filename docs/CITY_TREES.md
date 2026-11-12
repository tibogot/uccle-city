# City trees: the impostor kit in the city, trees off the road, colliders that match the picture

Branch `claude/city-trees` (2026-11-12). These are the three things the owner found most annoying in the city:
1. far trees crawling with dots;
2. trees standing in the middle of the road;
3. invisible things stopping the car.

Images are in `docs/city_trees/`. Every GPU number below was taken on a GPU shared with other agents' tabs (another
Uccle city on port 8820, the Road Lab, the Material Lab). They are noisy, and each table says how much.

URLs (serve this worktree on 8836):
- `http://127.0.0.1:8836/viewer/index.html?tile=I6&impkit=1`: the kit.
- `http://127.0.0.1:8836/viewer/index.html?tile=I6`: the default (old impostors).
- `...&drivedebug=1`: the car colliders (or the dev panel's "car colliders (G)", or key G while driving).
- `...&drivecol=legacy`: the colliders as they were before this branch.
- `http://127.0.0.1:8836/tools/collider-audit.html?mode=after` (or `mode=before`, `&tiles=I6,J6`): the collider
  audit over every tile.

## 1. The city's far trees through the impostor kit (`?impkit=1`)

`viewer/treeKitCity.js` and `viewer/treesStylized.js` (street trees only, and only when `?impkit=1`; the default is
unchanged). It does what the Impostor Lab measured (`docs/IMPOSTOR_KIT.md`):

**The atlas:**
- 16 x 16 hemi views x 64 px, 6 variants, 63.8 MB;
- baked from the mesh as it is at the hand-over: LOD 2 with its morph complete (`sources/stylizedTrees.js`);
- the bake runs in the background, a grid row per frame plus the bake worker, so it adds no long task;
- once it is ready, the kit's shaders compile off the frame, then every far tree dithers in over 0.9 s.

**One field for the whole city.** It is one instanced draw per pass (a depth pre-pass, then the EQUAL colour pass) for
every far tree of every loaded tile, full or far-LOD:
- 60-120 k instances, depending on the view;
- the instances are kept per tile;
- the buffers are rewritten only when the tile set changes, or when the camera has moved 250 m (the order is nearest
  tile first). A rewrite takes 1-2.5 ms;
- the CPU never re-buckets while the camera moves. The old code re-bucketed every tile every 5 m.

**Hand-over:**
- at `IMP.start` = 400 m over `IMP.band` = 30 m (the lab's values; the old band was 50 m);
- the mesh LOD 2 keeps the pixels where n < 1 - t, and the impostor keeps n >= 1 - t, with the same screen noise;
- the dev panel's impostor sliders still drive it: the kit's fade uniforms are the `IMP` uniforms.

**Far end.** The shading fades into the ground over 1,200-1,500 m, where the old impostors stopped at 1,100 m. The
ground colour is a running mean of the far tiles' orthophotos.

**What the city needs on top of the lab:**
- *Solo instances.* A far-LOD tile whose full tile is not loaded has no mesh to hand over from. Its trees are drawn
  from 0 m: kit material option `solo`, which `ikData.w` >= 32 turns on per instance.
- *Fade-in.* Trees of a tile that streams in while the city runs dither in over the tile fade: option `appear`, with
  the appear time in `ikTint.x`.

**Textured trees (`?treetex`): not needed.** `docs/TREES.md` recommends textures only for the plane and the beech. For
the street trees it says "keep A". The city draws only street trees, so nothing changes and there is no switch.

### Jitter meter in the city (`labs/cityJitter.js`)

The setup:
- the same views and paths, 24 frames, about 1400 x 900;
- the band is the pixels the far-tree impostors change (hidden and shown per frame);
- each cell gives the blink share and the second temporal difference d2 x1000. Lower is steadier.

| View · path | impkit=0 (today) | **impkit=1 (kit)** |
|---|---|---|
| park (Wolvendael from 70 m up) · strafe 0.12 m/frame | 52.4 % / 126.9 | **5.2 % / 33.0** |
| park · dolly 1 m/frame | 64.9 % / 150.7 | **36.8 % / 82.4** |
| park · orbit 0.02°/frame | 50.8 % / 125.0 | **3.5 % / 23.4** |
| avenue (Av. Houzeau from 25 m up) · strafe | 42.3 % / 93.2 | **7.0 % / 25.8** |
| avenue · dolly | 60.0 % / 115.2 | **26.4 % / 50.6** |
| avenue · orbit | 60.2 % / 111.4 | **23.5 % / 36.9** |

So d2 is 3.6-5.3x lower on strafe and orbit, and 1.8-2.3x lower on the 1 m/frame dolly. On the dolly the hand-over band
moves through the crowns.

Images:
- `jitter_heat_park_strafe_impkit0.jpeg` and `jitter_heat_park_strafe_impkit1.jpeg`: blinking pixels in yellow, the
  far-tree mask in blue.
  - The foreground (mesh trees, ground) blinks the same in both: that is the near city on a 12 cm/frame strafe from
    70 m up, not the far trees.
  - The kit also draws trees out to the horizon, where today's stop at 1.1 km.
- `handover_strip_houzeau_impkit0.jpeg` and `handover_strip_houzeau_impkit1.jpeg`: 12 frames, the camera walking back
  so Avenue Houzeau's trees go from 355 to 425 m (FOV 20, 2x). Today's crowns turn into the halftone dot pattern past
  400 m. The kit's keep their shape through the band: no pop, no dots. The impostors are a little softer than the mesh
  at FOV 20 (the kit's known telephoto weak point).
- `park_view_impkit1.jpeg`: the park view with the kit.

### GPU

The measurement was inside one page: the far trees alternately on and off, 4 rounds of 3 s, GPU timestamp p50.
Another agent's Uccle city was rendering in the same Chrome the whole time.

| View | impkit=0: far trees on − off | impkit=1: on − off |
|---|---|---|
| park | −3.67 ms (rounds −5.4 / +1.1 / +0.1 / −1.4) | +0.92 ms (+0.9 / +0.7 / +1.6 / 0.0) |
| avenue | +1.38 ms (−1.1 / +2.8 / +3.3 / −3.5) | +1.44 ms (+2.0 / +2.6 / +1.4 / −1.4) |

**Inconclusive.** The rounds swing by ±3 ms. Take the lab's quiet-machine numbers until a re-run on a free GPU:
- forest patch: kit +0.92 ms against today +0.98 ms;
- the 83 k-tree far forest: kit +1.84 ms to 1.5 km against today +2.88 ms to 1.1 km;
- the coordinator's quiet run: kit +0.92-1.18 ms against today +1.77-2.16 ms.

Boot time:
- with the bake awaited under the boot cover, the boot went from 12 to 28 s, because the tiles build without frames;
- the bake now runs in the background: cover gone at 16.7 s (one run; noisy), far trees shown 1.6 s later.

## 2. Trees on the carriageway (`pipeline/filter_road_trees.py`)

**Where the trees come from.** `pipeline/build_trees.py` puts a tree at every canopy-height peak (UrbIS DSM − DTM),
with OSM tags. The peak is the top of the crown, and a street tree's crown leans over the road. So the trunk was drawn
where the crown peaks: in the lane.

**The fix** is a new pipeline step, run after `build_trees.py` (added to `run_tile.py`) and idempotent. It uses the
measured UrbIS street surfaces (`surfaces.json`, which the viewer draws):

1. **Which trees.** A tree is on the carriageway when a roadway, tram roadway or parking surface covers it, or when it
   is within 1.6 m of an OSM tram track, and no other surface class covers it.
   - Never touched: trees on sidewalks (tree pits), medians, central reservations, squares and paths.
   - Also kept: a tram reservation's grass verges, which have real tree rows (the E2 rows at 2.6 m from the track).
2. **Move.** The tree moves to the nearest point 0.6 m clear of every carriageway (a trunk plus a margin), outside
   buildings and inside the tile, at most clamp(0.8 x crown, 1.5, 4) m away.
3. **Drop.** The tree is dropped when there is no such point. It is also dropped when the new spot is within 1.8 m of
   another tree: the trunk that crown belongs to is already there.

What it writes into `features.json`:
- moved trees keep their id, get `moved: [x, z]`, and a `y` re-sampled from the DTM;
- dropped trees go to `treesDropped`, each with a `why`;
- the summary goes to `treesRoadFilter`.

**Result over all 120 tiles:** 212,430 trees, of which **4,899 were on the carriageway**:
- **3,800 moved**: median 1.0-1.7 m per tile, at most 3.9 m;
- **1,099 dropped**:
  - 941 had no clear ground within reach (the middle of wide roads);
  - 128 duplicated another tree;
  - 26 had their clear ground in the next tile;
  - 4 led into another carriageway.

By class: roadway 4,733, tram roadway 63, tram tracks on a reservation 59, parking 44. The worst tiles were F4 129,
H2 124, H4 120 and F2 109. Every tile is listed in `city_trees/road_trees_per_tile.csv`.

**Images**, each before / after: `road_trees_{before,after}_{victor_emmanuel,equateur,houzeau}.jpeg`.
- Avenue Victor-Emmanuel III, near Saint-Job: trunks in the lane and through a parked car.
- Rue de l'Equateur: trees in the parking lane.
- Avenue Houzeau: a double row standing in both lanes.

After the fix the trunks stand on the sidewalks, and the drive colliders follow, because they are built from the same
list.

## 3. Car colliders against what is drawn

**The audit** is `viewer/drive/colliderAudit.js`. Two runners use the same code:
- `viewer.auditColliders()` in the city, for the loaded tiles;
- `tools/collider-audit.html`, for all tiles, through the tile worker.

It checks every collider against what is drawn:

| Kind | Visible when |
|---|---|
| building | the solid is drawn, or a hero model replaces it; not an overhead solid (base > 2.2 m over the ground under it) |
| island | the drawn deck inside it is raised (the drive ground grid, made from the drawn meshes, ≥ 20 cm over the carved terrain on most points) |
| tree | a drawn tree stands within 0.3 m |
| lamp | a drawn lamp stands within 0.5 m |
| post | a drawn bollard stands within 0.3 m |

The reverse also counts: drawn trees, lamps and bollards with no collider, and raised measured medians with no island.

**Before** (all 120 tiles, `?mode=before`), invisible blockers:
- **6,698 lamp posts with no lamp drawn.**
  - Cause: the colliders came from `lampSites`, but the city moves every lamp onto the measured sidewalk
    (`streetFit.placeLamp`) or drops it.
  - Effect: 88 % of the lamp posts were invisible, many of them in the carriageway. I6 alone had 95, and 13 of those
    were in the roadway near Saint-Job.
- **182 kerb islands with no raised kerb drawn.** These are the road engine's islands; on the measured surfaces they
  are not drawn.

Drawn but with no collider:
- 5,711 lamps;
- 3,706 bollards;
- 130 raised medians.

Trees were never the invisible ones. Their colliders and the drawn trees come from the same list. Before the filter in
§2, 4,899 of those tree colliders stood in the carriageway.

**The fixes:**
- `colliders.js buildDriveData`:
  - engine islands are kept only where the drawn deck is raised;
  - the measured medians become islands;
  - overhead solids are dropped. The check found none: UrbIS solids all start at the ground.
- `driveMode.js tileDrive`: lamps and bollards come from the lists the city draws (`lamps.js placedLampSites`, the
  surveyed bollards).
- `character/cityHook.js`: the walker's lamp posts come from the drawn lamps too.

**After** (`?mode=after`):
- **0 colliders with no visible object.** The one hidden solid left is Saint-Job's, where the hero model is drawn; it
  is kept on purpose.
- Drawn without a collider: only 1 median, in F5, which is raised on less than half of its area.
- Collider counts:
  - lamps 6,623;
  - posts (bollards) 3,706;
  - islands 227 (37 engine islands, 190 measured medians);
  - 182 engine islands dropped.
- Every tile is listed in `city_trees/colliders_per_tile.csv`.

**Driving check** (scripted: the car started 14 m before each invisible post found by the audit near Saint-Job, full
throttle along the road):
- legacy: 4 of 6 runs hit an invisible lamp post (kind 3) 2.3-2.4 m before its spot;
- now: 0 of 6 runs hit a lamp post. The other hits were real buildings past the curve, the same in both.

Images:
- `colliders_before_stjob.jpeg`: the debug view, with red crosses on the 6 invisible posts in front of the car;
- `colliders_after_stjob.jpeg`: the colliders on the drawn lamps, legend "no visible object: 0".

**The debug view** (`?drivedebug=1`, dev panel "car colliders (G)", key G):
- colours by kind: buildings yellow, islands cyan, trees green, lamps magenta, bollards orange;
- anything with no visible object is red with a 3 m red cross;
- a legend (bottom left) counts the colliders within 40 m by kind, and the ones with no visible object.

## 4. Weak points

- **GPU numbers are inconclusive.** Another agent's city was rendering in the same Chrome. Re-run
  `labs/cityJitter.js farBench()` on a free GPU before making the kit the default.
- **Bake time in the city.** It took 6.6-24 s, against 3 s in the lab, because it competes with the tiles' build. The
  far trees appear a few seconds after the boot cover lifts (they dither in, with no pop). The first seconds have no
  trees past 400 m.
- **Telephoto.** At FOV ≤ 20 the impostors are softer than the mesh (the kit's known weak point; see the strip).
- **Solo instances.** A far-LOD tile within 400 m (an orbit camera far from its target) switches from solo to hand-over
  when its full tile loads. The near impostors then give way to the mesh trees fading in. This is a short dither, not
  checked frame by frame.
- **Lab tools reading old impostors.** `IMP.band` is 30 m under impkit, against 50 m in the old code. The old
  `viewer/impostors.js` is untouched; retire it when the kit becomes the default.
- **Trees off the measured street are not checked.** The filter only covers UrbIS-mapped streets. Engine roads UrbIS
  does not map (private lanes) are not checked.
- **Tree trunks are not checked against parked cars.** A trunk 0.6 m from the kerb can visually touch a car parked
  against that kerb.
- **Dropped trees in the next tile.** 26 trees whose clear ground was in the next tile were dropped; they could have
  been moved there.
- **The far ground colour** is a mean over all the far tiles, not per tile.
- **The jitter meter's foreground.** At 70 m up, the near mesh trees and the terrain blink on a 12 cm/frame strafe in
  both modes. That is outside the far-tree band and not this branch's subject.
