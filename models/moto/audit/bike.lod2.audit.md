# Mesh audit: motorbike bike LOD2 (error 0.011 m)

3,890 triangles, 2,364 welded vertices, 0 open edges, 0 rays, 558 ms.

**83 blocking**, 119 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 43 |
| depth | block | 8 |
| crossing | block | 32 |
| near | warn | 9 |
| sliver | warn | 8 |
| nonmanifold | warn | 102 |
| seam | info | 378 |
| backtoback | info | 288 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 43)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.05, 0.43, 0.86 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 2.4 | 2.7 | 250 | 1.91 | true | -1 + -0.04 + -0.06 |
| -0.05, 0.49, 0.77 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 2.9 | 3.2 | 250 | 1.91 | true | -1 + -0.06 + -0.02 |
| -0.05, 0.49, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.6 | 3.2 | 250 | 1.91 | true | -0.99 + -0.1 + 0.01 |
| -0.05, 0.49, 0.74 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 1.6 | 3.1 | 250 | 1.91 | true | 0.99 + -0.13 + -0.04 |
| -0.05, 0.46, 0.62 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + -0.05 + 0.03 |
| -0.05, 0.47, 0.65 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + -0.1 + 0 |
| -0.05, 0.40, 0.56 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + -0.03 + 0.05 |
| -0.05, 0.42, 0.58 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + -0.09 + 0.04 |
| -0.05, 0.32, 0.54 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + -0.01 + 0.06 |
| -0.05, 0.34, 0.55 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + -0.06 + 0.07 |
| -0.05, 0.24, 0.55 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + 0.02 + 0.06 |
| -0.05, 0.26, 0.55 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + -0.02 + 0.09 |
| -0.05, 0.17, 0.59 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + 0.04 + 0.04 |
| -0.05, 0.19, 0.58 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + 0.02 + 0.09 |
| -0.05, 0.12, 0.66 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + 0.06 + 0.02 |
| -0.05, 0.14, 0.64 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + 0.06 + 0.07 |
| -0.05, 0.11, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 6.5 | 1.6 | 250 | 1.91 | true | -1 + 0.06 + -0.01 |
| -0.05, 0.12, 0.72 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 3.8 | 2.4 | 250 | 1.91 | true | 1 + 0.09 + 0.04 |
| -0.07, 0.28, 0.70 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0 | 8 | 3.9 | 250 | 1.91 | false | -1 + 0 + 0 |
| 0.07, 0.33, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.45 | 1.8 | 2.6 | 250 | 1.91 | false | 0.99 + -0.09 + -0.07 |
| -0.07, 0.39, 0.70 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 0.5 | 6.3 | 3.9 | 250 | 1.91 | false | -1 + 0 + 0 |
| -0.07, 0.37, 0.67 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 0.5 | 1.2 | 3.9 | 250 | 1.91 | false | -1 + 0 + 0 |
| -0.07, 0.39, 0.69 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 0.5 | 7.4 | 3.9 | 250 | 1.91 | false | 1 + 0 + 0 |
| -0.07, 0.37, 0.65 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 0.5 | 2.2 | 3.9 | 250 | 1.91 | false | -1 + 0 + 0 |
| -0.07, 0.37, 0.65 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 0.5 | 2.2 | 3.9 | 250 | 1.91 | false | 1 + 0 + 0 |
| -0.08, 0.33, -0.91 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 1.1 | 3.9 | 250 | 1.91 | true | 0.99 + -0.03 + 0.15 |
| -0.08, 0.37, -0.91 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 4 | 2 | 250 | 1.91 | true | -1 + -0.05 + 0.06 |
| -0.08, 0.25, -0.90 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 1.1 | 3.9 | 250 | 1.91 | true | 0.99 + 0.03 + 0.15 |
| -0.08, 0.29, -0.92 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 4 | 2 | 250 | 1.91 | true | -1 + -0.02 + 0.08 |
| -0.08, 0.18, -0.85 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 1.1 | 3.9 | 250 | 1.91 | true | 0.99 + 0.09 + 0.12 |
| -0.08, 0.21, -0.88 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0 | 4 | 2 | 250 | 1.91 | true | -1 + 0.02 + 0.08 |
| 0.12, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 3.5 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| 0.10, 0.28, 0.75 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 0.6 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| 0.09, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 2.9 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| 0.11, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 2.2 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| 0.10, 0.26, 0.73 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 3.4 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| -0.09, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 3.5 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| -0.11, 0.28, 0.75 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 0.6 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| -0.12, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 2.9 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |
| -0.10, 0.27, 0.74 | Steer/Chrome/Chrome + Steer/Metal/Metal | 0.37 | 2.2 | 0 | 250 | 1.91 | false | 0 + -0.91 + 0.41 |

(3 more in the JSON)

## depth (block, 8)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.07, 0.21, 0.68 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 1.89 | 0.6 | 3.4 | 250 | 1.91 | false | -1 + 0.02 + 0.07 |
| 0.07, 0.33, 0.82 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 1.76 | 0.4 | 2.6 | 250 | 1.91 | false | 1 + -0.08 + -0.01 |
| -0.07, 0.38, 0.79 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 1.01 | 2.6 | 2.7 | 250 | 1.91 | false | -1 + 0.07 + 0.06 |
| -0.08, 0.20, -0.56 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 1.74 | 3.3 | 3.6 | 250 | 1.91 | false | -1 + -0.03 + 0.06 |
| 0.04, 0.60, 0.53 | Body/Engine/Engine + Body/Plastic/Plastic | 1.23 | 373 | 1.8 | 250 | 1.91 | false | 0.02 + 0.23 + 0.97 |
| -0.04, 0.54, 0.54 | Body/Engine/Engine + Body/Plastic/Plastic | 1.23 | 373 | 1.8 | 250 | 1.91 | false | -0.02 + 0.18 + 0.98 |
| -0.10, 0.99, -0.23 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 1.22 | 8.3 | 4.2 | 250 | 1.91 | false | -0.17 + 0.94 + 0.29 |
| 0.07, 1.55, 0.20 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 1.67 | 14.1 | 1.8 | 250 | 1.91 | false | 0.53 + 0.25 + 0.81 |

## crossing (block, 32)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -0.07, 0.28, 0.76 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 5.4 | 0.2 |
| 0.07, 0.34, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 10.7 | 0.2 |
| 0.07, 0.22, 0.66 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 8.9 | 0.4 |
| 0.07, 0.20, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 6.5 | 0.1 |
| 0.07, 0.20, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 8.3 | 0.1 |
| 0.07, 0.21, 0.77 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 6.1 | 0.2 |
| 0.07, 0.21, 0.77 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 6.4 | 0.2 |
| -0.07, 0.41, 0.73 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 11.7 | 0.2 |
| -0.07, 0.41, 0.73 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 11.7 | 0.2 |
| 0.08, 0.30, -0.53 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 9.5 | 0.4 |
| -0.08, 0.29, -0.92 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 7.5 | 0.2 |
| 0.08, 0.15, -0.62 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 10.6 | 2.4 |
| -0.09, 0.26, -0.73 | Wheel_R/Rim/Rim + Wheel_R/Disc/Disc | 10.2 | 0.3 |
| 0.10, 0.27, -0.81 | Wheel_R/Metal/Metal + Body/Engine/Engine | 6.5 | 0.6 |
| 0.10, 0.27, -0.81 | Wheel_R/Metal/Metal + Body/Engine/Engine | 6.5 | 0.6 |
| 0.37, 1.04, 0.35 | Steer/Metal/Metal + Steer/Rubber/Rubber | 5.4 | 0.1 |
| 0.34, 1.19, 0.31 | Steer/Plastic/Plastic + Steer/Glass/Glass | 7.8 | 1.4 |
| 0.14, 0.81, 0.07 | Body/Frame/Frame + Body/Frame/Frame | 8.3 | 0 |
| 0.14, 0.51, -0.10 | Body/Frame/Frame + Body/Metal/Metal | 6.5 | 2.4 |
| 0.17, 0.52, -0.10 | Body/Frame/Frame + Body/Metal/Metal | 9.3 | 0 |
| 0.17, 0.52, -0.11 | Body/Frame/Frame + Body/Metal/Metal | 6.8 | 1.7 |
| 0.15, 0.80, 0.11 | Body/Frame/Frame + Body/Paint/Paint | 7.6 | 1 |
| 0.15, 0.81, 0.11 | Body/Frame/Frame + Body/Paint/Paint | 9.5 | 0.3 |
| 0.11, 0.70, 0.37 | Body/Frame/Frame + Body/Metal/Metal | 9 | 1.1 |
| 0.14, 0.30, -0.70 | Body/Metal/Metal + Body/Metal/Metal | 8.5 | 2.1 |
| 0.13, 0.30, -0.70 | Body/Metal/Metal + Body/Metal/Metal | 8.5 | 0.2 |
| 0.06, 0.84, -0.28 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 7.8 | 0.7 |
| 0.26, 0.48, -0.11 | RiderLegs/Suit/Suit + RiderLegs/Rubber/Rubber | 8.6 | 2.7 |
| -0.23, 0.48, -0.10 | RiderLegs/Suit/Suit + RiderLegs/Rubber/Rubber | 10.7 | 3.8 |
| -0.18, 1.39, -0.02 | RiderTorso/Suit/Suit + RiderTorso/Plastic/Plastic | 11.4 | 0.9 |
| -0.01, 1.54, 0.23 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 11.6 | 4.3 |
| -0.02, 1.52, 0.23 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 11.1 | 1.5 |

## near (warn, 9)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.07, 0.34, 0.70 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 2 | 0.5 | 0 | 250 | 1.91 | false | -1 + 0 + 0 |
| 0.07, 0.21, 0.68 | Wheel_F/Rim/Rim + Wheel_F/Disc/Disc | 2.35 | 0.6 | 1.5 | 250 | 1.91 | false | 1 + -0.02 + -0.07 |
| -0.09, 0.38, -0.72 | Wheel_R/Rim/Rim + Wheel_R/Disc/Disc | 2.82 | 1.5 | 3.2 | 250 | 1.91 | false | 1 + 0 + 0 |
| 0.10, 0.24, -0.79 | Wheel_R/Metal/Metal + Body/Engine/Engine | 3 | 0.9 | 0 | 250 | 1.91 | false | 1 + 0 + 0 |
| 0.10, 0.24, -0.79 | Wheel_R/Metal/Metal + Body/Engine/Engine | 3 | 0.9 | 0 | 250 | 1.91 | false | -1 + 0 + 0 |
| 0.05, 0.94, 0.43 | Steer/Metal/Metal + Steer/Plastic/Plastic | 2.04 | 3.1 | 3.1 | 250 | 1.91 | false | 0.05 + -0.86 + 0.51 |
| 0.18, 0.34, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 2.95 | 1.8 | 2.9 | 250 | 1.91 | false | -1 + 0.01 + -0.05 |
| -0.20, 0.49, -0.15 | RiderLegs/Suit/Suit + RiderLegs/Rubber/Rubber | 2.58 | 16.8 | 4.7 | 250 | 1.91 | false | 0.98 + -0.12 + 0.16 |
| 0.05, 1.55, 0.22 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 2.15 | 7.3 | 2.3 | 250 | 1.91 | false | 0.52 + 0.25 + 0.82 |

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -0.08, 0.50, -0.61 | Wheel_R/Rubber/Rubber | 42 | 0.384 |
| -0.08, 0.28, -0.52 | Wheel_R/Rubber/Rubber | 72 | 0.273 |
| 0.12, 0.43, -0.41 | Body/Metal/Metal | 57 | 0.604 |
| 0.16, 0.35, -0.40 | Body/Metal/Metal | 61 | 0.605 |
| -0.15, 0.43, -0.41 | Body/Metal/Metal | 61 | 0.604 |
| -0.13, 0.43, -0.41 | Body/Metal/Metal | 43 | 0.605 |
| -0.05, 0.37, 0.41 | Body/Chrome/Chrome | 147 | 0.321 |
| 0.11, 0.84, -0.23 | Body/Seat/Seat | 45 | 0.256 |

## nonmanifold (warn, 102)

| at | part | uses |
|---|---|---|
| 0.07, 0.34, 0.78 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.36, 0.77 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.38, 0.73 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.36, 0.70 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.34, 0.67 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.30, 0.65 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.27, 0.65 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.23, 0.71 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.23, 0.75 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.27, 0.80 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.27, 0.80 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.33, 0.80 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.38, 0.75 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.38, 0.73 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.35, 0.67 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.32, 0.65 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.27, 0.67 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.23, 0.69 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.22, 0.73 | Wheel_F/Rim/Rim | 4 |
| -0.07, 0.25, 0.78 | Wheel_F/Rim/Rim | 4 |
| 0.07, 0.29, 0.86 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.38, 0.84 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.43, 0.77 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.44, 0.73 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.41, 0.65 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.37, 0.61 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.35, 0.60 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.32, 0.59 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.23, 0.60 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.20, 0.63 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.16, 0.72 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.19, 0.80 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.22, 0.83 | Wheel_F/Disc/Disc | 4 |
| 0.07, 0.24, 0.85 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.29, 0.86 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.36, 0.85 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.43, 0.77 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.44, 0.73 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.42, 0.69 | Wheel_F/Disc/Disc | 4 |
| -0.07, 0.39, 0.63 | Wheel_F/Disc/Disc | 4 |

(62 more in the JSON)

## seam (info, 378)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.08, 0.29, -0.53 | Wheel_R/Rubber/Rubber + Wheel_R/Rim/Rim | 5.67 | 179 | 5.4 |
| 0.05, 0.33, 0.92 | Wheel_F/Rubber/Rubber + Wheel_F/Rim/Rim | 4.13 | 136 | 6.6 |
| 0.09, 1.56, 0.18 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.86 | 50 | 6.7 |
| -0.07, 1.18, -0.24 | RiderTorso/Suit/Suit + RiderTorso/Suit/Suit | 0.9 | 42 | 19 |
| -0.09, 0.98, -0.34 | RiderLegs/Suit/Suit + RiderTorso/Suit/Suit | 0.87 | 39 | 22.4 |
| 0.10, 1.45, 0.11 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 0.59 | 37 | 32.9 |
| -0.17, 0.92, -0.30 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.59 | 36 | 32.5 |
| 0.16, 0.89, -0.30 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.59 | 33 | 24.7 |
| -0.15, 0.82, 0.10 | Body/Frame/Frame + Body/Frame/Frame | 0.23 | 31 | 30.2 |
| 0.18, 0.79, 0.05 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.39 | 30 | 20.6 |
| 0.05, 0.50, 0.54 | Wheel_F/Rubber/Rubber + Body/Plastic/Plastic | 0.53 | 29 | 58.8 |
| -0.10, 0.69, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 29 | 12.6 |
| 0.28, 0.43, -0.16 | RiderLegs/Suit/Suit + RiderLegs/Rubber/Rubber | 0.3 | 29 | 20.2 |
| -0.28, 0.80, -0.00 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.37 | 29 | 22.3 |
| -0.17, 1.39, -0.03 | RiderTorso/Suit/Suit + RiderTorso/Plastic/Plastic | 0.28 | 29 | 27.8 |
| -0.36, 1.02, 0.35 | Steer/Metal/Metal + Steer/Rubber/Rubber | 0.56 | 28 | 18.1 |
| -0.14, 0.79, 0.06 | Body/Frame/Frame + Body/Frame/Frame | 0.22 | 28 | 31.6 |
| -0.01, 0.86, -0.49 | Body/Paint/Paint + Body/Seat/Seat | 0.85 | 28 | 41.5 |
| -0.20, 0.52, -0.13 | RiderLegs/Suit/Suit + RiderLegs/Rubber/Rubber | 0.48 | 28 | 24.5 |
| -0.20, 1.30, -0.09 | RiderTorso/Suit/Suit + RiderTorso/Suit/Suit | 0.35 | 28 | 40 |
| 0.13, 0.85, 0.13 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 27 | 29.9 |
| 0.18, 1.33, -0.11 | RiderTorso/Suit/Suit + RiderTorso/Suit/Suit | 0.36 | 27 | 50.9 |
| 0.24, 1.36, -0.04 | RiderTorso/Suit/Suit + RiderTorso/Plastic/Plastic | 0.29 | 27 | 31.8 |
| 0.05, 0.50, 0.55 | Wheel_F/Rubber/Rubber + Body/Engine/Engine | 0.45 | 26 | 57.9 |
| 0.11, 0.67, 0.32 | Body/Frame/Frame + Body/Frame/Frame | 0.21 | 26 | 34.8 |
| -0.15, 0.83, 0.14 | Body/Frame/Frame + Body/Frame/Frame | 0.21 | 26 | 31.8 |
| 0.07, 0.81, -0.07 | Body/Paint/Paint + Body/Seat/Seat | 0.47 | 26 | 49.4 |
| 0.06, 0.89, -0.65 | Body/Paint/Paint + Body/Seat/Seat | 0.68 | 26 | 43.4 |
| 0.23, 0.72, 0.06 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.35 | 26 | 15.1 |
| 0.23, 0.43, -0.14 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 0.52 | 26 | 31.1 |
| -0.20, 0.39, -0.22 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 0.53 | 26 | 37.3 |
| 0.09, 0.70, 0.35 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 25 | 30 |
| -0.21, 0.72, 0.05 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 0.33 | 25 | 34.5 |
| 0.13, 0.68, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.2 | 24 | 17 |
| -0.14, 0.45, 0.04 | Body/Metal/Metal + Body/Engine/Engine | 0.54 | 24 | 13.9 |
| 0.15, 0.81, 0.10 | Body/Frame/Frame + Body/Frame/Frame | 0.14 | 23 | 61.6 |
| 0.15, 0.81, 0.05 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 23 | 21.2 |
| -0.11, 0.69, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.16 | 23 | 38.6 |
| -0.11, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 23 | 31.6 |
| -0.14, 0.66, -0.11 | Body/Frame/Frame + Body/Metal/Metal | 0.24 | 23 | 22.1 |

(338 more in the JSON)

## backtoback (info, 288)

| at | parts | area |
|---|---|---|
| 0.06, 0.39, 0.91 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00112 |
| -0.06, 0.38, 0.92 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00112 |
| 0.06, 0.46, 0.86 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00093 |
| 0.06, 0.49, 0.66 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00085 |
| 0.06, 0.22, 0.92 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00044 |
| 0.06, 0.24, 0.93 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00043 |
| -0.06, 0.20, 0.91 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00112 |
| 0.06, 0.28, 0.93 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00093 |
| -0.07, 0.28, 0.70 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.0008 |
| 0.07, 0.33, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00018 |
| 0.00, 0.30, 0.79 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00127 |
| -0.00, 0.33, 0.90 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00095 |
| 0.00, 0.35, 0.83 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| 0.00, 0.37, 0.88 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| -0.00, 0.41, 0.74 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| -0.00, 0.47, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| 0.00, 0.41, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| 0.00, 0.47, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| 0.00, 0.35, 0.63 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| 0.00, 0.37, 0.57 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| -0.00, 0.22, 0.64 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| -0.00, 0.18, 0.61 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| 0.00, 0.20, 0.67 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00081 |
| -0.01, 0.15, 0.64 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00122 |
| -0.00, 0.24, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00151 |
| 0.01, 0.18, 0.79 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00115 |
| -0.01, 0.18, 0.79 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00115 |
| 0.00, 0.15, 0.81 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00088 |
| -0.00, 0.26, 0.78 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00127 |
| 0.00, 0.17, 0.84 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00095 |
| 0.07, 0.33, 0.80 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00172 |
| 0.07, 0.35, 0.79 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00175 |
| 0.07, 0.38, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00186 |
| 0.07, 0.38, 0.71 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00228 |
| 0.07, 0.34, 0.69 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00356 |
| 0.07, 0.33, 0.65 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00229 |
| 0.07, 0.28, 0.64 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00186 |
| 0.07, 0.22, 0.72 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00234 |
| 0.07, 0.24, 0.75 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.00074 |
| 0.07, 0.25, 0.80 | Wheel_F/Rim/Rim + Wheel_F/Rim/Rim | 0.0016 |

(248 more in the JSON)
