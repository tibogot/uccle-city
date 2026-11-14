# Mesh audit: fuelkit.glb

2,152 triangles, 1,128 welded vertices, 8 open edges, 2,944 rays, 121 ms.

**0 blocking**, 472 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 8 |
| sliver | warn | 464 |
| seam | info | 45 |
| backtoback | info | 40 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 8)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.67, 3.55, 4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1031.3 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.25, 3.61, 4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1868.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| 0.25, 3.44, 4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1868.7 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.67, 3.50, 4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1031.3 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -0.67, 3.55, -4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1031.3 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.25, 3.61, -4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1868.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| -0.25, 3.44, -4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1868.7 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |
| 0.67, 3.50, -4.05 | carwash/brand_primary + carwash__sign/sign | 2 | 1031.3 | 0 | 120 | 0.92 | false | 0 + 0 + -1 |

## sliver (warn, 464)

| at | part | aspect | longest |
|---|---|---|---|
| -2.69, 0.06, -1.36 | carwash/concrete | 533 | 8.16 |
| -2.69, 0.06, 1.36 | carwash/concrete | 533 | 8.16 |
| -2.70, 0.05, -1.36 | carwash/concrete | 533 | 8.16 |
| -2.70, 0.04, 1.36 | carwash/concrete | 533 | 8.16 |
| 0.89, 0.06, -4.08 | carwash/concrete | 350 | 5.36 |
| -0.89, 0.06, -4.09 | carwash/concrete | 350 | 5.36 |
| 0.89, 0.05, -4.10 | carwash/concrete | 350 | 5.36 |
| -0.89, 0.04, -4.10 | carwash/concrete | 350 | 5.36 |
| 2.69, 0.06, 1.36 | carwash/concrete | 533 | 8.16 |
| 2.69, 0.06, -1.36 | carwash/concrete | 533 | 8.16 |
| 2.70, 0.05, 1.36 | carwash/concrete | 533 | 8.16 |
| 2.70, 0.04, -1.36 | carwash/concrete | 533 | 8.16 |
| -0.89, 0.06, 4.08 | carwash/concrete | 350 | 5.36 |
| 0.89, 0.06, 4.09 | carwash/concrete | 350 | 5.36 |
| -0.89, 0.05, 4.10 | carwash/concrete | 350 | 5.36 |
| 0.89, 0.04, 4.10 | carwash/concrete | 350 | 5.36 |
| -2.49, 0.06, 1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 0.06, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 0.06, 1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 0.06, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.49, 2.25, 3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 1.16, 3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 2.25, 3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 1.16, 3.76 | carwash/canopy_white | 427 | 3.27 |
| -2.49, 3.34, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 3.34, 1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 3.34, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.50, 3.34, 1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.49, 1.16, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 2.25, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 1.16, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.50, 2.25, -3.76 | carwash/canopy_white | 427 | 3.27 |
| -2.30, 1.16, -3.76 | carwash/canopy_white | 427 | 3.27 |
| -2.30, 2.25, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.31, 1.16, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.31, 2.25, -3.77 | carwash/canopy_white | 427 | 3.27 |
| -2.31, 0.06, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.31, 0.06, 1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.30, 0.06, -1.25 | carwash/canopy_white | 983 | 7.52 |
| -2.30, 0.06, 1.25 | carwash/canopy_white | 983 | 7.52 |

(424 more in the JSON)

## seam (info, 45)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| -1.08, 2.20, -0.38 | carwash/brush_blue + carwash/brush_blue | 3.21 | 79 | 23.7 |
| 1.07, 2.16, 0.38 | carwash/brush_blue + carwash/brush_blue | 3.21 | 75 | 23.7 |
| -2.31, 3.34, 3.77 | carwash/canopy_white + carwash/trim_alu | 1.45 | 38 | 67.5 |
| 2.31, 3.34, -3.77 | carwash/canopy_white + carwash/trim_alu | 1.45 | 38 | 67.5 |
| -2.30, 3.34, -3.77 | carwash/canopy_white + carwash/trim_alu | 1.45 | 37 | 67.5 |
| 2.31, 3.34, 3.77 | carwash/canopy_white + carwash/trim_alu | 1.45 | 37 | 67.5 |
| -1.86, 3.00, -0.33 | carwash/dispenser_body + carwash/dispenser_body | 2.35 | 37 | 90 |
| 1.86, 3.00, -0.33 | carwash/dispenser_body + carwash/dispenser_body | 2.35 | 37 | 90 |
| -2.27, 2.95, 3.78 | carwash/trim_alu + carwash/trim_alu | 1.23 | 35 | 90 |
| -2.28, 2.95, -3.77 | carwash/trim_alu + carwash/trim_alu | 1.23 | 35 | 90 |
| 2.28, 2.95, 3.77 | carwash/trim_alu + carwash/trim_alu | 1.23 | 35 | 90 |
| 2.28, 2.95, -3.77 | carwash/trim_alu + carwash/trim_alu | 1.23 | 35 | 90 |
| -2.52, 3.35, -3.77 | carwash/trim_alu + carwash/brand_primary | 1.27 | 28 | 67.5 |
| 2.27, 3.35, 4.03 | carwash/trim_alu + carwash/brand_primary | 1.27 | 28 | 67.5 |
| -2.50, 0.06, -3.77 | carwash/concrete + carwash/canopy_white | 15.45 | 26 | 67.5 |
| 2.30, 0.06, -3.77 | carwash/concrete + carwash/canopy_white | 15.45 | 26 | 67.5 |
| -2.52, 3.35, 4.03 | carwash/trim_alu + carwash/brand_primary | 1.27 | 26 | 67.5 |
| 2.27, 3.35, -3.77 | carwash/trim_alu + carwash/brand_primary | 1.27 | 26 | 67.5 |
| -2.50, 1.50, 3.77 | carwash/canopy_white + carwash/brand_secondary | 15.67 | 24 | 67.5 |
| 2.50, 1.20, -3.76 | carwash/canopy_white + carwash/brand_secondary | 15.67 | 24 | 67.5 |
| -2.27, 3.34, 3.78 | carwash/trim_alu + carwash/soffit_white | 0.25 | 19 | 90 |
| -2.28, 3.34, -3.77 | carwash/trim_alu + carwash/soffit_white | 0.25 | 19 | 90 |
| 2.28, 3.34, 3.77 | carwash/trim_alu + carwash/soffit_white | 0.25 | 19 | 90 |
| 2.27, 3.34, -3.77 | carwash/trim_alu + carwash/soffit_white | 0.25 | 19 | 90 |
| -2.52, 0.06, 3.77 | carwash/concrete + carwash/trim_alu | 1.02 | 18 | 90 |
| 2.27, 0.06, -4.03 | carwash/concrete + carwash/trim_alu | 1.02 | 18 | 90 |
| -2.52, 0.06, -4.03 | carwash/concrete + carwash/trim_alu | 1.02 | 16 | 90 |
| 2.27, 0.06, 3.77 | carwash/concrete + carwash/trim_alu | 1.02 | 16 | 90 |
| -2.30, 3.35, -3.76 | carwash/brand_primary + carwash/soffit_white | 24.6 | 10 | 90 |
| -2.50, 1.50, -3.77 | carwash/brand_secondary + carwash/trim_alu | 0.61 | 8 | 90 |
| -2.50, 1.35, 3.77 | carwash/brand_secondary + carwash/trim_alu | 0.61 | 8 | 90 |
| 2.50, 1.50, -3.77 | carwash/brand_secondary + carwash/trim_alu | 0.61 | 8 | 90 |
| 2.50, 1.35, 3.77 | carwash/brand_secondary + carwash/trim_alu | 0.61 | 8 | 90 |
| 2.20, 3.34, 3.53 | carwash/trim_alu + carwash/soffit_white | 9.84 | 7 | 22.5 |
| 0.10, 3.34, -3.53 | carwash/trim_alu + carwash/soffit_white | 9.84 | 7 | 22.5 |
| -1.04, 0.06, 0.95 | carwash/concrete + carwash/steel_galv | 5.12 | 6 | 22.5 |
| 0.86, 0.06, -2.00 | carwash/concrete + carwash/steel_galv | 5.12 | 6 | 22.5 |
| -2.49, 1.91, 3.77 | carwash/canopy_white + carwash/trim_alu | 6.9 | 6 | 22.5 |
| -2.49, 3.14, -3.77 | carwash/canopy_white + carwash/trim_alu | 6.9 | 6 | 22.5 |
| 2.31, 1.91, 3.77 | carwash/canopy_white + carwash/trim_alu | 6.9 | 6 | 22.5 |

(5 more in the JSON)

## backtoback (info, 40)

| at | parts | area |
|---|---|---|
| -1.95, 0.06, -0.11 | carwash/concrete + carwash/dispenser_body | 0.0952 |
| -2.05, 0.06, 0.11 | carwash/concrete + carwash/dispenser_body | 0.0952 |
| -0.92, 0.06, -1.90 | carwash/concrete + carwash/steel_galv | 0.2142 |
| -0.98, 0.06, -1.10 | carwash/concrete + carwash/steel_galv | 0.2142 |
| -0.93, 0.06, 0.84 | carwash/concrete + carwash/steel_galv | 0.14955 |
| -1.01, 0.06, 1.11 | carwash/concrete + carwash/steel_galv | 0.05498 |
| 0.97, 0.06, -2.10 | carwash/concrete + carwash/steel_galv | 0.15922 |
| 0.89, 0.06, -1.82 | carwash/concrete + carwash/steel_galv | 0.06465 |
| -0.89, 0.06, 1.82 | carwash/concrete + carwash/steel_galv | 0.06465 |
| -0.97, 0.06, 2.10 | carwash/concrete + carwash/steel_galv | 0.15922 |
| 1.01, 0.06, -1.11 | carwash/concrete + carwash/steel_galv | 0.05498 |
| 0.93, 0.06, -0.84 | carwash/concrete + carwash/steel_galv | 0.14955 |
| 0.98, 0.06, 1.10 | carwash/concrete + carwash/steel_galv | 0.2142 |
| 0.92, 0.06, 1.90 | carwash/concrete + carwash/steel_galv | 0.2142 |
| 2.05, 0.06, -0.11 | carwash/concrete + carwash/dispenser_body | 0.0952 |
| 1.95, 0.06, 0.11 | carwash/concrete + carwash/dispenser_body | 0.0952 |
| -2.38, 2.83, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.16375 |
| -2.34, 1.57, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.13055 |
| -2.46, 1.85, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.12695 |
| -2.42, 0.58, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.16735 |
| -2.42, 2.83, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.16375 |
| -2.46, 1.57, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.13055 |
| -2.34, 1.85, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.12695 |
| -2.38, 0.58, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.16735 |
| 2.42, 2.83, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.16375 |
| 2.46, 1.57, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.13055 |
| 2.34, 1.85, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.12695 |
| 2.38, 0.58, 3.77 | carwash/canopy_white + carwash/trim_alu | 0.16735 |
| 2.38, 2.83, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.16375 |
| 2.34, 1.57, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.13055 |
| 2.46, 1.85, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.12695 |
| 2.42, 0.58, -3.77 | carwash/canopy_white + carwash/trim_alu | 0.16735 |
| 2.21, 3.34, 3.54 | carwash/trim_alu + carwash/soffit_white | 0.00241 |
| -0.50, 3.34, 3.66 | carwash/trim_alu + carwash/soffit_white | 0.77829 |
| 2.24, 3.34, 3.65 | carwash/trim_alu + carwash/soffit_white | 0.02818 |
| 0.77, 3.34, 3.75 | carwash/trim_alu + carwash/soffit_white | 0.66312 |
| -0.77, 3.34, -3.75 | carwash/trim_alu + carwash/soffit_white | 0.66312 |
| -2.24, 3.34, -3.65 | carwash/trim_alu + carwash/soffit_white | 0.02818 |
| 0.50, 3.34, -3.66 | carwash/trim_alu + carwash/soffit_white | 0.77829 |
| -2.21, 3.34, -3.54 | carwash/trim_alu + carwash/soffit_white | 0.00241 |


Nodes: carwash, carwash__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
