---
status: provisional
added: 2026-11-20
check: `hedgewall` (tools/collide/hedgeWallTest.mjs)
---
**Rule.** A dense clipped garden hedge drawn taller than HEDGE_WALL_H (1.18 m: the data's 1.2 m hedges and up) is a wall
for the car and the two-wheelers (KIND.hedgeWall, given by the stand-in's drawn height in driveMode.js
featureColliders, never by its sheared box): a car at 30 km/h stops at most 0.2 m inside it, with a softer bounce than a
brick wall (HEDGE_BOUNCE) and a shake of the hedge round the hit from a fixed uniform pool (viewer/gardens/hedgeShake.js,
no DynamicDrawUsage, no material rebuild); a lower hedge stays soft (pushed through, slowed). The node audits (gardenPieces,
the HARD sets) count a tall hedge as hard too. `?hedgewall=old` = all soft.

**Why.** The front hedges were soft for the car by design (2026-11-14), so a car drove through a 1.6 m privet wall as
through a low border, which reads wrong; the owner decided (2026-11-20, TODO "HEDGES SOLID") that tall hedges stop the
car like a wall, softly.
