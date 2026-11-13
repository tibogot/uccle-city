"""THE POSTER ATLAS for the STIB shelters' and the free-standing panels' lit poster cases: eight poster designs of our
own (abstract / typographic / made-up city-event style: no real brands, logos, people, products or copied adverts;
every name and date on them is invented), drawn here with PIL, 4 x 2 posters of 512 x 768 px (the poster case's
1.185 x 1.75 m window is 0.677 : 1, the cell 0.667 : 1: a 1.5 % stretch).

    C:/Users/tibog/Downloads/venv/Scripts/python.exe tools/stops/make_posters.py      -> textures/posters/stops_posters.jpg

Deterministic (fixed seeds). The viewer (viewer/stops/stopKit.js) picks a poster per face per instance (iPoster) and
lights it at night through the emissive slot (no light added).
"""
import math, random
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "textures" / "posters" / "stops_posters.jpg"
W, H, COLS, ROWS = 512, 768, 4, 2
FONTS = Path("C:/Windows/Fonts")


def font(name, px):
    for n in (name, "arialbd.ttf", "arial.ttf"):
        try: return ImageFont.truetype(str(FONTS / n), px)
        except OSError: pass
    return ImageFont.load_default()


def text_c(d, y, s, f, fill, x=W // 2, anchor="mm"):
    d.text((x, y), s, font=f, fill=fill, anchor=anchor)


def fit(s, name, w_max, px):
    f = font(name, px)
    while px > 10 and f.getlength(s) > w_max: px -= 2; f = font(name, px)
    return f


def gradient(c0, c1):
    im = Image.new("RGB", (W, H))
    px = im.load()
    for y in range(H):
        t = y / (H - 1)
        c = tuple(int(c0[k] * (1 - t) + c1[k] * t) for k in range(3))
        for x in range(W): px[x, y] = c
    return im


def p_trees():          # "night of the trees": dark green, crowns as overlapping circles
    im = Image.new("RGB", (W, H), (14, 46, 32)); d = ImageDraw.Draw(im, "RGBA"); r = random.Random(1)
    for _ in range(26):
        x, y, rr = r.randint(-40, W + 40), r.randint(60, 470), r.randint(40, 120)
        d.ellipse((x - rr, y - rr, x + rr, y + rr), fill=(r.randint(40, 110), r.randint(120, 190), r.randint(70, 120), 90))
    for x in range(40, W, 64): d.rectangle((x, 430, x + 8, 520), fill=(30, 20, 12, 255))
    d.rectangle((0, 520, W, H), fill=(240, 232, 205))
    text_c(d, 585, "NUIT DES ARBRES", fit("NUIT DES ARBRES", "georgiab.ttf", 450, 56), (14, 46, 32))
    text_c(d, 645, "concerts sous les tilleuls", font("georgiai.ttf", 30), (60, 90, 70))
    text_c(d, 715, "21.06  ·  20:00  ·  entrée libre", font("arialbd.ttf", 24), (14, 46, 32))
    return im


def p_market():         # seasonal market: cream, awning stripes, big type
    im = Image.new("RGB", (W, H), (246, 238, 220)); d = ImageDraw.Draw(im)
    for k in range(9):
        d.rectangle((k * 64, 0, k * 64 + 32, 150), fill=(196, 52, 44))
    for k in range(9):
        d.pieslice((k * 64 - 1, 118, k * 64 + 63, 182), 0, 180, fill=(196, 52, 44) if k % 2 == 0 else (246, 238, 220))
    text_c(d, 290, "MARCHÉ", fit("MARCHÉ", "impact.ttf", 440, 150), (40, 40, 44))
    text_c(d, 420, "DE SAISON", fit("DE SAISON", "impact.ttf", 440, 96), (196, 52, 44))
    r = random.Random(2)
    for k in range(5):
        x = 70 + k * 93
        d.ellipse((x - 34, 500, x + 34, 568), fill=[(232, 120, 40), (120, 160, 50), (200, 40, 50), (240, 190, 60), (110, 60, 120)][k])
    text_c(d, 640, "chaque samedi", font("georgiai.ttf", 34), (60, 60, 60))
    text_c(d, 700, "8:00 – 13:00", font("arialbd.ttf", 40), (40, 40, 44))
    return im


def p_shapes():         # an abstract exhibition poster: primary shapes
    im = Image.new("RGB", (W, H), (236, 232, 222)); d = ImageDraw.Draw(im)
    d.rectangle((40, 60, 300, 320), fill=(30, 70, 160))
    d.ellipse((200, 200, 480, 480), fill=(232, 160, 30))
    d.polygon([(60, 560), (260, 340), (300, 560)], fill=(200, 50, 40))
    d.line((40, 590, 472, 590), fill=(20, 20, 20), width=6)
    text_c(d, 640, "FORMES / VORMEN", fit("FORMES / VORMEN", "arialbd.ttf", 440, 54), (20, 20, 20))
    text_c(d, 700, "exposition · 12.09 – 30.11", font("arial.ttf", 28), (40, 40, 40))
    return im


def p_cycle():          # a made-up car-free cycling Sunday
    im = gradient((40, 120, 200), (20, 60, 130)); d = ImageDraw.Draw(im, "RGBA")
    for cx in (150, 362):
        for rr, wdt in ((110, 14), (12, 0)):
            if wdt: d.ellipse((cx - rr, 330 - rr, cx + rr, 330 + rr), outline=(255, 255, 255), width=wdt)
            else: d.ellipse((cx - rr, 330 - rr, cx + rr, 330 + rr), fill=(255, 255, 255))
        for k in range(12):
            a = k * math.pi / 6
            d.line((cx, 330, cx + 100 * math.cos(a), 330 + 100 * math.sin(a)), fill=(255, 255, 255, 160), width=3)
    d.line((150, 330, 256, 220, 362, 330), fill=(250, 210, 60), width=12, joint="curve")
    text_c(d, 120, "DIMANCHE", fit("DIMANCHE", "impact.ttf", 430, 110), (250, 210, 60))
    text_c(d, 540, "SANS VOITURE", fit("SANS VOITURE", "impact.ttf", 440, 84), (255, 255, 255))
    text_c(d, 620, "la ville à vélo, à pied, en roller", font("arialbd.ttf", 26), (220, 235, 255))
    text_c(d, 690, "dim. 20.09  ·  9:30 – 19:00", font("arial.ttf", 28), (255, 255, 255))
    return im


def p_read():           # a typographic reading-week poster
    im = Image.new("RGB", (W, H), (250, 206, 40)); d = ImageDraw.Draw(im)
    text_c(d, 180, "LIRE", fit("LIRE", "impact.ttf", 470, 260), (20, 20, 20))
    text_c(d, 400, "LEZEN", fit("LEZEN", "impact.ttf", 470, 210), (255, 255, 255))
    for k in range(6): d.rectangle((40 + k * 75, 520, 90 + k * 75, 600 - (k % 3) * 18), fill=(20, 20, 20) if k % 2 else (190, 60, 40))
    d.rectangle((30, 600, 482, 606), fill=(20, 20, 20))
    text_c(d, 660, "la semaine des bibliothèques", font("georgiab.ttf", 28), (20, 20, 20))
    text_c(d, 710, "05 – 11.10", font("arialbd.ttf", 34), (20, 20, 20))
    return im


def p_cinema():         # open-air cinema: night sky, stars, a screen
    im = gradient((24, 16, 60), (90, 30, 90)); d = ImageDraw.Draw(im, "RGBA"); r = random.Random(6)
    for _ in range(160):
        x, y, s = r.randint(0, W), r.randint(0, 420), r.choice((1, 1, 2, 3))
        d.ellipse((x - s, y - s, x + s, y + s), fill=(255, 255, 230, r.randint(120, 255)))
    d.rectangle((96, 220, 416, 400), fill=(245, 240, 225))
    d.rectangle((96, 220, 416, 400), outline=(30, 20, 40), width=6)
    for k in range(7): d.ellipse((60 + k * 60, 470, 110 + k * 60, 540), fill=(20, 14, 30))
    text_c(d, 120, "CINÉ", fit("CINÉ", "impact.ttf", 440, 120), (255, 214, 120))
    text_c(d, 600, "PLEIN AIR", fit("PLEIN AIR", "impact.ttf", 440, 96), (255, 255, 255))
    text_c(d, 680, "tous les vendredis d'août · 21:30", font("arial.ttf", 24), (230, 210, 255))
    return im


def p_lights():         # a lights festival: radial coloured dots (glows well at night)
    im = Image.new("RGB", (W, H), (10, 10, 22)); g = Image.new("RGB", (W, H), (0, 0, 0)); d = ImageDraw.Draw(g); r = random.Random(7)
    for k in range(70):
        a, rr = r.random() * math.tau, r.random() ** 0.6 * 230
        x, y, s = W / 2 + math.cos(a) * rr, 300 + math.sin(a) * rr, r.randint(6, 26)
        c = r.choice([(255, 90, 60), (255, 200, 60), (80, 200, 255), (200, 90, 255), (90, 255, 160)])
        d.ellipse((x - s, y - s, x + s, y + s), fill=c)
    im = Image.blend(im, g.filter(ImageFilter.GaussianBlur(10)), 0.9)
    im.paste(g, (0, 0), g.convert("L").point(lambda v: 255 if v > 30 else 0))
    d = ImageDraw.Draw(im)
    text_c(d, 600, "FESTIVAL", fit("FESTIVAL", "arialbd.ttf", 440, 80), (255, 255, 255))
    text_c(d, 670, "DES LUMIÈRES", fit("DES LUMIÈRES", "arialbd.ttf", 440, 56), (255, 210, 120))
    text_c(d, 730, "14 – 16.12  ·  dès 17:00", font("arial.ttf", 26), (200, 200, 230))
    return im


def p_park():           # a park party: soft shapes, big rounded type
    im = Image.new("RGB", (W, H), (246, 226, 232)); d = ImageDraw.Draw(im)
    d.ellipse((-120, 420, 360, 900), fill=(70, 150, 90))
    d.ellipse((220, 470, 700, 950), fill=(40, 110, 70))
    d.ellipse((330, 60, 470, 200), fill=(250, 180, 40))
    for k, c in enumerate([(230, 80, 120), (90, 140, 230), (250, 180, 40)]):
        d.polygon([(70 + k * 60, 300), (100 + k * 60, 300), (85 + k * 60, 340)], fill=c)
    d.line((60, 300, 280, 300), fill=(60, 60, 60), width=3)
    text_c(d, 200, "LE PARC", fit("LE PARC", "arialbd.ttf", 300, 80), (60, 40, 60), x=180)
    text_c(d, 390, "EN FÊTE", fit("EN FÊTE", "impact.ttf", 440, 110), (230, 80, 120))
    text_c(d, 640, "jeux · musique · pique-nique", font("arialbd.ttf", 28), (255, 255, 255))
    text_c(d, 700, "sam. 06.06 · 14:00", font("arialbd.ttf", 32), (255, 255, 255))
    return im


POSTERS = [p_trees, p_market, p_shapes, p_cycle, p_read, p_cinema, p_lights, p_park]

if __name__ == "__main__":
    atlas = Image.new("RGB", (W * COLS, H * ROWS))
    for i, f in enumerate(POSTERS):
        atlas.paste(f(), ((i % COLS) * W, (i // COLS) * H))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    atlas.save(OUT, quality=88, optimize=True)
    print(OUT, OUT.stat().st_size // 1024, "KB", [f.__name__ for f in POSTERS])
