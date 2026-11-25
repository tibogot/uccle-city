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
