# Mesh audit (before pack): calevoet.lod0

8,412 triangles, 4,768 welded vertices, 1,528 open edges, 175,472 rays, 2099 ms.

**0 blocking**, 1664 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| sliver | warn | 1128 |
| nonmanifold | warn | 400 |
| tjunction | warn | 130 |
| degenerate | warn | 4 |
| seam | info | 462 |
| opening | info | 180 |
| backtoback | info | 461 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -1.95, 55.22, 10.77 | Underpass_lod0/painted_metal_grey + Underpass_lod0/painted_metal_grey | 2.4 | 0.8 | 0 | 70 | 0.53 | false | 0 + 0 + 1 |
| 22.50, 53.74, -8.48 | Underpass_lod0/painted_metal_grey + Underpass_lod0/painted_metal_grey | 2.4 | 0.7 | 0 | 70 | 0.53 | false | 0 + 0 + -1 |

## sliver (warn, 1128)

| at | part | aspect | longest |
|---|---|---|---|
| -3.63, 52.58, 0.79 | Underpass_lod0/brick_painted_white | 53 | 0.558 |
| -3.63, 52.40, 0.79 | Underpass_lod0/brick_painted_white | 53 | 0.558 |
| -3.54, 53.65, 1.65 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 2.16 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 3.48 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 3.99 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 5.31 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 5.82 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 7.14 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 7.65 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 8.97 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 53.65, 9.48 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.30, 52.40, 0.79 | Underpass_lod0/brick_painted_white | 53 | 0.558 |
| -0.30, 52.58, 0.79 | Underpass_lod0/brick_painted_white | 53 | 0.558 |
| -0.45, 53.65, 1.65 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 2.16 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 3.48 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 3.99 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 5.31 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 5.82 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 7.14 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 7.65 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 8.97 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -0.45, 53.65, 9.48 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| 21.03, 53.48, -6.69 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 21.03, 53.48, -7.19 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 21.03, 53.48, -4.87 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 21.03, 53.48, -5.37 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 21.03, 53.48, -3.05 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 21.03, 53.48, -3.55 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -6.69 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -7.19 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -4.87 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -5.37 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -3.05 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| 23.88, 53.48, -3.55 | Underpass_lod0/brick_painted_white | 201 | 1.505 |
| -3.54, 54.96, 2.16 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 54.97, 1.65 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 54.96, 3.99 | Underpass_lod0/brick_painted_white | 202 | 1.515 |
| -3.54, 54.97, 3.48 | Underpass_lod0/brick_painted_white | 202 | 1.515 |

(1088 more in the JSON)

## nonmanifold (warn, 400)

| at | part | uses |
|---|---|---|
| -3.54, 53.64, 1.90 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 53.64, 3.73 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 53.64, 5.56 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 53.64, 7.39 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 53.64, 9.22 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 53.64, 1.90 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 53.64, 3.73 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 53.64, 5.56 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 53.64, 7.39 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 53.64, 9.22 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 53.49, -6.94 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 53.49, -5.12 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 53.49, -3.30 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 53.49, -6.94 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 53.49, -5.12 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 53.49, -3.30 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 54.97, 1.90 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 54.97, 3.73 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 54.97, 5.56 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 54.97, 7.39 | Underpass_lod0/brick_painted_white | 3 |
| -3.54, 54.97, 9.22 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 54.97, 1.90 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 54.97, 3.73 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 54.97, 5.56 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 54.97, 7.39 | Underpass_lod0/brick_painted_white | 3 |
| -0.45, 54.97, 9.22 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 52.10, -6.94 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 52.10, -5.12 | Underpass_lod0/brick_painted_white | 3 |
| 21.03, 52.10, -3.30 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 52.10, -6.94 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 52.10, -5.12 | Underpass_lod0/brick_painted_white | 3 |
| 23.88, 52.10, -3.30 | Underpass_lod0/brick_painted_white | 3 |
| -3.53, 53.65, 2.67 | Underpass_lod0/painted_metal_grey | 3 |
| -3.53, 53.65, 2.67 | Underpass_lod0/painted_metal_grey | 3 |
| -3.48, 53.65, 2.67 | Underpass_lod0/painted_metal_grey | 3 |
| -3.48, 53.65, 2.67 | Underpass_lod0/painted_metal_grey | 3 |
| -3.48, 53.65, 1.14 | Underpass_lod0/painted_metal_grey | 3 |
| -3.48, 53.65, 1.14 | Underpass_lod0/painted_metal_grey | 3 |
| -3.53, 53.65, 1.14 | Underpass_lod0/painted_metal_grey | 3 |
| -3.53, 53.65, 1.14 | Underpass_lod0/painted_metal_grey | 3 |

(360 more in the JSON)

## tjunction (warn, 130)

| at | part | edge_m |
|---|---|---|
| -3.38, 52.27, 10.34 | Underpass_lod0/brick_painted_white | 2.988 |
| -3.63, 52.77, 10.34 | Underpass_lod0/brick_painted_white | 2.988 |
| -0.54, 52.27, 10.34 | Underpass_lod0/brick_painted_white | 2.988 |
| -0.29, 52.77, 10.34 | Underpass_lod0/brick_painted_white | 2.988 |
| 21.19, 50.91, -8.05 | Underpass_lod0/brick_painted_white | 3.013 |
| 20.94, 51.23, -8.05 | Underpass_lod0/brick_painted_white | 3.013 |
| 23.79, 50.91, -8.05 | Underpass_lod0/brick_painted_white | 3.013 |
| 24.04, 51.23, -8.05 | Underpass_lod0/brick_painted_white | 3.013 |
| -3.63, 53.60, 0.79 | Underpass_lod0/brick_painted_white | 2.422 |
| -0.29, 53.60, 0.79 | Underpass_lod0/brick_painted_white | 2.422 |
| -3.63, 53.60, 1.14 | Underpass_lod0/brick_painted_white | 9.551 |
| -3.63, 53.60, 1.12 | Underpass_lod0/brick_painted_white | 0.35 |
| -3.63, 53.60, 2.69 | Underpass_lod0/brick_painted_white | 0.3 |
| -3.63, 53.60, 4.52 | Underpass_lod0/brick_painted_white | 0.3 |
| -3.63, 53.60, 6.35 | Underpass_lod0/brick_painted_white | 0.3 |
| -3.63, 53.60, 8.18 | Underpass_lod0/brick_painted_white | 0.3 |
| -3.63, 53.60, 10.01 | Underpass_lod0/brick_painted_white | 0.35 |
| -0.29, 53.60, 1.14 | Underpass_lod0/brick_painted_white | 9.551 |
| -0.29, 53.60, 1.12 | Underpass_lod0/brick_painted_white | 0.35 |
| -0.29, 53.60, 2.69 | Underpass_lod0/brick_painted_white | 0.3 |
| -0.29, 53.60, 4.52 | Underpass_lod0/brick_painted_white | 0.3 |
| -0.29, 53.60, 6.35 | Underpass_lod0/brick_painted_white | 0.3 |
| -0.29, 53.60, 8.18 | Underpass_lod0/brick_painted_white | 0.3 |
| -0.29, 53.60, 10.01 | Underpass_lod0/brick_painted_white | 0.35 |
| 20.94, 52.06, -2.19 | Underpass_lod0/brick_painted_white | 2.483 |
| 24.04, 52.06, -2.19 | Underpass_lod0/brick_painted_white | 2.483 |
| 20.94, 52.06, -7.70 | Underpass_lod0/brick_painted_white | 5.859 |
| 20.94, 52.06, -7.72 | Underpass_lod0/brick_painted_white | 0.35 |
| 20.94, 52.06, -6.16 | Underpass_lod0/brick_painted_white | 0.3 |
| 20.94, 52.06, -4.34 | Underpass_lod0/brick_painted_white | 0.3 |
| 20.94, 52.06, -2.52 | Underpass_lod0/brick_painted_white | 0.35 |
| 24.04, 52.06, -7.70 | Underpass_lod0/brick_painted_white | 5.859 |
| 24.04, 52.06, -7.72 | Underpass_lod0/brick_painted_white | 0.35 |
| 24.04, 52.06, -6.16 | Underpass_lod0/brick_painted_white | 0.3 |
| 24.04, 52.06, -4.34 | Underpass_lod0/brick_painted_white | 0.3 |
| 24.04, 52.06, -2.52 | Underpass_lod0/brick_painted_white | 0.35 |
| -3.38, 55.20, 10.34 | Underpass_lod0/paint_fascia | 3.338 |
| 21.19, 53.72, -8.05 | Underpass_lod0/paint_fascia | 3.099 |
| -3.63, 55.20, 0.39 | Underpass_lod0/paint_fascia | 4.123 |
| -3.63, 55.20, 0.79 | Underpass_lod0/paint_fascia | 10.351 |

(90 more in the JSON)

## degenerate (warn, 4)

| at | part | edge |
|---|---|---|
| -3.63, 52.77, 0.79 | Underpass_lod0/brick_painted_white | 0.0106 |
| -0.29, 52.77, 0.79 | Underpass_lod0/brick_painted_white | 0.0106 |
| 20.94, 51.23, -2.20 | Underpass_lod0/brick_painted_white | 0.0106 |
| 24.03, 51.23, -2.19 | Underpass_lod0/brick_painted_white | 0.0106 |

## seam (info, 462)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 23.86, 50.88, -2.19 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 5.83 | 95 | 33.7 |
| -0.44, 52.38, 0.79 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 5.78 | 93 | 33.8 |
| -0.41, 55.16, 0.76 | Underpass_lod0/painted_metal_grey + Underpass_lod0/painted_metal_grey | 0.48 | 56 | 33.8 |
| 23.92, 53.65, -2.15 | Underpass_lod0/painted_metal_grey + Underpass_lod0/painted_metal_grey | 0.48 | 56 | 33.7 |
| -0.41, 55.20, 0.76 | Underpass_lod0/paint_fascia + Underpass_lod0/painted_metal_grey | 0.23 | 30 | 90 |
| 23.92, 53.72, -2.15 | Underpass_lod0/paint_fascia + Underpass_lod0/painted_metal_grey | 0.23 | 28 | 90 |
| 21.07, 52.12, -6.23 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| 21.07, 52.12, -4.41 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| 21.07, 52.12, -2.59 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| 23.90, 52.12, -6.23 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| 23.90, 52.12, -4.41 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| 23.90, 52.12, -2.59 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 5.66 | 24 | 90 |
| -3.53, 55.01, 1.15 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -3.53, 55.01, 2.98 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -3.53, 55.01, 4.80 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -3.53, 55.01, 6.64 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -3.53, 55.01, 8.47 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -0.43, 55.01, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -0.43, 55.01, 2.97 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -0.43, 55.01, 4.80 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -0.43, 55.01, 6.63 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| -0.43, 55.01, 8.46 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.58 | 22 | 35.3 |
| 23.90, 53.53, -7.70 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| 23.90, 53.53, -5.88 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| 23.90, 53.53, -4.06 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| 21.08, 53.53, -7.70 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| 21.08, 53.53, -5.88 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| 21.08, 53.53, -4.06 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 3.56 | 22 | 35.3 |
| -3.38, 52.27, 1.90 | Underpass_throat/brick_painted_white + Underpass_throat/concrete | 9.57 | 19 | 90 |
| -3.50, 54.95, 1.67 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 2.18 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 3.50 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 4.01 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 5.33 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 5.84 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 7.16 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 7.67 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 8.99 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -3.50, 54.95, 9.50 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |
| -0.43, 54.95, 1.67 | Underpass_lod0/painted_metal_grey + Underpass_throat/glass_frosted | 2.7 | 18 | 90 |

(422 more in the JSON)

## opening (info, 180)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.59, 52.21, 10.34 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 0.25 |
| -0.50, 52.21, 10.34 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 0.25 |
| 21.14, 50.71, -8.05 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 0.25 |
| 23.99, 50.71, -8.05 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 0.25 |
| -3.63, 52.21, 0.79 | Underpass_lod0/brick_painted_white | -0.71 + 0 + -0.71 | 0.011 |
| -0.30, 52.21, 0.79 | Underpass_lod0/brick_painted_white | 0.71 + 0 + -0.71 | 0.011 |
| 20.94, 50.71, -2.20 | Underpass_lod0/brick_painted_white | -0.71 + 0 + 0.71 | 0.011 |
| 24.03, 50.71, -2.20 | Underpass_lod0/brick_painted_white | 0.71 + 0 + 0.71 | 0.011 |
| -3.58, 52.21, 0.79 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 3.323 |
| -3.63, 52.21, 10.29 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 9.544 |
| -3.63, 52.83, 0.79 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 0.823 |
| -3.63, 52.82, 10.34 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 0.83 |
| -3.63, 53.65, 0.79 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 1.41 |
| -3.63, 55.15, 0.79 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 0.19 |
| -3.38, 54.95, 2.67 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -3.38, 54.95, 2.97 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -3.38, 54.95, 4.50 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -3.38, 54.95, 4.80 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -3.38, 54.95, 6.33 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -3.38, 54.95, 6.63 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -3.38, 54.95, 8.16 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -3.38, 54.95, 8.46 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -3.63, 55.15, 10.34 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 0.19 |
| -3.63, 53.65, 10.34 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 1.41 |
| -3.38, 54.95, 9.99 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.29, 52.26, 10.34 | Underpass_lod0/brick_painted_white | 1 + 0 + 0 | 0.558 |
| -0.29, 52.21, 10.29 | Underpass_lod0/brick_painted_white | 1 + 0 + 0 | 9.544 |
| -0.29, 52.82, 10.34 | Underpass_lod0/brick_painted_white | 1 + 0 + 0 | 0.83 |
| -0.54, 54.95, 2.67 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.54, 54.95, 2.97 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -0.54, 54.95, 4.50 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.54, 54.95, 4.80 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -0.54, 54.95, 6.33 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.54, 54.95, 6.63 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -0.54, 54.95, 8.16 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.54, 54.95, 8.46 | Underpass_lod0/brick_painted_white | 0 + 0 + 1 | 1.403 |
| -0.29, 55.15, 10.34 | Underpass_lod0/brick_painted_white | 1 + 0 + 0 | 0.19 |
| -0.54, 54.95, 9.99 | Underpass_lod0/brick_painted_white | 0 + 0 + -1 | 1.403 |
| -0.29, 53.65, 10.34 | Underpass_lod0/brick_painted_white | 1 + 0 + 0 | 1.41 |
| 20.94, 50.71, -8.00 | Underpass_lod0/brick_painted_white | -1 + 0 + 0 | 5.851 |

(140 more in the JSON)

## backtoback (info, 461)

| at | parts | area |
|---|---|---|
| -3.52, 55.01, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| -3.51, 55.01, 1.15 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| -3.52, 55.01, 2.98 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| -3.51, 55.01, 2.98 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| -3.52, 55.01, 4.80 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| -3.51, 55.01, 4.80 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| -3.52, 55.01, 6.63 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| -3.51, 55.01, 6.64 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| -3.52, 55.01, 8.46 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| -3.51, 55.01, 8.47 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| 21.05, 53.53, -7.70 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| 21.07, 53.53, -7.70 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| 21.05, 53.53, -5.88 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| 21.07, 53.53, -5.88 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| 21.05, 53.53, -4.06 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00004 |
| 21.07, 53.53, -4.06 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00019 |
| -0.43, 55.12, 0.79 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00222 |
| -0.47, 55.14, 0.79 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00236 |
| -0.41, 55.11, 0.79 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00014 |
| -3.50, 53.64, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.52, 53.62, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.49, 54.13, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.0087 |
| -3.51, 53.94, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.0206 |
| -3.50, 54.66, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.02077 |
| -3.52, 54.48, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00887 |
| -3.50, 54.99, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.52, 54.97, 1.14 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.50, 55.01, 2.26 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.02661 |
| -3.52, 55.01, 2.22 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00642 |
| -3.49, 55.01, 1.62 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00748 |
| -3.51, 55.01, 1.57 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.02767 |
| -3.49, 54.48, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.0088 |
| -3.51, 54.66, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.02068 |
| -3.50, 54.97, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.52, 54.99, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.50, 53.62, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.52, 53.64, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |
| -3.50, 53.95, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.02068 |
| -3.52, 54.13, 2.67 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.0088 |
| -3.50, 53.64, 2.97 | Underpass_lod0/brick_painted_white + Underpass_lod0/painted_metal_grey | 0.00096 |

(421 more in the JSON)


Nodes: Underpass_lod0, Underpass_throat. Distances: {"Underpass_lod0":70,"Underpass_throat":70,"Underpass_lod1":230,"Underpass_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
