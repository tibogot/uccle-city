# Kit audit: doorB.small LOD0

2,472 triangles, 1,330 welded vertices, 97 open edges, 21,148 rays, 88 ms.

**0 blocking**, 527 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 522 |
| nonmanifold | warn | 1 |
| tjunction | warn | 4 |
| seam | info | 101 |
| opening | info | 9 |
| backtoback | info | 128 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 522)

| at | part | aspect | longest |
|---|---|---|---|
| -0.55, 0.80, 0.01 | doorB.lod0/stone_white | 121 | 2.425 |
| -0.56, 0.80, 0.03 | doorB.lod0/stone_white | 86 | 2.425 |
| -0.70, 0.85, 0.04 | doorB.lod0/stone_white | 364 | 2.575 |
| -0.70, 0.86, 0.02 | doorB.lod0/stone_white | 66 | 2.58 |
| -0.18, 2.42, 0.01 | doorB.lod0/stone_white | 55 | 1.1 |
| -0.19, 2.43, 0.03 | doorB.lod0/stone_white | 40 | 1.12 |
| -0.23, 2.57, 0.04 | doorB.lod0/stone_white | 199 | 1.405 |
| 0.55, 1.61, 0.01 | doorB.lod0/stone_white | 121 | 2.425 |
| 0.56, 1.62, 0.03 | doorB.lod0/stone_white | 86 | 2.445 |
| 0.70, 1.71, 0.04 | doorB.lod0/stone_white | 365 | 2.58 |
| 0.70, 1.72, 0.02 | doorB.lod0/stone_white | 66 | 2.58 |
| 0.25, 2.71, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.72, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.71, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.72, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.58, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.57, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.58, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.57, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.75, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.76, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.75, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.76, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.73, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.72, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.73, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.72, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.75, -0.02 | doorB.lod0/stone_white | 64 | 1.524 |
| 0.25, 2.75, 0.07 | doorB.lod0/stone_white | 64 | 1.524 |
| 0.70, 0.86, 0.01 | doorB.lod0/stone_white | 66 | 2.58 |
| 0.70, 0.85, 0.04 | doorB.lod0/stone_white | 364 | 2.575 |
| 0.56, 0.80, 0.03 | doorB.lod0/stone_white | 86 | 2.425 |
| 0.55, 0.80, 0.01 | doorB.lod0/stone_white | 121 | 2.425 |
| 0.23, 2.57, 0.04 | doorB.lod0/stone_white | 199 | 1.41 |
| 0.18, 2.43, 0.03 | doorB.lod0/stone_white | 40 | 1.14 |
| 0.18, 2.42, 0.01 | doorB.lod0/stone_white | 55 | 1.1 |
| -0.70, 1.72, 0.01 | doorB.lod0/stone_white | 66 | 2.58 |
| -0.70, 1.71, 0.04 | doorB.lod0/stone_white | 365 | 2.58 |
| -0.56, 1.62, 0.03 | doorB.lod0/stone_white | 86 | 2.445 |
| -0.55, 1.61, 0.01 | doorB.lod0/stone_white | 121 | 2.425 |

(482 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.42, 0.00 | doorB.lod0/stone_white | 3 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 101)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.55, -0.00, -0.24 | doorB.lod0/stone_white + doorB.lod0/stone_blue | 0.86 | 31 | 67.5 |
| -0.33, 0.25, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 1.66 | 30 | 45 |
| 0.09, 0.25, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 1.66 | 30 | 45 |
| -0.38, 1.00, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.36 | 26 | 44.8 |
| 0.38, 0.88, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.36 | 26 | 44.8 |
| -0.01, 1.35, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.08 | 26 | 44.8 |
| 0.01, 1.35, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.08 | 26 | 44.8 |
| -0.48, 1.81, -0.13 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 24 | 44.8 |
| 0.48, 1.81, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 24 | 44.8 |
| 0.48, 2.42, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.27 | 21 | 44.7 |
| -0.38, 0.01, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.48 | 21 | 44.7 |
| -0.48, 2.42, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.27 | 20 | 44.7 |
| 0.38, 0.00, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.48 | 20 | 44.7 |
| 0.38, 1.80, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 20 | 44.8 |
| -0.38, 1.80, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 19 | 44.8 |
| -0.74, 2.57, 0.00 | doorB.lod0/stone_white + wall/wall | 0.54 | 12 | 90 |
| 0.75, 2.71, 0.00 | doorB.lod0/stone_white + wall/wall | 0.54 | 12 | 90 |
| -0.76, 2.72, 0.00 | doorB.lod0/stone_white + wall/wall | 0.47 | 12 | 90 |
| 0.77, 2.75, 0.00 | doorB.lod0/stone_white + wall/wall | 0.47 | 12 | 90 |
| -0.67, -0.05, 0.00 | doorB.lod0/stone_blue + wall/wall | 0.28 | 12 | 90 |
| 0.67, -0.01, 0.00 | doorB.lod0/stone_blue + wall/wall | 0.28 | 12 | 90 |
| -0.47, 2.35, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.96 | 12 | 90 |
| -0.47, 1.89, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.96 | 12 | 90 |
| 0.42, 0.85, -0.14 | doorB.lod0/wood_frame_white + doorB.lod0/painted_metal_white | 0.07 | 12 | 90 |
| -0.55, 1.01, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 5.2 | 10 | 22.5 |
| 0.55, 0.21, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 5.2 | 10 | 22.5 |
| -0.70, 2.57, 0.04 | doorB.lod0/stone_white + doorB.lod0/stone_white | 2.89 | 10 | 45 |
| -0.04, 0.20, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.55 | 10 | 22.5 |
| -0.04, 0.87, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.55 | 10 | 22.2 |
| -0.55, 1.21, 0.00 | doorB.lod0/stone_white + wall/wall | 7.74 | 9 | 90 |
| 0.55, 1.21, 0.00 | doorB.lod0/stone_white + wall/wall | 7.74 | 8 | 90 |
| 0.00, 2.72, -0.01 | doorB.lod0/stone_white + doorB.lod0/stone_white | 6.04 | 8 | 22.5 |
| -0.47, 1.09, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 3.76 | 8 | 22.5 |
| 0.47, 0.20, -0.15 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 3.76 | 8 | 22.5 |
| -0.37, 1.35, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| -0.37, 1.37, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| 0.01, 1.35, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| 0.01, 1.37, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| -0.47, 2.42, -0.17 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 2.01 | 6 | 22.5 |
| 0.07, 2.57, 0.00 | doorB.lod0/stone_white + wall/wall | 2.2 | 6 | 90 |

(61 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.24 | doorB.lod0/stone_white | 1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.24 | doorB.lod0/stone_white | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.24 | doorB.lod0/stone_white | -1 + 0 + 0 | 2.425 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.77, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 128)

| at | parts | area |
|---|---|---|
| -0.55, 0.97, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.07292 |
| -0.55, 1.08, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.03307 |
| 0.55, 0.32, -0.19 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.0029 |
| 0.55, 0.40, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.04262 |
| -0.52, 2.42, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| -0.50, 2.42, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| -0.07, 2.42, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.0291 |
| -0.03, 2.42, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.01429 |
| -0.21, 2.72, -0.00 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.02352 |
| -0.53, 2.72, 0.02 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.01655 |
| 0.43, 2.72, 0.02 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.02766 |
| 0.38, 2.42, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00057 |
| 0.33, 2.42, -0.17 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.01539 |
| 0.50, 2.42, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| 0.52, 2.42, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| 0.55, 1.45, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.07298 |
| 0.55, 1.34, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.03327 |
| -0.55, 2.09, -0.19 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00296 |
| -0.55, 2.02, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.04281 |
| -0.17, 2.72, 0.03 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.0124 |
| -0.50, 0.00, -0.18 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00198 |
| -0.52, 0.00, -0.16 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00198 |
| -0.41, 0.00, -0.17 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00189 |
| 0.12, 0.00, -0.17 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.01595 |
| -0.44, 0.00, -0.16 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00189 |
| -0.12, 0.00, -0.16 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.01595 |
| 0.52, 0.00, -0.19 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00096 |
| 0.44, 0.00, -0.17 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00175 |
| 0.49, 0.00, -0.18 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.0004 |
| 0.41, 0.00, -0.16 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00171 |
| 0.53, 0.00, -0.17 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00102 |
| 0.46, 0.00, -0.15 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00014 |
| 0.50, 0.00, -0.15 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00158 |
| 0.45, 0.00, -0.15 | doorB.lod0/stone_blue + doorB.lod0/wood_frame_white | 0.00019 |
| -0.47, 1.08, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.01248 |
| -0.47, 1.56, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.01363 |
| -0.47, 2.19, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.00276 |
| -0.47, 2.04, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.00276 |
| 0.47, 1.17, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.02497 |
| 0.47, 0.29, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.02612 |

(88 more in the JSON)
