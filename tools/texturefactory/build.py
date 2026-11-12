"""PROCEDURAL TEXTURE FACTORY: scripted, offline generators -> tileable PBR sets baked like scans (docs/TEXTURE_FACTORY.md).

    python -I tools/texturefactory/build.py [material[:variant] ...] [--size 2048] [--quick] [--list]
    cd tools/texturefactory && npm install && node encode.mjs          # KTX2 (UASTC + zstd) of what build wrote
    python -I tools/texturefactory/register.py                         # add / refresh the entries in candidates.json

Writes per material / variant: 2K sources to data/raw/texfactory/out/<mat>/<variant>/ (git-ignored), WebP fallbacks
(1K + 2K) to viewer/materials/generated/<mat>/<variant>/ (git-ignored, like the scan candidates), raw RGBA for the
KTX2 encoder, and viewer/materials/generated/generated.json (committed: the manifest, scans.json style).
--quick: 1024 px sources, no WebP / KTX2 work files, preview only (for tuning).
Deterministic: the same seed gives the same images (numpy PCG64 streams keyed by [seed, k]).
"""
import json
import os
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

from tf.core import Tex                      # noqa: E402
from tf import bake                          # noqa: E402
from materials import REGISTRY               # noqa: E402

MANIFEST = os.path.join(bake.OUT_WEB, "generated.json")


def main():
    args = sys.argv[1:]
    size = int(args[args.index("--size") + 1]) if "--size" in args else 2048
    quick = "--quick" in args
    if quick and "--size" not in args:
        size = 1024
    sel = [a for i, a in enumerate(args) if not a.startswith("--") and (i == 0 or args[i - 1] != "--size")]
    if "--list" in args:
        for m, d in REGISTRY.items():
            print(m, d["size_m"], "m:", ", ".join(f"{k} ({v['note']})" for k, v in d["variants"].items()))
        return
    man = json.load(open(MANIFEST)) if os.path.exists(MANIFEST) else {}
    for mat, d in REGISTRY.items():
        for var, v in d["variants"].items():
            if sel and mat not in sel and f"{mat}:{var}" not in sel:
                continue
            t0 = time.time()
            T = Tex(size, d["size_m"], v["seed"])
            maps = v["build"](T)
            meta = {"material": mat, "variant": var, "seed": v["seed"], "size_m": d["size_m"], "note": v["note"],
                    "lattice": v.get("lattice")}
            if quick:
                import cv2
                src = os.path.join(bake.RAW, "quick")
                os.makedirs(src, exist_ok=True)
                prev = bake.lit_preview(maps)
                cv2.imwrite(os.path.join(src, f"{mat}_{var}.png"), cv2.cvtColor(prev, cv2.COLOR_RGB2BGR))
                alb = bake._u8(bake.lin_to_srgb(maps["albedo"]))
                cv2.imwrite(os.path.join(src, f"{mat}_{var}_albedo.png"), cv2.cvtColor(alb, cv2.COLOR_RGB2BGR))
                print(f"{mat}:{var} quick {time.time() - t0:.1f}s  {bake.stats(maps)}")
                continue
            st, entries = bake.write(mat, var, maps, meta)
            for tag, e in entries.items():
                cid = f"tf_{mat}_{var}_{tag}"
                old = man.get(cid, {})
                man[cid] = {"material": mat, "source": "texfactory", "id": cid, "name": f"Factory {mat.split('_')[0]} {var} {tag.upper()}",
                            "licence": "CC0 (generated)", "kind": "cc0", "variant": var, "seed": v["seed"],
                            "size_m": d["size_m"], "lattice": v.get("lattice"), "note": f"generated: {v['note']}",
                            "url": f"tools/texturefactory (materials/{REGISTRY[mat]['module']}.py, seed {v['seed']})",
                            **st, **e,
                            **{k: old[k] for k in ("albedo_ktx2_bytes", "nra_ktx2_bytes") if k in old and old.get("px") == e["px"]}}
            json.dump(dict(sorted(man.items())), open(MANIFEST, "w"), indent=1)
            print(f"{mat}:{var} {size}px {time.time() - t0:.1f}s mean {st['mean_albedo_linear']} rough {st['mean_roughness']}")


if __name__ == "__main__":
    main()
