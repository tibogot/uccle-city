# Mesh audit: augustin.glb

11,086 triangles, 9,060 welded vertices, 5,934 open edges, 1,266,182 rays, 13068 ms.

**1610 blocking**, 963 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 45 |
| depth | block | 4 |
| leak | block | 16 |
| streak | block | 1122 |
| bentflat | block | 423 |
| sliver | warn | 869 |
| nonmanifold | warn | 18 |
| tjunction | warn | 76 |
| seam | info | 1353 |
| opening | info | 249 |
| backtoback | info | 872 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 45)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -22.02, 3.00, -0.56 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2848.2 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.25, -0.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 699.1 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.01, 0.82 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.20, 0.48 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.60, -0.20 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 152.4 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.74, 0.82 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.94, 0.43 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2853.5 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.50, 0.88 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2431.3 | 3 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 2.87, -1.03 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 82.7 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.14, -0.92 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2231.8 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.73, -0.44 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2778.5 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 3.93, -0.82 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.08, 0.18 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 77.4 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.46, -0.48 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.65, -0.82 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.39, 0.45 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 499.6 | 3 | 670 | 5.53 | false | -1 + 0 + 0 |
| -22.02, 4.65, 0.52 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2757.1 | 1.7 | 670 | 5.53 | false | -1 + 0 + 0 |
| -0.56, 3.00, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2848.2 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.50, 3.25, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 699.1 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.20, 3.60, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 152.4 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.82, 3.01, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.48, 3.20, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.82, 3.74, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.43, 3.94, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2853.5 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.88, 4.50, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2431.3 | 3.5 | 670 | 5.53 | false | 0 + 0 + 1 |
| -1.03, 2.87, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 82.7 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.92, 3.14, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2231.8 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.44, 3.73, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2778.5 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.82, 3.93, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.48, 4.46, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.82, 4.65, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.18, 4.08, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 77.4 | 0 | 670 | 5.53 | false | 0 + 0 + 1 |
| 0.52, 4.65, 22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2757.1 | 3.5 | 670 | 5.53 | false | 0 + 0 + 1 |
| -0.82, 3.01, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| -0.48, 3.20, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| -0.82, 3.74, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2930.9 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| -0.88, 4.50, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2431.3 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| 0.56, 3.00, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 2848.2 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| 0.20, 3.60, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 152.4 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |
| -0.18, 4.08, -22.50 | Augustin_lod1/wood_frame_dark + Augustin_lod1/wood_frame_dark | 0 | 77.4 | 3.5 | 670 | 5.53 | false | 0 + 0 + -1 |

(5 more in the JSON)

## depth (block, 4)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 3.33, 40.12, -2.21 | Augustin_lod1/cast_iron_green + Augustin_lod1/cast_iron_green | 1.28 | 1.1 | 0.6 | 670 | 5.53 | false | 1 + -0.01 + 0 |
| 3.33, 40.12, -1.10 | Augustin_lod1/cast_iron_green + Augustin_lod1/cast_iron_green | 2.92 | 2.2 | 0.6 | 670 | 5.53 | false | 1 + -0.01 + 0 |
| 3.29, 40.58, 3.30 | Augustin_lod1/cast_iron_green + Augustin_lod1/cast_iron_green | 2.1 | 6.7 | 0.6 | 670 | 5.53 | false | -1 + 0 + 0 |
| 3.32, 40.12, 3.30 | Augustin_lod1/cast_iron_green + Augustin_lod1/cast_iron_green | 2.53 | 6.5 | 0.1 | 670 | 5.53 | false | 1 + 0 + 0 |

## leak (block, 16)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| -1.88, 17.15, 18.91 | Augustin_lod1/concrete_white | 30 | -1 + 0 + 0 | 0.199 |
| 1.32, 17.15, 18.91 | Augustin_lod1/concrete_white | 30 | -1 + 0 + 0 | 0.199 |
| 1.88, 17.15, -18.91 | Augustin_lod1/concrete_white | 30 | 1 + 0 + 0 | 0.199 |
| -1.32, 17.15, -18.91 | Augustin_lod1/concrete_white | 30 | 1 + 0 + 0 | 0.199 |
| 23.40, 11.53, -3.57 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.582 |
| 23.33, 12.96, -3.64 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.582 |
| 23.26, 14.40, -3.71 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.582 |
| 23.46, 11.53, -3.50 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.581 |
| 23.52, 12.96, -3.43 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.581 |
| 23.58, 14.40, -3.35 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.581 |
| 24.78, 14.40, -0.16 | Augustin_lod1/concrete_white | 12 | 0 + 1 + 0 | 0.872 |
| 24.78, 12.96, -0.12 | Augustin_lod1/concrete_white | 4 | 0 + 1 + 0 | 0.655 |
| 24.79, 15.75, 0.04 | Augustin_lod1/concrete_white | 30 | -0.01 + 0 + 1 | 7.2 |
| 24.77, 10.09, 0.37 | Augustin_lod1/concrete_white | 30 | 0 + 1 + 0 | 0.655 |
| 23.26, 12.88, 3.71 | Augustin_lod1/concrete_white | 12 | 0 + -1 + 0 | 0.388 |
| 20.45, 16.12, 5.61 | Augustin_lod1/concrete_white | 4 | 0 + 1 + 0 | 0.731 |

## streak (block, 1122)

| at | part | why | deg | area | spread | aspect | longest |
|---|---|---|---|---|---|---|---|
| -18.61, 10.16, -4.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.71, 14.05, -4.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8722 |  |  |  |
| -18.61, 14.05, -4.70 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.61, 10.16, -1.20 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.71, 14.05, -1.20 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8722 |  |  |  |
| -18.61, 14.05, -2.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.61, 10.16, 2.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.71, 14.05, 2.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8722 |  |  |  |
| -18.61, 14.05, 1.20 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.61, 10.16, 4.70 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.71, 14.05, 4.70 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8722 |  |  |  |
| -18.61, 14.05, 4.00 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.8242 |  |  |  |
| -18.53, 16.18, -2.67 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.22, -3.33 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.18, 0.40 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -18.53, 16.22, -0.40 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -18.53, 16.18, 3.33 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.22, 2.67 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.53, -2.67 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.57, -3.33 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.53, 0.40 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -18.53, 16.57, -0.40 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -18.53, 16.53, 3.33 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -18.53, 16.57, 2.67 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -4.70, 13.45, 18.97 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.6748 |  |  |  |
| -2.00, 13.45, 18.97 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.6748 |  |  |  |
| 1.20, 13.45, 18.97 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.6748 |  |  |  |
| 4.70, 9.86, 18.97 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.6748 |  |  |  |
| 4.70, 13.45, 19.07 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.7229 |  |  |  |
| 4.00, 13.45, 18.97 | Augustin_lod1/concrete_white | corner normal faces away | 90 | 1.6748 |  |  |  |
| -2.67, 15.28, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -3.33, 15.32, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| 0.40, 15.28, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -0.40, 15.32, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| 3.33, 15.28, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| 2.67, 15.32, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -2.67, 15.63, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| -3.33, 15.67, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 16 | 2 |
| 0.40, 15.63, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |
| -0.40, 15.67, 18.89 | Augustin_lod1/concrete_white | stretched triangle with diverging corner normals |  |  | 90 | 19 | 2.4 |

(1082 more in the JSON)

## bentflat (block, 423)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| -18.71, 17.95, -4.23 | Augustin_lod1/concrete_white | 46.9 | 0.1535 | 0.31 |
| -18.61, 17.85, -4.47 | Augustin_lod1/concrete_white | 46.9 | 0.1535 | 0.31 |
| -18.71, 17.95, -1.47 | Augustin_lod1/concrete_white | 46.9 | 0.1755 | 0.35 |
| -18.61, 17.85, -1.73 | Augustin_lod1/concrete_white | 46.9 | 0.1755 | 0.35 |
| -18.71, 17.95, 1.73 | Augustin_lod1/concrete_white | 46.9 | 0.1755 | 0.35 |
| -18.61, 17.85, 1.47 | Augustin_lod1/concrete_white | 46.9 | 0.1755 | 0.35 |
| -18.71, 17.95, 4.47 | Augustin_lod1/concrete_white | 46.9 | 0.1535 | 0.31 |
| -18.61, 17.85, 4.23 | Augustin_lod1/concrete_white | 46.9 | 0.1535 | 0.31 |
| 4.47, 17.05, 19.07 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| 4.23, 16.95, 18.97 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| 4.23, 17.05, -19.07 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| 4.47, 16.95, -18.97 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| -4.47, 17.05, -19.07 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| -4.23, 16.95, -18.97 | Augustin_lod1/concrete_white | 46.7 | 0.1535 | 0.31 |
| 2.78, 41.10, 1.42 | Augustin_lod1/concrete_white | 4.8 | 1.2327 | 1.23 |
| 2.77, 42.70, 1.62 | Augustin_lod1/concrete_white | 13.4 | 1.4394 | 1.44 |
| 2.76, 41.10, 1.83 | Augustin_lod1/concrete_white | 7.5 | 0.3133 | 0.31 |
| 2.59, 41.10, 2.11 | Augustin_lod1/concrete_white | 7.5 | 0.3131 | 0.31 |
| 2.50, 42.70, 2.16 | Augustin_lod1/concrete_white | 15 | 0.6214 | 0.62 |
| 2.44, 41.10, 2.19 | Augustin_lod1/concrete_white | 12.5 | 0.3134 | 0.31 |
| 2.35, 41.10, 2.21 | Augustin_lod1/concrete_white | 7.5 | 0.3133 | 0.31 |
| 2.15, 41.10, 2.22 | Augustin_lod1/concrete_white | 10 | 1.1523 | 2.51 |
| 1.99, 42.70, 2.22 | Augustin_lod1/concrete_white | 9.2 | 1.3607 | 2.51 |
| 2.13, 41.10, -2.22 | Augustin_lod1/concrete_white | 4.8 | 1.2569 | 2.41 |
| 2.35, 41.10, -2.21 | Augustin_lod1/concrete_white | 11.3 | 0.3134 | 0.31 |
| 2.42, 42.70, -2.19 | Augustin_lod1/concrete_white | 15 | 0.6213 | 0.62 |
| 2.55, 41.10, -2.13 | Augustin_lod1/concrete_white | 15 | 0.6211 | 0.62 |
| 2.70, 41.10, -1.98 | Augustin_lod1/concrete_white | 7.5 | 0.3133 | 0.31 |
| 2.74, 41.10, -1.89 | Augustin_lod1/concrete_white | 15 | 0.4169 | 0.42 |
| 2.76, 42.70, -1.83 | Augustin_lod1/concrete_white | 12.5 | 0.5195 | 0.52 |
| 2.78, 41.10, -1.59 | Augustin_lod1/concrete_white | 4.8 | 1.2327 | 2.47 |
| 2.78, 42.70, -1.42 | Augustin_lod1/concrete_white | 4.8 | 1.2327 | 2.47 |
| -1.99, 42.70, 2.22 | Augustin_lod1/concrete_white | 9.2 | 1.3607 | 2.72 |
| -2.18, 41.10, 2.21 | Augustin_lod1/concrete_white | 9.2 | 1.3607 | 2.72 |
| -2.42, 41.10, 2.19 | Augustin_lod1/concrete_white | 10 | 0.4169 | 0.42 |
| -2.50, 42.70, 2.16 | Augustin_lod1/concrete_white | 15 | 0.6214 | 0.62 |
| -2.59, 41.10, 2.11 | Augustin_lod1/concrete_white | 7.5 | 0.3131 | 0.31 |
| -2.65, 41.10, 2.05 | Augustin_lod1/concrete_white | 12.5 | 0.3135 | 0.31 |
| -2.75, 41.10, 1.89 | Augustin_lod1/concrete_white | 10 | 0.4168 | 0.42 |
| -2.77, 41.10, 1.65 | Augustin_lod1/concrete_white | 19.2 | 1.3367 | 1.34 |

(383 more in the JSON)

## sliver (warn, 869)

| at | part | aspect | longest |
|---|---|---|---|
| 3.56, 32.67, -2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.66, 28.33, -2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.66, 32.67, -3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.56, 28.33, -3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.56, 32.67, 3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.66, 28.33, 3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.66, 32.67, 2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 3.56, 28.33, 2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.56, 32.67, 2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.66, 28.33, 2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.66, 32.67, 3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.56, 28.33, 3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.56, 32.67, -3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.66, 28.33, -3.37 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.66, 32.67, -2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| -3.56, 28.33, -2.96 | Augustin_lod1/concrete_white | 43 | 13.003 |
| 5.60, 37.67, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 37.67, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 37.53, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.60, 37.53, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.60, 38.02, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 38.02, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 37.88, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.60, 37.88, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.60, 38.37, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 38.37, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.58, 38.23, -0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 5.60, 38.23, 0.86 | Augustin_lod1/concrete_white | 86 | 5.14 |
| 1.06, 31.33, 5.42 | Augustin_lod1/concrete_white | 45 | 6.342 |
| -1.06, 31.37, 5.42 | Augustin_lod1/concrete_white | 45 | 6.342 |
| 1.06, 31.42, 5.40 | Augustin_lod1/concrete_white | 106 | 6.34 |
| -1.06, 31.42, 5.38 | Augustin_lod1/concrete_white | 106 | 6.34 |
| 1.06, 31.28, 5.38 | Augustin_lod1/concrete_white | 106 | 6.34 |
| -1.06, 31.28, 5.40 | Augustin_lod1/concrete_white | 106 | 6.34 |
| 1.06, 31.68, 5.42 | Augustin_lod1/concrete_white | 45 | 6.342 |
| -1.06, 31.72, 5.42 | Augustin_lod1/concrete_white | 45 | 6.342 |
| 1.06, 31.77, 5.40 | Augustin_lod1/concrete_white | 106 | 6.34 |
| -1.06, 31.77, 5.38 | Augustin_lod1/concrete_white | 106 | 6.34 |
| 1.06, 31.63, 5.38 | Augustin_lod1/concrete_white | 106 | 6.34 |
| -1.06, 31.63, 5.40 | Augustin_lod1/concrete_white | 106 | 6.34 |

(829 more in the JSON)

## nonmanifold (warn, 18)

| at | part | uses |
|---|---|---|
| 2.77, 44.30, 1.55 | Augustin_lod1/concrete_white | 3 |
| 2.68, 44.30, 1.98 | Augustin_lod1/concrete_white | 3 |
| 2.48, 44.30, 2.16 | Augustin_lod1/concrete_white | 3 |
| 2.08, 44.30, 2.22 | Augustin_lod1/concrete_white | 3 |
| 2.04, 44.30, -2.22 | Augustin_lod1/concrete_white | 3 |
| 2.40, 44.30, -2.19 | Augustin_lod1/concrete_white | 3 |
| 2.62, 44.30, -2.06 | Augustin_lod1/concrete_white | 3 |
| 2.75, 44.30, -1.87 | Augustin_lod1/concrete_white | 3 |
| 2.78, 44.30, -1.51 | Augustin_lod1/concrete_white | 3 |
| -2.08, 44.30, 2.22 | Augustin_lod1/concrete_white | 3 |
| -2.48, 44.30, 2.16 | Augustin_lod1/concrete_white | 3 |
| -2.68, 44.30, 2.00 | Augustin_lod1/concrete_white | 3 |
| -2.77, 44.30, 1.57 | Augustin_lod1/concrete_white | 3 |
| -2.78, 44.30, -1.53 | Augustin_lod1/concrete_white | 3 |
| -2.73, 44.30, -1.91 | Augustin_lod1/concrete_white | 3 |
| -2.63, 44.30, -2.07 | Augustin_lod1/concrete_white | 3 |
| -2.49, 44.30, -2.17 | Augustin_lod1/concrete_white | 3 |
| -2.10, 44.30, -2.21 | Augustin_lod1/concrete_white | 3 |

## tjunction (warn, 76)

| at | part | edge_m |
|---|---|---|
| 5.56, 21.60, -1.35 | Augustin_lod1/concrete_white | 3.1 |
| 5.56, 34.05, -0.35 | Augustin_lod1/concrete_white | 1.301 |
| 5.56, 34.05, 0.35 | Augustin_lod1/concrete_white | 1.301 |
| -1.74, 21.80, 5.36 | Augustin_lod1/concrete_white | 3.88 |
| -5.56, 22.00, -1.52 | Augustin_lod1/concrete_white | 3.44 |
| -1.74, 21.80, -5.36 | Augustin_lod1/concrete_white | 3.88 |
| -18.50, 7.01, -3.85 | Augustin_lod1/concrete_white | 1.74 |
| -18.50, 7.01, -0.95 | Augustin_lod1/concrete_white | 2.14 |
| -18.50, 7.01, 2.35 | Augustin_lod1/concrete_white | 1.74 |
| -18.50, 16.26, -4.00 | Augustin_lod1/concrete_white | 11.39 |
| -18.50, 16.26, -1.20 | Augustin_lod1/concrete_white | 11.39 |
| -18.50, 16.14, -2.00 | Augustin_lod1/concrete_white | 11.39 |
| -18.50, 16.26, 2.00 | Augustin_lod1/concrete_white | 11.39 |
| -18.50, 16.14, 1.20 | Augustin_lod1/concrete_white | 11.39 |
| -18.50, 16.14, 4.00 | Augustin_lod1/concrete_white | 11.39 |
| -22.02, 5.20, -1.30 | Augustin_lod1/concrete_white | 3.3 |
| -22.02, 5.20, 1.30 | Augustin_lod1/concrete_white | 3.3 |
| -22.02, 5.08, 0.03 | Augustin_lod1/concrete_white | 2.6 |
| -22.02, 5.14, 1.30 | Augustin_lod1/concrete_white | 0.12 |
| -22.02, 5.14, -1.30 | Augustin_lod1/concrete_white | 0.12 |
| -3.85, 7.01, 18.86 | Augustin_lod1/concrete_white | 1.74 |
| -0.95, 7.01, 18.86 | Augustin_lod1/concrete_white | 2.14 |
| 2.35, 7.01, 18.86 | Augustin_lod1/concrete_white | 1.74 |
| -4.00, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.79 |
| -1.20, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.79 |
| -2.00, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.49 |
| 2.00, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.79 |
| 1.20, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.49 |
| 4.00, 15.24, 18.86 | Augustin_lod1/concrete_white | 10.49 |
| -1.30, 5.20, 22.50 | Augustin_lod1/concrete_white | 3.3 |
| 1.30, 5.20, 22.50 | Augustin_lod1/concrete_white | 3.3 |
| -0.03, 5.08, 22.50 | Augustin_lod1/concrete_white | 2.6 |
| 1.30, 5.14, 22.50 | Augustin_lod1/concrete_white | 0.12 |
| -1.30, 5.14, 22.50 | Augustin_lod1/concrete_white | 0.12 |
| 2.35, 7.01, -18.86 | Augustin_lod1/concrete_white | 1.74 |
| -0.95, 7.01, -18.86 | Augustin_lod1/concrete_white | 2.14 |
| -3.85, 7.01, -18.86 | Augustin_lod1/concrete_white | 1.74 |
| 4.00, 15.24, -18.86 | Augustin_lod1/concrete_white | 10.49 |
| 1.20, 15.24, -18.86 | Augustin_lod1/concrete_white | 10.79 |
| 2.00, 15.24, -18.86 | Augustin_lod1/concrete_white | 10.49 |

(36 more in the JSON)

## seam (info, 1353)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -16.70, 0.22, 7.60 | Augustin_lod1/concrete_white + Augustin_lod1/stone_blue | 353.66 | 1012 | 27.1 |
| 19.51, 16.27, -5.71 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 32.37 | 194 | 61.7 |
| -16.50, 10.97, -8.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 25.96 | 152 | 66 |
| -8.10, 11.11, 16.70 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 25.19 | 127 | 62 |
| -16.50, 8.27, -8.32 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 25.44 | 124 | 81.4 |
| -8.10, 8.27, 16.70 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 25.16 | 119 | 66.5 |
| 19.50, 16.98, -5.71 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 17.78 | 111 | 84 |
| 5.50, 13.07, -16.74 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 21.49 | 102 | 10.7 |
| 8.24, 11.11, -16.68 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 18.61 | 100 | 62.5 |
| -16.53, 13.38, -7.60 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 18.19 | 97 | 85.6 |
| 5.50, 13.30, 16.41 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 20.7 | 91 | 10.7 |
| 23.22, 6.19, -8.60 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 30.87 | 89 | 85.2 |
| 8.10, 8.27, -16.70 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 18.26 | 88 | 82.4 |
| 15.45, 11.11, 11.90 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 17.62 | 85 | 61.8 |
| 15.32, 8.27, 12.15 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 17.77 | 84 | 80.3 |
| -16.53, 13.24, 7.60 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 17.25 | 79 | 85.9 |
| -18.50, 6.48, -5.31 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 21.73 | 70 | 83.9 |
| 2.79, 47.41, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.36 | 60 | 70.6 |
| 2.81, 46.96, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.36 | 58 | 70.7 |
| 19.51, 17.15, 5.39 | Augustin_lod1/concrete_white + Augustin_lod1/roof_bitumen | 16.91 | 56 | 72.1 |
| -2.86, 45.49, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 55 | 46.1 |
| -2.88, 45.95, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 55 | 61.6 |
| -2.90, 46.45, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 55 | 45.7 |
| 2.88, 45.59, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.32 | 55 | 73 |
| 2.83, 46.39, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.33 | 55 | 75.5 |
| -2.79, 47.41, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 55 | 73.2 |
| -2.84, 44.71, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.36 | 54 | 71.1 |
| 2.83, 45.61, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.28 | 54 | 74 |
| 2.81, 46.96, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 54 | 73.2 |
| 2.80, 47.29, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.26 | 54 | 70.4 |
| -2.88, 46.05, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 54 | 44.6 |
| -2.87, 46.40, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.34 | 54 | 46.2 |
| -2.81, 46.84, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 54 | 73.7 |
| -4.81, 6.21, -18.86 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 20.67 | 54 | 83.9 |
| -2.83, 47.41, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.35 | 53 | 74.4 |
| 2.90, 45.10, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.32 | 53 | 74.4 |
| 2.83, 44.71, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.13 | 53 | 75.2 |
| 2.87, 46.40, 1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.32 | 53 | 73.1 |
| -2.88, 46.85, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.36 | 52 | 45.6 |
| 2.88, 44.60, -1.25 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 4.29 | 52 | 66.2 |

(1313 more in the JSON)

## opening (info, 249)

| at | part | facing | edge_m |
|---|---|---|---|
| 5.56, 37.60, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.141 |
| 5.56, 37.60, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.141 |
| 5.56, 37.95, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.139 |
| 5.56, 37.95, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.139 |
| 5.56, 38.30, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.139 |
| 5.56, 38.30, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.139 |
| 3.17, 31.35, 5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.35, 5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.70, 5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.70, 5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 32.05, 5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.139 |
| -3.17, 32.05, 5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.139 |
| -5.56, 37.60, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.141 |
| -5.56, 37.60, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.141 |
| -5.56, 37.95, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.139 |
| -5.56, 37.95, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.139 |
| -5.56, 38.30, 2.57 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.139 |
| -5.56, 38.30, -2.57 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.139 |
| -3.17, 31.35, -5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.35, -5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 31.70, -5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.14 |
| 3.17, 31.70, -5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.14 |
| -3.17, 32.05, -5.36 | Augustin_lod1/concrete_white | -1 + 0 + 0 | 0.139 |
| 3.17, 32.05, -5.36 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.139 |
| -18.65, 18.05, -4.12 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.2 |
| -18.65, 18.05, -4.58 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.2 |
| -18.50, 18.35, -4.29 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.22 |
| -18.65, 18.05, -1.32 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.2 |
| -18.65, 18.05, -1.88 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.2 |
| -18.50, 18.35, -1.49 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.32 |
| -18.65, 18.05, 1.88 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.2 |
| -18.65, 18.05, 1.32 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.2 |
| -18.50, 18.35, 1.71 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.32 |
| -18.65, 18.05, 4.58 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.2 |
| -18.65, 18.05, 4.12 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.2 |
| -18.50, 18.35, 4.41 | Augustin_lod1/concrete_white | 1 + 0 + 0 | 0.22 |
| -22.57, 6.77, 1.60 | Augustin_lod1/concrete_white | 0 + 0 + 1 | 0.7 |
| -22.57, 6.77, -1.60 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.7 |
| -4.00, 17.10, 18.86 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.301 |
| -4.29, 17.45, 18.86 | Augustin_lod1/concrete_white | 0 + 0 + -1 | 0.22 |

(209 more in the JSON)

## backtoback (info, 872)

| at | parts | area |
|---|---|---|
| 5.61, 34.10, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00499 |
| 5.58, 34.14, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00499 |
| 5.60, 34.48, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00285 |
| 5.59, 34.54, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00546 |
| 5.62, 34.30, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00563 |
| 5.60, 34.35, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00585 |
| 5.59, 34.67, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00102 |
| 5.58, 34.73, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00375 |
| 5.57, 34.86, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00018 |
| 5.56, 34.92, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00121 |
| 5.64, 34.51, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0039 |
| 5.63, 34.57, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00129 |
| 5.64, 34.36, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00028 |
| 5.64, 34.39, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00006 |
| 5.63, 34.70, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00646 |
| 5.62, 34.76, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00373 |
| 5.63, 34.89, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00825 |
| 5.61, 34.95, -0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00722 |
| 5.62, 34.07, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00065 |
| 5.62, 34.13, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00217 |
| 5.66, 34.46, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00005 |
| 5.63, 34.26, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00018 |
| 5.64, 34.30, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00089 |
| 5.58, 34.10, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00435 |
| 5.60, 34.16, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00283 |
| 5.61, 34.49, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00674 |
| 5.63, 34.53, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0067 |
| 5.59, 34.29, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00572 |
| 5.62, 34.36, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00501 |
| 5.60, 34.70, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00748 |
| 5.63, 34.74, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00748 |
| 5.59, 34.91, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00843 |
| 5.62, 34.95, 0.35 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00843 |
| -18.51, 16.18, -4.00 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0024 |
| -18.52, 16.52, -4.00 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00237 |
| -18.51, 16.18, -1.20 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0024 |
| -18.52, 16.52, -1.20 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.00237 |
| -18.51, 16.22, -2.00 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0024 |
| -18.51, 16.57, -2.00 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0024 |
| -18.51, 16.18, 2.00 | Augustin_lod1/concrete_white + Augustin_lod1/concrete_white | 0.0024 |

(832 more in the JSON)


Nodes: Augustin_lod1. Distances: {"Augustin_lod1":670}. Quantum 0.417 mm. Offset 0,0,0.
