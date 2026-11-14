# Mesh audit: shopkit.glb

1,340 triangles, 688 welded vertices, 0 open edges, 0 rays, 95 ms.

**40 blocking**, 232 warnings. NOT CLEAN.

| check | severity | count |
|---|---|---|
| streak | block | 32 |
| bentflat | block | 8 |
| sliver | warn | 228 |
| nonmanifold | warn | 4 |
| seam | info | 13 |
| backtoback | info | 32 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## streak (block, 32)

| at | part | why | spread | aspect | longest |
|---|---|---|---|---|---|
| 0.34, 1.42, 0.19 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 0.98, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 1.42, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 0.98, 0.19 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 1.42, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 0.98, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 1.42, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 0.98, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 1.42, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.36, 0.98, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.36, 1.42, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 0.98, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 1.42, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 0.98, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 1.42, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.35, 0.98, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 1.42, 0.23 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 0.98, 0.23 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 1.42, 0.23 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.34, 0.98, 0.23 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 1.42, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 0.98, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 1.42, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 0.98, 0.22 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 1.42, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.32, 0.98, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.32, 1.42, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 0.98, 0.21 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 1.42, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 0.98, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 1.42, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |
| 0.33, 0.98, 0.20 | door_modern/steel | stretched triangle with diverging corner normals | 32 | 206 | 1.29 |

## bentflat (block, 8)

| at | part | deg | area | region_m2 |
|---|---|---|---|---|
| 0.20, -0.30, 0.10 | door_modern/bluestone | 14.7 | 0.1711 | 0.34 |
| -0.20, -0.30, 0.20 | door_modern/bluestone | 14.7 | 0.1711 | 0.34 |
| 0.20, -0.06, 0.30 | door_modern/bluestone | 14.7 | 0.2067 | 0.41 |
| -0.20, -0.18, 0.30 | door_modern/bluestone | 14.7 | 0.2067 | 0.41 |
| -0.20, 0.06, 0.10 | door_modern/bluestone | 14.7 | 0.1711 | 0.34 |
| 0.20, 0.06, 0.20 | door_modern/bluestone | 14.7 | 0.1711 | 0.34 |
| -0.20, -0.06, 0.00 | door_modern/bluestone | 14.7 | 0.2067 | 0.41 |
| 0.20, -0.18, 0.00 | door_modern/bluestone | 14.7 | 0.2067 | 0.41 |

## sliver (warn, 228)

| at | part | aspect | longest |
|---|---|---|---|
| -0.59, -0.30, 0.20 | door_modern/bluestone | 63 | 0.288 |
| -0.60, -0.30, 0.10 | door_modern/bluestone | 63 | 0.288 |
| -0.60, -0.30, 0.20 | door_modern/bluestone | 63 | 0.288 |
| -0.60, -0.29, 0.10 | door_modern/bluestone | 63 | 0.288 |
| -0.59, -0.06, 0.30 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.18, 0.30 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.06, 0.30 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.18, 0.29 | door_modern/bluestone | 76 | 0.348 |
| -0.59, 0.06, 0.10 | door_modern/bluestone | 63 | 0.288 |
| -0.60, 0.06, 0.20 | door_modern/bluestone | 63 | 0.288 |
| -0.60, 0.06, 0.10 | door_modern/bluestone | 63 | 0.288 |
| -0.60, 0.06, 0.20 | door_modern/bluestone | 63 | 0.288 |
| -0.59, -0.18, 0.00 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.06, 0.00 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.18, 0.00 | door_modern/bluestone | 76 | 0.348 |
| -0.60, -0.06, 0.01 | door_modern/bluestone | 76 | 0.348 |
| -0.20, -0.30, 0.01 | door_modern/bluestone | 259 | 1.188 |
| 0.20, -0.30, 0.00 | door_modern/bluestone | 259 | 1.188 |
| -0.20, -0.30, 0.00 | door_modern/bluestone | 259 | 1.188 |
| 0.20, -0.29, 0.00 | door_modern/bluestone | 259 | 1.188 |
| 0.20, 0.06, 0.01 | door_modern/bluestone | 259 | 1.188 |
| -0.20, 0.06, 0.00 | door_modern/bluestone | 259 | 1.188 |
| 0.20, 0.06, 0.00 | door_modern/bluestone | 259 | 1.188 |
| -0.20, 0.06, 0.00 | door_modern/bluestone | 259 | 1.188 |
| 0.60, -0.18, 0.01 | door_modern/bluestone | 76 | 0.348 |
| 0.60, -0.06, 0.00 | door_modern/bluestone | 76 | 0.348 |
| 0.60, -0.18, 0.00 | door_modern/bluestone | 76 | 0.348 |
| 0.59, -0.06, 0.00 | door_modern/bluestone | 76 | 0.348 |
| 0.59, -0.30, 0.10 | door_modern/bluestone | 63 | 0.288 |
| 0.60, -0.30, 0.20 | door_modern/bluestone | 63 | 0.288 |
| 0.60, -0.30, 0.10 | door_modern/bluestone | 63 | 0.288 |
| 0.60, -0.29, 0.20 | door_modern/bluestone | 63 | 0.288 |
| 0.59, 0.06, 0.20 | door_modern/bluestone | 63 | 0.288 |
| 0.60, 0.06, 0.10 | door_modern/bluestone | 63 | 0.288 |
| 0.60, 0.06, 0.20 | door_modern/bluestone | 63 | 0.288 |
| 0.60, 0.06, 0.10 | door_modern/bluestone | 63 | 0.288 |
| 0.59, -0.18, 0.30 | door_modern/bluestone | 76 | 0.348 |
| 0.60, -0.06, 0.30 | door_modern/bluestone | 76 | 0.348 |
| 0.60, -0.18, 0.30 | door_modern/bluestone | 76 | 0.348 |
| 0.60, -0.06, 0.29 | door_modern/bluestone | 76 | 0.348 |

(188 more in the JSON)

## nonmanifold (warn, 4)

| at | part | uses |
|---|---|---|
| -0.41, 0.08, 0.12 | door_modern/alu | 4 |
| -0.41, 2.23, 0.12 | door_modern/alu | 4 |
| 0.41, 0.08, 0.12 | door_modern/alu | 4 |
| 0.41, 2.23, 0.12 | door_modern/alu | 4 |

## seam (info, 13)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.34, 0.76, 0.19 | door_modern/steel + door_modern/steel | 0.06 | 30 | 56.2 |
| 0.34, 1.66, 0.19 | door_modern/steel + door_modern/steel | 0.06 | 30 | 56.2 |
| -0.50, 2.27, 0.00 | door_modern/alu + door_modern/alu | 0.53 | 10 | 22.5 |
| 0.50, 2.27, 0.11 | door_modern/alu + door_modern/alu | 0.53 | 10 | 22.5 |
| 0.02, 0.06, 0.01 | door_modern/bluestone + door_modern/steel | 2.2 | 7 | 22.5 |
| 0.53, 0.06, 0.01 | door_modern/bluestone + door_modern/alu | 0.3 | 7 | 22.5 |
| -0.50, 0.07, 0.00 | door_modern/steel + door_modern/alu | 0.23 | 7 | 22.5 |
| 0.50, 0.07, 0.11 | door_modern/steel + door_modern/alu | 0.23 | 7 | 22.5 |
| -0.53, 0.06, 0.01 | door_modern/bluestone + door_modern/alu | 0.3 | 5 | 22.5 |
| -0.41, 0.20, 0.09 | door_modern/alu + door_modern/alu | 0.04 | 2 | 22.5 |
| -0.41, 2.16, 0.11 | door_modern/alu + door_modern/alu | 0.04 | 2 | 22.5 |
| 0.41, 0.20, 0.14 | door_modern/alu + door_modern/alu | 0.04 | 2 | 22.5 |
| 0.41, 2.16, 0.12 | door_modern/alu + door_modern/alu | 0.04 | 2 | 22.5 |

## backtoback (info, 32)

| at | parts | area |
|---|---|---|
| 0.20, 0.06, 0.03 | door_modern/bluestone + door_modern/steel | 0.04 |
| -0.20, 0.06, 0.06 | door_modern/bluestone + door_modern/steel | 0.04881 |
| -0.52, 0.06, 0.04 | door_modern/bluestone + door_modern/alu | 0.0024 |
| -0.54, 0.06, 0.06 | door_modern/bluestone + door_modern/alu | 0.00255 |
| 0.53, 0.06, 0.01 | door_modern/bluestone + door_modern/alu | 0.00066 |
| 0.51, 0.06, 0.02 | door_modern/bluestone + door_modern/alu | 0.00013 |
| 0.42, 0.06, 0.07 | door_modern/bluestone + door_modern/steel | 0.00888 |
| 0.32, 0.06, 0.10 | door_modern/bluestone + door_modern/steel | 0.0039 |
| 0.54, 0.06, 0.05 | door_modern/bluestone + door_modern/alu | 0.00174 |
| 0.52, 0.06, 0.07 | door_modern/bluestone + door_modern/alu | 0.00242 |
| -0.50, 0.07, 0.06 | door_modern/steel + door_modern/alu | 0.00057 |
| -0.50, 0.07, 0.04 | door_modern/steel + door_modern/alu | 0.00047 |
| 0.50, 0.07, 0.05 | door_modern/steel + door_modern/alu | 0.00057 |
| 0.50, 0.07, 0.07 | door_modern/steel + door_modern/alu | 0.00047 |
| -0.50, 2.28, 0.07 | door_modern/alu + door_modern/alu | 0.00235 |
| -0.50, 2.26, 0.05 | door_modern/alu + door_modern/alu | 0.00278 |
| -0.50, 2.27, 0.10 | door_modern/alu + door_modern/alu | 0.00046 |
| 0.50, 2.28, 0.04 | door_modern/alu + door_modern/alu | 0.00235 |
| 0.50, 2.26, 0.06 | door_modern/alu + door_modern/alu | 0.00278 |
| 0.50, 2.27, 0.01 | door_modern/alu + door_modern/alu | 0.00046 |
| -0.41, 0.14, 0.09 | door_modern/alu + door_modern/alu | 0.00013 |
| -0.41, 2.21, 0.13 | door_modern/alu + door_modern/alu | 0.00137 |
| -0.41, 2.18, 0.11 | door_modern/alu + door_modern/alu | 0.00141 |
| -0.41, 0.17, 0.12 | door_modern/alu + door_modern/alu | 0.0025 |
| -0.41, 0.11, 0.10 | door_modern/alu + door_modern/alu | 0.00238 |
| -0.41, 2.20, 0.14 | door_modern/alu + door_modern/alu | 0.00004 |
| 0.41, 0.14, 0.14 | door_modern/alu + door_modern/alu | 0.00013 |
| 0.41, 2.21, 0.10 | door_modern/alu + door_modern/alu | 0.00137 |
| 0.41, 2.18, 0.12 | door_modern/alu + door_modern/alu | 0.00141 |
| 0.41, 0.17, 0.11 | door_modern/alu + door_modern/alu | 0.0025 |
| 0.41, 0.11, 0.13 | door_modern/alu + door_modern/alu | 0.00238 |
| 0.41, 2.20, 0.09 | door_modern/alu + door_modern/alu | 0.00004 |


Nodes: door_modern. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
