# Vivier d'Oie: the Chaussée de Waterloo bridge over the L26 (branch claude/vivier)

Owner playtest 2026-11-17 (image 65): "there is a bridge at Vivier d'Oie, Chaussée de Waterloo, that is missing". Driving
the Chaussée north past Avenue Latérale: a pale slab floating beside the road, the open cutting with ballast and earth
under the street's west half, a C43 sign post standing on a block down there.

`?vivier=old` (features.js, "City defects") = everything below off, as before.

## Reference (look only)
- OSM 2025: the Chaussée's bridge is way 35036093 (primary, bridge=yes, layer 1), 21 m from (1736.4, 308.4) to
  (1725.4, 326.5); the east footway on its own bridge way 1553899265; Avenue Latérale joins at the south end (node
  30151542). The L26 passes under in a cutting (rail top 75.0 m, the streets 81.4-82.5 m: 6.5-7.5 m deep), two tracks;
  the Vivier d'Oie - Diesdelle halt is just west (platforms 209187994 / 209187995, footbridges 209187984 and 36870319).
- UrbIS Land cover 2026 "Bridges": ROB 590, 740 m2, a skewed slab twice the OSM band's width: its west face crosses the
  tracks square at x 1717-1719, its east face along the road's skew, the Avenue Latérale corner and the east footway
  on it, a strip 15 m wide north of the tracks over the cutting's north bank to z 345.
- DTM 2021 (bare earth): the cutting floor 74.5-74.9 m, 11-12 m wide; the south side a near-vertical wall (82.5 -> 75 m
  in 5 m, under Avenue Latérale), the north side a 1:2 bank; under the deck the LiDAR has no ground: interpolated
  76-78 m (a hump).
- Street View: TO DO at the browser turn (parapet / railing type, abutment material).

## WHY IT HAPPENED + RULE

**Root cause.** Three assumptions, none checked:
1. *An OSM bridge way's band is the bridge.* `viewer/streets/bridgeDecks.js` drew every OSM bridge road as its lanes'
   band (here 2 x 9.35 m) between the way's ends. At Vivier d'Oie the real deck is the UrbIS polygon (740 m2), the band
   covered 48 % of it: the Avenue Latérale corner west of the Chaussée and the north strip were open cutting with the
   street surfaces drawn down the cutting's slopes.
2. *The DTM carries a road bridge's deck.* `viewer/rail/railData.js` drew each UrbIS road / foot bridge over the line
   (ROB / PB) as a slab at the DTM of its centroid ("which carries the deck"). The 2021 DTM is bare earth: the centroid
   is in the cutting. All nine such slabs stood between 2.3 m under and 0.7 m over the rails; Vivier d'Oie's crossed
   the trains' path (the pale slab of image 65, 1.6 m over the cutting floor).
3. *Things placed from the DTM stand on the street.* The data layers' baked points (data/streetkit signs: the C43 sign
   at y 81.07, 1.4 m under the deck), the street lamps / signals and the parked cars took the terrain under the deck.
**Why no check caught it:** the road audits check the street surfaces against the terrain, not against what a bridge
should be; the Saint-Job fix (citydefects A) hand-measured ONE deck instead of stating the rule for all crossings.

**Rule.** Every road-rail crossing in OSM / UrbIS resolves to ONE built structure: a road over the line stands on a
drawn deck that covers its measured UrbIS polygon (>= 85 %), with railings on every edge over the drop and no slab left
in the cutting; a road under the line passes under a rail bridge or through a tunnel; the catenary runs under every
deck; what stands on the deck (furniture, cars) stands on the deck.

**Automated checks** (pass / fail, `node tools/audit/mergeGate.mjs`, rows `bridges` and `deckjoins`):
- `tools/audit/bridgeAudit.mjs` (all tiles, < 1 s): U1 deck cover of every UrbIS ROB carrying a named road, U2 no UrbIS
  slab in a cutting, U3 foot bridges built, C every road (roads.json) crossing a track classified over / under / level
  (its ground 12-30 m either side vs the rail top): over -> on a drawn deck or a hero; bridge=yes -> on a drawn deck;
  under -> under a UrbIS RAB / hero / tunnel; W the catenary capped under every deck (low clearances = warnings).
  `--old`: the same with `?vivier=old`. Known open items in `tools/audit/bridgeAudit.allow.json` (reported "allowed").
- `tools/audit/deckJoins.mjs` (the plan decks' tiles, the worker's whole build in node, ~8 s): along every edge of every
  measured deck, every 0.5 m, the deck's walked top vs what is drawn 1 m out: joined (<= 0.15 m), railed, skirted (an
  abutment wall face down into the ground), buried; FAIL on a free edge dropping with no railing or a street drawn over
  the deck at the joint.

| | before (`--old`) | after |
|---|---|---|
| UrbIS ROB 590 (Vivier d'Oie) under a drawn deck | 48 % | 100 % |
| UrbIS slabs drawn in a cutting (U2) | 9 (590, 751, 752, 820, 833, 864, 899, 923, 939) | 0 |
| road-rail crossings (roads.json, inside the city) | 42: 21 over, 13 under, 8 level | same, all resolved |
| catenary under the OSM decks | through the slabs (no cap) | capped 0.3 m under the soffit |
| gate | FAIL 10 | PASS (2 allowed: the station footbridges) |
Reports: docs/vivier/bridge_audit_old.json, bridge_audit.json.

## What changed
- `bridgeDecks.js ringPlans / urbisPlan`: for an OSM bridge road over a UrbIS ROB whose band covers < 85 % of it, with
  one bundle of tracks at one level under it (spread <= 12 m) and the streets >= 4 m over the rails, a plan deck from
  the polygon: free edges = those crossing / within 3.5 m of a track, pushed out 1.2 m (UrbIS's street surfaces reach
  ~1 m past its bridge polygon); the top = the plane through the streets 1 m outside the abutment edges (robust: the
  cutting's slopes dropped) + their residuals, inverse-distance weighted, so the deck meets each street at its height;
  cutting walls under the slab where the DTM beside the deck leaves the floor; the floor between them at the ballast's
  foot, walled (no 1:1 taper: the taper had cut Avenue Latérale 1.8 m down). Only Vivier d'Oie qualifies today; the
  hand plan (Saint-Job) keeps priority.
- The free edges and the edges over a drop are pushed out to cover what the streets draw there: UrbIS's street
  surfaces and the road's own lane band (+ its junction arms' first 15 m) reach 1-2.5 m past UrbIS's bridge polygon
  over the tracks (min 1.2 m, max 4 m). Street vertices > 1 m over the ground beside the deck (40 m round it): 34 -> 5
  (one skirt vertex of a refined sidewalk polygon, 1.4 m past the east fascia, 0.75 m tall: left).
- Plan decks: railing on a free edge wherever it drops more than a kerb (0.15 m; abutment edges 0.8 m); the paving
  between the measured street surfaces sits a kerb over the nearest drawn street (tileData.js streetTop).
- Plan decks carry their DRAWN top on a 1 m grid (`deckTopGrid`: the street drawn there, else the paving): the walker
  and the car stood on the fitted top, up to 0.45 m over the drawn street (the road stage's 6 m height field). J5,
  walked top - drawn street p5 / median / p95: before -0.19 / 0.06 / 0.45 m, after -0.03 / -0.03 / 0.07 m. Also on the
  Carsoel deck (H6).
- `railData.js`: no UrbIS slab where an OSM deck is drawn over its centroid nor in a cutting; the catenary capped under
  every OSM deck's soffit (`deckSoffitCap`), no mast under a deck.
- `main.js`: furniture, data-layer points, parked cars and two-wheelers on a deck stand on the deck.

## Other crossings of L26 / L124 in Uccle (bridgeAudit.mjs)
| crossing | structure | state |
|---|---|---|
| Chaussée de Waterloo / Vivier d'Oie (ROB 590) | OSM deck, now the UrbIS plan | FIXED here |
| Carsoel / Saint-Job station (new deck) | hand plan (citydefects A) | ok |
| Rue de Verrewinkel (ROB 879) | hero bridge | ok |
| Rue du Merlo (ROB 833), Av. de la Chênaie (899), Rue du Bourdon (820), Av. des Tilleuls (864 / 939), Av. des Hospices (923) | OSM band decks, 90-100 % of the UrbIS polygon | ok; their UrbIS slab in the cutting / ballast removed |
| Rue de Stalle, Château d'Or, Ch. de Saint-Job x2, Kauwberg, Bigarreaux, Engeland, Linkebeek (roads under the line) | hero rail bridges | ok |
| Vivier d'Oie station footbridges (PB 751, 752) | none (their slab lay in the ballast) | OPEN: needs a model (deck, stairs to both platforms, piers) |
| Warnings: low contact-wire room under Av. des Tilleuls (3.6 m), Av. des Hospices (2.9-3.2 m), Carsoel (4.5 m) | | the deck / rail heights there to measure |

## Browser check (2026-11-17, after foundation was merged in: 10c1d69b)
Images (quick mode, `?quick=1&with=trains`, `?vivier=old` for before): `street_before/after.jpg` (the Chaussée
northbound at the image-65 spot), `west_before/after.jpg` (the Avenue Latérale corner on the deck), `track_before/after.jpg`
(from the L26 under the bridge), `above_before/after.jpg` (30 m).
- Before: a pale slab across the tracks at rail level (UrbIS ROB 590 at its centroid's DTM), the band deck with a concrete
  parapet wall standing on the corner, the cutting open under the street's west half, a catenary mast through the slab.
- After: the deck over the whole UrbIS outline, steel railings on the concrete upstand over the tracks, the cutting
  walls under it, the floor at the ballast's foot, the wires under the soffit, the corner paved at street level.
Found and fixed on the turn:
- Terrain spikes at the cutting walls' foot (the 1 m grid row behind the wall uncut): the floor cut 1.5 m behind them.
- The car stopped dead entering the deck from Avenue Latérale: the road engine's node at the bridge end sat 0.5 m under
  the deck (its plane fit took in the cutting), so the drawn street stepped 0.35 m. Junctions on a UrbIS plan deck now
  take the deck's level (roadLevels.js deckLevel). Car across the deck: 0 hits, 82.97 -> 81.98 -> 80.7 m, smooth.
- Moving traffic (and the trams) ran on the terrain: a car dipped 7 m into the cutting under the deck (it dipped 3-4 m
  under every band deck before). They now run on world.decks (main.js movingGround).
- Box-ball plants grew up through the deck from the bank under it: no generated plant on a deck.
- A paving strip of the deck over the engine's Chaussée: the deck top tucks under the engine's road on the bridge road's
  band too (not off it: tram platforms are in the drive raster as well).
- deckJoins now checks the drawn street's continuity across every deck edge (it had let the 0.35 m step through).
Checks on the deck: signals 82.29 / 82.22, the C43 sign 82.39 (deck 82.0-82.4); no parked car on the bridge (the width
rule leaves none there); traffic sampled on the deck at 81.4-82.0 m.
HEAP browser line, 5 boots, localStorage cleared each: `?gamemenu=0&orbitcam2=old`, default, `?gamemenu=0&tilecache=0`,
`?game=police` + gamePerf police 45 s (54.5 fps, p95 33 ms), `?game=falcon`: 0 console errors, 0 WebGPU errors,
tripCounts {} in all five (queueSkips flush 0 / 4 / 6 / 0 / 0).
Cost: J5 tile build unchanged (4.4-5.7 s both ways, noise); the deck 3,870 triangles (band: 232 + the UrbIS slab 124),
same draw count (one deck mesh, slot groups); no frame cost measurable.

Visual tour `vivier` vs `foundation` (22 views): 2 flagged.
- vivier-bridge (48.7 %): intended. `tour_vivier-bridge.jpg` = baseline | this branch with `?vivier=old` | this branch:
  the view's framing already differs between the baseline and `?vivier=old` on this branch (both before my change: the
  baseline predates something else in the merge); against `?vivier=old` the change is the bridge itself and the look
  point's ground (the view looks at a point on the deck: the plan deck's top 0.3-0.5 m over the old band's sag).
- traffic-alsemberg (cell 84.8 %): a moving car in front of the camera at capture (`tour_traffic-alsemberg_crop.jpg`),
  the view's known noise; nothing of this branch is there (no deck).
- stjob-station flagged at first (3.3 %, `tour_stjob-station_crop.jpg`: the Carsoel deck's junction re-levelled, its
  walk top lowered to the drawn street = the camera 0.15 m lower): the vivier tweaks are now limited to the UrbIS plans,
  the hand-measured Saint-Job deck keeps its verified levels -> ok on the rerun.

Open (listed, not small): the two Vivier d'Oie station footbridges (PB 751 / 752: deck + stairs to both platforms +
piers: a model of their own); the low contact-wire room under Tilleuls / Hospices / Carsoel (deck or rail heights to
measure: bridge audit warnings); Saint-Job's hand plan: UrbIS sidewalks reach past its west / south-west ring over the
bank (deckJoins allow list, seen in the browser); a measured sidewalk strip with a gap in the asphalt across the
Chaussée 6 m south of the deck (z ~ 299, UrbIS data, also before).
