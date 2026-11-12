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
   drawn surface`), `stuck on nothing drawn` (no progress for 4 s with nothing drawn within 0.6 m; stopped against a
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
