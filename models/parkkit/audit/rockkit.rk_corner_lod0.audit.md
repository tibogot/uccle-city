# Mesh audit (before pack): rockkit.rk_corner_lod0

20,814 triangles, 10,680 welded vertices, 538 open edges, 17,496 rays, 481 ms.

**0 blocking**, 2 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 2 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -0.57, 1.32, 1.14 | rk_corner_lod0/rocaille_concrete | 4 |
| 0.69, 1.96, 1.24 | rk_corner_lod0/rocaille_concrete | 4 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| -0.57, 1.33, 1.14 | rk_corner_lod0/rocaille_concrete + rk_corner_lod0/rocaille_concrete | 0.00028 |
| 0.69, 1.96, 1.24 | rk_corner_lod0/rocaille_concrete + rk_corner_lod0/rocaille_concrete | 0.00016 |


Nodes: rk_corner_lod0. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
