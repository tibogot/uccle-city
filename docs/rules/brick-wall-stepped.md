---
status: provisional
added: 2026-11-24
check: `parkfence` (tools/audit/parkFenceCheck.mjs: the papenkasteel brick wall rows, the brick wall piece's budget)
---
**Rule.** An old brick garden wall is drawn as a BRICK WALL, not as a stretched plinth: its own scripted piece
(tools/blender/parkFenceKit.py pf_brick: Flemish bond with 8 mm proud bricks over recessed lime mortar, a stepped coping of
oversailing creasing tiles under saddleback stones, slots brick / mortar / coping, a tone per brick in COLOR_0.g, bevels,
weighted normals, baked AO, three LODs), set LEVEL and stepped down the street as walls are built (its courses never
shear): modules grouped while the ground under them spans <= 0.35 m, each group's top on a whole course (65 mm,
world-quantised: two groups' courses line up), its brick skirt 1.0 m under its foot (the low end never floats: the joins
rule), the step's exposed end finished in bricks and coping. Far away brick and mortar shade toward their mean (8-16 m)
so the joints never shimmer and the plain LOD1 (from 18 m) takes over unseen. ?parkpieces=old: the plinth as before.

**Why.** claude/places2 drew the Papenkasteel's old wall on Rue Kinsendael (Street View: dark red-brown brick, ~2.3 m,
its top stepped down the street, a tile / brick coping) with the park-fence plinth piece stretched from 0.8 to 2.3 m in a
brick tone: a smooth sheared slab, its dressed-stone blocks 2.9 times too tall, its top sloping with the 8 % street. The
gate checked only that >= 40 m of >= 2 m brick-toned plinth existed.
