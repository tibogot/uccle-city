# Mesh audit: cross lod1

220 triangles, 120 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 0 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| backtoback | info | 7 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## backtoback (info, 7)

| at | parts | area |
|---|---|---|
| -0.02, 0.03, 0.65 | cross.lod1 + cross.lod1 | 0.0058 |
| 0.01, 0.07, 0.65 | cross.lod1 + cross.lod1 | 0.00278 |
| 0.02, 0.03, 0.91 | cross.lod1 + cross.lod1 | 0.0058 |
| -0.01, 0.07, 0.91 | cross.lod1 + cross.lod1 | 0.00278 |
| 0.01, 0.00, 0.03 | cross.lod1 + cross.lod1 | 0.00036 |
| -0.01, -0.00, 0.03 | cross.lod1 + cross.lod1 | 0.00036 |
| -0.00, 0.01, 0.03 | cross.lod1 + cross.lod1 | 0.00022 |
