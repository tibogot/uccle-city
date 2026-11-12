# Kit audit: bay.ref LOD1

488 triangles, 302 welded vertices, 64 open edges, 13,960 rays, 28 ms.

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
| 0.00, 2.52, 0.65 | bay.lod1/stone_white | 4 |
| 0.97, 2.52, 0.34 | bay.lod1/stone_white | 4 |
| 1.12, 2.52, -0.01 | bay.lod1/stone_white | 4 |
| -1.12, 2.52, -0.01 | bay.lod1/stone_white | 4 |
| -0.97, 2.52, 0.34 | bay.lod1/stone_white | 4 |
| -0.89, 2.30, 0.08 | bay.lod1/wood_frame_white | 4 |
| -0.89, 0.00, 0.08 | bay.lod1/wood_frame_white | 4 |
| -0.73, 0.00, 0.40 | bay.lod1/wood_frame_white | 4 |
| -0.73, 2.30, 0.40 | bay.lod1/wood_frame_white | 4 |
| -0.62, 2.30, 0.47 | bay.lod1/wood_frame_white | 4 |
| -0.62, 0.00, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.62, 0.00, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.62, 2.30, 0.47 | bay.lod1/wood_frame_white | 4 |
| 0.73, 2.30, 0.40 | bay.lod1/wood_frame_white | 4 |
| 0.89, 0.00, 0.08 | bay.lod1/wood_frame_white | 4 |
| 0.89, 2.30, 0.08 | bay.lod1/wood_frame_white | 4 |
| 0.73, 0.00, 0.40 | bay.lod1/wood_frame_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.60, 0.00, 0.00 | bay.lod1/stone_white | 1.84 |
| -0.60, 2.30, 0.00 | bay.lod1/stone_white | 1.84 |
| -0.60, 0.00, 0.00 | wall/wall | 5.2 |
| 0.60, 0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 83)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.02, 2.52, -0.03 | bay.lod1/stone_white + bay.lod1/stone_white | 2.81 | 10 | 90 |
| -0.79, 0.00, 0.48 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 9 | 90 |
| 0.71, 2.30, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 9 | 90 |
| -1.09, 0.00, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| 0.71, 0.00, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 8 | 90 |
| 1.09, 0.00, 0.07 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -1.01, 2.30, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -0.77, 2.30, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.53 | 8 | 90 |
| -0.68, 1.31, 0.50 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 4.68 | 8 | 90 |
| 0.68, 0.00, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 4.68 | 8 | 90 |
| 1.01, 2.30, 0.02 | bay.lod1/stone_white + bay.lod1/stone_white | 0.32 | 8 | 90 |
| -1.12, 2.53, 0.00 | bay.lod1/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| 0.95, 2.57, 0.00 | bay.lod1/stone_white + wall/wall | 0.43 | 8 | 63.9 |
| -0.86, 1.78, 0.07 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| -0.71, 1.73, 0.39 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| -0.62, 1.78, 0.44 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| 0.62, 1.73, 0.45 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| 0.71, 1.78, 0.39 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| 0.87, 1.73, 0.07 | bay.lod1/wood_frame_white + bay.lod1/wood_frame_white | 0.54 | 8 | 90 |
| -1.12, 2.34, 0.00 | bay.lod1/stone_white + wall/wall | 0.86 | 6 | 63.9 |
| 1.07, 2.30, 0.00 | bay.lod1/stone_white + wall/wall | 0.86 | 6 | 63.9 |
| -0.85, 1.83, 0.16 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 6 | 90 |
| -0.62, 2.24, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 1.25 | 6 | 90 |
| -0.62, 1.73, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 1.25 | 6 | 90 |
| -0.31, 1.83, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 1.25 | 6 | 90 |
| 0.77, 1.83, 0.32 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 6 | 90 |
| -0.68, 0.00, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.08 | 5 | 90 |
| 0.68, 2.30, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.08 | 5 | 90 |
| -1.09, 1.15, 0.00 | bay.lod1/stone_white + wall/wall | 4.88 | 4 | 90 |
| 0.95, 1.15, 0.00 | bay.lod1/stone_white + wall/wall | 4.88 | 4 | 90 |
| -0.89, 2.24, 0.08 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| -0.85, 0.06, 0.16 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| -0.89, 1.73, 0.08 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 4 | 90 |
| -0.31, 0.06, 0.47 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 1.25 | 4 | 90 |
| 0.73, 2.24, 0.40 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| 0.77, 0.06, 0.32 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.36 | 4 | 90 |
| 0.73, 1.73, 0.40 | bay.lod1/wood_frame_white + bay.lod1/glass_window | 0.37 | 4 | 90 |
| -0.90, 0.00, 0.02 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.1 | 3 | 90 |
| -0.87, 0.00, 0.07 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.38 | 3 | 90 |
| -0.71, 0.00, 0.39 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.09 | 3 | 90 |

(43 more in the JSON)

## opening (info, 4)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 2.35, 0.00 | wall/wall | 0 + 0 + 1 | 1.7 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 158)

| at | parts | area |
|---|---|---|
| -1.03, 0.00, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00123 |
| -1.05, 0.00, 0.05 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00429 |
| -0.78, 0.00, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| -0.70, 0.00, 0.57 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00229 |
| -0.74, 0.00, 0.58 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00398 |
| 0.79, 0.00, 0.54 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00563 |
| 0.79, 0.00, 0.60 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00092 |
| 1.07, 0.00, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00057 |
| -1.06, 2.30, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00334 |
| -1.05, 2.30, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00057 |
| -1.06, 0.00, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00039 |
| -1.04, 1.53, 0.00 | bay.lod1/stone_white + wall/wall | 0.161 |
| -0.78, 2.30, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| -0.79, 2.30, 0.54 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00563 |
| -0.68, 0.25, 0.48 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00537 |
| -0.68, 1.19, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.03735 |
| -0.78, 0.00, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00073 |
| -0.70, 0.00, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00016 |
| 0.68, 2.05, 0.48 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00537 |
| 0.68, 1.11, 0.49 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.03735 |
| 0.70, 2.30, 0.55 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00016 |
| 0.78, 2.30, 0.52 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00073 |
| 0.71, 2.30, 0.57 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00229 |
| 0.78, 2.30, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| 0.78, 0.00, 0.50 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00052 |
| 1.03, 2.30, 0.01 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00123 |
| 1.06, 2.30, 0.00 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00039 |
| 1.06, 0.00, 0.04 | bay.lod1/stone_white + bay.lod1/stone_white | 0.00334 |
| 1.00, 1.53, 0.00 | bay.lod1/stone_white + wall/wall | 0.161 |
| -0.88, 0.00, 0.05 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00097 |
| -0.78, 0.00, 0.25 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00469 |
| -0.90, 0.00, 0.03 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00019 |
| -0.86, 0.00, 0.10 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00095 |
| -0.71, 0.00, 0.39 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00009 |
| -0.70, 0.00, 0.42 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00067 |
| -0.67, 0.00, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00007 |
| 0.78, 2.30, 0.25 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00469 |
| 0.67, 2.30, 0.44 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00007 |
| 0.70, 2.30, 0.42 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00067 |
| 0.71, 2.30, 0.39 | bay.lod1/stone_white + bay.lod1/wood_frame_white | 0.00009 |

(118 more in the JSON)
