---
status: provisional
added: 2026-11-24
check: `parkpieces` (tools/audit/parkPiecesCheck.mjs) + `curatedplaces` (section P)
---
**Rule.** A playground the owner names draws ITS equipment, scripted for it when the kits lack it: the Chênaie garden in
front of Le Pigeon Noir has natural robinia log frames, so it draws the timber kit made for it (models/parkkit/timberkit,
tools/blender/timberPlayKit.py: a log tower with a plank deck, a board roof, a log ladder and a rope net; a log climbing
frame with two rope nets; balance logs on stumps), never the nearest plastic stand-in. A scripted piece carries named
slots (robinia, bark, end grain, hemp rope, boards, galvanised steel), bevels and baked AO, three SCRIPTED LODs (fewer log
sides and rings, plain ends, slabs, the nets as thick ropes then none), the mesh checker's 0 blocking on every level, its
feet on the drawn ground (posts 0.35-0.4 m into it), and its colliders in the kit json (oriented boxes: posts, deck,
rails, logs, the nets' planes) for the walker and the car. Data: data/overrides.json playgrounds.<id> `kit` + `pieces`
(`piecesOld` = what was drawn before, ?parkpieces=old).

**Why.** claude/places2 put the Chênaie playground in the city with the playground kit's closest pieces (a coloured
plastic climbing frame, a swing, a seesaw): Street View shows timber log climbing frames with rope nets and a small timber
tower. A stand-in the eye knows is wrong reads as a mistake, not as a playground. And meshoptimizer's LODs of crooked logs
that cross each other welded them into open, crossing shells (the checker blocked 141 items): for organic timber the
levels are scripted in Blender, and the pack now stops when a level never passes the checker (a failed LOD0 had shifted
every level down a slot silently).
