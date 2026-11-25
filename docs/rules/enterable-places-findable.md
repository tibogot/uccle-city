---
status: provisional
added: 2026-11-24
check: `enterable` (tools/audit/enterableCheck.mjs), browser row `enterable`
---
**Rule.** Every place of the city you can walk into (a streamed interior on by default) is listed once in
data/places/enterable.json with its door, ONE entry spot outside it (outside every building footprint, on a street surface
or a forecourt off one, facing the door) and a map mark, and from that one row it is findable and reachable: a
viewer/places.js entry (enter: id), a marker with the "go inside" door glyph on the minimap and the full map (and in the
map's search, which takes you in), a "Walk in" prompt near its door that puts the character at the entry spot, and a share
link `?place=<id>` (third person at the entry). A link with `?at=x,z&view=third` starts the character AT x, z, on the tile
under it, never on the boot tile's nearest road.

**Why.** 2026-11-24: the villa on Avenue du Prince d'Orange had a full interior (docs/VILLA.md), but the owner could not
find it: no place, no map mark, no way in from the map. His own link `?at=912,2036&view=third` put the character at
Saint-Job: with no ?tile the boot tile was always I6, the start point was the nearest road of THE BOOT TILE (clipped to its
bounds) and third person started there, 1.5 km from ?at.
