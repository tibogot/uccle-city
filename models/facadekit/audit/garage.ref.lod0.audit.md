# Kit audit: garage.ref LOD0

2,008 triangles, 1,062 welded vertices, 26 open edges, 19,936 rays, 61 ms.

**0 blocking**, 488 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 484 |
| tjunction | warn | 4 |
| seam | info | 39 |
| opening | info | 11 |
| backtoback | info | 42 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 484)

| at | part | aspect | longest |
|---|---|---|---|
| 0.44, 2.31, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.32, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.31, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.32, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.10, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.10, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.10, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.10, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.10, 0.01 | garage.lod0/stone_white | 146 | 2.628 |
| -0.44, 2.32, 0.01 | garage.lod0/stone_white | 146 | 2.628 |
| -0.44, 2.32, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.32, 0.01 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.32, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.32, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.10, 0.00 | garage.lod0/stone_white | 572 | 2.628 |
| 0.44, 2.10, 0.01 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.10, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.10, 0.03 | garage.lod0/stone_white | 572 | 2.628 |
| -0.44, 2.10, 0.02 | garage.lod0/stone_white | 146 | 2.628 |
| 0.44, 2.32, 0.02 | garage.lod0/stone_white | 146 | 2.628 |
| -1.20, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.20, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.20, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.20, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.40, 0.52, -0.12 | garage.lod0/painted_metal_white | 783 | 2.396 |
| 0.40, 0.52, -0.12 | garage.lod0/painted_metal_white | 783 | 2.396 |
| -0.40, 0.52, -0.08 | garage.lod0/painted_metal_white | 783 | 2.396 |
| -0.40, 0.52, -0.08 | garage.lod0/painted_metal_white | 783 | 2.396 |
| 1.20, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.20, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.20, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.20, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.40, 0.01, -0.12 | garage.lod0/painted_metal_white | 783 | 2.396 |
| -0.40, 0.01, -0.12 | garage.lod0/painted_metal_white | 783 | 2.396 |
| 0.40, 0.01, -0.08 | garage.lod0/painted_metal_white | 783 | 2.396 |
| 0.40, 0.01, -0.08 | garage.lod0/painted_metal_white | 783 | 2.396 |
| 0.40, 0.01, -0.10 | garage.lod0/painted_metal_white | 75 | 2.396 |
| -0.40, 0.53, -0.10 | garage.lod0/painted_metal_white | 75 | 2.396 |
| -0.40, 0.01, -0.11 | garage.lod0/painted_metal_white | 86 | 2.404 |
| 0.40, 0.00, -0.11 | garage.lod0/painted_metal_white | 86 | 2.404 |

(444 more in the JSON)

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -1.20, -0.00, 0.00 | wall/wall | 5.2 |
| 1.20, -0.00, 0.00 | wall/wall | 1.2 |
| -1.20, -0.00, 0.00 | wall/wall | 1.2 |
| 1.20, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 39)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.20, 1.59, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 7.04 | 56 | 22.5 |
| -1.20, 0.01, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -1.20, 0.54, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -1.20, 1.06, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| 0.91, 0.13, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 0.26, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 0.39, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.91, 0.66, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 0.79, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 0.91, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.91, 1.18, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 1.31, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 1.44, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.91, 1.71, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 1.84, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| 0.82, 1.96, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.71 | 26 | 90 |
| -0.09, 0.42, -0.08 | garage.lod0/painted_metal_white + garage.lod0/metal_anodised | 0.43 | 24 | 67.5 |
| -1.20, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 14 | 90 |
| -1.20, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.20, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.20, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.20, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| -1.20, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 4.84 | 7 | 22.5 |
| 0.14, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 4.8 | 4 | 22.5 |
| -1.20, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 4.86 | 4 | 90 |
| -1.20, 0.00, -0.06 | garage.lod0/render_white + ground/ground | 0.24 | 4 | 90 |
| -1.26, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.44 | 3 | 22.5 |
| 1.26, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.44 | 3 | 22.5 |
| -1.89, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 3 | 90 |
| 1.20, -0.00, 0.00 | garage.lod0/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.31, 0.00, 0.00 | wall/wall + ground/ground | 1.8 | 2 | 90 |
| 1.20, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| -1.20, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 2.4 | 1 | 90 |

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.20, 2.05, -0.12 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 1.20, 2.05, 0.00 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -1.15, 2.10, -0.12 | garage.lod0/render_white | 0 + -1 + 0 | 2.4 |
| -1.20, 0.05, 0.00 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 1.20, 0.05, -0.12 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| 1.20, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 1.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.8 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 42)

| at | parts | area |
|---|---|---|
| -1.26, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.0232 |
| 0.07, 2.26, 0.00 | garage.lod0/stone_white + wall/wall | 0.22083 |
| -1.13, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.02877 |
| 1.24, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.00051 |
| -1.24, 2.11, 0.00 | garage.lod0/stone_white + wall/wall | 0.00051 |
| 0.01, 2.16, 0.00 | garage.lod0/stone_white + wall/wall | 0.24946 |
| -1.19, 2.11, 0.00 | garage.lod0/stone_white + wall/wall | 0.00014 |
| 1.26, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.0232 |
| -0.19, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| 0.72, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| 0.19, 0.53, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| -0.72, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| -0.88, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| 0.40, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 0.03366 |
| -0.19, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| 0.72, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| 0.19, 1.05, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| -0.72, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| -0.88, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| 0.88, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| -0.19, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| 0.72, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| 0.19, 1.57, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| -0.72, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| -0.88, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| 0.88, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| -0.19, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01316 |
| 0.72, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02278 |
| -0.05, 2.10, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.03828 |
| 1.14, 2.10, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.00006 |
| -0.88, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| 0.88, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01147 |
| -0.51, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| 0.51, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| -0.40, 0.00, -0.10 | garage.lod0/painted_metal_white + ground/ground | 0.03366 |
| -0.51, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| 0.51, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| -0.51, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| 0.51, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |
| -0.51, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01009 |

(2 more in the JSON)
