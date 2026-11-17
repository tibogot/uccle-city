# Mesh audit: christmas tree_lod2 (needle-vs-needle overlaps exempt: 168)

12,578 triangles, 8,309 welded vertices, 0 open edges, 0 rays, 241 ms.

**0 blocking**, 6 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 6 |
| seam | info | 1374 |

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

## seam (info, 1374)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 1.49, -0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.98 | 28 | 13 |
| 0.06, 9.45, -0.00 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.34 | 26 | 44.5 |
| 0.47, 1.17, -0.04 | tree_lod2/fir_needles + tree_lod2/fir_needles | 4.17 | 26 | 15.6 |
| 0.38, 3.00, -0.06 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.23 | 26 | 12.7 |
| -0.00, 1.73, -0.22 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.68 | 24 | 12.7 |
| -0.50, 1.02, 0.29 | tree_lod2/fir_needles + tree_lod2/fir_needles | 3.67 | 23 | 18.4 |
| 0.13, 1.83, 0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.91 | 23 | 14.6 |
| -0.18, 8.46, -0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.69 | 22 | 73.5 |
| -0.15, 1.17, -0.30 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.48 | 22 | 12.2 |
| 0.18, 1.30, -0.22 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.74 | 22 | 13.9 |
| -0.29, 1.30, 0.06 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.36 | 22 | 13.1 |
| -0.09, 2.49, 0.17 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.4 | 22 | 12.7 |
| -0.04, 2.95, 0.18 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.27 | 22 | 20.3 |
| -0.03, 4.05, -0.26 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.92 | 22 | 20.3 |
| 0.14, 4.35, -0.18 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.53 | 22 | 13.9 |
| 0.22, 1.34, 0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.7 | 21 | 13.6 |
| -0.04, 2.48, -0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.14 | 21 | 20.3 |
| 0.15, 3.44, 0.20 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.43 | 21 | 12.4 |
| -0.27, 3.52, 0.18 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.51 | 21 | 16 |
| 0.18, 3.82, 0.18 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.66 | 21 | 17 |
| -0.24, 4.35, 0.09 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.73 | 21 | 20.3 |
| -0.25, 6.33, 0.20 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.24 | 21 | 20.4 |
| 0.01, 8.02, -0.16 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.8 | 21 | 20 |
| -0.11, 2.99, -0.07 | tree_lod2/fir_bark + tree_lod2/fir_needles | 0.48 | 20 | 30.2 |
| -0.11, 2.98, 0.07 | tree_lod2/fir_bark + tree_lod2/fir_needles | 0.49 | 20 | 27.7 |
| -0.39, 7.13, -0.29 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.8 | 20 | 76.5 |
| 0.24, 8.35, -0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.73 | 20 | 70.7 |
| -0.30, 8.07, 0.19 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.72 | 20 | 72.4 |
| 0.29, 8.57, -0.02 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.71 | 20 | 76.2 |
| -0.08, 8.90, -0.24 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.64 | 20 | 73 |
| -0.30, 8.52, -0.02 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.74 | 20 | 70.1 |
| -0.21, 9.13, 0.04 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.66 | 20 | 76 |
| -0.03, 1.25, -0.21 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.11 | 20 | 14 |
| 0.04, 1.90, -0.34 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.8 | 20 | 14.2 |
| -0.19, 3.26, 0.04 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.91 | 20 | 12.8 |
| 0.18, 3.26, 0.04 | tree_lod2/fir_needles + tree_lod2/fir_needles | 2.25 | 20 | 15.8 |
| -0.11, 4.60, 0.13 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.46 | 20 | 21.4 |
| 0.08, 6.88, -0.13 | tree_lod2/fir_needles + tree_lod2/fir_needles | 1.03 | 20 | 16.7 |
| 0.26, 8.73, -0.07 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.66 | 19 | 70.9 |
| 0.11, 8.47, -0.29 | tree_lod2/fir_needles + tree_lod2/fir_needles | 0.67 | 19 | 75.2 |

(1334 more in the JSON)
