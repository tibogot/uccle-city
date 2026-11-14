"""THE PETROL BRAND ATLAS: our OWN generic fuel brands (invented names, our own wordmarks and emblems; colour schemes
only resembling the real stations' so a station reads as "the blue / orange one", "the red / white one": no real name,
no real logo), the EU fuel grade tabs (E10 / E5 / B7 / LPG: the harmonised EN 16942 identifiers, not brands) and the LED
price window (unlit "8.888" ghost segments: there is no price in the data, so none is shown).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/fuel/make_brands.py   -> textures/fuel/fuel_brands.png (+ .json)

Layout (1536 x 2816, viewer/fuel/fuelKit.js signUV): one row of 256 px per scheme (tools/fuel/survey.json "schemes"):
  x 0..1280     the wordmark (5 : 1; the fascia sign is 3.14 x 0.56 m)       sign uv u in [0, 1]
  x 1280..1536  the emblem (1 : 1; the totem head 1.12 x 1.12 m)             sign uv u in [1, 2]
then row 9: four grade tabs of 384 x 256 (u in [2, 3]); row 10: the LED window 768 x 256 (u in [3, 4]).
The palette (linear rgb of the brand_* slots) is written to textures/fuel/fuel_brands.json for the viewer.
"""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "textures" / "fuel"
FONTS = Path("C:/Windows/Fonts")
SURVEY = json.loads((ROOT / "tools" / "fuel" / "survey.json").read_text(encoding="utf-8"))
RW, RH, EW = 1280, 256, 256
W = RW + EW

# our schemes: wordmark, primary (fascia / totem body), secondary (stripe / column sleeves), accent; sRGB hex
SCHEMES = {
    "kelvo":   ("KELVO",   "#1c3f94", "#f29400", "#ffffff", "squares"),
    "rubra":   ("RUBRA",   "#f4f4f2", "#d4202c", "#1d3d8f", "oval"),
    "solenn":  ("SOLENN",  "#f7c200", "#dc1f26", "#ffffff", "sun"),
    "tamaris": ("TAMARIS", "#f4f4f2", "#e3271c", "#f08a00", "waves"),
    "lumo":    ("LUMO",    "#f4f4f2", "#d4001e", "#3a3a3a", "drop"),
    "pivot":   ("PIVOT",   "#1d1d1f", "#e10a14", "#ffffff", "hexagon"),
    "daxo":    ("DAXO",    "#f4f4f2", "#e00019", "#2d2d2d", "block"),
    "avena":   ("AVENA",   "#f4f4f2", "#d81e2a", "#183f8c", "wing"),
    "brook":   ("BROOK",   "#2b6b3a", "#f2f2ee", "#9bc53d", "leaf"),
}


def hexrgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lin(c):
    c = c / 255
    return round(c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4, 4)


def font(px, name="bahnschrift.ttf"):
    for n in (name, "arialbd.ttf"):
        try:
            f = ImageFont.truetype(str(FONTS / n), px)
            if n == "bahnschrift.ttf":
                try: f.set_variation_by_name("Bold")
                except Exception: pass
            return f
        except OSError:
            pass
    return ImageFont.load_default()


def fit(s, w_max, px, name="bahnschrift.ttf"):
    f = font(px, name)
    while px > 10 and f.getlength(s) > w_max:
        px -= 4; f = font(px, name)
    return f


def lum(c):
    r, g, b = [x / 255 for x in c]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def emblem(d, kind, x0, y0, s, p1, p2, p3):
    """our own abstract marks in an s x s box"""
    cx, cy = x0 + s / 2, y0 + s / 2
    if kind == "squares":
        q = s * 0.26
        d.rounded_rectangle([cx - q * 1.25, cy - q * 1.25, cx + q * 0.45, cy + q * 0.45], radius=q * 0.2, fill=p2)
        d.rounded_rectangle([cx - q * 0.45, cy - q * 0.45, cx + q * 1.25, cy + q * 1.25], radius=q * 0.2, fill=p3, outline=p2, width=int(s * 0.03))
    elif kind == "oval":
        d.ellipse([cx - s * 0.42, cy - s * 0.27, cx + s * 0.42, cy + s * 0.27], fill=p2, outline=p3, width=int(s * 0.035))
        d.ellipse([cx - s * 0.30, cy - s * 0.16, cx + s * 0.30, cy + s * 0.16], fill=(255, 255, 255))
    elif kind == "sun":
        for k in range(12):
            a = 2 * math.pi * k / 12
            d.polygon([(cx + math.cos(a - 0.12) * s * 0.18, cy + math.sin(a - 0.12) * s * 0.18), (cx + math.cos(a) * s * 0.44, cy + math.sin(a) * s * 0.44),
                       (cx + math.cos(a + 0.12) * s * 0.18, cy + math.sin(a + 0.12) * s * 0.18)], fill=p2)
        d.ellipse([cx - s * 0.22, cy - s * 0.22, cx + s * 0.22, cy + s * 0.22], fill=p2, outline=(255, 255, 255), width=int(s * 0.03))
    elif kind == "waves":
        for k, c in enumerate((p2, p3, (29, 61, 143))):
            yy = cy - s * 0.2 + k * s * 0.17
            pts = [(x0 + s * 0.1 + i * s * 0.8 / 40, yy + math.sin(i / 40 * 2 * math.pi) * s * 0.07) for i in range(41)]
            d.line(pts, fill=c, width=int(s * 0.1), joint="curve")
    elif kind == "drop":
        pts = [(cx + math.sin(t) * s * 0.26 * (1 - 0.0), cy + s * 0.1 - math.cos(t) * s * 0.26) for t in [math.pi * (0.25 + 1.5 * i / 30) for i in range(31)]]
        d.polygon([(cx, cy - s * 0.4)] + pts, fill=p2)
        d.ellipse([cx - s * 0.08, cy + s * 0.02, cx + s * 0.03, cy + s * 0.13], fill=(255, 255, 255))
    elif kind == "hexagon":
        d.polygon([(cx + math.cos(math.pi / 3 * k + math.pi / 6) * s * 0.4, cy + math.sin(math.pi / 3 * k + math.pi / 6) * s * 0.4) for k in range(6)], fill=p2)
        d.polygon([(cx + math.cos(math.pi / 3 * k + math.pi / 6) * s * 0.24, cy + math.sin(math.pi / 3 * k + math.pi / 6) * s * 0.24) for k in range(6)], fill=p3)
        d.polygon([(cx + math.cos(math.pi / 3 * k + math.pi / 6) * s * 0.12, cy + math.sin(math.pi / 3 * k + math.pi / 6) * s * 0.12) for k in range(6)], fill=p2)
    elif kind == "block":
        d.rounded_rectangle([cx - s * 0.36, cy - s * 0.36, cx + s * 0.36, cy + s * 0.36], radius=s * 0.06, fill=p2)
        d.text((cx, cy + s * 0.02), "D", font=font(int(s * 0.62)), fill=(255, 255, 255), anchor="mm")
    elif kind == "wing":
        d.polygon([(cx - s * 0.4, cy + s * 0.25), (cx + s * 0.38, cy - s * 0.32), (cx + s * 0.05, cy + s * 0.25)], fill=p2)
        d.polygon([(cx - s * 0.1, cy + s * 0.25), (cx + s * 0.38, cy - s * 0.1), (cx + s * 0.25, cy + s * 0.25)], fill=p3)
    elif kind == "leaf":
        d.ellipse([cx - s * 0.36, cy - s * 0.2, cx + s * 0.36, cy + s * 0.2], fill=p3)
        d.line([(cx - s * 0.34, cy + s * 0.04), (cx + s * 0.3, cy - s * 0.04)], fill=p1, width=int(s * 0.03))


def row(name, word, c1, c2, c3, kind):
    im = Image.new("RGB", (W, RH), c1)
    d = ImageDraw.Draw(im)
    # the wordmark plate: primary ground, a secondary band at the bottom, the name in the contrasting colour
    d.rectangle([0, int(RH * 0.80), RW, RH], fill=c2)
    if kind in ("waves", "drop", "wing"):
        d.rectangle([0, int(RH * 0.74), RW, int(RH * 0.78)], fill=c3)
    ink = c2 if lum(c1) > 0.6 and kind not in ("squares",) else (255, 255, 255) if lum(c1) < 0.5 else (30, 30, 32)
    if name == "solenn": ink = c2
    emb = int(RH * 0.62)
    emblem(d, kind, 40, int(RH * 0.06), emb, c1, c2, c3)
    f = fit(word, RW - emb - 160, 170)
    d.text((emb + 80 + (RW - emb - 120) / 2, RH * 0.42), word, font=f, fill=ink, anchor="mm")
    # the emblem cell: on the primary colour, the mark big, the name small under it
    d.rectangle([RW, 0, W, RH], fill=c1)
    emblem(d, kind, RW + 28, 8, EW - 56, c1, c2, c3)
    d.text((RW + EW / 2, RH - 30), word, font=fit(word, EW - 40, 46), fill=ink, anchor="mm")
    return im


def grades():
    im = Image.new("RGB", (W, RH), (20, 20, 22))
    d = ImageDraw.Draw(im)
    tabs = [("E10", "95", (0, 122, 61)), ("E5", "98", (0, 92, 46)), ("B7", "Diesel", (25, 25, 28)), ("LPG", "", (40, 70, 140))]
    for k, (a, b, c) in enumerate(tabs):
        x0 = k * 384
        d.rectangle([x0 + 6, 6, x0 + 378, RH - 6], fill=c)
        # the EN 16942 shape: a circle (petrol) / a square (diesel) / a diamond (gas) outline round the identifier
        cx, cy = x0 + 120, RH / 2
        if k < 2: d.ellipse([cx - 90, cy - 90, cx + 90, cy + 90], outline=(255, 255, 255), width=10)
        elif k == 2: d.rectangle([cx - 85, cy - 85, cx + 85, cy + 85], outline=(255, 255, 255), width=10)
        else: d.polygon([(cx, cy - 100), (cx + 100, cy), (cx, cy + 100), (cx - 100, cy)], outline=(255, 255, 255), width=10)
        d.text((cx, cy), a, font=font(78), fill=(255, 255, 255), anchor="mm")
        if b: d.text((x0 + 290, cy), b, font=fit(b, 150, 80), fill=(255, 255, 255), anchor="mm")
    return im


def led():
    """the LED price window: dark glass, 7-segment '8.888' ghost segments (unlit: no price in the data)"""
    im = Image.new("RGB", (W, RH), (8, 8, 9))
    d = ImageDraw.Draw(im)
    x0, w, h, t = 60, 140, 180, 18
    ghost = (70, 20, 16)
    def seg(x, y, horiz):
        if horiz: d.polygon([(x, y), (x + t, y - t / 2), (x + w - 2 * t, y - t / 2), (x + w - t, y), (x + w - 2 * t, y + t / 2), (x + t, y + t / 2)], fill=ghost)
        else: d.polygon([(x, y), (x - t / 2, y + t), (x - t / 2, y + h / 2 - 2 * t), (x, y + h / 2 - t), (x + t / 2, y + h / 2 - 2 * t), (x + t / 2, y + t)], fill=ghost)
    y0 = (RH - h) / 2
    for k in range(4):
        x = x0 + k * (w + 34) + (30 if k > 0 else 0)
        for yy in (y0, y0 + h / 2 - t / 2, y0 + h - t):
            seg(x, yy, True)
        for xx in (x, x + w - t):
            seg(xx, y0 + t / 2, False); seg(xx, y0 + h / 2, False)
    d.ellipse([x0 + w + 20, y0 + h - 22, x0 + w + 42, y0 + h], fill=ghost)
    return im


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    names = SURVEY["schemes"]
    rows = []
    pal = {}
    for n in names:
        word, a, b, c, kind = SCHEMES[n]
        c1, c2, c3 = hexrgb(a), hexrgb(b), hexrgb(c)
        rows.append(row(n, word, c1, c2, c3, kind))
        pal[n] = {"word": word, "primary": [lin(v) for v in c1], "secondary": [lin(v) for v in c2], "accent": [lin(v) for v in c3]}
    rows += [grades(), led()]
    atlas = Image.new("RGB", (W, RH * len(rows)))
    for i, r in enumerate(rows):
        atlas.paste(r, (0, i * RH))
    atlas = atlas.filter(ImageFilter.SMOOTH)
    atlas.save(OUT / "fuel_brands.png", optimize=True)
    (OUT / "fuel_brands.json").write_text(json.dumps({"size": [W, RH * len(rows)], "rowH": RH, "word": [0, RW], "emblem": [RW, W],
                                                      "rows": len(rows), "gradesRow": len(names), "ledRow": len(names) + 1, "tabW": 384, "ledW": 768,
                                                      "schemes": names, "palette": pal}, indent=1), encoding="utf-8")
    print("atlas", atlas.size, (OUT / "fuel_brands.png").stat().st_size // 1024, "KB")


if __name__ == "__main__":
    main()
