# Mesh audit: shopkit.glb

2,484 triangles, 1,292 welded vertices, 0 open edges, 0 rays, 274 ms.

**179 blocking**, 496 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| coplanar | block | 15 |
| crossing | block | 20 |
| streak | block | 64 |
| bentflat | block | 80 |
| sliver | warn | 496 |
| seam | info | 110 |
| backtoback | info | 16 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## coplanar (block, 15)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| -0.02, 0.00, -0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.00, 0.00, -0.02 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.00, 0.00, 0.02 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| 0.02, 0.00, 0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + -1 + 0 |
| -0.00, 0.06, -0.02 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.02, 0.06, 0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.02, 0.06, -0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.00, 0.06, 0.02 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0 | 10.2 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.00, 2.58, -0.02 | parasol_sq/wood + parasol_sq/canvas | 0 | 2.1 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.02, 2.58, 0.01 | parasol_sq/wood + parasol_sq/canvas | 0 | 1.9 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.01, 2.58, 0.02 | parasol_sq/wood + parasol_sq/canvas | 0 | 2.1 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.00, 2.58, -0.01 | parasol_sq/wood + parasol_sq/canvas | 0 | 2.3 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.02, 2.58, -0.01 | parasol_sq/wood + parasol_sq/canvas | 0 | 2.4 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| -0.01, 2.58, -0.00 | parasol_sq/wood + parasol_sq/canvas | 0 | 3.5 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |
| 0.00, 2.58, 0.01 | parasol_sq/wood + parasol_sq/canvas | 0 | 5.1 | 0 | 120 | 0.92 | false | 0 + 1 + 0 |

## crossing (block, 20)

| at | parts | angle_deg | length_cm |
|---|---|---|---|
| 0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| 0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0 |
| -0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0 |
| -0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| 0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0 |
| -0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| -0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0 |
| 0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |
| 0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.4 |
| -0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 8.1 | 0.2 |

## streak (block, 64)

| at | part | why | spread | aspect | longest |
|---|---|---|---|---|---|
| 0.01, 0.09, -0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.01, -0.01, -0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.01, 0.09, -0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.01, -0.01, -0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.02, 0.09, -0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.03, -0.01, -0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.04, 0.09, -0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.04, -0.01, -0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.04, 0.09, -0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.05, -0.01, -0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.05, 0.09, 0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.05, -0.01, 0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.04, 0.09, 0.02 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.04, -0.01, 0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.03, 0.09, 0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.03, -0.01, 0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.01, 0.09, 0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| 0.01, -0.01, 0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.01, 0.09, 0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.01, -0.01, 0.05 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.02, 0.09, 0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.03, -0.01, 0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.04, 0.09, 0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.04, -0.01, 0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.04, 0.09, 0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.05, -0.01, 0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.05, 0.09, -0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.05, -0.01, -0.01 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.04, 0.09, -0.02 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.04, -0.01, -0.03 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| -0.03, 0.09, -0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 17 | 0.27 |
| -0.03, -0.01, -0.04 | parasol_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 12 | 0.27 |
| 0.00, 1.75, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| 0.01, 0.94, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| -0.01, 1.75, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| -0.00, 0.94, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| 0.01, 1.75, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| 0.01, 0.94, -0.02 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| 0.02, 1.75, -0.01 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |
| 0.02, 0.94, -0.01 | parasol_sq/wood | stretched triangle with diverging corner normals | 32 | 260 | 2.43 |

(24 more in the JSON)

## bentflat (block, 80)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| -0.87, 2.14, 1.08 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| -0.54, 2.19, 0.87 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| -0.33, 2.13, 1.08 | parasol_sq/canvas | 6.3 | 0.2194 | 0.33 |
| -0.11, 2.21, 0.87 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| 0.22, 2.14, 1.08 | parasol_sq/canvas | 6 | 0.2194 | 0.33 |
| 0.33, 2.19, 0.87 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| 0.76, 2.13, 1.08 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| 0.76, 2.21, 0.87 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| 1.08, 2.14, 0.87 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| 0.87, 2.19, 0.54 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| 1.08, 2.13, 0.33 | parasol_sq/canvas | 6.3 | 0.2194 | 0.33 |
| 0.87, 2.21, 0.11 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| 1.08, 2.14, -0.22 | parasol_sq/canvas | 6 | 0.2194 | 0.33 |
| 0.87, 2.19, -0.33 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| 1.08, 2.13, -0.76 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| 0.87, 2.21, -0.76 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| 0.87, 2.14, -1.08 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| 0.54, 2.19, -0.87 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| 0.33, 2.13, -1.08 | parasol_sq/canvas | 6.3 | 0.2194 | 0.33 |
| 0.11, 2.21, -0.87 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| -0.22, 2.14, -1.08 | parasol_sq/canvas | 6 | 0.2194 | 0.33 |
| -0.33, 2.19, -0.87 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| -0.76, 2.13, -1.08 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| -0.76, 2.21, -0.87 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| -1.08, 2.14, -0.87 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| -0.87, 2.19, -0.54 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| -1.08, 2.13, -0.33 | parasol_sq/canvas | 6.3 | 0.2194 | 0.33 |
| -0.87, 2.21, -0.11 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| -1.08, 2.14, 0.22 | parasol_sq/canvas | 6 | 0.2194 | 0.33 |
| -0.87, 2.19, 0.33 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| -1.08, 2.13, 0.76 | parasol_sq/canvas | 16.4 | 0.2241 | 0.34 |
| -0.87, 2.21, 0.76 | parasol_sq/canvas | 16.4 | 0.1121 | 0.34 |
| -0.54, 2.19, 0.86 | parasol_sq/canvas | 16.4 | 0.1116 | 0.34 |
| -0.87, 2.14, 1.08 | parasol_sq/canvas | 16.4 | 0.2236 | 0.34 |
| -0.11, 2.20, 0.86 | parasol_sq/canvas | 6.3 | 0.1097 | 0.33 |
| -0.33, 2.13, 1.08 | parasol_sq/canvas | 6.3 | 0.2195 | 0.33 |
| 0.33, 2.19, 0.86 | parasol_sq/canvas | 6.3 | 0.1098 | 0.33 |
| 0.22, 2.14, 1.08 | parasol_sq/canvas | 6 | 0.2195 | 0.33 |
| 0.76, 2.20, 0.86 | parasol_sq/canvas | 16.4 | 0.1114 | 0.34 |
| 0.76, 2.13, 1.08 | parasol_sq/canvas | 16.4 | 0.2238 | 0.34 |

(40 more in the JSON)

## sliver (warn, 496)

| at | part | aspect | longest |
|---|---|---|---|
| -0.13, 0.00, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.00, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.00, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.01, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.06, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.06, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.06, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.05, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.00, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.00, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.00, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.01, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.06, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.06, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.06, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.05, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.00, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.00, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.00, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.01, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.06, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.06, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.13, 0.06, -0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.08, 0.05, 0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.00, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.00, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.00, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.01, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.06, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.06, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.13, 0.06, 0.08 | parasol_sq/cast_iron | 144 | 0.884 |
| -0.08, 0.05, -0.13 | parasol_sq/cast_iron | 144 | 0.884 |
| 0.14, 0.06, -0.07 | parasol_sq/bluestone | 63 | 0.288 |
| 0.07, 0.06, -0.14 | parasol_sq/bluestone | 63 | 0.288 |
| 0.14, 0.06, -0.07 | parasol_sq/bluestone | 63 | 0.288 |
| 0.07, 0.07, -0.14 | parasol_sq/bluestone | 63 | 0.288 |
| 0.07, 0.11, -0.14 | parasol_sq/bluestone | 63 | 0.288 |
| 0.14, 0.11, -0.07 | parasol_sq/bluestone | 63 | 0.288 |
| 0.07, 0.11, -0.14 | parasol_sq/bluestone | 63 | 0.288 |
| 0.14, 0.10, -0.07 | parasol_sq/bluestone | 63 | 0.288 |

(456 more in the JSON)

## seam (info, 110)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.00, 1.70, -0.02 | parasol_sq/wood + parasol_sq/wood | 0.3 | 112 | 90 |
| -0.05, 0.00, 0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0.58 | 88 | 34 |
| -0.05, 0.00, -0.00 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0.58 | 88 | 34 |
| 0.00, 2.51, -0.04 | parasol_sq/wood + parasol_sq/canvas | 0.45 | 84 | 69 |
| 0.01, 2.51, -0.02 | parasol_sq/wood + parasol_sq/canvas | 0.31 | 80 | 69 |
| -0.03, 0.00, -0.01 | parasol_sq/cast_iron + parasol_sq/cast_iron | 0.81 | 76 | 22.5 |
| -1.30, 2.10, 1.30 | parasol_sq/canvas + parasol_sq/canvas | 5.23 | 68 | 15.6 |
| 1.30, 2.10, 1.29 | parasol_sq/canvas + parasol_sq/canvas | 5.23 | 68 | 15.6 |
| 1.29, 2.10, -1.30 | parasol_sq/canvas + parasol_sq/canvas | 5.23 | 68 | 15.6 |
| -1.30, 2.10, -1.30 | parasol_sq/canvas + parasol_sq/canvas | 5.23 | 68 | 15.6 |
| 0.02, 2.58, -0.01 | parasol_sq/wood + parasol_sq/canvas | 0.39 | 46 | 22.5 |
| 0.00, 2.48, -0.02 | parasol_sq/wood + parasol_sq/wood | 0.15 | 40 | 90 |
| 0.00, 0.18, -0.02 | parasol_sq/cast_iron + parasol_sq/wood | 0.15 | 36 | 90 |
| 0.01, 2.54, -0.02 | parasol_sq/wood + parasol_sq/canvas | 0.15 | 32 | 90 |
| 0.01, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 30 | 27 |
| -0.00, 1.78, -0.01 | parasol_sq/wood + parasol_sq/wood | 0.07 | 30 | 27 |
| -0.01, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 30 | 27 |
| 0.00, 1.78, 0.01 | parasol_sq/wood + parasol_sq/wood | 0.07 | 30 | 27 |
| 0.00, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 26 | 27 |
| -0.00, 1.78, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 26 | 27 |
| -0.00, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 26 | 27 |
| 0.00, 1.78, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.07 | 26 | 27 |
| 0.02, 2.45, -0.01 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| 0.01, 2.45, -0.01 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| -0.00, 2.45, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| -0.01, 2.45, -0.01 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| -0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| -0.01, 2.45, 0.01 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| 0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| 0.01, 2.45, 0.01 | parasol_sq/wood + parasol_sq/wood | 0.08 | 24 | 12.2 |
| -1.30, 1.96, -1.30 | parasol_sq/canvas + parasol_sq/canvas | 0.28 | 24 | 31.4 |
| 0.01, 2.46, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 17.6 |
| 0.00, 2.45, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 17.6 |
| 0.01, 2.45, -0.01 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 24.4 |
| -0.00, 2.45, -0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 24.4 |
| -0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 17.6 |
| -0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 24.4 |
| 0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 17.6 |
| 0.00, 2.45, 0.00 | parasol_sq/wood + parasol_sq/wood | 0.06 | 23 | 24.4 |
| -1.30, 1.96, 1.30 | parasol_sq/canvas + parasol_sq/canvas | 0.28 | 23 | 31.4 |

(70 more in the JSON)

## backtoback (info, 16)

| at | parts | area |
|---|---|---|
| -0.17, 0.06, 0.16 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00728 |
| -0.27, 0.06, 0.26 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00807 |
| 0.21, 0.06, -0.25 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00102 |
| 0.14, 0.06, -0.17 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00194 |
| -0.14, 0.06, 0.17 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00194 |
| -0.21, 0.06, 0.25 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00102 |
| 0.27, 0.06, -0.26 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00807 |
| 0.17, 0.06, -0.16 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00728 |
| -0.25, 0.06, -0.21 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00102 |
| -0.17, 0.06, -0.14 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00194 |
| 0.16, 0.06, 0.17 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00728 |
| 0.26, 0.06, 0.27 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00807 |
| -0.26, 0.06, -0.27 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00807 |
| -0.16, 0.06, -0.17 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00728 |
| 0.17, 0.06, 0.14 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00194 |
| 0.25, 0.06, 0.21 | parasol_sq/cast_iron + parasol_sq/bluestone | 0.00102 |


Nodes: parasol_sq. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
