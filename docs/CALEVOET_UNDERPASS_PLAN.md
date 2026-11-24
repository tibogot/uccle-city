# The Calevoet station pedestrian underpass: the plan (research, 2026-11-24)

Owner, 2026-11-24 (docs/TODO.md, "CALEVOET STATION PEDESTRIAN UNDERPASS"): a tunnel for people only, under the railway,
from one side to the other, "if not too hard and not too costly". This is the plan only: no model, no code.

## For the owner, in short

- **There are two underpasses at Calevoet, both with stairs only** (OSM, Wikipedia, the commune's council papers):
  - **U1, the public one** ("the second, wider one", Wikipedia): it replaced the Chaussée d'Alsemberg level crossing
    when the line was electrified (~1950). It runs under both tracks just past the south ends of the platforms, from
    the Rue Engeland / Dieweg corner (next to the old crossing-keeper's house, now a bar) to Rue Égide Van Ophem where
    the Chaussée d'Alsemberg carries on. **This is the "from one side to the other" tunnel.**
  - **U2, the station subway**: it links platform 1 (the station building side) with platform 2, and the street on the
    east. Its two stair heads are the white kiosk with the blue fascia and the mural-painted head on platform 2.
- **Not too hard, not too costly.** The tracks are at street level here (rail top 52.1 m, streets 51-53 m): the
  tunnel is a short box under the ground, and nothing has to be dug into an embankment. The only openings are the stair
  wells, and every one of them is under a small kiosk whose walls hide the cut. Running cost: about +6 draw calls for
  the four kiosks in the far view, and +7 for the inside, drawn only when you are within 60 m. Build cost: **3 small jobs
  for U1 (about 1.5 agent-days), plus 1 job for U2 if wanted.**
- **A new step-free underpass is planned but not built.** In 2022 the commune planned to close both and open one wider
  passage with gentle ramps for wheelchairs and bikes (works "not before 2024", with a rail shutdown). A March 2025
  council question still treats it as future, and the OSM data of 2026-11-23 still maps the two stair tunnels. We build
  **what stands today**; the ramp version is an owner choice (§9).
- **The walls inside are covered in commissioned murals** (an underwater theme, "Calevoet · Kalevoet" lettered over the
  mouths; Commons photos 2019). Those murals are someone's artwork: we paint **our own made-up murals** in the same
  spirit (blue sea, divers, fish, tags), never a copy.

## 1. Where it is (data)

Sources: `data/raw/osm/area.json` (Overpass, 2026-11-23), `data/rail/rail.json`, UrbIS solids in
`data/tiles/D6/buildings.json`, the DTM `data/tiles/D6/terrain.u16` (1 m). City frame: x east, z south (m,
docs/CONTRACT.md). Tile **D6** (x -1500..-1000, z 500..1000). One-off scripts lived in the scratchpad only.

The railway (L124, two tracks, OSM 185316523 / 185316524) runs SSW-NNE through here, heading (0.44, 0.90) in x, z.
Rail top **52.1-52.2 m TAW** at both crossings (rail.json); the platforms' tops are 52.33 (platform 2, west) and 52.35
(platform 1, east, the station building's side; OSM 185317084 / 185317085). The station building (hero
`models/calevoet_station`) stands at (-1225, 790).

### U1: the public underpass (the one to build first)

| piece | OSM way | from (x, z) | to (x, z) | length | tags |
|---|---|---|---|---|---|
| east stair (down) | 30235696 | (-1198.6, 850.0) | (-1194.8, 860.0) | 10.7 m | steps, tunnel=yes, layer -1, handrail, asphalt, bicycle=dismount, ramp=no |
| corridor | 640826544 | (-1194.8, 860.0) | (-1214.8, 870.3) | 22.5 m | footway, tunnel=yes, layer -1, bicycle=dismount |
| west stair (up) | 640826545 | (-1214.8, 870.3) | (-1210.7, 878.1) | 8.8 m | steps, tunnel=yes, layer -1, handrail, lit, asphalt |
| west link | 30235699 | (-1210.7, 878.1) | (-1218.0, 881.8) | 8.2 m | footway, lit -> Rue Égide Van Ophem (and the Ch. d'Alsemberg at (-1217, 887)) |
| east link | 1128428859 / 30235693 | (-1198.6, 850.0) | (-1199.0, 847.2) -> (-1202.8, 823.0) | | footway, bicycle=dismount -> the Rue Engeland / Dieweg sidewalks |

- **Entrances** (stair tops, the street side): **east (-1198.6, 850.0)**, ground 52.87 m; **west (-1210.7, 878.1)**,
  ground 51.06 m. Stair feet: east (-1194.8, 860.0), west (-1214.8, 870.3).
- **Corridor axis** heading (-0.89, 0.46): square to the tracks (dot 0.02). It passes under track 524 at about x -1199
  and track 523 at about x -1203, 4-8 m past the platforms' south ends (z 854 / 858). Ground over it 51.7-52.4 m.
- **Kiosks over the stairs** (UrbIS solids the model replaces): east **525169**, 9.6 x 3.1 m, base 52.55, eaves 55.42
  (2.9 m high); west **519275**, 5.9 x 3.1 m, base 51.01, eaves 53.94. The old crossing-keeper's house is UrbIS 524832
  at (-1185, 869), next to the east kiosk (keep it).
- **Total walk** street to street: about 42 m (10.7 + 22.5 + 8.8).

### U2: the station subway (second, same kit)

| piece | OSM way | from (x, z) | to (x, z) | length | tags |
|---|---|---|---|---|---|
| east stairs, 3 flights (10 + 6 + 11 steps) | 908232098, 908232099, 384677492 | foot (-1211.3, 817.0) | top (-1209.7, 814.7) | 3.7 + 2.3 + 5.2 m | steps, tunnel=yes, handrails both sides, **ramp:bicycle=yes** (wheel gutters) |
| corridor | 384677494 | (-1211.3, 817.0) | (-1227.6, 824.8) | 18.1 m | footway, tunnel=yes, layer -1 |
| west stair (13 + 12 steps, a landing) | 384677493 | (-1227.6, 824.8) | (-1231.0, 817.5) | 8.1 m | steps, tunnel=yes, layer -1, handrails, ramp:bicycle=yes |
| west top | 384677495 (indoor), 908232097 | (-1231.0, 817.5) | (-1229.2, 814.2) | 3.5 m | onto **platform 2**, under its shelter |
| east top | 384677496, 640826543 | (-1209.7, 814.7) | (-1216.3, 816.6) | | to **platform 1** at grade and to the Rue Engeland crossing (-1207.2, 812.6) |

- **Entrances**: **east kiosk top (-1209.7, 814.7)**, ground 52.46, on the forecourt between platform 1 and Rue
  Engeland; **west top (-1231.0, 817.5) on platform 2** (top 52.33). Serves **both platforms** and the east street;
  platform 2 also has its own at-grade path to Rue Égide Van Ophem at its north end (640826542).
- **Corridor axis** heading (-0.90, 0.43), square to the tracks; under platform 1's north part, both tracks and the
  edge of platform 2.
- **Kiosks**: east **525221** (L-shaped, about 5.5 x 4 m, base 52.49, eaves 54.88); west **518347**, the 20.6 x 1.7 m
  platform-2 shelter whose north end holds the stair head (base 52.45, eaves 54.98).
- **Total walk**: about 37 m.

### Depth and size (measured where possible, estimated [E] elsewhere)

- **Floor level [E]: 48.4 m TAW (+-0.4).** From the rail top (52.15) - rail and sleeper 0.3 - ballast 0.5 - roof slab
  0.5 - clear height 2.45. The step counts agree: U2 east 27 risers to 52.5 m, west 25 risers to 52.33 m, at 15.5-16.5
  cm a riser, give 48.1-48.6. U1's west stair rises only to 51.06 (about 17 risers, 8.8 m with a landing); its east
  stair to 52.87 (about 27 risers).
- **Clear height [E]: 2.45 m** in the corridor, a soffit beam about 2.25 m at each mouth (Commons photos).
- **Width [E]: U2 about 2.2 m**, the stairs about 1.8 m between the rails. **U1 "wider"** (Wikipedia): about 2.6-3.0 m;
  its kiosks are 3.1 m outside, so its stairs are about 2.5 m. Job 0 (the Street View look) checks both.
- **Ramps**: none today. Stairs only, U2 with bike gutters on the stair sides.

## 2. What it looks like (look only)

Looked at, never stored: Wikimedia Commons photos (Stratoswift 2018, 2019, 2024, CC BY-SA / CC BY; the "Ukkel-Kalevoet
station 2019" set) viewed once from a temporary folder that was deleted straight after; no Street View yet (job 0).

- **Kiosk (U2 east, 2018)**: an L-shaped single-storey kiosk of **white-painted brick**, a thin flat roof with a deep
  **bright blue fascia**, window bays filled with **perforated steel mesh panels** in dark grey frames (no glass), a
  timetable board bay, a dark grey ledge along the sill. The stair opens at one end with a **yellow-painted bollard**
  and **yellow step nosings**. Clay-paver forecourt. A few tags on the fascia and walls.
- **Platform 2 head (2024)**: the post-war platform shelter, extended at its north end by the stair head (it replaced
  a 19th-century shelter and a footbridge when the line was electrified). Flat roof, **grey fascia**, walls and door
  fully painted with a cartoon **street-art mural**; herringbone concrete pavers on the platform.
- **U1 east head (2019)**: a long low glazed enclosure beside the crossing-keeper's house: flat white roof, **blue
  window frames**, an ochre / brown lower wall with graffiti, a green door at one end.
- **Inside (2019)**: concrete steps with **yellow nosing bands**, **steel tube handrails** on both sides, a landing
  half way; walls painted brick on the stairs and render with a glazed-tile dado in the corridor, **every surface
  covered in a blue underwater mural** (sea, a diver's helmet, fish, coral, ships) mixed with graffiti pieces;
  "Calevoet · Kalevoet" lettered on the soffit beam over each mouth; a grey tiled floor with a drain edge; a flat
  ceiling with surface **box lights** (fluorescent / LED) on the axis, conduit runs, a white SNCB arrow sign
  ("Quai / Perron 2"). On platform 1 a blue SNCB sign "1  Quai/Perron 2 ->" points to it.
- Which photos are U1 and which U2 is not written on them: job 0 settles it (the plan assumes the same finish for both).

## 3. How the city already does it (what we reuse)

- **The ground cut, `viewer/rail/tunnels.js`**: the road tunnels under the Linkebeek embankments class each terrain cell
  ROAD / LID / KEPT and CLIP the drawn terrain's triangles at the wall faces (no stair-step, no floating edge). The
  underpass is the simpler opposite: the ground stays at its level everywhere (the tracks, the platforms and the
  streets all sit on the height field) and only the **stair wells** open. So we take tunnels.js's frame and triangle
  clip, not its classes: a new `HOLE` cut = the stair well polygons, inside the kiosks. No lid, no kept earth, no bank.
- **The platforms, `viewer/rail/railway.js`**: the OSM platform areas extruded (0.76 m, pavers, white coping, yellow
  line). U2's west stair opens IN platform 2: the platform polygon gets a hole ring (the well), its inner faces are the
  well's walls (the model's), the coping and yellow line stay outside it.
- **The heroes' load path** (`viewer/rail/tunnelModel.js` -> `bridgeModel.js`): named slots from the material library,
  UV0 in metres, baked AO, scripted LODs with the dithered hand-over (`lodFade.js`), the warm-up before showing, the
  hide list for the UrbIS solids replaced, an emissive `lamp_glow` slot (no light).
- **Interiors that stream** (`viewer/villa/villaInterior.js`, rule interior-stream-paced): fetched near, pipelines
  compiled one material at a time while hidden, meshes shown one a frame; lit by a **Cycles bake** (unlit slots, day
  and night sets) instead of runtime lights. Underground this also stops the sun lighting the corridor through the
  earth (the terrain's shadow does not cover it).
- **Colliders** (`viewer/heroColliders.js` HERO_ROOTS, `contactAudit.js`, `drive/collisionTest.js`): the car and the
  walker collide with the model's LOD0. The walker (`viewer/character/cityHook.js`) also has a **Heightfield** of the
  tiles' surface that pushes any body below it back up (`viewer/character/world.js`, `Heightfield.capsule`): that is
  the one real new piece of work for the walker (§6).
- **The car-park plan** (docs/UNDERGROUND_PLAN.md §4, §7): same streaming bands, "nothing underground drawn from far",
  the `rampCut.js` idea. The underpass can be the first user of a shared `viewer/underground/` folder.

## 4. The ground: cutting the openings cleanly

Worker, terrain stage (`viewer/underground/underpass.js`, switch `?underpass=0` = today's city exactly):

1. **Wells**: from the model's json (`models/underpass/calevoet.json`: per stair, the well polygon in city metres and
   its rim height), drop every terrain triangle inside a well and CLIP the ones that cross its rim (the tunnels.js
   clip, kept heights on the outside part). The rim is the kiosk's inner wall face: the kiosk walls and the well walls
   are ONE wall from the stair foot to the roof, so the terrain's cut edge always meets a face (joins rule, rule
   model-meets-ground). The well walls go 0.3 m above the rim inside the kiosk's walls (the kiosk wall covers the join).
2. **Height field**: the cells inside a well keep their old height in `hm.surface` (cars, the road engine, the birds
   and the falcon never see the hole: the kiosk's walls stand there and the car cannot enter it), and the walker gets a
   **void** there instead (§6).
3. **Platform 2** (U2 only): the well's polygon as a hole in platform 2's extrusion (railway.js), the coping and the
   yellow line clipped outside it. Check: the platform's top area loses exactly the well's area, nowhere else.
4. **Nothing else changes**: the corridor is under the drawn ground, the ballast and the tracks over it are the usual
   railway. A **slab rim** (a 0.25 m concrete edge at the well's mouth) is part of the model, so no terrain edge is
   ever seen from inside the well.
5. **The ground skirt**: each kiosk's walls sink 0.3 m under the ground outside (weld or skirt), the forecourt pavers
   (U2 east) are the road engine's / plaza's, unchanged.

## 5. The Blender kit (scripted: `tools/blender/underpass.py`, Blender 5.0 headless, OptiX for the bake)

One script, a table per underpass (`UNDERPASSES = { "u1": {...}, "u2": {...} }`, every measured value commented
with its source, every estimate marked [E]), output `models/underpass/calevoet.glb / .json / _ao.ktx2` plus the
interior file `calevoet_in.glb` (streamed). Named material slots only, no baked colour (hero-buildings method), UV0 in
metres, bevels on every edge you can walk past, weighted normals, support loops round the openings (rule
no-bad-shading), AO bake. The pieces:

**Surface (always loaded with the tile, 3 LODs):**
- `kiosk_*`: the stair-head kiosks from the UrbIS footprints and the photos: painted brick walls (bevelled corners,
  a brick normal), the flat roof slab with its fascia (blue for U2 east, grey for the platform-2 head, white for U1
  [E: job 0]), the perforated mesh panels as an opaque texture over a dark backing (no alpha-test pipeline), the
  timetable board, the sill ledge, the yellow bollard. LOD1 = the box with the fascia, LOD2 = a box (merged far).
- `platform_head`: the platform-2 shelter (replaces UrbIS 518347 and the railway.js standard shelter there, if one is
  drawn on that spot).

**Inside (streamed, LOD0 only):**
- `stair_flight` (a parameter set: risers, going 0.30 m, rise 0.155-0.165 m, width, landing): concrete treads with a
  bevelled nosing and a yellow painted band, the wall string, U2's bike gutters (a 0.12 m steel channel each side).
- `handrail`: 42 mm steel tube on wall brackets, both sides, ends turned down into the wall; one merged mesh.
- `corridor`: a box section (floor, walls, flat soffit), the floor in grey tiles with a drain edge, the walls render
  over a tiled dado, the soffit beam at each mouth with the lettering.
- `well`: the walls from the stair foot to the kiosk roof, the 0.25 m slab rim, the soffit under the kiosk roof.
- `fittings`: box lights on the axis (painted housing + `lamp_glow` lens), conduit runs, the SNCB arrow signs, a CCTV
  dome, a drain grate, a few tags (decals in the mural atlas, no extra draw).
- **Murals: our own.** One 2048 px mural atlas (texture factory, docs/TEXTURE_FACTORY.md): an invented underwater
  scene in panels, a lettering band "Calevoet · Kalevoet" (the place name is fine; the real murals' designs are not),
  graffiti fills. Mapped by UV0 metres along the walls, so the panels do not stretch.
- `collision`: a separate low mesh (~1 500 triangles: floor, stair ramps as planes under the treads' nosings, walls,
  soffit) in the SURFACE file, so the walker's colliders exist before the inside has streamed in.

**Slots** (from the material library where they exist): `brick_painted_white`, `paint_fascia` (blue / grey tint by a
vertex code, one slot), `steel_mesh_panel`, `concrete_step`, `floor_tile_grey`, `wall_mural` (the atlas), `ceiling_paint`,
`painted_metal_grey` (rails, frames, housings), `lamp_glow` (emissive), `sign_sncb` (one small atlas with the arrows).

**Bake**: the inside is lit by Cycles: the box lights as emitters (night set) + the sky through the wells (day set),
blended by the city's day factor as the villa does. No runtime light, no shadow caster inside, no envmap.

## 6. The walker: collisions and getting through

- **Heightfield voids** (`viewer/character/world.js`, the one engine change): `Heightfield` gets a list of voids
  `{ ring, yTop }` from the underpass json: a body whose (x, z) is inside a ring and whose foot is below `yTop` gets no
  contact from the height field (and the camera's ray ignores the field there). Wells: `yTop` = +Infinity (the field is
  off in the well). Corridor: `yTop` = the corridor's soffit + 0.3 m (a body walking on the platform or the ballast
  above is still carried by the field; one in the corridor is not pushed up through the roof). The model's TriBVH
  (the `collision` mesh) carries the body inside: floor, stairs, walls, soffit.
- **Root names**: `underpass-calevoet` (surface + collision) joins HERO_ROOTS, contactAudit.js and
  drive/collisionTest.js. The UrbIS kiosks it replaces join the hide list (so their footprint prisms stop blocking the
  stair mouth).
- **Cars and motos**: no change; the kiosks' walls are car walls (the hero band), the car never reaches a well.
  The kid-game bike: dismount at the top (OSM bicycle=dismount), a later choice (§9).
- **Third-person camera**: the corridor is 2.45 m high and 2.2-2.8 m wide: the camera's TriBVH rays pull it in; a
  "tight space" camera distance (the villa's indoor one) while inside a void ring.
- **Crowd (NPC pedestrians)**: not in this plan's first jobs (their graph is 2D, the tunnel is a second level).
  Later: a "portal" edge in the walk graph (enter the east well, fade, exit the west well), no NPC drawn underground.
- **Streaming**: the inside is fetched < 80 m, shown < 50 m (before you can see down the stairs), hidden > 70 m,
  unloaded after 20 s hidden. From the street, a well shows its first flight and a dark throat card until shown.

## 7. Perf budget

| part | triangles | draws | when |
|---|---|---|---|
| kiosks + platform head, LOD0 / 1 / 2 | <= 16k / 3k / 400 for all four | <= 6 (one per slot, all kiosks merged) | with the tile (LOD2 in the far merge) |
| collision mesh | ~1.5k | 0 (not drawn) | with the tile |
| inside, U1 | <= 35k | <= 8 | < 50 m only |
| inside, U2 | <= 35k | same 8 (merged with U1 when both are loaded) | < 50 m only |
| textures | mural atlas 2048 px KTX2 (~2.7 MB GPU), AO maps 1024 px | | inside: streamed |

- **Nothing underground from far**: draws and triangles at 200 m equal with and without `?underpass=0` (except the
  kiosks, which replace the UrbIS boxes: about even).
- **Fixed light count**: emissive lenses only, bake for the rest (rule fixed-light-count; the `meta` row checks no
  light is made).
- **No DynamicDrawUsage**, no per-frame allocation (rules no-dynamic-draw-usage, alloc-rate).

## 8. Gate rows and checks

- **New offline row `underpass`** (`tools/audit/gate.d/underpass.mjs`):
  1. data: the 10 OSM ways above still exist with these tags; each model stair top within 0.5 m of its OSM end;
  2. budgets per part (the table above), slot names from the library, no light object in the GLB;
  3. ground: terrain triangles dropped only inside the well rings (0 outside); every clipped edge within 2 cm of a
     well wall face; platform 2 loses exactly the well's area (U2);
  4. walk-through: an offline walker (the CollisionWorld + the json's voids + the collision mesh) walks east -> west
     and back along the OSM line in 0.1 s steps: reaches the far stair top, never more than 0.05 m inside a wall,
     never pushed up through the soffit, and on the platform / the ballast above the corridor stays on the surface.
- **Existing rows** to pass: `colliders` (the kiosk colliders match what is drawn), `heroshell`, `shell`, `ground`,
  `zfight` (the slab rim vs. the forecourt), `railcorridor` (nothing new in the track corridor), `meta`, and the
  mesh_audit contact check (0 floating, 0 overhang: `viewer.contactAudit("underpass-calevoet")`).
- **Browser row `underpass`**: stream-in of the inside, 3 runs, 0 frames over 33 ms at `?dynres=0` on a GREEN preflight
  (rule interior-stream-paced).
- **City tour** (tools/tour/views.json): `calevoet-underpass-east` (U1's east kiosk from the Rue Engeland sidewalk,
  15 m), `calevoet-underpass-inside` (`&at=` in U1's corridor, the inside forced shown), and the existing Calevoet
  views unchanged except the kiosks.
- A rule file only if a defect class shows up (e.g. "a hole in the ground only inside a wall that hides its edge").

## 9. Jobs and size

Each job switch-guarded (`?underpass=0`), small, merge gate + tour before merging (owner-present rules: one gate at a
time, Blender only when the owner is away).

| # | job | size | gate |
|---|---|---|---|
| 0 | Street View look (Rue Engeland side, Rue Égide Van Ophem side, platform 1, the kiosks; inside if Google has an indoor photo sphere): widths, finish, which photos are U1 / U2, notes into this doc | 1-2 h, no code | none |
| 1 | U1 surface: `underpass.py` kiosks + collision mesh, the well cut in the worker, the walker voids, hide list | ~0.5 day | `underpass` 1-4, `colliders`, `ground`, `heroshell`, contact; tour `calevoet-underpass-east` |
| 2 | U1 inside: stairs, corridor, fittings, own mural atlas, the bake, streaming | ~0.75 day (most of it Blender + bake time) | `underpass` budgets, browser `underpass`, `meta`; tour `calevoet-underpass-inside` |
| 3 | U2 (optional): the same kit on the station subway + the platform-2 hole | ~0.5 day | the same rows + the platform area check |

**Total: U1 about 1.25-1.5 agent-days over 3 small jobs (0-2); U2 another half day.** Runtime cost: +6 draws in the
far view (replacing 4 UrbIS boxes), +8 draws and <= 35k triangles only within 50 m of a stair.

## 10. Open questions for the owner

1. **U1 only** (the public "from one side to the other" tunnel), or **U1 + U2** (the platforms' subway too)?
2. **Today's stairs** (my advice: what stands now, OSM 2026-11-23) or **the planned step-free version** with ramps
   (not built; it would be our guess of a design nobody has published)?
3. **Murals**: our own invented underwater murals in the same spirit (my advice), plain painted walls, or plain walls
   with tags only?
4. Bikes in the kid game: carry the bike down (dismount, as the sign says), or let the bike ride the stair gutters as a
   stunt?
5. Do you know the inside (width, tiles, lights) better than the photos? Any detail you remember is worth a note here.

Sources (read 2026-11-24): OpenStreetMap via `data/raw/osm/area.json` (ODbL); `data/rail/rail.json`; UrbIS 3D and DTM
2021 (D6); fr.wikipedia "Gare d'Uccle-Calevoet" (two stair underpasses, the second wider, linking the two quarters;
the level crossing replaced ~1950); dhnet.be 2022-01-13 "Le quartier Uccle-Calevoet fera peau neuve d'ici 2025" (two
stair passages today, one new wider gently sloped passage planned, PMR and bikes, not before 2024); Uccle council
question 2025-03-20 "Accès des PMR et familles à la gare de Calevoet" (title and search summary only: the PDF is a
scan); Wikimedia Commons photos by Stratoswift ("Calevoet Station - Tunnel", 2018; "- Tunnel2", 2019; "Gare de
Calevoet (abri et tunnel)", 2024) and the "Ukkel-Kalevoet station 2019" set: looked at only, not kept.

## Owner decisions (2026-11-24)

- Build **U1 first** (the public street-to-street tunnel), **U2 later** as its own small job.
- Walls: **our own invented mural** in the spirit of the real underwater one, plus a few tags (never a copy of the real artwork).
- Kid game: the bike **rides the stair gutters** (a stunt), not carried.
- The owner does not remember the inside: go with the photos plus the Street View look (job 0).
- Today's stairs, not the unbuilt ramp project (default kept).

## Job 0: the Street View look (2026-11-24, looked at only, nothing kept)

- **West kiosk (Rue Egide Van Ophem, 2024 pano)**: a flat white roof slab on a thin white fascia overhanging ~0.4 m,
  rendered light-grey piers, three window bays a long side, each three panes of **wired frosted glass in blue steel
  frames** (tags on the glass), the lower wall (~1.1 m) **painted** (a tile-and-pipe motif with big leaves, not the
  ochre of the plan's photo), a dark downpipe at the closed end, a red-painted pier at the mouth end, two **brown
  bollards with a red band** on the pavement in front. The mouth faces the street corner.
- **East kiosk (Rue Engeland / Dieweg)**: hidden behind trees and ivy in 2024; the 2014 pano shows a long low glazed
  enclosure of the same kind. Built with the same kit.
- Not settled: no indoor photo sphere; the inside follows the Commons photos (yellow nosings, tube rails, box lights,
  tiled floor) with our own mural.

## Jobs 1 + 2: built (claude/underpass1)

tools/underpass/site.mjs -> tools/blender/underpass.py -> tools/underpass/pack.mjs; viewer/underground/ (worker cut +
city module), the walker's field voids (viewer/character/world.js), gate row `underpass`, rule underpass-wells, tour
views tools/tour/views_underpass.json. Kiosks LOD0 / 1 / 2 = 6.4k / 288 / 88 triangles (5 / 5 / 3 draws), the inside
21k triangles in 7 draws, collision 46 triangles. Left: U2 (the station subway + the platform-2 hole), the browser
stream-in row (0 frames over 33 ms), a night look.
