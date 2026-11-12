# Kit audit: frenchBalconnet.ref LOD1

1,462 triangles, 846 welded vertices, 85 open edges, 14,616 rays, 49 ms.

**0 blocking**, 175 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 24 |
| sliver | warn | 119 |
| nonmanifold | warn | 24 |
| tjunction | warn | 7 |
| degenerate | warn | 1 |
| seam | info | 155 |
| opening | info | 7 |
| backtoback | info | 227 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 24)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.57, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.45, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.5 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.34, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.2 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.24, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 4.3 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.24, 0.84, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 1.1 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.24, 0.84, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 1.1 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.24, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 4.3 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.34, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.45, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.5 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.57, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.9 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.57, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.45, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 0.6 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.45, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.34, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 1 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.34, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.34, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.34, 0.82, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 1 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.45, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.45, 0.82, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 0.6 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.57, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.24, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.8 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.24, 0.83, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 6 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.24, 0.83, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 6 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.24, 0.82, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 1.5 | 2.8 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |

## sliver (warn, 119)

| at | part | aspect | longest |
|---|---|---|---|
| -0.60, 0.76, -0.05 | frenchWin.lod1/stone_white | 47 | 2.318 |
| -0.72, 0.80, 0.06 | frenchWin.lod1/stone_white | 58 | 2.414 |
| -0.75, 0.81, 0.07 | frenchWin.lod1/stone_white | 136 | 2.449 |
| -0.25, 2.45, 0.07 | frenchWin.lod1/stone_white | 85 | 1.508 |
| 0.73, 1.62, 0.07 | frenchWin.lod1/stone_white | 59 | 2.449 |
| 0.76, 1.64, 0.07 | frenchWin.lod1/stone_white | 137 | 2.467 |
| -0.73, 1.62, 0.07 | frenchWin.lod1/stone_white | 59 | 2.449 |
| -0.76, 1.64, 0.07 | frenchWin.lod1/stone_white | 137 | 2.467 |
| 0.25, 2.46, 0.07 | frenchWin.lod1/stone_white | 85 | 1.526 |
| 0.60, 0.76, 0.03 | frenchWin.lod1/stone_white | 46 | 2.305 |
| 0.72, 0.80, 0.06 | frenchWin.lod1/stone_white | 58 | 2.414 |
| 0.75, 0.81, 0.07 | frenchWin.lod1/stone_white | 136 | 2.449 |
| -0.18, 1.54, -0.09 | frenchWin.lod1/wood_frame_white | 48 | 1.06 |
| -0.18, 1.54, -0.08 | frenchWin.lod1/wood_frame_white | 147 | 1.06 |
| -0.18, 1.55, -0.08 | frenchWin.lod1/wood_frame_white | 70 | 1.06 |
| -0.18, 1.56, -0.09 | frenchWin.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.56, -0.10 | frenchWin.lod1/wood_frame_white | 92 | 1.475 |
| 0.02, 1.05, -0.10 | frenchWin.lod1/wood_frame_white | 92 | 1.475 |
| -0.01, 1.05, -0.11 | frenchWin.lod1/wood_frame_white | 41 | 1.475 |
| 0.01, 1.05, -0.09 | frenchWin.lod1/wood_frame_white | 41 | 1.475 |
| 0.18, 1.54, -0.09 | frenchWin.lod1/wood_frame_white | 48 | 1.06 |
| 0.18, 1.54, -0.07 | frenchWin.lod1/wood_frame_white | 147 | 1.06 |
| 0.18, 1.55, -0.08 | frenchWin.lod1/wood_frame_white | 70 | 1.06 |
| 0.18, 1.56, -0.09 | frenchWin.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 1.05, -0.10 | frenchWin.lod1/wood_frame_white | 92 | 1.475 |
| 0.02, 0.56, -0.10 | frenchWin.lod1/wood_frame_white | 92 | 1.475 |
| 0.01, 0.56, -0.11 | frenchWin.lod1/wood_frame_white | 41 | 1.475 |
| -0.01, 0.56, -0.09 | frenchWin.lod1/wood_frame_white | 41 | 1.475 |
| 0.75, -0.05, 0.08 | balconnet.lod1/stone_white | 54 | 0.26 |
| 0.25, -0.04, 0.23 | balconnet.lod1/stone_white | 49 | 1.47 |
| 0.25, -0.05, 0.25 | balconnet.lod1/stone_white | 165 | 1.501 |
| 0.25, -0.06, 0.25 | balconnet.lod1/stone_white | 113 | 1.5 |
| -0.24, -0.04, 0.24 | balconnet.lod1/stone_white | 49 | 1.5 |
| -0.25, -0.05, 0.25 | balconnet.lod1/stone_white | 116 | 1.501 |
| -0.25, -0.06, 0.24 | balconnet.lod1/stone_white | 163 | 1.489 |
| -0.23, 0.94, 0.20 | balconnet.lod1/cast_iron_green | 88 | 1.41 |
| -0.23, 0.96, 0.19 | balconnet.lod1/cast_iron_green | 105 | 1.412 |
| -0.23, 0.97, 0.18 | balconnet.lod1/cast_iron_green | 67 | 1.4 |
| -0.22, 0.97, 0.16 | balconnet.lod1/cast_iron_green | 65 | 1.36 |
| -0.22, 0.96, 0.15 | balconnet.lod1/cast_iron_green | 98 | 1.32 |

(79 more in the JSON)

## nonmanifold (warn, 24)

| at | part | uses |
|---|---|---|
| -0.53, 2.30, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.53, 0.00, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.53, 0.00, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.53, 2.30, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.53, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.48, 1.54, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.48, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.05, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.05, 1.54, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.00, 1.02, -0.16 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 1.54, -0.13 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 6 |
| 0.00, 1.02, -0.11 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.28, -0.16 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.28, -0.11 | frenchWin.lod1/wood_frame_white | 3 |
| 0.05, 1.54, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.05, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.48, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.48, 1.54, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.53, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.72, -0.04, 0.10 | balconnet.lod1/stone_white | 3 |
| 0.00, -0.04, 0.22 | balconnet.lod1/stone_white | 3 |
| -0.72, -0.04, 0.10 | balconnet.lod1/stone_white | 3 |

## tjunction (warn, 7)

| at | part | edge_m |
|---|---|---|
| -0.53, 1.54, -0.10 | frenchWin.lod1/wood_frame_white | 0.03 |
| 0.53, 1.54, -0.10 | frenchWin.lod1/wood_frame_white | 0.03 |
| 0.68, 0.97, 0.17 | balconnet.lod1/cast_iron_green | 0.017 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## degenerate (warn, 1)

| at | part | edge |
|---|---|---|
| 0.68, 0.97, 0.17 | balconnet.lod1/cast_iron_green | 0.0168 |

## seam (info, 155)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.66, 0.94, 0.05 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.3 | 32 | 90 |
| -0.07, 2.30, -0.02 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_white | 0.79 | 24 | 84.6 |
| -0.22, 0.31, 0.17 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.2 | 24 | 18.1 |
| 0.22, 0.31, 0.17 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.2 | 24 | 18.1 |
| 0.10, 0.43, 0.17 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 20 | 80 |
| -0.10, 0.43, 0.17 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 20 | 80 |
| -0.69, 0.97, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 19 | 16.7 |
| 0.69, 0.97, 0.18 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 17 | 16.7 |
| 0.73, -0.04, 0.00 | balconnet.lod1/stone_white + wall/wall | 0.15 | 14 | 89.4 |
| -0.75, -0.04, 0.00 | balconnet.lod1/stone_white + wall/wall | 0.15 | 14 | 90 |
| -0.60, -0.05, -0.01 | frenchWin.lod1/stone_blue + balconnet.lod1/stone_white | 2.48 | 13 | 90 |
| -0.60, 0.00, -0.10 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.5 | 12 | 90 |
| -0.60, 0.95, -0.17 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 5 | 12 | 90 |
| -0.67, 0.02, 0.05 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.12 | 11 | 90 |
| 0.68, -0.00, 0.04 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.12 | 11 | 90 |
| 0.60, 0.00, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 5 | 10 | 90 |
| -0.67, 0.82, 0.05 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.09 | 10 | 90 |
| 0.68, 0.84, 0.05 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.09 | 10 | 90 |
| 0.66, -0.00, 0.03 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.14 | 10 | 90 |
| -0.70, -0.00, 0.02 | frenchWin.lod1/stone_white + balconnet.lod1/cast_iron_green | 0.14 | 10 | 90 |
| -0.00, 0.49, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.11 | 10 | 90 |
| -0.02, 0.07, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.48 | 10 | 90 |
| -0.07, 0.14, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.38 | 10 | 90 |
| 0.46, 0.14, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.38 | 10 | 90 |
| -0.46, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.35, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.26, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 10 | 90 |
| 0.22, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.1 | 10 | 90 |
| 0.33, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.06 | 10 | 90 |
| 0.45, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.60, 0.23, 0.00 | frenchWin.lod1/stone_white + wall/wall | 5.1 | 9 | 90 |
| -0.60, -0.05, 0.00 | frenchWin.lod1/stone_blue + wall/wall | 2.5 | 9 | 90 |
| 0.00, 1.54, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.11 | 9 | 90 |
| 0.01, 0.49, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.48 | 9 | 90 |
| 0.60, 0.92, 0.00 | frenchWin.lod1/stone_white + wall/wall | 5.1 | 8 | 90 |
| -0.53, 1.58, -0.17 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.43 | 8 | 90 |
| 0.53, 1.54, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.43 | 8 | 90 |
| -0.48, 0.49, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.8 | 8 | 90 |
| 0.05, 0.49, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.8 | 8 | 90 |
| 0.56, 0.82, 0.16 | balconnet.lod1/cast_iron_green + balconnet.lod1/cast_iron_green | 0.06 | 8 | 90 |

(115 more in the JSON)

## opening (info, 7)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 2.25, -0.20 | frenchWin.lod1/stone_white | 1 + 0 + 0 | 2.304 |
| 0.60, 0.05, -0.20 | frenchWin.lod1/stone_white | -1 + 0 + 0 | 2.304 |
| -0.55, 2.30, -0.20 | frenchWin.lod1/stone_white | 0 + -1 + 0 | 1.2 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.55, 0.00 | wall/wall | 0 + 0 + 1 | 1.7 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 227)

| at | parts | area |
|---|---|---|
| -0.60, -0.00, -0.10 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00076 |
| -0.60, 0.90, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.07134 |
| -0.60, 0.95, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.02761 |
| 0.60, -0.00, -0.10 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.0008 |
| 0.60, 0.25, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00194 |
| 0.60, 0.34, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03824 |
| -0.60, -0.00, 0.01 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00008 |
| -0.60, 1.86, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00142 |
| -0.60, 1.52, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00869 |
| -0.58, 2.30, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.43, 2.30, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.01253 |
| -0.55, 2.30, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.29, 2.30, -0.11 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00398 |
| 0.60, 1.34, -0.15 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.07281 |
| 0.60, 1.22, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03651 |
| -0.04, 2.30, -0.15 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.02192 |
| 0.18, 2.30, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03047 |
| 0.55, 2.30, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.58, 2.30, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.60, 2.05, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00199 |
| -0.60, 1.96, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03845 |
| 0.60, -0.00, 0.01 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00004 |
| -0.55, 0.00, -0.14 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.02, 0.00, -0.15 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.02026 |
| -0.58, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.21, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.02926 |
| 0.41, 0.00, -0.14 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.01419 |
| 0.25, 0.00, -0.11 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00519 |
| 0.58, 0.00, -0.14 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.55, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.53, 0.03, -0.17 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00007 |
| -0.53, 0.39, -0.16 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00067 |
| -0.53, 0.47, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00016 |
| -0.53, 0.90, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.01406 |
| -0.53, 1.38, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00887 |
| -0.53, 1.57, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00218 |
| -0.53, 1.61, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00117 |
| -0.53, 2.25, -0.13 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00227 |
| -0.53, 2.28, -0.12 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00221 |
| 0.53, 0.05, -0.13 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00227 |

(187 more in the JSON)
