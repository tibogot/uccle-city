# Contact sheet of PNGs (for looking at many renders at once): python tools/interior/sheet.py out.png cols w a.png b.png ...
import sys
from PIL import Image, ImageDraw
out, cols, w = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert("RGB") for f in files]
h = int(w * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new("RGB", (cols * w, rows * h), (20, 20, 20))
for i, (f, im) in enumerate(zip(files, ims)):
    im = im.resize((w, h))
    d = ImageDraw.Draw(im); d.text((6, 4), f.split("/")[-1].split("\\")[-1][:-4], fill=(255, 255, 0))
    sheet.paste(im, ((i % cols) * w, (i // cols) * h))
sheet.save(out)
