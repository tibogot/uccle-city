"""Roof statistics over the city tiles (docs/assets/ROOFS.md): flat vs pitched roof area, building classes.
   python tools/roofs/roofStats.py [tiles...]"""
import json, struct, sys, os, math, collections
import numpy as np
ROOT = os.path.join(os.path.dirname(__file__), "..", "..", "data", "tiles")
def load(t):
    d = json.load(open(os.path.join(ROOT, t, "buildings.json")))
    raw = open(os.path.join(ROOT, t, "buildings.bin"), "rb").read()
    V, T = struct.unpack_from("<II", raw, 0)
    P = np.frombuffer(raw, "<f4", 3 * V, 8).reshape(-1, 3)
    I = np.frombuffer(raw, "<u4", 3 * T, 8 + 12 * V).reshape(-1, 3)
    return d, P, I
tiles = sys.argv[1:] or sorted(x for x in os.listdir(ROOT) if os.path.isdir(os.path.join(ROOT, x)))
S = collections.Counter()
for t in tiles:
    d, P, I = load(t)
    for b in d["buildings"]:
        r = b["roof"]; tri = I[r["first"]:r["first"] + r["count"]]
        if not len(tri): continue
        a, bb, c = P[tri[:, 0]], P[tri[:, 1]], P[tri[:, 2]]
        n = np.cross(bb - a, c - a); A = np.linalg.norm(n, axis=1) / 2; ny = np.abs(n[:, 1]) / (np.linalg.norm(n, axis=1) + 1e-9)
        flat = A[ny > 0.97].sum(); pit = A[ny <= 0.97].sum()
        tot = flat + pit
        if tot < 15: S["small_area"] += tot; S["small_n"] += 1; continue
        h = b["height"]
        cls = "flat" if flat / tot > 0.8 else "pitched" if pit / tot > 0.8 else "mixed"
        key = cls + ("_tall" if h > 14 else "")
        S[key + "_n"] += 1; S[key + "_area"] += tot; S["flatA"] += flat; S["pitA"] += pit
for k in sorted(S): print(k, round(S[k]))
