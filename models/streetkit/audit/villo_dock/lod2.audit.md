# Mesh audit: streetkit villo_dock lod2

72 triangles, 51 welded vertices, 12 open edges, 228 rays, 2 ms.

**0 blocking**, 2 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| seam | info | 3 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.06, 0.78, -0.01 | villo_dock.lod2 + villo_dock.lod2 | 2.2 | 0.9 | 0.8 | 200 | 1.53 | false | -1 + -0.01 + 0 |
| 0.06, 0.79, -0.01 | villo_dock.lod2 + villo_dock.lod2 | 2.23 | 0.9 | 0.8 | 200 | 1.53 | false | 1 + -0.01 + 0 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.07, 0.03, -0.04 | villo_dock.lod2 + villo_dock.lod2 | 0.5 | 20 | 87.3 |
| 0.06, 0.78, -0.02 | villo_dock.lod2 + villo_dock.lod2 | 0.39 | 17 | 32.8 |
| 0.04, 0.84, 0.14 | villo_dock.lod2 + villo_dock.lod2 | 0.3 | 10 | 90 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -0.01, 0.92, -0.03 | villo_dock.lod2 + villo_dock.lod2 | 0.00378 |
| 0.04, 0.94, 0.03 | villo_dock.lod2 + villo_dock.lod2 | 0.00377 |
| -0.04, 0.93, -0.00 | villo_dock.lod2 + villo_dock.lod2 | 0.00367 |
| 0.01, 0.95, 0.06 | villo_dock.lod2 + villo_dock.lod2 | 0.00366 |
