---
status: provisional
added: 2026-11-22
check: `allocrate` (tools/audit/allocRateCheck.mjs: the garbage-free paths give the old results (round 2: the villa deck, the blockers' rect merge and walk, surfaceLayers, the heap drop's bounds bit for bit, the fleet's placeCars car by car, the villa tree clear), the partial rail lift kept until the loaded tiles change, the readbacks listed, the switches' rows) + `allocbudget` (tools/perf/allocBudget.mjs: a 25 s falcon flight and a 25 s police drive under the sampler, the sampled JS KB a frame under tools/perf/allocBudget.json) + browser row `allocrate` (debug/falconStutter.js allocMB a minute and the largest GC drop; tools/perf/allocSample.mjs KB a frame)
---
**Round 2 (claude/allocrate2, 2026-11-23).** Fixed, each behind its `?x=old` with a features row and proven equal to the old path in allocRateCheck.mjs: `villadeck` (the villa's drive deck, 2.9 MB a frame flying; a box test, index rings; a far-tree pre-test in villaTreesClear), `blockkeys` (the blockers' rect merge without string keys, the triangle walk in a module function), `surfout` (surfaceLayers), `fleetopt` (carFleet placeCars), `fastbounds` (viewer/fastBounds.js: = three's bounds bit for bit, also in heapDrop's prototype wrapper), `tramalloc` (snap / yAlong / update), `allocsmall` (driveHeight's closure, the park fence loop). Measured with allocSample, 40 s, its own Chrome; the preflight was RED (other agents), and KB a frame holds up under load. B = the round-2 switches set to old:
- falcon: A 1012 / 1061 KB a frame, B 3509 / 3567 (-71 %); in those runs allocMB a minute A 2288 / 3188, B 6914 / 6266, GC drops 55 / 68 vs 160 / 150 in 40 s;
- police: A 1024 / 990, B 1459 / 1537 (-33 %).
New row `allocbudget` (25 s runs): falcon 1431 / 1412 / 1337 KB a frame, budget 1790; police 1284 / 1202, budget 1605. With `--query "&villadeck=old"` the row fails on both (falcon 5263, police 2129 KB a frame): it would have caught the villa merge. Owed, on a quiet machine: the falconStutter 60 s A B B A (p99, over50, gcMB, the largest GC drop) and the police 1 % low. Left, in KB a frame: three's own per-render-object work (RenderObjects.get keys, getDataFromNode, attribute updates); polyBoxContact's closures, 24, driving; multiDraw cull's `all.length = 0` regrowth, 20; Heightmap.sample's boxed returns, 16-26; blockerSteps' remaining scratch arrays, 22-48. The big GC drops are likely the tiles' ArrayBuffers (~37 MB a tile, counted in usedJSHeapSize); pooling them needs the tile worker, and was not tried.

**Rule.** Code on the per-frame path (updaters, the instance gathers, culls, render hooks) and the per-tile / per-landmark builds that run while the player plays allocate nothing per item. That means index loops, never `for (const [a, b] of list)` or `const [x, z] = ring[i]` in a hot loop; reused scratch objects, arrays and answer objects; no closure, `subarray` view or small array per item; flat parallel lists in place of `[a, b, c]` tuples; numbers or flat typed lists as Map / Set keys, never template strings. A function every ground query calls (one in `world.decks`, a surface or height lookup) starts with a box test, so a point anywhere else in the city costs four compares. A hot double loop does not live inside a long function, a generator, or a closure's captured variables: there every double is a new heap number (an unoptimised function, a context slot). It goes into a small module function with its state in a typed array or an object of fields. three's own allocating helpers (computeBoundingBox / Sphere: getX per read) are wrapped or replaced from our side by a loop that gives the same numbers; vendor/ and three stay untouched. A GPU readback (`readRenderTargetPixelsAsync`: a staging buffer and a typed array each call in three r187) is never made every frame: it is paced, or it lives at a listed one-off call site. A result that depends on what is loaded (a partial average with a tap in a tile not loaded yet) is cached until the loaded set changes. It is never recomputed on every call. Before you say a change is allocation-neutral, measure it with `node tools/perf/allocSample.mjs --mode falcon|police`: its "ours" table charges each sample to our nearest function, with builtins as `our frame > builtin` and three as `[lib] fn < our frame`. Each fix stays behind its `?x=old` switch, with a row in viewer/features.js. Every merge that touches viewer/ or models/ passes the `allocbudget` row: the sampled JS KB a frame of a short falcon flight and a short police drive stays under tools/perf/allocBudget.json (the measured value + 25 %). A real increase is measured again (`node tools/perf/allocBudget.mjs --measure`), and the budget is raised in the same merge, with its reason written here.

**Why.** The owner's #1 complaint is lag in the police game. The villa merge (claude/villa1, 2026-11-22) put a drive deck with no box test and a destructured ring walk into world.decks, which every ground query calls: 2.9 MB of garbage a frame of the falcon flight, ~6.5 GB a minute, double what round 1 had left, and no gate saw it, because allocation was only measured by hand. Hence the `allocbudget` row (claude/allocrate2). Flying the falcon allocated 3-4.5 GB of short-lived garbage a minute (FALCON_STUTTER round 2), and the major GCs paused 50-100 ms. A typed-array probe found ~90 % of it was JS objects, not arrays. On 2026-11-22 the first allocation-sampling profile (CDP HeapProfiler with the objects collected by minor and major GCs kept; 40 s flights and drives) put about 1.8 MB of JS a frame on the falcon flight. It named these sources on our side, in KB a frame of the falcon flight:
- the trams' rail lift, 150 (trackProfile.js liftOf): a tram outside the loaded ring recomputed a partial average, 17 road taps each returning a new object, every frame, because only a full average was cached;
- the garden clear-ring test, ~170 (main.js inClear): every ring was tested whole, with array destructuring per vertex; the same disease was in cityFuel's ring test;
- the instance gather, ~165 (instanceStream.js gather / copy): for-of and destructuring inside a generator, plus a subarray view per copied run, nearly every frame while moving, because TRIGGER is 2 m;
- the landmark car blockers, ~60 (heroColliders.js): a closure per triangle;
- the parked fleet, ~20-50 on the police drive (carFleet.js): a `[batch, car, fade]` array per drawn car per frame;
- the exposure meter: a readback every 4th frame.

Tile-time code rarely runs long enough for TurboFan's escape analysis to remove the iterator objects, so the clean form must be written by hand.

**Measured** (claude/allocrate, 2026-11-22). The preflight was RED the whole time (another agent's gate runs, CPU 79-100 % busy at rest), so the frame-time numbers are only indicative. Alternated A B B A runs, with B = the six switches set to `old`:

| run | variant | sampled JS (KB a frame) | falconStutter allocMB a minute | GC drops a minute (count) |
|---|---|---|---|---|
| allocSample falcon, 40 s | A | 1348 / 1218 | n/a | n/a |
| allocSample falcon, 40 s | B | 1722 / 1808 | n/a | n/a |
| allocSample police, 40 s | A | 1128 / 972 | n/a | n/a |
| allocSample police, 40 s | B | 1404 / 1595 | n/a | n/a |
| falconStutter, 60 s | A | n/a | 1926 (a stalled run) / 3190 | 68 / 105 |
| falconStutter, 60 s | B | n/a | 3573 / 3506 | 127 / 128 |
| police drive, 45 s | A | n/a | n/a | 59 / 82 in 45 s |
| police drive, 45 s | B | n/a | n/a | 114 / 100 in 45 s |

- Sampled JS: -27 % a frame on the falcon flight, -30 % on the police drive.
- Heap growth: -9..-46 % a minute on the falcon flight.
- GC count: about -40 %.
- The police drive's 1 % low on the lightest pair (B2 then A2): 13.1 -> 15.0 fps, frames over 50 ms 39 -> 18 (indicative).

Not reached yet: the doc's goal of <= 1750 MB a minute with no GC drop over 300 MB (drops of 350-470 MB are still seen on both sides). What is left is mostly three r187's own per-render-object work (RenderObjects.get cache keys, node data, attribute updates), the heap-drop bounds (three's getX/Y/Z boxing in computeBoundingBox), the tiles' ArrayBuffers, and smaller items of ours. In KB a frame on the falcon flight:
- tramline.js snapTileNow, 21, and yAlong, 14 (the latter per frame, `at()` returning an array);
- heroColliders blockerSteps, 40 (row Set of template-string keys);
- drive/surfaceLayers.js, 16 (an array + an object a lattice point);
- carFleet.update, 16-36 (doubles boxed: the loop is not optimised).
