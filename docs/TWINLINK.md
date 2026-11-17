# Tile-border lane links (twinlink, 2026-11-17)

Every tile's traffic graph (viewer/traffic/trafficGraph.js, built in the tile worker) carries a 150 m buffer of its
neighbours' roads, so its junctions are whole. When the neighbour is loaded, `viewer/traffic/trafficWorld.js link`
gives each buffer copy its TWIN, the neighbour's own lane under it; the sim takes the twin whenever it picks a next
path, and `rerouteTwins` moves cars already on a copy onto it. Only the owner's lane was fitted to the measured
carriageway and round its parked cars (docs/TRAFPARK.md), so a car left on a copy drives 0.5-3 m off the real lane and
can drive through the neighbour's parked cars. Switch: `?twinlink=old` (features.js row, A/B > City defects) = the link,
the handover and the reroute of before. Branch `claude/twinlink`. Main thread only: the worker bundle is unchanged.

## WHY IT HAPPENED + RULE

**1. Root cause.** The link matched "the neighbour's core lane whose START is within 3 m of the copy's start, heading
within 25 deg, length within max(6 m, 35 %)". That describes how the two copies were CUT, not what they are, and the
two tiles cut the same lane differently:

- each tile builds its own road net from its own buffer: a junction one tile has (a side road inside its buffer) the
  other may not, so the same lane is split at different nodes: the copy starts part-way along the twin, or the twin
  is two pieces under one copy, or the copy is clipped at the buffer edge (start test or length test fails);
- only the owner fits its lanes to the measured carriageway (`fitToSurface`: the UrbIS raster stops at the tile
  border, the copy's points are off the raster and stay where the engine put them): the twin runs 1.5-6 m beside the
  copy, its start too;
- junction connectors leaving one lane all start at one point: "nearest start + similar length" picked a sibling
  (another turn) for many of them.

Nobody counted it: the failure was noticed in passing (trafpark round 2, "~30 % of the copies") and lived in a Limits
line. A link rate is a number a gate can hold.

**2. The rule** (docs/QUALITY_RULES.md rule 19). A thing that is built twice (once per tile) is matched by what it IS,
its geometry, never by an incidental property of how it was cut; the hand-over between the two copies is continuous;
the match rate is measured over all tile pairs.

**3. The automated check:** `tools/audit/twinLink.mjs`, gate row `twinlink` in `tools/audit/mergeGate.mjs`
(`node --import ./tools/road_audit/register.mjs tools/audit/twinLink.mjs [--old] [--all] [T ...]`, ~35 s for its 13
tiles: Saint-Job 3 x 3 + Alsemberg; `--all` = 120 tiles, ~4 min). It builds the tiles as the worker does, links every
pair in one TrafficWorld as the browser does, then measures independently (1 m samples, brute force):

| measure | definition | gate |
|---|---|---|
| has a twin | >= 60 % of the copy within 4 m of the neighbour's core lanes of the same kind and direction (mean <= 3 m) AND for a lane: its start lies on (<= 4 m) a lane that carries it as far as it reaches; for a connector: a connector with both ends within 4 m and the same shape | |
| linked | of the copies with a twin | >= 99 % |
| wrong | lane: >= 50 % of the copy (up to the twin's end) > 4 m off the twin, or the other way; connector: ends > 4 m or shape > 4 m; both: entry point > 4 m from the copy's start | 0 |
| cost | link ms per tile pair, warm, best of 3 (the first, cold link reported) | <= 5 ms |
| sim | the real TrafficSim on H5 H6 I5, I6 loaded after 10 s, 120 s: car position jumps > 0.5 m beyond its own travel in a step | 0 |

## Failure classes (before, all 120 tiles, 414 neighbouring tile pairs incl. diagonals)

23,989 buffer copies lie in a loaded neighbour (midpoint in its core). The old link linked 15,244 (63.5 %); the 8,745
it did not, by the first test they fail (`start` = vs the lane under most of the copy, within 1.5 m):

| class | copies |
|---|---|
| no lane of the neighbour within 1.5 m over half of it (junction the neighbour does not build, a lane it drops) | 2,134 |
| start: the twin starts earlier, the copy starts part-way along it (split later / clipped) | 1,813 |
| lateral offset 1.5-3 m (only the owner's lane is fitted) | 993 |
| length: the copy is shorter (clipped at the buffer edge / split earlier) | 864 |
| start: the copy starts on another piece of the twin (split at a different node) | 773 |
| lateral offset 3-6 m | 767 |
| start more than 3 m from the twin's start, near it (lateral fit near a junction) | 585 |
| over a lane of the other kind (lane vs connector) | 421 |
| heading test / another candidate nearer | 221 |
| only the reverse lane there | 156 |
| length: the copy is longer (twin split earlier) | 18 |

And 1,793 of its links (11.8 %) did not follow the copy within 1.5 m (connector siblings, lanes with the start of
another lane near). With the final measure (4 m, starts and connector ends): **17,908 copies have a twin**.

## Fix (`viewer/traffic/trafficWorld.js linkGeo`, `trafficSim.js`)

- **Lanes:** the copy sampled every 3 m (<= 32 samples); each sample's nearest core lane of the neighbour of the same
  kind, heading within 45 deg, within 4 m (the segment hash, 2 x 2 cells); >= 60 % covered, else no twin. The twin =
  the lane under most of the copy, if the copy's start lies on it (<= 4 m: where the car enters); else the lane under
  its start, if that one carries it as far as it reaches. Mean lateral <= 3 m. `twinAt[i]` = where the copy's start
  falls along the twin.
- **Connectors:** the neighbour's connector starting AND ending within 4 m of the copy's ends, the same shape (points
  at the same fractions of the two lengths, mean <= 3 m: a U-turn or a sibling turn never matches), the closest.
- **The sim enters a twin part-way:** `rin` per planned path (from `twinAt`), `pin` for the current one; the route
  walks (pose's axles, look-ahead for cars / obstacles / holds / curves, indicators) count from there; `move()` enters at
  `rin`; `rerouteTwins` puts a car on the twin at the same SPOT (projection), not the same distance.
- **No jump at the handover:** `routePoint` moves the next tile's path by the gap between the two copies (this path's
  end -> the twin's entry) and, after the handover, the previous path by minus it; the car's offset takes the gap at the
  handover and blends it out over ~1 s (as before, <= 4 m). Before, the front axle switched copy before the centre
  did and the full gap was added at the centre's switch: up to 2.5 m jumps.

## Numbers

| all 120 tiles | before (`--old`) | after |
|---|---|---|
| copies with a twin, linked | 14,387 (80.3 %: 3,521 not) | **17,897 (99.94 %: 11 not)** |
| links to the wrong lane | 2,871 (18.8 % of its 15,244 links) | **0** |
| links entered part-way (twinAt > 0.5 m) | 0 (not possible) | 3,047 (1,079 > 20 m) |

13-tile gate set: 76.5 % / 233 wrong -> 99.87 % / 0 wrong.

Running sim (H5 H6 I5 + I6 after 10 s, 117 cars): position jumps > 0.5 m at handovers 163 (max 2.48 m) -> **0**; car
time on buffer copies inside a loaded neighbour 10.3 % -> 6.5 % (the rest: copies with no twin there, below).

Cost (node, this laptop): link per tile pair warm 0.4 ms mean, 1.4-2.9 ms max (best of 3; the gate's 2.9 ms ran next to
the full merge gate); the first link of a session runs cold, 8-26 ms (JIT, once). Per tile load in a whole-city world
(every tile linked against every loaded tile, both ways): median 1.75 ms, p90 3.3 ms (old: 1.90 / 3.30; far tiles are
skipped now, midpoints cached). Whole city loaded tile by tile: 216 ms in all (old 233 ms). The sim: no change per step
(the gap shift costs two point lookups only while an axle is past a tile handover).

## Leftovers (after, all 120 tiles; copies in a loaded neighbour with no twin there)

| class | copies | what the car does |
|---|---|---|
| connector over the neighbour's lanes, but no connector of the neighbour has the same two ends and shape (the junction cut differently: an arm one tile has, the other not) | 2,520 | drives the copy through the junction, then the twin of the lane after it |
| nothing of the neighbour within 4 m (a road / junction it does not build) | 1,364 | drives the copy (there is nothing else) |
| over a lane of the other kind (copy connector over a lane, or the reverse) | 1,053 | as above |
| only the reverse lane there | 354 | as above |
| < 60 % covered | 308 | as above |
| lane over the neighbour's lanes, but its start lies on none that carries it (it starts > 4 m before the twin, in a junction cut differently) | 287 | drives the copy to its end, then the twin of the next piece |
| mostly > 4 m off | 121 | as above |
| has a twin by the audit, not linked (borderline: cover 60-67 %, mean 2.3-2.8 m) | 11 | |

These copies are driven as they are, now and then: trafpark round 2 already treats them as driven
(`trafficSim.js laneThrough`, level 1) and the parked cars they cross as obstacles.

## Browser check (pending: coordinator's turn)

- A car crossing a tile border on a long street (e.g. `?quick=1&place=alsemberg&with=traffic`, Saint-Job I6/H6): no
  jump, no visible sideways slide beyond the ~1 s blend; `?twinlink=old` for the A/B.
- `debug/trafparkWatch.js watch(150)` on the three streets (into 0): more cars now drive the owner's lanes.
- The police game after a 45 s drive (tiles stream in: `rerouteTwins` at the same spot), console clean.
- Traffic update ms (gamePerf "1:update") and the tile-load hitch with many tiles loaded.
