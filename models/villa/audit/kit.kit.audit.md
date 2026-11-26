# Mesh audit (before pack): kit.kit

10,534 triangles, 5,593 welded vertices, 132 open edges, 31,984 rays, 963 ms.

**0 blocking**, 256 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 4 |
| seam | info | 26 |
| opening | info | 122 |
| backtoback | info | 32 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| 38.16, 118.39, -14.97 | Villa_kit/stone_blue | 4 |
| 43.34, 118.39, -14.97 | Villa_kit/stone_blue | 4 |
| 38.16, 118.39, 0.97 | Villa_kit/stone_blue | 4 |
| 43.34, 118.39, 0.97 | Villa_kit/stone_blue | 4 |

## seam (info, 26)

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
| 43.95, 118.48, -9.72 | Villa_kit/stone_blue + Villa_kit/metal_dark | 0.16 | 12 | 90 |
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

## opening (info, 122)

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
| 44.68, 117.56, -17.53 | Villa_kit/hedge | -0.71 + -0.71 + 0 | 1.636 |
| 45.08, 117.56, -17.53 | Villa_kit/hedge | 0.71 + -0.71 + 0 | 1.636 |
| 44.73, 117.56, -17.58 | Villa_kit/hedge | 0 + -0.71 + -0.71 | 0.4 |
| 44.73, 117.56, -15.94 | Villa_kit/hedge | 0 + -0.71 + 0.71 | 0.4 |
| 44.68, 117.49, -15.69 | Villa_kit/hedge | -0.71 + -0.71 + 0 | 1.636 |
| 45.08, 117.49, -15.69 | Villa_kit/hedge | 0.71 + -0.71 + 0 | 1.636 |
| 44.73, 117.49, -15.74 | Villa_kit/hedge | 0 + -0.71 + -0.71 | 0.4 |
| 44.73, 117.49, -14.11 | Villa_kit/hedge | 0 + -0.71 + 0.71 | 0.4 |
| 44.68, 117.45, -13.86 | Villa_kit/hedge | -0.71 + -0.71 + 0 | 1.636 |
| 45.08, 117.45, -13.86 | Villa_kit/hedge | 0.71 + -0.71 + 0 | 1.636 |
| 44.73, 117.45, -13.91 | Villa_kit/hedge | 0 + -0.71 + -0.71 | 0.4 |
| 44.73, 117.45, -12.27 | Villa_kit/hedge | 0 + -0.71 + 0.71 | 0.4 |
| 44.68, 117.43, -12.02 | Villa_kit/hedge | -0.71 + -0.71 + 0 | 1.636 |
| 45.08, 117.43, -12.02 | Villa_kit/hedge | 0.71 + -0.71 + 0 | 1.636 |
| 44.73, 117.43, -12.07 | Villa_kit/hedge | 0 + -0.71 + -0.71 | 0.4 |
| 44.73, 117.43, -10.43 | Villa_kit/hedge | 0 + -0.71 + 0.71 | 0.4 |
| 44.68, 117.38, -10.18 | Villa_kit/hedge | -0.71 + -0.71 + 0 | 1.636 |
| 45.08, 117.38, -10.18 | Villa_kit/hedge | 0.71 + -0.71 + 0 | 1.636 |

(82 more in the JSON)

## backtoback (info, 32)

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


Nodes: Villa_kit. Distances: {"Villa_ivy":80,"Villa":80,"Villa_kit":80,"Villa_bay":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
