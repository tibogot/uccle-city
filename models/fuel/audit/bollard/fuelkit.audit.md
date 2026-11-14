# Mesh audit: fuelkit.glb

368 triangles, 181 welded vertices, 0 open edges, 0 rays, 37 ms.

**0 blocking**, 180 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 120 |
| sliver | warn | 40 |
| nonmanifold | warn | 20 |
| seam | info | 2 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 120)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.01, 0.82, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.01, 0.79, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.01, 0.92, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.01, 0.89, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.02, 0.80, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.02, 0.90, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.16 + 0 + -0.99 |
| 0.03, 0.82, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.03, 0.79, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.03, 0.92, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.03, 0.89, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.04, 0.80, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.04, 0.90, -0.06 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.45 + 0 + -0.89 |
| 0.05, 0.82, -0.05 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.05, 0.79, -0.05 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.05, 0.92, -0.05 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.05, 0.89, -0.05 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.06, 0.80, -0.04 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.06, 0.90, -0.04 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.71 + 0 + -0.71 |
| 0.06, 0.82, -0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.06, 0.79, -0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.06, 0.92, -0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.06, 0.89, -0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.07, 0.80, -0.02 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.07, 0.90, -0.02 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.89 + 0 + -0.45 |
| 0.07, 0.82, -0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.79, -0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.92, -0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.89, -0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.80, -0.00 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.90, -0.00 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.99 + 0 + -0.16 |
| 0.07, 0.82, 0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.07, 0.79, 0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.07, 0.92, 0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.07, 0.89, 0.01 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.07, 0.80, 0.02 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 1.4 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.07, 0.90, 0.02 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 0.7 | 0 | 120 | 0.92 | false | 0.99 + 0 + 0.16 |
| 0.06, 0.82, 0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.4 | 0 | 120 | 0.92 | false | 0.89 + 0 + 0.45 |
| 0.06, 0.79, 0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4 | 0 | 120 | 0.92 | false | 0.89 + 0 + 0.45 |
| 0.06, 0.92, 0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 5.5 | 0 | 120 | 0.92 | false | 0.89 + 0 + 0.45 |
| 0.06, 0.89, 0.03 | bollard/steel_galv + bollard/safety_yellow | 0.99 | 4.8 | 0 | 120 | 0.92 | false | 0.89 + 0 + 0.45 |

(80 more in the JSON)

## sliver (warn, 40)

| at | part | aspect | longest |
|---|---|---|---|
| 0.01, 0.53, -0.07 | bollard/steel_galv | 64 | 1.4 |
| 0.01, 0.07, -0.07 | bollard/steel_galv | 64 | 1.4 |
| 0.03, 0.53, -0.06 | bollard/steel_galv | 64 | 1.4 |
| 0.04, 0.07, -0.06 | bollard/steel_galv | 64 | 1.4 |
| 0.05, 0.53, -0.05 | bollard/steel_galv | 64 | 1.4 |
| 0.05, 0.07, -0.05 | bollard/steel_galv | 64 | 1.4 |
| 0.06, 0.53, -0.04 | bollard/steel_galv | 64 | 1.4 |
| 0.06, 0.07, -0.03 | bollard/steel_galv | 64 | 1.4 |
| 0.07, 0.53, -0.01 | bollard/steel_galv | 64 | 1.4 |
| 0.07, 0.07, -0.01 | bollard/steel_galv | 64 | 1.4 |
| 0.07, 0.53, 0.01 | bollard/steel_galv | 64 | 1.4 |
| 0.07, 0.07, 0.01 | bollard/steel_galv | 64 | 1.4 |
| 0.06, 0.53, 0.03 | bollard/steel_galv | 64 | 1.4 |
| 0.06, 0.07, 0.04 | bollard/steel_galv | 64 | 1.4 |
| 0.05, 0.53, 0.05 | bollard/steel_galv | 64 | 1.4 |
| 0.05, 0.07, 0.05 | bollard/steel_galv | 64 | 1.4 |
| 0.04, 0.53, 0.06 | bollard/steel_galv | 64 | 1.4 |
| 0.03, 0.07, 0.06 | bollard/steel_galv | 64 | 1.4 |
| 0.01, 0.53, 0.07 | bollard/steel_galv | 64 | 1.4 |
| 0.01, 0.07, 0.07 | bollard/steel_galv | 64 | 1.4 |
| -0.01, 0.53, 0.07 | bollard/steel_galv | 64 | 1.4 |
| -0.01, 0.07, 0.07 | bollard/steel_galv | 64 | 1.4 |
| -0.03, 0.53, 0.06 | bollard/steel_galv | 64 | 1.4 |
| -0.04, 0.07, 0.06 | bollard/steel_galv | 64 | 1.4 |
| -0.05, 0.53, 0.05 | bollard/steel_galv | 64 | 1.4 |
| -0.05, 0.07, 0.05 | bollard/steel_galv | 64 | 1.4 |
| -0.06, 0.53, 0.04 | bollard/steel_galv | 64 | 1.4 |
| -0.06, 0.07, 0.03 | bollard/steel_galv | 64 | 1.4 |
| -0.07, 0.53, 0.01 | bollard/steel_galv | 64 | 1.4 |
| -0.07, 0.07, 0.01 | bollard/steel_galv | 64 | 1.4 |
| -0.07, 0.53, -0.01 | bollard/steel_galv | 64 | 1.4 |
| -0.07, 0.07, -0.01 | bollard/steel_galv | 64 | 1.4 |
| -0.06, 0.53, -0.03 | bollard/steel_galv | 64 | 1.4 |
| -0.06, 0.07, -0.04 | bollard/steel_galv | 64 | 1.4 |
| -0.05, 0.53, -0.05 | bollard/steel_galv | 64 | 1.4 |
| -0.05, 0.07, -0.05 | bollard/steel_galv | 64 | 1.4 |
| -0.04, 0.53, -0.06 | bollard/steel_galv | 64 | 1.4 |
| -0.03, 0.07, -0.06 | bollard/steel_galv | 64 | 1.4 |
| -0.01, 0.53, -0.07 | bollard/steel_galv | 64 | 1.4 |
| -0.01, 0.07, -0.07 | bollard/steel_galv | 64 | 1.4 |

## nonmanifold (warn, 20)

| at | part | uses |
|---|---|---|
| 0.01, 1.00, -0.07 | bollard/steel_galv | 3 |
| 0.03, 1.00, -0.06 | bollard/steel_galv | 3 |
| 0.05, 1.00, -0.05 | bollard/steel_galv | 3 |
| 0.06, 1.00, -0.03 | bollard/steel_galv | 3 |
| 0.07, 1.00, -0.01 | bollard/steel_galv | 3 |
| 0.07, 1.00, 0.01 | bollard/steel_galv | 3 |
| 0.06, 1.00, 0.03 | bollard/steel_galv | 3 |
| 0.05, 1.00, 0.05 | bollard/steel_galv | 3 |
| 0.03, 1.00, 0.06 | bollard/steel_galv | 3 |
| 0.01, 1.00, 0.07 | bollard/steel_galv | 3 |
| -0.01, 1.00, 0.07 | bollard/steel_galv | 3 |
| -0.03, 1.00, 0.06 | bollard/steel_galv | 3 |
| -0.05, 1.00, 0.05 | bollard/steel_galv | 3 |
| -0.06, 1.00, 0.03 | bollard/steel_galv | 3 |
| -0.07, 1.00, 0.01 | bollard/steel_galv | 3 |
| -0.07, 1.00, -0.01 | bollard/steel_galv | 3 |
| -0.06, 1.00, -0.03 | bollard/steel_galv | 3 |
| -0.05, 1.00, -0.05 | bollard/steel_galv | 3 |
| -0.01, 1.00, -0.07 | bollard/steel_galv | 3 |
| -0.03, 1.00, -0.06 | bollard/steel_galv | 3 |

## seam (info, 2)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 0.01, 0.83, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.88 | 148 | 90 |
| 0.01, 0.93, -0.07 | bollard/steel_galv + bollard/safety_yellow | 0.88 | 148 | 90 |


Nodes: bollard. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
