---
status: provisional
added: 2026-11-24
check: `xmaspoles` (tools/christmas/xmasPoles.mjs); `xmastest` (tools/christmas/xmasTest.mjs: the poles' geometry, the December windows' switch)
---
**Rule.** A garland that cannot hang from two walls hangs only from a POLE that stands there: a street lamp or tram pole
the city draws (the same placement functions and data: viewer/streets/lampPlace.js placedLampSites, tramPoles.js
tramPoleSites; at runtime confirmed against the drawn lamps / tram-pole instances, else the garland is dropped, never
hung in the air), or a Christmas pole placed by data on the measured sidewalk behind the kerb, off the carriageway and
its parking, clear of every traffic lane / junction turn by the car's body (rule 27), of zebra crossings, trunks,
walls and doors, tram tracks, bollards and the other poles. Its line is the street garlands' catenary: a natural sag
(at most 0.3 + 0.02 x width), the lowest LED >= 4.8 m over the road and >= 6.4 m over a tram track, a hanging star
only where its foot clears 4.6 m, hooks at the pole's own height (a lamp under its lantern, a tram pole under its top).
The placement file is what the CURRENT city data derives (rule xmas-fit-current-city). A layer's extra that changes a
shared shader (the December windows in the facade shader) is compiled in only while the layer is on at boot, behind a
uniform branch: outside the layer the shader is the one of before, turning it on never rebuilds a shader.

**Why.** Place de Saint-Job had 13 garlands across the street: the generator (tools/christmas/build_site.py) hangs a
garland only between two facades at 6.8 m, and the square's two-storey houses rarely reach that; the square itself and
its north edge (Avenue du Prince de Ligne) have no facade on one side at all. Brussels hangs such garlands from poles
(plan job 5, owner's choice 2026-11-23). A pole picked by eye lands in a parking bay, on a crossing's ramp or in a tree
pit, and a lamp the city slides along the kerb (stops, furniture, street kit) would leave its garland in the air.
