# Mesh audit: fuelkit.glb

24 triangles, 16 welded vertices, 0 open edges, 0 rays, 4 ms.

**0 blocking**, 8 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 8 |
| seam | info | 1 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -0.49, 0.04, 0.16 | solar/solar_cell | 98 | 0.98 |
| -0.49, 0.04, -0.16 | solar/solar_cell | 98 | 0.98 |
| -0.16, 0.04, -0.49 | solar/solar_cell | 98 | 0.98 |
| 0.16, 0.04, -0.49 | solar/solar_cell | 98 | 0.98 |
| 0.49, 0.04, -0.16 | solar/solar_cell | 98 | 0.98 |
| 0.49, 0.04, 0.16 | solar/solar_cell | 98 | 0.98 |
| 0.16, 0.04, 0.49 | solar/solar_cell | 98 | 0.98 |
| -0.16, 0.04, 0.49 | solar/solar_cell | 98 | 0.98 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.49, 0.04, 0.00 | solar/trim_alu + solar/solar_cell | 3.92 | 4 | 90 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.12, 0.04, -0.37 | solar/trim_alu + solar/solar_cell | 0.2401 |
| -0.37, 0.04, 0.12 | solar/trim_alu + solar/solar_cell | 0.2401 |
| 0.37, 0.04, -0.12 | solar/trim_alu + solar/solar_cell | 0.2401 |
| -0.12, 0.04, 0.37 | solar/trim_alu + solar/solar_cell | 0.2401 |


Nodes: solar. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
