# Motorbike mode (round 1, 2026-11-15, branch claude/moto)

The first of the TWO-WHEELER MODES (docs/TODO.md): a powerful naked / streetfighter motorbike you ride in the city, built
on the car's drive base (same colliders, ground, traffic, night pool), with a fixed stylised rider.

**Start it:** the dev panel's *Modes & camera* > **Motorbike (B)**, the **Moto** button in the old HUD, the **B** key from
any mode, or the URL `?view=moto` (`&at=x,z` for a place: the nearest road there, like the car). The dev panel's Go to
places and the share link keep the mode (`view=moto`). Esc leaves it. The **Moto Lab** (`labs/moto-lab.html`) runs the
same code on a test ground (parked cars to filter between, a ramp, a kerb, a wall, a slalom; `?pose=1` freezes the
physics and poses the bike from sliders).

## Controls

| key | |
|---|---|
| W / ↑ | gas |
| Shift + W | full gas: the clutch dumped, the front lifts at low speed (wheelie); hold it to keep the wheelie |
| S / ↓ | front brake (hard = a stoppie); stopped: paddle backwards |
| Space | rear brake: the rear locks and the tail steps out (steer to slide it) |
| A / D, ← / → | lean (the bike turns by leaning; the front wheel counter-steers first) |
| C | camera: chase / far / helmet / orbit (drag to look round, wheel to zoom) |
| R | back to the start |
| N | sound on / off (the sound is OFF by default: `?motosound=1` or the dev panel's "motorbike sound" toggle) |
| G | the colliders (as the car) |

HUD: speed, gear, a rev bar (red over 10,000 rpm), rpm.

## Files

| file | what |
|---|---|
| `tools/blender/motorbike.py` | the model + rider, Blender 5.0 headless; `--bake` GPU AO per vertex (OptiX, cached per piece in `models/moto/.aocache`), `--preview <dir>` Cycles stills |
| `models/moto/moto.raw.glb`, `moto.json` | the pieces (LOD0, AO in COLOR_0), the rig numbers (wheel centres, steering axis, rider joints, lamps) |
| `viewer/moto/motoModel.js` | loader, our materials by slot, the LODs, the rig (lean / wheelie / steer / IK arms / crash) |
| `viewer/moto/motoLod.js` | the LODs on plain arrays (viewer + audit run the same code) |
| `viewer/moto/motoPhysics.js` | the arcade two-wheeler (pure JS) |
| `viewer/moto/motoCamera.js` | the chase camera with lean roll, FOV kick, helmet view |
| `viewer/moto/motoAudio.js` | the procedural engine, shifts, overrun crackle, wind, tyres, crash |
| `viewer/drive/driveMode.js` | the Driver: `setVehicle("moto" / "car")`, `updateMoto`, its env (narrow box, crash response) |
| `tools/moto/audit.mjs`, `tools/moto/physicsTest.mjs` | mesh audit of every LOD; headless physics numbers |
| `labs/moto-lab.html` | the lab |
| `debug/motoPilot.js` | an autopilot for captures (OSM road chain or the traffic lane graph, pure pursuit, speed from curvature) |

Shared code touched (small, backward compatible): `carEnv.js` (vehicle dims + hit response as options), `chaseCamera.js`
(config per instance, no per-frame allocations), `input.js` (`readMoto`, N), `main.js` / `devPanel.js` / `features.js`
(the mode), `nightLights/cityNight.js` (`driver.lampRoot` / `lampModel`: the bike's lamps), `traffic/cityTraffic.js`
(the player's obstacle size: narrow on the bike), `grass/cityGrass.js` (two wheel pushers), `tools/mesh_audit/glb.mjs`
(TEXCOORD_1 in the parts), `drive/debugDraw.js` (the vehicle's own box). The motorbike loads on first use (dynamic
import): nothing changes for the car or the boot when it is not ridden.

## The model (tools/blender/motorbike.py)

An invented modern naked / streetfighter, ~1000 cc inline four class (no real brand, no logo), proportions from spec
sheets and photos of current naked 1000s (looked at only): wheelbase 1.45 m, rake 24.5 deg, trail 100 mm, seat 0.83 m,
120/70 ZR17 and 190/55 ZR17 tyres, 320 mm twin front discs (petal edge, floating bobbins), 220 mm rear disc, ~2.1 m long.
Steel trellis frame with cast lugs, canted inline four (ribbed block, cam cover, clutch / alternator covers, sump),
4-2-1 chrome headers into a collector and a short upswept can, sculpted tank with radiator shrouds, split seat, sharp tail
with an LED tail blade, plate hugger and indicators, upside-down gold fork, radial calipers on brackets, alloy swingarm,
rear shock with its spring, chain and sprockets, pegs and hangers, tapered bar with grips / levers / bar ends / mirrors,
twin-eye LED headlight with DRL brows, smoked flyscreen and TFT dash. All bevelled / lofted from code (Catmull-Rom keyed
superellipse lofts, lathes, swept tubes); smoothing by angle (40 deg), tube and bevel segment counts chosen so no smooth
triangle spreads its corner normals over 30 deg (the audit's streak rule).

The rider: a stylised figure (helmet with visor and spoiler, leathers with shoulder / knee / elbow armour, back
protector, gloves, boots on the pegs). Legs fixed; the torso (hip pivot) tucks up to 15 deg with speed and hangs ~10 deg
into the corner; the arms are four segments posed every frame by a two-bone IK from the shoulders to the grips (the hands
stay on the bars while steering and tucking). On a crash the rider leaves the bike as a tumbling body that slides to a
stop, and is back on the respawn.

| piece | LOD0 | LOD1 (2.5 mm) | LOD2 (1.1 cm) |
|---|---|---|---|
| Body | 30,504 | 8,058 | 1,590 |
| Steer (fork, bars, headlight) | 8,160 | 1,884 | 436 |
| Wheel_F / Wheel_R | 8,280 / 7,044 | 2,432 / 2,512 | 476 / 462 |
| RiderLegs / RiderTorso | 4,124 / 3,784 | 1,836 / 2,614 | 386 / 540 |
| 4 arm segments | 1,672 | 1,200 | 272 |
| **total** | **63,568** | **20,536** | **4,162** |

LODs are made at load by meshoptimizer (viewer/moto/motoLod.js); LOD0 under 22 m, LOD1 to 70 m, LOD2 beyond (10 %
hysteresis). The player's bike is at LOD0 in every riding view. 18 named material slots (our own materials in
motoModel.js): Paint (clear coat, 6 colours in the dev panel), Frame, Metal, Engine, Chrome, Anodized, Rubber, Plastic,
Seat, Rim, Disc, Glass, HeadLight (emissive DRL + night), TailLight (night + brake), Plate, Suit, Helmet (clear coat), Visor.

**AO**: per VERTEX (COLOR_0), each piece baked ALONE on a ground plane (the arms without one) by Cycles on the GPU
(OptiX, 64 samples, 0.3 m), cached per piece by a geometry hash. (A lightmap atlas was tried first: the per-face grain UVs
give thousands of islands per piece and the atlas was mostly seams; the meshes are dense enough for vertex AO, which also
goes through the LOD simplification for free.)

**Mesh audit** (`node tools/moto/audit.mjs`, the shared checker, reports in models/moto/audit/): LOD0 **0 blocking**
(bike + rider at rest; the arm segments 0); LOD1 6 blocking (shallow crossings of simplified frame lugs / tank / boot
shaft, 22-70 m away); LOD2 83 blocking (twin spokes, disc carriers and the fork foot collapsing onto each other at 1.1 cm,
70 m and more away). See leftovers.

## Physics (viewer/moto/motoPhysics.js; numbers from `node tools/moto/physicsTest.mjs`)

On the car's base: the same forward-speed curve and friction circle, 120 Hz substeps, carEnv.js collisions against the
same collider sets (buildings, kerb islands, trees, lamps, bollards, furniture, parked cars, landmarks / hero colliders,
the traffic's moving boxes), the same ground (driveHeight, bridge decks; ledges over 0.5 m are walls). The bike's own box
is 0.8 x 2.12 m: it fits through a 1.3 m gap between parked cars (test: 96 km/h through, no contact).

- **Lean steers**: A / D set a target lean (max 46 deg, less at walking pace, less when the tyres also brake or pull:
  the friction circle); the lean follows at a rate that falls with speed (gyroscope: 30 deg in 0.5 s at 100 km/h); the
  yaw rate is the coordinated turn g tan(lean) / v (45 deg at 90 km/h = a 64 m radius); at walking pace it steers by the
  handlebar (5.5 m turning radius). The front wheel counter-steers ~5 deg while the lean builds, then turns into the bend.
- **Power**: 0-100 km/h 3.2 s, 0-200 10.9 s, ~266 km/h top (drag-limited; 6 gears, 11,800 rpm redline, a shift cuts the
  drive 80 ms). Slopes: gravity along the slope (Uccle's hills); feet down hold it still when stopped.
- **Brakes**: S = front (11.5 m/s²: 100-0 in 27 m / 2.2 s), Space = rear (locks, the tail steps out, steer to slide).
  Stopped, S paddles backwards (no reverse gear).
- **Wheelie**: Shift + W at low speed lifts the front (drive force x CG height vs gravity's arm to the rear contact; the
  balance point is near 47 deg and the rider eases the gas over ~30 deg: arcade, it never loops); release to drop it.
- **Stoppie**: a hard front brake from speed lifts the rear (~17 deg from 100 km/h); the rear brake does nothing in the air.
- **Crash**: over the grip at lean (e.g. full front brake at full lean) = a low-side; an impact over 8.5 m/s into anything
  = a crash: the bike falls on its side and slides (lifted onto bar end / mirror / peg so nothing sinks), the rider
  tumbles off; respawn after 2.6 s at the last safe pose (upright, moving, no contact, refreshed every 0.5 s). Glancing
  touches only push and yaw the bike.

## Camera (viewer/moto/motoCamera.js)

The car's chase camera (spring boom, never in a wall or under the ground) with the bike's numbers (4.3 m back, 1.45 m up),
plus: a velocity feed-forward (a world-space spring trails 2 v / stiffness: 9 m at 150 km/h), a roll of 28 % of the lean
(smoothed), a field of view from 62 to 78 deg with speed, and a HELMET view (C: chase / far / helmet / orbit) at the
rider's eyes, rolling with 70 % of the lean. Drag to look round, wheel to zoom (its own distance, not the car's).

## Sound (viewer/moto/motoAudio.js): OFF by default

The city has no shared audio bus yet (the sound lab's engine in viewer/audio/ is not hooked into the city; the falcon has
its own), so the bike owns a small Web Audio graph, all procedural: an inline four (one periodic wave on half the firing
frequency rpm / 30, half orders for the rasp, two detuned voices, a soft clipper driven by the throttle, a low-pass
opening with rpm and load, an induction howl band), shift cuts and clicks, downshift blips, overrun crackle when the gas
is shut over 6,500 rpm, wind with speed, a tyre screech in a slide, a crash thump. **Off by default** (owner,
2026-11-15): `?motosound=1`, the dev panel's "motorbike sound" toggle, or N while riding; off suspends the AudioContext.

## Night

Fixed light count: no new lights. The emissive head lamp (twin eyes + DRL brows, faintly lit by day as a DRL) and the tail
blade switch on at night; braking brightens the tail blade. With `?night=1` the bike's head / tail lamps take the
player-car slots of the night pool (nightLights/cityNight.js: `driver.lampRoot` = the bike's leaning frame, the lamp
positions from moto.json), so the head lamp throws its pool on the road (docs/moto/city_night_de_fre.jpg).

## Costs (RED preflight, shared machine: another agent on the GPU; indicative only)

- CPU: the bike's update (physics 120 Hz substeps, rig + IK, camera; sound off) **0.10-0.15 ms** a frame, vs the car's
  0.23 ms at the same place (Avenue De Fré).
- Draws: **+84-88** draw calls with the bike shown (41 meshes = 10 nodes x their slots; 39 cast shadows) vs **+79** for
  the default car (faceted hatch); 63.6k triangles at LOD0.
- Load: on first use only (dynamic import), ~0.5 s (GLB 4.9 MB uncompressed + the LODs).
- GPU ms: not measured (RED all session).

## Images (docs/moto/)

- `blender_34front.jpg`, `blender_side.jpg`, `blender_34rear.jpg`, `blender_front_detail.jpg`: Cycles stills with the AO
- `city_lean_de_fre.jpg`: leaning left at 110 km/h on Avenue De Fré, the camera rolled with the lean
- `city_wheelie_de_fre.jpg`: a wheelie off the line (Shift + W), Avenue De Fré
- `city_filter_queue_de_fre.jpg`: beside a queue of traffic on Avenue De Fré (the narrow box)
- `city_night_de_fre.jpg`: `?night=1`, the head lamp's pool and the tail blade

## Leftovers / weak spots

- **LOD1 / LOD2 audit not clean** (6 / 83 blocking, at 22 m+ / 70 m+): simplified lugs, spokes and disc carriers collapse
  onto each other. Fix: per-piece errors, `__far` stand-ins for the wheels (a disc rim + 5 flat spokes), or Blender-made
  LODs. The player's bike never leaves LOD0 while riding; it matters for traffic bikes later.
- **Draw calls**: 41 meshes (one per node x slot). Merge slots per rigid group (vertex colour tints) at LOD1+: target ~20.
- **GLB size**: 4.9 MB uncompressed, still carrying TEXCOORD_0 the materials do not use: drop UV0 and meshopt-compress
  (as tools/park_kit_pack.mjs) to ~1 MB.
- **Rider**: a stylised mannequin (no fingers, simple boots); the crash tumble is one rigid body (no ragdoll); no foot down
  at a stop. The character work (claude/character2) can replace it later: moto.json has the hip / shoulder / grip points.
- **Physics**: the counter-steer is visual (the lean leads directly); no rear suspension travel; wheelie / stoppie are pitch
  only; kerbs are ridden up like the car's (<= 0.5 m); crashes into moving traffic use the traffic's boxes (no impulse
  given to the traffic car).
- **Traffic**: the sim sees the bike as two 0.55 m circles; cars do not leave room for filtering, and once on Avenue De Fré
  the bike hit a traffic box where no car was drawn (traffic code, not checked further).
- **The autopilot** (debug/motoPilot.js) is for captures only: it does not avoid parked or queued cars, and the OSM
  centrelines differ from the drawn roads (use the lane-graph mode).
- **Camera**: at very high speed the chase view sits far back with the FOV kick (the bike small in the frame); no head bob in
  the helmet view.
- **Sound**: designed, not tuned by ear (the owner asked for silence while working): needs a listening pass; no Doppler /
  occlusion (the city's audio bus, when there is one, should own it).
- **Not done this round**: a screencast (stills only), GPU A/B on GREEN, the scooter and the bicycle (TODO).
