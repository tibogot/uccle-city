# Kit audit: garage.big LOD0

1,976 triangles, 1,046 welded vertices, 26 open edges, 20,320 rays, 71 ms.

**0 blocking**, 480 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 476 |
| tjunction | warn | 4 |
| seam | info | 40 |
| opening | info | 11 |
| backtoback | info | 46 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 476)

| at | part | aspect | longest |
|---|---|---|---|
| -0.54, 2.31, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| -0.54, 2.32, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| 0.54, 2.10, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| 0.54, 2.10, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| 0.54, 2.10, 0.01 | garage.lod0/stone_white | 135 | 3.228 |
| -0.54, 2.32, 0.01 | garage.lod0/stone_white | 135 | 3.228 |
| 0.54, 2.32, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| 0.54, 2.32, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| -0.54, 2.10, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| -0.54, 2.10, 0.03 | garage.lod0/stone_white | 703 | 3.228 |
| -0.54, 2.10, 0.02 | garage.lod0/stone_white | 135 | 3.228 |
| 0.54, 2.32, 0.02 | garage.lod0/stone_white | 135 | 3.228 |
| -1.50, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.50, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.50, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -1.50, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.50, 0.52, -0.12 | garage.lod0/painted_metal_white | 979 | 2.996 |
| 0.50, 0.52, -0.12 | garage.lod0/painted_metal_white | 979 | 2.996 |
| -0.50, 0.52, -0.08 | garage.lod0/painted_metal_white | 979 | 2.996 |
| -0.50, 0.52, -0.08 | garage.lod0/painted_metal_white | 979 | 2.996 |
| 1.50, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.50, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.50, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 1.50, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.50, 0.01, -0.12 | garage.lod0/painted_metal_white | 979 | 2.996 |
| -0.50, 0.01, -0.12 | garage.lod0/painted_metal_white | 979 | 2.996 |
| 0.50, 0.01, -0.08 | garage.lod0/painted_metal_white | 979 | 2.996 |
| 0.50, 0.01, -0.08 | garage.lod0/painted_metal_white | 979 | 2.996 |
| 0.50, 0.01, -0.10 | garage.lod0/painted_metal_white | 94 | 2.996 |
| -0.50, 0.53, -0.10 | garage.lod0/painted_metal_white | 94 | 2.996 |
| -0.50, 0.01, -0.11 | garage.lod0/painted_metal_white | 107 | 3.004 |
| 0.50, 0.00, -0.11 | garage.lod0/painted_metal_white | 107 | 3.004 |
| -0.50, 0.01, -0.12 | garage.lod0/painted_metal_white | 250 | 3.004 |
| 0.50, 0.01, -0.09 | garage.lod0/painted_metal_white | 250 | 3.004 |
| 0.49, 0.15, -0.09 | garage.lod0/painted_metal_white | 1278 | 2.934 |
| 0.49, 0.15, -0.09 | garage.lod0/painted_metal_white | 1278 | 2.934 |
| -0.49, 0.15, -0.07 | garage.lod0/painted_metal_white | 1278 | 2.934 |
| -0.49, 0.15, -0.08 | garage.lod0/painted_metal_white | 1278 | 2.934 |
| -0.49, 0.14, -0.09 | garage.lod0/painted_metal_white | 1278 | 2.934 |
| -0.49, 0.13, -0.09 | garage.lod0/painted_metal_white | 1278 | 2.934 |

(436 more in the JSON)

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -1.50, -0.00, 0.00 | wall/wall | 5.2 |
| 1.50, -0.00, 0.00 | wall/wall | 1.2 |
| -1.50, -0.00, 0.00 | wall/wall | 1.2 |
| 1.50, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 40)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.50, 1.59, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 8.24 | 56 | 22.5 |
| -1.50, 0.01, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -1.50, 0.54, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -1.50, 1.06, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| 1.14, 0.13, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 0.26, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 0.39, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.14, 0.66, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 0.79, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 0.91, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.14, 1.18, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 1.31, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 1.44, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.14, 1.71, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 1.84, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| 1.03, 1.96, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 5.91 | 26 | 90 |
| -0.11, 0.42, -0.08 | garage.lod0/painted_metal_white + garage.lod0/metal_anodised | 0.54 | 24 | 61.4 |
| -1.50, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 14 | 90 |
| -1.50, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.50, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.50, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 12 | 90 |
| -1.62, 2.10, 0.00 | garage.lod0/stone_white + wall/wall | 0.45 | 7 | 90 |
| 1.56, 2.10, 0.00 | garage.lod0/stone_white + wall/wall | 0.45 | 7 | 90 |
| -1.50, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 6.04 | 7 | 22.5 |
| -1.50, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 6.06 | 4 | 90 |
| -1.50, 0.00, -0.06 | garage.lod0/render_white + ground/ground | 0.24 | 4 | 90 |
| 0.00, 2.10, 0.00 | garage.lod0/stone_white + wall/wall | 6 | 3 | 90 |
| -2.08, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 3 | 90 |
| 1.50, -0.00, 0.00 | garage.lod0/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.42, 0.00, 0.00 | wall/wall + ground/ground | 1.5 | 2 | 90 |
| 0.00, 2.10, 0.00 | garage.lod0/stone_white + garage.lod0/render_white | 3 | 1 | 90 |
| 1.50, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| -1.50, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 3 | 1 | 90 |

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -1.50, 2.05, -0.12 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 1.50, 2.05, 0.00 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -1.45, 2.10, -0.12 | garage.lod0/render_white | 0 + -1 + 0 | 3 |
| -1.50, 0.05, 0.00 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 1.50, 0.05, -0.12 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| 1.50, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -1.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 3 |
| 1.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.5 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 46)

| at | parts | area |
|---|---|---|
| 1.62, 2.25, 0.00 | garage.lod0/stone_white + wall/wall | 0.00066 |
| -1.62, 2.25, 0.00 | garage.lod0/stone_white + wall/wall | 0.00062 |
| -1.56, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.02464 |
| 0.09, 2.27, 0.00 | garage.lod0/stone_white + wall/wall | 0.29184 |
| -1.41, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.03816 |
| 1.54, 2.32, 0.00 | garage.lod0/stone_white + wall/wall | 0.00044 |
| -1.62, 2.17, 0.00 | garage.lod0/stone_white + wall/wall | 0.00066 |
| 1.62, 2.17, 0.00 | garage.lod0/stone_white + wall/wall | 0.00062 |
| -1.54, 2.10, 0.00 | garage.lod0/stone_white + wall/wall | 0.00044 |
| 0.00, 2.15, 0.00 | garage.lod0/stone_white + wall/wall | 0.32995 |
| -1.50, 2.10, 0.00 | garage.lod0/stone_white + wall/wall | 0.00005 |
| 1.56, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.02464 |
| -0.24, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| 0.90, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| 0.24, 0.53, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| -0.90, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| -1.10, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| 0.50, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 0.04206 |
| -0.24, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| 0.90, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| 0.24, 1.05, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| -0.90, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| -1.10, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| 1.10, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| -0.24, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| 0.90, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| 0.24, 1.57, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| -0.90, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| -1.10, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| 1.10, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| -0.24, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01645 |
| 0.90, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.02849 |
| -0.06, 2.10, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.04787 |
| 1.42, 2.10, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.00007 |
| -1.10, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| 1.10, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01435 |
| -0.64, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01261 |
| 0.64, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01261 |
| -0.50, 0.00, -0.10 | garage.lod0/painted_metal_white + ground/ground | 0.04206 |
| -0.64, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01261 |

(6 more in the JSON)
