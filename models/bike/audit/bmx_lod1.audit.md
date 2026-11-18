# Mesh audit

7,640 triangles, 4,090 welded vertices, 294 open edges, 2,474 rays, 958 ms.

**0 blocking**, 138 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 93 |
| sliver | warn | 8 |
| nonmanifold | warn | 32 |
| tjunction | warn | 5 |
| seam | info | 148 |
| backtoback | info | 69 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 93)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.06, 0.28, -0.46 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 1.46 | 0.7 | 4.7 | 40 | 0.31 | false | 1 + 0.07 + -0.04 |
| -0.04, 0.38, -0.13 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.38, -0.12 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.38, -0.10 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.38, -0.10 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.07 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.9 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.36, -0.06 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.36, -0.06 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.7 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.35, -0.05 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.34, -0.04 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.7 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.34, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.33, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.31, -0.02 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.31, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.29, -0.02 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.02 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.8 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.27, -0.02 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.26, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.27, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.25, -0.03 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.24, -0.04 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.9 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.23, -0.04 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.23, -0.05 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.07 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.21, -0.08 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.21, -0.09 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.8 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.20, -0.10 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.20, -0.10 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.20, -0.13 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1.3 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.47 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.6 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.48 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.23, -0.50 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.24, -0.50 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.25, -0.51 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.27, -0.50 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.50 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.47 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.48 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 2.8 | 0.5 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.13 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 0.4 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.15 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 2.55 | 1.2 | 0 | 40 | 0.31 | false | 1 + 0 + 0 |

(53 more in the JSON)

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -0.04, 0.20, -0.23 | Body_LOD1/bmx_chain | 42 | 0.364 |
| -0.04, 0.21, -0.36 | Body_LOD1/bmx_chain | 42 | 0.364 |
| -0.04, 0.32, -0.37 | Body_LOD1/bmx_chain | 42 | 0.364 |
| -0.04, 0.35, -0.25 | Body_LOD1/bmx_chain | 42 | 0.364 |
| -0.04, 0.22, -0.36 | Body_LOD1/bmx_chain | 42 | 0.363 |
| -0.04, 0.21, -0.23 | Body_LOD1/bmx_chain | 42 | 0.363 |
| -0.04, 0.34, -0.25 | Body_LOD1/bmx_chain | 42 | 0.363 |
| -0.04, 0.31, -0.36 | Body_LOD1/bmx_chain | 42 | 0.363 |

## nonmanifold (warn, 32)

| at | part | uses |
|---|---|---|
| -0.00, 0.57, 0.37 | Body_LOD1/bmx_paint | 3 |
| -0.00, 0.57, 0.37 | Body_LOD1/bmx_paint | 3 |
| -0.00, 0.68, 0.34 | Body_LOD1/bmx_paint | 3 |
| -0.00, 0.68, 0.34 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.57, 0.37 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.57, 0.36 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.68, 0.33 | Body_LOD1/bmx_paint | 3 |
| -0.02, 0.56, 0.36 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.68, 0.33 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.56, 0.35 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.68, 0.31 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.68, 0.32 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.56, 0.34 | Body_LOD1/bmx_paint | 3 |
| -0.00, 0.56, 0.35 | Body_LOD1/bmx_paint | 3 |
| -0.01, 0.67, 0.31 | Body_LOD1/bmx_paint | 3 |
| -0.00, 0.68, 0.31 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.56, 0.34 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.56, 0.35 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.67, 0.31 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.68, 0.31 | Body_LOD1/bmx_paint | 3 |
| 0.02, 0.56, 0.35 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.56, 0.35 | Body_LOD1/bmx_paint | 3 |
| 0.02, 0.68, 0.32 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.68, 0.32 | Body_LOD1/bmx_paint | 3 |
| 0.02, 0.56, 0.36 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.56, 0.36 | Body_LOD1/bmx_paint | 3 |
| 0.02, 0.68, 0.33 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.57, 0.37 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.57, 0.37 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.68, 0.34 | Body_LOD1/bmx_paint | 3 |
| 0.01, 0.68, 0.33 | Body_LOD1/bmx_paint | 3 |

## tjunction (warn, 5)

| at | part | edge_m |
|---|---|---|
| -0.01, 0.56, 0.36 | Body_LOD1/bmx_chrome | 0.009 |
| 0.05, 0.26, 0.48 | Wheel_F_LOD1/bmx_metal | 0.006 |
| -0.05, 0.26, 0.48 | Wheel_F_LOD1/bmx_metal | 0.006 |
| 0.05, 0.26, 0.48 | Wheel_F_LOD1/bmx_metal | 0.006 |
| -0.05, 0.26, 0.48 | Wheel_F_LOD1/bmx_metal | 0.006 |

## seam (info, 148)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.26, 0.68 | Wheel_F_LOD1/bmx_rubber + Wheel_F_LOD1/bmx_chrome | 2.53 | 204 | 5.9 |
| -0.01, 0.26, -0.27 | Wheel_R_LOD1/bmx_rubber + Wheel_R_LOD1/bmx_chrome | 2.53 | 204 | 5.9 |
| -0.05, 0.37, -0.12 | Body_LOD1/bmx_chain + Crank_LOD1/bmx_metal | 0.72 | 120 | 23.8 |
| -0.04, 0.26, -0.46 | Cog_LOD1/bmx_black + Cog_LOD1/bmx_black | 0.2 | 114 | 90 |
| -0.05, 0.30, -0.06 | Crank_LOD1/bmx_metal + Crank_LOD1/bmx_chrome | 0.23 | 99 | 44.8 |
| -0.04, 0.23, -0.48 | Body_LOD1/bmx_chain + Cog_LOD1/bmx_black | 0.24 | 92 | 41.4 |
| -0.20, 0.95, 0.29 | Steer_LOD1/bmx_chrome + Steer_LOD1/bmx_black | 0.28 | 90 | 18.1 |
| 0.01, 0.70, 0.31 | Steer_LOD1/bmx_metal + Steer_LOD1/bmx_chrome | 0.22 | 70 | 7.4 |
| 0.01, 0.66, -0.24 | Body_LOD1/bmx_chrome + Body_LOD1/bmx_chrome | 0.09 | 66 | 29.1 |
| 0.01, 0.56, -0.21 | Body_LOD1/bmx_paint + Body_LOD1/bmx_metal | 0.22 | 60 | 19 |
| -0.05, 0.31, -0.11 | Crank_LOD1/bmx_chrome + Crank_LOD1/bmx_chrome | 0.11 | 59 | 54.3 |
| 0.00, 0.32, 0.66 | Wheel_F_LOD1/bmx_chrome + Wheel_F_LOD1/bmx_spokes | 1.22 | 54 | 80.4 |
| -0.00, 0.29, 0.66 | Wheel_F_LOD1/bmx_chrome + Wheel_F_LOD1/bmx_spokes | 1.22 | 54 | 80.4 |
| 0.00, 0.32, -0.29 | Wheel_R_LOD1/bmx_chrome + Wheel_R_LOD1/bmx_spokes | 1.22 | 54 | 80.4 |
| -0.00, 0.29, -0.29 | Wheel_R_LOD1/bmx_chrome + Wheel_R_LOD1/bmx_spokes | 1.22 | 54 | 80.4 |
| 0.10, 0.89, 0.32 | Steer_LOD1/bmx_chrome + Steer_LOD1/bmx_pad | 0.11 | 53 | 90 |
| -0.00, 0.69, 0.33 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.17 | 50 | 6 |
| 0.14, 0.89, 0.33 | Steer_LOD1/bmx_chrome + Steer_LOD1/bmx_chrome | 0.13 | 50 | 22.2 |
| 0.03, 0.26, 0.50 | Wheel_F_LOD1/bmx_metal + Wheel_F_LOD1/bmx_spokes | 0.15 | 50 | 80.2 |
| -0.03, 0.27, 0.49 | Wheel_F_LOD1/bmx_metal + Wheel_F_LOD1/bmx_spokes | 0.15 | 50 | 80.2 |
| 0.03, 0.26, -0.45 | Wheel_R_LOD1/bmx_metal + Wheel_R_LOD1/bmx_spokes | 0.15 | 50 | 80.2 |
| -0.03, 0.27, -0.46 | Wheel_R_LOD1/bmx_metal + Wheel_R_LOD1/bmx_spokes | 0.15 | 50 | 80.2 |
| -0.00, 0.56, 0.37 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.17 | 48 | 6 |
| -0.05, 0.28, -0.12 | Crank_LOD1/bmx_metal + Crank_LOD1/bmx_chrome | 0.12 | 48 | 90 |
| -0.00, 0.57, 0.37 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 1.46 | 46 | 10.5 |
| -0.04, 0.27, -0.47 | Cog_LOD1/bmx_black + Wheel_R_LOD1/bmx_metal | 0.1 | 45 | 51 |
| -0.02, 0.79, 0.35 | Steer_LOD1/bmx_metal + Steer_LOD1/bmx_metal | 0.17 | 40 | 46.7 |
| 0.05, 0.28, 0.46 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_paint | 0.12 | 40 | 89.7 |
| -0.05, 0.28, 0.46 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_paint | 0.12 | 40 | 89.7 |
| -0.20, 0.96, 0.31 | Steer_LOD1/bmx_black + Steer_LOD1/bmx_black | 0.08 | 39 | 41.2 |
| -0.00, 0.56, -0.21 | Body_LOD1/bmx_paint + Body_LOD1/bmx_chrome | 0.14 | 38 | 22.4 |
| 0.00, 0.56, 0.38 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_paint | 0.15 | 38 | 44.9 |
| -0.01, 0.65, 0.33 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 0.1 | 36 | 30.2 |
| -0.03, 0.77, 0.36 | Steer_LOD1/bmx_metal + Steer_LOD1/bmx_chrome | 0.13 | 36 | 87.4 |
| -0.01, 0.58, 0.35 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 0.12 | 34 | 28.8 |
| -0.01, 0.57, 0.34 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 0.11 | 34 | 32.7 |
| 0.01, 0.28, -0.11 | Body_LOD1/bmx_paint + Crank_LOD1/bmx_metal | 0.14 | 34 | 44.5 |
| 0.03, 0.28, -0.13 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 0.07 | 34 | 34.7 |
| 0.06, 0.29, -0.44 | Body_LOD1/bmx_paint + Body_LOD1/bmx_paint | 0.09 | 34 | 54.7 |
| -0.04, 0.28, -0.16 | Body_LOD1/bmx_paint + Crank_LOD1/bmx_metal | 0.2 | 34 | 26.7 |

(108 more in the JSON)

## backtoback (info, 69)

| at | parts | area |
|---|---|---|
| -0.01, 0.59, 0.36 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 0.00049 |
| -0.01, 0.62, 0.35 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 0.00052 |
| 0.01, 0.60, 0.34 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 0.00053 |
| 0.01, 0.62, 0.34 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 0.00009 |
| 0.01, 0.64, 0.33 | Body_LOD1/bmx_paint + Steer_LOD1/bmx_metal | 0.00043 |
| 0.03, 0.30, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00004 |
| 0.03, 0.30, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00005 |
| 0.03, 0.27, -0.11 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00005 |
| 0.03, 0.28, -0.09 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00006 |
| 0.03, 0.28, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00005 |
| 0.03, 0.29, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00021 |
| 0.03, 0.28, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00009 |
| 0.03, 0.28, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00012 |
| 0.03, 0.30, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00013 |
| 0.03, 0.29, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00036 |
| -0.03, 0.29, -0.09 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00006 |
| -0.03, 0.30, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00006 |
| -0.03, 0.28, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00006 |
| -0.03, 0.30, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00012 |
| -0.03, 0.29, -0.12 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00026 |
| -0.03, 0.27, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00006 |
| -0.03, 0.28, -0.10 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00032 |
| -0.03, 0.29, -0.11 | Body_LOD1/bmx_paint + Body_LOD1/bmx_black | 0.00023 |
| -0.01, 0.56, 0.36 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.00005 |
| 0.01, 0.56, 0.35 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.00005 |
| -0.01, 0.69, 0.33 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.00005 |
| 0.01, 0.68, 0.32 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.00005 |
| 0.01, 0.69, 0.32 | Body_LOD1/bmx_chrome + Steer_LOD1/bmx_metal | 0.00005 |
| -0.05, 0.34, -0.11 | Crank_LOD1/bmx_metal + Crank_LOD1/bmx_chrome | 0.00004 |
| -0.05, 0.31, -0.16 | Crank_LOD1/bmx_metal + Crank_LOD1/bmx_chrome | 0.00004 |
| -0.05, 0.25, -0.08 | Crank_LOD1/bmx_metal + Crank_LOD1/bmx_chrome | 0.00005 |
| 0.00, 0.70, 0.30 | Steer_LOD1/bmx_metal + Steer_LOD1/bmx_chrome | 0.00004 |
| 0.06, 0.25, 0.48 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_chrome | 0.00004 |
| 0.06, 0.27, 0.47 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_chrome | 0.00009 |
| -0.06, 0.26, 0.46 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_chrome | 0.00004 |
| -0.06, 0.26, 0.47 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_chrome | 0.00005 |
| -0.06, 0.27, 0.48 | Steer_LOD1/bmx_paint + Steer_LOD1/bmx_chrome | 0.00005 |
| -0.01, 0.35, 0.66 | Wheel_F_LOD1/bmx_rubber + Wheel_F_LOD1/bmx_chrome | 0.00024 |
| 0.01, 0.35, 0.66 | Wheel_F_LOD1/bmx_rubber + Wheel_F_LOD1/bmx_chrome | 0.0003 |
| -0.01, 0.41, 0.61 | Wheel_F_LOD1/bmx_rubber + Wheel_F_LOD1/bmx_chrome | 0.00021 |

(29 more in the JSON)
