"""The BMX's two textures (tools/blender/bmx.py --textures renders them as albedo x AO, alpha = coverage) -> KTX2:

    python tools/bike/bmx_textures.py

  in   docs/bike/tex/chain_side.png (512 x 256: two links = 25.4 x 12.7 mm, seen from the side, the chain's top up)
       docs/bike/tex/chain_top.png  (512 x 256: the same two links seen from above)
       docs/bike/tex/spokes.png     (1024 x 1024: one side's 18 spokes seen from outside, 0.41 x 0.41 m)
  out  docs/bike/tex/chain_atlas.png  the chain atlas (side view in the top half, top view in the bottom half; Blender's
                                      previews map it)
       models/bike/bmx_chain.ktx2   sRGB RGBA, UASTC + zstd; alpha mips COVERAGE-PRESERVING (alpha-tested: the strip
                                    never thins into holes far away), the colour bled under alpha 0
       models/bike/bmx_spokes.ktx2  sRGB RGBA, UASTC + zstd; plain box-filtered mips (a BLENDED card: the mip's alpha
                                    IS the spokes' coverage of the texel: the pre-filter of QUALITY_RULES 23)
Needs KTX-Software's `ktx` (KTX_EXE overrides the path).
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
sys.path.insert(0, os.path.join(ROOT, "tools", "christmas"))
from fir_needles_ktx2 import coverage_mips, box_mips, bleed   # (the fir's helpers: same rules)

TEX = os.path.join(ROOT, "docs", "bike", "tex")
OUT = os.path.join(ROOT, "models", "bike")
WORK = os.path.join(TEX, "_work")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")


def encode(name, rgb, alpha, coverage):
    rgb_b = bleed(rgb, alpha)
    a_lv = coverage_mips(np.clip(np.round(alpha), 0, 255).astype(np.uint8)) if coverage else [np.clip(np.round(a), 0, 255) for a in box_mips(alpha)]
    c_lv = box_mips(rgb_b)
    paths = []
    for i, (c, al) in enumerate(zip(c_lv, a_lv)):
        p = os.path.join(WORK, f"{name}_L{i}.png")
        Image.fromarray(np.clip(np.round(np.dstack([c, np.asarray(al, np.float32)])), 0, 255).astype(np.uint8), "RGBA").save(p)
        paths.append(p)
    dst = os.path.join(OUT, f"{name}.ktx2")
    subprocess.run([KTX, "create", "--format", "R8G8B8A8_SRGB", "--assign-tf", "srgb", "--encode", "uastc", "--uastc-quality", "2",
                    "--zstd", "18", "--levels", str(len(paths)), *paths, dst], check=True)
    print(name, rgb.shape[1], "x", rgb.shape[0], len(paths), "levels", os.path.getsize(dst) // 1024, "KB")


def main():
    os.makedirs(WORK, exist_ok=True)
    side = np.asarray(Image.open(os.path.join(TEX, "chain_side.png")).convert("RGBA"), np.float32)
    top = np.asarray(Image.open(os.path.join(TEX, "chain_top.png")).convert("RGBA"), np.float32)
    atlas = np.vstack([side, top])
    Image.fromarray(atlas.astype(np.uint8), "RGBA").save(os.path.join(TEX, "chain_atlas.png"))
    encode("bmx_chain", atlas[..., :3], atlas[..., 3].copy(), True)
    sp = np.asarray(Image.open(os.path.join(TEX, "spokes.png")).convert("RGBA"), np.float32)
    encode("bmx_spokes", sp[..., :3], sp[..., 3].copy(), False)


def sheet():
    """docs/bike/turntable.jpg: the 8 turntable frames (tools/blender/bmx.py --renders) in a 4 x 2 sheet"""
    ims = [Image.open(os.path.join(WORK, f"turntable_{i}.jpg")) for i in range(8)]
    w, h = ims[0].size
    out = Image.new("RGB", (w * 4, h * 2))
    for i, im in enumerate(ims): out.paste(im, ((i % 4) * w, (i // 4) * h))
    out.save(os.path.join(ROOT, "docs", "bike", "turntable.jpg"), quality=85)


if __name__ == "__main__":
    sheet() if "--sheet" in sys.argv else main()
