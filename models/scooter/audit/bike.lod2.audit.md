# Mesh audit: models/scooter/scooter.raw.glb bike LOD2 (error 0.011 m)

2,528 triangles, 1,465 welded vertices, 0 open edges, 0 rays, 143 ms.

**11 blocking**, 40 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 4 |
| depth | block | 1 |
| crossing | block | 6 |
| near | warn | 4 |
| sliver | warn | 2 |
| nonmanifold | warn | 34 |
| seam | info | 126 |
| backtoback | info | 113 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.03, 1.11, 0.23 | Steer/Chrome/Chrome + Steer/Plastic/Plastic | 0 | 2.4 | 5 | 250 | 1.91 | false | -0.08 + 0.81 + -0.58 |
| 0.17, 0.44, 0.15 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0 | 4.2 | 2.4 | 250 | 1.91 | false | 0.38 + -0.21 + 0.9 |
| -0.20, 0.44, 0.12 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.01 | 3 | 4.5 | 250 | 1.91 | false | -0.92 + -0.09 + 0.38 |
| -0.16, 0.45, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0 | 1.3 | 0.6 | 250 | 1.91 | false | 0.39 + -0.17 + 0.91 |

## depth (block, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.30, 1.24, 0.19 | Steer/Chrome/Chrome + Steer/Glass/Glass | 1.07 | 0.7 | 2.8 | 250 | 1.91 | false | -0.24 + 0.14 + -0.96 |

## crossing (block, 6)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -0.04, 0.10, 0.76 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 11.8 | 1.3 |
| 0.04, 1.01, 0.44 | Steer/Paint/Paint + Steer/Paint/Paint | 8.6 | 2.3 |
| 0.03, 1.09, 0.22 | Steer/Plastic/Plastic + Steer/Glass/Glass | 10.3 | 0.1 |
| 0.08, 0.30, 0.62 | Steer/Metal/Metal + Steer/Frame/Frame | 8.8 | 1.7 |
| -0.16, 0.89, -0.25 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10 | 0.3 |
| 0.04, 1.49, -0.07 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 10.7 | 0.1 |

## near (warn, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.04, 0.23, 0.84 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 2.53 | 2.3 | 3.9 | 250 | 1.91 | false | -1 + 0.04 + 0.08 |
| -0.31, 1.27, 0.20 | Steer/Chrome/Chrome + Steer/Glass/Glass | 2.54 | 3.1 | 4.4 | 250 | 1.91 | false | -0.24 + 0.14 + -0.96 |
| -0.30, 1.28, 0.20 | Steer/Chrome/Chrome + Steer/Glass/Glass | 2.34 | 8.6 | 3.5 | 250 | 1.91 | false | -0.15 + 0.12 + -0.98 |
| -0.05, 0.56, -0.97 | Body/Paint/Paint + Body/Chrome/Chrome | 2.76 | 1.6 | 4.6 | 250 | 1.91 | false | 0 + 0 + -1 |

## sliver (warn, 2)

| at | part | aspect | longest |
|---|---|---|---|
| 0.14, 0.59, 0.09 | RiderLegs/Trousers/Trousers | 78 | 0.31 |
| -0.19, 0.59, 0.09 | RiderLegs/Trousers/Trousers | 109 | 0.31 |

## nonmanifold (warn, 34)

| at | part | uses |
|---|---|---|
| 0.05, 0.28, 0.75 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.23, 0.77 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.31, 0.67 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.24, 0.60 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.20, 0.60 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.16, 0.64 | Wheel_F/Disc/Disc | 4 |
| 0.05, 0.15, 0.71 | Wheel_F/Disc/Disc | 4 |
| 0.00, 0.42, 0.87 | Steer/Paint/Paint | 4 |
| 0.00, 0.49, 0.75 | Steer/Paint/Paint | 4 |
| -0.00, 0.49, 0.64 | Steer/Paint/Paint | 4 |
| 0.00, 0.49, 0.70 | Steer/Paint/Paint | 4 |
| 0.00, 0.48, 0.60 | Steer/Paint/Paint | 4 |
| -0.00, 0.45, 0.54 | Steer/Paint/Paint | 4 |
| 0.00, 0.40, 0.48 | Steer/Paint/Paint | 4 |
| 0.04, 1.06, 0.44 | Steer/Chrome/Chrome | 4 |
| -0.07, 1.01, 0.44 | Steer/Chrome/Chrome | 4 |
| -0.05, 0.98, 0.44 | Steer/Chrome/Chrome | 4 |
| 0.06, 0.98, 0.44 | Steer/Chrome/Chrome | 4 |
| 0.01, 1.11, 0.23 | Steer/Glass/Glass | 4 |
| 0.26, 1.27, 0.18 | Steer/Glass/Glass | 4 |
| -0.29, 1.27, 0.19 | Steer/Glass/Glass | 4 |
| 0.16, 0.73, -0.61 | Body/Chrome/Chrome | 4 |
| 0.16, 0.75, -0.62 | Body/Chrome/Chrome | 4 |
| -0.05, 0.75, -0.95 | Body/Chrome/Chrome | 4 |
| -0.08, 0.75, -0.91 | Body/Chrome/Chrome | 4 |
| -0.13, 0.76, -0.86 | Body/Chrome/Chrome | 4 |
| -0.14, 0.76, -0.74 | Body/Chrome/Chrome | 4 |
| -0.16, 0.75, -0.61 | Body/Chrome/Chrome | 4 |
| 0.11, 1.56, -0.14 | RiderTorso/Helmet/Helmet | 4 |
| 0.09, 1.59, -0.02 | RiderTorso/Visor/Visor | 4 |
| 0.07, 1.59, 0.00 | RiderTorso/Visor/Visor | 4 |
| 0.05, 1.60, 0.02 | RiderTorso/Visor/Visor | 4 |
| 0.01, 1.61, 0.03 | RiderTorso/Visor/Visor | 4 |
| -0.07, 1.60, -0.00 | RiderTorso/Visor/Visor | 4 |

## seam (info, 126)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.29, -0.54 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 5.04 | 209 | 14.7 |
| 0.04, 0.30, 0.82 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 3.52 | 166 | 8.9 |
| 0.13, 0.91, -0.21 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 1.73 | 69 | 12.5 |
| 0.03, 0.57, -0.97 | Body/Paint/Paint + Body/TailLight/TailLight | 0.34 | 43 | 12.4 |
| 0.17, 0.86, -0.29 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.62 | 41 | 13.1 |
| -0.01, 1.08, 0.42 | Steer/Paint/Paint + Steer/Paint/Paint | 0.67 | 39 | 12.9 |
| 0.06, 0.69, -0.29 | Body/Paint/Paint + Body/Seat/Seat | 1.48 | 38 | 5 |
| -0.16, 0.84, -0.29 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.57 | 38 | 20.9 |
| 0.19, 0.72, 0.19 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.38 | 38 | 20.9 |
| -0.12, 0.23, -0.14 | Body/Paint/Paint + Body/Paint/Paint | 0.85 | 37 | 31.5 |
| 0.02, 0.19, -0.27 | Body/Engine/Engine + Body/Engine/Engine | 1.04 | 36 | 86.8 |
| 0.02, 0.19, -0.23 | Body/Engine/Engine + Body/Engine/Engine | 1.04 | 36 | 86.8 |
| 0.02, 0.19, -0.25 | Body/Engine/Engine + Body/Engine/Engine | 1.04 | 36 | 86.8 |
| -0.13, 0.71, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.38 | 36 | 23.1 |
| 0.02, 1.46, -0.12 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.67 | 36 | 22.3 |
| -0.02, 0.96, 0.44 | Steer/Paint/Paint + Steer/HeadLight/HeadLight | 0.44 | 34 | 13.1 |
| 0.21, 0.77, 0.10 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.35 | 32 | 14.9 |
| -0.03, 0.25, 0.70 | Wheel_F/Rim/Rim + Wheel_F/Chrome/Chrome | 0.25 | 30 | 6.6 |
| 0.05, 0.91, -0.32 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.72 | 30 | 17.1 |
| -0.07, 0.91, -0.33 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.76 | 30 | 23.8 |
| 0.04, 1.49, -0.07 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.31 | 30 | 17.2 |
| -0.16, 0.82, 0.13 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.36 | 29 | 15.7 |
| -0.10, 0.20, -0.22 | Body/Engine/Engine + Body/Engine/Engine | 0.93 | 28 | 42.6 |
| 0.19, 1.30, -0.16 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.32 | 28 | 44.7 |
| -0.19, 1.31, -0.22 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.33 | 27 | 42.2 |
| 0.04, 1.05, 0.44 | Steer/Paint/Paint + Steer/Chrome/Chrome | 0.28 | 25 | 7.1 |
| -0.03, 0.29, -0.20 | Body/Paint/Paint + Body/Engine/Engine | 0.47 | 25 | 28.6 |
| 0.07, 0.30, 0.61 | Steer/Metal/Metal + Steer/Frame/Frame | 0.19 | 24 | 20 |
| -0.11, 0.31, -0.30 | Body/Paint/Paint + Body/Metal/Metal | 0.35 | 24 | 20.8 |
| -0.03, 1.43, -0.22 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.38 | 24 | 23.8 |
| 0.03, 1.58, -0.03 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.29 | 24 | 53.8 |
| -0.03, 0.96, 0.44 | Steer/Paint/Paint + Steer/Chrome/Chrome | 0.27 | 23 | 16.6 |
| -0.09, 0.25, -0.58 | Body/Metal/Metal + Body/Metal/Metal | 0.39 | 23 | 60.3 |
| -0.21, 0.46, 0.11 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.37 | 23 | 22.2 |
| 0.03, 0.26, -0.68 | Wheel_R/Rim/Rim + Wheel_R/Chrome/Chrome | 0.16 | 22 | 7.9 |
| 0.12, 0.24, 0.35 | Body/Paint/Paint + Body/Paint/Paint | 0.49 | 22 | 13.6 |
| -0.11, 0.24, -0.23 | Body/Paint/Paint + Body/Engine/Engine | 0.4 | 22 | 52.1 |
| 0.11, 0.46, 0.11 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.31 | 22 | 19.2 |
| -0.04, 0.29, -0.21 | Body/Paint/Paint + Body/Engine/Engine | 0.39 | 21 | 55.5 |
| -0.09, 0.29, -0.40 | Body/Metal/Metal + Body/Engine/Engine | 0.41 | 21 | 40.9 |

(86 more in the JSON)

## backtoback (info, 113)

| at | parts | area |
|---|---|---|
| 0.04, 0.20, 0.81 | Wheel_F/Rubber/Rubber + Wheel_F/Rubber/Rubber | 0.00148 |
| 0.03, 0.24, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Metal/Metal | 0.00005 |
| -0.03, 0.23, 0.66 | Wheel_F/Rim/Rim + Wheel_F/Chrome/Chrome | 0.00007 |
| -0.03, 0.21, 0.66 | Wheel_F/Rim/Rim + Wheel_F/Chrome/Chrome | 0.0002 |
| 0.03, 0.21, 0.67 | Wheel_F/Rim/Rim + Wheel_F/Metal/Metal | 0.00015 |
| 0.05, 0.26, 0.76 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00089 |
| 0.05, 0.28, 0.73 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00155 |
| 0.05, 0.32, 0.69 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00084 |
| 0.05, 0.29, 0.70 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00053 |
| 0.05, 0.30, 0.67 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00029 |
| 0.05, 0.30, 0.66 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.0005 |
| 0.05, 0.28, 0.62 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00095 |
| 0.05, 0.25, 0.64 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00089 |
| 0.05, 0.24, 0.62 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.0017 |
| 0.05, 0.22, 0.60 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00097 |
| 0.05, 0.20, 0.61 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00049 |
| 0.05, 0.17, 0.62 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00062 |
| 0.05, 0.18, 0.63 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00027 |
| 0.05, 0.16, 0.64 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00035 |
| 0.05, 0.16, 0.65 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.0005 |
| 0.05, 0.15, 0.70 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00071 |
| 0.05, 0.21, 0.76 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0.00207 |
| -0.05, 0.16, -0.59 | Wheel_R/Rubber/Rubber + Wheel_R/Rubber/Rubber | 0.00332 |
| -0.03, 0.25, -0.66 | Wheel_R/Rim/Rim + Wheel_R/Metal/Metal | 0.00008 |
| 0.03, 1.06, 0.44 | Steer/Paint/Paint + Steer/Chrome/Chrome | 0.00023 |
| -0.04, 0.37, 0.91 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00361 |
| 0.02, 0.49, 0.68 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00895 |
| -0.02, 0.49, 0.72 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00603 |
| -0.02, 0.48, 0.62 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00591 |
| 0.02, 0.46, 0.57 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00865 |
| -0.02, 0.42, 0.51 | Steer/Paint/Paint + Steer/Paint/Paint | 0.01103 |
| 0.02, 0.38, 0.47 | Steer/Paint/Paint + Steer/Paint/Paint | 0.00527 |
| -0.05, 0.99, 0.44 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00105 |
| 0.06, 0.99, 0.44 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00038 |
| 0.07, 1.01, 0.43 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00019 |
| 0.04, 1.11, 0.24 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00076 |
| 0.03, 1.11, 0.23 | Steer/Chrome/Chrome + Steer/Plastic/Plastic | 0.00024 |
| -0.23, 1.15, 0.23 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00082 |
| 0.11, 0.40, 0.62 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.00042 |
| 0.10, 0.36, 0.64 | Steer/Chrome/Chrome + Steer/Chrome/Chrome | 0.0007 |

(73 more in the JSON)
