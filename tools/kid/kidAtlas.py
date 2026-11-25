"""The MPFB kid's atlas -> KTX2 (docs/KIDCHAR.md phase 2):

    python -E tools/kid/kidAtlas.py

  in   models/characters/kidA_atlas.png (2048 x 1280, tools/blender/kidGame.py; git-ignored)
  out  models/characters/kidA_atlas.ktx2   sRGB RGBA, UASTC q2 + zstd 18, all mips. The alpha cells (hair, brows,
       lashes: alpha-tested cards) get COVERAGE-PRESERVING alpha mips (each level keeps level 0's share of texels >= 0.5
       inside the cell: the hair does not thin into a bald helmet at 10 m), the colour bled under alpha 0 (no dark
       fringes); every other texel is opaque (alpha 255).
Needs KTX-Software's `ktx` (KTX_EXE overrides the path).
"""
import os, subprocess, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
SRC = os.path.join(ROOT, "models", "characters", "kidA_atlas.png")
DST = os.path.join(ROOT, "models", "characters", "kidA_atlas.ktx2")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
AW, AH = 2048, 1280
# the alpha cells (x0, y0 from the BOTTOM as in kidGame.py CELLS, w, h): hair, brows, lashes
ALPHA_CELLS = [(1024, 768, 512, 512), (256, 0, 256, 256), (512, 0, 256, 256)]

def half(x):
    """2 x 2 box down to floor(n / 2) (KTX mip sizes); an odd last row / column folds into the one before"""
    h, w = x.shape[:2]
    if h > 1:
        if h % 2: x = np.concatenate([x[:h - 3], ((x[h - 3] + x[h - 2] + x[h - 1]) / 3)[None].repeat(2, 0)])
        x = (x[0::2] + x[1::2]) / 2
    if w > 1:
        if w % 2: x = np.concatenate([x[:, :w - 3], ((x[:, w - 3] + x[:, w - 2] + x[:, w - 1]) / 3)[:, None].repeat(2, 1)], axis=1)
        x = (x[:, 0::2] + x[:, 1::2]) / 2
    return x

def bleed(rgb, mask):
    """push-pull: the covered texels' colour spread under the empty ones"""
    w = mask.astype(np.float32)[..., None]
    lv = [(rgb * w, w)]
    while lv[-1][0].shape[0] > 1 and lv[-1][0].shape[1] > 1:
        c, a = lv[-1]; lv.append((half(c), half(a)))
    c, a = lv[-1]; filled = c / np.maximum(a, 1e-6)
    for c, a in reversed(lv[:-1]):
        ri = np.minimum(np.arange(c.shape[0]) // 2, filled.shape[0] - 1); ci = np.minimum(np.arange(c.shape[1]) // 2, filled.shape[1] - 1)
        up = filled[ri][:, ci]
        filled = np.where(a > 1e-6, c / np.maximum(a, 1e-6), up)
    return filled

def main():
    im = np.asarray(Image.open(SRC).convert("RGBA"), np.float32)            # rows from the TOP
    rgb, al = im[..., :3], im[..., 3]
    cells = []                                                              # (row0, row1, col0, col1) top-origin
    for x0, y0, w, h in ALPHA_CELLS:
        cells.append((AH - (y0 + h), AH - y0, x0, x0 + w))
    amask = np.zeros(al.shape, bool)
    for r0, r1, c0, c1 in cells: amask[r0:r1, c0:c1] = True
    al = np.where(amask, al, 255.0)
    rgb = bleed(rgb, al > 8)
    target = [((al[r0:r1, c0:c1] >= 128).mean()) for r0, r1, c0, c1 in cells]
    work = os.path.join(ROOT, "models", "characters", "_kidA_mips"); os.makedirs(work, exist_ok=True)
    paths, c, a, k = [], rgb, al, 0
    while True:
        lvl_a = a.copy()
        if k > 0:   # scale each alpha cell so its share of texels >= 128 matches level 0
            sc = 2 ** k
            for (r0, r1, c0, c1), t in zip(cells, target):
                rr0, rr1, cc0, cc1 = r0 // sc, max(r0 // sc + 1, r1 // sc), c0 // sc, max(c0 // sc + 1, c1 // sc)
                cell = lvl_a[rr0:rr1, cc0:cc1]
                lo, hi = 0.25, 8.0
                for _ in range(20):
                    mid = (lo + hi) / 2
                    if (np.clip(cell * mid, 0, 255) >= 128).mean() < t: lo = mid
                    else: hi = mid
                lvl_a[rr0:rr1, cc0:cc1] = np.clip(cell * hi, 0, 255)
        p = os.path.join(work, f"L{k}.png")
        Image.fromarray(np.clip(np.round(np.dstack([c, lvl_a])), 0, 255).astype(np.uint8), "RGBA").save(p)
        paths.append(p)
        if c.shape[0] == 1 and c.shape[1] == 1: break
        c, a, k = half(c), half(a), k + 1
    subprocess.run([KTX, "create", "--format", "R8G8B8A8_SRGB", "--assign-tf", "srgb", "--encode", "uastc", "--uastc-quality", "2",
                    "--zstd", "18", "--levels", str(len(paths)), *paths, DST], check=True)
    for p in paths: os.remove(p)
    os.rmdir(work)
    print(DST, len(paths), "levels", os.path.getsize(DST) // 1024, "KB; alpha coverage", [round(t, 3) for t in target])

main()
