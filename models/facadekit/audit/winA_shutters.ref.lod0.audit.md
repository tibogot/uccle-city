# Kit audit: winA_shutters.ref LOD0

4,258 triangles, 2,364 welded vertices, 129 open edges, 17,530 rays, 371 ms.

**0 blocking**, 1045 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1028 |
| nonmanifold | warn | 13 |
| tjunction | warn | 4 |
| seam | info | 256 |
| opening | info | 11 |
| backtoback | info | 248 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1028)

| at | part | aspect | longest |
|---|---|---|---|
| -0.60, 0.53, 0.01 | winA.lod0/stone_white | 53 | 1.604 |
| -0.60, 0.53, 0.03 | winA.lod0/stone_white | 343 | 1.604 |
| -0.60, 0.53, 0.04 | winA.lod0/stone_white | 343 | 1.605 |
| -0.60, 0.53, 0.04 | winA.lod0/stone_white | 343 | 1.608 |
| -0.61, 0.53, 0.04 | winA.lod0/stone_white | 344 | 1.611 |
| -0.61, 0.54, 0.04 | winA.lod0/stone_white | 404 | 1.616 |
| -0.66, 0.55, 0.04 | winA.lod0/stone_white | 186 | 1.664 |
| -0.71, 0.57, 0.05 | winA.lod0/stone_white | 292 | 1.714 |
| -0.72, 0.57, 0.05 | winA.lod0/stone_white | 250 | 1.72 |
| -0.72, 0.57, 0.06 | winA.lod0/stone_white | 194 | 1.726 |
| -0.73, 0.57, 0.06 | winA.lod0/stone_white | 195 | 1.732 |
| -0.73, 0.57, 0.07 | winA.lod0/stone_white | 252 | 1.737 |
| -0.74, 0.58, 0.07 | winA.lod0/stone_white | 297 | 1.743 |
| -0.75, 0.58, 0.07 | winA.lod0/stone_white | 135 | 1.749 |
| -0.76, 0.58, 0.07 | winA.lod0/stone_white | 249 | 1.762 |
| -0.20, 1.60, 0.01 | winA.lod0/stone_white | 40 | 1.2 |
| -0.20, 1.60, 0.03 | winA.lod0/stone_white | 257 | 1.201 |
| -0.20, 1.60, 0.04 | winA.lod0/stone_white | 258 | 1.204 |
| -0.20, 1.60, 0.04 | winA.lod0/stone_white | 259 | 1.211 |
| -0.20, 1.61, 0.04 | winA.lod0/stone_white | 261 | 1.219 |
| -0.20, 1.61, 0.04 | winA.lod0/stone_white | 308 | 1.228 |
| -0.22, 1.66, 0.04 | winA.lod0/stone_white | 148 | 1.324 |
| -0.24, 1.71, 0.05 | winA.lod0/stone_white | 244 | 1.426 |
| -0.24, 1.72, 0.05 | winA.lod0/stone_white | 209 | 1.443 |
| -0.24, 1.72, 0.06 | winA.lod0/stone_white | 164 | 1.449 |
| -0.24, 1.73, 0.07 | winA.lod0/stone_white | 165 | 1.467 |
| -0.25, 1.74, 0.07 | winA.lod0/stone_white | 215 | 1.473 |
| -0.25, 1.74, 0.07 | winA.lod0/stone_white | 254 | 1.484 |
| -0.25, 1.75, 0.07 | winA.lod0/stone_white | 117 | 1.503 |
| -0.25, 1.76, 0.07 | winA.lod0/stone_white | 216 | 1.521 |
| 0.60, 1.06, 0.01 | winA.lod0/stone_white | 53 | 1.604 |
| 0.60, 1.07, 0.03 | winA.lod0/stone_white | 343 | 1.605 |
| 0.60, 1.07, 0.04 | winA.lod0/stone_white | 343 | 1.608 |
| 0.61, 1.07, 0.04 | winA.lod0/stone_white | 344 | 1.611 |
| 0.61, 1.07, 0.04 | winA.lod0/stone_white | 345 | 1.616 |
| 0.61, 1.07, 0.04 | winA.lod0/stone_white | 405 | 1.62 |
| 0.66, 1.11, 0.05 | winA.lod0/stone_white | 186 | 1.668 |
| 0.71, 1.14, 0.05 | winA.lod0/stone_white | 293 | 1.72 |
| 0.72, 1.14, 0.05 | winA.lod0/stone_white | 250 | 1.726 |
| 0.73, 1.15, 0.06 | winA.lod0/stone_white | 195 | 1.731 |

(988 more in the JSON)

## nonmanifold (warn, 13)

| at | part | uses |
|---|---|---|
| 0.00, 1.60, 0.00 | winA.lod0/stone_white | 3 |
| 0.00, 1.05, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.56, -0.15 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.56, -0.11 | winA.lod0/wood_frame_white | 3 |
| -1.30, 1.60, 0.01 | shutter.lod0/wood_frame_white | 4 |
| -0.84, 0.01, 0.01 | shutter.lod0/wood_frame_white | 4 |
| -0.84, 1.60, 0.01 | shutter.lod0/wood_frame_white | 4 |
| -1.30, 0.01, 0.01 | shutter.lod0/wood_frame_white | 4 |
| 0.84, 1.60, 0.01 | shutter.lod0/wood_frame_white | 4 |
| 1.30, 0.01, 0.01 | shutter.lod0/wood_frame_white | 4 |
| 1.30, 1.60, 0.01 | shutter.lod0/wood_frame_white | 4 |
| 0.84, 0.01, 0.01 | shutter.lod0/wood_frame_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.60, -0.00, 0.00 | wall/wall | 5.2 |
| 0.60, -0.00, 0.00 | wall/wall | 1.2 |
| -0.60, -0.00, 0.00 | wall/wall | 1.2 |
| 0.60, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 256)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.08, 1.60, 0.01 | winA.lod0/stone_white + winA.lod0/stone_white | 0.76 | 88 | 84.6 |
| -0.60, 0.00, -0.01 | winA.lod0/stone_white + sill.lod0/stone_blue | 0.68 | 65 | 7.1 |
| 0.02, 0.08, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.08 | 30 | 42.4 |
| -0.02, 0.08, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.08 | 28 | 42.4 |
| -0.05, 1.60, 0.09 | winA.lod0/stone_white + winA.lod0/stone_white | 0.8 | 26 | 67.4 |
| 0.53, 1.06, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 26 | 44.7 |
| -0.21, 1.53, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| 0.19, 1.53, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| -0.21, 1.13, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| 0.19, 1.13, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.1 | 26 | 27.6 |
| -0.48, 0.58, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.6 |
| -0.05, 0.57, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.6 |
| 0.05, 0.58, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.6 |
| 0.48, 0.57, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.6 |
| -0.53, 1.06, -0.10 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 24 | 44.7 |
| -0.00, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 1.98 | 24 | 22.5 |
| 0.01, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 1.98 | 24 | 22.5 |
| 0.53, 1.59, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 22 | 44.7 |
| -0.53, 0.01, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.53, 1.60, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| 0.53, 0.00, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.48, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.48, 1.05, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 44.7 |
| -0.05, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.05, 1.05, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 44.7 |
| 0.05, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.05, 1.05, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 44.7 |
| 0.48, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.48, 1.05, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 44.7 |
| 0.10, 1.89, 0.00 | winA.lod0/stone_white + wall/wall | 0.79 | 14 | 90 |
| 0.19, 1.13, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 22.5 |
| -0.19, 1.13, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 22.5 |
| 0.21, 1.13, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 22.5 |
| 1.31, 0.01, 0.00 | shutter.lod0/wood_frame_white + wall/wall | 3.29 | 14 | 90 |
| 0.85, 0.01, 0.00 | shutter.lod0/wood_frame_white + wall/wall | 1.09 | 14 | 90 |
| -0.21, 1.13, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 13 | 22.5 |
| -0.21, 1.13, -0.14 | winA.lod0/wood_frame_white + winA.lod0/glass_window | 0.41 | 12 | 90 |
| 0.21, 1.53, -0.14 | winA.lod0/wood_frame_white + winA.lod0/glass_window | 0.41 | 12 | 90 |
| -1.36, 0.01, 0.00 | shutter.lod0/wood_frame_white + wall/wall | 3.29 | 12 | 90 |
| -0.84, 0.01, 0.00 | shutter.lod0/wood_frame_white + wall/wall | 3.29 | 12 | 90 |

(216 more in the JSON)

## opening (info, 11)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.60, 1.55, -0.20 | winA.lod0/stone_white | 1 + 0 + 0 | 1.604 |
| -0.55, 1.60, -0.20 | winA.lod0/stone_white | 0 + -1 + 0 | 1.2 |
| 0.60, 0.05, -0.20 | winA.lod0/stone_white | -1 + 0 + 0 | 1.604 |
| -0.55, -0.00, -0.20 | winA.lod0/stone_white | 0 + 1 + 0.04 | 1.2 |
| -0.75, 0.00, -0.03 | sill.lod0/stone_blue | 0 + 1 + 0.02 | 1.6 |
| -0.80, -0.05, -0.03 | sill.lod0/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.80, -0.05, -0.03 | sill.lod0/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| 0.60, 1.85, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |
| -0.55, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 1.2 |
| 0.65, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.4 |

## backtoback (info, 248)

| at | parts | area |
|---|---|---|
| -0.60, 0.61, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.03971 |
| -0.60, 0.67, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01608 |
| 0.60, 0.26, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00232 |
| 0.60, 0.30, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02585 |
| -0.57, 1.60, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.10, 1.60, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02681 |
| -0.56, 1.60, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.07, 1.60, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.0114 |
| -0.60, 1.34, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00237 |
| -0.60, 1.30, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.026 |
| 0.60, 0.99, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.03977 |
| 0.60, 0.93, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01624 |
| 0.39, 1.60, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00107 |
| 0.34, 1.60, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01647 |
| 0.56, 1.60, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| 0.57, 1.60, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.53, 0.63, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00687 |
| -0.53, 0.92, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00558 |
| -0.53, 1.40, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0024 |
| -0.53, 1.26, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0024 |
| 0.53, 0.71, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.01429 |
| 0.53, 0.26, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.01309 |
| 0.11, 1.53, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00133 |
| 0.42, 1.53, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00187 |
| 0.37, 1.53, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00192 |
| -0.50, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.51, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.19, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00744 |
| -0.38, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00658 |
| -0.02, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00066 |
| -0.04, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00026 |
| 0.03, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0006 |
| 0.21, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00204 |
| 0.01, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0002 |
| 0.10, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00108 |
| -0.21, 1.05, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00204 |
| -0.10, 1.05, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00108 |
| -0.03, 1.05, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0006 |
| -0.01, 1.05, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.0002 |
| 0.02, 1.05, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00066 |

(208 more in the JSON)
