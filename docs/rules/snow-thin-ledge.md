---
status: provisional
added: 2026-11-28
check: `snowedge` (tools/audit/snowEdgeCheck.mjs: ledge), browser row `snowedge` (debug/snowEdge.js audit: narrow)
---
**Rule.** The volumetric snow layer carries no strip on a narrow RAISED ledge: a kept patch whose cells all lie within
2.25 cells (~0.3 m) of the cut and whose rim drops more than 0.3 m (garden copings, shop fascias, sills, parapets) is
cut in the overhead shape pass (narrowCut); its own cap (snowCaps.js) or the material cover carries the snow. A 2 m
platform keeps its layer. `?snowsdf=old` = before.

**Why.** Thin white zigzags on wall copings and along shop fascias (2026-11-27): a 30-45 cm coping is 2-3 overhead
cells, its rim cells were cut, and the 1-cell strip left on top was drawn on 12.5 / 25 cm triangles, so on any wall not
parallel to the grid it zigzagged, on top of the coping's own rounded cap.
