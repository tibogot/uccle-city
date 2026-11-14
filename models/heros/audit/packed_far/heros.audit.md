# Mesh audit: heros.glb

2,216 triangles, 1,393 welded vertices, 416 open edges, 84,680 rays, 316 ms.

**0 blocking**, 211 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 104 |
| nonmanifold | warn | 23 |
| tjunction | warn | 84 |
| seam | info | 135 |
| opening | info | 103 |
| backtoback | info | 65 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 104)

| at | part | aspect | longest |
|---|---|---|---|
| -0.36, 7.83, 0.21 | Heros_far/bronze_gilt | 58 | 0.471 |
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
| 1.54, 1.90, 0.29 | Heros_far/plant_grass | 48 | 0.449 |
| 1.54, 1.90, 0.28 | Heros_far/plant_grass | 48 | 0.448 |
| 1.42, 1.90, 0.24 | Heros_far/plant_grass | 47 | 0.44 |
| 1.41, 1.90, 0.24 | Heros_far/plant_grass | 47 | 0.439 |
| 1.38, 1.90, 0.33 | Heros_far/plant_grass | 47 | 0.44 |
| 1.39, 1.90, 0.33 | Heros_far/plant_grass | 47 | 0.439 |
| 1.45, 1.90, 0.38 | Heros_far/plant_grass | 47 | 0.444 |
| 1.46, 1.90, 0.38 | Heros_far/plant_grass | 47 | 0.442 |
| 0.46, 1.88, 1.35 | Heros_far/plant_grass | 43 | 0.408 |
| 0.46, 1.88, 1.34 | Heros_far/plant_grass | 43 | 0.407 |
| 0.39, 1.88, 1.28 | Heros_far/plant_grass | 44 | 0.41 |
| 0.38, 1.88, 1.28 | Heros_far/plant_grass | 43 | 0.409 |
| 0.34, 1.88, 1.37 | Heros_far/plant_grass | 44 | 0.409 |
| 0.34, 1.88, 1.38 | Heros_far/plant_grass | 43 | 0.408 |
| 0.43, 1.88, 1.42 | Heros_far/plant_grass | 44 | 0.412 |
| 0.44, 1.88, 1.42 | Heros_far/plant_grass | 44 | 0.411 |
| -1.42, 1.87, 0.65 | Heros_far/plant_grass | 43 | 0.404 |
| -1.43, 1.87, 0.65 | Heros_far/plant_grass | 43 | 0.402 |
| -1.52, 1.87, 0.63 | Heros_far/plant_grass | 42 | 0.397 |
| -1.53, 1.87, 0.64 | Heros_far/plant_grass | 42 | 0.396 |
| -1.57, 1.87, 0.70 | Heros_far/plant_grass | 43 | 0.4 |
| -1.57, 1.87, 0.71 | Heros_far/plant_grass | 42 | 0.399 |
| -1.50, 1.87, 0.77 | Heros_far/plant_grass | 43 | 0.404 |

(64 more in the JSON)

## nonmanifold (warn, 23)

| at | part | uses |
|---|---|---|
| -0.02, 10.43, -0.47 | Heros_far/bronze_gilt | 3 |
| 0.15, 9.06, -0.07 | Heros_far/bronze_gilt | 4 |
| 0.18, 9.25, -0.06 | Heros_far/bronze_gilt | 4 |
| -0.22, 8.84, -0.04 | Heros_far/bronze_gilt | 4 |
| 0.21, 8.97, 0.55 | Heros_far/bronze_gilt | 3 |
| 0.15, 8.86, -0.06 | Heros_far/bronze_gilt | 4 |
| 0.27, 8.60, 0.05 | Heros_far/bronze_gilt | 3 |
| 0.28, 8.51, 0.03 | Heros_far/bronze_gilt | 3 |
| 0.23, 8.59, 0.06 | Heros_far/bronze_gilt | 3 |
| 0.57, 8.47, 0.07 | Heros_far/bronze_gilt | 3 |
| 0.10, 8.80, -0.33 | Heros_far/bronze_gilt | 4 |
| -0.12, 8.79, -0.32 | Heros_far/bronze_gilt | 4 |
| -0.06, 8.77, -0.35 | Heros_far/bronze_gilt | 4 |
| -0.14, 9.03, 0.05 | Heros_far/bronze_gilt | 4 |
| 0.03, 8.13, -0.33 | Heros_far/bronze_gilt | 4 |
| 0.59, 8.42, 0.37 | Heros_far/bronze_gilt | 3 |
| 0.26, 8.45, 0.43 | Heros_far/bronze_gilt | 3 |
| 0.15, 8.88, 0.11 | Heros_far/bronze_gilt | 3 |
| 0.10, 8.46, 0.21 | Heros_far/bronze_gilt | 3 |
| 0.08, 8.34, 0.13 | Heros_far/bronze_gilt | 4 |
| 0.14, 7.90, -0.21 | Heros_far/bronze_gilt | 4 |
| 0.02, 7.89, -0.32 | Heros_far/bronze_gilt | 4 |
| 0.11, 7.78, -0.22 | Heros_far/bronze_gilt | 4 |

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

## seam (info, 135)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 8.40, 0.45, 0.68 | Heros_far/stone_blue + Heros_far/stone_blue | 8.18 | 61 | 89.9 |
| 8.33, 0.45, -2.26 | Heros_far/stone_blue + Heros_far/stone_blue | 8.18 | 59 | 90 |
| -12.00, 1.15, 19.21 | Heros_far/stone_blue + Heros_far/stone_blue | 3.34 | 26 | 89.9 |
| -10.03, 1.15, 20.49 | Heros_far/stone_blue + Heros_far/stone_blue | 3.34 | 26 | 90 |
| 1.08, 1.72, 2.40 | Heros_far/stone_blue + Heros_far/stone_blue | 16.26 | 24 | 90 |
| 0.03, 7.13, -0.18 | Heros_far/stone_blue + Heros_far/bronze_gilt | 1.61 | 18 | 6.5 |
| 2.81, 1.72, 0.07 | Heros_far/stone_blue + Heros_far/stone_blue | 18.65 | 16 | 90 |
| 1.36, 1.63, 2.11 | Heros_far/stone_blue + Heros_far/soil_bed | 16.26 | 16 | 90 |
| 10.63, 0.36, -2.60 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.7 |
| 10.90, 0.36, 0.61 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.14 | 14 | 44.9 |
| 8.09, 1.33, -2.39 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.13 | 12 | 45 |
| 13.14, -0.62, -2.80 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.13 | 12 | 45 |
| 8.35, 1.33, 0.82 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.13 | 12 | 45 |
| 13.40, -0.62, 0.41 | Heros_far/cast_iron_green + Heros_far/cast_iron_green | 0.13 | 12 | 45 |
| 10.62, -0.40, -2.57 | Heros_far/stone_blue + Heros_far/cast_iron_green | 0.14 | 10 | 72.7 |
| 8.36, 0.57, 0.83 | Heros_far/stone_blue + Heros_far/cast_iron_green | 0.14 | 10 | 90 |
| 10.90, -0.41, 0.61 | Heros_far/stone_blue + Heros_far/cast_iron_green | 0.14 | 10 | 72.7 |
| 3.29, 0.71, -1.07 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 9 | 90 |
| -3.29, 0.71, -1.07 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 9 | 90 |
| -1.57, 0.71, -3.08 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 9 | 90 |
| -2.84, 1.72, -1.07 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 9 | 90 |
| 2.77, 1.72, -1.25 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 9 | 90 |
| 1.46, 0.71, 3.23 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 8 | 90 |
| 3.11, 0.71, 1.58 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 8 | 90 |
| -3.19, 0.71, 1.57 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 8 | 90 |
| 1.57, 0.71, -3.08 | Heros_far/stone_blue + Heros_far/stone_blue | 0.81 | 8 | 90 |
| 2.81, 1.37, -0.95 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| 2.81, 1.69, 0.95 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| 1.32, 1.69, 2.66 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| -1.06, 1.72, 2.81 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| -2.66, 1.69, 1.32 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| -2.81, 1.69, -0.95 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| -1.32, 1.69, -2.66 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| 0.95, 1.69, -2.81 | Heros_far/stone_blue + Heros_far/stone_blue | 1.31 | 8 | 67.5 |
| 2.74, 1.72, 1.28 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 8 | 90 |
| -1.07, 1.72, 2.84 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 8 | 90 |
| -2.77, 1.72, 1.25 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 8 | 90 |
| 1.07, 1.72, -2.84 | Heros_far/stone_blue + Heros_far/stone_blue | 1.23 | 8 | 90 |
| -0.77, 1.63, 1.11 | Heros_far/stone_blue + Heros_far/soil_bed | 9.12 | 8 | 90 |
| 8.09, 0.57, -2.39 | Heros_far/stone_blue + Heros_far/cast_iron_green | 0.14 | 8 | 90 |

(95 more in the JSON)

## opening (info, 103)

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

(63 more in the JSON)

## backtoback (info, 65)

| at | parts | area |
|---|---|---|
| 1.23, 1.72, 2.70 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02871 |
| 1.16, 1.72, 2.62 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.73, 1.72, 1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00449 |
| 2.81, 1.72, 1.21 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00041 |
| -1.03, 1.72, 2.83 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| 1.14, 1.72, 2.82 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00276 |
| 1.03, 1.72, 2.74 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| -1.04, 1.72, 2.77 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02381 |
| -1.03, 1.72, 2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| -2.73, 1.72, 1.27 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0049 |
| -1.18, 1.72, 2.80 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00275 |
| -1.21, 1.72, 2.67 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04546 |
| 2.66, 1.72, 1.20 | Heros_far/stone_blue + Heros_far/stone_blue | 0.04098 |
| 2.80, 1.72, 1.18 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00234 |
| -2.69, 1.72, 1.22 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02382 |
| -2.62, 1.72, 1.16 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.84, 1.72, -1.13 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00041 |
| 2.83, 1.72, -1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.00449 |
| 2.67, 1.72, 1.03 | Heros_far/stone_blue + Heros_far/stone_blue | 0.0195 |
| 2.78, 1.72, 1.04 | Heros_far/stone_blue + Heros_far/stone_blue | 0.02871 |
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

(25 more in the JSON)


Nodes: Heros_far. Distances: {"Heros_far":3000}. Quantum 0.159 mm. Offset 0,0,0.
