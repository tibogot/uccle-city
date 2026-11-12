"""Offline comparison for the tree sets: generated bark next to the CC0 bark scans of the Tree Textures lab, generated
leaf sprays next to the Blender-modelled and scanned-leaf sprays (same light, same scale). Reads the lab's processed
level-0 PNGs from a claude/tree-textures worktree (data/raw/textures/trees/_work, git-ignored) when there is one.

    python -E -P tools/texturefactory/tree_sheet.py [--out docs/img/texfactory/trees_sheet.jpg]
"""
import glob
import os
import sys

import cv2
import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tf.bake import RAW, MAIN, WT  # noqa: E402
from sheet import shade  # noqa: E402

W = 360


def tree_work():
    for d in glob.glob(os.path.join(MAIN, ".claude", "worktrees", "*", "data", "raw", "textures", "trees", "_work")):
        if os.path.exists(os.path.join(d, "bark_Bark009_albedo_L0.png")):
            return d
    return None


def rd(p, flags=cv2.IMREAD_UNCHANGED):
    im = cv2.imread(p, flags)
    if im is None:
        return None
    if im.ndim == 3 and im.shape[2] == 4:
        return cv2.cvtColor(im, cv2.COLOR_BGRA2RGBA).astype(np.float32) / 255
    return cv2.cvtColor(im, cv2.COLOR_BGR2RGB).astype(np.float32) / 255


def bark_col(alb, nra, size_m, label):
    # 0.5 m crop, lit; then 1.5 m (tiled) lit
    R = alb.shape[0]
    lit = shade(alb[..., :3], nra)
    px = int(R * 0.5 / size_m)
    a = cv2.resize(lit[:px, :px], (W, W), interpolation=cv2.INTER_AREA if px > W else cv2.INTER_CUBIC)
    reps = int(np.ceil(1.5 / size_m)) + 1
    big = np.tile(lit, (reps, reps, 1))[: int(R * 1.5 / size_m), : int(R * 1.5 / size_m)]
    b = cv2.resize(big, (W, W), interpolation=cv2.INTER_AREA)
    return label, np.vstack([a, np.ones((4, W, 3)), b])


def leaf_col(alb_rgba, label):
    a = alb_rgba[..., 3:4]
    c = alb_rgba[..., :3]
    bg = np.array([0.62, 0.7, 0.8], np.float32)
    im = c * a + bg * (1 - a)
    im = cv2.resize(im, (W, W), interpolation=cv2.INTER_AREA)
    # the same spray at ~20 m: 24 px, then up (do the leaves survive as a mass, not dots?)
    small = cv2.resize(cv2.resize(im, (24, 24), interpolation=cv2.INTER_AREA), (W, W), interpolation=cv2.INTER_NEAREST)
    return label, np.vstack([im, np.ones((4, W, 3)), small])


def main():
    out = sys.argv[sys.argv.index("--out") + 1] if "--out" in sys.argv else os.path.join(WT, "docs", "img", "texfactory", "trees_sheet.jpg")
    tw = tree_work()
    rows = []
    bark = []
    for sp, var in (("plane", "a"), ("plane", "b"), ("beech", "a"), ("lime", "a"), ("horsechestnut", "a"), ("maple", "a"), ("oak", "a"), ("birch", "a")):
        p = os.path.join(WT, "viewer", "materials", "generated", f"bark_{sp}", var, f"bark_{sp}_1k")
        if os.path.exists(p + "_albedo.webp"):
            bark.append(bark_col(rd(p + "_albedo.webp"), rd(p + "_nra.webp"), 1.0, f"GEN {sp} {var}"))
    scans = []
    if tw:
        for sid, size, lab in (("Bark009", 1.0, "CC0 Bark009 (plane)"), ("bark_platanus", 1.5, "CC0 bark_platanus"),
                               ("Bark005", 1.0, "CC0 Bark005 (beech)"), ("chinese_hackberry_bark", 1.8, "CC0 hackberry (beech)")):
            a = rd(os.path.join(tw, f"bark_{sid}_albedo_L0.png"))
            n = rd(os.path.join(tw, f"bark_{sid}_nra_L0.png"))
            if a is not None and n is not None:
                scans.append(bark_col(a, n, size, lab))
    rows.append(bark[:4] + scans[:2])
    rows.append(bark[4:] + scans[2:])
    leaves = []
    for sp in ("plane", "beech", "lime", "horsechestnut", "maple"):
        p = os.path.join(RAW, "out", f"leaf_{sp}", "albedo.png")
        im = rd(p)
        if im is not None:
            leaves.append(leaf_col(im, f"GEN leaf {sp}"))
    if tw:
        for nm, lab in (("leaf_plane_a", "Blender plane"), ("leaf_plane_scan_a", "scan-leaf plane"), ("leaf_beech_a", "Blender beech")):
            im = rd(os.path.join(tw, f"{nm}_L0.png"))
            if im is not None:
                leaves.append(leaf_col(im, lab))
    rows.append(leaves[:6])
    blocks = []
    ncol = max(len(r) for r in rows)
    for r in rows:
        cols = [np.vstack([np.ones((26, W, 3)), c]) for _, c in r]
        while len(cols) < ncol:
            cols.append(np.ones_like(cols[0]))
        img = np.hstack([np.hstack([c, np.ones((c.shape[0], 4, 3))]) for c in cols])
        img = (np.clip(img, 0, 1) * 255).astype(np.uint8)
        for i, (lab, _) in enumerate(r):
            cv2.putText(img, lab, (6 + i * (W + 4), 18), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 1, cv2.LINE_AA)
        blocks.append(img)
    sheet = np.vstack(blocks)
    cv2.imwrite(out, cv2.cvtColor(sheet, cv2.COLOR_RGB2BGR), [cv2.IMWRITE_JPEG_QUALITY, 84])
    print(out, "rows: bark 0.5 m lit / 1.5 m tiled; leaves: the spray / the same at 24 px (far)")


if __name__ == "__main__":
    main()
