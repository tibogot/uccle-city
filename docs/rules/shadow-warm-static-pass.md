---
status: provisional
added: 2026-11-25
check: `underpass` (tools/audit/underpassCheck.mjs section 5: the kiosks warm the sun's STATIC shadow pass with same-material stand-ins, one a frame, on a shadow-only layer) + browser row `underpass` (debug/underpassStream.js: 0 frames over 34 ms, no long task, 3 runs)
---
**Rule.** A model that casts into the cached sun shadow as a STATIC caster warms that pass, not only the movers' one:
before its LOD0 can first cast (the underpass: once its tile is in and the camera within 220 m), stand-ins with the
real meshes' geometry and base materials are drawn in the static pass one a frame, at the model's own place, on a layer
only the sun's shadow camera sees (never on screen), not frustum-culled, with the cache marked dirty for that frame. A
stand-in group whose name ends in "-warm" is a mover (viewer/lighting.js isMover) and does NOT warm the static pass.

**Why.** Measured 2026-11-25 (claude/underpass1 round 2, a node-build log over debug/underpassStream.js, quick mode,
YELLOW preflight): warmBridge's stand-ins far under the city ("underpass-calevoet-warm") are drawn in the cached
shadow's movers pass; the kiosks themselves cast in its static full redraw, another render context, so their five
shadow node builds (3.5-7 ms each with the round-2 materials, ~1.3-2.4 ms with round 1's) landed on one frame, the
first static redraw with LOD0 in the light's box near the kiosks: a 50-53 ms frame (a 52-53 ms long task) in 2 of 2
runs, about 1.6 s into the stream-in. With the static-pass warm: 0 frames over 34 ms and no long task in 3 of 3 runs
(worst 33.4 / 16.9 / 16.9 ms). Other landmarks warm the same way (warmBridge / warmShadows) and may carry the same
first-cast cost; not measured here.
