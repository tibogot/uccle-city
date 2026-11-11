# Mesh audit (before pack): rockkit.rk_step_lod2

81 triangles, 47 welded vertices, 11 open edges, 800 rays, 4 ms.

**0 blocking**, 1 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| nonmanifold | warn | 1 |
| backtoback | info | 1 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## nonmanifold (warn, 1)

| at | part | uses |
|---|---|---|
| -0.41, 0.26, -0.25 | rk_step_lod2/rocaille_concrete | 4 |

## backtoback (info, 1)

| at | parts | area |
|---|---|---|
| -0.43, 0.26, -0.24 | rk_step_lod2/rocaille_concrete + rk_step_lod2/rocaille_concrete | 0.0028 |


Nodes: rk_step_lod2. Distances: {"rk2_pillars_tall_lod0":13,"rk2_pillars_tall_lod1":32,"rk2_pillars_tall_lod2":200,"rk2_pillars_low_lod0":13,"rk2_pillars_low_lod1":32,"rk2_pillars_low_lod2":200,"rk2_pillar_lod0":13,"rk2_pillar_lod1":32,"rk2_pillar_lod2":200,"rk2_slabs_lod0":13,"rk2_slabs_lod1":32,"rk2_slabs_lod2":200,"rk2_cap_lod0":13,"rk2_cap_lod1":32,"rk2_cap_lod2":200,"rk2_foot_lod0":13,"rk2_foot_lod1":32,"rk2_foot_lod2":200,"rk2_grotto_lod0":13,"rk2_grotto_lod1":32,"rk2_grotto_lod2":200,"rk_step_lod0":13,"rk_step_lod1":32,"rk_step_lod2":200,"rk_channel_lod0":13,"rk_channel_lod1":32,"rk_channel_lod2":200,"nat_boulder_lod0":13,"nat_boulder_lod1":32,"nat_boulder_lod2":200,"nat_slab_lod0":13,"nat_slab_lod1":32,"nat_slab_lod2":200}. Quantum 0.033 mm. Offset 0,0,0.
