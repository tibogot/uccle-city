"""Register the texture factory's sets as Material Lab candidates: ADD / refresh entries in
viewer/materials/candidates.json (ids tf_*), never touching the other entries (the scan candidates are maintained by
tools/textures/candidates.py, which keeps unknown entries and sorts them after its own). Idempotent: run it again
after a merge conflict in candidates.json (take the other side, then re-run this).

    python -I tools/texturefactory/register.py [--res 1k,2k] [--remove]

Only sets whose files exist (WebP or KTX2) are registered. Tree sets (category "tree") are not lab candidates: they
stay in generated.json only (the Tree Textures lab reads them from there).
"""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tf.bake import OUT_WEB, WT  # noqa: E402

CAND = os.path.join(WT, "viewer", "materials", "candidates.json")
KEYS = ("id", "source", "name", "licence", "kind", "url", "size_m", "px", "note", "lattice", "mean_albedo_linear",
        "mean_roughness", "lum_std", "files", "albedo_webp_bytes", "nra_webp_bytes", "albedo_ktx2_bytes", "nra_ktx2_bytes",
        "variant", "seed")


def main():
    res = sys.argv[sys.argv.index("--res") + 1].split(",") if "--res" in sys.argv else ["1k", "2k"]
    remove = "--remove" in sys.argv
    gen = json.load(open(os.path.join(OUT_WEB, "generated.json")))
    raw = open(CAND, encoding="utf8").read()
    man = json.loads(raw)
    n_add = n_upd = 0
    for mat, lst in man["materials"].items():
        man["materials"][mat] = [c for c in lst if not (c["id"].startswith("tf_") and (remove or c["id"] not in gen))]
    if not remove:
        for cid, e in sorted(gen.items()):
            if e.get("category", "surface") != "surface" or not any(cid.endswith("_" + r) for r in res):
                continue
            base = os.path.join(WT, "viewer", "materials", e["files"])
            if not (os.path.exists(base + "_albedo.webp") or os.path.exists(base + "_albedo.ktx2")):
                continue
            entry = {k: e[k] for k in KEYS if k in e}
            entry["current"] = False
            lst = man["materials"].setdefault(e["material"], [])
            i = next((j for j, c in enumerate(lst) if c["id"] == cid), None)
            if i is None:
                lst.append(entry)
                n_add += 1
            else:
                lst[i] = entry
                n_upd += 1
    json.dump(man, open(CAND, "w", encoding="utf8"), indent=1)
    print(f"candidates.json: {n_add} added, {n_upd} refreshed" + (" (tf_* removed)" if remove else ""))


if __name__ == "__main__":
    main()
