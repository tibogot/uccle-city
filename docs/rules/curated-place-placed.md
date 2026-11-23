---
status: provisional
added: 2026-11-23
check: `curatedplaces` (tools/audit/curatedPlacesCheck.mjs)
---
**Rule.** A place the owner names that the open data lacks (a shop OSM does not map, a car park the land cover draws as
lawn) is written into the data from a look-only Street View check, in words, with its source: the shop as an extra POI at
its UrbIS address point (tools/streetlife/extra_pois.json), placed by the street-life build on its building's street face,
its front curated (data/shops/terraces.json: sign text, colours) and its house's look (buildingLooks); a car park as a
hard ground (data/overrides.json grounds: ring from the orthophoto, painted bays, a switch) whose ring keeps the garden
kit off it, with no building through it. Every extra POI is placed, every curated "extra:" front has its POI.

**Why.** Owner playtest 2026-11-16 / 11-19: "night shop on Place Saint-Job missing", "Chaussée de Saint-Job night shop
and Brico Job opposite it", "the white shop on Place de Saint-Job ... stands on grass where the real place has a small
car park". Agam nightshop (n. 701, a white corner house with a red NIGHT SHOP board) and Brico Sint-Job (n. 594, a grey
shed behind its asphalt car park) were not in OSM: the city drew a tan brick house with a garden wall across the shop
front, a brick "house" with windows behind a lawn and front-garden walls where Brico's lot is, and White Night's lot as
lawn.
