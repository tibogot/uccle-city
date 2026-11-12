# Kit audit: bay.small LOD1

488 triangles, 302 welded vertices, 64 open edges, 13,440 rays, 24 ms.

**0 blocking**, 21 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 17 |
| tjunction | warn | 4 |
| seam | info | 83 |
| opening | info | 4 |
| backtoback | info | 158 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 17)

| at | part | uses |
|---|---|---|
| 0.00, 2.50, 0.65 | bay.lod1/stone_white | 4 |
| 0.83, 2.50, 0.34 | bay.lod1/stone_white | 4 |
| 0.99, 2.50, -0.01 | bay.lod1/stone_white | 4 |
| -0.99, 2.50, -0.01 | bay.lod1/stone_white | 4 |
| -0.83, 2.50, 0.34 | bay.lod1/stone_white | 4 |
| -0.76, 2.27, 0.08 | bay.lod1/wood_frame_white | 4 |
| -0.76, 0.00, 0.08 | bay.lod1/wood_frame_white | 4 |
| -0.60, 0.00, 0.40 | bay.lod1/wood_frame_white | 4 |
| -0.60, 2.27, 0.40 | bay.lod1/wood_frame_white | 4 |
| -0.49, 2.27, 0.47 | bay.lod1/wood_frame_white | 4 |
| -0.49, 0.00, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.49, 0.00, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.49, 2.27, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.60, 2.27, 0.40 | bay.lod1/wood_frame_white | 4 |
| 0.76, 0.00, 0.08 | bay.lod1/wood_frame_white | 4 |
| 0.76, 2.27, 0.08 | bay.lod1/wood_frame_white | 4 |
| 0.60, 0.00, 0.40 | bay.lod1/wood_frame_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.47, 0.00, 0.00 | bay.lod1/stone_white | 1.576 |
| -0.47, 2.27, 0.00 | bay.lod1/stone_white | 1.576 |
| -0.47, 0.00, 0.00 | wall/wall | 5.2 |
| 0.47, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 83)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.89, 2.50, -0.03 | bay.lod1/stone_white + bay.lod1/stone_white | 2.54 | 10 | 90 |
| -0.66, 0.00, 0.48 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 9 | 90 |
| 0.58, 2.27, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 9 | 90 |
| -0.96, 0.00, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| 0.58, 0.00, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 8 | 90 |
| 0.96, 0.00, 0.07 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -0.88, 2.27, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -0.64, 2.27, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 8 | 90 |
| -0.55, 1.30, 0.50 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 4.63 | 8 | 90 |
| 0.55, 0.00, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 4.63 | 8 | 90 |
| 0.88, 2.27, 0.02 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -0.99, 2.50, 0.00 | bay.lod1/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| 0.82, 2.54, 0.00 | bay.lod1/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| -0.75, 1.71, 0.08 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| -0.58, 1.71, 0.39 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| -0.49, 1.76, 0.44 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| 0.49, 1.71, 0.45 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| 0.58, 1.76, 0.39 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| 0.74, 1.71, 0.07 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.53 | 8 | 90 |
| -0.99, 2.31, 0.00 | bay.lod1/stone_white + wall/wall | 0.86 | 6 | 63.9 |
| 0.94, 2.27, 0.00 | bay.lod1/stone_white + wall/wall | 0.86 | 6 | 63.9 |
| -0.72, 1.81, 0.16 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 6 | 90 |
| -0.49, 2.22, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.98 | 6 | 90 |
| -0.49, 1.71, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.99 | 6 | 90 |
| -0.24, 1.81, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.99 | 6 | 90 |
| 0.64, 1.81, 0.32 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 6 | 90 |
| -0.55, 0.00, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.08 | 5 | 90 |
| 0.54, 2.27, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.08 | 5 | 90 |
| -0.96, 1.14, 0.00 | bay.lod1/stone_white + wall/wall | 4.83 | 4 | 90 |
| 0.82, 1.14, 0.00 | bay.lod1/stone_white + wall/wall | 4.83 | 4 | 90 |
| -0.76, 2.22, 0.08 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| -0.72, 0.06, 0.16 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| -0.76, 1.71, 0.08 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 4 | 90 |
| -0.24, 0.06, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.98 | 4 | 90 |
| 0.60, 2.22, 0.40 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| 0.64, 0.06, 0.32 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| 0.60, 1.71, 0.40 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 4 | 90 |
| -0.77, 0.00, 0.02 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.1 | 3 | 90 |
| -0.74, 0.00, 0.07 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.38 | 3 | 90 |
| -0.58, 0.00, 0.39 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.09 | 3 | 90 |

(43 more in the JSON)

## opening (info, 4)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| 0.47, 2.33, 0.00 | wall/wall | 0 + 0 + 1 | 1.725 |
| -0.42, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.936 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 158)

| at | parts | area |
|---|---|---|
| -0.89, 0.00, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00123 |
| -0.92, 0.00, 0.05 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00429 |
| -0.65, 0.00, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| -0.58, 0.00, 0.57 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00226 |
| -0.61, 0.00, 0.60 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00398 |
| 0.66, 0.00, 0.54 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00563 |
| 0.66, 0.00, 0.60 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00092 |
| 0.94, 0.00, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00057 |
| -0.93, 2.27, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00334 |
| -0.92, 2.27, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00057 |
| -0.93, 0.00, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00039 |
| -0.91, 1.52, 0.00 | bay.lod1/stone_white + wall/wall | 0.15923 |
| -0.65, 2.27, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| -0.66, 2.27, 0.54 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00563 |
| -0.55, 0.25, 0.48 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00531 |
| -0.55, 1.17, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.03694 |
| -0.65, 0.00, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00073 |
| -0.57, 0.00, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00019 |
| 0.55, 2.03, 0.48 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00531 |
| 0.55, 1.10, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.03694 |
| 0.57, 2.27, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00019 |
| 0.65, 2.27, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00073 |
| 0.58, 2.27, 0.57 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00226 |
| 0.65, 2.27, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| 0.65, 0.00, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| 0.93, 2.27, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00039 |
| 0.89, 2.27, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00123 |
| 0.93, 0.00, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00334 |
| 0.86, 1.52, 0.00 | bay.lod1/stone_white + wall/wall | 0.15923 |
| -0.75, 0.00, 0.05 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00097 |
| -0.77, 0.00, 0.03 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00019 |
| -0.73, 0.00, 0.10 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00095 |
| -0.65, 0.00, 0.25 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00469 |
| -0.57, 0.00, 0.42 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00067 |
| -0.54, 0.00, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00005 |
| -0.58, 0.00, 0.39 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00009 |
| 0.54, 2.27, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00005 |
| 0.75, 2.27, 0.05 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00097 |
| 0.65, 2.27, 0.25 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00469 |
| 0.73, 2.27, 0.10 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00095 |

(118 more in the JSON)
