# Kit audit: winA_shutters.small LOD0

4,578 triangles, 2,508 welded vertices, 129 open edges, 16,422 rays, 177 ms.

**0 blocking**, 1095 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1078 |
| nonmanifold | warn | 13 |
| tjunction | warn | 4 |
| seam | info | 256 |
| opening | info | 13 |
| backtoback | info | 168 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1078)

| at | part | aspect | longest |
|---|---|---|---|
| -0.47, 0.52, 0.01 | winA.lod0/stone_white | 52 | 1.569 |
| -0.47, 0.52, 0.03 | winA.lod0/stone_white | 335 | 1.569 |
| -0.47, 0.52, 0.04 | winA.lod0/stone_white | 335 | 1.57 |
| -0.47, 0.52, 0.04 | winA.lod0/stone_white | 336 | 1.572 |
| -0.48, 0.52, 0.04 | winA.lod0/stone_white | 337 | 1.576 |
| -0.48, 0.52, 0.04 | winA.lod0/stone_white | 395 | 1.581 |
| -0.53, 0.54, 0.04 | winA.lod0/stone_white | 182 | 1.629 |
| -0.58, 0.56, 0.05 | winA.lod0/stone_white | 286 | 1.679 |
| -0.59, 0.56, 0.05 | winA.lod0/stone_white | 245 | 1.685 |
| -0.59, 0.56, 0.06 | winA.lod0/stone_white | 190 | 1.69 |
| -0.60, 0.56, 0.06 | winA.lod0/stone_white | 191 | 1.696 |
| -0.60, 0.56, 0.07 | winA.lod0/stone_white | 247 | 1.702 |
| -0.61, 0.56, 0.07 | winA.lod0/stone_white | 291 | 1.708 |
| -0.62, 0.57, 0.07 | winA.lod0/stone_white | 132 | 1.714 |
| -0.63, 0.57, 0.07 | winA.lod0/stone_white | 244 | 1.727 |
| -0.16, 1.56, 0.03 | winA.lod0/stone_white | 200 | 0.937 |
| -0.16, 1.57, 0.04 | winA.lod0/stone_white | 201 | 0.94 |
| -0.16, 1.57, 0.04 | winA.lod0/stone_white | 203 | 0.947 |
| -0.16, 1.57, 0.04 | winA.lod0/stone_white | 205 | 0.955 |
| -0.16, 1.58, 0.04 | winA.lod0/stone_white | 242 | 0.964 |
| -0.18, 1.63, 0.04 | winA.lod0/stone_white | 119 | 1.06 |
| -0.20, 1.68, 0.05 | winA.lod0/stone_white | 199 | 1.162 |
| -0.20, 1.69, 0.05 | winA.lod0/stone_white | 171 | 1.179 |
| -0.20, 1.69, 0.06 | winA.lod0/stone_white | 134 | 1.185 |
| -0.20, 1.70, 0.07 | winA.lod0/stone_white | 135 | 1.203 |
| -0.20, 1.70, 0.07 | winA.lod0/stone_white | 176 | 1.209 |
| -0.20, 1.71, 0.07 | winA.lod0/stone_white | 209 | 1.22 |
| -0.21, 1.71, 0.07 | winA.lod0/stone_white | 96 | 1.239 |
| -0.21, 1.72, 0.07 | winA.lod0/stone_white | 178 | 1.257 |
| 0.47, 1.04, 0.01 | winA.lod0/stone_white | 52 | 1.569 |
| 0.47, 1.04, 0.03 | winA.lod0/stone_white | 335 | 1.57 |
| 0.47, 1.04, 0.04 | winA.lod0/stone_white | 336 | 1.572 |
| 0.47, 1.05, 0.04 | winA.lod0/stone_white | 337 | 1.576 |
| 0.48, 1.05, 0.04 | winA.lod0/stone_white | 338 | 1.581 |
| 0.48, 1.05, 0.04 | winA.lod0/stone_white | 396 | 1.585 |
| 0.53, 1.08, 0.05 | winA.lod0/stone_white | 183 | 1.633 |
| 0.58, 1.12, 0.05 | winA.lod0/stone_white | 287 | 1.685 |
| 0.59, 1.12, 0.05 | winA.lod0/stone_white | 245 | 1.69 |
| 0.59, 1.13, 0.06 | winA.lod0/stone_white | 191 | 1.696 |
| 0.60, 1.13, 0.07 | winA.lod0/stone_white | 192 | 1.702 |

(1038 more in the JSON)

## nonmanifold (warn, 13)

| at | part | uses |
|---|---|---|
| 0.00, 1.56, 0.00 | winA.lod0/stone_white | 3 |
| 0.00, 1.02, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.07, -0.13 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.55, -0.15 | winA.lod0/wood_frame_white | 3 |
| 0.00, 0.55, -0.11 | winA.lod0/wood_frame_white | 3 |
| -1.17, 1.56, 0.02 | shutter.lod0/wood_frame_white | 4 |
| -0.71, 0.01, 0.02 | shutter.lod0/wood_frame_white | 4 |
| -0.71, 1.56, 0.02 | shutter.lod0/wood_frame_white | 4 |
| -1.17, 0.01, 0.02 | shutter.lod0/wood_frame_white | 4 |
| 0.71, 1.56, 0.02 | shutter.lod0/wood_frame_white | 4 |
| 0.71, 0.01, 0.02 | shutter.lod0/wood_frame_white | 4 |
| 1.17, 0.01, 0.02 | shutter.lod0/wood_frame_white | 4 |
| 1.17, 1.56, 0.02 | shutter.lod0/wood_frame_white | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -0.47, -0.00, 0.00 | wall/wall | 5.2 |
| 0.47, -0.00, 0.00 | wall/wall | 1.2 |
| -0.47, -0.00, 0.00 | wall/wall | 1.2 |
| 0.47, -0.00, 0.00 | wall/wall | 5.2 |

## seam (info, 256)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 1.56, 0.01 | winA.lod0/stone_white + winA.lod0/stone_white | 0.71 | 88 | 86.7 |
| -0.47, 0.00, -0.01 | winA.lod0/stone_white + sill.lod0/stone_blue | 0.68 | 65 | 7.1 |
| 0.01, 0.08, -0.09 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.07 | 30 | 48.3 |
| -0.71, 0.75, 0.00 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.3 | 30 | 38.8 |
| 1.17, 0.75, 0.00 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.54 | 30 | 38.8 |
| -0.01, 0.08, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.07 | 28 | 48.3 |
| -0.03, 1.56, 0.09 | winA.lod0/stone_white + winA.lod0/stone_white | 0.7 | 26 | 67.4 |
| 0.40, 1.03, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 26 | 45 |
| -0.13, 1.50, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 33.3 |
| 0.12, 1.50, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 33.3 |
| -0.13, 1.10, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 32.3 |
| 0.12, 1.10, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 32.3 |
| -0.35, 0.57, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.9 |
| -0.03, 0.56, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 18.3 |
| 0.03, 0.57, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 18.3 |
| 0.35, 0.56, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.09 | 26 | 27.9 |
| -1.17, 0.75, 0.00 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.18 | 26 | 45 |
| 0.71, 0.75, 0.00 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.18 | 26 | 45 |
| -0.40, 1.03, -0.10 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 24 | 45 |
| -0.00, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 1.91 | 24 | 33.6 |
| 0.00, 0.07, -0.11 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 1.91 | 24 | 33.6 |
| 0.40, 1.56, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 22 | 44.7 |
| -0.40, 0.01, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.40, 1.56, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| 0.40, 0.00, -0.16 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.24 | 20 | 44.7 |
| -0.35, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| -0.35, 1.02, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 45 |
| -0.03, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 28.9 |
| -0.03, 1.02, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 28.9 |
| 0.03, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 28.9 |
| 0.03, 1.02, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 28.9 |
| 0.35, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.25 | 20 | 44.7 |
| 0.35, 1.02, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.18 | 20 | 45 |
| 0.06, 1.85, 0.00 | winA.lod0/stone_white + wall/wall | 0.71 | 14 | 90 |
| 0.12, 1.10, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 14.5 |
| -0.12, 1.10, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 14.5 |
| 0.13, 1.10, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 14 | 14.5 |
| -0.13, 1.10, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.42 | 13 | 14.5 |
| -1.17, 0.13, 0.01 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.12 | 12 | 67.5 |
| -1.17, 0.17, 0.01 | shutter.lod0/wood_frame_white + shutter.lod0/wood_frame_white | 0.12 | 12 | 67.5 |

(216 more in the JSON)

## opening (info, 13)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.47, 1.52, -0.20 | winA.lod0/stone_white | 1 + 0 + 0 | 1.569 |
| -0.42, 1.56, -0.20 | winA.lod0/stone_white | 0 + -1 + 0 | 0.936 |
| -0.47, -0.01, -0.15 | winA.lod0/stone_white | 0 + 1 + 0.04 | 0.2 |
| 0.47, 0.04, -0.20 | winA.lod0/stone_white | -1 + 0 + 0 | 1.569 |
| 0.47, -0.01, -0.15 | winA.lod0/stone_white | 0 + 1 + 0.04 | 0.2 |
| -0.63, 0.86, -0.00 | winA.lod0/stone_white | -1 + 0 + 0 | 1.732 |
| -0.62, 0.00, -0.03 | sill.lod0/stone_blue | 0 + 1 + 0.02 | 1.336 |
| -0.67, -0.05, -0.03 | sill.lod0/stone_blue | -1 + 0 + 0 | 0.102 |
| 0.67, -0.05, -0.03 | sill.lod0/stone_blue | 1 + 0 + 0 | 0.102 |
| -0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |
| 0.47, 1.82, 0.00 | wall/wall | 0 + 0 + 1 | 2.435 |
| -0.42, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 0.936 |
| 0.52, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 2.532 |

## backtoback (info, 168)

| at | parts | area |
|---|---|---|
| -0.47, 0.60, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.03883 |
| -0.47, 0.65, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01573 |
| 0.47, 0.25, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00226 |
| 0.47, 0.29, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02527 |
| -0.44, 1.56, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.07, 1.56, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.0202 |
| -0.42, 1.56, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.05, 1.56, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00874 |
| -0.47, 1.31, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00232 |
| -0.47, 1.27, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.02542 |
| 0.47, 0.97, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.03889 |
| 0.47, 0.91, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01588 |
| 0.30, 1.56, -0.15 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00068 |
| 0.26, 1.56, -0.13 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.01214 |
| 0.42, 1.56, -0.14 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| 0.44, 1.56, -0.12 | winA.lod0/stone_white + winA.lod0/wood_frame_white | 0.00154 |
| -0.40, 0.62, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00666 |
| -0.40, 0.90, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00538 |
| -0.40, 1.36, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00238 |
| -0.40, 1.23, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00238 |
| 0.40, 0.69, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.01392 |
| 0.40, 0.26, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.01273 |
| 0.07, 1.50, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00074 |
| 0.31, 1.50, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00156 |
| 0.24, 1.50, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00159 |
| -0.36, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.13, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00542 |
| -0.38, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.27, 0.07, -0.13 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00473 |
| -0.01, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00041 |
| -0.03, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00016 |
| 0.02, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00038 |
| 0.15, 0.07, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00162 |
| 0.01, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00013 |
| 0.07, 0.07, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.15, 1.03, -0.15 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00162 |
| -0.07, 1.03, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00084 |
| -0.02, 1.03, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00038 |
| -0.01, 1.03, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00013 |
| 0.01, 1.03, -0.14 | winA.lod0/wood_frame_white + winA.lod0/wood_frame_white | 0.00041 |

(128 more in the JSON)
