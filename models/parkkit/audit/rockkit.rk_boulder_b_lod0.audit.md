# Mesh audit (before pack): rockkit.rk_boulder_b_lod0

7,258 triangles, 3,694 welded vertices, 124 open edges, 4,034 rays, 123 ms.

**0 blocking**, 2 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 2 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| 0.21, 1.25, -0.57 | rk_boulder_b_lod0/rocaille_concrete | 4 |
| 0.66, 0.53, -0.00 | rk_boulder_b_lod0/rocaille_concrete | 4 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| 0.21, 1.25, -0.57 | rk_boulder_b_lod0/rocaille_concrete + rk_boulder_b_lod0/rocaille_concrete | 0.00013 |
| 0.66, 0.53, -0.00 | rk_boulder_b_lod0/rocaille_concrete + rk_boulder_b_lod0/rocaille_concrete | 0.00014 |


Nodes: rk_boulder_b_lod0. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
