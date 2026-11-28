---
status: provisional
added: 2026-11-28
check: `snowedge` (tools/audit/snowEdgeCheck.mjs: sources), browser row `snowedge` (debug/snowEdge.js audit: undrawn, props)
---
**Rule.** The weather's overhead bake takes as ground (SOLID / ROAD / CAR layers) only meshes the city camera DRAWS
(their own layers against camera.layers): a proxy drawn by another pass only (a mirror's reflection copies, a shadow or
collision stand-in) is never ground and never canopy. Street furniture and props under any container name (the physics
props' proxies props-*, the lamps' baskets and brackets lamp-extras, bollards, tram / rail / embassy poles,
traffic-light posts, billboards) are SHELTER (canopy pass), as rule joins2 furniture; a new furniture family joins
FURN_RE in viewer/weather/cityWeather.js. `?wxdrawn=old`, `?wxprops=old` = before.

**Why.** The police yard's young trees wore white snow domes and stood in bare dark rings (2026-11-27): the Wolvendael
pond's reflection trees (179 crowns + trunks on layer 9, drawn by the mirror alone) were visible meshes, so the bake
took their crowns as the topmost surface: the layer lay on invisible crowns and the ground under them read "under an
eave". And since claude/props the furniture is drawn as props-furniture2:* / props-streetkit:* proxies, which the
joins2 furniture list (FURN_RE) no longer matched; with the lamp extras they were baked solid again: a dark hole under
every hanging basket on Place Saint-Job.
