# Side-by-side sheets for docs/facadekit/: [photo |] before | after, labelled.
#   python tools/facadekit/sideBySide.py out.jpg "label1=path1" "label2=path2" ...
import sys
from PIL import Image, ImageDraw, ImageFont

out, items = sys.argv[1], [a.split("=", 1) for a in sys.argv[2:]]
H = 540
ims = []
for label, path in items:
    im = Image.open(path).convert("RGB")
    im = im.resize((round(im.width * H / im.height), H), Image.LANCZOS)
    ims.append((label, im))
W = sum(im.width for _, im in ims) + 8 * (len(ims) - 1)
sheet = Image.new("RGB", (W, H + 34), (24, 27, 32))
d = ImageDraw.Draw(sheet)
try: font = ImageFont.truetype("arial.ttf", 20)
except OSError: font = ImageFont.load_default()
x = 0
for label, im in ims:
    sheet.paste(im, (x, 34))
    d.text((x + 8, 6), label, fill=(230, 233, 238), font=font)
    x += im.width + 8
sheet.save(out, quality=88)
print(out, sheet.size)
