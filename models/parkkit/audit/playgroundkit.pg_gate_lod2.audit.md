# Mesh audit (before pack): playgroundkit.pg_gate_lod2

296 triangles, 196 welded vertices, 0 open edges, 0 rays, 9 ms.

**0 blocking**, 102 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 96 |
| nonmanifold | warn | 6 |
| seam | info | 6 |
| backtoback | info | 33 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 96)

| at | part | aspect | longest |
|---|---|---|---|
| -0.62, 0.34, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.62, 0.77, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.62, 0.34, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.62, 0.77, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.54, 0.34, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.54, 0.77, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.54, 0.77, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.54, 0.34, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.54, 0.77, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.54, 0.34, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.54, 0.77, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.54, 0.34, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.62, 0.34, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.62, 0.77, -0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.62, 0.77, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| 0.62, 0.34, 0.04 | pg_gate_lod2/steel_painted_green | 182 | 1.29 |
| -0.17, 0.06, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 0.06, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 0.10, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 0.10, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 0.10, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 0.10, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 0.06, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 0.06, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 1.03, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 1.03, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 1.07, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 1.07, -0.01 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 1.07, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 1.07, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.17, 1.03, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| 0.17, 1.03, -0.05 | pg_gate_lod2/steel_painted_green | 182 | 1.032 |
| -0.52, 0.41, -0.01 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.52, 0.72, -0.01 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.52, 0.72, -0.05 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.52, 0.41, -0.05 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.48, 0.72, -0.05 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.48, 0.41, -0.05 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.48, 0.72, -0.01 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |
| -0.48, 0.41, -0.01 | pg_gate_lod2/steel_painted_green | 163 | 0.921 |

(56 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| 0.00, 0.11, -0.03 | pg_gate_lod2/steel_painted_green | 4 |
| 0.00, 0.66, -0.03 | pg_gate_lod2/steel_painted_green | 4 |
| 0.00, 0.84, -0.02 | pg_gate_lod2/steel_painted_green | 4 |
| 0.42, 0.89, 0.08 | pg_gate_lod2/steel_galvanised | 4 |
| 0.42, 0.92, 0.09 | pg_gate_lod2/steel_galvanised | 4 |
| 0.42, 0.99, 0.08 | pg_gate_lod2/steel_galvanised | 4 |

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.52, 0.88, -0.05 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_galvanised | 0.44 | 28 | 83 |
| 0.54, 0.88, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_galvanised | 0.38 | 17 | 83.7 |
| -0.54, 0.85, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_galvanised | 0.2 | 11 | 19.2 |
| -0.61, 1.20, 0.00 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.24 | 4 | 5.4 |
| -0.54, 0.22, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_galvanised | 0.19 | 4 | 90 |
| 0.60, 1.20, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.2 | 4 | 5.4 |

## backtoback (info, 33)

| at | parts | area |
|---|---|---|
| -0.59, 1.20, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00123 |
| -0.60, 1.20, 0.00 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00122 |
| 0.34, 0.11, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00148 |
| -0.34, 0.11, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00148 |
| 0.16, 0.11, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| -0.16, 0.11, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| 0.34, 0.29, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00148 |
| -0.34, 0.29, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00148 |
| 0.29, 0.29, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 0.29, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 0.47, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 0.47, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 0.47, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 0.47, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 0.66, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 0.66, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.16, 0.66, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| 0.16, 0.66, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| -0.16, 0.84, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| 0.16, 0.84, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00268 |
| -0.29, 0.84, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 0.84, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 1.02, -0.03 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 1.02, -0.02 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| 0.29, 1.02, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.29, 1.02, -0.04 | pg_gate_lod2/steel_painted_green + pg_gate_lod2/steel_painted_green | 0.00205 |
| -0.53, 0.23, -0.03 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00072 |
| -0.55, 0.19, -0.03 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00072 |
| -0.52, 0.21, -0.03 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00072 |
| -0.54, 0.17, -0.03 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00072 |
| 0.42, 0.88, 0.07 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00052 |
| 0.42, 0.90, 0.09 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00056 |
| 0.43, 1.00, 0.07 | pg_gate_lod2/steel_galvanised + pg_gate_lod2/steel_galvanised | 0.00049 |


Nodes: pg_gate_lod2. Distances: {"pg_swing_lod0":20,"pg_swing_lod1":55,"pg_swing_lod2":160,"pg_slide_lod0":20,"pg_slide_lod1":55,"pg_slide_lod2":160,"pg_climb_lod0":20,"pg_climb_lod1":55,"pg_climb_lod2":160,"pg_spring_lod0":20,"pg_spring_lod1":55,"pg_spring_lod2":160,"pg_sandpit_lod0":20,"pg_sandpit_lod1":55,"pg_sandpit_lod2":160,"pg_seesaw_lod0":20,"pg_seesaw_lod1":55,"pg_seesaw_lod2":160,"pg_bench_lod0":20,"pg_bench_lod1":55,"pg_bench_lod2":160,"pg_fence_lod0":20,"pg_fence_lod1":55,"pg_fence_lod2":160,"pg_gate_lod0":20,"pg_gate_lod1":55,"pg_gate_lod2":160,"pg_surface_lod0":20,"pg_surface_lod1":55,"pg_surface_lod2":160}. Quantum 0.028 mm. Offset 0,0,0.
