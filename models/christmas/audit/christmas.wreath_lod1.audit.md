# Mesh audit: christmas wreath_lod1 (needle-vs-needle overlaps exempt: 14)

2,054 triangles, 1,157 welded vertices, 0 open edges, 0 rays, 118 ms.

**0 blocking**, 11 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 11 |
| seam | info | 128 |
| backtoback | info | 13 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 11)

| at | part | uses |
|---|---|---|
| 0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.20, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.22, 0.15 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.15 | wreath_lod1/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod1/ribbon_red | 4 |

## seam (info, 128)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.15, 0.06, 0.09 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.39 | 46 | 17.4 |
| 0.07, 0.17, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.34 | 46 | 15.4 |
| -0.09, 0.16, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.42 | 45 | 16 |
| -0.18, 0.08, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.39 | 44 | 14.9 |
| -0.18, 0.01, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.39 | 43 | 16.4 |
| 0.12, 0.14, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.35 | 42 | 14.6 |
| 0.18, 0.00, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.33 | 41 | 14 |
| -0.16, 0.09, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 38 | 15 |
| 0.08, -0.12, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 38 | 14.7 |
| 0.09, 0.16, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 37 | 14.6 |
| 0.03, 0.18, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 37 | 16 |
| -0.11, -0.13, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.33 | 36 | 12.6 |
| -0.00, -0.20, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.24 | 36 | 21.9 |
| 0.00, -0.20, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.2 | 35 | 34.5 |
| -0.05, 0.17, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 34 | 26.5 |
| 0.14, 0.01, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.36 | 34 | 21 |
| -0.17, -0.05, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.3 | 33 | 14.1 |
| -0.14, -0.10, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.31 | 32 | 16.9 |
| 0.01, -0.15, 0.13 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.33 | 32 | 13.8 |
| -0.14, -0.21, 0.14 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.18 | 31 | 15.1 |
| 0.03, -0.16, 0.15 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.22 | 31 | 24.2 |
| 0.04, -0.18, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 31 | 14.9 |
| 0.03, -0.25, 0.13 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.23 | 31 | 27.4 |
| -0.01, -0.16, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 30 | 5.5 |
| -0.07, -0.17, 0.14 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.22 | 30 | 28 |
| -0.07, -0.17, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.3 | 30 | 16.5 |
| 0.12, -0.09, 0.14 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.31 | 30 | 15.7 |
| 0.01, -0.18, 0.16 | wreath_lod1/fir_needles + wreath_lod1/ribbon_red | 0.15 | 29 | 15.1 |
| 0.18, 0.07, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 27 | 19.8 |
| 0.16, 0.04, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.26 | 27 | 10.2 |
| -0.16, -0.05, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.27 | 27 | 14.9 |
| -0.17, 0.05, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 27 | 25.4 |
| 0.15, 0.10, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.19 | 26 | 25.9 |
| 0.19, 0.04, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 25 | 29.2 |
| -0.02, 0.15, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 25 | 31.5 |
| -0.02, -0.16, 0.10 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.27 | 25 | 23.1 |
| -0.15, -0.05, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.17 | 25 | 30.2 |
| 0.15, -0.08, 0.09 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.29 | 25 | 26.1 |
| 0.19, 0.03, 0.12 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.28 | 24 | 14.4 |
| -0.00, 0.16, 0.11 | wreath_lod1/fir_needles + wreath_lod1/fir_needles | 0.32 | 24 | 26.6 |

(88 more in the JSON)

## backtoback (info, 13)

| at | parts | area |
|---|---|---|
| 0.01, -0.21, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00007 |
| -0.01, -0.21, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00007 |
| 0.00, -0.21, 0.15 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.01, -0.21, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00007 |
| -0.01, -0.21, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00007 |
| 0.00, -0.21, 0.14 | wreath_lod1/ribbon_red + wreath_lod1/ribbon_red | 0.00014 |
| 0.14, 0.14, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00014 |
| -0.17, -0.14, 0.15 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00013 |
| -0.14, -0.12, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00013 |
| 0.12, -0.17, 0.16 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00013 |
| 0.12, -0.13, 0.18 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00015 |
| 0.16, 0.14, 0.17 | wreath_lod1/bauble + wreath_lod1/bauble | 0.00015 |
| 0.00, 0.24, 0.07 | wreath_lod1/gold_metal + wreath_lod1/gold_metal | 0.00017 |
