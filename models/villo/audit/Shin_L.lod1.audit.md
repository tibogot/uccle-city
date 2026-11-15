# Mesh audit: models/villo/villo.raw.glb Shin_L LOD1 (error 0.0025 m)

238 triangles, 127 welded vertices, 0 open edges, 0 rays, 13 ms.

**0 blocking**, 8 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 8 |
| seam | info | 2 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 8)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.04, 0.01, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | 0.98 + 0.2 + 0.03 |
| 0.03, 0.02, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | 0.83 + 0.56 + 0.03 |
| 0.02, 0.03, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | 0.56 + 0.83 + 0.03 |
| 0.01, 0.04, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | 0.2 + 0.98 + 0.03 |
| -0.01, 0.04, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | -0.2 + 0.98 + 0.03 |
| -0.02, 0.03, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | -0.56 + 0.83 + 0.03 |
| -0.03, 0.02, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | -0.83 + 0.56 + 0.03 |
| -0.04, 0.01, 0.39 | Shin_L/Trousers/Trousers + Shin_L/Trousers/Trousers | 2.96 | 3.4 | 1.5 | 70 | 0.53 | false | -0.98 + 0.2 + 0.03 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.03, 0.08, 0.47 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.63 | 24 | 6.3 |
| -0.02, 0.04, 0.43 | Shin_L/Trousers/Trousers + Shin_L/Boot/Boot | 0.09 | 23 | 28.3 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| 0.03, 0.15, 0.40 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00039 |
| -0.00, 0.14, 0.41 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.0025 |
| -0.01, 0.09, 0.47 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00315 |
| 0.01, 0.17, 0.38 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.0018 |
| 0.01, 0.19, 0.36 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.00065 |
| -0.00, 0.19, 0.36 | Shin_L/Boot/Boot + Shin_L/Rubber/Rubber | 0.0003 |
