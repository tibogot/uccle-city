# Mesh audit: saintmarc.raw.glb

8,308 triangles, 4,791 welded vertices, 1,032 open edges, 385,478 rays, 2042 ms.

**0 blocking**, 486 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 24 |
| sliver | warn | 347 |
| tjunction | warn | 115 |
| seam | info | 310 |
| opening | info | 108 |
| backtoback | info | 96 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 24)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.01, 19.20, -17.80 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 0.24, 19.20, -17.79 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 5.11, 19.20, -17.80 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 5.34, 19.20, -17.79 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 10.21, 19.20, -17.80 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 10.44, 19.20, -17.79 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 15.31, 19.20, -17.80 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 15.54, 19.20, -17.79 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 20.41, 19.20, -17.80 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 20.64, 19.20, -17.79 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.31, 19.20, 12.60 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.54, 19.20, 12.59 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, -13.22 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, -12.99 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, -8.99 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, -8.76 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, -4.76 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, -4.52 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, -0.52 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, -0.29 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, 3.71 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, 3.94 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.50, 19.20, 7.94 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 39 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 25.49, 19.20, 8.18 | SaintMarc/concrete_white + SaintMarc/concrete_white | 2 | 0.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |

## sliver (warn, 347)

| at | part | aspect | longest |
|---|---|---|---|
| 8.53, 25.22, -17.80 | SaintMarc/brick_dark | 1319 | 25.68 |
| 10.23, 25.22, -17.80 | SaintMarc/brick_dark | 109 | 25.281 |
| 11.93, 25.22, -17.80 | SaintMarc/brick_dark | 848 | 20.588 |
| 13.63, 25.22, -17.80 | SaintMarc/brick_dark | 69 | 20.189 |
| 15.33, 25.22, -17.80 | SaintMarc/brick_dark | 481 | 15.5 |
| 18.73, 25.22, -17.80 | SaintMarc/brick_dark | 217 | 10.425 |
| 22.13, 25.22, -17.80 | SaintMarc/brick_dark | 58 | 5.397 |
| 1.77, 18.43, -17.80 | SaintMarc/brick_dark | 122 | 10.602 |
| 5.17, 18.43, -17.80 | SaintMarc/brick_dark | 265 | 15.62 |
| 8.57, 18.43, -17.80 | SaintMarc/brick_dark | 465 | 20.678 |
| 10.27, 18.43, -17.80 | SaintMarc/brick_dark | 59 | 25.355 |
| 11.97, 18.43, -17.80 | SaintMarc/brick_dark | 721 | 25.753 |
| -1.90, 25.22, 12.60 | SaintMarc/brick_dark | 50 | 5.008 |
| 8.27, 18.43, 12.60 | SaintMarc/brick_dark | 743 | 26.151 |
| 25.50, 25.22, -4.59 | SaintMarc/brick_dark | 1353 | 26.013 |
| 25.50, 25.22, -3.18 | SaintMarc/brick_dark | 137 | 25.614 |
| 25.50, 25.22, -1.77 | SaintMarc/brick_dark | 949 | 21.786 |
| 25.50, 25.22, -0.36 | SaintMarc/brick_dark | 95 | 21.387 |
| 25.50, 25.22, 1.06 | SaintMarc/brick_dark | 617 | 17.561 |
| 25.50, 25.22, 2.47 | SaintMarc/brick_dark | 61 | 17.162 |
| 25.50, 25.22, 3.88 | SaintMarc/brick_dark | 356 | 13.342 |
| 25.50, 25.22, 6.70 | SaintMarc/brick_dark | 167 | 9.136 |
| 25.50, 25.22, 9.52 | SaintMarc/brick_dark | 50 | 4.976 |
| 25.50, 18.43, -11.90 | SaintMarc/brick_dark | 95 | 9.338 |
| 25.50, 18.43, -9.08 | SaintMarc/brick_dark | 198 | 13.481 |
| 25.50, 18.43, -6.26 | SaintMarc/brick_dark | 339 | 17.667 |
| 25.50, 18.43, -4.84 | SaintMarc/brick_dark | 52 | 21.474 |
| 25.50, 18.43, -3.43 | SaintMarc/brick_dark | 520 | 21.871 |
| 25.50, 18.43, -2.02 | SaintMarc/brick_dark | 75 | 25.687 |
| 25.50, 18.43, -0.61 | SaintMarc/brick_dark | 740 | 26.085 |
| 0.00, 20.47, 3.90 | SaintMarc/brick_dark | 102 | 25.6 |
| 0.00, 20.38, -4.47 | SaintMarc/brick_dark | 102 | 25.101 |
| 14.23, 22.33, 15.10 | SaintMarc/brick_dark | 59 | 18.146 |
| 16.23, 17.73, 15.10 | SaintMarc/brick_dark | 89 | 10.574 |
| -5.40, 18.45, 2.47 | SaintMarc/stone_blue | 51 | 30.406 |
| -5.20, 18.45, -7.67 | SaintMarc/stone_blue | 51 | 30.406 |
| 25.64, 21.25, -16.32 | SaintMarc/zinc_roof | 184 | 7.052 |
| 25.64, 23.60, -16.31 | SaintMarc/zinc_roof | 184 | 7.052 |
| 25.61, 21.25, -16.34 | SaintMarc/zinc_roof | 184 | 7.052 |
| 25.62, 23.60, -16.34 | SaintMarc/zinc_roof | 184 | 7.052 |

(307 more in the JSON)

## tjunction (warn, 115)

| at | part | edge_m |
|---|---|---|
| 0.00, 18.45, 12.60 | SaintMarc/brick_dark | 3.65 |
| 5.10, 18.45, -17.80 | SaintMarc/brick_dark | 3.65 |
| 0.00, 18.45, -12.50 | SaintMarc/stone_blue | 25.6 |
| 4.80, 27.04, -15.84 | SaintMarc/zinc_roof | 0.16 |
| 4.80, 27.06, 10.64 | SaintMarc/zinc_roof | 0.16 |
| 4.80, 26.18, 12.30 | SaintMarc/glass_window | 0.228 |
| 4.80, 26.18, -17.50 | SaintMarc/glass_window | 0.227 |
| -5.00, 24.35, 2.31 | SaintMarc/cast_iron_green | 2.65 |
| -5.00, 24.35, 2.09 | SaintMarc/cast_iron_green | 2.65 |
| 0.30, 20.30, -12.50 | SaintMarc/cast_iron_green | 0.09 |
| 0.30, 18.45, -12.50 | SaintMarc/cast_iron_green | 0.09 |
| 0.30, 20.30, 12.10 | SaintMarc/cast_iron_green | 0.09 |
| 0.30, 18.45, 12.10 | SaintMarc/cast_iron_green | 0.09 |
| 4.80, 26.85, -16.40 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 26.26, -16.40 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.04, -15.84 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 26.41, -15.84 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.38, -15.29 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 26.56, -15.29 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.72, -14.74 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 26.72, -14.74 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 28.06, -14.19 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 26.88, -14.19 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 28.40, -13.64 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.03, -13.64 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 28.74, -13.09 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.19, -13.09 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 29.08, -12.53 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.35, -12.53 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 29.42, -11.98 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.51, -11.98 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 29.76, -11.43 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.66, -11.43 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 30.10, -10.88 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.82, -10.88 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 30.44, -10.33 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 27.98, -10.33 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 30.77, -9.77 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 28.14, -9.77 | SaintMarc/cast_iron_green | 0.07 |
| 4.80, 31.11, -9.22 | SaintMarc/cast_iron_green | 0.07 |

(75 more in the JSON)

## seam (info, 310)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.18, 26.23, -17.48 | SaintMarc/zinc_roof + SaintMarc/concrete_white | 70.54 | 259 | 61.3 |
| 4.80, 31.34, -2.55 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 46.06 | 182 | 90 |
| -4.68, 25.98, -9.76 | SaintMarc/zinc_roof + SaintMarc/concrete_white | 48.74 | 177 | 69.1 |
| 4.80, 27.21, -15.56 | SaintMarc/wood_oak + SaintMarc/glass_window | 31.16 | 165 | 90 |
| 4.80, 26.29, -17.01 | SaintMarc/zinc_roof + SaintMarc/glass_window | 30.98 | 135 | 73.7 |
| 4.80, 34.97, -2.08 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 9.8 | 62 | 90 |
| 4.80, 34.85, -3.12 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 9.67 | 62 | 90 |
| 4.80, 35.07, -2.54 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 10.09 | 61 | 90 |
| 4.80, 34.62, -1.53 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 9.43 | 61 | 90 |
| 4.80, 34.51, -3.67 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 9.31 | 61 | 90 |
| 4.80, 34.28, -0.98 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 9.06 | 60 | 90 |
| 4.80, 34.17, -4.22 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 8.94 | 60 | 90 |
| 4.80, 33.94, -0.43 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 8.69 | 59 | 90 |
| 4.80, 33.83, -4.77 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 8.58 | 59 | 90 |
| 4.80, 33.59, 0.12 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 8.33 | 58 | 90 |
| 4.80, 33.49, -5.32 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 8.22 | 58 | 90 |
| 4.80, 33.25, 0.68 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.96 | 57 | 90 |
| 4.80, 33.15, -5.88 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.85 | 57 | 90 |
| 4.80, 32.90, 1.23 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.59 | 55 | 90 |
| 4.80, 32.81, -6.43 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.49 | 55 | 90 |
| 4.80, 32.56, 1.78 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.22 | 54 | 90 |
| 4.80, 32.47, -6.98 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 7.13 | 54 | 90 |
| 4.80, 32.22, 2.33 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.85 | 53 | 90 |
| 4.80, 32.13, -7.53 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.77 | 53 | 90 |
| 4.80, 31.87, 2.88 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.49 | 52 | 90 |
| 4.80, 31.79, -8.08 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.4 | 52 | 90 |
| 4.80, 31.53, 3.44 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.12 | 51 | 90 |
| 4.80, 31.45, -8.63 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 6.04 | 51 | 90 |
| 4.80, 31.18, 3.99 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 5.75 | 50 | 90 |
| 4.80, 31.11, -9.19 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 5.68 | 50 | 90 |
| 4.80, 30.84, 4.54 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 5.38 | 49 | 90 |
| 4.80, 30.77, -9.74 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 5.31 | 49 | 90 |
| 4.80, 30.50, 5.09 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 5.01 | 48 | 90 |
| 4.80, 30.44, -10.29 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 4.95 | 47 | 90 |
| 4.80, 30.15, 5.64 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 4.65 | 45 | 90 |
| 4.80, 30.10, -10.84 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 4.59 | 45 | 90 |
| 4.80, 29.81, 6.20 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 4.28 | 42 | 90 |
| 4.80, 29.76, -11.39 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 4.22 | 42 | 90 |
| 4.80, 29.46, 6.75 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 3.91 | 39 | 90 |
| 4.80, 29.42, -11.95 | SaintMarc/glass_window + SaintMarc/cast_iron_green | 3.86 | 39 | 90 |

(270 more in the JSON)

## opening (info, 108)

| at | part | facing | edge_m |
|---|---|---|---|
| -5.00, 21.30, 12.60 | SaintMarc/brick_dark | -1 + 0 + 0 | 4.8 |
| -5.00, 26.00, -17.80 | SaintMarc/brick_dark | -1 + 0 + 0 | 4.8 |
| -4.95, 18.45, 12.60 | SaintMarc/stone_blue | 0 + 1 + 0 | 5 |
| 5.05, 18.45, -17.80 | SaintMarc/stone_blue | 0 + 1 + 0 | 10.1 |
| -5.00, 18.40, -17.80 | SaintMarc/stone_blue | 0 + 0 + -1 | 1.25 |
| -5.00, 18.40, 12.60 | SaintMarc/stone_blue | 0 + 0 + 1 | 1.25 |
| 4.80, 27.01, 10.97 | SaintMarc/zinc_roof | 0 + 0.85 + 0.53 | 0.65 |
| 5.05, 20.55, -17.80 | SaintMarc/concrete_white | 0 + -1 + 0 | 10.1 |
| -0.05, 20.55, 12.60 | SaintMarc/concrete_white | 0 + -1 + 0 | 5 |
| -5.00, 20.55, -17.75 | SaintMarc/concrete_white | 0 + -1 + 0 | 30.4 |
| 4.80, 26.88, 11.15 | SaintMarc/glass_window | -1 + 0 + 0 | 0.585 |
| 4.80, 26.87, -16.35 | SaintMarc/glass_window | -1 + 0 + 0 | 0.583 |
| 3.88, 26.97, -15.80 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.51, -15.34 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.31, -15.25 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.57, -15.25 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.65, -14.70 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.91, -14.70 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 27.99, -14.14 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 28.25, -14.14 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 28.33, -13.59 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 28.59, -13.59 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 28.67, -13.04 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 28.93, -13.04 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.01, -12.49 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.27, -12.49 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.35, -11.94 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.61, -11.94 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.68, -11.38 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 29.95, -11.38 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.02, -10.83 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.29, -10.83 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.36, -10.28 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.62, -10.28 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.70, -9.73 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 30.96, -9.73 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 31.04, -9.18 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 31.30, -9.18 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 31.38, -8.62 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |
| 3.88, 31.64, -8.62 | SaintMarc/cast_iron_green | -1 + 0 + 0 | 0.648 |

(68 more in the JSON)

## backtoback (info, 96)

| at | parts | area |
|---|---|---|
| 5.09, 18.45, -14.92 | SaintMarc/stone_blue + SaintMarc/wood_oak | 0.0144 |
| 5.08, 18.45, -15.64 | SaintMarc/stone_blue + SaintMarc/wood_oak | 0.0336 |
| -4.46, 20.55, 10.35 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.06406 |
| -4.47, 20.55, 10.17 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.01625 |
| -4.48, 20.55, -15.23 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.62, 20.55, -15.37 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.48, 20.55, -8.83 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.62, 20.55, -8.97 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.48, 20.55, -2.43 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.62, 20.55, -2.57 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.48, 20.55, 3.97 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.62, 20.55, 3.83 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.08 |
| -4.63, 20.55, 10.43 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.01594 |
| -4.64, 20.55, 10.25 | SaintMarc/concrete_white + SaintMarc/concrete_white | 0.06375 |
| 0.23, 18.45, 7.49 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.00183 |
| 0.24, 18.45, 7.45 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.00031 |
| 0.24, 18.45, 9.04 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.00282 |
| 0.25, 18.45, 9.00 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.001 |
| 0.25, 18.45, 10.58 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.00341 |
| 0.26, 18.45, 10.54 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0021 |
| 0.23, 18.45, 12.09 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0009 |
| 0.28, 18.45, 12.08 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.00269 |
| 0.25, 18.45, -12.48 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0027 |
| 0.29, 18.45, -12.48 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0009 |
| 0.25, 18.45, -10.95 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, -10.96 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.25, 18.45, -9.41 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.27, 18.45, -9.44 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.25, 18.45, -7.87 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, -7.90 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, -6.60 | SaintMarc/concrete_white + SaintMarc/wood_oak | 0.057 |
| 0.26, 18.45, -6.92 | SaintMarc/concrete_white + SaintMarc/wood_oak | 0.057 |
| 0.25, 18.45, -4.80 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, -4.81 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.25, 18.45, -3.26 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.27, 18.45, -3.29 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.26, 18.45, -1.72 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, -1.76 | SaintMarc/concrete_white + SaintMarc/cast_iron_green | 0.0036 |
| 0.28, 18.45, 0.12 | SaintMarc/concrete_white + SaintMarc/wood_oak | 0.057 |
| 0.26, 18.45, -0.52 | SaintMarc/concrete_white + SaintMarc/wood_oak | 0.057 |

(56 more in the JSON)


Nodes: SaintMarc. Distances: {"SaintMarc":128}. Quantum 0.000 mm. Offset 0,0,0.
