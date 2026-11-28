---
status: provisional
added: 2026-11-28
check: `zfight` (tools/audit/census/zfight.mjs `details`: the pairs inside the detail mesh on the 8 gate tiles <= 335, all pairs <= 440 / 36 m2; `BUILD_OVER='{"stripFit":false}'` = ?stripfit=old fails; `--all` city-wide)
---
**Rule.** A detail strip (cornice, band, eaves board, gutter, parapet, coping; viewer/facadeGeom.js emitStrips) is square
to its OWN edge, never to its face's mean normal: collinear pieces of one strip then lie in one plane and merge (planes
within 3 cm); pieces whose heights differ by up to 6 cm merge too where their spans OVERLAP (one cornice given twice by
two UrbIS faces), take the longest piece's height, and the longest pieces seed the clusters (no order-dependent split);
pieces that only touch keep their own heights (a terrace stepping down a street). Two strips FACING each other whose plan
bands cross at overlapping heights (walls a few cm apart across a slot, the two sides of a thin notch in a flat roof) keep
only the runs where the other's band does not cover theirs. One ridge line draws one beam: collinear overlapping ridge
edges become their union. `?stripfit=old`: as before.

**Why.** Reality round 2026-11-26 (docs/TODO.md item 6): flickering fronts at Rue Xavier De Bue 72B, Rue de Stalle 73
and Chaussée d'Alsemberg 739, census G `details+details` pairs. Not the façade kit's opening pieces: (1) a face's normal
is the mean of its triangles, its top edges ran 1-2 deg off it (a sliver triangle at the eaves, a near-straight run of an
18-corner footprint): a 2.5 m piece drifted 4 cm out of its plane, the merge left three overlapping copies of one
cornice (72B, tops coplanar); the same cornice's faces 2-5 cm apart in height fell in different 1 cm height keys; (2) the
dormer wings of 72B stand 15 cm apart, each 34 cm cornice ran through the other wing's; Stalle 73's flat roof has a V
notch, its two parapets' copings overlapped near the apex (1.9 m2); (3) Alsemberg 739's overlapping roof fans gave one
ridge as two collinear edges (8.0 m and 6.4 m from one corner): two beams in one place. Gate tiles 674 pairs / 70 m2 ->
422 / 33 m2; city-wide 4,903 / 597 m2 -> 3,094 / 278 m2, buildings with >= 1 m2 109 -> 42. Left: Ch. d'Alsemberg
1033A, Rue Gabrielle 48, Rue Baron Guillaume Van Hamme 56 (the next worst, not looked at).
