# Roof tops: chimneys, parapets, roof windows, solar, flat-roof furniture (branch claude/roofs, 2026-11-14)

Owner playtest complaint #5 (driving and flying the falcon over the live site): "a lot of the top of buildings looks
empty, like unfinished". **On by default.** `?roofs=old` = the city as before (box chimneys on party walls only, bare
flat roofs drawn as a colour with a speckle, no parapets), for A/B.

## 1. Why the tops looked empty (measured before changing anything)

`tools/roofs/roofStats.py` over the 120 tiles (UrbIS LoD2 roof triangles, `buildings.bin`):

| | buildings | roof area |
|---|---|---|
| flat (> 80 % of the roof level) | 5 999 | 1.20 M m2 |
| pitched (> 80 % sloped) | 9 209 | 1.25 M m2 |
| mixed (pitched house + flat annexes) | 6 755 | 1.07 M m2 |
| **flat roof area, all buildings** | | **1.69 M m2 = 48 %** |

1. **Half the roof area is flat, and a flat roof was a bare plane**: the orthophoto colour with a fine speckle, no edge at
   all (the façade simply stopped at the roof line: no parapet, no coping), nothing standing on it. Every apartment block
   along Brugmann / Montjoie / De Fré / Vanderkindere, every shop and garage, and the flat rear annex of almost every
   terraced house read as "unfinished" from the air. This was the biggest cause.
2. **Chimneys only on party walls between two different houses** (`facadeGeom.js`: `partyH >= 999`, 70 %), as plain
   boxes with two box "pots". Detached and semi-detached villas (most of south Uccle: Fort-Jaco, Prince d'Orange,
   Saint-Job's upper streets) had no chimney at all.
3. **Nothing on the slopes**: no roof windows, no solar modules, no dishes. Dormers exist only on street fronts of the
   façade-kit houses (50 % of them), which is right but rare from above.
4. The lift / stair overruns are in UrbIS (separate solids) and were drawn; they were the only thing on the blocks' roofs.

Screens (all `docs/assets/roofs/`, same camera before / after, golden light, `?ring=1&far=1&traffic=0&trams=0`; views in
`debug/roofShots.js` VIEWS): `before_*.jpg` / `after_*.jpg` for Saint-Job (air 45 m, terraces 55 m, the square at eye
height), Montjoie / Brugmann blocks (air + close), De Fré, Vanderkindere / Rue Marie Depage, Uccle-Centre (F5), Calevoet
(Engelandstraat / Dieweg block), Fort-Jaco villas.

## 2. What was built

### The kit (`tools/blender/roofTopKit.py` -> `models/roofs/roofkit.glb`, 0.7 MB, + `roofkit.json`, `previews/`)

Blender 5.0 headless, three SCRIPTED LODs per piece (no decimation), named slots only (`brick, cap, clay, soot, steel,
alu, glass, pv_cell, pv_frame, hvac, grille, upstand, opal, concrete, dish, rubber`), chamfered edges as their own flat
facets (no smooth normals bleeding into flat faces), Cycles AO baked per vertex with each piece alone on what it stands on.
(Named roofTopKit.py: `tools/blender/roofkit.py` already exists - the Stalle chapel's real slates - and Windows paths
are case-insensitive.)

| piece | LOD0 / 1 / 2 tris | bands (m) | what |
|---|---|---|---|
| `stack` (JS, `viewer/roofs/roofKit.js`) | 16 / 16 / 8 | 45 / 140 / 480 | the brick stack: a unit box scaled to the stack; bricks laid in WORLD space by the shader (the gardens' stretcher bond, `gardenKit.js brickPattern`, now exported), so any stack size keeps 22 x 6.5 cm bricks; LEAD FLASHING where it meets the roof (14 cm band measured from the real roof plane / ridge tent under it, passed per instance), soot on the top 40 %; 12 % rendered stacks; foot 8 cm under the lowest roof point under it (JOINS) |
| `chimcap` | 116 / 52 / 10 | 45 / 140 / 480 | two corbelled brick courses + the concrete cap slab with a weathered top and a drip line |
| `pot` | 336 / 130 / 15 | 30 / 90 / 260 | terracotta pot (rolled rim, collar), open with a soot plug; red or buff clay; 1-4 per stack in a row |
| `cowl` | 232 / 100 / 36 | 30 / 90 / 240 | steel gas-flue terminal (liner + rain cap on three straps) instead of the last pot on 22 % of stacks |
| `velux` | 250 / 78 / 12 | 35 / 110 / 320 | centre-pivot roof window: flashing collar, grey aluminium sash cladding, the pane, top cover; lies on the slope, 2 cm into it |
| `pv` | 324 / 84 / 12 | 40 / 140 / 450 | 1.0 x 1.7 m module, dark (or silver) frame, glass with the 156 mm cells drawn from its metric UV, on two rails with roof hooks |
| `pvframe` | 744 / 168 / 120 | 30 / 80 / 200 | flat-roof A-frame (13 deg) with purlins and ballast blocks; the module's rails rest on the purlins |
| `cond` / `ahu` | 1028 / 80 / 36, 752 / 312 / 24 | 30 / 90 / 260, 40 / 120 / 380 | split-AC condenser on rubber-footed rails (fan grille); rooftop air-handling unit (louvres, two fan outlets, base frame) |
| `vent` / `ventbox` | 218 / 140 / 30, 220 / 108 / 36 | 25 / 70 / 200, 30 / 90 / 240 | soil / extract pipe with a rubber flashing boot and hat; louvred extract box on an upstand |
| `hatch` / `dome` / `skylight` | 384 / 96 / 24, 950 / 310 / 14, 228 / 36 / 36 | 30 / 90 / 260 | roof access hatch; opal rooflight dome; flat glazed rooflight - all on upstands that take the ROOF's own colour (per instance) |
| `dish` | 652 / 292 / 88 | 25 / 70 / 220 | 0.7 m offset dish on a mast with a stay on a ballast frame, aimed south-south-east, 30 deg up (Astra / Eutelsat from Brussels) |

`kit_previews_lod0.jpg`: the Blender preview row.

**Mesh audit** (`node tools/mesh_audit/cli.mjs models/roofs/roofkit.glb --nodes <piece>_lod<k>`, all 14 pieces x 3 LODs):
**0 blocking on all 42.** Warnings left: slivers (thin bars and rails), "near" (frame vs pane, 1-2 mm, by design).

### Drawn with the façades (tile worker, `viewer/facadeGeom.js`)

- **Parapets** round flat roofs: the outer face continues the façade (it goes into the WALL mesh with the wall material;
  `aWall.w < 0` flags it: no windows, no blind-wall marks, no cornice band on it), the inner face (the membrane dressed up
  it: the roof's colour) and a coping (aluminium 50 %, concrete 15 %, blue stone 15 %, dark metal 20 %) as strip details,
  mitred at corners by the existing strip machinery (near-flat joints mitred too: UrbIS splits a wall into faces ~1 deg
  apart). One parapet spec per building: blocks (>= 10 m) 0.45-0.95 m high, 25 cm thick; houses / annexes 0.12-0.5 m.
- **Flat-roof membranes** (`viewer/facades.js flatRoofLook`, from the real orthophoto colour): dark = torched bitumen in
  1 m rolls along the building's longest side (lap seams a little glossier, roll-to-roll tones, end laps every 5-8 m,
  granules, repairs dark or silvered, ponding stains, sun / dirt weathering at the roof's scale); light grey = gravel
  ballast (60 %) or PVC sheets with welded seams; greenish = sedum. Lines fade out under a pixel.

## 3. Placement: data, rules, density (`viewer/roofs/roofPlace.js`, in the tile worker)

Everything from the UrbIS roofs the worker already reads (no new data files, no mocked data): each building's roof
triangles are grouped into planar pieces (flat regions: |ny| > 0.97 and the same level; slopes: the same plane,
edge-connected), with their boundary edges; plus the façade analysis' party walls / gables / street faces and the
neighbours' roofs (`otherAt`). Every choice is seeded by the building's BU_ID (stable from visit to visit).

- **Party-wall stacks** (the Brussels rule, as before but as the kit): on a party wall between two houses, at the
  gable's top, 70 % per wall, built once for both houses, 0.8-1.5 m wide (2-4 flues), straddling the wall.
- **Gable stacks**: houses with NO party wall (villas): one stack on one gable, 45 %, inset into the gable wall.
- **Ridge stacks**: houses still without a stack, 45-600 m2 footprint, on their biggest slope 0.45-1.65 m under the
  ridge, 78 % (two on big houses, 50 %). Stack tops 0.7-1.3 m over the gable apex, 0.5-1.0 m over the ridge for ridge stacks, always >= 0.5 m over the roof under them.
- **Roof windows**: slopes >= 8 m2, pitch 20-66 deg, >= 2.4 m deep; back slopes 40 %, street slopes 15 %; 1-4 in a row at
  42-62 % up the slope, 0.78 x 0.98 / 0.78 x 1.18 / 1.14 x 1.18, clear of edges, stacks and solar.
- **Solar on slopes**: 14 % of pitched houses, on their most southern slope (within 75 deg of south, 12-57 deg pitch,
  >= 14 m2), portrait modules in a block fitted inside the slope (35-55 cm from the edges).
- **Flat roofs**: candidate spots on a 0.5 m grid in the region's own frame with their clearance to the edges; nothing
  where another solid (a lift overrun) stands. Blocks (>= 10 m high, >= 100 m2) and big low sheds (>= 250 m2): a hatch
  (75 %), vents ~ one per 60 m2 (30 % extract boxes), 0-4 AC condensers, an AHU on roofs over 400 m2 (35 % blocks,
  70 % sheds), rooflight domes (rows on sheds), 0-3 dishes, solar rows on 22 %. Houses' flat roofs / annexes (>= 8 m2):
  a dome (28 %) or a flat rooflight (17 %), a vent (35 %), AC (6 %), a dish (5 %), solar (8 %). Flat-roof solar runs in
  rows along the roof's own axis when within 35 deg of east-west (else east-west), facing the southern side, 1.6 m apart.

City-wide (`node tools/roofs/cityCounts.mjs`, 120 tiles, 25 442 buildings): 19 624 stacks (15 991 party, 1 386 gable,
2 247 ridge), 35 364 pots, 3 837 cowls, 13 687 roof windows, 40 750 solar modules on 2 915 roofs (29 109 of them on
flat-roof frames), 46 141 flat-roof pieces (17 637 vents, 9 776 domes, 5 209 condensers, 4 145 dishes, 3 775 flat
rooflights, 3 427 extract boxes, 1 986 hatches, 186 AHUs), 539 km of parapet (97 888 strips). Instance data 19 MB for
the whole city (only loaded tiles are in memory: ~2-4 MB on a 9-tile ring).

## 4. Reference comparison (Google Maps aerial, LOOK only: nothing traced, stored or shipped)

| place | real (aerial) | ours, before | ours, after | verdict |
|---|---|---|---|---|
| Place de Saint-Job terraces (50.794, 4.366) | red-tile and slate pitched roofs, a stack on nearly every party wall, flat grey rear annexes with skylights / domes, a few PV rows | stacks on party walls only, bare grey annexes | stacks with pots / cowls, domes and flat rooflights and vents on the annexes, parapets + copings, a few PV arrays and roof windows | **matches** the density and the kind of clutter; roof windows a little more frequent than seen |
| Avenue Montjoie / Brugmann blocks (50.8098, 4.3600) | dark bitumen roofs with lighter patches, parapet + coping line, lift / stair overruns, small vents; the neighbouring Brugmann block covered with PV rows | flat light-grey slab, no edge | dark membrane with weathering, parapet + coping, hatch / vents / AC / dishes; rows of PV on this block (random 22 %) | edges, membranes and furniture **match**; WHICH block has PV is random (the real one with PV is the neighbour) |
| Engelandstraat / Dieweg block, Calevoet (50.7909, 4.3340) | light grey roof with many repeated boxes along the wings, courtyard garden, the industrial sheds south of it fully covered with PV | bare light slab | light PVC / gravel roof, parapets, sparse vents / hatches, a small PV group; the sheds get rows of PV | edge and surface **match**; the real wing has more rooftop boxes than our density gives |
| Avenue du Fort-Jaco villas (50.7899, 4.3800) | dark slate hipped roofs, several dormers, a stack per villa, one flat-roofed modern villa, a pool | bare roofs, no chimney | a stack on most villas, roof windows (2-4 on big roofs) | stacks **match**; the real villas have more DORMERS than roof windows (the kit's dormers are only on street fronts) |
| Rue Marie Depage / Vanderkindere (50.8135, 4.3570) | stepped flat roofs of the big block, light membranes, plant; terraces with stacks | bare | parapets on every step, light membranes, PV, vents | **matches** in kind |

## 5. Cost

**Machine state**: `tools/perf/preflight.ps1` was **RED** all session (another agent's city tab, GPU 63-96 % busy at rest,
81-84 C, 0.5-2.6 GB free). GPU numbers are indicative only; draws / triangles are exact.

| view (9 tiles, `ring=1&far=1&traffic=0&trams=0`) | draws kit off -> on | triangles | GPU p50 (in-page A/B, 6 rounds alternating) |
|---|---|---|---|
| Saint-Job from 45 m | 448 -> 495 | 5.41 -> 5.70 M | single pair 7.41 -> 7.86 |
| Saint-Job terraces from 55 m | 444 -> 483 | 5.24 -> 5.45 M | +0.40 mean, median +0.13 (-0.32 .. +1.83) |
| the square at eye height | 551 -> 609 | 5.16 -> 5.45 M | **+0.28 mean (+0.07 .. +0.39)** |
| Montjoie block close (55 m) | 410 total | 4.73 M | |

"Kit off" hides only the pools; the parapets / membranes are in the building meshes: against `?roofs=old` the full
change at Saint-Job from 45 m was 432 -> 495 draws and 5.19 -> 5.70 M triangles (parapets ~0.2 M with their shadows).
The kit is 15 pieces x 3 LODs = at most 45 draws (+ shadow), ~27-42 drawn at once; 170-210 k kit triangles per pass.

- **CPU, main thread**: one streamer (`viewer/instanceStream.js`) for the 15 pools, margin 14 m / trigger 4 m (the
  default 6 / 2 m was outrun at car speed: 432 forced gathers on the Saint-Job drive), time-sliced in the shared
  budget. Saint-Job drive (`debug/driveStutter.js`, 14 m/s): **0 forced gathers**, frame p50 16.7 ms.
- **CPU, worker**: the façade analysis with the kit 244 ms a tile on average over the city (dense tiles ~550 vs ~250 ms
  without; it was 4.2 s before the placement was optimised: rasterised spot grid, local stacks, random-draw picks).
- **Memory**: kit GLB 0.7 MB; instance arrays ~0.16 MB a tile.
- **LOD hand-over**: per-instance bands + the dithered keep of `viewer/lodFade.js` in colour AND shadow (no pop, no
  shadow snap); LOD2 never casts; thin pieces (pots, cowls, vents, dishes, frames) cast from LOD0 only. Pop check
  (`debug/roofsFlight.js`, `popCheck` of driveStutter on the roofs streamer every frame): flying 1 km at 45 m / 20 m/s:
  **0 missing of 16.8 M** instance-LOD checks; driving the square at eye height 14 m/s: **0 missing of 7.7 M**.

## 6. Collisions

Nothing on a roof is reachable on foot or by car; the falcon is what hits roofs. Every piece's footprint box (stacks with
their pots, parapets with their coping, flat-roof pieces, PV) is stamped into the falcon's DRAWN-roof grid in the worker
(`roofPlace.js stampRoofCols` -> `tileData.js roofSurface`, 1 m cells): the bird hits what is drawn. Checked: the grid at
the stack at (1121, 576) = 76.84 m = its pot tops (the roof next to it 74.2 m). `falcon_colliders_G.jpg`: the G view in
fly mode on a parapeted roof.

## 7. Mesh audit of the generated city geometry (`node tools/mesh_audit/cityBuildings.mjs <T> [--roofs]`)

The procedural city already has thousands of blocking items (pre-existing). With the kit's parapets, I6 / H2:

| tile, group | before | with the kit |
|---|---|---|
| I6 walls+roofs | 3 056 | 3 096 |
| I6 details+walls | 2 461 | 2 657 |
| I6 details+roofs | 3 569 | 3 860 |
| H2 walls+roofs / details+walls / details+roofs | 1 944 / 1 933 / 1 962 | 1 990 / 2 122 / 2 404 |

`tools/roofs/classify.mjs` attributes ALL the new coplanar / crossing / depth items to parapet ends (corners where a
parapet meets a small UrbIS notch, a neighbour's parapet of another height, or the end cap of an eaves board); new
"leak" items include the parapet inner face sunk 2 cm under the roof (the audit's viewpoint lands under the roof) and
ridge-beam ends the old box chimneys used to cover (the kit stacks cover them in the city, but they are not in this
audit). Down from +1 688 (first version) to ~+200 per group by: one parapet spec per building, 12-16 mm end set-backs,
30 cm clear of slopes / rising walls at the ends, no parapet where the building's own wall goes on up, near-flat mitres.

## 8. Switches

- `?roofs=old`: everything as before (worker: no roof collector, old box chimneys; shaders: old flat roofs). Default on.
- Debug: `debug/roofShots.js` (`view("stjob_air")` ...: the comparison cameras), `debug/roofsFlight.js` (air / street pop
  check), `window.__roofs.report()` (instances per pool and LOD, kit triangles, stream stats),
  `tools/roofs/cityCounts.mjs`, `tools/roofs/roofStats.py`, `tools/roofs/probe.mjs` / `classify.mjs` (audit triage),
  `tools/roofs/ll.py` (city x, z -> lat, lon to look a place up).

## 9. Left to do / weak spots (honest)

- **Which roof has solar is random** (14 % of pitched houses, 22 % of blocks): Brussels Environment's solar map / the
  2021 orthophoto could say where PV really is; not done. Same for AC units and dishes.
- **Dormers on back slopes and villas** (the real Fort-Jaco villas have more dormers than roof windows): only the façade
  kit's street-front dormers exist.
- **TV aerials** on chimneys, chimney breasts on gables (the stacks sit on the roof only), lead flashing modelled as a
  shader band (not stepped flashing geometry), no snow / moss on the kit.
- Rooftop boxes on long blocks (Calevoet's Engelandstraat block has many more than our density).
- ~+200 blocking audit items per tile group at parapet ends (above): small (mm-cm) corner details, not seen in the
  screenshots, but not clean.
- GPU cost measured on a RED machine only (+0.1-0.4 ms on 9 tiles); re-measure on a quiet machine.
- The far "lite" tiles have no kit (they show the same bare solids as before, beyond ~500 m).
- Found on the way, NOT fixed (other agent's file): **the gardens kit's vertex AO bake has the same bug this kit had**
  (`tools/blender/gardenKit.py bake_vertex_ao`: all pieces sit at the origin and occlude each other: rail_spear_lod0
  iron_paint mean AO 0.001), so the city's railings are drawn ~30 % of their intended brightness. The fix is the two
  lines in `roofTopKit.py bake_vertex_ao` (hide every other piece from the render during each bake).
