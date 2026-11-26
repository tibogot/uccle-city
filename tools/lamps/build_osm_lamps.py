"""OSM STREET LAMPS (claude/reality2, rule lamps-from-osm, class C7 of docs/REALITY_ROUND_2026-11-26.md).

viewer/lamps.js places lamps along every road at its type's spacing ("OSM has (almost) none"); the city's own OSM
extract now has 243 highway=street_lamp nodes. This writes them as local points for the viewer: a road with >= 2 OSM
lamps along it takes the OSM positions (snapped onto its sidewalk by viewer/streetFit.js placeLamp) instead of the
generated ones; lamp_mount=wall / bent_mast / straight_mast is kept.

  python tools/lamps/build_osm_lamps.py      -> data/lamps/osm_lamps.json (OpenStreetMap contributors, ODbL)
"""
import json, sys
from pathlib import Path
ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT / "pipeline"))
from common import L72_PROJ4, ORIGIN_E, ORIGIN_N  # noqa: E402
from pyproj import Transformer  # noqa: E402

a = json.loads((ROOT / "data" / "raw" / "osm" / "area.json").read_text(encoding="utf8"))
tf = Transformer.from_crs("EPSG:4326", L72_PROJ4, always_xy=True)
out = []
for e in a["elements"]:
    t = e.get("tags") or {}
    if e.get("type") != "node" or t.get("highway") != "street_lamp":
        continue
    x, y = tf.transform(e["lon"], e["lat"])
    out.append({"id": f"osm:n{e['id']}", "x": round(x - ORIGIN_E, 2), "z": round(ORIGIN_N - y, 2), **({"mount": t["lamp_mount"]} if t.get("lamp_mount") else {})})
(ROOT / "data" / "lamps").mkdir(parents=True, exist_ok=True)
(ROOT / "data" / "lamps" / "osm_lamps.json").write_text(json.dumps({"_doc": "claude/reality2 rule lamps-from-osm: OSM highway=street_lamp (ODbL), tools/lamps/build_osm_lamps.py", "lamps": out}, separators=(",", ":")), encoding="utf8")
print(len(out), "OSM street lamps")
