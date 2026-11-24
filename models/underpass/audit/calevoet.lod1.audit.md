# Mesh audit (before pack): calevoet.lod1

288 triangles, 252 welded vertices, 200 open edges, 75,936 rays, 130 ms.

**0 blocking**, 34 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 8 |
| tjunction | warn | 26 |
| seam | info | 14 |
| opening | info | 72 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| -1.49, 55.19, 10.34 | Underpass_lod1/paint_fascia | 95 | 2.839 |
| -2.44, 55.18, 10.34 | Underpass_lod1/paint_fascia | 95 | 2.839 |
| 22.92, 53.70, -8.05 | Underpass_lod1/paint_fascia | 87 | 2.599 |
| 22.05, 53.71, -8.05 | Underpass_lod1/paint_fascia | 87 | 2.599 |
| -1.49, 52.94, 10.07 | Underpass_lod1/concrete | 57 | 2.839 |
| -2.44, 52.94, 10.06 | Underpass_lod1/concrete | 57 | 2.839 |
| 22.92, 51.27, -6.38 | Underpass_lod1/concrete | 52 | 2.599 |
| 22.05, 51.27, -6.39 | Underpass_lod1/concrete | 52 | 2.599 |

## tjunction (warn, 26)

| at | part | edge_m |
|---|---|---|
| -3.38, 52.59, 10.34 | Underpass_lod1/brick_painted_white | 2.988 |
| -3.63, 52.77, 10.34 | Underpass_lod1/brick_painted_white | 2.988 |
| -0.54, 52.59, 10.34 | Underpass_lod1/brick_painted_white | 2.988 |
| -0.29, 52.77, 10.34 | Underpass_lod1/brick_painted_white | 2.988 |
| -0.29, 53.60, 0.79 | Underpass_lod1/brick_painted_white | 2.43 |
| -3.63, 53.60, 0.79 | Underpass_lod1/brick_painted_white | 2.43 |
| 21.19, 50.91, -8.05 | Underpass_lod1/brick_painted_white | 3.013 |
| 20.94, 51.23, -8.05 | Underpass_lod1/brick_painted_white | 3.013 |
| 23.79, 50.91, -8.05 | Underpass_lod1/brick_painted_white | 3.013 |
| 24.04, 51.23, -8.05 | Underpass_lod1/brick_painted_white | 3.013 |
| 24.04, 52.06, -2.19 | Underpass_lod1/brick_painted_white | 2.49 |
| 20.94, 52.06, -2.19 | Underpass_lod1/brick_painted_white | 2.49 |
| -3.63, 55.20, 0.39 | Underpass_lod1/paint_fascia | 4.138 |
| -3.63, 55.20, 10.74 | Underpass_lod1/paint_fascia | 4.138 |
| -3.63, 55.20, 0.79 | Underpass_lod1/paint_fascia | 10.351 |
| -0.29, 55.20, 0.79 | Underpass_lod1/paint_fascia | 10.351 |
| -3.38, 55.20, 10.34 | Underpass_lod1/paint_fascia | 3.338 |
| 20.94, 53.72, -8.45 | Underpass_lod1/paint_fascia | 3.899 |
| 20.94, 53.72, -1.79 | Underpass_lod1/paint_fascia | 3.899 |
| 20.94, 53.72, -8.05 | Underpass_lod1/paint_fascia | 6.658 |
| 24.04, 53.72, -8.05 | Underpass_lod1/paint_fascia | 6.658 |
| 21.19, 53.72, -8.05 | Underpass_lod1/paint_fascia | 3.099 |
| -0.54, 52.94, 10.32 | Underpass_lod1/concrete | 0.251 |
| -3.38, 52.94, 10.32 | Underpass_lod1/concrete | 0.251 |
| 23.79, 51.27, -8.03 | Underpass_lod1/concrete | 1.641 |
| 21.19, 51.27, -8.03 | Underpass_lod1/concrete | 1.641 |

## seam (info, 14)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -3.63, 55.20, 5.57 | Underpass_lod1/brick_painted_white + Underpass_lod1/paint_fascia | 19.1 | 2 | 90 |
| 20.94, 53.72, -5.12 | Underpass_lod1/brick_painted_white + Underpass_lod1/paint_fascia | 11.72 | 2 | 90 |
| -1.85, 52.94, 10.32 | Underpass_lod1/concrete + Underpass_lod1/concrete | 2.84 | 2 | 90 |
| 23.77, 51.27, -8.03 | Underpass_lod1/concrete + Underpass_lod1/concrete | 2.6 | 2 | 90 |
| -3.63, 53.19, 10.34 | Underpass_lod1/brick_painted_white + Underpass_lod1/brick_painted_white | 0.83 | 1 | 90 |
| -0.29, 53.19, 10.34 | Underpass_lod1/brick_painted_white + Underpass_lod1/brick_painted_white | 0.83 | 1 | 90 |
| 20.94, 51.65, -8.05 | Underpass_lod1/brick_painted_white + Underpass_lod1/brick_painted_white | 0.83 | 1 | 90 |
| 24.04, 51.65, -8.05 | Underpass_lod1/brick_painted_white + Underpass_lod1/brick_painted_white | 0.83 | 1 | 90 |
| -1.96, 55.20, 0.39 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 3.34 | 1 | 90 |
| -1.96, 55.20, 10.74 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 3.34 | 1 | 90 |
| -1.96, 55.20, 10.34 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 2.84 | 1 | 90 |
| 22.49, 53.72, -8.45 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 3.1 | 1 | 90 |
| 22.49, 53.72, -1.79 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 3.1 | 1 | 90 |
| 22.49, 53.72, -8.05 | Underpass_lod1/paint_fascia + Underpass_lod1/paint_fascia | 2.6 | 1 | 90 |

## opening (info, 72)

| at | part | facing | edge_m |
|---|---|---|---|
| -3.63, 52.21, 0.84 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 9.551 |
| -3.63, 52.82, 10.34 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 0.83 |
| -3.63, 52.82, 0.79 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 0.83 |
| -3.63, 53.65, 10.34 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 1.6 |
| -3.63, 53.65, 0.79 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 1.6 |
| -3.59, 52.21, 10.34 | Underpass_lod1/brick_painted_white | 0 + 0 + 1 | 0.25 |
| -0.29, 52.72, 10.34 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 0.558 |
| -0.29, 52.21, 10.29 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 9.551 |
| -0.29, 52.82, 10.34 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 0.83 |
| -0.29, 52.82, 0.79 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 0.83 |
| -0.29, 53.65, 10.34 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 1.6 |
| -0.29, 53.65, 0.79 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 1.6 |
| -0.34, 52.21, 10.34 | Underpass_lod1/brick_painted_white | 0 + 0 + 1 | 0.25 |
| -3.58, 52.21, 0.79 | Underpass_lod1/brick_painted_white | 0 + 0 + -1 | 3.338 |
| 20.94, 50.71, -8.00 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 5.859 |
| 20.94, 50.76, -8.05 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 0.523 |
| 20.94, 51.28, -2.19 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 0.83 |
| 20.94, 51.28, -8.05 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 0.83 |
| 20.94, 52.11, -2.19 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 1.66 |
| 20.94, 52.11, -8.05 | Underpass_lod1/brick_painted_white | -1 + 0 + 0 | 1.66 |
| 20.98, 50.71, -8.05 | Underpass_lod1/brick_painted_white | 0 + 0 + -1 | 0.25 |
| 24.04, 50.71, -2.24 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 5.859 |
| 24.04, 51.28, -2.19 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 0.83 |
| 24.04, 51.28, -8.05 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 0.83 |
| 24.04, 52.11, -2.19 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 1.66 |
| 24.04, 52.11, -8.05 | Underpass_lod1/brick_painted_white | 1 + 0 + 0 | 1.66 |
| 23.99, 50.71, -8.05 | Underpass_lod1/brick_painted_white | 0 + 0 + -1 | 0.25 |
| 20.99, 50.71, -2.19 | Underpass_lod1/brick_painted_white | 0 + 0 + 1 | 3.099 |
| -3.98, 55.20, 0.39 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| -3.98, 55.20, 10.74 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| 0.06, 55.20, 0.39 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| 0.06, 55.20, 10.74 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| -3.58, 55.20, 0.39 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 3.338 |
| -3.63, 55.20, 0.74 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| -0.29, 55.20, 10.39 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| -3.58, 55.20, 10.74 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 3.338 |
| 20.59, 53.72, -8.45 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| 20.59, 53.72, -1.79 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| 24.39, 53.72, -8.45 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |
| 24.39, 53.72, -1.79 | Underpass_lod1/paint_fascia | 0 + -1 + 0 | 0.4 |

(32 more in the JSON)


Nodes: Underpass_lod1. Distances: {"Underpass_lod0":70,"Underpass_throat":70,"Underpass_lod1":230,"Underpass_lod2":2000}. Quantum 0.000 mm. Offset 0,40,0.
