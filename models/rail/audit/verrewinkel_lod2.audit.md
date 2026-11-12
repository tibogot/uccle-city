# Mesh audit: verrewinkel LOD2 ({"drop":["painted_metal_grey","wood_frame_dark","glass_window","wire_mesh_grey"],"simplify":{"*":0.06},"prune":true,"until":2000})

5,725 triangles, 4,341 welded vertices, 3,379 open edges, 289,184 rays, 2660 ms.

**534 blocking**, 792 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 26 |
| depth | block | 6 |
| crossing | block | 13 |
| leak | block | 489 |
| sliver | warn | 487 |
| winding | warn | 32 |
| nonmanifold | warn | 229 |
| tjunction | warn | 44 |
| seam | info | 719 |
| opening | info | 189 |
| backtoback | info | 335 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 26)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -11.90, 6.08, -2.57 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 99.5 | 3.2 | 2000 | 15.26 | false | -0.03 + -0.18 + -0.98 |
| 9.89, 7.13, -2.56 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 173.8 | 4.1 | 2000 | 15.26 | false | -0.03 + -0.18 + -0.98 |
| 15.96, 9.36, -2.40 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 34.7 | 3.9 | 2000 | 15.26 | false | 0.99 + 0.13 + 0.03 |
| 19.23, 9.47, -3.07 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 29.4 | 3.4 | 2000 | 15.26 | false | 0.95 + 0.06 + -0.29 |
| 1.21, 8.63, 2.38 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01 | 32.9 | 3 | 2000 | 15.26 | false | 0.99 + 0.15 + 0.02 |
| -6.16, 8.17, -2.50 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 104.9 | 2.8 | 2000 | 15.26 | false | 0.99 + 0.07 + -0.07 |
| -19.20, 7.49, 3.15 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 30.3 | 4.8 | 2000 | 15.26 | false | -0.93 + 0.04 + 0.36 |
| 4.90, 8.80, 2.13 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 36.2 | 4.5 | 2000 | 15.26 | false | 0.98 + 0.18 + -0.04 |
| 8.58, 8.98, 2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0 | 21.5 | 4 | 2000 | 15.26 | false | 0.99 + 0.15 + -0.02 |
| 1.23, 8.56, -2.52 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 48.9 | 0 | 2000 | 15.26 | true | 0.72 + 0.22 + -0.66 |
| 7.37, 8.82, -2.56 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 25.9 | 0 | 2000 | 15.26 | true | 0.53 + 0.02 + -0.85 |
| 11.06, 9.06, -2.48 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 139.6 | 0 | 2000 | 15.26 | true | 0.96 + 0.14 + -0.25 |
| -9.83, 7.97, 2.56 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 19.1 | 3 | 2000 | 15.26 | true | 0 + -0.11 + 0.99 |
| 11.06, 9.01, 2.55 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 25 | 2.6 | 2000 | 15.26 | true | -0.01 + 0.04 + 1 |
| 11.06, 9.00, 2.04 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 25.9 | 0 | 2000 | 15.26 | true | 0.53 + 0.02 + -0.85 |
| 12.29, 9.12, 2.08 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 31 | 2.3 | 2000 | 15.26 | true | -0.02 + 0.23 + -0.97 |
| -12.29, 7.86, -2.57 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 19.1 | 3 | 2000 | 15.26 | true | 0 + -0.06 + -1 |
| -11.06, 7.93, -2.04 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 24.2 | 3.4 | 2000 | 15.26 | true | 0.56 + -0.02 + 0.82 |
| -9.83, 8.00, -2.06 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 37.1 | 0 | 2000 | 15.26 | true | -0.66 + 0.13 + 0.74 |
| -2.46, 8.43, -2.15 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 168.5 | 0.7 | 2000 | 15.26 | true | 0.97 + 0.14 + 0.21 |
| 4.91, 8.74, -2.54 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 33.4 | 2.6 | 2000 | 15.26 | true | 0.67 + 0.09 + -0.74 |
| 18.17, 9.38, -2.83 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 65.2 | 0 | 2000 | 15.26 | true | 0.69 + 0.13 + -0.71 |
| -6.14, 8.18, 2.53 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 68.2 | 0 | 2000 | 15.26 | true | 0.91 + 0.09 + 0.39 |
| -3.69, 8.35, 2.10 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 82.1 | 1.3 | 2000 | 15.26 | false | 0.92 + 0.15 + -0.38 |
| -1.23, 8.42, 2.54 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 36.6 | 0 | 2000 | 15.26 | true | 0.65 + 0.13 + 0.75 |
| 13.51, 9.11, 2.03 | verrewinkel/stone_blue + verrewinkel/stone_blue | 0 | 19.1 | 0 | 2000 | 15.26 | true | 0 + -0.06 + -1 |

## depth (block, 6)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.17, 6.61, -2.54 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 1.45 | 7.5 | 4.8 | 2000 | 15.26 | false | -1 + 0.06 + -0.06 |
| 13.50, 9.20, 2.43 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 2.47 | 70.8 | 4.1 | 2000 | 15.26 | false | 0.99 + 0.07 + 0.07 |
| -16.10, 5.80, -2.53 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 2.33 | 1 | 4.8 | 2000 | 15.26 | false | -1 + 0.06 + -0.06 |
| 10.12, 7.12, -2.54 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 1.34 | 8.5 | 4.8 | 2000 | 15.26 | false | 1 + 0.06 + -0.06 |
| -13.76, 5.95, 2.54 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 1.34 | 8.5 | 4.8 | 2000 | 15.26 | false | 1 + 0.06 + 0.06 |
| -6.16, 8.26, -2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 1.49 | 35.2 | 4.9 | 2000 | 15.26 | false | 0.99 + 0.09 + 0.08 |

## crossing (block, 13)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -12.08, 5.99, -2.55 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 8.2 | 5 |
| -4.93, 8.34, 2.28 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 8 | 0 |
| -1.21, 8.50, 2.44 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 10.5 | 0 |
| 19.22, 9.48, 3.08 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 6 | 3.4 |
| -0.00, 8.46, 2.54 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 11.3 | 2.6 |
| -0.13, 6.61, 2.56 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 10.9 | 8.3 |
| -19.24, 7.62, -3.04 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 8.7 | 5.1 |
| -19.24, 7.64, -3.01 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 8.7 | 0.7 |
| 2.44, 8.71, -2.22 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 9.5 | 0 |
| 6.13, 8.81, -2.53 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 10.9 | 2.1 |
| -19.18, 7.55, -3.17 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 10.1 | 0.1 |
| -6.16, 8.30, -2.28 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 7.5 | 0 |
| 7.36, 8.95, -2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 8.6 | 0 |

## leak (block, 489)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| -16.18, 5.91, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -14.18, 6.00, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -12.19, 6.10, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -10.21, 6.20, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -8.21, 6.29, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -6.23, 6.39, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -4.23, 6.49, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -2.24, 6.58, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -0.26, 6.69, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 1.73, 6.78, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 3.73, 6.88, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 5.72, 6.97, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 7.71, 7.07, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 9.70, 7.17, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 11.68, 7.27, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 13.68, 7.36, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| 15.66, 7.46, -2.56 | verrewinkel/brick_red_brussels | 12 | -0.69 + -0.72 + 0 | 0.239 |
| -13.68, 6.03, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| -11.69, 6.12, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| -9.70, 6.22, 2.56 | verrewinkel/brick_red_brussels | 30 | 0.72 + -0.69 + 0 | 0.239 |
| -7.71, 6.32, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| -3.72, 6.52, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| 0.26, 6.71, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| 2.25, 6.81, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| 10.21, 7.20, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| 12.19, 7.29, 2.56 | verrewinkel/brick_red_brussels | 30 | 0.72 + -0.69 + 0 | 0.239 |
| 14.19, 7.39, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| 16.18, 7.49, 2.56 | verrewinkel/brick_red_brussels | 12 | 0.72 + -0.69 + 0 | 0.239 |
| -13.76, 5.97, -2.56 | verrewinkel/brick_red_brussels | 30 | 1 + 0.06 + -0.06 | 0.15 |
| -0.17, 6.64, -2.56 | verrewinkel/brick_red_brussels | 12 | -1 + 0.06 + -0.06 | 0.151 |
| 6.14, 6.91, -2.56 | verrewinkel/brick_red_brussels | 4 | 1 + 0 + 0 | 0.143 |
| 12.11, 7.21, -2.55 | verrewinkel/brick_red_brussels | 30 | 1 + 0.07 + -0.07 | 0.135 |
| 15.75, 7.38, -2.55 | verrewinkel/brick_red_brussels | 12 | -1 + 0.07 + -0.07 | 0.137 |
| -16.00, 7.58, 2.03 | verrewinkel/brick_red_brussels | 30 | 0.04 + -0.76 + -0.65 | 1.29 |
| -19.05, 7.42, -3.13 | verrewinkel/brick_red_brussels | 4 | 0.12 + -0.96 + -0.27 | 1.055 |
| -18.30, 7.54, -2.35 | verrewinkel/brick_red_brussels | 12 | -0.6 + 0.05 + 0.8 | 0.122 |
| -14.67, 7.64, -2.57 | verrewinkel/brick_red_brussels | 30 | 0.04 + -0.76 + -0.65 | 1.19 |
| -12.14, 7.77, -2.04 | verrewinkel/brick_red_brussels | 4 | 0.04 + -0.97 + 0.24 | 1.25 |
| -9.82, 7.88, -2.04 | verrewinkel/brick_red_brussels | 12 | -0.1 + -0.98 + 0.17 | 0.027 |
| -9.80, 7.88, -2.57 | verrewinkel/brick_red_brussels | 30 | 0.04 + -0.76 + -0.65 | 1.27 |

(449 more in the JSON)

## sliver (warn, 487)

| at | part | aspect | longest |
|---|---|---|---|
| 5.73, 8.13, -2.10 | verrewinkel/brick_red_brussels | 45 | 34.487 |
| -5.73, 7.55, 2.10 | verrewinkel/brick_red_brussels | 43 | 34.441 |
| -17.12, 0.98, -2.43 | verrewinkel/brick_red_brussels | 97 | 7.729 |
| 17.12, 4.63, -2.43 | verrewinkel/brick_red_brussels | 95 | 9.406 |
| -5.73, 8.07, -2.23 | verrewinkel/brick_red_brussels | 86 | 34.444 |
| -19.51, 7.14, -2.80 | verrewinkel/brick_red_brussels | 44 | 1.258 |
| 19.84, 9.02, -2.90 | verrewinkel/brick_red_brussels | 46 | 0.899 |
| -17.11, 3.59, 2.43 | verrewinkel/brick_red_brussels | 69 | 7.83 |
| 17.12, 1.50, 2.43 | verrewinkel/brick_red_brussels | 116 | 9.297 |
| -5.73, 8.07, 2.37 | verrewinkel/brick_red_brussels | 86 | 34.442 |
| -19.94, 7.97, -2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.94, 7.86, -3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.22, 7.86, -2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.22, 7.97, -3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.94, 7.97, 3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.94, 7.86, 2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.22, 7.86, 3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.22, 7.97, 2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.22, 9.88, -2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.22, 9.77, -3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.94, 9.77, -2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.94, 9.88, -3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.22, 9.88, 3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.22, 9.77, 2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.94, 9.77, 3.14 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.94, 9.88, 2.90 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 9.86, 7.18, 2.62 | verrewinkel/brick_red_brussels | 42 | 0.508 |
| -19.70, 7.86, -2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.46, 7.97, -2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.70, 7.97, -3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.46, 7.86, -3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.70, 7.86, 3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.46, 7.97, 3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.70, 7.97, 2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| -19.46, 7.86, 2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.46, 9.77, -2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.70, 9.88, -2.66 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.46, 9.88, -3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.70, 9.77, -3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |
| 19.46, 9.77, 3.38 | verrewinkel/brick_red_brussels | 42 | 0.716 |

(447 more in the JSON)

## winding (warn, 32)

| at | part |
|---|---|
| -13.53, 7.90, -2.44 | verrewinkel/stone_blue |
| 8.58, 8.97, -2.13 | verrewinkel/stone_blue |
| 9.81, 9.05, -2.21 | verrewinkel/stone_blue |
| 13.51, 9.14, -2.52 | verrewinkel/stone_blue |
| 14.73, 9.18, -2.54 | verrewinkel/stone_blue |
| -13.53, 7.89, 2.20 | verrewinkel/stone_blue |
| -9.84, 8.07, 2.20 | verrewinkel/stone_blue |
| 2.45, 8.61, 2.14 | verrewinkel/stone_blue |
| 4.91, 8.70, 2.54 | verrewinkel/stone_blue |
| 12.28, 9.09, 2.46 | verrewinkel/stone_blue |
| 13.51, 9.15, 2.49 | verrewinkel/stone_blue |
| 14.73, 9.18, 2.54 | verrewinkel/stone_blue |
| 15.96, 9.27, 2.11 | verrewinkel/stone_blue |
| -14.76, 7.83, -2.40 | verrewinkel/stone_blue |
| -7.38, 8.10, -2.54 | verrewinkel/stone_blue |
| -6.16, 8.25, -2.40 | verrewinkel/stone_blue |
| -4.93, 8.31, -2.40 | verrewinkel/stone_blue |
| -4.92, 8.25, -2.14 | verrewinkel/stone_blue |
| -2.46, 8.32, -2.56 | verrewinkel/stone_blue |
| 2.45, 8.61, -2.49 | verrewinkel/stone_blue |
| -18.22, 7.66, 2.72 | verrewinkel/stone_blue |
| -15.99, 7.77, 2.40 | verrewinkel/stone_blue |
| -12.30, 7.95, 2.38 | verrewinkel/stone_blue |
| -7.39, 8.19, 2.38 | verrewinkel/stone_blue |
| -6.15, 8.16, 2.06 | verrewinkel/stone_blue |
| -4.92, 8.21, 2.04 | verrewinkel/stone_blue |
| -4.93, 8.33, 2.24 | verrewinkel/stone_blue |
| -3.70, 8.40, 2.25 | verrewinkel/stone_blue |
| -0.01, 8.48, 2.08 | verrewinkel/stone_blue |
| -0.02, 8.60, 2.27 | verrewinkel/stone_blue |
| 1.21, 8.62, 2.44 | verrewinkel/stone_blue |
| 8.58, 8.98, 2.34 | verrewinkel/stone_blue |

## nonmanifold (warn, 229)

| at | part | uses |
|---|---|---|
| -17.24, 7.52, -2.02 | verrewinkel/brick_red_brussels | 3 |
| 17.24, 9.20, -2.02 | verrewinkel/brick_red_brussels | 3 |
| 17.16, 9.20, -2.58 | verrewinkel/brick_red_brussels | 3 |
| -17.16, 7.52, -2.58 | verrewinkel/brick_red_brussels | 3 |
| -1.23, 8.49, -2.40 | verrewinkel/brick_red_brussels | 4 |
| -17.24, 7.52, 2.02 | verrewinkel/brick_red_brussels | 3 |
| 17.24, 9.20, 2.02 | verrewinkel/brick_red_brussels | 3 |
| -17.16, 7.52, 2.58 | verrewinkel/brick_red_brussels | 3 |
| 17.16, 9.20, 2.58 | verrewinkel/brick_red_brussels | 3 |
| 18.21, 9.47, 2.74 | verrewinkel/brick_red_brussels | 3 |
| -19.30, 8.06, -3.02 | verrewinkel/brick_red_brussels | 3 |
| -19.30, 8.06, 3.02 | verrewinkel/brick_red_brussels | 3 |
| 19.30, 9.94, -3.02 | verrewinkel/brick_red_brussels | 4 |
| 19.86, 9.90, -3.02 | verrewinkel/brick_red_brussels | 3 |
| 19.30, 9.90, 3.02 | verrewinkel/brick_red_brussels | 3 |
| 19.86, 9.90, 3.02 | verrewinkel/brick_red_brussels | 3 |
| 19.58, 9.94, -2.74 | verrewinkel/brick_red_brussels | 4 |
| 19.58, 9.97, 3.30 | verrewinkel/brick_red_brussels | 3 |
| -17.20, 7.52, -2.30 | verrewinkel/stone_blue | 3 |
| -17.24, 7.59, -2.02 | verrewinkel/stone_blue | 3 |
| -15.97, 7.58, -2.30 | verrewinkel/stone_blue | 3 |
| -14.74, 7.64, -2.30 | verrewinkel/stone_blue | 3 |
| -13.51, 7.89, -2.13 | verrewinkel/stone_blue | 3 |
| -13.51, 7.96, -2.27 | verrewinkel/stone_blue | 3 |
| -13.51, 7.70, -2.30 | verrewinkel/stone_blue | 3 |
| -12.29, 7.95, -2.40 | verrewinkel/stone_blue | 3 |
| -12.29, 7.89, -2.57 | verrewinkel/stone_blue | 3 |
| -12.29, 7.89, -2.14 | verrewinkel/stone_blue | 3 |
| -12.29, 7.76, -2.30 | verrewinkel/stone_blue | 3 |
| -11.06, 7.97, -2.04 | verrewinkel/stone_blue | 3 |
| -11.06, 7.82, -2.30 | verrewinkel/stone_blue | 3 |
| -9.83, 8.06, -2.07 | verrewinkel/stone_blue | 3 |
| -9.83, 7.88, -2.30 | verrewinkel/stone_blue | 3 |
| -9.83, 8.07, -2.40 | verrewinkel/stone_blue | 3 |
| -8.60, 8.13, -2.38 | verrewinkel/stone_blue | 3 |
| -8.60, 7.94, -2.30 | verrewinkel/stone_blue | 3 |
| -7.37, 8.23, -2.22 | verrewinkel/stone_blue | 3 |
| -7.37, 8.00, -2.30 | verrewinkel/stone_blue | 3 |
| -6.15, 8.19, -2.14 | verrewinkel/stone_blue | 3 |
| -6.14, 8.06, -2.30 | verrewinkel/stone_blue | 3 |

(189 more in the JSON)

## tjunction (warn, 44)

| at | part | edge_m |
|---|---|---|
| -19.85, 6.46, -2.90 | verrewinkel/brick_red_brussels | 6.6 |
| -19.85, 6.49, -2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.43, -2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.53, 2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.40, -2.90 | verrewinkel/brick_red_brussels | 6.6 |
| -19.85, 6.46, -3.30 | verrewinkel/brick_red_brussels | 8.97 |
| 19.85, 8.40, -3.30 | verrewinkel/brick_red_brussels | 10.91 |
| 19.85, 8.40, 3.30 | verrewinkel/brick_red_brussels | 10.91 |
| -19.85, 6.46, 3.30 | verrewinkel/brick_red_brussels | 8.97 |
| -16.09, 5.90, 2.38 | verrewinkel/stone_blue | 0.497 |
| -14.10, 6.00, 2.38 | verrewinkel/stone_blue | 0.497 |
| -12.11, 6.10, 2.38 | verrewinkel/stone_blue | 0.497 |
| -10.12, 6.20, 2.38 | verrewinkel/stone_blue | 0.497 |
| -8.13, 6.29, 2.38 | verrewinkel/stone_blue | 0.497 |
| -6.14, 6.39, 2.38 | verrewinkel/stone_blue | 0.497 |
| -4.15, 6.49, 2.38 | verrewinkel/stone_blue | 0.497 |
| -2.16, 6.58, 2.38 | verrewinkel/stone_blue | 0.497 |
| -0.17, 6.68, 2.38 | verrewinkel/stone_blue | 0.497 |
| 1.82, 6.78, 2.38 | verrewinkel/stone_blue | 0.497 |
| 3.81, 6.88, 2.38 | verrewinkel/stone_blue | 0.497 |
| 5.80, 6.97, 2.38 | verrewinkel/stone_blue | 0.497 |
| 7.79, 7.07, 2.38 | verrewinkel/stone_blue | 0.497 |
| 9.78, 7.17, 2.38 | verrewinkel/stone_blue | 0.497 |
| 11.77, 7.26, 2.38 | verrewinkel/stone_blue | 0.497 |
| 13.76, 7.36, 2.38 | verrewinkel/stone_blue | 0.497 |
| 15.75, 7.46, 2.38 | verrewinkel/stone_blue | 0.497 |
| -16.09, 5.90, -2.38 | verrewinkel/stone_blue | 0.497 |
| -14.10, 6.00, -2.38 | verrewinkel/stone_blue | 0.497 |
| -12.11, 6.10, -2.38 | verrewinkel/stone_blue | 0.497 |
| -10.12, 6.20, -2.38 | verrewinkel/stone_blue | 0.497 |
| -8.13, 6.29, -2.38 | verrewinkel/stone_blue | 0.497 |
| -6.14, 6.39, -2.38 | verrewinkel/stone_blue | 0.497 |
| -4.15, 6.49, -2.38 | verrewinkel/stone_blue | 0.497 |
| -2.16, 6.58, -2.38 | verrewinkel/stone_blue | 0.497 |
| -0.17, 6.68, -2.38 | verrewinkel/stone_blue | 0.497 |
| 1.82, 6.78, -2.38 | verrewinkel/stone_blue | 0.497 |
| 3.81, 6.88, -2.38 | verrewinkel/stone_blue | 0.497 |
| 5.80, 6.97, -2.38 | verrewinkel/stone_blue | 0.497 |
| 7.79, 7.07, -2.38 | verrewinkel/stone_blue | 0.497 |
| 9.78, 7.17, -2.38 | verrewinkel/stone_blue | 0.497 |

(4 more in the JSON)

## seam (info, 719)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -6.55, 0.85, 5.52 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.86 | 16 | 67.8 |
| 1.22, 8.49, 2.56 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.39 | 15 | 15 |
| -4.82, 6.13, 3.85 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.86 | 15 | 66.1 |
| 5.96, 1.88, 5.56 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 15 | 66 |
| 6.32, 1.88, 5.88 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.83 | 15 | 66.8 |
| -6.19, 0.85, 5.47 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 15 | 68 |
| -7.74, 5.98, 3.81 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.82 | 14 | 69.9 |
| -7.91, 5.97, 7.53 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.84 | 14 | 69.2 |
| -6.54, 0.85, 5.94 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 14 | 67.4 |
| -6.19, 0.85, 5.93 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.83 | 14 | 68 |
| 5.95, 1.88, 6.00 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 14 | 66 |
| 4.59, 6.58, 7.63 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 14 | 67.8 |
| -19.33, 7.42, 2.71 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 0.14 | 13 | 31.2 |
| 0.01, 8.42, 2.04 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.34 | 13 | 14.7 |
| -7.36, 8.24, -2.38 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.65 | 13 | 17.1 |
| 15.98, 9.24, -2.55 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.49 | 13 | 22.9 |
| 4.59, 6.58, 3.89 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 13 | 67.5 |
| 7.81, 6.74, 3.80 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 13 | 64.8 |
| 7.68, 6.74, 7.46 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.86 | 13 | 64.7 |
| 6.51, 1.88, 5.45 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.85 | 13 | 66.9 |
| 19.27, 9.30, -2.90 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 0.22 | 12 | 18.5 |
| 19.28, 9.31, 2.88 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 0.2 | 12 | 19.4 |
| -19.33, 7.42, -2.71 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 0.26 | 12 | 15.7 |
| -4.83, 6.12, 7.50 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.84 | 12 | 66.3 |
| 19.28, 8.59, 2.73 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 12.66 | 11 | 73.2 |
| -19.27, 6.44, -3.13 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 10.81 | 11 | 74.3 |
| -18.20, 7.72, -2.68 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.16 | 11 | 14.8 |
| 19.35, 7.30, 3.32 | verrewinkel/brick_red_brussels + verrewinkel_foot/concrete | 2.42 | 10 | 87.1 |
| 19.32, 8.15, 3.32 | verrewinkel/brick_red_brussels + verrewinkel_foot/resin_terracotta | 2.42 | 10 | 87.1 |
| -18.32, 7.54, 2.36 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.25 | 10 | 19 |
| -3.70, 8.38, 2.13 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.09 | 10 | 21.5 |
| 17.40, 7.25, 2.56 | verrewinkel/brick_red_brussels + verrewinkel_foot/concrete | 6.83 | 9 | 16.7 |
| 12.29, 9.08, -2.55 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.29 | 9 | 43.6 |
| -4.93, 8.34, 2.28 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.25 | 9 | 27.5 |
| 8.59, 8.89, -2.07 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.36 | 9 | 35.6 |
| 18.30, 9.32, 2.36 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.41 | 9 | 17.5 |
| -14.74, 7.71, 2.03 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.11 | 9 | 14.9 |
| -19.28, 6.45, 3.13 | verrewinkel/brick_red_brussels + verrewinkel/brick_red_brussels | 10.78 | 8 | 73.2 |
| -19.80, 5.39, 3.33 | verrewinkel/brick_red_brussels + verrewinkel_foot/concrete | 2.43 | 8 | 87.1 |
| -19.83, 6.24, 3.33 | verrewinkel/brick_red_brussels + verrewinkel_foot/resin_terracotta | 2.43 | 8 | 87.1 |

(679 more in the JSON)

## opening (info, 189)

| at | part | facing | edge_m |
|---|---|---|---|
| -15.75, 5.85, -2.55 | verrewinkel/brick_red_brussels | 1 + 0.07 + -0.07 | 0.135 |
| -11.77, 6.07, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.16 |
| -9.78, 6.14, -2.57 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.124 |
| -10.12, 6.12, -2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.143 |
| -8.13, 6.25, -2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.16 |
| -7.79, 6.26, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.16 |
| -3.81, 6.46, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.16 |
| -1.82, 6.55, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.16 |
| -2.16, 6.54, -2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.16 |
| 0.17, 6.62, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.143 |
| 3.81, 6.83, -2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.16 |
| 4.15, 6.81, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.143 |
| 11.77, 7.19, -2.57 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.124 |
| 14.10, 7.30, -2.56 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.143 |
| -16.09, 5.79, 2.54 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.152 |
| -3.80, 6.39, 2.52 | verrewinkel/brick_red_brussels | 1 + 0.06 + 0.06 | 0.156 |
| -14.10, 5.92, -2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.143 |
| 7.79, 7.00, -2.55 | verrewinkel/brick_red_brussels | -1 + 0.07 + -0.07 | 0.137 |
| -12.11, 5.99, 2.54 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.152 |
| -8.13, 6.23, 2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.134 |
| 2.16, 6.67, 2.53 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.16 |
| 4.15, 6.78, 2.54 | verrewinkel/brick_red_brussels | 1 + 0 + 0 | 0.152 |
| 5.80, 6.86, 2.54 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.152 |
| 7.79, 7.03, 2.56 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.152 |
| 9.78, 7.05, 2.53 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.166 |
| 13.76, 7.25, 2.53 | verrewinkel/brick_red_brussels | -1 + 0 + 0 | 0.166 |
| 2.44, 8.63, 2.07 | verrewinkel/brick_red_brussels | 0.33 + 0.28 + -0.9 | 0.202 |
| -15.74, 5.81, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| -13.75, 5.90, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| -11.76, 6.00, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| -9.77, 6.10, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| -5.79, 6.36, -2.52 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| -2.17, 6.45, -2.50 | verrewinkel/stone_blue | -1 + 0 + 0 | 0.167 |
| 0.18, 6.58, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| 6.15, 6.88, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| 7.78, 6.92, -2.44 | verrewinkel/stone_blue | -1 + 0 + 0 | 0.13 |
| 9.77, 7.02, -2.44 | verrewinkel/stone_blue | -1 + 0 + 0 | 0.13 |
| 12.12, 7.17, -2.43 | verrewinkel/stone_blue | 1 + 0 + 0 | 0.232 |
| 13.75, 7.23, -2.50 | verrewinkel/stone_blue | -1 + 0 + 0 | 0.167 |
| -16.10, 5.79, 2.43 | verrewinkel/stone_blue | -1 + 0 + 0 | 0.232 |

(149 more in the JSON)

## backtoback (info, 335)

| at | parts | area |
|---|---|---|
| -16.02, 6.08, -2.46 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01625 |
| -16.93, 7.52, -2.30 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.25898 |
| -16.26, 7.56, -2.30 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.22192 |
| -15.65, 7.58, -2.29 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.2436 |
| -15.04, 7.62, -2.29 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.22263 |
| -14.42, 7.65, -2.29 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.2409 |
| -13.80, 7.68, -2.28 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.20774 |
| -13.18, 7.71, -2.28 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.2377 |
| -12.56, 7.74, -2.27 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.19334 |
| -11.94, 7.77, -2.27 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.23401 |
| -11.33, 7.80, -2.27 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.17944 |
| -10.71, 7.83, -2.26 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.2298 |
| -10.09, 7.86, -2.26 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.16605 |
| -9.47, 7.89, -2.26 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.22509 |
| -8.85, 7.92, -2.25 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.15317 |
| -8.23, 7.95, -2.25 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.21987 |
| -7.62, 7.98, -2.25 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.14079 |
| -6.99, 8.01, -2.24 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.21414 |
| -6.38, 8.04, -2.24 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.12893 |
| -5.75, 8.07, -2.23 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.20791 |
| -5.14, 8.10, -2.23 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.11757 |
| -4.52, 8.13, -2.23 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.20116 |
| -3.90, 8.16, -2.22 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.10672 |
| -3.28, 8.19, -2.22 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.19391 |
| -2.67, 8.22, -2.22 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.09638 |
| -2.04, 8.26, -2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.18615 |
| -1.43, 8.29, -2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.08655 |
| -0.81, 8.31, -2.21 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.17788 |
| -0.19, 8.35, -2.20 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.07723 |
| 0.43, 8.38, -2.20 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.1691 |
| 1.05, 8.41, -2.19 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.06841 |
| 1.67, 8.44, -2.19 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.15981 |
| 2.28, 8.47, -2.19 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.06011 |
| 2.91, 8.50, -2.18 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.15001 |
| 3.52, 8.53, -2.18 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.05231 |
| 4.14, 8.56, -2.18 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.13971 |
| 4.76, 8.59, -2.17 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.04502 |
| 5.38, 8.62, -2.17 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.1289 |
| 6.00, 8.65, -2.17 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.03824 |
| 6.62, 8.68, -2.16 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.11757 |

(295 more in the JSON)
