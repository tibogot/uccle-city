# Mesh audit: christmas swag_lod0 (needle-vs-needle overlaps exempt: 12)

6,036 triangles, 3,180 welded vertices, 0 open edges, 0 rays, 534 ms.

**0 blocking**, 19 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 14 |
| seam | info | 212 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 14)

| at | part | uses |
|---|---|---|
| -0.80, -0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.81, 0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.80, -0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.79, -0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.81, -0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |
| -0.79, 0.00, 0.16 | swag_lod0/ribbon_red | 4 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red | 4 |

## seam (info, 212)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.50, -0.09, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.48 | 73 | 18.4 |
| 0.66, -0.03, 0.09 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.4 | 69 | 21.3 |
| -0.74, -0.02, 0.13 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.38 | 63 | 15.1 |
| -0.32, -0.16, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.35 | 61 | 14.3 |
| -0.38, -0.14, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.41 | 59 | 13 |
| 0.61, -0.06, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.35 | 59 | 17.8 |
| -0.80, 0.01, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.11 | 57 | 48.7 |
| -0.10, -0.15, 0.14 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.33 | 56 | 13.5 |
| 0.72, -0.01, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.36 | 56 | 17 |
| -0.80, 0.01, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.11 | 55 | 48.7 |
| -0.69, -0.03, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.3 | 53 | 19.9 |
| 0.33, -0.15, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.32 | 53 | 21.3 |
| 0.00, -0.21, 0.16 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.32 | 52 | 25.7 |
| 0.56, -0.08, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.3 | 52 | 16.5 |
| 0.22, -0.17, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.31 | 48 | 25.9 |
| -0.24, -0.17, 0.09 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.3 | 47 | 17.4 |
| -0.27, -0.16, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.29 | 46 | 17.7 |
| -0.27, -0.16, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.23 | 43 | 25.8 |
| -0.18, -0.20, 0.15 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.27 | 42 | 21.7 |
| -0.02, -0.18, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.25 | 42 | 32.3 |
| 0.51, -0.11, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.25 | 41 | 25.3 |
| 0.09, -0.18, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.24 | 40 | 19.6 |
| -0.45, -0.12, 0.14 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.24 | 39 | 22.8 |
| -0.02, -0.18, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.24 | 39 | 22.6 |
| 0.07, -0.18, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.2 | 38 | 23.3 |
| 0.17, -0.17, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.26 | 38 | 21.5 |
| 0.56, -0.08, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.26 | 38 | 19.6 |
| -0.35, -0.14, 0.13 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.21 | 37 | 53.4 |
| -0.29, -0.14, 0.15 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.21 | 37 | 33 |
| -0.06, -0.13, 0.15 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.22 | 37 | 26.7 |
| 0.73, -0.01, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.25 | 37 | 35.9 |
| -0.66, -0.06, 0.11 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.23 | 36 | 21.4 |
| -0.20, -0.19, 0.13 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.22 | 35 | 32.7 |
| -0.71, -0.02, 0.14 | swag_lod0/fir_needles + swag_lod0/ribbon_red | 0.13 | 35 | 22.5 |
| 0.06, -0.16, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.25 | 35 | 30.6 |
| 0.16, -0.11, 0.15 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.19 | 35 | 45 |
| -0.17, -0.17, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.26 | 34 | 16.2 |
| -0.65, -0.06, 0.13 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.24 | 33 | 29.9 |
| -0.53, -0.11, 0.10 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.21 | 33 | 36.4 |
| -0.31, -0.14, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.18 | 33 | 22 |

(172 more in the JSON)

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| 0.17, -0.19, 0.12 | swag_lod0/fir_needles + swag_lod0/fir_needles | 0.00004 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.00005 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.00005 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.00005 |
| -0.80, 0.00, 0.15 | swag_lod0/ribbon_red + swag_lod0/ribbon_red | 0.00005 |
