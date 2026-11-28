"""The kid look's data maps -> KTX2 (docs/KIDCHAR.md phase 6):

    python -E tools/kid/kidLookPack.py

  in   models/characters/kidA_detail.png (1024 x 640) + kid_fabric.png (512 x 512), from tools/blender/kidLookBake.py
       (both git-ignored)
  out  models/characters/kidA_detail.ktx2 + kid_fabric.ktx2: LINEAR RGBA (data, not colour), UASTC q2 + zstd 18, all
       mips (box filtered by ktx: the micro relief fades out with distance instead of sparkling)
Needs KTX-Software's `ktx` (KTX_EXE overrides the path).
"""
import os, subprocess

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
CH = os.path.join(ROOT, "models", "characters")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
for name, wrap in (("kidA_detail", "clamp"), ("kid_fabric", "wrap")):
    src, dst = os.path.join(CH, name + ".png"), os.path.join(CH, name + ".ktx2")
    subprocess.run([KTX, "create", "--format", "R8G8B8A8_UNORM", "--assign-tf", "linear", "--encode", "uastc", "--uastc-quality", "2",
                    "--zstd", "18", "--generate-mipmap", "--mipmap-wrap", wrap, src, dst], check=True)
    print(dst, os.path.getsize(dst) // 1024, "KB")
