# Mesh audit (packed): villa.lod1

16,053 triangles, 10,539 welded vertices, 2,546 open edges, 627,734 rays, 2603 ms.

**7111 blocking**, 6182 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 14 |
| depth | block | 3 |
| crossing | block | 2 |
| leak | block | 17 |
| flipped | block | 8 |
| streak | block | 6141 |
| bentflat | block | 926 |
| sliver | warn | 5724 |
| nonmanifold | warn | 67 |
| tjunction | warn | 380 |
| degenerate | warn | 11 |
| seam | info | 235 |
| opening | info | 1103 |
| backtoback | info | 380 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 14)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 35.88, 118.41, -22.70 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0 | 1.7 | 2.4 | 260 | 2.43 | false | 0 + 0 + -1 |
| 44.85, 117.69, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 20.7 | 3.6 | 260 | 2.43 | false | -0.67 + 0 + 0.74 |
| 44.85, 117.43, -1.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 22.8 | 0.2 | 260 | 2.43 | true | -0.01 + 0 + -1 |
| 45.22, 117.59, 4.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 9.4 | 2.5 | 260 | 2.43 | false | 0.02 + 0.01 + 1 |
| 45.21, 117.59, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0.02 | 50.1 | 0.2 | 260 | 2.43 | false | -0.03 + 0.01 + 1 |
| 45.57, 117.58, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 6.5 | 2.3 | 260 | 2.43 | false | 0.03 + 0.02 + -1 |
| 45.56, 117.51, -1.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 17.7 | 1.4 | 260 | 2.43 | false | 0.02 + 0.02 + -1 |
| 45.57, 117.51, -1.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 22.4 | 1.7 | 260 | 2.43 | false | 0.02 + 0.02 + -1 |
| 45.57, 117.57, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 17.9 | 1 | 260 | 2.43 | false | 0.01 + 0 + 1 |
| 35.90, 125.17, -22.64 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1 | 4.2 | 260 | 2.43 | false | 1 + 0 + 0 |
| 35.90, 118.43, -8.21 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.1 | 3.7 | 260 | 2.43 | false | 1 + 0 + -0.06 |
| 28.06, 118.88, -22.80 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.3 | 0 | 260 | 2.43 | false | 0 + 0 + 1 |
| 12.20, 123.02, -5.94 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.5 | 0.1 | 260 | 2.43 | false | 1 + 0 + 0 |
| 12.20, 123.03, -5.94 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.6 | 4.2 | 260 | 2.43 | false | 1 + 0 + 0.07 |

## depth (block, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 35.88, 118.41, -7.85 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.29 | 3.3 | 2.5 | 260 | 2.43 | false | 0 + 0 + -1 |
| 35.88, 118.41, 7.89 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.04 | 2 | 1.1 | 260 | 2.43 | false | 0.02 + 0 + 1 |
| 35.88, 118.41, 8.00 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.16 | 1.7 | 2.3 | 260 | 2.43 | false | 0 + 0 + -1 |

## crossing (block, 2)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 35.88, 118.42, -8.15 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 7.8 | 4.7 |
| 38.44, 118.40, 0.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 10.9 | 0.9 |

## leak (block, 17)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 28.04, 121.42, 23.00 | Villa_lod1/render_white | 30 | 0 + 0 + 1 | 0.762 |
| 37.20, 126.30, 15.25 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 30.9 |
| 27.85, 126.30, 23.20 | Villa_lod1/render_white | 30 | 0 + 0 + -1 | 24.899 |
| 35.70, 125.95, -11.85 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 14.7 |
| 9.65, 119.68, -20.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.2 |
| 9.85, 119.68, -20.00 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.1 |
| 9.90, 118.46, -0.05 | Villa_lod1/render_white | 4 | 1 + 0 + 0 | 7.4 |
| 9.65, 118.46, 6.00 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.2 |
| 9.85, 118.46, 6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.1 |
| 9.90, 118.04, 8.15 | Villa_lod1/render_white | 4 | 1 + 0 + 0 | 10.7 |
| 44.50, 117.85, 5.00 | Villa_lod1/stone_blue | 4 | 1 + 0 + 0 | 0.7 |
| 45.57, 117.27, 4.94 | Villa_lod1/stone_blue | 4 | 0.45 + -0.89 + 0 | 5.98 |
| 37.50, 126.30, 2.15 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 4.9 |
| 37.50, 126.30, 4.95 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.8 |
| 37.50, 126.30, 7.75 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.8 |
| 37.50, 126.30, 10.55 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 3.5 |
| 37.50, 126.30, 14.05 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 4.2 |

## flipped (block, 8)

| at | part | dot | area |
|---|---|---|---|
| 13.40, 116.01, 10.80 | Villa_lod1/stone_blue | -0.82 | 0.00702 |
| 12.80, 116.01, 11.10 | Villa_lod1/stone_blue | -0.82 | 0.00702 |
| 12.80, 115.97, 11.69 | Villa_lod1/stone_blue | -0.99 | 0.00702 |
| 13.39, 115.95, 11.71 | Villa_lod1/stone_blue | -0.92 | 0.00665 |
| 9.83, 115.35, 17.20 | Villa_lod1/stone_blue | -0.84 | 0.00179 |
| 44.73, 117.27, 4.99 | Villa_lod1/stone_blue | -0.99 | 0.00138 |
| 44.97, 117.27, 5.00 | Villa_lod1/stone_blue | -0.83 | 0.00138 |
| 35.87, 120.75, 4.84 | Villa_lod1/metal_dark | -0.52 | 0.16965 |

## streak (block, 6141)

| at | part | why | deg | area | spread | aspect | longest |
|---|---|---|---|---|---|---|---|
| 35.95, 121.88, 22.70 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0225 |  |  |  |
| 35.90, 121.97, 21.43 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 24 | 3.8 |
| 35.95, 121.97, 21.33 | Villa_lod1/render_white | corner normal faces away | 165 | 0.0901 |  |  |  |
| 19.50, 115.10, 17.67 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1141 |  |  |  |
| 19.50, 115.48, 17.83 | Villa_lod1/render_white | corner normal faces away | 90 | 0.2883 |  |  |  |
| 19.57, 115.18, 16.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0166 |  |  |  |
| 19.53, 115.52, 16.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0512 |  |  |  |
| 11.74, 115.98, 8.99 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 22 | 0.24 |
| 11.82, 115.98, 8.99 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 32 | 0.24 |
| 11.82, 117.10, 9.00 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 14 | 3.37 |
| 11.65, 118.11, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 387 | 3.2 |
| 12.02, 119.17, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 11.83, 115.97, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 12.02, 118.11, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 6 | 3.25 |
| 11.83, 117.04, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 6 | 3.25 |
| 12.02, 117.04, 9.29 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 6 | 3.24 |
| 12.20, 118.10, 9.20 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.21 |
| 12.20, 117.04, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.21 |
| 12.02, 119.00, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 62 | 0.54 |
| 12.20, 119.00, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 35 | 0.29 |
| 11.84, 115.97, 9.60 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 48 | 0.54 |
| 12.02, 115.96, 9.59 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 11.65, 116.97, 9.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.05 |
| 11.65, 117.98, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 10 | 3.05 |
| 12.02, 118.83, 9.61 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 69 | 0.54 |
| 12.20, 117.87, 9.61 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 252 | 2.88 |
| 12.20, 116.91, 9.61 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 347 | 2.88 |
| 12.20, 116.91, 9.89 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 346 | 2.88 |
| 11.83, 115.95, 9.61 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 66 | 0.54 |
| 11.65, 116.92, 9.80 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 10 | 2.89 |
| 11.65, 117.88, 9.70 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 2.89 |
| 11.65, 117.76, 9.91 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 328 | 2.71 |
| 12.02, 118.66, 9.90 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 65 | 0.54 |
| 12.01, 118.66, 10.19 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 63 | 0.55 |
| 11.83, 118.66, 10.19 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 63 | 0.54 |
| 12.20, 117.75, 9.90 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 231 | 2.71 |
| 12.20, 116.85, 9.91 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 328 | 2.71 |
| 11.83, 115.94, 9.91 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 11.65, 116.85, 10.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 2.72 |
| 11.65, 116.79, 10.21 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 307 | 2.55 |

(6101 more in the JSON)

## bentflat (block, 926)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 11.84, 118.11, 9.29 | Villa_lod1/render_white | 45 | 0.8786 | 1.73 |
| 12.02, 117.99, 9.30 | Villa_lod1/render_white | 44.2 | 0.8214 | 0.82 |
| 11.84, 116.97, 9.30 | Villa_lod1/render_white | 44.8 | 0.8109 | 0.81 |
| 11.83, 117.99, 9.60 | Villa_lod1/render_white | 44.1 | 0.8214 | 0.82 |
| 12.02, 116.98, 9.60 | Villa_lod1/render_white | 44.2 | 0.8214 | 0.82 |
| 12.01, 117.87, 9.61 | Villa_lod1/render_white | 45.1 | 0.7674 | 1.55 |
| 11.83, 116.92, 9.61 | Villa_lod1/render_white | 45 | 0.7794 | 1.55 |
| 11.84, 117.87, 9.89 | Villa_lod1/render_white | 45 | 0.7697 | 1.55 |
| 12.01, 116.91, 9.89 | Villa_lod1/render_white | 44.8 | 0.7673 | 1.55 |
| 12.01, 117.75, 9.90 | Villa_lod1/render_white | 45.2 | 0.7238 | 1.47 |
| 11.83, 116.85, 9.91 | Villa_lod1/render_white | 45 | 0.7352 | 1.47 |
| 11.84, 117.75, 10.19 | Villa_lod1/render_white | 45 | 0.7462 | 1.47 |
| 12.02, 116.85, 10.20 | Villa_lod1/render_white | 45.9 | 0.7216 | 1.47 |
| 12.01, 117.63, 10.20 | Villa_lod1/render_white | 44.8 | 0.6804 | 1.37 |
| 11.84, 116.78, 10.21 | Villa_lod1/render_white | 44.8 | 0.6804 | 1.37 |
| 11.83, 117.64, 10.49 | Villa_lod1/render_white | 45 | 0.6888 | 1.38 |
| 12.02, 116.79, 10.49 | Villa_lod1/render_white | 45 | 0.6909 | 1.38 |
| 12.01, 117.52, 10.51 | Villa_lod1/render_white | 44.8 | 0.6469 | 1.29 |
| 11.83, 116.72, 10.51 | Villa_lod1/render_white | 45 | 0.6447 | 1.29 |
| 12.01, 117.40, 10.80 | Villa_lod1/render_white | 45 | 0.5917 | 1.19 |
| 11.84, 116.66, 10.80 | Villa_lod1/render_white | 44.8 | 0.5938 | 1.19 |
| 12.01, 117.28, 11.10 | Villa_lod1/render_white | 45 | 0.5502 | 1.11 |
| 11.84, 116.59, 11.11 | Villa_lod1/render_white | 45 | 0.5543 | 1.11 |
| 12.02, 117.16, 11.40 | Villa_lod1/render_white | 45 | 0.5091 | 1.03 |
| 11.84, 116.52, 11.40 | Villa_lod1/render_white | 44.1 | 0.517 | 1.03 |
| 11.84, 117.16, 11.70 | Villa_lod1/render_white | 44.1 | 0.517 | 1.04 |
| 12.02, 116.52, 11.70 | Villa_lod1/render_white | 45 | 0.5112 | 1.04 |
| 12.01, 117.04, 11.71 | Villa_lod1/render_white | 45.2 | 0.4706 | 0.47 |
| 11.84, 116.45, 11.71 | Villa_lod1/render_white | 45.2 | 0.4706 | 0.47 |
| 11.84, 117.04, 12.00 | Villa_lod1/render_white | 44.7 | 0.4706 | 0.94 |
| 13.30, 117.60, 5.50 | Villa_lod1/stone_blue | 22.5 | 2.4527 | 4.92 |
| 12.61, 116.81, 5.50 | Villa_lod1/stone_blue | 22.4 | 2.4631 | 4.92 |
| 11.90, 116.81, 7.83 | Villa_lod1/stone_blue | 22.5 | 4.1309 | 8.26 |
| 11.90, 117.60, 6.67 | Villa_lod1/stone_blue | 27.3 | 4.1272 | 8.26 |
| 12.60, 117.60, 8.99 | Villa_lod1/stone_blue | 67.2 | 2.4672 | 4.93 |
| 13.30, 116.81, 9.00 | Villa_lod1/stone_blue | 22.4 | 2.4618 | 4.93 |
| 12.60, 118.39, 7.83 | Villa_lod1/stone_blue | 67.2 | 3.6358 | 7.28 |
| 13.30, 118.39, 6.67 | Villa_lod1/stone_blue | 27.3 | 3.6483 | 7.28 |
| 14.00, 117.60, 7.83 | Villa_lod1/stone_blue | 27.3 | 4.1153 | 8.24 |
| 14.00, 116.81, 6.67 | Villa_lod1/stone_blue | 27.3 | 4.1292 | 8.24 |

(886 more in the JSON)

## sliver (warn, 5724)

| at | part | aspect | longest |
|---|---|---|---|
| 14.00, 121.90, 11.30 | Villa_lod1/render_white | 56 | 16.8 |
| 35.20, 121.08, -23.00 | Villa_lod1/render_white | 52 | 7.922 |
| 35.20, 125.93, -23.00 | Villa_lod1/render_white | 48 | 2.401 |
| 36.00, 125.68, -22.90 | Villa_lod1/render_white | 44 | 0.808 |
| 36.00, 125.92, -21.20 | Villa_lod1/render_white | 110 | 4.8 |
| 36.00, 125.67, -19.47 | Villa_lod1/render_white | 56 | 5.247 |
| 36.00, 125.92, -19.57 | Villa_lod1/render_white | 868 | 5.5 |
| 36.00, 125.67, -19.00 | Villa_lod1/render_white | 72 | 5.942 |
| 36.00, 125.93, -18.87 | Villa_lod1/render_white | 124 | 6.2 |
| 36.00, 125.92, -19.10 | Villa_lod1/render_white | 1102 | 6.2 |
| 36.00, 125.67, -18.53 | Villa_lod1/render_white | 90 | 6.638 |
| 36.00, 125.92, -13.77 | Villa_lod1/render_white | 225 | 2.8 |
| 36.00, 125.92, -12.60 | Villa_lod1/render_white | 225 | 5.6 |
| 36.00, 125.93, -10.83 | Villa_lod1/render_white | 149 | 7.4 |
| 36.00, 125.92, -11.43 | Villa_lod1/render_white | 1139 | 6.3 |
| 36.00, 119.20, -8.05 | Villa_lod1/render_white | 48 | 1.905 |
| 36.00, 121.97, -5.93 | Villa_lod1/render_white | 115 | 5.75 |
| 36.00, 121.97, -3.78 | Villa_lod1/render_white | 1193 | 6.45 |
| 36.00, 121.98, 0.65 | Villa_lod1/render_white | 256 | 12.75 |
| 36.00, 121.97, -1.45 | Villa_lod1/render_white | 518 | 12.75 |
| 36.00, 121.98, 6.93 | Villa_lod1/render_white | 58 | 2.9 |
| 36.00, 121.97, 5.97 | Villa_lod1/render_white | 58 | 2.9 |
| 36.00, 121.98, 13.03 | Villa_lod1/render_white | 295 | 14.7 |
| 36.00, 121.97, 17.83 | Villa_lod1/render_white | 293 | 14.3 |
| 14.10, 118.70, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 118.70, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.10, 121.40, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 121.40, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 120.53, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 35.95, 120.37, -22.70 | Villa_lod1/render_white | 51 | 4.003 |
| 35.95, 120.77, -8.15 | Villa_lod1/render_white | 42 | 2.106 |
| 35.95, 121.23, -8.15 | Villa_lod1/render_white | 75 | 2.805 |
| 35.90, 125.20, -20.27 | Villa_lod1/render_white | 49 | 7.302 |
| 35.95, 125.20, -17.13 | Villa_lod1/render_white | 63 | 9.4 |
| 35.90, 125.20, -14.47 | Villa_lod1/render_white | 42 | 2.105 |
| 35.90, 121.95, -5.88 | Villa_lod1/render_white | 1465 | 5.752 |
| 35.95, 121.95, -3.73 | Villa_lod1/render_white | 377 | 6.302 |

(5684 more in the JSON)

## nonmanifold (warn, 67)

| at | part | uses |
|---|---|---|
| 36.00, 117.95, -17.00 | Villa_lod1/stone_blue | 3 |
| 36.00, 117.95, 16.00 | Villa_lod1/stone_blue | 3 |
| 13.10, 116.01, 10.80 | Villa_lod1/stone_blue | 4 |
| 13.10, 115.97, 11.69 | Villa_lod1/stone_blue | 3 |
| 13.10, 115.95, 11.71 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, -14.97 | Villa_lod1/stone_blue | 4 |
| 43.35, 118.39, 0.97 | Villa_lod1/stone_blue | 4 |
| 44.85, 117.75, 4.99 | Villa_lod1/stone_blue | 4 |
| 44.85, 117.27, -0.99 | Villa_lod1/stone_blue | 4 |
| 44.67, 117.27, 4.99 | Villa_lod1/stone_blue | 3 |
| 44.85, 117.27, 4.99 | Villa_lod1/stone_blue | 4 |
| 45.03, 117.28, 5.00 | Villa_lod1/stone_blue | 4 |
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
| 35.85, 118.40, -22.64 | Villa_lod1/metal_dark | 4 |
| 35.85, 125.20, -22.64 | Villa_lod1/metal_dark | 4 |
| 35.85, 125.20, -8.21 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, -8.21 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, -7.79 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, -7.79 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.92, 4.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 4.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 5.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 5.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 7.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 7.84 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 8.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.95, 8.06 | Villa_lod1/metal_dark | 4 |
| 35.85, 121.92, 22.64 | Villa_lod1/metal_dark | 4 |
| 35.85, 118.40, 22.64 | Villa_lod1/metal_dark | 4 |

(27 more in the JSON)

## tjunction (warn, 380)

| at | part | edge_m |
|---|---|---|
| 14.00, 118.40, -12.60 | Villa_lod1/render_white | 15 |
| 14.00, 122.00, -7.00 | Villa_lod1/render_white | 12.2 |
| 14.00, 121.40, 8.70 | Villa_lod1/render_white | 3.3 |
| 14.00, 118.40, 11.20 | Villa_lod1/render_white | 3.3 |
| 14.00, 118.70, 12.00 | Villa_lod1/render_white | 0.5 |
| 14.00, 122.00, 7.70 | Villa_lod1/render_white | 16.8 |
| 14.00, 121.40, 21.50 | Villa_lod1/render_white | 0.7 |
| 35.70, 118.40, -23.00 | Villa_lod1/render_white | 3 |
| 14.70, 118.40, 23.00 | Villa_lod1/render_white | 1.4 |
| 24.00, 121.40, 23.00 | Villa_lod1/render_white | 0.7 |
| 25.20, 122.00, 23.00 | Villa_lod1/render_white | 1.4 |
| 28.70, 121.70, 23.00 | Villa_lod1/render_white | 1.523 |
| 33.00, 118.70, 23.00 | Villa_lod1/render_white | 0.5 |
| 35.70, 122.00, 23.00 | Villa_lod1/render_white | 1 |
| 36.00, 122.00, -8.00 | Villa_lod1/render_white | 0.7 |
| 36.00, 121.95, -7.85 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, -7.70 | Villa_lod1/render_white | 12.75 |
| 36.00, 121.95, 5.00 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, 5.60 | Villa_lod1/render_white | 2.9 |
| 36.00, 121.95, 8.00 | Villa_lod1/render_white | 0.3 |
| 36.00, 121.95, 7.90 | Villa_lod1/render_white | 0.3 |
| 36.00, 122.00, 8.40 | Villa_lod1/render_white | 14.7 |
| 12.30, 126.00, -6.00 | Villa_lod1/render_white | 30.9 |
| 37.20, 126.00, -6.00 | Villa_lod1/render_white | 30.9 |
| 14.00, 126.00, -7.70 | Villa_lod1/render_white | 24.899 |
| 14.00, 126.00, 23.20 | Villa_lod1/render_white | 24.899 |
| 14.30, 125.70, -22.00 | Villa_lod1/render_white | 14.7 |
| 35.70, 125.70, -22.00 | Villa_lod1/render_white | 14.7 |
| 18.00, 125.70, -22.70 | Villa_lod1/render_white | 21.399 |
| 14.00, 115.36, 18.00 | Villa_lod1/render_white | 0.075 |
| 14.00, 116.10, 18.00 | Villa_lod1/render_white | 1.4 |
| 14.00, 118.00, 18.00 | Villa_lod1/render_white | 0.55 |
| 15.40, 115.33, 18.00 | Villa_lod1/render_white | 0.127 |
| 16.80, 115.16, 18.00 | Villa_lod1/render_white | 0.302 |
| 18.20, 115.01, 18.00 | Villa_lod1/render_white | 0.43 |
| 18.90, 114.97, 18.00 | Villa_lod1/render_white | 0.454 |
| 17.50, 118.05, 18.00 | Villa_lod1/render_white | 2.7 |
| 19.50, 114.98, 16.80 | Villa_lod1/render_white | 0.452 |
| 19.50, 114.95, 17.50 | Villa_lod1/render_white | 0.457 |
| 19.50, 118.05, 16.10 | Villa_lod1/render_white | 2 |

(340 more in the JSON)

## degenerate (warn, 11)

| at | part | edge |
|---|---|---|
| 28.70, 121.70, 23.00 | Villa_lod1/render_white | 1.5234 |
| 9.60, 116.80, -6.43 | Villa_lod1/render_white | 1 |
| 9.90, 116.10, 16.07 | Villa_lod1/render_white | 1.3003 |
| 37.50, 125.20, -7.00 | Villa_lod1/wood_cladding | 1.9801 |
| 37.50, 124.73, -6.53 | Villa_lod1/wood_cladding | 2.9702 |
| 27.33, 125.70, -19.33 | Villa_lod1/concrete_soffit | 8.4853 |
| 17.97, 118.05, 22.60 | Villa_lod1/concrete_soffit | 4.9004 |
| 19.57, 118.05, 22.60 | Villa_lod1/concrete_soffit | 2.7998 |
| 18.67, 118.05, 22.60 | Villa_lod1/concrete_soffit | 4.2002 |
| 20.27, 118.05, 22.60 | Villa_lod1/concrete_soffit | 1.5 |
| 24.03, 118.05, 22.60 | Villa_lod1/concrete_soffit | 4.9004 |

## seam (info, 235)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 36.00, 118.39, -7.84 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 25.56 | 67 | 83.8 |
| 14.00, 122.00, -2.10 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 74.25 | 66 | 90 |
| 36.00, 118.38, -17.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 17.77 | 52 | 82.2 |
| 36.00, 118.39, 8.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.08 | 45 | 88.7 |
| 38.15, 118.40, -14.80 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.53 | 42 | 74 |
| 12.00, 122.00, -3.50 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 54.6 | 39 | 90 |
| 45.57, 117.27, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.02 | 31 | 21 |
| 12.30, 126.00, -5.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 90 | 30 | 90 |
| 17.15, 118.05, 18.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 27.3 | 27 | 90 |
| 38.35, 118.40, -14.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.53 | 24 | 42.3 |
| 37.38, 125.40, 0.06 | Villa_lod1/wood_cladding + Villa_lod1/metal_dark | 23.13 | 24 | 45 |
| 36.00, 118.39, 5.01 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5.86 | 22 | 83.4 |
| 35.85, 119.95, 8.00 | Villa_lod1/render_white + Villa_lod1/glass_window | 12.6 | 17 | 90 |
| 43.35, 118.40, -8.10 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 16.55 | 17 | 77.2 |
| 33.00, 119.95, 22.85 | Villa_lod1/render_white + Villa_lod1/glass_window | 18.2 | 16 | 90 |
| 45.21, 117.28, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.24 | 16 | 28.1 |
| 36.00, 118.39, -22.70 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5.71 | 15 | 88.7 |
| 38.30, 118.40, 0.97 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.53 | 15 | 79.7 |
| 12.00, 126.30, -6.65 | Villa_lod1/wood_cladding + Villa_lod1/metal_dark | 29.48 | 15 | 90 |
| 37.35, 123.45, 0.00 | Villa_lod1/wood_cladding + Villa_lod1/glass_window | 42.7 | 14 | 90 |
| 14.30, 125.70, -21.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 34 | 13 | 90 |
| 36.00, 118.38, 16.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 6.71 | 13 | 90 |
| 14.10, 118.42, 5.34 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.87 | 13 | 82 |
| 14.10, 118.42, -20.10 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 2.48 | 13 | 80.8 |
| 35.85, 118.41, -22.64 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 28.98 | 13 | 80.8 |
| 35.85, 118.40, 2.19 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 25.37 | 13 | 80.7 |
| 35.85, 118.40, 7.26 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 5.69 | 13 | 80.7 |
| 35.85, 121.89, 14.56 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 13 | 87.7 |
| 28.06, 123.00, 23.35 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 11.86 | 13 | 87.7 |
| 35.85, 118.40, -22.66 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 12 | 79.8 |
| 35.90, 118.41, 7.89 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.23 | 12 | 80.8 |
| 35.90, 118.41, 5.01 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 12 | 85.7 |
| 35.90, 118.41, 8.00 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 0.22 | 12 | 83.1 |
| 35.85, 118.40, 19.87 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 29.29 | 12 | 83.1 |
| 43.66, 118.40, 14.85 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.18 | 12 | 89.9 |
| 43.66, 118.40, 6.86 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.17 | 12 | 89.9 |
| 35.85, 121.94, 22.64 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 7.2 | 12 | 87.6 |
| 35.85, 121.89, 16.14 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 12 | 87.6 |
| 32.94, 118.70, 22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 17.86 | 12 | 87.1 |
| 24.06, 121.40, 22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 17.87 | 12 | 85.4 |

(195 more in the JSON)

## opening (info, 1103)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 118.40, -22.95 | Villa_lod1/render_white | -1 + 0 + 0 | 1.8 |
| 14.00, 118.40, -4.85 | Villa_lod1/render_white | -1 + 0 + 0 | 9.4 |
| 14.00, 121.45, 8.70 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.40, 12.05 | Villa_lod1/render_white | -1 + 0 + 0 | 9.5 |
| 14.00, 121.45, 21.50 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.40, 21.55 | Villa_lod1/render_white | -1 + 0 + 0 | 1.5 |
| 14.05, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 4.2 |
| 18.25, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 4.2 |
| 22.45, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 5.6 |
| 28.05, 118.40, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 5 |
| 16.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 16.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 17.55, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 18.25, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 20.35, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 22.45, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 21.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 1.4 |
| 23.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 23.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.2 |
| 30.15, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 30.85, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.7 |
| 31.55, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 32.25, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.801 |
| 24.00, 121.65, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 28.74, 121.72, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.762 |
| 33.65, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.701 |
| 33.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.6 |
| 34.35, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 35.05, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.699 |
| 36.00, 118.40, -22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.75, -8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 121.97, -7.85 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 7.90 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 5.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 118.40, 22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 14.00, 118.85, 12.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.2 |
| 14.00, 121.35, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.4 |
| 36.00, 121.74, -7.85 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |
| 36.00, 121.74, 5.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.25 |

(1063 more in the JSON)

## backtoback (info, 380)

| at | parts | area |
|---|---|---|
| 14.11, 118.65, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00201 |
| 14.13, 118.62, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01725 |
| 14.13, 119.95, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04425 |
| 14.14, 119.35, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01015 |
| 14.11, 119.11, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01414 |
| 14.13, 118.97, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00694 |
| 14.13, 120.77, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02722 |
| 14.13, 121.23, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01538 |
| 14.13, 121.40, 4.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00193 |
| 14.13, 121.40, 4.51 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00064 |
| 14.12, 118.72, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00127 |
| 14.13, 118.89, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01475 |
| 14.14, 121.03, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02852 |
| 14.13, 119.90, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07644 |
| 14.12, 121.36, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00242 |
| 14.11, 121.32, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00022 |
| 14.11, 119.09, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00549 |
| 14.12, 118.86, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01049 |
| 14.13, 120.12, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.069 |
| 14.14, 119.16, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0204 |
| 14.13, 121.23, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01538 |
| 14.12, 121.04, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00281 |
| 14.12, 121.40, 20.49 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.06418 |
| 14.13, 121.40, 21.48 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00191 |
| 14.13, 121.40, 21.45 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00066 |
| 14.12, 119.06, -21.20 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04479 |
| 14.13, 123.73, -21.20 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07334 |
| 14.13, 120.71, -21.20 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.17524 |
| 14.11, 119.48, -19.90 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01822 |
| 14.13, 118.81, -19.90 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02777 |
| 14.14, 119.51, -19.90 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04561 |
| 35.89, 118.64, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00164 |
| 35.87, 118.62, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01796 |
| 35.89, 119.05, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00938 |
| 35.86, 119.18, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01829 |
| 35.87, 119.78, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02156 |
| 35.86, 119.75, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00615 |
| 35.87, 121.11, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.05541 |
| 35.88, 120.25, -7.85 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02411 |
| 35.86, 121.31, 4.90 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0182 |

(340 more in the JSON)


Nodes: Villa_lod1. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.443 mm. Offset 0,100,0.
