"""Write data/tiles/manifest.json listing all 32 tiles (CONTRACT §5.5).

    python pipeline/build_manifest.py
"""
from __future__ import annotations

import sys

from common import (CONTRACT, COLS, I_RANGE, J_RANGE, L72_PROJ4, LAT_MAX, LAT_MIN, LON_MAX, LON_MIN, ORIGIN_E,
                    ORIGIN_N, TILE, TILES, all_tiles, read_json, round2, study_box_local, tile_bounds, tile_ij, write_json)

FILES = {"roads": "roads.json", "buildings": "buildings.json", "buildingsBin": "buildings.bin",
         "terrain": "terrain.u16", "terrainHeader": "terrain.json", "features": "features.json",
         "ortho": "ortho.jpg"}


def main():
    (xa, xb), (za, zb) = study_box_local()
    tiles = []
    for name in all_tiles():
        i, j = tile_ij(name)
        x0, z0, x1, z1 = tile_bounds(name)
        t = {"name": name, "i": i, "j": j, "bounds": {"x": [x0, x1], "z": [z0, z1]}}
        d = TILES / name
        present = {k: f"{name}/{f}" for k, f in FILES.items() if (d / f).exists()}
        if not present:
            t["status"] = "missing"
        else:
            t["status"] = "built" if len(present) == len(FILES) else "partial"
            t["files"] = present
            t["missingLayers"] = [k for k in FILES if k not in present]
            counts, sources = {}, {}
            if "roads" in present:
                r = read_json(d / FILES["roads"])
                counts.update(roads=len(r["roads"]), nodes=len(r["nodes"]))
                sources["osm"] = r.get("meta", {}).get("osmBase")
            if "buildings" in present:
                b = read_json(d / FILES["buildings"])
                counts["buildings"] = b["count"]
                sources["urbis3d"] = [x["file"] for x in b.get("inputs", []) if x.get("features")]
            if "features" in present:
                f = read_json(d / FILES["features"])
                counts.update(trees=f["counts"]["trees"], areas=f["counts"]["areas"], points=f["counts"]["points"])
            if "terrainHeader" in present:
                h = read_json(d / FILES["terrainHeader"])
                sources["dtm"] = [x["file"] for x in h.get("inputs", [])]
                counts["terrainMinMax"] = [h["min"], h["max"]]
            t["counts"], t["sources"] = counts, sources
        tiles.append(t)
    doc = {
        "contract": CONTRACT,
        "crs": {"source": "EPSG:31370", "proj4": L72_PROJ4, "origin": [ORIGIN_E, ORIGIN_N],
                "axes": "x=east, z=south, y=up (m TAW)"},
        "studyBox": {"lon": [LON_MIN, LON_MAX], "lat": [LAT_MIN, LAT_MAX],
                     "local": {"x": [round2(xa), round2(xb)], "z": [round2(za), round2(zb)]}},
        "tileSize": TILE, "cols": COLS, "rows": list(range(1, J_RANGE[1] - J_RANGE[0] + 2)),
        "iRange": list(I_RANGE), "jRange": list(J_RANGE), "tiles": tiles,
    }
    write_json(TILES / "manifest.json", doc, indent=1)
    print(f"manifest: {sum(t['status'] != 'missing' for t in tiles)} tile(s) with data", file=sys.stderr)


if __name__ == "__main__":
    main()
