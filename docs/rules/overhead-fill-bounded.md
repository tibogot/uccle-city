---
status: provisional
added: 2026-11-28
check: `snowedge` (tools/audit/snowEdgeCheck.mjs: fill), browser row `snowedge` (debug/snowEdge.js audit: flooded, shelterFlood)
---
**Rule.** A raster's hole fill reads a SNAPSHOT of the grid per pass (never the cells it has just filled) and fills only
pinholes (>= 2 present neighbours): a value travels at most 2 cells and a sparse layer (roads, crowns, cars) never grows
by the fill. Every pass of the overhead bake (viewer/weather/overheadShape.js toGrid) obeys it. `?wxfill=old` = before.

**Why.** On the Christmas snow days (2026-11-27, xmascheck) Place Saint-Job's paving showed a polygonal patch of bare
setts at 15 cm of snow, edged in saw-teeth. The bake's fill ran in place in raster order, so a filled cell fed the next
one: every empty stretch of the ROAD pass was flooded right / down with the carriageway's heights up-left of it, and
where the flood came within 5 cm of the paving the salted-road test cut the snow layer there (16 816 of the window's
cells "carriageway" with no road texel, ~260 m2 at Saint-Job). The canopy and car passes flooded the same way (shelter
over open ground). The same class: any "fill holes from the neighbours" loop that writes into the array it reads.
