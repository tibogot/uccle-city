# Mesh audit: russian.glb

12,036 triangles, 8,165 welded vertices, 4,005 open edges, 643,962 rays, 3757 ms.

**2472 blocking**, 742 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 82 |
| depth | block | 3 |
| crossing | block | 14 |
| leak | block | 30 |
| flipped | block | 26 |
| streak | block | 1858 |
| bentflat | block | 459 |
| sliver | warn | 593 |
| nonmanifold | warn | 24 |
| tjunction | warn | 125 |
| seam | info | 429 |
| opening | info | 42 |
| backtoback | info | 391 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 82)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.00, 4.61, 3.81 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 20.7 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.61, 3.85 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 342.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.85, 3.81 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 45.7 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.88, 3.82 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 6.5 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.88, 3.67 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 74 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, 3.70 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 83.5 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, 3.55 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 4.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, 3.62 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 2.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.82, -3.69 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 25.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.86, -3.67 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 139.5 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.64, -3.84 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 285.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.50, -3.88 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 77.8 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.81, -3.78 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 1.1 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.85, -3.81 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 51.1 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, 3.54 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 2.4 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, 3.61 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 1.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, -3.61 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 2.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, -3.54 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 5 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, 3.53 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 13.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, 3.60 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 6.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, -3.60 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 5.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, -3.52 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 9.6 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, 3.50 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 14.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, 3.59 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 5.8 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.83, -3.56 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 17.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.87, -3.47 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 21.8 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.86, 3.47 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 21.2 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.82, 3.57 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 7.3 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.84, -3.42 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 132.4 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.88, -3.38 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 20.4 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.77, -3.35 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 0.8 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.80, -3.31 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 79.1 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.80, 3.31 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 75.6 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.80, 3.27 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 4.4 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.86, 3.38 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 111.7 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.82, 3.49 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 31.6 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 3.81, 3.83 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 664 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 3.95, 3.87 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 374.4 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.74, -3.35 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 0.5 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |
| 0.00, 4.74, -3.31 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0 | 18.9 | 0 | 320 | 2.64 | false | -1 + 0 + 0 |

(42 more in the JSON)

## depth (block, 3)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 7.61, 18.34, -1.84 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 1.81 | 32.2 | 4.7 | 320 | 2.64 | false | 0.61 + -0.36 + -0.7 |
| 0.25, -0.58, 0.46 | Russian_lod1/wood_frame_dark + Russian_lod1/wood_frame_dark | 1.1 | 1098.3 | 3 | 320 | 2.64 | false | -1 + 0 + 0 |
| 17.19, 19.20, 12.07 | Russian_lod1/cast_iron_green + Russian_lod1/cast_iron_green | 1.98 | 1.6 | 1.3 | 320 | 2.64 | false | 1 + -0.01 + 0 |

## crossing (block, 14)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 20.78, 6.28, 8.26 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.7 | 0.1 |
| 18.06, 9.30, 9.69 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 9.5 | 0 |
| 18.33, 9.31, 10.35 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.3 | 0 |
| 18.39, 9.27, 10.38 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.3 | 0 |
| 18.44, 9.21, 10.41 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.2 | 0 |
| 18.48, 9.15, 10.43 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.2 | 0 |
| 15.30, 9.14, 13.01 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.3 | 0 |
| 15.28, 9.21, 12.96 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.3 | 0 |
| 15.27, 9.27, 12.91 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.7 | 0 |
| 15.18, 9.36, 12.62 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.4 | 0 |
| 15.16, 9.35, 12.54 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.1 | 0 |
| 17.48, 9.23, 14.13 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.2 | 0 |
| 19.00, 9.36, 13.02 | Russian_lod1/brick_painted_white + Russian_lod1/wood_frame_dark | 11.5 | 0 |
| 19.52, 9.40, 11.14 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.6 | 0.3 |

## leak (block, 30)

| at | part | slit_mm | facing | edge_m |
|---|---|---|---|---|
| 10.83, 13.62, 4.62 | Russian_lod1/brick_painted_white | 4 | -0.99 + -0.1 + 0 | 0.287 |
| 1.27, 13.62, -4.38 | Russian_lod1/brick_painted_white | 4 | 0.99 + -0.1 + 0 | 0.287 |
| 5.80, 16.77, 2.59 | Russian_lod1/brick_painted_white | 30 | 0.5 + -0.02 + 0.86 | 1.692 |
| 5.66, 18.53, -2.33 | Russian_lod1/brick_painted_white | 4 | -0.04 + 0.01 + -1 | 0.647 |
| 3.60, 18.53, -0.26 | Russian_lod1/brick_painted_white | 4 | -1 + 0.01 + -0.04 | 0.647 |
| 6.09, 18.53, 2.58 | Russian_lod1/brick_painted_white | 4 | 0.04 + 0.01 + 1 | 0.647 |
| 7.90, 17.30, -1.51 | Russian_lod1/brick_painted_white | 4 | 0 + -1 + 0 | 0.216 |
| 5.66, 17.30, 2.56 | Russian_lod1/brick_painted_white | 4 | 0 + -1 + 0 | 0.647 |
| 4.90, 18.26, 2.32 | Russian_lod1/brick_painted_white | 4 | -0.73 + 0.56 + -0.39 | 0.102 |
| 6.79, 18.26, 2.48 | Russian_lod1/brick_painted_white | 4 | -0.79 + 0.56 + 0.24 | 0.103 |
| 15.78, 2.78, -2.08 | Russian_lod1/brick_painted_white | 4 | 0.48 + 0.01 + 0.88 | 1.485 |
| 18.33, 9.31, 10.35 | Russian_lod1/brick_painted_white | 12 | -0.49 + -0.83 + -0.27 | 0.163 |
| 6.98, 18.68, -2.18 | Russian_lod1/copper_brown | 12 | 0.92 + 0 + 0.38 | 0.26 |
| 5.04, 18.82, -2.27 | Russian_lod1/copper_brown | 12 | 0.92 + 0 + -0.38 | 0.26 |
| 5.66, 22.59, -0.76 | Russian_lod1/copper_brown | 4 | 0.92 + 0 + -0.38 | 1.111 |
| 4.47, 18.82, 2.18 | Russian_lod1/copper_brown | 12 | -0.8 + 0 + -0.61 | 0.26 |
| 5.89, 22.52, 1.14 | Russian_lod1/copper_brown | 12 | 0.99 + 0 + 0.13 | 1.111 |
| 5.92, 22.52, 1.15 | Russian_lod1/copper_brown | 12 | -0.99 + 0 + -0.13 | 1.111 |
| 6.39, 18.82, 2.68 | Russian_lod1/copper_brown | 12 | -0.99 + 0 + 0.13 | 0.26 |
| 8.10, 18.82, 1.69 | Russian_lod1/copper_brown | 12 | -0.61 + 0 + 0.79 | 0.26 |
| 8.61, 18.82, 0.45 | Russian_lod1/copper_brown | 12 | -0.13 + 0 + 0.99 | 0.26 |
| 17.67, 17.30, 11.94 | Russian_lod1/copper_brown | 4 | 0.27 + 0 + 0.96 | 0.234 |
| 17.30, 17.30, 11.57 | Russian_lod1/copper_brown | 12 | -0.96 + -0.01 + -0.29 | 0.234 |
| 16.86, 17.87, 12.15 | Russian_lod1/copper_brown | 12 | 0.27 + -0.01 + 0.96 | 0.37 |
| 16.81, 17.30, 12.44 | Russian_lod1/copper_brown | 12 | -0.71 + 0 + -0.71 | 0.234 |
| 17.09, 17.87, 12.38 | Russian_lod1/copper_brown | 30 | 0.95 + 0.06 + 0.31 | 0.37 |
| 17.30, 17.15, 12.54 | Russian_lod1/copper_brown | 12 | -0.96 + -0.01 + 0.29 | 0.056 |
| 17.25, 18.06, 12.15 | Russian_lod1/copper_brown | 4 | -0.68 + 0.03 + 0.73 | 0.37 |
| 18.33, 9.31, 10.35 | Russian_lod1/wood_frame_dark | 30 | -0.34 + -0.92 + -0.17 | 0.164 |
| 18.48, 9.14, 10.43 | Russian_lod1/wood_frame_dark | 4 | -0.81 + -0.38 + -0.44 | 0.164 |

## flipped (block, 26)

| at | part | dot | area |
|---|---|---|---|
| -0.01, 7.42, -0.32 | Russian_lod1/brick_painted_white | -0.86 | 0.01063 |
| -0.01, 7.47, 0.04 | Russian_lod1/brick_painted_white | -0.86 | 0.0106 |
| 7.10, 18.28, -2.15 | Russian_lod1/brick_painted_white | -0.54 | 0.00451 |
| 6.48, 18.28, -2.35 | Russian_lod1/brick_painted_white | -0.54 | 0.00451 |
| 5.82, 18.28, -2.38 | Russian_lod1/brick_painted_white | -0.54 | 0.00452 |
| 4.61, 18.28, -1.93 | Russian_lod1/brick_painted_white | -0.54 | 0.00452 |
| 4.12, 18.28, -1.49 | Russian_lod1/brick_painted_white | -0.54 | 0.00451 |
| 3.57, 18.28, -0.32 | Russian_lod1/brick_painted_white | -0.54 | 0.00452 |
| 3.54, 18.28, 0.34 | Russian_lod1/brick_painted_white | -0.54 | 0.00451 |
| 3.69, 18.28, 0.97 | Russian_lod1/brick_painted_white | -0.54 | 0.00452 |
| 4.98, 18.28, 2.39 | Russian_lod1/brick_painted_white | -0.54 | 0.00451 |
| 7.47, 18.28, 2.17 | Russian_lod1/brick_painted_white | -0.54 | 0.00452 |
| 0.30, 12.02, -5.08 | Russian_lod1/copper_brown | -0.26 | 0.33869 |
| 0.30, 12.18, -4.90 | Russian_lod1/copper_brown | -0.25 | 0.35352 |
| 0.09, 11.82, 5.42 | Russian_lod1/copper_brown | -0.26 | 0.17895 |
| 12.45, 11.91, 5.66 | Russian_lod1/copper_brown | -0.28 | 0.22708 |
| 12.76, 11.66, -5.87 | Russian_lod1/copper_brown | -0.29 | 0.0346 |
| 12.34, 11.91, -5.55 | Russian_lod1/copper_brown | -0.26 | 0.31587 |
| 0.38, 11.91, -5.66 | Russian_lod1/copper_brown | -0.28 | 0.22724 |
| 1.16, 14.30, -3.77 | Russian_lod1/copper_brown | -0.29 | 0.44005 |
| 1.07, 14.30, 4.09 | Russian_lod1/copper_brown | -0.25 | 0.34861 |
| 10.94, 14.30, 4.00 | Russian_lod1/copper_brown | -0.29 | 0.43999 |
| 11.03, 14.30, -3.85 | Russian_lod1/copper_brown | -0.25 | 0.34856 |
| 10.89, 14.29, -4.48 | Russian_lod1/copper_brown | -0.33 | 0.06323 |
| 1.32, 14.20, -4.31 | Russian_lod1/copper_brown | -0.27 | 0.29548 |
| 17.53, 17.26, 12.44 | Russian_lod1/copper_brown | -0.96 | 0.00074 |

## streak (block, 1858)

| at | part | why | spread | aspect | longest | deg | area |
|---|---|---|---|---|---|---|---|
| -0.11, 0.03, -1.17 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| -0.11, 0.84, -1.13 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 15 | 2.44 |  |  |
| -0.18, 0.03, -1.20 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| -0.16, 0.84, -1.20 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| -0.24, 0.03, -1.19 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.24, 0.84, -1.12 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 70 | 15 | 2.43 |  |  |
| -0.22, 0.03, -1.07 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.16, 0.84, -1.05 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.13, 0.03, -1.06 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| 0.08, 0.03, -1.03 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.08, 0.84, -0.99 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 15 | 2.44 |  |  |
| 0.01, 0.03, -1.07 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.03, 0.84, -1.07 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| -0.05, 0.03, -1.05 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.05, 0.84, -0.98 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 70 | 15 | 2.43 |  |  |
| -0.03, 0.03, -0.93 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| 0.03, 0.84, -0.91 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| 0.06, 0.03, -0.93 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| 0.27, 0.03, -0.89 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.28, 0.84, -0.87 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.20, 0.03, -0.93 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.22, 0.84, -0.93 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.14, 0.03, -0.87 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.15, 0.84, -0.89 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.18, 0.03, -0.80 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.16, 0.84, -0.81 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.26, 0.03, -0.81 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.24, 0.84, -0.80 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| -0.09, 0.03, 1.11 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.13, 0.84, 1.06 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.16, 0.03, 1.05 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.22, 0.84, 1.07 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.25, 0.03, 1.10 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.25, 0.84, 1.17 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.22, 0.03, 1.20 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.16, 0.84, 1.22 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.13, 0.03, 1.20 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| -0.09, 0.84, 1.15 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 43 | 21 | 2.43 |  |  |
| 0.08, 0.03, 0.96 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 21 | 2.44 |  |  |
| 0.08, 0.84, 1.00 | Russian_lod1/brick_painted_white | stretched triangle with diverging corner normals | 75 | 15 | 2.44 |  |  |

(1818 more in the JSON)

## bentflat (block, 459)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| -0.11, 0.61, 1.44 | Russian_lod1/brick_painted_white | 12.3 | 0.6906 | 0.69 |
| -0.21, -0.82, 1.44 | Russian_lod1/brick_painted_white | 10.9 | 0.7333 | 0.73 |
| -0.21, 0.61, -1.44 | Russian_lod1/brick_painted_white | 11.9 | 0.7357 | 0.74 |
| -0.19, 0.12, 1.08 | Russian_lod1/brick_painted_white | 37.8 | 0.3596 | 0.36 |
| -0.26, 0.12, -1.13 | Russian_lod1/brick_painted_white | 10.9 | 0.2918 | 0.58 |
| -0.19, 1.15, -1.12 | Russian_lod1/brick_painted_white | 10.9 | 0.2918 | 0.58 |
| -0.00, 0.12, 0.94 | Russian_lod1/brick_painted_white | 37.9 | 0.3565 | 0.36 |
| -0.07, 0.12, -1.04 | Russian_lod1/brick_painted_white | 36.5 | 0.3566 | 0.36 |
| 0.12, 1.11, 0.85 | Russian_lod1/brick_painted_white | 11 | 0.2867 | 0.57 |
| 0.19, 0.11, 0.85 | Russian_lod1/brick_painted_white | 11 | 0.2867 | 0.57 |
| 0.12, 0.11, -0.90 | Russian_lod1/brick_painted_white | 36.5 | 0.3535 | 0.35 |
| 6.85, 4.42, 5.66 | Russian_lod1/brick_painted_white | 22.8 | 0.4315 | 0.43 |
| 6.85, 3.52, 5.56 | Russian_lod1/brick_painted_white | 21.8 | 0.4437 | 0.44 |
| 5.97, 3.50, 5.66 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 5.97, 4.39, 5.56 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 5.97, 4.39, -5.66 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 5.97, 3.50, -5.56 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 6.86, 3.50, -5.66 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 6.86, 4.39, -5.56 | Russian_lod1/brick_painted_white | 11.1 | 0.4302 | 0.86 |
| 8.02, 16.85, 1.59 | Russian_lod1/brick_painted_white | 7.6 | 1.6278 | 1.63 |
| 8.51, 18.01, -0.04 | Russian_lod1/brick_painted_white | 26.8 | 0.3382 | 0.34 |
| 7.74, 16.85, -1.68 | Russian_lod1/brick_painted_white | 5 | 1.0872 | 1.09 |
| 6.47, 18.09, -2.30 | Russian_lod1/brick_painted_white | 7.5 | 0.4306 | 1.92 |
| 5.95, 18.01, -2.34 | Russian_lod1/brick_painted_white | 26.7 | 0.5064 | 0.51 |
| 4.46, 16.85, -1.76 | Russian_lod1/brick_painted_white | 7.5 | 1.6284 | 1.63 |
| 4.16, 16.85, -1.46 | Russian_lod1/brick_painted_white | 7.5 | 1.6284 | 3.26 |
| 3.57, 17.57, 0.12 | Russian_lod1/brick_painted_white | 11.3 | 0.1937 | 0.66 |
| 3.58, 18.09, -0.02 | Russian_lod1/brick_painted_white | 7.6 | 0.4306 | 0.66 |
| 4.29, 16.85, 1.87 | Russian_lod1/brick_painted_white | 5 | 1.0872 | 1.09 |
| 5.68, 18.09, 2.57 | Russian_lod1/brick_painted_white | 5.3 | 0.2875 | 1.52 |
| 6.16, 17.99, 2.58 | Russian_lod1/brick_painted_white | 7.5 | 0.526 | 0.53 |
| 7.63, 16.85, 2.02 | Russian_lod1/brick_painted_white | 5 | 1.0876 | 1.09 |
| 8.49, 17.57, 0.39 | Russian_lod1/brick_painted_white | 29.8 | 0.3159 | 0.65 |
| 8.51, 18.01, 0.25 | Russian_lod1/brick_painted_white | 30.2 | 0.3382 | 0.65 |
| 15.31, -0.82, 2.92 | Russian_lod1/brick_painted_white | 6.1 | 2.1189 | 2.12 |
| 15.56, 0.77, 2.62 | Russian_lod1/brick_painted_white | 4.1 | 1.4148 | 1.41 |
| 15.73, -0.82, 2.37 | Russian_lod1/brick_painted_white | 4.1 | 1.4141 | 1.41 |
| 15.92, -0.82, 2.03 | Russian_lod1/brick_painted_white | 8.2 | 1.414 | 1.41 |
| 16.23, 0.55, 1.29 | Russian_lod1/brick_painted_white | 4.1 | 2.6345 | 2.63 |
| 16.35, -0.82, 0.71 | Russian_lod1/brick_painted_white | 6.1 | 0.7076 | 0.71 |

(419 more in the JSON)

## sliver (warn, 593)

| at | part | aspect | longest |
|---|---|---|---|
| 0.00, 7.40, -0.62 | Russian_lod1/brick_painted_white | 126 | 11.171 |
| 0.00, 8.11, -1.90 | Russian_lod1/brick_painted_white | 64 | 7.028 |
| 0.00, 6.11, 1.40 | Russian_lod1/brick_painted_white | 93 | 4.145 |
| 0.00, 6.09, -1.39 | Russian_lod1/brick_painted_white | 49 | 4.233 |
| 0.00, 3.29, 1.23 | Russian_lod1/brick_painted_white | 1177 | 3.42 |
| 0.00, 3.29, -1.23 | Russian_lod1/brick_painted_white | 1177 | 3.42 |
| 0.00, 2.98, -2.79 | Russian_lod1/brick_painted_white | 56 | 2.564 |
| 0.00, 2.19, 1.88 | Russian_lod1/brick_painted_white | 103 | 3.757 |
| -0.13, 2.92, 0.28 | Russian_lod1/brick_painted_white | 265 | 0.632 |
| -0.13, 2.92, -0.28 | Russian_lod1/brick_painted_white | 265 | 0.632 |
| 0.06, 2.79, 0.24 | Russian_lod1/brick_painted_white | 78 | 0.555 |
| 0.06, 2.79, -0.24 | Russian_lod1/brick_painted_white | 78 | 0.555 |
| -0.39, 2.29, -1.27 | Russian_lod1/brick_painted_white | 49 | 0.64 |
| -0.39, 2.67, -1.10 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.39, 2.98, -0.83 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.39, 3.19, -0.47 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.39, 3.27, -0.07 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.39, 3.23, 0.35 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.39, 3.06, 0.72 | Russian_lod1/brick_painted_white | 48 | 0.635 |
| -0.06, 6.27, -0.19 | Russian_lod1/brick_painted_white | 48 | 0.283 |
| -0.03, 1.71, -4.92 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, -4.92 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, -5.85 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, -5.85 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, 5.77 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, 5.77 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, 4.92 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, 4.92 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, -1.61 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, -1.61 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, -2.23 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, -2.23 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 1.71, 2.23 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 5.82, 2.23 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.05, 1.71, 1.61 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| -0.03, 5.82, 1.61 | Russian_lod1/brick_painted_white | 154 | 12.33 |
| 9.23, 4.93, 5.77 | Russian_lod1/brick_painted_white | 78 | 3.774 |
| 3.60, 4.93, 5.77 | Russian_lod1/brick_painted_white | 78 | 3.774 |
| 3.59, 2.93, 5.77 | Russian_lod1/brick_painted_white | 83 | 3.76 |
| 8.95, 1.50, 5.77 | Russian_lod1/brick_painted_white | 81 | 4.892 |

(553 more in the JSON)

## nonmanifold (warn, 24)

| at | part | uses |
|---|---|---|
| 0.00, 6.86, 0.04 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.78, 0.23 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.76, -0.21 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.59, 0.31 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.55, -0.33 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.39, 0.28 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.34, -0.21 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 6.27, 0.08 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 7.11, 0.72 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 7.45, 0.06 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 7.40, -0.29 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 7.27, -0.56 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 6.67, -0.90 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 6.00, -0.72 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 5.65, -0.12 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 5.83, 0.56 | Russian_lod1/brick_painted_white | 3 |
| -0.02, 6.43, 0.90 | Russian_lod1/brick_painted_white | 3 |
| 0.00, 3.77, -5.85 | Russian_lod1/brick_painted_white | 3 |
| -0.08, 3.77, 5.77 | Russian_lod1/brick_painted_white | 3 |
| 12.83, 3.77, 5.85 | Russian_lod1/brick_painted_white | 3 |
| 12.91, 3.77, -5.77 | Russian_lod1/brick_painted_white | 3 |
| 6.05, 15.20, 4.62 | Russian_lod1/brick_painted_white | 3 |
| 6.05, 15.20, -4.38 | Russian_lod1/brick_painted_white | 3 |
| 17.17, 18.77, 12.07 | Russian_lod1/cast_iron_green | 4 |

## tjunction (warn, 125)

| at | part | edge_m |
|---|---|---|
| 0.00, 4.75, -3.41 | Russian_lod1/brick_painted_white | 7.493 |
| 0.25, 1.89, -0.01 | Russian_lod1/brick_painted_white | 1.7 |
| 0.00, 3.10, -3.85 | Russian_lod1/brick_painted_white | 0.08 |
| 0.00, 3.10, -3.31 | Russian_lod1/brick_painted_white | 0.08 |
| 0.00, 3.10, -3.75 | Russian_lod1/brick_painted_white | 0.54 |
| 0.00, -0.15, -3.84 | Russian_lod1/brick_painted_white | 0.68 |
| 0.00, 3.10, 3.31 | Russian_lod1/brick_painted_white | 0.08 |
| 0.00, 3.10, 3.85 | Russian_lod1/brick_painted_white | 0.08 |
| 0.00, 3.10, 3.41 | Russian_lod1/brick_painted_white | 0.54 |
| 0.00, -0.15, 3.32 | Russian_lod1/brick_painted_white | 0.68 |
| 0.00, 9.93, -5.77 | Russian_lod1/brick_painted_white | 0.93 |
| 0.00, -0.95, 5.77 | Russian_lod1/brick_painted_white | 12.33 |
| 2.24, 3.10, 5.77 | Russian_lod1/brick_painted_white | 0.54 |
| 5.96, 2.60, 5.77 | Russian_lod1/brick_painted_white | 1.2 |
| 10.25, 3.10, 5.77 | Russian_lod1/brick_painted_white | 0.54 |
| 0.00, 9.93, 5.77 | Russian_lod1/brick_painted_white | 0.93 |
| 12.83, -0.95, 5.77 | Russian_lod1/brick_painted_white | 12.33 |
| 12.83, 9.93, 5.77 | Russian_lod1/brick_painted_white | 0.93 |
| 12.83, -0.95, -5.77 | Russian_lod1/brick_painted_white | 12.33 |
| 10.25, 3.10, -5.77 | Russian_lod1/brick_painted_white | 0.54 |
| 5.96, 2.60, -5.77 | Russian_lod1/brick_painted_white | 1.2 |
| 2.24, 3.10, -5.77 | Russian_lod1/brick_painted_white | 0.54 |
| 12.83, 9.93, -5.77 | Russian_lod1/brick_painted_white | 0.93 |
| 0.00, -0.95, -5.77 | Russian_lod1/brick_painted_white | 12.33 |
| 12.83, -0.95, 5.77 | Russian_lod1/brick_painted_white | 4.61 |
| 13.75, -1.05, 6.16 | Russian_lod1/brick_painted_white | 0.1 |
| 14.79, -1.05, 7.09 | Russian_lod1/brick_painted_white | 0.1 |
| 16.45, 2.16, 0.45 | Russian_lod1/brick_painted_white | 4.61 |
| 18.00, 7.25, 9.66 | Russian_lod1/brick_painted_white | 1.1 |
| 16.05, 7.25, 9.78 | Russian_lod1/brick_painted_white | 1.1 |
| 14.76, 7.25, 11.24 | Russian_lod1/brick_painted_white | 1.1 |
| 14.64, 7.25, 12.38 | Russian_lod1/brick_painted_white | 1.1 |
| 15.60, 7.25, 14.08 | Russian_lod1/brick_painted_white | 1.1 |
| 17.48, 7.25, 14.60 | Russian_lod1/brick_painted_white | 1.1 |
| 19.46, 7.25, 10.95 | Russian_lod1/brick_painted_white | 1.1 |
| -0.32, -0.90, -1.45 | Russian_lod1/stone_blue | 3.5 |
| 13.86, -1.05, 6.26 | Russian_lod1/stone_blue | 1.4 |
| 0.63, 11.27, -5.14 | Russian_lod1/copper_brown | 1.679 |
| 0.95, 11.27, 4.82 | Russian_lod1/copper_brown | 0.47 |
| 0.56, 11.27, 5.21 | Russian_lod1/copper_brown | 1.344 |

(85 more in the JSON)

## seam (info, 429)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 3.60, 17.30, -0.34 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 19.85 | 190 | 64.3 |
| 3.60, 17.86, -0.33 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 17.85 | 188 | 34 |
| 3.60, 18.33, -0.32 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 24.45 | 169 | 89.2 |
| 12.83, 12.99, -3.85 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 14.97 | 135 | 35.6 |
| 1.71, 13.20, -5.77 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 16.96 | 131 | 34.3 |
| 10.23, 13.19, 5.77 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 16.9 | 126 | 34.3 |
| 0.00, 12.91, 3.38 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 14.91 | 118 | 35.6 |
| 0.95, 15.08, 0.33 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 9.32 | 115 | 38.2 |
| 11.14, 13.64, 4.59 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 9.3 | 113 | 38.2 |
| 2.08, 13.31, 5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.83 | 88 | 90 |
| 6.36, 13.31, -5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.83 | 88 | 90 |
| 10.64, 13.31, 5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.82 | 87 | 90 |
| 2.08, 13.31, -5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.82 | 87 | 55.5 |
| 10.64, 13.31, -5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.82 | 87 | 55.5 |
| 6.36, 13.31, 5.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 12.82 | 86 | 55.5 |
| 9.04, 15.13, 4.62 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 8.81 | 83 | 37.3 |
| 0.00, 13.03, -0.02 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.24 | 79 | 59.8 |
| 0.00, 13.03, -3.87 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.24 | 79 | 50.2 |
| 0.00, 13.03, 3.82 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.23 | 78 | 40.7 |
| 12.83, 13.03, -3.87 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.23 | 78 | 57.6 |
| 12.83, 13.03, 3.82 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.23 | 78 | 40.6 |
| 12.83, 13.03, -0.02 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 11.22 | 77 | 36.3 |
| 0.95, 15.06, 3.05 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.93 | 76 | 47.9 |
| 5.96, 15.19, 4.62 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 9.95 | 76 | 44.4 |
| 2.48, 15.12, -4.38 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 7.86 | 76 | 36 |
| 8.50, 13.55, 0.02 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 15.55 | 76 | 88.3 |
| 11.15, 15.02, -0.23 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.92 | 75 | 31.8 |
| 9.45, 15.20, -4.38 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 9.96 | 75 | 43 |
| 5.64, 15.15, -4.38 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 9.95 | 74 | 44.5 |
| 11.15, 15.02, -3.23 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.92 | 73 | 47.9 |
| 0.95, 15.06, -2.95 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.93 | 71 | 47.8 |
| 2.65, 15.20, 4.62 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 9.97 | 71 | 44.1 |
| 0.95, 15.06, 0.05 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.93 | 70 | 47.8 |
| 11.15, 15.02, 2.77 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.92 | 65 | 48 |
| 11.15, 11.41, -4.19 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 11.53 | 64 | 41.8 |
| 0.95, 11.80, 3.95 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 11.21 | 61 | 40.4 |
| 0.00, -0.95, 5.57 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 51.75 | 60 | 86.5 |
| 11.15, 11.39, -3.96 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 9.24 | 60 | 48.3 |
| 9.45, 15.20, 4.62 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 8.03 | 59 | 44.3 |
| 10.56, 11.81, 4.62 | Russian_lod1/brick_painted_white + Russian_lod1/copper_brown | 12.15 | 59 | 39.7 |

(389 more in the JSON)

## opening (info, 42)

| at | part | facing | edge_m |
|---|---|---|---|
| 0.00, 4.75, 3.36 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 6.813 |
| 0.00, 4.75, -3.69 | Russian_lod1/brick_painted_white | 0 + -1 + 0 | 0.34 |
| 0.00, 3.15, -3.81 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.71 |
| 0.00, 4.84, -3.89 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.79 |
| 0.00, 4.81, -3.76 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 0.46 |
| 0.00, 4.89, -3.83 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 0.62 |
| 0.00, 4.76, -3.35 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.71 |
| 0.00, 4.84, -3.27 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.79 |
| 0.00, 4.75, 3.69 | Russian_lod1/brick_painted_white | 0 + -1 + 0 | 0.34 |
| 0.00, 3.15, 3.35 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.71 |
| 0.00, 4.84, 3.27 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.79 |
| 0.00, 4.81, 3.39 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 0.46 |
| 0.00, 4.89, 3.32 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 0.62 |
| 0.00, 4.76, 3.81 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.71 |
| 0.00, 4.84, 3.89 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 1.79 |
| 12.91, 11.20, -5.80 | Russian_lod1/brick_painted_white | 0 + 1 + 0 | 11.7 |
| 12.86, 11.20, -5.85 | Russian_lod1/brick_painted_white | 0 + 1 + 0 | 12.99 |
| -0.08, 11.20, -5.80 | Russian_lod1/brick_painted_white | 0 + 1 + 0 | 11.7 |
| 12.86, 11.20, 5.85 | Russian_lod1/brick_painted_white | 0 + 1 + 0 | 12.99 |
| 0.95, 13.89, 1.62 | Russian_lod1/brick_painted_white | -1 + 0 + 0 | 0.058 |
| 4.35, 13.92, 4.62 | Russian_lod1/brick_painted_white | 0 + 0 + 1 | 0.065 |
| 11.15, 13.89, 1.62 | Russian_lod1/brick_painted_white | 1 + 0 + 0 | 0.058 |
| 15.18, 9.36, 12.62 | Russian_lod1/brick_painted_white | 0 + -1 + 0 | 0.164 |
| 15.96, 9.27, 13.76 | Russian_lod1/brick_painted_white | 0.49 + -0.83 + 0.27 | 0.163 |
| 19.57, 7.25, 12.92 | Russian_lod1/brick_painted_white | 0 + 1 + 0 | 1.1 |
| -0.32, -0.90, -1.70 | Russian_lod1/stone_blue | 0 + 1 + 0 | 0.3 |
| -0.32, -0.90, 1.50 | Russian_lod1/stone_blue | 0 + 1 + 0 | 0.3 |
| -0.04, 11.25, 5.77 | Russian_lod1/copper_brown | 0 + -0.1 + -0.99 | 0.15 |
| 12.83, 11.25, 5.84 | Russian_lod1/copper_brown | -1 + -0.1 + 0 | 0.15 |
| 12.83, 11.25, -5.84 | Russian_lod1/copper_brown | -1 + -0.1 + 0 | 0.15 |
| 8.51, 18.68, -0.22 | Russian_lod1/copper_brown | 0.13 + 0 + 0.99 | 0.259 |
| 0.25, -0.70, -0.71 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, -0.17, -0.15 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, -0.07, -0.71 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, 0.45, -0.15 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, 0.55, -0.71 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, 1.07, -0.15 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, 1.18, -0.71 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 0.25, 1.70, -0.15 | Russian_lod1/wood_frame_dark | -1 + 0 + 0 | 0.66 |
| 18.39, 9.27, 10.38 | Russian_lod1/wood_frame_dark | -0.62 + -0.71 + -0.34 | 0.164 |

(2 more in the JSON)

## backtoback (info, 391)

| at | parts | area |
|---|---|---|
| -0.20, -0.90, 1.05 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00011 |
| -0.22, -0.90, -1.11 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00658 |
| -0.15, -0.90, -1.09 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00264 |
| -0.13, -0.90, -1.09 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00024 |
| -0.06, -0.90, 0.94 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00006 |
| -0.11, -0.90, -1.09 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00183 |
| -0.03, -0.90, -1.03 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00244 |
| -0.00, -0.90, -0.98 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00877 |
| 0.04, -0.90, -0.95 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00264 |
| 0.06, 1.11, 0.92 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.01433 |
| 0.06, -0.90, -0.95 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00026 |
| 0.19, -0.90, 0.83 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00639 |
| 0.24, -0.90, 0.85 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00054 |
| 0.08, -0.90, -0.96 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00182 |
| 0.16, -0.90, -0.89 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00244 |
| 0.19, -0.90, -0.84 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00876 |
| 0.23, -0.90, -0.82 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00264 |
| 0.25, -0.90, 0.82 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00014 |
| 0.25, -0.90, 0.84 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00004 |
| -0.33, 1.95, -1.33 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00172 |
| -0.36, 1.95, -1.37 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00052 |
| -0.34, 1.95, -1.38 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00021 |
| -0.35, 1.95, 1.33 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00275 |
| -0.33, 1.95, 1.33 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00138 |
| 8.55, 18.31, -0.06 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00311 |
| 8.12, 18.31, -1.29 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00312 |
| 7.69, 18.31, -1.78 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00311 |
| 3.96, 18.31, 1.53 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.00312 |
| 13.76, -1.05, 6.19 | Russian_lod1/brick_painted_white + Russian_lod1/stone_blue | 0.00236 |
| 13.74, -1.05, 6.20 | Russian_lod1/brick_painted_white + Russian_lod1/stone_blue | 0.00113 |
| 14.77, -1.05, 7.09 | Russian_lod1/brick_painted_white + Russian_lod1/stone_blue | 0.00114 |
| 14.76, -1.05, 7.07 | Russian_lod1/brick_painted_white + Russian_lod1/stone_blue | 0.00065 |
| 21.15, 2.07, 8.16 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03817 |
| 21.15, 5.37, 8.16 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03817 |
| 22.52, 2.23, 5.68 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03471 |
| 22.51, 1.37, 5.70 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03518 |
| 22.52, 5.53, 5.68 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03471 |
| 22.51, 4.67, 5.70 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03518 |
| 21.03, 4.83, 4.85 | Russian_lod1/brick_painted_white + Russian_lod1/brick_painted_white | 0.03798 |
| -0.06, 11.41, -5.75 | Russian_lod1/copper_brown + Russian_lod1/copper_brown | 0.00143 |

(351 more in the JSON)


Nodes: Russian_lod1. Distances: {"Russian_lod1":320}. Quantum 0.196 mm. Offset 0,0,0.
