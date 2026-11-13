# Mesh audit: bigarreaux.glb

2,884 triangles, 1,504 welded vertices, 176 open edges, 31,552 rays, 303 ms.

**0 blocking**, 640 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 12 |
| sliver | warn | 480 |
| degenerate | warn | 148 |
| seam | info | 52 |
| backtoback | info | 296 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -8.57, 6.30, -4.72 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 645.4 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -8.57, 6.06, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 423.3 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -8.57, 5.59, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 347.5 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| 8.57, 5.59, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 347.5 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 8.57, 6.06, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 423.3 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 8.57, 6.30, -4.72 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 645.4 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| -8.57, 6.49, 4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 347.5 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -8.57, 6.02, 4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 423.3 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| -8.57, 5.78, 4.72 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 645.4 | 0 | 120 | 0.92 | false | -1 + 0 + 0 |
| 8.57, 5.78, 4.72 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 645.4 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 8.57, 6.02, 4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 423.3 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |
| 8.57, 6.49, 4.75 | bigarreaux/concrete + bigarreaux/concrete | 2.5 | 347.5 | 0 | 120 | 0.92 | false | 1 + 0 + 0 |

## sliver (warn, 480)

| at | part | aspect | longest |
|---|---|---|---|
| -3.19, 3.70, -4.70 | bigarreaux/brick_red_brussels | 46 | 9.308 |
| -3.18, 3.85, -4.70 | bigarreaux/brick_red_brussels | 43 | 9.209 |
| -3.15, 4.00, -4.70 | bigarreaux/brick_red_brussels | 42 | 9.135 |
| -3.11, 4.14, -4.70 | bigarreaux/brick_red_brussels | 40 | 9.087 |
| -3.05, 4.28, -4.70 | bigarreaux/brick_red_brussels | 40 | 9.075 |
| -2.98, 4.41, -4.70 | bigarreaux/brick_red_brussels | 41 | 9.11 |
| -2.90, 4.54, -4.70 | bigarreaux/brick_red_brussels | 42 | 9.173 |
| -2.80, 4.66, -4.70 | bigarreaux/brick_red_brussels | 45 | 9.26 |
| -2.69, 4.76, -4.70 | bigarreaux/brick_red_brussels | 48 | 9.373 |
| -2.58, 4.86, -4.70 | bigarreaux/brick_red_brussels | 53 | 9.507 |
| -2.45, 4.94, -4.70 | bigarreaux/brick_red_brussels | 59 | 9.662 |
| -2.32, 5.01, -4.70 | bigarreaux/brick_red_brussels | 68 | 9.834 |
| -2.18, 5.07, -4.70 | bigarreaux/brick_red_brussels | 81 | 10.022 |
| 4.58, 5.07, -4.70 | bigarreaux/brick_red_brussels | 44 | 6.575 |
| -2.04, 5.11, -4.70 | bigarreaux/brick_red_brussels | 99 | 10.222 |
| 4.44, 5.11, -4.70 | bigarreaux/brick_red_brussels | 53 | 6.76 |
| -1.89, 5.14, -4.70 | bigarreaux/brick_red_brussels | 128 | 10.432 |
| 4.29, 5.14, -4.70 | bigarreaux/brick_red_brussels | 66 | 6.959 |
| -1.74, 5.16, -4.70 | bigarreaux/brick_red_brussels | 180 | 10.65 |
| 4.14, 5.16, -4.70 | bigarreaux/brick_red_brussels | 87 | 7.169 |
| -3.19, 3.70, 4.70 | bigarreaux/brick_red_brussels | 46 | 9.308 |
| -3.18, 3.85, 4.70 | bigarreaux/brick_red_brussels | 43 | 9.209 |
| -3.15, 4.00, 4.70 | bigarreaux/brick_red_brussels | 42 | 9.135 |
| -3.11, 4.14, 4.70 | bigarreaux/brick_red_brussels | 40 | 9.087 |
| -3.05, 4.28, 4.70 | bigarreaux/brick_red_brussels | 40 | 9.075 |
| -2.98, 4.41, 4.70 | bigarreaux/brick_red_brussels | 41 | 9.11 |
| -2.90, 4.54, 4.70 | bigarreaux/brick_red_brussels | 42 | 9.173 |
| -2.80, 4.66, 4.70 | bigarreaux/brick_red_brussels | 45 | 9.26 |
| -2.69, 4.76, 4.70 | bigarreaux/brick_red_brussels | 48 | 9.373 |
| -2.58, 4.86, 4.70 | bigarreaux/brick_red_brussels | 53 | 9.507 |
| -2.45, 4.94, 4.70 | bigarreaux/brick_red_brussels | 59 | 9.662 |
| -2.32, 5.01, 4.70 | bigarreaux/brick_red_brussels | 68 | 9.834 |
| -2.18, 5.07, 4.70 | bigarreaux/brick_red_brussels | 81 | 10.022 |
| 4.58, 5.07, 4.70 | bigarreaux/brick_red_brussels | 44 | 6.575 |
| -2.04, 5.11, 4.70 | bigarreaux/brick_red_brussels | 99 | 10.222 |
| 4.44, 5.11, 4.70 | bigarreaux/brick_red_brussels | 53 | 6.76 |
| -1.89, 5.14, 4.70 | bigarreaux/brick_red_brussels | 128 | 10.432 |
| 4.29, 5.14, 4.70 | bigarreaux/brick_red_brussels | 66 | 6.959 |
| -1.74, 5.16, 4.70 | bigarreaux/brick_red_brussels | 180 | 10.65 |
| 4.14, 5.16, 4.70 | bigarreaux/brick_red_brussels | 87 | 7.169 |

(440 more in the JSON)

## degenerate (warn, 148)

| at | part | edge |
|---|---|---|
| -0.86, 2.11, -4.69 | bigarreaux/brick_red_brussels | 0.012 |
| 4.46, 2.11, -4.69 | bigarreaux/brick_red_brussels | 0.012 |
| -0.86, 2.11, 4.69 | bigarreaux/brick_red_brussels | 0.012 |
| 4.46, 2.11, 4.69 | bigarreaux/brick_red_brussels | 0.012 |
| -0.85, 2.26, -4.69 | bigarreaux/brick_red_brussels | 0.2201 |
| -0.85, 2.19, -4.69 | bigarreaux/brick_red_brussels | 0.2201 |
| -0.85, 2.19, 4.69 | bigarreaux/brick_red_brussels | 0.2201 |
| -0.85, 2.26, 4.69 | bigarreaux/brick_red_brussels | 0.2201 |
| -0.83, 2.48, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.84, 2.41, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.78, 2.71, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.80, 2.64, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.72, 2.94, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.74, 2.86, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.64, 3.15, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.67, 3.08, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.54, 3.36, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.57, 3.29, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.42, 3.56, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.46, 3.50, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.28, 3.75, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.33, 3.69, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.13, 3.92, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.18, 3.87, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.04, 4.08, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| -0.02, 4.03, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.22, 4.23, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.15, 4.18, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.41, 4.36, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.34, 4.32, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.61, 4.47, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.54, 4.44, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.82, 4.57, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.75, 4.54, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 1.04, 4.65, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 0.97, 4.62, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 1.27, 4.70, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 1.19, 4.69, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 1.50, 4.74, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |
| 1.42, 4.73, -4.69 | bigarreaux/brick_red_brussels | 0.2321 |

(108 more in the JSON)

## seam (info, 52)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.92, 2.11, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 33.34 | 448 | 65.2 |
| -0.92, 2.11, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 33.34 | 448 | 65.2 |
| -8.58, 4.90, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 35.19 | 86 | 90 |
| -8.57, 4.90, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 35.19 | 86 | 90 |
| -8.57, 5.35, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 19.81 | 80 | 90 |
| -8.56, 5.35, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 19.81 | 80 | 90 |
| -8.57, 5.37, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 46 | 90 |
| -8.56, 5.37, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 46 | 90 |
| 7.93, 5.36, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 44 | 90 |
| 7.83, 5.36, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 44 | 90 |
| -6.12, 5.37, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 40 | 90 |
| -6.11, 5.37, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 40 | 90 |
| 6.09, 5.36, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 26 | 90 |
| 6.09, 5.36, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 26 | 90 |
| -8.57, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 34.54 | 26 | 90 |
| -8.57, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 26 | 90 |
| -6.12, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 26 | 90 |
| -8.57, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 34.54 | 24 | 90 |
| -3.67, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 24 | 90 |
| -8.57, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| -6.12, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| -3.67, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| 3.69, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| 6.14, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| -1.21, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| 1.24, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| 3.69, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| 6.14, 6.68, 4.74 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 22 | 90 |
| -8.56, 5.37, -4.79 | bigarreaux/concrete + bigarreaux/concrete | 7.55 | 22 | 45 |
| 6.14, 5.37, -4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.55 | 22 | 45 |
| -8.56, 5.37, 4.79 | bigarreaux/concrete + bigarreaux/concrete | 7.55 | 22 | 45 |
| 6.14, 5.37, 4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.55 | 22 | 45 |
| -3.66, 5.37, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 20 | 90 |
| -3.66, 5.37, 4.70 | bigarreaux/brick_red_brussels + bigarreaux/concrete | 5.05 | 20 | 90 |
| -1.21, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 20 | 90 |
| 1.24, 6.69, -4.75 | bigarreaux/concrete + bigarreaux/concrete | 5.05 | 20 | 90 |
| -6.11, 5.37, -4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.54 | 18 | 90 |
| -3.66, 5.37, -4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.54 | 18 | 90 |
| -1.21, 5.37, -4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.54 | 18 | 90 |
| 1.24, 5.37, -4.80 | bigarreaux/concrete + bigarreaux/concrete | 7.54 | 18 | 90 |

(12 more in the JSON)

## backtoback (info, 296)

| at | parts | area |
|---|---|---|
| -0.85, 2.27, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00244 |
| -0.85, 2.18, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00195 |
| -0.85, 2.17, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00042 |
| -0.86, 2.13, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00091 |
| -0.83, 2.49, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.84, 2.41, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.84, 2.39, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.84, 2.35, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.78, 2.72, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.80, 2.64, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.80, 2.62, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.81, 2.58, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.72, 2.94, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.74, 2.86, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.75, 2.85, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.76, 2.81, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.64, 3.16, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.67, 3.08, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.67, 3.07, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.69, 3.03, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.53, 3.37, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.57, 3.29, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.58, 3.28, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.60, 3.24, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.41, 3.57, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.46, 3.49, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.47, 3.48, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.49, 3.45, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.28, 3.75, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.33, 3.69, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.34, 3.67, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.36, 3.64, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| -0.13, 3.93, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.18, 3.87, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.19, 3.85, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.22, 3.82, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |
| 0.04, 4.09, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00257 |
| -0.02, 4.03, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00206 |
| -0.03, 4.02, -4.71 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00044 |
| -0.06, 3.99, -4.70 | bigarreaux/brick_red_brussels + bigarreaux/brick_red_brussels | 0.00096 |

(256 more in the JSON)


Nodes: bigarreaux. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
