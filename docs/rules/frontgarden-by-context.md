---
status: provisional
added: 2026-11-26
check: `frontgarden` (tools/audit/frontgardenCheck.mjs: M the mix per house family, I institution bar fences, S the ?frontgarden=old data); `gates`, `hedgewall`, `walls` and the ground rows on the rebuilt data
---
**Rule.** A front garden's boundary follows the house it belongs to, not one mix for the whole city. tools/gardens/
build_gardens.py reads each street face's house family from tools/gardens/faces.mjs (the building type as the city
draws it, with the data/bldclass evidence) and draws from that family's mix: pre-war rows and maisons de maitre a LOW
plinth (stone / brick, 0.3-0.6 m) with a black iron railing and a gate, often a hedge behind it, solid walls rare; pre-
war villas hedges and railings on plinths; post-war bel-etage / block fronts hedges, low walls and modern railings; the
1990s estates hedges and low walls; schools, hospitals, churches and convents a 1.4-1.6 m steel bar fence on a kerb (taller ones read as floating beams over retaining walls). An
OSM barrier on the line still wins; a row of one family follows its street's dominant boundary more (70 %). No family
draws "open" (rule house-front-garden-closed). `?frontgarden=old`: data/gardens/fgold (the data before).

**Why.** Reality round 2026-11-26 class C4: Street View (look only) showed low plinths with black iron railings and gates
on most Uccle fronts (Avenue de la Floride, Brugmann), black bar fences round schools (Dieweg, Edith Cavell); the kit's
one mix gave pre-war rows solid 0.45-1.8 m brick walls with piers and a school a house's garden wall. Left for later:
timber post-and-rail fences on station / park edges (Calevoet) need a new kit piece.
