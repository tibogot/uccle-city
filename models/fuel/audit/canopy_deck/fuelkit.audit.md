# Mesh audit: fuelkit.glb

32 triangles, 16 welded vertices, 0 open edges, 0 rays, 5 ms.

**0 blocking**, 24 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| nonmanifold | warn | 8 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| -0.50, 0.01, 0.17 | canopy_deck/soffit_white | 50 | 1 |
| -0.50, 0.01, -0.17 | canopy_deck/soffit_white | 50 | 1 |
| -0.17, 0.01, -0.50 | canopy_deck/soffit_white | 50 | 1 |
| 0.17, 0.01, -0.50 | canopy_deck/soffit_white | 50 | 1 |
| 0.50, 0.01, -0.17 | canopy_deck/soffit_white | 50 | 1 |
| 0.50, 0.01, 0.17 | canopy_deck/soffit_white | 50 | 1 |
| 0.17, 0.01, 0.50 | canopy_deck/soffit_white | 50 | 1 |
| -0.17, 0.01, 0.50 | canopy_deck/soffit_white | 50 | 1 |
| -0.50, 0.29, 0.17 | canopy_deck/roof_membrane | 50 | 1 |
| -0.50, 0.29, -0.17 | canopy_deck/roof_membrane | 50 | 1 |
| -0.17, 0.29, -0.50 | canopy_deck/roof_membrane | 50 | 1 |
| 0.17, 0.29, -0.50 | canopy_deck/roof_membrane | 50 | 1 |
| 0.50, 0.29, -0.17 | canopy_deck/roof_membrane | 50 | 1 |
| 0.50, 0.29, 0.17 | canopy_deck/roof_membrane | 50 | 1 |
| 0.17, 0.29, 0.50 | canopy_deck/roof_membrane | 50 | 1 |
| -0.17, 0.29, 0.50 | canopy_deck/roof_membrane | 50 | 1 |

## nonmanifold (warn, 8)

| at | part | uses |
|---|---|---|
| -0.50, 0.02, 0.00 | canopy_deck/soffit_white | 3 |
| 0.00, 0.02, -0.50 | canopy_deck/soffit_white | 3 |
| 0.50, 0.02, 0.00 | canopy_deck/soffit_white | 3 |
| 0.00, 0.02, 0.50 | canopy_deck/soffit_white | 3 |
| -0.50, 0.28, 0.00 | canopy_deck/roof_membrane | 3 |
| 0.00, 0.28, -0.50 | canopy_deck/roof_membrane | 3 |
| 0.50, 0.28, 0.00 | canopy_deck/roof_membrane | 3 |
| 0.00, 0.28, 0.50 | canopy_deck/roof_membrane | 3 |


Nodes: canopy_deck. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
