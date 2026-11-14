"""Ship texture-factory tree sets into the tree-texture library (viewer/trees/textures/ + tree_textures.json), the
format viewer/treeTextures.js loads (loadLeafAtlas / loadBarkScan). The factory's outputs are git-ignored; the
shipped copies are committed, like the CC0 tree scans.

    python -E tools/trees/ship_factory_tree_textures.py leaf_copperbeech bark_copperbeech:a

leaf_<sp>: every season the factory built (summer = leaf_<sp>, then leaf_<sp>_spring / _autumn / _winter), all
sharing leaf_<sp>_n.ktx2 (manifest field n_file) unless
the factory gave a season its own (leaf_<sp>_<season>_n.ktx2). bark_<sp>:<variant>: the 1K KTX2 pair as bark_tf_<sp>_*.
"""
import json
import os
import shutil
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
GEN = os.path.join(ROOT, "viewer", "materials", "generated")
DST = os.path.join(ROOT, "viewer", "trees", "textures")
MAN = os.path.join(DST, "tree_textures.json")


def main():
    gen = json.load(open(os.path.join(GEN, "generated.json"), encoding="utf-8"))
    man = json.load(open(MAN, encoding="utf-8"))
    for arg in sys.argv[1:]:
        if arg.startswith("leaf_"):
            name = arg
            n_src = os.path.join(GEN, "trees", f"{name}_n.ktx2")
            shutil.copyfile(n_src, os.path.join(DST, f"{name}_n.ktx2"))
            for tag in ["", "_spring", "_autumn", "_winter"]:
                e = gen.get(f"tf_{name}{tag}")
                if not e:
                    continue
                shutil.copyfile(os.path.join(GEN, "trees", f"{name}{tag}_a.ktx2"), os.path.join(DST, f"{name}{tag}_a.ktx2"))
                # a season with its own normal + thickness (the horse chestnut's spring candles, its bare winter)
                n_file = os.path.basename(e.get("n_file") or f"{name}_n.ktx2")
                if n_file != f"{name}_n.ktx2":
                    shutil.copyfile(os.path.join(GEN, "trees", n_file), os.path.join(DST, n_file))
                man["leaves"][f"{name}{tag}"] = {
                    "what": f"{name[5:]} spray, {e['season']} (texture factory, tools/texturefactory/materials/leaves.py)",
                    "licence": "CC0 (generated)", "source": e["url"], "season": e["season"], "px": e["px"],
                    "coverage": e["coverage"], "mean_albedo_linear": e["mean_albedo_linear"], "mean_thickness": e["mean_thickness"],
                    "a_ktx2_bytes": e["a_ktx2_bytes"], "n_ktx2_bytes": e["n_ktx2_bytes"], "n_file": n_file}
                print("leaf", f"{name}{tag}")
        elif arg.startswith("bark_"):
            mat, var = (arg.split(":") + ["a"])[:2]
            e = gen[f"tf_{mat}_{var}_1k"]
            sid = f"tf_{mat[5:]}"
            for m in ("albedo", "nra"):
                shutil.copyfile(os.path.join(GEN, mat, var, f"{mat}_1k_{m}.ktx2"), os.path.join(DST, f"bark_{sid}_{m}.ktx2"))
            man["bark"][sid] = {
                "what": e["note"], "licence": "CC0 (generated)", "source": e["url"], "size_m": e["size_m"], "px": e["px"],
                "mean_albedo_linear": e["mean_albedo_linear"], "mean_roughness": e["mean_roughness"],
                "albedo_ktx2_bytes": e["albedo_ktx2_bytes"], "nra_ktx2_bytes": e["nra_ktx2_bytes"]}
            print("bark", sid)
    json.dump(man, open(MAN, "w", encoding="utf-8"), indent=1)


if __name__ == "__main__":
    main()
