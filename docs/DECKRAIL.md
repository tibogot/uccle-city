# Deck railings across joined streets (branch `claude/deckrail`, 2026-11-18)

Found by the collisions browser turn (docs/COLLIDER_AUDIT.md): road-deck parapets / railings drawn ACROSS streets, and
the car stopping at them. Offline turn (no browser). Switch: `?deckrail=old` (features.js row "deck railings across
joined streets (old)", Collisions) = the railings as before. Tile worker change (viewer/streets/bridgeDecks.js,
viewer/tileData.js, viewer/drive/colliders.js): the worker bundle must be rebuilt in the main repo (rule 12).

## Item 1: WHY IT HAPPENED + RULE

**Root cause.** Neither deck kind looked at what is DRAWN beside its edge:
- *Band decks* (an OSM bridge road drawn as its lanes' band, `deckMesh` / `parapetRings`) put a 1 m concrete parapet on
  both sides over the whole span, whatever is beside it. At Kasteelstraat (E10) the Avenue des Hospices deck
  (r1002735646) and the service road's deck (r1002735650, OSM 1002735650, oneway) leave the same junction node
  (n4294363596: Kasteelstraat, Stationsstraat, Square Maas) 20 degrees apart and overlap for most of their 30-38 m: each
  deck's parapet ran across the junction and across the other deck's carriageway, and the Hospices deck's east parapet
  stood for 38 m beside a street drawn at grade (terrain and street at the deck's 85.5 m, measured 1-14 m out).
- *Plan decks* (a measured outline, `planDeckMesh` / `planParapetRings`) railed an edge where "the drop" was over 0.8 m
  (abutment) / 0.15 m (free edge), the drop measured against the BARE TERRAIN (hm.ground) half a metre out. At the
  Carsoel deck's ends (H6, x 880 and x 943) the street and the tram road go on at the deck's level over the bank, but
  the DTM there is the bank's slope, 1.3-3 m lower: a railing + upstand across the carriageway and the tram rails.
**Why no check caught it:** `deckjoins` only looks at the plan decks and judges levels (joined / railed / skirted), never
whether a railing stands where traffic goes on; the band decks were never audited at all.

**Rule (extends 17).** A deck edge where the traffic goes on (a drawn street or sidewalk, another deck or a tram track
at the deck's level: 1 m out +-0.3 m AND 2 m out +-0.6 m; or a driven lane / junction turn / tram track crossing the edge
with the surface 1 m out within 0.6 m) carries no parapet / railing and no car wall; an edge over a drop keeps its
railing. The level is the one traffic meets at the edge: the street drawn on the deck there, else the deck's top. What is
drawn and what collides come from ONE decision.

**Fix.** `bridgeDecks.js markRailCuts(decks, deckContinuation(...))` decides once per deck which pieces go (band: 2 m
pieces per side; plan: 1 m pieces per ring edge; a piece goes when 2 of its 3 samples go on; a FREE plan edge, over the
tracks, only where another deck goes on), stored as `d.railCut`; `deckMesh` / `planDeckMesh` and `parapetRings` /
`planParapetRings` read it (the plan's car walls now come in the drawn railing's 1 m pieces). A cut band piece keeps the
slab's edge face; a parapet / upstand run that stops gets an end cap. "Goes on" = the drive raster's top surface
(colliders.js `driveGround`, now made once in tileData.js and handed to `buildDriveData`), any deck's walked top, or a tram
track on ground at that level; plus `crosses`: a segment of the tile's traffic graph (lanes, junction turns) or a tram
line within 1.6 m of the edge point, running across the edge. The 2 m sample matters: a measured street drawn past a
deck's edge hangs a 1 m lip over the cutting (Avenue de la Chenaie, G7, 43.6 / 1022.6). The lane test matters where the
drawn street beyond sags: west of the Carsoel deck the street's south half falls 0.5 m a metre into the bank (a defect
of its own, deckJoins allow list), and the eastbound lane + tram track would otherwise still meet a railing. Its 0.6 m
tolerance keeps the Hospices deck railed where the service road's deck lies 0.8-1 m lower (E10, -751, 2785).

**Automated check** `deckrails` (tools/audit/deckRails.mjs, mergeGate, ~45 s, 4 processes): every OSM road deck of
the 21 tiles with a bridge road, the worker's whole build in node: (1) every car-wall piece of a deck's parapets /
railings sampled every 0.5 m: the surface 1 m and 2 m outside at the edge's level, or a lane / turn / tram track across
it (own implementation, the tile's traffic graph) = ACROSS (runs >= 1.5 m fail; band pieces are 2 m: a shorter run is
the piece grain, reported); (2) every raised triangle of the drawn deck (> 0.2 m over its
top) lies on a car-wall piece; (3) along every deck edge, unrailed metres over a > 0.8 m drop never more than `--old`
(docs/deckrail/rails_old.json). `--old` = `?deckrail=old`.

| all decks (9 decks drawn by 21 tiles) | before (`--old`) | after |
|---|---|---|
| parapet / railing ACROSS a continuing street / deck / lane / tram (runs >= 1.5 m) | **33 runs, 62.0 m** (+ 3.5 m shorter) | **0** (+ 2.5 m piece grain) |
| car-wall pieces / metres | 473 / 919 m | 517 / 850 m (plan walls in 1 m pieces) |
| drawn railing parts with no car wall | 0 | 0 |
| unrailed edge over a > 0.8 m drop | 0.5 m (J5 1734.4, 329.6: the drawn railing's own drop test) | 0.5 m (same) |
Reports: docs/deckrail/rails_old.json, rails_after.json.

### Places changed (for the browser check, `?deckrail=old` vs default)
| place | before | after |
|---|---|---|
| E10 Kasteelstraat junction, Hospices deck west side at the node (-755, 2790) | 6 m of parapet across the junction into the service road's deck | none |
| E10 service road deck north side (-761, 2780) | 7.7 m of parapet across the Hospices deck's carriageway at the junction | none |
| E10 Hospices deck east side (-755, 2770) | 37.8 m of parapet between the deck and the street at grade beside it | none (the slab's edge face stays) |
| E10 Hospices deck west side near its south end (-735, 2763) | 4 m across the street at grade | none |
| H6 Carsoel deck west end, edges 0-2 (881.3, 520.1) .. (880.2, 524.8) | 6.5 m of railing + upstand across the carriageway and the tram road (the car stopped at x ~879) | none up to z 526.5 (the carriageway's south edge); from there south (the sidewalk over the bank) still railed |
| H6 Carsoel deck east end corner (943.7, 523.9) | a railing piece across the street's edge | none |
| J5 Vivier d'Oie deck, south-east corner (1748.6, 305.1) | 1.5 m of railing across the street | none |
Kept on purpose: E10 Hospices deck west side over s 10-30 m: the service road deck lies 0.8-1 m LOWER there (its profile
starts at the DTM 6 m past the junction, 83.8 m, under the junction's 85.2 m): a drop, railed; that deck's level is a
defect of its own (open, below).

Browser check: `?at=-760,2780` (E10, the junction and the Hospices deck's east side: drive across, no wall, slab edge
face sound, parapet ends capped), `?at=881,521` (H6 west end: tram road and lanes open, south-west corner still railed),
`?at=943,525` (H6 east end), `?at=1748,305` (J5); the car driven across each (it stopped at x ~879 before).

Open: the service road deck at Kasteelstraat (E10 r1002735650) sits 0.7-1 m under the Hospices deck and the junction
it starts from (its end heights are the DTM past its ends): a profile fix of its own (both decks overlap for 30 m).

## Item 2: the traffic-alsemberg parked car (TODO NOW "lost a parked car since curvedroads")

**Not the bend trim.** `tools/roadfix/bendPark.mjs`: E4 + the neighbours the quick boot loads (E3 D3 D4) built with the
trim on and off (`roadBend: false` = `?roadbend=old`): the worker's parked sites identical (177, bit for bit), the van
at the left kerb (site -916.26, -308.87, road r320428249_2) parked in both, the main thread's border drop (laneHits) the
same 9 cars in both, the four traffic graphs bit-identical. The trim moves engine strip vertices only; the parking fit
reads the measured surfaces (streetFit of road.surfaceData) and the lanes come from the road network, neither of which
it touches.

**What removes it: the traffic sim's pull-out** (viewer/traffic/trafficSim.js `parking`): every 20 steps, with p 0.35,
a parked car 20-150 m from the focus (the orbit target: the view looks at -909, -438, the van is 129 m from it) is
pulled out into the traffic, VISIBLE ones preferred (+1 in the score); the van is about the only parked car in view, so
once picked it is hidden in the parked fleet and drives off. Whether that happened before the capture depends on how
long the sim ran (boot, settle): the tour runs show it is random and older than curvedroads. Van present: foundation-2,
foundation-prev, foundation, policerear (boot 27.7-30.2 s). Van absent: mdraw, xmasfir, falconstutter (all BEFORE
curvedroads), curvedroads, collisions, lycee (boot 29.2-56.8 s). Same pose / plate whenever present (a parked car, not a
moving one). **Fix (tour only):** under `?still=1` (the tour's common switch) the sim's parkRate is 0 (trafficSim.js
`parkRateFor`): no random pull-outs / reverse-ins, the van stays parked in every run; normal play unchanged. Rule 6
(the tour) extended: a tour view is deterministic, nothing random may change it by the boot's length. Check: gate row
`tourdet` (tools/tour/tourDeterminism.mjs: still=1 in both views files' common switches, a TrafficSim built under
?still=1 has parkRate 0, without it 1). Expect traffic-alsemberg to flag ONCE against a baseline that lacks the van.
