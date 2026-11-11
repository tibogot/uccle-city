# Mesh audit: verrewinkel.glb

34,073 triangles, 18,723 welded vertices, 3,773 open edges, 238,746 rays, 3724 ms.

**0 blocking**, 3430 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 2106 |
| nonmanifold | warn | 1212 |
| tjunction | warn | 112 |
| seam | info | 1123 |
| opening | info | 14 |
| backtoback | info | 1010 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 2106)

| at | part | aspect | longest |
|---|---|---|---|
| -17.11, 3.48, -2.39 | verrewinkel/brick_red_brussels | 270 | 7.623 |
| 17.11, 4.60, -2.39 | verrewinkel/brick_red_brussels | 329 | 9.297 |
| 15.01, -0.08, -2.37 | verrewinkel/brick_red_brussels | 161 | 4.548 |
| 6.99, 1.43, -2.37 | verrewinkel/brick_red_brussels | 161 | 4.548 |
| 5.51, -0.23, -2.37 | verrewinkel/brick_red_brussels | 145 | 4.11 |
| -5.51, 1.14, -2.37 | verrewinkel/brick_red_brussels | 145 | 4.11 |
| -6.99, -0.44, -2.37 | verrewinkel/brick_red_brussels | 123 | 3.473 |
| -15.01, 0.71, -2.37 | verrewinkel/brick_red_brussels | 123 | 3.473 |
| -5.73, 8.07, -2.49 | verrewinkel/brick_red_brussels | 1200 | 34.441 |
| 17.13, 1.50, -2.49 | verrewinkel/brick_red_brussels | 329 | 9.297 |
| -17.13, 3.48, -2.49 | verrewinkel/brick_red_brussels | 270 | 7.625 |
| -17.11, 0.94, 2.39 | verrewinkel/brick_red_brussels | 269 | 7.622 |
| -15.01, -0.44, 2.37 | verrewinkel/brick_red_brussels | 123 | 3.473 |
| -6.99, 0.71, 2.37 | verrewinkel/brick_red_brussels | 123 | 3.473 |
| -5.51, -0.23, 2.37 | verrewinkel/brick_red_brussels | 145 | 4.11 |
| 5.51, 1.14, 2.37 | verrewinkel/brick_red_brussels | 145 | 4.11 |
| 6.99, -0.08, 2.37 | verrewinkel/brick_red_brussels | 161 | 4.548 |
| 15.01, 1.43, 2.37 | verrewinkel/brick_red_brussels | 161 | 4.548 |
| 17.11, 1.50, 2.39 | verrewinkel/brick_red_brussels | 329 | 9.296 |
| -17.13, 0.94, 2.49 | verrewinkel/brick_red_brussels | 270 | 7.623 |
| 17.13, 4.60, 2.49 | verrewinkel/brick_red_brussels | 329 | 9.298 |
| 5.73, 8.63, 2.49 | verrewinkel/brick_red_brussels | 1200 | 34.441 |
| -18.96, 7.42, -3.02 | verrewinkel/brick_red_brussels | 99 | 2.771 |
| 18.08, 9.24, -2.75 | verrewinkel/brick_red_brussels | 97 | 2.75 |
| -18.08, 7.47, 2.75 | verrewinkel/brick_red_brussels | 99 | 2.75 |
| 18.96, 9.27, 3.02 | verrewinkel/brick_red_brussels | 98 | 2.771 |
| -17.12, 0.94, -2.43 | verrewinkel/brick_red_brussels | 95 | 7.624 |
| 17.12, 4.60, -2.43 | verrewinkel/brick_red_brussels | 116 | 9.297 |
| 3.69, 7.50, -2.50 | verrewinkel/brick_red_brussels | 53 | 1.591 |
| -5.73, 8.08, -2.23 | verrewinkel/brick_red_brussels | 91 | 34.443 |
| -19.51, 7.14, -2.80 | verrewinkel/brick_red_brussels | 44 | 1.258 |
| 19.84, 9.02, -2.90 | verrewinkel/brick_red_brussels | 46 | 0.899 |
| -17.12, 3.48, 2.43 | verrewinkel/brick_red_brussels | 95 | 7.624 |
| 17.12, 1.50, 2.43 | verrewinkel/brick_red_brussels | 116 | 9.297 |
| -5.73, 8.08, 2.35 | verrewinkel/brick_red_brussels | 91 | 34.443 |
| 19.84, 9.06, 2.90 | verrewinkel/brick_red_brussels | 41 | 0.799 |
| -19.89, 4.70, -2.72 | verrewinkel/brick_red_brussels | 556 | 9.429 |
| -19.88, 4.70, -3.32 | verrewinkel/brick_red_brussels | 556 | 9.429 |
| -19.27, 1.55, -2.72 | verrewinkel/brick_red_brussels | 556 | 9.429 |
| -19.28, 1.55, -3.32 | verrewinkel/brick_red_brussels | 556 | 9.429 |

(2066 more in the JSON)

## nonmanifold (warn, 1212)

| at | part | uses |
|---|---|---|
| -17.24, 7.52, -2.02 | verrewinkel/brick_red_brussels | 3 |
| 17.24, 9.20, -2.02 | verrewinkel/brick_red_brussels | 3 |
| 17.16, 9.20, -2.58 | verrewinkel/brick_red_brussels | 3 |
| -14.74, 7.64, -2.04 | verrewinkel/brick_red_brussels | 3 |
| -12.29, 7.76, -2.56 | verrewinkel/brick_red_brussels | 3 |
| -9.83, 7.88, -2.04 | verrewinkel/brick_red_brussels | 3 |
| -7.37, 8.00, -2.56 | verrewinkel/brick_red_brussels | 3 |
| -4.91, 8.12, -2.04 | verrewinkel/brick_red_brussels | 3 |
| -2.46, 8.24, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 0.00, 8.36, -2.04 | verrewinkel/brick_red_brussels | 3 |
| 2.46, 8.48, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 4.91, 8.60, -2.04 | verrewinkel/brick_red_brussels | 3 |
| 7.37, 8.72, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 9.83, 8.84, -2.04 | verrewinkel/brick_red_brussels | 3 |
| 12.29, 8.96, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 14.74, 9.08, -2.04 | verrewinkel/brick_red_brussels | 3 |
| -18.31, 7.47, 2.37 | verrewinkel/brick_red_brussels | 3 |
| -15.97, 7.58, 2.56 | verrewinkel/brick_red_brussels | 3 |
| -13.51, 7.70, 2.04 | verrewinkel/brick_red_brussels | 3 |
| -11.06, 7.82, 2.56 | verrewinkel/brick_red_brussels | 3 |
| -8.60, 7.94, 2.04 | verrewinkel/brick_red_brussels | 3 |
| -6.14, 8.06, 2.56 | verrewinkel/brick_red_brussels | 3 |
| -3.69, 8.18, 2.04 | verrewinkel/brick_red_brussels | 3 |
| -1.23, 8.30, 2.56 | verrewinkel/brick_red_brussels | 3 |
| 1.23, 8.42, 2.04 | verrewinkel/brick_red_brussels | 3 |
| 3.69, 8.54, 2.56 | verrewinkel/brick_red_brussels | 3 |
| 6.14, 8.66, 2.04 | verrewinkel/brick_red_brussels | 3 |
| 8.60, 8.78, 2.56 | verrewinkel/brick_red_brussels | 3 |
| 11.06, 8.90, 2.04 | verrewinkel/brick_red_brussels | 3 |
| 13.51, 9.02, 2.56 | verrewinkel/brick_red_brussels | 3 |
| 15.97, 9.14, 2.04 | verrewinkel/brick_red_brussels | 3 |
| 18.16, 9.25, 2.86 | verrewinkel/brick_red_brussels | 3 |
| -17.16, 7.52, -2.58 | verrewinkel/brick_red_brussels | 3 |
| -14.74, 7.64, -2.56 | verrewinkel/brick_red_brussels | 3 |
| -9.83, 7.88, -2.56 | verrewinkel/brick_red_brussels | 3 |
| -4.91, 8.12, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 0.00, 8.36, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 4.91, 8.60, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 9.83, 8.84, -2.56 | verrewinkel/brick_red_brussels | 3 |
| 14.74, 9.08, -2.56 | verrewinkel/brick_red_brussels | 3 |

(1172 more in the JSON)

## tjunction (warn, 112)

| at | part | edge_m |
|---|---|---|
| -15.05, 6.86, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -10.75, 7.07, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -6.45, 7.28, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -2.15, 7.49, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 2.15, 7.70, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 6.45, 7.91, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 10.75, 8.12, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 15.05, 8.32, -2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -15.05, 6.83, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -10.75, 7.04, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -6.45, 7.25, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -2.15, 7.46, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 2.15, 7.67, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 6.45, 7.88, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 10.75, 8.09, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| 15.05, 8.29, 2.10 | verrewinkel/brick_red_brussels | 1.435 |
| -19.85, 6.46, -2.90 | verrewinkel/brick_red_brussels | 6.6 |
| -15.77, 7.59, -2.10 | verrewinkel/brick_red_brussels | 34.441 |
| 18.85, 9.28, -2.60 | verrewinkel/brick_red_brussels | 2.75 |
| -19.85, 6.49, -2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.43, -2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 18.85, 9.28, 2.60 | verrewinkel/brick_red_brussels | 2.75 |
| -19.85, 6.59, 2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.53, 2.90 | verrewinkel/brick_red_brussels | 0.91 |
| 19.85, 8.40, -2.90 | verrewinkel/brick_red_brussels | 6.6 |
| -19.85, 6.46, -3.30 | verrewinkel/brick_red_brussels | 8.97 |
| -18.85, 7.44, -2.60 | verrewinkel/brick_red_brussels | 2.75 |
| 19.85, 8.40, -3.30 | verrewinkel/brick_red_brussels | 10.91 |
| 19.85, 8.40, 3.30 | verrewinkel/brick_red_brussels | 10.91 |
| -15.77, 7.59, 2.10 | verrewinkel/brick_red_brussels | 34.441 |
| -19.85, 6.46, 3.30 | verrewinkel/brick_red_brussels | 8.97 |
| -18.85, 7.44, 2.60 | verrewinkel/brick_red_brussels | 2.75 |
| -16.09, 5.90, 2.38 | verrewinkel/stone_blue | 0.497 |
| -14.10, 6.00, 2.38 | verrewinkel/stone_blue | 0.497 |
| -12.11, 6.10, 2.38 | verrewinkel/stone_blue | 0.497 |
| -10.12, 6.20, 2.38 | verrewinkel/stone_blue | 0.497 |
| -8.13, 6.29, 2.38 | verrewinkel/stone_blue | 0.497 |
| -6.14, 6.39, 2.38 | verrewinkel/stone_blue | 0.497 |
| -4.15, 6.49, 2.38 | verrewinkel/stone_blue | 0.497 |
| -2.16, 6.58, 2.38 | verrewinkel/stone_blue | 0.497 |

(72 more in the JSON)

## seam (info, 1123)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -3.81, 5.40, -2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 16.3 | 140 | 90 |
| 5.73, 2.51, 2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 16.3 | 140 | 90 |
| 6.98, 2.95, 2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 13.91 | 138 | 90 |
| 8.69, 6.24, -2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 13.91 | 138 | 90 |
| -15.45, 1.88, -2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 13.91 | 135 | 90 |
| -15.45, 1.88, 2.38 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 13.91 | 135 | 90 |
| -20.89, 6.19, 10.75 | verrewinkel_foot/concrete + verrewinkel_foot/resin_terracotta | 42.82 | 68 | 89.3 |
| -3.73, 7.11, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 51 | 90 |
| -3.07, 7.43, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 51 | 90 |
| -7.75, 5.98, 3.81 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 69.2 |
| -7.65, 5.99, 7.60 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 69.2 |
| 4.78, 6.59, 3.82 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 67.6 |
| 4.86, 6.60, 7.54 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 67.6 |
| -6.55, 0.85, 5.50 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 67.7 |
| -6.19, 0.85, 5.86 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 68.3 |
| 5.95, 1.88, 5.50 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.89 | 50 | 66.1 |
| 6.33, 1.88, 5.84 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.88 | 50 | 66.7 |
| 3.69, 7.50, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 4.26, 7.52, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -4.24, 7.09, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -1.40, 7.44, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 11.54, 7.97, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 9.57, 7.86, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -11.63, 6.77, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -9.64, 6.87, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 7.58, 7.76, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -7.65, 6.97, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -5.66, 7.06, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -1.40, 7.44, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 2.46, 7.57, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -11.61, 6.79, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -9.62, 6.89, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 11.62, 7.92, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 9.63, 7.82, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| -7.63, 6.99, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 7.64, 7.72, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 5.65, 7.62, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 49 | 90 |
| 0.43, 7.45, -2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 48 | 90 |
| 0.43, 7.45, 2.50 | verrewinkel/brick_red_brussels + verrewinkel_fine/brick_red_brussels | 2.85 | 48 | 90 |
| -4.67, 6.13, 3.80 | verrewinkel_foot/concrete + verrewinkel_foot/painted_metal_white | 0.89 | 48 | 66.2 |

(1083 more in the JSON)

## opening (info, 14)

| at | part | facing | edge_m |
|---|---|---|---|
| -20.45, 6.46, -1.15 | verrewinkel/asphalt | -0.05 + 1 + 0 | 2.95 |
| 22.35, 8.07, 1.70 | verrewinkel/asphalt | 0.13 + 0.99 + 0 | 2.95 |
| -20.00, 6.48, -2.92 | verrewinkel/paving_concrete | -0.05 + 1 + 0 | 0.609 |
| -20.45, 6.46, -1.27 | verrewinkel/paving_concrete | -0.05 + 1 + 0 | 0.15 |
| -20.45, 6.48, 1.80 | verrewinkel/paving_concrete | -0.06 + 1 + -0.06 | 1.253 |
| 22.30, 8.18, 3.00 | verrewinkel/paving_concrete | 0.13 + 0.99 + -0.06 | 1.261 |
| -20.45, 6.47, 1.75 | verrewinkel/paving_concrete | 0 + 0 + -1 | 0.02 |
| 19.99, 8.41, -2.91 | verrewinkel/paving_concrete | 0.15 + 0.99 + 0 | 1.269 |
| 22.35, 8.07, -1.40 | verrewinkel/paving_concrete | 0.13 + 0.99 + 0 | 1.65 |
| 22.35, 8.07, -1.27 | verrewinkel/paving_concrete | 0.13 + 0.99 + 0 | 0.15 |
| 22.35, 8.17, 2.95 | verrewinkel/paving_concrete | 0.13 + 0.99 + -0.06 | 1.253 |
| 22.35, 8.08, 1.75 | verrewinkel/paving_concrete | 0 + 0 + -1 | 0.02 |
| 21.00, 8.24, 8.75 | verrewinkel_foot/concrete | 1 + 0 + 0 | 0.25 |
| -21.50, 6.16, 11.12 | verrewinkel_foot/concrete | -1 + 0 + 0 | 0.25 |

## backtoback (info, 1010)

| at | parts | area |
|---|---|---|
| -16.01, 6.08, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -15.80, 6.09, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -14.02, 6.17, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -13.81, 6.18, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -12.03, 6.27, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -11.82, 6.28, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -10.04, 6.37, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -9.83, 6.38, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -8.05, 6.47, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -7.84, 6.48, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -6.06, 6.56, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -5.85, 6.57, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -4.07, 6.66, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -3.86, 6.67, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -2.08, 6.76, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| -1.87, 6.77, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -0.18, 6.85, -2.44 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00923 |
| 0.00, 6.86, -2.46 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00999 |
| 1.90, 6.95, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 2.11, 6.96, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 3.89, 7.05, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 4.10, 7.06, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 5.88, 7.15, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 6.09, 7.16, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 7.87, 7.25, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 8.08, 7.25, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 9.86, 7.34, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 10.07, 7.35, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 11.85, 7.44, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 12.06, 7.45, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 13.84, 7.54, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 14.05, 7.55, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| 15.83, 7.63, -2.45 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.01674 |
| 16.04, 7.64, -2.47 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00249 |
| -19.25, 7.42, -2.95 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00198 |
| -19.05, 7.43, -2.91 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.10447 |
| -19.25, 7.42, -2.95 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00233 |
| -18.54, 7.45, -2.79 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.12049 |
| -18.21, 7.47, -2.71 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00087 |
| -18.20, 7.47, -2.71 | verrewinkel/brick_red_brussels + verrewinkel/stone_blue | 0.00086 |

(970 more in the JSON)


Nodes: verrewinkel, verrewinkel_foot, verrewinkel_fine. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
