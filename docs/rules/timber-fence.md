---
status: provisional
added: 2026-11-26
check: `timberfence` (tools/audit/timberFenceCheck.mjs: D placed per the data, B out of buildings, G joined to the ground, I the instancing)
---
**Rule.** An OSM wooden fence (barrier=fence with fence_type wood / split_rail / post_and_rail / pole / rail, or
material=wood) is drawn as what it is: a timber post-and-rail fence (tools/fences/build_timber.py -> data/fences/
timber.json; viewer/fences/timberFence.js): posts every <= 2.4 m with a 0.45 m footing in the drawn ground (welded, never a
floating foot), two rails following the ground's slope, one shared material and box geometry for the city, two instanced
meshes a tile (static buffers), faded out by hashed alpha at 110-160 m (no pop, no crawl), colliders as a hero root per
tile. A picket fence (paling) is not this piece.

**Why.** Reality round 2026-11-26 class C4: station and park edges in Uccle have low wooden post-and-rail fences
(Calevoet, Rue Egide Van Ophem), the garden kit had no wooden piece, and OSM's wooden fences became hedges (the garden
builder's osm_style) or nothing. Left: the Calevoet station edge itself is not mapped as a fence in OSM (an obs entry
needs a Street View check of its line); `landuse` edges are not fenced by rule (too many false fences).
