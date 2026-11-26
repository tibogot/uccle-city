---
status: provisional
added: 2026-11-26
check: `embassyflags` (tools/audit/embassyFlagsCheck.mjs); a quick look at a few of the places with `?embassyflags` on
---
**Rule.** A flag in front of a diplomatic place flies only where a real one flies. Every OSM diplomatic place of the
commune (pipeline/fetch_diplomatic.py -> data/raw/osm/diplomatic.json) has a record in data/places/embassy_flags.json,
checked by a look at street-level imagery (look only: nothing stored, nothing traced) and written in words: `yes`
(where: a free-standing pole, a façade bracket; how many; the designs; when it was seen), `no` (looked, no flag) or
`unseen` (no usable imagery: blurred, the building not found). Only a `yes` gets poles, one per recorded mount
(tools/embassy/places.mjs places them from the building's drawn street face); a residence, a `no` or an `unseen` gets
none, and nothing else is added (no signage, no security detail). The flags are cloth (rule flags-are-cloth) at a fixed
cost: every free pole's flag in one baked set (one draw, the designs in one atlas), a bracket or a pole within the
cloth's reach of a wall in its own set with that wall as a half-space, live cloth only for the nearest 6 within 45 m
from a pool built at start, hidden past 700 m, no light. A pole stands on a footing buried in the drawn ground (joins
rule), outside every footprint. Every design flown is a public-domain national flag drawn from its legal description,
its source recorded (flagDesigns.js FLAG_SOURCES); an emblem or coat of arms is drawn simplified, never copied artwork.

**Why.** The owner (2026-11-26): "in Uccle there are a lot of embassies; flags in front of their gate, if it doesn't
cost perf". OSM had only the Russian embassy in the city's pull (the pulls never asked for office=diplomatic); a
fetch of all diplomatic places gives 19 in the commune, and most do not fly a flag in front (residences, offices in
apartment blocks, compounds behind walls). Flying one at every OSM point would have put flags where there are none; a
flag per place as its own cloth would have cost a draw and a live cloth each. So: a per-place look first, the record in
the data, and a gate that keeps the flags to the real poles and the cost structural.
