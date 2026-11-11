# Mesh audit (before pack): wolvendael.lod0

54,274 triangles, 42,004 welded vertices, 29,277 open edges, 1,229,722 rays, 39672 ms.

**0 blocking**, 11398 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 9620 |
| nonmanifold | warn | 905 |
| tjunction | warn | 873 |
| seam | info | 11833 |
| opening | info | 743 |
| backtoback | info | 4881 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 9620)

| at | part | aspect | longest |
|---|---|---|---|
| 20.49, 51.24, -2.73 | Chateau/render_white_lime | 129 | 2.57 |
| 20.49, 52.09, -2.73 | Chateau/render_white_lime | 129 | 2.57 |
| 20.49, 53.47, -2.73 | Chateau/render_white_lime | 78 | 1.55 |
| 20.49, 53.98, -2.73 | Chateau/render_white_lime | 78 | 1.55 |
| 20.49, 55.10, -2.73 | Chateau/render_white_lime | 90 | 1.8 |
| 20.49, 55.70, -2.73 | Chateau/render_white_lime | 90 | 1.8 |
| 20.49, 56.99, -4.26 | Chateau/render_white_lime | 49 | 1.46 |
| 20.49, 57.00, -3.78 | Chateau/render_white_lime | 49 | 1.46 |
| 20.49, 56.99, -7.41 | Chateau/render_white_lime | 74 | 2.22 |
| 20.49, 57.00, -6.67 | Chateau/render_white_lime | 74 | 2.22 |
| 20.49, 56.99, -10.30 | Chateau/render_white_lime | 49 | 1.46 |
| 20.49, 57.00, -9.82 | Chateau/render_white_lime | 49 | 1.46 |
| 17.43, 52.97, -2.72 | Chateau/render_white_lime | 46 | 2.291 |
| 16.67, 52.98, -2.72 | Chateau/render_white_lime | 46 | 2.291 |
| 17.43, 56.99, -2.72 | Chateau/render_white_lime | 76 | 2.29 |
| 16.67, 57.00, -2.72 | Chateau/render_white_lime | 76 | 2.29 |
| -0.59, 51.24, 3.38 | Chateau/render_white_lime | 129 | 2.57 |
| -0.59, 52.09, 3.38 | Chateau/render_white_lime | 129 | 2.57 |
| -0.59, 53.47, 3.38 | Chateau/render_white_lime | 78 | 1.55 |
| -0.59, 53.98, 3.38 | Chateau/render_white_lime | 78 | 1.55 |
| -0.59, 55.10, 3.38 | Chateau/render_white_lime | 90 | 1.8 |
| -0.59, 55.70, 3.38 | Chateau/render_white_lime | 90 | 1.8 |
| -0.59, 56.99, 1.56 | Chateau/render_white_lime | 63 | 1.895 |
| -0.59, 57.00, 2.19 | Chateau/render_white_lime | 63 | 1.895 |
| -0.59, 50.34, -1.90 | Chateau/render_white_lime | 41 | 2.466 |
| -0.59, 50.36, -1.08 | Chateau/render_white_lime | 41 | 2.466 |
| -0.59, 56.99, -1.90 | Chateau/render_white_lime | 82 | 2.465 |
| -0.59, 57.00, -1.08 | Chateau/render_white_lime | 82 | 2.465 |
| -12.67, 51.24, 3.39 | Chateau/render_white_lime | 129 | 2.57 |
| -12.67, 52.09, 3.39 | Chateau/render_white_lime | 129 | 2.57 |
| -12.67, 53.47, 3.39 | Chateau/render_white_lime | 78 | 1.55 |
| -12.67, 53.98, 3.39 | Chateau/render_white_lime | 78 | 1.55 |
| -12.67, 55.10, 3.39 | Chateau/render_white_lime | 90 | 1.8 |
| -12.67, 55.70, 3.39 | Chateau/render_white_lime | 90 | 1.8 |
| -3.43, 50.27, 3.39 | Chateau/render_white_lime | 97 | 6.815 |
| -5.70, 50.30, 3.39 | Chateau/render_white_lime | 97 | 6.815 |
| -3.43, 50.34, 3.39 | Chateau/render_white_lime | 114 | 6.815 |
| -5.70, 50.36, 3.39 | Chateau/render_white_lime | 114 | 6.815 |
| -3.43, 56.99, 3.39 | Chateau/render_white_lime | 227 | 6.815 |
| -5.70, 57.00, 3.39 | Chateau/render_white_lime | 227 | 6.815 |

(9580 more in the JSON)

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
| 20.27, 54.59, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 54.59, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 54.59, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 54.59, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 52.96, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 50.37, -8.21 | Chateau/wood_frame_white | 4 |
| 20.27, 52.96, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 50.37, -9.27 | Chateau/wood_frame_white | 4 |
| 20.27, 52.44, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 50.47, -8.27 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 50.47, -8.69 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 50.47, -8.79 | Chateau/wood_frame_white | 3 |
| 20.27, 52.44, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 50.47, -9.21 | Chateau/wood_frame_white | 3 |
| 20.27, 56.31, -4.82 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -4.82 | Chateau/wood_frame_white | 4 |
| 20.27, 56.31, -5.87 | Chateau/wood_frame_white | 4 |
| 20.27, 54.49, -5.87 | Chateau/wood_frame_white | 4 |
| 20.27, 56.23, -4.87 | Chateau/wood_frame_white | 3 |
| 20.27, 54.59, -4.87 | Chateau/wood_frame_white | 3 |
| 20.27, 56.23, -5.29 | Chateau/wood_frame_white | 3 |

(865 more in the JSON)

## tjunction (warn, 873)

| at | part | edge_m |
|---|---|---|
| 20.49, 50.33, -2.72 | Chateau/render_white_lime | 0.06 |
| 20.49, 50.60, -2.72 | Chateau/render_white_lime | 2.57 |
| 20.49, 53.21, -2.72 | Chateau/render_white_lime | 1.55 |
| 20.49, 54.66, -2.72 | Chateau/render_white_lime | 1.8 |
| 20.49, 56.40, -2.72 | Chateau/render_white_lime | 0.68 |
| 7.16, 52.95, -2.72 | Chateau/render_white_lime | 2.62 |
| 8.60, 52.95, -2.72 | Chateau/render_white_lime | 2.62 |
| 7.29, 53.00, -2.72 | Chateau/render_white_lime | 1.44 |
| -0.59, 50.33, 3.39 | Chateau/render_white_lime | 0.06 |
| -0.59, 50.60, 3.39 | Chateau/render_white_lime | 2.57 |
| -0.59, 53.21, 3.39 | Chateau/render_white_lime | 1.55 |
| -0.59, 54.66, 3.39 | Chateau/render_white_lime | 1.8 |
| -0.59, 56.40, 3.39 | Chateau/render_white_lime | 0.68 |
| -0.59, 53.00, -2.72 | Chateau/render_white_lime | 1.55 |
| -12.68, 50.33, 3.39 | Chateau/render_white_lime | 0.06 |
| -12.68, 50.60, 3.39 | Chateau/render_white_lime | 2.57 |
| -12.68, 53.21, 3.39 | Chateau/render_white_lime | 1.55 |
| -12.68, 54.66, 3.39 | Chateau/render_white_lime | 1.8 |
| -12.68, 56.40, 3.39 | Chateau/render_white_lime | 0.68 |
| -12.68, 50.33, -11.36 | Chateau/render_white_lime | 0.06 |
| -12.68, 50.60, -11.36 | Chateau/render_white_lime | 2.57 |
| -12.68, 53.21, -11.36 | Chateau/render_white_lime | 1.55 |
| -12.68, 54.66, -11.36 | Chateau/render_white_lime | 1.8 |
| -12.68, 56.40, -11.36 | Chateau/render_white_lime | 0.68 |
| 20.49, 50.33, -11.36 | Chateau/render_white_lime | 0.06 |
| 20.49, 50.60, -11.36 | Chateau/render_white_lime | 2.09 |
| 20.49, 52.63, -11.36 | Chateau/render_white_lime | 0.48 |
| 20.49, 53.21, -11.36 | Chateau/render_white_lime | 1.55 |
| 20.49, 54.66, -11.36 | Chateau/render_white_lime | 1.8 |
| 20.49, 56.40, -11.36 | Chateau/render_white_lime | 0.68 |
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

(833 more in the JSON)

## seam (info, 11833)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 20.49, 53.76, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 174.78 | 340 | 90 |
| 20.49, 50.32, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 183.23 | 191 | 90 |
| 20.49, 56.98, -2.73 | Chateau/render_white_lime + Chateau/stone_white | 183.23 | 191 | 90 |
| -5.43, 62.96, -7.07 | Chateau/zinc_roof + Chateau/zinc_roof | 0.41 | 106 | 30.7 |
| 14.43, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 16.23, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 9.26, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 11.06, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 4.74, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 6.54, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -0.44, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 1.33, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -7.30, 59.77, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -5.50, 59.78, -11.37 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 20.49, 59.77, -9.66 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 20.49, 59.77, -7.86 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 20.49, 59.77, -6.26 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 20.49, 59.77, -4.46 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 14.43, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 16.23, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 9.26, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 11.06, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 4.74, 59.79, -2.76 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 6.54, 59.80, -2.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -12.64, 59.79, -6.75 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -12.65, 59.80, -4.95 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -12.64, 59.79, -3.06 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| -12.65, 59.80, -1.26 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 76 | 31.7 |
| 14.44, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 16.23, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 9.26, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 11.06, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 4.74, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 6.54, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| -0.43, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 1.36, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| -7.29, 59.79, -11.36 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| -5.50, 59.77, -11.33 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 20.49, 59.78, -9.66 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |
| 20.46, 59.80, -7.86 | Chateau/zinc_roof + Chateau/zinc_roof | 0.27 | 72 | 31.7 |

(11793 more in the JSON)

## opening (info, 743)

| at | part | facing | edge_m |
|---|---|---|---|
| 10.74, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 9.54, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 8.48, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 7.28, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 6.22, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 5.01, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.03 |
| 10.69, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 10.62, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 10.53, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 10.43, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 10.32, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 9.96, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
| 9.85, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 9.75, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 9.66, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 9.59, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 8.43, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.061 |
| 8.36, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.08 |
| 8.27, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.095 |
| 8.17, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.107 |
| 8.06, 52.95, -11.36 | Chateau/render_white_lime | 0 + 0 + -1 | 0.116 |
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
| -12.71, 47.80, -11.39 | Chateau/render_white_lime | -1 + 0 + 0 | 0.8 |

(703 more in the JSON)

## backtoback (info, 4881)

| at | parts | area |
|---|---|---|
| 3.97, 50.26, -11.36 | Chateau/stone_white + Chateau/stone_blue | 0.00752 |
| 3.97, 50.30, -11.37 | Chateau/stone_white + Chateau/stone_blue | 0.00008 |
| -2.44, 60.34, -10.07 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -2.44, 60.88, -9.54 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00265 |
| -2.44, 60.84, -9.53 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00284 |
| -2.44, 60.39, -10.10 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00284 |
| -2.44, 60.35, -10.10 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00265 |
| -2.44, 60.89, -9.56 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -1.96, 60.41, -10.13 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| -1.96, 60.85, -9.51 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00265 |
| -1.96, 60.85, -9.55 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00284 |
| -1.96, 60.38, -10.09 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00284 |
| -1.96, 60.38, -10.13 | Chateau/zinc_roof + Chateau/zinc_roof | 0.00265 |
| -1.96, 60.83, -9.50 | Chateau/zinc_roof + Chateau/zinc_roof | 0.0002 |
| 20.28, 54.51, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0027 |
| 20.27, 54.56, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00283 |
| 20.27, 54.83, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0203 |
| 20.25, 55.37, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01708 |
| 20.24, 56.27, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00009 |
| 20.30, 54.53, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00014 |
| 20.29, 55.46, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01684 |
| 20.26, 55.99, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.02005 |
| 20.28, 56.27, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00225 |
| 20.26, 56.29, -8.21 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00216 |
| 20.26, 54.51, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0027 |
| 20.27, 54.56, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00283 |
| 20.26, 54.82, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01961 |
| 20.29, 55.35, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01641 |
| 20.30, 56.27, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00009 |
| 20.24, 54.53, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00014 |
| 20.25, 55.44, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.01753 |
| 20.27, 55.98, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.02073 |
| 20.26, 56.27, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00225 |
| 20.28, 56.29, -9.27 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00216 |
| 20.28, 56.23, -9.25 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00124 |
| 20.26, 56.23, -9.23 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00124 |
| 20.28, 56.23, -9.11 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0073 |
| 20.26, 56.23, -8.93 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00826 |
| 20.26, 56.23, -8.73 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.0003 |
| 20.26, 56.23, -8.71 | Chateau/wood_frame_white + Chateau/wood_frame_white | 0.00088 |

(4841 more in the JSON)


Nodes: Chateau. Distances: {"Chateau":105,"Chateau_far":440,"Chateau_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
