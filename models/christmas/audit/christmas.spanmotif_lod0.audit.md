# Mesh audit: christmas spanmotif_lod0 (needle-vs-needle overlaps exempt: 0)

728 triangles, 378 welded vertices, 0 open edges, 0 rays, 15 ms.

**0 blocking**, 240 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 240 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 240)

| at | part | aspect | longest |
|---|---|---|---|
| 0.56, -0.73, 0.01 | spanmotif_lod0/led_rope | 87 | 0.543 |
| 0.55, -0.73, 0.01 | spanmotif_lod0/led_rope | 47 | 0.537 |
| 0.37, -0.73, -0.00 | spanmotif_lod0/led_rope | 44 | 0.534 |
| 0.38, -0.72, -0.01 | spanmotif_lod0/led_rope | 46 | 0.537 |
| 0.38, -0.71, -0.01 | spanmotif_lod0/led_rope | 47 | 0.543 |
| 0.39, -0.71, -0.01 | spanmotif_lod0/led_rope | 45 | 0.55 |
| 0.57, -0.72, 0.00 | spanmotif_lod0/led_rope | 48 | 0.552 |
| 0.57, -0.72, 0.01 | spanmotif_lod0/led_rope | 87 | 0.55 |
| 0.60, -0.85, 0.01 | spanmotif_lod0/led_rope | 87 | 0.543 |
| 0.59, -0.86, 0.01 | spanmotif_lod0/led_rope | 47 | 0.539 |
| 0.45, -0.97, -0.00 | spanmotif_lod0/led_rope | 45 | 0.537 |
| 0.46, -0.97, -0.01 | spanmotif_lod0/led_rope | 51 | 0.539 |
| 0.47, -0.97, -0.01 | spanmotif_lod0/led_rope | 51 | 0.543 |
| 0.47, -0.97, -0.01 | spanmotif_lod0/led_rope | 46 | 0.548 |
| 0.62, -0.85, 0.00 | spanmotif_lod0/led_rope | 48 | 0.549 |
| 0.61, -0.85, 0.01 | spanmotif_lod0/led_rope | 86 | 0.548 |
| 0.41, -1.43, 0.01 | spanmotif_lod0/led_rope | 87 | 0.543 |
| 0.40, -1.43, 0.01 | spanmotif_lod0/led_rope | 47 | 0.539 |
| 0.36, -1.25, -0.00 | spanmotif_lod0/led_rope | 45 | 0.537 |
| 0.36, -1.26, -0.01 | spanmotif_lod0/led_rope | 51 | 0.539 |
| 0.37, -1.26, -0.01 | spanmotif_lod0/led_rope | 51 | 0.543 |
| 0.38, -1.27, -0.01 | spanmotif_lod0/led_rope | 46 | 0.548 |
| 0.42, -1.45, 0.00 | spanmotif_lod0/led_rope | 48 | 0.549 |
| 0.42, -1.44, 0.01 | spanmotif_lod0/led_rope | 86 | 0.548 |
| 0.30, -1.51, 0.01 | spanmotif_lod0/led_rope | 87 | 0.543 |
| 0.30, -1.50, 0.01 | spanmotif_lod0/led_rope | 47 | 0.539 |
| 0.15, -1.40, -0.00 | spanmotif_lod0/led_rope | 45 | 0.537 |
| 0.15, -1.41, -0.01 | spanmotif_lod0/led_rope | 51 | 0.539 |
| 0.15, -1.42, -0.01 | spanmotif_lod0/led_rope | 51 | 0.543 |
| 0.15, -1.43, -0.01 | spanmotif_lod0/led_rope | 46 | 0.548 |
| 0.31, -1.53, 0.00 | spanmotif_lod0/led_rope | 48 | 0.549 |
| 0.31, -1.52, 0.01 | spanmotif_lod0/led_rope | 86 | 0.548 |
| -0.30, -1.51, 0.01 | spanmotif_lod0/led_rope | 87 | 0.543 |
| -0.30, -1.50, 0.01 | spanmotif_lod0/led_rope | 47 | 0.539 |
| -0.15, -1.40, -0.00 | spanmotif_lod0/led_rope | 45 | 0.537 |
| -0.15, -1.41, -0.01 | spanmotif_lod0/led_rope | 51 | 0.539 |
| -0.15, -1.42, -0.01 | spanmotif_lod0/led_rope | 51 | 0.543 |
| -0.15, -1.43, -0.01 | spanmotif_lod0/led_rope | 46 | 0.548 |
| -0.31, -1.53, 0.00 | spanmotif_lod0/led_rope | 48 | 0.549 |
| -0.31, -1.52, 0.01 | spanmotif_lod0/led_rope | 86 | 0.548 |

(200 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, -0.06, -0.03 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.05 | 25 | 35.9 |
| -0.01, -1.02, -0.02 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.04 | 22 | 74.4 |
| 0.02, -0.95, -0.02 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.04 | 17 | 69.1 |
| -0.02, -0.95, -0.03 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.04 | 16 | 69.1 |
| 0.04, -0.99, -0.02 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.04 | 14 | 73.5 |
| -0.04, -0.99, -0.03 | spanmotif_lod0/metal_frame + spanmotif_lod0/metal_frame | 0.04 | 14 | 73.5 |
