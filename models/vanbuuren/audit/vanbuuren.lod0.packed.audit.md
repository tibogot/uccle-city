# Mesh audit (packed): vanbuuren.lod0

105,453 triangles, 60,356 welded vertices, 22,262 open edges, 1,245,494 rays, 12544 ms.

**6 blocking**, 30926 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| leak | block | 5 |
| streak | block | 1 |
| near | warn | 1 |
| sliver | warn | 28957 |
| nonmanifold | warn | 1690 |
| tjunction | warn | 277 |
| degenerate | warn | 1 |
| seam | info | 1038 |
| opening | info | 3360 |
| backtoback | info | 32 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## leak (block, 5)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 0.36, 106.64, 3.81 | Villa_courses/roof_tiles_flat_dark | 4 | 0 + 0.64 + 0.77 | 6.314 |
| 5.15, 106.64, 3.81 | Villa_courses/roof_tiles_flat_dark | 4 | 0 + 0.64 + 0.77 | 5.114 |
| -9.64, 101.17, -7.10 | Villa_courses/roof_tiles_flat_dark | 30 | -0.35 + -0.78 + -0.52 | 0.012 |
| -9.15, 102.31, -6.38 | Villa_courses/roof_tiles_flat_dark | 30 | -0.35 + -0.78 + -0.52 | 0.012 |
| -8.89, 102.92, -5.99 | Villa_courses/roof_tiles_flat_dark | 30 | -0.35 + -0.78 + -0.52 | 0.012 |

## streak (block, 1)

| at | part | why | deg | area |
|---|---|---|---|---|
| -2.00, 102.10, -3.49 | Villa/wood_varnished | corner normal faces away | 90 | 0.0002 |

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -4.01, 103.13, -8.47 | Villa_courses/roof_tiles_flat_dark + Villa_courses/roof_tiles_flat_dark | 1.95 | 2.2 | 0.1 | 70 | 0.67 | false | 0.4 + 0.69 + 0.6 |

## sliver (warn, 28957)

| at | part | aspect | longest |
|---|---|---|---|
| 5.34, 98.57, -1.72 | Villa/brick_orange_amsterdam | 47 | 2.343 |
| 5.34, 98.58, -0.94 | Villa/brick_orange_amsterdam | 47 | 2.343 |
| 1.02, 102.88, 8.49 | Villa/brick_orange_amsterdam | 43 | 2.161 |
| 0.30, 102.90, 8.49 | Villa/brick_orange_amsterdam | 43 | 2.161 |
| 5.45, 99.38, -5.99 | Villa/brick_orange_amsterdam | 44 | 2.191 |
| 5.45, 99.40, -5.26 | Villa/brick_orange_amsterdam | 44 | 2.191 |
| 1.06, 95.57, 9.04 | Villa/brick_orange_amsterdam | 50 | 2.481 |
| 0.24, 95.58, 9.04 | Villa/brick_orange_amsterdam | 50 | 2.481 |
| -7.64, 95.57, -0.94 | Villa/brick_orange_amsterdam | 50 | 2.48 |
| -7.64, 95.58, -1.76 | Villa/brick_orange_amsterdam | 50 | 2.48 |
| -11.36, 95.35, 0.18 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.36, 95.39, 3.37 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.35, 3.37 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.39, 0.18 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -0.79, 95.61, 10.64 | Villa/brick_orange_amsterdam | 133 | 14.461 |
| -5.61, 95.65, 10.64 | Villa/brick_orange_amsterdam | 133 | 14.461 |
| -5.61, 95.61, 10.33 | Villa/brick_orange_amsterdam | 133 | 14.461 |
| -0.79, 95.65, 10.33 | Villa/brick_orange_amsterdam | 133 | 14.461 |
| -0.79, 95.69, 10.54 | Villa/brick_orange_amsterdam | 47 | 14.464 |
| -5.61, 95.69, 10.43 | Villa/brick_orange_amsterdam | 47 | 14.464 |
| 5.31, 103.24, -1.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.29, 103.24, -0.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.29, 103.15, -1.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.31, 103.15, -0.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.76, 103.94, 3.12 | Villa/brick_pattern | 86 | 3.435 |
| 5.74, 103.94, 4.27 | Villa/brick_pattern | 86 | 3.435 |
| 5.74, 103.85, 3.12 | Villa/brick_pattern | 86 | 3.435 |
| 5.76, 103.85, 4.27 | Villa/brick_pattern | 86 | 3.435 |
| 6.20, 101.02, 5.85 | Villa/concrete_white | 123 | 1.825 |
| 6.19, 101.02, 6.46 | Villa/concrete_white | 123 | 1.825 |
| 6.22, 101.01, 5.85 | Villa/concrete_white | 61 | 1.825 |
| 6.21, 101.01, 6.46 | Villa/concrete_white | 61 | 1.825 |
| 6.03, 101.01, 5.25 | Villa/concrete_white | 45 | 0.465 |
| 5.88, 101.01, 5.25 | Villa/concrete_white | 45 | 0.465 |
| 5.88, 101.01, 5.23 | Villa/concrete_white | 45 | 0.465 |
| 6.03, 101.01, 5.23 | Villa/concrete_white | 45 | 0.465 |
| 6.20, 101.01, 6.46 | Villa/concrete_white | 178 | 1.825 |
| 6.20, 101.01, 5.85 | Villa/concrete_white | 178 | 1.825 |
| 6.18, 101.01, 5.85 | Villa/concrete_white | 178 | 1.825 |
| 6.18, 101.01, 6.46 | Villa/concrete_white | 178 | 1.825 |

(28917 more in the JSON)

## nonmanifold (warn, 1690)

| at | part | uses |
|---|---|---|
| 7.54, 97.49, 0.22 | Villa/concrete_white | 3 |
| 7.54, 97.49, 1.13 | Villa/concrete_white | 3 |
| 7.54, 96.02, 0.22 | Villa/concrete_white | 3 |
| 7.54, 96.02, 1.13 | Villa/concrete_white | 3 |
| 7.54, 97.62, -3.72 | Villa/concrete_white | 3 |
| 7.54, 97.62, -2.78 | Villa/concrete_white | 3 |
| 7.54, 96.14, -3.72 | Villa/concrete_white | 3 |
| 7.54, 96.14, -2.78 | Villa/concrete_white | 3 |
| 2.21, 101.24, 8.55 | Villa/concrete_white | 3 |
| -0.94, 101.24, 8.55 | Villa/concrete_white | 3 |
| 2.21, 99.28, 8.55 | Villa/concrete_white | 3 |
| -0.94, 99.28, 8.55 | Villa/concrete_white | 3 |
| -7.10, 101.30, -0.08 | Villa/concrete_white | 3 |
| -7.10, 101.30, -3.54 | Villa/concrete_white | 3 |
| -7.10, 99.40, -0.08 | Villa/concrete_white | 3 |
| -7.10, 99.40, -3.54 | Villa/concrete_white | 3 |
| 5.74, 94.82, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 94.88, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 94.94, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.01, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.07, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.13, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.19, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.26, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.32, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.38, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.44, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.51, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.57, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.63, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.69, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.76, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.82, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.88, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 95.94, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 96.01, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 96.07, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 96.13, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 96.19, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |
| 5.74, 96.26, 7.09 | Villa_courses/brick_orange_amsterdam | 4 |

(1650 more in the JSON)

## tjunction (warn, 277)

| at | part | edge_m |
|---|---|---|
| 5.65, 95.50, 6.67 | Villa/brick_orange_amsterdam | 0.12 |
| 5.65, 95.50, 5.67 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 99.31, 6.63 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 99.31, 5.46 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 102.81, 5.64 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 102.81, 4.81 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 102.56, 3.25 | Villa/brick_orange_amsterdam | 0.12 |
| 5.64, 102.56, 2.45 | Villa/brick_orange_amsterdam | 0.12 |
| 6.39, 99.19, 2.72 | Villa/brick_orange_amsterdam | 0.12 |
| 6.39, 99.19, 1.31 | Villa/brick_orange_amsterdam | 0.12 |
| 5.19, 102.31, -0.55 | Villa/brick_orange_amsterdam | 0.12 |
| 5.19, 102.31, -1.90 | Villa/brick_orange_amsterdam | 0.12 |
| 5.19, 98.63, -0.19 | Villa/brick_orange_amsterdam | 0.12 |
| 5.19, 98.63, -2.46 | Villa/brick_orange_amsterdam | 0.12 |
| 7.49, 96.00, 1.04 | Villa/brick_orange_amsterdam | 0.16 |
| 7.49, 96.00, 0.31 | Villa/brick_orange_amsterdam | 0.16 |
| 7.49, 97.64, -1.97 | Villa/brick_orange_amsterdam | 1.48 |
| 7.49, 96.13, -2.87 | Villa/brick_orange_amsterdam | 0.16 |
| 7.49, 96.13, -3.63 | Villa/brick_orange_amsterdam | 0.16 |
| 6.17, 95.44, -4.72 | Villa/brick_orange_amsterdam | 0.12 |
| 6.17, 95.44, -5.34 | Villa/brick_orange_amsterdam | 0.12 |
| 6.16, 96.25, -5.57 | Villa/brick_orange_amsterdam | 0.12 |
| 6.16, 96.25, -7.01 | Villa/brick_orange_amsterdam | 0.12 |
| -4.90, 95.50, 6.75 | Villa/brick_orange_amsterdam | 0.12 |
| -3.30, 95.50, 6.75 | Villa/brick_orange_amsterdam | 0.12 |
| -0.38, 102.94, 8.34 | Villa/brick_orange_amsterdam | 0.12 |
| -0.38, 103.62, 8.45 | Villa/brick_orange_amsterdam | 0.05 |
| 1.70, 102.94, 8.34 | Villa/brick_orange_amsterdam | 0.12 |
| 1.70, 103.62, 8.45 | Villa/brick_orange_amsterdam | 0.05 |
| 4.28, 98.88, 6.99 | Villa/brick_orange_amsterdam | 0.12 |
| 5.24, 98.88, 6.99 | Villa/brick_orange_amsterdam | 0.12 |
| -6.89, 102.31, -2.37 | Villa/brick_orange_amsterdam | 0.12 |
| -6.89, 102.31, -0.98 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 99.31, 1.39 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 99.31, 2.02 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 99.38, 3.07 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 99.38, 4.47 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 102.69, 2.89 | Villa/brick_orange_amsterdam | 0.12 |
| -5.54, 102.69, 4.77 | Villa/brick_orange_amsterdam | 0.12 |
| 7.38, 95.15, -0.73 | Villa/brick_orange_amsterdam | 0.05 |

(237 more in the JSON)

## degenerate (warn, 1)

| at | part | edge |
|---|---|---|
| 5.75, 103.64, 5.65 | Villa_courses/brick_orange_amsterdam | 0.0239 |

## seam (info, 1038)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.65, 101.24, 6.85 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 51.8 | 2569 | 32.1 |
| 4.29, 101.44, -3.98 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 14.58 | 611 | 45.6 |
| -5.65, 106.30, 3.59 | Villa/wood_varnished + Villa_courses/brick_pattern | 7.32 | 594 | 57.5 |
| 7.60, 95.53, -0.48 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 592 | 90 |
| 7.60, 95.53, -0.29 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 592 | 90 |
| 7.60, 95.53, -0.10 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 592 | 90 |
| 7.60, 95.53, -2.25 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 588 | 90 |
| 7.60, 95.53, -2.44 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 588 | 90 |
| 7.60, 95.53, -2.63 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.34 | 588 | 90 |
| 0.25, 105.88, 8.44 | Villa/wood_varnished + Villa_courses/brick_pattern | 7.06 | 574 | 58 |
| 5.30, 104.87, -1.08 | Villa/wood_varnished + Villa_courses/brick_pattern | 6.6 | 531 | 56 |
| 2.85, 94.67, 8.45 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 8.1 | 427 | 90 |
| -7.00, 94.77, -4.20 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 7.9 | 419 | 90 |
| -7.00, 103.72, -0.30 | Villa/wood_varnished + Villa_courses/brick_pattern | 5.1 | 406 | 56 |
| 5.24, 98.64, -0.19 | Villa/brick_orange_amsterdam + Villa/wood_varnished | 7.04 | 388 | 90 |
| 5.40, 99.69, -4.46 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 4.25 | 386 | 31.8 |
| 5.36, 105.84, 3.30 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 5.88 | 381 | 32.5 |
| -3.90, 98.81, 6.85 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 7.08 | 377 | 90 |
| -2.47, 101.51, 7.19 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 7.25 | 376 | 32 |
| 5.38, 99.36, -4.45 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 6.78 | 366 | 32.5 |
| -4.90, 95.51, 6.80 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 6.12 | 350 | 90 |
| -2.62, 101.28, 7.22 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 15.21 | 341 | 44.2 |
| 1.99, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.4 | 329 | 90 |
| -1.19, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.4 | 328 | 90 |
| -0.55, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 9.2 | 328 | 90 |
| -7.55, 95.64, -3.60 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.15 | 327 | 90 |
| -7.55, 95.64, 0.40 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 4.95 | 327 | 90 |
| 5.70, 95.51, 6.67 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.15 | 325 | 90 |
| 1.04, 106.23, 3.55 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 13.65 | 325 | 58.6 |
| -2.24, 102.24, 1.01 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 13.69 | 325 | 58.4 |
| -7.55, 95.64, -2.55 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 8.95 | 322 | 90 |
| -9.42, 95.70, -7.15 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.46 | 317 | 90 |
| -9.44, 95.70, -7.17 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.46 | 317 | 90 |
| -7.61, 95.70, -4.30 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.47 | 316 | 90 |
| -7.62, 95.70, -4.32 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.47 | 316 | 90 |
| 6.22, 95.45, -4.72 | Villa/brick_orange_amsterdam + Villa/wood_varnished | 5.27 | 315 | 90 |
| -7.92, 100.45, -4.80 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 5.83 | 314 | 90 |
| 5.30, 99.83, -3.42 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 4.45 | 314 | 31.8 |
| -8.70, 100.45, -6.01 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 5.82 | 312 | 89.8 |
| 5.19, 98.63, -0.19 | Villa/brick_orange_amsterdam + Villa/glass_leaded | 7.04 | 310 | 90 |

(998 more in the JSON)

## opening (info, 3360)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.71, 102.53, 2.41 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.086 |
| -0.42, 102.90, 8.40 | Villa/brick_orange_amsterdam | -1 + 0 + 0 | 0.085 |
| 1.74, 102.90, 8.40 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 0.085 |
| -6.96, 102.28, -2.41 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.086 |
| -6.96, 102.28, -0.94 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.086 |
| -5.61, 102.65, 2.85 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.086 |
| -5.61, 102.65, 4.81 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.086 |
| 6.23, 94.14, -7.51 | Villa/brick_orange_amsterdam | 0.07 + 0 + -1 | 7.86 |
| 2.26, 104.77, -7.78 | Villa/brick_orange_amsterdam | 0.07 + 0 + -1 | 7.86 |
| 8.50, 94.93, 0.25 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.97 |
| 7.63, 95.71, 0.25 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.97 |
| 7.63, 94.93, 1.35 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.97 |
| 8.50, 95.71, 1.35 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.97 |
| 8.55, 94.93, 0.30 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 1.1 |
| 8.55, 95.71, 0.30 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 1.1 |
| 7.65, 95.61, 1.35 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.93 |
| 8.48, 95.61, 0.25 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.93 |
| 8.50, 94.93, -4.05 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.97 |
| 7.63, 95.71, -4.05 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.97 |
| 7.63, 94.93, -2.95 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.97 |
| 8.50, 95.71, -2.95 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.97 |
| 8.55, 94.93, -4.00 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 1.1 |
| 8.55, 95.71, -4.00 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 1.1 |
| 7.65, 95.61, -2.95 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.93 |
| 8.48, 95.61, -4.05 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.93 |
| -1.55, 94.75, 9.55 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 4.5 |
| 2.85, 95.90, 9.55 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 4.5 |
| 2.90, 94.75, 9.49 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 0.55 |
| 2.90, 95.90, 9.49 | Villa/brick_orange_amsterdam | 1 + 0 + 0 | 0.55 |
| -1.60, 94.75, 9.49 | Villa/brick_orange_amsterdam | -1 + 0 + 0 | 0.55 |
| -1.60, 95.90, 9.49 | Villa/brick_orange_amsterdam | -1 + 0 + 0 | 0.55 |
| -1.55, 95.80, 9.55 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 4.5 |
| 2.85, 95.80, 9.00 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 4.5 |
| -7.76, 94.86, -4.25 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.55 |
| -7.66, 95.90, 0.95 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.55 |
| -8.15, 94.86, -4.20 | Villa/brick_orange_amsterdam | -1 + 0 + 0 | 5.2 |
| -8.15, 95.90, -3.70 | Villa/brick_orange_amsterdam | -1 + 0 + 0 | 5.2 |
| -8.10, 95.80, 0.95 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.55 |
| -7.76, 95.80, -4.25 | Villa/brick_orange_amsterdam | 0 + 1 + 0 | 0.55 |
| -6.30, 95.90, 6.90 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.55 |

(3320 more in the JSON)

## backtoback (info, 32)

| at | parts | area |
|---|---|---|
| 6.65, 97.73, -4.45 | Villa/concrete_white + Villa/concrete_white | 0.0073 |
| 6.43, 97.74, -4.45 | Villa/concrete_white + Villa/concrete_white | 0.02821 |
| -9.47, 98.45, -7.24 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.00022 |
| -8.20, 98.45, -5.23 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.023 |
| -8.85, 98.45, -6.23 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.02264 |
| -7.55, 98.45, -4.24 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.00023 |
| -8.71, 100.45, -6.03 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00089 |
| -8.75, 100.45, -6.07 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00222 |
| -8.95, 100.45, -6.41 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00259 |
| -8.99, 100.45, -6.45 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00581 |
| -7.95, 100.45, -4.84 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00222 |
| -7.99, 100.45, -4.88 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00091 |
| -8.19, 100.45, -5.22 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00595 |
| -8.23, 100.45, -5.26 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00251 |
| -2.00, 100.81, -4.36 | Villa/wood_varnished + Villa/wood_varnished | 0.00006 |
| -8.61, 103.29, -5.57 | Villa/wood_varnished + Villa/wood_varnished | 0.00038 |
| -11.42, 95.40, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01479 |
| -11.40, 95.57, -5.84 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01501 |
| -11.43, 95.64, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00028 |
| -11.43, 95.69, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00006 |
| -11.41, 98.19, -5.84 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00386 |
| -11.40, 98.23, -5.85 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00386 |
| -9.61, 95.40, -3.07 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01467 |
| -9.63, 95.57, -3.06 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01489 |
| -9.60, 95.64, -3.08 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00028 |
| -9.60, 95.69, -3.08 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00006 |
| -9.62, 98.19, -3.07 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00382 |
| -9.63, 98.23, -3.06 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00382 |
| 7.59, 95.45, -0.45 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00359 |
| 7.60, 95.45, -0.40 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00033 |
| 7.59, 95.45, -2.30 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00034 |
| 7.59, 95.45, -2.25 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00358 |


Nodes: Villa, Villa_courses. Distances: {"Villa":70,"Villa_courses":70,"Villa_far":2000,"Villa_lod2":2000}. Quantum 0.133 mm. Offset 0,90,0.
