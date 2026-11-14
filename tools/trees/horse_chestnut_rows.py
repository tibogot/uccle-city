"""The horse chestnuts of Uccle's regional roads for the Tree Lab (docs/trees/HORSE_CHESTNUT.md): from the Bruxelles
Mobilité street-tree inventory (CC0; data/raw/trees/bm_trees_uccle.json, git-ignored, see docs/trees/SPECIES_DATA.md)
to data/trees/bm_horse_chestnut.json: the live Aesculus hippocastanum trees (276: Avenue Winston Churchill 233,
Avenue de Fré 41, Chaussée d'Alsemberg 2; the 4 red horse chestnuts, Aesculus x carnea, of the Avenue Brugmann left out) with their position (m,
EPSG:31370 minus the centroid; x = east, z = south as the lab's frame), height class (m), crown diameter (m), trunk
circumference (cm) and street index.

    python -E tools/trees/horse_chestnut_rows.py
"""
import json
import os

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
src = json.load(open(os.path.join(ROOT, "data", "raw", "trees", "bm_trees_uccle.json"), encoding="utf-8"))
live = [f for f in src["features"] if f["properties"]["essence"] == "Aesculus hippocastanum" and f["properties"]["status"] == "en vie"]
cx = sum(f["geometry"]["coordinates"][0] for f in live) / len(live)
cy = sum(f["geometry"]["coordinates"][1] for f in live) / len(live)
# the inventory's street names lost their accents (latin-1 read as utf-8): spelled out here
FIX = {"Churchill": "Avenue Winston Churchill", "Fr": "Avenue de Fré", "Brugmann": "Avenue Brugmann", "Alsemberg": "Chaussée d'Alsemberg"}
name = lambda v: next((n for k, n in FIX.items() if v.startswith(k)), v)
streets = sorted({name(f["properties"]["voirie"]) for f in live})
trees = []
for f in live:
    p, (x, y) = f["properties"], f["geometry"]["coordinates"][:2]
    trees.append([round(x - cx, 2), round(-(y - cy), 2), p["hauteur"], float(p["crown_diam"]), p["circumference"], streets.index(name(p["voirie"]))])
out = {"source": "Bruxelles Mobilité, bm_public_space:trees (CC0), commune UCCLE, essence Aesculus hippocastanum, status 'en vie'",
       "origin_31370": [round(cx, 2), round(cy, 2)], "fields": ["x", "z", "height_m", "crown_diam_m", "circumference_cm", "street"],
       "streets": streets, "trees": trees}
os.makedirs(os.path.join(ROOT, "data", "trees"), exist_ok=True)
json.dump(out, open(os.path.join(ROOT, "data", "trees", "bm_horse_chestnut.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
xs = [t[0] for t in trees]; zs = [t[1] for t in trees]
print(len(trees), "trees, extent", round(max(xs) - min(xs)), "x", round(max(zs) - min(zs)), "m;", {s: sum(1 for t in trees if t[5] == i) for i, s in enumerate(streets)})
