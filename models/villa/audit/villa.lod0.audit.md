# Mesh audit (before pack): villa.lod0

54,226 triangles, 31,633 welded vertices, 6,492 open edges, 612,948 rays, 11210 ms.

**0 blocking**, 14815 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 11378 |
| nonmanifold | warn | 72 |
| tjunction | warn | 3365 |
| seam | info | 898 |
| opening | info | 1576 |
| backtoback | info | 3065 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 11378)

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

(11338 more in the JSON)

## nonmanifold (warn, 72)

| at | part | uses |
|---|---|---|
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
| 28.06, 120.80, -22.85 | Villa/metal_dark | 4 |
| 28.06, 118.85, -22.85 | Villa/metal_dark | 4 |
| 32.94, 118.85, -22.85 | Villa/metal_dark | 4 |
| 32.94, 120.80, -22.85 | Villa/metal_dark | 4 |

(32 more in the JSON)

## tjunction (warn, 3365)

| at | part | edge_m |
|---|---|---|
| 14.00, 118.40, -22.51 | Villa/render_white | 0.6 |
| 14.00, 118.40, -22.02 | Villa/render_white | 0.6 |
| 14.00, 118.40, -21.54 | Villa/render_white | 0.6 |
| 14.00, 119.04, -21.20 | Villa/render_white | 0.686 |
| 14.00, 119.68, -21.20 | Villa/render_white | 0.686 |
| 14.00, 120.32, -21.20 | Villa/render_white | 0.686 |
| 14.00, 120.96, -21.20 | Villa/render_white | 0.686 |
| 14.00, 121.60, -21.20 | Villa/render_white | 0.686 |
| 14.00, 122.24, -21.20 | Villa/render_white | 0.686 |
| 14.00, 122.88, -21.20 | Villa/render_white | 0.686 |
| 14.00, 123.52, -21.20 | Villa/render_white | 0.686 |
| 14.00, 124.16, -21.20 | Villa/render_white | 0.686 |
| 14.00, 124.80, -21.20 | Villa/render_white | 0.686 |
| 14.00, 125.38, -21.20 | Villa/render_white | 0.686 |
| 14.00, 125.26, -21.20 | Villa/render_white | 0.575 |
| 14.00, 125.26, -19.90 | Villa/render_white | 0.575 |
| 14.00, 118.40, -19.58 | Villa/render_white | 0.7 |
| 14.00, 119.04, -19.90 | Villa/render_white | 0.686 |
| 14.00, 119.68, -19.90 | Villa/render_white | 0.686 |
| 14.00, 120.32, -19.90 | Villa/render_white | 0.686 |
| 14.00, 120.96, -19.90 | Villa/render_white | 0.686 |
| 14.00, 121.60, -19.90 | Villa/render_white | 0.686 |
| 14.00, 122.24, -19.90 | Villa/render_white | 0.686 |
| 14.00, 122.88, -19.90 | Villa/render_white | 0.686 |
| 14.00, 123.52, -19.90 | Villa/render_white | 0.686 |
| 14.00, 124.16, -19.90 | Villa/render_white | 0.686 |
| 14.00, 124.80, -19.90 | Villa/render_white | 0.686 |
| 14.00, 125.38, -19.90 | Villa/render_white | 0.686 |
| 14.00, 118.40, -19.09 | Villa/render_white | 0.7 |
| 14.00, 118.40, -18.12 | Villa/render_white | 0.7 |
| 14.00, 118.40, -17.63 | Villa/render_white | 0.7 |
| 14.00, 118.40, -16.65 | Villa/render_white | 0.7 |
| 14.00, 118.40, -16.16 | Villa/render_white | 0.7 |
| 14.00, 118.40, -15.68 | Villa/render_white | 0.7 |
| 14.00, 118.40, -14.70 | Villa/render_white | 0.7 |
| 14.00, 118.40, -14.21 | Villa/render_white | 0.7 |
| 14.00, 118.40, -13.23 | Villa/render_white | 0.7 |
| 14.00, 118.40, -12.74 | Villa/render_white | 0.7 |
| 14.00, 118.40, -11.77 | Villa/render_white | 0.7 |
| 14.00, 118.40, -11.28 | Villa/render_white | 0.7 |

(3325 more in the JSON)

## seam (info, 898)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 14.00, 122.00, -7.30 | Villa/render_white + Villa/concrete_soffit | 29.11 | 88 | 90 |
| 12.10, 123.00, -5.55 | Villa/wood_cladding + Villa/metal_dark | 26.96 | 81 | 45 |
| 12.10, 125.00, -5.73 | Villa/wood_cladding + Villa/metal_dark | 26.96 | 81 | 45 |
| 12.00, 122.00, -5.95 | Villa/wood_cladding + Villa/concrete_soffit | 27 | 78 | 90 |
| 12.15, 124.00, -6.00 | Villa/wood_cladding + Villa/glass_window | 52.56 | 76 | 90 |
| 37.50, 122.00, 0.20 | Villa/wood_cladding + Villa/concrete_soffit | 21.84 | 64 | 90 |
| 37.40, 122.40, 0.27 | Villa/wood_cladding + Villa/metal_dark | 20.43 | 63 | 45 |
| 14.68, 122.00, 23.00 | Villa/render_white + Villa/concrete_soffit | 20.73 | 62 | 90 |
| 37.35, 123.30, 0.00 | Villa/wood_cladding + Villa/glass_window | 40.45 | 60 | 90 |
| 37.36, 125.40, 0.06 | Villa/wood_cladding + Villa/metal_dark | 19.07 | 59 | 45 |
| 35.85, 119.42, -22.70 | Villa/render_white + Villa/glass_window | 37.21 | 54 | 90 |
| 35.85, 119.29, 8.00 | Villa/render_white + Villa/glass_window | 31.46 | 48 | 90 |
| 35.90, 118.40, 8.26 | Villa/render_white + Villa/metal_dark | 14.66 | 47 | 45 |
| 12.30, 126.00, -4.80 | Villa/render_white + Villa/concrete_soffit | 88.49 | 46 | 90 |
| 35.90, 118.40, -22.43 | Villa/render_white + Villa/metal_dark | 14.51 | 45 | 45 |
| 36.00, 122.00, 8.05 | Villa/render_white + Villa/concrete_soffit | 14.7 | 43 | 90 |
| 35.90, 118.40, -7.58 | Villa/render_white + Villa/metal_dark | 12.71 | 41 | 45 |
| 14.04, 122.00, 23.50 | Villa/wood_cladding + Villa/concrete_soffit | 14 | 41 | 90 |
| 12.00, 126.30, -5.65 | Villa/wood_cladding + Villa/metal_dark | 27 | 39 | 90 |
| 35.85, 119.29, 4.90 | Villa/render_white + Villa/glass_window | 25.18 | 38 | 90 |
| 36.00, 122.00, -7.58 | Villa/render_white + Villa/concrete_soffit | 12.75 | 37 | 90 |
| 45.21, 117.59, -1.00 | Villa/stone_blue + Villa/stone_blue | 9.73 | 36 | 16.4 |
| 45.57, 117.50, -1.00 | Villa/stone_blue + Villa/stone_blue | 8.74 | 34 | 22.1 |
| 37.50, 126.30, 0.34 | Villa/wood_cladding + Villa/metal_dark | 23.19 | 34 | 90 |
| 14.34, 126.30, -8.00 | Villa/wood_cladding + Villa/metal_dark | 22 | 32 | 90 |
| 14.10, 118.70, 12.44 | Villa/render_white + Villa/metal_dark | 9.46 | 31 | 45 |
| 14.10, 121.40, 12.27 | Villa/render_white + Villa/metal_dark | 9.46 | 31 | 45 |
| 14.10, 118.62, -21.20 | Villa/render_white + Villa/metal_dark | 6.77 | 31 | 45 |
| 14.10, 118.82, -19.90 | Villa/render_white + Villa/metal_dark | 6.77 | 31 | 45 |
| 35.90, 118.84, -22.70 | Villa/render_white + Villa/metal_dark | 7.17 | 31 | 45 |
| 24.06, 118.70, 22.86 | Villa/render_white + Villa/metal_dark | 8.96 | 29 | 45 |
| 24.06, 121.40, 22.87 | Villa/render_white + Villa/metal_dark | 8.96 | 29 | 45 |
| 14.15, 119.71, 12.00 | Villa/render_white + Villa/glass_window | 18.99 | 28 | 90 |
| 24.00, 119.71, 22.85 | Villa/render_white + Villa/glass_window | 17.93 | 26 | 90 |
| 14.00, 118.05, 18.26 | Villa/stone_blue + Villa/concrete_soffit | 4.6 | 26 | 90 |
| 38.15, 118.40, -14.95 | Villa/stone_blue + Villa/stone_blue | 15.92 | 26 | 90 |
| 43.35, 118.40, -14.95 | Villa/stone_blue + Villa/stone_blue | 15.92 | 26 | 90 |
| 12.00, 126.30, 23.35 | Villa/wood_cladding + Villa/metal_dark | 16.29 | 25 | 90 |
| 57.12, 118.36, 15.00 | Villa/hedge + Villa/hedge | 7 | 24 | 44.7 |
| 44.55, 122.03, -33.88 | Villa/hedge + Villa/hedge | 6.45 | 23 | 22.5 |

(858 more in the JSON)

## opening (info, 1576)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 125.90, -21.20 | Villa/render_white | -1 + 0 + 0 | 0.575 |
| 14.00, 125.42, -19.90 | Villa/render_white | -1 + 0 + 0 | 0.575 |
| 14.00, 118.45, -8.00 | Villa/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 118.45, 12.00 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.45, 21.50 | Villa/render_white | -1 + 0 + 0 | 0.3 |
| 28.00, 118.44, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.45 |
| 33.00, 118.81, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.45 |
| 28.00, 125.90, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.644 |
| 33.00, 125.36, -23.00 | Villa/render_white | 0 + 0 + -1 | 0.644 |
| 24.00, 118.45, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 33.00, 118.45, 23.00 | Villa/render_white | 0 + 0 + 1 | 0.3 |
| 36.00, 118.40, -22.95 | Villa/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 125.90, -22.70 | Villa/render_white | 1 + 0 + 0 | 0.375 |
| 36.00, 125.62, -8.15 | Villa/render_white | 1 + 0 + 0 | 0.375 |
| 36.00, 118.45, -8.00 | Villa/render_white | 1 + 0 + 0 | 0.6 |
| 36.00, 121.97, -7.85 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 4.90 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 5.00 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 7.90 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 8.00 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 22.70 | Villa/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 118.40, 22.95 | Villa/render_white | 1 + 0 + 0 | 0.3 |
| 14.00, 118.45, -21.20 | Villa/render_white | 0 + 0 + 1 | 0.64 |
| 14.00, 118.45, -19.90 | Villa/render_white | 0 + 0 + -1 | 0.64 |
| 36.00, 118.45, -22.70 | Villa/render_white | 0 + 0 + 1 | 0.68 |
| 36.00, 118.45, -8.15 | Villa/render_white | 0 + 0 + -1 | 0.68 |
| 36.00, 118.45, -7.85 | Villa/render_white | 0 + 0 + 1 | 0.592 |
| 36.00, 118.45, 4.90 | Villa/render_white | 0 + 0 + -1 | 0.592 |
| 36.00, 118.40, 0.25 | Villa/render_white | 0 + 1 + 0 | 0.671 |
| 36.00, 118.40, 0.92 | Villa/render_white | 0 + 1 + 0 | 0.671 |
| 36.00, 118.45, 5.00 | Villa/render_white | 0 + 0 + 1 | 0.592 |
| 36.00, 118.45, 7.90 | Villa/render_white | 0 + 0 + -1 | 0.592 |
| 36.00, 118.40, 5.05 | Villa/render_white | 0 + 1 + 0 | 0.58 |
| 36.00, 118.45, 8.00 | Villa/render_white | 0 + 0 + 1 | 0.592 |
| 36.00, 118.45, 22.70 | Villa/render_white | 0 + 0 + -1 | 0.592 |
| 14.05, 115.33, 18.00 | Villa/render_white | 0 + 0 + 1 | 0.458 |
| 14.50, 115.33, 18.00 | Villa/render_white | 0 + 0 + 1 | 0.458 |
| 14.92, 117.42, 18.00 | Villa/render_white | 0 + 0 + 1 | 0.681 |
| 14.96, 115.29, 18.00 | Villa/render_white | 0 + 0 + 1 | 0.458 |
| 15.42, 115.29, 18.00 | Villa/render_white | 0 + 0 + 1 | 0.458 |

(1536 more in the JSON)

## backtoback (info, 3065)

| at | parts | area |
|---|---|---|
| 14.13, 118.66, 4.50 | Villa/render_white + Villa/metal_dark | 0.02318 |
| 14.12, 118.94, 4.50 | Villa/render_white + Villa/metal_dark | 0.00423 |
| 14.13, 119.25, 4.50 | Villa/render_white + Villa/metal_dark | 0.02337 |
| 14.12, 119.54, 4.50 | Villa/render_white + Villa/metal_dark | 0.00423 |
| 14.15, 120.09, 4.50 | Villa/render_white + Villa/metal_dark | 0.00123 |
| 14.13, 119.86, 4.50 | Villa/render_white + Villa/metal_dark | 0.02214 |
| 14.14, 120.19, 4.50 | Villa/render_white + Villa/metal_dark | 0.00015 |
| 14.12, 120.15, 4.50 | Villa/render_white + Villa/metal_dark | 0.00408 |
| 14.14, 120.47, 4.50 | Villa/render_white + Villa/metal_dark | 0.00971 |
| 14.12, 120.43, 4.50 | Villa/render_white + Villa/metal_dark | 0.01366 |
| 14.13, 120.77, 4.50 | Villa/render_white + Villa/metal_dark | 0.00136 |
| 14.11, 120.73, 4.50 | Villa/render_white + Villa/metal_dark | 0.00287 |
| 14.14, 121.13, 4.50 | Villa/render_white + Villa/metal_dark | 0.01835 |
| 14.11, 121.01, 4.50 | Villa/render_white + Villa/metal_dark | 0.00502 |
| 14.12, 121.34, 4.50 | Villa/render_white + Villa/metal_dark | 0.00361 |
| 14.11, 121.28, 4.50 | Villa/render_white + Villa/metal_dark | 0.00044 |
| 14.11, 118.79, 5.50 | Villa/render_white + Villa/metal_dark | 0.00502 |
| 14.14, 118.67, 5.50 | Villa/render_white + Villa/metal_dark | 0.01835 |
| 14.11, 118.52, 5.50 | Villa/render_white + Villa/metal_dark | 0.00044 |
| 14.12, 118.46, 5.50 | Villa/render_white + Villa/metal_dark | 0.00361 |
| 14.12, 119.37, 5.50 | Villa/render_white + Villa/metal_dark | 0.01366 |
| 14.14, 119.33, 5.50 | Villa/render_white + Villa/metal_dark | 0.00971 |
| 14.11, 119.07, 5.50 | Villa/render_white + Villa/metal_dark | 0.00287 |
| 14.13, 119.03, 5.50 | Villa/render_white + Villa/metal_dark | 0.00136 |
| 14.13, 119.94, 5.50 | Villa/render_white + Villa/metal_dark | 0.02214 |
| 14.15, 119.71, 5.50 | Villa/render_white + Villa/metal_dark | 0.00123 |
| 14.12, 119.65, 5.50 | Villa/render_white + Villa/metal_dark | 0.00408 |
| 14.14, 119.61, 5.50 | Villa/render_white + Villa/metal_dark | 0.00015 |
| 14.13, 120.55, 5.50 | Villa/render_white + Villa/metal_dark | 0.02337 |
| 14.12, 120.26, 5.50 | Villa/render_white + Villa/metal_dark | 0.00423 |
| 14.13, 121.14, 5.50 | Villa/render_white + Villa/metal_dark | 0.02318 |
| 14.12, 120.86, 5.50 | Villa/render_white + Villa/metal_dark | 0.00423 |
| 14.14, 118.40, 4.54 | Villa/render_white + Villa/metal_dark | 0.00031 |
| 14.15, 118.40, 4.52 | Villa/render_white + Villa/metal_dark | 0.00016 |
| 14.13, 118.40, 4.80 | Villa/render_white + Villa/metal_dark | 0.01886 |
| 14.13, 118.40, 4.55 | Villa/render_white + Villa/metal_dark | 0.00029 |
| 14.12, 118.40, 4.53 | Villa/render_white + Villa/metal_dark | 0.00163 |
| 14.11, 118.40, 4.59 | Villa/render_white + Villa/metal_dark | 0.0012 |
| 14.13, 118.40, 5.29 | Villa/render_white + Villa/metal_dark | 0.01003 |
| 14.13, 118.40, 5.15 | Villa/render_white + Villa/metal_dark | 0.0065 |

(3025 more in the JSON)


Nodes: Villa, Villa_gateL, Villa_gateR, Villa_door, Villa_water. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
