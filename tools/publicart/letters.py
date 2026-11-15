"""PUBLIC ART KIT: the lettering atlas (models/publicart/publicart_letters.png + .json), ONLY the real texts as read on the
photos (docs/publicart/PUBLIC_ART_KIT.md): the two slabs of La Victoire (FR / NL), the Gobert pier's inscription and its
two gilt dates, the milestones' numerals (5 photographed; 0 and 1 from OSM ref / inscription) and the Burgundy cross of the
Charles V boundary stones (documented: "bornes marquees de la Croix de Bourgogne"). White = carved / gilt.

    python tools/publicart/letters.py

Cells: TEXCOORD_0 = 1000 (cell + 1) + s, v = t in metres on the face (tools/blender/publicart.py CELLS: same order); the
medallion / cross cells are read by the city from the piece's local position (viewer/publicart/artMaterials.js).
"""
import json, math
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "models" / "publicart"
SERIF, SERIFB, SANS = "C:/Windows/Fonts/times.ttf", "C:/Windows/Fonts/timesbd.ttf", "C:/Windows/Fonts/GOTHIC.TTF"


def font(path, px): return ImageFont.truetype(path, max(4, int(round(px))))
def cap_of(path):
    b = font(path, 200).getbbox("H"); return (b[3] - b[1]) / 200


def line(draw, text, path, cap_px, cx, cap_top, max_w=None, stroke=0):
    f = font(path, cap_px / cap_of(path))
    bb = f.getbbox(text); top = f.getbbox("H")[1]
    w = bb[2] - bb[0]
    if max_w and w > max_w:
        f = font(path, cap_px / cap_of(path) * max_w / w); bb = f.getbbox(text); top = f.getbbox("H")[1]; w = bb[2] - bb[0]
    draw.text((cx - w / 2 - bb[0], cap_top - top), text, fill=255, font=f, stroke_width=stroke, stroke_fill=255)


# name, size (m), px per m, draw(draw, W, H, ppm)
def slab(lines_, years=("1914-1918", "1940-1945")):
    def d(dr, W, H, k):
        # the dates in the top corners, the text centred below (photos 2022_050_212 / OM_2022_060_004)
        line(dr, years[0], SERIF, 0.042 * k, W * 0.2, 0.05 * k)
        line(dr, years[1], SERIF, 0.042 * k, W * 0.8, 0.05 * k)
        y = 0.135
        for t in lines_:
            line(dr, t, SERIF, 0.027 * k, W / 2, y * k, max_w=W * 0.9); y += 0.0625
    return d


FR = ["EN MEMOIRE DE CEUX", "QUI SE SONT EVADES", "DES CAMPS ET DES TERRITOIRES", "OCCUPES PAR L'ENNEMI",
      "POUR SE JOINDRE PAR DES VOIES", "CLANDESTINES ET PERILLEUSES", "AUX COMBATTANTS DE LA LIBERTE"]
NL = ["TER HERINNERING", "AAN DIE WELKE ONTSNAPTEN", "UIT DE KAMPEN EN UIT DE GEBIEDEN", "DIE DOOR DE VIJAND BEZET WAREN",
      "OM LANGS CLANDESTIENE EN GEVAARLIJKE WEGEN", "DE VRIJHEIDSSTRIJDERS TE VERVOEGEN"]


def pier(dr, W, H, k):
    # OM_2022_061_002: sans-serif capitals, "RENE GOBERT" larger; the block in the upper part of the lower stone
    L = [("L'UNION DES", 0.045), ("ANCIENS COMBATTANTS", 0.045), ("D'UCCLE", 0.045), ("A SON VENERE PRESIDENT", 0.04),
         ("RENE GOBERT", 0.075), ("FUSILLE PAR LES ALLEMANDS", 0.034), ("LE 17 SEPTEMBRE 1943", 0.034), ("LIEUTENANT S.R.A", 0.034)]
    y = 0.06
    for t, c in L:
        line(dr, t, SANS, c * k, W / 2, y * k, max_w=W * 0.92); y += c * 1.75


def date(text):
    def d(dr, W, H, k):
        line(dr, text, SERIFB, 0.26 * k, W / 2, (H / k / 2 - 0.13) * k, max_w=W * 0.78, stroke=1)
    return d


def digit(text):
    def d(dr, W, H, k):
        line(dr, text, SERIF, 0.085 * k, W / 2, (H / k / 2 - 0.0425) * k, stroke=1)
    return d


def cross(dr, W, H, k):
    # the Burgundy cross (a saltire of two ragged staffs): two crossed bars with short stubs
    c = W / 2; L = 0.11 * k; w = 0.016 * k
    for s in (-1, 1):
        a = math.radians(45 * s)
        dx, dy = math.sin(a) * L, math.cos(a) * L
        dr.line([(c - dx, c - dy), (c + dx, c + dy)], fill=255, width=int(w))
        for t in (-0.6, -0.2, 0.2, 0.6):
            px, py = c + dx * t, c + dy * t
            nx, ny = math.cos(a) * 0.022 * k * (1 if t > 0 else -1), -math.sin(a) * 0.022 * k * (1 if t > 0 else -1)
            dr.line([(px, py), (px + nx, py + ny)], fill=255, width=int(w * 0.8))


CELLS = [  # same order as tools/blender/publicart.py CELLS (then the medallion / cross cells)
    ("evades_fr", (1.05, 0.62), 900, slab(FR)),
    ("evades_nl", (1.05, 0.62), 900, slab(NL)),
    ("gobert_pier", (0.9, 1.25), 520, pier),
    ("gobert_1914", (2.68, 0.5), 260, date("1914-1918")),
    ("gobert_1940", (2.68, 0.5), 260, date("1940-1943")),
    ("digit_5", (0.17, 0.17), 900, digit("5")),
    ("digit_0", (0.17, 0.17), 900, digit("0")),
    ("digit_1", (0.17, 0.17), 900, digit("1")),
    ("cross", (0.26, 0.26), 700, cross),
]
W = 2048
x = y = 8; shelf = 0; rects = []
for name, (w, h), k, _ in CELLS:
    pw, ph = int(round(w * k)), int(round(h * k))
    if x + pw + 8 > W: x = 8; y += shelf + 8; shelf = 0
    rects.append((x, y, x + pw, y + ph)); x += pw + 8; shelf = max(shelf, ph)
H = (y + shelf + 8 + 15) // 16 * 16
im = Image.new("L", (W, H), 0)
dr = ImageDraw.Draw(im)
out = []
for i, ((name, (w, h), k, fn), r) in enumerate(zip(CELLS, rects)):
    sub = Image.new("L", (r[2] - r[0], r[3] - r[1]), 0)
    fn(ImageDraw.Draw(sub), sub.size[0], sub.size[1], k)
    im.paste(sub, (r[0], r[1]))
    out.append({"index": i, "name": name, "px": list(r), "size_m": [w, h]})
im.save(OUT / "publicart_letters.png", optimize=True)
json.dump({"size": [W, H], "cells": out, "about": "tools/publicart/letters.py: the real texts only (white = carved / gilt)"},
          open(OUT / "publicart_letters.json", "w"), indent=1)
print("atlas", W, H, [(c["name"], c["px"]) for c in out])
