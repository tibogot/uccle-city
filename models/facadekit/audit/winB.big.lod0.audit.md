# Kit audit: winB.big LOD0

4,879 triangles, 2,678 welded vertices, 159 open edges, 17,012 rays, 172 ms.

**0 blocking**, 372 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 362 |
| nonmanifold | warn | 4 |
| tjunction | warn | 6 |
| seam | info | 133 |
| opening | info | 44 |
| backtoback | info | 331 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 362)

| at | part | aspect | longest |
|---|---|---|---|
| -0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| -0.71, 1.75, 0.01 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| -0.71, 1.74, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.71, 1.75, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.71, 1.75, 0.00 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| 0.71, 1.74, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.71, 1.66, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.71, 1.66, 0.01 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| 0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| -0.71, 1.75, 0.00 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| -0.71, 1.74, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.71, 1.66, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| -0.71, 1.66, 0.01 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| -0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.71, 1.66, 0.00 | winB.lod0/brick_red_brussels | 109 | 0.251 |
| 0.71, 1.75, 0.01 | winB.lod0/brick_red_brussels | 113 | 0.26 |
| 0.71, 1.74, 0.01 | winB.lod0/brick_red_brussels | 111 | 0.255 |
| 0.71, 1.75, 0.00 | winB.lod0/brick_red_brussels | 130 | 0.26 |
| 0.18, 0.07, -0.17 | winB.lod0/wood_frame_white | 275 | 1.054 |
| 0.18, 0.07, -0.17 | winB.lod0/wood_frame_white | 275 | 1.054 |
| -0.18, 0.07, -0.11 | winB.lod0/wood_frame_white | 275 | 1.054 |
| -0.18, 0.07, -0.11 | winB.lod0/wood_frame_white | 275 | 1.054 |
| -0.18, 0.00, -0.17 | winB.lod0/wood_frame_white | 275 | 1.054 |
| -0.18, 0.00, -0.17 | winB.lod0/wood_frame_white | 275 | 1.054 |
| 0.18, 0.00, -0.11 | winB.lod0/wood_frame_white | 275 | 1.054 |
| 0.18, 0.00, -0.11 | winB.lod0/wood_frame_white | 275 | 1.054 |
| 0.18, 1.16, -0.17 | winB.lod0/wood_frame_white | 266 | 1.054 |
| 0.18, 1.16, -0.17 | winB.lod0/wood_frame_white | 274 | 1.054 |
| -0.18, 1.16, -0.11 | winB.lod0/wood_frame_white | 266 | 1.054 |
| -0.18, 1.16, -0.11 | winB.lod0/wood_frame_white | 274 | 1.054 |
| -0.18, 1.09, -0.17 | winB.lod0/wood_frame_white | 266 | 1.054 |
| -0.18, 1.09, -0.17 | winB.lod0/wood_frame_white | 274 | 1.054 |
| 0.18, 1.09, -0.11 | winB.lod0/wood_frame_white | 266 | 1.054 |
| 0.18, 1.09, -0.11 | winB.lod0/wood_frame_white | 274 | 1.054 |
| -0.53, 0.53, -0.12 | winB.lod0/wood_frame_white | 141 | 1.594 |
| -0.59, 0.55, -0.11 | winB.lod0/wood_frame_white | 144 | 1.635 |
| 0.54, 1.06, -0.11 | winB.lod0/wood_frame_white | 141 | 1.599 |
| 0.60, 1.09, -0.12 | winB.lod0/wood_frame_white | 145 | 1.64 |

(322 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.00, 1.08, -0.14 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.14 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.58, -0.16 | winB.lod0/wood_frame_white | 3 |
| 0.00, 0.58, -0.12 | winB.lod0/wood_frame_white | 3 |

## tjunction (warn, 6)

| at | part | edge_m |
|---|---|---|
| 0.60, 0.00, 0.00 | winB.lod0/brick_red_brussels | 1.644 |
| -0.60, 0.00, 0.00 | winB.lod0/brick_red_brussels | 1.644 |
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 133)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.60, 0.00, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 4.61 | 62 | 45 |
| -0.53, 0.00, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.49 | 48 | 27.6 |
| -0.53, 1.09, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.52 | 48 | 27 |
| -0.52, 1.60, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.76 | 44 | 90 |
| 0.02, 0.08, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.08 | 30 | 42.4 |
| -0.20, 1.68, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.11 | 28 | 51.9 |
| 0.19, 1.69, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.11 | 28 | 51.9 |
| -0.02, 0.08, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.08 | 28 | 42.4 |
| -0.21, 1.16, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.1 | 26 | 28.5 |
| 0.19, 1.16, -0.15 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.1 | 26 | 28.5 |
| -0.00, 0.07, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 2.04 | 25 | 22.5 |
| -0.50, -0.01, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 1.2 | 24 | 87.9 |
| 0.01, 0.07, -0.12 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 2.04 | 24 | 22.5 |
| -0.48, 0.07, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 21 | 44.7 |
| -0.48, 1.08, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| -0.05, 0.07, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.05, 1.08, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| 0.05, 0.07, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.05, 1.08, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| 0.48, 0.07, -0.16 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.48, 1.08, -0.17 | winB.lod0/wood_frame_white + winB.lod0/wood_frame_white | 0.18 | 20 | 43.4 |
| -0.21, 1.17, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.04 | 16 | 90 |
| 0.19, 1.17, -0.14 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 1.04 | 15 | 90 |
| -0.51, 1.68, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 10 | 45 |
| -0.48, 1.03, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.43 | 10 | 90 |
| -0.48, 0.15, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.43 | 10 | 90 |
| 0.05, 1.03, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.43 | 10 | 90 |
| 0.05, 0.15, -0.15 | winB.lod0/wood_frame_white + winB.lod0/glass_window | 0.43 | 10 | 90 |
| -0.51, 1.86, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| -0.36, 1.73, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| -0.31, 1.74, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| -0.22, 1.76, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| -0.10, 1.77, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| -0.03, 1.88, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.05, 1.88, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.20, 1.76, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.28, 1.85, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.36, 1.84, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.43, 1.82, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.54 | 8 | 45 |
| 0.49, 1.73, 0.00 | winB.lod0/brick_red_brussels + wall/wall | 0.53 | 8 | 45 |

(93 more in the JSON)

## opening (info, 44)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.59, -0.22 | winB.lod0/brick_red_brussels | 1 + 0 + 0 | 1.644 |
| -0.55, 1.66, -0.22 | winB.lod0/brick_red_brussels | 0.38 + -0.93 + 0 | 0.108 |
| -0.45, 1.70, -0.22 | winB.lod0/brick_red_brussels | 0.31 + -0.95 + 0 | 0.105 |
| -0.35, 1.73, -0.22 | winB.lod0/brick_red_brussels | 0.24 + -0.97 + 0 | 0.103 |
| -0.25, 1.75, -0.22 | winB.lod0/brick_red_brussels | 0.17 + -0.98 + 0 | 0.102 |
| -0.15, 1.76, -0.22 | winB.lod0/brick_red_brussels | 0.1 + -0.99 + 0 | 0.101 |
| -0.05, 1.77, -0.22 | winB.lod0/brick_red_brussels | 0.03 + -1 + 0 | 0.1 |
| 0.05, 1.77, -0.22 | winB.lod0/brick_red_brussels | -0.03 + -1 + 0 | 0.1 |
| 0.15, 1.76, -0.22 | winB.lod0/brick_red_brussels | -0.1 + -0.99 + 0 | 0.101 |
| 0.25, 1.75, -0.22 | winB.lod0/brick_red_brussels | -0.17 + -0.98 + 0 | 0.102 |
| 0.35, 1.73, -0.22 | winB.lod0/brick_red_brussels | -0.24 + -0.97 + 0 | 0.103 |
| 0.45, 1.70, -0.22 | winB.lod0/brick_red_brussels | -0.31 + -0.95 + 0 | 0.105 |
| 0.55, 1.66, -0.22 | winB.lod0/brick_red_brussels | -0.38 + -0.93 + 0 | 0.108 |
| -0.60, -0.01, -0.17 | winB.lod0/brick_red_brussels | 0 + 1 + 0.04 | 0.22 |
| 0.60, 0.05, -0.22 | winB.lod0/brick_red_brussels | -1 + 0 + 0 | 1.644 |
| 0.60, -0.01, -0.17 | winB.lod0/brick_red_brussels | 0 + 1 + 0.04 | 0.22 |
| -0.60, 0.05, -0.17 | winB.lod0/wood_frame_white | -1 + 0 + 0 | 1.64 |
| -0.34, 1.73, -0.17 | winB.lod0/wood_frame_white | -0.24 + 0.97 + 0 | 0.077 |
| -0.27, 1.74, -0.17 | winB.lod0/wood_frame_white | -0.19 + 0.98 + 0 | 0.077 |
| -0.12, 1.76, -0.17 | winB.lod0/wood_frame_white | -0.08 + 1 + 0 | 0.077 |
| -0.04, 1.77, -0.17 | winB.lod0/wood_frame_white | -0.03 + 1 + 0 | 0.077 |
| 0.04, 1.77, -0.17 | winB.lod0/wood_frame_white | 0.03 + 1 + 0 | 0.077 |
| 0.12, 1.76, -0.17 | winB.lod0/wood_frame_white | 0.08 + 1 + 0 | 0.077 |
| 0.27, 1.74, -0.17 | winB.lod0/wood_frame_white | 0.19 + 0.98 + 0 | 0.077 |
| 0.34, 1.73, -0.17 | winB.lod0/wood_frame_white | 0.24 + 0.97 + 0 | 0.077 |
| 0.60, 1.59, -0.17 | winB.lod0/wood_frame_white | 1 + 0 + 0 | 1.64 |
| -0.75, 0.00, -0.03 | sill.lod0/stone_blue | 0 + 1 + 0.02 | 1.6 |
| -0.80, -0.05, -0.03 | sill.lod0/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod0/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.45, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| -0.05, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.05, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.15, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.25, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |
| 0.35, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.1 |

(4 more in the JSON)

## backtoback (info, 331)

| at | parts | area |
|---|---|---|
| -0.60, 0.48, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.03873 |
| -0.60, 0.78, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.02345 |
| 0.60, 0.45, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00793 |
| 0.60, 0.23, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.02315 |
| -0.57, 1.65, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0021 |
| -0.53, 1.67, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00006 |
| -0.55, 1.66, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00192 |
| -0.48, 1.69, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0008 |
| -0.48, 1.69, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00185 |
| -0.45, 1.70, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00097 |
| -0.43, 1.70, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00038 |
| -0.39, 1.72, -0.12 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00013 |
| -0.36, 1.72, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00175 |
| -0.39, 1.72, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00093 |
| -0.35, 1.73, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0011 |
| -0.27, 1.74, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00175 |
| -0.26, 1.75, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00198 |
| -0.23, 1.75, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00009 |
| -0.18, 1.76, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00078 |
| -0.15, 1.76, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00088 |
| -0.18, 1.76, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00184 |
| -0.14, 1.76, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00032 |
| -0.09, 1.77, -0.12 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00019 |
| -0.06, 1.77, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00161 |
| -0.09, 1.77, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00111 |
| -0.04, 1.77, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00089 |
| 0.03, 1.77, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00205 |
| 0.05, 1.77, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00174 |
| 0.13, 1.76, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0011 |
| 0.16, 1.76, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00053 |
| 0.13, 1.76, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00201 |
| 0.17, 1.76, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00018 |
| 0.21, 1.75, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00036 |
| 0.25, 1.75, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.0014 |
| 0.21, 1.75, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00142 |
| 0.26, 1.75, -0.17 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00067 |
| 0.33, 1.73, -0.14 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00197 |
| 0.30, 1.74, -0.15 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00039 |
| 0.35, 1.73, -0.16 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00154 |
| 0.43, 1.71, -0.13 | winB.lod0/brick_red_brussels + winB.lod0/wood_frame_white | 0.00127 |

(291 more in the JSON)
