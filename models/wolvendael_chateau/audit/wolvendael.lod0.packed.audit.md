# Mesh audit (packed): wolvendael.lod0

54,274 triangles, 42,004 welded vertices, 29,277 open edges, 1,228,322 rays, 13855 ms.

**12 blocking**, 11658 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 5 |
| leak | block | 7 |
| sliver | warn | 9882 |
| nonmanifold | warn | 905 |
| tjunction | warn | 871 |
| seam | info | 11840 |
| opening | info | 744 |
| backtoback | info | 4881 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 5)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -5.41, 62.93, -7.01 | Chateau/zinc_roof + Chateau/zinc_roof | 11.1 | 0 |
| -5.41, 62.94, -7.01 | Chateau/zinc_roof + Chateau/zinc_roof | 11.1 | 1 |
| -5.40, 62.94, -7.01 | Chateau/zinc_roof + Chateau/zinc_roof | 11.1 | 0.1 |
| 19.81, 60.47, -8.74 | Chateau/zinc_roof + Chateau/zinc_roof | 10.2 | 0.2 |
| 19.81, 60.47, -5.34 | Chateau/zinc_roof + Chateau/zinc_roof | 10.1 | 0.3 |

## leak (block, 7)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 14.40, 59.81, -11.33 | Chateau/zinc_roof | 30 | -0.51 + -0.17 + 0.84 | 0.01 |
| 11.05, 59.81, -11.33 | Chateau/zinc_roof | 30 | 0.51 + -0.17 + 0.84 | 0.01 |
| -0.47, 59.81, -11.33 | Chateau/zinc_roof | 30 | -0.51 + -0.17 + 0.84 | 0.01 |
| -7.33, 59.81, -11.33 | Chateau/zinc_roof | 30 | -0.52 + -0.16 + 0.84 | 0.01 |
| 9.23, 59.81, -2.75 | Chateau/zinc_roof | 30 | -0.5 + -0.18 + -0.84 | 0.01 |
| 4.71, 59.81, -2.75 | Chateau/zinc_roof | 30 | -0.5 + -0.18 + -0.84 | 0.01 |
| 6.53, 59.81, -2.75 | Chateau/zinc_roof | 30 | 0.5 + -0.18 + -0.84 | 0.01 |

## sliver (warn, 9882)

| at | part | aspect | longest |
|---|---|---|---|
| 20.49, 51.24, -2.73 | Chateau/render_white_lime | 128 | 2.57 |
| 20.49, 52.09, -2.73 | Chateau/render_white_lime | 128 | 2.57 |
| 20.49, 53.47, -2.73 | Chateau/render_white_lime | 77 | 1.55 |
| 20.49, 53.98, -2.73 | Chateau/render_white_lime | 77 | 1.55 |
| 20.49, 55.10, -2.73 | Chateau/render_white_lime | 90 | 1.8 |
| 20.49, 55.70, -2.73 | Chateau/render_white_lime | 90 | 1.8 |
| 20.49, 56.99, -4.26 | Chateau/render_white_lime | 50 | 1.46 |
| 20.49, 57.00, -3.78 | Chateau/render_white_lime | 50 | 1.46 |
| 20.49, 56.99, -5.54 | Chateau/render_white_lime | 40 | 1.18 |
| 20.49, 57.00, -5.14 | Chateau/render_white_lime | 40 | 1.18 |
| 20.49, 56.99, -7.41 | Chateau/render_white_lime | 76 | 2.22 |
| 20.49, 57.00, -6.67 | Chateau/render_white_lime | 76 | 2.22 |
| 20.49, 56.99, -8.94 | Chateau/render_white_lime | 40 | 1.181 |
| 20.49, 57.00, -8.54 | Chateau/render_white_lime | 40 | 1.181 |
| 20.49, 56.99, -10.30 | Chateau/render_white_lime | 50 | 1.46 |
| 20.49, 57.00, -9.82 | Chateau/render_white_lime | 50 | 1.46 |
| 0.64, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 0.25, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 3.55, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 3.15, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 5.82, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 5.42, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 8.08, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 7.68, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 10.34, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 9.94, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 12.61, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 12.21, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.181 |
| 15.51, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 15.12, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 17.43, 52.97, -2.72 | Chateau/render_white_lime | 46 | 2.291 |
| 16.67, 52.98, -2.72 | Chateau/render_white_lime | 46 | 2.291 |
| 17.43, 56.99, -2.72 | Chateau/render_white_lime | 78 | 2.291 |
| 16.67, 57.00, -2.72 | Chateau/render_white_lime | 78 | 2.291 |
| 18.98, 56.99, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| 18.59, 57.00, -2.72 | Chateau/render_white_lime | 40 | 1.18 |
| -0.59, 51.24, 3.38 | Chateau/render_white_lime | 128 | 2.57 |
| -0.59, 52.09, 3.38 | Chateau/render_white_lime | 128 | 2.57 |
| -0.59, 53.47, 3.38 | Chateau/render_white_lime | 77 | 1.55 |
| -0.59, 53.98, 3.38 | Chateau/render_white_lime | 77 | 1.55 |

(9842 more in the JSON)

## nonmanifold (warn, 905)

| at | part | uses |
|---|---|---|
| 20.50, 53.65, -2.74 | Chateau/stone_white | 3 |
| 20.47, 53.65, -11.38 | Chateau/stone_white | 3 |
| -0.57, 53.65, 3.37 | Chateau/stone_white | 3 |
| -12.66, 53.65, 3.40 | Chateau/stone_white | 3 |
| -12.70, 53.65, -11.34 | Chateau/stone_white | 3 |
| -2.44, 60.88, -9.51 | Chateau/zinc_roof | 4 |
| -2.44, 60.36, -10.12 | Chateau/zinc_roof | 4 |
| -1.96, 60.88, -9.51 | Chateau/zinc_roof | 4 |
| -1.96, 60.36, -10.12 | Chateau/zinc_roof | 4 |
| 20.27, 56.31, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 56.31, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 56.23, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 54.58, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 54.58, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 54.58, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 54.58, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 52.96, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 50.37, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 52.96, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 50.37, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 52.44, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 50.46, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 50.46, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 50.46, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 50.46, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 56.31, -4.82 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -4.82 | Chateau/wood_frame_white | 4 |
| 20.27, 56.31, -5.87 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -5.87 | Chateau/wood_frame_white | 4 |
| 20.27, 56.23, -4.87 | Chateau/wood_frame_white | 3 |
| 20.27, 54.58, -4.87 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -5.29 | Chateau/wood_frame_white | 3 |

(865 more in the JSON)

## tjunction (warn, 871)

| at | part | edge_m |
|---|---|---|
| 20.49, 50.33, -2.72 | Chateau/render_white_lime | 0.06 |
| 20.49, 50.60, -2.72 | Chateau/render_white_lime | 2.57 |
| 20.49, 53.21, -2.72 | Chateau/render_white_lime | 1.55 |
| 20.49, 54.66, -2.72 | Chateau/render_white_lime | 1.8 |
| 20.49, 56.40, -2.72 | Chateau/render_white_lime | 0.681 |
| 7.16, 52.95, -2.72 | Chateau/render_white_lime | 2.62 |
| 8.60, 52.95, -2.72 | Chateau/render_white_lime | 2.62 |
| 7.29, 53.00, -2.72 | Chateau/render_white_lime | 1.44 |
| -0.59, 50.33, 3.39 | Chateau/render_white_lime | 0.06 |
| -0.59, 50.60, 3.39 | Chateau/render_white_lime | 2.57 |
| -0.59, 53.21, 3.39 | Chateau/render_white_lime | 1.55 |
| -0.59, 54.66, 3.39 | Chateau/render_white_lime | 1.8 |
| -0.59, 56.40, 3.39 | Chateau/render_white_lime | 0.681 |
| -0.59, 53.00, -2.72 | Chateau/render_white_lime | 1.55 |
| -12.68, 50.33, 3.39 | Chateau/render_white_lime | 0.06 |
| -12.68, 50.60, 3.39 | Chateau/render_white_lime | 2.57 |
| -12.68, 53.21, 3.39 | Chateau/render_white_lime | 1.55 |
| -12.68, 54.66, 3.39 | Chateau/render_white_lime | 1.8 |
| -12.68, 56.40, 3.39 | Chateau/render_white_lime | 0.681 |
| -12.68, 50.33, -11.36 | Chateau/render_white_lime | 0.06 |
| -12.68, 50.60, -11.36 | Chateau/render_white_lime | 2.57 |
| -12.68, 53.21, -11.36 | Chateau/render_white_lime | 1.55 |
| -12.68, 54.66, -11.36 | Chateau/render_white_lime | 1.8 |
| -12.68, 56.40, -11.36 | Chateau/render_white_lime | 0.681 |
| 20.49, 50.33, -11.36 | Chateau/render_white_lime | 0.06 |
| 20.49, 50.60, -11.36 | Chateau/render_white_lime | 2.09 |
| 20.49, 52.63, -11.36 | Chateau/render_white_lime | 0.48 |
| 20.49, 53.21, -11.36 | Chateau/render_white_lime | 1.55 |
| 20.49, 54.66, -11.36 | Chateau/render_white_lime | 1.8 |
| 20.49, 56.40, -11.36 | Chateau/render_white_lime | 0.681 |
| 9.56, 52.95, -11.36 | Chateau/render_white_lime | 1.18 |
| 7.30, 52.95, -11.36 | Chateau/render_white_lime | 1.18 |
| 5.04, 52.95, -11.36 | Chateau/render_white_lime | 1.18 |
| 10.73, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 9.55, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 8.47, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 7.29, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 6.21, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 5.03, 52.95, -11.36 | Chateau/render_white_lime | 0.041 |
| 19.38, 52.47, -11.36 | Chateau/render_white_lime | 2.57 |

(831 more in the JSON)

## seam (info, 11840)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 20.49, 53.76, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 174.78 | 347 | 90 |
| 20.49, 50.32, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 183.23 | 199 | 90 |
| 20.49, 56.98, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 183.23 | 198 | 90 |
| -5.43, 62.96, -7.07 | Chateau/zinc_roof + Chateau/zinc_roof | 0.41 | 106 | 30.7 |
| 16.23, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.28 | 79 | 30.4 |
| 20.49, 59.77, -9.66 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 29.3 |
| 11.06, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 76 | 30.2 |
| 6.54, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 76 | 31 |
| 20.49, 59.77, -6.26 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 75 | 29.8 |
| -12.65, 59.80, -4.95 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 75 | 30.4 |
| -12.65, 59.80, -1.26 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 75 | 30.5 |
| 20.49, 59.77, -7.86 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 74 | 29.8 |
| 20.49, 59.77, -4.46 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 74 | 29.8 |
| 14.43, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 74 | 30.2 |
| 4.74, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 74 | 31 |
| -12.64, 59.79, -6.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 74 | 30.4 |
| -12.64, 59.79, -3.06 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 74 | 30.4 |
| 16.23, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 73 | 29.4 |
| 1.36, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 73 | 30.7 |
| -5.50, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 73 | 30.6 |
| 16.23, 59.77, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 73 | 29.3 |
| 14.44, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 72 | 29.8 |
| 11.06, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 72 | 29.8 |
| -0.43, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 30.6 |
| 20.46, 59.80, -7.86 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 30.3 |
| 9.26, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.25 | 72 | 30.4 |
| -12.65, 59.77, -3.06 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 72 | 30.2 |
| 16.23, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.28 | 71 | 31 |
| -12.68, 59.79, -1.26 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 71 | 30.2 |
| 10.98, 53.32, -11.36 | Chateau/render_white_lime + Chateau/stone_white | 14.72 | 70 | 90 |
| 14.43, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 70 | 30.7 |
| 11.06, 59.77, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 70 | 30.7 |
| -7.29, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 69 | 30.6 |
| 20.46, 59.80, -4.46 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 69 | 30.2 |
| 14.43, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 68 | 29.8 |
| 4.74, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 68 | 31.1 |
| -0.44, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 68 | 30.8 |
| -7.30, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 68 | 30.4 |
| -12.68, 59.79, -4.95 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 68 | 29.9 |
| 11.06, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.26 | 66 | 29.8 |

(11800 more in the JSON)

## opening (info, 744)

| at | part | facing | edge_m |
|---|---|---|---|
| 8.54, 53.00, -2.72 | Chateau/render_white_lime | 0 + 0 + 1 | 0.13 |
| 10.74, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 9.54, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 8.48, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 7.28, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 6.22, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 5.01, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 10.69, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.062 |
| 10.62, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 10.53, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 10.43, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 10.32, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 9.96, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.115 |
| 9.85, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 9.75, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 9.66, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 9.59, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.062 |
| 8.43, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.062 |
| 8.36, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 8.27, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 8.17, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 8.06, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.115 |
| 7.70, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 7.59, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 7.49, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 7.40, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 7.33, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 6.17, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 6.10, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 6.01, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 5.91, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 5.80, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 5.44, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 5.33, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 5.23, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 5.14, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 5.07, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 20.52, 48.77, -2.74 | Chateau/render_white_lime | 1 + 0 + 0 | 8.7 |
| -0.51, 48.92, -2.69 | Chateau/render_white_lime | 0 + 0 + 1 | 21.08 |
| -0.56, 48.88, 3.37 | Chateau/render_white_lime | 1 + 0 + 0 | 6.11 |

(704 more in the JSON)

## backtoback (info, 4881)

| at | parts | area |
|---|---|---|
| 3.97, 50.26, -11.36 | Chateau/stone_white + Chateau/stone_blue | 0.00746 |
| 3.97, 50.30, -11.37 | Chateau/stone_white + Chateau/stone_blue | 0.00008 |
| -2.44, 60.34, -10.07 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -2.44, 60.88, -9.54 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00269 |
| -2.44, 60.84, -9.54 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00282 |
| -2.44, 60.39, -10.10 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00285 |
| -2.44, 60.35, -10.10 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00261 |
| -2.44, 60.89, -9.56 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -1.96, 60.41, -10.13 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -1.96, 60.85, -9.55 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00285 |
| -1.96, 60.85, -9.51 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00267 |
| -1.96, 60.37, -10.09 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00281 |
| -1.96, 60.38, -10.13 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00264 |
| -1.96, 60.82, -9.50 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00018 |
| 20.28, 54.51, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00267 |
| 20.27, 54.56, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0028 |
| 20.27, 54.83, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.02022 |
| 20.25, 55.37, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01708 |
| 20.24, 56.27, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00009 |
| 20.30, 54.54, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00014 |
| 20.29, 55.46, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01686 |
| 20.26, 56.00, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.02 |
| 20.28, 56.27, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00221 |
| 20.26, 56.29, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00212 |
| 20.26, 54.51, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00267 |
| 20.27, 54.56, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0028 |
| 20.26, 54.82, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01954 |
| 20.29, 55.35, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01642 |
| 20.30, 56.27, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00009 |
| 20.24, 54.54, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00014 |
| 20.25, 55.44, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01754 |
| 20.27, 55.98, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.02066 |
| 20.26, 56.27, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00221 |
| 20.28, 56.29, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00212 |
| 20.28, 56.23, -9.25 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00124 |
| 20.26, 56.23, -9.23 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00124 |
| 20.28, 56.23, -9.11 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00727 |
| 20.26, 56.23, -8.93 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00824 |
| 20.26, 56.23, -8.73 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0003 |
| 20.26, 56.23, -8.71 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00088 |

(4841 more in the JSON)


Nodes: Chateau. Distances: {"Chateau":105,"Chateau_far":440,"Chateau_lod2":2000}. Quantum 0.189 mm. Offset 0,40,0.
