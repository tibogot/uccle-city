# Mesh audit (packed): villa.lod1

16,006 triangles, 10,595 welded vertices, 2,550 open edges, 651,684 rays, 2526 ms.

**7847 blocking**, 5885 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 12 |
| depth | block | 3 |
| crossing | block | 2 |
| leak | block | 40 |
| flipped | block | 9 |
| streak | block | 6534 |
| bentflat | block | 1247 |
| near | warn | 3 |
| sliver | warn | 5486 |
| nonmanifold | warn | 71 |
| tjunction | warn | 322 |
| degenerate | warn | 3 |
| seam | info | 258 |
| opening | info | 1140 |
| backtoback | info | 417 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 25.55, 121.55, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 0.7 | 0 | 260 | 2.43 | true | 0 + 0 + 1 |
| 26.25, 121.85, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 0.7 | 0 | 260 | 2.43 | true | 0 + 0 + 1 |
| 14.13, 118.41, -11.40 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0 | 4.5 | 0 | 260 | 2.43 | false | 0 + 0 + 1 |
| 35.88, 118.41, -7.85 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0 | 3.4 | 2.5 | 260 | 2.43 | false | 0 + 0 + -1 |
| 43.16, 118.41, -14.96 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 8.4 | 1 | 260 | 2.43 | false | 0 + 1 + -0.01 |
| 45.22, 117.59, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 9.4 | 2.5 | 260 | 2.43 | false | 0.02 + 0.01 + 1 |
| 45.21, 117.59, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0.02 | 50.1 | 0.2 | 260 | 2.43 | false | -0.03 + 0.01 + 1 |
| 45.57, 117.51, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 16.8 | 1 | 260 | 2.43 | false | 0.01 + 0 + 1 |
| 14.10, 118.43, 4.56 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.1 | 0.1 | 260 | 2.43 | false | -1 + 0 + 0 |
| 14.10, 118.73, 12.06 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1 | 0 | 260 | 2.43 | false | -1 + 0 + 0 |
| 14.20, 118.73, 12.06 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.7 | 0 | 260 | 2.43 | false | 1 + 0 + 0 |
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
| 38.44, 118.40, 0.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 10.9 | 0.9 |

## leak (block, 40)

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
| 44.50, 117.85, 5.00 | Villa_lod1/stone_blue | 4 | 1 + 0 + 0 | 0.7 |
| 37.50, 126.30, 2.15 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 1.4 |
| 37.50, 126.30, 2.85 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.7 |
| 37.50, 126.30, 3.55 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.1 |
| 37.50, 126.30, 5.65 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 4.2 |
| 37.50, 126.30, 9.85 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 1.4 |
| 37.50, 126.30, 11.25 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 1.4 |
| 37.50, 126.30, 12.65 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 3.5 |
| 18.55, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 18.95, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.699 |
| 19.65, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 20.35, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 21.05, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 21.75, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 22.45, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 2.1 |
| 24.55, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 25.25, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 25.95, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.699 |
| 26.65, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.7 |
| 27.35, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 1.4 |
| 28.75, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 1.399 |
| 37.35, 126.30, 23.50 | Villa_lod1/wood_cladding | 4 | 0 + 0 + 1 | 0.4 |
| 18.55, 126.30, -8.00 | Villa_lod1/wood_cladding | 4 | 0 + 0 + -1 | 9.1 |
| 29.35, 126.30, -8.00 | Villa_lod1/wood_cladding | 4 | 0 + 0 + -1 | 12.9 |

## flipped (block, 9)

| at | part | dot | area |
|---|---|---|---|
| 25.90, 121.70, 23.00 | Villa_lod1/render_white | -1 | 0.00015 |
| 13.40, 117.88, 9.60 | Villa_lod1/stone_blue | -0.53 | 0.00613 |
| 13.40, 116.01, 10.80 | Villa_lod1/stone_blue | -0.82 | 0.00702 |
| 12.80, 116.01, 11.10 | Villa_lod1/stone_blue | -0.82 | 0.00702 |
| 12.80, 115.97, 11.69 | Villa_lod1/stone_blue | -0.99 | 0.00702 |
| 13.39, 115.95, 11.71 | Villa_lod1/stone_blue | -0.92 | 0.00665 |
| 41.62, 118.40, -14.96 | Villa_lod1/stone_blue | -0.31 | 0.11415 |
| 9.47, 117.04, 23.51 | Villa_lod1/glow | -0.56 | 0.00147 |
| 9.47, 117.07, 23.50 | Villa_lod1/glow | -0.38 | 0.0017 |

## streak (block, 6534)

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
| 29.80, 116.14, 16.30 | Villa_lod1/render_white | corner normal faces away | 90 | 0.8006 |  |  |  |
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
| 12.01, 119.00, 9.60 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 66 | 0.55 |
| 11.65, 116.97, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.05 |
| 11.65, 117.99, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 3.05 |
| 12.20, 117.99, 9.49 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 3.04 |
| 12.20, 116.97, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 11 | 3.04 |
| 11.83, 115.95, 9.89 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 66 | 0.54 |

(6494 more in the JSON)

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
| 11.83, 116.91, 9.61 | Villa_lod1/render_white | 45 | 0.7673 | 1.56 |
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

## sliver (warn, 5486)

| at | part | aspect | longest |
|---|---|---|---|
| 14.00, 125.18, -13.60 | Villa_lod1/render_white | 60 | 9.073 |
| 34.00, 121.07, -23.00 | Villa_lod1/render_white | 49 | 8.124 |
| 25.90, 121.70, 23.00 | Villa_lod1/render_white | 7917 | 1.522 |
| 36.00, 125.93, -20.03 | Villa_lod1/render_white | 167 | 8.3 |
| 36.00, 125.92, -17.73 | Villa_lod1/render_white | 189 | 7.7 |
| 36.00, 125.68, -12.13 | Villa_lod1/render_white | 55 | 6.345 |
| 36.00, 125.93, -10.60 | Villa_lod1/render_white | 135 | 6.7 |
| 36.00, 125.92, -12.37 | Villa_lod1/render_white | 150 | 5.6 |
| 36.00, 121.97, -3.60 | Villa_lod1/render_white | 256 | 12.75 |
| 36.00, 121.98, 0.65 | Villa_lod1/render_white | 256 | 12.75 |
| 36.00, 121.98, 5.97 | Villa_lod1/render_white | 58 | 2.9 |
| 36.00, 119.43, 7.93 | Villa_lod1/render_white | 52 | 1.902 |
| 36.00, 119.90, 7.93 | Villa_lod1/render_white | 97 | 2.602 |
| 36.00, 120.37, 7.93 | Villa_lod1/render_white | 156 | 3.301 |
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
| 35.90, 122.93, -22.70 | Villa_lod1/render_white | 45 | 6.801 |
| 35.95, 120.67, -22.70 | Villa_lod1/render_white | 45 | 6.801 |
| 35.95, 119.90, -8.15 | Villa_lod1/render_white | 64 | 2.604 |
| 35.95, 120.37, -8.15 | Villa_lod1/render_white | 104 | 3.303 |
| 35.90, 121.53, -8.15 | Villa_lod1/render_white | 41 | 6.1 |
| 35.90, 125.20, -21.33 | Villa_lod1/render_white | 55 | 2.405 |
| 35.90, 125.20, -20.63 | Villa_lod1/render_white | 69 | 3.803 |
| 35.95, 125.20, -18.53 | Villa_lod1/render_white | 58 | 8.7 |

(5446 more in the JSON)

## nonmanifold (warn, 71)

| at | part | uses |
|---|---|---|
| 36.00, 117.95, -17.00 | Villa_lod1/stone_blue | 3 |
| 36.00, 117.95, 16.00 | Villa_lod1/stone_blue | 3 |
| 13.10, 117.88, 9.60 | Villa_lod1/stone_blue | 4 |
| 13.10, 116.01, 10.80 | Villa_lod1/stone_blue | 4 |
| 13.10, 115.97, 11.69 | Villa_lod1/stone_blue | 3 |
| 13.10, 115.95, 11.71 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, -14.96 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, 0.97 | Villa_lod1/stone_blue | 4 |
| 14.15, 121.37, 4.56 | Villa_lod1/metal_dark | 4 |
| 14.15, 118.40, 4.56 | Villa_lod1/metal_dark | 4 |
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

(31 more in the JSON)

## tjunction (warn, 322)

| at | part | edge_m |
|---|---|---|
| 14.00, 118.40, -18.90 | Villa_lod1/render_white | 2.9 |
| 14.00, 122.00, -7.00 | Villa_lod1/render_white | 13.9 |
| 14.00, 121.80, 5.90 | Villa_lod1/render_white | 0.3 |
| 14.00, 122.00, 7.70 | Villa_lod1/render_white | 3.2 |
| 14.00, 121.80, 9.10 | Villa_lod1/render_white | 0.3 |
| 14.00, 122.00, 12.60 | Villa_lod1/render_white | 2.8 |
| 14.00, 121.40, 21.50 | Villa_lod1/render_white | 0.7 |
| 14.00, 122.00, 21.70 | Villa_lod1/render_white | 9 |
| 31.50, 118.40, -23.00 | Villa_lod1/render_white | 5 |
| 14.70, 118.40, 23.00 | Villa_lod1/render_white | 1.4 |
| 22.40, 122.00, 23.00 | Villa_lod1/render_white | 3.7 |
| 21.70, 118.40, 23.00 | Villa_lod1/render_white | 1.4 |
| 24.00, 121.40, 23.00 | Villa_lod1/render_white | 0.7 |
| 32.90, 118.40, 23.00 | Villa_lod1/render_white | 0.801 |
| 33.00, 118.70, 23.00 | Villa_lod1/render_white | 0.5 |
| 36.00, 122.00, -8.00 | Villa_lod1/render_white | 2.1 |
| 36.00, 121.95, -7.85 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, -7.70 | Villa_lod1/render_white | 12.75 |
| 36.00, 121.95, 5.00 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, 5.60 | Villa_lod1/render_white | 2.9 |
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

(282 more in the JSON)

## degenerate (warn, 3)

| at | part | edge |
|---|---|---|
| 37.50, 125.40, 20.57 | Villa_lod1/wood_cladding | 4.2998 |
| 36.87, 122.00, 15.40 | Villa_lod1/concrete_soffit | 1.5 |
| 14.30, 125.70, -21.57 | Villa_lod1/concrete_soffit | 2.7002 |

## seam (info, 258)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 36.00, 118.39, -7.84 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 25.56 | 64 | 83.8 |
| 36.00, 118.38, -17.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 17.77 | 60 | 82.2 |
| 36.00, 118.39, 8.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.08 | 45 | 88.7 |
| 38.15, 118.40, -10.20 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.53 | 40 | 74 |
| 14.00, 122.00, -2.10 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 49.3 | 30 | 90 |
| 36.00, 122.00, -7.78 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 23.25 | 29 | 90 |
| 12.30, 126.00, 0.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 88 | 28 | 90 |
| 45.57, 117.27, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 10.54 | 26 | 25.5 |
| 36.00, 118.39, 5.01 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5.86 | 23 | 83.4 |
| 38.15, 118.40, -15.22 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.54 | 23 | 78.4 |
| 38.38, 118.40, 0.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.53 | 21 | 79.7 |
| 15.05, 118.05, 18.30 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 15.5 | 17 | 90 |
| 12.00, 122.00, -1.75 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 37.2 | 17 | 90 |
| 43.35, 118.40, -7.44 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.54 | 16 | 82.7 |
| 45.21, 117.28, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.24 | 15 | 28.1 |
| 35.85, 118.41, -22.64 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 28.98 | 14 | 80.8 |
| 36.00, 118.38, 16.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.71 | 13 | 90 |
| 14.10, 118.42, 5.35 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.87 | 13 | 85 |
| 14.10, 118.42, -20.09 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.48 | 13 | 82.7 |
| 14.10, 118.42, -15.99 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.28 | 13 | 81.4 |
| 14.10, 118.42, -11.58 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.27 | 13 | 83.1 |
| 35.85, 118.40, 2.18 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 25.38 | 13 | 80.6 |
| 35.85, 118.40, 7.32 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 5.69 | 13 | 81.2 |
| 35.85, 118.40, 19.86 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 29.28 | 13 | 83.1 |
| 35.90, 118.57, 22.70 | Villa_lod1/render_white + Villa_lod1/metal_dark | 3.59 | 12 | 45 |
| 24.00, 118.70, 22.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.15 | 12 | 89.8 |
| 36.00, 118.39, -22.70 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5.71 | 12 | 88.7 |
| 35.85, 118.40, -22.65 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.24 | 12 | 81.5 |
| 37.35, 125.40, 23.20 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.11 | 12 | 87.4 |
| 14.30, 125.70, -19.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 28 | 11 | 90 |
| 14.10, 118.41, 5.50 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 88.6 |
| 14.10, 118.41, -19.91 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 83.1 |
| 14.10, 118.42, -15.81 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 87.3 |
| 35.90, 118.41, 5.01 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 85.5 |
| 35.90, 118.41, 8.00 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 11 | 83.1 |
| 28.00, 123.80, 23.35 | Villa_lod1/wood_cladding + Villa_lod1/glass_window | 9.8 | 11 | 90 |
| 14.15, 121.39, 4.56 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.11 | 11 | 85 |
| 14.15, 121.34, 16.78 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.26 | 11 | 87.6 |
| 35.85, 121.89, 11.30 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 11 | 87.4 |
| 35.85, 118.46, 16.14 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 11 | 90 |

(218 more in the JSON)

## opening (info, 1140)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 118.40, -22.95 | Villa_lod1/render_white | -1 + 0 + 0 | 1.8 |
| 14.00, 118.40, -15.75 | Villa_lod1/render_white | -1 + 0 + 0 | 3.2 |
| 14.00, 118.40, -11.35 | Villa_lod1/render_white | -1 + 0 + 0 | 15.9 |
| 14.00, 118.45, 5.90 | Villa_lod1/render_white | -1 + 0 + 0 | 3.3 |
| 14.00, 118.45, 9.10 | Villa_lod1/render_white | -1 + 0 + 0 | 0.5 |
| 14.00, 118.95, 9.10 | Villa_lod1/render_white | -1 + 0 + 0 | 0.699 |
| 14.00, 119.65, 9.10 | Villa_lod1/render_white | -1 + 0 + 0 | 2.101 |
| 14.00, 118.40, 9.15 | Villa_lod1/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 118.40, 12.05 | Villa_lod1/render_white | -1 + 0 + 0 | 9.5 |
| 14.00, 121.45, 21.50 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.40, 21.55 | Villa_lod1/render_white | -1 + 0 + 0 | 1.5 |
| 14.05, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 6.3 |
| 20.35, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 6.3 |
| 26.65, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 1.4 |
| 33.05, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 3 |
| 16.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 16.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 17.55, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 18.25, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 22.45, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 23.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 23.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.2 |
| 29.45, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 30.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 33.00, 118.65, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 24.00, 121.65, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 34.35, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 35.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 36.00, 118.40, -22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.75, -8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.97, -7.85 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 5.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 118.40, 22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 14.00, 121.35, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.4 |
| 36.00, 121.74, -7.85 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.74, 5.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.74, 8.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 24.00, 121.05, 23.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.4 |
| 33.00, 118.75, 23.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.2 |

(1100 more in the JSON)

## backtoback (info, 417)

| at | parts | area |
|---|---|---|
| 14.00, 121.87, 5.38 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.08513 |
| 14.00, 121.98, 5.63 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01565 |
| 14.00, 121.86, 5.68 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04626 |
| 14.00, 121.98, 5.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00187 |
| 14.00, 121.86, 5.82 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00736 |
| 14.00, 121.97, 5.89 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00034 |
| 14.00, 121.85, 5.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.011 |
| 14.00, 121.97, 5.89 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00054 |
| 14.00, 121.87, 6.26 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0792 |
| 14.00, 121.95, 6.97 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.24114 |
| 14.00, 121.82, 6.91 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.06599 |
| 14.00, 121.88, 8.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.25434 |
| 14.00, 121.95, 10.95 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03451 |
| 14.00, 121.83, 10.47 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.14238 |
| 14.00, 121.92, 9.92 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.25682 |
| 14.00, 121.80, 9.49 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04556 |
| 14.00, 121.96, 11.21 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00692 |
| 14.00, 121.84, 11.23 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.05681 |
| 14.00, 121.97, 11.70 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.05207 |
| 14.00, 121.86, 12.01 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.24574 |
| 25.73, 121.63, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00007 |
| 26.07, 121.78, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00007 |
| 25.90, 121.70, 23.00 | Villa_lod1/render_white + Villa_lod1/render_white | 0.00015 |
| 14.13, 118.61, 4.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01926 |
| 14.13, 119.77, 4.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07587 |
| 14.13, 119.58, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03932 |
| 14.13, 118.90, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03433 |
| 14.12, 120.18, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01827 |
| 14.13, 120.93, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04274 |
| 14.12, 120.48, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00281 |
| 14.13, 121.40, 4.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00179 |
| 14.13, 121.40, 4.51 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00064 |
| 14.13, 121.40, 5.13 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02561 |
| 14.13, 121.40, 4.71 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0101 |
| 14.13, 121.40, 5.47 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00186 |
| 14.13, 120.95, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.03094 |
| 14.13, 119.67, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07384 |
| 14.11, 119.09, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00548 |
| 14.12, 118.86, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0105 |
| 14.14, 119.16, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02044 |

(377 more in the JSON)


Nodes: Villa_lod1. Distances: {"Villa_ivy":80,"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.443 mm. Offset 0,100,0.
