# Kit audit: winA.big LOD0

3,110 triangles, 1,676 welded vertices, 138 open edges, 18,162 rays, 137 ms.

**0 blocking**, 786 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 4 |
| sliver | warn | 768 |
| nonmanifold | warn | 8 |
| tjunction | warn | 6 |
| seam | info | 133 |
| opening | info | 13 |
| backtoback | info | 143 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 2.08, 0.02 | hood.lod0/stone_white + hood.lod0/stone_white | 1.3 | 1.6 | 4.5 | 32 | 0.24 | false | 0 + 1 + 0.08 |
| -0.32, 2.08, 0.04 | hood.lod0/stone_white + hood.lod0/zinc_roof | 2.43 | 108.3 | 0.9 | 32 | 0.24 | false | 0 + 1 + 0.08 |
| 0.45, 2.08, 0.06 | hood.lod0/stone_white + hood.lod0/zinc_roof | 2.43 | 722.7 | 0.9 | 32 | 0.24 | false | 0 + 1 + 0.08 |
| -0.26, 2.08, 0.08 | hood.lod0/stone_white + hood.lod0/zinc_roof | 2.43 | 924.7 | 0.9 | 32 | 0.24 | false | 0 + 1 + 0.08 |

## sliver (warn, 768)

| at | part | aspect | longest |
|---|---|---|---|
| -0.60, 0.54, 0.01 | winA.lod0/stone_white | 55 | 1.644 |
| -0.60, 0.54, 0.03 | winA.lod0/stone_white | 351 | 1.644 |
| -0.60, 0.54, 0.04 | winA.lod0/stone_white | 351 | 1.645 |
| -0.60, 0.55, 0.04 | winA.lod0/stone_white | 352 | 1.648 |
| -0.61, 0.55, 0.04 | winA.lod0/stone_white | 353 | 1.651 |
| -0.61, 0.55, 0.04 | winA.lod0/stone_white | 414 | 1.656 |
| -0.66, 0.56, 0.04 | winA.lod0/stone_white | 191 | 1.704 |
| -0.71, 0.58, 0.05 | winA.lod0/stone_white | 299 | 1.754 |
| -0.72, 0.58, 0.05 | winA.lod0/stone_white | 255 | 1.76 |
| -0.72, 0.58, 0.06 | winA.lod0/stone_white | 199 | 1.766 |
| -0.73, 0.59, 0.06 | winA.lod0/stone_white | 199 | 1.772 |
| -0.73, 0.59, 0.07 | winA.lod0/stone_white | 258 | 1.777 |
| -0.74, 0.59, 0.07 | winA.lod0/stone_white | 304 | 1.783 |
| -0.75, 0.59, 0.07 | winA.lod0/stone_white | 138 | 1.789 |
| -0.76, 0.60, 0.07 | winA.lod0/stone_white | 255 | 1.802 |
| -0.20, 1.64, 0.01 | winA.lod0/stone_white | 40 | 1.2 |
| -0.20, 1.64, 0.03 | winA.lod0/stone_white | 257 | 1.201 |
| -0.20, 1.64, 0.04 | winA.lod0/stone_white | 258 | 1.204 |
| -0.20, 1.65, 0.04 | winA.lod0/stone_white | 259 | 1.211 |
| -0.20, 1.65, 0.04 | winA.lod0/stone_white | 261 | 1.219 |
| -0.20, 1.65, 0.04 | winA.lod0/stone_white | 308 | 1.228 |
| -0.22, 1.70, 0.04 | winA.lod0/stone_white | 148 | 1.324 |
| -0.24, 1.75, 0.05 | winA.lod0/stone_white | 244 | 1.426 |
| -0.24, 1.76, 0.05 | winA.lod0/stone_white | 209 | 1.443 |
| -0.24, 1.76, 0.06 | winA.lod0/stone_white | 164 | 1.449 |
| -0.24, 1.77, 0.07 | winA.lod0/stone_white | 165 | 1.467 |
| -0.25, 1.77, 0.07 | winA.lod0/stone_white | 215 | 1.473 |
| -0.25, 1.78, 0.07 | winA.lod0/stone_white | 254 | 1.484 |
| -0.25, 1.79, 0.07 | winA.lod0/stone_white | 117 | 1.503 |
| -0.25, 1.80, 0.07 | winA.lod0/stone_white | 216 | 1.521 |
| 0.60, 1.09, 0.01 | winA.lod0/stone_white | 55 | 1.644 |
| 0.60, 1.09, 0.03 | winA.lod0/stone_white | 351 | 1.645 |
| 0.60, 1.09, 0.04 | winA.lod0/stone_white | 352 | 1.648 |
| 0.61, 1.10, 0.04 | winA.lod0/stone_white | 353 | 1.651 |
| 0.61, 1.10, 0.04 | winA.lod0/stone_white | 354 | 1.656 |
| 0.61, 1.10, 0.04 | winA.lod0/stone_white | 415 | 1.66 |
| 0.66, 1.13, 0.05 | winA.lod0/stone_white | 191 | 1.708 |
| 0.71, 1.17, 0.05 | winA.lod0/stone_white | 300 | 1.76 |
| 0.72, 1.17, 0.05 | winA.lod0/stone_white | 256 | 1.766 |
| 0.73, 1.18, 0.06 | winA.lod0/stone_white | 199 | 1.771 |

(728 more in the JSON)

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| 0.00, 1.64, 0.00 | winA.lod0/stone_white | 3 |
| 0.00, 1.08, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.58, -0.15 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.58, -0.11 | winA.lod0/wood_frame_white | 3 |
| 0.80, 1.95, 0.01 | hood.lod0/stone_white | 3 |
| -0.80, 1.95, 0.01 | hood.lod0/stone_white | 3 |
| 0.00, 1.95, 0.02 | hood.lod0/stone_white | 3 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| 0.80, 2.08, -0.01 | hood.lod0/stone_white | 0.13 |
| -0.80, 2.08, -0.01 | hood.lod0/stone_white | 0.13 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 133)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.08, 1.64, 0.01 | winA.lod0/stone_white + winA.lod0/stone_white | 0.76 | 88 | 84.6 |
| -0.60, 0.00, -0.01 | winA.lod0/stone_white + sill.lod0/stone_blue | 0.68 | 63 | 7.1 |
| -0.10, 1.92, 0.03 | winA.lod0/stone_white + hood.lod0/stone_white | 0.39 | 48 | 84.6 |
| -0.09, 1.79, -0.02 | winA.lod0/stone_white + hood.lod0/stone_white | 0.93 | 39 | 67.5 |
| 0.84, 2.08, 0.00 | hood.lod0/stone_white + wall/wall | 0.31 | 34 | 90 |
| -0.89, 2.08, 0.00 | hood.lod0/stone_white + wall/wall | 0.31 | 34 | 90 |
| 0.02, 0.08, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.08 | 30 | 42.4 |
| -0.02, 0.08, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.08 | 28 | 42.4 |
| -0.05, 1.64, 0.09 | winA.lod0/stone_white + winA.lod0/stone_white | 0.8 | 26 | 67.4 |
| 0.53, 1.09, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.26 | 26 | 44.4 |
| -0.21, 1.57, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| 0.19, 1.57, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| -0.21, 1.16, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 28.5 |
| 0.19, 1.16, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 28.5 |
| -0.48, 0.59, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27 |
| -0.05, 0.59, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27 |
| 0.05, 0.59, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27 |
| 0.48, 0.59, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27 |
| 0.59, 1.83, 0.04 | hood.lod0/stone_white + hood.lod0/stone_white | 3.05 | 26 | 90 |
| -0.53, 1.09, -0.10 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.26 | 24 | 44.4 |
| -0.00, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 2.04 | 24 | 22.5 |
| 0.01, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 2.04 | 24 | 22.5 |
| 0.53, 1.64, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 22 | 44.7 |
| -0.53, 0.01, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.53, 1.64, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| 0.53, 0.00, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.48, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.48, 1.08, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| -0.05, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.05, 1.08, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| 0.05, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.05, 1.08, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| 0.48, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.48, 1.08, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| -0.34, 1.80, 0.04 | winA.lod0/stone_white + hood.lod0/stone_white | 1.62 | 14 | 90 |
| 0.10, 1.93, 0.00 | winA.lod0/stone_white + wall/wall | 0.79 | 14 | 90 |
| 0.19, 1.17, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.43 | 14 | 21.7 |
| -0.19, 1.17, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.43 | 14 | 21.7 |
| 0.21, 1.17, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.43 | 14 | 21.7 |
| -0.21, 1.17, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.43 | 13 | 21.7 |

(93 more in the JSON)

## opening (info, 13)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.59, -0.20 | winA.lod0/stone_white | 1 + 0 + 0 | 1.644 |
| -0.55, 1.64, -0.20 | winA.lod0/stone_white | 0 + -1 + 0 | 1.2 |
| -0.60, -0.01, -0.15 | winA.lod0/stone_white | 0 + 1 + 0.04 | 0.2 |
| 0.60, 0.05, -0.20 | winA.lod0/stone_white | -1 + 0 + 0 | 1.644 |
| 0.60, -0.01, -0.15 | winA.lod0/stone_white | 0 + 1 + 0.04 | 0.2 |
| -0.75, 0.00, -0.03 | sill.lod0/stone_blue | 0 + 1 + 0.02 | 1.6 |
| -0.80, -0.05, -0.03 | sill.lod0/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod0/stone_blue | 1 + 0 + 0 | 0.102 |
| 0.76, 2.08, 0.13 | hood.lod0/zinc_roof | 0 + 1 + 0.06 | 1.61 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.18, 0.00 | wall/wall | 0 + 0 + 1 | 2.36 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 143)

| at | parts | area |
|---|---|---|
| -0.60, 0.62, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.04071 |
| -0.60, 0.69, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01649 |
| 0.60, 0.26, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00238 |
| 0.60, 0.31, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.0265 |
| -0.57, 1.64, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.10, 1.64, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02681 |
| -0.56, 1.64, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.07, 1.64, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.0114 |
| -0.60, 1.37, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00244 |
| -0.60, 1.33, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02665 |
| 0.60, 1.01, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.04077 |
| 0.60, 0.95, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01664 |
| 0.39, 1.64, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00107 |
| 0.34, 1.64, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01647 |
| 0.56, 1.64, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| 0.57, 1.64, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.53, 0.65, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0071 |
| -0.53, 0.95, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00581 |
| -0.53, 1.44, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00243 |
| -0.53, 1.30, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00243 |
| 0.53, 0.73, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0147 |
| 0.53, 0.27, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0135 |
| 0.11, 1.57, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00133 |
| 0.42, 1.57, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00187 |
| 0.37, 1.57, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00192 |
| -0.50, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.51, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.19, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00744 |
| -0.38, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00658 |
| -0.02, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00066 |
| -0.04, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00026 |
| 0.03, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0006 |
| 0.21, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00204 |
| 0.01, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0002 |
| 0.10, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00108 |
| -0.21, 1.09, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00204 |
| -0.10, 1.09, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00108 |
| -0.03, 1.09, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0006 |
| -0.01, 1.09, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0002 |
| 0.02, 1.09, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00066 |

(103 more in the JSON)
