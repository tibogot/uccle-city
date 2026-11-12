"""Per-tile table + totals of the collision runs (docs/collisions/README.md).
python docs/collisions/summarize.py docs/collisions/run_before.json docs/collisions/run_after.json > docs/collisions/per_tile.csv
"""
import json, sys

COLS = [("static", "invisible"), ("static", "missing"), ("drive", "invisibleHits"), ("drive", "passThrough"), ("drive", "fell"),
        ("drive", "floated"), ("drive", "stuck"), ("walk", "invisibleHits"), ("walk", "passThrough"), ("walk", "fell"), ("walk", "floated"), ("walk", "stuck")]


def load(p):
    d = json.load(open(p, encoding="utf-8"))
    return d.get("results", d)


def val(r, a, b):
    return (r.get(a) or {}).get(b, 0) or 0


runs = [load(p) for p in sys.argv[1:]]
names = sorted(set().union(*[set(r) for r in runs]))
head = ["tile"] + [f"{a}.{b}.{k}" for k in range(len(runs)) for a, b in COLS]
print(",".join(head))
tot = [[0] * len(COLS) for _ in runs]
for n in names:
    row = [n]
    for k, R in enumerate(runs):
        r = R.get(n, {})
        for j, (a, b) in enumerate(COLS):
            v = val(r, a, b); row.append(str(v)); tot[k][j] += v
    print(",".join(row))
print(",".join(["TOTAL"] + [str(v) for t in tot for v in t]))
for k, R in enumerate(runs):
    kinds = {}
    for r in R.values():
        for key, v in (r.get("static", {}).get("byKind") or {}).items(): kinds[key] = kinds.get(key, 0) + v
    print(f"# run {k}: tiles {len(R)}; static by kind: " + "; ".join(f"{a} {b}" for a, b in sorted(kinds.items())), file=sys.stderr)
    for mode in ("drive", "walk"):
        ks = {}
        for r in R.values():
            for it in (r.get(mode) or {}).get("items", []):
                key = f"{it['kind']} {it.get('collider') or it.get('drawn') or ''}".strip(); ks[key] = ks.get(key, 0) + 1
        print(f"#   {mode} items: " + "; ".join(f"{a} {b}" for a, b in sorted(ks.items(), key=lambda x: -x[1])), file=sys.stderr)
