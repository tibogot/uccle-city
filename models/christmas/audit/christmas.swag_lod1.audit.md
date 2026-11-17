# Mesh audit: christmas swag_lod1 (needle-vs-needle overlaps exempt: 3)

3,028 triangles, 1,679 welded vertices, 0 open edges, 0 rays, 163 ms.

**0 blocking**, 10 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 10 |
| seam | info | 194 |
| backtoback | info | 7 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 10)

| at | part | uses |
|---|---|---|
| 0.38, -0.23, 0.12 | swag_lod1/gold_metal | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 4 |
| -0.80, -0.00, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.88, 0.02, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.80, -0.00, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 4 |
| -0.75, 0.04, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 6 |

## seam (info, 194)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.50, -0.09, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.47 | 60 | 17.1 |
| 0.63, -0.07, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.37 | 51 | 17.8 |
| 0.66, -0.03, 0.09 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.37 | 50 | 17.7 |
| 0.73, -0.04, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.34 | 48 | 18.2 |
| -0.72, -0.03, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.35 | 45 | 15.1 |
| -0.68, -0.03, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.28 | 45 | 25.7 |
| -0.39, -0.14, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.4 | 45 | 27.6 |
| 0.24, -0.16, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.31 | 45 | 13.2 |
| 0.33, -0.15, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.31 | 45 | 19.7 |
| 0.56, -0.08, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.3 | 43 | 18.4 |
| -0.32, -0.16, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.27 | 40 | 15 |
| -0.24, -0.17, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.28 | 40 | 25.3 |
| 0.00, -0.21, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.32 | 40 | 27 |
| -0.07, -0.18, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.31 | 39 | 12.6 |
| 0.54, -0.09, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 38 | 12.9 |
| -0.07, -0.14, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.21 | 36 | 15.5 |
| -0.45, -0.12, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 33 | 33.6 |
| -0.18, -0.20, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 33 | 36.1 |
| -0.03, -0.18, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 32 | 28.6 |
| -0.29, -0.14, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.19 | 31 | 30.6 |
| 0.74, -0.01, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.24 | 31 | 30.3 |
| -0.27, -0.17, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 30 | 17.9 |
| 0.17, -0.20, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.26 | 30 | 25.1 |
| -0.20, -0.19, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.22 | 29 | 32.7 |
| -0.63, -0.06, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.24 | 29 | 13.7 |
| -0.28, -0.16, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.19 | 29 | 40.2 |
| 0.09, -0.18, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 29 | 21.3 |
| -0.66, -0.06, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.22 | 28 | 33.5 |
| 0.04, -0.19, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 28 | 22 |
| 0.53, -0.12, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.21 | 27 | 23.4 |
| -0.49, -0.14, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.2 | 26 | 40.1 |
| -0.35, -0.14, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.2 | 26 | 53.4 |
| -0.17, -0.17, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.24 | 26 | 16.2 |
| -0.07, -0.19, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 26 | 39.2 |
| 0.17, -0.13, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 26 | 32.3 |
| 0.20, -0.18, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.2 | 25 | 19.1 |
| -0.78, 0.03, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 24 | 23.6 |
| -0.41, -0.15, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.16 | 24 | 41.3 |
| 0.65, -0.04, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 24 | 36 |
| -0.19, -0.17, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 24 | 18 |

(154 more in the JSON)

## backtoback (info, 7)

| at | parts | area |
|---|---|---|
| 0.38, -0.22, 0.12 | swag_lod1/gold_metal + swag_lod1/gold_metal | 0.00016 |
| 0.38, -0.23, 0.12 | swag_lod1/gold_metal + swag_lod1/gold_metal | 0.00018 |
| -0.80, 0.00, 0.02 | swag_lod1/gold_metal + swag_lod1/gold_metal | 0.00028 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00005 |
| -0.80, -0.00, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00005 |
| -0.80, -0.00, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00007 |
| -0.75, 0.04, 0.16 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00014 |
