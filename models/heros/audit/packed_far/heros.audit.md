# Mesh audit: heros.glb

3,242 triangles, 1,924 welded vertices, 428 open edges, 85,138 rays, 348 ms.

**0 blocking**, 198 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 54 |
| sliver | warn | 25 |
| winding | warn | 12 |
| nonmanifold | warn | 23 |
| tjunction | warn | 84 |
| seam | info | 198 |
| opening | info | 111 |
| backtoback | info | 80 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 54)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -2.14, 1.60, -0.80 | Heros_far/plant_grass + Heros_far/plant_grass | 2.38 | 20.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.04, 1.60, -0.76 | Heros_far/plant_grass + Heros_far/plant_grass | 2.38 | 45.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -2.07, 1.60, -0.80 | Heros_far/plant_grass + Heros_far/plant_grass | 2.38 | 55.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.81, 1.60, 0.27 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 22.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.70, 1.60, 0.23 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 52.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.74, 1.60, 0.27 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 61.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.67, 1.60, 0.83 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 97.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.82, 1.60, 0.78 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 43 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -1.72, 1.60, 0.78 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 118.5 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.82, 1.60, -1.89 | Heros_far/plant_grass + Heros_far/plant_grass | 2.44 | 24.9 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.78, 1.60, -1.83 | Heros_far/plant_grass + Heros_far/plant_grass | 2.44 | 5.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.79, 1.60, -1.86 | Heros_far/plant_grass + Heros_far/plant_grass | 2.44 | 16.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.56, 1.59, -1.85 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 15.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.49, 1.59, -1.88 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 21.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.51, 1.59, -1.85 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 35.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.44, 1.59, 1.93 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 79.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.57, 1.59, 1.90 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 25 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| -0.48, 1.59, 1.89 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 73.9 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.14, 1.59, -1.85 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 20.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.21, 1.59, -1.90 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 15.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.18, 1.59, -1.86 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 35.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.22, 1.59, 1.90 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 15 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.15, 1.59, 1.82 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 50.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.19, 1.59, 1.83 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 44.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.74, 1.58, -1.92 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 39 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.79, 1.58, -1.99 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 3.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.78, 1.58, -1.97 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 9.9 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.88, 1.58, 1.92 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 29.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.79, 1.58, 1.83 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 64.1 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 0.84, 1.58, 1.84 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 80.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.32, 1.58, 0.32 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 95.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.51, 1.58, 0.21 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 112.8 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.44, 1.58, 0.30 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 225.6 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.34, 1.58, 0.23 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 18.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.42, 1.58, 0.19 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 18.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.38, 1.58, 0.21 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 18.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.47, 1.58, 0.73 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 68.7 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.35, 1.58, 0.72 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 14.4 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.41, 1.58, 0.72 | Heros_far/plant_grass + Heros_far/plant_grass | 1.22 | 43.3 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |
| 1.39, 1.58, 1.33 | Heros_far/plant_grass + Heros_far/plant_grass | 1.16 | 3.2 | 0 | 120 | 1.08 | false | 0 + -1 + 0 |

(14 more in the JSON)

## sliver (warn, 25)

| at | part | aspect | longest |
|---|---|---|---|
| -0.36, 7.85, 0.21 | Heros_far/bronze_gilt | 58 | 0.471 |
| 11.40, 0.06, -2.63 | Heros_far/cast_iron_green | 148 | 5.016 |
| 9.86, 0.71, -2.52 | Heros_far/cast_iron_green | 147 | 5.015 |
| 11.40, 0.06, -2.66 | Heros_far/cast_iron_green | 148 | 5.02 |
| 9.86, 0.71, -2.54 | Heros_far/cast_iron_green | 148 | 5.02 |
| 11.39, 0.04, -2.67 | Heros_far/cast_iron_green | 148 | 5.021 |
| 9.86, 0.68, -2.53 | Heros_far/cast_iron_green | 148 | 5.021 |
| 11.39, 0.03, -2.64 | Heros_far/cast_iron_green | 148 | 5.016 |
| 9.86, 0.69, -2.51 | Heros_far/cast_iron_green | 148 | 5.016 |
| 11.66, 0.06, 0.58 | Heros_far/cast_iron_green | 148 | 5.016 |
| 10.12, 0.71, 0.69 | Heros_far/cast_iron_green | 148 | 5.016 |
| 11.66, 0.06, 0.55 | Heros_far/cast_iron_green | 148 | 5.021 |
| 10.12, 0.71, 0.67 | Heros_far/cast_iron_green | 148 | 5.021 |
| 11.65, 0.04, 0.54 | Heros_far/cast_iron_green | 148 | 5.021 |
| 10.12, 0.68, 0.68 | Heros_far/cast_iron_green | 148 | 5.021 |
| 11.65, 0.03, 0.57 | Heros_far/cast_iron_green | 148 | 5.015 |
| 10.12, 0.69, 0.70 | Heros_far/cast_iron_green | 148 | 5.016 |
| -13.79, 4.21, 19.20 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.82, 4.21, 19.15 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.87, 4.21, 19.15 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.92, 4.21, 19.18 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.93, 4.21, 19.23 | Heros_far/cast_iron_green | 48 | 2.601 |
| -13.89, 4.21, 19.28 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.84, 4.21, 19.29 | Heros_far/cast_iron_green | 49 | 2.601 |
| -13.80, 4.21, 19.25 | Heros_far/cast_iron_green | 48 | 2.601 |

## winding (warn, 12)

| at | part |
|---|---|
| -9.55, 1.70, 21.01 | Heros_far/cast_iron_green |
| -9.51, 1.70, 21.14 | Heros_far/cast_iron_green |
| -9.66, 1.70, 20.93 | Heros_far/cast_iron_green |
| -9.79, 1.70, 20.93 | Heros_far/cast_iron_green |
| -9.94, 1.70, 21.14 | Heros_far/cast_iron_green |
| -9.90, 1.70, 21.27 | Heros_far/cast_iron_green |
| -9.79, 1.70, 21.35 | Heros_far/cast_iron_green |
| -9.66, 1.70, 21.35 | Heros_far/cast_iron_green |
| -9.51, 1.78, 21.14 | Heros_far/cast_iron_green |
| -9.79, 1.78, 20.93 | Heros_far/cast_iron_green |
| -9.94, 1.78, 21.14 | Heros_far/cast_iron_green |
| -9.66, 1.78, 21.35 | Heros_far/cast_iron_green |

## nonmanifold (warn, 23)

| at | part | uses |
|---|---|---|
| -0.02, 10.45, -0.47 | Heros_far/bronze_gilt | 3 |
| 0.15, 9.08, -0.07 | Heros_far/bronze_gilt | 4 |
| 0.18, 9.27, -0.06 | Heros_far/bronze_gilt | 4 |
| -0.22, 8.86, -0.04 | Heros_far/bronze_gilt | 4 |
| 0.21, 8.99, 0.55 | Heros_far/bronze_gilt | 3 |
| 0.15, 8.88, -0.06 | Heros_far/bronze_gilt | 4 |
| 0.27, 8.62, 0.05 | Heros_far/bronze_gilt | 3 |
| 0.28, 8.53, 0.03 | Heros_far/bronze_gilt | 3 |
| 0.23, 8.61, 0.06 | Heros_far/bronze_gilt | 3 |
| 0.57, 8.49, 0.07 | Heros_far/bronze_gilt | 3 |
| 0.10, 8.82, -0.33 | Heros_far/bronze_gilt | 4 |
| -0.12, 8.80, -0.32 | Heros_far/bronze_gilt | 4 |
| -0.06, 8.79, -0.35 | Heros_far/bronze_gilt | 4 |
| -0.14, 9.05, 0.05 | Heros_far/bronze_gilt | 4 |
| 0.03, 8.15, -0.33 | Heros_far/bronze_gilt | 4 |
| 0.59, 8.44, 0.37 | Heros_far/bronze_gilt | 3 |
| 0.26, 8.47, 0.43 | Heros_far/bronze_gilt | 3 |
| 0.15, 8.90, 0.11 | Heros_far/bronze_gilt | 3 |
| 0.10, 8.48, 0.21 | Heros_far/bronze_gilt | 3 |
| 0.08, 8.36, 0.13 | Heros_far/bronze_gilt | 4 |
| 0.14, 7.92, -0.21 | Heros_far/bronze_gilt | 4 |
| 0.02, 7.91, -0.32 | Heros_far/bronze_gilt | 4 |
| 0.11, 7.80, -0.22 | Heros_far/bronze_gilt | 4 |

## tjunction (warn, 84)

| at | part | edge_m |
|---|---|---|
| 3.18, 1.07, -1.02 | Heros_far/stone_blue | 0.42 |
| 3.18, 1.07, 1.02 | Heros_far/stone_blue | 0.42 |
| 2.81, 1.16, -1.02 | Heros_far/stone_blue | 2.331 |
| 2.97, 1.07, 1.53 | Heros_far/stone_blue | 0.42 |
| 1.53, 1.07, 2.97 | Heros_far/stone_blue | 0.42 |
| 1.27, 1.16, 2.71 | Heros_far/stone_blue | 2.331 |
| 1.02, 1.07, 3.18 | Heros_far/stone_blue | 0.42 |
| -1.02, 1.07, 3.18 | Heros_far/stone_blue | 0.42 |
| -1.02, 1.16, 2.81 | Heros_far/stone_blue | 2.331 |
| -1.53, 1.07, 2.97 | Heros_far/stone_blue | 0.42 |
| -2.97, 1.07, 1.53 | Heros_far/stone_blue | 0.42 |
| -2.71, 1.16, 1.27 | Heros_far/stone_blue | 2.331 |
| -3.18, 1.07, 1.02 | Heros_far/stone_blue | 0.42 |
| -3.18, 1.07, -1.02 | Heros_far/stone_blue | 0.42 |
| -2.81, 1.16, -1.02 | Heros_far/stone_blue | 2.331 |
| -2.97, 1.07, -1.53 | Heros_far/stone_blue | 0.42 |
| -1.53, 1.07, -2.97 | Heros_far/stone_blue | 0.42 |
| -2.71, 1.16, -1.27 | Heros_far/stone_blue | 2.331 |
| -1.02, 1.07, -3.18 | Heros_far/stone_blue | 0.42 |
| 1.02, 1.07, -3.18 | Heros_far/stone_blue | 0.42 |
| -1.02, 1.16, -2.81 | Heros_far/stone_blue | 2.331 |
| 1.53, 1.07, -2.97 | Heros_far/stone_blue | 0.42 |
| 2.97, 1.07, -1.53 | Heros_far/stone_blue | 0.42 |
| 1.27, 1.16, -2.71 | Heros_far/stone_blue | 2.331 |
| 8.33, 0.27, -2.29 | Heros_far/stone_blue | 0.677 |
| 8.58, 0.27, 0.70 | Heros_far/stone_blue | 0.677 |
| 8.75, 0.10, -2.32 | Heros_far/stone_blue | 0.678 |
| 8.33, -0.23, -2.29 | Heros_far/stone_blue | 0.678 |
| 8.99, 0.10, 0.67 | Heros_far/stone_blue | 0.678 |
| 8.58, -0.23, 0.70 | Heros_far/stone_blue | 0.678 |
| 9.17, -0.08, -2.36 | Heros_far/stone_blue | 0.677 |
| 8.75, -0.41, -2.32 | Heros_far/stone_blue | 0.677 |
| 9.41, -0.08, 0.63 | Heros_far/stone_blue | 0.677 |
| 8.99, -0.41, 0.67 | Heros_far/stone_blue | 0.677 |
| 9.59, -0.26, -2.39 | Heros_far/stone_blue | 0.678 |
| 9.17, -0.58, -2.36 | Heros_far/stone_blue | 0.678 |
| 9.83, -0.26, 0.60 | Heros_far/stone_blue | 0.678 |
| 9.41, -0.58, 0.63 | Heros_far/stone_blue | 0.678 |
| 10.01, -0.44, -2.43 | Heros_far/stone_blue | 0.678 |
| 9.59, -0.76, -2.39 | Heros_far/stone_blue | 0.678 |

(44 more in the JSON)

## seam (info, 198)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 8.40, 0.45, 0.68 | Heros_far/stone_blue + Heros_far/stone_blue | 8.18 | 61 | 89.9 |
| 8.33, 0.45, -2.26 | Heros_far/stone_blue + Heros_far/stone_blue | 8.18 | 59 | 90 |
| -12.00, 1.15, 19.21 | Heros_far/stone_blue + Heros_far/stone_blue | 3.34 | 26 | 89.9 |
| -10.03, 1.15, 20.49 | Heros_far/stone_blue + Heros_far/stone_blue | 3.34 | 26 | 90 |
| 1.08, 1.72, 2.40 | Heros_far/stone_blue + Heros_far/stone_blue | 16.26 | 24 | 90 |
| 0.03, 7.15, -0.18 | Heros_far/stone_blue + Heros_far/bronze_gilt | 1.61 | 18 | 6.5 |
| 2.87, 0.71, -2.44 | Heros_far/stone_blue + Heros_far/cast_iron_green | 0.18 | 16 | 90 |
| 2.81, 1.72, 0.07 | Heros_far/stone_blue + Heros_far/stone_blue | 18.65 | 16 | 90 |
| 1.36, 1.63, 2.11 | Heros_far/stone_blue + Heros_far/soil_bed | 16.26 | 16 | 90 |
| 2.87, 0.96, -2.45 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.2 | 16 | 57 |
| -0.23, 1.63, 2.30 | Heros_far/soil_bed + Heros_far/plant_grass | 2.06 | 16 | 60.7 |
| 0.44, 1.63, 1.89 | Heros_far/soil_bed + Heros_far/plant_grass | 2.1 | 16 | 63.8 |
| 1.93, 1.63, 1.32 | Heros_far/soil_bed + Heros_far/plant_grass | 1.87 | 16 | 65 |
| -1.25, 1.63, -1.73 | Heros_far/soil_bed + Heros_far/plant_grass | 2 | 16 | 65.5 |
| -1.89, 1.63, 0.42 | Heros_far/plant_grass + Heros_far/plant_grass | 0.81 | 15 | 59 |
| -0.63, 1.62, 1.44 | Heros_far/plant_grass + Heros_far/plant_grass | 0.84 | 15 | 63.2 |
| 1.27, 1.61, 0.36 | Heros_far/plant_grass + Heros_far/plant_grass | 1.02 | 15 | 67.5 |
| 10.10, 0.59, -2.56 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.7 |
| 11.12, 0.15, -2.64 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.7 |
| 10.37, 0.59, 0.65 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.9 |
| 11.38, 0.15, 0.57 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.7 |
| -0.83, 1.63, 2.42 | Heros_far/soil_bed + Heros_far/plant_grass | 1.66 | 14 | 61.5 |
| 0.39, 1.63, 1.99 | Heros_far/soil_bed + Heros_far/plant_grass | 2.02 | 14 | 66.4 |
| 0.78, 1.63, 1.82 | Heros_far/soil_bed + Heros_far/plant_grass | 1.99 | 14 | 64.2 |
| -0.18, 1.63, 1.94 | Heros_far/soil_bed + Heros_far/plant_grass | 2.21 | 14 | 63.2 |
| -1.10, 1.63, 1.43 | Heros_far/soil_bed + Heros_far/plant_grass | 1.81 | 14 | 61.5 |
| -2.19, 1.63, 1.05 | Heros_far/soil_bed + Heros_far/plant_grass | 2.16 | 14 | 58.9 |
| 1.29, 1.63, -0.71 | Heros_far/soil_bed + Heros_far/plant_grass | 2.07 | 14 | 63.7 |
| 1.63, 1.63, -0.10 | Heros_far/soil_bed + Heros_far/plant_grass | 2.12 | 14 | 65.8 |
| 1.96, 1.63, 0.24 | Heros_far/soil_bed + Heros_far/plant_grass | 1.82 | 14 | 67.7 |
| -2.30, 1.63, 0.81 | Heros_far/soil_bed + Heros_far/plant_grass | 1.93 | 14 | 64 |
| -1.66, 1.63, -0.29 | Heros_far/soil_bed + Heros_far/plant_grass | 1.8 | 14 | 60 |
| -1.83, 1.63, 0.28 | Heros_far/soil_bed + Heros_far/plant_grass | 1.97 | 14 | 62.9 |
| 1.68, 1.63, -0.91 | Heros_far/soil_bed + Heros_far/plant_grass | 1.82 | 14 | 66.1 |
| 1.18, 1.63, -1.88 | Heros_far/soil_bed + Heros_far/plant_grass | 2.02 | 14 | 63.8 |
| -0.57, 1.63, -1.40 | Heros_far/soil_bed + Heros_far/plant_grass | 1.86 | 14 | 66.1 |
| 0.10, 1.63, -1.84 | Heros_far/soil_bed + Heros_far/plant_grass | 2 | 14 | 64.1 |
| 0.39, 1.63, -1.96 | Heros_far/soil_bed + Heros_far/plant_grass | 1.71 | 14 | 65.8 |
| 1.89, 1.57, 1.59 | Heros_far/stone_blue + Heros_far/plant_grass | 0.9 | 13 | 26.5 |
| 1.17, 1.71, -0.04 | Heros_far/stone_blue + Heros_far/plant_grass | 1.41 | 13 | 39.6 |

(158 more in the JSON)

## opening (info, 111)

| at | part | facing | edge_m |
|---|---|---|---|
| 3.92, 0.20, 1.00 | Heros_far/stone_blue | 0.99 + 0 + 0.13 | 1.057 |
| 3.89, 0.20, 1.09 | Heros_far/stone_blue | 0.92 + 0 + 0.38 | 1.057 |
| 3.48, 0.20, 2.06 | Heros_far/stone_blue | 0.79 + 0 + 0.61 | 1.057 |
| 2.83, 0.20, 2.89 | Heros_far/stone_blue | 0.61 + 0 + 0.79 | 1.057 |
| 1.98, 0.20, 3.53 | Heros_far/stone_blue | 0.38 + 0 + 0.92 | 1.057 |
| 1.00, 0.20, 3.92 | Heros_far/stone_blue | 0.13 + 0 + 0.99 | 1.057 |
| -0.05, 0.20, 4.04 | Heros_far/stone_blue | -0.13 + 0 + 0.99 | 1.057 |
| -1.09, 0.20, 3.89 | Heros_far/stone_blue | -0.38 + 0 + 0.92 | 1.057 |
| -2.06, 0.20, 3.48 | Heros_far/stone_blue | -0.61 + 0 + 0.79 | 1.057 |
| -2.89, 0.20, 2.83 | Heros_far/stone_blue | -0.79 + 0 + 0.61 | 1.057 |
| -3.53, 0.20, 1.98 | Heros_far/stone_blue | -0.92 + 0 + 0.38 | 1.057 |
| -3.92, 0.20, 1.00 | Heros_far/stone_blue | -0.99 + 0 + 0.13 | 1.057 |
| -4.04, 0.20, -0.05 | Heros_far/stone_blue | -0.99 + 0 + -0.13 | 1.057 |
| -3.89, 0.20, -1.09 | Heros_far/stone_blue | -0.92 + 0 + -0.38 | 1.057 |
| -3.48, 0.20, -2.06 | Heros_far/stone_blue | -0.79 + 0 + -0.61 | 1.057 |
| -2.83, 0.20, -2.89 | Heros_far/stone_blue | -0.61 + 0 + -0.79 | 1.057 |
| -1.98, 0.20, -3.53 | Heros_far/stone_blue | -0.38 + 0 + -0.92 | 1.057 |
| -1.00, 0.20, -3.92 | Heros_far/stone_blue | -0.13 + 0 + -0.99 | 1.057 |
| 0.05, 0.20, -4.04 | Heros_far/stone_blue | 0.13 + 0 + -0.99 | 1.057 |
| 1.09, 0.20, -3.89 | Heros_far/stone_blue | 0.38 + 0 + -0.92 | 1.057 |
| 2.06, 0.20, -3.48 | Heros_far/stone_blue | 0.61 + 0 + -0.79 | 1.057 |
| 2.89, 0.20, -2.83 | Heros_far/stone_blue | 0.79 + 0 + -0.61 | 1.057 |
| 3.53, 0.20, -1.98 | Heros_far/stone_blue | 0.92 + 0 + -0.38 | 1.057 |
| 4.04, 0.20, -0.05 | Heros_far/stone_blue | 0.99 + 0 + -0.13 | 1.057 |
| 1.00, 0.71, 3.25 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| 1.59, 0.71, 3.01 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| -1.59, 0.71, 3.01 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| 3.25, 0.71, 1.00 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| -3.25, 0.71, 1.00 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| 3.01, 0.71, -1.59 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| -3.01, 0.71, -1.59 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| 1.00, 0.71, -3.25 | Heros_far/stone_blue | 0 + 1 + 0 | 2.696 |
| 2.53, 1.07, 1.45 | Heros_far/stone_blue | 0 + 1 + 0 | 2.031 |
| -1.45, 1.07, 2.53 | Heros_far/stone_blue | 0 + 1 + 0 | 2.031 |
| -2.53, 1.07, -1.45 | Heros_far/stone_blue | 0 + 1 + 0 | 2.031 |
| 1.45, 1.07, -2.53 | Heros_far/stone_blue | 0 + 1 + 0 | 2.031 |
| 2.64, 1.28, 0.93 | Heros_far/stone_blue | -0.92 + 0 + -0.38 | 0.4 |
| 1.12, 1.28, 2.56 | Heros_far/stone_blue | -0.38 + 0 + -0.92 | 0.4 |
| -0.93, 1.28, 2.64 | Heros_far/stone_blue | 0.38 + 0 + -0.92 | 0.4 |
| -2.56, 1.28, 1.12 | Heros_far/stone_blue | 0.92 + 0 + -0.38 | 0.4 |

(71 more in the JSON)

## backtoback (info, 80)

| at | parts | area |
|---|---|---|
| 1.23, 1.72, 2.70 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02871 |
| 1.16, 1.72, 2.62 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.81, 1.72, 1.21 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00041 |
| 2.73, 1.72, 1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00449 |
| -1.03, 1.72, 2.83 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| 1.03, 1.72, 2.74 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| 1.14, 1.72, 2.82 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00276 |
| -1.04, 1.72, 2.77 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02381 |
| -1.03, 1.72, 2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| -2.73, 1.72, 1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| -1.18, 1.72, 2.80 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00275 |
| -1.21, 1.72, 2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| 2.80, 1.72, 1.18 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00234 |
| 2.66, 1.72, 1.20 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04098 |
| -2.69, 1.72, 1.22 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02382 |
| -2.62, 1.72, 1.16 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.84, 1.72, -1.13 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00041 |
| 2.83, 1.72, -1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00449 |
| 2.78, 1.72, 1.04 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02871 |
| 2.67, 1.72, 1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| -2.83, 1.72, -1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| -2.74, 1.72, 1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| -2.82, 1.72, 1.14 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00276 |
| 2.81, 1.72, -1.15 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00234 |
| 2.73, 1.72, -1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04097 |
| -2.77, 1.72, -1.04 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02381 |
| -2.67, 1.72, -1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.69, 1.72, -1.22 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02382 |
| 2.62, 1.72, -1.16 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| -2.80, 1.72, -1.18 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00234 |
| -2.66, 1.72, -1.20 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04098 |
| 1.18, 1.72, -2.80 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00275 |
| 1.21, 1.72, -2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| 2.73, 1.72, -1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| -2.81, 1.72, -1.21 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00041 |
| -2.73, 1.72, -1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00449 |
| -1.23, 1.72, -2.70 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02871 |
| -1.16, 1.72, -2.62 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 1.04, 1.72, -2.77 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02381 |
| 1.03, 1.72, -2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |

(40 more in the JSON)


Nodes: Heros_far. Distances: {}. Quantum 0.163 mm. Offset 0,0,0.
