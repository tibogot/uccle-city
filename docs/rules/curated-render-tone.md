---
status: provisional
added: 2026-11-23
check: `curatedplaces` (tools/audit/curatedPlacesCheck.mjs, sections M and R)
---
**Rule.** A house the owner names keeps its real colour: a rendered house whose paint the wall palette does not hold (the
styles' white and cream renders) gets a render tone in its look (data/overrides.json buildingLooks: `style` 3 / 4,
`tone` ochre | white | mustard, a `_name` saying what Street View shows, a `set` with its switch), carried in the wall
style's fraction (viewer/buildingTypes.js renderToneStyle) and tinting the render near and far (viewer/facades.js isRT,
viewer/farLook.js). A shop or restaurant on a corner opens on the street of its ADDRESS: an OSM point without
`addr:street` that the façade attach puts on the wrong wall is moved (tools/streetlife/extra_pois.json `_moves`) with
the address tags, so the street-life build picks that street's face.

**Why.** Owner playtest 2026-11-16: "Le Pigeon Noir (entrance on the wrong side, building colours wrong)". The
restaurant (Rue Geleytsbeek 2, at the corner of Avenue de la Chênaie) has its door and navy awning on Rue Geleytsbeek;
OSM's point carries no street, so the build put the front on the nearest wall, the blind Chênaie gable. Its render is a
warm ochre-mustard; the generator gave it a generated wall, and its palette had no such render.
