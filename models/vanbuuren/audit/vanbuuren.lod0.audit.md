# Mesh audit (before pack): vanbuuren.lod0

108,816 triangles, 61,781 welded vertices, 21,404 open edges, 1,083,950 rays, 12108 ms.

**0 blocking**, 32303 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 30396 |
| nonmanifold | warn | 1690 |
| tjunction | warn | 215 |
| degenerate | warn | 2 |
| seam | info | 947 |
| opening | info | 3832 |
| backtoback | info | 146 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 30396)

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
| -7.64, 95.57, -0.94 | Villa/brick_orange_amsterdam | 50 | 2.481 |
| -7.64, 95.58, -1.76 | Villa/brick_orange_amsterdam | 50 | 2.481 |
| -11.36, 95.35, 0.18 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.36, 95.39, 3.37 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.35, 3.37 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.39, 0.18 | Villa/brick_orange_amsterdam | 88 | 9.591 |
| -0.79, 95.61, 10.64 | Villa/brick_orange_amsterdam | 133 | 14.46 |
| -5.61, 95.65, 10.64 | Villa/brick_orange_amsterdam | 133 | 14.46 |
| -5.61, 95.61, 10.33 | Villa/brick_orange_amsterdam | 133 | 14.46 |
| -0.79, 95.65, 10.33 | Villa/brick_orange_amsterdam | 133 | 14.46 |
| -0.79, 95.69, 10.54 | Villa/brick_orange_amsterdam | 47 | 14.463 |
| -5.61, 95.69, 10.43 | Villa/brick_orange_amsterdam | 47 | 14.463 |
| 5.31, 103.24, -1.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.29, 103.24, -0.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.29, 103.15, -1.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.31, 103.15, -0.85 | Villa/brick_pattern | 74 | 2.976 |
| 5.76, 103.94, 3.12 | Villa/brick_pattern | 86 | 3.435 |
| 5.74, 103.94, 4.27 | Villa/brick_pattern | 86 | 3.435 |
| 5.74, 103.85, 3.12 | Villa/brick_pattern | 86 | 3.435 |
| 5.76, 103.85, 4.27 | Villa/brick_pattern | 86 | 3.435 |
| 6.20, 101.02, 5.85 | Villa/concrete_white | 122 | 1.825 |
| 6.19, 101.02, 6.46 | Villa/concrete_white | 122 | 1.825 |
| 6.22, 101.01, 5.85 | Villa/concrete_white | 61 | 1.825 |
| 6.21, 101.01, 6.46 | Villa/concrete_white | 61 | 1.825 |
| 6.03, 101.01, 5.25 | Villa/concrete_white | 47 | 0.465 |
| 5.88, 101.01, 5.25 | Villa/concrete_white | 47 | 0.465 |
| 5.88, 101.01, 5.23 | Villa/concrete_white | 47 | 0.465 |
| 6.03, 101.01, 5.23 | Villa/concrete_white | 47 | 0.465 |
| 6.20, 101.01, 6.46 | Villa/concrete_white | 183 | 1.825 |
| 6.20, 101.01, 5.85 | Villa/concrete_white | 183 | 1.825 |
| 6.18, 101.01, 5.85 | Villa/concrete_white | 183 | 1.825 |
| 6.18, 101.01, 6.46 | Villa/concrete_white | 183 | 1.825 |

(30356 more in the JSON)

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

## tjunction (warn, 215)

| at | part | edge_m |
|---|---|---|
| 7.49, 97.64, -1.97 | Villa/brick_orange_amsterdam | 1.48 |
| -0.38, 103.62, 8.45 | Villa/brick_orange_amsterdam | 0.05 |
| 1.70, 103.62, 8.45 | Villa/brick_orange_amsterdam | 0.05 |
| 7.38, 95.15, -0.73 | Villa/brick_orange_amsterdam | 0.05 |
| 7.49, 95.15, -0.73 | Villa/brick_orange_amsterdam | 0.05 |
| 7.49, 95.15, -1.97 | Villa/brick_orange_amsterdam | 0.05 |
| 7.38, 95.15, -1.97 | Villa/brick_orange_amsterdam | 0.05 |
| 7.38, 97.64, -1.85 | Villa/brick_orange_amsterdam | 1.24 |
| 7.38, 95.15, -0.85 | Villa/brick_orange_amsterdam | 0.05 |
| 7.38, 95.15, -1.85 | Villa/brick_orange_amsterdam | 0.05 |
| 5.72, 101.23, 3.46 | Villa/brick_orange_amsterdam | 1.34 |
| 2.90, 95.80, 9.00 | Villa/brick_orange_amsterdam | 1.154 |
| -1.60, 95.80, 9.00 | Villa/brick_orange_amsterdam | 1.154 |
| -7.60, 95.80, -4.25 | Villa/brick_orange_amsterdam | 1.038 |
| -7.60, 95.80, 0.95 | Villa/brick_orange_amsterdam | 1.038 |
| -6.25, 95.80, 1.35 | Villa/brick_orange_amsterdam | 1.162 |
| -6.25, 95.80, 6.90 | Villa/brick_orange_amsterdam | 1.162 |
| 6.18, 101.01, 5.20 | Villa/concrete_white | 0.51 |
| 6.23, 101.01, 5.23 | Villa/concrete_white | 1.87 |
| 6.23, 101.01, 7.50 | Villa/concrete_white | 0.48 |
| 6.18, 101.01, 7.55 | Villa/concrete_white | 0.51 |
| 3.98, 101.01, 7.55 | Villa/concrete_white | 1.77 |
| 3.95, 101.01, 7.50 | Villa/concrete_white | 0.48 |
| 6.96, 100.99, 3.63 | Villa/concrete_white | 1.28 |
| 7.00, 100.99, 3.58 | Villa/concrete_white | 2.775 |
| 5.75, 100.99, 0.85 | Villa/concrete_white | 1.235 |
| 5.75, 100.99, 0.42 | Villa/concrete_white | 1.28 |
| 7.00, 100.99, 0.45 | Villa/concrete_white | 0.435 |
| 5.72, 100.99, 0.45 | Villa/concrete_white | 0.435 |
| 6.11, 97.80, 5.50 | Villa/concrete_white | 0.43 |
| 6.11, 97.80, 6.85 | Villa/concrete_white | 0.43 |
| 6.15, 97.80, 5.53 | Villa/concrete_white | 1.35 |
| 6.67, 97.60, -7.45 | Villa/concrete_white | 0.48 |
| 6.67, 97.60, -4.45 | Villa/concrete_white | 0.48 |
| 6.24, 97.71, -4.45 | Villa/concrete_white | 0.18 |
| 6.72, 97.60, -7.42 | Villa/concrete_white | 3 |
| 8.88, 97.71, 1.75 | Villa/concrete_white | 2.68 |
| 8.92, 97.71, 1.71 | Villa/concrete_white | 5.6 |
| 6.24, 97.71, -3.82 | Villa/concrete_white | 5.555 |
| 8.88, 97.71, -4.45 | Villa/concrete_white | 2.68 |

(175 more in the JSON)

## degenerate (warn, 2)

| at | part | edge |
|---|---|---|
| 5.75, 103.64, 5.65 | Villa_courses/brick_orange_amsterdam | 0.0239 |
| -7.57, 104.39, -4.23 | Villa_courses/brick_orange_amsterdam | 0.0179 |

## seam (info, 947)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.65, 101.24, 6.85 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 31.24 | 1926 | 32 |
| -5.74, 101.31, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 4.41 | 734 | 88.8 |
| -5.65, 106.30, 3.59 | Villa/wood_varnished + Villa_courses/brick_pattern | 7.32 | 594 | 57.5 |
| 7.60, 95.53, -0.48 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 592 | 90 |
| 7.60, 95.53, -0.29 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 592 | 90 |
| 7.60, 95.53, -0.10 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 592 | 90 |
| 7.60, 95.53, -2.25 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 588 | 90 |
| 7.60, 95.53, -2.44 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 588 | 90 |
| 7.60, 95.53, -2.63 | Villa/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 6.31 | 588 | 90 |
| 0.25, 105.88, 8.44 | Villa/wood_varnished + Villa_courses/brick_pattern | 7.03 | 574 | 58 |
| -7.00, 100.66, -4.69 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 5.85 | 569 | 34 |
| 5.29, 104.75, -1.70 | Villa/wood_varnished + Villa_courses/brick_pattern | 6.61 | 531 | 56 |
| -5.74, 101.74, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 5.84 | 503 | 30.6 |
| 2.85, 94.67, 8.45 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 8.1 | 427 | 90 |
| -7.00, 94.77, -4.20 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 7.9 | 419 | 90 |
| 5.24, 98.63, -0.19 | Villa/brick_orange_amsterdam + Villa/wood_varnished | 7.04 | 386 | 90 |
| 5.40, 99.69, -4.46 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 4.25 | 386 | 32.5 |
| 5.36, 105.84, 3.30 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 5.87 | 381 | 32.5 |
| -3.90, 98.81, 6.85 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 7.11 | 377 | 90 |
| -2.47, 101.51, 7.19 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 7.23 | 376 | 32 |
| -9.42, 101.58, -7.27 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 12.46 | 372 | 36.9 |
| 5.38, 99.36, -4.45 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 6.78 | 366 | 32.5 |
| -4.90, 95.51, 6.80 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 6.12 | 350 | 90 |
| -3.73, 104.19, -6.91 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 5.62 | 349 | 36.9 |
| -2.62, 101.28, 7.22 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 15.68 | 338 | 44.3 |
| 3.94, 101.58, -3.85 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 7.53 | 337 | 32.5 |
| -4.68, 101.90, -8.30 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 8.44 | 334 | 42.2 |
| -1.19, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.4 | 328 | 90 |
| -0.55, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 9.2 | 328 | 90 |
| 1.99, 95.64, 8.95 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.4 | 328 | 90 |
| -7.55, 95.64, -3.60 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.15 | 328 | 90 |
| -7.55, 95.64, 0.40 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 4.95 | 328 | 90 |
| 5.70, 95.51, 6.67 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 5.15 | 326 | 90 |
| -4.66, 102.34, -8.28 | Villa_courses/brick_orange_amsterdam + Villa_courses/roof_tiles_flat_dark | 4.44 | 322 | 26.6 |
| -7.55, 95.64, -2.55 | Villa/brick_orange_amsterdam + Villa/wood_frame_white | 8.95 | 320 | 90 |
| -2.24, 102.24, 1.01 | Villa/wood_varnished + Villa_courses/roof_tiles_flat_dark | 13.86 | 319 | 45.3 |
| -9.42, 95.70, -7.15 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.48 | 317 | 90 |
| -9.44, 95.70, -7.17 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.48 | 317 | 90 |
| -7.61, 95.70, -4.30 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.48 | 316 | 90 |
| -7.62, 95.70, -4.32 | Villa/glass_window + Villa_courses/brick_orange_amsterdam | 3.48 | 316 | 90 |

(907 more in the JSON)

## opening (info, 3832)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.63, 103.89, 4.86 | Villa/brick_orange_amsterdam | 0 + -1 + 0 | 0.698 |
| 5.63, 102.57, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.60, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.63, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.66, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.69, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.72, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.76, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.79, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.82, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.85, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.88, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.91, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 102.94, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 102.97, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.01, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.04, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.07, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.10, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.13, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.16, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.19, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.22, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.26, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.29, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.32, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.35, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.38, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.41, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.44, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.47, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.51, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.54, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.05 |
| 5.63, 103.57, 2.45 | Villa/brick_orange_amsterdam | 0 + 0 + 1 | 0.012 |
| 5.63, 103.58, 3.20 | Villa/brick_orange_amsterdam | 0 + -1 + 0 | 0.8 |
| 5.71, 102.53, 2.41 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.085 |
| 5.18, 102.32, -0.55 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.012 |
| 5.18, 102.35, -0.55 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.05 |
| 5.18, 102.38, -0.55 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.012 |
| 5.18, 102.41, -0.55 | Villa/brick_orange_amsterdam | 0 + 0 + -1 | 0.05 |

(3792 more in the JSON)

## backtoback (info, 146)

| at | parts | area |
|---|---|---|
| 6.65, 97.73, -4.45 | Villa/concrete_white + Villa/concrete_white | 0.0073 |
| 6.43, 97.74, -4.45 | Villa/concrete_white + Villa/concrete_white | 0.02822 |
| -9.47, 98.45, -7.24 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.00022 |
| -8.20, 98.45, -5.23 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.02311 |
| -8.85, 98.45, -6.23 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.02311 |
| -7.55, 98.45, -4.24 | Villa/concrete_white + Villa_courses/brick_orange_amsterdam | 0.00023 |
| -8.71, 100.45, -6.03 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00088 |
| -8.75, 100.45, -6.07 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00227 |
| -8.95, 100.45, -6.41 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00261 |
| -8.99, 100.45, -6.45 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00593 |
| -7.95, 100.45, -4.84 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00222 |
| -7.99, 100.45, -4.88 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00094 |
| -8.19, 100.45, -5.22 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00598 |
| -8.23, 100.45, -5.26 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00256 |
| -5.71, 101.57, -9.84 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00092 |
| -5.68, 101.63, -9.81 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00192 |
| -5.64, 101.69, -9.75 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00009 |
| -5.66, 101.69, -9.78 | Villa/wood_varnished + Villa_courses/brick_orange_amsterdam | 0.00289 |
| -11.42, 95.40, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01473 |
| -11.40, 95.57, -5.84 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01494 |
| -11.43, 95.64, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00027 |
| -11.43, 95.69, -5.83 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00006 |
| -11.41, 98.19, -5.84 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00384 |
| -11.40, 98.23, -5.85 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00384 |
| -9.61, 95.40, -3.07 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01473 |
| -9.63, 95.57, -3.06 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.01494 |
| -9.60, 95.64, -3.08 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00027 |
| -9.60, 95.69, -3.08 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00006 |
| -9.62, 98.19, -3.07 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00384 |
| -9.63, 98.23, -3.06 | Villa/metal_green_veranda + Villa/metal_green_veranda | 0.00384 |
| 7.59, 95.45, -0.45 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00354 |
| 7.60, 95.45, -0.40 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00032 |
| 7.59, 95.45, -2.30 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00033 |
| 7.59, 95.45, -2.25 | Villa/stone_blue + Villa_courses/brick_orange_amsterdam | 0.00353 |
| -5.73, 101.31, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00005 |
| -5.74, 101.32, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00007 |
| -5.73, 101.38, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00005 |
| -5.74, 101.38, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00007 |
| -5.73, 101.44, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00005 |
| -5.74, 101.45, -9.87 | Villa_courses/brick_orange_amsterdam + Villa_courses/brick_orange_amsterdam | 0.00007 |

(106 more in the JSON)


Nodes: Villa, Villa_courses. Distances: {"Villa":70,"Villa_courses":70,"Villa_far":2000,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,90,0.
