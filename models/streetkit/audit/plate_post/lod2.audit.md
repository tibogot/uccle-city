# Mesh audit: streetkit plate_post lod2

382 triangles, 196 welded vertices, 0 open edges, 0 rays, 22 ms.

**0 blocking**, 79 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 5 |
| sliver | warn | 42 |
| nonmanifold | warn | 32 |
| seam | info | 18 |
| backtoback | info | 12 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 5)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.01, 2.52, -0.03 | plate_post.lod2 + plate_post.lod2 | 2.31 | 1.5 | 4.7 | 260 | 1.98 | false | 0.33 + 0 + -0.94 |
| 0.01, 2.68, -0.03 | plate_post.lod2 + plate_post.lod2 | 2.3 | 1.6 | 4.7 | 260 | 1.98 | false | 0.33 + 0 + -0.94 |
| -0.01, 2.68, -0.03 | plate_post.lod2 + plate_post.lod2 | 2.36 | 1.5 | 3.9 | 260 | 1.98 | false | -0.33 + 0 + -0.94 |
| -0.02, 2.52, -0.03 | plate_post.lod2 + plate_post.lod2 | 2.31 | 1.4 | 4.3 | 260 | 1.98 | false | -0.53 + 0 + -0.85 |
| -0.02, 2.51, -0.02 | plate_post.lod2 + plate_post.lod2 | 2.31 | 1.1 | 4.9 | 260 | 1.98 | false | -0.71 + 0 + -0.71 |

## sliver (warn, 42)

| at | part | aspect | longest |
|---|---|---|---|
| 0.03, 0.74, -0.01 | plate_post.lod2 | 245 | 3.27 |
| 0.03, 1.83, -0.00 | plate_post.lod2 | 487 | 3.27 |
| 0.03, 1.83, -0.01 | plate_post.lod2 | 487 | 3.27 |
| 0.02, 0.74, -0.02 | plate_post.lod2 | 245 | 3.27 |
| 0.03, 1.83, -0.01 | plate_post.lod2 | 487 | 3.27 |
| 0.02, 1.83, -0.02 | plate_post.lod2 | 487 | 3.27 |
| 0.01, 0.74, -0.03 | plate_post.lod2 | 245 | 3.27 |
| 0.02, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.01, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.00, 0.74, -0.03 | plate_post.lod2 | 245 | 3.27 |
| 0.00, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| -0.00, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| -0.01, 0.74, -0.03 | plate_post.lod2 | 245 | 3.27 |
| -0.01, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| -0.02, 1.83, -0.03 | plate_post.lod2 | 487 | 3.27 |
| -0.02, 0.74, -0.02 | plate_post.lod2 | 245 | 3.27 |
| -0.02, 1.83, -0.02 | plate_post.lod2 | 487 | 3.27 |
| -0.03, 1.83, -0.01 | plate_post.lod2 | 487 | 3.27 |
| -0.03, 0.74, -0.01 | plate_post.lod2 | 245 | 3.27 |
| -0.03, 1.83, -0.01 | plate_post.lod2 | 487 | 3.27 |
| -0.03, 1.83, -0.00 | plate_post.lod2 | 487 | 3.27 |
| -0.03, 0.74, 0.01 | plate_post.lod2 | 245 | 3.27 |
| -0.03, 1.83, 0.00 | plate_post.lod2 | 487 | 3.27 |
| -0.03, 1.83, 0.01 | plate_post.lod2 | 487 | 3.27 |
| -0.02, 0.74, 0.02 | plate_post.lod2 | 245 | 3.27 |
| -0.03, 1.83, 0.01 | plate_post.lod2 | 487 | 3.27 |
| -0.02, 1.83, 0.02 | plate_post.lod2 | 487 | 3.27 |
| -0.01, 0.74, 0.03 | plate_post.lod2 | 245 | 3.27 |
| -0.02, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| -0.01, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.00, 0.74, 0.03 | plate_post.lod2 | 245 | 3.27 |
| -0.00, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.00, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.01, 0.74, 0.03 | plate_post.lod2 | 245 | 3.27 |
| 0.01, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.02, 1.83, 0.03 | plate_post.lod2 | 487 | 3.27 |
| 0.02, 0.74, 0.02 | plate_post.lod2 | 245 | 3.27 |
| 0.02, 1.83, 0.02 | plate_post.lod2 | 487 | 3.27 |
| 0.03, 1.83, 0.01 | plate_post.lod2 | 487 | 3.27 |
| 0.03, 0.74, 0.01 | plate_post.lod2 | 245 | 3.27 |

(2 more in the JSON)

## nonmanifold (warn, 32)

| at | part | uses |
|---|---|---|
| 0.03, 2.92, -0.00 | plate_post.lod2 | 3 |
| 0.03, 2.92, -0.01 | plate_post.lod2 | 3 |
| 0.03, 2.92, -0.02 | plate_post.lod2 | 3 |
| 0.02, 2.92, -0.02 | plate_post.lod2 | 3 |
| 0.02, 2.92, -0.03 | plate_post.lod2 | 3 |
| 0.01, 2.92, -0.03 | plate_post.lod2 | 3 |
| 0.00, 2.92, -0.03 | plate_post.lod2 | 3 |
| -0.00, 2.92, -0.03 | plate_post.lod2 | 3 |
| -0.01, 2.92, -0.03 | plate_post.lod2 | 3 |
| -0.02, 2.92, -0.03 | plate_post.lod2 | 3 |
| -0.02, 2.92, -0.02 | plate_post.lod2 | 3 |
| -0.03, 2.92, -0.02 | plate_post.lod2 | 3 |
| -0.03, 2.92, -0.01 | plate_post.lod2 | 3 |
| -0.03, 2.92, -0.00 | plate_post.lod2 | 3 |
| -0.03, 2.92, 0.00 | plate_post.lod2 | 3 |
| -0.03, 2.92, 0.01 | plate_post.lod2 | 3 |
| -0.03, 2.92, 0.02 | plate_post.lod2 | 3 |
| -0.02, 2.92, 0.02 | plate_post.lod2 | 3 |
| -0.02, 2.92, 0.03 | plate_post.lod2 | 3 |
| -0.01, 2.92, 0.03 | plate_post.lod2 | 3 |
| -0.00, 2.92, 0.03 | plate_post.lod2 | 3 |
| 0.00, 2.92, 0.03 | plate_post.lod2 | 3 |
| 0.01, 2.92, 0.03 | plate_post.lod2 | 3 |
| 0.02, 2.92, 0.03 | plate_post.lod2 | 3 |
| 0.02, 2.92, 0.02 | plate_post.lod2 | 3 |
| 0.03, 2.92, 0.02 | plate_post.lod2 | 3 |
| 0.03, 2.92, 0.01 | plate_post.lod2 | 3 |
| 0.03, 2.92, 0.00 | plate_post.lod2 | 3 |
| -0.00, 2.52, -0.03 | plate_post.lod2 | 4 |
| 0.03, 2.52, -0.01 | plate_post.lod2 | 4 |
| -0.00, 2.68, -0.03 | plate_post.lod2 | 4 |
| 0.01, 2.68, -0.03 | plate_post.lod2 | 4 |

## seam (info, 18)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.01, 2.50, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.07 | 18 | 6.4 |
| 0.03, 2.52, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.04 | 17 | 30.8 |
| 0.02, 2.50, -0.02 | plate_post.lod2 + plate_post.lod2 | 0.08 | 15 | 7 |
| -0.01, 2.54, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.12 | 14 | 18.3 |
| -0.01, 2.70, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.12 | 14 | 17.9 |
| -0.01, 2.67, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.05 | 13 | 9 |
| -0.02, 2.52, 0.02 | plate_post.lod2 + plate_post.lod2 | 0.03 | 13 | 39.5 |
| -0.03, 2.68, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.03 | 12 | 13.5 |
| -0.02, 2.68, 0.02 | plate_post.lod2 + plate_post.lod2 | 0.02 | 11 | 36 |
| 0.02, 2.68, 0.02 | plate_post.lod2 + plate_post.lod2 | 0.03 | 10 | 39.5 |
| -0.03, 2.52, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.03 | 10 | 28.8 |
| 0.02, 2.52, 0.02 | plate_post.lod2 + plate_post.lod2 | 0.02 | 9 | 38.2 |
| 0.02, 2.68, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.02 | 9 | 23.2 |
| 0.02, 2.69, -0.02 | plate_post.lod2 + plate_post.lod2 | 0.04 | 8 | 5.4 |
| -0.02, 2.50, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.07 | 8 | 67.1 |
| -0.02, 2.67, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.07 | 8 | 65.3 |
| 0.02, 2.50, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.06 | 7 | 56.7 |
| 0.02, 2.67, 0.03 | plate_post.lod2 + plate_post.lod2 | 0.07 | 7 | 63.2 |

## backtoback (info, 12)

| at | parts | area |
|---|---|---|
| 0.02, 2.52, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.00014 |
| -0.02, 2.52, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.00014 |
| -0.02, 2.68, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.00015 |
| -0.02, 2.52, -0.02 | plate_post.lod2 + plate_post.lod2 | 0.00004 |
| -0.02, 2.53, -0.02 | plate_post.lod2 + plate_post.lod2 | 0.00011 |
| -0.02, 2.69, -0.02 | plate_post.lod2 + plate_post.lod2 | 0.00012 |
| -0.03, 2.53, 0.01 | plate_post.lod2 + plate_post.lod2 | 0.00004 |
| -0.03, 2.52, 0.01 | plate_post.lod2 + plate_post.lod2 | 0.00013 |
| -0.03, 2.69, 0.01 | plate_post.lod2 + plate_post.lod2 | 0.00005 |
| -0.03, 2.68, 0.01 | plate_post.lod2 + plate_post.lod2 | 0.00014 |
| 0.03, 2.51, -0.01 | plate_post.lod2 + plate_post.lod2 | 0.00024 |
| 0.00, 2.69, -0.03 | plate_post.lod2 + plate_post.lod2 | 0.00025 |
