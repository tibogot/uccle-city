# Kit audit: soupPlinth.big LOD0

502 triangles, 288 welded vertices, 28 open edges, 16,160 rays, 15 ms.

**0 blocking**, 184 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 184 |
| seam | info | 22 |
| opening | info | 3 |
| backtoback | info | 11 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 184)

| at | part | aspect | longest |
|---|---|---|---|
| -0.44, 0.28, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.28, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.44, 0.02, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.02, 0.06 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.15, 0.54, -0.02 | soup.lod0/stone_blue | 144 | 0.884 |
| 0.15, 0.55, -0.02 | soup.lod0/stone_blue | 144 | 0.884 |
| -0.15, 0.54, 0.07 | soup.lod0/stone_blue | 144 | 0.884 |
| -0.15, 0.55, 0.07 | soup.lod0/stone_blue | 144 | 0.884 |
| 0.44, 0.02, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.45, 0.02, -0.01 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.44, 0.28, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.45, 0.28, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.02, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.02, -0.01 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.28, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.45, 0.28, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.15, 0.55, -0.02 | soup.lod0/stone_blue | 144 | 0.884 |
| -0.15, 0.55, -0.01 | soup.lod0/stone_blue | 144 | 0.884 |
| 0.15, 0.55, 0.07 | soup.lod0/stone_blue | 144 | 0.884 |
| 0.15, 0.55, 0.06 | soup.lod0/stone_blue | 144 | 0.884 |
| 0.45, 0.28, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.45, 0.28, -0.02 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.45, 0.02, 0.07 | soup.lod0/stone_blue | 128 | 0.784 |
| 0.45, 0.02, 0.06 | soup.lod0/stone_blue | 128 | 0.784 |
| -0.24, 0.22, 0.02 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.23, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.23, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.24, 0.22, 0.04 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.24, 0.22, 0.04 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.25, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.25, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.24, 0.22, 0.02 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.16, 0.22, 0.02 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.15, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.15, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.16, 0.22, 0.04 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.16, 0.22, 0.04 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.17, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.17, 0.22, 0.03 | soup.lod0/cast_iron_green | 49 | 0.3 |
| -0.16, 0.22, 0.02 | soup.lod0/cast_iron_green | 49 | 0.3 |

(144 more in the JSON)

## seam (info, 22)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.28, 0.28, 0.04 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.15 | 48 | 90 |
| 0.00, 0.13, 0.04 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 36 | 90 |
| -0.16, 0.13, 0.02 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 34 | 90 |
| -0.08, 0.13, 0.02 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 34 | 90 |
| 0.09, 0.13, 0.03 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 34 | 90 |
| 0.16, 0.13, 0.04 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 34 | 90 |
| -0.25, 0.13, 0.03 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 32 | 90 |
| 0.25, 0.41, 0.02 | soup.lod0/stone_blue + soup.lod0/cast_iron_green | 0.1 | 32 | 90 |
| -0.44, 0.00, -0.02 | soup.lod0/stone_blue + ground/ground | 1.96 | 24 | 90 |
| -0.15, 0.28, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 24 | 22.5 |
| -0.07, 0.28, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 24 | 22.5 |
| 0.00, 0.28, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 24 | 22.5 |
| 0.08, 0.29, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 24 | 22.5 |
| 0.16, 0.28, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 24 | 22.5 |
| -0.23, 0.28, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 23 | 22.5 |
| 0.24, 0.29, 0.04 | soup.lod0/cast_iron_green + soup.lod0/cast_iron_green | 0.08 | 23 | 22.5 |
| 0.45, 0.41, 0.04 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.86 | 12 | 22.5 |
| 0.18, 0.10, 0.07 | soup.lod0/stone_blue + soup.lod0/stone_blue | 1.92 | 10 | 40 |
| -0.27, 0.13, 0.01 | soup.lod0/stone_blue + soup.lod0/glass_window | 1.68 | 10 | 90 |
| -1.82, 0.00, 0.04 | plinth.lod0/stone_blue + ground/ground | 1.59 | 9 | 90 |
| 0.92, 0.00, 0.04 | plinth.lod0/stone_blue + ground/ground | 1.59 | 8 | 90 |
| 0.69, 0.00, 0.00 | wall/wall + ground/ground | 6 | 3 | 90 |

## opening (info, 3)

| at | part | facing | edge_m |
|---|---|---|---|
| 2.95, 4.00, 0.00 | wall/wall | 0 + 0 + 1 | 6 |
| -3.00, 0.00, -0.45 | ground/ground | 0 + 1 + 0 | 2.5 |
| 3.00, 0.00, 1.95 | ground/ground | 0 + 1 + 0 | 2.5 |

## backtoback (info, 11)

| at | parts | area |
|---|---|---|
| -0.45, -0.03, 0.01 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00186 |
| -0.45, 0.04, 0.00 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00746 |
| 0.45, 0.29, 0.01 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.01273 |
| 0.45, 0.31, 0.04 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.0019 |
| 0.45, 0.27, 0.03 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.0042 |
| 0.45, 0.53, 0.02 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00009 |
| -0.45, 0.35, 0.03 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00318 |
| -0.45, 0.45, 0.01 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00611 |
| -0.45, 0.21, 0.04 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00488 |
| -0.45, 0.53, 0.02 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.00009 |
| 0.45, -0.01, 0.03 | soup.lod0/stone_blue + plinth.lod0/stone_blue | 0.01324 |
