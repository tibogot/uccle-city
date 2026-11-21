"""Shops v2 packer (docs/assets/SHOPS.md §3b-3e): the Blender renders of tools/blender/shopInteriors.py --v2
(textures/shops/_work/v2/<variant>_<light>_<L0|L1|L2|L3|comp>.png) -> the KTX2 arrays' slices
(textures/shops/_work/v2/<slices|slicesC|slicesN|slicesM>/NN.rgba, rows top first, + slices.json) for
tools/shops/encode_array.mjs.

(shops7) FOUR arrays, 16 variants (the Basis encoder's 2 GB WASM heap takes at most ~24 layers of 1024 x 512 in one
file; the budget is 40 MB GPU for all v2 layers, so only the room and the window display + composite stay 1024 px):
  slices/  -> interiors_v2.ktx2   1024 x 512: variant = day L0 (the room); last: the L4 sticker sheet
  slicesC/ -> interiors_v2c.ktx2  1024 x 512: variant = day L3 + composite
  slicesN/ -> interiors_v2n.ktx2   512 x 256: variant * 2 + 0 = day L1 (the mid card), + 1 = day L2 (the near card)
  slicesM/ -> interiors_v2m.ktx2   512 x 256: variant * 4 + 0..3 = night L0, L1, L2, L3 + composite
(viewer/shops/shopScale.js V2_SLOT = SLOT below). The layers:
  k = 0  L0, the room shell (opaque)
  k = 1  L1, the mid card (1.8-3.5 m)          premultiplied alpha
  k = 2  L2, the near card (0.6-1.8 m)         premultiplied alpha
  k = 3  lower half: L3, the window display    premultiplied alpha (it projects below the image's middle only)
         upper half: the COMPOSITE (the whole room, every layer, half height: the single fetch beyond 40 m)
Premultiplied in LINEAR light, then encoded back to sRGB: the GPU decodes sRGB per channel before filtering, so a texel
stored as srgb(lin(c) * a) filters / blends as a true premultiplied colour (no dark fringes round the chairs).
Then tools/shops/v2_lum.py measures each composite (shopScale.js V2_LUM).
  python tools/shops/pack_v2.py
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "textures", "shops", "_work", "v2")

# = shopScale.js V2.VARIANTS (the bake's V2_VARIANTS)
VARIANTS = ["cafe", "brasserie", "bakery", "pharmacy", "boutique", "grocery", "office", "salon", "shop",
            "patisserie", "officine", "concept", "epicerie", "bank", "barber", "bookshop"]
FOLDER = {"A": "slices", "C": "slicesC", "N": "slicesN", "M": "slicesM"}
BIG = {"A": True, "C": True, "N": False, "M": False}       # 1024 x 512 (else half)


def SLOT_ARR(v, night, k):
    """= shopScale.js V2_SLOT: [array, layer] of card k (0 L0 .. 3 L3 + composite) of variant v"""
    if night: return ["M", v * 4 + k]
    return [["A", v], ["N", v * 2], ["N", v * 2 + 1], ["C", v]][k]


def SLOT(v, night, k):
    a, i = SLOT_ARR(v, night, k)
    return FOLDER[a], i


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
    if a.shape[1] == w and a.shape[0] == h: return a
    return np.stack([np.asarray(Image.fromarray(a[..., c].astype(np.float32), mode="F").resize((w, h), Image.LANCZOS)) for c in range(4)], -1).astype(np.float64)


def main():
    for d in FOLDER.values(): os.makedirs(os.path.join(WORK, d), exist_ok=True)
    slices = {a: [] for a in FOLDER}
    report = []
    W = H = None
    for vi, v in enumerate(VARIANTS):
        for night in (False, True):
            l = "night" if night else "day"
            L = {k: load(f"{v}_{l}_{k}") for k in ("L0", "L1", "L2", "L3", "comp")}
            H, W = L["L0"].shape[:2]
            top_alpha = float(L["L3"][: H // 2, :, 3].max())            # rows top first: the upper half must be empty
            if top_alpha > 0.02:
                sys.exit(f"{v} {l} L3 reaches the image's upper half (alpha {top_alpha:.2f}): keep the display below 1.45 m")
            l0 = L["L0"].copy(); l0[..., 3] = 1
            comp = L["comp"].copy(); comp[..., 3] = 1
            cards = [l0, premul(L["L1"]), premul(L["L2"]), premul(L["L3"])]
            for k in range(4):
                arr, idx = SLOT_ARR(vi, night, k)
                w, h = (W, H) if BIG[arr] else (W // 2, H // 2)
                img = resize(cards[k], w, h)
                if k == 3: img = img.copy(); img[: h // 2] = resize(comp, w, h // 2)
                slices[arr].append((idx, img))
                report.append(f"{l} {v} {['L0', 'L1', 'L2', 'L3+comp'][k]} -> {arr}[{idx}] {w} x {h} alpha cover {float((img[..., 3] > 0.02).mean()):.2f}")
    # L4: the sticker sheet, premultiplied, array A's last layer
    st = np.asarray(Image.open(os.path.join(WORK, "stickers.png")).convert("RGBA"), dtype=np.float64) / 255.0
    if st.shape[:2] != (H, W): sys.exit(f"stickers.png {st.shape[1]} x {st.shape[0]} != {W} x {H}")
    slices["A"].append((len(VARIANTS), premul(st)))
    for arr, fl in slices.items():
        folder = os.path.join(WORK, FOLDER[arr]); w, h = (W, H) if BIG[arr] else (W // 2, H // 2)
        for f in os.listdir(folder):
            if f.endswith(".rgba"): os.remove(os.path.join(folder, f))
        fl.sort(key=lambda t: t[0])
        assert [i for i, _ in fl] == list(range(len(fl))), arr
        names = []
        for idx, img in fl:
            assert img.shape[:2] == (h, w), (arr, idx, img.shape)
            f = f"{idx:02d}.rgba"
            open(os.path.join(folder, f), "wb").write((np.clip(img, 0, 1) * 255 + 0.5).astype(np.uint8).tobytes())
            names.append(f)
        json.dump({"width": w, "height": h, "files": names}, open(os.path.join(folder, "slices.json"), "w"))
        print(f"{FOLDER[arr]}: {len(names)} slices {w} x {h}")
    print(chr(10).join(report))


if __name__ == "__main__":
    main()
