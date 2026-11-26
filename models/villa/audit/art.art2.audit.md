# Mesh audit (before pack): art.art2

782 triangles, 412 welded vertices, 19 open edges, 736 rays, 21 ms.

**0 blocking**, 6 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 6 |
| opening | info | 7 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| 50.84, 121.61, -23.54 | Villa_art_lod2/sculpture | 3 |
| 50.83, 121.64, -23.55 | Villa_art_lod2/sculpture | 4 |
| 50.99, 121.05, -23.19 | Villa_art_lod2/sculpture | 3 |
| 50.98, 121.10, -23.22 | Villa_art_lod2/sculpture | 3 |
| 50.91, 120.72, -23.56 | Villa_art_lod2/sculpture | 3 |
| 50.87, 121.66, -23.52 | Villa_art_lod2/sculpture | 3 |

## opening (info, 7)

| at | part | facing | edge_m |
|---|---|---|---|
| 50.99, 121.08, -23.19 | Villa_art_lod2/sculpture | 0.83 + -0.23 + -0.51 | 0.101 |
| 51.01, 120.72, -23.64 | Villa_art_lod2/sculpture | 0.2 + 0.95 + -0.23 | 0.109 |
| 50.92, 120.72, -23.63 | Villa_art_lod2/sculpture | -0.38 + -0.92 + -0.04 | 0.117 |
| 50.87, 121.64, -23.52 | Villa_art_lod2/sculpture | -0.41 + 0.08 + 0.91 | 0.119 |
| 54.19, 119.41, -5.61 | Villa_art_lod2/sculpture | -0.1 + -0.92 + -0.39 | 0.045 |
| 54.85, 119.86, -5.74 | Villa_art_lod2/sculpture | 1 + -0.01 + 0 | 0.031 |
| 54.27, 119.38, -5.57 | Villa_art_lod2/sculpture | -0.08 + 0.97 + 0.22 | 0.084 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| 54.85, 119.86, -6.21 | Villa_art_lod2/sculpture + Villa_art_lod2/sculpture | 0.00207 |
| 54.86, 119.83, -6.07 | Villa_art_lod2/sculpture + Villa_art_lod2/sculpture | 0.00107 |


Nodes: Villa_art_lod2. Distances: {"Villa_ivy":80,"Villa":80,"Villa_kit":80,"Villa_art":80,"Villa_art_lod1":260,"Villa_art_lod2":2000,"Villa_bay":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
