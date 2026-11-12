# Falcon flight: research notes (2026-11-12)

Short notes behind the Falcon Flight Lab (`labs/falcon-flight-lab.html`, `viewer/falconFlight/`). What we took and
why; the numbers the flight model uses are in `docs/FALCON_FLIGHT.md`.

## 0. Check first: three.js r187 and Mr.doob's slop-newyork

- **three.js r187** has `examples/webgpu_compute_birds.html` (8192 GPU boids: TSL compute for velocity / position,
  a 3-triangle bird whose two wing-tip vertices are moved by `sin(phase)` in the vertex shader, the phase advancing
  with speed). https://github.com/mrdoob/three.js/blob/r187/examples/webgpu_compute_birds.html
  **Taken:** the idea (wing vertices flapped in the vertex shader from a per-bird phase that runs faster when the bird
  climbs / flies fast). **Not taken:** the compute shader. Our pigeons need roosting, take-off bursts, flight to
  roost points, the falcon's strike and a prey hand-off: per-bird state that is easy on the CPU and awkward on the
  GPU; at 50-200 birds a CPU boid step on a hash grid costs well under 0.1 ms. Its O(n²) all-pairs loop would also be
  wasted on 200 birds.
- **slop-newyork** (docs/SLOP_NEWYORK_AUDIT.md): no birds or pigeons. Flying there is a helicopter (`js/helicopter.js`)
  with three follow cameras + an auto-director drone (`js/cameras.js`); gamepad input (`js/gamepad-controls.js`);
  all-procedural Web Audio (wind gusts in `js/audio-events.js`, HRTF panners). **Taken:** the same choices: no audio
  files (noise through filters), gamepad through the Gamepad API polled per frame, the chase camera smoothed per axis.
  Nothing to copy line for line (his helicopter has no aerodynamics).
- **Our own:** `viewer/flight.js` (arcade energy, speed clamped 7-38 m/s), `viewer/falcons.js` (the family, the rig,
  the perched pose), `viewer/birdRig.js` (layers). The lab builds next to them; it reuses the rig, the assets and the
  family read-only.

## 1. Peregrine flight facts

| fact | value | source |
|---|---|---|
| cruising flight | 11-15 m/s (24-33 mph); ~30 m/s (67 mph) chasing prey | All About Birds: https://www.allaboutbirds.org/guide/peregrine_falcon/lifehistory |
| level flight, average / max | 18-25 m/s, max ~31 m/s | https://en.wikipedia.org/wiki/List_of_birds_by_flight_speed |
| stoop top speed (model) | 89-112 m/s in a vertical dive (0.5-2 kg "ideal falcons"; heavier = faster); a 1 kg falcon needs ~1200 m to reach 95 % of it | Tucker 1998, J Exp Biol 201:403: https://scholars.duke.edu/publication/842267 |
| measured dives (gyrfalcon) | 52-58 m/s in the fastest wild dives, accelerating near the minimum-drag prediction | Tucker, Cade & Tucker 1998, J Exp Biol 201:2061 |
| pull-out | at reduced span a 1 kg falcon can make ~18x its weight in lift, ~1.7x at full span (the wing would break first: the bird pulls out with the wings half open); the max-lift drag decelerates at ~-1.5 g | Tucker 1998 (above) |
| wing shapes in the stoop | classic diamond (wings half folded) up to ~190 km/h (53 m/s), then a tight vertical tuck up to ~240 km/h (67 m/s) in the filmed bird; a cupped wing gives less drag and more lift than an open one; an "M-shape" during the pull-out gives vortex lift for pitch and roll control | Ponitz et al. 2014 (PLoS ONE / OJFD): https://pmc.ncbi.nlm.nih.gov/articles/PMC3914994 , https://openaccess.city.ac.uk/id/eprint/12942/1/2014-PonitzFalke.pdf ; Gowree, Selim, Brücker 2020: https://arxiv.org/pdf/2008.03948 |
| why stoop at all | high airspeed gives more aerodynamic force to turn with and the tucked wings roll faster: stoops catch erratic prey better than level attacks, if guidance (proportional navigation) is tuned | Mills, Hildenbrandt, Taylor, Hemelrijk 2018, PLoS Comput Biol: https://doi.org/10.1371/journal.pcbi.1006044 ; https://www.ox.ac.uk/node/1425399 |
| attack from 50 m | ~30-40 m/s near intercept | https://pmc.ncbi.nlm.nih.gov/articles/PMC7613156 |

Consequence for the game: **80+ m/s needs height.** With our drag numbers (terminal ~105 m/s tucked) a falcon reaches
80 m/s after ~470 m of drop. Real peregrines climb (thermals, flapping) to several hundred metres before a big stoop;
the lab does the same (thermal climb, or the "start high" button for tests). We do not cheat gravity.

## 2. Thermals, ridge lift, wind

- **Thermal model:** Allen 2006 (NASA Dryden), "Updraft model for development of autonomous soaring uninhabited air
  vehicles": updraft size grows with height, a bell-shaped velocity profile with a ring of sink around the core,
  spacing and max height from the boundary-layer depth. https://ntrs.nasa.gov/citations/20060004052 . We use its
  shape (core radius growing with height, a weak sink ring, fading toward the top of the mixed layer), with sources
  at open sunny ground and strength from the sun's elevation; the column leans downwind.
- **Birds in thermals:** thermal soaring of birds and UAVs (Akos, Nagy, Vicsek; https://arxiv.org/pdf/1012.0434):
  circling at 20-40 deg of bank inside cores of 20-50 m radius; climb 1-3 m/s.
- **Ridge / slope lift:** the vertical wind ~ the horizontal wind times the slope it blows up (w = U . grad h), strongest
  just above the windward edge and fading with height over about the obstacle's height; sink in the lee. Applied to
  the city's roof grid + DTM, smoothed, so a row of façades across the wind works like a ridge. (Standard slope-soaring
  practice; the same idea as wind over a dune.)
- **Wind:** a log profile with urban roughness (z0 ~1 m), gusts as a few incommensurate sines plus a spatial phase,
  so the bird feels bumps along its path; the weather lab's `uWind` (branch claude/weather,
  `viewer/weather/weatherState.js`: world xz, the direction the air moves to) plugs straight in.

## 3. How good flight games feel

Sources are thin on postmortems for the named titles; what is well documented:

- **Speed feel = FOV + motion blur + camera distance**: a survey of game feel names the tight link between FOV, blur and
  speed in racing / flying games (https://arxiv.org/pdf/2011.09201); three.js forum, "how to feel faster": widen
  the FOV with speed, pull the camera in a bit, streaks / trails (https://discourse.threejs.org/t/how-to-feel-faster/94266).
  Dive-specific: a subtle camera shake when the bird accelerates or dives
  (https://redlib.hbubli.cc/r/unrealengine/comments/141e3sf/). The classic failure: a camera that lags more the faster
  you go (The King's Bird reviews: https://techraptor.net/content/kings-bird-review). **Taken:** FOV 58 -> 80 deg with
  airspeed, the chase distance tightening in the stoop (not growing), shake above 45 m/s, air streaks around the
  camera, a speed vignette, a camera that is stiffer (less lag) the faster it goes.
- **Momentum, not clamps** (dragon flight devlog, https://souhad.itch.io/dragon-flight/devlog/121703/making-flight-fun):
  speed comes from gravity and wings, the player manages energy. Eagle Flight (Ubisoft, VR) and Aery steer with the
  head / a single look direction; Superflight and wingsuit games are pure energy and proximity (flying close to
  surfaces). Sky: Children of the Light / Journey: a forgiving glide (you never really stall, you sink), a visible
  energy (cape / light) refilled by updrafts and "wind" zones. Microsoft Flight Simulator gliders: true thermals that
  you find from cumulus and other gliders circling, and lift you feel in the seat (vario sound).
  **Taken:** a semi-physical lift / drag model with a soft stall (the nose drops, you never spin), stamina for
  flapping that refills while soaring, thermals shown by other birds circling + rising dust / leaves, a "vario" tone
  in lift (optional), a mouse-aim mode (steer toward where you look, like Eagle Flight's look steering).
- **Controls:** keyboard + mouse (W/S pitch, A/D bank; mouse aim with pointer lock), gamepad (left stick fly, triggers
  = flap / fold, analog fold for the stoop), touch (a left-thumb stick, buttons on the right).

## 4. Pigeons and flocking

- **Boids:** Reynolds 1987, "Flocks, herds and schools: a distributed behavioral model" (SIGGRAPH): separation,
  alignment, cohesion within a small neighbourhood. https://www.cs.toronto.edu/~dt/siggraph97-course/cwr87
- **Pigeons under attack:** Papadopoulou, Hemelrijk et al. 2022 (HoPE model, GPS tracks of homing pigeons attacked
  by a robotic falcon): escape turns grow more frequent as the predator gets closer, emerging from simple escape rules
  + coordination, no explicit "panic priority"; sharp turns by birds at the edge split the flock, central ones turn it
  collectively. https://pmc.ncbi.nlm.nih.gov/articles/PMC8782486 , https://doi.org/10.1098/rsos.211898
  **Taken:** flee strength rising with closeness, the turn spreading through neighbours (startle propagates), splits
  emerging rather than scripted. Feral pigeons fly 15-20 m/s, burst off roofs with the wing clap at take-off, glide
  with the wings raised in a V.
- **Cost:** CPU boids on a hash grid (cell = neighbour radius); one instanced draw, the flap in the vertex shader.
