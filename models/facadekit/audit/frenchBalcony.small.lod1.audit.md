# Kit audit: frenchBalcony.small LOD1

1,140 triangles, 697 welded vertices, 82 open edges, 14,464 rays, 35 ms.

**0 blocking**, 301 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 64 |
| sliver | warn | 207 |
| nonmanifold | warn | 24 |
| tjunction | warn | 6 |
| seam | info | 163 |
| opening | info | 7 |
| backtoback | info | 251 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 64)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.61, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.50, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.6 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.38, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.3 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.27, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.18, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.1 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.11, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.04, 0.82, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.8 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.04, 0.82, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.7 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.11, 0.82, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.6 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.18, 0.82, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.4 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.27, 0.82, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.4 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.27, 0.82, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.4 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.18, 0.82, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.4 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.11, 0.82, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.6 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.04, 0.82, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.7 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.04, 0.82, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.8 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.11, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.9 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.18, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.1 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.27, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.9 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.38, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.3 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.50, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.6 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.61, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.9 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.61, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.50, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.6 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.50, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 3.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.38, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.38, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 3 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.27, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.2 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.27, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 2.7 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.18, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 0.9 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.18, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.5 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.11, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.11, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.4 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| -0.04, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.2 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| -0.04, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.3 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.04, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.3 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.04, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.2 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.11, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.4 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |
| 0.11, 0.81, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1 | 0 | 119 | 0.91 | false | 0 + 0 + 1 |
| 0.18, 0.81, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 1.5 | 1.5 | 0 | 119 | 0.91 | false | 0 + 0 + -1 |

(24 more in the JSON)

## sliver (warn, 207)

| at | part | aspect | longest |
|---|---|---|---|
| -0.47, 0.76, -0.05 | frenchWin.lod1/stone_white | 46 | 2.292 |
| -0.59, 0.79, 0.06 | frenchWin.lod1/stone_white | 58 | 2.389 |
| -0.62, 0.80, 0.07 | frenchWin.lod1/stone_white | 135 | 2.424 |
| -0.21, 2.43, 0.07 | frenchWin.lod1/stone_white | 70 | 1.244 |
| 0.60, 1.60, 0.07 | frenchWin.lod1/stone_white | 59 | 2.424 |
| 0.63, 1.62, 0.07 | frenchWin.lod1/stone_white | 136 | 2.442 |
| -0.60, 1.60, 0.07 | frenchWin.lod1/stone_white | 59 | 2.424 |
| -0.63, 1.62, 0.07 | frenchWin.lod1/stone_white | 136 | 2.442 |
| 0.20, 2.43, 0.07 | frenchWin.lod1/stone_white | 70 | 1.262 |
| 0.47, 0.76, 0.03 | frenchWin.lod1/stone_white | 46 | 2.279 |
| 0.59, 0.79, 0.06 | frenchWin.lod1/stone_white | 58 | 2.389 |
| 0.62, 0.80, 0.07 | frenchWin.lod1/stone_white | 135 | 2.424 |
| -0.13, 1.52, -0.08 | frenchWin.lod1/wood_frame_white | 112 | 0.796 |
| -0.13, 1.53, -0.08 | frenchWin.lod1/wood_frame_white | 53 | 0.796 |
| -0.01, 0.56, -0.10 | frenchWin.lod1/wood_frame_white | 91 | 1.456 |
| 0.01, 1.04, -0.10 | frenchWin.lod1/wood_frame_white | 91 | 1.456 |
| -0.00, 1.04, -0.11 | frenchWin.lod1/wood_frame_white | 65 | 1.456 |
| 0.00, 1.04, -0.09 | frenchWin.lod1/wood_frame_white | 65 | 1.456 |
| -0.13, 2.00, -0.14 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| -0.12, 2.00, -0.11 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.12, 2.00, -0.14 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.13, 2.00, -0.11 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.13, 1.52, -0.07 | frenchWin.lod1/wood_frame_white | 112 | 0.796 |
| 0.13, 1.53, -0.08 | frenchWin.lod1/wood_frame_white | 53 | 0.796 |
| -0.01, 1.04, -0.10 | frenchWin.lod1/wood_frame_white | 91 | 1.456 |
| 0.01, 0.56, -0.10 | frenchWin.lod1/wood_frame_white | 91 | 1.456 |
| 0.00, 0.56, -0.11 | frenchWin.lod1/wood_frame_white | 65 | 1.456 |
| -0.00, 0.56, -0.09 | frenchWin.lod1/wood_frame_white | 65 | 1.456 |
| -0.12, 1.80, -0.14 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| -0.13, 1.80, -0.11 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.13, 1.80, -0.14 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.12, 1.80, -0.11 | frenchWin.lod1/wood_frame_white | 44 | 0.606 |
| 0.27, -0.06, 0.49 | balconyP.lod1/stone_white | 53 | 1.566 |
| 0.27, -0.07, 0.51 | balconyP.lod1/stone_white | 122 | 1.598 |
| -0.26, -0.06, 0.50 | balconyP.lod1/stone_white | 52 | 1.596 |
| -0.25, 0.93, 0.46 | balconyP.lod1/cast_iron_green | 94 | 1.506 |
| -0.25, 0.94, 0.45 | balconyP.lod1/cast_iron_green | 112 | 1.508 |
| -0.24, 0.95, 0.44 | balconyP.lod1/cast_iron_green | 72 | 1.496 |
| -0.24, 0.95, 0.42 | balconyP.lod1/cast_iron_green | 70 | 1.456 |
| -0.23, 0.94, 0.41 | balconyP.lod1/cast_iron_green | 106 | 1.416 |

(167 more in the JSON)

## nonmanifold (warn, 24)

| at | part | uses |
|---|---|---|
| -0.40, 2.27, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.40, 0.00, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.40, 0.00, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.40, 2.27, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.40, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.35, 1.52, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.35, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.03, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| -0.03, 1.52, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.00, 1.01, -0.16 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 1.52, -0.13 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 6 |
| 0.00, 1.01, -0.11 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.28, -0.16 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | frenchWin.lod1/wood_frame_white | 3 |
| 0.00, 0.28, -0.11 | frenchWin.lod1/wood_frame_white | 3 |
| 0.03, 1.52, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.03, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.35, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.35, 1.52, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.40, 0.49, -0.13 | frenchWin.lod1/wood_frame_white | 4 |
| 0.77, -0.06, 0.23 | balconyP.lod1/stone_white | 3 |
| 0.00, -0.06, 0.48 | balconyP.lod1/stone_white | 3 |
| -0.77, -0.06, 0.23 | balconyP.lod1/stone_white | 3 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| -0.40, 1.52, -0.10 | frenchWin.lod1/wood_frame_white | 0.03 |
| 0.40, 1.52, -0.10 | frenchWin.lod1/wood_frame_white | 0.03 |
| -0.47, -0.00, 0.00 | wall/wall | 5.2 |
| 0.47, -0.00, 0.00 | wall/wall | 1.2 |
| -0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 163)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 2.27, -0.02 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_white | 0.73 | 24 | 86.7 |
| -0.74, 0.95, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.1 | 19 | 16.7 |
| 0.72, 0.95, 0.44 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.1 | 19 | 16.7 |
| 0.78, -0.06, 0.00 | balconyP.lod1/stone_white + wall/wall | 0.19 | 15 | 89.7 |
| -0.80, -0.07, 0.00 | balconyP.lod1/stone_white + wall/wall | 0.19 | 14 | 89.7 |
| -0.47, 0.00, -0.10 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.5 | 12 | 90 |
| -0.47, 0.94, -0.17 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 4.95 | 12 | 90 |
| 0.47, 0.00, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 4.95 | 10 | 90 |
| -0.00, 0.49, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.08 | 10 | 90 |
| -0.01, 0.07, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.45 | 10 | 90 |
| -0.05, 0.14, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.16 | 10 | 90 |
| 0.34, 0.14, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.16 | 10 | 90 |
| -0.51, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.39, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.28, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.18, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| -0.11, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| -0.04, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| 0.03, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| 0.10, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| 0.17, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.05 | 10 | 90 |
| 0.26, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| 0.38, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| 0.49, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.72, 0.80, 0.16 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.72, 0.80, 0.29 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| 0.74, 0.80, 0.16 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| 0.74, 0.80, 0.29 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 10 | 90 |
| -0.47, 0.22, 0.00 | frenchWin.lod1/stone_white + wall/wall | 5.05 | 9 | 90 |
| -0.47, -0.05, 0.00 | frenchWin.lod1/stone_blue + wall/wall | 1.97 | 9 | 90 |
| 0.00, 1.52, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.08 | 9 | 90 |
| 0.01, 0.49, -0.11 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.45 | 9 | 90 |
| 0.47, 0.91, 0.00 | frenchWin.lod1/stone_white + wall/wall | 5.05 | 8 | 90 |
| -0.40, 1.56, -0.17 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.43 | 8 | 90 |
| 0.40, 1.52, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.43 | 8 | 90 |
| -0.35, 0.49, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.35 | 8 | 90 |
| 0.03, 0.49, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 1.35 | 8 | 90 |
| 0.60, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 8 | 90 |
| -0.62, 0.80, 0.42 | balconyP.lod1/cast_iron_green + balconyP.lod1/cast_iron_green | 0.06 | 8 | 90 |
| -0.37, 2.27, -0.17 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 1.72 | 6 | 90 |

(123 more in the JSON)

## opening (info, 7)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.47, 2.23, -0.20 | frenchWin.lod1/stone_white | 1 + 0 + 0 | 2.279 |
| 0.47, 0.05, -0.20 | frenchWin.lod1/stone_white | -1 + 0 + 0 | 2.279 |
| -0.42, 2.27, -0.20 | frenchWin.lod1/stone_white | 0 + -1 + 0 | 0.936 |
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| 0.47, 2.53, 0.00 | wall/wall | 0 + 0 + 1 | 1.725 |
| -0.42, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.936 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 251)

| at | parts | area |
|---|---|---|
| -0.47, -0.00, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00076 |
| -0.47, 0.89, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.07056 |
| -0.47, 0.94, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.02731 |
| 0.47, -0.00, -0.10 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.0008 |
| 0.47, 0.25, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00192 |
| 0.47, 0.33, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03781 |
| -0.47, -0.00, 0.01 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00008 |
| -0.47, 1.84, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.0014 |
| -0.47, 1.51, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.0086 |
| -0.45, 2.27, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.32, 2.27, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00898 |
| -0.42, 2.27, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.22, 2.27, -0.11 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.0029 |
| 0.47, 1.32, -0.15 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.07201 |
| 0.47, 1.20, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03611 |
| -0.04, 2.27, -0.15 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.01689 |
| 0.13, 2.27, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.02297 |
| 0.42, 2.27, -0.14 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.45, 2.27, -0.12 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.47, 2.02, -0.16 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.00197 |
| -0.47, 1.94, -0.13 | frenchWin.lod1/stone_white + frenchWin.lod1/wood_frame_white | 0.03802 |
| 0.47, -0.00, 0.01 | frenchWin.lod1/stone_white + frenchWin.lod1/stone_blue | 0.00004 |
| -0.43, 0.00, -0.15 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.02, 0.00, -0.15 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.01558 |
| -0.45, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.15, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.02204 |
| 0.31, 0.00, -0.14 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.01029 |
| 0.19, 0.00, -0.11 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00383 |
| 0.45, 0.00, -0.14 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| 0.42, 0.00, -0.12 | frenchWin.lod1/stone_blue + frenchWin.lod1/wood_frame_white | 0.00228 |
| -0.40, 0.03, -0.17 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00007 |
| -0.40, 0.39, -0.16 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00068 |
| -0.40, 0.47, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00016 |
| -0.40, 0.89, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.01386 |
| -0.40, 1.37, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00872 |
| -0.40, 1.54, -0.15 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00215 |
| -0.40, 1.59, -0.14 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00115 |
| -0.40, 2.22, -0.13 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00227 |
| -0.40, 2.26, -0.12 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00221 |
| 0.40, 0.05, -0.13 | frenchWin.lod1/wood_frame_white + frenchWin.lod1/wood_frame_white | 0.00227 |

(211 more in the JSON)
