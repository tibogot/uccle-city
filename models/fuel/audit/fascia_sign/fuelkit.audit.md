# Mesh audit: fuelkit.glb

110 triangles, 60 welded vertices, 4 open edges, 2,368 rays, 18 ms.

**0 blocking**, 20 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| near | warn | 2 |
| sliver | warn | 18 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## near (warn, 2)

| at | parts | separation_mm | overlap_cm2 | angle_deg | maxDistance | need_mm | sameComponent | normal |
|---|---|---|---|---|---|---|---|---|
| 0.03, 0.19, 0.06 | fascia_sign/trim_alu + fascia_sign__sign/sign | 2 | 4264.4 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |
| -1.15, 0.07, 0.06 | fascia_sign/trim_alu + fascia_sign__sign/sign | 2 | 4527.6 | 0 | 120 | 0.92 | false | 0 + 0 + 1 |

## sliver (warn, 18)

| at | part | aspect | longest |
|---|---|---|---|
| -1.59, 0.10, 0.06 | fascia_sign/trim_alu | 99 | 0.604 |
| -1.60, 0.10, 0.06 | fascia_sign/trim_alu | 99 | 0.604 |
| -1.60, 0.10, 0.00 | fascia_sign/trim_alu | 99 | 0.604 |
| -1.60, 0.10, 0.01 | fascia_sign/trim_alu | 99 | 0.604 |
| 0.53, 0.31, 0.01 | fascia_sign/trim_alu | 520 | 3.184 |
| -0.53, 0.31, 0.00 | fascia_sign/trim_alu | 520 | 3.184 |
| 0.53, 0.31, 0.00 | fascia_sign/trim_alu | 520 | 3.184 |
| -0.53, 0.30, 0.00 | fascia_sign/trim_alu | 520 | 3.184 |
| 1.60, 0.10, 0.00 | fascia_sign/trim_alu | 99 | 0.604 |
| 1.59, 0.10, 0.00 | fascia_sign/trim_alu | 99 | 0.604 |
| 1.60, 0.10, 0.06 | fascia_sign/trim_alu | 99 | 0.604 |
| 1.60, 0.10, 0.05 | fascia_sign/trim_alu | 99 | 0.604 |
| -0.53, 0.31, 0.05 | fascia_sign/trim_alu | 520 | 3.184 |
| 0.53, 0.31, 0.06 | fascia_sign/trim_alu | 520 | 3.184 |
| -0.53, 0.31, 0.06 | fascia_sign/trim_alu | 520 | 3.184 |
| 0.53, 0.30, 0.06 | fascia_sign/trim_alu | 520 | 3.184 |
| -0.53, 0.31, 0.02 | fascia_sign/trim_alu | 72 | 3.184 |
| 0.53, 0.31, 0.04 | fascia_sign/trim_alu | 72 | 3.184 |


Nodes: fascia_sign, fascia_sign__sign. Distances: {}. Quantum 0.000 mm. Offset 0,0,0.
