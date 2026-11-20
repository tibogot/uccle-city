---
number: 25
status: provisional
check: `colliders`: tools/audit/colliderAudit.mjs (gate: 4 tiles; `--all` city-wide ~6 min) + browser debug/drawnAudit.js
---
**Rule.** Every collider stands for something drawn and every drawn solid at car height a car can reach has one: a collider is traced from the geometry AS DRAWN (after every step that moves it: the walls' feet sunk onto the ground), never from an earlier copy; nothing hard stands in a driven lane or a gate mouth the game needs; a building collider stays within 0.3 m of its drawn wall. Checked city-wide offline against the final drawn walls mesh, never against the source the collider was made from; a "lane" a collider blocks is looked at in the browser before anything is removed (the lane data can be the wrong one).

**Why.** the building colliders were traced from the UrbIS solids before sinkFeet lowered their walls up to 2.8 m onto sloping ground: the car drove 13.7 m into a drawn apartment block (D4); the first fix for 62 garden pieces "in lanes" removed real garden walls along a pedestrian alley the street data calls roadway (Carre Cassimans), caught in the browser and withdrawn to opt-in (claude/collisions)
