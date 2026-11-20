# Mesh audit: christmas wreath_lod2 (needle-vs-needle overlaps exempt: 7)

868 triangles, 539 welded vertices, 0 open edges, 0 rays, 33 ms.

**0 blocking**, 12 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 12 |
| seam | info | 101 |
| backtoback | info | 11 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| -0.08, -0.15, 0.12 | wreath_lod2/fir_needles | 4 |
| -0.00, -0.20, 0.16 | wreath_lod2/ribbon_red | 4 |
| -0.00, -0.20, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod2/ribbon_red | 8 |
| 0.00, -0.22, 0.13 | wreath_lod2/ribbon_red | 4 |
| 0.01, -0.20, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.00, -0.20, 0.14 | wreath_lod2/ribbon_red | 4 |
| -0.00, -0.19, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.01, -0.20, 0.14 | wreath_lod2/ribbon_red | 4 |
| 0.13, -0.19, 0.15 | wreath_lod2/ribbon_red | 4 |
| 0.10, -0.25, 0.14 | wreath_lod2/ribbon_red | 4 |
| 0.01, -0.23, 0.13 | wreath_lod2/ribbon_red | 4 |

## seam (info, 101)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.17, -0.02, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.44 | 30 | 28 |
| 0.18, -0.03, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.43 | 29 | 28.3 |
| 0.14, 0.11, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.36 | 27 | 12.4 |
| 0.17, 0.03, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 24 | 20.9 |
| 0.04, 0.15, 0.13 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.28 | 24 | 14.9 |
| 0.15, 0.07, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.3 | 23 | 20.4 |
| -0.16, 0.07, 0.15 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 23 | 15 |
| -0.00, 0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 22 | 22.8 |
| 0.01, -0.15, 0.13 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 22 | 18.4 |
| 0.03, -0.17, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 22 | 28.3 |
| -0.01, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.25 | 21 | 22.5 |
| 0.01, 0.17, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.33 | 21 | 13.1 |
| -0.03, -0.15, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.3 | 21 | 25.3 |
| 0.08, -0.12, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.28 | 21 | 13.1 |
| 0.15, 0.11, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 20 | 18.8 |
| 0.09, 0.15, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 20 | 20.6 |
| -0.14, -0.20, 0.14 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.17 | 20 | 21.2 |
| 0.02, -0.18, 0.14 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.28 | 20 | 10.6 |
| 0.16, -0.04, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.27 | 19 | 16.2 |
| -0.08, 0.14, 0.15 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 19 | 13.5 |
| -0.15, -0.10, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.23 | 18 | 16.5 |
| -0.09, 0.15, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.29 | 18 | 13.5 |
| -0.15, 0.09, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.23 | 18 | 42.2 |
| -0.17, 0.04, 0.10 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.16 | 18 | 17.4 |
| -0.13, -0.08, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 18 | 27.2 |
| -0.02, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.11 | 18 | 19.3 |
| 0.03, -0.27, 0.15 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.15 | 18 | 35.2 |
| -0.12, 0.13, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 17 | 16.1 |
| 0.04, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.25 | 17 | 34.8 |
| -0.09, -0.12, 0.14 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.26 | 17 | 17.8 |
| -0.15, 0.07, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.24 | 16 | 20.7 |
| -0.13, -0.10, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.21 | 16 | 20.4 |
| -0.08, -0.15, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.18 | 15 | 35.9 |
| 0.18, -0.02, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.22 | 15 | 18.3 |
| -0.10, -0.24, 0.13 | wreath_lod2/fir_needles + wreath_lod2/ribbon_red | 0.17 | 15 | 37.8 |
| 0.17, 0.03, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.22 | 14 | 17 |
| 0.17, 0.08, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.23 | 14 | 34.5 |
| 0.09, 0.16, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.23 | 14 | 33.9 |
| 0.24, -0.06, 0.09 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.12 | 13 | 22.8 |
| -0.02, 0.15, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.25 | 13 | 38.5 |

(61 more in the JSON)

## backtoback (info, 11)

| at | parts | area |
|---|---|---|
| -0.28, -0.03, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00027 |
| -0.10, -0.14, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00102 |
| 0.08, -0.17, 0.15 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00032 |
| 0.17, 0.05, 0.12 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00046 |
| 0.08, -0.16, 0.11 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00049 |
| 0.06, -0.18, 0.15 | wreath_lod2/fir_needles + wreath_lod2/fir_needles | 0.00043 |
| -0.00, -0.20, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00025 |
| 0.01, -0.23, 0.14 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00047 |
| 0.01, -0.21, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00025 |
| -0.01, -0.24, 0.15 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00029 |
| 0.00, -0.23, 0.13 | wreath_lod2/ribbon_red + wreath_lod2/ribbon_red | 0.00017 |
