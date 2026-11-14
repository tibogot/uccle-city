# Public art and small monuments in Uccle

Research pass 2026-11-14 (branch `claude/publicart`, no code changed). Data: `data/publicart/inventory.json`
(62 items, real data only, every row with source links). Use it to pick what to model next.

**Sources:** OpenStreetMap via Overpass (area `Uccle - Ukkel`, admin_level 8: artwork, historic=*, fountains,
memorials, springs, clocks, flagpoles); the Brussels movable-heritage inventory, collection *Art en espace public -
Uccle* (collections.heritage.brussels, institution 267: 33 objects); the commune's RCUZ annex 5 art list (5 works,
Lambert 72 coordinates); Wikidata (items in Q203312 with coordinates); Wikimedia Commons; the Centre culturel
d'Uccle walking guide (Topoguide). City metres come from `pipeline/common.py` `wgs_to_local` (x east, z south).

**Scoring:** visibility 1 (hidden, cemetery, forest path) to 5 (main street / square / tram line / roundabout),
judged from the map context. Not checked on Street View in this pass.
Difficulty: easy = geometric / stone / lettering, medium = bust / relief / abstract bronze, hard = full figure.

**Counts (62):** memorial 22 (12 of them plaques or steles), statue 12, abstract sculpture 10, other 8 (milestones,
boundary stones, murals, a bench), fountain 4, bust 4, relief 1, obelisk 1. Status: 49 to do, 1 already modelled
(Square des Heros), 1 outside the commune boundary (Gregala horse), 11 heritage-list items with no position found.
None of the other landmarks already in the city (churches, Observatory, town hall, Wolvendael...) are in this list.

## Recommended build list (top 10)

| # | Item | City x, z | Why | Modelling note |
|---|---|---|---|---|
| 1 | **Dix Monolithes**, Rue de Stalle roundabout | -2240, 376 | Vis 5: the commune's gateway from the Ring, on the tram line; 6 m stones read from far | 7 standing + 3 lying rough blue-stone blocks (1.45 m section, up to 6 m), drill-mark normal detail, one shared stone material. Island raised 0.5 m with cobbles + 2 hornbeam hedges; instanced block variants, ~2k tris. |
| 2 | **La Victoire (the 'V')**, Square Marlow | -651, -280 | Vis 5: Av. Brugmann, tram 92, 200 m from the Heros square | Stainless-steel V on a blue-stone base: pure geometry + bevels, one brushed-metal material. Easiest win. |
| 3 | **Monument Rene Gobert**, Av. De Fre | -503, -440 | Vis 4: next to Square des Heros, reuses its stone library | Small architectural memorial (Chabot) + Witterwulghe sculpture as a low relief / slot; incised inscription from OSM. Check photos for the figure. |
| 4 | **Winston Churchill**, Rond-point Churchill | 318, -1452 | Vis 5: busiest roundabout, trams | Script the stepped blue-stone plinth with the Duff Cooper poem (full text in heritage record 44197) and the dedication. Bronze figure: far block-out + the swappable statue slot (Heros pattern). |
| 5 | **L'Accueil** (Strebelle), Av. Churchill x Chee de Waterloo | 1321, -1435 | Vis 5: big junction island; OSM maps it as an area | Organic bronze: curves -> skin / subdivision from photos (Commons 2004 photo), dark patina. Footprint from OSM way 224918084. |
| 6 | **Zerlina** (Dodeigne), Gatti de Gamond x Av. du Globe | -1528, -618 | Vis 4: busy corner | 2.10 x 0.90 x 0.80 m roughly hewn figure on a 0.65 m base: chiselled block + displacement. Reads as carved stone without fine anatomy. |
| 7 | **Borne 5 km** + milestones 0 / 1 + 2 Charles V stones | 1376, -1320 (5 km) | Vis 4 on Chee de Waterloo, others 1-2 | One scripted milestone kit (rounded stone post + carved numeral), instanced. Listed heritage, nearly free. |
| 8 | **Fountain, Place Jean Vander Elst** (maybe *La Tendresse*, Gaudier) | -1090, -504 | Vis 4: market square | Verify first whether the fountain and La Tendresse are one object (polished black granite on blue stone). Water via the existing water shader. |
| 9 | **Cavell - Depage monument**, Rue Marie Depage | 518, -1582 | Vis 4, well known | Blue-stone pedestal + inscription scripted; winged genius + woman = slot with a far block-out. Same pipeline as Churchill. |
| 10 | **Ukkelbeek borne-fontaine**, Av. De Fre | 216, -574 | Vis 3, 1830s cast iron from the Grand-Place | Lathe-profile cast-iron column, spout, basin. Position from an OSM spring node: verify on site. |

Next tier (vis 3): *Signe* (Willequet, stainless, Square De Fre), the helmeted Albert I bust (Av. Circulaire x
Mercure), the Cavell bust (Av. Montjoie), *Le reveil du printemps* relief (Wolvendael), the Neerstalle war memorial
(verify form), the planet-walk spheres at the Observatory. Forest pieces (Monument aux Forestiers: 43 Commons
photos, dolmen + 11 named menhirs; Memorial 22/03) are easy but only seen by walkers.

## Ranked inventory (all items)

| # | Item | Type | Where | City x, z (m) | Vis | Diff | Status |
|---|---|---|---|---|---|---|---|
| 1 | Dix Monolithes (Ten Monoliths) | abstract sculpture | Roundabout rue de Stalle, entry from the Ring | -2240, 376 | 5 | easy |  |
| 2 | La Victoire - Monument aux evades de guerre (the 'V') | memorial | Square Georges Marlow (Av. Brugmann) | -651, -280 | 5 | easy |  |
| 3 | L'Accueil | abstract sculpture | Junction Av. Winston Churchill x Chaussee de Waterloo (island) | 1321, -1435 | 5 | medium |  |
| 4 | Monument Winston Churchill | statue | Rond-point Churchill (Av. Churchill x Av. Brugmann) | 318, -1452 | 5 | hard |  |
| 5 | Borne '5 km' (milestone) | other | Chaussee de Waterloo (Longchamp) | 1376, -1320 | 4 | easy |  |
| 6 | Fountain, Place Jean Vander Elst (possibly 'La Tendresse') | fountain | Place Jean Vander Elst | -1090, -504 | 4 | medium |  |
| 7 | Monument a Rene Gobert | memorial | Avenue De Fre, beside Square des Heros | -503, -440 | 4 | medium |  |
| 8 | Zerlina | statue | Junction rue Gatti de Gamond x avenue du Globe | -1528, -618 | 4 | medium |  |
| 9 | Monument a Edith Cavell et Marie Depage | statue | Rue Marie Depage x rue Edith Cavell | 518, -1582 | 4 | hard |  |
| 10 | Floor fountain jets, Place Emile Danco | fountain | Place Emile Danco | -844, -146 | 3 | easy |  |
| 11 | Fountain, Chaussee de Saint-Job | fountain | Chaussee de Saint-Job (Saint-Job centre) | 126, 817 | 3 | easy |  |
| 12 | Il ne faut pas rire du bonheur | other | Stalle | -2115, -53 | 3 | easy |  |
| 13 | Mural, rue Jean Benaets | other | Rue Jean Benaets (Saint-Job) | 861, 773 | 3 | easy |  |
| 14 | Planet walk: Terre / Lune | abstract sculpture | Square Charles Lagrange (Pole Espace, Observatory) | 659, -28 | 3 | easy |  |
| 15 | Signe | abstract sculpture | Square De Fre | -67, -621 | 3 | easy |  |
| 16 | War memorial, chaussee de Neerstalle | memorial | Chaussee de Neerstalle (near no. 425) | -2168, 60 | 3 | easy |  |
| 17 | Borne-fontaine of the Ukkelbeek spring | fountain | Avenue De Fre (near no. 66, foot of Chemin de la Source) | 216, -574 | 3 | medium |  |
| 18 | Chais'Art Presse | abstract sculpture | Avenue de la Ferme Rose | -108, -951 | 3 | medium |  |
| 19 | Edith Cavell (bust) | bust | Avenue Montjoie | 589, -1207 | 3 | medium |  |
| 20 | L'Homme et le Temps - Le Cycle du Temps | statue | Rue du Doyenne (near Saint-Pierre) | -668, -548 | 3 | medium |  |
| 21 | Le Combat avec l'Ange | abstract sculpture | Chaussee de Saint-Job (Engeland) | -116, 687 | 3 | medium |  |
| 22 | Le reveil du printemps | relief | Parc de Wolvendael, Allee Paul Auguste Masui | -414, -350 | 3 | medium |  |
| 23 | Monument au roi Albert Ier ('Roi Albert casque') | bust | Avenue Circulaire x avenue de Mercure | 508, 274 | 3 | medium |  |
| 24 | Monument funeraire Jean et Pierre Carsoel | memorial | Parc Montjoie (Av. Churchill 159) | 702, -1290 | 3 | medium |  |
| 25 | Saint Michel | abstract sculpture | Rue Groeselenberg | -48, -418 | 3 | medium |  |
| 26 | Baudouin I, roi des Belges | statue | Square Charles Lagrange (near the Observatory) | 654, -77 | 3 | hard |  |
| 27 | Leon Vanderkindere stele | memorial | Parc de Wolvendael, Allee Suzanne Cocq | -390, 80 | 2 | easy |  |
| 28 | Memorial 22/03 | memorial | Foret de Soignes | 3368, 1259 | 2 | easy |  |
| 29 | Milestone '0' | other | Vert Chasseur | 1824, -90 | 2 | easy |  |
| 30 | Monument aux Forestiers | memorial | Foret de Soignes (Uccle part) | 3821, 3179 | 2 | easy |  |
| 31 | Old milestone '1' | other | Fond'Roy area | 865, 663 | 2 | easy |  |
| 32 | Stele, rue Victor Allard | memorial | Rue Victor Allard (near no. 256) | -1784, -388 | 2 | easy |  |
| 33 | Thyl Ulenspiegel / Charles De Coster plaque | memorial | Wolvendael (near Vieux Cornet) | -441, -454 | 2 | easy |  |
| 34 | Unnamed stone monument (subject: Argentina) | memorial | Avenue de l'Observatoire | 1170, -121 | 2 | easy |  |
| 35 | 11 unnamed sculptures, avenue Guillaume Herinckx | abstract sculpture | Avenue Guillaume Herinckx (Stalle) | -1357, 325 | 2 | medium |  |
| 36 | Bust of Baron Leon Janssen | bust | Parc de Wolvendael, Allee Kurt Peiser | -483, -96 | 2 | medium |  |
| 37 | Je suis la rose de Saron (+3 unnamed sculptures) | abstract sculpture | Avenue Leo Errera | 320, -1180 | 2 | medium |  |
| 38 | Unnamed sculpture, avenue Dolez | abstract sculpture | Avenue Dolez (Verrewinkel) | 481, 2027 | 2 | medium |  |
| 39 | Esclave | statue | Ecole La Cime, avenue Paul Stroobant | -170, 14 | 2 | hard |  |
| 40 | Unnamed metal statue, rue Emile Lecomte | statue | Rue Emile Lecomte | -417, -1330 | 2 | hard |  |
| 41 | Borne de Charles Quint | other | Foret de Soignes | 2577, 1167 | 1 | easy |  |
| 42 | Borne de Charles Quint | other | Saint-Job / Fond'Roy edge | 65, 1154 | 1 | easy |  |
| 43 | MERLO 1865 plaque | memorial | Neerstalle | -2025, 19 | 1 | easy |  |
| 44 | Marc De Ridder - 1990 (obelisk) | obelisk | Sentier du Vuylbeek (forest) | 2873, 2574 | 1 | easy |  |
| 45 | Memorial to the Belgian volunteers of the International Brigades 1936-1939 | memorial | Rue de Linkebeek (Calevoet) | -1407, 2123 | 1 | easy |  |
| 46 | Stele 1830-1930 | memorial | Sentier de Grasdelle (forest) | 3435, 3217 | 1 | easy |  |
| 47 | Dr Hubert Clerx (grave) | bust | Dieweg cemetery | -204, 405 | 1 | medium |  |
| 48 | Tomb of Joseph Jacquemotte | memorial | Cemetery, Calevoet | -1480, 2050 | 1 | medium |  |
| 49 | Le silence de la tombe | statue | Saint-Gilles cemetery (in Uccle, Calevoet) | -1319, 1766 | 1 | hard |  |
| 50 | Monument aux Heros (Ucclois morts pour la patrie 1914-18 / 1940-45) | memorial | Square des Heros | -533, -484 | 5 | hard | already modelled |
| 51 | Le cheval Gregala | statue | Chaussee de La Hulpe, entrance of the Boitsfort racecourse | 3268, 220 | 3 | hard | outside uccle |
| 52 | Bench-tribute to the painter Maurice Guilbert | other | unknown | - | 2 | hard | no position |
| 53 | L'Abondance | statue | unknown | - | 2 | hard | no position |
| 54 | Le Crepuscule | statue | Avenue De Fre (exact spot unknown) | - | 2 | hard | no position |
| 55 | Perroquet joueur de flute | statue | unknown | - | 2 | hard | no position |
| 56 | Memorial Jean Burgers (plaque) | memorial | unknown | - | 1 | easy | no position |
| 57 | Monument Maurice Raindorf (plaque) | memorial | Dieweg x avenue du Wolvendael | - | 1 | easy | no position |
| 58 | Monument aux anciens du Tomberg (plaque) | memorial | Rond-point Charles Solau (not found by Nominatim) | - | 1 | easy | no position |
| 59 | Plaque Andre Didier | memorial | Ecole communale de Calevoet, rue Francois Vervloet | - | 1 | easy | no position |
| 60 | Plaque Jean Druart | memorial | unknown | - | 1 | easy | no position |
| 61 | Plaque Joseph Wauters | memorial | his house (address not given) | - | 1 | easy | no position |
| 62 | Plaque, former pupils of Uccle-Calevoet school killed for the country | memorial | Ecole communale de Calevoet, rue Francois Vervloet | - | 1 | easy | no position |

## Other city-detail ideas the research turned up

- **Embassy flags**: OSM maps 18 national flagpoles in Uccle (Angola, Bulgaria + EU, Gabon, Kenya, Hungary + EU,
  Israel, Ukraine...), mostly in the Churchill / Montjoie / Observatoire villas. The flag kit (`docs/FLAGS.md`)
  could place them from OSM `man_made=flagpole` cheaply.
- **Street clocks**: 5 mapped (two pole clocks Rue Victor Allard at Stalle, two Rue Engeland at Calevoet, one wall
  clock at the Observatory): one scripted 2-face pole clock, instanced.
- **Memorial plaques on facades**: ~12 in the heritage list / OSM (Wauters, Druart, Burgers, Calevoet school,
  Ulenspiegel 1927, tree-planting plaques in Wolvendael): a plaque decal kit (bronze / stone, incised text).
- **Stolpersteine**: 3 in OSM, 15 photos on Commons ("Stolpersteine in Uccle"): 10 cm brass cobbles, a sidewalk decal.
- **Springs and boundary stones**: 8 named springs (Rode Bron, Spellemansbron, Fond'Roy, Roybeek...) in the
  valleys; the 'EB' State boundary block (Av. Houzeau x Square Lagrange); 2 Charles V boundary stones.
- **Murals**: 2 mapped (Johan Muyle 2009 at Stalle; rue Jean Benaets at Saint-Job): wall decals.
- **Cemeteries**: Dieweg (heritage cemetery, Clerx grave by Paul Du Bois) and the Saint-Gilles cemetery at Calevoet
  (Dillens' *Silence de la tombe*, Jacquemotte mausoleum, International Brigades memorial): a funerary kit
  (crosses, steles, small chapels) would dress them.
- Already covered elsewhere: drinking fountains (13, street kit), Square des Heros.

## Gaps and uncertain items

- 11 heritage-list works have **no position**: L'Abondance, Perroquet joueur de flute (the inventory says "possibly
  disappeared"), Le Crepuscule (somewhere on Av. De Fre), Raindorf plaque (Dieweg x Wolvendael), Tomberg plaque
  ("Rond-point Charles Solau" not found), Guilbert bench, plaques Burgers / Druart / Wauters / Calevoet school x2.
- **No wayside shrines or crosses** are mapped in OSM inside Uccle; the heritage list has none either.
- Unidentified OSM nodes: 11 bare sculptures on Av. Guillaume Herinckx (garden / campus?), 3 beside *Je suis la rose
  de Saron* (Av. Leo Errera), a metal statue Rue Emile Lecomte, a sculpture Av. Dolez, an unnamed stone monument with
  subject 'Argentina' Av. de l'Observatoire, steles Rue Victor Allard and Neerstalle.
- *Signe* has no OSM node (square centre used); the Ukkelbeek fountain uses a spring node; La Tendresse vs the
  Vander Elst fountain is unresolved.
- Sizes are published only for the Monolithes, Zerlina, Cycle du Temps, Foresters and Gregala; the rest are estimates.
- Gregala (4.5 m bronze horse, racecourse entrance) is in the Uccle heritage list but falls outside the commune
  polygon (City of Brussels side). The Fontaine du Poete (Bois de la Cambre) is also just outside.
- Visibility scores come from map context only: check the top 10 on Street View before building (look only).
