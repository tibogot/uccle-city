"""PAPENKASTEEL COMPARISON SHEETS: each Cycles preview (docs/geleytsbeek/preview_*.png, from tools/blender/papenkasteel.py
--previews) beside a WORDS-ONLY description of the reference seen from about the same viewpoint (the reference photos are
looked at, never shipped: the owner's rule), what matches and what differs.

    python tools/papenkasteel_sheets.py            -> docs/geleytsbeek/sheet_<view>.jpg (+ the previews as .jpg)
"""
import os
import textwrap
from PIL import Image, ImageDraw, ImageFont

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
D = os.path.join(ROOT, "docs", "geleytsbeek")

SHEETS = {
    "bing_oblique": (
        "Reference: heritage inventory 27820, photo P03 = a Bing Maps oblique (2014), from the south-south-east, high.",
        ["White rendered two-storey house under a dark slate hipped roof; a square red-brick tower with white stone quoins "
         "in the middle of the courtyard front, four windows above an arched door, rising two storeys over the roof.",
         "Tower top: a flared slate bell with an oval oeil-de-boeuf per face, a slate bulb cupola, small urns at its foot, "
         "a spike.",
         "Two windows each side of the tower on both floors; a small dormer on the roof left and right of the tower.",
         "Two low white wings with hipped slate roofs frame the courtyard (west and east).",
         "Brick chimneys: two behind the ridge on the right (east), one on the west hip.",
         "The long outbuilding range closes the courtyard on the south, its back slope with two small white dormers near "
         "the east end, its back wall partly bare brick."],
        ["MATCHES: the massing (UrbIS footprints, DSM heights), tower position and height, bell + bulb, window rhythm, "
         "dormers, chimney positions, the two wings, the range with its dormers.",
         "DIFFERS: the east wing is an L in the photo (one rectangle here); the range's back wall is all brick here "
         "(partly white render in the photo); trees and the parterre are not part of this model."]),
    "aerial_south": (
        "Reference: the heritage booklet 'Les chateaux' (urban.brussels), aerial 'Het Papenkasteel in Ukkel, huidige "
        "toestand' (Schmitt-GlobalView), from the south over the row houses.",
        ["The tower's brick shows horizontal white stone bands; its bell is a flared skirt under a swelling slate bulb.",
         "Two small dormers sit low on the west hip (near the eaves), one dormer each side of the tower on the front slope.",
         "Chimneys: a tall one on the west hip, one behind the ridge to the east.",
         "The tower door is arched with a fanlight; white joinery everywhere."],
        ["MATCHES: bands, bell + bulb, chimneys, door, front dormers.",
         "DIFFERS: the two small dormers on the west hip are not modelled; the bulb's ribs and small lucarnes are simplified."]),
    "tower_1972": (
        "Reference: Wikimedia Commons 'Paepenkasteel.1972.jpg' (Guywets, public domain), the tower from below, winter.",
        ["Red brick 'en bandeau': a single course of white stone every ~1.45 m across each face, tied into the quoins and "
         "the window frames.",
         "Quoins of small alternating white stone blocks; narrow stone window frames with short alternating jamb stones and "
         "a lintel; two-leaf casements with four panes per leaf.",
         "Long vertical iron wall anchors either side of the windows; three square holes in stone frames under the cornice.",
         "A projecting cornice on small corbels; a flared slate bell with an oval oeil-de-boeuf; in 1972 only a spike on "
         "top (the bulb had gone in the 1967 roof works, later restored: Bing 2014)."],
        ["MATCHES: bands, quoins, frames, casements, anchors, the putlog holes, corbelled cornice, bell and oeil-de-boeuf.",
         "DIFFERS: brick colour comes from the material library at run time; the bell's curve is from the DSM, its exact "
         "flare is ESTIMATED."]),
    "courtyard": (
        "Reference: inventory photos P01 / P02 (through the street gate, the drive of cobbles and gravel towards the "
        "courtyard) + Bing 2014.",
        ["Seen past the gate piers: the tower on the right in red brick and white stone, the white house behind it, low "
         "white outbuildings with slate roofs either side of the drive."],
        ["MATCHES: tower, white house, low white wings with slate roofs.",
         "DIFFERS: the gate piers (stone, ball finials), the cobbled drive and the pollarded trees are not modelled (outside "
         "the UrbIS solids); the wings' courtyard faces are ESTIMATED."]),
    "garden_front": (
        "Reference: NONE (the garden / lawn front, north-west, is not in any free photo; Street View does not reach it).",
        ["The heritage booklet: on the garden side the windows come almost down to the floor."],
        ["ESTIMATED: seven bays of French windows on the ground floor about the tower's axis, first-floor windows above, "
         "two dormers; to be checked from the park path (look-only) on the browser turn."]),
    "west_parterre": (
        "Reference: Bing 2014 (the west end, partly under ivy, seen obliquely) + the heritage aerial.",
        ["The west end: three bays, tall ground-floor windows, ivy on the lower wall; the west wing's garden side with "
         "French windows; the parterre in front."],
        ["MATCHES: three bays, tall windows, the wing.",
         "DIFFERS: ivy and the parterre are not modelled; the wing's window count is ESTIMATED."]),
    "grazing_tower": (
        "Quality check (no reference): a low sun skimming the tower front.",
        ["Flat walls clean (no streaks, no triangle fans), every band / quoin / frame casting a crisp shadow, the anchors "
         "and the putlog holes read."],
        ["Mesh audit 0 blocking (raw LOD0 + far)."]),
    "grazing_house": (
        "Quality check (no reference): a low sun across the tower's door and the west wing.",
        ["Flat render and brick read flat (no streaks), bands / quoins / voussoirs / the fanlight's bars cast crisp shadows, "
         "the wing's roof clipped cleanly at the house wall."],
        ["Mesh audit 0 blocking (raw LOD0 + far)."]),
}


def font(sz):
    for f in ("C:/Windows/Fonts/segoeui.ttf", "C:/Windows/Fonts/arial.ttf"):
        if os.path.exists(f): return ImageFont.truetype(f, sz)
    return ImageFont.load_default()


def main():
    f_t, f_b = font(26), font(20)
    for view, (ref, saw, verdict) in SHEETS.items():
        src = os.path.join(D, f"preview_{view}.png")
        if not os.path.exists(src): print("missing", src); continue
        im = Image.open(src).convert("RGB")
        im.save(os.path.join(D, f"preview_{view}.jpg"), quality=86)
        W = 760
        sheet = Image.new("RGB", (im.width + W, max(im.height, 900)), (246, 245, 241))
        sheet.paste(im, (0, 0))
        d = ImageDraw.Draw(sheet)
        x, y = im.width + 28, 24
        d.text((x, y), f"Papenkasteel - {view.replace('_', ' ')}", font=f_t, fill=(20, 20, 20)); y += 46
        def para(t, fill=(40, 40, 40), indent=0):
            nonlocal y
            for line in textwrap.wrap(t, 64 - indent // 10):
                d.text((x + indent, y), line, font=f_b, fill=fill); y += 26
            y += 8
        para("LEFT: our model (Cycles preview, flat colours per slot, baked lighting).", (90, 90, 90))
        para(ref, (20, 60, 110))
        para("The reference shows (in words; the photo is not shipped):", (20, 20, 20))
        for t in saw: para("- " + t, indent=12)
        for t in verdict: para(t, (110, 40, 20) if t.startswith(("DIFFERS", "ESTIMATED")) else (20, 90, 40))
        out = os.path.join(D, f"sheet_{view}.jpg")
        sheet.save(out, quality=86)
        print(out)


if __name__ == "__main__":
    main()
