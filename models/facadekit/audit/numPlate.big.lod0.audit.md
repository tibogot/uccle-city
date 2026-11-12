# Kit audit: numPlate.big LOD0

166 triangles, 92 welded vertices, 4 open edges, 7,168 rays, 2 ms.

**0 blocking**, 0 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| seam | info | 3 |
| opening | info | 1 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.07, 1.81, 0.01 | numPlate.lod0/painted_metal_white + numPlate.lod0/enamel_blue | 0.02 | 16 | 90 |
| 0.07, 1.81, 0.01 | numPlate.lod0/painted_metal_white + numPlate.lod0/enamel_blue | 0.02 | 16 | 90 |
| -0.08, 1.81, 0.00 | numPlate.lod0/enamel_blue + wall/wall | 0.54 | 4 | 22.5 |

## opening (info, 1)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.95, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 6 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| -0.03, 1.83, 0.00 | numPlate.lod0/enamel_blue + wall/wall | 0.00886 |
| 0.03, 1.79, 0.00 | numPlate.lod0/enamel_blue + wall/wall | 0.00886 |
