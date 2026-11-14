"""Items (places) of a cityAudit result, optionally only tiles / kinds; marks the ones also in a baseline (within 3 m).
    python tools/roadfix/items.py after.json [--base before.json] [--tiles G2,D6] [--walk|--drive]"""
import json, sys, math
args = sys.argv[1:]
f = args[0]
base = args[args.index("--base") + 1] if "--base" in args else None
tiles = set(args[args.index("--tiles") + 1].split(",")) if "--tiles" in args else None
mode = "walk" if "--walk" in args else "drive" if "--drive" in args else None
def items(p):
    out = []
    for r in json.load(open(p)):
        if tiles and r["tile"] not in tiles: continue
        for i in r.get("items", []):
            if i["k"] == "blocked": continue
            if mode == "walk" and not i.get("walk"): continue
            if mode == "drive" and i.get("walk"): continue
            out.append((r["tile"], i))
    return out
B = items(base) if base else []
for t, i in items(f):
    old = any(t2 == t and i2["k"] == i["k"] and bool(i2.get("walk")) == bool(i.get("walk")) and math.hypot(i2["x"] - i["x"], i2["z"] - i["z"]) < 3 for t2, i2 in B)
    w = i.get("why") or {}
    print(("   " if old else "NEW"), t, "walk" if i.get("walk") else "drive", i["k"], i["x"], i["z"], i.get("r"), i.get("c"), i.get("d"), "y", w.get("y"), "ring", w.get("ring"), "deck", w.get("deck"), "terr", w.get("terr"), "dtm", w.get("dtm"), (w.get("hits") or [])[:3])
