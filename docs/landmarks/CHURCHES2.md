# Churches round 2: the Russian Orthodox church of Saint-Job and Notre-Dame du Rosaire

Branch `claude/churches2` (worktree `uccle-churches`), 2026-11-13. Two scripted hero landmarks on the Saint-Pierre
pipeline (measure script -> Blender 5.0 headless -> `tools/hero_pack.mjs` -> viewer module + city module), each in place
of its UrbIS solid, both ON by default.

| | Russian Orthodox church of Saint-Job | Notre-Dame du Rosaire |
|---|---|---|
| switch | `?russian=0` = the UrbIS solid back | `?rosaire=0` |
| UrbIS solid hidden | 544400, BU_ID building/1692242 (tile F4) | 542948, BU_ID building/1720868 (tile I2) |
| scripts | `tools/russian_measure.py`, `tools/blender/russian.py` | `tools/rosaire_measure.py`, `tools/blender/rosaire.py` |
| viewer | `viewer/russianModel.js`, `viewer/russianCity.js` | `viewer/rosaireModel.js`, `viewer/rosaireCity.js` |
| model | `models/russian/` | `models/rosaire/` |
| triangles LOD0 / LOD1 / LOD2 | 30,075 / 12,036 / 1,801 | 10,256 / 6,232 / 1,555 |
| draws | 7 a level (14 inside a cross-fade band) | 7 a level |
| LOD switch (m to the box) | 80 (+-14), 320 (+-40) | 110 (+-18), 420 (+-50) |
| GLB / AO map | 0.96 MB / 2.5 MB (2048 px, 22.5 px/m on LOD0) | 0.45 MB / 2.4 MB (2048 px, 13.5 px/m) |
| slots | brick_painted_white (new), stone_blue, copper_brown (Saint-Pierre's new name), zinc_roof, wood_frame_dark, glass_window, cast_iron_green (codes gilt, mosaic) | rubble_stone (new for the library; the police station uses the same slot name), stone_blue, slate (the library's scan), zinc_roof, wood_frame_dark, glass_window, cast_iron_green |

Rebuild: `python tools/<name>_measure.py`, then
`"C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/<name>.py -- models/<name> [--previews] [--views=a,b]`,
then `node tools/hero_pack.mjs models/<name>/<name>.raw.glb models/<name>/<name>.glb <lod1 tris> <lod2 tris> --name Russian|Rosaire`
(Russian 12000 1800, Rosaire 6000 1500). The AO bake uses half the CPU threads (another agent shares the laptop).

## Sources (photos looked at, nothing traced, stored in the repo or shipped)

Wikimedia Commons, category "Russian Orthodox church of Saint Job, Uccle": Melioratif 2017 (CC BY-SA 4.0, the west front,
frontal), N.astier 2016 (CC BY-SA 4.0), Luc Viatour (CC BY-SA 3.0, frontal, used to calibrate the tiers), Silbel 2015
I-VI (CC BY-SA 4.0: the drum, the portal, the mosaic, the belfry and annex from the south-west), Bescherelle 2008 (public
domain), Napoleon Vier 2005 (CC BY-SA 3.0), Grentidez 2018 (CC BY-SA 4.0). History: nl.wikipedia "Herdenkingskerk
Sint-Job" (N. Istselenov, first stone 1936, near-finished 1938, consecrated 1950, protected 1984; after the side chapels
of the Transfiguration church at Ostrov).
Category "Church of Our Lady of the Rosary, Uccle": August Dominus 2025 (CC0, the north front frontal), Grentidez 2018
(CC BY-SA 4.0), five panoramio views 2009-2011 (CC BY-SA 3.0: the east side with the cross gables, the apse, the interior).
Measured data: UrbIS 3D BuildingSolids + DSM / DTM 2021 0.5 m (CC0), the UrbIS orthophoto 2024 (CC0, looked at to read the
plans), OSM ways 225781830 / 224918682 (ODbL).

## Russian Orthodox church of Saint-Job

**Measured.** Frame: the OSM west-front edge (the OSM outline is the wall line; UrbIS is ~0.35 m larger, the cornice).
Main body 11.54 x 12.83 m (OSM). Cornice 60.3-61.2 (UrbIS wall top 60.79; ground 48.2-48.4 at the front). Drum axis
(u 6.04, w 0.12) and radius 2.48 (UrbIS rings, least squares), drum top 68.53 (UrbIS). Onion apex 73.25 (DSM 73.5 at the
ball). Tier spacing from UrbIS (tier 1 tops 62.99-63.66) and the Luc Viatour frontal calibrated on the cornice and the
onion's base / apex (51 px/m): tier-2 cusps 63.6, tier-2 tops 65.1 (UrbIS LoD2 flattens the stack to 64.3). Apse: OSM
bulge (to u 16.4) and the UrbIS half-cone (56.6 -> 58.16). Link roof 52.21, annex hipped roof 57.97 / 59.89 (turned 30
deg), belfry: octagon round (17.17, 12.07), tent 60.28 -> 66.87 (DSM 66.49).
**From the photos.** Pilasters (corner 0.85, inner 0.62 m), three kokoshniks a side in two tiers with white archivolts
and copper hoods, the drum's blind arcature + diamond band + four windows, the onion's profile (widest at a quarter of
its height, a long taper) with 24 standing seams, the gilt ball and three-bar cross with four guy chains, the portal
(three-order round arch on colonnettes, the gold mosaic tympanum, panelled door, five blue-stone steps, handrails), the
shell oculus (24 flutes), slit windows and small barred windows, the belfry's eight arched openings.
**Estimated** (`russian.json` "estimated"): the north / south windows (the front's types), the apse's three lights, the
annex's windows and hidden corner, the link's door, the belfry's lower shaft, the wall thicknesses (reveals 0.3 m).

**Compared with the photos (in words).** West front (Melioratif / N.astier frontals vs `russian_west.jpg`,
`russian_city_west.jpg`): same three bays and pilaster rhythm, the oculus centred over the portal, the slits and low
windows at the photo's heights; the kokoshnik stack now reads as two clear tiers with the drum rising behind (the first
build, on UrbIS heights alone, hid tier 2: fixed from the calibrated frontal). The onion is a little fuller at the base
than the photos' and the photos' brown copper is slightly redder; the photos show a white fence with green railings and
pyramid-capped piers along the street, NOT modelled. South-west (Silbel VI vs `russian_southwest.jpg`,
`russian_city_southwest.jpg`): the belfry stands right of and behind the front with the low link between, as in the
photo; the belfry's tent is the right dark copper but its bell stage in the photo shows three openings per visible side
of a near-round plan (the model: one per octagon face).

## Notre-Dame du Rosaire

**Measured.** Frame from the OSM side walls (76.15 deg) and the front line between the towers; the front faces north on
Avenue Montjoie. Nave 22 x 45.25 m (OSM w +11.00 / -10.95). Eaves 117.0 (UrbIS), ridge 128.2 (DSM 128.0-128.2), six cross
gables a side every 6.9 m (DSM ridge pattern) with apex 120.5 (UrbIS 120.0-120.3). North-east tower 6.8 m square (OSM),
eaves 141.7, apex 151.1 (UrbIS 151.14, DSM 150.98). North-west stair tower 4.6 m square, eaves 124.8, apex 131.1.
Choir + apse: half a dodecagon of radius 8.0 round (52.4, 0) (OSM), eaves 113.6 (DSM), ridge 124.3 (UrbIS). South-east
annex roof 108.0 (UrbIS). Ground: front 102.0-103.2, east side up to 106 (the lower windows follow the ground).
**From the photos.** The north front: gable to the ridge with a stone cross, five tall stepped windows, an oculus, three
pointed blue-stone portals with tympana and panelled doors, the flight of steps with cheek walls; the tower: corner
pilasters, string courses, slit windows, two tall louvred openings a face, four corner turrets with small spires, the
set-back top stage, the slate pyramid with a gilt ball and vane; the cross gables with two tall and two low windows a bay
and buttresses between (east side photos).
**Estimated:** the west side (as the east), the apse windows, the annex's openings, the towers' back faces, the front's
window heights and portal sizes (frontal at ~42 px/m calibrated on the floor and the gable apex), the tympana as plain
blue stone (the reliefs are not modelled), the wall thicknesses (reveals 0.35-0.4 m).

**Compared with the photos (in words).** North front (August Dominus 2025 frontal vs `rosaire_north.jpg`,
`rosaire_city_north.jpg`): the tall tower on the left, the gable with five stepped windows and the oculus, three pointed
portals over the steps, the small tower on the right with its steep spire: all in the photo's places. The real tower is
more articulated (recessed vertical panels between the corner pilasters, the louvred openings in deep frames) and its
corner turrets sit a little lower against the main spire; the stone in the city (temporary rubble material) is close to
the photo's grey-ochre, a touch more contrasted. East side (panoramio "avant le coucher du soleil" vs
`rosaire_east.jpg`, `rosaire_city_east.jpg`): the six cross gables, the paired tall windows and the apse at the south end
match; the photo's apse roof has small dormers and the side walls more varied window heights (not modelled).

## Checks

- **Mesh audit** (`tools/mesh_audit/cli.mjs`, ranges = LOD band ends): Russian LOD0 0 blocking with 11 accepted items
  (`models/russian/audit/russian.allow.json`: the drum's and the apse's window panels are curved walls wrapped on the
  cylinder; their chord triangles carry the cylinder's smooth normals, 3-4 deg off their planes); Russian far 0 blocking;
  Rosaire LOD0 and far 0 blocking, no allow list. Packed LOD1 audits are reports only (as the README says: meshopt's
  simplification adds streak / bentflat items on every hero). Fixes that got there: construction groups never smooth
  across each other (a group-border edge is always sharp), flat-shaded copper sheets on the hoods and roofs, the mitred
  kokoshnik hoods (corner hoods meet on the diagonal), copings past the apex, roof slabs under the copings, alternating
  depths where two copings / bars meet, rod ends capped, the far variant flat-shaded.
- **Contact (JOINS)**: `viewer.contactAudit("russian")`: 0 floating, 0 overhang; `("rosaire")`: 0 floating, 0 overhang,
  9 "opening" infos (window sills and the steps' cheek walls, not ground joins). Walls and steps go below the DTM.
- **Colliders** (`viewer/heroColliders.js`, from LOD0): Russian 30,075 triangles + 262 car blocks; Rosaire 10,256 + 458.
  `viewer.collisionTest("F4")` (static): nothing near the church (the 3 tile items are elsewhere).
- **LOD**: camera flown out 20 -> 560 m: dithered cross-fades only inside the bands (Russian 66-94 and 280-360 m, Rosaire
  ~130-150 and 410-490 m), no pop.
- **Cost**: draws / triangles above. GPU ms NOT measured: `tools/perf/preflight.ps1` said RED (another agent on the
  laptop). Boot: the model loads in ~0.2-0.5 s in the background; its shaders go through the page's precompile queue.

## Shared files touched (for the merge; the Saint-Augustin agent may touch the same lists)

- `viewer/main.js`: two imports after `import { addStPierre } from "./stpierreCity.js";` and two calls right after the
  `addStPierre(...)` line (`?russian=0`, `?rosaire=0`).
- `viewer/heroColliders.js` `HERO_ROOTS`, `viewer/contactAudit.js` `HEROES`, `viewer/drive/collisionTest.js` `HEROES`:
  `"russian", "rosaire"` after `"observatory"`.
- `viewer/falconFlight/cityFlyer.js` (the height proxies list): `"russian", "rosaire"` after `"calevoet"`.
- `.gitignore`: the two models' raw GLBs and audit JSON.
- New files only otherwise. `tools/blender/stpierre_common.py` is used unchanged (the group-tagging lives in each script).

## Left

- The Russian church's street fence (white piers with pyramid caps, green railings, the gate) and the forecourt paving.
- Rosaire: the tympanum reliefs, the tower's recessed panels, the apse roof's dormers, the west side's real windows.
- Library materials for `brick_painted_white` and `rubble_stone` (temporary TSL versions now; the shipped `slate` is used).
- GPU timing on a quiet machine (preflight GREEN).
