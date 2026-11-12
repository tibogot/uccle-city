# Kit audit: frenchBalconnet.big LOD0

6,970 triangles, 3,648 welded vertices, 121 open edges, 16,550 rays, 347 ms.

**0 blocking**, 1256 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 22 |
| sliver | warn | 1214 |
| nonmanifold | warn | 16 |
| tjunction | warn | 4 |
| seam | info | 181 |
| opening | info | 7 |
| backtoback | info | 218 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 22)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.57, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.6 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.45, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.4 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.34, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.2 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.24, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 2.9 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| 0.24, 0.84, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 0.7 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.24, 0.84, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 0.7 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.24, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 2.9 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.34, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.2 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.45, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.4 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.57, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.6 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| -0.57, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.8 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| -0.45, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.8 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| -0.34, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 0.5 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.34, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.7 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.34, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.7 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| 0.34, 0.82, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 0.5 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.45, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.8 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| 0.57, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.8 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.24, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.9 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| -0.24, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 4.1 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |
| 0.24, 0.83, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 4.1 | 0 | 32 | 0.24 | false | 0 + 0 + -1 |
| 0.24, 0.83, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 1.5 | 1.9 | 0 | 32 | 0.24 | false | 0 + 0 + 1 |

## sliver (warn, 1214)

| at | part | aspect | longest |
|---|---|---|---|
| -0.60, 0.77, 0.01 | frenchWin.lod0/stone_white | 78 | 2.333 |
| -0.60, 0.77, 0.03 | frenchWin.lod0/stone_white | 498 | 2.333 |
| -0.60, 0.77, 0.04 | frenchWin.lod0/stone_white | 498 | 2.334 |
| -0.60, 0.78, 0.04 | frenchWin.lod0/stone_white | 499 | 2.336 |
| -0.61, 0.78, 0.04 | frenchWin.lod0/stone_white | 500 | 2.34 |
| -0.61, 0.78, 0.04 | frenchWin.lod0/stone_white | 586 | 2.345 |
| -0.63, 0.78, 0.04 | frenchWin.lod0/stone_white | 53 | 2.349 |
| -0.66, 0.79, 0.04 | frenchWin.lod0/stone_white | 268 | 2.393 |
| -0.68, 0.80, 0.05 | frenchWin.lod0/stone_white | 52 | 2.397 |
| -0.71, 0.81, 0.05 | frenchWin.lod0/stone_white | 416 | 2.443 |
| -0.72, 0.81, 0.05 | frenchWin.lod0/stone_white | 355 | 2.449 |
| -0.72, 0.81, 0.06 | frenchWin.lod0/stone_white | 276 | 2.454 |
| -0.73, 0.82, 0.06 | frenchWin.lod0/stone_white | 277 | 2.46 |
| -0.73, 0.82, 0.07 | frenchWin.lod0/stone_white | 358 | 2.466 |
| -0.74, 0.82, 0.07 | frenchWin.lod0/stone_white | 421 | 2.472 |
| -0.75, 0.82, 0.07 | frenchWin.lod0/stone_white | 191 | 2.478 |
| -0.76, 0.83, 0.07 | frenchWin.lod0/stone_white | 352 | 2.491 |
| -0.20, 2.33, 0.01 | frenchWin.lod0/stone_white | 40 | 1.2 |
| -0.20, 2.33, 0.03 | frenchWin.lod0/stone_white | 257 | 1.201 |
| -0.20, 2.33, 0.04 | frenchWin.lod0/stone_white | 258 | 1.204 |
| -0.20, 2.33, 0.04 | frenchWin.lod0/stone_white | 259 | 1.215 |
| -0.20, 2.34, 0.04 | frenchWin.lod0/stone_white | 261 | 1.219 |
| -0.20, 2.34, 0.04 | frenchWin.lod0/stone_white | 308 | 1.228 |
| -0.22, 2.39, 0.04 | frenchWin.lod0/stone_white | 148 | 1.324 |
| -0.24, 2.44, 0.05 | frenchWin.lod0/stone_white | 244 | 1.426 |
| -0.24, 2.45, 0.05 | frenchWin.lod0/stone_white | 209 | 1.438 |
| -0.24, 2.45, 0.06 | frenchWin.lod0/stone_white | 164 | 1.449 |
| -0.24, 2.46, 0.06 | frenchWin.lod0/stone_white | 165 | 1.461 |
| -0.25, 2.46, 0.07 | frenchWin.lod0/stone_white | 215 | 1.473 |
| -0.25, 2.47, 0.07 | frenchWin.lod0/stone_white | 254 | 1.484 |
| -0.25, 2.48, 0.07 | frenchWin.lod0/stone_white | 117 | 1.503 |
| -0.25, 2.49, 0.07 | frenchWin.lod0/stone_white | 216 | 1.521 |
| 0.60, 1.55, 0.01 | frenchWin.lod0/stone_white | 78 | 2.333 |
| 0.60, 1.55, 0.03 | frenchWin.lod0/stone_white | 498 | 2.334 |
| 0.60, 1.55, 0.04 | frenchWin.lod0/stone_white | 499 | 2.336 |
| 0.61, 1.55, 0.04 | frenchWin.lod0/stone_white | 500 | 2.34 |
| 0.61, 1.56, 0.04 | frenchWin.lod0/stone_white | 501 | 2.345 |
| 0.61, 1.56, 0.04 | frenchWin.lod0/stone_white | 587 | 2.349 |
| 0.65, 1.58, 0.04 | frenchWin.lod0/stone_white | 54 | 2.393 |
| 0.66, 1.59, 0.05 | frenchWin.lod0/stone_white | 268 | 2.397 |

(1174 more in the JSON)

## nonmanifold (warn, 16)

| at | part | uses |
|---|---|---|
| 0.00, 2.33, 0.00 | frenchWin.lod0/stone_white | 3 |
| 0.00, 1.56, -0.13 | frenchWin.lod0/wood_frame_white | 3 |
| -0.01, 0.49, -0.13 | frenchWin.lod0/wood_frame_white | 4 |
| 0.00, 0.50, -0.13 | frenchWin.lod0/wood_frame_white | 3 |
| 0.00, 1.03, -0.15 | frenchWin.lod0/wood_frame_white | 3 |
| -0.53, 0.49, -0.13 | frenchWin.lod0/wood_frame_white | 4 |
| 0.00, 0.49, -0.13 | frenchWin.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | frenchWin.lod0/wood_frame_white | 3 |
| 0.00, 0.28, -0.15 | frenchWin.lod0/wood_frame_white | 3 |
| 0.53, 0.49, -0.13 | frenchWin.lod0/wood_frame_white | 4 |
| 0.01, 0.49, -0.13 | frenchWin.lod0/wood_frame_white | 4 |
| 0.00, 1.03, -0.11 | frenchWin.lod0/wood_frame_white | 3 |
| 0.00, 0.28, -0.11 | frenchWin.lod0/wood_frame_white | 3 |
| 0.72, -0.04, 0.10 | balconnet.lod0/stone_white | 3 |
| 0.00, -0.04, 0.22 | balconnet.lod0/stone_white | 3 |
| -0.72, -0.04, 0.10 | balconnet.lod0/stone_white | 3 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 181)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.08, 2.33, 0.01 | frenchWin.lod0/stone_white + frenchWin.lod0/stone_white | 0.76 | 88 | 84.6 |
| -0.66, 0.97, 0.04 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.32 | 46 | 75.1 |
| -0.22, 0.30, 0.17 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.2 | 36 | 14.7 |
| 0.22, 0.30, 0.17 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.2 | 36 | 14.7 |
| -0.26, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.1 | 34 | 67.5 |
| 0.22, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.1 | 34 | 67.5 |
| -0.57, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| -0.46, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| -0.35, 0.82, 0.16 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| 0.33, 0.82, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| 0.45, 0.82, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| 0.56, 0.82, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.06 | 32 | 67.5 |
| 0.02, 0.51, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.08 | 31 | 42 |
| -0.59, -0.05, -0.01 | frenchWin.lod0/stone_blue + balconnet.lod0/stone_white | 2.47 | 29 | 90 |
| -0.02, 0.51, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.08 | 29 | 42 |
| -0.67, 0.02, 0.05 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.11 | 27 | 90 |
| 0.69, -0.00, 0.04 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.11 | 27 | 90 |
| 0.69, -0.00, 0.04 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.14 | 26 | 90 |
| -0.05, 2.33, 0.09 | frenchWin.lod0/stone_white + frenchWin.lod0/stone_white | 0.8 | 26 | 67.4 |
| -0.69, -0.00, 0.00 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.14 | 26 | 90 |
| -0.21, 2.26, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| 0.19, 2.26, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| -0.21, 1.64, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.1 | 26 | 28 |
| 0.19, 1.64, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.1 | 26 | 28 |
| -0.48, 1.02, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.09 | 26 | 27.3 |
| -0.05, 1.02, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.09 | 26 | 27.3 |
| 0.05, 1.02, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.09 | 26 | 27.3 |
| 0.48, 1.02, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.09 | 26 | 27.3 |
| -0.59, -0.05, 0.00 | frenchWin.lod0/stone_blue + wall/wall | 2.49 | 25 | 90 |
| -0.00, 0.50, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 2.16 | 25 | 22.5 |
| -0.00, 0.07, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.86 | 25 | 22.5 |
| 0.01, 0.07, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.86 | 25 | 22.5 |
| -0.68, 0.97, 0.18 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.1 | 25 | 16.7 |
| -0.67, 0.84, 0.05 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.08 | 24 | 90 |
| 0.69, 0.84, 0.05 | frenchWin.lod0/stone_white + balconnet.lod0/cast_iron_green | 0.08 | 24 | 90 |
| -0.53, 1.57, -0.10 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.26 | 24 | 44.5 |
| 0.53, 1.57, -0.16 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.26 | 24 | 44.5 |
| 0.69, 0.97, 0.17 | balconnet.lod0/cast_iron_green + balconnet.lod0/cast_iron_green | 0.1 | 24 | 16.7 |
| 0.00, 0.49, -0.11 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 2.16 | 22 | 22.5 |
| 0.53, 0.00, -0.16 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.24 | 21 | 44.7 |

(141 more in the JSON)

## opening (info, 7)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 2.28, -0.20 | frenchWin.lod0/stone_white | 1 + 0 + 0 | 2.333 |
| -0.55, 2.33, -0.20 | frenchWin.lod0/stone_white | 0 + -1 + 0 | 1.2 |
| 0.60, 0.05, -0.20 | frenchWin.lod0/stone_white | -1 + 0 + 0 | 2.333 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.58, 0.00 | wall/wall | 0 + 0 + 1 | 1.671 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 218)

| at | parts | area |
|---|---|---|
| -0.60, 0.89, -0.14 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.05792 |
| -0.60, 0.97, -0.12 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.02346 |
| 0.60, 0.38, -0.15 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00342 |
| 0.60, 0.44, -0.13 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.03778 |
| -0.57, 2.33, -0.14 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00154 |
| -0.10, 2.33, -0.14 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.02681 |
| -0.56, 2.33, -0.12 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00154 |
| -0.07, 2.33, -0.12 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.0114 |
| 0.39, 2.33, -0.15 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00107 |
| 0.34, 2.33, -0.13 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.01647 |
| 0.56, 2.33, -0.14 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00154 |
| 0.57, 2.33, -0.12 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00154 |
| 0.60, 1.44, -0.14 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.05797 |
| 0.60, 1.35, -0.12 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.02362 |
| -0.60, 1.95, -0.15 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.00348 |
| -0.60, 1.89, -0.13 | frenchWin.lod0/stone_white + frenchWin.lod0/wood_frame_white | 0.03793 |
| -0.56, 0.00, -0.15 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.00154 |
| 0.02, 0.00, -0.15 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.01656 |
| -0.58, 0.00, -0.13 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.00154 |
| -0.19, 0.00, -0.12 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.02418 |
| 0.41, 0.00, -0.14 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.01132 |
| 0.27, 0.00, -0.11 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.00369 |
| 0.57, 0.00, -0.14 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.00154 |
| 0.56, 0.00, -0.12 | frenchWin.lod0/stone_blue + frenchWin.lod0/wood_frame_white | 0.00154 |
| -0.53, 0.40, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00045 |
| -0.53, 0.47, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00011 |
| -0.53, 0.91, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.01129 |
| -0.53, 1.40, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00723 |
| -0.53, 2.05, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.0037 |
| -0.53, 1.85, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.0037 |
| 0.53, 0.38, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.0082 |
| 0.53, 0.23, -0.12 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00798 |
| 0.53, 1.18, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.01451 |
| 0.53, 0.69, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.01055 |
| 0.11, 2.26, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00133 |
| 0.42, 2.26, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00187 |
| 0.37, 2.26, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00192 |
| -0.17, 0.07, -0.14 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00894 |
| -0.40, 0.07, -0.13 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00818 |
| 0.19, 0.07, -0.15 | frenchWin.lod0/wood_frame_white + frenchWin.lod0/wood_frame_white | 0.00246 |

(178 more in the JSON)
