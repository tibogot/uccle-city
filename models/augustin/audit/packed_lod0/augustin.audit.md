# Mesh audit: augustin.glb

26,047 triangles, 18,038 welded vertices, 9,319 open edges, 1,480,184 rays, 5172 ms.

**0 blocking**, 2503 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1981 |
| nonmanifold | warn | 80 |
| tjunction | warn | 442 |
| seam | info | 1561 |
| opening | info | 328 |
| backtoback | info | 889 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1981)

| at | part | aspect | longest |
|---|---|---|---|
| 3.56, 32.67, -2.96 | Augustin/concrete_white | 43 | 13.003 |
| 3.66, 28.33, -2.96 | Augustin/concrete_white | 43 | 13.003 |
| 3.66, 32.67, -3.37 | Augustin/concrete_white | 43 | 13.003 |
| 3.56, 28.33, -3.37 | Augustin/concrete_white | 43 | 13.003 |
| 3.56, 32.67, 3.37 | Augustin/concrete_white | 43 | 13.003 |
| 3.66, 28.33, 3.37 | Augustin/concrete_white | 43 | 13.003 |
| 3.66, 32.67, 2.96 | Augustin/concrete_white | 43 | 13.003 |
| 3.56, 28.33, 2.96 | Augustin/concrete_white | 43 | 13.003 |
| -3.56, 32.67, 2.96 | Augustin/concrete_white | 43 | 13.003 |
| -3.66, 28.33, 2.96 | Augustin/concrete_white | 43 | 13.003 |
| -3.66, 32.67, 3.37 | Augustin/concrete_white | 43 | 13.003 |
| -3.56, 28.33, 3.37 | Augustin/concrete_white | 43 | 13.003 |
| -3.56, 32.67, -3.37 | Augustin/concrete_white | 43 | 13.003 |
| -3.66, 28.33, -3.37 | Augustin/concrete_white | 43 | 13.003 |
| -3.66, 32.67, -2.96 | Augustin/concrete_white | 43 | 13.003 |
| -3.56, 28.33, -2.96 | Augustin/concrete_white | 43 | 13.003 |
| 5.60, 37.67, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 37.67, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 37.53, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.60, 37.53, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.60, 38.02, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 38.02, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 37.88, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.60, 37.88, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.60, 38.37, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 38.37, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.58, 38.23, -0.86 | Augustin/concrete_white | 86 | 5.14 |
| 5.60, 38.23, 0.86 | Augustin/concrete_white | 86 | 5.14 |
| 1.06, 31.33, 5.42 | Augustin/concrete_white | 45 | 6.342 |
| -1.06, 31.37, 5.42 | Augustin/concrete_white | 45 | 6.342 |
| 1.06, 31.42, 5.40 | Augustin/concrete_white | 106 | 6.34 |
| -1.06, 31.42, 5.38 | Augustin/concrete_white | 106 | 6.34 |
| 1.06, 31.28, 5.38 | Augustin/concrete_white | 106 | 6.34 |
| -1.06, 31.28, 5.40 | Augustin/concrete_white | 106 | 6.34 |
| 1.06, 31.68, 5.42 | Augustin/concrete_white | 45 | 6.342 |
| -1.06, 31.72, 5.42 | Augustin/concrete_white | 45 | 6.342 |
| 1.06, 31.77, 5.40 | Augustin/concrete_white | 106 | 6.34 |
| -1.06, 31.77, 5.38 | Augustin/concrete_white | 106 | 6.34 |
| 1.06, 31.63, 5.38 | Augustin/concrete_white | 106 | 6.34 |
| -1.06, 31.63, 5.40 | Augustin/concrete_white | 106 | 6.34 |

(1941 more in the JSON)

## nonmanifold (warn, 80)

| at | part | uses |
|---|---|---|
| 2.78, 44.30, 1.49 | Augustin/concrete_white | 3 |
| 2.78, 44.30, 1.74 | Augustin/concrete_white | 3 |
| 2.77, 44.30, 1.78 | Augustin/concrete_white | 3 |
| 2.77, 44.30, 1.83 | Augustin/concrete_white | 3 |
| 2.76, 44.30, 1.87 | Augustin/concrete_white | 3 |
| 2.74, 44.30, 1.91 | Augustin/concrete_white | 3 |
| 2.72, 44.30, 1.95 | Augustin/concrete_white | 3 |
| 2.70, 44.30, 1.99 | Augustin/concrete_white | 3 |
| 2.68, 44.30, 2.02 | Augustin/concrete_white | 3 |
| 2.65, 44.30, 2.06 | Augustin/concrete_white | 3 |
| 2.62, 44.30, 2.09 | Augustin/concrete_white | 3 |
| 2.58, 44.30, 2.12 | Augustin/concrete_white | 3 |
| 2.55, 44.30, 2.14 | Augustin/concrete_white | 3 |
| 2.51, 44.30, 2.16 | Augustin/concrete_white | 3 |
| 2.47, 44.30, 2.18 | Augustin/concrete_white | 3 |
| 2.43, 44.30, 2.20 | Augustin/concrete_white | 3 |
| 2.39, 44.30, 2.21 | Augustin/concrete_white | 3 |
| 2.35, 44.30, 2.21 | Augustin/concrete_white | 3 |
| 2.30, 44.30, 2.22 | Augustin/concrete_white | 3 |
| 2.04, 44.30, 2.22 | Augustin/concrete_white | 3 |
| 2.04, 44.30, -2.22 | Augustin/concrete_white | 3 |
| 2.30, 44.30, -2.22 | Augustin/concrete_white | 3 |
| 2.35, 44.30, -2.21 | Augustin/concrete_white | 3 |
| 2.39, 44.30, -2.21 | Augustin/concrete_white | 3 |
| 2.43, 44.30, -2.20 | Augustin/concrete_white | 3 |
| 2.47, 44.30, -2.18 | Augustin/concrete_white | 3 |
| 2.51, 44.30, -2.16 | Augustin/concrete_white | 3 |
| 2.55, 44.30, -2.14 | Augustin/concrete_white | 3 |
| 2.58, 44.30, -2.12 | Augustin/concrete_white | 3 |
| 2.62, 44.30, -2.09 | Augustin/concrete_white | 3 |
| 2.65, 44.30, -2.06 | Augustin/concrete_white | 3 |
| 2.68, 44.30, -2.02 | Augustin/concrete_white | 3 |
| 2.70, 44.30, -1.99 | Augustin/concrete_white | 3 |
| 2.72, 44.30, -1.95 | Augustin/concrete_white | 3 |
| 2.74, 44.30, -1.91 | Augustin/concrete_white | 3 |
| 2.76, 44.30, -1.87 | Augustin/concrete_white | 3 |
| 2.77, 44.30, -1.83 | Augustin/concrete_white | 3 |
| 2.77, 44.30, -1.78 | Augustin/concrete_white | 3 |
| 2.78, 44.30, -1.74 | Augustin/concrete_white | 3 |
| 2.78, 44.30, -1.49 | Augustin/concrete_white | 3 |

(40 more in the JSON)

## tjunction (warn, 442)

| at | part | edge_m |
|---|---|---|
| 5.56, 21.60, -1.35 | Augustin/concrete_white | 3.1 |
| 5.56, 29.40, -0.35 | Augustin/concrete_white | 0.9 |
| 5.56, 30.30, -0.35 | Augustin/concrete_white | 0.9 |
| 5.56, 34.05, -0.35 | Augustin/concrete_white | 1.301 |
| 5.56, 34.05, 0.35 | Augustin/concrete_white | 1.301 |
| -1.74, 21.80, 5.36 | Augustin/concrete_white | 3.88 |
| -5.56, 22.00, -0.25 | Augustin/concrete_white | 0.8 |
| -5.56, 32.40, -0.25 | Augustin/concrete_white | 0.8 |
| -5.56, 22.00, -1.52 | Augustin/concrete_white | 3.44 |
| -5.56, 34.10, -1.52 | Augustin/concrete_white | 1.4 |
| -5.56, 36.70, -1.52 | Augustin/concrete_white | 1.4 |
| -5.56, 34.10, 0.40 | Augustin/concrete_white | 1.4 |
| -5.56, 36.70, 0.40 | Augustin/concrete_white | 1.4 |
| -1.74, 21.80, -5.36 | Augustin/concrete_white | 3.88 |
| -18.50, 14.40, -3.85 | Augustin/concrete_white | 8.44 |
| -18.50, 14.40, -2.35 | Augustin/concrete_white | 8.44 |
| -18.50, 7.01, -3.85 | Augustin/concrete_white | 1.74 |
| -18.50, 14.40, -0.95 | Augustin/concrete_white | 8.44 |
| -18.50, 14.40, 0.95 | Augustin/concrete_white | 8.44 |
| -18.50, 7.01, -0.95 | Augustin/concrete_white | 2.14 |
| -18.50, 14.40, 2.35 | Augustin/concrete_white | 8.44 |
| -18.50, 14.40, 3.85 | Augustin/concrete_white | 8.44 |
| -18.50, 7.01, 2.35 | Augustin/concrete_white | 1.74 |
| -18.50, 16.26, -4.00 | Augustin/concrete_white | 11.69 |
| -18.50, 17.75, -4.70 | Augustin/concrete_white | 11.69 |
| -18.50, 16.26, -1.20 | Augustin/concrete_white | 11.69 |
| -18.50, 16.26, -2.00 | Augustin/concrete_white | 11.69 |
| -18.50, 16.26, 2.00 | Augustin/concrete_white | 11.69 |
| -18.50, 16.26, 1.20 | Augustin/concrete_white | 11.69 |
| -18.50, 17.75, 4.70 | Augustin/concrete_white | 11.69 |
| -18.50, 16.26, 4.00 | Augustin/concrete_white | 11.69 |
| -18.50, 6.36, 6.28 | Augustin/concrete_white | 11.4 |
| -18.50, 6.36, 6.78 | Augustin/concrete_white | 11.4 |
| -18.50, 6.36, -6.78 | Augustin/concrete_white | 11.4 |
| -18.50, 6.36, -6.28 | Augustin/concrete_white | 11.4 |
| -22.02, 5.20, -1.30 | Augustin/concrete_white | 3.3 |
| -22.57, 3.20, -1.30 | Augustin/concrete_white | 3.3 |
| -22.57, 3.20, 1.30 | Augustin/concrete_white | 3.3 |
| -22.02, 5.20, 1.30 | Augustin/concrete_white | 3.3 |
| -22.02, 5.08, 0.03 | Augustin/concrete_white | 2.6 |

(402 more in the JSON)

## seam (info, 1561)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 19.55, 16.27, -5.71 | Augustin/concrete_white + Augustin/concrete_white | 36.17 | 608 | 89.6 |
| 19.50, 17.13, -5.71 | Augustin/concrete_white + Augustin/concrete_white | 19.36 | 322 | 88.8 |
| -5.66, 0.22, 16.73 | Augustin/concrete_white + Augustin/stone_blue | 32.48 | 319 | 90 |
| -16.53, 0.22, -7.63 | Augustin/concrete_white + Augustin/stone_blue | 32.48 | 315 | 90 |
| 28.02, 0.22, -6.25 | Augustin/concrete_white + Augustin/stone_blue | 26.85 | 264 | 90 |
| 16.09, 0.22, 10.40 | Augustin/concrete_white + Augustin/stone_blue | 26.79 | 264 | 90 |
| 5.66, 0.22, -16.73 | Augustin/concrete_white + Augustin/stone_blue | 26.79 | 264 | 90 |
| -8.10, 8.27, 16.70 | Augustin/concrete_white + Augustin/concrete_white | 26.34 | 240 | 87.4 |
| -8.08, 11.11, 16.70 | Augustin/concrete_white + Augustin/concrete_white | 26.26 | 240 | 87.1 |
| -16.50, 8.27, -8.30 | Augustin/concrete_white + Augustin/concrete_white | 26.34 | 240 | 87.4 |
| -16.50, 11.11, -8.28 | Augustin/concrete_white + Augustin/concrete_white | 26.26 | 240 | 87.1 |
| 19.50, 17.15, 5.39 | Augustin/concrete_white + Augustin/roof_bitumen | 16.93 | 199 | 90 |
| 16.33, 13.07, 5.71 | Augustin/concrete_white + Augustin/concrete_white | 18.45 | 178 | 89.9 |
| 5.53, 13.07, -16.73 | Augustin/concrete_white + Augustin/concrete_white | 18.46 | 177 | 89.9 |
| 15.52, 8.27, 11.78 | Augustin/concrete_white + Augustin/concrete_white | 19.05 | 176 | 87.4 |
| 15.51, 11.11, 11.78 | Augustin/concrete_white + Augustin/concrete_white | 18.97 | 176 | 87.1 |
| 8.10, 8.27, -16.70 | Augustin/concrete_white + Augustin/concrete_white | 19.05 | 176 | 87.4 |
| 8.08, 11.11, -16.70 | Augustin/concrete_white + Augustin/concrete_white | 18.97 | 176 | 87.1 |
| -2.87, 45.61, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| -2.90, 46.03, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| 2.87, 46.40, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| 2.87, 45.61, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| 2.90, 46.03, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| -2.87, 46.40, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 168 | 90 |
| -2.84, 44.71, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| -2.90, 45.10, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| -2.90, 46.45, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| -2.83, 46.96, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| -2.83, 47.41, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.83, 44.71, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.90, 45.10, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.83, 45.61, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.83, 46.06, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.81, 46.96, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.79, 47.41, -1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.84, 44.71, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.90, 45.10, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.90, 46.45, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.83, 46.96, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |
| 2.83, 47.41, 1.25 | Augustin/concrete_white + Augustin/concrete_white | 4.36 | 166 | 90 |

(1521 more in the JSON)

## opening (info, 328)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.56, 37.60, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.141 |
| 5.56, 37.60, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.141 |
| 5.56, 37.95, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.139 |
| 5.56, 37.95, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.139 |
| 5.56, 38.30, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.139 |
| 5.56, 38.30, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.139 |
| 3.17, 31.35, 5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.35, 5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.70, 5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.70, 5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 32.05, 5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.139 |
| -3.17, 32.05, 5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.139 |
| -5.56, 37.60, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.141 |
| -5.56, 37.60, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.141 |
| -5.56, 37.95, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.139 |
| -5.56, 37.95, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.139 |
| -5.56, 38.30, 2.57 | Augustin/concrete_white | 0 + 0 + 1 | 0.139 |
| -5.56, 38.30, -2.57 | Augustin/concrete_white | 0 + 0 + -1 | 0.139 |
| -3.17, 31.35, -5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.35, -5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.70, -5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.70, -5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 32.05, -5.36 | Augustin/concrete_white | -1 + 0 + 0 | 0.139 |
| 3.17, 32.05, -5.36 | Augustin/concrete_white | 1 + 0 + 0 | 0.139 |
| -18.50, 18.00, -4.00 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, -4.70 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, -4.17 | Augustin/concrete_white | 1 + 0 + 0 | 0.46 |
| -18.50, 18.35, -4.29 | Augustin/concrete_white | 1 + 0 + 0 | 0.22 |
| -18.50, 18.00, -1.20 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, -2.00 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, -1.37 | Augustin/concrete_white | 1 + 0 + 0 | 0.56 |
| -18.50, 18.35, -1.49 | Augustin/concrete_white | 1 + 0 + 0 | 0.32 |
| -18.50, 18.00, 2.00 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, 1.20 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, 1.83 | Augustin/concrete_white | 1 + 0 + 0 | 0.56 |
| -18.50, 18.35, 1.71 | Augustin/concrete_white | 1 + 0 + 0 | 0.32 |
| -18.50, 18.00, 4.70 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.00, 4.00 | Augustin/concrete_white | 1 + 0 + 0 | 0.3 |
| -18.50, 18.05, 4.53 | Augustin/concrete_white | 1 + 0 + 0 | 0.46 |
| -18.50, 18.35, 4.41 | Augustin/concrete_white | 1 + 0 + 0 | 0.22 |

(288 more in the JSON)

## backtoback (info, 889)

| at | parts | area |
|---|---|---|
| 5.61, 34.10, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00499 |
| 5.58, 34.14, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00499 |
| 5.60, 34.48, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00285 |
| 5.59, 34.54, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00546 |
| 5.62, 34.30, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00563 |
| 5.60, 34.35, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00585 |
| 5.59, 34.67, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00102 |
| 5.58, 34.73, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00375 |
| 5.57, 34.86, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00018 |
| 5.56, 34.92, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00121 |
| 5.64, 34.51, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.0039 |
| 5.63, 34.57, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00129 |
| 5.64, 34.36, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00028 |
| 5.64, 34.39, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00006 |
| 5.63, 34.70, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00646 |
| 5.62, 34.76, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00373 |
| 5.63, 34.89, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00825 |
| 5.61, 34.95, -0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00722 |
| 5.62, 34.07, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00065 |
| 5.62, 34.13, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00217 |
| 5.66, 34.46, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00005 |
| 5.63, 34.26, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00018 |
| 5.64, 34.30, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00089 |
| 5.58, 34.10, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00435 |
| 5.60, 34.16, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00283 |
| 5.61, 34.49, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00674 |
| 5.63, 34.53, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.0067 |
| 5.59, 34.29, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00572 |
| 5.62, 34.36, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00501 |
| 5.60, 34.70, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00748 |
| 5.63, 34.74, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00748 |
| 5.59, 34.91, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00843 |
| 5.62, 34.95, 0.35 | Augustin/concrete_white + Augustin/concrete_white | 0.00843 |
| -18.53, 16.18, -4.00 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.51, 16.22, -4.00 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.53, 16.54, -4.00 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.52, 16.58, -4.00 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.53, 16.18, -1.20 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.51, 16.22, -1.20 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |
| -18.53, 16.54, -1.20 | Augustin/concrete_white + Augustin/concrete_white | 0.0024 |

(849 more in the JSON)


Nodes: Augustin. Distances: {"Augustin":175}. Quantum 0.417 mm. Offset 0,0,0.
