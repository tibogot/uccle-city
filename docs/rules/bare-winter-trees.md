---
status: provisional
added: 2026-11-26
check: `winter` (tools/audit/winterCheck.mjs "trees:" rows)
---
**Rule.** In the winter season (rule season-from-date) the city's broadleaf trees are BARE, drawn the cheapest correct
way: the same leaf cards, views, draws and triangles, with a mask of fine twig sprays (branching, thinning, buds) in a
grey-brown (the summer colours x `WINTER_F`, so the light through and the fill turn with them), the limbs and
sub-branches being the bark mesh under them. The pool's depth pass (what the EQUAL colour pass draws) and the sun's
shadow keep only the twigs (the mask's .g) for the trees and the deciduous shrubs (hydrangea, rose); the evergreen
shrubs (box, laurel, rhododendron, lavender) keep their leaves and their summer green (tint / `WINTER_F`). The far
impostors (the kit, the old bake) are baked from the twig mask: no leafy far crowns behind bare near ones, the same
LOD chain and morph (no new pop). The city has no species data (UrbIS CHM trees: one broadleaf form), so every tree
is treated as deciduous: most of Uccle's street and park trees are. `?baretrees=0` / `?season=summer`: the leafy trees.

**Why.** The owner chose the winter look for Christmas (2026-11-26): in December the plane trees, limes, oaks,
beeches, chestnuts and maples of Uccle are bare; the green crowns hid the Saint-Job fir from 60 m and read as July.
Twig cards instead of hidden cards: hiding the leaves left dead sticks (the bark mesh has no twigs), new branch
geometry or a Blender bake would cost draws, triangles and a new impostor chain.
