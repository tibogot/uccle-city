# Mesh audit (packed): police.lod2

3,351 triangles, 3,710 welded vertices, 2,951 open edges, 838,134 rays, 2789 ms.

**13 blocking**, 459 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| depth | block | 2 |
| crossing | block | 3 |
| leak | block | 8 |
| sliver | warn | 283 |
| nonmanifold | warn | 12 |
| tjunction | warn | 164 |
| seam | info | 200 |
| opening | info | 921 |
| backtoback | info | 198 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## depth (block, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 5.65, 54.66, 0.47 | Police_lod2/brick_yellow + Police_lod2/painted_metal_white | 0.85 | 113.5 | 2.4 | 2000 | 15.46 | false | -0.04 + -0.02 + 1 |
| 6.65, 54.66, 0.47 | Police_lod2/brick_yellow + Police_lod2/painted_metal_white | 0.85 | 4.7 | 1 | 2000 | 15.46 | false | 0 + -0.02 + 1 |

## crossing (block, 3)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 5.19, 57.35, 2.25 | Police_lod2/brick_yellow + Police_lod2/painted_metal_white | 7.8 | 176.4 |
| -2.72, 57.35, -1.42 | Police_lod2/brick_yellow + Police_lod2/painted_metal_white | 7.8 | 176.4 |
| 6.99, 58.98, -0.72 | Police_lod2/alu_anthracite + Police_lod2/solar_panel | 9.1 | 13.1 |

## leak (block, 8)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 14.46, 48.52, -8.97 | Police_lod2/brick_yellow | 30 | 0.6 + -0.8 + 0.06 | 1.356 |
| 5.32, 50.40, 5.20 | Police_lod2/brick_red_brussels | 4 | 1 + 0 + 0 | 2.03 |
| 5.32, 50.40, 4.10 | Police_lod2/brick_red_brussels | 4 | 1 + 0 + 0 | 2.3 |
| 14.51, 48.52, -8.88 | Police_lod2/concrete_white | 12 | 0 + 0 + 1 | 0.142 |
| -4.71, 52.13, 1.01 | Police_lod2/concrete_white | 30 | 0 + 0 + -1 | 0.142 |
| 26.57, 47.65, -19.15 | Police_lod2/stone_blue | 30 | 0.89 + -0.45 + 0.01 | 1.703 |
| 26.08, 48.00, 16.65 | Police_lod2/stone_blue | 4 | -0.9 + -0.44 + 0.02 | 5.501 |
| 26.10, 47.58, -20.35 | Police_lod2/rubble_stone | 4 | -1 + 0 + 0 | 1.7 |

## sliver (warn, 283)

| at | part | aspect | longest |
|---|---|---|---|
| 14.55, 48.43, -11.07 | Police_lod2/brick_yellow | 43 | 5.084 |
| 14.59, 51.86, -2.96 | Police_lod2/brick_yellow | 79 | 5.524 |
| 14.59, 57.67, -2.96 | Police_lod2/brick_yellow | 65 | 5.552 |
| 8.96, 57.80, 0.52 | Police_lod2/brick_yellow | 107 | 8.971 |
| 5.65, 55.61, 0.45 | Police_lod2/brick_yellow | 58 | 5.83 |
| 6.65, 55.61, 0.45 | Police_lod2/brick_yellow | 58 | 5.83 |
| 5.28, 51.86, 4.07 | Police_lod2/brick_yellow | 41 | 5.634 |
| -4.80, 51.11, 4.48 | Police_lod2/brick_yellow | 52 | 14.15 |
| -4.80, 50.77, 6.84 | Police_lod2/brick_yellow | 51 | 10.221 |
| -4.71, 48.43, 4.93 | Police_lod2/brick_yellow | 50 | 4.485 |
| -4.80, 50.77, 8.33 | Police_lod2/brick_yellow | 57 | 7.105 |
| -4.71, 48.43, 6.20 | Police_lod2/brick_yellow | 65 | 6.932 |
| 11.00, 50.77, -14.00 | Police_lod2/brick_yellow | 42 | 6.1 |
| 9.74, 50.77, -14.00 | Police_lod2/brick_yellow | 46 | 8.515 |
| 8.60, 50.77, -14.00 | Police_lod2/brick_yellow | 139 | 9.512 |
| 7.46, 50.77, -14.00 | Police_lod2/brick_yellow | 90 | 11.933 |
| 9.80, 51.86, -14.00 | Police_lod2/brick_yellow | 50 | 8.077 |
| 9.80, 57.67, -14.00 | Police_lod2/brick_yellow | 41 | 8.096 |
| 8.60, 51.86, -14.00 | Police_lod2/brick_yellow | 68 | 9.97 |
| 7.40, 51.86, -14.00 | Police_lod2/brick_yellow | 104 | 11.665 |
| 5.32, 48.43, 6.57 | Police_lod2/brick_red_brussels | 42 | 3.211 |
| -1.43, 50.77, 12.60 | Police_lod2/brick_red_brussels | 48 | 5.588 |
| -0.61, 50.77, 12.60 | Police_lod2/brick_red_brussels | 52 | 7.055 |
| 0.33, 50.77, 12.60 | Police_lod2/brick_red_brussels | 80 | 8.4 |
| 14.58, 51.30, -4.32 | Police_lod2/concrete_white | 97 | 14.497 |
| 14.58, 51.25, -9.16 | Police_lod2/concrete_white | 97 | 14.497 |
| 8.40, 51.30, 0.51 | Police_lod2/concrete_white | 62 | 9.271 |
| 11.49, 51.25, 0.51 | Police_lod2/concrete_white | 62 | 9.271 |
| 5.31, 51.30, 8.56 | Police_lod2/concrete_white | 81 | 12.081 |
| 5.31, 51.25, 4.54 | Police_lod2/concrete_white | 81 | 12.081 |
| -1.42, 51.30, 12.59 | Police_lod2/concrete_white | 67 | 10.097 |
| 1.94, 51.25, 12.59 | Police_lod2/concrete_white | 67 | 10.097 |
| -4.79, 51.30, 3.17 | Police_lod2/concrete_white | 94 | 14.127 |
| -4.79, 51.25, 7.88 | Police_lod2/concrete_white | 94 | 14.127 |
| -0.64, 51.30, -9.84 | Police_lod2/concrete_white | 83 | 12.451 |
| -0.64, 51.25, -5.69 | Police_lod2/concrete_white | 83 | 12.451 |
| 9.51, 51.30, -13.99 | Police_lod2/concrete_white | 102 | 15.217 |
| 4.43, 51.25, -13.99 | Police_lod2/concrete_white | 102 | 15.217 |
| 14.82, 58.30, -4.33 | Police_lod2/concrete_white | 41 | 15.23 |
| 14.70, 58.30, -9.28 | Police_lod2/concrete_white | 41 | 14.86 |

(243 more in the JSON)

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| 25.80, 47.50, 20.10 | Police_lod2/galvanised_steel | 3 |
| 25.80, 47.50, 14.70 | Police_lod2/galvanised_steel | 3 |
| 25.80, 49.25, 20.10 | Police_lod2/galvanised_steel | 3 |
| 25.80, 49.25, 14.70 | Police_lod2/galvanised_steel | 3 |
| 26.32, 47.09, -18.41 | Police_lod2/cast_iron_green | 4 |
| 26.32, 48.67, -18.41 | Police_lod2/cast_iron_green | 4 |
| 26.32, 47.09, -16.97 | Police_lod2/cast_iron_green | 4 |
| 26.32, 48.67, -16.97 | Police_lod2/cast_iron_green | 4 |
| 26.32, 47.09, -16.83 | Police_lod2/cast_iron_green | 4 |
| 26.32, 48.67, -16.83 | Police_lod2/cast_iron_green | 4 |
| 26.32, 47.09, -15.39 | Police_lod2/cast_iron_green | 4 |
| 26.32, 48.67, -15.39 | Police_lod2/cast_iron_green | 4 |

## tjunction (warn, 164)

| at | part | edge_m |
|---|---|---|
| 14.59, 48.25, -0.23 | Police_lod2/brick_yellow | 2.7 |
| 14.59, 48.25, -1.43 | Police_lod2/brick_yellow | 2.7 |
| 6.20, 48.25, 0.52 | Police_lod2/brick_yellow | 2.75 |
| 13.60, 48.25, 0.52 | Police_lod2/brick_yellow | 2.75 |
| 6.27, 50.60, 0.32 | Police_lod2/brick_yellow | 7.4 |
| 5.65, 51.77, 0.42 | Police_lod2/brick_yellow | 5.83 |
| 6.65, 51.77, 0.42 | Police_lod2/brick_yellow | 5.83 |
| 5.72, 57.55, 0.42 | Police_lod2/brick_yellow | 1 |
| 5.19, 54.05, 6.17 | Police_lod2/brick_yellow | 1.9 |
| 5.19, 52.17, 6.10 | Police_lod2/brick_yellow | 1.93 |
| 5.19, 55.47, 6.10 | Police_lod2/brick_yellow | 1.93 |
| 5.19, 54.05, 1.37 | Police_lod2/brick_yellow | 1.9 |
| 5.19, 57.35, 1.37 | Police_lod2/brick_yellow | 1.9 |
| 5.19, 52.17, 1.30 | Police_lod2/brick_yellow | 1.93 |
| 5.19, 55.47, 1.30 | Police_lod2/brick_yellow | 1.93 |
| 5.32, 48.25, 5.20 | Police_lod2/brick_yellow | 2.7 |
| 5.32, 48.25, 4.10 | Police_lod2/brick_yellow | 2.7 |
| 5.16, 50.55, 4.17 | Police_lod2/brick_yellow | 1.1 |
| 5.19, 52.17, 3.70 | Police_lod2/brick_yellow | 1.93 |
| 5.19, 54.05, 3.77 | Police_lod2/brick_yellow | 1.9 |
| 5.19, 55.47, 3.70 | Police_lod2/brick_yellow | 1.93 |
| 5.19, 57.35, 3.77 | Police_lod2/brick_yellow | 1.9 |
| 5.19, 57.35, 6.17 | Police_lod2/brick_yellow | 1.9 |
| 3.58, 48.57, 12.47 | Police_lod2/brick_yellow | 2.03 |
| 2.29, 50.55, 12.47 | Police_lod2/brick_yellow | 1.35 |
| -0.25, 48.25, 12.60 | Police_lod2/brick_yellow | 2.7 |
| 0.75, 48.25, 12.60 | Police_lod2/brick_yellow | 2.7 |
| -0.18, 50.55, 12.44 | Police_lod2/brick_yellow | 1 |
| -1.73, 48.57, 12.47 | Police_lod2/brick_yellow | 2.03 |
| -3.01, 50.55, 12.47 | Police_lod2/brick_yellow | 1.35 |
| 3.85, 52.17, 12.47 | Police_lod2/brick_yellow | 1.93 |
| 2.02, 54.05, 12.47 | Police_lod2/brick_yellow | 1.9 |
| 1.20, 52.17, 12.47 | Police_lod2/brick_yellow | 1.93 |
| -0.63, 54.05, 12.47 | Police_lod2/brick_yellow | 1.9 |
| -1.45, 52.17, 12.47 | Police_lod2/brick_yellow | 1.93 |
| -3.28, 54.05, 12.47 | Police_lod2/brick_yellow | 1.9 |
| 3.85, 55.47, 12.47 | Police_lod2/brick_yellow | 1.93 |
| 2.02, 57.35, 12.47 | Police_lod2/brick_yellow | 1.9 |
| 1.20, 55.47, 12.47 | Police_lod2/brick_yellow | 1.93 |
| -0.63, 57.35, 12.47 | Police_lod2/brick_yellow | 1.9 |

(124 more in the JSON)

## seam (info, 200)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.59, 58.30, 0.11 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 91.98 | 21 | 82.2 |
| 14.59, 55.38, -2.54 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| 5.32, 55.38, 5.61 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.47 | 19 | 75.4 |
| -0.71, 55.38, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| -4.80, 55.38, 5.03 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| -4.80, 55.38, 9.03 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| 10.17, 55.38, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| 6.57, 55.38, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 19 | 81.3 |
| 14.59, 55.38, -0.15 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| 14.59, 55.38, -4.94 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| -3.36, 55.38, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| -0.74, 52.12, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.4 |
| 1.94, 55.38, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| -4.80, 55.45, 1.02 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| -4.80, 52.08, 5.23 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.4 |
| 13.77, 55.45, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| 2.97, 55.38, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 18 | 81.3 |
| 14.29, 58.62, -6.80 | Police_lod2/concrete_white + Police_lod2/roof_membrane | 89.58 | 18 | 90 |
| 14.59, 52.12, -2.51 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 17 | 81.4 |
| 14.59, 52.12, -4.91 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 17 | 81.4 |
| 13.77, 52.15, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 17 | 81.4 |
| 10.19, 52.12, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 17 | 81.4 |
| 6.59, 52.12, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 17 | 81.4 |
| 24.59, 47.23, -1.42 | Police_lod2/stone_blue + Police_lod2/galvanised_steel | 0.33 | 17 | 89.8 |
| 14.59, 52.15, -0.13 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 16 | 81.4 |
| 5.29, 52.11, 5.64 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.29 | 16 | 31 |
| -3.37, 52.15, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 16 | 81.4 |
| 2.99, 52.12, -14.00 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 16 | 81.4 |
| 2.02, 52.08, 12.60 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 15 | 81.4 |
| -4.80, 52.08, 9.12 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 2.46 | 15 | 81.4 |
| 5.32, 48.55, 8.02 | Police_lod2/brick_red_brussels + Police_lod2/concrete_white | 2.2 | 15 | 81.4 |
| 24.60, 47.18, -4.41 | Police_lod2/stone_blue + Police_lod2/galvanised_steel | 0.33 | 15 | 89.8 |
| 24.60, 47.31, 1.58 | Police_lod2/stone_blue + Police_lod2/galvanised_steel | 0.33 | 15 | 89.8 |
| 0.84, 58.62, -8.04 | Police_lod2/roof_membrane + Police_lod2/galvanised_steel | 0.33 | 15 | 89.2 |
| 1.62, 58.62, -3.45 | Police_lod2/roof_membrane + Police_lod2/galvanised_steel | 0.34 | 15 | 89.2 |
| 3.55, 58.62, -2.62 | Police_lod2/roof_membrane + Police_lod2/galvanised_steel | 0.33 | 15 | 89.2 |
| 5.32, 47.84, 5.26 | Police_lod2/stone_blue + Police_lod2/stone_blue | 2.91 | 14 | 90 |
| -4.67, 52.17, 1.03 | Police_lod2/brick_yellow + Police_lod2/concrete_white | 1.01 | 13 | 68.2 |
| 5.32, 48.48, 3.02 | Police_lod2/brick_red_brussels + Police_lod2/concrete_white | 2.2 | 13 | 81.4 |
| 2.19, 48.55, 12.60 | Police_lod2/brick_red_brussels + Police_lod2/concrete_white | 1.65 | 13 | 81.4 |

(160 more in the JSON)

## opening (info, 921)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.59, 50.50, -0.23 | Police_lod2/brick_yellow | 1 + 0 + 0 | 2.3 |
| 14.59, 50.50, -1.43 | Police_lod2/brick_yellow | 1 + 0 + -0.09 | 2.3 |
| 14.46, 49.08, -2.83 | Police_lod2/brick_yellow | 1 + 0 + -0.09 | 2.03 |
| 14.46, 50.55, -2.87 | Police_lod2/brick_yellow | 0.98 + -0.2 + 0 | 1.35 |
| 14.46, 48.98, -4.17 | Police_lod2/brick_yellow | 0.9 + 0 + 0.43 | 2.03 |
| 14.46, 50.50, -5.28 | Police_lod2/brick_yellow | 0.99 + 0 + -0.16 | 2.03 |
| 14.46, 50.55, -5.32 | Police_lod2/brick_yellow | 0.98 + -0.2 + 0 | 1.35 |
| 14.46, 48.98, -6.63 | Police_lod2/brick_yellow | 1 + 0 + 0.06 | 2.03 |
| 6.20, 48.30, 0.52 | Police_lod2/brick_yellow | 0 + 0 + 1 | 2.35 |
| 13.60, 50.55, 0.52 | Police_lod2/brick_yellow | 0 + 0 + 1 | 2.35 |
| 5.19, 52.27, 8.00 | Police_lod2/brick_yellow | 1 + 0 + -0.03 | 1.93 |
| 5.19, 52.27, 3.20 | Police_lod2/brick_yellow | 0.97 + 0 + -0.25 | 1.93 |
| 5.19, 55.57, 3.20 | Police_lod2/brick_yellow | 0.97 + 0 + -0.25 | 1.93 |
| -1.77, 52.27, -1.42 | Police_lod2/brick_yellow | -0.12 + 0 + -0.99 | 1.93 |
| -1.77, 55.57, -1.42 | Police_lod2/brick_yellow | -0.12 + 0 + -0.99 | 1.93 |
| -6.55, 48.30, -3.78 | Police_lod2/brick_yellow | -1 + 0 + 0 | 2.48 |
| 5.32, 48.48, 5.20 | Police_lod2/brick_red_brussels | 1 + 0 + 0 | 0.27 |
| 6.69, 51.73, 0.45 | Police_lod2/concrete_white | 1 + 0 + 0 | 0.12 |
| 5.24, 52.13, 8.04 | Police_lod2/concrete_white | 0 + 0 + 1 | 0.142 |
| 5.24, 55.42, 8.04 | Police_lod2/concrete_white | 0 + 0 + 1 | 0.142 |
| -4.66, 48.57, 6.15 | Police_lod2/concrete_white | 0.15 + -0.99 + 0 | 1.43 |
| -4.71, 48.52, 5.49 | Police_lod2/concrete_white | 0 + 0 + -1 | 0.142 |
| -4.71, 48.52, 6.92 | Police_lod2/concrete_white | 0 + 0 + 1 | 0.142 |
| -4.71, 48.52, 9.29 | Police_lod2/concrete_white | 0 + 0 + -1 | 0.142 |
| -4.71, 48.52, 10.71 | Police_lod2/concrete_white | 0 + 0 + 1 | 0.142 |
| 2.71, 48.52, -13.91 | Police_lod2/concrete_white | 1 + 0 + 0 | 0.142 |
| 1.28, 48.52, -13.91 | Police_lod2/concrete_white | -1 + 0 + 0 | 0.142 |
| 9.91, 48.52, -13.91 | Police_lod2/concrete_white | 1 + 0 + 0 | 0.142 |
| 8.48, 48.52, -13.91 | Police_lod2/concrete_white | -1 + 0 + 0 | 0.142 |
| -4.82, 50.73, -0.04 | Police_lod2/concrete_white | 0.96 + -0.27 + 0 | 3.95 |
| -0.72, 50.73, -3.76 | Police_lod2/concrete_white | 0 + -0.27 + -0.96 | 5.86 |
| 14.59, 47.37, -0.10 | Police_lod2/stone_blue | 1 + 0 + 0 | 1.14 |
| 14.59, 48.20, -0.23 | Police_lod2/stone_blue | 1 + 0 + 0 | 0.4 |
| 14.59, 47.85, -0.28 | Police_lod2/stone_blue | 1 + 0 + 0 | 1.2 |
| 14.59, 47.11, -0.15 | Police_lod2/stone_blue | 1 + 0 + 0 | 1.95 |
| 14.59, 48.20, -1.43 | Police_lod2/stone_blue | 1 + 0 + 0 | 0.4 |
| 14.59, 47.11, -2.10 | Police_lod2/stone_blue | 1 + 0 + 0 | 11.95 |
| 6.20, 48.20, 0.52 | Police_lod2/stone_blue | 0 + 0 + 1 | 0.4 |
| 6.25, 47.85, 0.52 | Police_lod2/stone_blue | 0 + 0 + 1 | 7.4 |
| 5.37, 47.43, 0.52 | Police_lod2/stone_blue | 0 + 0 + 1 | 8.65 |

(881 more in the JSON)

## backtoback (info, 198)

| at | parts | area |
|---|---|---|
| 6.87, 58.92, -0.24 | Police_lod2/concrete_white + Police_lod2/alu_anthracite | 0.22611 |
| 6.50, 58.92, -0.05 | Police_lod2/concrete_white + Police_lod2/alu_anthracite | 0.22388 |
| 6.50, 58.92, -0.65 | Police_lod2/concrete_white + Police_lod2/alu_anthracite | 0.22388 |
| 6.13, 58.92, -0.46 | Police_lod2/concrete_white + Police_lod2/alu_anthracite | 0.22612 |
| 26.07, 47.70, -12.16 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.14714 |
| 26.07, 47.73, -6.91 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.45129 |
| 26.07, 47.76, -1.88 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.30793 |
| 26.07, 47.85, 7.45 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.05686 |
| 26.07, 47.76, -0.63 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.10963 |
| 26.07, 47.83, 6.11 | Police_lod2/stone_blue + Police_lod2/stone_blue | 0.0462 |
| 4.32, 59.67, -4.71 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.43425 |
| 4.09, 59.67, -4.11 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.44572 |
| 3.81, 59.67, -5.29 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.44572 |
| 3.58, 59.67, -4.69 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.43425 |
| 25.81, 48.36, 14.76 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00047 |
| 25.82, 48.38, 14.76 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00134 |
| 25.78, 48.38, 14.76 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00134 |
| 25.79, 48.40, 14.76 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00047 |
| 25.79, 48.36, 20.04 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00047 |
| 25.78, 48.38, 20.04 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00134 |
| 25.82, 48.38, 20.04 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00134 |
| 25.81, 48.40, 20.04 | Police_lod2/galvanised_steel + Police_lod2/galvanised_steel | 0.00047 |
| 26.71, 49.15, 8.87 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00538 |
| 26.71, 49.12, 8.76 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.01397 |
| 26.71, 49.15, 8.73 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00427 |
| 26.71, 49.18, 9.10 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00541 |
| 26.71, 49.17, 8.99 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00573 |
| 26.71, 49.16, 8.92 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00427 |
| 26.71, 49.20, 9.21 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00089 |
| 26.71, 49.25, 8.89 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00278 |
| 26.71, 49.25, 8.85 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00518 |
| 26.71, 49.26, 8.81 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00536 |
| 26.70, 49.27, 9.07 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00011 |
| 26.71, 49.24, 9.14 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.0071 |
| 26.71, 49.25, 9.02 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.01001 |
| 26.71, 49.25, 8.95 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00518 |
| 26.71, 49.25, 8.91 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00277 |
| 26.71, 48.85, 9.13 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.01622 |
| 26.71, 49.02, 9.23 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.01246 |
| 26.71, 49.18, 9.24 | Police_lod2/galvanised_steel + Police_lod2/signage | 0.00055 |

(158 more in the JSON)


Nodes: Police_lod2. Distances: {"Police":105,"Police_far":440,"Police_lod2":2000}. Quantum 0.204 mm. Offset 0,40,0.
