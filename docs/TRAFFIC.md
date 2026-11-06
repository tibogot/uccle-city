# Moving traffic (branch `claude/traffic`)

Cars drive on the road engine's real lane graph, stop at the real (OSM) traffic lights in step with the drawn signal
heads, give way, pull out of and reverse into parking slots, and brake for the player. Lab first:
`labs/traffic-lab.html` (tile I6, Place de Saint-Job); in the city behind `?traffic=1` (`&trafficdebug=1` draws the
lane graph, hold points and targets).

## Pieces (`viewer/traffic/`)

| File | What |
|---|---|
| `signals.js` | THE signal cycle (the furniture kit's: green 22 s, amber 3 s, all-red 2 s, phase B = A + 27 s; phase by the road direction at the OSM post). `viewer/furniture.js` now lights its signal heads from it (uniforms), so cars and lights agree. On `claude/furniture` the kit has its own copy (`furnitureModel.js SIGNAL`, same numbers, same clock): point it at `signals.js` when merging. |
| `trafficGraph.js` | Built in the tile worker (`tileData.js`, bundle rebuilt): the engine's lanes + junction connectors as typed arrays; lanes snapped onto the MEASURED carriageway (UrbIS class raster: points whose ±1 m footprint is not roadway / tram road / parking move sideways up to 9 m, smoothed; connectors follow); per-point curve speed limits; OSM `maxspeed` (30 km/h default); junction control from data only (OSM signals; OSM stop / give_way points on an approach; else priorité de droite; roundabouts give way to the ring); the conflict table per connector (crossing / merging, who yields: signal phase, minor vs major, left turn vs oncoming, priorité de droite). |
| `trafficWorld.js` | The loaded tiles' graphs as one network (gid = tile slot << 16 \| path); buffer copies get a TWIN in the neighbour that owns the road, so cars cross tile borders onto the owner's copy (the small lateral difference blends out); segment hash for obstacles / parking lookups. |
| `trafficSim.js` | Fixed 20 Hz steps, structure of arrays, no allocation per step. IDM following, braking ahead for curves and slower lanes; hold points: red / amber (stop if it can), stop signs (full stop 1.3 s), give way / priorité de droite (never enters while a conflicting car is inside, yields to priority cars due within 4.5 s, a courtesy rule ends 4-way standoffs), no entering a junction whose exit is full; obstacles (player car, walker, trams + their track ahead at crossings) as virtual leaders; parking pull-out (indicator, waits for a gap, S-curve) and park-in (stops past a free slot, reverses in, handed back to the parked fleet with the same pose, type and paint); population per road class x hour (city clock = tram 92's), spawned / removed only outside the frustum or beyond the 420 m fade. Pose from rear and front axle points on the route (smooth heading), ground height and pitch under the axles, front-wheel steer from the path ahead. |
| `trafficFleet.js` | The faceted family drawn exactly like the parked fleet (`carFleet.js`: the same LOD geometry, shared; instanced per type per LOD; dithered LOD cross-fades; shadows fade with the car; 380-420 m far fade), with four materials adding rolling / steering wheels (vertex shader, per-vertex wheel centre from the GLB's `Wheel_*` nodes) and lights (brake, indicators blinking on the lamp clusters' outer halves, reversing, headlights + tail lamps by the night uniform). Rebuilt every frame without allocation. Pop counters: LOD pops, cars appearing / vanishing whole in view. |
| `traffic.js` | Puts world + sim + fleet + debug together (lab and city). |
| `cityTraffic.js` | The city: tiles in / out with streaming, focus = player, obstacles (drive car, walker, trams at 5 Hz), drive-mode collisions (box-box SAT through the new `env.dynamic` hook in `drive/carEnv.js`), a collider source on the walker's collision world. |
| `trafficDebug.js` | Lane graph, hold bars with live signal colours, each car's target line. |

## Verified in motion (10 fps frame sequences, `docs/traffic/`)

Every 0.8-1.1 s of a 10 fps sequence shown (the world paused and stepped 0.1 s per frame; captions = sim state):

- `red_stop.webp`: two cars on Chaussée de Saint-Job approach the 5-arm junction; amber, then red; the leader brakes
  from 29 km/h and stops 1.3 m before the line, the follower stops behind it (brake lamps lit).
- `green_go.webp`: the light turns green; the leader starts (~1 s), turns right through the junction; the follower
  starts after it with its gap.
- `give_way.webp`: an unsigned junction (priorité de droite): the car without priority slows, waits at the line
  while the other passes, then turns.
- `pull_out.webp`: a parked car indicates, waits for a gap, pulls out on an S-curve and drives off (the parked copy is
  hidden the same frame: no double, no pop).
- `park_in.webp`: a car stops past a free slot (indicator), reverses in and becomes a parked car again.
- Spawn / despawn edge (lab, camera orbiting and rising/sinking round the junction for 60 s, density x1.6): 181 cars
  spawned and 181 removed, **0 appeared in view, 0 vanished in view, 0 LOD pops** (3600 frames). City (I6 + 8
  neighbours, 135 cars, 08:30): 0 / 0 / 0 over the A/B run.
- Drive mode: a parked player car on the lane: the next car stops 2.4 m behind it, the one after follows; the player
  car pushed into a stopped traffic car is pushed out (1.2 -> 2.0 m between centres).

## Cost (2026-11-06, WebGPU, GPU shared with another agent's tab, so the spread is reported)

- CPU: lab 25-90 cars: sim 0.03-0.06 ms + draw 0.01-0.06 ms per frame; city 135 cars on 9 tiles: **0.18 ms per frame**
  (sim 0.14, fleet 0.04), one 20 Hz step 0.38 ms avg / 0.69 max, worst frame 0.78 ms. No allocation per step or frame
  (the tram positions are refreshed at 5 Hz through tramline.js, which allocates a few small arrays).
- GPU A/B in the city (street view over the junction, 48 of 135 cars drawn, four rounds of on / off, median ms):
  13.76 / 13.50, 14.16 / 13.89, 14.16 / 13.76, 13.96 / 13.63 -> **+0.26 to +0.40 ms (mean +0.32)**.
- Draw calls: +32 to +42 (20 fleet batches in that view, plus their shadow passes).

## What still looks weak

- The engine's lanes vs the measured streets: the snap fixes most (lane points on a sidewalk in I6: 6.3 % -> 0.9 %),
  but a few lanes still hug a kerb or a building corner where the engine's geometry and UrbIS disagree by > 9 m or
  have no measured surface.
- Trams follow the timetable and do not stop for cars: cars wait for trams at crossings and follow them, but a car
  stopped in front of a tram on a shared lane can be driven through.
- Priorité de droite everywhere off the OSM signs is the Belgian default but real Uccle has many unmapped priority-road
  signs (B9): main roads will yield more than they really do.
- Two-phase signals only (the drawn posts' rule): at the 5-arm junction several arms are green together; conflicts
  are resolved by the yield rules, not by the light.
- Parking: park-in uses only slots vacated by a pull-out; a slot whose lane runs far from the kerb (wide streets) is
  skipped. The parked car's third-person collider box stays where it was (it is static per tile).
- No lane changes (single lane per direction is the Uccle norm; multi-lane approaches keep the lane they start in).
- Headlights are emissive only (no light cast on the road at night).
