# Mesh audit (before pack): interior.cell

119,009 triangles, 68,613 welded vertices, 17,223 open edges, 444,116 rays, 35459 ms.

**0 blocking**, 3448 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 723 |
| sliver | warn | 1060 |
| nonmanifold | warn | 434 |
| tjunction | warn | 1231 |
| seam | info | 3601 |
| opening | info | 2547 |
| backtoback | info | 3034 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 723)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 10.45, 6.89, 2.36 | Arch/brick_red_brussels + Arch/stone_white | 1.2 | 9 | 3.4 | 40 | 0.31 | false | -1 + 0 + 0 |
| 10.45, 6.89, -1.64 | Arch/brick_red_brussels + Arch/stone_white | 1.2 | 9 | 3.4 | 40 | 0.31 | false | -1 + 0 + 0 |
| 10.45, 6.89, 1.84 | Arch/brick_red_brussels + Arch/stone_white | 1.2 | 9 | 3.4 | 40 | 0.31 | false | -1 + 0 + 0 |
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

(683 more in the JSON)

## sliver (warn, 1060)

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
| 7.90, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 10.44, 8.52, -1.65 | Arch/brick_red_brussels | 110 | 2.692 |
| 10.26, 8.12, -1.65 | Arch/brick_red_brussels | 47 | 1.052 |
| 10.28, 8.08, -1.65 | Arch/brick_red_brussels | 59 | 1.112 |
| 10.31, 8.05, -1.65 | Arch/brick_red_brussels | 74 | 1.174 |
| 8.77, 10.16, -1.65 | Arch/brick_red_brussels | 69 | 2.707 |
| 7.60, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 6.93, 10.09, -1.65 | Arch/brick_red_brussels | 212 | 2.082 |
| 5.45, 10.09, -1.65 | Arch/brick_red_brussels | 75 | 0.369 |
| 6.24, 10.10, -1.65 | Arch/brick_red_brussels | 205 | 2.45 |
| 7.83, 10.17, -1.65 | Arch/brick_red_brussels | 54 | 5.154 |
| 5.50, 10.23, -1.65 | Arch/brick_red_brussels | 49 | 9.7 |
| 10.44, 8.12, -2.15 | Arch/brick_red_brussels | 61 | 1.492 |
| 10.42, 8.15, -2.15 | Arch/brick_red_brussels | 43 | 1.447 |
| 8.73, 9.09, -2.15 | Arch/brick_red_brussels | 112 | 2.617 |
| 1.97, 9.09, -2.15 | Arch/brick_red_brussels | 74 | 1.877 |
| 3.63, 9.09, -2.15 | Arch/brick_red_brussels | 95 | 2.391 |
| 4.42, 9.10, -2.15 | Arch/brick_red_brussels | 538 | 2.472 |
| 6.87, 9.09, -2.15 | Arch/brick_red_brussels | 100 | 2.311 |
| 6.10, 9.10, -2.15 | Arch/brick_red_brussels | 521 | 2.392 |
| 10.26, 8.31, 1.85 | Arch/brick_red_brussels | 44 | 1.451 |
| 10.29, 8.28, 1.85 | Arch/brick_red_brussels | 51 | 1.507 |
| 10.31, 8.24, 1.85 | Arch/brick_red_brussels | 59 | 1.565 |
| 10.33, 8.21, 1.85 | Arch/brick_red_brussels | 69 | 1.624 |
| 10.35, 8.17, 1.85 | Arch/brick_red_brussels | 100 | 1.672 |
| 7.53, 10.06, 1.85 | Arch/brick_red_brussels | 75 | 0.369 |
| 7.03, 10.09, 1.85 | Arch/brick_red_brussels | 302 | 2.082 |
| 7.90, 10.09, 1.85 | Arch/brick_red_brussels | 75 | 0.369 |
| 8.77, 10.16, 1.85 | Arch/brick_red_brussels | 69 | 2.707 |
| 5.15, 10.09, 1.85 | Arch/brick_red_brussels | 75 | 0.369 |

(1020 more in the JSON)

## nonmanifold (warn, 434)

| at | part | uses |
|---|---|---|
| 5.67, 7.00, -3.65 | Arch/brick_red_brussels | 3 |
| 5.60, 7.00, 3.85 | Arch/brick_red_brussels | 3 |
| 10.45, 4.27, 0.10 | Arch/brick_red_brussels | 3 |
| 10.45, 4.49, 0.10 | Arch/stone_white | 3 |
| 4.05, 6.80, -1.64 | Props/stone_white | 4 |
| 4.05, 6.80, -2.16 | Props/stone_white | 4 |
| 6.50, 6.80, -2.16 | Props/stone_white | 4 |
| 6.50, 6.80, -1.64 | Props/stone_white | 4 |
| 9.00, 6.80, -2.16 | Props/stone_white | 4 |
| 9.00, 6.80, -1.64 | Props/stone_white | 4 |
| 4.42, 6.59, -2.03 | Props/stone_white | 3 |
| 4.39, 6.59, -2.10 | Props/stone_white | 3 |
| 4.31, 6.59, -2.19 | Props/stone_white | 3 |
| 4.25, 6.59, -2.24 | Props/stone_white | 3 |
| 4.22, 6.59, -2.25 | Props/stone_white | 3 |
| 4.14, 6.59, -2.28 | Props/stone_white | 3 |
| 4.11, 6.59, -2.29 | Props/stone_white | 3 |
| 3.99, 6.59, -2.29 | Props/stone_white | 3 |
| 3.74, 6.59, -2.13 | Props/stone_white | 3 |
| 3.67, 6.59, -2.00 | Props/stone_white | 3 |
| 3.66, 6.59, -1.84 | Props/stone_white | 3 |
| 3.67, 6.59, -1.80 | Props/stone_white | 3 |
| 3.76, 6.59, -1.64 | Props/stone_white | 3 |
| 3.79, 6.59, -1.61 | Props/stone_white | 3 |
| 4.03, 6.59, -1.51 | Props/stone_white | 3 |
| 4.07, 6.59, -1.51 | Props/stone_white | 3 |
| 4.18, 6.59, -1.53 | Props/stone_white | 3 |
| 4.40, 6.59, -1.73 | Props/stone_white | 3 |
| 4.43, 6.59, -1.80 | Props/stone_white | 3 |
| 4.44, 6.59, -1.84 | Props/stone_white | 3 |
| 4.44, 6.59, -1.92 | Props/stone_white | 3 |
| 4.40, 6.59, -2.07 | Props/stone_white | 3 |
| 4.07, 6.59, -2.29 | Props/stone_white | 3 |
| 3.96, 6.59, -2.28 | Props/stone_white | 3 |
| 3.88, 6.59, -2.25 | Props/stone_white | 3 |
| 3.76, 6.59, -2.16 | Props/stone_white | 3 |
| 3.71, 6.59, -2.10 | Props/stone_white | 3 |
| 3.68, 6.59, -2.03 | Props/stone_white | 3 |
| 3.66, 6.59, -1.92 | Props/stone_white | 3 |
| 3.66, 6.59, -1.88 | Props/stone_white | 3 |

(394 more in the JSON)

## tjunction (warn, 1231)

| at | part | edge_m |
|---|---|---|
| 0.75, 4.32, -3.65 | Arch/brick_red_brussels | 2.73 |
| 0.75, 5.02, -1.65 | Arch/brick_red_brussels | 6.08 |
| 4.04, 7.29, -1.65 | Arch/brick_red_brussels | 0.103 |
| 4.06, 7.27, -1.65 | Arch/brick_red_brussels | 0.085 |
| 9.00, 7.21, -1.65 | Arch/brick_red_brussels | 0.093 |
| 10.36, 7.76, -1.65 | Arch/brick_red_brussels | 0.064 |
| 1.55, 6.80, -1.65 | Arch/brick_red_brussels | 3.612 |
| 10.36, 7.76, -2.15 | Arch/brick_red_brussels | 0.064 |
| 9.00, 7.21, -2.15 | Arch/brick_red_brussels | 0.093 |
| 4.04, 7.29, -2.15 | Arch/brick_red_brussels | 0.103 |
| 4.06, 7.27, -2.15 | Arch/brick_red_brussels | 0.085 |
| 0.75, 9.08, -2.15 | Arch/brick_red_brussels | 4.88 |
| 1.55, 6.80, -2.15 | Arch/brick_red_brussels | 3.612 |
| 10.45, 4.32, -2.15 | Arch/brick_red_brussels | 2.58 |
| 10.36, 7.76, 1.85 | Arch/brick_red_brussels | 0.064 |
| 9.00, 7.21, 1.85 | Arch/brick_red_brussels | 0.093 |
| 9.26, 7.76, 1.85 | Arch/brick_red_brussels | 0.064 |
| 4.04, 7.29, 1.85 | Arch/brick_red_brussels | 0.103 |
| 4.06, 7.27, 1.85 | Arch/brick_red_brussels | 0.085 |
| 0.75, 9.08, 1.85 | Arch/brick_red_brussels | 6.08 |
| 1.55, 6.80, 1.85 | Arch/brick_red_brussels | 3.612 |
| 0.75, 9.08, 2.35 | Arch/brick_red_brussels | 4.88 |
| 4.04, 7.29, 2.35 | Arch/brick_red_brussels | 0.103 |
| 4.06, 7.27, 2.35 | Arch/brick_red_brussels | 0.085 |
| 9.00, 7.21, 2.35 | Arch/brick_red_brussels | 0.093 |
| 10.45, 9.08, 2.35 | Arch/brick_red_brussels | 1.492 |
| 10.36, 7.76, 2.35 | Arch/brick_red_brussels | 0.064 |
| 9.26, 7.76, 2.35 | Arch/brick_red_brussels | 0.064 |
| 1.55, 6.80, 2.35 | Arch/brick_red_brussels | 3.612 |
| 10.45, 4.27, 2.35 | Arch/brick_red_brussels | 2.58 |
| 0.75, 4.32, -3.65 | Arch/brick_red_brussels | 0.63 |
| 0.75, 6.82, -3.65 | Arch/brick_red_brussels | 1.342 |
| 10.60, 4.32, -2.15 | Arch/brick_red_brussels | 4.83 |
| 10.45, 6.80, 2.35 | Arch/brick_red_brussels | 4.83 |
| 10.45, 6.80, -1.65 | Arch/brick_red_brussels | 6.08 |
| 10.45, 6.80, 1.85 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.44, 1.70 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.49, 1.55 | Arch/brick_red_brussels | 3.11 |
| 11.20, 4.44, -1.50 | Arch/brick_red_brussels | 6.08 |
| 11.20, 4.49, -1.35 | Arch/brick_red_brussels | 3.11 |

(1191 more in the JSON)

## seam (info, 3601)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 16.06, 6.25, -0.65 | Props/wood_frame_white + Props/wood_frame_white | 3.92 | 484 | 10.7 |
| 16.06, 6.25, 0.67 | Props/wood_frame_white + Props/wood_frame_white | 3.92 | 484 | 10.7 |
| 16.25, 7.29, 0.16 | Props/polychrome + Props/polychrome | 0.74 | 208 | 44.4 |
| 16.23, 6.56, -0.07 | Arch/brick_red_brussels + Props/polychrome | 2.49 | 129 | 54.2 |
| 9.02, 5.29, -1.64 | Props/stone_white + Props/stone_white | 0.96 | 104 | 59.2 |
| 8.98, 5.29, 1.84 | Props/stone_white + Props/stone_white | 0.96 | 102 | 59.2 |
| 16.18, 6.84, -0.03 | Props/polychrome + Props/polychrome | 0.68 | 98 | 42.7 |
| 1.55, 6.91, -1.65 | Arch/stone_white + Props/stone_white | 5 | 96 | 90 |
| 4.22, 6.85, -2.15 | Arch/stone_white + Props/stone_white | 4.89 | 96 | 90 |
| 4.22, 6.90, -1.65 | Arch/stone_white + Props/stone_white | 4.89 | 96 | 90 |
| 6.67, 6.85, -2.15 | Arch/stone_white + Props/stone_white | 4.99 | 96 | 90 |
| 6.67, 6.90, -1.65 | Arch/stone_white + Props/stone_white | 4.99 | 96 | 90 |
| 9.17, 6.83, -2.15 | Arch/stone_white + Props/stone_white | 2.85 | 96 | 90 |
| 3.88, 6.86, 2.35 | Arch/stone_white + Props/stone_white | 5 | 96 | 90 |
| 6.33, 6.90, 1.85 | Arch/stone_white + Props/stone_white | 4.89 | 96 | 90 |
| 6.33, 6.85, 2.35 | Arch/stone_white + Props/stone_white | 4.89 | 96 | 90 |
| 8.83, 6.90, 1.85 | Arch/stone_white + Props/stone_white | 4.99 | 96 | 90 |
| 8.83, 6.85, 2.35 | Arch/stone_white + Props/stone_white | 4.99 | 96 | 90 |
| 10.45, 6.86, 1.85 | Arch/stone_white + Props/stone_white | 2.85 | 96 | 90 |
| 1.55, 6.90, -2.15 | Arch/stone_white + Props/stone_white | 5 | 95 | 90 |
| 9.17, 6.86, -1.65 | Arch/stone_white + Props/stone_white | 2.85 | 95 | 90 |
| 3.88, 6.91, 1.85 | Arch/stone_white + Props/stone_white | 5 | 95 | 90 |
| 10.45, 6.86, 2.35 | Arch/stone_white + Props/stone_white | 2.85 | 95 | 90 |
| 16.23, 7.17, 0.09 | Arch/brick_red_brussels + Props/polychrome | 0.45 | 94 | 65.3 |
| 16.23, 8.91, 0.09 | Arch/brick_red_brussels + Props/polychrome | 0.47 | 91 | 83.1 |
| 10.45, 7.55, -1.43 | Arch/brick_red_brussels + Props/stone_white | 6.77 | 87 | 90 |
| 16.23, 8.37, 0.01 | Arch/brick_red_brussels + Props/polychrome | 1.33 | 73 | 66 |
| 11.20, 7.55, 1.67 | Arch/brick_red_brussels + Props/stone_white | 5.21 | 72 | 90 |
| 4.38, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 4.42, 6.59, -2.04 | Props/stone_white + Props/stone_white | 2.46 | 72 | 45 |
| 4.21, 6.59, -2.26 | Props/stone_white + Props/stone_white | 2.46 | 72 | 28.6 |
| 4.21, 6.59, -2.26 | Props/stone_white + Props/stone_white | 2.46 | 72 | 90 |
| 6.83, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 6.89, 6.59, -1.92 | Props/stone_white + Props/stone_white | 2.46 | 72 | 45 |
| 6.66, 6.59, -2.26 | Props/stone_white + Props/stone_white | 2.46 | 72 | 90 |
| 6.66, 6.59, -2.26 | Props/stone_white + Props/stone_white | 2.46 | 72 | 28.6 |
| 9.33, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 72 | 76 |
| 9.39, 6.59, -1.92 | Props/stone_white + Props/stone_white | 2.46 | 72 | 45 |
| 9.36, 6.59, -2.06 | Props/stone_white + Props/stone_white | 2.46 | 72 | 90 |
| 9.36, 6.59, -2.06 | Props/stone_white + Props/stone_white | 2.46 | 72 | 28.6 |

(3561 more in the JSON)

## opening (info, 2547)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.75, 9.08, 2.30 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 9.08, -2.10 | Arch/brick_red_brussels | 1 + 0 + 0 | 0.5 |
| 0.75, 4.27, 3.80 | Arch/brick_red_brussels | 1 + 0 + 0 | 7.5 |
| 0.80, 4.22, -1.65 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.8 |
| 10.45, 8.65, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 1.492 |
| 10.40, 9.10, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 2.617 |
| 0.80, 4.22, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.8 |
| 0.80, 9.10, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 1.877 |
| 2.85, 9.10, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 2.472 |
| 5.33, 9.10, -2.15 | Arch/brick_red_brussels | 0 + 0 + -1 | 2.392 |
| 1.55, 4.27, -2.15 | Arch/brick_red_brussels | 1 + 0 + 0 | 2.58 |
| 1.55, 4.27, -1.65 | Arch/brick_red_brussels | 1 + 0 + 0 | 2.58 |
| 10.45, 4.27, -1.65 | Arch/brick_red_brussels | -1 + 0 + 0 | 2.58 |
| 10.45, 4.22, -1.70 | Arch/brick_red_brussels | -1 + 0 + 0 | 0.5 |
| 0.80, 4.22, 1.85 | Arch/brick_red_brussels | 0 + 0 + -1 | 0.8 |
| 0.80, 4.22, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 0.8 |
| 0.80, 9.10, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 1.877 |
| 2.85, 9.10, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 2.472 |
| 10.40, 9.10, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 2.617 |
| 5.33, 9.10, 2.35 | Arch/brick_red_brussels | 0 + 0 + 1 | 2.392 |
| 1.55, 4.27, 1.85 | Arch/brick_red_brussels | 1 + 0 + 0 | 2.58 |
| 1.55, 4.27, 2.35 | Arch/brick_red_brussels | 1 + 0 + 0 | 2.58 |
| 10.45, 6.45, 1.85 | Arch/brick_red_brussels | -1 + 0 + 0 | 2.58 |
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
| 1.54, 6.85, -2.17 | Arch/stone_white | 0.96 + -0.29 + 0 | 0.111 |
| 1.54, 6.85, -1.64 | Arch/stone_white | 0.96 + -0.29 + 0 | 0.111 |
| 1.55, 6.96, -2.17 | Arch/stone_white | 1 + -0.06 + 0 | 0.106 |
| 1.55, 6.96, -1.64 | Arch/stone_white | 1 + -0.06 + 0 | 0.106 |
| 10.60, 6.54, -2.14 | Arch/stone_white | 0 + -1 + 0 | 0.18 |
| 10.64, 6.54, -2.15 | Arch/stone_white | 0 + -1 + 0 | 0.022 |

(2507 more in the JSON)

## backtoback (info, 3034)

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
| 0.19, 4.32, -0.53 | Arch/stone_white + DoorL/painted_wood_red | 0.00058 |
| 0.17, 4.32, -0.33 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.17, 4.32, -0.46 | Arch/stone_white + DoorL/painted_wood_red | 0.00286 |
| 0.18, 4.32, -0.37 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.18, 4.32, -0.50 | Arch/stone_white + DoorL/painted_wood_red | 0.00228 |
| 0.17, 4.32, -0.07 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.17, 4.32, -0.20 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.18, 4.32, -0.12 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.18, 4.32, -0.24 | Arch/stone_white + DoorL/painted_wood_red | 0.00281 |
| 0.17, 4.32, 0.06 | Arch/stone_white + DoorL/painted_wood_red | 0.00286 |

(2994 more in the JSON)


Nodes: Arch, Props, Glass, DoorL, DoorR. Distances: {"*":40}. Quantum 0.000 mm. Offset 0,0,0.
