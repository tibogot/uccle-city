# Mesh audit (before pack): rockkit.rk_corner_lod2

2,407 triangles, 1,269 welded vertices, 117 open edges, 6,078 rays, 50 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1 |
| backtoback | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1)

| at | part | aspect | longest |
|---|---|---|---|
| 0.19, 1.02, 1.31 | rk_corner_lod2/rocaille_concrete | 47 | 0.281 |

## backtoback (info, 1)

| at | parts | area |
|---|---|---|
| -0.64, 0.60, 1.05 | rk_corner_lod2/rocaille_concrete + rk_corner_lod2/rocaille_concrete | 0.00035 |


Nodes: rk_corner_lod2. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
