---
number: 24
check: `roadbends`: tools/audit/roadBends.mjs (0 folded / spike / gap after, no exposed hole added, changed vertices only at bends)
---
**Rule.** A swept road strip never runs backwards: wherever a bend is tighter than the strip's lateral offset (1 + k t < 0 on the inner side, the alignment's radius under the half width) the inner edge is the TRIMMED offset curve (cut at its own crossing, every point of it at its offset from the centre line), never the raw sweep; a fix to road geometry moves only the vertices at the defect (the rest bit-identical, measured), and is measured over all tiles.

**Why.** the engine shrinks the arc at an OSM vertex near a junction mouth to R ~ 0.01-0.3 m (the straight lead eats the leg) and sweeps every strip through it: 4,203 folded triangles (509 m2) at 233 places (225 roads, 74 tiles), 450 m2 of strips lying over themselves, 5,352 edge vertices over the road ("curved roads broken at sharp bends", playtest 2026-11-16); the engine only logged "tight-bend" and surfaces.js dropped the minority-oriented folds (paint broken at the bend, folds that were the majority of a short piece stayed) (claude/curvedroads)
