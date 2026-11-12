# Road Checker v0: test (paint v2)

1 tile(s): E4. Generated 2026-11-12T18:15:24.608Z.
Blocking errors (C1 C2 C3 C4 C5 C8 C9): **3227**. Positions are local metres (x east, z south); per-tile findings in `<T>.json`.

| Check | | errors | warnings | review | outside UrbIS (info) |
|---|---|---|---|---|---|
| C1 | zebra on one arm (blocking) | 0 | 16 | 0 | 0 |
| C2 | zebra square and full (blocking) | 0 | 16 | 0 | 0 |
| C3 | stop line before the junction (blocking) | 8 | 17 | 0 | 0 |
| C4 | paint on the carriageway (blocking) | 25 | 4 | 0 | 3 |
| C5 | paint = evidence (blocking) | 0 | 0 | 0 | 3 |
| C6 | lanes on the street | 0 | 44 | 0 | 0 |
| C7 | hold points = painted lines | 0 | 19 | 0 | 0 |
| C8 | curve continuity (blocking) | 39 | 0 | 0 | 0 |
| C9 | no coplanar overlaps (blocking) | 145 | 0 | 0 | 0 |
| C10 | tile seams | 0 | 0 | 0 | 0 |
| C11 | levels | 0 | 0 | 0 | 0 |
| C12 | orthophoto agreement (soft) | 0 | 0 | 17 | 0 |
| C13 | inventory by source | 0 | 0 | 0 | 0 |
| C14 | one crossing per real crossing (no duplicates, photo agrees, not clipped) (blocking) | 0 | 1 | 0 | 0 |
| C15 | paint not across crossings / not doubled (blocking) | 0 | 0 | 0 | 0 |
| C16 | stop line spans its approach, square, no stray dashes (blocking) | 0 | 6 | 0 | 0 |
| C17 | no sliver triangles | 0 | 4838 | 0 | 0 |
| C18 | no cracks (T-junctions, open steps) (blocking) | 2514 | 4028 | 0 | 0 |
| C19 | kerbs: no notches, no gaps (blocking) | 49 | 0 | 0 | 0 |
| C20 | paving uv continuous (blocking) | 9 | 0 | 0 | 0 |
| C21 | shading: no normal jumps, no per-piece tone seams (blocking) | 58 | 0 | 0 | 0 |
| C22 | lane graph: smooth, centred, clear of kerbs, no crossings (blocking) | 380 | 478 | 0 | 0 |

C10: 0 roads cross a tile seam; 0 have different lane data in their two tiles.

Inventory (C13): `{"crossings":{"bm":44,"topo":5,"osm":5},"stops":{"topo":10,"osm":11,"bm":5},"ringGiveway":4,"laneMarks":{"lane":14,"center":11,"parking":10,"parkingTick":224,"leftEdge":6,"solidThin":2,"bike":2,"edge":1},"symbols":104,"measuredCrossingsInTile":{"bm":49,"topo":5,"osm":15}}`

| Tile | C1 | C2 | C3 | C4 | C5 | C6 | C7 | C8 | C9 | C10 | C11 | C12 | C13 | C14 | C15 | C16 | C17 | C18 | C19 | C20 | C21 | C22 | lane pts off | roads off street | coplanar pairs | build ms |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| E4 | 0/16 | 0/16 | 8/17 | 25/4 | 0/0 | 0/44 | 0/19 | 39/0 | 145/0 | 0/0 | 0/0 | 0/0 | 0/0 | 0/1 | 0/0 | 0/6 | 0/4838 | 2514/4028 | 49/0 | 9/0 | 58/0 | 380/478 | 1817/14380 (12.6%) | 35 | 1519 | 5260 |

Cells are errors/warnings.
