# Chapelle de Stalle, round 3 ("AAA"): resume notes (WIP, paused 2026-11-10 for a shutdown)

Branch claude/stalle, merged with claude/foundation (68609d8, conflicts in .gitignore / labs/index.html / viewer/main.js
resolved keeping both sides). The committed GLBs / AO / stalle.json are still the round-2 ones (consistent with each
other); NOTHING below has been rebuilt + packed into models/stalle/*.glb yet. Round-2 copies for A/B: models/stalle/_before/
(git-ignored).

## Done (code written; status says what was verified)
- tools/mesh_audit/ (audit.js, glb.mjs, cli.mjs, hook.mjs, README.md): the shared checker. VERIFIED it runs (chapel LOD0
  12k tris in ~2 s, interior 97k in ~20 s) and that the chapel's findings are real (see README "Calibration"). Before-
  fix counts: exterior 634 blocking (531 coplanar: flush rings behind chamfered reveals, aisle roofs through the shoulder
  copings = owner's gable-corner z-fight, cross arms, band/plinth ends at house corners; 77 leaks: door-jamb quoins over
  the opening, gutter ends, statue gaps); interior 2680 blocking (chairs' rail corners, oculi splays 20 vs 32 sides,
  glass 5 mm behind splays, retable). README calibration text mentions town hall / Saint-Job: NOT yet run on them (task D).
- tools/stalle_pack.mjs: pre-pack hook (auditBeforePack on the raw GLB, stops on blocking unless --force-audit;
  auditAfterPack on the packed GLB; reports in models/stalle/audit/). NOT yet exercised.
- labs/flickerTest.js + labs/stalle-lab.js (frame(dt) refactor, lab.renderFrame / pause / resume / flicker(), panel
  button "flicker test", "real slates" toggle). node --check OK; NOT run in the browser yet.
- tools/blender/stalle_common.py: CDT fills with a hex grid of interior points (cdt_tris, no slivers -> fixes the
  oculus-to-lancet streak), Builder per-face seed (COLOR_0.b) + forced vertex AO (K.SEED / K.VAO), all-thin fast path in
  make_object, DOOR_FRAME / DOOR_LEAF / DOOR_OPEN_DEG / RAISE constants.
- tools/blender/roofkit.py: reusable slate-roof generator (NATURAL / REGULAR specs, slate_quad / slate_poly, facet_uv).
- tools/blender/stalle.py: no flush rings (hole()/door_hole() + chamfer faces), sealed west door (oak frame front +
  inner sides, leaves behind it with a 2.2 cm rebate, on the threshold, astragal, backing), raised shoulder copings +
  parapet backs (roofs stop at u = T_WEST), mitred one-piece rake coping, one-piece cross, quoins from the ground,
  lintel/relieving arch without overlap, 32-sided oculi, closed gutters with stop ends, ridge cap + hip rolls, slates on
  every facet into node "Stalle_slates" (LOD0 only, vertex AO, separate bake), deck UVs in the slate facet frame,
  house/sacristy corner rule for bands/plinths, house copings raised + parapet backs, statue placement (right-handed
  frame X = -U). A --no-bake build RAN OK (slates were 87k tris before the side-face trim; trim not rebuilt yet).
- tools/blender/stalle_interior.py: arcade rewritten (arches spring from the abaci, wall only above the springing,
  soffits along the arcs, respond faces, voussoir rings clipped at the pier axis = one springer joint), 64-segment
  shafts + astragal + smooth bell capital, octagon abacus whose incircle = the bell rim (closed bottom); interior door
  reveal to the frame back + frame back ring + threshold to u 0.37; leaves at u 0.37-0.415 with hinges on their inner
  outer corners, backing, inner cover strip; door_open_angle = 92; oculi splays 32 sides, glass at the splay end;
  chair front/back rails between the side rails. A --no-bake test build RAN OK (before the chair/oculus fixes).
- viewer/stalleModel.js: analytic pillowed coursed rubble (no derivative bump = no black dashes; tangent frame = the
  Blender UV0 frame), slate material (real slates by COLOR_0.b seed, deck painted on the same course grid, butt shadow,
  tilt normal, grey crustose lichen + faint film on north slopes, no blobs), subtler wall algae, Stalle_slates node
  (castShadow off, own fade ST_SLATES 42 +-10 m via slateFade); lab + city use it. node --check OK; NOT seen in a browser.

## Half done
- tools/blender/stalle_statue.py: v1 (cloth sim) rejected after looking at the previews (boxy shelf, crumpled hooks,
  faceless heads, mirrored). v2 = sculpt-by-script drapery (robe_fn, mantle_fn, apron_fn, swag_top, sleeve, armfall_fn),
  sculpt_head / hair_mass rewritten, voxel remesh 3 mm (509k faces in 4.6 s). The v2 run was in progress (weathering
  loop + export + Cycles previews to the scratch dir) at the pause: its statue_raw.json may be partial -> RERUN it.
  Previews not yet looked at. Then: node tools/stalle_statue_pack.mjs (meshopt -> statue_mesh.json, ~14k tris).
- The GPU "before" bench (lab, golden, 3 rounds, noisy: other GPU load): c00 L0 +0.52 / L1 +0.92 / L2 +0.33 ms;
  c05 -0.20 / +0.13 / +0.07; overview -0.07 / -0.13 / +0.46. Re-run before vs after back to back (models/stalle/_before).

## Next, in order
1. Statue: rerun, look at statue_front/threequarter/face.png next to data/raw/refs/stalle/c03.jpg, iterate; pack.
2. Exterior: blender stalle.py (with bake) -> node tools/stalle_pack.mjs (audit runs) -> fix until clean; then
   interior: blender stalle_interior.py --samples 768 -> pack --nolod -> audit clean (add retable fixes).
3. Browser: lab (port 8802) masonry vs c00 crop, slates near/far + the 32-52 m hand-over, lichen, statue; flicker test
   fixed/strafe/dolly at several distances; moving sequences (approach, orbit, LOD bands; interior door opening, walk
   past capitals); side-by-sides with photos; GPU before/after.
4. Task D: node tools/mesh_audit/cli.mjs on models/townhall/townhall.glb, models/stjob/stjob.glb, and (git show)
   claude/observatory + claude/saint-pierre GLBs: report only.
5. NOTES.md + docs/TODO.md; note for the materials library: slate (deck courses aligned with roofkit) + sandstone_rubble.

## Commands
```
B="C:/Program Files/Blender Foundation/Blender 5.0/blender.exe"
"$B" --factory-startup -b -P tools/blender/stalle_statue.py -- models/stalle --preview <dir>
node tools/stalle_statue_pack.mjs models/stalle 14000
"$B" --factory-startup -b -P tools/blender/stalle.py -- models/stalle [--no-bake]
node tools/stalle_pack.mjs models/stalle/stalle.raw.glb models/stalle/stalle.glb     # audit before/after pack
"$B" --factory-startup -b -P tools/blender/stalle_interior.py -- models/stalle --samples 768
node tools/stalle_pack.mjs models/stalle/interior.raw.glb models/stalle/interior.glb --nolod
node tools/mesh_audit/cli.mjs models/stalle/stalle.glb --nodes Stalle,Stalle_door --range Stalle=94 --offset 0,30,0 --ignore-below 3.85
```

## Open questions
- Slates cost: ~40-50k tris after the trim (LOD0 only, < 52 m, no shadow). Acceptable vs the town hall's 55k LOD0?
- Interior real-time shadows are off (castShadow false); the "door shadow flicker" likely came from the old leaves
  intersecting the reveal at 100 deg and the 1 cm frame/leaf overlap: verify with the flicker test after the rebuild.
