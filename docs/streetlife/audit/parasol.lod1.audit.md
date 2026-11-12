# Mesh audit: parasol lod1

250 triangles, 148 welded vertices, 32 open edges, 6,400 rays, 8 ms.

**0 blocking**, 14 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 14 |
| seam | info | 3 |
| opening | info | 16 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 14)

| at | part | aspect | longest |
|---|---|---|---|
| 0.02, 0.84, 0.00 | parasol.lod1 | 168 | 2.316 |
| 0.02, 1.61, 0.01 | parasol.lod1 | 147 | 2.32 |
| 0.01, 0.84, 0.01 | parasol.lod1 | 116 | 2.32 |
| 0.00, 1.62, 0.01 | parasol.lod1 | 116 | 2.32 |
| -0.01, 1.61, 0.01 | parasol.lod1 | 147 | 2.32 |
| -0.01, 0.84, 0.01 | parasol.lod1 | 116 | 2.316 |
| -0.02, 0.84, 0.00 | parasol.lod1 | 265 | 2.316 |
| -0.02, 1.61, -0.01 | parasol.lod1 | 95 | 2.312 |
| -0.01, 0.84, -0.01 | parasol.lod1 | 147 | 2.316 |
| -0.01, 1.61, -0.02 | parasol.lod1 | 266 | 2.32 |
| -0.00, 0.84, -0.02 | parasol.lod1 | 147 | 2.32 |
| 0.01, 1.62, -0.02 | parasol.lod1 | 103 | 2.316 |
| 0.01, 0.84, -0.01 | parasol.lod1 | 103 | 2.316 |
| 0.02, 1.61, -0.01 | parasol.lod1 | 138 | 2.316 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.02, 0.07, 0.00 | parasol.lod1 + parasol.lod1 | 0.1 | 18 | 19.1 |
| 0.02, 2.41, 0.01 | parasol.lod1 + parasol.lod1 | 0.16 | 18 | 26.5 |
| 1.27, 2.04, 0.03 | parasol.lod1 + parasol.lod1 | 7.88 | 16 | 72.8 |

## opening (info, 16)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.94, 1.89, 0.87 | parasol.lod1 | 0.92 + 0 + 0.38 | 0.995 |
| 1.27, 1.89, 0.05 | parasol.lod1 | -0.92 + 0 + -0.38 | 0.985 |
| 0.87, 1.89, 0.94 | parasol.lod1 | 0.38 + 0 + 0.92 | 0.995 |
| 0.86, 1.89, 0.93 | parasol.lod1 | -0.38 + 0 + -0.92 | 0.985 |
| -0.05, 1.89, 1.28 | parasol.lod1 | -0.38 + 0 + 0.92 | 0.995 |
| -0.05, 1.89, 1.27 | parasol.lod1 | 0.38 + 0 + -0.92 | 0.985 |
| -0.94, 1.89, 0.87 | parasol.lod1 | -0.92 + 0 + 0.38 | 0.995 |
| -0.93, 1.89, 0.86 | parasol.lod1 | 0.92 + 0 + -0.38 | 0.985 |
| -1.28, 1.89, -0.05 | parasol.lod1 | -0.92 + 0 + -0.38 | 0.995 |
| -1.27, 1.89, -0.05 | parasol.lod1 | 0.92 + 0 + 0.38 | 0.985 |
| -0.87, 1.89, -0.94 | parasol.lod1 | -0.38 + 0 + -0.92 | 0.995 |
| -0.86, 1.89, -0.93 | parasol.lod1 | 0.38 + 0 + 0.92 | 0.985 |
| 0.05, 1.89, -1.28 | parasol.lod1 | 0.38 + 0 + -0.92 | 0.995 |
| 0.05, 1.89, -1.27 | parasol.lod1 | -0.38 + 0 + 0.92 | 0.985 |
| 1.28, 1.89, -0.05 | parasol.lod1 | 0.92 + 0 + -0.38 | 0.995 |
| 1.27, 1.89, -0.05 | parasol.lod1 | -0.92 + 0 + 0.38 | 0.985 |

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| -0.01, 0.07, 0.00 | parasol.lod1 + parasol.lod1 | 0.00007 |
| -0.01, 0.07, 0.00 | parasol.lod1 + parasol.lod1 | 0.00004 |
| -0.01, 0.07, -0.00 | parasol.lod1 + parasol.lod1 | 0.00012 |
| -0.00, 0.07, -0.01 | parasol.lod1 + parasol.lod1 | 0.00004 |
| 0.01, 0.07, -0.00 | parasol.lod1 + parasol.lod1 | 0.00006 |
