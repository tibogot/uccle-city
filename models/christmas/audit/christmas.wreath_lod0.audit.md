# Mesh audit: christmas wreath_lod0 (needle-vs-needle overlaps exempt: 21)

5,292 triangles, 2,772 welded vertices, 0 open edges, 0 rays, 593 ms.

**0 blocking**, 26 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 1 |
| nonmanifold | warn | 16 |
| seam | info | 131 |
| backtoback | info | 7 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.05, -0.16, 0.16 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 1.47 | 0.6 | 3.6 | 10 | 0.08 | false | 0.28 + 0.74 + 0.61 |

## nonmanifold (warn, 16)

| at | part | uses |
|---|---|---|
| -0.01, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| -0.00, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| 0.00, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| 0.01, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| -0.01, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| -0.00, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| 0.00, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| 0.01, -0.21, 0.15 | wreath_lod0/ribbon_red | 4 |
| -0.00, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| -0.00, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| -0.01, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| 0.01, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |
| 0.00, -0.21, 0.14 | wreath_lod0/ribbon_red | 4 |

## seam (info, 131)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.17, 0.05, 0.09 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.42 | 73 | 12 |
| -0.08, 0.17, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.42 | 67 | 12.2 |
| -0.18, 0.01, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.4 | 67 | 12.2 |
| 0.00, -0.19, 0.14 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.15 | 66 | 43 |
| -0.01, -0.20, 0.14 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.15 | 65 | 43 |
| -0.13, 0.14, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.4 | 64 | 12.8 |
| -0.11, -0.13, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.36 | 60 | 12.3 |
| 0.07, 0.17, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.36 | 59 | 14.2 |
| -0.03, -0.18, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.36 | 58 | 13.4 |
| 0.16, -0.05, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.39 | 58 | 22.6 |
| 0.13, 0.10, 0.09 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.39 | 55 | 13.4 |
| 0.02, 0.18, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.39 | 53 | 16.1 |
| 0.19, 0.02, 0.12 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.33 | 52 | 28.9 |
| 0.12, 0.13, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.36 | 52 | 18 |
| -0.05, 0.18, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.35 | 52 | 17.3 |
| -0.04, -0.15, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.33 | 52 | 13.3 |
| 0.03, -0.17, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.32 | 51 | 15.3 |
| 0.07, -0.15, 0.09 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.35 | 51 | 17.7 |
| -0.12, -0.09, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.34 | 50 | 16.9 |
| -0.07, -0.17, 0.15 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.22 | 50 | 16.7 |
| -0.11, -0.24, 0.13 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.19 | 50 | 20 |
| -0.16, 0.09, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.33 | 49 | 12.7 |
| -0.17, -0.05, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 48 | 14.1 |
| 0.03, -0.18, 0.14 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.22 | 48 | 17.8 |
| 0.11, -0.10, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.33 | 48 | 18.8 |
| 0.14, -0.08, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 47 | 21.1 |
| -0.15, -0.21, 0.14 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.2 | 46 | 20.1 |
| 0.04, -0.26, 0.13 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.23 | 46 | 23.2 |
| 0.01, -0.17, 0.16 | wreath_lod0/fir_needles + wreath_lod0/ribbon_red | 0.15 | 45 | 37.1 |
| -0.15, 0.04, 0.10 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 44 | 36.5 |
| 0.03, -0.17, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.32 | 43 | 18.3 |
| 0.10, 0.13, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.3 | 42 | 17.7 |
| 0.17, 0.00, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 41 | 23.8 |
| -0.04, 0.15, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.3 | 41 | 22.2 |
| 0.18, 0.07, 0.12 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.33 | 40 | 18.8 |
| 0.02, 0.16, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 40 | 29.2 |
| 0.07, -0.15, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.3 | 40 | 22.5 |
| 0.07, 0.16, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 39 | 22 |
| -0.08, 0.14, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.31 | 39 | 27.5 |
| -0.13, -0.09, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.29 | 39 | 16.2 |

(91 more in the JSON)

## backtoback (info, 7)

| at | parts | area |
|---|---|---|
| 0.12, -0.14, 0.11 | wreath_lod0/fir_needles + wreath_lod0/fir_needles | 0.00023 |
| 0.00, -0.21, 0.15 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00005 |
| 0.00, -0.21, 0.15 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00005 |
| 0.00, -0.21, 0.15 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00009 |
| 0.00, -0.21, 0.14 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00007 |
| -0.00, -0.21, 0.14 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00005 |
| -0.00, -0.21, 0.14 | wreath_lod0/ribbon_red + wreath_lod0/ribbon_red | 0.00005 |
