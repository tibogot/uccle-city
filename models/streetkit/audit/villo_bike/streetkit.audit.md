# Mesh audit: streetkit villo_bike

9,188 triangles, 4,926 welded vertices, 384 open edges, 0 rays, 714 ms.

**0 blocking**, 536 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 536 |
| seam | info | 233 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 536)

| at | part | aspect | longest |
|---|---|---|---|
| -0.03, 0.33, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.33, -0.19 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.33, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.02, 0.33, -0.19 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.33, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.33, -0.19 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.02, 0.37, -0.18 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.37, -0.18 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.35, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.37, -0.18 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.40, -0.17 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.02, 0.40, -0.17 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.37, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.40, -0.17 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.02, 0.44, -0.16 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.44, -0.16 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.39, -0.09 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.44, -0.16 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.46, -0.13 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.02, 0.46, -0.13 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.41, -0.07 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.47, -0.13 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.03, 0.42, -0.06 | villo_bike/bike_chrome | 122 | 0.254 |
| 0.01, 0.49, -0.10 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.43, -0.04 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.51, -0.07 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.03, 0.43, -0.04 | villo_bike/bike_chrome | 122 | 0.254 |
| -0.01, 0.51, -0.07 | villo_bike/bike_chrome | 122 | 0.254 |

(496 more in the JSON)

## seam (info, 233)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.34, -0.29 | villo_bike/bike_black + villo_bike/bike_chrome | 3.62 | 216 | 52.3 |
| -0.01, 0.34, 0.83 | villo_bike/bike_black + villo_bike/bike_chrome | 3.62 | 216 | 52.3 |
| -0.02, 0.61, 0.22 | villo_bike/bike_frame + villo_bike/bike_frame | 1.06 | 124 | 44 |
| 0.06, 0.28, 0.68 | villo_bike/bike_frame + villo_bike/bike_frame | 0.29 | 90 | 45.3 |
| -0.02, 0.60, 0.22 | villo_bike/bike_frame + villo_bike/bike_frame | 0.25 | 73 | 53.7 |
| -0.02, 0.28, 0.68 | villo_bike/bike_frame + villo_bike/bike_frame | 0.19 | 72 | 20 |
| -0.01, 0.63, 0.20 | villo_bike/bike_frame + villo_bike/bike_frame | 0.34 | 64 | 64.7 |
| -0.00, 0.29, 0.68 | villo_bike/bike_frame + villo_bike/bike_frame | 0.14 | 62 | 27.4 |
| -0.02, 0.60, 0.23 | villo_bike/bike_frame + villo_bike/bike_frame | 0.19 | 56 | 20.7 |
| -0.06, 0.80, 0.13 | villo_bike/bike_frame + villo_bike/bike_frame | 0.49 | 52 | 60 |
| -0.01, 0.60, 0.19 | villo_bike/bike_frame + villo_bike/bike_frame | 0.19 | 47 | 15.4 |
| 0.02, 0.29, 0.70 | villo_bike/bike_frame + villo_bike/bike_frame | 0.12 | 46 | 30.7 |
| 0.21, 1.00, 0.36 | villo_bike/bike_black + villo_bike/bike_black | 0.08 | 44 | 73.7 |
| -0.20, 1.00, 0.36 | villo_bike/bike_black + villo_bike/bike_black | 0.08 | 42 | 73.7 |
| 0.07, 0.34, 1.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.08 | 36 | 20.5 |
| -0.01, 0.98, 0.28 | villo_bike/bike_black + villo_bike/bike_frame | 0.09 | 35 | 39 |
| -0.05, 0.34, 0.02 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.1 | 35 | 56.9 |
| -0.05, 0.34, 1.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.08 | 35 | 20.5 |
| 0.05, 0.34, 0.02 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.1 | 34 | 56.9 |
| -0.13, 0.26, 0.71 | villo_bike/bike_black + villo_bike/bike_frame | 0.09 | 32 | 54.4 |
| 0.13, 0.28, 0.68 | villo_bike/bike_black + villo_bike/bike_frame | 0.09 | 31 | 54.4 |
| 0.05, 0.32, 1.10 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.09 | 31 | 66.7 |
| -0.05, 0.32, 1.10 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.09 | 31 | 66.7 |
| -0.05, 0.35, 1.11 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.08 | 31 | 63.6 |
| 0.05, 0.35, 1.11 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.08 | 31 | 63.6 |
| -0.01, 0.59, 0.19 | villo_bike/bike_black + villo_bike/bike_frame | 0.16 | 30 | 49.2 |
| -0.01, 0.55, 0.24 | villo_bike/bike_black + villo_bike/bike_frame | 0.2 | 26 | 24 |
| -0.00, 0.86, 0.26 | villo_bike/bike_frame + villo_bike/bike_frame | 0.1 | 26 | 76.7 |
| 0.06, 0.33, 1.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.07 | 23 | 40.2 |
| 0.14, 0.37, 0.56 | villo_bike/bike_black + villo_bike/bike_black | 0.09 | 22 | 16.7 |
| -0.14, 0.20, 0.81 | villo_bike/bike_black + villo_bike/bike_black | 0.09 | 22 | 16.7 |
| 0.00, 0.59, 0.25 | villo_bike/bike_frame + villo_bike/bike_frame | 0.26 | 20 | 40 |
| 0.06, 0.32, 1.12 | villo_bike/bike_frame + villo_bike/bike_frame | 0.57 | 17 | 8.3 |
| -0.05, 0.57, 0.20 | villo_bike/bike_frame + villo_bike/bike_frame | 0.08 | 16 | 43.6 |
| 0.00, 0.80, 0.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.02 | 16 | 49.2 |
| 0.04, 0.80, 0.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.02 | 16 | 49.2 |
| -0.00, 0.78, 0.83 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.04 | 14 | 85.9 |
| 0.06, 0.57, 0.22 | villo_bike/bike_frame + villo_bike/bike_frame | 0.08 | 14 | 43.6 |
| -0.04, 0.80, 0.11 | villo_bike/bike_frame + villo_bike/bike_frame | 0.02 | 14 | 49.2 |
| 0.12, 0.28, 0.69 | villo_bike/bike_black + villo_bike/bike_frame | 0.09 | 12 | 20.6 |

(193 more in the JSON)

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 0.01, 0.78, 0.84 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.00011 |
| -0.00, 0.78, 0.85 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.00011 |
| -0.00, 0.78, 0.84 | villo_bike/bike_chrome + villo_bike/bike_frame | 0.00016 |


Nodes: villo_bike. Distances: {"villo_bike":180}. Quantum 0.000 mm. Offset 0,0,0.
