# Mesh audit: streetkit villo_bike lod2

1,124 triangles, 628 welded vertices, 0 open edges, 0 rays, 65 ms.

**0 blocking**, 31 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1 |
| nonmanifold | warn | 30 |
| seam | info | 43 |
| backtoback | info | 54 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1)

| at | part | aspect | longest |
|---|---|---|---|
| -0.02, 0.47, 0.32 | villo_bike.lod2 | 49 | 0.362 |

## nonmanifold (warn, 30)

| at | part | uses |
|---|---|---|
| 0.00, 0.51, -0.31 | villo_bike.lod2 | 4 |
| 0.00, 0.58, -0.25 | villo_bike.lod2 | 4 |
| 0.00, 0.63, -0.21 | villo_bike.lod2 | 4 |
| 0.00, 0.65, -0.15 | villo_bike.lod2 | 4 |
| 0.00, 0.69, -0.06 | villo_bike.lod2 | 4 |
| 0.00, 0.69, 0.03 | villo_bike.lod2 | 4 |
| 0.00, 0.68, 0.09 | villo_bike.lod2 | 4 |
| 0.00, 0.60, 0.23 | villo_bike.lod2 | 4 |
| 0.00, 0.56, 0.28 | villo_bike.lod2 | 4 |
| 0.00, 0.51, 0.31 | villo_bike.lod2 | 4 |
| 0.00, 0.42, 0.77 | villo_bike.lod2 | 4 |
| 0.00, 0.51, 0.81 | villo_bike.lod2 | 4 |
| 0.00, 0.56, 0.84 | villo_bike.lod2 | 4 |
| 0.00, 0.64, 0.94 | villo_bike.lod2 | 4 |
| 0.00, 0.67, 1.00 | villo_bike.lod2 | 4 |
| 0.00, 0.69, 1.06 | villo_bike.lod2 | 4 |
| 0.00, 0.69, 1.12 | villo_bike.lod2 | 4 |
| 0.00, 0.69, 1.18 | villo_bike.lod2 | 4 |
| 0.00, 0.62, 1.33 | villo_bike.lod2 | 4 |
| 0.00, 0.54, 1.41 | villo_bike.lod2 | 4 |
| -0.08, 0.42, 0.93 | villo_bike.lod2 | 4 |
| -0.08, 0.53, 1.06 | villo_bike.lod2 | 4 |
| -0.08, 0.54, 1.12 | villo_bike.lod2 | 4 |
| -0.08, 0.53, 1.18 | villo_bike.lod2 | 4 |
| -0.09, 0.52, 1.21 | villo_bike.lod2 | 4 |
| 0.09, 0.42, 0.93 | villo_bike.lod2 | 4 |
| 0.08, 0.53, 1.05 | villo_bike.lod2 | 4 |
| 0.08, 0.50, 1.00 | villo_bike.lod2 | 4 |
| 0.08, 0.54, 1.11 | villo_bike.lod2 | 4 |
| 0.08, 0.52, 1.21 | villo_bike.lod2 | 4 |

## seam (info, 43)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.00, 0.37, -0.28 | villo_bike.lod2 + villo_bike.lod2 | 3.4 | 130 | 5.5 |
| -0.01, 0.35, 0.83 | villo_bike.lod2 + villo_bike.lod2 | 1.92 | 99 | 5.2 |
| 0.07, 0.27, 0.70 | villo_bike.lod2 + villo_bike.lod2 | 0.26 | 28 | 43.9 |
| 0.00, 0.28, 0.71 | villo_bike.lod2 + villo_bike.lod2 | 0.19 | 25 | 24 |
| 0.01, 0.57, 0.24 | villo_bike.lod2 + villo_bike.lod2 | 0.24 | 24 | 53.1 |
| 0.02, 0.59, 0.23 | villo_bike.lod2 + villo_bike.lod2 | 0.26 | 21 | 22.9 |
| 0.01, 0.30, 0.70 | villo_bike.lod2 + villo_bike.lod2 | 0.16 | 19 | 40 |
| -0.02, 0.57, 0.19 | villo_bike.lod2 + villo_bike.lod2 | 0.13 | 18 | 40.3 |
| 0.02, 0.52, 0.30 | villo_bike.lod2 + villo_bike.lod2 | 0.38 | 18 | 19 |
| -0.01, 0.62, 0.20 | villo_bike.lod2 + villo_bike.lod2 | 0.21 | 16 | 70.8 |
| 0.22, 1.00, 0.35 | villo_bike.lod2 + villo_bike.lod2 | 0.08 | 14 | 13.2 |
| -0.02, 0.61, 0.21 | villo_bike.lod2 + villo_bike.lod2 | 0.16 | 14 | 38.4 |
| 0.01, 0.30, 0.69 | villo_bike.lod2 + villo_bike.lod2 | 0.12 | 14 | 43.7 |
| -0.01, 0.84, 0.26 | villo_bike.lod2 + villo_bike.lod2 | 0.13 | 14 | 18.8 |
| -0.05, 0.34, -0.01 | villo_bike.lod2 + villo_bike.lod2 | 0.09 | 12 | 24.5 |
| 0.02, 0.61, 0.22 | villo_bike.lod2 + villo_bike.lod2 | 0.26 | 12 | 53.6 |
| -0.21, 1.00, 0.36 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 11 | 27.1 |
| -0.02, 0.60, 0.21 | villo_bike.lod2 + villo_bike.lod2 | 0.16 | 11 | 74.4 |
| -0.06, 0.34, 1.11 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 11 | 27.6 |
| 0.06, 0.34, 1.11 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 11 | 27.6 |
| 0.05, 0.34, -0.00 | villo_bike.lod2 + villo_bike.lod2 | 0.09 | 10 | 42.8 |
| -0.05, 0.32, 1.11 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 10 | 44.8 |
| 0.05, 0.33, 1.10 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 10 | 44.8 |
| 0.06, 0.31, 1.02 | villo_bike.lod2 + villo_bike.lod2 | 0.45 | 9 | 44.7 |
| -0.01, 0.98, 0.27 | villo_bike.lod2 + villo_bike.lod2 | 0.06 | 8 | 40.2 |
| 0.13, 0.28, 0.69 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 8 | 60 |
| 0.14, 0.37, 0.57 | villo_bike.lod2 + villo_bike.lod2 | 0.06 | 8 | 42.9 |
| -0.13, 0.27, 0.70 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 8 | 60 |
| -0.14, 0.19, 0.82 | villo_bike.lod2 + villo_bike.lod2 | 0.06 | 8 | 42.9 |
| -0.03, 0.59, 0.25 | villo_bike.lod2 + villo_bike.lod2 | 0.08 | 8 | 28.5 |
| -0.05, 0.34, 1.11 | villo_bike.lod2 + villo_bike.lod2 | 0.05 | 7 | 58 |
| 0.05, 0.34, 1.11 | villo_bike.lod2 + villo_bike.lod2 | 0.05 | 7 | 80.3 |
| 0.04, 0.57, 0.21 | villo_bike.lod2 + villo_bike.lod2 | 0.07 | 7 | 43.6 |
| -0.04, 0.57, 0.21 | villo_bike.lod2 + villo_bike.lod2 | 0.06 | 7 | 43.6 |
| -0.00, 0.54, 0.25 | villo_bike.lod2 + villo_bike.lod2 | 0.04 | 6 | 8.9 |
| -0.00, 0.78, 0.84 | villo_bike.lod2 + villo_bike.lod2 | 0.03 | 6 | 85.7 |
| 0.01, 0.60, 0.23 | villo_bike.lod2 + villo_bike.lod2 | 0.09 | 6 | 62.1 |
| 0.01, 0.59, 0.25 | villo_bike.lod2 + villo_bike.lod2 | 0.17 | 6 | 44 |
| 0.02, 0.54, 0.29 | villo_bike.lod2 + villo_bike.lod2 | 0.25 | 4 | 64.8 |
| 0.12, 0.29, 0.69 | villo_bike.lod2 + villo_bike.lod2 | 0.05 | 3 | 59.7 |

(3 more in the JSON)

## backtoback (info, 54)

| at | parts | area |
|---|---|---|
| 0.00, 0.30, -0.28 | villo_bike.lod2 + villo_bike.lod2 | 0.00053 |
| 0.12, 0.29, 0.68 | villo_bike.lod2 + villo_bike.lod2 | 0.00006 |
| -0.00, 0.78, 0.84 | villo_bike.lod2 + villo_bike.lod2 | 0.00016 |
| -0.04, 0.66, 0.88 | villo_bike.lod2 + villo_bike.lod2 | 0.00253 |
| -0.05, 0.39, 1.08 | villo_bike.lod2 + villo_bike.lod2 | 0.00253 |
| 0.06, 0.30, 0.91 | villo_bike.lod2 + villo_bike.lod2 | 0.00268 |
| 0.04, 0.66, 0.88 | villo_bike.lod2 + villo_bike.lod2 | 0.00253 |
| 0.06, 0.39, 1.08 | villo_bike.lod2 + villo_bike.lod2 | 0.00253 |
| 0.01, 0.50, -0.32 | villo_bike.lod2 + villo_bike.lod2 | 0.00189 |
| -0.01, 0.55, -0.28 | villo_bike.lod2 + villo_bike.lod2 | 0.0057 |
| 0.01, 0.60, -0.24 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| -0.01, 0.64, -0.17 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| 0.01, 0.67, -0.11 | villo_bike.lod2 + villo_bike.lod2 | 0.00571 |
| -0.01, 0.68, -0.01 | villo_bike.lod2 + villo_bike.lod2 | 0.00571 |
| 0.01, 0.68, 0.05 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| -0.01, 0.67, 0.11 | villo_bike.lod2 + villo_bike.lod2 | 0.00225 |
| 0.01, 0.58, 0.25 | villo_bike.lod2 + villo_bike.lod2 | 0.00378 |
| -0.01, 0.54, 0.29 | villo_bike.lod2 + villo_bike.lod2 | 0.00378 |
| 0.01, 0.41, 0.77 | villo_bike.lod2 + villo_bike.lod2 | 0.00189 |
| -0.01, 0.47, 0.80 | villo_bike.lod2 + villo_bike.lod2 | 0.0057 |
| 0.01, 0.53, 0.82 | villo_bike.lod2 + villo_bike.lod2 | 0.00375 |
| 0.01, 0.63, 0.93 | villo_bike.lod2 + villo_bike.lod2 | 0.00188 |
| -0.02, 0.59, 0.88 | villo_bike.lod2 + villo_bike.lod2 | 0.00186 |
| 0.02, 0.61, 0.90 | villo_bike.lod2 + villo_bike.lod2 | 0.00188 |
| -0.01, 0.57, 0.86 | villo_bike.lod2 + villo_bike.lod2 | 0.00187 |
| -0.01, 0.66, 0.98 | villo_bike.lod2 + villo_bike.lod2 | 0.00376 |
| 0.01, 0.67, 1.02 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| -0.01, 0.69, 1.10 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| 0.01, 0.69, 1.14 | villo_bike.lod2 + villo_bike.lod2 | 0.00377 |
| -0.08, 0.41, 0.88 | villo_bike.lod2 + villo_bike.lod2 | 0.01677 |
| -0.08, 0.54, 0.90 | villo_bike.lod2 + villo_bike.lod2 | 0.01028 |
| -0.08, 0.41, 0.98 | villo_bike.lod2 + villo_bike.lod2 | 0.00699 |
| -0.08, 0.51, 0.97 | villo_bike.lod2 + villo_bike.lod2 | 0.00592 |
| -0.08, 0.38, 1.04 | villo_bike.lod2 + villo_bike.lod2 | 0.00201 |
| -0.08, 0.60, 0.98 | villo_bike.lod2 + villo_bike.lod2 | 0.01028 |
| -0.08, 0.44, 1.06 | villo_bike.lod2 + villo_bike.lod2 | 0.00201 |
| -0.08, 0.38, 1.06 | villo_bike.lod2 + villo_bike.lod2 | 0.00338 |
| -0.08, 0.55, 1.04 | villo_bike.lod2 + villo_bike.lod2 | 0.00699 |
| -0.08, 0.58, 1.08 | villo_bike.lod2 + villo_bike.lod2 | 0.01677 |
| -0.08, 0.58, 1.16 | villo_bike.lod2 + villo_bike.lod2 | 0.01677 |

(14 more in the JSON)
