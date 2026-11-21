"""Shops v2 packer (docs/assets/SHOPS.md §3b): the Blender renders of tools/blender/shopInteriors.py --v2
(textures/shops/_work/v2/<variant>_<light>_<L0|L1|L2|L3|comp>.png) -> the KTX2 array's slices
(textures/shops/_work/v2/slices/NN.rgba, rows top first, + slices.json) for tools/shops/encode_array.mjs.

(shops5) THREE arrays (the Basis encoder's 2 GB WASM heap takes at most ~24 layers of 1024 x 512 in one file):
  slices/  -> interiors_v2.ktx2  1024 x 512: variant * 2 + 0 = day L0, + 1 = day L3 + composite; last: the L4 sticker sheet
  slicesC/ -> interiors_v2c.ktx2 1024 x 512: variant = day L2 (the near card)
  slicesN/ -> interiors_v2n.ktx2  512 x 256: variant * 5 + 0 = day L1 (the mid card: half size, as the brief allows),
              + 1..4 = night L0, L1, L2, L3 + composite (resized after premultiplying)
(viewer/shops/shopScale.js V2_SLOT). The layers:
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
OUT_A = os.path.join(WORK, "slices")       # interiors_v2.ktx2  (1024 x 512): day L0, day L3 + composite per variant; the stickers
OUT_C = os.path.join(WORK, "slicesC")      # interiors_v2c.ktx2 (1024 x 512): day L2 (the near card) per variant

VARIANTS = ["cafe", "brasserie", "bakery", "pharmacy", "boutique", "grocery", "office", "salon", "shop"]   # = shopScale.js V2.VARIANTS
OUT_N = os.path.join(WORK, "slicesN")
for d in (OUT_A, OUT_C, OUT_N): os.makedirs(d, exist_ok=True)


def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)
def srgb(c): return np.where(c <= 0.0031308, c * 12.92, 1.055 * np.power(np.maximum(c, 0), 1 / 2.4) - 0.055)


def load(name):
    return np.asarray(Image.open(os.path.join(WORK, name + ".png")).convert("RGBA"), dtype=np.float64) / 255.0


def premul(a):
    out = a.copy()
    out[..., :3] = srgb(lin(a[..., :3]) * a[..., 3:4])
    return out


def resize(a, w, h):
    """a float RGBA image -> w x h (Lanczos per channel in float: premultiplied colour filters correctly)"""
    return np.stack([np.asarray(Image.fromarray(a[..., c].astype(np.float32), mode="F").resize((w, h), Image.LANCZOS)) for c in range(4)], -1).astype(np.float64)


def write(folder, idx, img, files):
    f = f"{idx:02d}.rgba"
    open(os.path.join(folder, f), "wb").write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
    files.append(f)


files, filesC, filesN, report = [], [], [], []
W = H = None
for vi, v in enumerate(VARIANTS):
    for l in ("day", "night"):
        L = {k: load(f"{v}_{l}_{k}") for k in ("L0", "L1", "L2", "L3", "comp")}
        H, W = L["L0"].shape[:2]
        l0 = L["L0"].copy(); l0[..., 3] = 1
        l3 = premul(L["L3"])
        top_alpha = float(L["L3"][: H // 2, :, 3].max())            # rows top first: the upper half must be empty
        if top_alpha > 0.02:
            sys.exit(f"{v} {l} L3 reaches the image's upper half (alpha {top_alpha:.2f}): keep the display below 1.45 m")
        comp = L["comp"].copy(); comp[..., 3] = 1
        w2, h2 = W // 2, H // 2
        if l == "day":
            k3 = l3.copy(); k3[: H // 2] = resize(comp, W, H // 2)
            out = [(OUT_A, vi * 2, l0, files), (OUT_N, vi * 5, resize(premul(L["L1"]), w2, h2), filesN), (OUT_C, vi, premul(L["L2"]), filesC), (OUT_A, vi * 2 + 1, k3, files)]
        else:
            k3 = resize(l3, w2, h2); k3[: h2 // 2] = resize(comp, w2, h2 // 2)
            out = [(OUT_N, vi * 5 + 1 + k, img, filesN) for k, img in enumerate((resize(l0, w2, h2), resize(premul(L["L1"]), w2, h2), resize(premul(L["L2"]), w2, h2), k3))]
        for k, (folder, idx, img, fl) in enumerate(out):
            fl.append((idx, img))
            report.append(f"{l} {v} {['L0', 'L1', 'L2', 'L3+comp'][k]} -> {os.path.basename(folder)}[{idx}] {img.shape[1]} x {img.shape[0]} alpha cover {float((img[..., 3] > 0.02).mean()):.2f}")
# L4: the sticker sheet, premultiplied, array A's last layer
st = np.asarray(Image.open(os.path.join(WORK, "stickers.png")).convert("RGBA"), dtype=np.float64) / 255.0
if st.shape[:2] != (H, W): sys.exit(f"stickers.png {st.shape[1]} x {st.shape[0]} != {W} x {H}")
files.append((len(VARIANTS) * 2, premul(st)))
for folder, fl, (w, h) in ((OUT_A, files, (W, H)), (OUT_C, filesC, (W, H)), (OUT_N, filesN, (W // 2, H // 2))):
    fl.sort(key=lambda t: t[0])
    assert [i for i, _ in fl] == list(range(len(fl))), folder
    names = []
    for idx, img in fl:
        f = f"{idx:02d}.rgba"
        open(os.path.join(folder, f), "wb").write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
        names.append(f)
    json.dump({"width": w, "height": h, "files": names}, open(os.path.join(folder, "slices.json"), "w"))
    print(f"{os.path.basename(folder)}: {len(names)} slices {w} x {h}")
print(chr(10).join(report))
