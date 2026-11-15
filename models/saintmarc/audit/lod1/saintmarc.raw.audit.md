# Mesh audit: saintmarc.raw.glb

1,884 triangles, 1,208 welded vertices, 422 open edges, 303,652 rays, 1198 ms.

**0 blocking**, 205 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 174 |
| tjunction | warn | 31 |
| seam | info | 117 |
| opening | info | 49 |
| backtoback | info | 96 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 174)

| at | part | aspect | longest |
|---|---|---|---|
| 8.53, 25.22, -17.80 | SaintMarc_far/brick_dark | 1319 | 25.68 |
| 10.23, 25.22, -17.80 | SaintMarc_far/brick_dark | 109 | 25.281 |
| 11.93, 25.22, -17.80 | SaintMarc_far/brick_dark | 848 | 20.588 |
| 13.63, 25.22, -17.80 | SaintMarc_far/brick_dark | 69 | 20.189 |
| 15.33, 25.22, -17.80 | SaintMarc_far/brick_dark | 481 | 15.5 |
| 18.73, 25.22, -17.80 | SaintMarc_far/brick_dark | 217 | 10.425 |
| 22.13, 25.22, -17.80 | SaintMarc_far/brick_dark | 58 | 5.397 |
| 1.77, 18.43, -17.80 | SaintMarc_far/brick_dark | 122 | 10.602 |
| 5.17, 18.43, -17.80 | SaintMarc_far/brick_dark | 265 | 15.62 |
| 8.57, 18.43, -17.80 | SaintMarc_far/brick_dark | 465 | 20.678 |
| 10.27, 18.43, -17.80 | SaintMarc_far/brick_dark | 59 | 25.355 |
| 11.97, 18.43, -17.80 | SaintMarc_far/brick_dark | 721 | 25.753 |
| -1.90, 25.22, 12.60 | SaintMarc_far/brick_dark | 50 | 5.008 |
| 8.27, 18.43, 12.60 | SaintMarc_far/brick_dark | 743 | 26.151 |
| 25.50, 25.22, -4.59 | SaintMarc_far/brick_dark | 1353 | 26.013 |
| 25.50, 25.22, -3.18 | SaintMarc_far/brick_dark | 137 | 25.614 |
| 25.50, 25.22, -1.77 | SaintMarc_far/brick_dark | 949 | 21.786 |
| 25.50, 25.22, -0.36 | SaintMarc_far/brick_dark | 95 | 21.387 |
| 25.50, 25.22, 1.06 | SaintMarc_far/brick_dark | 617 | 17.561 |
| 25.50, 25.22, 2.47 | SaintMarc_far/brick_dark | 61 | 17.162 |
| 25.50, 25.22, 3.88 | SaintMarc_far/brick_dark | 356 | 13.342 |
| 25.50, 25.22, 6.70 | SaintMarc_far/brick_dark | 167 | 9.136 |
| 25.50, 25.22, 9.52 | SaintMarc_far/brick_dark | 50 | 4.976 |
| 25.50, 18.43, -11.90 | SaintMarc_far/brick_dark | 95 | 9.338 |
| 25.50, 18.43, -9.08 | SaintMarc_far/brick_dark | 198 | 13.481 |
| 25.50, 18.43, -6.26 | SaintMarc_far/brick_dark | 339 | 17.667 |
| 25.50, 18.43, -4.84 | SaintMarc_far/brick_dark | 52 | 21.474 |
| 25.50, 18.43, -3.43 | SaintMarc_far/brick_dark | 520 | 21.871 |
| 25.50, 18.43, -2.02 | SaintMarc_far/brick_dark | 75 | 25.687 |
| 25.50, 18.43, -0.61 | SaintMarc_far/brick_dark | 740 | 26.085 |
| 0.00, 20.47, 3.90 | SaintMarc_far/brick_dark | 102 | 25.6 |
| 0.00, 20.38, -4.47 | SaintMarc_far/brick_dark | 102 | 25.101 |
| 14.23, 22.33, 15.10 | SaintMarc_far/brick_dark | 59 | 18.146 |
| 16.23, 17.73, 15.10 | SaintMarc_far/brick_dark | 89 | 10.574 |
| -5.40, 18.45, 2.47 | SaintMarc_far/stone_blue | 51 | 30.406 |
| -5.20, 18.45, -7.67 | SaintMarc_far/stone_blue | 51 | 30.406 |
| -5.08, 20.78, 2.53 | SaintMarc_far/concrete_white | 44 | 30.808 |
| -5.08, 21.02, -7.73 | SaintMarc_far/concrete_white | 44 | 30.808 |
| -5.00, 20.78, -7.73 | SaintMarc_far/concrete_white | 44 | 30.808 |
| -5.00, 21.02, 2.53 | SaintMarc_far/concrete_white | 44 | 30.808 |

(134 more in the JSON)

## tjunction (warn, 31)

| at | part | edge_m |
|---|---|---|
| 0.00, 18.45, 12.60 | SaintMarc_far/brick_dark | 3.65 |
| 5.10, 18.45, -17.80 | SaintMarc_far/brick_dark | 3.65 |
| 0.00, 18.45, -12.50 | SaintMarc_far/stone_blue | 25.6 |
| 4.80, 26.99, -15.93 | SaintMarc_far/zinc_roof | 0.16 |
| 4.80, 27.00, 10.73 | SaintMarc_far/zinc_roof | 0.16 |
| 4.80, 26.18, 12.30 | SaintMarc_far/glass_window | 0.228 |
| 4.80, 26.18, -17.50 | SaintMarc_far/glass_window | 0.227 |
| -5.00, 24.35, 2.31 | SaintMarc_far/cast_iron_green | 2.65 |
| -5.00, 24.35, 2.09 | SaintMarc_far/cast_iron_green | 2.65 |
| 0.30, 20.30, -12.50 | SaintMarc_far/cast_iron_green | 0.09 |
| 0.30, 18.45, -12.50 | SaintMarc_far/cast_iron_green | 0.09 |
| 0.30, 20.30, 12.10 | SaintMarc_far/cast_iron_green | 0.09 |
| 0.30, 18.45, 12.10 | SaintMarc_far/cast_iron_green | 0.09 |
| 4.80, 27.95, -14.36 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 26.83, -14.36 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 29.88, -11.23 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 27.72, -11.23 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 31.81, -8.09 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 28.62, -8.09 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 33.74, -4.95 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 29.52, -4.95 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 35.25, -2.50 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 30.22, -2.50 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 33.85, -0.25 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 29.57, -0.25 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 31.89, 2.89 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 28.66, 2.89 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 29.93, 6.03 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 27.75, 6.03 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 27.98, 9.16 | SaintMarc_far/cast_iron_green | 0.07 |
| 4.80, 26.84, 9.16 | SaintMarc_far/cast_iron_green | 0.07 |

## seam (info, 117)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.17, 26.23, -17.48 | SaintMarc_far/zinc_roof + SaintMarc_far/concrete_white | 70.54 | 95 | 59.4 |
| -4.68, 25.97, -12.79 | SaintMarc_far/zinc_roof + SaintMarc_far/concrete_white | 48.74 | 65 | 67.5 |
| 4.80, 30.96, -3.66 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 42.56 | 64 | 90 |
| 4.80, 27.47, -15.14 | SaintMarc_far/wood_oak + SaintMarc_far/glass_window | 31.36 | 63 | 90 |
| 4.80, 26.22, -17.34 | SaintMarc_far/zinc_roof + SaintMarc_far/glass_window | 30.98 | 49 | 71.2 |
| 4.80, 35.00, -2.54 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 10.09 | 25 | 90 |
| 4.80, 33.84, -0.28 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 8.6 | 24 | 90 |
| 4.80, 33.74, -4.92 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 8.48 | 24 | 90 |
| 4.80, 31.89, 2.85 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 6.51 | 22 | 90 |
| 4.80, 31.81, -8.05 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 6.42 | 22 | 90 |
| 4.80, 29.93, 5.99 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 4.41 | 16 | 90 |
| 4.80, 29.88, -11.19 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 4.36 | 16 | 90 |
| 4.74, 28.78, -11.26 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 74 |
| 4.73, 29.68, -8.12 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 74 |
| 4.73, 30.58, -4.99 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 74 |
| 4.73, 31.28, -2.54 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 73.8 |
| 4.73, 30.65, -0.28 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 73.8 |
| 4.73, 29.74, 2.85 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 73.8 |
| 4.74, 28.83, 5.99 | SaintMarc_far/cast_iron_green + SaintMarc_far/cast_iron_green | 0.44 | 16 | 73.8 |
| 13.62, 25.15, 12.60 | SaintMarc_far/brick_dark + SaintMarc_far/concrete_white | 40.46 | 15 | 90 |
| 0.22, 18.45, 12.08 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 2.26 | 12 | 90 |
| 0.22, 18.45, -12.48 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 2.26 | 12 | 90 |
| 5.10, 19.17, -17.80 | SaintMarc_far/brick_dark + SaintMarc_far/brick_dark | 5.95 | 11 | 90 |
| -4.42, 18.45, 10.10 | SaintMarc_far/stone_blue + SaintMarc_far/concrete_white | 1.6 | 10 | 90 |
| 4.80, 27.98, 9.13 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 2.32 | 10 | 90 |
| 4.80, 27.95, -14.33 | SaintMarc_far/glass_window + SaintMarc_far/cast_iron_green | 2.29 | 10 | 90 |
| -4.52, 18.45, -17.80 | SaintMarc_far/brick_dark + SaintMarc_far/stone_blue | 15.1 | 9 | 90 |
| 2.90, 24.41, 12.60 | SaintMarc_far/brick_dark + SaintMarc_far/brick_dark | 16.2 | 9 | 90 |
| 0.00, 18.45, 12.49 | SaintMarc_far/brick_dark + SaintMarc_far/stone_blue | 35.5 | 9 | 90 |
| 4.77, 30.38, -2.54 | SaintMarc_far/zinc_roof + SaintMarc_far/cast_iron_green | 0.26 | 9 | 66.1 |
| 0.24, 18.45, -6.60 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 4.04 | 9 | 90 |
| 0.24, 18.45, -0.20 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 4.04 | 9 | 90 |
| 0.24, 18.45, 6.20 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 4.04 | 9 | 90 |
| 5.10, 18.45, -14.82 | SaintMarc_far/brick_dark + SaintMarc_far/wood_oak | 5.8 | 8 | 90 |
| -4.42, 18.45, -15.50 | SaintMarc_far/stone_blue + SaintMarc_far/concrete_white | 1.6 | 8 | 90 |
| -4.42, 18.45, -9.10 | SaintMarc_far/stone_blue + SaintMarc_far/concrete_white | 1.6 | 8 | 90 |
| -4.42, 18.45, -2.70 | SaintMarc_far/stone_blue + SaintMarc_far/concrete_white | 1.6 | 8 | 90 |
| -4.42, 18.45, 3.70 | SaintMarc_far/stone_blue + SaintMarc_far/concrete_white | 1.6 | 8 | 90 |
| 4.78, 26.99, -14.40 | SaintMarc_far/zinc_roof + SaintMarc_far/cast_iron_green | 0.25 | 8 | 74.1 |
| 4.78, 27.89, -11.26 | SaintMarc_far/zinc_roof + SaintMarc_far/cast_iron_green | 0.25 | 8 | 74.1 |

(77 more in the JSON)

## opening (info, 49)

| at | part | facing | edge_m |
|---|---|---|---|
| -5.00, 21.30, 12.60 | SaintMarc_far/brick_dark | -1 + 0 + 0 | 4.8 |
| -5.00, 26.00, -17.80 | SaintMarc_far/brick_dark | -1 + 0 + 0 | 4.8 |
| -4.95, 18.45, 12.60 | SaintMarc_far/stone_blue | 0 + 1 + 0 | 5 |
| 5.05, 18.45, -17.80 | SaintMarc_far/stone_blue | 0 + 1 + 0 | 10.1 |
| -5.00, 18.40, -17.80 | SaintMarc_far/stone_blue | 0 + 0 + -1 | 1.25 |
| -5.00, 18.40, 12.60 | SaintMarc_far/stone_blue | 0 + 0 + 1 | 1.25 |
| 4.80, 27.06, -16.06 | SaintMarc_far/zinc_roof | 0 + 0.86 + -0.5 | 1.816 |
| 4.80, 27.07, 10.86 | SaintMarc_far/zinc_roof | 0 + 0.86 + 0.51 | 1.822 |
| 5.05, 20.55, -17.80 | SaintMarc_far/concrete_white | 0 + -1 + 0 | 10.1 |
| -0.05, 20.55, 12.60 | SaintMarc_far/concrete_white | 0 + -1 + 0 | 5 |
| -5.00, 20.55, -17.75 | SaintMarc_far/concrete_white | 0 + -1 + 0 | 30.4 |
| 4.80, 26.25, 12.26 | SaintMarc_far/glass_window | -1 + 0 + 0 | 1.751 |
| 4.80, 26.25, -17.45 | SaintMarc_far/glass_window | -1 + 0 + 0 | 1.745 |
| 3.88, 26.91, -15.89 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 28.09, -14.41 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 27.88, -14.32 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 28.14, -14.32 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 28.84, -12.75 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 29.10, -12.75 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 29.81, -11.18 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 30.07, -11.18 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 30.77, -9.61 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 31.03, -9.61 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 31.74, -8.05 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 32.00, -8.05 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 32.70, -6.48 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 32.96, -6.48 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 33.67, -4.91 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 33.93, -4.91 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.841 |
| 3.88, 34.63, -3.34 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.038 |
| 3.88, 34.89, -3.34 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.038 |
| 3.88, 35.12, -2.46 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 0.806 |
| 3.88, 35.38, -2.46 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 0.806 |
| 3.88, 34.70, -1.77 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 34.96, -1.77 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 33.72, -0.20 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 33.98, -0.20 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 32.74, 1.36 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 33.00, 1.36 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |
| 3.88, 31.76, 2.93 | SaintMarc_far/cast_iron_green | -1 + 0 + 0 | 1.848 |

(9 more in the JSON)

## backtoback (info, 96)

| at | parts | area |
|---|---|---|
| 5.09, 18.45, -14.92 | SaintMarc_far/stone_blue + SaintMarc_far/wood_oak | 0.0144 |
| 5.08, 18.45, -15.64 | SaintMarc_far/stone_blue + SaintMarc_far/wood_oak | 0.0336 |
| -4.46, 20.55, 10.35 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.06406 |
| -4.47, 20.55, 10.17 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.01625 |
| -4.48, 20.55, -15.23 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.62, 20.55, -15.37 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.48, 20.55, -8.83 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.62, 20.55, -8.97 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.48, 20.55, -2.43 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.62, 20.55, -2.57 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.48, 20.55, 3.97 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.62, 20.55, 3.83 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.08 |
| -4.63, 20.55, 10.43 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.01594 |
| -4.64, 20.55, 10.25 | SaintMarc_far/concrete_white + SaintMarc_far/concrete_white | 0.06375 |
| 0.23, 18.45, 7.49 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.00183 |
| 0.24, 18.45, 7.45 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.00031 |
| 0.24, 18.45, 9.04 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.00282 |
| 0.25, 18.45, 9.00 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.001 |
| 0.25, 18.45, 10.58 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.00341 |
| 0.26, 18.45, 10.54 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0021 |
| 0.23, 18.45, 12.09 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0009 |
| 0.28, 18.45, 12.08 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.00269 |
| 0.25, 18.45, -12.48 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0027 |
| 0.29, 18.45, -12.48 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0009 |
| 0.25, 18.45, -10.95 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, -10.96 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.25, 18.45, -9.41 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.27, 18.45, -9.44 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.25, 18.45, -7.87 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, -7.90 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, -6.60 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 0.057 |
| 0.26, 18.45, -6.92 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 0.057 |
| 0.25, 18.45, -4.80 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, -4.81 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.25, 18.45, -3.26 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.27, 18.45, -3.29 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.26, 18.45, -1.72 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, -1.76 | SaintMarc_far/concrete_white + SaintMarc_far/cast_iron_green | 0.0036 |
| 0.28, 18.45, 0.12 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 0.057 |
| 0.26, 18.45, -0.52 | SaintMarc_far/concrete_white + SaintMarc_far/wood_oak | 0.057 |

(56 more in the JSON)


Nodes: SaintMarc_far. Distances: {"SaintMarc_far":470}. Quantum 0.000 mm. Offset 0,0,0.
