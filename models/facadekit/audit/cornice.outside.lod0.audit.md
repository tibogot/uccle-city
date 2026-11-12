# Kit audit: cornice.outside LOD0

1,568 triangles, 779 welded vertices, 20 open edges, 13,488 rays, 43 ms.

**0 blocking**, 324 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 16 |
| sliver | warn | 240 |
| nonmanifold | warn | 68 |
| seam | info | 42 |
| opening | info | 10 |
| backtoback | info | 56 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -2.60, 3.64, 0.11 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 60.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -2.58, 3.64, 0.07 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 2.4 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -2.62, 3.64, 0.22 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 7.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -2.59, 3.64, 0.19 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 66.2 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -2.00, 3.64, 0.11 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 60.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.98, 3.64, 0.07 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 2.4 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -2.02, 3.64, 0.22 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 7.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.99, 3.64, 0.19 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 66.2 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.41, 3.64, 0.11 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 60.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.38, 3.64, 0.07 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 2.4 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.42, 3.64, 0.22 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 7.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -1.39, 3.64, 0.19 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 66.2 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -0.81, 3.64, 0.11 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 60.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -0.78, 3.64, 0.07 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 2.4 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -0.81, 3.64, 0.22 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 7.8 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |
| -0.79, 3.64, 0.19 | modillion.lod0/stone_white + modillion.lod0/stone_white | 2 | 66.2 | 0 | 32 | 0.24 | false | 0 + 1 + 0 |

## sliver (warn, 240)

| at | part | aspect | longest |
|---|---|---|---|
| -2.00, 3.40, 0.00 | cornice.lod0/stone_white | 214 | 2.998 |
| -2.00, 3.40, 0.01 | cornice.lod0/stone_white | 355 | 3.012 |
| -1.99, 3.53, 0.02 | cornice.lod0/stone_white | 356 | 3.018 |
| -1.99, 3.54, 0.03 | cornice.lod0/stone_white | 189 | 3.024 |
| -1.99, 3.54, 0.04 | cornice.lod0/stone_white | 127 | 3.04 |
| -1.99, 3.56, 0.04 | cornice.lod0/stone_white | 253 | 3.04 |
| -1.98, 3.56, 0.06 | cornice.lod0/stone_white | 213 | 3.052 |
| -1.98, 3.56, 0.07 | cornice.lod0/stone_white | 214 | 3.066 |
| -1.97, 3.57, 0.08 | cornice.lod0/stone_white | 214 | 3.08 |
| -1.97, 3.58, 0.09 | cornice.lod0/stone_white | 215 | 3.091 |
| -1.97, 3.59, 0.10 | cornice.lod0/stone_white | 216 | 3.1 |
| -1.97, 3.61, 0.11 | cornice.lod0/stone_white | 216 | 3.105 |
| -1.96, 3.62, 0.11 | cornice.lod0/stone_white | 223 | 3.107 |
| -1.96, 3.63, 0.12 | cornice.lod0/stone_white | 140 | 3.12 |
| -1.90, 3.64, 0.30 | cornice.lod0/stone_white | 330 | 3.3 |
| -1.90, 3.65, 0.31 | cornice.lod0/stone_white | 826 | 3.306 |
| -1.90, 3.65, 0.31 | cornice.lod0/stone_white | 414 | 3.31 |
| -1.90, 3.64, 0.32 | cornice.lod0/stone_white | 166 | 3.31 |
| -1.89, 3.78, 0.33 | cornice.lod0/stone_white | 520 | 3.33 |
| -1.89, 3.79, 0.33 | cornice.lod0/stone_white | 222 | 3.334 |
| -1.89, 3.80, 0.34 | cornice.lod0/stone_white | 509 | 3.334 |
| -1.89, 3.81, 0.34 | cornice.lod0/stone_white | 234 | 3.339 |
| -1.89, 3.83, 0.34 | cornice.lod0/stone_white | 161 | 3.343 |
| -1.88, 3.85, 0.35 | cornice.lod0/stone_white | 138 | 3.348 |
| -1.88, 3.87, 0.35 | cornice.lod0/stone_white | 138 | 3.352 |
| -1.88, 3.89, 0.36 | cornice.lod0/stone_white | 162 | 3.357 |
| -1.88, 3.91, 0.36 | cornice.lod0/stone_white | 235 | 3.361 |
| -1.88, 3.92, 0.37 | cornice.lod0/stone_white | 514 | 3.366 |
| -1.88, 3.93, 0.37 | cornice.lod0/stone_white | 259 | 3.37 |
| -1.88, 3.94, 0.37 | cornice.lod0/stone_white | 366 | 3.37 |
| -1.98, 4.00, 0.03 | cornice.lod0/stone_white | 59 | 3.05 |
| -1.00, 3.40, 0.01 | cornice.lod0/stone_white | 215 | 3.012 |
| -0.99, 3.40, 0.02 | cornice.lod0/stone_white | 356 | 3.018 |
| -0.99, 3.53, 0.02 | cornice.lod0/stone_white | 356 | 3.024 |
| -0.98, 3.54, 0.04 | cornice.lod0/stone_white | 190 | 3.04 |
| -0.97, 3.55, 0.04 | cornice.lod0/stone_white | 127 | 3.04 |
| -0.97, 3.56, 0.05 | cornice.lod0/stone_white | 254 | 3.052 |
| -0.96, 3.56, 0.06 | cornice.lod0/stone_white | 214 | 3.066 |
| -0.95, 3.57, 0.07 | cornice.lod0/stone_white | 214 | 3.079 |
| -0.94, 3.57, 0.09 | cornice.lod0/stone_white | 215 | 3.091 |

(200 more in the JSON)

## nonmanifold (warn, 68)

| at | part | uses |
|---|---|---|
| 0.33, 3.79, 0.33 | cornice.lod0/stone_white | 4 |
| 0.23, 3.71, 0.23 | cornice.lod0/stone_white | 4 |
| 0.23, 3.72, 0.23 | cornice.lod0/stone_white | 4 |
| 0.01, 3.40, 0.01 | cornice.lod0/stone_white | 4 |
| 0.01, 3.40, 0.01 | cornice.lod0/stone_white | 4 |
| 0.02, 3.47, 0.02 | cornice.lod0/stone_white | 4 |
| 0.02, 3.53, 0.02 | cornice.lod0/stone_white | 4 |
| 0.03, 3.54, 0.03 | cornice.lod0/stone_white | 4 |
| 0.04, 3.55, 0.04 | cornice.lod0/stone_white | 4 |
| 0.05, 3.56, 0.05 | cornice.lod0/stone_white | 4 |
| 0.06, 3.56, 0.06 | cornice.lod0/stone_white | 4 |
| 0.07, 3.56, 0.07 | cornice.lod0/stone_white | 4 |
| 0.09, 3.57, 0.09 | cornice.lod0/stone_white | 4 |
| 0.10, 3.58, 0.10 | cornice.lod0/stone_white | 4 |
| 0.10, 3.59, 0.10 | cornice.lod0/stone_white | 4 |
| 0.11, 3.61, 0.11 | cornice.lod0/stone_white | 4 |
| 0.11, 3.62, 0.11 | cornice.lod0/stone_white | 4 |
| 0.13, 3.63, 0.13 | cornice.lod0/stone_white | 4 |
| 0.21, 3.64, 0.21 | cornice.lod0/stone_white | 4 |
| 0.30, 3.64, 0.30 | cornice.lod0/stone_white | 4 |
| 0.31, 3.65, 0.31 | cornice.lod0/stone_white | 4 |
| 0.31, 3.64, 0.31 | cornice.lod0/stone_white | 4 |
| 0.32, 3.64, 0.32 | cornice.lod0/stone_white | 4 |
| 0.33, 3.71, 0.33 | cornice.lod0/stone_white | 4 |
| 0.33, 3.78, 0.33 | cornice.lod0/stone_white | 4 |
| 0.33, 3.79, 0.33 | cornice.lod0/stone_white | 4 |
| 0.34, 3.80, 0.34 | cornice.lod0/stone_white | 4 |
| 0.34, 3.81, 0.34 | cornice.lod0/stone_white | 4 |
| 0.34, 3.83, 0.34 | cornice.lod0/stone_white | 4 |
| 0.35, 3.85, 0.35 | cornice.lod0/stone_white | 4 |
| 0.35, 3.87, 0.35 | cornice.lod0/stone_white | 4 |
| 0.36, 3.90, 0.36 | cornice.lod0/stone_white | 4 |
| 0.36, 3.91, 0.36 | cornice.lod0/stone_white | 4 |
| 0.37, 3.92, 0.37 | cornice.lod0/stone_white | 4 |
| 0.37, 3.93, 0.37 | cornice.lod0/stone_white | 4 |
| 0.37, 3.94, 0.37 | cornice.lod0/stone_white | 4 |
| 0.21, 3.97, 0.21 | cornice.lod0/stone_white | 4 |
| 0.02, 4.00, 0.02 | cornice.lod0/stone_white | 4 |
| 0.01, 3.77, 0.01 | cornice.lod0/stone_white | 4 |
| 0.01, 3.46, 0.01 | cornice.lod0/stone_white | 4 |

(28 more in the JSON)

## seam (info, 42)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.65, 3.48, 0.02 | cornice.lod0/stone_white + modillion.lod0/stone_white | 1.28 | 97 | 22.5 |
| -2.05, 3.48, 0.02 | cornice.lod0/stone_white + modillion.lod0/stone_white | 1.28 | 97 | 22.5 |
| -1.45, 3.53, 0.02 | cornice.lod0/stone_white + modillion.lod0/stone_white | 1.28 | 95 | 22.5 |
| -0.85, 3.53, 0.02 | cornice.lod0/stone_white + modillion.lod0/stone_white | 1.28 | 95 | 22.5 |
| -2.63, 3.63, 0.12 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.14 | 26 | 63.4 |
| -2.03, 3.63, 0.12 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.14 | 26 | 63.4 |
| -1.43, 3.63, 0.12 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.14 | 26 | 63.4 |
| -0.83, 3.63, 0.12 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.14 | 24 | 63.4 |
| -0.96, 3.40, 0.00 | cornice.lod0/stone_white + wall/wall | 6.6 | 13 | 87.8 |
| 0.00, 3.40, -2.04 | cornice.lod0/stone_white + wall/wall | 6.6 | 13 | 87.8 |
| -1.40, 3.64, 0.00 | modillion.lod0/stone_white + wall/wall | 0.52 | 6 | 22.5 |
| -2.60, 3.64, 0.00 | modillion.lod0/stone_white + wall/wall | 0.52 | 4 | 22.5 |
| -2.00, 3.64, 0.00 | modillion.lod0/stone_white + wall/wall | 0.52 | 4 | 22.5 |
| -0.80, 3.64, 0.00 | modillion.lod0/stone_white + wall/wall | 0.52 | 4 | 22.5 |
| 0.00, 3.68, 0.00 | cornice.lod0/stone_white + wall/wall | 0.54 | 1 | 45 |
| 0.00, 3.68, 0.00 | cornice.lod0/stone_white + wall/wall | 0.54 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.97, 0.00 | cornice.lod0/stone_white + wall/wall | 0.03 | 1 | 45 |
| 0.00, 3.97, 0.00 | cornice.lod0/stone_white + wall/wall | 0.03 | 1 | 45 |
| 0.00, 3.40, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.40, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.41, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.41, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.99, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.99, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.68, 0.00 | cornice.lod0/stone_white + wall/wall | 0.54 | 1 | 45 |
| 0.00, 3.68, 0.00 | cornice.lod0/stone_white + wall/wall | 0.54 | 1 | 45 |
| 0.00, 3.40, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.40, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 3.41, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.41, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 3.97, 0.00 | cornice.lod0/stone_white + wall/wall | 0.03 | 1 | 45 |
| 0.00, 3.97, 0.00 | cornice.lod0/stone_white + wall/wall | 0.03 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0.01 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |
| 0.00, 4.00, 0.00 | cornice.lod0/stone_white + wall/wall | 0 | 1 | 45 |

(2 more in the JSON)

## opening (info, 10)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.00, 3.45, -0.00 | cornice.lod0/stone_white | -1 + 0 + 0 | 0.602 |
| -3.00, 4.00, 0.10 | cornice.lod0/zinc_roof | 0 + 0.99 + 0.16 | 0.341 |
| -3.00, 3.94, 0.38 | cornice.lod0/zinc_roof | 0 + 0.08 + 1 | 0.025 |
| -0.00, 3.45, -3.00 | cornice.lod0/stone_white | 0 + 0 + -1 | 0.602 |
| 0.32, 3.96, -3.00 | cornice.lod0/zinc_roof | 0.16 + 0.99 + 0 | 0.341 |
| 0.38, 3.94, -3.00 | cornice.lod0/zinc_roof | 1 + 0.08 + 0 | 0.025 |
| -2.95, 2.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| -0.05, 4.80, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 0.00, 2.00, -0.05 | wall/wall | 1 + 0 + 0 | 3 |
| 0.00, 4.80, -0.05 | wall/wall | 1 + 0 + 0 | 3 |

## backtoback (info, 56)

| at | parts | area |
|---|---|---|
| -2.63, 3.64, 0.20 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00418 |
| -2.59, 3.64, 0.20 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00887 |
| -2.03, 3.64, 0.19 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00384 |
| -1.98, 3.64, 0.19 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00634 |
| -1.43, 3.64, 0.17 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00317 |
| -1.38, 3.64, 0.17 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00414 |
| -0.82, 3.64, 0.16 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00219 |
| -0.78, 3.64, 0.15 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00225 |
| 0.27, 3.74, 0.27 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00243 |
| -2.64, 3.64, 0.29 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00006 |
| -2.60, 3.64, 0.29 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00186 |
| -2.04, 3.64, 0.27 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.0004 |
| -2.00, 3.64, 0.27 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00438 |
| -1.44, 3.64, 0.24 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00106 |
| -1.39, 3.64, 0.26 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00658 |
| -0.83, 3.64, 0.22 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00204 |
| -0.79, 3.64, 0.24 | cornice.lod0/stone_white + modillion.lod0/stone_white | 0.00847 |
| 0.01, 3.64, 0.01 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00851 |
| 0.06, 3.88, 0.06 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.01312 |
| 0.02, 3.70, 0.02 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00777 |
| 0.26, 3.95, 0.26 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00862 |
| 0.37, 3.93, 0.37 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.0001 |
| 0.36, 3.92, 0.36 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00009 |
| 0.37, 3.93, 0.37 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00004 |
| 0.01, 3.40, 0.01 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00006 |
| 0.01, 3.44, 0.01 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00175 |
| 0.25, 3.92, 0.25 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00555 |
| 0.25, 3.90, 0.25 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00555 |
| 0.26, 3.93, 0.26 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00476 |
| 0.05, 3.73, 0.05 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.02257 |
| 0.04, 3.54, 0.04 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00027 |
| 0.34, 3.82, 0.34 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00007 |
| 0.33, 3.79, 0.33 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00004 |
| 0.08, 3.75, 0.08 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00822 |
| 0.07, 3.57, 0.07 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00011 |
| 0.07, 3.58, 0.07 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00047 |
| 0.08, 3.58, 0.08 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00089 |
| 0.12, 3.63, 0.12 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00015 |
| 0.10, 3.60, 0.10 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00011 |
| 0.24, 3.88, 0.24 | cornice.lod0/stone_white + cornice.lod0/stone_white | 0.00966 |

(16 more in the JSON)
