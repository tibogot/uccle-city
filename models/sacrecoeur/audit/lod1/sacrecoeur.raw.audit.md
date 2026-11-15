# Mesh audit: sacrecoeur.raw.glb

8,410 triangles, 4,590 welded vertices, 785 open edges, 347,546 rays, 4291 ms.

**0 blocking**, 1018 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 843 |
| nonmanifold | warn | 46 |
| tjunction | warn | 129 |
| seam | info | 278 |
| opening | info | 110 |
| backtoback | info | 353 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 843)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 62.27, 2.46 | SacreCoeur_far/rubble_stone | 82 | 7.271 |
| 0.00, 62.27, -2.46 | SacreCoeur_far/rubble_stone | 82 | 7.271 |
| 0.00, 62.17, 2.81 | SacreCoeur_far/rubble_stone | 95 | 7.081 |
| 0.00, 62.17, -2.81 | SacreCoeur_far/rubble_stone | 95 | 7.081 |
| 0.00, 62.07, 3.15 | SacreCoeur_far/rubble_stone | 67 | 6.201 |
| 0.00, 62.07, -3.15 | SacreCoeur_far/rubble_stone | 67 | 6.201 |
| 0.00, 61.98, 3.26 | SacreCoeur_far/rubble_stone | 42 | 6.014 |
| 0.00, 61.98, -3.26 | SacreCoeur_far/rubble_stone | 42 | 6.014 |
| 0.00, 61.62, 3.58 | SacreCoeur_far/rubble_stone | 46 | 5.73 |
| 0.00, 61.62, -3.58 | SacreCoeur_far/rubble_stone | 46 | 5.73 |
| 0.00, 61.54, 3.85 | SacreCoeur_far/rubble_stone | 44 | 5.121 |
| 0.00, 61.54, -3.85 | SacreCoeur_far/rubble_stone | 44 | 5.121 |
| 0.00, 61.05, 2.65 | SacreCoeur_far/rubble_stone | 74 | 1.443 |
| 0.00, 61.05, -2.65 | SacreCoeur_far/rubble_stone | 74 | 1.443 |
| 0.00, 60.69, 2.96 | SacreCoeur_far/rubble_stone | 50 | 1.043 |
| 0.00, 60.69, -2.96 | SacreCoeur_far/rubble_stone | 50 | 1.043 |
| 0.00, 57.05, 4.76 | SacreCoeur_far/rubble_stone | 185 | 9.618 |
| 0.00, 57.05, -4.76 | SacreCoeur_far/rubble_stone | 185 | 9.618 |
| 0.00, 55.47, 4.13 | SacreCoeur_far/rubble_stone | 55 | 7.934 |
| 0.00, 56.05, 2.99 | SacreCoeur_far/rubble_stone | 590 | 3.39 |
| 0.00, 56.16, 2.49 | SacreCoeur_far/rubble_stone | 223 | 3.922 |
| 0.00, 56.91, 0.79 | SacreCoeur_far/rubble_stone | 54 | 4.519 |
| 0.00, 57.32, -1.57 | SacreCoeur_far/rubble_stone | 73 | 3.293 |
| 0.00, 57.08, -0.73 | SacreCoeur_far/rubble_stone | 127 | 3.293 |
| 0.00, 56.27, 1.61 | SacreCoeur_far/rubble_stone | 63 | 3.163 |
| 0.00, 56.27, -1.61 | SacreCoeur_far/rubble_stone | 63 | 3.163 |
| 0.00, 55.89, 2.48 | SacreCoeur_far/rubble_stone | 280 | 2.658 |
| 0.00, 55.89, -2.48 | SacreCoeur_far/rubble_stone | 280 | 2.658 |
| 0.00, 55.45, 2.50 | SacreCoeur_far/rubble_stone | 60 | 1.57 |
| 0.00, 55.45, -2.50 | SacreCoeur_far/rubble_stone | 60 | 1.57 |
| 0.00, 53.78, 5.00 | SacreCoeur_far/rubble_stone | 118 | 5.206 |
| 0.00, 53.78, -5.00 | SacreCoeur_far/rubble_stone | 118 | 5.206 |
| 0.00, 53.64, 5.05 | SacreCoeur_far/rubble_stone | 44 | 4.971 |
| 0.00, 54.17, 2.01 | SacreCoeur_far/rubble_stone | 95 | 2.284 |
| 0.00, 54.17, -2.01 | SacreCoeur_far/rubble_stone | 95 | 2.284 |
| 0.00, 53.64, -5.05 | SacreCoeur_far/rubble_stone | 44 | 4.971 |
| 0.00, 52.25, 1.14 | SacreCoeur_far/rubble_stone | 94 | 9.532 |
| 0.00, 52.25, 0.33 | SacreCoeur_far/rubble_stone | 45 | 11.311 |
| -3.85, 53.93, -6.75 | SacreCoeur_far/rubble_stone | 389 | 4.277 |
| -3.85, 53.93, -9.12 | SacreCoeur_far/rubble_stone | 389 | 4.277 |

(803 more in the JSON)

## nonmanifold (warn, 46)

| at | part | uses |
|---|---|---|
| 29.75, 63.16, -8.10 | SacreCoeur_far/rubble_stone | 3 |
| 29.75, 63.16, 7.60 | SacreCoeur_far/rubble_stone | 3 |
| -1.69, 58.59, -7.95 | SacreCoeur_far/slate | 3 |
| -1.69, 58.51, -7.95 | SacreCoeur_far/slate | 3 |
| -0.87, 58.55, -7.95 | SacreCoeur_far/slate | 3 |
| -2.50, 58.55, -7.95 | SacreCoeur_far/slate | 3 |
| 26.13, 68.15, -4.17 | SacreCoeur_far/slate | 3 |
| 26.13, 68.15, 3.67 | SacreCoeur_far/slate | 3 |
| 26.13, 68.01, 3.67 | SacreCoeur_far/slate | 3 |
| 26.13, 68.01, -4.17 | SacreCoeur_far/slate | 3 |
| 22.50, 63.23, -8.10 | SacreCoeur_far/slate | 3 |
| 28.70, 71.53, 0.00 | SacreCoeur_far/slate | 5 |
| 22.50, 63.23, 7.60 | SacreCoeur_far/slate | 3 |
| 29.75, 72.93, -0.25 | SacreCoeur_far/slate | 4 |
| 33.38, 68.15, 3.67 | SacreCoeur_far/slate | 3 |
| 33.38, 68.15, -4.17 | SacreCoeur_far/slate | 3 |
| 33.38, 68.01, -4.17 | SacreCoeur_far/slate | 3 |
| 33.38, 68.01, 3.67 | SacreCoeur_far/slate | 3 |
| 37.00, 63.23, 7.60 | SacreCoeur_far/slate | 3 |
| 34.23, 66.93, -0.25 | SacreCoeur_far/slate | 5 |
| 37.00, 63.23, -8.10 | SacreCoeur_far/slate | 3 |
| 39.39, 67.00, -0.25 | SacreCoeur_far/slate | 3 |
| 45.74, 63.38, -2.77 | SacreCoeur_far/slate | 3 |
| 45.74, 63.24, -2.77 | SacreCoeur_far/slate | 3 |
| 39.39, 66.86, -0.25 | SacreCoeur_far/slate | 3 |
| 44.55, 66.93, -0.25 | SacreCoeur_far/slate | 5 |
| 46.93, 59.70, -5.30 | SacreCoeur_far/slate | 3 |
| 45.74, 63.38, 2.27 | SacreCoeur_far/slate | 3 |
| 45.74, 63.24, 2.27 | SacreCoeur_far/slate | 3 |
| 46.93, 59.70, 4.80 | SacreCoeur_far/slate | 3 |
| 47.08, 63.38, -1.41 | SacreCoeur_far/slate | 3 |
| 47.08, 63.24, -1.41 | SacreCoeur_far/slate | 3 |
| 49.60, 59.70, -2.57 | SacreCoeur_far/slate | 3 |
| 47.08, 63.38, 0.91 | SacreCoeur_far/slate | 3 |
| 47.08, 63.24, 0.91 | SacreCoeur_far/slate | 3 |
| 49.60, 59.70, 2.07 | SacreCoeur_far/slate | 3 |
| 14.39, 71.60, 0.00 | SacreCoeur_far/slate | 3 |
| 14.39, 71.46, 0.00 | SacreCoeur_far/slate | 3 |
| 0.08, 71.53, 0.00 | SacreCoeur_far/slate | 3 |
| 40.50, 62.53, 10.50 | SacreCoeur_far/slate | 4 |

(6 more in the JSON)

## tjunction (warn, 129)

| at | part | edge_m |
|---|---|---|
| 0.00, 57.70, 7.20 | SacreCoeur_far/rubble_stone | 10.435 |
| 0.00, 57.70, -7.20 | SacreCoeur_far/rubble_stone | 10.435 |
| 0.00, 56.00, -6.25 | SacreCoeur_far/rubble_stone | 0.55 |
| 0.00, 56.00, 5.80 | SacreCoeur_far/rubble_stone | 0.55 |
| 0.00, 56.31, -9.80 | SacreCoeur_far/rubble_stone | 3.19 |
| 0.00, 56.05, 10.20 | SacreCoeur_far/rubble_stone | 3.45 |
| 49.30, 56.80, -9.80 | SacreCoeur_far/rubble_stone | 0.712 |
| 51.95, 55.70, -9.80 | SacreCoeur_far/rubble_stone | 7.5 |
| 41.10, 55.50, -9.80 | SacreCoeur_far/rubble_stone | 5.2 |
| 0.00, 59.20, -7.20 | SacreCoeur_far/rubble_stone | 3.955 |
| 22.50, 61.59, -7.20 | SacreCoeur_far/rubble_stone | 3.955 |
| 22.50, 61.59, 7.20 | SacreCoeur_far/rubble_stone | 3.955 |
| 0.00, 59.20, 7.20 | SacreCoeur_far/rubble_stone | 3.955 |
| 22.50, 57.06, -8.10 | SacreCoeur_far/rubble_stone | 6.145 |
| 37.00, 57.06, -8.10 | SacreCoeur_far/rubble_stone | 6.145 |
| 22.50, 57.70, -7.20 | SacreCoeur_far/rubble_stone | 3.935 |
| 37.00, 57.44, 7.60 | SacreCoeur_far/rubble_stone | 5.82 |
| 22.50, 57.39, 7.60 | SacreCoeur_far/rubble_stone | 5.82 |
| 22.50, 57.70, 7.20 | SacreCoeur_far/rubble_stone | 3.935 |
| 37.00, 59.13, -5.00 | SacreCoeur_far/rubble_stone | 4.08 |
| 37.00, 60.20, -5.00 | SacreCoeur_far/rubble_stone | 3.01 |
| 37.00, 63.08, 3.40 | SacreCoeur_far/rubble_stone | 1.435 |
| 37.00, 63.08, 6.80 | SacreCoeur_far/rubble_stone | 4.185 |
| 37.00, 59.27, 7.60 | SacreCoeur_far/rubble_stone | 4.185 |
| 37.00, 60.15, -5.00 | SacreCoeur_far/rubble_stone | 1.07 |
| 46.80, 59.43, -5.00 | SacreCoeur_far/rubble_stone | 1.07 |
| 46.80, 56.62, 4.50 | SacreCoeur_far/rubble_stone | 3.885 |
| 43.03, 60.15, 4.50 | SacreCoeur_far/rubble_stone | 0.3 |
| 49.30, 56.50, 1.95 | SacreCoeur_far/rubble_stone | 8.75 |
| 46.80, 56.31, 4.50 | SacreCoeur_far/rubble_stone | 8.75 |
| 49.30, 56.80, -2.45 | SacreCoeur_far/rubble_stone | 3.45 |
| 49.30, 56.80, 1.95 | SacreCoeur_far/rubble_stone | 3.45 |
| 46.80, 59.13, -5.00 | SacreCoeur_far/rubble_stone | 8.75 |
| 49.30, 56.50, -2.45 | SacreCoeur_far/rubble_stone | 8.75 |
| 37.00, 63.30, 6.80 | SacreCoeur_far/rubble_stone | 5.8 |
| 37.00, 63.30, 3.40 | SacreCoeur_far/rubble_stone | 5.8 |
| 37.00, 61.73, 3.40 | SacreCoeur_far/rubble_stone | 17.8 |
| 37.00, 58.98, 6.80 | SacreCoeur_far/rubble_stone | 17.8 |
| 37.00, 56.05, 10.20 | SacreCoeur_far/rubble_stone | 3.525 |
| 37.00, 58.98, 7.60 | SacreCoeur_far/rubble_stone | 1.835 |

(89 more in the JSON)

## seam (info, 278)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 4.60, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 90 | 90 |
| 37.31, 63.08, 3.40 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 20.4 | 84 | 90 |
| 37.37, 65.05, 3.40 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 20.4 | 84 | 90 |
| 9.20, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 82 | 90 |
| 13.80, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 74 | 90 |
| 32.20, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 70 | 90 |
| 18.40, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 66 | 90 |
| 27.60, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 62 | 90 |
| 23.00, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 58 | 90 |
| 0.00, 57.47, 3.69 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 15.58 | 56 | 90 |
| 23.00, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 54 | 90 |
| 32.20, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 52 | 42.6 |
| 27.60, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 50 | 90 |
| 27.60, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 48 | 42.6 |
| 18.40, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 46 | 90 |
| 23.00, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 44 | 42.6 |
| 32.20, 55.35, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 42 | 90 |
| 18.40, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 40 | 42.6 |
| 53.00, 56.96, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 44.27 | 39 | 90 |
| 36.62, 55.91, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 37.26 | 38 | 57 |
| 13.80, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 38 | 90 |
| 18.41, 55.85, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 36 | 42.6 |
| 37.06, 68.83, 3.40 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 10.2 | 36 | 90 |
| 36.73, 57.74, 7.60 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 29.12 | 35 | 57 |
| 22.74, 57.41, -8.10 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 29 | 33 | 57 |
| 37.28, 61.77, 3.40 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 11.95 | 33 | 34.9 |
| 0.00, 55.35, 5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 10.7 | 32 | 90 |
| 13.80, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 32 | 42.6 |
| 23.00, 55.85, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 32 | 42.6 |
| 13.80, 55.85, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 32 | 42.6 |
| -3.85, 53.84, -6.25 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 7.89 | 30 | 90 |
| -3.85, 55.79, -6.27 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 25.23 | 30 | 49.6 |
| -3.50, 53.84, 10.00 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 8.69 | 30 | 90 |
| 9.20, 55.35, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 9.26 | 30 | 90 |
| 49.55, 56.75, 4.52 | SacreCoeur_far/stone_white + SacreCoeur_far/zinc_roof | 48.31 | 30 | 90 |
| 0.25, 61.49, -7.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 45.1 | 29 | 35.8 |
| 22.33, 61.49, 7.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 45.1 | 29 | 35.8 |
| 9.20, 55.85, -9.80 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 28 | 42.6 |
| 27.60, 55.85, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 28 | 42.6 |
| 9.20, 55.85, 10.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 2.24 | 28 | 42.6 |

(238 more in the JSON)

## opening (info, 110)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.81, 55.96, -6.07 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 5.053 |
| 0.00, 59.20, -9.75 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 2.6 |
| 0.00, 56.42, -9.17 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 3.101 |
| -3.46, 56.26, 6.07 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 4.594 |
| 0.00, 59.20, 7.25 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 3 |
| 0.00, 57.67, 7.24 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 3.578 |
| 50.18, 56.98, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 4.243 |
| -3.81, 55.96, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 5.053 |
| 49.29, 56.65, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 0.49 |
| 52.00, 55.70, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 2.1 |
| 55.20, 55.70, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 2.1 |
| 41.15, 55.50, -9.80 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 2.8 |
| 46.76, 56.65, 10.20 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 8.69 |
| 37.00, 59.23, 10.20 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 3.225 |
| 0.00, 59.15, 10.20 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 3.15 |
| 22.50, 63.16, -8.05 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 2.002 |
| 22.50, 62.81, -8.10 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 6.095 |
| 22.50, 57.09, -8.06 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 1.073 |
| 36.95, 57.34, 7.60 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 14.5 |
| 22.50, 62.81, 7.60 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 5.77 |
| 22.50, 63.16, 7.55 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 1.502 |
| 22.50, 57.42, 7.56 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 0.477 |
| 37.00, 62.81, -8.10 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 6.095 |
| 37.00, 57.09, -8.06 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 3.697 |
| 37.00, 63.16, -4.95 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 2.068 |
| 37.00, 63.16, 2.48 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 0.968 |
| 37.00, 63.16, 7.55 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 0.8 |
| 46.55, 56.56, 4.50 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 5.205 |
| 37.00, 56.21, 9.49 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 3.101 |
| 40.45, 62.55, 4.50 | SacreCoeur_far/rubble_stone | 0 + 0 + -1 | 0.138 |
| 49.30, 56.65, -9.05 | SacreCoeur_far/rubble_stone | -1 + 0 + 0 | 0.3 |
| 49.30, 56.99, -8.75 | SacreCoeur_far/rubble_stone | 1 + 0 + 0 | 4.826 |
| 49.25, 59.43, -5.00 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 2.5 |
| 55.96, 56.84, -1.00 | SacreCoeur_far/rubble_stone | 0 + 0 + 1 | 4.243 |
| 0.14, 52.78, 1.37 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 2.84 |
| 0.28, 52.78, 1.20 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 2.5 |
| 0.14, 52.78, -2.40 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 1.5 |
| 0.28, 52.78, -2.55 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 1.2 |
| 0.14, 52.78, 3.80 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 1.5 |
| 0.28, 52.78, 3.65 | SacreCoeur_far/stone_white | 0 + 1 + 0 | 1.2 |

(70 more in the JSON)

## backtoback (info, 353)

| at | parts | area |
|---|---|---|
| -0.15, 56.00, -5.86 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.01834 |
| -0.23, 56.00, -5.95 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.01388 |
| -0.05, 56.00, -5.95 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.04016 |
| -0.17, 56.00, -6.14 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.04462 |
| -0.16, 52.25, -5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.36123 |
| -0.40, 51.71, -5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.01884 |
| -0.37, 52.36, -5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.08922 |
| -0.15, 56.00, 6.20 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.01834 |
| -0.23, 56.00, 6.10 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.01388 |
| -0.04, 56.00, 6.04 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.04016 |
| -0.17, 56.00, 5.91 | SacreCoeur_far/rubble_stone + SacreCoeur_far/rubble_stone | 0.04462 |
| -0.25, 52.00, 5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.35208 |
| -0.28, 52.65, 5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.08585 |
| -0.03, 52.25, 5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.09836 |
| -0.09, 52.75, 5.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/stone_white | 0.0097 |
| 37.00, 63.27, 6.79 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00096 |
| 37.00, 63.25, 3.40 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00049 |
| 37.00, 63.29, 3.41 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00047 |
| 37.00, 63.27, 6.78 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00084 |
| 37.00, 63.25, 3.41 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00043 |
| 37.00, 63.29, 3.42 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00042 |
| 37.00, 63.27, 6.77 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00129 |
| 37.00, 63.27, 6.75 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00087 |
| 37.00, 63.27, 6.74 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.00129 |
| 37.00, 63.22, 4.31 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.09567 |
| 37.00, 63.25, 5.29 | SacreCoeur_far/rubble_stone + SacreCoeur_far/slate | 0.23724 |
| -0.01, 57.60, 0.02 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00733 |
| -0.00, 57.60, -0.28 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00017 |
| -0.02, 57.60, 0.01 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00713 |
| -0.01, 57.60, -0.29 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00037 |
| -0.01, 57.60, 1.06 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00733 |
| -0.00, 57.60, 0.76 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00017 |
| -0.02, 57.60, 1.05 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00713 |
| -0.01, 57.60, 0.75 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00037 |
| -0.01, 57.60, -1.02 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00733 |
| -0.00, 57.60, -1.32 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00017 |
| -0.02, 57.60, -1.03 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00713 |
| -0.01, 57.60, -1.33 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00037 |
| -0.01, 57.60, 2.10 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00733 |
| -0.00, 57.60, 1.80 | SacreCoeur_far/stone_white + SacreCoeur_far/stone_white | 0.00017 |

(313 more in the JSON)


Nodes: SacreCoeur_far. Distances: {"SacreCoeur_far":470}. Quantum 0.000 mm. Offset 0,0,0.
