# Mesh audit: christmas swag_lod2 (needle-vs-needle overlaps exempt: 3)

1,048 triangles, 681 welded vertices, 0 open edges, 0 rays, 31 ms.

**0 blocking**, 19 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 19 |
| seam | info | 143 |
| backtoback | info | 15 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 19)

| at | part | uses |
|---|---|---|
| -0.28, -0.14, 0.20 | swag_lod2/fir_needles | 4 |
| 0.63, -0.05, 0.13 | swag_lod2/fir_needles | 4 |
| -0.80, 0.00, 0.15 | swag_lod2/ribbon_red | 8 |
| -0.80, 0.01, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.85, 0.04, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.88, 0.02, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.90, 0.01, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.88, -0.03, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.90, -0.01, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.85, -0.04, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.83, -0.03, 0.14 | swag_lod2/ribbon_red | 4 |
| -0.81, -0.01, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.75, 0.04, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.72, 0.03, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.70, -0.01, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.76, -0.03, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.72, -0.03, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.79, -0.01, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.80, 0.01, 0.15 | swag_lod2/ribbon_red | 4 |

## seam (info, 143)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.50, -0.09, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.42 | 40 | 16 |
| -0.39, -0.16, 0.10 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.28 | 30 | 29.1 |
| 0.71, 0.00, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.29 | 28 | 20.5 |
| 0.00, -0.25, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.29 | 24 | 30.9 |
| -0.68, -0.03, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.22 | 23 | 25.6 |
| -0.27, -0.17, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.28 | 21 | 23.4 |
| 0.68, -0.04, 0.09 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.27 | 21 | 37.5 |
| 0.65, -0.02, 0.19 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.3 | 19 | 18.1 |
| -0.03, -0.16, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 18 | 34.8 |
| -0.64, -0.12, 0.18 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 18 | 34 |
| -0.08, -0.17, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.22 | 18 | 19.8 |
| -0.02, -0.18, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 18 | 31.8 |
| 0.17, -0.18, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.28 | 18 | 16.1 |
| 0.57, -0.09, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.21 | 18 | 37.2 |
| -0.20, -0.22, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.17 | 17 | 20.7 |
| -0.42, -0.14, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.21 | 17 | 32.1 |
| -0.54, -0.12, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.14 | 16 | 45.5 |
| 0.71, -0.01, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.17 | 16 | 46.1 |
| -0.29, -0.15, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.21 | 16 | 40.5 |
| -0.17, -0.21, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.22 | 16 | 52.7 |
| -0.06, -0.16, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.17 | 16 | 40.3 |
| 0.33, -0.16, 0.10 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.22 | 16 | 15.5 |
| -0.66, -0.07, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.12 | 15 | 60.3 |
| -0.53, -0.11, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.16 | 15 | 42.6 |
| -0.17, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 15 | 34.4 |
| 0.20, -0.22, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 15 | 23.8 |
| 0.29, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.17 | 15 | 37.6 |
| -0.65, -0.07, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 15 | 42.3 |
| -0.52, -0.11, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.2 | 15 | 25.6 |
| -0.17, -0.17, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 15 | 28.9 |
| -0.02, -0.20, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.08 | 15 | 35.9 |
| -0.58, -0.10, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 14 | 14.2 |
| -0.57, -0.08, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 53.4 |
| -0.41, -0.18, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 62.8 |
| -0.08, -0.16, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 32.1 |
| 0.57, -0.06, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 54.3 |
| 0.72, -0.01, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 45.8 |
| -0.65, -0.07, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 14 | 33.9 |
| -0.24, -0.17, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.27 | 14 | 29.6 |
| 0.06, -0.18, 0.16 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 43.5 |

(103 more in the JSON)

## backtoback (info, 15)

| at | parts | area |
|---|---|---|
| -0.29, -0.14, 0.21 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.00066 |
| 0.28, -0.19, 0.23 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.00146 |
| -0.66, -0.12, 0.20 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.00009 |
| -0.89, 0.02, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00038 |
| -0.88, -0.02, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00065 |
| -0.87, -0.03, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00045 |
| -0.84, -0.03, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00036 |
| -0.82, -0.02, 0.14 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00012 |
| -0.80, -0.00, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00016 |
| -0.82, -0.05, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00059 |
| -0.74, -0.03, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.0004 |
| -0.78, -0.01, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00101 |
| -0.80, 0.01, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00021 |
| -0.90, -0.00, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00034 |
| -0.72, -0.02, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00067 |
