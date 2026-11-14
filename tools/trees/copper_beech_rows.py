"""The copper beeches of Uccle's regional roads for the Tree Lab (docs/trees/COPPER_BEECH.md): from the Bruxelles
Mobilité street-tree inventory (CC0; data/raw/trees/bm_trees_uccle.json, git-ignored, see docs/trees/SPECIES_DATA.md)
to data/trees/bm_copper_beech.json: the live 'Atropunicea' trees with their position (m, EPSG:31370 minus the
centroid; x = east, z = south as the lab's frame), height class (m), crown diameter (m) and trunk circumference (cm).

    python -E tools/trees/copper_beech_rows.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = json.load(open(os.path.join(ROOT, "data", "raw", "trees", "bm_trees_uccle.json"), encoding="utf-8"))
live = [f for f in src["features"] if "Atropunicea" in str(f["properties"]["essence"]) and f["properties"]["status"] == "en vie"]
cx = sum(f["geometry"]["coordinates"][0] for f in live) / len(live)
cy = sum(f["geometry"]["coordinates"][1] for f in live) / len(live)
trees = []
for f in live:
    p, (x, y) = f["properties"], f["geometry"]["coordinates"][:2]
    trees.append([round(x - cx, 2), round(-(y - cy), 2), p["hauteur"], float(p["crown_diam"]), p["circumference"]])
out = {"source": "Bruxelles Mobilité, bm_public_space:trees (CC0), commune UCCLE, essence Fagus sylvatica 'Atropunicea', status 'en vie'",
       "origin_31370": [round(cx, 2), round(cy, 2)], "fields": ["x", "z", "height_m", "crown_diam_m", "circumference_cm"],
       "streets": sorted({f["properties"]["voirie"].replace('DrFffdve', 'Drève').replace('HFffdros', 'Héros') for f in live}), "trees": trees}
os.makedirs(os.path.join(ROOT, "data", "trees"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "data", "trees", "bm_copper_beech.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
xs = [t[0] for t in trees]; zs = [t[1] for t in trees]
print(len(trees), "trees, extent", round(max(xs) - min(xs)), "x", round(max(zs) - min(zs)), "m")
