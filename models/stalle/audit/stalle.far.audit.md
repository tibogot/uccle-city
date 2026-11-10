# Mesh audit (before pack): stalle.far

6,417 triangles, 3,850 welded vertices, 1,178 open edges, 143,918 rays, 893 ms.

**0 blocking**, 134 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 109 |
| nonmanifold | warn | 1 |
| tjunction | warn | 24 |
| seam | info | 116 |
| opening | info | 51 |
| backtoback | info | 43 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 109)

| at | part | aspect | longest |
|---|---|---|---|
| -0.05, 34.93, -2.06 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, -3.15 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.05, 34.93, 3.35 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, 2.26 | Stalle_far/sandstone_rubble | 47 | 3.291 |
| 0.75, 40.00, -2.15 | Stalle_far/sandstone_rubble | 1749 | 1.354 |
| 0.75, 40.00, 2.35 | Stalle_far/sandstone_rubble | 1749 | 1.354 |
| 7.54, 36.95, -4.25 | Stalle_far/sandstone_rubble | 75 | 2.239 |
| 8.29, 36.96, -4.25 | Stalle_far/sandstone_rubble | 75 | 2.4 |
| 2.44, 36.97, -4.25 | Stalle_far/sandstone_rubble | 58 | 2.01 |
| 2.95, 37.11, -4.25 | Stalle_far/sandstone_rubble | 57 | 5.131 |
| 6.15, 36.97, -4.25 | Stalle_far/sandstone_rubble | 46 | 1.62 |
| 7.69, 37.10, -4.25 | Stalle_far/sandstone_rubble | 52 | 6.089 |
| 7.22, 34.68, -4.30 | Stalle_far/sandstone_rubble | 87 | 6.07 |
| 9.25, 34.68, -4.27 | Stalle_far/sandstone_rubble | 87 | 6.07 |
| 1.17, 34.68, -4.30 | Stalle_far/sandstone_rubble | 53 | 3.721 |
| 2.41, 34.68, -4.27 | Stalle_far/sandstone_rubble | 53 | 3.721 |
| 2.30, 36.91, 4.45 | Stalle_far/sandstone_rubble | 103 | 1.588 |
| 2.96, 36.86, 4.45 | Stalle_far/sandstone_rubble | 51 | 2.136 |
| 2.75, 36.98, 4.45 | Stalle_far/sandstone_rubble | 69 | 4.431 |
| 8.31, 36.96, 4.45 | Stalle_far/sandstone_rubble | 74 | 2.318 |
| 8.01, 37.09, 4.45 | Stalle_far/sandstone_rubble | 253 | 3.909 |
| 5.34, 36.86, 4.45 | Stalle_far/sandstone_rubble | 61 | 2.263 |
| 7.01, 34.68, 4.50 | Stalle_far/sandstone_rubble | 152 | 10.62 |
| 3.47, 34.68, 4.47 | Stalle_far/sandstone_rubble | 152 | 10.62 |
| 14.57, 37.92, -2.15 | Stalle_far/sandstone_rubble | 56 | 3.814 |
| 11.32, 39.73, -2.15 | Stalle_far/sandstone_rubble | 53 | 2.363 |
| 11.30, 39.90, -2.15 | Stalle_far/sandstone_rubble | 105 | 5.057 |
| 6.86, 39.37, -2.15 | Stalle_far/sandstone_rubble | 40 | 2.301 |
| 6.14, 39.38, -2.15 | Stalle_far/sandstone_rubble | 41 | 2.165 |
| 7.01, 39.95, -2.15 | Stalle_far/sandstone_rubble | 125 | 2.133 |
| 6.22, 39.95, -2.15 | Stalle_far/sandstone_rubble | 85 | 2.45 |
| 1.84, 40.01, -2.15 | Stalle_far/sandstone_rubble | 117 | 2.806 |
| 3.66, 39.38, -2.15 | Stalle_far/sandstone_rubble | 42 | 2.215 |
| 3.63, 39.94, -2.15 | Stalle_far/sandstone_rubble | 89 | 2.183 |
| 4.40, 39.37, -2.15 | Stalle_far/sandstone_rubble | 41 | 2.351 |
| 4.36, 39.95, -2.15 | Stalle_far/sandstone_rubble | 87 | 2.5 |
| 2.70, 40.02, -2.15 | Stalle_far/sandstone_rubble | 64 | 5.303 |
| 4.35, 40.02, -2.15 | Stalle_far/sandstone_rubble | 139 | 7.752 |
| 10.19, 40.01, -2.15 | Stalle_far/sandstone_rubble | 191 | 7.002 |
| 7.50, 40.08, -2.15 | Stalle_far/sandstone_rubble | 84 | 14.75 |

(69 more in the JSON)

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

## seam (info, 116)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.75, 40.13, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/slate | 71.04 | 162 | 33.8 |
| -0.00, 34.07, 4.15 | Stalle_far/brick_red_brussels + Stalle_far/cobbles | 6.62 | 58 | 82.4 |
| 0.00, 34.38, -3.98 | Stalle_far/sandstone_rubble + Stalle_far/cobbles | 8.48 | 50 | 76.8 |
| 0.23, 34.68, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 10.55 | 41 | 90 |
| 10.97, 34.68, -4.25 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 13.48 | 32 | 90 |
| 11.05, 38.46, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/slate | 7.48 | 32 | 65.7 |
| 1.20, 39.24, 2.35 | Stalle_far/sandstone_rubble + Stalle_far/slate | 19.84 | 30 | 48.1 |
| 3.23, 34.68, -4.25 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 8.78 | 29 | 90 |
| 0.00, 34.93, -4.00 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 5.02 | 27 | 90 |
| 0.00, 34.09, -0.85 | Stalle_far/sandstone_rubble + Stalle_far/stone_blue | 6.04 | 27 | 90 |
| 0.00, 34.93, 1.80 | Stalle_far/sandstone_rubble + Stalle_far/sandstone_rubble | 5.02 | 26 | 90 |
| -2.53, 34.00, 4.31 | Stalle_far/stone_white + Stalle_far/painted_wood_red | 5.93 | 26 | 90 |
| -6.67, 41.01, 6.67 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 9.24 | 26 | 90 |
| 0.58, 41.00, 7.46 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 9.24 | 26 | 90 |
| 1.20, 39.24, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/slate | 19.9 | 24 | 48.1 |
| 6.02, 42.72, -0.34 | Stalle_far/slate + Stalle_far/slate | 7.44 | 24 | 44.8 |
| 0.00, 40.64, -2.04 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 7.56 | 22 | 90 |
| -6.61, 41.38, 6.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 3.95 | 20 | 38.7 |
| -6.61, 42.22, 7.33 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 4.32 | 20 | 90 |
| 0.33, 41.12, 7.36 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 3.95 | 20 | 38.7 |
| 0.04, 42.22, 6.77 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 4.32 | 20 | 90 |
| 0.77, 37.38, -4.22 | Stalle_far/stone_white + Stalle_far/slate | 1.34 | 18 | 41.9 |
| 0.13, 37.70, 4.10 | Stalle_far/stone_white + Stalle_far/stone_white | 3.83 | 17 | 40.4 |
| -0.08, 37.25, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 1.75 | 17 | 90 |
| 10.76, 39.23, -2.15 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 2.6 | 15 | 40.7 |
| 0.73, 37.65, -3.96 | Stalle_far/stone_white + Stalle_far/stone_white | 2.48 | 15 | 40.4 |
| -0.07, 34.00, -1.83 | Stalle_far/sandstone_rubble + Stalle_far/cobbles | 3.47 | 14 | 76.8 |
| 0.00, 37.22, -4.24 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 0.89 | 13 | 90 |
| 10.43, 37.25, -4.25 | Stalle_far/sandstone_rubble + Stalle_far/slate | 10 | 13 | 48.1 |
| 0.01, 37.22, 4.45 | Stalle_far/sandstone_rubble + Stalle_far/stone_white | 0.88 | 13 | 90 |
| 0.76, 40.77, -1.94 | Stalle_far/stone_white + Stalle_far/stone_white | 2.29 | 13 | 55.1 |
| 0.04, 37.65, 4.16 | Stalle_far/stone_white + Stalle_far/stone_white | 2.48 | 13 | 40.4 |
| 0.36, 37.66, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.87 | 13 | 49.6 |
| -6.22, 37.68, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| -6.67, 38.10, 4.35 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.75 | 13 | 90 |
| -6.22, 37.67, 9.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.68, 9.97 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.67, 4.15 | Stalle_far/stone_white + Stalle_far/brick_red_brussels | 0.7 | 13 | 90 |
| -0.32, 33.95, 0.55 | Stalle_far/stone_blue + Stalle_far/cobbles | 2.55 | 13 | 82 |
| -0.68, 33.90, 0.98 | Stalle_far/stone_blue + Stalle_far/cobbles | 2.92 | 13 | 85 |

(76 more in the JSON)

## opening (info, 51)

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
| -6.15, 34.58, -4.60 | Stalle_far/cobbles | -0.02 + 1 + -0.02 | 0.5 |
| -6.60, 34.57, -4.55 | Stalle_far/cobbles | 0.01 + 1 + -0.03 | 0.878 |
| -6.60, 34.60, -3.67 | Stalle_far/cobbles | 0.08 + 1 + -0.03 | 0.878 |
| -6.60, 34.61, -2.79 | Stalle_far/cobbles | 0.26 + 0.95 + 0.16 | 0.891 |
| -6.60, 34.45, -1.92 | Stalle_far/cobbles | 0.19 + 0.94 + 0.28 | 0.915 |
| -6.60, 34.20, -1.04 | Stalle_far/cobbles | 0.17 + 0.96 + 0.21 | 0.898 |
| -6.60, 34.01, -0.16 | Stalle_far/cobbles | 0.02 + 0.98 + 0.2 | 0.895 |
| -6.05, 34.58, -4.60 | Stalle_far/cobbles | -0.01 + 1 + -0.02 | 0.5 |
| -5.55, 34.58, -4.60 | Stalle_far/cobbles | -0.02 + 1 + -0.01 | 0.5 |

(11 more in the JSON)

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
