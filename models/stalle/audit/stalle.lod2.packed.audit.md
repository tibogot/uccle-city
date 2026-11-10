# Mesh audit (packed): stalle.lod2

5,085 triangles, 3,184 welded vertices, 1,178 open edges, 143,558 rays, 416 ms.

**0 blocking**, 213 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 188 |
| nonmanifold | warn | 1 |
| tjunction | warn | 24 |
| seam | info | 114 |
| opening | info | 52 |
| backtoback | info | 44 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 188)

| at | part | aspect | longest |
|---|---|---|---|
| -0.05, 34.93, -2.06 | Stalle_lod2/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, -3.15 | Stalle_lod2/sandstone_rubble | 47 | 3.291 |
| -0.05, 34.93, 3.35 | Stalle_lod2/sandstone_rubble | 47 | 3.291 |
| -0.02, 34.93, 2.26 | Stalle_lod2/sandstone_rubble | 47 | 3.291 |
| 0.75, 40.00, -2.15 | Stalle_lod2/sandstone_rubble | 1803 | 1.354 |
| 0.75, 40.00, 2.35 | Stalle_lod2/sandstone_rubble | 1803 | 1.354 |
| 9.29, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 44 | 0.414 |
| 6.96, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 80 | 0.613 |
| 8.87, 36.76, -4.25 | Stalle_lod2/sandstone_rubble | 44 | 0.654 |
| 8.90, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 96 | 0.692 |
| 8.82, 36.98, -4.25 | Stalle_lod2/sandstone_rubble | 53 | 3.885 |
| 4.67, 36.79, -4.25 | Stalle_lod2/sandstone_rubble | 52 | 1.2 |
| 4.20, 36.80, -4.25 | Stalle_lod2/sandstone_rubble | 57 | 1.65 |
| 1.57, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 46 | 0.424 |
| 1.99, 36.76, -4.25 | Stalle_lod2/sandstone_rubble | 43 | 0.644 |
| 1.96, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 94 | 0.683 |
| 2.15, 36.98, -4.25 | Stalle_lod2/sandstone_rubble | 44 | 3.539 |
| 3.62, 36.98, -4.25 | Stalle_lod2/sandstone_rubble | 114 | 5.724 |
| 6.56, 36.77, -4.25 | Stalle_lod2/sandstone_rubble | 58 | 0.494 |
| 8.27, 36.98, -4.25 | Stalle_lod2/sandstone_rubble | 43 | 4.978 |
| 7.72, 36.98, -4.25 | Stalle_lod2/sandstone_rubble | 107 | 5.525 |
| 7.22, 34.68, -4.30 | Stalle_lod2/sandstone_rubble | 87 | 6.07 |
| 9.25, 34.68, -4.27 | Stalle_lod2/sandstone_rubble | 87 | 6.07 |
| 1.17, 34.68, -4.30 | Stalle_lod2/sandstone_rubble | 53 | 3.721 |
| 2.41, 34.68, -4.27 | Stalle_lod2/sandstone_rubble | 53 | 3.721 |
| 1.50, 36.77, 4.45 | Stalle_lod2/sandstone_rubble | 82 | 0.623 |
| 1.89, 36.77, 4.45 | Stalle_lod2/sandstone_rubble | 56 | 0.484 |
| 2.38, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 53 | 3.885 |
| 2.75, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 69 | 4.431 |
| 3.12, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 86 | 4.977 |
| 3.48, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 107 | 5.525 |
| 6.89, 36.77, 4.45 | Stalle_lod2/sandstone_rubble | 44 | 0.414 |
| 8.80, 36.76, 4.45 | Stalle_lod2/sandstone_rubble | 61 | 0.853 |
| 8.83, 36.77, 4.45 | Stalle_lod2/sandstone_rubble | 138 | 0.892 |
| 9.43, 36.76, 4.45 | Stalle_lod2/sandstone_rubble | 50 | 0.723 |
| 9.62, 36.94, 4.45 | Stalle_lod2/sandstone_rubble | 82 | 1.524 |
| 8.47, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 41 | 3.44 |
| 6.47, 36.76, 4.45 | Stalle_lod2/sandstone_rubble | 44 | 0.654 |
| 6.50, 36.77, 4.45 | Stalle_lod2/sandstone_rubble | 96 | 0.692 |
| 7.37, 36.98, 4.45 | Stalle_lod2/sandstone_rubble | 90 | 5.077 |

(148 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 11.27, 33.94, -4.25 | Stalle_lod2/sandstone_rubble | 3 |

## tjunction (warn, 24)

| at | part | edge_m |
|---|---|---|
| 0.00, 34.93, -4.25 | Stalle_lod2/sandstone_rubble | 4.22 |
| 0.00, 40.14, -2.15 | Stalle_lod2/sandstone_rubble | 1.28 |
| 0.00, 40.14, 2.35 | Stalle_lod2/sandstone_rubble | 1.28 |
| 0.00, 34.93, 4.45 | Stalle_lod2/sandstone_rubble | 4.22 |
| 11.20, 34.68, -4.25 | Stalle_lod2/sandstone_rubble | 4.13 |
| 0.00, 34.93, -4.25 | Stalle_lod2/sandstone_rubble | 4.13 |
| 11.20, 34.68, -4.25 | Stalle_lod2/sandstone_rubble | 6.07 |
| 11.20, 34.68, -2.15 | Stalle_lod2/sandstone_rubble | 6.09 |
| 11.20, 34.68, -4.25 | Stalle_lod2/sandstone_rubble | 4.24 |
| 0.00, 34.93, 4.45 | Stalle_lod2/sandstone_rubble | 4.13 |
| 10.55, 34.68, 4.45 | Stalle_lod2/sandstone_rubble | 4.13 |
| 0.00, 39.27, -2.15 | Stalle_lod2/sandstone_rubble | 1.187 |
| 11.20, 34.68, -2.15 | Stalle_lod2/sandstone_rubble | 5.75 |
| 11.20, 34.68, -2.15 | Stalle_lod2/sandstone_rubble | 1.58 |
| 0.00, 39.27, 2.35 | Stalle_lod2/sandstone_rubble | 1.187 |
| 0.00, 34.32, 0.80 | Stalle_lod2/stone_white | 2.12 |
| 0.00, 34.32, -0.60 | Stalle_lod2/stone_white | 2.12 |
| 0.32, 44.73, 0.04 | Stalle_lod2/stone_white | 0.58 |
| 0.43, 44.73, 0.04 | Stalle_lod2/stone_white | 0.58 |
| 0.37, 34.32, -0.55 | Stalle_lod2/stone_blue | 1.9 |
| -6.67, 37.90, 4.15 | Stalle_lod2/brick_red_brussels | 4.77 |
| -6.67, 37.90, 9.97 | Stalle_lod2/brick_red_brussels | 4.77 |
| 0.58, 37.90, 9.97 | Stalle_lod2/brick_red_brussels | 4.77 |
| 0.58, 37.90, 4.15 | Stalle_lod2/brick_red_brussels | 4.77 |

## seam (info, 114)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.75, 40.13, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 43.06 | 164 | 33.8 |
| -0.02, 34.06, 4.15 | Stalle_lod2/brick_red_brussels + Stalle_lod2/cobbles | 6.62 | 54 | 82.5 |
| 0.00, 34.38, -3.98 | Stalle_lod2/sandstone_rubble + Stalle_lod2/cobbles | 8.48 | 45 | 76.8 |
| 0.00, 36.57, 4.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/brick_red_brussels | 4.48 | 41 | 90 |
| 0.23, 34.68, 4.45 | Stalle_lod2/sandstone_rubble + Stalle_lod2/sandstone_rubble | 10.55 | 41 | 90 |
| 11.05, 38.46, 2.35 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 7.78 | 35 | 65.7 |
| 10.97, 34.68, -4.25 | Stalle_lod2/sandstone_rubble + Stalle_lod2/sandstone_rubble | 13.48 | 32 | 90 |
| 0.82, 39.24, 2.35 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 19.84 | 30 | 48.1 |
| 0.80, 39.24, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 19.9 | 26 | 48.1 |
| -2.53, 34.00, 4.31 | Stalle_lod2/stone_white + Stalle_lod2/painted_wood_red | 5.93 | 26 | 90 |
| -6.67, 41.00, 6.66 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 9.24 | 26 | 90 |
| 0.58, 41.00, 7.46 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 9.24 | 26 | 90 |
| 0.00, 34.93, -4.00 | Stalle_lod2/sandstone_rubble + Stalle_lod2/sandstone_rubble | 5.02 | 25 | 90 |
| 6.02, 42.72, -0.34 | Stalle_lod2/slate + Stalle_lod2/slate | 7.44 | 24 | 44.8 |
| 0.00, 40.64, -2.04 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 7.56 | 22 | 90 |
| -6.61, 41.38, 6.97 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 3.95 | 20 | 38.7 |
| -6.61, 42.22, 7.33 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 4.32 | 20 | 90 |
| 0.33, 41.12, 7.36 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 3.95 | 20 | 38.7 |
| 0.04, 42.22, 6.77 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 4.32 | 20 | 90 |
| 0.77, 37.38, -4.22 | Stalle_lod2/stone_white + Stalle_lod2/slate | 1.34 | 18 | 41.9 |
| 0.13, 37.70, 4.10 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 3.84 | 17 | 40.4 |
| -0.08, 37.25, 4.15 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 1.75 | 17 | 90 |
| -0.07, 33.95, -1.22 | Stalle_lod2/sandstone_rubble + Stalle_lod2/cobbles | 3.47 | 16 | 76.7 |
| 0.01, 37.22, 4.45 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 0.88 | 15 | 90 |
| 0.78, 37.25, 4.45 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 9.88 | 15 | 48.1 |
| 10.76, 39.23, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 2.61 | 15 | 40.7 |
| 0.73, 37.65, -3.96 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 2.48 | 15 | 40.4 |
| -0.32, 33.95, 0.54 | Stalle_lod2/stone_blue + Stalle_lod2/cobbles | 2.54 | 15 | 82 |
| -0.68, 33.90, 1.00 | Stalle_lod2/stone_blue + Stalle_lod2/cobbles | 2.92 | 15 | 85 |
| 0.24, 39.19, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 1.82 | 14 | 49.5 |
| 0.00, 37.22, -4.24 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 0.89 | 13 | 90 |
| 10.50, 35.22, 4.45 | Stalle_lod2/sandstone_rubble + Stalle_lod2/brick_red_brussels | 3.75 | 13 | 90 |
| 0.09, 39.19, 2.35 | Stalle_lod2/sandstone_rubble + Stalle_lod2/stone_white | 1.82 | 13 | 49.6 |
| 0.76, 40.77, -1.94 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 2.29 | 13 | 55.1 |
| 0.04, 37.65, 4.16 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 2.47 | 13 | 40.4 |
| 0.36, 37.66, 4.15 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.87 | 13 | 49.6 |
| -6.22, 37.68, 4.15 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.7 | 13 | 90 |
| -6.22, 37.67, 9.97 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.68, 9.97 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.7 | 13 | 90 |
| 0.13, 37.67, 4.15 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.7 | 13 | 90 |

(74 more in the JSON)

## opening (info, 52)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.00, 34.78, -4.25 | Stalle_lod2/sandstone_rubble | 0 + 0 + -1 | 1.73 |
| 0.75, 40.30, -2.15 | Stalle_lod2/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 0.75, 39.52, 2.35 | Stalle_lod2/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 11.15, 37.33, -4.25 | Stalle_lod2/sandstone_rubble | 0 + 0 + -1 | 11.2 |
| 11.20, 37.47, -4.21 | Stalle_lod2/sandstone_rubble | 1 + 0 + 0 | 2.799 |
| 10.60, 37.47, -4.23 | Stalle_lod2/sandstone_rubble | -1 + 0 + 0 | 0.163 |
| 0.75, 40.14, -2.15 | Stalle_lod2/sandstone_rubble | 0 + 0 + -1 | 14.75 |
| 0.05, 40.14, 2.35 | Stalle_lod2/sandstone_rubble | 0 + 0 + 1 | 14.75 |
| 0.15, 38.95, 2.35 | Stalle_lod2/sandstone_rubble | 0 + 0 + 1 | 10.55 |
| 10.55, 38.90, 2.35 | Stalle_lod2/sandstone_rubble | 0 + 0 + 1 | 5.75 |
| 0.32, 44.73, 0.10 | Stalle_lod2/stone_white | -1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.10 | Stalle_lod2/stone_white | 1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.33 | Stalle_lod2/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, 0.33 | Stalle_lod2/stone_white | 0 + -1 + 0 | 0.235 |
| 0.43, 44.73, -0.13 | Stalle_lod2/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, -0.13 | Stalle_lod2/stone_white | 0 + -1 + 0 | 0.235 |
| -6.67, 37.55, 4.15 | Stalle_lod2/brick_red_brussels | 0 + 0 + -1 | 4.7 |
| 0.58, 37.55, 9.97 | Stalle_lod2/brick_red_brussels | 0 + 0 + 1 | 4.7 |
| 5.88, 42.60, -0.21 | Stalle_lod2/slate | -1 + 0 + 0 | 0.72 |
| 7.12, 42.60, -0.21 | Stalle_lod2/slate | 1 + 0 + 0 | 0.72 |
| 10.33, 36.75, 7.56 | Stalle_lod2/slate | 0 + 0 + 1 | 5.14 |
| 10.28, 36.75, 7.51 | Stalle_lod2/slate | -1 + 0 + 0 | 5.21 |
| 15.42, 36.75, 7.51 | Stalle_lod2/slate | 1 + 0 + 0 | 5.507 |
| -6.27, 37.55, 3.93 | Stalle_lod2/slate | 0 + -0.65 + 0.76 | 4.86 |
| 0.18, 37.55, 10.19 | Stalle_lod2/slate | 0 + -0.65 + -0.76 | 4.86 |
| -6.27, 37.55, 10.19 | Stalle_lod2/slate | 0 + -0.65 + -0.76 | 4.86 |
| 6.52, 48.00, 0.09 | Stalle_lod2/cast_iron_green | 0.86 + 0 + -0.5 | 0.03 |
| 6.50, 48.00, 0.07 | Stalle_lod2/cast_iron_green | 0 + 0 + -1 | 0.03 |
| 6.48, 48.00, 0.09 | Stalle_lod2/cast_iron_green | -0.86 + 0 + -0.5 | 0.03 |
| 6.48, 48.00, 0.11 | Stalle_lod2/cast_iron_green | -0.86 + 0 + 0.5 | 0.03 |
| 6.50, 48.00, 0.13 | Stalle_lod2/cast_iron_green | 0 + 0 + 1 | 0.03 |
| 6.52, 48.00, 0.11 | Stalle_lod2/cast_iron_green | 0.86 + 0 + 0.5 | 0.03 |
| -6.15, 34.58, -4.60 | Stalle_lod2/cobbles | -0.02 + 1 + -0.03 | 0.5 |
| -6.60, 34.60, -3.67 | Stalle_lod2/cobbles | 0.01 + 1 + -0.03 | 0.878 |
| -6.60, 34.61, -2.79 | Stalle_lod2/cobbles | 0.08 + 0.98 + 0.17 | 0.891 |
| -6.60, 34.45, -1.92 | Stalle_lod2/cobbles | 0.26 + 0.93 + 0.27 | 0.915 |
| -6.60, 34.20, -1.04 | Stalle_lod2/cobbles | 0.19 + 0.96 + 0.21 | 0.898 |
| -6.60, 34.01, -0.16 | Stalle_lod2/cobbles | 0.17 + 0.97 + 0.19 | 0.895 |
| -6.05, 34.58, -4.60 | Stalle_lod2/cobbles | -0.01 + 1 + -0.02 | 0.5 |
| -5.55, 34.58, -4.60 | Stalle_lod2/cobbles | -0.02 + 1 + -0.02 | 0.5 |

(12 more in the JSON)

## backtoback (info, 44)

| at | parts | area |
|---|---|---|
| 0.75, 42.80, -0.25 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.0301 |
| 0.75, 41.57, -1.13 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.09763 |
| 0.75, 43.23, 0.03 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00608 |
| 0.75, 43.13, -0.05 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00123 |
| 0.75, 38.76, -2.64 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.0162 |
| 0.75, 38.08, -3.42 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.05089 |
| 0.75, 39.07, -2.31 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.01409 |
| 0.75, 38.97, -2.44 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00704 |
| 0.75, 40.08, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00008 |
| 0.75, 37.50, 4.26 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00342 |
| 0.75, 38.06, 3.63 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.06367 |
| 0.75, 39.01, 2.58 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.02113 |
| 0.75, 40.59, 2.00 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.02714 |
| 0.75, 41.90, 1.09 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.10059 |
| 0.75, 43.23, 0.16 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00731 |
| 0.75, 40.07, 2.35 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00008 |
| 11.20, 34.32, -2.20 | Stalle_lod2/sandstone_rubble + Stalle_lod2/sandstone_rubble | 0.04592 |
| 10.60, 37.50, -4.06 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.00341 |
| 10.60, 38.26, -3.21 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.06665 |
| 10.60, 39.03, -2.36 | Stalle_lod2/sandstone_rubble + Stalle_lod2/slate | 0.01816 |
| 11.22, 33.94, -2.15 | Stalle_lod2/sandstone_rubble + Stalle_lod2/sandstone_rubble | 0.05167 |
| 0.77, 38.35, -3.13 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.07892 |
| 0.77, 38.34, 3.35 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.08062 |
| 0.17, 37.65, 4.27 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.0101 |
| 0.28, 37.65, 4.32 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.01461 |
| 0.25, 37.65, 4.16 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.0372 |
| 0.52, 37.65, 4.23 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.08369 |
| 0.39, 44.23, 0.14 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.00303 |
| 0.34, 44.23, 0.10 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.00302 |
| 0.41, 44.23, 0.10 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.00302 |
| 0.36, 44.23, 0.06 | Stalle_lod2/stone_white + Stalle_lod2/stone_white | 0.00302 |
| 10.57, 38.52, -2.97 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.16033 |
| -6.25, 39.72, 5.64 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.16859 |
| -6.25, 39.97, 8.28 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.17396 |
| -6.30, 42.22, 7.31 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.08987 |
| -6.55, 42.22, 7.06 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.08824 |
| -6.19, 42.22, 7.06 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.08824 |
| -6.44, 42.22, 6.81 | Stalle_lod2/stone_white + Stalle_lod2/brick_red_brussels | 0.08987 |
| 0.16, 39.72, 8.48 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.16844 |
| 0.16, 39.97, 5.84 | Stalle_lod2/stone_white + Stalle_lod2/slate | 0.1738 |

(4 more in the JSON)


Nodes: Stalle_lod2. Distances: {"Stalle":94,"Stalle_door":334,"Stalle_slates":52,"Stalle_far":2000,"Stalle_lod1":334,"Stalle_lod2":2000}. Quantum 0.138 mm. Offset 0,30,0.
