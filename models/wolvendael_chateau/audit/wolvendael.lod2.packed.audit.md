# Mesh audit (packed): wolvendael.lod2

4,556 triangles, 3,841 welded vertices, 1,685 open edges, 625,576 rays, 3992 ms.

**86 blocking**, 512 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 25 |
| depth | block | 2 |
| crossing | block | 36 |
| leak | block | 23 |
| sliver | warn | 345 |
| nonmanifold | warn | 138 |
| tjunction | warn | 29 |
| seam | info | 1149 |
| opening | info | 217 |
| backtoback | info | 1198 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 25)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 10.71, 51.39, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 610.4 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 9.57, 51.52, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 545.7 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 8.46, 51.39, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 610.4 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 7.31, 51.52, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 545.7 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 6.20, 51.39, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 610.4 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 5.05, 51.52, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 545.7 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 20.51, 53.65, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1668.5 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.49, 54.21, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1529.9 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.50, 56.86, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 138.6 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.47, 52.53, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1684.9 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.47, 55.19, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1543.7 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.47, 56.86, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 141.2 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -0.57, 53.65, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1674.6 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -0.58, 55.19, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1535.1 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -0.58, 56.86, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 139.5 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -12.66, 53.65, 3.41 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1676.7 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.66, 54.21, 3.39 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1536.8 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.66, 56.86, 3.40 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 139.8 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.70, 53.65, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1668.5 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| -12.69, 55.19, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1530 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| -12.69, 56.86, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 138.5 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| 20.38, 59.53, -8.83 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 100.1 | 2.4 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.38, 59.58, -5.19 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 1 | 3 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -12.56, 59.54, -2.01 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 83.3 | 3.9 | 2000 | 15.45 | false | -1 + 0 + 0 |
| 20.26, 59.09, -9.23 | Chateau_lod2/wood_frame_white + Chateau_lod2/glass_window | 0 | 5.5 | 4.2 | 2000 | 15.45 | false | 1 + -0.05 + -0.05 |

## depth (block, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 20.38, 59.55, -5.11 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 1.75 | 24.8 | 3 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 6.06, 59.36, -11.14 | Chateau_lod2/wood_frame_white + Chateau_lod2/wood_frame_white | 0.65 | 43.9 | 3.5 | 2000 | 15.45 | false | -0.06 + 0 + -1 |

## crossing (block, 36)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 20.49, 50.31, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| 20.49, 56.99, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.2 |
| 20.49, 57.00, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| -0.59, 50.31, 3.04 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| -0.59, 56.99, 3.04 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.1 |
| -0.59, 57.00, 3.04 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| -12.33, 50.31, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| -12.33, 56.99, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.1 |
| -12.33, 57.00, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| -12.68, 50.31, -11.01 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| -12.68, 56.99, -11.01 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.1 |
| -12.68, 57.00, -11.01 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| 20.14, 50.31, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| 20.14, 56.99, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.1 |
| 20.14, 57.00, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| 11.15, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 10.9 |
| 10.93, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 35 |
| 10.07, 50.35, -11.31 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 11.7 | 11.2 |
| 10.56, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 38 |
| 9.75, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 38.3 |
| 10.15, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 43.1 |
| 9.16, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 78.9 |
| 8.59, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 34.7 |
| 7.69, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 70.2 |
| 8.23, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 38 |
| 6.86, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 95 |
| 6.22, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 34.7 |
| 5.35, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 63.3 |
| 5.85, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 37.9 |
| 4.62, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 12.9 |
| 4.77, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 18.8 |
| 4.95, 53.45, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 8.8 | 16.2 |
| -0.56, 51.83, 3.31 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 5.2 | 0.9 |
| -0.56, 51.74, 3.31 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 5.2 | 15.1 |
| 5.02, 59.44, -11.24 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 11.4 | 0.1 |
| 5.14, 59.49, -11.24 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 11.4 | 24.8 |

## leak (block, 23)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 9.55, 50.38, -2.88 | Chateau_lod2/render_white_lime | 4 | 1 + 0 + 0 | 0.21 |
| 10.62, 50.38, -11.17 | Chateau_lod2/render_white_lime | 12 | 0.09 + 0.84 + -0.53 | 1.257 |
| 19.38, 50.38, -11.20 | Chateau_lod2/render_white_lime | 4 | -1 + 0 + 0 | 0.21 |
| 11.42, 50.22, -11.36 | Chateau_lod2/render_white_lime | 4 | -1 + 0 + 0 | 4.25 |
| 10.09, 59.51, -11.24 | Chateau_lod2/slate | 12 | 0 + 0 + -1 | 0.58 |
| 5.85, 59.46, -11.24 | Chateau_lod2/slate | 4 | 0 + 0 + -1 | 0.579 |
| 20.38, 59.48, -8.88 | Chateau_lod2/slate | 12 | 1 + 0 + 0 | 0.579 |
| 15.08, 59.46, -2.83 | Chateau_lod2/slate | 4 | 0 + 0 + 1 | 0.58 |
| 5.39, 59.46, -2.83 | Chateau_lod2/slate | 4 | 0 + 0 + 1 | 0.58 |
| -12.56, 59.51, -5.78 | Chateau_lod2/slate | 12 | -1 + 0 + 0 | 0.58 |
| -12.56, 59.46, -2.37 | Chateau_lod2/slate | 4 | -1 + 0 + 0 | 0.58 |
| -10.13, 60.85, -10.09 | Chateau_lod2/slate | 12 | 1 + 0 + 0 | 0.45 |
| -11.28, 60.85, -9.82 | Chateau_lod2/slate | 30 | -1 + 0 + 0 | 0.45 |
| 15.29, 59.44, -11.09 | Chateau_lod2/wood_frame_white | 30 | -0.09 + -0.41 + -0.91 | 0.622 |
| 0.22, 59.44, -11.27 | Chateau_lod2/wood_frame_white | 12 | -0.07 + 0.32 + -0.94 | 0.692 |
| 0.42, 59.44, -11.09 | Chateau_lod2/wood_frame_white | 12 | -0.08 + -0.37 + -0.93 | 0.622 |
| 20.40, 59.49, -8.83 | Chateau_lod2/wood_frame_white | 30 | 0.85 + 0.53 + 0 | 0.465 |
| 20.40, 59.41, -5.76 | Chateau_lod2/wood_frame_white | 12 | 1 + 0 + 0 | 0.579 |
| 20.40, 59.51, -5.29 | Chateau_lod2/wood_frame_white | 4 | 0.97 + 0.24 + 0.06 | 0.58 |
| 15.26, 59.49, -2.94 | Chateau_lod2/wood_frame_white | 4 | 0.13 + -0.56 + 0.82 | 0.666 |
| -12.59, 59.46, -2.37 | Chateau_lod2/wood_frame_white | 4 | -1 + 0 + 0 | 0.58 |
| 7.62, 52.78, -11.16 | Chateau_lod2/glass_window | 30 | 0 + 0 + -1 | 0.912 |
| 5.36, 52.78, -11.16 | Chateau_lod2/glass_window | 30 | 0 + 0 + -1 | 0.912 |

## sliver (warn, 345)

| at | part | aspect | longest |
|---|---|---|---|
| 20.49, 52.54, -2.73 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| 20.49, 54.76, -2.73 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| 20.49, 50.27, -5.79 | Chateau_lod2/render_white_lime | 124 | 8.64 |
| 20.49, 50.32, -6.47 | Chateau_lod2/render_white_lime | 111 | 8.07 |
| 20.49, 50.32, -9.36 | Chateau_lod2/render_white_lime | 97 | 5.431 |
| 20.49, 50.34, -7.35 | Chateau_lod2/render_white_lime | 285 | 6.611 |
| 20.49, 50.36, -8.29 | Chateau_lod2/render_white_lime | 177 | 4.86 |
| 20.49, 57.00, -5.11 | Chateau_lod2/render_white_lime | 226 | 6.61 |
| 20.49, 50.36, -9.42 | Chateau_lod2/render_white_lime | 98 | 2.641 |
| 20.49, 57.00, -10.49 | Chateau_lod2/render_white_lime | 69 | 2.03 |
| 0.86, 50.36, -2.72 | Chateau_lod2/render_white_lime | 48 | 1.851 |
| 1.13, 50.30, -2.72 | Chateau_lod2/render_white_lime | 206 | 2.866 |
| 1.13, 56.99, -2.72 | Chateau_lod2/render_white_lime | 492 | 2.865 |
| 3.75, 50.36, -2.72 | Chateau_lod2/render_white_lime | 116 | 2.756 |
| 2.63, 50.32, -2.72 | Chateau_lod2/render_white_lime | 450 | 6.801 |
| 4.50, 50.36, -2.72 | Chateau_lod2/render_white_lime | 219 | 3.935 |
| 6.13, 52.97, -2.72 | Chateau_lod2/render_white_lime | 77 | 2.13 |
| 4.14, 57.00, -2.72 | Chateau_lod2/render_white_lime | 386 | 11.32 |
| 4.26, 50.34, -2.72 | Chateau_lod2/render_white_lime | 487 | 7.751 |
| 7.17, 50.32, -2.72 | Chateau_lod2/render_white_lime | 167 | 14.075 |
| 5.06, 50.34, -2.72 | Chateau_lod2/render_white_lime | 452 | 9.191 |
| 11.13, 50.27, -2.72 | Chateau_lod2/render_white_lime | 302 | 21.08 |
| 10.54, 50.36, -2.72 | Chateau_lod2/render_white_lime | 418 | 4.885 |
| 11.26, 50.36, -2.72 | Chateau_lod2/render_white_lime | 219 | 3.936 |
| 12.01, 50.36, -2.72 | Chateau_lod2/render_white_lime | 116 | 2.756 |
| 12.77, 52.97, -2.72 | Chateau_lod2/render_white_lime | 47 | 1.666 |
| 12.76, 57.00, -2.72 | Chateau_lod2/render_white_lime | 114 | 3.325 |
| 16.01, 50.30, -2.72 | Chateau_lod2/render_white_lime | 1232 | 7.006 |
| 14.89, 50.36, -2.72 | Chateau_lod2/render_white_lime | 48 | 1.851 |
| 16.05, 50.36, -2.72 | Chateau_lod2/render_white_lime | 125 | 4.141 |
| 18.16, 50.30, -2.72 | Chateau_lod2/render_white_lime | 101 | 6.435 |
| 17.78, 50.34, -2.72 | Chateau_lod2/render_white_lime | 98 | 5.865 |
| 17.21, 50.36, -2.72 | Chateau_lod2/render_white_lime | 399 | 5.32 |
| 15.44, 56.76, -2.72 | Chateau_lod2/render_white_lime | 145 | 4.201 |
| 19.16, 52.97, -2.72 | Chateau_lod2/render_white_lime | 51 | 1.725 |
| 18.16, 57.00, -2.72 | Chateau_lod2/render_white_lime | 220 | 6.435 |
| -0.59, 52.54, 3.38 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| -0.59, 54.76, 3.38 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| -0.59, 50.32, 1.99 | Chateau_lod2/render_white_lime | 74 | 3.647 |
| -0.59, 50.36, 1.16 | Chateau_lod2/render_white_lime | 133 | 3.076 |

(305 more in the JSON)

## nonmanifold (warn, 138)

| at | part | uses |
|---|---|---|
| 20.52, 53.65, -2.74 | Chateau_lod2/stone_white | 3 |
| 20.47, 53.65, -11.39 | Chateau_lod2/stone_white | 3 |
| -0.56, 53.65, 3.37 | Chateau_lod2/stone_white | 3 |
| -12.66, 53.65, 3.42 | Chateau_lod2/stone_white | 3 |
| -12.71, 53.65, -11.34 | Chateau_lod2/stone_white | 3 |
| -1.96, 60.38, -10.10 | Chateau_lod2/zinc_roof | 4 |
| 20.31, 56.27, -8.21 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 56.23, -9.27 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 52.88, -8.21 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 52.88, -9.27 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 56.27, -4.82 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 56.27, -5.87 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 56.23, -5.34 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 52.92, -4.78 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 52.92, -5.90 | Chateau_lod2/wood_frame_white | 4 |
| 18.26, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 19.31, 56.27, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 18.26, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 19.31, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 14.79, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 15.84, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 14.79, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 15.84, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 11.88, 56.27, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 12.94, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 12.41, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 11.88, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 12.94, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 9.62, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 10.66, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 9.62, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 10.66, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 7.36, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 8.40, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 8.57, 52.54, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 5.09, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 6.14, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 5.09, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 6.14, 52.88, -2.90 | Chateau_lod2/wood_frame_white | 4 |
| 2.83, 56.23, -2.90 | Chateau_lod2/wood_frame_white | 4 |

(98 more in the JSON)

## tjunction (warn, 29)

| at | part | edge_m |
|---|---|---|
| 10.14, 52.95, -11.36 | Chateau_lod2/render_white_lime | 1.199 |
| 7.88, 52.95, -11.36 | Chateau_lod2/render_white_lime | 1.035 |
| 5.62, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0.933 |
| 20.52, 48.92, -2.69 | Chateau_lod2/render_white_lime | 1.416 |
| -0.56, 48.92, -2.69 | Chateau_lod2/render_white_lime | 1.313 |
| -0.56, 48.88, 3.42 | Chateau_lod2/render_white_lime | 3.472 |
| 20.52, 48.77, -11.39 | Chateau_lod2/render_white_lime | 3.694 |
| 20.47, 50.30, -11.34 | Chateau_lod2/stone_white | 0.6 |
| 20.47, 57.00, -11.34 | Chateau_lod2/stone_white | 0.6 |
| 20.47, 50.30, -2.74 | Chateau_lod2/stone_white | 0.6 |
| 20.47, 57.00, -2.74 | Chateau_lod2/stone_white | 0.6 |
| 7.20, 54.50, -2.66 | Chateau_lod2/stone_white | 0.27 |
| 6.30, 54.50, -2.66 | Chateau_lod2/stone_white | 0.27 |
| -0.61, 50.30, 3.37 | Chateau_lod2/stone_white | 0.6 |
| -0.61, 57.00, 3.37 | Chateau_lod2/stone_white | 0.6 |
| -10.04, 54.50, 3.45 | Chateau_lod2/stone_white | 0.27 |
| -11.39, 54.50, 3.45 | Chateau_lod2/stone_white | 0.27 |
| -9.24, 54.50, 3.45 | Chateau_lod2/stone_white | 0.27 |
| -12.66, 50.30, 3.37 | Chateau_lod2/stone_white | 0.6 |
| -12.66, 57.00, 3.37 | Chateau_lod2/stone_white | 0.6 |
| -12.66, 50.30, -11.34 | Chateau_lod2/stone_white | 0.6 |
| -12.66, 57.00, -11.34 | Chateau_lod2/stone_white | 0.6 |
| 4.00, 50.22, -11.31 | Chateau_lod2/stone_white | 0.39 |
| 11.42, 50.22, -11.31 | Chateau_lod2/stone_white | 0.39 |
| -4.49, 49.95, 7.74 | Chateau_lod2/stone_white | 0.27 |
| 0.45, 59.52, -11.24 | Chateau_lod2/slate | 1.12 |
| -6.42, 59.52, -11.24 | Chateau_lod2/slate | 1.12 |
| -0.72, 51.85, 3.20 | Chateau_lod2/slate | 4.53 |
| -6.56, 51.85, 3.20 | Chateau_lod2/slate | 4.53 |

## seam (info, 1149)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 10.66, 52.60, -11.20 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.63 | 23 | 22.7 |
| 8.41, 52.50, -11.15 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.67 | 23 | 24.7 |
| 20.37, 57.93, -7.11 | Chateau_lod2/stone_white + Chateau_lod2/slate | 94.89 | 22 | 65.7 |
| 5.02, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 21 | 74.1 |
| 6.14, 52.60, -11.20 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.62 | 21 | 27 |
| 20.49, 54.49, -8.14 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 11.81, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 18.18, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -0.59, 54.49, 0.93 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -9.17, 54.45, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.66 | 20 | 74.1 |
| -12.68, 54.49, 0.95 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 15.91, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 13.00, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -2.43, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -10.12, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 0.42, 50.33, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 1.9 | 19 | 55.2 |
| 3.07, 50.37, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 1.9 | 19 | 55.2 |
| -12.68, 50.26, 2.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 1.9 | 19 | 55.2 |
| 20.49, 54.49, -4.75 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 9.55, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| -11.31, 54.45, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.07 | 18 | 74.1 |
| -12.68, 54.49, -10.11 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| -12.68, 54.49, -6.42 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| -12.68, 54.49, -2.74 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 19.38, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 11.21, 53.53, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 7.79 | 18 | 76.7 |
| 10.78, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 8.52, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 3.94, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 1.04, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| -5.82, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 18 | 87.5 |
| 7.24, 54.45, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.66 | 17 | 74.1 |
| 15.70, 50.27, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 1.9 | 17 | 55.2 |
| -0.66, 51.67, 3.20 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 15.04 | 17 | 90 |
| -5.73, 49.94, 7.68 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.76 | 17 | 74.1 |
| -0.57, 51.67, 3.25 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.95 | 17 | 82.7 |
| -0.19, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 16 | 87.5 |
| 3.93, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 16 | 87.5 |
| 14.72, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 16 | 87.5 |
| 7.16, 51.77, -2.88 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_painted_grey | 8.81 | 16 | 90 |

(1109 more in the JSON)

## opening (info, 217)

| at | part | facing | edge_m |
|---|---|---|---|
| 20.49, 50.37, -2.72 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 6.661 |
| 20.28, 56.25, -9.33 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 1.8 |
| 20.28, 56.30, -8.99 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 20.28, 52.90, -9.33 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 2.57 |
| 20.28, 52.95, -8.99 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 20.28, 56.25, -5.93 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 1.8 |
| 20.28, 56.30, -5.29 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 20.28, 52.90, -5.93 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 2.57 |
| 20.28, 52.95, -5.29 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 14.87, 56.30, -2.93 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 14.72, 52.90, -2.93 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 2.57 |
| 15.90, 52.90, -2.93 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 2.57 |
| 14.87, 52.95, -2.93 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 13.00, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| 9.70, 56.30, -2.93 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 10.73, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| 8.60, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| 5.18, 56.30, -2.93 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| 6.21, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| 3.94, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| 1.03, 50.38, -2.77 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 0.21 |
| -0.59, 52.26, 3.39 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 6.661 |
| -12.68, 50.37, 3.39 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 6.661 |
| -11.30, 52.90, 3.18 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 2.57 |
| -10.13, 52.90, 3.18 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 2.57 |
| -11.16, 52.95, 3.18 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| -9.15, 52.90, 3.18 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 2.57 |
| -7.97, 52.90, 3.18 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 2.57 |
| -9.01, 52.95, 3.18 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| -12.68, 50.37, -11.36 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 6.661 |
| -12.63, 50.38, -8.93 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.21 |
| -12.47, 56.30, -5.88 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| -12.47, 52.90, -5.24 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 2.57 |
| -12.47, 52.95, -5.88 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 1.18 |
| -12.63, 50.38, -1.55 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.21 |
| 20.49, 50.37, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 6.661 |
| 10.71, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.62 |
| 9.61, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.579 |
| 8.35, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.518 |
| 7.41, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.518 |

(177 more in the JSON)

## backtoback (info, 1198)

| at | parts | area |
|---|---|---|
| 20.34, 56.30, -8.37 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0.00157 |
| 18.57, 56.30, -2.92 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0.02651 |
| -8.93, 56.30, 3.24 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0.0016 |
| 20.32, 54.50, -8.57 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09172 |
| 20.46, 54.49, -9.25 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09172 |
| 20.39, 54.50, -8.23 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09172 |
| 20.53, 54.49, -8.91 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09172 |
| 20.32, 54.50, -5.17 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09173 |
| 20.46, 54.49, -5.85 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09173 |
| 20.39, 54.50, -4.83 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09173 |
| 20.53, 54.49, -5.51 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09173 |
| 18.61, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09185 |
| 19.30, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09185 |
| 18.27, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09185 |
| 18.95, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09185 |
| 15.14, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09192 |
| 15.82, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09192 |
| 14.80, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09192 |
| 15.48, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09192 |
| 12.24, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 12.92, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 11.90, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 12.58, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 9.97, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 10.65, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 9.63, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 10.31, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09188 |
| 7.71, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.08973 |
| 8.39, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09407 |
| 5.11, 54.49, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09142 |
| 5.59, 54.46, -2.70 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.08271 |
| 3.18, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 3.86, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 2.84, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 3.52, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 0.28, 54.50, -2.89 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 0.95, 54.49, -2.75 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| -0.07, 54.50, -2.82 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| 0.61, 54.49, -2.68 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| -0.76, 54.50, 0.51 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |

(1158 more in the JSON)


Nodes: Chateau_lod2. Distances: {"Chateau":105,"Chateau_far":440,"Chateau_lod2":2000}. Quantum 0.189 mm. Offset 0,40,0.
