# Mesh audit (before pack): rockkit.rk_grotto_lod0

27,113 triangles, 13,827 welded vertices, 519 open edges, 16,102 rays, 583 ms.

**0 blocking**, 3 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 3 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 3)

| at | part | uses |
|---|---|---|
| -1.80, 1.24, 0.38 | rk_grotto_lod0/rocaille_concrete | 4 |
| -1.78, 0.16, -0.86 | rk_grotto_lod0/rocaille_concrete | 4 |
| 0.99, 0.67, -1.20 | rk_grotto_lod0/rocaille_concrete | 4 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| -1.81, 1.24, 0.38 | rk_grotto_lod0/rocaille_concrete + rk_grotto_lod0/rocaille_concrete | 0.0004 |
| -1.78, 0.16, -0.87 | rk_grotto_lod0/rocaille_concrete + rk_grotto_lod0/rocaille_concrete | 0.00033 |
| 1.55, 0.81, 0.14 | rk_grotto_lod0/rocaille_concrete + rk_grotto_lod0/rocaille_concrete | 0.00018 |
| 0.99, 0.67, -1.20 | rk_grotto_lod0/rocaille_concrete + rk_grotto_lod0/rocaille_concrete | 0.00013 |


Nodes: rk_grotto_lod0. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
