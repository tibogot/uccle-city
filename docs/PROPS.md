# Physics props (branch claude/props, 2026-11-19, rule physics-props)

Owner playtest 2026-11-18 (docs/TODO.md CLASS P): "we should have more objects we could hit with the car: the parked
motorbikes and other things". Until now only the cars were two-way (docs/CARHIT.md): every bin, sign post, bollard,
parked motorbike / scooter, Villo bike and café terrace was a static wall (a 1.4 t car at 50 km/h stopped dead by an
18 kg bin), and the police accident job's cones had no collider at all (the car drove through them).

| URL | what you get |
|---|---|
| (default) | the props: viewer/props/propWorld.js (physics) + viewer/props/cityProps.js (the city's glue) |
| `?props=old` | the street furniture as static walls, the cones without a collider, as before (row in `viewer/features.js`, A/B > Collisions) |

Automated check: `node tools/propsTest.mjs` (rule physics-props, gate row `props` in `tools/audit/mergeGate.mjs`; `--old` = `?props=old`
fails it). The city glue alone on real three.js: `node --import ./tools/christmas/hook.mjs tools/props/glueSmoke.mjs`
(run by the gate row too). Inventory: `node --import ./tools/road_audit/register.mjs tools/props/inventory.mjs --all`.

## 1. The classes and how many (120 tiles; per tile: docs/props/inventory.md)

| class | behaviour | from | kg | city | busiest tiles |
|---|---|---|---|---|---|
| bin (`bin_round`) | light: flies, tumbles, rolls | furniture2 (data/furniture) | 18 | 139 | F4 9, F5 9, D6 8 |
| bin_column | light | furniture2 | 24 | 274 | H3 10, J7 10, H5 9 |
| cone | light | the police accident job (viewer/police/props.js) | 3.5 | 8 per accident (none in the data) | - |
| chair | light | café terraces (street life + shopfront kit layout) | 5 | 250 | I6 30, E4 26, F1 26 |
| table (+ its chairs) | light; a hit wakes the chairs within 0.9 m | café terraces | 14 | 118 | I6 14, E4 13, F1 13 |
| Villo bike | light: topples out of its dock | street kit (data/streetkit) | 23 | 256 | J5 35, E4 25, B5 20 |
| parked motorbike | heavy: tips over, slides | moto/cityTwoWheelers.js (kerbside slots) | 190 | 438 | H1 21, F1 20, I1 20 |
| parked scooter | heavy | moto/cityTwoWheelers.js | 120 | 536 | G1 32, I1 30, E4 25 |
| sign post (+ its plates) | post: bends, snaps above 9 m/s (32 km/h) | street kit | 16 + 2.5 a plate | 1,766 posts, 1,804 plates | E4 70, F1 53, E1 52 |
| bollard | post: bends hard, snaps above 11 m/s (40 km/h) | UrbIS bollards (streetFit.js) | 38 | 3,706 | E1 378, D1 321, I1 258 |

**Solid, on purpose** (no `prop` on their collider; real ones stop a car): lamps, trees, walls, buildings, Villo docks and
totems, benches, bike hoops / boxes, glass banks, shelters, the street-name plate posts (their plates and text are the
street life's own boxes: they would stay hanging in the air), parasols and planters of the terraces, the bpost boxes.

**Parked two-wheelers** already existed (motorbike round 2: ~1 parking slot in 6 within 30 m of a shop / café, 1 in 40
elsewhere, 2-3 bikes a slot, 974 in the city). The task's OSM `amenity=motorcycle_parking` is not in our extracts
(data/raw/osm has no such tag): no new population was added.

**Not in the data** (so not in the city): roadworks barriers, sandwich boards, wheelie bins, private parked bicycles.
docs/TODO.md "physics props for all games" keeps the roadworks kit / street movables for later; any new piece becomes a
prop by one `cityProps.make` call where its layer places it (section 4).

## 2. How it works (viewer/props/propWorld.js, `PropWorld`, one on the Driver)

- **At rest** a prop is its layer's instance + its static drive collider; nothing runs. The collider's `ref` carries the
  prop (`ref.prop`): driveMode.js `featureColliders` takes the stand-ins' `userData.refs`, the bollards' circles take
  `drawn.bollards[i].ref` (colliders.js: circles may carry refs now, `col.cref`, skipped by `gather` while hidden, as the
  polygons' `pref`; main-thread functions only, the worker bundle is unchanged).
- **Wake.** carEnv.js `collide` hands a contact with a prop's collider to `props.touch()` (the car and the two-wheelers).
  Light / heavy: closing over 0.25 m/s, it becomes a body in one of **24 slots** (full: the slowest one lying on the
  ground goes to sleep where it is), its collider off, its instance hidden (section 3). A body flying into another
  prop's collider at over 0.8 m/s wakes that one (a chain); a terrace table wakes its chairs.
- **Body.** A box from the drawn geometry (the members' boxes, so a torn-out bin keeps its foot: the kits' feet run
  0.3 m into the ground and rise out as it is ripped up, position correction capped at 1.5 cm a substep), the class's
  mass, box inertia (x0.85 for cylinders), a quaternion, linear + angular velocity; air drag 1/2 rho A / m (a cone or a
  chair slows in the air, a motorbike hardly). Contact POINTS per shape: box corners (+ the long edges' middles), a
  cylinder's two rims (8 each: a bin rolls), a cone's square base plate + rim + tip, a two-wheeler's tyres on its centre
  line + its side stand (the side its model leans to; a scooter its centre stand) + bar ends, pegs, mirrors, saddle, tyre
  fronts: a parked motorbike STANDS on its stand, a push tips it over and it lies on its bar end and peg.
- **Ground.** A plane per body (height + slope, three samples, re-sampled after 0.3 m): every point under it takes an
  impulse along the plane's normal (no bounce under 1 m/s closing, the class's restitution above) + Coulomb friction,
  two passes; rolling resistance while on the ground.
- **Walls.** The drive colliders gathered round each body once a frame (buildings, walls, trees, lamps, posts, kerb walls,
  the other props' colliders), tested in plan with the body's projected footprint and its height band (it flies over a
  garden wall): pushed out, an impulse at its side (restitution 0.2, friction 0.35).
- **Other bodies:** spheres (restitution 0.2).
- **The player's vehicle** (`playerStep`, every 120 Hz substep after the cars, against every awake or displaced prop
  within reach; a displaced asleep one is woken when the vehicle closes on it): plan box vs the prop's footprint, in the
  height band 0.30-1.45 m over the vehicle's wheels (a flattened sign, anything under 30 cm, is driven over). ONE impulse
  with both masses at the contact point: the prop's side facing the vehicle, at bumper height (0.42 m, clamped into the
  prop: a low hit tips a tall thing over, its top falls toward the car); the normal tilted up for a light prop (the
  bonnet scoops it up: `lift` 0.3-0.4) + friction along the bumper (spin). The vehicle keeps the reaction's plan part (its
  speed, side slip and yaw rate, carHit.js conventions; a two-wheeler only its speed along its heading): it loses speed by
  the mass ratio. Measured (tools/propsTest.mjs): a bin at 50 km/h flies 22 m (1.3 m up), the car keeps 98.6 %; a cone
  29 m, 99.7 %; a parked motorbike hit side on at 20 / 50 km/h tips over (85 / 94 deg) and slides 3 / 15 m, the car keeps
  74 / 87 %; a Villo bike at 15 km/h topples out of its dock.
- **Posts** (`touch`): under `bendV` a wall as before (a nudge). From `bendV` (signs 1.5 m/s, bollards 4 m/s): a
  PLASTIC HINGE at the foot: the post bends away from the car by the car's travel into it (angle = atan(travel / 0.5 m)),
  resisting with its yield force (signs 2.2 kN: a 60 mm tube's plastic moment at bumper height; bollards 24 kN) taken
  off the car's speed; past `flatDeg` (signs 76 deg, bollards 48 deg) it is flattened, its collider off: the car rolls
  over it. A bent post keeps its collider at the foot (push it again: it bends on). At / above `snapV` (signs 9 m/s,
  bollards 11 m/s) it SNAPS: a body (from its bent pose if bent), the break costs the car `breakJ` (420 / 2300 N s). Sign
  20 km/h: flattened, the car keeps 85 %; 50 km/h: snapped, thrown 26 m, 97 %. Bollard 20 km/h: bent 54 deg, the car
  keeps 54 %; 50 km/h: snapped, 85 %. A two-wheeler's rider: posts and parked motorbikes are walls (the bike's own crash rules, rule 40); it
  knocks the light props.
- **Settle.** Below 0.08 m/s and 0.2 rad/s on the ground for 0.45 s: asleep (14 s awake at most once down), its pose kept
  in the DISPLACED list (512): drawn there, hit again it wakes. The tile unloads (main.js dispose ->
  `cityProps.removeTile`): its props reset (the layers rebuild their pieces at rest). The displaced list full: the
  settled one farthest from the player resets.
- **The walker** (third person, `walk()` from cityProps' updater): a 75 kg body at its walking speed kicks the light
  ones (bins, cones, chairs, tables, Villo bikes) it walks into, at shin height (0.3 m); their stand-ins are not walker
  posts any more (`userData.kick`, viewer/character/cityHook.js). The bike / motorbike: through carEnv.js like the car.
- **The traffic** (cityTraffic.js obstacle source -> `cityProps.obstacles`): every displaced prop within 220 m (96 at
  most) is a box obstacle of the sim (a bent post still standing at its foot is not: as before); the cars brake and queue.
- **Events.** `driver.props.on("propHit", f)` / `cityProps.on("propHit", f)` / the game kit's `"propHit"`:
  `{ kind, impulse (N s), point { x, y, z }, speed (m/s) }` on a hit by the vehicle (> 0.5 m/s change of the prop's
  speed), a walker's kick (> 0.6 m/s), a landing or a wall hit over 2 m/s; at most one per prop per 0.15 s; an object
  only when someone listens. No audio here (the sound job, claude/sound).
- **Colliders follow the prop (rule 25, coordinator 2026-11-19: "a snapped bollard leaving an invisible post for the
  walker"):** `PropWorld.hideRef` / `syncCols` is the one place a prop's colliders change. Knocked, snapped or flattened:
  its drive collider off (the ref hidden) AND its walker items off (`ref.walk`: cityHook.js registers each prop's
  PrismSet item when the walker's tile set lands, and applies the state it is in); back at rest: both on, at their rest
  tops. Bent: both stay at its foot (the post is drawn standing there), their TOPS lowered to the leaning post's drawn
  top (cos theta: `ref.drive` = the prop's polygons in the tile's set, driveMode.js tileDrive). The gate row checks it
  after every class hit and 400 random hits ("colliders follow (rule 25)": 0 props with a collider where nothing is
  drawn; with the walker sync off it finds 404).
- **Night:** the proxies cast on the lamp maps' MOVER layer (the props group is a `lampMover`), a marker object over the
  awake bodies (`nightMover`, its radius over them) tells the lamps something moves there, and a prop leaving / rejoining
  its pool calls `__night.refreshStatic()` (new in cityNight.js: both lamp maps re-render their static casters, whose
  per-tile instance proxies copy the instance matrices at that render: the hidden instance casts nothing). So a knocked
  bollard's lamp shadow goes with it.
- **Villo docks:** a knocked Villo bike is not offered at its dock (moto/villoDocks.js `nearBike`), its dock counts as
  free; a bike the player took (ref hidden) is never a prop.

## 3. Drawing (viewer/props/cityProps.js)

- **Members.** A prop is drawn by its members: pool instances of a layer's Streamer (`{ streamer, tile, key, i }`: a
  bin, a sign post and each of its plates, a Villo bike, a parked bike, a terrace table, a chair) or a plain instanced
  mesh's instance (`{ mesh, i }`: the tile's bollards, the cones). On its first wake the prop takes the members' drawn
  matrices (the first one's is its rest frame), their per-instance columns (band + tile fade slot, variant, paint) and
  its shape from their geometry boxes.
- **Hide.** `StreamPool.patch` (viewer/instanceStream.js): the member's matrix becomes a zero scale in its SOURCE (every
  later gather keeps it hidden) and WHERE THE POOL HOLDS IT NOW (the gather logs its copied runs: source, range, slot;
  a multi-draw set's region too): ONE update range of 16 floats; a gather in flight gets it in its back arrays. A plain
  mesh: its instance, one range. Restored the same way on reset. (`buildSource` keeps `inv`: the caller's instance i ->
  its sorted slot.)
- **Proxies.** Per piece and LOD one InstancedMesh of the pool's own geometry (vertex attributes shared), material and
  per-instance columns, FIXED capacity 64, made at the layer's start (`cityProps.prepare`) and drawn for 4 real frames
  1 km under the camera (police/warm.js's way: the pipelines exist before the first knock; they share the pools' layout),
  then hidden. Each frame something moved (a body awake, a pose changed, or the camera moved 1 m: the LOD bands), the
  displaced props' members are written into the proxies of the LOD bands they are in: static buffers, `needsUpdate` +
  ONE update range over the count per attribute (never DynamicDrawUsage), a bounding sphere over them. Draw calls: one
  per piece / LOD with a displaced prop in its band (all the props of a piece share its proxies: never one per prop);
  shadows as the pool's LODs (castShadow copied). Nothing knocked: no proxy drawn, no write.
- **Motion vectors** (rule 3): the proxies are InstancePrev rows (viewer/instMotion.js, one buffer `propPrev`); the
  layers' materials are hooked once at their start, before their first compile (`cityProps.hook`: furniture2, street
  kit, parked two-wheelers, street life props + shop kit, bollards, cones); a static pool mesh has no rows (no motion,
  as before). InstancePrev carries yaw + translation: a fast tumble's pitch / roll change is not in it (a sub-frame
  smear at most).

## 4. Adding a prop class

One row in `CLASSES` (propWorld.js: type light / heavy / post, mass, shape, friction, restitution, lift, post numbers),
then where the layer builds its tile: `cityProps.make(cls, tile, x, y, z, yaw, members)` and its `.ref` on the collision
stand-in's `userData.refs[i]` (or `addStatic` polygons with `ref`, as the cones), `cityProps.prepare(streamer, keys)` +
`cityProps.hook(material)` at the layer's start, `userData.kick = true` on the stand-in if the walker should kick it.

## 5. Cost

- `tools/propsTest.mjs` (this laptop, idle): **24 awake bodies 0.04 ms per 60 fps frame** (2 substeps of ground points,
  walls, pairs); 0.1 ms under a 3-process load. Nothing knocked: no substep, no proxy write (the carEnv contact test
  reads one more ref per candidate item).
- **No allocation in the step** (V8's sampling heap profiler, 20 000 substeps x 24 bodies: 0 bytes in propWorld /
  colliders / obb). A wake allocates its members' records once (a prop's first wake), an event only when someone listens.
- Fixed arrays: 24 bodies x 16 points, 512 displaced, 64 proxies per piece / LOD, InstancePrev 6,144 rows (16 B each,
  uploaded as ranges of the drawn ones only while something moved).
- The materials' motion hook: one storage read per vertex in the scene pass for the hooked kits (uBase = -1 for the
  pools: zero motion).

## 6. Shared files touched

- `viewer/instanceStream.js`: `buildSource` `inv`, StreamPool run logs + `patch()`, Streamer `patch()` / `source()`.
- `viewer/drive/colliders.js`: circle refs (`addCircles`, `extendColliders`, `gather`); not `buildColliders` /
  `indexCells` (the worker bundle's only colliders code: no rebuild needed).
- `viewer/drive/carEnv.js`: `props` / `mass` options (the touch, the bodies' substep after the cars).
- `viewer/drive/driveMode.js`: the PropWorld on the Driver, its frame after the car's / bike's step, the bollards' refs
  into their circles, the two-wheelers' env.
- Layers: `viewer/furniture2/cityFurniture.js`, `viewer/streetkit/cityStreetKit.js` (+ `signLinks`),
  `viewer/moto/cityTwoWheelers.js`, `viewer/moto/villoDocks.js`, `viewer/streetlife/streetlife.js`, `viewer/streetFit.js`,
  `viewer/police/props.js`, `viewer/main.js` (bollard props + refs, tile dispose, start), `viewer/nightLights/cityNight.js` (refreshStatic), `viewer/character/cityHook.js` (walker items follow the props, kick
  stand-ins), `viewer/traffic/cityTraffic.js` (obstacles), `viewer/game/kit.js` (propHit), `viewer/features.js`.
- `tools/audit/motionAudit.mjs`: props/cityProps.js a MOVER (InstancePrev).

## 7. Browser checks (the coordinator's Chrome turn)

1. `?view=drive` (one tab): drive through **bins** at 20 and 50 km/h (they fly, tumble, roll; the car barely slows), a
   **sign** at 20 (it bends over, the car rolls over it) and at 50 km/h (it snaps and flies with its plates), a row of
   **parked motorbikes / scooters** (they tip over and slide, the car is slowed), a **café terrace** (Place de Saint-Job,
   I6 / E4: the table and its chairs scatter), **bollards** (they stop the car hard at 20, snap at 50), a **Villo**
   station's bikes (they topple out of the docks; the dock is free to dock a ridden bike).
2. A **lamp** still stops the car; trees, walls, Villo docks too.
3. `?game=police`, an accident job: the **cones** fly.
4. Knocked props stay where they land; drive away out of the tile and back (or teleport): they are back at rest.
5. **Night** (`&hour=22`): a knocked prop's shadow under the street lamps; no light added (rule 7).
6. Motion: no ghosting / smear behind a flying bin (TAAU on), no LOD pop of a knocked prop 20-200 m.
7. `__props.report()`: awake, displaced, frameMs, renderMs, draws; `driver.props.stats` while 10+ are knocked.
8. Third person (`?view=third`): walk into a bin, a cone, a Villo bike, a terrace chair: kicked over.
9. **A/B `?props=old`**: everything a wall again (the car stops dead at a bin), the cones without a collider.
10. Watch: the first knock of each kind does not hitch (the proxies are warmed at boot); console free of warnings.

## Weak spots / next

- Not yet seen in a browser (no Chrome turn on this branch): the proxies' LOD hand-over, shadows and motion are by
  construction (the pools' own geometry / materials / columns); the first knock's pipeline relies on the warm-up.
- The traffic's cars and the knocked traffic cars (carHit) treat a prop at rest as a wall; they never knock one.
- A post bends as a rigid tilt about its foot (no bent tube shape); street-name plate posts stay solid.
- Tuning (masses, lift, the posts' yield forces and snap speeds) was done with the scripted tests; it wants the owner's
  hands.

## 8. Browser turn 1 (2026-11-19, WIP: stopped early for the owner's playtest)

Quick mode at Place Saint-Job (`?quick=1&place=stjob-street&view=drive&radius=300`), scripted rams with
`debug/propsCheck.js` (`ram(cls, kmh)`: a clear run-up on paving, `driver.autoInput`). Shots in `docs/props/`.

| check | result |
|---|---|
| boot | FIRST LOAD BROKEN: `viewer/moto/villoDocks.js` had a comment swallowing a block (`Unexpected token 'export'`, main() stopped, with `?props=old` too). `node --check` missed it (it reads a `.js` as CommonJS); fixed, every changed module now parsed as ESM (vm.SourceTextModule). Root cause + check to add: parse every changed `viewer/` file as a module in the gate. |
| bin_round 50 km/h | flies ~1 m up (`bin50_flying.jpg`), lies on its side; with the throttle held it was pushed on to 40 m (`bin50_landed.jpg`); the car 50 -> 52 km/h (throttle) |
| sign 20 km/h | bent, flattened at 82 deg, collider off, the car rolled over it (20 -> 7 km/h with braking): `sign20_flattened.jpg` |
| sign 50 km/h | snapped, flies with its plate (`sign50_snapped.jpg`), the car 49 -> 46 km/h |
| bollard 20 / 50 | 20: bent 54 deg (flattened); 50: snapped, the car 44 -> 36 km/h: `bollard50_snapped.jpg` (a café terrace's chairs scattered too) |
| parked moto 20 / scooter 50 | moto tipped 80 deg, 9 m; scooter tumbling in the air with a second bike knocked: `scooter50_hit.jpg` |
| Villo bike 25 km/h | bikes knocked out of the station row: `villo25.jpg` |
| terrace 30 km/h | the TABLE knocked over (91 deg, 0.8 m) but its two CHAIRS stayed at rest (never woken): **bug, open** (the group wake in `touch()` did not run for it; not yet found) |
| cost | 60 fps steady with 18 props displaced (frame median 16.7 ms, p95 20.6); world frameMs 0.005-0.13 ms, proxy renderMs 0.08 ms, 11 proxy draws |

**Browser turn 2 (2026-11-20, same spot, `&with=night&hour=22` then `?props=old`):**

| check | result |
|---|---|
| terrace chairs | FIXED: a table wakes its chairs however it woke (in `wake()`, not only the car's touch); gate check "terrace chairs follow"; in the browser a bollard flung into a terrace woke its table AND chairs |
| a lamp stops the car | 50 km/h into a street lamp: stopped dead, front at the post (centre 2.4 m): `lamp50_stopped.jpg` |
| night | the props' proxies on the lamp maps' MOVER layer (11), the marker over the awake bodies, the static lamp maps re-rendered on a knock (shadowFull 30 -> 46); a snapped bollard lying lit under the street lamps: `night_bollard.jpg` |
| walker, snapped bollard | its walker post OFF (the only walker item at its rest spot, `ref.walk` item 904 off); walked through the spot |
| walker kicks | a café chair shoved 1.28 m by walking into it: `walker_kick.jpg`; a column bin only woken (4 cm: 24 kg on its plinth, the walk stopped at the wake in that run) |
| police cones | 3 cones (police/props.js setCones) at 40 km/h: all thrown 17-18 m: `cones40.jpg` |
| `?props=old` | the car stopped dead at a round bin (30 km/h -> 0), no prop world: `old_bin_wall.jpg` |
| perf | 60 fps by day with 18 knocked; the night shots ran with the gate rows in the background (13 fps, GPU 20 ms): not a measure |

**Left:** a first-knock hitch measure per kind on a quiet machine (none seen at 60 fps by day).
