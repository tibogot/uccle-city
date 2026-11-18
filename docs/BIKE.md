# The kid's BMX (branch `claude/bike`, phase 1, 2026-11-18)

The heart of the 90s kid game (docs/KIDGAME.md: "bike riding must be very on point"). Phase 1 is offline: the
controller, a lab, node tests. The browser turn tunes the feel (checklist at the end).

Files: `viewer/bike/bikePhysics.js` (the core: pure JS, no three, fixed step, deterministic), `bikeEnv.js` (ground +
the city's collider sets), `bikeGround.js` (the lab's procedural test ground, shared with the tests), `bikeModel.js`
(PLACEHOLDER kid + bike), `bikeCamera.js`, `bikeInput.js`; the lab `debug/bikeLab.html` (+ `bikeLab.js`); the tests
`tools/bike/bikeTest.mjs` (gate row `bike`).

## How good bike games do it (short)
- **Full multibody / Whipple model** (the bicycle as linked rigid bodies; self-stability and countersteer emerge from
  trail and gyroscopic terms; research sims, some VR trainers). Real, but twitchy at 60 fps, needs a balance controller
  to be ridable at all, and hard to make forgiving for a kid's game. Not this.
- **Ragdoll-on-a-vehicle** (Descenders' bespoke physics, Trials): rich, but months of tuning (RageSquid spent months
  "just to get the physics right" before anything else); the slippery feel reviewers mention is the cost.
- **Arcade with a lean target** (Lonely Mountains: Downhill, Mat Hoffman / Dave Mirra style BMX, Mr.doob's slop
  motorbike and our own `viewer/moto/motoPhysics.js`): the input sets a lean target, the lean follows with a lag, the
  yaw is the coordinated turn `g tan(lean) / v`; tyres remove side slip within a grip budget. Stable, readable, tunable.
- What makes a BMX feel right on top of that: pedalling that runs out of cadence (one gear), coasting with a freewheel,
  a rear skid kids do on purpose, a front brake that can endo, a bunny hop that is a preload and a pop, pumping that
  gains speed on rollers, a manual balanced at a point, air pitch / spin, landings judged by the angle to the ground,
  and falling off (with a short get-up, no gore).

## The model chosen (and why)
**An arcade lean-target model in plan + a small rigid body in side view, on two spring contacts.** Fun and stable
at a 120 Hz fixed step, deterministic (node-testable, replayable), and the side-view rigid body makes the BMX things
EMERGE instead of being scripted animations:
- Plan view: heading + world velocity. Steer -> lean target (limited by speed: no lean below 1.2 m/s, and by the
  surface's grip: `atan(mu)`); the lean follows (`leanRate`); yaw = handlebar turn at walking pace blended into
  `g tan(lean) / v` above ~4.5 m/s. Tyres take out side slip within a friction circle shared with braking and pedalling
  (`tyreRate`): over it the bike drifts; sliding without a skid for 0.3 s = "washed out" (a crash).
- Side view: bike + kid as ONE rigid body (CoM height, pitch, pitch rate). The hubs are fixed to the body (moved by the
  legs), each contact is the wheel's radius under its hub, a spring-damper (tyre + legs) along the ground normal with a
  bottom-out (`maxComp`, a hard constraint: what keeps it from ever tunnelling). From that alone: slope gravity, ramp
  launches, transitions, a wheelie when pedalling hard standing, a stoppie / endo from the front brake's force under the
  CoM, the manual's balance point (the CoM over the rear contact, ~34 deg), landings.
- The kid's legs move the springs' rest point: hold Space = crouch (the body drops, the wheels stay down: preload,
  absorb), release = extend.
- **Hop**: crouch builds a preload (0..1 in 0.28 s); the release pops (an upward impulse 1.35-3.15 m/s + a nose-up
  kick, front first), then the kid tucks the bike up and levels it so the rear follows. Tap = ~12 cm, full = ~43 cm
  of wheel clearance.
- **Pump**: a release (or C held) on a BACK slope is not a pop but an extension into the slope; a one-body model cannot
  make the rider's work by itself, so `pumpGain` turns the extension speed x the back slope into forward push (and the
  absorb on a face takes part of the climb's loss). Pumped rollers keep / gain speed, coasted ones die.
- **Air**: ballistic velocity; lean input pitches (`airPitch`), steer spins (`airYaw`), both damped; an assist
  (`airLevel`) levels the bike toward the slope of the ground it will land on (flat: level, a down ramp: nose down).
- **Landing**: judged at touch-down: nose down vs the ground > 26 deg = over the bars, nose up > 46 deg = looped out,
  lean > 31 deg, heading vs velocity > 31 deg (sideways), impact > 7 m/s into the ground (+1.4 crouched) = hard landing,
  the trick still held. A flat landing costs forward speed; landing on the down slope keeps it.
- **Steps** (a kerb face in the ground): a wheel meeting a face higher than `stepRoll` (7 cm) that it can't roll is
  blocked: the front stops the bike (faster than 3.2 m/s with > 10 cm: over the bars); the rear bonks up to 25 cm
  (speed loss). A general face test on every contact move (turning, sliding, pitching) and a ledge rule keep a wheel
  from ever being lifted onto a wall of ground.
- **Colliders**: the city's sets (viewer/drive/colliders.js, the very data the police car uses), an oriented box at
  bike scale (0.64 x 1.48 m); low pieces with a top (logs, low walls, benches) are tested per WHEEL at its own height,
  so a hop clears them front then rear; > 4.5 m/s into a wall = a crash; a glance slides along it.
- **Pedalling**: one gear 44/16 on 20" (4.39 m per crank turn): power over speed (130 W seated, 320 W standing with
  Shift), a force cap (~330 N / 520 N on the pedal), spinning out at 128 rpm (~34 km/h); freewheel when coasting.
- **Pushing**: crawling (< 0.85 m/s) up a climb > 10 % for 0.8 s: off the saddle, walking it up at 1.3 m/s; back on when
  it flattens. A foot goes down at a stop (no roll-back on a hill).
- **Crash**: the bike slides and falls on its side, the kid tumbles (a point with bounces); after 2.2 s the kid gets up
  where the bike lies (or at the last safe pose if that is inside something or across a ledge).

Kid numbers (a ~11 year old, 40 kg + an 11 kg BMX): flat 25 km/h seated, 30.6 km/h sprinting, a 12 % descent coasts to
~50 km/h, 0-20 km/h in 9.6 s seated / 3.4 s standing, a 12 % climb seated at 2-3 m/s, a 20 % climb pushed.

## Controls
| | keyboard | gamepad |
|---|---|---|
| pedal / sprint | W / Shift (stand up) | RT / RB |
| rear brake (held = skid) / front brake | S (ramps in) / Q | LT / LB |
| steer (lean) | A / D (ramped) | left stick X |
| lean forward / back (manual, nose, air pitch) | Up / Down (I / K) | left stick Y |
| crouch + hop (back slope: pump) | Space hold / release | A |
| pump | C | B |
| trick (air) | F | X |
| reset / get up / camera / pause / spots | R / G / V / P / 1-9 (start, kicker, table, pump, roots, bowl, kerb, sand, slope) | Back / - / Y |
The controls card is shown at start, `?` toggles it (rule 14). Sounds: none.

## Constants (all panel sliders in the lab: `BIKE_RANGES`; surfaces in their own folder)
| group | constants (default) |
|---|---|
| body | mass 51 kg, wheelbase 0.95 m, cgHeight 0.95 m, wheelR 0.254 m, pitchInertia 0.30 m^2 |
| contacts | springK 170 /s^2, springC 8 /s, maxComp 0.11 m, fnMax 80, legRange 0.12 m, legRate 9 /s, pumpGain 45 |
| pedal | powerCruise 130 W, powerSprint 320 W, forceCruise 1.6, forceSprint 2.4 m/s^2, rollout 4.39 m, cadenceMax 128 rpm, drag 0.0055 /m |
| brakes | brakeFront 5.2, brakeRear 4.6 m/s^2, skidAt 0.85, skidMu 0.75, grip x1 |
| steer | maxLean 0.65 rad, leanRate 7, leanV0 1.2 / leanV1 5 m/s, lowSteer 0.75 rad, barV0 1.5 / barV1 4.5 m/s, yawResponse 12, tyreRate 25, skidYaw 1.6, washSlip 1.6 m/s, washTime 0.3 s |
| pitch | riderPitch 24 rad/s^2, pitchDamp 1.6, manualAssist 0.8, manualAngle 0.30 rad |
| air | airPitch 8, airPitchDamp 1.8, airLevel 4, airYaw 9, airYawDamp 2.2 |
| hop | popVel 1.35 m/s, popPreload 1.8 m/s, preloadTime 0.28 s, popPitch 1.2 rad/s, coyote 0.08 s |
| steps | stepRoll 0.07 m, faceSlope 1.6, faceCrash 3.2 m/s, rearClimb 0.25 m, rearBonk 0.45 |
| landing | noseTol 0.45, tailTol 0.80, leanTol 0.55, yawTol 0.55 rad, hardLand 7 m/s, absorb 1.4 m/s, landLoss 0.25, loopOut 0.85, endo 0.62 rad, crashSpeed 4.5 m/s, trickRisk 0.35 |
| push | pushGrade 0.10, pushSpeed 0.85 m/s, pushDelay 0.8 s, walk 1.3 m/s, footSpeed 0.6 m/s, respawn 2.2 s |

Surfaces (grip / rolling x g / sink per m/s / buzz): asphalt 0.95 / 0.010 / 0 / 2 mm, setts 0.72 / 0.024 / 0 / 14 mm,
dirt (packed) 0.70 / 0.018 / 0 / 8 mm, grass 0.55 / 0.060 / 0.06 / 10 mm, sand 0.42 / 0.12 / 0.25 / 3 mm,
roots 0.50 / 0.045 / 0.03 / 22 mm.

## Targets = the node checks (`node --import ./tools/heap/register.mjs tools/bike/bikeTest.mjs`, gate row `bike`)
49 checks, all pass (1.3 s): determinism (same input twice bit-identical; 60 fps vs an uneven 30-144 fps split = the same
steps and state); speeds above; never tunnels (kicker / table / kerb / rollers entered at 58 km/h: deepest wheel 0.11 m =
the bottom-out, 0 steps under; the wall at 58 km/h: never through, a crash; at walking pace: stopped, no crash); the
15 cm kerb: a timed hop rides onto the pavement, no hop at 2.5 m/s = stopped, at 22 km/h = over the bars; a 6 cm kerb
rolls; the drop off it is ridden; hills (12 % seated 1.97-3.18 m/s, 20 % pushed, no roll-back at a stop); sand (coast
decel 2.5 vs 0.29 m/s^2 asphalt, pedalling < 6 km/h, the lab's patch stops a coasting bike); landings (1 m level / rear
first ridden, 35 deg nose down = over the bars, 35 deg sideways = crash, 4 m flat = hard landing, 2.6 m crouched =
ridden, the kicker at 29 km/h hands-off ridden out, the table at 32 km/h, a held trick = crash); brakes (skid 10.8 m,
full front 4.4 m no endo, front + lean forward = endo); manual (assist holds it 2.9 s; no assist = loops out); pumping
(41 m at 4.9 m/s vs coasting 27 m, stopped); hop heights; the 25 cm log (full hop clears, riding into it stops);
turning (full lean at 14.5 km/h r 2.7 m, walking U-turn r 1 m, grass full lean + front brake washes out); 10 minutes of
random input over 4 seeds (finite, never under the ground, sane speed); 7 us a step in node; every constant a slider;
the lab's model + camera run in node with three (4 camera modes, 4,800 frames, finite, camera over the ground).

## Into the city (next jobs, not done here)
- Ground: `ground(x, z, out)` from the drive surface (viewer/drive/colliders.js `driveHeight` + central differences:
  `groundQuery`), surfaces from the city's surface data (road / pavement / setts / park paths / grass / forest).
- KERBS: the drive grid is bilinear over 1 m, so a 15 cm kerb is a 21 % ramp there: the bike would roll every kerb
  (no hop needed). The bike needs the kerb lines as real faces (the road engine knows them) to make the hop matter.
- Colliders: `createBikeEnv({ sets })` takes the same `sets(x, z, r)` as the police car's env; islands are ridden,
  hedges soft, low pieces per wheel. Parked cars / traffic as in carEnv (`dynamic`) still to wire.
- The Kauwberg: sand quarries, roots, bumps (docs/KIDGAME.md) as height + surface detail at bike height.
- The real model (Blender kit, named slots) replaces the placeholder; the rider from claude/character2 (owner's).

## Known limits (phase 1)
- One rigid body: no separate rider mass (pumping and the manual are helped: `pumpGain`, `manualAssist`).
- No camber force (a cross slope does not push the bike sideways), no tyre pinch, no wheel-radius rounding of edges
  (small steps are rolled by the spring, not by the wheel's geometry).
- The trick is a placeholder (a tabletop while held).
- A heightfield face hit sideways at a lip can stall the bike for a moment (the ledge rule backs it out).

## Browser turn: what to try for feel (checklist)
1. **Pedal off and cruise** on the plaza: does 0-25 km/h feel like a kid (not a moped, not a slug)? Sprint with Shift:
   the stand-up should be felt (cadence, speed). Tune powerCruise / forceCruise / powerSprint / cadenceMax.
2. **Steering**: keyboard taps vs holds, the slalom of posts at 15 km/h, U-turns at walking pace, a fast lean at
   25 km/h: too twitchy / too lazy? Tune the keyboard ramp (bikeInput.js 3.4 / 7 per s), leanRate, maxLean, barV0/V1,
   yawResponse. Watch for wobble when the lean settles.
3. **Skid**: hold S at 20 km/h, steer during it (skidYaw); the tail should step out and come back without a spin-out
   unless forced. Front brake (Q) panic stop; Q + Up = endo.
4. **Kerb hop**: the 15 cm kerb (spot 7) at 10-20 km/h: is the timing readable (preload feel, pop height)? Can a kid
   do it every time after a few tries? Tune preloadTime, popVel, popPreload, popPitch, coyote. Also riding into it
   without a hop at low speed (stop) vs fast (over the bars) - fair or frustrating?
5. **Kicker + table**: hands-off at 25-30 km/h, then with air pitch (Up / Down) and a 180 (A/D in the air). Is the
   landing judgement fair (noseTol, tailTol, yawTol)? Does airLevel feel like help or like the bike steering itself?
6. **Pump rollers** (spot 4): hold Space on the faces, release on the backs (or C on the backs): does it feel like
   pumping (speed you earned) at pumpGain 45? Coasting them should die by the 4th roller.
7. **Bowl**: ride the walls, carve, pump the transition; check the camera in the bowl (minClear, followY).
8. **Manual** (Down held): the balance point with manualAssist 0.8 / 0.4 / 0; how long is fun? Loop-out fair?
9. **12 % slope** (spot 9): climb seated (slow grind), sprint up, come down: 50 km/h coasting at the bottom: too
   fast for a kid's game? (drag). **20 % (steep)**: getting off to push, and back on at the top.
10. **Sand / grass / roots / setts**: the surface changes should be felt (sink, grip, camera buzz on setts / roots).
11. **Crashes**: each cause once (wall, kerb, nose-down, sideways, trick held, wash-out): readable? The get-up time.
12. **Camera**: chase vs low vs far vs side; yawRate in tight turns, the vertical follow in jumps (no seasickness),
    roll 0.15, FOV kick; never inside the kicker / table.
13. **Gamepad**: stick expo, trigger pedal + brakes, A hop timing.
14. Perf: the lab's `phys` ms in the panel's state line (target << 0.1 ms a frame); one tab only.
