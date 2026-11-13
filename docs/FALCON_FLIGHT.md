# Falcon flight (the lab, and the city's fly mode)

Flying as a peregrine over Saint-Job, built **next to** today's fly mode (`viewer/flight.js`, `viewer/falcons.js`
untouched) so the city can adopt it later. Lab: `labs/falcon-flight-lab.html` (port 8833 when served from the
worktree). Research and sources: `docs/FALCON_FLIGHT_RESEARCH.md`. Model numbers: `node tools/falconFlightTest.mjs`.

## What is where (`viewer/falconFlight/`)

| file | what |
|---|---|
| `flightModel.js` | the physics (pure JS, node-testable): lift CL(alpha) q S, drag (body + wing profile + induced + stall + flare), gravity, flapping thrust from a stamina budget, all against the AIR; bank, fold, flare; the collision (bounce / touch-down / stun) |
| `air.js` | wind (log profile over the smoothed roofs, gusts with a spatial phase, the weather lab's `uWind` hook), thermals (sources, life cycles, sun, lean, sink ring), updrafts off façades and slopes (`w = 1.2 U . grad h`) |
| `cityWorld.js` | the lab's city: 5 x 5 tiles around I6 through the city's tile worker (I6: its 1 m terrain + the city's façade meshes; the 8 around: far-LOD solids + the tree impostor field; the 16 outer: far LOD), the Saint-Job church (LODs), `floor(x, z)` = max(DTM, roof grid without the church's solid, a church proxy copied from `falcons.js`), the 4 m lift grid (obstacles blurred +-12 m), thermal sources, pigeon roosts (roof ridges from `buildings.bin`, the church's wing ridges + drum cornice, the Place's setts) |
| `falconBird.js` | the player's falcon: the family's rig (`loadFalconAssets`), juvenile plumage, Flap / Glide / Perch clips blended from the model, `birdRig.js` layers + new ones: **tuck** (hand + wrist folded tight), **flare** (wings up and forward, tail down), **talons** (legs forward and down) |
| `falconCamera.js` | chase / head camera, FOV 58 -> 82 deg with airspeed, shake above 45 m/s + rough air + hits, a third of the bank as roll, air streaks (140 line segments) and a speed vignette (CSS), lifted over roofs with the view tipped down |
| `falconInput.js` | keyboard, mouse aim (pointer lock), gamepad, touch -> `FlightControls` + actions |
| `falconAudio.js` | procedural Web Audio: airspeed wind (band-pass + hiss + tuck flutter), wingbeat whump on each downstroke, pigeon take-off clatter (HRTF), vario (off), strike + "kek-kek" |
| `pigeons.js` | 50-200 feral pigeons: roost / fly / land / gone, boids on a 6 m hash grid, flee + jink, alarm spreading through the roosts; one instanced draw, scripted ~110-tri pigeon, wings flapped / V-glided / folded in the vertex shader |
| `hints.js` | thermal hints: gulls circling in active columns (pigeon mesh, white), dust / leaves rising in the column nearest the falcon |
| `falconGame.js` | modes fly / land / perch, the strike and catch window, carrying, delivering to the eyrie, score, traces |

## The flight model (numbers)

A 1.0 kg juvenile female (`FALCON` in flightModel.js; carrying a pigeon +0.33 kg).

| configuration | wing area | AR | stall (flare) | best glide | min sink | vertical terminal |
|---|---|---|---|---|---|---|
| spread | 0.13 m² | 7.7 | 9.3 m/s (8.0) | 13 m/s, L/D 14.5 | 0.81 m/s at 10 m/s | 72 m/s |
| half folded ("diamond") | 0.07 m² | 4.0 | 14.3 m/s | 18 m/s, L/D 7.6 | 2.1 m/s | 72 m/s |
| tucked | 0.018 m² | 1.6 | 39 m/s | (a dive, L/D 3.6) | - | **106 m/s** |

- **Controls are a "flight-path hold"**: neutral pitch keeps the climb / dive angle (also in a banked turn: the lift
  that gives `cos(gamma) / cos(bank)` g); pull asks for up to +3.6 g at low speed growing to nMax - 1 = +6 g by 60 m/s,
  push for -2 g. Hands off, the spread wing trims to its best glide (~13 m/s, sink ~0.9 m/s); the tuck has no trim
  (a dive stays a dive). No outside loop past the vertical, no loop over the top.
- **Bank** up to **80 deg**, roll rate 2.4 rad/s spread .. 4.5 tucked (Mills et al.: the tuck rolls faster);
  let go = the wings level. Coordinated turns (no sideslip: the lift is tilted, the heading follows the air).
  Sustained turns at 16 m/s: 45 deg = radius 23 m, 60 deg = 13 m (losing ~2 m/s of height), 80 deg is a descending
  spiral (the wing cannot give 5.8 g at 16 m/s).
- **Stall, forgiving**: past CLmax the lift falls to ~55 % over 15 deg (never to zero), drag rises; a stalled bird
  levels its wings and lowers its nose by itself (no spin, no spiral). Held full pull at 14 m/s: a mushing
  oscillation between +30 and -35 deg of path, 6-12 m/s, never worse.
- **Stoop**: tucked from rest, 40 m/s after 200 m of drop, 60 after 363, 80 after 581, 90 after 835, 100 after
  1405 m (Tucker 1998: 89-112 m/s for ideal falcons). At 45 deg: 80 m/s after 681 m. **80+ needs ~500 m of height** -
  the lab's stoop starts at 720 m and reaches **82.3 m/s (296 km/h)**.
- **Pull-out**: load capped at **7 g** (the muscles / bones), the tuck's tiny area still gives ~5 g at 90 m/s; open to
  half and pull: from 85 m/s vertical to level in ~2 s and ~100 m.
- **Flapping**: up to 0.42 g of thrust at zero airspeed, fading to nothing at 30 m/s (wingbeats do not make a bird
  fast, gravity does), a little extra lift below 9 m/s (take-off), drains stamina in ~13 s of full effort (more with
  prey), recovers in ~30 s gliding, ~4 s perched; tired = a quarter of the thrust. Climb flapping ~1.7 m/s.
- **Collision** (never a push): the substep is swept in 0.4 m steps against `floor`; a façade (the floor jumps > 1 m)
  or a steep slope = a wall (normal against the motion); velocity's normal part reflected (restitution 0.3), the
  tangent kept (x0.55 wall, x0.8 floor), a minimum bounce off walls. Slow, level, soft (< 4.5 m/s into it, < 13 m/s)
  = **touch-down**: the bird perches there. Hard (> 9 m/s, walls > 6) = stunned 0.9 s: wings open, controls back.
- Substeps: 8 ms, 4 ms above 50 m/s.

## The air

- **Wind**: speed at 10 m + FROM direction (like a forecast; default 4 m/s from 240), log profile over the SMOOTHED
  canopy (a 3 m displacement; 1x at 10 m, 2.4x cap), so roof edges do not make 4 m/s steps of shear; gusts +-35 %
  speed and +-9 deg direction (three sines + a spatial phase), vertical churn near the roofs.
  **Weather hook**: `air.setWeatherWind(weather.uWind)` (branch claude/weather `viewer/weather/weatherState.js`:
  a Vector2, world xz, moving to) replaces the lab's wind each frame.
- **Thermals**: 12 sources: the **Place de Saint-Job** (heat 1.0, radius 24 m) + OSM pitches / playgrounds / grass /
  gardens / woods within 900 m (heat 0.35-0.85 by kind, area). Core speed 4.2 m/s x heat x sun (elevation^1.3 x
  (1 - 0.75 cloud)) x the life envelope (builds ~40 s, lives 4-7 min, rests 1-2 min); radius 24 m + 0.07 x height;
  a sink ring (-22 %) at ~2 R; fading toward the mixed-layer top (450-900 m with the sun); the column leans
  downwind (a bubble's drift, capped at 60 s). Midday: the Place column ~3.1 m/s.
- **Updrafts**: `w = 1.2 U . grad(h_s)` on the obstacle field `h_s` (max of DTM, roofs, church; 4 m grid over the
  inner 3 x 3 tiles, box-blurred twice +-12 m), fading with height above `h_s` over 25 m, lee sink at 40 %.
  A 7 m/s wind gives 1-2 m/s just above a windward row of houses.

## Pigeons

150 by default (slider 0-200), roosting at start on ~4,700 roost points (ridges every 1.1 m within 170 m of the Place), the church's eight wing
ridges and drum cornice, and the setts (feeding: pecking in the vertex frame). The falcon within 32 m (58 m when
fast, more in the stoop) raises an alarm with a 0.05-0.3 s delay; a bird leaving alarms its neighbours within 7 m
(the burst ripples across a roof: the clatter sound). Flying: separation / alignment / cohesion within 6 m, a home
circuit (two flocks: round the Place at 32 m, round the church at 45 m), flee with strength (1 - d / 40)² x 16 m/s²,
a jink (sideways + down) when the falcon is within 7 m, 7-21 m/s; back to a free roost after 18-40 s when calm,
arriving slowly with a flare. A caught bird is gone; a new one arrives at a free roost out of the falcon's sight
25-45 s later. Draw: ~110 triangles each, lit, flat-shaded, 8 plumage morphs (blue-bar, dark, pale, red).

## The strike, carrying, perching, landing

- **Target**: the nearest pigeon within 25 deg of the path, 180 m (the ring; green = window open).
- **Catch window**: closing speed > 8 m/s, approach within 35 deg of the path, talons out (F / X / TALONS, 0.45 s,
  automatic above 30 m/s within 12 m), the closest approach this frame within reach (0.8 + 0.6 x drawn span: ~2 m in
  the air). Slow attacks miss (the jink at 7 m out-turns a slow falcon); fast ones do not. Catch: 0.35 s hit-stop,
  the prey (`nest.glb` prey_carry, as the family carries it) in the talons, +0.33 kg, score = strike speed.
- **Deliver**: land on the eyrie's ledge (the `perch_ledge` node): points x2 within a minute; the female then takes
  prey in to feed the young (`fam.force("feed")`, the family's own behaviour).
- **Landing**: E (A / LAND) with a perch ahead within 28 m under 24 m/s: the church perches (cross, gable cross,
  louvre ledge, eyrie ledge from `stjob.json`) or a roof ridge (every 4th pigeon ridge point): a Hermite final over
  0.9-2.6 s ending at ~1 m/s, the flare (body pitched up, wings forward and up, tail down, talons), the last wingbeats,
  perched facing the perch's way. Or touch down on any level roof / ground slowly. E / Space takes off (a drop + 3
  beats).
- **Size**: the readable size in the air (2.0 m default, slider; the city's fly mode uses 2.7), shrinking to life
  size (1.0 m) within ~6-30 m of the roofs and when landing / perched (as the nest start does).

## Controls (defaults)

| | keyboard + mouse | gamepad | touch |
|---|---|---|---|
| pitch / bank | W S / A D (arrows) or the **mouse aim** (click: pointer lock; the falcon banks / pitches toward the ring) | left stick (forward = nose down, ?invert=1) | left thumb stick |
| flap | Space / left button | RT (analog) | FLAP |
| fold | Shift (tuck) / C (half) / right button | LT (analog: half = diamond, full = tuck) | DIVE (tuck) |
| flare | Q | B | (in LAND) |
| talons | F | X | TALONS |
| land / take off | E | A | LAND |
| camera | V (chase / head), wheel = distance | Y, right stick = look | CAM |
| other | M mouse aim, R reset, H help | | |

## Verification (frame strips: `docs/falcons/flight/`, traces: `traces.json`)

The lab's **verification autopilots** (panel "verification autopilot", or `?scenario=`) fly the real model through
the same `FlightControls` a player fills (no shortcuts); `lab.advance(s)` steps the simulation at 60 Hz without
drawing (deterministic), `lab.grabNext` grabs the canvas.

| strip | what it shows | trace |
|---|---|---|
| `strip_thermal.jpg` | midday, 2.5 m/s wind; circling the Place column at 35-45 deg | 54 -> 150 m over the ground in 130 s (+0.74 m/s), airspeed 10.7-13.4 |
| `strip_ridge.jpg` | 7 m/s from 240, the best façade row (`bestRidge()`), beating up and down it gliding; + the lift map from above (green updraft on the windward rows, red lee sink) | 55 s at 5-25 m over the roofs, energy height 24 -> 30 m (would sink ~50 m in still air), a few flaps over a taller block |
| `strip_stoop.jpg` | 720 m, tucked, ~75 deg at the Place | 15 -> **82.3 m/s** in 10.8 s, pull-out at **7.0 g**, bottom 93-110 m over the ground, out at 52 m/s |
| `strip_catch.jpg` | proportional navigation (N = 3.5, as Mills et al.) from 80 m above / 130 m behind a pigeon | caught at 32-41 m/s; the autopilot catches ~1 attack in 6 (the pigeons escape the rest: as real hunts) |
| `strip_landing.jpg` | E at 23 m from the spire's cross, the flare, perched (life size); outside view | 12.5 -> 1 m/s in 2.9 s |

## Cost (measured in the lab, Chrome WebGPU, 2026-11-12)

CPU per frame, averaged over 300 calls (performance.now() is 0.1 ms coarse, so per-frame medians read 0.1-0.3):

| part | ms |
|---|---|
| flight model step (60 Hz, cruise / stoop substeps) | 0.007 / 0.009 |
| game update (input, modes, strike, bird pose: mixer + rig layers) | 0.017 |
| pigeons, **149 of 200 flying** (worst case: boids + hash grid + instance upload) | 0.22 |
| thermal hints (36 gulls + 220 leaves) | 0.045 |
| air sample (one point) | 0.0007 |
| **total flight + pigeons + hints** | **~0.28 ms** (all perched: well under) |

GPU (pigeons + gulls + dust, alternating off / on in one page, GPU timestamp medians): over the Place with **72
pigeons on screen**, static camera, 5 rounds: **-0.07 ms** (diffs -0.19..+0.13: below the noise); flying, 4 rounds:
+0.3..+0.7 with off rounds spreading 2.6-4.9 ms - the GPU is shared with the owner's tabs, so only "< 0.3 ms, within
noise" is honest. 200 x ~110 triangles = 22k triangles, one draw; gulls one draw; dust one draw; no shadows.

## Weak points (honest)

- The ridge lift is a slope-lift formula on a blurred height field, not a flow: no rotor behind tall blocks, no
  street canyon channelling, no lift on the church tower's windward face beyond the blur. Low houses give modest
  lift (enough to hold height, not to climb much).
- Thermals are placed from OSM land cover (+ the Place), not from a surface-temperature model; no cumulus marking
  them (the Firmament clouds are not tied to them).
- The rig is the old low-poly peregrine: the tuck is a reshaped membrane (reads as a dark teardrop), the flare is
  layers on a glide clip; no take-off / landing clips. A proper model is the next step (`docs/FALCONS.md`).
- The catch window is generous (reach ~2 m at the readable size); pigeons have no "real" escape manoeuvres beyond
  the jink and flee; the autopilot's catch rate (~1 in 6) shows the balance, not a tuned difficulty.
- The lab city: I6 has the city's façades; the other tiles are the far-LOD solids (boxy up close), no roads / lamps /
  cars; the far tree impostors show dithering at mid distance (alpha-to-coverage), as on the city's far tiles.
- In some ridge grabs the falcon is hidden behind roofs (it flies 5-20 m over them at life size).
- GPU numbers are noisy (shared GPU); the pigeons' cost is "below noise", not a precise figure.
- The pigeon mesh is crude up close (flat pale wings, the bars faint): it is made to be read at 10-100 m.
- Sound: no positional wing sound for the pigeons in flight (only take-off clatter), no falcon calls except the catch.

## How the city could adopt it (done: see "In the city")

`viewer/main.js` would build `FalconFlight` + `AirField` (grid from the loaded tiles' roof grids + `world.heightAt`,
thermal sources from the tiles' features), `FalconBird` instead of `Flyer.setModel`, and keep `Flyer.startFromNest`'s
intro (hand over at its launch speed with `FalconFlight.launch(..., air)`). Pigeons need roosts from the loaded
tiles (`cityWorld.js roosts()` works per tile). Nothing in the city is changed by this branch.

## In the city (branch claude/falcon-city, 2026-11-12)

The city's **Fly** button / `?view=fly` / the dev panel's "fly the falcon" now fly this model in the REAL streaming
city (all landmarks, roads, trees, traffic). `?falcon=old` keeps the old arcade flight (`viewer/flight.js`) for
comparison. Resume note: `docs/falcons/CITY_RESUME.md`.

| file | what |
|---|---|
| `viewer/falconFlight/cityFlyer.js` | `CityFlyer`: the same face to `main.js` as the old `Flyer` (`on, x, z, pos, yaw, start, startFromNest, stop, update, onExit`); inside: FalconGame + FalconBird + FalconCamera + FalconInput + FalconAudio + Pigeons + ThermalHints, the nest intro, the HUD (our own style) and a "Falcon flight" panel (`viewer/panelUI.js`, closed, shown only while flying) |
| `viewer/falconFlight/cityStream.js` | `CityFalconWorld`, the streaming world adapter: `floor / ground / roof / churchFloor / proxyAt / liftGrid / thermals / roosts` from the city's loaded tiles (`world.tiles`: `hm`, `roofs`, `feats`) |
| `viewer/falconFlight/falconWorker.js` | a plain module worker: the pigeons' roof-ridge roosts (the tiles' `buildings.json` + `.bin`) and the landmarks' height rasters |
| `viewer/falconFlight/church.js` | the church proxy + the Place (split out of `cityWorld.js`, no loader imports) |
| `debug/falconCityFlight.js` | the verification: scripted flights stepped at 60 Hz through `viewer.step(dt)`, the device hook, long tasks, collision checks, contact sheets |

`main.js` changes (small): the tile object carries its raw roof grid (`roofs: rf`); the flyer is a `CityFlyer` unless
`?falcon=old` (the old bird glTF is then not loaded); `fly()` waits for `flyer.ready`; an updater runs `flyer.tick`
(the pigeons in every mode); `viewer.step(dt)` runs one frame of the loop with a fixed dt (the loop body is
`stepLoop`).

**The world adapter** (`cityStream.js`):
- `floor(x, z)` = max(the tile's DTM, its 2 m roof grid, the Saint-Job church proxy, the landmark proxies, the road
  bridge decks `world.deckY`). The city's roof grid keeps the UrbIS solids the hero models replace, with their flat
  top over the whole footprint (Saint-Job's = the spire's height over the nave): inside the church's 34 m the cells at
  that envelope's top are dropped (the proxy rules there); inside each landmark's footprint (dilated 2 m) the roof grid
  gives way to the landmark's proxy, plus any cell at the envelope's top in its box.
- **Landmark proxies**: a 1 m height raster of each landmark's own drawn mesh (its lowest LOD, world space): the town
  hall, the Observatory, Saint-Pierre, Stalle, the Villa van Buuren, the Château de Wolvendael, the police station,
  Calevoet station and the three bridges (Saint-Job and Calevoet railway bridges, the Verrewinkel road bridge). Main
  thread 0.2-3.8 ms each (copying the vertices), the raster in the worker. Heightfields: the bird cannot fly UNDER a
  bridge arch (solid from the deck down), and never goes through one.
- **The lift grid follows the falcon**: an 800 m window (4 m, 201 x 201), sampled (max of 2 x 2 m) and box-blurred
  twice +-12 m (running sums), in slices of 1.5 ms a frame; rebuilt when the falcon is 140 m off its centre or the
  loaded tiles / proxies changed (at most every 3 s), swapped in when complete. A build: 10-17 slices (0.1-0.4 s at
  60 fps); the arrays are recycled. `floor()` costs 0.1 us.
- **Thermals**: a fixed pool of 12 slots in the AirField (the gulls are per slot): the Place de Saint-Job + the OSM
  pitches / parks / grass / gardens of the loaded tiles, the nearest within 1.5 km, re-checked every second; a slot
  changes source only when its own is over 1 km from the falcon.
- **Roosts / perches**: the ridges round the Place (worker: 4,792 points within 170 m, the hero solids left out), the
  church's wing ridges and drum cornice, the Place's setts on the city's walking surface (`world.walkY`); perches = the
  family's church perches + every 4th ridge point.

**The intro**: the old fly mode's nest start (scrape, the hop onto the arch's ledge, the look out, the launch on a
Hermite path; Space skips), replayed with `FalconBird` at life size (1.0 m) and the old intro camera; at the end of the
launch `FalconGame.start` takes over at the launch's speed (13.2 m/s), path angle (-11 deg) and heading, the chase
camera continuing from the intro's. The size grows to the readable span (2.0 m, `?falconsize=`, the panel) with the
height, as in the lab.

**Pigeons**: 150 (`?pigeons=`) on 4,959 roosts round the Place; simulated and drawn whenever the camera is within
700 m of the Place in ANY mode (walk, drive...), fleeing only the falcon.

**HUD / input**: bottom right in panelUI's colours: airspeed, height, air, stamina bar, target, score, the aim /
target / perch rings, messages. Keys as in the lab except M (the city's map) and H (photo mode); mouse aim by clicking
the view (pointer lock), off in the panel. The input is OFF outside fly mode (no key, pointer lock or touch control
reaches it); Esc leaves to the close-up (as the old fly mode).

**Rules kept**: no light added; every new material compiled before it shows (`warm()`: the page's precompile into the
scene pass + one parked draw of the bird inside a parallel-pipeline window for its shadow pass; the bird / hints /
streaks are in the scene before the boot warm-up, so the boot compiles them too).

### Verification (2026-11-12, `debug/falconCityFlight.js`, strips in `docs/falcons/city/`)

The tab is a background tab (Chrome gives it 1 rAF / s), so every run is STEPPED: `viewer.step(1/60)` = the whole
city frame (lighting, the flight, the fades, every updater, the render), then `device.queue.onSubmittedWorkDone()`:
"frame ms" below = main thread + GPU of that frame, at 60 Hz of game time. The device hook wraps
`GPUDevice.prototype.createRenderPipeline` / `...Async` (the 2026-11-13 freeze diagnosis).

| run | strip | result |
|---|---|---|
| intro | `strip_intro.jpg` | scrape -> ledge -> launch -> hand-over at 13.2 m/s, -11 deg |
| stoop | `strip_stoop.jpg` | 650 m, tucked: **79 m/s** at 11 s, pull-out bottom 100 m over the Place |
| thermal | `strip_thermal.jpg` | midday, the Place's column held on: 54 -> 98 m over the ground in 55 s (+0.8 m/s), air +1.5..2.1 m/s |
| roof-skim | `strip_skim.jpg` | 4 m over the highest roof ahead, 15-22 m/s, 25 s: minimum clearance 2.9 m, never under a roof |
| strike | `strip_strike.jpg` | proportional navigation on the flock: caught at **41 m/s** on the 3rd attack (the lab: ~1 in 6) |
| perch on the church | `strip_church.jpg` | E at 24 m from the spire's cross: the flare, perched on the cross |
| land on a ridge | `strip_ridge.jpg` | onto a roof ridge 60-120 m from the Place (an approach clearing the roofs by 3 m) |
| fly far | `strip_far.jpg` | 3.3 km east across I6 -> M6: 22 tile loads / unloads under the falcon, lift grid rebuilt ~40 times |
| landmarks | `landmarks.jpg` | level flights 6 m under the top of the town hall, Observatory, Stalle, Calevoet bridge: a wall hit on the drawn mesh each time, **0 frames inside a proxy** (Saint-Pierre: the line missed the spire) |
| modes | `modes_exit.jpg` | fly -> Esc (orbit; HUD, bird, hints, streaks, panel hidden; input off, no pointer lock, FOV back to 55) -> E / F / V / R ignored -> walk (pigeons on the Place) -> drive -> Esc -> fly again (the intro again); `?falcon=old` is still the old Flyer |

Every run: **0 synchronous render pipelines** mid-flight (and 0 async: nothing new compiled), **0 frames with the
bird under the floor** (the minimum clearance in free flight is 0.35 m = the bird's radius, at a touch-down).

**CPU** (per frame, the flight's own parts, median / p99 / max over 600 frames): total 0.1-0.3 / 0.5-2.3 / 1.8-3.3 ms
(game 0.1, pigeons 0.1-0.2 (max 1.8), hints < 0.1, camera < 0.1, the lift-grid slice within its 1.5 ms budget; the
worst slice measured 1.7-7.2 ms (a GC landing in it). One 288 ms outlier in the first far flight, before the arrays
were recycled, while the city's tile streaming was disposing tiles; the second far flight's worst slice: 1.7 ms.
Long tasks > 50 ms seen during the runs all came while tiles streamed (the city's tile build), never in a frame where
the flight's own CPU went over 3.3 ms.

**Frame time** (stepped, CPU + GPU), the second far flight, 7,200 frames: p50 8.9, p95 12.3, p99 17.1 ms; histogram
< 8 ms: 1,389, 8-16.7: 5,732, 16.7-25: 58, 25-33: 12, 33-50: 4, > 50: 5 (tile loads). Earlier runs with the other
agents' tabs busy: p50 16-34 ms - the GPU is SHARED with two other agents' city tabs, so GPU numbers are noisy. The
A/B of the bird + pigeons + hints (perched on the cross, 3 rounds x 240 frames): GPU p50 on 2.36 / 1.44 / 1.38, off
1.97 / 1.57 / 1.44 ms: **below the noise** (as in the lab).

### Round 2 (branch claude/falcon2, 2026-11-13): trees, arches, camera, weather, more squares

Sheets in `docs/falcons/city2/` (stepped in a background tab as round 1; driver `debug/falconCityFlight.js`, new runs
`treeHit / treeBrush / treeUnder / treePerch / bridge (stjob | calevoet | verrewinkel) / spire / street`, `strike` takes
a square, `goto(x, z)` flies there until its tile is in).

**The solid at a height** (`cityStream.js column(x, z, y)` -> `{ floor, ceil, brush, tree, open }`): the floor under the
bird AND a ceiling over it. `flightModel.js collide` uses it when the world has it (the lab keeps its heightfield):
rising into a ceiling = a hit from below (normal down), a ceiling that comes down across the path (the side of a crown,
an arch's spandrel) = a wall. `floor(x, z)` (the lift grid, the pigeons) is unchanged (bridges solid, no trees). One
column query: 0.45-0.52 us.

- **Trees** (`falconWorker.js` job `trees`, `syncTrees()` every 2 s from `tick`): every tree the city draws, with the
  drawn variant / turn / scale (`treesStylized.js`'s own placement rules: the vendor's variant hash of the index, the
  turn hash, scale = LiDAR height / natural height clamped 0.3-1.8); per variant the crown is measured from the built
  LOD 0's leaf cards (centroid off the trunk, 95th-percentile radius + 0.5 m, 5-95 % height band + 0.6 m) and the trunk's
  radius; in the worker, per tile, an 8 m bucket grid (main thread 0.1-0.4 ms per tile to pack ~1,800 trees; 21,374
  trees on 9 tiles in the far flight). A crown = an ellipsoid with a DENSE CORE (60 % of its radius, 85 % of its
  height): a hit ("hit a tree", stunned above 6-9 m/s), the bird can land on its top; the shell round it = leaves: a drag
  (2.5 /s at full depth, `FALCON.brushDrag`), "through the leaves" + a rustle (`falconAudio.leaves()`); the trunk up to
  the crown's centre. Under the crowns the bird flies free. **Perching on trees**: the crowns' tops are perches for E
  (`treePerches()` near the bird, in `perchInReach`); a soft touch-down on a crown perches "tree".
  Runs: `tree_hit` (centre height, 12 m/s: leaves at 4.4 s, "hit a tree at 10 m/s" at 4.6 s), `tree_brush` (0.8 of the
  radius: 38 frames of brush, depth 0.17, no contact), `tree_under` (1.4 m under a crown, 3 m beside the trunk: no
  contact, no brush, min clearance 4.7 m), `tree_perch` (E at 24 m: "landing on a tree's crown", perched "tree").
- **Bridges** (raster job `under: true`): the bridge proxies keep their LOWEST surface per cell too (`p.low`); where it
  is 2.5 m over the ground and the bird is under it, the cell is open (and the decks of `world.deckY` with it). Runs (a
  line through the opening's centre at mid-height, the clear direction searched every 5 deg): `bridge_stjob` (6.4 m
  clear, 94 frames under the arch, head room min 4.7 m), `bridge_calevoet` (12.2 m, 56 frames, 2.1 m),
  `bridge_verrewinkel` (along the L26 under the Rue de Verrewinkel deck: 5.4 m, 74 frames, 3.6 m): 0 contacts, 0 frames
  inside a solid.
- **Chase camera** (`falconCamera.js`): floor AND ceiling at the bird's height (`o.col`: the crowns whole, so never in
  the leaves; under an arch it stays under it); `keepClear()`: the lens never closer than 0.62 span + 0.45 m to the bird
  (a hard radial limit after the easing), and the line of sight to the bird's centre and both wingtips (roofs, the
  crowns' dense cores) stays clear: in along the line, else over the bird when that spot is free. The fix is an offset
  on the eased position: taken at once when it grows, eased off when it shrinks unless the eased spot would hide the
  bird. Runs: skim 1,500 frames 0 occluded (min distance 3.8 m); far 4,200 frames 0; bridges / trees 0 (min 1.44 m after
  a tree hit = the limit); street (`camera_street`, Montagne de Saint-Job 8 m up; the autopilot hits a façade at 1.4 s):
  6 occluded frames, all while the bird is against the wall.
- **Weather wind** (`cityFlyer.syncWeather`, every second): when the city runs a `Weather` (`opts.weather` or
  `window.__weather`; its `update()` fills `wx` in `viewer/weather/weatherState.js`), the air takes `wx.uWind` (the 10 m
  wind; gusts / profile / updrafts stay the air's) and its cloud (rain / snow = overcast: weak thermals); without one,
  the air's own wind (the panel). Checked: snowstorm (9 m/s from 50 deg): air U (-6.89, 5.79), the bird's drift
  (-11.7, 9.0) m/s at 60 m; heavy rain (6 m/s from 220 deg): (3.86, -4.60), drift (7.6, -7.7); weather gone: the own
  wind back. The city has no `Weather` instance today: this is the hook.
- **Pigeons at more squares** (real places of our data: the OSM ways `Place Jean Vander Elst` (the town hall's square,
  -1125, -505) and `Parvis Saint-Pierre` (-701, -498) in `data/tiles/*/roads.json`, the OSM park polygon `Parc de
  Wolvendael` (area centroid -402, -91, `data/map/map.json`)): 75 pigeons each (`?pigeons2=`, `?squares=0` off), built
  once the camera is within 900 m and the square's tile and trees are in: ridges (the worker job round the square,
  120 m), the crowns' tops, the paving / lawn (off roofs and crowns). Roosts: Saint-Pierre 2,547 ridge + 357 tree + 18
  ground; Vander Elst 2,099 + 183 + 44; Wolvendael 0 + 1,221 + 27. Budget: the 2 nearest flocks within 700 m are drawn
  and simulated (pigeons CPU p50 0.2-0.4 ms with two flocks flushed, max 2.1 ms); the falcon hunts the flock nearest to
  it. Sheet `pigeons_squares` (a strike at the Parvis: the flock flushes, closest pass 3.1 m, no catch in 14 s).
- **Saint-Pierre** (`spire_stpierre`): level 6 m under the proxy's top (its tower and bulb, 18 m2 at that height) at
  15 m/s: "hit a wall at 15 m/s: stunned", 0 frames inside.
- **Chimneys**: ridge roosts / perches 1.5 m off each ridge end (`falconWorker.js ridges`: the façade kit's stacks stand
  on the party walls at the gable's top = a ridge end); edges under 3.2 m give none (Saint-Job: 3,149 roosts, 746 ridge
  perches; `ridge_perch`).
- **Haze while high** (`cityFlyer.highFog`): the city's fog density uniform (`lighting.uFogDensity`, no shader change)
  thickened so the fog reaches 85 % at the far ring's edge, eased in from 120 to 400 m over the ground, the city's value
  back on exit (or when the city changes it). Stoop from 650 m: 0.00025 -> 0.0032 with ?far=1; the tiles fade into the
  haze (`stoop_haze`, `stoop_haze_far3`). LEFT: beyond the last tile the SKY's lower half (SkyMesh, brown, not fogged)
  still shows as a band at 500-650 m up, even with the default ?far=3. The fix is in `viewer/lighting.js` (the sky under
  the horizon in the fog colour) or a wider far ring while high (main.js streaming): not done (shared files).

**CPU** (the flight's own parts, per frame, the last 600 frames): far flight 70 s (10 tile changes, 16 lift builds):
total p50 0.2 / p99 1.7 / max 1.9 ms, game 0.1, camera < 0.1 (p99 0.2); tree / bridge / camera runs p50 0.2-0.3, p99
0.4-2.3, max <= 3.1 ms (one 8-11 ms max in two runs right after a reload, while the boot compiled). 0 synchronous and 0
async render pipelines in every run. GPU times not measured (shared GPU).

### Weak points / left (city)

- The sky's lower half shows beyond the last far tile from 500-650 m up (see "Haze while high").
- The tree crowns are ellipsoids from the drawn variant's cards: a branch sticking out of one is not solid; the trees
  are not in the lift grid (no updraft off a row of crowns).
- Strikes at the new squares' flocks came within 3 m but caught none in the runs (the autopilot's guidance; the
  Place's flock was caught on the 3rd attack in round 1).
- The street autopilot (`street`) cuts a corner into a façade in the narrow Montagne de Saint-Job.
- Measured stepped in a background tab: a foreground real-time run (and a performance trace attributing the streaming
  long tasks) is still to do on a quiet GPU.
- Thermals only from OSM land cover (as the lab); the city has no Weather instance yet (the hook is ready).
