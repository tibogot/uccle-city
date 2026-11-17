# Mesh audit: christmas wreath_lod2 (needle-vs-needle overlaps exempt: 6)

1,000 triangles, 606 welded vertices, 0 open edges, 0 rays, 38 ms.

**0 blocking**, 8 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 8 |
| seam | info | 105 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| -0.01, -0.19, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod2/ribbon_red | 8 |
| -0.12, -0.18, 0.15 | wreath_lod2/ribbon_red | 4 |
| -0.00, -0.22, 0.13 | wreath_lod2/ribbon_red | 4 |
| 0.01, -0.20, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.00, -0.22, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.10, -0.25, 0.14 | wreath_lod2/ribbon_red | 4 |
| 0.01, -0.20, 0.14 | wreath_lod2/ribbon_red | 4 |

## seam (info, 105)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.15, 0.10, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.33 | 32 | 19.1 |
| 0.17, 0.06, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.31 | 28 | 14.6 |
| -0.06, -0.15, 0.15 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 28 | 15.5 |
| -0.12, 0.12, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.33 | 27 | 16.4 |
| 0.01, -0.15, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.3 | 27 | 12.1 |
| -0.09, 0.14, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.35 | 26 | 14.4 |
| -0.17, -0.03, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.33 | 25 | 19.2 |
| 0.04, -0.17, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.3 | 25 | 22.2 |
| 0.15, 0.10, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.28 | 24 | 31.4 |
| 0.03, -0.17, 0.15 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.19 | 24 | 11.6 |
| 0.18, 0.01, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 23 | 16.1 |
| -0.16, -0.05, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 23 | 13.7 |
| -0.00, 0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 22 | 34.7 |
| -0.17, 0.08, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 22 | 15.9 |
| -0.13, -0.10, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 22 | 17.8 |
| 0.08, -0.12, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 22 | 26.4 |
| 0.19, 0.02, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.34 | 22 | 23 |
| -0.16, -0.05, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 21 | 12.4 |
| 0.04, -0.17, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 21 | 18.7 |
| 0.17, 0.07, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.14 | 21 | 24.2 |
| 0.04, 0.15, 0.13 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.28 | 21 | 13.4 |
| 0.01, 0.17, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.32 | 21 | 18.5 |
| 0.19, 0.04, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 20 | 29.1 |
| 0.17, 0.07, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 20 | 9.9 |
| 0.18, 0.01, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.16 | 20 | 25.6 |
| -0.17, 0.03, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 20 | 14.1 |
| -0.12, 0.13, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.22 | 18 | 16.1 |
| -0.15, 0.07, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.22 | 18 | 20.1 |
| 0.15, 0.11, 0.13 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.17 | 18 | 33.9 |
| -0.09, -0.14, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.25 | 18 | 18.3 |
| -0.02, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.13 | 18 | 19.3 |
| 0.03, -0.27, 0.15 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.16 | 18 | 33.4 |
| 0.23, -0.06, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.13 | 17 | 13.3 |
| -0.13, 0.13, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 17 | 14.4 |
| -0.14, -0.21, 0.14 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.16 | 17 | 17.8 |
| -0.02, -0.15, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.23 | 17 | 17.8 |
| 0.17, 0.08, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 16 | 24.8 |
| -0.17, -0.04, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 16 | 11.7 |
| 0.08, 0.14, 0.13 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.21 | 16 | 24.3 |
| 0.19, 0.03, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.25 | 15 | 15.9 |

(65 more in the JSON)

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| 0.08, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00049 |
| -0.01, -0.20, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00054 |
| -0.12, -0.19, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00054 |
| -0.13, -0.21, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00028 |
| 0.01, -0.21, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00025 |
