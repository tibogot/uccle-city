# Mesh audit (before pack): police.far

6,348 triangles, 6,127 welded vertices, 4,848 open edges, 655,148 rays, 1465 ms.

**0 blocking**, 1374 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 766 |
| nonmanifold | warn | 12 |
| tjunction | warn | 596 |
| seam | info | 345 |
| opening | info | 846 |
| backtoback | info | 145 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 766)

| at | part | aspect | longest |
|---|---|---|---|
| 14.59, 49.20, -0.13 | Police_far/brick_yellow | 41 | 2.031 |
| 14.59, 49.87, -0.12 | Police_far/brick_yellow | 41 | 2.031 |
| 5.65, 55.61, 0.45 | Police_far/brick_yellow | 58 | 5.831 |
| 5.65, 53.66, 0.49 | Police_far/brick_yellow | 58 | 5.831 |
| 6.65, 55.61, 0.49 | Police_far/brick_yellow | 58 | 5.831 |
| 6.65, 53.66, 0.45 | Police_far/brick_yellow | 58 | 5.831 |
| 14.60, 51.20, -4.32 | Police_far/concrete_white | 394 | 14.57 |
| 14.59, 51.20, -9.17 | Police_far/concrete_white | 394 | 14.533 |
| 8.42, 51.20, 0.53 | Police_far/concrete_white | 253 | 9.307 |
| 11.50, 51.20, 0.52 | Police_far/concrete_white | 253 | 9.307 |
| 5.33, 51.20, 8.59 | Police_far/concrete_white | 326 | 12.08 |
| 5.32, 51.20, 4.55 | Police_far/concrete_white | 326 | 12.08 |
| -1.42, 51.20, 12.61 | Police_far/concrete_white | 275 | 10.17 |
| 1.96, 51.20, 12.60 | Police_far/concrete_white | 275 | 10.133 |
| -4.81, 51.20, 3.17 | Police_far/concrete_white | 384 | 14.2 |
| -4.80, 51.20, 7.89 | Police_far/concrete_white | 384 | 14.163 |
| -2.05, 51.20, -1.56 | Police_far/concrete_white | 114 | 4.187 |
| -3.42, 51.20, -1.55 | Police_far/concrete_white | 114 | 4.187 |
| -0.66, 51.20, -9.86 | Police_far/concrete_white | 336 | 12.45 |
| -0.65, 51.20, -5.70 | Police_far/concrete_white | 336 | 12.45 |
| 9.51, 51.20, -14.01 | Police_far/concrete_white | 413 | 15.29 |
| 4.42, 51.20, -14.00 | Police_far/concrete_white | 413 | 15.253 |
| 14.62, 51.30, -4.31 | Police_far/concrete_white | 97 | 14.571 |
| 14.62, 51.25, -9.17 | Police_far/concrete_white | 97 | 14.571 |
| 8.44, 51.30, 0.55 | Police_far/concrete_white | 62 | 9.271 |
| 11.53, 51.25, 0.55 | Police_far/concrete_white | 62 | 9.271 |
| 5.34, 51.30, 8.60 | Police_far/concrete_white | 81 | 12.081 |
| 5.34, 51.25, 4.57 | Police_far/concrete_white | 81 | 12.081 |
| -1.44, 51.30, 12.63 | Police_far/concrete_white | 68 | 10.171 |
| 1.96, 51.25, 12.63 | Police_far/concrete_white | 68 | 10.171 |
| -4.83, 51.30, 3.16 | Police_far/concrete_white | 95 | 14.201 |
| -4.83, 51.25, 7.89 | Police_far/concrete_white | 95 | 14.201 |
| -0.68, 51.30, -9.88 | Police_far/concrete_white | 83 | 12.451 |
| -0.68, 51.25, -5.72 | Police_far/concrete_white | 83 | 12.451 |
| 9.52, 51.30, -14.03 | Police_far/concrete_white | 102 | 15.291 |
| 4.42, 51.25, -14.03 | Police_far/concrete_white | 102 | 15.291 |
| 14.59, 51.35, -4.31 | Police_far/concrete_white | 394 | 14.533 |
| 14.60, 51.35, -9.16 | Police_far/concrete_white | 394 | 14.57 |
| 8.41, 51.35, 0.52 | Police_far/concrete_white | 251 | 9.27 |
| 11.51, 51.35, 0.53 | Police_far/concrete_white | 251 | 9.27 |

(726 more in the JSON)

## nonmanifold (warn, 12)

| at | part | uses |
|---|---|---|
| 25.80, 47.50, 20.10 | Police_far/galvanised_steel | 3 |
| 25.80, 47.50, 14.70 | Police_far/galvanised_steel | 3 |
| 25.80, 49.25, 20.10 | Police_far/galvanised_steel | 3 |
| 25.80, 49.25, 14.70 | Police_far/galvanised_steel | 3 |
| 26.32, 47.03, -18.41 | Police_far/cast_iron_green | 4 |
| 26.32, 48.73, -18.41 | Police_far/cast_iron_green | 4 |
| 26.32, 47.03, -16.97 | Police_far/cast_iron_green | 4 |
| 26.32, 48.73, -16.97 | Police_far/cast_iron_green | 4 |
| 26.32, 47.03, -16.83 | Police_far/cast_iron_green | 4 |
| 26.32, 48.73, -16.83 | Police_far/cast_iron_green | 4 |
| 26.32, 47.03, -15.39 | Police_far/cast_iron_green | 4 |
| 26.32, 48.73, -15.39 | Police_far/cast_iron_green | 4 |

## tjunction (warn, 596)

| at | part | edge_m |
|---|---|---|
| 14.59, 51.72, 0.52 | Police_far/brick_yellow | 0.77 |
| 14.59, 57.55, 0.52 | Police_far/brick_yellow | 0.95 |
| 14.59, 48.25, -0.23 | Police_far/brick_yellow | 2.7 |
| 14.59, 48.25, -1.43 | Police_far/brick_yellow | 2.7 |
| 14.43, 50.55, -1.36 | Police_far/brick_yellow | 1.2 |
| 14.46, 48.57, -2.83 | Police_far/brick_yellow | 2.03 |
| 14.46, 48.57, -4.17 | Police_far/brick_yellow | 2.03 |
| 14.46, 50.55, -4.11 | Police_far/brick_yellow | 1.35 |
| 14.46, 48.57, -5.28 | Police_far/brick_yellow | 2.03 |
| 14.46, 48.57, -6.63 | Police_far/brick_yellow | 2.03 |
| 14.46, 50.55, -6.56 | Police_far/brick_yellow | 1.35 |
| 14.46, 48.57, -8.93 | Police_far/brick_yellow | 2.03 |
| 14.46, 48.57, -10.28 | Police_far/brick_yellow | 2.03 |
| 14.46, 50.55, -10.21 | Police_far/brick_yellow | 1.35 |
| 14.46, 48.57, -11.47 | Police_far/brick_yellow | 2.03 |
| 14.46, 48.57, -12.82 | Police_far/brick_yellow | 2.03 |
| 14.46, 50.55, -12.76 | Police_far/brick_yellow | 1.35 |
| 14.46, 52.17, -0.15 | Police_far/brick_yellow | 1.93 |
| 14.46, 52.17, -2.05 | Police_far/brick_yellow | 1.93 |
| 14.46, 54.05, -1.98 | Police_far/brick_yellow | 1.9 |
| 14.59, 54.05, -1.43 | Police_far/brick_yellow | 1.9 |
| 14.46, 52.17, -2.55 | Police_far/brick_yellow | 1.93 |
| 14.46, 52.17, -4.45 | Police_far/brick_yellow | 1.93 |
| 14.46, 54.05, -4.38 | Police_far/brick_yellow | 1.9 |
| 14.59, 54.05, -4.17 | Police_far/brick_yellow | 1.9 |
| 14.46, 52.17, -4.95 | Police_far/brick_yellow | 1.93 |
| 14.46, 52.17, -6.85 | Police_far/brick_yellow | 1.93 |
| 14.46, 54.05, -6.78 | Police_far/brick_yellow | 1.9 |
| 14.59, 54.05, -6.63 | Police_far/brick_yellow | 1.9 |
| 14.46, 55.47, -0.15 | Police_far/brick_yellow | 1.93 |
| 14.46, 55.47, -2.05 | Police_far/brick_yellow | 1.93 |
| 14.46, 57.35, -1.98 | Police_far/brick_yellow | 1.9 |
| 14.59, 57.35, -1.43 | Police_far/brick_yellow | 1.9 |
| 14.46, 55.47, -2.55 | Police_far/brick_yellow | 1.93 |
| 14.46, 55.47, -4.45 | Police_far/brick_yellow | 1.93 |
| 14.46, 57.35, -4.38 | Police_far/brick_yellow | 1.9 |
| 14.59, 57.35, -4.17 | Police_far/brick_yellow | 1.9 |
| 14.46, 55.47, -4.95 | Police_far/brick_yellow | 1.93 |
| 14.46, 55.47, -6.85 | Police_far/brick_yellow | 1.93 |
| 14.46, 57.35, -6.78 | Police_far/brick_yellow | 1.9 |

(556 more in the JSON)

## seam (info, 345)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.32, 51.35, 10.80 | Police_far/brick_yellow + Police_far/concrete_white | 40.5 | 43 | 90 |
| 5.32, 58.30, 12.28 | Police_far/brick_yellow + Police_far/concrete_white | 40.5 | 43 | 90 |
| 14.59, 51.35, 0.21 | Police_far/brick_yellow + Police_far/concrete_white | 29.76 | 37 | 90 |
| 14.59, 58.30, 0.21 | Police_far/brick_yellow + Police_far/concrete_white | 29.76 | 37 | 90 |
| 14.59, 51.20, -0.13 | Police_far/brick_yellow + Police_far/concrete_white | 29.14 | 36 | 90 |
| 24.60, 47.18, -4.41 | Police_far/stone_blue + Police_far/galvanised_steel | 0.34 | 32 | 89.9 |
| 24.59, 47.23, -1.43 | Police_far/stone_blue + Police_far/galvanised_steel | 0.34 | 32 | 89.9 |
| 24.60, 47.31, 1.59 | Police_far/stone_blue + Police_far/galvanised_steel | 0.34 | 32 | 89.9 |
| 1.61, 58.62, -3.45 | Police_far/roof_membrane + Police_far/galvanised_steel | 0.34 | 32 | 90 |
| 3.55, 58.62, -2.61 | Police_far/roof_membrane + Police_far/galvanised_steel | 0.34 | 32 | 90 |
| 0.83, 58.62, -8.04 | Police_far/roof_membrane + Police_far/galvanised_steel | 0.34 | 32 | 90 |
| 14.59, 52.08, -0.15 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -0.15 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 52.08, -2.54 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -2.54 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 52.08, -4.94 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 14.59, 55.38, -4.94 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 5.32, 52.08, 5.61 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 5.32, 55.38, 5.61 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -3.37, 52.08, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -3.37, 55.38, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -0.72, 52.08, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -0.71, 55.38, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 1.93, 52.08, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 1.94, 55.38, 12.60 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 52.08, 5.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 55.38, 5.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 52.08, 9.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| -4.80, 55.38, 9.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 13.77, 52.08, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 13.76, 55.38, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 10.17, 52.08, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 10.17, 55.38, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 6.57, 52.08, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 6.57, 55.38, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 2.97, 52.08, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 2.97, 55.38, -14.00 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 23 | 81.4 |
| 5.63, 51.68, 0.52 | Police_far/brick_yellow + Police_far/concrete_white | 1.5 | 21 | 79.8 |
| -4.80, 52.08, 1.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 21 | 81.4 |
| -4.80, 55.38, 1.03 | Police_far/brick_yellow + Police_far/concrete_white | 2.46 | 21 | 81.4 |

(305 more in the JSON)

## opening (info, 846)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.59, 52.17, 0.52 | Police_far/brick_yellow | 1 + 0 + 0 | 1.93 |
| 14.59, 54.10, 0.52 | Police_far/brick_yellow | 1 + 0 + 0 | 1.37 |
| 14.59, 55.47, 0.52 | Police_far/brick_yellow | 1 + 0 + 0 | 1.93 |
| 14.59, 51.40, 0.52 | Police_far/brick_yellow | 0 + 0 + 1 | 0.37 |
| 14.59, 58.25, 0.52 | Police_far/brick_yellow | 0 + 0 + 1 | 0.75 |
| -4.80, 50.60, 12.60 | Police_far/brick_yellow | -1 + 0 + 0 | 0.38 |
| -4.80, 50.98, 12.60 | Police_far/brick_yellow | -1 + 0 + 0 | 0.27 |
| -0.65, 48.30, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 0.27 |
| -0.65, 48.57, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 2.03 |
| -0.65, 51.15, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 0.65 |
| -0.65, 51.40, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 0.77 |
| -0.65, 52.17, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 1.93 |
| -0.65, 54.10, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 1.37 |
| -0.65, 55.47, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 1.93 |
| -0.65, 58.25, -14.00 | Police_far/brick_yellow | 0 + 0 + -1 | 0.95 |
| -6.55, 48.30, -3.78 | Police_far/brick_yellow | -1 + 0 + 0 | 2.48 |
| -6.55, 48.30, 2.40 | Police_far/brick_yellow | 0 + 0 + 1 | 2.3 |
| -6.55, 50.69, 2.40 | Police_far/brick_yellow | 0 + 0 + 1 | 0.18 |
| -4.66, 48.57, 6.15 | Police_far/concrete_white | 0.15 + -0.99 + 0 | 1.43 |
| 14.59, 47.11, -0.13 | Police_far/stone_blue | 1 + 0 + 0 | 0.05 |
| 14.59, 47.16, -0.10 | Police_far/stone_blue | 1 + 0 + 0 | 0.74 |
| 14.59, 47.11, -0.19 | Police_far/stone_blue | 1 + 0 + 0 | 0.08 |
| 14.59, 47.11, -0.28 | Police_far/stone_blue | 1 + 0 + 0 | 1.2 |
| 14.59, 47.11, -1.48 | Police_far/stone_blue | 1 + 0 + 0 | 0.62 |
| 14.59, 47.11, -2.10 | Police_far/stone_blue | 1 + 0 + 0 | 0.5 |
| 14.59, 47.11, -2.60 | Police_far/stone_blue | 1 + 0 + 0 | 0.275 |
| 14.59, 47.11, -2.87 | Police_far/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -4.22 | Police_far/stone_blue | 1 + 0 + 0 | 0.275 |
| 14.59, 47.11, -4.50 | Police_far/stone_blue | 1 + 0 + 0 | 0.5 |
| 14.59, 47.11, -5.00 | Police_far/stone_blue | 1 + 0 + 0 | 0.325 |
| 14.59, 47.11, -5.33 | Police_far/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -6.68 | Police_far/stone_blue | 1 + 0 + 0 | 0.225 |
| 14.59, 47.11, -6.90 | Police_far/stone_blue | 1 + 0 + 0 | 2.075 |
| 14.59, 47.11, -8.97 | Police_far/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -10.32 | Police_far/stone_blue | 1 + 0 + 0 | 1.2 |
| 14.59, 47.11, -11.53 | Police_far/stone_blue | 1 + 0 + 0 | 1.35 |
| 14.59, 47.11, -12.87 | Police_far/stone_blue | 1 + 0 + 0 | 1.175 |
| 5.38, 47.43, 0.52 | Police_far/stone_blue | 0 + 0 + 1 | 0.33 |
| 5.71, 47.43, 0.52 | Police_far/stone_blue | 0 + 0 + 1 | 0.55 |
| 6.25, 47.43, 0.52 | Police_far/stone_blue | 0 + 0 + 1 | 0.45 |

(806 more in the JSON)

## backtoback (info, 145)

| at | parts | area |
|---|---|---|
| 6.87, 58.92, -0.24 | Police_far/concrete_white + Police_far/alu_anthracite | 0.22612 |
| 6.50, 58.92, -0.05 | Police_far/concrete_white + Police_far/alu_anthracite | 0.22388 |
| 6.50, 58.92, -0.65 | Police_far/concrete_white + Police_far/alu_anthracite | 0.22388 |
| 6.13, 58.92, -0.46 | Police_far/concrete_white + Police_far/alu_anthracite | 0.22612 |
| 4.32, 59.67, -4.71 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.43427 |
| 4.09, 59.67, -4.11 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.44573 |
| 3.81, 59.67, -5.29 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.44573 |
| 3.58, 59.67, -4.69 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.43427 |
| 25.81, 48.36, 14.76 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00047 |
| 25.82, 48.38, 14.76 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00133 |
| 25.78, 48.37, 14.76 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00133 |
| 25.79, 48.40, 14.76 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00047 |
| 25.79, 48.36, 20.04 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00047 |
| 25.79, 48.38, 20.04 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00133 |
| 25.82, 48.37, 20.04 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00133 |
| 25.81, 48.40, 20.04 | Police_far/galvanised_steel + Police_far/galvanised_steel | 0.00047 |
| 26.34, 48.82, -20.35 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.82, -20.33 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.82, -20.37 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.82, -20.36 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.34, 48.85, -18.85 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.85, -18.83 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.85, -18.87 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.85, -18.86 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.34, 48.92, -14.95 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.92, -14.93 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.92, -14.97 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.92, -14.96 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.34, 48.91, -12.53 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.91, -12.51 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.91, -12.55 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.91, -12.54 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.34, 48.91, -10.11 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.91, -10.09 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.91, -10.13 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.91, -10.12 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.34, 48.95, -7.69 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.33, 48.95, -7.67 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.32, 48.95, -7.71 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |
| 26.30, 48.95, -7.70 | Police_far/cast_iron_green + Police_far/cast_iron_green | 0.0009 |

(105 more in the JSON)


Nodes: Police_far. Distances: {"Police":105,"Police_far":440,"Police_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
