# Kit audit: bay.ref LOD0

2,298 triangles, 1,236 welded vertices, 72 open edges, 14,792 rays, 143 ms.

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
| -1.08, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -1.09, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.95, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.95, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.81, 0.77, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 0.77, 0.61 | bay.lod0/stone_white | 498 | 2.288 |
| -0.69, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.69, 0.77, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 0.77, 0.61 | bay.lod0/stone_white | 498 | 2.288 |
| 0.81, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.82, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.82, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| 0.82, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| 0.95, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| 0.95, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| 1.09, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| 1.09, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -1.09, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -1.09, 1.53, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.95, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.95, 0.77, 0.07 | bay.lod0/stone_white | 498 | 2.288 |
| -0.81, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| -0.82, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 1.53, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| -0.69, 0.77, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| -0.68, 0.77, 0.61 | bay.lod0/stone_white | 498 | 2.288 |
| 0.69, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 0.77, 0.48 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |
| 0.68, 1.53, 0.62 | bay.lod0/stone_white | 498 | 2.288 |

(296 more in the JSON)

## nonmanifold (warn, 5)

| at | part | uses |
|---|---|---|
| 0.00, 2.52, 0.65 | bay.lod0/stone_white | 4 |
| 0.97, 2.52, 0.34 | bay.lod0/stone_white | 4 |
| 1.12, 2.52, -0.01 | bay.lod0/stone_white | 4 |
| -1.12, 2.52, -0.01 | bay.lod0/stone_white | 4 |
| -0.97, 2.52, 0.34 | bay.lod0/stone_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.60, 0.00, 0.00 | bay.lod0/stone_white | 1.84 |
| -0.60, 2.30, 0.00 | bay.lod0/stone_white | 1.84 |
| -0.60, 0.00, 0.00 | wall/wall | 5.2 |
| 0.60, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 87)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.04, 2.57, 0.08 | bay.lod0/stone_white + bay.lod0/zinc_roof | 8.37 | 28 | 28.7 |
| -0.92, 1.74, 0.09 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.71, 1.74, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.62, 1.74, 0.50 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.62, 1.74, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.76, 1.74, 0.41 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| 0.87, 1.74, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.3 | 24 | 41.8 |
| -0.71, 0.00, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.62, 0.00, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.62, 2.30, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.62, 0.00, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.62, 2.30, 0.44 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.71, 2.30, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| 0.87, 2.30, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 21 | 44.7 |
| -0.87, 0.00, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -0.87, 2.30, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -0.71, 2.30, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| 0.71, 0.00, 0.39 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| 0.87, 0.00, 0.07 | bay.lod0/wood_frame_white + bay.lod0/wood_frame_white | 0.22 | 20 | 44.7 |
| -1.09, 0.00, 0.00 | bay.lod0/stone_white + wall/wall | 4.87 | 12 | 90 |
| 0.95, 0.00, 0.00 | bay.lod0/stone_white + wall/wall | 4.87 | 12 | 90 |
| -0.89, 1.83, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 12 | 90 |
| -0.62, 2.24, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 1.25 | 12 | 90 |
| -0.62, 1.83, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 1.25 | 12 | 90 |
| 0.74, 1.83, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 12 | 90 |
| -1.02, 2.52, -0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 2.81 | 10 | 90 |
| -0.89, 2.24, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.89, 0.06, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.89, 1.73, 0.08 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.62, 0.06, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 1.25 | 10 | 90 |
| -0.62, 1.73, 0.47 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 1.25 | 10 | 90 |
| 0.74, 2.24, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| 0.74, 0.06, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| 0.74, 1.73, 0.40 | bay.lod0/wood_frame_white + bay.lod0/glass_window | 0.36 | 10 | 90 |
| -0.79, 0.00, 0.49 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 9 | 22.5 |
| 0.72, 2.30, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 9 | 22.5 |
| 0.72, 0.00, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 8 | 22.5 |
| -0.77, 2.30, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.49 | 8 | 22.5 |
| -1.12, 2.53, 0.00 | bay.lod0/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| 0.95, 2.57, 0.00 | bay.lod0/stone_white + wall/wall | 0.43 | 8 | 63.9 |

(47 more in the JSON)

## opening (info, 4)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.7 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 98)

| at | parts | area |
|---|---|---|
| -1.03, 0.00, 0.02 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00103 |
| -1.04, 0.00, 0.04 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00359 |
| -0.78, 0.00, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| -0.72, 0.00, 0.57 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00192 |
| -0.74, 0.00, 0.59 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00332 |
| 0.79, 0.00, 0.54 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00471 |
| 0.79, 0.00, 0.59 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00077 |
| 1.05, 0.00, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00048 |
| -1.00, 2.30, 0.00 | bay.lod0/stone_white + wall/wall | 0.00042 |
| -1.05, 0.00, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00032 |
| -1.05, 2.30, 0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 0.0028 |
| -1.05, 2.30, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00048 |
| -0.78, 0.00, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00061 |
| -0.71, 0.00, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00013 |
| -0.78, 2.30, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| -0.79, 2.30, 0.54 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00471 |
| -0.68, 0.18, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00133 |
| -0.68, 1.06, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.01854 |
| 0.68, 2.12, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00133 |
| 0.68, 1.24, 0.49 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.01854 |
| 0.78, 0.00, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| 0.71, 2.30, 0.55 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00013 |
| 0.78, 2.30, 0.52 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00061 |
| 0.72, 2.30, 0.57 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00192 |
| 0.78, 2.30, 0.51 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00043 |
| 1.04, 2.30, 0.00 | bay.lod0/stone_white + wall/wall | 0.00042 |
| 1.05, 0.00, 0.03 | bay.lod0/stone_white + bay.lod0/stone_white | 0.0028 |
| 1.03, 2.30, 0.02 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00103 |
| 1.05, 2.30, 0.00 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00032 |
| -0.89, 0.00, 0.05 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00061 |
| -0.79, 0.00, 0.25 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00322 |
| -0.90, 0.00, 0.03 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00011 |
| -0.86, 0.00, 0.10 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00059 |
| -0.70, 0.00, 0.42 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00035 |
| 0.79, 2.30, 0.25 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00322 |
| 0.70, 2.30, 0.42 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00035 |
| 0.89, 2.30, 0.05 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00061 |
| 0.90, 2.30, 0.03 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00011 |
| 0.86, 2.30, 0.10 | bay.lod0/stone_white + bay.lod0/wood_frame_white | 0.00059 |
| -1.05, 2.52, -0.04 | bay.lod0/stone_white + bay.lod0/stone_white | 0.00081 |

(58 more in the JSON)
