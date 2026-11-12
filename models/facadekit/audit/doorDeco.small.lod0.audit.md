# Kit audit: doorDeco.small LOD0

2,262 triangles, 1,228 welded vertices, 45 open edges, 19,440 rays, 62 ms.

**0 blocking**, 403 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 398 |
| nonmanifold | warn | 1 |
| tjunction | warn | 4 |
| seam | info | 96 |
| opening | info | 9 |
| backtoback | info | 85 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 398)

| at | part | aspect | longest |
|---|---|---|---|
| -0.57, 0.80, 0.07 | doorDeco.lod0/stone_white | 49 | 2.426 |
| -0.60, 0.82, 0.06 | doorDeco.lod0/stone_white | 124 | 2.475 |
| -0.62, 0.82, 0.05 | doorDeco.lod0/stone_white | 50 | 2.476 |
| -0.65, 0.84, 0.04 | doorDeco.lod0/stone_white | 126 | 2.525 |
| -0.67, 0.84, 0.03 | doorDeco.lod0/stone_white | 42 | 2.526 |
| -0.71, 0.86, 0.02 | doorDeco.lod0/stone_white | 76 | 2.585 |
| -0.20, 2.47, 0.06 | doorDeco.lod0/stone_white | 60 | 1.2 |
| -0.22, 2.52, 0.04 | doorDeco.lod0/stone_white | 65 | 1.3 |
| -0.24, 2.58, 0.02 | doorDeco.lod0/stone_white | 42 | 1.42 |
| 0.58, 1.63, 0.07 | doorDeco.lod0/stone_white | 50 | 2.475 |
| 0.60, 1.65, 0.06 | doorDeco.lod0/stone_white | 124 | 2.475 |
| 0.63, 1.66, 0.05 | doorDeco.lod0/stone_white | 51 | 2.525 |
| 0.65, 1.68, 0.04 | doorDeco.lod0/stone_white | 126 | 2.525 |
| 0.69, 1.70, 0.03 | doorDeco.lod0/stone_white | 43 | 2.585 |
| 0.71, 1.72, 0.02 | doorDeco.lod0/stone_white | 76 | 2.585 |
| 0.22, 2.67, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.67, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.67, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.67, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.58, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.58, 0.00 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.58, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.58, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.14, 2.74, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.74, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.74, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.74, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.67, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.67, 0.00 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.67, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.67, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.07, 2.79, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.79, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.79, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.79, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.74, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.74, 0.00 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.74, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.74, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.58, 1.63, 0.07 | doorDeco.lod0/stone_white | 50 | 2.475 |

(358 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.42, 0.00 | doorDeco.lod0/stone_white | 3 |

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
| -0.14, 1.71, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.1 |
| 0.11, 1.71, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.1 |
| -0.14, 0.61, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.1 |
| 0.11, 0.61, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.1 |
| -0.48, 1.81, -0.13 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.8 |
| 0.48, 1.81, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.8 |
| -0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.32 | 22 | 44.8 |
| 0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.32 | 22 | 44.8 |
| -0.48, 2.42, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| 0.48, 2.42, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| -0.38, 1.80, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.8 |
| 0.38, 1.80, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.8 |
| -0.00, 1.95, -0.15 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 16 | 81.1 |
| 0.30, 0.11, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 15 | 67.5 |
| 0.43, 1.01, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/painted_metal_white | 0.07 | 14 | 90 |
| 0.05, 1.92, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 83.4 |
| 0.04, 1.93, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84.5 |
| -0.04, 1.93, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84.5 |
| -0.05, 1.92, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 83.4 |
| -0.72, -0.06, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| 0.72, -0.01, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| -0.47, 2.35, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| -0.47, 1.89, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| 0.16, 0.20, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| 0.10, 0.29, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| 0.05, 0.38, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.8 |
| -0.00, 0.47, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.8 |
| -0.14, 0.61, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.1 | 12 | 90 |
| -0.11, 1.71, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.1 | 12 | 90 |
| 0.11, 0.61, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.1 | 12 | 90 |
| 0.14, 1.71, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.1 | 12 | 90 |
| -0.55, 1.01, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.21 | 10 | 22.5 |
| 0.55, 0.01, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.21 | 10 | 22.5 |
| 0.27, 2.35, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 10 | 59.9 |
| -0.43, 2.67, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 3.49 | 8 | 22.5 |
| -0.23, 2.74, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 1.87 | 8 | 22.5 |
| -0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.77 | 8 | 22.5 |
| -0.47, 2.17, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 8 | 60.2 |
| 0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.77 | 8 | 22.5 |

(56 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.37, -0.24 | doorDeco.lod0/stone_white | 1 + 0 + 0 | 2.425 |
| -0.50, 2.42, -0.24 | doorDeco.lod0/stone_white | 0 + -1 + 0 | 1.1 |
| 0.55, 0.05, -0.24 | doorDeco.lod0/stone_white | -1 + 0 + 0 | 2.425 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.77, 0.00 | wall/wall | 0 + 0 + 1 | 1.579 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 85)

| at | parts | area |
|---|---|---|
| -0.55, 0.97, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07541 |
| -0.55, 1.08, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03402 |
| 0.55, 0.32, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00289 |
| 0.55, 0.40, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.04414 |
| -0.52, 2.42, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.50, 2.42, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.07, 2.42, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03012 |
| -0.03, 2.42, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01471 |
| 0.06, 2.58, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01298 |
| -0.44, 2.58, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00866 |
| -0.61, 2.63, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0091 |
| 0.07, 2.65, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.03468 |
| -0.48, 2.63, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.01042 |
| 0.59, 2.67, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00041 |
| 0.32, 2.58, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.013 |
| 0.01, 2.67, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01187 |
| -0.30, 2.67, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01028 |
| -0.09, 2.72, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0219 |
| -0.39, 2.71, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00451 |
| 0.30, 2.67, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00603 |
| 0.07, 2.74, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00519 |
| -0.16, 2.74, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.0043 |
| -0.07, 2.77, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00949 |
| 0.17, 2.74, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00204 |
| -0.55, 2.10, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00295 |
| -0.55, 2.02, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.04434 |
| 0.55, 1.45, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07547 |
| 0.55, 1.34, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03422 |
| 0.39, 2.42, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00056 |
| 0.33, 2.42, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01597 |
| 0.50, 2.42, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| 0.52, 2.42, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.59, 2.59, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00041 |
| 0.06, 2.61, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.04381 |
| -0.49, 2.59, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00129 |
| 0.61, 2.62, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0091 |
| 0.02, 2.67, 0.04 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00761 |
| 0.03, 2.69, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0263 |
| -0.39, 2.68, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00011 |
| 0.01, 2.74, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00293 |

(45 more in the JSON)
