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
60-100 ms a tile (worker only). Tuning (I6 H6 F2) is in the code comment: a weaker penalty follows the samples closer but
leaves more saw-tooth; a robust (Huber) fit and taking the sidewalks' cross-fall out of the fit were tried and dropped.

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
| places (built surfaces) | 1,191 | 267 | -78 % |
| metres | 34,417 | 6,017 | -83 % |
| sidewalk | 523 | 51 | -90 % |
| road (carriageway, gutter) | 530 | 80 | -85 % |
| square / other / tram | 9 | 6 | |
| built terrain (`ground`) | 129 | 130 | another cause, below |
| bare DTM micro-relief (`dtm`, not counted) | 759 | 762 | measured ground |

The Saint-Job streets (Montagne de Saint-Job, Chaussée de Saint-Job, Rue Jean Benaets, Av. Latérale / Rue de l'Equateur
along the tram climbing west of the place, H5 / H6 / I5 / I6): 21 places before, 2 after (H6 Rue Jean Benaets 79: a flat
road meeting a 24 % side street inside one 6 m cell; I6 Chemin Avijl 32). Rue du Ham (the tram north-east past the church)
showed no place before or after at 2.5 cm (its wobble was <= 2 cm).

Worst before: F6 Rue du Repos 141 road 117 m, cycle 6.7 m, 23.8 cm; B4 sidewalk -2243, -456 20 cm; G3 road 15.7, -936 17 cm;
F5 Rue du Repos 113; G2 Av. Adolphe Dupuich 32; D6 Rue François Vervloet 16. After: Rue du Repos 8.2 cm (was 23.8), B4
8.7, Dupuich 6.3, Vervloet 7.4.

### What is left

- **sidewalk / road 131**: places where the 6 m piecewise-planar field cannot follow a crease inside one cell (a junction
  with a steep side street, a sidewalk folding onto a ramp or a forecourt): the fit compromises and the compromise changes
  along the street. A finer cell (3 m) or a separate raised-surface field would take them; both change every street
  triangle (cost) and are left for a round 2.
- **built terrain 130**: the drawn terrain over a path (the census walks paths on the drawn ground): rail-corridor cuts
  (H6 Rue de la Pêcherie, where the DTM itself alternates +-15 cm a metre and the rail carve lowers it), the terrain over
  park paths. Not this cause (same count both ways); ground.mjs (`over`) covers part of it.
- **dtm 762**: the LiDAR DTM's own 3 - 6 cm relief along lawns and unpaved paths: measured, kept.

## Side effects checked

- kerb heights (H6, every kerb: p5 / p50 / p95 of the drawn raised top 0.3 m in minus the road top 0.3 m out): closer to
  13 cm and narrower (old p95 up to 22.9 cm -> 16.5).
- |H - street ground| over the street samples (I6 H6 F2): p50 2.4 -> 2.6 cm, p99 17.1 -> 19.7 cm.
- tile seams (drawn street either side, same part): H6 | I6 p50 / p90 1.1 / 2.6 -> 1.6 / 4.2 cm; I6 | I7 3.2 / 20.2 -> 1.8
  / 12.0 cm (the per-corner fits differed on both sides too; the seam steps are an older, separate problem).
- the gate rows over the drawn street (ground, moverground, markings, streetlanes, ...): see the merge gate run.

Shots (grazing, before = ?sawtooth=old): C:\Users\tibog\Downloads\uccle-sawtooth\ (compare.html). Raw results:
docs/sawtooth/sawtooth_old.json / sawtooth_new.json, maps map_old.svg / map_new.svg.
