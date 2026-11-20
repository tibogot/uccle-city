# Mesh audit: christmas wreath_lod1 (needle-vs-needle overlaps exempt: 18)

2,092 triangles, 1,176 welded vertices, 0 open edges, 0 rays, 146 ms.

**0 blocking**, 13 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 11 |
| seam | info | 128 |
| backtoback | info | 10 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 11)

| at | part | uses |
|---|---|---|
| -0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.20, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |

## seam (info, 128)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.15, 0.06, 0.09 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.44 | 52 | 14.2 |
| 0.18, 0.00, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.34 | 45 | 22.2 |
| -0.01, -0.20, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.23 | 44 | 16.2 |
| -0.18, 0.01, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.39 | 43 | 16.4 |
| 0.11, 0.15, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.35 | 40 | 13.8 |
| 0.11, 0.15, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.31 | 40 | 17.1 |
| 0.03, 0.19, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 40 | 15.4 |
| -0.12, -0.13, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.34 | 40 | 12.6 |
| -0.01, -0.20, 0.16 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.23 | 39 | 15 |
| -0.09, 0.16, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.36 | 38 | 14.4 |
| 0.08, -0.12, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 38 | 14.7 |
| 0.03, 0.18, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 37 | 16 |
| -0.12, 0.14, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 37 | 14.9 |
| 0.01, -0.15, 0.13 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.34 | 37 | 12.4 |
| -0.06, 0.18, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.3 | 36 | 18.6 |
| -0.14, -0.20, 0.14 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.2 | 35 | 22 |
| -0.07, -0.17, 0.15 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.23 | 34 | 12.7 |
| 0.12, -0.09, 0.14 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 34 | 26.1 |
| -0.17, -0.05, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.3 | 33 | 14.1 |
| 0.02, -0.17, 0.15 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.22 | 33 | 22 |
| 0.18, -0.05, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.38 | 33 | 18.3 |
| 0.04, -0.18, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 32 | 14.9 |
| -0.16, 0.08, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 31 | 14.8 |
| -0.01, -0.18, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 30 | 5.5 |
| -0.09, -0.12, 0.13 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.31 | 30 | 16.9 |
| -0.04, -0.15, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 30 | 15.9 |
| 0.01, -0.17, 0.16 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.16 | 30 | 15.1 |
| 0.15, -0.08, 0.09 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.3 | 29 | 26 |
| -0.16, -0.05, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.27 | 28 | 14.4 |
| 0.18, 0.07, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 27 | 19.8 |
| -0.14, -0.10, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.26 | 27 | 12 |
| 0.16, 0.04, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.26 | 26 | 10.2 |
| 0.15, 0.10, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.19 | 25 | 35.3 |
| -0.18, 0.04, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 25 | 36.5 |
| -0.13, -0.08, 0.14 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.17 | 25 | 30.2 |
| 0.03, -0.25, 0.13 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.21 | 25 | 20.8 |
| 0.19, 0.03, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.28 | 24 | 14.4 |
| -0.01, 0.15, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 24 | 31.5 |
| -0.00, 0.16, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 24 | 19.6 |
| -0.11, 0.15, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.27 | 24 | 35.2 |

(88 more in the JSON)

## backtoback (info, 10)

| at | parts | area |
|---|---|---|
| 0.00, -0.21, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.00, -0.21, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.14, 0.14, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00014 |
| -0.14, 0.15, 0.17 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00012 |
| -0.16, -0.14, 0.16 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00012 |
| -0.14, -0.12, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00013 |
| 0.12, -0.13, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00015 |
| 0.00, 0.24, 0.07 | wreath_lod1/gold_metal + wreath_lod1/gold_metal | 0.00017 |
