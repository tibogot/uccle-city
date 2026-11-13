# Mesh audit: stibstops.glb

2,008 triangles, 1,040 welded vertices, 0 open edges, 0 rays, 180 ms.

**0 blocking**, 236 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 12 |
| sliver | warn | 224 |
| seam | info | 19 |
| backtoback | info | 42 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.04, 1.49, -0.14 | pole/pole_grey + pole/rubber_black | 2 | 909.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.11, 1.60, -0.14 | pole/pole_grey + pole/rubber_black | 2 | 8.9 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.11, 1.24, -0.14 | pole/pole_grey + pole/rubber_black | 2 | 8.9 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.04, 1.35, -0.14 | pole/pole_grey + pole/rubber_black | 2 | 909.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.04, 1.49, -0.14 | pole/white_panel + pole/rubber_black | 2 | 783.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.10, 1.25, -0.14 | pole/white_panel + pole/rubber_black | 2 | 6.8 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.10, 1.59, -0.14 | pole/white_panel + pole/rubber_black | 2 | 6.8 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.04, 1.35, -0.14 | pole/white_panel + pole/rubber_black | 2 | 783.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.04, 1.49, -0.14 | pole/white_panel + pole/rubber_black | 2 | 783.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.10, 1.25, -0.14 | pole/white_panel + pole/rubber_black | 2 | 6.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.10, 1.59, -0.14 | pole/white_panel + pole/rubber_black | 2 | 6.8 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.04, 1.35, -0.14 | pole/white_panel + pole/rubber_black | 2 | 783.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## sliver (warn, 224)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 1.61, -0.04 | pole/pole_grey | 267 | 3.17 |
| 0.01, 0.56, -0.04 | pole/pole_grey | 267 | 3.17 |
| 0.01, 1.61, -0.03 | pole/pole_grey | 267 | 3.17 |
| 0.02, 0.56, -0.03 | pole/pole_grey | 267 | 3.17 |
| 0.03, 1.61, -0.03 | pole/pole_grey | 267 | 3.17 |
| 0.03, 0.56, -0.03 | pole/pole_grey | 267 | 3.17 |
| 0.03, 1.61, -0.02 | pole/pole_grey | 267 | 3.17 |
| 0.03, 0.56, -0.01 | pole/pole_grey | 267 | 3.17 |
| 0.04, 1.61, -0.01 | pole/pole_grey | 267 | 3.17 |
| 0.04, 0.56, -0.00 | pole/pole_grey | 267 | 3.17 |
| 0.04, 1.61, 0.00 | pole/pole_grey | 267 | 3.17 |
| 0.04, 0.56, 0.01 | pole/pole_grey | 267 | 3.17 |
| 0.03, 1.61, 0.01 | pole/pole_grey | 267 | 3.17 |
| 0.03, 0.56, 0.02 | pole/pole_grey | 267 | 3.17 |
| 0.03, 1.61, 0.03 | pole/pole_grey | 267 | 3.17 |
| 0.03, 0.56, 0.03 | pole/pole_grey | 267 | 3.17 |
| 0.02, 1.61, 0.03 | pole/pole_grey | 267 | 3.17 |
| 0.01, 0.56, 0.03 | pole/pole_grey | 267 | 3.17 |
| 0.01, 1.61, 0.04 | pole/pole_grey | 267 | 3.17 |
| 0.00, 0.56, 0.04 | pole/pole_grey | 267 | 3.17 |
| -0.00, 1.61, 0.04 | pole/pole_grey | 267 | 3.17 |
| -0.01, 0.56, 0.04 | pole/pole_grey | 267 | 3.17 |
| -0.01, 1.61, 0.03 | pole/pole_grey | 267 | 3.17 |
| -0.02, 0.56, 0.03 | pole/pole_grey | 267 | 3.17 |
| -0.03, 1.61, 0.03 | pole/pole_grey | 267 | 3.17 |
| -0.03, 0.56, 0.03 | pole/pole_grey | 267 | 3.17 |
| -0.03, 1.61, 0.02 | pole/pole_grey | 267 | 3.17 |
| -0.03, 0.56, 0.01 | pole/pole_grey | 267 | 3.17 |
| -0.04, 1.61, 0.01 | pole/pole_grey | 267 | 3.17 |
| -0.04, 0.56, 0.00 | pole/pole_grey | 267 | 3.17 |
| -0.04, 1.61, -0.00 | pole/pole_grey | 267 | 3.17 |
| -0.04, 0.56, -0.01 | pole/pole_grey | 267 | 3.17 |
| -0.03, 1.61, -0.01 | pole/pole_grey | 267 | 3.17 |
| -0.03, 0.56, -0.02 | pole/pole_grey | 267 | 3.17 |
| -0.03, 1.61, -0.03 | pole/pole_grey | 267 | 3.17 |
| -0.03, 0.56, -0.03 | pole/pole_grey | 267 | 3.17 |
| -0.02, 1.61, -0.03 | pole/pole_grey | 267 | 3.17 |
| -0.01, 0.56, -0.03 | pole/pole_grey | 267 | 3.17 |
| -0.01, 1.61, -0.04 | pole/pole_grey | 267 | 3.17 |
| -0.00, 0.56, -0.04 | pole/pole_grey | 267 | 3.17 |

(184 more in the JSON)

## seam (info, 19)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 1.18, -0.04 | pole/pole_grey + pole/frame_anthracite | 0.48 | 148 | 90 |
| 0.00, 1.61, -0.04 | pole/pole_grey + pole/frame_anthracite | 0.48 | 148 | 90 |
| 0.00, 0.00, -0.04 | pole/pole_grey + pole/pole_grey | 0.48 | 108 | 90 |
| 0.01, 2.62, -0.04 | pole/pole_grey + pole/pole_grey | 0.4 | 57 | 45 |
| 0.01, 1.22, -0.04 | pole/frame_anthracite + pole/frame_anthracite | 0.15 | 42 | 48.6 |
| 0.01, 1.66, -0.04 | pole/frame_anthracite + pole/frame_anthracite | 0.15 | 42 | 48.6 |
| -0.03, 2.65, 0.02 | pole/pole_grey + pole/white_panel | 0.19 | 38 | 27 |
| 0.03, 2.65, -0.02 | pole/pole_grey + pole/white_panel | 0.19 | 36 | 27 |
| -0.03, 2.73, 0.26 | pole/pole_grey + pole/white_panel | 2.11 | 26 | 67.5 |
| -0.03, 3.39, -0.26 | pole/pole_grey + pole/stib_red | 1.37 | 26 | 67.5 |
| 0.03, 2.73, -0.26 | pole/pole_grey + pole/white_panel | 2.11 | 26 | 67.5 |
| 0.03, 3.22, -0.25 | pole/pole_grey + pole/stib_red | 1.37 | 26 | 67.5 |
| -0.02, 3.42, -0.03 | pole/pole_grey + pole/pole_grey | 0.21 | 23 | 22.5 |
| -0.17, 1.51, -0.14 | pole/pole_grey + pole/rubber_black | 1.76 | 10 | 90 |
| -0.15, 1.50, -0.14 | pole/white_panel + pole/rubber_black | 1.64 | 10 | 90 |
| 0.00, 1.21, -0.04 | pole/pole_grey + pole/frame_anthracite | 0.06 | 4 | 9 |
| 0.00, 1.65, -0.04 | pole/pole_grey + pole/frame_anthracite | 0.06 | 4 | 9 |
| -0.02, 1.64, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.13 | 4 | 22.5 |
| -0.02, 1.20, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.13 | 4 | 22.5 |

## backtoback (info, 42)

| at | parts | area |
|---|---|---|
| -0.00, 3.42, -0.03 | pole/pole_grey + pole/pole_grey | 0.0001 |
| -0.01, 3.42, -0.01 | pole/pole_grey + pole/pole_grey | 0.00072 |
| -0.01, 3.42, 0.02 | pole/pole_grey + pole/pole_grey | 0.00041 |
| 0.01, 3.42, -0.03 | pole/pole_grey + pole/pole_grey | 0.0001 |
| 0.01, 3.42, -0.02 | pole/pole_grey + pole/pole_grey | 0.00037 |
| 0.01, 3.42, 0.00 | pole/pole_grey + pole/pole_grey | 0.00042 |
| 0.01, 3.42, 0.03 | pole/pole_grey + pole/pole_grey | 0.00012 |
| 0.01, 3.42, 0.02 | pole/pole_grey + pole/pole_grey | 0.0003 |
| -0.01, 1.65, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.00051 |
| 0.01, 1.64, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.00051 |
| -0.01, 1.21, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.00051 |
| 0.01, 1.20, -0.07 | pole/pole_grey + pole/frame_anthracite | 0.00051 |
| 0.03, 3.30, -0.04 | pole/stib_red + pole/white_panel | 0.00027 |
| 0.03, 3.32, -0.00 | pole/stib_red + pole/white_panel | 0.00218 |
| 0.03, 3.33, 0.04 | pole/stib_red + pole/white_panel | 0.00017 |
| 0.03, 3.30, -0.05 | pole/stib_red + pole/white_panel | 0.00013 |
| 0.03, 3.34, -0.04 | pole/stib_red + pole/white_panel | 0.0002 |
| 0.03, 3.34, -0.01 | pole/stib_red + pole/white_panel | 0.00131 |
| 0.03, 3.33, 0.04 | pole/stib_red + pole/white_panel | 0.00008 |
| 0.03, 3.35, 0.01 | pole/stib_red + pole/white_panel | 0.0002 |
| 0.03, 3.26, -0.01 | pole/stib_red + pole/white_panel | 0.0002 |
| 0.03, 3.28, -0.03 | pole/stib_red + pole/white_panel | 0.00104 |
| 0.03, 3.29, 0.01 | pole/stib_red + pole/white_panel | 0.00175 |
| 0.03, 3.27, 0.04 | pole/stib_red + pole/white_panel | 0.0002 |
| 0.03, 3.29, 0.04 | pole/stib_red + pole/white_panel | 0.00114 |
| 0.03, 3.28, -0.04 | pole/stib_red + pole/white_panel | 0.00008 |
| 0.03, 3.31, 0.05 | pole/stib_red + pole/white_panel | 0.00013 |
| -0.03, 3.33, -0.04 | pole/stib_red + pole/white_panel | 0.00008 |
| -0.03, 3.35, -0.01 | pole/stib_red + pole/white_panel | 0.0002 |
| -0.03, 3.33, -0.03 | pole/stib_red + pole/white_panel | 0.00104 |
| -0.03, 3.32, 0.01 | pole/stib_red + pole/white_panel | 0.00175 |
| -0.03, 3.34, 0.04 | pole/stib_red + pole/white_panel | 0.0002 |
| -0.03, 3.30, 0.05 | pole/stib_red + pole/white_panel | 0.00013 |
| -0.03, 3.31, 0.04 | pole/stib_red + pole/white_panel | 0.00114 |
| -0.03, 3.27, -0.04 | pole/stib_red + pole/white_panel | 0.0002 |
| -0.03, 3.27, -0.01 | pole/stib_red + pole/white_panel | 0.00131 |
| -0.03, 3.26, 0.01 | pole/stib_red + pole/white_panel | 0.0002 |
| -0.03, 3.31, -0.05 | pole/stib_red + pole/white_panel | 0.00013 |
| -0.03, 3.31, -0.04 | pole/stib_red + pole/white_panel | 0.00027 |
| -0.03, 3.29, -0.00 | pole/stib_red + pole/white_panel | 0.00218 |

(2 more in the JSON)


Nodes: pole, pole__glass. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
