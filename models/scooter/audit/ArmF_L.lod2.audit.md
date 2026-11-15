# Mesh audit: models/scooter/scooter.raw.glb ArmF_L LOD2 (error 0.011 m)

134 triangles, 87 welded vertices, 0 open edges, 0 rays, 3 ms.

**0 blocking**, 2 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 2 |
| seam | info | 5 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| 0.03, 0.03, 0.33 | ArmF_L/Glove/Glove | 4 |
| 0.03, 0.03, 0.35 | ArmF_L/Glove/Glove | 4 |

## seam (info, 5)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.02, 0.27 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.17 | 16 | 41.1 |
| -0.00, 0.00, 0.30 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.16 | 15 | 19.4 |
| -0.01, 0.02, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.06 | 9 | 56.1 |
| -0.00, 0.01, 0.25 | ArmF_L/Jacket/Jacket + ArmF_L/Glove/Glove | 0.02 | 5 | 43.9 |
| 0.01, 0.03, 0.32 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.03 | 3 | 58.8 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 0.03, 0.03, 0.33 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00025 |
| 0.03, 0.03, 0.34 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00029 |
| 0.03, 0.01, 0.35 | ArmF_L/Glove/Glove + ArmF_L/Glove/Glove | 0.00041 |
