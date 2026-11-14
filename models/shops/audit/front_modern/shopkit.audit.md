# Mesh audit: shopkit.glb

1,352 triangles, 696 welded vertices, 0 open edges, 0 rays, 168 ms.

**24 blocking**, 336 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 12 |
| bentflat | block | 12 |
| near | warn | 2 |
| sliver | warn | 328 |
| nonmanifold | warn | 6 |
| seam | info | 37 |
| backtoback | info | 85 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 12)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 1.03, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0 | 0.8 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 1.01, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0 | 1.4 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 1.02, 0.15, 0.08 | front_modern/bluestone + front_modern/alu | 0 | 1 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 1.00, 0.15, 0.03 | front_modern/bluestone + front_modern/alu | 0 | 1.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 1.00, 0.15, 0.05 | front_modern/bluestone + front_modern/alu | 0 | 1.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.01, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0 | 0.6 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.03, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0 | 1.3 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.01, 0.15, 0.08 | front_modern/bluestone + front_modern/alu | 0 | 1.1 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.00, 0.15, 0.03 | front_modern/bluestone + front_modern/alu | 0 | 1.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.00, 0.15, 0.05 | front_modern/bluestone + front_modern/alu | 0 | 1.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -1.02, 0.16, 0.00 | front_modern/bluestone + front_modern/alu | 0 | 4.3 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 1.02, 0.16, 0.00 | front_modern/bluestone + front_modern/alu | 0 | 4.3 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

## bentflat (block, 12)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.34, -0.00, 0.07 | front_modern/bluestone | 14.7 | 0.4529 | 0.91 |
| -0.34, -0.15, 0.07 | front_modern/bluestone | 14.7 | 0.4529 | 0.91 |
| -0.34, -0.00, 0.00 | front_modern/bluestone | 14.7 | 0.4529 | 0.91 |
| 0.34, -0.15, 0.00 | front_modern/bluestone | 14.7 | 0.4529 | 0.91 |
| 0.35, 2.55, 0.09 | front_modern/alu | 14.7 | 0.2647 | 0.53 |
| -0.35, 2.55, 0.18 | front_modern/alu | 14.7 | 0.2647 | 0.53 |
| 0.35, 2.98, 0.27 | front_modern/alu | 14.7 | 0.6606 | 1.32 |
| -0.35, 2.77, 0.27 | front_modern/alu | 14.7 | 0.6606 | 1.32 |
| -0.35, 3.20, 0.09 | front_modern/alu | 14.7 | 0.2647 | 0.53 |
| 0.35, 3.20, 0.18 | front_modern/alu | 14.7 | 0.2647 | 0.53 |
| -0.35, 2.98, 0.00 | front_modern/alu | 14.7 | 0.6606 | 1.32 |
| 0.35, 2.77, 0.00 | front_modern/alu | 14.7 | 0.6606 | 1.32 |

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 1.02, 0.16, 0.09 | front_modern/bluestone + front_modern/alu | 2 | 4.3 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -1.02, 0.16, 0.09 | front_modern/bluestone + front_modern/alu | 2 | 4.3 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## sliver (warn, 328)

| at | part | aspect | longest |
|---|---|---|---|
| -1.03, -0.00, 0.07 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.15, 0.07 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.00, 0.07 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.15, 0.07 | front_modern/bluestone | 95 | 0.438 |
| -1.03, -0.15, 0.00 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.00, 0.00 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.15, 0.00 | front_modern/bluestone | 95 | 0.438 |
| -1.04, -0.00, 0.01 | front_modern/bluestone | 95 | 0.438 |
| -0.34, -0.30, 0.01 | front_modern/bluestone | 450 | 2.068 |
| 0.34, -0.30, 0.00 | front_modern/bluestone | 450 | 2.068 |
| -0.34, -0.30, 0.00 | front_modern/bluestone | 450 | 2.068 |
| 0.34, -0.29, 0.00 | front_modern/bluestone | 450 | 2.068 |
| 0.34, 0.15, 0.01 | front_modern/bluestone | 450 | 2.068 |
| -0.34, 0.15, 0.00 | front_modern/bluestone | 450 | 2.068 |
| 0.34, 0.15, 0.00 | front_modern/bluestone | 450 | 2.068 |
| -0.34, 0.14, 0.00 | front_modern/bluestone | 450 | 2.068 |
| 1.04, -0.15, 0.01 | front_modern/bluestone | 95 | 0.438 |
| 1.04, -0.00, 0.00 | front_modern/bluestone | 95 | 0.438 |
| 1.04, -0.15, 0.00 | front_modern/bluestone | 95 | 0.438 |
| 1.03, -0.00, 0.00 | front_modern/bluestone | 95 | 0.438 |
| 1.03, -0.15, 0.07 | front_modern/bluestone | 95 | 0.438 |
| 1.04, -0.00, 0.07 | front_modern/bluestone | 95 | 0.438 |
| 1.04, -0.15, 0.07 | front_modern/bluestone | 95 | 0.438 |
| 1.04, -0.00, 0.07 | front_modern/bluestone | 95 | 0.438 |
| 0.34, -0.30, 0.07 | front_modern/bluestone | 450 | 2.068 |
| -0.34, -0.30, 0.07 | front_modern/bluestone | 450 | 2.068 |
| 0.34, -0.30, 0.07 | front_modern/bluestone | 450 | 2.068 |
| -0.34, -0.29, 0.07 | front_modern/bluestone | 450 | 2.068 |
| -0.34, 0.15, 0.07 | front_modern/bluestone | 450 | 2.068 |
| 0.34, 0.15, 0.07 | front_modern/bluestone | 450 | 2.068 |
| -0.34, 0.15, 0.07 | front_modern/bluestone | 450 | 2.068 |
| 0.34, 0.14, 0.07 | front_modern/bluestone | 450 | 2.068 |
| -0.35, 0.15, 0.00 | front_modern/bluestone | 680 | 2.082 |
| 0.35, 0.15, 0.00 | front_modern/bluestone | 680 | 2.082 |
| -0.35, 0.15, 0.00 | front_modern/bluestone | 680 | 2.082 |
| 0.35, 0.15, 0.00 | front_modern/bluestone | 680 | 2.082 |
| 0.35, 0.17, 0.00 | front_modern/bluestone | 680 | 2.082 |
| -0.35, 0.17, 0.00 | front_modern/bluestone | 680 | 2.082 |
| 0.35, 0.17, 0.00 | front_modern/bluestone | 680 | 2.082 |
| -0.35, 0.17, 0.00 | front_modern/bluestone | 680 | 2.082 |

(288 more in the JSON)

## nonmanifold (warn, 6)

| at | part | uses |
|---|---|---|
| -0.94, 2.54, 0.06 | front_modern/alu | 4 |
| -1.00, 1.35, 0.01 | front_modern/alu | 4 |
| -1.00, 1.35, 0.07 | front_modern/alu | 4 |
| 0.94, 2.54, 0.06 | front_modern/alu | 4 |
| 1.00, 1.35, 0.01 | front_modern/alu | 4 |
| 1.00, 1.35, 0.07 | front_modern/alu | 4 |

## seam (info, 37)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.04, 0.15, 0.00 | front_modern/bluestone + front_modern/alu | 0.26 | 60 | 22.5 |
| 1.00, 0.15, 0.00 | front_modern/bluestone + front_modern/alu | 0.26 | 59 | 22.5 |
| -1.00, 0.15, 0.08 | front_modern/bluestone + front_modern/alu | 0.2 | 48 | 22.5 |
| 1.00, 0.15, 0.08 | front_modern/bluestone + front_modern/alu | 0.2 | 48 | 22.5 |
| 1.00, 0.15, 0.04 | front_modern/bluestone + front_modern/alu | 0.26 | 28 | 22.5 |
| -1.01, 0.15, 0.04 | front_modern/bluestone + front_modern/alu | 0.26 | 28 | 22.5 |
| -1.04, 2.59, 0.27 | front_modern/alu + front_modern/alu | 4.2 | 16 | 22.5 |
| 0.11, 2.55, 0.12 | front_modern/alu + front_modern/rubber | 4.36 | 10 | 90 |
| -0.97, 0.17, 0.00 | front_modern/bluestone + front_modern/alu | 0.26 | 8 | 22.5 |
| 0.97, 0.17, 0.00 | front_modern/bluestone + front_modern/alu | 0.26 | 8 | 22.5 |
| -1.00, 0.17, 0.08 | front_modern/alu + front_modern/alu | 4.74 | 8 | 22.5 |
| -1.00, 0.17, 0.01 | front_modern/alu + front_modern/alu | 4.85 | 8 | 22.5 |
| -1.04, 2.55, 0.01 | front_modern/alu + front_modern/alu | 0.08 | 8 | 22.5 |
| 1.00, 0.17, 0.09 | front_modern/alu + front_modern/alu | 4.74 | 8 | 22.5 |
| 1.00, 0.17, 0.07 | front_modern/alu + front_modern/alu | 4.85 | 8 | 22.5 |
| -0.94, 2.48, 0.07 | front_modern/alu + front_modern/rubber | 3.81 | 8 | 22.5 |
| 1.03, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0.07 | 7 | 22.5 |
| -1.00, 0.15, 0.07 | front_modern/bluestone + front_modern/alu | 0.12 | 7 | 22.5 |
| -1.00, 0.17, 0.01 | front_modern/alu + front_modern/alu | 4.74 | 7 | 22.5 |
| 1.00, 2.39, 0.00 | front_modern/alu + front_modern/alu | 4.74 | 7 | 22.5 |
| -1.03, 0.15, 0.04 | front_modern/bluestone + front_modern/bluestone | 4.26 | 6 | 22.5 |
| -1.04, 2.55, 0.08 | front_modern/alu + front_modern/alu | 0.09 | 6 | 22.5 |
| -1.01, 2.55, 0.04 | front_modern/alu + front_modern/alu | 0.13 | 6 | 22.5 |
| 1.00, 2.55, 0.01 | front_modern/alu + front_modern/alu | 0.08 | 6 | 22.5 |
| 1.00, 2.55, 0.08 | front_modern/alu + front_modern/alu | 0.09 | 6 | 22.5 |
| 1.00, 2.55, 0.04 | front_modern/alu + front_modern/alu | 0.13 | 6 | 22.5 |
| -1.04, 3.20, 0.14 | front_modern/alu + front_modern/steel | 4.68 | 6 | 22.5 |
| -1.03, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0.07 | 5 | 22.5 |
| 1.01, 0.15, 0.07 | front_modern/bluestone + front_modern/alu | 0.12 | 5 | 22.5 |
| -0.94, 2.48, 0.06 | front_modern/alu + front_modern/rubber | 0.08 | 4 | 90 |
| 0.94, 2.48, 0.06 | front_modern/alu + front_modern/rubber | 0.08 | 4 | 90 |
| -0.94, 2.48, 0.05 | front_modern/alu + front_modern/alu | 0.1 | 2 | 22.5 |
| -1.01, 1.48, 0.01 | front_modern/alu + front_modern/alu | 2.4 | 2 | 22.5 |
| -1.01, 2.42, 0.07 | front_modern/alu + front_modern/alu | 2.4 | 2 | 22.5 |
| 0.94, 2.48, 0.06 | front_modern/alu + front_modern/alu | 0.1 | 2 | 22.5 |
| 1.01, 2.42, 0.01 | front_modern/alu + front_modern/alu | 2.4 | 2 | 22.5 |
| 1.01, 1.48, 0.07 | front_modern/alu + front_modern/alu | 2.4 | 2 | 22.5 |

## backtoback (info, 85)

| at | parts | area |
|---|---|---|
| -0.01, 0.15, 0.02 | front_modern/bluestone + front_modern/bluestone | 0.03411 |
| -0.78, 0.15, 0.03 | front_modern/bluestone + front_modern/bluestone | 0.03103 |
| -1.02, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0.00009 |
| -1.00, 0.15, 0.04 | front_modern/bluestone + front_modern/alu | 0.00012 |
| -1.00, 0.15, 0.05 | front_modern/bluestone + front_modern/alu | 0.0001 |
| 0.68, 0.15, 0.05 | front_modern/bluestone + front_modern/bluestone | 0.03955 |
| -0.13, 0.15, 0.06 | front_modern/bluestone + front_modern/bluestone | 0.02559 |
| 1.02, 0.15, 0.01 | front_modern/bluestone + front_modern/alu | 0.00009 |
| 1.00, 0.15, 0.04 | front_modern/bluestone + front_modern/alu | 0.00012 |
| 1.00, 0.15, 0.05 | front_modern/bluestone + front_modern/alu | 0.0001 |
| -0.96, 0.17, 0.04 | front_modern/bluestone + front_modern/alu | 0.00253 |
| -0.99, 0.17, 0.04 | front_modern/bluestone + front_modern/alu | 0.00149 |
| 0.97, 0.17, 0.01 | front_modern/bluestone + front_modern/alu | 0.00014 |
| -0.95, 0.17, 0.08 | front_modern/bluestone + front_modern/alu | 0.00005 |
| -0.98, 0.17, 0.08 | front_modern/bluestone + front_modern/alu | 0.00009 |
| 0.98, 0.17, 0.04 | front_modern/bluestone + front_modern/alu | 0.00244 |
| 0.95, 0.17, 0.04 | front_modern/bluestone + front_modern/alu | 0.00157 |
| -1.00, 2.49, 0.01 | front_modern/alu + front_modern/alu | 0.00051 |
| -1.00, 2.46, 0.01 | front_modern/alu + front_modern/alu | 0.00004 |
| -1.00, 1.68, 0.08 | front_modern/alu + front_modern/alu | 0.00873 |
| -1.00, 1.64, 0.08 | front_modern/alu + front_modern/alu | 0.00545 |
| -1.00, 2.22, 0.04 | front_modern/alu + front_modern/alu | 0.03405 |
| -1.00, 1.89, 0.07 | front_modern/alu + front_modern/alu | 0.02026 |
| -1.00, 1.79, 0.01 | front_modern/alu + front_modern/alu | 0.00675 |
| -1.00, 1.11, 0.01 | front_modern/alu + front_modern/alu | 0.00924 |
| -1.00, 0.50, 0.08 | front_modern/alu + front_modern/alu | 0.00077 |
| -1.00, 0.46, 0.08 | front_modern/alu + front_modern/alu | 0.00396 |
| -1.00, 1.04, 0.02 | front_modern/alu + front_modern/alu | 0.03597 |
| -1.00, 0.70, 0.05 | front_modern/alu + front_modern/alu | 0.04919 |
| -0.94, 2.52, 0.08 | front_modern/alu + front_modern/alu | 0.00275 |
| -0.94, 2.50, 0.05 | front_modern/alu + front_modern/alu | 0.00281 |
| -0.94, 2.48, 0.08 | front_modern/alu + front_modern/rubber | 0.00015 |
| -0.94, 2.47, 0.07 | front_modern/alu + front_modern/rubber | 0.00015 |
| -0.94, 2.51, 0.11 | front_modern/alu + front_modern/alu | 0.00006 |
| -1.00, 1.48, 0.01 | front_modern/alu + front_modern/alu | 0.00474 |
| -1.00, 0.81, 0.01 | front_modern/alu + front_modern/alu | 0.00431 |
| -1.01, 0.32, 0.01 | front_modern/alu + front_modern/alu | 0.00005 |
| -1.00, 0.21, 0.01 | front_modern/alu + front_modern/alu | 0.00048 |
| -1.02, 2.55, 0.01 | front_modern/alu + front_modern/alu | 0.00006 |
| -1.03, 2.55, 0.08 | front_modern/alu + front_modern/alu | 0.00014 |

(45 more in the JSON)


Nodes: front_modern. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
