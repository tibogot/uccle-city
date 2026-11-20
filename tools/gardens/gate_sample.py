"""THE STREET VIEW REFERENCE SAMPLE of the front-gates job (docs/GATES.md section 2): ~40 house frontages picked from the
census's frontage list (tools/audit/census/gates.mjs --list), by street and house type, deterministic, with their
WGS84 coordinates for a look-only Street View check in the browser turn.

    node --import ./tools/road_audit/register.mjs tools/audit/census/gates.mjs --all --list --out docs/census/gates_list.json
    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/gardens/gate_sample.py docs/census/gates_list.json [old.json]

Prints a markdown table (one row a frontage: what we draw now, and with ?gates=old when a second list is given).
"""
import json, sys, zlib
from pathlib import Path
from pyproj import Transformer

ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(ROOT / "pipeline"))
from common import L72, local_to_l72  # noqa: E402

TO_WGS = Transformer.from_crs(L72, "EPSG:4326", always_xy=True)
# (group, street substrings, house types, how many)
PICKS = [
    ("villas, Fort-Jaco", ["Fort Jaco", "Fort-Jaco", "Jacques Pastur", "Avenue de la Sapinière", "Avenue du Fort-Jaco", "Avenue Prince de Ligne", "Chemin du Puits"], ("villa",), 6),
    ("villas, Prince d'Orange", ["Prince d'Orange", "Avenue de l'Échevinage", "Avenue des Hospices", "Avenue Bel-Air", "Avenue Hamoir"], ("villa",), 6),
    ("villas, Observatoire", ["Observatoire", "Avenue Circulaire", "Avenue Paul Stroobant", "Avenue Houzeau", "Avenue Brugmann"], ("villa", "terraced"), 6),
    ("rows, Saint-Job", ["Saint-Job", "Rue Jean Benaets", "Rue Basse", "Montagne de Saint-Job", "Rue du Ham", "Chaussée de Saint-Job"], ("terraced",), 6),
    ("rows, Vanderkindere", ["Vanderkindere", "Rue Joseph Bens", "Avenue Coghen", "Rue de Boetendael", "Rue Victor Allard", "Avenue Molière"], ("terraced",), 6),
    ("rows, Calevoet", ["Calevoet", "Rue de Linkebeek", "Rue Égide Van Ophem", "Rue du Bourdon", "Rue Zandbeek", "Chaussée de Drogenbos"], ("terraced",), 5),
    ("apartment blocks", [""], ("apartment",), 5),
]


def key(f):
    return zlib.crc32(f"{f[0]}|{f[1]}|{f[2]}".encode())


def main():
    cur = json.loads(Path(sys.argv[1]).read_text(encoding="utf-8"))["fronts"]
    old = {}
    if len(sys.argv) > 2:
        for f in json.loads(Path(sys.argv[2]).read_text(encoding="utf-8"))["fronts"]: old[(f[0], round(f[1]), round(f[2]))] = f
    used, rows = set(), []
    for grp, streets, types, n in PICKS:
        cand = [f for f in cur if f[4] in types and any(s in f[3] for s in streets) and f[6] >= 1.0 and f[7] >= 5.0]
        cand.sort(key=key)
        got, seen_street = [], {}
        for f in cand:
            k = (f[0], round(f[1]), round(f[2]))
            if k in used or seen_street.get(f[3], 0) >= 2: continue
            used.add(k); seen_street[f[3]] = seen_street.get(f[3], 0) + 1; got.append(f)
            if len(got) >= n: break
        for f in got: rows.append((grp, f))
    PATH = {0: "-", 1: "gate", 2: "no gate"}
    DRIVE = {0: "-", 1: "gate", 2: "open"}
    print("| # | group | street | type | at (local x, z) | lat, lon | gap m | ours: line | path | drive | ?gates=old: line / path / drive | Street View |")
    print("|---|---|---|---|---|---|---|---|---|---|---|---|")
    for i, (grp, f) in enumerate(rows, 1):
        T, x, z, street, typ, kind, gap, w, pg, dg = f
        e, n_ = local_to_l72(x, z)
        lon, lat = TO_WGS.transform(e, n_)
        o = old.get((T, round(x), round(z)))
        ol = f"{o[5]} / {PATH[o[8]]} / {DRIVE[o[9]]}" if o else "(not matched)"
        print(f"| {i} | {grp} | {street.split(' - ')[0]} | {typ} | {T} {x}, {z} | {lat:.6f}, {lon:.6f} | {gap} | {kind} | {PATH[pg]} | {DRIVE[dg]} | {ol} | (browser turn) |")


if __name__ == "__main__":
    main()
