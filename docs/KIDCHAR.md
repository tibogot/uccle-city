# The kid, MakeHuman candidates (branch `claude/kidchar`, phase 1, 2026-11-25)

The owner rejected the cartoon kid look ("huge Jimmy Neutron head") and asked for a realistically proportioned white boy of
about 11 with hair, in the city's look: between real and stylised. Phase 1 makes **three candidates** with MakeHuman's
Blender add-on MPFB so the owner can choose. Nothing is wired into the game yet. The current kid (docs/KID.md) keeps its
rig, animations and rider IK. Phase 2 moves them onto the chosen candidate (see the end of this file).

## Install (2026-11-25)
- **MPFB 2.0.18** (the latest release, GitHub `makehumancommunity/mpfb2` tag v2.0.18, 2026-10-11; build info 20261010) was
  already installed as a Blender extension (`%APPDATA%/Blender Foundation/Blender/5.0/extensions/user_default/mpfb`),
  manifest `blender_version_min = "4.2.0"`, `license = SPDX:GPL-3.0-or-later`. It **works on Blender 5.0.0 headless**: a
  script enables `bl_ext.user_default.mpfb` after `--factory-startup` and calls MPFB's services (HumanService,
  TargetService, AssetService, ExportService) directly. Nothing else was installed in Blender.
- **Asset packs** (official site only: static.makehumancommunity.org/assets/assetpacks.html, downloads from
  files.makehumancommunity.org/asset_packs/...), unpacked into MPFB's user data dir
  (`%APPDATA%/Blender Foundation/Blender/5.0/extensions/.user/user_default/mpfb/data`). The zips are kept in
  `C:\Users\tibog\Downloads\uccle-kidchar\mpfb_packs\`, outside git:
  | pack | zip | licence (pack page + `packs/<pack>.json` per asset) |
  |---|---|---|
  | makehuman_system_assets | makehuman_system_assets_cc0.zip (268 MB) | CC0 (94 of 94 assets) |
  | hair01 | hair01_cc0.zip (217 MB) | CC0 (25 of 25) |
  | shirts01 | shirts01_cc0.zip (23 MB) | CC0 (10 of 10) |
  | pants01 | pants01_cc0.zip (21 MB) | CC0 (4 of 4) |

## Licences (read 2026-11-25)
- **MPFB code: GPL v3** (https://github.com/makehumancommunity/mpfb2/blob/master/LICENSE.md, section B, and LICENSE.CODE.md).
  We do not ship any MPFB code. Our script only calls it inside Blender, like any add-on.
- **MPFB's bundled assets (base mesh, targets, rigs, weights, textures): CC0 1.0** (same LICENSE.md, section C, and
  LICENSE.ASSETS.md).
- **What MPFB produces** (exports, renders, scripted output): LICENSE.md section D says the MakeHuman team "makes no claim
  whatsoever" over it. It is a mix of CC0 assets and our own input, so we can do what we like with it, including use in
  a public game.
- **Asset packs**: every pack used is in the CC0 list on the asset-pack page, and each asset's own `license` field is
  "CC0". We used **no CC-BY pack**. The page lists Hair 02/03, Pants 02/03, Shirts 02/03, Shoes 02/03 and others as
  CC-BY; if a later round uses one, its author goes into CREDITS.md first.
- Assets used: skin `young_caucasian_male`, eyes `low-poly` (+ the blue / brown / bluegreen materials), `eyelashes01`,
  `eyebrow010` / `eyebrow006` / `eyebrow001`, hair `short01` / `short02` (system) and `sonntag78_junglebook_hair`
  (hair01, by sonntag78), shirts `elvs_crude_t-shirt_male` (shirts01, by elvs) and `namuhekam_male_polo_shirt` (shirts01,
  by namuhekam), pants `cortu_cargo_pants` (pants01, by Cortu, cut to shorts), shoes `shoes05` / `shoes06` (system). All
  CC0. CREDITS.md lists them anyway (not required).

## Build
```
blender -b --factory-startup -P tools/blender/kidMakeHuman.py -- --cand a|b|c [--renders DIR]   # -> models/kid/candidates/kid_<c>.raw.glb + .json
node tools/kid/kidCandPack.mjs [a b c]                                                       # -> kid_<c>.glb (meshopt) + kid_<c>_<k>.ktx2
```
`kidMakeHuman.py`, per candidate:
1. MPFB human with gender 1, **age 0.1875 (= 11 years** on MakeHuman's scale: 0 = 1 y, 0.1875 = 11 y, 0.5 = 25 y), caucasian 1,
   weight / muscle / proportions per candidate. The **height macro** is solved by a secant step so the body is 1.44 / 1.47
   / 1.46 m. Then the face targets for each candidate (round / oval / square head, nose, chin, cheeks, a slight smile) are
   added, and the feet are put back on the ground.
2. Skin `young_caucasian_male` as a GAMEENGINE material (one Principled BSDF), and the **game_engine rig** (53 bones,
   Unreal-mannequin names).
3. Eyes, brows, lashes, hair, shirt, cargo pants and sneakers as MHCLO assets (GAMEENGINE materials, no subdivision).
   MPFB's delete groups hide the skin under the clothes.
4. **90s shorts**: the cargo pants are cut 3.5 cm above the knee. The pants' delete group on the body shrinks to the same
   line so the shins come back. (The pack's `cortu_jeans_shorts` are hot pants on a kid.) The waistband above the tee's
   hem is removed, and the part just under the hem is pulled in 8 mm, so it does not poke through in a zigzag.
5. Hair rides rigidly on the `head` bone. C's mop is `sonntag78_junglebook_hair` cut at chin height with the fringe
   opened at the middle, plus a scalp shell under it in a darker hair colour.
6. **Tints**: hair, shirt and shorts textures are recoloured by luminance to a target colour, which is baked into a new
   image. Clothes keep 50-60 % of their texture contrast and are opaque (the polo's hem texture had alpha holes).
7. Export copy (MPFB ExportService: shape keys and masks baked, helpers removed). **Triangle budget**: the body and
   shoes get a uniform, X-symmetric collapse decimate (body 0.68, shoes 0.6, the polo 0.75, C's hair 0.6). Images go
   down to 1024 px. The GLB is skinned, with no animations and no morph targets.
8. `--renders DIR`: Cycles on OPTIX (the script switches to the GPU; factory startup would render on the CPU). Front, 3/4
   and side shots at 85 mm, plus a face close-up, of the **exported (decimated) copy**.

`kidCandPack.mjs` (like tools/bike/bmx_pack.mjs): EXT_meshopt_compression on every buffer (exponential positions and
UVs, octahedral int8 normals, uint8 joints, uint8 weights summing to 255), the skin's inverse bind matrices, and base
colours as KTX2 (UASTC q2 + zstd 18 + mipmaps, `ktx create`). Normal maps are dropped. Hair is MASK 0.5 and double
sided, brows and lashes are BLEND, everything else is OPAQUE.

## The candidates
| | look | height | head (crown-chin) | tris | files |
|---|---|---|---|---|---|
| **A: short tousled** | `short01` tinted mid-brown, round open face, small upturned nose, blue eyes; yellow tee, khaki shorts, white sneakers | 1.44 m | 0.207 m = 1/6.9 | 22,593 | kid_a.glb 283 KB + 8 KTX2 3.6 MB |
| **B: side-parted** | `short02` (its own brown, side-swept), oval face, longer straight nose, brown eyes, a little taller and leaner; red polo, denim shorts, blue sneakers | 1.47 m | 0.219 m = 1/6.7 | 24,338 | kid_b.glb 300 KB + 8 KTX2 3.5 MB |
| **C: 90s mop (longer)** | `sonntag78_junglebook_hair` cut to a chin-length mop with a fringe, dark blond, squarer face, wider jaw, blue-green eyes; teal tee, olive shorts | 1.46 m | 0.215 m = 1/6.8 | 23,037 | kid_c.glb 287 KB + 8 KTX2 3.9 MB |
| current kid | scripted on UAL, cartoon head | 1.46 m | 1/5.7 | 14,753 (LOD0) | models/characters/kid.glb |

Renders (outside git): `C:\Users\tibog\Downloads\uccle-kidchar\kid_<c>_{front,q34,side,face}.png` and the sheet
`kid_candidates.png` (the three candidates and the current kid's docs/kid renders). Lab screenshots: `lab_lineup_front.png`,
`lab_face_a.png`, `lab_face_c.png`.

**The lab**: `debug/bikeLab.html?cands=1`, panel folder "Kid candidates". It shows the line-up 6 m beside the bike
(A, B, C and the current kid playing its Idle, or its bind pose), with labels showing height, head ratio and triangles.
Drag to orbit and use the wheel to zoom. Buttons give the views all front / 3/4 / side / back and face A / B / C / now.
Sliders set spacing, distance, pitch and yaw. `&candraw=1` loads the unpacked raw GLBs for debugging.

**Critical look**: all three read as boys of about 10-12, not teens and not toddlers. Proportions are real (head about
1/6.7-1/6.9 of the height, long legs, narrow shoulders). Next to them the current kid's 1/5.7 head looks like the cartoon
the owner rejected.
- A is the most "kid next door". The tousled short01 holds up up close.
- B looks the most natural and the youngest. The polo is very 90s.
- C is the most "90s" silhouette. Its hair is a mop / bowl with a fringe, **not true middle-parted curtains**: no CC0
  library hair has a middle part. Mirroring short03's side-swept half gave a torn part, so it was dropped (see the script
  docstring). Real curtains need a scripted hair mesh in a later round.

Not uncanny at game distance. Up close, MakeHuman's neutral face looks a little serious or sad, even with the slight
smile target. The lab's flat light makes the eyes look glassy. Phase 2 options: soften with the city's painted kid
material (rim, warm AO) and expressions (MPFB face rig / visemes are CC0).

## Root cause found on the way (no gate row added)
The first exports had **wings** (triangles from the hips to the wrists) and **no shins** in the GLB, although the Cycles
renders looked clean. Why: the renders showed the original human, but the export copy was decimated with a
vertex-group-weighted collapse (head and hands kept). On the MakeHuman base mesh, that collapse folded the body into
wings and lost the shins. Rule: decimate uniformly (symmetric), and **render the exported copy**, never the source. The
script now does both. To check a GLB, import it in Blender and render it (as was done here) or open the lab's line-up.

## Phase 2 (not done): the current kid's animations on the MPFB rig
- **Bones**: MPFB's `game_engine` rig uses the Unreal-mannequin names, the same as UAL: pelvis, spine_01..03, neck_01,
  clavicle/upperarm/lowerarm/hand_l|r, the fingers index/middle/ring/pinky/thumb_01..03, thigh/calf/foot/ball_l|r.
  Differences: UAL `root` vs MPFB `Root`; UAL `Head` vs MPFB `head`; UAL has leaf bones (`*_04_leaf_*`, `ball_leaf_*`)
  that MPFB lacks (they are only ends, so drop them). Every animated UAL joint has an MPFB twin: a name map of 2 renames.
- **Rest poses differ**: MPFB rests in MakeHuman's **A-pose** (arms about 45° down) with Blender bone rolls. The kid and
  UAL bind in a T-pose with Unreal's local axes. So local rotations can't be copied. Retarget in world space per bone:
  `Rw_mpfb(t) = (Rw_ual(t) * Rw_ual_rest^-1) * Rw_mpfb_rest`, then `local = parentW^-1 * Rw`. The pelvis translation is
  scaled by the hip-height ratio (measure the MPFB pelvis height at retarget time against the kid's 0.7253 m). Bake this offline into
  `models/kid/<chosen>.glb` like `ualBuild.mjs --kid` does today (it already re-measures contacts and speeds on the
  kid's legs). Better still, add a `--mpfb` mode there, so the same 33 clips (Idle, walk, jog, sprint, jump, crouch,
  sit, push, roll, fall...) and the metadata in `kid.json` come out the same.
- **Rider IK** (viewer/kid/riderIK.js) and kidMount.js address bones by UAL names and measure limb lengths from the
  skeleton at load. With the name map (`Head`->`head`, `root`->`Root`) and a T/A-neutral "base pose" taken from the
  retargeted Idle frame 0, the IK should carry over. Re-run its tests (gate row `kid`: 840 poses on the BMX) on the new
  skeleton. Watch the arm length: MPFB's real arms are longer than the round-5 kid's shortened arms (RIDE.reachArm).
- Also for phase 2: LODs (the body decimated to about 5k / 1.6k like the kid), one material per LOD or a texture atlas
  (today about 8 draws per candidate), the game skin material, and colliders / heights in `CHARACTERS`.

## Phase 2: A v2, the game build (2026-11-26)
The owner picked A ("A is cool but we will still have to fine tune it better"). To swap him in, open
`debug/bikeLab.html?kid=a`. The default stays the old kid until the owner OKs. Other URL flags: `&cap=back`, `&night=1`,
`&poses=1`, and `&cands=1`, which shows A v1, A v2, B, C and the old kid side by side.

### Build (repeatable)
```
blender -b --factory-startup -P tools/blender/kidMakeHuman.py -- --cand a2 --game [--renders DIR] [--cap fwd|back]
python -E tools/kid/kidAtlas.py                 # kidA_atlas.png -> kidA_atlas.ktx2 (UASTC + zstd, coverage-preserving hair mips)
node tools/characters/kidABuild.mjs             # kidA_src.glb + kid.glb's 33 clips -> kidA.glb + kidA.json
node --import ./tools/heap/register.mjs tools/kid/kidTest.mjs --model kidA     # gate row `kida` (34 checks)
```

`tools/blender/kidGame.py` runs with `--game`. It starts from candidate A's human with the v2 face targets
(`CANDS["a2"]`): mouth corners up 0.5, fuller cheeks 0.45, softer cheek bones, light laugh lines and less eye bag. That
gives a relaxed half smile, and he still reads as clearly about 11. Then it does four things:

- **The 90s outfit, built from his own body.** Each garment is the body's faces of a region (chosen by dominant bone),
  offset out, smoothed, cut by planes for clean hems, cuffs and the zip, solidified, and given the body's weights. The
  skin under it is hidden. No logos; our own colours.
  - A colour-block **windbreaker**: teal, a white stripe, purple, and a navy hem, collar and cuffs. The zip is open and
    shows the white tee.
  - **High white socks** with a red and a navy stripe.
  - A **cap**: red, white centre panel, navy brim. It is lifted over the hair, so the hair stays under it; only the
    hidden crown hair is removed.
  - **Knee shorts**: the CC0 cargo pants cut at the knee.
  - **Chunky white sneakers**: shoes05 recoloured, 8 % wider and 6 % taller, with its own sock cut off.
- **Cap forward or backwards.** Both brims are in the mesh, each in its own slot, and the material hides one. Switch with
  `kid.setCap("fwd" | "back")`, the lab's Kid folder or `&cap=back`. It is a uniform write, no rebuild.
- **The UAL T-pose.** This is the retarget planned in phase 1, done at the rig instead of on the clips.
  - Each of the export copy's 53 MPFB bones is turned, in hierarchy order, to point along its UAL twin. The UAL rest
    comes from models/kid/ual_rest.json, dumped from kid.glb by `tools/kid/ualRestDump.mjs`.
  - Each bone also gets the same twist: the palm across index -> pinky, the feet forward, the hips and shoulders
    across. The worst direction error is 0.00 deg.
  - The head goes back to its own face-forward orientation.
  - The meshes are baked in that pose and the pose becomes the rest. `head` is renamed `Head` and `Root` becomes `root`.
  - The UAL clips' local rotations then mean the same on him as on the old kid. The test finds his rest orientations
    equal to the UAL's within 0.05 deg.
- **One atlas and three LODs.**
  - The atlas is 2048 x 1280: skin 1024; hair, tee, shorts and sneakers 512; eyes, brows and lashes 256; plus
    generated colour cells for the jacket, sleeves, socks and cap.
  - One mesh per LOD, with a material per **slot**. The 13 slots are skin, shorts, tee, brows, lashes, eyes, shoes,
    hair, brim_b, brim_f, cap, jacket and socks.
  - Per-vertex AO is baked in Cycles (OPTIX).
  - LOD0 has **20,716** tris, LOD1 **7,999**, LOD2 **2,000**. The decimation is a uniform, symmetric collapse, and the
    garments are decimated before their UVs are written.

`tools/characters/kidABuild.mjs` is the planned `ualBuild.mjs --mpfb` mode, built differently. **The raw UAL packs are
not on this disk** (data/raw/characters is gone from the main checkout), so it starts from kid.glb, which carries the
same 33 clips on the UAL rig. It:
- moves the UAL joints to his joints (error 0.000 mm);
- scales the pelvis translation by 1.0348 (his k is 0.81877, the old kid's 0.79126);
- writes his inverse bind matrices;
- merges each LOD into one primitive with `_SLOT`, UVs and AO;
- writes kidA.json: kid.json's metadata with the distances (speeds, step positions) scaled by his leg ratio 1.0685, plus
  his own rest heights.

Limit: the stair clips are still the ones synthesised on the old kid's legs, only scaled. Re-run ualBuild's stair
synthesis when the packs are back. Sizes: kidA.glb 2.96 MB (uncompressed, like kid.glb) and kidA_atlas.ktx2 1.45 MB.

**Viewer.**
- `CHARACTERS.kidA` lives in viewer/character/characterModel.js. loadCharacter now passes the renderer through, which the
  KTX2 loader needs.
- `kidAtlasMaterial` (viewer/kid/kidModel.js) takes its colour from the atlas, with a lighter warm AO tint and a rim
  (the painted look). Only the skin slot gets a little warm glow; its roughness is 0.62, so there is no plastic shine.
  Roughness is set per slot: eyes 0.28 (for a catchlight), cloth 0.9. It is alpha-tested and double sided for the hair
  cards. One draw per LOD.
- His gaits are the old kid's scaled by 1.07.

**Riding** uses `RIDE_KIDA` (viewer/kid/riderIK.js). His torso is longer from the hips to the shoulders, so at the full
spine bend his shoulders were still 8 cm short of the grips and the body slid off the saddle. His hips now sit 4.5 cm
further forward. 6 cm damped the landing wobble below the test's 5 cm. His arms reach 73-82 % of their length, with the
elbows bent.

### Checks
Gate row `kida` runs tools/kid/kidTest.mjs --model kidA and passes 34/34. The old kid's row is unchanged at 32/32.
- **Budgets:** one primitive per LOD (one draw), at most 22k / 8.5k / 2.2k tris, and LOD ratios of at least 30 % and
  20 % (no popping).
- **Data:** every slot has a roughness, and the atlas exists.
- **Rig:** the skeleton, rest orientations and clips match the UAL rig; the bind pose error is 0.000 mm.
- **Deformation:** CPU skinning over 15 clips. Tears per joint: knee 0.45 %, elbow 0.24 %, shoulder 0.39 %, hip 0.82 %
  (each must be at most 1 %). The worst edge stretches x3.8.
- **Rider:** on the placeholder bike and the BMX, 1320 poses each. The mount state machine and the keys also pass.

`KID_DEBUG=1` prints the torn edges by `region:slot`, with an example edge. That is how the hip tear below was found.

### Root causes found on the way (why -> rule -> check)
- **The hips tore 3.2 % (edges stretched x22).** The skin inside the shorts was never hidden, because the CC0 pants'
  delete group leaves the crotch, and the low-poly shorts' crotch weights jumped. Rule **hide-skin-under-garments**:
  every garment hides the skin it covers, and cloth weights are relaxed. Check: the per-joint tear row (`kida`).
- **Half the jacket was missing.** A bisect meant to open the zip was set to clear its outer side, so it cut away a whole
  side. Now the zip line is only split and the gap strip deleted.
- **The garments showed the skin texture.** A new UV layer added next to the body's got a `.001` name, and the body's UVs
  won. The body's layer is now dropped first.
- **Saw-tooth colour blocks and "flames" on the sleeves.** First, colours were set per face. Then the sleeve test counted
  the 'body' and 'Left' vertex groups as bones. Rule **garment-colour-in-cells**: colour bands live in small generated
  atlas cells along the garment's own coordinate, and faces are classified by bone weights only.
- **The head looked up after the T-pose.** The neck's correction rotated it; it is now restored to face forward.
- **The face went muddy under the cap in the lab.** The old kid's AO tint is too strong on a textured face; A uses a
  lighter one.

### Look notes (critical)
In the renders and the lab line-up he reads as an 11-year-old in a 90s outfit. He is not uncanny at game distance, and
the half smile is subtle. Not perfect yet:
- the jacket hem is slightly ragged at the solidify rim;
- the jacket front is a bit full at the belly in profile;
- the cap crown is roomy, because it sits over the hair;
- the short hair shows only at the sides and nape under the cap (worn backwards, the fringe shows);
- the BMX is small for his real-length legs, so his knees ride high when seated (as in real BMX riding).

Night was checked in Blender (a blue night with a sodium lamp) and with the lab's night test light.

### Renders and screenshots (outside git: C:\Users\tibog\Downloads\uccle-kidchar\v2\)
- `A_v2_compare.png`: A before vs after, day and night, plus the lab.
- Blender renders: `A_v2_day_{front,q34,side,back,face}.png` and `A_v2_night_{q34,face}.png`.
- Lab: `lab_face_A_v2.png`, `lab_walk_day.png`, `lab_walk_night.png`, `lab_ride_seated_side.png`,
  `lab_ride_standing_sprint.png`, `lab_ride_crouch_air.png`, `lab_pose_sheet_1.png`, `lab_pose_sheet_crouch.png`.

## Phase 3: the polish round (2026-11-26, branch claude/kid)
Kid A is now the bike lab's default. `?kid=old` brings back the scripted kid; `?kid=0` gives the placeholder rider.

### Clips from the real UAL packs
The packs are back on disk, so `node tools/characters/ualBuild.mjs --kid --src kidA` builds him the same way the old kid
is built.
- It reads kidA_src.glb and kidA_rig.json and keeps his UVs.
- The stair clips are re-synthesised on his own legs. Base hips: StairsUp -8.8 cm, StairsDown -12.0 cm.
- Every speed, contact and step is measured on his legs: walk 0.798, jog 4.386, sprint 6.755 m/s. These replace the
  1.0685 scaling of the old kid's values.
- `tools/characters/kidABuild.mjs` (building from kid.glb) is now only a fallback for when the packs are missing.

Note: the committed kid.glb is not byte-reproducible by `ualBuild.mjs --kid`, even before this round (the bytes differ
from offset 1477073 on). The old kid's kid.glb was left as committed.

### The BMX and his knees
**Why the knees rode high.** The bike is a true 20" BMX: wheel R 0.254, wheelbase 0.95, BB 0.29, 175 mm cranks, saddle
top 0.74 m. The problem was his longer hips-to-shoulders torso. From the low saddle his shoulders could not reach the
bars even at the spine's full bend, so the IK slid his body 7 cm forward off the saddle. That closed his knees to 41 deg
at the top of the stroke and 115 deg at the bottom. The old kid does the same: a 10 cm slide, knees at 39 deg.

**The fix** is `RIDE_KIDA` in viewer/kid/riderIK.js:
- The **seat post is 5 cm up** (`seatPost`). `bmxModel.setSeatPost` slides the saddle and the Seat empty along the
  71 deg seat tube and adds a chrome post piece. The node tests move the Seat empty the same way.
- The **pelvis is pitched 0.6 rad forward**: he leans from the hips.
- **Ankling** (`RIDE.ankling`; 0 for the old kid): the heel drops by 3 cm over the top of the stroke and lifts at the
  bottom.
- The hip fit now turns the hip offsets by the pelvis pitch and roll that are applied just after it.

**Result:** his knee runs 56 deg at the top to 130 at the bottom, he stays on the saddle (no slide), and his elbows
bend to at most 94 deg.

**The geometric limit.** The stroke takes 2 x 175 mm out of a 0.705 m leg whose reach is capped at 96.5 %. That closes
the knee to about 55-60 deg at best. Reaching 70-80 deg would need junior cranks of about 140 mm, which is a change to
the BMX asset (another agent's) and was not made.

**Check:** a new kidTest row, "rider (bmx): seated pedalling: knee at the top, elbows bent, on the saddle". Kid A must
reach 50-85 deg with no slide. The old kid must reach 35-85 deg (it rides at 39). All suites pass:

| suite | checks |
|---|---|
| kid | 33/33 |
| kida | 35/35 |
| bike | 96 |
| bikepark | 17 |
| bikefall | 22 |

### Look leftovers fixed (why -> rule -> check)
- **The hem was ragged.** Two causes. The garments were decimated *after* their cuts, so the collapse chewed the hem and
  cuff edges. And the hip sides are moved by the thigh bones, so the jacket region left them out and ended above the cut
  line in a step. Fixes:
  - decimate before cutting;
  - the jacket region takes the thigh-moved hip sides;
  - the hem sits at the waist (a 90s elastic hem; lower down it folded with the thighs: hips 1.6 %);
  - 80 % of the jacket's thigh weights move to the pelvis;
  - the shorts end 1.2 cm under the hem (their dark belt stood out below it).

  Check: the kida tear rows (hips 0.86 %).
- **The jacket was full at the belly.** It followed his belly. It now hangs from the chest's front line (`jk_shape`). The
  tee strip and the shorts' waistband are kept 6-10 mm behind it, so nothing pokes through.
- **The cap was roomy and sat high.** It had been lifted over the hair by up to 4.5 cm. It now sits 1.2 cm over the
  scalp, with the rim 6 mm lower. The hair under it is pressed to at most 8 mm off the scalp (1801 vertices); the fringe
  still falls below the rim.
- **There were skin holes above the socks, at the wrists and inside the shorts.** The skin was hidden over the whole
  uncut garment region. Now only the skin 1 cm inside every cut is hidden (rule hide-skin-under-garments, refined).

### Renders in the game pose
`tools/blender/kidARender.py` renders the GAME model (kidA.glb, any clip; Idle by default) with the atlas, the AO and the
chosen brim, by day and at night. The bind-pose renders showed the UAL T-pose posture (arched back), not what the game
shows.

LOD0 has 21,706 tris, LOD1 7,997, LOD2 2,000.

Renders: `C:\Users\tibog\Downloads\uccle-kidchar\v3\`.
- `A_v3_compare.png`: before (v2, Idle) vs after.
- `A_v3_{day,night}_*.png`: after.
- `A_v2idle_*.png`: before.
- Lab shots: `lab_*`.

## Phase 4: owner feedback round (2026-11-26)
The owner saw kid A standing next to the bike in the lab and said: "his shoulders are far backward, he looks like he has
breasts, it doesn't look like a real person", and "the BMX wheels are inside the ground". They approved shorter cranks
and asked for the knee marks to be fixed.

### Posture (the root cause, measured bone by bone)
**What was measured.** The same clips (Idle, Walk) on the UAL mannequin, the old kid and kid A, comparing world
directions and lengths per bone (`spine_01..03`, the clavicles, the upper arms, the neck, the head).

**Why it went wrong.** MPFB's spine joints sit low and straight:

| from pelvis | to spine_01 | to spine_02 | to spine_03 | to neck_01 |
|---|---|---|---|---|
| MPFB, segment length | 8.0 cm | 6.2 cm | 5.1 cm | 27.8 cm |
| UAL, segment length | 9.7 cm | 8.9 cm | 10.2 cm | 12.4 cm |
| UAL, lean (+ forward) | 14 deg | 7 deg | -2 deg | -2 deg |

The UAL's joints follow its back curve; MPFB's run straight up the torso. The phase-2 T-pose turned every bone onto its
UAL direction, so it bent his trunk at the lower back, turned the neck forward and turned the clavicles back. In the
Idle, his shoulders sat 7.3 cm behind the torso's middle, his torso was arched 20 deg, and his chest pushed out into the
jacket: the "breasts".

**The fix** is `respine` in tools/blender/kidGame.py, run before the T-pose:
- The spine joints are placed along the UAL's own curve, scaled to his torso and ending at his own neck.
- The head joint goes on the UAL's neck direction.
- The clavicle roots are placed so the clavicles already point the UAL's way, with his shoulder joints left where they
  are.
- The torso's spine weights are re-made along the new joints (hat functions; the neck, arm and leg weights are left
  untouched).

The T-pose then turns no spine or clavicle bone, his torso keeps its own upright shape, and the clips mean the same
thing on him as on the mannequin.

**Rule posture-at-rest-match. Check:** kidTest rows in `kida` (Idle and Walk, side view, measured on the skinned
mesh).
- Posture: the shoulder joints are 1.2 cm off the torso's middle (v3: 7.3), and the torso and head lean within 4 deg and
  2 cm of the UAL mannequin's.
- Flat chest: no two mounds across the jacket's front, and a chest depth of 15-24 cm.

### Chest and jacket
At gender 1.0 the MakeHuman macros apply no breast volume (that target only acts on the female factor). The "breasts"
were the arched pose. On top of the posture fix:
- the jacket front is relaxed flat across the chest, so it never follows the pectorals;
- the white tee strip is narrower (|x| < 4.2 cm) and kept 1 cm behind the jacket, so it can't poke through.

### Knee marks and collar
- **Knee marks.** The socks were built on the full-resolution leg, and the skin was decimated afterwards. Its facets sat
  a few mm inside the old surface, which left a dark gap at the sock tops. The cuffs (the top 2.5 cm) are now snapped
  onto the decimated skin, 1 mm out. A turned-in hem was tried first but folded into dark ticks at the sides.
- **Collar.** The jagged edge was a navy band cut by height across the near-flat shoulder tops. The collar is now teal.

### Kid cranks (owner approved)
- The BMX now has 140 mm junior cranks (a 20" BMX sized for an 11-year-old of 1.45 m), set in tools/blender/bmx.py.
- The crank arm's bend point scales with the crank length. Left at the old position, the LOD1 arm crossed its pedal
  boss, which the mesh audit blocked.
- `RIDE_KIDA` now has the seat post 6 cm up and ankling of 5 cm.
- Result: his knee is at 72 deg at the top of the stroke and 118 at the bottom, he stays on the saddle, and his elbows
  bend to at most 94 deg. The kidTest band is 68-85 deg.
- The old kid still passes (47 deg at the top).
- bmxCheck checks the 140 mm crank and passes 86/86. Pedalling uses the gear rollout, not the crank length.

### Wheels on the ground
**Rule wheels-on-ground. New gate row `wheels`:** tools/bike/wheelsTest.mjs measures the DRAWN tyres.

**Root causes.** The drawn tyre radius is the physics' radius (0.254 m). But:
- The physics' contacts are springs: each wheel penetrates by its compression (2.9 cm static sag, 6-8 cm on a landing),
  and the rigid drawn bike sat that deep in the ground.
- Parked, the bike's CoM was set 0.92 m over the ground; the rest height is 0.95. The bike sank 8.8 cm.
- Lying, the CoM height of 0.25 m put the whole bike 72 cm under the ground.

**Fixes:**
- bikeModel draws the bike on its tyres. Each wheel's penetration is measured on the drawn pose, because the physics'
  own value is one step old (1-1.5 cm on landings and kerbs). The frame is lifted and turned so both hubs sit at tyre
  radius over their ground, solved in the pitched and leaned frame.
- Parked or lying (`s.parked`), bmxModel sets the drawn bike down on its lowest point: tread, grip, pedal or saddle.
- `pen` and `parked` are declared in createBikeState. Adding them later turned the state into a dictionary object, and
  the sound mapping started allocating.

**Check:** the drawn tread is within -0.5 .. +1.0 cm of the ground in every contact frame, in all 10 checks: flat,
standing still, kerb, sand (a bite of up to 2 cm allowed), park kicker, quarter pipe, berm loop, pump track, parked
standing, and lying (on its bar end, nothing under the ground).

### Shots
In `C:\Users\tibog\Downloads\uccle-kidchar\v4\`:
- `A_v4_compare.png`
- `A_v4_*` (after) and `A_v4_walk_*` (walking, after)
- `A_v3_walk_*` (walking, before)
- `knee_closeup_before_after.png`
- `collar_closeup_before_after.png`
- `lab_*`

## Phase 5: riding poses against photos (2026-11-26)
The owner asked us to "compare with images online of people riding bikes". I looked at photos and did not store them:
- Wikimedia Commons "BMX race" (kids in a race berm) and "BMX boy" (a seated boy on a BMX);
- Bing image results (a rider on a pump track);
- written coaching guides: the USA Cycling BMX Skills Curriculum and MTB "attack position" guides.

**Photo notes:**
- head up, eyes ahead;
- seated: the back 20-35 deg forward, the arms long with a slight bend (elbow 120-160 deg);
- standing: out of the saddle over the bottom bracket, the legs near straight at the bottom of the stroke, the elbows
  bent and out;
- heels down when standing, crouched or landing;
- landing: the knees and elbows bent to absorb;
- manual: the arms near straight, the hips low and back;
- cornering: the bike leans more than the body.

**Found (before this phase):**
- The arms were folded: elbow 94 deg seated and 51 standing.
- The toes pointed down in every pose: foot pitch 35 deg, where flat on the ground is 24.
- In a turn the body leaned 1.27 times the bike, the opposite of a real rider.
- The arms were bent in a manual.
- The standing hips were pinned about 1 cm above the seated ones. The leg fit ignored the ankling lift, losing 5 cm of
  reach.

**Fixes:**
- New riderIK settings:
  - `reachArmMin`: the back comes up, down to `spineMin`, until the arms open. Less when crouched, more in a manual.
  - `heelDrop` / `heelDropStand`: the heels down.
  - The leg fit now uses the ankled pedal circle.
- `RIDE_KIDA`:

  | setting | value |
  |---|---|
  | reachArmMin | 0.9 |
  | reachArmCrouch | 0.14 |
  | reachArmManual | 0.02 |
  | spineMin | -0.4 |
  | standFwd | 0.1 |
  | standPitch | 0.1 |
  | heelDrop | 0.12 |
  | heelDropStand | 0.2 |
  | leanExtra | -0.3 |
  | manualBack | 0.26 |

**Check:** a new kidTest row in `kida`, "riding poses vs photos". For cruise, sprint, descent, air, landing, berm and
manual, it measures the head pitch, torso lean, elbow and knee angles, foot pitch, hip position against the bottom
bracket and saddle, and the body-to-bike lean ratio, each against a range from the notes. The old settings fail it in 9
places.

**Now:**

| pose | measured |
|---|---|
| cruise | torso 31, elbow 124 |
| sprint | hips over the BB (-3 cm), 7 cm higher than seated, knee 84-140, elbow 101 |
| descent | hips 12 cm behind the BB, heels 17 |
| air | elbow 120 |
| landing | knee 57-90, elbow 98 |
| manual | elbow 131, hips 19 cm back |
| turn | the body at 0.63 of the bike's lean |

The head is level in every pose (6 deg down).

**Shots:** `C:\Users\tibog\Downloads\uccle-kidchar\ride\ride_sheet.png` (the lab's orbit camera at 0.25x) and the
`r_*.png` frames.
