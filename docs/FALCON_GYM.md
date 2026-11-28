# The Falcon Gym (labs/falcon-gym.html, branch claude/falconlab, 2026-11-25)

A small greybox playground under the city's own sky, sun, haze and post chain (`viewer/lighting.js` +
`viewer/post.js`, as the Capsule Lab). It is for tuning the falcon's flight, take-offs and landings and its animations
before they go into the city game. URL (the job's server): `http://localhost:8840/labs/falcon-gym.html`. Options:

- `?ctl=gym|current`
- `?start=field|alley|passage|tower|high300|high800`
- `?time=midday|golden|...`
- `?pigeons=40`, `?wind=3`

Rule: `docs/rules/falcon-gym.md` (the v2: "the v2 base"). Gate row: `falcongym` (`tools/falconGymTest.mjs`, headless). Browser row: `falcongym`.

## What is where

| file | what |
|---|---|
| `viewer/falconGym/gymLayout.js` | the greybox, pure JS. The boxes, tree crowns, ledges, roosts and the air's inputs. The queries both controllers use: `floor`, `column` (the passage has a ceiling), `sphereHit`, `ray`, `clearUp` |
| `viewer/falconGym/gymScene.js` | the meshes: one merged mesh per material (~10 draws), the Capsule Lab's 1 m / 25 cm grid material, no lights |
| `viewer/falconGym/gymFlight.js` | **the proposed controller** (pure JS, node-tested) |
| `viewer/falconGym/gymBird.js` | the falcon: the current model or v2. It adds the ground and take-off clips and the same procedural layers (`viewer/birdRig.js`) |
| `labs/falcon-gym.*` | the lab: both controllers (switchable), pigeons (`viewer/falconFlight/pigeons.js`), the air (`air.js`: a thermal over the field, slope lift off the blocks), the chase camera (`falconCamera.js`). Our own panel (`viewer/panelUI.js`) |
| `tools/falconGymTest.mjs` | the gate row's checks |
| `tools/blender/falconV2b.py`, `tools/falconV2pack.mjs`, `tools/falconV2far.mjs` | the v2 model build (base B, below); `tools/blender/falconV2.py` the first base's (shelved) |
| `tools/falconV2pose.mjs`, `tools/ktx2Decode.mjs` | the v2's pose / hole / pad / plumage checks on the shipped files (the gate row) |

The playground, with the ground at 70 m TAW so the haze sits as at Place de Saint-Job:

- the open field (the start, a thermal, pigeons feeding)
- block A (14 m, window sills on three floors) and the **4 m alley** between it and block B (22 m, a roof railing)
- block C (10 m) with a **covered passage** (3.2 m high)
- a courtyard of four 16 m wings around a 10 x 10 m yard
- the **tower**: 62 m with a balcony ledge, a spire to 86 m
- low walls, benches, six trees

## The controller: what it does differently, and why

The city game's controller is a physical flight model (lift, drag, CLmax) with four layers on top:

- an assist that flies from the player's intent
- an arcade stoop (the dive push)
- the fun layer (lock-on auto-dive)
- a collision response with tumbles

Each layer fixed something real. Together they make it hard to predict what one input does: the owner found it "sometimes fine, sometimes hard". The gym controller is one small model with one rule per input:

| input | gym controller | why |
|---|---|---|
| mouse (pointer lock) | a **direction**: the falcon banks and pitches to fly where you point. A coordinated turn whose lift is limited by the speed (`n = (V / Vstall)^2`, up to 6 g; 8 in the stoop's pull-out), with roll lag | "where you point is where you go". The physics stays honest: slow = wide turns, fast = tight. No separate assist that fights the stick |
| no input | holds the heading and **levels the path**. The mouse aim's pitch relaxes to level when the mouse rests | auto-level: never a slow drift into the ground |
| level, hands off | **flap-flap-glide** bursts hold 21 m/s (76 km/h), as real peregrines fly level | the owner's 65-90 km/h, with no button held |
| Space (left button) | **power**: hard wingbeats while stamina lasts. Up to ~31 m/s (112 km/h) level, or a 3-5 m/s climb. The beats fade near 900-1200 m over the ground | the chase speed; real height (hundreds of metres) |
| Shift (right button) held | **the stoop**: the wings tuck and it dives where you point (at least ~35 deg down). Speed comes from gravity plus a stoop push (below), terminal ~107 m/s. Let go: the wings half open and it pulls out. A **ground guard** starts the pull-out itself when the height left is what the pull-out needs (radius `V^2 / (g (n - 1))` + 0.35 s + 3 m) | 300+ km/h from height, never into the ground |
| F held | **the chase**: aims at the lead point of the pigeon in the ring (the same turn rates, so smooth), and tucks when it is well below | a smooth pigeon chase, no snapping. The catch itself is the other job's (claude/falconfun) |
| walls | a **look-ahead** (3 rays, 1.25 s of flight) banks toward the freer side, or climbs when the obstacle's top is within 12 m. A touch **slides**: the normal part of the speed goes, the rest stays, with a little scrape. A tumble only for a head-on hit over 13 m/s into a big solid. Sills, railings, low walls and trunks only deflect | the owner: "stuck between buildings looks buggy", "no stun from small mistakes" |
| on the ground | stands on anything (the ground, roofs, sills, the railing, the spire). W walks (0.33 m/s: a peregrine's waddle, the v2 Walk's planted speed), Shift + W hops (2.6 m/s), A/D or the mouse turn. Walking off an edge launches | a bird on a roof walks, it does not sit frozen |
| Space on the ground | see the take-off rules below | |
| E | lands on the ledge or flat top surface ahead (< 35 m, < 26 m/s): a Hermite final, then the **flare**. Or fly slowly (< 11 m/s) onto any top face and it touches down | landing on ledges with a flare |

Space on the ground takes off the way a real falcon chooses:

1. **A free drop in front** (a ledge, a roof edge): a forward launch off the edge.
2. **Room above the wings** (a 0.6 m radius column free for 6 m): the **jump + hard wingbeats**. Nearly vertical and slow (1.2 m/s forward, 3.6 m/s up) while walls are within 12 m ahead or 4 m beside. It heads along the freest of eight directions (an alley's axis) and stays centred. Out in the open it speeds up to 9-11 m/s and flies.
3. **Neither** (under the passage): it **walks or hops to the nearest launch spot**, then launches. That is a ledge within 6 m and 3 m up (a clear arc), or open ground on the same floor within 14 m.

### The numbers (all in `GYM`, live in the panel's "Tuning")

A 1 kg juvenile female.

| | |
|---|---|
| stall (1 g at CLmax) | spread 8.0 m/s, half folded 12.5, tucked 32 |
| drag area | spread 0.0035 m², half 0.0045, tucked 0.0043 |
| induced drag | `kInd n² / V²`: 59 spread, 135 half, 300 tucked |
| wingbeats | 0.55 g at rest x `(1 - (V/40)^2)`. Level chase ~31 m/s. Stamina: full power ~22 s, cruise bursts ~160 s, back in ~35 s of gliding, ~4 s standing |
| cruise | 21 m/s by flap-glide bursts (0.9 s on, the off time from the thrust needed) |
| stoop push | **2.0 x g x sin(dive) x tuck** (`stoopPush`; 0 = pure physics) |
| measured (headless) | cruise 71 km/h; chase 112 km/h; stoop from 300 m **304 km/h**, lowest point 20 m; from 1000 m 378 km/h; Space climb reaches ~1090 m in 4 min |

**Why a stoop push.** Pure physics cannot give the owner's "300 km/h from height" within a few hundred metres:

- Free fall from 300 m without any air gives 277 km/h. With a falcon's drag, a 300 m stoop gives ~200 km/h (FALCON_FLIGHT.md: 80 m/s needs ~500 m).
- The pull-out needs ~150 m at 90 m/s.
- The gym's tower is 86 m. The city's highest roofs are ~100 m. The camera's sense of height is compressed too.

So the dive's gravity is boosted by `stoopPush`, and the tuck's drag is raised to match: the terminal stays ~107 m/s (385 km/h, under the 389 record). The falcon-fun branch made the same call (its arcade stoop: 367 km/h from 300 m). Set `stoopPush` to 0 in the panel for the pure physics.

### Compared with the city controller (the panel's "controller": current)

The same greybox, bird, camera and input. The current controller runs `FalconGame` with `fam: null` and the gym's world (its `column` gives the passage a ceiling). Things to compare:

- the take-off from the alley floor: current = a forward drop that touches down again
- the wall graze: current = a tumble at > 6 m/s into a wall
- the hands-off level speed: current = a glide trim at 13 m/s that sinks

## The model and its animations

### The v2 now: base B, Hector Bonada's model (2026-11-25, rule falcon-gym "the v2 base")

The owner found the first v2 full of holes: "plenty of holes in its body", "the model looks good on Sketchfab, please check well". The cause was the 25k download itself: separate tube-like feather cards on a spread-wing bind, which every fold opens into fingers (screenshots `uccle-falcon-gym/v2fix_src_*`). Bonada's "Falcon_ Merged Animations" (CC BY 4.0) has continuous wing and tail surfaces, and in its own idle it already perches like a peregrine. It is now the v2, near and far. The 25k and its build (`tools/blender/falconV2.py`, the sections below) are kept for the record, not shipped.

```
blender --factory-startup -b -P tools/blender/falconV2b.py -- --mesh <src>/falcon__merged_animations.glb --out <src>/build/v2b/falcon_v2.raw.glb
node tools/falconV2pack.mjs <src>/build/v2b/falcon_v2.raw.glb models/bird/v2/falcon_v2.glb
node tools/falconV2far.mjs <src>/build/v2b/falcon_v2.raw.glb <src>/build/v2b/falcon_v2_far.raw.glb --tris 2500
node tools/falconV2pack.mjs <src>/build/v2b/falcon_v2_far.raw.glb models/bird/v2/falcon_v2_far.glb
blender --factory-startup -b -P tools/blender/falconV2preview.py -- --glb <raw.glb> --variants --out <dir> --shots perch_side,walk_side,stoop_side
```

The build takes ~20 s; the pack ~80 s.

- **The rig.** The download's own 95 joints, renamed to our bird rig's names where one exists (`BONEMAP`: Pelvis = hips, Humerus / Ulna / Aula = wing_1 / 2 / 3, TF2 / TF3 = tail_fan_1 / 2, Thigh ... Toe = UpperLeg ... Foot...). The others are kept as `b_<name>` (digits, clavicles, Spine2...), and our helpers are added: root, spine_3, tail_tip, wing_tip. 100 bones.
- **The bind.** The importer's bone rest does not match the skin's bind, so the bind is the idle's frame 48 (`--bind`). The perch is exact.
- **The frame.** Nose -Y, scaled so the glide's tips span 1.05 m (x0.587), the feet at the origin.
- **The skin.** Its own weights, bone for bone, on three materials: the body, the eyes, the flight feathers.
- **Its clips, baked exactly** (each bone's posed matrix -> our local):
  - Perch = Idle: f24-178, looped with a 24-frame blend; its primaries' tips and tail, which dipped 2 cm through the floor, are lifted per frame and smoothed
  - TakeOff: f178-238
  - Land: f304-352
  - Flap: its own 12-frame beat f216-228, which loops exactly
  - Glide: f256 held, the toes closed
- **Ours, from its poses:**
  - Stoop: the idle's folded wings and tail as they lie on the body (the wing tips on the tail), the body pitched so beak to tail tip is level (a teardrop), the feet tucked under the tail's base, the toes closed
  - Talons: the strike: the body reared 55 deg, the wings raised and back with their undersides forward (a brake), the tail down and fanned, the legs thrown forward ahead of the breast, the toes open and splayed, the beak at the feet. The gym blends it in with the talons in flight
  - Flare: the glide, the wings forward and up, the tail down and fanned, the legs forward
  - Walk: 12 frames, 10 cm steps, 60 % stance, planted at 0.33 m/s (`V2_WALK_MPS` = `GYM.walk`), a 2 deg waddle, the body 28 deg, the hips 9 cm
  - Hop: 20 frames: a crouch, a push, the feet tucked up, a landing
  - In both Walk and Hop the legs go by IK, the feet flat as perched, and the toe PADS are put on the floor (not a claw tip).
- **The look.**
  - The eyes: its glowing blue, emissive and mirror-like iris darkened to a peregrine's dark brown, roughness 0.28, 256 px.
  - The juvenile plumage, painted on its own UVs as V2 POLISH's. There is one KTX2 for each painted material (`falcon_v2_juvenile.ktx2`: the body; `_juvenile_1`: the flight feathers), named in `asset.extras.variants` with their material. Upper and under parts are read on the glide pose.
- **Shipped.**
  - `falcon_v2.glb`: 7,268 triangles, 11 clips, 5 KTX2 textures, **3.2 MB**
  - `falcon_v2_juvenile*.ktx2`: 0.75 + 0.58 MB
  - `falcon_v2_far.glb`: **2,476 triangles, 0.29 MB**, the same joints, clips and materials, no textures
- **The pack** (`falconV2pack.mjs`), for both files:
  - drops the textures nobody uses (the emission maps)
  - drops the 2,832 of 3,300 animation channels that hold the rest pose throughout (lossless: a missing track is the rest to three's mixer)
  - merges Blender's 2,300 per-sampler buffer views into ~25
- **In the gym** (`gymBird.js`):
  - all three meshes; the plumage set per material
  - the far LOD bound to the near skeleton per material, switched by the drawn span (far under 56 px, near again over 68 px)
  - the span measured in the Glide (the bind is folded), and the rig's layers calibrated there too
  - the fold / tuck layers fade out with the Stoop clip, which folds by itself
  - the flare layer opens the tail toward the Flare clip's fan
  - `?v2src=<url>` loads another build to look at
- **Checked** (gate row `falcongym`, `tools/falconV2pose.mjs`):
  - the rig names; the perched pose; the toe PADS 0-5 mm over the floor (Perch, Walk, Hop); the toes spread on the ground and closed in flight
  - the crouched Walk / Hop; the tail closed / fanned
  - no see-through holes in the body (six views, the cut-out alpha honoured); no "finger" slits when folded; the underwing not showing when folded
  - the juvenile; the far LOD


**Mesh2Motion (checked 2026-11-25).**

- Repo: github.com/Mesh2Motion/mesh2motion-app, `LICENSE-MIT.MD` for the code and `LICENSE-CC0.MD` for "all 3d models, blend files, rigs, animations". The README says the same.
- The bird assets are in `static/assets/bird/` (commit 2609e034): `model.glb`, `skeleton.glb` and `animations/` (flap, glide, hop, idle, land, take-off, walk, death, rest-pose). They are meshopt-compressed.
- **Our `models/bird/peregrine.glb` is already this rig.** It has the same 55 bones with the same names and rest pose (a slightly older export). That makes path (a) and path (b) the same path: the Mesh2Motion skeleton *is* our rig, so `viewer/birdRig.js`'s layers and the city's falcon code keep working.

**The path chosen.** Re-rig the Sketchfab mesh onto the Mesh2Motion bird skeleton by script (`tools/blender/falconV2.py`, headless Blender 5.0):

1. The rig and all Mesh2Motion clips. `tools/blender/meshoptDecode.mjs` decodes the meshopt files first: Blender 5.0's importer cannot read `EXT_meshopt_compression`.
2. The Sketchfab mesh. Its own armature and animation are dropped, it is joined into one mesh and turned so the span is on X and the nose on -Y (the denser end is the head; `--yaw` overrides).
3. The fit. The rig is scaled uniformly to beak-to-tail length. Then the wing, leg, neck and head bones are moved onto the download's OWN joints (V2 POLISH, below): its bones, or where its skin weights blend.
4. The weights. Mesh2Motion's reference mesh's vertex groups are copied by a Data Transfer (nearest face, interpolated), normalised, 4 bones a vertex. This is more robust than bone-heat weighting on a scan-like mesh, which often fails on non-manifold feathers. Then:
   - the legs take the download's own leg weights, bone for bone
   - every feather card is rigid on one bone
   - the covert sheets lose their feather-bone weights and are smoothed
5. The clips:
   - Mesh2Motion's Flap, Glide, Idle, Walk, Hop, TakeOff and Land, retargeted onto the moved bones. Walk, Idle and Hop also get our folded wing and their feet put on the floor (a root translation).
   - **Stoop**: our folded wing, legs back, tail closed
   - **Talons**: legs forward, toes open
   - **Flare**: wings forward and up, tail down, toes open
   - **Perch**: upright, wings folded with the tips on the tail, the legs by IK from the feet, toes gripping
6. Shading: the mesh's own custom normals are kept, else a Weighted Normal modifier (keep sharp).
7. The glb export with JPEG textures ≤ 2048, all actions, and the juvenile plumage (step 8 of the script). Previews: `tools/blender/falconV2preview.py`, Cycles (OptiX) renders of the exported glb's clips on a checker under a grazing sun, `--tex` for the juvenile.

**Why this way.** Path (b), weight-painting onto `peregrine.glb`, gives the same skeleton but its clips stop at Flap/Glide/Idle/Walk. Mesh2Motion's newer set adds Hop, TakeOff and Land on the same bones, and it is CC0. In the gym, the current model already plays Mesh2Motion's TakeOff/Land/Hop: quaternion tracks only, decoded copies in `models/bird/v2/m2m/`.

The far / family bird ("Falcon_ Merged Animations", 7k faces) goes through the same script with `--far` (textures at 1024).

### The build (2026-11-25, from the owner's downloads)

The two Sketchfab GLBs (`peregrine_falcon.glb`, `falcon__merged_animations.glb` in `C:\Users\tibog\Downloads\uccle-falcon-src\`) are untouched SOURCE files. Everything below is repeatable from them, all scripted:

```
node tools/blender/meshoptDecode.mjs <src>/mesh2motion/animations <src>/mesh2motion-plain/animations   (once; model.glb copied beside)
blender --factory-startup -b -P tools/blender/falconV2.py -- --mesh <src>/peregrine_falcon.glb --rig <src>/mesh2motion-plain --out <src>/build/falcon_v2.raw.glb
node tools/falconV2pack.mjs <src>/build/falcon_v2.raw.glb models/bird/v2/falcon_v2.glb        (--fast: UASTC level 1, no RDO)
blender --factory-startup -b -P tools/blender/falconV2preview.py -- --glb <src>/build/falcon_v2.raw.glb --out <dir> --tex <src>/build/falcon_v2.raw.glb.juvenile.png
```

`tools/textures` needs `npm ci` (ktx2-encoder) for the pack.

What the download needed, found on the way:

- **The bind pose is not usable.** 1786 of its 15195 vertices sit hundreds of metres off in the raw (rest) positions; only its own skin brings them back. So the bind shape is the skin's deformation at a frame of its own animation: the most symmetric, compact spread-wing frame (frame 510, its last). `--frame N` overrides.
- **The scale.** It is in centimetres under a x100 node chain. It is scaled to a 1.05 m wingspan, origin at the feet.
- **Bone-display shapes.** The importer adds an `Icosphere` bone-display mesh; it is dropped.
- **Seven UV sets.** Only the first is kept.
- **The bind is an attack pose.** Its legs hang, its head is held ~15 cm higher than the rig's, its beak is open and its toes splay. Before the shape is taken, its own rig is posed:
  - the tibiotarsus and tarsus shortened to a peregrine's (7.5 / 5.0 cm on a 1.05 m span, from 8.7 / 6.5)
  - the toes squared to the tarsus, the hallux straight back, the joints half curled
  - the beak closed (the lower mandible turned up about its hinge)
- **Translation tracks.** The Mesh2Motion clips' hips / root translation tracks are in its own unscaled units (the hips 1.2 m up after the fit), so the clips keep rotations only. The one exception is the root's translation in our Perch and the grounded Walk / Idle / Hop: it is ours, in metres, and the gym keeps `root.position`.
- **The materials.** The feathers' alpha BLEND became MASK (cut-out, no sorting). Emission and the specular extensions are dropped.

Shipped: `models/bird/v2/falcon_v2.glb`. 25,298 triangles, 11 clips (Flap, Glide, Idle, Walk, Hop, TakeOff, Land, Stoop, Talons, Flare, Perch). EXT_meshopt_compression geometry and three 1024 px KTX2 textures (base colour sRGB, ORM, normal): **2.7 MB**. Beside it, `falcon_v2_juvenile.ktx2` (0.7 MB): the juvenile base colour, named in the glb's `asset.extras.variants`. The gym's v2 wears it by default; the panel's "v2 plumage" switches to the adult. The gate row checks all of it, poses included (`tools/falconV2pose.mjs`).

The gym's panel "model" offers v2. "Side by side" stands both models on a plinth, perched (the panel's "stand pose": perch / glide).

### V2 POLISH (2026-11-25): the perched pose, the folded wings, the talons, the juvenile

The first build stood with its wings spread flat on long stick legs, crumpled its feathers when folding, hung its talons open and wore the adult plumage (screenshots `2-*`, `6-*` in `C:\Users\tibog\Downloads\uccle-falcon-gym\`). Rule: `docs/rules/falcon-gym.md` "The v2 model".

- **The wings by landmarks.** Mesh2Motion's arm is shorter than the download's, so the X stretch put its elbow and wrist mid-forearm and mid-hand. Now its shoulder, elbow, wrist and tip go onto the download's own, piecewise along the span (the reference mesh with them).
- **The legs on the download's joints and weights.** Hip, knee, ankle, foot and the middle toe's two knuckles. Front toes: proximal phalanx on `Foot`, middle on `Toes`, claw on `Toes_tip`; the hallux on `Foot`.
- **The neck and head on the download's.** The joints are where its neck / skull weights blend: the bind's head is ~15 cm higher than the rig's. The neck takes the clips' directions, so the head comes back in line in flight.
- **The feather cards rigid, by the download's own feather groups.** Five sheets a wing: the outer primaries on the hand (`wing_5`), FF4-5 on `wing_feather_4_1`, FF6-8 on `_3_1`, FF9-11 on `_2_1`, FF12-17 on `_1_1`. The tail's cards are on `tail_2`. The covert sheets keep no feather-bone weight. A fold turns whole cards: 0.00 % card stretch in Perch and Stoop.
- **Our own folded wing.** Mesh2Motion's Idle fold fanned this mesh's sheets out. Each wing bone and each sheet's bone is now set as a frame (its line and the wing's upper surface): the humerus back, the forearm forward along the flank, the hand back over the back, the sheets back along the body. In Perch the hand is searched so the tips lie on the tail.
- **Perch.** The body turned up to 45 deg and moved down by the root's translation (hips 13 cm over the feet). The neck up the body's line, the head level. The tail and the wing sheets lifted off the ground. The legs by IK from the feet up: tarsus near upright, knee forward in the belly. Toes flat, claws curled.
- **Talons / Flare** open the toes (the claw ~10 deg); flight keeps the bind's half-closed curl (~84 deg).
- **The juvenile plumage** is painted by the script on v2's own UVs from the adult texture. The adult's lightness is ramped to the juvenile's browns, with buff fringes on the upperparts. The underparts get the adult's bars removed (their fine detail kept), buff with dark VERTICAL drop streaks (the throat plainer). The cere and eye ring go yellow -> bluish-grey; the feet are paler. Palette: `peregrine.py --variant juvenile`'s.

Before / after (Cycles, OptiX): `C:\Users\tibog\Downloads\uccle-falcon-gym\v2polish_compare.png` (perched front / side / back, stoop, glide, talons), `v2polish_after_*.png`, `v2polish_before_*.png`, `v2polish_adult_*.png`.

**The far / family bird: decided, not built.** The best option is a meshopt-simplified v2 (~5-7k triangles) on the same rig, not the second Sketchfab model (`--far` builds it: 7,268 triangles):

- the same 55 bones and clips (the family plays the same Perch / Glide / Stoop), and the same UVs, so the adult KTX2 is shared (no extra texture download)
- no look change at the LOD switch
- the second model has its own attack-pose bind with legs tucked into the body: 1734 of 4885 vertices caught by the leg rule (streaks)

To do: `meshopt_simplifyWithAttributes` per loose part, keeping each feather card's 4 corners. Cards cannot collapse into the body: they are rigid on one bone.

## Orbit / inspect (O)

O (or the panel's "Orbit / inspect" folder) pauses the flight. The camera orbits the falcon's body centre (the hips bone) with three's OrbitControls:

- drag: rotate
- wheel: zoom, 0.3-40 m (out to where the far LOD takes over)
- right-drag or Shift-drag: pan

The "clip in place" picker has: auto (the paused flight pose), perch, glide, flap, stoop, talons, flare, walk, hop, takeoff, land. A clip the current model lacks is the glide plus its procedural layer.

The folder also has a clip time scale, P to pause the clip, T for the turntable, an optional studio fill (the city lighting's own hemisphere light turned up: no light added), preset views (front / side / back / below / above) and a re-centre button. Model and plumage switch live.

O again (or Esc) returns to the exact flight state. `?orbit=1` starts in it.

## Weak points / left

- **The stoop push is a game compromise**, documented above. The owner decides: the panel slider, 0 = physics.
- **The look-ahead's 3 rays miss thin things** (a sill end, the spire's corner). Those deflect instead of tumbling.
- **The landing uses a scripted final** (a Hermite curve, as the city's). It can pass through a thin railing on the way in.
- **The vertical take-off's "boxed" test is geometric** (rays): a bird boxed by trees does not count them.
- **In the city behind a switch** (2026-11-25): `?game=falcon&falconctl=gym` (the controller, `viewer/falconFlight/gymCity.js` + `cityGymWorld.js`: `sphereHit` / `ray` / `clearUp` over the city's height grid and crowns, a ledge pool of roof edges, ridges, the façade kit's sills and railings, lamps, crowns and the church perches) and `&falconmodel=v2` (this falcon, its far LOD, the caught bird in its talons). Rule falcon-gym "the gym in the city" / "the v2 in the city", gate row `falconcity`. **The default since 2026-11-27** (the owner played it: "far better than the old bird"): no switch = the gym controller + v2; `?falconctl=current` / `?falconmodel=current` keep the old ones; the v2 loads at boot only on a falcon page (elsewhere at the first flight).
- **v2 (base B)**:
  - Walking out from under the passage (the `hop` mode's walk-out, 2.6 m/s) still plays the Walk at its 2.5x cap: the feet slide there. A run of hops would fit it better (not done).
  - The wing tips are ~3 cm off the tail line when perched, as the download has them.
  - The download's own wing-covert fringe shows as a dark serrated edge at the folded wing's front (as on Sketchfab).
  - In the Stoop the tucked feet still show under the belly from the side.
  - The bind is a folded pose. A layer added to `birdRig.js` has to be calibrated in the Glide, as `gymBird.js` does.
