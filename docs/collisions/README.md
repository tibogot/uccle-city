# Collisions and joins audit (2026-11-13, branch `claude/audit-collide`)

The owner's two rules:
- COLLISIONS: "anything that needs collision works as it should": in drive, walk and third person every solid thing
  collides and nothing invisible blocks.
- JOINS: wherever a scripted model meets generated ground (bridges, landmarks, yards, plazas, road ends, kerbs, pond
  banks, rails) the two are welded or closed by a skirt / kerb / wall; never an open floating edge or a gap you see.

## How to run the checks

| what | how |
|---|---|
| collision test of a loaded tile | `await viewer.collisionTest("E4")` (viewer/drive/collisionTest.js) |
| all 120 tiles | open `viewer/index.html?tile=E4&ring=0&far=0&char=capsule&falcons=0`, then the loop in `docs/collisions/runall.js` (streams each tile in with the render loop paused, keeps the results in `window.__runAll`) |
| contact (JOINS) check of a landmark / bridge | `await viewer.contactAudit("bridge-verrewinkel")` (viewer/contactAudit.js -> tools/mesh_audit/contact.js) |
| contact check of a tile's roads against its terrain | `await viewer.contactAudit("roads:F7")` |
| the old per-collider audit | `viewer.auditColliders()` (viewer/drive/colliderAudit.js, docs/CITY_TREES.md section 3) |
| debug views | drive: key G / `?drivedebug=1`; third person and walk: key G / `?chardebug=1` |

### The collision test (viewer/drive/collisionTest.js)
1. TRUTH = what the city draws, rasterised on a 0.25 m plan grid in two height bands over the ground (car: 0.30-1.30 m
   over the drive surface; person: 0.45-1.80 m over the walking surface): building walls and details, the facade kit,
   every landmark's and bridge's LOD0, street furniture, tram poles and shelters, rail masts and platforms, the drawn
   trees / lamps / bollards (their placed points) and the parked cars (their boxes). Leaves, wires, lights, cloth,
   ground meshes and everything above the band are not solid.
2. STATIC, every cell of the tile: the car colliders rasterised the same way; `invisible` = a collider edge with
   nothing drawn within 0.5 m (kerb islands are left to colliderAudit.js: they are under the band); `missing` = a drawn
   solid with no collider within 0.4 m (the car drives through it).
3. ROUTES with the real physics: the car (stepCar + the drive colliders) along the right lane of every road of the
   tile, both directions, pure pursuit at <= 9 m/s; the walking body (the CharacterController of walk / third person
   in the city collision world) along both sidewalks of every road. Reported: hits on things with no drawn object
   within 0.6 m (`invisible hit`), the body over drawn solid cells (`passed through`), the body's height against the
   DRAWN surface under it (0.5 m raster of the terrain / road / deck / landmark meshes, two layers: `under` / `over the
   drawn surface`, 0.3 m for the car, 0.4 m on foot: a kerb in the 0.5 m cell), `stuck on nothing drawn` (no progress for 4 s with nothing drawn within 0.6 m; stopped against a
   drawn object or a kerb island = the autopilot's line, counted as `blocked`, not a defect).

### The contact check (tools/mesh_audit/contact.js)
Candidate edges: open edges (one triangle) and bottom rims (a face looking down meeting a side face) of the model,
sampled every 10 cm. A sample is fine when another surface is within 2 cm (welded / resting), when it is under the
ground, inside the model (6 axis rays meet back faces) or boxed in. Otherwise:
- `floating` (blocking): the first thing under it is the ground, 2 cm < gap <= 0.3 m, and the gap is visible (its
  middle is not inside the model): a plinth, a skirt, a slab edge hovering;
- `overhang` (blocking): an open edge of a level face (a slab, a deck, a tread) with nothing within 0.3 m under it, at
  street level (ground within 1 m round it): the owner's Verrewinkel spot;
- `opening` (info): a 0.3-1.5 m gap over the ground (an arch over a bank, a bench): usually design.
Thin rails (a down face narrower than 12 cm) and steep seams are skipped.

## Results
(filled in below by the runs)

## What was wrong and what changed (causes, files)

| # | defect (what the tests found) | cause | fix |
|---|---|---|---|
| 1 | the car drove through every parked car (17.8k drawn car cells with no collider), bench, bike rack, shelter, signal, stop pole, tram pole, rail mast | the drive colliders had buildings, kerb islands, trunks, lamps and bollards only | `viewer/drive/driveMode.js featureColliders`: parked cars (their boxes), signals / stop poles / tram poles / masts (posts), benches / racks / shelters sliced at car height; `colliders.js extendColliders` |
| 2 | buildings: 1,025 collider edges with no wall drawn within 0.5 m (arcades and recessed ground floors under an upper storey, porches), 886 drawn wall clusters outside every collider | the colliders were the UrbIS 2D footprints, the city draws the 3D solids | `colliders.js buildingBlocks`: the drawn walls sampled at car height (0.30-1.30 m over the lowest drive surface within 1 m), filled, traced per 8 m chunk |
| 3 | landmarks and bridges: their footprints blocked where they have porches / recesses and missed steps, yard walls, fences, gates, parapets (150 hero + 37 bridge clusters) | hand-made: the replaced UrbIS footprint + two hand-drawn rings (Saint-Job steps, Verrewinkel parapets) | `viewer/heroColliders.js`: every landmark / bridge collides by its LOD0 (car blocks sliced at car height; the character gets the LOD0 triangles in a BVH: steps climbed, parapets and railings stop, decks carry); the replaced UrbIS solids leave every collider set (`tileData.js`, `colliderWorker.js`) |
| 4 | walk mode (first person) collided with nothing | it glided on `walkY` | `viewer/main.js Walker`: the third-person capsule controller in ONE shared city collision world (`viewer/character/cityHook.js cityCollision`), the camera at its eyes |
| 5 | cars under a road deck floated 2.55 m in the air or rose onto the deck (Ring overpasses, D10 / E10) | the drive surface was ONE Uint8 layer in cm, clamped at 2.55 m | `colliders.js driveGround / driveHeight`: two layers (top + the street under it), Uint16, each corner takes the layer nearest the car |
| 6 | the car climbed any step of the drive surface (road walls 0.6-1 m, raised roads, platform edges) | no step limit | `viewer/drive/carEnv.js ledgeContact`: no climbing a step over 0.5 m (kerbs 15-25 cm are ridden up); rail platforms (0.76 m) are car walls |
| 7 | the car drove on the Wolvendael pond's bed as on dry land | the bed is the carved terrain | `carEnv.js`: the water drags the car by its depth (half a metre stops it, it can back out); no wall at the shore |
| 8 | Verrewinkel SE: the approach's slab stood over a black gap beside the abutment, the street 0.4-0.7 m under the deck at both ends | deck tongues past the ends were single planes with open edges; the DTM at the bridge ends is the cutting's slope and the road engine sampled it | `tools/blender/roadBridge.py`: concrete skirts under the tongues' free edges, landing seats under the footbridge's ends, the SE apron dropped; `viewer/rail/railData.js abutmentFill`: the ground at the ends raised to the decks BEFORE the roads are built (the street follows) |
| 9 | police yard: the hedge floated 0.15-0.28 m over the street | its foot was taken at one side only, 15 cm deep | `tools/blender/police_rouge.py`: sunk 0.45 m under its lower side |

A/B: `?colfix=0` puts the old colliders back (no feature colliders, footprints, hand-made statics, no ledge rule, walk
mode without collision).

## Results: 120 tiles, before (`?colfix=0`) / after
Raw: `run_before.json`, `run_after.json`, per tile `per_tile.csv` (column suffix .0 = before, .1 = after), kinds `kinds.txt`.

| check | before | after |
|---|---|---|
| static: collider edges with nothing drawn (invisible) | 1,085 | 254 |
| static: drawn solids with no collider (missing) | 21,016 | 512 |
| drive: invisible hits | 4 | 107 (70 = steps over 0.5 m the car now refuses to climb where nothing is drawn: road joins, `road_ledges.txt`) |
| drive: passed through drawn solids | 32,041 | **0** |
| drive: under / over the drawn surface | 76 / 62 | 65 / 30 |
| drive: stuck on nothing drawn | 28 | 78 (same steps) |
| on foot: invisible hits | 461 * | 204 |
| on foot: passed through | 119 * | 110 |
| on foot: under / over the drawn surface | 297 / 225 * | 106 / 228 |
| on foot: stuck on nothing drawn | 205 * | 47 |

\* the "before" on-foot column is the OLD third-person world (walk mode itself collided with nothing) and was measured
before the last two test changes (start on the highest surface, a drawn bank is not an invisible wall), so it is not
strictly comparable; the drive and static columns use identical test code.

## Known limits / next
- The JOINS check ran on the bridges and the E4 landmarks only (Verrewinkel 16 -> 12 blocking; E4 before:
  `joins/heroes_E4_before.json`); not yet re-run after the police fix, nor on Saint-Job / Calevoet bridges, Observatory,
  Van Buuren, Calevoet station, Stalle; the roads-vs-terrain run (`roadsrun.js`) not run.
- Remaining drive "invisible" = steps of the drive surface over 0.5 m with no drawn wall: road / terrain join defects
  (roads agent, list `road_ledges.txt`). Remaining static: rail-platform edges (`invisible wall` 147: the band test
  under-counts platform sides), trees on tile edges (53, test artefact), small facade details.
- On foot: raised roads floating ~1.4 m over the terrain (e.g. D10 Rue de la Brasserie / Vieux Chemin, (-1265, 2663)),
  sidewalks standing 0.4 m proud of the lawn (G10 Avenue Buysdelle (148, 2677)): road joins, roads agent.
- The character still wades onto the pond bed (only the car is dragged).
- No before/after collider debug images yet (only the Verrewinkel joins images, `joins/`).

## Drive fix (2026-11-14)
Root causes of the city-wide drive audit, the fixes and the before / after numbers: `DRIVE_FIX.md`.
