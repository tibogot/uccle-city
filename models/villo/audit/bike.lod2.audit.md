# Mesh audit: models/villo/villo.raw.glb bike LOD2 (error 0.011 m)

1,232 triangles, 698 welded vertices, 0 open edges, 0 rays, 66 ms.

**2 blocking**, 37 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 2 |
| near | warn | 1 |
| nonmanifold | warn | 36 |
| seam | info | 51 |
| backtoback | info | 47 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 2)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.01, 0.06, 0.56 | Wheel_F/bike_black/bike_black + Wheel_F/bike_chrome/bike_chrome | 10.3 | 1.6 |
| 0.05, 1.14, -0.43 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 9.3 | 2 |

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.06, 0.34, -0.55 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 2.98 | 2.5 | 4.5 | 250 | 1.91 | false | -1 + -0.01 + 0.08 |

## nonmanifold (warn, 36)

| at | part | uses |
|---|---|---|
| 0.00, 0.45, -0.23 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.51, -0.25 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.56, -0.29 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.61, -0.33 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.64, -0.38 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.67, -0.44 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.68, -0.50 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.69, -0.56 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.68, -0.62 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.67, -0.68 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.64, -0.74 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.61, -0.79 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.56, -0.83 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.51, -0.87 | Body/bike_frame/bike_frame | 4 |
| 0.00, 0.45, -0.89 | Body/bike_frame/bike_frame | 4 |
| 0.08, 0.40, -0.39 | Body/villo_ochre/villo_ochre | 4 |
| 0.08, 0.53, -0.50 | Body/villo_ochre/villo_ochre | 4 |
| 0.08, 0.54, -0.56 | Body/villo_ochre/villo_ochre | 4 |
| 0.08, 0.53, -0.59 | Body/villo_ochre/villo_ochre | 4 |
| -0.08, 0.42, -0.37 | Body/villo_ochre/villo_ochre | 4 |
| -0.08, 0.45, -0.41 | Body/villo_ochre/villo_ochre | 4 |
| -0.08, 0.54, -0.57 | Body/villo_ochre/villo_ochre | 4 |
| -0.08, 0.53, -0.59 | Body/villo_ochre/villo_ochre | 4 |
| 0.00, 0.56, 0.84 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.64, 0.74 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.69, 0.59 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.69, 0.53 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.68, 0.47 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.65, 0.41 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.63, 0.35 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.58, 0.31 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.54, 0.26 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.48, 0.24 | Steer/bike_frame/bike_frame | 4 |
| 0.00, 0.35, 0.84 | Wheel_F/bike_chrome/bike_chrome | 4 |
| 0.00, 0.33, -0.28 | Wheel_R/bike_chrome/bike_chrome | 4 |
| 0.00, 0.40, -0.29 | Wheel_R/bike_chrome/bike_chrome | 4 |

## seam (info, 51)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.39, 0.83 | Wheel_F/bike_black/bike_black + Wheel_F/bike_chrome/bike_chrome | 2.58 | 97 | 12.8 |
| 0.00, 0.42, -0.30 | Wheel_R/bike_black/bike_black + Wheel_R/bike_chrome/bike_chrome | 2.45 | 91 | 13 |
| 0.14, 1.09, -0.29 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 1.86 | 83 | 14.9 |
| 0.09, 1.11, -0.38 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.68 | 34 | 17.4 |
| 0.03, 1.61, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.61 | 33 | 33.2 |
| 0.04, 1.68, 0.03 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.36 | 29 | 25.2 |
| -0.07, 0.27, -0.14 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.26 | 28 | 43.9 |
| 0.09, 1.10, -0.39 | RiderTorso/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.71 | 28 | 27.8 |
| 0.05, 1.76, 0.02 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.3 | 28 | 28.5 |
| -0.18, 1.47, -0.17 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.31 | 27 | 44.8 |
| -0.01, 0.57, 0.32 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.23 | 24 | 40.1 |
| -0.06, 1.57, -0.13 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.37 | 23 | 24.8 |
| 0.19, 1.47, -0.19 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.29 | 22 | 52.7 |
| -0.04, 1.63, -0.03 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.33 | 22 | 30.1 |
| -0.00, 0.29, -0.13 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.18 | 21 | 24 |
| 0.08, 0.98, -0.36 | Body/bike_black/bike_black + RiderTorso/Trousers/Trousers | 0.53 | 19 | 10.2 |
| -0.02, 0.29, -0.13 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.15 | 18 | 40 |
| -0.01, 0.59, 0.33 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.24 | 17 | 13.6 |
| 0.00, 1.72, 0.06 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.11 | 15 | 34.8 |
| 0.03, 1.56, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.3 | 14 | 58.8 |
| 0.00, 0.30, -0.14 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.11 | 12 | 47.9 |
| 0.02, 0.60, 0.35 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.16 | 11 | 74.4 |
| 0.05, 1.77, 0.03 | RiderTorso/Skin/Skin + RiderTorso/Helmet/Helmet | 0.09 | 11 | 29.4 |
| -0.02, 0.61, 0.34 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.28 | 10 | 32.4 |
| -0.02, 0.61, 0.33 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.24 | 10 | 32.4 |
| -0.02, 0.53, 0.26 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.23 | 10 | 28.1 |
| 0.01, 0.63, 0.36 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.09 | 10 | 78.5 |
| -0.05, 0.33, 0.54 | Steer/bike_frame/bike_frame + Wheel_F/bike_chrome/bike_chrome | 0.08 | 10 | 20.6 |
| -0.02, 1.65, -0.04 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.11 | 10 | 15.9 |
| 0.01, 0.44, 0.22 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.29 | 8 | 29.9 |
| 0.02, 0.61, 0.34 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.19 | 8 | 60.6 |
| 0.00, 0.85, 0.29 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.08 | 8 | 75.9 |
| 0.00, 0.57, 0.36 | Steer/bike_frame/bike_frame + Wheel_F/bike_black/bike_black | 0.08 | 8 | 51.6 |
| 0.21, 1.00, 0.21 | Steer/bike_black/bike_black + Steer/bike_black/bike_black | 0.06 | 8 | 33.5 |
| -0.22, 0.99, 0.20 | Steer/bike_black/bike_black + Steer/bike_black/bike_black | 0.07 | 8 | 25.5 |
| 0.05, 0.33, -0.54 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.05 | 7 | 58.9 |
| -0.05, 0.33, -0.55 | Body/bike_frame/bike_frame + Wheel_R/bike_chrome/bike_chrome | 0.06 | 7 | 51.4 |
| 0.04, 0.34, 0.55 | Steer/bike_frame/bike_frame + Wheel_F/bike_chrome/bike_chrome | 0.06 | 7 | 69 |
| -0.02, 0.60, 0.33 | Body/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.04 | 6 | 60.6 |
| 0.06, 0.33, -0.55 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.04 | 6 | 70.6 |

(11 more in the JSON)

## backtoback (info, 47)

| at | parts | area |
|---|---|---|
| 0.04, 0.29, -0.23 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00247 |
| 0.05, 0.32, -0.50 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00247 |
| 0.04, 0.66, -0.32 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00253 |
| 0.05, 0.39, -0.52 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00253 |
| -0.04, 0.29, -0.23 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00247 |
| -0.06, 0.32, -0.50 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00247 |
| -0.04, 0.66, -0.32 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00253 |
| -0.06, 0.39, -0.52 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00253 |
| 0.01, 0.43, -0.22 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| -0.01, 0.47, -0.23 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00376 |
| 0.01, 0.54, -0.27 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| -0.01, 0.57, -0.30 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| 0.01, 0.63, -0.36 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| -0.01, 0.65, -0.40 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| 0.01, 0.68, -0.48 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00375 |
| -0.01, 0.68, -0.52 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00375 |
| 0.01, 0.68, -0.60 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00374 |
| -0.01, 0.68, -0.64 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00376 |
| 0.01, 0.65, -0.72 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00376 |
| -0.01, 0.63, -0.76 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| 0.01, 0.57, -0.82 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| -0.01, 0.54, -0.85 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| 0.01, 0.47, -0.89 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00376 |
| -0.01, 0.43, -0.90 | Body/bike_frame/bike_frame + Body/bike_frame/bike_frame | 0.00377 |
| 0.08, 0.38, -0.42 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.00967 |
| 0.08, 0.48, -0.41 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.04518 |
| 0.08, 0.58, -0.52 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.01676 |
| 0.08, 0.48, -0.58 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.00751 |
| 0.08, 0.54, -0.67 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.03754 |
| -0.08, 0.41, -0.32 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.01676 |
| -0.08, 0.41, -0.44 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.01325 |
| -0.08, 0.53, -0.46 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.04366 |
| -0.08, 0.54, -0.67 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.03754 |
| -0.08, 0.48, -0.58 | Body/villo_ochre/villo_ochre + Body/villo_ochre/villo_ochre | 0.00571 |
| 0.05, 0.54, 0.37 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00231 |
| 0.06, 0.36, 0.53 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00232 |
| -0.05, 0.53, 0.38 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00292 |
| -0.01, 0.69, 0.61 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00225 |
| 0.01, 0.69, 0.55 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00377 |
| -0.01, 0.68, 0.51 | Steer/bike_frame/bike_frame + Steer/bike_frame/bike_frame | 0.00377 |

(7 more in the JSON)
