# The inspection camera (default orbit view)

Owner, playtest 2026-11-16 (TODO item 9): "the default orbit is really not the best to use in such an environment; check
Godot, Unity, Unreal or any three.js for a better camera to be able to check everywhere".

Branch `claude/orbitcam`. Code: `viewer/orbitCam.js` (the controller, three-free), `viewer/heroBVH.js` (the landmarks'
BVHs, shared with the third person), wired in `viewer/main.js`. Switches: `?orbitcam=old` (three's OrbitControls as
before), `?orbitheroes=0` (pick / collide with the height fields only). Offline checks: `node tools/orbitCamTest.mjs`.

## What was wrong with OrbitControls here

- It orbits around a fixed `target` that is usually somewhere on the ground far from what you look at: to inspect a
  roof you first have to pan the target there, by eye.
- Its zoom dollies toward that target, not toward what is under the cursor; its speed is a fixed ratio but the target
  is often hundreds of metres away, so close-up work is clumsy.
- Its pan is screen-space: at a low angle a pan lifts you into the sky or drives you into the ground.
- No collision: the camera goes under the terrain and through buildings.
- `maxPolarAngle` 0.495 pi keeps the camera above the target's height: a street-level view needs tricks (the "eye"
  special case in `views.stjob` and the dev panel's Go to).

## Research (what the good ones do)

| | orbit | zoom | pan | fly | collision / limits |
|---|---|---|---|---|---|
| Unity Scene view | Alt+LMB around the pivot; F frames the selection and moves the pivot there | wheel toward the pivot; Alt+RMB dolly | MMB, or hand tool | RMB held + WASD/QE, Shift faster, wheel while flying = speed | none |
| Unreal editor | Alt+LMB around the pivot; F frames; LMB drag = move/turn on the ground plane | wheel = forward | MMB | RMB + WASD/QE (speed slider + wheel) | none |
| Godot 3D editor | MMB orbit; "orbit around the cursor point" option; F focus | wheel toward the cursor (option "zoom to cursor") | Shift+MMB | RMB + WASD freelook (Shift fast) | none |
| Blender | MMB orbit; "Orbit around selection", "Auto depth" picks the depth under the mouse; Numpad . frames | "Zoom to mouse position" | Shift+MMB at the picked depth | Shift+` walk / fly | none |
| Google Earth / Cesium | the pivot is the GLOBE POINT under the cursor (tilt around it, never a point in the sky) | toward the cursor, speed scales with the height | the grabbed ground point stays under the cursor | — | terrain collision (`enableCollisionDetection`, a minimum height over terrain) |
| yomotsu camera-controls (MIT, v3.1.2, three >= 0.126) | around `target`; `setOrbitPoint` moves it without moving the view | `dollyToCursor`, `infinityDolly`; smoothDamp | `truck` (screen plane) | `forward` / `truck` methods | `colliderMeshes` = a three Raycaster against those meshes EVERY update; `fitToBox`, `fitToSphere` |
| three MapControls | OrbitControls with screen-space panning off (pan on the ground plane) | toward the target (or `zoomToCursor` since r153) | ground plane | — | none |

## Decision: our own small controller (camera-controls' ideas, not its code)

camera-controls is good and MIT, and would work with r187 WebGPU (it only moves a camera; it needs `install({ THREE })`
with a subset of three). It was not adopted because the parts we need most are the parts it does not have or does in a
way that is too expensive here:

- **pivot under the cursor**: it has `setOrbitPoint`, but the pick is ours to do anyway; picking the city with a three
  Raycaster means thousands of meshes, instanced kits, tile groups (exactly what the brief says not to do).
- **collision**: its colliders raycast meshes every frame; we already have exact, free height fields for the whole city
  (terrain + drawn roofs per tile) and the landmarks' triangle BVHs.
- **ground pan**: its `truck` is screen-plane; we want Google Earth's grab-the-ground pan.
- 75 KB + a THREE install step + our own adapter to keep the `OrbitControls` API that main.js / devPanel / cityHook use.

So `viewer/orbitCam.js` (~570 lines, three-free math) keeps the OrbitControls surface (`target`, `enabled`, `update()`,
`enableDamping`, `maxPolarAngle`, `dispose()`) and takes from the table above:

- **Orbit round the point under the cursor** (Cesium, Blender auto-depth, Godot): left-drag picks the solid under the
  cursor on press and rotates the camera RIG (position and orientation) around it, yaw about the world up, pitch about
  the camera's right axis, so that point stays exactly where it is on screen. A miss (sky) falls back to the ray's
  crossing of the focus height, then to the focus point: never a pivot in the sky. Alt+drag orbits round the view centre.
- **Pan along the ground at the picked depth** (Google Earth / MapControls): right / middle-drag (Shift / Ctrl + left
  for trackpads) intersects the cursor ray with the horizontal plane through the grabbed point; the camera moves so that
  point follows the cursor. Near the horizon (plane hit too far) it falls back to a screen-space pan at the focus
  distance, and each step is capped at twice the height above the plane (no 3 km jumps from a grazing ray).
- **Zoom to the cursor, by a share of the distance** (camera-controls' dollyToCursor, Cesium): the camera moves along
  the cursor ray toward the picked point by `exp(-0.25)` a notch, so it is fast from 2 km up and fine at a doorway; it
  stops 1 m short of the surface, and zooming out is capped at 6 km from the point (the whole commune).
- **Frame** (Unity / Unreal F, Blender Numpad .): double-click, double tap or F flies to 0.35 x the distance from the
  point (6-250 m), looking at it from the same side, at least 12 deg down.
- **Fly** (Unity / Unreal / Godot): hold the right button and press WASD (QE down / up): the mouse turns the view, the
  speed follows the height over the ground (6-320 m/s), Shift x3, the wheel scales it. The keys are swallowed while the
  right button is held (no bike prompt on E, no other mode sees them).
- **Smooth**: every motion is damped (exponential, rate 16/s for orbit and pan, 11/s for zoom; `enableDamping=false`
  = direct). Fly-to transitions: an ease-in-out flight with a lift of 18 % of the distance (max 350 m), 0.6-2.2 s.
- **Limits**: pitch -89..+30 deg (the camera may look up from a street; no flip at the zenith); max 3200 m TAW.
- **Collision**, from data the viewer already has, per motion step (no scene raycast):
  - terrain + road-bridge decks: the camera stays >= 1.2 m over `world.surface` / `world.deckY`;
  - buildings: the tile's drawn roof surface (`roofs.surf`, 1 m; else the 2 m roof grid), sampled at the camera and
    0.8 m around it: coming from above the camera lands on the roof (0.8 m over it); sideways it slides along the wall
    (x or z kept) or stops; a camera that is already inside (a teleport there) may move out freely;
  - landmarks (Saint-Job, the town hall, bridges, tunnels, public art...): the motion segment against their LOD0
    triangle BVHs, stopping 0.6 m before a surface;
  - an orbit tilt that would collide tilts as far as it goes freely (halving search), the turn part is kept.
- **Touch**: one finger orbits round the touched point; two fingers pan (the midpoint grabs the ground), pinch zooms
  toward the midpoint's point, twist turns around it; double tap frames.
- **Picking cost**: a march along the ray through `max(terrain, roof)` (step 0.4 m near, growing 0.4 % of the distance,
  max 12 m), a 14-step bisection on the hit, then the landmark BVHs. ~0.06-0.25 ms a pick in the offline test.
  One pick per press, per wheel burst (reused while the cursor stays within 4 px for 90 ms), per pinch start, plus ONE
  at the end of each interaction (the view centre: the focus, below). Never per frame.
- **`target`** = the point looked at: the camera + forward x focus distance; the focus distance is the view-centre pick
  when the camera comes to rest, capped at max(120 m, 2.5 x height + 60 m) so a horizon view keeps the tile streaming and
  the sun-shadow box near the camera (both follow `controls.target`).
- **Outside placements** (setView, Go to, the map, the share link) set `camera.position` + `controls.target` and call
  `update()` as before: the camera cuts there. With `controls.glide = true` it flies there instead; main.js sets it for
  the Overview / Close-up buttons while already orbiting, and for a teleport in orbit mode whose tile is already loaded
  (no play loader then: nothing to wait for). Placing the same view twice (the Go to's `after` + its second call) keeps
  the flight going.

GPU depth read-back: not used. The pipeline's depth lives in the post chain's MRT, a read-back would be async (a frame
late) and a stall risk in WebGPU; the height fields give the same answer synchronously, and the landmark BVHs cover the
non-2.5D shapes (spires, arches, bridge decks). Trees, cars, lamp posts are not picked (the ground under them is).

## Memory / boot

`viewer/heroBVH.js` builds each landmark's BVH once, in the character's collider worker, as soon as heroColliders has
its triangles; the third person now takes the same BVH objects (own flags, shared arrays) instead of building its own,
so the arrays exist once. Without `?orbitheroes=0` the BVHs are built at boot even if the third person is never used
(worker time only, no main-thread work).

## Weak points / next

- The roof surface is 2.5D: a picked point under eaves or in a porch lands on the roof line above it; the drawn façade
  kit (balconies, dormers) is not in the field.
- Collision is the camera point + 0.8 m against roofs, not a sphere against façade triangles: at street level the
  camera can come within ~0.8 m of a wall.
- Twist-to-rotate on touch has no dead zone yet (a pinch may turn a little).
