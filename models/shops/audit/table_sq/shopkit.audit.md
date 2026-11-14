# Mesh audit: shopkit.glb

796 triangles, 416 welded vertices, 0 open edges, 0 rays, 50 ms.

**40 blocking**, 136 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| streak | block | 32 |
| bentflat | block | 8 |
| sliver | warn | 136 |
| seam | info | 5 |
| backtoback | info | 12 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## streak (block, 32)

| at | part | why | spread | aspect | longest |
|---|---|---|---|---|---|
| 0.00, 0.48, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.01, 0.28, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.01, 0.48, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.00, 0.28, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.01, 0.48, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.02, 0.28, -0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.02, 0.48, -0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.28, -0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.48, -0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.28, -0.00 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.48, 0.00 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.28, 0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.03, 0.48, 0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.02, 0.28, 0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.02, 0.48, 0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.01, 0.28, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.01, 0.48, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| 0.00, 0.28, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.00, 0.48, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.01, 0.28, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.01, 0.48, 0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.02, 0.28, 0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.02, 0.48, 0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.28, 0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.48, 0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.28, 0.00 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.48, -0.00 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.28, -0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.03, 0.48, -0.01 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.02, 0.28, -0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.02, 0.48, -0.02 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |
| -0.01, 0.28, -0.03 | table_sq/cast_iron | stretched triangle with diverging corner normals | 32 | 54 | 0.63 |

## bentflat (block, 8)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.12, 0.71, -0.12 | table_sq/table_top | 14.7 | 0.2394 | 0.48 |
| -0.12, 0.71, 0.12 | table_sq/table_top | 14.7 | 0.2394 | 0.48 |
| -0.12, 0.73, -0.12 | table_sq/table_top | 14.7 | 0.2394 | 0.48 |
| 0.12, 0.73, 0.12 | table_sq/table_top | 14.7 | 0.2394 | 0.48 |
| 0.11, 0.69, -0.11 | table_sq/cast_iron | 14.7 | 0.2126 | 0.43 |
| -0.11, 0.69, 0.11 | table_sq/cast_iron | 14.7 | 0.2126 | 0.43 |
| -0.11, 0.71, -0.11 | table_sq/cast_iron | 14.7 | 0.2126 | 0.43 |
| 0.11, 0.71, 0.11 | table_sq/cast_iron | 14.7 | 0.2126 | 0.43 |

## sliver (warn, 136)

| at | part | aspect | longest |
|---|---|---|---|
| -0.35, 0.71, 0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.72, -0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.72, 0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.72, -0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.73, -0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.73, 0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.73, -0.12 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.73, 0.12 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.71, -0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.72, -0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.72, -0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.72, -0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.73, -0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.73, -0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.73, -0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.73, -0.35 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.71, -0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.72, 0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.72, -0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.72, 0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.73, 0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.73, -0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.73, 0.12 | table_sq/table_top | 226 | 0.692 |
| 0.35, 0.73, -0.12 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.71, 0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.72, 0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.72, 0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.72, 0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.73, 0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.73, 0.35 | table_sq/table_top | 226 | 0.692 |
| -0.12, 0.73, 0.35 | table_sq/table_top | 226 | 0.692 |
| 0.12, 0.73, 0.35 | table_sq/table_top | 226 | 0.692 |
| -0.35, 0.73, 0.12 | table_sq/table_top | 58 | 0.692 |
| -0.35, 0.72, -0.12 | table_sq/table_top | 58 | 0.692 |
| 0.12, 0.73, 0.35 | table_sq/table_top | 58 | 0.692 |
| -0.12, 0.72, 0.35 | table_sq/table_top | 58 | 0.692 |
| -0.12, 0.73, -0.35 | table_sq/table_top | 58 | 0.692 |
| 0.12, 0.72, -0.35 | table_sq/table_top | 58 | 0.692 |
| 0.35, 0.73, -0.12 | table_sq/table_top | 58 | 0.692 |
| 0.35, 0.72, 0.12 | table_sq/table_top | 58 | 0.692 |

(96 more in the JSON)

## seam (info, 5)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -0.03, 0.01, -0.00 | table_sq/cast_iron + table_sq/cast_iron | 0.32 | 68 | 67.5 |
| 0.01, 0.69, -0.03 | table_sq/cast_iron + table_sq/cast_iron | 0.19 | 32 | 90 |
| -0.23, 0.01, 0.20 | table_sq/cast_iron + table_sq/rubber | 0.12 | 19 | 22.5 |
| 0.20, 0.01, -0.23 | table_sq/cast_iron + table_sq/rubber | 0.12 | 19 | 22.5 |
| 0.00, 0.71, -0.33 | table_sq/table_top + table_sq/cast_iron | 2.61 | 4 | 22.5 |

## backtoback (info, 12)

| at | parts | area |
|---|---|---|
| -0.08, 0.71, -0.24 | table_sq/table_top + table_sq/cast_iron | 0.10628 |
| 0.24, 0.71, 0.08 | table_sq/table_top + table_sq/cast_iron | 0.10628 |
| -0.24, 0.71, -0.08 | table_sq/table_top + table_sq/cast_iron | 0.10628 |
| 0.08, 0.71, 0.24 | table_sq/table_top + table_sq/cast_iron | 0.10628 |
| 0.20, 0.01, -0.22 | table_sq/cast_iron + table_sq/rubber | 0.00009 |
| 0.19, 0.01, -0.20 | table_sq/cast_iron + table_sq/rubber | 0.0002 |
| 0.22, 0.01, -0.20 | table_sq/cast_iron + table_sq/rubber | 0.00012 |
| 0.20, 0.01, -0.20 | table_sq/cast_iron + table_sq/rubber | 0.00056 |
| -0.20, 0.01, 0.19 | table_sq/cast_iron + table_sq/rubber | 0.00017 |
| -0.22, 0.01, 0.20 | table_sq/cast_iron + table_sq/rubber | 0.00005 |
| -0.20, 0.01, 0.21 | table_sq/cast_iron + table_sq/rubber | 0.00016 |
| -0.21, 0.01, 0.20 | table_sq/cast_iron + table_sq/rubber | 0.00059 |


Nodes: table_sq. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
