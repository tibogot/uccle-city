# Mesh audit (before pack): papenkasteel.far

13,150 triangles, 9,461 welded vertices, 5,114 open edges, 851,788 rays, 2495 ms.

**0 blocking**, 2108 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1182 |
| nonmanifold | warn | 350 |
| tjunction | warn | 576 |
| seam | info | 2270 |
| opening | info | 635 |
| backtoback | info | 67 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1182)

| at | part | aspect | longest |
|---|---|---|---|
| -7.50, 52.67, 6.82 | Papenkasteel_far/render_white | 57 | 8.031 |
| -7.50, 52.62, 4.15 | Papenkasteel_far/render_white | 57 | 8.031 |
| -12.40, 52.67, 4.15 | Papenkasteel_far/render_white | 57 | 8.031 |
| -12.40, 52.62, 6.82 | Papenkasteel_far/render_white | 57 | 8.031 |
| 9.10, 52.67, 6.09 | Papenkasteel_far/render_white | 50 | 6.931 |
| 9.10, 52.62, 3.78 | Papenkasteel_far/render_white | 50 | 6.931 |
| 5.50, 52.67, 3.78 | Papenkasteel_far/render_white | 50 | 6.931 |
| 5.50, 52.62, 6.09 | Papenkasteel_far/render_white | 50 | 6.931 |
| 12.43, 52.67, -4.37 | Papenkasteel_far/render_white | 53 | 7.371 |
| 12.43, 52.62, -6.82 | Papenkasteel_far/render_white | 53 | 7.371 |
| 7.49, 52.47, 21.50 | Papenkasteel_far/render_white | 45 | 2.971 |
| 8.48, 52.49, 21.50 | Papenkasteel_far/render_white | 45 | 2.971 |
| -0.66, 54.40, 21.31 | Papenkasteel_far/render_white | 94 | 30.97 |
| -10.88, 54.40, 21.42 | Papenkasteel_far/render_white | 94 | 30.642 |
| -10.77, 54.40, 28.99 | Papenkasteel_far/render_white | 94 | 30.97 |
| -0.55, 54.40, 28.88 | Papenkasteel_far/render_white | 94 | 30.642 |
| -0.55, 54.50, 21.20 | Papenkasteel_far/render_white | 221 | 30.97 |
| -10.88, 54.45, 21.20 | Papenkasteel_far/render_white | 221 | 30.97 |
| 9.77, 54.50, 26.47 | Papenkasteel_far/render_white | 56 | 7.901 |
| 9.77, 54.45, 23.83 | Papenkasteel_far/render_white | 56 | 7.901 |
| -10.88, 54.50, 29.10 | Papenkasteel_far/render_white | 221 | 30.97 |
| -0.55, 54.45, 29.10 | Papenkasteel_far/render_white | 221 | 30.97 |
| -21.20, 54.50, 23.83 | Papenkasteel_far/render_white | 56 | 7.901 |
| -21.20, 54.45, 26.47 | Papenkasteel_far/render_white | 56 | 7.901 |
| -11.25, 53.45, 15.51 | Papenkasteel_far/render_white | 60 | 1.5 |
| -11.25, 53.95, 15.52 | Papenkasteel_far/render_white | 60 | 1.5 |
| -11.25, 53.45, 14.48 | Papenkasteel_far/render_white | 60 | 1.5 |
| -11.25, 53.95, 14.49 | Papenkasteel_far/render_white | 60 | 1.5 |
| -13.33, 54.82, 13.20 | Papenkasteel_far/render_white | 51 | 7.151 |
| -15.72, 54.77, 13.20 | Papenkasteel_far/render_white | 51 | 7.151 |
| -10.95, 54.82, 20.67 | Papenkasteel_far/render_white | 80 | 11.201 |
| -10.95, 54.77, 16.93 | Papenkasteel_far/render_white | 80 | 11.201 |
| -15.72, 54.82, 24.40 | Papenkasteel_far/render_white | 51 | 7.151 |
| -13.33, 54.77, 24.40 | Papenkasteel_far/render_white | 51 | 7.151 |
| -18.10, 54.82, 16.93 | Papenkasteel_far/render_white | 80 | 11.201 |
| -18.10, 54.77, 20.67 | Papenkasteel_far/render_white | 80 | 11.201 |
| 2.06, 57.78, -9.23 | Papenkasteel_far/stone_white | 305 | 21.35 |
| -5.03, 57.78, -9.20 | Papenkasteel_far/stone_white | 305 | 21.28 |
| 9.18, 57.78, -2.07 | Papenkasteel_far/stone_white | 154 | 10.8 |
| 9.15, 57.78, -5.65 | Papenkasteel_far/stone_white | 154 | 10.73 |

(1142 more in the JSON)

## nonmanifold (warn, 350)

| at | part | uses |
|---|---|---|
| -7.45, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -7.45, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -6.55, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -6.55, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -5.63, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -5.63, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -4.74, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -4.74, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 2.25, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 2.25, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 3.15, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 3.15, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.08, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.08, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.96, 53.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.96, 50.54, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -7.45, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -7.45, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -6.55, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -6.55, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -5.63, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -5.63, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -4.74, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -4.74, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 2.25, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 2.25, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 3.15, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 3.15, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.08, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.08, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.96, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 4.96, 54.74, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -10.39, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -10.39, 54.94, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -9.51, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| -9.51, 54.94, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 6.86, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 6.86, 54.94, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 7.75, 57.26, 1.32 | Papenkasteel_far/wood_frame_white | 3 |
| 7.75, 54.94, 1.32 | Papenkasteel_far/wood_frame_white | 3 |

(310 more in the JSON)

## tjunction (warn, 576)

| at | part | edge_m |
|---|---|---|
| -12.10, 52.85, 1.50 | Papenkasteel_far/render_white | 0.7 |
| -7.80, 49.07, 1.50 | Papenkasteel_far/render_white | 1.909 |
| -7.80, 52.35, 1.50 | Papenkasteel_far/render_white | 2 |
| -7.51, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| -6.49, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| -5.69, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| -4.67, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| 2.19, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| 3.21, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| 4.01, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| 5.03, 52.55, 1.50 | Papenkasteel_far/render_white | 2.7 |
| -7.51, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| -6.49, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| -5.69, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| -4.67, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 2.19, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 3.21, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 4.01, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 5.03, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 9.15, 50.55, -9.20 | Papenkasteel_far/render_white | 3.45 |
| -12.10, 49.07, 1.50 | Papenkasteel_far/render_white | 1.159 |
| -12.10, 52.35, 1.50 | Papenkasteel_far/render_white | 3.45 |
| -12.10, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 9.15, 54.95, 1.50 | Papenkasteel_far/render_white | 2.5 |
| 9.15, 49.80, -9.20 | Papenkasteel_far/render_white | 1.909 |
| 9.15, 52.55, 0.11 | Papenkasteel_far/render_white | 2.7 |
| 9.15, 52.55, -0.91 | Papenkasteel_far/render_white | 2.7 |
| -6.39, 60.55, 0.55 | Papenkasteel_far/render_white | 0.383 |
| -5.71, 60.55, 0.55 | Papenkasteel_far/render_white | 0.383 |
| -6.05, 60.39, 0.55 | Papenkasteel_far/render_white | 0.69 |
| 3.21, 60.55, 0.55 | Papenkasteel_far/render_white | 0.383 |
| 3.90, 60.55, 0.55 | Papenkasteel_far/render_white | 0.383 |
| 3.55, 60.39, 0.55 | Papenkasteel_far/render_white | 0.69 |
| -5.71, 60.55, -8.25 | Papenkasteel_far/render_white | 0.383 |
| -6.39, 60.55, -8.25 | Papenkasteel_far/render_white | 0.383 |
| -6.05, 60.39, -8.25 | Papenkasteel_far/render_white | 0.69 |
| 3.90, 60.55, -8.25 | Papenkasteel_far/render_white | 0.383 |
| 3.21, 60.55, -8.25 | Papenkasteel_far/render_white | 0.383 |
| 3.55, 60.39, -8.25 | Papenkasteel_far/render_white | 0.69 |
| -12.10, 49.80, 9.20 | Papenkasteel_far/render_white | 1.48 |

(536 more in the JSON)

## seam (info, 2270)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -10.87, 57.78, 1.50 | Papenkasteel_far/render_white + Papenkasteel_far/stone_white | 58.34 | 100 | 90 |
| 7.99, 49.05, 21.50 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 38.76 | 76 | 90 |
| -0.99, 68.76, 2.63 | Papenkasteel_far/stone_white + Papenkasteel_far/slate | 2.88 | 75 | 24.5 |
| -1.49, 68.76, -2.69 | Papenkasteel_far/stone_white + Papenkasteel_far/slate | 2.88 | 75 | 24.5 |
| 1.25, 68.76, -0.28 | Papenkasteel_far/stone_white + Papenkasteel_far/slate | 2.88 | 75 | 24.5 |
| -3.73, 68.76, 0.21 | Papenkasteel_far/stone_white + Papenkasteel_far/slate | 2.88 | 75 | 24.5 |
| 7.79, 54.40, 21.50 | Papenkasteel_far/render_white + Papenkasteel_far/render_white | 21.6 | 65 | 90 |
| -1.97, 56.96, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 3.57 | 44 | 90 |
| -1.97, 60.21, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 3.57 | 44 | 90 |
| -1.97, 63.41, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 3.57 | 44 | 90 |
| -1.97, 66.41, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 3.57 | 44 | 90 |
| -1.98, 66.98, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 23.06 | 42 | 90 |
| -11.08, 54.73, 21.50 | Papenkasteel_far/render_white + Papenkasteel_far/render_white | 22.97 | 37 | 90 |
| -1.58, 68.59, -2.76 | Papenkasteel_far/slate + Papenkasteel_far/slate | 1.27 | 36 | 69 |
| 1.32, 68.59, -0.38 | Papenkasteel_far/slate + Papenkasteel_far/slate | 1.27 | 36 | 69 |
| -1.59, 68.58, 2.69 | Papenkasteel_far/slate + Papenkasteel_far/slate | 1.27 | 36 | 69 |
| -3.81, 68.58, -0.38 | Papenkasteel_far/slate + Papenkasteel_far/slate | 1.27 | 36 | 69 |
| -1.96, 49.63, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 2.25 | 33 | 90 |
| 5.80, 49.22, 2.28 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 13.35 | 29 | 90 |
| -7.29, 49.53, 21.50 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 3.45 | 29 | 90 |
| -17.63, 50.64, 28.80 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_blue | 60.74 | 29 | 90 |
| -11.25, 52.87, 15.54 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 1.89 | 27 | 90 |
| -11.25, 49.09, 20.30 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 16.49 | 26 | 90 |
| -1.98, 52.79, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.34 | 26 | 9 |
| -0.97, 53.08, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.34 | 26 | 9 |
| -10.91, 52.57, 9.20 | Papenkasteel_far/render_white + Papenkasteel_far/render_white | 19.7 | 25 | 90 |
| 6.52, 52.57, 8.10 | Papenkasteel_far/render_white + Papenkasteel_far/render_white | 16.26 | 25 | 90 |
| 12.13, 52.57, -2.83 | Papenkasteel_far/render_white + Papenkasteel_far/render_white | 12.79 | 25 | 90 |
| -1.76, 54.67, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.93 | 25 | 90 |
| -1.76, 57.92, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.93 | 25 | 90 |
| -1.76, 61.12, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.93 | 25 | 90 |
| -1.76, 64.32, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 1.93 | 25 | 90 |
| -1.02, 72.05, -0.49 | Papenkasteel_far/zinc_roof + Papenkasteel_far/zinc_roof | 3.16 | 24 | 71.8 |
| 9.13, 52.76, -9.20 | Papenkasteel_far/render_white + Papenkasteel_far/slate | 8.4 | 23 | 58 |
| 12.13, 49.40, -2.85 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 13.62 | 23 | 90 |
| 1.56, 58.64, 1.07 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/slate | 20.31 | 23 | 39 |
| -12.10, 49.07, 2.49 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 16.71 | 22 | 90 |
| -18.30, 49.05, 21.50 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 7.09 | 22 | 90 |
| -9.58, 52.71, 21.65 | Papenkasteel_far/render_white + Papenkasteel_far/wood_frame_dark | 2.74 | 22 | 90 |
| -17.80, 49.09, 14.28 | Papenkasteel_far/render_white + Papenkasteel_far/stone_blue | 17.54 | 22 | 90 |

(2230 more in the JSON)

## opening (info, 635)

| at | part | facing | edge_m |
|---|---|---|---|
| -12.10, 54.80, 1.50 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.2 |
| -12.10, 55.00, 1.50 | Papenkasteel_far/render_white | 0 + 0 + 1 | 2.3 |
| 9.15, 54.80, 1.50 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.2 |
| 9.15, 55.00, 1.50 | Papenkasteel_far/render_white | 0 + 0 + 1 | 2.3 |
| 9.15, 50.60, -9.20 | Papenkasteel_far/render_white | 1 + 0 + 0 | 2 |
| 9.15, 53.20, -9.20 | Papenkasteel_far/render_white | 1 + 0 + 0 | 0.7 |
| -6.58, 59.84, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.99 |
| -6.58, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| -6.39, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| -6.39, 60.61, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.223 |
| -5.71, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| -5.71, 60.61, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.223 |
| -5.53, 59.84, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.99 |
| -5.53, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| 3.02, 59.84, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.99 |
| 3.02, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| 3.21, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| 3.21, 60.61, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.223 |
| 3.90, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| 3.90, 60.61, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.223 |
| 4.08, 59.84, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.99 |
| 4.08, 60.43, 0.55 | Papenkasteel_far/render_white | 0 + 0 + 1 | 0.16 |
| -5.53, 59.84, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.99 |
| -5.53, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| -5.71, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| -5.71, 60.61, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.223 |
| -6.39, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| -6.39, 60.61, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.223 |
| -6.58, 59.84, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.99 |
| -6.58, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| 4.08, 59.84, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.99 |
| 4.08, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| 3.90, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| 3.90, 60.61, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.223 |
| 3.21, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| 3.21, 60.61, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.223 |
| 3.02, 59.84, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.99 |
| 3.02, 60.43, -8.25 | Papenkasteel_far/render_white | 0 + 0 + -1 | 0.16 |
| -12.05, 49.07, 9.20 | Papenkasteel_far/render_white | 0 + 0 + 1 | 1.65 |
| -12.10, 50.60, 9.20 | Papenkasteel_far/render_white | 0 + 0 + 1 | 1.8 |

(595 more in the JSON)

## backtoback (info, 67)

| at | parts | area |
|---|---|---|
| -9.02, 65.60, -3.78 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| -9.31, 65.60, -3.67 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| -9.29, 65.60, -4.03 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| -9.58, 65.60, -3.92 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| -9.04, 65.76, -3.91 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| -9.31, 65.76, -4.02 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| -9.29, 65.76, -3.68 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| -9.56, 65.76, -3.79 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| 4.88, 65.90, -5.13 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| 4.59, 65.90, -5.02 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| 4.61, 65.90, -5.38 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| 4.32, 65.90, -5.27 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| 4.86, 66.06, -5.26 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| 4.59, 66.06, -5.37 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| 4.61, 66.06, -5.03 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| 4.34, 66.06, -5.14 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| 7.68, 65.30, -6.73 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| 7.39, 65.30, -6.62 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| 7.41, 65.30, -6.98 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10066 |
| 7.12, 65.30, -6.87 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.10559 |
| 7.66, 65.46, -6.86 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| 7.39, 65.46, -6.97 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| 7.41, 65.46, -6.63 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.08748 |
| 7.14, 65.46, -6.74 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.09357 |
| -0.58, 52.42, 2.92 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.00299 |
| -0.55, 52.28, 2.93 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.00056 |
| -1.89, 52.45, 2.92 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.00343 |
| -14.30, 57.40, 17.46 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.07344 |
| -14.53, 57.40, 17.56 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.07056 |
| -14.52, 57.40, 17.24 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.07056 |
| -14.75, 57.40, 17.34 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.07344 |
| -14.32, 57.56, 17.34 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.06336 |
| -14.53, 57.56, 17.25 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.05984 |
| -14.52, 57.56, 17.55 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.05984 |
| -14.73, 57.56, 17.45 | Papenkasteel_far/brick_red_brussels + Papenkasteel_far/stone_white | 0.06336 |
| -1.89, 52.22, 2.75 | Papenkasteel_far/wood_frame_white + Papenkasteel_far/wood_frame_white | 0.00226 |
| -1.91, 52.22, 2.72 | Papenkasteel_far/wood_frame_white + Papenkasteel_far/wood_frame_white | 0.00009 |
| -1.93, 52.22, 2.75 | Papenkasteel_far/wood_frame_white + Papenkasteel_far/wood_frame_white | 0.00202 |
| -0.55, 52.22, 2.75 | Papenkasteel_far/wood_frame_white + Papenkasteel_far/wood_frame_white | 0.0022 |
| -0.58, 52.22, 2.77 | Papenkasteel_far/wood_frame_white + Papenkasteel_far/wood_frame_white | 0.0001 |

(27 more in the JSON)


Nodes: Papenkasteel_far. Distances: {"Papenkasteel":95,"Papenkasteel_far":385,"Papenkasteel_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
