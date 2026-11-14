"""SIGN SHAPES of the street kit (docs/assets/STREETKIT.md): ONE source of truth for the plate outlines, read by the
Blender kit (tools/blender/streetKit.py: the aluminium plates) and the face atlas (tools/streetkit/faceAtlas.py: the
printed faces), so a face's artwork meets its plate's edge exactly. Pure Python (no numpy, no bpy).

Belgian road-sign code (Royal Decree of 1 December 1975, "code de la route" annex 1; sizes per the ministerial decree of
11 October 1976, small urban format), sizes in metres:
  circle     C / D signs (prohibitions, mandatory): diameter 0.60
  tri_down   B1 give way: side 0.70, point down, corners rounded r 0.04
  tri_up     B15 priority at the next junction (danger triangle shape): side 0.70, point up
  octagon    B5 stop: 0.60 across flats
  diamond    B9 priority road: a 0.50 square turned 45 deg (0.707 over the corners), corners r 0.02
  square     F / E information signs (F19 one-way, F49 crossing, E9a parking): 0.60, corners r 0.035
  rect       F4a zone 30, F12a living street: 0.60 x 0.90, corners r 0.035
Outlines are CCW, centred on the bounding-box centre (x right, y up), as seen from the FRONT (the face).
"""
import math

SHAPES = {
    "circle": dict(w=0.60, h=0.60),
    "tri_down": dict(w=0.70, h=0.70 * math.sqrt(3) / 2),
    "tri_up": dict(w=0.70, h=0.70 * math.sqrt(3) / 2),
    "octagon": dict(w=0.60, h=0.60),
    "diamond": dict(w=0.50 * math.sqrt(2), h=0.50 * math.sqrt(2)),
    "square": dict(w=0.60, h=0.60),
    "rect": dict(w=0.60, h=0.90),
}
CORNER = {"tri_down": 0.04, "tri_up": 0.04, "diamond": 0.02, "square": 0.035, "rect": 0.035, "octagon": 0.0}


def _round_corners(poly, r, steps=6):
    """a convex CCW polygon with every corner rounded (radius r): the arc is tangent to both edges"""
    if r <= 0: return list(poly)
    out, n = [], len(poly)
    for i in range(n):
        p0, p1, p2 = poly[i - 1], poly[i], poly[(i + 1) % n]
        a = (p0[0] - p1[0], p0[1] - p1[1]); la = math.hypot(*a); a = (a[0] / la, a[1] / la)
        b = (p2[0] - p1[0], p2[1] - p1[1]); lb = math.hypot(*b); b = (b[0] / lb, b[1] / lb)
        ang = math.acos(max(-1.0, min(1.0, a[0] * b[0] + a[1] * b[1])))
        t = r / math.tan(ang / 2)
        bis = (a[0] + b[0], a[1] + b[1]); lbis = math.hypot(*bis); bis = (bis[0] / lbis, bis[1] / lbis)
        c = (p1[0] + bis[0] * r / math.sin(ang / 2), p1[1] + bis[1] * r / math.sin(ang / 2))
        s = (p1[0] + a[0] * t, p1[1] + a[1] * t); e = (p1[0] + b[0] * t, p1[1] + b[1] * t)
        a0 = math.atan2(s[1] - c[1], s[0] - c[0]); a1 = math.atan2(e[1] - c[1], e[0] - c[0])
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        for k in range(steps + 1):
            q = a0 + da * k / steps
            out.append((c[0] + r * math.cos(q), c[1] + r * math.sin(q)))
    return out


def outline(kind, inset=0.0, segs=None):
    """the plate outline (CCW, metres, centred on the bbox centre), shrunk by `inset` (borders of the artwork)"""
    s = SHAPES[kind]
    w, h = s["w"], s["h"]
    if kind == "circle":
        n = segs or 48
        r = w / 2 - inset
        return [(r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n)) for k in range(n)]
    if kind == "octagon":
        r = (w / 2 - inset) / math.cos(math.pi / 8)
        return [(r * math.cos(math.pi / 8 + k * math.pi / 4), r * math.sin(math.pi / 8 + k * math.pi / 4)) for k in range(8)]
    if kind in ("tri_down", "tri_up"):
        # the triangle's corners, then shrink toward the incentre by `inset` (offset of each edge)
        if kind == "tri_down": P = [(-w / 2, h / 2), (0.0, -h / 2), (w / 2, h / 2)]
        else: P = [(-w / 2, -h / 2), (w / 2, -h / 2), (0.0, h / 2)]
        P = _ccw(P)
        cy = (-h / 2 + h / 3) if kind == "tri_up" else (h / 2 - h / 3)       # incentre (equilateral: the centroid)
        rin = h / 3
        k = (rin - inset) / rin
        P = [(x * k, cy + (y - cy) * k) for x, y in P]
        return _round_corners(P, max(0.0, CORNER[kind] - inset), segs or 6)
    if kind == "diamond":
        d = w / 2 - inset * math.sqrt(2)
        P = [(d, 0.0), (0.0, d), (-d, 0.0), (0.0, -d)]
        return _round_corners(P, max(0.0, CORNER[kind] - inset), segs or 4)
    # square / rect
    x, y = w / 2 - inset, h / 2 - inset
    P = [(x, -y), (x, y), (-x, y), (-x, -y)]
    return _round_corners(P, max(0.0, CORNER[kind] - inset), segs or 5)


def _ccw(P):
    a = sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))
    return P if a > 0 else list(reversed(P))


# The faces (atlas cells) and the plate each goes on. Order = the atlas cell index (4 x 4 cells, row-major from the top).
FACES = [
    ("B1", "tri_down", "give way"),
    ("B5", "octagon", "stop"),
    ("B9", "diamond", "priority road"),
    ("B15", "tri_up", "priority at the next junction"),
    ("C1", "circle", "no entry (one-way street, wrong end)"),
    ("C3", "circle", "no entry for all vehicles"),
    ("C43_20", "circle", "speed limit 20"),
    ("C43_30", "circle", "speed limit 30"),
    ("C43_50", "circle", "speed limit 50"),
    ("C43_70", "circle", "speed limit 70"),
    ("F4a", "rect", "zone 30 (start)"),
    ("F12a", "rect", "living street (woonerf / zone residentielle)"),
    ("F19", "square", "one-way street"),
    ("E9a", "square", "parking"),
    ("F49", "square", "pedestrian crossing"),
    ("D7", "circle", "compulsory cycle path"),
]
FACE_INDEX = {f[0]: i for i, f in enumerate(FACES)}
FACE_SHAPE = {f[0]: f[1] for f in FACES}
