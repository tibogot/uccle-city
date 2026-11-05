# Interior pilot: status (branch claude/interior)

Method and architecture: **`docs/INTERIOR.md`**. Lab: `labs/interior-lab.html`. City: `viewer/index.html?tile=I6&interior=1`.

## Done
- House: UrbIS building 1786120 (tile I6, ~140 m west of Place de Saint-Job; 5.66 x 10.9 m, two bays, red brick).
  Spec `models/interior/maison1/house.json` (`tools/interior/houseSpec.mjs`), openings = the façade shader's
  (`viewer/interior/facadeWindows.js`).
- Blender build + bake (`tools/blender/interior.py`, kit `interior_kit.py`, showcase `interior_kit_preview.py`):
  architecture lightmap 1024² x3 (sky / sun / night), per-corner light on all pieces, ambient-cube probes; GLB packed
  with meshopt (`tools/interior/packGlb.mjs`, 5.4 MB).
- Viewer: `viewer/interior/` (cut.js, interiorModel.js, portal.js, probes.js, cityInterior.js), `facades.js` /
  `ground.js` cut behind `?interior=1`, `character/body.js` material-variant hook, one guarded line in `main.js`.
- Lab with walking character (door opens, 18-step stair climbed with foot IK, walls / furniture collide), day / night,
  debug views, perf readout. Screens: `docs/interior/lab_*_day.png`, `lab_*_night.png`, `blender_*.png`, `kit_*.png`.

## Re-run
```
node tools/interior/houseSpec.mjs 1786120 I6 models/interior/maison1
& "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/interior.py -- models/interior/maison1 --samples 1024 [--preview docs/interior --ev-day 5.5]
node tools/interior/packGlb.mjs models/interior/maison1/interior.raw.glb models/interior/maison1/interior.glb
```
(PowerShell `&`; ~6 min on the RTX 4050 with OptiX.)

## Open (see the final report's weak list)
Stair / landing too dark; mirror is a flat grey (no reflection); the slit between stringer and treads; the per-material
shader build still costs ~50 ms main-thread chunks at load; sun lightmap baked for one sun direction; GLB 5.4 MB.
