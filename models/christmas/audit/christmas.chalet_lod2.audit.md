# Mesh audit: christmas chalet_lod2 (needle-vs-needle overlaps exempt: 2)

3,832 triangles, 2,258 welded vertices, 0 open edges, 0 rays, 122 ms.

**0 blocking**, 962 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 955 |
| nonmanifold | warn | 7 |
| seam | info | 119 |
| backtoback | info | 98 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 955)

| at | part | aspect | longest |
|---|---|---|---|
| -1.55, 0.00, -0.35 | chalet_lod2/chalet_trim | 186 | 2.104 |
| -1.55, 0.15, 0.35 | chalet_lod2/chalet_trim | 186 | 2.104 |
| 0.52, 0.00, -1.05 | chalet_lod2/chalet_trim | 274 | 3.104 |
| -0.52, 0.15, -1.05 | chalet_lod2/chalet_trim | 274 | 3.104 |
| 1.55, 0.00, 0.35 | chalet_lod2/chalet_trim | 186 | 2.104 |
| 1.55, 0.15, -0.35 | chalet_lod2/chalet_trim | 186 | 2.104 |
| -0.52, 0.00, 1.05 | chalet_lod2/chalet_trim | 274 | 3.104 |
| 0.52, 0.15, 1.05 | chalet_lod2/chalet_trim | 274 | 3.104 |
| -0.50, 0.15, -0.98 | chalet_lod2/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, -0.98 | chalet_lod2/chalet_trim | 50 | 3.001 |
| -0.50, 0.15, 0.96 | chalet_lod2/chalet_trim | 50 | 3.001 |
| 0.50, 1.00, 0.96 | chalet_lod2/chalet_trim | 50 | 3.001 |
| -0.50, 1.85, 0.96 | chalet_lod2/chalet_trim | 50 | 3.001 |
| 0.50, 2.20, 0.96 | chalet_lod2/chalet_trim | 50 | 3.001 |
| -1.44, 2.17, 0.31 | chalet_lod2/chalet_trim | 47 | 1.876 |
| -0.48, 2.17, -0.94 | chalet_lod2/chalet_trim | 72 | 2.876 |
| 1.44, 2.17, -0.31 | chalet_lod2/chalet_trim | 47 | 1.876 |
| 0.48, 2.17, 0.94 | chalet_lod2/chalet_trim | 72 | 2.876 |
| -1.55, 0.82, 1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, 0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, 1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.55, 0.82, -0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.55, 1.52, -1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| -1.46, 1.52, -0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, 1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, 0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, 1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.46, 0.82, -0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.46, 1.52, -1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -1.05 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 1.55, 1.52, -0.96 | chalet_lod2/chalet_trim | 246 | 2.088 |
| 0.39, 1.85, 1.00 | chalet_lod2/chalet_trim | 330 | 2.33 |
| -0.39, 1.92, 1.00 | chalet_lod2/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.04 | chalet_lod2/chalet_trim | 330 | 2.33 |
| 0.39, 1.92, 1.04 | chalet_lod2/chalet_trim | 330 | 2.33 |
| -0.39, 1.85, 1.01 | chalet_lod2/chalet_trim | 58 | 2.33 |
| 0.39, 1.92, 1.01 | chalet_lod2/chalet_trim | 58 | 2.33 |

(915 more in the JSON)

## nonmanifold (warn, 7)

| at | part | uses |
|---|---|---|
| -1.50, 1.18, -0.94 | chalet_lod2/chalet_trim | 4 |
| 1.50, 1.18, -0.94 | chalet_lod2/chalet_trim | 4 |
| 1.50, 1.00, 0.97 | chalet_lod2/chalet_trim | 4 |
| -1.50, 1.85, 0.97 | chalet_lod2/chalet_trim | 4 |
| 1.50, 1.85, 0.97 | chalet_lod2/chalet_trim | 4 |
| -1.50, 1.00, 0.97 | chalet_lod2/chalet_trim | 4 |
| -1.00, 1.61, 1.44 | chalet_lod2/fir_needles | 4 |

## seam (info, 119)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.16, 1.99, 1.26 | chalet_lod2/chalet_wood + chalet_lod2/roof_felt | 9.44 | 36 | 58.7 |
| -1.25, 0.97, 1.00 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 5.07 | 28 | 80 |
| -0.75, 1.97, 1.02 | chalet_lod2/chalet_wood + chalet_lod2/sign_board | 3.26 | 24 | 90 |
| -0.01, 1.64, 1.39 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.16 | 24 | 33.2 |
| -1.34, 1.69, 1.36 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.29 | 23 | 27 |
| -1.67, 1.77, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.31 | 22 | 27.5 |
| -0.67, 1.73, 1.39 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.15 | 21 | 24.7 |
| -0.33, 1.69, 1.40 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.22 | 21 | 19.4 |
| -1.67, 1.77, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.15 | 20 | 21.6 |
| -0.35, 1.72, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 20 | 34.1 |
| -1.02, 1.67, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.2 | 20 | 19.2 |
| -1.54, 0.15, -1.05 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.35 | 18 | 90 |
| 1.47, 0.15, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.35 | 18 | 90 |
| -1.25, 1.00, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 5.22 | 18 | 80 |
| -0.34, 1.69, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 18 | 37.4 |
| 1.33, 1.68, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 18 | 35.9 |
| 0.17, 1.60, 1.39 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 18 | 28 |
| -1.50, 0.73, -0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 4.25 | 17 | 90 |
| 1.46, 0.16, -1.00 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 4.25 | 17 | 90 |
| -1.17, 1.85, 1.00 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 9.46 | 17 | 45 |
| -1.50, 1.02, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 1.85 | 17 | 90 |
| 1.50, 1.15, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 1.85 | 17 | 90 |
| -0.44, 1.74, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.17 | 17 | 54.3 |
| 0.22, 1.68, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.14 | 17 | 47.9 |
| 1.09, 1.67, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 17 | 33.9 |
| 1.32, 1.68, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.18 | 17 | 11.7 |
| 1.46, 0.15, -0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.35 | 16 | 90 |
| -1.55, 0.15, 1.05 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.35 | 16 | 90 |
| -1.16, 1.01, 1.04 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.19 | 16 | 90 |
| 1.11, 1.01, 1.04 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.19 | 16 | 90 |
| 1.73, 1.95, 1.34 | chalet_lod2/chalet_trim + chalet_lod2/roof_felt | 7 | 16 | 83.7 |
| -1.73, 1.96, -1.35 | chalet_lod2/chalet_trim + chalet_lod2/roof_felt | 7 | 16 | 83.7 |
| -0.75, 2.11, 1.02 | chalet_lod2/chalet_wood + chalet_lod2/sign_board | 3.04 | 16 | 76 |
| -1.00, 1.66, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 16 | 52.7 |
| 0.44, 1.74, 1.37 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.12 | 16 | 51 |
| 0.87, 1.69, 1.38 | chalet_lod2/fir_needles + chalet_lod2/fir_needles | 0.13 | 16 | 35.3 |
| -1.50, 0.29, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 1.85 | 15 | 90 |
| 1.50, 0.43, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 1.85 | 15 | 90 |
| -1.50, 1.91, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.85 | 15 | 90 |
| 1.50, 1.97, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.85 | 15 | 90 |

(79 more in the JSON)

## backtoback (info, 98)

| at | parts | area |
|---|---|---|
| -0.46, 0.15, -0.98 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.08599 |
| 0.06, 0.15, -0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.08988 |
| 1.43, 0.15, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00012 |
| 1.47, 0.15, 0.97 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00401 |
| -0.48, 0.15, -1.02 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02024 |
| 0.48, 0.15, -1.01 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02024 |
| 1.46, 0.15, -0.31 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.0564 |
| 1.48, 0.15, 0.31 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.0564 |
| 1.52, 0.15, -0.55 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.00651 |
| 1.51, 0.15, 0.78 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.00446 |
| 1.54, 0.15, 0.18 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00906 |
| 1.52, 0.15, 0.78 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.00099 |
| -1.48, 0.16, -0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00121 |
| 1.46, 1.16, -0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.06148 |
| 1.49, 1.68, -0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.06029 |
| -1.47, 0.15, -0.97 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00401 |
| 1.48, 2.20, -0.98 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.00351 |
| 1.50, 2.20, -0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.00005 |
| -1.49, 1.19, -0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.06029 |
| -1.48, 0.43, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.04 |
| -1.46, 0.99, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00042 |
| -1.45, 1.37, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.01793 |
| -1.45, 1.79, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00135 |
| -1.44, 2.02, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00179 |
| -1.48, 0.15, -0.31 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.0564 |
| -1.48, 2.20, -0.70 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02735 |
| -1.45, 2.20, -0.23 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02905 |
| 1.46, 0.16, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00051 |
| 1.48, 0.58, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.03992 |
| 1.48, 1.02, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00123 |
| 1.49, 1.44, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.01805 |
| 1.50, 2.02, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00179 |
| 1.46, 2.20, -0.70 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02735 |
| 1.49, 2.20, -0.23 | chalet_lod2/chalet_trim + chalet_lod2/chalet_wood | 0.02905 |
| -1.49, 0.71, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.01049 |
| -0.06, 0.15, 0.96 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.08988 |
| -1.31, 1.00, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00141 |
| -1.12, 1.00, 0.94 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.00019 |
| 1.21, 1.00, 0.97 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.01181 |
| 1.41, 1.00, 0.98 | chalet_lod2/chalet_trim + chalet_lod2/chalet_trim | 0.01059 |

(58 more in the JSON)
