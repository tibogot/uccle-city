# Mesh audit: models/moto/moto.raw.glb bike LOD1 (error 0.0025 m)

20,396 triangles, 10,688 welded vertices, 0 open edges, 0 rays, 2380 ms.

**16 blocking**, 175 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 1 |
| crossing | block | 15 |
| near | warn | 62 |
| sliver | warn | 112 |
| nonmanifold | warn | 1 |
| seam | info | 471 |
| backtoback | info | 77 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.16, 0.82, 0.10 | Body/Frame/Frame + Body/Paint/Paint | 0.07 | 0.5 | 4.8 | 70 | 0.53 | false | 0.88 + -0.42 + -0.22 |

## crossing (block, 15)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.16, 0.78, 0.04 | Body/Frame/Frame + Body/Frame/Frame | 10.2 | 0 |
| 0.11, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 10.8 | 0.1 |
| 0.17, 0.82, 0.12 | Body/Frame/Frame + Body/Paint/Paint | 9 | 0.5 |
| 0.16, 0.81, 0.12 | Body/Frame/Frame + Body/Paint/Paint | 9.1 | 0.2 |
| -0.11, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 11.5 | 0.1 |
| 0.24, 0.49, -0.09 | RiderLegs/Plastic/Plastic + RiderLegs/Boot/Boot | 10.6 | 2.1 |
| 0.25, 0.39, -0.16 | RiderLegs/Plastic/Plastic + RiderLegs/Boot/Boot | 9.5 | 0.2 |
| -0.24, 0.49, -0.09 | RiderLegs/Plastic/Plastic + RiderLegs/Boot/Boot | 10.6 | 2.1 |
| -0.24, 0.39, -0.16 | RiderLegs/Plastic/Plastic + RiderLegs/Boot/Boot | 9.5 | 0.3 |
| 0.01, 1.65, 0.14 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 11.7 | 0 |
| 0.00, 1.65, 0.14 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 10.3 | 0.4 |
| -0.01, 1.41, 0.19 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 6.2 | 0.1 |
| -0.01, 1.41, 0.19 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 6.2 | 0.3 |
| -0.01, 1.41, 0.19 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 8.1 | 0.3 |
| -0.02, 1.41, 0.19 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 8.9 | 0 |

## near (warn, 62)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.06, 0.30, 0.84 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.6 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.07, 0.38, 0.80 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.07, 0.41, 0.72 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.06, 0.41, 0.72 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.07, 0.38, 0.65 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.06, 0.38, 0.65 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.4 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.07, 0.30, 0.61 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.07, 0.22, 0.64 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.07, 0.19, 0.72 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.06, 0.38, 0.80 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.07, 0.38, 0.81 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.6 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.06, 0.41, 0.72 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.07, 0.41, 0.72 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.07, 0.38, 0.65 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.06, 0.30, 0.61 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.07, 0.30, 0.61 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.06, 0.22, 0.64 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.07, 0.22, 0.81 | Wheel_F/Metal/Metal + Wheel_F/Disc/Disc | 2 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.09, 0.28, -0.70 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 2.76 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.09, 0.33, -0.77 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 2.76 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.09, 0.30, -0.76 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 2.76 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.09, 0.32, -0.65 | Wheel_R/Metal/Metal + Wheel_R/Disc/Disc | 2.5 | 0.4 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.09, 0.36, -0.78 | Wheel_R/Metal/Metal + Wheel_R/Disc/Disc | 2.5 | 0.4 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| -0.08, 0.28, -0.78 | Wheel_R/Metal/Metal + Wheel_R/Disc/Disc | 2.5 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.10, 0.42, -0.71 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.6 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.10, 0.42, -0.73 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.10, 0.40, -0.79 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.4 | 3.1 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.40, -0.79 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 3.1 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.40, -0.79 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.6 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.10, 0.39, -0.80 | Wheel_R/Metal/Metal + Body/Engine/Engine | 2.25 | 0.4 | 3.1 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.34, -0.82 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.99 | 0.6 | 3.7 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.33, -0.82 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.93 | 0.5 | 3.7 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.32, -0.82 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 3.7 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.32, -0.82 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 3.7 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.28, -0.81 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.27, -0.81 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.7 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.24, -0.78 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.24, -0.78 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.23, -0.76 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.10, 0.22, -0.71 | Wheel_R/Metal/Metal + Body/Engine/Engine | 1.6 | 0.5 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |

(22 more in the JSON)

## sliver (warn, 112)

| at | part | aspect | longest |
|---|---|---|---|
| -0.26, 1.01, 0.36 | Steer/Metal/Metal | 163 | 0.251 |
| -0.26, 1.01, 0.35 | Steer/Metal/Metal | 48 | 0.25 |
| 0.16, 0.77, 0.03 | Body/Frame/Frame | 64 | 0.294 |
| 0.14, 0.76, -0.00 | Body/Frame/Frame | 51 | 0.251 |
| 0.12, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| 0.14, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| 0.12, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| 0.13, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| 0.11, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| 0.13, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| 0.11, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| 0.12, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| 0.11, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| 0.13, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| 0.11, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| 0.14, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| 0.12, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| 0.14, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| -0.11, 0.60, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| -0.13, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| -0.11, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| -0.13, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| -0.12, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| -0.14, 0.51, -0.26 | Body/Frame/Frame | 52 | 0.427 |
| -0.12, 0.61, -0.36 | Body/Frame/Frame | 52 | 0.427 |
| -0.14, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| -0.12, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| -0.14, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| -0.12, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| -0.13, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| -0.11, 0.60, -0.37 | Body/Frame/Frame | 52 | 0.427 |
| -0.13, 0.50, -0.27 | Body/Frame/Frame | 52 | 0.427 |
| 0.16, 0.39, -0.54 | Body/Metal/Metal | 51 | 0.378 |
| 0.12, 0.41, -0.46 | Body/Metal/Metal | 224 | 0.604 |
| 0.12, 0.35, -0.45 | Body/Metal/Metal | 30637022 | 0.604 |
| 0.16, 0.35, -0.45 | Body/Metal/Metal | 151 | 0.604 |
| 0.12, 0.39, -0.53 | Body/Metal/Metal | 54 | 0.605 |
| -0.16, 0.35, -0.45 | Body/Metal/Metal | 30137332 | 0.604 |
| -0.12, 0.33, -0.52 | Body/Metal/Metal | 50 | 0.378 |
| -0.12, 0.41, -0.46 | Body/Metal/Metal | 63 | 0.604 |

(72 more in the JSON)

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| 0.12, 1.56, 0.12 | RiderTorso/Plastic/Plastic | 4 |

## seam (info, 471)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.10, 0.42, -0.69 | Wheel_R/Metal/Metal + Body/Engine/Engine | 0.95 | 274 | 27 |
| 0.08, 1.44, 0.07 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 1.04 | 183 | 18.5 |
| -0.01, 0.98, -0.35 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 1.6 | 131 | 18.9 |
| 0.05, 1.43, 0.01 | RiderTorso/Jacket/Jacket + RiderTorso/Helmet/Helmet | 0.6 | 99 | 44.1 |
| -0.09, 0.31, -0.68 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0.58 | 98 | 25.4 |
| 0.07, 0.99, -0.34 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.84 | 98 | 21.4 |
| 0.06, 1.44, 0.00 | RiderTorso/Jacket/Jacket + RiderTorso/Helmet/Helmet | 0.61 | 96 | 54.6 |
| -0.05, 1.63, -0.01 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 0.46 | 85 | 40.6 |
| 0.29, 0.53, -0.12 | RiderLegs/Trousers/Trousers + RiderLegs/Rubber/Rubber | 0.59 | 80 | 86.9 |
| 0.02, 1.15, -0.26 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.91 | 79 | 23.1 |
| -0.20, 0.52, -0.12 | RiderLegs/Trousers/Trousers + RiderLegs/Rubber/Rubber | 0.59 | 78 | 86.9 |
| 0.17, 0.93, -0.30 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.59 | 75 | 14.1 |
| -0.17, 0.92, -0.30 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.59 | 74 | 13.4 |
| -0.07, 0.29, 0.77 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.2 | 69 | 18.2 |
| 0.05, 1.46, 0.02 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.54 | 69 | 23.8 |
| -0.16, 1.40, -0.05 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.3 | 69 | 16.6 |
| -0.21, 0.72, 0.06 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.33 | 68 | 26 |
| 0.04, 0.94, -0.15 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.81 | 68 | 84.8 |
| 0.26, 0.72, 0.06 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.33 | 66 | 30.7 |
| 0.07, 0.34, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.33 | 65 | 8.1 |
| -0.10, 0.69, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 65 | 40.3 |
| 0.27, 0.83, 0.01 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.35 | 65 | 30.6 |
| -0.19, 0.83, 0.04 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.35 | 65 | 30.6 |
| 0.25, 1.36, -0.05 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.3 | 65 | 16.6 |
| 0.28, 0.42, -0.26 | RiderLegs/Boot/Boot + RiderLegs/Boot/Boot | 0.46 | 64 | 26.6 |
| 0.09, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 63 | 44.4 |
| 0.14, 0.69, 0.34 | Body/Frame/Frame + Body/Frame/Frame | 0.19 | 62 | 13.9 |
| 0.18, 1.34, -0.12 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.38 | 62 | 48 |
| -0.28, 0.41, -0.25 | RiderLegs/Boot/Boot + RiderLegs/Boot/Boot | 0.45 | 61 | 26.4 |
| -0.05, 0.47, 0.55 | Wheel_F/Rubber/Rubber + Body/Plastic/Plastic | 0.57 | 60 | 53.9 |
| 0.10, 0.89, 0.29 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 60 | 45.5 |
| 0.10, 0.70, 0.35 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 60 | 42.5 |
| 0.10, 0.67, 0.32 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 60 | 39 |
| -0.14, 0.80, 0.07 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 60 | 33 |
| -0.09, 0.70, 0.38 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 60 | 37.8 |
| -0.20, 1.29, -0.04 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.38 | 60 | 48.4 |
| 0.14, 0.81, 0.10 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 59 | 49.1 |
| -0.10, 0.89, 0.29 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 59 | 40.9 |
| -0.13, 0.67, 0.33 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 59 | 35.6 |
| 0.03, 0.99, 0.39 | Steer/Metal/Metal + Steer/Plastic/Plastic | 0.22 | 58 | 15.9 |

(431 more in the JSON)

## backtoback (info, 77)

| at | parts | area |
|---|---|---|
| -0.07, 0.34, 0.73 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00005 |
| 0.07, 0.34, 0.73 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00013 |
| -0.07, 0.34, 0.70 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00014 |
| 0.07, 0.32, 0.69 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00008 |
| -0.07, 0.29, 0.76 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00006 |
| -0.07, 0.33, 0.71 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00049 |
| -0.07, 0.33, 0.73 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00057 |
| -0.07, 0.29, 0.70 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00052 |
| -0.07, 0.27, 0.72 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00018 |
| -0.07, 0.31, 0.71 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00058 |
| -0.07, 0.29, 0.74 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00159 |
| 0.07, 0.27, 0.71 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00017 |
| 0.07, 0.33, 0.72 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00062 |
| 0.07, 0.32, 0.69 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00025 |
| 0.07, 0.30, 0.75 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00031 |
| 0.07, 0.29, 0.75 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00028 |
| 0.07, 0.32, 0.73 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.00066 |
| 0.07, 0.29, 0.72 | Wheel_F/Rim/Rim + Steer/Metal/Metal | 0.0017 |
| 0.12, 0.98, 0.42 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00005 |
| 0.11, 0.97, 0.40 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00005 |
| 0.12, 0.97, 0.41 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00005 |
| 0.12, 0.97, 0.41 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00005 |
| 0.10, 0.98, 0.43 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00007 |
| 0.11, 0.98, 0.42 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.0004 |
| 0.10, 0.97, 0.41 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.00038 |
| -0.00, 1.01, 0.44 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00177 |
| -0.04, 0.99, 0.47 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00183 |
| 0.04, 1.00, 0.45 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00183 |
| 0.00, 0.98, 0.48 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00177 |
| -0.14, 0.82, 0.09 | Body/Frame/Frame + Body/Frame/Frame | 0.00007 |
| 0.17, 0.44, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00015 |
| 0.17, 0.43, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.00009 |
| 0.17, 0.46, -0.12 | Body/Metal/Metal + Body/Metal/Metal | 0.00009 |
| 0.17, 0.44, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.00046 |
| 0.17, 0.45, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00042 |
| -0.17, 0.46, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00007 |
| -0.17, 0.45, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00009 |
| -0.17, 0.47, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.00009 |
| -0.17, 0.44, -0.12 | Body/Metal/Metal + Body/Metal/Metal | 0.00009 |
| -0.17, 0.43, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00006 |

(37 more in the JSON)
