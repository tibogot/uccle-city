---
status: provisional
added: 2026-11-23
check: `curatedplaces` (tools/audit/curatedPlacesCheck.mjs, sections W and S)
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
