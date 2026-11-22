# Mesh audit (before pack): villa.lod0

54,802 triangles, 30,541 welded vertices, 3,732 open edges, 596,122 rays, 7944 ms.

**0 blocking**, 12209 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 11474 |
| nonmanifold | warn | 76 |
| tjunction | warn | 659 |
| seam | info | 648 |
| opening | info | 1299 |
| backtoback | info | 2900 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 11474)

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
| 28.47, 115.40, 22.60 | Villa/render_white | 57 | 0.7 |
| 28.23, 115.39, 22.60 | Villa/render_white | 57 | 0.7 |
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

(11434 more in the JSON)

## nonmanifold (warn, 76)

| at | part | uses |
|---|---|---|
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
| 35.85, 125.20, -22.64 | Villa/metal_dark | 4 |
| 35.85, 118.40, -22.64 | Villa/metal_dark | 4 |
| 35.85, 125.20, -8.21 | Villa/metal_dark | 4 |
| 35.85, 118.40, -8.21 | Villa/metal_dark | 4 |
| 35.85, 121.95, -7.79 | Villa/metal_dark | 4 |
| 35.85, 118.40, -7.79 | Villa/metal_dark | 4 |
| 35.85, 121.95, 4.84 | Villa/metal_dark | 4 |
| 35.85, 118.40, 4.84 | Villa/metal_dark | 4 |
| 35.85, 121.95, 5.06 | Villa/metal_dark | 4 |
| 35.85, 118.40, 5.06 | Villa/metal_dark | 4 |
| 35.85, 121.95, 7.84 | Villa/metal_dark | 4 |
| 35.85, 118.40, 7.84 | Villa/metal_dark | 4 |
| 35.85, 121.95, 8.06 | Villa/metal_dark | 4 |
| 35.85, 118.40, 8.06 | Villa/metal_dark | 4 |
| 35.85, 121.95, 22.64 | Villa/metal_dark | 4 |
| 35.85, 118.40, 22.64 | Villa/metal_dark | 4 |

(36 more in the JSON)

## tjunction (warn, 659)

| at | part | edge_m |
|---|---|---|
| 14.00, 124.80, -21.20 | Villa/render_white | 0.7 |
| 14.00, 124.80, -19.90 | Villa/render_white | 0.7 |
| 14.00, 122.00, -8.00 | Villa/render_white | 0.7 |
| 14.00, 121.40, 4.50 | Villa/render_white | 0.7 |
| 14.00, 121.40, 5.50 | Villa/render_white | 0.7 |
| 14.00, 121.40, 6.30 | Villa/render_white | 0.7 |
| 14.00, 121.40, 8.70 | Villa/render_white | 0.7 |
| 14.00, 118.70, 12.00 | Villa/render_white | 0.5 |
| 14.00, 121.40, 12.00 | Villa/render_white | 0.7 |
| 14.00, 118.40, 18.00 | Villa/render_white | 0.7 |
| 14.00, 118.70, 21.50 | Villa/render_white | 0.5 |
| 14.00, 121.40, 21.50 | Villa/render_white | 0.7 |
| 14.00, 118.40, 22.60 | Villa/render_white | 0.6 |
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
| 14.00, 115.36, 18.00 | Villa/render_white | 0.075 |
| 14.00, 118.00, 18.00 | Villa/render_white | 0.55 |
| 14.70, 115.33, 18.00 | Villa/render_white | 0.075 |
| 15.40, 115.33, 18.00 | Villa/render_white | 0.128 |
| 16.10, 115.27, 18.00 | Villa/render_white | 0.243 |

(619 more in the JSON)

## seam (info, 648)

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
| 14.15, 119.25, 12.00 | Villa/render_white + Villa/glass_window | 19.6 | 28 | 90 |
| 14.10, 118.73, -19.90 | Villa/render_white + Villa/metal_dark | 6.63 | 28 | 45 |
| 35.90, 118.73, -22.70 | Villa/render_white + Villa/metal_dark | 7.03 | 28 | 45 |
| 35.85, 119.25, 8.00 | Villa/render_white + Villa/glass_window | 19.6 | 28 | 90 |
| 14.10, 121.40, 12.24 | Villa/render_white + Villa/metal_dark | 8.06 | 27 | 45 |
| 14.10, 118.58, -21.20 | Villa/render_white + Villa/metal_dark | 6.63 | 26 | 45 |
| 14.00, 125.95, -22.55 | Villa/render_white + Villa/metal_dark | 14.69 | 25 | 90 |
| 9.60, 118.90, -20.00 | Villa/render_white + Villa/stone_blue | 14.03 | 25 | 90 |
| 9.90, 118.88, -20.00 | Villa/render_white + Villa/stone_blue | 14.03 | 25 | 90 |
| 36.00, 118.38, 16.05 | Villa/stone_blue + Villa/stone_blue | 6.71 | 25 | 90 |
| 14.10, 118.42, 5.50 | Villa/stone_blue + Villa/metal_dark | 0.3 | 25 | 45 |
| 14.15, 118.42, 4.56 | Villa/stone_blue + Villa/metal_dark | 1.89 | 25 | 90 |
| 14.15, 118.42, -21.14 | Villa/stone_blue + Villa/metal_dark | 2.49 | 25 | 90 |

(608 more in the JSON)

## opening (info, 1299)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 125.15, -21.20 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 124.85, -19.90 | Villa/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 121.75, -8.00 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.65, 4.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.45, 5.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.65, 6.30 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.45, 8.70 | Villa/render_white | -1 + 0 + 0 | 0.3 |
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
| 36.00, 121.74, -7.85 | Villa/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.91, 4.90 | Villa/render_white | 0 + 0 + -1 | 0.25 |
| 36.00, 121.74, 5.00 | Villa/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.91, 7.90 | Villa/render_white | 0 + 0 + -1 | 0.25 |
| 36.00, 121.74, 8.00 | Villa/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.91, 22.70 | Villa/render_white | 0 + 0 + -1 | 0.25 |

(1259 more in the JSON)

## backtoback (info, 2900)

| at | parts | area |
|---|---|---|
| 14.13, 118.61, 4.50 | Villa/render_white + Villa/metal_dark | 0.01929 |
| 14.12, 118.85, 4.50 | Villa/render_white + Villa/metal_dark | 0.00353 |
| 14.13, 119.20, 4.50 | Villa/render_white + Villa/metal_dark | 0.02726 |
| 14.12, 119.53, 4.50 | Villa/render_white + Villa/metal_dark | 0.00494 |
| 14.15, 120.15, 4.50 | Villa/render_white + Villa/metal_dark | 0.00215 |
| 14.13, 119.89, 4.50 | Villa/render_white + Villa/metal_dark | 0.02511 |
| 14.14, 120.28, 4.50 | Villa/render_white + Villa/metal_dark | 0.00031 |
| 14.12, 120.23, 4.50 | Villa/render_white + Villa/metal_dark | 0.00463 |
| 14.14, 120.61, 4.50 | Villa/render_white + Villa/metal_dark | 0.01381 |
| 14.12, 120.56, 4.50 | Villa/render_white + Villa/metal_dark | 0.01345 |
| 14.13, 120.95, 4.50 | Villa/render_white + Villa/metal_dark | 0.00233 |
| 14.11, 120.91, 4.50 | Villa/render_white + Villa/metal_dark | 0.0026 |
| 14.13, 121.22, 4.50 | Villa/render_white + Villa/metal_dark | 0.01336 |
| 14.11, 121.14, 4.50 | Villa/render_white + Villa/metal_dark | 0.00221 |
| 14.12, 121.36, 4.50 | Villa/render_white + Villa/metal_dark | 0.00244 |
| 14.11, 121.32, 4.50 | Villa/render_white + Villa/metal_dark | 0.0002 |
| 14.11, 118.72, 5.50 | Villa/render_white + Villa/metal_dark | 0.00347 |
| 14.13, 118.63, 5.50 | Villa/render_white + Villa/metal_dark | 0.016 |
| 14.11, 118.50, 5.50 | Villa/render_white + Villa/metal_dark | 0.00031 |
| 14.12, 118.45, 5.50 | Villa/render_white + Villa/metal_dark | 0.00303 |
| 14.12, 119.33, 5.50 | Villa/render_white + Villa/metal_dark | 0.0152 |
| 14.14, 119.28, 5.50 | Villa/render_white + Villa/metal_dark | 0.01206 |
| 14.11, 118.98, 5.50 | Villa/render_white + Villa/metal_dark | 0.00301 |
| 14.13, 118.94, 5.50 | Villa/render_white + Villa/metal_dark | 0.00193 |
| 14.13, 119.99, 5.50 | Villa/render_white + Villa/metal_dark | 0.02605 |
| 14.15, 119.71, 5.50 | Villa/render_white + Villa/metal_dark | 0.00121 |
| 14.12, 119.66, 5.50 | Villa/render_white + Villa/metal_dark | 0.00476 |
| 14.14, 119.61, 5.50 | Villa/render_white + Villa/metal_dark | 0.00017 |
| 14.13, 120.70, 5.50 | Villa/render_white + Villa/metal_dark | 0.02726 |
| 14.12, 120.37, 5.50 | Villa/render_white + Villa/metal_dark | 0.00494 |
| 14.13, 121.23, 5.50 | Villa/render_white + Villa/metal_dark | 0.01539 |
| 14.12, 121.04, 5.50 | Villa/render_white + Villa/metal_dark | 0.00282 |
| 14.13, 121.40, 4.54 | Villa/render_white + Villa/metal_dark | 0.00179 |
| 14.13, 121.40, 4.51 | Villa/render_white + Villa/metal_dark | 0.0006 |
| 14.11, 121.40, 4.73 | Villa/render_white + Villa/metal_dark | 0.00334 |
| 14.13, 121.40, 4.72 | Villa/render_white + Villa/metal_dark | 0.00929 |
| 14.12, 121.40, 4.86 | Villa/render_white + Villa/metal_dark | 0.00261 |
| 14.14, 121.40, 4.89 | Villa/render_white + Villa/metal_dark | 0.00021 |
| 14.13, 121.40, 5.17 | Villa/render_white + Villa/metal_dark | 0.02233 |
| 14.15, 121.40, 4.93 | Villa/render_white + Villa/metal_dark | 0.00053 |

(2860 more in the JSON)


Nodes: Villa, Villa_gateL, Villa_gateR, Villa_door, Villa_water. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
