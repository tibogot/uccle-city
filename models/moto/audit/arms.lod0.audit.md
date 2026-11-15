# Mesh audit: motorbike arms LOD0 (error 0 m)

1,672 triangles, 430 welded vertices, 0 open edges, 0 rays, 666 ms.

**444 blocking**, 629 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 444 |
| nonmanifold | warn | 629 |
| seam | info | 1572 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 444)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.05, 0.01, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | 0.97 + 0.22 + 0.03 |
| 0.05, 0.01, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.97 + 0.22 + 0.03 |
| 0.04, 0.03, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | 0.78 + 0.62 + 0.03 |
| 0.04, 0.03, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.78 + 0.62 + 0.03 |
| 0.02, 0.05, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | 0.43 + 0.9 + 0.03 |
| 0.02, 0.04, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.43 + 0.9 + 0.03 |
| -0.00, 0.05, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | 0 + 1 + 0.03 |
| 0.00, 0.05, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0 + 1 + 0.03 |
| -0.02, 0.04, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | -0.43 + 0.9 + 0.03 |
| -0.02, 0.04, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.43 + 0.9 + 0.03 |
| -0.04, 0.03, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | -0.78 + 0.62 + 0.03 |
| -0.04, 0.03, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.78 + 0.62 + 0.03 |
| -0.05, 0.01, 0.05 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 16.8 | 0 | 22 | 0.17 | false | -0.97 + 0.22 + 0.03 |
| -0.04, 0.01, 0.10 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.97 + 0.22 + 0.03 |
| 0.04, 0.01, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.97 + 0.22 + 0.03 |
| 0.04, 0.01, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | 0.97 + 0.22 + 0.03 |
| 0.03, 0.03, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.78 + 0.62 + 0.03 |
| 0.04, 0.02, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | 0.78 + 0.62 + 0.03 |
| 0.02, 0.04, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0.43 + 0.9 + 0.03 |
| 0.02, 0.04, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | 0.43 + 0.9 + 0.03 |
| -0.00, 0.04, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | 0 + 1 + 0.03 |
| 0.00, 0.04, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | 0 + 1 + 0.03 |
| -0.02, 0.04, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.43 + 0.9 + 0.03 |
| -0.02, 0.04, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | -0.43 + 0.9 + 0.03 |
| -0.04, 0.03, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.78 + 0.62 + 0.03 |
| -0.03, 0.03, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | -0.78 + 0.62 + 0.03 |
| -0.04, 0.01, 0.19 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 15.2 | 0 | 22 | 0.17 | false | -0.97 + 0.22 + 0.03 |
| -0.04, 0.01, 0.24 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 13.9 | 0 | 22 | 0.17 | false | -0.97 + 0.22 + 0.03 |
| -0.04, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.01, 0.05, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| 0.03, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1.2 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.02, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 8 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.04, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 0.6 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.01, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 0.6 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.02, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 1.9 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.04, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 0.6 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.01, 0.04, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 0.6 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| -0.02, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmF_R/Suit/Suit | 0 | 1.9 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| 0.04, 0.02, 0.00 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 8 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |
| 0.03, 0.03, 0.00 | ArmU_L/Suit/Suit + ArmF_L/Suit/Suit | 0 | 0.6 | 0 | 22 | 0.17 | false | 0 + 0 + -1 |

(404 more in the JSON)

## nonmanifold (warn, 629)

| at | part | uses |
|---|---|---|
| 0.05, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.02, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.05, 0.01, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.01, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| 0.01, 0.05, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.01, 0.05, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.05, 0.07 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.05, 0.14 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.05, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.04, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.02, 0.04, 0.14 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.02, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.03, 0.14 | ArmU_L/Suit/Suit | 4 |
| -0.05, 0.01, 0.00 | ArmU_L/Suit/Suit | 4 |
| -0.05, 0.01, 0.07 | ArmU_L/Suit/Suit | 4 |
| -0.04, 0.01, 0.14 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.02, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.01, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.01, 0.29 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.04, 0.03, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.03, 0.03, 0.29 | ArmU_L/Suit/Suit | 4 |
| 0.01, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.02, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.01, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |
| 0.00, 0.04, 0.29 | ArmU_L/Suit/Suit | 4 |
| -0.03, 0.04, 0.22 | ArmU_L/Suit/Suit | 4 |

(589 more in the JSON)

## seam (info, 1572)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 24.1 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 14.2 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 24.1 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 14.2 |
| 0.04, 0.01, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 14.2 |
| 0.04, 0.00, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 14.2 |
| 0.04, 0.01, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 14.2 |
| 0.04, 0.00, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 14.2 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 31.8 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 33.1 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 33.1 |
| 0.03, 0.03, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 31.8 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 33.1 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 33.1 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 13.2 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 13.2 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 33.1 |
| 0.03, 0.03, 0.27 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 33.1 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 13.2 |
| 0.04, 0.02, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 13.2 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 22.3 |
| 0.02, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 22.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 33.3 |
| 0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 22.3 |
| 0.02, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 22.3 |
| -0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 35.8 |
| -0.01, 0.04, 0.28 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 35.8 |
| -0.01, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 35.8 |
| -0.00, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 35.8 |
| 0.00, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 36 |
| 0.00, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0 | 1 | 36 |
| 0.01, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_L/Suit/Suit | 0.01 | 1 | 35.8 |
| -0.01, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 35.8 |
| -0.00, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0 | 1 | 35.8 |
| 0.00, 0.04, 0.27 | ArmU_L/Suit/Suit + ArmU_R/Suit/Suit | 0.01 | 1 | 36 |

(1532 more in the JSON)
