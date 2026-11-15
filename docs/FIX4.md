# FIX BATCH 4 (claude/fix4, 2026-11-15)

The "fix later" items the owner asked us not to forget. Each item below gives the cause, the fix, the switch (the
old version), before / after images taken from the same camera, and the cost. Images are in `docs/fix4/`. The checks
are in `debug/fix4.js` (`follow`: a chase camera on one traffic car, one sheet row per variant; `frame`: a frame
grabbed right after a stepped render).

**Machine state: RED for the whole batch.** tools/perf/preflight.ps1 failed on 0.9-1.7 GB free memory, 81-83 C GPU,
the power cap, and 73-86 % GPU load at rest, because two other agents' tabs were rendering (8909, 8911). Every number
here is an A/B taken in one page with the two states interleaved. Only the differences matter, not the absolute ms.
Re-measure on GREEN.

## 1. Car rear lamps at night: one solid red block over the whole rear

**Cause: the night pool's rear light lit the car's own body.** Each car's red rear light (`nightSources.js`) was an
OMNI 60 cm behind the tail-lamp centroid, with a 0.35 m source size, 1.6 x tail (x1.6 again when braking). Its falloff
is 1 / (d^2 + r^2). The tailgate and bumper are 0.5-1 m away and face the light, so they got 2-4 x 1.6 red. A pale car
went pink-white; a dark one turned into a red glowing panel under the lamps. With the pool's rear lights switched off
live (`nightParams.rear = false`), the block went away and the lamps stayed: so it was not bloom, TAAU, or the lens
mapping. The police estate had a second, separate problem. Its tail lens (the wrap-round L of the faceted estate) is
lit at brake + tail = 0.75, which clips the red channel on every facet alike: one flat red block.

**Fix.**
- The rear light is now a SPOT aimed back and down (axis = -forward x 0.75 + down; outer 68 deg, inner 30 deg). The
  cone never reaches forward of the light, so the body gets nothing. The road behind the car gets the same soft red
  pool, and a following car's nose gets a red tint. Same slot, same cost, fixed light count.
- The tail lens is shaded by the view angle (`carPacks.js lensK`: 0.3 + 0.8 (n.v)^2). A real lamp's reflector and prism
  throw the light backwards, so the part seen head-on is bright and the wrap-round facets fall off. This applies to
  both the traffic path and the player / police path.

**Switch:** `?rearpool=old` (an omni, flat lens). Live: `nightParams.rearSpot`, `packLook.lensShade`.

**Images:** `traffic_tail_hatch_before_after.jpg` (a white hatch: the whole rear blown pink before, clean after),
`traffic_tail_suv_before_after.jpg`, `police_tail_before_after.jpg` (the police car: the plate and bumper washed red
before; after, a shaded lens and a pool behind). The traffic sheets were taken before the lens shading was added, so
they show the spot change only.

**Cost:** none measurable. The spot's cone test rejects more fragments than the omni did, and the lens factor is a few
ALU.

**Weak spot:** a car stopped 1-3 m behind a pale car still lights its rear white with its low beam (the headlight's
near-field, HEAD_NEAR 3 m). That is real, but strong.

## 2. Police blue light: a hard-edged rectangle on the road

**Cause:** the beacon's fan used the pool's APERTURE profile, a box with a smoothstep edge of 0.22 x its smaller half
size, and a 0.95 / 0.85 rad cone. The bright core clips in the tone map, so even a smoothed box edge reads hard. The
cone also cut the fan's lower edge (the footprint's near edge) over only 5 deg.

**Fix:** the profile takes a NEGATIVE mullion parameter to mean "soft beam". The fan becomes a gaussian in each
direction, exp(-a (p / half)^2) with a = 2 / (1 + k)^2 and k = 0.8. That is about the box's integral (2.26 x half), so
the energy is the same, and the long tail does not clip into an edge. The police slot also gets a soft cone (1.25 /
0.55 rad); the bounding sphere is the same 30 m. Windows and shops keep the box (their parameter is >= 0).

**Switch:** `?beam=old`. Live: `LIGHT.beamSoft` (policeCar.js).

**Image:** `police_beam_before_after.jpg` (Place Saint-Job, the beacon held at fixed angles, same camera).

**Cost:** one select and one exp in the APERTURE branch (only the police slot and the windows / shops take that
branch). No new pipeline: the light shader changed once.

## 3. Night street

### 3a. Lamp shadow maps re-rendered as traffic passes

**Cause:** one of the 2 shadowed lamps re-rendered its whole map every frame a mover was within 31 m. At Place
Saint-Job that was about 37 draws: parked cars, sign poles, garden walls, benches, pumps, shop fronts, and the tree
proxies, all static, redrawn because one car moved.

**Fix: a static cache per lamp map** (`cityNight.js LampShadowNode`, a ShadowNode subclass set as
`light.shadow.shadowNode`).
- Movers cast on a layer of their own (11): traffic, traffic two-wheelers, trams, trains, the player's vehicles,
  skinned meshes, and `userData.nightMover` / `lampMover`.
- A FULL render (when the lamp changes, or when the camera has moved 2 m, as before) draws the static casters, copies
  the depth aside (depth32float, 512^2, about 1 MB), then draws the movers on top.
- A movers-only frame copies the static depth back and draws only the movers (1-3 draws). The pass walks only the
  scene's top-level groups that hold a mover.
- Because a movers-only update is now cheap, both maps update every frame: car shadows at 60 Hz. The "alt" schedule
  had them at 30 Hz.

**Check:** a movers-only frame against a full plain render of the same scene state differs by 0.066 mean, which is the
TAA jitter floor (two plain renders differ by 0.073).

**Cost (RED, interleaved 4 x 3 s, cache on vs `lampCache = false`, Place Saint-Job street with traffic):**

| | cache off | cache on |
|---|---|---|
| lamp-map CPU per frame | 0.64-1.0 ms | 0.19-0.38 ms |
| lamp passes GPU per frame | 0.32-0.42 ms | 0.02-0.07 ms |
| lamp-map draws per frame | ~37-41 | ~2.7 |

**Switch:** `?lampcache=0`. Live: `__night.lampCache`. There is also a measurement mode, `__night.shadowMode = "calm"`,
in which movers are ignored.

**Also fixed:** the lamp-shadow proxies were on layers 8 + k. Lamp 1's layer, 9, is the pond reflection's POND_LAYER,
so the reflection pass could draw lamp 1's tree / bench proxies. They are now on 12 + k.

**Weak spot:** a mover that is not recognised as one (a new moving prop with a static-looking name) keeps a stale
shadow until the next full render (lamp change or 2 m of camera travel). The police accident props are static until
they drive off.

### 3b. Hedge under a lamp: a saturated bright lime

**Cause:** the leaf palette (#4a6a28 privet, linear 0.069 / 0.141 / 0.021) is set for daylight, where the blue sky
fills the blue channel. Under the warm lantern (1 / 0.78 / 0.52) the blue goes to about 0. On top of that, the
batwing lantern throws its peak sideways onto the hedge face. Measured hedge: 35 / 51 / 6 median, 66 / 85 / 30 p90,
next to a sidewalk at 80 / 67 / 48. The hedge is lit only by the pool lamps: everything is 0 with them off.

**Fix:** `viewer/foliage/nightLeaf.js` takes the leaf colour toward its luminance (0.45 x night) and makes it a little
darker (0.3 x night). It applies to both the gardens' hedges (body + cards) and the foliage hedges. The result is an
olive green that still reads as a hedge. By day nothing changes (env.uNight = 0).

**Switch:** `?hedgenight=old`. Live: `leafNight.desat / dark`.

**Image:** `hedge_night_before_after.jpg` (I6 front-garden street).

**Cost:** about 6 ALU in two materials.

### 3c. Shop interiors blow out white at night (Celio, Chaussée d'Alsemberg)

**Cause:** the boutique / office interior renders are mostly white. At night they are emitted at nightOpen 1.0 x glow,
so the window reads as a white box: median 186 / 169 / 149 in the Celio window.

**Fix (shopWindow.js):** at night the bright texels are toned down (x (1 - 0.8) above a luminance of ~0.75, through a
smoothstep from 0.3) and the room takes a warm shop-light cast. Celio's window goes to 146 / 136 / 126 median: still a
lit shop, with the shelves and floor readable again. The colourful rooms (the pharmacy next door) barely change.
Lowering `nightOpen` instead dimmed every shop.

**Switch:** `?shopnight=old`. Live: `windowUniforms.nightWhite / nightWarm`.

**Image:** `shop_night_before_after.jpg`.

**Cost:** about 8 ALU in the window shader.

**Not done:** the house window at the top-left of the Alsemberg view (the facade interior mapping) is also very white.

## 4. Snowfall cost: IN PROGRESS (paused by the coordinator)

Place Saint-Job street, RED, interleaved, 4 rounds:

| state | GPU p50 |
|---|---|
| clear | 9.67 ms |
| snowfall, everything on | 11.45 ms (+1.78) |
| snowfall, no snow layer | 11.22 ms |
| snowfall, layer without its 16 full-resolution chunks | 11.39 ms |
| snowfall, layer without its 48 half-resolution chunks | 11.34 ms |

An earlier set of runs gave:
- without the falling particles: -0.2..-0.4 ms;
- without the caps: about 0;
- without the trails: about 0;
- the overhead bake: about 160 ms of GPU wall time every 12 s, worker shape 100-190 ms, no main-thread long task.

So the snow layer is about 0.2-0.5 ms, and it does not track the vertex count. The largest share appears to be the
materials' own snow cover (surfaceWeather / cityWeatherize in every lit material) plus the particles. Not cut yet.

## 5. Post-reveal long task and the pond shader

**Cause (found with long-animation-frame attribution and a node-build hook on a cold boot):** the 0.8-0.9 s frame
about 10 s after the reveal was NOT the landmark parse in these boots. It was 26-30 node builds of
`traffic-car-batch` (14-22 ms each) in ONE main-pass frame. Each traffic batch is its own render object (the
per-object motion hooks), so the node builds are not shared. The night's by-day lamp-shadow warm-up (cityNight
EMPTY_WARM) shows the empty batches with count 1 for one frame, and the MAIN camera drew them too.

**Fix:**
- During that warm frame the batch is taken off layer 0, so only the lamp map draws it (cityNight.js).
- trafficFleet.js precompiles every batch in the background through the page's precompile queue, one job each, so a
  batch's first car no longer builds in the frame. Readiness is not blocked: the traffic shows as before.

**Result:** max post-reveal long-animation-frame went from 604-909 ms (3 boots) to 255-301 ms (2 boots). What is left
is landmark fading-copy builds (Wolvendael, town hall, about 20 ms each).

**Pond:** no pond / water node build was seen on first sight (a jump to the Wolvendael view: 0 builds). The long
frames there were tile streaming. wolvendaelCity.js already precompiles the pond's materials and its reflection pass.

**Switch:** `?trafficwarm=old` (the probes only). The warm-frame layer fix has no switch.

## 6. Not reached

Sacré-Coeur's slate snow, the library's pale slate patches, Saint-Marc's brick tone and forecourts, two-wheelers at
junction corners, and pulled-over cars moving to the kerb.

## Files touched

- `viewer/nightLights/nightSources.js`
- `viewer/nightLights/nightLighting.js` (APERTURE soft beam)
- `viewer/nightLights/cityNight.js` (LampShadowNode, mover layer, proxy layers, warm layer 0)
- `viewer/drive/carPacks.js` (lensK)
- `viewer/police/policeCar.js`
- `viewer/foliage/nightLeaf.js` (new)
- `viewer/foliage/hedges.js`
- `viewer/gardens/gardenHedge.js`
- `viewer/shops/shopWindow.js`
- `viewer/traffic/trafficFleet.js`, `traffic.js`, `cityTraffic.js`
- `viewer/main.js` (passes compileFor to the traffic)
- `viewer/features.js` (rows)
- `debug/fix4.js` (new)
