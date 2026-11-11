# Pedestrians: resume here

State 2026-11-11, branch `claude/pedestrians` (worktree `.claude/worktrees/pedestrians`), not merged, not pushed.
Read `docs/PEDESTRIANS.md` (what exists, results, weak points) and `docs/PEDESTRIANS_RESEARCH.md` (design, phases).

Done: **P0** (vendor `vendor/slop-ped/` at 536a907 unchanged; the Pedestrian Lab with the six scenes, density /
hour / season controls, his crowd as the baseline mode) and **P1** (gait baker, bone table, compute-pass playback,
LOD0 / LOD1 / LOD2 with dithered fades, live <-> baked hand-over, distance-driven clips, 15 Hz far band, meters,
moving checks, strips). Not done: P4 (bodies v2), UAL clips, P2+ (city).

**Round 2 done (2026-11-11 evening)**: plant pin + per-foot ground for baked walkers (mid-band slide p95
0.03-0.07 m/s, no sinking), bodies v2 (children, older people, clothes, umbrellas, bags, prams, dogs, seasons), UAL1
sit / sit-talk / talk, groups, step back, dives at speed. See "Round 2" in `docs/PEDESTRIANS.md`.
Round-2 next: the owner's quiet CPU / GPU re-run (`lab.bench()`; CPU estimated ~0.5-0.6 ms for 300); if CPU is over,
move the per-person arrays to SoA and pin LOD0 at 30 Hz too; female-fitted clothes; child proportions; a better dog
and pram; Sitting_Enter / Exit; far-band kerb sinks. Items 2-5 below are done.

**Round 3 done (2026-11-11, late)**: pushchair, three dog breeds with a trot, child proportions + toddlers hand in
hand, female-fitted clothes, live-band overlays, companions on the line / seated, the Brussels bench, CPU back to
ratio 0.43-0.55 vs Mr.doob's crowd (~0.40-0.45 ms quiet, estimate). See "Round 3" in `docs/PEDESTRIANS.md`.
Next: quiet CPU / GPU re-run; coat hem seam; dog avoidance and lead sag; swivel front wheels; child faces.

Next (round 1 list), in order:
1. **GPU cost on a quiet machine**: `lab.bench()` in the lab (street view, 50 / 150 / 300), also `?post=0`; split
   the crowd's time (shadow pass vs beauty vs compute) by toggling `castShadow` / bands. Update the table in
   `docs/PEDESTRIANS.md`. Target 300 <= 1.0 ms.
2. **Baked foot slide in turns** (mid p95 0.11-0.36 m/s vs 0.08): keep the planted foot fixed when the body yaw
   changes (shift the drawn root), or turn only in double support; re-run `lab.runCheck("dolly-walk")`.
3. **Kerb / slope for baked people**: per-foot ground height in the compute pass (ground under each foot from a small
   height texture of the tile), or step clips.
4. **P4 bodies v2** (owner defaults 2026-11-12: children and dogs from the start, stylised like Mr.doob, colours by
   season): copy `createPersonMaterial` into `viewer/pedestrians/` (palettes as uniforms per season), child proportions
   (head / limb scale in the pose header), coats / skirts / scarves / hats as extra lofts, accessories (umbrella,
   bags, pram, dog) as small instanced meshes skinned to one bone.
5. **UAL1 clips** (owner: CC0 OK for sit / pram / phone): fetch the pack into `data/raw/characters/ual1/`, retarget to
   the 15-bone skeleton (ask the character chat about `tools/characters/retarget.mjs` first), bake into the table,
   CREDITS row.
6. Behaviour defaults still to wire (owner 2026-11-12): calm step back near cars, a dive only at speed, rare red-light
   runners (2 %, done), zebra priority with a glance (done), ~40-60 visible at Saint-Job on a weekday morning (the
   density slider; calibrate in the city), a few people at night (hour curve, done).

Running it: `cd tools/worker && npm ci`; `node tools/peds/bakeGait.mjs`; serve the repo root, open
`/labs/pedestrian-lab.html`. One Chrome tab; GPU numbers are only comparable as A/B rounds.
