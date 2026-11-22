# Mesh audit (packed): villa.lod1

16,052 triangles, 10,997 welded vertices, 3,482 open edges, 766,650 rays, 6361 ms.

**7117 blocking**, 6770 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 24 |
| crossing | block | 1 |
| leak | block | 22 |
| flipped | block | 15 |
| streak | block | 6134 |
| bentflat | block | 921 |
| sliver | warn | 5623 |
| nonmanifold | warn | 64 |
| tjunction | warn | 1077 |
| degenerate | warn | 6 |
| seam | info | 328 |
| opening | info | 1418 |
| backtoback | info | 428 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 24)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 31.00, 117.08, 16.24 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 1.6 | 0 | 260 | 2.43 | true | -1 + 0 + 0 |
| 31.00, 117.73, 16.71 | Villa_lod1/render_white + Villa_lod1/render_white | 0 | 1.6 | 0 | 260 | 2.43 | true | -1 + 0 + 0 |
| 36.00, 118.08, -17.75 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 1.2 | 0 | 260 | 2.43 | true | 1 + 0 + 0 |
| 36.00, 117.45, -17.25 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 1.2 | 0 | 260 | 2.43 | true | 1 + 0 + 0 |
| 45.22, 117.52, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 35.8 | 1.9 | 260 | 2.43 | false | 0 + 0 + -1 |
| 45.22, 117.90, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 0.5 | 3.3 | 260 | 2.43 | false | 0.03 + 0 + -1 |
| 45.21, 117.59, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 25.2 | 0.9 | 260 | 2.43 | false | 0.03 + 0 + -1 |
| 45.56, 117.43, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 4.2 | 1.5 | 260 | 2.43 | false | -0.03 + -0.02 + -1 |
| 45.57, 117.50, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 39.6 | 1.1 | 260 | 2.43 | false | -0.03 + -0.02 + -1 |
| 45.56, 117.27, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 0.5 | 2.9 | 260 | 2.43 | false | 0.03 + 0.02 + -1 |
| 45.57, 117.51, 5.00 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 29.8 | 0.4 | 260 | 2.43 | false | -0.01 + 0.02 + 1 |
| 45.56, 117.49, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 0 | 2.5 | 2.2 | 260 | 2.43 | true | -0.05 + -0.02 + -1 |
| 37.50, 125.63, 17.06 | Villa_lod1/wood_cladding + Villa_lod1/wood_cladding | 0 | 2.2 | 0 | 260 | 2.43 | true | 1 + 0 + 0 |
| 37.50, 126.08, 15.69 | Villa_lod1/wood_cladding + Villa_lod1/wood_cladding | 0 | 2.2 | 0 | 260 | 2.43 | true | 1 + 0 + 0 |
| 35.90, 125.17, -22.64 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1 | 4.2 | 260 | 2.43 | false | 1 + 0 + 0 |
| 35.90, 118.43, -8.21 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.1 | 3.7 | 260 | 2.43 | false | 1 + 0 + -0.06 |
| 28.06, 118.88, -22.80 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1.3 | 0 | 260 | 2.43 | false | 0 + 0 + 1 |
| 32.94, 120.77, -22.80 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 1 | 0 | 260 | 2.43 | false | 0 + 0 + 1 |
| 12.20, 123.02, -5.94 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.5 | 0.1 | 260 | 2.43 | false | 1 + 0 + 0 |
| 12.20, 123.03, -5.94 | Villa_lod1/metal_dark + Villa_lod1/metal_dark | 0 | 0.6 | 4.2 | 260 | 2.43 | false | 1 + 0 + 0.07 |
| 20.91, 125.70, -13.14 | Villa_lod1/concrete_soffit + Villa_lod1/concrete_soffit | 0 | 1.6 | 0 | 260 | 2.43 | true | 0 + 1 + 0 |
| 24.03, 125.70, -19.02 | Villa_lod1/concrete_soffit + Villa_lod1/concrete_soffit | 0 | 3.2 | 0 | 260 | 2.43 | true | 0 + 1 + 0 |
| 32.78, 125.70, -10.76 | Villa_lod1/concrete_soffit + Villa_lod1/concrete_soffit | 0 | 4.5 | 0 | 260 | 2.43 | true | 0 + 1 + 0 |
| 34.73, 125.70, -8.92 | Villa_lod1/concrete_soffit + Villa_lod1/concrete_soffit | 0 | 4.5 | 0 | 260 | 2.43 | true | 0 + 1 + 0 |

## crossing (block, 1)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 45.56, 117.28, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 5 | 0.5 |

## leak (block, 22)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 37.20, 126.30, 15.25 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 30.9 |
| 27.85, 126.30, 23.20 | Villa_lod1/render_white | 30 | 0 + 0 + -1 | 24.899 |
| 35.70, 125.95, -11.85 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 14.7 |
| 9.75, 119.68, -34.00 | Villa_lod1/render_white | 4 | 0 + 0 + -1 | 0.3 |
| 9.75, 119.68, -20.00 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.3 |
| 9.60, 118.46, -3.65 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 1 |
| 9.60, 118.46, -2.95 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 1 |
| 9.60, 118.46, -0.95 | Villa_lod1/render_white | 4 | -1 + 0 + 0 | 2 |
| 9.65, 118.46, 6.00 | Villa_lod1/render_white | 12 | 0 + 0 + 1 | 0.3 |
| 9.75, 118.04, 16.70 | Villa_lod1/render_white | 4 | 0 + 0 + 1 | 0.3 |
| 43.35, 118.40, -9.31 | Villa_lod1/stone_blue | 4 | 0 + 1 + 0 | 3.438 |
| 43.35, 118.40, -8.70 | Villa_lod1/stone_blue | 4 | 0 + 1 + 0 | 1.375 |
| 43.35, 118.40, -7.32 | Villa_lod1/stone_blue | 4 | 0 + 1 + 0 | 3.438 |
| 37.50, 126.30, 2.15 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.729 |
| 37.50, 126.30, 3.46 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.682 |
| 37.50, 126.30, 4.14 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.682 |
| 37.50, 126.30, 4.83 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.729 |
| 37.50, 126.30, 7.55 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.683 |
| 37.50, 126.30, 8.24 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.047 |
| 37.50, 126.30, 10.29 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.729 |
| 37.50, 126.30, 13.02 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 2.047 |
| 37.50, 126.30, 15.06 | Villa_lod1/wood_cladding | 4 | 1 + 0 + 0 | 0.683 |

## flipped (block, 15)

| at | part | dot | area |
|---|---|---|---|
| 31.00, 117.40, 16.47 | Villa_lod1/render_white | -1 | 0.00032 |
| 36.00, 117.77, -17.50 | Villa_lod1/stone_blue | -1 | 0.00024 |
| 12.61, 116.02, 8.99 | Villa_lod1/stone_blue | -0.92 | 0.01002 |
| 13.40, 115.95, 11.70 | Villa_lod1/stone_blue | -0.84 | 0.00662 |
| 13.40, 115.95, 11.99 | Villa_lod1/stone_blue | -0.89 | 0.00662 |
| 38.53, 118.38, -14.97 | Villa_lod1/stone_blue | -0.71 | 0.00014 |
| 44.85, 117.27, 1.00 | Villa_lod1/stone_blue | -0.58 | 0.02281 |
| 45.58, 117.69, 5.00 | Villa_lod1/stone_blue | -0.93 | 0.00248 |
| 45.56, 117.57, -0.99 | Villa_lod1/stone_blue | -0.97 | 0.00169 |
| 37.50, 122.61, -6.67 | Villa_lod1/wood_cladding | -1 | 0.00007 |
| 37.50, 125.85, 16.38 | Villa_lod1/wood_cladding | -1 | 0.00045 |
| 35.87, 120.75, 4.84 | Villa_lod1/metal_dark | -0.52 | 0.16965 |
| 14.21, 126.00, 1.96 | Villa_lod1/concrete_soffit | -1 | 0.00002 |
| 22.73, 125.70, -16.57 | Villa_lod1/concrete_soffit | -1 | 0.00047 |
| 33.75, 125.70, -9.84 | Villa_lod1/concrete_soffit | -1 | 0.0009 |

## streak (block, 6134)

| at | part | why | deg | area | spread | aspect | longest |
|---|---|---|---|---|---|---|---|
| 35.95, 120.19, 8.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1817 |  |  |  |
| 35.90, 120.98, 8.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.2225 |  |  |  |
| 35.95, 121.97, 8.67 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 13 | 2.01 |
| 30.84, 115.04, 16.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.0002 |  |  |  |
| 30.68, 115.47, 16.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.1548 |  |  |  |
| 30.84, 115.90, 16.00 | Villa_lod1/render_white | corner normal faces away | 90 | 0.4643 |  |  |  |
| 11.74, 119.34, 5.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 22 | 0.24 |
| 11.82, 119.35, 5.51 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 32 | 0.24 |
| 11.82, 118.22, 5.50 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 14 | 3.37 |
| 11.65, 118.11, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 387 | 3.2 |
| 11.66, 118.11, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 411 | 3.2 |
| 11.65, 117.04, 9.29 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 281 | 3.2 |
| 12.20, 118.11, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 387 | 3.2 |
| 12.19, 117.04, 9.29 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 411 | 3.21 |
| 12.01, 115.97, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 70 | 0.55 |
| 11.83, 115.97, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 12.02, 118.11, 9.01 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 6 | 3.25 |
| 11.65, 117.04, 9.20 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.21 |
| 11.65, 118.11, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.21 |
| 11.84, 118.11, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 6 | 3.25 |
| 12.01, 117.04, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 6 | 3.25 |
| 12.20, 118.11, 9.20 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 3.21 |
| 12.20, 117.04, 9.10 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 11 | 3.21 |
| 11.65, 115.97, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 37 | 0.29 |
| 11.65, 116.97, 9.59 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 367 | 3.04 |
| 11.66, 119.00, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 34 | 0.29 |
| 11.65, 119.00, 9.49 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 24 | 0.29 |
| 11.84, 119.00, 9.30 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 45 | 0.54 |
| 11.84, 119.00, 9.59 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 90 | 63 | 0.55 |
| 12.20, 116.97, 9.31 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 367 | 3.04 |
| 12.02, 115.96, 9.59 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 70 | 0.54 |
| 11.65, 116.98, 9.49 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 3.04 |
| 11.65, 117.99, 9.40 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 3.04 |
| 11.65, 117.87, 9.61 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 368 | 2.88 |
| 11.65, 117.87, 9.89 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 252 | 2.88 |
| 11.65, 116.91, 9.89 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 347 | 2.88 |
| 12.19, 115.95, 9.70 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 36 | 0.29 |
| 12.20, 115.96, 9.79 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 35 | 25 | 0.29 |
| 12.02, 115.95, 9.89 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 60 | 66 | 0.54 |
| 11.65, 117.87, 9.70 | Villa_lod1/render_white | stretched triangle with diverging corner normals |  |  | 45 | 10 | 2.88 |

(6094 more in the JSON)

## bentflat (block, 921)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 11.84, 117.04, 9.01 | Villa_lod1/render_white | 45 | 0.8808 | 1.77 |
| 12.02, 117.98, 9.30 | Villa_lod1/render_white | 45 | 0.8235 | 1.64 |
| 11.84, 116.97, 9.30 | Villa_lod1/render_white | 45 | 0.8088 | 1.64 |
| 11.84, 117.98, 9.59 | Villa_lod1/render_white | 45 | 0.8361 | 1.67 |
| 12.02, 116.97, 9.59 | Villa_lod1/render_white | 45 | 0.8213 | 1.67 |
| 11.84, 117.87, 9.89 | Villa_lod1/render_white | 45.1 | 0.7674 | 1.55 |
| 12.02, 116.92, 9.89 | Villa_lod1/render_white | 45 | 0.7794 | 1.55 |
| 12.02, 117.76, 9.90 | Villa_lod1/render_white | 45 | 0.7328 | 1.48 |
| 11.83, 116.85, 9.90 | Villa_lod1/render_white | 45 | 0.7353 | 1.48 |
| 11.84, 117.75, 10.20 | Villa_lod1/render_white | 44.8 | 0.735 | 0.74 |
| 12.02, 116.85, 10.20 | Villa_lod1/render_white | 45.9 | 0.7216 | 0.72 |
| 12.01, 117.64, 10.20 | Villa_lod1/render_white | 45 | 0.6783 | 1.36 |
| 11.84, 116.79, 10.21 | Villa_lod1/render_white | 45 | 0.6826 | 1.36 |
| 11.84, 117.64, 10.49 | Villa_lod1/render_white | 45.8 | 0.6888 | 1.39 |
| 12.01, 116.79, 10.49 | Villa_lod1/render_white | 45 | 0.691 | 1.39 |
| 12.02, 117.52, 10.51 | Villa_lod1/render_white | 45 | 0.6468 | 1.32 |
| 11.83, 116.73, 10.51 | Villa_lod1/render_white | 45 | 0.6468 | 1.32 |
| 11.83, 117.52, 10.79 | Villa_lod1/render_white | 45 | 0.6545 | 1.3 |
| 12.01, 116.73, 10.79 | Villa_lod1/render_white | 45.8 | 0.6447 | 1.3 |
| 12.02, 117.40, 10.80 | Villa_lod1/render_white | 45 | 0.5917 | 1.19 |
| 11.84, 116.66, 10.80 | Villa_lod1/render_white | 44.1 | 0.6009 | 1.19 |
| 11.84, 117.40, 11.10 | Villa_lod1/render_white | 45 | 0.5917 | 1.19 |
| 12.01, 116.66, 11.10 | Villa_lod1/render_white | 44.8 | 0.5938 | 1.19 |
| 12.01, 117.28, 11.11 | Villa_lod1/render_white | 45 | 0.5543 | 1.13 |
| 11.84, 116.59, 11.11 | Villa_lod1/render_white | 44.8 | 0.5522 | 1.13 |
| 11.84, 117.28, 11.40 | Villa_lod1/render_white | 44.8 | 0.5522 | 1.1 |
| 12.01, 116.59, 11.40 | Villa_lod1/render_white | 45 | 0.5502 | 1.1 |
| 12.01, 117.17, 11.40 | Villa_lod1/render_white | 44.7 | 0.5112 | 1.02 |
| 11.84, 116.53, 11.40 | Villa_lod1/render_white | 44.7 | 0.5112 | 1.02 |
| 11.84, 117.16, 11.70 | Villa_lod1/render_white | 44.7 | 0.5112 | 0.52 |
| 12.01, 116.52, 11.70 | Villa_lod1/render_white | 44.7 | 0.5112 | 0.52 |
| 12.02, 117.04, 11.71 | Villa_lod1/render_white | 45 | 0.4778 | 0.95 |
| 11.84, 116.45, 11.71 | Villa_lod1/render_white | 45 | 0.4726 | 0.95 |
| 13.30, 117.60, 5.50 | Villa_lod1/stone_blue | 22.5 | 2.4527 | 4.91 |
| 12.60, 116.81, 5.50 | Villa_lod1/stone_blue | 22.4 | 2.4618 | 4.91 |
| 11.90, 116.81, 7.83 | Villa_lod1/stone_blue | 27.4 | 4.1408 | 8.29 |
| 11.91, 117.60, 6.67 | Villa_lod1/stone_blue | 70.8 | 4.1532 | 8.29 |
| 12.61, 117.60, 8.99 | Villa_lod1/stone_blue | 70.8 | 2.4754 | 4.95 |
| 13.30, 116.81, 8.99 | Villa_lod1/stone_blue | 70.9 | 2.4723 | 4.95 |
| 12.61, 118.40, 7.83 | Villa_lod1/stone_blue | 27.3 | 3.6511 | 7.27 |

(881 more in the JSON)

## sliver (warn, 5623)

| at | part | aspect | longest |
|---|---|---|---|
| 14.00, 121.60, 1.82 | Villa_lod1/render_white | 168 | 10.046 |
| 14.00, 121.60, 2.42 | Villa_lod1/render_white | 245 | 10.844 |
| 14.00, 121.60, 12.67 | Villa_lod1/render_white | 194 | 16.711 |
| 14.00, 121.80, 8.26 | Villa_lod1/render_white | 46 | 27.528 |
| 14.00, 121.60, 14.57 | Villa_lod1/render_white | 104 | 14.312 |
| 33.60, 120.92, -23.00 | Villa_lod1/render_white | 41 | 7.096 |
| 28.38, 118.50, 23.00 | Villa_lod1/render_white | 42 | 4.164 |
| 36.00, 120.92, -22.80 | Villa_lod1/render_white | 83 | 4.129 |
| 36.00, 121.37, -22.80 | Villa_lod1/render_white | 113 | 4.813 |
| 36.00, 121.83, -22.80 | Villa_lod1/render_white | 147 | 5.498 |
| 36.00, 122.29, -22.80 | Villa_lod1/render_white | 186 | 6.184 |
| 36.00, 121.37, -8.05 | Villa_lod1/render_white | 98 | 5.492 |
| 36.00, 122.75, -8.05 | Villa_lod1/render_white | 185 | 7.551 |
| 36.00, 123.43, -8.10 | Villa_lod1/render_white | 50 | 7.551 |
| 36.00, 121.97, -4.94 | Villa_lod1/render_white | 175 | 8.724 |
| 36.00, 121.98, -2.71 | Villa_lod1/render_white | 228 | 8.724 |
| 36.00, 121.98, -0.24 | Villa_lod1/render_white | 121 | 2.014 |
| 36.00, 121.98, 1.77 | Villa_lod1/render_white | 108 | 5.368 |
| 36.00, 121.97, 3.56 | Villa_lod1/render_white | 81 | 4.027 |
| 36.00, 121.98, 6.93 | Villa_lod1/render_white | 58 | 2.9 |
| 36.00, 121.97, 6.35 | Villa_lod1/render_white | 97 | 2.9 |
| 36.00, 119.80, 7.93 | Villa_lod1/render_white | 50 | 3.002 |
| 36.00, 120.60, 7.93 | Villa_lod1/render_white | 216 | 3.601 |
| 36.00, 121.97, 10.45 | Villa_lod1/render_white | 172 | 5.345 |
| 36.00, 121.98, 12.01 | Villa_lod1/render_white | 134 | 6.682 |
| 36.00, 121.97, 16.91 | Villa_lod1/render_white | 188 | 9.355 |
| 36.00, 121.98, 19.58 | Villa_lod1/render_white | 193 | 8.019 |
| 14.05, 119.80, 5.50 | Villa_lod1/render_white | 64 | 2.404 |
| 14.10, 118.70, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 118.70, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.10, 121.40, 15.17 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 121.40, 18.33 | Villa_lod1/render_white | 63 | 9.501 |
| 14.05, 120.53, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -21.20 | Villa_lod1/render_white | 43 | 6.401 |
| 14.05, 120.53, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 14.10, 122.67, -19.90 | Villa_lod1/render_white | 43 | 6.401 |
| 35.95, 119.53, -22.70 | Villa_lod1/render_white | 41 | 2.046 |
| 35.95, 119.99, -22.70 | Villa_lod1/render_white | 73 | 2.724 |
| 35.95, 120.44, -22.70 | Villa_lod1/render_white | 113 | 3.403 |
| 35.95, 124.29, -22.70 | Villa_lod1/render_white | 41 | 2.046 |

(5583 more in the JSON)

## nonmanifold (warn, 64)

| at | part | uses |
|---|---|---|
| 12.95, 118.39, 8.99 | Villa_lod1/stone_blue | 4 |
| 13.99, 116.70, 10.79 | Villa_lod1/stone_blue | 4 |
| 9.51, 116.56, 16.70 | Villa_lod1/stone_blue | 4 |
| 43.34, 118.39, -14.97 | Villa_lod1/stone_blue | 4 |
| 38.15, 118.39, 0.97 | Villa_lod1/stone_blue | 4 |
| 43.34, 118.39, 0.97 | Villa_lod1/stone_blue | 4 |
| 38.52, 118.39, -14.97 | Villa_lod1/stone_blue | 4 |
| 44.85, 117.28, 5.00 | Villa_lod1/stone_blue | 4 |
| 44.85, 117.27, -0.99 | Villa_lod1/stone_blue | 4 |
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
| 28.06, 118.85, -22.85 | Villa_lod1/metal_dark | 4 |
| 28.06, 120.80, -22.85 | Villa_lod1/metal_dark | 4 |
| 32.94, 118.85, -22.85 | Villa_lod1/metal_dark | 4 |

(24 more in the JSON)

## tjunction (warn, 1077)

| at | part | edge_m |
|---|---|---|
| 14.00, 118.40, -22.02 | Villa_lod1/render_white | 1.8 |
| 14.00, 124.80, -21.20 | Villa_lod1/render_white | 7.55 |
| 14.00, 118.40, -19.09 | Villa_lod1/render_white | 11.9 |
| 14.00, 124.80, -19.90 | Villa_lod1/render_white | 7.55 |
| 14.00, 119.00, -8.00 | Villa_lod1/render_white | 7.55 |
| 14.00, 118.40, -7.37 | Villa_lod1/render_white | 12.5 |
| 14.00, 122.00, -1.00 | Villa_lod1/render_white | 27.528 |
| 14.00, 118.40, 9.63 | Villa_lod1/render_white | 3.3 |
| 14.00, 118.70, 12.00 | Villa_lod1/render_white | 0.6 |
| 14.00, 119.38, 12.00 | Villa_lod1/render_white | 0.6 |
| 14.00, 120.05, 12.00 | Villa_lod1/render_white | 0.601 |
| 14.00, 120.72, 12.00 | Villa_lod1/render_white | 0.6 |
| 14.00, 118.40, 12.42 | Villa_lod1/render_white | 9.5 |
| 14.00, 118.40, 22.60 | Villa_lod1/render_white | 1.5 |
| 14.00, 118.70, 21.50 | Villa_lod1/render_white | 3 |
| 15.00, 118.40, -23.00 | Villa_lod1/render_white | 9.1 |
| 24.00, 118.40, -23.00 | Villa_lod1/render_white | 4.9 |
| 28.00, 118.85, -23.00 | Villa_lod1/render_white | 0.686 |
| 28.00, 120.80, -23.00 | Villa_lod1/render_white | 2.746 |
| 29.00, 118.40, -23.00 | Villa_lod1/render_white | 5 |
| 33.00, 124.58, -23.00 | Villa_lod1/render_white | 0.644 |
| 28.00, 121.83, -23.00 | Villa_lod1/render_white | 5.15 |
| 33.00, 118.85, -23.00 | Villa_lod1/render_white | 0.686 |
| 33.00, 120.80, -23.00 | Villa_lod1/render_white | 4.118 |
| 33.00, 124.66, -23.00 | Villa_lod1/render_white | 1.373 |
| 34.00, 118.40, -23.00 | Villa_lod1/render_white | 3 |
| 15.00, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 14.50, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 14.69, 122.00, 23.00 | Villa_lod1/render_white | 0.667 |
| 15.50, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 16.06, 122.00, 23.00 | Villa_lod1/render_white | 0.667 |
| 17.00, 118.40, 23.00 | Villa_lod1/render_white | 0.666 |
| 16.50, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 16.75, 122.00, 23.00 | Villa_lod1/render_white | 1.333 |
| 18.50, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 17.50, 118.40, 23.00 | Villa_lod1/render_white | 0.667 |
| 18.13, 122.00, 23.00 | Villa_lod1/render_white | 2.667 |
| 19.00, 118.40, 23.00 | Villa_lod1/render_white | 2.666 |
| 20.88, 122.00, 23.00 | Villa_lod1/render_white | 2.666 |
| 21.50, 118.40, 23.00 | Villa_lod1/render_white | 2.667 |

(1037 more in the JSON)

## degenerate (warn, 6)

| at | part | edge |
|---|---|---|
| 36.00, 125.58, -8.84 | Villa_lod1/render_white | 1.5757 |
| 23.65, 116.97, 16.00 | Villa_lod1/render_white | 1.156 |
| 23.81, 115.47, 16.00 | Villa_lod1/render_white | 1.6098 |
| 26.69, 116.11, 16.00 | Villa_lod1/render_white | 1.6114 |
| 42.78, 121.25, 11.00 | Villa_lod1/concrete_soffit | 1.8631 |
| 42.12, 121.47, 6.40 | Villa_lod1/concrete_soffit | 1.3184 |

## seam (info, 328)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 45.57, 117.27, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.91 | 48 | 20.6 |
| 37.50, 122.00, 0.20 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 23.2 | 44 | 90 |
| 14.68, 122.00, 23.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 20.73 | 42 | 90 |
| 12.30, 126.00, -0.94 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 71.3 | 31 | 90 |
| 45.22, 117.90, -0.99 | Villa_lod1/stone_blue + Villa_lod1/stone_blue | 7.29 | 29 | 22.1 |
| 37.40, 125.40, 0.27 | Villa_lod1/wood_cladding + Villa_lod1/metal_dark | 23.08 | 28 | 45 |
| 37.35, 123.90, 0.00 | Villa_lod1/wood_cladding + Villa_lod1/glass_window | 45.99 | 27 | 90 |
| 35.85, 119.29, 22.70 | Villa_lod1/render_white + Villa_lod1/glass_window | 23.08 | 22 | 90 |
| 14.04, 122.00, 23.50 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 14 | 20 | 90 |
| 36.00, 122.00, -7.58 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 12.75 | 19 | 90 |
| 36.00, 122.00, 9.10 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 14.7 | 19 | 90 |
| 43.65, 118.40, 15.14 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.18 | 16 | 89.9 |
| 36.00, 119.08, -22.70 | Villa_lod1/render_white + Villa_lod1/render_white | 6.12 | 15 | 90 |
| 33.00, 119.71, 22.85 | Villa_lod1/render_white + Villa_lod1/glass_window | 11.75 | 15 | 90 |
| 12.00, 122.00, -4.62 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 27 | 15 | 90 |
| 35.90, 118.61, 22.70 | Villa_lod1/render_white + Villa_lod1/metal_dark | 3.64 | 14 | 45 |
| 37.50, 122.00, -6.95 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 7.8 | 14 | 90 |
| 14.30, 125.70, -19.94 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 35.78 | 13 | 90 |
| 28.22, 122.00, 23.50 | Villa_lod1/wood_cladding + Villa_lod1/concrete_soffit | 6 | 13 | 90 |
| 35.85, 121.89, 14.56 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 13 | 87.7 |
| 35.85, 121.12, -8.15 | Villa_lod1/render_white + Villa_lod1/glass_window | 26.96 | 12 | 90 |
| 35.85, 119.29, -7.85 | Villa_lod1/render_white + Villa_lod1/glass_window | 16.3 | 12 | 90 |
| 24.53, 118.05, 16.00 | Villa_lod1/render_white + Villa_lod1/concrete_soffit | 3.83 | 12 | 90 |
| 43.66, 118.40, 6.86 | Villa_lod1/stone_blue + Villa_lod1/metal_dark | 1.17 | 12 | 89.9 |
| 35.85, 121.94, 22.64 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 7.2 | 12 | 87.6 |
| 35.85, 121.89, 16.14 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.96 | 12 | 87.6 |
| 32.94, 118.70, 22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 17.86 | 12 | 87.1 |
| 24.06, 121.40, 22.85 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 17.87 | 12 | 85.4 |
| 12.15, 124.94, 19.17 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 3.86 | 12 | 86.7 |
| 37.35, 122.46, 8.89 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.86 | 12 | 87.7 |
| 37.35, 122.46, 10.68 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.86 | 12 | 87.7 |
| 37.35, 125.34, 19.66 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.87 | 12 | 90 |
| 28.06, 123.00, 23.35 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 11.86 | 12 | 85.6 |
| 28.06, 125.00, 23.35 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 11.86 | 12 | 85 |
| 12.00, 126.30, -5.31 | Villa_lod1/wood_cladding + Villa_lod1/metal_dark | 27 | 11 | 90 |
| 14.15, 121.38, 4.56 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 6.1 | 11 | 85.4 |
| 14.15, 121.40, 21.50 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.5 | 11 | 87.6 |
| 14.15, 121.34, 19.15 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.27 | 11 | 87.4 |
| 14.15, 118.76, 20.34 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 5.27 | 11 | 87.4 |
| 35.85, 121.93, 4.84 | Villa_lod1/metal_dark + Villa_lod1/glass_window | 7.2 | 11 | 85.2 |

(288 more in the JSON)

## opening (info, 1418)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 125.90, -21.20 | Villa_lod1/render_white | -1 + 0 + 0 | 1.15 |
| 14.00, 125.90, -19.90 | Villa_lod1/render_white | -1 + 0 + 0 | 1.15 |
| 14.00, 120.85, -8.00 | Villa_lod1/render_white | -1 + 0 + 0 | 1.2 |
| 14.00, 118.45, -8.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 119.05, -8.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 119.65, -8.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.601 |
| 14.00, 120.75, -8.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 118.45, 12.00 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 118.65, 21.50 | Villa_lod1/render_white | -1 + 0 + 0 | 0.3 |
| 28.00, 125.90, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 4.118 |
| 28.00, 118.46, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.449 |
| 33.00, 118.46, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.449 |
| 33.00, 121.39, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.644 |
| 33.00, 121.49, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 1.932 |
| 33.00, 123.43, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.644 |
| 33.00, 124.72, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.645 |
| 33.00, 125.36, -23.00 | Villa_lod1/render_white | 0 + 0 + -1 | 0.644 |
| 24.00, 118.45, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.3 |
| 30.28, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.692 |
| 32.36, 118.40, 23.00 | Villa_lod1/render_white | 0 + 0 + 1 | 0.691 |
| 36.00, 118.40, -22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 36.00, 125.53, -22.70 | Villa_lod1/render_white | 1 + 0 + 0 | 0.375 |
| 36.00, 125.90, -22.70 | Villa_lod1/render_white | 1 + 0 + 0 | 0.375 |
| 36.00, 125.88, -9.41 | Villa_lod1/render_white | 1 + 0 + 0 | 0.788 |
| 36.00, 125.55, -8.80 | Villa_lod1/render_white | 1 + 0 + 0 | 0.788 |
| 36.00, 125.25, -8.15 | Villa_lod1/render_white | 1 + 0 + 0 | 0.75 |
| 36.00, 118.45, -8.00 | Villa_lod1/render_white | 1 + 0 + 0 | 1.199 |
| 36.00, 121.97, -7.85 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 4.90 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 5.00 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 7.90 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 121.97, 22.70 | Villa_lod1/render_white | 1 + 0 + 0 | 0.05 |
| 36.00, 118.40, 22.95 | Villa_lod1/render_white | 1 + 0 + 0 | 0.3 |
| 14.00, 118.75, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.675 |
| 14.00, 119.42, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.675 |
| 14.00, 120.10, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.675 |
| 14.00, 121.35, 21.50 | Villa_lod1/render_white | 0 + 0 + -1 | 0.676 |
| 14.00, 118.45, -21.20 | Villa_lod1/render_white | 0 + 0 + 1 | 6.399 |
| 14.00, 124.75, -19.90 | Villa_lod1/render_white | 0 + 0 + -1 | 6.399 |
| 36.00, 118.45, -22.70 | Villa_lod1/render_white | 0 + 0 + 1 | 0.68 |

(1378 more in the JSON)

## backtoback (info, 428)

| at | parts | area |
|---|---|---|
| 14.11, 118.72, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00336 |
| 14.12, 118.54, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00911 |
| 14.13, 120.32, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.09347 |
| 14.14, 118.90, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02315 |
| 14.11, 118.95, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00214 |
| 14.13, 118.63, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00208 |
| 14.12, 121.34, 5.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00404 |
| 14.15, 118.40, 4.52 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00008 |
| 14.13, 118.40, 5.29 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01014 |
| 14.13, 118.40, 4.87 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02561 |
| 14.13, 118.40, 5.46 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.0022 |
| 14.13, 118.40, 4.53 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00185 |
| 14.13, 121.40, 4.54 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00193 |
| 14.13, 121.40, 4.51 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00066 |
| 14.13, 121.40, 5.13 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02649 |
| 14.13, 121.40, 4.71 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01005 |
| 14.12, 118.77, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00461 |
| 14.13, 119.54, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.07273 |
| 14.12, 120.51, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00395 |
| 14.12, 120.65, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00371 |
| 14.14, 121.09, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01919 |
| 14.11, 120.97, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00708 |
| 14.12, 121.34, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00396 |
| 14.11, 121.27, 12.00 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00061 |
| 14.11, 119.13, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00707 |
| 14.14, 119.01, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01916 |
| 14.11, 118.83, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00061 |
| 14.12, 118.76, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00396 |
| 14.12, 119.79, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.01949 |
| 14.14, 119.73, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00674 |
| 14.12, 119.45, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00371 |
| 14.14, 119.41, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00103 |
| 14.13, 120.36, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02623 |
| 14.13, 120.10, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00474 |
| 14.13, 121.11, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.02609 |
| 14.12, 120.79, 21.50 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00475 |
| 14.12, 121.40, 20.49 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.06418 |
| 14.13, 121.40, 21.48 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00178 |
| 14.13, 121.40, 21.45 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.00066 |
| 14.12, 119.06, -21.20 | Villa_lod1/render_white + Villa_lod1/metal_dark | 0.04479 |

(388 more in the JSON)


Nodes: Villa_lod1. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.443 mm. Offset 0,100,0.
