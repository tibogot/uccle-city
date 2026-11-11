# Mesh audit (before pack): rockkit.rk_channel_lod1

1,101 triangles, 588 welded vertices, 71 open edges, 2,842 rays, 21 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 1 |
| backtoback | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 1)

| at | part | aspect | longest |
|---|---|---|---|
| -0.88, 0.38, -0.26 | rk_channel_lod1/rocaille_concrete | 62 | 0.295 |

## backtoback (info, 2)

| at | parts | area |
|---|---|---|
| -1.17, 0.23, -0.09 | rk_channel_lod1/rocaille_concrete + rk_channel_lod1/rocaille_concrete | 0.00024 |
| 0.59, 0.26, -0.32 | rk_channel_lod1/rocaille_concrete + rk_channel_lod1/rocaille_concrete | 0.00007 |


Nodes: rk_channel_lod1. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
