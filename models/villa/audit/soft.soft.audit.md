# Mesh audit (before pack): soft.soft

95,346 triangles, 52,729 welded vertices, 7,820 open edges, 199,188 rays, 6950 ms.

**0 blocking**, 806 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| tjunction | warn | 14 |
| seam | info | 1032 |
| opening | info | 1439 |
| backtoback | info | 1166 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## tjunction (warn, 14)

| at | part | edge_m |
|---|---|---|
| 34.90, 119.32, -9.61 | Soft/plant | 0.012 |
| 34.90, 119.32, -9.59 | Soft/plant | 0.012 |
| 35.05, 120.19, -9.70 | Soft/plant | 0.022 |
| 35.05, 120.19, -9.70 | Soft/plant | 0.022 |
| 34.90, 119.32, -9.59 | Soft/plant | 0.012 |
| 34.90, 119.32, -9.61 | Soft/plant | 0.012 |
| 15.39, 118.88, -21.51 | Soft/plant | 0.012 |
| 15.40, 118.88, -21.49 | Soft/plant | 0.012 |
| 15.39, 118.88, -21.51 | Soft/plant | 0.012 |
| 15.40, 118.88, -21.49 | Soft/plant | 0.012 |
| 36.40, 122.76, -6.81 | Soft/plant | 0.012 |
| 36.40, 122.76, -6.79 | Soft/plant | 0.012 |
| 36.40, 122.76, -6.81 | Soft/plant | 0.012 |
| 36.40, 122.76, -6.79 | Soft/plant | 0.012 |

## seam (info, 1032)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 32.16, 123.36, -1.77 | Soft/props + Soft/props | 1.47 | 104 | 25.3 |
| 29.63, 123.36, 17.69 | Soft/props + Soft/props | 1.47 | 104 | 25.7 |
| 32.16, 123.36, -0.90 | Soft/props + Soft/props | 1.47 | 102 | 25.1 |
| 29.61, 123.36, 16.64 | Soft/props + Soft/props | 1.52 | 102 | 30.4 |
| 31.88, 122.49, -2.42 | Soft/props + Soft/props | 4.12 | 98 | 6.9 |
| 29.33, 122.49, 16.51 | Soft/props + Soft/props | 4.51 | 98 | 7.1 |
| 29.82, 118.42, -14.78 | Soft/props + Soft/props | 0.91 | 47 | 33.3 |
| 26.61, 118.90, 16.36 | Soft/props + Soft/props | 1 | 47 | 35.8 |
| 29.11, 118.42, -13.18 | Soft/props + Soft/props | 0.92 | 45 | 37 |
| 23.90, 118.44, -13.17 | Soft/props + Soft/props | 0.98 | 45 | 34.6 |
| 22.78, 118.87, 16.38 | Soft/props + Soft/props | 0.98 | 45 | 39.3 |
| 29.81, 118.42, -18.22 | Soft/props + Soft/props | 0.9 | 43 | 17.9 |
| 29.82, 123.17, 17.24 | Soft/props + Soft/props | 0.48 | 40 | 20.6 |
| 20.01, 118.78, 5.00 | Soft/plant + Soft/plant | 0.07 | 36 | 79.6 |
| 20.01, 118.78, 5.00 | Soft/plant + Soft/plant | 0.07 | 36 | 83.4 |
| 20.01, 118.78, 5.00 | Soft/plant + Soft/plant | 0.07 | 36 | 82.4 |
| 20.01, 118.78, 5.00 | Soft/plant + Soft/plant | 0.07 | 36 | 77.7 |
| 20.01, 118.78, 5.00 | Soft/plant + Soft/plant | 0.07 | 36 | 79.9 |
| 26.61, 119.33, -9.40 | Soft/plant + Soft/plant | 0.07 | 36 | 84.6 |
| 26.61, 119.33, -9.40 | Soft/plant + Soft/plant | 0.07 | 36 | 83.4 |
| 34.91, 119.33, -9.60 | Soft/plant + Soft/plant | 0.07 | 36 | 78.1 |
| 34.91, 119.33, -9.60 | Soft/plant + Soft/plant | 0.07 | 36 | 81.8 |
| 34.91, 119.33, -9.60 | Soft/plant + Soft/plant | 0.07 | 36 | 76.7 |
| 34.91, 119.33, -9.60 | Soft/plant + Soft/plant | 0.07 | 36 | 80.2 |
| 15.41, 118.89, -21.50 | Soft/plant + Soft/plant | 0.07 | 36 | 84 |
| 15.41, 118.89, -21.50 | Soft/plant + Soft/plant | 0.07 | 36 | 84.7 |
| 15.41, 118.89, -21.50 | Soft/plant + Soft/plant | 0.07 | 36 | 77.4 |
| 15.41, 118.89, -21.50 | Soft/plant + Soft/plant | 0.07 | 36 | 82 |
| 15.41, 118.89, -21.50 | Soft/plant + Soft/plant | 0.07 | 36 | 75.3 |
| 34.81, 118.86, -21.40 | Soft/plant + Soft/plant | 0.07 | 36 | 79.5 |
| 34.81, 118.86, -21.40 | Soft/plant + Soft/plant | 0.07 | 36 | 84.5 |
| 34.81, 118.86, -21.40 | Soft/plant + Soft/plant | 0.07 | 36 | 76 |
| 34.81, 118.86, -21.40 | Soft/plant + Soft/plant | 0.07 | 36 | 76.7 |
| 34.81, 118.86, -21.40 | Soft/plant + Soft/plant | 0.07 | 36 | 83.4 |
| 14.91, 119.33, 12.00 | Soft/plant + Soft/plant | 0.07 | 36 | 76.8 |
| 14.91, 119.33, 12.00 | Soft/plant + Soft/plant | 0.07 | 36 | 84.3 |
| 14.91, 119.33, 12.00 | Soft/plant + Soft/plant | 0.07 | 36 | 80.8 |
| 14.91, 119.33, 12.00 | Soft/plant + Soft/plant | 0.07 | 36 | 76.8 |
| 14.91, 119.33, 12.00 | Soft/plant + Soft/plant | 0.07 | 36 | 82 |
| 14.91, 119.33, 21.70 | Soft/plant + Soft/plant | 0.07 | 36 | 77 |

(992 more in the JSON)

## opening (info, 1439)

| at | part | facing | edge_m |
|---|---|---|---|
| 20.16, 119.63, 5.06 | Soft/plant | 0.27 + 0.89 + 0.37 | 0.025 |
| 20.13, 119.62, 5.09 | Soft/plant | -0.2 + 0.86 + 0.47 | 0.027 |
| 20.14, 119.61, 5.11 | Soft/plant | -0.19 + 0.83 + 0.52 | 0.026 |
| 20.10, 119.28, 4.95 | Soft/plant | 0.15 + 0.84 + -0.52 | 0.026 |
| 20.09, 119.26, 4.92 | Soft/plant | 0.12 + 0.77 + -0.63 | 0.029 |
| 20.06, 119.25, 4.91 | Soft/plant | -0.29 + 0.7 + -0.65 | 0.03 |
| 20.12, 119.26, 4.96 | Soft/plant | -0.39 + 0.92 + -0.11 | 0.027 |
| 20.16, 119.27, 4.99 | Soft/plant | -0.14 + 0.95 + 0.28 | 0.03 |
| 20.15, 119.27, 4.96 | Soft/plant | -0.28 + 0.95 + -0.14 | 0.03 |
| 20.18, 119.28, 4.96 | Soft/plant | -0.19 + 0.97 + -0.16 | 0.03 |
| 20.15, 119.81, 5.01 | Soft/plant | 0.15 + 0.85 + -0.5 | 0.027 |
| 20.11, 119.47, 4.98 | Soft/plant | -0.04 + 0.84 + -0.54 | 0.023 |
| 20.11, 119.45, 4.96 | Soft/plant | -0.09 + 0.78 + -0.62 | 0.023 |
| 20.09, 119.44, 4.95 | Soft/plant | -0.15 + 0.71 + -0.69 | 0.025 |
| 20.16, 119.91, 5.01 | Soft/plant | 0.24 + 0.88 + 0.4 | 0.032 |
| 20.15, 119.91, 4.98 | Soft/plant | 0.32 + 0.94 + -0.09 | 0.029 |
| 20.06, 119.92, 4.96 | Soft/plant | -0.23 + 0.97 + 0.09 | 0.034 |
| 20.11, 119.60, 5.05 | Soft/plant | -0.28 + 0.81 + 0.52 | 0.021 |
| 20.19, 119.95, 5.00 | Soft/plant | -0.54 + 0.84 + -0.05 | 0.028 |
| 20.22, 119.95, 5.02 | Soft/plant | -0.22 + 0.91 + 0.34 | 0.026 |
| 20.21, 119.95, 4.98 | Soft/plant | -0.39 + 0.91 + -0.1 | 0.026 |
| 20.25, 119.96, 5.01 | Soft/plant | -0.09 + 0.96 + 0.27 | 0.025 |
| 20.23, 119.96, 4.97 | Soft/plant | -0.25 + 0.96 + -0.14 | 0.025 |
| 20.27, 119.96, 5.00 | Soft/plant | 0.03 + 0.98 + 0.21 | 0.028 |
| 20.26, 119.96, 4.97 | Soft/plant | -0.12 + 0.98 + -0.18 | 0.028 |
| 20.29, 119.97, 4.98 | Soft/plant | 0.13 + 0.98 + 0.15 | 0.03 |
| 20.29, 119.97, 4.97 | Soft/plant | -0.01 + 0.98 + -0.2 | 0.03 |
| 19.98, 119.69, 5.09 | Soft/plant | 0.01 + 0.94 + -0.34 | 0.021 |
| 20.00, 119.69, 5.11 | Soft/plant | 0.34 + 0.94 + 0.02 | 0.021 |
| 19.99, 119.69, 5.13 | Soft/plant | 0.29 + 0.96 + 0.06 | 0.02 |
| 19.96, 119.70, 5.12 | Soft/plant | -0.08 + 0.96 + -0.25 | 0.022 |
| 19.97, 119.70, 5.14 | Soft/plant | 0.24 + 0.96 + 0.1 | 0.022 |
| 19.95, 119.70, 5.14 | Soft/plant | -0.12 + 0.97 + -0.21 | 0.021 |
| 19.95, 119.70, 5.14 | Soft/plant | 0.2 + 0.97 + 0.13 | 0.021 |
| 20.02, 119.62, 4.96 | Soft/plant | 0.17 + 0.88 + -0.44 | 0.031 |
| 19.99, 119.86, 5.09 | Soft/plant | -0.49 + 0.87 + -0.06 | 0.021 |
| 20.05, 120.16, 5.13 | Soft/plant | -0.44 + 0.87 + 0.23 | 0.028 |
| 20.00, 120.13, 5.10 | Soft/plant | -0.56 + 0.79 + -0.24 | 0.03 |
| 20.09, 119.78, 5.08 | Soft/plant | -0.55 + 0.82 + 0.17 | 0.025 |
| 20.09, 119.78, 5.07 | Soft/plant | -0.48 + 0.82 + -0.31 | 0.025 |

(1399 more in the JSON)

## backtoback (info, 1166)

| at | parts | area |
|---|---|---|
| 23.70, 118.09, -12.87 | Soft/props + Soft/props | 0.00009 |
| 23.70, 118.10, -12.85 | Soft/props + Soft/props | 0.00069 |
| 23.70, 118.11, -12.81 | Soft/props + Soft/props | 0.00062 |
| 23.70, 118.09, -12.86 | Soft/props + Soft/props | 0.00004 |
| 23.70, 118.09, -12.84 | Soft/props + Soft/props | 0.00012 |
| 23.70, 118.09, -12.79 | Soft/props + Soft/props | 0.00137 |
| 23.70, 118.08, -12.86 | Soft/props + Soft/props | 0.00021 |
| 23.70, 118.10, -12.96 | Soft/props + Soft/props | 0.00152 |
| 23.70, 118.09, -12.93 | Soft/props + Soft/props | 0.00133 |
| 23.70, 118.08, -12.95 | Soft/props + Soft/props | 0.00065 |
| 23.70, 118.08, -12.88 | Soft/props + Soft/props | 0.00011 |
| 23.70, 118.18, -13.10 | Soft/props + Soft/props | 0.00102 |
| 23.70, 118.15, -13.10 | Soft/props + Soft/props | 0.00054 |
| 23.70, 118.14, -13.04 | Soft/props + Soft/props | 0.00126 |
| 23.70, 118.13, -13.07 | Soft/props + Soft/props | 0.0012 |
| 23.70, 118.09, -13.06 | Soft/props + Soft/props | 0.00084 |
| 23.70, 118.09, -13.01 | Soft/props + Soft/props | 0.00071 |
| 23.70, 118.08, -13.06 | Soft/props + Soft/props | 0.00064 |
| 23.70, 118.18, -13.15 | Soft/props + Soft/props | 0.00016 |
| 23.70, 118.18, -13.20 | Soft/props + Soft/props | 0.00077 |
| 23.70, 118.17, -13.15 | Soft/props + Soft/props | 0.00081 |
| 23.70, 118.17, -13.19 | Soft/props + Soft/props | 0.00043 |
| 23.70, 118.14, -13.16 | Soft/props + Soft/props | 0.00023 |
| 23.70, 118.14, -13.14 | Soft/props + Soft/props | 0.00036 |
| 23.70, 118.13, -13.15 | Soft/props + Soft/props | 0.00017 |
| 23.70, 118.12, -13.14 | Soft/props + Soft/props | 0.00087 |
| 23.70, 118.13, -13.31 | Soft/props + Soft/props | 0.00052 |
| 23.70, 118.11, -13.31 | Soft/props + Soft/props | 0.00071 |
| 23.70, 118.09, -13.29 | Soft/props + Soft/props | 0.00136 |
| 23.70, 118.08, -13.30 | Soft/props + Soft/props | 0.00041 |
| 27.47, 118.21, -12.62 | Soft/props + Soft/props | 0.00678 |
| 26.19, 118.21, -12.62 | Soft/props + Soft/props | 0.00738 |
| 26.41, 118.21, -12.63 | Soft/props + Soft/props | 0.00004 |
| 28.94, 118.21, -12.63 | Soft/props + Soft/props | 0.00023 |
| 28.82, 118.21, -12.64 | Soft/props + Soft/props | 0.0082 |
| 29.08, 118.21, -12.63 | Soft/props + Soft/props | 0.00756 |
| 28.51, 118.21, -12.65 | Soft/props + Soft/props | 0.0003 |
| 28.57, 118.21, -12.64 | Soft/props + Soft/props | 0.00148 |
| 28.32, 118.21, -12.63 | Soft/props + Soft/props | 0.00022 |
| 28.13, 118.21, -12.64 | Soft/props + Soft/props | 0.0086 |

(1126 more in the JSON)


Nodes: Soft. Distances: {"*":35}. Quantum 0.000 mm. Offset 0,100,0.
