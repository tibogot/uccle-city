# Kit audit: doorB.big LOD0

2,472 triangles, 1,330 welded vertices, 97 open edges, 21,140 rays, 81 ms.

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
| -0.55, 0.82, 0.01 | doorB.lod0/stone_white | 124 | 2.483 |
| -0.56, 0.82, 0.03 | doorB.lod0/stone_white | 88 | 2.483 |
| -0.70, 0.87, 0.04 | doorB.lod0/stone_white | 372 | 2.633 |
| -0.70, 0.88, 0.02 | doorB.lod0/stone_white | 68 | 2.638 |
| -0.18, 2.48, 0.01 | doorB.lod0/stone_white | 55 | 1.1 |
| -0.19, 2.48, 0.03 | doorB.lod0/stone_white | 40 | 1.12 |
| -0.23, 2.63, 0.04 | doorB.lod0/stone_white | 199 | 1.405 |
| 0.55, 1.65, 0.01 | doorB.lod0/stone_white | 124 | 2.483 |
| 0.56, 1.66, 0.03 | doorB.lod0/stone_white | 88 | 2.503 |
| 0.70, 1.75, 0.04 | doorB.lod0/stone_white | 373 | 2.638 |
| 0.70, 1.75, 0.02 | doorB.lod0/stone_white | 68 | 2.638 |
| 0.25, 2.77, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.78, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.77, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.78, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.63, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| -0.25, 2.63, -0.02 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.63, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.63, 0.05 | doorB.lod0/stone_white | 242 | 1.484 |
| 0.25, 2.81, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.82, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.81, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.82, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.79, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.78, -0.02 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.79, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| 0.25, 2.78, 0.07 | doorB.lod0/stone_white | 249 | 1.524 |
| -0.25, 2.80, -0.02 | doorB.lod0/stone_white | 64 | 1.524 |
| 0.25, 2.80, 0.07 | doorB.lod0/stone_white | 64 | 1.524 |
| 0.70, 0.88, 0.01 | doorB.lod0/stone_white | 68 | 2.638 |
| 0.70, 0.87, 0.04 | doorB.lod0/stone_white | 372 | 2.633 |
| 0.56, 0.82, 0.03 | doorB.lod0/stone_white | 88 | 2.483 |
| 0.55, 0.82, 0.01 | doorB.lod0/stone_white | 124 | 2.483 |
| 0.23, 2.63, 0.04 | doorB.lod0/stone_white | 199 | 1.41 |
| 0.18, 2.49, 0.03 | doorB.lod0/stone_white | 40 | 1.14 |
| 0.18, 2.48, 0.01 | doorB.lod0/stone_white | 55 | 1.1 |
| -0.70, 1.75, 0.01 | doorB.lod0/stone_white | 68 | 2.638 |
| -0.70, 1.75, 0.04 | doorB.lod0/stone_white | 373 | 2.638 |
| -0.56, 1.66, 0.03 | doorB.lod0/stone_white | 88 | 2.503 |
| -0.55, 1.65, 0.01 | doorB.lod0/stone_white | 124 | 2.483 |

(482 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.48, 0.00 | doorB.lod0/stone_white | 3 |

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
| -0.33, 0.25, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 1.7 | 30 | 44.5 |
| 0.09, 0.25, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 1.7 | 30 | 44.5 |
| -0.38, 1.03, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.37 | 26 | 44.5 |
| 0.38, 0.90, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.37 | 26 | 44.5 |
| -0.01, 1.39, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.09 | 26 | 44.5 |
| 0.01, 1.39, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.09 | 26 | 44.5 |
| -0.48, 1.86, -0.13 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.29 | 24 | 44.5 |
| 0.48, 1.86, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.29 | 24 | 44.5 |
| 0.48, 2.47, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.27 | 21 | 44.7 |
| -0.38, 0.01, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.48 | 21 | 44.7 |
| -0.48, 2.47, -0.20 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.27 | 20 | 44.7 |
| 0.38, 0.00, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.48 | 20 | 44.7 |
| 0.38, 1.85, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 20 | 44.3 |
| -0.38, 1.85, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.28 | 19 | 44.3 |
| -0.74, 2.63, 0.00 | doorB.lod0/stone_white + wall/wall | 0.54 | 12 | 90 |
| 0.75, 2.77, 0.00 | doorB.lod0/stone_white + wall/wall | 0.54 | 12 | 90 |
| -0.76, 2.78, 0.00 | doorB.lod0/stone_white + wall/wall | 0.47 | 12 | 90 |
| 0.77, 2.81, 0.00 | doorB.lod0/stone_white + wall/wall | 0.47 | 12 | 90 |
| -0.67, -0.05, 0.00 | doorB.lod0/stone_blue + wall/wall | 0.28 | 12 | 90 |
| 0.67, -0.01, 0.00 | doorB.lod0/stone_blue + wall/wall | 0.28 | 12 | 90 |
| -0.47, 2.40, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.96 | 12 | 90 |
| -0.47, 1.94, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.96 | 12 | 90 |
| 0.42, 0.87, -0.14 | doorB.lod0/wood_frame_white + doorB.lod0/painted_metal_white | 0.07 | 12 | 90 |
| -0.55, 1.03, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 5.31 | 10 | 22.5 |
| 0.55, 0.21, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 5.31 | 10 | 22.5 |
| -0.70, 2.63, 0.04 | doorB.lod0/stone_white + doorB.lod0/stone_white | 2.89 | 10 | 45 |
| -0.04, 0.20, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.55 | 10 | 22.5 |
| -0.04, 0.89, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.55 | 10 | 22.8 |
| -0.55, 1.24, 0.00 | doorB.lod0/stone_white + wall/wall | 7.91 | 9 | 90 |
| 0.55, 1.24, 0.00 | doorB.lod0/stone_white + wall/wall | 7.91 | 8 | 90 |
| 0.00, 2.78, -0.01 | doorB.lod0/stone_white + doorB.lod0/stone_white | 6.04 | 8 | 22.5 |
| -0.47, 1.12, -0.19 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 3.86 | 8 | 22.2 |
| 0.47, 0.20, -0.15 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 3.86 | 8 | 22.2 |
| -0.37, 1.38, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| -0.37, 1.40, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| 0.01, 1.38, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| 0.01, 1.40, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/glass_window | 0.37 | 8 | 90 |
| -0.47, 2.48, -0.17 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 2.01 | 6 | 22.5 |
| 0.07, 2.63, 0.00 | doorB.lod0/stone_white + wall/wall | 2.2 | 6 | 90 |

(61 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.24 | doorB.lod0/stone_white | 1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.24 | doorB.lod0/stone_white | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.24 | doorB.lod0/stone_white | -1 + 0 + 0 | 2.483 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.83, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 128)

| at | parts | area |
|---|---|---|
| -0.55, 0.99, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.07466 |
| -0.55, 1.10, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.03386 |
| 0.55, 0.33, -0.19 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00298 |
| 0.55, 0.41, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.04364 |
| -0.52, 2.48, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| -0.50, 2.48, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| -0.07, 2.48, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.0291 |
| -0.03, 2.48, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.01429 |
| -0.21, 2.78, -0.00 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.02352 |
| -0.53, 2.78, 0.02 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.01655 |
| 0.43, 2.78, 0.02 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.02766 |
| 0.38, 2.48, -0.20 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00057 |
| 0.33, 2.48, -0.17 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.01539 |
| 0.50, 2.48, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| 0.52, 2.48, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00198 |
| 0.55, 1.48, -0.18 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.07472 |
| 0.55, 1.37, -0.15 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.03406 |
| -0.55, 2.14, -0.19 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.00303 |
| -0.55, 2.06, -0.16 | doorB.lod0/stone_white + doorB.lod0/wood_frame_white | 0.04383 |
| -0.17, 2.78, 0.03 | doorB.lod0/stone_white + doorB.lod0/stone_white | 0.0124 |
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
| -0.47, 1.11, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.01286 |
| -0.47, 1.60, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.01409 |
| -0.47, 2.25, -0.17 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.0028 |
| -0.47, 2.09, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.0028 |
| 0.47, 1.20, -0.18 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.02556 |
| 0.47, 0.30, -0.16 | doorB.lod0/wood_frame_white + doorB.lod0/wood_frame_white | 0.02679 |

(88 more in the JSON)
