# Mesh audit: christmas chalet_lod0 (needle-vs-needle overlaps exempt: 14)

9,676 triangles, 5,224 welded vertices, 0 open edges, 0 rays, 228 ms.

**0 blocking**, 1288 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1280 |
| nonmanifold | warn | 6 |
| seam | info | 175 |
| backtoback | info | 166 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1280)

| at | part | aspect | longest |
|---|---|---|---|
| -1.55, 0.00, -0.35 | chalet_lod0/chalet_trim | 186 | 2.104 |
| -1.55, 0.15, 0.35 | chalet_lod0/chalet_trim | 186 | 2.104 |
| 0.52, 0.00, -1.05 | chalet_lod0/chalet_trim | 274 | 3.104 |
| -0.52, 0.15, -1.05 | chalet_lod0/chalet_trim | 274 | 3.104 |
| 1.55, 0.00, 0.35 | chalet_lod0/chalet_trim | 186 | 2.104 |
| 1.55, 0.15, -0.35 | chalet_lod0/chalet_trim | 186 | 2.104 |
| -0.52, 0.00, 1.05 | chalet_lod0/chalet_trim | 274 | 3.104 |
| 0.52, 0.15, 1.05 | chalet_lod0/chalet_trim | 274 | 3.104 |
| -0.50, 0.15, -0.98 | chalet_lod0/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, -0.98 | chalet_lod0/chalet_trim | 50 | 3.001 |
| -0.50, 0.15, 0.96 | chalet_lod0/chalet_trim | 50 | 3.001 |
| 0.50, 1.00, 0.96 | chalet_lod0/chalet_trim | 50 | 3.001 |
| -0.50, 1.85, 0.96 | chalet_lod0/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, 0.96 | chalet_lod0/chalet_trim | 50 | 3.001 |
| -1.44, 2.17, 0.31 | chalet_lod0/chalet_trim | 47 | 1.876 |
| -0.48, 2.17, -0.94 | chalet_lod0/chalet_trim | 72 | 2.876 |
| 1.44, 2.17, -0.31 | chalet_lod0/chalet_trim | 47 | 1.876 |
| 0.48, 2.17, 0.94 | chalet_lod0/chalet_trim | 72 | 2.876 |
| -1.55, 0.82, 1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, 0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.55, 0.82, -0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, -1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, 1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, 0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, -0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, -1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -1.05 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -0.96 | chalet_lod0/chalet_trim | 246 | 2.088 |
| 0.39, 1.85, 1.00 | chalet_lod0/chalet_trim | 330 | 2.33 |
| -0.39, 1.92, 1.00 | chalet_lod0/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.04 | chalet_lod0/chalet_trim | 330 | 2.33 |
| 0.39, 1.92, 1.04 | chalet_lod0/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.01 | chalet_lod0/chalet_trim | 58 | 2.33 |
| 0.39, 1.92, 1.01 | chalet_lod0/chalet_trim | 58 | 2.33 |

(1240 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -1.50, 1.18, -0.94 | chalet_lod0/chalet_trim | 4 |
| 1.50, 1.18, -0.94 | chalet_lod0/chalet_trim | 4 |
| 1.50, 1.00, 0.97 | chalet_lod0/chalet_trim | 4 |
| -1.50, 1.85, 0.97 | chalet_lod0/chalet_trim | 4 |
| 1.50, 1.85, 0.97 | chalet_lod0/chalet_trim | 4 |
| -1.50, 1.00, 0.97 | chalet_lod0/chalet_trim | 4 |

## seam (info, 175)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.34, 1.72, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.42 | 74 | 13.8 |
| -1.69, 1.79, 1.36 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.4 | 63 | 13.4 |
| -1.31, 1.69, 1.35 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.38 | 56 | 12.7 |
| 0.67, 1.75, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.26 | 54 | 14.7 |
| -0.67, 1.76, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.31 | 50 | 14.6 |
| -1.01, 1.67, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.29 | 49 | 15.6 |
| -0.33, 1.72, 1.35 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.27 | 48 | 14.7 |
| 1.35, 1.68, 1.35 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.27 | 45 | 13.4 |
| 0.17, 1.63, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.21 | 44 | 12.8 |
| 0.99, 1.68, 1.36 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.27 | 40 | 14.5 |
| 0.02, 1.66, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.26 | 37 | 13.2 |
| -1.16, 1.99, 1.26 | chalet_lod0/chalet_wood + chalet_lod0/roof_felt | 9.44 | 36 | 58.7 |
| -1.25, 0.97, 1.00 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 5.08 | 34 | 90 |
| -0.96, 1.65, 1.33 | chalet_lod0/metal_frame + chalet_lod0/fir_needles | 0.15 | 30 | 24 |
| 0.94, 1.65, 1.33 | chalet_lod0/metal_frame + chalet_lod0/fir_needles | 0.15 | 30 | 24 |
| -0.75, 1.97, 1.02 | chalet_lod0/chalet_wood + chalet_lod0/sign_board | 3.27 | 28 | 60 |
| -0.81, 1.71, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 26 | 47.3 |
| -0.36, 1.72, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 25 | 45.6 |
| -1.25, 1.00, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 5.23 | 24 | 90 |
| -0.34, 1.72, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 24 | 36.5 |
| -0.12, 1.68, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 24 | 29.8 |
| 0.21, 1.68, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.17 | 24 | 47.1 |
| 0.33, 1.71, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 24 | 65.5 |
| 0.64, 1.73, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 24 | 45.1 |
| 0.87, 1.69, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 24 | 36.8 |
| 1.25, 1.01, 1.02 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.23 | 23 | 90 |
| -1.73, 1.97, 1.35 | chalet_lod0/chalet_trim + chalet_lod0/roof_felt | 7.01 | 23 | 56.5 |
| -1.73, 1.97, -1.35 | chalet_lod0/chalet_trim + chalet_lod0/roof_felt | 7.01 | 23 | 56.5 |
| -0.75, 2.11, 1.02 | chalet_lod0/chalet_wood + chalet_lod0/sign_board | 3.05 | 23 | 60 |
| -0.66, 1.73, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 23 | 40 |
| -0.25, 1.67, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 23 | 45.7 |
| 1.22, 1.67, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.17 | 23 | 55 |
| -0.78, 1.66, 1.45 | chalet_lod0/bulb_warm + chalet_lod0/fir_needles | 0.07 | 22 | 37.9 |
| -1.66, 1.76, 1.37 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.16 | 22 | 51.2 |
| -1.46, 1.72, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 22 | 43.5 |
| -1.01, 1.67, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.14 | 22 | 54.5 |
| -0.56, 1.78, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 22 | 47.7 |
| -0.44, 1.74, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.17 | 22 | 40.3 |
| -0.02, 1.67, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.13 | 22 | 62.8 |
| 0.97, 1.68, 1.38 | chalet_lod0/fir_needles + chalet_lod0/fir_needles | 0.15 | 22 | 32.1 |

(135 more in the JSON)

## backtoback (info, 166)

| at | parts | area |
|---|---|---|
| -0.46, 0.15, -0.98 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.08599 |
| 0.06, 0.15, -0.96 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.08988 |
| -0.48, 0.15, -1.02 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02024 |
| 0.48, 0.15, -1.01 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02024 |
| 1.43, 0.15, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00012 |
| 1.47, 0.15, 0.97 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00401 |
| 1.46, 0.15, -0.31 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.0564 |
| 1.48, 0.15, 0.31 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.0564 |
| 1.51, 0.15, -0.75 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00414 |
| 1.52, 0.15, -0.55 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00414 |
| 1.53, 0.15, -0.08 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00906 |
| 1.54, 0.15, 0.18 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00906 |
| 1.51, 0.15, 0.62 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00344 |
| 1.52, 0.15, 0.78 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00344 |
| -1.48, 0.16, -0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00121 |
| 1.46, 1.16, -0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.06148 |
| 1.49, 1.68, -0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.06029 |
| -1.47, 0.15, -0.97 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00401 |
| 1.48, 2.20, -0.98 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00351 |
| 1.50, 2.20, -0.96 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.00005 |
| -1.49, 1.19, -0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.06029 |
| -1.48, 0.43, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.04 |
| -1.46, 0.99, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00042 |
| -1.45, 1.37, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.01793 |
| -1.45, 1.79, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00135 |
| -1.44, 2.02, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00179 |
| -1.48, 0.15, -0.31 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.0564 |
| -1.48, 2.20, -0.70 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02735 |
| -1.45, 2.20, -0.23 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02905 |
| 1.46, 0.16, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00051 |
| 1.48, 0.58, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.03992 |
| 1.48, 1.02, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00123 |
| 1.49, 1.52, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.01805 |
| 1.50, 1.97, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00179 |
| 1.46, 2.20, -0.70 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02735 |
| 1.49, 2.20, -0.23 | chalet_lod0/chalet_trim + chalet_lod0/chalet_wood | 0.02905 |
| -1.49, 0.71, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.01049 |
| -0.06, 0.15, 0.96 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.08988 |
| -1.31, 1.00, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00141 |
| -1.12, 1.00, 0.94 | chalet_lod0/chalet_trim + chalet_lod0/chalet_trim | 0.00019 |

(126 more in the JSON)
