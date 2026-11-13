# Mesh audit: stibstops.glb

4,004 triangles, 2,108 welded vertices, 40 open edges, 5,196 rays, 361 ms.

**0 blocking**, 774 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 16 |
| sliver | warn | 744 |
| nonmanifold | warn | 10 |
| tjunction | warn | 4 |
| seam | info | 55 |
| backtoback | info | 130 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.45, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.38, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.29, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.21, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.11, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -1.18, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.27, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.35, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 1.31, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 1.38, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.47, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.55, 0.15, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.65, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.58, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 1.49, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 12.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 1.41, 2.22, -0.62 | shelter/rubber_black + shelter__glass/glass | 2 | 71.6 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |

## sliver (warn, 744)

| at | part | aspect | longest |
|---|---|---|---|
| -1.69, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 0.44, -0.59 | shelter/frame_anthracite | 455 | 2.784 |
| -1.69, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 1.36, -0.65 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 0.44, -0.65 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.63, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| -1.63, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| -1.62, 1.36, -0.59 | shelter/frame_anthracite | 455 | 2.784 |
| -1.70, 1.36, -0.61 | shelter/frame_anthracite | 44 | 2.785 |
| -1.70, 0.44, -0.63 | shelter/frame_anthracite | 44 | 2.785 |
| -1.65, 1.36, -0.58 | shelter/frame_anthracite | 44 | 2.785 |
| -1.67, 0.44, -0.58 | shelter/frame_anthracite | 44 | 2.785 |
| -1.67, 1.36, -0.66 | shelter/frame_anthracite | 44 | 2.785 |
| -1.65, 0.44, -0.66 | shelter/frame_anthracite | 44 | 2.785 |
| -1.62, 1.36, -0.63 | shelter/frame_anthracite | 44 | 2.785 |
| -1.62, 0.44, -0.61 | shelter/frame_anthracite | 44 | 2.785 |
| 0.07, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 0.44, -0.59 | shelter/frame_anthracite | 455 | 2.784 |
| 0.07, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.06, 1.36, -0.65 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 0.44, -0.65 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 0.44, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.13, 1.36, -0.66 | shelter/frame_anthracite | 455 | 2.784 |
| 0.13, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 1.36, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 0.44, -0.58 | shelter/frame_anthracite | 455 | 2.784 |
| 0.14, 1.36, -0.59 | shelter/frame_anthracite | 455 | 2.784 |

(704 more in the JSON)

## nonmanifold (warn, 10)

| at | part | uses |
|---|---|---|
| 1.86, 0.10, 0.05 | shelter/frame_anthracite | 4 |
| 1.86, 2.27, 0.05 | shelter/frame_anthracite | 4 |
| -1.80, 2.21, 0.59 | shelter/rubber_black | 4 |
| -1.80, 0.23, 0.59 | shelter/rubber_black | 4 |
| -1.80, 2.21, -0.57 | shelter/rubber_black | 4 |
| -1.80, 0.23, -0.57 | shelter/rubber_black | 4 |
| -1.94, 2.21, 0.59 | shelter/rubber_black | 4 |
| -1.94, 0.23, 0.59 | shelter/rubber_black | 4 |
| -1.94, 2.21, -0.57 | shelter/rubber_black | 4 |
| -1.94, 0.23, -0.57 | shelter/rubber_black | 4 |

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| -1.81, 2.17, -0.54 | shelter/light_strip | 1.166 |
| -1.81, 0.27, -0.54 | shelter/light_strip | 1.166 |
| -1.93, 2.17, -0.54 | shelter/light_strip | 1.166 |
| -1.93, 0.27, -0.54 | shelter/light_strip | 1.166 |

## seam (info, 55)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.21, 0.78, -0.55 | shelter/frame_anthracite + shelter/steel_brushed | 0.26 | 50 | 90 |
| -0.31, 0.78, -0.55 | shelter/frame_anthracite + shelter/steel_brushed | 0.26 | 50 | 90 |
| -1.62, 0.16, -0.63 | shelter/rubber_black + shelter__glass/glass | 3.42 | 20 | 90 |
| -1.62, 2.22, -0.63 | shelter/rubber_black + shelter__glass/glass | 3.42 | 20 | 90 |
| 0.14, 0.16, -0.63 | shelter/rubber_black + shelter__glass/glass | 3.42 | 20 | 90 |
| 0.14, 2.22, -0.63 | shelter/rubber_black + shelter__glass/glass | 3.42 | 20 | 90 |
| 1.85, 2.30, 0.71 | shelter/frame_anthracite + shelter/rubber_black | 7.74 | 10 | 90 |
| 0.45, 2.30, -0.13 | shelter/frame_anthracite + shelter/light_strip | 6.56 | 10 | 90 |
| 0.40, 0.40, -0.46 | shelter/frame_anthracite + shelter/frame_anthracite | 0.52 | 10 | 22.5 |
| 1.53, 0.40, -0.46 | shelter/frame_anthracite + shelter/frame_anthracite | 0.52 | 10 | 22.5 |
| -1.61, 0.15, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 3.39 | 8 | 22.5 |
| -1.61, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 3.39 | 8 | 22.5 |
| 0.14, 0.15, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 3.39 | 8 | 22.5 |
| 0.14, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 3.39 | 8 | 22.5 |
| -1.80, 1.22, 0.60 | shelter/frame_anthracite + shelter/rubber_black | 7.96 | 8 | 22.5 |
| -1.80, 1.22, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 7.96 | 8 | 22.5 |
| -1.80, 2.21, 0.01 | shelter/frame_anthracite + shelter/rubber_black | 4.68 | 8 | 22.5 |
| -1.80, 2.21, 0.59 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 8 | 22.5 |
| -1.80, 0.23, 0.01 | shelter/frame_anthracite + shelter/rubber_black | 4.68 | 8 | 22.5 |
| -1.94, 1.22, 0.60 | shelter/frame_anthracite + shelter/rubber_black | 7.96 | 8 | 22.5 |
| -1.94, 1.22, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 7.96 | 8 | 22.5 |
| -1.94, 2.21, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 8 | 22.5 |
| -1.94, 2.21, 0.01 | shelter/frame_anthracite + shelter/rubber_black | 4.68 | 8 | 22.5 |
| -1.94, 0.23, 0.01 | shelter/frame_anthracite + shelter/rubber_black | 4.68 | 8 | 22.5 |
| 0.40, 0.45, -0.54 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| 0.40, 0.45, -0.35 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| 0.40, 0.45, -0.44 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| 1.53, 0.45, -0.51 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| 1.53, 0.45, -0.32 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| 1.53, 0.45, -0.41 | shelter/frame_anthracite + shelter/steel_brushed | 0.24 | 8 | 22.5 |
| -1.80, 2.21, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 7 | 22.5 |
| -1.80, 0.23, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 7 | 22.5 |
| -1.80, 0.23, 0.59 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 7 | 22.5 |
| -1.94, 2.21, 0.59 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 7 | 22.5 |
| -1.94, 0.23, 0.59 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 7 | 22.5 |
| 0.40, 0.45, -0.25 | shelter/frame_anthracite + shelter/steel_brushed | 0.2 | 7 | 22.5 |
| -1.69, 2.30, -0.64 | shelter/frame_anthracite + shelter/frame_anthracite | 0.26 | 6 | 22.5 |
| -1.86, 0.14, -0.43 | shelter/frame_anthracite + shelter/frame_anthracite | 1.95 | 6 | 22.5 |
| -1.94, 0.23, -0.58 | shelter/frame_anthracite + shelter/rubber_black | 0.03 | 6 | 22.5 |
| 1.53, 0.45, -0.23 | shelter/frame_anthracite + shelter/steel_brushed | 0.2 | 5 | 22.5 |

(15 more in the JSON)

## backtoback (info, 130)

| at | parts | area |
|---|---|---|
| -1.67, 2.30, -0.64 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00157 |
| -1.68, 2.30, -0.61 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00048 |
| -1.64, 2.30, -0.62 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00098 |
| -1.65, 2.30, -0.60 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00106 |
| 0.09, 2.30, -0.63 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| 0.11, 2.30, -0.61 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| 1.85, 2.30, -0.63 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| 1.87, 2.30, -0.61 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| 1.85, 2.30, 0.54 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| 1.87, 2.30, 0.56 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00205 |
| -1.08, 0.15, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| -1.32, 0.15, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| -0.24, 0.15, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| -0.48, 0.15, -0.61 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| -0.48, 2.22, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| -0.24, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| -1.32, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| -1.08, 2.22, -0.61 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| 0.68, 0.15, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| 0.44, 0.15, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| 1.52, 0.15, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| 1.28, 0.15, -0.61 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| 1.28, 2.22, -0.63 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| 1.52, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| 0.44, 2.22, -0.62 | shelter/frame_anthracite + shelter/rubber_black | 0.01215 |
| 0.68, 2.22, -0.61 | shelter/frame_anthracite + shelter/rubber_black | 0.00789 |
| 1.86, 0.13, 0.05 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00088 |
| 1.86, 0.11, 0.05 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00087 |
| 1.86, 2.26, 0.05 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00087 |
| 1.85, 2.24, 0.05 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00088 |
| -1.87, 0.14, -0.29 | shelter/frame_anthracite + shelter/frame_anthracite | 0.01685 |
| -1.84, 0.14, 0.12 | shelter/frame_anthracite + shelter/frame_anthracite | 0.02222 |
| -1.90, 0.14, -0.10 | shelter/frame_anthracite + shelter/frame_anthracite | 0.02222 |
| -1.87, 0.14, 0.31 | shelter/frame_anthracite + shelter/frame_anthracite | 0.01685 |
| -1.93, 2.25, -0.61 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00338 |
| -1.93, 2.23, -0.59 | shelter/frame_anthracite + shelter/frame_anthracite | 0.00021 |
| -1.93, 1.44, 0.64 | shelter/frame_anthracite + shelter/frame_anthracite | 0.07719 |
| -1.93, 0.84, 0.66 | shelter/frame_anthracite + shelter/frame_anthracite | 0.0622 |
| -1.93, 2.26, -0.22 | shelter/frame_anthracite + shelter/frame_anthracite | 0.03616 |
| -1.93, 2.25, 0.28 | shelter/frame_anthracite + shelter/frame_anthracite | 0.04263 |

(90 more in the JSON)


Nodes: shelter, shelter__poster, shelter__glass. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
