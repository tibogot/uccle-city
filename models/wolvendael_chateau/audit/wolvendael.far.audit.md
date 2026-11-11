# Mesh audit (before pack): wolvendael.far

11,299 triangles, 7,880 welded vertices, 3,756 open edges, 722,894 rays, 3582 ms.

**0 blocking**, 1700 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1132 |
| nonmanifold | warn | 313 |
| tjunction | warn | 255 |
| seam | info | 2114 |
| opening | info | 257 |
| backtoback | info | 1681 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1132)

| at | part | aspect | longest |
|---|---|---|---|
| 20.49, 51.24, -2.73 | Chateau_far/render_white_lime | 129 | 2.57 |
| 20.49, 52.09, -2.73 | Chateau_far/render_white_lime | 129 | 2.57 |
| 20.49, 53.47, -2.73 | Chateau_far/render_white_lime | 78 | 1.55 |
| 20.49, 53.98, -2.73 | Chateau_far/render_white_lime | 78 | 1.55 |
| 20.49, 55.10, -2.73 | Chateau_far/render_white_lime | 90 | 1.8 |
| 20.49, 55.70, -2.73 | Chateau_far/render_white_lime | 90 | 1.8 |
| 20.49, 56.99, -4.26 | Chateau_far/render_white_lime | 49 | 1.46 |
| 20.49, 57.00, -3.78 | Chateau_far/render_white_lime | 49 | 1.46 |
| 20.49, 56.99, -7.41 | Chateau_far/render_white_lime | 74 | 2.22 |
| 20.49, 57.00, -6.67 | Chateau_far/render_white_lime | 74 | 2.22 |
| 20.49, 56.99, -10.30 | Chateau_far/render_white_lime | 49 | 1.46 |
| 20.49, 57.00, -9.82 | Chateau_far/render_white_lime | 49 | 1.46 |
| 17.43, 52.97, -2.72 | Chateau_far/render_white_lime | 46 | 2.291 |
| 16.67, 52.98, -2.72 | Chateau_far/render_white_lime | 46 | 2.291 |
| 17.43, 56.99, -2.72 | Chateau_far/render_white_lime | 76 | 2.29 |
| 16.67, 57.00, -2.72 | Chateau_far/render_white_lime | 76 | 2.29 |
| -0.59, 51.24, 3.38 | Chateau_far/render_white_lime | 129 | 2.57 |
| -0.59, 52.09, 3.38 | Chateau_far/render_white_lime | 129 | 2.57 |
| -0.59, 53.47, 3.38 | Chateau_far/render_white_lime | 78 | 1.55 |
| -0.59, 53.98, 3.38 | Chateau_far/render_white_lime | 78 | 1.55 |
| -0.59, 55.10, 3.38 | Chateau_far/render_white_lime | 90 | 1.8 |
| -0.59, 55.70, 3.38 | Chateau_far/render_white_lime | 90 | 1.8 |
| -0.59, 56.99, 1.56 | Chateau_far/render_white_lime | 63 | 1.895 |
| -0.59, 57.00, 2.19 | Chateau_far/render_white_lime | 63 | 1.895 |
| -0.59, 50.34, -1.90 | Chateau_far/render_white_lime | 41 | 2.466 |
| -0.59, 50.36, -1.08 | Chateau_far/render_white_lime | 41 | 2.466 |
| -0.59, 56.99, -1.90 | Chateau_far/render_white_lime | 82 | 2.465 |
| -0.59, 57.00, -1.08 | Chateau_far/render_white_lime | 82 | 2.465 |
| -12.67, 51.24, 3.39 | Chateau_far/render_white_lime | 129 | 2.57 |
| -12.67, 52.09, 3.39 | Chateau_far/render_white_lime | 129 | 2.57 |
| -12.67, 53.47, 3.39 | Chateau_far/render_white_lime | 78 | 1.55 |
| -12.67, 53.98, 3.39 | Chateau_far/render_white_lime | 78 | 1.55 |
| -12.67, 55.10, 3.39 | Chateau_far/render_white_lime | 90 | 1.8 |
| -12.67, 55.70, 3.39 | Chateau_far/render_white_lime | 90 | 1.8 |
| -3.43, 50.27, 3.39 | Chateau_far/render_white_lime | 97 | 6.815 |
| -5.70, 50.30, 3.39 | Chateau_far/render_white_lime | 97 | 6.815 |
| -3.43, 50.34, 3.39 | Chateau_far/render_white_lime | 114 | 6.815 |
| -5.70, 50.36, 3.39 | Chateau_far/render_white_lime | 114 | 6.815 |
| -3.43, 56.99, 3.39 | Chateau_far/render_white_lime | 227 | 6.815 |
| -5.70, 57.00, 3.39 | Chateau_far/render_white_lime | 227 | 6.815 |

(1092 more in the JSON)

## nonmanifold (warn, 313)

| at | part | uses |
|---|---|---|
| 20.52, 53.65, -2.74 | Chateau_far/stone_white | 3 |
| 20.47, 53.65, -11.39 | Chateau_far/stone_white | 3 |
| -0.56, 53.65, 3.37 | Chateau_far/stone_white | 3 |
| -12.66, 53.65, 3.42 | Chateau_far/stone_white | 3 |
| -12.71, 53.65, -11.34 | Chateau_far/stone_white | 3 |
| -2.44, 60.88, -9.51 | Chateau_far/zinc_roof | 4 |
| -2.44, 60.36, -10.12 | Chateau_far/zinc_roof | 4 |
| -1.96, 60.88, -9.51 | Chateau_far/zinc_roof | 4 |
| -1.96, 60.36, -10.12 | Chateau_far/zinc_roof | 4 |
| 20.31, 56.31, -8.21 | Chateau_far/wood_frame_white | 4 |
| 20.31, 54.49, -8.21 | Chateau_far/wood_frame_white | 4 |
| 20.31, 56.31, -9.27 | Chateau_far/wood_frame_white | 4 |
| 20.31, 54.49, -9.27 | Chateau_far/wood_frame_white | 4 |
| 20.31, 52.96, -8.21 | Chateau_far/wood_frame_white | 4 |
| 20.31, 50.37, -8.21 | Chateau_far/wood_frame_white | 4 |
| 20.31, 52.96, -9.27 | Chateau_far/wood_frame_white | 4 |
| 20.31, 50.37, -9.27 | Chateau_far/wood_frame_white | 4 |
| 20.31, 56.31, -4.82 | Chateau_far/wood_frame_white | 4 |
| 20.31, 54.49, -4.82 | Chateau_far/wood_frame_white | 4 |
| 20.31, 56.31, -5.87 | Chateau_far/wood_frame_white | 4 |
| 20.31, 54.49, -5.87 | Chateau_far/wood_frame_white | 4 |
| 20.31, 52.96, -4.82 | Chateau_far/wood_frame_white | 4 |
| 20.31, 50.37, -4.82 | Chateau_far/wood_frame_white | 4 |
| 20.31, 52.96, -5.87 | Chateau_far/wood_frame_white | 4 |
| 20.31, 50.37, -5.87 | Chateau_far/wood_frame_white | 4 |
| 18.26, 56.31, -2.90 | Chateau_far/wood_frame_white | 4 |
| 18.26, 54.49, -2.90 | Chateau_far/wood_frame_white | 4 |
| 19.31, 56.31, -2.90 | Chateau_far/wood_frame_white | 4 |
| 19.31, 54.49, -2.90 | Chateau_far/wood_frame_white | 4 |
| 18.26, 52.96, -2.90 | Chateau_far/wood_frame_white | 4 |
| 18.26, 50.37, -2.90 | Chateau_far/wood_frame_white | 4 |
| 19.31, 52.96, -2.90 | Chateau_far/wood_frame_white | 4 |
| 19.31, 50.37, -2.90 | Chateau_far/wood_frame_white | 4 |
| 14.79, 56.31, -2.90 | Chateau_far/wood_frame_white | 4 |
| 14.79, 54.49, -2.90 | Chateau_far/wood_frame_white | 4 |
| 15.84, 56.31, -2.90 | Chateau_far/wood_frame_white | 4 |
| 15.84, 54.49, -2.90 | Chateau_far/wood_frame_white | 4 |
| 14.79, 52.96, -2.90 | Chateau_far/wood_frame_white | 4 |
| 14.79, 50.37, -2.90 | Chateau_far/wood_frame_white | 4 |
| 15.84, 52.96, -2.90 | Chateau_far/wood_frame_white | 4 |

(273 more in the JSON)

## tjunction (warn, 255)

| at | part | edge_m |
|---|---|---|
| 7.16, 52.95, -2.72 | Chateau_far/render_white_lime | 2.62 |
| 8.60, 52.95, -2.72 | Chateau_far/render_white_lime | 2.62 |
| 7.29, 53.00, -2.72 | Chateau_far/render_white_lime | 1.44 |
| -0.59, 53.00, -2.72 | Chateau_far/render_white_lime | 1.55 |
| 9.56, 52.95, -11.36 | Chateau_far/render_white_lime | 1.18 |
| 7.30, 52.95, -11.36 | Chateau_far/render_white_lime | 1.18 |
| 5.04, 52.95, -11.36 | Chateau_far/render_white_lime | 1.18 |
| 10.73, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 9.55, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 8.47, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 7.29, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 6.21, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 5.03, 52.95, -11.36 | Chateau_far/render_white_lime | 0.041 |
| 19.38, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 18.20, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 15.90, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 14.72, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 13.00, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 11.82, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 3.94, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 2.76, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 1.03, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -0.14, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -2.44, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -3.62, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -5.83, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -7.00, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -7.97, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -9.15, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -10.13, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| -11.30, 52.47, -11.36 | Chateau_far/render_white_lime | 2.57 |
| 20.52, 48.92, -2.69 | Chateau_far/render_white_lime | 1.416 |
| -0.56, 48.92, -2.69 | Chateau_far/render_white_lime | 1.312 |
| -0.56, 48.88, 3.42 | Chateau_far/render_white_lime | 3.472 |
| -12.71, 47.75, 3.42 | Chateau_far/render_white_lime | 3.472 |
| -12.71, 47.75, -11.39 | Chateau_far/render_white_lime | 3.694 |
| 20.52, 48.77, -11.39 | Chateau_far/render_white_lime | 3.694 |
| -0.66, 49.95, 7.68 | Chateau_far/render_white_lime | 2.87 |
| 20.47, 57.00, -11.34 | Chateau_far/stone_white | 0.6 |
| 20.47, 50.30, -11.34 | Chateau_far/stone_white | 0.6 |

(215 more in the JSON)

## seam (info, 2114)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 20.49, 53.76, -2.73 | Chateau_far/render_white_lime + Chateau_far/stone_white | 174.78 | 340 | 90 |
| 20.49, 50.32, -2.73 | Chateau_far/render_white_lime + Chateau_far/stone_white | 183.23 | 191 | 90 |
| 20.49, 56.98, -2.73 | Chateau_far/render_white_lime + Chateau_far/stone_white | 183.23 | 191 | 90 |
| 10.98, 53.32, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.72 | 70 | 90 |
| 14.85, 59.42, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 9.68, 59.42, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 5.16, 59.42, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| -0.02, 59.42, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| -6.88, 59.42, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 20.27, 59.42, -9.20 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 20.27, 59.42, -5.80 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 15.78, 59.42, -2.94 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 10.60, 59.42, -2.94 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 6.08, 59.42, -2.94 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| -12.46, 59.42, -5.37 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| -12.46, 59.42, -1.68 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 1.17 | 33 | 90 |
| 1.71, 50.31, -2.72 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.62 | 28 | 90 |
| 13.48, 50.31, -2.72 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.62 | 28 | 90 |
| 20.47, 50.31, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.58 | 28 | 90 |
| 14.05, 50.31, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.62 | 28 | 90 |
| 2.27, 50.31, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.62 | 28 | 90 |
| -4.45, 50.31, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.62 | 28 | 90 |
| 4.55, 53.76, -11.39 | Chateau_far/stone_white + Chateau_far/stone_white | 0.73 | 28 | 90 |
| 14.89, 59.36, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 9.71, 59.36, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 5.19, 59.36, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 0.02, 59.36, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| -6.84, 59.36, -11.13 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 20.25, 59.36, -9.17 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 20.25, 59.36, -5.77 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 15.74, 59.36, -2.96 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 10.57, 59.36, -2.96 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 6.05, 59.36, -2.96 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| -12.45, 59.36, -5.40 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| -12.45, 59.36, -1.71 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.78 | 28 | 17.1 |
| 10.79, 54.42, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 2.09 | 27 | 90 |
| 8.53, 54.42, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 2.09 | 27 | 90 |
| 6.26, 54.42, -11.36 | Chateau_far/render_white_lime + Chateau_far/stone_white | 2.09 | 27 | 90 |
| 20.49, 50.31, -2.74 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.58 | 26 | 90 |
| -0.59, 50.31, 3.37 | Chateau_far/render_white_lime + Chateau_far/stone_white | 14.58 | 26 | 90 |

(2074 more in the JSON)

## opening (info, 257)

| at | part | facing | edge_m |
|---|---|---|---|
| -12.47, 47.80, -6.28 | Chateau_far/render_white_lime | 0 + 0 + 1 | 0.8 |
| -12.47, 48.50, -5.38 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.8 |
| -12.47, 48.55, -6.23 | Chateau_far/render_white_lime | 0 + -1 + 0 | 0.9 |
| -12.47, 47.80, -2.59 | Chateau_far/render_white_lime | 0 + 0 + 1 | 0.8 |
| -12.47, 48.50, -1.69 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.8 |
| -12.47, 48.55, -2.54 | Chateau_far/render_white_lime | 0 + -1 + 0 | 0.9 |
| 10.74, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 9.54, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 8.48, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 7.28, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 6.22, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 5.01, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.03 |
| 10.69, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.061 |
| 10.62, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.08 |
| 10.53, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.095 |
| 10.43, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.107 |
| 10.32, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.116 |
| 10.20, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.12 |
| 10.08, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.12 |
| 9.96, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.116 |
| 9.85, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.107 |
| 9.75, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.095 |
| 9.66, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.08 |
| 9.59, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.061 |
| 8.43, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.061 |
| 8.36, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.08 |
| 8.27, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.095 |
| 8.17, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.107 |
| 8.06, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.116 |
| 7.94, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.12 |
| 7.82, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.12 |
| 7.70, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.116 |
| 7.59, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.107 |
| 7.49, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.095 |
| 7.40, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.08 |
| 7.33, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.061 |
| 6.17, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.061 |
| 6.10, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.08 |
| 6.01, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.095 |
| 5.91, 52.95, -11.36 | Chateau_far/render_white_lime | 0 + 0 + -1 | 0.107 |

(217 more in the JSON)

## backtoback (info, 1681)

| at | parts | area |
|---|---|---|
| 3.97, 50.26, -11.36 | Chateau_far/stone_white + Chateau_far/stone_blue | 0.00752 |
| 3.97, 50.30, -11.37 | Chateau_far/stone_white + Chateau_far/stone_blue | 0.00008 |
| -2.44, 60.34, -10.07 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.0002 |
| -2.44, 60.88, -9.54 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00265 |
| -2.44, 60.84, -9.53 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00284 |
| -2.44, 60.39, -10.10 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00284 |
| -2.44, 60.35, -10.10 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00265 |
| -2.44, 60.89, -9.56 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.0002 |
| -1.96, 60.41, -10.13 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.0002 |
| -1.96, 60.85, -9.51 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00265 |
| -1.96, 60.85, -9.55 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00284 |
| -1.96, 60.38, -10.09 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00284 |
| -1.96, 60.38, -10.13 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.00265 |
| -1.96, 60.83, -9.50 | Chateau_far/zinc_roof + Chateau_far/zinc_roof | 0.0002 |
| 20.32, 54.51, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.0027 |
| 20.31, 54.56, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00283 |
| 20.28, 56.27, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00009 |
| 20.34, 54.53, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00014 |
| 20.32, 56.27, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00225 |
| 20.30, 56.29, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00216 |
| 20.30, 54.51, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.0027 |
| 20.31, 54.56, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00283 |
| 20.34, 56.27, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00009 |
| 20.28, 54.53, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00014 |
| 20.30, 56.27, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00225 |
| 20.32, 56.29, -9.27 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00216 |
| 20.30, 56.23, -8.77 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00052 |
| 20.30, 56.23, -8.73 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00132 |
| 20.32, 56.23, -8.75 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00128 |
| 20.32, 56.23, -8.71 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00048 |
| 20.32, 54.59, -8.77 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00048 |
| 20.32, 54.59, -8.73 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00128 |
| 20.30, 54.59, -8.75 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00132 |
| 20.30, 54.59, -8.71 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00052 |
| 20.32, 50.39, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00274 |
| 20.31, 50.44, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00283 |
| 20.29, 52.44, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00005 |
| 20.29, 52.46, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00043 |
| 20.28, 52.92, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.00006 |
| 20.34, 50.42, -8.21 | Chateau_far/wood_frame_white + Chateau_far/wood_frame_white | 0.0001 |

(1641 more in the JSON)


Nodes: Chateau_far. Distances: {"Chateau":105,"Chateau_far":440,"Chateau_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
