# No saw-tooth surfaces (claude/sawtooth, 2026-11-26)

Owner: "the street that goes up with the tram around the Saint-Job church: the sidewalk has bumps like a SAW TOOTH ...
I'm sure we have this in several places; if we have a way to find it, it would be easier." Rule:
docs/rules/no-sawtooth-surfaces.md. Switch: `?sawtooth=old` (entry `sawtooth: false`, features.js row).

## The cause (numbers)

The street height field H (viewer/surfaces.js) is a 6 m grid of corners, each half-cell a plane. Each corner was its OWN
weighted least-squares plane through the street samples within 6 m of it (`fitCorner`), evaluated at the corner; a corner
beside the street (behind a sidewalk, on a bank) extrapolated that plane from one side. The error of a corner (a few cm)
depends on where it falls in the street's cross-section (camber, the kerb-levelled sidewalk, a bank's toe), and along a
street crossing the grid at an angle that position cycles, so the corners' errors alternate and the drawn surface bends at
every crease:

- Montagne de Saint-Job 42 (I6), 0.5 m behind the kerb, a 3.2 % sidewalk: slopes 3.4 / 1.2 / 5.0 / 1.7 / 5.4 % in turn,
  every kink on a grid line x = 6k / z = 6k or the split diagonal x - z = 6k (1116 / 1122, 744 / 738 / 732, 378 / 384).
  With the joint fit: 2.3 - 3.9 % changing gradually, no kinks.
- city-wide (old builder) the saw-tooth places' median period is 7.0 m = the 6 m cell over the street's angle to the grid.

## The fix

`jointFit` (viewer/surfaces.js, opts.jointFit from entry.sawtooth): the corners of every cell holding a street sample are
solved TOGETHER: least squares of the drawn piecewise-planar surface itself to every street sample (1 m lattice, the same
`groundAt` as before), + 2 x the corners' second differences (zero for any plane: no slope is flattened), + 0.02 x the
pull to the per-corner value; Jacobi-preconditioned conjugate gradients from the per-corner values, the H_MARGIN clamp kept.
The TRAM RAILS are samples of the fit too (weight 30 for each 1 m, data/transit/tram_profile.json + the road lift
viewer/trackProfile.js railTop averages, `tramRails`): the street follows the rails' smooth profile. Without them the field,
which cannot follow a crowned street inside a 6 m cell, sat 7-11 cm under the rails (Av. Brugmann F2; moverground tram
1,414 -> 2,400 m); with them 259 m (fewer than the per-corner fit's 1,414: the rails now sit on the street). Every corner
stays within 0.3 m of its own plane (15 cm with almost no samples): the saw-tooth is cm, and a steep narrow garden path
fitted by a few samples (J11 Av. des Sorbiers 24, 1.4 m) is not flattened (flattened, the wall builder walled both of its
sides: a stacked wall). 60-100 ms a tile (worker only). Tuning and the variants tried and dropped are in the code comment.

## The detector: tools/audit/census/sawtooth.mjs (gate row `sawtooth`)

Every measured kerb (0.5 / 1.0 / 1.75 / 2.5 m on its raised side, 0.5 / 1.5 m on its low side), every OSM footway / path /
cycleway / platform and every OSM road centre line of all 120 tiles, walked at 0.25 m on the DRAWN ground (the street
parts' top, else the drawn terrain grid). Runs cut at real steps (> 6 cm a sample), class changes, dropped kerbs and tree
pits, corners, offset folds and the tile edge; each run detrended by a local +-3 m line; a chain of >= 5 swings of >= 2.5 cm
with a regular cycle (0.75 - 12 m, CV <= 0.4) is a saw-tooth; chains within 6 m = one place. Samples on the bare UrbIS DTM
(no carve / weld under them: lawns, unpaved park paths) are reported as `dtm`, not counted. `--fixture` (also run first
every time): a 3 cm 6 m saw on an 8 % grade is found; the smooth grade, a 12 cm step and 5 mm noise are not.
`--oldcheck I6,H6,F2`: the old builder must still show >= 2 x the places. `SAW_DUMP=x,z,r` writes the profiles there.

## City-wide (120 tiles, 2,225 km walked)

| | ?sawtooth=old | default | |
|---|---|---|---|
| places (built surfaces) | 1,191 | 330 | -72 % |
| metres | 34,417 | 7,936 | -77 % |
| sidewalk | 523 | 76 | -85 % |
| road (carriageway, gutter) | 530 | 120 | -77 % |
| square / other / tram | 9 | 6 | |
| built terrain (`ground`) | 129 | 128 | another cause, below |
| bare DTM micro-relief (`dtm`, not counted) | 759 | 761 | measured ground |

The owner's street ("goes up with the tram around the Saint-Job church"): two candidates, both shot and plotted
(C:/Users/tibog/Downloads/uccle-sawtooth/compare.html, the drawn sidewalk 1 m behind the kerb minus its local +-3 m line):
- A Rue du Ham, the tram north-east past the church (I6): church side rms 0.9 -> 0.8 cm (max 5.5 -> 6.1, at a forecourt),
  west side 1.1 -> 0.9 cm (max 5.7 -> 4.5). No saw-tooth place at 2.5 cm either way. The visible change there is the RAILS:
  in the old build they kinked against the road (moverground: tracks > 5 cm off the street), now they lie on it.
- B the tram climbing west of the place (Av. Carsoel / Latérale / Rue de l'Equateur, H6 / H5): 1.7 -> 1.6 cm (H6), 1.1 ->
  0.8 cm (H5). The 3-5 cm saw-tooth the census found on the Saint-Job streets (Montagne de Saint-Job, Ch. de Saint-Job,
  Rue Jean Benaets, Av. Latérale, Rue de l'Equateur: 21 places) is the stronger defect: 3 left.

Worst before: F6 Rue du Repos 141 road 117 m, cycle 6.7 m, 23.8 cm; B4 sidewalk -2243, -456 20 cm; G3 road 15.7, -936 17 cm;
F5 Rue du Repos 113; G2 Av. Adolphe Dupuich 32; D6 Rue François Vervloet 16. After: Rue du Repos 8.2 cm (was 23.8), B4
8.7, Dupuich 6.3, Vervloet 7.4 (and 4-13 cm on six shorter runs there).

### What is left

- **sidewalk / road 196**: places where the 6 m piecewise-planar field cannot follow a crease inside one cell (a junction
  with a steep side street, a sidewalk folding onto a ramp or a forecourt) or a corner held by the 0.3 m cap: the fit
  compromises and the compromise changes along the street. A finer cell (3 m) would take them; it changes every street
  triangle (cost) and is left for a round 2.
- **built terrain 130**: the drawn terrain over a path (the census walks paths on the drawn ground): rail-corridor cuts
  (H6 Rue de la Pêcherie, where the DTM itself alternates +-15 cm a metre and the rail carve lowers it), the terrain over
  park paths. Not this cause (same count both ways); ground.mjs (`over`) covers part of it.
- **dtm 762**: the LiDAR DTM's own 3 - 6 cm relief along lawns and unpaved paths: measured, kept.

## Side effects checked

- kerb heights (H6, every kerb: p5 / p50 / p95 of the drawn raised top 0.3 m in minus the road top 0.3 m out): closer to
  13 cm and narrower (old p95 up to 22.9 cm -> 16.5).
- |H - street ground| over the street samples (I6 H6 F2, every corner joint): p50 2.4 -> 2.6 cm, p99 17.1 -> 19.7 cm.
- tile seams (drawn street either side, same part): H6 | I6 p50 / p90 1.1 / 2.6 -> 1.6 / 4.2 cm; I6 | I7 3.2 / 20.2 -> 1.8
  / 12.0 cm (the per-corner fits differed on both sides too; the seam steps are an older, separate problem).
- ground census (all tiles): sidewalk tilt 807 -> 610, road cross-fall 379 -> 284 (ceilings tightened); weld lumps 864 ->
  903 groups (m2 11,872 -> 12,076, +2 %), spikes 174 -> 189 (m2 477 -> 523), bare banks 555 -> 609 (m2 1,189 -> 1,306),
  over 305 -> 306, stacked 0. The places (new groups with no old one within 5 m; the old run kept its 3,000 top items, so
  "new" is an upper bound): listed at the end.
- moverground (all tiles): tram 1,414 -> 259, traffic 2,913 -> 2,899, parked 127 -> 125 (ceilings tightened).
- colliders (F1 E4 B6 D4): offset 17 -> 19 measured with the first joint build (D4 Av. Adolphe Wansart, 3.6 m2); see the gate.
- the other street rows: see the merge gate run.

Shots (grazing, before = ?sawtooth=old): C:\Users\tibog\Downloads\uccle-sawtooth\ (compare.html). Raw results:
docs/sawtooth/sawtooth_old.json / sawtooth_new.json, maps map_old.svg / map_new.svg.

## Raised ceilings: the new places (worst first)

```
== lump: old 864 new 903 | new places 91, gone 52 | m2 new-only 1501
   K10 | 2324, 2879 | 978 m2 | worst 1.98 | -
   K11 | 2326, 3008 | 135 m2 | worst 2 | -
   C6 | -1842, 830 | 32 m2 | worst 1.85 | Rue Keyenbempt 66
   D2 | -1446, -1370 | 38 m2 | worst 1.19 | -
   J3 | 1938, -553 | 25 m2 | worst 1.17 | -
   H10 | 803, 2816 | 17 m2 | worst 0.97 | Rue de Percke 127C
   C6 | -1763, 661 | 11 m2 | worst 0.71 | Rue Molenvelt 3
   G8 | 88, 1627 | 9 m2 | worst 0.79 | -
   G3 | 231, -593 | 9 m2 | worst 0.65 | -
   M7 | 3330, 1066 | 9 m2 | worst 0.62 | -
== spike: old 174 new 189 | new places 18, gone 8 | m2 new-only 41
   K11 | 2326, 3004 | 5 m2 | worst 1.36 | -
   K10 | 2324, 2917 | 2 m2 | worst 0.97 | -
   F4 | -331, -280 | 3 m2 | worst 0.58 | -
   D9 | -1353, 2270 | 3 m2 | worst 0.54 | -
   F10 | -25, 2681 | 2 m2 | worst 0.63 | -
   N5 | 3643, 191 | 2 m2 | worst 0.58 | -
   H8 | 553, 1732 | 2 m2 | worst 0.57 | -
   D8 | -1356, 1801 | 2 m2 | worst 0.56 | Avenue du Silence 59
   H8 | 559, 1708 | 2 m2 | worst 0.56 | -
   F4 | -169, -88 | 2 m2 | worst 0.55 | Avenue Paul Stroobant 44
== bareBank: old 555 new 609 | new places 64, gone 16 | m2 new-only 106
   F6 | -165.6, 675.8 | 13.5 m2 | worst 2.43 | Chaussée de Saint-Job 349
   D4 | -1163.1, -58 | 8.5 m2 | worst 3.8 | Avenue Joseph Jongen 44
   K6 | 2061.4, 671 | 3 m2 | worst 2.88 | Avenue du Maréchal 27
   F6 | -160.1, 675 | 2 m2 | worst 3.17 | Chaussée de Saint-Job 353
   F6 | -158.1, 674.6 | 2 m2 | worst 3.06 | Chaussée de Saint-Job 353
   G3 | 296.7, -581 | 2 m2 | worst 2.64 | Avenue De Fré 137
   I7 | 1378.3, 1154.7 | 2.5 m2 | worst 2.03 | Vallon d'Ohain 21
   G3 | 302.5, -581.4 | 2 m2 | worst 2.53 | Avenue De Fré 137
   J4 | 1818.3, -44.7 | 2 m2 | worst 2.32 | Chaussée de Waterloo 1139
   I5 | 1461.2, 121.6 | 1.5 m2 | worst 2.96 | Avenue Hamoir 23
== over: old 252 new 306 | new places 60, gone 6 | m2 new-only 57
   D4 | -1135.2, -0.7 | 8.5 m2 | worst 1.16 | Avenue Adolphe Wansart 2
   D4 | -1412.2, -374.7 | 7.6 m2 | worst 0.35 | Avenue du Vossegat 39
   G10 | 308.8, 2762 | 1.8 m2 | worst 0.53 | Avenue Buysdelle 30
   D4 | -1121.2, -11.5 | 1.3 m2 | worst 0.23 | -
   D4 | -1455, -354.7 | 0.9 m2 | worst 0.24 | Avenue du Vossegat 43
   C9 | -1708.7, 2118.3 | 0.6 m2 | worst 0.39 | Chaussée d'Alsemberg 1437
   M5 | 3298.8, 238.3 | 1.3 m2 | worst 0.14 | Chaussée de La Hulpe 53
   M5 | 3296, 237 | 0.8 m2 | worst 0.18 | Chaussée de La Hulpe 53
   F8 | -183.5, 1881.3 | 0.5 m2 | worst 0.21 | Avenue Jacqueline Harpman 4
   B6 | -2225.2, 505.5 | 1.7 m2 | worst 0.06 | -
```
