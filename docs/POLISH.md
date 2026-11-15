# Visual polish, round 1 (claude/polish1, 2026-11-15)

Every look change has its own `?key=old` A/B (viewer/features.js, "A/B: old versions" > Look); `?polish1=old` turns
them all back at once (viewer/polish.js). Images in docs/polish1/, before / after from the same camera
(debug/polishShots.js: `ready`, `view`, `hud`, `sample` (pixel colours), `gpu` (GPU p50 at a view)).

Perf: the preflight was RED all session (other agents' Chrome tabs + Cursor). Rough interleaved A/B, `?wx=snowfall`,
Place Saint-Job street, 2 rounds per side, tab in front: street view 13.44 -> 14.03 ms p50, kerb view 14.84 -> 14.84
ms: within the noise. Items 2 / 4 / 6 / 7 / 0 cost nothing on the GPU (uniforms, constants, CPU only). Re-measure on
GREEN (`?polish1=old` vs default).

## 0. The boot never hangs silently (coordinator, mid-batch)

- **Cause**: J7 (and any tile, on a return visit) stuck on "Compiling shaders" (loader stage `tiles`) with no error:
  the tile worker's IndexedDB tile cache (viewer/tileCache.js, boot2) never answered after a Chrome crash/restart (no
  success / error / blocked event), so `cached()` awaited forever. `?tilecache=0` booted.
- **Fix**: every cache step has an 8 s deadline (past it: a miss, the tile is built, the cache is off for the session;
  the first `open` also resolves on `blocked`). Worker errors / unhandled rejections outside a build are forwarded to
  the page; a build error or a request with no answer after `?tilewatchdog=45` s is a `console.error`, a log line and
  a red line on the loader (`__loader.error`). Worker bundle rebuilt (node tools/build_worker.mjs).
- **Proof**: J7 boots with the cache on (37 s); `?tile=J6&tilewatchdog=2` shows "tile I5 (far): no answer from the
  tile worker in 2 s" and still boots; J6, H6, H5, E4, B5, J7 boot (35-44 s, no error).
- Cost: none.

## 1. Snow: stepped edge, beige scene

- **Cause (edge)**: two staircases of 12.5 cm overhead cells. (a) The volumetric layer (viewer/weather/snowLayer.js)
  dropped every triangle that touched one hidden vertex (cliff / thin / salted road), so its edge followed the cells.
  (b) The materials' own cover (viewer/weather/cityWeatherize.js) tested "am I the topmost surface" against the
  NEAREST cell: where the terrain of a planted bed dips under a sidewalk, its snow came out in cell blocks.
- **Fix**: (a) a soft hide flag over the 4 neighbours, the layer's thickness tapering to 0 toward it, the cut at the
  0.42 iso-line of the interpolated flag (a straight chamfered line through the triangles), plus a cut of faces
  steeper than ~55 deg (slivers across a kerb). (b) the exposure test bilinear over the 4 nearest cells (full path
  only; lite far tiles unchanged). Switch `?snowedge=old`.
- **Cause (beige)**: the grade corrected only 75 % of the horizon's tint, clamped at 1.3, while the snow is lit by the
  golden-hour sky dome + key, warmer than the horizon; the split-tone warmed every highlight (the snow is the
  highlight); snow metered as mid-grey.
- **Fix** (viewer/weather/cityWeather.js coupleSky, viewer/post.js): with snow on the ground the correction goes all
  the way, the horizon's inverse to the power 1.65 (measured on the snow at golden hour), clamp 0.5-2.3, a cool target
  (r x0.84, b x1.02); no warm split-tone on the highlights (`grade.warmHighs`); +0.45 EV (`pipe.wxEV`, a photographer
  meters snow up). Snow pixel, kerb view: (147, 134, 133) beige -> (179, 179, 189) cold white. Switch `?snowwb=old`.
  Photos of Brussels in snow (looked at only): neutral to blue-white snow, grey-blue shade, no warm cast.
- Images: 1_snow_street_before/after.jpg, 1_snow_kerb_before/after.jpg.
- Cost: +3 texel loads per weatherized fragment (only while the weather gate is on), a few ALU in the layer; see the
  A/B above (noise level). Left: a few cell-sized marks remain where the terrain of a planted bed pokes through the
  sidewalk (a join defect, item 5); the lawn at Square des Heros under `?wx=snow_cover` is a blotchy camouflage at
  15 cm of snow (see "Other defects").

## 2. Checker dither at the tree hand-over

- **Cause**: the mesh -> impostor hand-over (IMP.band, 30-50 m at 400 m) and the trees' shadow fade (TREE_SHADOW.band,
  40 m at 120 m) split pixels by a static screen dither: every tree standing in a band showed a checker for as long as
  the camera stood still. No TAA in the post chain, so temporal noise would only shimmer.
- **Fix** (viewer/treesStylized.js `treeBandSettle`, pushed by main.js): the bands follow the camera SPEED: band =
  speed x 0.8 s, clamped to [1 m, the configured band], widening in ~0.15 s, narrowing over ~0.6 s. Crossing the
  hand-over takes ~0.8 s of dissolve at any speed (a timed fade, like the landmarks' `?lodsettle`); standing still
  every tree settles to one side (whole mesh or whole impostor). Switch `?treedither=old`.
- Images: 2_tree_handover_before/after.jpg (fov 14 toward the 400 m ring from Place Saint-Job: the dithered crowns
  are solid after).
- Cost: CPU only, two uniform writes per frame.

## 3. Zebra bark

- **Cause**: the bark (viewer/treesStylized.js barkMaterial) was one noise stretched 8:1 along the tree's own y (on a
  leaning trunk or a limb: diagonal bands), ~0.3-0.5 m wide, through a 0.07 -> 0.26 ramp (near-black furrows on half
  the surface).
- **Fix**: London plane / lime bark (photos looked at only): isotropic flaking patches in three soft tones (olive-grey,
  grey, cream; albedo 0.09-0.175), thin short fissures (3:1, ~15 % of the surface, a third darker), fine grain, the
  moss as before; the bump scaled down. Switch `?bark=old`.
- Images: 3_bark_before/after.jpg (Avenue De Fre, G4).
- Cost: 4 noise evaluations per bark pixel instead of 2 (trunks only).

## 4. Near-black blue-stone plinths

- **Cause**: the facade shader's plinth (viewer/facades.js) was albedo 0.075-0.09 (sRGB ~78); in shade with the AO at
  the wall foot it read black (Fort-Jaco, Av. Alphonse XIII). The kit's stone_blue (0x55595f) the same.
- **Fix**: weathered petit granit's mid-dark grey: plinth 0.125-0.137 (+ a stronger grain), landmark plinth 0.13,
  kit stone_blue 0x666a70 / 0x585c62. Switch `?plinth=old`.
- Images: 4_plinth_before/after.jpg (Fort-Jaco, J7).
- Cost: none (constants).

## 5. Pale patch on the Place Saint-Job sidewalk / white dotted band (NOT FIXED: cause found for the patch)

- The pale irregular patch at the building corner by the tram stop (1175, 549) is the TERRAIN showing through: the
  UrbIS sidewalk polygon (roads-concrete) stops short of the building wall and the terrain under it, 2-10 cm lower,
  carries a pale ground cover there (raycasts: roads-concrete 71.88 / terrain 71.80 / walls). The same terrain rises
  ABOVE the sidewalk at the planted bed on the Place (1167, 544), where it makes the ragged kerb line. A fix belongs
  in the tile build (fill the sidewalk to the facade line, or give the terrain a paved cover inside the street-surface
  gaps) and needs a worker rebuild + a city-wide check: left for a join round.
- The white dotted band at shop-sign height: not reproduced by day or in the round-2 night images; the small
  0.64 x 0.30 m blue enamel plates on the facades (house numbers, street-life atlas) are fine.

## 6. Car lights

- **Cause**: the traffic's lamps were set to measured levels (carPacks.js packLook: brake 0.35, night tail 0.4) but
  the player's car (carModel.js and the pack path with `lights`) and the motorbike kept x5 brake / x1.2-1.4 tail: a
  cream-pink blown lens and bloom over the boot. Close headlights: the pool lights fall off as 1000 / d^2 with a
  0.15 m source, so a car 2-4 m ahead took 60-250 and its pale paint blew out.
- **Fix**: the player car and the motorbike read packLook (one set of levels for every vehicle); the headlight pool
  lights' falloff radius is 3 m (a near-field softening: x0.31 at 2 m, x0.64 at 4 m, x0.92 at 10 m, the road at
  15-30 m within 4 %). Switch `?carlights=old`.
- Images: 6_brake_before/after.jpg (drive mode, brake held). The headlight change is numerical only (no night chase
  behind a pale car was set up).
- Cost: none.

## 7. `?tile=H6` boot crash

- **Cause**: H6's own build asks the OSM bridge decks for the ground (tram.js -> onRoadDeck -> deckHeight) before the
  tile is pushed into `world.tiles`; `worldRef.at()` returned `tiles[0]` = undefined -> `.hm` of undefined.
- **Fix** (main.js addBridgeDecks): the world's nearest tile once one is loaded, else this tile's own height map.
- **Proof**: `?tile=H6` boots (44 s, no error).

## 8. Weather on the Heros memorial

- **Cause**: the memorial's slot materials (viewer/heros/herosModel.js wrapAO) were built on top of the WEATHERIZED
  source colour: the weathering lift, a brown tint and `min(0.5)` clamped the snow to grey and the roughness was
  overridden: the steps / plinth read dry under snow.
- **Fix**: the look is built on the dry colour / roughness / normal (`userData.wxDry`) and the wrapped material is
  weatherized itself, last. Switch `?herosnow=old`.
- Images: 8_heros_snow_before/after.jpg (`?wx=snow_cover`, the memorial's steps take snow).
- Left: garden walls, street furniture, signs, stops, lamps still not weatherized (wxMat would add one shader variant
  per material family: do it with a GREEN measurement).

## Other defects seen

- Square des Heros under `?wx=snow_cover` (15 cm): the lawn's snow is a blotchy camouflage (half the grass shows)
  instead of a full cover.
- Snow on the street trees' limbs reads as white stripes along the top of every branch (heavy at 8 cm).
- Crossings: dark smudges on the zebra stripes (Fort-Jaco, by day).
- A thick grey line across the view at 1102, 542 (the tram's contact wire a few metres from the camera, no
  distance-based thinning).
- Far tiles at the horizon swap between flat boxes and buildings between two loads of the same view.
- The bark on the shaded side of a trunk in full shade still reads near-black (lighting, not the albedo).
- Chrome restarted once mid-session (all tabs gone): if a cache/IndexedDB looks stuck, `?tilecache=0` (now also a
  deadline).
