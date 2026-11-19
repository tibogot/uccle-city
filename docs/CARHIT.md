# Car-car contact, both ways (branch claude/carhit, 2026-11-18)

Owner, 2026-11-18: "we need collision with the cars, being able to push them".

Until now the traffic cars were **one-way obstacles**: `viewer/traffic/cityTraffic.js` `driver.env.dynamic` pushed the
player's car out of the traffic boxes exactly as out of a wall (`carEnv.js` push + `carPhysics.js hitSlide`, infinite
mass): a 1.3 t car hitting another at 60 km/h stopped as on a concrete wall and the hit car never moved. Parked cars
had a clamped "nudge" (police feel round): moved at most 1 m / 20 deg from their slot, by a fixed share of the hit,
through whatever stood behind them.

| URL | what you get |
|---|---|
| (default) | two-way contact: viewer/drive/carHit.js |
| `?carpush=old` | the one-way obstacles and the parked-car nudge as before (and no crumple code in the car shaders) |

(`?carhit=old` was already taken: it is collisions round 2's wall response, docs/COLLISIONS.md. The task asked for
`?carhit=old`; the new switch is `?carpush=old`, row in `viewer/features.js`, A/B > Collisions.)

Automated check: `node tools/carHitTest.mjs` (rule 37, gate row `carhit` in `tools/audit/mergeGate.mjs`).

## How it works (viewer/drive/carHit.js, `CarHitWorld`, one per page on the Driver)

**Bodies.** At most 16 awake rigid bodies on the ground plane: x, z, yaw, vx, vz, yaw rate; mass per car type
(`MASS`: hatch_s 1150, hatch_c 1300, estate 1500, saloon 1520, suv 1800, van_c 1650, van_p 2300, taxi 1530, police
1580 kg, a driver included; the player's two-wheelers `MASS2`: motorbike 300, scooter 200, Villo 100 with the rider);
yaw inertia m (w^2 + l^2) / 12 x 0.85. Fixed typed arrays, slot 16 = the player's vehicle during a solve.

**Contact.** Box vs box by the existing SAT (`obb.js`): normal + depth. The contact point = the corners of each box
inside the other (2 cm slack) averaged (a corner nudge: that corner; bumper to bumper: the middle of the overlap);
edge across edge: between the two deepest corners. Positional split by inverse mass, then the impulse
`j = -(1 + e) vn / (1/mA + 1/mB + (rA x n)^2 / IA + (rB x n)^2 / IB)` with a restitution falling with the closing
speed (0.3 at 1 m/s: bumpers spring back; 0.06 from 11 m/s: crumple), and a Coulomb friction impulse <= 0.4 j along
the contact. So the angle and the speed decide: a rear-quarter nudge spins a car, a T-bone shoves it sideways, a
5 km/h tap barely moves a car standing in a queue, a panel van moves a third of what a small hatch does.
The player's car takes the reaction (its velocity / yaw rate back into carCtl's state: forward speed + side slip +
yaw rate; carCtl's `loose` lets the spin play out), plus a small pitch / roll kick. Walls, buildings, trams stay as
they were (infinite mass, `hitSlide`).

**A two-wheeler** (motorbike, scooter, Villo) keeps its own impact response and crash rules (`motoHit`): the car it
hits takes the impulse of the bike's mass (300 kg barely moves a car), the bike takes its share of the overlap.

**Knocked cars** (`trafficSim.js` `ST.knocked`, `knock` 1 sliding / 2 settled / 3 wreck / 4 a shoved parked car):
a traffic car hit with more than 0.5 m/s closing speed (a touch below that: pushed out as before) leaves its lane; the
sim skips it (no IDM, no pose from the route, not in the lane lists) and the body drives its drawn pose (`px = x`: no
interpolation). Its tyres: two axles, a friction circle each (mu 0.95, load m g / 2): longitudinally rolling for
0.45 s (the driver's reaction), then braking at 0.85 g (a car standing in a queue: braking at once; a parked car: its
handbrake, 0.55 g); laterally the axle's side speed is taken away within the grip, and the two axles' side forces turn
the car (a spun car stops spinning on its tyres). A hit takes the side grip away in proportion to the change of speed
of the contact corner (down to 25 % at 4 m/s, back over 1.6 s): a shaken car slides and spins on, then grips again.
It collides with the drive colliders round it (gathered once a frame: buildings, walls, garden walls, trees, posts,
furniture; kerb islands ridden up; kerbs / retaining walls by carEnv's `stepContact` ledge rule; trams / trains by
their boxes): pushed out fully, an impulse at its deepest corner (restitution 0.1, scrape 0.35). It also hits other
traffic cars (they wake too: a chain) and other parked cars (they wake when a slot is free, else they are walls).

**Settle, rejoin, wreck.** Below 5 cm/s and 0.03 rad/s for 0.4 s the body sleeps (its slot is free again). A traffic
car then stands with **hazards** (both indicators, `bits` 12) and after 3.5 s (a flee car of the police game: 1.2 s;
never within 4 m of the player) `sim.rejoin(i)` joins it back IN PLACE (same index, gen, type, paint, dents: a game's
entity on it stays valid): the `joinFrom` pull-out from its pose onto the nearest lane its way (within 7 m), waiting
for a gap with the indicator (`outWait`; never vanishing after 20 s as a pull-out does). No lane its way (more than
63 deg off every lane within 7 m), or real hits (> 1.5 m/s each) summing > 7 m/s of change of speed in one wake (a
60 km/h ram ~9; a 30 km/h one ~4.5), or > 0.4 m of crumple in total: a **wreck** (hazards on, it stays; pushed again it
stays a wreck) until it is out of sight past 70 m or past 280 m (`sim.kill`, never in view). A game's car (`keep`) is
never cleared. Police game: a car told to pull over (ctl 2) that is knocked counts as stopped (ctl 3) once below
0.4 m/s.

**The traffic reacts.** Every knocked car (sliding or standing) is a box obstacle of the sim each step
(`addObstacles`, through cityTraffic's obstacle source): the cars behind brake and queue as for the police game's
stopped cars; nobody drives through a wreck. A knocked car is not in the lane lists, so it is never anybody's leader
twice.

**Parked cars** hit by the player (closing > 0.08 m/s) become a knocked car of the traffic sim on the spot (the
pull-out hand-over: same pose, type, paint; the parked one hidden the same frame, its drive / walker colliders off
through `carFleet.touch`; `handoff` so the fleet's pop counters do not count it), pushed the same way (no driver: lights
off, `bits` 32). When it stops: undamaged, it goes back into the parked fleet where it stands (its colliders follow:
`setBox`); dented, it stays a standing car of the traffic fleet (dents drawn) while its tile is loaded. With
`?traffic=0` there is no sim to hand it to: the old clamped nudge stays.

**Damage.** Per corner (FL FR RL RR), from the change of speed of the body at the hit: (dv - 1.2 m/s) x 2.4 cm per m/s,
at most 14 cm per hit, 28 cm per corner, shared between the corners by where the point is (a centred head-on: both
front corners). (Since claude/dent drawn by the closed-shell field of carDent.js: "Dents without holes" below.) Drawn by the accident props' sheet-metal fold (police/props.js), generalised to four corners
(`carPacks.js crumpleOffset`): the traffic fleet packs the corners (3 bits each, 4 cm a level) and the type's half
length into its per-instance `motion.z` above the light bits, decoded in the VERTEX stage; the fragment gets the light
bits through a varying (an interpolated packed code would not floor cleanly: the zfight lesson, rule 34). The player's
car: one `vec4` uniform (`playerDamage`), the crumple added to its material (police car too). No new draw call, no new
pipeline per hit, no light.

**For the games** (no rule uses them yet): `driver.damage` (0..1, the player's vehicle), `driver.carHit.player.corners`
(m), `driver.carHit.player.lastImpulse`; the game kit emits `"carHit"` `{ other: { kind: "traffic" | "parked",
index, type }, impulse (N s), point: { x, z }, speed (closing m/s), damage }` (at most one per car per 0.25 s, from
0.4 m/s of change of speed). `c.lastHit` (kind 6, speed > 2 m/s) is set as before: the stolen-car job's ram count
works unchanged. R (reset) clears the player's damage.

## Cost

- `tools/carHitTest.mjs`: **0.4-1.0 us per contact pair** (SAT + contact point + impulse + friction + dents), **0.9-2.6 us
  per body substep** (tyres + walls + pairs); 16 awake bodies at 120 Hz < 5 ms per second of play (~0.08 ms a frame)
  in the worst case, nothing when nobody was hit. The player's substep tests the traffic boxes as before (one
  `boxesNear` pass, now with the indices).
- No allocation in the step (V8's sampling heap profiler over 20 000 substeps x 4 bodies: 0 bytes in steady state;
  only a JIT tier-up now and then). A hit itself allocates its `lastHit` (as before) and, with listeners, the event.
  `Math.hypot` replaced in the hot paths (it allocates in some tiers), double-typed scratch objects.
- Fixed arrays: 16 bodies, 64 knocked cars tracked, 16 traffic cars per body per frame. No DynamicDrawUsage, no
  light, no draw call (the fleet's existing instance attribute carries the dents).

## Shared files touched

- `viewer/traffic/trafficSim.js`: `ST.knocked`, `knock` / `dmg` / `kT` arrays, the step skips knocked cars,
  `rejoin(i)`, a rejoining car never times out of `outWait`.
- `viewer/traffic/traffic.js`: `boxesNear(..., idx)` returns the sim indices.
- `viewer/traffic/trafficFleet.js`: the damage code into `motion.z`.
- `viewer/traffic/cityTraffic.js`: attaches the traffic, the knocked cars as obstacles, the bodies settle when nobody
  drives.
- `viewer/drive/carEnv.js`: `carHit` / `two` options (parked car wake, `playerStep` where `env.dynamic` was);
  `stepContact` without `Math.hypot`.
- `viewer/drive/carPacks.js`: `crumpleOffset`, `playerDamage`, the motion path's vertex decode + light-bit varying,
  lights-off bit 32.
- `viewer/drive/driveMode.js`: the world, the masses, `frame()` after each step, reset, `driver.damage`.
- `viewer/game/kit.js`: forwards `"carHit"`. `viewer/features.js`: `?carpush=old`.

## Browser checks (the coordinator's Chrome turn)

1. Drive mode in a busy street (`?view=drive`, e.g. Chaussée d'Alsemberg): ram a traffic car from behind at
   **30** and **60 km/h**: it is shoved on, slides, stops with hazards, dents at the hit corner (both cars), drives
   off after ~3.5 s with its indicator; the cars behind it stop and queue, none drives through it. At 60 km/h it
   should usually stay a wreck (hazards) and vanish only out of sight.
2. **Rear-corner nudge**: come alongside a moving car and steer into its rear quarter: it spins.
3. **T-bone** a car crossing a junction: shoved sideways, not spun.
4. **Push a parked car into a wall / another parked car** (slow, full throttle): it moves, the one behind is pushed
   too, never into a building; when it stops it is a parked car again where it stands (undamaged) or a dented car.
5. **A van** (`van_p`, white panel van): the same hit moves it clearly less.
6. Two-wheelers: ride the motorbike / Villo into a car: the car barely moves, the bike's crash rules as before.
7. **Police game, stolen car** (`?game=police`): chase, ram it (the ram counter still counts, the target can be
   knocked and recovers in 1.2 s), box it in (stopped next to it): it gives up, arrest works. Speed check: pull over.
8. **A/B `?carpush=old`**: the old one-way behaviour; the shaders without the crumple.
9. Watch: no traffic car popping when a knocked car rejoins / a parked car is handed back; night: a shoved parked car
   has no lights on; `driver.carHit.stats` (awake, knocked, frameMs) and the traffic `stepMs` while 10 cars are
   knocked.

## Browser turn (2026-11-19, quick mode Chaussée d'Alsemberg, scripted placements + autoInput)

| check | result |
|---|---|
| ram 30 km/h (rear) | knocked, dents 4 cm at the rear corners, settles with hazards, rejoins with its indicator (after the fix below) |
| ram 60 km/h | knocked, spins ~170 deg, 12 cm dent rear right + 8 cm front left, wreck with hazards: `docs/carhit/ram60_dent_hazards.jpg`, `ram60_wreck_across_lane.jpg` |
| rear-corner nudge on a moving car | 1.35 rad of spin within 1.5 s, still turning |
| T-bone 30 km/h (standing cars) | shoved sideways, < 0.2 rad turn: hatch_s 2.1 m, van_c 1.5 m, van_p 1.4 m, suv 1.1 m; the van rejoins dented: `van_tbone_rejoined.jpg` |
| parked chain | a parked hatch pushed at full throttle pushes the van parked ahead of it (0.7 m); the player stalls against two handbraked cars (13 kN > its 8 kN): `parked_chain.jpg` |
| walls | every knocked car checked against the drive colliders: 0 overlaps (8 cars) |
| traffic | 10 s with 10 knocked cars: no driving car overlaps a knocked one, 80 queued samples |
| motorbike | the car it hits is knocked (woken, settles, rejoins); the bike's crash rule as before |
| police | a flee car (ctl 1, entity alive throughout) rammed at 7.4 m/s: the ram counts (lastHit kind 6), knocked, rejoins in 1.2 s still fleeing; a car told to pull over (ctl 2) and knocked: ctl 3 (stopped) |
| night | a shoved parked car: no lamps (shader bit 32 + the night pool): `night_shoved_parked_no_lights.jpg` |
| `?carpush=old` | the old wall bounce (45 -> -12 km/h), the car does not move; no new console warning either way |
| cost | 12 bodies sliding at once: carHit 0.1-0.33 ms a frame, worst frame 1.1 ms, a wake 0.8 ms at most |

Fixes from the turn: a 60 km/h ram rejoined (the wreck test took the largest single hit, spread over several
substeps): now the real hits of a wake are summed (wreckDv 7); a 30 km/h ram then was a wreck by the player's pushing
contacts: only hits > 1.5 m/s count; an undamaged car left at 40-63 deg to its lane stayed a wreck: rejoin takes lanes
within 63 deg (`laneAt(..., minDot)`); a wreck pushed again rejoined: it stays a wreck; the night pool (cityNight.js)
lit a shoved parked car's lamps: skipped for `bits & 32`.

## Dents without holes (claude/dent, 2026-11-19, rule 41)

Owner playtest 2026-11-19: "the car damage is a cool idea, but the damage leaves some hollow mesh". **Why:** the crumple
(`crumpleOffset`, the accident props' fold) pushed every vertex along its OWN NORMAL by up to 1.3 x the corner's depth
(28 cm -> 36 cm) with a 23 / m fold wave. The copies of a vertex at a hard edge (split normals) moved apart (torn
seams), the inner face of every two-faced part (bumper lip, wheel arch, boot lining) was pushed OUT through the outer
one, and the push changed faster than the panels: faces turned inside out, and with back faces culled you saw through
the dented corner.

**Now** (`viewer/drive/carDent.js`, one function for the shader and the gate): a smooth field of the position only.
Each end is pushed in along the car, evenly across the width for a head-on hit and tilted for a corner hit (the share
is linear in x), fading over 1 m along the car and above the belt line; the sides near the dented corner squeeze toward
the mid-plane; everything is softly capped by the distance to the mid-planes and to the cabin box (the model's interior
bounds, or its glass house). A 4 cm hit gives 5.8 cm, the 28 cm cap about 15 cm: a light dent. The paint in the zone is
up to 20 % darker and rougher with less clear coat, plus a darker crease band on the dent's flank (a varying, paint
only). Coincident vertices move together, so the shell stays closed. No flip had to be patched with two-sided faces, so
the body stays one-sided.

| URL | what you get |
|---|---|
| (default) | the closed-shell dent |
| `?dent=old` | the normal-push crumple as before (row in `viewer/features.js`, A/B > Collisions) |
| `?carpush=old` | no crumple at all (as before) |

Where it runs: the player's / police car (`packMaterial` lights path; `setPlayerDent(model)` on every model change,
also the police car's install, which never set the old `hl`), the traffic fleet (all 6 materials incl. the glass pass:
the top of `motion.z` is now the TYPE index, its frame read from a `uniformArray` of 8 x 3 vec4 filled from the fleet's
own bodies in `carFleet.load`; `?dent=old` keeps the half-length code), the accident props (`props.js damagedMaterial`,
the corner's depth in a vec4 uniform). No new draw call, pipeline per hit, light or DynamicDrawUsage.

**Check:** `tools/audit/dentGate.mjs` (gate row `dent`), on every model of the 4 packs (cars2, faceted, kenney,
quaternius: 28 models, 103 LOD meshes as the game builds them) dented 28 cm on each corner and on all four:

| measure | before (`?dent=old`, `--old`) | after |
|---|---|---|
| wound-round triangles seen from outside (17 views from 10 / 35 deg above and the top, 1.5 cm pixels) | 7,668 | **0** |
| see-through holes >= 4.5 cm on the levels drawn nearer than 55 m | 2,193,765 px | **0** |
| the same on the far levels (the lab packs' meshopt LOD2-3, open already; under a pixel there) | 2,731,692 px | 2,249 px |
| back-face pixels added in all (hairlines: a lamp / panel seam that was open already moved by a pixel) | 8,369,238 px | 5,750 px |
| wound-round triangles in all (incl. never-seen 1-3 mm slivers under / inside the body) | 19,335 | 26 |
| torn seams (vertices of one position moved > 1 mm apart) | 73,724 | **0** |
| vertices across the mid-plane / into the cabin box | 418 / 38,718 | **0 / 0** |
| deepest push at 28 cm of damage | 0.54 m | 0.16 m |

Plus: no NaN, the wheels (own frame on the player's car) untouched, the default materials compile to WGSL headless with
the dent (player / police, traffic, props), the features row, no draw call / light / DynamicDrawUsage.

**Browser turn (to do):** drive mode, ram a few car types (hatch, estate, SUV, panel van; also with `?cars=old`) at
**30** and **60 km/h**, front and rear corners; walk round each dented corner close up (third person / orbit camera)
from all sides, above and low: no hole, no see-through, no flicker at the dent; the darker crease reads as a dent; the
player's car and the police car (`?game=police`, ram the stolen car) the same; the accident props of the police game;
LOD hand-overs of a dented traffic car while driving away (no pop); A/B with `?dent=old`.

## Weak spots / next

- The hit car has no roll / pitch kick (the fleet's matrix has yaw + pitch only) and no body sway: a big hit could
  rock it (a per-instance roll would need a channel).
- Dents are four corner depths drawn as two ends (claude/dent): a hit in the middle of a side dents the nearer end(s),
  not the middle of the side; the shading normal is not bent (the dent reads by its shape and the darker paint).
- A knocked car's rejoin is a pull-out curve onto the nearest lane its way: a car spun across the street stays a wreck
  rather than doing a three-point turn.
- Traffic two-wheelers (motorbikes / scooters in the traffic) stay one-way obstacles (they would need to fall over).
- The walker (third person) cannot push cars.
- Tuning (restitution, grip loss, rejoin times) was done with the scripted tests; it wants the owner's hands.
