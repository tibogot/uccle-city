# Mesh audit: christmas lampmotif_lod0 (needle-vs-needle overlaps exempt: 0)

1,716 triangles, 929 welded vertices, 0 open edges, 0 rays, 47 ms.

**0 blocking**, 84 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 84 |
| seam | info | 37 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 84)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, -0.00, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.01, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.00, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.00, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.01, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.00, -0.93 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.84 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.84 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.17, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.64 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.16, -0.64 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.16, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.17, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.16, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.00, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.01, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.00, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, 0.00, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.01, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, 0.00, -0.55 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.16, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.17, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.29, -0.58 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.16, -0.65 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.16, -0.64 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.29, -0.57 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.17, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.16, -0.83 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.02, -0.16, -0.84 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.16, -0.84 | lampmotif_lod0/metal_frame | 59 | 0.44 |
| 0.03, -0.41, -0.36 | lampmotif_lod0/metal_frame | 46 | 0.415 |
| 0.02, -0.40, -0.22 | lampmotif_lod0/metal_frame | 46 | 0.415 |
| 0.02, -0.40, -0.22 | lampmotif_lod0/metal_frame | 46 | 0.415 |
| 0.01, -0.39, -0.23 | lampmotif_lod0/metal_frame | 46 | 0.415 |

(44 more in the JSON)

## seam (info, 37)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, -0.01, -0.91 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 52 | 32.1 |
| -0.01, 0.14, -0.65 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 52 | 32.1 |
| -0.01, -0.01, -0.57 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 52 | 33.5 |
| -0.01, -0.15, -0.66 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 52 | 33.5 |
| 0.01, -0.16, -0.82 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 52 | 33.5 |
| 0.01, 0.15, -0.83 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.15 | 50 | 31.1 |
| -0.01, 0.35, -0.53 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 26 | 40.9 |
| 0.01, -0.35, -0.53 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 26 | 40.9 |
| -0.01, -0.01, -0.33 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 24 | 40.9 |
| -0.01, -0.35, -0.95 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 24 | 40.9 |
| 0.01, -0.01, -1.15 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 23 | 40.9 |
| -0.01, 0.01, -1.15 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 23 | 40.9 |
| -0.01, -0.36, -0.54 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 23 | 40.9 |
| 0.01, -0.36, -0.94 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 23 | 40.9 |
| 0.01, 0.35, -0.95 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 22 | 40.9 |
| -0.01, 0.36, -0.94 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 22 | 40.9 |
| 0.01, 0.36, -0.54 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 22 | 40.9 |
| 0.01, 0.01, -0.33 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.08 | 22 | 40.9 |
| -0.01, 0.23, -0.60 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 21 | 40.9 |
| 0.01, -0.23, -0.60 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 21 | 40.9 |
| 0.00, -0.01, -1.01 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 20 | 40.9 |
| -0.00, 0.01, -1.01 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 20 | 40.9 |
| 0.01, 0.24, -0.61 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 20 | 40.9 |
| 0.01, -0.24, -0.86 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 20 | 40.9 |
| -0.00, -0.01, -0.48 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 19 | 40.9 |
| 0.00, 0.01, -0.48 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 19 | 40.9 |
| -0.01, -0.24, -0.61 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 19 | 40.9 |
| 0.01, 0.23, -0.88 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 18 | 40.9 |
| -0.01, 0.24, -0.86 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 18 | 40.9 |
| -0.01, -0.23, -0.88 | lampmotif_lod0/led_rope + lampmotif_lod0/led_rope | 0.06 | 18 | 40.9 |
| 0.03, 0.04, -0.77 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 18 | 63.2 |
| 0.02, 0.04, -0.71 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 18 | 63.2 |
| 0.02, -0.04, -0.72 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 18 | 63.2 |
| 0.03, -0.04, -0.76 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 18 | 63.2 |
| 0.03, -0.41, -0.50 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.06 | 16 | 31.1 |
| 0.03, -0.00, -0.78 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 12 | 75.7 |
| 0.02, -0.00, -0.70 | lampmotif_lod0/metal_frame + lampmotif_lod0/metal_frame | 0.05 | 12 | 75.7 |
