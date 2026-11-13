# Mesh audit: stibstops.glb

1,412 triangles, 752 welded vertices, 40 open edges, 5,496 rays, 200 ms.

**0 blocking**, 336 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 324 |
| nonmanifold | warn | 8 |
| tjunction | warn | 4 |
| seam | info | 43 |
| backtoback | info | 84 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 324)

| at | part | aspect | longest |
|---|---|---|---|
| -0.06, 0.42, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 0.42, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 0.43, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 0.43, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 1.86, 0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.14, 0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.86, 0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.14, 0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 2.58, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 2.58, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 2.57, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 2.57, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| -0.06, 1.14, -0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.86, -0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.14, -0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| -0.06, 1.86, -0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.14, -0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.86, -0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.14, -0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.86, -0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 0.42, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 0.42, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 0.43, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 0.43, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 2.58, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 2.58, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 2.57, 0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 2.57, -0.23 | adpanel/frame_anthracite | 150 | 1.376 |
| 0.06, 1.14, 0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.86, 0.70 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.14, 0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.06, 1.86, 0.69 | adpanel/frame_anthracite | 233 | 2.136 |
| 0.07, 1.86, 0.70 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.14, 0.70 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.86, 0.70 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.14, 0.69 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.14, 0.62 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.86, 0.62 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.14, 0.62 | adpanel/frame_anthracite | 468 | 2.148 |
| 0.07, 1.86, 0.62 | adpanel/frame_anthracite | 468 | 2.148 |

(284 more in the JSON)

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| 0.08, 2.50, 0.60 | adpanel/rubber_black | 4 |
| 0.08, 0.51, 0.60 | adpanel/rubber_black | 4 |
| 0.08, 2.50, -0.60 | adpanel/rubber_black | 4 |
| 0.08, 0.51, -0.60 | adpanel/rubber_black | 4 |
| -0.08, 2.50, 0.60 | adpanel/rubber_black | 4 |
| -0.08, 0.51, 0.60 | adpanel/rubber_black | 4 |
| -0.08, 2.50, -0.60 | adpanel/rubber_black | 4 |
| -0.08, 0.51, -0.60 | adpanel/rubber_black | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| 0.07, 2.45, -0.57 | adpanel/light_strip | 1.206 |
| 0.07, 0.55, -0.57 | adpanel/light_strip | 1.206 |
| -0.07, 2.45, -0.57 | adpanel/light_strip | 1.206 |
| -0.07, 0.55, -0.57 | adpanel/light_strip | 1.206 |

## seam (info, 43)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.05, 0.37, 0.20 | adpanel/frame_anthracite + adpanel/frame_anthracite | 1.02 | 26 | 90 |
| -0.05, 0.42, -0.04 | adpanel/frame_anthracite + adpanel/frame_anthracite | 1.37 | 8 | 22.5 |
| 0.08, 1.50, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 7.97 | 8 | 22.5 |
| 0.08, 1.50, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 7.97 | 8 | 22.5 |
| 0.08, 2.50, 0.00 | adpanel/frame_anthracite + adpanel/rubber_black | 4.84 | 8 | 22.5 |
| 0.08, 2.50, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 8 | 22.5 |
| 0.08, 0.51, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 8 | 22.5 |
| 0.08, 0.51, 0.00 | adpanel/frame_anthracite + adpanel/rubber_black | 4.84 | 8 | 22.5 |
| -0.08, 1.50, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 7.97 | 8 | 22.5 |
| -0.08, 1.50, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 7.97 | 8 | 22.5 |
| -0.08, 2.50, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 8 | 22.5 |
| -0.08, 2.50, 0.00 | adpanel/frame_anthracite + adpanel/rubber_black | 4.84 | 8 | 22.5 |
| -0.08, 0.51, 0.00 | adpanel/frame_anthracite + adpanel/rubber_black | 4.84 | 8 | 22.5 |
| -0.08, 0.51, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 8 | 22.5 |
| -0.07, 0.43, -0.66 | adpanel/frame_anthracite + adpanel/frame_anthracite | 4.41 | 7 | 22.5 |
| -0.07, 0.43, 0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 4.41 | 7 | 22.5 |
| 0.07, 2.48, -0.69 | adpanel/frame_anthracite + adpanel/frame_anthracite | 4.41 | 7 | 22.5 |
| 0.07, 0.43, 0.66 | adpanel/frame_anthracite + adpanel/frame_anthracite | 4.41 | 7 | 22.5 |
| 0.07, 2.58, 0.63 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.16 | 7 | 22.5 |
| 0.07, 2.50, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 7 | 22.5 |
| 0.07, 0.42, -0.28 | adpanel/frame_anthracite + adpanel/frame_anthracite | 1.17 | 7 | 22.5 |
| 0.08, 0.51, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 7 | 22.5 |
| -0.07, 2.58, -0.66 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.16 | 7 | 22.5 |
| -0.08, 2.50, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 7 | 22.5 |
| -0.08, 0.51, -0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.03 | 7 | 22.5 |
| -0.07, 0.42, -0.01 | adpanel/frame_anthracite + adpanel/frame_anthracite | 1.17 | 7 | 22.5 |
| -0.05, 2.58, -0.58 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.96 | 6 | 22.5 |
| -0.07, 0.43, -0.56 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.57 | 5 | 22.5 |
| -0.07, 2.57, -0.05 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.57 | 5 | 22.5 |
| 0.07, 0.43, 0.56 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.57 | 5 | 22.5 |
| 0.07, 2.57, 0.05 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.57 | 5 | 22.5 |
| 0.07, 2.58, -0.66 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.16 | 5 | 22.5 |
| 0.07, 2.58, 0.00 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.45 | 5 | 22.5 |
| -0.07, 2.58, 0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.16 | 5 | 22.5 |
| -0.07, 2.58, -0.61 | adpanel/frame_anthracite + adpanel/frame_anthracite | 2.45 | 5 | 22.5 |
| 0.07, 0.52, 0.60 | adpanel/rubber_black + adpanel/rubber_black | 0.01 | 2 | 90 |
| 0.08, 2.48, 0.60 | adpanel/rubber_black + adpanel/rubber_black | 0.01 | 2 | 90 |
| 0.08, 0.52, -0.60 | adpanel/rubber_black + adpanel/rubber_black | 0.01 | 2 | 90 |
| 0.08, 2.48, -0.60 | adpanel/rubber_black + adpanel/rubber_black | 0.01 | 2 | 90 |
| -0.08, 0.52, 0.60 | adpanel/rubber_black + adpanel/rubber_black | 0.01 | 2 | 90 |

(3 more in the JSON)

## backtoback (info, 84)

| at | parts | area |
|---|---|---|
| 0.02, 0.42, -0.20 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.01318 |
| 0.03, 0.42, 0.09 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.01756 |
| -0.03, 0.42, -0.09 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.01756 |
| -0.02, 0.42, 0.20 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.01318 |
| -0.07, 2.54, -0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00329 |
| -0.07, 2.52, -0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00019 |
| -0.07, 1.72, 0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.07727 |
| -0.07, 1.12, 0.67 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.06235 |
| -0.07, 2.55, -0.24 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03739 |
| -0.07, 2.54, 0.28 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04408 |
| -0.07, 1.88, -0.67 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.06235 |
| -0.07, 1.28, -0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.07727 |
| -0.07, 0.47, -0.28 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04408 |
| -0.07, 0.45, 0.24 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03739 |
| -0.07, 0.48, 0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00019 |
| -0.07, 0.47, 0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00329 |
| -0.01, 2.58, -0.46 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04222 |
| -0.04, 2.58, 0.07 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03071 |
| 0.04, 2.58, -0.07 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03071 |
| 0.01, 2.58, 0.46 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04222 |
| 0.07, 1.72, -0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.07727 |
| 0.07, 1.12, -0.67 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.06235 |
| 0.07, 2.54, 0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00329 |
| 0.07, 2.52, 0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00019 |
| 0.07, 2.55, 0.24 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03739 |
| 0.07, 2.54, -0.28 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04408 |
| 0.07, 0.48, -0.62 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00019 |
| 0.07, 0.47, -0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00329 |
| 0.07, 0.47, 0.28 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.04408 |
| 0.07, 0.45, -0.24 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.03739 |
| 0.07, 1.88, 0.67 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.06235 |
| 0.07, 1.28, 0.65 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.07727 |
| 0.07, 2.58, 0.63 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00018 |
| 0.07, 2.58, 0.67 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00011 |
| 0.08, 2.58, 0.66 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00011 |
| 0.07, 2.58, 0.68 | adpanel/frame_anthracite + adpanel/frame_anthracite | 0.00011 |
| 0.08, 2.21, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.00242 |
| 0.07, 1.70, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.00196 |
| 0.08, 1.79, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.00355 |
| 0.07, 0.91, 0.61 | adpanel/frame_anthracite + adpanel/rubber_black | 0.00401 |

(44 more in the JSON)


Nodes: adpanel, adpanel__poster. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
