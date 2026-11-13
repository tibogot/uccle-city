# Mesh audit: engeland.glb

4,556 triangles, 2,416 welded vertices, 176 open edges, 80,256 rays, 483 ms.

**0 blocking**, 1284 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 12 |
| sliver | warn | 1124 |
| degenerate | warn | 148 |
| seam | info | 168 |
| backtoback | info | 296 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -30.67, 6.12, -7.22 | engeland/concrete + engeland/concrete | 2.5 | 519.5 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -30.67, 5.92, -7.25 | engeland/concrete + engeland/concrete | 2.5 | 341.2 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -30.67, 5.55, -7.25 | engeland/concrete + engeland/concrete | 2.5 | 279.9 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| 30.67, 5.55, -7.25 | engeland/concrete + engeland/concrete | 2.5 | 279.9 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 30.67, 5.92, -7.25 | engeland/concrete + engeland/concrete | 2.5 | 341.2 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 30.67, 6.12, -7.22 | engeland/concrete + engeland/concrete | 2.5 | 519.5 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| -30.67, 6.27, 7.25 | engeland/concrete + engeland/concrete | 2.5 | 279.9 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -30.67, 5.90, 7.25 | engeland/concrete + engeland/concrete | 2.5 | 341.2 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -30.67, 5.71, 7.22 | engeland/concrete + engeland/concrete | 2.5 | 519.5 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| 30.67, 5.71, 7.22 | engeland/concrete + engeland/concrete | 2.5 | 519.5 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 30.67, 5.90, 7.25 | engeland/concrete + engeland/concrete | 2.5 | 341.2 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 30.67, 6.27, 7.25 | engeland/concrete + engeland/concrete | 2.5 | 279.9 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |

## sliver (warn, 1124)

| at | part | aspect | longest |
|---|---|---|---|
| -11.66, 3.55, -7.20 | engeland/brick_red_brussels | 123 | 28.889 |
| 11.99, 3.55, -7.20 | engeland/brick_red_brussels | 121 | 28.398 |
| -11.65, 3.71, -7.20 | engeland/brick_red_brussels | 123 | 28.866 |
| 11.98, 3.71, -7.20 | engeland/brick_red_brussels | 120 | 28.374 |
| -11.62, 3.86, -7.20 | engeland/brick_red_brussels | 124 | 28.893 |
| 11.95, 3.86, -7.20 | engeland/brick_red_brussels | 121 | 28.4 |
| -11.57, 4.01, -7.20 | engeland/brick_red_brussels | 126 | 28.944 |
| 11.90, 4.01, -7.20 | engeland/brick_red_brussels | 124 | 28.451 |
| -11.51, 4.16, -7.20 | engeland/brick_red_brussels | 130 | 29.019 |
| 11.84, 4.16, -7.20 | engeland/brick_red_brussels | 128 | 28.525 |
| -11.44, 4.29, -7.20 | engeland/brick_red_brussels | 136 | 29.117 |
| 11.77, 4.29, -7.20 | engeland/brick_red_brussels | 134 | 28.623 |
| -11.35, 4.42, -7.20 | engeland/brick_red_brussels | 145 | 29.237 |
| 11.68, 4.42, -7.20 | engeland/brick_red_brussels | 142 | 28.743 |
| -11.25, 4.55, -7.20 | engeland/brick_red_brussels | 156 | 29.378 |
| 11.58, 4.55, -7.20 | engeland/brick_red_brussels | 153 | 28.883 |
| -11.14, 4.66, -7.20 | engeland/brick_red_brussels | 171 | 29.537 |
| 11.47, 4.66, -7.20 | engeland/brick_red_brussels | 168 | 29.043 |
| -11.02, 4.76, -7.20 | engeland/brick_red_brussels | 191 | 29.714 |
| 11.35, 4.76, -7.20 | engeland/brick_red_brussels | 188 | 29.219 |
| -10.89, 4.84, -7.20 | engeland/brick_red_brussels | 219 | 29.906 |
| 11.22, 4.84, -7.20 | engeland/brick_red_brussels | 215 | 29.411 |
| -10.75, 4.92, -7.20 | engeland/brick_red_brussels | 260 | 30.111 |
| 11.08, 4.92, -7.20 | engeland/brick_red_brussels | 255 | 29.615 |
| -10.61, 4.98, -7.20 | engeland/brick_red_brussels | 320 | 30.326 |
| 10.94, 4.98, -7.20 | engeland/brick_red_brussels | 314 | 29.831 |
| -10.46, 5.02, -7.20 | engeland/brick_red_brussels | 421 | 30.55 |
| 10.79, 5.02, -7.20 | engeland/brick_red_brussels | 413 | 30.054 |
| -10.30, 5.05, -7.20 | engeland/brick_red_brussels | 617 | 30.78 |
| 10.63, 5.05, -7.20 | engeland/brick_red_brussels | 604 | 30.285 |
| -10.15, 5.07, -7.20 | engeland/brick_red_brussels | 1155 | 31.014 |
| 10.48, 5.07, -7.20 | engeland/brick_red_brussels | 1126 | 30.519 |
| -11.66, 3.55, 7.20 | engeland/brick_red_brussels | 123 | 28.889 |
| 11.99, 3.55, 7.20 | engeland/brick_red_brussels | 121 | 28.398 |
| -11.65, 3.71, 7.20 | engeland/brick_red_brussels | 123 | 28.866 |
| 11.98, 3.71, 7.20 | engeland/brick_red_brussels | 120 | 28.374 |
| -11.62, 3.86, 7.20 | engeland/brick_red_brussels | 124 | 28.893 |
| 11.95, 3.86, 7.20 | engeland/brick_red_brussels | 121 | 28.4 |
| -11.57, 4.01, 7.20 | engeland/brick_red_brussels | 126 | 28.944 |
| 11.90, 4.01, 7.20 | engeland/brick_red_brussels | 124 | 28.451 |

(1084 more in the JSON)

## degenerate (warn, 148)

| at | part | edge |
|---|---|---|
| -2.51, 2.01, -7.19 | engeland/brick_red_brussels | 0.012 |
| 3.01, 2.01, -7.19 | engeland/brick_red_brussels | 0.012 |
| -2.51, 2.01, 7.19 | engeland/brick_red_brussels | 0.012 |
| 3.01, 2.01, 7.19 | engeland/brick_red_brussels | 0.012 |
| -2.50, 2.16, -7.19 | engeland/brick_red_brussels | 0.2288 |
| -2.51, 2.09, -7.19 | engeland/brick_red_brussels | 0.2288 |
| -2.51, 2.09, 7.19 | engeland/brick_red_brussels | 0.2288 |
| -2.50, 2.16, 7.19 | engeland/brick_red_brussels | 0.2288 |
| -2.48, 2.40, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.49, 2.32, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.44, 2.64, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.45, 2.56, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.37, 2.87, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.39, 2.79, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.28, 3.09, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.31, 3.02, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.18, 3.31, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.22, 3.24, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.06, 3.52, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -2.10, 3.45, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.92, 3.71, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.96, 3.65, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.76, 3.89, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.81, 3.83, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.58, 4.06, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.64, 4.01, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.40, 4.21, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.46, 4.16, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.20, 4.35, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.27, 4.30, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.99, 4.46, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -1.06, 4.43, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.77, 4.56, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.84, 4.53, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.54, 4.64, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.62, 4.62, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.31, 4.70, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.39, 4.68, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.07, 4.74, -7.19 | engeland/brick_red_brussels | 0.2408 |
| -0.15, 4.73, -7.19 | engeland/brick_red_brussels | 0.2408 |

(108 more in the JSON)

## seam (info, 168)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -2.51, 2.01, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 34.6 | 448 | 65.2 |
| -2.51, 2.01, 7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 34.6 | 448 | 65.2 |
| -30.68, 4.90, -7.20 | engeland/brick_red_brussels + engeland/concrete | 123.59 | 86 | 90 |
| -30.68, 4.90, 7.20 | engeland/brick_red_brussels + engeland/concrete | 123.59 | 86 | 90 |
| -30.67, 5.35, -7.20 | engeland/brick_red_brussels + engeland/concrete | 63.49 | 80 | 90 |
| -30.66, 5.35, 7.20 | engeland/brick_red_brussels + engeland/concrete | 63.49 | 80 | 90 |
| -30.67, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 46 | 90 |
| -28.31, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 46 | 90 |
| -30.66, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 46 | 90 |
| -28.30, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 46 | 90 |
| -25.95, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 24.95, 5.36, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 25.97, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 28.33, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| -25.94, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 24.86, 5.36, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 25.98, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| 28.34, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 44 | 90 |
| -23.59, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 42 | 90 |
| -23.58, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 42 | 90 |
| 23.37, 5.36, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 40 | 90 |
| 23.27, 5.36, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 40 | 90 |
| -21.23, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 32 | 90 |
| 21.07, 5.36, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 32 | 90 |
| -21.22, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 32 | 90 |
| 20.98, 5.36, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 32 | 90 |
| -18.87, 5.37, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 26 | 90 |
| 18.80, 5.36, -7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 26 | 90 |
| -18.86, 5.37, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 26 | 90 |
| 18.80, 5.36, 7.20 | engeland/brick_red_brussels + engeland/concrete | 4.44 | 26 | 90 |
| -30.67, 6.42, 7.24 | engeland/concrete + engeland/concrete | 122.94 | 26 | 90 |
| -30.67, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 26 | 90 |
| -28.31, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 26 | 90 |
| -25.95, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 26 | 90 |
| -23.59, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 26 | 90 |
| -21.23, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 26 | 90 |
| -30.67, 6.43, -7.25 | engeland/concrete + engeland/concrete | 122.94 | 24 | 90 |
| -18.87, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 24 | 90 |
| -16.51, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 24 | 90 |
| -14.15, 6.42, 7.24 | engeland/concrete + engeland/concrete | 4.87 | 24 | 90 |

(128 more in the JSON)

## backtoback (info, 296)

| at | parts | area |
|---|---|---|
| -2.50, 2.17, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00254 |
| -2.51, 2.09, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00203 |
| -2.51, 2.07, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00044 |
| -2.51, 2.03, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00094 |
| -2.48, 2.41, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.49, 2.32, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.49, 2.30, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.50, 2.26, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -2.43, 2.64, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.45, 2.56, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.46, 2.54, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.47, 2.50, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -2.37, 2.87, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.39, 2.79, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.40, 2.77, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.41, 2.73, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -2.28, 3.10, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.31, 3.02, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.32, 3.00, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.34, 2.96, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -2.18, 3.31, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.22, 3.24, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.22, 3.22, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.24, 3.18, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -2.05, 3.52, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -2.10, 3.45, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -2.12, 3.42, -7.22 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.13, 3.39, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -1.91, 3.72, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -1.96, 3.65, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -1.97, 3.63, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -2.00, 3.60, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -1.75, 3.90, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -1.81, 3.83, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -1.82, 3.82, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -1.85, 3.79, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |
| -1.58, 4.07, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00267 |
| -1.65, 4.00, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00214 |
| -1.66, 3.99, -7.21 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00046 |
| -1.69, 3.96, -7.20 | engeland/brick_red_brussels + engeland/brick_red_brussels | 0.00099 |

(256 more in the JSON)


Nodes: engeland. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
