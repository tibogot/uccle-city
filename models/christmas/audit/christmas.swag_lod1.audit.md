# Mesh audit: christmas swag_lod1 (needle-vs-needle overlaps exempt: 4)

2,998 triangles, 1,665 welded vertices, 0 open edges, 0 rays, 177 ms.

**0 blocking**, 9 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| nonmanifold | warn | 6 |
| seam | info | 193 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.59, -0.08, 0.23 | swag_lod1/fir_needles + swag_lod1/bulb_warm | 2.66 | 0.4 | 2.9 | 45 | 0.34 | false | 0.61 + 0.57 + 0.54 |
| -0.80, -0.01, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 2.75 | 0.7 | 0.8 | 45 | 0.34 | false | -0.73 + -0.57 + 0.37 |

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| 0.38, -0.23, 0.12 | swag_lod1/gold_metal | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.16 | swag_lod1/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 8 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red | 4 |
| -0.80, -0.00, 0.16 | swag_lod1/ribbon_red | 4 |

## seam (info, 193)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.50, -0.09, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.46 | 60 | 17.8 |
| 0.63, -0.07, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.36 | 49 | 17.8 |
| 0.73, -0.04, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.34 | 49 | 18.2 |
| 0.66, -0.03, 0.09 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.36 | 48 | 17.7 |
| -0.65, -0.04, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.28 | 47 | 25.7 |
| -0.39, -0.14, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.4 | 45 | 27.6 |
| 0.58, -0.06, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.3 | 42 | 13.8 |
| -0.72, -0.02, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.33 | 41 | 15.1 |
| -0.07, -0.18, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.31 | 41 | 12.6 |
| 0.21, -0.17, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.32 | 41 | 23.6 |
| -0.32, -0.16, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.27 | 38 | 15 |
| 0.00, -0.21, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.32 | 38 | 27 |
| 0.54, -0.09, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 38 | 12.9 |
| 0.33, -0.15, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.29 | 36 | 19.7 |
| -0.45, -0.12, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.24 | 34 | 33.6 |
| -0.07, -0.14, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.21 | 34 | 15.5 |
| -0.24, -0.17, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.27 | 33 | 25.3 |
| -0.18, -0.20, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 33 | 32.1 |
| 0.74, -0.01, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 33 | 26.6 |
| -0.29, -0.14, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.19 | 31 | 30.6 |
| -0.03, -0.18, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 31 | 29.4 |
| 0.09, -0.18, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 31 | 20.7 |
| -0.63, -0.06, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.24 | 30 | 13.7 |
| -0.27, -0.16, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.26 | 29 | 28.6 |
| -0.20, -0.19, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.22 | 28 | 32.7 |
| -0.52, -0.11, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.22 | 28 | 35.2 |
| 0.04, -0.19, 0.10 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.23 | 28 | 22 |
| 0.16, -0.20, 0.11 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.25 | 28 | 32.9 |
| 0.53, -0.12, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.21 | 27 | 23.4 |
| -0.80, -0.00, 0.16 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.12 | 27 | 20.2 |
| -0.49, -0.14, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.2 | 26 | 40.1 |
| -0.35, -0.14, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.2 | 26 | 53.4 |
| 0.17, -0.13, 0.15 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 26 | 32.3 |
| -0.80, 0.00, 0.17 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.14 | 26 | 15.6 |
| -0.66, -0.06, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.22 | 25 | 40.6 |
| -0.28, -0.16, 0.14 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.19 | 25 | 40.2 |
| -0.07, -0.19, 0.12 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 25 | 40.5 |
| -0.78, 0.03, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.17 | 24 | 23.6 |
| -0.41, -0.15, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.16 | 24 | 41.3 |
| 0.06, -0.22, 0.13 | swag_lod1/fir_needles + swag_lod1/fir_needles | 0.18 | 24 | 27.7 |

(153 more in the JSON)

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| -0.80, 0.01, 0.15 | swag_lod1/fir_needles + swag_lod1/ribbon_red | 0.0002 |
| 0.38, -0.22, 0.12 | swag_lod1/gold_metal + swag_lod1/gold_metal | 0.00016 |
| 0.38, -0.23, 0.12 | swag_lod1/gold_metal + swag_lod1/gold_metal | 0.00018 |
| -0.80, 0.00, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00007 |
| -0.80, -0.00, 0.15 | swag_lod1/ribbon_red + swag_lod1/ribbon_red | 0.00007 |
