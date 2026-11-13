# Église Saint-Augustin (Altitude Cent): model files
See `docs/landmarks/AUGUSTIN.md` (method, measured vs estimated, references, checks, cost). Rebuild:
`../venv/Scripts/python tools/augustin_measure.py` then `bash tools/augustin_build.sh [--previews]`.
| file | what |
|---|---|
| `augustin.glb` | meshopt + quantized; nodes `Augustin` (LOD0), `Augustin_far` (LOD1), `Augustin_xfar` (LOD2), all scripted; one primitive per slot |
| `augustin_ao.png` | Cycles AO in TEXCOORD_1: LOD0 v 0..0.78, LOD1 0.785..0.92, LOD2 0.925..1; u > 0.994 = thin faces (AO per vertex in COLOR_0.g) |
| `augustin.json` | slots, codes, placement (nothing hidden), levels, triangles per slot, measured / estimated |
| `site.json`, `site_dsm.*`, `site_dtm.*` | the measurements (UrbIS solid 514999 levels in the building frame, DSM grid, DTM patch) |
