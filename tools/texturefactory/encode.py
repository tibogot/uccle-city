"""KTX2 (Basis UASTC + Zstandard, mipmapped) for the texture factory's sets, the shipped scans' settings (UASTC level 2
+ RDO: albedo lambda 1.0, nra 0.5), with KTX-Software's native `ktx create` (multithreaded; the wasm encoder of
tools/textures/encode_ktx2.mjs took ~25 s per 1K map).

    python -E -P tools/texturefactory/encode.py [--2k] [--all2k] [--fast] [filter ...]

Default: every 1K map (the Material Lab candidates, like the scans). --2k: also the 2K maps of each material's
variant "a" (cost / quality reference); --all2k: every 2K map. --fast: level 1 without RDO (review rounds).
Reads data/raw/texfactory/_work/tf_<mat>_<variant>_<1k|2k>_<albedo|nra>.png (+ .json), writes the .ktx2 next to the
WebP in viewer/materials/generated/<mat>/<variant>/, records the byte sizes in generated.json. Skips up-to-date maps.
Needs C:/Program Files/KTX-Software/bin/ktx.exe (or KTX_EXE).
"""
import glob
import json
import os
import subprocess
import sys
import time

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tf.bake import WORK, OUT_WEB  # noqa: E402

KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
MAN = os.path.join(OUT_WEB, "generated.json")


def main():
    args = sys.argv[1:]
    fast = "--fast" in args
    two = "--2k" in args
    all2 = "--all2k" in args
    only = [a for a in args if not a.startswith("--")]
    man = json.load(open(MAN))
    for png in sorted(glob.glob(os.path.join(WORK, "tf_*.png"))):
        name = os.path.basename(png)[:-4]
        cid, role = name.rsplit("_", 1)
        tag = cid.rsplit("_", 1)[1]
        if only and not any(o in cid for o in only):
            continue
        if tag == "2k" and not (all2 or (two and cid.endswith("_a_2k"))):
            continue
        info = json.load(open(png + ".json"))
        out = info["out"]
        if os.path.exists(out) and os.path.getmtime(out) > os.path.getmtime(png):
            if cid in man:
                man[cid][f"{role}_ktx2_bytes"] = os.path.getsize(out)
            continue
        srgb = role == "albedo"
        cmd = [KTX, "create", "--format", "R8G8B8A8_SRGB" if srgb else "R8G8B8A8_UNORM", "--assign-tf", "srgb" if srgb else "linear",
               "--encode", "uastc", "--uastc-quality", "1" if fast else "2", "--zstd", "18", "--generate-mipmap"]
        if not fast:
            cmd += ["--uastc-rdo", "--uastc-rdo-l", "1.0" if srgb else "0.5"]
        t0 = time.time()
        os.makedirs(os.path.dirname(out), exist_ok=True)
        subprocess.run(cmd + [png, out], check=True, capture_output=True)
        if cid in man:
            man[cid][f"{role}_ktx2_bytes"] = os.path.getsize(out)
        print(f"{name}.ktx2  {os.path.getsize(out) / 1024:.0f} KB  {time.time() - t0:.1f}s", flush=True)
        json.dump(man, open(MAN, "w"), indent=1)
    json.dump(man, open(MAN, "w"), indent=1)


if __name__ == "__main__":
    main()
