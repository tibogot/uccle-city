# Police feel: the car's handling, round 2 (2026-11-16)

Owner, after playtesting the police game: "the car and its physics make it not fun, it should be able to go on slopes
and many places, if not we feel blocked and that's not a good feeling". The police car is the drive mode's car
(`viewer/drive/driveMode.js` Driver), so this round changes both. `?carfeel=old` = everything before (one switch);
`?hedgecol=old` = hedges solid again. Rows in `viewer/features.js` (A/B, Collisions).

## What made it feel blocked (measured offline, `stepCar` vs the new `stepFeel` on synthetic grounds)

| case | before | now |
|---|---|---|
| 15 cm kerb across a 15 % street, from rest (estate body, 4.63 m) | **stopped at the kerb** (the ledge rule: anything 0.5 m over the car's centre is a wall; the front corner is already 0.35 m up the hill) | over it, 70 km/h after 5 s |
| lawn bank 30 % | **blocked** (same rule) | climbs it, 67 km/h |
| raised kerb island (roundabout centre, splitter) | **wall** | ridden up (it is in the drive surface, 20 cm) |
| low front-garden hedge | **wall** | through it, slowed (x exp(-1.2 dt) while overlapping) |
| sign post 0.5 m off the centre line at 36 km/h | **stopped dead** | slides round it, 44 km/h on |
| 0.6 m retaining wall | wall | still a wall (as it should) |
| wall scrape at 25 deg, 72 km/h | slides (collisions round 2) | slides, same |
| parked car | immovable box | shoved up to 1 m from its slot (and turned up to 20 deg) |

## Research: what makes arcade-but-believable handling fun

- **Raycast suspension** (Space Dust Racing's UE4 vehicle tour, Toyful's *Very Very Valet* car video, the Godot / Unity
  "RaycastVehicle" pattern, GDSim's workshop): one rigid body, a ray (here a drive-surface sample) per wheel, a spring +
  damper per wheel. Cheap, and it is what gives kerbs, dips and slopes their feel: one wheel goes up, then the other.
- **Grip as a curve, not a wall**: the tyre's sideways force rises fast to a peak at a small slip angle and falls to
  ~70 % once sliding (Pacejka shape, game-engine-v1 `games/thunderline/proto/kit/arcadeCar.js` ARCADE.grip). Slides are
  real but recoverable.
- **Speed-sensitive steering**: almost every racing game limits the front wheels' lock with speed (Game Developer,
  "Implementing racing games"); here the lock follows the grip: `atan(L * 10.5 / v²)`.
- **Steer relative to the travel when sliding** (auto counter-steer): a keyboard cannot counter-steer smoothly, so the
  front wheels turn toward the travel by 85 % of the slide angle past ~5 deg. Plus a yaw cap (the turn rate never
  beyond what the grip carries) and a light stability pull past ~30 deg; both off with the handbrake.
- **Weight transfer shapes the turn** (game-engine-v1 ARCADE.balance, "Trackmania's brake-drift"): braking loads the
  front (it bites, the tail lightens), throttle loads the rear. Kept at 45 % of the real transfer.
- **The body shows it**: dive, squat, roll come from the same four springs (no separate fake), the wheels move in
  their arches.
- **Camera sells speed** (Burnout / Midtown Madness / GTA): fov +0.32 deg per m/s past 8 m/s (max +11), the boom
  stretches on the throttle and shortens under braking, the horizon leans 2-3 deg in a hard turn.
- **No hard stops on small things** (GTA, Driver): low obstacles the car would ride over are ridden over; thin posts
  deflect; hedges give; parked cars shove. Walls stay walls but slide (collisions round 2, `hitSlide`).

## The model (`viewer/drive/carFeel.js`, pure JS, 120 Hz, no allocation)

- Suspension: four springs (k 21 /s² per wheel ~1.45 Hz, damping ratio ~0.6, 10 cm to the bump stop, 12 cm droop),
  the plate's heave / pitch / roll; the bump stop moves the plate (never a bounce), the speed it hands the body is
  capped at 2.2 m/s (a kerb at speed is a jolt, not a jump); airborne gravity x1.7 near the ground (crests: a hop);
  under the surface -> snapped back on it; a teleport (> 6 m in a frame) re-seats the car.
- Tyres: two axles, slip angles in each wheel's frame, `sin(1.5 atan(B a))` peaking at 8 deg; loads = static +
  transfer x the wheels touching; rear friction circle with the pedals; handbrake = rear grip x0.38 + a rear brake.
- Pedals: 0-100 km/h 6.8 s, 100-0 in 34 m, top 144 km/h; traction-limited; auto-hold at rest under 38 %.
- Surface: a drive-grid cell with no deck (bare terrain: lawns, verges, park paths) = grip x0.7, +1.1 m/s² rolling,
  top speed x0.7.
- Offline checks (node, synthetic grounds): full lock at 8 / 15 / 25 / 35 m/s holds 0.84-0.95 g with < 3 deg slide (no
  spin at speed); handbrake + lock at 54 km/h = a 99 deg turn that drives out; 10 / 15 / 25 / 35 % hill starts reach
  30 km/h in 1.6 / 1.75 / 2.2 / 2.8 s; a 15 cm kerb at 108 km/h = 0.1 s off the ground; no NaN in any case.
- Cost: ~17 us a frame in node against ~10 us for the old model (8 more ground samples a substep for the wheels and the
  step rule); the budget was 300 us.

## Collision rules (car only; the walker and the two-wheelers are unchanged)

- STEP, not slope (`carEnv.js stepContact`): a perimeter point is a wall when the surface rises > 0.30 m over the
  0.7 m before it (a step of ~0.43 m on the 1 m bilinear grid) or > 1.3 m over the car. Kerbs, sidewalk edges,
  tram platforms, garden edges up to ~0.4 m are ridden; walls and retaining walls stop the car.
- Kerb islands (KIND.island) are not colliders: they are already in the drive surface.
- Hedges: `furniture-gardenhedge` stand-ins (split out of `furniture-gardenwall`, `viewer/gardens/`), KIND.hedge: no
  push, drag while overlapping (x2 for a hedge over 1.7 m). Walkers still collide (cityHook.js).
- Posts (circles <= 0.12 m: signs, stop poles, plate posts, bollards): a hit more than 0.3 m off the car's centre line
  is pushed sideways too: the car slides round. Dead centre it stops (a real post would too).
- Parked cars: each contact shoves the parked car by min(0.25 m, 0.03 x the approach speed) along the push, turned by
  where it was hit; at most 1 m / 0.35 rad from its slot; matrix + collider box updated once per frame
  (`Driver.flushNudges` -> carFleet.touch).
- Traffic cars: unchanged (the sim treats the player as an obstacle and stops; the player slides off their boxes).

## Left / not done

- Props are not knocked over visually (the street kits are streamed multi-draw pools: toppling one instance needs a
  hook into `instanceStream.js`); thin posts deflect instead.
- Traffic cars do not take a shove (their sim positions are lane-bound); they stop.
- `collisionTest.js` and the Car Lab still run the old `stepCar`.
- Browser check of the fixed route (station yard -> gate -> a steep street -> kerb / pavement -> park lawn ->
  handbrake turn -> wall scrape) with screenshots in `docs/policefeel/`: pending the browser turn.

Sources: Space Dust Racing UE4 vehicle physics tour (via github.com/unitycoder/ArcadeVehiclesPhysics), Toyful Games
"Making custom car physics in Unity for Very Very Valet", GDSim workshop "Suspending a RigidBody", Game Developer
"Implementing racing games: an intro to different approaches", game-engine-v1 thunderline arcadeCar.js (read only).

## Browser check 1 (2026-11-16, ?game=police&gmode=free&traffic=0; stopped early: laptop shutdown)

Screenshots: `docs/policefeel/` (01 gate exit, 02 Square Coghen ~15 % / Avenue du Manoir, 03 park lawn new, 03 park bank OLD blocked).
- Found + fixed: rolled back on a hill with W held = stuck (e01001b0); station gate bollards pinned the car (small polygons now deflect, 546163f6); terrain surface penalty softened (paved yards / pavements are not in the drive grid and read as terrain).
- Measured: Square Coghen hill 40 km/h after 2.2 s (old 26), stop / hold / restart OK; gate exit OK (old and new); wall scrape in the yard slides on at 24-28 km/h; Wolvendael park 30 % grass rise: OLD stops at an invisible ledge (kind wall, 2 km/h), NEW climbs it (then stops at a real trunk); handbrake on the lawn at 35 km/h: 77 deg, recovers. Driver update ~0.06-0.1 ms (old 0.08-0.1).
- Half done: courtyard entry from both gates / the north gate not driven; old vs new screenshots only partly; traffic / parked-car shove not checked in the city; pavements are drawn but not in the drive surface (no kerb bump; the car follows the terrain under them).
- Next: FIRST the owner's report: bad lines (aliasing?) on the back of the police car while moving in the default chase view; then the gates / courtyard, parked-car shove with traffic on, camera lean / fov feel, hedge drag.

## Browser check 2 (2026-11-17)

1. OWNER "bad lines at the back of the car when moving" = the TAAU's stochastic see-through glass (viewer/upscale.js:
   a per-frame discard the history averages) on the player's car: big, close and moving with the camera, the clamp never
   settled it: a band of crawling speckles on the rear window (glass vs the bright boot behind it; also visible at rest).
   Confirmed live (packLook.glassOpacity = 1 -> clean). Fix: solid tinted glass on the player's car under the TAAU
   (carPacks.js playerSeeThrough; `?carglass=old`). Crops: 10_rear_glass_before_moving / _still / _after_moving.
2. OWNER "the car goes too far from the camera, almost in the centre": the round-1 boom was a world-space spring
   trailing 2v/w (4.3 m at 54 km/h) and aimed at the car's centre. Now (chaseCamera.js CAR_CAM): rigid boom 6.0 m / 2.0 m
   (far 8.6 / 2.9), eased swing (7/s) and height only, aim 5.5 m ahead at 1.15 m (car in the lower third), pull-back
   <= 0.8 m, fov +7 deg max, aim led into turns by the yaw rate, kept out of walls and trunks / lamp posts; C cycles
   chase / far / bonnet / bumper; wheel = zoom 0.75-3x. 11_camera_before_chase / _after_chase.
3. Station gates: the vehicle (south) gate was BLOCKED by a front-gardens wall + pillar + hedge drawn across its mouth
   (12_south_gate_garden_pieces_before): plantsClear now applies to the gardens (main.js) + a south-gate ring
   (data/overrides.json). Rue Rouge -> south gate -> school courtyard: 0 hits; north gate -> courtyard: done; out
   through the north gate along its passage (13): done (the gate is 3.1 m: from the north yard's bays a car must line up
   in the passage first: a 90 deg turn straight into it scrapes the gate leaves / the tree inside).
4. With traffic on: parked cars shoved 0.34-0.35 m / 2-3 deg by 10-12 km/h hits, no jump; rear-ending a traffic car at
   50 km/h = a hard bounce (the traffic car does not take momentum; it stops: sim obstacle), no explosion. Hedges: through
   one at 32 km/h, held to ~8-10 km/h while inside -> drag 1.6 -> 1.2 (15_hedge_through).
Left: traffic cars could take a shove; pavements not in the drive surface; the camera can end up behind a hedge (only
walls / trunks pull it in); bonnet view sits on the body's pitch only (no roll).
