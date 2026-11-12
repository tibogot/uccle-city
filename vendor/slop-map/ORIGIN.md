# vendor/slop-map: origin

Map building blocks taken from **mrdoob/slop-newyork** (MIT, © Mr.doob; see `LICENSE` in this folder).

| | |
|---|---|
| Source repo | https://github.com/mrdoob/slop-newyork |
| Source commit | `536a907c605964421563f12f15c5e00d735fc94f` (2026-11-06) |
| Source file | `js/nyc-map.js` (1,266 lines, class `NYCMapSystem`) |
| `mapCore.js` | The parts of `js/nyc-map.js` that do not depend on New York, as ES exports |

## What was copied (into `mapCore.js`)

| Ours | His (`js/nyc-map.js`) | Change at copy time |
|---|---|---|
| `accessor`, `boundsOf`, `addRing`, `addLine` | `:109-154` | unchanged (exported) |
| `TiledLayer` | `:160-201` | unchanged (exported) |
| `roadLabelAnchors(pts, spacing)` | the body of the `ROAD_LABELS` loop `:294-324` | a function of one polyline; `spacing` was the constant 260 |
| `MapView` | `:340-376` | unchanged (exported) |
| `drawPlayerArrow` | `:379-392` | halo / fill colours are arguments (were `MAP.halo`, `'#ffffff'`) |
| `overlaps` | `:426` | unchanged (exported) |
| `TextWidths` | `NYCMapSystem.textWidth` `:738-746` | a small class around the same cache |
| `drawRoadLabels` | `NYCMapSystem.drawRoadLabels` `:878-936` | a free function: the labels, the search text, the text-width cache, the colours and the font are arguments |
| `drawScaleBar` | `NYCMapSystem.drawScaleBar` `:1235-1263` | a free function; colours and font are arguments |
| `attachPanZoom` | the full-map canvas handlers of `NYCMapSystem.initEvents` `:550-637` and `cancelPan` `:679-685`, `screenToWorld` `:724-729` | a function over a state object; the open flag, zoom limits, render, hover and click (teleport) are callbacks |

Not copied: the New York data and layers (`mapLayers`, `footprintLayers`, `AREA_LABELS`, Manhattan clamp,
`getLocationLabel`), his grid-north radar (`renderMinimap`), the full-map render (`renderFullMap*`), the GPS
route / waypoint. Ideas taken without code: "draw the static layers into a cache bigger than the radar and only copy it
each frame", "rebuild when the player nears the cache's edge or the zoom drifts by more than 12 %", the cached full-map
static layer keyed by the view, the level-of-detail rules by zoom, the dark graphite palette approach.

## Our adaptation (viewer/map/)

`viewer/map/mapWorker.js` (all drawing off the main thread in an OffscreenCanvas: heading-up round minimap cache,
upright street labels placed in a separate pass, current / next street from the road graph, full map frames, search),
`viewer/map/minimap.js` (per frame: blit + rotate + live overlays), `viewer/map/fullMap.js` (modal, pan / pinch /
wheel through `attachPanZoom`, search, teleport), `viewer/map/mapStyle.js` (our palette and layer rules),
`viewer/map/cityMap.js` (the viewer hook, `?map=1`). Data: `tools/build_map.py` -> `data/map/`. See `docs/MAP.md`.

## Rules

- Do not edit `mapCore.js` without logging it in `CHANGES.md`.
- To update, re-copy from a newer upstream commit, redo the changes above and update the hash.
