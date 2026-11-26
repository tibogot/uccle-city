---
status: provisional
added: 2026-11-26
check: `villa` (tools/audit/villaCheck.mjs 2i: no `hedge`-slot box in any villa node (the 3 terrace planters' topiary balls excepted, <= 1k tris in Villa_kit); every villa hedge run a city species, width <= 0.99, on the plot and off the terrace; the shrubs on the plot; wired after the clear rings)
---
**Rule.** A landmark's garden uses the CITY's garden kits, never its own boxes: hedges are runs
(`{ points, species, height, width }`) fed to the front-garden hedge modules (viewer/gardens/gardenHedge.js: the
baked clipped-leaf surface, leaf-spray cards inside 24 m, soft lumps, the shadowed foot, 3 dithered LODs, colliders),
shrubs are plant-doc rows for the plant kit (viewer/plants). For the villa: viewer/villa/villaPlot.js
VILLA_HEDGE_RUNS / villaShrubRows, added to tile H9 AFTER the plot's clear ring (the old house's pieces still go).
`?villa3=0` = before (the v2 model with its hedge boxes); VILLA_BOX_HEDGES=1 makes villa.py build the boxes again.

**Why.** The owner (2026-11-26): "the garden was ugly, with the hedges around the villa being like big blocks, not
natural at all". villa.py drew its hedges as stepped boxes with a leaf shader (a second, cheaper hedge technique
next to the city's), so the villa's hedges never matched the street's ones and stayed blocks at every distance.
Reusing the city kit costs no draw of its own (the city's one hedge pool) and keeps one look city-wide.
