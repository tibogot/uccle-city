"""Totals + per-tile changes of two debug/cityAudit.js result files (road fix round 2).
    python tools/roadfix/compare.py before.json after.json"""
import json, sys
K = [("invisibleHits", "invisible hits"), ("stuck", "stuck on nothing drawn"), ("fell", "under the drawn surface (samples)"),
     ("floated", "over the drawn surface (samples)"), ("passThrough", "passed through drawn solids")]
def load(p):
    return {r["tile"]: r for r in json.load(open(p))}
A, B = load(sys.argv[1]), load(sys.argv[2])
for mode in ("drive", "walk"):
    print(f"\n{mode}: | check | before | after |")
    for k, lab in [("routes", "routes"), ("km", "km")] + K:
        a = sum((r.get(mode) or {}).get(k, 0) for r in A.values()); b = sum((r.get(mode) or {}).get(k, 0) for r in B.values())
        print(f"| {lab} | {round(a, 1)} | {round(b, 1)} |")
    print("per tile (changed):")
    for t in sorted(set(A) | set(B)):
        a, b = (A.get(t, {}).get(mode) or {}), (B.get(t, {}).get(mode) or {})
        d = {k: (a.get(k, 0), b.get(k, 0)) for k, _ in K if a.get(k, 0) != b.get(k, 0)}
        if d: print("  ", t, " ".join(f"{k} {x}->{y}" for k, (x, y) in d.items()))
errs = [t for t, r in B.items() if r.get("error") or r.get("missingNeighbours")]
print("errors / missing neighbours after:", errs)
