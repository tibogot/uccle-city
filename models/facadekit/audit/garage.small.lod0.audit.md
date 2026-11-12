# Kit audit: garage.small LOD0

2,008 triangles, 1,062 welded vertices, 26 open edges, 19,680 rays, 54 ms.

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
| 0.35, 2.31, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.32, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.31, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.32, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.10, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.10, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.10, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.10, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.10, 0.01 | garage.lod0/stone_white | 117 | 2.1 |
| -0.35, 2.32, 0.01 | garage.lod0/stone_white | 117 | 2.1 |
| -0.35, 2.32, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.32, 0.01 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.32, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.32, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.10, 0.00 | garage.lod0/stone_white | 457 | 2.1 |
| 0.35, 2.10, 0.01 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.10, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.10, 0.03 | garage.lod0/stone_white | 457 | 2.1 |
| -0.35, 2.10, 0.02 | garage.lod0/stone_white | 117 | 2.1 |
| 0.35, 2.32, 0.02 | garage.lod0/stone_white | 117 | 2.1 |
| -0.94, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.94, 0.35, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.94, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.94, 0.18, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.31, 0.52, -0.12 | garage.lod0/painted_metal_white | 610 | 1.868 |
| 0.31, 0.52, -0.12 | garage.lod0/painted_metal_white | 610 | 1.868 |
| -0.31, 0.52, -0.08 | garage.lod0/painted_metal_white | 610 | 1.868 |
| -0.31, 0.52, -0.08 | garage.lod0/painted_metal_white | 610 | 1.868 |
| 0.94, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.94, 0.18, -0.12 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.94, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| 0.94, 0.35, -0.08 | garage.lod0/painted_metal_white | 165 | 0.505 |
| -0.31, 0.01, -0.12 | garage.lod0/painted_metal_white | 610 | 1.868 |
| -0.31, 0.01, -0.12 | garage.lod0/painted_metal_white | 610 | 1.868 |
| 0.31, 0.01, -0.08 | garage.lod0/painted_metal_white | 610 | 1.868 |
| 0.31, 0.01, -0.08 | garage.lod0/painted_metal_white | 610 | 1.868 |
| 0.31, 0.01, -0.10 | garage.lod0/painted_metal_white | 58 | 1.868 |
| -0.31, 0.53, -0.10 | garage.lod0/painted_metal_white | 58 | 1.868 |
| -0.31, 0.01, -0.11 | garage.lod0/painted_metal_white | 67 | 1.876 |
| 0.31, 0.00, -0.11 | garage.lod0/painted_metal_white | 67 | 1.876 |

(444 more in the JSON)

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.94, -0.00, 0.00 | wall/wall | 5.2 |
| 0.94, -0.00, 0.00 | wall/wall | 1.2 |
| -0.94, -0.00, 0.00 | wall/wall | 1.2 |
| 0.94, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 39)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.94, 1.59, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 5.99 | 56 | 22.5 |
| -0.94, 0.01, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -0.94, 0.54, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| -0.94, 1.06, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 2.19 | 50 | 67.5 |
| 0.70, 0.13, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 0.26, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 0.39, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.70, 0.66, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 0.79, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 0.91, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.70, 1.18, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 1.31, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 1.44, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.70, 1.71, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 1.84, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| 0.63, 1.96, -0.08 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.65 | 26 | 90 |
| -0.06, 0.42, -0.08 | garage.lod0/painted_metal_white + garage.lod0/metal_anodised | 0.33 | 24 | 67.5 |
| -0.94, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 18 | 90 |
| -0.94, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 16 | 90 |
| -0.94, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 16 | 90 |
| -0.94, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.16 | 16 | 90 |
| -0.93, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| -0.93, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 3.78 | 7 | 22.5 |
| 0.10, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 3.74 | 4 | 22.5 |
| -0.94, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 3.81 | 4 | 90 |
| -0.94, 0.00, -0.06 | garage.lod0/render_white + ground/ground | 0.24 | 4 | 90 |
| -0.99, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.44 | 3 | 22.5 |
| 0.99, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.44 | 3 | 22.5 |
| -1.73, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 3 | 90 |
| 0.94, -0.00, 0.00 | garage.lod0/render_white + wall/wall | 0.01 | 2 | 90 |
| 2.21, 0.00, 0.00 | wall/wall + ground/ground | 2.06 | 2 | 90 |
| 0.94, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| -0.94, 1.05, 0.00 | garage.lod0/render_white + wall/wall | 2.1 | 1 | 90 |
| 0.00, 0.00, 0.00 | wall/wall + ground/ground | 1.87 | 1 | 90 |

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.94, 2.05, -0.12 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 0.94, 2.05, 0.00 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -0.89, 2.10, -0.12 | garage.lod0/render_white | 0 + -1 + 0 | 1.872 |
| -0.94, 0.05, 0.00 | garage.lod0/render_white | 1 + 0 + 0 | 2.104 |
| 0.94, 0.05, -0.12 | garage.lod0/render_white | -1 + 0 + 0 | 2.104 |
| -0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| 0.94, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.9 |
| -0.89, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.872 |
| 0.98, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.064 |
| -4.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 3.5 |
| 4.00, 0.00, 2.95 | ground/ground | 0 + 1 + 0 | 3.5 |

## backtoback (info, 42)

| at | parts | area |
|---|---|---|
| -0.99, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.02307 |
| 0.06, 2.26, 0.00 | garage.lod0/stone_white + wall/wall | 0.17229 |
| -0.88, 2.22, 0.00 | garage.lod0/stone_white + wall/wall | 0.0224 |
| 0.97, 2.31, 0.00 | garage.lod0/stone_white + wall/wall | 0.00064 |
| -0.97, 2.11, 0.00 | garage.lod0/stone_white + wall/wall | 0.00064 |
| 0.01, 2.16, 0.00 | garage.lod0/stone_white + wall/wall | 0.19454 |
| -0.93, 2.11, 0.00 | garage.lod0/stone_white + wall/wall | 0.00015 |
| 0.99, 2.21, 0.00 | garage.lod0/stone_white + wall/wall | 0.02307 |
| -0.15, 0.01, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| 0.56, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| 0.15, 0.53, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| -0.56, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| -0.69, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| 0.31, 0.00, -0.11 | garage.lod0/painted_metal_white + ground/ground | 0.02626 |
| -0.15, 0.54, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| 0.56, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| 0.15, 1.05, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| -0.56, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| -0.69, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| 0.69, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| -0.15, 1.06, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| 0.56, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| 0.15, 1.57, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| -0.56, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| -0.69, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| 0.69, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| -0.15, 1.59, -0.11 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01026 |
| 0.56, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.01776 |
| -0.04, 2.10, -0.11 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.02985 |
| 0.89, 2.10, -0.12 | garage.lod0/painted_metal_white + garage.lod0/render_white | 0.00004 |
| -0.69, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| 0.69, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00894 |
| -0.40, 0.01, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| 0.40, 0.53, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| -0.31, 0.00, -0.10 | garage.lod0/painted_metal_white + ground/ground | 0.02626 |
| -0.40, 0.54, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| 0.40, 1.05, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| -0.40, 1.06, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| 0.40, 1.57, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |
| -0.40, 1.59, -0.10 | garage.lod0/painted_metal_white + garage.lod0/painted_metal_white | 0.00787 |

(2 more in the JSON)
