# Mesh audit: furniture2.glb

5,572 triangles, 2,856 welded vertices, 0 open edges, 0 rays, 496 ms.

**0 blocking**, 242 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 26 |
| sliver | warn | 216 |
| seam | info | 28 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 26)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.78, 0.40, 0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 5.8 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.78, 0.40, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.3 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.78, 0.41, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.9 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.82, 0.40, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 5.1 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| -0.82, 0.39, 0.21 | bench_park/cast_green + bench_park/cast_green | 2.5 | 1 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| -0.82, 0.40, 0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.9 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| -0.78, 0.39, -0.21 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.7 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.78, 0.39, -0.19 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.8 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.82, 0.39, -0.18 | bench_park/cast_green + bench_park/cast_green | 2.5 | 1.7 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| -0.82, 0.39, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.2 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| -0.78, 0.41, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 3.5 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.78, 0.41, -0.18 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.7 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| -0.82, 0.41, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 3.6 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.82, 0.40, 0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 5.8 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.82, 0.40, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.3 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.82, 0.41, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.9 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.78, 0.40, 0.22 | bench_park/cast_green + bench_park/cast_green | 2.5 | 5.1 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.78, 0.39, 0.21 | bench_park/cast_green + bench_park/cast_green | 2.5 | 1 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.78, 0.40, 0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.9 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.82, 0.39, -0.21 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.7 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.82, 0.39, -0.19 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.8 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.78, 0.39, -0.18 | bench_park/cast_green + bench_park/cast_green | 2.5 | 1.7 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.78, 0.39, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 4.2 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |
| 0.82, 0.41, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 3.5 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.82, 0.41, -0.18 | bench_park/cast_green + bench_park/cast_green | 2.5 | 0.7 | 0 | 60 | 0.46 | false | 1 + 0 + 0 |
| 0.78, 0.41, -0.20 | bench_park/cast_green + bench_park/cast_green | 2.5 | 3.6 | 0 | 60 | 0.46 | false | -1 + 0 + 0 |

## sliver (warn, 216)

| at | part | aspect | longest |
|---|---|---|---|
| -0.78, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.79, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.78, 0.41, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.78, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.78, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.78, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.79, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.78, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.81, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.41, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.81, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| -0.82, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.81, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.41, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.81, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.82, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.79, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.38, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.38, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.41, -0.05 | bench_park/cast_green | 78 | 0.475 |
| 0.79, 0.42, 0.11 | bench_park/cast_green | 78 | 0.475 |
| 0.78, 0.42, -0.05 | bench_park/cast_green | 78 | 0.475 |
| -0.27, 0.12, -0.01 | bench_park/cast_green | 346 | 1.588 |
| 0.27, 0.12, -0.01 | bench_park/cast_green | 346 | 1.588 |
| -0.27, 0.12, -0.01 | bench_park/cast_green | 346 | 1.588 |
| 0.27, 0.12, -0.01 | bench_park/cast_green | 346 | 1.588 |
| 0.27, 0.14, -0.01 | bench_park/cast_green | 346 | 1.588 |
| -0.27, 0.14, -0.01 | bench_park/cast_green | 346 | 1.588 |
| 0.27, 0.14, -0.01 | bench_park/cast_green | 346 | 1.588 |
| -0.27, 0.14, -0.01 | bench_park/cast_green | 346 | 1.588 |

(176 more in the JSON)

## seam (info, 28)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.79, 0.38, 0.24 | bench_park/cast_green + bench_park/cast_green | 0.33 | 69 | 67.5 |
| 0.81, 0.38, 0.24 | bench_park/cast_green + bench_park/cast_green | 0.33 | 69 | 67.5 |
| -0.78, 0.61, -0.20 | bench_park/cast_green + bench_park/wood_slat | 0.3 | 64 | 24.5 |
| 0.82, 0.61, -0.20 | bench_park/cast_green + bench_park/wood_slat | 0.3 | 64 | 24.5 |
| -0.79, 0.63, 0.25 | bench_park/cast_green + bench_park/cast_green | 0.17 | 52 | 22.5 |
| 0.81, 0.63, 0.25 | bench_park/cast_green + bench_park/cast_green | 0.17 | 52 | 22.5 |
| -0.79, 0.38, -0.17 | bench_park/cast_green + bench_park/cast_green | 0.31 | 51 | 66.8 |
| 0.81, 0.38, -0.17 | bench_park/cast_green + bench_park/cast_green | 0.31 | 51 | 66.8 |
| -0.79, 0.42, 0.24 | bench_park/cast_green + bench_park/wood_slat | 0.29 | 50 | 88.4 |
| 0.81, 0.42, 0.24 | bench_park/cast_green + bench_park/wood_slat | 0.29 | 50 | 88.4 |
| -0.79, 0.61, -0.21 | bench_park/cast_green + bench_park/cast_green | 0.24 | 44 | 65.1 |
| 0.81, 0.61, -0.21 | bench_park/cast_green + bench_park/cast_green | 0.24 | 44 | 65.1 |
| -0.79, 0.09, 0.20 | bench_park/cast_green + bench_park/cast_green | 0.12 | 36 | 62.9 |
| -0.79, 0.09, -0.20 | bench_park/cast_green + bench_park/cast_green | 0.12 | 36 | 61.3 |
| 0.81, 0.09, 0.20 | bench_park/cast_green + bench_park/cast_green | 0.12 | 36 | 62.9 |
| 0.81, 0.09, -0.20 | bench_park/cast_green + bench_park/cast_green | 0.12 | 36 | 61.3 |
| -0.79, 0.12, 0.01 | bench_park/cast_green + bench_park/cast_green | 0.09 | 34 | 22.7 |
| 0.79, 0.12, 0.01 | bench_park/cast_green + bench_park/cast_green | 0.09 | 34 | 22.7 |
| -0.81, 0.66, -0.18 | bench_park/cast_green + bench_park/galvanised | 0.04 | 16 | 75.2 |
| 0.79, 0.66, -0.18 | bench_park/cast_green + bench_park/galvanised | 0.04 | 16 | 75.2 |
| -0.80, 0.46, 0.24 | bench_park/cast_green + bench_park/galvanised | 0.01 | 12 | 15.1 |
| 0.80, 0.46, 0.24 | bench_park/cast_green + bench_park/galvanised | 0.01 | 12 | 15.1 |
| 0.80, 0.67, -0.19 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |
| -0.80, 0.67, -0.19 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |
| 0.80, 0.76, -0.22 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |
| -0.80, 0.76, -0.22 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |
| 0.80, 0.85, -0.24 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |
| -0.80, 0.85, -0.24 | bench_park/wood_slat + bench_park/galvanised | 0.06 | 12 | 90 |

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.80, 0.46, 0.23 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.46, 0.23 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.46, 0.15 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.46, 0.15 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.46, 0.07 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.46, 0.07 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.46, -0.02 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.46, -0.02 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.46, -0.10 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.46, -0.10 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.66, -0.19 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.66, -0.19 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.75, -0.21 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.75, -0.21 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| 0.80, 0.84, -0.24 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |
| -0.80, 0.84, -0.24 | bench_park/wood_slat + bench_park/galvanised | 0.00011 |


Nodes: bench_park. Distances: {"bench_park":60}. Quantum 0.000 mm. Offset 0,0,0.
