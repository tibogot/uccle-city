# Street life / wayfinding layer (branch claude/streetlife, LAB ONLY)

Goal (owner, 2026-11-12, TODO "Street life / wayfinding lab"): make Uccle recognisable from real data: shops with their
real names on the fronts, fuel stations, pharmacies, cafés with terraces, STIB stops, Villo, bpost boxes, glass bubbles,
bilingual FR/NL street plates, house numbers. Brand names as text only, never a logo; never an invented name.
No city file was changed: the lab loads the city's tiles read-only. Lab: `labs/streetlife-lab.html` (`?site=stjob` |
`fortjaco` | `alsemberg`, `&time=golden|midday|overcast|twilight|night`, `&cam=x,y,z,tx,ty,tz`).

## Data (all real, none invented)

| what | source | licence / note |
|---|---|---|
| shops, cafés, restaurants, bars, banks, ATMs, pharmacies, bakeries, supermarkets, schools, civic, hotels, **fuel**, post boxes, glass recycling, bicycle rental | OpenStreetMap via Overpass (`tools/streetlife/fetch_streetlife.py`: `nwr` + `out center`, so ways' centres too: the Esso at Fort-Jaco is a way), name / brand / opening_hours / outdoor_seating / addr:street / fuel:* | ODbL, "© OpenStreetMap contributors" shown in the lab. Extract from overpass.kumi.systems (overpass-api.de answered 502): `osm_base` 2026-07-24, older than the city's area.json (2026-11-04). Re-fetch when the main endpoint is back. |
| STIB stops (FR / NL name, lines, mode) | Brussels Mobility WFS `bm_public_transport:stib_stops` | Brussels Mobility open data: **licence to confirm** before shipping |
| Villo stations (name, number of stands) | Brussels Mobility WFS `bm_bike:villo` | idem |
| bpost letter boxes | Brussels Mobility WFS `bm_other:pointpostal` (type PBUS) | idem |
| house numbers (police number, FR/NL street, building id) | UrbIS `urbisvector:AddressNumbers` (geoservices-urbis WFS), per tile | UrbIS, CC0 for the 3D buildings; **check the address dataset's own licence** (MARKET.md: check each UrbIS dataset) |
| street names | OSM `name` "FR - NL" of the tile's roads (roads.json) | split at " - " |
| where things go | UrbIS 3D footprints (buildings.json), UrbIS street surfaces (sidewalk lift), UrbIS DTM | CC0 |

Raw data lands in the main checkout's `data/raw/streetlife/` (git-ignored). Fuel: OSM has 25 `amenity=fuel` in the Uccle
box (ways included: the quick count of nodes missed them), **17 inside the 120 tiles**. Real prices are not in any of these
datasets: the pylon shows only the grades OSM lists (Diesel / 95 / 98 / LPG / AdBlue ...) with dark, empty price windows.

### Counts for the 120 Uccle tiles (`data/streetlife/summary.json`)
shops 288, restaurants 84, schools 31, bakeries 21, fast food 21, banks 16 (+3 standalone ATMs), pharmacies 17,
supermarkets 17, cafés 15, bars 10, civic 11, post offices 2, hotel 1; **fuel stations 17**; STIB stops 278;
Villo stations 27; bpost boxes 83; glass recycling points 22; street plates 2,155; house numbers 19,287;
524 POIs with a name or brand on them. Not placed (no free street-facing façade within 20 m): 53 shops, 46 schools,
18 restaurants, 13 civic, 9 supermarkets, 9 bars, 7 bakeries, 7 cafés, 6 pharmacies, 5 fast food, 4 banks, 3 ATMs
(`skipped` in each tile file).

## Pipeline

1. `python tools/streetlife/fetch_streetlife.py` (once; `--only osm,stib,villo,post,addr`, `--force`).
2. `python tools/streetlife/build_streetlife.py --all` (or tile names): ~19 s for 120 tiles, 0.05-0.3 s per tile,
   deterministic (same inputs, same bytes: checked with md5). Output `data/streetlife/<T>.json` (4.2 MB in all).
   - every façade POI is attached to the nearest **street-facing** footprint edge of its UrbIS building: not a party wall
     (another solid 0.4 m outside), outward normal looking at a NAMED street within 35 m, the sight line from the wall to
     that street not crossing another building; the POI's own `addr:street` wins when it has one; ground-floor height =
     the walking surface outside (DTM + the kerb lift where UrbIS has a sidewalk). Shopfronts on one edge never overlap
     (intervals: slide or shrink, min 2.2 m).
   - house numbers: on their own building (UrbIS BU_ID), a street-facing wall if it has one, else its nearest outer wall
     (set-back villas); one plate per number per spot (box numbers merge).
   - plates: at every junction where differently named streets meet, on the corner wall parallel to each street (0.5 m
     from the corner, 2.7 m up), both sides when there are walls; else a plate on its own post at the sidewalk corner.
   - fuel: canopy over the forecourt between the OSM point and the named road, X along the road; pylon at the road edge.
   - stops: pole at the WFS point, flag facing along the street; a shelter when OSM has `shelter=yes` within 15 m.
3. In the browser, `viewer/streetlife/streetlifeWorker.js` (module worker, no bare imports) lays a tile out
   (`layout.js`) and rasterises its labels into signed-distance bitmaps (`sdfText.js`); the main thread packs them into
   the shared atlas and builds the instanced meshes (`streetlife.js`).
   **Worker time per tile** (this machine, noisy): I6 (busiest Saint-Job tile: 696 boxes, 311 labels) 181 ms
   (layout 11, SDF 166), I5 95 ms, J6 125-153 ms; main thread 1-7 ms per tile (atlas copy + instance buffers).
   The atlas upload is a full 16 MB texture update + mip generation per tile (see weak points).

## Rendering (three r187 + Mr.doob first)

- **three r187 has no SDF/MSDF text** (TextGeometry extrudes glyphs; troika-three-text is WebGL-only). Mr.doob's
  slop-newyork draws canvas text into an alpha atlas and samples it with an explicit LOD that fades the ink before it
  goes sub-pixel. We kept that idea and store a **signed distance** per label (browser text engine -> canvas -> exact
  EDT, Felzenszwalb; same approach as Mapbox TinySDF): crisp at 1 m, mipmapped (trilinear + 8x anisotropic), ink
  anti-aliased with `fwidth(d)`, faded by distance (62 -> 84 m) AND by footprint (4.5 -> 9 atlas texels per pixel, the
  letters hand over to their average coverage so the board doesn't change brightness). ONE 4096² R8 atlas shared by all
  tiles (I5 + I6 use 26 %, J6 14 %), labels deduplicated by text + style.
- **One textured box** (`streetlife.js boxMaterial`) draws everything boxy: fascias, shop frames (riser, jambs, head,
  door mullion), projecting signs (double-sided), awnings (canvas, valance with the name, arms), plates (Uccle mid-blue
  enamel, white text + border), house numbers, the fuel canopy (name on all four sides) and its light panels, the price
  pylon, stop flags and line strips, timetable cases, shelters, the Villo terminal, ATM panels. Per instance: atlas rect,
  text box, board and ink colours + glow, size (for the fake 8 mm chamfer rim and the enamel border), sides, roughness /
  metalness: one interleaved instance buffer (WebGPU allows 8 vertex buffers per pipeline). Opaque, no transparency,
  no z-fighting (text is in the board's own shader). ONE draw per tile (+ its shadow pass).
- **Shop windows**: one quad per shop with Mr.doob's parallax shop interior (shelves, goods, counter nearer the glass,
  ceiling lamps), copied with his MIT licence into `vendor/slop-street/` (ORIGIN.md says what changed). One draw per tile.
- **Prop kits** (`viewer/streetlife/kits.js`, procedural JS, named material slots, no baked colour): fuel pump on its
  island, canopy column, bistro table, bistro chair, market parasol, pharmacy cross (green lightbox, double-sided, on a
  bracket), bpost box, glass bubble, underground container chute, STIB pole, plate post, Villo dock. LOD1 = meshoptimizer
  `simplify` (weld only the smooth vertices, Prune, crease-aware normals; `kitLod.js`), dithered cross-fade at the switch
  and at the range end (viewer/lodFade.js `keepBand`, the view camera's distance in the shadow pass too: no popping,
  no shadow snapping). **Mesh audit (tools/mesh_audit from claude/stalle): 0 blocking on all 12 kits, LOD0 and LOD1**
  (`node tools/streetlife/audit_kits.mjs`, reports in `docs/streetlife/audit/`). Triangles LOD0 / LOD1: pump 1712/852,
  column 640/190, table 504/254, chair 3180/180, parasol 1040/250, cross 220/220, postbox 222/222, bubble 1634/479,
  chute 1068/480, pole 768/186, post 672/168, dock 600/278.
- **Night**: every glow x `streetUniforms.night` (lit letters, lightboxes, the green cross, screens, shop interiors);
  shops whose OSM hours close before 19:00 every day glow at 35 %. Hook for the night lights lab (claude/nightlights):
  `streetLife.nightSources()` returns the shop-window and sign light positions as flat x / y / z arrays (its `shops`
  and `signs` pools).

## Cost (lab, this machine shared with another GPU project: NOISY; alternating on/off rounds, median of the pair differences)

| view | GPU A/B (layer on - off) | pairs | CPU per frame |
|---|---|---|---|
| Chaussée de Waterloo at Neuhaus, street level (≈40 shops in the tile, Esso) | **+0.13 ms** | 0.00 0.13 0.13 0.39 | update() < 0.1 ms (below timer resolution) |
| Place de Saint-Job at Madonna, street level (terrace of 48 chairs, 24 tables, 8 parasols in view) | **+0.13 ms** | 0.07 0.13 0.20 -0.07 0.59 | idem |
| from the sky (420 m up over Fort-Jaco) | +0.07 ms (= noise; 2 of 19 meshes left) | 0.07 -0.07 0.52 -0.13 | idem |

The GPU timestamps here are quantised to ~0.066 ms and the other project's load moves the frame by +-0.3 ms: read the
pairs, not one number. Within the 0.4 ms target at street level, ~0 from the sky.

## Verification

- **Flicker test** (`labs/flickerTest.js` from claude/stalle, 24 frames, 0.6 mm steps): first run at Neuhaus 8 m strafe:
  66 blinking px, a vertical line where two neighbouring fascias overlapped by 5 cm (`flicker_before_neuhaus_8m_strafe.jpg`)
  -> fascias narrowed to the shop width + 10 cm -> 38 px left, all at the screen's right border (ground), none on text;
  Les Bourgeoises 5 m strafe **0 px** (`flicker_after_bourgeoises_5m_strafe.jpg`); Neuhaus 30 m strafe 1 px, dolly 28 px
  (no cluster on a sign); Madonna terrace 10 m strafe 9 px (border). No shimmering letters seen.
- **Names check** (panel "names check"): every shop / fuel text shown is compared with the tile file's OSM names and
  brands: 0 texts outside the data. Plates = OSM road names, numbers = UrbIS, stops = the WFS, grades = OSM fuel:* tags.
- **Photo checks (look only, nothing stored)**: Google image search hit a captcha (not solved); a Wikimedia Commons photo
  of an Uccle plate ("Carré Peeters", Uccle - Ukkel) shows a MID blue enamel plate, white letters, white border: the
  plate colour was changed from navy to that blue. Not done: Street View side-by-sides of Place de Saint-Job / Fort-Jaco
  (TODO).
- Images (`docs/streetlife/`): `stjob_botanea_fascia.jpg`, `stjob_le_passage_terrace.jpg`,
  `stjob_plate_chaussee_de_saint_job.jpg`, `stjob_stib_stop_flag.jpg`, `stjob_madonna_terrace_bench_view.jpg`,
  `fortjaco_shops_pharmacy_cross.jpg`, `fortjaco_esso_canopy.jpg` (before the canopy text was enlarged),
  `fortjaco_night_multipharma.jpg` (before the windows were toned down), `strip_walk_fortjaco_1.jpg` (the walk path
  hugging a wall: a weak point), `strip_drive_fortjaco_1.jpg`, the two flicker heat maps.

## The test street: where it is

The owner asked for "Chaussée d'Alsemberg near Saint-Job". In the data the Chaussée d'Alsemberg runs through tiles
D5-D12 / E1-E5, ~2 km west of Saint-Job (I6); the shops at Saint-Job are on Place de Saint-Job, Chaussée de Saint-Job
and Avenue du Prince de Ligne (tiles I5 + I6, 25 named POIs). The lab's two sites: **Place de Saint-Job** and
**Chaussée de Waterloo at Fort-Jaco** (J6: 40 named POIs, the Esso station, two pharmacies, three banks), the densest
real shopping street near Saint-Job. A third site, `?site=alsemberg` (tile E4: Chaussée d'Alsemberg, Rue Xavier De Bue, Parvis Saint-Pierre, 48 named POIs),
was added at the end and checked once: loads, Etam's fascia, house number 211, a stop flag (`alsemberg_etam.jpg`);
its worker time 302 ms (1,271 boxes, 411 labels: the busiest tile seen).

## Weak points / next

- Atlas upload: the whole 16 MB texture + its mips are re-uploaded when a tile adds labels (a hitch when streaming):
  for the city, copy each tile's block with `copyTextureToTexture` and precomputed mips, and free blocks on unload.
- Façades: the attach uses footprint edges, not the wall triangles: where UrbIS walls are set back from the footprint
  the shopfront floats a few cm; shops in deep plots (Fort-Jaco forecourts) stand behind OSM grass. 53 shops found no
  free street façade (shared buildings with many shops, inner galleries).
- Terraces are placed where OSM says `outdoor_seating=yes`, or for cafés / bars / restaurants with >= 4 m in front:
  the sidewalk width comes from the road's lanes, not the measured kerb, so some terraces stand on the verge.
- Uccle plates really carry a small "Uccle - Ukkel" line and the street type small (carré, avenue): ours show the full
  FR and NL names in one size.
- Walk path: built from the shop fronts of one side; it cuts corners and can hug a wall where shops are far apart.
- No glass on shop windows (the interior shader is opaque + fresnel), no menu boards (no data), no Villo bikes in the
  docks (occupancy is live data), no prices on the fuel pylon (no data), no "where am I" HUD yet.
- City integration (after the façade kit + roads v2 merges): replace facadeGeom.js's OSM shopfront boxes by this layer
  (the lab hides them by filtering the shop points), stream it with the tiles (worker per tile is ready), drive the
  night uniform from the night-lights lab.
