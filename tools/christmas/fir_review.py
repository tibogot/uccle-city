"""FIR ROUND 3 review sheets + the 45 m switch's match (docs/CHRISTMAS.md "FIR ROUND 3"):

    python -E tools/christmas/fir_review.py [old new]

  in   data/raw/textures/christmas/_review/<tag>_<d>m_lod<k>.png   (tools/blender/christmasKit.py --review <tag>: the fir
       from the street at 8 / 21 / 45 / 60 / 100 m at the game's pixel density, film transparent, same sun and sky)
  out  docs/christmas/fir3_<d>m_old_vs_new.jpg                       (old | new, over a flat winter-sky grey, enlarged
                                                                      by whole pixels: the game's pixels stay visible)
       docs/christmas/fir3_switch45_old_vs_new.jpg                   (at 45 m: near | middle level, old and new)
       docs/christmas/fir3_sheet.jpg                                  (every distance, old over new)
       models/christmas/christmas.json "fir_switch"                   per tag, at 45 m (the near level's last metres vs the
                                                                      middle level's first): silhouette IoU, coverage
                                                                      ratio, foliage luminance ratio, row-width error
(-E: no environment; the PNGs are only read as images.)
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RV = os.path.join(ROOT, "data", "raw", "textures", "christmas", "_review")
DOC = os.path.join(ROOT, "docs", "christmas")
INFO = os.path.join(ROOT, "models", "christmas", "christmas.json")
TAGS = sys.argv[1:3] if len(sys.argv) >= 3 else ["old", "new"]
BG = np.array([176, 188, 200], np.float32)          # a flat overcast winter sky (sRGB)
DIST = [(8, 0), (21, 0), (45, 0), (45, 1), (60, 1), (100, 1)]


def load(tag, d, k):
    p = os.path.join(RV, f"{tag}_{d}m_lod{k}.png")
    return np.asarray(Image.open(p).convert("RGBA"), np.float32) / 255.0 if os.path.exists(p) else None


def over(a):
    rgb, al = a[..., :3] * 255.0, a[..., 3:4]
    return Image.fromarray(np.clip(rgb * al + BG * (1 - al), 0, 255).astype(np.uint8))


def lin(c):
    return np.where(c <= 0.04045, c / 12.92, ((c + 0.055) / 1.055) ** 2.4)


def label(im, text):
    d = ImageDraw.Draw(im)
    d.rectangle([0, 0, 8 + 6 * len(text), 14], fill=(20, 24, 28))
    d.text((4, 2), text, fill=(235, 235, 235))
    return im


def panel(a, h, text):
    """whole-pixel enlargement to about h px high (nearest: the game's pixels stay visible)"""
    im = over(a)
    k = max(1, round(h / im.height))
    return label(im.resize((im.width * k, im.height * k), Image.NEAREST), text + (f" (x{k})" if k > 1 else ""))


def side(ims, gap=8):
    W = sum(i.width for i in ims) + gap * (len(ims) - 1); H = max(i.height for i in ims)
    out = Image.new("RGB", (W, H), (40, 44, 48)); x = 0
    for i in ims: out.paste(i, (x, 0)); x += i.width + gap
    return out


def stack(ims, gap=8):
    W = max(i.width for i in ims); H = sum(i.height for i in ims) + gap * (len(ims) - 1)
    out = Image.new("RGB", (W, H), (40, 44, 48)); y = 0
    for i in ims: out.paste(i, (0, y)); y += i.height + gap
    return out


def match(a0, a1):
    """the switch: near (a0) vs middle (a1) level from the same spot"""
    m0, m1 = a0[..., 3] >= 0.5, a1[..., 3] >= 0.5
    iou = float((m0 & m1).sum() / max(1, (m0 | m1).sum()))
    cov = float(a1[..., 3].sum() / max(1e-6, a0[..., 3].sum()))
    # the FOLIAGE's brightness: the median luminance of the covered pixels that are needles (green >= red: not a bauble,
    # a bulb or the star), level vs level (robust to the ornaments one level hides more than the other)
    def fol(a):
        c = lin(a[..., :3]); Y = c @ np.array([0.2126, 0.7152, 0.0722])
        m = (a[..., 3] >= 0.5) & (c[..., 1] >= c[..., 0] * 0.95) & (Y < 0.2)
        return np.median(Y[m]) if m.any() else 0.0, np.median(c[m], axis=0) if m.any() else np.zeros(3)
    (y0, c0), (y1, c1) = fol(a0), fol(a1)
    lum = float(y1 / max(1e-9, y0))
    hue = float(np.abs(c1 / max(1e-9, c1.sum()) - c0 / max(1e-9, c0.sum())).max())
    # the silhouette's width row by row (the outermost covered pixels), over the rows both cover
    def widths(m):
        w = np.zeros(m.shape[0])
        for r in range(m.shape[0]):
            xs = np.nonzero(m[r])[0]
            if len(xs): w[r] = xs[-1] - xs[0] + 1
        return w
    w0, w1 = widths(m0), widths(m1)
    rows = (w0 > 3) & (w1 > 3)
    werr = float(np.median(np.abs(w1[rows] - w0[rows]) / w0[rows])) if rows.any() else 1.0
    wbias = float(np.median((w1[rows] - w0[rows]) / w0[rows])) if rows.any() else 1.0
    # see-through: the share of the silhouette's span (row-wise, between the outermost pixels) that is NOT covered
    def gaps(m, w):
        tot = cov_ = 0
        for r in range(m.shape[0]):
            xs = np.nonzero(m[r])[0]
            if len(xs) > 3: tot += xs[-1] - xs[0] + 1; cov_ += len(xs)
        return 1 - cov_ / max(1, tot)
    return {"iou": round(iou, 3), "coverage_ratio": round(cov, 3), "luminance_ratio": round(lum, 3), "chroma_diff": round(hue, 3), "row_width_err": round(werr, 3),
            "row_width_bias": round(wbias, 3), "see_through_near": round(float(gaps(m0, w0)), 3), "see_through_middle": round(float(gaps(m1, w1)), 3)}


os.makedirs(DOC, exist_ok=True)
rows, res = [], {}
for d, k in DIST:
    A = {t: load(t, d, k) for t in TAGS}
    if any(v is None for v in A.values()): continue
    h = 520 if d < 45 else 600
    im = side([panel(A[t], h, f"{t} {d} m {'near (LOD0)' if k == 0 else 'middle (LOD1)'}") for t in TAGS])
    if not (d == 45 and k == 1): im.save(os.path.join(DOC, f"fir3_{d}m_old_vs_new.jpg"), quality=90)
    rows.append(im)
for t in TAGS:
    a0, a1 = load(t, 45, 0), load(t, 45, 1)
    if a0 is not None and a1 is not None: res[t] = match(a0, a1)
if all(load(t, 45, k) is not None for t in TAGS for k in (0, 1)):
    side([stack([panel(load(t, 45, 0), 600, f"{t} 45 m near"), panel(load(t, 45, 1), 600, f"{t} 45 m middle")]) for t in TAGS]).save(os.path.join(DOC, "fir3_switch45_old_vs_new.jpg"), quality=90)
if rows:
    sheet = stack(rows)
    if sheet.width > 2400: sheet = sheet.resize((2400, round(sheet.height * 2400 / sheet.width)), Image.LANCZOS)
    sheet.save(os.path.join(DOC, "fir3_sheet.jpg"), quality=88)
info = json.load(open(INFO))
info["fir_switch"] = {**info.get("fir_switch", {}), **res, "note": "tools/christmas/fir_review.py: the fir at 45 m from the street (game pixel density), near (LOD0) vs middle (LOD1) level, Cycles, same sun"}
json.dump(info, open(INFO, "w"), indent=1)
for t, r in res.items(): print(t, r)
