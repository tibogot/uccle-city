# Mesh audit: shopkit.glb

2,412 triangles, 1,234 welded vertices, 0 open edges, 0 rays, 225 ms.

**21 blocking**, 404 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 1 |
| bentflat | block | 20 |
| sliver | warn | 396 |
| nonmanifold | warn | 8 |
| seam | info | 40 |
| backtoback | info | 93 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 1)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.36, 0.98, 0.14 | door_classic/paint + door_classic/brass | 0 | 0.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## bentflat (block, 20)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.20, -0.30, 0.12 | door_classic/bluestone | 14.7 | 0.1983 | 0.4 |
| -0.20, -0.30, 0.22 | door_classic/bluestone | 14.7 | 0.1983 | 0.4 |
| 0.20, -0.04, 0.34 | door_classic/bluestone | 14.7 | 0.235 | 0.47 |
| -0.20, -0.16, 0.34 | door_classic/bluestone | 14.7 | 0.235 | 0.47 |
| -0.20, 0.10, 0.12 | door_classic/bluestone | 14.7 | 0.1983 | 0.4 |
| 0.20, 0.10, 0.22 | door_classic/bluestone | 14.7 | 0.1983 | 0.4 |
| -0.20, -0.04, 0.00 | door_classic/bluestone | 14.7 | 0.235 | 0.47 |
| 0.20, -0.16, 0.00 | door_classic/bluestone | 14.7 | 0.235 | 0.47 |
| -0.57, 1.60, 0.10 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| -0.57, 0.85, 0.06 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| -0.50, 1.60, 0.06 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| -0.50, 0.85, 0.10 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| 0.50, 1.60, 0.10 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| 0.50, 0.85, 0.06 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| 0.57, 1.60, 0.06 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| 0.57, 0.85, 0.10 | door_classic/paint | 14.7 | 0.168 | 0.34 |
| 0.12, 0.66, 0.12 | door_classic/paint | 14.7 | 0.1947 | 0.39 |
| -0.12, 0.48, 0.12 | door_classic/paint | 14.7 | 0.1947 | 0.39 |
| -0.12, 0.66, 0.10 | door_classic/paint | 14.7 | 0.1947 | 0.39 |
| 0.12, 0.48, 0.10 | door_classic/paint | 14.7 | 0.1947 | 0.39 |

## sliver (warn, 396)

| at | part | aspect | longest |
|---|---|---|---|
| -0.61, -0.30, 0.22 | door_classic/bluestone | 53 | 0.324 |
| -0.62, -0.30, 0.12 | door_classic/bluestone | 53 | 0.324 |
| -0.62, -0.30, 0.22 | door_classic/bluestone | 53 | 0.324 |
| -0.62, -0.29, 0.12 | door_classic/bluestone | 53 | 0.324 |
| -0.61, -0.04, 0.34 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.16, 0.34 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.04, 0.34 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.16, 0.33 | door_classic/bluestone | 63 | 0.384 |
| -0.61, 0.10, 0.12 | door_classic/bluestone | 53 | 0.324 |
| -0.62, 0.10, 0.22 | door_classic/bluestone | 53 | 0.324 |
| -0.62, 0.10, 0.12 | door_classic/bluestone | 53 | 0.324 |
| -0.62, 0.09, 0.22 | door_classic/bluestone | 53 | 0.324 |
| -0.61, -0.16, 0.00 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.04, 0.00 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.16, 0.00 | door_classic/bluestone | 63 | 0.384 |
| -0.62, -0.04, 0.01 | door_classic/bluestone | 63 | 0.384 |
| -0.20, -0.30, 0.01 | door_classic/bluestone | 200 | 1.224 |
| 0.20, -0.30, 0.00 | door_classic/bluestone | 200 | 1.224 |
| -0.20, -0.30, 0.00 | door_classic/bluestone | 200 | 1.224 |
| 0.20, -0.29, 0.00 | door_classic/bluestone | 200 | 1.224 |
| 0.20, 0.10, 0.01 | door_classic/bluestone | 200 | 1.224 |
| -0.20, 0.10, 0.00 | door_classic/bluestone | 200 | 1.224 |
| 0.20, 0.10, 0.00 | door_classic/bluestone | 200 | 1.224 |
| -0.20, 0.09, 0.00 | door_classic/bluestone | 200 | 1.224 |
| 0.62, -0.16, 0.01 | door_classic/bluestone | 63 | 0.384 |
| 0.62, -0.04, 0.00 | door_classic/bluestone | 63 | 0.384 |
| 0.62, -0.16, 0.00 | door_classic/bluestone | 63 | 0.384 |
| 0.61, -0.04, 0.00 | door_classic/bluestone | 63 | 0.384 |
| 0.61, -0.30, 0.12 | door_classic/bluestone | 53 | 0.324 |
| 0.62, -0.30, 0.22 | door_classic/bluestone | 53 | 0.324 |
| 0.62, -0.30, 0.12 | door_classic/bluestone | 53 | 0.324 |
| 0.62, -0.29, 0.22 | door_classic/bluestone | 53 | 0.324 |
| 0.61, 0.10, 0.22 | door_classic/bluestone | 53 | 0.324 |
| 0.62, 0.10, 0.12 | door_classic/bluestone | 53 | 0.324 |
| 0.62, 0.10, 0.22 | door_classic/bluestone | 53 | 0.324 |
| 0.62, 0.09, 0.12 | door_classic/bluestone | 53 | 0.324 |
| 0.61, -0.16, 0.34 | door_classic/bluestone | 63 | 0.384 |
| 0.62, -0.04, 0.34 | door_classic/bluestone | 63 | 0.384 |
| 0.62, -0.16, 0.34 | door_classic/bluestone | 63 | 0.384 |
| 0.62, -0.04, 0.33 | door_classic/bluestone | 63 | 0.384 |

(356 more in the JSON)

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| -0.37, 0.11, 0.11 | door_classic/paint | 4 |
| -0.37, 2.19, 0.11 | door_classic/paint | 4 |
| 0.37, 0.11, 0.11 | door_classic/paint | 4 |
| 0.37, 2.19, 0.11 | door_classic/paint | 4 |
| -0.37, 0.99, 0.13 | door_classic/paint | 4 |
| 0.37, 0.99, 0.13 | door_classic/paint | 4 |
| -0.37, 2.06, 0.13 | door_classic/paint | 4 |
| 0.37, 2.06, 0.13 | door_classic/paint | 4 |

## seam (info, 40)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.37, 0.99, 0.14 | door_classic/paint + door_classic/brass | 0.15 | 66 | 25 |
| -0.37, 0.12, 0.14 | door_classic/paint + door_classic/brass | 3.23 | 40 | 67.5 |
| 0.37, 0.97, 0.14 | door_classic/paint + door_classic/brass | 0.07 | 40 | 22.5 |
| -0.37, 0.12, 0.13 | door_classic/paint + door_classic/brass | 0.78 | 31 | 67.5 |
| 0.37, 0.26, 0.14 | door_classic/paint + door_classic/brass | 0.78 | 28 | 67.5 |
| -0.15, 0.93, 0.14 | door_classic/paint + door_classic/brass | 1.39 | 28 | 67.5 |
| 0.37, 1.03, 0.17 | door_classic/brass + door_classic/brass | 0.05 | 18 | 72.1 |
| 0.37, 1.03, 0.15 | door_classic/brass + door_classic/brass | 0.05 | 16 | 90 |
| 0.37, 1.04, 0.14 | door_classic/paint + door_classic/brass | 0.11 | 14 | 22.5 |
| -0.50, 2.24, 0.01 | door_classic/paint + door_classic/paint | 0.72 | 10 | 22.5 |
| 0.50, 2.24, 0.15 | door_classic/paint + door_classic/paint | 0.72 | 10 | 22.5 |
| -0.37, 0.91, 0.09 | door_classic/paint + door_classic/paint | 0.81 | 10 | 22.5 |
| 0.37, 0.91, 0.13 | door_classic/paint + door_classic/paint | 0.81 | 10 | 22.5 |
| -0.37, 0.30, 0.11 | door_classic/paint + door_classic/paint | 1.55 | 10 | 22.5 |
| -0.37, 0.84, 0.11 | door_classic/paint + door_classic/paint | 1.55 | 10 | 22.5 |
| 0.54, 0.10, 0.01 | door_classic/bluestone + door_classic/paint | 0.41 | 7 | 22.5 |
| -0.37, 1.67, 0.13 | door_classic/paint + door_classic/paint | 2.16 | 7 | 22.5 |
| -0.37, 2.07, 0.13 | door_classic/paint + door_classic/paint | 0.07 | 7 | 22.5 |
| 0.37, 0.99, 0.13 | door_classic/paint + door_classic/paint | 0.07 | 7 | 22.5 |
| 0.37, 1.91, 0.13 | door_classic/paint + door_classic/paint | 2.16 | 7 | 22.5 |
| -0.37, 0.97, 0.11 | door_classic/paint + door_classic/paint | 1.5 | 7 | 22.5 |
| -0.37, 2.08, 0.12 | door_classic/paint + door_classic/paint | 1.5 | 7 | 22.5 |
| -0.50, 2.35, 0.07 | door_classic/paint + door_classic/paint | 0.31 | 6 | 22.5 |
| 0.50, 2.35, 0.07 | door_classic/paint + door_classic/paint | 0.31 | 6 | 22.5 |
| -0.37, 0.76, 0.10 | door_classic/paint + door_classic/paint | 1.09 | 6 | 22.5 |
| 0.37, 0.81, 0.12 | door_classic/paint + door_classic/paint | 1.09 | 6 | 22.5 |
| 0.29, 0.37, 0.12 | door_classic/paint + door_classic/paint | 2.01 | 6 | 22.5 |
| -0.53, 0.10, 0.01 | door_classic/bluestone + door_classic/paint | 0.41 | 5 | 22.5 |
| -0.37, 0.98, 0.13 | door_classic/paint + door_classic/paint | 0.07 | 5 | 22.5 |
| 0.37, 0.97, 0.14 | door_classic/paint + door_classic/brass | 0.13 | 5 | 22.5 |
| 0.37, 2.08, 0.13 | door_classic/paint + door_classic/paint | 0.07 | 5 | 22.5 |
| 0.37, 0.95, 0.14 | door_classic/paint + door_classic/brass | 0.11 | 5 | 22.5 |
| -0.37, 0.30, 0.10 | door_classic/paint + door_classic/paint | 0.04 | 2 | 22.5 |
| -0.37, 2.08, 0.11 | door_classic/paint + door_classic/paint | 0.04 | 2 | 22.5 |
| 0.37, 0.30, 0.13 | door_classic/paint + door_classic/paint | 0.04 | 2 | 22.5 |
| 0.37, 2.08, 0.11 | door_classic/paint + door_classic/paint | 0.04 | 2 | 22.5 |
| -0.35, 0.99, 0.13 | door_classic/paint + door_classic/paint | 0.03 | 2 | 22.5 |
| 0.35, 0.99, 0.11 | door_classic/paint + door_classic/paint | 0.03 | 2 | 22.5 |
| -0.35, 2.06, 0.11 | door_classic/paint + door_classic/paint | 0.03 | 2 | 22.5 |
| 0.35, 2.06, 0.13 | door_classic/paint + door_classic/paint | 0.03 | 2 | 22.5 |

## backtoback (info, 93)

| at | parts | area |
|---|---|---|
| -0.53, 0.10, 0.06 | door_classic/bluestone + door_classic/paint | 0.00432 |
| -0.55, 0.10, 0.08 | door_classic/bluestone + door_classic/paint | 0.0045 |
| 0.54, 0.10, 0.02 | door_classic/bluestone + door_classic/paint | 0.00105 |
| 0.51, 0.10, 0.02 | door_classic/bluestone + door_classic/paint | 0.00018 |
| 0.55, 0.10, 0.07 | door_classic/bluestone + door_classic/paint | 0.00327 |
| 0.52, 0.10, 0.10 | door_classic/bluestone + door_classic/paint | 0.00432 |
| -0.50, 2.25, 0.10 | door_classic/paint + door_classic/paint | 0.00478 |
| -0.50, 2.22, 0.07 | door_classic/paint + door_classic/paint | 0.00523 |
| -0.50, 2.33, 0.09 | door_classic/paint + door_classic/paint | 0.00105 |
| -0.50, 2.32, 0.07 | door_classic/paint + door_classic/paint | 0.00105 |
| -0.50, 2.24, 0.15 | door_classic/paint + door_classic/paint | 0.00047 |
| 0.50, 2.25, 0.06 | door_classic/paint + door_classic/paint | 0.00478 |
| 0.50, 2.22, 0.09 | door_classic/paint + door_classic/paint | 0.00523 |
| 0.50, 2.33, 0.07 | door_classic/paint + door_classic/paint | 0.00105 |
| 0.50, 2.32, 0.09 | door_classic/paint + door_classic/paint | 0.00105 |
| 0.50, 2.24, 0.01 | door_classic/paint + door_classic/paint | 0.00047 |
| -0.37, 0.20, 0.10 | door_classic/paint + door_classic/paint | 0.00027 |
| -0.37, 0.81, 0.11 | door_classic/paint + door_classic/paint | 0.00009 |
| -0.37, 0.76, 0.10 | door_classic/paint + door_classic/paint | 0.00014 |
| -0.37, 0.95, 0.10 | door_classic/paint + door_classic/paint | 0.00036 |
| -0.37, 0.89, 0.10 | door_classic/paint + door_classic/paint | 0.00136 |
| -0.37, 1.93, 0.12 | door_classic/paint + door_classic/paint | 0.00296 |
| -0.37, 1.64, 0.12 | door_classic/paint + door_classic/paint | 0.00391 |
| -0.37, 2.16, 0.12 | door_classic/paint + door_classic/paint | 0.0018 |
| -0.37, 2.11, 0.11 | door_classic/paint + door_classic/paint | 0.00188 |
| -0.37, 2.07, 0.12 | door_classic/paint + door_classic/paint | 0.00008 |
| -0.37, 2.07, 0.12 | door_classic/paint + door_classic/paint | 0.00017 |
| -0.37, 0.25, 0.11 | door_classic/paint + door_classic/paint | 0.00334 |
| -0.37, 0.16, 0.10 | door_classic/paint + door_classic/paint | 0.0031 |
| -0.37, 0.69, 0.11 | door_classic/paint + door_classic/paint | 0.0039 |
| -0.37, 0.51, 0.11 | door_classic/paint + door_classic/paint | 0.00385 |
| -0.37, 0.93, 0.12 | door_classic/paint + door_classic/paint | 0.0019 |
| -0.37, 0.86, 0.12 | door_classic/paint + door_classic/paint | 0.00089 |
| -0.37, 0.98, 0.13 | door_classic/paint + door_classic/paint | 0.0001 |
| -0.37, 0.98, 0.12 | door_classic/paint + door_classic/paint | 0.00018 |
| -0.37, 1.77, 0.13 | door_classic/paint + door_classic/paint | 0.00391 |
| -0.37, 1.23, 0.12 | door_classic/paint + door_classic/paint | 0.0083 |
| -0.37, 2.14, 0.13 | door_classic/paint + door_classic/paint | 0.00009 |
| 0.37, 0.20, 0.13 | door_classic/paint + door_classic/paint | 0.00027 |
| 0.37, 0.95, 0.12 | door_classic/paint + door_classic/paint | 0.00036 |

(53 more in the JSON)


Nodes: door_classic. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
