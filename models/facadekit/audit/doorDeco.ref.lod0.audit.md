# Kit audit: doorDeco.ref LOD0

2,166 triangles, 1,180 welded vertices, 45 open edges, 19,504 rays, 76 ms.

**0 blocking**, 387 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 382 |
| nonmanifold | warn | 1 |
| tjunction | warn | 4 |
| seam | info | 96 |
| opening | info | 9 |
| backtoback | info | 97 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 382)

| at | part | aspect | longest |
|---|---|---|---|
| -0.57, 0.81, 0.07 | doorDeco.lod0/stone_white | 49 | 2.453 |
| -0.60, 0.83, 0.06 | doorDeco.lod0/stone_white | 125 | 2.502 |
| -0.62, 0.83, 0.05 | doorDeco.lod0/stone_white | 50 | 2.502 |
| -0.65, 0.85, 0.04 | doorDeco.lod0/stone_white | 128 | 2.552 |
| -0.67, 0.85, 0.03 | doorDeco.lod0/stone_white | 43 | 2.553 |
| -0.71, 0.87, 0.02 | doorDeco.lod0/stone_white | 77 | 2.612 |
| -0.20, 2.50, 0.06 | doorDeco.lod0/stone_white | 60 | 1.2 |
| -0.22, 2.55, 0.04 | doorDeco.lod0/stone_white | 65 | 1.3 |
| -0.24, 2.61, 0.02 | doorDeco.lod0/stone_white | 42 | 1.42 |
| 0.58, 1.65, 0.07 | doorDeco.lod0/stone_white | 50 | 2.502 |
| 0.60, 1.66, 0.06 | doorDeco.lod0/stone_white | 125 | 2.502 |
| 0.63, 1.68, 0.05 | doorDeco.lod0/stone_white | 51 | 2.552 |
| 0.65, 1.70, 0.04 | doorDeco.lod0/stone_white | 128 | 2.552 |
| 0.69, 1.72, 0.03 | doorDeco.lod0/stone_white | 44 | 2.612 |
| 0.71, 1.74, 0.02 | doorDeco.lod0/stone_white | 77 | 2.612 |
| -0.22, 2.69, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.22, 2.70, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.61, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| 0.22, 2.61, 0.06 | doorDeco.lod0/stone_white | 435 | 1.332 |
| -0.14, 2.77, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.14, 2.77, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.70, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| 0.14, 2.70, 0.05 | doorDeco.lod0/stone_white | 278 | 0.852 |
| -0.07, 2.81, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.07, 2.82, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.77, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| 0.07, 2.77, 0.04 | doorDeco.lod0/stone_white | 148 | 0.452 |
| -0.58, 1.65, 0.07 | doorDeco.lod0/stone_white | 50 | 2.502 |
| -0.60, 1.66, 0.06 | doorDeco.lod0/stone_white | 125 | 2.502 |
| -0.63, 1.68, 0.05 | doorDeco.lod0/stone_white | 51 | 2.552 |
| -0.65, 1.70, 0.04 | doorDeco.lod0/stone_white | 128 | 2.552 |
| -0.69, 1.72, 0.03 | doorDeco.lod0/stone_white | 44 | 2.612 |
| -0.71, 1.74, 0.01 | doorDeco.lod0/stone_white | 77 | 2.612 |
| 0.20, 2.50, 0.06 | doorDeco.lod0/stone_white | 60 | 1.2 |
| 0.22, 2.55, 0.04 | doorDeco.lod0/stone_white | 65 | 1.3 |
| 0.24, 2.61, 0.01 | doorDeco.lod0/stone_white | 42 | 1.42 |
| 0.57, 0.81, 0.07 | doorDeco.lod0/stone_white | 49 | 2.453 |
| 0.60, 0.83, 0.06 | doorDeco.lod0/stone_white | 125 | 2.502 |
| 0.62, 0.83, 0.05 | doorDeco.lod0/stone_white | 50 | 2.502 |
| 0.65, 0.85, 0.04 | doorDeco.lod0/stone_white | 128 | 2.552 |

(342 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.00, 2.45, 0.00 | doorDeco.lod0/stone_white | 3 |

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
| -0.14, 1.73, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.7 |
| 0.11, 1.73, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.7 |
| -0.14, 0.62, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.7 |
| 0.11, 0.62, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.17 | 30 | 44.7 |
| -0.48, 1.83, -0.13 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.7 |
| 0.48, 1.83, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 24 | 44.7 |
| -0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.33 | 22 | 44.7 |
| 0.38, 0.00, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.33 | 22 | 44.7 |
| -0.48, 2.44, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| 0.48, 2.44, -0.20 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.28 | 20 | 44.7 |
| -0.38, 1.83, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| 0.38, 1.83, -0.19 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 0.29 | 20 | 44.7 |
| -0.00, 1.97, -0.15 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 16 | 81 |
| 0.30, 0.11, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 15 | 67.5 |
| -0.43, 2.70, 0.00 | doorDeco.lod0/stone_white + wall/wall | 1.85 | 14 | 90 |
| 0.43, 1.02, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/painted_metal_white | 0.07 | 14 | 90 |
| 0.05, 1.95, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84 |
| 0.04, 1.96, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84 |
| -0.04, 1.96, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84 |
| -0.05, 1.95, -0.16 | doorDeco.lod0/metal_anodised + doorDeco.lod0/metal_anodised | 0.05 | 14 | 84 |
| -0.23, 2.77, 0.00 | doorDeco.lod0/stone_white + wall/wall | 1.01 | 12 | 90 |
| -0.72, -0.06, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| 0.72, -0.01, 0.00 | doorDeco.lod0/stone_blue + wall/wall | 0.39 | 12 | 90 |
| -0.47, 2.37, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| -0.47, 1.91, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 0.96 | 12 | 90 |
| 0.16, 0.20, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| 0.11, 0.29, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| 0.05, 0.38, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| -0.00, 0.47, -0.14 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 1.46 | 12 | 67.5 |
| -0.14, 0.62, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.12 | 12 | 90 |
| -0.11, 1.73, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.12 | 12 | 90 |
| 0.11, 0.62, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.12 | 12 | 90 |
| 0.14, 1.73, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/glass_window | 1.12 | 12 | 90 |
| -0.55, 1.02, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.27 | 10 | 22.5 |
| 0.55, 0.01, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 5.27 | 10 | 22.5 |
| 0.27, 2.37, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 10 | 60 |
| -0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.82 | 8 | 22.5 |
| -0.47, 2.19, -0.16 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/metal_anodised | 0.05 | 8 | 60 |
| 0.47, 0.01, -0.17 | doorDeco.lod0/wood_frame_dark + doorDeco.lod0/wood_frame_dark | 3.82 | 8 | 22.5 |

(56 more in the JSON)

## opening (info, 9)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.55, 2.40, -0.24 | doorDeco.lod0/stone_white | 1 + 0 + 0 | 2.452 |
| -0.50, 2.45, -0.24 | doorDeco.lod0/stone_white | 0 + -1 + 0 | 1.1 |
| 0.55, 0.04, -0.24 | doorDeco.lod0/stone_white | -1 + 0 + 0 | 2.452 |
| -0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| 0.55, 2.79, 0.00 | wall/wall | 0 + 0 + 1 | 1.552 |
| -0.50, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.1 |
| 0.60, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.45 |
| -3.00, -0.06, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 3.00, -0.06, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 97)

| at | parts | area |
|---|---|---|
| -0.55, 0.98, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07625 |
| -0.55, 1.09, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.0344 |
| 0.55, 0.32, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00293 |
| 0.55, 0.41, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.04463 |
| -0.52, 2.45, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.50, 2.45, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.07, 2.45, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.03012 |
| -0.03, 2.45, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01471 |
| 0.03, 2.61, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01176 |
| -0.43, 2.61, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.0107 |
| 0.67, 2.67, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00018 |
| 0.26, 2.61, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.0175 |
| 0.12, 2.70, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01288 |
| -0.31, 2.70, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.01097 |
| 0.43, 2.74, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00014 |
| 0.30, 2.70, 0.03 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00671 |
| 0.07, 2.77, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00576 |
| -0.16, 2.77, 0.01 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00464 |
| 0.23, 2.80, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.0001 |
| 0.16, 2.77, 0.02 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00238 |
| -0.55, 2.12, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00299 |
| -0.55, 2.04, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.04484 |
| 0.55, 1.46, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.07631 |
| 0.55, 1.35, -0.15 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.0346 |
| 0.39, 2.45, -0.20 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00056 |
| 0.33, 2.45, -0.17 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.01597 |
| 0.50, 2.45, -0.18 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| 0.52, 2.45, -0.16 | doorDeco.lod0/stone_white + doorDeco.lod0/wood_frame_dark | 0.00211 |
| -0.67, 2.67, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00016 |
| -0.61, 2.65, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00999 |
| 0.08, 2.68, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.03784 |
| -0.47, 2.66, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.01166 |
| 0.59, 2.69, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00045 |
| -0.67, 2.64, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00018 |
| 0.67, 2.64, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00016 |
| -0.59, 2.61, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00045 |
| 0.06, 2.63, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.04809 |
| -0.49, 2.61, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00141 |
| 0.61, 2.65, 0.00 | doorDeco.lod0/stone_white + wall/wall | 0.00999 |
| -0.09, 2.70, 0.04 | doorDeco.lod0/stone_white + doorDeco.lod0/stone_white | 0.00862 |

(57 more in the JSON)
