# Kit audit: soupPlinth.big LOD1

206 triangles, 140 welded vertices, 28 open edges, 16,256 rays, 8 ms.

**0 blocking**, 4 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 4 |
| seam | info | 23 |
| opening | info | 3 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 4)

| at | part | aspect | longest |
|---|---|---|---|
| -0.10, 0.29, 0.04 | soup.lod1/cast_iron_green | 73 | 0.58 |
| 0.10, 0.25, 0.04 | soup.lod1/cast_iron_green | 73 | 0.58 |
| 0.10, 0.29, 0.04 | soup.lod1/cast_iron_green | 73 | 0.58 |
| -0.10, 0.25, 0.04 | soup.lod1/cast_iron_green | 73 | 0.58 |

## seam (info, 23)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 0.13, 0.04 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 28 | 90 |
| -0.16, 0.13, 0.02 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 26 | 90 |
| -0.08, 0.13, 0.02 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 26 | 90 |
| 0.09, 0.13, 0.03 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 26 | 90 |
| 0.16, 0.13, 0.04 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 26 | 90 |
| -0.24, 0.13, 0.02 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 24 | 90 |
| 0.24, 0.41, 0.02 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.1 | 24 | 90 |
| 0.28, 0.29, 0.04 | soup.lod1/stone_blue + soup.lod1/cast_iron_green | 0.16 | 16 | 90 |
| -0.24, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 14 | 30 |
| -0.16, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 14 | 30 |
| 0.16, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 14 | 30 |
| 0.24, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 14 | 30 |
| -0.08, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 12 | 30 |
| 0.00, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 12 | 30 |
| 0.08, 0.25, 0.04 | soup.lod1/cast_iron_green + soup.lod1/cast_iron_green | 0.08 | 12 | 30 |
| 0.18, 0.10, 0.07 | soup.lod1/stone_blue + soup.lod1/stone_blue | 1.92 | 10 | 40 |
| -0.27, 0.13, 0.01 | soup.lod1/stone_blue + soup.lod1/glass_window | 1.68 | 10 | 90 |
| -0.45, 0.06, 0.00 | soup.lod1/stone_blue + wall/wall | 3.4 | 8 | 90 |
| -0.45, 0.00, 0.01 | soup.lod1/stone_blue + ground/ground | 1.98 | 8 | 90 |
| -1.82, 0.00, 0.04 | plinth.lod1/stone_blue + ground/ground | 1.59 | 7 | 89.9 |
| 0.45, 0.40, 0.04 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.86 | 6 | 90 |
| 0.92, 0.00, 0.04 | plinth.lod1/stone_blue + ground/ground | 1.59 | 6 | 89.9 |
| 0.69, 0.00, 0.00 | wall/wall + ground/ground | 6 | 3 | 90 |

## opening (info, 3)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.95, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 6 |
| -3.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 2.5 |
| 3.00, 0.00, 1.95 | ground/ground | 0 + 1 + 0 | 2.5 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| -0.45, 0.01, 0.01 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.00857 |
| 0.45, 0.32, 0.01 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.0162 |
| 0.45, 0.30, 0.03 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.00231 |
| -0.45, 0.43, 0.01 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.00982 |
| -0.45, 0.23, 0.04 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.00463 |
| 0.45, -0.03, 0.03 | soup.lod1/stone_blue + plinth.lod1/stone_blue | 0.01326 |
