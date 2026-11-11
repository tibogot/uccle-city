# Mesh audit (before pack): rockkit.rk_grotto_lod2

3,097 triangles, 1,599 welded vertices, 95 open edges, 5,228 rays, 101 ms.

**0 blocking**, 3 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1 |
| nonmanifold | warn | 2 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, 2.10, -1.01 | rk_grotto_lod2/rocaille_concrete | 87 | 0.395 |

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -1.57, 1.71, 1.18 | rk_grotto_lod2/rocaille_concrete | 4 |
| -0.42, 1.99, 1.44 | rk_grotto_lod2/rocaille_concrete | 4 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| -1.57, 1.71, 1.19 | rk_grotto_lod2/rocaille_concrete + rk_grotto_lod2/rocaille_concrete | 0.00095 |
| -0.42, 1.98, 1.44 | rk_grotto_lod2/rocaille_concrete + rk_grotto_lod2/rocaille_concrete | 0.00062 |


Nodes: rk_grotto_lod2. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
