# Mesh audit (packed): calevoet.lod2

3,528 triangles, 3,177 welded vertices, 1,924 open edges, 407,316 rays, 1523 ms.

**125 blocking**, 599 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 24 |
| depth | block | 5 |
| crossing | block | 75 |
| leak | block | 21 |
| sliver | warn | 364 |
| nonmanifold | warn | 90 |
| tjunction | warn | 145 |
| seam | info | 882 |
| opening | info | 381 |
| backtoback | info | 680 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 24)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -22.98, 54.21, 2.90 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 180.5 | 3.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -22.52, 54.48, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 20.9 | 3.6 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -21.72, 54.21, 2.90 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 180.5 | 3.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -21.21, 54.48, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 20.9 | 3.6 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -23.00, 54.46, -1.96 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 21 | 3.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -17.72, 54.20, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 30 | 2.4 | 2000 | 15.45 | false | -1 + 0 + 0 |
| 16.79, 54.30, 3.92 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 242.1 | 2.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 19.67, 54.67, 3.96 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 27.7 | 2.6 | 2000 | 15.45 | false | -1 + 0 + 0 |
| 24.05, 54.70, 3.96 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 28.4 | 2.5 | 2000 | 15.45 | false | -1 + 0 + 0 |
| 24.50, 55.85, 2.08 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 135.2 | 4.9 | 2000 | 15.45 | true | 1 + 0 + 0 |
| 24.50, 54.71, -1.03 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.55 | 33.8 | 4.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 24.50, 56.85, -1.45 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 159.2 | 5 | 2000 | 15.45 | true | 1 + 0 + 0 |
| 24.50, 54.73, -1.06 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 34.3 | 4.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 24.50, 54.81, -1.21 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 201.4 | 4.6 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 24.34, 54.24, 1.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 38 | 1.7 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 24.50, 54.79, 2.15 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 16.4 | 4.7 | 2000 | 15.45 | false | 0.08 + -0.88 + 0.46 |
| 24.49, 54.82, 2.42 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0 | 28.7 | 3.6 | 2000 | 15.45 | false | 0 + -1 + -0.06 |
| 24.30, 53.95, 1.29 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 206.3 | 3 | 2000 | 15.45 | false | 0 + 0 + -1 |
| 24.30, 53.94, -1.02 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0 | 208.1 | 3 | 2000 | 15.45 | false | 0 + 0 + -1 |
| 5.49, 56.10, -3.92 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0 | 311.8 | 2.2 | 2000 | 15.45 | false | 0 + -0.04 + -1 |
| 5.53, 56.08, -3.92 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0 | 93.6 | 2.2 | 2000 | 15.45 | false | 0 + -0.04 + -1 |
| 5.51, 53.53, -3.92 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0 | 178.9 | 3.8 | 2000 | 15.45 | false | 0 + 0.07 + -1 |
| 8.67, 56.68, -3.92 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0 | 93.6 | 2.2 | 2000 | 15.45 | false | 0 + 0.04 + -1 |
| 8.71, 56.66, -3.92 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0 | 311.8 | 2.2 | 2000 | 15.45 | false | 0 + 0.04 + -1 |

## depth (block, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 5.47, 56.68, -3.94 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 2.5 | 93.7 | 2.2 | 2000 | 15.45 | false | 0 + -0.04 + -1 |
| 5.51, 56.66, -3.94 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0.75 | 311.7 | 2.2 | 2000 | 15.45 | false | 0 + -0.04 + -1 |
| 5.53, 53.19, -3.94 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 2.5 | 55.4 | 3.8 | 2000 | 15.45 | false | 0 + 0.07 + -1 |
| 8.69, 56.10, -3.94 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 0.75 | 311.7 | 2.2 | 2000 | 15.45 | false | 0 + 0.04 + -1 |
| 8.73, 56.08, -3.94 | Station_lod2/wood_frame_dark + Station_lod2/glass_window | 2.5 | 93.7 | 2.2 | 2000 | 15.45 | false | 0 + 0.04 + -1 |

## crossing (block, 75)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -14.69, 54.51, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.6 | 2.4 |
| -14.71, 54.56, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6 | 8.6 |
| -14.08, 54.72, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6 | 2.4 |
| -13.70, 54.54, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.6 | 8.5 |
| -13.58, 54.55, 3.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.6 | 0.8 |
| -13.62, 54.51, 3.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.6 | 10.2 |
| -14.80, 54.51, 3.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6 | 11 |
| -14.56, 54.46, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 7.3 | 2.4 |
| -14.53, 54.50, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 8.6 |
| -17.76, 54.46, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 7.2 | 2.4 |
| -17.74, 54.49, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 5.8 |
| -17.72, 54.53, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 2.7 |
| -18.31, 54.65, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 2.4 |
| -17.66, 54.46, -3.99 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 11 |
| -14.46, 54.46, -3.99 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.5 | 11 |
| -3.54, 54.33, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.8 | 1 |
| -3.70, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -4.01, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -4.19, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -4.50, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -4.66, 54.33, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.8 | 1 |
| -0.50, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -0.81, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -0.99, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -1.30, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| -1.46, 54.33, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.8 | 1 |
| 2.67, 57.56, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.9 | 1 |
| 2.86, 54.33, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.8 | 1 |
| 2.70, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| 2.39, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| 2.21, 54.49, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| 1.90, 54.41, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.7 | 1 |
| 1.74, 54.33, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 6.8 | 1 |
| 5.79, 54.44, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 8.1 | 1 |
| 5.63, 54.48, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 8.1 | 1 |
| 0.30, 57.91, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 9.3 | 235.1 |
| 8.10, 54.34, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 5.5 | 8.5 |
| 1.70, 54.34, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 5.5 | 8.5 |
| -1.50, 54.34, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 5.5 | 8.5 |
| -4.70, 54.34, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 5.5 | 8.5 |

(35 more in the JSON)

## leak (block, 21)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| -21.00, 55.58, -0.78 | Station_lod2/brick_painted_white | 4 | 0.86 + -0.51 + 0.01 | 5.16 |
| -3.46, 54.07, 3.26 | Station_lod2/brick_painted_white | 4 | 0 + 0 + 1 | 0.322 |
| -4.74, 54.07, 3.26 | Station_lod2/brick_painted_white | 4 | 0 + 0 + 1 | 0.322 |
| 6.03, 54.07, 3.26 | Station_lod2/brick_painted_white | 12 | 0 + 0 + 1 | 0.311 |
| 1.71, 54.07, -4.11 | Station_lod2/brick_painted_white | 4 | 0 + 0 + -1 | 0.318 |
| 2.89, 54.07, -4.11 | Station_lod2/brick_painted_white | 4 | 0 + 0 + -1 | 0.318 |
| 24.33, 53.46, 3.93 | Station_lod2/brick_painted_white | 30 | 1 + 0 + 0 | 0.58 |
| -3.61, 54.33, 3.11 | Station_lod2/wood_frame_dark | 30 | -0.13 + -0.34 + 0.93 | 0.754 |
| -0.62, 57.57, 3.08 | Station_lod2/wood_frame_dark | 4 | 0 + -0.36 + 0.93 | 0.259 |
| 2.79, 54.33, 3.11 | Station_lod2/wood_frame_dark | 30 | -0.13 + -0.34 + 0.93 | 0.754 |
| 8.98, 57.57, 3.08 | Station_lod2/wood_frame_dark | 4 | 0 + -0.36 + 0.93 | 0.259 |
| -0.86, 57.62, -3.96 | Station_lod2/wood_frame_dark | 12 | -0.04 + -0.31 + -0.95 | 0.551 |
| 2.43, 57.61, -3.96 | Station_lod2/wood_frame_dark | 12 | -0.04 + -0.31 + -0.95 | 0.551 |
| 12.95, 54.56, 2.94 | Station_lod2/wood_frame_dark | 12 | -0.02 + -0.33 + 0.94 | 0.38 |
| 24.32, 54.71, 2.18 | Station_lod2/wood_frame_dark | 30 | 0.67 + -0.67 + 0.32 | 0.376 |
| 24.34, 54.80, 0.66 | Station_lod2/wood_frame_dark | 12 | 0.96 + -0.29 + -0.03 | 0.681 |
| 24.14, 54.14, 3.93 | Station_lod2/paint_grey_dark | 4 | 1 + 0 + 0 | 1.35 |
| 24.30, 54.75, -1.72 | Station_lod2/paint_grey_dark | 12 | 1 + 0 + 0 | 0.916 |
| -12.86, 57.42, -0.44 | Station_lod2/glass_window | 30 | -1 + 0 + 0 | 0.325 |
| -4.15, 54.42, -3.92 | Station_lod2/glass_window | 12 | 0 + 0 + -1 | 0.38 |
| -0.95, 54.42, -3.92 | Station_lod2/glass_window | 12 | 0 + 0 + -1 | 0.379 |

## sliver (warn, 364)

| at | part | aspect | longest |
|---|---|---|---|
| -22.21, 55.07, 3.13 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -23.39, 55.07, 3.10 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -22.21, 54.82, 3.10 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -23.39, 54.82, 3.13 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -23.39, 55.07, -2.15 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -22.21, 55.07, -2.12 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -23.39, 54.82, -2.12 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -22.21, 54.82, -2.15 | Station_lod2/brick_painted_white | 51 | 3.547 |
| -17.05, 54.42, 3.10 | Station_lod2/brick_painted_white | 316 | 3.925 |
| -20.24, 53.25, 3.10 | Station_lod2/brick_painted_white | 57 | 3.45 |
| -20.24, 54.40, 3.12 | Station_lod2/brick_painted_white | 57 | 3.45 |
| -20.66, 53.25, 3.12 | Station_lod2/brick_painted_white | 57 | 3.45 |
| -20.66, 54.40, 3.10 | Station_lod2/brick_painted_white | 57 | 3.45 |
| -15.71, 55.58, 3.14 | Station_lod2/brick_painted_white | 79 | 7.952 |
| -18.36, 55.62, 3.14 | Station_lod2/brick_painted_white | 79 | 7.952 |
| -15.71, 55.65, 3.12 | Station_lod2/brick_painted_white | 132 | 7.952 |
| -18.36, 55.65, 3.10 | Station_lod2/brick_painted_white | 132 | 7.952 |
| -15.71, 55.62, 3.10 | Station_lod2/brick_painted_white | 68 | 7.953 |
| -18.36, 55.58, 3.12 | Station_lod2/brick_painted_white | 68 | 7.953 |
| -15.71, 55.69, 3.20 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -18.36, 55.73, 3.20 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -15.71, 55.77, 3.16 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -18.36, 55.77, 3.12 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -15.71, 55.65, 3.12 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -18.36, 55.65, 3.16 | Station_lod2/brick_painted_white | 66 | 7.953 |
| -15.71, 55.83, 3.26 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -18.36, 55.89, 3.26 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -15.71, 55.95, 3.20 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -18.36, 55.95, 3.14 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -15.71, 55.77, 3.14 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -18.36, 55.77, 3.20 | Station_lod2/brick_painted_white | 44 | 7.954 |
| -18.39, 55.58, -4.04 | Station_lod2/brick_painted_white | 80 | 7.996 |
| -15.73, 55.62, -4.04 | Station_lod2/brick_painted_white | 80 | 7.996 |
| -18.39, 55.65, -4.02 | Station_lod2/brick_painted_white | 133 | 7.996 |
| -15.73, 55.65, -4.00 | Station_lod2/brick_painted_white | 133 | 7.996 |
| -18.39, 55.62, -4.00 | Station_lod2/brick_painted_white | 69 | 7.996 |
| -15.73, 55.58, -4.02 | Station_lod2/brick_painted_white | 69 | 7.996 |
| -18.43, 55.69, -4.10 | Station_lod2/brick_painted_white | 67 | 8.057 |
| -15.75, 55.73, -4.10 | Station_lod2/brick_painted_white | 67 | 8.057 |
| -18.43, 55.77, -4.06 | Station_lod2/brick_painted_white | 67 | 8.057 |

(324 more in the JSON)

## nonmanifold (warn, 90)

| at | part | uses |
|---|---|---|
| -17.04, 55.65, 3.08 | Station_lod2/brick_painted_white | 3 |
| -21.06, 55.60, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.03, 55.65, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.03, 55.55, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.12, 55.71, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.06, 55.77, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.06, 55.65, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.18, 55.86, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.09, 55.95, -2.12 | Station_lod2/brick_painted_white | 3 |
| -21.09, 55.77, -2.12 | Station_lod2/brick_painted_white | 3 |
| -9.88, 55.55, 3.21 | Station_lod2/brick_painted_white | 3 |
| -9.88, 55.58, -3.98 | Station_lod2/brick_painted_white | 3 |
| 13.51, 55.49, 3.12 | Station_lod2/brick_painted_white | 3 |
| 13.51, 55.50, -4.10 | Station_lod2/brick_painted_white | 3 |
| 24.56, 58.92, -0.50 | Station_lod2/brick_painted_white | 3 |
| 24.52, 59.10, -0.50 | Station_lod2/brick_painted_white | 3 |
| 24.52, 58.75, -0.50 | Station_lod2/brick_painted_white | 3 |
| 16.13, 58.90, -0.50 | Station_lod2/brick_painted_white | 3 |
| 16.16, 59.04, -0.50 | Station_lod2/brick_painted_white | 3 |
| 16.16, 58.75, -0.50 | Station_lod2/brick_painted_white | 3 |
| -14.70, 53.03, 2.91 | Station_lod2/wood_frame_dark | 4 |
| -13.71, 53.03, 2.91 | Station_lod2/wood_frame_dark | 4 |
| -17.76, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -18.64, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -14.56, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -15.44, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -9.84, 52.88, 3.04 | Station_lod2/wood_frame_dark | 4 |
| -8.76, 52.88, 3.04 | Station_lod2/wood_frame_dark | 4 |
| -9.41, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -10.39, 53.03, -3.81 | Station_lod2/wood_frame_dark | 4 |
| -12.87, 56.63, -0.64 | Station_lod2/wood_frame_dark | 4 |
| -12.87, 56.63, -0.16 | Station_lod2/wood_frame_dark | 4 |
| -4.55, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |
| -3.65, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |
| -1.35, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |
| -0.45, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |
| -1.54, 53.03, 3.08 | Station_lod2/wood_frame_dark | 4 |
| -0.26, 53.03, 3.08 | Station_lod2/wood_frame_dark | 4 |
| 1.85, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |
| 2.75, 55.80, 3.08 | Station_lod2/wood_frame_dark | 4 |

(50 more in the JSON)

## tjunction (warn, 145)

| at | part | edge_m |
|---|---|---|
| -21.02, 55.07, 3.10 | Station_lod2/brick_painted_white | 0.93 |
| -13.06, 55.45, 3.10 | Station_lod2/brick_painted_white | 3.85 |
| -13.58, 54.56, 3.09 | Station_lod2/brick_painted_white | 0.332 |
| -14.83, 54.56, 3.09 | Station_lod2/brick_painted_white | 0.332 |
| -13.06, 55.48, -4.00 | Station_lod2/brick_painted_white | 1 |
| -18.77, 54.50, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| -17.63, 54.50, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| -15.57, 54.50, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| -14.43, 54.50, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| -21.06, 55.65, -3.98 | Station_lod2/brick_painted_white | 8.056 |
| -21.12, 55.77, -3.98 | Station_lod2/brick_painted_white | 8.116 |
| -21.02, 55.07, -2.12 | Station_lod2/brick_painted_white | 3.85 |
| -21.00, 55.65, -3.88 | Station_lod2/brick_painted_white | 1.819 |
| -21.00, 55.77, -3.82 | Station_lod2/brick_painted_white | 1.759 |
| -21.00, 55.65, 2.98 | Station_lod2/brick_painted_white | 5.159 |
| -21.00, 55.77, 2.92 | Station_lod2/brick_painted_white | 5.099 |
| -6.69, 55.18, 3.23 | Station_lod2/brick_painted_white | 3.754 |
| -8.63, 54.52, 3.22 | Station_lod2/brick_painted_white | 0.332 |
| -9.97, 54.52, 3.22 | Station_lod2/brick_painted_white | 0.332 |
| -6.69, 55.18, -4.00 | Station_lod2/brick_painted_white | 3.78 |
| -10.52, 54.49, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| -9.28, 54.49, -3.99 | Station_lod2/brick_painted_white | 0.332 |
| 10.84, 55.15, 3.27 | Station_lod2/brick_painted_white | 6.35 |
| -6.69, 55.18, 3.27 | Station_lod2/brick_painted_white | 6.35 |
| -3.31, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| -4.88, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| -0.12, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| -1.69, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| 2.90, 57.57, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| 1.71, 57.57, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| 3.08, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| 1.51, 54.34, 3.26 | Station_lod2/brick_painted_white | 0.322 |
| 6.18, 54.33, 3.26 | Station_lod2/brick_painted_white | 0.311 |
| 4.82, 54.33, 3.26 | Station_lod2/brick_painted_white | 0.311 |
| 9.44, 54.33, 3.26 | Station_lod2/brick_painted_white | 0.318 |
| 7.96, 54.33, 3.26 | Station_lod2/brick_painted_white | 0.318 |
| 10.84, 55.15, -4.12 | Station_lod2/brick_painted_white | 5.1 |
| -6.69, 55.18, -4.12 | Station_lod2/brick_painted_white | 6.35 |
| -4.84, 54.33, -4.11 | Station_lod2/brick_painted_white | 0.318 |
| -3.36, 54.33, -4.11 | Station_lod2/brick_painted_white | 0.318 |

(105 more in the JSON)

## seam (info, 882)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 9.22, 55.70, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.39 | 92 | 90 |
| -3.60, 55.70, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.39 | 88 | 90 |
| 9.27, 55.55, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35 | 88 | 64.6 |
| -3.64, 55.56, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35 | 84 | 64.6 |
| 24.50, 55.31, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 14.9 | 70 | 90 |
| -6.21, 57.84, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 64 | 41.1 |
| -6.37, 57.91, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 64 | 56.3 |
| -6.53, 57.98, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 61 | 66 |
| 10.54, 57.83, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 60 | 41.1 |
| 10.64, 57.90, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 60 | 56.3 |
| 10.74, 57.98, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 35.06 | 57 | 66 |
| 8.19, 54.46, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.94 | 36 | 22.3 |
| 24.50, 54.80, -1.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 3.44 | 36 | 24.7 |
| 6.18, 54.35, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.73 | 34 | 22.2 |
| -0.28, 54.28, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.75 | 33 | 15.2 |
| -6.37, 57.91, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 17.53 | 32 | 47 |
| -1.63, 54.35, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.96 | 32 | 22.3 |
| 9.36, 54.38, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.75 | 32 | 15.2 |
| -3.94, 54.60, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.87 | 31 | 22.3 |
| 2.77, 54.50, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.87 | 31 | 22.3 |
| 2.85, 57.58, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.58 | 31 | 14.5 |
| 4.88, 54.34, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.53 | 30 | 22.3 |
| 10.65, 57.92, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 17.53 | 30 | 47 |
| 3.01, 54.34, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.53 | 30 | 15.2 |
| -3.42, 54.38, -4.12 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.53 | 29 | 15.2 |
| -24.31, 54.95, 3.10 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 13.59 | 27 | 55 |
| 1.91, 57.69, 3.27 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.6 | 26 | 13.5 |
| -0.85, 55.62, 3.27 | Station_lod2/brick_painted_white + Station_lod2/zinc_roof | 12.14 | 25 | 81.3 |
| -0.85, 55.62, 3.27 | Station_lod2/brick_painted_white + Station_lod2/cast_iron_dark | 12.14 | 25 | 81.3 |
| 6.02, 55.71, -4.12 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 24 | 74.2 |
| 2.82, 55.71, -4.12 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 24 | 74.2 |
| 24.50, 54.89, 2.57 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 1.84 | 24 | 22.6 |
| -1.45, 55.71, 3.27 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 22 | 74.2 |
| 8.15, 55.71, 3.27 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 22 | 74.2 |
| 9.21, 55.71, -4.12 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 22 | 74.2 |
| 24.50, 54.80, 1.26 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.79 | 22 | 24.1 |
| -20.39, 52.10, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 7.72 | 20 | 90 |
| -9.57, 54.57, 3.23 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 2.9 | 20 | 22.3 |
| -3.61, 55.67, 3.27 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 20 | 74.2 |
| -0.38, 55.71, -4.12 | Station_lod2/brick_painted_white + Station_lod2/stone_blue | 2.26 | 20 | 74.2 |

(842 more in the JSON)

## opening (info, 381)

| at | part | facing | edge_m |
|---|---|---|---|
| -24.47, 51.70, 3.10 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 3.5 |
| -21.02, 54.76, 3.10 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 0.452 |
| -21.07, 51.70, -2.12 | Station_lod2/brick_painted_white | 0 + 0 + -1 | 3.5 |
| -24.52, 51.70, 3.05 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 5.22 |
| -24.29, 52.65, 1.94 | Station_lod2/brick_painted_white | 0.43 + 0 + 0.9 | 1.35 |
| -20.97, 51.70, 3.10 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 7.959 |
| -20.30, 55.55, 3.08 | Station_lod2/brick_painted_white | 0 + 1 + 0 | 0.412 |
| -21.02, 55.91, 3.08 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.18 |
| -17.70, 52.95, -3.83 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.23 |
| -14.50, 52.95, -3.83 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.23 |
| -21.07, 55.77, -3.98 | Station_lod2/brick_painted_white | 0 + 1 + 0 | 8.056 |
| -21.13, 55.95, -3.98 | Station_lod2/brick_painted_white | 0 + 1 + 0 | 8.116 |
| -21.18, 55.91, -3.98 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.18 |
| -13.06, 55.91, -3.98 | Station_lod2/brick_painted_white | 1 + 0 + 0 | 0.18 |
| -21.02, 51.70, -2.17 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.88 |
| -21.02, 55.55, -3.95 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.88 |
| -21.00, 55.91, -2.12 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 0.18 |
| -21.00, 55.91, -3.82 | Station_lod2/brick_painted_white | 0 + 0 + -1 | 0.18 |
| -21.00, 55.65, 0.53 | Station_lod2/brick_painted_white | 0 + -1 + 0 | 5.099 |
| -21.00, 55.91, 2.92 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 0.18 |
| -13.01, 51.70, 3.23 | Station_lod2/brick_painted_white | 0 + 0 + 1 | 6.37 |
| -9.90, 52.85, 3.00 | Station_lod2/brick_painted_white | 1 + 0 + 0 | 1.616 |
| -8.70, 52.85, 3.00 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.616 |
| -13.06, 51.70, 3.17 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.13 |
| -13.06, 55.45, 3.17 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.13 |
| -6.69, 51.70, 3.25 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.04 |
| -6.69, 51.70, -4.06 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.12 |
| -6.69, 55.18, -4.06 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 0.12 |
| -20.97, 51.70, -4.00 | Station_lod2/brick_painted_white | 0 + 0 + -1 | 14.33 |
| -13.06, 54.60, -4.00 | Station_lod2/brick_painted_white | 0 + 0 + -1 | 0.931 |
| -13.06, 55.65, -3.77 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.016 |
| -13.06, 56.62, -2.76 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.63 |
| -13.06, 55.65, -1.35 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 4.8 |
| -13.06, 56.83, 1.74 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.63 |
| -13.06, 55.65, 2.15 | Station_lod2/brick_painted_white | -1 + 0 + 0 | 1.017 |
| -12.83, 56.60, -0.70 | Station_lod2/brick_painted_white | 0 + -0.05 + 1 | 0.852 |
| -12.83, 57.35, -0.14 | Station_lod2/brick_painted_white | 0 + -0.05 + -1 | 0.852 |
| -12.83, 57.43, -0.17 | Station_lod2/brick_painted_white | 0 + -0.71 + -0.71 | 0.155 |
| -12.83, 57.52, -0.29 | Station_lod2/brick_painted_white | 0 + -0.97 + -0.26 | 0.155 |
| -12.83, 57.54, -0.44 | Station_lod2/brick_painted_white | 0 + -0.97 + 0.26 | 0.155 |

(341 more in the JSON)

## backtoback (info, 680)

| at | parts | area |
|---|---|---|
| -22.98, 54.21, 2.90 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.01805 |
| -22.52, 54.48, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.00209 |
| -21.72, 54.21, 2.90 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.01805 |
| -21.21, 54.48, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.00209 |
| -23.00, 54.46, -1.96 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.0021 |
| -17.72, 54.20, 2.94 | Station_lod2/brick_painted_white + Station_lod2/paint_grey_dark | 0.003 |
| -14.76, 53.45, 2.89 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03301 |
| -14.76, 53.89, 2.92 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03917 |
| -13.65, 54.17, 2.94 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.00299 |
| -13.65, 54.33, 2.91 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.01054 |
| -13.65, 53.83, 2.90 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03105 |
| -14.92, 55.65, 3.11 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.19892 |
| -19.36, 55.65, 3.13 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.03986 |
| -16.38, 55.65, 3.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.15913 |
| -20.13, 55.65, 3.11 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.07965 |
| -14.55, 55.77, 3.14 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.34993 |
| -18.90, 55.77, 3.19 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.12715 |
| -16.25, 55.77, 3.10 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.28629 |
| -19.96, 55.77, 3.14 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.19079 |
| -17.70, 53.43, -3.79 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03183 |
| -17.70, 53.86, -3.82 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03767 |
| -18.70, 54.12, -3.83 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.00287 |
| -18.70, 54.27, -3.81 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.01011 |
| -18.70, 53.80, -3.79 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.02985 |
| -14.50, 53.43, -3.79 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03183 |
| -14.50, 53.86, -3.82 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.03767 |
| -15.50, 54.12, -3.83 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.00287 |
| -15.50, 54.27, -3.81 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.01011 |
| -15.50, 53.80, -3.79 | Station_lod2/brick_painted_white + Station_lod2/wood_frame_dark | 0.02985 |
| -19.20, 55.65, -4.01 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.19958 |
| -14.74, 55.65, -4.04 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.04052 |
| -16.62, 55.65, -3.99 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.15967 |
| -13.96, 55.65, -4.01 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.08044 |
| -19.63, 55.77, -4.04 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.353 |
| -15.23, 55.77, -4.09 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.13084 |
| -16.83, 55.77, -4.00 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.28929 |
| -14.14, 55.77, -4.04 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.19455 |
| -21.02, 55.65, -2.99 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.05407 |
| -21.00, 55.65, -3.86 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.00005 |
| -21.06, 55.77, -2.44 | Station_lod2/brick_painted_white + Station_lod2/brick_painted_white | 0.07598 |

(640 more in the JSON)


Nodes: Station_lod2. Distances: {"Station":95,"Station_far":385,"Station_lod2":2000}. Quantum 0.189 mm. Offset 0,40,0.
