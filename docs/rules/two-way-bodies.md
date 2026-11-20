---
number: 37
status: provisional
check: `carhit`: tools/carHitTest.mjs (head-on, T-bone, rear-corner nudge spins / centred push does not, 5 km/h tap, van vs small car, a car slid / pushed into a wall never inside it, momentum to 1e-3, 500 random hits no NaN + settle, solver cost, no allocation in the step); browser: docs/CARHIT.md "Browser checks"
---
**Rule.** Anything the player can hit that is drawn as a movable body (a car of the traffic, a parked car) is a two-way body: the contact is solved with BOTH masses and yaw inertias at the contact point (impulse with a speed-dependent restitution + Coulomb friction), the hit body leaves any scripted path while it slides, collides with the same drive colliders the player does (never pushed into or through one), settles, and only then goes back to its script (or stays put); the player's vehicle takes the reaction. The solver runs only for bodies that were touched (fixed pool, asleep when settled), allocates nothing per step, and decodes any packed per-instance code (damage) in the vertex stage.

**Why.** owner 2026-11-18: "we need collision with the cars, being able to push them": the traffic cars were one-way obstacles (the player's car pushed out of their boxes as out of a wall: a 1.3 t car stopped dead by another at 60 km/h, the hit car never moved), parked cars shoved by a clamped nudge (1 m, 20 deg at most, through whatever stood behind). Nothing tested car-car contact: the car control checks only had walls and trams
