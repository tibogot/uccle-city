# Minimap and full map (branch claude/minimap)

The owner found it hard to know where they are in the city. A round heading-up **minimap** (bottom left) with the
current street and the next cross street, and a **full map** (key `M` or a click on the minimap) with search and
click-to-teleport. Lab first: `labs/map-lab.html`; in the city behind **`?map=1`** (off by default until approved).

URLs (local server on the worktree): `/labs/map-lab.html?route=alsemberg|brugmann|stjob|free&mode=walk|drive|fly&sky=day|dusk|night&lang=fr|nl`,
`/viewer/index.html?map=1&view=walk&tile=E4&at=-916,-195` (any `view=`; `maplang=nl` for Dutch names, `mapprof=1` for
trace marks).

## Pieces

| File | What |
|---|---|
| `tools/build_map.py` | Bakes `data/map/` from our own data (run with the pipeline venv; `--raw <main checkout>/data/raw` from a worktree). |
| `data/map/map.json` (376 KB) | Index of `geo.bin` per tile; the road graph from `data/roads/network.json` (4,531 roads, class, carriageway width, node ids, oneway, delta-coded decimetre polylines) with **911 bilingual names** `[fr, nl]` (OSM `name:fr` / `name:nl` from `data/raw/osm/area.json`, else the halves of "A - B"); the Uccle boundary (OSM rel. 58253, `pipeline/uccle_boundary.geojson`); tram 92 shapes + 15 stops (STIB GTFS, stop names as OSM writes them); 67 landmarks (4 heroes, 35 places of worship, 14 railway stations, 13 castles); 37 named parks / woods / cemeteries / ponds. |
| `data/map/geo.bin` (820 KB) | Per 500 m tile: building footprints (UrbIS solids united per `BU_ID`, simplified 0.35 m, 3 height tones), land cover (park, garden, grass, wood, scrub, water, cemetery, pitch, playground), footpaths, steps, rail, all tram tracks. int16 decimetres from the tile corner. Layout: `[layer u8][items u32]` then per item `[rings u8]`, per ring `[n u16][n × (x i16, z i16)]`. |
| `vendor/slop-map/` | Copied from Mr.doob's `js/nyc-map.js` (MIT): `TiledLayer`, `MapView`, ring/line helpers, label anchors, greedy label placement, text-width cache, scale bar, player arrow, pan/wheel-zoom interaction. See its `ORIGIN.md`. |
| `viewer/map/mapData.js` | Decodes the files into vendor `TiledLayer`s of `Path2D` (per 500 m tile), roads bucketed by class × width; the road graph; a 40 m grid of segments; `where()` (street under the player with hysteresis) and `nextJunction()`; street labels (same-name segments chained through the nodes only they share, then vendor anchors); the search index. |
| `viewer/map/mapWorker.js` | **All drawing**, in OffscreenCanvas: the minimap ground cache, the minimap street-name placement + label sprites (ImageBitmaps), where-am-I, full-map frames, search, snap-to-street. |
| `viewer/map/minimap.js` | Main thread, per frame: one rotated `drawImage` of the cache, label sprites, landmark glyphs, view cone, arrow, north marker. |
| `viewer/map/fullMap.js` | The full map modal: vendor pan / wheel zoom + our pinch zoom, search (FR/NL, accent-free, `st` = saint/sint), scale bar, compass, credits, hover "street & cross street", click = teleport. |
| `viewer/map/mapStyle.js`, `mapCSS.js` | Our palette ("slate atlas", STIB red for tram 92) and zoom rules; our CSS (no lil-gui). |
| `viewer/map/cityMap.js` | The host glue (`startCityMap({ getPlayer, teleport })`), the "loading" note, speed / travel direction from positions. |
| `viewer/main.js` | `?map=1`: `getPlayer()` for walk / third person / drive / fly / orbit, `teleport()`, `mapHook.update(dt)` in the loop. |

## How the minimap works

- **Heading-up**: the map turns so the camera looks up (`bear` = camera yaw); the arrow shows the player's own heading
  relative to it (a car or a character can face elsewhere than the chase camera). North marker on the rim.
- **Zoom by speed** (`radiusMetres`): walking ~110 m to the rim (running a bit wider), driving 150 m + 14 m per m/s
  (≈ 345 m at 50 km/h, max 520), flying 260 m + speed + altitude (max 1.1 km); smoothed.
- **Ground cache**: the worker draws a north-up square 2.2 × the disc (covers any rotation) at the current scale.
  A new one is asked when less than 1.33 × the radius of it is left past the player, or the zoom drifts by > 12 %
  (while zooming it is drawn 10 % of the way to the target scale), centred ahead of the motion. The old one is shown
  until the new ImageBitmap arrives (transferred, zero copy), so a rebuild **never waits and never costs a frame**.
- **Street names** are not in the rotating cache: the worker places them for the current position + heading + zoom
  (≤ 6 times a second), sliding each label along its straight run towards the player, upright (angle flipped into
  ±90°), corners inside the disc, no overlaps, the arrow kept clear, current street first, then main roads. It sends
  each new text once as an ImageBitmap sprite; the main thread draws the sprites at their world anchors every frame
  with the current heading (so they stay upright while the map turns).
- **Current / next street** (4 Hz, worker): nearest road segment within 30-40 m (named roads and roads along the
  travel direction preferred; keeps the previous street while it is about as close: no flicker at junctions), then a
  walk along the graph in the travel direction, through nodes where the same street continues, to the first node where
  another named street (not a service road) meets: "in 50 m: Avenue Brugmann / Rue de Stalle", "now: …" under 15 m.
  Shown within 220 m on foot, 450 m driving.
- **Phones** (≤ 640 px wide or ≤ 480 px high): the minimap is 150 px and hidden behind a map button; hidden = no work.

## How the full map works

North up (L72 grid north; true north differs by ~0.01° here). The worker draws a whole frame for the view (ground,
the commune line with a veil outside it, park names, tram stop names when close, street names by the vendor placement,
landmark pins with names right or left of the pin, never overlapping); while it is on its way the main thread shows the
previous frame moved / scaled to the current view, so dragging and zooming never wait. Search: streets, landmarks,
tram stops, parks, in FR and NL ("brugmannlaan" finds Avenue Brugmann, "sterrenwacht" the Observatory); a street result
highlights every stretch of it and frames it. Hover: "street & nearest cross street · click to go there". Click:
snaps to the nearest street within 80 m and teleports. `Esc` closes; while it is open no key reaches the 3D modes
(capture-phase listener; typing in the search box is stopped at the modal).

**Teleport in the city** (`viewer/main.js`): the current mode stops, the camera parks in orbit 140 m above the target
(the orbit target drives the streaming), the stream loop runs at once (tiles left behind go without the far-tile
hand-over while jumping), and when the target's tile is in, the same mode restarts there facing along the street (the
direction closest to the old heading). Third person also waits for its colliders on the new tile (holding the character
in place). A small note says "Going to … loading the area", then "ready in x s".

## Costs (measured 2026-11-11, this desktop, Chrome, WebGPU city, dpr 1)

| | |
|---|---|
| Minimap main thread per frame, city, driving / turning (in-page, 3 × 7 s) | **avg 0.064-0.067 ms**, p99 0.2-0.3, max 0.3-0.6 ms |
| same, city, one earlier 10 s run | avg 0.083 ms, one outlier frame of 14.5 ms (not reproduced in 3 more runs; suspect a GC pause landing inside the measured span) |
| Lab (no 3D), 8 s each | walk avg 0.027 ms (45 of 480 frames redrawn), drive 0.057, fly 0.056; max 0.7 ms |
| Performance trace, city drive, exact mark timestamps (`?mapprof=1`, tracing overhead included) | all frames avg 0.105 ms, p50 0.097, p99 0.38, max 0.80; redrawn frames avg 0.17 |
| Cache rebuild, worker | 0.5-1.7 ms driving / flying, 4-7 ms walking (buildings outlined); **0 ms of it on the main thread** |
| Cache arrival on the main thread (trace, 9 rebuilds) | its own message task of 0.11-0.28 ms, outside the frame's rAF; frames over 16.7 ms in that trace are the city's rendering (none contains a map task over 1 ms) |
| Label pass, worker | avg 0.2-1.1 ms, max 13.5 ms (new sprites) — off the main thread |
| Where-am-I, worker | avg 0.03-0.13 ms |
| Full map frame, worker | 5-10 ms whole Uccle, ~60-70 ms at street zoom over a 1400 × 900 view (all footprint outlines); the main thread only copies it |
| Data | 1.2 MB (map.json 376 KB + geo.bin 820 KB), worker fetch 13 ms + decode 77-99 ms, once, off the main thread |

Why a canvas touched at all costs ~0.07 ms: a 2D canvas drawn every frame pays a fixed price per frame (getting a
fresh backing after the last frame was presented); the drawing itself is ~15 µs (2,000 draws in a loop). So the
minimap redraws only when the picture moves by a quarter pixel or 0.15°: walking or driving straight that is ~15 Hz.

**Teleports (city, desktop):** Place de Saint-Job from Chaussée d'Alsemberg, walking: 5.9 s (tile I6 streamed in:
5.8 s of it is I6's own build, the church and falcons included); Rue Engeland (tile E8), driving: 2.6 s; Avenue
Circulaire by the Observatory (H4), third person: 4.1 s (colliders included); Avenue Brugmann (F3, already loaded): 0.2 ms.

## Images

`docs/map/minimap_city_strip.jpg` (the minimap in the city while moving: Chaussée d'Alsemberg ×2, Avenue Brugmann,
Place de Saint-Job walking; Alsemberg and Rue Engeland driving; third person; flying), `docs/map/full_zoom1_uccle.png`,
`full_zoom2_search_brugmann.png`, `full_zoom3_saintjob.png` (the full map at 3 zooms), `phone_minimap_night.png`,
`phone_fullmap.jpeg` (390 px wide), `lab_dusk_brugmann.jpeg` (the Map Lab on a dusk sky).

## Weak points / next

See docs/TODO.md "Map (claude/minimap)".
