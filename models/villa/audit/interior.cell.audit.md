# Mesh audit (before pack): interior.cell

77,840 triangles, 40,738 welded vertices, 3,214 open edges, 366,076 rays, 3081 ms.

**0 blocking**, 4846 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 63 |
| sliver | warn | 4462 |
| nonmanifold | warn | 111 |
| tjunction | warn | 210 |
| seam | info | 296 |
| opening | info | 618 |
| backtoback | info | 4193 |

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

## sliver (warn, 4462)

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

(4422 more in the JSON)

## nonmanifold (warn, 111)

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

(71 more in the JSON)

## tjunction (warn, 210)

| at | part | edge_m |
|---|---|---|
| 14.30, 124.80, -21.20 | Cell/plaster_white | 0.42 |
| 14.30, 124.80, -19.90 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, -8.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.40, -8.00 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, -7.85 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, 3.85 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 4.50 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 5.50 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 6.30 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 8.70 | Cell/plaster_white | 0.42 |
| 14.30, 118.40, 11.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 11.00 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 11.60 | Cell/plaster_white | 0.42 |
| 14.30, 118.70, 12.00 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 12.00 | Cell/plaster_white | 0.42 |
| 14.30, 118.70, 21.50 | Cell/plaster_white | 0.42 |
| 14.30, 121.40, 21.50 | Cell/plaster_white | 0.42 |
| 14.30, 122.00, 22.40 | Cell/plaster_white | 0.42 |
| 14.30, 121.75, 22.70 | Cell/plaster_white | 0.42 |
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
| 35.70, 122.00, 11.00 | Cell/plaster_white | 0.42 |
| 35.70, 122.00, 11.60 | Cell/plaster_white | 0.42 |
| 35.70, 122.00, 22.40 | Cell/plaster_white | 0.42 |
| 35.70, 118.40, 4.00 | Cell/plaster_white | 0.42 |

(170 more in the JSON)

## seam (info, 296)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.50, 122.40, -7.98 | Cell/oak_plank + Glass/glass_window | 47.45 | 201 | 90 |
| 18.01, 118.44, -22.70 | Cell/plaster_white + Cell/marble_white | 37.1 | 180 | 22.5 |
| 12.30, 122.65, 11.00 | Cell/plaster_white + Cell/marble_white | 27.16 | 139 | 90 |
| 21.15, 118.44, -7.59 | Cell/plaster_white + Cell/walnut | 26.47 | 134 | 22.5 |
| 12.15, 123.31, -6.00 | Cell/plaster_white + Glass/glass_window | 56.28 | 134 | 90 |
| 18.01, 118.40, -22.68 | Cell/oak_plank + Cell/marble_white | 24.28 | 126 | 22.5 |
| 20.85, 122.00, -7.99 | Cell/plaster_white + Cell/plaster_white | 24.3 | 121 | 90 |
| 22.60, 117.95, -20.28 | Cell/oak_plank + Cell/stone_floor | 23.4 | 113 | 90 |
| 37.35, 122.89, 0.00 | Cell/plaster_white + Glass/glass_window | 46.62 | 112 | 90 |
| 21.16, 118.40, -7.57 | Cell/walnut + Cell/stone_floor | 21.97 | 110 | 22.5 |
| 14.30, 118.47, 3.85 | Cell/plaster_white + Cell/plaster_white | 20.6 | 105 | 90 |
| 35.85, 118.69, -22.70 | Cell/plaster_white + Glass/glass_window | 41.16 | 98 | 90 |
| 29.93, 125.40, 1.23 | Cell/plaster_white + Cell/plaster_white | 19.03 | 94 | 90 |
| 15.01, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 17.15 | 88 | 22.5 |
| 23.01, 118.45, 22.70 | Cell/plaster_white + Cell/walnut | 18.2 | 85 | 22.5 |
| 35.85, 118.69, 8.00 | Cell/plaster_white + Glass/glass_window | 35.28 | 84 | 90 |
| 29.01, 122.40, 13.43 | Cell/oak_plank + Cell/walnut | 15.99 | 83 | 22.5 |
| 29.40, 122.40, 11.15 | Cell/plaster_white + Cell/oak_plank | 16.2 | 78 | 90 |
| 29.93, 122.40, 1.23 | Cell/plaster_white + Cell/oak_plank | 15.28 | 77 | 90 |
| 12.57, 122.40, 11.00 | Cell/oak_plank + Cell/marble_white | 14.76 | 74 | 90 |
| 29.61, 118.40, -5.48 | Cell/walnut + Cell/stone_floor | 14.35 | 74 | 22.5 |
| 35.85, 118.69, -7.85 | Cell/plaster_white + Glass/glass_window | 30.03 | 72 | 90 |
| 37.20, 122.40, 11.15 | Cell/plaster_white + Cell/plaster_white | 14.82 | 71 | 90 |
| 15.11, 119.30, 4.15 | Cell/plaster_white + Cell/brass | 12.37 | 66 | 45 |
| 14.30, 118.44, 11.30 | Cell/plaster_white + Cell/marble_white | 13.14 | 64 | 90 |
| 29.93, 122.40, -5.48 | Cell/plaster_white + Cell/oak_plank | 11.3 | 56 | 90 |
| 14.15, 119.11, 12.00 | Cell/plaster_white + Glass/glass_window | 22.68 | 54 | 90 |
| 14.30, 118.47, -7.85 | Cell/plaster_white + Cell/plaster_white | 10.28 | 53 | 90 |
| 26.41, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 9.55 | 52 | 22.5 |
| 29.93, 125.40, -5.48 | Cell/plaster_white + Cell/plaster_white | 10.17 | 51 | 90 |
| 24.00, 119.95, 22.85 | Cell/plaster_white + Glass/glass_window | 19.32 | 46 | 90 |
| 12.30, 122.57, -7.59 | Cell/plaster_white + Cell/walnut | 7.15 | 42 | 22.5 |
| 37.20, 122.49, -5.60 | Cell/plaster_white + Cell/plaster_white | 7.53 | 41 | 90 |
| 20.85, 118.41, 3.85 | Cell/plaster_white + Cell/plaster_white | 7.2 | 40 | 90 |
| 23.01, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 7.45 | 40 | 22.5 |
| 23.01, 118.40, 22.57 | Cell/oak_plank + Cell/walnut | 7.25 | 40 | 22.5 |
| 37.20, 122.40, -5.45 | Cell/plaster_white + Cell/plaster_white | 7.4 | 39 | 90 |
| 32.61, 118.40, 22.18 | Cell/oak_plank + Cell/walnut | 5.95 | 36 | 22.5 |
| 15.50, 119.23, 4.15 | Cell/plaster_white + Cell/walnut | 6.47 | 35 | 22.5 |
| 20.85, 118.40, 4.11 | Cell/plaster_white + Cell/stone_floor | 6.7 | 34 | 90 |

(256 more in the JSON)

## opening (info, 618)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.30, 125.15, -21.20 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 125.15, -19.90 | Cell/plaster_white | 1 + 0 + 0 | 0.4 |
| 14.30, 123.57, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 123.99, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.41, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.83, -8.00 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 124.79, -21.20 | Cell/plaster_white | 0 + 0 + 1 | 0.02 |
| 14.30, 124.79, -19.90 | Cell/plaster_white | 0 + 0 + -1 | 0.02 |
| 14.30, 118.40, -21.15 | Cell/plaster_white | 0 + 1 + 0 | 0.2 |
| 14.30, 118.40, -19.94 | Cell/plaster_white | 0 + 1 + 0 | 0.26 |
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
| 14.30, 118.40, 1.31 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 1.73 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 2.15 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 2.57 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 2.99 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 118.40, 3.41 | Cell/plaster_white | 1 + 0 + 0 | 0.42 |
| 14.30, 121.41, 4.50 | Cell/plaster_white | 1 + 0 + 0 | 0.02 |
| 14.30, 121.41, 5.50 | Cell/plaster_white | 1 + 0 + 0 | 0.02 |

(578 more in the JSON)

## backtoback (info, 4193)

| at | parts | area |
|---|---|---|
| 14.30, 118.44, 11.25 | Cell/plaster_white + Cell/marble_white | 0.00573 |
| 14.30, 118.47, 11.11 | Cell/plaster_white + Cell/marble_white | 0.00741 |
| 14.30, 118.41, 11.19 | Cell/plaster_white + Cell/marble_white | 0.00627 |
| 14.30, 118.43, 11.04 | Cell/plaster_white + Cell/marble_white | 0.00459 |
| 14.30, 118.75, 11.26 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 118.83, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 118.54, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 118.66, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 119.12, 11.25 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 119.25, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 118.95, 11.15 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 119.08, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 119.59, 11.26 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 119.67, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 119.38, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 119.50, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 119.96, 11.25 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 120.08, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 119.79, 11.15 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 119.92, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 120.38, 11.25 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 120.50, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 120.22, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 120.34, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 120.85, 11.26 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 120.92, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 120.64, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 120.76, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 121.22, 11.25 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 121.34, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 121.06, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 121.18, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 121.64, 11.25 | Cell/plaster_white + Cell/marble_white | 0.03008 |
| 14.30, 121.77, 11.11 | Cell/plaster_white + Cell/marble_white | 0.03892 |
| 14.30, 121.48, 11.19 | Cell/plaster_white + Cell/marble_white | 0.03292 |
| 14.30, 121.60, 11.05 | Cell/plaster_white + Cell/marble_white | 0.02408 |
| 14.30, 121.92, 11.25 | Cell/plaster_white + Cell/marble_white | 0.01146 |
| 14.30, 121.97, 11.11 | Cell/plaster_white + Cell/marble_white | 0.01483 |
| 14.30, 121.86, 11.19 | Cell/plaster_white + Cell/marble_white | 0.01254 |
| 14.30, 121.91, 11.05 | Cell/plaster_white + Cell/marble_white | 0.00917 |

(4153 more in the JSON)


Nodes: Cell, Glass. Distances: {"*":35}. Quantum 0.000 mm. Offset 0,100,0.
