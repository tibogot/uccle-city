# Mesh audit: parasol lod0

1,040 triangles, 655 welded vertices, 256 open edges, 6,400 rays, 104 ms.

**0 blocking**, 256 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 256 |
| seam | info | 11 |
| opening | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 256)

| at | part | aspect | longest |
|---|---|---|---|
| 0.02, 0.84, 0.00 | parasol.lod0 | 269 | 2.312 |
| 0.02, 1.61, 0.01 | parasol.lod0 | 269 | 2.312 |
| 0.02, 0.84, 0.01 | parasol.lod0 | 269 | 2.312 |
| 0.02, 1.61, 0.01 | parasol.lod0 | 269 | 2.312 |
| 0.01, 0.84, 0.02 | parasol.lod0 | 269 | 2.312 |
| 0.01, 1.61, 0.02 | parasol.lod0 | 269 | 2.312 |
| 0.01, 0.84, 0.02 | parasol.lod0 | 269 | 2.312 |
| 0.00, 1.61, 0.02 | parasol.lod0 | 269 | 2.312 |
| -0.00, 0.84, 0.02 | parasol.lod0 | 269 | 2.312 |
| -0.01, 1.61, 0.02 | parasol.lod0 | 269 | 2.312 |
| -0.01, 0.84, 0.02 | parasol.lod0 | 269 | 2.312 |
| -0.01, 1.61, 0.02 | parasol.lod0 | 269 | 2.312 |
| -0.02, 0.84, 0.01 | parasol.lod0 | 269 | 2.312 |
| -0.02, 1.61, 0.01 | parasol.lod0 | 269 | 2.312 |
| -0.02, 0.84, 0.01 | parasol.lod0 | 269 | 2.312 |
| -0.02, 1.61, 0.00 | parasol.lod0 | 269 | 2.312 |
| -0.02, 0.84, -0.00 | parasol.lod0 | 269 | 2.312 |
| -0.02, 1.61, -0.01 | parasol.lod0 | 269 | 2.312 |
| -0.02, 0.84, -0.01 | parasol.lod0 | 269 | 2.312 |
| -0.02, 1.61, -0.01 | parasol.lod0 | 269 | 2.312 |
| -0.01, 0.84, -0.02 | parasol.lod0 | 269 | 2.312 |
| -0.01, 1.61, -0.02 | parasol.lod0 | 269 | 2.312 |
| -0.01, 0.84, -0.02 | parasol.lod0 | 269 | 2.312 |
| -0.00, 1.61, -0.02 | parasol.lod0 | 269 | 2.312 |
| 0.00, 0.84, -0.02 | parasol.lod0 | 269 | 2.312 |
| 0.01, 1.61, -0.02 | parasol.lod0 | 269 | 2.312 |
| 0.01, 0.84, -0.02 | parasol.lod0 | 269 | 2.312 |
| 0.01, 1.61, -0.02 | parasol.lod0 | 269 | 2.312 |
| 0.02, 0.84, -0.01 | parasol.lod0 | 269 | 2.312 |
| 0.02, 1.61, -0.01 | parasol.lod0 | 269 | 2.312 |
| 0.02, 0.84, -0.01 | parasol.lod0 | 269 | 2.312 |
| 0.02, 1.61, -0.00 | parasol.lod0 | 269 | 2.312 |
| 0.23, 1.76, 0.01 | parasol.lod0 | 210 | 0.747 |
| 0.44, 1.89, 0.01 | parasol.lod0 | 210 | 0.747 |
| 0.24, 1.75, 0.01 | parasol.lod0 | 210 | 0.747 |
| 0.45, 1.89, 0.01 | parasol.lod0 | 210 | 0.747 |
| 0.24, 1.75, 0.00 | parasol.lod0 | 210 | 0.747 |
| 0.45, 1.89, 0.00 | parasol.lod0 | 210 | 0.747 |
| 0.24, 1.75, 0.00 | parasol.lod0 | 210 | 0.747 |
| 0.45, 1.89, -0.00 | parasol.lod0 | 210 | 0.747 |

(216 more in the JSON)

## seam (info, 11)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.02, 0.07, 0.00 | parasol.lod0 + parasol.lod0 | 0.11 | 32 | 45.6 |
| 0.03, 2.41, 0.01 | parasol.lod0 + parasol.lod0 | 0.18 | 28 | 62.1 |
| 1.27, 2.04, 0.03 | parasol.lod0 + parasol.lod0 | 7.88 | 16 | 72.8 |
| 0.02, 1.63, 0.00 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| 0.02, 1.63, 0.01 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| 0.00, 1.63, 0.02 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| -0.01, 1.63, 0.02 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| -0.02, 1.63, 0.00 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| -0.02, 1.63, -0.01 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| -0.00, 1.63, -0.02 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |
| 0.01, 1.63, -0.02 | parasol.lod0 + parasol.lod0 | 0 | 2 | 57.4 |

## opening (info, 16)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.94, 1.89, 0.87 | parasol.lod0 | 0.92 + 0 + 0.38 | 0.995 |
| 1.27, 1.89, 0.05 | parasol.lod0 | -0.92 + 0 + -0.38 | 0.985 |
| 0.87, 1.89, 0.94 | parasol.lod0 | 0.38 + 0 + 0.92 | 0.995 |
| 0.86, 1.89, 0.93 | parasol.lod0 | -0.38 + 0 + -0.92 | 0.985 |
| -0.05, 1.89, 1.28 | parasol.lod0 | -0.38 + 0 + 0.92 | 0.995 |
| -0.05, 1.89, 1.27 | parasol.lod0 | 0.38 + 0 + -0.92 | 0.985 |
| -0.94, 1.89, 0.87 | parasol.lod0 | -0.92 + 0 + 0.38 | 0.995 |
| -0.93, 1.89, 0.86 | parasol.lod0 | 0.92 + 0 + -0.38 | 0.985 |
| -1.28, 1.89, -0.05 | parasol.lod0 | -0.92 + 0 + -0.38 | 0.995 |
| -1.27, 1.89, -0.05 | parasol.lod0 | 0.92 + 0 + 0.38 | 0.985 |
| -0.87, 1.89, -0.94 | parasol.lod0 | -0.38 + 0 + -0.92 | 0.995 |
| -0.86, 1.89, -0.93 | parasol.lod0 | 0.38 + 0 + 0.92 | 0.985 |
| 0.05, 1.89, -1.28 | parasol.lod0 | 0.38 + 0 + -0.92 | 0.995 |
| 0.05, 1.89, -1.27 | parasol.lod0 | -0.38 + 0 + 0.92 | 0.985 |
| 1.28, 1.89, -0.05 | parasol.lod0 | 0.92 + 0 + -0.38 | 0.995 |
| 1.27, 1.89, -0.05 | parasol.lod0 | -0.92 + 0 + 0.38 | 0.985 |
