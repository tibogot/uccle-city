# Mesh audit: augustin.glb

2,696 triangles, 1,676 welded vertices, 674 open edges, 451,714 rays, 2571 ms.

**726 blocking**, 139 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 4 |
| leak | block | 32 |
| flipped | block | 105 |
| streak | block | 320 |
| bentflat | block | 265 |
| sliver | warn | 95 |
| nonmanifold | warn | 25 |
| tjunction | warn | 19 |
| seam | info | 109 |
| opening | info | 148 |
| backtoback | info | 459 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 4)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 15.02, 13.24, -11.94 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 11.7 | 121.1 |
| 15.54, 13.24, -10.85 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 11.7 | 119.9 |
| -14.21, 13.24, 13.16 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 8.9 | 64.4 |
| -13.36, 13.24, 14.01 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 8.9 | 176 |

## leak (block, 32)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 0.65, 44.30, -2.40 | Augustin_lod2/concrete_white | 4 | 0 + -0.04 + -1 | 1.2 |
| -0.65, 44.30, 2.40 | Augustin_lod2/concrete_white | 4 | 0 + -0.04 + 1 | 1.2 |
| 2.70, 47.87, 1.96 | Augustin_lod2/concrete_white | 12 | 0.61 + 0.01 + 0.79 | 0.462 |
| 2.70, 47.87, -1.96 | Augustin_lod2/concrete_white | 4 | 0.68 + 0.01 + -0.74 | 0.383 |
| -2.55, 47.87, -2.11 | Augustin_lod2/concrete_white | 4 | -0.14 + 0.01 + -0.99 | 0.81 |
| 23.32, 17.15, -4.22 | Augustin_lod2/concrete_white | 12 | 0.84 + 0.17 + -0.52 | 3.29 |
| 25.03, 17.15, -1.41 | Augustin_lod2/concrete_white | 4 | 0.99 + 0.02 + -0.15 | 1.262 |
| 25.20, 17.15, -0.16 | Augustin_lod2/concrete_white | 30 | 0.97 + 0.14 + 0.22 | 2.905 |
| 20.56, 17.15, 5.54 | Augustin_lod2/concrete_white | 4 | 0.16 + 0.01 + 0.99 | 1.838 |
| 29.34, 6.36, -3.70 | Augustin_lod2/concrete_white | 4 | 0.89 + 0.05 + -0.46 | 3.158 |
| 29.47, 6.36, -3.43 | Augustin_lod2/concrete_white | 4 | 0.97 + 0.03 + -0.23 | 2.075 |
| 29.94, 6.36, -1.41 | Augustin_lod2/concrete_white | 4 | 1 + 0.03 + -0.03 | 2.264 |
| 30.00, 6.36, 0.85 | Augustin_lod2/concrete_white | 30 | 0.99 + 0 + 0.17 | 1.992 |
| 16.36, 13.24, 8.89 | Augustin_lod2/concrete_white | 4 | 0.98 + 0.02 + 0.18 | 2.465 |
| 13.95, 13.24, 13.94 | Augustin_lod2/concrete_white | 4 | 0.79 + 0.02 + 0.61 | 2.389 |
| 13.82, 13.24, 14.08 | Augustin_lod2/concrete_white | 4 | 0.58 + 0.05 + 0.81 | 3.053 |
| 9.71, 13.24, 16.43 | Augustin_lod2/concrete_white | 4 | 0.34 + 0.02 + 0.94 | 1.818 |
| 9.31, 13.24, 16.47 | Augustin_lod2/concrete_white | 12 | 0.07 + 0.05 + 1 | 4.168 |
| 9.09, 13.24, -16.49 | Augustin_lod2/concrete_white | 4 | 0.19 + 0.02 + -0.98 | 2.381 |
| 15.09, 13.24, -12.43 | Augustin_lod2/concrete_white | 30 | 0.77 + 0.04 + -0.63 | 2.958 |
| 16.25, 13.24, -9.81 | Augustin_lod2/concrete_white | 12 | 0.99 + 0.02 + -0.1 | 2.658 |
| -10.00, 13.24, 16.16 | Augustin_lod2/concrete_white | 30 | -0.12 + 0.12 + 0.99 | 5.384 |
| -10.88, 13.24, 16.03 | Augustin_lod2/concrete_white | 12 | -0.53 + 0.03 + 0.85 | 3.053 |
| -13.47, 13.24, 14.41 | Augustin_lod2/concrete_white | 4 | -0.73 + 0.02 + 0.68 | 1.818 |
| -16.43, 13.24, -8.65 | Augustin_lod2/concrete_white | 4 | -1 + 0.01 + -0.09 | 1.705 |
| -16.36, 13.24, -9.35 | Augustin_lod2/concrete_white | 12 | -0.95 + 0.02 + -0.31 | 2.39 |
| -13.47, 13.24, -14.41 | Augustin_lod2/concrete_white | 12 | -0.73 + 0 + -0.68 | 1.818 |
| -13.40, 13.24, -14.48 | Augustin_lod2/concrete_white | 12 | -0.58 + 0 + -0.81 | 1.818 |
| -11.91, 13.24, -15.53 | Augustin_lod2/concrete_white | 30 | -0.41 + 0 + -0.91 | 1.818 |
| -8.68, 13.24, -16.63 | Augustin_lod2/concrete_white | 30 | -0.22 + 0 + -0.98 | 1.818 |
| -8.28, 13.24, -16.67 | Augustin_lod2/concrete_white | 30 | -0.02 + 0 + -1 | 3.03 |
| 15.28, 13.24, 12.20 | Augustin_lod2/roof_bitumen | 4 | 0 + 1 + 0 | 2.958 |

## flipped (block, 105)

| at | part | dot | area |
|---|---|---|---|
| 2.12, 20.35, 6.17 | Augustin_lod2/concrete_white | -0.89 | 1.97133 |
| -2.02, 20.30, 6.26 | Augustin_lod2/concrete_white | -0.79 | 2.06481 |
| 6.17, 20.35, -2.12 | Augustin_lod2/concrete_white | -0.89 | 1.97133 |
| 6.26, 20.30, 2.02 | Augustin_lod2/concrete_white | -0.79 | 2.06481 |
| -2.12, 20.35, -6.17 | Augustin_lod2/concrete_white | -0.89 | 1.97133 |
| 2.02, 20.30, -6.26 | Augustin_lod2/concrete_white | -0.79 | 2.06481 |
| -6.17, 20.35, 2.12 | Augustin_lod2/concrete_white | -0.89 | 1.97133 |
| -6.26, 20.30, -2.02 | Augustin_lod2/concrete_white | -0.79 | 2.06481 |
| 1.25, 39.45, 3.56 | Augustin_lod2/concrete_white | -0.89 | 1.12441 |
| -1.15, 39.40, 3.65 | Augustin_lod2/concrete_white | -0.79 | 1.21803 |
| 3.56, 39.45, -1.25 | Augustin_lod2/concrete_white | -0.89 | 1.12441 |
| 3.65, 39.40, 1.15 | Augustin_lod2/concrete_white | -0.79 | 1.21803 |
| -1.25, 39.45, -3.56 | Augustin_lod2/concrete_white | -0.89 | 1.12441 |
| 1.15, 39.40, -3.65 | Augustin_lod2/concrete_white | -0.79 | 1.21803 |
| -3.56, 39.45, 1.25 | Augustin_lod2/concrete_white | -0.89 | 1.12441 |
| -3.65, 39.40, -1.15 | Augustin_lod2/concrete_white | -0.79 | 1.21803 |
| 5.36, 39.01, -0.85 | Augustin_lod2/concrete_white | -0.89 | 0.73771 |
| 5.45, 38.96, 0.76 | Augustin_lod2/concrete_white | -0.79 | 0.83129 |
| 1.05, 32.66, 5.16 | Augustin_lod2/concrete_white | -0.89 | 0.93206 |
| -0.96, 32.61, 5.25 | Augustin_lod2/concrete_white | -0.79 | 1.02558 |
| -5.36, 39.01, 0.85 | Augustin_lod2/concrete_white | -0.89 | 0.73771 |
| -5.45, 38.96, -0.76 | Augustin_lod2/concrete_white | -0.79 | 0.83129 |
| -1.05, 32.66, -5.16 | Augustin_lod2/concrete_white | -0.89 | 0.93206 |
| 0.96, 32.61, -5.25 | Augustin_lod2/concrete_white | -0.79 | 1.02558 |
| 1.00, 48.83, 1.05 | Augustin_lod2/concrete_white | -0.89 | 0.88364 |
| -0.91, 48.78, 1.14 | Augustin_lod2/concrete_white | -0.79 | 0.97723 |
| 2.82, 48.83, -0.41 | Augustin_lod2/concrete_white | -0.89 | 0.30873 |
| 2.91, 48.78, 0.32 | Augustin_lod2/concrete_white | -0.79 | 0.40232 |
| -1.00, 48.83, -1.05 | Augustin_lod2/concrete_white | -0.89 | 0.88364 |
| 0.91, 48.78, -1.14 | Augustin_lod2/concrete_white | -0.79 | 0.97723 |
| -2.82, 48.83, 0.41 | Augustin_lod2/concrete_white | -0.89 | 0.30873 |
| -2.91, 48.78, -0.32 | Augustin_lod2/concrete_white | -0.79 | 0.40232 |
| 2.52, 47.86, -1.71 | Augustin_lod2/concrete_white | -0.49 | 0.05498 |
| 2.29, 47.86, -2.06 | Augustin_lod2/concrete_white | -0.45 | 0.14299 |
| -0.38, 50.41, 0.12 | Augustin_lod2/concrete_white | -0.37 | 0.12221 |
| -0.69, 50.36, 0.22 | Augustin_lod2/concrete_white | -0.71 | 0.1465 |
| -0.12, 50.41, 0.59 | Augustin_lod2/concrete_white | -0.44 | 0.16893 |
| -0.27, 50.36, 0.48 | Augustin_lod2/concrete_white | -0.79 | 0.10072 |
| 0.03, 50.36, 0.89 | Augustin_lod2/concrete_white | -0.79 | 0.11956 |
| 0.18, 50.41, 0.38 | Augustin_lod2/concrete_white | -0.4 | 0.10072 |

(65 more in the JSON)

## streak (block, 320)

| at | part | why | deg | area | spread | aspect | longest |
|---|---|---|---|---|---|---|---|
| 3.56, 32.67, -3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.66, 28.33, -3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.66, 32.67, -3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.56, 28.33, -3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.56, 32.67, 3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.66, 28.33, 3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.66, 32.67, 3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 3.56, 28.33, 3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| -3.56, 32.67, 3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| -3.66, 28.33, 3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| -3.66, 32.67, 3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| -3.56, 28.33, 3.23 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| -3.56, 32.67, -3.10 | Augustin_lod2/concrete_white | corner normal faces away | 88 | 1.9512 |  |  |  |
| -3.66, 28.33, -3.10 | Augustin_lod2/concrete_white | corner normal faces away | 90 | 3.2503 |  |  |  |
| -3.56, 28.33, -3.10 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 3.2509 |  |  |  |
| 4.72, 30.33, -2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.72, 26.67, -2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.60, 30.33, -2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.60, 26.67, -2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 5.41, 25.47, 0.55 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 11 | 5.82 |
| 5.41, 25.47, -1.12 | Augustin_lod2/concrete_white | corner normal faces away | 86 | 2.4186 |  |  |  |
| 4.60, 30.33, 2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.60, 26.67, 2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.72, 30.33, 2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| 4.72, 26.67, 2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -0.99, 27.53, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| -0.89, 24.67, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| -0.05, 27.53, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| 0.05, 24.67, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| 0.89, 27.53, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| 0.99, 24.67, 5.21 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 8.61 |
| -4.60, 30.33, -2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.60, 26.67, -2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.72, 30.33, -2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.72, 26.67, -2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.72, 30.33, 2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.72, 26.67, 2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.60, 30.33, 2.47 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -4.60, 26.67, 2.37 | Augustin_lod2/concrete_white | corner normal faces away | 89 | 2.5781 |  |  |  |
| -5.41, 28.93, -0.51 | Augustin_lod2/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 10.42 |

(280 more in the JSON)

## bentflat (block, 265)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 5.44, 29.70, 0.15 | Augustin_lod2/concrete_white | 70.1 | 0.462 | 0.46 |
| 5.44, 30.00, -0.15 | Augustin_lod2/concrete_white | 70.1 | 0.462 | 0.46 |
| -5.38, 34.97, 0.72 | Augustin_lod2/concrete_white | 78.9 | 1.9927 | 1.99 |
| -22.47, 3.77, -3.35 | Augustin_lod2/concrete_white | 80.5 | 0.8179 | 0.82 |
| -22.47, 3.77, 3.05 | Augustin_lod2/concrete_white | 80.5 | 0.8179 | 0.82 |
| -3.35, 3.77, 22.95 | Augustin_lod2/concrete_white | 80.5 | 0.8175 | 0.82 |
| 3.35, 3.77, -22.95 | Augustin_lod2/concrete_white | 80.5 | 0.8175 | 0.82 |
| -3.05, 3.77, -22.95 | Augustin_lod2/concrete_white | 80.5 | 0.8175 | 0.82 |
| 17.70, 6.97, 10.30 | Augustin_lod2/concrete_white | 78.5 | 0.6772 | 0.68 |
| 21.23, 6.97, 10.30 | Augustin_lod2/concrete_white | 78.5 | 0.6778 | 0.68 |
| 21.54, 6.97, -10.30 | Augustin_lod2/concrete_white | 78.5 | 0.6778 | 0.68 |
| 18.00, 6.97, -10.30 | Augustin_lod2/concrete_white | 78.5 | 0.6772 | 0.68 |
| 12.51, 9.27, 14.97 | Augustin_lod2/concrete_white | 78.6 | 1.2225 | 1.22 |
| -9.84, 9.27, 16.25 | Augustin_lod2/concrete_white | 60 | 0.7913 | 0.79 |
| -10.04, 9.93, 16.19 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -11.50, 9.27, 15.59 | Augustin_lod2/concrete_white | 60 | 0.7912 | 0.79 |
| -11.69, 9.93, 15.49 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -13.01, 9.27, 14.62 | Augustin_lod2/concrete_white | 60 | 0.7913 | 0.79 |
| -13.17, 9.93, 14.49 | Augustin_lod2/concrete_white | 60 | 0.7909 | 0.79 |
| -14.29, 9.27, 13.37 | Augustin_lod2/concrete_white | 60 | 0.7912 | 0.79 |
| -14.42, 9.93, 13.21 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -15.29, 9.27, 11.89 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -15.39, 9.93, 11.70 | Augustin_lod2/concrete_white | 60 | 0.7907 | 0.79 |
| -15.99, 9.27, 10.24 | Augustin_lod2/concrete_white | 60 | 0.7911 | 0.79 |
| -16.05, 9.93, 10.04 | Augustin_lod2/concrete_white | 60 | 0.7906 | 0.79 |
| -16.05, 9.27, -10.04 | Augustin_lod2/concrete_white | 60 | 0.7906 | 0.79 |
| -15.99, 9.93, -10.24 | Augustin_lod2/concrete_white | 60 | 0.7911 | 0.79 |
| -15.39, 9.27, -11.70 | Augustin_lod2/concrete_white | 60 | 0.7907 | 0.79 |
| -15.29, 9.93, -11.89 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -14.42, 9.27, -13.21 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -14.29, 9.93, -13.37 | Augustin_lod2/concrete_white | 60 | 0.7912 | 0.79 |
| -13.17, 9.27, -14.49 | Augustin_lod2/concrete_white | 60 | 0.7909 | 0.79 |
| -13.01, 9.93, -14.62 | Augustin_lod2/concrete_white | 60 | 0.7913 | 0.79 |
| -11.69, 9.27, -15.49 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -11.50, 9.93, -15.59 | Augustin_lod2/concrete_white | 60 | 0.7912 | 0.79 |
| -10.04, 9.27, -16.19 | Augustin_lod2/concrete_white | 60 | 0.7908 | 0.79 |
| -9.84, 9.93, -16.25 | Augustin_lod2/concrete_white | 60 | 0.7913 | 0.79 |
| 2.39, 41.10, 2.08 | Augustin_lod2/concrete_white | 41.5 | 2.1958 | 4.39 |
| 2.10, 42.70, 2.15 | Augustin_lod2/concrete_white | 41.5 | 2.1958 | 4.39 |
| 1.40, 41.10, 2.34 | Augustin_lod2/concrete_white | 8.8 | 2.9147 | 2.91 |

(225 more in the JSON)

## sliver (warn, 95)

| at | part | aspect | longest |
|---|---|---|---|
| -3.56, 32.67, -3.10 | Augustin_lod2/concrete_white | 43 | 13.01 |
| -3.66, 32.67, -2.96 | Augustin_lod2/concrete_white | 43 | 13.003 |
| 6.37, 18.63, 1.90 | Augustin_lod2/concrete_white | 97 | 13.013 |
| -3.37, 30.87, -3.76 | Augustin_lod2/concrete_white | 50 | 19.109 |
| 3.76, 32.15, -2.70 | Augustin_lod2/concrete_white | 47 | 18.66 |
| 3.76, 27.13, -3.36 | Augustin_lod2/concrete_white | 75 | 16.619 |
| 3.76, 32.30, 3.63 | Augustin_lod2/concrete_white | 48 | 19.1 |
| 3.76, 27.82, 2.70 | Augustin_lod2/concrete_white | 47 | 18.66 |
| -3.76, 32.15, 2.70 | Augustin_lod2/concrete_white | 47 | 18.66 |
| -3.76, 27.97, 3.63 | Augustin_lod2/concrete_white | 48 | 19.1 |
| -3.76, 27.13, -2.83 | Augustin_lod2/concrete_white | 54 | 16.604 |
| -3.76, 32.15, -2.70 | Augustin_lod2/concrete_white | 47 | 18.66 |
| 5.56, 23.13, 0.38 | Augustin_lod2/concrete_white | 84 | 7.001 |
| 5.56, 23.13, -0.48 | Augustin_lod2/concrete_white | 52 | 7.003 |
| 5.56, 26.13, -0.38 | Augustin_lod2/concrete_white | 105 | 7.801 |
| 5.56, 23.13, -0.58 | Augustin_lod2/concrete_white | 42 | 7.003 |
| 3.17, 26.57, 5.14 | Augustin_lod2/concrete_white | 136 | 10.505 |
| -3.17, 26.57, 5.14 | Augustin_lod2/concrete_white | 136 | 10.505 |
| -4.36, 32.02, -2.57 | Augustin_lod2/concrete_white | 42 | 16.097 |
| -5.56, 35.19, -1.91 | Augustin_lod2/concrete_white | 50 | 6.742 |
| -5.56, 29.50, 1.56 | Augustin_lod2/concrete_white | 108 | 12.1 |
| -5.56, 30.40, 1.96 | Augustin_lod2/concrete_white | 111 | 16.325 |
| 3.17, 26.57, -3.98 | Augustin_lod2/concrete_white | 136 | 10.505 |
| 3.17, 26.57, -5.14 | Augustin_lod2/concrete_white | 136 | 10.505 |
| -3.17, 26.57, -5.14 | Augustin_lod2/concrete_white | 136 | 10.505 |
| -3.17, 26.57, -3.98 | Augustin_lod2/concrete_white | 136 | 10.505 |
| -18.50, 15.87, -3.06 | Augustin_lod2/concrete_white | 118 | 7.964 |
| -18.50, 6.79, -0.25 | Augustin_lod2/concrete_white | 89 | 9.323 |
| -18.50, 6.79, 0.72 | Augustin_lod2/concrete_white | 67 | 7.827 |
| -18.50, 8.27, -5.19 | Augustin_lod2/concrete_white | 76 | 12.684 |
| -22.57, 1.99, 0.10 | Augustin_lod2/concrete_white | 43 | 8.825 |
| 5.03, 7.80, 18.86 | Augustin_lod2/concrete_white | 64 | 16.664 |
| -0.50, 6.79, 18.86 | Augustin_lod2/concrete_white | 57 | 7.18 |
| 0.47, 6.79, 18.86 | Augustin_lod2/concrete_white | 77 | 8.674 |
| 0.05, 1.99, 23.05 | Augustin_lod2/concrete_white | 47 | 8.967 |
| 0.50, 6.79, -18.86 | Augustin_lod2/concrete_white | 57 | 7.18 |
| -0.47, 6.79, -18.86 | Augustin_lod2/concrete_white | 77 | 8.674 |
| 14.07, 16.95, -5.71 | Augustin_lod2/concrete_white | 197 | 11.906 |
| 23.22, 13.92, -4.33 | Augustin_lod2/concrete_white | 163 | 8.357 |
| 19.62, 8.20, 10.40 | Augustin_lod2/concrete_white | 42 | 5.815 |

(55 more in the JSON)

## nonmanifold (warn, 25)

| at | part | uses |
|---|---|---|
| 3.46, 30.50, -3.17 | Augustin_lod2/concrete_white | 4 |
| 3.76, 30.50, -3.17 | Augustin_lod2/concrete_white | 4 |
| 3.46, 30.50, 3.17 | Augustin_lod2/concrete_white | 4 |
| 3.76, 30.50, 3.17 | Augustin_lod2/concrete_white | 4 |
| -3.46, 30.50, 3.17 | Augustin_lod2/concrete_white | 4 |
| -3.76, 30.50, 3.17 | Augustin_lod2/concrete_white | 4 |
| -3.46, 30.50, -3.17 | Augustin_lod2/concrete_white | 4 |
| -3.76, 30.50, -2.96 | Augustin_lod2/concrete_white | 4 |
| 4.66, 28.50, -2.57 | Augustin_lod2/concrete_white | 4 |
| 5.56, 29.85, 0.00 | Augustin_lod2/concrete_white | 4 |
| 4.66, 28.50, 2.57 | Augustin_lod2/concrete_white | 4 |
| -4.66, 28.50, -2.57 | Augustin_lod2/concrete_white | 4 |
| -4.66, 28.50, 2.57 | Augustin_lod2/concrete_white | 4 |
| 3.02, 46.60, 0.00 | Augustin_lod2/concrete_white | 4 |
| -3.02, 46.60, 0.00 | Augustin_lod2/concrete_white | 4 |
| -18.15, 8.70, 6.53 | Augustin_lod2/concrete_white | 4 |
| -18.15, 8.70, -6.53 | Augustin_lod2/concrete_white | 4 |
| 2.73, 44.30, 1.63 | Augustin_lod2/concrete_white | 3 |
| 2.25, 44.30, 2.11 | Augustin_lod2/concrete_white | 3 |
| 2.22, 44.30, -2.15 | Augustin_lod2/concrete_white | 3 |
| 2.71, 44.30, -1.66 | Augustin_lod2/concrete_white | 3 |
| -2.27, 44.30, 2.08 | Augustin_lod2/concrete_white | 3 |
| -2.76, 44.30, 1.59 | Augustin_lod2/concrete_white | 3 |
| -2.64, 44.30, -1.71 | Augustin_lod2/concrete_white | 3 |
| -2.15, 44.30, -2.20 | Augustin_lod2/concrete_white | 3 |

## tjunction (warn, 19)

| at | part | edge_m |
|---|---|---|
| -22.02, 5.14, -1.30 | Augustin_lod2/concrete_white | 3.3 |
| -22.02, 5.14, 1.30 | Augustin_lod2/concrete_white | 3.3 |
| -1.30, 5.14, 22.50 | Augustin_lod2/concrete_white | 3.3 |
| 1.30, 5.14, 22.50 | Augustin_lod2/concrete_white | 3.3 |
| 1.30, 5.14, -22.50 | Augustin_lod2/concrete_white | 3.3 |
| -1.30, 5.14, -22.50 | Augustin_lod2/concrete_white | 3.3 |
| -18.50, 17.75, -4.70 | Augustin_lod2/concrete_white | 6.4 |
| -18.50, 17.75, 1.20 | Augustin_lod2/concrete_white | 4.5 |
| -16.53, 13.24, 7.60 | Augustin_lod2/concrete_white | 16.23 |
| -16.53, 13.24, -7.60 | Augustin_lod2/concrete_white | 16.23 |
| -2.78, 44.30, -1.25 | Augustin_lod2/concrete_white | 6.04 |
| -2.78, 44.30, 1.25 | Augustin_lod2/concrete_white | 6.04 |
| -1.80, 44.30, 2.22 | Augustin_lod2/concrete_white | 1.15 |
| 1.80, 44.30, 2.22 | Augustin_lod2/concrete_white | 1.15 |
| -1.80, 44.30, -2.22 | Augustin_lod2/concrete_white | 1.15 |
| 1.80, 44.30, -2.22 | Augustin_lod2/concrete_white | 1.15 |
| 5.56, 20.40, -0.45 | Augustin_lod2/roof_bitumen | 5.14 |
| -18.50, 17.75, -4.70 | Augustin_lod2/roof_bitumen | 10.9 |
| -22.57, 6.36, 2.75 | Augustin_lod2/roof_bitumen | 9.3 |

## seam (info, 109)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 5.50, 13.29, 16.43 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 15.55 | 49 | 8.6 |
| 5.50, 13.09, -16.74 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 14.32 | 46 | 6.5 |
| 19.51, 17.00, -5.71 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 11.11 | 43 | 6.5 |
| 23.21, 6.21, -8.60 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 24.62 | 40 | 11.5 |
| 23.46, 6.36, 8.30 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 39.34 | 40 | 14 |
| -16.53, 13.09, -7.60 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 10.44 | 36 | 7.7 |
| -16.53, 13.24, 7.60 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 9.46 | 34 | 17.9 |
| 3.17, 32.56, 3.76 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 6.05 | 32 | 72.2 |
| 4.88, 6.35, 18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 12.49 | 32 | 66.1 |
| -4.81, 6.21, -18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 12.49 | 32 | 66.1 |
| 2.79, 47.72, 1.25 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 3.4 | 31 | 9.9 |
| 6.37, 17.68, -5.79 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 34.79 | 29 | 63.6 |
| 2.48, 47.94, -1.25 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 3.18 | 29 | 12.1 |
| -2.48, 47.94, 1.25 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 3.47 | 29 | 11.5 |
| -18.50, 6.42, -5.15 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 5.68 | 29 | 73.3 |
| 22.85, 8.86, -4.56 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 17.97 | 29 | 18.2 |
| 23.14, 8.72, 4.39 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 18.17 | 29 | 12.5 |
| 19.55, 17.15, 5.40 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 24 | 29 | 6 |
| -3.25, 32.70, -3.76 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 6.05 | 27 | 72.2 |
| -2.79, 47.72, -1.25 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.88 | 26 | 10.6 |
| -5.39, 16.98, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 33.12 | 25 | 63.8 |
| 3.76, 38.91, -2.58 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 6.55 | 25 | 71.1 |
| -3.76, 38.91, 2.58 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 6.55 | 25 | 71.1 |
| -19.35, 6.36, -5.15 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 19.63 | 25 | 11 |
| 5.51, 13.24, 16.43 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 22.09 | 25 | 10.1 |
| 16.46, 13.24, -7.33 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 18.73 | 25 | 12.8 |
| 5.52, 16.70, 6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 33.12 | 24 | 63.8 |
| -3.39, 39.50, 3.46 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 27.68 | 24 | 27.6 |
| -8.82, 17.75, -6.07 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 39.85 | 24 | 24.1 |
| -10.29, 16.50, 6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 11.85 | 23 | 60.3 |
| -18.50, 17.75, -1.60 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 23.58 | 21 | 46.9 |
| -18.50, 17.75, 1.60 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 23.58 | 21 | 46.9 |
| -18.50, 17.75, 4.35 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 23.48 | 21 | 46.9 |
| -1.60, 16.85, 18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.78 | 21 | 46.7 |
| 1.60, 16.85, 18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.78 | 21 | 46.7 |
| 1.60, 16.85, -18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.78 | 21 | 46.7 |
| -1.60, 16.85, -18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.78 | 21 | 46.7 |
| -6.46, 13.24, -16.43 | Augustin_lod2/concrete_white + Augustin_lod2/roof_bitumen | 27.19 | 20 | 12.3 |
| -4.35, 16.85, 18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.68 | 19 | 46.7 |
| 4.35, 16.85, 18.86 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 21.68 | 19 | 46.7 |

(69 more in the JSON)

## opening (info, 148)

| at | part | facing | edge_m |
|---|---|---|---|
| 3.02, 44.30, 0.80 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 0.5 |
| 1.85, 39.50, 2.21 | Augustin_lod2/concrete_white | 0.23 + 0 + 0.97 | 0.915 |
| 1.75, 39.50, 2.23 | Augustin_lod2/concrete_white | 0.15 + -0.04 + 0.99 | 1.213 |
| 1.75, 44.30, 2.40 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 1.2 |
| 1.75, 39.50, -2.23 | Augustin_lod2/concrete_white | 0.15 + 0 + -0.99 | 1.213 |
| 1.85, 39.50, -2.22 | Augustin_lod2/concrete_white | 0.01 + 0 + -1 | 0.567 |
| 3.02, 44.30, -1.20 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 0.5 |
| -1.75, 39.50, 2.23 | Augustin_lod2/concrete_white | -0.15 + 0 + 0.99 | 1.213 |
| -1.85, 39.50, 2.21 | Augustin_lod2/concrete_white | -0.09 + 0 + 1 | 0.733 |
| -2.78, 39.50, 1.30 | Augustin_lod2/concrete_white | -1 + 0 + 0.03 | 0.6 |
| -3.02, 44.30, 1.20 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 0.5 |
| -3.02, 44.30, -0.80 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 0.5 |
| -2.84, 39.50, -1.25 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 0.24 |
| -2.78, 39.50, -1.30 | Augustin_lod2/concrete_white | -1 + 0 + -0.01 | 0.557 |
| -2.68, 39.50, -1.92 | Augustin_lod2/concrete_white | -0.77 + 0 + -0.64 | 0.5 |
| -1.75, 44.30, -2.40 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 1.2 |
| 2.74, 47.87, -1.88 | Augustin_lod2/concrete_white | 1 + 0 + -0.07 | 0.683 |
| -2.61, 47.87, -2.06 | Augustin_lod2/concrete_white | -0.98 + 0 + -0.2 | 0.872 |
| 0.43, 50.46, -0.38 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 0.62 |
| 1.00, 50.46, -0.33 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 0.76 |
| 0.95, 50.46, 0.38 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 0.62 |
| 0.38, 50.46, 0.43 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 0.62 |
| 0.33, 50.46, 1.00 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 0.76 |
| -0.38, 50.46, 0.95 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 0.62 |
| -16.53, 13.24, 7.34 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 1.23 |
| -16.53, 13.49, 7.60 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 3.189 |
| -18.45, 0.20, 7.60 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 1.97 |
| -18.50, 0.20, 7.55 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 2.15 |
| -16.58, 0.20, -7.60 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 1.97 |
| -16.53, 13.24, -6.73 | Augustin_lod2/concrete_white | 1 + 0 + 0 | 1.23 |
| -18.50, 0.20, -7.55 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 2.15 |
| -20.00, 0.20, -4.65 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 2.62 |
| -19.95, 0.20, -4.70 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 0.8 |
| -18.55, 0.20, -5.45 | Augustin_lod2/concrete_white | 0 + 0 + -1 | 1.45 |
| -18.55, 0.20, 5.45 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 1.45 |
| -19.95, 0.20, 5.40 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 0.8 |
| -20.00, 0.20, 4.65 | Augustin_lod2/concrete_white | 0 + 0 + 1 | 2.62 |
| -22.57, 0.20, -4.60 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 9.3 |
| -22.57, 6.36, -4.60 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 7.4 |
| -22.57, 6.36, 4.60 | Augustin_lod2/concrete_white | -1 + 0 + 0 | 1.9 |

(108 more in the JSON)

## backtoback (info, 459)

| at | parts | area |
|---|---|---|
| 3.54, 34.46, -3.19 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| 3.69, 26.54, -3.19 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| 3.54, 34.46, 3.14 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| 3.69, 26.54, 3.14 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| -3.54, 34.46, 3.19 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| -3.69, 26.54, 3.19 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.53906 |
| -3.65, 35.38, -3.02 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.97516 |
| -3.59, 26.39, -3.19 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.38986 |
| 4.65, 31.67, -2.35 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| 4.65, 25.33, -2.50 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| 4.67, 31.67, 2.35 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| 4.67, 25.33, 2.50 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| -4.67, 31.67, -2.35 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| -4.67, 25.33, -2.50 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| -4.65, 31.67, 2.35 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| -4.65, 25.33, 2.50 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 2.18233 |
| -5.45, 16.92, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.03481 |
| -5.30, 16.89, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00281 |
| -5.23, 16.88, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.0088 |
| 5.41, 16.85, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00064 |
| 5.27, 16.86, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00278 |
| 5.39, 16.87, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00315 |
| 5.26, 16.90, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00691 |
| 5.43, 16.93, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.03103 |
| 5.23, 16.94, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00193 |
| 5.52, 16.71, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00084 |
| 5.51, 16.78, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.0012 |
| 5.51, 16.74, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00065 |
| 5.55, 16.71, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00042 |
| 5.55, 16.80, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.01172 |
| 5.55, 16.72, -6.37 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00045 |
| 6.37, 17.69, -5.75 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00968 |
| 6.37, 17.62, -5.74 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00236 |
| 6.37, 17.82, -5.76 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.0083 |
| 6.37, 17.78, -5.44 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00867 |
| 6.37, 17.82, -5.61 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.02963 |
| 6.37, 17.79, -5.51 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00277 |
| 6.37, 17.76, 5.61 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.0024 |
| 6.37, 17.77, 5.47 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00748 |
| 6.37, 17.61, 5.72 | Augustin_lod2/concrete_white + Augustin_lod2/concrete_white | 0.00056 |

(419 more in the JSON)


Nodes: Augustin_lod2. Distances: {"Augustin_lod2":3000}. Quantum 0.417 mm. Offset 0,0,0.
