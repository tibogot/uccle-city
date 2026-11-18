# Mesh audit

15,802 triangles, 8,620 welded vertices, 818 open edges, 5,760 rays, 5327 ms.

**0 blocking**, 78 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 18 |
| sliver | warn | 8 |
| nonmanifold | warn | 48 |
| tjunction | warn | 4 |
| seam | info | 249 |
| opening | info | 6 |
| backtoback | info | 38 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 18)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.01, 0.56, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_chrome | 0.93 | 0.7 | 5 | 12 | 0.09 | false | 0.94 + -0.11 + -0.32 |
| -0.00, 0.56, -0.22 | Body_LOD0/bmx_paint + Body_LOD0/bmx_chrome | 0.93 | 0.4 | 4.9 | 12 | 0.09 | false | -0.17 + -0.32 + -0.93 |
| -0.01, 0.56, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_chrome | 0.93 | 0.7 | 5 | 12 | 0.09 | false | -0.77 + -0.21 + -0.61 |
| 0.01, 0.57, -0.20 | Body_LOD0/bmx_paint + Body_LOD0/bmx_chrome | 0.93 | 0.4 | 5 | 12 | 0.09 | false | 0.94 + 0.11 + 0.32 |
| -0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 2.5 | 0.9 | 0 | 12 | 0.09 | false | -1 + 0 + 0 |
| -0.04, 0.28, -0.10 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 2 | 0.5 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| -0.04, 0.29, -0.12 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 2 | 0.4 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| 0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 2.5 | 0.9 | 0 | 12 | 0.09 | false | 1 + 0 + 0 |
| 0.00, 0.54, 0.37 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 1.1 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| -0.01, 0.53, 0.36 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 0.7 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| 0.00, 0.53, 0.36 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_paint | 2 | 1.5 | 0 | 12 | 0.09 | false | 0 + -0.96 + 0.28 |
| 0.06, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 0.5 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| 0.05, 0.56, 0.38 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.2 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| 0.06, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.1 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| 0.05, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 0.5 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| -0.04, 0.56, 0.39 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 0.5 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
| -0.06, 0.56, 0.38 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 2 | 1.2 | 0 | 12 | 0.09 | false | 0 + 0.96 + -0.28 |
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

## nonmanifold (warn, 48)

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
| 0.02, 0.56, 0.35 | Body_LOD0/bmx_paint | 3 |
| 0.02, 0.56, 0.36 | Body_LOD0/bmx_paint | 3 |
| 0.02, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.57, 0.37 | Body_LOD0/bmx_paint | 3 |
| 0.01, 0.68, 0.34 | Body_LOD0/bmx_paint | 3 |
| -0.21, 0.97, 0.29 | Steer_LOD0/bmx_black | 3 |
| -0.21, 0.97, 0.30 | Steer_LOD0/bmx_black | 3 |

(8 more in the JSON)

## tjunction (warn, 4)

| at | part | edge_m |
|---|---|---|
| 0.01, 0.68, 0.32 | Body_LOD0/bmx_paint | 0.006 |
| 0.01, 0.56, 0.36 | Body_LOD0/bmx_chrome | 0.006 |
| 0.01, 0.56, 0.36 | Body_LOD0/bmx_chrome | 0.006 |
| 0.00, 0.57, 0.37 | Body_LOD0/bmx_chrome | 0.006 |

## seam (info, 249)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.04, 0.37, -0.12 | Body_LOD0/bmx_chain + Crank_LOD0/bmx_chrome | 0.72 | 370 | 28.9 |
| -0.02, 0.26, 0.68 | Wheel_F_LOD0/bmx_rubber + Wheel_F_LOD0/bmx_chrome | 5.23 | 336 | 43.6 |
| -0.02, 0.26, -0.27 | Wheel_R_LOD0/bmx_rubber + Wheel_R_LOD0/bmx_chrome | 5.23 | 336 | 43.6 |
| -0.04, 0.26, -0.46 | Cog_LOD0/bmx_black + Cog_LOD0/bmx_black | 0.21 | 178 | 90 |
| -0.04, 0.23, -0.48 | Body_LOD0/bmx_chain + Cog_LOD0/bmx_black | 0.23 | 134 | 20.7 |
| 0.00, 0.27, 0.66 | Wheel_F_LOD0/bmx_chrome + Wheel_F_LOD0/bmx_spokes | 1.19 | 116 | 77.8 |
| -0.00, 0.26, 0.67 | Wheel_F_LOD0/bmx_chrome + Wheel_F_LOD0/bmx_spokes | 1.19 | 116 | 77.8 |
| 0.00, 0.27, -0.29 | Wheel_R_LOD0/bmx_chrome + Wheel_R_LOD0/bmx_spokes | 1.19 | 116 | 77.8 |
| -0.00, 0.26, -0.28 | Wheel_R_LOD0/bmx_chrome + Wheel_R_LOD0/bmx_spokes | 1.19 | 116 | 77.8 |
| 0.10, 0.89, 0.32 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_pad | 0.12 | 100 | 90 |
| -0.01, 0.58, 0.35 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.24 | 99 | 19.5 |
| 0.01, 0.56, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.29 | 91 | 6.7 |
| 0.01, 0.70, 0.31 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_chrome | 0.25 | 88 | 14 |
| -0.00, 0.57, 0.37 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 2.21 | 87 | 7.1 |
| 0.03, 0.26, 0.50 | Wheel_F_LOD0/bmx_metal + Wheel_F_LOD0/bmx_spokes | 0.15 | 82 | 87.8 |
| -0.03, 0.27, 0.49 | Wheel_F_LOD0/bmx_metal + Wheel_F_LOD0/bmx_spokes | 0.15 | 82 | 87.8 |
| 0.03, 0.26, -0.45 | Wheel_R_LOD0/bmx_metal + Wheel_R_LOD0/bmx_spokes | 0.15 | 82 | 87.8 |
| -0.03, 0.27, -0.46 | Wheel_R_LOD0/bmx_metal + Wheel_R_LOD0/bmx_spokes | 0.15 | 82 | 87.8 |
| -0.01, 0.65, 0.33 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.18 | 79 | 9.7 |
| -0.00, 0.69, 0.33 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_metal | 0.26 | 78 | 7.1 |
| 0.14, 0.89, 0.33 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_chrome | 0.13 | 72 | 24.9 |
| -0.00, 0.56, 0.37 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_metal | 0.25 | 70 | 7.1 |
| -0.20, 0.95, 0.29 | Steer_LOD0/bmx_chrome + Steer_LOD0/bmx_black | 0.14 | 70 | 33.3 |
| 0.00, 0.56, 0.38 | Body_LOD0/bmx_chrome + Steer_LOD0/bmx_paint | 0.18 | 62 | 22.3 |
| 0.01, 0.66, -0.24 | Body_LOD0/bmx_chrome + Body_LOD0/bmx_chrome | 0.08 | 62 | 23.9 |
| 0.00, 0.74, 0.32 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_metal | 0.13 | 56 | 27.3 |
| 0.05, 0.28, 0.46 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 0.12 | 56 | 60 |
| 0.01, 0.28, -0.11 | Body_LOD0/bmx_paint + Crank_LOD0/bmx_metal | 0.14 | 49 | 50.1 |
| -0.04, 0.27, -0.47 | Cog_LOD0/bmx_black + Wheel_R_LOD0/bmx_metal | 0.1 | 48 | 54.2 |
| -0.03, 0.76, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_chrome | 0.14 | 48 | 87.4 |
| -0.05, 0.28, 0.46 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_paint | 0.12 | 48 | 56.7 |
| -0.00, 0.65, 0.32 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.08 | 47 | 53.7 |
| 0.08, 0.28, -0.28 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 0.08 | 47 | 18.2 |
| -0.01, 0.76, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_chrome | 0.12 | 47 | 25.4 |
| -0.02, 0.79, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_metal | 0.17 | 47 | 45.8 |
| -0.00, 0.57, 0.34 | Body_LOD0/bmx_paint + Body_LOD0/bmx_paint | 0.08 | 46 | 46.7 |
| 0.01, 0.57, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.13 | 45 | 22.5 |
| -0.01, 0.56, -0.22 | Body_LOD0/bmx_metal + Body_LOD0/bmx_metal | 0.07 | 45 | 19.9 |
| -0.08, 0.28, 0.06 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_chrome | 0.08 | 45 | 18.2 |
| -0.01, 0.75, 0.35 | Steer_LOD0/bmx_metal + Steer_LOD0/bmx_metal | 0.12 | 45 | 36 |

(209 more in the JSON)

## opening (info, 6)

| at | part | facing | edge_m |
|---|---|---|---|
| -0.01, 0.50, 0.47 | Wheel_F_LOD0/bmx_rubber | -1 + -0.01 + 0 | 0.01 |
| -0.00, 0.50, 0.47 | Wheel_F_LOD0/bmx_rubber | 0.93 + 0.37 + 0 | 0.01 |
| 0.00, 0.25, -0.72 | Wheel_R_LOD0/bmx_rubber | -0.93 + 0 + -0.37 | 0.01 |
| 0.01, 0.25, -0.72 | Wheel_R_LOD0/bmx_rubber | 1 + 0 + 0.01 | 0.01 |
| -0.01, 0.50, -0.47 | Wheel_R_LOD0/bmx_rubber | -1 + -0.01 + 0 | 0.01 |
| -0.00, 0.50, -0.47 | Wheel_R_LOD0/bmx_rubber | 0.93 + 0.37 + 0 | 0.01 |

## backtoback (info, 38)

| at | parts | area |
|---|---|---|
| 0.00, 0.60, 0.36 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00034 |
| 0.00, 0.63, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00012 |
| 0.00, 0.65, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00022 |
| -0.01, 0.61, 0.35 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00033 |
| -0.01, 0.64, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00032 |
| -0.00, 0.60, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00034 |
| -0.00, 0.63, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00012 |
| 0.00, 0.65, 0.32 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00022 |
| 0.01, 0.61, 0.34 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00033 |
| 0.01, 0.64, 0.33 | Body_LOD0/bmx_paint + Steer_LOD0/bmx_metal | 0.00032 |
| 0.01, 0.57, -0.21 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| -0.00, 0.56, -0.22 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.00, 0.56, -0.22 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| -0.01, 0.57, -0.20 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.01, 0.57, -0.19 | Body_LOD0/bmx_paint + Body_LOD0/bmx_metal | 0.00004 |
| 0.03, 0.28, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00004 |
| 0.03, 0.28, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00004 |
| 0.03, 0.30, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00006 |
| 0.03, 0.30, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00009 |
| 0.03, 0.30, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00017 |
| 0.03, 0.28, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00008 |
| 0.03, 0.28, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00024 |
| 0.03, 0.29, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00033 |
| -0.03, 0.28, -0.13 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00004 |
| -0.03, 0.30, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00009 |
| -0.03, 0.30, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00017 |
| -0.03, 0.29, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00005 |
| -0.03, 0.28, -0.10 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00007 |
| -0.03, 0.28, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00008 |
| -0.03, 0.30, -0.12 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.0001 |
| -0.03, 0.29, -0.11 | Body_LOD0/bmx_paint + Body_LOD0/bmx_black | 0.00045 |
| 0.02, 0.40, -0.33 | Body_LOD0/bmx_rubber + Wheel_R_LOD0/bmx_chrome | 0.00004 |
| 0.02, 0.40, -0.34 | Body_LOD0/bmx_rubber + Wheel_R_LOD0/bmx_chrome | 0.00006 |
| -0.02, 0.39, -0.33 | Body_LOD0/bmx_rubber + Wheel_R_LOD0/bmx_chrome | 0.00005 |
| -0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 0.00009 |
| 0.07, 0.29, -0.11 | Crank_LOD0/bmx_chrome + Crank_LOD0/bmx_black | 0.00009 |
| 0.06, 0.26, 0.47 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_chrome | 0.00006 |
| -0.06, 0.27, 0.47 | Steer_LOD0/bmx_paint + Steer_LOD0/bmx_chrome | 0.00006 |
