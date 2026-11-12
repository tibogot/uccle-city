# Kit audit: winC.ref LOD1

322 triangles, 214 welded vertices, 66 open edges, 15,606 rays, 23 ms.

**0 blocking**, 44 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 22 |
| nonmanifold | warn | 16 |
| tjunction | warn | 6 |
| seam | info | 87 |
| opening | info | 11 |
| backtoback | info | 146 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 22)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.57, 0.06 | winC.lod1/stone_white | 41 | 1.714 |
| -0.75, 0.58, 0.07 | winC.lod1/stone_white | 97 | 1.749 |
| -0.25, 1.75, 0.07 | winC.lod1/stone_white | 85 | 1.508 |
| 0.73, 1.15, 0.07 | winC.lod1/stone_white | 42 | 1.749 |
| 0.76, 1.17, 0.07 | winC.lod1/stone_white | 98 | 1.767 |
| -0.73, 1.15, 0.07 | winC.lod1/stone_white | 42 | 1.749 |
| -0.76, 1.17, 0.07 | winC.lod1/stone_white | 98 | 1.767 |
| 0.25, 1.76, 0.07 | winC.lod1/stone_white | 85 | 1.526 |
| 0.72, 0.57, 0.06 | winC.lod1/stone_white | 41 | 1.714 |
| 0.75, 0.58, 0.07 | winC.lod1/stone_white | 97 | 1.749 |
| -0.18, 1.05, -0.09 | winC.lod1/wood_frame_white | 48 | 1.06 |
| -0.18, 1.05, -0.08 | winC.lod1/wood_frame_white | 147 | 1.06 |
| -0.18, 1.06, -0.08 | winC.lod1/wood_frame_white | 70 | 1.06 |
| -0.18, 1.07, -0.09 | winC.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.40, -0.10 | winC.lod1/wood_frame_white | 62 | 0.985 |
| 0.02, 0.73, -0.10 | winC.lod1/wood_frame_white | 62 | 0.985 |
| 0.18, 1.05, -0.09 | winC.lod1/wood_frame_white | 48 | 1.06 |
| 0.18, 1.05, -0.07 | winC.lod1/wood_frame_white | 147 | 1.06 |
| 0.18, 1.06, -0.08 | winC.lod1/wood_frame_white | 70 | 1.06 |
| 0.18, 1.07, -0.09 | winC.lod1/wood_frame_white | 47 | 1.06 |
| -0.02, 0.73, -0.10 | winC.lod1/wood_frame_white | 62 | 0.985 |
| 0.02, 0.40, -0.10 | winC.lod1/wood_frame_white | 62 | 0.985 |

## nonmanifold (warn, 16)

| at | part | uses |
|---|---|---|
| -0.53, 1.60, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.53, 0.00, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.53, 0.00, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.53, 1.60, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.48, 1.05, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.48, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.05, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| -0.05, 1.05, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.00, 0.56, -0.16 | winC.lod1/wood_frame_white | 3 |
| 0.00, 1.05, -0.13 | winC.lod1/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winC.lod1/wood_frame_white | 3 |
| 0.00, 0.56, -0.11 | winC.lod1/wood_frame_white | 3 |
| 0.05, 1.05, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.05, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.48, 0.07, -0.13 | winC.lod1/wood_frame_white | 4 |
| 0.48, 1.05, -0.13 | winC.lod1/wood_frame_white | 4 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| -0.53, 1.05, -0.10 | winC.lod1/wood_frame_white | 0.03 |
| 0.53, 1.05, -0.10 | winC.lod1/wood_frame_white | 0.03 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 87)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.07, 1.60, -0.02 | winC.lod1/stone_white + winC.lod1/stone_white | 0.79 | 24 | 84.6 |
| -0.60, 0.00, -0.01 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.51 | 16 | 6 |
| -0.60, 0.66, -0.17 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 3.6 | 12 | 90 |
| -0.00, 0.07, -0.11 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 1.06 | 11 | 90 |
| 0.00, 1.05, -0.11 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 1.06 | 11 | 90 |
| 0.60, 0.00, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 3.6 | 10 | 90 |
| -0.60, 0.16, 0.00 | winC.lod1/stone_white + wall/wall | 3.7 | 9 | 90 |
| 0.60, 0.64, 0.00 | winC.lod1/stone_white + wall/wall | 3.7 | 8 | 90 |
| -0.53, 1.13, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.43 | 8 | 90 |
| 0.53, 1.05, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.43 | 8 | 90 |
| -0.48, 1.60, -0.17 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 2.25 | 6 | 90 |
| 0.09, 1.72, 0.00 | winC.lod1/stone_white + wall/wall | 0.79 | 6 | 90 |
| -0.53, 0.61, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 2.07 | 6 | 90 |
| 0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 2.07 | 6 | 90 |
| -0.19, 1.53, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.21, 1.53, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.48, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.05, 0.07, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.21, 1.13, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| 0.19, 1.13, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.12 | 6 | 90 |
| -0.23, 1.05, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| 0.27, 1.05, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.95 | 6 | 90 |
| -0.48, 0.59, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.05, 0.57, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| -0.48, 1.00, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.36, 0.15, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.48, 0.57, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.34, 0.59, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.59, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.48, 0.57, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.11 | 6 | 90 |
| 0.05, 1.00, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.17, 0.15, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.05, 0.57, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| 0.19, 0.59, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_window | 0.43 | 6 | 90 |
| -0.21, 1.13, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.41 | 6 | 90 |
| -0.19, 1.38, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.41 | 6 | 90 |
| 0.19, 1.13, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.41 | 6 | 90 |
| 0.21, 1.38, -0.14 | winC.lod1/wood_frame_white + winC.lod1/glass_stained | 0.41 | 6 | 90 |
| -0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.25 | 5 | 90 |
| 0.53, 0.07, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.25 | 5 | 90 |

(47 more in the JSON)

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.55, -0.20 | winC.lod1/stone_white | 1 + 0 + 0 | 1.604 |
| -0.60, -0.01, -0.15 | winC.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| 0.60, 0.05, -0.20 | winC.lod1/stone_white | -1 + 0 + 0 | 1.604 |
| -0.55, 1.60, -0.20 | winC.lod1/stone_white | 0 + -1 + 0 | 1.2 |
| 0.60, -0.01, -0.15 | winC.lod1/stone_white | 0 + 1 + 0.04 | 0.2 |
| -0.80, -0.05, -0.03 | sill.lod1/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod1/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 1.85, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 146)

| at | parts | area |
|---|---|---|
| -0.60, 0.63, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.04963 |
| -0.60, 0.66, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.01919 |
| 0.60, 0.17, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00134 |
| 0.60, 0.23, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02655 |
| -0.60, 1.29, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00099 |
| -0.60, 1.06, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00605 |
| -0.58, 1.60, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.43, 1.60, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.01253 |
| -0.55, 1.60, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.29, 1.60, -0.11 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00398 |
| -0.76, -0.00, 0.04 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00052 |
| 0.60, 0.93, -0.15 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.05066 |
| 0.60, 0.84, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02545 |
| -0.04, 1.60, -0.15 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02192 |
| 0.18, 1.60, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.03047 |
| 0.55, 1.60, -0.14 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| 0.58, 1.60, -0.12 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00228 |
| -0.60, 1.42, -0.16 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.00139 |
| -0.60, 1.36, -0.13 | winC.lod1/stone_white + winC.lod1/wood_frame_white | 0.02676 |
| -0.69, -0.00, 0.01 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00429 |
| -0.64, -0.00, 0.03 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00275 |
| -0.74, -0.00, 0.04 | winC.lod1/stone_white + sill.lod1/stone_blue | 0.00142 |
| -0.53, 0.03, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.0001 |
| -0.53, 0.63, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00878 |
| -0.53, 0.92, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00703 |
| -0.53, 1.07, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00217 |
| -0.53, 1.12, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00116 |
| -0.53, 1.56, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00227 |
| -0.53, 1.58, -0.12 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.04, -0.14 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00227 |
| 0.53, 0.02, -0.12 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.53, 0.71, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.01797 |
| 0.53, 0.25, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.01631 |
| 0.53, 1.10, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00128 |
| 0.53, 1.06, -0.15 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00027 |
| 0.53, 1.57, -0.16 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.0001 |
| 0.53, 1.58, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |
| 0.20, 1.53, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00037 |
| 0.21, 1.53, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00018 |
| -0.53, 0.02, -0.13 | winC.lod1/wood_frame_white + winC.lod1/wood_frame_white | 0.00218 |

(106 more in the JSON)
