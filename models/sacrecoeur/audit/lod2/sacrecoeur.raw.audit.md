# Mesh audit: sacrecoeur.raw.glb

2,965 triangles, 1,707 welded vertices, 394 open edges, 294,986 rays, 2677 ms.

**0 blocking**, 421 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 338 |
| nonmanifold | warn | 42 |
| tjunction | warn | 41 |
| seam | info | 94 |
| opening | info | 128 |
| backtoback | info | 49 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 338)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 62.04, 2.82 | SacreCoeur_xfar/rubble_stone | 2090 | 7.01 |
| 0.00, 62.04, -2.82 | SacreCoeur_xfar/rubble_stone | 2090 | 7.01 |
| 0.00, 60.99, 2.50 | SacreCoeur_xfar/rubble_stone | 205 | 1.443 |
| 0.00, 60.99, -2.50 | SacreCoeur_xfar/rubble_stone | 205 | 1.443 |
| 0.00, 57.09, 4.65 | SacreCoeur_xfar/rubble_stone | 217 | 9.774 |
| 0.00, 57.09, -4.65 | SacreCoeur_xfar/rubble_stone | 217 | 9.774 |
| 0.00, 56.04, 3.08 | SacreCoeur_xfar/rubble_stone | 79 | 3.263 |
| 0.00, 56.22, 1.98 | SacreCoeur_xfar/rubble_stone | 188 | 4.834 |
| 0.00, 56.62, 0.85 | SacreCoeur_xfar/rubble_stone | 190 | 4.857 |
| 0.00, 57.03, -0.33 | SacreCoeur_xfar/rubble_stone | 57 | 2.76 |
| 0.00, 54.21, 2.03 | SacreCoeur_xfar/rubble_stone | 2378 | 2.44 |
| 0.00, 54.21, -2.03 | SacreCoeur_xfar/rubble_stone | 2377 | 2.44 |
| 0.00, 52.25, 1.14 | SacreCoeur_xfar/rubble_stone | 94 | 9.532 |
| 0.00, 52.25, 0.33 | SacreCoeur_xfar/rubble_stone | 45 | 11.311 |
| -3.85, 53.94, -6.81 | SacreCoeur_xfar/rubble_stone | 7353 | 4.341 |
| -3.85, 53.94, -9.06 | SacreCoeur_xfar/rubble_stone | 7341 | 4.341 |
| -3.50, 53.94, 9.32 | SacreCoeur_xfar/rubble_stone | 592 | 4.397 |
| -3.50, 53.94, 6.95 | SacreCoeur_xfar/rubble_stone | 592 | 4.397 |
| 54.93, 56.64, -9.80 | SacreCoeur_xfar/rubble_stone | 61 | 10.224 |
| 15.15, 56.18, -9.80 | SacreCoeur_xfar/rubble_stone | 150 | 53.139 |
| 34.56, 55.95, -9.80 | SacreCoeur_xfar/rubble_stone | 94 | 62.101 |
| 16.32, 55.69, -9.80 | SacreCoeur_xfar/rubble_stone | 160 | 54.801 |
| 35.12, 55.71, -9.80 | SacreCoeur_xfar/rubble_stone | 1613 | 62.101 |
| 18.52, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 53575 | 49.1 |
| 20.05, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 12558 | 48.2 |
| 21.58, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 44006 | 44.5 |
| 23.12, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 10276 | 43.6 |
| 24.65, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 35379 | 39.9 |
| 26.18, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 8222 | 39 |
| 27.72, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 27691 | 35.3 |
| 29.25, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 6397 | 34.4 |
| 30.78, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 20945 | 30.7 |
| 32.32, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 4800 | 29.8 |
| 33.85, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 15138 | 26.1 |
| 35.38, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 3433 | 25.2 |
| 36.92, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 10272 | 21.5 |
| 38.45, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 2294 | 20.6 |
| 39.98, 55.57, -9.80 | SacreCoeur_xfar/rubble_stone | 6347 | 16.9 |
| 43.63, 55.52, -9.80 | SacreCoeur_xfar/rubble_stone | 88 | 16 |
| -0.10, 54.05, -9.80 | SacreCoeur_xfar/rubble_stone | 254 | 7.17 |

(298 more in the JSON)

## nonmanifold (warn, 42)

| at | part | uses |
|---|---|---|
| 29.75, 63.16, -8.10 | SacreCoeur_xfar/rubble_stone | 3 |
| 29.75, 63.16, 7.60 | SacreCoeur_xfar/rubble_stone | 3 |
| 26.13, 68.15, -4.17 | SacreCoeur_xfar/slate | 3 |
| 26.13, 68.15, 3.67 | SacreCoeur_xfar/slate | 3 |
| 26.13, 68.01, 3.67 | SacreCoeur_xfar/slate | 3 |
| 26.13, 68.01, -4.17 | SacreCoeur_xfar/slate | 3 |
| 22.50, 63.23, -8.10 | SacreCoeur_xfar/slate | 3 |
| 28.70, 71.53, 0.00 | SacreCoeur_xfar/slate | 5 |
| 22.50, 63.23, 7.60 | SacreCoeur_xfar/slate | 3 |
| 29.75, 72.93, -0.25 | SacreCoeur_xfar/slate | 4 |
| 33.38, 68.15, 3.67 | SacreCoeur_xfar/slate | 3 |
| 33.38, 68.15, -4.17 | SacreCoeur_xfar/slate | 3 |
| 33.38, 68.01, -4.17 | SacreCoeur_xfar/slate | 3 |
| 33.38, 68.01, 3.67 | SacreCoeur_xfar/slate | 3 |
| 37.00, 63.23, 7.60 | SacreCoeur_xfar/slate | 3 |
| 34.23, 66.93, -0.25 | SacreCoeur_xfar/slate | 5 |
| 37.00, 63.23, -8.10 | SacreCoeur_xfar/slate | 3 |
| 39.39, 67.00, -0.25 | SacreCoeur_xfar/slate | 3 |
| 45.74, 63.38, -2.77 | SacreCoeur_xfar/slate | 3 |
| 45.74, 63.24, -2.77 | SacreCoeur_xfar/slate | 3 |
| 39.39, 66.86, -0.25 | SacreCoeur_xfar/slate | 3 |
| 44.55, 66.93, -0.25 | SacreCoeur_xfar/slate | 5 |
| 46.93, 59.70, -5.30 | SacreCoeur_xfar/slate | 3 |
| 45.74, 63.38, 2.27 | SacreCoeur_xfar/slate | 3 |
| 45.74, 63.24, 2.27 | SacreCoeur_xfar/slate | 3 |
| 46.93, 59.70, 4.80 | SacreCoeur_xfar/slate | 3 |
| 47.08, 63.38, -1.41 | SacreCoeur_xfar/slate | 3 |
| 47.08, 63.24, -1.41 | SacreCoeur_xfar/slate | 3 |
| 49.60, 59.70, -2.57 | SacreCoeur_xfar/slate | 3 |
| 47.08, 63.38, 0.91 | SacreCoeur_xfar/slate | 3 |
| 47.08, 63.24, 0.91 | SacreCoeur_xfar/slate | 3 |
| 49.60, 59.70, 2.07 | SacreCoeur_xfar/slate | 3 |
| 14.39, 71.60, 0.00 | SacreCoeur_xfar/slate | 3 |
| 14.39, 71.46, 0.00 | SacreCoeur_xfar/slate | 3 |
| 0.08, 71.53, 0.00 | SacreCoeur_xfar/slate | 3 |
| 40.50, 62.53, 10.50 | SacreCoeur_xfar/slate | 4 |
| 40.50, 62.53, 4.51 | SacreCoeur_xfar/slate | 4 |
| 40.50, 62.53, 6.81 | SacreCoeur_xfar/slate | 4 |
| 53.00, 59.80, -5.47 | SacreCoeur_xfar/slate | 3 |
| 53.00, 59.66, -5.47 | SacreCoeur_xfar/slate | 3 |

(2 more in the JSON)

## tjunction (warn, 41)

| at | part | edge_m |
|---|---|---|
| 0.00, 57.70, 7.20 | SacreCoeur_xfar/rubble_stone | 10.435 |
| 0.00, 57.70, -7.20 | SacreCoeur_xfar/rubble_stone | 10.435 |
| 0.00, 56.00, -6.25 | SacreCoeur_xfar/rubble_stone | 0.55 |
| 0.00, 56.00, 5.80 | SacreCoeur_xfar/rubble_stone | 0.55 |
| 0.00, 56.31, -9.80 | SacreCoeur_xfar/rubble_stone | 3.19 |
| 0.00, 56.05, 10.20 | SacreCoeur_xfar/rubble_stone | 3.45 |
| 49.30, 56.80, -9.80 | SacreCoeur_xfar/rubble_stone | 0.712 |
| 51.85, 55.60, -9.80 | SacreCoeur_xfar/rubble_stone | 7.3 |
| 41.00, 55.40, -9.80 | SacreCoeur_xfar/rubble_stone | 5 |
| 0.00, 59.20, -7.20 | SacreCoeur_xfar/rubble_stone | 3.955 |
| 22.50, 61.59, -7.20 | SacreCoeur_xfar/rubble_stone | 3.955 |
| 22.50, 61.59, 7.20 | SacreCoeur_xfar/rubble_stone | 3.955 |
| 0.00, 59.20, 7.20 | SacreCoeur_xfar/rubble_stone | 3.955 |
| 22.50, 57.06, -8.10 | SacreCoeur_xfar/rubble_stone | 6.145 |
| 37.00, 57.06, -8.10 | SacreCoeur_xfar/rubble_stone | 6.145 |
| 22.50, 57.70, -7.20 | SacreCoeur_xfar/rubble_stone | 3.935 |
| 37.00, 57.44, 7.60 | SacreCoeur_xfar/rubble_stone | 5.82 |
| 22.50, 57.39, 7.60 | SacreCoeur_xfar/rubble_stone | 5.82 |
| 22.50, 57.70, 7.20 | SacreCoeur_xfar/rubble_stone | 3.935 |
| 37.00, 59.13, -5.00 | SacreCoeur_xfar/rubble_stone | 4.08 |
| 37.00, 60.20, -5.00 | SacreCoeur_xfar/rubble_stone | 3.01 |
| 37.00, 59.27, 7.60 | SacreCoeur_xfar/rubble_stone | 4.185 |
| 37.00, 60.15, -5.00 | SacreCoeur_xfar/rubble_stone | 1.07 |
| 46.80, 59.43, -5.00 | SacreCoeur_xfar/rubble_stone | 1.07 |
| 46.80, 56.62, 4.50 | SacreCoeur_xfar/rubble_stone | 3.885 |
| 43.03, 60.15, 4.50 | SacreCoeur_xfar/rubble_stone | 0.3 |
| 49.30, 56.50, 1.95 | SacreCoeur_xfar/rubble_stone | 8.75 |
| 46.80, 56.31, 4.50 | SacreCoeur_xfar/rubble_stone | 8.75 |
| 49.30, 56.80, -2.45 | SacreCoeur_xfar/rubble_stone | 3.45 |
| 49.30, 56.80, 1.95 | SacreCoeur_xfar/rubble_stone | 3.45 |
| 46.80, 59.13, -5.00 | SacreCoeur_xfar/rubble_stone | 8.75 |
| 49.30, 56.50, -2.45 | SacreCoeur_xfar/rubble_stone | 8.75 |
| 37.00, 61.73, 3.40 | SacreCoeur_xfar/rubble_stone | 17.8 |
| 37.00, 58.98, 6.80 | SacreCoeur_xfar/rubble_stone | 17.8 |
| 37.00, 56.05, 10.20 | SacreCoeur_xfar/rubble_stone | 3.525 |
| 37.00, 58.98, 7.60 | SacreCoeur_xfar/rubble_stone | 1.835 |
| 46.80, 56.31, 4.50 | SacreCoeur_xfar/rubble_stone | 5.415 |
| 49.30, 56.50, -2.45 | SacreCoeur_xfar/rubble_stone | 5.6 |
| 49.30, 56.50, 1.95 | SacreCoeur_xfar/rubble_stone | 5.6 |
| 49.30, 56.80, -5.00 | SacreCoeur_xfar/rubble_stone | 8.23 |

(1 more in the JSON)

## seam (info, 94)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 4.60, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 88 | 90 |
| 9.20, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 80 | 90 |
| 13.80, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 72 | 90 |
| 32.20, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 68 | 90 |
| 18.40, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 64 | 90 |
| 27.60, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 60 | 90 |
| 23.00, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 56 | 90 |
| 23.00, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 52 | 90 |
| 27.60, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 48 | 90 |
| 18.40, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 44 | 90 |
| 32.20, 55.35, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 40 | 90 |
| 36.71, 55.91, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 37.26 | 37 | 57 |
| 13.80, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 36 | 90 |
| 37.32, 61.77, 3.40 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 11.95 | 33 | 34.9 |
| 36.73, 57.74, 7.60 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 29.12 | 31 | 57 |
| 0.00, 55.29, 5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 10.7 | 30 | 90 |
| 22.75, 57.41, -8.10 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 29 | 29 | 57 |
| 9.20, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 28 | 90 |
| -3.85, 55.79, -6.29 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 25.23 | 25 | 49.6 |
| 0.24, 61.49, -7.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 45.1 | 25 | 35.8 |
| 22.34, 61.49, 7.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 45.1 | 25 | 35.8 |
| 37.06, 68.83, 3.40 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 10.2 | 24 | 90 |
| -3.50, 56.09, 10.09 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 15.01 | 20 | 49.6 |
| 4.60, 55.35, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 9.26 | 20 | 90 |
| 38.65, 80.00, 5.09 | SacreCoeur_xfar/cast_iron_green + SacreCoeur_xfar/cast_iron_green | 0.8 | 20 | 90 |
| 43.63, 59.62, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 29.04 | 19 | 46.5 |
| 0.00, 52.80, 1.59 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 18.82 | 18 | 90 |
| 0.00, 54.65, -6.30 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 10.7 | 16 | 90 |
| 0.00, 56.51, 6.07 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 8 | 14 | 90 |
| 49.95, 56.75, -9.47 | SacreCoeur_xfar/slate + SacreCoeur_xfar/zinc_roof | 17.54 | 14 | 45 |
| -0.26, 58.98, -5.94 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 1.57 | 13 | 49.6 |
| -0.26, 58.98, 6.17 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 1.57 | 13 | 49.6 |
| 43.26, 59.98, 4.66 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 3.36 | 12 | 34.9 |
| 54.50, 58.30, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 9.47 | 11 | 90 |
| 14.93, 56.17, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 97.56 | 11 | 57 |
| 38.90, 60.94, 10.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 9.9 | 10 | 90 |
| 51.50, 58.30, -9.80 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 9.47 | 8 | 90 |
| 37.00, 63.30, 6.79 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 3.4 | 8 | 36.8 |
| 37.00, 68.83, 6.74 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 3.4 | 8 | 90 |
| 39.68, 68.83, 7.00 | SacreCoeur_xfar/stone_white + SacreCoeur_xfar/slate | 15.2 | 8 | 90 |

(54 more in the JSON)

## opening (info, 128)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.00, 61.68, 7.17 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 12.294 |
| 0.00, 71.56, -0.03 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 12.294 |
| -3.81, 55.96, -6.07 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 5.053 |
| 0.00, 59.20, -9.75 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 2.6 |
| 0.00, 56.42, -9.17 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 3.101 |
| -3.46, 56.26, 6.07 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 4.594 |
| 0.00, 59.20, 7.25 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 3 |
| 0.00, 57.67, 7.24 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 3.578 |
| 50.04, 56.84, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 4.243 |
| -3.81, 55.96, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 5.053 |
| 49.29, 56.65, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 0.49 |
| 56.05, 56.80, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 3.5 |
| 51.90, 55.60, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 2.3 |
| 55.10, 55.60, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 2.3 |
| 41.05, 55.40, -9.80 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 3 |
| 46.76, 56.65, 10.20 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 8.69 |
| 37.00, 59.23, 10.20 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 3.225 |
| 0.00, 59.15, 10.20 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 3.15 |
| 0.05, 61.66, -7.20 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 22.5 |
| 0.05, 61.66, 7.20 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 22.5 |
| 22.55, 57.02, -8.10 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 14.5 |
| 22.50, 63.16, -8.05 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 2.002 |
| 22.50, 63.11, -8.10 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 6.095 |
| 22.50, 57.09, -8.06 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 1.073 |
| 36.95, 57.34, 7.60 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 14.5 |
| 22.50, 63.11, 7.60 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 5.77 |
| 22.50, 63.16, 7.55 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 1.502 |
| 22.50, 57.42, 7.56 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 0.477 |
| 37.00, 63.11, -8.10 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 6.095 |
| 37.00, 57.09, -8.06 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 3.697 |
| 37.00, 63.16, -4.95 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 2.068 |
| 37.00, 63.16, 2.48 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 0.968 |
| 37.00, 63.16, 7.55 | SacreCoeur_xfar/rubble_stone | 1 + 0 + 0 | 0.8 |
| 46.55, 56.56, 4.50 | SacreCoeur_xfar/rubble_stone | 0 + 0 + 1 | 5.205 |
| 37.00, 63.65, 6.80 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 5.8 |
| 37.00, 68.65, 3.40 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 5.8 |
| 37.00, 56.21, 9.49 | SacreCoeur_xfar/rubble_stone | -1 + 0 + 0 | 3.101 |
| 40.45, 62.55, 4.50 | SacreCoeur_xfar/rubble_stone | 0 + 0 + -1 | 0.138 |
| 50.35, 56.80, 5.05 | SacreCoeur_xfar/rubble_stone | -0.06 + 0 + 1 | 1.102 |
| 50.44, 56.80, 5.08 | SacreCoeur_xfar/rubble_stone | -0.59 + 0 + 0.81 | 0.594 |

(88 more in the JSON)

## backtoback (info, 49)

| at | parts | area |
|---|---|---|
| -0.15, 56.00, -5.86 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.01834 |
| -0.23, 56.00, -5.95 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.01388 |
| -0.05, 56.00, -5.95 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.04016 |
| -0.17, 56.00, -6.14 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.04462 |
| -0.16, 52.25, -5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.36123 |
| -0.40, 51.71, -5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.01884 |
| -0.37, 52.36, -5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.08922 |
| -0.15, 56.00, 6.20 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.01834 |
| -0.23, 56.00, 6.10 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.01388 |
| -0.04, 56.00, 6.04 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.04016 |
| -0.17, 56.00, 5.91 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/rubble_stone | 0.04462 |
| -0.25, 52.00, 5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.35208 |
| -0.28, 52.65, 5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.08585 |
| -0.03, 52.25, 5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.09836 |
| -0.09, 52.75, 5.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/stone_white | 0.0097 |
| 37.00, 63.27, 6.79 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00108 |
| 37.00, 63.25, 3.40 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00055 |
| 37.00, 63.29, 3.41 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00053 |
| 37.00, 63.27, 6.78 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00094 |
| 37.00, 63.25, 3.42 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00047 |
| 37.00, 63.29, 3.43 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00046 |
| 37.00, 63.27, 6.77 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00087 |
| 37.00, 63.27, 6.75 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00129 |
| 37.00, 63.27, 6.74 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.00087 |
| 37.00, 63.22, 4.31 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.09557 |
| 37.00, 63.25, 5.29 | SacreCoeur_xfar/rubble_stone + SacreCoeur_xfar/slate | 0.23734 |
| 25.75, 67.53, -2.86 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.27677 |
| 27.95, 70.54, -0.73 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.29345 |
| 26.93, 69.21, -1.72 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.27731 |
| 25.58, 67.30, 3.02 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.29322 |
| 27.90, 70.44, 0.77 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.31137 |
| 26.35, 68.44, 2.27 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.29262 |
| 35.55, 65.13, 0.98 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.12101 |
| 34.57, 66.50, 0.06 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.1287 |
| 35.03, 65.93, 0.49 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.12156 |
| 35.63, 65.02, -1.55 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.12876 |
| 34.59, 66.44, -0.58 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.13682 |
| 35.28, 65.58, -1.23 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.12815 |
| 40.50, 62.47, 5.50 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.04468 |
| 40.50, 62.49, 6.60 | SacreCoeur_xfar/slate + SacreCoeur_xfar/slate | 0.01716 |

(9 more in the JSON)


Nodes: SacreCoeur_xfar. Distances: {"SacreCoeur_xfar":6000}. Quantum 0.000 mm. Offset 0,0,0.
