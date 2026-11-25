# The Falcon Gym (labs/falcon-gym.html, branch claude/falconlab, 2026-11-25)

A small greybox playground under the city's own sky, sun, haze and post chain (`viewer/lighting.js` +
`viewer/post.js`, as the Capsule Lab). It is for tuning the falcon's flight, take-offs and landings and its animations
before they go into the city game. URL (the job's server): `http://localhost:8840/labs/falcon-gym.html`. Options:

- `?ctl=gym|current`
- `?start=field|alley|passage|tower|high300|high800`
- `?time=midday|golden|...`
- `?pigeons=40`, `?wind=3`

Rule: `docs/rules/falcon-gym.md`. Gate row: `falcongym` (`tools/falconGymTest.mjs`, headless). Browser row: `falcongym`.

## What is where

| file | what |
|---|---|
| `viewer/falconGym/gymLayout.js` | the greybox, pure JS. The boxes, tree crowns, ledges, roosts and the air's inputs. The queries both controllers use: `floor`, `column` (the passage has a ceiling), `sphereHit`, `ray`, `clearUp` |
| `viewer/falconGym/gymScene.js` | the meshes: one merged mesh per material (~10 draws), the Capsule Lab's 1 m / 25 cm grid material, no lights |
| `viewer/falconGym/gymFlight.js` | **the proposed controller** (pure JS, node-tested) |
| `viewer/falconGym/gymBird.js` | the falcon: the current model or v2. It adds the ground and take-off clips and the same procedural layers (`viewer/birdRig.js`) |
| `labs/falcon-gym.*` | the lab: both controllers (switchable), pigeons (`viewer/falconFlight/pigeons.js`), the air (`air.js`: a thermal over the field, slope lift off the blocks), the chase camera (`falconCamera.js`). Our own panel (`viewer/panelUI.js`) |
| `tools/falconGymTest.mjs` | the gate row's checks |
| `tools/blender/falconV2.py`, `tools/blender/meshoptDecode.mjs` | the v2 model build (below) |

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
| on the ground | stands on anything (the ground, roofs, sills, the railing, the spire). W walks (1 m/s), Shift + W hops (2.6 m/s), A/D or the mouse turn. Walking off an edge launches | a bird on a roof walks, it does not sit frozen |
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

**Mesh2Motion (checked 2026-11-25).**

- Repo: github.com/Mesh2Motion/mesh2motion-app, `LICENSE-MIT.MD` for the code and `LICENSE-CC0.MD` for "all 3d models, blend files, rigs, animations". The README says the same.
- The bird assets are in `static/assets/bird/` (commit 2609e034): `model.glb`, `skeleton.glb` and `animations/` (flap, glide, hop, idle, land, take-off, walk, death, rest-pose). They are meshopt-compressed.
- **Our `models/bird/peregrine.glb` is already this rig.** It has the same 55 bones with the same names and rest pose (a slightly older export). That makes path (a) and path (b) the same path: the Mesh2Motion skeleton *is* our rig, so `viewer/birdRig.js`'s layers and the city's falcon code keep working.

**The path chosen.** Re-rig the Sketchfab mesh onto the Mesh2Motion bird skeleton by script (`tools/blender/falconV2.py`, headless Blender 5.0):

1. The rig and all Mesh2Motion clips. `tools/blender/meshoptDecode.mjs` decodes the meshopt files first: Blender 5.0's importer cannot read `EXT_meshopt_compression`.
2. The Sketchfab mesh. Its own armature and animation are dropped, it is joined into one mesh and turned so the span is on X and the nose on -Y (the denser end is the head; `--yaw` overrides).
3. The fit. The rig is scaled uniformly to beak-to-tail length, then the wing chains are stretched to the mesh's wing tips.
4. The weights. Mesh2Motion's reference mesh's vertex groups are copied by a Data Transfer (nearest face, interpolated), normalised, 4 bones a vertex. This is more robust than bone-heat weighting on a scan-like mesh, which often fails on non-manifold feathers.
5. Our own clips on top:
   - **Stoop**: the Mesh2Motion folded wings in flight, legs back, tail closed
   - **Talons**: legs forward, toes open
   - **Flare**: wings forward and up, tail down
   - **Perch**: the folded-wing stand
   - plus Mesh2Motion's Flap, Glide, Idle, Walk, Hop, TakeOff and Land
6. Shading: the mesh's own custom normals are kept, else a Weighted Normal modifier (keep sharp).
7. The glb export with JPEG textures ≤ 2048, all actions. `--preview`: Cycles renders (OptiX) of Glide, Stoop, Perch and Flare on a checker under a grazing sun.

**Why this way.** Path (b), weight-painting onto `peregrine.glb`, gives the same skeleton but its clips stop at Flap/Glide/Idle/Walk. Mesh2Motion's newer set adds Hop, TakeOff and Land on the same bones, and it is CC0. In the gym, the current model already plays Mesh2Motion's TakeOff/Land/Hop: quaternion tracks only, decoded copies in `models/bird/v2/m2m/`.

The far / family bird ("Falcon_ Merged Animations", 7k faces) goes through the same script with `--far` (textures at 1024).

### The build (2026-11-25, from the owner's downloads)

The two Sketchfab GLBs (`peregrine_falcon.glb`, `falcon__merged_animations.glb` in `C:\Users\tibog\Downloads\uccle-falcon-src\`) are untouched SOURCE files. Everything below is repeatable from them, all scripted:

```
node tools/blender/meshoptDecode.mjs <src>/mesh2motion/animations <src>/mesh2motion-plain/animations   (once; model.glb copied beside)
blender --factory-startup -b -P tools/blender/falconV2.py -- --mesh <src>/peregrine_falcon.glb --rig <src>/mesh2motion-plain --out <src>/build/falcon_v2.raw.glb [--preview <dir>]
node tools/falconV2pack.mjs <src>/build/falcon_v2.raw.glb models/bird/v2/falcon_v2.glb        (--fast: UASTC level 1, no RDO)
```

`tools/textures` needs `npm ci` (ktx2-encoder) for the pack.

What the download needed, found on the way:

- **The bind pose is not usable.** 1786 of its 15195 vertices sit hundreds of metres off in the raw (rest) positions; only its own skin brings them back. So the bind shape is the skin's deformation at a frame of its own animation: the most symmetric, compact spread-wing frame (frame 510, its last). `--frame N` overrides.
- **The scale.** It is in centimetres under a x100 node chain. It is scaled to a 1.05 m wingspan, origin at the feet.
- **Bone-display shapes.** The importer adds an `Icosphere` bone-display mesh; it is dropped.
- **Seven UV sets.** Only the first is kept.
- **The legs.** The download's legs hang (an attack pose) where the rig's legs are tucked. A nearest-surface weight transfer split the feet between the leg, the hips and the tail, and the toes stretched into streaks. Every vertex below the thighs or partly on a leg bone now follows its thigh rigidly. The gym tucks the v2 thighs further back in flight.
- **Translation tracks.** The Mesh2Motion clips' hips / root translation tracks are in its own unscaled units (the hips 1.2 m up after the fit), so the clips keep rotations only.
- **The materials.** The feathers' alpha BLEND became MASK (cut-out, no sorting). Emission and the specular extensions are dropped.

Shipped: `models/bird/v2/falcon_v2.glb`. 25,298 triangles, 11 clips (Flap, Glide, Idle, Walk, Hop, TakeOff, Land, Stoop, Talons, Flare, Perch). EXT_meshopt_compression geometry and three 1024 px KTX2 textures (base colour sRGB, ORM, normal): **2.96 MB** (the download: 6.7 MB). The gate row checks all of it.

How it looks (screenshots in `C:\Users\tibog\Downloads\uccle-falcon-gym\`):

- **In flight it reads far better than the current bird**: real feathers, the adult slate / barred plumage.
- **The folded poses are weak**: Perch and Stoop, the Mesh2Motion folded wing on this mesh. The download's wing feathers do not follow the rig's folded wing well (crumpled feathers). The talons hang open.

These need a weight pass on the wing feathers: a per-feather rigid assignment like the legs, or the download's own wing bones mapped onto ours.

The far / family bird (`--far`) builds (7,268 triangles, `<src>/build/falcon_v2_far.raw.glb`) but **is not shipped**. Its frame choice takes a flat glide where its legs are tucked into the body, and the rigid-leg rule catches 1734 of 4885 vertices: streaks. It needs `--frame` set by hand and a tighter leg rule.

Then the gym's panel "model" offers v2 and "side by side" stands both models on a plinth. The gate row checks the triangle count (8k-30k) and the clips.

## Weak points / left

- **The stoop push is a game compromise**, documented above. The owner decides: the panel slider, 0 = physics.
- **The look-ahead's 3 rays miss thin things** (a sill end, the spire's corner). Those deflect instead of tumbling.
- **The landing uses a scripted final** (a Hermite curve, as the city's). It can pass through a thin railing on the way in.
- **The vertical take-off's "boxed" test is geometric** (rays): a bird boxed by trees does not count them.
- **Not in the city yet.** Adopting it means routing `viewer/falconGame/` through `GymFlight` against the city's `column` / roof grid: a `sphereHit` / `ray` / `clearUp` over the tile data, and `ledges` from the roof ridges plus the church perches.
- **v2**: the folded poses (Perch, Stoop) and the hanging talons need a weight pass (above). The far model is not shipped. v2 wears the adult plumage (the player is a juvenile in the story: a juvenile repaint would need peregrine.py's painter on v2's UVs).
