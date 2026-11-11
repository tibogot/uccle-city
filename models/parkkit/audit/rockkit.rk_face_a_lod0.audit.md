# Mesh audit (before pack): rockkit.rk_face_a_lod0

31,379 triangles, 15,909 welded vertices, 423 open edges, 13,858 rays, 729 ms.

**0 blocking**, 3 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 3 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| -2.04, 1.83, 0.38 | rk_face_a_lod0/rocaille_concrete | 4 |
| 1.97, 1.92, 0.72 | rk_face_a_lod0/rocaille_concrete | 4 |
| 2.03, 0.16, -0.16 | rk_face_a_lod0/rocaille_concrete | 4 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| -2.04, 1.83, 0.38 | rk_face_a_lod0/rocaille_concrete + rk_face_a_lod0/rocaille_concrete | 0.00013 |
| 1.97, 1.92, 0.72 | rk_face_a_lod0/rocaille_concrete + rk_face_a_lod0/rocaille_concrete | 0.00011 |
| 2.04, 0.16, -0.16 | rk_face_a_lod0/rocaille_concrete + rk_face_a_lod0/rocaille_concrete | 0.00014 |


Nodes: rk_face_a_lod0. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
