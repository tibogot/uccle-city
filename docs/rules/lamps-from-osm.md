---
status: provisional
added: 2026-11-26
check: `lampextras` (tools/audit/lampExtrasCheck.mjs O: every OSM lamp of a built tile a lamp site, no generated lamp doubling one)
---
**Rule.** A street lamp OSM has surveyed stands where it is surveyed. tools/lamps/build_osm_lamps.py writes the
highway=street_lamp nodes of Uccle to data/lamps/osm_lamps.json (243, 92 in built tiles; lamp_mount / support kept);
viewer/streets/lampPlace.js lampSites puts each one in its tile (the arm to the nearest road, placeLamp then moves it
onto the measured sidewalk like any lamp), and a road with >= 2 OSM lamps within 9 m of its centre line drops its
generated row there, so the two never double. Every consumer (city, drive colliders, walker, Christmas poles, audits)
reads the same list. `?osmlamps=old`: every lamp generated.

**Why.** Reality round 2026-11-26 class C7: the generated rows (one spacing, alternating sides) put lamps where
Street View (look only) shows none and missed the surveyed ones; lamps.js itself said "real lamp positions can replace
this when a source is found": OSM is that source where mappers have walked.
