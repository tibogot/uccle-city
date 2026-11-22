# Mesh audit (before pack): interior.cell

74,756 triangles, 41,442 welded vertices, 7,356 open edges, 374,268 rays, 8151 ms.

**0 blocking**, 9191 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 63 |
| sliver | warn | 4624 |
| nonmanifold | warn | 7 |
| tjunction | warn | 4497 |
| seam | info | 414 |
| opening | info | 593 |
| backtoback | info | 3953 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 63)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 21.43, 118.51, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.43, 118.51, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.43, 118.51, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.71, 118.69, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.71, 118.69, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.70, 118.69, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.99, 118.88, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.99, 118.88, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 21.98, 118.88, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.27, 119.06, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.27, 119.06, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.27, 119.06, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.55, 119.24, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.55, 119.24, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.55, 119.24, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.83, 119.42, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.83, 119.42, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 22.82, 119.42, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.11, 119.60, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.11, 119.60, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.11, 119.60, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.39, 119.78, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.39, 119.78, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.39, 119.78, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.67, 119.97, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.67, 119.97, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.66, 119.97, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.95, 120.15, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.95, 120.15, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 23.95, 120.15, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.23, 120.33, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.23, 120.33, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.23, 120.33, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.51, 120.51, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.51, 120.51, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.50, 120.51, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.79, 120.69, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.79, 120.69, 10.55 | Cell/walnut + Cell/glow | 2 | 100.1 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 24.79, 120.69, 10.39 | Cell/walnut + Cell/glow | 2 | 112 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |
| 25.07, 120.88, 10.93 | Cell/walnut + Cell/glow | 2 | 11.9 | 0 | 35 | 0.27 | false | 0 + -1 + 0 |

(23 more in the JSON)

## sliver (warn, 4624)

| at | part | aspect | longest |
|---|---|---|---|
| 21.41, 118.51, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.51, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.52, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.52, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.41, 118.58, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.58, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.58, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.40, 118.58, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.50, 118.58, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.58, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.58, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.58, 9.81 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.58, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.58, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.58, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.58, 10.99 | Cell/walnut | 46 | 0.284 |
| 21.70, 118.58, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.70, 118.58, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.70, 118.58, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.69, 118.58, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.69, 118.51, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.70, 118.51, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.70, 118.52, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.70, 118.52, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.60, 118.52, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.52, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.51, 9.80 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.51, 9.81 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.52, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.52, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.50, 118.51, 11.00 | Cell/walnut | 46 | 0.284 |
| 21.60, 118.51, 10.99 | Cell/walnut | 46 | 0.284 |
| 21.69, 118.69, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.69, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.70, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.70, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.69, 118.76, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.76, 10.60 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.76, 10.20 | Cell/walnut | 193 | 1.184 |
| 21.68, 118.76, 10.60 | Cell/walnut | 193 | 1.184 |

(4584 more in the JSON)

## nonmanifold (warn, 7)

| at | part | uses |
|---|---|---|
| 23.00, 120.06, 22.69 | Cell/walnut | 4 |
| 26.40, 120.06, 22.69 | Cell/walnut | 4 |
| 30.60, 121.72, 22.40 | Cell/walnut | 4 |
| 30.60, 118.41, 22.40 | Cell/walnut | 4 |
| 32.60, 118.41, 22.40 | Cell/walnut | 4 |
| 32.60, 121.72, 22.40 | Cell/walnut | 4 |
| 24.70, 118.41, 22.45 | Cell/walnut | 4 |

## tjunction (warn, 4497)

| at | part | edge_m |
|---|---|---|
| 14.30, 118.40, -22.29 | Cell/plaster_white | 0.375 |
| 14.30, 125.20, -22.29 | Cell/plaster_white | 0.375 |
| 14.30, 118.40, -21.88 | Cell/plaster_white | 0.375 |
| 14.30, 125.20, -21.88 | Cell/plaster_white | 0.375 |
| 14.30, 118.40, -21.48 | Cell/plaster_white | 0.375 |
| 14.30, 125.20, -21.48 | Cell/plaster_white | 0.375 |
| 14.30, 125.20, -21.07 | Cell/plaster_white | 0.325 |
| 14.30, 125.20, -20.66 | Cell/plaster_white | 0.325 |
| 14.30, 125.20, -20.25 | Cell/plaster_white | 0.325 |
| 14.30, 118.40, -19.84 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -19.84 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -19.43 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -19.43 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -19.02 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -19.02 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -18.62 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -18.62 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -18.21 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -18.21 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -17.80 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -17.80 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -17.39 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -17.39 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -16.98 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -16.98 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -16.57 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -16.57 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -16.17 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -16.17 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -15.76 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -15.76 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -15.35 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -15.35 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -14.94 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -14.94 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -14.53 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -14.53 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -14.13 | Cell/plaster_white | 0.41 |
| 14.30, 125.20, -14.13 | Cell/plaster_white | 0.41 |
| 14.30, 118.40, -13.72 | Cell/plaster_white | 0.41 |

(4457 more in the JSON)

## seam (info, 414)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 29.93, 125.40, -5.50 | Cell/plaster_white + Cell/plaster_white | 33.9 | 248 | 90 |
| 22.60, 117.95, -20.28 | Cell/oak_plank + Cell/stone_floor | 31.2 | 228 | 90 |
| 29.93, 122.40, -5.17 | Cell/plaster_white + Cell/oak_plank | 27.91 | 202 | 90 |
| 18.01, 118.59, -22.70 | Cell/plaster_white + Cell/marble_white | 37.1 | 173 | 22.5 |
| 14.65, 125.40, 11.00 | Cell/plaster_white + Cell/marble_white | 23.5 | 168 | 90 |
| 22.36, 118.25, -21.00 | Cell/stone_floor + Cell/stone_floor | 33.6 | 168 | 90 |
| 14.30, 125.20, -22.31 | Cell/plaster_white + Cell/plaster_white | 30.03 | 148 | 90 |
| 21.15, 118.60, -7.59 | Cell/plaster_white + Cell/walnut | 28.15 | 146 | 22.5 |
| 22.65, 118.10, -20.70 | Cell/stone_floor + Cell/stone_floor | 26.64 | 135 | 90 |
| 12.15, 123.60, -6.00 | Cell/plaster_white + Glass/glass_window | 54.74 | 132 | 90 |
| 12.57, 122.40, 11.00 | Cell/oak_plank + Cell/marble_white | 17.65 | 122 | 90 |
| 21.16, 118.40, -7.59 | Cell/walnut + Cell/stone_floor | 23.65 | 120 | 22.5 |
| 37.35, 122.96, 0.00 | Cell/plaster_white + Glass/glass_window | 45.51 | 112 | 90 |
| 27.54, 122.00, 11.00 | Cell/plaster_white + Cell/marble_white | 17.61 | 106 | 90 |
| 29.40, 122.40, 11.12 | Cell/plaster_white + Cell/oak_plank | 14.56 | 105 | 90 |
| 14.66, 122.00, 11.60 | Cell/plaster_white + Cell/plaster_white | 20.8 | 100 | 90 |
| 35.85, 119.00, -22.70 | Cell/plaster_white + Glass/glass_window | 39.44 | 96 | 90 |
| 14.56, 122.00, 3.85 | Cell/plaster_white + Cell/plaster_white | 13.4 | 95 | 90 |
| 29.75, 125.40, 11.00 | Cell/plaster_white + Cell/plaster_white | 12.17 | 89 | 90 |
| 14.72, 118.40, 11.00 | Cell/marble_white + Cell/stone_floor | 18.59 | 89 | 90 |
| 21.07, 122.00, -8.00 | Cell/plaster_white + Cell/plaster_white | 12.3 | 88 | 90 |
| 20.85, 122.00, -7.87 | Cell/plaster_white + Cell/plaster_white | 12.3 | 87 | 90 |
| 12.30, 125.40, -5.96 | Cell/plaster_white + Cell/plaster_white | 17.27 | 87 | 90 |
| 12.30, 122.40, -5.96 | Cell/plaster_white + Cell/oak_plank | 17.1 | 85 | 90 |
| 14.72, 122.00, 11.30 | Cell/plaster_white + Cell/marble_white | 17.24 | 84 | 90 |
| 15.01, 118.40, 22.20 | Cell/oak_plank + Cell/walnut | 17.15 | 84 | 22.5 |
| 27.70, 122.40, -7.98 | Cell/oak_plank + Glass/glass_window | 16.85 | 83 | 90 |
| 35.85, 118.99, 8.00 | Cell/plaster_white + Glass/glass_window | 33.29 | 82 | 90 |
| 14.30, 118.40, -22.31 | Cell/plaster_white + Cell/oak_plank | 16.18 | 81 | 90 |
| 22.40, 118.40, -22.69 | Cell/oak_plank + Cell/marble_white | 16.14 | 81 | 22.5 |
| 29.01, 122.40, 13.21 | Cell/oak_plank + Cell/walnut | 15.59 | 80 | 22.5 |
| 14.57, 122.00, 11.00 | Cell/plaster_white + Cell/marble_white | 12.98 | 79 | 90 |
| 14.30, 122.00, -7.58 | Cell/plaster_white + Cell/plaster_white | 15.71 | 77 | 90 |
| 14.72, 118.40, 11.30 | Cell/oak_plank + Cell/marble_white | 15.31 | 74 | 90 |
| 29.61, 118.40, -5.17 | Cell/walnut + Cell/stone_floor | 14.35 | 72 | 22.5 |
| 14.36, 122.40, -7.98 | Cell/oak_plank + Glass/glass_window | 13.45 | 70 | 90 |
| 35.85, 120.17, -7.85 | Cell/plaster_white + Glass/glass_window | 27.01 | 66 | 90 |
| 15.00, 119.40, 4.15 | Cell/plaster_white + Cell/brass | 12.37 | 66 | 45 |
| 35.70, 122.00, -7.71 | Cell/plaster_white + Cell/plaster_white | 12.75 | 61 | 90 |
| 30.19, 125.40, -5.60 | Cell/plaster_white + Cell/plaster_white | 7.68 | 61 | 90 |

(374 more in the JSON)

## opening (info, 593)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.30, 123.55, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 123.65, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 124.05, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 124.45, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 124.85, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 118.40, -19.95 | Cell/plaster_white | 0 + 1 + 0 | 0.325 |
| 14.30, 118.40, -7.53 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -7.12 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -6.70 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -6.28 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -5.87 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -5.45 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -5.03 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -4.62 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -4.20 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -3.78 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -3.37 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -2.95 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -2.53 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -2.12 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -1.70 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -1.28 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -0.86 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -0.45 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, -0.03 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 0.39 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 0.80 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 1.22 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 1.64 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 2.05 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 2.47 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 2.88 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 118.40, 3.30 | Cell/plaster_white | 1 + 0 + 0 | 0.417 |
| 14.30, 121.95, 4.50 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 121.75, 5.50 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 121.95, 6.30 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 121.75, 8.70 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 118.45, 12.00 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 118.65, 21.50 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |
| 14.30, 121.95, 12.00 | Cell/plaster_white | 1 + 0 + 0 | 0.3 |

(553 more in the JSON)

## backtoback (info, 3953)

| at | parts | area |
|---|---|---|
| 14.30, 118.48, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 118.66, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 118.43, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 118.49, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 118.88, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 119.06, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 118.83, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 118.87, 11.02 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 119.28, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 119.46, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 119.23, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 119.29, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 119.68, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 119.86, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 119.63, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 119.67, 11.02 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 120.08, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 120.26, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 120.03, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 120.07, 11.02 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 120.48, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 120.66, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 120.43, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 120.49, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 120.88, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 121.06, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 120.83, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 120.89, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 121.28, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 121.46, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 121.23, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 121.29, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 121.68, 11.15 | Cell/plaster_white + Cell/marble_white | 0.01182 |
| 14.30, 121.86, 11.09 | Cell/plaster_white + Cell/marble_white | 0.04333 |
| 14.30, 121.63, 11.08 | Cell/plaster_white + Cell/marble_white | 0.0086 |
| 14.30, 121.69, 11.03 | Cell/plaster_white + Cell/marble_white | 0.00625 |
| 14.30, 118.74, 11.28 | Cell/plaster_white + Cell/marble_white | 0.00319 |
| 14.30, 118.78, 11.24 | Cell/plaster_white + Cell/marble_white | 0.00439 |
| 14.30, 118.57, 11.24 | Cell/plaster_white + Cell/marble_white | 0.03639 |
| 14.30, 118.74, 11.19 | Cell/plaster_white + Cell/marble_white | 0.00603 |

(3913 more in the JSON)


Nodes: Cell, Glass. Distances: {"*":35}. Quantum 0.000 mm. Offset 0,100,0.
