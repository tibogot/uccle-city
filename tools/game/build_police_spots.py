"""POLICE GAME spots (docs/POLICE_GAME.md): real places for the police jobs, from data already in the repo.

  speed     the speed-limit signs of the street kit (data/streetkit/<T>.json: C43 30 / 50 / 70 posts, F4a zone-30
            entries; tools/streetkit/build_streetkit.py placed them from OSM maxspeed changes + traffic_sign nodes),
            each with the street it stands on (data/roads/network.json, the nearest named road) and its limit
  junction  junctions of two differently named through roads (primary / secondary / tertiary / residential with a
            tertiary or better), French names (the Brussels "NL - FR" names split), for the accident job

-> data/game/police_spots.json   (only tiles of data/tiles/manifest.json that are built; the game filters again)
Run: python tools/game/build_police_spots.py
"""
import json, math, glob, os, re

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
FR = re.compile(r"^(Rue|Avenue|Chauss|Place|Boulevard|Dr[eè]ve|Square|Chemin|Clos|All[ée]e|Vieux|Vieille|Parvis|Rond|Carrefour|Sentier|Petite|Quai|Impasse)", re.I)


def fr(name):
    if not name:
        return None
    parts = [p.strip() for p in name.split(" - ")]
    for p in parts:
        if FR.match(p):
            return p
    return parts[-1]


def main():
    man = json.load(open(os.path.join(ROOT, "data/tiles/manifest.json"), encoding="utf-8"))
    built = [t["bounds"] for t in man["tiles"] if t.get("status") != "missing"]
    inb = lambda x, z: any(b["x"][0] <= x < b["x"][1] and b["z"][0] <= z < b["z"][1] for b in built)
    net = json.load(open(os.path.join(ROOT, "data/roads/network.json"), encoding="utf-8"))
    nodes = {n["id"]: n for n in net["nodes"]}
    roads = []
    for r in net["roads"]:
        m = r["meta"]
        a, b = nodes.get(r["a"]), nodes.get(r["b"])
        if not a or not b:
            continue
        pts = [(a["x"], a["z"])] + [(p[0], p[1]) for p in r.get("pts", []) if isinstance(p, (list, tuple))] + [(b["x"], b["z"])]
        roads.append({"a": r["a"], "b": r["b"], "hw": m.get("highway"), "name": fr(m.get("name")), "speed": m.get("maxspeed"), "pts": pts})

    def nearest_road(x, z):
        best, bd = None, 25.0
        for r in roads:
            if not r["name"]:
                continue
            p = r["pts"]
            for i in range(1, len(p)):
                ax, az = p[i - 1]; dx, dz = p[i][0] - ax, p[i][1] - az
                L2 = dx * dx + dz * dz or 1e-9
                u = max(0, min(1, ((x - ax) * dx + (z - az) * dz) / L2))
                d = math.hypot(ax + dx * u - x, az + dz * u - z)
                if d < bd:
                    bd, best = d, r
        return best

    MAIN = {"primary", "secondary", "tertiary"}
    speed = []
    for f in sorted(glob.glob(os.path.join(ROOT, "data/streetkit/*.json"))):
        d = json.load(open(f, encoding="utf-8"))
        for s in d.get("signs", []):
            for p in s["plates"]:
                c = p["code"]
                if not (c.startswith("C43_") or c == "F4a") or not inb(s["x"], s["z"]):
                    continue
                lim = 30 if c == "F4a" else int(c[4:])
                if lim < 30:
                    continue
                r = nearest_road(s["x"], s["z"])
                if not r or not FR.match(r["name"]) or r["hw"] not in MAIN | {"residential", "unclassified"}:
                    continue
                speed.append({"x": round(s["x"], 1), "z": round(s["z"], 1), "yaw": s["yaw"], "code": c, "limit": lim, "street": r["name"], "hw": r["hw"]})
    ends = {}
    for r in roads:
        if r["hw"] not in MAIN | {"residential", "unclassified"} or not r["name"]:
            continue
        for k in (r["a"], r["b"]):
            ends.setdefault(k, []).append(r)
    junction, seen = [], []
    for nid, rs in ends.items():
        names = {r["name"] for r in rs if FR.match(r["name"])}      # (both French street names: no NL / FR pair)
        if len(names) < 2 or not any(r["hw"] in MAIN for r in rs):
            continue
        n = nodes[nid]
        if not inb(n["x"], n["z"]) or any(math.hypot(n["x"] - x, n["z"] - z) < 60 for x, z in seen):
            continue
        seen.append((n["x"], n["z"]))
        nm = sorted(names, key=lambda s: (0 if any(r["hw"] in MAIN and r["name"] == s for r in rs) else 1, s))[:2]
        junction.append({"x": round(n["x"], 1), "z": round(n["z"], 1), "name": f"{nm[0]} / {nm[1]}", "main": sum(1 for r in rs if r["hw"] in MAIN)})
    out = {"source": "data/streetkit (C43 / F4a signs), data/roads/network.json (OSM roads)", "speed": speed, "junction": junction}
    p = os.path.join(ROOT, "data/game/police_spots.json")
    json.dump(out, open(p, "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    print(f"{len(speed)} speed spots, {len(junction)} junctions -> {p} ({os.path.getsize(p) // 1024} KB)")


if __name__ == "__main__":
    main()
