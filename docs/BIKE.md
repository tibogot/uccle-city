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
- **Landing**: judged at touch-down in THREE BANDS (feel round 1, below): clean / sketchy (a wobble, speed lost, the kid
  stays on) / bail, on the nose down / nose up vs the ground, the lean, heading vs velocity (sideways), the impact into
  the ground (+1.4 m/s crouched) and the trick still held. A flat landing costs forward speed; the down slope keeps it.
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
| pedal / sprint | W or Up / Shift (stand up) | RT / RB |
| rear brake (held = skid) / front brake | S or Down (ramps in) / Q | LT / LB |
| steer (lean) | A / D or Left / Right (ramped) | left stick X |
| lean forward / back (manual, nose, air pitch) | Z / X (or I / K) | left stick Y |
| crouch + hop (back slope: pump) | Space hold / release | A |
| pump | C | B |
| trick (air) | F | X |
| reset / get up / camera / pause / spots | R / G / V / P / 1-9 (start, kicker, table, pump, roots, bowl, kerb, sand, ...); 0 / N / B the BMX park (the Park folder) | Back / - / Y |
| get on / off the bike (claude/kid) | E (walk up to it; off when slow: stopped = it stands, rolling = it falls) | - |
| on foot (claude/kid) | W A S D / arrows walk, Shift run, Space jump, C crouch, mouse drag camera | - |
The arrows do exactly what W / A / S / D do and both sets always work (the owner rides with the arrows); one key table
(`KEYS` in viewer/bike/bikeInput.js) feeds the input, and the tests check that both sets give identical inputs and that no
key has two jobs. The controls card is shown at start, `?` toggles it (rule 14). Sounds: feel round 3 (off by default). On foot the same keys mean the same kind of
thing (move = pedal / brake / steer, Shift = run / sprint, Space = jump / hop, C = crouch / pump); E is free on the bike
(tools/kid/kidTest.mjs checks both, docs/KID.md).

## Constants (all panel sliders in the lab: `BIKE_RANGES`; surfaces in their own folder)
| group | constants (default) |
|---|---|
| body | mass 51 kg, wheelbase 0.95 m, cgHeight 0.95 m, wheelR 0.254 m, pitchInertia 0.30 m^2 |
| contacts | springK 170 /s^2, springC 8 /s, maxComp 0.11 m, fnMax 80, legRange 0.12 m, legRate 9 /s, pumpGain 45 |
| pedal | powerCruise 62 W, powerSprint 240 W, forceCruise 1.6, forceSprint 2.4 m/s^2, rollout 4.39 m, cadenceMax 128 rpm, drag 0.0055 /m |
| brakes | brakeFront 5.2, brakeRear 4.6 m/s^2, skidAt 0.85, skidMu 0.75, grip x1 |
| steer | maxLean 0.65 rad, leanRate 7, leanV0 1.2 / leanV1 5 m/s, lowSteer 0.75 rad, barV0 1.5 / barV1 4.5 m/s, yawResponse 12, tyreRate 25, skidYaw 1.6, washSlip 2.0 m/s, washTime 0.45 s |
| pitch | riderPitch 24 rad/s^2, pitchDamp 1.6, manualAssist 0.8, manualAngle 0.30 rad |
| air | airPitch 8, airPitchDamp 1.8, airLevel 8, airLevelDamp 4, airAlign 7, airYaw 9, airYawDamp 2.2 |
| hop | popVel 1.35 m/s, popPreload 1.8 m/s, preloadTime 0.28 s, popPitch 1.2 rad/s, coyote 0.08 s, hopLead 0.22 s, hopBuffer 0.26 s, kerbCatch 0.045 m, kerbCatchLoss 0.04 |
| steps | stepRoll 0.07 m, faceSlope 1.6, faceCrash 4.5 m/s, stepClimb 0.19 m, climbV 1.6 m/s, climbLoss 0.10, climbAngle 1.05 rad, rearClimb 0.25 m, rearBonk 0.10 |
| landing (sketchy / bail) | nose 0.35 / 0.96 (noseHard 0.38), tail 0.55 / 1.05, lean 0.35 / 0.85, yaw 0.35 / 0.80 rad, hard 5.0 / 9.8 m/s, trick 0.12 / 0.35; absorb 1.4 m/s, landLoss 0.25, wobbleTime 0.45 s, wobbleGrip 0.35, wobbleLean 0.14 rad, sketchyLoss 0.12, loopOut 0.85, endo 0.72 rad, autoSave 1, crashSpeed 4.8 m/s, crashSquare 0.6 |
| grind (round 2) | snapReach 0.45 m, snapAbove 0.30 / snapBelow 0.05 m, snapAngle 0.70 rad, snapTime 0.08 s, pegR 0.02 / pegOut 0.10 m, grindDecel 0.9 / rail 0.5 m/s^2, grindMinSpeed 1.0 m/s, stallTime 1.2 s, cornerExit 0.785 rad, cornerPop 1.0 m/s, grindAssist 0.8, grindTip 1.6, grindHold 2.5, grindSteer 2.2, grindBump 0.5, grindCrash 7 m/s |
| push | pushGrade 0.10, pushSpeed 0.85 m/s, pushDelay 0.8 s, walk 1.3 m/s, footSpeed 0.6 m/s, footLean 0.08 rad, respawn 2.2 s |

Surfaces (grip / rolling x g / sink per m/s / buzz): asphalt 0.95 / 0.010 / 0 / 2 mm, setts 0.72 / 0.024 / 0 / 14 mm,
dirt (packed) 0.70 / 0.018 / 0 / 8 mm, grass 0.55 / 0.060 / 0.06 / 10 mm, sand 0.42 / 0.12 / 0.25 / 3 mm,
roots 0.50 / 0.045 / 0.03 / 22 mm.

## Targets = the node checks (`node --import ./tools/heap/register.mjs tools/bike/bikeTest.mjs`, gate row `bike`)
95 checks, all pass (~8 s; feel rounds 1-4: 16 + 16 + 8 + 6 below, + 2 from the browser check of 2026-11-21): determinism (same input twice bit-identical; 60 fps vs an uneven 30-144 fps split = the same
steps and state); speeds above; never tunnels (kicker / table / kerb / rollers entered at 58 km/h: deepest wheel 0.11 m =
the bottom-out, 0 steps under; the wall at 58 km/h: never through, a crash; at walking pace: stopped, no crash); the
15 cm kerb: a timed hop rides onto the pavement, no hop at 2.5 m/s = stopped, at 22 km/h = over the bars; a 6 cm kerb
rolls; the drop off it is ridden; hills (12 % seated 1.97-3.18 m/s, 20 % pushed, no roll-back at a stop); sand (coast
decel 2.5 vs 0.29 m/s^2 asphalt, pedalling < 6 km/h, the lab's patch stops a coasting bike); landings (1 m level clean / rear
first ridden, 2.6 m crouched = ridden, the kicker at 29 km/h hands-off ridden out (sketchy: crouch to land it clean),
the table at 32 km/h, a held trick = crash; the bands: feel round 1); brakes (skid 10.8 m,
full front 4.4 m no endo, front + lean forward = endo); manual (assist holds it 2.9 s; no assist = loops out); pumping
(41 m at 4.9 m/s vs coasting 27 m, stopped); hop heights; the 25 cm log (full hop clears, riding into it stops);
turning (full lean at 14.5 km/h r 2.7 m, walking U-turn r 1 m, grass full lean + front brake washes out); 10 minutes of
random input over 4 seeds (finite, never under the ground, sane speed); 7 us a step in node; every constant a slider;
the lab's model + camera run in node with three (4 camera modes, 4,800 frames, finite, camera over the ground).

## Feel round 1 (2026-11-18, docs/bike/FEEL_RESEARCH.md items 1-3)
Two items from the research ranking (#1 zero-lag input + #2 forgiveness, #3 graded landings), started from its numbers
and tuned on the node checks. Why: kids read a missed input or a binary bail as "the game is unfair" (OlliOlli's
redesign); help nobody sees (Celeste) makes the game feel kind.

**1. Input read per step, acted on in that step.** Before, the lab read the keys once a frame and gave every 120 Hz
step of that frame the same input: at 30 fps a release reached the bike up to 3 steps (25 ms) off its real time, and a
tap shorter than a frame gap (key down and up between two reads) never existed. Now `BikeKeys` queues each key event
with its timestamp; `advanceBike(s, (lag) => input)` asks once PER STEP with that step's time
(`keys.sample(frameMs - lag * 1000, DT)`): each step sees the keys down at its time, the keyboard ramps advance per
step, a key pressed and released between two steps counts for one step (`keys.apply(now)` after the steps flushes the
rest). In the physics every input acts in the step it arrives (pedal, both brakes, steer, lean, the release's pop). The
gamepad is polled per step too (the browser refreshes its snapshot once a frame). Render interpolation stays one step.
Checks: 40 releases at 30 / 60 / 144 fps: 0 steps late every time (frame-latched: -3..0 / -1..0 / -1..0); a 25 ms tap between two 30 fps frames
hops; pedal / brakes / steer / lean / release: 0 steps.

**2. Forgiveness.**
- **Coyote hop** kept (0.08 s): a release 0.05 s after rolling off a ledge pops, 0.16 s after does not.
- **Hop buffer**: on a release with a kerb face ahead (`faceAhead`: a run of 2 cm rises steeper than faceSlope climbing
  more than stepRoll, scanned out to `v * (hopLead + hopBuffer)`), the pop is HELD (the kid stays crouched) until the
  front axle is `hopLead` 0.22 s from the face, at most `hopBuffer` 0.26 s; no face = no hold; a release earlier than
  that = an ordinary pop. On the lab's 15 cm kerb, a TAP hop (0.06 s preload) at 15 km/h: the releases that ride onto
  the pavement went from 0.10-0.36 s before the face to 0.08-0.48 s (+0.12 s on the early side: the research's number;
  the late side +0.02 s from the catch). A release 0.46 s before: blocked without, held 0.23 s and cleared with. (The
  research's "0.12 s early" became hopLead + hopBuffer because a hop's own air time already forgives releases up to
  ~0.36 s early: the buffer adds its 0.12 s past that edge.)
- **Kerb catch**: an AIRBORNE wheel (its bottom above the ground under it) that will arrive short of a kerb's top by more
  than it rolls (stepRoll 7 cm) and by at most `kerbCatch` 4.5 cm more gets the lift it lacks, spread over the steps
  before the face (at most 1.2 m/s, no snap; 4 % speed lost); met at the face itself it is lifted at once only to where
  it rolls (0.9 x stepRoll under the top, at most ~5 cm; half body, half pitch) and the tyre spring takes the rest. A wheel rolling on the ground never is (no hop = still blocked). The same tap hop rides kerbs up to 29 cm
  instead of 25 cm (+4 cm).
- Found and fixed on the way (they made the kerb window ragged, crashes in the middle of it): the rear bonk threw the
  whole bike up (front included) and pitched it nose-down into an endo, and bonked twice on one face (63 % of the speed
  gone): now applied at the rear contact, once per face. A front-only contact with no front brake and no forward lean
  now levels the bike (the kid brings the rear down onto the ground ahead; a stoppie is still front brake + lean
  forward). Landings and the endo / loop-out rules with a wheel AT a kerb's lip were judged against the face's slope
  (~45 deg): now against the ground over 0.5 m (`judgeSlope`).

**3. Three landing bands.** Each old limit split into a sketchy and a bail threshold (the research's 60 % / 140 %,
tuned on the drops): nose down 16 / 40 deg (was: bail at 26), nose up 29 / 57 deg (46), lean 19 / 44 deg (31), sideways
19 / 46 deg (31), impact 5.0 / 9.8 m/s (7.0; a flat drop of 1.3 / 4.9 m, crouched 1.7 / 6.0 m), a trick held 0.12 /
0.35. The worst rule's severity (0 at its sketchy threshold, 1 at its bail one) picks the band.
- **Sketchy**: a 3.2 Hz wobble fading over 0.45-0.72 s (lean + bar shake 0.14 rad x severity, side grip -35 %, no
  wash-out while it lasts), speed lost (sketchyLoss 0.12 x 0.4-1.0 on top of landLoss), and the kid's SAVE against what
  went wrong (nose down: weight back; rear first: weight forward + an assist toward the manual angle; sideways: the bike
  swings straight; leaning: the lean cut 30 %). While it lasts the endo / loop-out limits are the landing's bail limits.
- The rider IK shows it (viewer/kid/riderIK.js): `s.wobbleNow` swings the hips 5 cm sideways and counter-rolls the body
  0.30 rad, `s.wobbleW` crouches the legs (soaking it up). `s.lastLanding` = { band, severity, why, rel, vn, yaw, lean,
  ... }; the lab's telemetry shows the band, a sketchy landing gets a banner.
- Checks (each rule clean / sketchy / bail, at touch-down): nose 7 / 26 / 44 deg, tail 18 / 41 / 60 deg, sideways 10 / 30
  / 55 deg, lean 8 / 33 / 61 deg, impact 4.3 / 7.6 / 10.4 m/s; sketchy = wobble > 0.3, >= 5 % slower than clean, no
  crash. A trick let go just late = sketchy.
- Also fixed: the landing speed loss (landLoss) never reached the bike (the step's own velocity overwrote it).

**Nits.** The lab title said "phase 1 (placeholder rider + bike)": now "feel round 1". The foot down at a stop: the IK
target asked 102-104 % of the leg (the placeholder bike's higher seat: 104 %), so the foot hung 1.5-2.5 cm over the
ground. Now the bike leans toward it (`footLean` 0.08 rad as the foot goes down) and the hips drop off the saddle exactly
as far as the foot needs (`RIDE.footReach` 0.97): the leg at 92-94 %, the ankle on its flat-foot height (`footAnkle`
0.09 m: the kid's 7.5 cm ankle + the sole) on both bikes (kidTest checks it, and that the wobble moves the hips > 5 cm).

**Browser check (2026-11-18, the lab, telemetry per frame):**
- the hold: released 0.46 s before the 15 cm kerb at 14 km/h: held 235 ms, the legs keep crouching (pelvis 7 cm down),
  speed 3.94 -> 3.89 m/s (rolling only), then the pop clears it;
- the catch: the front wheel's height, 2nd difference per frame <= 3.4 cm through every catch (= a plain pop's arc).
  The first version lifted a late wheel 11.6 cm in one frame: now only to where it rolls (above);
- the wobble: on the bike the bars shake (7.5 deg) and it weaves a little (1-2 deg of lean at 13-29 km/h); on the kid
  the hips swing and the body counter-rolls; the IK error 0 mm, the limbs <= 2 cm / step relative to the pelvis. Found:
  the rider's stand / crouch / manual weights switched in one step (touch-down ends air, a rear-only contact starts
  manual): the hips jumped 3-6 cm in a frame on EVERY landing (clean too): now followed over RIDE.poseTime 0.07 s
  of the bike's time (a pose asked with no time passing, the tests, is taken as is);
- the foot down: the bike leans 4.6 deg, the ankle at 0.090 m, the leg at 92.5 %;
- the input: 64 fps 12 releases, 32 fps (CPU x6) 10 releases: 0 steps late; 10 fps (x14): 0 late, but one release
  fell in time the frame driver drops (its 8 steps a frame cap, by design). 144 fps can't be made on this 60 Hz screen:
  the node check covers it;
- also fixed: my own first lab edit put the landing banner between `if (riding) advanceBike(...)` and its `else parkStep(...)`,
  which parked the bike every frame (it could not move).

**Still for the owner** (feel, not checked here): the hop buffer's hold (help or felt as lag?), the catch's lift (smooth or a
hitch?), the wobble's look on the kid and the bike, the bands' fairness, the foot-down lean; the per-step input at real
frame rates (30 / 60 / 144 fps).


## Feel round 2: ride on everything (2026-11-18, FEEL_RESEARCH.md technique 5 + section 2)
**What.** An EDGE LAYER of the city's kerbs, ledges, benches, low walls, rails and stairs as tagged polylines, and a
third contact state on it: grinds and stalls. Why: a kid's BMX game lives on the street furniture; the research's rule
"do not grind against raw collision meshes at runtime": snap to an edge layer extracted from the data, as THPS (nodes)
and Skater XL (auto-detected edges) do.

**The layer** (`viewer/bike/bikeEdges.js`, pure JS, runs at tile load / in node; nothing hand-placed):
| source (the city's own data) | edge | top | grind |
|---|---|---|---|
| `data/tiles/<T>/surfaces.json` kerbs[] (UrbIS, cut at dropped kerbs) | kerb | ground + 13 cm (viewer/surfaces.js KERB) | no (under the pegs) |
| `data/furniture/<T>.json` benches[] | bench: the seat's front LIP (piece dims from cityFurniture KEEP) | y + 0.45-0.46 | yes |
| `data/gardens/<T>.json` segs[] wall styles, chained | wall (top 0.3 m wide) | y + h + coping 8 cm | 0.28-1.3 m: yes |
| `data/gardens/<T>.json` segs[] rail styles | rail | y + wall + coping + rail | 0.28-1.3 m: yes |
| `data/tiles/<T>/features.json` OSM highway=steps (no tunnels) | stair: a RAMP for the wheels | the ground beyond each end | no |
| (no city data: OSM has no handrail tags in Uccle) | handrail along a flight (`handrailEdges`, the lab's) | + 0.9 m | yes |
Storage: flat typed arrays (segments xyz, line / prev / next per segment, type / height / width / grind per line) and an
8 m grid listing each segment in every cell its box + 1 m touches (a query = one cell's list). **Tile D6** (the most
stairs in the city): 29 kerb lines (5.4 km), 11 benches, 116 wall lines (405 m grindable), 198 rail lines (236 m),
6 stairs: 3,715 segments, **177 KB**, built in 18-50 ms; a query **0.3 us**.

**Stairs** (`withStairRamps`): inside a flight's width the ground is a straight ramp between the grounds just beyond
its two ends, its ends ROUNDED (C1 fillets over +-0.6 m) and its sides blended over 0.35 m; the drawn steps stay (an
invisible proxy, as the research says). Down the lab's 8 x 15 cm flight: 1.1 g at 2 m/s, 1.6 g at 4 m/s (the raw steps:
82 g and over the bars at 4 m/s); up: the kid gets off and pushes (also fixed: on a 44 % ramp the push rule never
started, the bike rolled back first: it now counts pedalling uphill while stopped or rolling back).

**Grinds and stalls** (`bikePhysics.js` trySnap / grindStep / grindExit):
- SNAP only airborne and FALLING, the pegs (hubs) between 5 cm under and 30 cm over the top, the bike's middle within
  0.45 m of the edge (+ half its top's width), the velocity within 40 deg of it, never within 0.15 s of a hard collider
  hit (no "sucked onto the bench"). The pose blends onto the edge over 80 ms (biggest step 1.5-2 cm over the motion).
- Pegs stick out of the hubs: the bike rides BESIDE the edge (half the top's width + pegOut 0.10 m, on the side it came
  from), the wheels hang below the top; a hop only lifts the pegs over it.
- Along the polyline: slope gravity, drag 0.9 m/s^2 (stone, wood) / 0.5 (steel rails); slower than 1 m/s = a STALL
  (holds 1.2 s, then drops off); a bend <= 45 deg is followed, a sharper corner is left straight on (with a 1 m/s pop off
  the corner), the line's end is left.
- Balance: tips by itself (1.6 /s), a helper pulls it back (grindAssist 0.8, a slider: kid-friendly), the edge's
  unevenness pushes it (deterministic), the kid leans against it (steer); lost = off to that side (a crash only over
  7 m/s). A hop (Space) leaves upward, toward the steer. Pedals level, legs crouched.
- Just off a grind the edge's own low piece (bench, wall) is not a wall for 0.3 s (the wheels hung beside it under its
  top); the bench collider is now its seat (0.46 m) + a backrest strip (0.85 m), not one 0.85 m block.
- The rider (riderIK): crouched (0.55), a little up, hips out to the low side, the body leaning against the fall; the
  pose weights eased (round 1's poseTime) so the snap and the exit don't pop. kidTest checks the grind poses' reach.

**The lab**: a street at x 100-140: a street bench, a 40 cm ledge (10 m, a 30 deg bend, 4 m, a 90 deg corner), 8 stairs
up to a landing with a handrail and a ramp back down, built as the city's DOCS (`LAB_FURNITURE`, `LAB_GARDENS`,
`LAB_FEATURES` in bikeGround.js) through the same extractors; spots `bench`, `ledge`, `stairs`; every collider drawn
as a prism of its ring (bent ledges, rotated benches), benches as benches; the edge layer drawn (panel "show the edge
layer"); the telemetry shows "grind bench 1.2 m · balance". **`?city=D6&at=x,z`**: a real spot of a tile
(`bikeCitySpot.js`): its DTM, the sidewalks / medians raised 13 cm as real kerb FACES (rasterised at 8 cm, nearest),
dropped-kerb ramps +4 cm, buildings, garden walls / rails / hedges, benches, the stairs as ramps, the edge layer, spots
`stairs` / `bench1-3`; 160 m square, built in 110-330 ms, 4 MB raster.

**Cost** (node, quiet machine): a step 5.5 us on the lab ground, **8.5-9.6 us on the D6 spot** (its colliders: the
shared colliders.js against 239 buildings / walls / benches, ~28 %; its height 70 ns), **~1 us while grinding**. Budget
< 20 us. (Timings doubled to 20-28 us while another agent's 8-worker collider audit and a rendering tab shared the CPU:
the city check takes the best of 3 runs.)

**Checks** (bikeTest section 15, 16 checks): D6's extraction counts = its docs' kerbs / benches / stairs, walls + rails
> 100 m grindable; memory + build time; the query time; a drop onto the bench snaps, rides, leaves at its end, no jump;
no snap rising (only after the apex) / at 50 deg / 0.55 m off / pegs 15 cm under; the ledge's 30 deg bend followed, the
90 deg corner left; balance (no helper falls off after 11 m, leaning against holds, the helper holds); stall then off,
hop out; AS A PLAYER from the spots: a full hop at 3-5 m/s released 0-0.55 s before: 33 / 39 bench and 36 / 39 ledge
hops grind, 0 crashes; the stairs down (ramp) and up (pushed); D6's own flight ridden down in the city spot; the costs.

**Also fixed**: round 1's foot-down lean kept steering the bike as it pulled away (a 7 cm drift off the line in 6 m): it
now applies only below footSpeed.

**Browser**: the lab street checked (a player's hop onto the bench: snap smooth, limbs <= 2.2 cm / step relative to the
pelvis, IK error 0, a clean landing off its end; screenshots side + chase). NOT yet checked in the browser (stopped: the
browser went to another agent): the D6 city spot's look (the lab loads it; node rides it), the ledge corner and the
stairs at real frame rates.

**Next**: per-step stair bumps (sound + a small kick), wallrides, kerbs as ride-along edges (tyre slides), rails along
the city's stairs from the hero models, the edge layer into the city's tile loader (`viewer/tileData.js`).

## Feel round 3: sound (2026-11-18, FEEL_RESEARCH.md technique 11: "the single biggest missing feel item")
**What.** `viewer/bike/bikeAudio.js`: the BMX's sound, all procedural Web Audio (the project's way: docs/SOUND.md, the
DSP kit viewer/audio/util.js). **No sample files** (nothing to credit: CREDITS.md unchanged); the textures are baked in
memory when the sound is switched on. **OFF by default** (project rule): the speaker button (top centre: the city's ONE sound
switch, viewer/audio/soundGate.js, rule 42; it replaced the lab's own panel switch when claude/foundation was merged in;
the click is the browser's gesture); off = no AudioContext at all, then a suspended one: no audio work.

**The sounds and what drives them** (`soundParams(s, B, mem, out)`: PURE, the bike's state -> the parameters; node-tested):
| sound | driven by | how it is made |
|---|---|---|
| freewheel ratchet | (rear-wheel turns - cog turns) x 36 points of engagement: coasting at 4.7 m/s = 105 ticks/s; pedalling = 0 (the cog turns with the wheel); stopping the pedals: the ticks rise as the cadence decays | two baked loops of pawl clicks (3 steel modes 3.1-7.3 kHz), 16 and 128 a second, played at rate / 16 or / 128, crossfaded over 30-60 Hz |
| rolling, per surface | each wheel on the ground adds half its surface's voice; level with speed (from 0.3 m/s, full at 7 m/s); the loop's rate = v / the surface's reference speed; none in the air / stopped / grinding | one 1 s loop per surface: asphalt (smooth pink hiss + a 130 Hz hum), setts (a stone-and-tyre knock every 10 cm, jittered), dirt (crunch grains 1.5-5 kHz), grass (soft swish), sand (dense hiss + grains), roots (irregular low knocks) |
| chain / pedals | pedalling x cadence (its loop = one crank turn at 60 rpm, played at cadence / 60); standing: +50 % | 44 roller ticks a turn + a bottom-bracket knock at each power stroke + chain hiss |
| skid | a locked rear with speed, a tyre sliding sideways (slip), a locked front | rubber rasp with ~180 Hz stick-slip; band-passed 2.1 kHz on asphalt / setts (a squeal), 950 Hz on loose ground (a rasp) |
| grind scrape | the edge's material (round 2's layer): rail = steel on steel, bench = wood, ledge / wall / kerb = stone; level with the grind speed (a stall ~ silent) | steel: ringing modes 1.9-7.8 kHz + grit; stone: grit + grains; wood: lower band + fibrous ticks |
| landing thud | once per landing, by BAND (round 1): clean = a low thump, sketchy = a thump + the bars / chain rattling, bail = body + bike + a slide + clatter; level with the impact speed | baked one-shots (modal) |
| kerb knock | a front wheel blocked by a face, a rear bonk, a kerb catch | tyre-on-stone knock (170 / 420 Hz + a 2.5 kHz click) |
| peg clank | a grind's snap, by material | steel / stone / wood one-shots |
| crash | a crash that is not a landing's bail (a wall, a wash-out) | the bail one-shot, lower |
Tunables: `SOUND` (volume, roll, rollV, tick, teeth, chain, skid, scrape, thud, knock, clank), the lab's "Sound" folder.

**The graph (BikeSound)**: built once on the first switch-on: 13 looping voices (6 rolling, 2 ratchet, chain, skid, 3
scrape), each a looped buffer -> (a filter) -> a gain -> master -> a gentle compressor; their gains / rates moved only
when they change. One-shots: a pool of 4 persistent gains; Web Audio cannot restart a buffer source, so each EVENT makes
one AudioBufferSourceNode (a few a second at most, never per frame; the oldest is stolen past 4). The 20 textures
(3.1 MB in memory) are baked ONE PER MACROTASK after the switch (slowest 25-35 ms on a busy laptop, all within ~0.2 s):
switching on never freezes a frame; each voice starts when its texture is ready.

**Checks** (bikeTest section 16, 8 checks): the ratchet (= turns x teeth coasting, 0 pedalling, rising after), the
chain rate (= cadence / 60); rolling per surface (each its own voice, louder + faster with speed, setts > asphalt, none
in the air / stopped); skid (squeal vs rasp, none riding straight); the scrape by material, a stall near silent; the
events once each (landings clean / sketchy / bail, no double crash on a bail, a kerb knock, a wood clank + scrape on the
bench, a wall crash) and a new state is not an event; the textures (finite, levelled, deterministic one by one =
together, each < 50 ms, < 4 MB); the graph on a stand-in AudioContext (13 + 4 nodes once, then exactly one source per
event over 8 s of riding, nothing per frame); **off: no context, 0 GC over 1e6 updates; the mapping: 0 GC over 1e6
calls** (~150-200 ns a call).

**Found on the way (the physics step's garbage)**: counting garbage collections showed stepBike allocating ~350 bytes
a step. Why: `Math.hypot` is not inlined by V8 (it boxes every result), and stepBike is too big for V8's inlining
budget, so its small helpers (clamp, smooth, judgeSlope) box their double arguments. Fixed the two biggest: `hyp()`
(sqrt) instead of Math.hypot in the bike's code, and round 2's two judgeSlope calls a step made lazy: 170 -> 95 young
collections per million steps (a ~1 ms scavenge about every 1.5 min of riding). The rest needs stepBike split into phase
functions (each small enough to inline its helpers): a later job.

**Needs the browser** (not done: no browser this round): listening (levels, the ratchet's crossfade, the surface
textures at speed, the scrape materials), the first switch-on's bake in the page.

**For the owner: what to listen for** (the lab: the speaker button on; the Sound folder has every level):
1. Coast after pedalling hard on the plaza: the ratchet should come in as the pedals stop, a fast buzz at speed slowing to
   single ticks as you roll to a stop. Does the crossfade between the two tick loops (around 30-60 ticks a second, ~1.5 m/s)
   sound like one sound?
2. Ride each surface at 10 and 25 km/h (spots: start = asphalt, kerb = setts, pump = dirt, sand, roots, the grass beside
   the lanes): does each read as its ground, and does the pitch rising with speed sound natural or "sped-up tape"?
3. Pedal seated, then stand (Shift): the chain and the bottom-bracket knock; too loud / too clicky?
4. Skid (S held at 20 km/h) on asphalt (a squeal) and on dirt (a rasp).
5. Grind the bench (wood), the ledge (stone) and, from a drop, the handrail (steel): three different materials?
6. Land clean, sketchy (nose down a bit) and bail: three different thuds; a kerb knock riding into the kerb slowly.
7. The overall mix (volume 0.7) against your speakers / headphones; anything that fatigues after a few minutes.

## Feel round 4: the rider's weight, the camera, the zero-garbage step (2026-11-18, FEEL_RESEARCH.md #4 and section 3)
**1. The rider's weight** (`viewer/kid/riderIK.js` `weight()`, RIDE sliders in the lab's Kid folder). Physics first,
animation as a target: everything below is driven by continuous physics values, never a clip or a switch.
- The PELVIS rides a critically damped spring (no bounce) in the bike frame: fore-aft and lateral driven by the frame's
  own accelerations (the body lags: a hard front brake throws the hips 3.7 cm forward, a turn swings them out); the
  vertical drive is the frame's UPWARD acceleration and the compression beyond the resting sag, low-passed, and never
  upward: a critically damped spring's impulse response is never negative, so a drive that only pushes down can only sink
  the hips (a 1 m drop: 5 cm), never bounce them over rest however the suspension rings (the bike's own springs have a
  damping ratio of ~0.3). Soft limits 7 / 6 / 4 cm.
- The UPPER BODY lags on a slower spring (1.6 Hz): pitches forward under braking, rolls in a turn; the hands stay on the
  grips (the elbows take it).
- The HEAD is stabilised: its own smoothed yaw along the bike's PATH (the velocity) and into the turn (yaw rate x 0.35 s),
  the eyes nearly level, looking down a descent; never more than 0.7 rad from the bike's heading.
- Also: the bars as drawn never turn faster than 4 rad/s (a full lock at a standstill swung them 0.08 rad in a step,
  the hands with them).
- kidTest (2 new): driven by the physics step by step through a 1 m drop, pedalling, a hard front brake and a turn: the
  limbs move at most 1.5 cm a step relative to the pelvis, IK error 0.00 mm; the landing sinks the hips 5 cm with 0 mm of
  overshoot, the brake moves them 3.7 cm forward.

**2. The camera** (`viewer/bike/bikeCamera.js`: `CameraRig`, plain numbers and no three.js, node-tested; `BikeCamera` applies it).
- Speed sense: FOV +7 deg and the camera a little lower / closer from 3 to 12 m/s, eased over 0.6 s (64 -> 68.6 deg at
  30 km/h, at most 0.04 deg a frame).
- Looks ahead along the velocity (1.2 m + 0.25 s of travel) and INTO the turn (the yaw rate x 0.3 s): in a steady turn the
  look point is 0.68 m to the inside of the bike, both ways.
- The landing dip: a kick into a critically damped spring (no bounce): 4 cm for a 1 m drop, 6.7 cm for 2.6 m, back in
  ~0.25 s; nothing on the pump rollers.
- Never inside things: the line of sight from the kid's head to the wanted spot is marched against the colliders
  (`env.solidAt`: buildings, walls, benches, garden walls, posts, trees) and the ground (kerbs): the camera comes in at once,
  eases back out (3 /s); the ground under it is sampled at 5 points (a kerb's top beside it counts) and joined by a SMOOTH
  maximum (never under minClear, no kink where it starts holding the camera up). The side camera riding beside the wall
  (it would sit behind it), the side / low cameras along the kerb face, the chase onto the bench, the far camera down the
  stairs: 0 frames inside a solid, 0 under minClear (it pulled in on 163 frames).
- Smooth down the stairs and onto a grind: no jump (< 0.5 cm beyond the motion), vertical acceleration <= 15 m/s^2 (the
  hard clamp gave 54-70). For the grind, the snap's height now settles over twice the plan's blend (160 ms: the pegs come
  down onto the edge); the snap's biggest step went from 2.0 to 0.7 cm.
- bikeTest (5 new): speed sense, looks into the turn, the dip, never inside, smooth.

**3. The zero-garbage step.** Round 3 found ~350 bytes of garbage a physics step. Why: V8 inlines a function's small
helpers only up to a budget per optimised function; stepBike in one piece ran out, and every call past it boxed its double
arguments and results. Done:
- stepBike split into five functions (the legs / hop, the face test, the contact forces, the motion, the settling), their
  shared values in one preallocated scratch object (its numbers initialised as doubles: stored unboxed);
- the physics never calls the ground with doubles: `groundAt(env, out)` with the coordinates in a scratch object; ground
  queries and height functions may carry an OBJECT form (`.P(pt)`: pt.x, pt.z in, pt.h out), which `groundQuery`, the city
  spot (DTM, raised surfaces, the surface id) and the stair ramps now have; the five height samples come from one call site;
- the face tests take their inputs in a scratch object; the colliders' prepare takes no double;
- the bike's collider pass rejects far items inline before the shared tests; the shared `polyBoxOverlaps`
  (viewer/drive/colliders.js) takes its box as one object (same arithmetic: tools/collide/wallTest.mjs and
  tools/moto/physicsTest.mjs give identical output).
Result (`tools/bike/zeroGarbage.mjs`, a fresh process): young collections per million steps: **flat ground 0-1** (the
counter's own noise; was ~170), **the D6 city spot 4-6** (was ~370; what is left is the shared colliders' closures while
actually touching a wall). A step now costs **1.3 us** on flat ground and **4.1 us** on the city spot (5.5 / 8.5 before).
The state hash is unchanged (the same arithmetic, bit for bit). The lab's procedural test ground still allocates (its
feature closures are called megamorphically: a test ground, not the city's).

**Needs the browser** (on the coordinator's go): the weight on the kid (landings, braking, turns), the head; the camera's
speed sense, turn look, dip, the pull-in at walls / kerbs (side mode), the stairs.

## Browser check after the foundation merge (2026-11-21, the lab + ?city=D6, silent)
The branch's first browser turn since rounds 2-4 (claude/foundation merged in, converted: gate rows `bike`, `kid`, `bmx`
in tools/audit/gate.d, rules kid-bike-meets-numbers / kid-keeps-ual-rig). Driven by key events from a script, 60 Hz
screen, one tab; frames 16.7 ms median, p95 18-19 ms, worst 22-31 ms (another job's gate was running on the CPU); the
lab's `phys` 0.08-0.19 ms a frame (physics + mount + rider; the target "<< 0.1 ms" is met only on a quiet machine).
Console: 0 errors (the one warning, PCFSoftShadowMap, removed). Found and fixed:
- **A held rear brake at a stop reared the bike up and looped out** (S held after braking to a stop: pitch 0 -> 48 deg in
  0.6 s, "looped out"). Why: the brake's pitch torque used `sgn(vF)` with the FULL brake force; at a stop vF dithers
  around 0 (-1e-6 on a tiny roll-back) and every negative sign flipped the whole torque nose-UP. Now scaled by
  vF / 0.3 under 0.3 m/s (a held brake at rest carries no force). Check: "a brake held at a stop" (old code: 49 deg, 3 crashes).
- **The camera modes leaked**: after cycling V through `side`, `chase` stayed a side camera (cfgNow merged the modes into
  one scratch object and `side` was never reset). Fixed (MODE_RESET).
- **The side camera snapped 1.8-2.1 m in one frame** entering the lab's walled stairs (the pull-in is at once, never
  inside). Now the line of sight is also tested where the bike will be in `pullAhead` 0.3 s (moved by the ground's
  change: down a flight it drops too) and the camera eases in early (`pullIn` 8 /s): biggest pull-in a frame 26 cm.
  Both camera items: check "modes cycle cleanly; the side camera eases in before the stairs' walls"; sliders in the
  Camera folder.
- **D6: riding down the flight always ended over the bars**: the flight's foot is 1 m of grass short of the pavement's
  BACK edge, a 13 cm face. The city spot now eases a raised surface (sidewalk / median / square) down to the ground
  OUTSIDE the street surfaces over `verge` 0.6 m (bikeCitySpot.js vergeRaise); a kerb (raised against the roadway)
  stays a face to hop. Down the flight now: ridden, over the pavement, off the kerb onto the road.
- The sound follows the speaker button (rule 42) instead of the lab's own switch (the merge's meta check).
- The zero-garbage check now takes the best of up to 2 fresh processes: about 1 run in 15 measured the D6 spot at 12
  young collections (the usual 6, budget 8) with the brake fix in, from the same code (V8's tiering picks per process).
Seen working: on foot -> E -> riding; the kicker (clean, sketchy "over the bars" hands-off at 20 km/h, bail with Z in
the air, sketchy "looped out" with X); a timed hop onto the 15 cm kerb at 15-17 km/h (a ~0.3 s window with a 0.35 s
preload; early or late = "front wheel hit the kerb"); bench + ledge grinds from the spots at 4 m/s (3 / 3 each, 0
crashes; the ledge grind slows to a stall after ~8 m, then drops off); the lab stairs down (no air, no crash); the camera
in all 4 modes along the ledge, the stairs, the bench and the wall: 0 frames inside a solid. NOT checked: the sound
(stopped on the owner's request: the owner heard it and found it annoying; the node checks cover the graph) and the
rider's weight by eye beyond stills.

## Forgiving falls (2026-11-25, rule bike-falls-on-hard-hits, gate row `bikefall`)
Owner, after the lab: "it's cool but it's too easy to fall. With the BMX we should fall only if we hit something hard, but
it should go easily over bumps and all."

**Measured first** (`node tools/bike/casualRide.mjs [--seeds N] [--spot name]`): a CASUAL keyboard rider - W held the whole
time (Shift for 30 % of the seeds), the steering in steps (A / D held while the line drifts, through the keyboard's ramp,
a 0.12-0.32 s reaction, random thumb taps), no lean input, the hop late or never - rides every lab spot over 40 seeds
(kerbs up / down square and at 25 / 45 deg and a side face at 30 deg, the new cobbled lane, bump field and three small
drops 25 / 40 / 60 cm at x 44-75, roots, the pump rollers, sand straight and turning, the 12 % / 20 % slopes, the kicker,
the table, the bowl across and carving, the plaza with its wall, posts, car and log). Every crash logged with its cause:

| ride (40 seeds each) | old tuning: crashes | causes | now |
|---|---|---|---|
| kerb up square / 25 deg / 45 deg | 38 / 37 / 38 | front wheel hit the kerb | 0 / 0 / 0 |
| kerb side face, 30 deg | 33 | front wheel hit the kerb | 0 |
| kerb down square / 45 deg, cobbles, bumps, roots, sand straight, kicker, table, bowl across, small drops | 0 | - | 0 |
| pump rollers | 1 | looped out | 0 |
| sand turning | 10 | washed out 6, landed sideways 4 | 0 |
| slope 12 % up + down / down weaving / steep 20 % | 2 / 15 / 1 | landed sideways (+ 1 washed out) | 0 / 0 / 0 |
| bowl carving | 11 | landed sideways 8, looped out 3 | 0 |
| plaza wandering (real hits allowed) | 20 | landed sideways 11, wall 6, over the bars 2, kerb 1 | 6: wall 4, kicker side 1, over the bars 1 |
| **all** | **206 (1.49 a minute)** | kerb 147, landed sideways 40, washed out 7, wall 6, looped out 4 | **6 (0.05 a minute)** |

(A first, twitchier version of the rider - wider weaving, no look-ahead on the yaw - measured 2.26 a minute on the old
tuning, 146 of them "landed sideways": the same causes, more of the air one.)

**Why each one happened, and the change** (all in viewer/bike/bikePhysics.js, every constant a lab slider):
1. **Kerb faces**: any face over stepRoll (7 cm) stopped the front wheel, over 3.2 m/s = over the bars, at any angle.
   Now a face up to **stepClimb 19 cm** met within **climbAngle 60 deg** of square at more than **climbV 1.6 m/s** is
   ROLLED UP: a grounded front wheel gets a small bar pull spread over the steps before the face (no hitch: one cheap
   probe ahead a step, the scan only when the ground rises there), at the face it is lifted to where it rolls (as the kerb
   catch); a thump - **climbLoss 0.10** of the speed at 19 cm, a small wobble. Also when the contact swings into the face
   by the bike PITCHING (the pull moves the contact under the hub forward: the velocity's face test did not see it, the
   general one stopped the bike dead). An oblique face (past 60 deg) is a GLANCE: the speed into it taken out, the bike
   turned along it, a wobble. Higher faces square at speed stay a crash (**faceCrash 4.5 m/s**, was 3.2). The rear wheel
   now rolls up the same way (lifted to where it rolls; the old climb speed at the rear contact, sqrt(2 g h), threw the
   bike nose-down into the air: 7.8 m/s into the kerb landed 3 m on, nose down 56 deg); **rearBonk 0.45 -> 0.10**.
   A wheel's spring on a face no longer pushes it back: a contact's slope is JUDGED (`judgeSlopeP`: a smooth transition
   keeps its slope up to 76 deg, a face uses the ground over half a metre, a crest its own slope) - every wheel on a kerb
   face was braked by the face's 45 deg normal (-10 % of the speed per wheel). Walking pace still stops at a 15 cm kerb.
2. **Landed sideways** after small hops: the steer key held from the ground (the casual rider was turning) spun the bike
   at airYaw 9 rad/s^2 the moment the wheels left, and the yaw rate kept turning the heading after touch-down while the
   path did not (a slide, then "washed out" under a landing judged clean). Now a SPIN needs the steer pressed IN the air
   (`spinArm`: a key still held from the ground does not spin until it is let go) and held past the ramp's 0.85 (~0.25 s:
   a correction tap is not a spin); with no spin the heading is drawn to the flight path (**airAlign 7**); the tyres stop
   the spin at touch-down (yaw rate x 0.3).
3. **Washed out in sand**: the tyre's friction circle counted the rolling resistance and the sand's sink as tyre force,
   leaving little side grip; and the handlebar turn at walking pace was not grip-limited (a full lock at 3 m/s asked
   8.8 m/s^2 of a 4.1 m/s^2 surface). Now the circle shares only brakes + drive, and the yaw never asks more than the
   surface's grip (a skid still steers past it on purpose). A wash-out is a real slide: **washSlip 2.0 m/s for washTime
   0.45 s** (was 1.6 / 0.3).
4. **Air attitude**: **airLevel 8** (was 4), critically damped without lean input (**airLevelDamp 4**: the old one
   overshot into a nose-down landing). Z / X still override it (Z held off a 1.5 m ledge = over the bars).
5. **Auto-save** (**autoSave 1**, no lean input only): a wheelie the kid did not ask for (Shift, a bump, a kerb) past the
   manual's angle is put back down; rolling off a drop (the rear still on the lip, the nose going down) he pulls the bars
   up. X held = his own manual (the old rules: loop out past loopOut).
6. **Bail bands where a kid really falls**: nose down 20 / **55 deg** (was 16 / 40), lowered by a hard impact (**noseHard
   0.38** rad from vn 3 to 7 m/s: a 2 m drop onto the front wheel bails at ~36 deg), nose up 31 / 60 deg, lean 20 / 49 deg,
   sideways 20 / 46 deg, impact unchanged; **endo 0.72** rad (was 0.62).
7. **Walls**: a crash needs the speed INTO it over **crashSpeed 4.8 m/s** AND a square hit, within acos(**crashSquare
   0.6**) = 53 deg (rule 40's number); a glance slides along it.
8. Found on the way: the shared `polyBoxContact` (viewer/drive/colliders.js) made three closures and boxed their
   arguments on every wall contact: with the kerbs rolled, the zero-garbage check's D6 ride reached the pavement and the
   house walls (25 young collections, budget 8). Rewritten closure-free (a scratch object; the same arithmetic, the same
   candidate order: tools/collide/wallTest.mjs and tools/moto/physicsTest.mjs print identical output): **4**.

**Checks** (`node tools/bike/forgivingTest.mjs`, gate row `bikefall`, 22 checks, ~3 s): the casual rider per group over
24 seeds: <= 0.05 crashes a minute (slopes 0.1) and no soft crash anywhere; the hard hits still crash (a wall / car / post
head-on at 6 m/s; landings nose down 70 deg, sideways 55 deg, 2 m onto the front wheel at 40 deg, 5.5 m flat; Z held off
a ledge; off a 2 m ledge into a wall; a 30 cm face at 22 km/h) and the gentle ones do not (a wall at 4 m/s or at 70 deg
from square, a 2 m level drop, nose 30 / sideways 30 deg = sketchy, the kerb at walking pace = stopped); skill kept (a hop
over the kerb loses 12 % of the speed, rolling it up 18 %; at 34 km/h the kicker hands-off is sketchy, crouched clean;
the casual rider's kicker landings ~half sketchy). bikeTest: the kerb checks now say "rolled up at 22 km/h (a thump),
a 30 cm face at 22 km/h = over the bars, walking pace stops, 2.5 m/s rolls"; the hop-buffer / kerb-catch checks run on a
kerb that must be hopped (stepClimb 0); the landing-band checks with the air assists off (the attitude set is the one
judged).

**For the owner to feel**: the kerb roll-up (a thump + a wobble: enough feedback, or too soft?), the air heading drawn to
the path (too much "help"?), the auto-save on Shift wheelies. Known: riding off the SIDE of the table can leave the bike
hanging on its 1.2 m side face (no crash, it stops: R / G).

## The BMX park (2026-11-25, rule bike-park-rideable, gate row `bikepark`)
Owner: "the lab should have ramps and other fun things to test the BMX". `viewer/bike/bikePark.js` (pure JS: features for
the lab's ground, colliders, edge lines, wall-ride walls, spots), south of the old lab (z 116-232):

| feature | where | what | spot speed |
|---|---|---|---|
| wooden kickers small / medium / big | x -62 / -56 / -50 | 0.45 / 0.8 / 1.2 m kickers (30 / 34 / 38 deg) over a 1.0 / 1.8 / 2.7 m gap to a landing (deck + a long gentle down ramp) | 6 / 7 / 8 m/s |
| dirt doubles | x -37.5 | 4 doubles (0.5 m, 24 deg lips, 0.8 m gaps, 20 deg backsides), rhythm 7.9 m | 7 m/s |
| whoops | x -26.5 | dirt rollers 2.4 m apart, 22 cm | 5 m/s |
| pump track loop | (-14..10, 208) | a dirt stadium: rollers on the straights, two concave berms | 4 m/s |
| berm loop | (34..60, 208) | a concrete stadium with two big berms (2 m at the outside edge) | 5 m/s |
| quarter pipe | x 32-40 | R 2.4 m to 80 deg, 2 m tall, a deck, a steel coping | 7.5 m/s |
| mini half-pipe | x 44-50 | two 70 deg quarters (1.3 m), 4 m flat bottom | 4.5 m/s from the bottom |
| spine | x 54-60 | two 55 deg quarters back to back, a coping on the peak | 6.5 m/s |
| funbox + rail | x 64-72 | 25 deg up / 4 m table at 0.6 m / down, a flat rail on the table | 5 m/s |
| stair set + handrail | x 76-82 | a 10 % ramp up to a 0.75 m platform, 5 stairs down (a ramp for the wheels), a grindable handrail | 0 |
| long rail / ledge | x 87 / 94 | a 12 m flat bar at 0.35 m; a 10 m 0.45 m concrete ledge (a garden wall + coping, as the city's) | 4 m/s |
| wall ride | x 102-105 | a 3 m wall and a small wooden kicker angled 22 deg toward it | 7 m/s |
| drop-in tower | x 89-95, z 160 | a 3 m platform with railings, a roll-in (convex 1.5 m, 45 deg, concave 4 m) | 0.5 m/s |

The lab: the park's ground is ONE merged mesh (wood / concrete / dirt colours), the rails, their posts and the coping
one merged tube set, the wall and the railings as collider prisms (one per material); every feature rectangle rounded to
whole metres (the base ground is a 1 m grid with the feature cells cut out: a fractional edge left a strip of sky).
**Spots**: the panel's **Park** folder (a "go to" list + a button per feature; each spawns at the feature with its
speed), keys **0** (the park) and **N / B** (next / previous feature), `?spot=quarter%20pipe` in the URL.

**The physics it needed** (viewer/bike/bikePhysics.js; constants in `BIKE_PARK`, the panel's "Bike: park" folder):
1. **Faces vs transitions**: a face is an ABRUPT rise (a 2 cm rise steeper than faceSlope AND `faceAbrupt` 2.5 x the
   2 cm before it); a quarter pipe's wall is steep but smooth (the face scans read the height alone, `heightAt`).
2. **The wheel's radius on slopes**: a wheel touches a slope R / cos(slope) under its hub (`s.rk`, eased).
3. **ATTACHED transitions** (`attachPhase`): on a smooth slope steeper than `transSlope` 0.25 with both wheels on it (each
   wheel's slope within 25 deg of the chord between them, faster than 1.2 m/s) the pitch IS the chord (slewed 0.04 rad
   a step) and the speed is carried along it (gravity, drive, brakes, rolling) - the springs alone pitched the bike over
   on a 70 deg wall. REAR-LED: once the front is over a crest, the bike follows the rear's ramp until the rear leaves it,
   so it leaves at the lip's angle (every jump came up short before). Faces never attach; neither does a slow push.
4. **Vert air**: leaving a climb steeper than `vertSlope` 50 deg toward a DECK (not a spine's far side, not a landing),
   the speed out of the pipe goes (`vertBack` 0.4 m/s back in) and the kid turns the bike 180 deg about its own up axis
   over the flight (nose up -> laid on its side at the top -> nose down: `vertPose`, the model's Euler order solved),
   landing back on the wall; the side from the steer, else the carve. **Kick turn**: out of speed on a > 42 deg wall,
   the same turn from a small hop (a half-pipe too tall for the speed: back and forth, never a stall on the coping).
5. **Berms**: the ground's sideways normal pushes the bike (`aL`: a bank into its turn, a cross slope down itself); a
   bank leaned into raises the lean limit (`bankLean` 0.6 x the bank) and the grip's yaw cap.
6. **Wall ride** (`trySnapWall` / `wallStep`): airborne beside a wall-ride wall, along it within 40 deg, > 3 m/s: the
   bike lies over 72 deg with its wheels on the wall, `wallGrav` 0.35 g, a little lift on (`wallLift`), off at the end /
   low / slow / 1.6 s / a hop, pushed off 1.2 m/s and stood up fast before the wheels land.
7. Also: an endo needs momentum (> 2 m/s) or the front brake (rolling into the small kicker's landing at 1.6 m/s threw
   the kid over the bars); no foot down on a > 31 deg wall.
8. **BIKE under 128 properties**: the park's 15 constants in BIKE made V8 allocate on every step (flat ground 0 -> 16
   young collections a million steps); they live in `BIKE_PARK`; the bike's park state in `s.park`.
9. **Zero garbage, again**: the D6 check's ride now rolls kerbs and meets walls all the time (343 collections at first).
   Removed: Math.hypot in the shared polyBoxContact / circleBoxContact (`hyp2`), their closures, `itemContactB` /
   `heightClearP` / `bikeHitC` (no doubles across a call, the impact record reused), the stair ramps' `blendRampP`,
   settlePhase's helpers past V8's inline budget. Now 10-13 (budget 14: ~1 scavenge every 10 min of riding); left: the
   face scans' ground calls in a two-ground process. tools/collide/wallTest.mjs and tools/moto/physicsTest.mjs print
   identical output. The check's D6 ride resets when stuck pedalling into a house corner.

**Checks** (`node tools/bike/parkTest.mjs`, gate row `bikepark`, 17 checks, < 1 s): every spot level and clear; the
kickers at 6 / 7 / 8 m/s over the gap, clean, ridden out; the doubles at pump speed (pedal the flats, pump the backsides,
crouch the landings, sprinting): 4 airs, no bail; the whoops; a lap of the pump track (pumped, steered) and of the berm
loop (max lean 52 deg vs the flat 37); the quarter pipe at 27 km/h: 1 vert air (0.97 s), clean, riding back out at 5 m/s
turned 180; the mini half-pipe: 3 turns at the top in 10 s; the spine at 23 km/h: over, forward; the funbox and its rail
ground; the stairs ridden down and the handrail ground; the long rail (> 3 m) and the ledge ground; the wall ride
(0.6-0.75 s on the wall, a clean landing); the drop-in at > 4 m/s on the flat.

**Browser** (2026-11-25, one tab, silent): 0 console errors; screenshots in `Downloads/uccle-bmx/` (the overview, the big
kicker's air, a doubles air, the pump track, the berm loop, the quarter pipe's vert air laid over the coping, the
skatepark row, the spine transfer, the mini, the wall ride, the drop-in). **Known / next**: the wall-ride pose is the
bike laid flat (no path pitch on the wall); the kick turn and the vert turn are automatic (a trick button later); the
park's rails have no collider on their posts; riding off the SIDE of a raised feature (the table, the decks) stops the bike
on its face (the ledge rule) instead of a drop; the casual rider does not yet ride the park's features.

## Owner round 2 (2026-11-26, rule bike-lab-look)
- **Speeds**: seated powerCruise 62 W = ~17.5 km/h cruise (a real 11-year-old 15-18), standing (Shift) powerSprint 240 W
  = ~29 km/h, 0-15 km/h in 2.5 s standing vs 11 s seated; the stand-up is out of the saddle (riderIK s.sprint) and the
  bike ROCKS with the stroke (drawn only: bikePose). The card says it; the HUD shows km/h. bikeTest: cruise 15-19,
  sprint 25-31, 0-15 standing < a third of seated.
- **Downhill**: no cap - gravity along the slope against rolling + air drag (CdA ~0.47 upright): coasting settles at
  34 / 45.6 / 50.4 km/h on 6 / 10 / 12 % (the physics: 34.0 / 45.5 / 50.2), crouched (Space) `crouchDrag` 0.2 less drag:
  56 km/h on 12 %. The lab has two LONG descents (6 % over 220 m, 12 % over 160 m, 16 m wide, run-outs; spots "hill 6 %"
  / "hill 12 %"). Found on them: a slide along the side wall counted as a wash-out (now not while scraping a wall); a
  clean but crossed landing at 39 km/h left a 3 m/s side slip that washed out (now the tyres take the path). To do in the
  city: Avenue De Fre, Montagne de Saint-Job, the Kauwberg (the D6 spot has no long descent).
- **New surfaces** (SURFACES rows): mud 0.40 grip / 0.085 rolling / 0.30 sink (pedalled ~4 km/h, a slog), snow 0.32 /
  0.050 / 0.18 (~6 km/h), grass eased to 0.035 / 0.03 (~10 km/h seated; it crawled at 6). Lab patches: mud (x -46..-32,
  ruts), snow (round, r 9 m at (-64, 74): the city's volumetric snow layer with the wheels' tracks), a grass field.
  forgivingTest: slower in mud / snow, the casual rider rides them and the descents with no soft crash.
- **Walking-pace touch-downs never bail** (rolled off a kicker's open back at 0.5 m/s, nose down 42 deg: sketchy).
- **The look** (`debug/bikeLabLook.js`, `?look=old` = the old flat lab): the city's Lighting / sky / sun shadows / post,
  the library's asphalt / paving concrete / cobbles scans, the city's textured lawn ground and grass blades (pushed by the
  wheels), ~140 stylised trees round the lab (one instanced field), procedural TSL packed dirt / roots / sand / mud (wet,
  glossy puddles) / snow / wooden planks (seams, screws); the ground ONE geometry with a group per material.
- **Z-fighting**: every feature rectangle is on whole metres (feature() rounds out; heights are 0 outside the shapes), so
  the 1 m base grid's cut-out is exact: no coplanar overlap (parkTest "lab ground").
- **Debug overlays** (the edge layer: the blue / orange grind lines that showed through the kid): off by default (panel
  "debug: the edge layer", `?edges=1`), depth tested (parkTest "lab: the debug overlays").
- **Orbit camera**: O (or the panel's "Orbit camera" folder) orbits round the kid + bike while riding and paused (P):
  drag orbit, wheel zoom, right-drag pan; presets side / front / back / top / low; slow motion 0.25 / 0.5 / 1x; Esc / O
  back to the ride camera. three's OrbitControls with the target riding with the bike (as labs/falcon-lab.js).
- Zero garbage: the D6 ride now sprints (the speeds it had before the power retune; seated at 62 W it spent its time on
  kerb faces): 11.

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
   unless forced. Front brake (Q) panic stop; Q + Z = endo.
4. **Kerb hop**: the 15 cm kerb (spot 7) at 10-20 km/h: is the timing readable (preload feel, pop height)? Can a kid
   do it every time after a few tries? Tune preloadTime, popVel, popPreload, popPitch, coyote, hopLead, hopBuffer, kerbCatch
   (feel round 1: does the held early release feel like help or like lag?). Also riding into it
   without a hop at low speed (stop) vs fast (over the bars) - fair or frustrating?
5. **Kicker + table**: hands-off at 25-30 km/h, then with air pitch (Z / X) and a 180 (A / D or Left / Right in the air). Is the
   landing judgement fair (the sketchy / bail pairs; is the wobble readable, the save visible on the kid)? Does airLevel feel like help or like the bike steering itself?
6. **Pump rollers** (spot 4): hold Space on the faces, release on the backs (or C on the backs): does it feel like
   pumping (speed you earned) at pumpGain 45? Coasting them should die by the 4th roller.
7. **Bowl**: ride the walls, carve, pump the transition; check the camera in the bowl (minClear, followY).
8. **Manual** (X held): the balance point with manualAssist 0.8 / 0.4 / 0; how long is fun? Loop-out fair?
9. **12 % slope** (spot 9): climb seated (slow grind), sprint up, come down: 50 km/h coasting at the bottom: too
   fast for a kid's game? (drag). **20 % (steep)**: getting off to push, and back on at the top.
10. **Sand / grass / roots / setts**: the surface changes should be felt (sink, grip, camera buzz on setts / roots).
11. **Crashes**: each cause once (wall, kerb, nose-down, sideways, trick held, wash-out): readable? The get-up time.
12. **Camera**: chase vs low vs far vs side; yawRate in tight turns, the vertical follow in jumps (no seasickness),
    roll 0.15, FOV kick; never inside the kicker / table.
13. **Gamepad**: stick expo, trigger pedal + brakes, A hop timing.
14. Perf: the lab's `phys` ms in the panel's state line (target << 0.1 ms a frame); one tab only.
