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
| 4 | Traffic lanes and turns from the model; retire laneShifter / the fitToSurface snap | roads in-building / off-carriage 0 + register; roadsim | 2 d |
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
