"""THE FACE ATLAS of the street kit (docs/assets/STREETKIT.md): the printed faces of the Belgian road signs and the
Villo station-head strips, drawn here as vectors (PIL, 4x supersampled) into ONE baked texture:

    models/streetkit/streetkit_faces.png   2048 x 2560 sRGB
      rows 0-3: 16 sign cells of 512 x 512 (signShapes.FACES order, row-major from the top); a cell covers the plate's
                bounding box (signShapes.SHAPES w x h) exactly, so the viewer maps a face by its local position:
                uv = pos.xy / (w, h) + 0.5 (no UVs needed at any LOD); outside the outline the cell holds the edge
                colour (no bleed at the rim under mipmapping)
      row 4   : 64 strips of 256 x 64 for the Villo station heads (number + name, from the Brussels Mobility WFS
                records of data/streetlife), 8 per row of the 512-px band; index = the station's rank by number

Drawn after the Belgian code's figures (Royal Decree of 1 December 1975, annex 1): colours as the retroreflective sheet
reads by day (RAL 3020 red, RAL 5017 blue, RAL 1023 yellow, white, black). Pictograms are simplified to what reads at
street distance (no copied artwork). Fonts: Arial Narrow Bold (numbers), Arial Bold (STOP, ZONE, P) from Windows.
    python tools/streetkit/faceAtlas.py        (standalone: no station strips)
"""
import math, os, sys
from PIL import Image, ImageDraw, ImageFont

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from signShapes import FACES, SHAPES, outline  # noqa: E402

CELL, SS = 512, 4
W_ATLAS, H_ATLAS = 2048, 2560
RED, BLUE, YEL, WHITE, BLACK, GREY = (200, 16, 30), (0, 76, 150), (247, 181, 0), (244, 244, 240), (24, 24, 24), (150, 152, 152)
FONT_N = "C:/Windows/Fonts/ARIALNB.TTF"
FONT_B = "C:/Windows/Fonts/arialbd.ttf"


class Face:
    """a supersampled canvas for one plate: metric coordinates (x right, y up, the bbox centre at 0)"""
    def __init__(self, kind, bg):
        self.kind = kind; self.w, self.h = SHAPES[kind]["w"], SHAPES[kind]["h"]
        self.N = CELL * SS
        self.img = Image.new("RGB", (self.N, self.N), bg)
        self.d = ImageDraw.Draw(self.img)

    def px(self, x, y):
        return ((x / self.w + 0.5) * self.N, (0.5 - y / self.h) * self.N)

    def poly(self, pts, col):
        self.d.polygon([self.px(x, y) for x, y in pts], fill=col)

    def shape(self, inset, col):
        self.poly(outline(self.kind, inset, 96 if self.kind == "circle" else None), col)

    def circle(self, cx, cy, r, col, n=96):
        self.poly([(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)], col)

    def ring(self, cx, cy, r0, r1, col, n=96):
        for k in range(n):                                  # (quads: PIL has no polygon with holes)
            a0, a1 = 2 * math.pi * k / n, 2 * math.pi * (k + 1.02) / n
            self.poly([(cx + r0 * math.cos(a0), cy + r0 * math.sin(a0)), (cx + r1 * math.cos(a0), cy + r1 * math.sin(a0)),
                       (cx + r1 * math.cos(a1), cy + r1 * math.sin(a1)), (cx + r0 * math.cos(a1), cy + r0 * math.sin(a1))], col)

    def rect(self, x0, y0, x1, y1, col):
        self.poly([(x0, y0), (x1, y0), (x1, y1), (x0, y1)], col)

    def line(self, pts, width, col):
        """a polyline of `width` metres (round joints)"""
        for a, b in zip(pts, pts[1:]):
            dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L * width / 2, dx / L * width / 2
            self.poly([(a[0] + nx, a[1] + ny), (b[0] + nx, b[1] + ny), (b[0] - nx, b[1] - ny), (a[0] - nx, a[1] - ny)], col)
        for p in pts: self.circle(p[0], p[1], width / 2, col, 24)

    def text(self, s, cx, cy, height, col, font=FONT_B, squeeze=1.0, max_w=None):
        """text whose CAP height is `height` m, centred on (cx, cy); squeeze < 1 narrows it"""
        ppm = self.N / self.h                               # isotropic pixels per metre for the glyphs
        size = int(height * ppm / 0.716)                    # (Arial's cap height ~0.716 em)
        f = ImageFont.truetype(font, size)
        l, t, r, b = f.getbbox(s, anchor="ls")
        tw, th = r - l, -t
        wm = tw / ppm * squeeze
        if max_w and wm > max_w: squeeze *= max_w / wm; wm = max_w
        tmp = Image.new("L", (tw + 8, th + 8), 0)
        ImageDraw.Draw(tmp).text((4 - l, 4 + th), s, font=f, fill=255, anchor="ls")
        # into the metric box: width wm, height = cap height (+ the 8 px pad scaled alike)
        bw = (tw + 8) / ppm * squeeze; bh = (th + 8) / ppm
        x0, y0 = self.px(cx - bw / 2, cy + bh / 2); x1, y1 = self.px(cx + bw / 2, cy - bh / 2)
        m = tmp.resize((max(1, round(x1 - x0)), max(1, round(y1 - y0))), Image.LANCZOS)
        self.img.paste(Image.new("RGB", m.size, col), (round(x0), round(y0)), m)

    def done(self):
        return self.img.resize((CELL, CELL), Image.LANCZOS)


def red_ring_sign(F, inner=WHITE):
    """C-type: a thin white edge, the red ring, the white field"""
    F.shape(0, WHITE); F.shape(0.008, RED); F.shape(0.008 + 0.075, inner)


def speed(n):
    F = Face("circle", WHITE); red_ring_sign(F)
    F.text(str(n), 0, 0, 0.25, BLACK, FONT_N, 0.95)
    return F


def bicycle(F, cx, cy, s, col, width):
    """a side-on bicycle (simplified: two wheels, the diamond frame, saddle, bars), s = the wheelbase"""
    r = s * 0.36
    a, b = (cx - s / 2, cy - s * 0.12), (cx + s / 2, cy - s * 0.12)
    crank = (cx - s * 0.05, cy - s * 0.12); seat = (cx - s * 0.17, cy + s * 0.3); head = (cx + s * 0.3, cy + s * 0.28)
    for c in (a, b): F.ring(c[0], c[1], r - width / 2, r + width / 2, col, 64)
    F.line([a, crank, head, b], width, col); F.line([a, seat, crank], width, col); F.line([seat, (seat[0] + s * 0.47, seat[1] - s * 0.02)], width, col)
    F.line([(seat[0] - s * 0.09, seat[1] + s * 0.06), (seat[0] + s * 0.05, seat[1] + s * 0.06)], width * 1.2, col)
    F.line([head, (head[0] - s * 0.03, head[1] + s * 0.12), (head[0] - s * 0.13, head[1] + s * 0.14)], width, col)


def walker(F, cx, cy, h, col):
    """a walking figure (simplified), h = its height"""
    w = h * 0.11
    F.circle(cx + h * 0.04, cy + h * 0.42, h * 0.085, col, 32)
    hip = (cx, cy - h * 0.02); neck = (cx + h * 0.03, cy + h * 0.3)
    F.line([neck, hip], w * 1.25, col)
    F.line([hip, (cx + h * 0.13, cy - h * 0.22), (cx + h * 0.2, cy - h * 0.46)], w, col)
    F.line([hip, (cx - h * 0.08, cy - h * 0.24), (cx - h * 0.2, cy - h * 0.44)], w, col)
    F.line([(cx + h * 0.02, cy + h * 0.26), (cx + h * 0.14, cy + h * 0.1), (cx + h * 0.2, cy - h * 0.02)], w * 0.85, col)
    F.line([(cx + h * 0.02, cy + h * 0.26), (cx - h * 0.1, cy + h * 0.1), (cx - h * 0.16, cy - h * 0.02)], w * 0.85, col)


def draw(code):
    if code == "B1":
        F = Face("tri_down", WHITE); F.shape(0, WHITE); F.shape(0.008, RED); F.shape(0.008 + 0.085, WHITE)
    elif code == "B5":
        F = Face("octagon", WHITE); F.shape(0, WHITE); F.shape(0.012, RED)
        F.text("STOP", 0, 0, 0.17, WHITE, FONT_B, 0.92, max_w=0.47)
    elif code == "B9":
        F = Face("diamond", WHITE); F.shape(0, WHITE); F.shape(0.055, BLACK); F.shape(0.064, WHITE); F.shape(0.105, YEL)
    elif code == "B15":
        F = Face("tri_up", WHITE); F.shape(0, WHITE); F.shape(0.008, RED); F.shape(0.008 + 0.085, WHITE)
        F.rect(-0.03, -0.17, 0.03, 0.12, BLACK); F.rect(-0.1, -0.045, 0.1, -0.02, BLACK)
    elif code == "C1":
        F = Face("circle", WHITE); F.shape(0, WHITE); F.shape(0.008, RED)
        F.rect(-0.2, -0.045, 0.2, 0.045, WHITE)
    elif code == "C3":
        F = Face("circle", WHITE); red_ring_sign(F)
    elif code.startswith("C43_"):
        F = speed(int(code[4:]))
    elif code == "F4a":
        F = Face("rect", WHITE); F.shape(0, BLACK); F.shape(0.01, WHITE)
        F.text("ZONE", 0, 0.29, 0.1, BLACK, FONT_B, 0.95)
        F.ring(0, -0.08, 0.2, 0.235, RED); F.circle(0, -0.08, 0.2, WHITE)
        F.text("30", 0, -0.08, 0.17, BLACK, FONT_N, 0.95)
    elif code == "F12a":
        F = Face("rect", BLUE); F.shape(0, WHITE); F.shape(0.012, BLUE); F.shape(0.045, WHITE)
        # house (left), a child with a ball, a car (simplified pictogram of the woonerf sign)
        F.poly([(-0.22, -0.02), (-0.22, 0.15), (-0.13, 0.25), (-0.04, 0.15), (-0.04, -0.02)], BLUE)
        F.rect(-0.16, -0.02, -0.11, 0.07, WHITE)
        walker(F, 0.06, 0.06, 0.2, BLUE); F.circle(0.18, -0.02, 0.03, BLUE)
        F.poly([(-0.2, -0.3), (0.2, -0.3), (0.2, -0.22), (0.11, -0.22), (0.06, -0.15), (-0.08, -0.15), (-0.13, -0.22), (-0.2, -0.22)], BLUE)
        for x in (-0.12, 0.12): F.circle(x, -0.31, 0.035, BLUE); F.circle(x, -0.31, 0.015, WHITE)
        F.rect(-0.25, -0.36, 0.25, -0.345, BLUE)
    elif code == "F19":
        F = Face("square", WHITE); F.shape(0, WHITE); F.shape(0.012, BLUE)
        F.rect(-0.05, -0.2, 0.05, 0.06, WHITE); F.poly([(-0.13, 0.04), (0.13, 0.04), (0.0, 0.21)], WHITE)
    elif code == "E9a":
        F = Face("square", WHITE); F.shape(0, WHITE); F.shape(0.012, BLUE)
        F.text("P", 0.005, 0, 0.36, WHITE, FONT_B, 1.0)
    elif code == "F49":
        F = Face("square", WHITE); F.shape(0, WHITE); F.shape(0.012, BLUE)
        F.poly([(-0.23, -0.2), (0.23, -0.2), (0.0, 0.22)], WHITE)
        for k in range(4): F.rect(-0.17 + k * 0.09, -0.17, -0.12 + k * 0.09, -0.12, BLACK)
        walker(F, 0.0, -0.01, 0.2, BLACK)
    elif code == "D7":
        F = Face("circle", WHITE); F.shape(0, WHITE); F.shape(0.008, BLUE)
        bicycle(F, 0, -0.01, 0.32, WHITE, 0.022)
    else:
        raise ValueError(code)
    return F.done()


def station_strip(num, name, name_nl):
    """a Villo station head: the station number + its FR (NL) name, dark on the station's ochre band (no logo)"""
    S = SS
    img = Image.new("RGB", (256 * S, 64 * S), (232, 172, 18))
    d = ImageDraw.Draw(img)
    fb = ImageFont.truetype(FONT_B, 30 * S); fn = ImageFont.truetype(FONT_N, 17 * S)
    d.text((10 * S, 32 * S), str(num), font=fb, fill=(40, 40, 44), anchor="lm")
    x0 = 10 * S + d.textlength(str(num), font=fb) + 10 * S
    lines = [name] + ([name_nl] if name_nl and name_nl != name else [])
    for i, s in enumerate(lines):
        while d.textlength(s, font=fn) > 256 * S - x0 - 8 * S and len(s) > 4: s = s[:-2] + "."
        y = 32 * S if len(lines) == 1 else (21 + 22 * i) * S
        d.text((x0, y), s, font=fn, fill=(40, 40, 44), anchor="lm")
    return img.resize((256, 64), Image.LANCZOS)


def build(path, stations=()):
    """stations: [(number, name, nameNl)] in strip order (at most 64)"""
    atlas = Image.new("RGB", (W_ATLAS, H_ATLAS), (128, 128, 128))
    for i, (code, kind, _) in enumerate(FACES):
        atlas.paste(draw(code), ((i % 4) * CELL, (i // 4) * CELL))
    for j, (num, name, nl) in enumerate(list(stations)[:64]):
        atlas.paste(station_strip(num, name, nl), ((j % 8) * 256, 4 * CELL + (j // 8) * 64))
    os.makedirs(os.path.dirname(path), exist_ok=True)
    atlas.save(path, optimize=True)
    return path


if __name__ == "__main__":
    out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, "..", "..", "models", "streetkit", "streetkit_faces.png")
    print(build(os.path.abspath(out), [(249, "Saint-Job", "Sint-Job")]))
