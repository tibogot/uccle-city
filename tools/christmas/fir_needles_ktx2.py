"""The fir's needle-spray atlas -> KTX2 (tools/blender/firNeedles.py renders the sprays; this composes and encodes):

    python -E -P tools/christmas/fir_needles_ktx2.py

  in   data/raw/textures/christmas/fir_needles_top.png, fir_needles_bottom.png (2048 x 1024 each, 0.6 x 0.3 m)
  out  data/raw/textures/christmas/fir_needles_atlas.png   the atlas (2048 x 1024): top views in v 0 .. 0.5, the bottom
                                                           views MIRRORED (so a texel is the same needle) in v 0.5 .. 1;
                                                           Blender's previews map it (tools/blender/christmasKit.py)
       models/christmas/fir_needles.ktx2                   RGB albedo (sRGB) + A coverage, Basis UASTC + zstd; the alpha
                                                           mips COVERAGE-PRESERVING (each level keeps level 0's share of
                                                           texels >= 0.5: the far cards never thin into see-through
                                                           ghosts), the colour bled under alpha 0 (no dark fringes)
       models/christmas/christmas.json "needles"           size, coverage, the mean linear albedo of the covered texels
                                                           (front / back): the viewer matches the far levels' colour to it
(-E -P: no environment / no script-dir imports; the PNGs are only read as images.) Needs KTX-Software's `ktx`.
"""
import json
import os
import subprocess

import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "data", "raw", "textures", "christmas")
WORK = os.path.join(RAW, "_work")
DST = os.path.join(ROOT, "models", "christmas", "fir_needles.ktx2")
INFO = os.path.join(ROOT, "models", "christmas", "christmas.json")
KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")
W, H, CELLS, MARGIN = 2048, 1024, 4, 6        # atlas size, cells across, alpha-free border round each cell (px)


def srgb_to_lin(a):
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def half(x):
    """2 x 2 box (a dimension of 1 stays 1)"""
    h, w = x.shape[:2]
    if h > 1: x = (x[0::2] + x[1::2]) / 2
    if w > 1: x = (x[:, 0::2] + x[:, 1::2]) / 2
    return x


def coverage_mips(a0):
    """level 0 alpha (uint8) -> levels down to 1 x 1, each scaled so the same share of texels is >= 128 (Castano)"""
    target = (a0 >= 128).mean()
    out, src = [a0], a0.astype(np.float32)
    while src.shape[0] > 1 or src.shape[1] > 1:
        box = half(src)
        lo, hi = 0.5, 8.0
        for _ in range(18):
            k = (lo + hi) / 2
            if (box * k >= 128).mean() < target: lo = k
            else: hi = k
        mip = np.clip(np.round(box * (lo + hi) / 2), 0, 255)
        out.append(mip.astype(np.uint8)); src = mip
    return out


def box_mips(img):
    out = [img]
    while out[-1].shape[0] > 1 or out[-1].shape[1] > 1: out.append(half(out[-1]))
    return out


def bleed(rgb, alpha):
    """push-pull: the covered texels' colour spread under the empty ones"""
    w = (alpha > 8).astype(np.float32)[..., None]
    levels = [(rgb * w, w)]
    while levels[-1][0].shape[0] > 1 or levels[-1][0].shape[1] > 1:
        c, ww = levels[-1]
        levels.append((half(c) * 4, half(ww) * 4))
    fill = levels[-1][0] / np.maximum(levels[-1][1], 1e-6)
    for c, ww in reversed(levels[:-1]):
        h, wd = c.shape[:2]
        up = np.repeat(np.repeat(fill, 2 if h > fill.shape[0] else 1, axis=0), 2 if wd > fill.shape[1] else 1, axis=1)[:h, :wd]
        own = c / np.maximum(ww, 1e-6)
        k = np.clip(ww, 0, 1)
        fill = own * k + up * (1 - k)
    return np.where(w > 0, rgb, fill)


def main():
    os.makedirs(WORK, exist_ok=True)
    top = Image.open(os.path.join(RAW, "fir_needles_top.png")).convert("RGBA").resize((W, H // 2), Image.LANCZOS)
    bot = Image.open(os.path.join(RAW, "fir_needles_bottom.png")).convert("RGBA").transpose(Image.FLIP_LEFT_RIGHT).resize((W, H // 2), Image.LANCZOS)
    a = np.vstack([np.asarray(top), np.asarray(bot)]).astype(np.float32)
    rgb, alpha = a[..., :3], a[..., 3].copy()
    # no coverage on the cells' borders (no mip pulls a neighbour in, no card edge shows a cut needle)
    cw, ch = W // CELLS, H // 2
    yy, xx = np.mgrid[0:H, 0:W]
    edge = np.minimum(np.minimum(xx % cw, cw - 1 - xx % cw), np.minimum(yy % ch, ch - 1 - yy % ch))
    alpha *= np.clip((edge - MARGIN) / 4.0, 0, 1)
    Image.fromarray(np.dstack([rgb, alpha]).astype(np.uint8), "RGBA").save(os.path.join(RAW, "fir_needles_atlas.png"))
    rgb_b = bleed(rgb, alpha)
    a_lv = coverage_mips(np.clip(np.round(alpha), 0, 255).astype(np.uint8))
    c_lv = box_mips(rgb_b)
    paths = []
    for i, (c, al) in enumerate(zip(c_lv, a_lv)):
        p = os.path.join(WORK, f"fir_needles_L{i}.png")
        Image.fromarray(np.clip(np.round(np.dstack([c, al.astype(np.float32)])), 0, 255).astype(np.uint8), "RGBA").save(p)
        paths.append(p)
    cmd = [KTX, "create", "--format", "R8G8B8A8_SRGB", "--assign-tf", "srgb", "--encode", "uastc", "--uastc-quality", "2",
           "--zstd", "18", "--levels", str(len(paths)), *paths, DST]
    subprocess.run(cmd, check=True)
    cov = alpha >= 128
    front, back = cov[: H // 2], cov[H // 2:]
    mean = lambda sl, m: [round(float(v), 4) for v in srgb_to_lin(rgb[sl][m]).mean(axis=0)]
    rec = {"file": "fir_needles.ktx2", "px": [W, H], "cells": CELLS, "card_m": [0.15, 0.30], "levels": len(paths),
           "coverage": round(float(cov.mean()), 4), "mean_front_linear": mean(slice(0, H // 2), front),
           "mean_back_linear": mean(slice(H // 2, H), back), "ktx2_bytes": os.path.getsize(DST),
           "gpu_bytes_bc7": int(sum(max(1, (l.shape[0] + 3) // 4) * max(1, (l.shape[1] + 3) // 4) * 16 for l in a_lv)),
           "source": "tools/blender/firNeedles.py (modelled needles) + tools/christmas/fir_needles_ktx2.py"}
    info = json.load(open(INFO)) if os.path.exists(INFO) else {}
    info["needles"] = rec
    json.dump(info, open(INFO, "w"), indent=1)
    print(json.dumps(rec))


if __name__ == "__main__":
    main()
