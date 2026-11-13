# Mesh audit: ruestalle.glb

12,624 triangles, 6,752 welded vertices, 604 open edges, 125,192 rays, 1016 ms.

**0 blocking**, 2264 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1722 |
| tjunction | warn | 2 |
| degenerate | warn | 540 |
| seam | info | 585 |
| opening | info | 18 |
| backtoback | info | 1588 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1722)

| at | part | aspect | longest |
|---|---|---|---|
| -11.62, 15.87, -4.70 | ruestalle/brick_red_brussels | 52 | 13.152 |
| -7.23, 15.96, -4.70 | ruestalle/brick_red_brussels | 52 | 13.897 |
| 6.98, 15.87, -4.70 | ruestalle/brick_red_brussels | 52 | 13.152 |
| 11.37, 15.96, -4.70 | ruestalle/brick_red_brussels | 52 | 13.897 |
| -25.14, 16.91, -4.70 | ruestalle/brick_red_brussels | 46 | 14.291 |
| -11.87, 16.12, -4.70 | ruestalle/brick_red_brussels | 80 | 14.67 |
| -6.98, 16.18, -4.70 | ruestalle/brick_red_brussels | 80 | 15.44 |
| 6.73, 16.12, -4.70 | ruestalle/brick_red_brussels | 80 | 14.67 |
| 11.62, 16.18, -4.70 | ruestalle/brick_red_brussels | 80 | 15.44 |
| 25.14, 16.91, -4.70 | ruestalle/brick_red_brussels | 46 | 14.291 |
| -24.63, 17.02, -4.70 | ruestalle/brick_red_brussels | 67 | 15.052 |
| -12.13, 16.28, -4.70 | ruestalle/brick_red_brussels | 146 | 16.226 |
| -6.73, 16.32, -4.70 | ruestalle/brick_red_brussels | 146 | 17.012 |
| 6.46, 16.28, -4.70 | ruestalle/brick_red_brussels | 146 | 16.226 |
| 11.87, 16.32, -4.70 | ruestalle/brick_red_brussels | 146 | 17.012 |
| 24.63, 17.02, -4.70 | ruestalle/brick_red_brussels | 67 | 15.052 |
| -24.10, 17.07, -4.70 | ruestalle/brick_red_brussels | 112 | 15.833 |
| -12.40, 16.37, -4.70 | ruestalle/brick_red_brussels | 478 | 17.806 |
| -6.46, 16.39, -4.70 | ruestalle/brick_red_brussels | 477 | 18.6 |
| 6.20, 16.37, -4.70 | ruestalle/brick_red_brussels | 478 | 17.806 |
| 12.13, 16.39, -4.70 | ruestalle/brick_red_brussels | 477 | 18.6 |
| 24.10, 17.07, -4.70 | ruestalle/brick_red_brussels | 112 | 15.833 |
| -5.23, 17.08, -4.70 | ruestalle/brick_red_brussels | 74 | 52.94 |
| -11.62, 15.87, 4.70 | ruestalle/brick_red_brussels | 52 | 13.152 |
| -7.23, 15.96, 4.70 | ruestalle/brick_red_brussels | 52 | 13.897 |
| 6.98, 15.87, 4.70 | ruestalle/brick_red_brussels | 52 | 13.152 |
| 11.37, 15.96, 4.70 | ruestalle/brick_red_brussels | 52 | 13.897 |
| -25.14, 16.91, 4.70 | ruestalle/brick_red_brussels | 46 | 14.291 |
| -11.87, 16.12, 4.70 | ruestalle/brick_red_brussels | 80 | 14.67 |
| -6.98, 16.18, 4.70 | ruestalle/brick_red_brussels | 80 | 15.44 |
| 6.73, 16.12, 4.70 | ruestalle/brick_red_brussels | 80 | 14.67 |
| 11.62, 16.18, 4.70 | ruestalle/brick_red_brussels | 80 | 15.44 |
| 25.14, 16.91, 4.70 | ruestalle/brick_red_brussels | 46 | 14.291 |
| -24.63, 17.02, 4.70 | ruestalle/brick_red_brussels | 67 | 15.052 |
| -12.13, 16.28, 4.70 | ruestalle/brick_red_brussels | 146 | 16.226 |
| -6.73, 16.32, 4.70 | ruestalle/brick_red_brussels | 146 | 17.012 |
| 6.46, 16.28, 4.70 | ruestalle/brick_red_brussels | 146 | 16.226 |
| 11.87, 16.32, 4.70 | ruestalle/brick_red_brussels | 146 | 17.012 |
| 24.63, 17.02, 4.70 | ruestalle/brick_red_brussels | 67 | 15.052 |
| -24.10, 17.07, 4.70 | ruestalle/brick_red_brussels | 112 | 15.833 |

(1682 more in the JSON)

## tjunction (warn, 2)

| at | part | edge_m |
|---|---|---|
| -34.30, 18.45, -4.30 | ruestalle/brick_red_brussels | 9.4 |
| 34.30, 18.45, -4.30 | ruestalle/brick_red_brussels | 9.4 |

## degenerate (warn, 540)

| at | part | edge |
|---|---|---|
| -27.06, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| -10.14, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| -8.46, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| 8.46, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| 10.14, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| 27.06, 8.31, -4.69 | ruestalle/brick_red_brussels | 0.012 |
| -27.06, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| -10.14, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| -8.46, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| 8.46, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| 10.14, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| 27.06, 8.31, 4.69 | ruestalle/brick_red_brussels | 0.012 |
| -27.05, 8.71, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -27.05, 8.51, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -8.45, 8.71, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -8.45, 8.51, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| 10.15, 8.71, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| 10.15, 8.51, -4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -27.05, 8.51, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -27.05, 8.71, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -8.45, 8.51, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -8.45, 8.71, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| 10.15, 8.51, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| 10.15, 8.71, 4.69 | ruestalle/brick_red_brussels | 0.5919 |
| -26.90, 9.90, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -26.94, 9.70, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -26.59, 11.06, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -26.65, 10.87, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -26.11, 12.17, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -26.20, 11.99, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -25.49, 13.21, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -25.60, 13.04, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -24.72, 14.13, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -24.86, 13.99, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -23.83, 14.95, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -23.98, 14.82, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -22.83, 15.62, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -23.00, 15.52, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -21.74, 16.15, -4.69 | ruestalle/brick_red_brussels | 0.6039 |
| -21.93, 16.07, -4.69 | ruestalle/brick_red_brussels | 0.6039 |

(500 more in the JSON)

## seam (info, 585)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -8.33, 8.30, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 107 | 644 | 68.9 |
| -8.44, 8.30, 4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 107 | 644 | 68.9 |
| 10.27, 8.30, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 106.61 | 580 | 68.9 |
| 10.16, 8.30, 4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 106.61 | 580 | 68.9 |
| -27.13, 8.31, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 106.61 | 576 | 68.9 |
| -27.13, 8.31, 4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 106.61 | 576 | 68.9 |
| -34.28, 17.26, -4.70 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 137.71 | 90 | 90 |
| -34.28, 17.26, 4.70 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 137.71 | 90 | 90 |
| -34.06, 17.11, 4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 5.58 | 38 | 90 |
| -34.24, 16.89, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 5.44 | 36 | 90 |
| -34.06, 17.11, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 5.58 | 36 | 90 |
| 33.80, 17.11, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 5.58 | 36 | 90 |
| -10.05, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.72 | 36 | 90 |
| -10.05, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.68 | 36 | 90 |
| 8.55, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.72 | 36 | 90 |
| 8.55, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.68 | 36 | 90 |
| -29.45, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.32 | 36 | 90 |
| -29.45, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.28 | 36 | 90 |
| 27.15, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.32 | 36 | 90 |
| 27.15, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.28 | 36 | 90 |
| -34.26, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.44 | 36 | 90 |
| -34.26, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.4 | 36 | 90 |
| 31.90, 16.89, -4.68 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.44 | 36 | 90 |
| 31.90, 17.11, -4.69 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.4 | 36 | 90 |
| -10.05, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.72 | 36 | 90 |
| -10.05, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.68 | 36 | 90 |
| 8.55, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.72 | 36 | 90 |
| 8.55, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 4.68 | 36 | 90 |
| -29.45, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.32 | 36 | 90 |
| -29.45, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.28 | 36 | 90 |
| 27.15, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.32 | 36 | 90 |
| 27.15, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.28 | 36 | 90 |
| -34.26, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.44 | 36 | 90 |
| -34.26, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.4 | 36 | 90 |
| 31.90, 16.90, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.44 | 36 | 90 |
| 31.90, 17.12, 4.67 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 6.4 | 36 | 90 |
| -10.09, 18.45, -4.28 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 5.34 | 36 | 90 |
| 8.51, 18.45, -4.28 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 5.34 | 36 | 90 |
| -29.49, 18.45, -4.28 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 6.94 | 36 | 90 |
| 27.11, 18.45, -4.28 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 6.94 | 36 | 90 |

(545 more in the JSON)

## opening (info, 18)

| at | part | facing | edge_m |
|---|---|---|---|
| -34.30, 18.11, -4.30 | ruestalle/brick_red_brussels | 0 + 0 + 1 | 1.28 |
| 34.30, 17.42, -4.30 | ruestalle/brick_red_brussels | 0 + 0 + 1 | 1.28 |
| -34.30, 18.11, 4.30 | ruestalle/brick_red_brussels | 0 + 0 + -1 | 1.28 |
| 34.30, 17.42, 4.30 | ruestalle/brick_red_brussels | 0 + 0 + -1 | 1.28 |
| -26.78, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| -10.42, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| -8.18, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 8.18, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 10.42, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 26.78, 8.30, -4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| -26.78, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| -10.42, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| -8.18, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 8.18, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 10.42, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 26.78, 8.30, 4.68 | ruestalle/brick_red_brussels | 0 + -1 + 0 | 0.338 |
| 34.30, 17.17, -4.25 | ruestalle/concrete | 0 + 1 + 0 | 8.6 |
| -34.30, 17.17, -4.25 | ruestalle/concrete | 0 + 1 + 0 | 8.6 |

## backtoback (info, 1588)

| at | parts | area |
|---|---|---|
| -26.97, 8.30, -4.72 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 0.008 |
| -27.03, 8.30, -4.75 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 0.00038 |
| -26.80, 8.30, -4.73 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 0.01055 |
| -26.94, 8.30, -4.75 | ruestalle/brick_red_brussels + ruestalle/stone_blue | 0.00163 |
| -27.05, 8.72, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.0078 |
| -27.05, 8.51, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00624 |
| -27.05, 8.47, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00138 |
| -27.06, 8.36, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00293 |
| -26.99, 9.32, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -27.02, 9.10, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -27.02, 9.06, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -27.03, 8.95, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -26.90, 9.92, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -26.94, 9.70, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -26.95, 9.62, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.97, 9.54, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -26.76, 10.51, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -26.82, 10.29, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -26.83, 10.25, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.86, 10.14, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -26.58, 11.08, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -26.65, 10.87, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -26.67, 10.83, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.70, 10.73, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -26.36, 11.65, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -26.45, 11.44, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -26.47, 11.40, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.51, 11.30, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -26.11, 12.19, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -26.21, 11.99, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -26.22, 11.96, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.27, 11.86, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -25.81, 12.72, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -25.92, 12.53, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -25.94, 12.49, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -26.00, 12.40, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |
| -25.48, 13.22, -4.71 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00796 |
| -25.60, 13.04, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00637 |
| -25.65, 12.97, -4.72 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00141 |
| -25.70, 12.91, -4.70 | ruestalle/brick_red_brussels + ruestalle/brick_red_brussels | 0.00299 |

(1548 more in the JSON)


Nodes: ruestalle. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
