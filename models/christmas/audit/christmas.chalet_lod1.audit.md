# Mesh audit: christmas chalet_lod1 (needle-vs-needle overlaps exempt: 6)

6,116 triangles, 3,442 welded vertices, 0 open edges, 0 rays, 144 ms.

**0 blocking**, 1189 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1183 |
| nonmanifold | warn | 6 |
| seam | info | 142 |
| backtoback | info | 177 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1183)

| at | part | aspect | longest |
|---|---|---|---|
| -1.55, 0.00, -0.35 | chalet_lod1/chalet_trim | 186 | 2.104 |
| -1.55, 0.15, 0.35 | chalet_lod1/chalet_trim | 186 | 2.104 |
| 0.52, 0.00, -1.05 | chalet_lod1/chalet_trim | 274 | 3.104 |
| -0.52, 0.15, -1.05 | chalet_lod1/chalet_trim | 274 | 3.104 |
| 1.55, 0.00, 0.35 | chalet_lod1/chalet_trim | 186 | 2.104 |
| 1.55, 0.15, -0.35 | chalet_lod1/chalet_trim | 186 | 2.104 |
| -0.52, 0.00, 1.05 | chalet_lod1/chalet_trim | 274 | 3.104 |
| 0.52, 0.15, 1.05 | chalet_lod1/chalet_trim | 274 | 3.104 |
| -0.50, 0.15, -0.98 | chalet_lod1/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, -0.98 | chalet_lod1/chalet_trim | 50 | 3.001 |
| -0.50, 0.15, 0.96 | chalet_lod1/chalet_trim | 50 | 3.001 |
| 0.50, 1.00, 0.96 | chalet_lod1/chalet_trim | 50 | 3.001 |
| -0.50, 1.85, 0.96 | chalet_lod1/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, 0.96 | chalet_lod1/chalet_trim | 50 | 3.001 |
| -1.44, 2.17, 0.31 | chalet_lod1/chalet_trim | 47 | 1.876 |
| -0.48, 2.17, -0.94 | chalet_lod1/chalet_trim | 72 | 2.876 |
| 1.44, 2.17, -0.31 | chalet_lod1/chalet_trim | 47 | 1.876 |
| 0.48, 2.17, 0.94 | chalet_lod1/chalet_trim | 72 | 2.876 |
| -1.55, 0.82, 1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, 0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.55, 0.82, -0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, -1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, 1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, 0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, -0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, -1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -1.05 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -0.96 | chalet_lod1/chalet_trim | 246 | 2.088 |
| 0.39, 1.85, 1.00 | chalet_lod1/chalet_trim | 330 | 2.33 |
| -0.39, 1.92, 1.00 | chalet_lod1/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.04 | chalet_lod1/chalet_trim | 330 | 2.33 |
| 0.39, 1.92, 1.04 | chalet_lod1/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.01 | chalet_lod1/chalet_trim | 58 | 2.33 |
| 0.39, 1.92, 1.01 | chalet_lod1/chalet_trim | 58 | 2.33 |

(1143 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -1.50, 1.18, -0.94 | chalet_lod1/chalet_trim | 4 |
| 1.50, 1.18, -0.94 | chalet_lod1/chalet_trim | 4 |
| 1.50, 1.00, 0.97 | chalet_lod1/chalet_trim | 4 |
| -1.50, 1.85, 0.97 | chalet_lod1/chalet_trim | 4 |
| 1.50, 1.85, 0.97 | chalet_lod1/chalet_trim | 4 |
| -1.50, 1.00, 0.97 | chalet_lod1/chalet_trim | 4 |

## seam (info, 142)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.67, 1.79, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.42 | 48 | 12.2 |
| -0.66, 1.73, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.32 | 46 | 16.8 |
| 0.34, 1.72, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.36 | 44 | 13.7 |
| -1.16, 1.99, 1.26 | chalet_lod1/chalet_wood + chalet_lod1/roof_felt | 9.44 | 36 | 58.7 |
| -1.25, 0.97, 1.00 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 5.08 | 34 | 90 |
| 0.01, 1.67, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.25 | 34 | 12.2 |
| -0.96, 1.69, 1.38 | chalet_lod1/metal_frame + chalet_lod1/fir_needles | 0.16 | 32 | 24 |
| -1.32, 1.69, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.38 | 31 | 14.1 |
| 0.17, 1.62, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.18 | 31 | 24.8 |
| 0.68, 1.75, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.27 | 31 | 18.2 |
| 0.94, 1.65, 1.33 | chalet_lod1/metal_frame + chalet_lod1/fir_needles | 0.17 | 30 | 31.5 |
| -0.33, 1.71, 1.34 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.27 | 30 | 14.7 |
| 1.01, 1.68, 1.36 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.24 | 30 | 21.6 |
| 1.34, 1.70, 1.35 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.29 | 30 | 15.9 |
| -0.98, 1.67, 1.35 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.29 | 27 | 25.4 |
| -1.25, 1.00, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 5.23 | 24 | 90 |
| -0.75, 1.97, 1.02 | chalet_lod1/chalet_wood + chalet_lod1/sign_board | 3.26 | 24 | 76 |
| -0.12, 1.68, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 24 | 34.4 |
| -0.35, 1.72, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 22 | 34.1 |
| -1.66, 1.77, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.16 | 21 | 35.3 |
| -1.46, 1.72, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 21 | 43.1 |
| -0.81, 1.71, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 20 | 24.5 |
| -1.73, 1.97, -1.35 | chalet_lod1/chalet_trim + chalet_lod1/roof_felt | 7 | 19 | 56.5 |
| -0.75, 2.11, 1.02 | chalet_lod1/chalet_wood + chalet_lod1/sign_board | 3.05 | 19 | 76 |
| -1.23, 1.65, 1.37 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.16 | 19 | 32.3 |
| -0.34, 1.69, 1.37 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.15 | 19 | 29.1 |
| -1.54, 0.15, -1.05 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.35 | 18 | 90 |
| 1.47, 0.15, 0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.35 | 18 | 90 |
| 1.73, 1.97, 1.35 | chalet_lod1/chalet_trim + chalet_lod1/roof_felt | 7 | 18 | 56.5 |
| -1.67, 1.78, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.13 | 18 | 50.6 |
| -1.01, 1.67, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 18 | 42.4 |
| -0.66, 1.73, 1.37 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 18 | 50.4 |
| -0.44, 1.74, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.17 | 18 | 40.3 |
| 0.21, 1.68, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.16 | 18 | 51.3 |
| 0.67, 1.74, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.15 | 18 | 35.4 |
| 0.98, 1.68, 1.38 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 18 | 40 |
| 1.33, 1.67, 1.37 | chalet_lod1/fir_needles + chalet_lod1/fir_needles | 0.14 | 18 | 63.4 |
| -1.50, 0.73, -0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 4.25 | 17 | 90 |
| 1.46, 0.16, -1.00 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 4.25 | 17 | 90 |
| -1.50, 1.02, 0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 1.85 | 17 | 90 |

(102 more in the JSON)

## backtoback (info, 177)

| at | parts | area |
|---|---|---|
| -0.46, 0.15, -0.98 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.08599 |
| 0.06, 0.15, -0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.08988 |
| -0.48, 0.15, -1.02 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02024 |
| 0.48, 0.15, -1.01 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02024 |
| 1.43, 0.15, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00012 |
| 1.47, 0.15, 0.97 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00401 |
| 1.46, 0.15, -0.31 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.0564 |
| 1.48, 0.15, 0.31 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.0564 |
| 1.52, 0.15, -0.55 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.00414 |
| 1.53, 0.15, -0.08 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00906 |
| 1.54, 0.15, 0.18 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00906 |
| 1.52, 0.15, 0.78 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.00344 |
| -1.48, 0.16, -0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00121 |
| 1.46, 1.16, -0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.06148 |
| 1.49, 1.68, -0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.06029 |
| -1.47, 0.15, -0.97 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00401 |
| 1.48, 2.20, -0.98 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.00351 |
| 1.50, 2.20, -0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.00005 |
| -1.49, 1.19, -0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.06029 |
| -1.48, 0.43, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.04 |
| -1.46, 0.99, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00042 |
| -1.45, 1.37, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.01793 |
| -1.45, 1.79, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00135 |
| -1.44, 2.02, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00179 |
| -1.48, 0.15, -0.31 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.0564 |
| -1.48, 2.20, -0.70 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02735 |
| -1.45, 2.20, -0.23 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02905 |
| 1.46, 0.16, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00051 |
| 1.48, 0.58, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.03992 |
| 1.48, 1.02, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00123 |
| 1.49, 1.44, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.01805 |
| 1.50, 2.02, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00179 |
| 1.46, 2.20, -0.70 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02735 |
| 1.49, 2.20, -0.23 | chalet_lod1/chalet_trim + chalet_lod1/chalet_wood | 0.02905 |
| -1.49, 0.71, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.01049 |
| -0.06, 0.15, 0.96 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.08988 |
| -1.31, 1.00, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00141 |
| -1.12, 1.00, 0.94 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.00019 |
| 1.21, 1.00, 0.97 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.01181 |
| 1.41, 1.00, 0.98 | chalet_lod1/chalet_trim + chalet_lod1/chalet_trim | 0.01059 |

(137 more in the JSON)
