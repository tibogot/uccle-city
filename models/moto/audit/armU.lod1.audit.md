# Mesh audit: motorbike armU LOD1 (error 0.0025 m)

314 triangles, 163 welded vertices, 0 open edges, 0 rays, 27 ms.

**0 blocking**, 2 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| seam | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.01, 0.04, 0.32 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 1.33 | 0.8 | 0.9 | 70 | 0.53 | false | 0.25 + 0.82 + 0.51 |
| -0.01, 0.04, 0.32 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 1.33 | 0.7 | 0.9 | 70 | 0.53 | false | -0.25 + 0.82 + 0.51 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.04, 0.02, 0.30 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 0.25 | 58 | 13.2 |
| 0.03, 0.03, 0.29 | ArmU_L/Suit/Suit + ArmU_L/Plastic/Plastic | 0.2 | 35 | 59.1 |
