# Traffic through parked cars (trafpark, 2026-11-17)

Owner playtest: "the traffic cars can go through the parked cars, that looks wrong". Switch: `?trafpark=old` (features.js
row, City defects) = everything below off. Branch `claude/trafpark`.

## WHY IT HAPPENED + RULE

**1. Root cause.** Three assumptions, each wrong:

- *"The lane fit keeps the lanes clear, so the graph is clear."* The citydefects fit (`trafficGraph.js fitToSurface`)
  did move each lane POINT 1.95 m from the parked cars' centres. But the graph is then smoothed by the kink rounding
  (`roundKinks`, the blocky-turns fix of 2026-11-13, which runs AFTER the fit): every bend the fit made round a row of
  cars is a "kink" > 8 deg, and 30 Laplacian rounds flattened it straight back through the cars. Measured per stage on
  I6: raw lanes through 110 cars, after the fit 3, after the rounding 70. Over all 120 tiles 4,106 of the 5,241
  overlapping (car, lane) pairs were this.
- *"Lanes are what matters."* Junction connectors (their shape is a blend of the entry / exit lane shifts) and lane ends
  near a junction mouth were never tested against the cars (571 + 396 pairs), and nor was the BODY: the sim poses a car
  by its two axles on the path, and on a bend its corners leave the centre line by ~0.2 m.
- *"Parked cars do not move."* The traffic only knew the slots the lanes were built round. A car the player shoves
  (up to 1 m into the lane), the police game's pull-over shift (0.9 m to the right, i.e. into the kerb's cars), the
  emergency-yield shift, the motorbike room shift, and the pull-out / reverse-in manoeuvres (an S-curve swept through
  the car parked ahead) all ignored them.
- *"A tile is a closed world."* (found in the browser, round 2) Each tile's worker fits its lanes round ITS OWN parked
  cars, but a lane piece the tile owns runs on past the border into the neighbour, among the neighbour's cars (the
  worker's measured raster stops at the border: it cannot even place them). And where the sim's twin linking (one
  tile's buffer copy -> the neighbour's own lane) fails (~30 % of the buffer pieces lying in a loaded neighbour, on
  `?trafpark=old` too) or a car's route was planned before the neighbour loaded, cars drive a copy that was never fitted
  round anything there. The node audit checked each tile alone, so it said 0 while the browser showed 101 parked cars
  hit in 45 s on Chaussee d'Alsemberg.

**Why the earlier street audit did not block it.** `tools/audit/streetAudit.mjs` measured the distance from a lane's
centre line to a parked car's CENTRE (< 1.95 m), not to its footprint (a car's nose is 2.37 m from its centre: a lane
through the nose passed the test), it printed a count (1,202) but exited 0, nobody ran it as a gate, and the runtime
was marked "UNTESTED in the running sim". A report is not a check.

**2. The rule.** No parked car's footprint (its plan box: the widest / longest common type, 1.85 x 4.73 m) within a
traffic car's half width (0.98 m: the widest traffic type, a panel van) of ANY driven path (lanes and junction connectors, sampled every 0.25 m) nor under a
traffic car's posed body (4.74 x 1.8 m, axles on the path, every 0.5 m). Where the street is too narrow for a lane to
pass, the car is not parked there (one side stays parked, the give-way narrow stretches stay). At run time a traffic car
treats a parked car that moved, or that another tile's lane runs through, as an obstacle, and no sideways shift or
manoeuvre may bring its body into one. A tile is checked against its LOADED NEIGHBOURS too, never alone.

**3. The automated checks** (each exits non-zero on failure; all registered in `tools/audit/mergeGate.mjs`):

| gate | command | pass |
|---|---|---|
| `trafpark` | `node --import ./tools/road_audit/register.mjs tools/audit/trafParkAudit.mjs --max 0 --all` | 0 parked cars overlap a driven path, all tiles |
| `trafparkborder` | `node --import ./tools/road_audit/register.mjs tools/audit/trafParkBorder.mjs` | 0 parked cars under a NEIGHBOUR tile's own lane after the border drop (D3 D4 E3 E4 H5 H6 I5 I6: 40 found, 40 dropped) |
| browser | `debug/trafparkWatch.js watch(150)` on 3 streets (mergeGate BROWSER list) | into 0 |
| `trafparksim` | `node --import ./tools/road_audit/register.mjs tools/trafParkSimTest.mjs --tile I6 --secs 240` | 0 samples of a traffic body > 5 cm into a parked box: static, 40 shoved, pull over, pull-outs / park-ins |

`node tools/audit/mergeGate.mjs` runs every gate (`--quick`: 5 sample tiles / 60 s, ~1 min; `--only trafpark`).

## Counts (all 120 tiles, node, `tools/audit/trafParkAudit.mjs`)

| | before (`--old`) | after |
|---|---|---|
(Final, with round 2's 0.98 m half width; round 1's 0.9 m gave 4,691 -> 0 with 914 not parked.)

| | before (`--old`) | after |
|---|---|---|
| parked cars | 12,084 | 11,016 (1,068 not parked: 8.8 %) |
| **parked cars overlapping a driven path** | **5,281** (44 %) | **0** |
| (car, path) pairs | 5,936: kink rounding 4,661, connectors 642, lane ends 463, no room 170; tram lanes 213; under a narrow stretch 3,225 | 0 |
| lane metres through a car | 31,643 m | 0 |
| tight passes (body gap 0-15 cm) | 2,058 | 399 |

The 1,068 cars that go (with the new lanes, before the drop: 967 cars in 1,950 pairs): junction connectors 916 pairs
(cars at a corner that a turning car sweeps: Belgian law keeps 5 m of a junction free anyway), the fit's leftovers 662,
lane ends 334, streets too narrow for a lane beside the car 38. At run time the tile borders take a few more (below). Data: `docs/trafpark/audit_old.json`,
`audit_new.json`, `audit_new_before_drop.json`.

The running sim (`tools/trafParkSimTest.mjs`, 240 s per run, samples = car x 0.2 s):

| tile | run | before: samples into a parked car / parked cars hit / deepest | after |
|---|---|---|---|
| I6 | static | 2,259 / 74 / 1.56 m | 0 |
| I6 | 40 shoved | 2,579 / 76 / 1.85 m | 0 |
| I6 | pull over | 576 / 9 / 1.84 m | 0 |
| E4 | static | 1,278 / 44 / 1.84 m | 0 |
| E4 | 40 shoved | 1,303 / 50 / 1.85 m | 0 |
| J5 | static | 2,404 / 55 / 1.81 m | 0 |
| J5 | 40 shoved | 3,231 / 66 / 1.85 m | 0 |
| G5 | static / 40 shoved / pull over | 1,126 / 37 / 0.97 m; 2,032 / 45 / 1.34 m; 394 / 11 / 1.84 m | 0 |
| H6 | static / 40 shoved / pull over | 1,738 / 41 / 1.49 m; 3,672 / 50 / 1.85 m; 520 / 9 / 1.84 m | 0 |
| I6 / G5 / H6 | pull-outs + park-ins (parkRate 4) | 4,427 / 66; 4,184 / 47; 7,283 / 39 (lanes + the S-curve through the car ahead) | 0 (with only the lane fix: 20 samples / 4 cars / 0.72 m) |

With the fix, of the pull-outs tried 13 / 35 (I6), 4 / 17 (G5), 6 / 16 (H6) found no S-curve clear of the cars parked
ahead / behind and did not happen; no reverse-in was refused. Every run: no car stuck > 60 s except behind a shoved car
it cannot pass while in view (I6 pull-out run with everything "in view": 18).

## Browser (round 2, 2026-11-17: one tab, server 8835, preflight GREEN)

`debug/trafparkWatch.js` `watch(secs)`: every 0.25 s every traffic car's body against every drawn parked car's box
(> 5 cm = into). `?quick=1&place=<p>&with=traffic` unless said:

| street | `?trafpark=old` | round 1 (node fixes only) | final |
|---|---|---|---|
| Chaussee d'Alsemberg (E4, 4 tiles, 139 cars) | 768 samples / 101 parked cars hit / 1.85 m deep (45 s) | 123 / 15 / 1.84 m (50 s; all at tile borders) | 0 / 0 (150 s) |
| Saint-Job (I6, 108 cars) | 2,234 / 187 / 1.91 m (90 s) | 111 / 17 / 1.11 m (120 s; buffer copies) | 0 / 0 (150 s) |
| Fort-Jaco, Ch. de Waterloo (J7, 78 cars) | | | 0 / 0 (150 s) |
| full city, default boot (90 cars) | | | 0 / 0 (120 s) |
| police game, after a 45 s drive (tiles streamed) | | 66 / 7 / 1.47 m (all beyond 300 m) | 0 / 0 (40 s) |

Images: `docs/trafpark/stjob_street_after.jpg`, `old_traffic_inside_parked.jpg` (`?trafpark=old`: the traffic car
frozen inside the grey parked car).

Round 2 fixes (all behind `?trafpark=old`):
- `viewer/traffic/borderPark.js` + main.js: a tile's parked cars that a LOADED neighbour's own lane runs through are not
  drawn (checked before the tile's cars appear: no pop). Alsemberg 21, Saint-Job 4, Fort-Jaco 14, police drive 67.
- `trafficSim.js parkedGrid`: when the set of graphs changes, every parked car is checked against the tiles' own lanes
  and the twinless buffer copies (`laneThrough`; junction turns +0.3 m for the body's sweep): under another tile's own
  lane and > 250 m from the player it is taken away (as at load; police drive: 62), else it is an obstacle (wait, or
  ease out round it); the obstacles' lane entries are projected once per pose / graph set and copied each step.
- `rerouteTwins`: when a tile comes in, routes planned on the old buffer copies take the new tile's own lanes (twins),
  and a car on such a copy moves onto the twin at the same distance (the lateral difference blended out).
- the graph's checks use the widest traffic type's half width (0.98 m, was 0.9: vans brushed by 5-10 cm).

HEAP browser line (fresh document each): `?gamemenu=0&orbitcam2=old` (localStorage cleared), default,
`?gamemenu=0&tilecache=0` (cold), `?game=police` + gamePerf police 45 s, `?game=falcon` + gamePerf falcon 30 s: 0 console
errors, 0 WebGPU errors, `__heapDrop.tripCounts` {} in all five, `__queueSkips` 0 / 0. No new CPU reader of tile meshes
(the traffic graphs and parking slots are plain arrays / objects, not geometry).

Load and frame cost (police game, gamePerf police 45 s, A/B by page load):

| | `?trafpark=old` | trafpark |
|---|---|---|
| boot to the car in the yard | 25 s | 21-32 s (one run 68 s) |
| fps / frame avg / p95 | 53.8 / 18.57 ms / 33.3 | 52.8-54.6 / 18.3-18.9 ms / 33.3 |
| main loop CPU avg | 10.04 ms | 10.12-10.56 ms |
| the traffic's update (gamePerf "1:update") | 0.17 ms a frame | 0.24 ms a frame |
| sim step | 0.27 ms | 0.30-0.41 ms |
| worker, per tile | | + ~130 ms of traffic graph (fit + check + one rebuild) |

Visual tour (docs/TOUR.md, `run=trafpark`, 22 views, 663 s, 22/22 ok) vs `foundation`: 3 of 22 flagged, all parked
cars, all intended (`docs/trafpark/tour_*_before_after.jpg`, baseline left, trafpark right):

| view | pixels / cell / ssim | what changed |
|---|---|---|
| coghen-blocks | 3.19 % / 99.7 % / 0.970 | the parked car 4 m in front of the camera (-654, -936) is gone: a lane ran through it; the next car is now a van (types are dealt per tile by slot room: one slot less reshuffles some) |
| stpierre-parvis | 1.24 % / 49.5 % / 0.983 | same slots, a saloon became a panel van (the per-tile type deal) |
| traffic-alsemberg | 3.47 % / 89.5 % / 0.958 | the dark van over the kerb at the left in the baseline is not there; no parked slot changed within 30 m: a pulling-out car (pull-outs whose S-curve hits the car ahead no longer happen) |
| the other 19 | pixels <= 0.22 %, cells <= 18.9 % (lycee-front, under its 30 %) | none |

## What changed

- `viewer/traffic/trafficGraph.js` (worker):
  - lane pieces densified to <= 1.5 m before the fit (the clearance is tested at the points);
  - the fit's car test is the distance to the car's box (`parkedBoxDist`) >= 0.9 + 0.2 m; a car's need spreads as a ramp
    (0.2 m sideways per m along) instead of a step (the step made the kinks); the smoothed line is re-checked and a
    point that touches a car becomes a hard constraint (<= 6 rounds);
  - `roundKinks(paths, keep)`: a node never moves closer to a parked car than the fit's clearance (as far as it can);
  - the final check over every path + the posed body (SAT box-box): a car still touched is dropped (`parkedKept`), and the
    graph is built once more round the kept cars (the lanes bent round the dropped ones straighten);
  - cost: +~130 ms per tile in the worker (I6 / E4 / J5 / G5 / H6: 484 -> 1,322 ms for 5 tiles of graph).
- `viewer/tileData.js`: the parked sites = `traffic.parkedKept` (`parked.stats.trafparkDropped`).
- `viewer/traffic/trafficSim.js` (main thread):
  - a grid of the parked fleet's cars every 2 s; a car off its first-seen pose (or reported by `carFleet.onChange`, the
    shove's `touch`) is a box obstacle that blocks a lane only when it really stands into it (< 0.9 m);
  - behind one: wait (a `HOLD.park`: culled after 60 s out of sight like any stuck car), or ease out up to 1.3 m when the
    shifted corridor is free of other parked cars and nobody comes the other way within 35 m / alongside (give way);
    while eased out it checks its stopping distance ahead along its route;
  - no sideways move (pull over, emergency yield, the motorbike room, back from a pass) that brings the body within
    5 cm of a parked car; a shifted car looks along its shifted body for parked cars (a leader);
  - pull-out: the first of 4 S-curves whose body sweep clears the neighbours, else no pull-out; reverse-in: the first of
    4 reverse curves, else it drives on; the S-curve is checked again when the pull-out goes (a neighbour may have
    parked back) and given up after 20 s blocked; no pull-out / reverse-in within 14 m of another one; no reverse-in
    while still eased out; a shoved slot is never parked into; no spawn into an obstacle.
  - cost (node, I6, 42-57 cars): 0.04 ms a step with nothing moved (as before), 0.2-0.4 ms with 40 shoved cars
    (old: 0.04), at 20 steps a second. Look-aheads every 4th step, a refused pass asked again after 0.6 s, a pass
    decided within 30 m.
- `viewer/traffic/cityTraffic.js`: the parked cars' sizes (`carFleet.sizeOf`) and the shove hook.

## Limits / next

- Twin linking (`trafficWorld.js link`: start within 3 m, similar length) missed ~30 % of the buffer pieces lying in a
  loaded neighbour (on `?trafpark=old` too). Fixed by `claude/twinlink` (docs/TWINLINK.md): by geometry, 99.9 % of the
  copies that have a twin linked, 0 wrong.
- Parked car types are dealt over the whole tile by slot room: a slot less changes some types elsewhere (the tour's two
  type changes).
- Rule 12 (docs/QUALITY_RULES.md): the worker bundle in this branch was rebuilt for the browser checks (the graph code
  changed again in round 2); rebuild it in the main repo at the merge.

- A car behind a shoved car it cannot pass (> 1.3 m into the lane, or both sides blocked) waits; in view it waits until
  the player moves the car or goes away (out of sight it is removed after 60 s).
- Pull-outs from a tight slot (about 1 m to the car ahead) find no clear S-curve and do not happen (I6: 13 of 35):
  a back-and-forth manoeuvre would bring them back.
- The box is the widest common type for every parked car (conservative); a panel van (1.95 x 5.03 m) is 5 cm wider.
- Browser check pending (coordinator's turn): `?quick=1&place=alsemberg&with=traffic` and 2 more busy streets, a few
  minutes each; images in docs/trafpark/.
