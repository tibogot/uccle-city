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
rule), outside every footprint. Every flag flown is the REAL national flag, emblem included: its Wikimedia Commons SVG
(tools/flags/fetch_flags.mjs: the file page's licence read and recorded with its author and sha1 in
data/flags/embassy_sources.json; public domain, or CC-BY(-SA) only with the credit in CREDITS.md), the download kept
unedited in data/raw/flags/commons, rasterised at build time (tools/flags/build_atlas.mjs, a deterministic pure-JS
rasteriser) into one atlas the gate rebuilds and compares byte for byte; each flag at its real proportions (the
cloth stretched along the fly, the one-draw set kept). Every flag flies readably in any wind: a flag on a front (a
bracket, a pole near its wall) takes the local wind along the street (viewer/embassyFlags.js localWind: the part into
the wall dropped, an outward share, a minimum flutter), so it streams broadside to the street and never lies folded on
the wall; a bracket flies 1.5 x 1.0 m (2:3; p.hoist for a big front); the check records every flag's loop for 9 wind
directions (tools/embassy/flutter.mjs: spread >= 0.6, broadside >= 0.5, no vertex in the wall).

**Why.** The owner (2026-11-26): "in Uccle there are a lot of embassies; flags in front of their gate, if it doesn't
cost perf". OSM had only the Russian embassy in the city's pull (the pulls never asked for office=diplomatic); a
fetch of all diplomatic places gives 19 in the commune, and most do not fly a flag in front (residences, offices in
apartment blocks, compounds behind walls). Flying one at every OSM point would have put flags where there are none; a
flag per place as its own cloth would have cost a draw and a live cloth each. So: a per-place look first, the record in
the data, and a gate that keeps the flags to the real poles and the cost structural. Round 2 (owner, 2026-11-26): the
first designs were drawn in code with the emblems simplified and every flag squashed to 2:3; the owner wanted the real
flags ("no reason not to use the real one"). Round 3 (owner): "fix the limp flags and make the bracket flags bigger":
the default wind (towards 70 deg) blew square into Eswatini's front (the cloth pressed on its wall's half-space) and
straight out of the Wolvendael fronts towards the street (Nicaragua, Afghanistan: seen edge-on, a limp strip); the
brackets flew 1.2 x 0.8 m.
