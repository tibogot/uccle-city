# Mesh audit (before pack): art.art

41,135 triangles, 20,570 welded vertices, 1 open edges, 0 rays, 27552 ms.

**0 blocking**, 5 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 5 |
| seam | info | 1 |
| backtoback | info | 5 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 5)

| at | part | uses |
|---|---|---|
| 47.48, 119.54, 10.17 | Villa_art/sculpture | 3 |
| 47.48, 119.54, 10.18 | Villa_art/sculpture | 3 |
| 50.56, 121.80, -23.68 | Villa_art/sculpture | 4 |
| 50.57, 121.89, -23.68 | Villa_art/sculpture | 4 |
| 50.57, 121.89, -23.69 | Villa_art/sculpture | 4 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 54.18, 119.38, -6.00 | Villa_art/sculpture + Villa_art/sculpture | 0.01 | 8 | 5.5 |

## backtoback (info, 5)

| at | parts | area |
|---|---|---|
| 53.99, 118.97, -5.93 | Villa_art/sculpture + Villa_art/sculpture | 0.00028 |
| 53.99, 118.97, -5.92 | Villa_art/sculpture + Villa_art/sculpture | 0.00195 |
| 53.98, 118.97, -5.93 | Villa_art/sculpture + Villa_art/sculpture | 0.00152 |
| 53.98, 118.97, -5.95 | Villa_art/sculpture + Villa_art/sculpture | 0.00017 |
| 53.98, 118.97, -5.96 | Villa_art/sculpture + Villa_art/sculpture | 0.00214 |


Nodes: Villa_art. Distances: {"Villa_ivy":80,"Villa":80,"Villa_kit":80,"Villa_art":80,"Villa_art_lod1":260,"Villa_art_lod2":2000,"Villa_bay":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
