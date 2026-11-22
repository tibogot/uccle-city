# Mesh audit (before pack): villa.far

102 triangles, 82 welded vertices, 62 open edges, 288,416 rays, 426 ms.

**0 blocking**, 22 warnings. Clean (no blocking item).

| check | severity | count |
|---|---|---|
| sliver | warn | 10 |
| tjunction | warn | 12 |
| seam | info | 10 |
| opening | info | 35 |
| backtoback | info | 6 |

Positions: the file's scene coordinates (glTF, Y up, node transforms applied).

## sliver (warn, 10)

| at | part | aspect | longest |
|---|---|---|---|
| 9.80, 119.74, -0.20 | Villa_far/render_white | 169 | 50.701 |
| 9.70, 119.74, -17.10 | Villa_far/render_white | 169 | 50.701 |
| 37.50, 122.27, 15.67 | Villa_far/wood_cladding | 59 | 23.503 |
| 37.50, 122.13, 7.83 | Villa_far/wood_cladding | 59 | 23.503 |
| 41.98, 122.75, -33.33 | Villa_far/hedge | 48 | 48.06 |
| 25.97, 122.75, -33.67 | Villa_far/hedge | 48 | 48.06 |
| 41.98, 121.88, 29.67 | Villa_far/hedge | 48 | 48.06 |
| 25.97, 121.88, 29.33 | Villa_far/hedge | 48 | 48.06 |
| 57.67, 122.84, 8.33 | Villa_far/hedge | 62 | 62.008 |
| 57.33, 122.84, -12.33 | Villa_far/hedge | 62 | 62.008 |

## tjunction (warn, 12)

| at | part | edge_m |
|---|---|---|
| 14.00, 122.00, -8.00 | Villa_far/render_white | 7.55 |
| 36.00, 125.20, -23.00 | Villa_far/render_white | 7.55 |
| 14.00, 118.40, -8.00 | Villa_far/stone_blue | 46 |
| 36.00, 118.40, -17.00 | Villa_far/stone_blue | 46 |
| 36.00, 118.40, -8.00 | Villa_far/stone_blue | 33 |
| 37.50, 122.40, 23.50 | Villa_far/wood_cladding | 4.3 |
| 37.50, 122.00, 0.00 | Villa_far/wood_cladding | 31.5 |
| 37.50, 126.30, 0.00 | Villa_far/wood_cladding | 31.5 |
| 37.50, 122.40, 0.00 | Villa_far/wood_cladding | 4.3 |
| 36.00, 118.40, 16.00 | Villa_far/glass_window | 31 |
| 36.00, 122.00, -8.00 | Villa_far/glass_window | 6.8 |
| 36.00, 118.40, -17.00 | Villa_far/glass_window | 15 |

## seam (info, 10)

| at | parts | length_m | pieces | min_angle_deg |
|---|---|---|---|---|
| 58.00, 120.45, -33.00 | Villa_far/hedge + Villa_far/hedge | 14.8 | 6 | 90 |
| 58.00, 120.01, 29.00 | Villa_far/hedge + Villa_far/hedge | 12.17 | 5 | 90 |
| 14.00, 122.00, -6.76 | Villa_far/render_white + Villa_far/wood_cladding | 75 | 4 | 90 |
| 14.00, 123.97, -8.00 | Villa_far/render_white + Villa_far/wood_cladding | 26.7 | 4 | 90 |
| 36.00, 118.17, -17.00 | Villa_far/stone_blue + Villa_far/stone_blue | 36.12 | 4 | 90 |
| 36.00, 123.73, -8.00 | Villa_far/wood_cladding + Villa_far/glass_window | 3.2 | 2 | 90 |
| 36.00, 122.00, 6.82 | Villa_far/wood_cladding + Villa_far/glass_window | 31 | 2 | 90 |
| 36.00, 118.40, -12.50 | Villa_far/stone_blue + Villa_far/glass_window | 9 | 1 | 90 |
| 36.00, 118.40, 4.00 | Villa_far/stone_blue + Villa_far/glass_window | 24 | 1 | 90 |
| 37.50, 123.90, 23.50 | Villa_far/wood_cladding + Villa_far/glass_window | 3 | 1 | 90 |

## opening (info, 35)

| at | part | facing | edge_m |
|---|---|---|---|
| 14.00, 118.40, -7.95 | Villa_far/render_white | -1 + 0 + 0 | 31 |
| 14.00, 118.40, -8.05 | Villa_far/render_white | -1 + 0 + 0 | 15 |
| 36.00, 125.90, -23.00 | Villa_far/render_white | 1 + 0 + 0 | 0.75 |
| 9.60, 115.42, -33.95 | Villa_far/render_white | -1 + 0 + 0 | 50.7 |
| 9.90, 115.42, 16.65 | Villa_far/render_white | 1 + 0 + 0 | 50.7 |
| 9.65, 115.42, -34.00 | Villa_far/render_white | 0 + 0 + -1 | 0.3 |
| 9.65, 115.42, 16.70 | Villa_far/render_white | 0 + 0 + 1 | 0.3 |
| 9.60, 115.35, 23.75 | Villa_far/render_white | -1 + 0 + 0 | 6.3 |
| 9.90, 115.35, 29.95 | Villa_far/render_white | 1 + 0 + 0 | 6.3 |
| 9.65, 115.35, 23.70 | Villa_far/render_white | 0 + 0 + -1 | 0.3 |
| 9.65, 115.35, 30.00 | Villa_far/render_white | 0 + 0 + 1 | 0.3 |
| 14.00, 114.80, -22.95 | Villa_far/stone_blue | -1 + 0 + 0 | 46 |
| 36.00, 114.80, 22.95 | Villa_far/stone_blue | 1 + 0 + 0 | 46 |
| 14.05, 114.80, -23.00 | Villa_far/stone_blue | 0 + 0 + -1 | 22 |
| 14.05, 114.80, 23.00 | Villa_far/stone_blue | 0 + 0 + 1 | 22 |
| 44.50, 116.84, 15.95 | Villa_far/stone_blue | 1 + 0 + 0 | 33 |
| 44.45, 116.84, -17.00 | Villa_far/stone_blue | 0 + 0 + -1 | 8.5 |
| 44.45, 116.84, 16.00 | Villa_far/stone_blue | 0 + 0 + 1 | 8.5 |
| 37.50, 126.30, -7.95 | Villa_far/wood_cladding | 1 + 0 + 0 | 8 |
| 37.50, 122.00, -7.95 | Villa_far/wood_cladding | 1 + 0 + 0 | 8 |
| 37.50, 122.05, 23.50 | Villa_far/wood_cladding | 1 + 0 + 0 | 0.4 |
| 37.50, 122.00, 23.45 | Villa_far/wood_cladding | 1 + 0 + 0 | 23.5 |
| 37.50, 126.30, 23.45 | Villa_far/wood_cladding | 1 + 0 + 0 | 23.5 |
| 37.50, 126.25, 0.00 | Villa_far/wood_cladding | 1 + 0 + 0 | 0.9 |
| 36.00, 118.45, -23.00 | Villa_far/glass_window | 1 + 0 + 0 | 6.8 |
| 37.50, 122.45, 23.50 | Villa_far/glass_window | 1 + 0 + 0 | 3 |
| 37.50, 122.45, 0.00 | Villa_far/glass_window | 1 + 0 + 0 | 3 |
| 58.00, 117.65, -33.05 | Villa_far/hedge | 1 + 0 + 0 | 1 |
| 10.00, 117.65, -34.00 | Villa_far/hedge | 0 + 0 + -1 | 48.05 |
| 10.00, 117.65, -33.00 | Villa_far/hedge | 0 + 0 + 1 | 48.05 |
| 58.00, 115.40, 29.95 | Villa_far/hedge | 1 + 0 + 0 | 1 |
| 10.00, 115.40, 29.00 | Villa_far/hedge | 0 + 0 + -1 | 48.05 |
| 10.00, 115.40, 30.00 | Villa_far/hedge | 0 + 0 + 1 | 48.05 |
| 57.00, 118.15, -32.95 | Villa_far/hedge | -1 + 0 + 0 | 62 |
| 58.00, 118.15, 28.95 | Villa_far/hedge | 1 + 0 + 0 | 62 |

## backtoback (info, 6)

| at | parts | area |
|---|---|---|
| 57.68, 121.18, -33.00 | Villa_far/hedge + Villa_far/hedge | 2.20786 |
| 57.26, 120.40, -33.00 | Villa_far/hedge + Villa_far/hedge | 2.33802 |
| 57.51, 122.73, -33.00 | Villa_far/hedge + Villa_far/hedge | 0.05003 |
| 57.01, 122.70, -33.00 | Villa_far/hedge + Villa_far/hedge | 0.00304 |
| 57.70, 120.01, 29.00 | Villa_far/hedge + Villa_far/hedge | 2.24343 |
| 57.27, 120.64, 29.00 | Villa_far/hedge + Villa_far/hedge | 1.4802 |


Nodes: Villa_far. Distances: {"Villa":80,"Villa_gateL":80,"Villa_gateR":80,"Villa_door":80,"Villa_water":400,"Villa_far":2000,"Villa_lod1":260,"Villa_lod2":2000}. Quantum 0.000 mm. Offset 0,100,0.
