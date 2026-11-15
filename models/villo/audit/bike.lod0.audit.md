# Mesh audit: models/villo/villo.raw.glb bike LOD0 (error 0 m)

13,904 triangles, 7,310 welded vertices, 384 open edges, 0 rays, 2316 ms.

**0 blocking**, 536 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 536 |
| seam | info | 247 |
| backtoback | info | 19 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 536)

| at | part | aspect | longest |
|---|---|---|---|
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
| -0.06, 0.29, -0.31 | Body/bike_frame/bike_frame | 46 | 0.384 |
| -0.06, 0.31, -0.43 | Body/bike_frame/bike_frame | 46 | 0.384 |

(496 more in the JSON)

## seam (info, 247)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.34, 0.85 | Wheel_F/bike_black/bike_black + Wheel_F/bike_chrome/bike_chrome | 3.62 | 216 | 52.3 |
| 0.01, 0.34, -0.27 | Wheel_R/bike_black/bike_black + Wheel_R/bike_chrome/bike_chrome | 3.62 | 216 | 52.3 |
| 0.02, 0.61, 0.34 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 1.06 | 124 | 44 |
| -0.06, 0.28, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.29 | 90 | 45.3 |
| 0.06, 1.77, 0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.33 | 86 | 50.5 |
| 0.07, 0.99, -0.43 | Body/bike_black/bike_black + RiderTorso/Trousers/Trousers | 0.62 | 84 | 34.2 |
| 0.02, 1.62, -0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.34 | 79 | 22.4 |
| 0.05, 1.66, 0.01 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.32 | 79 | 18.6 |
| 0.15, 1.13, -0.33 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.84 | 78 | 83.2 |
| 0.05, 1.62, -0.10 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.51 | 77 | 28.7 |
| 0.02, 0.60, 0.34 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.25 | 73 | 53.7 |
| 0.02, 0.28, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.19 | 72 | 20 |
| 0.08, 1.11, -0.39 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.71 | 70 | 26.5 |
| 0.19, 1.46, -0.18 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.34 | 66 | 58.8 |
| -0.19, 1.46, -0.17 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.34 | 66 | 58.5 |
| 0.01, 1.56, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.38 | 66 | 76.6 |
| 0.01, 0.63, 0.36 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.34 | 64 | 64.7 |
| 0.00, 0.29, -0.12 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.14 | 62 | 27.4 |
| 0.11, 1.10, -0.38 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.74 | 61 | 38 |
| 0.02, 0.60, 0.33 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.19 | 56 | 20.7 |
| 0.06, 0.80, 0.43 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.49 | 52 | 60 |
| 0.01, 0.60, 0.37 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.19 | 47 | 15.4 |
| 0.03, 1.56, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.33 | 47 | 55.6 |
| 0.01, 1.76, 0.05 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.14 | 47 | 65 |
| -0.02, 0.29, -0.14 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.12 | 46 | 30.7 |
| 0.00, 1.29, -0.13 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.36 | 46 | 5.4 |
| -0.21, 1.00, 0.20 | Steer/bike_black/bike_black + Steer/bike_black/bike_black | 0.08 | 44 | 73.7 |
| 0.20, 1.00, 0.20 | Steer/bike_black/bike_black + Steer/bike_black/bike_black | 0.08 | 42 | 73.7 |
| 0.08, 1.71, -0.03 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.15 | 40 | 64.2 |
| -0.08, 1.75, -0.04 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.15 | 40 | 64.2 |
| 0.07, 1.77, 0.03 | RiderTorso/Skin/Skin + RiderTorso/Helmet/Helmet | 0.14 | 40 | 17.4 |
| -0.07, 0.34, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.08 | 36 | 20.5 |
| 0.05, 0.34, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.08 | 35 | 20.5 |
| 0.04, 0.34, 0.54 | Steer/bike_frame/bike_frame + Wheel_F/bike_chrome/bike_chrome | 0.1 | 35 | 56.9 |
| 0.01, 0.98, 0.29 | Steer/bike_frame/bike_frame + Steer/bike_black/bike_black | 0.09 | 35 | 39 |
| -0.05, 0.34, 0.54 | Steer/bike_frame/bike_frame + Wheel_F/bike_chrome/bike_chrome | 0.1 | 34 | 56.9 |
| 0.01, 1.76, 0.04 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.07 | 34 | 51.6 |
| 0.05, 0.32, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.09 | 31 | 66.7 |
| 0.05, 0.35, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.08 | 31 | 63.6 |
| -0.05, 0.32, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.09 | 31 | 66.7 |

(207 more in the JSON)

## backtoback (info, 19)

| at | parts | area |
|---|---|---|
| 0.00, 0.78, -0.29 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.00011 |
| -0.01, 0.78, -0.28 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.00011 |
| 0.00, 0.78, -0.28 | Body/bike_frame/bike_frame + Body/bike_chrome/bike_chrome | 0.00016 |
| 0.00, 1.12, -0.22 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 1.12, -0.22 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 1.15, -0.21 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| 0.00, 1.17, -0.20 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.20, -0.18 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| -0.00, 1.20, -0.18 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.25, -0.15 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00006 |
| -0.00, 1.28, -0.14 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00006 |
| 0.00, 1.33, -0.11 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 1.33, -0.11 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| -0.00, 1.36, -0.10 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.38, -0.10 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.42, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 1.42, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 1.45, -0.08 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| 0.00, 1.47, -0.08 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00006 |
