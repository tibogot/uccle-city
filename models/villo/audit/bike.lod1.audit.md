# Mesh audit: models/villo/villo.raw.glb bike LOD1 (error 0.0025 m)

6,552 triangles, 3,634 welded vertices, 384 open edges, 0 rays, 755 ms.

**0 blocking**, 602 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 595 |
| nonmanifold | warn | 2 |
| seam | info | 236 |
| backtoback | info | 115 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.02, 0.62, 0.34 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 2.8 | 1.2 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.00, 0.29, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 1.28 | 0.7 | 4.5 | 70 | 0.53 | false | 0 + 0.27 + 0.96 |
| 0.04, 0.80, 0.44 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 1.31 | 0.7 | 0 | 70 | 0.53 | false | 0 + 1 + 0 |
| 0.00, 0.80, 0.44 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 1.31 | 0.7 | 0 | 70 | 0.53 | false | 0 + 1 + 0 |
| -0.04, 0.80, 0.44 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 1.31 | 0.5 | 0 | 70 | 0.53 | false | 0 + 1 + 0 |

## sliver (warn, 595)

| at | part | aspect | longest |
|---|---|---|---|
| -0.02, 0.43, 0.20 | Body/bike_frame/bike_frame | 45 | 0.358 |
| -0.02, 0.62, -0.22 | Body/bike_frame/bike_frame | 75 | 0.519 |
| 0.06, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.06, 0.31, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.05, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.06, 0.30, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.05, 0.30, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.31, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.30, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.32, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.04, 0.31, -0.30 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.05, 0.32, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.05, 0.30, -0.30 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.06, 0.32, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.06, 0.30, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.06, 0.32, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| 0.05, 0.59, -0.37 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.06, 0.46, -0.46 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.58, -0.37 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.46, -0.46 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.59, -0.37 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.46, -0.46 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.03, 0.59, -0.37 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.46, -0.46 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.59, -0.38 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.46, -0.47 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.04, 0.59, -0.38 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.46, -0.47 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.59, -0.38 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.47, -0.47 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.05, 0.59, -0.37 | Body/bike_frame/bike_frame | 70 | 0.481 |
| 0.06, 0.46, -0.47 | Body/bike_frame/bike_frame | 70 | 0.481 |
| -0.04, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.04, 0.31, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.04, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.05, 0.30, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.05, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.06, 0.30, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |

(555 more in the JSON)

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| 0.08, 1.66, -0.00 | RiderTorso/Plastic/Plastic | 4 |
| -0.08, 1.66, -0.00 | RiderTorso/Plastic/Plastic | 4 |

## seam (info, 236)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.34, 0.85 | Wheel_F/bike_black/bike_black + Wheel_F/bike_chrome/bike_chrome | 3.62 | 216 | 52.3 |
| 0.01, 0.34, -0.27 | Wheel_R/bike_black/bike_black + Wheel_R/bike_chrome/bike_chrome | 3.62 | 216 | 52.3 |
| 0.05, 1.66, 0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.35 | 73 | 12.3 |
| 0.00, 1.61, -0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.34 | 68 | 14.8 |
| 0.05, 1.62, -0.10 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.5 | 67 | 23.1 |
| 0.02, 0.48, 0.23 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 1.05 | 66 | 36.7 |
| 0.06, 1.77, 0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.32 | 65 | 50.1 |
| 0.14, 1.11, -0.28 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.84 | 64 | 84 |
| 0.19, 1.46, -0.18 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.33 | 59 | 58.8 |
| -0.19, 1.46, -0.17 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.33 | 59 | 58.5 |
| -0.06, 0.28, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.27 | 54 | 44.9 |
| 0.11, 1.10, -0.38 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.74 | 54 | 37.5 |
| 0.08, 1.11, -0.39 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.71 | 54 | 25.4 |
| 0.01, 0.63, 0.36 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.34 | 48 | 63.5 |
| 0.02, 0.27, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.18 | 46 | 14.1 |
| 0.08, 0.99, -0.42 | Body/bike_black/bike_black + RiderTorso/Trousers/Trousers | 0.6 | 46 | 26.2 |
| 0.02, 1.55, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.33 | 46 | 55.2 |
| -0.00, 1.60, -0.19 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.38 | 40 | 19.8 |
| 0.07, 1.77, 0.03 | RiderTorso/Skin/Skin + RiderTorso/Helmet/Helmet | 0.15 | 40 | 12.6 |
| 0.00, 0.59, 0.34 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.2 | 37 | 15.8 |
| -0.07, 0.34, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.08 | 36 | 20.5 |
| 0.05, 0.34, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.08 | 35 | 20.5 |
| 0.00, 0.57, 0.33 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.24 | 34 | 53.9 |
| 0.08, 1.71, -0.03 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.15 | 34 | 50.6 |
| -0.08, 1.75, -0.04 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.15 | 34 | 50.6 |
| 0.02, 0.30, -0.13 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.14 | 32 | 15.5 |
| 0.01, 1.75, 0.05 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.13 | 28 | 62.3 |
| 0.00, 0.86, 0.30 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.1 | 26 | 76.7 |
| 0.00, 0.30, -0.13 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.12 | 25 | 38.3 |
| 0.00, 1.26, -0.15 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.36 | 24 | 27.8 |
| 0.02, 0.60, 0.36 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.18 | 23 | 40.7 |
| -0.06, 0.33, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.07 | 23 | 40.2 |
| 0.02, 0.57, 0.35 | Steer/bike_frame/bike_frame + Wheel_F/bike_black/bike_black | 0.15 | 22 | 49.2 |
| 0.04, 0.35, 0.55 | Steer/bike_frame/bike_frame + Wheel_F/bike_chrome/bike_chrome | 0.1 | 21 | 47.5 |
| -0.02, 1.63, -0.02 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.15 | 21 | 31 |
| 0.00, 0.59, 0.31 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.26 | 20 | 40 |
| 0.05, 0.32, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.09 | 19 | 57 |
| 0.05, 0.34, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.08 | 19 | 57.7 |
| -0.05, 0.32, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.09 | 19 | 63.9 |
| -0.05, 0.34, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.08 | 19 | 63.5 |

(196 more in the JSON)

## backtoback (info, 115)

| at | parts | area |
|---|---|---|
| -0.01, 0.78, -0.28 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.00007 |
| -0.00, 0.78, -0.29 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.0001 |
| 0.00, 0.78, -0.28 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.00016 |
| 0.02, 0.42, -0.21 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00094 |
| -0.02, 0.42, -0.21 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00095 |
| 0.02, 0.42, -0.91 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00095 |
| -0.02, 0.41, -0.91 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00094 |
| 0.13, 0.88, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.13, 0.94, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.13, 0.83, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.13, 0.94, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.13, 0.88, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.13, 0.99, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.13, 0.80, 0.47 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00036 |
| 0.13, 0.80, 0.62 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00036 |
| 0.13, 0.80, 0.54 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00036 |
| 0.13, 0.80, 0.69 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00037 |
| 0.09, 0.83, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.94, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.88, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.99, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.83, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.94, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.88, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.99, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.09, 0.80, 0.53 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00073 |
| 0.08, 0.80, 0.63 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00073 |
| 0.04, 0.88, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.04, 0.94, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.04, 0.83, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.04, 0.94, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.04, 0.88, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.04, 0.99, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |
| 0.04, 0.80, 0.47 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00037 |
| 0.04, 0.80, 0.62 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00037 |
| 0.04, 0.80, 0.54 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00037 |
| 0.04, 0.80, 0.69 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00037 |
| 0.00, 0.88, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.00, 0.94, 0.73 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00053 |
| 0.00, 0.83, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00026 |

(75 more in the JSON)
