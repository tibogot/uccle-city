---
status: provisional
added: 2026-11-26
check: `sawtooth`: tools/audit/census/sawtooth.mjs (every kerb both sides, path and road line city-wide at 0.25 m on the drawn ground; `--old` = ?sawtooth=old fails; `--fixture` the synthetic profiles)
---
**Rule.** A walked or driven surface whose real profile is a smooth grade (sidewalk, kerb top, square, island, path,
carriageway, the terrain the builder reshaped beside them) is drawn smooth along its length: no periodic up-down. The
street height field H is ONE fit of the drawn surface to the street's samples (viewer/surfaces.js jointFit: the corners
of the 6 m piecewise-planar field solved together, a second-difference penalty that is zero for any plane), never each
grid corner its own plane extrapolated to it (the tram rails' smooth profile is part of the fit, so the rails lie on
the street; every corner within 0.3 m of its own plane). Walked along any of those lines every 0.25 m, the drawn top shows no chain
of >= 5 regular swings (cycle 0.75-12 m, CV <= 0.4) of >= 2.5 cm against its local +-3 m line, outside real steps
(a > 6 cm jump, a class change, a dropped kerb, a tree pit, a corner). The bare UrbIS DTM's own micro-relief (a lawn, an
unpaved park path the builder did not touch) is reported, not counted. A new builder that sets heights on a grid shows the
census before and after.

**Why.** Owner 2026-11-26: "the street that goes up with the tram around the Saint-Job church: the sidewalk has bumps like
a SAW TOOTH ... that never happens in real life; I'm sure we have this in several places". Each 6 m corner of H was a
least-squares plane through the street samples round IT (viewer/surfaces.js fitCorner), a corner beside the street
extrapolating that plane from one side; along a street crossing the grid at an angle the corners' errors (a few cm,
changing with where the corner falls in the cross-section: road camber, the levelled sidewalk, a bank) alternate, and the
drawn surface, linear in each half-cell, bends at every crease. Montagne de Saint-Job 42 (I6, 0.5 m behind the kerb):
slopes 3.4 / 1.2 / 5.0 / 1.7 / 5.4 % in turn on a 3.2 % sidewalk, every kink on a 6 m grid line or split diagonal;
city-wide 1,191 saw-tooth places / 34.4 km before, 330 / 7.9 km after (sidewalk 523 -> 76, road 530 -> 120; moverground tram 1,414 -> 259), median cycle 7.0 m = the 6 m cell across the street angle (docs/sawtooth/README.md, claude/sawtooth).
