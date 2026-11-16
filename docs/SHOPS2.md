# Shops of Place de Saint-Job, round 2 (branch claude/shops2, 2026-11-16)

Owner: "a local must recognise the shops". Method as docs/CITYDEFECTS.md "SHOPS OF PLACE DE SAINT-JOB": Google Street View
(newest date, both ways) and the shops' own Google listing photos, LOOKED AT only (nothing traced, stored or shipped); the
city seen in the browser with `debug/shops2Shots.js` (`s.shop(id, { dist, side, h, th, fov })` parks the camera in front of
a street-life POI). Images: `docs/shops2/` (city only; the Street View comparison is described in words below).

## Data finds (fixed)
- **Place de Saint-Job 22 did not exist in the city.** UrbIS solid 553980 (BU 1584080, Maison Dandoy's house) is a NULL
  shape in the BuildingSolids SHP; a lawn and a "tree" stood in the row (the CHM saw its roof as a 13 m tree), and OSM's
  Dandoy point landed on n. 23 (Lefevre's house). **631 of the 41,231 UrbIS solids of the Uccle sheets are null shapes**
  (same story elsewhere: e.g. Place de Saint-Job 38, Av. Dolez 54, Rue de Wansijn 22 / 25, Av. Carsoel 44; list by
  reading the SHP: shape type 0). New `tools/infill/infill_buildings.py` + `data/overrides.json infillBuildings`: a gable
  solid between the neighbours' party walls, heights from the UrbIS DSM 2021 profile (eaves 81.1, ridge 84.1), appended
  to `data/tiles/I5/buildings.{json,bin}` (idempotent; orient_buildings --dry: 0 flips; wall audit: no partial wall),
  the CHM tree dropped (features.json treesDropped). stjob22_infill_before / _after.jpg.
- **White Night is OPEN** (Google listing: a review two weeks old) and it is not in the white house: it is the LOW
  one-storey wing of n. 662 (UrbIS solid 541080, eaves 3.5 m), set back behind trees, its front facing the paved lot to
  the east. The 662 house's ground floor is **Bioffice Cleaning & Facilities** (Jul 2024); vrac&compagnie there is
  permanently closed (listing): replaced (extra POI `_replaces`). The builder got `_anySide` (a front on a forecourt,
  not on the street). A generated garden bed stood in front of the shop: `plantsClear.white_night_lot`.
- The vet (Eric Strebelle) sat on the side of its building facing the lawn: moved (`_moves`) onto the Place front, left
  of Le Relais (Street View Oct 2020: blue CABINET VÉTÉRINAIRE panel there). vet_wrong_face_before.jpg -> relais_vet_after2.jpg.
- New extra POIs from Street View Jul 2024 (positions = UrbIS address points): Bois Savanes (24), Lefevre (23), Canon
  (26), Le Palais de la Truffe (27, open per its listing), Bioffice (662).

## Per shop (Street View comparison in words; city image)
| shop | Street View (newest) | city now | image |
|---|---|---|---|
| Maison Dandoy, n. 22 | Jul 2024: white-painted brick house, iron balcony; black awning over the whole front, the round DANDOY stamp in beige on the slope, MAISON DANDOY beige spaced capitals on the valance; black frames, black A-board, a tall picture banner | the rebuilt white house; black steep awning (38 deg) with "Maison Dandoy / depuis 1829" in beige on the slope (readable from the pavement), MAISON DANDOY spaced capitals on a taller valance, black frames, A-board, a tall beige DANDOY banner (the real one is a picture) | dandoy_after2.jpg (dandoy_first_try.jpg: the 28 deg slope was mush from eye height) |
| Lefevre, n. 23 | white board, "Funérailles - Begrafenissen" heavy black italic; black frames; small black LEFEVRE plate; notices in the window | same; an office interior (not shelves) | row21_25_after.jpg |
| Bois Savanes, n. 24 | black front + canopy, BOIS SAVANES gold flared capitals, two lamps, RESTAURANT THAÏ TRAITEUR small gold on the black band | same (flared font, gold ink, spots, the band over the glass), no blade sign; red-brick house | row21_25_after.jpg, night row21_25_night.jpg |
| Alain Dantine, n. 25 | white board, the name in a big black script, KÉRASTASE small, spots, anthracite frames | same | row21_25_after.jpg |
| Canon, n. 26 | black fascia, CANON white display capitals, red-brick house with iron balcony | same | row25_28_after.jpg |
| Le Palais de la Truffe, n. 27 | Jul 2024 papered "ouverture prochaine", grey frames; open now | grey frames, the name on a plain board (its real sign not seen: TO CONFIRM) | row25_28_after.jpg |
| Uccle Flore, n. 28 | bordeaux awning, UCCLE FLORE white serif capitals on the valance, blue-stone pilasters, buff brick | same (valanceFill: big capitals) | row25_28_after.jpg |
| Le P'tit Rêve, n. 21 | sky-blue painted board, "le p'tit rêve" white script, red-brown frames, grey render | same | dandoy_after2.jpg |
| White Night, 662 (wing) | Listing photos: white-painted low wing, long band WHITE (black on white) / NIGHT (white on black panel), black frames, Lotto flags; Jul 2024 Street View: set back behind trees, EuroMillions feather flag | same, lit at night (both halves) | whitenight_after.jpg, whitenight_night_after.jpg (first tries: _first_try) |
| Bioffice, 662 | navy board, white lettering, cream house | same, office interior | bioffice_after.jpg |
| Proxy Delhaize | Jul 2024: red-brick block, windows covered with Proxy posters; Apr 2019: black band over the entrance with a small white Proxy panel, a tall red PROXY blade | red brick (look), black band + white Proxy plaque, tall red vertical blade at the first floor | proxy_after.jpg, proxy_blade_after.jpg |
| Le Relais Saint-Job (corner, n. 3) | Oct 2020: TWO first-floor windows, each under a small taupe awning (TRAITEUR / VINS) | two painted windows (buildingLooks 559047 `bayScale`), the small awnings over their heads | relais_vet_after2.jpg (relais_2windows_awnings_low.jpg: first position, too low) |
| Eric Strebelle (vet) | Oct 2020: red-brick house left of Le Relais, blue CABINET VÉTÉRINAIRE panel | on that front now | relais_vet_after2.jpg |
| La Branche d'Olivier (E7, Rue Engeland 172-176) | Apr 2024: cream-rendered house, brown tiles; black glazed veranda with "Bistro Gourmand" big white serif letters, the name in a cream script on a black board over it; wooden planters with box hedges, an olive tree in a planter | cream render (look), black front "Bistro Gourmand", the name in script above, wooden hedge planters along the terrace; NO parasols (two LiDAR trees stand in the terrace: their crowns cut the canopies) | branche_olivier_after.jpg (_first_try, _parasols_in_trees) |
| Sushi Sama (Av. Carsoel corner) | Mar 2021: white-painted house, black fascia SUSHI SAMA wide white capitals | same, white look | sushisama_after.jpg |
| Pasta Commedia | Mar 2021: coral-painted house, red awnings with PASTA COMMEDIA, timber-fenced terrace with a hedge | red awning + name, hedge planters terrace | pastacommedia_after.jpg |
| Le Passage | Apr 2024: light red-brick new building, grey frames, navy board with "Le Passage" white script | same (look red brick) | (not shot) |

Building looks added (data/overrides.json buildingLooks, ?looks=old): n. 21 grey render, 22 white (infill), 23 / 24 / 26
red brick, 25 / 27 white, 28 buff, Proxy's block red brick, 662 cream, Sushi Sama white, Le Passage red brick, La Branche
d'Olivier cream; Le Relais' corner `bayScale [1.22, 0.84, -0.54]`.

## Kit / tool additions (all curated-only: no change for uncurated shops)
- `viewer/shops/shopLayout.js` curated `front` keys: `sign` (text / lines, "" = plain board), `font`, `board`, `signFill`,
  `plaques` [{u, w, h, dy, text, board, ink, font, fill, glow, boardGlow}], `subSign` [text, board, ink, font, h] (a band
  over the glass), `blade` {text, board, ink, w, h, y, vertical, font} or `false`, `awningInk`, `awningDeg`, `awningOut`,
  `valanceH`, `valanceFill`, `tall` (UrbIS eaves is the LOWEST roof point: a rear annex made 4-storey houses "low", fascia
  at 2.55 m and no spots), `interior` (atlas type).
- `viewer/streetlife/sdfText.js`: shopScript, shopCaps (spaced serif capitals), shopFlare, shopHeavyItalic (system fonts
  with fallbacks).
- `viewer/facadeGeom.js` look `bayScale [s, nx, nz]`: the face facing (nx, nz) lays its painted window grid out in u x s
  (2.6 m bays -> more windows on a narrow front); the kit and the type's details stay off that face; the shop span and
  `litWindows` (viewer/nightLights/litHash.js `us`) follow. Worker bundle rebuilt.
- `tools/streetlife/build_streetlife.py`: `--pois-only` (rewrites only the shops of the tile files: a full rebuild moves
  numbers / plates / stops by centimetres since the tiles changed; a city-wide rebuild is its own job), extra POIs
  `_moves` (an OSM point on the wrong house) and `_anySide`.

## Defects seen, LEFT
- 631 null UrbIS solids city-wide: only n. 22 rebuilt. Run an audit (which ones are houses in a row = a visible gap) and
  infill them the same way (Place de Saint-Job 38 is next to La Meute / the butcher).
- White Night's forecourt is lawn in the city (asphalt with grass strips in reality): land cover.
- Uccle Flore: an ivy (data/plants I5.ivy) grows over its shop window; ivy should keep off shopfronts.
- Pasta Commedia's house is coral-painted (no pink wall style), the classic surround keeps an empty fascia band over the
  awning; "Loup & Moi" next door is dark grey (yellow brick in the city).
- Le Palais de la Truffe's real sign; Le Touring (Moroccan, Av. Carsoel, navy awning) not in OSM; Thai Smile, Botanea,
  Le refuge, Miska, The Cacao Tree not re-checked this round.
- Le Relais' small awnings are thin from below (box slabs); the brasserie wall's render is fine.
- Proxy's windows are covered with Proxy posters in reality (clear glass + shelves in the city).
- **TRAFFIC CRASH (not shops):** teleporting the camera I6 -> E7 in one page threw `TrafficSim.accel: Cannot read
  properties of null (reading 'speed')` (viewer/traffic/trafficSim.js:403, `W.slots[p >>> 16]` null: a car still on an
  unloaded tile's lane graph). Reloading at E7 was clean.
- The tile files changed (buildings.bin / .json of I5, streetlife I5 / I6 / E7): run pipeline/build_manifest.py before a
  deploy so no cached copy is served (not done here: it restamps every tile).
