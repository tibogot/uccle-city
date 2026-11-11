# Pedestrians: the Pedestrian Lab (P0 + P1)

Branch `claude/pedestrians` (from `claude/foundation`). **Lab only: nothing is in the city yet.** Design and phases:
`docs/PEDESTRIANS_RESEARCH.md`. Resume notes: `docs/PEDESTRIANS_RESUME.md`. Results: `docs/pedestrians/`.

Lab: `labs/pedestrian-lab.html` (serve the repo root; e.g. `http://localhost:8825/labs/pedestrian-lab.html`).
URL: `?scene=sidewalk|crossing|zebra|square|tram|park|overview|street`, `?count=` (people at peak, default 150),
`?mode=banded|his|off`, `?hour=`, `?post=0`, `?seed=`, `?gpu=0`.

## What is there

| Piece | File | What |
|---|---|---|
| Mr.doob's people (MIT) | `vendor/slop-ped/pedestrians.js` (+ `LICENSE`, `ORIGIN.md`, `CHANGES.md`) | `js/pedestrians.js` of mrdoob/slop-newyork at **536a907**, copied **unchanged**: 15-bone skeleton, code-built lofted bodies (male / female morph, girth, hair), procedural clothes shader, rigid-pair GPU skinning from a pose storage buffer, `PersonCrowd` (his near / far draw), `PersonRig` (planted feet, two-bone IK, kerb steps, turns, idle weight shifts). His `pedestrian-system.js` / `pedestrian-routes.js` were not copied (they need his city grid); their ideas are rewritten in `sim.js` |
| Gait baker | `tools/peds/bakeGait.mjs` (+ `loadRig.mjs`) | Runs his `PersonRig` in Node on a treadmill (three's math from `tools/worker/node_modules`, `npm ci` there; the vendored file is loaded with its imports redirected, not edited). Clips: idle (16 s @ 15 fps, loop cross-faded), walk 0.7 / 1.0 / 1.35 / 1.7 m/s, jog 2.4, run 3.2 (48 frames per gait cycle, left heel strike at phase 0), turn in place L / R. Both sexes. Output `models/pedestrians/clips.bin` (585 KB) + `clips.json` (strides, cycle times, stance flags per foot per frame, seam check). Scripted, no clip licence. `node tools/peds/bakeGait.mjs` (0.4 s) |
| Bone table | `viewer/pedestrians/boneTable.js` | Loads the bake; locomotion slices by speed (phase-matched walk bakes), the CPU sampler (same maths as the GPU: blends, meters), pose helpers |
| Banded crowd | `viewer/pedestrians/crowd.js` | Three mesh LODs, each one instanced draw with its own pose buffer (his layout, his material); a **compute pass** writes the baked people's world poses from 4 vec4 per person (position + yaw, two clip slices + mix + height, appearance, head glance); live people's poses come from the CPU. Dithered cross-fades with `viewer/lodFade.js keepBand` (per-person bands from the CPU, also in the shadow pass) |
| LOD2 body | `viewer/pedestrians/lod2.js` | His far mesh (954 tris) welded and simplified with meshoptimizer: **269 tris** |
| Simulation | `viewer/pedestrians/sim.js` | A walk graph; people steer at a carrot 0.8 m ahead on their line (rounded corners, no one-frame turns), kerb queues with a 0.2-1.5 s reaction after WALK (his idea), 2 % red-light runners only with no car within 45 m, zebras with a glance left / right and pedestrian priority, keep-right side-step for oncoming people, square wandering with pauses, benches and a café terrace, tram platform gathering / boarding / alighting (dithered fades), doors and street ends as entries / exits; seeded stream (no `Math.random`) |
| Meters | `viewer/pedestrians/meters.js` | Foot slide, ground gap, pops (coverage / shadow / pose snaps), spawns in view (see below) |
| Test ground | `labs/pedestrian-ground.js` | The lab spec's six scenes on one neighbourhood: street A (3.5 m sidewalk with two lines + tree pits, 2 m sidewalk with a detour round a cabinet, bollards, 13 cm kerbs, 6 % slope east of x = 80 m), a 4-arm junction with a local signal clock (58 s cycle, pedestrian WALK + flashing), an unsignalled zebra with dropped kerbs, a 40 x 60 m square, a tram platform (25 cm) with a scripted tram every 120 s, a winding park path with a bench; test cars (stop at red, before occupied crossings and for people waiting at the zebra) |

## LOD chain (P1)

| Band | Distance | Mesh | Animation | Shadow |
|---|---|---|---|---|
| near | < 18 m (out at 20, at most 24 people, nearest first) | LOD0, 3,434 tris | his live rig (planted feet, IK, real ground, kerbs) | casts |
| mid | 18-60 m | LOD0 -> LOD1 (954 tris) cross-faded over 32-38 m | bone table on the GPU, frames interpolated | casts, faded out over 36-46 m |
| far | 60-250 m | LOD1 -> LOD2 (269 tris) cross-faded over 56-64 m | bone table, clip state AND drawn position stepped at 15 Hz (4 groups) | none |
| beyond | > 250 m | dithered out over 225-250 m | none | - |

- **Clip advance by distance walked**: locomotion phase += distance / (height x stride of the mix), so the stance
  foot stays planted at any speed. Below 0.7 m/s: idle mixed with one second slice (walk-off or turn in place), which
  only changes once its weight has faded out; weights move at <= 3 / s (no pose jumps on starts, stops, turns).
- **Live <-> baked hand-over**: the rig starts (pre-warms) at 23 m at the table's phase (same gait maths, stride 1 as
  baked), blends in over 0.4 s after 0.8 s of walking; on the way out the table takes the rig's phase and the pose
  blends back over 0.4 s. The mesh switches (35 / 60 m) are at other distances, so the two never coincide.
- Spawns: at doors / street ends; in view they fade in (0.5 s dither), out of view instantly. Removals the same.

## Meters (definitions)

- **Foot slide**: for each planted foot (the rig's stance flag, or the bake's stance flag of the dominant slice, in
  both frames), the horizontal speed of the **less-moving of heel and ball** (a rolling foot pivots on one), m/s, on
  the pose actually drawn (rig, blend or table). Bands: live (rig only), handover (during the 0.4 s blends), mid, far.
- **Ground gap**: planted sole (lowest of heel / ball, sole level) minus `ground(x, z)`; + floats, - sinks.
- **Pops**: (a) a person's drawn pixel share (sum of LOD shares x spawn fade x end fade) or shadow share changing by
  > 0.2 per 60 Hz frame while in view in both frames; (b) a pose snap: the velocity of an ankle or the head changing
  by > 5 cm per 60 Hz frame (dt-aware), people < 64 m.
- **Spawns / removals in view without a fade**: the sim's counters.
- Sampling: 80 people per frame in a window that moves every 30 frames; meters off for the cost numbers.

## Results (2026-11-11, 1280 x 800, pixel ratio 1; `docs/pedestrians/results_2026-11-11.json`)

Moving-camera checks (lab buttons / `lab.runCheck(name)`; 150 people at peak, 08:30):

| Check | slide p95 live / handover / mid / far (m/s) | gap p95 live / mid / far (m) | worst sink (far) | pops coverage / shadow / pose | unfaded spawns in view |
|---|---|---|---|---|---|
| dolly at 1.4 m/s (30 s) | 0.047 / 0.63 / 0.36 / 0.17 | 0.005 / 0.009 / 0.009 | -0.25 | 0 / 0 / 23 | 0 (76 spawns, 49 faded) |
| dolly at 50 km/h (20 s) | 0.075 / 0.37 / 0.13 / 0.16 | 0.009 / 0.008 / 0.011 | -0.03 | 0 / 0 / 66 | 0 |
| orbit the junction (40 s) | - / - / 0.16 / 0.16 | - / 0.005 / 0.008 | -0.13 (mid) | 0 / 0 / 37 | 0 |
| backwards down the street, 6 -> 262 m (32 s) | 0.047 / 0.25 / 0.11 / 0.16 | 0.006 / 0.006 / 0.006 | -0.13 | 0 / 0 / 21 | 0 |
| 60 s orbit from 110 m (spawn edge) | - / - / - / 0.17 | far 0.007 | -0.25 | 0 / 0 / 0 | 0 (82 spawns, 55 faded) |

- **Pops: 0 coverage and 0 shadow pops in every run; 0 unfaded spawns / removals in view.** Pose snaps: 20-70 per run
  out of ~10^5 sampled person-frames, mostly the live rig turning sharply (U-turns at doors) and hand-over blends.
- **Foot slide**: the live rig meets the near target (p50 0.01-0.02, p95 0.05-0.07 m/s; target 0.03 p95: his rig
  itself, his "the foot slips" rule when a turn strands a foot). Baked mid p95 **0.11-0.36 m/s, over the 0.08 target**:
  the body's yaw turns about the root while a foot is planted (corners, side-steps, the keep-right dodge), and
  starts / stops mixing idle with walking. Steady straight walking slides < 1 cm/s (p50 0.001-0.02).
- **Ground gap**: p95 under 1 cm in every band; the worst sinks (-13 to -25 cm, far / mid) are baked people on the
  13 cm kerb steps at crossings (their root eases over the step, the baked feet do not step) and the 6 % slope.

**Cost** (A/B rounds: crowd off / banded / his, 3 rounds each, everyone on street A's west sidewalks, "street" view,
~290 of 300 in view: bands LOD0 77-90 / LOD1 62-77 / LOD2 166-193, 23-25 live rigs):

| People | CPU crowd, banded (ms) | of which live rigs | CPU crowd, his (all live) | CPU lab sim | GPU delta banded / his |
|---|---|---|---|---|---|
| 50 | 0.24-0.32 | 0.06-0.09 | 0.21-0.29 | 0.11-0.22 | **noisy**: +0.07 to +2.8 / +0.13 to +2.3 |
| 150 | 0.35-0.42 | 0.12-0.14 | 0.51-0.58 | 0.20-0.43 | +0.33 to +3.3 / +0.26 to +2.5 |
| 300 | **0.46-0.56** | 0.12-0.16 | **0.96-1.08** | 0.33-0.78 | **+0.39 to +2.2** / +0.39 to +2.4 |

- **CPU**: banded 0.46-0.56 ms for 300 (target 0.5: at the line), about half of his all-live-rig crowd (1.0 ms).
  Stable across 4 benches. The lab sim (0.3-0.8 ms) is the lab's, not the city's (P6 will run it at 10-20 Hz).
- **GPU: NOT measured cleanly.** The owner's other GPU-heavy project and another agent's lab shared the GPU: the
  "off" baseline moved 2.4 -> 4.0 ms between benches, and single rounds of the same configuration read 4.0 and 6.6 ms.
  The quietest bench (first, overview + street) gave **+0.39 to +0.66 ms for 300 banded** (his: +0.39 to +0.59),
  inside the 1 ms target; later benches +0.85 to +2.8 ms. **Re-run on a quiet machine** (`lab.bench()` in the console,
  or the panel button "cost: A/B 50 / 150 / 300"), also with `?post=0`.

Frame strips (looked at, `docs/pedestrians/`):
- `strip_walk_past.jpg`: eye level on the north sidewalk, people walking past in the live band (0.25 s apart).
- `strip_bands_dollyzoom.jpg`: one walker followed by a dolly-zoom (he stays the same size on screen) through the
  hand-over at 18-22 m (frames 1-4), LOD0 -> LOD1 at 33-37 m (frames 5-7; 5-6 are the camera inside a house when he
  turned round, a path artefact), LOD1 -> LOD2 at 57-66 m (frames 8-11): no visible pop; LOD2 reads darker at the
  face / torso when magnified 20x (simplified normals), invisible at its real size.
- `strip_junction_orbit.jpg`: orbit over the junction: kerb queues, crossings, signals.
- `scene_zebra.jpg` (cars stopped before the zebra, a woman crossing, a queue), `scene_square.jpg` (400 people).

## What is weak / not done

- **GPU cost unverified** (noise, above). Also not split per band yet (shadow pass vs beauty vs compute).
- **Baked foot slide in turns** (mid p95 0.11-0.36 m/s): fix ideas: turn the body only in double support or about the
  planted foot (move the root so the stance foot stays put), turn clips while walking, less lateral drift.
- **Baked people on kerbs and slopes**: the root eases over a 13 cm kerb, the feet do not step (sinks up to 25 cm at
  the far band for ~0.2 s); on the 6 % slope the flat-ground bake is off by up to 2-3 cm. A "step up / down" clip pair
  or a per-foot height offset in the compute pass (ground under each foot) would fix both.
- Arms are baked at girth 1 (wide people may clip their sleeves into the coat at 18+ m); arm swing / stride
  personality is only in the live band (crowd rigs use stride 1 to stay in step with the table).
- **No Quaternius UAL clips yet** (sit / pram / phone): UAL1 is not in `data/raw` and was not downloaded. No sitting:
  bench and café "sitters" stand. No dive (owner default: dive only at speed) and no step-back yet: cars in the lab
  never threaten anyone (they stop for every crossing); the hooks are in `sim.js` (`carsNear`).
- **P4 bodies v2 not started**: everyone is one of his adults in his city clothes (no children, older people,
  coats, skirts, hats, umbrellas, bags, prams, dogs); the season dropdown does nothing yet.
- Behaviour is lab-grade: no groups walking together, no conversations, square avoidance is a simple separation push,
  people at doors U-turn when they do not go in, the tram is a shuttle (comes and goes south).
- Test ground: no crossing paint at the signalled crossings, boxy cars / tram / trees (lab props).
- `performance.now()` is coarsened to 0.1 ms in this browser: CPU numbers are means over ~130 frames.

## How to re-run

```
cd tools/worker && npm ci && cd ../..        # three 0.187 for the baker
node tools/peds/bakeGait.mjs                 # -> models/pedestrians/clips.{bin,json}
python -m http.server 8825                   # repo root; open /labs/pedestrian-lab.html
```
Console: `await lab.runCheck("dolly-walk" | "dolly-drive" | "orbit" | "bands" | "spawn60")`, `await lab.bench()`,
`lab.meters.summary()`, `lab.results`; strips: `lab.strip.ui(false); lab.strip.follow(person, (t) => 14 + 4 * t);
await lab.strip.step(15)` then a screenshot.
