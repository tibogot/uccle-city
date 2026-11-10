# Mesh audit (before pack): stalle.far

5,085 triangles, 3,184 welded vertices, 1,178 open edges, 143,642 rays, 1011 ms.

**0 blocking**, 215 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 190 |
| nonmanifold | warn | 1 |
| tjunction | warn | 24 |
| seam | info | 115 |
| opening | info | 52 |
| backtoback | info | 43 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 190)

| at | part | aspect | longest |
|---|---|---|---|
| -0.05, 34.93, -2.06 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, -3.15 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.05, 34.93, 3.35 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, 2.26 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| 0.75, 40.00, -2.15 | Stalle_far/sandstone_rubble | 1749 | 1.354 |
| 0.75, 40.00, 2.35 | Stalle_far/sandstone_rubble | 1749 | 1.354 |
| 9.29, 36.77, -4.25 | Stalle_far/sandstone_rubble | 44 | 0.414 |
| 6.96, 36.77, -4.25 | Stalle_far/sandstone_rubble | 81 | 0.613 |
| 8.87, 36.76, -4.25 | Stalle_far/sandstone_rubble | 44 | 0.654 |
| 8.90, 36.77, -4.25 | Stalle_far/sandstone_rubble | 97 | 0.693 |
| 8.82, 36.98, -4.25 | Stalle_far/sandstone_rubble | 53 | 3.885 |
| 4.67, 36.79, -4.25 | Stalle_far/sandstone_rubble | 52 | 1.2 |
| 4.20, 36.80, -4.25 | Stalle_far/sandstone_rubble | 57 | 1.65 |
| 1.57, 36.77, -4.25 | Stalle_far/sandstone_rubble | 46 | 0.424 |
| 1.99, 36.76, -4.25 | Stalle_far/sandstone_rubble | 43 | 0.644 |
| 1.96, 36.77, -4.25 | Stalle_far/sandstone_rubble | 95 | 0.683 |
| 2.15, 36.98, -4.25 | Stalle_far/sandstone_rubble | 44 | 3.539 |
| 3.62, 36.98, -4.25 | Stalle_far/sandstone_rubble | 114 | 5.724 |
| 6.56, 36.77, -4.25 | Stalle_far/sandstone_rubble | 58 | 0.494 |
| 8.27, 36.98, -4.25 | Stalle_far/sandstone_rubble | 43 | 4.977 |
| 7.72, 36.98, -4.25 | Stalle_far/sandstone_rubble | 107 | 5.525 |
| 7.22, 34.68, -4.30 | Stalle_far/sandstone_rubble | 87 | 6.07 |
| 9.25, 34.68, -4.27 | Stalle_far/sandstone_rubble | 87 | 6.07 |
| 1.17, 34.68, -4.30 | Stalle_far/sandstone_rubble | 53 | 3.721 |
| 2.41, 34.68, -4.27 | Stalle_far/sandstone_rubble | 53 | 3.721 |
| 1.50, 36.77, 4.45 | Stalle_far/sandstone_rubble | 83 | 0.623 |
| 1.89, 36.77, 4.45 | Stalle_far/sandstone_rubble | 56 | 0.484 |
| 2.38, 36.98, 4.45 | Stalle_far/sandstone_rubble | 53 | 3.885 |
| 2.75, 36.98, 4.45 | Stalle_far/sandstone_rubble | 69 | 4.431 |
| 3.12, 36.98, 4.45 | Stalle_far/sandstone_rubble | 86 | 4.977 |
| 3.48, 36.98, 4.45 | Stalle_far/sandstone_rubble | 107 | 5.525 |
| 6.89, 36.77, 4.45 | Stalle_far/sandstone_rubble | 44 | 0.414 |
| 8.80, 36.76, 4.45 | Stalle_far/sandstone_rubble | 60 | 0.853 |
| 8.83, 36.77, 4.45 | Stalle_far/sandstone_rubble | 139 | 0.892 |
| 9.43, 36.76, 4.45 | Stalle_far/sandstone_rubble | 50 | 0.724 |
| 9.62, 36.94, 4.45 | Stalle_far/sandstone_rubble | 83 | 1.525 |
| 8.47, 36.98, 4.45 | Stalle_far/sandstone_rubble | 41 | 3.44 |
| 6.47, 36.76, 4.45 | Stalle_far/sandstone_rubble | 44 | 0.654 |
| 6.50, 36.77, 4.45 | Stalle_far/sandstone_rubble | 97 | 0.693 |
| 7.37, 36.98, 4.45 | Stalle_far/sandstone_rubble | 90 | 5.077 |

(150 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 11.27, 33.94, -4.25 | Stalle_far/sandstone_rubble | 3 |

## tjunction (warn, 24)

| at | part | edge_m |
|---|---|---|
| 0.00, 34.93, -4.25 | Stalle_far/sandstone_rubble | 4.22 |
| 0.00, 40.14, -2.15 | Stalle_far/sandstone_rubble | 1.28 |
| 0.00, 40.14, 2.35 | Stalle_far/sandstone_rubble | 1.28 |
| 0.00, 34.93, 4.45 | Stalle_far/sandstone_rubble | 4.22 |
| 11.20, 34.68, -4.25 | Stalle_far/sandstone_rubble | 4.13 |
| 0.00, 34.93, -4.25 | Stalle_far/sandstone_rubble | 4.13 |
| 11.20, 34.68, -4.25 | Stalle_far/sandstone_rubble | 6.07 |
| 11.20, 34.68, -2.15 | Stalle_far/sandstone_rubble | 6.09 |
| 11.20, 34.68, -4.25 | Stalle_far/sandstone_rubble | 4.24 |
| 0.00, 34.93, 4.45 | Stalle_far/sandstone_rubble | 4.13 |
| 10.55, 34.68, 4.45 | Stalle_far/sandstone_rubble | 4.13 |
| 0.00, 39.27, -2.15 | Stalle_far/sandstone_rubble | 1.187 |
| 11.20, 34.68, -2.15 | Stalle_far/sandstone_rubble | 5.75 |
| 11.20, 34.68, -2.15 | Stalle_far/sandstone_rubble | 1.58 |
| 0.00, 39.27, 2.35 | Stalle_far/sandstone_rubble | 1.187 |
| 0.00, 34.32, 0.80 | Stalle_far/stone_white | 2.12 |
| 0.00, 34.32, -0.60 | Stalle_far/stone_white | 2.12 |
| 0.32, 44.73, 0.04 | Stalle_far/stone_white | 0.58 |
| 0.43, 44.73, 0.04 | Stalle_far/stone_white | 0.58 |
| 0.37, 34.32, -0.55 | Stalle_far/stone_blue | 1.9 |
| -6.67, 37.90, 4.15 | Stalle_far/brick_red_brussels | 4.77 |
| -6.67, 37.90, 9.97 | Stalle_far/brick_red_brussels | 4.77 |
| 0.58, 37.90, 9.97 | Stalle_far/brick_red_brussels | 4.77 |
| 0.58, 37.90, 4.15 | Stalle_far/brick_red_brussels | 4.77 |

## seam (info, 115)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.75, 40.13, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/slate | 71.04 | 168 | 33.8 |
| -0.02, 34.06, 4.15 | Stalle_far/brick_red_brussels + Stalle_far/cobbles | 6.62 | 54 | 82.5 |
| 0.00, 34.38, -3.98 | Stalle_far/sandstone_rubble + Stalle_far/cobbles | 8.48 | 45 | 76.8 |
| 0.00, 36.57, 4.15 | Stalle_far/sandstone_rubble + Stalle_far/brick_red_brussels | 4.48 | 41 | 90 |
| 0.23, 34.68, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 10.55 | 41 | 90 |
| 10.97, 34.68, -4.25 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 13.48 | 32 | 90 |
| 11.05, 38.46, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/slate | 7.48 | 32 | 65.7 |
| 0.82, 39.24, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/slate | 19.84 | 30 | 48.1 |
| 0.80, 39.24, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/slate | 19.9 | 26 | 48.1 |
| -2.53, 34.00, 4.31 | Stalle_far/stone_white + Stalle_far/painted_wood_red | 5.93 | 26 | 90 |
| -6.67, 41.00, 6.66 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 9.24 | 26 | 90 |
| 0.58, 41.00, 7.46 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 9.24 | 26 | 90 |
| 0.00, 34.93, -4.00 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 5.02 | 25 | 90 |
| 6.02, 42.72, -0.34 | Stalle_far/slate + Stalle_far/slate | 7.44 | 24 | 44.8 |
| 0.00, 40.64, -2.04 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 7.56 | 22 | 90 |
| -6.61, 41.38, 6.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 3.95 | 20 | 38.7 |
| -6.61, 42.22, 7.33 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 4.32 | 20 | 90 |
| 0.33, 41.12, 7.36 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 3.95 | 20 | 38.7 |
| 0.04, 42.22, 6.77 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 4.32 | 20 | 90 |
| 0.77, 37.38, -4.22 | Stalle_far/stone_white + Stalle_far/slate | 1.34 | 18 | 41.9 |
| 0.13, 37.70, 4.10 | Stalle_far/stone_white + Stalle_far/stone_white | 3.83 | 17 | 40.4 |
| -0.08, 37.25, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 1.75 | 17 | 90 |
| -0.07, 33.95, -1.22 | Stalle_far/sandstone_rubble + Stalle_far/cobbles | 3.47 | 16 | 76.8 |
| 0.01, 37.22, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 0.88 | 15 | 90 |
| 0.78, 37.25, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/slate | 9.88 | 15 | 48.1 |
| 10.76, 39.23, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 2.6 | 15 | 40.7 |
| 0.73, 37.65, -3.96 | Stalle_far/stone_white + Stalle_far/stone_white | 2.48 | 15 | 40.4 |
| -0.32, 33.95, 0.54 | Stalle_far/stone_blue + Stalle_far/cobbles | 2.54 | 15 | 82 |
| -0.68, 33.90, 1.00 | Stalle_far/stone_blue + Stalle_far/cobbles | 2.92 | 15 | 85 |
| 0.24, 39.19, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 1.82 | 14 | 49.6 |
| 0.00, 37.22, -4.24 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 0.89 | 13 | 90 |
| 10.50, 35.22, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/brick_red_brussels | 3.75 | 13 | 90 |
| 0.09, 39.19, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 1.82 | 13 | 49.6 |
| 0.76, 40.77, -1.94 | Stalle_far/stone_white + Stalle_far/stone_white | 2.29 | 13 | 55.1 |
| 0.04, 37.65, 4.16 | Stalle_far/stone_white + Stalle_far/stone_white | 2.48 | 13 | 40.4 |
| 0.36, 37.66, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.87 | 13 | 49.6 |
| -6.22, 37.68, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| -6.22, 37.67, 9.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.68, 9.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.67, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |

(75 more in the JSON)

## opening (info, 52)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.00, 34.78, -4.25 | Stalle_far/sandstone_rubble | 0 + 0 + -1 | 1.73 |
| 0.75, 40.30, -2.15 | Stalle_far/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 0.75, 39.52, 2.35 | Stalle_far/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 11.15, 37.33, -4.25 | Stalle_far/sandstone_rubble | 0 + 0 + -1 | 11.2 |
| 11.20, 37.47, -4.21 | Stalle_far/sandstone_rubble | 1 + 0 + 0 | 2.799 |
| 10.60, 37.47, -4.23 | Stalle_far/sandstone_rubble | -1 + 0 + 0 | 0.163 |
| 0.75, 40.14, -2.15 | Stalle_far/sandstone_rubble | 0 + 0 + -1 | 14.75 |
| 0.05, 40.14, 2.35 | Stalle_far/sandstone_rubble | 0 + 0 + 1 | 14.75 |
| 0.15, 38.95, 2.35 | Stalle_far/sandstone_rubble | 0 + 0 + 1 | 10.55 |
| 10.55, 38.90, 2.35 | Stalle_far/sandstone_rubble | 0 + 0 + 1 | 5.75 |
| 0.32, 44.73, 0.10 | Stalle_far/stone_white | -1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.10 | Stalle_far/stone_white | 1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.33 | Stalle_far/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, 0.33 | Stalle_far/stone_white | 0 + -1 + 0 | 0.235 |
| 0.43, 44.73, -0.13 | Stalle_far/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, -0.13 | Stalle_far/stone_white | 0 + -1 + 0 | 0.235 |
| -6.67, 37.65, 4.15 | Stalle_far/brick_red_brussels | 0 + 0 + -1 | 4.7 |
| 0.58, 37.65, 9.97 | Stalle_far/brick_red_brussels | 0 + 0 + 1 | 4.7 |
| 5.88, 42.60, -0.21 | Stalle_far/slate | -1 + 0 + 0 | 0.72 |
| 7.12, 42.60, -0.21 | Stalle_far/slate | 1 + 0 + 0 | 0.72 |
| 10.33, 36.75, 7.56 | Stalle_far/slate | 0 + 0 + 1 | 5.14 |
| 10.28, 36.75, 7.51 | Stalle_far/slate | -1 + 0 + 0 | 5.21 |
| 15.42, 36.75, 7.51 | Stalle_far/slate | 1 + 0 + 0 | 5.507 |
| -6.27, 37.55, 3.93 | Stalle_far/slate | 0 + -0.65 + 0.76 | 4.86 |
| 0.18, 37.55, 10.19 | Stalle_far/slate | 0 + -0.65 + -0.76 | 4.86 |
| -6.27, 37.55, 10.19 | Stalle_far/slate | 0 + -0.65 + -0.76 | 4.86 |
| 6.52, 48.00, 0.09 | Stalle_far/cast_iron_green | 0.87 + 0 + -0.5 | 0.03 |
| 6.50, 48.00, 0.07 | Stalle_far/cast_iron_green | 0 + 0 + -1 | 0.03 |
| 6.48, 48.00, 0.09 | Stalle_far/cast_iron_green | -0.87 + 0 + -0.5 | 0.03 |
| 6.48, 48.00, 0.11 | Stalle_far/cast_iron_green | -0.87 + 0 + 0.5 | 0.03 |
| 6.50, 48.00, 0.13 | Stalle_far/cast_iron_green | 0 + 0 + 1 | 0.03 |
| 6.52, 48.00, 0.11 | Stalle_far/cast_iron_green | 0.87 + 0 + 0.5 | 0.03 |
| -6.15, 34.58, -4.60 | Stalle_far/cobbles | -0.02 + 1 + -0.03 | 0.5 |
| -6.60, 34.60, -3.67 | Stalle_far/cobbles | 0.01 + 1 + -0.03 | 0.878 |
| -6.60, 34.61, -2.79 | Stalle_far/cobbles | 0.08 + 0.98 + 0.17 | 0.891 |
| -6.60, 34.45, -1.92 | Stalle_far/cobbles | 0.26 + 0.93 + 0.27 | 0.915 |
| -6.60, 34.20, -1.04 | Stalle_far/cobbles | 0.19 + 0.96 + 0.21 | 0.898 |
| -6.60, 34.01, -0.16 | Stalle_far/cobbles | 0.17 + 0.97 + 0.19 | 0.895 |
| -6.05, 34.58, -4.60 | Stalle_far/cobbles | -0.01 + 1 + -0.02 | 0.5 |
| -5.55, 34.58, -4.60 | Stalle_far/cobbles | -0.02 + 1 + -0.02 | 0.5 |

(12 more in the JSON)

## backtoback (info, 43)

| at | parts | area |
|---|---|---|
| 0.75, 42.80, -0.25 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.03008 |
| 0.75, 41.57, -1.13 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.09757 |
| 0.75, 43.23, 0.03 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00607 |
| 0.75, 43.13, -0.05 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00122 |
| 0.75, 38.76, -2.64 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.01614 |
| 0.75, 38.08, -3.42 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.05077 |
| 0.75, 39.07, -2.31 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.01402 |
| 0.75, 38.97, -2.44 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.007 |
| 0.75, 40.08, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00008 |
| 0.75, 37.50, 4.26 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00336 |
| 0.75, 38.06, 3.64 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.06354 |
| 0.75, 39.01, 2.58 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.02101 |
| 0.75, 40.59, 2.00 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.02714 |
| 0.75, 41.90, 1.09 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.10051 |
| 0.75, 43.21, 0.18 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00729 |
| 0.75, 40.07, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00008 |
| 11.20, 34.32, -2.20 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 0.04594 |
| 10.60, 37.50, -4.06 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.00336 |
| 10.60, 38.26, -3.21 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.06653 |
| 10.60, 39.03, -2.36 | Stalle_far/sandstone_rubble + Stalle_far/slate | 0.01809 |
| 0.77, 38.35, -3.13 | Stalle_far/stone_white + Stalle_far/slate | 0.07892 |
| 0.77, 38.34, 3.35 | Stalle_far/stone_white + Stalle_far/slate | 0.08061 |
| 0.17, 37.65, 4.27 | Stalle_far/stone_white + Stalle_far/stone_white | 0.0101 |
| 0.28, 37.65, 4.32 | Stalle_far/stone_white + Stalle_far/stone_white | 0.0146 |
| 0.25, 37.65, 4.16 | Stalle_far/stone_white + Stalle_far/stone_white | 0.03722 |
| 0.52, 37.65, 4.23 | Stalle_far/stone_white + Stalle_far/stone_white | 0.08368 |
| 0.38, 44.23, 0.14 | Stalle_far/stone_white + Stalle_far/stone_white | 0.00302 |
| 0.34, 44.23, 0.10 | Stalle_far/stone_white + Stalle_far/stone_white | 0.00303 |
| 0.42, 44.23, 0.11 | Stalle_far/stone_white + Stalle_far/stone_white | 0.00303 |
| 0.36, 44.23, 0.06 | Stalle_far/stone_white + Stalle_far/stone_white | 0.00303 |
| 10.57, 38.52, -2.97 | Stalle_far/stone_white + Stalle_far/slate | 0.16018 |
| -6.25, 39.72, 5.64 | Stalle_far/stone_white + Stalle_far/slate | 0.16843 |
| -6.25, 39.97, 8.28 | Stalle_far/stone_white + Stalle_far/slate | 0.17378 |
| -6.30, 42.22, 7.31 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.08991 |
| -6.55, 42.22, 7.06 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.08829 |
| -6.19, 42.22, 7.06 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.08829 |
| -6.44, 42.22, 6.81 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.08991 |
| 0.16, 39.72, 8.48 | Stalle_far/stone_white + Stalle_far/slate | 0.16844 |
| 0.16, 39.97, 5.84 | Stalle_far/stone_white + Stalle_far/slate | 0.17379 |
| 0.21, 42.22, 6.81 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.08991 |

(3 more in the JSON)


Nodes: Stalle_far. Distances: {"Stalle":94,"Stalle_door":334,"Stalle_slates":52,"Stalle_far":2000,"Stalle_lod1":334,"Stalle_lod2":2000}. Quantum 0.000 mm. Offset 0,30,0.
