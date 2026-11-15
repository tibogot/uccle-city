# Mesh audit: models/moto/moto.raw.glb bike LOD0 (error 0 m)

67,144 triangles, 34,062 welded vertices, 0 open edges, 0 rays, 17168 ms.

**0 blocking**, 699 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 11 |
| sliver | warn | 688 |
| seam | info | 492 |
| backtoback | info | 46 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 11)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.22, 0.35, -0.28 | Body/Metal/Metal + RiderLegs/Rubber/Rubber | 2.67 | 0.7 | 2.7 | 22 | 0.17 | false | -0.04 + -1 + 0.01 |
| -0.22, 0.35, -0.27 | Body/Metal/Metal + RiderLegs/Rubber/Rubber | 2.71 | 0.8 | 2.7 | 22 | 0.17 | false | -0.04 + -1 + 0.01 |
| 0.04, 0.60, 0.53 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 373.8 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| -0.10, 0.65, 0.52 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| 0.10, 0.49, 0.55 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| -0.04, 0.54, 0.54 | Body/Engine/Engine + Body/Plastic/Plastic | 3 | 373.8 | 0 | 22 | 0.17 | false | 0 + 0.21 + 0.98 |
| 0.12, 0.99, -0.24 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 1.53 | 1.5 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| 0.12, 0.99, -0.23 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 1.87 | 0.7 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| 0.13, 0.98, -0.23 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 1.82 | 0.5 | 1.8 | 22 | 0.17 | false | 0.35 + 0.88 + 0.33 |
| -0.12, 0.99, -0.23 | RiderLegs/Trousers/Trousers + RiderLegs/Trousers/Trousers | 1.53 | 2.7 | 1.8 | 22 | 0.17 | false | -0.35 + 0.88 + 0.33 |
| -0.00, 1.41, 0.19 | RiderTorso/Plastic/Plastic + RiderTorso/Helmet/Helmet | 2.75 | 0.5 | 0 | 22 | 0.17 | false | 0 + -0.13 + 0.99 |

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

## seam (info, 492)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.10, 0.42, -0.69 | Wheel_R/Metal/Metal + Body/Engine/Engine | 0.82 | 335 | 34.4 |
| -0.09, 0.36, -0.71 | Wheel_R/Rim/Rim + Wheel_R/Rim/Rim | 0.59 | 256 | 22.6 |
| 0.09, 1.44, 0.07 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 1.03 | 234 | 24.7 |
| 0.06, 1.45, -0.00 | RiderTorso/Jacket/Jacket + RiderTorso/Helmet/Helmet | 0.61 | 176 | 58.7 |
| 0.04, 0.98, -0.35 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 1.61 | 167 | 20.9 |
| 0.21, 0.36, -0.28 | RiderLegs/Boot/Boot + RiderLegs/Rubber/Rubber | 0.62 | 146 | 36.1 |
| -0.28, 0.36, -0.28 | RiderLegs/Boot/Boot + RiderLegs/Rubber/Rubber | 0.62 | 146 | 36.1 |
| 0.06, 1.43, 0.01 | RiderTorso/Jacket/Jacket + RiderTorso/Helmet/Helmet | 0.59 | 146 | 49.7 |
| -0.05, 1.63, -0.01 | RiderTorso/Helmet/Helmet + RiderTorso/Helmet/Helmet | 0.47 | 134 | 44.4 |
| 0.10, 0.84, -0.49 | Body/Paint/Paint + Body/Seat/Seat | 0.89 | 123 | 48 |
| 0.28, 0.42, -0.26 | RiderLegs/Boot/Boot + RiderLegs/Boot/Boot | 0.46 | 118 | 30.1 |
| -0.21, 0.42, -0.25 | RiderLegs/Boot/Boot + RiderLegs/Boot/Boot | 0.46 | 116 | 30.1 |
| 0.10, 0.98, -0.34 | RiderLegs/Trousers/Trousers + RiderTorso/Jacket/Jacket | 0.85 | 114 | 22.7 |
| -0.07, 1.17, -0.25 | RiderTorso/Jacket/Jacket + RiderTorso/Jacket/Jacket | 0.91 | 114 | 23.1 |
| 0.11, 0.69, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 112 | 51.6 |
| -0.10, 0.67, 0.32 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 112 | 51.6 |
| 0.11, 0.70, 0.38 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 49.2 |
| 0.13, 0.67, 0.34 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 51.6 |
| -0.09, 0.70, 0.36 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 49.2 |
| -0.09, 0.69, 0.35 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 111 | 51.6 |
| 0.05, 0.48, 0.55 | Wheel_F/Rubber/Rubber + Body/Plastic/Plastic | 0.57 | 110 | 53.9 |
| -0.13, 0.82, 0.10 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 110 | 53.6 |
| -0.13, 0.81, 0.06 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 110 | 46.1 |
| 0.05, 0.90, 0.38 | Body/Frame/Frame + Body/Paint/Paint | 0.24 | 108 | 21.7 |
| -0.05, 0.90, 0.38 | Body/Frame/Frame + Body/Paint/Paint | 0.24 | 108 | 21.7 |
| 0.04, 0.90, -0.70 | Body/Paint/Paint + Body/Seat/Seat | 0.71 | 108 | 59.6 |
| 0.13, 0.77, 0.51 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| 0.13, 0.94, 0.44 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| -0.07, 0.77, 0.51 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| -0.07, 0.94, 0.44 | Steer/Anodized/Anodized + Steer/Metal/Metal | 0.38 | 106 | 67.7 |
| 0.15, 0.83, 0.14 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 106 | 46.8 |
| -0.13, 0.84, 0.14 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 106 | 46.8 |
| 0.16, 0.80, 0.07 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 105 | 46.1 |
| 0.15, 0.82, 0.11 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 104 | 53.6 |
| 0.02, 0.47, -0.28 | Body/Metal/Metal + Body/Metal/Metal | 0.26 | 104 | 90 |
| 0.02, 0.62, -0.15 | Body/Metal/Metal + Body/Metal/Metal | 0.26 | 104 | 90 |
| 0.12, 0.88, 0.30 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 103 | 49.7 |
| -0.06, 1.00, 0.40 | Steer/Metal/Metal + Steer/Plastic/Plastic | 0.2 | 102 | 19 |
| -0.10, 0.88, 0.29 | Body/Frame/Frame + Body/Frame/Frame | 0.17 | 102 | 49.7 |
| 0.07, 0.86, -0.10 | Body/Paint/Paint + Body/Seat/Seat | 0.49 | 101 | 56.6 |

(452 more in the JSON)

## backtoback (info, 46)

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
| 0.00, 0.96, -0.14 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 0.96, -0.14 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| -0.00, 0.99, -0.12 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| 0.00, 1.01, -0.11 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.04, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00004 |
| -0.00, 1.04, -0.09 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |
| 0.00, 1.09, -0.05 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00006 |
| -0.00, 1.11, -0.03 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00006 |
| 0.00, 1.17, -0.01 | RiderTorso/Jacket/Jacket + RiderTorso/Plastic/Plastic | 0.00005 |

(6 more in the JSON)
