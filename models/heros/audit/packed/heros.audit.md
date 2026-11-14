# Mesh audit: heros.glb

56,949 triangles, 29,694 welded vertices, 661 open edges, 86,366 rays, 3746 ms.

**0 blocking**, 1040 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 16 |
| sliver | warn | 896 |
| nonmanifold | warn | 13 |
| tjunction | warn | 115 |
| seam | info | 1020 |
| opening | info | 150 |
| backtoback | info | 52 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 16)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 2.62, 2.45, 1.10 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | -0.71 + 0 + 0.71 |
| 2.62, 2.47, 1.11 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | -0.71 + 0 + 0.71 |
| 1.07, 2.45, 2.63 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | -1 + 0 + 0 |
| 1.07, 2.47, 2.64 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | -1 + 0 + 0 |
| -1.10, 2.45, 2.62 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | -0.71 + 0 + -0.71 |
| -1.11, 2.47, 2.62 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | -0.71 + 0 + -0.71 |
| -2.63, 2.45, 1.07 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 0 + 0 + -1 |
| -2.64, 2.47, 1.07 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 0 + 0 + -1 |
| -2.62, 2.45, -1.10 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | 0.71 + 0 + -0.71 |
| -2.62, 2.47, -1.11 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | 0.71 + 0 + -0.71 |
| -1.07, 2.45, -2.63 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 1 + 0 + 0 |
| -1.07, 2.47, -2.64 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 1 + 0 + 0 |
| 1.10, 2.45, -2.62 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | 0.71 + 0 + 0.71 |
| 1.11, 2.47, -2.62 | Heros/cast_iron_black + Heros/cast_iron_black | 1.53 | 2 | 0.3 | 110 | 1 | false | 0.71 + 0 + 0.71 |
| 2.63, 2.45, -1.07 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 0 + 0 + 1 |
| 2.64, 2.47, -1.07 | Heros/cast_iron_black + Heros/cast_iron_black | 1.59 | 2 | 0 | 110 | 1 | false | 0 + 0 + 1 |

## sliver (warn, 896)

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

(856 more in the JSON)

## nonmanifold (warn, 13)

| at | part | uses |
|---|---|---|
| -0.03, 10.46, -0.47 | Heros/bronze_gilt | 4 |
| -0.03, 10.41, -0.38 | Heros/bronze_gilt | 4 |
| -0.02, 10.42, -0.36 | Heros/bronze_gilt | 3 |
| 0.09, 9.11, 0.13 | Heros/bronze_gilt | 3 |
| -0.12, 9.26, -0.20 | Heros/bronze_gilt | 3 |
| -0.07, 9.27, -0.25 | Heros/bronze_gilt | 3 |
| 0.32, 9.33, 1.38 | Heros/bronze_gilt | 3 |
| 0.32, 9.33, 1.38 | Heros/bronze_gilt | 3 |
| 0.33, 9.34, 1.41 | Heros/bronze_gilt | 4 |
| 0.45, 8.45, -0.01 | Heros/bronze_gilt | 3 |
| -0.14, 8.91, 0.02 | Heros/bronze_gilt | 4 |
| 0.33, 8.90, 0.58 | Heros/bronze_gilt | 4 |
| 0.07, 8.13, 0.14 | Heros/bronze_gilt | 3 |

## tjunction (warn, 115)

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
| 0.74, 4.28, -0.58 | Heros/stone_blue | 1.385 |
| 0.65, 6.23, -0.51 | Heros/stone_blue | 1.204 |
| 8.19, 0.45, -2.28 | Heros/stone_blue | 0.5 |
| 8.33, 0.27, -2.29 | Heros/stone_blue | 0.677 |
| 8.58, 0.27, 0.70 | Heros/stone_blue | 0.677 |
| 8.44, 0.45, 0.71 | Heros/stone_blue | 0.5 |
| 8.61, 0.27, -2.31 | Heros/stone_blue | 0.42 |
| 8.75, 0.10, -2.32 | Heros/stone_blue | 0.678 |
| 8.33, -0.23, -2.29 | Heros/stone_blue | 0.678 |
| 8.99, 0.10, 0.67 | Heros/stone_blue | 0.678 |
| 8.86, 0.27, 0.68 | Heros/stone_blue | 0.42 |
| 8.58, -0.23, 0.70 | Heros/stone_blue | 0.678 |
| 9.03, 0.10, -2.35 | Heros/stone_blue | 0.42 |
| 9.17, -0.08, -2.36 | Heros/stone_blue | 0.677 |
| 8.75, -0.41, -2.32 | Heros/stone_blue | 0.677 |

(75 more in the JSON)

## seam (info, 1020)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 2.97, 1.28, 1.17 | Heros/stone_blue + Heros/stone_blue | 0.99 | 123 | 26 |
| -1.28, 1.29, 2.92 | Heros/stone_blue + Heros/stone_blue | 0.99 | 123 | 26 |
| -2.91, 1.30, -1.30 | Heros/stone_blue + Heros/stone_blue | 0.99 | 123 | 26 |
| 1.08, 1.39, -3.00 | Heros/stone_blue + Heros/stone_blue | 0.99 | 123 | 26 |
| 1.09, 1.34, 3.00 | Heros/stone_blue + Heros/stone_blue | 0.99 | 122 | 25.7 |
| -2.97, 1.28, 1.16 | Heros/stone_blue + Heros/stone_blue | 0.99 | 122 | 25.7 |
| -1.16, 1.28, -2.97 | Heros/stone_blue + Heros/stone_blue | 0.99 | 122 | 25.7 |
| 2.91, 1.30, -1.29 | Heros/stone_blue + Heros/stone_blue | 0.99 | 122 | 25.7 |
| 1.34, 1.29, 3.02 | Heros/stone_blue + Heros/stone_blue | 0.73 | 111 | 25.5 |
| -1.34, 1.29, -3.02 | Heros/stone_blue + Heros/stone_blue | 0.73 | 111 | 25.5 |
| -3.02, 1.29, 1.34 | Heros/stone_blue + Heros/stone_blue | 0.69 | 106 | 20.1 |
| 3.02, 1.29, -1.34 | Heros/stone_blue + Heros/stone_blue | 0.69 | 106 | 20.1 |
| -1.23, 1.28, 3.10 | Heros/stone_blue + Heros/stone_blue | 0.61 | 92 | 23.4 |
| 1.23, 1.28, -3.10 | Heros/stone_blue + Heros/stone_blue | 0.61 | 92 | 23.4 |
| -0.25, 7.13, 0.06 | Heros/stone_blue + Heros/bronze_gilt | 2.34 | 92 | 5 |
| 3.10, 1.29, 1.23 | Heros/stone_blue + Heros/stone_blue | 0.58 | 90 | 20.7 |
| -3.10, 1.29, -1.23 | Heros/stone_blue + Heros/stone_blue | 0.58 | 90 | 20.7 |
| 3.04, 1.28, 1.16 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| 1.22, 1.28, 2.93 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| -1.21, 1.28, 2.93 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| -3.09, 1.28, 1.21 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| -3.08, 1.28, -1.29 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| -1.33, 1.28, -3.04 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| 1.16, 1.28, -3.04 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| 2.97, 1.28, -1.33 | Heros/stone_blue + Heros/stone_blue | 0.59 | 86 | 61.5 |
| 8.33, 0.45, 0.69 | Heros/stone_blue + Heros/stone_blue | 8.18 | 85 | 89.9 |
| 8.19, 0.45, -2.25 | Heros/stone_blue + Heros/stone_blue | 8.18 | 83 | 90 |
| -1.28, 1.34, 3.14 | Heros/stone_blue + Heros/stone_blue | 0.41 | 69 | 32.2 |
| 1.28, 1.34, -3.14 | Heros/stone_blue + Heros/stone_blue | 0.41 | 69 | 32.2 |
| 3.14, 1.34, 1.28 | Heros/stone_blue + Heros/stone_blue | 0.4 | 66 | 47.2 |
| -3.14, 1.34, -1.28 | Heros/stone_blue + Heros/stone_blue | 0.4 | 66 | 47.2 |
| 3.17, 1.34, 1.34 | Heros/stone_blue + Heros/stone_blue | 0.39 | 47 | 35.9 |
| -3.07, 1.29, -1.17 | Heros/stone_blue + Heros/stone_blue | 0.26 | 47 | 41.7 |
| -3.17, 1.34, -1.34 | Heros/stone_blue + Heros/stone_blue | 0.39 | 47 | 35.9 |
| 3.07, 1.29, 1.17 | Heros/stone_blue + Heros/stone_blue | 0.26 | 46 | 46 |
| 3.02, 1.29, 1.34 | Heros/stone_blue + Heros/stone_blue | 0.27 | 45 | 47.8 |
| -1.19, 1.29, 3.08 | Heros/stone_blue + Heros/stone_blue | 0.27 | 45 | 41.5 |
| 1.33, 1.29, -3.04 | Heros/stone_blue + Heros/stone_blue | 0.26 | 45 | 51.8 |
| -3.06, 1.30, -1.34 | Heros/stone_blue + Heros/stone_blue | 0.27 | 44 | 32.3 |
| 1.19, 1.29, -3.09 | Heros/stone_blue + Heros/stone_blue | 0.27 | 43 | 43.4 |

(980 more in the JSON)

## opening (info, 150)

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

(110 more in the JSON)

## backtoback (info, 52)

| at | parts | area |
|---|---|---|
| 1.23, 1.72, 2.70 | Heros/stone_blue + Heros/stone_blue | 0.02871 |
| 1.16, 1.72, 2.62 | Heros/stone_blue + Heros/stone_blue | 0.0195 |
| 2.73, 1.72, 1.27 | Heros/stone_blue + Heros/stone_blue | 0.00449 |
| 2.81, 1.72, 1.21 | Heros/stone_blue + Heros/stone_blue | 0.00041 |
| -1.03, 1.72, 2.83 | Heros/stone_blue + Heros/stone_blue | 0.0049 |
| 1.14, 1.72, 2.82 | Heros/stone_blue + Heros/stone_blue | 0.00276 |
| 1.03, 1.72, 2.74 | Heros/stone_blue + Heros/stone_blue | 0.04546 |
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

(12 more in the JSON)


Nodes: Heros. Distances: {"Heros":110}. Quantum 0.159 mm. Offset 0,0,0.
