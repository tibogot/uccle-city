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
- Plan decks: railing on a free edge wherever it drops more than a kerb (0.15 m; abutment edges 0.8 m); the paving
  between the measured street surfaces sits a kerb over the nearest drawn street (tileData.js streetTop).
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

## Browser check
TO DO (coordinator's browser turn): street level from the Chaussée (image 65's spot), from the track below, from above;
before (`?vivier=old`) / after in docs/vivier/.
