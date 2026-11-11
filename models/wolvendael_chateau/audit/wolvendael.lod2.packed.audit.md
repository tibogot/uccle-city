# Mesh audit (packed): wolvendael.lod2

6,213 triangles, 4,602 welded vertices, 1,955 open edges, 662,168 rays, 3903 ms.

**148 blocking**, 896 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 34 |
| depth | block | 2 |
| crossing | block | 102 |
| leak | block | 10 |
| sliver | warn | 517 |
| nonmanifold | warn | 342 |
| tjunction | warn | 37 |
| seam | info | 1536 |
| opening | info | 110 |
| backtoback | info | 882 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 34)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 10.72, 51.22, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 457.6 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 10.70, 51.70, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 583.3 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 9.56, 51.23, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 590.4 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 9.57, 51.56, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 575.8 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 8.46, 51.22, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 457.6 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 8.44, 51.70, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 583.3 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 7.30, 51.23, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 590.4 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 7.31, 51.60, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 575.8 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 6.20, 51.22, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 457.6 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 6.18, 51.70, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 583.3 | 2.5 | 2000 | 15.45 | false | -1 + -0.04 + 0 |
| 5.04, 51.23, -11.19 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 590.4 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 5.05, 51.60, -11.16 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 0 | 575.8 | 2.5 | 2000 | 15.45 | false | 1 + -0.04 + 0 |
| 20.51, 53.65, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1668.5 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.49, 54.21, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1529.9 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.50, 56.86, -2.74 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 138.6 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| 20.47, 52.53, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1684.9 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.47, 55.19, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1543.7 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.47, 56.86, -11.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 141.2 | 0 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 5.13, 54.49, -2.88 | Chateau_lod2/stone_white + Chateau_lod2/wood_frame_white | 0 | 9.3 | 3.7 | 2000 | 15.45 | false | -0.05 + -1 + -0.04 |
| -0.57, 53.65, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1674.6 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -0.58, 55.19, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1535.1 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -0.58, 56.86, 3.37 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 139.5 | 0 | 2000 | 15.45 | false | 0 + 0 + 1 |
| -12.66, 53.65, 3.41 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1676.7 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.66, 54.21, 3.39 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1536.8 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.66, 56.86, 3.40 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 139.8 | 0 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -12.70, 53.65, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1668.5 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| -12.69, 55.19, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 1530 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| -12.69, 56.86, -11.34 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0 | 138.5 | 0 | 2000 | 15.45 | false | 0 + 0 + -1 |
| -5.59, 49.94, 7.52 | Chateau_lod2/stone_white + Chateau_lod2/wood_frame_white | 0 | 7.1 | 3.9 | 2000 | 15.45 | false | -0.05 + -1 + -0.05 |
| 20.38, 59.54, -8.74 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 182.2 | 2.4 | 2000 | 15.45 | false | 1 + 0 + 0 |
| 20.38, 59.54, -5.10 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 25.8 | 3 | 2000 | 15.45 | false | 1 + 0 + 0 |
| -12.56, 59.55, -2.02 | Chateau_lod2/slate + Chateau_lod2/wood_frame_white | 0 | 138.8 | 3.9 | 2000 | 15.45 | false | -1 + 0 + 0 |
| -2.46, 60.35, -10.10 | Chateau_lod2/zinc_roof + Chateau_lod2/zinc_roof | 0 | 33.3 | 0.2 | 2000 | 15.45 | false | -0.84 + -0.41 + 0.35 |
| -1.94, 60.85, -9.52 | Chateau_lod2/zinc_roof + Chateau_lod2/zinc_roof | 0 | 33.7 | 0.2 | 2000 | 15.45 | false | 0.85 + -0.41 + 0.34 |

## depth (block, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 5.07, 54.49, -2.88 | Chateau_lod2/stone_white + Chateau_lod2/wood_frame_white | 2.08 | 14.2 | 3.7 | 2000 | 15.45 | false | -0.05 + -1 + -0.04 |
| -5.64, 49.94, 7.52 | Chateau_lod2/stone_white + Chateau_lod2/wood_frame_white | 2.07 | 13.5 | 3.9 | 2000 | 15.45 | false | -0.05 + -1 + -0.05 |

## crossing (block, 102)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 20.49, 50.31, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| 20.49, 56.99, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.2 |
| 20.49, 56.99, -7.58 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 10.2 | 45.1 |
| 20.49, 57.01, -7.88 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 10.2 | 15.2 |
| 20.49, 57.00, -3.06 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 0.8 |
| -0.59, 50.31, 3.04 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 2 |
| -0.59, 56.99, 3.04 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 5.2 | 1.1 |
| -0.59, 56.99, 0.02 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 10.2 | 22.3 |
| -0.59, 57.00, -0.19 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 10.2 | 20.1 |
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
| -0.56, 51.83, 3.31 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 5.2 | 0.9 |
| -0.56, 51.74, 3.31 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 5.2 | 15.1 |
| 20.54, 50.25, -5.48 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8 | 95.1 |
| 20.54, 50.25, -4.86 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8 | 28.9 |
| 20.54, 50.25, -8.88 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8 | 95.1 |
| 20.54, 50.25, -8.27 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8 | 28.9 |
| 0.59, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 95.1 |
| -0.03, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |
| 3.49, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 95.1 |
| 2.87, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |
| 5.76, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 95.1 |
| 5.14, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |
| 8.05, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 115.1 |
| 7.30, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 34.9 |
| 9.90, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 18.6 |
| 9.66, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |
| 10.38, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 76.5 |
| 12.55, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 95.1 |
| 11.93, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |
| 15.46, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 95.1 |
| 14.84, 50.25, -2.67 | Chateau_lod2/stone_white + Chateau_lod2/stone_blue | 8.2 | 28.9 |

(62 more in the JSON)

## leak (block, 10)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| -6.46, 59.51, -11.24 | Chateau_lod2/slate | 12 | 0 + 0 + -1 | 0.35 |
| 20.38, 59.48, -9.01 | Chateau_lod2/slate | 12 | 1 + 0 + 0 | 0.35 |
| 5.35, 59.48, -2.83 | Chateau_lod2/slate | 12 | 0 + 0 + 1 | 0.35 |
| 5.45, 59.50, -2.83 | Chateau_lod2/slate | 12 | 0 + 0 + 1 | 0.234 |
| -12.56, 59.45, -6.18 | Chateau_lod2/slate | 12 | -1 + 0 + 0 | 0.35 |
| -12.56, 59.47, -1.84 | Chateau_lod2/slate | 12 | -1 + 0 + 0 | 0.35 |
| -12.56, 59.44, -1.74 | Chateau_lod2/slate | 12 | -1 + 0 + 0 | 0.234 |
| 10.27, 59.50, -11.27 | Chateau_lod2/wood_frame_white | 30 | 0.07 + 0.45 + -0.89 | 0.35 |
| 20.40, 59.48, -9.01 | Chateau_lod2/wood_frame_white | 12 | 1 + 0 + 0 | 0.35 |
| -12.59, 59.44, -1.74 | Chateau_lod2/wood_frame_white | 12 | -1 + 0 + 0 | 0.234 |

## sliver (warn, 517)

| at | part | aspect | longest |
|---|---|---|---|
| 20.49, 52.54, -2.73 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| 20.49, 54.76, -2.73 | Chateau_lod2/render_white_lime | 333 | 6.661 |
| 20.49, 57.00, -5.11 | Chateau_lod2/render_white_lime | 226 | 6.61 |
| 20.49, 50.36, -4.66 | Chateau_lod2/render_white_lime | 98 | 2.641 |
| 20.49, 50.36, -5.79 | Chateau_lod2/render_white_lime | 177 | 4.86 |
| 20.49, 50.36, -6.92 | Chateau_lod2/render_white_lime | 515 | 6.04 |
| 20.49, 50.30, -5.60 | Chateau_lod2/render_white_lime | 124 | 8.07 |
| 20.49, 50.34, -7.80 | Chateau_lod2/render_white_lime | 125 | 7.5 |
| 20.49, 50.27, -8.48 | Chateau_lod2/render_white_lime | 124 | 8.64 |
| 20.49, 50.30, -8.29 | Chateau_lod2/render_white_lime | 1876 | 8.64 |
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
| -0.59, 50.29, 0.53 | Chateau_lod2/render_white_lime | 47 | 6.11 |

(477 more in the JSON)

## nonmanifold (warn, 342)

| at | part | uses |
|---|---|---|
| 20.52, 53.65, -2.74 | Chateau_lod2/stone_white | 3 |
| 20.47, 53.65, -11.39 | Chateau_lod2/stone_white | 3 |
| 20.43, 54.50, -9.42 | Chateau_lod2/stone_white | 3 |
| 20.43, 54.50, -8.06 | Chateau_lod2/stone_white | 3 |
| 19.46, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 15.99, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 11.73, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 10.82, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 9.46, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 8.56, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 4.94, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 4.03, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| 1.13, 54.50, -2.79 | Chateau_lod2/stone_white | 3 |
| -0.56, 53.65, 3.37 | Chateau_lod2/stone_white | 3 |
| -0.66, 54.50, 1.01 | Chateau_lod2/stone_white | 3 |
| -12.66, 53.65, 3.42 | Chateau_lod2/stone_white | 3 |
| -12.71, 53.65, -11.34 | Chateau_lod2/stone_white | 3 |
| -12.62, 54.50, -8.84 | Chateau_lod2/stone_white | 3 |
| -12.62, 54.50, -10.20 | Chateau_lod2/stone_white | 3 |
| -12.62, 54.50, -6.51 | Chateau_lod2/stone_white | 3 |
| -12.62, 47.75, -8.98 | Chateau_lod2/stone_white | 3 |
| -12.62, 47.75, -10.06 | Chateau_lod2/stone_white | 3 |
| -12.62, 47.75, -5.29 | Chateau_lod2/stone_white | 3 |
| -12.62, 47.75, -6.37 | Chateau_lod2/stone_white | 3 |
| -12.62, 47.75, -1.60 | Chateau_lod2/stone_white | 3 |
| 9.46, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| 10.82, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| 4.94, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| 4.03, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| -0.23, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| -11.39, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| -10.04, 54.50, -11.29 | Chateau_lod2/stone_white | 3 |
| -5.77, 49.95, 7.62 | Chateau_lod2/stone_white | 3 |
| -6.55, 49.95, 6.50 | Chateau_lod2/stone_white | 3 |
| -2.44, 60.86, -9.53 | Chateau_lod2/zinc_roof | 4 |
| -2.47, 60.36, -10.12 | Chateau_lod2/zinc_roof | 4 |
| -1.96, 60.38, -10.10 | Chateau_lod2/zinc_roof | 4 |
| -1.93, 60.88, -9.51 | Chateau_lod2/zinc_roof | 4 |
| 20.31, 56.27, -8.21 | Chateau_lod2/wood_frame_white | 4 |
| 20.31, 54.49, -8.21 | Chateau_lod2/wood_frame_white | 4 |

(302 more in the JSON)

## tjunction (warn, 37)

| at | part | edge_m |
|---|---|---|
| 9.90, 52.95, -11.36 | Chateau_lod2/render_white_lime | 1.199 |
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
| 15.31, 59.52, -11.24 | Chateau_lod2/slate | 0.906 |
| 10.14, 59.52, -11.24 | Chateau_lod2/slate | 0.906 |
| 0.45, 59.52, -11.24 | Chateau_lod2/slate | 1.12 |
| -6.42, 59.52, -11.24 | Chateau_lod2/slate | 1.12 |
| 20.38, 59.52, -9.20 | Chateau_lod2/slate | 0.906 |
| 20.38, 59.52, -5.34 | Chateau_lod2/slate | 0.906 |
| 14.97, 59.52, -2.83 | Chateau_lod2/slate | 0.56 |
| 10.14, 59.52, -2.83 | Chateau_lod2/slate | 0.793 |
| 5.62, 59.52, -2.83 | Chateau_lod2/slate | 1.12 |
| -12.56, 59.52, -5.83 | Chateau_lod2/slate | 0.911 |
| -0.72, 51.85, 3.20 | Chateau_lod2/slate | 4.53 |
| -6.56, 51.85, 3.20 | Chateau_lod2/slate | 4.53 |

## seam (info, 1536)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 20.49, 53.76, -2.73 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 174.78 | 345 | 90 |
| 20.49, 50.32, -2.73 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 115.46 | 89 | 90 |
| 20.49, 56.98, -8.25 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 42.13 | 42 | 22 |
| 11.11, 53.32, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 14.71 | 40 | 76.7 |
| -0.16, 50.38, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 25 | 90 |
| 2.75, 50.38, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 25 | 90 |
| -12.68, 50.26, 0.93 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 25 | 90 |
| 6.14, 52.60, -11.20 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.69 | 25 | 22.7 |
| 10.66, 52.60, -11.20 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.65 | 24 | 22.7 |
| 8.40, 52.60, -11.20 | Chateau_lod2/render_white_lime + Chateau_lod2/wood_frame_white | 1.65 | 24 | 22.7 |
| -0.04, 59.37, -11.13 | Chateau_lod2/wood_frame_white + Chateau_lod2/wood_frame_white | 1.33 | 24 | 12.9 |
| 10.58, 59.33, -2.97 | Chateau_lod2/wood_frame_white + Chateau_lod2/wood_frame_white | 1.4 | 24 | 12.9 |
| -12.43, 59.33, -5.39 | Chateau_lod2/wood_frame_white + Chateau_lod2/wood_frame_white | 1.41 | 24 | 12.9 |
| 20.49, 50.38, -4.74 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 23 | 90 |
| 14.70, 50.28, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 23 | 90 |
| 8.53, 50.25, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 23 | 87.5 |
| -11.34, 50.25, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 23 | 90 |
| -12.68, 50.28, -2.76 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 22 | 90 |
| 20.37, 57.93, -7.11 | Chateau_lod2/stone_white + Chateau_lod2/slate | 94.89 | 22 | 65.7 |
| 5.17, 59.36, -11.13 | Chateau_lod2/wood_frame_white + Chateau_lod2/wood_frame_white | 1.47 | 22 | 21.5 |
| 5.02, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 21 | 74.1 |
| 6.27, 50.38, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 21 | 87.5 |
| -9.19, 50.26, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 21 | 90 |
| -7.04, 50.26, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 21 | 90 |
| -0.17, 50.28, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 21 | 90 |
| 20.49, 54.49, -8.14 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 5.00, 50.38, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 20 | 90 |
| 11.79, 50.33, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 20 | 90 |
| 11.81, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 18.18, 54.49, -2.72 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -0.59, 54.49, 0.93 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -11.32, 50.38, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 20 | 90 |
| -9.17, 54.45, 3.39 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.66 | 20 | 74.1 |
| -12.68, 54.49, 0.95 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 19.41, 50.38, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 20 | 90 |
| 15.91, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 9.49, 50.26, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_blue | 0.72 | 20 | 87.5 |
| 13.00, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| 3.94, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |
| -2.43, 54.49, -11.36 | Chateau_lod2/render_white_lime + Chateau_lod2/stone_white | 2.9 | 20 | 87.5 |

(1496 more in the JSON)

## opening (info, 110)

| at | part | facing | edge_m |
|---|---|---|---|
| 20.49, 50.37, -2.72 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 6.661 |
| -0.59, 52.26, 3.39 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 6.661 |
| -12.68, 50.37, 3.39 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 6.661 |
| -12.68, 50.37, -11.36 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 6.661 |
| 20.49, 50.37, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 6.661 |
| 10.71, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.62 |
| 10.08, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.235 |
| 9.62, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.344 |
| 8.35, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.518 |
| 7.41, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.518 |
| 5.91, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.343 |
| 5.08, 52.95, -11.36 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.59 |
| 20.52, 48.77, -2.74 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 8.7 |
| -0.51, 48.92, -2.69 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 21.08 |
| -0.56, 48.88, 3.37 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 6.11 |
| -12.47, 47.80, -6.28 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 0.8 |
| -12.47, 48.50, -5.38 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.8 |
| -12.47, 48.55, -6.23 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 0.9 |
| -12.47, 47.80, -2.59 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 0.8 |
| -12.47, 48.50, -1.69 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.8 |
| -12.47, 48.55, -2.54 | Chateau_lod2/render_white_lime | 0 + -1 + 0 | 0.9 |
| 4.28, 48.72, -15.56 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.33 |
| 4.33, 48.72, -11.46 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 4.25 |
| 4.00, 48.72, -11.36 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 4.25 |
| 11.70, 48.72, -15.56 | Chateau_lod2/render_white_lime | 0 + 0 + -1 | 0.33 |
| 11.75, 48.72, -11.36 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 4.25 |
| 11.42, 48.72, -11.46 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 4.25 |
| -0.66, 48.88, 7.63 | Chateau_lod2/render_white_lime | 1 + 0 + 0 | 4.54 |
| -0.71, 48.88, 7.68 | Chateau_lod2/render_white_lime | 0 + 0 + 1 | 5.96 |
| -6.62, 48.88, 7.63 | Chateau_lod2/render_white_lime | -1 + 0 + 0 | 4.54 |
| 20.47, 56.95, -2.74 | Chateau_lod2/stone_white | 0 + 0 + 1 | 6.7 |
| 20.52, 54.50, -9.42 | Chateau_lod2/stone_white | 0 + 0 + -1 | 0.27 |
| 20.56, 54.50, -8.06 | Chateau_lod2/stone_white | 0 + 0 + 1 | 0.012 |
| 19.46, 54.50, -2.69 | Chateau_lod2/stone_white | 1 + 0 + 0 | 0.27 |
| 15.99, 54.50, -2.69 | Chateau_lod2/stone_white | 1 + 0 + 0 | 0.27 |
| 11.73, 54.50, -2.65 | Chateau_lod2/stone_white | -1 + 0 + 0 | 0.012 |
| 10.82, 54.50, -2.69 | Chateau_lod2/stone_white | 1 + 0 + 0 | 0.27 |
| 9.46, 54.50, -2.65 | Chateau_lod2/stone_white | -1 + 0 + 0 | 0.012 |
| 8.56, 54.50, -2.69 | Chateau_lod2/stone_white | 1 + 0 + 0 | 0.27 |
| 7.20, 54.50, -2.71 | Chateau_lod2/stone_white | 0 + 1 + 0 | 0.258 |

(70 more in the JSON)

## backtoback (info, 882)

| at | parts | area |
|---|---|---|
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
| -0.62, 54.49, -0.17 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| -0.69, 54.50, 0.84 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |
| -0.55, 54.49, 0.17 | Chateau_lod2/stone_white + Chateau_lod2/stone_white | 0.09189 |

(842 more in the JSON)


Nodes: Chateau_lod2. Distances: {"Chateau":105,"Chateau_far":440,"Chateau_lod2":2000}. Quantum 0.189 mm. Offset 0,40,0.
