# Mesh audit (before pack): publicart.milestone_lod1

802 triangles, 405 welded vertices, 0 open edges, 0 rays, 12 ms.

**0 blocking**, 16 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 16 |
| seam | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 16)

| at | part | aspect | longest |
|---|---|---|---|
| -0.29, 0.19, 0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.30, 0.18, 0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.10, 0.19, -0.29 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.10, 0.18, -0.30 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.29, 0.19, -0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.30, 0.18, -0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.10, 0.19, 0.29 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.10, 0.18, 0.30 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.29, 0.19, -0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.30, 0.18, -0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.10, 0.19, -0.29 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.10, 0.18, -0.30 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.29, 0.19, 0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| 0.30, 0.18, 0.10 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.10, 0.19, 0.29 | milestone_lod1/stone_blue | 50 | 0.57 |
| -0.10, 0.18, 0.30 | milestone_lod1/stone_blue | 50 | 0.57 |

## seam (info, 1)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.08, 0.19, -0.24 | milestone_lod1/stone_blue + milestone_lod1/stone_blue | 1.6 | 62 | 84 |


Nodes: milestone_lod1. Distances: {"monolithes_lod0":70,"monolithes_lod1":220,"monolithes_lod2":1100,"evades_lod0":35,"evades_lod1":110,"evades_lod2":500,"gobert_lod0":35,"gobert_lod1":110,"gobert_lod2":450,"milestone_lod0":14,"milestone_lod1":45,"milestone_lod2":140,"boundary_lod0":12,"boundary_lod1":40,"boundary_lod2":110}. Quantum 0.152 mm. Offset 0,0,0.
