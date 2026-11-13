# Mesh audit: furniture2.glb

3,780 triangles, 3,720 welded vertices, 2,756 open edges, 87,744 rays, 404 ms.

**0 blocking**, 254 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| sliver | warn | 252 |
| seam | info | 17 |
| backtoback | info | 34 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.22, 0.81, -1.06 | bikebox/galvanised + bikebox/galvanised | 1 | 1.1 | 0 | 60 | 0.46 | false | 0 + 0 + 1 |
| -0.22, 0.81, -1.06 | bikebox/galvanised + bikebox/galvanised | 1 | 1.2 | 0 | 60 | 0.46 | false | 0 + 0 + 1 |

## sliver (warn, 252)

| at | part | aspect | longest |
|---|---|---|---|
| -0.32, 1.02, -1.05 | bikebox/box_shell | 48 | 1.94 |
| 0.32, 1.00, -1.05 | bikebox/box_shell | 48 | 1.94 |
| -0.32, 1.06, -1.05 | bikebox/box_shell | 47 | 1.94 |
| 0.32, 1.04, -1.05 | bikebox/box_shell | 47 | 1.94 |
| -0.32, 1.09, -1.03 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.08, -1.04 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.14, -1.02 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.12, -1.02 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.17, -1.00 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.16, -1.01 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.21, -0.98 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.19, -0.98 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.23, -0.95 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.23, -0.96 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.26, -0.93 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.25, -0.93 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.28, -0.89 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.28, -0.91 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.31, -0.86 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.30, -0.87 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.32, -0.82 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.32, -0.83 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.34, -0.78 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.33, -0.80 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.34, -0.74 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.34, -0.76 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.35, -0.70 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.35, -0.72 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.35, 0.72 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.35, 0.70 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.34, 0.76 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.34, 0.74 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.33, 0.80 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.34, 0.78 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.32, 0.83 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.32, 0.82 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.30, 0.87 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.31, 0.86 | bikebox/box_shell | 45 | 1.94 |
| -0.32, 1.28, 0.91 | bikebox/box_shell | 45 | 1.94 |
| 0.32, 1.28, 0.89 | bikebox/box_shell | 45 | 1.94 |

(212 more in the JSON)

## seam (info, 17)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.97, 0.11, -1.05 | bikebox/box_shell + bikebox/alu_panel | 4.45 | 144 | 90 |
| 0.97, 0.10, -1.05 | bikebox/box_shell + bikebox/alu_panel | 4.45 | 138 | 90 |
| -0.97, 0.16, -1.02 | bikebox/rubber_black + bikebox/alu_panel | 4.22 | 114 | 90 |
| 0.97, 0.14, -1.02 | bikebox/rubber_black + bikebox/alu_panel | 4.22 | 104 | 90 |
| 0.21, 0.80, -1.08 | bikebox/galvanised + bikebox/galvanised | 0.12 | 44 | 22.5 |
| -0.23, 0.80, -1.09 | bikebox/galvanised + bikebox/galvanised | 0.12 | 41 | 22.5 |
| 0.48, 0.84, -1.06 | bikebox/box_shell + bikebox/rubber_black | 0.39 | 26 | 27.6 |
| -0.62, 0.62, -1.06 | bikebox/box_shell + bikebox/white_plate | 0.79 | 24 | 67.5 |
| -0.83, 0.04, -0.90 | bikebox/galvanised + bikebox/galvanised | 0.18 | 18 | 22.5 |
| 0.87, 0.04, 0.90 | bikebox/galvanised + bikebox/galvanised | 0.18 | 18 | 22.5 |
| -0.23, 0.78, -1.06 | bikebox/box_shell + bikebox/galvanised | 0.12 | 16 | 22.5 |
| 0.21, 0.78, -1.06 | bikebox/box_shell + bikebox/galvanised | 0.12 | 16 | 22.5 |
| 0.87, 0.04, -0.90 | bikebox/galvanised + bikebox/galvanised | 0.18 | 16 | 22.5 |
| -0.83, 0.04, 0.90 | bikebox/galvanised + bikebox/galvanised | 0.18 | 16 | 22.5 |
| -0.86, 0.93, -1.05 | bikebox/box_shell + bikebox/rubber_black | 3.46 | 10 | 90 |
| -0.86, 0.54, -1.05 | bikebox/box_shell + bikebox/box_shell | 4.95 | 6 | 22.5 |
| -0.24, 0.81, -1.06 | bikebox/box_shell + bikebox/galvanised | 1 | 4 | 22.5 |

## backtoback (info, 34)

| at | parts | area |
|---|---|---|
| -0.02, 0.79, -1.05 | bikebox/box_shell + bikebox/box_shell | 0.31543 |
| -0.64, 0.44, -1.05 | bikebox/box_shell + bikebox/box_shell | 0.32863 |
| 0.63, 0.63, -1.05 | bikebox/box_shell + bikebox/box_shell | 0.33685 |
| 0.01, 0.28, -1.05 | bikebox/box_shell + bikebox/box_shell | 0.32364 |
| 0.08, 0.82, -1.06 | bikebox/box_shell + bikebox/galvanised | 0.00339 |
| -0.08, 0.81, -1.06 | bikebox/box_shell + bikebox/galvanised | 0.00339 |
| -0.85, 0.04, -0.94 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.83, 0.04, -0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.85, 0.04, -0.93 | bikebox/galvanised + bikebox/galvanised | 0.0004 |
| -0.83, 0.04, -0.92 | bikebox/galvanised + bikebox/galvanised | 0.00044 |
| 0.85, 0.04, -0.94 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.83, 0.04, -0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.85, 0.04, -0.90 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.87, 0.04, -0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.84, 0.04, -0.93 | bikebox/galvanised + bikebox/galvanised | 0.00083 |
| 0.86, 0.04, -0.91 | bikebox/galvanised + bikebox/galvanised | 0.00083 |
| 0.85, 0.04, 0.90 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.87, 0.04, 0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.85, 0.04, 0.91 | bikebox/galvanised + bikebox/galvanised | 0.0004 |
| 0.86, 0.04, 0.93 | bikebox/galvanised + bikebox/galvanised | 0.00043 |
| -0.87, 0.04, -0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.85, 0.04, -0.90 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.86, 0.04, -0.93 | bikebox/galvanised + bikebox/galvanised | 0.00043 |
| -0.85, 0.04, -0.91 | bikebox/galvanised + bikebox/galvanised | 0.0004 |
| -0.85, 0.04, 0.90 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.87, 0.04, 0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.83, 0.04, 0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| -0.86, 0.04, 0.91 | bikebox/galvanised + bikebox/galvanised | 0.00083 |
| -0.84, 0.04, 0.93 | bikebox/galvanised + bikebox/galvanised | 0.00083 |
| -0.85, 0.04, 0.94 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.83, 0.04, 0.92 | bikebox/galvanised + bikebox/galvanised | 0.00017 |
| 0.83, 0.04, 0.92 | bikebox/galvanised + bikebox/galvanised | 0.00044 |
| 0.85, 0.04, 0.93 | bikebox/galvanised + bikebox/galvanised | 0.0004 |
| 0.85, 0.04, 0.94 | bikebox/galvanised + bikebox/galvanised | 0.00017 |


Nodes: bikebox. Distances: {"bikebox":60}. Quantum 0.000 mm. Offset 0,0,0.
