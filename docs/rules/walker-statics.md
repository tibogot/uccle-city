---
status: provisional
added: 2026-11-26
check: `winter` (tools/audit/winterCheck.mjs "walker:" rows)
---
**Rule.** A layer that places solid things after the tiles (the Christmas firs and market chalets) registers them with
the walker's collision world as it does with the car's: `window.__walkerStatics.push({ id, polys, circles, tag, ray })`,
taken by viewer/character/cityHook.js at once and on every sync (the order of the layer and the collision world does not
matter). A fir: its planter (an octagon, body and camera) and its crown (a body-only circle, 2.4 m x scale, to 3 m up);
a chalet: its footprint (body and camera).

**Why.** The game review (2026-11-26): the walker walked into the fir (the planter collided for the car only), and from
inside the crown the 4 cm LED beads read as big flat hexagons. The walker's colliders were gathered per tile from the
tile's own groups only: nothing placed later could join them.
