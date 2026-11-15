# Building types for the ordinary buildings (branch `claude/styles`, 2026-11-15)

Uccle's 25,000 UrbIS buildings all wore one generic façade (a hash picked brick or render, the same window grid
everywhere). Now every building gets one of five real Uccle **types**, chosen from data, and each type has its own
window grid, materials, details and geometry. Switch: **`?styles=old`** = the generic façade of before (dev panel,
"A/B: old versions", "building types"). Default: on.

| type | what it looks like now |
|---|---|
| 1 maison de maître (19th c. – 1930s town house) | tall windows (sill 0.20 / head 0.84 of the storey), a raised entrance up three 17 cm steps (door 0.51 m up), a high blue-stone plinth (0.9 m), stone lintels with keystones (blue or white stone on brick, a moulded band on render), a string course at the first floor, a rusticated rendered ground floor, a heavy two-course cornice; the façade kit's odds: balcony 60 % (a bay window / oriel on 45 % of those), string course 85 %, modillions 85 %, soupiraux 85 %, door A / Art Nouveau mostly |
| 2 art deco / modernist (1919-45) | wide, low window bands (min(2.2 m, 0.74 bay)) in dark steel frames (green, black, grey; 30 % white) with 0.55 m lights and two horizontal bars; light renders (cream, off-white, pale ochre, pale grey) with three grooved lines over the heads and a smooth band at the sills; brick fronts (red, yellow, brown) with continuous white bands at the heads and sills; a flat concrete entrance canopy; a plain coping band instead of the cornice |
| 3 post-war bel-étage (1946-70s terrace) | a garage door in the street front's ground floor (sectional steel in 4 sections or vertical boards), small high ground-floor lights, a wide window band above in a white concrete surround, brick (yellow, brown klinker, red), half of them clad in stone panels on the ground floor, white / brown / aluminium frames, an entrance canopy |
| 4 apartment block (1950s-70s, and the tall terraced fronts) | lower storeys (2.9 m step), large glazing down to 0.10 of the storey with a guard rail at 1 m, the floor slabs' concrete edges at every storey, a wide glazed entrance hall, **balconies** on 65 % (16 cm slab 1.25 m deep + a 1 m parapet: concrete, white enamel panels, frosted glass or dark metal; continuous or one per window pair), concrete / white render / yellow / brown / red brick |
| 5 villa (detached, semi-detached) | the generic window grid (the kit's pieces), a garage door on 45 % (the kit's sectional garage door, placed for the first time), shutters 60 % (render), dormers 80 %, and 35 % are Uccle "cottages": a half-timbered upper floor and gable (posts every 0.9 m, sill plate, head rail, braces), rendered between the timbers on brick villas |
| 0 generic | sheds, garages, annexes (< 4.5 m tall or < 28 m²) and the landmarks: unchanged |

## 1. How a building's type is chosen (viewer/buildingTypes.js `classify`)

**Data used.** UrbIS has no age and no use; OSM tags `start_date` on 9 buildings of the commune and `building:levels`
on 1 (data/raw/osm/area.json: 160 building-tagged objects), so neither carries the type. What is real:

1. **The form, from UrbIS LoD2** (per BU_ID, all solids of a building together): footprint area, height, the main
   solid's eaves, the share of flat roof (roof triangles' plan area with n.y > 0.97), and the **party walls**: every
   footprint edge probed 0.35 m outward at 20 / 50 / 80 % of its length into another building's footprint. Forms:
   `landmark`; `small` (< 4.5 m or < 28 m²); `block` (>= 13.5 m and >= 150 m², or >= 17 m, or >= 650 m² and >= 9 m);
   `terraced` (party walls on two opposite sides, or > 30 % of the perimeter); `semi` (> 4 %); `detached`.
2. **The period, with the commune's real shares**: Statbel open data "building stock 2023" (cadastre, 1 January
   2023; https://statbel.fgov.be/en/open-data/cadastral-statistics-building-stock, file
   `building_stock_open_data_2023.txt`, NIS 21016 Uccle), buildings by construction period and kind:

   | Uccle (Statbel 2023) | before 1919 | 1919-45 | 1946-70 | after 1970 | total |
   |---|---|---|---|---|---|
   | closed houses (R1) | 947 | 4,342 | 2,073 | 761 | 8,124 |
   | semi-open houses (R2) | 207 | 980 | 1,431 | 499 | 3,118 |
   | open houses, farms, castles (R3) | 117 | 559 | 932 | 568 | 2,176 |
   | buildings with apartments (R4) | 157 | 1,154 | 1,469 (1946-81) | 513 (after 1981) | 3,302 |

   The data is per commune (no statistical sector level in the open file), so the period of one building is a
   **stable hash draw** with these shares, weighted by its form: flat roof → before 1919 x 0.35, post-war x 1.6;
   pitched → before 1919 x 1.3, post-war x 0.7; eaves >= 9.5 m (3+ storeys) → before 1919 x 1.4, post-war x 0.6;
   eaves < 6.2 m → before 1919 x 0.6. Half of the buildings take the draw of their **60 m cell** (rows were built in
   campaigns: neighbours share their period), half their own.
3. **Form x period → type**:
   - block: before 1919 → maison de maître, 1919-45 → art deco, later → block (flats' shares; > 24 m: post-war only);
   - terraced / semi with eaves >= 11 m (4+ storeys): flats' shares as a block (an "immeuble de rapport", not a house);
   - terraced, small semi (< 110 m²): before 1919 → maison de maître; 1919-45 → maison de maître or art deco (the
     interwar terrace is half traditional brick fronts, half rendered deco; 75 % deco with a flat roof); 1946+ → bel-étage;
   - other semi / detached: flat roof → art deco (modernist villa) if 1919-45 or 30 %, else villa; pitched → villa (a
     large pre-1919 one: 50 % maison de maître).
4. The wall material follows the type (table in `classify`), a garage on every bel-étage and 45 % of the villas.

**Coverage** (`node tools/styles/scan.mjs`, all 120 tiles, per BU_ID; docs/styles/coverage.json):

| type | buildings |
|---|---|
| maison de maître | 4,144 |
| art deco / modernist | 5,256 |
| post-war bel-étage | 4,531 |
| apartment block | 1,846 |
| villa | 3,392 |
| generic (sheds, annexes, landmarks) | 6,229 |
| of which with a garage door | 6,082 |

Forms found: terraced 10,190, semi 3,125, detached 2,956, block 2,898, small 6,213, landmark 16 (Statbel: closed
8,124, semi 3,118, open 2,176, apartments 3,302: UrbIS splits more, but the proportions agree).

## 2. Where it is done

| file | change |
|---|---|
| `viewer/buildingTypes.js` (new) | the classifier, the Statbel table, `TYPE_GRID` (per type: window width, sill / head per storey, the door's raise, storey step and k range), `garageBay` |
| `viewer/interior/facadeWindows.js` | `faceOpenings(f)` takes `f.type`, `f.garage` (kind "garage"; the block's wide door), `storeyFit(eaves, fit, type)`; KEEP IN SYNC with the shader |
| `viewer/facades.js` | aBld.z = street + 2 type + 16 garage (decoded, rounded); the type's grid row as two vertex-stage varyings; `storeyK(eh, tq)`; glazing bars per type; garage door (painted, cut on kit faces); the type's dress (section "THE TYPE'S DRESS"), the deco palette, the cottage half-timbering; `paintedGlass(type)` for the kit glass (maison de maître grid); `STYLES_OLD` |
| `viewer/facadeGeom.js` | classify per tile; style / type / garage per building; heavier / plainer cornice strips per type; `typeDetails`: raised-entrance steps (where the kit is off), entrance canopies, block balconies, all in the tile's existing detail mesh (no new draw call), only where the face's own wall stands (sampled, never across a gap between two wings) |
| `viewer/facadeKit/placement.js` | types 2-4 stay painted (the kit's pieces are 19th-century joinery); odds per type; the villa's garage piece; steps start at the raised door; aKitF.w + 1024 = maison de maître grid; **bug fix**: a step is a "run" in kit.json, so kitField read its end mitres from the face's u0 (hundreds of metres) and sheared it into a long dithered band (it showed across Place Saint-Job once the raised doors added steps); steps now carry zero mitres |
| `viewer/facadeKit/kitMaterials.js` | the kit glass decodes the maison de maître flag |
| `viewer/tileData.js` | the worker flag; the far tiles' wall colours from the same types |
| `viewer/main.js` | one entry flag `styles` |
| `viewer/features.js` | the `?styles=old` row |
| `viewer/tileWorker.bundle.js` | rebuilt (`node tools/build_worker.mjs`) |
| `tools/styles/scan.mjs`, `tools/styles/tileCheck.mjs` | coverage over all tiles; a tile built in node with the type stats |
| `debug/stylesShots.js`, `debug/stylesAB.js` | the before / after cameras; the in-page GPU A/B of the wall shader |
| `tools/interior/houseSpec.mjs`, `pickHouse.mjs` | decode the packed street flag |

## 3. Costs

- **Draw calls**: none added per building. Geometry goes into the existing per-tile detail mesh; the villas' garage
  door is one more kit piece type (1 opaque draw per LOD while one is in range). Kit faces on I6 805 → 362 (the deco /
  bel-étage / block fronts are painted now): fewer kit instances drawn there.
- **Triangles** (detail mesh per tile, node build): I6 93.0k → 87.5k (plain copings replace two-course cornices),
  E1 79.1k → 82.2k (552 balconies), G1 79.2k (478 balconies).
- **GPU, wall shader alone** (`debug/stylesAB.js`: the old wall material built from a second facades.js instance
  and swapped live on every plain wall mesh, 4 alternations, 3 s each, same frames): Rue Vanderkindere -0.46 ms
  (spread -2.16..+0.20), Avenue Churchill -0.18 (-0.65..+0.14), Place Saint-Job +0.34 (+0.19..+0.59). Within the
  noise; at most ~+0.3-0.4 ms where walls fill the screen. **Preflight was RED** (2.9 GB free of 15.7, Chrome 4.6 GB,
  another agent's city on 8896 rendering): these are noise-limited; the separate page loads (styles=old vs new) moved
  by -0.5..+1.9 ms between runs with the tree / tile streaming at different stages (tris 3.0 vs 4.1 M at the same
  camera), so they are not used. A quiet-machine A/B is still to do.
- Worker: classification is ~0.7 s for all 120 tiles in node (per tile a few ms); tile analysis times within noise.

## 4. Before / after (docs/styles/, `*_before` = `?styles=old`, `*_after` = default; same camera, `debug/stylesShots.js`)

Compared to Google Street View (looked at only; nothing stored, traced or shipped):

| street | camera | Street View (look only) | before | after |
|---|---|---|---|---|
| Place Saint-Job (`stjob`) | 1102,542 → 1175,540 | the corner: a beige / yellow brick 4-5 storey interwar-postwar block with flat roof and small balconies; brown brick houses with shop windows | red / yellow brick, the same generic windows on everything | the corner block with balconies and big windows, a yellow-brick deco front, maison de maître brick fronts with arched kit windows: much closer; the right-hand brown brick house is still a rendered villa |
| Rue Vanderkindere (`vanderkindere`) | -560,-1626 → -470,-1632 | red-brick 1920s-30s fronts 4-5 storeys with white stone bands at sills and lintels, canted oriels, shops | red / cream fronts, same windows | cream deco render fronts with grooved bands and canopies, a yellow-brick deco front with white bands, a dark klinker bel-étage with concrete surrounds; the banding is right, the real street is redder and has oriels on every other house (the palette now gives deco red brick 22 %) |
| Avenue Brugmann (`brugmann`) | -905,-150 → -850,-184 | (Altitude Cent end) a white-painted 19th c. maison with a wrought-iron balcony, eclectic red-brick townhouses with oriels, shops | grey render and red brick, generic | red and yellow brick deco blocks with white bands, light deco renders: reads as 1930s, the real street here is older (1900-14 eclectic): the period draw cannot know it |
| Avenue De Fré (`defre`) | -392,-478 → -445,-469 | red-brick cottage villas behind hedges (left), 1960s white blocks with horizontal window bands and brick blocks (right) | rendered villa, red / beige blocks with small windows | a half-timbered cottage villa, 1960s blocks with balconies and large glazing: the closest match of the set |
| Avenue Coghen (`coghen`) | -650,-935 → -675,-1020 | 1950s-60s red-brick blocks with long white-railed balconies (right), eclectic maisons de maître with bays and a beige 1960s block (left) | grey / beige render, generic windows | red-brick block with big windows, light deco / block fronts with balconies left; the real blocks' balconies are on every storey of the street front (ours only where the face is a "block" and the hash gives balconies) |
| Avenue du Prince d'Orange (`orange`) | 836,1905 → 880,1990 | villas behind hedges and trees, a white rendered villa with a steep slate roof | red-brick and rendered villas, plain | a brick cottage with a timbered, rendered gable (left), the white villa with the kit's sectional garage door and shutters: in character; real gardens are far more overgrown |
| Avenue Winston Churchill (`churchill`) | 330,-1431 → 450,-1412 | 1980s-90s red-brick block with white bands and balconies, beige 1930s-60s blocks with bow windows and balconies | white / dark blocks, small generic windows | large-glazed 1960s blocks with slab edges and rails, a deco block: the massing and glazing read right; the real ones have more balconies / bow windows |

Close-ups (taken during tuning): `type_maitre_deco_coghen.jpg` (maison de maître with the kit's arched windows, oriel,
raised door and steps next to a white deco front with steel windows and canopy), `type_beletage_vanderkindere.jpg`,
`type_block_close_churchill.jpg` (frames, rails, slab bands), `type_blocks_churchill.jpg`,
`type_blocks_balconies_coghen.jpg`, `type_villa_cottage_orange.jpg`.

**Defect eye**: fixed during the round: the dotted moiré of the deco grooves / rustication (they now fade out before
the 7.5 cm / 34 cm pitch falls under ~4 px), balconies and canopies that spanned the air between two wings of one
UrbIS face (now only where the wall stands), the stretched step band (above). Still seen: a faint stair-step on the
deco white bands at grazing angles (box-filtered colour, but the bands are only 16-22 cm), the block slab edges at
grazing angles show a dotted edge on side faces at 40+ m, the painted garage leaf reads flat beyond the kit range.

## 5. Weak spots / leftovers

- **The period is a draw, not a fact.** Only commune-wide shares exist in open data; a street of 1905 eclectic houses
  can get deco fronts (Brugmann). Better: the Inventaire du patrimoine architectural (urban.brussels; dates per listed
  building, Uccle is inventoried) or the cadastre's per-parcel construction year if it becomes open: both would plug
  into `classify` as a per-building period. Not fetched in this round.
- No **rounded corners / bow windows** for deco (UrbIS geometry; would need corner pieces), no oriels on painted fronts
  (the kit's bay is used on maisons de maître only), no wrought-iron balconies on painted (non-kit) fronts.
- Deco / bel-étage / block fronts have **no kit pieces** (3D windows within 115 m): a deco / modern kit set (steel
  windows, aluminium frames, the block door) is the next piece set.
- Garage doors: painted on non-kit fronts, the kit's sectional door on villas; the bel-étage garage could take the kit
  piece if the kit were extended to type 3.
- The interior pilot (`?interior=1`, maison1) and the gardens' door finder were built with the generic grid: a house
  typed maison de maître moves its door up 0.51 m (rebuild `models/interior/maison1` or keep it on ?styles=old).
- GPU A/B on a quiet machine (preflight GREEN) still to do.
