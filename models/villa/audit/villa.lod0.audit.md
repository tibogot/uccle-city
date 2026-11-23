# Mesh audit (before pack): villa.lod0

58,884 triangles, 32,749 welded vertices, 3,994 open edges, 626,036 rays, 3630 ms.

**0 blocking**, 12458 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 11676 |
| nonmanifold | warn | 98 |
| tjunction | warn | 684 |
| seam | info | 746 |
| opening | info | 1279 |
| backtoback | info | 3179 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 11676)

| at | part | aspect | longest |
|---|---|---|---|
| 12.30, 126.20, 12.90 | Villa/render_white | 103 | 30.901 |
| 12.30, 126.10, 2.60 | Villa/render_white | 103 | 30.901 |
| 37.20, 126.10, 12.90 | Villa/render_white | 103 | 30.901 |
| 37.20, 126.20, 2.60 | Villa/render_white | 103 | 30.901 |
| 28.90, 126.10, -7.70 | Villa/render_white | 83 | 24.902 |
| 20.60, 126.20, -7.70 | Villa/render_white | 83 | 24.902 |
| 28.90, 126.20, 23.20 | Villa/render_white | 83 | 24.902 |
| 20.60, 126.10, 23.20 | Villa/render_white | 83 | 24.902 |
| 14.30, 125.87, -12.90 | Villa/render_white | 59 | 14.702 |
| 14.30, 125.78, -17.80 | Villa/render_white | 59 | 14.702 |
| 35.70, 125.78, -12.90 | Villa/render_white | 59 | 14.702 |
| 35.70, 125.87, -17.80 | Villa/render_white | 59 | 14.702 |
| 28.57, 125.78, -22.70 | Villa/render_white | 86 | 21.401 |
| 21.43, 125.87, -22.70 | Villa/render_white | 86 | 21.401 |
| 11.65, 117.10, 5.50 | Villa/render_white | 297 | 3.357 |
| 11.65, 118.22, 5.50 | Villa/render_white | 297 | 3.357 |
| 11.65, 115.98, 7.83 | Villa/render_white | 308 | 3.484 |
| 11.65, 115.98, 6.67 | Villa/render_white | 308 | 3.484 |
| 11.65, 118.22, 9.00 | Villa/render_white | 297 | 3.357 |
| 11.65, 117.10, 8.99 | Villa/render_white | 297 | 3.357 |
| 11.65, 119.35, 6.67 | Villa/render_white | 308 | 3.484 |
| 11.65, 119.34, 7.83 | Villa/render_white | 308 | 3.484 |
| 11.90, 119.34, 6.67 | Villa/render_white | 308 | 3.484 |
| 11.89, 119.35, 7.83 | Villa/render_white | 308 | 3.484 |
| 11.89, 118.22, 5.50 | Villa/render_white | 297 | 3.357 |
| 11.90, 117.10, 5.50 | Villa/render_white | 297 | 3.357 |
| 11.89, 117.10, 9.00 | Villa/render_white | 297 | 3.357 |
| 11.90, 118.22, 8.99 | Villa/render_white | 297 | 3.357 |
| 11.89, 115.98, 6.67 | Villa/render_white | 308 | 3.484 |
| 11.90, 115.98, 7.83 | Villa/render_white | 308 | 3.484 |
| 11.65, 117.04, 9.00 | Villa/render_white | 282 | 3.193 |
| 11.65, 118.11, 9.01 | Villa/render_white | 282 | 3.193 |
| 11.65, 118.11, 9.30 | Villa/render_white | 282 | 3.193 |
| 11.65, 117.04, 9.29 | Villa/render_white | 282 | 3.193 |
| 11.84, 119.17, 9.00 | Villa/render_white | 47 | 0.534 |
| 12.01, 119.18, 9.01 | Villa/render_white | 47 | 0.534 |
| 12.01, 119.17, 9.30 | Villa/render_white | 47 | 0.534 |
| 11.84, 119.18, 9.29 | Villa/render_white | 47 | 0.534 |
| 12.20, 118.11, 9.00 | Villa/render_white | 282 | 3.193 |
| 12.20, 117.04, 9.01 | Villa/render_white | 282 | 3.193 |

(11636 more in the JSON)

## nonmanifold (warn, 98)

| at | part | uses |
|---|---|---|
| 14.00, 122.00, 6.65 | Villa/render_white | 3 |
| 14.00, 122.00, 7.35 | Villa/render_white | 3 |
| 14.00, 122.00, 8.05 | Villa/render_white | 3 |
| 14.00, 122.00, 8.75 | Villa/render_white | 3 |
| 14.00, 122.00, 9.45 | Villa/render_white | 3 |
| 14.00, 122.00, 10.15 | Villa/render_white | 3 |
| 14.00, 122.00, 10.85 | Villa/render_white | 3 |
| 14.00, 122.00, 11.55 | Villa/render_white | 3 |
| 36.00, 117.85, -17.00 | Villa/stone_blue | 3 |
| 36.00, 118.30, -17.00 | Villa/stone_blue | 3 |
| 36.00, 117.85, 16.00 | Villa/stone_blue | 3 |
| 36.00, 118.30, 16.00 | Villa/stone_blue | 3 |
| 38.16, 118.39, -14.97 | Villa/stone_blue | 4 |
| 43.34, 118.39, -14.97 | Villa/stone_blue | 4 |
| 38.16, 118.39, 0.97 | Villa/stone_blue | 4 |
| 43.34, 118.39, 0.97 | Villa/stone_blue | 4 |
| 44.85, 117.28, -1.00 | Villa/stone_blue | 4 |
| 44.85, 117.27, -0.99 | Villa/stone_blue | 4 |
| 44.85, 117.28, 5.00 | Villa/stone_blue | 4 |
| 44.85, 117.27, 4.99 | Villa/stone_blue | 4 |
| 14.15, 121.40, 4.56 | Villa/metal_dark | 4 |
| 14.15, 118.40, 4.56 | Villa/metal_dark | 4 |
| 14.15, 121.40, 5.44 | Villa/metal_dark | 4 |
| 14.15, 118.40, 5.44 | Villa/metal_dark | 4 |
| 14.15, 121.40, 12.06 | Villa/metal_dark | 4 |
| 14.15, 118.70, 12.06 | Villa/metal_dark | 4 |
| 14.15, 121.40, 21.44 | Villa/metal_dark | 4 |
| 14.15, 118.70, 21.44 | Villa/metal_dark | 4 |
| 14.15, 124.80, -21.14 | Villa/metal_dark | 4 |
| 14.15, 118.40, -21.14 | Villa/metal_dark | 4 |
| 14.15, 124.80, -19.96 | Villa/metal_dark | 4 |
| 14.15, 118.40, -19.96 | Villa/metal_dark | 4 |
| 14.15, 124.80, -16.94 | Villa/metal_dark | 4 |
| 14.15, 118.40, -16.94 | Villa/metal_dark | 4 |
| 14.15, 124.80, -15.86 | Villa/metal_dark | 4 |
| 14.15, 118.40, -15.86 | Villa/metal_dark | 4 |
| 14.15, 124.80, -12.54 | Villa/metal_dark | 4 |
| 14.15, 118.40, -12.54 | Villa/metal_dark | 4 |
| 14.15, 124.80, -11.46 | Villa/metal_dark | 4 |
| 14.15, 118.40, -11.46 | Villa/metal_dark | 4 |

(58 more in the JSON)

## tjunction (warn, 684)

| at | part | edge_m |
|---|---|---|
| 14.00, 124.80, -21.20 | Villa/render_white | 0.7 |
| 14.00, 124.80, -19.90 | Villa/render_white | 0.7 |
| 14.00, 124.80, -17.00 | Villa/render_white | 0.7 |
| 14.00, 124.80, -15.80 | Villa/render_white | 0.7 |
| 14.00, 124.80, -12.60 | Villa/render_white | 0.7 |
| 14.00, 124.80, -11.40 | Villa/render_white | 0.7 |
| 14.00, 122.00, -8.00 | Villa/render_white | 0.7 |
| 14.00, 121.40, 4.50 | Villa/render_white | 0.7 |
| 14.00, 122.00, 5.20 | Villa/render_white | 0.6 |
| 14.00, 121.40, 5.50 | Villa/render_white | 0.7 |
| 14.00, 121.80, 5.90 | Villa/render_white | 0.3 |
| 14.00, 121.80, 9.10 | Villa/render_white | 0.3 |
| 14.00, 118.70, 12.00 | Villa/render_white | 0.5 |
| 14.00, 121.40, 12.00 | Villa/render_white | 0.7 |
| 14.00, 118.40, 18.30 | Villa/render_white | 0.7 |
| 14.00, 118.70, 21.50 | Villa/render_white | 0.5 |
| 14.00, 121.40, 21.50 | Villa/render_white | 0.7 |
| 14.00, 118.40, 22.00 | Villa/render_white | 0.7 |
| 28.00, 118.85, -23.00 | Villa/render_white | 0.5 |
| 28.00, 120.80, -23.00 | Villa/render_white | 0.7 |
| 33.00, 118.85, -23.00 | Villa/render_white | 0.5 |
| 33.00, 120.80, -23.00 | Villa/render_white | 0.7 |
| 24.00, 118.70, 23.00 | Villa/render_white | 0.5 |
| 24.00, 121.40, 23.00 | Villa/render_white | 0.7 |
| 33.00, 118.70, 23.00 | Villa/render_white | 0.5 |
| 33.00, 121.40, 23.00 | Villa/render_white | 0.7 |
| 36.00, 122.00, -8.00 | Villa/render_white | 0.7 |
| 36.00, 121.95, -7.85 | Villa/render_white | 0.3 |
| 36.00, 121.95, 5.00 | Villa/render_white | 0.3 |
| 36.00, 121.95, 4.90 | Villa/render_white | 0.3 |
| 36.00, 121.95, 8.00 | Villa/render_white | 0.3 |
| 36.00, 121.95, 7.90 | Villa/render_white | 0.3 |
| 36.00, 121.95, 22.70 | Villa/render_white | 0.3 |
| 12.30, 126.00, -6.00 | Villa/render_white | 30.9 |
| 37.20, 126.00, -6.00 | Villa/render_white | 30.9 |
| 14.00, 126.00, -7.70 | Villa/render_white | 24.9 |
| 14.00, 126.00, 23.20 | Villa/render_white | 24.9 |
| 14.30, 125.70, -22.00 | Villa/render_white | 14.7 |
| 35.70, 125.70, -22.00 | Villa/render_white | 14.7 |
| 16.00, 125.70, -22.70 | Villa/render_white | 21.4 |

(644 more in the JSON)

## seam (info, 746)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 36.00, 118.40, -7.85 | Villa/stone_blue + Villa/stone_blue | 25.57 | 95 | 90 |
| 12.10, 123.00, -5.74 | Villa/wood_cladding + Villa/metal_dark | 26.96 | 81 | 45 |
| 12.10, 125.00, -5.83 | Villa/wood_cladding + Villa/metal_dark | 26.96 | 81 | 45 |
| 12.15, 123.45, -6.00 | Villa/wood_cladding + Villa/glass_window | 54.6 | 78 | 90 |
| 36.00, 118.38, -16.89 | Villa/stone_blue + Villa/stone_blue | 17.78 | 69 | 90 |
| 37.40, 122.40, 0.28 | Villa/wood_cladding + Villa/metal_dark | 21.76 | 65 | 45 |
| 43.33, 118.40, -14.97 | Villa/stone_blue + Villa/stone_blue | 16.53 | 64 | 90 |
| 36.00, 118.40, 8.00 | Villa/stone_blue + Villa/stone_blue | 16.08 | 63 | 90 |
| 38.38, 118.40, -14.97 | Villa/stone_blue + Villa/stone_blue | 16.53 | 62 | 90 |
| 37.35, 123.45, 0.00 | Villa/wood_cladding + Villa/glass_window | 43.4 | 62 | 90 |
| 37.36, 125.40, 0.06 | Villa/wood_cladding + Villa/metal_dark | 18.96 | 59 | 45 |
| 12.30, 126.00, -5.00 | Villa/render_white + Villa/concrete_soffit | 100 | 50 | 90 |
| 38.40, 118.40, -15.35 | Villa/stone_blue + Villa/stone_blue | 6.54 | 48 | 90 |
| 38.16, 118.40, 0.97 | Villa/stone_blue + Villa/stone_blue | 6.54 | 47 | 90 |
| 12.00, 126.30, -7.35 | Villa/wood_cladding + Villa/metal_dark | 30.89 | 47 | 90 |
| 37.50, 126.30, -7.35 | Villa/wood_cladding + Villa/metal_dark | 30.89 | 46 | 90 |
| 12.00, 126.30, 23.35 | Villa/wood_cladding + Villa/metal_dark | 26.09 | 42 | 90 |
| 14.00, 125.95, -22.71 | Villa/render_white + Villa/metal_dark | 22.59 | 37 | 90 |
| 35.85, 119.25, -22.70 | Villa/render_white + Villa/glass_window | 25.2 | 36 | 90 |
| 45.21, 117.59, -1.00 | Villa/stone_blue + Villa/stone_blue | 9.73 | 36 | 16.4 |
| 36.00, 118.40, 5.00 | Villa/stone_blue + Villa/stone_blue | 5.87 | 35 | 90 |
| 45.57, 117.50, -1.00 | Villa/stone_blue + Villa/stone_blue | 8.74 | 34 | 22.1 |
| 14.35, 126.30, -8.00 | Villa/wood_cladding + Villa/metal_dark | 22 | 32 | 90 |
| 14.10, 118.70, 12.39 | Villa/render_white + Villa/metal_dark | 9.46 | 31 | 45 |
| 24.06, 118.70, 22.86 | Villa/render_white + Villa/metal_dark | 8.96 | 31 | 45 |
| 24.00, 119.25, 22.85 | Villa/render_white + Villa/glass_window | 21 | 30 | 90 |
| 24.06, 121.40, 22.87 | Villa/render_white + Villa/metal_dark | 8.96 | 29 | 45 |
| 14.00, 125.95, -22.55 | Villa/render_white + Villa/metal_dark | 14.69 | 28 | 90 |
| 14.15, 119.25, 12.00 | Villa/render_white + Villa/glass_window | 19.6 | 28 | 90 |
| 14.10, 118.73, -19.90 | Villa/render_white + Villa/metal_dark | 6.63 | 28 | 45 |
| 14.10, 118.73, -15.80 | Villa/render_white + Villa/metal_dark | 6.63 | 28 | 45 |
| 35.90, 118.73, -22.70 | Villa/render_white + Villa/metal_dark | 7.03 | 28 | 45 |
| 35.85, 119.25, 8.00 | Villa/render_white + Villa/glass_window | 19.6 | 28 | 90 |
| 14.10, 121.40, 12.24 | Villa/render_white + Villa/metal_dark | 8.06 | 27 | 45 |
| 14.10, 118.58, -21.20 | Villa/render_white + Villa/metal_dark | 6.63 | 26 | 45 |
| 14.10, 118.58, -17.00 | Villa/render_white + Villa/metal_dark | 6.63 | 26 | 45 |
| 36.00, 118.38, 16.05 | Villa/stone_blue + Villa/stone_blue | 6.71 | 25 | 90 |
| 14.10, 118.42, 5.50 | Villa/stone_blue + Villa/metal_dark | 0.3 | 25 | 45 |
| 14.15, 118.42, 4.56 | Villa/stone_blue + Villa/metal_dark | 1.89 | 25 | 90 |
| 14.15, 118.42, -21.14 | Villa/stone_blue + Villa/metal_dark | 2.49 | 25 | 90 |

(706 more in the JSON)

## opening (info, 1279)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 125.15, -21.20 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 124.85, -19.90 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 125.15, -17.00 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 124.85, -15.80 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 125.15, -12.60 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 124.85, -11.40 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 121.75, -8.00 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.65, 4.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.45, 5.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.45, 12.00 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.45, 21.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.65, 12.00 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.45, 21.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 28.00, 118.44, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.45 |
| 33.00, 118.81, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.45 |
| 28.00, 120.95, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.2 |
| 33.00, 120.95, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.2 |
| 24.00, 118.45, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 33.00, 118.45, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 24.00, 121.65, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 33.00, 121.45, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 36.00, 121.75, -8.00 | Villa/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.97, -7.85 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 4.90 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 5.00 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 7.90 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 8.00 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 22.70 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 14.00, 121.05, 4.50 | Villa/render_white | 0 + 0 + 1 | 0.4 |
| 14.00, 121.35, 5.50 | Villa/render_white | 0 + 0 + -1 | 0.4 |
| 14.00, 118.85, 12.00 | Villa/render_white | 0 + 0 + 1 | 0.2 |
| 14.00, 121.05, 12.00 | Villa/render_white | 0 + 0 + 1 | 0.4 |
| 14.00, 118.75, 21.50 | Villa/render_white | 0 + 0 + -1 | 0.2 |
| 14.00, 121.35, 21.50 | Villa/render_white | 0 + 0 + -1 | 0.4 |
| 14.00, 124.55, -21.20 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 14.00, 124.75, -19.90 | Villa/render_white | 0 + 0 + -1 | 0.3 |
| 14.00, 124.55, -17.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 14.00, 124.75, -15.80 | Villa/render_white | 0 + 0 + -1 | 0.3 |
| 14.00, 124.55, -12.60 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 14.00, 124.75, -11.40 | Villa/render_white | 0 + 0 + -1 | 0.3 |

(1239 more in the JSON)

## backtoback (info, 3179)

| at | parts | area |
|---|---|---|
| 14.00, 121.94, 5.46 | Villa/render_white + Villa/metal_dark | 0.01473 |
| 14.00, 121.82, 5.35 | Villa/render_white + Villa/metal_dark | 0.03477 |
| 14.00, 121.97, 5.34 | Villa/render_white + Villa/metal_dark | 0.01227 |
| 14.00, 121.92, 5.25 | Villa/render_white + Villa/metal_dark | 0.01023 |
| 14.00, 121.89, 5.58 | Villa/render_white + Villa/metal_dark | 0.008 |
| 14.00, 121.77, 5.55 | Villa/render_white + Villa/metal_dark | 0.0016 |
| 14.00, 121.92, 5.55 | Villa/render_white + Villa/metal_dark | 0.013 |
| 14.00, 121.78, 5.51 | Villa/render_white + Villa/metal_dark | 0.0014 |
| 14.00, 121.95, 5.88 | Villa/render_white + Villa/metal_dark | 0.00394 |
| 14.00, 121.83, 5.82 | Villa/render_white + Villa/metal_dark | 0.02486 |
| 14.00, 121.98, 5.73 | Villa/render_white + Villa/metal_dark | 0.01149 |
| 14.00, 121.89, 5.66 | Villa/render_white + Villa/metal_dark | 0.03171 |
| 14.00, 121.91, 6.23 | Villa/render_white + Villa/metal_dark | 0.03184 |
| 14.00, 121.82, 6.03 | Villa/render_white + Villa/metal_dark | 0.00816 |
| 14.00, 121.95, 6.08 | Villa/render_white + Villa/metal_dark | 0.0344 |
| 14.00, 121.85, 5.94 | Villa/render_white + Villa/metal_dark | 0.0056 |
| 14.00, 121.90, 6.90 | Villa/render_white + Villa/metal_dark | 0.04348 |
| 14.00, 121.82, 6.53 | Villa/render_white + Villa/metal_dark | 0.02652 |
| 14.00, 121.97, 6.73 | Villa/render_white + Villa/metal_dark | 0.03818 |
| 14.00, 121.90, 6.41 | Villa/render_white + Villa/metal_dark | 0.03182 |
| 14.00, 121.92, 7.62 | Villa/render_white + Villa/metal_dark | 0.04348 |
| 14.00, 121.82, 7.22 | Villa/render_white + Villa/metal_dark | 0.02652 |
| 14.00, 121.97, 7.43 | Villa/render_white + Villa/metal_dark | 0.03818 |
| 14.00, 121.90, 7.11 | Villa/render_white + Villa/metal_dark | 0.03182 |
| 14.00, 121.90, 8.30 | Villa/render_white + Villa/metal_dark | 0.04348 |
| 14.00, 121.82, 7.92 | Villa/render_white + Villa/metal_dark | 0.02652 |
| 14.00, 121.97, 8.13 | Villa/render_white + Villa/metal_dark | 0.03818 |
| 14.00, 121.90, 7.81 | Villa/render_white + Villa/metal_dark | 0.03182 |
| 14.00, 121.90, 9.00 | Villa/render_white + Villa/metal_dark | 0.04348 |
| 14.00, 121.82, 8.63 | Villa/render_white + Villa/metal_dark | 0.02652 |
| 14.00, 121.97, 8.83 | Villa/render_white + Villa/metal_dark | 0.03818 |
| 14.00, 121.90, 8.51 | Villa/render_white + Villa/metal_dark | 0.03182 |
| 14.00, 121.91, 9.72 | Villa/render_white + Villa/metal_dark | 0.03733 |
| 14.00, 121.80, 9.51 | Villa/render_white + Villa/metal_dark | 0.02987 |
| 14.00, 121.97, 9.55 | Villa/render_white + Villa/metal_dark | 0.04667 |
| 14.00, 121.85, 9.23 | Villa/render_white + Villa/metal_dark | 0.05413 |
| 14.00, 121.91, 10.42 | Villa/render_white + Villa/metal_dark | 0.03733 |
| 14.00, 121.80, 10.21 | Villa/render_white + Villa/metal_dark | 0.02987 |
| 14.00, 121.97, 10.25 | Villa/render_white + Villa/metal_dark | 0.04667 |
| 14.00, 121.88, 9.91 | Villa/render_white + Villa/metal_dark | 0.05413 |

(3139 more in the JSON)


Nodes: Villa, Villa_gateL, Villa_gateR, Villa_door, Villa_water. Distances: {"Villa_ivy":80,"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
