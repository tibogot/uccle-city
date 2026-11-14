# Mesh audit: streetkit villo_dock lod1

306 triangles, 179 welded vertices, 14 open edges, 256 rays, 10 ms.

**0 blocking**, 16 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| seam | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| 0.14, 0.03, 0.16 | villo_dock.lod1 | 59 | 0.848 |
| -0.14, 0.03, 0.16 | villo_dock.lod1 | 59 | 0.848 |
| 0.14, 0.04, 0.17 | villo_dock.lod1 | 64 | 0.848 |
| -0.14, 0.04, 0.17 | villo_dock.lod1 | 64 | 0.848 |
| -0.14, 0.04, 0.16 | villo_dock.lod1 | 59 | 0.848 |
| 0.14, 0.04, 0.16 | villo_dock.lod1 | 59 | 0.848 |
| -0.14, 0.04, 0.15 | villo_dock.lod1 | 64 | 0.848 |
| 0.14, 0.04, 0.15 | villo_dock.lod1 | 64 | 0.848 |
| 0.14, 0.03, -0.16 | villo_dock.lod1 | 59 | 0.848 |
| -0.14, 0.03, -0.16 | villo_dock.lod1 | 59 | 0.848 |
| 0.14, 0.04, -0.15 | villo_dock.lod1 | 64 | 0.848 |
| -0.14, 0.04, -0.15 | villo_dock.lod1 | 64 | 0.848 |
| -0.14, 0.04, -0.16 | villo_dock.lod1 | 59 | 0.847 |
| 0.14, 0.04, -0.16 | villo_dock.lod1 | 58 | 0.848 |
| -0.14, 0.04, -0.17 | villo_dock.lod1 | 64 | 0.847 |
| 0.14, 0.04, -0.17 | villo_dock.lod1 | 63 | 0.848 |

## seam (info, 4)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.06, 0.77, -0.01 | villo_dock.lod1 + villo_dock.lod1 | 0.42 | 44 | 30.9 |
| 0.07, 0.03, -0.04 | villo_dock.lod1 + villo_dock.lod1 | 0.5 | 30 | 88.9 |
| -0.06, 0.93, 0.00 | villo_dock.lod1 + villo_dock.lod1 | 0.49 | 19 | 23.5 |
| 0.04, 0.84, 0.15 | villo_dock.lod1 + villo_dock.lod1 | 0.3 | 10 | 90 |
