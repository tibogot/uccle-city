---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs: no kept tree crown within 0.5 m of the house / the terrace)
---
**Rule.** A tree the city keeps near a scripted building never reaches into it: a tree is cleared when its trunk stands
where the building is built OR when its crown disc (the tree's `crown` radius, 3 m when the data has none) comes within
0.5 m of the building's footprint (for the villa: the house with its overhangs and entrance, the terrace and pergola,
viewer/villa/villaPlot.js CROWN_UW); a trunk-only test is not enough.

**Why.** The villa's first round cleared the trees by trunk position only (BUILT_RINGS): a 9.5 m tree 2.7 m north of the
living wing kept its 2.5 m crown, and its leaves hung inside the double-height living room and through the north wall
(the coordinator's review of after_day_living.jpg, 2026-11-22).
