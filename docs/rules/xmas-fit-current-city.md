---
status: provisional
added: 2026-11-23
check: `xmas` (tools/audit/xmasCheck.mjs "site fit" rows: tools/christmas/siteFit.mjs)
---
**Rule.** A baked seasonal placement (models/christmas/site.json) fits the CURRENT city, and its generator
(tools/christmas/build_site.py) is the only way to fix it. The set of decorated shopfronts is what the build's own
selection (stored in site.json `select`) gives on the current street life, every front unmoved and on its building's
drawn wall; every shopfront swag takes its width and centre from the front the shop kit DRAWS, through ONE helper
(viewer/shops/shopLayout.js `frontFace` / `frontWidth`, used by viewer/streetlife/layout.js, `layoutShop` and
viewer/christmas/xmasSwag.js `swagRun`), so a curated wide or moved front (front.w / front.du: the Carrefour's 18 m) gets
a swag of its width where its glazing is (under a curated canopy: along the canopy's band); door wreaths only on current
address points of drawn house walls, >= 3 m from every shop front; street garlands only between drawn walls at their
hook height. Nothing hangs on a building the city does not draw (the UrbIS solids a scripted model hides:
`placement.hides_bu_ids` / `hides_solids`) or a wreath on a retail box (`shed: true`); firs and chalets stand >= 1 m clear
of the street lamps and the park fences. A data change under the layer (street life, tiles, a new hero, a curated front)
means a site.json rebuild, and the gate says so.

**Why.** site.json was baked on 17-20 Nov and never rebuilt (job 0 of docs/CHRISTMAS_PLAN_2026.md, 2026-11-23): since
then claude/places1 added the Agam night shop and Brico as street-life shops (both missing from the swags, and a door
wreath hung on No. 701, now the night shop's front), and 4 garlands across the Parvis Saint-Pierre were hooked on the
UrbIS church solid that the Saint-Pierre model hides (the hide lists were never read by the generator). The swag width
was computed in xmasCity.js from site.json's own slot (capped 6.5 m) while claude/carrefour taught the shop kit a
curated width and shift: two copies of one rule drifted, and the Carrefour's 18 m front would have had a 6.5 m swag
11.8 m off its glazing. Nothing checked the baked data against the data it came from.

**Extended (claude/xmasreview, 2026-11-26).** Every market chalet's footprint (roof overhang + propped shutter) stands
>= 0.5 m clear of the drawn street furniture (tools/christmas/siteFit.mjs `streetFurniture`: street-name plate posts,
sign poles, postboxes, stops, Villo pieces, bins, hoops, benches, bike parkings; build_site.py `street_furniture` mirrors
it), each fir's crown (2.95 m x scale) is clear of it, and the customers' strip (1.5 m) in front of each hatch is clear of
the fir's crown + 0.3 m. Each fir stands on the LOWEST drawn ground under its planter (viewer/christmas/xmasCity.js
`treeFootY`: the octagon's rim at 1.4 m x scale and the centre; rule joins: sunk, never floating).
**Why.** The game review found a chalet's roof pierced by the Place de Saint-Job street-name post (1117.7, 538.3): the
generator knew trees, walls, shops and the fir, not the street furniture; two hatches opened 1.3 m from the fir's lowest
branches (the clearance was measured to the planter, not to the crown); and the Saint-Job planter floated 1.7 cm on its
downhill side (the fir was set on the ground at its centre only). Checks: gate row `xmas` "street furniture" (site fit;
the pre-review site.json fails it) and row `xmastest` "fir foot".

