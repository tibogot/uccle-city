# Mesh audit

15,344 triangles, 8,361 welded vertices, 788 open edges, 5,760 rays, 2658 ms.

**0 blocking**, 72 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 19 |
| sliver | warn | 8 |
| nonmanifold | warn | 42 |
| tjunction | warn | 3 |
| seam | info | 251 |
| opening | info | 1 |
| backtoback | info | 39 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 19)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.06, 0.28, -0.46 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 1.89 | 0.5 | 3.3 | 12 | 0.09 | false | 1 + -0.02 + 0.05 |
| -0.05, 0.28, -0.46 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 2.19 | 0.5 | 3.9 | 12 | 0.09 | false | 1 + 0.01 + -0.07 |
| -0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 2.5 | 0.9 | 0 | 12 | 0.09 | false | -1 + 0 + 0 |
| -0.05, 0.30, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.7 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.28, -0.10 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.4 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.28, -0.10 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.5 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.29, -0.12 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.8 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.29, -0.10 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.8 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 1.7 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.05, 0.29, -0.12 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 1.8 | 0.7 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| 0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 2.5 | 0.9 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| 0.00, 0.54, 0.37 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 1.1 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| -0.01, 0.53, 0.36 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 0.7 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| 0.00, 0.53, 0.36 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 1.5 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| 0.05, 0.56, 0.38 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.6 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| 0.05, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.1 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| 0.05, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 0.5 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| -0.05, 0.56, 0.38 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.6 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| -0.05, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.6 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -0.04, 0.20, -0.23 | Body_LOD0/bmx_chain | 42 | 0.364 |
| -0.04, 0.21, -0.36 | Body_LOD0/bmx_chain | 42 | 0.364 |
| -0.04, 0.32, -0.37 | Body_LOD0/bmx_chain | 42 | 0.364 |
| -0.04, 0.35, -0.25 | Body_LOD0/bmx_chain | 42 | 0.364 |
| -0.04, 0.22, -0.36 | Body_LOD0/bmx_chain | 42 | 0.363 |
| -0.04, 0.21, -0.23 | Body_LOD0/bmx_chain | 42 | 0.363 |
| -0.04, 0.34, -0.25 | Body_LOD0/bmx_chain | 42 | 0.363 |
| -0.04, 0.31, -0.36 | Body_LOD0/bmx_chain | 42 | 0.363 |

## nonmanifold (warn, 42)

| at | part | uses |
|---|---|---|
| 0.00, 0.57, 0.38 | Body_LOD0/bmx_paint | 3 |
| 0.00, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| 0.00, 0.68, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.68, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.57, 0.36 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| -0.02, 0.56, 0.36 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.36 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| -0.02, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| -0.02, 0.68, 0.32 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.68, 0.32 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.68, 0.31 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| -0.01, 0.67, 0.31 | Body_LOD0/bmx_paint | 3 |
| -0.00, 0.56, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.00, 0.56, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.00, 0.68, 0.31 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.34 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.31 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.34 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.32 | Body_LOD0/bmx_paint | 3 |
| 0.02, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.32 | Body_LOD0/bmx_paint | 3 |
| 0.02, 0.56, 0.36 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.56, 0.36 | Body_LOD0/bmx_paint | 3 |
| 0.02, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |

(2 more in the JSON)

## tjunction (warn, 3)

| at | part | edge_m |
|---|---|---|
| 0.00, 0.57, 0.37 | Body_LOD0/bmx_chrome | 0.006 |
| -0.21, 0.97, 0.29 | Steer_LOD0/bmx_grip | 0.007 |
| -0.21, 0.96, 0.28 | Steer_LOD0/bmx_grip | 0.007 |

## seam (info, 251)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.26, 0.69 | Wheel_F_LOD0/bmx_rubber + Wheel_F_LOD0/bmx_chrome | 5.25 | 336 | 28.7 |
| -0.01, 0.26, -0.26 | Wheel_R_LOD0/bmx_rubber + Wheel_R_LOD0/bmx_chrome | 5.25 | 336 | 28.7 |
| -0.04, 0.37, -0.12 | Body_LOD0/bmx_chain + Crank_LOD0/bmx_metal | 0.69 | 310 | 14.2 |
| -0.04, 0.26, -0.46 | Cog_LOD0/bmx_black + Cog_LOD0/bmx_black | 0.21 | 152 | 90 |
| -0.05, 0.30, -0.06 | Crank_LOD0/bmx_metal + Crank_LOD0/bmx_chrome | 0.23 | 126 | 44.9 |
| -0.04, 0.23, -0.47 | Body_LOD0/bmx_chain + Cog_LOD0/bmx_black | 0.22 | 116 | 25.7 |
| -0.01, 0.58, 0.35 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.24 | 100 | 21.6 |
| 0.10, 0.89, 0.32 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_pad | 0.12 | 100 | 90 |
| 0.00, 0.29, 0.67 | Wheel_F_LOD0/bmx_chrome + Wheel_F_LOD0/bmx_spokes | 1.21 | 100 | 86.9 |
| -0.00, 0.28, 0.67 | Wheel_F_LOD0/bmx_chrome + Wheel_F_LOD0/bmx_spokes | 1.21 | 100 | 86.9 |
| 0.00, 0.29, -0.28 | Wheel_R_LOD0/bmx_chrome + Wheel_R_LOD0/bmx_spokes | 1.21 | 100 | 86.9 |
| -0.00, 0.28, -0.28 | Wheel_R_LOD0/bmx_chrome + Wheel_R_LOD0/bmx_spokes | 1.21 | 100 | 86.9 |
| -0.20, 0.95, 0.29 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_black | 0.24 | 99 | 5.5 |
| -0.00, 0.57, 0.37 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 2.2 | 89 | 7.1 |
| 0.01, 0.70, 0.31 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_chrome | 0.25 | 88 | 14 |
| -0.01, 0.65, 0.33 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.18 | 83 | 23.4 |
| 0.01, 0.56, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.27 | 82 | 9.3 |
| -0.00, 0.69, 0.33 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_metal | 0.25 | 76 | 7.1 |
| -0.05, 0.31, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 0.12 | 73 | 39 |
| -0.00, 0.56, 0.37 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_metal | 0.25 | 69 | 7.1 |
| -0.04, 0.28, -0.15 | Body_LOD0/bmx_paint + Crank_LOD0/bmx_metal | 0.17 | 68 | 23.3 |
| 0.13, 0.89, 0.33 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_chrome | 0.13 | 68 | 45.5 |
| 0.03, 0.26, 0.50 | Wheel_F_LOD0/bmx_metal + Wheel_F_LOD0/bmx_spokes | 0.15 | 66 | 88 |
| -0.03, 0.27, 0.49 | Wheel_F_LOD0/bmx_metal + Wheel_F_LOD0/bmx_spokes | 0.15 | 66 | 88 |
| 0.03, 0.26, -0.45 | Wheel_R_LOD0/bmx_metal + Wheel_R_LOD0/bmx_spokes | 0.15 | 66 | 88 |
| -0.03, 0.27, -0.46 | Wheel_R_LOD0/bmx_metal + Wheel_R_LOD0/bmx_spokes | 0.15 | 66 | 88 |
| 0.00, 0.56, 0.38 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_paint | 0.18 | 62 | 22.3 |
| 0.01, 0.66, -0.24 | Body_LOD0/bmx_chrome + Body_LOD0/bmx_chrome | 0.08 | 62 | 23.9 |
| 0.05, 0.28, 0.46 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 0.12 | 57 | 25.7 |
| -0.05, 0.28, -0.12 | Crank_LOD0/bmx_metal + Crank_LOD0/bmx_chrome | 0.12 | 56 | 90 |
| 0.00, 0.74, 0.32 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_metal | 0.13 | 56 | 27.3 |
| -0.05, 0.28, 0.46 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 0.12 | 50 | 25.7 |
| -0.01, 0.76, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_chrome | 0.12 | 49 | 19.4 |
| 0.01, 0.28, -0.10 | Body_LOD0/bmx_paint + Crank_LOD0/bmx_metal | 0.14 | 48 | 50.6 |
| -0.04, 0.27, -0.47 | Cog_LOD0/bmx_black + Wheel_R_LOD0/bmx_metal | 0.1 | 48 | 54.2 |
| -0.00, 0.65, 0.32 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.08 | 47 | 53.7 |
| -0.02, 0.79, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_metal | 0.17 | 47 | 45.8 |
| -0.00, 0.57, 0.34 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.08 | 46 | 46.7 |
| 0.01, 0.57, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.13 | 46 | 24.1 |
| -0.01, 0.56, -0.22 | Body_LOD0/bmx_metal + Body_LOD0/bmx_metal | 0.07 | 45 | 19.9 |

(211 more in the JSON)

## opening (info, 1)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.01, 0.25, -0.72 | Wheel_R_LOD0/bmx_rubber | 1 + 0 + 0.01 | 0.009 |

## backtoback (info, 39)

| at | parts | area |
|---|---|---|
| 0.00, 0.60, 0.36 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00034 |
| 0.00, 0.63, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00012 |
| 0.00, 0.65, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00022 |
| -0.01, 0.60, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00033 |
| -0.01, 0.64, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00032 |
| -0.00, 0.60, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00034 |
| -0.00, 0.63, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00012 |
| 0.00, 0.65, 0.32 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00022 |
| 0.01, 0.61, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00033 |
| 0.01, 0.64, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00032 |
| 0.01, 0.56, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.01, 0.57, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.01, 0.56, -0.22 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| -0.01, 0.57, -0.20 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| -0.01, 0.57, -0.20 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| -0.01, 0.57, -0.19 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.03, 0.31, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| 0.03, 0.28, -0.09 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| 0.03, 0.30, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00013 |
| 0.03, 0.30, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| 0.03, 0.30, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00014 |
| 0.03, 0.28, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00014 |
| 0.03, 0.29, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00011 |
| 0.03, 0.29, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00045 |
| -0.03, 0.31, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| -0.03, 0.29, -0.13 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| -0.03, 0.27, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| -0.03, 0.30, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00015 |
| -0.03, 0.30, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00016 |
| -0.03, 0.28, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00015 |
| -0.03, 0.29, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00014 |
| -0.03, 0.29, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00043 |
| -0.05, 0.34, -0.11 | Crank_LOD0/bmx_metal + Crank_LOD0/bmx_chrome | 0.00004 |
| -0.05, 0.25, -0.08 | Crank_LOD0/bmx_metal + Crank_LOD0/bmx_chrome | 0.00004 |
| -0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 0.00009 |
| 0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 0.00009 |
| 0.06, 0.27, 0.48 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_chrome | 0.00005 |
| 0.06, 0.27, 0.47 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_chrome | 0.00007 |
| -0.06, 0.27, 0.47 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_chrome | 0.00006 |
