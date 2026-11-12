# fixes1 resume notes

Branch `claude/fixes1`, worktree `.claude/worktrees/fixes1`, server `python %TEMP%/uccle_nocache_server.py 8843 <worktree>`.
Write-up: `docs/fixes1/README.md`.

## State

- Job 1 (tram on ramps): DONE, see README. Rebuild the profile after any change to the tram tracks or the DTM:
  `node tools/build_tram_profile.mjs` (50 s). Check: `const m = await import("/debug/tramStrip.js");
  await m.jointCheck(tripId, d0, d1)`; strips: `m.strip({ clock, seconds, view: "side"|"chase", at: [x, z] })` or a
  fixed `cam` / `look`.
- Job 2 (clean buildings): in progress. Node audit of the generator: `node tools/mesh_audit/cityBuildings.mjs I6
  [--group details+walls] [--json out.json --items 4000 --debug]`.

## Baseline (before job 2), tile I6, Node runner (same numbers as the browser audit of 2026-11-10/11)

| group | tris | blocking | coplanar | depth | crossing | flipped | leak |
|---|---|---|---|---|---|---|---|
| walls+roofs | 31,543 | 3,667 | 315 | 17 | 42 | 0 | 12 |
| details+walls | 127,527 | 86,003 | 14,709 | 454 | 1,009 | 68,262 | 320 |
| details+roofs | 118,436 | 84,347 | 12,302 | 254 | 716 | 68,262 | 585 |
| details alone | 107,210 | 81,660 | 12,129 | 241 | 631 | 68,262 | 299 |
