# Mesh audit: pump lod1

852 triangles, 464 welded vertices, 0 open edges, 0 rays, 28 ms.

**0 blocking**, 126 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 126 |
| seam | info | 20 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 126)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.07, -0.55 | pump.lod1 | 43 | 4.321 |
| 0.72, 0.11, -0.55 | pump.lod1 | 43 | 4.321 |
| 0.72, 0.07, 0.55 | pump.lod1 | 43 | 4.321 |
| -0.72, 0.11, 0.55 | pump.lod1 | 43 | 4.321 |
| 0.72, 0.03, -0.54 | pump.lod1 | 76 | 4.32 |
| -0.72, 0.01, -0.52 | pump.lod1 | 76 | 4.32 |
| 0.72, 0.01, 0.52 | pump.lod1 | 76 | 4.32 |
| -0.72, 0.03, 0.54 | pump.lod1 | 76 | 4.32 |
| 0.72, 0.17, -0.52 | pump.lod1 | 76 | 4.32 |
| -0.72, 0.15, -0.54 | pump.lod1 | 76 | 4.32 |
| 0.72, 0.15, 0.54 | pump.lod1 | 76 | 4.32 |
| -0.72, 0.17, 0.52 | pump.lod1 | 76 | 4.32 |
| -2.13, 0.19, 0.16 | pump.lod1 | 86 | 0.941 |
| -2.13, 0.19, -0.16 | pump.lod1 | 86 | 0.941 |
| -0.71, 0.19, -0.47 | pump.lod1 | 386 | 4.241 |
| 0.71, 0.19, -0.47 | pump.lod1 | 386 | 4.241 |
| 2.13, 0.19, -0.16 | pump.lod1 | 86 | 0.941 |
| 2.13, 0.19, 0.16 | pump.lod1 | 86 | 0.941 |
| 0.71, 0.19, 0.47 | pump.lod1 | 386 | 4.241 |
| -0.71, 0.19, 0.47 | pump.lod1 | 386 | 4.241 |
| -2.12, 0.18, 0.16 | pump.lod1 | 148 | 0.941 |
| -2.12, 0.18, -0.16 | pump.lod1 | 148 | 0.941 |
| 0.71, 0.18, -0.47 | pump.lod1 | 666 | 4.241 |
| -0.71, 0.18, -0.47 | pump.lod1 | 666 | 4.241 |
| -2.12, 0.20, 0.16 | pump.lod1 | 148 | 0.941 |
| -2.12, 0.20, -0.16 | pump.lod1 | 148 | 0.941 |
| 0.71, 0.18, 0.47 | pump.lod1 | 666 | 4.241 |
| -0.71, 0.18, 0.47 | pump.lod1 | 666 | 4.241 |
| 2.12, 0.18, 0.16 | pump.lod1 | 148 | 0.941 |
| 2.12, 0.18, -0.16 | pump.lod1 | 148 | 0.941 |
| 0.71, 0.20, -0.47 | pump.lod1 | 666 | 4.241 |
| -0.71, 0.20, -0.47 | pump.lod1 | 666 | 4.241 |
| 2.12, 0.20, 0.16 | pump.lod1 | 148 | 0.941 |
| 2.12, 0.20, -0.16 | pump.lod1 | 148 | 0.941 |
| 0.71, 0.20, 0.47 | pump.lod1 | 666 | 4.241 |
| -0.71, 0.20, 0.47 | pump.lod1 | 666 | 4.241 |
| -0.10, 1.30, -0.26 | pump.lod1 | 51 | 0.612 |
| 0.10, 1.30, -0.26 | pump.lod1 | 51 | 0.612 |
| -0.10, 1.60, -0.26 | pump.lod1 | 51 | 0.612 |
| 0.10, 1.60, -0.26 | pump.lod1 | 51 | 0.612 |

(86 more in the JSON)

## seam (info, 20)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.76, 0.18, -0.04 | pump.lod1 + pump.lod1 | 0.87 | 64 | 90 |
| 1.64, 0.18, -0.04 | pump.lod1 + pump.lod1 | 0.87 | 54 | 89.7 |
| -1.76, 0.18, -0.04 | pump.lod1 + pump.lod1 | 0.44 | 32 | 90 |
| 1.64, 0.18, -0.04 | pump.lod1 + pump.lod1 | 0.44 | 27 | 89.7 |
| 0.20, 0.37, -0.25 | pump.lod1 + pump.lod1 | 2.58 | 14 | 45 |
| -0.23, 1.30, -0.25 | pump.lod1 + pump.lod1 | 1.82 | 14 | 45 |
| 0.20, 0.37, 0.25 | pump.lod1 + pump.lod1 | 2.58 | 14 | 45 |
| 0.23, 1.30, 0.25 | pump.lod1 + pump.lod1 | 1.82 | 14 | 45 |
| -0.37, 1.06, -0.33 | pump.lod1 + pump.lod1 | 0.19 | 14 | 29.3 |
| -0.39, 1.06, 0.33 | pump.lod1 + pump.lod1 | 0.19 | 13 | 29.3 |
| 0.37, 1.06, 0.33 | pump.lod1 + pump.lod1 | 0.2 | 13 | 30.3 |
| 0.39, 1.06, -0.33 | pump.lod1 + pump.lod1 | 0.19 | 12 | 24.4 |
| 0.55, 1.85, 0.01 | pump.lod1 + pump.lod1 | 0.09 | 11 | 58.9 |
| -2.12, 0.18, 0.00 | pump.lod1 + pump.lod1 | 10.36 | 6 | 45 |
| -0.52, 0.20, 0.05 | pump.lod1 + pump.lod1 | 2.96 | 6 | 45 |
| -0.52, 1.90, 0.00 | pump.lod1 + pump.lod1 | 2.96 | 6 | 45 |
| -0.38, 1.01, -0.25 | pump.lod1 + pump.lod1 | 0.5 | 4 | 45 |
| 0.38, 1.01, -0.25 | pump.lod1 + pump.lod1 | 0.5 | 4 | 45 |
| 0.38, 1.01, 0.25 | pump.lod1 + pump.lod1 | 0.5 | 4 | 45 |
| -0.38, 1.01, 0.25 | pump.lod1 + pump.lod1 | 0.5 | 4 | 45 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| -1.56, 0.18, -0.12 | pump.lod1 + pump.lod1 | 1.02776 |
| -0.04, 0.18, 0.31 | pump.lod1 + pump.lod1 | 0.96763 |
| 0.04, 0.18, -0.31 | pump.lod1 + pump.lod1 | 0.96763 |
| 1.56, 0.18, 0.12 | pump.lod1 + pump.lod1 | 1.02776 |
| -0.35, 0.20, 0.04 | pump.lod1 + pump.lod1 | 0.0872 |
| 0.13, 0.20, 0.14 | pump.lod1 + pump.lod1 | 0.1416 |
| -0.13, 0.20, -0.14 | pump.lod1 + pump.lod1 | 0.1416 |
| 0.35, 0.20, -0.04 | pump.lod1 + pump.lod1 | 0.0872 |
| -0.36, 1.06, -0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| -0.40, 1.10, -0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| 0.40, 1.06, -0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| 0.36, 1.10, -0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| -0.38, 1.90, 0.06 | pump.lod1 + pump.lod1 | 0.11948 |
| 0.01, 1.90, 0.15 | pump.lod1 + pump.lod1 | 0.10932 |
| -0.01, 1.90, -0.15 | pump.lod1 + pump.lod1 | 0.10932 |
| 0.38, 1.90, -0.06 | pump.lod1 + pump.lod1 | 0.11948 |
| 0.36, 1.06, 0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| 0.40, 1.10, 0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| -0.40, 1.06, 0.25 | pump.lod1 + pump.lod1 | 0.0077 |
| -0.36, 1.10, 0.25 | pump.lod1 + pump.lod1 | 0.0077 |
