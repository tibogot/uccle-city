# Mesh audit (packed): vanbuuren.lod1

3,815 triangles, 3,237 welded vertices, 2,743 open edges, 643,046 rays, 1690 ms.

**1 blocking**, 588 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| streak | block | 1 |
| sliver | warn | 364 |
| nonmanifold | warn | 16 |
| tjunction | warn | 208 |
| seam | info | 553 |
| opening | info | 466 |
| backtoback | info | 15 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## streak (block, 1)

| at | part | why | deg | area |
|---|---|---|---|---|
| -2.00, 102.10, -3.49 | Villa_far/wood_varnished | corner normal faces away | 90 | 0.0002 |

## sliver (warn, 364)

| at | part | aspect | longest |
|---|---|---|---|
| 5.75, 98.15, 6.64 | Villa_far/brick_orange_amsterdam | 47 | 1.738 |
| 5.75, 98.73, 6.66 | Villa_far/brick_orange_amsterdam | 47 | 1.738 |
| 5.75, 101.03, 3.79 | Villa_far/brick_orange_amsterdam | 50 | 2.508 |
| 5.75, 101.05, 4.62 | Villa_far/brick_orange_amsterdam | 50 | 2.508 |
| -5.65, 96.20, 1.36 | Villa_far/brick_orange_amsterdam | 49 | 4.665 |
| -5.65, 97.76, 1.33 | Villa_far/brick_orange_amsterdam | 49 | 4.665 |
| -11.36, 95.35, 0.18 | Villa_far/brick_orange_amsterdam | 88 | 9.591 |
| -11.36, 95.39, 3.37 | Villa_far/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.35, 3.37 | Villa_far/brick_orange_amsterdam | 88 | 9.591 |
| -11.64, 95.39, 0.18 | Villa_far/brick_orange_amsterdam | 88 | 9.591 |
| -0.79, 95.61, 10.64 | Villa_far/brick_orange_amsterdam | 133 | 14.461 |
| -5.61, 95.65, 10.64 | Villa_far/brick_orange_amsterdam | 133 | 14.461 |
| -5.61, 95.61, 10.33 | Villa_far/brick_orange_amsterdam | 133 | 14.461 |
| -0.79, 95.65, 10.33 | Villa_far/brick_orange_amsterdam | 133 | 14.461 |
| -0.79, 95.69, 10.54 | Villa_far/brick_orange_amsterdam | 47 | 14.464 |
| -5.61, 95.69, 10.43 | Villa_far/brick_orange_amsterdam | 47 | 14.464 |
| 5.31, 103.24, -1.85 | Villa_far/brick_pattern | 74 | 2.976 |
| 5.29, 103.24, -0.85 | Villa_far/brick_pattern | 74 | 2.976 |
| 5.29, 103.15, -1.85 | Villa_far/brick_pattern | 74 | 2.976 |
| 5.31, 103.15, -0.85 | Villa_far/brick_pattern | 74 | 2.976 |
| 5.76, 103.94, 3.12 | Villa_far/brick_pattern | 86 | 3.435 |
| 5.74, 103.94, 4.27 | Villa_far/brick_pattern | 86 | 3.435 |
| 5.74, 103.85, 3.12 | Villa_far/brick_pattern | 86 | 3.435 |
| 5.76, 103.85, 4.27 | Villa_far/brick_pattern | 86 | 3.435 |
| 0.53, 106.67, 5.42 | Villa_far/roof_tiles_flat_dark | 86 | 4.794 |
| -2.80, 101.33, 3.33 | Villa_far/roof_tiles_flat_dark | 338 | 5.471 |
| 0.29, 106.27, 1.99 | Villa_far/roof_tiles_flat_dark | 80 | 4.977 |
| -0.87, 104.42, -0.53 | Villa_far/roof_tiles_flat_dark | 61 | 4.263 |
| 0.73, 106.80, 5.36 | Villa_far/roof_tiles_flat_dark | 56 | 4.901 |
| 0.68, 106.83, 3.57 | Villa_far/roof_tiles_flat_dark | 108 | 10.2 |
| 0.73, 106.80, 1.91 | Villa_far/roof_tiles_flat_dark | 61 | 5.301 |
| 0.77, 106.67, 5.42 | Villa_far/roof_tiles_flat_dark | 86 | 4.794 |
| 1.01, 106.27, 1.99 | Villa_far/roof_tiles_flat_dark | 80 | 4.977 |
| 2.17, 104.42, -0.53 | Villa_far/roof_tiles_flat_dark | 61 | 4.264 |
| 0.57, 106.80, 1.91 | Villa_far/roof_tiles_flat_dark | 61 | 5.301 |
| 0.57, 106.80, 5.36 | Villa_far/roof_tiles_flat_dark | 56 | 4.901 |
| 0.62, 106.83, 3.57 | Villa_far/roof_tiles_flat_dark | 108 | 10.2 |
| 2.48, 106.78, 3.72 | Villa_far/roof_tiles_flat_dark | 61 | 5.17 |
| -1.59, 106.72, 3.83 | Villa_far/roof_tiles_flat_dark | 66 | 6.329 |
| 2.49, 106.72, 3.83 | Villa_far/roof_tiles_flat_dark | 54 | 5.129 |

(324 more in the JSON)

## nonmanifold (warn, 16)

| at | part | uses |
|---|---|---|
| 7.54, 97.49, 0.22 | Villa_far/concrete_white | 3 |
| 7.54, 97.49, 1.13 | Villa_far/concrete_white | 3 |
| 7.54, 96.02, 0.22 | Villa_far/concrete_white | 3 |
| 7.54, 96.02, 1.13 | Villa_far/concrete_white | 3 |
| 7.54, 97.62, -3.72 | Villa_far/concrete_white | 3 |
| 7.54, 97.62, -2.78 | Villa_far/concrete_white | 3 |
| 7.54, 96.14, -3.72 | Villa_far/concrete_white | 3 |
| 7.54, 96.14, -2.78 | Villa_far/concrete_white | 3 |
| 2.21, 101.24, 8.55 | Villa_far/concrete_white | 3 |
| -0.94, 101.24, 8.55 | Villa_far/concrete_white | 3 |
| 2.21, 99.28, 8.55 | Villa_far/concrete_white | 3 |
| -0.94, 99.28, 8.55 | Villa_far/concrete_white | 3 |
| -7.10, 101.30, -0.08 | Villa_far/concrete_white | 3 |
| -7.10, 101.30, -3.54 | Villa_far/concrete_white | 3 |
| -7.10, 99.40, -0.08 | Villa_far/concrete_white | 3 |
| -7.10, 99.40, -3.54 | Villa_far/concrete_white | 3 |

## tjunction (warn, 208)

| at | part | edge_m |
|---|---|---|
| 5.75, 94.80, 7.10 | Villa_far/brick_orange_amsterdam | 1.119 |
| 5.75, 97.58, 5.46 | Villa_far/brick_orange_amsterdam | 2.72 |
| 5.75, 98.88, 7.10 | Villa_far/brick_orange_amsterdam | 1.738 |
| 5.75, 99.31, 6.67 | Villa_far/brick_orange_amsterdam | 0.468 |
| 5.75, 100.20, 7.10 | Villa_far/brick_orange_amsterdam | 1.7 |
| 5.75, 101.06, 3.30 | Villa_far/brick_orange_amsterdam | 2.508 |
| 5.65, 95.50, 6.67 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.65, 95.50, 5.67 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.75, 97.58, 6.63 | Villa_far/brick_orange_amsterdam | 1 |
| 5.64, 99.31, 6.63 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.64, 99.31, 5.46 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.75, 101.06, 5.46 | Villa_far/brick_orange_amsterdam | 2.48 |
| 5.75, 101.30, 6.35 | Villa_far/brick_orange_amsterdam | 2.48 |
| 5.75, 101.06, 2.95 | Villa_far/brick_orange_amsterdam | 2.445 |
| 5.75, 101.30, 1.05 | Villa_far/brick_orange_amsterdam | 2.445 |
| 5.75, 101.86, 7.10 | Villa_far/brick_orange_amsterdam | 1.263 |
| 5.75, 102.56, 4.81 | Villa_far/brick_orange_amsterdam | 1.728 |
| 5.75, 102.13, 0.85 | Villa_far/brick_orange_amsterdam | 1.263 |
| 5.75, 103.89, 2.45 | Villa_far/brick_orange_amsterdam | 1.404 |
| 5.75, 103.58, 5.64 | Villa_far/brick_orange_amsterdam | 1.075 |
| 5.64, 102.81, 5.64 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.75, 103.58, 4.81 | Villa_far/brick_orange_amsterdam | 1.075 |
| 5.64, 102.81, 4.81 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.75, 102.81, 3.25 | Villa_far/brick_orange_amsterdam | 1.013 |
| 5.64, 102.56, 3.25 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.75, 102.81, 2.45 | Villa_far/brick_orange_amsterdam | 1.013 |
| 5.64, 102.56, 2.45 | Villa_far/brick_orange_amsterdam | 0.12 |
| 6.50, 99.19, 2.95 | Villa_far/brick_orange_amsterdam | 6.775 |
| 5.75, 94.38, 2.95 | Villa_far/brick_orange_amsterdam | 6.775 |
| 6.50, 94.29, 2.95 | Villa_far/brick_orange_amsterdam | 5.016 |
| 6.50, 97.95, 0.85 | Villa_far/brick_orange_amsterdam | 5.016 |
| 6.39, 99.19, 2.72 | Villa_far/brick_orange_amsterdam | 0.12 |
| 6.39, 99.19, 1.31 | Villa_far/brick_orange_amsterdam | 0.12 |
| 5.30, 98.63, 0.85 | Villa_far/brick_orange_amsterdam | 3.113 |
| 5.75, 101.06, 0.85 | Villa_far/brick_orange_amsterdam | 1.2 |
| 6.50, 99.19, 0.85 | Villa_far/brick_orange_amsterdam | 3.113 |
| 5.75, 101.30, 0.85 | Villa_far/brick_orange_amsterdam | 1.071 |
| 5.30, 101.01, 0.81 | Villa_far/brick_orange_amsterdam | 1.049 |
| 5.30, 99.00, -3.85 | Villa_far/brick_orange_amsterdam | 2.388 |
| 5.30, 101.01, -3.51 | Villa_far/brick_orange_amsterdam | 1.394 |

(168 more in the JSON)

## seam (info, 553)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.35, 100.26, -4.57 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 6.5 | 42 | 90 |
| -0.55, 97.34, 8.95 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 9.2 | 40 | 90 |
| -5.78, 101.25, 1.38 | Villa_far/wood_varnished + Villa_far/zinc_gutter | 0.34 | 38 | 35.6 |
| -5.95, 100.77, 7.24 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 5.95 | 34 | 90 |
| -7.55, 97.23, -2.55 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 8.95 | 34 | 90 |
| 6.55, 100.99, 0.74 | Villa_far/concrete_white + Villa_far/zinc_gutter | 0.28 | 32 | 90 |
| 6.56, 98.01, 0.74 | Villa_far/concrete_white + Villa_far/zinc_gutter | 0.28 | 32 | 90 |
| -5.69, 97.96, 1.35 | Villa_far/concrete_white + Villa_far/zinc_gutter | 0.28 | 32 | 90 |
| -2.53, 101.42, 8.32 | Villa_far/wood_varnished + Villa_far/zinc_gutter | 0.41 | 32 | 33.7 |
| 5.24, 100.38, -0.19 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 7.04 | 28 | 90 |
| -0.38, 103.90, 8.39 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.73 | 28 | 90 |
| -5.59, 103.74, 2.89 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.78 | 28 | 90 |
| 6.21, 97.16, -5.57 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 3.97 | 27 | 90 |
| -6.04, 100.77, 6.40 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.55 | 26 | 90 |
| -5.70, 101.60, 1.35 | Villa_far/roof_tiles_flat_dark + Villa_far/zinc_gutter | 0.32 | 26 | 35.6 |
| 1.99, 97.34, 8.95 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 5.4 | 25 | 90 |
| -7.55, 97.23, -3.60 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 5.15 | 25 | 90 |
| -7.55, 97.23, 0.40 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 4.95 | 25 | 90 |
| 5.69, 100.56, 6.63 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.58 | 24 | 90 |
| 5.69, 103.59, 5.64 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 2.98 | 24 | 90 |
| 6.44, 100.43, 2.72 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.81 | 24 | 90 |
| 5.24, 102.85, -0.55 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 2.88 | 24 | 90 |
| 4.28, 99.84, 7.04 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 3.61 | 24 | 90 |
| -6.94, 102.95, -2.37 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 3.16 | 24 | 90 |
| -5.59, 100.67, 3.07 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 4.93 | 24 | 90 |
| -1.19, 97.34, 8.95 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 5.4 | 24 | 90 |
| -6.15, 97.18, 6.81 | Villa_far/concrete_white + Villa_far/wood_frame_white | 5.11 | 24 | 90 |
| 5.70, 97.11, 6.67 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 5.15 | 23 | 90 |
| -6.21, 97.18, 1.56 | Villa_far/concrete_white + Villa_far/wood_frame_white | 5.75 | 23 | 90 |
| -5.80, 104.61, 2.30 | Villa_far/roof_tiles_flat_dark + Villa_far/wood_varnished | 30.44 | 23 | 90 |
| 7.60, 96.03, -2.83 | Villa_far/brick_orange_amsterdam + Villa_far/concrete_white | 1.66 | 22 | 90 |
| 7.60, 97.49, 1.04 | Villa_far/brick_orange_amsterdam + Villa_far/concrete_white | 1.64 | 22 | 90 |
| -4.90, 97.26, 6.80 | Villa_far/brick_orange_amsterdam + Villa_far/wood_frame_white | 6.12 | 22 | 90 |
| -6.25, 97.78, 1.50 | Villa_far/concrete_white + Villa_far/concrete_white | 6.13 | 22 | 90 |
| -6.21, 97.18, 3.24 | Villa_far/concrete_white + Villa_far/wood_frame_white | 5.75 | 22 | 90 |
| -6.21, 97.18, 4.92 | Villa_far/concrete_white + Villa_far/wood_frame_white | 5.75 | 22 | 90 |
| 5.75, 97.96, 6.80 | Villa_far/brick_orange_amsterdam + Villa_far/concrete_white | 3.02 | 20 | 90 |
| 5.69, 103.29, 3.25 | Villa_far/brick_orange_amsterdam + Villa_far/wood_varnished | 2.83 | 20 | 90 |
| 7.60, 95.91, 1.06 | Villa_far/brick_orange_amsterdam + Villa_far/concrete_white | 1.64 | 20 | 90 |
| 7.60, 97.62, -2.83 | Villa_far/brick_orange_amsterdam + Villa_far/concrete_white | 1.66 | 20 | 90 |

(513 more in the JSON)

## opening (info, 466)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.75, 94.38, 7.05 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.43 |
| 5.75, 94.38, 6.62 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1 |
| 5.75, 94.38, 5.62 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 2.72 |
| 5.75, 95.55, 7.10 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 2.075 |
| 5.75, 99.31, 6.72 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.43 |
| 5.75, 99.31, 6.65 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.037 |
| 5.75, 97.58, 5.62 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.212 |
| 5.75, 97.58, 3.00 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 2.508 |
| 5.75, 101.06, 4.57 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.32 |
| 5.75, 101.30, 6.96 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.752 |
| 5.75, 102.56, 6.49 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.752 |
| 5.75, 101.30, 4.67 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.728 |
| 5.75, 101.30, 3.27 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.05 |
| 5.75, 101.30, 3.20 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.8 |
| 5.75, 101.30, 2.40 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.398 |
| 5.75, 101.30, 0.90 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.197 |
| 5.75, 102.56, 0.90 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.197 |
| 5.75, 102.56, 6.09 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.709 |
| 5.75, 102.56, 5.59 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.833 |
| 5.75, 102.56, 4.67 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.186 |
| 5.75, 103.95, 4.85 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.658 |
| 5.75, 103.95, 4.76 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.186 |
| 5.80, 94.29, 2.95 | Villa_far/brick_orange_amsterdam | 0 + 0 + 1 | 0.75 |
| 6.50, 94.17, 2.89 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.228 |
| 6.50, 94.17, 2.67 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.413 |
| 6.50, 94.17, 1.26 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.453 |
| 6.50, 99.24, 2.95 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.7 |
| 6.50, 100.93, 2.95 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.175 |
| 5.69, 101.06, 0.85 | Villa_far/brick_orange_amsterdam | 0 + 0 + -1 | 0.45 |
| 5.47, 102.13, 0.85 | Villa_far/brick_orange_amsterdam | 0 + 0 + -1 | 0.45 |
| 5.30, 98.09, -3.85 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.675 |
| 5.30, 101.01, 0.83 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.042 |
| 5.30, 101.01, -0.14 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.007 |
| 5.30, 102.31, 0.56 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.007 |
| 5.30, 102.31, -0.24 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.358 |
| 5.30, 102.31, -1.95 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.554 |
| 5.30, 101.01, -2.50 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.057 |
| 5.30, 102.31, -2.50 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 1.057 |
| 5.30, 101.01, -3.79 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.337 |
| 5.30, 102.31, -3.68 | Villa_far/brick_orange_amsterdam | 1 + 0 + 0 | 0.337 |

(426 more in the JSON)

## backtoback (info, 15)

| at | parts | area |
|---|---|---|
| 6.65, 97.73, -4.45 | Villa_far/concrete_white + Villa_far/concrete_white | 0.0073 |
| 6.43, 97.74, -4.45 | Villa_far/concrete_white + Villa_far/concrete_white | 0.02821 |
| -2.00, 100.81, -4.36 | Villa_far/wood_varnished + Villa_far/wood_varnished | 0.00006 |
| -11.42, 95.40, -5.83 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.01479 |
| -11.40, 95.57, -5.84 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.01501 |
| -11.43, 95.64, -5.83 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00028 |
| -11.43, 95.69, -5.83 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00006 |
| -11.41, 98.19, -5.84 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00386 |
| -11.40, 98.23, -5.85 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00386 |
| -9.61, 95.40, -3.07 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.01467 |
| -9.63, 95.57, -3.06 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.01489 |
| -9.60, 95.64, -3.08 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00028 |
| -9.60, 95.69, -3.08 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00006 |
| -9.62, 98.19, -3.07 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00382 |
| -9.63, 98.23, -3.06 | Villa_far/metal_green_veranda + Villa_far/metal_green_veranda | 0.00382 |


Nodes: Villa_far. Distances: {"Villa":70,"Villa_courses":70,"Villa_far":2000,"Villa_lod2":2000}. Quantum 0.133 mm. Offset 0,90,0.
