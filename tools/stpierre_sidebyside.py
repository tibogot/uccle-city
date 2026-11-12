"""EGLISE SAINT-PIERRE: side-by-side sheets (reference photo | the model at the photo's solved viewpoint, from the lab;
optionally a third panel = the photo blended 50 % over the model, to check the fit). After tools/stalle_sidebyside.py.

    python tools/stpierre_sidebyside.py <photo> <lab screenshot> <out.jpg> [title] [--crop x,y,w,h] [--blend]

--crop: the lab canvas' rectangle inside the screenshot (the lab sizes its canvas to the photo's aspect).
The sheets hold the photos, so they are written as docs/saint-pierre/side_*.jpg (git-ignored: the inventory photos have
no free licence; the Commons ones are CC BY-SA, credited on the sheet).
"""
import sys
from PIL import Image, ImageDraw

args = [a for a in sys.argv[1:] if not a.startswith("--")]
photo, shot, out = args[:3]
title = args[3] if len(args) > 3 else ""
a = Image.open(photo).convert("RGB"); b = Image.open(shot).convert("RGB")
if "--crop" in sys.argv:
    x, y, w, h = map(int, sys.argv[sys.argv.index("--crop") + 1].split(","))
    b = b.crop((x, y, x + w, y + h))
H = 900
a = a.resize((round(a.width * H / a.height), H)); b = b.resize((round(b.width * H / b.height), H))
panels = [a, b]
if "--blend" in sys.argv:
    panels.append(Image.blend(a.resize(b.size), b, 0.5))
W = sum(p.width for p in panels) + 10 * (len(panels) + 1)
sheet = Image.new("RGB", (W, H + 46), (24, 26, 30))
x = 10
for p in panels: sheet.paste(p, (x, 36)); x += p.width + 10
d = ImageDraw.Draw(sheet)
d.text((12, 10), f"PHOTO  {title}", fill=(230, 230, 230)); d.text((a.width + 22, 10), "MODEL (Saint-Pierre Lab, same solved viewpoint)", fill=(230, 230, 230))
if "--blend" in sys.argv: d.text((a.width + b.width + 32, 10), "50 % overlay", fill=(230, 230, 230))
sheet.save(out, quality=88)
print(out, sheet.size)
