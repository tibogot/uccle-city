---
status: provisional
added: 2026-11-23
check: `parkfence` (tools/audit/parkFenceCheck.mjs)
---
**Rule.** A park that is fenced in the real city is fenced in ours, all round, from data: the line is the OSM park
polygon (moved into the park, at most 4 m, where the polygon lies on the drawn carriageway), it opens exactly at the
entrances (every OSM path through the polygon, every OSM gate node, each with its observed gate open or closed), and
what stands on it is written down per park from a look-only Street View check (data/parkfence/<park>.obs.json: fence
type per stretch, wall / hedge stretches, gates). No panel, plinth, pier, post or closed leaf stands on a public
carriageway, in a building or across an OSM path; a building on the line closes it by its own wall (a listed gap). Every
piece meets the DRAWN ground (main.js gardenGround): a bare panel's foot neither floats more than 0.15 m nor is buried
more than 0.10 m (fitted per panel, split where the ground bends), plinths and piers carry a skirt into the ground, and
the far bars are drawn as their coverage (thin-bar cards, rule 35), never as sub-pixel geometry. The colliders are made
from the same placement as the drawing (one source). A fixed handful of instanced meshes draws every park.
Round 2 (2026-11-23): the far card carries the bars' / wires' TRUE coverage (its box mips' mean equals the modelled
panel's analytic share within 30 % at 30 / 60 / 120 m) and thickens at grazing angles (1 - (1 - a)^(1 / cos)), so a far
mesh reads as a veil; the line stops round every tree-field trunk (0 trunks within 0.3 m of a panel, a post either side)
and no trunk stands in an open entrance's opening (moved past the pier); no tram pole stands in an entrance's approach
(slid along its track); a shot whose camera stands inside a building is flagged (debug/quick.js), not read as a defect.

**Why.** The owner's TODO step 3 (2026-11-22): Wolvendael has big metal fences all round with several big gates (one at
the Dieweg tram terminus), the Sauvagère is fenced all round with a few gates; the city drew both parks open to the
streets, so a car or a walker crossed straight in anywhere. The OSM polygons alone lie on the kerb or the roadway in
places (a fence on them stood in the street) and their gates carry no style, so the data and the reality check are both
needed; a scripted model left on a chord over a bank floats or buries itself (the joins rule). Round 2 (coordinator
review): the 6-12 % share of a 5 mm mesh blended on dark grass vanished past ~25 m (only the posts showed); measured
canopy-model trunks stood through the mesh and in the playground gate; a tram pole stood in the walk 6 m in front of the
Avenue Wolvendael gate; "floating doors and windows" at the Sauvagère were a shot taken from inside a building (walls
draw front faces only, the openings kit is double-sided).
