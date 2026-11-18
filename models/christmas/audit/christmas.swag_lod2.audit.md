# Mesh audit: christmas swag_lod2 (needle-vs-needle overlaps exempt: 1)

1,042 triangles, 679 welded vertices, 0 open edges, 0 rays, 31 ms.

**0 blocking**, 12 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 12 |
| seam | info | 141 |
| backtoback | info | 12 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| 0.62, -0.02, 0.22 | swag_lod2/fir_needles | 4 |
| -0.80, 0.01, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.85, 0.04, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.90, 0.00, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.88, 0.03, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.89, -0.02, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod2/ribbon_red | 8 |
| -0.79, 0.02, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.76, 0.03, 0.17 | swag_lod2/ribbon_red | 4 |
| -0.72, 0.03, 0.16 | swag_lod2/ribbon_red | 4 |
| -0.70, -0.02, 0.15 | swag_lod2/ribbon_red | 4 |
| -0.79, -0.01, 0.15 | swag_lod2/ribbon_red | 4 |

## seam (info, 141)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.65, -0.02, 0.18 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.41 | 39 | 18.8 |
| 0.50, -0.09, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.41 | 37 | 16 |
| -0.40, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.34 | 32 | 26.2 |
| -0.66, -0.04, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.29 | 28 | 25 |
| -0.08, -0.17, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.32 | 26 | 27.6 |
| 0.71, 0.00, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.28 | 25 | 28.8 |
| 0.00, -0.25, 0.15 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.29 | 24 | 30.9 |
| 0.56, -0.08, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.24 | 24 | 26.2 |
| -0.73, -0.05, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.24 | 23 | 27.1 |
| -0.27, -0.17, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.29 | 22 | 25.3 |
| 0.66, -0.03, 0.09 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.25 | 22 | 14.7 |
| -0.65, -0.12, 0.19 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.18 | 20 | 32.7 |
| -0.25, -0.18, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 18 | 17.7 |
| -0.54, -0.13, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 17 | 48.3 |
| -0.66, -0.07, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.12 | 16 | 52.9 |
| -0.28, -0.17, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 16 | 36.4 |
| -0.17, -0.17, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 16 | 27.9 |
| -0.07, -0.13, 0.16 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 16 | 22.4 |
| -0.01, -0.19, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.19 | 16 | 32.4 |
| 0.24, -0.17, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.18 | 16 | 35.9 |
| 0.32, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.22 | 16 | 20.4 |
| -0.11, -0.19, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.14 | 15 | 50.9 |
| -0.09, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.12 | 15 | 38.6 |
| -0.03, -0.16, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.18 | 15 | 25.9 |
| 0.05, -0.16, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 15 | 25.9 |
| 0.20, -0.22, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 15 | 23.8 |
| 0.73, -0.03, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 15 | 47.4 |
| -0.42, -0.13, 0.11 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.21 | 15 | 21.8 |
| -0.57, -0.10, 0.14 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.18 | 14 | 29.5 |
| -0.58, -0.07, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 51.4 |
| -0.32, -0.13, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.17 | 14 | 21.1 |
| -0.40, -0.18, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.11 | 14 | 49 |
| -0.10, -0.19, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.16 | 14 | 19.1 |
| 0.37, -0.12, 0.10 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.16 | 14 | 27.1 |
| 0.50, -0.15, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 34 |
| 0.56, -0.06, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.14 | 14 | 62.7 |
| 0.71, -0.01, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.16 | 14 | 46.1 |
| -0.17, -0.19, 0.13 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.16 | 14 | 34.7 |
| -0.10, -0.19, 0.12 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.13 | 14 | 36.4 |
| 0.17, -0.12, 0.16 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.15 | 14 | 22.3 |

(101 more in the JSON)

## backtoback (info, 12)

| at | parts | area |
|---|---|---|
| 0.63, -0.01, 0.24 | swag_lod2/fir_needles + swag_lod2/fir_needles | 0.00068 |
| -0.88, 0.01, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00106 |
| -0.82, -0.05, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00068 |
| -0.79, 0.01, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.0004 |
| -0.78, 0.02, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00068 |
| -0.71, -0.02, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00036 |
| -0.79, -0.01, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00036 |
| -0.80, 0.01, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00021 |
| -0.87, 0.03, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.0004 |
| -0.90, -0.00, 0.15 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00037 |
| -0.76, 0.04, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00018 |
| -0.72, 0.03, 0.16 | swag_lod2/ribbon_red + swag_lod2/ribbon_red | 0.00031 |
