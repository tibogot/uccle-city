# Mesh audit (packed): interior.cell

100,147 triangles, 58,218 welded vertices, 13,291 open edges, 356,384 rays, 9982 ms.

**0 blocking**, 1820 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 720 |
| sliver | warn | 799 |
| nonmanifold | warn | 22 |
| tjunction | warn | 279 |
| seam | info | 3340 |
| opening | info | 422 |
| backtoback | info | 2815 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 720)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 1.84, 4.77, -1.36 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.33 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.25 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.15 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.08 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -1.32 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -1.25 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.6 | 4.9 | 40 | 0.43 | false | -0.09 + 1 + 0 |
| 1.84, 4.77, -0.88 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.85 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.77 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.67 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.60 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -0.84 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -0.77 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.6 | 4.9 | 40 | 0.43 | false | -0.09 + 1 + 0 |
| 1.84, 4.77, 0.76 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.79 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.87 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.97 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.04 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, 0.80 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, 0.87 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.6 | 4.9 | 40 | 0.43 | false | -0.09 + 1 + 0 |
| 1.84, 4.77, 1.24 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.27 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.35 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.45 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.52 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, 1.28 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, 1.35 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.6 | 4.9 | 40 | 0.43 | false | -0.09 + 1 + 0 |
| 1.84, 4.77, -2.71 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.68 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.60 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.50 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.43 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -2.67 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.3 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 1.84, 4.76, -2.60 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.6 | 4.9 | 40 | 0.43 | false | -0.09 + 1 + 0 |
| 1.84, 4.77, -3.26 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 1 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.23 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 3.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.15 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.05 | Props/wood_frame_dark + Props/wood_frame_dark | 0.88 | 3.5 | 4.9 | 40 | 0.43 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.98 | Props/wood_frame_dark + Props/wood_frame_dark | 1.22 | 2.4 | 0 | 40 | 0.43 | false | 0 + 1 + 0 |

(680 more in the JSON)

## sliver (warn, 799)

| at | part | aspect | longest |
|---|---|---|---|
| 0.75, 4.29, 0.33 | Arch/brick_red_brussels | 150 | 7.5 |
| 0.75, 4.30, -1.15 | Arch/brick_red_brussels | 283 | 4.45 |
| 0.75, 10.28, 0.10 | Arch/brick_red_brussels | 70 | 3.5 |
| 2.02, 10.09, -1.65 | Arch/brick_red_brussels | 55 | 1.959 |
| 2.06, 10.10, -1.65 | Arch/brick_red_brussels | 81 | 2.012 |
| 2.10, 10.11, -1.65 | Arch/brick_red_brussels | 151 | 2.069 |
| 4.79, 9.90, -1.65 | Arch/brick_red_brussels | 76 | 1.165 |
| 3.31, 9.90, -1.65 | Arch/brick_red_brussels | 76 | 1.165 |
| 3.65, 10.00, -1.65 | Arch/brick_red_brussels | 140 | 2.327 |
| 4.43, 10.01, -1.65 | Arch/brick_red_brussels | 139 | 2.383 |
| 3.63, 10.02, -1.65 | Arch/brick_red_brussels | 427 | 2.441 |
| 4.45, 10.02, -1.65 | Arch/brick_red_brussels | 427 | 2.5 |
| 7.34, 9.90, -1.65 | Arch/brick_red_brussels | 80 | 0.876 |
| 10.17, 8.02, -1.65 | Arch/brick_red_brussels | 43 | 1.182 |
| 10.19, 7.98, -1.65 | Arch/brick_red_brussels | 51 | 1.237 |
| 10.21, 7.95, -1.65 | Arch/brick_red_brussels | 61 | 1.294 |
| 10.23, 7.91, -1.65 | Arch/brick_red_brussels | 76 | 1.351 |
| 10.25, 7.87, -1.65 | Arch/brick_red_brussels | 94 | 1.41 |
| 10.45, 7.99, -1.65 | Arch/brick_red_brussels | 2389 | 3.5 |
| 10.45, 8.03, -1.65 | Arch/brick_red_brussels | 999 | 3.439 |
| 10.45, 8.07, -1.65 | Arch/brick_red_brussels | 568 | 3.379 |
| 10.44, 8.11, -1.65 | Arch/brick_red_brussels | 369 | 3.318 |
| 10.43, 8.15, -1.65 | Arch/brick_red_brussels | 294 | 3.258 |
| 10.43, 8.19, -1.65 | Arch/brick_red_brussels | 241 | 3.199 |
| 10.42, 8.23, -1.65 | Arch/brick_red_brussels | 191 | 3.14 |
| 10.40, 8.27, -1.65 | Arch/brick_red_brussels | 165 | 3.081 |
| 10.39, 8.30, -1.65 | Arch/brick_red_brussels | 141 | 3.024 |
| 10.26, 7.84, -1.65 | Arch/brick_red_brussels | 119 | 1.469 |
| 8.26, 9.90, -1.65 | Arch/brick_red_brussels | 76 | 1.165 |
| 8.71, 10.10, -1.65 | Arch/brick_red_brussels | 115 | 2.657 |
| 8.67, 10.11, -1.65 | Arch/brick_red_brussels | 229 | 2.715 |
| 5.71, 9.90, -1.65 | Arch/brick_red_brussels | 79 | 0.876 |
| 6.14, 10.00, -1.65 | Arch/brick_red_brussels | 137 | 2.277 |
| 6.89, 10.01, -1.65 | Arch/brick_red_brussels | 137 | 2.333 |
| 6.12, 10.02, -1.65 | Arch/brick_red_brussels | 418 | 2.391 |
| 6.91, 10.02, -1.65 | Arch/brick_red_brussels | 418 | 2.45 |
| 10.45, 7.59, -2.15 | Arch/brick_red_brussels | 1570 | 2.3 |
| 10.45, 7.63, -2.15 | Arch/brick_red_brussels | 648 | 2.24 |
| 10.45, 7.67, -2.15 | Arch/brick_red_brussels | 363 | 2.179 |
| 10.44, 7.71, -2.15 | Arch/brick_red_brussels | 233 | 2.119 |

(759 more in the JSON)

## nonmanifold (warn, 22)

| at | part | uses |
|---|---|---|
| 5.67, 7.00, -3.65 | Arch/brick_red_brussels | 3 |
| 5.60, 7.00, 3.85 | Arch/brick_red_brussels | 3 |
| 10.45, 4.27, 0.10 | Arch/brick_red_brussels | 3 |
| 10.45, 4.49, 0.10 | Arch/stone_white | 3 |
| 16.16, 7.45, 0.45 | Props/wood_frame_white | 3 |
| 16.16, 7.55, 0.42 | Props/wood_frame_white | 3 |
| 16.16, 7.64, 0.35 | Props/wood_frame_white | 3 |
| 16.16, 6.90, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 7.71, 0.26 | Props/wood_frame_white | 3 |
| 16.16, 7.74, 0.16 | Props/wood_frame_white | 3 |
| 16.16, 7.74, 0.04 | Props/wood_frame_white | 3 |
| 16.16, 7.71, -0.06 | Props/wood_frame_white | 3 |
| 16.16, 7.64, -0.15 | Props/wood_frame_white | 3 |
| 16.16, 7.55, -0.22 | Props/wood_frame_white | 3 |
| 16.16, 7.45, -0.25 | Props/wood_frame_white | 3 |
| 16.16, 6.58, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.90, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.58, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 7.23, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 6.25, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 7.23, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.25, 0.46 | Props/wood_frame_white | 3 |

## tjunction (warn, 279)

| at | part | edge_m |
|---|---|---|
| 0.75, 4.32, -3.65 | Arch/brick_red_brussels | 2.73 |
| 0.75, 5.02, -1.65 | Arch/brick_red_brussels | 6.08 |
| 0.75, 9.08, -2.15 | Arch/brick_red_brussels | 4.88 |
| 10.45, 6.68, -1.65 | Arch/brick_red_brussels | 2.58 |
| 10.45, 4.32, -2.15 | Arch/brick_red_brussels | 2.58 |
| 0.75, 9.08, 1.85 | Arch/brick_red_brussels | 6.08 |
| 0.75, 9.08, 2.35 | Arch/brick_red_brussels | 4.88 |
| 10.45, 9.08, 2.35 | Arch/brick_red_brussels | 2.3 |
| 10.45, 4.27, 2.35 | Arch/brick_red_brussels | 2.58 |
| 10.45, 6.68, 1.85 | Arch/brick_red_brussels | 2.58 |
| 0.75, 4.32, -3.65 | Arch/brick_red_brussels | 0.63 |
| 0.75, 6.82, -3.65 | Arch/brick_red_brussels | 1.342 |
| 10.60, 4.32, -2.15 | Arch/brick_red_brussels | 4.83 |
| 10.45, 6.68, 2.35 | Arch/brick_red_brussels | 4.83 |
| 10.45, 6.68, -1.65 | Arch/brick_red_brussels | 6.08 |
| 10.45, 6.68, 1.85 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.49, 1.55 | Arch/brick_red_brussels | 3.11 |
| 11.20, 4.44, 1.70 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.44, -1.50 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.49, -1.35 | Arch/brick_red_brussels | 3.11 |
| 11.20, 4.49, -1.50 | Arch/brick_red_brussels | 5.86 |
| 11.20, 4.49, 1.70 | Arch/brick_red_brussels | 5.86 |
| 10.45, 4.45, 1.55 | Arch/stone_white | 0.22 |
| 10.45, 4.45, -1.35 | Arch/stone_white | 0.22 |
| 0.37, 4.32, -0.53 | Arch/stone_white | 1.4 |
| 0.75, 6.42, -0.60 | Arch/stone_white | 1.5 |
| 1.86, 8.02, -1.65 | Arch/stone_white | 0.108 |
| 2.54, 8.83, -1.65 | Arch/stone_white | 0.108 |
| 2.63, 8.89, -1.65 | Arch/stone_white | 0.108 |
| 2.80, 8.89, -1.65 | Arch/stone_white | 0.108 |
| 2.89, 8.83, -1.65 | Arch/stone_white | 0.108 |
| 3.57, 8.02, -1.65 | Arch/stone_white | 0.108 |
| 3.62, 7.93, -1.65 | Arch/stone_white | 0.109 |
| 3.88, 6.91, -1.65 | Arch/stone_white | 0.112 |
| 4.05, 6.87, -1.65 | Arch/stone_white | 0.225 |
| 3.88, 6.91, -2.15 | Arch/stone_white | 0.112 |
| 4.05, 6.87, -2.15 | Arch/stone_white | 0.225 |
| 3.62, 7.93, -2.15 | Arch/stone_white | 0.109 |
| 3.57, 8.02, -2.15 | Arch/stone_white | 0.108 |
| 2.89, 8.83, -2.15 | Arch/stone_white | 0.108 |

(239 more in the JSON)

## seam (info, 3340)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 16.06, 6.25, -0.65 | Props/wood_frame_white + Props/wood_frame_white | 3.89 | 480 | 10.2 |
| 16.06, 6.25, 0.67 | Props/wood_frame_white + Props/wood_frame_white | 3.9 | 480 | 10.2 |
| 16.23, 6.56, -0.07 | Arch/brick_red_brussels + Props/polychrome | 2.49 | 127 | 54.1 |
| 16.18, 6.84, -0.03 | Props/polychrome + Props/polychrome | 0.68 | 98 | 42.9 |
| 4.42, 6.68, -2.04 | Props/stone_white + Props/stone_white | 2.36 | 80 | 43 |
| 6.89, 6.68, -1.92 | Props/stone_white + Props/stone_white | 2.39 | 80 | 41.7 |
| 9.39, 6.68, -1.92 | Props/stone_white + Props/stone_white | 2.32 | 80 | 39.9 |
| 4.44, 6.68, 2.04 | Props/stone_white + Props/stone_white | 2.37 | 80 | 42.9 |
| 6.81, 6.68, 1.87 | Props/stone_white + Props/stone_white | 2.4 | 80 | 42.3 |
| 9.39, 6.68, 2.04 | Props/stone_white + Props/stone_white | 2.33 | 80 | 40.2 |
| 6.83, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 9.33, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.3 |
| 4.38, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 6.83, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 9.33, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.4 |
| 4.38, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 75 | 75.6 |
| 8.83, 6.72, -1.47 | Props/stone_white + Props/polychrome | 1.37 | 75 | 39.8 |
| 16.16, 6.09, -0.34 | Props/wood_frame_white + Props/wood_frame_white | 3.98 | 74 | 78.6 |
| 0.20, 8.36, 0.43 | Arch/stone_white + Glass/glass_window | 4.01 | 70 | 90 |
| 0.20, 8.36, -0.13 | Arch/stone_white + Glass/glass_window | 4.01 | 70 | 90 |
| 0.20, 8.36, -0.69 | Arch/stone_white + Glass/glass_window | 4.01 | 70 | 90 |
| 12.90, 8.53, -1.95 | Arch/stone_white + Glass/glass_window | 4.24 | 70 | 90 |
| 13.44, 8.53, -1.95 | Arch/stone_white + Glass/glass_window | 4.24 | 70 | 90 |
| 0.41, 5.34, 0.21 | DoorR/painted_wood_red + DoorR/cast_iron_green | 0.44 | 70 | 90 |
| 16.23, 8.37, 0.01 | Arch/brick_red_brussels + Props/polychrome | 1.33 | 69 | 65.9 |
| 16.23, 6.25, -0.26 | Arch/brick_red_brussels + Props/wood_frame_white | 4.45 | 60 | 90 |
| 16.25, 7.29, 0.16 | Props/polychrome + Props/polychrome | 0.73 | 60 | 47 |
| 11.23, 4.49, -1.50 | Arch/brick_red_brussels + Arch/marble_chequer | 12.13 | 57 | 90 |
| 13.12, 9.45, -1.95 | Arch/stone_white + Glass/glass_window | 1.22 | 56 | 90 |
| 9.18, 6.57, 1.79 | Props/stone_white + Props/stone_white | 0.62 | 55 | 58.8 |
| 8.82, 6.58, -1.58 | Props/stone_white + Props/stone_white | 0.62 | 53 | 58.8 |
| 8.86, 6.72, 1.67 | Props/stone_white + Props/polychrome | 1.17 | 52 | 43.3 |
| 0.39, 6.37, -0.06 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, -0.19 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, -0.32 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.58 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.46 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.33 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 16.21, 4.64, -0.87 | Arch/brick_red_brussels + Props/stone_white | 1.73 | 45 | 21.7 |
| 15.11, 4.64, 0.29 | Props/stone_white + Props/stone_white | 4.4 | 44 | 90 |

(3300 more in the JSON)

## opening (info, 422)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.75, 9.08, 2.30 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 9.08, -2.10 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 4.27, 3.80 | Arch/brick_red_brussels | 1 + 0 + 0 | 7.5 |
| 1.55, 6.85, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.106 |
| 0.80, 4.22, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.8 |
| 10.45, 6.83, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.061 |
| 10.45, 8.65, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 2.3 |
| 0.80, 4.22, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.8 |
| 1.55, 6.85, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.106 |
| 10.40, 9.10, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 9.7 |
| 1.55, 4.22, -1.70 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 10.45, 4.22, -1.70 | Arch/brick_red_brussels | -1 + 0 + 0 | 0.5 |
| 10.45, 6.83, 1.85 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.061 |
| 0.80, 4.22, 1.85 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.8 |
| 1.55, 6.85, 1.85 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.106 |
| 0.80, 4.22, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.8 |
| 1.55, 6.85, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.106 |
| 10.45, 6.83, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.061 |
| 0.80, 9.10, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 9.7 |
| 1.55, 4.22, 1.90 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 10.45, 4.22, 2.30 | Arch/brick_red_brussels | -1 + 0 + 0 | 0.5 |
| 0.80, 4.27, -3.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 9.85 |
| 10.60, 4.27, -3.60 | Arch/brick_red_brussels | -1 + 0 + 0 | 1.5 |
| 0.80, 4.27, 3.85 | Arch/brick_red_brussels | 0 + 0 + -1 | 9.7 |
| 10.45, 4.27, 3.80 | Arch/brick_red_brussels | -1 + 0 + 0 | 1.5 |
| 10.45, 4.22, -1.60 | Arch/brick_red_brussels | -1 + 0 + 0 | 3.5 |
| 11.20, 4.22, 1.65 | Arch/brick_red_brussels | 1 + 0 + 0 | 3.2 |
| 11.25, 4.44, -1.50 | Arch/brick_red_brussels | 0 + 0 + 1 | 3.425 |
| 14.67, 4.44, -1.48 | Arch/brick_red_brussels | -0.37 + 0 + 0.93 | 1.728 |
| 16.23, 4.44, -0.81 | Arch/brick_red_brussels | -1 + 0 + 0 | 1.919 |
| 16.18, 4.44, 1.08 | Arch/brick_red_brussels | -0.37 + 0 + -0.93 | 1.728 |
| 14.57, 4.44, 1.70 | Arch/brick_red_brussels | 0 + 0 + -1 | 3.425 |
| 1.83, 7.97, -1.65 | Arch/stone_white | 0.89 + -0.45 + 0 | 0.108 |
| 2.67, 9.12, -2.15 | Arch/stone_white | -0.53 + 0.84 + 0 | 0.114 |
| 2.76, 9.12, -2.15 | Arch/stone_white | 0.53 + 0.85 + 0 | 0.114 |
| 1.83, 7.97, -2.15 | Arch/stone_white | 0.89 + -0.45 + 0 | 0.108 |
| 4.39, 7.73, -1.65 | Arch/stone_white | 0.93 + -0.35 + 0 | 0.104 |
| 5.23, 9.07, -2.15 | Arch/stone_white | -0.59 + 0.81 + 0 | 0.109 |
| 5.32, 9.07, -2.15 | Arch/stone_white | 0.59 + 0.81 + 0 | 0.109 |
| 4.39, 7.73, -2.15 | Arch/stone_white | 0.93 + -0.35 + 0 | 0.104 |

(382 more in the JSON)

## backtoback (info, 2815)

| at | parts | area |
|---|---|---|
| 0.75, 6.93, 3.84 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00296 |
| 0.75, 6.93, 3.83 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00513 |
| 0.75, 6.91, 3.80 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.0027 |
| 0.75, 6.95, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00983 |
| 0.75, 7.00, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00096 |
| 0.75, 6.84, -3.62 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00187 |
| 0.75, 6.92, -3.64 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00365 |
| 0.75, 6.89, -3.56 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00874 |
| 0.75, 6.97, -3.62 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00582 |
| 0.75, 6.98, -3.54 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00019 |
| 0.75, 6.99, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00133 |
| 10.60, 6.93, -3.64 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00296 |
| 10.60, 6.93, -3.63 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00513 |
| 10.60, 6.91, -3.60 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.0027 |
| 10.60, 6.95, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00983 |
| 10.60, 7.00, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00096 |
| 10.45, 6.72, 2.38 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 6.76, 2.40 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 5.27, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00695 |
| 10.45, 5.25, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 2.51 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 5.25, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00695 |
| 10.45, 5.27, 3.69 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 6.85, 3.80 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00389 |
| 10.45, 6.93, 3.84 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00482 |
| 10.45, 6.90, 3.75 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00676 |
| 10.45, 6.98, 3.82 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00479 |
| 10.45, 6.99, 3.73 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00014 |
| 10.45, 7.00, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00118 |
| 10.45, 6.74, -1.63 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 6.76, -1.60 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 6.72, 1.80 | Arch/brick_red_brussels + Arch/stone_white | 0.0048 |
| 10.45, 6.76, 1.82 | Arch/brick_red_brussels + Arch/stone_white | 0.0048 |
| 0.41, 4.32, -0.51 | Arch/stone_white + DoorL/painted_wood_red | 0.00173 |
| 0.39, 4.32, -0.33 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.39, 4.32, -0.46 | Arch/stone_white + DoorL/painted_wood_red | 0.00286 |
| 0.40, 4.32, -0.37 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |

(2775 more in the JSON)


Nodes: Arch, Props, Glass, DoorL, DoorR. Distances: {"*":40}. Quantum 0.128 mm. Offset 0,0,0.
