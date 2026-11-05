# Dev panel re-audit (2026-11-06, branch claude/perf-panel)

Every control of `viewer/devPanel.js` + `viewer/smoothPanel.js` in the merged version (after the faceted car fleet and
the smooth-LOD merges), changed through the panel itself (`Ctrl.setValue` / its button) by `debug/panelAudit.js`:
the engine value it should drive read back, the address bar checked, and for visual controls the share of pixels
that changed (192 x 108 readback, > 8/255 per channel). "(reload)" switches: set, "↻ reload with these" clicked,
the engine checked after the reload. Share link: copied, reopened, checked.

Legend: **working** / **fixed** (was broken, fixed on this branch) / **removed**.

## Modes & camera

| Control | Result | Checked |
|---|---|---|
| ▶ overview | working | mode orbit, `view` removed from the URL |
| ▶ Saint-Job close-up | working | mode orbit, `view=stjob` |
| ▶ walk (first person) | working | mode walk, `view=walk`, eye at 1.7 m |
| ▶ fly the falcon | working | mode fly, `view=fly` |
| ▶ drive | working | mode drive, `view=drive` |
| ▶ third person | working | mode third, `view=third` |
| car (drive) | working | `car=faceted:taxi` in the URL, model swapped |
| car colliders (G) | working | `driver.debug.visible`, `drivedebug=1`, picture 3 % |
| character (3rd person) | working | `char=casual`, skinned model swapped |
| character colliders (G) | working | `chardebug=1`, picture 1.7 % |
| foot IK | working | flag set on the character body (not readable from outside; code path) |
| field of view | working | `camera.fov`, picture 90 %; carried by the share link |
| photo mode (H to leave) | working | panel and HUD hidden, H brings them back |
| mode now | working | read-out follows the mode |

## Time & sun

| Control | Result | Checked |
|---|---|---|
| preset | **fixed** | worked, but not on a page opened with `?hour=`: the hour stayed (`lighting.urlHour` now dropped on a preset change). `time=` in the URL, picture 95 % |
| solar time (h) | working | override + `hour=` |
| day of year | working | `lighting.day`, `day=`, picture 64 % |
| sun speed (x real) | working | hour 18.70 -> 19.54 in 1.5 s at x2000 |
| back to the preset's time | **fixed** | same `?hour=` case as the preset |

## Trams

| Control | Result | Checked |
|---|---|---|
| timetable clock (h) | working | `clockSecs` 8:30, `clock=08:30` |
| timetable speed (x real) | working | `timescale` 30, `timescale=30` |
| back to now, real speed | working | clock now, timescale 1, both params removed |
| running | working | read-out ("20 running at 08:30") |

## Sky & clouds (live, carried by the share link, not URL parameters)

| Control | Result | Picture |
|---|---|---|
| cloud cover | working | 78 % |
| type: stratus ↔ cumulus ↔ storm | working | 67 % |
| cloud base (m) | working | 67 % |
| cirrus | working | 1.1 % (thin high cloud) |
| wind at the clouds (m/s) | working | 0.6 % per 0.6 s (moves the clouds) |
| wind direction (°) | working | 1.3 % |
| air haze | working | 0 % close up, 12 % in the overview |
| aerosols (whiter sky) | working | 54 % |
| sun disc (°) | working | 5.8 % |
| eye adaptation | working | 96 % |
| exposure bias (EV) | working | 98 % |
| night exposure (EV) | working | 1 % by day, 89 % at night |

## Weather

| Control | Result | Checked |
|---|---|---|
| volumetric valley fog | working | `vfogOn`, `vfog=1`, 94 % |
| fog density / layer top / falloff | working | written into the live fog (`lighting.vfog.params`), 81-91 % |

## Lighting & post

| Control | Result | Checked |
|---|---|---|
| street lamp pools | working | `uLampPower`, 84 % (golden hour) |
| sky haze + sun shafts | working | `haze=0`; subtle at the golden preset (mean 0.6/255 with air haze 6) |
| ambient occlusion | working | 6-7 % |
| reflections (SSR) | working | 0.5 % at street level (few glossy metallic surfaces in the city) |
| bloom | working | 42 % at 1.5 |
| sun shadows (recompiles) | working | 21 % |

## World

| Control | Result | Checked |
|---|---|---|
| layer: terrain / buildings / roads / features | working | group visibility; 14 / 42 / 9 / 22 % |
| contour lines (1 m) | working | uniform; 0.6 % close up (fine lines) |
| parked cars | working | hides the faceted fleet (`parked-cars-fleet`) and the per-tile box cars |
| roads (reload) | working | `roads=engine` -> engine road meshes |
| Saint-Job model (reload) | working | `stjob=0` -> no model, UrbIS solid |
| Blender lamps (reload) | working | `lampmodel=0` |
| trams (reload) | working | `trams=0` -> no tram line |
| tram look (reload) | working | `tram=box` |
| trees (reload) | working | `trees=simple` (tree-crowns-*), `trees=slop` (TreeCell_*) |
| tree impostors (reload) | working | default on (follows the smooth-LOD merge); `impostors=0` -> none |
| full-detail ring (reload) | working | `ring=0` -> 1 tile, `ring=2` -> 21 |
| far LOD ring (reload) | working | `far=1` -> 8 far tiles |
| post effects (reload) | working | `fx=0` -> no pipeline |
| cascaded sun (reload) | **removed** | `?sunlight=1` only acts with the old sky (`?sky=old`); with Firmament, the default, it did nothing |
| GPU timing (reload) | working | `gpu=0` -> no timestamp queries |
| ↻ reload with these | **fixed** | applied every switch, but dropped `view=stjob` (the close-up and the overview are both "orbit"): now kept |

## Smoothness

| Control | Result | Checked |
|---|---|---|
| trees LOD 0→1, morph band, trees LOD 1→2, morph band | **fixed** | live on the loaded tiles, but tiles streamed in later started from the defaults: now written into the shared tree parameters too; not URL parameters (share link) |
| LOD 2 → impostors, cross-fade band, impostors end | **fixed** | live, now mirrored into `impstart` / `impband` / `impend` |
| fade-out band | working | `IMP.endBand`; share link |
| tree shadows end | **fixed** | live, now mirrored into `treeshadowend` |
| fade band | working | `TREE_SHADOW.band`; share link |
| shadow edge fade (share) | working | `shadowFade.uBand`, 2.3 % |
| shadow range lag (s) | working | `shadowFade.tau` |
| tile cross-fade (s) | **fixed** | `fader.seconds`, now mirrored into `tilefade` |
| shadow box / fade | working | read-out (±135 m, fade 124 m, texel 6.6 cm) |
| trees drawn | **fixed** | counted the fields of disposed tiles too (`window.__stylizedTrees` kept every tile's field forever: a leak); now loaded tiles only, and the list drops disposed fields |

## Performance

| Control | Result |
|---|---|
| stats, fps, GPU ms, draw calls, triangles, GPU memory, shader programs | working (read-outs, every 0.5 s) |
| character / car CPU | working ("character 0.244 ms" in third person) |
| ▶ benchmark (3 views, ~20 s) | working ("overview 13.37/17.3 · close-up 12.65/13.11 · walk 12.58/13.3", GPU shared) |
| last benchmark | working |

## Debug

| Control | Result | Checked |
|---|---|---|
| wireframe | working | 978/978 materials, 89 % |
| dev log | working | `logBox.open`, `log=0` |
| old HUD (stats) | working | HUD hidden |
| 🔗 copy link to this view | **fixed** | carried the state, mode and camera; now also the Smoothness folder's numbers, and an opened link leaves the address bar after it is applied (a reload put the shared state back over every later change) |
