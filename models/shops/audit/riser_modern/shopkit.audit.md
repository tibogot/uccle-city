# Mesh audit: shopkit.glb

120 triangles, 64 welded vertices, 0 open edges, 0 rays, 13 ms.

**0 blocking**, 24 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 24 |
| seam | info | 1 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 24)

| at | part | aspect | longest |
|---|---|---|---|
| -0.33, 0.17, 0.00 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.17, 0.00 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.17, 0.00 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.17, 0.00 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.23, 0.00 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.23, 0.00 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.23, 0.00 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.23, 0.00 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.17, 0.11 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.17, 0.11 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.17, 0.11 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.17, 0.11 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.23, 0.11 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.23, 0.11 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.23, 0.11 | riser_modern/alu | 868 | 1.994 |
| 0.33, 0.23, 0.11 | riser_modern/alu | 868 | 1.994 |
| -0.33, 0.24, 0.06 | riser_modern/rubber | 200 | 2 |
| 0.33, 0.23, 0.06 | riser_modern/rubber | 200 | 2 |
| 0.33, 0.24, 0.09 | riser_modern/rubber | 200 | 2 |
| -0.33, 0.23, 0.09 | riser_modern/rubber | 200 | 2 |
| 0.33, 0.23, 0.07 | riser_modern/rubber | 67 | 2 |
| -0.33, 0.23, 0.08 | riser_modern/rubber | 67 | 2 |
| -0.33, 0.24, 0.07 | riser_modern/rubber | 67 | 2 |
| 0.33, 0.24, 0.08 | riser_modern/rubber | 67 | 2 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.00, 0.23, 0.06 | riser_modern/alu + riser_modern/rubber | 4.05 | 8 | 22.5 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -0.60, 0.23, 0.06 | riser_modern/alu + riser_modern/rubber | 0.00476 |
| -0.74, 0.23, 0.08 | riser_modern/alu + riser_modern/rubber | 0.01364 |
| 0.40, 0.23, 0.07 | riser_modern/alu + riser_modern/rubber | 0.02515 |
| 0.26, 0.23, 0.09 | riser_modern/alu + riser_modern/rubber | 0.01627 |


Nodes: riser_modern. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
