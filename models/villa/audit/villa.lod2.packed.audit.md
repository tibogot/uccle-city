# Mesh audit (packed): villa.lod2

170 triangles, 150 welded vertices, 178 open edges, 368,640 rays, 299 ms.

**0 blocking**, 49 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 10 |
| tjunction | warn | 39 |
| seam | info | 29 |
| opening | info | 104 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 10)

| at | part | aspect | longest |
|---|---|---|---|
| 9.80, 119.74, -0.20 | Villa_lod2/render_white | 169 | 50.701 |
| 9.70, 119.74, -17.10 | Villa_lod2/render_white | 169 | 50.701 |
| 37.50, 122.27, 15.67 | Villa_lod2/wood_cladding | 59 | 23.503 |
| 37.50, 122.13, 7.83 | Villa_lod2/wood_cladding | 59 | 23.503 |
| 41.98, 122.75, -33.33 | Villa_lod2/hedge | 48 | 48.06 |
| 25.97, 122.75, -33.67 | Villa_lod2/hedge | 48 | 48.06 |
| 41.98, 121.88, 29.67 | Villa_lod2/hedge | 48 | 48.06 |
| 25.97, 121.88, 29.33 | Villa_lod2/hedge | 48 | 48.06 |
| 57.67, 122.84, 8.33 | Villa_lod2/hedge | 62 | 62.008 |
| 57.33, 122.84, -12.33 | Villa_lod2/hedge | 62 | 62.008 |

## tjunction (warn, 39)

| at | part | edge_m |
|---|---|---|
| 14.00, 124.80, -21.20 | Villa_lod2/render_white | 7.55 |
| 14.00, 124.80, -17.00 | Villa_lod2/render_white | 7.55 |
| 14.00, 124.80, -19.90 | Villa_lod2/render_white | 7.55 |
| 14.00, 124.80, -12.60 | Villa_lod2/render_white | 7.55 |
| 14.00, 124.80, -15.80 | Villa_lod2/render_white | 7.55 |
| 14.00, 122.00, -8.00 | Villa_lod2/render_white | 7.55 |
| 14.00, 124.80, -11.40 | Villa_lod2/render_white | 7.55 |
| 14.00, 121.40, 4.50 | Villa_lod2/render_white | 3.6 |
| 14.00, 121.80, 5.90 | Villa_lod2/render_white | 3.6 |
| 14.00, 121.40, 5.50 | Villa_lod2/render_white | 3.6 |
| 14.00, 118.70, 12.00 | Villa_lod2/render_white | 3.6 |
| 14.00, 121.80, 9.10 | Villa_lod2/render_white | 3.6 |
| 14.00, 118.70, 21.50 | Villa_lod2/render_white | 3.6 |
| 28.00, 118.85, -23.00 | Villa_lod2/render_white | 7.55 |
| 36.00, 125.20, -23.00 | Villa_lod2/render_white | 7.55 |
| 33.00, 118.85, -23.00 | Villa_lod2/render_white | 7.55 |
| 24.00, 118.70, 23.00 | Villa_lod2/render_white | 3.6 |
| 33.00, 118.70, 23.00 | Villa_lod2/render_white | 3.6 |
| 14.00, 118.40, -21.20 | Villa_lod2/stone_blue | 46 |
| 36.00, 118.40, -17.00 | Villa_lod2/stone_blue | 46 |
| 28.00, 118.40, -23.00 | Villa_lod2/stone_blue | 22 |
| 24.00, 118.40, 23.00 | Villa_lod2/stone_blue | 22 |
| 36.00, 118.40, -8.00 | Villa_lod2/stone_blue | 33 |
| 12.00, 123.00, -8.00 | Villa_lod2/wood_cladding | 4.3 |
| 37.50, 122.00, 0.00 | Villa_lod2/wood_cladding | 31.5 |
| 12.00, 123.00, -6.00 | Villa_lod2/wood_cladding | 31.5 |
| 12.00, 125.00, -6.00 | Villa_lod2/wood_cladding | 31.5 |
| 37.50, 122.40, 23.50 | Villa_lod2/wood_cladding | 1 |
| 28.00, 123.00, 23.50 | Villa_lod2/wood_cladding | 25.5 |
| 28.00, 125.00, 23.50 | Villa_lod2/wood_cladding | 25.5 |
| 37.50, 125.40, 23.50 | Villa_lod2/wood_cladding | 1.3 |
| 37.50, 122.40, 0.00 | Villa_lod2/wood_cladding | 4.3 |
| 36.00, 118.40, 16.00 | Villa_lod2/glass_window | 31 |
| 36.00, 122.00, -8.00 | Villa_lod2/glass_window | 6.8 |
| 36.00, 118.40, -17.00 | Villa_lod2/glass_window | 15 |
| 37.50, 123.00, 23.50 | Villa_lod2/glass_window | 3 |
| 37.50, 126.30, 0.00 | Villa_lod2/concrete_soffit | 31.5 |
| 28.00, 125.95, -23.00 | Villa_lod2/concrete_soffit | 22 |
| 14.00, 125.95, -21.20 | Villa_lod2/concrete_soffit | 15 |

## seam (info, 29)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 58.00, 120.45, -33.00 | Villa_lod2/hedge + Villa_lod2/hedge | 14.8 | 6 | 90 |
| 58.00, 120.01, 29.00 | Villa_lod2/hedge + Villa_lod2/hedge | 12.17 | 5 | 90 |
| 36.00, 118.17, -17.00 | Villa_lod2/stone_blue + Villa_lod2/stone_blue | 36.12 | 4 | 90 |
| 14.00, 122.00, -6.76 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 12.5 | 2 | 90 |
| 14.00, 122.00, 22.25 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 11.5 | 2 | 90 |
| 25.04, 125.95, -8.00 | Villa_lod2/wood_cladding + Villa_lod2/concrete_soffit | 22 | 2 | 90 |
| 36.00, 123.73, -8.00 | Villa_lod2/wood_cladding + Villa_lod2/glass_window | 3.2 | 2 | 90 |
| 36.00, 122.00, 6.82 | Villa_lod2/wood_cladding + Villa_lod2/glass_window | 31 | 2 | 90 |
| 14.00, 125.95, -20.55 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 1.3 | 1 | 90 |
| 14.00, 125.95, -18.45 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 2.9 | 1 | 90 |
| 14.00, 125.95, -16.40 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 1.2 | 1 | 90 |
| 14.00, 125.95, -14.20 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 3.2 | 1 | 90 |
| 14.00, 125.95, -12.00 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 1.2 | 1 | 90 |
| 14.00, 123.97, -8.00 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 3.95 | 1 | 90 |
| 14.00, 122.00, 5.00 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 1 | 1 | 90 |
| 14.00, 122.00, 5.70 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 0.4 | 1 | 90 |
| 14.00, 122.00, 7.50 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 3.2 | 1 | 90 |
| 14.00, 122.00, 10.55 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 2.9 | 1 | 90 |
| 14.00, 122.00, 16.75 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 9.5 | 1 | 90 |
| 30.50, 125.95, -23.00 | Villa_lod2/render_white + Villa_lod2/concrete_soffit | 5 | 1 | 90 |
| 28.50, 122.00, 23.00 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 9 | 1 | 90 |
| 34.50, 122.00, 23.00 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 3 | 1 | 90 |
| 36.00, 125.58, -8.00 | Villa_lod2/render_white + Villa_lod2/wood_cladding | 0.75 | 1 | 90 |
| 36.00, 118.40, -12.50 | Villa_lod2/stone_blue + Villa_lod2/glass_window | 9 | 1 | 90 |
| 36.00, 118.40, 4.00 | Villa_lod2/stone_blue + Villa_lod2/glass_window | 24 | 1 | 90 |
| 12.00, 124.00, -8.00 | Villa_lod2/wood_cladding + Villa_lod2/wood_cladding | 2 | 1 | 90 |
| 37.50, 122.70, 23.50 | Villa_lod2/wood_cladding + Villa_lod2/glass_window | 0.6 | 1 | 90 |
| 37.50, 125.20, 23.50 | Villa_lod2/wood_cladding + Villa_lod2/glass_window | 0.4 | 1 | 90 |
| 37.50, 124.00, 23.50 | Villa_lod2/wood_cladding + Villa_lod2/glass_window | 2 | 1 | 90 |

## opening (info, 104)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 118.40, -22.95 | Villa_lod2/render_white | -1 + 0 + 0 | 1.8 |
| 14.00, 125.95, -21.25 | Villa_lod2/render_white | -1 + 0 + 0 | 1.8 |
| 14.00, 124.85, -19.90 | Villa_lod2/render_white | -1 + 0 + 0 | 1.15 |
| 14.00, 125.95, -21.15 | Villa_lod2/render_white | -1 + 0 + 0 | 1.3 |
| 14.00, 118.40, -19.85 | Villa_lod2/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 125.95, -19.85 | Villa_lod2/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 124.85, -15.80 | Villa_lod2/render_white | -1 + 0 + 0 | 1.15 |
| 14.00, 125.95, -16.95 | Villa_lod2/render_white | -1 + 0 + 0 | 1.2 |
| 14.00, 118.40, -15.75 | Villa_lod2/render_white | -1 + 0 + 0 | 3.2 |
| 14.00, 125.95, -15.75 | Villa_lod2/render_white | -1 + 0 + 0 | 3.2 |
| 14.00, 124.85, -11.40 | Villa_lod2/render_white | -1 + 0 + 0 | 1.15 |
| 14.00, 125.95, -12.55 | Villa_lod2/render_white | -1 + 0 + 0 | 1.2 |
| 14.00, 118.40, -11.35 | Villa_lod2/render_white | -1 + 0 + 0 | 3.4 |
| 14.00, 125.95, -11.35 | Villa_lod2/render_white | -1 + 0 + 0 | 3.4 |
| 14.00, 118.40, -7.95 | Villa_lod2/render_white | -1 + 0 + 0 | 12.5 |
| 14.00, 118.45, -8.00 | Villa_lod2/render_white | -1 + 0 + 0 | 3.6 |
| 14.00, 121.45, 5.50 | Villa_lod2/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 121.95, 4.50 | Villa_lod2/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 118.40, 5.55 | Villa_lod2/render_white | -1 + 0 + 0 | 0.4 |
| 14.00, 121.85, 9.10 | Villa_lod2/render_white | -1 + 0 + 0 | 0.2 |
| 14.00, 121.95, 5.90 | Villa_lod2/render_white | -1 + 0 + 0 | 0.2 |
| 14.00, 118.40, 9.15 | Villa_lod2/render_white | -1 + 0 + 0 | 2.9 |
| 14.00, 118.40, 12.05 | Villa_lod2/render_white | -1 + 0 + 0 | 9.5 |
| 14.00, 118.45, 12.00 | Villa_lod2/render_white | -1 + 0 + 0 | 0.3 |
| 14.00, 121.45, 21.50 | Villa_lod2/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 121.95, 12.00 | Villa_lod2/render_white | -1 + 0 + 0 | 0.6 |
| 14.00, 118.40, 21.55 | Villa_lod2/render_white | -1 + 0 + 0 | 1.5 |
| 14.05, 125.95, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 14 |
| 14.05, 118.40, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 14 |
| 33.00, 118.79, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 0.449 |
| 28.05, 118.40, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 5 |
| 28.05, 125.95, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 5 |
| 28.00, 125.90, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 5.15 |
| 33.05, 125.95, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 3 |
| 33.05, 118.40, -23.00 | Villa_lod2/render_white | 0 + 0 + -1 | 3 |
| 14.05, 118.40, 23.00 | Villa_lod2/render_white | 0 + 0 + 1 | 10 |
| 24.05, 118.40, 23.00 | Villa_lod2/render_white | 0 + 0 + 1 | 9 |
| 24.00, 118.45, 23.00 | Villa_lod2/render_white | 0 + 0 + 1 | 0.3 |
| 33.00, 121.45, 23.00 | Villa_lod2/render_white | 0 + 0 + 1 | 0.6 |
| 24.00, 121.95, 23.00 | Villa_lod2/render_white | 0 + 0 + 1 | 0.6 |

(64 more in the JSON)

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| 57.68, 121.18, -33.00 | Villa_lod2/hedge + Villa_lod2/hedge | 2.20758 |
| 57.26, 120.40, -33.00 | Villa_lod2/hedge + Villa_lod2/hedge | 2.33798 |
| 57.35, 122.72, -33.00 | Villa_lod2/hedge + Villa_lod2/hedge | 0.05002 |
| 57.02, 122.70, -33.00 | Villa_lod2/hedge + Villa_lod2/hedge | 0.00304 |
| 57.70, 120.01, 29.00 | Villa_lod2/hedge + Villa_lod2/hedge | 2.24342 |
| 57.27, 120.64, 29.00 | Villa_lod2/hedge + Villa_lod2/hedge | 1.48021 |


Nodes: Villa_lod2. Distances: {"Villa_ivy":80,"Villa":80,"Villa_bay":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.443 mm. Offset 0,100,0.
