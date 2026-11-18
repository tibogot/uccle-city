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
| reset / get up / camera / pause / spots | R / G / V / P / 1-9 (start, kicker, table, pump, roots, bowl, kerb, sand, slope) | Back / - / Y |
| get on / off the bike (claude/kid) | E (walk up to it; off when slow: stopped = it stands, rolling = it falls) | - |
| on foot (claude/kid) | W A S D / arrows walk, Shift run, Space jump, C crouch, mouse drag camera | - |
The arrows do exactly what W / A / S / D do and both sets always work (the owner rides with the arrows); one key table
(`KEYS` in viewer/bike/bikeInput.js) feeds the input, and the tests check that both sets give identical inputs and that no
key has two jobs. The controls card is shown at start, `?` toggles it (rule 14). Sounds: none. On foot the same keys mean the same kind of
thing (move = pedal / brake / steer, Shift = run / sprint, Space = jump / hop, C = crouch / pump); E is free on the bike
(tools/kid/kidTest.mjs checks both, docs/KID.md).

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
| hop | popVel 1.35 m/s, popPreload 1.8 m/s, preloadTime 0.28 s, popPitch 1.2 rad/s, coyote 0.08 s, hopLead 0.22 s, hopBuffer 0.26 s, kerbCatch 0.045 m, kerbCatchLoss 0.04 |
| steps | stepRoll 0.07 m, faceSlope 1.6, faceCrash 3.2 m/s, rearClimb 0.25 m, rearBonk 0.45 |
| landing (sketchy / bail) | nose 0.28 / 0.70, tail 0.50 / 1.00, lean 0.33 / 0.77, yaw 0.33 / 0.80 rad, hard 5.0 / 9.8 m/s, trick 0.12 / 0.35; absorb 1.4 m/s, landLoss 0.25, wobbleTime 0.45 s, wobbleGrip 0.35, wobbleLean 0.14 rad, sketchyLoss 0.12, loopOut 0.85, endo 0.62 rad, crashSpeed 4.5 m/s |
| grind (round 2) | snapReach 0.45 m, snapAbove 0.30 / snapBelow 0.05 m, snapAngle 0.70 rad, snapTime 0.08 s, pegR 0.02 / pegOut 0.10 m, grindDecel 0.9 / rail 0.5 m/s^2, grindMinSpeed 1.0 m/s, stallTime 1.2 s, cornerExit 0.785 rad, cornerPop 1.0 m/s, grindAssist 0.8, grindTip 1.6, grindHold 2.5, grindSteer 2.2, grindBump 0.5, grindCrash 7 m/s |
| push | pushGrade 0.10, pushSpeed 0.85 m/s, pushDelay 0.8 s, walk 1.3 m/s, footSpeed 0.6 m/s, footLean 0.08 rad, respawn 2.2 s |

Surfaces (grip / rolling x g / sink per m/s / buzz): asphalt 0.95 / 0.010 / 0 / 2 mm, setts 0.72 / 0.024 / 0 / 14 mm,
dirt (packed) 0.70 / 0.018 / 0 / 8 mm, grass 0.55 / 0.060 / 0.06 / 10 mm, sand 0.42 / 0.12 / 0.25 / 3 mm,
roots 0.50 / 0.045 / 0.03 / 22 mm.

## Targets = the node checks (`node --import ./tools/heap/register.mjs tools/bike/bikeTest.mjs`, gate row `bike`)
79 checks, all pass (~4 s; feel round 1's 16 and round 2's 16 below): determinism (same input twice bit-identical; 60 fps vs an uneven 30-144 fps split = the same
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
