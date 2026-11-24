# Mesh audit (before pack): inside.inside

21,125 triangles, 11,461 welded vertices, 2,165 open edges, 139,880 rays, 2197 ms.

**0 blocking**, 1175 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 708 |
| nonmanifold | warn | 24 |
| tjunction | warn | 443 |
| seam | info | 201 |
| opening | info | 109 |
| backtoback | info | 48 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 708)

| at | part | aspect | longest |
|---|---|---|---|
| -1.53, 48.56, 1.04 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 48.55, 1.04 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 48.57, 1.07 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 48.57, 1.06 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 48.73, 1.34 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 48.72, 1.34 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 48.74, 1.37 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 48.74, 1.36 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 48.89, 1.64 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 48.88, 1.64 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 48.90, 1.67 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 48.90, 1.66 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.06, 1.94 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.05, 1.94 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.07, 1.97 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.07, 1.96 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.23, 2.24 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.22, 2.24 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.24, 2.27 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.24, 2.26 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.40, 2.54 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.39, 2.54 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.41, 2.57 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.41, 2.56 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.57, 2.84 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.56, 2.84 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.58, 2.87 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.58, 2.86 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.73, 3.14 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.73, 3.14 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.74, 3.17 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.74, 3.16 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 49.90, 3.44 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 49.89, 3.44 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 49.91, 3.47 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 49.91, 3.46 | Inside/concrete_step | 52 | 2.599 |
| -1.53, 50.07, 3.74 | Inside/concrete_step | 87 | 2.599 |
| -2.40, 50.06, 3.74 | Inside/concrete_step | 87 | 2.599 |
| -1.53, 50.08, 3.77 | Inside/concrete_step | 52 | 2.599 |
| -2.40, 50.08, 3.76 | Inside/concrete_step | 52 | 2.599 |

(668 more in the JSON)

## nonmanifold (warn, 24)

| at | part | uses |
|---|---|---|
| 7.19, 50.50, 1.02 | Inside/wall_mural | 3 |
| 8.87, 50.50, 1.02 | Inside/wall_mural | 3 |
| 11.54, 50.50, 1.02 | Inside/wall_mural | 3 |
| 13.21, 50.50, 1.02 | Inside/wall_mural | 3 |
| 8.03, 50.34, 1.02 | Inside/painted_metal_grey | 3 |
| 12.38, 50.66, 1.02 | Inside/painted_metal_grey | 3 |
| 13.23, 50.65, 1.02 | Inside/painted_metal_grey | 3 |
| 11.52, 50.65, 1.02 | Inside/painted_metal_grey | 3 |
| 8.03, 50.66, 1.02 | Inside/painted_metal_grey | 3 |
| 12.38, 50.34, 1.02 | Inside/painted_metal_grey | 3 |
| 11.52, 50.35, 1.02 | Inside/painted_metal_grey | 3 |
| 13.23, 50.35, 1.02 | Inside/painted_metal_grey | 3 |
| 8.88, 50.65, 1.02 | Inside/painted_metal_grey | 3 |
| 7.17, 50.65, 1.02 | Inside/painted_metal_grey | 3 |
| 7.17, 50.35, 1.02 | Inside/painted_metal_grey | 3 |
| 8.88, 50.35, 1.02 | Inside/painted_metal_grey | 3 |
| 7.17, 50.35, 1.03 | Inside/painted_metal_grey | 4 |
| 8.89, 50.35, 1.03 | Inside/painted_metal_grey | 4 |
| 8.89, 50.65, 1.03 | Inside/painted_metal_grey | 4 |
| 7.17, 50.65, 1.03 | Inside/painted_metal_grey | 4 |
| 11.52, 50.35, 1.03 | Inside/painted_metal_grey | 4 |
| 13.23, 50.35, 1.03 | Inside/painted_metal_grey | 4 |
| 13.23, 50.65, 1.03 | Inside/painted_metal_grey | 4 |
| 11.52, 50.65, 1.03 | Inside/painted_metal_grey | 4 |

## tjunction (warn, 443)

| at | part | edge_m |
|---|---|---|
| -2.89, 48.40, 1.04 | Inside/concrete_step | 2.599 |
| -2.91, 50.75, 4.94 | Inside/concrete_step | 2.599 |
| -2.91, 50.75, 6.44 | Inside/concrete_step | 2.599 |
| -3.38, 50.75, 5.34 | Inside/concrete_step | 0.483 |
| -3.38, 50.75, 5.74 | Inside/concrete_step | 0.483 |
| -3.26, 50.75, 6.44 | Inside/concrete_step | 0.473 |
| -3.38, 50.75, 6.14 | Inside/concrete_step | 0.483 |
| -0.54, 50.75, 5.34 | Inside/concrete_step | 0.483 |
| -0.54, 50.75, 5.74 | Inside/concrete_step | 0.483 |
| -0.66, 50.75, 6.44 | Inside/concrete_step | 0.473 |
| -0.54, 50.75, 6.14 | Inside/concrete_step | 0.483 |
| -3.26, 50.75, 4.94 | Inside/concrete_step | 0.473 |
| -0.66, 50.75, 4.94 | Inside/concrete_step | 0.473 |
| -3.38, 48.40, -1.13 | Inside/floor_tile_grey | 0.488 |
| -3.38, 48.40, -0.69 | Inside/floor_tile_grey | 0.488 |
| -3.38, 48.40, -0.26 | Inside/floor_tile_grey | 0.488 |
| -3.38, 48.40, 0.17 | Inside/floor_tile_grey | 0.488 |
| -3.26, 48.40, 1.04 | Inside/floor_tile_grey | 0.494 |
| -3.38, 48.40, 0.61 | Inside/floor_tile_grey | 0.488 |
| -0.66, 48.40, 1.04 | Inside/floor_tile_grey | 0.494 |
| 23.79, 48.40, -1.13 | Inside/floor_tile_grey | 0.488 |
| 23.79, 48.40, -0.69 | Inside/floor_tile_grey | 0.488 |
| 23.79, 48.40, -0.26 | Inside/floor_tile_grey | 0.488 |
| 23.79, 48.40, 0.17 | Inside/floor_tile_grey | 0.488 |
| 23.79, 48.40, 0.61 | Inside/floor_tile_grey | 0.488 |
| -2.89, 48.40, -1.40 | Inside/floor_tile_grey | 27.169 |
| -2.89, 48.40, -1.40 | Inside/floor_tile_grey | 27.169 |
| -3.38, 48.40, 0.74 | Inside/wall_mural | 0.433 |
| -3.38, 48.57, 1.04 | Inside/wall_mural | 0.5 |
| -3.38, 50.60, 1.04 | Inside/wall_mural | 0.35 |
| -3.38, 48.40, 0.55 | Inside/wall_mural | 0.433 |
| -3.38, 48.40, 0.06 | Inside/wall_mural | 0.433 |
| -3.38, 48.40, -0.42 | Inside/wall_mural | 0.433 |
| -3.38, 48.40, -0.91 | Inside/wall_mural | 0.433 |
| 23.79, 48.40, -1.40 | Inside/wall_mural | 0.433 |
| 23.79, 48.57, -1.56 | Inside/wall_mural | 0.5 |
| 23.79, 50.60, -1.56 | Inside/wall_mural | 0.35 |
| 23.79, 48.40, -0.91 | Inside/wall_mural | 0.433 |
| 23.79, 48.40, -0.42 | Inside/wall_mural | 0.433 |
| 23.79, 48.40, 0.06 | Inside/wall_mural | 0.433 |

(403 more in the JSON)

## seam (info, 201)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -3.38, 55.17, 4.87 | Inside/wall_mural + Inside/ceiling_paint | 17.8 | 94 | 90 |
| -2.64, 48.40, -1.40 | Inside/floor_tile_grey + Inside/floor_tile_grey | 26.18 | 53 | 90 |
| -2.64, 48.40, -1.40 | Inside/floor_tile_grey + Inside/floor_tile_grey | 26.18 | 53 | 90 |
| 21.19, 53.69, -6.72 | Inside/wall_mural + Inside/ceiling_paint | 9.36 | 48 | 90 |
| -3.32, 49.36, 0.88 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.32, 49.80, 1.68 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.32, 50.53, 2.98 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.31, 51.26, 4.28 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.32, 51.71, 6.28 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.32, 52.30, 7.33 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.31, 53.31, 9.13 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.62, 49.36, 0.88 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.62, 49.80, 1.68 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.62, 50.53, 2.98 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.61, 51.26, 4.28 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.62, 51.71, 6.28 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.62, 52.30, 7.33 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -0.61, 53.31, 9.13 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 21.25, 49.36, -1.41 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 21.25, 49.90, -2.36 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 21.25, 50.80, -3.96 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 21.25, 51.70, -5.56 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 23.71, 49.36, -1.41 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 23.71, 49.90, -2.36 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 23.71, 50.80, -3.96 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| 23.71, 51.70, -5.56 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 34 | 31.2 |
| -3.32, 51.63, 5.68 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| -3.32, 53.82, 10.18 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| -0.62, 51.63, 5.68 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| -0.62, 53.82, 10.18 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| 21.25, 52.15, -6.52 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| 23.71, 52.15, -6.52 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 28 | 11.2 |
| -3.32, 51.63, 5.08 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 27 | 11.2 |
| -0.62, 51.63, 5.08 | Inside/painted_metal_grey + Inside/painted_metal_grey | 0.05 | 27 | 11.2 |
| -0.05, 50.85, -0.37 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |
| 6.37, 50.85, -0.37 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |
| 9.89, 50.85, -0.37 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |
| 12.86, 50.85, -0.37 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |
| 19.28, 50.85, -0.37 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |
| -2.07, 55.17, 2.74 | Inside/ceiling_paint + Inside/painted_metal_grey | 2.93 | 22 | 90 |

(161 more in the JSON)

## opening (info, 109)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.21, 52.94, 10.04 | Inside/concrete_step | 0 + 0 + -1 | 2.599 |
| 23.62, 51.27, -6.36 | Inside/concrete_step | 0 + 0 + 1 | 2.359 |
| -3.38, 48.45, 1.04 | Inside/wall_mural | 1 + 0 + 0 | 0.1 |
| 23.79, 48.45, -1.56 | Inside/wall_mural | -1 + 0 + 0 | 0.1 |
| -0.59, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| -1.06, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| -1.54, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| -2.01, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| -2.48, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| -2.96, 50.60, 0.80 | Inside/wall_mural | 0 + 0 + -1 | 0.473 |
| 21.24, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| 21.67, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| 22.11, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| 22.54, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| 22.97, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| 23.41, 50.60, -1.32 | Inside/wall_mural | 0 + 0 + 1 | 0.433 |
| -3.38, 48.95, 1.04 | Inside/wall_mural | 1 + 0 + 0 | 0.432 |
| -3.38, 53.55, 10.04 | Inside/wall_mural | 1 + 0 + 0 | 0.1 |
| -3.38, 53.65, 10.04 | Inside/wall_mural | 1 + 0 + 0 | 0.4 |
| -3.38, 55.01, 10.04 | Inside/wall_mural | 1 + 0 + 0 | 0.01 |
| -3.38, 55.05, 10.04 | Inside/wall_mural | 1 + 0 + 0 | 0.16 |
| -3.38, 52.94, 10.09 | Inside/wall_mural | 1 + 0 + 0 | 0.301 |
| -3.38, 52.97, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.061 |
| -3.38, 53.05, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.5 |
| -3.38, 53.55, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.5 |
| -3.38, 54.05, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.5 |
| -3.38, 54.55, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.5 |
| -3.38, 55.04, 10.34 | Inside/wall_mural | 1 + 0 + 0 | 0.17 |
| -0.54, 53.55, 10.04 | Inside/wall_mural | -1 + 0 + 0 | 0.1 |
| -0.54, 53.65, 10.04 | Inside/wall_mural | -1 + 0 + 0 | 0.4 |
| -0.54, 55.01, 10.04 | Inside/wall_mural | -1 + 0 + 0 | 0.01 |
| -0.54, 55.05, 10.04 | Inside/wall_mural | -1 + 0 + 0 | 0.16 |
| -0.54, 52.94, 10.09 | Inside/wall_mural | -1 + 0 + 0 | 0.301 |
| -0.54, 53.05, 10.34 | Inside/wall_mural | -1 + 0 + 0 | 0.5 |
| -0.54, 53.55, 10.34 | Inside/wall_mural | -1 + 0 + 0 | 0.5 |
| -0.54, 54.05, 10.34 | Inside/wall_mural | -1 + 0 + 0 | 0.5 |
| -0.54, 54.55, 10.34 | Inside/wall_mural | -1 + 0 + 0 | 0.5 |
| -0.54, 55.04, 10.34 | Inside/wall_mural | -1 + 0 + 0 | 0.17 |
| -1.44, 50.60, 1.04 | Inside/wall_mural | 0 + 0 + 1 | 0.473 |
| -1.54, 50.60, 1.04 | Inside/wall_mural | 0 + 0 + 1 | 0.473 |

(69 more in the JSON)

## backtoback (info, 48)

| at | parts | area |
|---|---|---|
| -3.38, 48.41, 0.91 | Inside/wall_mural + Inside/painted_metal_grey | 0.00736 |
| -3.38, 48.45, 0.97 | Inside/wall_mural + Inside/painted_metal_grey | 0.01372 |
| -3.38, 48.51, 1.00 | Inside/wall_mural + Inside/painted_metal_grey | 0.00279 |
| -3.38, 48.54, 1.03 | Inside/wall_mural + Inside/painted_metal_grey | 0.00135 |
| -3.38, 49.32, 0.89 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 49.31, 0.89 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 23.79, 48.41, -1.43 | Inside/wall_mural + Inside/painted_metal_grey | 0.00736 |
| 23.79, 48.44, -1.50 | Inside/wall_mural + Inside/painted_metal_grey | 0.01374 |
| 23.79, 48.51, -1.52 | Inside/wall_mural + Inside/painted_metal_grey | 0.00281 |
| 23.79, 48.53, -1.55 | Inside/wall_mural + Inside/painted_metal_grey | 0.00137 |
| 23.79, 49.32, -1.41 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 23.79, 49.31, -1.41 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.22, 4.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.22, 4.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 49.77, 1.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 49.76, 1.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.59, 5.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.58, 5.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.59, 5.09 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.58, 5.09 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.67, 6.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 51.66, 6.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 53.77, 10.19 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -3.38, 53.77, 10.19 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 49.77, 1.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 49.76, 1.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.22, 4.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.22, 4.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.59, 5.09 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.58, 5.09 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.59, 5.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.58, 5.69 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.67, 6.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 51.66, 6.29 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 53.77, 10.19 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| -0.54, 53.77, 10.19 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 21.19, 50.75, -3.96 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 21.19, 50.74, -3.96 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 21.19, 51.65, -5.56 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |
| 21.19, 51.64, -5.56 | Inside/wall_mural + Inside/painted_metal_grey | 0.00006 |

(8 more in the JSON)


Nodes: Inside. Distances: {"*":55}. Quantum 0.000 mm. Offset 0,40,0.
