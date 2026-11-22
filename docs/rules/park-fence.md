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

**Why.** The owner's TODO step 3 (2026-11-22): Wolvendael has big metal fences all round with several big gates (one at
the Dieweg tram terminus), the Sauvagère is fenced all round with a few gates; the city drew both parks open to the
streets, so a car or a walker crossed straight in anywhere. The OSM polygons alone lie on the kerb or the roadway in
places (a fence on them stood in the street) and their gates carry no style, so the data and the reality check are both
needed; a scripted model left on a chord over a bank floats or buries itself (the joins rule).
