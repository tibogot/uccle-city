"""local city x, z -> lat, lon (for looking places up on a map). python tools/roofs/ll.py x z [x z ...]"""
import sys
from pyproj import Transformer
t = Transformer.from_crs("EPSG:31370", "EPSG:4326", always_xy=True)
a = list(map(float, sys.argv[1:]))
for i in range(0, len(a), 2):
    lon, lat = t.transform(148643.0 + a[i], 165394.0 - a[i + 1])
    print(f"{a[i]:.0f},{a[i+1]:.0f} -> {lat:.6f},{lon:.6f}")
