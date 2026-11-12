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

## Fixes (branch claude/interior-fix, 2026-11-05)
Before / after sheets: `docs/interior/fix_cmp_*.png` (single shots `fix_*_before.png` / `fix_*_after.png`).
1. **Plant through the front wall**: the monstera reached ~1.4 m (leaves out of the brick at ground level). Plants take
   a `spread`, `put(fit=True)` keeps a piece's whole box 3 cm off the walls, and the build runs a **clearance check** on
   every placed piece (fails on a clip; `--check-only` in seconds). It found 11 clips in all rooms (worktops, wall
   units, dresser, bed headboard, toilet, coat rack, a curtain rod 8 cm into a partition): all fixed; the kitchen sill
   plants now stand on the sill board (they floated 24 cm inside).
2. **Dark stair / landing**: the lantern shades were closed opaque boxes in Cycles, so their lamps lit nothing (only
   the shade glow). Shades are translucent in the bake; hall 40 W, landing 45 W, a new stairwell lantern 50 W; glazed
   fanlights over every panelled door; a frosted **laylight** over the stairwell under a light well + roof light (cf.
   Maison Autrique's verrière). Probe irradiance, landing: day 0.001 -> 0.003 (salon level), night 0.011 -> 0.09.
3. **Bathroom at night**: ceiling lamp on (32 W), a chrome-capped opal mirror light (9 W).
4. **Mirror**: Cycles-rendered reflection cubes per mirror (salon, bathroom), box-projected onto the room in the viewer;
   gilt moulded frame (profile, rosettes, shell crest; `Wood` code 6 gilt shading).
5. **Stringer slit**: the old stringer box sat ~1.5 m too low mid-flight and the spandrel faced into the stair (culled):
   now closed strings with housed treads/risers, an oak capping, the spandrel panelling 12 mm behind the string.
6. **Fabrics**: bumped weave / slub / rib relief, grazing-angle sheen (velvet strong, with crushed-pile variation and
   face-on darkening), gentle top light; drapes with a skewed fold profile, unequal folds deepening to the hem, a
   pinch-pleat heading, rings; softer duvet rumples.
7. **Stream-in hitch**: measured 51-65 ms long task while the cell loaded (+ ~50 ms on the stair). Causes: the per-material
   `compileAsync` built canvas-target variants (not the scene pass's), and sealing the portal dropped the scene's lights
   from the camera's layers (new cache key -> every interior shader rebuilt). Now: `interiorWarmup()` in the boot
   warm-up, no compile on load, lights on the interior layer. After: **0 interior shader builds, no long task** on the
   whole walk street -> hall -> stair -> landing -> bedroom; cell shown 324-420 ms after entering range (was 1.2-1.9 s).

References (Wikimedia Commons): Maison Autrique stair (Mellonne, CC0), verrière / bath / cabinet de toilette
(Anne Jea., CC BY-SA 4.0), "Mirrors from the Charlier Museum" (public domain).

## Open (see the final report's weak list)
Sun lightmap baked for one sun direction; GLB 6.0 MB (+0.6 MB: drapes, strings, fanlights, mirror ornaments) + 3 MB
of reflection atlases; the reflections are flat-coloured (Cycles sees albedo only: no parquet / painting patterns);
a thin brick-red strip at the edge of the stairwell void (pre-existing); the mirror could be a taller trumeau.
