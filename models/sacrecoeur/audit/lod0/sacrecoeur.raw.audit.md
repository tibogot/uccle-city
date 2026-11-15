# Mesh audit: sacrecoeur.raw.glb

17,266 triangles, 9,843 welded vertices, 1,763 open edges, 552,470 rays, 7833 ms.

**0 blocking**, 2028 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 216 |
| sliver | warn | 1629 |
| nonmanifold | warn | 46 |
| tjunction | warn | 137 |
| seam | info | 754 |
| opening | info | 82 |
| backtoback | info | 923 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 216)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.02, 57.60, 0.25 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, 0.04 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, -0.28 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, 1.29 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, 1.08 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, 0.76 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, -0.79 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, -1.00 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, -1.32 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, 2.33 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, 2.12 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, 1.80 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, -1.83 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, -2.04 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, -2.36 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, 3.37 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, 3.16 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, 2.84 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.02, 57.60, -2.87 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 11.5 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.01, 57.60, -3.08 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 187.9 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -0.00, 57.60, -3.40 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 10.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.87, 54.00, -7.18 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.86, 54.00, -7.29 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.85, 54.00, -7.45 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.87, 54.00, -7.80 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.86, 54.00, -7.91 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.85, 54.00, -8.07 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.87, 54.00, -8.42 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.86, 54.00, -8.53 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.85, 54.00, -8.69 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.52, 54.00, 7.65 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.51, 54.00, 7.54 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.50, 54.00, 7.38 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.52, 54.00, 8.27 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.51, 54.00, 8.16 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.50, 54.00, 8.00 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.52, 54.00, 8.89 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.51, 54.00, 8.78 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 95.3 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| -3.50, 54.00, 8.62 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 6.7 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |
| 1.68, 54.00, -9.82 | SacreCoeur/stone_white + SacreCoeur/stone_white | 2 | 5.8 | 0 | 128 | 0.98 | false | 0 + 1 + 0 |

(176 more in the JSON)

## sliver (warn, 1629)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 62.30, 2.43 | SacreCoeur/rubble_stone | 195 | 7.271 |
| 0.00, 62.30, -2.43 | SacreCoeur/rubble_stone | 195 | 7.271 |
| 0.00, 62.26, 2.49 | SacreCoeur/rubble_stone | 140 | 7.173 |
| 0.00, 62.26, -2.49 | SacreCoeur/rubble_stone | 140 | 7.173 |
| 0.00, 62.21, 2.54 | SacreCoeur/rubble_stone | 110 | 7.081 |
| 0.00, 62.21, -2.54 | SacreCoeur/rubble_stone | 110 | 7.081 |
| 0.00, 62.15, 2.83 | SacreCoeur/rubble_stone | 399 | 6.998 |
| 0.00, 62.15, -2.83 | SacreCoeur/rubble_stone | 399 | 6.998 |
| 0.00, 62.09, 3.12 | SacreCoeur/rubble_stone | 156 | 6.201 |
| 0.00, 62.09, -3.12 | SacreCoeur/rubble_stone | 156 | 6.201 |
| 0.00, 62.06, 3.18 | SacreCoeur/rubble_stone | 114 | 6.104 |
| 0.00, 62.06, -3.18 | SacreCoeur/rubble_stone | 114 | 6.104 |
| 0.00, 62.01, 3.24 | SacreCoeur/rubble_stone | 90 | 6.014 |
| 0.00, 62.01, -3.24 | SacreCoeur/rubble_stone | 90 | 6.014 |
| 0.00, 61.96, 3.28 | SacreCoeur/rubble_stone | 76 | 5.933 |
| 0.00, 61.96, -3.28 | SacreCoeur/rubble_stone | 76 | 5.933 |
| 0.00, 61.90, 3.32 | SacreCoeur/rubble_stone | 66 | 5.863 |
| 0.00, 61.90, -3.32 | SacreCoeur/rubble_stone | 66 | 5.863 |
| 0.00, 61.84, 3.35 | SacreCoeur/rubble_stone | 60 | 5.807 |
| 0.00, 61.84, -3.35 | SacreCoeur/rubble_stone | 60 | 5.807 |
| 0.00, 61.77, 3.37 | SacreCoeur/rubble_stone | 57 | 5.765 |
| 0.00, 61.77, -3.37 | SacreCoeur/rubble_stone | 57 | 5.765 |
| 0.00, 61.70, 3.38 | SacreCoeur/rubble_stone | 55 | 5.739 |
| 0.00, 61.70, -3.38 | SacreCoeur/rubble_stone | 55 | 5.739 |
| 0.00, 61.62, 3.58 | SacreCoeur/rubble_stone | 46 | 5.73 |
| 0.00, 61.62, -3.58 | SacreCoeur/rubble_stone | 46 | 5.73 |
| 0.00, 60.76, 4.67 | SacreCoeur/rubble_stone | 40 | 4.036 |
| 0.00, 60.81, 4.62 | SacreCoeur/rubble_stone | 44 | 4.084 |
| 0.00, 61.52, 3.88 | SacreCoeur/rubble_stone | 77 | 5.03 |
| 0.00, 61.56, 3.82 | SacreCoeur/rubble_stone | 98 | 5.121 |
| 0.00, 61.56, -3.82 | SacreCoeur/rubble_stone | 98 | 5.121 |
| 0.00, 61.52, -3.88 | SacreCoeur/rubble_stone | 77 | 5.03 |
| 0.00, 60.81, -4.62 | SacreCoeur/rubble_stone | 44 | 4.084 |
| 0.00, 60.76, -4.67 | SacreCoeur/rubble_stone | 40 | 4.036 |
| 0.00, 61.08, 2.63 | SacreCoeur/rubble_stone | 628 | 1.443 |
| 0.00, 61.08, -2.63 | SacreCoeur/rubble_stone | 628 | 1.443 |
| 0.00, 61.02, 2.67 | SacreCoeur/rubble_stone | 77 | 1.338 |
| 0.00, 61.02, -2.67 | SacreCoeur/rubble_stone | 77 | 1.338 |
| 0.00, 60.67, 3.00 | SacreCoeur/rubble_stone | 361 | 1.043 |
| 0.00, 60.67, -3.00 | SacreCoeur/rubble_stone | 361 | 1.043 |

(1589 more in the JSON)

## nonmanifold (warn, 46)

| at | part | uses |
|---|---|---|
| 29.75, 63.16, -8.10 | SacreCoeur/rubble_stone | 3 |
| 29.75, 63.16, 7.60 | SacreCoeur/rubble_stone | 3 |
| -1.69, 58.59, -7.95 | SacreCoeur/slate | 3 |
| -1.69, 58.51, -7.95 | SacreCoeur/slate | 3 |
| -0.87, 58.55, -7.95 | SacreCoeur/slate | 3 |
| -2.50, 58.55, -7.95 | SacreCoeur/slate | 3 |
| 26.13, 68.15, -4.17 | SacreCoeur/slate | 3 |
| 26.13, 68.15, 3.67 | SacreCoeur/slate | 3 |
| 26.13, 68.01, 3.67 | SacreCoeur/slate | 3 |
| 26.13, 68.01, -4.17 | SacreCoeur/slate | 3 |
| 22.50, 63.23, -8.10 | SacreCoeur/slate | 3 |
| 28.70, 71.53, 0.00 | SacreCoeur/slate | 5 |
| 22.50, 63.23, 7.60 | SacreCoeur/slate | 3 |
| 29.75, 72.93, -0.25 | SacreCoeur/slate | 4 |
| 33.38, 68.15, 3.67 | SacreCoeur/slate | 3 |
| 33.38, 68.15, -4.17 | SacreCoeur/slate | 3 |
| 33.38, 68.01, -4.17 | SacreCoeur/slate | 3 |
| 33.38, 68.01, 3.67 | SacreCoeur/slate | 3 |
| 37.00, 63.23, 7.60 | SacreCoeur/slate | 3 |
| 34.23, 66.93, -0.25 | SacreCoeur/slate | 5 |
| 37.00, 63.23, -8.10 | SacreCoeur/slate | 3 |
| 39.39, 67.00, -0.25 | SacreCoeur/slate | 3 |
| 45.74, 63.38, -2.77 | SacreCoeur/slate | 3 |
| 45.74, 63.24, -2.77 | SacreCoeur/slate | 3 |
| 39.39, 66.86, -0.25 | SacreCoeur/slate | 3 |
| 44.55, 66.93, -0.25 | SacreCoeur/slate | 5 |
| 46.93, 59.70, -5.30 | SacreCoeur/slate | 3 |
| 45.74, 63.38, 2.27 | SacreCoeur/slate | 3 |
| 45.74, 63.24, 2.27 | SacreCoeur/slate | 3 |
| 46.93, 59.70, 4.80 | SacreCoeur/slate | 3 |
| 47.08, 63.38, -1.41 | SacreCoeur/slate | 3 |
| 47.08, 63.24, -1.41 | SacreCoeur/slate | 3 |
| 49.60, 59.70, -2.57 | SacreCoeur/slate | 3 |
| 47.08, 63.38, 0.91 | SacreCoeur/slate | 3 |
| 47.08, 63.24, 0.91 | SacreCoeur/slate | 3 |
| 49.60, 59.70, 2.07 | SacreCoeur/slate | 3 |
| 14.39, 71.60, 0.00 | SacreCoeur/slate | 3 |
| 14.39, 71.46, 0.00 | SacreCoeur/slate | 3 |
| 0.08, 71.53, 0.00 | SacreCoeur/slate | 3 |
| 40.50, 62.53, 10.50 | SacreCoeur/slate | 4 |

(6 more in the JSON)

## tjunction (warn, 137)

| at | part | edge_m |
|---|---|---|
| 0.00, 57.70, 7.20 | SacreCoeur/rubble_stone | 10.435 |
| 0.00, 57.70, -7.20 | SacreCoeur/rubble_stone | 10.435 |
| 0.00, 56.00, -6.25 | SacreCoeur/rubble_stone | 0.55 |
| 0.00, 56.00, 5.80 | SacreCoeur/rubble_stone | 0.55 |
| 0.00, 56.31, -9.80 | SacreCoeur/rubble_stone | 3.19 |
| 0.00, 56.05, 10.20 | SacreCoeur/rubble_stone | 3.45 |
| 49.30, 56.80, -9.80 | SacreCoeur/rubble_stone | 0.712 |
| 51.95, 55.70, -9.80 | SacreCoeur/rubble_stone | 7.5 |
| 41.10, 55.50, -9.80 | SacreCoeur/rubble_stone | 5.2 |
| 0.00, 59.20, -7.20 | SacreCoeur/rubble_stone | 3.955 |
| 22.50, 61.59, -7.20 | SacreCoeur/rubble_stone | 3.955 |
| 22.50, 61.59, 7.20 | SacreCoeur/rubble_stone | 3.955 |
| 0.00, 59.20, 7.20 | SacreCoeur/rubble_stone | 3.955 |
| 22.50, 57.06, -8.10 | SacreCoeur/rubble_stone | 6.145 |
| 37.00, 57.06, -8.10 | SacreCoeur/rubble_stone | 6.145 |
| 22.50, 57.70, -7.20 | SacreCoeur/rubble_stone | 3.935 |
| 37.00, 57.44, 7.60 | SacreCoeur/rubble_stone | 5.82 |
| 22.50, 57.39, 7.60 | SacreCoeur/rubble_stone | 5.82 |
| 22.50, 57.70, 7.20 | SacreCoeur/rubble_stone | 3.935 |
| 37.00, 59.13, -5.00 | SacreCoeur/rubble_stone | 4.08 |
| 37.00, 60.20, -5.00 | SacreCoeur/rubble_stone | 3.01 |
| 37.00, 63.08, 3.40 | SacreCoeur/rubble_stone | 1.435 |
| 37.00, 63.08, 6.80 | SacreCoeur/rubble_stone | 4.185 |
| 37.00, 59.27, 7.60 | SacreCoeur/rubble_stone | 4.185 |
| 37.00, 60.15, -5.00 | SacreCoeur/rubble_stone | 1.07 |
| 46.80, 59.43, -5.00 | SacreCoeur/rubble_stone | 1.07 |
| 46.80, 56.62, 4.50 | SacreCoeur/rubble_stone | 3.885 |
| 43.03, 60.15, 4.50 | SacreCoeur/rubble_stone | 0.3 |
| 49.30, 56.50, 1.95 | SacreCoeur/rubble_stone | 8.75 |
| 46.80, 56.31, 4.50 | SacreCoeur/rubble_stone | 8.75 |
| 49.30, 56.80, -2.45 | SacreCoeur/rubble_stone | 3.45 |
| 49.30, 56.80, 1.95 | SacreCoeur/rubble_stone | 3.45 |
| 46.80, 59.13, -5.00 | SacreCoeur/rubble_stone | 8.75 |
| 49.30, 56.50, -2.45 | SacreCoeur/rubble_stone | 8.75 |
| 37.00, 63.30, 6.80 | SacreCoeur/rubble_stone | 5.8 |
| 37.00, 63.30, 3.40 | SacreCoeur/rubble_stone | 5.8 |
| 37.00, 61.73, 3.40 | SacreCoeur/rubble_stone | 17.8 |
| 37.00, 58.98, 6.80 | SacreCoeur/rubble_stone | 17.8 |
| 37.00, 56.05, 10.20 | SacreCoeur/rubble_stone | 3.525 |
| 37.00, 58.98, 7.60 | SacreCoeur/rubble_stone | 1.835 |

(97 more in the JSON)

## seam (info, 754)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 37.31, 63.08, 3.40 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 20.4 | 108 | 90 |
| 37.37, 65.05, 3.40 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 20.4 | 108 | 90 |
| 4.60, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 94 | 90 |
| 9.20, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 86 | 90 |
| 13.80, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 78 | 90 |
| 32.20, 55.35, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 74 | 90 |
| 18.40, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 70 | 90 |
| 0.00, 57.35, 3.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 15.58 | 68 | 90 |
| 32.20, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 66 | 42.6 |
| 27.60, 55.35, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 66 | 90 |
| 0.00, 56.83, 0.66 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 5.69 | 64 | 78.7 |
| 27.60, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 62 | 42.6 |
| 23.00, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 62 | 90 |
| 37.06, 68.83, 3.40 | SacreCoeur/rubble_stone + SacreCoeur/slate | 10.2 | 60 | 90 |
| 0.00, 54.87, 4.11 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 3.29 | 58 | 78.7 |
| 23.00, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 58 | 42.6 |
| 23.00, 55.35, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 58 | 90 |
| 18.40, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 54 | 42.6 |
| 27.60, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 54 | 90 |
| 0.00, 55.67, -3.35 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 3.29 | 52 | 78.7 |
| 18.41, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 50 | 42.6 |
| 18.40, 55.35, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 50 | 90 |
| 36.73, 57.74, 7.60 | SacreCoeur/rubble_stone + SacreCoeur/slate | 29.12 | 47 | 57 |
| 13.80, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 46 | 42.6 |
| 32.20, 55.35, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 46 | 90 |
| 23.00, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 46 | 42.6 |
| 13.80, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 46 | 42.6 |
| 22.74, 57.41, -8.10 | SacreCoeur/rubble_stone + SacreCoeur/slate | 29 | 45 | 57 |
| 9.20, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 42 | 42.6 |
| 27.60, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 42 | 42.6 |
| 9.20, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 42 | 42.6 |
| 13.80, 55.35, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 9.26 | 42 | 90 |
| 0.00, 55.35, 5.75 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 10.7 | 40 | 90 |
| 36.62, 55.91, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/slate | 37.26 | 40 | 57 |
| 53.00, 56.96, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 44.27 | 39 | 90 |
| 0.25, 61.49, -7.20 | SacreCoeur/rubble_stone + SacreCoeur/slate | 45.1 | 39 | 35.8 |
| 22.35, 61.49, 7.20 | SacreCoeur/rubble_stone + SacreCoeur/slate | 45.1 | 39 | 35.8 |
| -3.85, 55.79, -6.27 | SacreCoeur/rubble_stone + SacreCoeur/slate | 27.89 | 38 | 49.6 |
| 4.60, 55.85, -9.80 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 38 | 42.6 |
| 32.20, 55.85, 10.20 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 2.24 | 38 | 42.6 |

(714 more in the JSON)

## opening (info, 82)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.81, 55.96, -6.07 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 5.053 |
| 0.00, 59.20, -9.75 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 2.6 |
| 0.00, 56.42, -9.17 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 3.101 |
| -3.46, 56.26, 6.07 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 4.594 |
| 0.00, 59.20, 7.25 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 3 |
| 0.00, 57.67, 7.24 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 3.578 |
| 50.18, 56.98, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 4.243 |
| -3.81, 55.96, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 5.053 |
| 49.29, 56.65, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 0.49 |
| 52.00, 55.70, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 2.1 |
| 55.20, 55.70, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 2.1 |
| 41.15, 55.50, -9.80 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 2.8 |
| 46.76, 56.65, 10.20 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 8.69 |
| 37.00, 59.23, 10.20 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 3.225 |
| 0.00, 59.15, 10.20 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 3.15 |
| 22.50, 63.16, -8.05 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 2.002 |
| 22.50, 62.81, -8.10 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 6.095 |
| 22.50, 57.09, -8.06 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 1.073 |
| 36.95, 57.34, 7.60 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 14.5 |
| 22.50, 62.81, 7.60 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 5.77 |
| 22.50, 63.16, 7.55 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 1.502 |
| 22.50, 57.42, 7.56 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 0.477 |
| 37.00, 62.81, -8.10 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 6.095 |
| 37.00, 57.09, -8.06 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 3.697 |
| 37.00, 63.16, -4.95 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 2.068 |
| 37.00, 63.16, 2.48 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 0.968 |
| 37.00, 63.16, 7.55 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 0.8 |
| 46.55, 56.56, 4.50 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 5.205 |
| 37.00, 56.21, 9.49 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 3.101 |
| 40.45, 62.55, 4.50 | SacreCoeur/rubble_stone | 0 + 0 + -1 | 0.138 |
| 49.30, 56.65, -9.05 | SacreCoeur/rubble_stone | -1 + 0 + 0 | 0.3 |
| 49.30, 56.99, -8.75 | SacreCoeur/rubble_stone | 1 + 0 + 0 | 4.826 |
| 49.25, 59.43, -5.00 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 2.5 |
| 55.96, 56.84, -1.00 | SacreCoeur/rubble_stone | 0 + 0 + 1 | 4.243 |
| 0.14, 52.78, 1.37 | SacreCoeur/stone_white | 0 + 1 + 0 | 2.84 |
| 0.28, 52.78, 1.20 | SacreCoeur/stone_white | 0 + 1 + 0 | 2.5 |
| 0.14, 52.78, -2.40 | SacreCoeur/stone_white | 0 + 1 + 0 | 1.5 |
| 0.28, 52.78, -2.55 | SacreCoeur/stone_white | 0 + 1 + 0 | 1.2 |
| 0.14, 52.78, 3.80 | SacreCoeur/stone_white | 0 + 1 + 0 | 1.5 |
| 0.28, 52.78, 3.65 | SacreCoeur/stone_white | 0 + 1 + 0 | 1.2 |

(42 more in the JSON)

## backtoback (info, 923)

| at | parts | area |
|---|---|---|
| -0.15, 56.00, -5.86 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.01834 |
| -0.23, 56.00, -5.95 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.01388 |
| -0.05, 56.00, -5.95 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.04016 |
| -0.17, 56.00, -6.14 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.04462 |
| -0.16, 52.25, -5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.36123 |
| -0.40, 51.71, -5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.01884 |
| -0.37, 52.36, -5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.08922 |
| -0.15, 56.00, 6.20 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.01834 |
| -0.23, 56.00, 6.10 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.01388 |
| -0.04, 56.00, 6.04 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.04016 |
| -0.17, 56.00, 5.91 | SacreCoeur/rubble_stone + SacreCoeur/rubble_stone | 0.04462 |
| -0.25, 52.00, 5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.35208 |
| -0.28, 52.65, 5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.08585 |
| -0.03, 52.25, 5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.09836 |
| -0.09, 52.75, 5.75 | SacreCoeur/rubble_stone + SacreCoeur/stone_white | 0.0097 |
| 37.00, 63.27, 6.79 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00096 |
| 37.00, 63.25, 3.40 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00049 |
| 37.00, 63.29, 3.41 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00047 |
| 37.00, 63.27, 6.78 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00084 |
| 37.00, 63.25, 3.41 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00043 |
| 37.00, 63.29, 3.42 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00042 |
| 37.00, 63.27, 6.77 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00129 |
| 37.00, 63.27, 6.75 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00087 |
| 37.00, 63.27, 6.74 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.00129 |
| 37.00, 63.22, 4.31 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.09567 |
| 37.00, 63.25, 5.29 | SacreCoeur/rubble_stone + SacreCoeur/slate | 0.23724 |
| -0.01, 57.60, 0.02 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00733 |
| -0.00, 57.60, -0.28 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00017 |
| -0.02, 57.60, 0.01 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00713 |
| -0.01, 57.60, -0.29 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00037 |
| -0.07, 57.47, 0.35 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00898 |
| -0.02, 57.47, 0.14 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.04037 |
| -0.08, 57.47, -0.09 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.02862 |
| -0.02, 57.47, -0.33 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.02073 |
| -0.01, 57.60, 1.06 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00733 |
| -0.00, 57.60, 0.76 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00017 |
| -0.02, 57.60, 1.05 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00713 |
| -0.01, 57.60, 0.75 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.00037 |
| -0.05, 57.47, 1.34 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.01697 |
| -0.01, 57.47, 1.15 | SacreCoeur/stone_white + SacreCoeur/stone_white | 0.03238 |

(883 more in the JSON)


Nodes: SacreCoeur. Distances: {"SacreCoeur":128}. Quantum 0.000 mm. Offset 0,0,0.
