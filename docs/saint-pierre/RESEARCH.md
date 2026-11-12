# Église Saint-Pierre d'Uccle (Sint-Pieterskerk Ukkel) — research for the scripted hero

Parvis Saint-Pierre / rue du Doyenné 71-71a, 1180 Uccle (Uccle-Centre). Heritage inventory: urban.brussels "église
décanale Saint-Pierre", ID 27912 (11801300_A001); protected (classée) since **25 October 1938**. Wikidata Q3583753,
OSM way 226144437 (ref:UrbIS 5015545). UrbIS 3D solid **546128**, BU_ID `building/1594643`, tile **E3**.

## History (sources at the bottom; everything not cited is marked as our own reading of photos / data)
- A first church, probably 13th century, dependent on the **abbey of Forest**; a legend dates a consecration to 804 by
  Pope Leo III (Ucclensia studies it as a legend). Partly rebuilt early 17th c., ruinous by the mid-18th c.
- 1774: restoration entrusted to L.-B. Dewez, accused of mismanaging the works; 1776: after C. Fisco's expertise the
  Council of Brabant recommends a new church. The abbess gives it to **Jean-François Wincqz (1743-1791)**: works begin
  **1778**, consecration **24 September 1782** (Bruxelles Patrimoines 13, 2014, Arter / CIDEP). The heritage inventory
  lists Wincqz as "tailleur de pierre" 1778-1782; Ucclensia (1982) discusses the attribution.
- **1883-84: Jean Baes** "embellishment of the façades" (the portal, the frames as seen today).
- 1894: front and tower rendered and painted ("stone colour" and "imitation brick with fillets"), stripped in 1950.
- 1900-08, 1939-50, 1990: masonry restorations. 1908: Herbeumont slates replace the original Luxembourg slates; 1995:
  main roofs re-slated (Warmifontaine).
- **1938-1950: Guillaume-Chrétien Veraart** adds a **fourth nave** (north) and annexes (sacristies); the same year as the
  protection, after a debate on demolishing / rebuilding (Ucclensia 240-241, 2012). His 1938 drawings: plan n°7
  "façade principale" + "coupe vers le chœur" (in the Arter article, fig. 2).
- **2013-14: Arter** (architects) restoration phase 1: roofs re-slated (main roof new Spanish slates, the fourth nave and
  sacristy with 60 % recovered slates), copper box gutters (chéneaux) replaced, larger downpipes, masonry repairs, lime
  repointing (west front + tower), hydropneumatic cleaning with olivine, woodwork painted with linseed oil (same tint).
  Phase 2 (interior: plasters, paint, stained glass, lighting) followed.
- Interior furnishings (inventory): organ Pierre-Hubert Anneessens 1853 (Loncke 1982), sculpture Louis Godecharle 1814,
  stained glass J.-B. Capronnier.

## Architecture (photos counted façade by façade; see "From the photos")
- Neoclassical **tripartite west front**: red brick in recessed panels framed by white sandstone; blue-stone frames on the
  doors (wiki FR/NL). Lower order: central bay slightly projecting with the main portal — blue-stone piers ending in
  **triglyphs with guttae**, an entablature, a semicircular **fanlight** under an archivolt; side bays each with a smaller
  round-headed door with a fanlight and a rectangular window above in moulded white stone with guttae. Upper order: the
  central bay (the tower's base) flanked by **concave ailerons** and **"pots à feu"** (flaming urns) on the corner piers;
  a rectangular window framed in blue stone; a cartouche.
- **Tower** on the front's axis: square with **canted corners** (octagonal in the NL wiki), red brick with white-stone
  long-and-short quoins, a louvred **abat-son** in a blue-stone frame on each main face, **four clocks** (the west one
  larger, with a drip mould), a dome in copper sheet with standing seams, a turned finial, a cross and a cockerel.
- Body: a single big slate roof over nave + aisles (Veraart's section); the long sides in stone piers and brick panels
  with tall **round-arched windows**; a three-sided apse at the east; Veraart's fourth nave (north) with a hipped roof
  and its own west face (round-arched window between stone piers with urns); low flat-roofed annexes round the chevet.
- Interior (one photo, inventory P04 + Veraart's section): Tuscan columns (grey), round arches, a barrel vault, a
  semi-domed apse with two stained-glass windows, marble floor bands. **Not enough references for a credible interior
  cell: listed as next** (see NOTES).

## Materials (Arter 2014, verbatim facts)
- Bricks in **cross bond** ("appareillage croisé"), hand-moulded: **Spanish format 48 x 115 x 240 mm** on the old parts,
  **Boom bricks 48 x 80 x 173 mm** on Veraart's extensions. Lime joints on the original parts, cement on Veraart's.
- Stones: **petit granit** and **Meuse blue stone**; white **Gobertange** (plinth); white **Savonnières** (pilaster caps,
  vases / urns, sills, consoles); **grès lédien** (Ledian sandstone) facing.
- Roofs: slates (Spanish on the main roof since 2014, hooks in black stainless steel), lead ridge, copper box gutters;
  the dome in copper sheet (the photos: brown, not yet green; the finial green).

## The square (Parvis Saint-Pierre)
Laid out in 1836, named Parvis Saint-Pierre since 26 June 1916 (eBru). A round square ringed by a street and trees
(DSM / orthophoto); cobbled forecourt before the front with chained bollards (c10). In the city the parvis comes from the
measured UrbIS street surfaces (tiles E3 / E4).

## Measurements (UrbIS, CC0) — tools/stpierre_measure.py
- Frame: the 1782 front's footprint edge (19.56 m) gives the axis: rotation -15.12°, origin = its middle (city -708.86,
  -492.50). The church straddles DSM sheets 147165 / 148165 (mosaicked).
- DSM 2021 (0.5 m): ridge **67.7** (u 7-40), roof at the eaves 59.3-59.5 (behind the cornices: box gutters); the fourth
  nave's ridge **63.5** at w -12.4 and the valley 60.0 at w -8.6 (= a symmetric roof whose south half rests on the old
  roof); tower: dome surface 77.7 (edge) to 79.4, peak **81.7** (the finial's bulb); annexes' flat roofs **53.9-54.1**;
  the apse's steep roof outline (u 40.3 → 43.5). UrbIS solid top 82.38. DTM: parvis 49.6-50.2 (west), 48.9-49.3 (east).

## From the photos (camera poses: tools/stpierre_photopose.py)
- **The vertical scale** (the key finding): the inventory photo P02 is rectified; its lower front is hidden by cars.
  The Commons photo c10 (unrectified, EXIF focal) shows the main door 2.38 x taller than wide → **6.3 m** for its 2.64 m
  width, so P02's base lies at y ≈ 1128, not 1085: all P02 heights above the doors scale by 1.14 (cornice 60.83, tower
  cornice 75.46, dial 75.08). This reconciles P02, the DSM tower (dome 77.7-79.4, bulb 81.7) and the UrbIS top 82.38;
  the main cornice then stands 1.5 m above the roof's eave (DSM 59.46): a box gutter behind a parapet (Arter: "chéneau
  principal"). With the EXIF focal and a 1.5 m eye, P02 solves as a level camera **32.8 m** in front (a parked car's
  size gives 31.8 m independently).
- WEST (P02, c10, Arter 2014 front, postcards GP072054 / GP123490 ~1900): counted 3 doors (portal 2.64 m + two
  1.53 m), 2 small rectangular windows, 1 upper window, 1 cartouche, 4 urns on the front (2 corner piers + the two side
  pilasters behind), 2 ailerons, the tower's 4 louvred openings (2 seen), 4 dials (3 seen), the slit window.
- SOUTH (P01): corner pier, bay 1 with a tall round-arched window, a projecting pilaster with an urn (u 6.25-7.53,
  footprint), then 5 bays (footprint 7.53-32.3 → 4.95 m) with tall windows in ~3 m brick panels between wide stone piers;
  the porch (footprint u 17.8-21.6) with a small window; then the annex.
- NORTH-WEST (P03): the fourth nave's west face (one tall round-arched window between stone piers, urns at both corners,
  hipped slate roof), the north wall of the old front bay with a window and an urn pilaster.

## Sources
- Inventaire du patrimoine architectural, urban.brussels: https://monument.heritage.brussels/fr/buildings/27912 (data
  and photos P01-P04; photos used as reference only, no free licence).
- Bruxelles Patrimoines n°13 (Dec. 2014), J. Van Dessel / Arter, "La restauration de l'église Saint-Pierre à Uccle":
  https://patrimoine.brussels/liens/publications-numeriques/versions-pdf/articles-de-la-revue-bruxelles-patrimoines/numero-13/article-13-6
  (text facts; its figures — Veraart's 1938 drawing, 2014 photos — reference only).
- Wikipedia FR "Église Saint-Pierre d'Uccle", NL "Sint-Pieterskerk (Ukkel)"; Wikidata Q3583753.
- Wikimedia Commons: "Église Saint-Pierre d'Uccle 10.JPG" / "11.JPG" (EmDee 2011, CC BY-SA 3.0); postcards
  "Uccle. Eglise St-Pierre, GP072054" and "Uccle. Eglise, GP123490" (KU Leuven, public domain).
- Ucclensia (cercle d'histoire d'Uccle): nos 240-241 (2012, the 1930s debate), the 2004 article on the 804 legend, the 1982
  attribution article (cited, not read in full).
- eBru: Parvis Saint-Pierre street notice.
- UrbIS 3D BuildingSolids, DSM / DTM 2021 0.5 m, orthophoto (paradigm.brussels, CC0). OSM (ODbL) for the identification.
- NOT used: Google Maps / Street View (terms forbid derived models).
