# Mesh audit: shopkit.glb

916 triangles, 468 welded vertices, 0 open edges, 0 rays, 70 ms.

**16 blocking**, 178 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| bentflat | block | 16 |
| sliver | warn | 174 |
| nonmanifold | warn | 4 |
| seam | info | 12 |
| backtoback | info | 32 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## bentflat (block, 16)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.33, -0.30, 0.06 | riser_classic/bluestone | 14.7 | 0.1571 | 0.31 |
| -0.33, -0.30, 0.11 | riser_classic/bluestone | 14.7 | 0.1571 | 0.31 |
| 0.33, -0.06, 0.17 | riser_classic/bluestone | 14.7 | 0.3459 | 0.69 |
| -0.33, -0.18, 0.17 | riser_classic/bluestone | 14.7 | 0.3459 | 0.69 |
| -0.33, 0.06, 0.06 | riser_classic/bluestone | 14.7 | 0.1571 | 0.31 |
| 0.33, 0.06, 0.11 | riser_classic/bluestone | 14.7 | 0.1571 | 0.31 |
| -0.33, -0.06, 0.00 | riser_classic/bluestone | 14.7 | 0.3459 | 0.69 |
| 0.33, -0.18, 0.00 | riser_classic/bluestone | 14.7 | 0.3459 | 0.69 |
| 0.33, 0.33, 0.14 | riser_classic/paint | 14.7 | 0.3904 | 0.78 |
| -0.33, 0.20, 0.14 | riser_classic/paint | 14.7 | 0.3904 | 0.78 |
| -0.33, 0.33, 0.00 | riser_classic/paint | 14.7 | 0.3904 | 0.78 |
| 0.33, 0.20, 0.00 | riser_classic/paint | 14.7 | 0.3904 | 0.78 |
| 0.29, 0.29, 0.15 | riser_classic/paint | 14.7 | 0.1559 | 0.31 |
| -0.29, 0.23, 0.15 | riser_classic/paint | 14.7 | 0.1559 | 0.31 |
| -0.29, 0.29, 0.14 | riser_classic/paint | 14.7 | 0.1559 | 0.31 |
| 0.29, 0.23, 0.14 | riser_classic/paint | 14.7 | 0.1559 | 0.31 |

## sliver (warn, 174)

| at | part | aspect | longest |
|---|---|---|---|
| -0.99, -0.06, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.18, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.06, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.18, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| -0.99, -0.18, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.06, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.18, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| -1.00, -0.06, 0.01 | riser_classic/bluestone | 76 | 0.348 |
| -0.33, -0.30, 0.01 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, -0.30, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, -0.30, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, -0.29, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, 0.06, 0.01 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, 0.06, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, 0.06, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, 0.06, 0.00 | riser_classic/bluestone | 433 | 1.988 |
| 1.00, -0.18, 0.01 | riser_classic/bluestone | 76 | 0.348 |
| 1.00, -0.06, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| 1.00, -0.18, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| 0.99, -0.06, 0.00 | riser_classic/bluestone | 76 | 0.348 |
| 0.99, -0.18, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| 1.00, -0.06, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| 1.00, -0.18, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| 1.00, -0.06, 0.17 | riser_classic/bluestone | 76 | 0.348 |
| 0.33, -0.30, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, -0.30, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, -0.30, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, -0.29, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, 0.06, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, 0.06, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| -0.33, 0.06, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| 0.33, 0.06, 0.17 | riser_classic/bluestone | 433 | 1.988 |
| -1.00, 0.33, 0.14 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.20, 0.14 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.33, 0.14 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.20, 0.14 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.20, 0.00 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.33, 0.00 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.20, 0.00 | riser_classic/paint | 128 | 0.392 |
| -1.00, 0.33, 0.00 | riser_classic/paint | 128 | 0.392 |

(134 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.92, 0.15, 0.15 | riser_classic/paint | 4 |
| 0.92, 0.15, 0.15 | riser_classic/paint | 4 |
| -0.92, 0.36, 0.15 | riser_classic/paint | 4 |
| 0.92, 0.36, 0.15 | riser_classic/paint | 4 |

## seam (info, 12)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.00, 0.52, 0.10 | riser_classic/paint + riser_classic/paint | 4.14 | 31 | 8.4 |
| -0.99, 0.06, 0.07 | riser_classic/bluestone + riser_classic/paint | 4.24 | 7 | 22.5 |
| -1.00, 0.46, 0.07 | riser_classic/paint + riser_classic/paint | 4.25 | 6 | 22.5 |
| 0.80, 0.13, 0.14 | riser_classic/paint + riser_classic/paint | 3.71 | 6 | 22.5 |
| 0.66, 0.17, 0.14 | riser_classic/paint + riser_classic/paint | 3.82 | 6 | 22.5 |
| 0.18, 0.37, 0.14 | riser_classic/paint + riser_classic/paint | 3.71 | 6 | 22.5 |
| 0.89, 0.26, 0.14 | riser_classic/paint + riser_classic/paint | 0.45 | 4 | 22.5 |
| -0.92, 0.26, 0.14 | riser_classic/paint + riser_classic/paint | 0.45 | 4 | 22.5 |
| -0.89, 0.15, 0.15 | riser_classic/paint + riser_classic/paint | 0.01 | 2 | 22.5 |
| 0.89, 0.15, 0.14 | riser_classic/paint + riser_classic/paint | 0.01 | 2 | 22.5 |
| -0.89, 0.36, 0.14 | riser_classic/paint + riser_classic/paint | 0.01 | 2 | 22.5 |
| 0.89, 0.36, 0.15 | riser_classic/paint + riser_classic/paint | 0.01 | 2 | 22.5 |

## backtoback (info, 32)

| at | parts | area |
|---|---|---|
| 0.04, 0.06, 0.03 | riser_classic/bluestone + riser_classic/paint | 0.0694 |
| -0.70, 0.06, 0.07 | riser_classic/bluestone + riser_classic/paint | 0.08272 |
| 0.70, 0.06, 0.07 | riser_classic/bluestone + riser_classic/paint | 0.05786 |
| 0.36, 0.06, 0.12 | riser_classic/bluestone + riser_classic/paint | 0.04846 |
| 0.69, 0.15, 0.14 | riser_classic/paint + riser_classic/paint | 0.00081 |
| 0.78, 0.14, 0.14 | riser_classic/paint + riser_classic/paint | 0.0065 |
| 0.14, 0.32, 0.14 | riser_classic/paint + riser_classic/paint | 0.0596 |
| 0.55, 0.24, 0.14 | riser_classic/paint + riser_classic/paint | 0.09629 |
| -0.12, 0.39, 0.14 | riser_classic/paint + riser_classic/paint | 0.01637 |
| 0.17, 0.38, 0.14 | riser_classic/paint + riser_classic/paint | 0.02207 |
| 0.90, 0.29, 0.14 | riser_classic/paint + riser_classic/paint | 0.0025 |
| 0.91, 0.23, 0.14 | riser_classic/paint + riser_classic/paint | 0.0025 |
| -0.17, 0.14, 0.14 | riser_classic/paint + riser_classic/paint | 0.02207 |
| 0.12, 0.13, 0.14 | riser_classic/paint + riser_classic/paint | 0.01637 |
| -0.91, 0.29, 0.14 | riser_classic/paint + riser_classic/paint | 0.0025 |
| -0.90, 0.23, 0.14 | riser_classic/paint + riser_classic/paint | 0.0025 |
| -0.55, 0.28, 0.14 | riser_classic/paint + riser_classic/paint | 0.09629 |
| -0.14, 0.20, 0.14 | riser_classic/paint + riser_classic/paint | 0.0596 |
| -0.78, 0.38, 0.14 | riser_classic/paint + riser_classic/paint | 0.0065 |
| -0.69, 0.37, 0.14 | riser_classic/paint + riser_classic/paint | 0.00081 |
| -0.07, 0.46, 0.04 | riser_classic/paint + riser_classic/paint | 0.13114 |
| 0.91, 0.46, 0.01 | riser_classic/paint + riser_classic/paint | 0.00033 |
| -0.29, 0.46, 0.10 | riser_classic/paint + riser_classic/paint | 0.02033 |
| 0.53, 0.46, 0.07 | riser_classic/paint + riser_classic/paint | 0.11114 |
| -0.90, 0.15, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| -0.91, 0.15, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| 0.91, 0.15, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| 0.90, 0.15, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| 0.90, 0.36, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| 0.91, 0.36, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| -0.91, 0.36, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |
| -0.90, 0.36, 0.15 | riser_classic/paint + riser_classic/paint | 0.00007 |


Nodes: riser_classic. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
