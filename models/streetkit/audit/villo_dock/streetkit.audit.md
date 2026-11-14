# Mesh audit: streetkit villo_dock

902 triangles, 484 welded vertices, 28 open edges, 512 rays, 37 ms.

**0 blocking**, 64 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 64 |
| seam | info | 8 |
| backtoback | info | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 64)

| at | part | aspect | longest |
|---|---|---|---|
| -0.42, 0.03, -0.06 | villo_dock/galvanised | 145 | 0.334 |
| -0.42, 0.03, 0.06 | villo_dock/galvanised | 145 | 0.334 |
| -0.42, 0.03, -0.06 | villo_dock/galvanised | 145 | 0.334 |
| -0.42, 0.03, 0.06 | villo_dock/galvanised | 145 | 0.334 |
| 0.14, 0.03, -0.17 | villo_dock/galvanised | 368 | 0.844 |
| -0.14, 0.03, -0.17 | villo_dock/galvanised | 368 | 0.844 |
| 0.14, 0.03, -0.17 | villo_dock/galvanised | 368 | 0.844 |
| -0.14, 0.03, -0.17 | villo_dock/galvanised | 368 | 0.844 |
| 0.42, 0.03, 0.06 | villo_dock/galvanised | 145 | 0.334 |
| 0.42, 0.03, -0.06 | villo_dock/galvanised | 145 | 0.334 |
| 0.42, 0.03, 0.06 | villo_dock/galvanised | 145 | 0.334 |
| 0.42, 0.03, -0.06 | villo_dock/galvanised | 145 | 0.334 |
| -0.14, 0.03, 0.17 | villo_dock/galvanised | 368 | 0.844 |
| 0.14, 0.03, 0.17 | villo_dock/galvanised | 368 | 0.844 |
| -0.14, 0.03, 0.17 | villo_dock/galvanised | 368 | 0.844 |
| 0.14, 0.03, 0.17 | villo_dock/galvanised | 368 | 0.844 |
| -0.14, 0.03, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.03, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.03, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.03, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.04, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.04, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.04, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.04, 0.15 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.03, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.03, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.03, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.03, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.04, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.04, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| -0.14, 0.04, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.04, 0.17 | villo_dock/galvanised | 553 | 0.846 |
| 0.14, 0.03, 0.16 | villo_dock/galvanised | 71 | 0.846 |
| -0.14, 0.03, 0.16 | villo_dock/galvanised | 71 | 0.846 |
| 0.14, 0.04, 0.17 | villo_dock/galvanised | 77 | 0.846 |
| -0.14, 0.04, 0.17 | villo_dock/galvanised | 77 | 0.846 |
| -0.14, 0.04, 0.16 | villo_dock/galvanised | 71 | 0.846 |
| 0.14, 0.04, 0.16 | villo_dock/galvanised | 71 | 0.846 |
| -0.14, 0.04, 0.15 | villo_dock/galvanised | 77 | 0.846 |
| 0.14, 0.04, 0.15 | villo_dock/galvanised | 77 | 0.846 |

(24 more in the JSON)

## seam (info, 8)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.07, 0.77, -0.01 | villo_dock/villo_body + villo_dock/villo_body | 0.42 | 73 | 30.6 |
| 0.08, 0.03, -0.03 | villo_dock/galvanised + villo_dock/villo_body | 0.5 | 58 | 88.9 |
| -0.06, 0.92, -0.05 | villo_dock/villo_body + villo_dock/villo_dark | 0.49 | 30 | 49.2 |
| 0.04, 0.84, 0.15 | villo_dock/villo_body + villo_dock/villo_dark | 0.31 | 26 | 90 |
| -0.42, 0.03, -0.17 | villo_dock/galvanised + villo_dock/galvanised | 1.71 | 8 | 22.5 |
| -0.42, 0.03, 0.15 | villo_dock/galvanised + villo_dock/galvanised | 1.71 | 8 | 22.5 |
| -0.30, 0.03, -0.09 | villo_dock/galvanised + villo_dock/bolt_steel | 0.05 | 6 | 45 |
| 0.30, 0.03, -0.09 | villo_dock/galvanised + villo_dock/bolt_steel | 0.05 | 6 | 45 |

## backtoback (info, 8)

| at | parts | area |
|---|---|---|
| -0.01, 0.03, -0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.00486 |
| -0.02, 0.03, -0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.00506 |
| -0.41, 0.03, 0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.0002 |
| -0.30, 0.03, -0.10 | villo_dock/galvanised + villo_dock/bolt_steel | 0.0001 |
| 0.41, 0.03, -0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.0002 |
| 0.02, 0.03, 0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.00506 |
| 0.01, 0.03, 0.16 | villo_dock/galvanised + villo_dock/galvanised | 0.00486 |
| 0.30, 0.03, -0.10 | villo_dock/galvanised + villo_dock/bolt_steel | 0.0001 |


Nodes: villo_dock. Distances: {"villo_dock":200}. Quantum 0.000 mm. Offset 0,0,0.
