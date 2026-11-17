# Orbit camera: browser check 2026-11-16

Server 8815, one tab, `viewer/?gamemenu=0`, the real camera driven with synthetic pointer / wheel / key events on the
canvas (the same handlers a mouse uses). Viewport 1600 x 828.

| check | result | image |
|---|---|---|
| boot, overview | no console error (also `?orbitcam=old`: OrbitControls, no error) | 01_overview.jpg |
| F / frame Saint-Job from the overview (pick under the cursor: 1 ms) | flies in, church centred, 250 m | 02_frame_church.jpg |
| orbit the church: 400 px drag round the picked point | the point stays at its pixel (780.0, 400.0 after the drag) | 03_orbit_church.jpg |
| zoom to a point on the church, 24 notches | 231 -> 87 -> 33 -> 12 -> 4.4 -> 1.6 -> 1.0 m, the point under the cursor | 04_zoom_to_cursor_1m.jpg |
| Go to "Place Saint-Job, street" while orbiting (tile loaded) | a ~0.4 s flight, no loader, street level 1.7 m | 05_goto_street_glide.jpg |
| right-drag pan 250 px at 125 m | the grabbed ground point ends exactly under the cursor (800.0, 350.0) | |
| RMB + W fly down the street + mouse look | flies, W never reaches other listeners (bike prompt); speed raised to >= 10 m/s after this | 07_fly_street.jpg |
| zoom out from the street, 40 notches | tilt-down added after the first try (it went back flat over the roofs): 138 m / -25 deg, 338 m / -39, 988 m / -52, 2.8 km / -60, stops at the 3200 m ceiling | 09_zoomout_whole_city.jpg |
| touch: 1 finger orbit, 2 finger pinch, double tap | pivot exact; spreading the fingers 2x halves the distance (83.2 -> 41.6 m), the midpoint's point stays; double tap frames | |
| map teleport in a loaded tile | flown (2.7 s from 3.2 km up), "already loaded" | |
| map teleport to J10 (not loaded) | the play loader as before, 10.7 s area ready | |
| start menu open / full map open + F | ignored (fixed: F used to frame behind the menu) | |
| F after closing them | frames the point under the mouse (a lawn here: trees are not picked) | 10_F_frame.jpg |

Fixes from this check (in the commit with these notes): zoom-out tilts down round the point (Google Earth), zoom-out and
the flight arc stop at the 3200 m ceiling, keys off while a menu / the full map is open, fly speed min 10 m/s, pointer
capture guarded, the landmark BVHs start on the camera's first use instead of at boot.

Boot cost of the landmark BVHs (eager version, worker only): Saint-Job 38,579 triangles 34-64 ms, Observatory 174,668
triangles 88-160 ms. Boot "area ready" 45.1 / 54.1 s with, 44.0 s with `?orbitheroes=0`: within the noise of this
loaded laptop (the next boot took 58 s with nothing at boot). Made lazy anyway (first pick / move: the three logs came
1.2 s after the first drag).

Not tuned by hand (needs the owner's mouse): orbit speed (1.4 pi per screen height), zoom step (x1.28 a notch), damping.

# orbitcam2: browser check 2026-11-17 (branch claude/orbitcam2 after foundation merge 2c8c4b5e)

Server 8815, one tab, default URL (start menu on) with localStorage cleared, then `?gamemenu=0&orbitcam2=old`.

| check | result | image |
|---|---|---|
| first visit: the card while the start menu is up | hidden (button too); after Esc closes the menu the card opens by itself once, `uccle.orbithelp.seen` = 1 | 11_help_card.jpg |
| ? key / Esc | ? toggles the card (the dev panel's key list does not open as well), Esc closes it | |
| W from ~300 m up, no button | 227 m/s, height unchanged (looking 30 deg down: no dive) | |
| Q 2 s / PageUp 1 s | -213 m / +86 m | |
| W at street level (Place Saint-Job, 1.2 m) | 8.0 m/s along the street | |
| Shift + W into the façades (4 s) | slid along the walls into a real gap between two houses (roof grid 0 there), never inside a building, 1.2 m over the ground | 12_keys_street_wall.jpg |
| typing W in the dev panel search field | the camera does not move | |
| third person / police (free) / falcon (free) | W moves the character 2.0 m and the police car 23 m; the falcon's listeners get Q; the orbit camera off, the ? button hidden | |
| `?orbitcam2=old` | W without a button does nothing, no card / button | |
| console | clean on the default run; the `?orbitcam2=old` run logged a `[heapDrop] dropped attribute created again` + 2 WebGPU "index buffer size (0)" errors from warmup.js flushDraw at boot (claude/heap's drop, not the camera: orbitcam2 code is off in that run and touches no geometry) | |

Visual tour (docs/TOUR.md, `debug/tour.html?run=orbitcam2` vs `foundation`): **0 of 22 views flagged** (largest: lycee-front
cell 20.5 % but pixels 0.23 %, ssim 0.996; wolvendael-park ssim 0.9934). Merge gate: all rows PASS (heap row with the
tools/worker/node_modules junction, removed after).

## Why it happened, the rule, the check

WHY: round 1 copied the editors' cameras (Unity / Unreal / Godot), where moving means HOLDING THE RIGHT BUTTON and then
pressing WASD / QE, and the only way up was the wheel (zoom out). Nothing on screen said so: the HUD help line was one
dense sentence and the dev panel's key list sits behind its "?" icon. A player who presses W (as in every game and in
our walk / drive / falcon modes) got nothing, and had no visible way to rise or sink.
RULE: every camera / mode keeps the common game keys working with no modifier held (WASD move, E/Q or PageUp/PageDown
up / down, Shift faster) and shows its controls on screen (a card shown once, the ? key).
CHECK: tools/orbitCamTest.mjs keyboard section in tools/audit/mergeGate.mjs (row "orbitcam": W moves with no button,
speed scales with the height, Q / PageDown never under the ground, PageUp rises, walls stop it, no NaN at 10 fps).
