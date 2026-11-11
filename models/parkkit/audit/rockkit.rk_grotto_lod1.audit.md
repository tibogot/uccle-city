# Mesh audit (before pack): rockkit.rk_grotto_lod1

13,809 triangles, 7,110 welded vertices, 389 open edges, 12,860 rays, 457 ms.

**0 blocking**, 4 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 2 |
| nonmanifold | warn | 2 |
| backtoback | info | 3 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 2)

| at | part | aspect | longest |
|---|---|---|---|
| -0.34, 2.03, -1.18 | rk_grotto_lod1/rocaille_concrete | 42 | 0.281 |
| 1.30, 0.70, 1.38 | rk_grotto_lod1/rocaille_concrete | 126 | 0.255 |

## nonmanifold (warn, 2)

| at | part | uses |
|---|---|---|
| -1.09, 1.56, 1.30 | rk_grotto_lod1/rocaille_concrete | 4 |
| 1.42, 1.22, 1.14 | rk_grotto_lod1/rocaille_concrete | 4 |

## backtoback (info, 3)

| at | parts | area |
|---|---|---|
| -1.09, 1.56, 1.30 | rk_grotto_lod1/rocaille_concrete + rk_grotto_lod1/rocaille_concrete | 0.00012 |
| 1.42, 1.22, 1.14 | rk_grotto_lod1/rocaille_concrete + rk_grotto_lod1/rocaille_concrete | 0.00072 |
| 1.55, 0.81, 0.14 | rk_grotto_lod1/rocaille_concrete + rk_grotto_lod1/rocaille_concrete | 0.00021 |


Nodes: rk_grotto_lod1. Distances: {"rk_boulder_a_lod0":14,"rk_boulder_a_lod1":45,"rk_boulder_a_lod2":200,"rk_boulder_b_lod0":14,"rk_boulder_b_lod1":45,"rk_boulder_b_lod2":200,"rk_ledge_lod0":14,"rk_ledge_lod1":45,"rk_ledge_lod2":200,"rk_face_a_lod0":14,"rk_face_a_lod1":45,"rk_face_a_lod2":200,"rk_face_b_lod0":14,"rk_face_b_lod1":45,"rk_face_b_lod2":200,"rk_corner_lod0":14,"rk_corner_lod1":45,"rk_corner_lod2":200,"rk_step_lod0":14,"rk_step_lod1":45,"rk_step_lod2":200,"rk_grotto_lod0":14,"rk_grotto_lod1":45,"rk_grotto_lod2":200,"rk_channel_lod0":14,"rk_channel_lod1":45,"rk_channel_lod2":200,"nat_boulder_lod0":14,"nat_boulder_lod1":45,"nat_boulder_lod2":200,"nat_slab_lod0":14,"nat_slab_lod1":45,"nat_slab_lod2":200}. Quantum 0.022 mm. Offset 0,0,0.
