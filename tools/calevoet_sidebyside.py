"""GARE D UCCLE-CALEVOET: side-by-sides of a lab render at a photo's solved pose and the photo (a copy of tools/wolvendael_sidebyside.py).

    python tools/calevoet_sidebyside.py <lab screenshot.png> <photo file, e.g. c04.jpg> <out.jpg>

The lab ("frame = photo" on, panels hidden) draws the canvas centred in the window with the photo's aspect: the canvas
is cut out of the screenshot (the photo's aspect, centred) and set beside the photo remapped to the same pinhole camera
(data/raw/refs/calevoet/undist/, tools/calevoet_photopose.py --undistort), plus a 50 % blend with the photo's edges
in yellow. The output holds the photo: docs/calevoet/side_* is git-ignored (CC BY-SA photos, reference only).
"""
import sys
from pathlib import Path
from PIL import Image, ImageFilter, ImageOps, ImageDraw, ImageChops

ROOT = Path(__file__).resolve().parent.parent
REFS = ROOT / "data" / "raw" / "refs" / "calevoet"
if not REFS.exists(): REFS = ROOT.parent.parent.parent / "data" / "raw" / "refs" / "calevoet"
shot, photo, out = sys.argv[1], sys.argv[2], sys.argv[3]
S = Image.open(shot).convert("RGB"); P = Image.open(REFS / "undist" / photo).convert("RGB")
a = P.width / P.height
W, H = S.size
cw, ch = (round(H * a), H) if W / H > a else (W, round(W / a))
x0, y0 = (W - cw) // 2, (H - ch) // 2
M = S.crop((x0, y0, x0 + cw, y0 + ch))
P = P.resize((cw, ch), Image.LANCZOS)
edges = ImageOps.autocontrast(P.convert("L").filter(ImageFilter.FIND_EDGES)).point(lambda v: 255 if v > 90 else 0)
blend = Image.blend(M, P, 0.5)
blend.paste(Image.new("RGB", blend.size, (255, 230, 0)), mask=edges)
sheet = Image.new("RGB", (cw * 3 + 20, ch + 30), (20, 22, 26))
for i, (im, label) in enumerate(((P, "photo (remapped to the solved pinhole camera)"), (M, "model (Station Lab / city, same pose)"), (blend, "50 % blend + the photo's edges"))):
    sheet.paste(im, (i * (cw + 10), 30))
    ImageDraw.Draw(sheet).text((i * (cw + 10) + 6, 8), label, fill=(230, 230, 230))
sheet.save(out, quality=88)
print(out, sheet.size)
