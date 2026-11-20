---
number: 28
check: `balconies`: tools/audit/census/balconies.mjs (6 tiles, 0 open ends; `--all` city-wide, `--old` = ?balcony=old)
---
**Rule.** A balcony, terrace or any edge a person can stand on is closed on EVERY open side (front and both ends) up to guard height, by a parapet / railing of the front's own material, height and thickness or by a wall; the pieces are one shell (mitred corners, no doubled, hidden or coplanar faces, no T-junction); balconies that touch side by side share ONE divider; a balcony is cut back where it would run into another balcony (inside corners), its own building's other walls or a taller neighbour, never merely because a roof is over it (a loggia under an overhanging storey) or under it (a terrace). Checked city-wide from the drawn geometry, never from the generator's own counters.

**Why.** the apartment blocks' balconies (viewer/facadeGeom.js typeDetails) were a slab + a front parapet only, by design: 20,061 of 20,663 slabs open at the sides in 1,162 buildings, "people could fall from their terrace" (owner playtest 2026-11-18, image 84, Ch. d'Alsemberg); the detail generator had no notion of a balcony's ends and nothing counted them, while the façade kit's Blender balconies were closed (claude/balcony)
