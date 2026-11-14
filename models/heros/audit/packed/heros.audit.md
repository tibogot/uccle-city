# Mesh audit: heros.glb

61,257 triangles, 32,307 welded vertices, 809 open edges, 84,114 rays, 3666 ms.

**0 blocking**, 3751 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 791 |
| sliver | warn | 2262 |
| winding | warn | 592 |
| nonmanifold | warn | 13 |
| tjunction | warn | 93 |
| seam | info | 1230 |
| opening | info | 163 |
| backtoback | info | 76 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 791)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -2.02, 1.60, -0.78 | Heros/plant_grass + Heros/plant_grass | 1.16 | 10.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.96, 1.60, -0.73 | Heros/plant_grass + Heros/plant_grass | 1.16 | 43.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.90, 1.60, -0.70 | Heros/plant_grass + Heros/plant_grass | 1.16 | 12 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.06, 1.60, -0.83 | Heros/plant_grass + Heros/plant_grass | 1.16 | 1.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.00, 1.60, -0.79 | Heros/plant_grass + Heros/plant_grass | 1.16 | 32.9 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.93, 1.60, -0.74 | Heros/plant_grass + Heros/plant_grass | 1.16 | 7.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.90, 1.60, -0.73 | Heros/plant_grass + Heros/plant_grass | 1.16 | 2.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.90, 1.60, -0.47 | Heros/plant_grass + Heros/plant_grass | 1.22 | 19.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.00, 1.60, -0.35 | Heros/plant_grass + Heros/plant_grass | 1.22 | 21.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.94, 1.60, -0.41 | Heros/plant_grass + Heros/plant_grass | 1.22 | 52.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.10, 1.60, -0.32 | Heros/plant_grass + Heros/plant_grass | 1.22 | 7.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.96, 1.60, -0.47 | Heros/plant_grass + Heros/plant_grass | 1.22 | 12.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.02, 1.60, -0.39 | Heros/plant_grass + Heros/plant_grass | 1.22 | 32.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.98, 1.60, -0.44 | Heros/plant_grass + Heros/plant_grass | 1.22 | 22.9 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.08, 1.60, -0.33 | Heros/plant_grass + Heros/plant_grass | 1.22 | 15 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.05, 1.60, -0.39 | Heros/plant_grass + Heros/plant_grass | 1.22 | 32.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.03, 1.60, -0.39 | Heros/plant_grass + Heros/plant_grass | 1.22 | 10.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.01, 1.60, -0.04 | Heros/plant_grass + Heros/plant_grass | 1.22 | 77.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.91, 1.60, 0.00 | Heros/plant_grass + Heros/plant_grass | 1.22 | 27.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.86, 1.60, 0.02 | Heros/plant_grass + Heros/plant_grass | 1.22 | 2.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.10, 1.60, -0.26 | Heros/plant_grass + Heros/plant_grass | 1.22 | 16.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.12, 1.60, -0.21 | Heros/plant_grass + Heros/plant_grass | 1.22 | 18.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.01, 1.60, -0.25 | Heros/plant_grass + Heros/plant_grass | 1.22 | 69.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.00, 1.60, -0.16 | Heros/plant_grass + Heros/plant_grass | 1.22 | 285.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.89, 1.60, -0.05 | Heros/plant_grass + Heros/plant_grass | 1.22 | 81.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.85, 1.60, 0.01 | Heros/plant_grass + Heros/plant_grass | 1.22 | 4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.91, 1.60, -0.21 | Heros/plant_grass + Heros/plant_grass | 1.22 | 2.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.86, 1.60, -0.10 | Heros/plant_grass + Heros/plant_grass | 1.22 | 47.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.90, 1.60, -0.19 | Heros/plant_grass + Heros/plant_grass | 1.22 | 7.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.83, 1.60, -0.01 | Heros/plant_grass + Heros/plant_grass | 1.22 | 2.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.95, 1.60, 0.16 | Heros/plant_grass + Heros/plant_grass | 1.16 | 3.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.90, 1.60, 0.13 | Heros/plant_grass + Heros/plant_grass | 1.16 | 3.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.94, 1.60, 0.15 | Heros/plant_grass + Heros/plant_grass | 1.16 | 2.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.92, 1.60, 0.14 | Heros/plant_grass + Heros/plant_grass | 1.16 | 3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.82, 1.60, 0.60 | Heros/plant_grass + Heros/plant_grass | 1.22 | 22.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.93, 1.60, 0.56 | Heros/plant_grass + Heros/plant_grass | 1.22 | 83.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.05, 1.60, 0.44 | Heros/plant_grass + Heros/plant_grass | 1.22 | 3.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.98, 1.60, 0.44 | Heros/plant_grass + Heros/plant_grass | 1.22 | 79.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.95, 1.60, 0.50 | Heros/plant_grass + Heros/plant_grass | 1.22 | 90.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.82, 1.60, 0.56 | Heros/plant_grass + Heros/plant_grass | 1.22 | 31.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |

(751 more in the JSON)

## sliver (warn, 2262)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 0.71, 4.00 | Heros/stone_blue | 41 | 0.786 |
| 0.45, 0.71, 3.31 | Heros/stone_blue | 56 | 4.456 |
| -0.74, 0.71, 3.28 | Heros/stone_blue | 59 | 3.577 |
| 0.74, 0.71, -3.28 | Heros/stone_blue | 59 | 3.577 |
| -0.45, 0.71, -3.31 | Heros/stone_blue | 56 | 4.456 |
| 0.00, 0.71, -4.00 | Heros/stone_blue | 41 | 0.786 |
| 3.23, 1.14, -0.34 | Heros/stone_blue | 57 | 2.032 |
| 3.22, 1.15, 0.34 | Heros/stone_blue | 57 | 2.032 |
| 2.81, 1.23, -0.29 | Heros/stone_blue | 87 | 1.731 |
| 2.80, 1.23, 0.29 | Heros/stone_blue | 87 | 1.731 |
| 2.81, 1.65, 0.29 | Heros/stone_blue | 87 | 1.731 |
| 2.80, 1.65, -0.29 | Heros/stone_blue | 87 | 1.731 |
| 2.52, 1.14, 2.04 | Heros/stone_blue | 58 | 2.032 |
| 2.04, 1.15, 2.51 | Heros/stone_blue | 58 | 2.032 |
| 2.19, 1.23, 1.78 | Heros/stone_blue | 86 | 1.731 |
| 1.78, 1.23, 2.19 | Heros/stone_blue | 86 | 1.731 |
| 1.78, 1.65, 2.19 | Heros/stone_blue | 86 | 1.731 |
| 2.19, 1.65, 1.78 | Heros/stone_blue | 86 | 1.731 |
| 0.34, 1.14, 3.23 | Heros/stone_blue | 57 | 2.032 |
| -0.34, 1.15, 3.22 | Heros/stone_blue | 57 | 2.032 |
| 0.29, 1.23, 2.81 | Heros/stone_blue | 87 | 1.731 |
| -0.29, 1.23, 2.80 | Heros/stone_blue | 87 | 1.731 |
| -0.29, 1.65, 2.81 | Heros/stone_blue | 87 | 1.731 |
| 0.29, 1.65, 2.80 | Heros/stone_blue | 87 | 1.731 |
| -2.04, 1.14, 2.52 | Heros/stone_blue | 58 | 2.032 |
| -2.51, 1.15, 2.04 | Heros/stone_blue | 58 | 2.032 |
| -1.78, 1.23, 2.19 | Heros/stone_blue | 86 | 1.731 |
| -2.19, 1.23, 1.78 | Heros/stone_blue | 86 | 1.731 |
| -2.19, 1.65, 1.78 | Heros/stone_blue | 86 | 1.731 |
| -1.78, 1.65, 2.19 | Heros/stone_blue | 86 | 1.731 |
| -3.23, 1.14, 0.34 | Heros/stone_blue | 57 | 2.032 |
| -3.22, 1.15, -0.34 | Heros/stone_blue | 57 | 2.032 |
| -2.81, 1.23, 0.29 | Heros/stone_blue | 87 | 1.731 |
| -2.80, 1.23, -0.29 | Heros/stone_blue | 87 | 1.731 |
| -2.81, 1.65, -0.29 | Heros/stone_blue | 87 | 1.731 |
| -2.80, 1.65, 0.29 | Heros/stone_blue | 87 | 1.731 |
| -2.52, 1.14, -2.04 | Heros/stone_blue | 58 | 2.032 |
| -2.04, 1.15, -2.51 | Heros/stone_blue | 58 | 2.032 |
| -2.19, 1.23, -1.78 | Heros/stone_blue | 86 | 1.731 |
| -1.78, 1.23, -2.19 | Heros/stone_blue | 86 | 1.731 |

(2222 more in the JSON)

## winding (warn, 592)

| at | part |
|---|---|
| 2.56, 2.49, 1.18 | Heros/cast_iron_green |
| 2.55, 2.49, 1.18 | Heros/cast_iron_green |
| 2.55, 2.49, 1.16 | Heros/cast_iron_green |
| 2.56, 2.49, 1.16 | Heros/cast_iron_green |
| 2.49, 2.49, 1.25 | Heros/cast_iron_green |
| 2.47, 2.49, 1.25 | Heros/cast_iron_green |
| 2.47, 2.49, 1.24 | Heros/cast_iron_green |
| 2.49, 2.49, 1.24 | Heros/cast_iron_green |
| 2.41, 2.49, 1.33 | Heros/cast_iron_green |
| 2.40, 2.49, 1.33 | Heros/cast_iron_green |
| 2.40, 2.49, 1.32 | Heros/cast_iron_green |
| 2.41, 2.49, 1.32 | Heros/cast_iron_green |
| 2.33, 2.49, 1.41 | Heros/cast_iron_green |
| 2.32, 2.49, 1.41 | Heros/cast_iron_green |
| 2.32, 2.49, 1.39 | Heros/cast_iron_green |
| 2.33, 2.49, 1.39 | Heros/cast_iron_green |
| 2.25, 2.49, 1.48 | Heros/cast_iron_green |
| 2.24, 2.49, 1.48 | Heros/cast_iron_green |
| 2.24, 2.49, 1.47 | Heros/cast_iron_green |
| 2.25, 2.49, 1.47 | Heros/cast_iron_green |
| 2.18, 2.49, 1.56 | Heros/cast_iron_green |
| 2.17, 2.49, 1.56 | Heros/cast_iron_green |
| 2.17, 2.49, 1.55 | Heros/cast_iron_green |
| 2.18, 2.49, 1.55 | Heros/cast_iron_green |
| 2.10, 2.49, 1.64 | Heros/cast_iron_green |
| 2.09, 2.49, 1.64 | Heros/cast_iron_green |
| 2.09, 2.49, 1.63 | Heros/cast_iron_green |
| 2.10, 2.49, 1.63 | Heros/cast_iron_green |
| 2.02, 2.49, 1.72 | Heros/cast_iron_green |
| 2.01, 2.49, 1.72 | Heros/cast_iron_green |
| 2.01, 2.49, 1.70 | Heros/cast_iron_green |
| 2.02, 2.49, 1.70 | Heros/cast_iron_green |
| 1.95, 2.49, 1.79 | Heros/cast_iron_green |
| 1.93, 2.49, 1.79 | Heros/cast_iron_green |
| 1.93, 2.49, 1.78 | Heros/cast_iron_green |
| 1.95, 2.49, 1.78 | Heros/cast_iron_green |
| 1.79, 2.49, 1.95 | Heros/cast_iron_green |
| 1.78, 2.49, 1.95 | Heros/cast_iron_green |
| 1.78, 2.49, 1.93 | Heros/cast_iron_green |
| 1.79, 2.49, 1.93 | Heros/cast_iron_green |

(552 more in the JSON)

## nonmanifold (warn, 13)

| at | part | uses |
|---|---|---|
| -0.03, 10.48, -0.47 | Heros/bronze_gilt | 4 |
| -0.03, 10.43, -0.38 | Heros/bronze_gilt | 4 |
| -0.02, 10.44, -0.36 | Heros/bronze_gilt | 3 |
| 0.09, 9.13, 0.13 | Heros/bronze_gilt | 3 |
| -0.12, 9.28, -0.20 | Heros/bronze_gilt | 3 |
| -0.07, 9.29, -0.25 | Heros/bronze_gilt | 3 |
| 0.32, 9.35, 1.38 | Heros/bronze_gilt | 3 |
| 0.32, 9.35, 1.38 | Heros/bronze_gilt | 3 |
| 0.33, 9.36, 1.41 | Heros/bronze_gilt | 4 |
| 0.45, 8.47, -0.01 | Heros/bronze_gilt | 3 |
| -0.14, 8.93, 0.02 | Heros/bronze_gilt | 4 |
| 0.33, 8.92, 0.58 | Heros/bronze_gilt | 4 |
| 0.07, 8.15, 0.14 | Heros/bronze_gilt | 3 |

## tjunction (warn, 93)

| at | part | edge_m |
|---|---|---|
| 3.18, 1.07, -1.02 | Heros/stone_blue | 0.42 |
| 3.18, 1.07, 1.02 | Heros/stone_blue | 0.42 |
| 3.21, 1.16, -0.84 | Heros/stone_blue | 2.031 |
| 2.81, 1.16, -1.02 | Heros/stone_blue | 2.331 |
| 2.97, 1.07, 1.53 | Heros/stone_blue | 0.42 |
| 1.53, 1.07, 2.97 | Heros/stone_blue | 0.42 |
| 1.27, 1.16, 2.71 | Heros/stone_blue | 2.331 |
| 1.02, 1.07, 3.18 | Heros/stone_blue | 0.42 |
| -1.02, 1.07, 3.18 | Heros/stone_blue | 0.42 |
| -1.02, 1.16, 2.81 | Heros/stone_blue | 2.331 |
| -1.53, 1.07, 2.97 | Heros/stone_blue | 0.42 |
| -2.97, 1.07, 1.53 | Heros/stone_blue | 0.42 |
| -2.71, 1.16, 1.27 | Heros/stone_blue | 2.331 |
| -3.18, 1.07, 1.02 | Heros/stone_blue | 0.42 |
| -3.18, 1.07, -1.02 | Heros/stone_blue | 0.42 |
| -2.81, 1.16, -1.02 | Heros/stone_blue | 2.331 |
| -2.97, 1.07, -1.53 | Heros/stone_blue | 0.42 |
| -1.53, 1.07, -2.97 | Heros/stone_blue | 0.42 |
| -2.71, 1.16, -1.27 | Heros/stone_blue | 2.331 |
| -1.02, 1.07, -3.18 | Heros/stone_blue | 0.42 |
| 1.02, 1.07, -3.18 | Heros/stone_blue | 0.42 |
| -1.02, 1.16, -2.81 | Heros/stone_blue | 2.331 |
| 1.53, 1.07, -2.97 | Heros/stone_blue | 0.42 |
| 2.97, 1.07, -1.53 | Heros/stone_blue | 0.42 |
| 1.27, 1.16, -2.71 | Heros/stone_blue | 2.331 |
| 0.83, 2.91, -0.33 | Heros/stone_blue | 1.568 |
| 0.82, 3.69, -0.32 | Heros/stone_blue | 1.531 |
| 0.80, 2.91, -0.30 | Heros/stone_blue | 0.655 |
| 0.80, 2.92, -0.33 | Heros/stone_blue | 0.78 |
| 0.79, 3.69, -0.31 | Heros/stone_blue | 0.64 |
| 0.80, 2.92, 0.33 | Heros/stone_blue | 0.78 |
| 0.83, 2.91, -0.78 | Heros/stone_blue | 1.243 |
| 0.83, 2.91, 0.78 | Heros/stone_blue | 1.243 |
| 8.33, 0.27, -2.29 | Heros/stone_blue | 0.647 |
| 8.58, 0.27, 0.70 | Heros/stone_blue | 0.647 |
| 8.33, -0.23, -2.29 | Heros/stone_blue | 0.678 |
| 8.75, 0.10, -2.32 | Heros/stone_blue | 0.648 |
| 8.58, -0.23, 0.70 | Heros/stone_blue | 0.678 |
| 8.99, 0.10, 0.67 | Heros/stone_blue | 0.648 |
| 8.75, -0.41, -2.32 | Heros/stone_blue | 0.677 |

(53 more in the JSON)

## seam (info, 1230)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.80, 2.91, -0.30 | Heros/stone_blue + Heros/stone_blue | 1.43 | 150 | 41.1 |
| 8.33, 0.45, 0.69 | Heros/stone_blue + Heros/stone_blue | 7.91 | 109 | 89.4 |
| 8.19, 0.45, -2.25 | Heros/stone_blue + Heros/stone_blue | 7.91 | 106 | 89.4 |
| -0.36, 7.15, 0.07 | Heros/stone_blue + Heros/bronze_gilt | 2.33 | 91 | 5.5 |
| 3.09, 1.28, 1.23 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| 1.32, 1.28, 3.05 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| -1.23, 1.28, 3.09 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| -1.32, 1.28, -3.05 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| 1.23, 1.28, -3.09 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| 3.05, 1.28, -1.32 | Heros/stone_blue + Heros/stone_blue | 0.33 | 84 | 79.5 |
| -1.66, 1.61, 0.16 | Heros/plant_grass + Heros/plant_grass | 1.21 | 45 | 14 |
| 2.97, 1.55, 1.17 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 9 |
| 1.27, 1.55, 2.92 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 8.9 |
| -1.16, 1.56, 2.97 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 9 |
| -1.27, 1.55, -2.92 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 8.9 |
| 1.17, 1.55, -2.97 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 9 |
| 2.92, 1.55, -1.27 | Heros/stone_blue + Heros/stone_blue | 0.41 | 44 | 8.9 |
| -12.06, 1.15, 19.33 | Heros/stone_blue + Heros/stone_blue | 3.25 | 43 | 89.2 |
| -10.06, 1.15, 20.55 | Heros/stone_blue + Heros/stone_blue | 3.25 | 43 | 89.2 |
| 2.01, 1.50, 0.05 | Heros/plant_grass + Heros/plant_grass | 1.33 | 43 | 16 |
| -2.17, 1.62, 0.89 | Heros/plant_grass + Heros/plant_grass | 1.25 | 42 | 31 |
| -0.58, 1.57, 1.50 | Heros/plant_grass + Heros/plant_grass | 1.2 | 42 | 15.8 |
| 0.87, 1.58, -1.94 | Heros/plant_grass + Heros/plant_grass | 1.44 | 42 | 15.3 |
| 1.20, 1.50, 1.60 | Heros/plant_grass + Heros/plant_grass | 1.51 | 42 | 15.2 |
| -1.27, 1.59, -0.82 | Heros/plant_grass + Heros/plant_grass | 1.16 | 41 | 17.1 |
| -1.61, 1.58, 1.08 | Heros/plant_grass + Heros/plant_grass | 1.08 | 41 | 29.4 |
| -0.71, 1.60, 1.89 | Heros/plant_grass + Heros/plant_grass | 1.29 | 41 | 15.9 |
| 1.27, 1.52, 0.38 | Heros/plant_grass + Heros/plant_grass | 1.23 | 41 | 30.5 |
| 1.73, 1.54, -0.32 | Heros/plant_grass + Heros/plant_grass | 1.29 | 41 | 24.7 |
| -2.36, 1.61, -0.51 | Heros/plant_grass + Heros/plant_grass | 1.05 | 40 | 24 |
| -1.90, 1.60, 0.60 | Heros/plant_grass + Heros/plant_grass | 1.09 | 40 | 32.2 |
| -0.91, 1.59, 1.36 | Heros/plant_grass + Heros/plant_grass | 1.12 | 40 | 28.7 |
| -0.64, 1.56, 1.65 | Heros/plant_grass + Heros/plant_grass | 1.17 | 40 | 26.1 |
| 0.38, 1.56, -2.06 | Heros/plant_grass + Heros/plant_grass | 1.34 | 40 | 15.1 |
| 0.65, 1.55, -1.44 | Heros/plant_grass + Heros/plant_grass | 1.24 | 40 | 33 |
| -3.18, 1.34, 1.33 | Heros/stone_blue + Heros/stone_blue | 0.39 | 39 | 35.9 |
| -2.09, 1.61, 0.68 | Heros/plant_grass + Heros/plant_grass | 1.16 | 39 | 28.8 |
| -0.57, 1.57, 1.20 | Heros/plant_grass + Heros/plant_grass | 1.22 | 39 | 30.1 |
| -0.33, 1.61, -1.86 | Heros/plant_grass + Heros/plant_grass | 1.24 | 39 | 21.6 |
| -0.12, 1.57, -2.02 | Heros/plant_grass + Heros/plant_grass | 1.18 | 39 | 26.3 |

(1190 more in the JSON)

## opening (info, 163)

| at | part | facing | edge_m |
|---|---|---|---|
| 4.03, 0.20, 0.35 | Heros/stone_blue | 1 + 0 + 0.05 | 0.397 |
| 4.02, 0.20, 0.45 | Heros/stone_blue | 0.99 + 0 + 0.15 | 0.397 |
| 3.96, 0.20, 0.84 | Heros/stone_blue | 0.97 + 0 + 0.24 | 0.397 |
| 3.86, 0.20, 1.22 | Heros/stone_blue | 0.94 + 0 + 0.34 | 0.397 |
| 3.72, 0.20, 1.59 | Heros/stone_blue | 0.9 + 0 + 0.43 | 0.397 |
| 3.55, 0.20, 1.95 | Heros/stone_blue | 0.86 + 0 + 0.51 | 0.397 |
| 3.34, 0.20, 2.29 | Heros/stone_blue | 0.8 + 0 + 0.6 | 0.397 |
| 3.10, 0.20, 2.61 | Heros/stone_blue | 0.74 + 0 + 0.67 | 0.397 |
| 2.83, 0.20, 2.90 | Heros/stone_blue | 0.67 + 0 + 0.74 | 0.397 |
| 2.53, 0.20, 3.16 | Heros/stone_blue | 0.6 + 0 + 0.8 | 0.397 |
| 2.21, 0.20, 3.39 | Heros/stone_blue | 0.51 + 0 + 0.86 | 0.397 |
| 1.86, 0.20, 3.59 | Heros/stone_blue | 0.43 + 0 + 0.9 | 0.397 |
| 1.50, 0.20, 3.76 | Heros/stone_blue | 0.34 + 0 + 0.94 | 0.397 |
| 1.13, 0.20, 3.89 | Heros/stone_blue | 0.24 + 0 + 0.97 | 0.397 |
| 0.74, 0.20, 3.98 | Heros/stone_blue | 0.15 + 0 + 0.99 | 0.397 |
| 0.35, 0.20, 4.03 | Heros/stone_blue | 0.05 + 0 + 1 | 0.397 |
| -0.05, 0.20, 4.05 | Heros/stone_blue | -0.05 + 0 + 1 | 0.397 |
| -0.45, 0.20, 4.02 | Heros/stone_blue | -0.15 + 0 + 0.99 | 0.397 |
| -0.84, 0.20, 3.96 | Heros/stone_blue | -0.24 + 0 + 0.97 | 0.397 |
| -1.22, 0.20, 3.86 | Heros/stone_blue | -0.34 + 0 + 0.94 | 0.397 |
| -1.59, 0.20, 3.72 | Heros/stone_blue | -0.43 + 0 + 0.9 | 0.397 |
| -1.95, 0.20, 3.55 | Heros/stone_blue | -0.51 + 0 + 0.86 | 0.397 |
| -2.29, 0.20, 3.34 | Heros/stone_blue | -0.6 + 0 + 0.8 | 0.397 |
| -2.61, 0.20, 3.10 | Heros/stone_blue | -0.67 + 0 + 0.74 | 0.397 |
| -2.90, 0.20, 2.83 | Heros/stone_blue | -0.74 + 0 + 0.67 | 0.397 |
| -3.16, 0.20, 2.53 | Heros/stone_blue | -0.8 + 0 + 0.6 | 0.397 |
| -3.39, 0.20, 2.21 | Heros/stone_blue | -0.86 + 0 + 0.51 | 0.397 |
| -3.59, 0.20, 1.86 | Heros/stone_blue | -0.9 + 0 + 0.43 | 0.397 |
| -3.76, 0.20, 1.50 | Heros/stone_blue | -0.94 + 0 + 0.34 | 0.397 |
| -3.89, 0.20, 1.13 | Heros/stone_blue | -0.97 + 0 + 0.24 | 0.397 |
| -3.98, 0.20, 0.74 | Heros/stone_blue | -0.99 + 0 + 0.15 | 0.397 |
| -4.03, 0.20, 0.35 | Heros/stone_blue | -1 + 0 + 0.05 | 0.397 |
| -4.05, 0.20, -0.05 | Heros/stone_blue | -1 + 0 + -0.05 | 0.397 |
| -4.02, 0.20, -0.45 | Heros/stone_blue | -0.99 + 0 + -0.15 | 0.397 |
| -3.96, 0.20, -0.84 | Heros/stone_blue | -0.97 + 0 + -0.24 | 0.397 |
| -3.86, 0.20, -1.22 | Heros/stone_blue | -0.94 + 0 + -0.34 | 0.397 |
| -3.72, 0.20, -1.59 | Heros/stone_blue | -0.9 + 0 + -0.43 | 0.397 |
| -3.55, 0.20, -1.95 | Heros/stone_blue | -0.86 + 0 + -0.51 | 0.397 |
| -3.34, 0.20, -2.29 | Heros/stone_blue | -0.8 + 0 + -0.6 | 0.397 |
| -3.10, 0.20, -2.61 | Heros/stone_blue | -0.74 + 0 + -0.67 | 0.397 |

(123 more in the JSON)

## backtoback (info, 76)

| at | parts | area |
|---|---|---|
| 1.23, 1.72, 2.70 | Heros/stone_blue + Heros/stone_blue | 0.02871 |
| 1.16, 1.72, 2.62 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 2.73, 1.72, 1.27 | Heros/stone_blue + Heros/stone_blue | 0.00449 |
| 2.81, 1.72, 1.21 | Heros/stone_blue + Heros/stone_blue | 0.00041 |
| -1.03, 1.72, 2.83 | Heros/stone_blue + Heros/stone_blue | 0.0049 |
| 1.03, 1.72, 2.74 | Heros/stone_blue + Heros/stone_blue | 0.04546 |
| 1.14, 1.72, 2.82 | Heros/stone_blue + Heros/stone_blue | 0.00276 |
| -1.04, 1.72, 2.77 | Heros/stone_blue + Heros/stone_blue | 0.02381 |
| -1.03, 1.72, 2.67 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| -2.73, 1.72, 1.27 | Heros/stone_blue + Heros/stone_blue | 0.0049 |
| -1.18, 1.72, 2.80 | Heros/stone_blue + Heros/stone_blue | 0.00275 |
| -1.21, 1.72, 2.67 | Heros/stone_blue + Heros/stone_blue | 0.04546 |
| 2.66, 1.72, 1.20 | Heros/stone_blue + Heros/stone_blue | 0.04098 |
| 2.80, 1.72, 1.18 | Heros/stone_blue + Heros/stone_blue | 0.00234 |
| -2.69, 1.72, 1.22 | Heros/stone_blue + Heros/stone_blue | 0.02382 |
| -2.62, 1.72, 1.16 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 2.84, 1.72, -1.13 | Heros/stone_blue + Heros/stone_blue | 0.00041 |
| 2.83, 1.72, -1.03 | Heros/stone_blue + Heros/stone_blue | 0.00449 |
| 2.67, 1.72, 1.03 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 2.78, 1.72, 1.04 | Heros/stone_blue + Heros/stone_blue | 0.02871 |
| -2.83, 1.72, -1.03 | Heros/stone_blue + Heros/stone_blue | 0.0049 |
| -2.74, 1.72, 1.03 | Heros/stone_blue + Heros/stone_blue | 0.04546 |
| -2.82, 1.72, 1.14 | Heros/stone_blue + Heros/stone_blue | 0.00276 |
| 2.81, 1.72, -1.15 | Heros/stone_blue + Heros/stone_blue | 0.00234 |
| 2.73, 1.72, -1.03 | Heros/stone_blue + Heros/stone_blue | 0.04097 |
| -2.77, 1.72, -1.04 | Heros/stone_blue + Heros/stone_blue | 0.02381 |
| -2.67, 1.72, -1.03 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 2.69, 1.72, -1.22 | Heros/stone_blue + Heros/stone_blue | 0.02382 |
| 2.62, 1.72, -1.16 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| -2.80, 1.72, -1.18 | Heros/stone_blue + Heros/stone_blue | 0.00234 |
| -2.66, 1.72, -1.20 | Heros/stone_blue + Heros/stone_blue | 0.04098 |
| 1.18, 1.72, -2.80 | Heros/stone_blue + Heros/stone_blue | 0.00275 |
| 1.21, 1.72, -2.67 | Heros/stone_blue + Heros/stone_blue | 0.04546 |
| 2.73, 1.72, -1.27 | Heros/stone_blue + Heros/stone_blue | 0.0049 |
| -2.81, 1.72, -1.21 | Heros/stone_blue + Heros/stone_blue | 0.00041 |
| -2.73, 1.72, -1.27 | Heros/stone_blue + Heros/stone_blue | 0.00449 |
| -1.23, 1.72, -2.70 | Heros/stone_blue + Heros/stone_blue | 0.02871 |
| -1.16, 1.72, -2.62 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 1.04, 1.72, -2.77 | Heros/stone_blue + Heros/stone_blue | 0.02381 |
| 1.03, 1.72, -2.67 | Heros/stone_blue + Heros/stone_blue | 0.0195 |

(36 more in the JSON)


Nodes: Heros. Distances: {}. Quantum 0.163 mm. Offset 0,0,0.
