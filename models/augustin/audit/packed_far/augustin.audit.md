# Mesh audit: augustin.glb

7,749 triangles, 4,759 welded vertices, 2,215 open edges, 588,036 rays, 1561 ms.

**0 blocking**, 1069 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 629 |
| nonmanifold | warn | 80 |
| tjunction | warn | 360 |
| seam | info | 293 |
| opening | info | 378 |
| backtoback | info | 321 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 629)

| at | part | aspect | longest |
|---|---|---|---|
| 3.56, 32.67, -2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.66, 28.33, -2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.66, 32.67, -3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.56, 28.33, -3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.56, 32.67, 3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.66, 28.33, 3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.66, 32.67, 2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| 3.56, 28.33, 2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.56, 32.67, 2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.66, 28.33, 2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.66, 32.67, 3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.56, 28.33, 3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.56, 32.67, -3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.66, 28.33, -3.37 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.66, 32.67, -2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| -3.56, 28.33, -2.96 | Augustin_far/concrete_white | 43 | 13.003 |
| 5.56, 33.22, 0.52 | Augustin_far/concrete_white | 44 | 8.763 |
| 5.56, 36.14, 0.58 | Augustin_far/concrete_white | 44 | 8.763 |
| 5.56, 23.53, 0.38 | Augustin_far/concrete_white | 58 | 5.802 |
| 5.56, 25.47, 0.42 | Augustin_far/concrete_white | 58 | 5.802 |
| 5.56, 33.22, 0.38 | Augustin_far/concrete_white | 88 | 8.761 |
| 5.56, 36.14, 0.42 | Augustin_far/concrete_white | 88 | 8.761 |
| 5.56, 23.53, -0.42 | Augustin_far/concrete_white | 58 | 5.802 |
| 5.56, 25.47, -0.38 | Augustin_far/concrete_white | 58 | 5.802 |
| 5.56, 33.22, -0.42 | Augustin_far/concrete_white | 88 | 8.761 |
| 5.56, 36.14, -0.38 | Augustin_far/concrete_white | 88 | 8.761 |
| 5.56, 33.22, -0.58 | Augustin_far/concrete_white | 44 | 8.763 |
| 5.56, 36.14, -0.52 | Augustin_far/concrete_white | 44 | 8.763 |
| -5.56, 25.47, -1.56 | Augustin_far/concrete_white | 80 | 10.401 |
| -5.56, 28.93, -1.61 | Augustin_far/concrete_white | 80 | 10.401 |
| -5.56, 25.47, 1.61 | Augustin_far/concrete_white | 80 | 10.401 |
| -5.56, 28.93, 1.56 | Augustin_far/concrete_white | 80 | 10.401 |
| 2.78, 41.10, 1.73 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.78, 42.70, 1.75 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.78, 41.10, 1.78 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.77, 42.70, 1.79 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.77, 41.10, 1.82 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.77, 42.70, 1.83 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.76, 41.10, 1.86 | Augustin_far/concrete_white | 110 | 4.801 |
| 2.75, 42.70, 1.88 | Augustin_far/concrete_white | 110 | 4.801 |

(589 more in the JSON)

## nonmanifold (warn, 80)

| at | part | uses |
|---|---|---|
| 2.78, 44.30, 1.49 | Augustin_far/concrete_white | 3 |
| 2.78, 44.30, 1.74 | Augustin_far/concrete_white | 3 |
| 2.77, 44.30, 1.78 | Augustin_far/concrete_white | 3 |
| 2.77, 44.30, 1.83 | Augustin_far/concrete_white | 3 |
| 2.76, 44.30, 1.87 | Augustin_far/concrete_white | 3 |
| 2.74, 44.30, 1.91 | Augustin_far/concrete_white | 3 |
| 2.72, 44.30, 1.95 | Augustin_far/concrete_white | 3 |
| 2.70, 44.30, 1.99 | Augustin_far/concrete_white | 3 |
| 2.68, 44.30, 2.02 | Augustin_far/concrete_white | 3 |
| 2.65, 44.30, 2.06 | Augustin_far/concrete_white | 3 |
| 2.62, 44.30, 2.09 | Augustin_far/concrete_white | 3 |
| 2.58, 44.30, 2.12 | Augustin_far/concrete_white | 3 |
| 2.55, 44.30, 2.14 | Augustin_far/concrete_white | 3 |
| 2.51, 44.30, 2.16 | Augustin_far/concrete_white | 3 |
| 2.47, 44.30, 2.18 | Augustin_far/concrete_white | 3 |
| 2.43, 44.30, 2.20 | Augustin_far/concrete_white | 3 |
| 2.39, 44.30, 2.21 | Augustin_far/concrete_white | 3 |
| 2.35, 44.30, 2.21 | Augustin_far/concrete_white | 3 |
| 2.30, 44.30, 2.22 | Augustin_far/concrete_white | 3 |
| 2.04, 44.30, 2.22 | Augustin_far/concrete_white | 3 |
| 2.04, 44.30, -2.22 | Augustin_far/concrete_white | 3 |
| 2.30, 44.30, -2.22 | Augustin_far/concrete_white | 3 |
| 2.35, 44.30, -2.21 | Augustin_far/concrete_white | 3 |
| 2.39, 44.30, -2.21 | Augustin_far/concrete_white | 3 |
| 2.43, 44.30, -2.20 | Augustin_far/concrete_white | 3 |
| 2.47, 44.30, -2.18 | Augustin_far/concrete_white | 3 |
| 2.51, 44.30, -2.16 | Augustin_far/concrete_white | 3 |
| 2.55, 44.30, -2.14 | Augustin_far/concrete_white | 3 |
| 2.58, 44.30, -2.12 | Augustin_far/concrete_white | 3 |
| 2.62, 44.30, -2.09 | Augustin_far/concrete_white | 3 |
| 2.65, 44.30, -2.06 | Augustin_far/concrete_white | 3 |
| 2.68, 44.30, -2.02 | Augustin_far/concrete_white | 3 |
| 2.70, 44.30, -1.99 | Augustin_far/concrete_white | 3 |
| 2.72, 44.30, -1.95 | Augustin_far/concrete_white | 3 |
| 2.74, 44.30, -1.91 | Augustin_far/concrete_white | 3 |
| 2.76, 44.30, -1.87 | Augustin_far/concrete_white | 3 |
| 2.77, 44.30, -1.83 | Augustin_far/concrete_white | 3 |
| 2.77, 44.30, -1.78 | Augustin_far/concrete_white | 3 |
| 2.78, 44.30, -1.74 | Augustin_far/concrete_white | 3 |
| 2.78, 44.30, -1.49 | Augustin_far/concrete_white | 3 |

(40 more in the JSON)

## tjunction (warn, 360)

| at | part | edge_m |
|---|---|---|
| 5.56, 29.40, -0.35 | Augustin_far/concrete_white | 0.9 |
| 5.56, 30.30, -0.35 | Augustin_far/concrete_white | 0.9 |
| -5.56, 22.00, -0.25 | Augustin_far/concrete_white | 0.8 |
| -5.56, 32.40, -0.25 | Augustin_far/concrete_white | 0.8 |
| -5.56, 34.10, -1.52 | Augustin_far/concrete_white | 1.4 |
| -5.56, 36.70, -1.52 | Augustin_far/concrete_white | 1.4 |
| -5.56, 34.10, 0.40 | Augustin_far/concrete_white | 1.4 |
| -5.56, 36.70, 0.40 | Augustin_far/concrete_white | 1.4 |
| -18.50, 14.40, -3.85 | Augustin_far/concrete_white | 8.44 |
| -18.50, 14.40, -2.35 | Augustin_far/concrete_white | 8.44 |
| -18.50, 14.40, -0.95 | Augustin_far/concrete_white | 8.44 |
| -18.50, 14.40, 0.95 | Augustin_far/concrete_white | 8.44 |
| -18.50, 14.40, 2.35 | Augustin_far/concrete_white | 8.44 |
| -18.50, 14.40, 3.85 | Augustin_far/concrete_white | 8.44 |
| -18.50, 17.75, -4.00 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, -4.70 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, -1.20 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, -2.00 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, 2.00 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, 1.20 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, 4.70 | Augustin_far/concrete_white | 11.69 |
| -18.50, 17.75, 4.00 | Augustin_far/concrete_white | 11.69 |
| -18.50, 6.36, 6.28 | Augustin_far/concrete_white | 11.4 |
| -18.50, 6.36, 6.78 | Augustin_far/concrete_white | 11.4 |
| -18.50, 6.36, -6.78 | Augustin_far/concrete_white | 11.4 |
| -18.50, 6.36, -6.28 | Augustin_far/concrete_white | 11.4 |
| -22.02, 5.14, -1.30 | Augustin_far/concrete_white | 3.3 |
| -22.57, 3.20, -1.30 | Augustin_far/concrete_white | 3.3 |
| -22.57, 3.20, 1.30 | Augustin_far/concrete_white | 3.3 |
| -22.02, 5.14, 1.30 | Augustin_far/concrete_white | 3.3 |
| -4.00, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| -4.70, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| -1.20, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| -2.00, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| 2.00, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| 1.20, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| 4.70, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| 4.00, 16.85, 18.86 | Augustin_far/concrete_white | 10.79 |
| -1.30, 5.14, 22.50 | Augustin_far/concrete_white | 3.3 |
| -1.30, 3.20, 23.05 | Augustin_far/concrete_white | 3.3 |

(320 more in the JSON)

## seam (info, 293)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 19.50, 17.11, -5.71 | Augustin_far/concrete_white + Augustin_far/concrete_white | 19.35 | 184 | 87.7 |
| 16.34, 13.09, 5.73 | Augustin_far/concrete_white + Augustin_far/concrete_white | 18.44 | 115 | 89.9 |
| 5.55, 13.09, -16.73 | Augustin_far/concrete_white + Augustin_far/concrete_white | 18.44 | 114 | 89.9 |
| 19.51, 17.15, 5.41 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 16.99 | 105 | 90 |
| -16.53, 13.09, -7.62 | Augustin_far/concrete_white + Augustin_far/concrete_white | 16.39 | 101 | 90 |
| -5.55, 13.09, 16.73 | Augustin_far/concrete_white + Augustin_far/concrete_white | 16.39 | 100 | 90 |
| -2.86, 47.80, -1.25 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.77 | 94 | 90 |
| 2.48, 47.94, -1.25 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.77 | 94 | 90 |
| 2.86, 47.80, 1.25 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.77 | 94 | 90 |
| -2.55, 48.00, 1.25 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.77 | 94 | 90 |
| -3.46, 39.50, 0.86 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 27.68 | 85 | 90 |
| 5.51, 13.24, 16.43 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 18.22 | 77 | 89.9 |
| 28.02, 6.21, -6.25 | Augustin_far/concrete_white + Augustin_far/concrete_white | 13.43 | 72 | 90 |
| 23.38, 6.36, 8.30 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 27.17 | 72 | 90 |
| -16.23, 13.24, 7.72 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 16.38 | 69 | 90 |
| 16.16, 13.24, -6.48 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 18.22 | 61 | 90 |
| -6.45, 13.24, -16.43 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 16.38 | 54 | 89.9 |
| -0.97, 50.31, -0.38 | Augustin_far/concrete_white + Augustin_far/concrete_white | 8 | 46 | 90 |
| 23.26, 6.36, -4.29 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 6.83 | 45 | 90 |
| 2.48, 47.87, -1.71 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 1.86 | 44 | 90 |
| -1.98, 47.87, -1.92 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 1.86 | 43 | 90 |
| 4.80, 6.21, 21.49 | Augustin_far/concrete_white + Augustin_far/concrete_white | 18.28 | 36 | 90 |
| 3.83, 6.21, -23.05 | Augustin_far/concrete_white + Augustin_far/concrete_white | 18.28 | 36 | 90 |
| -18.03, 17.60, -5.45 | Augustin_far/concrete_white + Augustin_far/concrete_white | 29.16 | 33 | 90 |
| -20.77, 6.21, -4.65 | Augustin_far/concrete_white + Augustin_far/concrete_white | 14.54 | 33 | 90 |
| -0.23, 50.59, -0.38 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.43 | 32 | 90 |
| 7.23, 17.60, -5.71 | Augustin_far/concrete_white + Augustin_far/concrete_white | 37.98 | 28 | 90 |
| 1.95, 47.87, 1.92 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 1.86 | 27 | 90 |
| -6.34, 20.25, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 50.96 | 26 | 90 |
| -2.48, 47.87, 1.41 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 1.86 | 26 | 90 |
| 17.92, 8.80, -5.71 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 2.54 | 24 | 90 |
| -6.37, 17.61, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 9.56 | 23 | 90 |
| -5.56, 38.91, -1.68 | Augustin_far/concrete_white + Augustin_far/concrete_white | 5.14 | 23 | 90 |
| -8.82, 17.75, -6.07 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 36.4 | 22 | 90 |
| -19.35, 6.36, -5.15 | Augustin_far/concrete_white + Augustin_far/roof_bitumen | 18.44 | 22 | 90 |
| -18.50, 6.66, -4.00 | Augustin_far/concrete_white + Augustin_far/concrete_white | 22.78 | 20 | 90 |
| -18.50, 6.63, -1.20 | Augustin_far/concrete_white + Augustin_far/concrete_white | 22.78 | 20 | 90 |
| -18.50, 6.60, 2.00 | Augustin_far/concrete_white + Augustin_far/concrete_white | 22.78 | 20 | 90 |
| -18.50, 6.53, 4.70 | Augustin_far/concrete_white + Augustin_far/concrete_white | 22.78 | 20 | 90 |
| -10.29, 16.50, 6.07 | Augustin_far/concrete_white + Augustin_far/concrete_white | 3.44 | 20 | 90 |

(253 more in the JSON)

## opening (info, 378)

| at | part | facing | edge_m |
|---|---|---|---|
| -18.50, 18.00, -4.00 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, -4.70 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, -4.17 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.46 |
| -18.50, 18.00, -1.20 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, -2.00 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, -1.37 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.56 |
| -18.50, 18.00, 2.00 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, 1.20 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, 1.83 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.56 |
| -18.50, 18.00, 4.70 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, 4.00 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, 4.53 | Augustin_far/concrete_white | 1 + 0 + 0 | 0.46 |
| -4.00, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| -4.70, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| -4.17, 17.15, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.46 |
| -1.20, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| -2.00, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| -1.37, 17.15, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.56 |
| 2.00, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| 1.20, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| 1.83, 17.15, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.56 |
| 4.70, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| 4.00, 17.10, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.301 |
| 4.53, 17.15, 18.86 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.46 |
| 4.00, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| 4.70, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| 4.17, 17.15, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.46 |
| 1.20, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| 2.00, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| 1.37, 17.15, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.56 |
| -2.00, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| -1.20, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| -1.83, 17.15, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.56 |
| -4.70, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| -4.00, 17.10, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.301 |
| -4.53, 17.15, -18.86 | Augustin_far/concrete_white | 0 + 0 + 1 | 0.46 |
| 6.37, 13.39, -6.37 | Augustin_far/concrete_white | 0 + 0 + -1 | 3.189 |
| 6.37, 16.48, -6.37 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.42 |
| 6.37, 16.90, -6.37 | Augustin_far/concrete_white | 0 + 0 + -1 | 0.9 |
| 6.37, 13.39, 6.37 | Augustin_far/concrete_white | 0 + 0 + 1 | 3.189 |

(338 more in the JSON)

## backtoback (info, 321)

| at | parts | area |
|---|---|---|
| -5.54, 16.79, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0096 |
| -5.53, 16.72, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00236 |
| -5.55, 16.88, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00332 |
| -5.54, 16.94, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00716 |
| -5.23, 16.88, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0088 |
| -5.39, 16.91, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.02765 |
| -5.30, 16.89, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00281 |
| 5.41, 16.85, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00069 |
| 5.27, 16.86, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00299 |
| 5.39, 16.92, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.02696 |
| 5.25, 16.91, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00862 |
| 5.53, 16.71, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00126 |
| 5.54, 16.78, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00805 |
| 5.53, 16.73, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0011 |
| 5.55, 16.84, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00155 |
| 5.54, 16.91, -6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.01048 |
| 6.37, 17.69, -5.75 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00968 |
| 6.37, 17.62, -5.74 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00236 |
| 6.37, 17.82, -5.76 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0083 |
| 6.37, 17.84, -5.72 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0021 |
| 6.37, 17.78, -5.44 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00867 |
| 6.37, 17.82, -5.60 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.02753 |
| 6.37, 17.79, -5.51 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00277 |
| 6.37, 17.76, 5.61 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0026 |
| 6.37, 17.77, 5.47 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00785 |
| 6.37, 17.82, 5.59 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.02493 |
| 6.37, 17.83, 5.45 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00359 |
| 6.37, 17.61, 5.72 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00056 |
| 6.37, 17.68, 5.71 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00068 |
| 6.37, 17.64, 5.72 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00041 |
| 6.37, 17.61, 5.75 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00071 |
| 6.37, 17.69, 5.75 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00899 |
| 6.37, 17.62, 5.75 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00069 |
| 6.37, 17.82, 5.75 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0104 |
| 5.54, 16.79, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.0096 |
| 5.53, 16.72, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00236 |
| 5.55, 16.88, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00332 |
| 5.54, 16.94, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00716 |
| -5.41, 16.85, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00069 |
| -5.27, 16.86, 6.37 | Augustin_far/concrete_white + Augustin_far/concrete_white | 0.00299 |

(281 more in the JSON)


Nodes: Augustin_far. Distances: {"Augustin_far":670}. Quantum 0.417 mm. Offset 0,0,0.
