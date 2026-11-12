# Mesh audit (packed): calevoet.lod0

22,886 triangles, 16,962 welded vertices, 10,680 open edges, 1,145,724 rays, 5465 ms.

**1 blocking**, 3361 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| leak | block | 1 |
| sliver | warn | 1960 |
| nonmanifold | warn | 290 |
| tjunction | warn | 1111 |
| seam | info | 2907 |
| opening | info | 1300 |
| backtoback | info | 1876 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## leak (block, 1)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 10.06, 54.32, 6.45 | Station/cast_iron_dark | 4 | 1 + -0.08 + 0 | 0.025 |

## sliver (warn, 1960)

| at | part | aspect | longest |
|---|---|---|---|
| -22.21, 55.07, 3.13 | Station/brick_painted_white | 51 | 3.547 |
| -23.39, 55.07, 3.10 | Station/brick_painted_white | 51 | 3.547 |
| -22.21, 54.82, 3.10 | Station/brick_painted_white | 51 | 3.547 |
| -23.39, 54.82, 3.13 | Station/brick_painted_white | 51 | 3.547 |
| -23.39, 55.07, -2.15 | Station/brick_painted_white | 51 | 3.547 |
| -22.21, 55.07, -2.12 | Station/brick_painted_white | 51 | 3.547 |
| -23.39, 54.82, -2.12 | Station/brick_painted_white | 51 | 3.547 |
| -22.21, 54.82, -2.15 | Station/brick_painted_white | 51 | 3.547 |
| -24.52, 51.97, 2.68 | Station/brick_painted_white | 546 | 0.8 |
| -24.52, 52.23, 2.68 | Station/brick_painted_white | 546 | 0.8 |
| -24.52, 54.42, 2.68 | Station/brick_painted_white | 664 | 0.972 |
| -24.52, 54.75, 2.68 | Station/brick_painted_white | 664 | 0.972 |
| -24.52, 55.17, 2.68 | Station/brick_painted_white | 195 | 0.285 |
| -24.52, 55.26, 2.68 | Station/brick_painted_white | 195 | 0.286 |
| -21.02, 55.87, -0.73 | Station/brick_painted_white | 73 | 0.5 |
| -19.46, 52.93, 3.10 | Station/brick_painted_white | 77 | 2.34 |
| -20.24, 52.94, 3.10 | Station/brick_painted_white | 77 | 2.34 |
| -19.46, 54.42, 3.10 | Station/brick_painted_white | 46 | 2.34 |
| -20.24, 54.43, 3.10 | Station/brick_painted_white | 46 | 2.34 |
| -15.74, 52.93, 3.10 | Station/brick_painted_white | 98 | 2.965 |
| -16.73, 52.94, 3.10 | Station/brick_painted_white | 98 | 2.965 |
| -15.74, 54.42, 3.10 | Station/brick_painted_white | 58 | 2.965 |
| -16.73, 54.43, 3.10 | Station/brick_painted_white | 58 | 2.965 |
| -20.24, 53.25, 3.10 | Station/brick_painted_white | 57 | 3.45 |
| -20.24, 54.40, 3.12 | Station/brick_painted_white | 57 | 3.45 |
| -20.66, 53.25, 3.12 | Station/brick_painted_white | 57 | 3.45 |
| -20.66, 54.40, 3.10 | Station/brick_painted_white | 57 | 3.45 |
| -15.71, 55.58, 3.14 | Station/brick_painted_white | 79 | 7.952 |
| -18.36, 55.62, 3.14 | Station/brick_painted_white | 79 | 7.952 |
| -15.71, 55.65, 3.12 | Station/brick_painted_white | 132 | 7.952 |
| -18.36, 55.65, 3.10 | Station/brick_painted_white | 132 | 7.952 |
| -15.71, 55.55, 3.10 | Station/brick_painted_white | 132 | 7.952 |
| -18.36, 55.55, 3.12 | Station/brick_painted_white | 132 | 7.952 |
| -15.71, 55.69, 3.20 | Station/brick_painted_white | 66 | 7.953 |
| -18.36, 55.73, 3.20 | Station/brick_painted_white | 66 | 7.953 |
| -15.71, 55.77, 3.16 | Station/brick_painted_white | 66 | 7.953 |
| -18.36, 55.77, 3.12 | Station/brick_painted_white | 66 | 7.953 |
| -15.71, 55.65, 3.12 | Station/brick_painted_white | 66 | 7.953 |
| -18.36, 55.65, 3.16 | Station/brick_painted_white | 66 | 7.953 |
| -15.71, 55.83, 3.26 | Station/brick_painted_white | 44 | 7.954 |

(1920 more in the JSON)

## nonmanifold (warn, 290)

| at | part | uses |
|---|---|---|
| -21.06, 55.60, -2.12 | Station/brick_painted_white | 3 |
| -21.03, 55.65, -2.12 | Station/brick_painted_white | 3 |
| -21.03, 55.55, -2.12 | Station/brick_painted_white | 3 |
| -21.12, 55.71, -2.12 | Station/brick_painted_white | 3 |
| -21.06, 55.77, -2.12 | Station/brick_painted_white | 3 |
| -21.06, 55.65, -2.12 | Station/brick_painted_white | 3 |
| -21.18, 55.86, -2.12 | Station/brick_painted_white | 3 |
| -21.09, 55.95, -2.12 | Station/brick_painted_white | 3 |
| -21.09, 55.77, -2.12 | Station/brick_painted_white | 3 |
| 24.56, 58.92, -0.50 | Station/brick_painted_white | 3 |
| 24.52, 59.10, -0.50 | Station/brick_painted_white | 3 |
| 24.52, 58.75, -0.50 | Station/brick_painted_white | 3 |
| 16.13, 58.90, -0.50 | Station/brick_painted_white | 3 |
| 16.16, 59.04, -0.50 | Station/brick_painted_white | 3 |
| 16.16, 58.75, -0.50 | Station/brick_painted_white | 3 |
| -14.70, 52.94, 2.87 | Station/wood_frame_dark | 3 |
| -13.71, 52.94, 2.87 | Station/wood_frame_dark | 3 |
| -14.64, 54.01, 2.87 | Station/wood_frame_dark | 3 |
| -14.64, 53.03, 2.87 | Station/wood_frame_dark | 3 |
| -14.26, 54.01, 2.87 | Station/wood_frame_dark | 3 |
| -14.26, 53.03, 2.87 | Station/wood_frame_dark | 3 |
| -14.15, 54.01, 2.87 | Station/wood_frame_dark | 3 |
| -14.15, 53.03, 2.87 | Station/wood_frame_dark | 3 |
| -13.77, 54.01, 2.87 | Station/wood_frame_dark | 3 |
| -13.77, 53.03, 2.87 | Station/wood_frame_dark | 3 |
| -17.76, 52.94, -3.77 | Station/wood_frame_dark | 3 |
| -18.64, 52.94, -3.77 | Station/wood_frame_dark | 3 |
| -17.81, 54.36, -3.77 | Station/wood_frame_dark | 3 |
| -17.81, 53.03, -3.77 | Station/wood_frame_dark | 3 |
| -18.15, 54.36, -3.77 | Station/wood_frame_dark | 3 |
| -18.15, 53.03, -3.77 | Station/wood_frame_dark | 3 |
| -18.25, 54.36, -3.77 | Station/wood_frame_dark | 3 |
| -18.25, 53.03, -3.77 | Station/wood_frame_dark | 3 |
| -18.59, 54.36, -3.77 | Station/wood_frame_dark | 3 |
| -18.59, 53.03, -3.77 | Station/wood_frame_dark | 3 |
| -14.56, 52.94, -3.77 | Station/wood_frame_dark | 3 |
| -15.44, 52.94, -3.77 | Station/wood_frame_dark | 3 |
| -14.61, 54.36, -3.77 | Station/wood_frame_dark | 3 |
| -14.61, 53.03, -3.77 | Station/wood_frame_dark | 3 |
| -14.95, 54.36, -3.77 | Station/wood_frame_dark | 3 |

(250 more in the JSON)

## tjunction (warn, 1111)

| at | part | edge_m |
|---|---|---|
| -24.52, 52.50, 3.10 | Station/brick_painted_white | 1.92 |
| -24.52, 53.85, 3.10 | Station/brick_painted_white | 1 |
| -21.02, 52.92, 3.10 | Station/brick_painted_white | 1.92 |
| -21.02, 54.40, 3.10 | Station/brick_painted_white | 1 |
| -24.52, 52.50, -2.12 | Station/brick_painted_white | 1.9 |
| -24.52, 53.85, -2.12 | Station/brick_painted_white | 1 |
| -24.52, 53.60, -2.12 | Station/brick_painted_white | 1.35 |
| -24.52, 55.07, -1.52 | Station/brick_painted_white | 1.381 |
| -24.52, 54.60, -2.12 | Station/brick_painted_white | 0.972 |
| -24.52, 53.62, 3.10 | Station/brick_painted_white | 1.35 |
| -24.52, 54.62, 3.10 | Station/brick_painted_white | 0.972 |
| -24.52, 55.07, 2.79 | Station/brick_painted_white | 1.184 |
| -24.52, 53.98, 2.68 | Station/brick_painted_white | 0.086 |
| -24.52, 54.01, 2.08 | Station/brick_painted_white | 0.086 |
| -21.02, 53.62, 3.10 | Station/brick_painted_white | 1.45 |
| -21.02, 55.07, 3.10 | Station/brick_painted_white | 0.93 |
| -13.06, 55.45, 3.10 | Station/brick_painted_white | 0.93 |
| -18.68, 52.95, 3.10 | Station/brick_painted_white | 1.48 |
| -17.72, 52.95, 3.10 | Station/brick_painted_white | 1.48 |
| -14.76, 54.40, 3.10 | Station/brick_painted_white | 1.5 |
| -13.65, 54.40, 3.10 | Station/brick_painted_white | 1.5 |
| -13.58, 54.56, 3.09 | Station/brick_painted_white | 0.332 |
| -14.83, 54.56, 3.09 | Station/brick_painted_white | 0.332 |
| -20.66, 55.55, 3.08 | Station/brick_painted_white | 7.952 |
| -13.06, 54.38, -4.00 | Station/brick_painted_white | 1.446 |
| -13.06, 55.48, -4.00 | Station/brick_painted_white | 1 |
| -18.77, 54.50, -3.99 | Station/brick_painted_white | 0.332 |
| -17.63, 54.50, -3.99 | Station/brick_painted_white | 0.332 |
| -15.57, 54.50, -3.99 | Station/brick_painted_white | 0.332 |
| -14.43, 54.50, -3.99 | Station/brick_painted_white | 0.332 |
| -21.06, 55.65, -3.98 | Station/brick_painted_white | 8.056 |
| -21.12, 55.77, -3.98 | Station/brick_painted_white | 8.116 |
| -21.02, 53.60, -2.12 | Station/brick_painted_white | 3.85 |
| -21.02, 52.95, -4.00 | Station/brick_painted_white | 3.85 |
| -21.00, 55.65, -3.88 | Station/brick_painted_white | 1.819 |
| -21.00, 55.77, -3.82 | Station/brick_painted_white | 1.759 |
| -21.00, 55.65, 2.98 | Station/brick_painted_white | 5.159 |
| -21.00, 55.77, 2.92 | Station/brick_painted_white | 5.099 |
| -6.69, 55.18, 3.23 | Station/brick_painted_white | 0.854 |
| -8.63, 54.52, 3.22 | Station/brick_painted_white | 0.332 |

(1071 more in the JSON)

## seam (info, 2907)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -5.74, 55.52, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 70.42 | 514 | 90 |
| 10.09, 55.52, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 70.42 | 514 | 90 |
| -5.38, 55.59, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 35.1 | 510 | 90 |
| 9.81, 55.59, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 35.1 | 510 | 90 |
| -5.38, 57.81, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 506 | 90 |
| -4.99, 57.97, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 506 | 90 |
| 9.81, 57.81, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 506 | 90 |
| 9.50, 57.97, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 506 | 90 |
| -4.83, 57.97, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 380 | 90 |
| 9.50, 57.97, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 35.06 | 380 | 90 |
| 10.09, 51.70, -4.12 | Station/brick_painted_white + Station/paint_grey_dark | 35.58 | 346 | 90 |
| -5.74, 51.70, 3.27 | Station/brick_painted_white + Station/paint_grey_dark | 34.32 | 296 | 90 |
| 24.50, 55.31, 2.95 | Station/brick_painted_white + Station/brick_painted_white | 14.9 | 254 | 90 |
| -5.14, 57.91, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 17.53 | 253 | 47 |
| 9.60, 57.92, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 17.53 | 253 | 47 |
| -1.29, 55.58, 3.27 | Station/brick_painted_white + Station/cast_iron_dark | 12.18 | 192 | 81.3 |
| -1.29, 55.62, 3.27 | Station/brick_painted_white + Station/zinc_roof | 12.14 | 191 | 81.3 |
| 24.50, 51.70, 3.01 | Station/brick_painted_white + Station/paint_grey_dark | 15.43 | 170 | 90 |
| -4.84, 54.37, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 3.48 | 152 | 90 |
| -1.64, 54.37, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 3.48 | 152 | 90 |
| 1.56, 54.37, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 3.48 | 152 | 90 |
| 4.86, 54.36, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 3.09 | 152 | 90 |
| 8.00, 54.37, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| 9.40, 54.37, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| 6.20, 54.37, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| 3.00, 54.37, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| -0.20, 54.37, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| -3.40, 54.37, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 3.32 | 152 | 90 |
| 2.89, 57.56, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 2.66 | 144 | 90 |
| 1.78, 57.49, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 2.66 | 140 | 90 |
| 24.50, 54.75, -0.97 | Station/brick_painted_white + Station/brick_painted_white | 3.54 | 134 | 90 |
| -5.17, 58.05, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 17.53 | 127 | 90 |
| 9.52, 58.05, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 17.53 | 127 | 90 |
| 24.50, 54.77, 2.92 | Station/brick_painted_white + Station/brick_painted_white | 2.47 | 127 | 90 |
| 24.50, 54.78, 1.31 | Station/brick_painted_white + Station/brick_painted_white | 3.14 | 124 | 90 |
| -14.49, 54.42, -4.00 | Station/brick_painted_white + Station/brick_painted_white | 2.52 | 104 | 90 |
| -17.69, 54.42, -4.00 | Station/brick_painted_white + Station/brick_painted_white | 2.52 | 104 | 90 |
| -9.97, 54.51, 3.23 | Station/brick_painted_white + Station/brick_painted_white | 2.95 | 104 | 90 |
| 12.57, 54.61, 3.14 | Station/brick_painted_white + Station/brick_painted_white | 3.9 | 104 | 90 |
| 20.91, 54.80, -4.12 | Station/brick_painted_white + Station/brick_painted_white | 2.84 | 104 | 90 |

(2867 more in the JSON)

## opening (info, 1300)

| at | part | facing | edge_m |
|---|---|---|---|
| -24.47, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 1.539 |
| -24.52, 54.66, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.452 |
| -22.93, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.461 |
| -22.47, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.8 |
| -21.67, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.51 |
| -21.16, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.19 |
| -21.02, 54.66, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 0.452 |
| -21.07, 51.70, -2.12 | Station/brick_painted_white | 0 + 0 + -1 | 1.381 |
| -22.45, 51.70, -2.12 | Station/brick_painted_white | 0 + 0 + -1 | 0.6 |
| -23.05, 51.70, -2.12 | Station/brick_painted_white | 0 + 0 + -1 | 1.52 |
| -24.52, 54.65, -2.12 | Station/brick_painted_white | 0 + 0 + -1 | 0.472 |
| -24.52, 51.70, -2.07 | Station/brick_painted_white | -1 + 0 + 0 | 0.6 |
| -24.52, 53.89, -2.12 | Station/brick_painted_white | -1 + 0 + 0 | 0.25 |
| -24.52, 51.70, -1.47 | Station/brick_painted_white | -1 + 0 + 0 | 0.6 |
| -24.52, 54.15, -1.52 | Station/brick_painted_white | -1 + 0 + 0 | 0.972 |
| -24.52, 55.23, -1.52 | Station/brick_painted_white | -1 + 0 + 0 | 0.409 |
| -24.52, 51.70, -0.87 | Station/brick_painted_white | -1 + 0 + 0 | 0.6 |
| -24.52, 51.70, -0.27 | Station/brick_painted_white | -1 + 0 + 0 | 0.6 |
| -24.52, 51.70, 0.33 | Station/brick_painted_white | -1 + 0 + 0 | 0.21 |
| -24.52, 51.70, 0.54 | Station/brick_painted_white | -1 + 0 + 0 | 0.39 |
| -24.52, 51.70, 0.93 | Station/brick_painted_white | -1 + 0 + 0 | 0.6 |
| -24.52, 51.70, 1.53 | Station/brick_painted_white | -1 + 0 + 0 | 0.46 |
| -24.52, 51.70, 1.96 | Station/brick_painted_white | -1 + 0 + 0 | 0.048 |
| -24.52, 51.70, 2.02 | Station/brick_painted_white | -1 + 0 + 0 | 0.06 |
| -24.52, 51.70, 2.06 | Station/brick_painted_white | -1 + 0 + 0 | 0.031 |
| -24.52, 51.70, 2.10 | Station/brick_painted_white | -1 + 0 + 0 | 0.038 |
| -24.52, 51.70, 2.16 | Station/brick_painted_white | -1 + 0 + 0 | 0.078 |
| -24.52, 51.70, 2.24 | Station/brick_painted_white | -1 + 0 + 0 | 0.083 |
| -24.52, 51.70, 2.32 | Station/brick_painted_white | -1 + 0 + 0 | 0.086 |
| -24.52, 51.70, 2.41 | Station/brick_painted_white | -1 + 0 + 0 | 0.086 |
| -24.52, 51.70, 2.49 | Station/brick_painted_white | -1 + 0 + 0 | 0.083 |
| -24.52, 51.70, 2.57 | Station/brick_painted_white | -1 + 0 + 0 | 0.078 |
| -24.52, 51.70, 2.65 | Station/brick_painted_white | -1 + 0 + 0 | 0.068 |
| -24.52, 51.70, 2.71 | Station/brick_painted_white | -1 + 0 + 0 | 0.06 |
| -24.52, 51.70, 2.77 | Station/brick_painted_white | -1 + 0 + 0 | 0.048 |
| -24.52, 54.15, 2.79 | Station/brick_painted_white | -1 + 0 + 0 | 0.972 |
| -24.52, 51.70, 3.05 | Station/brick_painted_white | -1 + 0 + 0 | 0.31 |
| -24.52, 53.89, 3.10 | Station/brick_painted_white | -1 + 0 + 0 | 0.25 |
| -20.97, 51.70, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 2.34 |
| -21.02, 52.67, 3.10 | Station/brick_painted_white | 0 + 0 + 1 | 1.22 |

(1260 more in the JSON)

## backtoback (info, 1876)

| at | parts | area |
|---|---|---|
| -20.25, 55.55, 3.08 | Station/brick_painted_white + Station/brick_painted_white | 0.00011 |
| -20.36, 55.55, 3.11 | Station/brick_painted_white + Station/brick_painted_white | 0.01226 |
| -20.46, 55.55, 3.08 | Station/brick_painted_white + Station/brick_painted_white | 0.00165 |
| -20.56, 55.55, 3.11 | Station/brick_painted_white + Station/brick_painted_white | 0.01073 |
| -14.92, 55.65, 3.11 | Station/brick_painted_white + Station/brick_painted_white | 0.19892 |
| -19.36, 55.65, 3.13 | Station/brick_painted_white + Station/brick_painted_white | 0.03986 |
| -16.38, 55.65, 3.09 | Station/brick_painted_white + Station/brick_painted_white | 0.15913 |
| -20.13, 55.65, 3.11 | Station/brick_painted_white + Station/brick_painted_white | 0.07965 |
| -14.55, 55.77, 3.14 | Station/brick_painted_white + Station/brick_painted_white | 0.34993 |
| -18.90, 55.77, 3.19 | Station/brick_painted_white + Station/brick_painted_white | 0.12715 |
| -16.25, 55.77, 3.10 | Station/brick_painted_white + Station/brick_painted_white | 0.28629 |
| -19.96, 55.77, 3.14 | Station/brick_painted_white + Station/brick_painted_white | 0.19079 |
| -19.20, 55.65, -4.01 | Station/brick_painted_white + Station/brick_painted_white | 0.19958 |
| -14.74, 55.65, -4.04 | Station/brick_painted_white + Station/brick_painted_white | 0.04052 |
| -16.62, 55.65, -3.99 | Station/brick_painted_white + Station/brick_painted_white | 0.15967 |
| -13.96, 55.65, -4.01 | Station/brick_painted_white + Station/brick_painted_white | 0.08044 |
| -19.63, 55.77, -4.04 | Station/brick_painted_white + Station/brick_painted_white | 0.353 |
| -15.23, 55.77, -4.09 | Station/brick_painted_white + Station/brick_painted_white | 0.13084 |
| -16.83, 55.77, -4.00 | Station/brick_painted_white + Station/brick_painted_white | 0.28929 |
| -14.14, 55.77, -4.04 | Station/brick_painted_white + Station/brick_painted_white | 0.19455 |
| -21.03, 55.65, -2.54 | Station/brick_painted_white + Station/brick_painted_white | 0.04456 |
| -21.05, 55.65, -3.52 | Station/brick_painted_white + Station/brick_painted_white | 0.00956 |
| -21.01, 55.65, -2.86 | Station/brick_painted_white + Station/brick_painted_white | 0.03424 |
| -21.03, 55.65, -3.69 | Station/brick_painted_white + Station/brick_painted_white | 0.01642 |
| -21.06, 55.77, -2.44 | Station/brick_painted_white + Station/brick_painted_white | 0.07598 |
| -21.11, 55.77, -3.37 | Station/brick_painted_white + Station/brick_painted_white | 0.02954 |
| -21.02, 55.77, -2.80 | Station/brick_painted_white + Station/brick_painted_white | 0.05989 |
| -21.06, 55.77, -3.60 | Station/brick_painted_white + Station/brick_painted_white | 0.03867 |
| -21.04, 55.65, 1.49 | Station/brick_painted_white + Station/brick_painted_white | 0.12533 |
| -21.05, 55.65, -1.06 | Station/brick_painted_white + Station/brick_painted_white | 0.02478 |
| -21.01, 55.65, 0.26 | Station/brick_painted_white + Station/brick_painted_white | 0.10309 |
| -21.03, 55.65, -1.55 | Station/brick_painted_white + Station/brick_painted_white | 0.05054 |
| -21.08, 55.77, 1.75 | Station/brick_painted_white + Station/brick_painted_white | 0.21859 |
| -21.11, 55.77, -0.77 | Station/brick_painted_white + Station/brick_painted_white | 0.08048 |
| -21.02, 55.77, 0.91 | Station/brick_painted_white + Station/brick_painted_white | 0.18437 |
| -21.06, 55.77, -1.44 | Station/brick_painted_white + Station/brick_painted_white | 0.12182 |
| -8.18, 55.55, 3.24 | Station/brick_painted_white + Station/brick_painted_white | 0.15915 |
| -11.73, 55.55, 3.27 | Station/brick_painted_white + Station/brick_painted_white | 0.0319 |
| -9.35, 55.55, 3.22 | Station/brick_painted_white + Station/brick_painted_white | 0.12732 |
| -12.35, 55.55, 3.24 | Station/brick_painted_white + Station/brick_painted_white | 0.06373 |

(1836 more in the JSON)


Nodes: Station. Distances: {"Station":95,"Station_far":385,"Station_lod2":2000}. Quantum 0.189 mm. Offset 0,40,0.
