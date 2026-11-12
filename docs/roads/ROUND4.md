# Roads round 4 (2026-11-13, branch claude/roads2, on top of claude/foundation eae9ce4 + claude/traffic)

Owner: "do what you think is best… always be sure of performance and optimization". Merged `claude/foundation` (fast
forward to b9e6fe3), then `claude/traffic`. Checker: `docs/roads/audit/r3before` (6c70e37) vs `r4after`.

## 1. Kerb shimmer: fixed

- **Cause**: the kerbstone joints and the 12 mm top arris were faded by hand-tuned footprint thresholds on a WORLD
  footprint (fwidth x + z), which on the vertical kerb face misses the vertical footprint: 3 mm features stayed sharp
  while a fraction of a pixel.
- **Fix** (`viewer/roadPaint.js concreteMaterial`): joints box-filtered over their own uv footprint with
  `filteredPulse`, the arris with `boxCoverage` (tslkit, ported from Mr.doob's slop-newyork `tsl-materials.js`): exact
  coverage at every distance (a 6 mm joint per 1 m stone tends to 0.6 %), no thresholds. Where the whole face is a
  pixel or two, its colour goes to the mean of the asphalt and paving round it (less contrast on its sub-pixel edges).
- **Flicker test** (24 frames, sub-pixel strafe, same cameras): J1 45 -> **4** blinking px (round 2: 8), J5 82 -> **67**
  (the far sidewalk edge's geometry, the same in every round; not paint, not z-fighting). `round4/flicker_j{1,5}.png`.

## 2. Cost: triangles fixed; GPU not measurable this session

- **Road triangles, 120 tiles: 5.28 M (6c70e37) -> 5.62 M (+6.4 %)**, round 3 was +20.5 %. What did it:
  - dropped kerbs: the two wing points are inserted into the ramp's kerb edge (every ring and kerb line sharing it),
    instead of cutting the ramp's triangles along the wing lines and densifying the kerb every 0.5 m along it
    (`surfaces.js rampKerbPoints`): the biggest single saving;
  - chord error by edge type: kerbs 1.5 cm (seen up close), outer street edges 3 cm;
  - skirts (faces down into the ground on the far side of the street) not densified at the cell creases (their top
    6 mm under the edge);
  - bicycle pictograms with 10-bar wheels (was 14).
  - Checked and not used: merging a cell's two half-planes where they agree (only 31 of 1,746 cells at I6 bend less
    than 3 mm: the DTM-fitted height field is not flat enough); skipping base asphalt under the engine layer (the
    layer's 8 mm crease steps need the base under them).
  - Distance LOD / meshoptimizer per ring / BatchedMesh: not needed for the triangle budget; the roads are already one
    draw per material per tile (asphalt, concrete, square, pits, paint, grass).
- **Shader**: the sidewalk evaluates ONE tile pattern (`courses`) per pixel instead of two cross-faded (the frame is
  chosen per triangle since round 3), and no apron setts on the measured surfaces (they have no aprons): fewer ALU and
  noise calls per sidewalk pixel. Kerbstone joints are analytic (no texture read).
- **GPU A/B**: A = foundation before the roads v2 merge (0f94123), B = this branch, I6 walk view, 40 s of GPU timestamps
  each, alternating A B A: **22.3 / 55.6 / 64.9 ms average**: the same A code measured 22 then 65 ms. Two other agents
  had city tabs rendering on the GPU (and the tabs ran at ~1 fps): the noise is 3x the signal, so no GPU claim can be
  made this session. City-view triangles at I6: 5.894 M -> 5.908 M (+0.2 %), draws 480 -> 482.

## 3. Ground materials (library sets): not done

Not switched. The library materials (viewer/materials/library.js) are the full weathering shader with scan textures
and hex anti-tiling (several texture reads per pixel), and the road surfaces carry their own attributes (engine lane
paint codes, the marking atlas, paving frames, kerb band and joints). Putting the library asphalt / paving / cobbles
under them is a shader rewrite whose GPU cost cannot be measured with the GPU as busy as it is now, against a
+0.1 ms budget. Proposed for a quiet-GPU session: the library's colour / roughness / normal nodes as the BASE, with the
road paint, kerb band and joints mixed on top, compiled once per tile material.

## 4. Traffic: merged, on by default

- `claude/traffic` merged (conflicts in tileData.js / main.js resolved keeping both sides: rail, ponds, landmarks, the
  fixed lamp-light pool + the traffic graph, signal heads). The traffic graph is built in the worker from `rd.net`, the
  roads2 lane graph (repaired: loops cut, lanes on the measured carriageway, R >= 4 m, hold points at the painted
  lines). On I6: 422 paths, 36 junctions (8 signal, 105 priority), 301 conflicts, 84 ms.
- `?traffic` is now ON by default (`?traffic=0` off). City loads at I6 and E4 with no console errors; cars on the
  lanes: `round4/city_traffic_j1.png`, `round4/city_traffic_j5.png` (moving strips, 8 frames over 8 s). Whether every
  car stops at the painted line was not checked frame by frame.

## 5. Leftovers

- Median kerb 15 -> 13 cm (= sidewalk). The open concrete steps did not change much with it (2,206 -> 1,903; the
  remaining ones are sidewalk / forecourt seams, 0.6-0.9 cm): **not fixed**.
- Hairline cracks: concrete 149 -> 37, asphalt 145 (in-layer steps over the base). Not 0.
- Kerb gaps 163, Edith Cavell's centre line, tight lane connectors (max 327 °/m), the J1 dark line: **not done**.

## Checker, 120 tiles (errors; C23 warnings)

| check:kind | before (6c70e37) | round 4 |
|---|---|---|
| C14 overlap / photo | 41 / 3 | 26 / 0 |
| C15 decal2 / hidden / laneX / stopX | 82 / 13 / 79 / 4 | 12 / 1 / 11 / 4 |
| C16 short / stray | 45 / 8 | 3 / 1 |
| C18 asphalt step / T | 1,502 / 169 | 891 / 145 |
| C18 concrete step / T | 2,443 / 69 | 1,903 / 37 |
| C18 pits T | 1,535 | 0 |
| C19 notch / gap | 2,570 / 47 | 478 / 163 |
| C20 paving uv | 265 | 84 |
| C21 normals / tone | 7,862 / 205,464 | 0 / 0 |
| C22 kerb / kink | 23,484 / 4,530 | 9,345 / 1,331 |
| C23 facets > 2 cm (warn) | 18,986 | 5,089 (the outer edges are now at 3 cm on purpose) |

Ready to merge from my side: yes, with items 2 (GPU proof), 3 and 5 open as listed.
