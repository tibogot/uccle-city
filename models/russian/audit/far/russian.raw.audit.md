# Mesh audit: russian.raw.glb

4,577 triangles, 2,693 welded vertices, 763 open edges, 401,120 rays, 1444 ms.

**0 blocking**, 420 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 341 |
| nonmanifold | warn | 4 |
| tjunction | warn | 75 |
| seam | info | 115 |
| opening | info | 137 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 341)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 7.38, -0.59 | Russian_far/brick_painted_white | 114 | 11.171 |
| 0.00, 8.09, -1.84 | Russian_far/brick_painted_white | 160 | 7.116 |
| 0.00, 2.96, -2.80 | Russian_far/brick_painted_white | 44 | 2.527 |
| 0.00, 1.09, 2.91 | Russian_far/brick_painted_white | 75 | 2.607 |
| 0.00, 1.09, -2.91 | Russian_far/brick_painted_white | 75 | 2.607 |
| 0.00, -0.48, 4.47 | Russian_far/brick_painted_white | 82 | 3.546 |
| 0.00, -0.48, 2.71 | Russian_far/brick_painted_white | 85 | 3.51 |
| 0.00, -0.48, -2.71 | Russian_far/brick_painted_white | 85 | 3.51 |
| 0.00, -0.48, -4.47 | Russian_far/brick_painted_white | 82 | 3.546 |
| -0.04, 6.74, 0.39 | Russian_far/brick_painted_white | 97 | 0.981 |
| -0.04, 6.74, -0.39 | Russian_far/brick_painted_white | 97 | 0.981 |
| -0.03, 1.71, -4.92 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, -4.92 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, -5.85 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, -5.85 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, 5.77 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, 5.77 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, 4.92 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, 4.92 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, -1.61 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, -1.61 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, -2.23 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, -2.23 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, 2.23 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, 2.23 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, 1.61 | Russian_far/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, 1.61 | Russian_far/brick_painted_white | 154 | 12.33 |
| 7.88, 5.33, 5.77 | Russian_far/brick_painted_white | 370 | 4.273 |
| 4.95, 5.33, 5.77 | Russian_far/brick_painted_white | 370 | 4.273 |
| 9.24, 4.90, 5.77 | Russian_far/brick_painted_white | 92 | 3.754 |
| 3.59, 4.90, 5.77 | Russian_far/brick_painted_white | 92 | 3.754 |
| 3.59, 2.93, 5.77 | Russian_far/brick_painted_white | 83 | 3.76 |
| 8.98, 1.51, 5.77 | Russian_far/brick_painted_white | 429 | 4.876 |
| 3.55, 1.51, 5.77 | Russian_far/brick_painted_white | 188 | 4.041 |
| 7.71, 0.97, 5.77 | Russian_far/brick_painted_white | 230 | 8.013 |
| 5.08, 0.96, 5.77 | Russian_far/brick_painted_white | 230 | 7.883 |
| 7.68, 0.91, 5.77 | Russian_far/brick_painted_white | 81 | 7.753 |
| 5.12, 0.88, 5.77 | Russian_far/brick_painted_white | 81 | 7.659 |
| 11.39, -0.28, 5.77 | Russian_far/brick_painted_white | 90 | 3.915 |
| 7.66, 0.81, 5.77 | Russian_far/brick_painted_white | 58 | 7.563 |

(301 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.00, 3.77, -5.85 | Russian_far/brick_painted_white | 3 |
| -0.08, 3.77, 5.77 | Russian_far/brick_painted_white | 3 |
| 12.83, 3.77, 5.85 | Russian_far/brick_painted_white | 3 |
| 12.91, 3.77, -5.77 | Russian_far/brick_painted_white | 3 |

## tjunction (warn, 75)

| at | part | edge_m |
|---|---|---|
| 0.00, 4.75, -3.41 | Russian_far/brick_painted_white | 7.493 |
| 0.00, 9.93, -5.77 | Russian_far/brick_painted_white | 0.93 |
| 0.00, -0.95, 5.77 | Russian_far/brick_painted_white | 12.33 |
| 0.00, 9.93, 5.77 | Russian_far/brick_painted_white | 0.93 |
| 12.83, -0.95, 5.77 | Russian_far/brick_painted_white | 12.33 |
| 12.83, 9.93, 5.77 | Russian_far/brick_painted_white | 0.93 |
| 12.83, -0.95, -5.77 | Russian_far/brick_painted_white | 12.33 |
| 12.83, 9.93, -5.77 | Russian_far/brick_painted_white | 0.93 |
| 0.00, -0.95, -5.77 | Russian_far/brick_painted_white | 12.33 |
| 12.83, -0.95, 5.77 | Russian_far/brick_painted_white | 4.61 |
| 16.45, 2.16, 0.45 | Russian_far/brick_painted_white | 4.61 |
| -0.32, -0.90, -1.45 | Russian_far/stone_blue | 3.5 |
| 13.86, -1.05, 6.26 | Russian_far/stone_blue | 1.4 |
| 0.29, 11.27, -5.48 | Russian_far/copper_brown | 0.996 |
| 0.29, 11.27, 5.48 | Russian_far/copper_brown | 0.996 |
| 0.26, 11.27, 5.51 | Russian_far/copper_brown | 0.405 |
| 0.96, 11.27, 4.81 | Russian_far/copper_brown | 1.107 |
| 11.87, 11.27, 4.81 | Russian_far/copper_brown | 1.107 |
| 12.57, 11.27, 5.51 | Russian_far/copper_brown | 0.405 |
| 12.54, 11.27, 5.48 | Russian_far/copper_brown | 0.996 |
| 11.76, 11.27, 4.70 | Russian_far/copper_brown | 1.36 |
| 11.76, 11.27, -4.70 | Russian_far/copper_brown | 1.36 |
| 12.54, 11.27, -5.48 | Russian_far/copper_brown | 0.996 |
| 12.57, 11.27, -5.51 | Russian_far/copper_brown | 0.405 |
| 11.87, 11.27, -4.81 | Russian_far/copper_brown | 1.107 |
| 0.96, 11.27, -4.81 | Russian_far/copper_brown | 1.107 |
| 0.26, 11.27, -5.51 | Russian_far/copper_brown | 0.405 |
| 1.18, 13.62, -4.15 | Russian_far/copper_brown | 0.776 |
| 1.80, 13.62, -3.53 | Russian_far/copper_brown | 1.061 |
| 2.65, 13.62, -2.68 | Russian_far/copper_brown | 1.061 |
| 3.50, 13.62, -1.83 | Russian_far/copper_brown | 0.776 |
| 4.12, 13.62, -1.21 | Russian_far/copper_brown | 0.284 |
| 4.35, 13.62, -0.98 | Russian_far/copper_brown | 0.776 |
| 4.35, 13.62, 1.22 | Russian_far/copper_brown | 0.776 |
| 4.12, 13.62, 1.45 | Russian_far/copper_brown | 0.284 |
| 3.50, 13.62, 2.07 | Russian_far/copper_brown | 0.776 |
| 2.65, 13.62, 2.92 | Russian_far/copper_brown | 1.061 |
| 1.80, 13.62, 3.77 | Russian_far/copper_brown | 1.061 |
| 1.18, 13.62, 4.39 | Russian_far/copper_brown | 0.776 |
| 1.15, 13.62, 4.42 | Russian_far/copper_brown | 0.322 |

(35 more in the JSON)

## seam (info, 115)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, -0.95, 5.57 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 51.82 | 64 | 90 |
| 8.36, 18.10, -0.68 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 30.96 | 64 | 36.3 |
| 0.00, 9.18, -2.23 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 52 | 90 |
| 3.97, 9.17, 5.77 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 50 | 90 |
| 8.24, 9.00, -5.77 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 50 | 90 |
| 8.24, 7.99, 5.77 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 48 | 90 |
| 3.97, 7.82, -5.77 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 48 | 90 |
| 6.06, 24.36, 0.10 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.47 | 44 | 32.6 |
| 17.18, 18.76, 12.06 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.26 | 44 | 32.6 |
| 6.13, 23.25, 0.10 | Russian_far/copper_brown + Russian_far/cast_iron_green | 0.62 | 42 | 72 |
| 0.00, 8.00, 1.61 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 25.9 | 40 | 90 |
| 17.50, 9.70, 9.39 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 10.3 | 40 | 90 |
| 6.06, 25.49, 0.09 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.45 | 40 | 41.4 |
| 17.18, 19.38, 12.05 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.25 | 40 | 41.4 |
| 17.47, 6.90, 9.37 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 11.36 | 37 | 90 |
| 6.06, 25.14, 0.09 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.51 | 36 | 41.4 |
| 17.18, 19.19, 12.06 | Russian_far/cast_iron_green + Russian_far/cast_iron_green | 0.28 | 36 | 41.4 |
| 8.42, 13.55, -0.37 | Russian_far/brick_painted_white + Russian_far/copper_brown | 15.48 | 34 | 90 |
| 0.95, 11.84, 3.82 | Russian_far/brick_painted_white + Russian_far/copper_brown | 10.99 | 33 | 37.8 |
| 13.78, 6.44, 4.00 | Russian_far/brick_painted_white + Russian_far/copper_brown | 11.89 | 33 | 90 |
| 11.15, 11.37, -4.32 | Russian_far/brick_painted_white + Russian_far/copper_brown | 11.3 | 32 | 41.4 |
| 10.55, 11.82, 4.62 | Russian_far/brick_painted_white + Russian_far/copper_brown | 11.86 | 31 | 37.6 |
| 0.00, 12.83, 2.96 | Russian_far/brick_painted_white + Russian_far/copper_brown | 6.81 | 30 | 24.7 |
| 9.78, 13.10, 5.77 | Russian_far/brick_painted_white + Russian_far/copper_brown | 8.42 | 30 | 24 |
| 17.22, 18.12, 12.04 | Russian_far/copper_brown + Russian_far/cast_iron_green | 0.42 | 30 | 34.7 |
| 0.25, 2.32, 0.76 | Russian_far/brick_painted_white + Russian_far/cast_iron_green | 2.08 | 29 | 90 |
| 11.15, 11.38, -3.97 | Russian_far/brick_painted_white + Russian_far/copper_brown | 9.24 | 29 | 47.3 |
| 7.99, 13.67, -1.34 | Russian_far/brick_painted_white + Russian_far/copper_brown | 5.54 | 29 | 33 |
| 4.11, 13.68, 1.61 | Russian_far/brick_painted_white + Russian_far/copper_brown | 5.54 | 29 | 33 |
| 1.62, 13.19, -5.77 | Russian_far/brick_painted_white + Russian_far/copper_brown | 6.41 | 25 | 24 |
| 17.58, 10.22, 9.21 | Russian_far/brick_painted_white + Russian_far/copper_brown | 17.95 | 24 | 90 |
| 12.83, 7.32, -2.15 | Russian_far/brick_painted_white + Russian_far/copper_brown | 18.14 | 22 | 66.3 |
| 12.83, 12.93, -4.32 | Russian_far/brick_painted_white + Russian_far/copper_brown | 4.65 | 21 | 24.7 |
| 22.06, 7.40, 8.99 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 14.27 | 20 | 90 |
| 0.00, 9.88, 5.64 | Russian_far/brick_painted_white + Russian_far/brick_painted_white | 48.74 | 19 | 90 |
| 0.95, 11.20, 4.59 | Russian_far/brick_painted_white + Russian_far/copper_brown | 38.4 | 18 | 90 |
| 0.95, 14.99, 3.48 | Russian_far/brick_painted_white + Russian_far/copper_brown | 3.71 | 17 | 25 |
| 9.87, 15.11, 4.62 | Russian_far/brick_painted_white + Russian_far/copper_brown | 4.11 | 17 | 24.9 |
| 11.15, 14.99, -3.24 | Russian_far/brick_painted_white + Russian_far/copper_brown | 3.71 | 17 | 25 |
| 2.23, 15.11, -4.38 | Russian_far/brick_painted_white + Russian_far/copper_brown | 4.11 | 17 | 24.9 |

(75 more in the JSON)

## opening (info, 137)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.00, 4.75, 3.36 | Russian_far/brick_painted_white | -1 + 0 + 0 | 6.813 |
| 0.00, 4.75, -3.69 | Russian_far/brick_painted_white | 0 + -1 + 0 | 0.34 |
| 0.00, 4.75, 3.69 | Russian_far/brick_painted_white | 0 + -1 + 0 | 0.34 |
| 12.86, 11.20, 5.85 | Russian_far/brick_painted_white | 0 + 1 + 0 | 12.99 |
| 12.91, 11.20, 5.80 | Russian_far/brick_painted_white | 0 + 1 + 0 | 11.7 |
| 12.86, 11.20, -5.85 | Russian_far/brick_painted_white | 0 + 1 + 0 | 12.99 |
| -0.08, 11.20, 5.80 | Russian_far/brick_painted_white | 0 + 1 + 0 | 11.7 |
| 17.83, 7.25, 10.08 | Russian_far/brick_painted_white | 0 + 1 + 0 | 0.84 |
| 17.79, 7.30, 10.06 | Russian_far/brick_painted_white | 0.88 + 0 + 0.48 | 1.7 |
| 17.80, 9.00, 10.06 | Russian_far/brick_painted_white | 0.85 + -0.26 + 0.46 | 0.217 |
| 17.87, 9.20, 10.10 | Russian_far/brick_painted_white | 0.62 + -0.71 + 0.34 | 0.217 |
| 18.02, 9.33, 10.18 | Russian_far/brick_painted_white | 0.23 + -0.97 + 0.12 | 0.217 |
| 18.29, 9.33, 10.33 | Russian_far/brick_painted_white | -0.23 + -0.97 + -0.12 | 0.217 |
| 18.37, 9.28, 10.38 | Russian_far/brick_painted_white | -0.62 + -0.71 + -0.34 | 0.217 |
| 16.23, 7.25, 10.20 | Russian_far/brick_painted_white | 0 + 1 + 0 | 0.84 |
| 16.18, 7.30, 10.21 | Russian_far/brick_painted_white | 0.96 + 0 + -0.28 | 1.7 |
| 16.20, 9.00, 10.21 | Russian_far/brick_painted_white | 0.93 + -0.26 + -0.27 | 0.217 |
| 16.27, 9.20, 10.18 | Russian_far/brick_painted_white | 0.68 + -0.71 + -0.2 | 0.217 |
| 16.43, 9.33, 10.14 | Russian_far/brick_painted_white | 0.25 + -0.97 + -0.07 | 0.217 |
| 16.63, 9.36, 10.08 | Russian_far/brick_painted_white | -0.25 + -0.97 + 0.07 | 0.217 |
| 16.82, 9.28, 10.02 | Russian_far/brick_painted_white | -0.68 + -0.71 + 0.2 | 0.217 |
| 16.95, 9.11, 9.98 | Russian_far/brick_painted_white | -0.93 + -0.26 + 0.27 | 0.217 |
| 16.99, 7.30, 9.97 | Russian_far/brick_painted_white | -0.96 + 0 + 0.28 | 1.7 |
| 15.18, 7.25, 11.41 | Russian_far/brick_painted_white | 0 + 1 + 0 | 0.84 |
| 15.16, 7.30, 11.46 | Russian_far/brick_painted_white | 0.48 + 0 + -0.88 | 1.7 |
| 15.16, 9.00, 11.44 | Russian_far/brick_painted_white | 0.46 + -0.26 + -0.85 | 0.217 |
| 15.20, 9.20, 11.37 | Russian_far/brick_painted_white | 0.34 + -0.71 + -0.62 | 0.217 |
| 15.28, 9.33, 11.22 | Russian_far/brick_painted_white | 0.12 + -0.97 + -0.23 | 0.217 |
| 15.43, 9.33, 10.95 | Russian_far/brick_painted_white | -0.12 + -0.97 + 0.23 | 0.217 |
| 15.48, 9.28, 10.87 | Russian_far/brick_painted_white | -0.34 + -0.71 + 0.62 | 0.217 |
| 15.30, 7.25, 13.01 | Russian_far/brick_painted_white | 0 + 1 + 0 | 0.84 |
| 15.31, 7.30, 13.06 | Russian_far/brick_painted_white | -0.28 + 0 + -0.96 | 1.7 |
| 15.31, 9.00, 13.04 | Russian_far/brick_painted_white | -0.27 + -0.26 + -0.93 | 0.217 |
| 15.28, 9.20, 12.97 | Russian_far/brick_painted_white | -0.2 + -0.71 + -0.68 | 0.217 |
| 15.24, 9.33, 12.81 | Russian_far/brick_painted_white | -0.07 + -0.97 + -0.25 | 0.217 |
| 15.18, 9.36, 12.61 | Russian_far/brick_painted_white | 0.07 + -0.97 + 0.25 | 0.217 |
| 15.12, 9.28, 12.42 | Russian_far/brick_painted_white | 0.2 + -0.71 + 0.68 | 0.217 |
| 15.09, 9.11, 12.29 | Russian_far/brick_painted_white | 0.27 + -0.26 + 0.93 | 0.217 |
| 15.07, 7.30, 12.25 | Russian_far/brick_painted_white | 0.28 + 0 + 0.96 | 1.7 |
| 16.51, 7.25, 14.06 | Russian_far/brick_painted_white | 0 + 1 + 0 | 0.84 |

(97 more in the JSON)

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| 17.38, 17.10, 12.00 | Russian_far/copper_brown + Russian_far/copper_brown | 0.03619 |
| 17.30, 17.10, 11.96 | Russian_far/copper_brown + Russian_far/copper_brown | 0.00963 |
| 17.26, 17.10, 11.93 | Russian_far/copper_brown + Russian_far/copper_brown | 0.02726 |
| 17.20, 17.10, 11.90 | Russian_far/copper_brown + Russian_far/copper_brown | 0.01856 |
| 17.08, 17.10, 11.93 | Russian_far/copper_brown + Russian_far/copper_brown | 0.02726 |
| 17.14, 17.10, 11.90 | Russian_far/copper_brown + Russian_far/copper_brown | 0.01856 |
| 17.04, 17.10, 11.96 | Russian_far/copper_brown + Russian_far/copper_brown | 0.00963 |
| 16.96, 17.10, 12.00 | Russian_far/copper_brown + Russian_far/copper_brown | 0.03619 |
| 16.96, 17.10, 12.14 | Russian_far/copper_brown + Russian_far/copper_brown | 0.03619 |
| 17.04, 17.10, 12.18 | Russian_far/copper_brown + Russian_far/copper_brown | 0.00963 |
| 17.08, 17.10, 12.21 | Russian_far/copper_brown + Russian_far/copper_brown | 0.02726 |
| 17.14, 17.10, 12.24 | Russian_far/copper_brown + Russian_far/copper_brown | 0.01856 |
| 17.20, 17.10, 12.24 | Russian_far/copper_brown + Russian_far/copper_brown | 0.01856 |
| 17.26, 17.10, 12.21 | Russian_far/copper_brown + Russian_far/copper_brown | 0.02726 |
| 17.30, 17.10, 12.18 | Russian_far/copper_brown + Russian_far/copper_brown | 0.00963 |
| 17.38, 17.10, 12.14 | Russian_far/copper_brown + Russian_far/copper_brown | 0.03619 |


Nodes: Russian_far. Distances: {"Russian_far":2000}. Quantum 0.000 mm. Offset 0,0,0.
