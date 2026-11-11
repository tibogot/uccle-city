# Verrewinkel bridge: where the work stands (resume here)

Branch `claude/verrewinkel` (from claude/trains 2de8f9d). Notes and counts: `verrewinkel_NOTES.md`.

Rebuild:
```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/roadBridge.py -- verrewinkel models/rail [--preview <abs dir>]
node tools/mesh_audit/cli.mjs models/rail/verrewinkel.glb --out models/rail/audit --ignore-below -1.5      # LOD0
node tools/verrewinkel_lods.mjs models/rail/verrewinkel.glb --out models/rail/audit                       # LOD1 / LOD2 as the viewer makes them
python tools/verrewinkel_photopose.py                                                                    # s05 camera (venv: numpy, Pillow)
node tools/build_worker.mjs                                                                              # after railData.js / tileData.js
```
City: `http://localhost:8823/viewer/index.html?tile=F7&trains=1&at=-268,1308` (serve the worktree on 8823).

Done: generator + model (LOD0 37.3k tris, checker 0 blocking; LOD1 24.4k, 0 blocking; LOD2 5.7k, NOT clean: see TODO),
s05 camera solve + side by side, city integration (carve, keepClear, UrbIS slab replaced, catenary dips, walk / drive on
the deck, parapet colliders, warm-up, fading copies only in the bands).

Left (in order): moving frame strips through the LOD bands and the deck joins, flicker test, GPU per view, LOD2 clean-up
(a purpose-built far node instead of meshoptimizer), docs/TRAINS.md section, TODO.
