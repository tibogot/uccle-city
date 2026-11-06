# Character feet: audit and fixes (branch claude/character-audit)

The third-person character's controller and foot IK, checked with the camera on the feet, in slow motion, and
**measured**: 29 scripted walks over the Capsule Lab course, each at a simulated 30, 60 and 144 fps.

## How to look, how to measure

- Lab: `labs/capsule-lab.html`, panel **Foot audit**: camera `feet side` / `feet front` / `feet top` / `feet 3/4`
  (low, on the feet, following the character), a scripted walk to play on autopilot (looped), **time scale** under
  Collision for slow motion, physics 30/60/120/240 Hz. The URL works too:
  `labs/capsule-lab.html?play=stairs%20down%2021%20walk&cam=feet%20side&slow=0.25`
- **measure all (30/60/144 fps)** runs `labs/footProbe.js` on every walk (synchronous, nothing rendered): per foot,
  a heel and a toe point from the skinned mesh's own sole, a ray down under each.
  - *slide*: speed of the sole points that are down, while the clip has the foot planted (m/s)
  - *|gap|*, *gap p95*, *gap > 3 cm %*: the lower of heel / toe above (+) or into (-) the ground, planted frames
  - *pen*: the deepest any foot point went into the ground (any frame: toes through risers)
  - *knee min*, *pelvis sd* (hips over the feet plane), *hip v* (peak vertical hip speed: a step-up that jumps)
- **T** runs the test suite: 31 controller tests + 2 new (no edge roll-up mid-jump) + 7 foot tests (40/40).
- Raw tables: `audit-before.txt`, `audit-after.txt` (every walk x 30/60/144 fps). Frame sheets: `*-before.jpg`,
  `*-after.jpg` (foot side camera, 60 fps, stepped).

## What was wrong (before)

| problem | numbers (worst of 30/60/144 fps) |
|---|---|
| planted feet slid: no foot lock, the clip's stride never matches the ground exactly | walk 0.19 m/s, **run 0.77-0.93 m/s**, turns 0.4 m/s |
| toes through kerbs and risers: one ray under the ankle, the toe goes into the step before the ankle crosses | kerb 14-16 cm, stairs 24-31 cm |
| feet hanging in the air going down stairs / steep ramps (IK weight 0.4 at a run, reach clamp, lag) | stairs down planted gap p95 22 cm, 45 deg ramp 43 cm |
| foot sinking into the 55 deg slope it stands against | 13 cm mean, 84 % of planted frames > 3 cm off |
| hips jumping at each stair step (exponential step lag: full speed at once) | 3.7-6.5 m/s peak hip speed on stairs |
| a jump rolled the round capsule bottom up onto a ledge up to a step higher | jump height 0.9 m climbed a 1.0 m block |
| no landing reaction | hips do not dip on landing |
| the 30/60/144 fps results differed by a lot on kerbs (the eased planted foot) | e.g. kerb up pen 0 / 14 / 15 cm |

## What changed

`viewer/character/footIK.js` (rewritten, ~0.05 ms per frame, no allocations):
- **foot lock**: while the clip has a foot planted (low *and* not swinging forward relative to the body: this walk
  clip's swing skims the floor), a world-space correction (xz + yaw) cancels the drift of the sole points that are
  down (heel, toe, or both: the roll from heel to toe is not a drift); fades out through the swing. Limits: 25 cm
  drag, 26 deg twist, beyond them the foot pivots (fast turns stay upright instead of crouching).
- **steps on the spot**: standing, a foot dragged > 11 cm or twisted > 22 deg by a turn lifts (7 cm) and is put down
  where the clip has it, one foot at a time.
- **heel + toe rays** (the sole's own points): a slope tilts the foot (<= 30 deg, raised when steeper); an **edge**
  (heel and toe on two level treads, told apart from a slope by the plane's grade) holds the foot level on the higher
  side: no toe in the riser, the heel hangs over a step down.
- **swing look-ahead**: a swinging foot sees the ground ahead of its toe and is carried over a step before it gets
  there; a foot about to land across a down-nosing is moved forward onto the lower tread (<= 10 cm).
- planted feet: exact ground height (no lag: the old eased foot sank / floated by frame rate); swinging: eased.
- **pelvis**: a critically damped spring (exact for any dt) to a part of the lower planted foot's drop, and always
  low enough that each leg reaches (the clip's own leg extension allowed); **soft reach** in the 2-bone solve (no
  knee snap); the foot is re-attached to the shin's end after the solve.
- **landing absorb**: a touch-down kicks the pelvis spring down by the fall speed (1.5 m fall: 5-6 cm dip).
- **stairs / steep ramps**: the stride is warped shorter along the heading (down to 0.6) and the cadence quicker
  (body.js, up to 1.45x), the body slows by up to 30 % (`tp.stairSlow`): a step about a tread, not a flat-ground
  stride straddling three nosings. The grade is read *ahead* from the ground line, so the first step is short too.
- IK weight 1 on the ground at walk and run (was 0.4 at a run), 0 in the air, eased in fast on landing.

`viewer/character/index.js`: the animated body stands on the **ground line** (mean of the ground at the feet and
0.22 m behind / ahead) followed by a critically damped spring, instead of the capsule's per-step lag: hips travel
smoothly up and down stairs. `autopilot` hook (scripted input), deterministic pose on teleport.

`viewer/character/controller.js`: the step lag is a critically damped spring (no velocity jump per step; the camera
and the capsule use it); **in the air an edge of a ledge above the feet blocks like a wall** (the rounded bottom no
longer rolls up onto it: a 1.0 m block can't be climbed with the 0.9 m jump; the 0.6 m block / 0.8 m wall still can).

## Before / after (worst of 30 / 60 / 144 fps)

| surface | slide m/s | \|gap\| cm | gap p95 cm | gap>3cm % | pen cm | knee min | pelvis sd cm | hip v m/s |
|---|---|---|---|---|---|---|---|---|
| flat walk | 0.19 → **0.02** | 0.8 → **0.9** | 2.2 → **2.7** | 1 → **3** | 1.6 → **1.6** | 108 → **106** | 2.2 → **2.6** | 0.47 → **0.66** |
| flat run | 0.77 → **0.02** | 0.3 → **0.3** | 1.1 → **1.2** | 0 → **0** | 1.6 → **1.5** | 53 → **53** | 2.5 → **2.5** | 1.41 → **1.47** |
| kerb up 15 cm | 0.23 → **0.02** | 1.1 → **0.9** | 3.0 → **2.9** | 8 → **5** | 13.9 → **2.9** | 108 → **103** | 2.2 → **4.1** | 1.97 → **1.08** |
| kerb down 15 + up 14 | 0.19 → **0.02** | 1.8 → **1.0** | 10.1 → **2.8** | 13 → **4** | 15.7 → **3.4** | 80 → **84** | 3.6 → **3.2** | 2.09 → **1.08** |
| kerbs at run | 0.82 → **0.02** | 0.5 → **0.3** | 2.0 → **1.4** | 2 → **0** | 9.6 → **1.5** | 53 → **47** | 2.5 → **3.9** | 4.58 → **2.23** |
| dropped kerb | 0.19 → **0.02** | 1.0 → **1.1** | 2.9 → **3.1** | 4 → **6** | 6.9 → **1.6** | 82 → **79** | 3.5 → **3.8** | 1.49 → **1.19** |
| stairs up 17 walk | 0.21 → **0.03** | 7.2 → **1.6** | 15.6 → **4.8** | 59 → **17** | 24.8 → **15.8** | 97 → **65** | 4.7 → **7.8** | 3.65 → **1.97** |
| stairs up 17 run | 0.93 → **0.16** | 3.6 → **0.6** | 13.4 → **2.8** | 38 → **6** | 23.6 → **15.0** | 53 → **32** | 2.6 → **11.6** | 6.51 → **3.50** |
| stairs down 21 walk | 0.23 → **0.10** | 4.2 → **1.9** | 22.2 → **7.9** | 28 → **14** | 10.1 → **4.6** | 73 → **55** | 6.5 → **13.8** | 2.92 → **2.11** |
| stairs down 21 run | 0.90 → **0.03** | 2.4 → **0.4** | 13.0 → **1.2** | 17 → **0** | 5.1 → **1.9** | 44 → **54** | 3.8 → **7.5** | 5.58 → **3.98** |
| ramp 15 up | 0.20 → **0.03** | 1.9 → **1.5** | 4.7 → **4.5** | 19 → **14** | 4.0 → **1.8** | 108 → **87** | 2.6 → **4.2** | 0.91 → **1.30** |
| ramp 15 down | 0.20 → **0.05** | 1.3 → **1.1** | 2.6 → **3.8** | 1 → **8** | 4.5 → **2.0** | 81 → **86** | 4.6 → **3.5** | 1.08 → **1.09** |
| ramp 30 up | 0.21 → **0.06** | 2.7 → **2.5** | 6.9 → **7.4** | 39 → **23** | 10.0 → **4.1** | 97 → **63** | 3.7 → **7.5** | 1.58 → **1.93** |
| ramp 30 down | 0.20 → **0.10** | 2.5 → **1.7** | 5.9 → **6.2** | 43 → **13** | 8.8 → **4.0** | 62 → **63** | 7.2 → **5.8** | 2.04 → **1.73** |
| ramp 45 up | 0.24 → **0.07** | 2.3 → **1.8** | 7.2 → **5.6** | 27 → **15** | 20.8 → **12.1** | 84 → **52** | 4.1 → **12.1** | 2.44 → **2.57** |
| ramp 45 down | 0.20 → **0.13** | 5.9 → **2.2** | 43.1 → **9.6** | 33 → **22** | 10.3 → **4.4** | 59 → **54** | 5.6 → **10.1** | 2.97 → **2.06** |
| slope 55 (blocked) | 0.13 → **0.09** | 13.4 → **2.3** | 16.5 → **7.2** | 84 → **9** | 19.5 → **7.0** | 93 → **62** | 1.9 → **5.3** | 0.47 → **0.77** |
| house stairs up | 0.12 → **0.09** | 2.4 → **1.4** | 14.2 → **6.4** | 20 → **14** | 31.1 → **19.8** | 56 → **48** | 4.5 → **12.1** | 6.16 → **8.94** |
| house stairs down | 0.09 → **0.11** | 1.9 → **1.4** | 7.1 → **7.9** | 19 → **10** | 14.0 → **15.6** | 68 → **57** | 8.8 → **13.7** | 3.09 → **2.00** |
| turn on the spot | 0.40 → **0.21** | 0.5 → **1.3** | 1.8 → **5.7** | 1 → **16** | 1.6 → **1.5** | 108 → **106** | 2.2 → **4.9** | 0.47 → **0.97** |
| turn 90 walking | 0.43 → **0.23** | 0.8 → **1.0** | 2.2 → **3.1** | 1 → **7** | 1.6 → **1.6** | 108 → **106** | 2.2 → **3.3** | 0.47 → **0.79** |
| start / stop walk | 0.16 → **0.10** | 0.4 → **0.8** | 1.7 → **4.0** | 1 → **7** | 1.6 → **1.6** | 108 → **110** | 2.1 → **2.8** | 0.47 → **0.59** |
| start / stop run | 0.23 → **0.06** | 0.2 → **0.3** | 0.5 → **0.8** | 0 → **1** | 1.6 → **1.6** | 53 → **52** | 2.8 → **4.0** | 1.41 → **1.69** |
| running jump | 0.87 → **0.21** | 0.3 → **0.3** | 1.2 → **1.2** | 0 → **0** | 1.6 → **1.5** | 53 → **53** | 2.7 → **6.4** | 5.83 → **6.41** |
| fall 1.5 m | 0.01 → **0.00** | 0.2 → **0.2** | 0.3 → **0.4** | 0 → **0** | 0.0 → **4.5** | 59 → **59** | 2.5 → **5.3** | 3.81 → **8.23** |
| walk into wall | 0.14 → **0.08** | 0.3 → **0.7** | 1.3 → **3.8** | 0 → **7** | 1.6 → **1.6** | 108 → **107** | 2.0 → **2.8** | 0.61 → **0.62** |
| slide along wall | 0.25 → **0.03** | 0.8 → **1.0** | 2.2 → **2.7** | 1 → **2** | 1.6 → **1.6** | 108 → **109** | 2.2 → **2.9** | 0.47 → **0.57** |
| past a trunk | 0.39 → **0.07** | 0.8 → **1.1** | 2.2 → **3.4** | 1 → **11** | 1.6 → **1.6** | 108 → **107** | 2.3 → **3.2** | 0.47 → **0.69** |

Reading it: the planted-foot slide is gone almost everywhere (0.77-0.93 → 0.02-0.16 m/s at a run); toes no longer go
through kerbs (14-16 → 2-3 cm); stairs and steep ramps keep the feet on the treads far more (planted gap p95 on
stairs 13-22 → 1-8 cm); the frame rates now agree. Costs: the pelvis moves more on stairs and slopes (it bends to
let the legs reach instead of leaving feet in the air: pelvis sd up to 12-14 cm, knees bend more), flat-ground
planted gap p95 is ~0.5 cm higher (a locked foot a few cm from the clip's place, the leg near full length), turning
on the spot reads its stepping foot as a small gap. *pen* is a worst single frame (often the toe tip exactly on a
riser's face). *hip v* on landings now includes the absorb dip (that is the intent).

The city (Place de Saint-Job, 10 walks / runs across the square, setts, kerbs, rails): planted slide 0.01-0.10
m/s (one run along a wall 0.19), planted gap 0.2-1.1 cm mean, p95 0.8-3.6 cm. The interior house stairs
(?interior=1 / interior lab, 18 x 18.2 cm): walking up gap p95 ~17 cm (the steep, 24 cm going: still the weakest
case), down 8-11 cm, running down 0.3-2.8 cm.

CPU: whole character 0.24 ms per frame (physics 0.04, camera 0.02, animation + IK 0.18, of which IK 0.055); the
controller bench 3.7 us per 120 Hz step.

## What remains

- Walking UP steep stairs (37 deg house stairs, 17/29 course stairs): the clip's planted foot still straddles a
  nosing for a few frames (heel on one tread, toe at the next riser: 15-20 cm worst frames). A real stair gait clip
  (or a tread-snapped landing target computed from the stair's pitch) would fix it properly.
- No jump / fall clip on this rig: the held run stride stays in the air (the landing now absorbs). A procedural
  air pose (tucked legs, reaching for the ground before touch-down) is the next step; Quaternius UAL is still a
  UE-style rig (needs retargeting).
- The turn on the spot is a pivot + a corrective step, not a turn clip.
- The pelvis drops a lot going down steep stairs (to 21-25 cm): legible as a careful descent, but a little deep.

## Clips: one skeleton, retargeted (2026-11-07)

- **Standard:** the Mixamo bone names are the interchange (`tools/characters/rigs.mjs`). Every rig maps its bones onto
  them: Quaternius modular men (our Hoodie / Casual), Quaternius UAL 1/2, Mixamo (prefix `mixamorig:` stripped).
  Future mocap goes through Mixamo's layout.
- **Retarget:** `node tools/characters/retarget.mjs [--raw <data/raw>]` (Node, explicit math, no three.js; Mixamo FBX
  first go through `tools/blender/fbx2glb.py`). Per bone, a semantic frame built from each rig's own reference pose
  (towards its child + a body axis), so A-pose / T-pose / 100x binds cancel out; hips height and foot lift scaled by
  the leg-length ratio above each rig's own standing height; our rig's IK-style feet get the source's ankle
  positions; travelling clips are made in place with a root-velocity track (`clips.json`).
  - Hoodie -> Hoodie (`--roundtrip`): 0.0000 deg, 0.000 mm (lossless). UAL2 FBX route = GLB route exactly
    (`--compare-src`).
- **Output:** `models/characters/clips.glb` (CC0 sources) and, git-ignored, `clips_mixamo.glb` (Adobe's terms),
  `clips.json`: per clip its role, loop flag, duration, foot contacts (per frame), take-off / touch-down times, root
  speed / velocity. The viewer loads them with the character (`characterModel.js`): a role a clip fills replaces the
  stand-in (jump: the held run pose).

### How to plug a new clip in
1. Put the source file in `data/raw/` (Mixamo: `animations/mixamo/`, FBX Binary, Without Skin, 30 fps; run the
   Blender command `retarget.mjs` prints). A new rig: add its bone map to `RIGS` in `rigs.mjs` (canonical name ->
   its bone; `ends`: the middle finger, the ankle, the toe).
2. Add a job to `JOBS` in `retarget.mjs`: `{ from, to, role, loop }`. Roles the body knows: `jumpStart`, `fall`, `land`,
   `stairsUp`, `stairsDown`, `stairsUpRun`, `stairsDownRun` (and, wired next, `turnL` / `turnR`, `walkStart` / `walkStop`).
3. Run `node tools/characters/retarget.mjs`, open the lab with `?preview=<clip name>` (the clip alone, IK off, body
   cameras in the Foot audit folder), then T (tests) and "measure all".
4. Phases come from the clip (foot contacts in clips.json, the IK's own planted / swing test), limits are in leg and
   foot lengths: a better clip means the IK corrects less, nothing to retune.

### Stairs with a stair clip (wired, waiting for the clips)
- `ThirdPerson._scanStairs`: 26 rays along the motion (-0.25 .. +1 m) + bisection at each riser: riser and tread
  (lab: 0.170 / 0.288, 0.2125 / 0.269, house 0.185 / 0.262 m measured), direction, confidence k.
- With a stair clip for that direction the controller's speed is capped to tread x the clip's steps per second (one
  tread per step), the clip blends in by k in phase with the walk / run, and the flat-clip stair stand-ins (stride
  warp, quicker cadence, slowdown) switch off.
