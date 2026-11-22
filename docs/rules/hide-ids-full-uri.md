---
status: provisional
added: 2026-11-22
check: `villa` (tools/audit/villaCheck.mjs: the villa's hide lists match a solid of tile H9)
---
**Rule.** A scripted model's placement lists the UrbIS solids and buildings it replaces (hides_solids / hides_bu_ids) as the
FULL UrbIS URIs the tiles carry (https://databrussels.be/id/buildingsolid/<n>, .../building/<n>), and every id matches a
solid of the tile the model stands on; a list that matches nothing is an error, never a silent no-op.

**Why.** The villa's first placement gave the bare numbers (543176, 1588559): tileData.js hideBuildings compares the ids
as given, nothing matched, and the old house's hip roof and chimneys stood through the middle of the villa's flat roof
(first browser look, 2026-11-22). Nothing checked that a hide list hid anything.
