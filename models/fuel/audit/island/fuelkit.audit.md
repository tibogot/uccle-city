# Mesh audit: fuelkit.glb

292 triangles, 154 welded vertices, 0 open edges, 0 rays, 23 ms.

**0 blocking**, 18 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 18 |
| seam | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 18)

| at | part | aspect | longest |
|---|---|---|---|
| -0.61, 0.15, -0.65 | island/concrete | 234 | 3.7 |
| 0.62, 0.15, -0.65 | island/concrete | 234 | 3.686 |
| 0.61, 0.15, 0.65 | island/concrete | 234 | 3.7 |
| -0.62, 0.15, 0.65 | island/concrete | 234 | 3.686 |
| 0.68, 0.16, 0.64 | island/concrete | 131 | 3.872 |
| 0.68, 0.16, -0.64 | island/concrete | 131 | 3.872 |
| -0.62, 0.11, -0.66 | island/steel_galv | 93 | 3.7 |
| 0.62, 0.13, -0.66 | island/steel_galv | 93 | 3.7 |
| 0.62, 0.11, 0.66 | island/steel_galv | 93 | 3.7 |
| -0.62, 0.13, 0.66 | island/steel_galv | 93 | 3.7 |
| 0.68, 0.14, 0.65 | island/steel_galv | 128 | 3.903 |
| 0.68, 0.14, -0.65 | island/steel_galv | 128 | 3.903 |
| -0.68, 0.10, 0.65 | island/steel_galv | 128 | 3.903 |
| -0.68, 0.10, -0.65 | island/steel_galv | 128 | 3.903 |
| 1.85, 0.16, 0.21 | island/safety_yellow | 315 | 1.261 |
| 1.85, 0.16, -0.21 | island/safety_yellow | 315 | 1.261 |
| -1.85, 0.16, -0.21 | island/safety_yellow | 315 | 1.261 |
| -1.85, 0.16, 0.21 | island/safety_yellow | 315 | 1.261 |

## seam (info, 3)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 2.05, 0.14, 0.62 | island/concrete + island/steel_galv | 22.93 | 164 | 90 |
| 1.93, 0.16, 0.62 | island/concrete + island/safety_yellow | 3.23 | 44 | 90 |
| -1.98, 0.16, -0.61 | island/concrete + island/safety_yellow | 3.23 | 40 | 90 |


Nodes: island. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
