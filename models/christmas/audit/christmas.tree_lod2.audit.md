# Mesh audit: christmas tree_lod2 (needle-vs-needle overlaps exempt: 437)

12,622 triangles, 8,353 welded vertices, 0 open edges, 0 rays, 347 ms.

**0 blocking**, 6 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 6 |
| seam | info | 1842 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 6)

| at | part | aspect | longest |
|---|---|---|---|
| -0.03, 8.00, -0.03 | tree_lod2/fir_bark | 100 | 3.001 |
| -0.04, 8.00, 0.01 | tree_lod2/fir_bark | 100 | 3.001 |
| -0.01, 8.00, 0.04 | tree_lod2/fir_bark | 100 | 3.001 |
| 0.03, 8.00, 0.03 | tree_lod2/fir_bark | 100 | 3.001 |
| 0.04, 8.00, -0.01 | tree_lod2/fir_bark | 100 | 3.001 |
| 0.01, 8.00, -0.04 | tree_lod2/fir_bark | 100 | 3.001 |

## seam (info, 1842)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.36, 2.30, 0.23 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.49 | 35 | 13.1 |
| -0.48, 1.19, 0.37 | tree_lod2/fir_needles + tree_lod2/fir_needles | 5.25 | 31 | 13 |
| -0.06, 1.42, -0.29 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.22 | 31 | 14.8 |
| 0.15, 1.92, -0.38 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.66 | 31 | 13.2 |
| 0.48, 3.03, -0.06 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.37 | 31 | 13 |
| 0.25, 3.54, 0.02 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.84 | 31 | 16.3 |
| 0.06, 4.35, 0.26 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.95 | 31 | 19.9 |
| 0.27, 1.27, 0.29 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.28 | 30 | 12.2 |
| -0.36, 3.55, 0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.59 | 30 | 16.7 |
| -0.17, 1.21, -0.35 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.54 | 29 | 12.2 |
| -0.36, 4.52, -0.27 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.63 | 29 | 15.6 |
| 0.62, 1.18, -0.05 | tree_lod2/fir_needles + tree_lod2/fir_needles | 5.37 | 28 | 15 |
| -0.18, 3.01, -0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4 | 28 | 18.8 |
| -0.34, 3.82, 0.23 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.55 | 28 | 13.1 |
| 0.04, 2.50, -0.26 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.74 | 27 | 15.3 |
| -0.11, 2.96, 0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.76 | 27 | 19.3 |
| 0.16, 7.45, 0.11 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.6 | 27 | 17.6 |
| 0.15, 9.16, -0.12 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.03 | 27 | 16.4 |
| -0.26, 9.14, -0.08 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.16 | 26 | 66.4 |
| 0.06, 9.46, -0.00 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.32 | 26 | 50.7 |
| -0.20, 1.69, -0.22 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.49 | 26 | 12.9 |
| -0.25, 1.69, 0.22 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.51 | 26 | 14.5 |
| 0.17, 1.75, 0.22 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.34 | 26 | 14.3 |
| 0.33, 2.25, -0.03 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.59 | 26 | 12.7 |
| -0.23, 2.21, -0.11 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.59 | 26 | 14.8 |
| -0.07, 2.27, 0.36 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.4 | 26 | 21.7 |
| 0.01, 2.83, 0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.71 | 26 | 19.1 |
| 0.20, 2.78, 0.34 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.58 | 26 | 17.6 |
| -0.21, 3.51, -0.46 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.08 | 26 | 13.6 |
| -0.04, 4.16, 0.33 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.45 | 26 | 24.5 |
| -0.03, 4.08, -0.34 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.25 | 26 | 17.1 |
| -0.32, 4.38, 0.11 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.07 | 26 | 15.7 |
| -0.40, 5.32, 0.04 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.25 | 26 | 13.1 |
| -0.24, 6.37, 0.19 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.33 | 26 | 18.7 |
| 0.39, 6.61, -0.01 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.48 | 26 | 12.3 |
| -0.14, 6.60, -0.17 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.88 | 26 | 13.3 |
| 0.11, 6.80, 0.25 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.75 | 26 | 19.3 |
| -0.37, 7.79, 0.06 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.36 | 26 | 14.5 |
| -0.17, 1.20, -0.38 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.49 | 25 | 14.4 |
| 0.04, 1.26, 0.33 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.8 | 25 | 13.9 |

(1802 more in the JSON)
