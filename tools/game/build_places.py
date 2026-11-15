"""Bake data/game/places.json: the named shops / cafes / restaurants / pharmacies / banks of the built tiles (OSM points
already in data/tiles/*/features.json), for the game kit's random missions (viewer/game/gamePlaces.js, docs/GAMEKIT.md).
Real data only: name, OSM id, kind (OSM shop=* or amenity=*), position (city metres, x east, z south), tile.
Run from the repo root: python tools/game/build_places.py
"""
import glob, json, os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SKIP = {"vacant", "yes"}
out = []
seen = set()
for fn in sorted(glob.glob(os.path.join(ROOT, "data", "tiles", "*", "features.json"))):
    tile = os.path.basename(os.path.dirname(fn))
    f = json.load(open(fn, encoding="utf-8"))
    for p in f.get("points", []):
        if p.get("kind") != "shop":
            continue
        t = p.get("tags", {})
        name = t.get("name")
        kind = t.get("shop") or t.get("amenity")
        if not name or not kind or kind in SKIP or p["id"] in seen:
            continue
        seen.add(p["id"])
        out.append([p["id"], name, kind, round(p["x"], 1), round(p["z"], 1), tile])
out.sort(key=lambda r: r[0])
doc = {
    "about": "Named shops / cafes / restaurants of the built tiles (OSM, via data/tiles/*/features.json points) for the game kit's missions. Baked by tools/game/build_places.py; rows: [osm id, name, kind (shop=* or amenity=*), x, z, tile].",
    "credits": "(c) OpenStreetMap contributors, ODbL",
    "fields": ["id", "name", "kind", "x", "z", "tile"],
    "shops": out,
}
dst = os.path.join(ROOT, "data", "game", "places.json")
os.makedirs(os.path.dirname(dst), exist_ok=True)
json.dump(doc, open(dst, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
print(f"{len(out)} places -> {dst} ({os.path.getsize(dst)} bytes)")
