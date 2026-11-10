# Mesh audit (packed): interior.cell

117,705 triangles, 67,243 welded vertices, 15,171 open edges, 401,294 rays, 13042 ms.

**1 blocking**, 3593 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| leak | block | 1 |
| near | warn | 720 |
| sliver | warn | 1022 |
| nonmanifold | warn | 1220 |
| tjunction | warn | 631 |
| seam | info | 3427 |
| opening | info | 592 |
| backtoback | info | 3071 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## leak (block, 1)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 10.45, 8.78, -1.03 | Arch/stone_white | 4 | 0 + -0.49 + 0.87 | 0.07 |

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

## sliver (warn, 1022)

| at | part | aspect | longest |
|---|---|---|---|
| 0.75, 4.29, 0.33 | Arch/brick_red_brussels | 150 | 7.5 |
| 0.75, 4.30, -1.15 | Arch/brick_red_brussels | 283 | 4.45 |
| 0.75, 10.28, 0.10 | Arch/brick_red_brussels | 70 | 3.5 |
| 2.95, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 2.65, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 1.99, 10.16, -1.65 | Arch/brick_red_brussels | 43 | 2.06 |
| 2.24, 10.16, -1.65 | Arch/brick_red_brussels | 122 | 2.428 |
| 5.15, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 2.95, 10.16, -1.65 | Arch/brick_red_brussels | 47 | 4.187 |
| 3.66, 10.16, -1.65 | Arch/brick_red_brussels | 161 | 4.554 |
| 7.60, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 6.93, 10.09, -1.65 | Arch/brick_red_brussels | 207 | 2.082 |
| 10.45, 7.99, -1.65 | Arch/brick_red_brussels | 2389 | 3.5 |
| 10.45, 8.03, -1.65 | Arch/brick_red_brussels | 999 | 3.439 |
| 10.45, 8.07, -1.65 | Arch/brick_red_brussels | 568 | 3.379 |
| 10.44, 8.11, -1.65 | Arch/brick_red_brussels | 369 | 3.318 |
| 10.43, 8.15, -1.65 | Arch/brick_red_brussels | 294 | 3.258 |
| 10.43, 8.19, -1.65 | Arch/brick_red_brussels | 241 | 3.199 |
| 10.42, 8.23, -1.65 | Arch/brick_red_brussels | 191 | 3.14 |
| 10.40, 8.27, -1.65 | Arch/brick_red_brussels | 165 | 3.081 |
| 10.39, 8.30, -1.65 | Arch/brick_red_brussels | 141 | 3.024 |
| 10.17, 8.02, -1.65 | Arch/brick_red_brussels | 43 | 1.182 |
| 10.19, 7.98, -1.65 | Arch/brick_red_brussels | 51 | 1.237 |
| 10.21, 7.95, -1.65 | Arch/brick_red_brussels | 61 | 1.294 |
| 10.23, 7.91, -1.65 | Arch/brick_red_brussels | 76 | 1.351 |
| 10.25, 7.87, -1.65 | Arch/brick_red_brussels | 94 | 1.41 |
| 10.26, 7.84, -1.65 | Arch/brick_red_brussels | 119 | 1.469 |
| 7.90, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 8.77, 10.16, -1.65 | Arch/brick_red_brussels | 69 | 2.708 |
| 5.45, 10.09, -1.65 | Arch/brick_red_brussels | 76 | 0.369 |
| 6.24, 10.10, -1.65 | Arch/brick_red_brussels | 201 | 2.45 |
| 7.83, 10.17, -1.65 | Arch/brick_red_brussels | 54 | 5.154 |
| 5.50, 10.23, -1.65 | Arch/brick_red_brussels | 49 | 9.7 |
| 10.45, 7.59, -2.15 | Arch/brick_red_brussels | 1570 | 2.3 |
| 10.45, 7.63, -2.15 | Arch/brick_red_brussels | 648 | 2.24 |
| 10.45, 7.67, -2.15 | Arch/brick_red_brussels | 363 | 2.179 |
| 10.44, 7.71, -2.15 | Arch/brick_red_brussels | 233 | 2.119 |
| 10.43, 7.75, -2.15 | Arch/brick_red_brussels | 182 | 2.059 |
| 10.43, 7.79, -2.15 | Arch/brick_red_brussels | 147 | 1.999 |
| 10.42, 7.83, -2.15 | Arch/brick_red_brussels | 115 | 1.94 |

(982 more in the JSON)

## nonmanifold (warn, 1220)

| at | part | uses |
|---|---|---|
| 1.58, 7.17, -1.65 | Arch/brick_red_brussels | 3 |
| 1.59, 7.28, -1.65 | Arch/brick_red_brussels | 3 |
| 1.62, 7.38, -1.65 | Arch/brick_red_brussels | 3 |
| 1.64, 7.48, -1.65 | Arch/brick_red_brussels | 3 |
| 1.67, 7.58, -1.65 | Arch/brick_red_brussels | 3 |
| 1.71, 7.68, -1.65 | Arch/brick_red_brussels | 3 |
| 1.75, 7.78, -1.65 | Arch/brick_red_brussels | 3 |
| 1.79, 7.88, -1.65 | Arch/brick_red_brussels | 3 |
| 2.42, 8.72, -1.65 | Arch/brick_red_brussels | 3 |
| 1.84, 7.97, -1.65 | Arch/brick_red_brussels | 3 |
| 1.89, 8.07, -1.65 | Arch/brick_red_brussels | 3 |
| 1.94, 8.16, -1.65 | Arch/brick_red_brussels | 3 |
| 2.00, 8.25, -1.65 | Arch/brick_red_brussels | 3 |
| 2.06, 8.34, -1.65 | Arch/brick_red_brussels | 3 |
| 2.13, 8.42, -1.65 | Arch/brick_red_brussels | 3 |
| 2.19, 8.50, -1.65 | Arch/brick_red_brussels | 3 |
| 2.27, 8.58, -1.65 | Arch/brick_red_brussels | 3 |
| 2.34, 8.65, -1.65 | Arch/brick_red_brussels | 3 |
| 2.58, 8.86, -1.65 | Arch/brick_red_brussels | 3 |
| 2.76, 8.92, -1.65 | Arch/brick_red_brussels | 3 |
| 2.67, 8.92, -1.65 | Arch/brick_red_brussels | 3 |
| 2.93, 8.79, -1.65 | Arch/brick_red_brussels | 3 |
| 2.85, 8.86, -1.65 | Arch/brick_red_brussels | 3 |
| 2.50, 8.79, -1.65 | Arch/brick_red_brussels | 3 |
| 3.30, 8.42, -1.65 | Arch/brick_red_brussels | 3 |
| 3.24, 8.50, -1.65 | Arch/brick_red_brussels | 3 |
| 3.59, 7.97, -1.65 | Arch/brick_red_brussels | 3 |
| 3.54, 8.07, -1.65 | Arch/brick_red_brussels | 3 |
| 3.49, 8.16, -1.65 | Arch/brick_red_brussels | 3 |
| 3.43, 8.25, -1.65 | Arch/brick_red_brussels | 3 |
| 3.37, 8.34, -1.65 | Arch/brick_red_brussels | 3 |
| 4.33, 7.55, -1.65 | Arch/brick_red_brussels | 3 |
| 4.36, 7.65, -1.65 | Arch/brick_red_brussels | 3 |
| 4.74, 8.37, -1.65 | Arch/brick_red_brussels | 3 |
| 4.80, 8.45, -1.65 | Arch/brick_red_brussels | 3 |
| 4.40, 7.75, -1.65 | Arch/brick_red_brussels | 3 |
| 4.43, 7.84, -1.65 | Arch/brick_red_brussels | 3 |
| 4.48, 7.93, -1.65 | Arch/brick_red_brussels | 3 |
| 4.52, 8.02, -1.65 | Arch/brick_red_brussels | 3 |
| 4.57, 8.11, -1.65 | Arch/brick_red_brussels | 3 |

(1180 more in the JSON)

## tjunction (warn, 631)

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
| 0.15, 4.32, -0.53 | Arch/stone_white | 1.4 |
| 0.75, 6.42, -0.60 | Arch/stone_white | 1.5 |
| 1.56, 7.02, -1.65 | Arch/stone_white | 0.005 |
| 1.56, 7.02, -1.65 | Arch/stone_white | 0.237 |
| 1.69, 7.63, -1.65 | Arch/stone_white | 0.075 |
| 1.91, 8.12, -1.65 | Arch/stone_white | 0.075 |
| 1.74, 8.22, -1.65 | Arch/stone_white | 0.079 |
| 1.63, 8.02, -1.65 | Arch/stone_white | 0.081 |
| 1.94, 8.50, -1.65 | Arch/stone_white | 0.08 |
| 2.30, 8.62, -1.65 | Arch/stone_white | 0.075 |
| 2.46, 8.76, -1.65 | Arch/stone_white | 0.075 |
| 2.33, 8.91, -1.65 | Arch/stone_white | 0.08 |
| 2.97, 8.76, -1.65 | Arch/stone_white | 0.075 |
| 3.13, 8.62, -1.65 | Arch/stone_white | 0.075 |
| 3.10, 8.91, -1.65 | Arch/stone_white | 0.08 |
| 3.50, 8.50, -1.65 | Arch/stone_white | 0.08 |

(591 more in the JSON)

## seam (info, 3427)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 16.06, 6.25, -0.65 | Props/wood_frame_white + Props/wood_frame_white | 3.89 | 480 | 10.2 |
| 16.06, 6.25, 0.67 | Props/wood_frame_white + Props/wood_frame_white | 3.9 | 480 | 10.2 |
| 16.25, 7.29, 0.16 | Props/polychrome + Props/polychrome | 0.74 | 168 | 48.4 |
| 16.23, 6.56, -0.07 | Arch/brick_red_brussels + Props/polychrome | 2.49 | 127 | 54.1 |
| 8.54, 8.41, 1.85 | Arch/brick_red_brussels + Arch/stone_white | 5.57 | 126 | 90 |
| 8.54, 8.41, -2.15 | Arch/brick_red_brussels + Arch/stone_white | 5.52 | 124 | 90 |
| 6.50, 6.83, -1.65 | Arch/brick_red_brussels + Arch/stone_white | 5.57 | 122 | 90 |
| 6.50, 6.83, 2.35 | Arch/brick_red_brussels + Arch/stone_white | 5.52 | 122 | 90 |
| 4.17, 7.71, -1.65 | Arch/brick_red_brussels + Arch/stone_white | 5.47 | 120 | 90 |
| 6.50, 6.83, -2.15 | Arch/brick_red_brussels + Arch/stone_white | 5.47 | 120 | 90 |
| 4.05, 6.83, 2.35 | Arch/brick_red_brussels + Arch/stone_white | 5.47 | 120 | 90 |
| 6.39, 7.68, 1.85 | Arch/brick_red_brussels + Arch/stone_white | 5.47 | 118 | 90 |
| 4.05, 6.83, 1.85 | Arch/brick_red_brussels + Arch/stone_white | 5.44 | 106 | 90 |
| 4.05, 6.83, -2.15 | Arch/brick_red_brussels + Arch/stone_white | 5.34 | 105 | 90 |
| 1.70, 8.15, 2.35 | Arch/brick_red_brussels + Arch/stone_white | 5.34 | 105 | 90 |
| 1.56, 7.07, -1.65 | Arch/brick_red_brussels + Arch/stone_white | 5.44 | 104 | 90 |
| 9.02, 5.29, -1.64 | Props/stone_white + Props/stone_white | 0.96 | 104 | 58.4 |
| 8.98, 5.29, 1.84 | Props/stone_white + Props/stone_white | 0.96 | 102 | 58 |
| 16.18, 6.84, -0.03 | Props/polychrome + Props/polychrome | 0.68 | 98 | 42.9 |
| 9.36, 6.68, -2.06 | Props/stone_white + Props/stone_white | 1.44 | 96 | 57.4 |
| 9.36, 6.68, 1.94 | Props/stone_white + Props/stone_white | 1.44 | 96 | 57.4 |
| 6.86, 6.68, -2.05 | Props/stone_white + Props/stone_white | 1.44 | 94 | 57.4 |
| 10.44, 7.03, -2.15 | Arch/brick_red_brussels + Arch/stone_white | 3.29 | 92 | 90 |
| 10.44, 7.05, 1.85 | Arch/brick_red_brussels + Arch/stone_white | 3.29 | 92 | 90 |
| 4.41, 6.68, -2.06 | Props/stone_white + Props/stone_white | 1.44 | 92 | 57.4 |
| 6.86, 6.68, 1.94 | Props/stone_white + Props/stone_white | 1.44 | 92 | 57.4 |
| 9.16, 7.59, -1.65 | Arch/brick_red_brussels + Arch/stone_white | 3.29 | 90 | 90 |
| 9.00, 6.82, 2.35 | Arch/brick_red_brussels + Arch/stone_white | 3.29 | 90 | 90 |
| 4.41, 6.68, 1.94 | Props/stone_white + Props/stone_white | 1.44 | 90 | 57.4 |
| 10.45, 7.55, -1.43 | Arch/brick_red_brussels + Arch/stone_white | 6.77 | 87 | 90 |
| 6.83, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 9.33, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.3 |
| 4.38, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 6.83, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.6 |
| 9.33, 4.50, 2.10 | Props/stone_white + Props/stone_white | 2.07 | 76 | 75.4 |
| 4.38, 4.50, -1.91 | Props/stone_white + Props/stone_white | 2.07 | 75 | 75.6 |
| 11.20, 7.55, 1.67 | Arch/brick_red_brussels + Arch/stone_white | 5.21 | 72 | 90 |
| 0.20, 8.69, 0.43 | Arch/stone_white + Glass/glass_window | 4.81 | 70 | 90 |
| 0.20, 8.69, -0.13 | Arch/stone_white + Glass/glass_window | 4.81 | 70 | 90 |
| 0.20, 8.69, -0.69 | Arch/stone_white + Glass/glass_window | 4.81 | 70 | 90 |

(3387 more in the JSON)

## opening (info, 592)

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
| 1.56, 7.07, -1.65 | Arch/stone_white | 0.99 + -0.1 + 0 | 0.094 |
| 1.56, 7.07, -1.65 | Arch/stone_white | 0.99 + -0.1 + 0 | 0.076 |
| 1.62, 7.38, -1.65 | Arch/stone_white | 0.97 + -0.23 + 0 | 0.075 |
| 1.68, 7.59, -1.65 | Arch/stone_white | 0.95 + -0.3 + 0 | 0.075 |
| 1.79, 7.89, -1.65 | Arch/stone_white | 0.91 + -0.42 + 0 | 0.075 |
| 1.94, 8.16, -1.65 | Arch/stone_white | 0.85 + -0.53 + 0 | 0.074 |
| 2.07, 8.35, -1.65 | Arch/stone_white | 0.8 + -0.6 + 0 | 0.074 |
| 2.27, 8.58, -1.65 | Arch/stone_white | 0.72 + -0.69 + 0 | 0.075 |

(552 more in the JSON)

## backtoback (info, 3071)

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
| 10.45, 6.76, 2.38 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 6.71, 2.38 | Arch/brick_red_brussels + Arch/stone_white | 0.00037 |
| 10.45, 6.74, 2.39 | Arch/brick_red_brussels + Arch/stone_white | 0.0006 |
| 10.45, 6.77, 2.42 | Arch/brick_red_brussels + Arch/stone_white | 0.00015 |
| 10.45, 5.27, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00695 |
| 10.45, 5.25, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 2.61 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 2.51 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 5.27, 3.69 | Arch/brick_red_brussels + Props/stone_white | 0.00106 |
| 10.45, 6.84, 3.82 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00318 |
| 10.45, 6.94, 3.84 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00448 |
| 10.45, 5.25, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00199 |
| 10.45, 5.29, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00197 |
| 10.45, 5.27, 3.59 | Arch/brick_red_brussels + Props/stone_white | 0.00695 |
| 10.45, 6.90, 3.75 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00747 |
| 10.45, 6.97, 3.82 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00513 |
| 10.45, 6.99, 3.73 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00014 |
| 10.45, 7.00, 3.79 | Arch/brick_red_brussels + Arch/wood_frame_dark | 0.00118 |
| 10.45, 6.76, -1.62 | Arch/brick_red_brussels + Arch/stone_white | 0.00481 |
| 10.45, 6.71, -1.63 | Arch/brick_red_brussels + Arch/stone_white | 0.00037 |
| 10.45, 6.74, -1.61 | Arch/brick_red_brussels + Arch/stone_white | 0.0006 |
| 10.45, 6.77, -1.58 | Arch/brick_red_brussels + Arch/stone_white | 0.00015 |
| 10.45, 6.72, 1.84 | Arch/brick_red_brussels + Arch/stone_white | 0.0015 |
| 10.45, 6.76, 1.83 | Arch/brick_red_brussels + Arch/stone_white | 0.00187 |

(3031 more in the JSON)


Nodes: Arch, Props, Glass, DoorL, DoorR. Distances: {"*":40}. Quantum 0.128 mm. Offset 0,0,0.
