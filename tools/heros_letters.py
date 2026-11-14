"""SQUARE DES HEROS: the lettering atlas of the war memorial (textures/heros/heros_letters.png + .json).

    python tools/heros_letters.py        (Pillow; the font: Windows' Century Gothic Bold, the closest to the memorial's Art
                                          Deco capitals with round O's in the photos IMG_0040 / DSC_4602; only its rendered
                                          output is shipped, as an 8-bit mask)

One grey mask (white = letter) the city's stone material reads on the faces tools/blender/heros.py codes "letters"
(TEXCOORD_0 = 1000 (cell + 1) + s, v: metres on the panel from its lower left corner seen from in front; the JSON gives
each cell's pixel rectangle (image rows from the top) and its size in metres).

ONLY REAL TEXT (the owner's rule: never mock data). The front's inscription (heritage.uccle.be): "ÉRIGÉ PAR LA COMMUNE
D'UCCLE À LA MÉMOIRE DE SES ENFANTS MORTS POUR LA PATRIE" over "1914 - 1918", and "1940-1945" carved in the front seat
(photo IMG_0040). The NAMES (138 dead of 1914-1918 on the shaft, 193 of 1940-1945 on the benches' backs) have no reliable
public transcription of the monument (docs/landmarks/HEROS.md "names"): their panels are drawn UNINSCRIBED (plain recessed
stone), not with invented names.
"""
import json
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "textures" / "heros"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "C:/Windows/Fonts/GOTHICB.TTF"
W, H = 1024, 1536
# cell: name, pixel rect (x0, y0, x1, y1), size in metres (the panel the Blender script letters); the order = the cell index
CELLS = [("front", (0, 0, 624, 1048), (1.16, 1.95)), ("years", (0, 1080, 1000, 1310), (1.65, 0.38))]
img = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(img)

def font(px): return ImageFont.truetype(FONT, px)

def centred(box, lines, px, gap=1.35):
    x0, y0, x1, y1 = box
    f = font(px)
    total = len(lines) * px * gap
    y = y0 + (y1 - y0 - total) / 2
    for ln in lines:
        w = d.textlength(ln, font=f)
        d.text(((x0 + x1 - w) / 2, y), ln, fill=255, font=f)
        y += px * gap

meta = []
for name, (x0, y0, x1, y1), size in CELLS:
    ppm = (x1 - x0) / size[0]
    if name == "front":
        centred((x0 + 20, y0 + 40, x1 - 20, y0 + int((y1 - y0) * 0.72)),
                ["ÉRIGÉ PAR", "LA COMMUNE", "D'UCCLE", "À LA MÉMOIRE", "DE SES ENFANTS", "MORTS", "POUR LA PATRIE"], int(0.07 * ppm))
        centred((x0 + 20, y0 + int((y1 - y0) * 0.74), x1 - 20, y0 + int((y1 - y0) * 0.9)), ["1914 - 1918"], int(0.1 * ppm))
    elif name == "years":
        centred((x0, y0, x1, y1), ["1940-1945"], int(0.17 * ppm), gap=1.0)
    meta.append(dict(name=name, px=[x0, y0, x1, y1], size_m=list(size)))
img = img.filter(ImageFilter.GaussianBlur(0.7))
img.save(OUT / "heros_letters.png", optimize=True)
json.dump(dict(about="tools/heros_letters.py: the war memorial's lettering mask (white = letter): the real front inscription and "
                     "'1940-1945' only; the names' panels are uninscribed (no reliable transcription of the monument).",
               size=[W, H], cells=meta), open(OUT / "heros_letters.json", "w"), indent=1)
print("written", OUT / "heros_letters.png", (OUT / "heros_letters.png").stat().st_size // 1024, "KB")
