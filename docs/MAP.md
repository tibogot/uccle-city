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

## Round 2 (2026-11-11): curved names, dual carriageways, live trams, Drive button

**Owner's condition:** no performance loss. Main-thread cost at or below round 1 (average ≤ 0.08 ms a frame while
driving), no new long tasks, measured the same way before and after.

- **Curved street names (minimap).** Each glyph sits on the street polyline at its own arc length. Glyph advances
  come from the text-width cache's prefix widths, so kerning is kept. Each glyph turns with the street. The label reads
  left to right, and upwards when the street is vertical.
  - The worker draws each label once into a north-up sprite at an 8 % zoom bucket (with 10 % hysteresis, so a
    changing driving speed does not re-render every sprite). The main thread turns the sprite with the map: still one
    `drawImage` per label.
  - Candidate places sit at fixed arc lengths along each street, so a sprite is reused from pass to pass.
  - The abbreviation (Av., Ch., Bd, Pl., Sq.; Dutch names kept whole) competes with a lower score, so it wins only
    where the full name does not fit.
  - Side streets use a font one point smaller. Labels have no overlaps (per-glyph boxes), all corners stay inside the
    disc, and the arrow is kept clear.
- **Curved names on the full map too**, drawn straight into the worker's frame. This replaces the vendor's
  straight-run `drawRoadLabels`, which `vendor/slop-map/` still has, unchanged.
  - Placed boxes go in a 32 px grid. A flat list made placement O(n²): 250-500 ms a frame.
  - A street that fails three times is skipped. The two label ends are tested before the full layout.
- **Dual carriageways** (`mapData.buildChains`): same-name segments are chained through every node, taking the
  straightest same-name road on (within 45°). A chain that runs beside a longer chain of the same name (≤ 35 m away
  over ≥ 70 % of its length) is dropped. Avenue Brugmann is now one 1.34 km chain, and is named at every full-map zoom.
- **Live trams 92** on both maps. `getTrams` is the city's own `tramline.positions()` (the GTFS timetable the viewer
  already runs; no other simulation).
  - It is sampled 4 times a second and drawn one sample late, interpolated.
  - Each dot is a white disc with a red heart; a stop is a small red dot with a white ring.
  - Trams alone redraw the minimap at most 10 times a second.
  - The lab has no tram simulation, so no dots there.
- **Drive button:** it now starts on the nearest road of the tile the player stands in (walk, third person, fly).
  Before, it always used `?at=` or Saint-Job. This is a small change in `viewer/main.js` `drive()`.
- **Redraw skip threshold** raised from 0.25 px / 0.15° to 0.35 px / 0.2°, to pay for the above.

**Names per view** (before → after; same positions and headings, Map Lab, `__lab.at()`):

| View | Round 1 | Round 2 |
|---|---|---|
| minimap, walk, Ch. d'Alsemberg (-918,-153) | 0 | 4 |
| minimap, walk, Ch. d'Alsemberg (-922,-81) | 1 | 2 |
| minimap, walk, Avenue Brugmann (-390,-932) | 0 | 2 |
| minimap, walk, Place de Saint-Job (1168,536) | 1 | 4 |
| minimap, walk, Place de Saint-Job (1184,532) | 2 | 4 |
| minimap, drive, Ch. d'Alsemberg | 1 | 4 |
| minimap, drive, Avenue Brugmann | 0 | 2 |
| full map, whole Uccle (0.144 px/m) | 0 | 26 (Brugmann, Alsemberg, Waterloo, Saint-Job…) |
| full map, mid zoom (0.336) | 19 (no Brugmann) | 85 (Brugmann twice) |
| full map, close (2.2) at Saint-Job | 10 | 21 |

**CPU, main thread** (same `cpu_drive` script: city, tile I6, Drive, 3 × 7.5 s of W / S / W+A / W). Round 1 was
served from a `git archive` of 1c03ed7. Times are in-page `performance.now()` (100 µs resolution, averaged over about
450 frames).

| | Round 1 | Round 2 |
|---|---|---|
| City, driving, average per frame | 0.098 / 0.074 / 0.063 (mean 0.078) | 0.046 / 0.069 / 0.046 (mean 0.054) |
| Worst frame | 0.5 ms | 1.0 ms |
| Lab, drive (deterministic route, same frames redrawn: 180 / 164 / 261 vs 177 / 162 / 254) | avg 0.050 / 0.048 / 0.085 | avg 0.060 / 0.053 / 0.072 |
| Lab, walk | avg 0.033 / 0.030 / 0.036 | avg 0.034 / 0.039 / 0.045 |
| Tram sampling (`tramline.positions()`, 4 Hz) | — | 0.04-0.07 ms a call, max 0.6 ms (≈ 0.003 ms a frame averaged) |
| Trace, city drive (`?mapprof=1`, exact marks) | all frames avg 0.105, max 0.80 ms | all frames avg 0.101, p99 0.37, max 0.56 ms |
| Main tasks > 50 ms in that trace | city render only | 3 (254, 300, 56 ms: three.js `update`, the city's render while tiles stream; the map's marked spans inside them are < 0.6 ms) |

- Drawing one frame (2,000 draws in a loop, recording only): 15.7 µs, 4 labels (round 1: 15.3 µs).
- The cost per frame that is actually redrawn rose by ~0.02 ms: more labels, the tram dots, and new sprite uploads.
  The higher skip threshold more than pays it back.
- Worker: label pass avg 0.3-1.5 ms (max 8 ms); full-map frame 17-90 ms (whole Uccle 17-80 ms, mid zoom 42-145 ms;
  round 1: 5-15 ms). The full map shows the last frame moved and scaled meanwhile.

**Images:** `docs/map/r2_minimap_city_strip.jpg` (walk Alsemberg ×2, Brugmann, Place de Saint-Job with a tram 18 m
away; drive at Saint-Job after the Drive button, with a tram; drive on Alsemberg), `r2_full_zoom1_uccle.png`,
`r2_full_zoom2_brugmann.png`, `r2_full_zoom3_saintjob.png`, `r2_full_trams.png`.
