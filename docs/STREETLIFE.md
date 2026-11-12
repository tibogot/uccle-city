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

## Round 2 (owner / coordinator review, 2026-11-12)

| ask | done | how / where |
|---|---|---|
| 1. fascia names read small and dark | **yes** | the fascia is 0.80 m tall (0.68 m on a single-storey front) and the label ROW is 1.22 x that height (`box({ fill })`): cap height ≈ 0.55 x the board = 37-44 cm, shrunk only when the name is too long for the front. Boards and inks chosen by contrast (`lum(board) > 0.18` -> dark letters, else light), light boards added (white, cream, stone). Three treatments, per shop by hash (styling, not data): **backlit letters** (ink glows by night, 22 % by day), **gooseneck spotlights** (new kit `spot`, 2-3 over the board; the board and letters get a 0.35 wash at night; their positions go to `nightSources().spots` for the night lights lab), **lightbox** (the board glows, 14 % by day). Images: `fortjaco_shops_pharmacy_cross.jpg` (before) vs `r2_fortjaco_shops_pharmacy_cross.jpg`, `r2_fortjaco_glass_bourgeoises.jpg`, `r2_fortjaco_nomade_terrace_on_paving.jpg`, `r2_fortjaco_night_spots_backlit.jpg`. |
| real photos (look only) | partly | Google Street View at Fort-Jaco (Chaussée de Waterloo 1333, Neuhaus) and Place de Saint-Job (Chaussée de Saint-Job 666) looked at, nothing stored: real fascias are 30-60 cm bands with 20-30 cm letters, white or dark, Neuhaus' is red; at Saint-Job "St Job" is letters straight on a white wall and a coiffeur has white capitals on a black band. Not done: letters directly on the wall (no board) - the box needs a board. The forecourt at Fort-Jaco is paving in reality but OSM land cover draws grass there (city data, not this layer). |
| 2. Uccle plate style | **yes** | the whole plate is ONE label drawn by the canvas (`sdfText.js` plateUccle): FR street type small top-left, the commune small top-right, the shared name big, NL type small bottom-right, when FR and NL share their proper name ("Rue Jean Benaets" / "Jean Benaetsstraat" -> "Rue", "Jean Benaets", "straat", "Uccle - Ukkel"): 1,134 of 2,155 plates; the others show both full names + the commune line (plateTwo). The commune is the UrbIS address data's own MUNNAMEFRE / MUNNAMEDUT of the nearest address of that street (so plates of Forest streets at the tile edges say "Forest - Vorst"). OSM names written "NL - FR" are put back in FR / NL order. First try used 1 mm decals for the small words: they flickered at their edges, replaced by the one-label layout. `r2_stjob_plate_uccle_style.jpg`. |
| 3. terraces on the measured sidewalk | **yes** | `pave`: the depth of continuous UrbIS sidewalk / square surface in front of the shop (sampled every 20 cm along the wall normal at three points across the front, must start within 0.8 m of the wall), terrace = pave − 1.5 m passage, one row from 1.2 m, two + parasols from 2.6 m; never on anything that is not measured paving (grass, gardens, OSM-only areas). Saint-Job's Le Passage / Madonna terraces (on grass in round 1) are gone; Nomade at Fort-Jaco has one (`r2_fortjaco_nomade_terrace_on_paving.jpg`). |
| 4. per-tile atlas uploads | **yes** | the atlas is a `DataArrayTexture` of 12 pages of 2048² R8 (mipmapped); a tile packs into pages of its own and only those layers are uploaded (`texture.addLayerUpdate`, supported by r187's WebGPU backend: checked in its source); `removeTile` frees the pages. Measured in the lab, alternating 6 rounds of (no upload, one page, whole atlas) on the same view: render call CPU **+0.7 ms** for one page (4 MB) vs **+4.6 ms** for the whole atlas (48 MB); until the GPU finished: +2 ms vs +11 ms. A tile's whole first frame (new meshes + atlas) +8.7 ms per page vs +10.3 ms full (4 rounds each; noisy). Mipmaps are regenerated for the texture on each update (GPU only). `?atlas=full` = the old behaviour. |
| 5. shopfronts on the real wall, glass | **yes** | the build reads the UrbIS wall triangles (buildings.bin) of the building and puts each shopfront and wall plate on the area-weighted wall plane facing the street over the shop's span (offset AND the wall's own normal, not the footprint edge's). In practice the walls follow the footprints: 5 of 537 fronts moved (max 0.53 m); plates now lie in the wall plane (one cut into a slanted wall in round 2's first try). Windows: a near-black, very smooth dielectric (roughness 0.02) so the street and sky reflect (IBL + the city's SSR) over the parallax interior, which shows as emissive (`r2_fortjaco_glass_bourgeoises.jpg`). Shopfront frame boxes no longer overlap coplanar (head between the jambs, transom bar behind the mullion). |
| 6. OSM from overpass-api.de | **no** | overpass-api.de answered 502 again (status page 406). Mirrors: kumi.systems has osm_base **2026-07-24** (kept, the build uses it), private.coffee only 2026-06-01 (kept aside as `osm_pois.privatecoffee-2026-06-01.json`). Re-fetch with `python tools/streetlife/fetch_streetlife.py --only osm --force` when the main endpoint is back. |
| 7. licences | **see below** | |

### Licences to confirm BEFORE going public

| data | used for | what we know | where to confirm |
|---|---|---|---|
| OpenStreetMap | shop / amenity names, fuel, street names | ODbL: "© OpenStreetMap contributors" shown in the lab; a public city must show it too and share-alike applies to a derived database | https://www.openstreetmap.org/copyright |
| Brussels Mobility WFS `bm_public_transport:stib_stops`, `bm_bike:villo`, `bm_other:pointpostal` | stop names / lines, Villo stations, bpost boxes | open WFS, **licence not checked**; the STIB stop names may come from STIB's own data under its own terms, the bpost points from bpost | https://data-mobility.irisnet.be/ (layer pages, e.g. https://data-mobility.irisnet.be/info/urbadm_adpt for the address layer they also serve) and https://data.mobility.brussels/ |
| UrbIS AddressNumbers (urbisvector WFS) | house numbers, FR / NL street + commune names | the UrbIS ADM address points are listed under **CC0** on the Brussels Mobility portal; datastore.brussels uses CC0, CC-BY or paid licences per dataset; the cadastral layer of UrbIS ADM is NOT CC0 (FPS Finance) - we do not use it | https://geobru-geonetwork.irisnet.be/geonetwork/srv/api/records/a8a807b0-6b0b-11ed-8e3b-010101010000 (UrbIS - Addresses), https://be.brussels/en/about-region/urbis-data |
| UrbIS 3D buildings, land cover (street surfaces), DTM | façades, paving, heights | CC0 (CONTRACT / MARKET.md) | datastore.brussels dataset pages |

### Round 2 numbers (noise: the machine also runs other GPU work; read the pairs)
- **GPU A/B, layer on - off** (alternating rounds, Fort-Jaco): street level at Nomade **+0.79 ms** (pairs 0.79 0.72 0.85 0.59
  0.85 0.79), from the sky **+0.79 ms** (pairs 0.79 0.79 0.79 0.85 0.79). Earlier in the round, under the other project's heavy
  load (frames 14-34 ms), the pairs swung by +-12 ms: unusable.
- **That +0.8 ms is NOT the layer's content**: the same constant shows from the sky, where only 2 meshes of 19 are drawn and
  cover a few pixels, and with a PLAIN material on them. Controls in the same lab, same view: an unrelated plain
  `InstancedMesh` of cubes costs +0.92 / +0.85 (2 instances), +0.98 / +0.72 (39), +1.05 / +1.11 (575), +0.66 / +0.59 (2000);
  a plain single `Mesh` costs 0.00 (4 rounds). So on this near-idle GPU (frame ~2 ms) ANY instanced draw adds a fixed
  ~0.6-1 ms (most likely the GPU's clock / power state, or a fixed per-pipeline cost of instanced draws in r187's WebGPU
  backend: to investigate, TODO), independent of instance count and shading. The layer's own increment is below what
  this A/B resolves. Round 1 (GPU kept busy by the other project): +0.13 ms street, ~0 sky.
- CPU per frame: update() < 0.1 ms (timer resolution); the atlas does not re-upload between frames (texture version stable).
- **Atlas upload** (alternating, 6 rounds): one 4 MB page +0.7 ms CPU in the render call (+2 ms until the GPU is done) vs the
  whole 48 MB atlas +4.6 ms (+11 ms).
- Worker per tile: J6 150-195 ms, I6 172-195 ms, I5 87-144 ms (the SDF of the labels is ~85 % of it).
- Mesh audit: 13 kits (spot added), 0 blocking.
- **Flicker** (24 frames, 0.6 mm steps): Nomade fascia 9 m strafe **1 px** (`r2_flicker_nomade_9m_strafe.jpg`), dolly 10;
  Neuhaus 30 m without post 25 / 74 px, none on text (with post a whole-sky flip, 150k px, from the post chain's sky, not
  the layer); street plate at 3.2 m: the plate's edge blinks ONLY with the post chain on (GTAO / SSR on its 2 cm depth
  step: `r2_flicker_plate_3m_strafe_after.jpg`); post off 23 px, none on the plate. Round 2's first plate (1 mm decals for
  the small words) blinked at the decals (`r2_flicker_plate_3m_strafe.jpg`): replaced by the one-label plate. No
  shimmering letters.
- **Names check**: "every shop / fuel name shown is in the data" (0 outside the data), Fort-Jaco and Saint-Job.
- Frame strips: `r2_strip_drive_fortjaco_1.jpg`, `r2_strip_drive_fortjaco_2.jpg` (the camera paths now follow the street's
  real centreline from roads.json: right lane for the drive, the shops' sidewalk for the walk; round 1's paths cut through
  gardens).

### Round 2 weak points
- The fixed ~0.8 ms of instanced draws on an idle GPU (above): needs a proper look (render one frame with only the
  instanced meshes, compare the WebGPU pipeline / pass, check GPU clocks) before the city merge.
- Letters mounted straight on the wall (no board), as at "St Job", are not possible yet: every sign is a board.
- Terraces now appear only where UrbIS measures paving in front: many real terraces (on forecourts or paved private strips
  the land cover calls something else) are gone; at Fort-Jaco the real forecourt is paved but drawn as grass by the city.
- The street-type split (FR "Avenue de" / NL "laan") is a regex over the names: 1,134 of 2,155 plates get the Uccle layout,
  the rest show both full names (e.g. "Avenue De Fré", whose "De" is read as an article).
- Sign treatment (backlit / spots / lightbox) and paint are chosen by a hash per shop: plausible, not the real shop's.
- The gooseneck spots give no light in the lab (their positions go to the night lights lab); the board gets a fixed wash.
