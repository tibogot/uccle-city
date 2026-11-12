# Roads round 2: resume note (keep this current; a usage-limit stop must not lose the work)

Branch `claude/roads2`, worktree `.claude/worktrees/roads2`. Brief: the owner rejected the Road Lab; make the 10 lab
junctions right, then the city. Full report: `docs/roads/ROUND2.md`.

## Setup
- Lab server: `python C:/Users/tibog/AppData/Local/Temp/uccle_nocache_server.py 8815 <worktree>`.
- Capture sink (scratch, not committed): a tiny POST server on 8817 writing under `docs/roads/round2/`; the lab's
  `lab.shot(name)` posts a JPEG of the canvas there. Capture script: `cap_all.js` (scratchpad) = per junction
  plan+photo, plan, close+photo, close, oblique, street.
- Python with shapely: `C:/Users/tibog/Downloads/venv/Scripts/python.exe` (pipeline).
- "Before" code = commit 6c70e37, as a detached worktree in the scratchpad (`rb_before`, junctions to data/raw and the
  node_modules) so the extended checker can be run on the old code and old markings.

## Done
- Before images: `docs/roads/round2/before/j<N>_{plan_photo,plan,close_photo,close,oblique,street}.jpg`.
- Checker C14-C22 (`tools/road_audit/mesh_checks.mjs`, wired in `road_audit.mjs`).
- `pipeline/build_markings.py`: an OSM crossing node within 3 m of a measured OUTLINE is the same crossing.
- `pipeline/verify_crossings.mjs`: the 2024 orthophoto score of every crossing record (`photo` in markings.json).

## Next
See the end of this note.

## State at the end of the round (2026-11-12)
- All fixes 1-14 of ROUND2.md are in, plus the lane graph (`viewer/streets/laneGraph.js`), curves and kerbstones.
- Final numbers: `docs/roads/audit/r2before` vs `r2after` (run both with the same checker: copy
  tools/road_audit/{road_audit,mesh_checks,ortho}.mjs into the rb_before worktree first).
- Pipeline steps after build_markings / build_surfaces: `node ../../pipeline/verify_crossings.mjs` and
  `node ../../pipeline/photo_surfaces.mjs` (run from tools/road_audit so jpeg-js resolves), then
  `node tools/build_worker.mjs`.
- Captures: scratchpad `cap_one.js` (junction views), `cap_spots.js` (owner spots, curves, lanes), `cap_strips.js`
  (moving), `lab.flicker(...)`; compose with `tools/road_audit/compose2.py` and `compose_spots.py`.
- Next: see ROUND2.md "What remains": ramp ring snapping in build_surfaces.py, a cheaper ramp mesh, the T-junction
  metric's layer filter, the BM legend when it arrives.

## Round 3 (2026-11-12, evening)
Report: `docs/roads/ROUND3.md` (per-point clean / not clean). Checker: `docs/roads/audit/r3before` (6c70e37) vs
`r3after`. Images: `docs/roads/round3/` (after/, sheets/, pairs/ = before (6c70e37) | after round 3, glyphs_sheet.jpg).
Open items, in order: concrete open steps (median bands, forecourt seams), the triangle budget (+20 %: the curve
refinement), GPU +5-7 % (concrete shader), J1 kerb flicker near the SE zebra, C19 gaps at paved islands, lane kinks at
tight connectors, the dark line in J1's NE sidewalk. Run the checker from the worktree root (a relative
`--import ./tools/road_audit/register.mjs` fails from another cwd).

## Round 4 (2026-11-13)
Report `docs/roads/ROUND4.md`. Merged foundation (b9e6fe3) and claude/traffic; traffic on by default. Open: GPU A/B on
a quiet GPU (A = foundation 0f94123, B = this branch; tools/serve_nocache.py per worktree), the library ground
materials (item 3), sidewalk / forecourt steps, kerb gaps, Edith Cavell's centre line, tight connectors, J1 dark line.
