# Falcon flight (branch claude/falcon-flight, LAB ONLY)

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

## How the city could adopt it

`viewer/main.js` would build `FalconFlight` + `AirField` (grid from the loaded tiles' roof grids + `world.heightAt`,
thermal sources from the tiles' features), `FalconBird` instead of `Flyer.setModel`, and keep `Flyer.startFromNest`'s
intro (hand over at its launch speed with `FalconFlight.launch(..., air)`). Pigeons need roosts from the loaded
tiles (`cityWorld.js roosts()` works per tile). Nothing in the city is changed by this branch.
