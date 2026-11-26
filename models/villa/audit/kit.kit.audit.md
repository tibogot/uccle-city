# Mesh audit (before pack): kit.kit

10,924 triangles, 5,821 welded vertices, 168 open edges, 36,592 rays, 780 ms.

**0 blocking**, 408 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 12 |
| nonmanifold | warn | 4 |
| seam | info | 27 |
| opening | info | 146 |
| backtoback | info | 44 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 46.64, 117.89, 10.24 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 46.60, 117.89, 10.20 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 46.66, 117.89, 10.20 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 46.62, 117.89, 10.16 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 49.44, 119.92, -23.56 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 49.39, 119.92, -23.61 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 49.46, 119.92, -23.60 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 49.42, 119.92, -23.64 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 52.66, 117.81, -5.96 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 52.61, 117.81, -6.01 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 52.68, 117.81, -6.00 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |
| 52.65, 117.81, -6.03 | Villa_kit/metal_dark + Villa_kit/metal_dark | 1 | 25 | 0 | 80 | 0.61 | false | 0 + 1 + 0 |

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 38.16, 118.39, -14.97 | Villa_kit/stone_blue | 4 |
| 43.34, 118.39, -14.97 | Villa_kit/stone_blue | 4 |
| 38.16, 118.39, 0.97 | Villa_kit/stone_blue | 4 |
| 43.34, 118.39, 0.97 | Villa_kit/stone_blue | 4 |

## seam (info, 27)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 36.33, 119.15, -16.66 | Villa_kit/metal_dark + Villa_kit/hedge | 1.42 | 32 | 34.6 |
| 43.88, 119.15, -16.66 | Villa_kit/metal_dark + Villa_kit/hedge | 1.42 | 32 | 34.6 |
| 43.88, 119.15, 15.34 | Villa_kit/metal_dark + Villa_kit/hedge | 1.42 | 32 | 34.6 |
| 44.25, 118.66, -11.81 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 30 | 35 |
| 44.25, 118.66, -8.31 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 30 | 35 |
| 40.49, 118.66, 8.90 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 30 | 35 |
| 40.49, 118.66, 10.10 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 30 | 35 |
| 43.63, 118.70, -11.81 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 28 | 35 |
| 43.63, 118.70, -8.31 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 28 | 35 |
| 40.49, 118.70, 9.52 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 28 | 35 |
| 40.49, 118.70, 10.72 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.24 | 28 | 35 |
| 43.31, 118.42, -12.23 | Villa_kit/stone_blue + Villa_kit/metal_dark | 0.13 | 16 | 90 |
| 43.31, 118.42, -11.73 | Villa_kit/stone_blue + Villa_kit/metal_dark | 0.13 | 16 | 90 |
| 43.96, 118.48, -9.73 | Villa_kit/stone_blue + Villa_kit/metal_dark | 0.16 | 12 | 90 |
| 50.19, 120.64, -23.60 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 4.08 | 10 | 45 |
| 43.63, 118.65, -10.61 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 44.25, 118.65, -10.61 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 43.63, 118.65, -7.11 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 44.25, 118.65, -7.11 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 41.70, 118.65, 9.52 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 41.70, 118.65, 8.90 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 41.70, 118.65, 10.72 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 41.70, 118.65, 10.10 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.1 | 8 | 45 |
| 38.52, 118.40, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.03 | 2 | 45 |
| 42.98, 118.39, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.03 | 2 | 45 |
| 38.52, 118.39, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.03 | 2 | 45 |
| 42.98, 118.40, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.03 | 2 | 45 |

## opening (info, 146)

| at | part | facing | edge_m |
|---|---|---|---|
| 43.97, 120.85, -9.74 | Villa_kit/metal_dark | 0.95 + 0 + 0.31 | 0.016 |
| 43.97, 120.85, -9.73 | Villa_kit/metal_dark | 0.59 + 0 + 0.81 | 0.016 |
| 43.95, 120.85, -9.72 | Villa_kit/metal_dark | 0 + 0 + 1 | 0.016 |
| 43.94, 120.85, -9.73 | Villa_kit/metal_dark | -0.59 + 0 + 0.81 | 0.016 |
| 43.93, 120.85, -9.74 | Villa_kit/metal_dark | -0.95 + 0 + 0.31 | 0.016 |
| 43.93, 120.85, -9.76 | Villa_kit/metal_dark | -0.95 + 0 + -0.31 | 0.016 |
| 43.94, 120.85, -9.77 | Villa_kit/metal_dark | -0.59 + 0 + -0.81 | 0.016 |
| 43.95, 120.85, -9.78 | Villa_kit/metal_dark | 0 + 0 + -1 | 0.016 |
| 43.97, 120.85, -9.77 | Villa_kit/metal_dark | 0.59 + 0 + -0.81 | 0.016 |
| 43.97, 120.85, -9.76 | Villa_kit/metal_dark | 0.95 + 0 + -0.31 | 0.016 |
| 46.57, 117.53, 10.20 | Villa_kit/metal_dark | -0.71 + -0.71 + 0 | 0.128 |
| 46.69, 117.53, 10.20 | Villa_kit/metal_dark | 0.71 + -0.71 + 0 | 0.128 |
| 46.63, 117.53, 10.14 | Villa_kit/metal_dark | 0 + -0.71 + -0.71 | 0.128 |
| 46.63, 117.53, 10.26 | Villa_kit/metal_dark | 0 + -0.71 + 0.71 | 0.128 |
| 49.37, 119.56, -23.60 | Villa_kit/metal_dark | -0.71 + -0.71 + 0 | 0.128 |
| 49.49, 119.56, -23.60 | Villa_kit/metal_dark | 0.71 + -0.71 + 0 | 0.128 |
| 49.43, 119.56, -23.66 | Villa_kit/metal_dark | 0 + -0.71 + -0.71 | 0.128 |
| 49.43, 119.56, -23.54 | Villa_kit/metal_dark | 0 + -0.71 + 0.71 | 0.128 |
| 52.59, 117.45, -6.00 | Villa_kit/metal_dark | -0.71 + -0.71 + 0 | 0.128 |
| 52.71, 117.45, -6.00 | Villa_kit/metal_dark | 0.71 + -0.71 + 0 | 0.128 |
| 52.65, 117.45, -6.06 | Villa_kit/metal_dark | 0 + -0.71 + -0.71 | 0.128 |
| 52.65, 117.45, -5.94 | Villa_kit/metal_dark | 0 + -0.71 + 0.71 | 0.128 |
| 44.01, 121.09, -9.73 | Villa_kit/concrete_soffit | -0.22 + -0.97 + -0.06 | 0.031 |
| 43.99, 121.09, -9.71 | Villa_kit/concrete_soffit | -0.16 + -0.97 + -0.16 | 0.031 |
| 43.97, 121.09, -9.69 | Villa_kit/concrete_soffit | -0.06 + -0.97 + -0.22 | 0.031 |
| 43.94, 121.09, -9.69 | Villa_kit/concrete_soffit | 0.06 + -0.97 + -0.22 | 0.031 |
| 43.91, 121.09, -9.71 | Villa_kit/concrete_soffit | 0.16 + -0.97 + -0.16 | 0.031 |
| 43.89, 121.09, -9.73 | Villa_kit/concrete_soffit | 0.22 + -0.97 + -0.06 | 0.031 |
| 43.89, 121.09, -9.77 | Villa_kit/concrete_soffit | 0.22 + -0.97 + 0.06 | 0.031 |
| 43.91, 121.09, -9.79 | Villa_kit/concrete_soffit | 0.16 + -0.97 + 0.16 | 0.031 |
| 43.94, 121.09, -9.81 | Villa_kit/concrete_soffit | 0.06 + -0.97 + 0.22 | 0.031 |
| 43.97, 121.09, -9.81 | Villa_kit/concrete_soffit | -0.06 + -0.97 + 0.22 | 0.031 |
| 43.99, 121.09, -9.79 | Villa_kit/concrete_soffit | -0.16 + -0.97 + 0.16 | 0.031 |
| 44.01, 121.09, -9.77 | Villa_kit/concrete_soffit | -0.22 + -0.97 + 0.06 | 0.031 |
| 47.39, 117.67, 10.04 | Villa_kit/concrete_soffit | -0.71 + -0.71 + 0 | 0.42 |
| 47.81, 117.67, 10.04 | Villa_kit/concrete_soffit | 0.71 + -0.71 + 0 | 0.42 |
| 47.44, 117.67, 9.99 | Villa_kit/concrete_soffit | 0 + -0.71 + -0.71 | 0.42 |
| 47.44, 117.67, 10.41 | Villa_kit/concrete_soffit | 0 + -0.71 + 0.71 | 0.42 |
| 50.19, 119.56, -23.96 | Villa_kit/concrete_soffit | -0.71 + -0.71 + 0 | 0.82 |
| 51.41, 119.56, -23.96 | Villa_kit/concrete_soffit | 0.71 + -0.71 + 0 | 0.82 |

(106 more in the JSON)

## backtoback (info, 44)

| at | parts | area |
|---|---|---|
| 38.39, 118.40, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00393 |
| 38.22, 118.39, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00319 |
| 38.47, 118.39, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00132 |
| 38.31, 118.38, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00206 |
| 43.19, 118.40, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00205 |
| 43.03, 118.39, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00131 |
| 43.28, 118.39, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.0032 |
| 43.15, 118.38, -14.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00394 |
| 38.31, 118.40, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00206 |
| 38.47, 118.39, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00132 |
| 38.22, 118.39, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00319 |
| 38.35, 118.38, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00393 |
| 43.11, 118.40, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00394 |
| 43.28, 118.39, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.0032 |
| 43.03, 118.39, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00131 |
| 43.19, 118.38, 0.97 | Villa_kit/stone_blue + Villa_kit/stone_blue | 0.00205 |
| 43.64, 118.65, -10.60 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 43.64, 118.65, -10.61 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 44.26, 118.65, -10.60 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 44.26, 118.65, -10.61 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 43.64, 118.65, -7.10 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 43.64, 118.65, -7.11 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 44.26, 118.65, -7.10 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 44.26, 118.65, -7.11 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 41.70, 118.65, 9.51 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 41.69, 118.65, 9.51 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 41.70, 118.65, 8.89 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 41.69, 118.65, 8.89 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 41.70, 118.65, 10.71 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 41.69, 118.65, 10.71 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 41.70, 118.65, 10.09 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00026 |
| 41.69, 118.65, 10.09 | Villa_kit/metal_dark + Villa_kit/metal_dark | 0.00028 |
| 47.55, 119.19, 10.36 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.0441 |
| 47.46, 119.19, 10.20 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.0441 |
| 47.74, 119.19, 10.20 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.0441 |
| 47.65, 119.19, 10.04 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.0441 |
| 50.80, 120.64, -23.33 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.24713 |
| 50.35, 120.64, -23.50 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.25307 |
| 51.25, 120.64, -23.70 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.25307 |
| 50.80, 120.64, -23.87 | Villa_kit/concrete_soffit + Villa_kit/concrete_soffit | 0.24713 |

(4 more in the JSON)


Nodes: Villa_kit. Distances: {"Villa_ivy":80,"Villa":80,"Villa_kit":80,"Villa_art":80,"Villa_art_lod1":260,"Villa_art_lod2":2000,"Villa_bay":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
