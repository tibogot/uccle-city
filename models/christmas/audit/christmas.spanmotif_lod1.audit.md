# Mesh audit: christmas spanmotif_lod1 (needle-vs-needle overlaps exempt: 0)

484 triangles, 256 welded vertices, 0 open edges, 0 rays, 9 ms.

**0 blocking**, 60 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 60 |
| seam | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 60)

| at | part | aspect | longest |
|---|---|---|---|
| 0.14, -0.79, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.09, -0.87, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.08, -0.87, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.08, -0.87, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.08, -0.87, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.08, -0.87, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.23, -1.05, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.03, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.23, -1.06, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.02, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.02, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.02, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.00, -1.12, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.01, -1.12, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.00, -1.12, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.00, -1.12, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.01, -1.12, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.00, -1.12, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.23, -1.05, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.13, -1.03, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.23, -1.06, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.23, -1.05, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.13, -1.02, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.13, -1.02, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.14, -0.79, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.09, -0.87, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.14, -0.79, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.08, -0.87, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.08, -0.87, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| -0.08, -0.87, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.08, -0.87, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.14, -0.79, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.14, -0.79, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.14, -0.79, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.14, -0.78, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.14, -0.79, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.03, -0.02 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.23, -1.06, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.13, -1.02, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |
| 0.23, -1.05, -0.03 | spanmotif_lod1/metal_frame | 51 | 0.305 |

(20 more in the JSON)

## seam (info, 6)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, -0.06, -0.03 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.05 | 24 | 20.9 |
| 0.02, -0.95, -0.02 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.04 | 17 | 69.1 |
| -0.01, -1.02, -0.02 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.04 | 16 | 66.8 |
| -0.02, -0.95, -0.03 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.04 | 16 | 69.1 |
| 0.04, -0.99, -0.02 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.04 | 14 | 73.5 |
| -0.04, -0.99, -0.03 | spanmotif_lod1/metal_frame + spanmotif_lod1/metal_frame | 0.04 | 14 | 73.5 |
