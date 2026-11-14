# Mesh audit: streetkit villo_bike lod1

3,854 triangles, 2,256 welded vertices, 366 open edges, 0 rays, 284 ms.

**0 blocking**, 597 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 591 |
| nonmanifold | warn | 1 |
| seam | info | 225 |
| backtoback | info | 89 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.02, 0.62, 0.22 | villo_bike.lod1 + villo_bike.lod1 | 2.8 | 1.2 | 0 | 45 | 0.34 | false | -1 + 0 + 0 |
| 0.00, 0.29, 0.68 | villo_bike.lod1 + villo_bike.lod1 | 1.28 | 0.7 | 4.5 | 45 | 0.34 | false | 0 + 0.27 + -0.96 |
| -0.04, 0.80, 0.12 | villo_bike.lod1 + villo_bike.lod1 | 1.19 | 0.7 | 0.5 | 45 | 0.34 | false | 0 + 1 + 0.01 |
| 0.00, 0.80, 0.12 | villo_bike.lod1 + villo_bike.lod1 | 1.19 | 0.7 | 0.5 | 45 | 0.34 | false | 0 + 1 + 0.01 |
| 0.04, 0.80, 0.12 | villo_bike.lod1 + villo_bike.lod1 | 1.22 | 0.5 | 0.5 | 45 | 0.34 | false | 0 + 1 + 0.01 |

## sliver (warn, 591)

| at | part | aspect | longest |
|---|---|---|---|
| -0.03, 0.33, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.33, -0.19 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.33, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.02, 0.33, -0.19 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.33, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.33, -0.19 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| 0.02, 0.37, -0.18 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.37, -0.18 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.37, -0.18 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.40, -0.17 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.02, 0.40, -0.17 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.40, -0.17 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike.lod1 | 122 | 0.254 |
| 0.02, 0.44, -0.16 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.44, -0.16 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.44, -0.16 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.46, -0.13 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike.lod1 | 122 | 0.254 |
| -0.02, 0.46, -0.13 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.47, -0.13 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike.lod1 | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.43, -0.04 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.51, -0.07 | villo_bike.lod1 | 122 | 0.254 |
| -0.03, 0.43, -0.04 | villo_bike.lod1 | 122 | 0.254 |
| -0.01, 0.51, -0.07 | villo_bike.lod1 | 122 | 0.254 |

(551 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| -0.02, 0.18, 1.12 | villo_bike.lod1 | 4 |

## seam (info, 225)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.34, -0.29 | villo_bike.lod1 + villo_bike.lod1 | 3.62 | 216 | 52.3 |
| -0.01, 0.34, 0.83 | villo_bike.lod1 + villo_bike.lod1 | 3.62 | 216 | 52.3 |
| -0.02, 0.48, 0.33 | villo_bike.lod1 + villo_bike.lod1 | 1.05 | 66 | 36.7 |
| 0.06, 0.28, 0.68 | villo_bike.lod1 + villo_bike.lod1 | 0.27 | 54 | 44.9 |
| -0.01, 0.63, 0.20 | villo_bike.lod1 + villo_bike.lod1 | 0.34 | 48 | 63.5 |
| 0.01, 0.30, 0.70 | villo_bike.lod1 + villo_bike.lod1 | 0.19 | 45 | 14.1 |
| 0.07, 0.34, 1.11 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 36 | 20.5 |
| -0.02, 0.61, 0.23 | villo_bike.lod1 + villo_bike.lod1 | 0.2 | 35 | 14 |
| -0.05, 0.34, 1.11 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 35 | 20.5 |
| -0.02, 0.57, 0.25 | villo_bike.lod1 + villo_bike.lod1 | 0.24 | 34 | 53.1 |
| 0.00, 0.28, 0.72 | villo_bike.lod1 + villo_bike.lod1 | 0.14 | 30 | 15.5 |
| 0.01, 0.30, 0.69 | villo_bike.lod1 + villo_bike.lod1 | 0.12 | 27 | 20 |
| -0.00, 0.86, 0.26 | villo_bike.lod1 + villo_bike.lod1 | 0.1 | 26 | 76.7 |
| -0.02, 0.60, 0.20 | villo_bike.lod1 + villo_bike.lod1 | 0.18 | 23 | 40.7 |
| 0.06, 0.33, 1.11 | villo_bike.lod1 + villo_bike.lod1 | 0.07 | 23 | 40.2 |
| -0.01, 0.59, 0.19 | villo_bike.lod1 + villo_bike.lod1 | 0.15 | 22 | 49.2 |
| -0.05, 0.34, 0.02 | villo_bike.lod1 + villo_bike.lod1 | 0.1 | 22 | 47.5 |
| -0.21, 1.00, 0.36 | villo_bike.lod1 + villo_bike.lod1 | 0.07 | 20 | 73.5 |
| -0.00, 0.59, 0.25 | villo_bike.lod1 + villo_bike.lod1 | 0.26 | 20 | 40 |
| -0.05, 0.32, 1.10 | villo_bike.lod1 + villo_bike.lod1 | 0.09 | 19 | 57 |
| -0.05, 0.34, 1.10 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 19 | 57.7 |
| 0.05, 0.34, 1.10 | villo_bike.lod1 + villo_bike.lod1 | 0.09 | 19 | 63.9 |
| 0.05, 0.34, 1.10 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 19 | 63.5 |
| 0.13, 0.28, 0.68 | villo_bike.lod1 + villo_bike.lod1 | 0.09 | 18 | 64.4 |
| -0.13, 0.26, 0.71 | villo_bike.lod1 + villo_bike.lod1 | 0.09 | 18 | 64.4 |
| 0.05, 0.35, 0.00 | villo_bike.lod1 + villo_bike.lod1 | 0.1 | 18 | 65.3 |
| -0.01, 0.98, 0.28 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 17 | 20 |
| 0.22, 1.00, 0.35 | villo_bike.lod1 + villo_bike.lod1 | 0.07 | 17 | 73.6 |
| 0.06, 0.32, 1.12 | villo_bike.lod1 + villo_bike.lod1 | 0.57 | 17 | 8.3 |
| 0.04, 0.57, 0.20 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 16 | 43.6 |
| -0.06, 0.80, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.25 | 16 | 60 |
| -0.03, 0.57, 0.22 | villo_bike.lod1 + villo_bike.lod1 | 0.08 | 15 | 43.6 |
| -0.00, 0.55, 0.24 | villo_bike.lod1 + villo_bike.lod1 | 0.19 | 12 | 11.9 |
| 0.12, 0.28, 0.69 | villo_bike.lod1 + villo_bike.lod1 | 0.09 | 12 | 20.6 |
| -0.00, 0.33, -0.27 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 66.5 |
| 0.00, 0.60, 0.00 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 53 |
| 0.00, 0.33, 0.27 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 50 |
| 0.00, 0.06, 0.00 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 53 |
| -0.00, 0.33, 0.85 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 66.5 |
| 0.00, 0.33, 1.39 | villo_bike.lod1 + villo_bike.lod1 | 0.01 | 12 | 50 |

(185 more in the JSON)

## backtoback (info, 89)

| at | parts | area |
|---|---|---|
| -0.04, 0.38, 1.10 | villo_bike.lod1 + villo_bike.lod1 | 0.00013 |
| -0.03, 0.44, 1.08 | villo_bike.lod1 + villo_bike.lod1 | 0.00013 |
| 0.04, 0.28, 1.15 | villo_bike.lod1 + villo_bike.lod1 | 0.00018 |
| 0.02, 0.20, 1.20 | villo_bike.lod1 + villo_bike.lod1 | 0.00009 |
| -0.03, 0.23, 1.12 | villo_bike.lod1 + villo_bike.lod1 | 0.00026 |
| -0.01, 0.14, 1.12 | villo_bike.lod1 + villo_bike.lod1 | 0.00026 |
| -0.04, 0.27, 1.09 | villo_bike.lod1 + villo_bike.lod1 | 0.00018 |
| -0.02, 0.19, 1.06 | villo_bike.lod1 + villo_bike.lod1 | 0.00009 |
| 0.00, 0.78, 0.85 | villo_bike.lod1 + villo_bike.lod1 | 0.00005 |
| 0.00, 0.78, 0.83 | villo_bike.lod1 + villo_bike.lod1 | 0.00006 |
| 0.01, 0.78, 0.83 | villo_bike.lod1 + villo_bike.lod1 | 0.00005 |
| -0.00, 0.78, 0.85 | villo_bike.lod1 + villo_bike.lod1 | 0.00007 |
| -0.00, 0.78, 0.84 | villo_bike.lod1 + villo_bike.lod1 | 0.00017 |
| -0.13, 0.88, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.13, 0.94, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.13, 0.88, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.13, 0.94, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.13, 0.80, 0.03 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.13, 0.80, -0.07 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.09, 0.88, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.09, 0.94, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.09, 0.88, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.09, 0.94, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.09, 0.80, 0.03 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.08, 0.80, -0.07 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.04, 0.88, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.04, 0.94, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.04, 0.88, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.04, 0.94, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.04, 0.80, 0.03 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.04, 0.80, -0.07 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| -0.00, 0.88, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| 0.00, 0.94, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| -0.00, 0.88, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| 0.00, 0.94, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| 0.00, 0.80, 0.03 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| 0.00, 0.80, -0.07 | villo_bike.lod1 + villo_bike.lod1 | 0.00073 |
| 0.04, 0.88, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| 0.04, 0.94, -0.17 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |
| 0.04, 0.88, 0.13 | villo_bike.lod1 + villo_bike.lod1 | 0.00053 |

(49 more in the JSON)
