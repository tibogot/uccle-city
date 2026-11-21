"""Shops v2 L4, the glass dressing's sticker sheet (docs/assets/SHOPS.md §3c, rule shop-room-layers): one 1024 x 512
RGBA layer (straight alpha, rows top first), drawn by script, appended to the day array by tools/shops/pack_v2.py.
The cells are viewer/shops/shopScale.js STICKERS (px rects, top-left origin, 720 texels a metre on the glass):
  opening-hours vinyl (FR; FR / NL), OUVERT / OUVERT - OPEN - GEOPEND signs, SOLDES / SOLDEN, two strips of plain
  card-payment marks (a card with its chip, a phone, a euro coin: plain shapes, NO brand, NO real logo), a lace café
  curtain (tiled along the glass by the shader), NOUVEAU - NIEUW / BIENVENUE - WELKOM.
Text in Aileron (Pillow's built-in font, CC0). Drawn at 4x and downsampled (clean edges at every mip).
  python tools/shops/stickers.py [out.png]       (default textures/shops/_work/v2/stickers.png)
"""
import json, math, os, re, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = sys.argv[1] if len(sys.argv) > 1 else os.path.join(ROOT, "textures", "shops", "_work", "v2", "stickers.png")
S = 4                                                       # supersampling
W, H = 1024, 512


def cells():
    """STICKERS from shopScale.js (the one source of the rects)"""
    src = open(os.path.join(ROOT, "viewer", "shops", "shopScale.js"), encoding="utf8").read()
    body = src[src.index("export const STICKERS = {"):]
    body = body[:body.index("};")]
    return {k: [int(v) for v in r.split(",")] for k, r in re.findall(r"(\w+):\s*\[([\d,\s]+)\]", body)}


C = cells()
img = Image.new("RGBA", (W * S, H * S), (0, 0, 0, 0))
d = ImageDraw.Draw(img)


def font(px): return ImageFont.load_default(size=int(px * S))


def R(name):
    x, y, w, h = C[name]
    return x * S, y * S, w * S, h * S


def text(cx, cy, s, px, fill, bold=0, anchor="mm"):
    d.text((cx, cy), s, font=font(px), fill=fill, anchor=anchor, stroke_width=int(bold * S), stroke_fill=fill)


WHITE = (250, 250, 246, 255)
VINYL = (250, 250, 246, 235)


def hours(name, lines, title):
    x, y, w, h = R(name)
    m = 6 * S
    text(x + w / 2, y + 26 * S, title, 17, VINYL, 0.6)
    d.line((x + m * 2, y + 42 * S, x + w - m * 2, y + 42 * S), fill=VINYL, width=int(1.5 * S))
    for i, (day, hrs) in enumerate(lines):
        yy = y + (60 + i * 24) * S
        text(x + m * 2, yy, day, 13, VINYL, 0.2, "lm")
        text(x + w - m * 2, yy, hrs, 13, VINYL, 0.2, "rm")


hours("hoursFR", [("Lun", "9h - 18h30"), ("Mar", "9h - 18h30"), ("Mer", "9h - 18h30"), ("Jeu", "9h - 18h30"), ("Ven", "9h - 19h"),
                  ("Sam", "9h - 18h"), ("Dim", "ferme")], "HORAIRES")
hours("hoursBI", [("Lu / Ma", "8h - 19h"), ("Ma / Di", "8h - 19h"), ("Me / Wo", "8h - 19h"), ("Je / Do", "8h - 19h"), ("Ve / Vr", "8h - 19h"),
                  ("Sa / Za", "9h - 17h"), ("Di / Zo", "- -")], "HEURES - UREN")


def sign(name, lines, bg, fg, radius=14):
    x, y, w, h = R(name)
    m = 6 * S
    d.rounded_rectangle((x + m, y + m, x + w - m, y + h - m), radius * S, fill=bg)
    d.rounded_rectangle((x + m + 5 * S, y + m + 5 * S, x + w - m - 5 * S, y + h - m - 5 * S), (radius - 4) * S, outline=fg, width=int(2 * S))
    n = len(lines)
    for i, (s, px) in enumerate(lines):
        text(x + w / 2, y + h / 2 + (i - (n - 1) / 2) * px * 1.15 * S, s, px, fg, 1.2)


sign("open", [("OUVERT", 54)], (176, 22, 26, 245), WHITE)
sign("openBI", [("OUVERT · OPEN", 28), ("GEOPEND", 30)], (20, 96, 52, 245), WHITE)
sign("sale", [("SOLDES", 84)], (200, 18, 30, 245), WHITE, 6)
sign("saleNL", [("SOLDEN -50%", 58)], (230, 200, 30, 245), (20, 20, 20, 255), 6)
sign("newFR", [("NOUVEAU · NIEUW", 56)], (18, 18, 20, 240), WHITE, 6)
sign("welcome", [("BIENVENUE · WELKOM", 46)], (240, 236, 226, 235), (40, 52, 70, 255), 6)


def pay(name, order):
    """plain payment marks: a card with a chip, a phone, a euro coin, a second card (no brand, no scheme logo)"""
    x, y, w, h = R(name)
    d.rounded_rectangle((x + 2 * S, y + 4 * S, x + w - 2 * S, y + h - 4 * S), 8 * S, fill=(245, 245, 242, 240))
    slot = (w - 8 * S) / 4
    for i, kind in enumerate(order):
        cx, cy = x + 4 * S + slot * (i + 0.5), y + h / 2
        if kind == "card" or kind == "card2":
            col = (30, 60, 120, 255) if kind == "card" else (120, 30, 40, 255)
            cw, ch = 46 * S, 30 * S
            d.rounded_rectangle((cx - cw / 2, cy - ch / 2, cx + cw / 2, cy + ch / 2), 4 * S, fill=col)
            d.rounded_rectangle((cx - cw / 2 + 6 * S, cy - 6 * S, cx - cw / 2 + 16 * S, cy + 2 * S), 2 * S, fill=(210, 180, 90, 255))
            d.rectangle((cx - cw / 2 + 6 * S, cy + 7 * S, cx + cw / 2 - 8 * S, cy + 9 * S), fill=(220, 220, 220, 255))
        elif kind == "phone":
            pw, ph = 18 * S, 34 * S
            d.rounded_rectangle((cx - pw / 2, cy - ph / 2, cx + pw / 2, cy + ph / 2), 4 * S, fill=(25, 25, 28, 255))
            d.rectangle((cx - pw / 2 + 2 * S, cy - ph / 2 + 4 * S, cx + pw / 2 - 2 * S, cy + ph / 2 - 5 * S), fill=(110, 160, 200, 255))
        elif kind == "euro":
            r = 16 * S
            d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(200, 160, 60, 255))
            ink = (90, 60, 10, 255); rr = 9 * S                     # the euro sign as shapes (no glyph in Aileron)
            d.arc((cx - rr, cy - rr, cx + rr, cy + rr), 40, 320, fill=ink, width=int(2.5 * S))
            for dy in (-2.5 * S, 2.5 * S): d.line((cx - rr - 3 * S, cy + dy, cx + 3 * S, cy + dy), fill=ink, width=int(2 * S))


pay("pay", ["card", "phone", "euro", "card2"])
pay("pay2", ["card2", "card", "phone", "euro"])

# the lace curtain: a scalloped top hem, a mesh of rings and diamonds, tileable across (the cell's left = right edge)
x, y, w, h = R("lace")
LACE = (248, 246, 238)
lace = Image.new("RGBA", (w, h), (0, 0, 0, 0)); ld = ImageDraw.Draw(lace)
ld.rectangle((0, 22 * S, w, h), fill=(*LACE, 70))                                      # the net: a thin veil
for i in range(5):                                                                     # the scallops (5 a tile: tileable)
    cx = (i + 0.5) * w / 5
    ld.pieslice((cx - w / 10, 4 * S, cx + w / 10, 40 * S), 0, 180, fill=(*LACE, 220))
ld.rectangle((0, 2 * S, w, 12 * S), fill=(*LACE, 230))                                 # the hem
step = w / 8
for j in range(1, 8):
    for i in range(8):
        cx, cy = (i + 0.5 * (j % 2)) * step, 40 * S + j * step * 0.85
        r = step * 0.3
        ld.ellipse((cx - r, cy - r, cx + r, cy + r), outline=(*LACE, 220), width=int(2.2 * S))
        ld.polygon([(cx, cy - r * 0.55), (cx + r * 0.55, cy), (cx, cy + r * 0.55), (cx - r * 0.55, cy)], fill=(*LACE, 200))
        if cx - r < 0: ld.ellipse((cx + w - r, cy - r, cx + w + r, cy + r), outline=(*LACE, 220), width=int(2.2 * S))
        if cx + r > w: ld.ellipse((cx - w - r, cy - r, cx - w + r, cy + r), outline=(*LACE, 220), width=int(2.2 * S))
ld.rectangle((0, h - 8 * S, w, h), fill=(*LACE, 200))                                  # the bottom hem
img.alpha_composite(lace, (x, y))

out = img.resize((W, H), Image.LANCZOS)
os.makedirs(os.path.dirname(OUT), exist_ok=True)
out.save(OUT)
print(f"stickers {OUT}: {len(C)} cells, {W} x {H}")
