---
status: provisional
added: 2026-11-26
check: `lampextras` (tools/audit/lampExtrasCheck.mjs W wall lanterns on their front's wall, under the eaves, spaced; B baskets near shopfronts; V no light, the lamp's shared materials, static, wired)
---
**Rule.** The shop streets carry their street furniture of light: where the street life draws shopfronts
(data/streetlife/<T>.json pois[].face), viewer/streets/lampExtrasPlace.js puts a green swan-neck wall lantern on one
front in two (at its party-wall edge, 4.5 m over the sidewalk: over the fascia and the projecting blade, >= 1.2 m
under the eaves; >= 6 m apart, none within 5 m of a lamp post), a red-flower basket on one lamp post in two within
14 m of a shopfront, and paints the tram poles with >= 2 shopfronts within 22 m the lamp green with a lantern toward
the sidewalk. viewer/lampExtras.js draws them procedurally with the Brussels lamp's own shared iron + glass materials
(the glass glows at night with the lamps) and one shared flower material: <= 3 static merged meshes a tile. NO light
is added (rule fixed-light-count): their heads paint the lamp light map. A residential street keeps its plain lamps.
`?lampextras=0`: none.

**Why.** Reality round 2026-11-26 class C7: Street View (look only) on Parvis Saint-Pierre, Chaussee d'Alsemberg,
Saint-Job and Rue Xavier de Bue showed green bracket lanterns on the shop facades, hanging flower baskets on the posts
and decorated green catenary poles carrying lanterns; ours had bare posts and steel-grey poles on every street alike.
Double-headed lantern posts are left for a Blender variant of the lamp (they need the model's own second arm).
