# Mesh audit (before pack): playgroundkit.pg_fence_lod2

138 triangles, 101 welded vertices, 0 open edges, 0 rays, 3 ms.

**0 blocking**, 71 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 69 |
| nonmanifold | warn | 2 |
| backtoback | info | 21 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 69)

| at | part | aspect | longest |
|---|---|---|---|
| -1.03, 0.70, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -1.03, 0.30, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -1.03, 0.70, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -1.03, 0.30, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -0.97, 0.70, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -0.97, 0.30, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -0.97, 0.70, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| -0.97, 0.30, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 0.97, 0.30, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 0.97, 0.70, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 0.97, 0.70, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 0.97, 0.30, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 1.03, 0.30, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 1.03, 0.70, -0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 1.03, 0.70, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 1.03, 0.30, 0.02 | pg_fence_lod2/playground | 211 | 1.192 |
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.06, -0.02 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.06, -0.04 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.06, -0.04 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.25, -0.03 | pg_fence_lod2/playground | 337 | 1.92 |
| -0.32, 0.25, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.25, -0.03 | pg_fence_lod2/playground | 337 | 1.92 |
| -0.32, 0.25, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| 0.32, 0.25, -0.04 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.25, -0.03 | pg_fence_lod2/playground | 337 | 1.92 |
| 0.32, 0.25, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.25, -0.04 | pg_fence_lod2/playground | 337 | 1.92 |
| 0.32, 0.43, -0.03 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.44, -0.02 | pg_fence_lod2/playground | 337 | 1.92 |
| 0.32, 0.44, -0.02 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.44, -0.03 | pg_fence_lod2/playground | 337 | 1.92 |
| 0.32, 0.44, -0.03 | pg_fence_lod2/playground | 544 | 1.92 |
| 0.32, 0.43, -0.04 | pg_fence_lod2/playground | 336 | 1.92 |
| -0.32, 0.43, -0.04 | pg_fence_lod2/playground | 337 | 1.92 |
| 0.32, 0.44, -0.04 | pg_fence_lod2/playground | 336 | 1.92 |

(29 more in the JSON)

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| 0.00, 0.06, -0.03 | pg_fence_lod2/playground | 4 |
| 0.00, 0.06, -0.03 | pg_fence_lod2/playground | 4 |

## backtoback (info, 21)

| at | parts | area |
|---|---|---|
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00548 |
| -0.32, 0.06, -0.02 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00548 |
| -0.32, 0.06, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00548 |
| 0.32, 0.06, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00548 |
| 0.59, 0.25, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00419 |
| -0.59, 0.25, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00419 |
| 0.59, 0.25, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00419 |
| -0.59, 0.25, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00418 |
| -0.59, 0.44, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00418 |
| 0.69, 0.44, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| -0.69, 0.44, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00302 |
| 0.10, 0.62, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.0013 |
| -0.59, 0.62, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00419 |
| -0.69, 0.81, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| 0.69, 0.81, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| -0.11, 0.81, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00129 |
| -0.59, 0.81, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00419 |
| 0.69, 1.00, -0.02 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| -0.69, 1.00, -0.03 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| -0.69, 1.00, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |
| 0.69, 1.00, -0.04 | pg_fence_lod2/playground + pg_fence_lod2/playground | 0.00303 |


Nodes: pg_fence_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
