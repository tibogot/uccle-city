# Mesh audit: models/moto/moto.raw.glb ArmF_L LOD2 (error 0.011 m)

128 triangles, 82 welded vertices, 0 open edges, 0 rays, 5 ms.

**1 blocking**, 4 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 1 |
| near | warn | 1 |
| nonmanifold | warn | 3 |
| seam | info | 5 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 1)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.02, 0.02, 0.24 | ArmF_L/Jacket/Jacket + ArmF_L/Glove/Glove | 9.7 | 1.7 |

## near (warn, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.03, 0.02, 0.22 | ArmF_L/Jacket/Jacket + ArmF_L/Glove/Glove | 2.07 | 2.1 | 4.7 | 250 | 1.91 | false | 0.9 + 0.43 + 0.01 |

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| -0.03, 0.03, 0.34 | ArmF_L/Glove/Glove | 4 |
| -0.03, 0.03, 0.36 | ArmF_L/Glove/Glove | 4 |
| 0.03, 0.02, 0.36 | ArmF_L/Glove/Glove | 4 |

## seam (info, 5)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.04, 0.20 | ArmF_L/Jacket/Jacket + ArmF_L/Glove/Glove | 0.48 | 25 | 17.3 |
| 0.01, 0.03, 0.28 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.17 | 13 | 44.8 |
| 0.01, 0.03, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.05 | 11 | 28.1 |
| -0.01, 0.03, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.05 | 6 | 47.7 |
| -0.03, 0.02, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.01 | 4 | 78.5 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -0.03, 0.03, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00025 |
| -0.03, 0.03, 0.35 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00029 |
| -0.03, 0.01, 0.36 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00042 |
| 0.03, 0.00, 0.36 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00041 |
