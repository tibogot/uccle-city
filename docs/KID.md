# The kid (branch `claude/kid`, 2026-11-18)

The main character of the 90s kid game (docs/KIDGAME.md): a kid of ~11-12 (1.44 m), stylised but grounded (a more
realistic Breath of the Wild: believable proportions, a slightly big head and hands, a simple readable face, soft
painted materials, clear 90s clothes). Scripted, on the Quaternius UAL skeleton so every UAL clip plays on him.
Offline turn: built, tested in node, hooked into the bike lab; the browser turn checks it moving (checklist at the end).

## The base and its licence
| checked (2026-11-18) | what | licence | used? |
|---|---|---|---|
| **Universal Animation Library 1 + 2** (Standard, quaternius.com/packs/universalanimationlibrary(2).html; raw in `data/raw/characters/ual1`, `ual2`) | the universal humanoid rig (65 bones, Unreal-mannequin names), the mannequin with its skin weights, 86 clips | **CC0 1.0** (`License.txt` in both packs) | **yes: the base** (rig, weights, clips) |
| **Universal Base Characters** (Aug 2025, quaternius.com/packs/universalbasecharacters.html, quaternius.itch.io/universal-base-characters) | 6 base bodies (superhero / regular / teen, m + f), 20 hairstyles, ~13k tris, "compatible with UAL" | **CC0** (both pages) | no: the free Standard tier has 2 bodies + 5 hairstyles; the TEEN bodies are in the paid Source tier ($19.99); none is 10-13 |
| Modular Character Outfits - Fantasy (Nov 2025) | 12 outfits for the base characters | CC0 | no: fantasy clothes, not 90s |
| UAL2 female mannequin (`Mannequin_F`) | same rig | CC0 | no (later: a friend) |

So the kid is **our script on the UAL1 mannequin**: its rig and weights are the proven deformation the clips were made on;
everything a kid needs (proportions, head, face, clothes, hair) is built by `tools/characters/kid.py`. CREDITS.md has the row.

## Build
```
blender -b --factory-startup -P tools/characters/kid.py -- [--renders] [--shirt tee|sweat] [--legs shorts|jeans] [--cap 1|0|back]
node tools/characters/ualBuild.mjs --kid          # the UAL clips on the kid's joints -> models/characters/kid.glb + kid.json
node --import ./tools/heap/register.mjs tools/kid/kidTest.mjs      # gate row "kid"
```
`kid.py` (Blender 5.0 headless, Cycles on OPTIX for the AO bake and the renders), in order:
1. imports the UAL1 mannequin + rig;
2. **re-proportions** it: each bone a length and a girth scale (`PROP`: legs 0.79-0.80, torso 0.70-0.74, neck 0.50, head
   0.90, arms 0.76-0.78, hands 0.86; slim limbs), each vertex moved by the blend of its bones' old -> new rest maps (the
   same blend the skinning does: the weights stay right), the bones' heads moved, their ORIENTATIONS kept (so a clip's
   local rotations mean the same on the kid); the pelvis moves by k = 0.799 (the clips' pelvis translation x k);
3. **one smooth skin**: the mannequin is a segmented doll (plates, rims, grooves) with an egg head: its head is replaced by
   a sculpted kid head (cranium, face, jaw, chin, nose, ears, neck as ellipsoids), all fused by a voxel remesh (2.5 mm),
   Laplacian-smoothed (hands masked), decimated to ~7.4k tris, the mannequin's weights transferred back, then SMOOTHED over
   the mesh (the fusion put neighbours from different segments side by side at the armpits / crotch: x10-50 tears in a walk);
4. **clothes from the body**: clean hem lines cut into the skin (planes across the bones), each garment = the skin's own
   faces of a region offset out along the normals (draped: smoothed, kept >= 60 % of its offset off the skin), a turned-in
   hem (no see-through edge), weights copied (it moves exactly with the skin); the skin under the clothes deleted. A 90s
   RINGER tee (ribbed collar + cuffs in `shirt_trim`), long baggy shorts with a rolled hem, white tube socks with two
   stripes, chunky sneakers (thick flat sole, side stripe, laces), a plain 6-panel cap (no logo; `--cap back` = worn
   backwards, `--cap 0` = a bowl cut with a fringe); options: `--shirt sweat`, `--legs jeans`;
5. **hair** (clumped shell + 9 fringe locks + sideburns + nape) and **the face** (eye whites, iris, pupil + highlight,
   arched brows, a small smile): rigid on the head, readable at 3 m (docs/kid/face_3m.jpg);
6. named **slots** (no baked colour): skin, shirt, shirt_trim, shorts, socks, sock_stripe, shoe, sole, shoe_accent,
   lace, hair, cap, cap_brim, eye_white, iris, pupil, brow, mouth; **AO** baked per vertex (Cycles) -> COLOR_0;
7. **LODs** by Decimate: LOD0 14,656 / LOD1 4,997 / LOD2 1,582 tris; exports `kid_src.glb` + `kid_rig.json` (the joints).

`ualBuild.mjs --kid` puts the kid's joint offsets on the UAL nodes (error 0.000 mm), scales the pelvis translation by k,
drops the other translation channels (adult rest), recomputes the inverse bind matrices, merges each LOD's 18 primitives
into ONE with a `_SLOT` attribute, and measures everything else (foot contacts, touch-downs, speeds, the synthesised stair
clips) on the kid's own legs: walk 0.78 / jog 4.28 / sprint 6.59 / crouch 0.60 m/s authored. 33 clips (the 27 of `ual`
+ Sit, SitDown, StandUp, Push, PickUp, FallDown). The UAL build without `--kid` is byte-identical to before.

In the viewer: `CHARACTERS.kid` (viewer/character/characterModel.js, gaits walk 1.1 / run 4.0 / sprint 5.6 / crouch 0.72
m/s) and `viewer/kid/kidModel.js`: one palette material (slot colours + roughness as uniform arrays: an outfit change is
a uniform write), the AO softened to a warm tint, a faint rim (the painted look; no light added), one draw per LOD;
`autoLod(d)` 14 / 40 m with hysteresis.

## Renders (docs/kid/)
`turn_front / q34 / side / back.jpg` (Idle), `pose_walk / run / jump / crouch / sit.jpg` (the UAL clips on the kid),
`face_front / q34 / 3m.jpg`, `face_nocap_front / q34.jpg`, `turn_nocap_q34.jpg` (`--cap 0`), `ride_ik_bmx.png` (the rider
IK on the BMX's empties: seated, foot down, standing, crouched, manual, leaning; side + front).

## Riding (viewer/kid/riderIK.js)
Not a ragdoll, not clips: a base pose (the kid's Idle, frame 0: fists) then, every frame:
1. **hips** on the seat empty in the bike's CoM frame (it leans and pitches with the bike but NOT with the legs: a crouch or
   a landing moves the bike up under the body and the knees bend), raised + forward standing (sprint, preload, air),
   lowered + back crouching (Space, landing absorb), back in a manual, rocking with the cranks when standing; then
   **fitted to the legs**: never further from the pedals' circle (crank axle + crank length) than 96.5 % of the leg;
2. the pelvis turned with the frame, pitched forward, **leaning into the turn** (+22 % of the bike's lean);
3. the **spine** bent (over spine_01..03) until the shoulders are 90 % of the arm from the grips (bisection); if bending
   is not enough (a manual) the body slides toward the bars;
4. the **head** level, looking ahead (heading yaw, a third of the lean), a little down the road;
5. **arms**: two-bone IK, wrists to the grip empties, elbows out and back; **legs**: two-bone IK, ankles to the pedal
   empties (the ball on the pedal), knees forward and a little out, the foot ankling with the crank; a **foot down** at a stop.
Off the bike: `push()` (walking beside it when the physics says pushing, hands on the grip and the seat), `clipPose()` (the
crash: Roll, then lying (FallDown's end), then CrouchIdle), `snapshot()` / `blendFrom()` (the mount / dismount blends).
Every RIDE constant is a slider in the lab's "Kid" folder.

**The bike's empties** (viewer/kid/bikeRig.js): grip_L/R, pedal_L/R, seat, bb, peg_*, frame. The lab's placeholder bike has
them; the **BMX** (claude/bmx, merged here: models/bike/bmx.glb, docs/BMX.md) has Grip_L/R, Foot_L/R, Seat, Crank, Peg_*,
mapped by `viewer/kid/bmxModel.js` (which also moves its Steer / wheels / crank / pedals / cog, scrolls the chain, LODs
12 / 40 m, colourways). The lab uses the BMX (`?bmx=0`: the placeholder).

## Mount (viewer/kid/kidMount.js)
foot --E near the bike (1.3 m)--> mounting (0.45 s blend, a little hop) --> riding --E at <= 2.6 m/s--> dismounting (0.4 s)
--> foot. Off when stopped (< 0.45 m/s): the bike stays STANDING (leaning a little on its pedal); off while rolling: it rolls
on, slows and LIES DOWN. E near a lying bike: the kid picks it up, then gets on. A crash: the tumble (Roll -> lying ->
crouch) while the bike physics slides; when it gets up (BIKE.respawn) the kid blends back on. E too fast: a banner.

## Keys (the bike's table in docs/BIKE.md, `KEYS` in viewer/bike/bikeInput.js)
| key | on foot | on the bike |
|---|---|---|
| W A S D / arrows | walk (camera-relative) | pedal / rear brake / steer |
| Shift | run (sprint after 1.5 s) | stand up + sprint |
| Space | jump | crouch + hop |
| C | crouch (toggle) | pump |
| **E** | **get on** | **get off** |
| Z X I K Q F | - | lean / front brake / trick |
| R G V P 1-9 ? | lab: reset (back on the bike) / get up / camera / pause / spots / card | same |
| mouse drag | orbit the camera | - |
E is free on the bike; a key used in both modes means the same kind of thing (tests check it). The card in the lab shows both.

## Tests (gate row `kid`, 22 checks, ~1.3 s)
Skeleton = UAL (65 joints, names, order, rest orientations); height 1.44 m; LODs 14,656 / 4,997 / 1,582 (<= 15k / 6k / 2k);
slots in the palette; **all 86 UAL1 + UAL2 clips bind**; kid.glb clips rotations + pelvis only; bind pose exact; CPU
skinning through 15 clips (walk, jog, sprint, jump, fall, land, crouch idle / walk, sit, sit down, roll, push, stairs up /
down, fall down): no NaN, edges >= 4 mm torn > x2.5 or crushed < x0.25: kid 0.115 % vs the UAL mannequin's own 0.038 %
(limit 3x the mannequin's or 0.4 %); kidModel (3 LODs, palette, LOD switch); **rider on the placeholder AND the BMX**: 840
poses each (24 crank angles x 5 steer angles x seated / standing / crouched / manual / lean L / lean R / air): legs <= 95-97 %
of their length, arms <= 82 %, feet and hands 0.0 mm off their targets, no NaN; push / tumble / blend finite; 0.36 ms a
frame in node; the mount state machine (13 steps); the keys.

## Known limits (this turn)
- The fused remesh webs the fingers a little (they move as mittens when the hand opens; fists are fine).
- The body under the tee is still the mannequin's athletic torso, slimmed; the shoulders read a little broad.
- The crotch / armpit deform worse than the mannequin's (0.115 % vs 0.038 % of edges): hidden by the shorts and the tee.
- No collider for the parked bike on foot (the kid walks through it).
- No hand orientation on the grips beyond the forearm's continuation (the fist from the Idle pose).
- Dismount at speed: the bike's fall is kinematic (kidMount parkStep), not the bike physics.

## Browser turn: checklist
1. `debug/bikeLab.html`: the kid loads (panel "Kid" state line), the BMX loads (KTX2 chain + spokes), one tab only.
2. On foot: WASD **and arrows** walk, Shift run -> sprint, Space jump, C crouch; the camera orbits with the mouse; the kid's
   feet on the ground (sole), no pop between LODs (walk away to 15 / 40 m).
3. Walk to the bike, E: the mount blend (0.45 s, the little hop) looks like getting on, not a teleport; E far away: banner.
4. Ride every spot (1-9): hands stay on the grips through full steer, feet on the pedals through the crank turn, knees
   never lock straight or cross the frame, the hips sit on the seat (tune hipUp / hipBack), the spine bend reads right.
5. Sprint (Shift): standing, the hips rock with the cranks; Space preload: crouch; landings absorb; X manual: hips back,
   arms long; turns: the lean into the turn (leanExtra).
6. Stop: the left foot goes down. E stopped: off, the bike stands; E rolling at 1-2.5 m/s: the bike rolls on and falls;
   E at speed: "too fast". E near the lying bike: picked up, then on.
7. Crash (wall, kerb at speed): the tumble (Roll), lying, crouch, then back on the bike: no snap, no limb through the ground.
8. Pushing up the 20 % slope (spot 9): the kid walks beside the bike, hands on it.
9. Close-up of the face at 1-3 m in the lab light: eyes / brows / mouth readable; the palette outfits (panel) recolour live.
10. Perf: the "Kid" state line ms (riderIK < 0.3 ms target), the kid = 1 draw (+ shadow) at each LOD.
