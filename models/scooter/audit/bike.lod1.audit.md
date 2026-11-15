# Mesh audit: models/scooter/scooter.raw.glb bike LOD1 (error 0.0025 m)

14,150 triangles, 7,365 welded vertices, 0 open edges, 0 rays, 1518 ms.

**28 blocking**, 49 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 13 |
| crossing | block | 15 |
| near | warn | 3 |
| sliver | warn | 42 |
| nonmanifold | warn | 4 |
| seam | info | 192 |
| backtoback | info | 125 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 13)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.05, 0.23, 0.75 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.6 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.05, 0.23, 0.75 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.9 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.05, 0.29, 0.72 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.6 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.05, 0.29, 0.65 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.7 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.05, 0.29, 0.65 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.7 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.05, 0.23, 0.62 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.4 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.05, 0.23, 0.62 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.4 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.05, 0.17, 0.65 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.8 | 0 | 70 | 0.53 | false | -1 + 0 + 0 |
| 0.05, 0.17, 0.65 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.7 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| 0.05, 0.17, 0.72 | Wheel_F/Disc/Disc + Wheel_F/Disc/Disc | 0 | 0.5 | 0 | 70 | 0.53 | false | 1 + 0 + 0 |
| -0.12, 0.23, -0.12 | Body/Paint/Paint + Body/Paint/Paint | 0.24 | 3.2 | 4.9 | 70 | 0.53 | false | -0.07 + -1 + 0 |
| -0.12, 0.23, -0.13 | Body/Paint/Paint + Body/Paint/Paint | 0 | 1.5 | 3.5 | 70 | 0.53 | false | -0.07 + -1 + 0 |
| 0.14, 0.75, -0.33 | Body/Plastic/Plastic + Body/Seat/Seat | 0.42 | 0.5 | 3.1 | 70 | 0.53 | false | 0.99 + 0.11 + 0.06 |

## crossing (block, 15)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.10, 0.43, 0.58 | Steer/Chrome/Chrome + Steer/Frame/Frame | 9.2 | 0 |
| 0.10, 0.22, 0.66 | Steer/Metal/Metal + Steer/Metal/Metal | 11.7 | 0.5 |
| 0.06, 0.57, -0.97 | Body/Paint/Paint + Body/TailLight/TailLight | 7.9 | 0.2 |
| -0.05, 0.58, -0.96 | Body/Paint/Paint + Body/Chrome/Chrome | 10.6 | 0.3 |
| 0.16, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 11.2 | 0.4 |
| 0.17, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 11.2 | 1.4 |
| 0.14, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10.5 | 0.5 |
| 0.15, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10.5 | 1.3 |
| -0.16, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10.5 | 0.4 |
| -0.16, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10.5 | 0 |
| -0.15, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 10.5 | 1.4 |
| -0.18, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 11.2 | 0.4 |
| -0.17, 0.46, 0.16 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 11.2 | 1.4 |
| -0.02, 1.46, -0.10 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 10.1 | 0.9 |
| -0.02, 1.46, -0.10 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 11.2 | 0.4 |

## near (warn, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.01, 0.59, -0.96 | Body/Paint/Paint + Body/Chrome/Chrome | 1.42 | 1.3 | 0.5 | 70 | 0.53 | false | 0 + 0.66 + -0.75 |
| -0.12, 0.76, -0.88 | Body/Chrome/Chrome + Body/Chrome/Chrome | 1.03 | 0.4 | 3.2 | 70 | 0.53 | false | 0.05 + 1 + 0.01 |
| 0.15, 0.75, -0.43 | Body/Plastic/Plastic + Body/Seat/Seat | 0.6 | 2.4 | 3.5 | 70 | 0.53 | false | 0.99 + 0.11 + 0.06 |

## sliver (warn, 42)

| at | part | aspect | longest |
|---|---|---|---|
| 0.17, 0.29, -0.02 | Body/Paint/Paint | 80 | 0.383 |
| 0.17, 0.29, 0.10 | Body/Paint/Paint | 77 | 0.383 |
| 0.06, 0.23, -0.15 | Body/Paint/Paint | 61 | 0.25 |
| 0.06, 0.30, -0.15 | Body/Paint/Paint | 68 | 0.314 |
| 0.05, 0.30, 0.36 | Body/Paint/Paint | 40 | 0.314 |
| 0.18, 0.29, -0.02 | Body/Metal/Metal | 47 | 0.359 |
| 0.17, 0.29, -0.01 | Body/Metal/Metal | 53 | 0.405 |
| 0.17, 0.29, 0.13 | Body/Metal/Metal | 43 | 0.405 |
| 0.18, 0.30, 0.11 | Body/Metal/Metal | 102 | 0.39 |
| 0.18, 0.30, 0.11 | Body/Metal/Metal | 56 | 0.39 |
| 0.18, 0.29, 0.12 | Body/Metal/Metal | 69 | 0.405 |
| -0.18, 0.30, -0.03 | Body/Metal/Metal | 42 | 0.324 |
| -0.18, 0.29, -0.03 | Body/Metal/Metal | 81 | 0.324 |
| -0.17, 0.30, -0.01 | Body/Metal/Metal | 51 | 0.39 |
| -0.17, 0.30, -0.01 | Body/Metal/Metal | 53 | 0.406 |
| -0.17, 0.30, 0.13 | Body/Metal/Metal | 49 | 0.405 |
| -0.18, 0.30, 0.10 | Body/Metal/Metal | 76 | 0.406 |
| -0.18, 0.29, 0.10 | Body/Metal/Metal | 43 | 0.405 |
| -0.17, 0.30, 0.13 | Body/Metal/Metal | 64 | 0.406 |
| -0.12, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.12, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.10, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.10, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.07, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.07, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.05, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.05, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.01, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| -0.01, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.01, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.01, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.05, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.05, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.07, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.07, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.10, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.10, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.12, 0.30, 0.06 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.12, 0.30, 0.21 | Body/Rubber/Rubber | 74 | 0.438 |
| 0.04, 0.15, -0.42 | Body/Frame/Frame | 51 | 0.28 |

(2 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 0.10, 1.59, -0.03 | RiderTorso/Visor/Visor | 4 |
| 0.08, 1.59, -0.01 | RiderTorso/Visor/Visor | 4 |
| -0.09, 1.59, -0.01 | RiderTorso/Visor/Visor | 4 |
| -0.10, 1.59, -0.02 | RiderTorso/Visor/Visor | 4 |

## seam (info, 192)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.05, 0.24, 0.84 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 5.71 | 520 | 5.6 |
| 0.05, 0.30, -0.55 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 5.23 | 460 | 5.6 |
| 0.09, 0.73, -0.19 | Body/Plastic/Plastic + Body/Seat/Seat | 2.58 | 190 | 5.1 |
| 0.06, 1.03, 0.44 | Steer/Chrome/Chrome + Steer/HeadLight/HeadLight | 0.71 | 147 | 5.8 |
| -0.02, 0.96, 0.44 | Steer/Paint/Paint + Steer/Chrome/Chrome | 0.81 | 120 | 12.5 |
| -0.07, 1.02, 0.44 | Steer/Paint/Paint + Steer/Paint/Paint | 0.84 | 109 | 15.7 |
| 0.04, 1.10, 0.22 | Steer/Chrome/Chrome + Steer/Plastic/Plastic | 0.57 | 109 | 9.6 |
| 0.09, 0.43, 0.58 | Steer/Chrome/Chrome + Steer/Frame/Frame | 0.29 | 102 | 16 |
| 0.05, 1.46, -0.14 | RiderTorso/Jacket/Jacket + RiderTorso/Skin/Skin | 0.65 | 92 | 16.6 |
| -0.03, 0.80, 0.40 | Body/Paint/Paint + Body/Chrome/Chrome | 0.61 | 85 | 8.4 |
| 0.02, 0.56, -0.95 | Body/Paint/Paint + Body/TailLight/TailLight | 0.45 | 84 | 18.5 |
| -0.03, 0.25, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Chrome/Chrome | 0.22 | 83 | 15 |
| 0.03, 0.59, -0.97 | Body/Paint/Paint + Body/Chrome/Chrome | 0.36 | 81 | 12.8 |
| 0.05, 0.57, -0.96 | Body/Chrome/Chrome + Body/TailLight/TailLight | 0.47 | 79 | 6.7 |
| 0.03, 0.25, -0.66 | Wheel_R/Rim/Rim + Wheel_R/Chrome/Chrome | 0.3 | 75 | 10.6 |
| -0.15, 0.90, -0.28 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.58 | 73 | 24.9 |
| 0.15, 0.30, -0.13 | Body/Paint/Paint + Body/Paint/Paint | 0.84 | 71 | 84.2 |
| 0.04, 1.10, 0.23 | Steer/Chrome/Chrome + Steer/Glass/Glass | 0.4 | 70 | 17.1 |
| 0.14, 0.94, -0.21 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.86 | 70 | 83.9 |
| 0.05, 1.49, -0.09 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.32 | 69 | 12.2 |
| 0.05, 1.60, -0.05 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.33 | 69 | 52.2 |
| 0.17, 0.87, -0.28 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.59 | 67 | 17.9 |
| -0.07, 1.02, 0.43 | Steer/Paint/Paint + Steer/Chrome/Chrome | 0.3 | 65 | 5.9 |
| 0.22, 0.72, 0.15 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.34 | 65 | 25.3 |
| -0.12, 0.73, 0.14 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.34 | 65 | 25.3 |
| -0.06, 0.69, -0.24 | Body/Paint/Paint + Body/Seat/Seat | 1.48 | 64 | 6.5 |
| 0.11, 0.77, 0.12 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.34 | 64 | 27 |
| -0.21, 0.77, 0.10 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.34 | 64 | 29.2 |
| 0.12, 0.76, -0.88 | Body/Chrome/Chrome + Body/Chrome/Chrome | 0.2 | 62 | 20.8 |
| -0.19, 1.30, -0.16 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.35 | 61 | 58 |
| 0.20, 1.29, -0.17 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.35 | 60 | 57.6 |
| 0.03, 1.46, -0.11 | RiderTorso/Skin/Skin + RiderTorso/Skin/Skin | 0.32 | 59 | 32.2 |
| -0.08, 0.28, -0.59 | Body/Metal/Metal + Body/Metal/Metal | 0.42 | 58 | 51.3 |
| -0.06, 1.02, 0.44 | Steer/Paint/Paint + Steer/HeadLight/HeadLight | 0.36 | 57 | 17.8 |
| 0.07, 0.92, -0.33 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.75 | 53 | 31.9 |
| 0.08, 0.91, -0.34 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.78 | 52 | 37 |
| -0.16, 0.24, 0.35 | Body/Paint/Paint + Body/Paint/Paint | 0.44 | 51 | 14.9 |
| -0.20, 0.46, 0.10 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 0.26 | 50 | 24.5 |
| -0.11, 0.31, -0.30 | Body/Paint/Paint + Body/Metal/Metal | 0.43 | 49 | 18.7 |
| -0.02, 0.96, 0.44 | Steer/Paint/Paint + Steer/HeadLight/HeadLight | 0.38 | 48 | 34.6 |

(152 more in the JSON)

## backtoback (info, 125)

| at | parts | area |
|---|---|---|
| -0.05, 0.29, 0.82 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00013 |
| -0.04, 0.33, 0.79 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.37, 0.74 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.38, 0.66 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| 0.05, 0.36, 0.61 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00013 |
| -0.05, 0.35, 0.59 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.28, 0.54 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.21, 0.53 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.13, 0.57 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.09, 0.63 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.08, 0.71 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| 0.05, 0.10, 0.76 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00013 |
| -0.05, 0.11, 0.78 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.17, 0.83 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00009 |
| -0.05, 0.21, 0.84 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 0.00013 |
| 0.05, 0.27, -0.54 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00013 |
| -0.05, 0.26, -0.53 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00013 |
| -0.05, 0.30, -0.55 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| 0.05, 0.31, -0.55 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.36, -0.60 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00008 |
| 0.05, 0.37, -0.61 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.38, -0.62 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| -0.05, 0.39, -0.67 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| 0.05, 0.39, -0.69 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.38, -0.72 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00012 |
| -0.05, 0.38, -0.75 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| 0.05, 0.37, -0.76 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.36, -0.78 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00012 |
| -0.05, 0.34, -0.80 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.31, -0.82 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.26, -0.84 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.24, -0.84 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.18, -0.83 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.16, -0.82 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| -0.05, 0.12, -0.79 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.10, -0.76 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00009 |
| 0.05, 0.08, -0.72 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| -0.05, 0.08, -0.71 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| 0.05, 0.09, -0.64 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |
| -0.05, 0.09, -0.63 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 0.00007 |

(85 more in the JSON)
