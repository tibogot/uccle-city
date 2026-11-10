# Chapelle de Stalle, round 3 ("AAA"): status (2026-11-10, evening run: DONE except what is listed as open)

Branch claude/stalle (not merged, not pushed). Everything below is rebuilt + packed; the pre-pack hook (tools/stalle_pack.mjs
-> tools/mesh_audit/hook.mjs auditGroups) audits every LOD group and stopped the pack while blocking items remained.
Round-2 assets for A/B: models/stalle/_before/ (git-ignored) and a detached worktree of 68609d8 at ./_ab_before
(git-ignored via .git/info/exclude; served at http://localhost:8802/_ab_before/labs/stalle-lab.html; remove with
`git worktree remove _ab_before`).

## Done
- Mesh audit (tools/mesh_audit): LOD groups, culled leak rays, separation over the overlap, enclosed / inside-skin
  viewpoints, slits need a real far-side hit, flipped >= 1 mm2, `bentflat` (bent normals on flat walls), debugTris /
  traceAt; README calibration rewritten to what was done; HEROES_REPORT.md (town hall, Saint-Job, Saint-Pierre,
  Observatory: report only).
- Exterior: 0 blocking before pack (1 justified: a statue crease, audit/stalle.allow.json); far 0; packed LOD1/LOD2 0;
  packed LOD0 4 (quantized gutter stop-end slivers flipped, report-only). LOD1 = the scripted far variant (the meshopt
  LOD1 had ~1700 items), door leaves at LOD0 only.
- Interior: 0 blocking (2 justified: floor-facing bottoms, audit/interior.allow.json).
- Fixes: see NOTES.md "Round 3" (gable corner ledge, slates, eave strip, door astragal, quoins, house rake + kneelers,
  gutters, tracery, statue, flat-wall normals + support rings round the openings, rubble shader, lichen...).
- Statue v2: runs in ~45 s (the O(n^2) normal read fixed); metaball Child; meshopt 14k tris (largest piece only);
  smooth-shaded to 45 deg.
- Slates: 39.4k tris (LOD0 only, < 42 +- 10 m, no shadow); GPU +0.26 / +0.33 ms (interleaved A/B, 8 rounds, 4-8 m).
- Browser: flicker heat maps, frame strips (labs/frameStrip.js, `lab.strip`), GPU before/after, grazing-light
  before/after; images in docs/stalle/round3/.

## Open (for the owner / next round)
- Statue: clearly better than round 2's lathe figure, still not AAA: soft face, blobby Child, hair waves read as curls,
  the Child's legs stand off in side view.
- Rubble: less tile-like (tilt, rough faces, smaller arrises) but still neat courses with a light joint rim; the photo's
  stones are flatter and creamier.
- Interior door: the open leaves glow orange in the golden-hour sun with the inside eye adaptation (plausible, but
  check); faint dots on the board joints in the strafe flicker test; the per-corner light on the capitals smoothed
  (8 passes) but not re-checked from close.
- Gutter stop-end caps are fans (4 slivers flip after quantization).
- Lab GPU numbers are noisy on this laptop (+-0.3 ms); another agent's tabs came and went during the runs.
