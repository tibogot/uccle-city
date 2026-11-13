# Street life in the city (branch claude/streetlife-city, 2026-11-13)

The Street Life Lab layer (docs/STREETLIFE.md) now runs in the city. It is **on by default**. `?streetlife=0` turns it off,
and the city is then exactly as before.

## What is in the city

Everything the lab draws, streamed with the full tiles. The data is the lab's `data/streetlife/<T>.json` (120 tiles,
4.3 MB; data files unchanged, so the manifest stamp is unchanged):
- real shop, café, bank and pharmacy names on the fascias: 524 named POIs (OSM name or brand, text only), shopfronts with
  the parallax shop window, awnings, projecting signs, ATMs
- the green pharmacy crosses, the 17 fuel stations (canopy with the name, pumps, price pylon showing the grades only),
  STIB stop poles + flags + shelters (Brussels Mobility WFS), Villo docks + terminal, bpost boxes, glass bubbles
- Uccle street plates (2,155) and house numbers (19,287 UrbIS numbers)
- by night: lit letters, lightboxes, crosses and shop windows, all emissive and driven by the city's own night value
  (`env.uNight`). No light was added (fixed light pools rule).
- façades: the tile worker reads the same file. The wall shader and the façade kit leave their ground-floor openings
  out where this layer's shopfronts are (`analyseBuildings(..., { fronts })`), so kit windows and doors no longer
  sit behind or through a shopfront. The façade's own OSM fascia and awning boxes are not drawn when the layer is on.
  If a wall has several shops, one slot covers all of them.
- the OSM bus-stop poles of furniture.js are left out when the layer is on, because the layer draws the STIB stops
  from the WFS (no double poles).

Lite (far) tiles get no street life.

## How it hooks in (files)

| file | change |
|---|---|
| `viewer/streetlife/cityStreetLife.js` (new) | `start()` before the first tile; `tile(name, parent)` when a tile starts loading; `removeTile(name)` in its dispose; updater: night value + `layer.update(camera)` |
| `viewer/main.js` (shared, +12 lines) | import; `streetlife` flag in `tileData()`'s entry; `cityStreetLife.tile(entry.name, own.features)` at the start of `loadTile` (runs in parallel with the tile worker); awaited before `preCompile`; bus stops filtered from furniture; `removeTile` in dispose; `start()` after `cityKit.start()` |
| `viewer/tileData.js` (shared) | `entry.streetlife`: fetch `data/streetlife/<T>.json`, pass its shopfronts to the façade analysis |
| `viewer/facadeGeom.js` (shared) | `opts.fronts`: the shop slot (shopU / shopW) comes from those fronts; no own fascia / awning |
| `viewer/tileWorker.bundle.js` | rebuilt (`node tools/build_worker.mjs`) |
| `viewer/streetlife/streetlife.js`, `streetlifeWorker.js` | see below; `labs/streetlife-lab.js` adapted (2 lines) |

The tile's street-life meshes live in the tile's `features` group. That means:
- the tile's `preCompile` builds their shaders and fade copies before the tile shows (0 synchronous pipelines seen);
- they fade in and out with the tile (Fader, dithered);
- they are disposed with the tile. Street-life materials are marked `userData.shared`, so a tile's dispose never frees them.

The prop pools are city-wide. They take a tile's fade from its group (`iBand.z`, same dither rule as `objectFade`).

## Performance work

- **The lab's "fixed ~0.8 ms per InstancedMesh"**: both of tonight's causes were checked. (a) No `DynamicDrawUsage`
  anywhere in the layer. Pool buffers use static usage with `needsUpdate` and `addUpdateRange` over the live count only.
  (b) Empty instanced meshes are never drawn: tile meshes are only made when their count is > 0, and each prop pool sets
  `visible = count > 0`. The lab's old prop meshes were per tile, 2 per kind, and stayed visible over a whole tile's
  sphere. GPU ms cannot be measured tonight (the GPU is shared), so no GPU number is claimed.
- **Fewer draws.** Props used to be one mesh per tile, per kind and per LOD (up to 26 per tile). Now there is one pool
  per kind and LOD for the whole city: 13 kinds, 2 materials in total, with the LOD band per instance. The pools are
  re-filled every 4 m of travel (or every frame while a tile fades) with the instances in range. Per tile, the layer
  has 1 box mesh (every sign, plate, number and frame), 1 window mesh and 1 shelter-glass mesh. Fewer unique shaders
  too: 5 materials in the layer (box, window, glass, prop LOD0, prop LOD1), down from 26 + 3.
- **No shadows from signs, plates, numbers, frames or windows** (the box, window and glass meshes cast none). Prop kits
  keep their own flag (pumps, tables, parasols and posts cast one; the cross and the spots do not).
- **Distance LOD without popping.** Each box shrinks to its centre between 75 % and 100 % of its range, about
  350 x its middle size (vertex stage, no discard):
  - house number: 70 m
  - plate: about 105 m
  - fascia: about 280 m
  - canopy: 600 m

  The text itself fades from 62 to 84 m (lab). A tile mesh is not drawn at all once the camera is farther than its
  range from the mesh's box (600 m; 250 m for glass).
- **Off the main thread.** The layer's own worker does the layout, the SDF text, the label packing into atlas pages
  and all the per-instance buffers, in parallel with the tile worker. The main thread then:
  - wraps the buffers in `addTile`;
  - in a later frame, inside `update()`, copies one tile's text pages into the atlas (only when the tile is within
    400 m) and uploads only those layers.
- **Atlas**: a `DataArrayTexture` of 16 layers of 2048 x 1024 (R8, mipmapped: 32 MB plus mips). A tile needs 1 to 3
  layers. Only tiles within 400 m of the camera keep theirs. When the atlas is full, the farthest tile beyond 400 m
  gives its pages up: its rects are cleared, so its boards go blank and never show another tile's words. They come
  back from its CPU copy when it is near again.

## Costs measured (this machine, shared GPU: CPU and counts only)

**Main thread per tile**, measured in the city page (a separate layer instance, the same code):

| tile | `addTile` (wrap buffers) | text pages into the atlas (later frame) | worker (layout + SDF + pack) | boxes / labels / pages |
|---|---|---|---|---|
| J6 Fort-Jaco | 0.6 ms | 1.1 ms | 271 ms | 575 / 232 / 2 |
| I6 Saint-Job | 2.8 ms | 2.0 ms | 293 ms | 696 / 311 / 2 |
| I5 | 0.6 ms | 1.2 ms | 148 ms | 381 / 210 / 2 |
| E4 Alsemberg | 2.0 ms | 2.1 ms | 364 ms | 1,271 / 411 / 3 |
| D5 | 0.8 ms | 1.4 ms | 165 ms | 440 / 184 / 2 |
| J5 | 0.4 ms | 1.1 ms | 166 ms | 457 / 211 / 2 |

- Every slice is under the 4 ms budget.
- During boot or under load, the `addTile` slice was logged at 3-9 ms twice (J6 and J5 at boot under the cover).
- The atlas upload adds about 1.3 ms to that frame's render call (6 rounds, median; two 2 MB layers + three's mip
  regeneration of the array).
- `update()` per frame: p50 0.0 ms, p90 0.1 ms, max 0.2 ms (300 frames driving at 30 km/h). A pool re-fill takes about 0.1 ms.

**Draws and triangles added** (renderer.info, the layer's groups on vs. off, same frame, all passes):

| view | draws | triangles |
|---|---|---|
| Fort-Jaco, Neuhaus, street level | +12 | +36 k |
| Place de Saint-Job, St-Job | +14 | +6 k |
| Alsemberg, Etam | +11 | +44 k |
| Parvis Saint-Pierre (Galler) | +16 | +45 k |
| from the sky, 200 m up over Alsemberg | -3 to 0 (noise) | +29 k |

GPU ms: not measured, because the GPU is shared tonight.

## Quality checks

- Day, Fort-Jaco, before / after:
  - [before_fortjaco_neuhaus_day.jpeg](city/before_fortjaco_neuhaus_day.jpeg) / [after_fortjaco_neuhaus_day.jpeg](city/after_fortjaco_neuhaus_day.jpeg)
  - Fintro, Neuhaus and Histoire d'Ongles sit on the wall where the kit had plain windows.
- Day, Saint-Job, before / after:
  - [before_stjob_day.jpeg](city/before_stjob_day.jpeg) / [after_stjob_day.jpeg](city/after_stjob_day.jpeg)
  - "St-Job" with its awning; the kit's ground-floor window is gone, the upper floors are unchanged.
- Street plate up close: [after_stjob_plate_numbers.jpeg](city/after_stjob_plate_numbers.jpeg)
  ("Place de Saint-Job / Sint-Jobsplein, Uccle - Ukkel", flat on the brick wall).
- Night, Fort-Jaco, before / after:
  - [before_fortjaco_night.jpeg](city/before_fortjaco_night.jpeg) / [after_fortjaco_night.jpeg](city/after_fortjaco_night.jpeg)
  - Multipharma's green cross, BNP Paribas Fortis and Les Bourgeoises lit.
- Alsemberg, day and night:
  - [after_alsemberg_etam_day.jpeg](city/after_alsemberg_etam_day.jpeg): the kit's door sits next to the shopfront, not through it
  - [after_alsemberg_parvis_day.jpeg](city/after_alsemberg_parvis_day.jpeg)
  - [after_alsemberg_parvis_night.jpeg](city/after_alsemberg_parvis_night.jpeg): Multipharma, Galler, La fleur du pain
- Esso at Fort-Jaco: [after_fortjaco_esso_day.jpeg](city/after_fortjaco_esso_day.jpeg)
- **Moving strip**: [strip_dolly_fortjaco.jpeg](city/strip_dolly_fortjaco.jpeg), 19 frames every 4 m, backing away
  from 40 to 112 m with a fixed look, full-resolution crop.
  - Fascias, crosses and windows recede smoothly; no frame shows a sign appearing or vanishing at once.
  - Text at a grazing angle hands over to the board's average from about 30 m (the lab's footprint fade). This is
    gradual over 2-3 frames (8-12 m), not a pop.
- Streaming: a flight over 3 tiles and back.
  - Tiles add and remove their street life.
  - The atlas evicted 1 far tile's pages and refilled them when the camera came back.
  - Console clean: no errors, no new kind of warning compared with `?streetlife=0`.
- The lab still runs (`labs/streetlife-lab.html?site=fortjaco`, 2 pages of 2048x1024 for J6).

## What is left / weak points

- **GPU cost**: to measure on a quiet machine. Run a street-level A/B with `?streetlife=0`, alternating, as in the lab
  and `debug/perfRun.js`.
- **Frame-time A/B while streaming**: this background tab was throttled to 1 frame per second, so stutter could not be
  judged here. Run `debug/perfRun.js` suite on and off.
- Shopfronts on sloping streets: where the terrain rises along the wall, the riser and window can go under the grass.
  Seen at Fort-Jaco near the Esso. Layer data: `f.y` is the walking surface at the shop centre only.
- Shops set back behind OSM grass (Neuhaus row): the shops sit on the real walls, but the forecourt is drawn as grass
  (city land cover).
- Some house numbers land inside a shopfront (the plate is behind the window). A data / layout question for the lab.
- A wall with several shops gets ONE opening slot over all of them: wall glass can show in a gap between two shops.
- Three regenerates the mips of all 16 atlas layers on every upload (r187 has no per-layer mips for array textures).
  The measured cost is about 1.3 ms CPU. Per-layer mips from the worker would need a raw `writeTexture`; not done.
- Text-page CPU copies are kept per loaded tile (2-6 MB each) so eviction can restore them.
- Sign styles are still hashed (lab weak point); night: the gooseneck spots give no light (no lights added, by rule).

## Data licences to confirm (from the lab, not blocking)

- OpenStreetMap (names, fuel, street names): ODbL. The city must show "© OpenStreetMap contributors".
  The extract came from a mirror, osm_base 2026-07-24; re-fetch from overpass-api.de.
- Brussels Mobility WFS (STIB stops, Villo, bpost boxes): licence not checked.
- UrbIS AddressNumbers (house numbers): listed CC0 on the Brussels Mobility portal; confirm the dataset's own licence.
- UrbIS 3D buildings, land cover, DTM: CC0.
