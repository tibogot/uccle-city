#!/usr/bin/env bash
# EGLISE SAINT-AUGUSTIN: rebuild everything after the measurements (tools/augustin_measure.py):
#   Blender (model + AO bake [+ previews]) -> pack (three scripted levels, no simplification) -> mesh audits.
#   bash tools/augustin_build.sh [--previews] [--fast]
set -e
cd "$(dirname "$0")/.."
BLENDER="C:/Program Files/Blender Foundation/Blender 5.0/blender.exe"
"$BLENDER" --factory-startup -b -P tools/blender/augustin.py -- models/augustin "$@" 2>&1 | grep -iE "error|Trace|bake|lightmap|triangles|done"
node tools/hero_pack.mjs models/augustin/augustin.raw.glb models/augustin/augustin.glb --name Augustin --nolod | tail -2
audit() { node tools/mesh_audit/cli.mjs "$1" --nodes "$2" --range "$2=$3" --ignore-below -1.8 --out "models/augustin/audit/$4" --no-fail | grep BLOCKING; }
# the band ends: LOD0 150 + 25, LOD1 600 + 70, LOD2 6 km (the camera's far plane)
audit models/augustin/augustin.raw.glb Augustin 175 lod0
audit models/augustin/augustin.raw.glb Augustin_far 670 far
audit models/augustin/augustin.raw.glb Augustin_xfar 6000 xfar
audit models/augustin/augustin.glb Augustin 175 packed_lod0
audit models/augustin/augustin.glb Augustin_far 670 packed_far
audit models/augustin/augustin.glb Augustin_xfar 6000 packed_xfar
