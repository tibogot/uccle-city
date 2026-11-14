# Street kit: Belgian road signs, street-name plate posts, Villo stations (branch claude/streetkit, 2026-11-14)

Kit 4 ("signals and signs", the sign half) of `docs/assets/STREET_KITS.md`, plus the premium Villo station (the
"Villo dock (exists: upgrade)" left over by kits 3 / 5). Built like furniture kit 2 (`docs/assets/FURNITURE2.md`).
**On by default.** `?streetkit=old` gives back the city as it was: no road signs at all, the street life's own Villo
(boxy terminal + bollard docks) and its plain plate posts.

## What existed before

| what | where | before | now |
|---|---|---|---|
| road signs | nowhere | none (only painted markings: give-way teeth, stop lines, zebras) | 1,792 poles with 1,838 plates from the OSM data and the Belgian code |
| street-name plates | `viewer/streetlife/` (layout.js plates, sdfText.js plateUccle) | already bilingual FR / NL with "Uccle - Ukkel" from the real data (2,155 plates); the free-standing ones (782) on a plain 3.5 cm JS cylinder | the enamel plate and its text stay in the street life layer (one label, no decals); the 782 posts are now the kit's galvanised 60 mm post with its cap and the two strap clamps the plate is screwed to |
| Villo | `viewer/streetlife/` (kits.js `dock`, layout.js) | a box terminal + a white name board on it, bollard docks, no bikes | the real station look: ribbed silver totem with the dark oval panel (screen, reader, keypad), the ochre head band with the station number + FR / NL name, the docks on their base rail, the station bikes in about half the docks |

## Pieces (`tools/blender/streetKit.py` -> `models/streetkit/streetkit.glb`, `streetkit_ao.png`, `streetkit.json`, `previews/`)

Triangles per LOD (LOD0 = Blender; LOD1 / 2 = meshoptimizer at load, `viewer/streetkit/streetKit.js`):

| piece | LOD0 / 1 / 2 | bands (m) | what |
|---|---|---|---|
| `sign_pole` | 416 / 200 / 128 | 30 / 90 / 320 | 76 mm hot-dip galvanised tube, 3.10 m out of the ground, 0.35 m in (JOINS), the dark PE cap closing the top |
| `sign_pole_tall` | 416 / 204 / 130 | 30 / 90 / 320 | the same, 3.60 m (46 poles with two plates) |
| `plate_circle` | 1252 / 260 / 42 | 30 / 90 / 320 | C / D signs, 600 mm |
| `plate_tri_down` | 1090 / 186 / 30 | idem | B1 give way, 700 mm side, rounded corners |
| `plate_tri_up` | 1090 / 188 / 28 | idem | B15, 700 mm |
| `plate_octagon` | 1012 / 152 / 32 | idem | B5 stop, 600 mm across flats |
| `plate_diamond` | 1084 / 164 / 20 | idem | B9 (in the atlas; no OSM data placed one) |
| `plate_square` | 1108 / 176 / 24 | idem | F19, F49, E9a, 600 mm |
| `plate_rect` | 1108 / 184 / 22 | idem | F4a zone 30, F12a living street, 600 x 900 mm |
| `plate_post` | 1068 / 382 / 382 | 25 / 80 / 260 | street-name plate post, 60 mm, cap, two clamp brackets (LOD2 = LOD1: coarser broke the 3 mm straps) |
| `villo_totem` | 2713 / 1183 / 827 | 30 / 90 / 320 | 2.33 m terminal (27 in the city: light LODs not needed) |
| `villo_dock` | 902 / 306 / 72 | 20 / 60 / 200 | one docking point on its 0.85 m base-rail section |
| `villo_bike` | 9188 / 3854 / 1124 | 7 / 40 / 160 | the station bike (32 spokes, wire basket); casts a shadow at LOD0 only |

Every plate: the 2 mm printed sheet (slot `sign_face`) with its 20 mm folded rim (front edge bevelled 2.5 mm, slot
`sign_back`, the grey mill-finish back), two extruded aluminium rails across the back (`sign_rail`, body + flanges), a
galvanised strap clamp round the post per rail with two hex nuts (`galvanised`, `bolt_steel`). The post axis is 88 mm
behind the face. Named slots only, no baked colour (palette: `viewer/streetkit/streetKit.js` SLOTS). AO: one Cycles
lightmap for the kit (1024 px, 64 samples, contact AO on a ground plane); LOD1 / 2 take it per vertex.

**The faces** (`tools/streetkit/faceAtlas.py` -> `models/streetkit/streetkit_faces.png`, 2048 x 2560 sRGB, 4x supersampled
vector drawing): 16 sign cells of 512 px (B1, B5, B9, B15, C1, C3, C43 20 / 30 / 50 / 70, F4a, F12a, F19, E9a, F49, D7)
drawn after the Belgian code's figures (RAL 3020 red, 5017 blue, 1023 yellow; the thin white edge round red-bordered
signs; numbers in Arial Narrow Bold, STOP / ZONE / P in Arial Bold); pictograms simplified to what reads at street
distance (no copied artwork) + 64 Villo station strips (256 x 64: the station number and its FR / NL name from the
Brussels Mobility WFS, dark on the station's ochre; **no logo, no word mark**). The plate outlines come from ONE module
(`tools/streetkit/signShapes.py`) read by both Blender and the atlas, so the print meets the plate's edge. The viewer
maps a face from the geometry position (`positionGeometry.xy / (w, h) + 0.5`), so LOD1 / 2 keep their faces with no
UVs; the Villo head band's front maps its strip the same way. No decals, no transparency: nothing to z-fight.

**Night**: emissive only (fixed light count). The faces are retroreflective: they give back `face x 0.35 x night x
(N.V)^3` toward the viewer (bright when looked at head-on, as under headlights); the Villo screens (1.4 x night, 0.35 by
day) and the docks' status lamps glow. No light added.

**Mesh audit** (tools/mesh_audit): **0 blocking for every piece at LOD0, LOD1 and LOD2.** LOD0:
`node tools/streetkit/audit_kit.mjs` (each piece alone at its band end); LOD1 / 2: `node tools/streetkit/audit_lods.mjs`
(the viewer's weld + meshoptimizer + crease steps re-run in Node). Reports in `models/streetkit/audit/<piece>/`. Warnings
left: slivers (bevel strips, thin tubes), back-to-back faces, seams. Caught and fixed on the way: the pole cap's sleeve
2 mm round the tube, the rail flanges coplanar with the rail, the station strip face 0.5 mm in front of the head band, the
screen 0.5 mm off its bezel, the totem's flat front bent by its round corners' normals (faceted corners now), the bike's
down tube running through the front tyre (frame redrawn with a 70 deg head angle), saddle / bar / main-tube streaks
(more sides, bent tubes resampled), the chain case crossing the stays, LOD streaks (crease 25 deg), LOD2 collapses
(smaller errors). **JOINS**: poles, the plate post, the totem plinth and the dock
rails' skirts run 0.35 / 0.12 / 0.08 m into the ground; each piece stands at the walking surface under its own foot
(DTM + measured kerb lift) - 1 to 2 cm; a bike stands at the higher of its two tyre contacts - 3.5 cm (one tyre sinks a
little on a slope, never floats).

## Placement (`tools/streetkit/build_streetkit.py` -> `data/streetkit/<T>.json`, 120 files + `summary.json`, ~0.7 MB)

```
C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/streetkit/build_streetkit.py --all --raw C:/Users/tibog/Downloads/uccle-city/data/raw
```

~30 s for all of Uccle, deterministic (same md5 of I6 and of the atlas on a re-run). It also writes the face atlas (the station strips come
from the data). The rules are in the script's header; in short (all positions from OSM, ODbL, + UrbIS via the tiles):

- **B1 / B5**: every OSM `highway=give_way` / `stop` node, on the road through it, facing the traffic it addresses:
  `direction=forward / backward` along the OSM way (151), else toward the node's nearer junction (63).
- **traffic_sign=BE:*** nodes (B1, B5, C1, C3, D7, C43[n]) the same way; `BE:B22` (cyclists on red) has no face: skipped.
- **F19 / C1**: one-way roads: F19 4 m into the road at each junction where the flow starts, C1 facing the wrong way
  4 m before each junction where it ends (segments >= 12 m).
- **C43 50 / 70**: where a slower road meets a 50 / 70 road, at the faster road's start for the traffic entering it
  (Brussels is a 30 region since 2021: 50 is the signed exception); one per 150 m per road and facing.
- **C43 30** where the same street drops from 50 to 30; **F4a** where a road tagged `source:maxspeed=BE:zone30` is
  entered from a faster one; **F12a** at living-street entries; **C43 20** at 20 roads entered from faster ones.
- **F49**: marked crossings without signals (`crossing=uncontrolled / marked / zebra`) on main roads or >= 50 km/h,
  one per direction, 1 m before the crossing.
- **E9a**: public car parks (`amenity=parking_entrance / parking`, not private / customers).
- **B15**: on secondary-and-up roads 35 m before a junction whose side road has a B1 / B5.
- **D7 / C3**: OSM ways tagged `traffic_sign=BE:D7` (cycle tracks: their own OSM geometry, the tiles' road graph has
  none) / C3, at their ends.
- **Poles**: on the right of the traffic, 0.4 m behind the MEASURED kerb (UrbIS sidewalks; 1,454 of 1,792 poles), else
  0.6 m past the road's modelled half width; slid up to 5 m along the road off buildings, trees, doors, driveways,
  other furniture and every carriageway; signs within 1.5 m facing alike share a pole (46 poles carry 2 plates, the
  code's precedence on top); the same face within 25 m dropped (road splits: 114).
- **Plate posts**: the street life's post-mounted plates (782), same position and facing.
- **Villo**: the 27 stations of the street life data (Brussels Mobility WFS `bm_bike:villo`: number, FR / NL names,
  `bike_stands`). Sidewalk >= 3.6 m deep: the dock row 1.95 m behind the kerb, bikes toward the road (15 stations);
  else in the parking lane, 0.3 m out from the kerb (12; the parked cars keep off that space). Docks every 0.85 m
  (the stand count of the WFS), each one cleared of trees, doors, driveways, crossings, kept on the station's own kerb
  line (a row running round a corner stops there) and, on a sidewalk, on measured paving with its bike: 470 of 604
  docks placed; the totem 1 m past the clearer end, facing the walkway. **Bikes**: the live occupancy is not data we
  hold; a fixed hash per dock (FNV + murmur finaliser) fills about 55 % of them (254 bikes) as a stand-in, documented
  here, not data. Bikes stand 3.5 cm into the paving (never above it).

### Counts (Uccle, 120 tiles)

| what | count |
|---|---|
| sign poles | 1,792 (1,746 short, 46 tall) |
| plates | 1,838: C1 447, F19 442, F49 390, B1 189, B15 110, C43 50 110, F12a 98, E9a 14, C43 30 13, B5 9, C43 70 6, D7 5, C3 4, C43 20 1 |
| not placed | 64 (no room off the carriageway within 5 m, mostly at tight junctions) |
| street-name plate posts | 782 |
| Villo stations / docks / bikes | 27 / 470 / 254 (15 on the sidewalk, 12 in the parking lane) |

## In the city (`viewer/streetkit/cityStreetKit.js`)

- ONE pool per piece for the whole city (13 pieces x 3 LODs = at most 39 instanced meshes, a mesh with nothing to draw
  is hidden), streamed by `viewer/instanceStream.js` (gather every 2 m, time-sliced, 0.15 ms budget). Static instanced
  buffers with update ranges over the live count, never DynamicDrawUsage. THREE shared materials (one per LOD).
- The LOD hand-over is the dithered band of `viewer/lodFade.js` (same noise in the shadow pass); plates and small pieces
  cast no shadow at LOD2 (the totem does).
- Collisions: per tile, invisible InstancedMeshes `furniture-sign` (sign poles), `furniture-platepost` (both "pole" for
  the car, "post" on foot) and `furniture-villo` (totem, docks, bikes: LOD1 triangles clipped at the ground; "box" for
  the car, "post" on foot). `viewer/drive/driveMode.js` and `viewer/character/cityHook.js` regexes extended.
- Parked cars leave the lane stations' space (`keepCarsClear`), lamps keep 0.6 m off the sign poles / 1.2 m off docks
  (`keepLampsClear`, slid 2 / 4 m or dropped).

## Cost (by construction; GPU ms NOT measured: tools/perf/preflight.ps1 was RED, 2.1 GB free, the GPU 39 % busy at rest)

- 13 pieces x 3 LODs = at most 39 instanced meshes, 3 materials (+1 stand-in material, never drawn); count-0 meshes hidden.
- `renderer.info`, the kit's group on - off, same frame, all passes (main + shadow cascades), around I6 Saint-Job:

| view | draws | triangles |
|---|---|---|
| Villo Saint-Job, totem at 3 m (25 docks, 13 bikes in reach) | +6 to +21 | +200 k to +250 k (the bikes: 9.2 k at LOD0 within 7 m, 3.9 k to 40 m) |
| Villo from across the square, 5.5 m up | +20 to +22 | +128 k to +143 k |
| street corner with signs and plate posts (Place de Saint-Job) | +19 | +19 k |
| from the sky, 200 m up | +7 | +5 k |

- Streaming: gather slices 0.1-0.7 ms (budget 0.15 ms / frame, time-sliced).
- Atlas: 2048 x 2560 RGBA8 sRGB, mipmapped (~27 MB of GPU memory). GLB 1.5 MB uncompressed.

## Checks

- JOINS: `viewer.contactAudit` on every pole, post, totem, dock and bike LOD0 of I6 / I5 / J6 (80 pieces): 0 floating,
  0 overhang. A raycast down to the drawn roads / terrain of the 9 loaded tiles: every pole origin is at most 0.29 m above
  the drawn ground (the tube runs 0.35 m in: no gap); docks <= 6 cm (skirt 8 cm), totems <= 2 cm (plinth 12 cm); bikes
  were up to 6 cm above the drawn paving, now set 3.5 cm into it.
- Collisions: `viewer.collisionTest("I6")` static: identical with and without the kit (invisible 11 / missing 46, the same
  items, none of them a kit piece).
- Console: no errors (day, night, `?streetkit=old`).
- LOD hand-over: dithered (lodFade.js); the face is mapped from the position at every LOD so the print never changes at a
  switch. Bikes at 9 m (LOD0) and 12 m (LOD1): `docs/streetkit/villo_bikes_lod0_9m_lod1_12m.jpg`.

## Proof images (`docs/streetkit/`)

| image | what |
|---|---|
| `stjob_villo_before_after.jpg` | Place de Saint-Job, the station by the church: before = a box terminal and bare bollard docks; after = the totem, the dock row on its rail, bikes with ochre skirt guards on the church's sidewalk |
| `stjob_villo_totem.jpg` | the totem: dark oval panel (screen, reader, keypad), ochre head "249 Saint-Job / Sint-Job" from the WFS |
| `stjob_villo_row.jpg` | the docks and bikes at eye level |
| `stjob_villo_night.jpg` | night: screens, the docks' green status lamps, the bikes' orange reflectors (emissive only) |
| `stjob_signs_before_after.jpg` | the corner of Place de Saint-Job / Venelle de Saint-Job: before none; after F12a (living street) over F19 (one-way) |
| `stjob_plate_post.jpg` | "Place de Saint-Job / Sint-Jobsplein, Uccle - Ukkel" on the galvanised plate post |
| `fortjaco_giveway_before_after.jpg`, `fortjaco_giveway_close.jpg` | Avenue Alphonse XIII at the Chaussee de Waterloo: the OSM give-way node (direction=backward) gives a B1 on the right beside the painted teeth; an F49 at the main road's crossing |
| `villo_bikes_lod0_9m_lod1_12m.jpg` | LOD0 vs LOD1 bikes |
| `models/streetkit/previews/*.jpg` | Blender previews (overview, plate backs with rails and clamps, Villo, grazing light) |

**Street View (look only, nothing stored)**, Sint-Jobsplein 18, April 2024: the real station stands along the church's
sidewalk with the bikes perpendicular to the road (as placed here); the bikes have light silver frames, a front basket and
large ochre skirt guards round the rear wheel (the kit's look; the real guards are larger than ours). The 2024 terminal
was not clearly visible (a white cabinet beside the bikes may be it or a utility box); the Commons photos show the ribbed
silver totem modelled here. A blue no-parking sign (E1) stands by the church: parking bans are not in OSM, so not placed.

## Weak points / left

- Parking bans (E1 / E3), parking zones, bus lanes, "except local traffic" sub-plates, school / children warnings,
  signal-post signs (B22 / B23): no data in OSM, none placed. B9 is in the atlas but no OSM data asks for one.
- F19 / C1 at every junction of a one-way segment (rule): real streets often have fewer. Speed signs follow OSM maxspeed
  changes; the "Ville 30" region-entry signs are outside Uccle's tiles.
- 64 signs not placed (no room off the carriageway within 5 m); 338 poles stand on the modelled verge (no measured kerb).
- The dock row's base rail is stepped on slopes (each 0.85 m section level at its own height; its skirt hides the gap).
- The Villo bikes are heavy close up (9.2 k triangles at LOD0, within 7 m): a lighter basket / spoke card would halve it.
  Occupancy is a fixed hash. 134 of 604 docks were dropped (rows that ran off their kerb line or off measured paving).
- The faces' retroreflection is a view-angle glow by night, not a real headlight response.
- The plate post's clamps sit at 2.52 / 2.68 m for the street life's 0.30-0.36 m plates at 2.6 m.
- GPU ms: to measure on a GREEN preflight (`?streetkit=old` A/B).

## Shared files touched (for a careful merge)

| file | change |
|---|---|
| `viewer/main.js` | +1 import; `skP = cityStreetKit.fetchTile(...)` beside `furnP`; `skDoc` awaited with `furnDoc`; lamps `place` and cars `place` chained through `cityStreetKit.keepLampsClear / keepCarsClear`; `cityStreetKit.addTile(...)` + a `say(...)` after the furniture's; `removeTile` in dispose; `start()` beside the furniture's |
| `viewer/streetlife/cityStreetLife.js`, `streetlife.js`, `streetlifeWorker.js` | option `noStreetKit` (like `noBubbles`): the worker drops `doc.villo` and the `post` props |
| `viewer/drive/driveMode.js` | `sign|platepost` posts, `villo` boxes |
| `viewer/character/cityHook.js` | `sign|platepost|villo` posts |

No tile-worker change (no bundle rebuild). New: `viewer/streetkit/`, `tools/blender/streetKit.py`, `tools/streetkit/`
(signShapes, faceAtlas, build_streetkit, audit_kit), `models/streetkit/`, `data/streetkit/`, `docs/streetkit/`.

## Sources (look only: nothing traced, stored or shipped)

- Belgian road code, annex 1 (Royal Decree of 1 December 1975) for the figures, colours and shapes; small urban sizes.
- Wikimedia Commons photos of Villo stations, looked at in a scratch folder and deleted: "VilloStationAlmostFull.jpg",
  "VilloTerminalAndMap.jpg", "Villo! bike rental in Brussels - Stierch.jpg", "Bicycle parkings and Villo station at
  Place Wiener on a snowy day in December (Watermael-Boitsfort, Belgium).jpg" (Trougnouf): the ribbed silver totem with
  the dark oval panel and ochre head, the silver docks with ribbed feet, silver step-through bikes with a front basket
  and ochre skirt guards over the rear wheel. The brief said "dark frames": the photos show silver frames, so the kit
  follows the photos (frame colour is one palette entry if the owner prefers dark).
- Data: OpenStreetMap (ODbL), Brussels Mobility WFS (Villo, via data/streetlife; licence to confirm, see
  docs/STREETLIFE.md), UrbIS (CC0) via the tiles.
