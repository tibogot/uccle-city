# Mesh audit: christmas spanmotif_lod2 (needle-vs-needle overlaps exempt: 0)

132 triangles, 66 welded vertices, 0 open edges, 0 rays, 1 ms.

**0 blocking**, 8 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 8 |
| backtoback | info | 4 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 8)

| at | part | aspect | longest |
|---|---|---|---|
| 0.56, -0.72, -0.01 | spanmotif_lod2/led_rope | 42 | 0.553 |
| 0.61, -0.86, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| 0.42, -1.44, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| 0.31, -1.52, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| -0.31, -1.52, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| -0.42, -1.44, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| -0.61, -0.86, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |
| -0.56, -0.72, -0.01 | spanmotif_lod2/led_rope | 42 | 0.55 |

## backtoback (info, 4)

| at | parts | area |
|---|---|---|
| 0.04, -0.28, -0.01 | spanmotif_lod2/led_rope + spanmotif_lod2/led_rope | 0.00086 |
| 0.03, -0.63, -0.01 | spanmotif_lod2/led_rope + spanmotif_lod2/led_rope | 0.00035 |
| 0.00, -0.21, -0.01 | spanmotif_lod2/led_rope + spanmotif_lod2/led_rope | 0.00017 |
| 0.00, -0.59, -0.01 | spanmotif_lod2/led_rope + spanmotif_lod2/led_rope | 0.00012 |
