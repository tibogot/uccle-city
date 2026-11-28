---
status: provisional
added: 2026-11-23
check: `curatedplaces` (tools/audit/curatedPlacesCheck.mjs, sections W and S; S walks every look with `store`)
---
**Rule.** A shop the owner names that is not a house (a supermarket's single-storey retail box) is curated as what it is:
its building gets a look with `shed: true` (data/overrides.json buildingLooks, with a `_name` saying what Street View shows
and a `set` with its switch): every outer face is a plain clad wall (viewer/facadeGeom.js SHED_PARTY: no painted house
windows, door, dress, cornice, balconies or lit windows, and no party-wall ghost; a thin metal coping), near and far
(viewer/farLookData.js). Its glazing is the shop kit's front, curated wider than the street fronts' 9.9 m (data/shops/
terraces.json front.w, moved along the wall by front.du) under a curated canopy (front.canopy), the name and lines as
plaques; both ends of the front and of the canopy stay on the building's own wall. Its car park is a hard ground with its
bay rows (rule curated-place-placed).

**Why.** Owner 2026-11-23: "the Carrefour Market near the police station does not look like what we have". The store
(Av. Wolvendael 2 / Square Georges Marlow 10, UrbIS solid 529267) is a 7.7 m flat-roofed box in greige panels with a long
glazed front under a deep canopy facing its car park; the generator, which only knows houses, classified the box as a
block and painted two storeys of house windows in yellow brick with a red front door, a 6.5 m shopfront slot with no
sign, and a lawn where the car park is.

**Second store (claude/carrefour2, owner 2026-11-24: "same design as Carrefour Market Marlow").** The Carrefour Market
Rue Gatti de Gamond 60 (UrbIS solid 558122, OSM shop node 13192287981) is the same kit with no new code: its look
(set carrefour, shed), its curated front, its lot `carrefour_gatti_lot`. Every curated store is now a data entry: the
shed look carries `store: { front, sign, lot, bays }`, and the check walks every such entry (the front says its sign,
is a glazed run under a canopy on THIS building, the lot is on the look's switch with that many bay rows, every bay
inside the lot's ring). Its lot also records a wrong OSM tag (`osmWrong`: node 9627537495 `parking=underground`, owner:
the Carrefour's car park is at ground level).
Two small data fields came with it: `front.canopy.du` moves the canopy along the wall from the glazing's centre (Gatti
de Gamond's canopy covers the whole 35 m hall, its glazing only the west 19 m, where the wall is straight), and a
plaque's `dz` moves it out from the wall (the red line runs onto the hall's east part, which stands 0.4 m forward). A
canopy must not have LiDAR "trees" under it: the canopy model's peaks along a canopy edge or its planters become small
trees whose crowns go through the slab; the lot's `chmClear` rings drop them (viewer/main.js groundTreesClear, near and
far), and the check fails on any urbis-chm tree taller than the canopy's underside standing under a store's canopy.
