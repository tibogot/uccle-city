# Mesh audit (before pack): soft.soft

85,218 triangles, 47,727 welded vertices, 7,820 open edges, 199,188 rays, 6601 ms.

**0 blocking**, 756 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| tjunction | warn | 14 |
| seam | info | 1143 |
| opening | info | 1439 |
| backtoback | info | 2005 |

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

## seam (info, 1143)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 29.43, 118.22, -13.49 | Soft/props + Soft/props | 2.19 | 106 | 27.5 |
| 30.47, 118.22, -18.57 | Soft/props + Soft/props | 2.19 | 104 | 27.4 |
| 22.44, 118.67, 15.72 | Soft/props + Soft/props | 2.19 | 104 | 27.5 |
| 32.16, 123.36, -1.77 | Soft/props + Soft/props | 1.47 | 104 | 25.3 |
| 29.63, 123.36, 17.69 | Soft/props + Soft/props | 1.47 | 104 | 25.7 |
| 23.67, 118.22, -13.47 | Soft/props + Soft/props | 2.19 | 103 | 28.2 |
| 29.53, 118.22, -14.57 | Soft/props + Soft/props | 2.19 | 103 | 28.7 |
| 26.83, 118.67, 16.66 | Soft/props + Soft/props | 2.19 | 103 | 28.5 |
| 32.16, 123.36, -0.90 | Soft/props + Soft/props | 1.47 | 102 | 25.1 |
| 29.61, 123.36, 16.64 | Soft/props + Soft/props | 1.52 | 102 | 30.4 |
| 24.02, 118.40, -13.22 | Soft/props + Soft/props | 2.03 | 101 | 12.8 |
| 29.76, 118.40, -15.05 | Soft/props + Soft/props | 2.03 | 100 | 14.2 |
| 23.63, 118.61, -13.19 | Soft/props + Soft/props | 1.19 | 99 | 58.6 |
| 29.16, 118.24, -13.19 | Soft/props + Soft/props | 2.13 | 98 | 12.4 |
| 31.88, 122.49, -2.42 | Soft/props + Soft/props | 4.12 | 98 | 6.9 |
| 29.33, 122.49, 16.51 | Soft/props + Soft/props | 4.51 | 98 | 7.1 |
| 29.81, 118.23, -18.15 | Soft/props + Soft/props | 2.02 | 96 | 13.4 |
| 23.83, 118.71, 15.97 | Soft/props + Soft/props | 1.46 | 93 | 19.8 |
| 25.68, 118.71, 15.97 | Soft/props + Soft/props | 1.48 | 93 | 20.7 |
| 24.17, 118.71, 15.98 | Soft/props + Soft/props | 1.47 | 92 | 20.6 |
| 23.31, 118.33, -19.26 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 23.31, 118.33, -14.26 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 21.11, 118.78, 17.14 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 21.11, 118.78, 19.34 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 14.39, 122.78, 2.76 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 20.31, 122.78, -3.26 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 20.31, 122.78, -0.26 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 35.39, 122.78, 21.57 | Soft/props + Soft/props | 2.26 | 68 | 8.6 |
| 22.58, 118.31, -18.74 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 22.58, 118.31, -13.71 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 20.38, 118.76, 17.69 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 20.38, 118.76, 19.89 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 15.12, 122.76, 2.21 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 19.58, 122.76, -2.74 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 19.58, 122.76, 0.29 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 36.30, 122.76, 21.69 | Soft/props + Soft/props | 1.49 | 54 | 8.3 |
| 29.29, 118.30, -12.87 | Soft/props + Soft/props | 0.97 | 46 | 7.1 |
| 30.13, 118.30, -18.39 | Soft/props + Soft/props | 0.97 | 46 | 7.1 |
| 22.61, 118.75, 16.07 | Soft/props + Soft/props | 0.97 | 46 | 7.1 |
| 30.13, 118.23, -14.82 | Soft/props + Soft/props | 1.58 | 45 | 5.2 |

(1103 more in the JSON)

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

## backtoback (info, 2005)

| at | parts | area |
|---|---|---|
| 23.53, 118.22, -13.15 | Soft/props + Soft/props | 0.00078 |
| 24.03, 118.23, -12.89 | Soft/props + Soft/props | 0.0027 |
| 24.01, 118.23, -12.97 | Soft/props + Soft/props | 0.01116 |
| 24.07, 118.23, -12.93 | Soft/props + Soft/props | 0.00314 |
| 24.06, 118.23, -13.00 | Soft/props + Soft/props | 0.00008 |
| 24.03, 118.23, -12.90 | Soft/props + Soft/props | 0.00103 |
| 24.06, 118.23, -13.04 | Soft/props + Soft/props | 0.0053 |
| 24.00, 118.23, -13.01 | Soft/props + Soft/props | 0.00174 |
| 23.98, 118.23, -13.16 | Soft/props + Soft/props | 0.00608 |
| 24.04, 118.23, -13.15 | Soft/props + Soft/props | 0.00676 |
| 24.03, 118.23, -13.22 | Soft/props + Soft/props | 0.00448 |
| 24.05, 118.23, -13.27 | Soft/props + Soft/props | 0.00641 |
| 24.01, 118.23, -13.21 | Soft/props + Soft/props | 0.00227 |
| 24.03, 118.23, -13.34 | Soft/props + Soft/props | 0.007 |
| 24.09, 118.23, -13.31 | Soft/props + Soft/props | 0.0005 |
| 24.07, 118.23, -13.30 | Soft/props + Soft/props | 0.00017 |
| 29.01, 118.23, -12.89 | Soft/props + Soft/props | 0.00217 |
| 28.94, 118.23, -12.89 | Soft/props + Soft/props | 0.00138 |
| 28.34, 118.23, -12.89 | Soft/props + Soft/props | 0.00038 |
| 28.38, 118.23, -12.89 | Soft/props + Soft/props | 0.00029 |
| 28.48, 118.23, -12.89 | Soft/props + Soft/props | 0.00411 |
| 28.73, 118.23, -12.89 | Soft/props + Soft/props | 0.00435 |
| 28.84, 118.23, -12.89 | Soft/props + Soft/props | 0.00042 |
| 28.88, 118.23, -12.89 | Soft/props + Soft/props | 0.00104 |
| 28.33, 118.23, -12.89 | Soft/props + Soft/props | 0.00084 |
| 28.39, 118.23, -12.88 | Soft/props + Soft/props | 0.00011 |
| 28.04, 118.23, -12.89 | Soft/props + Soft/props | 0.00378 |
| 28.23, 118.23, -12.89 | Soft/props + Soft/props | 0.0027 |
| 27.17, 118.23, -12.89 | Soft/props + Soft/props | 0.00083 |
| 27.21, 118.23, -12.89 | Soft/props + Soft/props | 0.00043 |
| 27.31, 118.23, -12.89 | Soft/props + Soft/props | 0.00423 |
| 27.67, 118.23, -12.89 | Soft/props + Soft/props | 0.00029 |
| 27.45, 118.23, -12.89 | Soft/props + Soft/props | 0.00035 |
| 27.56, 118.23, -12.89 | Soft/props + Soft/props | 0.00392 |
| 27.15, 118.23, -12.89 | Soft/props + Soft/props | 0.00135 |
| 27.21, 118.23, -12.88 | Soft/props + Soft/props | 0.00005 |
| 26.64, 118.23, -12.89 | Soft/props + Soft/props | 0.00322 |
| 26.75, 118.23, -12.89 | Soft/props + Soft/props | 0.00037 |
| 26.86, 118.23, -12.89 | Soft/props + Soft/props | 0.00443 |
| 26.00, 118.23, -12.89 | Soft/props + Soft/props | 0.00143 |

(1965 more in the JSON)


Nodes: Soft. Distances: {"*":35}. Quantum 0.000 mm. Offset 0,100,0.
