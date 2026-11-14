"""SQUARE DES HEROS: the lettering atlas of the war memorial (textures/heros/heros_letters.png + .json).

    python tools/heros_letters.py        (Pillow; the font: Windows' Century Gothic Bold, the closest to the memorial's Art
                                          Deco capitals with round O's in the photos IMG_0040 / DSC_4602; only its rendered
                                          output is shipped, as an 8-bit mask)

One grey mask (white = letter) the city's stone material reads on the faces tools/blender/heros.py codes "letters"
(TEXCOORD_0 = 1000 (cell + 1) + s, v: metres on the panel from its lower left corner; the JSON gives each cell's pixel
rectangle and its size in metres).

TEXT. The front's inscription is the real one (heritage.uccle.be): "ERIGE PAR LA COMMUNE D'UCCLE A LA MEMOIRE DE SES
ENFANTS MORTS POUR LA PATRIE 1914-1918", and "1940-1945" on the front seat (photo IMG_0040). The NAMES (138 dead of
1914-1918 on the shaft, 193 of 1940-1945 on the benches' backs) are not in our data: their panels carry PLACEHOLDER rows
in the real layout (surname + first name, dot separators on the benches) made of random letters, NOT names. To be replaced
by the real lists (the commune's / Ucclensia's published lists) in a later pass: docs/landmarks/HEROS.md "left".
"""
import json, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "textures" / "heros"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "C:/Windows/Fonts/GOTHICB.TTF"
W = H = 2048
# cell: name, pixel rect (x0, y0, x1, y1), size in metres (the panel the Blender script letters)
SHAFT = (1.16, 1.95)
CELLS = [("front", (0, 0, 624, 1048), SHAFT), ("names_a", (640, 0, 1264, 1048), SHAFT), ("names_b", (1280, 0, 1904, 1048), SHAFT),
         ("names_c", (0, 1064, 624, 2048 - 64 + 48), SHAFT), ("bench", (640, 1064, 1640, 1314), (1.65, 0.41)),
         ("years", (640, 1330, 1640, 1560), (1.65, 0.38))]
img = Image.new("L", (W, H), 0)
d = ImageDraw.Draw(img)
rnd = random.Random(1948)
LET = "ABCDEFGHIJKLMNOPRSTUVWY"

def font(px): return ImageFont.truetype(FONT, px)

def fake_word(n):
    s = "".join(rnd.choice(LET) for _ in range(n))
    return s

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
        # the inscription in the upper two thirds, the rest bare (the relief is under the lettered quad)
        centred((x0 + 20, y0 + 40, x1 - 20, y0 + int((y1 - y0) * 0.72)),
                ["ÉRIGÉ PAR", "LA COMMUNE", "D'UCCLE", "À LA MÉMOIRE", "DE SES ENFANTS", "MORTS", "POUR LA PATRIE"], int(0.07 * ppm))
        centred((x0 + 20, y0 + int((y1 - y0) * 0.74), x1 - 20, y0 + int((y1 - y0) * 0.9)), ["1914 - 1918"], int(0.1 * ppm))
    elif name.startswith("names"):
        px = int(0.042 * ppm); f = font(px)
        rows = 26
        for r in range(rows):
            y = y0 + 30 + r * (y1 - y0 - 60) / rows
            for col, cx in enumerate((x0 + 24, (x0 + x1) / 2 + 8)):
                t = f"{fake_word(rnd.randint(4, 8))} {fake_word(1)}."
                d.text((cx, y), t, fill=255, font=f)
    elif name == "bench":
        px = int(0.04 * ppm); f = font(px)
        rows = 6
        for r in range(rows):
            y = y0 + 10 + r * (y1 - y0 - 20) / rows
            xs = [x0 + 16, x0 + (x1 - x0) * 0.35, x0 + (x1 - x0) * 0.68]
            for k, cx in enumerate(xs):
                t = f"{fake_word(rnd.randint(4, 8))} {fake_word(rnd.randint(4, 6))}"
                d.text((cx, y), t, fill=255, font=f)
                if k < 2: d.ellipse((xs[k + 1] - 22, y + px * 0.45, xs[k + 1] - 14, y + px * 0.45 + 8), fill=255)
    elif name == "years":
        centred((x0, y0, x1, y1), ["1940-1945"], int(0.17 * ppm), gap=1.0)
    meta.append(dict(name=name, px=[x0, y0, x1, y1], size_m=list(size)))
img = img.filter(ImageFilter.GaussianBlur(0.7))
img.save(OUT / "heros_letters.png", optimize=True)
json.dump(dict(about="tools/heros_letters.py: the war memorial's lettering mask (white = letter). Front + years: the real text; "
                     "the names' panels: PLACEHOLDER rows of random letters (the real lists are not in our data).",
               size=[W, H], cells=meta), open(OUT / "heros_letters.json", "w"), indent=1)
print("written", OUT / "heros_letters.png", (OUT / "heros_letters.png").stat().st_size // 1024, "KB")
