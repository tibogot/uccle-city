# Mesh audit (before pack): interior.cell

106,772 triangles, 59,766 welded vertices, 9,124 open edges, 587,472 rays, 7892 ms.

**0 blocking**, 7325 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 387 |
| sliver | warn | 6570 |
| nonmanifold | warn | 135 |
| tjunction | warn | 233 |
| seam | info | 1898 |
| opening | info | 653 |
| backtoback | info | 6471 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 387)

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

(347 more in the JSON)

## sliver (warn, 6570)

| at | part | aspect | longest |
|---|---|---|---|
| 14.57, 125.40, -7.99 | Cell/plaster_white | 40 | 0.4 |
| 14.43, 125.40, -7.98 | Cell/plaster_white | 40 | 0.4 |
| 14.98, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 14.84, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 15.40, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 15.26, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 15.82, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 15.68, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 16.24, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 16.10, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 16.66, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 16.52, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 17.08, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 16.94, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 17.50, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 17.36, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 17.92, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 17.78, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 18.34, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 18.20, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 18.76, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 18.62, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 19.18, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 19.04, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 19.60, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 19.46, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 20.02, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 19.88, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 20.44, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 20.30, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 20.86, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 20.72, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 21.28, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 21.14, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 21.70, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 21.56, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 22.12, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 21.98, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |
| 22.54, 125.40, -7.99 | Cell/plaster_white | 42 | 0.42 |
| 22.40, 125.40, -7.98 | Cell/plaster_white | 42 | 0.42 |

(6530 more in the JSON)

## nonmanifold (warn, 135)

| at | part | uses |
|---|---|---|
| 14.50, 122.00, 11.30 | Cell/plaster_white | 3 |
| 14.91, 122.00, 11.30 | Cell/plaster_white | 3 |
| 15.33, 122.00, 11.30 | Cell/plaster_white | 3 |
| 15.75, 122.00, 11.30 | Cell/plaster_white | 3 |
| 16.17, 122.00, 11.30 | Cell/plaster_white | 3 |
| 16.59, 122.00, 11.30 | Cell/plaster_white | 3 |
| 17.01, 122.00, 11.30 | Cell/plaster_white | 3 |
| 17.43, 122.00, 11.30 | Cell/plaster_white | 3 |
| 17.85, 122.00, 11.30 | Cell/plaster_white | 3 |
| 18.27, 122.00, 11.30 | Cell/plaster_white | 3 |
| 18.69, 122.00, 11.30 | Cell/plaster_white | 3 |
| 19.11, 122.00, 11.30 | Cell/plaster_white | 3 |
| 19.53, 122.00, 11.30 | Cell/plaster_white | 3 |
| 19.95, 122.00, 11.30 | Cell/plaster_white | 3 |
| 20.37, 122.00, 11.30 | Cell/plaster_white | 3 |
| 20.79, 122.00, 11.30 | Cell/plaster_white | 3 |
| 27.51, 122.00, 11.30 | Cell/plaster_white | 3 |
| 27.93, 122.00, 11.30 | Cell/plaster_white | 3 |
| 28.35, 122.00, 11.30 | Cell/plaster_white | 3 |
| 28.77, 122.00, 11.30 | Cell/plaster_white | 3 |
| 29.19, 122.00, 11.30 | Cell/plaster_white | 3 |
| 29.61, 122.00, 11.30 | Cell/plaster_white | 3 |
| 30.03, 122.00, 11.30 | Cell/plaster_white | 3 |
| 30.45, 122.00, 11.30 | Cell/plaster_white | 3 |
| 31.29, 122.00, 11.30 | Cell/plaster_white | 3 |
| 31.71, 122.00, 11.30 | Cell/plaster_white | 3 |
| 32.13, 122.00, 11.30 | Cell/plaster_white | 3 |
| 32.55, 122.00, 11.30 | Cell/plaster_white | 3 |
| 33.39, 122.00, 11.30 | Cell/plaster_white | 3 |
| 33.81, 122.00, 11.30 | Cell/plaster_white | 3 |
| 34.23, 122.00, 11.30 | Cell/plaster_white | 3 |
| 34.65, 122.00, 11.30 | Cell/plaster_white | 3 |
| 35.07, 122.00, 11.30 | Cell/plaster_white | 3 |
| 35.49, 122.00, 11.30 | Cell/plaster_white | 3 |
| 20.85, 118.44, -7.98 | Cell/plaster_white | 4 |
| 20.85, 118.69, -7.98 | Cell/plaster_white | 4 |
| 20.85, 119.11, -7.98 | Cell/plaster_white | 4 |
| 20.85, 119.53, -7.98 | Cell/plaster_white | 4 |
| 20.85, 119.95, -7.98 | Cell/plaster_white | 4 |
| 20.85, 120.37, -7.98 | Cell/plaster_white | 4 |

(95 more in the JSON)

## tjunction (warn, 233)

| at | part | edge_m |
|---|---|---|
| 14.30, 124.80, -21.20 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -19.90 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -17.00 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -15.80 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -12.60 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -11.40 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, -8.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.40, -8.00 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, -7.85 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, 3.85 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 4.50 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 5.50 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, 11.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 11.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 11.60 | Cell/plaster_white | 0.42 |
| 14.30, 118.70, 12.00 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 12.00 | Cell/plaster_white | 0.42 |
| 14.30, 118.70, 21.50 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 21.50 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 22.40 | Cell/plaster_white | 0.42 |
| 14.30, 121.75, 22.70 | Cell/plaster_white | 0.42 |
| 15.50, 121.40, 6.30 | Cell/plaster_white | 0.42 |
| 15.50, 121.40, 8.70 | Cell/plaster_white | 0.42 |
| 22.00, 118.40, -22.70 | Cell/plaster_white | 0.42 |
| 28.00, 118.85, -22.70 | Cell/plaster_white | 0.42 |
| 28.00, 120.80, -22.70 | Cell/plaster_white | 0.42 |
| 31.00, 118.40, -22.70 | Cell/plaster_white | 0.42 |
| 33.00, 118.85, -22.70 | Cell/plaster_white | 0.42 |
| 33.00, 120.80, -22.70 | Cell/plaster_white | 0.42 |
| 24.00, 118.70, 22.70 | Cell/plaster_white | 0.42 |
| 24.00, 121.40, 22.70 | Cell/plaster_white | 0.42 |
| 33.00, 118.70, 22.70 | Cell/plaster_white | 0.42 |
| 33.00, 121.40, 22.70 | Cell/plaster_white | 0.42 |
| 35.70, 122.00, -8.00 | Cell/plaster_white | 0.42 |
| 35.70, 122.40, -8.00 | Cell/plaster_white | 0.42 |
| 35.70, 121.95, -7.85 | Cell/plaster_white | 0.16 |
| 35.70, 121.95, 5.00 | Cell/plaster_white | 0.16 |
| 35.70, 121.95, 4.90 | Cell/plaster_white | 0.16 |
| 35.70, 121.95, 7.90 | Cell/plaster_white | 0.16 |
| 35.70, 121.95, 8.00 | Cell/plaster_white | 0.16 |

(193 more in the JSON)

## seam (info, 1898)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.50, 122.40, -7.98 | Cell/oak_plank + Glass/glass_window | 47.45 | 201 | 90 |
| 12.30, 122.40, 11.34 | Cell/plaster_white + Cell/stone_floor | 38.7 | 194 | 45 |
| 12.30, 122.40, 11.34 | Cell/oak_plank + Cell/stone_floor | 35.16 | 177 | 45 |
| 16.21, 118.43, -22.70 | Cell/plaster_white + Cell/marble_white | 31.52 | 158 | 22.5 |
| 12.30, 122.65, 11.00 | Cell/plaster_white + Cell/marble_white | 27.16 | 139 | 90 |
| 21.15, 118.44, -7.59 | Cell/plaster_white + Cell/walnut | 26.47 | 134 | 22.5 |
| 12.15, 123.31, -6.00 | Cell/plaster_white + Glass/glass_window | 56.28 | 134 | 90 |
| 20.85, 122.00, -7.99 | Cell/plaster_white + Cell/plaster_white | 24.3 | 121 | 90 |
| 16.21, 118.40, -22.68 | Cell/oak_plank + Cell/marble_white | 22.68 | 118 | 22.5 |
| 22.60, 117.95, -20.28 | Cell/oak_plank + Cell/stone_floor | 23.4 | 113 | 90 |
| 37.35, 122.89, 0.00 | Cell/plaster_white + Glass/glass_window | 46.62 | 112 | 90 |
| 21.16, 118.40, -7.57 | Cell/walnut + Cell/stone_floor | 21.97 | 110 | 22.5 |
| 20.40, 122.60, 23.20 | Cell/plaster_white + Cell/plaster_white | 20.76 | 108 | 90 |
| 14.30, 118.47, 3.85 | Cell/plaster_white + Cell/plaster_white | 20.6 | 105 | 90 |
| 20.40, 122.41, 13.37 | Cell/plaster_white + Cell/stone_floor | 19.81 | 104 | 45 |
| 20.40, 122.40, 13.37 | Cell/plaster_white + Cell/oak_plank | 19.64 | 100 | 90 |
| 35.85, 118.69, -22.70 | Cell/plaster_white + Glass/glass_window | 41.16 | 98 | 90 |
| 29.93, 125.40, 1.23 | Cell/plaster_white + Cell/plaster_white | 19.03 | 94 | 90 |
| 15.01, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 17.15 | 88 | 22.5 |
| 14.30, 118.47, 11.00 | Cell/plaster_white + Cell/marble_white | 17.5 | 87 | 90 |
| 23.01, 118.45, 22.70 | Cell/plaster_white + Cell/walnut | 18.2 | 85 | 22.5 |
| 35.85, 118.69, 8.00 | Cell/plaster_white + Glass/glass_window | 35.28 | 84 | 90 |
| 29.01, 122.40, 13.43 | Cell/oak_plank + Cell/walnut | 15.99 | 83 | 22.5 |
| 29.40, 122.40, 11.15 | Cell/plaster_white + Cell/oak_plank | 16.2 | 78 | 90 |
| 29.93, 122.40, 1.23 | Cell/plaster_white + Cell/oak_plank | 15.28 | 77 | 90 |
| 22.60, 117.95, -20.39 | Cell/marble_white + Cell/stone_floor | 2.24 | 76 | 83.6 |
| 12.57, 122.40, 11.00 | Cell/oak_plank + Cell/marble_white | 14.76 | 74 | 90 |
| 29.61, 118.40, -5.48 | Cell/walnut + Cell/stone_floor | 14.35 | 74 | 22.5 |
| 12.46, 122.41, 11.30 | Cell/marble_white + Cell/stone_floor | 14.53 | 74 | 45 |
| 35.85, 118.69, -7.85 | Cell/plaster_white + Glass/glass_window | 30.03 | 72 | 90 |
| 37.20, 122.40, 11.15 | Cell/plaster_white + Cell/plaster_white | 14.82 | 71 | 90 |
| 15.11, 119.30, 4.15 | Cell/plaster_white + Cell/brass | 12.37 | 66 | 45 |
| 22.60, 117.95, -12.89 | Cell/marble_white + Cell/stone_floor | 1.62 | 58 | 83.6 |
| 29.93, 122.40, -5.48 | Cell/plaster_white + Cell/oak_plank | 11.3 | 56 | 90 |
| 14.15, 119.11, 12.00 | Cell/plaster_white + Glass/glass_window | 22.68 | 54 | 90 |
| 14.30, 118.47, -7.85 | Cell/plaster_white + Cell/plaster_white | 10.28 | 53 | 90 |
| 26.41, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 9.55 | 52 | 22.5 |
| 14.30, 118.73, -19.39 | Cell/plaster_white + Cell/walnut | 8.89 | 51 | 22.5 |
| 29.93, 125.40, -5.48 | Cell/plaster_white + Cell/plaster_white | 10.17 | 51 | 90 |
| 16.67, 119.48, 11.30 | Cell/marble_white + Cell/metal_black | 9.34 | 48 | 45 |

(1858 more in the JSON)

## opening (info, 653)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.30, 125.15, -21.20 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -19.90 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -17.00 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -15.80 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -12.60 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -11.40 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 123.57, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 123.99, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.41, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.83, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.79, -21.20 | Cell/plaster_white | 0 + 0 + 1 | 0.02 |
| 14.30, 124.79, -19.90 | Cell/plaster_white | 0 + 0 + -1 | 0.02 |
| 14.30, 118.40, -21.15 | Cell/plaster_white | 0 + 1 + 0 | 0.2 |
| 14.30, 118.40, -19.94 | Cell/plaster_white | 0 + 1 + 0 | 0.26 |
| 14.30, 124.79, -17.00 | Cell/plaster_white | 0 + 0 + 1 | 0.02 |
| 14.30, 124.79, -15.80 | Cell/plaster_white | 0 + 0 + -1 | 0.02 |
| 14.30, 124.79, -12.60 | Cell/plaster_white | 0 + 0 + 1 | 0.02 |
| 14.30, 124.79, -11.40 | Cell/plaster_white | 0 + 0 + -1 | 0.02 |
| 14.30, 118.40, -7.99 | Cell/plaster_white | 1 + 0 + 0 | 0.02 |
| 14.30, 118.40, -7.51 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -7.09 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -6.67 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -6.25 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -5.83 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -5.41 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -4.99 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -4.57 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -4.15 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -3.73 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -3.31 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -2.89 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -2.47 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -2.05 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -1.63 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -1.21 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -0.79 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, -0.37 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 0.05 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 0.47 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 0.89 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |

(613 more in the JSON)

## backtoback (info, 6471)

| at | parts | area |
|---|---|---|
| 14.30, 118.51, -19.33 | Cell/plaster_white + Cell/walnut | 0.00008 |
| 14.30, 118.67, -19.36 | Cell/plaster_white + Cell/walnut | 0.02792 |
| 14.30, 118.51, -19.36 | Cell/plaster_white + Cell/walnut | 0.00005 |
| 14.30, 118.52, -19.38 | Cell/plaster_white + Cell/walnut | 0.0011 |
| 14.30, 118.98, -19.36 | Cell/plaster_white + Cell/walnut | 0.0057 |
| 14.30, 118.92, -19.37 | Cell/plaster_white + Cell/walnut | 0.00274 |
| 14.30, 118.52, -18.92 | Cell/plaster_white + Cell/walnut | 0.00086 |
| 14.30, 118.71, -19.02 | Cell/plaster_white + Cell/walnut | 0.087 |
| 14.30, 118.51, -19.13 | Cell/plaster_white + Cell/walnut | 0.00497 |
| 14.30, 118.65, -19.20 | Cell/plaster_white + Cell/walnut | 0.07265 |
| 14.30, 118.98, -18.94 | Cell/plaster_white + Cell/walnut | 0.0065 |
| 14.30, 118.96, -19.14 | Cell/plaster_white + Cell/walnut | 0.04138 |
| 14.30, 118.53, -18.50 | Cell/plaster_white + Cell/walnut | 0.00204 |
| 14.30, 118.72, -18.60 | Cell/plaster_white + Cell/walnut | 0.08582 |
| 14.30, 118.52, -18.71 | Cell/plaster_white + Cell/walnut | 0.01242 |
| 14.30, 118.66, -18.78 | Cell/plaster_white + Cell/walnut | 0.0652 |
| 14.30, 118.98, -18.52 | Cell/plaster_white + Cell/walnut | 0.0065 |
| 14.30, 118.96, -18.72 | Cell/plaster_white + Cell/walnut | 0.04138 |
| 14.30, 118.54, -18.09 | Cell/plaster_white + Cell/walnut | 0.00363 |
| 14.30, 118.73, -18.19 | Cell/plaster_white + Cell/walnut | 0.08423 |
| 14.30, 118.53, -18.30 | Cell/plaster_white + Cell/walnut | 0.01946 |
| 14.30, 118.67, -18.37 | Cell/plaster_white + Cell/walnut | 0.05816 |
| 14.30, 118.98, -18.10 | Cell/plaster_white + Cell/walnut | 0.0065 |
| 14.30, 118.96, -18.30 | Cell/plaster_white + Cell/walnut | 0.04138 |
| 14.30, 118.55, -17.67 | Cell/plaster_white + Cell/walnut | 0.00562 |
| 14.30, 118.75, -17.77 | Cell/plaster_white + Cell/walnut | 0.08224 |
| 14.30, 118.54, -17.88 | Cell/plaster_white + Cell/walnut | 0.02609 |
| 14.30, 118.69, -17.96 | Cell/plaster_white + Cell/walnut | 0.05152 |
| 14.30, 118.98, -17.68 | Cell/plaster_white + Cell/walnut | 0.0065 |
| 14.30, 118.96, -17.88 | Cell/plaster_white + Cell/walnut | 0.04138 |
| 14.30, 118.56, -17.26 | Cell/plaster_white + Cell/walnut | 0.00801 |
| 14.30, 118.75, -17.36 | Cell/plaster_white + Cell/walnut | 0.07985 |
| 14.30, 118.55, -17.47 | Cell/plaster_white + Cell/walnut | 0.03233 |
| 14.30, 118.70, -17.54 | Cell/plaster_white + Cell/walnut | 0.04529 |
| 14.30, 118.98, -17.26 | Cell/plaster_white + Cell/walnut | 0.0065 |
| 14.30, 118.96, -17.46 | Cell/plaster_white + Cell/walnut | 0.04138 |
| 14.30, 118.56, -17.02 | Cell/plaster_white + Cell/walnut | 0.00505 |
| 14.30, 118.76, -17.07 | Cell/plaster_white + Cell/walnut | 0.04097 |
| 14.30, 118.56, -17.13 | Cell/plaster_white + Cell/walnut | 0.01952 |
| 14.30, 118.71, -17.17 | Cell/plaster_white + Cell/walnut | 0.02113 |

(6431 more in the JSON)


Nodes: Cell, Glass. Distances: {"*":35}. Quantum 0.000 mm. Offset 0,100,0.
