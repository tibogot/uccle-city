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
See ROUND2.md "Remaining".
