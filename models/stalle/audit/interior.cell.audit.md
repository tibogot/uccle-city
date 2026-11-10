# Mesh audit (before pack): interior.cell

102,513 triangles, 59,405 welded vertices, 13,311 open edges, 358,850 rays, 8350 ms.

**0 blocking**, 1801 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 720 |
| sliver | warn | 782 |
| nonmanifold | warn | 30 |
| tjunction | warn | 269 |
| seam | info | 3231 |
| opening | info | 428 |
| backtoback | info | 2913 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 720)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 1.84, 4.77, -1.36 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.33 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.25 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.15 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -1.08 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -1.32 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -1.25 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.6 | 4.8 | 40 | 0.31 | false | -0.08 + 1 + 0 |
| 1.84, 4.77, -0.88 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.85 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.77 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.67 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -0.60 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -0.84 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -0.77 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.6 | 4.8 | 40 | 0.31 | false | -0.08 + 1 + 0 |
| 1.84, 4.77, 0.76 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.79 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.87 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 0.97 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.04 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, 0.80 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, 0.87 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.6 | 4.8 | 40 | 0.31 | false | -0.08 + 1 + 0 |
| 1.84, 4.77, 1.24 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.27 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.35 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.45 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, 1.52 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, 1.28 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, 1.35 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.6 | 4.8 | 40 | 0.31 | false | -0.08 + 1 + 0 |
| 1.84, 4.77, -2.71 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.68 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.60 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.50 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.43 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -2.67 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 1.84, 4.76, -2.60 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.6 | 4.8 | 40 | 0.31 | false | -0.08 + 1 + 0 |
| 1.84, 4.77, -3.26 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 1 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.23 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 3.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.15 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -3.05 | Props/wood_frame_dark + Props/wood_frame_dark | 0.66 | 3.5 | 4.8 | 40 | 0.31 | false | 0 + 1 + 0 |
| 2.16, 4.77, -2.98 | Props/wood_frame_dark + Props/wood_frame_dark | 1 | 2.3 | 0 | 40 | 0.31 | false | 0 + 1 + 0 |

(680 more in the JSON)

## sliver (warn, 782)

| at | part | aspect | longest |
|---|---|---|---|
| 0.75, 4.29, 0.33 | Arch/brick_red_brussels | 150 | 7.5 |
| 0.75, 4.30, -1.15 | Arch/brick_red_brussels | 283 | 4.45 |
| 0.75, 10.28, 0.10 | Arch/brick_red_brussels | 70 | 3.5 |
| 2.95, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 2.65, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 1.99, 10.16, -1.65 | Arch/brick_red_brussels | 43 | 2.06 |
| 2.24, 10.16, -1.65 | Arch/brick_red_brussels | 120 | 2.428 |
| 5.15, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 2.95, 10.16, -1.65 | Arch/brick_red_brussels | 47 | 4.187 |
| 3.66, 10.16, -1.65 | Arch/brick_red_brussels | 162 | 4.554 |
| 7.60, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 6.93, 10.09, -1.65 | Arch/brick_red_brussels | 212 | 2.082 |
| 10.45, 7.99, -1.65 | Arch/brick_red_brussels | 2922 | 3.5 |
| 10.45, 8.03, -1.65 | Arch/brick_red_brussels | 952 | 3.439 |
| 10.45, 8.07, -1.65 | Arch/brick_red_brussels | 557 | 3.379 |
| 10.44, 8.11, -1.65 | Arch/brick_red_brussels | 388 | 3.318 |
| 10.43, 8.15, -1.65 | Arch/brick_red_brussels | 294 | 3.258 |
| 10.43, 8.19, -1.65 | Arch/brick_red_brussels | 235 | 3.199 |
| 10.42, 8.23, -1.65 | Arch/brick_red_brussels | 194 | 3.14 |
| 10.40, 8.27, -1.65 | Arch/brick_red_brussels | 164 | 3.081 |
| 10.39, 8.30, -1.65 | Arch/brick_red_brussels | 141 | 3.024 |
| 10.17, 8.02, -1.65 | Arch/brick_red_brussels | 43 | 1.181 |
| 10.19, 7.98, -1.65 | Arch/brick_red_brussels | 51 | 1.237 |
| 10.21, 7.95, -1.65 | Arch/brick_red_brussels | 62 | 1.294 |
| 10.23, 7.91, -1.65 | Arch/brick_red_brussels | 75 | 1.351 |
| 10.25, 7.87, -1.65 | Arch/brick_red_brussels | 94 | 1.41 |
| 10.26, 7.84, -1.65 | Arch/brick_red_brussels | 121 | 1.469 |
| 7.90, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 8.77, 10.16, -1.65 | Arch/brick_red_brussels | 69 | 2.707 |
| 5.45, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 6.24, 10.10, -1.65 | Arch/brick_red_brussels | 205 | 2.45 |
| 7.83, 10.17, -1.65 | Arch/brick_red_brussels | 54 | 5.154 |
| 5.50, 10.23, -1.65 | Arch/brick_red_brussels | 49 | 9.7 |
| 10.45, 7.59, -2.15 | Arch/brick_red_brussels | 1920 | 2.3 |
| 10.45, 7.63, -2.15 | Arch/brick_red_brussels | 618 | 2.239 |
| 10.45, 7.67, -2.15 | Arch/brick_red_brussels | 356 | 2.179 |
| 10.44, 7.71, -2.15 | Arch/brick_red_brussels | 244 | 2.119 |
| 10.43, 7.75, -2.15 | Arch/brick_red_brussels | 182 | 2.059 |
| 10.43, 7.79, -2.15 | Arch/brick_red_brussels | 143 | 1.999 |
| 10.42, 7.83, -2.15 | Arch/brick_red_brussels | 116 | 1.94 |

(742 more in the JSON)

## nonmanifold (warn, 30)

| at | part | uses |
|---|---|---|
| 5.67, 7.00, -3.65 | Arch/brick_red_brussels | 3 |
| 5.60, 7.00, 3.85 | Arch/brick_red_brussels | 3 |
| 10.45, 4.27, 0.10 | Arch/brick_red_brussels | 3 |
| 10.45, 4.49, 0.10 | Arch/stone_white | 3 |
| 16.16, 7.46, -0.33 | Props/wood_frame_white | 3 |
| 16.16, 7.71, -0.06 | Props/wood_frame_white | 3 |
| 16.16, 7.78, -0.10 | Props/wood_frame_white | 3 |
| 16.16, 7.64, -0.15 | Props/wood_frame_white | 3 |
| 16.16, 7.70, -0.21 | Props/wood_frame_white | 3 |
| 16.16, 7.45, -0.25 | Props/wood_frame_white | 3 |
| 16.16, 7.55, -0.22 | Props/wood_frame_white | 3 |
| 16.16, 7.59, -0.29 | Props/wood_frame_white | 3 |
| 16.16, 7.71, 0.26 | Props/wood_frame_white | 3 |
| 16.16, 7.74, 0.16 | Props/wood_frame_white | 3 |
| 16.16, 7.64, 0.35 | Props/wood_frame_white | 3 |
| 16.16, 7.70, 0.41 | Props/wood_frame_white | 3 |
| 16.16, 7.78, 0.30 | Props/wood_frame_white | 3 |
| 16.16, 7.46, 0.53 | Props/wood_frame_white | 3 |
| 16.16, 7.45, 0.45 | Props/wood_frame_white | 3 |
| 16.16, 7.55, 0.42 | Props/wood_frame_white | 3 |
| 16.16, 7.59, 0.49 | Props/wood_frame_white | 3 |
| 16.16, 7.74, 0.04 | Props/wood_frame_white | 3 |
| 16.16, 6.90, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 6.58, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.90, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.58, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 7.23, 0.46 | Props/wood_frame_white | 3 |
| 16.16, 6.25, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 7.23, -0.26 | Props/wood_frame_white | 3 |
| 16.16, 6.25, 0.46 | Props/wood_frame_white | 3 |

## tjunction (warn, 269)

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
| 11.20, 4.44, 1.70 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.49, 1.55 | Arch/brick_red_brussels | 3.11 |
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
| 3.88, 6.91, -1.65 | Arch/stone_white | 0.112 |
| 4.05, 6.86, -1.65 | Arch/stone_white | 0.225 |
| 3.88, 6.91, -2.15 | Arch/stone_white | 0.112 |
| 4.05, 6.86, -2.15 | Arch/stone_white | 0.225 |
| 3.57, 8.02, -2.15 | Arch/stone_white | 0.108 |
| 2.89, 8.83, -2.15 | Arch/stone_white | 0.108 |
| 2.80, 8.89, -2.15 | Arch/stone_white | 0.108 |
| 2.63, 8.89, -2.15 | Arch/stone_white | 0.108 |

(229 more in the JSON)

## seam (info, 3231)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 16.06, 6.25, -0.65 | Props/wood_frame_white + Props/wood_frame_white | 3.92 | 484 | 10.7 |
| 16.06, 6.25, 0.67 | Props/wood_frame_white + Props/wood_frame_white | 3.92 | 484 | 10.7 |
| 16.23, 6.56, -0.07 | Arch/brick_red_brussels + Props/polychrome | 2.49 | 129 | 54.2 |
| 9.02, 5.29, -1.64 | Props/stone_white + Props/stone_white | 0.96 | 104 | 59.2 |
| 8.98, 5.29, 1.84 | Props/stone_white + Props/stone_white | 0.96 | 102 | 59.2 |
| 16.18, 6.84, -0.03 | Props/polychrome + Props/polychrome | 0.68 | 98 | 42.7 |
| 16.23, 8.37, 0.01 | Arch/brick_red_brussels + Props/polychrome | 1.33 | 73 | 66 |
| 4.38, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 4.42, 6.68, -2.04 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 6.83, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 6.89, 6.68, -1.92 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 9.33, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 9.39, 6.68, -1.92 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 4.38, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 4.44, 6.68, 2.04 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 6.83, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 6.81, 6.68, 1.87 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 9.33, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 9.39, 6.68, 2.04 | Props/stone_white + Props/stone_white | 2.37 | 72 | 45 |
| 0.20, 8.83, 0.43 | Arch/stone_white + Glass/glass_window | 5.15 | 70 | 90 |
| 0.20, 8.83, -0.13 | Arch/stone_white + Glass/glass_window | 5.15 | 70 | 90 |
| 0.20, 8.83, -0.69 | Arch/stone_white + Glass/glass_window | 5.15 | 70 | 90 |
| 12.90, 8.53, -1.95 | Arch/stone_white + Glass/glass_window | 4.24 | 70 | 90 |
| 13.44, 8.53, -1.95 | Arch/stone_white + Glass/glass_window | 4.24 | 70 | 90 |
| 0.41, 5.34, 0.21 | DoorR/painted_wood_red + DoorR/cast_iron_green | 0.44 | 70 | 90 |
| 16.23, 6.25, -0.26 | Arch/brick_red_brussels + Props/wood_frame_white | 4.45 | 60 | 90 |
| 16.25, 7.29, 0.16 | Props/polychrome + Props/polychrome | 0.73 | 60 | 47.4 |
| 0.75, 6.82, 3.83 | Arch/brick_red_brussels + Arch/wood_frame_dark | 9.17 | 58 | 90 |
| 0.83, 6.82, -3.65 | Arch/brick_red_brussels + Arch/wood_frame_dark | 9.02 | 57 | 90 |
| 11.23, 4.49, -1.50 | Arch/brick_red_brussels + Arch/marble_chequer | 12.08 | 56 | 90 |
| 0.20, 9.86, 0.35 | Arch/stone_white + Glass/glass_window | 0.61 | 56 | 90 |
| 0.20, 9.86, -0.33 | Arch/stone_white + Glass/glass_window | 0.61 | 56 | 90 |
| 13.12, 9.45, -1.95 | Arch/stone_white + Glass/glass_window | 1.22 | 56 | 90 |
| 0.39, 6.37, -0.06 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, -0.19 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, -0.32 | DoorL/painted_wood_red + DoorL/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.58 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.46 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 0.39, 6.37, 0.33 | DoorR/painted_wood_red + DoorR/painted_wood_red | 4.34 | 52 | 90 |
| 8.95, 5.59, -1.65 | Props/stone_white + Props/polychrome | 0.58 | 51 | 9.2 |

(3191 more in the JSON)

## opening (info, 428)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.75, 9.08, 2.30 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 9.08, -2.10 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 4.27, 3.80 | Arch/brick_red_brussels | 1 + 0 + 0 | 7.5 |
| 0.80, 4.22, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.8 |
| 1.55, 6.85, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.106 |
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
| 2.67, 9.12, -2.15 | Arch/stone_white | -0.54 + 0.84 + 0 | 0.114 |
| 2.76, 9.12, -2.15 | Arch/stone_white | 0.54 + 0.84 + 0 | 0.114 |
| 5.23, 9.07, -2.15 | Arch/stone_white | -0.59 + 0.81 + 0 | 0.109 |
| 5.32, 9.07, -2.15 | Arch/stone_white | 0.59 + 0.81 + 0 | 0.109 |
| 7.71, 9.12, -2.15 | Arch/stone_white | -0.58 + 0.81 + 0 | 0.111 |
| 7.79, 9.12, -2.15 | Arch/stone_white | 0.58 + 0.81 + 0 | 0.111 |
| 10.44, 7.01, -1.65 | Arch/stone_white | 1 + 0 + 0 | 0.297 |
| 10.44, 7.01, -2.15 | Arch/stone_white | 1 + 0 + 0 | 0.297 |

(388 more in the JSON)

## backtoback (info, 2913)

| at | parts | area |
|---|---|---|
| 0.75, 6.91, 3.84 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00297 |
| 0.75, 6.93, 3.83 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00514 |
| 0.75, 6.91, 3.80 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.0027 |
| 0.75, 6.95, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00984 |
| 0.75, 7.00, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00096 |
| 0.75, 6.84, -3.62 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00187 |
| 0.75, 6.92, -3.64 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00366 |
| 0.75, 6.89, -3.56 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00874 |
| 0.75, 6.97, -3.62 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00582 |
| 0.75, 6.98, -3.54 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00019 |
| 0.75, 6.99, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00133 |
| 10.60, 6.91, -3.64 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00297 |
| 10.60, 6.93, -3.63 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00514 |
| 10.60, 6.91, -3.60 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.0027 |
| 10.60, 6.95, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00984 |
| 10.60, 7.00, -3.59 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00096 |
| 10.45, 6.76, 2.38 | Arch/brick_red_brussels + Arch/stone_white | 0.0048 |
| 10.45, 6.71, 2.38 | Arch/brick_red_brussels + Arch/stone_white | 0.00037 |
| 10.45, 6.74, 2.39 | Arch/brick_red_brussels + Arch/stone_white | 0.0006 |
| 10.45, 6.77, 2.42 | Arch/brick_red_brussels + Arch/stone_white | 0.00015 |
| 10.45, 5.27, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00694 |
| 10.45, 5.25, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 2.51 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 5.27, 3.69 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 6.84, 3.81 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00319 |
| 10.45, 6.93, 3.84 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00449 |
| 10.45, 5.25, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00694 |
| 10.45, 6.90, 3.75 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00747 |
| 10.45, 6.97, 3.82 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00514 |
| 10.45, 6.99, 3.73 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00014 |
| 10.45, 7.00, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00118 |
| 10.45, 6.76, -1.62 | Arch/brick_red_brussels + Arch/stone_white | 0.0048 |
| 10.45, 6.71, -1.63 | Arch/brick_red_brussels + Arch/stone_white | 0.00037 |
| 10.45, 6.74, -1.61 | Arch/brick_red_brussels + Arch/stone_white | 0.0006 |
| 10.45, 6.77, -1.58 | Arch/brick_red_brussels + Arch/stone_white | 0.00015 |
| 10.45, 6.71, 1.84 | Arch/brick_red_brussels + Arch/stone_white | 0.0015 |
| 10.45, 6.76, 1.83 | Arch/brick_red_brussels + Arch/stone_white | 0.00187 |

(2873 more in the JSON)


Nodes: Arch, Props, Glass, DoorL, DoorR. Distances: {"*":40}. Quantum 0.000 mm. Offset 0,0,0.
