"""SQUARE DES HEROS: the lettering atlas of the war memorial (textures/heros/heros_letters.png + .json).

    python tools/heros_letters.py [--names other.json]   (Pillow; run AFTER tools/blender/heros.py: the cells' sizes come
                                                           from models/heros/heros.json "lettering"; the names from
                                                           models/heros/names.json)

The font: Windows' Century Gothic Bold, the closest to the memorial's incised sans-serif capitals (round O's, the G drawn
as a C with a short bar: the owner's photo of the front, 2026-11). Only the rendered mask is shipped (8-bit grey).

One grey mask (white = letter) the city's stone material reads on the faces tools/blender/heros.py codes "letters"
(TEXCOORD_0 = 1000 (cell + 1) + s, v: metres on the panel from its lower left corner seen from in front). The JSON gives
each PRESENT cell's index, pixel rectangle (image rows from the top) and size in metres; a lettered face whose cell is not
in the JSON reads nothing (plain stone): the names' panels are lettered faces from the start, so engraving the names
later is only this script (no Blender run, no repack).

ONLY REAL TEXT (the owner's rule: never mock data):
  - the front (the owner's photo, 2026-11): the FRENCH block "ERIGE / PAR LA COMMUNE / D'UCCLE / A LA MEMOIRE / DE SES
    ENFANTS / MORTS POUR LA PATRIE" and "1914-1918" larger and bolder, on one stone; a horizontal joint; the DUTCH block
    "OPGERICHT / DOOR DE GEMEENTE UKKEL / TER GEDACHTENIS / HARER KINDEREN / VOOR 'T VADERLAND / GESNEUVELD" on the stone
    under it. Line positions, cap heights and the longest line's width measured on the photo as fractions of the block;
  - "1940-1945" carved in the front seat (heritage.uccle.be IMG_0040);
  - THE NAMES: models/heros/names.json (empty until the owner brings the lists from the Uccle commune archives). When it
    has names they are laid out in centred columns on their panels (layout_names). NEVER commit invented names.
"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / "textures" / "heros"
OUT.mkdir(parents=True, exist_ok=True)
FONT = "C:/Windows/Fonts/GOTHICB.TTF"
NAMES = Path(sys.argv[sys.argv.index("--names") + 1]) if "--names" in sys.argv else ROOT / "models" / "heros" / "names.json"
notes = json.load(open(ROOT / "models" / "heros" / "heros.json"))
CELLS = {c["name"]: c for c in notes["lettering"]["cells"]}      # name -> {index, name, size_m, kind}
PX_FRONT = 640          # px per metre: the front inscription (6 cm capitals -> 40 px)
PX_NAMES = 420          # the names (3-4.5 cm capitals -> 14-19 px)

def font(px): return ImageFont.truetype(FONT, max(4, int(round(px))))
_b = font(200).getbbox("H"); CAP = (_b[3] - _b[1]) / 200          # cap height / font size

def line_img(text, cap_px, sx=1.0, bold=0):
    """one line on its own (white on black): cap height cap_px, scaled by sx horizontally, emboldened by `bold` px.
    Returns the image and the row of the capitals' top in it"""
    f = font(cap_px / CAP)
    top = f.getbbox("H")[1]
    bb = f.getbbox(text)
    t0 = min(bb[1], top)
    w, h = bb[2] - bb[0] + 8 + 2 * bold, bb[3] - t0 + 8 + 2 * bold
    im = Image.new("L", (w, h), 0)
    ImageDraw.Draw(im).text((4 + bold - bb[0], 4 + bold - t0), text, fill=255, font=f, stroke_width=bold, stroke_fill=255)
    if abs(sx - 1) > 1e-3: im = im.resize((max(1, int(w * sx)), h), Image.LANCZOS)
    return im, 4 + bold + (top - t0)

def paste_centred(canvas, im, cx, cap_top, off):
    x, y = int(round(cx - im.size[0] / 2)), int(round(cap_top - off))
    canvas.paste(255, (x, y, x + im.size[0], y + im.size[1]), im)

def block(canvas, rect, size_m, lines, ppm):
    """lines: (text, centre (fraction of the block height from its TOP), cap height m, bold px, width fraction of the
    widest line or None): all lines of one call share the horizontal scale the width-giving line sets"""
    x0, y0, x1, y1 = rect
    sx = 1.0
    for text, _, cap, bold, wf in lines:
        if wf:
            im, _ = line_img(text, cap * ppm, 1.0, bold)
            sx = wf * size_m[0] * ppm / (im.size[0] - 8 - 2 * bold)
    for text, yc, cap, bold, wf in lines:
        im, off = line_img(text, cap * ppm, sx, bold)
        paste_centred(canvas, im, (x0 + x1) / 2, y0 + (yc * size_m[1] - cap / 2) * ppm, off)

# ------------------------------------------------------------------------------------------------ the front (owner's photo)
# fractions measured on the photo (2026-11): the blocks 485 / 520 px tall, the face 740 / 780 px wide at them
FR = [("ERIGE", 0.093, 0.062, 0, None), ("PAR LA COMMUNE", 0.227, 0.062, 0, None), ("D'UCCLE", 0.355, 0.062, 0, None),
      ("A LA MEMOIRE", 0.485, 0.062, 0, None), ("DE SES ENFANTS", 0.619, 0.062, 0, None),
      ("MORTS POUR LA PATRIE", 0.746, 0.062, 0, 0.777)]
YEARS = [("1914-1918", 0.905, 0.09, 3, 0.37)]     # larger, bolder (the stroke widened), its own width (0.37 of the face)
NL = [("OPGERICHT", 0.115, 0.064, 0, None), ("DOOR DE GEMEENTE UKKEL", 0.244, 0.064, 0, 0.87), ("TER GEDACHTENIS", 0.385, 0.064, 0, None),
      ("HARER KINDEREN", 0.513, 0.064, 0, None), ("VOOR 'T VADERLAND", 0.654, 0.064, 0, None), ("GESNEUVELD", 0.788, 0.064, 0, None)]

# ------------------------------------------------------------------------------------------------ the names
def load_names():
    """models/heros/names.json: {"1914-1918": [...], "1940-1945": [...], "panels": {"<cell name>": [...]}} (lists of strings,
    one name per line as carved). "panels" puts a list on one panel explicitly (cell names: heros.json "lettering"); the
    two period lists are spread in order over their remaining panels (1914-1918: the shaft's west, back and east faces,
    upper then lower stone; 1940-1945: the eight bench backs from the front, turning west)."""
    if not NAMES.exists(): return {}
    d = json.load(open(NAMES, encoding="utf-8"))
    out = {}
    for name, lst in (d.get("panels") or {}).items():
        if name in CELLS and lst: out[name] = [n for n in lst if n.strip()]
    for period, kind in (("1914-1918", "shaft"), ("1940-1945", "bench")):
        lst = [n for n in (d.get(period) or []) if n.strip()]
        panels = [c for c in sorted(CELLS.values(), key=lambda c: c["index"]) if c.get("kind") == kind and c["name"] not in out]
        if not lst or not panels: continue
        per = -(-len(lst) // len(panels))
        for k, c in enumerate(panels):
            part = lst[k * per:(k + 1) * per]
            if part: out[c["name"]] = part
    return out

def layout_names(names, size_m):
    """centred columns filling the panel: tries 1-5 columns and keeps the one giving the tallest capitals (<= 4.5 cm);
    line pitch 1.6 x the capitals; a 6 % margin round the panel"""
    W, H = size_m[0] * 0.88, size_m[1] * 0.88
    f = font(100)
    widest = max(f.getbbox(n)[2] - f.getbbox(n)[0] for n in names) / (100 * CAP)      # line width per metre of capital
    best = None
    for cols in range(1, 6):
        rows = -(-len(names) // cols)
        cap = min(0.045, H / (rows * 1.6), (W / cols) * 0.9 / widest)
        if not best or cap > best[0] + 1e-4: best = (cap, cols, rows)
    return best

def names_block(canvas, rect, size_m, names, ppm):
    cap, cols, rows = layout_names(names, size_m)
    x0, y0 = rect[0], rect[1]
    cw = size_m[0] * 0.88 / cols * ppm
    top = y0 + (size_m[1] * ppm - (rows * 1.6 - 0.6) * cap * ppm) / 2
    for i, n in enumerate(names):
        c, r = divmod(i, rows)
        im, off = line_img(n, cap * ppm)
        paste_centred(canvas, im, x0 + size_m[0] * 0.06 * ppm + cw * (c + 0.5), top + r * cap * 1.6 * ppm, off)
    return cap, cols, rows

# ------------------------------------------------------------------------------------------------ pack + draw
names = load_names()
fr, nl, yr = CELLS["front_fr"], CELLS["front_nl"], CELLS["years"]
jobs = [(fr, PX_FRONT, lambda cv, r: (block(cv, r, fr["size_m"], FR, PX_FRONT), block(cv, r, fr["size_m"], YEARS, PX_FRONT))),
        (nl, PX_FRONT, lambda cv, r: block(cv, r, nl["size_m"], NL, PX_FRONT)),
        (yr, 500, lambda cv, r: block(cv, r, yr["size_m"], [("1940-1945", 0.5, 0.11, 0, None)], 500))]
report = []
for name, lst in sorted(names.items(), key=lambda kv: CELLS[kv[0]]["index"]):
    c = CELLS[name]
    jobs.append((c, PX_NAMES, lambda cv, r, c=c, lst=lst: report.append((c["name"], len(lst), names_block(cv, r, c["size_m"], lst, PX_NAMES)))))

# shelf packing, the tallest cells first (the viewer reads the mask as ONE 8-bit channel: 2048 x 2048 = 4 MB + mips)
W = 2048 if len(jobs) > 3 else 1024
order = sorted(range(len(jobs)), key=lambda i: -int(jobs[i][0]["size_m"][1] * jobs[i][1]))
x = y = 8; shelf = 0; rects = [None] * len(jobs)
for i in order:
    c, ppm, _ = jobs[i]
    w, h = int(c["size_m"][0] * ppm), int(c["size_m"][1] * ppm)
    if x + w + 8 > W: x = 8; y += shelf + 8; shelf = 0
    rects[i] = (x, y, x + w, y + h); x += w + 8; shelf = max(shelf, h)
H = ((y + shelf + 8 + 63) // 64) * 64
img = Image.new("L", (W, H), 0)
meta = []
for (c, ppm, draw), rect in zip(jobs, rects):
    draw(img, rect)
    meta.append(dict(index=c["index"], name=c["name"], px=list(rect), size_m=c["size_m"]))
img = img.filter(ImageFilter.GaussianBlur(1.1))     # a soft V-cut edge: the shader's bump reads its slope
img.save(OUT / "heros_letters.png", optimize=True)
json.dump(dict(about="tools/heros_letters.py: the war memorial's lettering mask (white = letter): the real front inscription (FR + NL), "
                     "'1940-1945', and the names from models/heros/names.json when it has them (a cell absent here reads as plain stone).",
               size=[W, H], cells=meta), open(OUT / "heros_letters.json", "w"), indent=1)
print("written", OUT / "heros_letters.png", f"{W}x{H}", (OUT / "heros_letters.png").stat().st_size // 1024, "KB;",
      f"{len(names)} names panels" if names else "no names (panels uninscribed)")
for r in report: print("  ", r[0], r[1], "names, capitals", round(r[2][0] * 100, 1), "cm,", r[2][1], "columns x", r[2][2], "rows")
