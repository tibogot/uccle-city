# Mesh audit: motorbike arms LOD2 (error 0.011 m)

1,074 triangles, 282 welded vertices, 0 open edges, 0 rays, 400 ms.

**331 blocking**, 381 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 311 |
| depth | block | 8 |
| crossing | block | 12 |
| near | warn | 16 |
| nonmanifold | warn | 365 |
| seam | info | 1090 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 311)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.04, 0.01, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 29.6 | 0 | 250 | 1.91 | false | 1 + 0 + 0.03 |
| 0.04, 0.03, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 250 | 1.91 | false | 0.78 + 0.62 + 0.03 |
| 0.04, 0.03, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 250 | 1.91 | false | 0.78 + 0.62 + 0.03 |
| 0.02, 0.04, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 250 | 1.91 | false | 0.43 + 0.9 + 0.03 |
| -0.02, 0.04, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 250 | 1.91 | false | -0.43 + 0.9 + 0.03 |
| -0.04, 0.03, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 250 | 1.91 | false | -0.78 + 0.62 + 0.03 |
| -0.04, 0.03, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 250 | 1.91 | false | -0.78 + 0.62 + 0.03 |
| -0.04, 0.01, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 29.6 | 0 | 250 | 1.91 | false | -1 + 0 + 0.03 |
| 0.04, 0.01, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 29.6 | 0 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.03, 0.03, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 250 | 1.91 | false | 0.78 + 0.62 + 0.03 |
| 0.04, 0.02, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 250 | 1.91 | false | 0.78 + 0.62 + 0.03 |
| 0.02, 0.04, 0.14 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 30.5 | 0 | 250 | 1.91 | false | 0.45 + 0.89 + 0.03 |
| 0.02, 0.04, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 250 | 1.91 | false | 0.43 + 0.9 + 0.03 |
| -0.00, 0.05, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 33.6 | 0 | 250 | 1.91 | false | 0 + 1 + 0.03 |
| 0.00, 0.04, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 27.8 | 0 | 250 | 1.91 | false | 0 + 1 + 0.03 |
| -0.02, 0.04, 0.14 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.6 | 0 | 250 | 1.91 | false | -0.47 + 0.88 + 0.03 |
| -0.02, 0.04, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 27.8 | 0 | 250 | 1.91 | false | -0.43 + 0.9 + 0.03 |
| -0.04, 0.03, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 250 | 1.91 | false | -0.78 + 0.62 + 0.03 |
| -0.03, 0.03, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 250 | 1.91 | false | -0.78 + 0.62 + 0.03 |
| -0.04, 0.01, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 29.6 | 0 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 3.3 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.05, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1.2 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1.2 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.02, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.2 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.04, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 2 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 0.7 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.02, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 5.6 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.04, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 2 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 0.7 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.02, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 5.6 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.04, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 8 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 0.6 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 1.9 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 0.6 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 1.9 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 2.9 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 2.9 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 3.3 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| -0.01, 0.00, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 1.7 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |
| 0.03, 0.01, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 3.3 | 0 | 250 | 1.91 | false | 0 + 0 + -1 |

(271 more in the JSON)

## depth (block, 8)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.03, 0.01, 0.29 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 1.5 | 1 | 4.2 | 250 | 1.91 | false | -0.97 + 0 + -0.22 |
| -0.03, 0.01, 0.29 | ArmU_L/Suit/Suit + ArmU_R/Plastic/Plastic | 1.5 | 1 | 4.2 | 250 | 1.91 | false | -0.97 + 0 + -0.22 |
| 0.03, 0.01, 0.29 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 1.5 | 0.8 | 4.2 | 250 | 1.91 | false | 0.97 + 0 + -0.22 |
| 0.03, 0.01, 0.29 | ArmU_L/Suit/Suit + ArmU_R/Plastic/Plastic | 1.5 | 0.8 | 4.2 | 250 | 1.91 | false | 0.97 + 0 + -0.22 |
| -0.03, 0.01, 0.29 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 1.49 | 0.9 | 4.2 | 250 | 1.91 | false | -0.96 + 0 + -0.29 |
| 0.03, 0.01, 0.29 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 1.49 | 0.8 | 4.2 | 250 | 1.91 | false | 0.96 + 0 + -0.29 |
| -0.03, 0.01, 0.29 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 1.5 | 0.9 | 4.2 | 250 | 1.91 | false | -0.97 + 0 + -0.22 |
| 0.03, 0.01, 0.29 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 1.5 | 0.8 | 4.2 | 250 | 1.91 | false | 0.97 + 0 + -0.22 |

## crossing (block, 12)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.01, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.8 |
| 0.01, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.8 |
| -0.01, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.2 |
| -0.01, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.2 |
| -0.00, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.2 |
| -0.00, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.2 |
| 0.01, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.8 |
| 0.01, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.8 |
| -0.01, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.2 |
| -0.01, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.2 |
| -0.00, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 9.3 | 1.2 |
| -0.00, 0.03, 0.29 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 9.3 | 1.2 |

## near (warn, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.04, 0.00, 0.28 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 3.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.00, 0.28 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 3.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| 0.04, 0.01, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 1.1 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.01, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 1.1 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.00, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 2.86 | 3.7 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.00, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 2.86 | 3.7 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| -0.04, 0.02, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 0.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.02, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 0.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.00, 0.28 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 3.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.00, 0.28 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 3.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| 0.04, 0.01, 0.27 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 1.1 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.01, 0.27 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 1.1 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.00, 0.27 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 2.86 | 3.7 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| 0.04, 0.00, 0.27 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 2.86 | 3.7 | 1.4 | 250 | 1.91 | false | 1 + 0 + 0.02 |
| -0.04, 0.02, 0.27 | ArmU_R/Suit/Suit + ArmF_L/Rubber/Rubber | 2.85 | 0.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |
| -0.04, 0.02, 0.27 | ArmU_R/Suit/Suit + ArmF_R/Rubber/Rubber | 2.85 | 0.9 | 1.4 | 250 | 1.91 | false | -1 + 0 + 0.02 |

## nonmanifold (warn, 365)

| at | part | uses |
|---|---|---|
| 0.04, 0.02, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.02, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.02, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.03, 0.29 | ArmU_L/Suit/Suit | 4 |
| 0.01, 0.05, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.01, 0.05, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.05, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.04, 0.14 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.02, 0.22 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.03, 0.22 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.03, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.01, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.04, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.01, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.01, 0.29 | ArmU_L/Suit/Suit | 4 |
| 0.01, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.03, 0.29 | ArmU_L/Suit/Suit | 4 |

(325 more in the JSON)

## seam (info, 1090)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.01, 0.33 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 0.01 | 3 | 25.1 |
| 0.01, 0.01, 0.33 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 0.01 | 3 | 25.1 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 2 | 38.3 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 2 | 53.5 |
| -0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.02 | 2 | 40.9 |
| -0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 2 | 53.5 |
| -0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.02 | 2 | 40.9 |
| 0.03, 0.03, 0.30 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 0.01 | 2 | 30.1 |
| 0.03, 0.02, 0.30 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 0.01 | 2 | 22.4 |
| 0.03, 0.03, 0.30 | ArmU_L/Suit/Suit + ArmU_R/Plastic/Plastic | 0.01 | 2 | 30.1 |
| 0.03, 0.02, 0.30 | ArmU_L/Suit/Suit + ArmU_R/Plastic/Plastic | 0.01 | 2 | 22.4 |
| 0.03, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 0.02 | 2 | 30.4 |
| 0.03, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmU_R/Plastic/Plastic | 0.02 | 2 | 30.4 |
| 0.02, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 0.03 | 2 | 51.3 |
| 0.02, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 0.03 | 2 | 51.3 |
| -0.02, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 0.04 | 2 | 47.6 |
| -0.02, 0.01, 0.31 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 0.04 | 2 | 47.6 |
| -0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.02 | 2 | 40.9 |
| -0.03, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 0.01 | 2 | 40.3 |
| -0.03, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 0.01 | 2 | 40.3 |
| -0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 2 | 53.5 |
| -0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 0.01 | 2 | 52.3 |
| -0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 0.01 | 2 | 52.3 |
| 0.02, 0.03, 0.26 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 2 | 39.5 |
| 0.02, 0.03, 0.26 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 2 | 39.5 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 2 | 38.3 |
| 0.03, 0.02, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0.02 | 2 | 38.8 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmF_L/Rubber/Rubber | 0.01 | 2 | 36.8 |
| 0.03, 0.02, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0.02 | 2 | 38.8 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmF_R/Rubber/Rubber | 0.01 | 2 | 36.8 |
| 0.03, 0.03, 0.30 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 0.01 | 2 | 58.5 |
| -0.03, 0.03, 0.30 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 0 | 2 | 65.3 |
| -0.03, 0.03, 0.29 | ArmU_L/Plastic/Plastic + ArmF_L/Rubber/Rubber | 0 | 2 | 79.2 |
| -0.03, 0.03, 0.29 | ArmU_L/Plastic/Plastic + ArmF_R/Rubber/Rubber | 0 | 2 | 79.2 |
| 0.03, 0.02, 0.29 | ArmU_L/Plastic/Plastic + ArmU_R/Suit/Suit | 0.02 | 2 | 29.9 |
| 0.03, 0.03, 0.28 | ArmU_R/Suit/Suit + ArmU_R/Suit/Suit | 0 | 2 | 53.5 |
| -0.03, 0.03, 0.28 | ArmU_R/Suit/Suit + ArmU_R/Suit/Suit | 0.02 | 2 | 40.9 |
| 0.03, 0.03, 0.30 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 0.01 | 2 | 58.5 |
| 0.03, 0.02, 0.29 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 0.02 | 2 | 29.9 |
| -0.03, 0.03, 0.30 | ArmU_R/Suit/Suit + ArmU_R/Plastic/Plastic | 0 | 2 | 65.3 |

(1050 more in the JSON)
