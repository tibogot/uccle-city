# Mesh audit (before pack): stalle.lod0

72,196 triangles, 75,162 welded vertices, 60,131 open edges, 2,055,434 rays, 25025 ms.

**0 blocking**, 2074 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 118 |
| sliver | warn | 1663 |
| winding | warn | 42 |
| nonmanifold | warn | 148 |
| tjunction | warn | 103 |
| seam | info | 27730 |
| opening | info | 159 |
| backtoback | info | 383 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 118)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 7.66, 43.29, 0.06 | Stalle/slate + Stalle/slate | 2.87 | 20442.4 | 0 | 94 | 0.72 | false | 0 + 0.57 + -0.82 |
| 7.91, 43.16, -0.03 | Stalle/slate + Stalle/slate | 2.87 | 18976.4 | 0 | 94 | 0.72 | false | 0 + 0.57 + -0.82 |
| 1.00, 43.23, 0.01 | Stalle/slate + Stalle/slate | 2.87 | 1503.8 | 0 | 94 | 0.72 | false | 0 + 0.57 + -0.82 |
| 14.30, 43.23, 0.19 | Stalle/slate + Stalle/slate | 2.87 | 1503.8 | 0 | 94 | 0.72 | false | 0 + 0.57 + 0.82 |
| 7.40, 43.16, 0.23 | Stalle/slate + Stalle/slate | 2.87 | 18938.8 | 0 | 94 | 0.72 | false | 0 + 0.57 + 0.82 |
| 7.64, 43.29, 0.14 | Stalle/slate + Stalle/slate | 2.87 | 20480 | 0 | 94 | 0.72 | false | 0 + 0.57 + 0.82 |
| 12.88, 40.24, -2.08 | Stalle_slates/slate + Stalle_slates/slate | 2.34 | 9.5 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.93, 40.25, -2.08 | Stalle_slates/slate + Stalle_slates/slate | 2.34 | 32.3 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.98, 40.26, -2.08 | Stalle_slates/slate + Stalle_slates/slate | 2.34 | 9.4 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 3.67, 41.54, -1.18 | Stalle_slates/slate + Stalle_slates/slate | 2.57 | 0.4 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 3.77, 41.55, -1.17 | Stalle_slates/slate + Stalle_slates/slate | 2.57 | 72.1 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 3.87, 41.57, -1.16 | Stalle_slates/slate + Stalle_slates/slate | 2.82 | 1.4 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 14.56, 41.67, -1.09 | Stalle_slates/slate + Stalle_slates/slate | 2.9 | 3.3 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 14.57, 41.67, -1.08 | Stalle_slates/slate + Stalle_slates/slate | 2.89 | 7.2 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 14.59, 41.68, -1.08 | Stalle_slates/slate + Stalle_slates/slate | 2.89 | 8.8 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 4.20, 42.02, -0.84 | Stalle_slates/slate + Stalle_slates/slate | 2.9 | 0.7 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 4.29, 42.03, -0.83 | Stalle_slates/slate + Stalle_slates/slate | 2.9 | 72.9 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 9.09, 42.27, -0.67 | Stalle_slates/slate + Stalle_slates/slate | 2.78 | 29 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.85, 42.38, -0.58 | Stalle_slates/slate + Stalle_slates/slate | 2.6 | 6.9 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.92, 42.39, -0.58 | Stalle_slates/slate + Stalle_slates/slate | 2.6 | 37.2 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.98, 42.39, -0.58 | Stalle_slates/slate + Stalle_slates/slate | 2.62 | 6.7 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 1.04, 42.63, -0.42 | Stalle_slates/slate + Stalle_slates/slate | 2.36 | 56.4 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 12.77, 43.10, -0.09 | Stalle_slates/slate + Stalle_slates/slate | 2.8 | 57.1 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + -0.79 |
| 7.13, 40.01, 2.45 | Stalle_slates/slate + Stalle_slates/slate | 2.74 | 1.7 | 0.5 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 10.02, 40.13, 2.36 | Stalle_slates/slate + Stalle_slates/slate | 2.4 | 40 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.33, 40.36, 2.20 | Stalle_slates/slate + Stalle_slates/slate | 2.82 | 9 | 0.5 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.26, 40.37, 2.20 | Stalle_slates/slate + Stalle_slates/slate | 2.82 | 45.6 | 0.5 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.19, 40.37, 2.19 | Stalle_slates/slate + Stalle_slates/slate | 2.84 | 10.1 | 0.5 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 11.66, 40.37, 2.19 | Stalle_slates/slate + Stalle_slates/slate | 2.78 | 29.3 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 0.76, 41.08, 1.69 | Stalle_slates/slate + Stalle_slates/slate | 0.73 | 2.5 | 0.8 | 52 | 0.4 | false | -1 + 0 + 0 |
| 0.76, 41.07, 1.69 | Stalle_slates/slate + Stalle_slates/slate | 0.73 | 0.6 | 0.8 | 52 | 0.4 | false | -1 + 0 + 0 |
| 0.76, 41.20, 1.61 | Stalle_slates/slate + Stalle_slates/slate | 2.77 | 2.2 | 0.8 | 52 | 0.4 | false | -1 + -0.01 + 0.01 |
| 0.76, 41.19, 1.61 | Stalle_slates/slate + Stalle_slates/slate | 2.77 | 0.4 | 0.8 | 52 | 0.4 | false | -1 + -0.01 + 0.01 |
| 10.53, 41.56, 1.36 | Stalle_slates/slate + Stalle_slates/slate | 2.76 | 7 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 14.39, 41.54, 1.38 | Stalle_slates/slate + Stalle_slates/slate | 2.77 | 0.5 | 0.7 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 14.39, 41.56, 1.37 | Stalle_slates/slate + Stalle_slates/slate | 2.77 | 3.2 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.68, 42.38, 0.79 | Stalle_slates/slate + Stalle_slates/slate | 2.9 | 10.6 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.65, 42.39, 0.78 | Stalle_slates/slate + Stalle_slates/slate | 2.93 | 14.6 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 7.62, 42.39, 0.78 | Stalle_slates/slate + Stalle_slates/slate | 2.94 | 10.1 | 0.6 | 52 | 0.4 | false | 0 + 0.61 + 0.79 |
| 0.76, 42.74, 0.53 | Stalle_slates/slate + Stalle_slates/slate | 2.02 | 3.1 | 0.8 | 52 | 0.4 | false | -1 + 0 + 0 |

(78 more in the JSON)

## sliver (warn, 1663)

| at | part | aspect | longest |
|---|---|---|---|
| 0.75, 40.00, -2.15 | Stalle/sandstone_rubble | 1749 | 1.354 |
| 0.75, 40.00, 2.35 | Stalle/sandstone_rubble | 1749 | 1.354 |
| 7.54, 36.95, -4.25 | Stalle/sandstone_rubble | 75 | 2.239 |
| 8.29, 36.96, -4.25 | Stalle/sandstone_rubble | 75 | 2.4 |
| 2.43, 36.99, -4.25 | Stalle/sandstone_rubble | 51 | 1.962 |
| 2.95, 37.14, -4.25 | Stalle/sandstone_rubble | 64 | 5.178 |
| 5.46, 37.24, -4.25 | Stalle/sandstone_rubble | 40 | 11.2 |
| 7.22, 34.70, -4.30 | Stalle/sandstone_rubble | 61 | 6.071 |
| 9.25, 34.73, -4.27 | Stalle/sandstone_rubble | 61 | 6.071 |
| 2.30, 36.91, 4.45 | Stalle/sandstone_rubble | 103 | 1.588 |
| 2.96, 36.86, 4.45 | Stalle/sandstone_rubble | 51 | 2.136 |
| 2.75, 36.98, 4.45 | Stalle/sandstone_rubble | 69 | 4.431 |
| 8.31, 36.96, 4.45 | Stalle/sandstone_rubble | 74 | 2.318 |
| 8.01, 37.09, 4.45 | Stalle/sandstone_rubble | 253 | 3.909 |
| 5.34, 36.86, 4.45 | Stalle/sandstone_rubble | 61 | 2.263 |
| 7.01, 34.70, 4.50 | Stalle/sandstone_rubble | 107 | 10.62 |
| 3.47, 34.73, 4.47 | Stalle/sandstone_rubble | 107 | 10.62 |
| 14.57, 37.92, -2.15 | Stalle/sandstone_rubble | 56 | 3.814 |
| 11.31, 39.75, -2.15 | Stalle/sandstone_rubble | 41 | 2.333 |
| 11.30, 39.93, -2.15 | Stalle/sandstone_rubble | 111 | 5.088 |
| 6.86, 39.37, -2.15 | Stalle/sandstone_rubble | 40 | 2.301 |
| 6.14, 39.38, -2.15 | Stalle/sandstone_rubble | 41 | 2.165 |
| 7.01, 39.95, -2.15 | Stalle/sandstone_rubble | 125 | 2.133 |
| 6.22, 39.95, -2.15 | Stalle/sandstone_rubble | 85 | 2.45 |
| 1.84, 40.01, -2.15 | Stalle/sandstone_rubble | 117 | 2.806 |
| 3.66, 39.38, -2.15 | Stalle/sandstone_rubble | 42 | 2.215 |
| 3.63, 39.94, -2.15 | Stalle/sandstone_rubble | 89 | 2.183 |
| 4.40, 39.37, -2.15 | Stalle/sandstone_rubble | 41 | 2.351 |
| 4.36, 39.95, -2.15 | Stalle/sandstone_rubble | 87 | 2.5 |
| 2.70, 40.02, -2.15 | Stalle/sandstone_rubble | 64 | 5.303 |
| 4.35, 40.02, -2.15 | Stalle/sandstone_rubble | 139 | 7.752 |
| 9.66, 39.95, -2.15 | Stalle/sandstone_rubble | 190 | 5.405 |
| 11.88, 40.02, -2.15 | Stalle/sandstone_rubble | 50 | 7.002 |
| 7.50, 40.08, -2.15 | Stalle/sandstone_rubble | 84 | 14.75 |
| 11.37, 37.20, -2.15 | Stalle/sandstone_rubble | 40 | 3.104 |
| 8.99, 39.23, -2.15 | Stalle/sandstone_rubble | 47 | 3.399 |
| 1.87, 39.21, -2.15 | Stalle/sandstone_rubble | 143 | 2.902 |
| 8.90, 39.21, -2.15 | Stalle/sandstone_rubble | 213 | 3.547 |
| 3.53, 39.21, -2.15 | Stalle/sandstone_rubble | 493 | 5.389 |
| 3.56, 39.95, 2.35 | Stalle/sandstone_rubble | 128 | 2.183 |

(1623 more in the JSON)

## winding (warn, 42)

| at | part |
|---|---|
| -0.11, 38.45, 0.15 | Stalle/stone_white |
| -0.13, 38.43, 0.15 | Stalle/stone_white |
| -0.05, 38.46, 0.11 | Stalle/stone_white |
| -0.07, 38.48, 0.06 | Stalle/stone_white |
| -0.12, 38.46, 0.07 | Stalle/stone_white |
| -0.13, 38.34, 0.15 | Stalle/stone_white |
| -0.05, 38.38, 0.15 | Stalle/stone_white |
| -0.04, 38.35, 0.13 | Stalle/stone_white |
| -0.13, 38.35, 0.08 | Stalle/stone_white |
| -0.13, 38.33, 0.08 | Stalle/stone_white |
| -0.13, 38.29, 0.08 | Stalle/stone_white |
| -0.13, 38.27, 0.08 | Stalle/stone_white |
| -0.08, 38.39, 0.02 | Stalle/stone_white |
| -0.07, 38.39, 0.02 | Stalle/stone_white |
| -0.10, 38.40, 0.03 | Stalle/stone_white |
| -0.12, 38.01, 0.20 | Stalle/stone_white |
| -0.13, 38.03, 0.19 | Stalle/stone_white |
| -0.05, 38.02, 0.19 | Stalle/stone_white |
| -0.06, 37.98, 0.19 | Stalle/stone_white |
| -0.09, 37.98, 0.08 | Stalle/stone_white |
| -0.09, 38.01, 0.01 | Stalle/stone_white |
| -0.10, 37.97, 0.01 | Stalle/stone_white |
| -0.11, 37.72, 0.14 | Stalle/stone_white |
| -0.15, 37.69, 0.15 | Stalle/stone_white |
| -0.15, 37.69, 0.16 | Stalle/stone_white |
| -0.14, 37.66, 0.16 | Stalle/stone_white |
| -0.14, 37.69, 0.15 | Stalle/stone_white |
| -0.11, 37.68, 0.15 | Stalle/stone_white |
| -0.11, 37.88, 0.01 | Stalle/stone_white |
| -0.14, 37.85, 0.00 | Stalle/stone_white |
| -0.11, 37.83, 0.06 | Stalle/stone_white |
| -0.20, 37.67, 0.02 | Stalle/stone_white |
| -0.20, 37.68, 0.02 | Stalle/stone_white |
| -0.11, 37.72, 0.01 | Stalle/stone_white |
| -0.17, 37.71, 0.01 | Stalle/stone_white |
| -0.18, 37.70, 0.01 | Stalle/stone_white |
| -0.16, 37.70, 0.04 | Stalle/stone_white |
| -0.19, 37.69, 0.04 | Stalle/stone_white |
| -0.13, 37.69, 0.04 | Stalle/stone_white |
| -0.13, 37.69, 0.01 | Stalle/stone_white |

(2 more in the JSON)

## nonmanifold (warn, 148)

| at | part | uses |
|---|---|---|
| -0.09, 38.48, 0.15 | Stalle/stone_white | 3 |
| -0.09, 38.48, 0.15 | Stalle/stone_white | 3 |
| -0.12, 38.45, 0.16 | Stalle/stone_white | 3 |
| -0.12, 38.43, 0.16 | Stalle/stone_white | 3 |
| -0.12, 38.44, 0.15 | Stalle/stone_white | 3 |
| -0.12, 38.45, 0.16 | Stalle/stone_white | 3 |
| -0.11, 38.45, 0.15 | Stalle/stone_white | 3 |
| -0.12, 38.41, 0.17 | Stalle/stone_white | 3 |
| -0.12, 38.47, 0.17 | Stalle/stone_white | 3 |
| -0.13, 38.45, 0.17 | Stalle/stone_white | 3 |
| -0.11, 38.41, 0.17 | Stalle/stone_white | 3 |
| -0.07, 38.42, 0.18 | Stalle/stone_white | 3 |
| -0.11, 38.46, 0.14 | Stalle/stone_white | 3 |
| -0.04, 38.44, 0.14 | Stalle/stone_white | 3 |
| -0.04, 38.44, 0.13 | Stalle/stone_white | 3 |
| -0.03, 38.41, 0.11 | Stalle/stone_white | 3 |
| -0.15, 38.41, 0.01 | Stalle/stone_white | 3 |
| -0.07, 38.48, 0.06 | Stalle/stone_white | 3 |
| -0.07, 38.47, 0.07 | Stalle/stone_white | 3 |
| -0.06, 38.45, 0.06 | Stalle/stone_white | 3 |
| -0.07, 38.46, 0.06 | Stalle/stone_white | 3 |
| -0.12, 38.45, 0.04 | Stalle/stone_white | 3 |
| -0.12, 38.46, 0.04 | Stalle/stone_white | 3 |
| -0.12, 38.46, 0.04 | Stalle/stone_white | 3 |
| -0.12, 38.46, 0.03 | Stalle/stone_white | 4 |
| -0.12, 38.44, 0.03 | Stalle/stone_white | 4 |
| -0.06, 38.47, 0.03 | Stalle/stone_white | 3 |
| -0.04, 38.44, 0.10 | Stalle/stone_white | 3 |
| -0.04, 38.44, 0.10 | Stalle/stone_white | 3 |
| -0.03, 38.44, 0.10 | Stalle/stone_white | 3 |
| -0.04, 38.41, 0.03 | Stalle/stone_white | 3 |
| -0.03, 38.41, 0.05 | Stalle/stone_white | 3 |
| -0.05, 38.43, 0.02 | Stalle/stone_white | 3 |
| -0.15, 38.34, 0.23 | Stalle/stone_white | 3 |
| -0.21, 38.33, 0.24 | Stalle/stone_white | 3 |
| -0.20, 38.32, 0.25 | Stalle/stone_white | 4 |
| -0.22, 38.33, 0.25 | Stalle/stone_white | 3 |
| -0.19, 38.35, 0.20 | Stalle/stone_white | 3 |
| -0.18, 38.31, 0.20 | Stalle/stone_white | 3 |
| -0.11, 38.40, 0.17 | Stalle/stone_white | 3 |

(108 more in the JSON)

## tjunction (warn, 103)

| at | part | edge_m |
|---|---|---|
| 0.00, 34.76, -4.25 | Stalle/sandstone_rubble | 4.22 |
| 0.00, 40.14, -2.15 | Stalle/sandstone_rubble | 1.28 |
| 0.00, 40.14, 2.35 | Stalle/sandstone_rubble | 1.28 |
| 0.00, 34.76, 4.45 | Stalle/sandstone_rubble | 4.22 |
| 0.26, 34.32, -0.60 | Stalle/sandstone_rubble | 0.195 |
| 0.26, 34.32, 0.80 | Stalle/sandstone_rubble | 0.195 |
| 11.20, 34.75, -4.25 | Stalle/sandstone_rubble | 4.13 |
| 0.00, 34.76, -4.25 | Stalle/sandstone_rubble | 4.13 |
| 10.58, 37.33, -4.25 | Stalle/sandstone_rubble | 11.2 |
| 11.20, 37.44, -4.25 | Stalle/sandstone_rubble | 0.12 |
| 11.20, 34.75, -4.25 | Stalle/sandstone_rubble | 6.07 |
| 11.20, 34.75, -2.15 | Stalle/sandstone_rubble | 6.09 |
| 11.20, 34.75, -4.25 | Stalle/sandstone_rubble | 4.24 |
| 0.00, 34.76, 4.45 | Stalle/sandstone_rubble | 4.13 |
| 10.55, 34.75, 4.45 | Stalle/sandstone_rubble | 4.13 |
| 10.46, 34.75, 4.45 | Stalle/sandstone_rubble | 10.62 |
| 0.00, 39.27, -2.15 | Stalle/sandstone_rubble | 1.187 |
| 11.20, 34.75, -2.15 | Stalle/sandstone_rubble | 5.75 |
| 0.00, 39.27, 2.35 | Stalle/sandstone_rubble | 1.187 |
| 14.75, 34.85, -2.15 | Stalle/sandstone_rubble | 2.353 |
| 10.50, 34.75, 7.34 | Stalle/sandstone_rubble | 4.78 |
| -6.67, 34.95, 4.15 | Stalle/sandstone_rubble | 7.32 |
| -6.67, 34.95, 9.97 | Stalle/sandstone_rubble | 7.32 |
| 0.00, 35.04, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 35.34, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 35.64, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 35.94, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 36.24, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 36.54, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 36.84, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 37.14, -4.25 | Stalle/stone_white | 0.288 |
| 0.00, 35.04, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 35.34, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 35.64, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 35.94, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 36.24, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 36.54, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 36.84, 4.45 | Stalle/stone_white | 0.288 |
| 0.00, 37.14, 4.45 | Stalle/stone_white | 0.288 |
| 0.32, 44.73, 0.04 | Stalle/stone_white | 0.58 |

(63 more in the JSON)

## seam (info, 27730)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 13.60, 38.87, -2.15 | Stalle/sandstone_rubble + Stalle/stone_white | 6.21 | 195 | 66.8 |
| 16.88, 38.87, 0.75 | Stalle/sandstone_rubble + Stalle/stone_white | 6.21 | 192 | 66.8 |
| 12.84, 39.80, -2.31 | Stalle/slate + Stalle/zinc_roof | 143.35 | 165 | 58.3 |
| 14.75, 40.13, -2.15 | Stalle/sandstone_rubble + Stalle/slate | 71.04 | 162 | 33.8 |
| 12.40, 38.24, -2.07 | Stalle/stone_white + Stalle/stone_white | 6.22 | 160 | 90 |
| 16.80, 38.24, -0.45 | Stalle/stone_white + Stalle/stone_white | 6.22 | 160 | 90 |
| 0.08, 38.18, 0.95 | Stalle/stone_white + Stalle/stone_white | 8.21 | 144 | 90 |
| 7.60, 39.67, 2.35 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 128 | 90 |
| 8.01, 39.79, -2.15 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 127 | 90 |
| 5.57, 39.71, -2.15 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 127 | 90 |
| 5.14, 39.70, 2.35 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 126 | 90 |
| 2.98, 39.52, -2.15 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 125 | 90 |
| 2.64, 39.70, 2.35 | Stalle/sandstone_rubble + Stalle/stone_white | 2.7 | 125 | 90 |
| 9.45, 36.44, -4.25 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 122 | 90 |
| 6.47, 36.37, 4.45 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 121 | 90 |
| 1.97, 36.34, -4.25 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 114 | 90 |
| 8.87, 36.37, 4.45 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 113 | 90 |
| 0.00, 42.07, -0.22 | Stalle/sandstone_rubble + Stalle/stone_white | 3.39 | 112 | 90 |
| 7.03, 36.40, -4.25 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 112 | 90 |
| 1.57, 36.42, 4.45 | Stalle/sandstone_rubble + Stalle/stone_white | 3.32 | 112 | 90 |
| 16.95, 39.80, 0.34 | Stalle/stone_white + Stalle/zinc_roof | 1.46 | 100 | 34 |
| -6.62, 36.97, 9.97 | Stalle/stone_white + Stalle/brick_red_brussels | 14.5 | 78 | 90 |
| 0.40, 37.51, 3.88 | Stalle/zinc_roof + Stalle/zinc_roof | 0.46 | 78 | 64.5 |
| -6.55, 37.55, 10.28 | Stalle/zinc_roof + Stalle/zinc_roof | 0.46 | 78 | 64.5 |
| 11.32, 39.80, -2.31 | Stalle/zinc_roof + Stalle/zinc_roof | 0.45 | 76 | 63.6 |
| 0.83, 37.02, -4.50 | Stalle/zinc_roof + Stalle/zinc_roof | 0.45 | 76 | 63.6 |
| 0.82, 37.08, 4.75 | Stalle/zinc_roof + Stalle/zinc_roof | 0.45 | 76 | 63.6 |
| 0.17, 38.91, -0.23 | Stalle/stone_white + Stalle/glass_window | 5.15 | 70 | 90 |
| 0.17, 38.91, 0.33 | Stalle/stone_white + Stalle/glass_window | 5.15 | 70 | 90 |
| 0.17, 38.91, 0.89 | Stalle/stone_white + Stalle/glass_window | 5.15 | 70 | 90 |
| 13.00, 38.59, -1.98 | Stalle/stone_white + Stalle/glass_window | 4.24 | 70 | 90 |
| 12.46, 38.59, -1.98 | Stalle/stone_white + Stalle/glass_window | 4.24 | 70 | 90 |
| 16.71, 38.59, 0.15 | Stalle/stone_white + Stalle/glass_window | 4.24 | 70 | 90 |
| 16.71, 38.59, -0.39 | Stalle/stone_white + Stalle/glass_window | 4.24 | 70 | 90 |
| -6.60, 36.97, 4.15 | Stalle/stone_white + Stalle/brick_red_brussels | 14.5 | 70 | 90 |
| 0.37, 35.41, 0.19 | Stalle_door/painted_wood_red + Stalle_door/cast_iron_green | 0.47 | 68 | 90 |
| 0.12, 42.01, 0.30 | Stalle/stone_white + Stalle/glass_window | 1.25 | 64 | 90 |
| 1.52, 36.59, -4.13 | Stalle/stone_white + Stalle/glass_window | 1.25 | 64 | 90 |
| 6.54, 36.59, -4.13 | Stalle/stone_white + Stalle/glass_window | 1.25 | 64 | 90 |
| 8.94, 36.59, -4.13 | Stalle/stone_white + Stalle/glass_window | 1.25 | 64 | 90 |

(27690 more in the JSON)

## opening (info, 159)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.75, 40.30, -2.15 | Stalle/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 0.75, 39.52, 2.35 | Stalle/sandstone_rubble | 1 + 0 + 0 | 1.354 |
| 10.63, 37.45, -4.25 | Stalle/sandstone_rubble | 0 + 0 + -1 | 0.62 |
| 11.15, 37.33, -4.25 | Stalle/sandstone_rubble | 0 + 0 + -1 | 0.62 |
| 11.20, 37.47, -4.21 | Stalle/sandstone_rubble | 1 + 0 + 0 | 2.799 |
| 10.60, 37.47, -4.23 | Stalle/sandstone_rubble | -1 + 0 + 0 | 0.163 |
| 0.75, 40.14, -2.15 | Stalle/sandstone_rubble | 0 + 0 + -1 | 14.75 |
| 0.05, 40.14, 2.35 | Stalle/sandstone_rubble | 0 + 0 + 1 | 14.75 |
| 0.25, 38.95, 2.35 | Stalle/sandstone_rubble | 0 + 0 + 1 | 10.55 |
| 10.55, 38.90, 2.35 | Stalle/sandstone_rubble | 0 + 0 + 1 | 5.75 |
| 10.48, 34.75, 7.34 | Stalle/sandstone_rubble | 0 + 1 + 0 | 0.04 |
| 15.22, 34.75, 7.34 | Stalle/sandstone_rubble | 0 + 1 + 0 | 0.04 |
| -6.69, 34.95, 9.97 | Stalle/sandstone_rubble | 0 + 1 + 0 | 0.035 |
| -6.69, 34.95, 4.15 | Stalle/sandstone_rubble | 0 + 1 + 0 | 0.035 |
| 0.60, 34.95, 9.97 | Stalle/sandstone_rubble | 0 + 1 + 0 | 0.035 |
| 0.18, 40.19, 0.24 | Stalle/stone_white | 0 + -0.88 + -0.47 | 0.1 |
| 0.18, 40.23, 0.15 | Stalle/stone_white | 0 + -0.92 + -0.4 | 0.1 |
| 0.18, 40.23, 0.05 | Stalle/stone_white | 0 + -0.92 + 0.4 | 0.1 |
| 0.18, 40.19, -0.04 | Stalle/stone_white | 0 + -0.88 + 0.47 | 0.1 |
| 0.32, 44.73, 0.10 | Stalle/stone_white | -1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.10 | Stalle/stone_white | 1 + 0 + 0 | 0.11 |
| 0.43, 44.73, 0.33 | Stalle/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, 0.33 | Stalle/stone_white | 0 + -1 + 0 | 0.235 |
| 0.43, 44.73, -0.13 | Stalle/stone_white | 0 + -1 + 0 | 0.235 |
| 0.32, 44.73, -0.13 | Stalle/stone_white | 0 + -1 + 0 | 0.235 |
| -0.16, 37.29, 0.27 | Stalle/stone_white | 0 + 0 + 1 | 0.26 |
| -0.16, 37.29, -0.07 | Stalle/stone_white | 0 + 0 + -1 | 0.26 |
| 11.20, 35.00, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 35.30, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 35.60, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 35.90, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 36.20, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 36.50, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 36.80, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 37.10, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.288 |
| 11.20, 37.23, -4.25 | Stalle/stone_white | 1 + 0 + 0 | 0.138 |
| -6.68, 36.97, 9.97 | Stalle/stone_white | 0 + 1 + 0 | 0.03 |
| -6.68, 36.97, 4.15 | Stalle/stone_white | 0 + 1 + 0 | 0.03 |
| -6.68, 36.85, 9.97 | Stalle/stone_white | 0 + -1 + 0 | 0.03 |
| -6.68, 36.85, 4.15 | Stalle/stone_white | 0 + -1 + 0 | 0.03 |

(119 more in the JSON)

## backtoback (info, 383)

| at | parts | area |
|---|---|---|
| 0.75, 42.80, -0.25 | Stalle/sandstone_rubble + Stalle/slate | 0.03008 |
| 0.75, 41.57, -1.13 | Stalle/sandstone_rubble + Stalle/slate | 0.09757 |
| 0.75, 43.23, 0.03 | Stalle/sandstone_rubble + Stalle/slate | 0.00607 |
| 0.75, 43.13, -0.05 | Stalle/sandstone_rubble + Stalle/slate | 0.00122 |
| 0.75, 38.76, -2.64 | Stalle/sandstone_rubble + Stalle/slate | 0.01614 |
| 0.75, 38.08, -3.42 | Stalle/sandstone_rubble + Stalle/slate | 0.05077 |
| 0.75, 39.07, -2.31 | Stalle/sandstone_rubble + Stalle/slate | 0.01402 |
| 0.75, 38.97, -2.44 | Stalle/sandstone_rubble + Stalle/slate | 0.007 |
| 0.75, 40.08, -2.15 | Stalle/sandstone_rubble + Stalle/slate | 0.00008 |
| 0.75, 37.50, 4.26 | Stalle/sandstone_rubble + Stalle/slate | 0.00336 |
| 0.75, 38.06, 3.64 | Stalle/sandstone_rubble + Stalle/slate | 0.06354 |
| 0.75, 39.01, 2.58 | Stalle/sandstone_rubble + Stalle/slate | 0.02101 |
| 0.75, 40.59, 2.00 | Stalle/sandstone_rubble + Stalle/slate | 0.02714 |
| 0.75, 41.90, 1.09 | Stalle/sandstone_rubble + Stalle/slate | 0.10051 |
| 0.75, 43.21, 0.18 | Stalle/sandstone_rubble + Stalle/slate | 0.00729 |
| 0.75, 40.07, 2.35 | Stalle/sandstone_rubble + Stalle/slate | 0.00008 |
| 10.60, 37.50, -4.06 | Stalle/sandstone_rubble + Stalle/slate | 0.00336 |
| 10.60, 38.26, -3.21 | Stalle/sandstone_rubble + Stalle/slate | 0.06653 |
| 10.60, 39.03, -2.36 | Stalle/sandstone_rubble + Stalle/slate | 0.01809 |
| 11.24, 34.37, -2.15 | Stalle/sandstone_rubble + Stalle/sandstone_rubble | 0.04336 |
| -4.75, 34.95, 4.13 | Stalle/sandstone_rubble + Stalle/stone_white | 0.01512 |
| -4.31, 34.95, 4.13 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00682 |
| -4.64, 34.95, 4.14 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00798 |
| -4.20, 34.95, 4.14 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00088 |
| -4.71, 34.95, 10.00 | Stalle/sandstone_rubble + Stalle/stone_white | 0.0047 |
| -5.15, 34.95, 10.00 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00289 |
| -1.45, 34.95, 9.99 | Stalle/sandstone_rubble + Stalle/stone_white | 0.01474 |
| -1.89, 34.95, 9.99 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00674 |
| -4.82, 34.95, 9.98 | Stalle/sandstone_rubble + Stalle/stone_white | 0.0184 |
| -5.23, 34.95, 9.99 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00481 |
| -1.60, 34.95, 9.97 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00836 |
| -1.99, 34.95, 9.98 | Stalle/sandstone_rubble + Stalle/stone_white | 0.00096 |
| 0.77, 38.35, -3.13 | Stalle/stone_white + Stalle/slate | 0.07894 |
| 0.77, 38.03, -3.51 | Stalle/stone_white + Stalle_slates/slate | 0.00243 |
| 0.78, 38.09, -3.44 | Stalle/stone_white + Stalle_slates/slate | 0.00049 |
| 0.77, 38.34, 3.35 | Stalle/stone_white + Stalle/slate | 0.08061 |
| 0.77, 38.05, 3.69 | Stalle/stone_white + Stalle_slates/slate | 0.00268 |
| 0.17, 37.65, 4.27 | Stalle/stone_white + Stalle/stone_white | 0.0101 |
| 0.28, 37.65, 4.32 | Stalle/stone_white + Stalle/stone_white | 0.0146 |
| 0.25, 37.65, 4.16 | Stalle/stone_white + Stalle/stone_white | 0.03722 |

(343 more in the JSON)


Nodes: Stalle, Stalle_door, Stalle_slates. Distances: {"Stalle":94,"Stalle_door":334,"Stalle_slates":52,"Stalle_far":2000,"Stalle_lod1":334,"Stalle_lod2":2000}. Quantum 0.000 mm. Offset 0,30,0.
