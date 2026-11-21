"""Shops v2: the mean LINEAR luminance of each variant's composite on the window crop (rows 20-95 % from the top,
columns 10-90 %: the ceiling left out), the number viewer/shops/shopScale.js V2_LUM holds (docs/assets/SHOPS.md §3d).
  python tools/shops/v2_lum.py            the packed slices (what ships: the "L3 + composite" layer's upper half, day in
                                          slicesC/, night in slicesM/; written by tools/shops/pack_v2.py) -> lum.json
  python tools/shops/v2_lum.py --png      the raw renders (_work/v2/<variant>_<light>_comp.png: quick, while tuning)
"""
import json, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
WORK = os.path.join(ROOT, "textures", "shops", "_work", "v2")
sys.path.insert(0, os.path.dirname(__file__))


def lin(c): return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def lum_of(img):
    """img: float RGB in [0, 1], rows top first -> the crop's mean linear luminance"""
    H, W = img.shape[:2]
    c = lin(img[int(H * 0.2):int(H * 0.95), int(W * 0.1):int(W * 0.9), :3])
    return float((c[..., 0] * 0.2126 + c[..., 1] * 0.7152 + c[..., 2] * 0.0722).mean())


def slice_comp(folder, idx):
    info = json.load(open(os.path.join(WORK, folder, "slices.json")))
    w, h = info["width"], info["height"]
    a = np.frombuffer(open(os.path.join(WORK, folder, info["files"][idx]), "rb").read(), np.uint8).reshape(h, w, 4) / 255.0
    return a[: h // 2]                                        # the composite: the upper half


if __name__ == "__main__":
    from pack_v2 import VARIANTS, SLOT
    out = {"day": {}, "night": {}}
    for vi, v in enumerate(VARIANTS):
        for l in ("day", "night"):
            p = os.path.join(WORK, f"{v}_{l}_comp.png")
            if "--png" in sys.argv:
                if not os.path.exists(p): continue
                img = np.asarray(Image.open(p).convert("RGB"), dtype=np.float64) / 255.0
            else:
                folder, idx = SLOT(vi, l == "night", 3)
                img = slice_comp(folder, idx)
            out[l][v] = round(lum_of(img), 4)
    for l in out: print(l, json.dumps(out[l]))
    # the gains (= shopScale.js V2_GAIN, docs/assets/SHOPS.md §3d): day = DAY_TARGET / lum (every room the same mean),
    # night = half-way in log, 0.7 x sqrt(NIGHT_TARGET / (0.7 lum)), clamped to 0.3-2
    day = {v: round(0.075 / l, 3) for v, l in out["day"].items()}
    night = {v: round(min(2.0, max(0.3, 0.7 * (0.15 / (0.7 * l)) ** 0.5)), 3) for v, l in out["night"].items()}
    print("V2_GAIN day", json.dumps(day)); print("V2_GAIN night", json.dumps(night))
    if "--png" not in sys.argv: json.dump({**out, "gain": {"day": day, "night": night}}, open(os.path.join(WORK, "lum.json"), "w"), indent=1)
