# Kit audit: bay.small LOD0

2,298 triangles, 1,236 welded vertices, 72 open edges, 14,152 rays, 128 ms.

**0 blocking**, 345 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 336 |
| nonmanifold | warn | 5 |
| tjunction | warn | 4 |
| seam | info | 87 |
| opening | info | 4 |
| backtoback | info | 98 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 336)

| at | part | aspect | longest |
|---|---|---|---|
| -0.95, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.96, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.82, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.82, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.68, 0.76, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 0.76, 0.61 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 0.76, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 0.76, 0.61 | bay.lod0/stone_white | 493 | 2.263 |
| 0.68, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.69, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.69, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| 0.69, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| 0.82, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| 0.82, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| 0.95, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| 0.96, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.95, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.96, 1.51, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.82, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.82, 0.76, 0.07 | bay.lod0/stone_white | 493 | 2.263 |
| -0.68, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| -0.69, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 1.51, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 0.76, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| -0.55, 0.76, 0.61 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 0.76, 0.48 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |
| 0.55, 1.51, 0.62 | bay.lod0/stone_white | 493 | 2.263 |

(296 more in the JSON)

## nonmanifold (warn, 5)

| at | part | uses |
|---|---|---|
| 0.00, 2.50, 0.65 | bay.lod0/stone_white | 4 |
| 0.83, 2.50, 0.34 | bay.lod0/stone_white | 4 |
| 0.99, 2.50, -0.01 | bay.lod0/stone_white | 4 |
| -0.99, 2.50, -0.01 | bay.lod0/stone_white | 4 |
| -0.83, 2.50, 0.34 | bay.lod0/stone_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.47, 0.00, 0.00 | bay.lod0/stone_white | 1.576 |
| -0.47, 2.27, 0.00 | bay.lod0/stone_white | 1.576 |
| -0.47, 0.00, 0.00 | wall/wall | 5.2 |
| 0.47, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 87)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.91, 2.54, 0.08 | bay.lod0/stone_white + bay.lod0/zinc_roof | 7.58 | 28 | 28.7 |
| -0.78, 1.71, 0.09 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.58, 1.71, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.49, 1.71, 0.50 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.49, 1.71, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.63, 1.71, 0.41 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.73, 1.71, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.58, 0.00, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.49, 0.00, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.49, 2.27, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.49, 0.00, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.49, 2.27, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.58, 2.27, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.73, 2.27, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.73, 0.00, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -0.74, 2.27, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -0.58, 2.27, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| 0.58, 0.00, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| 0.74, 0.00, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -0.95, 0.00, 0.00 | bay.lod0/stone_white + wall/wall | 4.82 | 12 | 90 |
| 0.82, 0.00, 0.00 | bay.lod0/stone_white + wall/wall | 4.82 | 12 | 90 |
| -0.76, 1.81, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 12 | 90 |
| -0.49, 2.21, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.98 | 12 | 90 |
| -0.49, 1.81, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.99 | 12 | 90 |
| 0.60, 1.81, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 12 | 90 |
| -0.89, 2.50, -0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 2.54 | 10 | 90 |
| -0.76, 2.22, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.76, 0.06, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.76, 1.71, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.49, 0.06, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.98 | 10 | 90 |
| -0.49, 1.71, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.99 | 10 | 90 |
| 0.60, 2.22, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| 0.60, 0.06, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| 0.60, 1.71, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.66, 0.00, 0.49 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 9 | 22.5 |
| 0.59, 2.27, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 9 | 22.5 |
| 0.59, 0.00, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 8 | 22.5 |
| -0.63, 2.27, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 8 | 22.5 |
| -0.99, 2.50, 0.00 | bay.lod0/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| 0.82, 2.54, 0.00 | bay.lod0/stone_white + wall/wall | 0.43 | 8 | 63.9 |

(47 more in the JSON)

## opening (info, 4)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| 0.47, 2.33, 0.00 | wall/wall | 0 + 0 + 1 | 1.725 |
| -0.42, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.936 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 98)

| at | parts | area |
|---|---|---|
| -0.90, 0.00, 0.02 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00103 |
| -0.91, 0.00, 0.04 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00359 |
| -0.64, 0.00, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| -0.59, 0.00, 0.57 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00189 |
| -0.61, 0.00, 0.59 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00332 |
| 0.65, 0.00, 0.54 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00471 |
| 0.65, 0.00, 0.59 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00077 |
| 0.92, 0.00, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00048 |
| -0.87, 2.27, 0.00 | bay.lod0/stone_white + wall/wall | 0.00042 |
| -0.92, 0.00, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00032 |
| -0.92, 2.27, 0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 0.0028 |
| -0.92, 2.27, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00048 |
| -0.65, 0.00, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00061 |
| -0.57, 0.00, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00016 |
| -0.64, 2.27, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| -0.65, 2.27, 0.54 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00471 |
| -0.55, 0.18, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00131 |
| -0.55, 1.05, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.01834 |
| 0.55, 2.10, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00131 |
| 0.55, 1.23, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.01834 |
| 0.64, 0.00, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| 0.57, 2.27, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00016 |
| 0.65, 2.27, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00061 |
| 0.59, 2.27, 0.57 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00189 |
| 0.64, 2.27, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| 0.91, 2.27, 0.00 | bay.lod0/stone_white + wall/wall | 0.00042 |
| 0.92, 0.00, 0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 0.0028 |
| 0.92, 2.27, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00032 |
| 0.90, 2.27, 0.02 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00103 |
| -0.75, 0.00, 0.05 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00061 |
| -0.77, 0.00, 0.03 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00011 |
| -0.73, 0.00, 0.10 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00059 |
| -0.65, 0.00, 0.25 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00322 |
| -0.57, 0.00, 0.42 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00035 |
| 0.75, 2.27, 0.05 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00061 |
| 0.65, 2.27, 0.25 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00322 |
| 0.73, 2.27, 0.10 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00059 |
| 0.57, 2.27, 0.42 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00035 |
| 0.77, 2.27, 0.03 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00011 |
| -0.92, 2.50, -0.04 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00081 |

(58 more in the JSON)
