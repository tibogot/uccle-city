---
status: provisional
added: 2026-11-28
check: `snowedge` (tools/audit/snowEdgeCheck.mjs: stairs, kerbs, foot)
---
**Rule.** The snow layer's edge is never drawn along its mesh's triangles. Its static cut (drop edges, car tops, salted
carriageways, no surface) is a signed distance per overhead cell (exact EDT, blurred ~1.4 cells; a thin cut of 1-2 cells
keeps its sign so a kerb never closes), read per PIXEL with one filtered fetch and cut at 0. A wall's foot (a step up of
more than 0.3 m) is not cut: the snow runs on into the wall at full depth. A statically cut vertex next to much lower kept
snow sits at that snow's height (flat triangles, the pixel cut draws the edge). Taper / drift distances are exact, not
chamfer. The edge round a patch stays within 2.5 cm of its own 1 m running mean at every angle (the stair-step
detector). `?snowsdf=old` = before.

**Why.** The edge round Place Saint-Job's paving patch came out in ~25 cm saw-teeth (2026-11-27): the hide flag was
interpolated over the layer's triangles (12.5 cm inner chunks, 25 cm outer chunks since perf pass 2), so every diagonal
or curved cut drew the grid. The same raster drew the teeth where the snow meets every facade (the police yard): the
foot cell was cut and the triangles to the roof edge stood up as slivers and were dropped whole; the drift's chamfer
distance alternated 1 / 1.41 cells along a diagonal wall (scallops). Rule no-saw-tooth-terrain for the snow.
