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

**Why the earlier street audit did not block it.** `tools/audit/streetAudit.mjs` measured the distance from a lane's
centre line to a parked car's CENTRE (< 1.95 m), not to its footprint (a car's nose is 2.37 m from its centre: a lane
through the nose passed the test), it printed a count (1,202) but exited 0, nobody ran it as a gate, and the runtime
was marked "UNTESTED in the running sim". A report is not a check.

**2. The rule.** No parked car's footprint (its plan box: the widest / longest common type, 1.85 x 4.73 m) within a
traffic car's half width (0.9 m) of ANY driven path (lanes and junction connectors, sampled every 0.25 m) nor under a
traffic car's posed body (4.74 x 1.8 m, axles on the path, every 0.5 m). Where the street is too narrow for a lane to
pass, the car is not parked there (one side stays parked, the give-way narrow stretches stay). At run time a traffic car
treats a parked car that moved as an obstacle, and no sideways shift or manoeuvre may bring its body into one.

**3. The automated checks** (both exit non-zero on failure; both registered in `tools/audit/mergeGate.mjs`):

| gate | command | pass |
|---|---|---|
| `trafpark` | `node --import ./tools/road_audit/register.mjs tools/audit/trafParkAudit.mjs --max 0 --all` | 0 parked cars overlap a driven path, all tiles |
| `trafparksim` | `node --import ./tools/road_audit/register.mjs tools/trafParkSimTest.mjs --tile I6 --secs 240` | 0 samples of a traffic body > 5 cm into a parked box: static, 40 shoved, pull over, pull-outs / park-ins |

`node tools/audit/mergeGate.mjs` runs every gate (`--quick`: 5 sample tiles / 60 s, ~1 min; `--only trafpark`).

## Counts (all 120 tiles, node, `tools/audit/trafParkAudit.mjs`)

| | before (`--old`) | after |
|---|---|---|
| parked cars | 12,084 | 11,170 (914 not parked: 7.6 %) |
| **parked cars overlapping a driven path** | **4,691** (39 %) | **0** |
| (car, path) pairs | 5,241: kink rounding 4,106, connectors 571, lane ends 396, no room 168; tram lanes 177; under a narrow stretch 3,070 | 0 |
| lane metres through a car | 21,656 m | 0 |
| tight passes (body gap 0-15 cm) | 1,119 | 180 |

The 914 cars that go (with the new lanes, before the drop: 834 cars in 1,723 pairs): junction connectors 830 pairs
(cars at a corner that a turning car sweeps: Belgian law keeps 5 m of a junction free anyway), the fit's leftovers 578,
lane ends 277, streets too narrow for a lane beside the car 38. Data: `docs/trafpark/audit_old.json`,
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
    4 reverse curves, else it drives on; no spawn into an obstacle.
- `viewer/traffic/cityTraffic.js`: the parked cars' sizes (`carFleet.sizeOf`) and the shove hook.

## Limits / next

- A car behind a shoved car it cannot pass (> 1.3 m into the lane, or both sides blocked) waits; in view it waits until
  the player moves the car or goes away (out of sight it is removed after 60 s).
- The box is the widest common type for every parked car (conservative); a panel van (1.95 x 5.03 m) is 5 cm wider.
- Browser check pending (coordinator's turn): `?quick=1&place=alsemberg&with=traffic` and 2 more busy streets, a few
  minutes each; images in docs/trafpark/.
