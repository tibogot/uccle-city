# The castle on the Geleytsbeek: Papenkasteel / Chateau de Stalle (Rue Papenkasteel 99, Uccle): the scripted hero

## What it is (identification, 2026-11-16)
The owner asked for "Kasteel / Chateau de Geleytsbeek". **No building has that name**: OSM (Overpass, all of Uccle), Wikidata
(only the stream Q2566961 and the street Q85622672), the heritage inventory (rue Geleytsbeek 2-250: houses, no chateau),
fr/nl Wikipedia and the 1986 "Chateaux d'Uccle" booklet have none. The castle ON the Geleytsbeek is the **Papenkasteel**
(Chateau de Stalle, Chateau de Pape, Chateau Franckheim): built 1685-1688 for Philippe-Vincent Franckheim, reworked in the
19th century (neoclassical, white render over the brick), roof restored 1967 (the tower's bulb lost then, restored later),
listed 16 Oct 1975 (inventory 27820, Baroque / Neoclassicism), private residence; its pond is "the last pond fed by the
Geleytsbeek" (fr.wikipedia "Chateau de Stalle"; nl "Papenkasteel"). The coordinator agreed (switch ?papenkasteel=0, alias
?geleytsbeek=0); the owner will be asked whether he meant another building (Nekkersgat mill, a villa on the stream).

Replaces UrbIS solids (tile E7) **528339** (the house + tower + the two low annexes + the north-east extension, BU_ID
building/1726277) and **528019** (the outbuilding range on the courtyard's south side + its wing, BU_ID null).

## Sources (looked at; nothing stored in the repo, temporary downloads deleted)
- Heritage inventory 27820 (monument.heritage.brussels): photos P01 / P02 (through the street gate: the drive, the tower,
  the low white outbuildings) and P03 = a **Bing Maps oblique 2014** from the SSE (the whole courtyard front, tower top,
  roofs, chimneys, dormers, the range).
- urban.brussels booklet "Les chateaux / De kastelen" (Bruxelles ville d'art et d'histoire): the text ("bakstenen metselwerk
  ... onder een (oorspronkelijk) witte pleisterlaag; aan de tuinkant komen de ramen bijna tot op de grond; het binnenplein
  ... omsloten door diverse gebouwtjes"; symmetry of tower and house; wall anchors) and an **aerial "huidige toestand"**
  (Schmitt-GlobalView) from the south: the tower's stone bands, the bell + bulb, dormers, chimneys.
- Wikimedia Commons "Stalle Castle": **Paepenkasteel.1972.jpg** (Guywets, public domain: the tower close, the bands, quoins,
  frames, anchors, putlog holes, bell and oeil-de-boeuf), the 1694 print and an engraving (historic layout only).
- Measured: UrbIS 3D solids + DSM / DTM 2021 0.5 m (CC0), `tools/papenkasteel_measure.py` (a MOSAIC of sheets 147163/4 +
  148163/4: the castle straddles E 148000; tools/hero_prep_measure.py read one sheet and clamped the west half).
- Not yet: Google Street View / Maps 3D (look-only) on the browser turn: the street gate, the garden side from the park.

## Frame (site.json)
Origin city (-636.999, 1153.750), rotation -33.142 deg. u along the main range's courtyard front (u+ = ENE), w across
(w+ = the courtyard, SSE). Blender x = u, y = -w, z = TAW - 40.

## Measured (DSM / DTM 2021, m TAW)
- Ground: courtyard flat 49.40-49.60; the lawn (NW) 48.9-49.1; behind the range (S) 52.4 (the range is dug into the slope).
- House (main range) u -12.10..9.15, w -9.20..1.50 (21.25 x 10.7 m): hipped slate roof, ridge **64.6** (DSM 64.5-64.8),
  51 deg with a bell-cast eave (the DSM flattens to ~35 deg over the last metre: the coyau); wall top 58.30 (two tall
  storeys: floor 49.75, 1st floor 54.05).
- Tower u -4.04..1.56, w -3.00..2.93 (5.6 x 5.9 m, 1.43 m proud of the front): walls to 67.0 + cornice; bell roof (DSM 69.4
  at 0.5 m in, 70.2 at 1 m, 70.6 at 1.5 m); bulb top **72.9** (DSM max at the centre); spike to ~74.4 (UrbIS top 74.38).
- West annex u -12.10..-7.80, w 1.50..9.20; east annex u 5.80..8.80, w 1.45..8.10; NE extension u 9.10..12.13,
  w -8.98..-2.21: one storey, wall top 52.85, hips 32 deg, ridge 54.2 (DSM).
- Range u -20.90..9.47, w 21.50..28.80: wall top 54.85, 50 deg, ridge **59.2** (DSM 59.0-59.2). Its wing u -17.80..-11.25,
  w 13.50..21.50: two storeys, wall top 54.95, a low 24 deg hip, ridge **56.4** (DSM).

## Facade by facade (what is seen / ESTIMATED)
- COURTYARD FRONT (Bing, aerial): the tower centred; door round-arched with a fanlight and stone voussoirs; four windows
  above; two window bays each side of the tower on both floors, a first-floor window over each annex; two dormers on the
  front slope (symmetric about the tower).
- TOWER (1972 photo): red brick with a single course of white stone every ~1.45 m ("briques en bandeau"), small alternating
  quoins, narrow stone frames with alternating jamb stones and a lintel, two-leaf casements (4 panes per leaf), vertical
  iron anchors beside the windows, three square holes in stone frames under the corbelled cornice; a window on each side
  face and the back at the top level; bell with an oval oeil-de-boeuf per face; slate bulb cupola (Bing 2014 / aerial) with
  small urns at its foot, ball, spike, vane.
- WEST END (Bing): three bays, tall windows (ivy not modelled).
- GARDEN FRONT (NW) and the EAST END / NE extension (under the plane tree): **ESTIMATED** (7 bays of French windows about the
  tower axis - the booklet: windows almost to the floor -, 2 dormers; the east end 3 + 1 windows).
- Chimneys (Bing, aerial): two behind the ridge to the east, one on the west hip (positions within ~1 m).
- Annexes, range, wing: roofs measured; their openings **ESTIMATED** after the type (the range: a carriage door, windows,
  mezzanine windows; three courtyard dormers and two small back dormers as in Bing 2014; its back wall in brick).
- Not modelled: the two tiny dormers low on the west hip (aerial), the gate piers with ball finials and the cobbled drive,
  ivy, the parterre, the pond (OSM/landcover pond is the city's own).

## Pipeline
```
python tools/papenkasteel_measure.py [--dump] [--png out.png]                 # site.json, site_dtm.* (DSM/DTM mosaic)
"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/papenkasteel.py -- models/papenkasteel [--no-bake] [--previews] [--checker] [--fast] [--only=view,..]
node tools/papenkasteel_pack.mjs models/papenkasteel/papenkasteel.raw.glb models/papenkasteel/papenkasteel.glb   # audit, LOD2, meshopt
python tools/textures/ao_ktx2.py --force papenkasteel                         # the AO as BC4 KTX2 (+ viewer/aoKtx2List.js)
python tools/papenkasteel_sheets.py                                           # docs/geleytsbeek/sheet_*.jpg (render + words)
```
Blender ~15 s (AO bake 5.5 s on **OptiX**, 96 samples, 2048 px), previews ~1.5 min; pack ~25 s (mostly the audits).

## Model
- Slots (10): render_white, brick_red_brussels, stone_white, stone_blue, slate, zinc_roof, wood_frame_white, wood_frame_dark,
  cast_iron_dark, glass_window. No colour in the GLB (COLOR_0 = code / vertex AO / region width; UV0 world metres).
- Walls as quad grids round the openings (arches: strips from the arc, clipped per band row); reveals 26 cm; small-paned
  casements, French windows with transoms, panelled doors, fanlight with radiating bars; flat painted surrounds on the house,
  stone frames on the tower; blue-stone plinths and sills; wrought-iron anchors.
- Roofs: one sweep per roof with TRUE per-plane UVs (slates undistorted on hips); the house's bell-cast eave on a moulded
  cornice; annex roofs pushed into the house and CLIPPED at its wall (no overhang past a flush wall); hip / ridge rolls as
  continuous flat 16-sided tubes with knobs at the ends; dormers with slate cheeks and gable roofs; brick chimneys with
  stone caps; half-round gutters, downpipes.
- The bell: a Catmull-Rom profile sampled finely (turn < 3 deg per strip: no bent normals), hips kept sharp.
- LODs: LOD0 **51,060** tris / 10 draws; LOD1 (scripted far variant) **13,702** / 10; LOD2 (meshopt of LOD1) **4,721** / 10.
  GLB 1.87 MB (raw 5.7 MB); AO PNG 2.2 MB, KTX2 1.2 MB. Lightmap LOD0 18.9 px/m, far 11.1 px/m. Switch: LOD0 < 80 m (+-15),
  LOD1 < 350 m (+-35), then LOD2; the far level goes through viewer/farMerge.js (userData.farBase / farAO kept by wrapAO).

## Mesh audit (tools/mesh_audit)
Raw: LOD0 **0 blocking** (51,060 tris; warnings: slivers, T-junctions, non-manifold box joints, as the other heroes), far
**0 blocking**. Four rounds: window surrounds vs reveals, smooth rolls -> flat tubes, the coarse bell -> spline, a flush annex
wall, fascia welded to the eave edge, plinth tops at different heights where parts meet, fanlight bars from a hub.
Packed (report only): LOD0 5 (quantization at a ridge knob), LOD1 0, LOD2 27 (glass / frame collapses beyond ~385 m).

## Viewer
`viewer/papenkasteelModel.js` (loader, slots, temporary TSL materials, AO, anti-sparkle, LOD fades),
`viewer/papenkasteelCity.js` (hides the two solids, background compile + shadow warm, far merge). Registered in main.js,
features.js (`papenkasteel`, alias `geleytsbeek`), places.js (Go to "Papenkasteel (chateau de Stalle)"), heroColliders.js,
contactAudit.js, drive/collisionTest.js, falconFlight/cityFlyer.js, bootGate.js, aoKtx2List.js.

## Browser checks still to do (BROWSER TURN)
Load, draws / GPU A/B (?papenkasteel=0), LOD hand-overs moving, street / park / above / night views,
`viewer.contactAudit("papenkasteel")` (joins), colliders (walk into the courtyard), Street View look-only for the gate side.
