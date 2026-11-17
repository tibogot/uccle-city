# Car control, round 3 (2026-11-17): control first, a calm camera, solid trams

Owner, playtesting Drive mode (the police car uses the same controller): "why is the camera moving so much with the
car, and the car feels uncontrollable, not able to turn well ... that's not hard, it should be on point". Then: "the
player's car drives THROUGH the trams".

Switches (rows in `viewer/features.js`, A/B > Collisions):

| URL | what you get |
|---|---|
| (default) | `viewer/drive/carCtl.js` stepCtl + `viewer/drive/carCtlCam.js` camera, trams / trains solid |
| `?carctl=old` | round 2: `carFeel.js` stepFeel + `chaseCamera.js` updateCar (police feel) |
| `?carfeel=old` | round 1: `carPhysics.js` stepCar + the round-1 camera |
| `?railsolid=0` | trams / trains not colliders again |

Automated check: `node tools/carctlTest.mjs` (pass / fail per target, exit 1 on a failure), registered in
`node tools/audit/mergeGate.mjs`. Last output: `docs/carctl/test_output.md`.

## WHY IT HAPPENED + RULE

**Root cause, handling.** Round 2 (docs/POLICE_FEEL.md) was built to fix "blocked" (kerbs, slopes, lawns) and copied a
sim-style recipe: slip-angle tyres + load transfer decide the turn, then three assists (auto counter-steer, yaw cap,
stability pull) patch what the tyres do. The yaw rate you got from a key press was an *output* of tyre load, speed,
slip history and the assists, not a function of the input. Measured (test 1 / 2, OLD column): full lock at 15 km/h
slid at **17 deg** of body slip (Uccle's tight corners are taken at exactly that speed), the 90 deg junction at 30 km/h
at 5.9 deg; the time a key took to reach 90 % of its turn varied **3x** with speed (0.53 s at 30 km/h, 0.18 s at
90): the same key press did a different thing at every speed. A handbrake slide took 1.5 s to straighten. Its checks
measured what round 2 was about (grip in g, hill starts, kerbs, "no spin"), never *steering response vs speed* or
*slip in a low-speed full-lock turn*, so nothing flagged it.

**Root cause, camera.** The round-2 boom hung on the car BODY (`c.y`, the plate's pitch for the bonnet view), eased
after the *velocity* direction (a slide swung the view), led its aim into turns by the yaw rate, leaned the horizon
up to 2.3 deg, stretched / shortened with the pedals and widened the fov by 7 deg. Every one of those is a "speed cue"
from the research, each small, all added together, and all moving the picture in turns, on the pedals and over every
kerb. No check measured the camera at all (only screenshots at rest).

**Root cause, trams.** The trams and trains were obstacles for the *traffic sim* (cityTraffic.js TR circles, so the AI
cars stop for them) but never colliders for the player: the car's collision world is the static tile colliders + the
traffic cars' boxes (`env.dynamic`), and a new moving thing had no rule saying it must register. No test drove at one.

**The rule.**
1. Every vehicle controller must meet the HANDLING TARGETS (header of `tools/carctlTest.mjs`): crawl radius < 5.5 m;
   body slip < 3 deg at full lock at every speed; a key reaches 90 % of its yaw rate in < 0.45 s, no overshoot,
   straight < 0.4 s after release, and the same within x1.6 from 30 to 90 km/h; junction 30 km/h radius < 9 m / slip
   < 4 deg; slalom slip < 4 deg; 15 % hill start without roll-back, 0-30 < 3 s; 15 cm kerb at 10-50 km/h square and
   at 30 deg; braking 100-0 < 40 m.
2. The chase camera's > 2.5 Hz energy on a bumpy road must stay < 25 % of round 2's, with no lean, and the camera never
   reads the body's suspension.
3. Every moving object in the city (trams, trains, traffic, later buses) must register as a collider for the player
   (car, two-wheelers, walker) the day it is added, with a node test driving into it.
4. **Automated check:** `tools/carctlTest.mjs` enforces 1-3 (exit 1), in `tools/audit/mergeGate.mjs`.

## Research: what makes car control "on point"

| model | how the turn is made | what it gets right | why not (alone) |
|---|---|---|---|
| Mario Kart, Burnout, Ridge Racer (arcade) | the stick sets the turn rate directly; drift is a state | instantly readable, same input = same turn | no geometry: a crawl spins on the spot |
| GTA V / Forza Horizon / NFS (sim-cade) | a tyre model under heavy assists: steering lock falls with speed, counter-steer / stability control, a yaw limit; the camera rides rigidly behind | grip feels real, slides are optional | the assists are hidden tuning layers; on a keyboard the turn is speed-dependent unless the lock curve is tuned for it |
| Unity Arcade Car Physics (Saarg) / Edy's Vehicle Physics | wheel colliders + a steering-angle-vs-speed curve, anti-roll bars, downforce, ESC / TCS aids | the angle-vs-speed curve; anti-roll; aids | a full rigid-body + tyre stack, many coupled parameters |
| Space Dust Racing (UE4 vehicle tour), Very Very Valet | raycast suspension per wheel + simple lateral friction (take the side speed away) | cheap, kerbs and slopes feel right | the turn still comes out of friction |
| Godot VehicleBody3D, cannon-es RaycastVehicle, Rapier DynamicRayCastVehicleController (Bruno Simon's folios use the latter two) | Bullet's raycast vehicle: suspension stiffness / damping / compression, frictionSlip, sideFrictionStiffness | web-proven, a few knobs | a physics engine dependency; known for twitchy yaw and bouncy bodies unless damping and centre of mass are tuned |
| game-engine-v1 `games/thunderline/proto/kit/arcadeCar.js` (owner's) | "STEERING SETS THE TURN RATE", high at low speed, gentle at top speed, eased (response 9/s); a grip curve takes the side speed away (all at 8 deg, 70 % sliding); a drift state; a loose time after a crash | exactly what the owner likes; predictable | a stunt racer (loops, air control): too much for a city car |

Keyboard input everywhere: steer ramps in over ~0.1-0.25 s (slower at speed), returns to centre faster, crosses zero at
once (BeamNG "advanced steering", Forza / GTA keyboard filters). Cameras: critically damped springs ("smooth damp",
Game Programming Gems 4 1.10 / Unity SmoothDamp) on the heading only, the boom rigid on the car, no body motion.

## The chosen model (`viewer/drive/carCtl.js`)

The owner's engine's principle on a city car's geometry:
- **steering angle -> yaw rate**: the wheel angle `d = steer x lock(v)` (32 deg up to the speed where it would ask
  0.82 mu g, then `tan d = L 0.82 mu g / v^2`), the yaw target `r* = u tan(d) / L` (kinematic: what the wheels show is
  what the car does), capped at `0.95 mu g / v`; the yaw rate follows it at 16 /s (~60 ms). No tyre decides the turn.
- **grip keeps the car on its nose**: the side speed is taken away at 28 /s, capped by `mu g x curve` (1 to 8 deg, 0.7
  past 30 deg) and the friction circle with the pedals: ~1-2 deg of crab in a full-lock turn.
- **slides on purpose**: handbrake = side grip x0.32, yaw target x1.7 (cap x2.4), 5 m/s^2 of brake; released, the
  nose is drawn onto the travel (8 rad/s per rad of slide past 3 deg, within the yaw cap). After a contact, 0.3 s of
  soft yaw control (a hit's spin plays out, then control is back).
- **input shaping** (keyboard): steer in at 8 /s (4.5 /s from ~100 km/h), out at 9 /s, across zero at 14 /s;
  throttle in 5 /s, brake in 7 /s, release 10 /s. **Gamepad** (`viewer/drive/input.js`): left stick (dead zone 0.12, a
  little expo), RT / LT, A or B handbrake; analog input gets only a 20 /s filter.
- **body**: round 2's four-spring plate kept (it is what climbs kerbs, slopes, lawns), stiffer and damped
  (k 27 /s^2 ~1.65 Hz, zeta ~0.8 heave / pitch / roll), weight transfer at 0.4 of round 2's (< 1 deg dive / roll).
  It exposes `roadY / roadPitch` (the ground under the wheels) for the camera.
- Kept: pedals (0-100 ~6 s, top 144 km/h), traction limit, auto-hold, terrain grip, the collision rules (step rule,
  hedges, posts, parked-car shove, wall slide), the state fields the games / traffic / carModel read.

## The camera (`viewer/drive/carCtlCam.js`, pure JS)

Boom origin = the car's x / z (rigid: the car never drifts in the frame) and the **road height** under the wheels
(critically damped 4.5 /s, with a slope feed-forward so it does not lag on a climb), never the body. Azimuth = a
critically damped spring on the **heading** (6 /s: the car turns a little in the frame, then the view follows, no
overshoot). Pitch = the road's slope, damped 2.2 /s, 70 % of it. Aim 5.5 m ahead along the boom at 1.1 m: the car in
the lower third. No lean, no aim lead, no pedal stretch; +0.4 m boom and +2 deg fov at most, slowly. Walls / trunks:
the boom snaps in, eases out (3 /s). C: chase / far / bonnet / bumper (bonnet / bumper on the smoothed road pitch, not
the body's). Wheel: zoom.

## Numbers (node, `tools/carctlTest.mjs`; OLD = round 2)

| | OLD | NEW |
|---|---|---|
| full lock 15 km/h: radius / body slip | 4.0 m / **17 deg** | 4.2 m / 1.8 deg |
| full lock 30 / 50 / 110 km/h: slip | 5.6 / 0.3 / 2.2 deg | 2.2 / 1.3 / 0.6 deg |
| key held, time to 90 % of the turn at 30 / 50 / 90 km/h | 0.53 / 0.23 / 0.18 s (3x spread) | 0.20 / 0.22 / 0.27 s |
| overshoot, back straight after release | 1-5 %, 0.17-0.30 s | 0 %, 0.23 s |
| stick 0.25 / 0.5 / 1 at 50 km/h | 10 / 21 / 38 deg/s | 9 / 18 / 37 deg/s (linear) |
| 90 deg junction 30 km/h: min radius / slip | 7.6 m / 5.9 deg | 8.1 m / 2.2 deg |
| slalom 50 km/h: slip | 1.9 deg | 1.3 deg |
| hill start 15 %: roll-back / 0-30 | 0 / 1.73 s | 0 / 1.85 s |
| kerb 15 cm, 10-50 km/h, 0 and 30 deg | over, no air | over, no air |
| braking 50-0 / 100-0 | 8.5 / 33.1 m | 9.9 / 36.9 m (brake ramps in 0.15 s) |
| handbrake 0.7 s at 45 km/h: turned / straight again | 53 deg / 1.5 s | 54 deg / 0.43 s |
| camera > 2.5 Hz, bumpy road (pos, rel. to the car) | 3.4 mm | 1.3 mm (14 % of the energy) |
| camera, turns route: view yaw HF / lean / fov range | 0.85 deg / 1.35 deg / 3.0 deg | 0.38 deg / 0 / 0.5 deg |
| step cost per 60 Hz frame (node) | ~2-3 us | ~1.2-1.4 us |

Synthetic grounds are smoother than the city's drive grid (1 m bilinear steps): the camera gain is larger in the city,
where round 2's boom followed every body bounce.

## Trams and trains solid (`viewer/drive/movers.js`)

`tramline.js bodies(x, z, r, out)` and `rail/trains.js bodies(...)`: each frame's near running trams / trains (recorded
in their own update, no extra timetable pass) as 4-5 m oriented boxes along the body (front at d, back along the
track: curves follow), 2.4 / 3.0 m wide, with their rail height and height (a rail bridge over the road is not in the
way). `carEnv.js` gathers them once per frame (prepare) and tests each substep with `obbObb` (moved to
`viewer/drive/obb.js`); the car is pushed out and slides / bounces (`hitSlide`, kind wall); the tram is kinematic and
never pushed. Inner boxes carry a negative half length: never pushed out along the body at a seam (the car's test box is
lengthened there; the walker's capsule uses the across axis). The two-wheelers share the car's movers; the walker gets
a collider source (`railMoverSource`) added to its world when third-person starts. Cost: ~2 us a frame next to a tram.
Node checks (test 10): 40 km/h into a tram's side = stopped at its side; a tram at 29 km/h into a stopped car = car
pushed ahead, no speed explosion; 15 deg scrape = slides on; rail bridge = passes under; walker = pushed out sideways.
Buses: none in the city yet (the rule applies when they come).

## Browser check (2026-11-17, quick mode, port 8832, one tab)

- `?quick=1&place=stjob-street&view=drive`: loads, no console errors (only the usual WebGPU / TSL warnings). Driver
  update 0.07-0.2 ms a frame.
- Scripted route from the Saint-Job street spot (full throttle, left turn, right turn, brake), new vs `?carctl=old`:
  max slip 1.2 / 1.3 deg, max yaw rate 35 / 44 deg/s, camera > 2.5 Hz offset 12 / 5 / 27 mm (new) against 16 / 3 / 36
  mm (old), fov range 0.5 deg against 1.9 deg. Frames `02_OLD_turn_left_38kmh.jpg` (car off-centre, horizon leaning)
  vs `02_new_turn_left_38kmh.jpg` (car centred in the lower third, level horizon, the car seen turning).
- Trams (`&with=trams`, the tram clock stopped): driven at a real line-92 tram from 12 m at its side: stopped at 3.37 m
  from its centre line (1.2 + 2.15 = exactly touching; `03_new_car_stopped_by_tram.jpg`).
  **Found and fixed during the check**: the first run drove THROUGH the tram. tramline.js / trains.js wrote each box
  row by hand and a trailing comment swallowed the base height / height: every box had height 0 and the height band
  skipped it. The node test used its own fake box writer, so it passed. Now there is one writer, `movers.js railBox`,
  used by tramline.js, trains.js and the node test (rule: test the real producer, not a copy of it).
- Police game (`&with=game&game=police&gmode=free&police=1`): starts on the new controller (`state.ctl`), drives,
  turns and brakes (57 km/h, `04_police_free_patrol_new.jpg`), no console errors.
- Not done (short turn): Rue du Ham slope and a roundabout in the browser (node covers slopes / kerbs), the walker vs
  a tram in the browser (node only), trains at a level crossing in the browser.

## Left
- A tram does not brake for the player's car stopped on its track (it pushes the car along); the traffic sim's trams
  could take the player as an obstacle.
- `collisionTest.js` and the Car Lab still run round 1's `stepCar`.
