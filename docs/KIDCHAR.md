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
