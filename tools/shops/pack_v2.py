"""Shops v2 packer (docs/assets/SHOPS.md §3b): the Blender renders of tools/blender/shopInteriors.py --v2
(textures/shops/_work/v2/<variant>_<light>_<L0|L1|L2|L3|comp>.png) -> the KTX2 array's slices
(textures/shops/_work/v2/slices/NN.rgba, rows top first, + slices.json) for tools/shops/encode_array.mjs.

Layer index = variant * 8 + light * 4 + k (viewer/shops/shopScale.js V2_LAYER):
  k = 0  L0, the room shell (opaque)
  k = 1  L1, the mid card (1.8-3.5 m)          premultiplied alpha
  k = 2  L2, the near card (0.6-1.8 m)         premultiplied alpha
  k = 3  lower half: L3, the window display    premultiplied alpha (it projects below the image's middle only)
         upper half: the COMPOSITE (the whole room, every layer, half height: the single fetch beyond 40 m)
Premultiplied in LINEAR light, then encoded back to sRGB: the GPU decodes sRGB per channel before filtering, so a texel
stored as srgb(lin(c) * a) filters / blends as a true premultiplied colour (no dark fringes round the chairs).
  python tools/shops/pack_v2.py
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "textures", "shops", "_work", "v2")
OUT = os.path.join(WORK, "slices")
VARIANTS, LIGHTS = ["cafe", "brasserie"], ["day", "night"]
os.makedirs(OUT, exist_ok=True)


def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)


def load(name):
    return np.asarray(Image.open(os.path.join(WORK, name + ".png")).convert("RGBA"), dtype=np.float64) / 255.0


def premul(a):
    out = a.copy()
    out[..., :3] = srgb(lin(a[..., :3]) * a[..., 3:4])
    return out


files, report = [], []
W = H = None
for vi, v in enumerate(VARIANTS):
    for li, l in enumerate(LIGHTS):
        L = {k: load(f"{v}_{l}_{k}") for k in ("L0", "L1", "L2", "L3", "comp")}
        H, W = L["L0"].shape[:2]
        l0 = L["L0"].copy(); l0[..., 3] = 1
        l3 = premul(L["L3"])
        top_alpha = float(L["L3"][: H // 2, :, 3].max())            # rows top first: the upper half must be empty
        if top_alpha > 0.02:
            sys.exit(f"{v} {l} L3 reaches the image's upper half (alpha {top_alpha:.2f}): keep the display below 1.45 m")
        comp = np.asarray(Image.fromarray((L["comp"] * 255 + 0.5).astype(np.uint8)).resize((W, H // 2), Image.LANCZOS), dtype=np.float64) / 255.0
        comp[..., 3] = 1
        k3 = l3.copy(); k3[: H // 2] = comp
        for k, img in enumerate((l0, premul(L["L1"]), premul(L["L2"]), k3)):
            idx = vi * 8 + li * 4 + k
            f = f"{idx:02d}.rgba"
            open(os.path.join(OUT, f), "wb").write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
            files.append(f)
            report.append(f"{idx:2d} {v} {l} {['L0', 'L1', 'L2', 'L3+comp'][k]} alpha cover {float((img[..., 3] > 0.02).mean()):.2f}")
json.dump({"width": W, "height": H, "files": files}, open(os.path.join(OUT, "slices.json"), "w"))
print("\n".join(report))
print(f"{len(files)} slices {W} x {H} -> {OUT}")
