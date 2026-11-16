# Car glass under the TAAU (carglass2, TODO 8g)

## Defect
Under the temporal upscaler the see-through glass of the parked and traffic cars (near LODs 0-1, up to 60 m) was a
per-frame stochastic discard (`viewer/upscale.js`, `userData.seeThrough`: a pixel dropped when its alpha is under the
moving `ditherNoise()`), which the TAA history was meant to average back into 76 % glass. It never fully does: with a
history weight of ~0.1 the residual is ~10 % of the glass-vs-interior contrast even with a still camera, and a moving car
or camera raises the current frame's weight. Seen up close: a fine dot / hatch pattern, white specks along the top of the
windscreen, crawling in motion (`carglass/parked_2m5_old.jpg`). The player's car had the same defect and was made solid
tinted (`?carglass=old`, docs/POLICE_FEEL.md).

## Options weighed
- (a) a stable threshold (fixed screen pattern, no per-frame phase): under the TAAU's sub-pixel jitter + upscale a fixed
  internal-pixel pattern still lands on different output pixels each frame (periodic flicker) and becomes a visible
  screen-door sliding over a moving car. A "soft coverage" resolve would need a coverage MRT channel and a resolve
  change for one material: more cost and risk than (c).
- (b) opaque tinted glass + fake interior beyond ~8 m: loses the real interior the cars2 models have, and still needs a
  solution for the near cars, which is where the defect shows.
- (c) real alpha blending: chosen. Not "nearest N" only: the glass pass costs one render object per near batch, so it
  covers every near-LOD car (0-60 m) and the far LODs keep their opaque tinted glass as before.
- three.js r187: TAA/TRAA examples have no glass special case (transparents are drawn normally after the opaques); slop-
  newyork's cars use plain opaque dark glass. Real blending is the standard answer and fits our MRT pipeline (the
  catenary wires are already blended under the TAAU).

## What changed
- `viewer/drive/carPacks.js`: `GLASS_PASS` (upscaled and not `?carglass2=old`), `glassGeometry(geo)` (the glass-only
  triangles of a car geometry, vertices compacted; any triangle with a glass vertex, the per-fragment kind test splits
  mixed ones exactly), `packMaterial({ glass: "split" | "pass" })`:
  - `split`: the fleet's opaque near material drops its glass fragments (maskNode), no alpha-to-coverage; the light glass
    shadow stays (maskShadowNode, one texel in three).
  - `pass`: the glass material, `transparent`, no depth write, opacity `packLook.glassOpacity` (0.76), glass fragments
    only; same paint / motion (wheel) / cross-fade nodes as the near material.
- `viewer/carFleet.js` (parked): one more multi-draw VIEW per near set (same instance buffers, glass-only geometries;
  +1 render object for the plain set, +1 for the fade set when cars fade); fallback path (`?carmerge=old`) a glass
  InstancedMesh per near batch sharing its instance attributes.
- `viewer/traffic/trafficFleet.js`: a glass InstancedMesh per near batch on the batch's instance buffers (matrix,
  paint, motion, lodFade) and the batch's `userData` (instMotion's row base: the glass gets the car's own motion
  vectors); hooked to InstancePrev, compiled with the probes / the warm queue.
- `viewer/police/props.js`, `viewer/policeCars.js`: the few one-off standing cars (police game props, the yard's five)
  get solid tinted glass under the TAAU like the player's car (`standingSeeThrough`), no glass pass for single meshes.
- Native (`?upscale=0`, MSAA): untouched (alpha-to-coverage).
- Switch: `?carglass2=old` (features.js, Look): the stochastic glass as before.

## Result (golden hour, 1600x828 view, TAAU auto)
- Close-ups: `carglass/parked_2m5_new.jpg` vs `parked_2m5_old.jpg` (2.5 m), `parked_4m_new.jpg`, `parked_10m_new.jpg`,
  `traffic_chase_new.jpg` (5.5 m behind a moving car), `traffic_passing_new.jpg` (a car passing 3.6 m away),
  `parked_night_new.jpg`. Glass smooth and stable; seats, steering wheel, the fence and street behind seen through it;
  side windows reflect (SSR / environment). No speckles, nothing crawling.
- Cost, live A/B on one page at the 2.5 m close-up (glass ~20 % of the screen, the glass materials hidden / shown,
  6 rounds x 3 s, scene-pass GPU median): 14.03 ms with the glass pass vs 13.93 ms without: ~+0.1 ms, inside the
  machine's noise (preflight was RED: Chrome 6-9 GB, other GPU load; the absolute numbers are noisy, the delta is the
  usable figure). Separate page loads new vs old: GPU p50 12.9 / 14.8 / 6.2 ms vs 14.3 / 15.1 / 13.8 ms at the three
  views of `debug/carglassAB.js`: noise-dominated, no regression visible.
- Draws: +1 to +2 render objects for the parked fleet (glass views), +1 per traffic near batch with cars (typically
  1-4); no shadow draws added (glass casts no shadow of its own).
- No console errors (`?time=night`, `?upscale=0`; the default load only the known warnings).

## Left
- The player's car (drive / police) and the standing cars keep solid tinted glass; the glass pass could be added to the
  player's car (one mesh: a glass child mesh) if its interior should show from the chase camera.
- Glass-over-glass order inside one car and between cars is unsorted (one draw): invisible with one tint; if privacy
  glass vs clear glass ever shows a wrong layering, sort per batch or split privacy glass.
- The motion target is blended too: the street seen through a moving car's window carries part of the car's motion
  (no ghosting seen in the passing test).
- Measure again on a GREEN preflight (debug/carglassAB.js, alternate the loads).
