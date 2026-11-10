# Mesh audit (packed): vanbuuren.lod2

1,463 triangles, 1,412 welded vertices, 1,302 open edges, 562,436 rays, 1396 ms.

**71 blocking**, 294 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 16 |
| crossing | block | 20 |
| leak | block | 35 |
| sliver | warn | 205 |
| nonmanifold | warn | 18 |
| tjunction | warn | 71 |
| seam | info | 314 |
| opening | info | 259 |
| backtoback | info | 107 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 5.69, 96.58, 5.67 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 0 | 195.1 | 3.3 | 2000 | 15.39 | false | 1 + -0.06 + 0 |
| 5.69, 100.19, 6.64 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 0 | 158.4 | 4 | 2000 | 15.39 | false | 1 + 0.07 + 0 |
| 5.71, 99.84, 5.46 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 0 | 41.6 | 4.9 | 2000 | 15.39 | false | 1 + 0.07 + -0.05 |
| 5.68, 100.30, 5.45 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 0 | 164.7 | 4.9 | 2000 | 15.39 | false | 1 + 0.07 + -0.05 |
| 5.24, 99.87, -2.46 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 0 | 221.7 | 2.9 | 2000 | 15.39 | false | 1 + -0.05 + 0 |
| 0.73, 95.62, 8.94 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 0 | 211.1 | 3.4 | 2000 | 15.39 | false | 0.04 + -0.04 + 1 |
| 0.15, 95.62, 8.96 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 0 | 39.2 | 3.4 | 2000 | 15.39 | false | 0.04 + -0.04 + 1 |
| -0.69, 96.81, 8.94 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 0 | 203.8 | 3.1 | 2000 | 15.39 | false | 0 + 0.05 + 1 |
| -7.50, 95.95, -3.27 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 0 | 2468.7 | 3.3 | 2000 | 15.39 | false | -1 + -0.06 + 0 |
| -7.54, 96.70, -2.56 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 0 | 194.2 | 3.3 | 2000 | 15.39 | false | -1 + -0.06 + 0 |
| 8.25, 97.73, -1.74 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0 | 8478.8 | 0 | 2000 | 15.39 | false | 0 + -1 + 0 |
| 7.98, 97.73, -1.59 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0 | 1970.4 | 0 | 2000 | 15.39 | false | 0 + -1 + 0 |
| 7.81, 97.73, -0.91 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0 | 10449.2 | 0 | 2000 | 15.39 | false | 0 + -1 + 0 |
| -6.19, 96.41, 3.23 | Villa_lod2/concrete_white + Villa_lod2/wood_frame_white | 0 | 201.4 | 2.4 | 2000 | 15.39 | false | -1 + -0.04 + 0 |
| 7.86, 95.33, -0.59 | Villa_lod2/stone_blue + Villa_lod2/stone_blue | 0 | 2087.8 | 3.5 | 2000 | 15.39 | false | 0 + 1 + 0 |
| 7.77, 95.33, -1.04 | Villa_lod2/stone_blue + Villa_lod2/stone_blue | 0 | 3372.4 | 3.5 | 2000 | 15.39 | false | 0 + 1 + 0 |

## crossing (block, 20)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 5.70, 95.50, 6.25 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 7.3 | 1.1 |
| 5.24, 99.80, -0.19 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 8.8 | 3.1 |
| 5.24, 102.69, -0.55 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 9 | 1 |
| 5.28, 103.15, 0.11 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/brick_pattern | 9.7 | 0.1 |
| 5.28, 103.18, 0.08 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/brick_pattern | 9.7 | 8.9 |
| 5.24, 102.69, -1.91 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 9 | 1 |
| 5.28, 103.18, -2.74 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/brick_pattern | 7.5 | 9 |
| -6.94, 102.76, -0.98 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 7.7 | 1 |
| -1.19, 96.90, 8.95 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 8 | 185.9 |
| -0.83, 97.56, 8.90 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 8 | 52.7 |
| -1.19, 97.83, 8.95 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 8 | 0.1 |
| 2.33, 96.33, 8.90 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 6.5 | 144.5 |
| -6.04, 99.64, 7.04 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 5.9 | 6.1 |
| -5.99, 100.29, 6.80 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 5.9 | 146.4 |
| -6.04, 99.72, 7.08 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 5.9 | 11.8 |
| -6.04, 99.79, 7.11 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 5.9 | 2 |
| -5.99, 101.10, 7.01 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 6.2 | 20 |
| -6.04, 101.14, 6.55 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 6.2 | 1 |
| -6.04, 101.18, 6.55 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 6.2 | 6.5 |
| -7.50, 97.45, -3.28 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/glass_window | 6.2 | 49.4 |

## leak (block, 35)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 5.75, 101.24, 0.85 | Villa_lod2/brick_orange_amsterdam | 12 | 1 + 0 + 0 | 0.237 |
| 5.75, 103.89, 3.25 | Villa_lod2/brick_orange_amsterdam | 30 | 1 + 0 + 0 | 1.404 |
| 6.38, 100.84, 2.72 | Villa_lod2/brick_orange_amsterdam | 12 | 0.54 + 0.04 + 0.84 | 1.704 |
| 6.50, 99.24, 1.31 | Villa_lod2/brick_orange_amsterdam | 12 | 0.96 + 0.07 + 0.28 | 1.704 |
| 4.28, 100.15, 6.99 | Villa_lod2/brick_orange_amsterdam | 12 | -0.55 + 0.08 + 0.83 | 1.331 |
| 5.24, 100.15, 6.99 | Villa_lod2/brick_orange_amsterdam | 12 | 0.59 + 0.07 + 0.81 | 1.331 |
| -6.99, 102.31, -1.13 | Villa_lod2/brick_orange_amsterdam | 4 | -0.97 + 0.25 + -0.08 | 1.392 |
| -5.65, 102.73, 6.24 | Villa_lod2/brick_orange_amsterdam | 12 | -1 + 0 + 0 | 1.497 |
| 7.49, 97.59, -1.97 | Villa_lod2/brick_orange_amsterdam | 12 | 0 + 0 + 1 | 2.502 |
| 7.37, 97.49, -1.85 | Villa_lod2/brick_orange_amsterdam | 12 | 0 + 0 + 1 | 2.502 |
| 2.85, 98.00, 8.51 | Villa_lod2/brick_orange_amsterdam | 12 | 1 + 0 + 0 | 0.55 |
| -7.25, 98.02, -4.20 | Villa_lod2/brick_orange_amsterdam | 30 | 0 + 0 + -1 | 0.6 |
| 5.75, 103.95, 4.67 | Villa_lod2/brick_pattern | 12 | 1 + 0 + 0 | 0.844 |
| 5.75, 103.95, 3.25 | Villa_lod2/brick_pattern | 12 | 1 + 0 + 0 | 1.364 |
| 5.30, 104.89, -1.77 | Villa_lod2/brick_pattern | 4 | 1 + 0 + 0 | 2.735 |
| 0.62, 106.73, 8.45 | Villa_lod2/brick_pattern | 30 | 0 + 0 + 1 | 3.714 |
| 0.68, 106.73, 8.45 | Villa_lod2/brick_pattern | 30 | 0 + 0 + 1 | 3.714 |
| -5.65, 105.08, 2.66 | Villa_lod2/brick_pattern | 4 | -1 + 0 + 0 | 3.28 |
| -5.65, 103.99, 5.44 | Villa_lod2/brick_pattern | 12 | -1 + 0 + 0 | 3.281 |
| -6.50, 101.65, 6.82 | Villa_lod2/concrete_white | 30 | 0 + -1 + 0 | 0.93 |
| 4.00, 102.22, 0.97 | Villa_lod2/roof_tiles_flat_dark | 12 | 0.02 + 0.53 + 0.85 | 1.9 |
| 1.58, 105.44, -1.24 | Villa_lod2/roof_tiles_flat_dark | 4 | 0 + 0.56 + 0.83 | 3.918 |
| -0.68, 105.44, -1.24 | Villa_lod2/roof_tiles_flat_dark | 30 | 0 + 0.56 + 0.83 | 6.918 |
| 1.52, 106.72, 3.83 | Villa_lod2/roof_tiles_flat_dark | 4 | -0.02 + 1 + 0 | 5.132 |
| -0.68, 105.44, -1.46 | Villa_lod2/roof_tiles_flat_dark | 30 | 0 + 0.56 + -0.83 | 6.918 |
| 1.78, 105.44, -1.46 | Villa_lod2/roof_tiles_flat_dark | 30 | 0 + 0.56 + -0.83 | 3.918 |
| 1.68, 105.44, -1.25 | Villa_lod2/roof_tiles_flat_dark | 12 | -0.04 + 1 + 0 | 3.923 |
| -7.09, 103.30, -6.83 | Villa_lod2/roof_tiles_flat_dark | 12 | -0.44 + 0.61 + -0.66 | 7.241 |
| 0.78, 106.71, 6.64 | Villa_lod2/wood_varnished | 30 | 0.99 + -0.13 + 0.01 | 4.83 |
| 2.94, 106.66, 3.83 | Villa_lod2/wood_varnished | 4 | -0.01 + 0.28 + 0.96 | 5.115 |
| 0.53, 106.71, 6.64 | Villa_lod2/wood_varnished | 30 | -0.99 + -0.13 + 0.01 | 4.83 |
| 0.16, 105.50, -1.20 | Villa_lod2/wood_varnished | 30 | 0 + -0.56 + 0.83 | 1.264 |
| -10.28, 98.28, -4.13 | Villa_lod2/metal_green_veranda | 12 | -0.84 + 0 + 0.54 | 3.302 |
| 6.61, 101.00, 0.79 | Villa_lod2/zinc_gutter | 30 | 1 + 0 + 0 | 0.034 |
| 6.35, 97.60, -7.44 | Villa_lod2/zinc_gutter | 12 | 0 + 0 + -1 | 0.034 |

## sliver (warn, 205)

| at | part | aspect | longest |
|---|---|---|---|
| 5.75, 101.22, 5.01 | Villa_lod2/brick_orange_amsterdam | 46 | 3.807 |
| 5.75, 102.48, 3.27 | Villa_lod2/brick_orange_amsterdam | 102 | 2.276 |
| 5.75, 102.92, 3.28 | Villa_lod2/brick_orange_amsterdam | 52 | 2.588 |
| 6.46, 98.08, 2.80 | Villa_lod2/brick_orange_amsterdam | 63 | 6.722 |
| -5.65, 99.33, 3.98 | Villa_lod2/brick_orange_amsterdam | 77 | 4.831 |
| -5.65, 99.35, 4.80 | Villa_lod2/brick_orange_amsterdam | 163 | 3.783 |
| -5.65, 98.03, 1.36 | Villa_lod2/brick_orange_amsterdam | 387 | 5.49 |
| -5.65, 98.64, 1.33 | Villa_lod2/brick_orange_amsterdam | 69 | 6.489 |
| 1.05, 95.63, 8.92 | Villa_lod2/brick_orange_amsterdam | 428 | 2.683 |
| -6.18, 95.37, 2.53 | Villa_lod2/concrete_white | 48 | 1.983 |
| -6.18, 95.37, 3.65 | Villa_lod2/concrete_white | 161 | 3.643 |
| -6.18, 95.37, 4.21 | Villa_lod2/concrete_white | 43 | 5.117 |
| -6.18, 97.72, 4.29 | Villa_lod2/concrete_white | 52 | 1.703 |
| 0.73, 106.75, 1.93 | Villa_lod2/roof_tiles_flat_dark | 517 | 5.455 |
| 0.69, 106.80, 3.62 | Villa_lod2/roof_tiles_flat_dark | 54 | 10.2 |
| 0.57, 106.75, 5.33 | Villa_lod2/roof_tiles_flat_dark | 444 | 5.055 |
| 0.61, 106.80, 3.52 | Villa_lod2/roof_tiles_flat_dark | 54 | 10.2 |
| 2.38, 101.26, 7.23 | Villa_lod2/roof_tiles_flat_dark | 71 | 8.547 |
| -0.85, 101.23, 7.25 | Villa_lod2/roof_tiles_flat_dark | 1252 | 11.7 |
| -1.22, 105.24, -1.59 | Villa_lod2/roof_tiles_flat_dark | 79 | 3.454 |
| -6.71, 103.38, -7.07 | Villa_lod2/roof_tiles_flat_dark | 40 | 7.244 |
| -4.68, 103.41, -8.38 | Villa_lod2/roof_tiles_flat_dark | 40 | 7.244 |
| -6.63, 103.41, -6.95 | Villa_lod2/roof_tiles_flat_dark | 40 | 7.244 |
| -4.60, 103.38, -8.26 | Villa_lod2/roof_tiles_flat_dark | 40 | 7.244 |
| 5.69, 99.35, 6.24 | Villa_lod2/wood_varnished | 83 | 0.635 |
| 5.69, 100.97, 6.24 | Villa_lod2/wood_varnished | 82 | 0.635 |
| 6.44, 99.23, 2.25 | Villa_lod2/wood_varnished | 117 | 0.753 |
| 6.44, 100.85, 2.25 | Villa_lod2/wood_varnished | 116 | 0.753 |
| 6.44, 99.23, 2.03 | Villa_lod2/wood_varnished | 41 | 1.36 |
| 6.44, 100.85, 2.03 | Villa_lod2/wood_varnished | 40 | 1.36 |
| 5.24, 102.35, -1.00 | Villa_lod2/wood_varnished | 107 | 0.721 |
| 5.24, 103.03, -1.00 | Villa_lod2/wood_varnished | 106 | 0.721 |
| 5.24, 98.67, -0.69 | Villa_lod2/wood_varnished | 132 | 0.8 |
| 5.24, 100.97, -0.69 | Villa_lod2/wood_varnished | 131 | 0.8 |
| 5.24, 98.67, -0.94 | Villa_lod2/wood_varnished | 43 | 1.487 |
| 5.24, 100.97, -0.94 | Villa_lod2/wood_varnished | 43 | 1.487 |
| 5.24, 98.67, -1.20 | Villa_lod2/wood_varnished | 496 | 1.552 |
| 5.24, 100.97, -1.20 | Villa_lod2/wood_varnished | 493 | 1.552 |
| 5.24, 98.67, -1.44 | Villa_lod2/wood_varnished | 99 | 2.208 |
| 5.24, 100.97, -1.44 | Villa_lod2/wood_varnished | 99 | 2.208 |

(165 more in the JSON)

## nonmanifold (warn, 18)

| at | part | uses |
|---|---|---|
| 6.36, 100.99, 2.24 | Villa_lod2/concrete_white | 4 |
| 7.54, 97.49, 0.27 | Villa_lod2/concrete_white | 3 |
| 7.54, 97.49, 1.08 | Villa_lod2/concrete_white | 3 |
| 7.54, 96.02, 0.27 | Villa_lod2/concrete_white | 3 |
| 7.54, 96.02, 1.08 | Villa_lod2/concrete_white | 3 |
| 7.54, 97.62, -3.66 | Villa_lod2/concrete_white | 3 |
| 7.54, 97.62, -2.84 | Villa_lod2/concrete_white | 3 |
| 7.54, 96.14, -3.66 | Villa_lod2/concrete_white | 3 |
| 7.54, 96.14, -2.84 | Villa_lod2/concrete_white | 3 |
| 2.12, 101.24, 8.55 | Villa_lod2/concrete_white | 3 |
| -0.86, 101.24, 8.55 | Villa_lod2/concrete_white | 3 |
| 2.12, 99.28, 8.55 | Villa_lod2/concrete_white | 3 |
| -0.86, 99.28, 8.55 | Villa_lod2/concrete_white | 3 |
| -7.10, 101.30, -0.17 | Villa_lod2/concrete_white | 3 |
| -7.10, 101.30, -3.45 | Villa_lod2/concrete_white | 3 |
| -7.10, 99.40, -0.17 | Villa_lod2/concrete_white | 3 |
| -7.10, 99.40, -3.45 | Villa_lod2/concrete_white | 3 |
| 0.94, 101.80, 1.21 | Villa_lod2/roof_tiles_flat_dark | 3 |

## tjunction (warn, 71)

| at | part | edge_m |
|---|---|---|
| 5.75, 94.80, 7.10 | Villa_lod2/brick_orange_amsterdam | 4.932 |
| 5.75, 101.06, 2.95 | Villa_lod2/brick_orange_amsterdam | 6.245 |
| 5.75, 101.86, 7.10 | Villa_lod2/brick_orange_amsterdam | 1.263 |
| 5.75, 102.13, 0.85 | Villa_lod2/brick_orange_amsterdam | 1.263 |
| 5.75, 94.38, 2.95 | Villa_lod2/brick_orange_amsterdam | 6.775 |
| 6.50, 97.95, 0.85 | Villa_lod2/brick_orange_amsterdam | 6.891 |
| 6.50, 94.29, 2.95 | Villa_lod2/brick_orange_amsterdam | 6.891 |
| 5.30, 101.01, 0.85 | Villa_lod2/brick_orange_amsterdam | 3.113 |
| 5.75, 101.06, 0.85 | Villa_lod2/brick_orange_amsterdam | 1.2 |
| 5.75, 101.30, 0.85 | Villa_lod2/brick_orange_amsterdam | 1.071 |
| 5.30, 99.00, -3.85 | Villa_lod2/brick_orange_amsterdam | 3.063 |
| 5.30, 101.01, -3.85 | Villa_lod2/brick_orange_amsterdam | 2.944 |
| 7.60, 94.76, -3.85 | Villa_lod2/brick_orange_amsterdam | 2.278 |
| 7.60, 96.00, -2.09 | Villa_lod2/brick_orange_amsterdam | 2.2 |
| 7.49, 97.64, -1.97 | Villa_lod2/brick_orange_amsterdam | 1.48 |
| 7.60, 95.44, 1.20 | Villa_lod2/brick_orange_amsterdam | 4.148 |
| 7.60, 96.00, -3.85 | Villa_lod2/brick_orange_amsterdam | 3.108 |
| -5.65, 95.10, 6.85 | Villa_lod2/brick_orange_amsterdam | 7.122 |
| -2.48, 101.39, 8.45 | Villa_lod2/brick_orange_amsterdam | 7.135 |
| 3.72, 94.76, 8.45 | Villa_lod2/brick_orange_amsterdam | 6.748 |
| -2.48, 101.77, 8.45 | Villa_lod2/brick_orange_amsterdam | 1.55 |
| 3.72, 101.86, 8.45 | Villa_lod2/brick_orange_amsterdam | 1.55 |
| -0.38, 103.62, 8.45 | Villa_lod2/brick_orange_amsterdam | 1.325 |
| 1.70, 103.62, 8.45 | Villa_lod2/brick_orange_amsterdam | 1.325 |
| 3.72, 94.80, 7.10 | Villa_lod2/brick_orange_amsterdam | 7.095 |
| 3.72, 101.39, 8.45 | Villa_lod2/brick_orange_amsterdam | 7.095 |
| 5.75, 99.31, 7.10 | Villa_lod2/brick_orange_amsterdam | 7.055 |
| -7.00, 94.88, -4.70 | Villa_lod2/brick_orange_amsterdam | 4.48 |
| -7.00, 101.15, -4.70 | Villa_lod2/brick_orange_amsterdam | 2.2 |
| -7.00, 94.80, 1.30 | Villa_lod2/brick_orange_amsterdam | 6.68 |
| -5.65, 101.14, 1.30 | Villa_lod2/brick_orange_amsterdam | 8.153 |
| -7.00, 101.45, 1.30 | Villa_lod2/brick_orange_amsterdam | 8.153 |
| -5.65, 95.10, 6.85 | Villa_lod2/brick_orange_amsterdam | 4.664 |
| -5.65, 94.80, 1.30 | Villa_lod2/brick_orange_amsterdam | 6.489 |
| -5.65, 101.77, 6.85 | Villa_lod2/brick_orange_amsterdam | 1.55 |
| -5.65, 103.95, 1.94 | Villa_lod2/brick_orange_amsterdam | 1.59 |
| -5.65, 102.95, 1.30 | Villa_lod2/brick_orange_amsterdam | 1.263 |
| -5.65, 103.95, 2.89 | Villa_lod2/brick_orange_amsterdam | 1.45 |
| -5.65, 103.95, 4.77 | Villa_lod2/brick_orange_amsterdam | 1.45 |
| -9.49, 94.86, -7.23 | Villa_lod2/brick_orange_amsterdam | 8.271 |

(31 more in the JSON)

## seam (info, 314)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -6.25, 97.80, 6.84 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 6.6 | 23 | 69.1 |
| 1.88, 99.28, 8.36 | Villa_lod2/concrete_white + Villa_lod2/wood_varnished | 5.66 | 22 | 90 |
| -6.91, 99.40, -0.43 | Villa_lod2/concrete_white + Villa_lod2/wood_varnished | 6.27 | 22 | 90 |
| 2.85, 97.98, 8.88 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 7.78 | 21 | 45.4 |
| 5.45, 103.82, -0.17 | Villa_lod2/roof_tiles_flat_dark + Villa_lod2/wood_varnished | 11.71 | 19 | 5.6 |
| 1.88, 101.24, 8.36 | Villa_lod2/concrete_white + Villa_lod2/wood_varnished | 5.66 | 18 | 90 |
| -6.91, 101.30, -0.49 | Villa_lod2/concrete_white + Villa_lod2/wood_varnished | 6.27 | 18 | 90 |
| 6.26, 97.73, -5.36 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 2.04 | 17 | 20.8 |
| -7.00, 100.68, -4.53 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 6.68 | 17 | 62.7 |
| -7.60, 98.01, -4.20 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 6.84 | 17 | 33.1 |
| -6.10, 98.82, 6.64 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/brick_orange_amsterdam | 4.4 | 16 | 66.8 |
| 6.61, 98.01, 0.77 | Villa_lod2/concrete_white + Villa_lod2/zinc_gutter | 0.27 | 15 | 89.8 |
| -5.71, 97.96, 1.35 | Villa_lod2/concrete_white + Villa_lod2/zinc_gutter | 0.27 | 15 | 89.8 |
| -5.71, 101.49, 1.34 | Villa_lod2/wood_varnished + Villa_lod2/zinc_gutter | 0.38 | 15 | 36.2 |
| -5.65, 97.96, 2.62 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 11.06 | 14 | 86.3 |
| 7.54, 96.02, 0.47 | Villa_lod2/concrete_white + Villa_lod2/wood_frame_white | 1.51 | 14 | 90 |
| -6.09, 101.65, 6.07 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 4.13 | 13 | 64.9 |
| -5.70, 101.59, 1.35 | Villa_lod2/roof_tiles_flat_dark + Villa_lod2/zinc_gutter | 0.32 | 13 | 34 |
| 5.75, 97.95, 6.81 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 2.72 | 12 | 69.7 |
| 7.60, 97.49, 1.04 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 0.67 | 12 | 90 |
| 7.60, 97.62, -2.87 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 0.68 | 12 | 90 |
| 1.78, 98.00, 8.45 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 10.03 | 12 | 79.8 |
| 7.54, 97.62, -3.64 | Villa_lod2/concrete_white + Villa_lod2/wood_frame_white | 1.55 | 12 | 90 |
| 7.54, 96.14, -3.46 | Villa_lod2/concrete_white + Villa_lod2/wood_frame_white | 1.55 | 12 | 90 |
| 5.24, 100.42, -0.19 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 4.65 | 11 | 90 |
| 7.60, 95.05, -0.20 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/stone_blue | 2.9 | 11 | 90 |
| -0.38, 103.93, 8.39 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 3.41 | 11 | 90 |
| -5.59, 103.77, 2.89 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 3.33 | 11 | 90 |
| 0.96, 97.83, 8.95 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_frame_white | 1.95 | 11 | 13.3 |
| -2.54, 101.85, 6.86 | Villa_lod2/concrete_white + Villa_lod2/roof_tiles_flat_dark | 8.41 | 11 | 57.5 |
| 5.75, 102.00, 6.74 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 3.79 | 10 | 44.5 |
| 7.60, 96.14, -2.87 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 0.05 | 10 | 90 |
| -5.59, 100.59, 3.07 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 3.17 | 10 | 90 |
| 7.54, 97.49, 0.31 | Villa_lod2/concrete_white + Villa_lod2/wood_frame_white | 1.51 | 10 | 90 |
| -5.43, 106.79, 3.70 | Villa_lod2/roof_tiles_flat_dark + Villa_lod2/wood_varnished | 1.56 | 10 | 25.3 |
| 7.60, 97.71, -3.84 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 5.05 | 9 | 90 |
| 6.27, 94.79, -7.51 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/brick_orange_amsterdam | 2.99 | 9 | 81.3 |
| -2.50, 101.46, 6.85 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/wood_varnished | 2.89 | 9 | 33.3 |
| -7.00, 100.72, -4.64 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/roof_tiles_flat_dark | 2.21 | 9 | 57 |
| -5.65, 101.85, 5.57 | Villa_lod2/brick_orange_amsterdam + Villa_lod2/concrete_white | 2.79 | 9 | 78 |

(274 more in the JSON)

## opening (info, 259)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.75, 94.38, 7.05 | Villa_lod2/brick_orange_amsterdam | 0.99 + 0.11 + 0 | 4.15 |
| 5.75, 99.36, 7.10 | Villa_lod2/brick_orange_amsterdam | 0.97 + 0 + -0.25 | 1.75 |
| 5.75, 95.55, 6.67 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 2.078 |
| 5.75, 101.24, 7.10 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 0.237 |
| 5.75, 102.56, 6.49 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 0.752 |
| 5.75, 103.67, 5.70 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.536 |
| 5.75, 102.60, 0.89 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.685 |
| 5.75, 103.90, 5.43 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 0.954 |
| 5.74, 102.61, 2.45 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 1.02 |
| 5.80, 94.29, 2.95 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 0.75 |
| 6.50, 94.17, 2.90 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 2.095 |
| 6.50, 101.01, 0.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 3.113 |
| 5.69, 101.06, 0.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 0.45 |
| 5.47, 102.13, 0.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 0.45 |
| 5.30, 101.96, 0.82 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.3 |
| 5.30, 101.06, -3.84 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.343 |
| 3.90, 101.39, -3.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 2.944 |
| 7.60, 93.77, 1.20 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.715 |
| 7.60, 95.44, -0.66 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.48 |
| 7.60, 93.72, 1.15 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 5.05 |
| 7.60, 95.79, 1.20 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 2.2 |
| 7.60, 96.05, -3.85 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.87 |
| 7.60, 97.70, 1.20 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 0.233 |
| 7.57, 96.09, -0.61 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 2.203 |
| 7.57, 96.09, -2.09 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 2.203 |
| 7.55, 93.72, 1.20 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 1.1 |
| 6.50, 93.77, 1.20 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 4.148 |
| 7.55, 94.76, -3.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 1.33 |
| 6.27, 94.78, -3.98 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 3.617 |
| 6.27, 94.83, -7.55 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 0.654 |
| 6.27, 94.83, -3.93 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 2.979 |
| 6.27, 95.49, -7.55 | Villa_lod2/brick_orange_amsterdam | 0.98 + 0 + 0.22 | 2.325 |
| 6.27, 97.78, -7.50 | Villa_lod2/brick_orange_amsterdam | 1 + 0 + 0 | 1.866 |
| 6.27, 95.49, -4.72 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + -1 | 2.328 |
| 6.27, 95.49, -5.34 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 2.328 |
| -5.60, 94.65, 6.85 | Villa_lod2/brick_orange_amsterdam | 0 + 0.14 + 0.99 | 3.17 |
| -2.48, 94.64, 6.90 | Villa_lod2/brick_orange_amsterdam | -1 + 0 + 0 | 1.6 |
| -2.43, 94.64, 8.45 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 6.2 |
| 2.14, 99.13, 8.45 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 3.109 |
| -0.92, 99.17, 8.45 | Villa_lod2/brick_orange_amsterdam | 0 + 0 + 1 | 2.263 |

(219 more in the JSON)

## backtoback (info, 107)

| at | parts | area |
|---|---|---|
| 6.15, 101.06, 2.71 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.80206 |
| 6.72, 101.10, 1.32 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.83443 |
| 6.40, 101.10, 0.52 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.24886 |
| 7.52, 97.49, 0.36 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.04937 |
| 7.64, 97.49, 0.76 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.0375 |
| 7.46, 97.49, 0.56 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.065 |
| 7.58, 97.49, 0.96 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.04937 |
| 7.52, 96.02, 0.36 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.04937 |
| 7.64, 96.02, 0.76 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.0375 |
| 7.46, 96.02, 0.56 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.065 |
| 7.58, 96.02, 0.96 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.04937 |
| 7.52, 97.62, -3.57 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.05065 |
| 7.64, 97.62, -3.16 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.03874 |
| 7.46, 97.62, -3.37 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.06623 |
| 7.58, 97.62, -2.95 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.05065 |
| 7.52, 96.14, -3.57 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.05065 |
| 7.64, 96.14, -3.16 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.03874 |
| 7.46, 96.14, -3.37 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.06623 |
| 7.58, 96.14, -2.95 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.05065 |
| 1.77, 101.24, 8.48 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41575 |
| 0.28, 101.24, 8.76 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.37085 |
| 1.03, 101.24, 8.34 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.46608 |
| -0.46, 101.24, 8.62 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41575 |
| 1.77, 99.28, 8.48 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41575 |
| 0.28, 99.28, 8.76 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.37085 |
| 1.03, 99.28, 8.34 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.46608 |
| -0.46, 99.28, 8.62 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41575 |
| 2.53, 98.00, 8.80 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.31285 |
| -1.18, 98.00, 9.04 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.31285 |
| -7.03, 101.30, -0.55 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.45852 |
| -7.31, 101.30, -2.20 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41339 |
| -6.89, 101.30, -1.38 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.50857 |
| -7.17, 101.30, -3.02 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.45852 |
| -7.03, 99.40, -0.55 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.45852 |
| -7.31, 99.40, -2.20 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.41339 |
| -6.89, 99.40, -1.38 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.50857 |
| -7.17, 99.40, -3.02 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 0.45852 |
| -7.66, 98.06, 0.43 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.4943 |
| -7.42, 98.06, -3.73 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 1.4943 |
| -8.84, 98.38, -3.73 | Villa_lod2/concrete_white + Villa_lod2/concrete_white | 2.59479 |

(67 more in the JSON)


Nodes: Villa_lod2. Distances: {"Villa":70,"Villa_courses":70,"Villa_far":2000,"Villa_lod2":2000}. Quantum 0.133 mm. Offset 0,90,0.
