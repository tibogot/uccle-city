# Kit audit: doorDeco.big LOD0

2,262 triangles, 1,228 welded vertices, 45 open edges, 19,488 rays, 74 ms.

**0 blocking**, 419 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 414 |
| nonmanifold | warn | 1 |
| tjunction | warn | 4 |
| seam | info | 96 |
| opening | info | 9 |
| backtoback | info | 85 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 414)

| at | part | aspect | longest |
|---|---|---|---|
| -0.57, 0.82, 0.07 | doorDeco.lod0/stone_white | 50 | 2.483 |
| -0.60, 0.84, 0.06 | doorDeco.lod0/stone_white | 127 | 2.533 |
| -0.62, 0.84, 0.05 | doorDeco.lod0/stone_white | 51 | 2.533 |
| -0.65, 0.86, 0.04 | doorDeco.lod0/stone_white | 129 | 2.583 |
| -0.67, 0.86, 0.03 | doorDeco.lod0/stone_white | 43 | 2.583 |
| -0.71, 0.88, 0.02 | doorDeco.lod0/stone_white | 78 | 2.643 |
| -0.20, 2.53, 0.06 | doorDeco.lod0/stone_white | 60 | 1.2 |
| -0.22, 2.58, 0.04 | doorDeco.lod0/stone_white | 65 | 1.3 |
| -0.24, 2.64, 0.02 | doorDeco.lod0/stone_white | 42 | 1.42 |
| 0.58, 1.67, 0.07 | doorDeco.lod0/stone_white | 51 | 2.533 |
| 0.60, 1.68, 0.06 | doorDeco.lod0/stone_white | 127 | 2.533 |
| 0.63, 1.70, 0.05 | doorDeco.lod0/stone_white | 52 | 2.583 |
| 0.65, 1.72, 0.04 | doorDeco.lod0/stone_white | 129 | 2.583 |
| 0.69, 1.74, 0.03 | doorDeco.lod0/stone_white | 44 | 2.643 |
| 0.71, 1.76, 0.02 | doorDeco.lod0/stone_white | 78 | 2.643 |
| 0.22, 2.73, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.73, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.73, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.73, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.64, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.64, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.64, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.64, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.14, 2.80, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.80, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.80, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.80, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.73, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.73, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.73, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.73, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.07, 2.85, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.85, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.85, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.85, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.80, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.80, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.80, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.80, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.58, 1.67, 0.07 | doorDeco.lod0/stone_white | 51 | 2.533 |

(374 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.48, 0.00 | doorDeco.lod0/stone_white | 3 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.55, -0.00, 0.00 | wall/wall | 5.2 |
| 0.55, -0.00, 0.00 | wall/wall | 1.2 |
| -0.55, -0.00, 0.00 | wall/wall | 1.2 |
| 0.55, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 96)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.55, -0.00, -0.24 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_blue | 1.09 | 39 | 90 |
| -0.14, 1.75, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 45.3 |
| 0.11, 1.76, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 45.3 |
| -0.14, 0.62, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 45.3 |
| 0.11, 0.62, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 45.3 |
| -0.48, 1.86, -0.13 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.5 |
| 0.48, 1.86, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.5 |
| -0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.34 | 22 | 44.5 |
| 0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.34 | 22 | 44.5 |
| -0.48, 2.48, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| 0.48, 2.47, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| -0.38, 1.85, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 20 | 44.3 |
| 0.38, 1.85, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 20 | 44.3 |
| -0.00, 2.00, -0.15 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 16 | 80.8 |
| 0.30, 0.11, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 15 | 67.5 |
| 0.43, 1.03, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/painted_metal_white | 0.07 | 14 | 90 |
| 0.05, 1.97, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84.7 |
| 0.04, 1.99, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 83.4 |
| -0.04, 1.99, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 83.4 |
| -0.05, 1.97, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84.7 |
| -0.72, -0.06, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| 0.72, -0.01, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| -0.47, 2.40, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| -0.47, 1.94, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| 0.16, 0.20, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| 0.11, 0.29, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.47 | 12 | 67.2 |
| 0.05, 0.38, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.47 | 12 | 67.2 |
| -0.00, 0.47, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.47 | 12 | 67.2 |
| -0.14, 0.62, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.14 | 12 | 90 |
| -0.11, 1.75, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.14 | 12 | 90 |
| 0.11, 0.62, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.14 | 12 | 90 |
| 0.14, 1.75, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.14 | 12 | 90 |
| -0.55, 1.03, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.33 | 10 | 22.5 |
| 0.55, 0.01, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.33 | 10 | 22.5 |
| 0.27, 2.40, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 10 | 60.1 |
| -0.43, 2.73, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 3.49 | 8 | 22.5 |
| -0.23, 2.80, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 1.87 | 8 | 22.5 |
| -0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.87 | 8 | 22.2 |
| -0.47, 2.22, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 8 | 59.7 |
| 0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.87 | 8 | 22.2 |

(56 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.43, -0.24 | doorDeco.lod0/stone_white | 1 + 0 + 0 | 2.483 |
| -0.50, 2.48, -0.24 | doorDeco.lod0/stone_white | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.24 | doorDeco.lod0/stone_white | -1 + 0 + 0 | 2.483 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.73, 0.00 | wall/wall | 0 + 0 + 1 | 1.521 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 85)

| at | parts | area |
|---|---|---|
| -0.55, 1.00, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07721 |
| -0.55, 1.10, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03483 |
| 0.55, 0.33, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00296 |
| 0.55, 0.41, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.0452 |
| -0.52, 2.48, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.50, 2.48, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.07, 2.48, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03012 |
| -0.03, 2.48, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01471 |
| 0.06, 2.64, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01298 |
| -0.44, 2.64, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00866 |
| -0.61, 2.69, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0091 |
| 0.08, 2.71, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0343 |
| -0.47, 2.69, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0108 |
| 0.59, 2.72, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00041 |
| 0.32, 2.64, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.013 |
| 0.01, 2.73, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01187 |
| -0.30, 2.73, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01028 |
| -0.09, 2.77, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.02146 |
| -0.38, 2.77, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00495 |
| 0.30, 2.73, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00603 |
| 0.07, 2.80, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00519 |
| -0.16, 2.80, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.0043 |
| -0.07, 2.83, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00949 |
| 0.17, 2.80, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00204 |
| -0.55, 2.15, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00302 |
| -0.55, 2.06, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.0454 |
| 0.55, 1.48, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07727 |
| 0.55, 1.37, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03503 |
| 0.39, 2.48, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00056 |
| 0.33, 2.48, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01597 |
| 0.50, 2.48, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| 0.52, 2.48, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.59, 2.65, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00041 |
| 0.06, 2.67, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.04374 |
| -0.49, 2.65, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00136 |
| 0.61, 2.68, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0091 |
| 0.02, 2.73, 0.04 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00761 |
| 0.03, 2.75, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.02628 |
| -0.39, 2.73, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00014 |
| 0.01, 2.80, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00293 |

(45 more in the JSON)
