# Mesh audit: linkebeek.glb

2,844 triangles, 1,552 welded vertices, 176 open edges, 30,688 rays, 267 ms.

**0 blocking**, 682 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 112 |
| sliver | warn | 422 |
| nonmanifold | warn | 2 |
| degenerate | warn | 146 |
| seam | info | 130 |
| backtoback | info | 324 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 112)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -6.35, 8.16, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -6.33, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -6.37, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -6.35, 8.18, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -6.35, 8.18, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -6.37, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -6.33, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -6.35, 8.16, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -4.23, 8.16, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -4.21, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -4.26, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -4.24, 8.18, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -4.24, 8.18, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -4.26, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -4.21, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -4.23, 8.16, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -2.12, 8.16, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -2.10, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -2.14, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -2.12, 8.18, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -2.12, 8.18, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -2.14, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -2.10, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -2.12, 8.16, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, 8.16, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.02, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.02, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.00, 8.18, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.00, 8.18, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.02, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.02, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.00, 8.16, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 2.12, 8.16, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 2.14, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 2.10, 8.17, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 2.12, 8.18, -4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 2.12, 8.18, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 2.10, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 2.14, 8.17, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 2.12, 8.16, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 2 | 4.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

(72 more in the JSON)

## sliver (warn, 422)

| at | part | aspect | longest |
|---|---|---|---|
| -2.44, 4.38, -4.20 | linkebeek/brick_red_brussels | 40 | 8.953 |
| 6.01, 4.38, -4.20 | linkebeek/brick_red_brussels | 44 | 5.263 |
| -1.88, 5.57, -4.20 | linkebeek/brick_red_brussels | 41 | 8.963 |
| -1.75, 5.68, -4.20 | linkebeek/brick_red_brussels | 45 | 9.113 |
| -1.61, 5.78, -4.20 | linkebeek/brick_red_brussels | 50 | 9.287 |
| -1.46, 5.86, -4.20 | linkebeek/brick_red_brussels | 58 | 9.482 |
| -1.30, 5.92, -4.20 | linkebeek/brick_red_brussels | 69 | 9.694 |
| -1.14, 5.97, -4.20 | linkebeek/brick_red_brussels | 86 | 9.921 |
| -0.97, 6.00, -4.20 | linkebeek/brick_red_brussels | 112 | 10.159 |
| -0.80, 6.02, -4.20 | linkebeek/brick_red_brussels | 159 | 10.405 |
| 4.37, 6.02, -4.20 | linkebeek/brick_red_brussels | 46 | 5.289 |
| -2.44, 4.38, 4.20 | linkebeek/brick_red_brussels | 40 | 8.953 |
| 6.01, 4.38, 4.20 | linkebeek/brick_red_brussels | 44 | 5.263 |
| -1.88, 5.57, 4.20 | linkebeek/brick_red_brussels | 41 | 8.963 |
| -1.75, 5.68, 4.20 | linkebeek/brick_red_brussels | 45 | 9.113 |
| -1.61, 5.78, 4.20 | linkebeek/brick_red_brussels | 50 | 9.287 |
| -1.46, 5.86, 4.20 | linkebeek/brick_red_brussels | 58 | 9.482 |
| -1.30, 5.92, 4.20 | linkebeek/brick_red_brussels | 69 | 9.694 |
| -1.14, 5.97, 4.20 | linkebeek/brick_red_brussels | 86 | 9.921 |
| -0.97, 6.00, 4.20 | linkebeek/brick_red_brussels | 112 | 10.159 |
| -0.80, 6.02, 4.20 | linkebeek/brick_red_brussels | 159 | 10.405 |
| 4.37, 6.02, 4.20 | linkebeek/brick_red_brussels | 46 | 5.289 |
| -2.45, 0.44, -4.18 | linkebeek/stone_blue | 443 | 7.522 |
| -4.96, 0.45, -4.19 | linkebeek/stone_blue | 443 | 7.522 |
| -4.96, 0.44, -4.25 | linkebeek/stone_blue | 443 | 7.522 |
| -2.45, 0.45, -4.24 | linkebeek/stone_blue | 443 | 7.522 |
| 6.74, 0.44, -4.18 | linkebeek/stone_blue | 128 | 2.17 |
| 6.02, 0.45, -4.19 | linkebeek/stone_blue | 128 | 2.17 |
| 6.02, 0.44, -4.25 | linkebeek/stone_blue | 128 | 2.17 |
| 6.74, 0.45, -4.24 | linkebeek/stone_blue | 128 | 2.17 |
| -2.45, 0.44, 4.25 | linkebeek/stone_blue | 443 | 7.522 |
| -4.96, 0.45, 4.24 | linkebeek/stone_blue | 443 | 7.522 |
| -4.96, 0.44, 4.18 | linkebeek/stone_blue | 443 | 7.522 |
| -2.45, 0.45, 4.19 | linkebeek/stone_blue | 443 | 7.522 |
| 6.74, 0.44, 4.25 | linkebeek/stone_blue | 128 | 2.17 |
| 6.02, 0.45, 4.24 | linkebeek/stone_blue | 128 | 2.17 |
| 6.02, 0.44, 4.18 | linkebeek/stone_blue | 128 | 2.17 |
| 6.74, 0.45, 4.19 | linkebeek/stone_blue | 128 | 2.17 |
| -7.47, -0.54, -4.18 | linkebeek/stone_blue | 172 | 2.926 |
| 0.07, -0.54, -4.19 | linkebeek/stone_blue | 172 | 2.926 |

(382 more in the JSON)

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -0.28, 2.83, -4.19 | linkebeek/brick_red_brussels | 4 |
| -0.28, 2.83, 4.19 | linkebeek/brick_red_brussels | 4 |

## degenerate (warn, 146)

| at | part | edge |
|---|---|---|
| -0.28, 2.71, -4.19 | linkebeek/brick_red_brussels | 0.012 |
| 5.64, 2.71, -4.19 | linkebeek/brick_red_brussels | 0.012 |
| -0.28, 2.71, 4.19 | linkebeek/brick_red_brussels | 0.012 |
| 5.64, 2.71, 4.19 | linkebeek/brick_red_brussels | 0.012 |
| -0.28, 2.88, -4.19 | linkebeek/brick_red_brussels | 0.2462 |
| -0.28, 2.88, 4.19 | linkebeek/brick_red_brussels | 0.2462 |
| -0.25, 3.13, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.26, 3.04, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.20, 3.38, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.22, 3.30, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.13, 3.63, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.16, 3.55, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.04, 3.87, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| -0.07, 3.79, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.07, 4.10, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.03, 4.03, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.20, 4.33, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.16, 4.25, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.36, 4.53, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.30, 4.47, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.53, 4.73, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.47, 4.67, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.71, 4.91, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.65, 4.85, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.91, 5.07, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 0.84, 5.02, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.12, 5.22, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.05, 5.17, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.35, 5.34, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.27, 5.30, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.58, 5.45, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.50, 5.42, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.83, 5.53, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.75, 5.51, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 2.08, 5.60, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 1.99, 5.58, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 2.33, 5.64, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 2.25, 5.63, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 2.59, 5.66, -4.19 | linkebeek/brick_red_brussels | 0.2582 |
| 2.50, 5.65, -4.19 | linkebeek/brick_red_brussels | 0.2582 |

(106 more in the JSON)

## seam (info, 130)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.35, 2.71, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 37.11 | 448 | 65.2 |
| -0.35, 2.71, 4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 37.11 | 448 | 65.2 |
| -7.47, 6.71, -4.20 | linkebeek/brick_red_brussels + linkebeek/concrete | 29.97 | 86 | 90 |
| -7.46, 6.71, 4.20 | linkebeek/brick_red_brussels + linkebeek/concrete | 29.97 | 86 | 90 |
| -7.48, 6.73, -4.20 | linkebeek/brick_red_brussels + linkebeek/concrete | 16.45 | 80 | 90 |
| -7.47, 6.73, 4.20 | linkebeek/brick_red_brussels + linkebeek/concrete | 16.45 | 80 | 90 |
| -7.47, 6.73, -4.33 | linkebeek/concrete + linkebeek/concrete | 30.23 | 31 | 45 |
| -7.47, 6.73, 4.33 | linkebeek/concrete + linkebeek/concrete | 30.23 | 29 | 45 |
| -7.48, 7.47, 4.24 | linkebeek/concrete + linkebeek/concrete | 30.12 | 26 | 90 |
| -7.48, 7.48, -4.25 | linkebeek/concrete + linkebeek/concrete | 30.12 | 24 | 90 |
| -6.35, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -4.23, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -2.12, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 0.00, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 2.12, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 4.23, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 6.35, 8.15, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -6.35, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -4.23, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -2.12, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 0.00, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 2.12, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 4.23, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| 6.35, 8.15, 4.04 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.29 | 20 | 47.7 |
| -7.44, 8.62, -4.05 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| -7.44, 7.67, -4.05 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| -5.32, 8.62, -4.05 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| -5.32, 7.67, -4.05 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| -3.21, 8.62, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| -3.21, 7.67, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| -1.09, 8.62, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| -1.09, 7.67, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| 1.03, 8.62, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| 1.03, 7.67, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| 3.15, 8.62, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| 3.15, 7.67, -4.06 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| 5.26, 8.62, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| 5.26, 7.67, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |
| 7.38, 8.62, -4.08 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.4 | 16 | 90 |
| 7.38, 7.67, -4.07 | linkebeek/painted_metal_grey + linkebeek/painted_metal_grey | 0.32 | 16 | 90 |

(90 more in the JSON)

## backtoback (info, 324)

| at | parts | area |
|---|---|---|
| -0.28, 2.88, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00273 |
| -0.28, 2.82, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00219 |
| -0.28, 2.78, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00047 |
| -0.28, 2.73, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00101 |
| -0.25, 3.14, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| -0.26, 3.04, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| -0.26, 3.02, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| -0.27, 2.98, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| -0.20, 3.39, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| -0.22, 3.30, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| -0.22, 3.28, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| -0.23, 3.23, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| -0.13, 3.64, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| -0.16, 3.55, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| -0.16, 3.53, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| -0.18, 3.49, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| -0.04, 3.88, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| -0.07, 3.79, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| -0.09, 3.76, -4.22 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| -0.10, 3.73, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| 0.08, 4.11, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| 0.03, 4.03, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| 0.03, 4.01, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| 0.00, 3.97, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| 0.21, 4.33, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| 0.16, 4.25, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| 0.14, 4.22, -4.22 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| 0.12, 4.19, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| 0.36, 4.54, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| 0.30, 4.46, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| 0.29, 4.45, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| 0.26, 4.41, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| 0.53, 4.74, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| 0.47, 4.67, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| 0.44, 4.64, -4.22 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| 0.42, 4.62, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |
| 0.72, 4.91, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00286 |
| 0.65, 4.85, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00229 |
| 0.63, 4.84, -4.21 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00049 |
| 0.60, 4.81, -4.20 | linkebeek/brick_red_brussels + linkebeek/brick_red_brussels | 0.00106 |

(284 more in the JSON)


Nodes: linkebeek. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
