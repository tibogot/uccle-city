# Mesh audit: motorbike bike LOD0 (error 0 m)

61,896 triangles, 31,414 welded vertices, 0 open edges, 0 rays, 29201 ms.

**0 blocking**, 699 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 11 |
| sliver | warn | 688 |
| seam | info | 466 |
| backtoback | info | 64 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 11)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.04, 0.60, 0.53 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 373.8 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| -0.10, 0.65, 0.52 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| 0.10, 0.49, 0.55 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| -0.04, 0.54, 0.54 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 373.8 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| 0.12, 0.99, -0.24 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 1.53 | 1.5 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| 0.12, 0.99, -0.23 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 1.87 | 0.7 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| 0.13, 0.98, -0.23 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 1.82 | 0.5 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| -0.12, 0.99, -0.23 | RiderLegs/Suit/Suit + RiderLegs/Suit/Suit | 1.53 | 2.7 | 1.8 | 22 | 0.17 | false | -0.35 + 0.88 + 0.33 |
| 0.19, 0.41, -0.23 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 2.88 | 1.7 | 4.4 | 22 | 0.17 | false | -1 + 0.08 + -0.04 |
| -0.19, 0.41, -0.22 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 2.88 | 1.9 | 5 | 22 | 0.17 | false | 1 + 0.08 + -0.03 |
| -0.19, 0.40, -0.22 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 2.93 | 0.9 | 4.8 | 22 | 0.17 | false | 1 + 0.09 + -0.04 |

## sliver (warn, 688)

| at | part | aspect | longest |
|---|---|---|---|
| 0.13, 0.49, 0.64 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.13, 0.38, 0.69 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.13, 0.49, 0.63 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.13, 0.38, 0.69 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.13, 0.49, 0.65 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.38, 0.70 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.50, 0.65 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.39, 0.70 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.50, 0.66 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.39, 0.71 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.50, 0.66 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.39, 0.71 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.50, 0.66 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.39, 0.71 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.50, 0.66 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.39, 0.71 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.50, 0.66 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.39, 0.70 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.49, 0.65 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.38, 0.70 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.49, 0.64 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.38, 0.69 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.49, 0.64 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.38, 0.68 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.48, 0.63 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.08, 0.37, 0.68 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.48, 0.63 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.37, 0.67 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.09, 0.48, 0.62 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.37, 0.67 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.48, 0.62 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.10, 0.37, 0.67 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.48, 0.62 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.37, 0.67 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.11, 0.48, 0.62 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.37, 0.67 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.48, 0.62 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.37, 0.68 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.12, 0.48, 0.63 | Steer/Chrome/Chrome | 49 | 0.362 |
| 0.13, 0.38, 0.68 | Steer/Chrome/Chrome | 49 | 0.362 |

(648 more in the JSON)

## seam (info, 466)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.10, 0.42, -0.69 | Wheel_R/Metal/Metal + Body/Engine/Engine | 0.82 | 335 | 34.4 |
| -0.09, 0.36, -0.71 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0.59 | 256 | 22.6 |
| 0.10, 0.84, -0.49 | Body/Paint/Paint + Body/Seat/Seat | 0.89 | 123 | 48 |
| 0.10, 0.98, -0.34 | RiderLegs/Suit/Suit + RiderTorso/Suit/Suit | 0.85 | 122 | 22 |
| 0.28, 0.42, -0.26 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 0.51 | 116 | 17.7 |
| 0.11, 0.69, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 112 | 51.6 |
| -0.10, 0.67, 0.32 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 112 | 51.6 |
| -0.28, 0.43, -0.25 | RiderLegs/Rubber/Rubber + RiderLegs/Rubber/Rubber | 0.51 | 112 | 17.6 |
| 0.11, 0.70, 0.38 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 49.2 |
| 0.13, 0.67, 0.34 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 51.6 |
| -0.09, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 49.2 |
| -0.09, 0.69, 0.35 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 51.6 |
| 0.05, 0.48, 0.55 | Wheel_F/Rubber/Rubber + Body/Plastic/Plastic | 0.57 | 110 | 53.9 |
| -0.13, 0.82, 0.10 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 110 | 53.6 |
| -0.13, 0.81, 0.06 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 110 | 46.1 |
| 0.09, 1.43, 0.10 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 0.59 | 110 | 32.7 |
| 0.05, 0.90, 0.38 | Body/Frame/Frame + Body/Paint/Paint | 0.24 | 108 | 21.7 |
| -0.05, 0.90, 0.38 | Body/Frame/Frame + Body/Paint/Paint | 0.24 | 108 | 21.7 |
| 0.04, 0.90, -0.70 | Body/Paint/Paint + Body/Seat/Seat | 0.71 | 108 | 59.6 |
| 0.13, 0.77, 0.51 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| 0.13, 0.94, 0.44 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| -0.07, 0.77, 0.51 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| -0.07, 0.94, 0.44 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| 0.15, 0.83, 0.14 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 106 | 46.8 |
| -0.13, 0.84, 0.14 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 106 | 46.8 |
| -0.07, 1.16, -0.25 | RiderTorso/Suit/Suit + RiderTorso/Suit/Suit | 0.91 | 106 | 28.5 |
| 0.16, 0.80, 0.07 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 105 | 46.1 |
| 0.15, 0.82, 0.11 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 104 | 53.6 |
| 0.02, 0.47, -0.28 | Body/Metal/Metal + Body/Metal/Metal | 0.26 | 104 | 90 |
| 0.02, 0.62, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.26 | 104 | 90 |
| 0.12, 0.88, 0.30 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 103 | 49.7 |
| -0.06, 1.00, 0.40 | Steer/Metal/Metal + Steer/Plastic/Plastic | 0.2 | 102 | 19 |
| -0.10, 0.88, 0.29 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 102 | 49.7 |
| 0.07, 0.86, -0.10 | Body/Paint/Paint + Body/Seat/Seat | 0.49 | 101 | 56.6 |
| 0.03, 1.00, 0.40 | Steer/Metal/Metal + Steer/Plastic/Plastic | 0.2 | 99 | 19 |
| 0.08, 0.54, -0.86 | Wheel_R/Rubber/Rubber + Body/Plate/Plate | 0.5 | 98 | 73.1 |
| 0.14, 0.69, 0.34 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 98 | 24.1 |
| -0.08, 0.69, 0.34 | Body/Frame/Frame + Body/Frame/Frame | 0.18 | 98 | 24.1 |
| -0.08, 0.72, 0.38 | Body/Frame/Frame + Body/Metal/Metal | 0.21 | 97 | 16.4 |
| 0.07, 0.59, -0.85 | Wheel_R/Rubber/Rubber + Body/Plastic/Plastic | 0.56 | 96 | 73.1 |

(426 more in the JSON)

## backtoback (info, 64)

| at | parts | area |
|---|---|---|
| -0.00, 1.00, 0.44 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00171 |
| -0.04, 0.99, 0.47 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00178 |
| 0.04, 1.00, 0.45 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00178 |
| 0.00, 0.98, 0.48 | Steer/Plastic/Plastic + Steer/Glass/Glass | 0.00171 |
| 0.17, 0.44, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| 0.17, 0.45, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| 0.17, 0.43, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| 0.17, 0.46, -0.12 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| 0.17, 0.46, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| 0.17, 0.45, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.0004 |
| 0.17, 0.45, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00035 |
| -0.17, 0.45, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| -0.17, 0.45, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.00006 |
| -0.17, 0.47, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| -0.17, 0.44, -0.12 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| -0.17, 0.43, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00006 |
| -0.17, 0.45, -0.13 | Body/Metal/Metal + Body/Metal/Metal | 0.0004 |
| -0.17, 0.45, -0.14 | Body/Metal/Metal + Body/Metal/Metal | 0.00034 |
| 0.19, 0.33, -0.16 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| 0.19, 0.34, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| 0.19, 0.33, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.0001 |
| 0.19, 0.34, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.00018 |
| -0.19, 0.35, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| -0.19, 0.33, -0.16 | Body/Metal/Metal + Body/Metal/Metal | 0.00005 |
| -0.19, 0.33, -0.18 | Body/Metal/Metal + Body/Metal/Metal | 0.00004 |
| -0.19, 0.34, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.00008 |
| -0.19, 0.34, -0.17 | Body/Metal/Metal + Body/Metal/Metal | 0.00018 |
| -0.00, 0.64, -0.88 | Body/Plastic/Plastic + Body/Plate/Plate | 0.00601 |
| -0.07, 0.58, -0.87 | Body/Plastic/Plastic + Body/Plate/Plate | 0.0062 |
| 0.07, 0.62, -0.88 | Body/Plastic/Plastic + Body/Plate/Plate | 0.00618 |
| 0.00, 0.56, -0.86 | Body/Plastic/Plastic + Body/Plate/Plate | 0.00599 |
| 0.06, 1.55, 0.22 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00007 |
| 0.06, 1.52, 0.22 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00011 |
| 0.06, 1.50, 0.21 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00017 |
| 0.07, 1.50, 0.21 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.0002 |
| 0.07, 1.49, 0.20 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00016 |
| 0.06, 1.47, 0.20 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00017 |
| 0.06, 1.48, 0.20 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00015 |
| 0.03, 1.55, 0.23 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00011 |
| 0.03, 1.52, 0.23 | RiderTorso/Helmet/Helmet + RiderTorso/Visor/Visor | 0.00017 |

(24 more in the JSON)
