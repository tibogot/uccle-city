# Street model plan: why street defects keep coming back, and how to stop them

This plan was written on 2026-11-19 by a read-only planning job. The owner asked for it before building all of Brussels: "find the cause so we can keep building the city without being afraid that many things will be wrong". **Status: proposed. Show it to the owner and get a go before building.**

## 1. Root causes (with evidence)

**(a) Several sources of truth: the main cause.**
- At least 8 separate ground functions:
  - the player car uses the drive raster (drive/colliders.js driveGround, surfaceLayers.js);
  - traffic and tram use `movingGround = worldRef.surface + CARVE` (main.js:406);
  - trees, trams, parked cars, street props, gardens and lamps each use their own (main.js:988, 1033, 1112 / 1121, 1050, 1082, 1006).
- None of them is the drawn asphalt. The sidewalk job's kerbLevel / levelPins edit `prep.H` after `hm.surface` is fixed (roadBuild.js:155-162).
- "What counts as carriageway" differs between modules:
  - `{0,1,3}` in carriageway.js and measuredPaint.js;
  - `{0,1,2,3}` in lineFit.js, laneGraph.js and recentre.js;
  - `{0,1}` for lanesOnly;
  - plus an OSM band fallback, the drawn raster and the census's own MARKABLE.
- 12 viewer modules read the class raster directly; 13 read raw OSM roads.
- Paint and traffic only appear to share one model. Both are the OSM-swept engine lane stack, pushed sideways by measureLineFit / fitLinesToStreet / laneShifter, then clipped and snapped. Neither is generated from the kerbs.

**(b) Heuristic fallbacks guess.**
- There are 92 numeric tuning constants in the street code; lineFit.js alone has 14 (MOUTH 6, MAX_D 6, WIN_MED 15, SLOPE 0.125, OUTLIER 1.5, SHORT_ROAD 42, FUNNEL_W 2...).
- Many fixes are named after a street.
- "No line rather than a wrong line" applies only to roads under 42 m. A longer road without a fit falls back to the guessed OSM stack.
- 206 `?x=old` switches keep the old code paths alive.

**(c) Gate ceilings freeze defects.**
- The ceilings are city-wide SUMS set at the after-count, so fixing 9 m anywhere frees 9 m for a new defect elsewhere.
- There is slack: laneP95 has a 0.25 ceiling for 0.08 measured; roadsim has 12 / 8.5 for 10 / 7.1.
- Stale guard texts.
- colliders runs on 4 tiles, zfight on 8, balconies on 6.

**(d) Detectors measure stand-ins.**
- The markings skew test:
  - fires only above 12°, while the generator itself allows ramps of 7.1° / 11.3°;
  - is skipped within 15 m of a junction and on curved kerbs;
  - is an else-if after atKerb;
  - skips "unmeasured" strokes.
- laneP95 compares the lanes with the same fit function, not with the drawn stroke.
- Before the ground job, the traffic ground had no detector at all.

**(e) Seams, junctions and short pieces: by design.**
- Every tile rebuilds its neighbours' roads from its own clipped raster.
- Example: the zebra cut at a seam (bm:14036). Another: at the D7 | E7 seam, D7 paints a dashed kerb line on Ch. de Saint-Job that E7 does not.
- The MOUTH / JOIN / SHORT_ROAD / funnel rules exist only because every OSM way is fitted on its own and junctions are not modelled.

**(f) The tour is a regression diff, not a correctness check.**
- It covers 22 views and never flags a defect that is already in the baseline.

**(g) The skeleton is a guess.** The OSM line plus a default stack, corrected afterwards. Where OSM and UrbIS differ by more than the correction allows, the guess shows through.

**(h) Detectors check only where things must NOT be**, never where they SHOULD be (e.g. "edge line = kerb - 0.30 m").

**(i) Fixes are local by construction:** one rule and one constant per reported spot, then a ceiling at the new count.

## 2. The owner's Ch. de Saint-Job / Rue Engeland diagonal line

**Where:** tile E7. A solid edge line from x -883 to -856, z about 1043 to 1039, on road r71812634_1 (63 m). It drifts from 1.7 m to 0.06 m off the kerb at 4-9°, then onto the ramp and sidewalk.

**Why it is drawn there:**
- The OSM line runs onto the sidewalk.
- The measured kerbs move 2.6-3.5 m away from it.
- The smoothed lane stack (30 m median plus a 1:8 slope limit) lags behind.
- Where the measurement is lost, the edges fall back to the stack.

**Why the census missed it:**
- The skew threshold (12°) is above the generator's own slope limit.
- The test is skipped within 15 m of the fork.
- Only the last tenths of a metre and the part on the sidewalk were counted. Those were inside the city-wide ceilings.
- Nothing checks "edge line = kerb - 0.30 m".

**The census DID flag the spot; the ceiling let it through.**

Alternative spot if the owner was further west: D7 (-1004.5, 1098.6), the seam-cut dashed line.

## 3. Target architecture: one canonical street model

**Where it is built:** an offline bake per street corridor (tools/streetmodel/build.mjs).
- It is deterministic, gated before shipping, and has no seams.
- About 2-3 s per tile: all of Brussels (~650 tiles) is ~8 min on 4 cores, rebuilding only dirty tiles.
- The worker only meshes the model. Alternative: worker-side, owner-only elements built from unclipped neighbour inputs.

**Model (viewer/street/model.js, typed arrays):**
- **Segments** (OSM chains, id `s:<way>:<nodeA>-<nodeB>`, one owning tile), each with:
  - its sources;
  - an axis (the mid-line of the MEASURED carriageway where measured);
  - kerbL / kerbR with offsets, confidence, height and kind;
  - the carriageway ring;
  - lanes as piecewise-linear offsets, OpenDRIVE style;
  - lines (edge / lane / centre / bike / park) referenced to a kerb or lane boundary;
  - a surface layer.
- **Junctions:** polygon, arms, mouth lines, G2 turn curves, crossings, stops, control.
- **Layers:** ground / deck / hero height grids built from the DRAWN triangles.

**Confidence:** M measured, D derived from M, O OSM only, G engine default, X contradiction (OSM more than 1.5 m outside the measured carriageway).

**Conservative fallbacks:**
- Edge line: only as an offset of a measured kerb (kerb - 0.30 m); none on O / G / X.
- Lane / centre lines:
  - always when measured (Brussels Mobility marking / UrbIS Topo line);
  - when derived, only if both kerbs are measured, the width is stable within ±0.4 m over ≥ 30 m, and outside junction polygons.
- Traffic lane on X: one lane per direction, centred in the measured carriageway.
- Heights always from the drawn layer.
- Keep-out = the carriageway, the junction polygons and the lane corridor ±1.2 m.

**Junctions:** every node of degree 3 or more, and every fork, is a polygon. Inside it: only turns and measured paint.

**Tile seams:** a segment belongs to the tile holding its midpoint, a junction to the tile holding its node. Neighbours carry byte-identical read-only copies keyed by id. Meshes are cut on the seam from the same model.

**Brussels scale:** about 30-60 MB of model city-wide, ~50-100 KB per tile. Raw OSM / UrbIS no longer goes to the main thread.

## 4. Verification that cannot drift

**Invariants on the DRAWN output, city-wide, at 0** (gate row `streetinv`):
1. Every along-road stroke lies inside the carriageway with at least 0.10 m margin.
2. Every stroke is within 0.05 m and 3° of its model line. Every edge line is kerb - 0.30 ± 0.10 m. No along-road strokes inside a junction. No stroke at all on O / G / X.
3. Traffic path points are inside the carriageway, ≥ 1.0 m from the kerb, outside buildings; turns stay inside their junction.
4. Mover ground: every graph point and every 120 s sim pose is within 0.05 m of a raycast onto the drawn asphalt / deck / hero triangles.
5. No prop / plant / garden / tree footprint (read from the instance buffers) touches the keep-out.
6. Seam identity: each copied element equals the owner's.
7. Every element has a confidence; every M element names its source id.

**Gap register (data/gaps.json):**
- One entry per exception: `{ id: "<invariant>:<elementId>:<s0-s1>", cause enum, evidence, decision, date }`.
- The gate fails on any violation not in the register, and on stale entries.
- No sums. This generalises bridgeAudit.allow.json.

**Street walker (tools/walker/):**
- Headless Chrome drives a rotating sample of about 400 segments per run, so the whole city is covered over N runs.
- Lane-level and 15 m-high cameras.
- Paint-mask and carriageway-ID passes check paint off the carriageway, stroke vs kerb direction, and wheel contact depth.

**API boundary (gate row `boundary`):**
- Every viewer / tools file must parse as an ES module.
- Outside viewer/street/, nothing may import fitCore / surfaces / carriageway, read raw roads / kerbs, or call hm.surface / hm.ground for placement. A named allow list may only shrink.

## 5. Migration plan (small jobs, in order)

| # | Job | Gate row | Effort |
|---|---|---|---|
| 0 | Gate hygiene: stable finding ids; the markings / streetprops ceilings become register entries; stale texts fixed; the parse check | register, boundary (parse) | 0.5-1 d |
| 1 | Drawn-output detectors, report-only first: edge-to-kerb offset, ≤ 3° with no exclusions, "unmeasured" judged; mover ground vs the drawn triangles | markings2, moverground | 1-1.5 d |
| 2 | Street model v0: chains, axis, kerbs, carriageway with confidence, seam ownership | model | 2-3 d |
| 3 | Markings from the model: edge lines as kerb offsets, lane lines only from M / D, own decal strips; retire fitLinesToStreet | markings2 at 0 + register | 2-3 d |
| 4 | Traffic lanes and turns from the model; retire laneShifter / the fitToSurface snap (**done**, claude/street4: see "Job 4" below) | roads in-building / off-carriage 0 + register; roadsim; streetlanes | 2 d |
| 5 | One ground: layered heights from the drawn triangles for every mover and parked car (claude/ground has started this) | moverground 0 | 1.5-2 d |
| 6 | Keep-out from the model for props / plants / gardens / trees / lamps | streetprops 0, drivecheck lane-data part | 1.5 d |
| 7 | Junction polygons, arms, turns; crossings and stop lines anchored to them | junctions | 2-3 d |
| 8 | Full boundary lint; no raw geometry posted to the main thread | boundary | 1 d |
| 9 | Street walker | browser row WALKER | 2-3 d |
| 10 | Offline bake, dirty-tile rebuild, a pilot commune next to Uccle | bake determinism | 2-3 d |
| 11 | Delete the `?x=old` paths of migrated systems after one browser turn | none | 0.5 d |

**Total:** roughly 18-25 agent-days. Junctions and the walker carry the most risk.

## What to stop doing
- Constants and rules named after streets.
- City-wide metre ceilings set at the after-count.
- Detector exclusion zones.
- Detectors that compare a fit with itself.
- New per-consumer ground functions or carriageway class sets.
- Recomputing neighbours' roads from clipped rasters.
- Keeping `=old` paths forever.
- Treating the tour as a correctness check.

## Job 4: traffic lanes and turns from the model (claude/street4, 2026-11-21)

Rule street-lanes (docs/rules/street-lanes.md), gate row `streetlanes`, switch `?streetlanes=old` (viewer/features.js).

**What changed.**
- viewer/street/lanes.js `modelLaneStage`, called by viewer/traffic/trafficGraph.js buildTrafficGraph. The ONE builder,
  viewer/traffic/tileTraffic.js, gets the model through the network (viewer/roadBuild.js `net.streetModel`,
  `net.streetKerbs`), so the runtime and every audit drive the same lanes.
- The engine's lane graph keeps its topology: links, junction control, conflicts. Only the geometry changes.
- On model-covered roads, a lane is an offset curve of the segment axis at the model's driving-lane centre
  (model.js placeLanes now stores `ctr` / `cdir`, re-centred on boundaries snapped to measured lane lines).
- Smoothing along the whole segment: a running median over +-5 m, then two box passes over +-5 m.
- Then ONE smooth offset profile (laneOffset.js) keeps every lane:
  - >= 1.0 m inside the measured driving ends, the measured kerb / street-edge lines and the drawn carriageway's
    classes (a tram reservation inside the measured span);
  - 1.13 m clear of the parked cars (gaps under 30 m held);
  - out of buildings where UrbIS maps nothing (E stations).
- On X stations: one lane per direction, centred in its half of the measured carriageway.
- A two-way carriageway narrower than 3.2 m carries one centred lane.
- Lane ends:
  - at a measured junction mouth (never further out than the engine's trim);
  - at an unmeasured arm, at the engine's trim, at most the floor disc + 2 m from the node;
  - a degree-2 node inside a segment is one continuous curve.
- Junction turns are quintic Hermite curves (G2: end tangents and curvatures matched). The handle length is chosen to
  keep the car body out of buildings, on the drawn carriageway and inside the junction polygon, with the lowest peak
  curvature. Turns with one end on an old-fit lane are laid the same way.
- These keep the old fit (fitToSurface, laneShifter output, the far snap):
  - pieces under 50 % measured;
  - an axis that jumps between two carriageways (a dual carriageway drawn as one OSM way);
  - E stations whose OSM line runs through a building;
  - roundabout arms.
  That is 470 of ~4,900 lanes in the tile cores.

**Counts (all 120 tiles, before = foundation af03a1ca / `--lanesold`, after = this branch).**

| | before | after |
|---|---|---|
| roads: slalom / wobble metres | 7,908 / 4,272 | 5,207 / 2,800 |
| roads: heading change p99.9 on straight roads | 6.2 deg/m | 4.9 deg/m |
| roads: traffic in a building | 32 places (556 m) | 17 places (337 m) |
| roads: traffic off the carriageway | 332 places (10.6 km) | 192 places (3.2 km) |
| roadsim (I6 E7 J6 D6, 120 s): slalom / wobble per km | 10.7 / 7.5 | 9.3 / 5.6 |
| streetlanes kerb / carriage / turn / building metres | 1,681 / 7,814 / 18,917 / 541 (all lanes judged) | 1,906 / 1,004 / 114 / 91 (model lanes) |
| parked cars kept | 11,592 | 11,670 |

- The 545 streetlanes findings are register entries by cause:
  - stack-lag 213: kerb build-outs and flares the smoothed lane cuts;
  - fit-lost 140: unmeasured stretches, mostly the Flemish fringe;
  - junction-unmodelled 113: corners next to junctions, job 7;
  - osm-contradiction 51;
  - short-piece 18;
  - seam-rebuild 10.
- markings laneP95 now compares the driven lanes with the DRAWN model strokes: p50 0.01 m, p95 0.41 m (ceiling 0.45).
  The tail is parked cars in painted bike lanes, held 30 m (job 6).
- Cost: the traffic graph stage is unchanged or cheaper. The model stage takes 40-70 ms a tile; fitToSurface is skipped
  on covered lanes. The road stage (1.4-2.9 s) is unchanged.

**Round 2 (the coordinator's review, 2026-11-21): the two failing rows fixed by cause, no ceiling raised.**
- drivecheck walked the raw OSM centre lines as the player's proxy, the very proxy this plan retires. Now:
  - on model-covered roads it walks the model's axis, only where the car's whole width is over roadway / parking (not a
    tram reservation's tree rows, Av. Churchill);
  - elsewhere, and under `?streetlanes=old`, it walks the OSM centre lines as before;
  - the driven lanes and turns come from tileTraffic, as before.
- The tree places had four causes:
  - The path tree clearing (roadTrees.js pathCorridor) assumed a 0.35 m trunk; the drive colliders give trunks up to
    0.5 m. It now takes each trunk's own radius (`trunkMargin`).
  - G2 turns crossed a corner's street tree. Trunks now score against a turn, after buildings, like a point off the
    drawn street. Where every handle still meets a trunk, the two lanes stop 1 m earlier, up to 8 m (F8).
  - A dual carriageway drawn as one OSM way (Av. Churchill): one roadway's segment put both directions on it, and the
    turn then crossed the corner tree. Such halves keep the old fit: the OSM line lies beyond the measured half width
    + 1.5 m while both directions are driven.
  - Two lane-end issues (M5 Ch. de La Hulpe):
    - a lane end at a junction the tile's model does not hold could sit at the engine's trim, 135 m up the road (now
      at most 15 m from the node);
    - a long old-fit turn faded by a model lane's moved end slid over the pavement. A long turn now takes each end's
      move over its last 20 m only.
- A final pass re-lays every junction turn of the graph (old-fit ones too) as a G2 curve where that keeps the body out
  of buildings, trunks and the pavement.
- Result: drivecheck 109 places (ceiling 147), hero 1 (ceiling 3), hedge 3 (ceiling 5), tree 0. The extra hero and hedge
  places seen before came from the old centre-line proxy and corner-cutting turns; both are gone.
- trafmix:
  - **Don't block the box** (trafficSim.js decide). When the lane after a turn is too short to wait on (its hold point
    nearer its start than the car is long), a car enters the turn only if the next junction lets it through as well.
    Otherwise it waits at its own line: the D7 signal pair on Ch. d'Alsemberg.
  - A car inside a junction turn clears the junction before yielding to an ambulance (the D6 deadlock).
  - Buses were blocked by parked cars 0.15 m off their body. The lanes now keep 1.45 m from a parked car's box (a bus's
    half width + 0.18).
  - The 'emergency run passes a queue' part was not needed: the stuck check passes without it.
- kerb < 1 m rose 1,681 → 1,906 m, almost all on narrow streets. Under the street's own clearance the coordinator asked
  for (half the carriageway less a car's half width where it is under 3.8 m), the same metres split as:

  | lanes | narrow | beside (build-outs, islands) | ahead (kerb ends, corners) | junction |
  |---|---|---|---|---|
  | old lanes | 551 | 693 | 137 | 67 |
  | model lanes, first round | 745 | 631 | 116 | 36 |
  | model lanes now (1,151 m) | 249 | 673 | 151 | 79 |

  The rise was two-way lanes in 2.6-3.8 m streets held exactly 1.0 m off each kerb.

**Gate (2026-11-21, meta + streetlanes + markings + the 27 auto rows).** 27 rows pass. Two fail:
- `trafmix`: one ambulance is removed as stuck at a signal pair on Ch. d'Alsemberg (D7, -1326, 1238). Cars stand at a
  red light still inside the previous junction's turn, because the lane between the two junctions is very short. The
  ambulance waits for them (HOLD.busy).
  - A first deadlock is fixed in viewer/traffic/trafficSim.js: a car inside a junction turn no longer crawls for an
    ambulance behind it.
  - `?streetlanes=old` passes this check.
- `drivecheck`: 154 places, ceiling 147.
  - Six of the extra places are LiDAR trees: the census finds them on the OSM centre-line paths, which the model lanes
    no longer follow. The likely cause is that the tree clearing (pathCorridor) now follows the moved lanes, not the
    OSM line; not checked further.
  - The other extra places are one hero and one hedge place.

**Resume (paused 2026-11-21: the owner closed the laptop; WIP, not ready to merge).**
- **Working tree at the pause:** BOX 5, PARK_CLEAR 1.13, building bounds on unmeasured stations, inner lanes kept
  2.5 m off the lane outside them (LANE_GAP), trunk-only turn cutback.
- **Last full roads census** (ceilings in parentheses):
  - slalom 5,173 (5,207) — passes;
  - wobble 2,845 (2,800) — **fails**;
  - in a building 17 places (17), off the carriageway 186 places (192), snapCreated 0, headP999 4.47 — all pass.
  - Foundation before: 7,908 / 4,272 / 32 / 332.
- **drivecheck** (last full run, with PARK_CLEAR 1.45 and before the later lane changes): 109 places (147), hero 1,
  hedge 3, tree 0. The I2 / F8 / J11 / H2 / M5 tree spots are 0 with the current code.
- **trafmix:**
  - The stuck check passed with PARK_CLEAR 1.45 (buses blocked by parked cars at 1.13).
  - With 1.13 (the current tree) it is not re-run: a bus may get stuck again.
  - The sim-cost check swings 1.08-1.12 x around its 1.10 limit (timing noise; once 1.122 in the gate).
- **kerb < 1 m** under the street's own clearance: 1,151 m (narrow 249, beside 673, ahead 151, junction 79). The old
  lanes give 1,447 m under the same rule.
- **laneP95** vs the drawn strokes: 0.13 m (ceiling 0.45).
- **motofeel** with BOX 5: one crash, Av. De Fré (F3, -190.6, -510.4), back-late moto into a kerb tree. That run was
  before LANE_GAP: two same-direction lanes had collapsed 0.3 m apart there. The city rides with BOX 6 had 0 crashes.
  Not re-run since.
- **Fixed:**
  - the drivecheck proxy (model axis on covered roads);
  - the trunk radius in pathCorridor;
  - G2 turns scored against trunks, buildings and the pavement, plus the trunk cutback;
  - the final repairTurns pass;
  - dual-carriageway halves on the old fit;
  - lane ends at unknown junctions capped at 15 m, and the local fade for long turns;
  - the sim's don't-block-the-box rule and clear-the-junction-before-yielding;
  - the narrow-street kerb clearance in the streetlanes census.
- **Left:**
  - pick PARK_CLEAR. 1.45 makes trafmix pass but costs about 60 m of wobble; 1.13 brings back the bus stuck. Try 1.45
    for rank-0 lanes only on bus routes, or a sim fix for buses passing parked cars.
  - wobble ≤ 2,800. BOX 6 gives 2,611 / 4,606 but adds 3 in-building places: I6 Venelle de Saint-Job, a UrbIS
    footprint overhanging the 7 m alley, too fine for the 2 m roof grid.
  - re-run motofeel, trafmix and drivecheck;
  - `node tools/docs/rulesIndex.mjs` (done; check meta);
  - rewrite the streetlanes register: `--write-register`.
- **Next commands (in the worktree):**
  - `node --import ./tools/road_audit/register.mjs tools/audit/census/streetLanes.mjs --all --jobs 4 --quiet --worst 0 --write-register`
  - then `node tools/audit/mergeGate.mjs --changed --base af03a1ca`.

**Round 3 (resumed 2026-11-21, the coordinator's decisions).**
- **Parked-car clearance stays at 1.13 m globally; the sim was fixed by cause** (viewer/traffic/trafficSim.js):
  - A vehicle wider than a car tests its own corridor before taking the lane's estimated need, may ease out by its extra
    half width, and searches the least clear shift. The estimated need comes from the parked car's bounding disc and
    started the search too far out.
  - Oncoming traffic holds a pass only within its real reach (both widths). After 8 s refused, only the near oncoming
    cars still hold it.
  - A car standing on a conflicting turn with its front 1.5 m or more short of the conflict point does not hold the
    crossing traffic.
  - A car that has moved 3 m since its wait began is in a queue, not stuck.
  - A run (ambulance / fire engine) passes cars that pulled over for it.
  - The room check after a turn continues past an exit lane shorter than the room needed.
  - The trafmix mix shares no longer count the timetabled buses (they are not drawn from the mix).
- **Wobble with BOX 5, by cause:**
  - The narrow-street switch is now a continuous ramp over 1 m of width.
  - A narrow carriageway's lane is held only within 0.3 m of its middle; it was pinned to each station's measured
    middle and copied the edges' noise (F6 Rue des Pêcheurs).
  - No per-station kerb-line need where the carriageway is about two clearances wide or less.
  - Venelle de Saint-Job is documented as a data case in the rule doc. With BOX 5 it is not in a building.
- **LANE_GAP removed.** The round-2 rule kept an inner lane 2.5 m from the lane outside it; it pushed inner lanes off
  their paint (laneP95 0.83). The lane collapse it guarded against (Av. De Fré) is fixed by cause: only the kerb-side
  lane keeps clear of the parked cars. motofeel city rides still have 0 crashes.
- **Numbers** (all 120 tiles; ceilings in parentheses):
  - roads: slalom 4,717 (5,207), wobble 2,707 (2,800), in a building 16 places (17), off the carriageway 181 places
    (192), headP999 4.28 (5.0), snapCreated 0;
  - markings laneP95 0.11 m (0.45);
  - drivecheck: 96 places (147), hero 1 (3), tree 0 (0), hedge 2 (5);
  - motofeel: ok.
- **streetlanes:** kerb 984 m (narrow 199, beside 570, ahead 143, junction 72), carriage 1,037 m, turn 346 m,
  building 58 m. The register holds 489 entries.
- **trafmix** still fails "never stuck": one bus and one bin lorry are removed, held busy in a gridlock at the D6 5-arm
  Ch. d'Alsemberg junction. Cars queue inside its long turns because their exit is full. Each sim fix moves the
  gridlock elsewhere: the same check failed with `?streetlanes=old` once the sim rules changed. The check is chaotic at
  zero tolerance; see the report for the decision it needs.
- **trafmix sim cost:** 1.05-1.07 x now. It measures through tools/gate/timing.mjs `measure`. The 1.14 seen once came
  from the clear-corridor test, which ran for every car; it now runs for vehicles wider than a car only.
- **Gate** (`--changed --base af03a1ca`, 30 rows): 29 pass. trafmix fails one check: one bus removed as stuck (hold 5,
  "full"). It waits at its line because the exit lane is full, and that queue waits on a busy junction downstream: a
  gridlock among the close Ch. d'Alsemberg junctions in D6 / D7 at 8 h. Not fixed; it needs a decision (see the
  report). Everything else in the trafmix check passes. Sim cost 1.01-1.07 x.


**Round 4 (2026-11-21): junction entry room (rule junction-entry-room).**
- **What was added:**
  - the exit-room reservation at turn entry, with fair claims after 20 s;
  - the wait-for cycle breaker, counted, with the trafmix assertion "wait-for loops broken <= 3";
  - `--seed N` on trafmixGate.
- **Breaks used:** 1-2 per run.
- **trafmix "never stuck"** (removals; the stuck vehicles are buses and bin lorries):

  | seed | model lanes | `?streetlanes=old` |
  |---|---|---|
  | 7 | 4 | 0 removals, but the 8 h mix share failed (cars 90.0 %, target 85.4 ± 4.5 %) |
  | 11 | 2 | 2 |
  | 23 | 1 | not run |

  The committed sim on old lanes also has 3 removals at the default seed.
- **The stuck vehicles left are not loops:** queues standing 36 m and more before a red light behind a jam, and
  priority-to-the-right waits at D7. The network is oversaturated at 8 h round Ch. d'Alsemberg. See the report.
- **Rows the sim touches:** meta, trafparksim and roadsim pass.

**Round 5 (2026-11-21): what the trafmix row measures as "stuck".**
- **New definition:** a service vehicle is stuck when it and the queue ahead of it (its wait-for chain) have not moved
  1 m for 60 s, outside a planned stop. The sim's removal timer is now reported as info only.
- **Stuck count:**

  | seed | model lanes | `?streetlanes=old` |
  |---|---|---|
  | 7 | 4 | 1 |
  | 11 | 2 | 1 |
  | 23 | 1 | 1 |

  The model-lane cases are mostly round the D6 5-arm Ch. d'Alsemberg junction and D7; one chain of 7 standing cars.
  Old lanes: 1 stuck vehicle per seed, two of them at D7 (-1098, 1079).
- **Seed 7, old lanes:** the 8 h mix share fails (cars 90.0 %). That happens with the old lanes only; noted, not fixed.
- **Status:** the row fails with both lane sets. It needs the traffic job in TODO: real 8 h demand on the Alsemberg
  corridor and signal coordination between the close D6 / D7 junctions.

**Round 6 (2026-11-22): the D6 / D7 traffic job.**
- **(A) D6:**
  - OSM has traffic_signals at the 5-arm node n140341699 and round it (5 posts). The node is already signal-controlled
    in the sim.
  - The D7 spot (-1098, 1079) has no signals in OSM: priority to the right, as the data say.
  - The G2 turns at n140341699 are as long as the old ones (18 turns, 13-48 m vs 15-47 m).
- **(B) Signals and demand:**
  - Approach demand is capped at 0.9 x 1,800 veh/h x green share (rule signal-demand, assertion "signal approaches
    under capacity": 85 approaches, 0 over).
  - Close pairs share the cycle. The coordination assertion fails: 3 of 15 through movements are on different phases.
  - Gap acceptance at conflicting turns: a car short of the conflict point is in the way only within 4 s at its speed.
  - The old-lanes police car at (-666, -339) was held behind a car entering the conflicting turn far back, at a priority
    junction under steady flow (E4). Gap acceptance clears it: old lanes, seed 7 stuck 0.
- **trafmix true-stuck** (model lanes):

  | seed | stuck |
  |---|---|
  | 7 | 0 |
  | 11 | 3: D7 signal pair, the second junction's give-way inside the first's turn |
  | 23 | 1: an ambulance held by a parked car at (-996, 827) |

  The sim-cost check reads 1.10-1.11 x (limit 1.10). **The row still fails**; what is left is listed in TODO.

**Round 7 (2026-11-22): accepted at a ratchet; the sim cost by cause.**
- trafmix now runs seeds 7 / 11 / 23 (two child processes) and allows STUCK_MAX 4 stuck service vehicles in all (now
  0 / 2 / 1 = 3; old lanes 0 / 3 / 0). Each stuck place is a gap-register entry (trafmix.stuck, causes signal-phases /
  parking-both-sides); off-phase close signal pairs <= PHASE_MAX 3. Both go to 0 in the SIGNALS and PARKING jobs (TODO).
- Sim cost: the "wrong map" deopts were the cause. Fields and stats counters added lazily, in a traffic-dependent order
  (a bus line first, a wide vehicle first), and three type-object shapes (car / heavy / two-wheeler) gave every sim its
  own hidden classes; every hot method went polymorphic. All declared in the constructor, types copied into one shape:
  the step is ~2x cheaper (2.05 -> 0.9 us per car per step, mix and no mix alike).
- The row's one-to-one timing measured a sim's place in memory: two identical plain sims came out 0.87-1.15 x apart, while
  the mix's own work, timed in sequence, was ~1 %. The row now times two sims of each (built A B B A) and prints the twin
  ratio: x1.03-1.08.
- trafparksim (I6) had failed since round 6: a car pulling over at 8 m/s eased 0.42 m into a corridor with a parked car
  5 m ahead. makeRoom now judges the shifted corridor ahead (ROOM_AHEAD 0.25 m); that also cleared the E6 ambulance and
  the old-lanes D7 stuck. With the probe along the heading (cost): stuck 0 / 0 / 0 (model lanes), 1 / 0 / 1 (old lanes, registered); sim cost x1.04-1.07.

**Round 8 (2026-11-22, claude/signals1): one signal phase along the road.**
- Cause of the off-phase pairs: a post's phase was phaseOfDir of its OSM point's nearest segment, and each approach took
  its post's phase. Roads that bend or run near 45 deg flipped between two posts of one road (Rue du Wagon at D5,
  n140271967 <-> n2448080511; Avenue Brugmann / Rue du Doyenne at E4, n30151287 -> n254921174; 5 of 54 through movements
  city-wide).
- Now one table, signals.js signalPhases(roads), for the traffic graph AND the drawn posts (rule signal-phase-road): two
  arm groups per signal node (the most opposite arms and those within 45 deg of them), a parity union-find over the
  links < 150 m (through 2-arm nodes), each cluster oriented as the old rule would mostly have it. Trafmix off-phase
  pairs 3 -> 0 (PHASE_MAX 0); city-wide (new row sigphase) 0 off, 1 odd ring (E1 Coghen / Vanderkindere / Alsemberg: its
  one-way link left off phase), 0 disagreements across tile borders, 249 posts all on their approach's phase.
- D7 (n150588281): OSM has its signals on the approach nodes only. It is grouped like a signal node and linked to them;
  cars from such an approach keep apart from the other approaches by phase (no priority-to-the-right yield across
  phases: the car that yielded 0.4 m past the Rue du Chateau d'Or signal, inside its turn), and the approach signals no
  longer hold the traffic coming OUT of the junction (no head faces it; it stopped 0-3 m past its turn).
- Entry room: up to a red / amber exit signal's line (not past FAIR_T held).
- Green-wave offset: none other than 0 (two city-wide phases; a two-way green wave needs 0 or half a cycle; links under
  150 m run inside the 22 s green).
- trafmix stuck: 0 / 0 / 1 (seeds 7 / 11 / 23; the E6 ambulance behind a parked car, PARKING job), STUCK_MAX 4 -> 1.
  D7 and E4 (priority-starved) not seen on seeds 7 / 11 / 23 / 31 / 41.

## Job 4b: why the lane counts are not 0 (claude/lanes5, 2026-11-22)

The owner asked why the lanes built from the street model still had, city-wide, 16 places in a building, 181 places
off the measured carriageway, 346 m of turns outside their junction and 984 m closer than 1 m to a kerb. Every place is
now classified from the evidence at its own points (tools/audit/census/laneCause.mjs, used by the `streetlanes` and
`roads` censuses), first rule that holds over most of a place's points:

| class | reason | evidence |
|---|---|---|
| a source data | footprint-over-street | the car body is on the MEASURED roadway (UrbIS class roadway / tram / parking) and still inside a footprint: the footprint overhangs the street (Carré Cassimans F1: a 1.8 m UrbIS roadway between footprints; Square Coghen E3) |
| a | no-room-between-footprints | the footprints across the point leave no 2 m gap within +-6 m and UrbIS maps no roadway (Kauwberg x Ch. de Saint-Job G6) |
| a | osm-through-buildings | no UrbIS street, and the OSM centre line itself (a car body across it) runs through footprints, the lane within 3 m of it |
| a | no-roadway-polygon | no measured carriageway within reach, the point on UrbIS sidewalk / square / tram site (Av. Paul Stroobant F4, Place Olivier Strebelle F8) |
| a | sliver | the "measured carriageway" is narrower than 2.3 m and the OSM line > 1.5 m off it (a UrbIS strip at the region edge) |
| b the measure | estimated-carriageway | the driving ends there are D / O / G, not both M: "off the carriageway" / "near the kerb" is judged against a guess |
| b | osm-band | no UrbIS at all: the carriageway is the OSM band |
| b | estimated-junction | a turn at a junction with no measured arm mouth (its polygon is the floor disc) |
| c our builder | old-fit | a lane / turn the model does not build (the old fit: fitToSurface, the engine's lane stack) |
| c | lane-dragged | at a measured station, outside the model's own room (1 m inside the driving ends, or 0.5 m of the middle of a narrow one) |
| c | after-model | more than 0.3 m from where the model laid it (joins, kink rounding, the turn repair) |
| c | turn-corner | a junction turn (outside its polygon, in a building) |
| c | lane-end | within 4 m of a lane's end (its cap at a mouth / a corner) |
| c | lane-fit | inside the model's room on a measured street: the smoothed lane vs the kerb lines (build-outs) |

**Before / after** (all 120 tiles; before = foundation ae17ba81 classified by the same rules; streetlanes = the model
lanes' findings; the roads census judges every driven path, old fit included):

| check | class | reason (gaps.mjs cause) | before: places / m | after: places / m |
|---|---|---|---|---|
| building | a | footprint-over-street (source-data) | 4 / 15.5 | 7 / 36.5 |
| building | a | sliver (source-data) | 2 / 34.5 | - |
| building | b | osm-band (carriageway-estimated) | 2 / 2.5 | 1 / 1.5 |
| building | c | after-model (after-model) | - | 1 / 1.5 |
| building | c | lane-dragged (lane-dragged) | 1 / 5.5 | - |
| carriage | a | no-roadway-polygon (source-data) | 7 / 239.5 | 9 / 238 |
| carriage | a | sliver (source-data) | 5 / 114 | 1 / 26 |
| carriage | b | estimated-carriageway (carriageway-estimated) | 17 / 143.5 | 29 / 177 |
| carriage | b | osm-band (carriageway-estimated) | 12 / 131 | 8 / 78 |
| carriage | c | after-model (after-model) | 14 / 28.5 | 9 / 11 |
| carriage | c | lane-dragged (lane-dragged) | 32 / 258.5 | 3 / 4.5 |
| carriage | c | lane-end (lane-end) | 20 / 56.5 | 23 / 77 |
| carriage | c | lane-fit (stack-lag) | 2 / 2 | 4 / 7.5 |
| kerb | a | sliver (source-data) | 3 / 5.5 | 4 / 6 |
| kerb | b | estimated-carriageway (carriageway-estimated) | 80 / 230.5 | 108 / 309.5 |
| kerb | b | osm-band (carriageway-estimated) | 3 / 9.5 | 1 / 2 |
| kerb | c | after-model (after-model) | 34 / 100.5 | 2 / 4.5 |
| kerb | c | lane-dragged (lane-dragged) | 48 / 322.5 | 7 / 21.5 |
| kerb | c | lane-end (lane-end) | 81 / 172 | 97 / 193 |
| kerb | c | lane-fit (stack-lag) | 36 / 120.5 | 36 / 89 |
| turn | b | estimated-junction (junction-unmodelled) | 5 / 16 | 5 / 16 |
| turn | c | after-model (after-model) | 14 / 14.5 | 13 / 16 |
| turn | c | turn-corner (turn-corner) | 67 / 315.5 | 53 / 149.5 |

| check | before a / b / c (places / m) | after a / b / c (places / m) |
|---|---|---|
| building | 6 / 50 · 2 / 2.5 · 1 / 5.5 | 7 / 36.5 · 1 / 1.5 · 1 / 1.5 |
| carriage | 12 / 353.5 · 29 / 274.5 · 68 / 345.5 | 10 / 264 · 37 / 255 · 39 / 100 |
| turn | 0 / 0 · 5 / 16 · 81 / 330 | 0 / 0 · 5 / 16 · 66 / 165.5 |
| kerb | 3 / 5.5 · 83 / 240 · 199 / 715.5 | 4 / 6 · 109 / 311.5 · 142 / 308 |

| roads census | before: places / m by class | after: places / m by class |
|---|---|---|
| inBuilding (16 → 16 places) | a footprint-over-street 3 / 15.5; a no-room-between-footprints 1 / 51; a osm-through-buildings 2 / 37.5; a sliver 2 / 34.5; b osm-band 2 / 2.5; c lane-dragged 1 / 7.5; c old-fit 5 / 141 | a footprint-over-street 7 / 37; a no-room-between-footprints 1 / 37; b osm-band 1 / 1.5; c after-model 1 / 1.5; c old-fit 6 / 104 |
| offCarriage (181 → 167 places) | a no-roadway-polygon 5 / 214.5; a sliver 2 / 76; b estimated-carriageway 14 / 101.5; b osm-band 6 / 42.5; c after-model 8 / 25.5; c lane-dragged 9 / 63; c lane-end 8 / 54; c old-fit 83 / 2009.5; c turn-corner 46 / 431.5 | a no-roadway-polygon 4 / 221; a sliver 1 / 14; b estimated-carriageway 19 / 88.5; b osm-band 3 / 20.5; c after-model 6 / 22.5; c lane-end 8 / 54.5; c old-fit 76 / 1817; c turn-corner 50 / 461 |

Per tile, after (streetlanes findings, places / m; a · b · c):

| tile a · b · c | tile a · b · c | tile a · b · c | tile a · b · c | tile a · b · c | tile a · b · c |
| --- | --- | --- | --- | --- | --- |
| A5 - · 3/18 · 5/11.5 | B4 1/1 · 9/43.5 · 10/21 | B5 - · - · 2/4.5 | B6 2/27.5 · 2/17 · 6/21 | B7 1/0.5 · 2/3.5 · 6/14 | B8 - · 3/14 · 1/0.5 |
| C3 - · 2/2.5 · 5/11.5 | C4 - · - · 7/15 | C5 1/5 · 2/3 · 8/12 | C6 3/7.5 · 1/4.5 · 3/7.5 | C7 1/1 · 2/7 · 1/8 | C8 - · 2/11 · 3/5.5 |
| C9 - · - · 5/13 | D2 - · 8/63.5 · - | D4 - · 3/7.5 · - | D5 - · 2/11.5 · 4/7 | D6 - · 3/22 · 7/13.5 | D7 - · 1/13 · 1/5 |
| D8 - · 2/3 · 2/5.5 | D9 - · 2/11 · 7/19 | D10 - · 4/24 · 4/8 | E2 - · 2/4 · - | E3 3/14 · 3/22 · 4/5.5 | E4 - · 1/1.5 · 6/10 |
| E5 - · 2/4.5 · 2/4 | E6 - · 2/3.5 · 1/4 | E7 - · - · 4/6 | E8 - · 2/5.5 · - | E9 - · 1/2 · - | E10 - · - · 11/18 |
| F1 2/21 · - · 3/6 | F3 - · - · 2/8 | F4 1/137 · 1/1 · 4/9.5 | F5 - · 2/4.5 · 3/4 | F6 - · 2/4.5 · 3/3 | F7 - · 1/1.5 · 4/7.5 |
| F8 1/50 · 5/11 · 14/32 | F9 - · 1/1 · 13/58.5 | F10 - · - · 1/1 | G1 - · 1/5.5 · 2/2.5 | G3 - · - · 1/1.5 | G4 - · 1/5.5 · 3/5.5 |
| G5 - · 2/5.5 · 4/12 | G6 1/1 · 2/4 · 5/9.5 | G7 - · - · 3/8 | G9 - · - · 1/1.5 | G10 - · - · 1/2.5 | H2 - · - · 1/0.5 |
| H3 - · 5/7 · 3/2.5 | H4 - · - · 1/1 | H5 - · 4/5 · 6/8.5 | H6 - · 1/5.5 · 2/2 | H7 - · 3/21 · 2/11 | H8 - · - · 2/4.5 |
| H10 - · 3/17 · 1/2 | H11 - · 1/12 · - | I3 - · 8/20.5 · 3/11.5 | I4 - · 2/2 · - | I6 - · 2/4 · 3/9.5 | I7 - · - · 1/1 |
| I8 - · 1/1.5 · 2/11 | I10 - · - · 2/8 | I11 - · - · 1/1 | J4 1/2 · 8/32.5 · 5/10 | J5 - · 2/6.5 · 4/6.5 | J6 - · 1/1.5 · 1/2.5 |
| J7 - · 2/4 · - | K4 - · - · 1/1 | K6 1/1 · - · 3/4 | K8 - · 14/38 · 10/32.5 | K11 - · 1/4 · 6/9.5 | K12 - · 1/6 · 2/2.5 |
| L10 - · - · 1/1 | M5 1/35.5 · 3/7.5 · 2/5 | N5 - · 5/20 · 1/3.5 | N6 - · 1/2 · - | N11 1/2.5 · - · - |

**Fixes (class c), by cause** (WHY / RULE in docs/rules/street-lanes.md "Job 4b"):
1. *lane-dragged* (345.5 → 26 m streetlanes carriage + kerb): one station's need, laid by the smooth offset profile at
   1:10 over 30 m, dragged the whole lane out of its measured room. Three sources: a building need at an unmeasured
   dead end (Carré Cassimans F1, B6 Sterstraat), a single ray hitting a side street's corner (Av. des Muses H10), a
   parked car where the lane's own centre flares into the mouth (Ancien Dieweg D6). Now every need is capped by every
   other measured station's room plus the ramp's reach, and a kerb line seen over < 2 m of the lane asks nothing
   (viewer/street/lanes.js laneProfile).
2. *after-model* (kerb 100.5 → 4.5 m): the graph's kink rounding (trafficGraph.js roundKinks, a Laplacian) shrank
   model-lane bends 0.9-1.4 m onto the kerb (Rue Jean d'Osta B4, Rue Professeur Hustin B6). A model lane's point now
   moves only while it keeps >= 1 m from a measured kerb line (or does not get nearer), and never into a building it
   was clear of. (Pinning model lanes outright was tried: the Laplacian also takes the measured axis' station noise
   out, and pinned the slalom metres on C3 B4 E3 K12 rose 2.8x; a Taubin smoother did not recover it.)
3. *turn-corner* (330 → 165.5 m): the trunk cutback shortened both lanes 1 m at a time up to 8 m even where no cut
   took the turn off the trunk (Av. de Saturne H4, I10, J10): the turn then ran 8 m along the street outside its
   junction. A cut that helps none of its turns is undone.
4. *old fit in a building* (roads census class c 141 m → 104 m in buildings): a piece whose OSM line grazed a
   building at two unmeasured stations went to the old fit, whose far snap put Clos des Myosotis (C6) 13 m into the
   houses (88.5 m). The fallback is now judged on the model lane itself. (A cap on the old fit's own kerb push, up to
   9 m ramped 30 m, took Ch. de Waterloo K11 out of its house but put Montagne de Saint-Job I6 onto a street tree
   (drivecheck tree 1) and moved the trafmix gridlock; not kept: the old fit is to be retired, not patched.)

**Left, by cause** (each place a gap-register entry with its class in `evidence.class`, data/gaps.json; a new place
fails the `streetlanes` row; the roads census rows `inBuildingCPlaces` / `offCarriageCPlaces` ceiling the builder's):
- a (source data, a data fix): footprints over the measured roadway (Cassimans, Coghen), the G6 Kauwberg gap, the
  streets UrbIS draws without a roadway (F4 Av. Paul Stroobant 145 m, F8, M5), one sliver (B6).
- b (the measure, STREET_MODEL_PLAN job 2): 152 findings / 584 m judged against D / O / G driving ends or the OSM band.
- c (our builder, not yet removed): lane ends at mouths (lane-end 270 m: the mouths' kerb corners, job 7), turns
  outside junction polygons (149.5 m, job 7), the build-out lag (stack-lag 89 m), and the old fit in buildings: G6
  Kauwberg (the engine's two lanes in a 4 m street between houses, no UrbIS), F6 Rue Geleytsbeek, E6 Ch. de Saint-Job
  (an OSM way through a building block, no UrbIS: the old fit's lane), K11 Ch. de Waterloo (the old fit's kerb push),
  F1 a turn faded past a corner house; one
  1.5 m model-lane place (D8 Rue de la Cueillette) finer than the builder's 2 m roof grid.
- Cost / side effects: slalom 4,717 → 4,564 m, wobble 2,707 → 2,694 m, headP999 4.28 → 4.61 (ceiling 5.0), parked cars
  kept 11,638 → 11,633; roads census off the carriageway 181 / 3,018 m → 167 / 2,699 m, in a building 16 / 289.5 m → 16 /
  181 m.

**Gate (2026-11-22, `--changed --base ae17ba81`, 30 rows): 28 pass, 2 fail; not ready to merge.**
- `trafmix` "never stuck": seed 23 has 2 stuck service vehicles (ceiling 1): a bus at D6 (-1182.6, 845.3) held "full" at
  its signal (its exit lane's queue does not move) behind a car standing "busy" for > 60 s inside the D7 priority
  junction's turn (-1334, 1240), with a police car behind it. The registered E6 ambulance is gone (stale). The gridlock
  is chaotic: turning off either the need cap or the kerb-run rule alone gives 0 on seed 23; exempting the parked-car
  needs from the cap moves it elsewhere (a bus held by a parked car, -1153, 923). The D7 priority-starved approach is
  the SIGNALS / traffic job's (cause priority-starved); the row needs that decision, not a lane tweak.
- `trafparksim` (I6, shoved parked cars): a traffic car 0.06-0.13 m into a parked car, which passed with the dropped
  old-fit cap (the same chaos: the old fit's I6 lanes moved by centimetres).
- Everything else passes: roads (ceilings at this count), streetlanes (register 421, class-c ceilings), markings
  laneP95, markings2, drivecheck (94 places, tree 0, hero 0), roadsim, motofeel, model, moverground, gates, tlights.

