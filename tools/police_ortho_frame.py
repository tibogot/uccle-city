"""The 2024 UrbIS orthophoto (CC0, 8 cm WMS crop in data/raw/refs/police_rouge/ortho_2024_crop.jpg, git-ignored)
resampled into the police station's BUILDING FRAME (u right = toward Rue Rouge, w down = south-east), 5 cm per pixel,
with a 1 m / 5 m grid and the UrbIS footprints: positions of the yard, wall, gates, roof equipment read in metres.
    python tools/police_ortho_frame.py <out.png> [u0 u1 w0 w1]
"""
import json, math, sys
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw
ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "raw"
if not (RAW / "refs").exists(): RAW = ROOT.parent.parent.parent / "data" / "raw"
site = json.load(open(ROOT / "models" / "police_rouge" / "site.json"))
ox, oz = site["frame"]["origin_city"]; r = site["frame"]["rotation_rad"]; ca, sa = math.cos(r), math.sin(r)
u0, u1, w0, w1 = [float(v) for v in sys.argv[2:6]] if len(sys.argv) >= 6 else (-10.0, 36.0, -28.0, 30.0)
PX = 0.05
im = np.asarray(Image.open(RAW / "refs" / "police_rouge" / "ortho_2024_crop.jpg").convert("RGB")).astype(np.float32)
cx, cz, half, opx = -515, -350, 50, 0.08           # the crop (tools: WMS bbox centre, half size, m / px)
us = np.arange(u0, u1, PX); ws = np.arange(w0, w1, PX)
U, W = np.meshgrid(us, ws)
X = ox + U * ca - W * sa; Z = oz + U * sa + W * ca
c = (X - (cx - half)) / opx - 0.5; rr = (Z - (cz - half)) / opx - 0.5
c0 = np.clip(np.floor(c).astype(int), 0, im.shape[1] - 2); r0 = np.clip(np.floor(rr).astype(int), 0, im.shape[0] - 2)
fc, fr = (c - c0)[..., None], (rr - r0)[..., None]
out = (im[r0, c0] * (1 - fc) + im[r0, c0 + 1] * fc) * (1 - fr) + (im[r0 + 1, c0] * (1 - fc) + im[r0 + 1, c0 + 1] * fc) * fr
img = Image.fromarray(np.clip(out, 0, 255).astype(np.uint8)); d = ImageDraw.Draw(img)
P = lambda u, w: ((u - u0) / PX, (w - w0) / PX)
for u in range(math.ceil(u0), int(u1) + 1):
    col = (255, 255, 255) if u % 5 == 0 else (120, 120, 120)
    if u % 5 == 0 or u % 1 == 0: d.line([P(u, w0), P(u, w0 + (1.2 if u % 5 else 58))], fill=col if u % 5 == 0 else col, width=1)
    if u % 5 == 0: d.text(P(u + 0.1, w0 + 0.1), str(u), fill=(255, 255, 0))
for w in range(math.ceil(w0), int(w1) + 1):
    if w % 5 == 0: d.line([P(u0, w), P(u1, w)], fill=(255, 255, 255), width=1); d.text(P(u0 + 0.1, w + 0.05), str(w), fill=(255, 255, 0))
    else: d.line([P(u0, w), P(u0 + 1.2, w)], fill=(120, 120, 120))
for k, fp in site["footprint_local"].items():
    d.line([P(*p) for p in fp + [fp[0]]], fill=(255, 0, 0) if k in ("528055", "528772") else (0, 255, 255), width=2)
img.save(sys.argv[1]); print(img.size)
