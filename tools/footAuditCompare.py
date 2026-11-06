"""cmp.py before.json after.json cols [out.md]  cols: key:label:decimals:worst(max|min),...  -> worst over fps per surface"""
import sys, json
def load(p):
    rows = json.load(open(p, encoding="utf-8"))
    out = {}
    for r in rows: out.setdefault(r["name"], []).append(r)
    return out
b, a = load(sys.argv[1]), load(sys.argv[2])
cols = [c.split(":") for c in sys.argv[3].split(",")]
lines = ["| surface | " + " | ".join(c[1] for c in cols) + " |", "|---|" + "---|" * len(cols)]
for name, rs in a.items():
    cells = []
    for key, label, d, worst in cols:
        f = min if worst == "min" else max
        va = f(r.get(key, 0) for r in rs)
        if name in b and key in b[name][0]:
            vb = f(r.get(key, 0) for r in b[name]); cells.append(f"{vb:.{d}f} → **{va:.{d}f}**")
        else: cells.append(f"**{va:.{d}f}**")
    lines.append(f"| {name} | " + " | ".join(cells) + " |")
txt = "\n".join(lines); print(txt)
if len(sys.argv) > 4: open(sys.argv[4], "w", encoding="utf-8").write(txt + "\n")
