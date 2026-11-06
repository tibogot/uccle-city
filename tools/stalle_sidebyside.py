"""CHAPELLE DE STALLE: side-by-side sheets (reference photo | the model at the photo's solved viewpoint, from the lab).

    python tools/stalle_sidebyside.py <photo in data/raw/refs/stalle> <lab screenshot> <out.jpg> [title]

The sheets hold the photos, so they are written as docs/stalle/side_*.jpg (git-ignored: the inventory photos have no
free licence; the Commons ones are CC BY-SA / CC BY, credited on the sheet).
"""
import sys
from PIL import Image, ImageDraw

photo, shot, out = sys.argv[1:4]
title = sys.argv[4] if len(sys.argv) > 4 else ""
a = Image.open(photo).convert("RGB"); b = Image.open(shot).convert("RGB")
H = 900
a = a.resize((round(a.width * H / a.height), H)); b = b.resize((round(b.width * H / b.height), H))
sheet = Image.new("RGB", (a.width + b.width + 30, H + 46), (24, 26, 30))
sheet.paste(a, (10, 36)); sheet.paste(b, (a.width + 20, 36))
d = ImageDraw.Draw(sheet)
d.text((12, 10), f"PHOTO  {title}", fill=(230, 230, 230)); d.text((a.width + 22, 10), "MODEL (Stalle Lab, same solved viewpoint)", fill=(230, 230, 230))
sheet.save(out, quality=88)
print(out, sheet.size)
