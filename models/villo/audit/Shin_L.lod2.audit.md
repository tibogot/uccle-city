# Mesh audit: models/villo/villo.raw.glb Shin_L LOD2 (error 0.011 m)

62 triangles, 39 welded vertices, 0 open edges, 0 rays, 2 ms.

**1 blocking**, 0 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 1 |
| seam | info | 2 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 1)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.04, 0.06, 0.49 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 7.8 | 0.1 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.04, 0.04, 0.52 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.6 | 17 | 9.5 |
| 0.00, 0.04, 0.43 | Shin_L/Trousers/Trousers + Shin_L/Boot/Boot | 0.01 | 5 | 28.9 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| 0.02, 0.13, 0.42 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00234 |
| 0.01, 0.17, 0.38 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00103 |
| -0.01, 0.11, 0.44 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00343 |
