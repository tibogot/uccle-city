# Mesh audit: chair lod0

3,180 triangles, 1,610 welded vertices, 0 open edges, 0 rays, 348 ms.

**0 blocking**, 61 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 56 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.19, 0.48, -0.07 | chair.lod0 + chair.lod0 | 1.78 | 8.4 | 0 | 22 | 0.17 | false | 0 + 1 + 0 |
| -0.19, 0.48, -0.01 | chair.lod0 + chair.lod0 | 1.78 | 8.9 | 0 | 22 | 0.17 | false | 0 + 1 + 0 |
| -0.19, 0.48, -0.20 | chair.lod0 + chair.lod0 | 1.78 | 0.5 | 0 | 22 | 0.17 | false | 0 + 1 + 0 |
| 0.19, 0.48, -0.08 | chair.lod0 + chair.lod0 | 1.78 | 8.9 | 0 | 22 | 0.17 | false | 0 + 1 + 0 |
| 0.19, 0.48, 0.04 | chair.lod0 + chair.lod0 | 1.78 | 8.9 | 0 | 22 | 0.17 | false | 0 + 1 + 0 |

## sliver (warn, 56)

| at | part | aspect | longest |
|---|---|---|---|
| -0.20, 0.47, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.47, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.47, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.47, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.47, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.47, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.48, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.48, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.18, 0.48, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.48, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.48, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.48, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.19, 0.48, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.48, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.48, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.48, 0.04 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.47, -0.08 | chair.lod0 | 75 | 0.365 |
| -0.20, 0.47, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.18, 0.47, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.18, 0.47, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.18, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.18, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.18, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.19, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.19, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.19, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.19, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.20, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |
| 0.20, 0.46, -0.08 | chair.lod0 | 75 | 0.365 |
| 0.20, 0.46, 0.04 | chair.lod0 | 75 | 0.365 |

(16 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.18, 0.48, 0.18 | chair.lod0 + chair.lod0 | 0.07 | 34 | 54.3 |
| 0.18, 0.45, -0.19 | chair.lod0 + chair.lod0 | 0.07 | 30 | 83.6 |
| -0.19, 0.45, 0.17 | chair.lod0 + chair.lod0 | 0.07 | 30 | 83.6 |
| -0.19, 0.48, 0.18 | chair.lod0 + chair.lod0 | 0.07 | 30 | 54.3 |
| -0.18, 0.45, -0.19 | chair.lod0 + chair.lod0 | 0.07 | 28 | 83.6 |
| 0.19, 0.45, 0.17 | chair.lod0 + chair.lod0 | 0.07 | 28 | 83.6 |
