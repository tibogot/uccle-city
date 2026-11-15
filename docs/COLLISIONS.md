# Collisions round 2 (branch `claude/collide2`, 2026-11-15)

The owner's playtest (docs/TODO.md, 2026-11-14): "collisions feel off in general; the falcon should also show its
collisions with G; the falcon gameplay feels weird"; the motorbike leftovers (docs/MOTO.md: "the bike hit a traffic box
where no car was drawn on Avenue De Fré", "traffic sees the bike as 2 small circles and makes no room"); after perf
pass 2 (multi-draw kits, the city-wide tree pool): do the colliders still come from what is drawn? And item (11): test
the owner's robot character (claude/character2) in the city. Round 1 (the method, the collision test, the earlier
fixes): `docs/collisions/README.md`, `DRIVE_FIX.md`, `ROAD_FIX2.md`, `ROAD_FIX3.md`.

Every change has an A/B switch (viewer/features.js, dev panel "A/B: old versions" > "Collisions"):

| switch | old behaviour |
|---|---|
| `?carhit=old` | car / motorbike wall response before this round |
| `?trafficbox=old` | traffic collider boxes at the sim's newest step, solid before the fleet can draw them, no height band |
| `?bikeroom=old` | the motorbike = two 0.55 m circles for the traffic, no room made |
| `?falconhit=old` | falcon contact response before this round |
| `?falcontrim=old` | falcon pure flight-path hold hands-off |
| `?edgecol=old` | a tile's furniture / garden pieces over its edge made no collider |
| `?furnheight=old` | furniture / garden colliders infinitely tall |
| `?propcol=0` | street props (bpost boxes, chutes, Morris columns...) not solid |

## 1. Drawn vs collider: the audit

### A new, independent check (`debug/drawnAudit.js`)
The round-1 collision test (`viewer/drive/collisionTest.js`) takes the kits' never-drawn stand-in meshes
(`furniture-*`) as its TRUTH, and the colliders are made from the same meshes: a kit whose stand-ins and drawn pools
disagree could never show up. `drawnAudit.js` takes the truth from the DRAW side: every streamed kit's source instances
(viewer/instanceStream.js Streamers: furniture2, stops, street kit, gardens, street life + shops, and the city-wide
tree pool) with the piece's LOD0 box, the drawn instanced meshes of the features group, the parked cars the fleet draws,
the petrol stations' merged LOD0 (rasterised in 0.5 m cells), the placed lamps / bollards; and the moving traffic
(`trafficGhosts`: each traffic box against the car the fleet drew). Per piece crossing the car band (0.30-1.30 m over
the drive surface): `missing` = no car collider overlaps it; per car collider (furniture / tree / lamp / post / car):
`ghost` = nothing drawn within 0.5 m.

    const A = await import("/debug/drawnAudit.js"); A.audit(["I6", "H5"]);          // loaded tiles
    const R = await import("/debug/drawnAuditRun.js"); R.start(["G6", "F5", ...]);  // camera tile to tile

Run on 21 tiles (I6 + ring, G6 F5 E4 D6 F7 E8 G2 C5 K5 G9 H3 D9, the F4 ring):

| finding | count | verdict / fix |
|---|---|---|
| the multi-draw kits (perf pass 2) | 0 missing, 0 ghost on 21 tiles | the stand-ins are made from the same instance lists the pools draw: still right |
| the city-wide tree pool | 0 missing, 0 ghost (18,101 drawn trunks on the I6 ring) | right |
| parked cars | 0 / 0 (debug/parkedCheck.js too, 8 tiles) | right (round 3 fix holds) |
| street-life props: bpost postboxes, container chutes (+ Morris columns, pumps, bubbles, poles, posts, docks when drawn) | 1-5 a tile, drawn with NO collider | FIXED: `furniture-streetprop` stand-ins (viewer/streetlife/streetlife.js, the prop's LOD1 at the drawn matrices; car "box", walker "post"); `?propcol=0` |
| petrol station (F5, Lukoil Dieweg) | 66 "ghost" furniture colliders | test artefact (the station's merged LOD0 was not in the truth): with it, 0 ghost; 3 cells of the pump islands at 0.32-0.38 m stay "missing" (rideable kerb height) |
| rail sleepers | 16-107 a tile | test artefact (under the rail top, ridden over; the line is fenced) |
| garden gates (`gate_spear`, `cargate_spear`) | 1-4 a tile | the OPEN gates (drawn open, deliberately walkable: GARDENS.md) |
| moving traffic boxes vs drawn cars | old: up to 0.21 m off at town speed (one 20 Hz step ahead, more at speed); new: 0.00 m (443 box samples) | FIXED, below |

### The round-1 test on 8 tiles, before (all switches old) / after
`debug/cityAudit.js` (`walk: false`), tiles F4 E4 F5 I6 D6 G2 H3 C5. Raw: `docs/collide2/audit8_before.json`,
`audit8_after.json` (the after run predates the furnheight fix; H3's 2 invisible hits are 0 with it, measured).

| tile | static invisible | static missing | missing m2 | drive contacts | invisible hits | passed through | stuck |
|---|---|---|---|---|---|---|---|
| G2 | 4 -> 4 | 25 -> 8 | 60.8 -> 19 | 25 -> 25 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| H3 | 2 -> 14 | 48 -> 36 | 86.3 -> 67.3 | 51 -> 52 | 0 -> 2 (0 with furnheight) | 0 -> 0 | 0 -> 0 |
| E4 | 15 -> 18 | 34 -> 26 | 78.2 -> 36.1 | 102 -> 103 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| F4 | 3 -> 3 | 40 -> 6 | 130 -> 2.2 | 44 -> 46 | 0 -> 0 | 6 -> 0 | 0 -> 0 |
| F5 | 3 -> 7 | 26 -> 8 | 74.6 -> 20.5 | 30 -> 31 | 0 -> 0 | 2 -> 2 | 0 -> 0 |
| C5 | 34 -> 39 | 96 -> 68 | 181.6 -> 58.7 | 55 -> 56 | 0 -> 0 | 5 -> 2 | 0 -> 0 |
| D6 | 41 -> 42 | 29 -> 23 | 71.1 -> 52.7 | 79 -> 79 | 1 -> 1 | 0 -> 0 | 1 -> 1 |
| I6 | 13 -> 18 | 46 -> 29 | 88.4 -> 43.1 | 75 -> 75 | 0 -> 0 | 0 -> 0 | 0 -> 0 |
| **total** | 115 -> 145 | **344 -> 204** | **771 -> 300** | 461 -> 467 | 1 -> 3 (1) | **13 -> 4** | 1 -> 1 |

- **Missing (drawn, not solid) -61 % of the area, passed-through 13 -> 4.** The cause found on F4 (40 missing, 130 m2;
  6 drive routes through drawn walls): **tile-edge pieces**. The kits give each tile the pieces of its own data file, and
  some stand a little over the tile's edge (garden walls along a boundary street, up to ~25 m in); `featureColliders`
  (viewer/drive/driveMode.js) and the walker (viewer/character/cityHook.js) dropped every instance whose origin was
  outside the tile's bounds, and no neighbour made them either: drawn, driven / walked through. Now a tile's own features
  group is taken to 40 m past its bounds (each group is one tile's: nothing counted twice); `?edgecol=old`.
- **Static "invisible" +30**: the test rasterises colliders without heights; the edge pieces now in include garden walls /
  hedges on banks 3-4 m over the street (H3 (935, -977): hedges at +3.5 m over the drive surface). They are not in the
  car band, so the truth says "nothing drawn". With `furnheight` they no longer stop a car under / beside them (below),
  so this is a test artefact; the route test (real physics) has H3 / H4 / G3: 0 invisible hits, 0 passed through.
- **Furniture colliders carry their drawn base / top** (`colliders.js heightClear`, round 1 did this for walls only):
  a garden wall on a bank over the street, a bench on a bridge deck over a road, no longer an infinitely tall invisible
  wall for the car under / beside it; `?furnheight=old`.

Left (real): the C5 / F5 2 passes each (small furniture at a route's line, not looked at one by one), D6's one
invisible hit + stuck (a road ledge, round 1 list), the open gates' leaves are not solid (thin, drawn open).

### The G views
- drive / motorbike: G (`?drivedebug=1`): every collider of the tiles round the car (unchanged).
- falcon: G (`?falcondebug=1`, falconDebug.js, made in road fix round 3): the floor lattice coloured by source (ground,
  drawn roof, church / landmark proxy, deck, tree), ceilings, crown ellipsoids, the bird's sphere red after a contact
  with its normal. Checked working: `docs/collide2/falcon_g_view_I6.jpg`.
- walk / third person: G (`?chardebug=1`).

## 2. Traffic vs the motorbike (viewer/traffic/)

- **The ghost box on Avenue De Fré.** Two causes, both fixed (`?trafficbox=old`):
  1. `T.boxesNear` answered the sim's newest 20 Hz step while the fleet DRAWS the pose interpolated between the last two
     steps: up to a step (0.7 m at 50 km/h) ahead of the drawn car. Now the box is the drawn pose (same alpha, same yaw
     blend): measured 0.00 m vs the drawn instances (old: up to 0.21 m at the measured town speeds).
  2. The sim runs before the traffic fleet's models are loaded (`fleet.ready`): its cars were solid and invisible for
     the first seconds of a session (a `?view=moto` start lands in exactly that window). No boxes before the fleet draws.
  Also: a traffic car on a deck over the street / on the street under a deck is out of the vehicle's height band (no
  plan-only hit across levels).
- **The bike as a narrow obstacle** (`trafficSim.js addBoxObstacle`): an oriented 0.84 x 2.16 m box. Per lane it blocks
  when, measured across that lane, it comes within a car's half width (0.95 m) + 0.3 m of the lane line, over its extent
  along the lane (a bike crossing a lane blocks 2.16 m of it, one riding along it 0.84 m of the width). Before: two
  0.55 m circles + a 1.15 m lateral margin.
- **Room for filtering** (`trafficSim.js makeRoom`): a slow car (< 7 m/s: a queue, a jam) with the motorbike beside it
  or coming up from behind (0.9-3.2 m to one side, up to 12 m behind) eases up to 0.45 m away from it at 0.5 m/s, and
  back at 0.35 m/s when it has gone (no jump; the drawn car, its box and its lights follow). Measured: a stopped car with
  the bike 1.6 m to its left: 0 -> -0.45 m in 1.5 s (`docs/collide2/bike_beside_queue.jpg`). `?bikeroom=old` = both off.

## 3. The falcon (viewer/falconFlight/flightModel.js)

What felt weird, found by reading the contact code and by flying it hands-off in the city:

| problem | cause | change |
|---|---|---|
| any touch of a façade stopped the bird dead and (above 6 m/s) STUNNED it, whatever the angle: a 20 deg graze at 18 m/s = stunned, 9.5 m/s left | every wall normal was "against the motion" (`-d / |d|`): the whole speed counted as the impact | the REAL wall normal: the solid round the hit point at the bird's height (8 directions at 0.7 / 1.5 m, column(x, z, y) floor + ceiling), averaged; fallback as before when the solid is too thin (`?falconhit=old`) |
| skimming a roof bled 20 % of the speed every 8 ms substep, a façade 45 % | fixed tangential factors (x0.8 floor, x0.55 wall) per contact | Coulomb scrape: the tangential speed loses mu x the normal speed (0.3 roof, 0.35 wall), a sliding body's friction; restitution 0.1 for a graze, 0.3 for a real hit; a 0.6 m/s push off a wall (was 2.5 m/s + 1.5 m/s up) |
| the bird PERCHED by itself whenever it touched a roof gently under 13 m/s (gliding onto a roof at 12 or 16 m/s = "touched down") | touch-down rule: level, < 4.5 m/s into it, speed < 13 | a touch-down needs a landing: < 3.5 m/s into it and speed < 7 m/s, or flaring (Q) under 10 m/s; otherwise it skims on |
| hands-off after the nest launch it flew on at -11 deg straight into the roofs ("hit the ground at 11 m/s: stunned" within seconds) | neutral pitch held ANY path angle forever | path trim: hands off (no pitch input, not tucked, not flapping) the path relaxes to the wing's own glide angle (spread -3.9 deg at L/D 14.5, half folded -7.5 deg), time constant ~1 s; the tuck keeps its dive, a turn keeps its bank (`?falcontrim=old`). City: the launch now levels to -4 deg in ~2 s and glides 10 s before the first crown in its path |

Node checks: `node tools/collide/falconWallTest.mjs [old]` (façade at 10-90 deg, roof skims), `node
tools/falconFlightTest.mjs` (the lab's model numbers: unchanged except the hands-off glide now settles at -4.0 deg,
13 m/s, the best glide).

| into a façade at 18 m/s | old | new |
|---|---|---|
| 20 deg | stunned, 9.5 m/s left | slides on, 14 m/s |
| 35 deg | stunned, 8.6 | stunned (10.3 m/s into it: a real hit), 9.2 |
| 60 / 90 deg | stunned, 8.2 / 8.5 | stunned, 6.5 / 6.1 |
| gliding onto a roof at 12 / 16 m/s | perched / perched | skims on at 10.1 / 15 m/s |

Against real peregrine flight (docs/FALCON_FLIGHT_RESEARCH.md + Mills, Hildenbrandt, Taylor et al. on peregrine attack
simulations and guidance: roll acceleration matters, turn rate tied to the line-of-sight rate): the model's numbers
(cruise trim 13 m/s, flapping level max ~22 m/s, stoop 80-100 m/s, 7 g pull-out) are in the published ranges; what was
off was the contact and the hands-off behaviour above, not the aerodynamics. Not changed (noted): the roll rate (2.4
rad/s spread) is on the slow side for a raptor; the drawn bird is 2 m span ("readable") in the air while its collision
sphere is 0.35 m (the wings can pass through a crown's edge visually; near roofs it shrinks to life size).

## 4. Feel: car, motorbike, character

**Car / motorbike** (`viewer/drive/carPhysics.js hitSlide`, used by the bike under its crash speed; `?carhit=old`).
Before: each contact with more than 0.5 m/s into the wall bounced / yawed the car again EVERY 120 Hz substep while the
forward speed kept pushing it in: a car scraping a wall stuttered (36-224 contacts in 3 s), lost speed in steps, and a
60 deg hit stopped it dead. Now collide-and-slide with a rigid-body impulse at the corner that hit (Hecker, "Collision
Response"; Unity / Godot slide): the corner's velocity into the wall (incl. the yaw rate) is removed with a small
restitution for mostly head-on hits, a Coulomb scrape along it (mu 0.35, linear only: the scrape's torque screwed a car
pushed along a wall into it), the normal impulse turns the car parallel to the wall, the body kicks come once per
impact. `node tools/collide/wallTest.mjs` (a wall, full throttle, no steering, 3 s):

| angle at 15 m/s | old: speed kept, contacts | new |
|---|---|---|
| 5 deg | 21.9 m/s, 38 | 22.9, 10 |
| 15 deg | 20.2, 36 | 22.2, 23 |
| 30 deg | 17.0, 224 | 20.6, 32 |
| 60 deg | 0.3 (stopped dead), 179 | 11.6 (swung parallel), 153 |
| 90 deg (head-on) | 0, bounce 1.4 m/s | same |

No launches (the heave kick is capped at 1.0 m/s, once per impact), no tunnelling (0 frames inside the wall in every
case), kerbs as before (ridden up to 0.5 m, carEnv.js ledge rule). The moto physics test (`tools/moto/physicsTest.mjs`)
is unchanged.

**Character on foot** (viewer/character/controller.js, unchanged): already a collide-and-slide capsule with step-up
(0.25 m), ground snap and a slope limit; the walker now also gets the tile-edge pieces and the street props.

## 5. The owner's robot character (claude/character2), TEST ONLY

Tested in a throwaway worktree (`claude/character2` at fdf7ca65 + a local merge of `claude/foundation` 4d23ca56, two
trivial conflicts: .gitignore, labs/frameStrip.js), served on 8894, the Y Bot's git-ignored GLBs copied from the
character2 worktree. Nothing was committed to or pushed on claude/character2; the worktree is removed. Scripted runs
through `tp.autopilot` (the branch's own hook), at the Square des Héros (E4).

| test | result |
|---|---|
| loads in the city (`?view=third`, default `?char=ybot`) | yes: Y Bot, one material, 60 fps at street level, character CPU 0.26-0.50 ms (anim + foot IK 0.16-0.30) |
| flat walk / run | walk 1.73 m/s, run 4.51 m/s (the clips' speeds); walk start clip then move |
| stairs up (Héros memorial steps, hero BVH) | climbs at the stair clip's cadence (0.72 m/s walking), +1.35-1.7 m, no stuck, per-frame hip jump <= 3.3 cm (walk), 16 cm (run) (`robot_heros_stairs_up.jpg`) |
| stairs down | descends at ~0.92 m/s walking, run down works; per-frame jump <= 5 cm (walk), 10.5 cm (run) |
| kerbs | road -> sidewalk at a run: up without a stop |
| slope (a 22 deg lawn bank near Rue Rouge) | up +1.9 m in 5 s and down: feet on the slope, knees bent going down (`robot_slope_22deg_down.jpg`); camera clips into a trunk beside the path |
| collisions | stops at tree trunks and parked cars, slides past |
| transitions | walk start -> move -> walk stop -> idle clean; 90 deg turn: turn clip plays |
| **BREAKS: stuck crouch after a hit at a run** | running into a tree (and once into a parked car) leaves the body frozen in a deep crouch while the graph says `idle` (idle clip weight 1, IK weight 0) for 12+ s, until the next walk start: `robot_stuck_crouch_after_tree_hit.jpg`, `..._after_car_hit.jpg`, recovered after walking: `robot_recovered_after_walk.jpg`. Likely the run -> stop hand-over when the speed collapses in one frame (no stop clip for a run at ~0 speed) leaving the pelvis / legs at the last pose; for the other chat to look at |
| foot IK measured here | not reliably (the bone-height probe read 0.57 m over the ground: a units / skinning frame issue in my probe); the branch's own lab numbers stand (docs/character/) |

**Swapping the character: yes, already built in.** `viewer/character/characterModel.js CHARACTERS` is a registry:
`?char=ybot | hoodie | casual | capsule`, and at runtime `__third.tp.useCharacter("hoodie", renderer)` swapped the Y Bot
for the Quaternius Hoodie in ~1 s with the walk working (`robot_swapped_to_hoodie.jpg`). Another character:
- on the **Mixamo skeleton** (any Mixamo-rigged model): add `{ file, clips, meta, system: "loco" }`; the same 13 clips and
  `ybot.json` metadata apply as they are (one skeleton, nothing retargeted);
- on **another rig**: `tools/characters/retarget.mjs` (bone maps for Quaternius / UAL / Mixamo) makes its clips, then the
  metadata with `tools/characters/mixamoClips.mjs`;
- licence: Mixamo assets stay local (git-ignored, Adobe terms); a shipped character needs a CC0 / own model.

## Shared files touched

viewer/drive/carPhysics.js, viewer/drive/driveMode.js, viewer/drive/colliders.js, viewer/moto/motoPhysics.js,
viewer/traffic/traffic.js, viewer/traffic/cityTraffic.js, viewer/traffic/trafficSim.js,
viewer/falconFlight/flightModel.js, viewer/streetlife/streetlife.js, viewer/character/cityHook.js, viewer/features.js.
New: debug/drawnAudit.js, debug/drawnAuditRun.js, tools/collide/wallTest.mjs, tools/collide/falconWallTest.mjs,
docs/COLLISIONS.md, docs/collide2/. The tile worker bundle is not affected (none of these is bundled).

## Weak spots / next

- The static collision test ignores collider heights (round-1 design): garden pieces on banks show as "invisible".
  Teach `colliderCells` the base / top.
- The falcon's wall normal needs the solid within 1.5 m; a thin solid (a spire, a narrow chimney) keeps the old
  against-the-motion normal.
- Room for filtering is a fixed 0.45 m: the sim has no lane width, so on a very narrow lane a car can shift onto the
  lane line / toward parked cars.
- The traffic cars are immovable for the player (no impulse given to them), as before.
- Not measured on a GREEN preflight: CPU of makeRoom (one pass over the live cars per 20 Hz step, only while riding the
  bike) and of the streetprop stand-ins (a few instances a tile; the colliders are made once per tile landing).
