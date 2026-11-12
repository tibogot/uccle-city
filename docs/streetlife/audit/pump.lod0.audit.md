# Mesh audit: pump lod0

1,712 triangles, 894 welded vertices, 0 open edges, 0 rays, 83 ms.

**0 blocking**, 124 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 124 |
| seam | info | 20 |
| backtoback | info | 20 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 124)

| at | part | aspect | longest |
|---|---|---|---|
| -0.72, 0.07, -0.55 | pump.lod0 | 43 | 4.321 |
| 0.72, 0.11, -0.55 | pump.lod0 | 43 | 4.321 |
| 0.72, 0.07, 0.55 | pump.lod0 | 43 | 4.321 |
| -0.72, 0.11, 0.55 | pump.lod0 | 43 | 4.321 |
| 0.72, 0.03, -0.54 | pump.lod0 | 76 | 4.32 |
| -0.72, 0.01, -0.52 | pump.lod0 | 76 | 4.32 |
| 0.72, 0.01, 0.52 | pump.lod0 | 76 | 4.32 |
| -0.72, 0.03, 0.54 | pump.lod0 | 76 | 4.32 |
| 0.72, 0.17, -0.52 | pump.lod0 | 76 | 4.32 |
| -0.72, 0.15, -0.54 | pump.lod0 | 76 | 4.32 |
| 0.72, 0.15, 0.54 | pump.lod0 | 76 | 4.32 |
| -0.72, 0.17, 0.52 | pump.lod0 | 76 | 4.32 |
| -2.13, 0.19, 0.16 | pump.lod0 | 86 | 0.941 |
| -2.13, 0.19, -0.16 | pump.lod0 | 86 | 0.941 |
| -0.71, 0.19, -0.47 | pump.lod0 | 386 | 4.241 |
| 0.71, 0.19, -0.47 | pump.lod0 | 386 | 4.241 |
| 2.13, 0.19, -0.16 | pump.lod0 | 86 | 0.941 |
| 2.13, 0.19, 0.16 | pump.lod0 | 86 | 0.941 |
| 0.71, 0.19, 0.47 | pump.lod0 | 386 | 4.241 |
| -0.71, 0.19, 0.47 | pump.lod0 | 386 | 4.241 |
| -2.12, 0.18, 0.16 | pump.lod0 | 148 | 0.941 |
| -2.12, 0.18, -0.16 | pump.lod0 | 148 | 0.941 |
| 0.71, 0.18, -0.47 | pump.lod0 | 666 | 4.241 |
| -0.71, 0.18, -0.47 | pump.lod0 | 666 | 4.241 |
| -2.12, 0.20, 0.16 | pump.lod0 | 148 | 0.941 |
| -2.12, 0.20, -0.16 | pump.lod0 | 148 | 0.941 |
| 0.71, 0.18, 0.47 | pump.lod0 | 666 | 4.241 |
| -0.71, 0.18, 0.47 | pump.lod0 | 666 | 4.241 |
| 2.12, 0.18, 0.16 | pump.lod0 | 148 | 0.941 |
| 2.12, 0.18, -0.16 | pump.lod0 | 148 | 0.941 |
| 0.71, 0.20, -0.47 | pump.lod0 | 666 | 4.241 |
| -0.71, 0.20, -0.47 | pump.lod0 | 666 | 4.241 |
| 2.12, 0.20, 0.16 | pump.lod0 | 148 | 0.941 |
| 2.12, 0.20, -0.16 | pump.lod0 | 148 | 0.941 |
| 0.71, 0.20, 0.47 | pump.lod0 | 666 | 4.241 |
| -0.71, 0.20, 0.47 | pump.lod0 | 666 | 4.241 |
| -0.10, 1.30, -0.26 | pump.lod0 | 51 | 0.612 |
| 0.10, 1.30, -0.26 | pump.lod0 | 51 | 0.612 |
| -0.10, 1.60, -0.26 | pump.lod0 | 51 | 0.612 |
| 0.10, 1.60, -0.26 | pump.lod0 | 51 | 0.612 |

(84 more in the JSON)

## seam (info, 20)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.76, 0.18, -0.04 | pump.lod0 + pump.lod0 | 0.87 | 64 | 90 |
| 1.64, 0.18, -0.04 | pump.lod0 + pump.lod0 | 0.87 | 64 | 90 |
| -1.76, 0.18, -0.04 | pump.lod0 + pump.lod0 | 0.44 | 32 | 90 |
| 1.64, 0.18, -0.04 | pump.lod0 + pump.lod0 | 0.44 | 32 | 90 |
| 0.55, 1.85, 0.02 | pump.lod0 + pump.lod0 | 0.1 | 30 | 57.3 |
| -0.37, 1.06, -0.33 | pump.lod0 + pump.lod0 | 0.2 | 28 | 26.6 |
| 0.39, 1.06, -0.33 | pump.lod0 + pump.lod0 | 0.2 | 28 | 26.6 |
| -0.39, 1.06, 0.33 | pump.lod0 + pump.lod0 | 0.2 | 28 | 26.6 |
| 0.37, 1.06, 0.33 | pump.lod0 + pump.lod0 | 0.2 | 28 | 26.6 |
| 0.20, 0.37, -0.25 | pump.lod0 + pump.lod0 | 2.58 | 14 | 45 |
| -0.23, 1.30, -0.25 | pump.lod0 + pump.lod0 | 1.82 | 14 | 45 |
| 0.20, 0.37, 0.25 | pump.lod0 + pump.lod0 | 2.58 | 14 | 45 |
| 0.23, 1.30, 0.25 | pump.lod0 + pump.lod0 | 1.82 | 14 | 45 |
| -2.12, 0.18, 0.00 | pump.lod0 + pump.lod0 | 10.36 | 6 | 45 |
| -0.52, 0.20, 0.05 | pump.lod0 + pump.lod0 | 2.96 | 6 | 45 |
| -0.52, 1.90, 0.00 | pump.lod0 + pump.lod0 | 2.96 | 6 | 45 |
| -0.38, 1.01, -0.25 | pump.lod0 + pump.lod0 | 0.5 | 4 | 45 |
| 0.38, 1.01, -0.25 | pump.lod0 + pump.lod0 | 0.5 | 4 | 45 |
| 0.38, 1.01, 0.25 | pump.lod0 + pump.lod0 | 0.5 | 4 | 45 |
| -0.38, 1.01, 0.25 | pump.lod0 + pump.lod0 | 0.5 | 4 | 45 |

## backtoback (info, 20)

| at | parts | area |
|---|---|---|
| -1.56, 0.18, -0.12 | pump.lod0 + pump.lod0 | 1.02776 |
| -0.04, 0.18, 0.31 | pump.lod0 + pump.lod0 | 0.96763 |
| 0.04, 0.18, -0.31 | pump.lod0 + pump.lod0 | 0.96763 |
| 1.56, 0.18, 0.12 | pump.lod0 + pump.lod0 | 1.02776 |
| -0.35, 0.20, 0.04 | pump.lod0 + pump.lod0 | 0.0872 |
| 0.13, 0.20, 0.14 | pump.lod0 + pump.lod0 | 0.1416 |
| -0.13, 0.20, -0.14 | pump.lod0 + pump.lod0 | 0.1416 |
| 0.35, 0.20, -0.04 | pump.lod0 + pump.lod0 | 0.0872 |
| -0.36, 1.06, -0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| -0.40, 1.10, -0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| 0.40, 1.06, -0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| 0.36, 1.10, -0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| -0.38, 1.90, 0.06 | pump.lod0 + pump.lod0 | 0.11948 |
| 0.01, 1.90, 0.15 | pump.lod0 + pump.lod0 | 0.10932 |
| -0.01, 1.90, -0.15 | pump.lod0 + pump.lod0 | 0.10932 |
| 0.38, 1.90, -0.06 | pump.lod0 + pump.lod0 | 0.11948 |
| 0.36, 1.06, 0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| 0.40, 1.10, 0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| -0.40, 1.06, 0.25 | pump.lod0 + pump.lod0 | 0.0077 |
| -0.36, 1.10, 0.25 | pump.lod0 + pump.lod0 | 0.0077 |
