# Verrewinkel bridge: where the work stands (resume here)

Branch `claude/verrewinkel` (from claude/trains 2de8f9d). Notes, counts, results: `verrewinkel_NOTES.md`; docs/TRAINS.md
"Verrewinkel" section.

Rebuild:
```
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/roadBridge.py -- verrewinkel models/rail [--preview <abs dir>]
node tools/mesh_audit/cli.mjs models/rail/verrewinkel.glb --out models/rail/audit --ignore-below -1.5      # LOD0
node tools/verrewinkel_lods.mjs models/rail/verrewinkel.glb --out models/rail/audit                       # LOD1 / LOD2 as the viewer makes them
python tools/verrewinkel_photopose.py                                                                    # s05 camera (venv: numpy, Pillow)
node tools/build_worker.mjs                                                                              # after railData.js / tileData.js
```
City: `http://localhost:8823/viewer/index.html?tile=F7&trains=1&at=-268,1308`.

Open items: docs/TODO.md (Verrewinkel lines under Trains).
