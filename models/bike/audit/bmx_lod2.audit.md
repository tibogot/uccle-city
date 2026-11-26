# Mesh audit

1,794 triangles, 1,044 welded vertices, 146 open edges, 1,874 rays, 324 ms.

**0 blocking**, 71 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 63 |
| sliver | warn | 8 |
| seam | info | 55 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 63)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.04, 0.38, -0.12 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.9 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.10 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.6 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.09 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.07 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.2 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.36, -0.07 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.36, -0.06 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.34, -0.04 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.1 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.32, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.9 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.31, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.6 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.29, -0.02 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.27, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.26, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.24, -0.04 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.2 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.05 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.07 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.21, -0.09 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.21, -0.10 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.8 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.20, -0.11 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.20, -0.12 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.22, -0.47 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.23, -0.46 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.4 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.23, -0.50 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.24, -0.50 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.25, -0.50 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.4 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.26, -0.50 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.5 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.28, -0.48 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 2.8 | 0.8 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.04, 0.37, -0.14 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.8 | 0 | 150 | 1.14 | false | 1 + 0 + 0 |
| -0.05, 0.38, -0.10 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.38, -0.11 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.37, -0.12 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.6 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.37, -0.11 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.9 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.36, -0.07 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.7 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.37, -0.08 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.4 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.34, -0.04 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.35, -0.05 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 1.8 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.30, -0.02 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.33, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.5 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.32, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.4 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |
| -0.05, 0.31, -0.03 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 2.55 | 0.6 | 0 | 150 | 1.14 | false | -1 + 0 + 0 |

(23 more in the JSON)

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -0.04, 0.20, -0.23 | Body_LOD2/bmx_chain | 42 | 0.364 |
| -0.04, 0.21, -0.36 | Body_LOD2/bmx_chain | 42 | 0.364 |
| -0.04, 0.32, -0.37 | Body_LOD2/bmx_chain | 42 | 0.364 |
| -0.04, 0.35, -0.25 | Body_LOD2/bmx_chain | 42 | 0.364 |
| -0.04, 0.22, -0.36 | Body_LOD2/bmx_chain | 42 | 0.363 |
| -0.04, 0.21, -0.23 | Body_LOD2/bmx_chain | 42 | 0.363 |
| -0.04, 0.34, -0.25 | Body_LOD2/bmx_chain | 42 | 0.363 |
| -0.04, 0.31, -0.36 | Body_LOD2/bmx_chain | 42 | 0.363 |

## seam (info, 55)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 0.26, 0.68 | Wheel_F_LOD2/bmx_rubber + Wheel_F_LOD2/bmx_chrome | 1.73 | 136 | 24.3 |
| -0.01, 0.26, -0.27 | Wheel_R_LOD2/bmx_rubber + Wheel_R_LOD2/bmx_chrome | 1.73 | 136 | 24.3 |
| -0.05, 0.37, -0.10 | Body_LOD2/bmx_chain + Crank_LOD2/bmx_metal | 0.7 | 59 | 14.8 |
| -0.01, 0.58, 0.35 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.23 | 38 | 42.6 |
| 0.01, 0.66, -0.23 | Body_LOD2/bmx_chrome + Body_LOD2/bmx_chrome | 0.08 | 38 | 22.4 |
| -0.04, 0.23, -0.47 | Body_LOD2/bmx_chain + Cog_LOD2/bmx_black | 0.24 | 37 | 32.5 |
| -0.01, 0.65, 0.33 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.18 | 36 | 46.1 |
| 0.34, 0.96, 0.27 | Steer_LOD2/bmx_chrome + Steer_LOD2/bmx_grip | 0.13 | 36 | 23.8 |
| -0.34, 0.95, 0.27 | Steer_LOD2/bmx_chrome + Steer_LOD2/bmx_grip | 0.13 | 36 | 23.8 |
| 0.14, 0.90, 0.33 | Steer_LOD2/bmx_chrome + Steer_LOD2/bmx_chrome | 0.14 | 34 | 40.6 |
| -0.04, 0.27, -0.48 | Cog_LOD2/bmx_black + Cog_LOD2/bmx_black | 0.2 | 32 | 90 |
| 0.00, 0.26, 0.67 | Wheel_F_LOD2/bmx_chrome + Wheel_F_LOD2/bmx_spokes | 0.38 | 32 | 81.5 |
| -0.00, 0.26, 0.67 | Wheel_F_LOD2/bmx_chrome + Wheel_F_LOD2/bmx_spokes | 0.38 | 32 | 81.5 |
| 0.00, 0.26, -0.28 | Wheel_R_LOD2/bmx_chrome + Wheel_R_LOD2/bmx_spokes | 0.38 | 32 | 81.5 |
| -0.00, 0.26, -0.28 | Wheel_R_LOD2/bmx_chrome + Wheel_R_LOD2/bmx_spokes | 0.38 | 32 | 81.5 |
| 0.03, 0.26, 0.50 | Wheel_F_LOD2/bmx_metal + Wheel_F_LOD2/bmx_spokes | 0.14 | 26 | 84.8 |
| -0.03, 0.27, 0.49 | Wheel_F_LOD2/bmx_metal + Wheel_F_LOD2/bmx_spokes | 0.14 | 26 | 84.8 |
| 0.03, 0.26, -0.45 | Wheel_R_LOD2/bmx_metal + Wheel_R_LOD2/bmx_spokes | 0.14 | 26 | 84.8 |
| -0.03, 0.27, -0.46 | Wheel_R_LOD2/bmx_metal + Wheel_R_LOD2/bmx_spokes | 0.14 | 26 | 84.8 |
| 0.01, 0.30, -0.11 | Body_LOD2/bmx_paint + Crank_LOD2/bmx_metal | 0.14 | 24 | 45.1 |
| -0.05, 0.28, -0.15 | Body_LOD2/bmx_paint + Crank_LOD2/bmx_metal | 0.2 | 24 | 41.3 |
| 0.03, 0.76, 0.34 | Steer_LOD2/bmx_chrome + Steer_LOD2/bmx_metal | 0.12 | 24 | 89.7 |
| 0.01, 0.74, 0.31 | Steer_LOD2/bmx_metal + Steer_LOD2/bmx_metal | 0.16 | 24 | 60 |
| -0.03, 0.30, -0.10 | Body_LOD2/bmx_paint + Crank_LOD2/bmx_metal | 0.11 | 20 | 90 |
| -0.05, 0.30, -0.10 | Crank_LOD2/bmx_metal + Crank_LOD2/bmx_metal | 0.11 | 20 | 90 |
| 0.02, 0.77, 0.33 | Steer_LOD2/bmx_metal + Steer_LOD2/bmx_metal | 0.15 | 19 | 74 |
| 0.01, 0.30, -0.11 | Body_LOD2/bmx_paint + Crank_LOD2/bmx_metal | 0.09 | 18 | 45 |
| -0.04, 0.27, -0.48 | Cog_LOD2/bmx_black + Wheel_R_LOD2/bmx_metal | 0.08 | 18 | 22.8 |
| 0.00, 0.67, -0.23 | Body_LOD2/bmx_chrome + Body_LOD2/bmx_black | 0.09 | 16 | 19 |
| 0.02, 0.76, 0.34 | Steer_LOD2/bmx_chrome + Steer_LOD2/bmx_metal | 0.13 | 16 | 72.4 |
| -0.01, 0.75, 0.30 | Steer_LOD2/bmx_metal + Steer_LOD2/bmx_pad | 0.19 | 15 | 90 |
| 0.00, 0.31, -0.10 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.1 | 14 | 67.6 |
| 0.02, 0.28, -0.13 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.07 | 14 | 40.1 |
| 0.04, 0.47, -0.26 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.05 | 14 | 21.9 |
| -0.04, 0.47, -0.26 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.05 | 14 | 21.9 |
| 0.01, 0.75, 0.31 | Steer_LOD2/bmx_metal + Steer_LOD2/bmx_pad | 0.1 | 14 | 90 |
| -0.02, 0.76, 0.34 | Steer_LOD2/bmx_metal + Steer_LOD2/bmx_pad | 0.17 | 14 | 46 |
| 0.01, 0.29, -0.11 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.11 | 12 | 46.6 |
| 0.01, 0.31, -0.12 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.09 | 12 | 57.7 |
| -0.02, 0.28, -0.13 | Body_LOD2/bmx_paint + Body_LOD2/bmx_paint | 0.07 | 12 | 39.3 |

(15 more in the JSON)

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.01, 0.57, -0.21 | Body_LOD2/bmx_paint + Body_LOD2/bmx_chrome | 0.0001 |
| 0.00, 0.57, -0.21 | Body_LOD2/bmx_paint + Body_LOD2/bmx_chrome | 0.00008 |
| -0.01, 0.57, -0.20 | Body_LOD2/bmx_paint + Body_LOD2/bmx_chrome | 0.00009 |
| -0.00, 0.57, -0.21 | Body_LOD2/bmx_paint + Body_LOD2/bmx_chrome | 0.00008 |
