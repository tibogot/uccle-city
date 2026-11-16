# Mesh audit (packed): papenkasteel.lod2

4,877 triangles, 3,972 welded vertices, 1,603 open edges, 623,104 rays, 2358 ms.

**27 blocking**, 127 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 7 |
| depth | block | 7 |
| leak | block | 13 |
| sliver | warn | 89 |
| nonmanifold | warn | 1 |
| tjunction | warn | 37 |
| seam | info | 599 |
| opening | info | 430 |
| backtoback | info | 370 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 7)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 4.53, 51.30, 1.31 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 685.2 | 1 | 2000 | 15.52 | false | 0 + -0.02 + 1 |
| 8.96, 55.45, -3.86 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 633.5 | 1.1 | 2000 | 15.52 | false | 1 + -0.02 + 0 |
| 5.99, 51.06, 3.61 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 445.2 | 1.6 | 2000 | 15.52 | false | -1 + -0.03 + 0 |
| 11.94, 51.06, -7.21 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 445.3 | 1.6 | 2000 | 15.52 | false | 1 + -0.03 + 0 |
| 11.94, 51.03, -7.17 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 133.1 | 1.6 | 2000 | 15.52 | false | 1 + -0.03 + 0 |
| -11.44, 51.64, 18.57 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 115.7 | 1.8 | 2000 | 15.52 | false | 1 + 0.03 + 0 |
| -11.44, 51.61, 18.61 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0 | 386.8 | 1.8 | 2000 | 15.52 | false | 1 + 0.03 + 0 |

## depth (block, 7)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 4.55, 52.57, 1.33 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 2.47 | 205.2 | 1 | 2000 | 15.52 | false | 0 + -0.02 + 1 |
| 8.98, 56.62, -3.88 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 2.68 | 189.7 | 1.1 | 2000 | 15.52 | false | 1 + -0.02 + 0 |
| 5.97, 51.89, 3.63 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 2.44 | 133 | 1.6 | 2000 | 15.52 | false | -1 + -0.03 + 0 |
| 11.96, 51.89, -7.23 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 2.69 | 133 | 1.6 | 2000 | 15.52 | false | 1 + -0.03 + 0 |
| 11.96, 51.86, -7.19 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0.86 | 445 | 1.6 | 2000 | 15.52 | false | 1 + -0.03 + 0 |
| -11.42, 50.91, 18.59 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 0.65 | 386.7 | 1.8 | 2000 | 15.52 | false | 1 + 0.03 + 0 |
| -11.42, 50.88, 18.63 | Papenkasteel_lod2/wood_frame_white + Papenkasteel_lod2/glass_window | 2.44 | 115.8 | 1.8 | 2000 | 15.52 | false | 1 + 0.03 + 0 |

## leak (block, 13)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 3.72, 60.99, 0.55 | Papenkasteel_lod2/render_white | 12 | 0 + 0 + 1 | 0.55 |
| -5.55, 60.59, -8.25 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.286 |
| -6.15, 61.07, -8.25 | Papenkasteel_lod2/render_white | 12 | 0 + 0 + -1 | 0.55 |
| 4.04, 60.59, -8.25 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.286 |
| -2.93, 57.09, 22.40 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.281 |
| 1.87, 57.09, 22.40 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.281 |
| 6.07, 57.09, 22.40 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.281 |
| 5.50, 57.53, 22.40 | Papenkasteel_lod2/render_white | 4 | 0 + 0 + -1 | 0.5 |
| 4.37, 57.21, 27.95 | Papenkasteel_lod2/render_white | 12 | 0 + 0 + 1 | 0.404 |
| 7.37, 57.21, 27.95 | Papenkasteel_lod2/render_white | 12 | 0 + 0 + 1 | 0.404 |
| -1.74, 52.49, 2.75 | Papenkasteel_lod2/wood_frame_white | 4 | 0.22 + -0.01 + 0.98 | 0.627 |
| -1.24, 72.76, -0.05 | Papenkasteel_lod2/cast_iron_dark | 12 | 0 + 0 + -1 | 0.031 |
| -1.24, 72.76, -0.02 | Papenkasteel_lod2/cast_iron_dark | 12 | 0 + 0 + 1 | 0.031 |

## sliver (warn, 89)

| at | part | aspect | longest |
|---|---|---|---|
| 1.97, 53.55, 1.50 | Papenkasteel_lod2/render_white | 46 | 8.633 |
| 4.12, 49.41, -9.20 | Papenkasteel_lod2/render_white | 53 | 8.182 |
| 4.12, 57.60, -9.20 | Papenkasteel_lod2/render_white | 58 | 8.168 |
| 3.17, 49.41, -9.20 | Papenkasteel_lod2/render_white | 49 | 9.918 |
| 3.17, 57.60, -9.20 | Papenkasteel_lod2/render_white | 53 | 9.906 |
| -4.87, 49.41, -9.20 | Papenkasteel_lod2/render_white | 103 | 11.459 |
| 2.22, 57.60, -9.20 | Papenkasteel_lod2/render_white | 105 | 11 |
| -5.82, 49.41, -9.20 | Papenkasteel_lod2/render_white | 53 | 10.365 |
| -5.82, 57.60, -9.20 | Papenkasteel_lod2/render_white | 58 | 10.353 |
| -6.77, 49.41, -9.20 | Papenkasteel_lod2/render_white | 58 | 8.628 |
| -6.77, 57.60, -9.20 | Papenkasteel_lod2/render_white | 64 | 8.614 |
| -12.10, 49.41, -4.33 | Papenkasteel_lod2/render_white | 69 | 9.372 |
| -12.10, 57.60, -4.33 | Papenkasteel_lod2/render_white | 76 | 9.359 |
| 9.15, 53.16, -9.13 | Papenkasteel_lod2/render_white | 44 | 9.659 |
| -6.46, 60.08, 0.55 | Papenkasteel_lod2/render_white | 42 | 1.71 |
| -5.64, 60.08, 0.55 | Papenkasteel_lod2/render_white | 42 | 1.71 |
| 3.15, 60.08, 0.55 | Papenkasteel_lod2/render_white | 42 | 1.71 |
| 3.96, 60.08, 0.55 | Papenkasteel_lod2/render_white | 42 | 1.71 |
| -6.46, 60.08, -8.25 | Papenkasteel_lod2/render_white | 42 | 1.71 |
| -7.50, 52.67, 4.15 | Papenkasteel_lod2/render_white | 58 | 8.031 |
| -12.40, 52.67, 4.15 | Papenkasteel_lod2/render_white | 58 | 8.031 |
| 5.80, 49.55, 4.75 | Papenkasteel_lod2/render_white | 49 | 5.484 |
| 9.10, 52.67, 3.78 | Papenkasteel_lod2/render_white | 50 | 6.931 |
| 5.50, 52.67, 3.78 | Papenkasteel_lod2/render_white | 50 | 6.931 |
| -1.67, 49.45, 21.50 | Papenkasteel_lod2/render_white | 73 | 6.751 |
| -0.43, 52.35, 21.50 | Papenkasteel_lod2/render_white | 58 | 3.029 |
| -0.83, 53.02, 21.50 | Papenkasteel_lod2/render_white | 49 | 5.763 |
| -2.70, 53.02, 21.50 | Papenkasteel_lod2/render_white | 107 | 8.542 |
| -6.28, 54.02, 21.50 | Papenkasteel_lod2/render_white | 524 | 3.78 |
| -19.83, 52.47, 21.50 | Papenkasteel_lod2/render_white | 67 | 2.102 |
| -0.66, 54.50, 21.31 | Papenkasteel_lod2/render_white | 86 | 30.97 |
| -10.88, 54.45, 21.42 | Papenkasteel_lod2/render_white | 86 | 30.642 |
| -10.77, 54.50, 28.99 | Papenkasteel_lod2/render_white | 86 | 30.97 |
| -0.55, 54.45, 28.88 | Papenkasteel_lod2/render_white | 86 | 30.642 |
| -11.25, 52.12, 17.57 | Papenkasteel_lod2/render_white | 64 | 3.58 |
| -11.25, 53.22, 15.51 | Papenkasteel_lod2/render_white | 130 | 2.2 |
| -0.39, 52.99, 2.93 | Papenkasteel_lod2/brick_red_brussels | 1933 | 3.528 |
| -2.17, 66.46, 2.93 | Papenkasteel_lod2/brick_red_brussels | 63 | 3.324 |
| 1.56, 66.46, -1.02 | Papenkasteel_lod2/brick_red_brussels | 91 | 3.329 |
| -4.04, 66.46, 0.95 | Papenkasteel_lod2/brick_red_brussels | 91 | 3.329 |

(49 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| -1.91, 70.75, -0.93 | Papenkasteel_lod2/stone_white | 4 |

## tjunction (warn, 37)

| at | part | edge_m |
|---|---|---|
| -7.80, 49.06, 1.50 | Papenkasteel_lod2/render_white | 1.909 |
| -12.10, 49.06, 1.50 | Papenkasteel_lod2/render_white | 1.159 |
| -12.10, 52.55, 1.50 | Papenkasteel_lod2/render_white | 3.05 |
| -7.80, 52.55, 1.50 | Papenkasteel_lod2/render_white | 2.3 |
| 9.47, 50.31, 21.50 | Papenkasteel_lod2/render_white | 5.797 |
| -17.80, 49.09, 21.50 | Papenkasteel_lod2/render_white | 1.397 |
| -20.90, 49.38, 21.50 | Papenkasteel_lod2/render_white | 3.463 |
| -20.90, 52.52, 21.50 | Papenkasteel_lod2/render_white | 5.474 |
| -20.90, 50.64, 28.80 | Papenkasteel_lod2/render_white | 5.474 |
| 9.47, 50.64, 28.80 | Papenkasteel_lod2/render_white | 4.543 |
| -17.80, 54.85, 21.50 | Papenkasteel_lod2/render_white | 2 |
| -11.25, 54.85, 21.50 | Papenkasteel_lod2/render_white | 2 |
| -4.04, 58.05, 2.93 | Papenkasteel_lod2/brick_red_brussels | 1.32 |
| 1.56, 58.05, 2.93 | Papenkasteel_lod2/brick_red_brussels | 1.32 |
| -1.94, 50.62, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.45 |
| -0.54, 50.62, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.45 |
| -1.76, 54.97, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -0.72, 54.97, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -1.76, 59.32, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -0.72, 59.32, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -1.76, 62.22, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -0.72, 62.22, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2.2 |
| -1.76, 65.12, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -0.72, 65.12, 2.93 | Papenkasteel_lod2/brick_red_brussels | 2 |
| 1.56, 57.87, 2.93 | Papenkasteel_lod2/brick_red_brussels | 1.5 |
| 1.56, 58.05, 1.45 | Papenkasteel_lod2/brick_red_brussels | 5.93 |
| 1.56, 62.90, -3.00 | Papenkasteel_lod2/brick_red_brussels | 1.32 |
| 1.56, 65.12, 0.33 | Papenkasteel_lod2/brick_red_brussels | 2 |
| 1.56, 65.12, -0.40 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -4.04, 57.87, 2.93 | Papenkasteel_lod2/brick_red_brussels | 1.5 |
| -4.04, 58.05, 1.45 | Papenkasteel_lod2/brick_red_brussels | 5.93 |
| -4.04, 62.90, -3.00 | Papenkasteel_lod2/brick_red_brussels | 1.32 |
| -4.04, 65.12, -0.40 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -4.04, 65.12, 0.33 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -0.79, 65.12, -3.00 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -1.69, 65.12, -3.00 | Papenkasteel_lod2/brick_red_brussels | 2 |
| -1.76, 58.00, 2.93 | Papenkasteel_lod2/stone_white | 5.6 |

## seam (info, 599)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -11.71, 57.80, 1.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_white | 58.34 | 57 | 46.4 |
| -0.64, 70.70, -0.37 | Papenkasteel_lod2/slate + Papenkasteel_lod2/zinc_roof | 4.3 | 36 | 30.9 |
| 9.20, 54.41, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 24.47 | 30 | 67 |
| -11.17, 54.77, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 23.12 | 28 | 67 |
| -17.80, 49.12, 13.52 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 3.23 | 26 | 90 |
| -1.64, 70.63, 0.54 | Papenkasteel_lod2/zinc_roof + Papenkasteel_lod2/zinc_roof | 4.46 | 26 | 70.9 |
| 7.88, 49.79, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 25 | 90 |
| -12.10, 49.07, 9.18 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.8 | 24 | 90 |
| 5.03, 49.80, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 22 | 90 |
| 5.96, 52.59, 8.10 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 16.26 | 21 | 67.1 |
| 12.13, 52.59, -2.54 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 12.79 | 21 | 67.1 |
| -4.68, 49.02, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 20 | 90 |
| -12.10, 49.01, -4.43 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 20 | 90 |
| -7.27, 49.65, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.75 | 19 | 90 |
| -4.04, 63.80, -2.99 | Papenkasteel_lod2/brick_red_brussels + Papenkasteel_lod2/stone_white | 2 | 19 | 90 |
| 2.18, 49.80, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 18 | 90 |
| -11.88, 52.59, 9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 19.7 | 18 | 67.1 |
| 5.80, 49.38, 1.48 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.51 | 18 | 90 |
| 5.80, 49.15, 8.08 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.55 | 18 | 90 |
| -11.25, 49.65, 15.55 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.7 | 18 | 90 |
| -3.83, 68.52, 0.12 | Papenkasteel_lod2/stone_white + Papenkasteel_lod2/slate | 2.49 | 18 | 36.3 |
| -1.57, 68.70, -2.72 | Papenkasteel_lod2/slate + Papenkasteel_lod2/slate | 1.27 | 18 | 68.9 |
| 1.29, 68.68, -0.36 | Papenkasteel_lod2/slate + Papenkasteel_lod2/slate | 1.28 | 18 | 69 |
| -1.59, 68.58, 2.71 | Papenkasteel_lod2/slate + Papenkasteel_lod2/slate | 1.28 | 18 | 69 |
| -3.74, 68.74, -0.35 | Papenkasteel_lod2/slate + Papenkasteel_lod2/slate | 1.27 | 18 | 69 |
| -1.83, 49.16, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 17 | 90 |
| -12.10, 49.79, 3.44 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.03 | 17 | 90 |
| -3.78, 60.45, 2.93 | Papenkasteel_lod2/brick_red_brussels + Papenkasteel_lod2/stone_white | 2 | 17 | 90 |
| 1.56, 63.80, -2.79 | Papenkasteel_lod2/brick_red_brussels + Papenkasteel_lod2/stone_white | 2 | 17 | 90 |
| -5.69, 54.74, 1.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.23 | 16 | 74.6 |
| -9.24, 54.74, -9.20 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.38 | 16 | 74.6 |
| -12.10, 49.10, -7.83 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.88 | 16 | 90 |
| -12.10, 49.28, 6.45 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.03 | 16 | 90 |
| 3.63, 53.29, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.8 | 16 | 74.6 |
| -0.15, 49.30, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.75 | 16 | 90 |
| -5.64, 53.26, 21.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.8 | 16 | 74.6 |
| -14.01, 52.94, 13.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 2.19 | 16 | 74.6 |
| 5.80, 50.87, 1.50 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/render_white | 7.42 | 15 | 90 |
| 5.80, 49.75, 5.87 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/stone_blue | 1.77 | 15 | 90 |
| -0.82, 52.77, 2.93 | Papenkasteel_lod2/brick_red_brussels + Papenkasteel_lod2/stone_white | 1.51 | 15 | 34.1 |

(559 more in the JSON)

## opening (info, 430)

| at | part | facing | edge_m |
|---|---|---|---|
| -4.02, 49.89, 1.50 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 9.659 |
| 1.54, 49.79, 1.50 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 9.659 |
| -7.51, 50.55, 1.29 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| 4.01, 54.75, 1.29 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| -10.35, 50.54, -8.95 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 3.45 |
| -6.40, 50.54, -8.95 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 3.45 |
| -7.50, 50.54, -8.95 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 3.45 |
| -0.70, 50.54, -8.95 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 3.45 |
| -1.80, 50.54, -8.95 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 3.45 |
| 5.00, 50.54, -8.95 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 3.45 |
| 7.85, 50.54, -8.95 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 3.45 |
| 6.75, 50.54, -8.95 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 3.45 |
| -6.40, 54.75, -8.99 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 0.25 |
| -7.50, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| -4.65, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| -0.70, 54.75, -8.99 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 0.25 |
| -1.80, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| 1.05, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| 5.00, 54.75, -8.99 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 0.25 |
| 3.90, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| 6.75, 54.75, -9.16 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.25 |
| -12.10, 52.50, 1.50 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 2.75 |
| -12.06, 54.75, -6.70 | Papenkasteel_lod2/render_white | 0 + 0 + -1 | 0.25 |
| -11.89, 54.75, -4.40 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 0.25 |
| -12.06, 54.75, -3.30 | Papenkasteel_lod2/render_white | 0 + 0 + -1 | 0.25 |
| -11.89, 54.75, -1.00 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 0.25 |
| 8.94, 50.55, 0.11 | Papenkasteel_lod2/render_white | 0 + 0 + -1 | 0.25 |
| 8.94, 54.75, -3.34 | Papenkasteel_lod2/render_white | 0 + 0 + -1 | 0.25 |
| -6.50, 59.82, 0.55 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 1.71 |
| -5.81, 60.90, 0.55 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 0.55 |
| -5.70, 60.72, 0.55 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 1.71 |
| -6.39, 59.55, 0.30 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.989 |
| -5.71, 60.34, 0.30 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 0.989 |
| -6.25, 60.39, 0.30 | Papenkasteel_lod2/render_white | 0 + -1 + 0 | 0.69 |
| 3.10, 59.82, 0.55 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 1.71 |
| 4.00, 59.82, 0.55 | Papenkasteel_lod2/render_white | 0 + 0 + 1 | 1.71 |
| 3.21, 59.55, 0.30 | Papenkasteel_lod2/render_white | 1 + 0 + 0 | 0.989 |
| 3.90, 60.34, 0.30 | Papenkasteel_lod2/render_white | -1 + 0 + 0 | 0.989 |
| 3.35, 60.39, 0.30 | Papenkasteel_lod2/render_white | 0 + -1 + 0 | 0.69 |
| -6.50, 59.82, -8.25 | Papenkasteel_lod2/render_white | 0 + 0 + -1 | 1.71 |

(390 more in the JSON)

## backtoback (info, 370)

| at | parts | area |
|---|---|---|
| -6.37, 60.79, -0.84 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.4271 |
| -6.61, 60.52, -0.01 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.44988 |
| -6.11, 61.11, -0.24 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45015 |
| -6.45, 60.72, 0.44 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.47482 |
| -5.73, 60.79, -0.94 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45948 |
| -5.99, 61.13, 0.15 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.41724 |
| -5.49, 60.52, -0.46 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46235 |
| -5.81, 60.92, 0.45 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46235 |
| 3.23, 60.79, -0.84 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.4271 |
| 2.99, 60.52, -0.01 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.44988 |
| 3.49, 61.11, -0.24 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45015 |
| 3.15, 60.72, 0.44 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.47482 |
| 3.87, 60.79, -0.94 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45948 |
| 3.62, 61.13, 0.15 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.41724 |
| 4.11, 60.52, -0.46 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46235 |
| 3.79, 60.92, 0.45 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46235 |
| -6.37, 60.79, -6.76 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45952 |
| -6.12, 61.13, -7.85 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.41728 |
| -6.61, 60.52, -7.24 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46239 |
| -6.29, 60.92, -8.14 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46239 |
| -5.73, 60.79, -6.86 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.42713 |
| -5.49, 60.52, -7.69 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.44992 |
| -5.99, 61.11, -7.46 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45018 |
| -5.65, 60.72, -8.14 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.47486 |
| 3.23, 60.79, -6.76 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45952 |
| 3.49, 61.13, -7.85 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.41728 |
| 2.99, 60.52, -7.24 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46239 |
| 3.31, 60.92, -8.14 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.46239 |
| 3.87, 60.79, -6.86 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.42713 |
| 4.11, 60.52, -7.69 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.44992 |
| 3.61, 61.11, -7.46 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.45018 |
| 3.95, 60.72, -8.14 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.47486 |
| -3.71, 57.27, 23.68 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.37731 |
| -3.46, 57.58, 22.73 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.34088 |
| -3.94, 57.02, 23.26 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.38001 |
| -3.63, 57.39, 22.48 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.38001 |
| -3.09, 57.27, 23.59 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.34937 |
| -2.86, 57.01, 22.87 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.36912 |
| -3.34, 57.56, 23.07 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.36942 |
| -3.02, 57.20, 22.48 | Papenkasteel_lod2/render_white + Papenkasteel_lod2/slate | 0.3909 |

(330 more in the JSON)


Nodes: Papenkasteel_lod2. Distances: {"Papenkasteel":95,"Papenkasteel_far":385,"Papenkasteel_lod2":2000}. Quantum 0.260 mm. Offset 0,40,0.
