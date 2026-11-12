# Request to Brussels Mobility: marking inventory legend, licences, lane widths

Draft for the owner to send (decision 2, 2026-11-10). Fill in the name and signature. Suggested recipient: the open
data / GIS contact of Brussels Mobility (Bruxelles Mobilité / Brussel Mobiliteit). The general address on
mobilite.brussels and the GeoServer contact in the WFS GetCapabilities
(https://data-mobility.irisnet.be/geoserver/ows?service=WFS&request=GetCapabilities&version=2.0.0) are both
reasonable places to start.

---------------------------------------------------------------------------------------------------

## Français (à envoyer)

**Objet : Couches de marquage routier du WFS de Bruxelles Mobilité : légende, licences et largeurs de bande**

Madame, Monsieur,

Je réalise, à titre personnel et non commercial pour le moment, une maquette 3D de la commune d'Uccle construite
entièrement à partir de données ouvertes (UrbIS, OpenStreetMap). Pour dessiner correctement le marquage au sol, j'utilise
les couches publiées sur votre service WFS (https://data-mobility.irisnet.be/geoserver/ows). Elles sont d'une grande
qualité et je vous en remercie.

J'aurais trois questions, si vous le permettez :

1. **Légende des codes de marquage.** Les couches `bm_equipment:marking_line`, `bm_equipment:marking_polygon` et
   `bm_equipment:marking_point` contiennent des attributs `mark_type` et `mark_symbol` (par exemple L01 à L26, P01 à
   P54, S01 à S10, avec un suffixe P ou R pour le matériau). Existe-t-il une légende ou une documentation qui décrit
   chaque code (type de ligne, largeur, couleur, signification) ?
2. **Licences.** Sous quelle licence les couches `bm_equipment:*` (inventaire du marquage, signalisation),
   `bm_pedestrian:pedestrian_crossing_surfaces_2d` et `bm_network:brr_segments_lanes` sont-elles diffusées (CC0,
   CC BY 4.0, autre) ? Je souhaite citer correctement la source et respecter les conditions d'utilisation, y compris
   si le projet devait un jour être publié en ligne.
3. **Largeur des bandes.** Dans `bm_network:brr_segments_lanes`, le champ `average_width` est-il rempli de manière
   systématique, et si oui, s'agit-il d'une valeur mesurée ? Sur quelles voiries (régionales seulement, ou aussi
   communales) ?

Je reste bien entendu à votre disposition pour tout renseignement sur l'usage que j'en fais.

Avec mes remerciements et mes meilleures salutations,

[Nom]
[Adresse e-mail]

---------------------------------------------------------------------------------------------------

## English (for reference)

**Subject: Road marking layers on the Brussels Mobility WFS: legend, licences and lane widths**

Dear Sir or Madam,

As a personal, so far non-commercial project, I am building a 3D model of the commune of Uccle entirely from open
data (UrbIS, OpenStreetMap). To draw road markings correctly I use the layers published on your WFS service
(https://data-mobility.irisnet.be/geoserver/ows). They are of excellent quality, and I thank you for them.

If I may, I have three questions:

1. **Legend of the marking codes.** The layers `bm_equipment:marking_line`, `bm_equipment:marking_polygon` and
   `bm_equipment:marking_point` have `mark_type` and `mark_symbol` attributes (for example L01 to L26, P01 to P54,
   S01 to S10, with a P or R suffix for the material). Is there a legend or documentation describing each code (line
   type, width, colour, meaning)?
2. **Licences.** Under which licence are the layers `bm_equipment:*` (marking inventory, signs),
   `bm_pedestrian:pedestrian_crossing_surfaces_2d` and `bm_network:brr_segments_lanes` published (CC0, CC BY 4.0,
   other)? I want to credit the source correctly and respect the terms of use, also if the project is one day
   published online.
3. **Lane widths.** In `bm_network:brr_segments_lanes`, is the `average_width` field filled systematically, and if
   so, is it a measured value? On which roads (regional only, or communal ones too)?

I remain at your disposal for any information on how I use the data.

With my thanks and best regards,

[Name]
[E-mail address]

---------------------------------------------------------------------------------------------------

Context for the owner: the layers are fetched by `pipeline/fetch_markings.py` (sources.json "markings"); until the
licences are confirmed, the Brussels Mobility layers are used to build and check the paint and are credited as
"Brussels Mobility" (CREDITS.md); the UrbIS Topo layers on the same WFS are CC0.
