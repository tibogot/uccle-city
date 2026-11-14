# Mesh audit: shopkit.glb

3,320 triangles, 1,716 welded vertices, 0 open edges, 0 rays, 289 ms.

**62 blocking**, 380 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 48 |
| bentflat | block | 14 |
| sliver | warn | 376 |
| nonmanifold | warn | 4 |
| seam | info | 62 |
| backtoback | info | 158 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 48)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.90, 2.33, 0.15 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.90, 2.33, 0.18 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.92, 2.33, 0.18 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.91, 2.33, 0.16 | front_classic/paint + front_classic/paint | 0 | 3.1 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.91, 2.33, 0.17 | front_classic/paint + front_classic/paint | 0 | 5.7 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.77, 2.42, 0.00 | front_classic/paint + front_classic/paint | 0 | 1.8 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.92, 2.33, 0.15 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.92, 2.33, 0.18 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.90, 2.33, 0.18 | front_classic/paint + front_classic/paint | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.91, 2.33, 0.16 | front_classic/paint + front_classic/paint | 0 | 3.1 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.91, 2.33, 0.17 | front_classic/paint + front_classic/paint | 0 | 5.7 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.77, 2.42, 0.00 | front_classic/paint + front_classic/paint | 0 | 1.8 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.75, 2.35, 0.00 | front_classic/paint + front_classic/paint | 0 | 4.6 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.06, 2.35, 0.00 | front_classic/paint + front_classic/paint | 0 | 134.6 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.58, 2.35, 0.00 | front_classic/paint + front_classic/paint | 0 | 31.1 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.94, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.3 | 0 | 120 | 0.92 | false | 0 + 0.92 + -0.38 |
| 0.88, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 1.8 | 0 | 120 | 0.92 | false | 0 + 0.92 + -0.38 |
| -0.87, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.3 | 0 | 120 | 0.92 | false | 0 + 0.92 + -0.38 |
| -0.94, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.1 | 0 | 120 | 0.92 | false | 0 + 0.92 + -0.38 |
| 0.94, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.1 | 0 | 120 | 0.92 | false | 0 + 0.38 + -0.92 |
| 0.87, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.3 | 0 | 120 | 0.92 | false | 0 + 0.38 + -0.92 |
| -0.88, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 1.8 | 0 | 120 | 0.92 | false | 0 + 0.38 + -0.92 |
| -0.94, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.38 | 2.3 | 0 | 120 | 0.92 | false | 0 + 0.38 + -0.92 |
| -0.93, 3.30, 0.10 | front_classic/paint + front_classic/paint | 0 | 197.9 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.85, 3.30, 0.09 | front_classic/paint + front_classic/paint | 0 | 73.5 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.91, 3.30, 0.01 | front_classic/paint + front_classic/paint | 0 | 17.4 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.95, 3.30, 0.19 | front_classic/paint + front_classic/paint | 0 | 4.8 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.88, 3.30, 0.19 | front_classic/paint + front_classic/paint | 0 | 12.6 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.89, 3.30, 0.11 | front_classic/paint + front_classic/paint | 0 | 185.3 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.96, 3.30, 0.10 | front_classic/paint + front_classic/paint | 0 | 86 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.94, 2.94, 0.00 | front_classic/paint + front_classic/paint | 0 | 583.9 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.88, 2.83, 0.00 | front_classic/paint + front_classic/paint | 0 | 382.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.94, 3.29, 0.00 | front_classic/paint + front_classic/paint | 0 | 15.2 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.87, 3.29, 0.00 | front_classic/paint + front_classic/paint | 0 | 16.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.91, 3.27, 0.00 | front_classic/paint + front_classic/paint | 0 | 55.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.88, 3.29, 0.00 | front_classic/paint + front_classic/paint | 0 | 15.2 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.95, 3.28, 0.00 | front_classic/paint + front_classic/paint | 0 | 16.5 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.97, 2.57, 0.00 | front_classic/paint + front_classic/paint | 0 | 5.4 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.90, 2.58, 0.00 | front_classic/paint + front_classic/paint | 0 | 57.2 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.88, 2.90, 0.00 | front_classic/paint + front_classic/paint | 0 | 533.9 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

(8 more in the JSON)

## bentflat (block, 14)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.26, 2.48, 0.13 | front_classic/paint | 14.7 | 0.1571 | 0.31 |
| -0.26, 2.41, 0.13 | front_classic/paint | 14.7 | 0.1571 | 0.31 |
| -0.26, 2.48, 0.00 | front_classic/paint | 14.7 | 0.1571 | 0.31 |
| 0.26, 2.41, 0.00 | front_classic/paint | 14.7 | 0.1571 | 0.31 |
| 0.34, 2.55, 0.07 | front_classic/paint | 14.7 | 0.1966 | 0.39 |
| -0.34, 2.55, 0.13 | front_classic/paint | 14.7 | 0.1966 | 0.39 |
| 0.34, 3.05, 0.20 | front_classic/paint | 14.7 | 0.7659 | 1.53 |
| -0.34, 2.80, 0.20 | front_classic/paint | 14.7 | 0.7659 | 1.53 |
| -0.34, 3.30, 0.07 | front_classic/paint | 14.7 | 0.1966 | 0.39 |
| 0.34, 3.30, 0.13 | front_classic/paint | 14.7 | 0.1966 | 0.39 |
| -0.34, 3.05, 0.00 | front_classic/paint | 14.7 | 0.7659 | 1.53 |
| 0.34, 2.80, 0.00 | front_classic/paint | 14.7 | 0.7659 | 1.53 |
| -0.37, 3.50, 0.12 | front_classic/lead | 14.9 | 0.3934 | 0.79 |
| 0.37, 3.50, 0.23 | front_classic/lead | 14.9 | 0.3934 | 0.79 |

## sliver (warn, 376)

| at | part | aspect | longest |
|---|---|---|---|
| -0.26, 2.29, 0.04 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.29, 0.04 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.29, 0.04 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.29, 0.04 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.33, 0.04 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.33, 0.04 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.33, 0.04 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.33, 0.04 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.29, 0.10 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.29, 0.11 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.29, 0.11 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.29, 0.11 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.33, 0.10 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.33, 0.11 | front_classic/paint | 337 | 1.548 |
| -0.26, 2.33, 0.11 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.33, 0.11 | front_classic/paint | 337 | 1.548 |
| 0.26, 2.32, 0.11 | front_classic/paint | 47 | 1.548 |
| -0.26, 2.31, 0.11 | front_classic/paint | 47 | 1.548 |
| -0.26, 2.32, 0.04 | front_classic/paint | 47 | 1.548 |
| 0.26, 2.31, 0.04 | front_classic/paint | 47 | 1.548 |
| -1.01, 0.40, 0.23 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.24, 0.23 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.40, 0.23 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.24, 0.23 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.24, 0.00 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.40, 0.00 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.24, 0.00 | front_classic/paint | 82 | 0.504 |
| -1.01, 0.40, 0.01 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.24, 0.01 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.40, 0.00 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.24, 0.00 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.40, 0.00 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.24, 0.23 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.40, 0.23 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.24, 0.23 | front_classic/paint | 82 | 0.504 |
| -0.77, 0.40, 0.23 | front_classic/paint | 82 | 0.504 |
| -0.95, 1.17, 0.20 | front_classic/paint | 179 | 1.69 |
| -0.95, 1.74, 0.20 | front_classic/paint | 179 | 1.69 |
| -0.93, 1.17, 0.19 | front_classic/paint | 68 | 1.69 |
| -0.94, 1.74, 0.19 | front_classic/paint | 68 | 1.69 |

(336 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.79, 2.63, 0.21 | front_classic/paint | 4 |
| 0.79, 2.63, 0.21 | front_classic/paint | 4 |
| -0.79, 3.22, 0.21 | front_classic/paint | 4 |
| 0.79, 3.22, 0.21 | front_classic/paint | 4 |

## seam (info, 62)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.99, 3.30, 0.01 | front_classic/paint + front_classic/paint | 0.97 | 59 | 16.4 |
| 0.83, 3.30, 0.00 | front_classic/paint + front_classic/paint | 0.97 | 59 | 16.4 |
| -0.78, 2.34, 0.13 | front_classic/paint + front_classic/paint | 4.96 | 49 | 22.5 |
| 0.84, 2.55, 0.01 | front_classic/paint + front_classic/paint | 4.08 | 47 | 11.2 |
| -0.78, 2.40, 0.01 | front_classic/paint + front_classic/paint | 0.39 | 46 | 22.5 |
| 0.76, 2.40, 0.13 | front_classic/paint + front_classic/paint | 0.39 | 46 | 22.5 |
| -0.98, 2.55, 0.00 | front_classic/paint + front_classic/paint | 4.08 | 46 | 11.2 |
| 0.77, 2.34, 0.00 | front_classic/paint + front_classic/paint | 0.39 | 45 | 22.1 |
| -0.91, 2.33, 0.19 | front_classic/paint + front_classic/paint | 0.24 | 42 | 23.7 |
| 0.89, 2.33, 0.17 | front_classic/paint + front_classic/paint | 0.24 | 42 | 23.7 |
| -0.77, 2.34, 0.00 | front_classic/paint + front_classic/paint | 0.39 | 41 | 22.1 |
| -0.78, 2.33, 0.11 | front_classic/paint + front_classic/paint | 3.28 | 40 | 67.5 |
| -0.78, 2.33, 0.11 | front_classic/paint + front_classic/paint | 0.25 | 39 | 67.5 |
| 0.78, 2.33, 0.11 | front_classic/paint + front_classic/paint | 0.25 | 39 | 67.5 |
| -0.78, 2.33, 0.01 | front_classic/paint + front_classic/paint | 0.46 | 35 | 22.5 |
| 0.78, 2.33, 0.01 | front_classic/paint + front_classic/paint | 0.46 | 34 | 22.5 |
| -0.88, 2.43, 0.18 | front_classic/paint + front_classic/paint | 0.21 | 34 | 32 |
| 0.89, 2.43, 0.19 | front_classic/paint + front_classic/paint | 0.21 | 34 | 32 |
| -0.91, 2.43, 0.14 | front_classic/paint + front_classic/paint | 0.21 | 30 | 67.5 |
| -0.91, 2.40, 0.15 | front_classic/paint + front_classic/paint | 0.1 | 30 | 80 |
| 0.91, 2.40, 0.15 | front_classic/paint + front_classic/paint | 0.1 | 30 | 80 |
| -0.93, 3.52, 0.00 | front_classic/paint + front_classic/lead | 9.59 | 30 | 11.3 |
| -0.91, 2.40, 0.15 | front_classic/paint + front_classic/paint | 0.11 | 28 | 80 |
| 0.90, 2.40, 0.18 | front_classic/paint + front_classic/paint | 0.11 | 28 | 80 |
| 0.89, 2.43, 0.20 | front_classic/paint + front_classic/paint | 0.21 | 28 | 67.5 |
| -0.93, 3.29, 0.00 | front_classic/paint + front_classic/paint | 1.22 | 28 | 22.5 |
| 0.89, 3.29, 0.00 | front_classic/paint + front_classic/paint | 1.22 | 28 | 22.5 |
| 0.78, 2.33, 0.11 | front_classic/paint + front_classic/paint | 0.15 | 27 | 63.4 |
| -0.78, 2.33, 0.11 | front_classic/paint + front_classic/paint | 0.15 | 25 | 63.4 |
| -1.00, 0.61, 0.10 | front_classic/paint + front_classic/paint | 1.62 | 23 | 22.5 |
| -1.00, 2.30, 0.10 | front_classic/paint + front_classic/paint | 1.63 | 23 | 22.5 |
| 0.78, 0.61, 0.10 | front_classic/paint + front_classic/paint | 1.62 | 23 | 22.5 |
| 0.78, 2.30, 0.10 | front_classic/paint + front_classic/paint | 1.63 | 23 | 22.5 |
| -0.91, 2.33, 0.19 | front_classic/paint + front_classic/paint | 0.14 | 14 | 23.7 |
| 0.89, 2.33, 0.17 | front_classic/paint + front_classic/paint | 0.14 | 14 | 23.7 |
| -0.77, 2.33, 0.07 | front_classic/paint + front_classic/paint | 3.44 | 10 | 22.5 |
| -1.00, 2.40, 0.01 | front_classic/paint + front_classic/paint | 0.87 | 10 | 22.5 |
| 0.78, 2.33, 0.01 | front_classic/paint + front_classic/paint | 0.25 | 10 | 22.5 |
| 0.78, 2.40, 0.01 | front_classic/paint + front_classic/paint | 0.87 | 10 | 22.5 |
| -0.77, 2.55, 0.02 | front_classic/paint + front_classic/paint | 3.33 | 10 | 22.5 |

(22 more in the JSON)

## backtoback (info, 158)

| at | parts | area |
|---|---|---|
| -0.78, 2.30, 0.07 | front_classic/paint + front_classic/paint | 0.00022 |
| 0.35, 2.33, 0.05 | front_classic/paint + front_classic/paint | 0.01315 |
| -0.43, 2.33, 0.07 | front_classic/paint + front_classic/paint | 0.03174 |
| 0.54, 2.33, 0.08 | front_classic/paint + front_classic/paint | 0.02413 |
| -0.24, 2.33, 0.10 | front_classic/paint + front_classic/paint | 0.02076 |
| 0.78, 2.30, 0.08 | front_classic/paint + front_classic/paint | 0.00022 |
| -0.86, 0.06, 0.04 | front_classic/paint + front_classic/bluestone | 0.01333 |
| -0.81, 0.06, 0.12 | front_classic/paint + front_classic/bluestone | 0.01164 |
| -0.97, 0.06, 0.15 | front_classic/paint + front_classic/bluestone | 0.01332 |
| -0.89, 0.06, 0.19 | front_classic/paint + front_classic/bluestone | 0.01165 |
| -0.86, 0.58, 0.04 | front_classic/paint + front_classic/paint | 0.01242 |
| -0.97, 0.58, 0.09 | front_classic/paint + front_classic/paint | 0.01167 |
| -0.81, 0.58, 0.15 | front_classic/paint + front_classic/paint | 0.01271 |
| -0.92, 0.58, 0.20 | front_classic/paint + front_classic/paint | 0.01138 |
| -0.86, 0.61, 0.03 | front_classic/paint + front_classic/paint | 0.01114 |
| -0.94, 0.61, 0.06 | front_classic/paint + front_classic/paint | 0.00166 |
| -0.95, 0.61, 0.07 | front_classic/paint + front_classic/paint | 0.0011 |
| -0.98, 0.61, 0.12 | front_classic/paint + front_classic/paint | 0.00492 |
| -0.97, 0.61, 0.10 | front_classic/paint + front_classic/paint | 0.00063 |
| -0.96, 0.61, 0.08 | front_classic/paint + front_classic/paint | 0.00349 |
| -0.97, 0.61, 0.09 | front_classic/paint + front_classic/paint | 0.00198 |
| -0.81, 0.61, 0.08 | front_classic/paint + front_classic/paint | 0.00956 |
| -0.88, 0.61, 0.20 | front_classic/paint + front_classic/paint | 0.0002 |
| -0.83, 0.61, 0.17 | front_classic/paint + front_classic/paint | 0.00296 |
| -0.90, 0.61, 0.20 | front_classic/paint + front_classic/paint | 0.00024 |
| -0.87, 0.61, 0.16 | front_classic/paint + front_classic/paint | 0.0013 |
| -0.95, 0.61, 0.20 | front_classic/paint + front_classic/paint | 0.00007 |
| -0.95, 0.61, 0.19 | front_classic/paint + front_classic/paint | 0.00007 |
| -0.90, 0.61, 0.17 | front_classic/paint + front_classic/paint | 0.00227 |
| -0.94, 0.61, 0.18 | front_classic/paint + front_classic/paint | 0.00042 |
| -0.81, 0.61, 0.20 | front_classic/paint + front_classic/paint | 0.0002 |
| -0.89, 2.30, 0.04 | front_classic/paint + front_classic/paint | 0.01062 |
| -0.96, 2.30, 0.10 | front_classic/paint + front_classic/paint | 0.01051 |
| -0.97, 2.30, 0.20 | front_classic/paint + front_classic/paint | 0.0002 |
| -0.90, 2.30, 0.20 | front_classic/paint + front_classic/paint | 0.0002 |
| -0.83, 2.30, 0.06 | front_classic/paint + front_classic/paint | 0.00142 |
| -0.94, 2.30, 0.16 | front_classic/paint + front_classic/paint | 0.0032 |
| -0.88, 2.30, 0.20 | front_classic/paint + front_classic/paint | 0.00024 |
| -0.83, 2.30, 0.06 | front_classic/paint + front_classic/paint | 0.00092 |
| -0.90, 2.30, 0.16 | front_classic/paint + front_classic/paint | 0.00148 |

(118 more in the JSON)


Nodes: front_classic. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
