# Mesh audit (packed): villa.lod1

16,005 triangles, 10,684 welded vertices, 2,694 open edges, 651,452 rays, 7188 ms.

**7683 blocking**, 5722 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 18 |
| depth | block | 3 |
| crossing | block | 2 |
| leak | block | 27 |
| flipped | block | 7 |
| streak | block | 6379 |
| bentflat | block | 1247 |
| near | warn | 3 |
| sliver | warn | 5345 |
| nonmanifold | warn | 70 |
| tjunction | warn | 301 |
| degenerate | warn | 3 |
| seam | info | 258 |
| opening | info | 1137 |
| backtoback | info | 391 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 18)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 25.55, 121.55, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 0.7 | 0 | 260 | 2.43 | true | 0 + 0 + 1 |
| 26.25, 121.85, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 0.7 | 0 | 260 | 2.43 | true | 0 + 0 + 1 |
| 14.13, 118.41, -11.40 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0 | 4.5 | 0 | 260 | 2.43 | false | 0 + 0 + 1 |
| 35.88, 118.41, -7.85 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0 | 3.4 | 2.5 | 260 | 2.43 | false | 0 + 0 + -1 |
| 43.16, 118.41, -14.96 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 8.4 | 0.7 | 260 | 2.43 | false | 0 + 1 + 0 |
| 38.34, 118.37, 0.96 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 9.2 | 0 | 260 | 2.43 | false | 0 + -1 + 0 |
| 38.34, 118.39, 0.96 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 0.4 | 0.9 | 260 | 2.43 | true | 0 + 0 + 1 |
| 44.85, 117.69, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 20.7 | 3.6 | 260 | 2.43 | false | -0.67 + 0 + 0.74 |
| 45.22, 117.88, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 0.8 | 0 | 260 | 2.43 | false | 0 + 0 + -1 |
| 45.22, 117.51, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 35.1 | 1.3 | 260 | 2.43 | false | 0 + 0 + -1 |
| 45.21, 117.88, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 3.1 | 1.5 | 260 | 2.43 | false | 0.03 + 0 + -1 |
| 45.21, 117.52, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 81.2 | 0.8 | 260 | 2.43 | false | 0.03 + 0 + -1 |
| 45.21, 117.59, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 24.5 | 1.8 | 260 | 2.43 | false | -0.03 + 0.01 + 1 |
| 45.57, 117.51, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 16.8 | 1 | 260 | 2.43 | false | 0.01 + 0 + 1 |
| 14.10, 118.73, 12.06 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1 | 0 | 260 | 2.43 | false | -1 + 0 + 0 |
| 14.20, 118.73, 12.06 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.7 | 0 | 260 | 2.43 | false | 1 + 0 + 0 |
| 14.10, 124.77, -19.96 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.1 | 3.8 | 260 | 2.43 | false | -1 + 0 + -0.07 |
| 37.36, 126.31, -7.70 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 9 | 0 | 260 | 2.43 | false | 0 + -1 + 0 |

## depth (block, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 14.13, 118.41, 5.50 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.2 | 3.1 | 3.7 | 260 | 2.43 | false | -0.02 + 0 + 1 |
| 35.88, 118.41, 7.89 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.04 | 2 | 1.1 | 260 | 2.43 | false | 0.02 + 0 + 1 |
| 35.88, 118.41, 8.00 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.16 | 1.7 | 2.3 | 260 | 2.43 | false | 0 + 0 + -1 |

## crossing (block, 2)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 35.90, 118.41, -7.85 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 6.3 | 0 |
| 38.43, 118.40, 0.96 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7 | 0.4 |

## leak (block, 27)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 37.20, 126.30, 15.25 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 30.9 |
| 18.55, 126.30, -7.70 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 24.899 |
| 18.55, 126.30, 23.20 | Villa_lod1/render_white | 4 | 0 + 0 + -1 | 24.899 |
| 14.30, 125.95, -18.85 | Villa_lod1/render_white | 4 | 1 + 0 + 0 | 14.7 |
| 9.75, 118.68, -34.00 | Villa_lod1/render_white | 4 | 0 + 0 + -1 | 0.2 |
| 9.75, 118.68, -20.00 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.2 |
| 9.85, 118.68, -20.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.1 |
| 9.65, 117.85, -6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.2 |
| 9.85, 117.85, -6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.1 |
| 9.75, 117.46, -0.80 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.2 |
| 9.85, 117.46, -0.80 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.1 |
| 9.65, 117.23, 6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.2 |
| 9.85, 117.23, 6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.1 |
| 9.90, 117.04, 11.25 | Villa_lod1/render_white | 4 | 1 + 0 + 0 | 7.3 |
| 9.90, 117.04, 13.35 | Villa_lod1/render_white | 4 | 1 + 0 + 0 | 3.4 |
| 14.00, 118.35, 9.10 | Villa_lod1/stone_blue | 4 | -1 + 0 + 0 | 0.301 |
| 35.85, 118.40, -23.00 | Villa_lod1/stone_blue | 4 | 0 + 0 + -1 | 2.4 |
| 37.50, 126.30, 2.15 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 1.4 |
| 37.50, 126.30, 2.85 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.7 |
| 37.50, 126.30, 3.55 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 6.3 |
| 37.50, 126.30, 9.85 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 3.5 |
| 37.50, 126.30, 13.35 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.8 |
| 18.55, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 9.7 |
| 21.75, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 7 |
| 28.75, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 5.3 |
| 37.35, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.4 |
| 18.55, 126.30, -8.00 | Villa_lod1/wood_cladding | 4 | 0 + 0 + -1 | 22 |

## flipped (block, 7)

| at | part | dot | area |
|---|---|---|---|
| 25.90, 121.70, 23.00 | Villa_lod1/render_white | -1 | 0.00015 |
| 13.40, 117.88, 9.60 | Villa_lod1/stone_blue | -0.53 | 0.00613 |
| 12.80, 116.01, 11.10 | Villa_lod1/stone_blue | -0.82 | 0.00702 |
| 13.39, 115.95, 11.71 | Villa_lod1/stone_blue | -0.92 | 0.00665 |
| 41.62, 118.40, -14.96 | Villa_lod1/stone_blue | -0.61 | 0.12752 |
| 9.47, 117.04, 23.51 | Villa_lod1/glow | -0.56 | 0.00147 |
| 9.47, 117.07, 23.50 | Villa_lod1/glow | -0.38 | 0.0017 |

## streak (block, 6379)

| at | part | why | deg | area | spread | aspect | longest |
|---|---|---|---|---|---|---|---|
| 35.95, 121.88, 7.90 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0225 |  |  |  |
| 35.95, 121.97, 6.93 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 18 | 2.9 |
| 35.95, 121.88, 22.70 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0225 |  |  |  |
| 19.57, 115.14, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0186 |  |  |  |
| 19.57, 115.50, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0348 |  |  |  |
| 19.57, 115.96, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0349 |  |  |  |
| 19.57, 116.43, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0349 |  |  |  |
| 19.53, 116.85, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1525 |  |  |  |
| 29.80, 114.83, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0003 |  |  |  |
| 29.60, 115.02, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1713 |  |  |  |
| 29.60, 115.44, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.2098 |  |  |  |
| 29.60, 115.91, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.2099 |  |  |  |
| 29.80, 116.56, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.9654 |  |  |  |
| 30.00, 115.28, 21.90 | Villa_lod1/render_white | corner normal faces away | 90 | 0.012 |  |  |  |
| 30.00, 115.33, 21.80 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0213 |  |  |  |
| 30.00, 115.61, 21.90 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1142 |  |  |  |
| 11.66, 117.10, 5.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 419 | 3.37 |
| 11.81, 118.22, 5.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 14 | 3.37 |
| 11.74, 117.10, 5.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 14 | 3.37 |
| 11.74, 118.22, 8.99 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 15 | 3.38 |
| 11.81, 117.10, 8.99 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 14 | 3.38 |
| 11.74, 119.34, 7.83 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 15 | 3.5 |
| 11.81, 119.34, 6.66 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 15 | 3.5 |
| 11.66, 115.97, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 38 | 0.29 |
| 11.66, 117.04, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 411 | 3.2 |
| 12.02, 115.97, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 69 | 0.54 |
| 12.02, 118.11, 9.00 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 6 | 3.24 |
| 11.84, 117.04, 9.00 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 6 | 3.24 |
| 11.66, 117.04, 9.20 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 3.21 |
| 11.66, 118.11, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 3.21 |
| 11.84, 118.11, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 6 | 3.24 |
| 12.02, 117.04, 9.29 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 6 | 3.24 |
| 12.20, 118.10, 9.20 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 11 | 3.21 |
| 12.20, 117.04, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 11 | 3.21 |
| 11.65, 116.97, 9.60 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 366 | 3.04 |
| 12.19, 115.96, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 38 | 0.29 |
| 11.65, 116.97, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.05 |
| 11.65, 117.99, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 3.05 |
| 12.19, 117.99, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 10 | 3.05 |
| 12.19, 116.97, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 10 | 3.05 |

(6339 more in the JSON)

## bentflat (block, 1247)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 11.66, 117.10, 7.83 | Villa_lod1/render_white | 45 | 5.8625 | 11.77 |
| 11.66, 118.22, 6.67 | Villa_lod1/render_white | 45 | 5.8892 | 11.77 |
| 11.89, 118.22, 7.83 | Villa_lod1/render_white | 45 | 5.8897 | 11.75 |
| 11.89, 117.10, 6.67 | Villa_lod1/render_white | 45 | 5.8625 | 11.75 |
| 12.01, 117.99, 9.30 | Villa_lod1/render_white | 45.1 | 0.8109 | 1.62 |
| 11.84, 116.97, 9.31 | Villa_lod1/render_white | 45 | 0.8132 | 1.62 |
| 11.83, 117.99, 9.60 | Villa_lod1/render_white | 44.1 | 0.8214 | 1.63 |
| 12.01, 117.87, 9.61 | Villa_lod1/render_white | 45 | 0.7912 | 1.56 |
| 11.83, 116.91, 9.61 | Villa_lod1/render_white | 45.8 | 0.7651 | 1.56 |
| 11.83, 117.87, 9.89 | Villa_lod1/render_white | 45 | 0.7889 | 1.57 |
| 12.01, 116.91, 9.89 | Villa_lod1/render_white | 45 | 0.7793 | 1.57 |
| 12.01, 117.75, 9.90 | Villa_lod1/render_white | 45 | 0.7261 | 1.45 |
| 11.84, 116.85, 9.90 | Villa_lod1/render_white | 45 | 0.7217 | 1.45 |
| 11.84, 117.75, 10.20 | Villa_lod1/render_white | 45 | 0.744 | 1.47 |
| 12.02, 116.85, 10.20 | Villa_lod1/render_white | 45 | 0.7216 | 1.47 |
| 12.01, 117.64, 10.20 | Villa_lod1/render_white | 45 | 0.6783 | 1.36 |
| 11.84, 116.79, 10.21 | Villa_lod1/render_white | 45 | 0.6826 | 1.36 |
| 11.84, 117.64, 10.49 | Villa_lod1/render_white | 44.8 | 0.6803 | 1.36 |
| 12.01, 116.79, 10.49 | Villa_lod1/render_white | 45 | 0.6826 | 1.36 |
| 12.01, 117.52, 10.51 | Villa_lod1/render_white | 45 | 0.6567 | 1.29 |
| 11.83, 116.72, 10.51 | Villa_lod1/render_white | 45.8 | 0.6348 | 1.29 |
| 11.84, 117.52, 10.80 | Villa_lod1/render_white | 45 | 0.6349 | 1.27 |
| 12.01, 116.73, 10.80 | Villa_lod1/render_white | 44.8 | 0.6369 | 1.27 |
| 11.84, 116.66, 10.80 | Villa_lod1/render_white | 44.8 | 0.5938 | 1.19 |
| 11.84, 117.40, 11.10 | Villa_lod1/render_white | 45 | 0.5917 | 1.19 |
| 12.01, 116.66, 11.10 | Villa_lod1/render_white | 45 | 0.5959 | 1.19 |
| 12.01, 117.28, 11.10 | Villa_lod1/render_white | 44.1 | 0.5587 | 1.11 |
| 11.83, 116.59, 11.10 | Villa_lod1/render_white | 45 | 0.5501 | 1.11 |
| 11.84, 117.28, 11.40 | Villa_lod1/render_white | 44.8 | 0.5523 | 0.55 |
| 12.02, 116.59, 11.40 | Villa_lod1/render_white | 44.1 | 0.5587 | 0.56 |
| 12.02, 117.16, 11.40 | Villa_lod1/render_white | 44.1 | 0.517 | 0.52 |
| 11.84, 116.52, 11.40 | Villa_lod1/render_white | 44.7 | 0.5112 | 0.51 |
| 11.84, 117.16, 11.69 | Villa_lod1/render_white | 45 | 0.5191 | 1.04 |
| 12.01, 116.52, 11.70 | Villa_lod1/render_white | 45.8 | 0.517 | 1.04 |
| 12.01, 117.04, 11.71 | Villa_lod1/render_white | 45 | 0.4799 | 0.95 |
| 11.83, 116.45, 11.71 | Villa_lod1/render_white | 45 | 0.4705 | 0.95 |
| 11.84, 117.04, 11.99 | Villa_lod1/render_white | 45 | 0.4726 | 0.94 |
| 12.01, 116.45, 11.99 | Villa_lod1/render_white | 44.7 | 0.4705 | 0.94 |
| 14.80, 118.30, 5.90 | Villa_lod1/stone_blue | 44.8 | 0.1775 | 0.35 |
| 14.40, 118.20, 5.90 | Villa_lod1/stone_blue | 45 | 0.1752 | 0.35 |

(1207 more in the JSON)

## near (warn, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 14.13, 118.41, -16.99 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.8 | 5.8 | 3.6 | 260 | 2.43 | false | 0.02 + 0 + -1 |
| 35.88, 118.41, -22.69 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.87 | 2 | 1.3 | 260 | 2.43 | false | -0.02 + 0 + -1 |
| 35.87, 118.41, -22.69 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.87 | 4.8 | 1.3 | 260 | 2.43 | false | -0.02 + 0 + -1 |

## sliver (warn, 5345)

| at | part | aspect | longest |
|---|---|---|---|
| 34.00, 121.07, -23.00 | Villa_lod1/render_white | 49 | 8.124 |
| 25.90, 121.70, 23.00 | Villa_lod1/render_white | 7917 | 1.522 |
| 36.00, 125.93, -17.83 | Villa_lod1/render_white | 161 | 8 |
| 36.00, 125.93, -10.60 | Villa_lod1/render_white | 135 | 6.7 |
| 36.00, 125.92, -11.20 | Villa_lod1/render_white | 900 | 5.6 |
| 36.00, 121.97, -3.60 | Villa_lod1/render_white | 256 | 12.75 |
| 36.00, 121.98, 0.65 | Villa_lod1/render_white | 256 | 12.75 |
| 36.00, 121.98, 5.97 | Villa_lod1/render_white | 58 | 2.9 |
| 36.00, 120.77, 7.93 | Villa_lod1/render_white | 63 | 2.103 |
| 36.00, 121.98, 12.90 | Villa_lod1/render_white | 295 | 14.7 |
| 36.00, 121.97, 17.70 | Villa_lod1/render_white | 301 | 14.7 |
| 14.05, 118.70, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.10, 118.70, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 121.40, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.10, 121.40, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 120.53, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -17.00 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -17.00 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -15.80 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -15.80 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -12.60 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -12.60 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -11.40 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -11.40 | Villa_lod1/render_white | 43 | 6.401 |
| 35.95, 120.67, -22.70 | Villa_lod1/render_white | 45 | 6.801 |
| 35.90, 122.93, -22.70 | Villa_lod1/render_white | 45 | 6.801 |
| 35.95, 119.90, -8.15 | Villa_lod1/render_white | 64 | 2.604 |
| 35.95, 120.37, -8.15 | Villa_lod1/render_white | 104 | 3.303 |
| 35.95, 121.77, -8.15 | Villa_lod1/render_white | 88 | 6.801 |
| 35.90, 122.93, -8.15 | Villa_lod1/render_white | 45 | 6.801 |
| 35.90, 125.20, -20.63 | Villa_lod1/render_white | 69 | 3.803 |
| 35.95, 125.20, -18.53 | Villa_lod1/render_white | 58 | 8.7 |
| 35.90, 125.20, -16.80 | Villa_lod1/render_white | 114 | 4.903 |
| 35.90, 125.20, -11.20 | Villa_lod1/render_white | 114 | 4.902 |
| 35.90, 125.20, -10.27 | Villa_lod1/render_white | 58 | 3.503 |
| 35.95, 125.20, -9.02 | Villa_lod1/render_white | 147 | 2.355 |
| 35.95, 120.07, 4.90 | Villa_lod1/render_white | 42 | 2.105 |

(5305 more in the JSON)

## nonmanifold (warn, 70)

| at | part | uses |
|---|---|---|
| 36.00, 117.95, -17.00 | Villa_lod1/stone_blue | 3 |
| 36.00, 117.95, 16.00 | Villa_lod1/stone_blue | 3 |
| 13.10, 117.88, 9.60 | Villa_lod1/stone_blue | 4 |
| 13.10, 115.95, 11.71 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, -14.96 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, 0.97 | Villa_lod1/stone_blue | 4 |
| 44.85, 117.75, 4.99 | Villa_lod1/stone_blue | 4 |
| 14.15, 118.40, 4.56 | Villa_lod1/metal_dark | 4 |
| 14.15, 121.40, 4.56 | Villa_lod1/metal_dark | 4 |
| 14.15, 121.40, 5.44 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, 5.44 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.70, 12.06 | Villa_lod1/metal_dark | 4 |
| 14.15, 121.40, 12.06 | Villa_lod1/metal_dark | 4 |
| 14.15, 121.40, 21.44 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.70, 21.44 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -21.14 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -21.14 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -19.96 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -19.96 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -16.94 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -16.94 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -15.86 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -15.86 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -12.54 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -12.54 | Villa_lod1/metal_dark | 4 |
| 14.15, 124.80, -11.46 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, -11.46 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, -22.64 | Villa_lod1/metal_dark | 4 |
| 35.85, 125.20, -22.64 | Villa_lod1/metal_dark | 4 |
| 35.85, 125.20, -8.21 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, -8.21 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, -7.79 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, -7.79 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 4.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 4.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 5.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 5.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 7.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 7.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 8.06 | Villa_lod1/metal_dark | 4 |

(30 more in the JSON)

## tjunction (warn, 301)

| at | part | edge_m |
|---|---|---|
| 14.00, 118.40, -8.40 | Villa_lod1/render_white | 15.9 |
| 14.00, 122.00, -7.00 | Villa_lod1/render_white | 13.9 |
| 14.00, 121.80, 5.90 | Villa_lod1/render_white | 3.6 |
| 14.00, 122.00, 7.70 | Villa_lod1/render_white | 3.2 |
| 14.00, 121.80, 9.10 | Villa_lod1/render_white | 0.3 |
| 14.00, 118.40, 12.60 | Villa_lod1/render_white | 9.5 |
| 14.00, 122.00, 12.60 | Villa_lod1/render_white | 2.8 |
| 14.00, 121.40, 21.50 | Villa_lod1/render_white | 0.7 |
| 14.00, 122.00, 20.30 | Villa_lod1/render_white | 9 |
| 30.80, 118.40, -23.00 | Villa_lod1/render_white | 5 |
| 33.60, 118.40, -23.00 | Villa_lod1/render_white | 3 |
| 14.70, 118.40, 23.00 | Villa_lod1/render_white | 1.4 |
| 22.40, 122.00, 23.00 | Villa_lod1/render_white | 3.7 |
| 24.00, 121.40, 23.00 | Villa_lod1/render_white | 0.7 |
| 32.90, 118.40, 23.00 | Villa_lod1/render_white | 0.801 |
| 33.00, 118.70, 23.00 | Villa_lod1/render_white | 0.5 |
| 36.00, 122.00, -7.70 | Villa_lod1/render_white | 12.75 |
| 36.00, 121.95, 5.00 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, 6.30 | Villa_lod1/render_white | 2.9 |
| 36.00, 121.95, 8.00 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, 8.40 | Villa_lod1/render_white | 14.7 |
| 12.30, 126.00, -4.00 | Villa_lod1/render_white | 30.9 |
| 37.20, 126.00, -6.00 | Villa_lod1/render_white | 30.9 |
| 14.00, 126.00, -7.70 | Villa_lod1/render_white | 24.899 |
| 14.00, 126.00, 23.20 | Villa_lod1/render_white | 24.899 |
| 14.30, 125.70, -22.00 | Villa_lod1/render_white | 14.7 |
| 35.70, 125.70, -22.00 | Villa_lod1/render_white | 14.7 |
| 22.00, 125.70, -22.70 | Villa_lod1/render_white | 21.399 |
| 14.00, 115.31, 18.30 | Villa_lod1/render_white | 0.172 |
| 14.00, 116.10, 18.30 | Villa_lod1/render_white | 1.4 |
| 14.00, 118.00, 18.30 | Villa_lod1/render_white | 0.55 |
| 14.70, 115.23, 18.30 | Villa_lod1/render_white | 0.207 |
| 15.40, 115.19, 18.30 | Villa_lod1/render_white | 0.252 |
| 17.50, 115.05, 18.30 | Villa_lod1/render_white | 0.399 |
| 18.90, 114.97, 18.30 | Villa_lod1/render_white | 0.454 |
| 19.50, 114.94, 18.20 | Villa_lod1/render_white | 0.457 |
| 19.50, 114.95, 17.50 | Villa_lod1/render_white | 0.457 |
| 19.50, 114.95, 18.30 | Villa_lod1/render_white | 0.455 |
| 19.60, 115.03, 16.30 | Villa_lod1/render_white | 0.527 |
| 20.30, 114.87, 16.30 | Villa_lod1/render_white | 0.558 |

(261 more in the JSON)

## degenerate (warn, 3)

| at | part | edge |
|---|---|---|
| 30.00, 115.40, 21.00 | Villa_lod1/render_white | 1.4004 |
| 25.03, 118.20, 23.00 | Villa_lod1/stone_blue | 1.9004 |
| 14.30, 125.70, -21.57 | Villa_lod1/concrete_soffit | 2.7002 |

## seam (info, 258)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 36.00, 118.39, -7.84 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 25.56 | 66 | 83.8 |
| 14.00, 122.00, -0.55 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 68.95 | 56 | 90 |
| 36.00, 118.38, -17.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 17.77 | 51 | 82.2 |
| 36.00, 118.38, 8.38 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.08 | 48 | 88.7 |
| 38.15, 118.40, -14.54 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.52 | 44 | 83.3 |
| 12.00, 122.00, 5.95 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 54 | 39 | 90 |
| 38.40, 118.40, -14.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.54 | 31 | 78.4 |
| 12.30, 126.00, 0.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 88 | 28 | 90 |
| 45.57, 117.27, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.42 | 24 | 25.5 |
| 36.00, 118.39, 5.01 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5.86 | 23 | 83.4 |
| 45.21, 117.27, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 13.22 | 22 | 27.1 |
| 15.05, 118.05, 18.30 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 17.6 | 20 | 90 |
| 14.00, 118.38, -11.44 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 1.22 | 19 | 88.6 |
| 43.35, 118.40, -8.02 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.54 | 17 | 82.7 |
| 38.30, 118.40, 0.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.53 | 16 | 76.9 |
| 14.10, 118.42, 5.34 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.88 | 13 | 84.4 |
| 14.10, 118.42, -20.09 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.48 | 13 | 82.7 |
| 14.10, 118.42, -15.99 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.28 | 13 | 81.4 |
| 14.10, 118.42, -11.58 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.27 | 13 | 83.1 |
| 35.85, 118.41, -22.64 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 28.98 | 13 | 80.8 |
| 35.85, 118.40, 2.18 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 25.38 | 13 | 80.6 |
| 35.85, 118.40, 7.32 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 5.69 | 13 | 81.2 |
| 35.85, 118.40, 19.86 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 29.28 | 13 | 83.1 |
| 24.00, 118.70, 22.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.15 | 12 | 89.8 |
| 36.00, 118.38, 16.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.71 | 12 | 90 |
| 35.85, 118.40, -22.65 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.24 | 12 | 81.5 |
| 14.00, 121.88, 5.20 | Villa_lod1/render_white + Villa_lod1/metal_dark | 4.68 | 11 | 90 |
| 14.30, 125.70, -19.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 28 | 11 | 90 |
| 14.10, 118.41, 5.50 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 88.6 |
| 14.10, 118.41, -19.91 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 83.1 |
| 35.90, 118.41, 5.01 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 85.5 |
| 35.90, 118.41, 8.00 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 83.1 |
| 35.85, 118.46, 16.14 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 11 | 90 |
| 32.94, 120.78, -22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 4 | 11 | 87.7 |
| 32.94, 121.40, 22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 17.87 | 11 | 87.1 |
| 37.35, 122.40, 23.20 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.11 | 11 | 87.4 |
| 37.35, 125.34, 7.17 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.86 | 11 | 87.4 |
| 14.10, 118.41, -15.81 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 10 | 87.3 |
| 14.10, 118.41, -11.40 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 10 | 87.7 |
| 35.85, 118.41, -8.21 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 10 | 80.8 |

(218 more in the JSON)

## opening (info, 1137)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 118.40, -22.95 | Villa_lod1/render_white | -1 + 0 + 0 | 1.8 |
| 14.00, 118.40, -19.85 | Villa_lod1/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 118.40, -15.75 | Villa_lod1/render_white | -1 + 0 + 0 | 3.2 |
| 14.00, 118.85, 9.10 | Villa_lod1/render_white | -1 + 0 + 0 | 0.5 |
| 14.00, 118.95, 9.10 | Villa_lod1/render_white | -1 + 0 + 0 | 2.8 |
| 14.00, 118.40, 9.15 | Villa_lod1/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 121.45, 21.50 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.40, 21.55 | Villa_lod1/render_white | -1 + 0 + 0 | 1.5 |
| 14.05, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 9.1 |
| 23.15, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 3.5 |
| 26.65, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 1.4 |
| 16.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 16.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 17.55, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 18.25, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 20.35, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 22.45, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 21.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 1.4 |
| 23.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 23.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.2 |
| 29.45, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 30.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 33.00, 118.65, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 24.00, 121.65, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 33.65, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.701 |
| 33.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.6 |
| 34.35, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 35.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 36.00, 118.40, -22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.97, 5.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 118.40, 22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 14.00, 121.35, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.4 |
| 36.00, 121.74, 5.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.74, 8.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 24.00, 121.05, 23.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.4 |
| 33.00, 118.75, 23.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.2 |
| 35.70, 125.95, -8.05 | Villa_lod1/render_white | -1 + 0 + 0 | 14.7 |
| 24.85, 125.95, -22.70 | Villa_lod1/render_white | 0 + 0 + 1 | 21.399 |
| 14.05, 115.23, 18.30 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |

(1097 more in the JSON)

## backtoback (info, 391)

| at | parts | area |
|---|---|---|
| 14.00, 121.88, 5.41 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.10044 |
| 14.00, 121.76, 5.30 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00034 |
| 14.00, 121.89, 5.72 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04363 |
| 14.00, 121.77, 5.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00449 |
| 14.00, 121.89, 5.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00695 |
| 14.00, 121.77, 5.84 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00139 |
| 14.00, 121.89, 5.84 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00654 |
| 14.00, 121.77, 5.78 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00116 |
| 14.00, 121.89, 5.89 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00264 |
| 14.00, 121.77, 5.89 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00057 |
| 14.00, 121.93, 6.97 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.32033 |
| 14.00, 121.90, 7.93 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.2049 |
| 14.00, 121.83, 8.21 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.11544 |
| 14.00, 121.97, 11.09 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00865 |
| 14.00, 121.85, 10.63 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.17394 |
| 14.00, 121.96, 10.05 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.15767 |
| 14.00, 121.84, 9.63 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.14471 |
| 14.00, 121.97, 11.21 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00204 |
| 14.00, 121.86, 11.25 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.05601 |
| 14.00, 121.98, 11.69 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03049 |
| 14.00, 121.87, 11.99 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.26732 |
| 25.73, 121.63, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00007 |
| 25.90, 121.70, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00015 |
| 26.25, 121.85, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00007 |
| 14.13, 118.61, 4.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01926 |
| 14.12, 119.11, 4.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02108 |
| 14.13, 119.58, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03932 |
| 14.13, 118.90, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03433 |
| 14.12, 120.18, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01827 |
| 14.13, 120.93, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04274 |
| 14.12, 120.48, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00281 |
| 14.13, 121.40, 4.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00179 |
| 14.13, 121.40, 4.51 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00064 |
| 14.13, 121.40, 5.13 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02589 |
| 14.13, 121.40, 4.70 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0101 |
| 14.13, 121.40, 5.47 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00186 |
| 14.14, 121.03, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02852 |
| 14.13, 119.90, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07644 |
| 14.12, 121.36, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00242 |
| 14.11, 121.32, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00022 |

(351 more in the JSON)


Nodes: Villa_lod1. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.443 mm. Offset 0,100,0.
