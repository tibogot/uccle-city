# Mesh audit (packed): police.lod0

19,716 triangles, 16,719 welded vertices, 13,204 open edges, 1,138,460 rays, 4129 ms.

**0 blocking**, 7348 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 6608 |
| nonmanifold | warn | 12 |
| tjunction | warn | 728 |
| seam | info | 1758 |
| opening | info | 1139 |
| backtoback | info | 679 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 6608)

| at | part | aspect | longest |
|---|---|---|---|
| 14.59, 49.20, -0.13 | Police/brick_yellow | 41 | 2.03 |
| 14.59, 49.87, -0.12 | Police/brick_yellow | 41 | 2.03 |
| 5.65, 55.61, 0.45 | Police/brick_yellow | 58 | 5.83 |
| 5.65, 53.66, 0.49 | Police/brick_yellow | 58 | 5.83 |
| 6.65, 55.61, 0.49 | Police/brick_yellow | 58 | 5.83 |
| 6.65, 53.66, 0.45 | Police/brick_yellow | 58 | 5.83 |
| 14.60, 51.20, -4.32 | Police/concrete_white | 393 | 14.57 |
| 14.59, 51.20, -9.17 | Police/concrete_white | 393 | 14.533 |
| 8.42, 51.20, 0.53 | Police/concrete_white | 252 | 9.307 |
| 11.50, 51.20, 0.52 | Police/concrete_white | 252 | 9.307 |
| 5.33, 51.20, 8.59 | Police/concrete_white | 328 | 12.08 |
| 5.32, 51.20, 4.55 | Police/concrete_white | 328 | 12.08 |
| -1.42, 51.20, 12.61 | Police/concrete_white | 274 | 10.17 |
| 1.96, 51.20, 12.60 | Police/concrete_white | 274 | 10.133 |
| -4.81, 51.20, 3.17 | Police/concrete_white | 385 | 14.2 |
| -4.80, 51.20, 7.89 | Police/concrete_white | 385 | 14.163 |
| -2.05, 51.20, -1.56 | Police/concrete_white | 114 | 4.187 |
| -3.42, 51.20, -1.55 | Police/concrete_white | 114 | 4.187 |
| -0.66, 51.20, -9.86 | Police/concrete_white | 337 | 12.45 |
| -0.65, 51.20, -5.70 | Police/concrete_white | 337 | 12.45 |
| 9.51, 51.20, -14.01 | Police/concrete_white | 412 | 15.29 |
| 4.42, 51.20, -14.00 | Police/concrete_white | 412 | 15.253 |
| 14.62, 51.30, -4.31 | Police/concrete_white | 97 | 14.571 |
| 14.62, 51.25, -9.17 | Police/concrete_white | 97 | 14.571 |
| 8.44, 51.30, 0.55 | Police/concrete_white | 62 | 9.271 |
| 11.53, 51.25, 0.55 | Police/concrete_white | 62 | 9.271 |
| 5.34, 51.30, 8.60 | Police/concrete_white | 81 | 12.081 |
| 5.34, 51.25, 4.57 | Police/concrete_white | 81 | 12.081 |
| -1.44, 51.30, 12.63 | Police/concrete_white | 68 | 10.171 |
| 1.96, 51.25, 12.63 | Police/concrete_white | 68 | 10.171 |
| -4.83, 51.30, 3.16 | Police/concrete_white | 95 | 14.201 |
| -4.83, 51.25, 7.89 | Police/concrete_white | 95 | 14.201 |
| -0.68, 51.30, -9.88 | Police/concrete_white | 83 | 12.451 |
| -0.68, 51.25, -5.72 | Police/concrete_white | 83 | 12.451 |
| 9.52, 51.30, -14.03 | Police/concrete_white | 102 | 15.291 |
| 4.42, 51.25, -14.03 | Police/concrete_white | 102 | 15.291 |
| 14.59, 51.35, -4.31 | Police/concrete_white | 393 | 14.533 |
| 14.60, 51.35, -9.16 | Police/concrete_white | 393 | 14.57 |
| 8.41, 51.35, 0.52 | Police/concrete_white | 250 | 9.27 |
| 11.51, 51.35, 0.53 | Police/concrete_white | 250 | 9.27 |

(6568 more in the JSON)

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| 25.80, 47.50, 20.10 | Police/galvanised_steel | 3 |
| 25.80, 47.50, 14.70 | Police/galvanised_steel | 3 |
| 25.80, 49.25, 20.10 | Police/galvanised_steel | 3 |
| 25.80, 49.25, 14.70 | Police/galvanised_steel | 3 |
| 26.32, 47.03, -18.41 | Police/cast_iron_green | 4 |
| 26.32, 48.73, -18.41 | Police/cast_iron_green | 4 |
| 26.32, 47.03, -16.97 | Police/cast_iron_green | 4 |
| 26.32, 48.73, -16.97 | Police/cast_iron_green | 4 |
| 26.32, 47.03, -16.83 | Police/cast_iron_green | 4 |
| 26.32, 48.73, -16.83 | Police/cast_iron_green | 4 |
| 26.32, 47.03, -15.39 | Police/cast_iron_green | 4 |
| 26.32, 48.73, -15.39 | Police/cast_iron_green | 4 |

## tjunction (warn, 728)

| at | part | edge_m |
|---|---|---|
| 14.59, 51.72, 0.52 | Police/brick_yellow | 0.77 |
| 14.59, 57.55, 0.52 | Police/brick_yellow | 0.95 |
| 14.59, 48.25, -0.23 | Police/brick_yellow | 2.7 |
| 14.59, 48.25, -1.43 | Police/brick_yellow | 2.7 |
| 14.43, 50.55, -1.36 | Police/brick_yellow | 1.2 |
| 14.46, 48.57, -2.83 | Police/brick_yellow | 2.03 |
| 14.46, 48.57, -4.17 | Police/brick_yellow | 2.03 |
| 14.46, 50.55, -4.11 | Police/brick_yellow | 1.35 |
| 14.46, 48.57, -5.28 | Police/brick_yellow | 2.03 |
| 14.46, 48.57, -6.63 | Police/brick_yellow | 2.03 |
| 14.46, 50.55, -6.56 | Police/brick_yellow | 1.35 |
| 14.46, 48.57, -8.93 | Police/brick_yellow | 2.03 |
| 14.46, 48.57, -10.28 | Police/brick_yellow | 2.03 |
| 14.46, 50.55, -10.21 | Police/brick_yellow | 1.35 |
| 14.46, 48.57, -11.47 | Police/brick_yellow | 2.03 |
| 14.46, 48.57, -12.82 | Police/brick_yellow | 2.03 |
| 14.46, 50.55, -12.76 | Police/brick_yellow | 1.35 |
| 14.46, 52.17, -0.15 | Police/brick_yellow | 1.93 |
| 14.46, 52.17, -2.05 | Police/brick_yellow | 1.93 |
| 14.46, 54.05, -1.98 | Police/brick_yellow | 1.9 |
| 14.59, 54.05, -1.43 | Police/brick_yellow | 1.9 |
| 14.46, 52.17, -2.55 | Police/brick_yellow | 1.93 |
| 14.46, 52.17, -4.45 | Police/brick_yellow | 1.93 |
| 14.46, 54.05, -4.38 | Police/brick_yellow | 1.9 |
| 14.59, 54.05, -4.17 | Police/brick_yellow | 1.9 |
| 14.46, 52.17, -4.95 | Police/brick_yellow | 1.93 |
| 14.46, 52.17, -6.85 | Police/brick_yellow | 1.93 |
| 14.46, 54.05, -6.78 | Police/brick_yellow | 1.9 |
| 14.59, 54.05, -6.63 | Police/brick_yellow | 1.9 |
| 14.46, 55.47, -0.15 | Police/brick_yellow | 1.93 |
| 14.46, 55.47, -2.05 | Police/brick_yellow | 1.93 |
| 14.46, 57.35, -1.98 | Police/brick_yellow | 1.9 |
| 14.59, 57.35, -1.43 | Police/brick_yellow | 1.9 |
| 14.46, 55.47, -2.55 | Police/brick_yellow | 1.93 |
| 14.46, 55.47, -4.45 | Police/brick_yellow | 1.93 |
| 14.46, 57.35, -4.38 | Police/brick_yellow | 1.9 |
| 14.59, 57.35, -4.17 | Police/brick_yellow | 1.9 |
| 14.46, 55.47, -4.95 | Police/brick_yellow | 1.93 |
| 14.46, 55.47, -6.85 | Police/brick_yellow | 1.93 |
| 14.46, 57.35, -6.78 | Police/brick_yellow | 1.9 |

(688 more in the JSON)

## seam (info, 1758)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.32, 51.35, 10.80 | Police/brick_yellow + Police/concrete_white | 40.5 | 47 | 90 |
| 5.32, 58.30, 12.23 | Police/brick_yellow + Police/concrete_white | 40.5 | 46 | 90 |
| 14.59, 51.35, 0.21 | Police/brick_yellow + Police/concrete_white | 29.76 | 39 | 90 |
| 14.59, 51.20, -0.13 | Police/brick_yellow + Police/concrete_white | 29.14 | 37 | 90 |
| 14.59, 58.30, 0.21 | Police/brick_yellow + Police/concrete_white | 29.76 | 37 | 90 |
| 24.60, 47.18, -4.41 | Police/stone_blue + Police/galvanised_steel | 0.34 | 34 | 89.8 |
| 24.59, 47.23, -1.43 | Police/stone_blue + Police/galvanised_steel | 0.34 | 34 | 89.8 |
| 24.60, 47.31, 1.59 | Police/stone_blue + Police/galvanised_steel | 0.34 | 34 | 89.8 |
| 1.61, 58.62, -3.45 | Police/roof_membrane + Police/galvanised_steel | 0.34 | 32 | 90 |
| 3.55, 58.62, -2.61 | Police/roof_membrane + Police/galvanised_steel | 0.34 | 32 | 90 |
| 0.83, 58.62, -8.04 | Police/roof_membrane + Police/galvanised_steel | 0.34 | 32 | 90 |
| 3.55, 59.17, -2.61 | Police/galvanised_steel + Police/galvanised_steel | 0.34 | 28 | 90 |
| 0.85, 59.17, -8.01 | Police/galvanised_steel + Police/galvanised_steel | 0.34 | 28 | 90 |
| 1.65, 59.17, -3.41 | Police/galvanised_steel + Police/galvanised_steel | 0.34 | 25 | 90 |
| 14.59, 52.08, -0.15 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -0.15 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 14.59, 52.08, -2.54 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -2.54 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 14.59, 52.08, -4.94 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -4.94 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 5.32, 52.08, 5.61 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 5.32, 55.38, 5.61 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| -3.37, 52.08, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| -3.37, 55.38, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| -0.72, 52.08, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| -0.71, 55.38, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 1.93, 52.08, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 1.94, 55.38, 12.60 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| -4.80, 52.08, 5.03 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 55.38, 5.03 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| -4.80, 52.08, 9.03 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 55.38, 9.03 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 13.77, 52.08, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 13.76, 55.38, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 10.17, 52.08, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 10.17, 55.38, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 6.57, 52.08, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 6.57, 55.38, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |
| 2.97, 52.08, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.4 |
| 2.97, 55.38, -14.00 | Police/brick_yellow + Police/concrete_white | 2.46 | 23 | 81.3 |

(1718 more in the JSON)

## opening (info, 1139)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.59, 52.17, 0.52 | Police/brick_yellow | 1 + 0 + 0 | 1.93 |
| 14.59, 54.10, 0.52 | Police/brick_yellow | 1 + 0 + 0 | 1.37 |
| 14.59, 55.47, 0.52 | Police/brick_yellow | 1 + 0 + 0 | 1.93 |
| 14.59, 51.40, 0.52 | Police/brick_yellow | 0 + 0 + 1 | 0.37 |
| 14.59, 58.25, 0.52 | Police/brick_yellow | 0 + 0 + 1 | 0.75 |
| -4.80, 50.60, 12.60 | Police/brick_yellow | -1 + 0 + 0 | 0.38 |
| -4.80, 50.98, 12.60 | Police/brick_yellow | -1 + 0 + 0 | 0.27 |
| -0.65, 48.30, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 0.27 |
| -0.65, 48.57, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 2.03 |
| -0.65, 51.15, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 0.65 |
| -0.65, 51.40, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 0.77 |
| -0.65, 52.17, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 1.93 |
| -0.65, 54.10, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 1.37 |
| -0.65, 55.47, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 1.93 |
| -0.65, 58.25, -14.00 | Police/brick_yellow | 0 + 0 + -1 | 0.95 |
| -6.55, 48.30, -3.78 | Police/brick_yellow | -1 + 0 + 0 | 2.48 |
| -6.55, 48.30, 2.40 | Police/brick_yellow | 0 + 0 + 1 | 2.3 |
| -6.55, 50.69, 2.40 | Police/brick_yellow | 0 + 0 + 1 | 0.18 |
| -4.66, 48.57, 6.15 | Police/concrete_white | 0.15 + -0.99 + 0 | 1.43 |
| 14.59, 47.11, -0.13 | Police/stone_blue | 1 + 0 + 0 | 0.05 |
| 14.59, 47.16, -0.10 | Police/stone_blue | 1 + 0 + 0 | 0.74 |
| 14.59, 47.11, -0.19 | Police/stone_blue | 1 + 0 + 0 | 0.08 |
| 14.59, 47.11, -0.28 | Police/stone_blue | 1 + 0 + 0 | 1.2 |
| 14.59, 47.11, -1.48 | Police/stone_blue | 1 + 0 + 0 | 0.62 |
| 14.59, 47.11, -2.10 | Police/stone_blue | 1 + 0 + 0 | 0.5 |
| 14.59, 47.11, -2.60 | Police/stone_blue | 1 + 0 + 0 | 0.275 |
| 14.59, 47.11, -2.87 | Police/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -4.22 | Police/stone_blue | 1 + 0 + 0 | 0.275 |
| 14.59, 47.11, -4.50 | Police/stone_blue | 1 + 0 + 0 | 0.5 |
| 14.59, 47.11, -5.00 | Police/stone_blue | 1 + 0 + 0 | 0.325 |
| 14.59, 47.11, -5.32 | Police/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -6.68 | Police/stone_blue | 1 + 0 + 0 | 0.225 |
| 14.59, 47.11, -6.90 | Police/stone_blue | 1 + 0 + 0 | 2.075 |
| 14.59, 47.11, -8.97 | Police/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -10.32 | Police/stone_blue | 1 + 0 + 0 | 1.2 |
| 14.59, 47.11, -11.52 | Police/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -12.87 | Police/stone_blue | 1 + 0 + 0 | 1.175 |
| 5.38, 47.43, 0.52 | Police/stone_blue | 0 + 0 + 1 | 0.33 |
| 5.70, 47.43, 0.52 | Police/stone_blue | 0 + 0 + 1 | 0.55 |
| 6.26, 47.43, 0.52 | Police/stone_blue | 0 + 0 + 1 | 0.45 |

(1099 more in the JSON)

## backtoback (info, 679)

| at | parts | area |
|---|---|---|
| 14.48, 49.18, -2.83 | Police/brick_yellow + Police/painted_metal_white | 0.04055 |
| 14.48, 50.00, -2.83 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.49, 48.82, -2.83 | Police/brick_yellow + Police/painted_metal_white | 0.0166 |
| 14.49, 50.29, -4.17 | Police/brick_yellow + Police/painted_metal_white | 0.01938 |
| 14.48, 49.13, -4.17 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.48, 49.78, -4.17 | Police/brick_yellow + Police/painted_metal_white | 0.03777 |
| 14.48, 49.18, -5.28 | Police/brick_yellow + Police/painted_metal_white | 0.04055 |
| 14.48, 50.00, -5.28 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.49, 48.82, -5.28 | Police/brick_yellow + Police/painted_metal_white | 0.0166 |
| 14.49, 50.29, -6.63 | Police/brick_yellow + Police/painted_metal_white | 0.01938 |
| 14.48, 49.13, -6.63 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.48, 49.78, -6.63 | Police/brick_yellow + Police/painted_metal_white | 0.03777 |
| 14.48, 49.18, -8.93 | Police/brick_yellow + Police/painted_metal_white | 0.04055 |
| 14.48, 50.00, -8.93 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.49, 48.82, -8.93 | Police/brick_yellow + Police/painted_metal_white | 0.0166 |
| 14.49, 50.29, -10.28 | Police/brick_yellow + Police/painted_metal_white | 0.01938 |
| 14.48, 49.13, -10.28 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.48, 49.78, -10.28 | Police/brick_yellow + Police/painted_metal_white | 0.03777 |
| 14.48, 49.18, -11.47 | Police/brick_yellow + Police/painted_metal_white | 0.04055 |
| 14.48, 50.00, -11.47 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.49, 48.82, -11.47 | Police/brick_yellow + Police/painted_metal_white | 0.0166 |
| 14.49, 50.29, -12.82 | Police/brick_yellow + Police/painted_metal_white | 0.01938 |
| 14.48, 49.13, -12.82 | Police/brick_yellow + Police/painted_metal_white | 0.04105 |
| 14.48, 49.78, -12.82 | Police/brick_yellow + Police/painted_metal_white | 0.03777 |
| 14.48, 52.75, -0.15 | Police/brick_yellow + Police/painted_metal_white | 0.0386 |
| 14.48, 53.53, -0.15 | Police/brick_yellow + Police/painted_metal_white | 0.03897 |
| 14.49, 52.41, -0.15 | Police/brick_yellow + Police/painted_metal_white | 0.01565 |
| 14.49, 53.80, -2.05 | Police/brick_yellow + Police/painted_metal_white | 0.01843 |
| 14.48, 52.70, -2.05 | Police/brick_yellow + Police/painted_metal_white | 0.03897 |
| 14.48, 53.47, -2.05 | Police/brick_yellow + Police/painted_metal_white | 0.03582 |
| 14.48, 52.75, -2.55 | Police/brick_yellow + Police/painted_metal_white | 0.0386 |
| 14.48, 53.53, -2.55 | Police/brick_yellow + Police/painted_metal_white | 0.03897 |
| 14.49, 52.41, -2.55 | Police/brick_yellow + Police/painted_metal_white | 0.01565 |
| 14.49, 53.80, -4.45 | Police/brick_yellow + Police/painted_metal_white | 0.01843 |
| 14.48, 52.70, -4.45 | Police/brick_yellow + Police/painted_metal_white | 0.03897 |
| 14.48, 53.47, -4.45 | Police/brick_yellow + Police/painted_metal_white | 0.03582 |
| 14.48, 52.75, -4.95 | Police/brick_yellow + Police/painted_metal_white | 0.0386 |
| 14.48, 53.53, -4.95 | Police/brick_yellow + Police/painted_metal_white | 0.03897 |
| 14.49, 52.41, -4.95 | Police/brick_yellow + Police/painted_metal_white | 0.01565 |
| 14.49, 53.80, -6.85 | Police/brick_yellow + Police/painted_metal_white | 0.01843 |

(639 more in the JSON)


Nodes: Police. Distances: {"Police":105,"Police_far":440,"Police_lod2":2000}. Quantum 0.204 mm. Offset 0,40,0.
