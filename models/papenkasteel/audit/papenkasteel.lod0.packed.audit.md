# Mesh audit (packed): papenkasteel.lod0

51,118 triangles, 34,432 welded vertices, 16,986 open edges, 1,141,916 rays, 30302 ms.

**5 blocking**, 7479 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| crossing | block | 3 |
| bentflat | block | 2 |
| sliver | warn | 4651 |
| nonmanifold | warn | 986 |
| tjunction | warn | 1842 |
| seam | info | 7425 |
| opening | info | 1578 |
| backtoback | info | 3889 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## crossing (block, 3)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| -6.79, 64.63, -3.83 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 11.8 | 0.3 |
| 3.83, 64.63, -3.83 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 11.4 | 0.3 |
| 3.83, 64.63, -3.83 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 11.7 | 0 |

## bentflat (block, 2)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| -9.56, 59.23, 25.18 | Papenkasteel/zinc_roof | 3.1 | 0.1691 | 0.34 |
| -1.87, 59.23, 25.18 | Papenkasteel/zinc_roof | 3.1 | 0.1691 | 0.34 |

## sliver (warn, 4651)

| at | part | aspect | longest |
|---|---|---|---|
| -7.51, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -7.51, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -7.63, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -7.63, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -6.37, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -6.37, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -6.49, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -6.49, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -6.83, 53.37, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| -7.17, 53.37, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| -6.83, 53.25, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| -7.17, 53.25, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| -5.69, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -5.69, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -5.81, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -5.81, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -4.55, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -4.55, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -4.67, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| -4.67, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| -5.01, 53.37, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| -5.35, 53.37, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| -5.01, 53.25, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| -5.35, 53.25, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| 2.19, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| 2.19, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 2.07, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 2.07, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| 3.33, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| 3.33, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 3.21, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 3.21, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| 2.87, 53.37, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| 2.53, 53.37, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| 2.87, 53.25, 1.50 | Papenkasteel/render_white | 67 | 1.012 |
| 2.53, 53.25, 1.51 | Papenkasteel/render_white | 67 | 1.012 |
| 4.01, 51.48, 1.50 | Papenkasteel/render_white | 189 | 2.84 |
| 4.01, 52.42, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 3.89, 51.48, 1.51 | Papenkasteel/render_white | 189 | 2.84 |
| 3.89, 52.42, 1.50 | Papenkasteel/render_white | 189 | 2.84 |

(4611 more in the JSON)

## nonmanifold (warn, 986)

| at | part | uses |
|---|---|---|
| -7.45, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -7.45, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.55, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.55, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -7.39, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -7.39, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -7.05, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -7.05, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.95, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.95, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.61, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -6.61, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.63, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.63, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -4.74, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -4.74, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.57, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.57, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.24, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.24, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.13, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -5.13, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -4.79, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| -4.79, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.25, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.25, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 3.15, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 3.15, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.31, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.31, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.65, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.65, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.75, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 2.75, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 3.09, 53.19, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 3.09, 50.63, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 4.08, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 4.08, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 4.96, 53.26, 1.28 | Papenkasteel/wood_frame_white | 3 |
| 4.96, 50.54, 1.28 | Papenkasteel/wood_frame_white | 3 |

(946 more in the JSON)

## tjunction (warn, 1842)

| at | part | edge_m |
|---|---|---|
| -12.10, 52.85, 1.50 | Papenkasteel/render_white | 0.7 |
| -7.80, 49.06, 1.50 | Papenkasteel/render_white | 1.909 |
| -7.80, 52.35, 1.50 | Papenkasteel/render_white | 2 |
| -7.51, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| -6.49, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| -7.51, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| -6.49, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| -5.69, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| -4.67, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| -5.69, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| -4.67, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| 2.19, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| 3.21, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| 2.19, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| 3.21, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| 4.01, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| 5.03, 52.55, 1.50 | Papenkasteel/render_white | 2.7 |
| 4.01, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| 5.03, 50.55, 1.50 | Papenkasteel/render_white | 2.84 |
| -7.51, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| -6.49, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| -7.51, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| -6.49, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| -5.69, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| -4.67, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| -5.69, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| -4.67, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| 2.19, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| 3.21, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| 2.19, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| 3.21, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| 4.01, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| 5.03, 54.95, 1.50 | Papenkasteel/render_white | 2.5 |
| 4.01, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| 5.03, 54.75, 1.50 | Papenkasteel/render_white | 2.64 |
| -10.46, 54.95, 1.50 | Papenkasteel/render_white | 2.44 |
| -9.44, 54.95, 1.50 | Papenkasteel/render_white | 2.44 |
| 6.79, 54.95, 1.50 | Papenkasteel/render_white | 2.44 |
| 7.81, 54.95, 1.50 | Papenkasteel/render_white | 2.44 |
| 9.15, 50.55, -9.20 | Papenkasteel/render_white | 3.45 |

(1802 more in the JSON)

## seam (info, 7425)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -4.45, 67.52, -3.44 | Papenkasteel/slate + Papenkasteel/zinc_roof | 9.64 | 389 | 50.7 |
| 1.98, 67.51, -3.45 | Papenkasteel/slate + Papenkasteel/zinc_roof | 9.64 | 389 | 50.7 |
| 2.01, 67.51, 3.35 | Papenkasteel/slate + Papenkasteel/zinc_roof | 9.64 | 389 | 50.6 |
| -4.46, 67.51, 3.38 | Papenkasteel/slate + Papenkasteel/zinc_roof | 9.64 | 389 | 50.7 |
| -0.96, 68.68, 2.66 | Papenkasteel/stone_white + Papenkasteel/slate | 2.92 | 117 | 24.7 |
| -1.52, 68.68, -2.73 | Papenkasteel/stone_white + Papenkasteel/slate | 2.92 | 117 | 24.6 |
| 1.29, 68.68, -0.32 | Papenkasteel/stone_white + Papenkasteel/slate | 2.92 | 117 | 24.7 |
| -3.77, 68.68, 0.25 | Papenkasteel/stone_white + Papenkasteel/slate | 2.92 | 117 | 24.7 |
| -11.81, 49.49, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| -11.81, 51.24, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| -11.81, 53.09, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| -11.81, 54.89, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| -11.81, 56.69, -9.32 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 8.94, 49.49, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 8.94, 51.24, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 8.94, 53.09, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 8.94, 54.89, -9.31 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 8.94, 56.69, -9.32 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 1.90, 49.49, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 1.90, 51.24, 1.58 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 1.90, 53.09, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 1.90, 54.89, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| 1.90, 56.69, 1.58 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 116 | 90 |
| -4.30, 49.49, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -4.30, 51.24, 1.58 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -4.30, 53.09, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -4.30, 54.89, 1.59 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -4.30, 56.69, 1.58 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| 9.21, 49.90, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| 9.21, 51.70, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| 9.21, 53.50, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -10.86, 49.90, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -10.86, 51.70, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -10.86, 53.50, 21.09 | Papenkasteel/zinc_roof + Papenkasteel/zinc_roof | 0.56 | 112 | 90 |
| -10.87, 57.78, 1.50 | Papenkasteel/render_white + Papenkasteel/stone_white | 58.34 | 103 | 90 |
| 7.77, 54.40, 21.50 | Papenkasteel/render_white + Papenkasteel/render_white | 21.6 | 81 | 90 |
| -1.94, 57.02, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 3.58 | 74 | 90 |
| -1.94, 60.27, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 3.58 | 74 | 90 |
| -1.94, 63.47, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 3.57 | 74 | 90 |
| -0.57, 70.71, -0.20 | Papenkasteel/slate + Papenkasteel/zinc_roof | 4.36 | 72 | 86.8 |

(7385 more in the JSON)

## opening (info, 1578)

| at | part | facing | edge_m |
|---|---|---|---|
| -12.10, 54.80, 1.50 | Papenkasteel/render_white | 0 + 0 + 1 | 0.2 |
| -12.10, 55.00, 1.50 | Papenkasteel/render_white | 0 + 0 + 1 | 2.3 |
| 1.54, 49.90, 1.50 | Papenkasteel/render_white | 0 + 0 + 1 | 1.909 |
| 9.15, 54.80, 1.50 | Papenkasteel/render_white | 0 + 0 + 1 | 0.2 |
| 9.15, 55.00, 1.50 | Papenkasteel/render_white | 0 + 0 + 1 | 2.3 |
| -6.49, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -7.51, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -7.46, 53.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| -4.67, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -5.69, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -5.63, 53.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| 3.21, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 2.19, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 2.25, 53.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| 5.03, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 4.01, 53.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 4.07, 53.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| -6.49, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -7.51, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -7.46, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| -4.67, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -5.69, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -5.63, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| 3.21, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 2.19, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 2.25, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| 5.03, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 4.01, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 4.07, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| -9.44, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -10.46, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -10.40, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| 7.81, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 6.79, 57.37, 1.51 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| 6.84, 57.25, 1.50 | Papenkasteel/render_white | 0 + -1 + 0 | 1.012 |
| -10.35, 53.37, -9.21 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -9.25, 53.37, -9.21 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -9.30, 53.25, -9.20 | Papenkasteel/render_white | 0 + -1 + 0 | 1.092 |
| -7.50, 53.37, -9.21 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |
| -6.40, 53.37, -9.21 | Papenkasteel/render_white | 0 + 1 + 0 | 0.015 |

(1538 more in the JSON)

## backtoback (info, 3889)

| at | parts | area |
|---|---|---|
| -9.02, 65.60, -3.78 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10566 |
| -9.31, 65.60, -3.67 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10061 |
| -9.29, 65.60, -4.03 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.1007 |
| -9.58, 65.60, -3.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10557 |
| -9.04, 65.76, -3.91 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.09367 |
| -9.31, 65.76, -4.02 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08738 |
| -9.29, 65.76, -3.68 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08754 |
| -9.56, 65.76, -3.79 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.0935 |
| 4.88, 65.90, -5.13 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10567 |
| 4.59, 65.90, -5.02 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.1006 |
| 4.61, 65.90, -5.38 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10075 |
| 4.32, 65.90, -5.27 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10552 |
| 4.86, 66.06, -5.26 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.09356 |
| 4.59, 66.06, -5.37 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08749 |
| 4.61, 66.06, -5.03 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08747 |
| 4.34, 66.06, -5.14 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.09357 |
| 7.68, 65.30, -6.73 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10552 |
| 7.39, 65.30, -6.62 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10075 |
| 7.41, 65.30, -6.98 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.1006 |
| 7.12, 65.30, -6.87 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.10567 |
| 7.66, 65.46, -6.86 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.09357 |
| 7.39, 65.46, -6.97 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08747 |
| 7.41, 65.46, -6.63 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.08749 |
| 7.14, 65.46, -6.74 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.09356 |
| -0.55, 52.33, 2.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.0012 |
| -0.54, 52.27, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00033 |
| -0.64, 52.61, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00154 |
| -0.77, 52.76, 2.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00103 |
| -0.72, 52.72, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00034 |
| -1.73, 52.75, 2.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00134 |
| -1.83, 52.62, 2.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00135 |
| -1.80, 52.67, 2.93 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00019 |
| -1.93, 52.33, 2.92 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.00152 |
| -14.30, 57.40, 17.46 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.0734 |
| -14.53, 57.40, 17.56 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.07047 |
| -14.52, 57.40, 17.24 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.07035 |
| -14.75, 57.40, 17.34 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.07352 |
| -14.32, 57.56, 17.34 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.06339 |
| -14.53, 57.56, 17.25 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.05994 |
| -14.52, 57.56, 17.55 | Papenkasteel/brick_red_brussels + Papenkasteel/stone_white | 0.05984 |

(3849 more in the JSON)


Nodes: Papenkasteel. Distances: {"Papenkasteel":95,"Papenkasteel_far":385,"Papenkasteel_lod2":2000}. Quantum 0.260 mm. Offset 0,40,0.
