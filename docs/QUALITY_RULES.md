# Quality rules and the checks that enforce them

Every defect the owner found becomes a **rule** and, where possible, an **automated check**.
Before every merge into `claude/foundation`:

1. Run `node tools/audit/mergeGate.mjs`. All rows must PASS (exit 0).
2. Run the browser gates it lists, including the **visual tour** (docs/TOUR.md): `debug/tour.html` on the branch, then
   `node tools/tour/compare.mjs foundation <run>`. Look at every flagged view and explain it in the merge message.
3. After the merge, the branch's tour run becomes the new `foundation` baseline (the old one is kept as
   `foundation-pre-<branch>`).

To add a rule: one line in the table below, plus one row in `CHECKS` (node, offline, seconds) or `BROWSER` (needs the
viewer) in `tools/audit/mergeGate.mjs`.

| # | rule | why (what went wrong) | check |
|---|---|---|---|
| 1 | Every triangle the code makes or repairs faces **out** of the building (checked against the footprint). Never drop original geometry unless what the street sees through it is the inside of the building. | wallRepair walls were wound inward; walls draw front faces only since 2026-11-13, so 1,796 edges (~68,600 m²) were see-through from the street (playtest 2026-11-16) | `shell`: tools/audit/shellGate.mjs |
| 2 | No two drawn faces share a plane over the same area (one owner per spot: piers, caps, joins). | two garden runs meeting at an angle each placed a pier: 2,951 doubles, z-fighting | `gardenzfight`: tools/audit/gardenZfight.mjs |
| 3 | Everything that moves has a motion source (instance, skinned or rigid previous transform), counted **once**. | the chase car was treated as new every frame (shimmer while driving); the falcon's motion was counted twice (ghost) | `motion`: tools/audit/motionAudit.mjs + browser `sharpCheck.motionCoverage()` / `stability()` |
| 4 | Dynamic resolution decides on **missed frames**, never on "the GPU looks idle". | the laptop driver holds a low GPU clock while the work looks light: resolution was stuck at 0.6 (blur) | in `motion` (upscale guarantees) |
| 5 | Car handling and camera meet the numbers in docs/CARCTL.md; trams and trains are solid for the player car. | the car was "uncontrollable", the camera moved too much, the car drove through trams (a comment swallowed the box heights) | `carctl`: tools/carctlTest.mjs |
| 6 | A merge is never judged on one spot: the 22-view city tour runs against the baseline. | hollow buildings across the city were merged unseen (one-spot checks) | browser: the VISUAL TOUR |
| 7 | Never add or remove lights at runtime; fixed pools only. | each light change rebuilds every shader (a freeze) | (code review) |
| 8 | Never `DynamicDrawUsage`; static buffers + `needsUpdate` + update ranges. | r187 re-uploads such buffers whole every pass | (code review) |
| 9 | A scripted model meets the city ground by a weld or a skirt; never a floating edge or gap. | floating models, see-through gaps at joins | mesh_audit contact check |
| 10 | Ground texture edges are smooth (SDF / height blend), never raster stair-steps. | saw-tooth terrain edges | (visual) |
| 11 | Flat normals on planes, support loops round openings, weighted normals (Blender). | dark streaks and bands from topology | checker + grazing-light renders |
| 12 | Rebuild and commit `viewer/tileWorker.bundle.js` **only in the main repo**, only when worker code changed. | a rebuild in a worktree changes only the path comments, yet that changes the tile-cache hash: every player's tiles rebuild once (148 s first load) | (merge procedure) |
| 13 | Any module that reads a tile's terrain / road / building / far-tile meshes on the CPU after the build is listed in docs/HEAP.md "Readers" and keeps what it reads (keep list, hold, or `needCpu` refusal); loadTile's dispose keeps no build result. | three r187 keeps every array after the GPU upload and a dispose closure held each tile's whole worker result (~37 MB per tile): police heap 1.45 GB | `heap`: tools/audit/heapGate.mjs + browser `__heapDrop.tripCounts` stays `{}` |
| 14 | Every camera or mode keeps the common game keys working with no button held (WASD move, E/Q or PgUp/PgDn up/down, Shift faster) and shows its controls on screen (a card shown once + the ? key). | the orbit camera copied editor cameras (move only with the right mouse button held, no visible way up or down): the owner pressed W and nothing happened | `orbitcam`: tools/orbitCamTest.mjs |
| 15 | Nothing draws or compiles a geometry after its dispose(); any deferred draw (a queue, a later frame) checks when it runs, not when it was queued. | the warm-up compile queue drew far tiles already replaced by their full tiles: a GPU leak, then WebGPU errors once arrays were dropped | `heap` (tools/heap/queueCheck.mjs) + browser 5-boot list: 0 heapDrop / WebGPU errors |
| 16 | No parked car's footprint within 0.98 m (+0.3 m on junction turns) of any driven path; each tile is checked against its loaded neighbours, never alone; at run time a moved or under-lane parked car is an obstacle. | lanes rounded after the fit, turns / ends / body never checked, tiles treated as closed worlds, the old audit measured centres and was not a gate: 5,281 parked cars under traffic | `trafpark`, `trafparksim`, `trafparkborder` + browser debug/trafparkWatch.js |
