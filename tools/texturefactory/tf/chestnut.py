"""The horse chestnut's leaf sprays (Aesculus hippocastanum), drawn like tf/leaves.py (2D, at 2x, area-downsampled) but
laid out as the tree grows, not as a star of twigs from the card's centre:

  - ROSETTES: the leaves of a horse chestnut sit in opposite, crossing pairs at the tips of stout shoots, so a crown
    seen from the side is a heap of rosettes: 4-6 big palmate leaves round each shoot tip, the rosette a disc seen
    at a slant (squashed vertically as a whole), the leaves drooping a little (more of them hang below the tip).
    7 rosettes per card at random places (Poisson disc), a few loose leaves at the rim; the shoots under them run
    DOWN out of the rosette (where they come from), short, mostly hidden.
  - LEAVES: palmate compound, 7 (sometimes 5) obovate leaflets from the end of a long petiole, the middle one the
    longest, the outer ones about half; each leaflet with a pointed tip, a double-toothed margin, 15-18 straight
    vein pairs, folded along its midrib and arched (its tip down). ONE foreshortening per leaf (the whole leaf seen at
    a slant), each leaflet in its own frame (veins, normal, colour toward its base).
  - SPRING CANDLES: the upright panicles (20-30 cm) at the shoot tips: a cone of small white florets, a yellow or
    (older) pink-red blotch in some, on a green stalk, drawn over the rosette, pointing UP the card (the cards of
    this species keep their spin small: viewer/treesHorseChestnut.js).
  - WINTER: no leaves: stout grey-brown twigs entering from the card's rim, in opposite pairs, their tips curving UP
    (the horse chestnut's upturned shoot tips), a big glossy red-brown "sticky" bud at every tip, smaller paired
    buds along the shoots. Round twigs (a cylinder's normal across each stroke).

Card frame: canvas rows run DOWN the image and the vendor draws texel row 0 at the card's BOTTOM edge
(stylizedTrees.js leafAtlasNodes: v = 0 at the image's top is the card's "down" axis), so UP on screen is +y here.
"""
import math

import cv2
import numpy as np

from .core import srgb_to_lin, f32
from .leaves import Canvas

UP = math.pi / 2                                       # canvas angle of "up the card" (+y rows)
DOWN = -math.pi / 2


def hexl(s):
    return np.asarray(srgb_to_lin([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)]), f32)


def rot(a):
    c, s = math.cos(a), math.sin(a)
    return np.array([[c, -s], [s, c]])


def squash_m(axis, k):
    """compress by k along the direction `axis` (canvas angle)"""
    return rot(axis) @ np.diag([k, 1.0]) @ rot(-axis)


def ang_toward(a, b, k):
    d = (b - a + math.pi) % (2 * math.pi) - math.pi
    return a + d * k


# ------------------------------------------------------------------------------------------------ one leaflet
def leaflet_outline(sp, rng, n=120):
    """obovate, cuneate base, short pointed tip, double-toothed margin; (x, y) in the leaflet frame (x 0 -> 1)"""
    w = sp["width"]
    ph1, ph2 = rng.uniform(0, 6, 2)
    nt = sp["nteeth"]

    def half(t):
        body = math.sin(math.pi * min(1.0, t ** 1.55 * 0.93 + 0.03)) ** 0.62
        tip = 1 - 0.55 * max(0.0, (t - 0.86) / 0.14) ** 1.5           # the short drawn-out point
        tooth = 1 + sp["teeth"] * (abs(math.sin(t * math.pi * nt + ph1)) ** 3 - 0.3) \
            + sp["teeth"] * 0.5 * (abs(math.sin(t * math.pi * nt * 2 + ph2)) ** 3 - 0.3)
        return w * body * tip * tooth * (t > 0.015)
    ts = np.linspace(0, 1, n // 2)
    return [(t, -half(t)) for t in ts] + [(t, half(t)) for t in ts[::-1]]


def blade(C, idx, lf, sp, rng, M, org, extra_tilt=(0.0, 0.0)):
    """rasterise one leaflet: canvas = org + M @ (lx, ly) (M: 2x2, the leaflet's size, turn and the leaf's squash)"""
    pts = np.array(leaflet_outline(sp, rng), np.float64)
    poly = pts @ M.T + org
    x0, y0 = np.floor(poly.min(0)).astype(int) - 2
    x1, y1 = np.ceil(poly.max(0)).astype(int) + 2
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, C.R), min(y1, C.R)
    if x1 <= x0 or y1 <= y0:
        return
    m = np.zeros((y1 - y0, x1 - x0), np.uint8)
    cv2.fillPoly(m, [np.round((poly - [x0, y0]) * 4).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=2)
    sel = m > 0
    if not sel.any():
        return
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    Mi = np.linalg.inv(M)
    dx, dy = gx - org[0], gy - org[1]
    lx = Mi[0, 0] * dx + Mi[0, 1] * dy
    ly = Mi[1, 0] * dx + Mi[1, 1] * dy
    reg = (slice(y0, y1), slice(x0, x1))
    C.leaf[reg][sel] = idx
    C.lf[reg][sel] = lf
    C.u[reg][sel] = lx[sel]
    C.v[reg][sel] = ly[sel]
    C.a[reg][sel] = 1
    # veins: the midrib + straight, close, parallel laterals (15-18 pairs), a faint secondary net
    vw = sp.get("vein_w", 0.011)
    mid = np.exp(-(ly / (vw * 1.2)) ** 2) * (lx > 0) * (lx < 0.93)
    nv = sp.get("nveins", 16)
    ph = (lx - np.abs(ly) * sp.get("vein_angle", 1.25)) * nv
    d = np.abs(ph - np.round(ph)) / nv
    lat = np.exp(-(d / (vw * 0.6)) ** 2) * (lx > 0.06) * (lx < 0.9) * (np.abs(ly) < 0.85 * sp["width"])
    vein = np.clip(np.maximum(mid, lat * 0.7), 0, 1)
    C.vein[reg][sel] = vein[sel]
    # normal: folded along the midrib (a V), arched (the tip down: the normal leans toward the tip), grooved veins;
    # leaflet frame -> canvas by M's rotation only (the squash ignored for the direction, as tf/leaves.py)
    fold = sp.get("fold", 0.3) * np.tanh(ly / 0.04)
    arch = sp.get("cup", 0.3) * (lx - 0.45)
    nlx = arch + extra_tilt[0]
    nly = fold + np.sign(ly) * vein * 0.12 + extra_tilt[1]
    ang = math.atan2(M[1, 0], M[0, 0])
    ca, sa = math.cos(ang), math.sin(ang)
    ncx, ncy = nlx * ca - nly * sa, nlx * sa + nly * ca
    nz = np.ones_like(ncx)
    ln = np.sqrt(ncx ** 2 + ncy ** 2 + nz ** 2)
    C.n[reg][sel] = np.stack([ncx / ln, -ncy / ln, nz / ln], -1)[sel].astype(f32)
    C.t[reg][sel] = (0.25 + 0.2 * vein)[sel]


def stroke(C, p0, p1, w0, w1, col, thick=1.0, idx=-2):
    """a round twig from p0 to p1 (canvas px), width w0 -> w1 (px): colour, a cylinder's normal across it"""
    p0, p1 = np.asarray(p0, np.float64), np.asarray(p1, np.float64)
    r = max(w0, w1) / 2 + 2
    x0, y0 = np.floor(np.minimum(p0, p1) - r).astype(int)
    x1, y1 = np.ceil(np.maximum(p0, p1) + r).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, C.R), min(y1, C.R)
    if x1 <= x0 or y1 <= y0:
        return
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    d = p1 - p0
    L2 = max(d @ d, 1e-9)
    t = np.clip(((gx - p0[0]) * d[0] + (gy - p0[1]) * d[1]) / L2, 0, 1)
    qx, qy = p0[0] + t * d[0] - gx, p0[1] + t * d[1] - gy
    dist = np.sqrt(qx ** 2 + qy ** 2)
    hw = (w0 + (w1 - w0) * t) / 2
    sel = dist <= hw
    if not sel.any():
        return
    reg = (slice(y0, y1), slice(x0, x1))
    s = np.clip(dist / np.maximum(hw, 1e-6), 0, 0.98)
    # across the twig: the unit vector from the axis to the texel
    ux, uy = -qx / np.maximum(dist, 1e-6), -qy / np.maximum(dist, 1e-6)
    nz = np.sqrt(1 - s ** 2)
    shade = (0.8 + 0.2 * nz)[..., None]
    C.a[reg][sel] = 1
    C.alb[reg][sel] = (np.asarray(col, f32)[None, None, :] * shade)[sel]
    C.t[reg][sel] = thick
    C.leaf[reg][sel] = idx
    C.n[reg][sel] = np.stack([ux * s, -uy * s, nz], -1)[sel].astype(f32)


def blob(C, c, ax, rl, rw, col, thick=0.8, idx=-3, hi=None):
    """an ellipse (bud / floret) centred c, long axis along angle ax, half-lengths rl, rw: a dome's normal; hi = a
    lighter colour toward its lit top-left (the bud's gloss, the floret's petals)"""
    c = np.asarray(c, np.float64)
    r = max(rl, rw) + 2
    x0, y0 = np.floor(c - r).astype(int)
    x1, y1 = np.ceil(c + r).astype(int)
    x0, y0, x1, y1 = max(x0, 0), max(y0, 0), min(x1, C.R), min(y1, C.R)
    if x1 <= x0 or y1 <= y0:
        return
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(np.float64)
    ca, sa = math.cos(ax), math.sin(ax)
    a = ((gx - c[0]) * ca + (gy - c[1]) * sa) / rl
    b = (-(gx - c[0]) * sa + (gy - c[1]) * ca) / rw
    q = a ** 2 + b ** 2
    sel = q <= 1
    if not sel.any():
        return
    reg = (slice(y0, y1), slice(x0, x1))
    nx_, ny_ = (gx - c[0]) / r, (gy - c[1]) / r
    nz = np.sqrt(np.clip(1 - q, 0.02, 1))
    col = np.asarray(col, f32)
    k = (0.75 + 0.25 * nz)[..., None] * col[None, None, :]
    if hi is not None:
        g = np.clip(0.5 - 0.6 * (a * 0.6 - b * 0.8), 0, 1) * nz
        k = k + (np.asarray(hi, f32) - col)[None, None, :] * (g ** 2)[..., None]
    C.a[reg][sel] = 1
    C.alb[reg][sel] = k[sel]
    C.t[reg][sel] = thick
    C.leaf[reg][sel] = idx
    C.n[reg][sel] = np.stack([nx_ * 0.8, -ny_ * 0.8, nz], -1)[sel].astype(f32)


# ------------------------------------------------------------------------------------------------ the leaves
def compound_leaf(C, idx, lf0, sp, rng, org, ang, size, Sq):
    """one palmate leaf: leaflets fanned round `ang` from org (the petiole's end), squashed by Sq (2x2)"""
    n = 7 if rng.random() < sp.get("p7", 0.75) else 5
    spread = (4.4 if n == 7 else 3.5) * rng.uniform(0.9, 1.08)
    order = sorted(range(n), key=lambda j: rng.random())
    for j in order:
        off = (j - (n - 1) / 2) * spread / (n - 1) + rng.uniform(-0.08, 0.08)
        s = size * (1 - 0.52 * (abs(off) / (spread / 2)) ** 1.4) * rng.uniform(0.92, 1.06)
        a = ang + off
        M = Sq @ rot(a) @ np.diag([s, s])
        o = org + Sq @ (np.array([math.cos(a), math.sin(a)]) * size * 0.05)
        blade(C, idx, lf0 + j, sp, rng, M, o)
    return n


def rosettes(sp, R, seed):
    """the summer spray (all seasons with leaves recolour it); returns (Canvas, per-leaf table, rosette list)"""
    rng = np.random.default_rng(seed)
    C = Canvas(R)
    C.lf = np.full((R, R), -1, np.int32)
    c = np.array([R / 2, R / 2])
    size = R * sp["leaf"]
    # rosette centres: a Poisson disc in the card's disc (radius 0.3 R)
    cen = []
    for _ in range(4000):
        if len(cen) >= sp.get("rosettes", 7):
            break
        p = c + rng.uniform(-0.3, 0.3, 2) * R
        if np.linalg.norm(p - c) > 0.3 * R:
            continue
        if all(np.linalg.norm(p - q) > sp.get("spacing", 0.21) * R for q in cen):
            cen.append(p)
    twig = hexl(sp.get("shoot_col", "#6f5e4c"))
    pet_col = hexl(sp.get("petiole_hex", "#7d8a48"))
    jobs = []
    ros = []
    for q in cen:
        # the shoot runs down out of the rosette (where it comes from), under the leaves
        sa = DOWN + rng.uniform(-0.9, 0.9)
        L = R * rng.uniform(0.09, 0.15)
        stroke(C, q + np.array([math.cos(sa), math.sin(sa)]) * L, q, R * 0.011, R * 0.008, twig * rng.uniform(0.85, 1.1))
        # the rosette's disc seen at a slant: squashed vertically (as a whole), a little turned
        k = rng.uniform(0.5, 0.85)
        Sq = squash_m(UP + rng.uniform(-0.35, 0.35), k)
        nl = 4 + int(rng.integers(0, 3))
        a0 = rng.uniform(0, 2 * math.pi)
        for i in range(nl):
            pair, side = divmod(i, 2)
            a = a0 + side * math.pi + pair * (math.pi / 2 + rng.uniform(-0.25, 0.25)) + rng.uniform(-0.2, 0.2)
            a = ang_toward(a, DOWN, sp.get("droop", 0.22))           # the leaves hang a little
            pet = size * rng.uniform(0.6, 0.95) * (1.15 - 0.15 * pair)
            jobs.append((q, a, size * rng.uniform(0.85, 1.1) * (1.05 - 0.1 * pair), pet, Sq))
        ros.append((q, k))
    # loose leaves at the rim (other rosettes' leaves reaching in)
    for _ in range(sp.get("loose", 6)):
        a = rng.uniform(0, 2 * math.pi)
        q = c + np.array([math.cos(a), math.sin(a)]) * R * rng.uniform(0.26, 0.36)
        Sq = squash_m(rng.uniform(0, math.pi), rng.uniform(0.5, 0.9))
        jobs.append((q, a + rng.uniform(-0.6, 0.6), size * rng.uniform(0.8, 1.0), size * rng.uniform(0.3, 0.6), Sq))
    order = rng.permutation(len(jobs))
    lf = 0
    for idx, j in enumerate(order):
        q, a, s, pet, Sq = jobs[j]
        end = q + Sq @ (np.array([math.cos(a), math.sin(a)]) * pet)
        stroke(C, q, end, R * 0.0035, R * 0.0025, pet_col)
        lf += compound_leaf(C, idx, lf, sp, rng, end, a, s, Sq)
    table = np.random.default_rng(seed + 1).random((len(jobs) + 2, 6)).astype(f32)
    C.lf_table = np.random.default_rng(seed + 2).random((lf + 2, 3)).astype(f32)
    return C, table, ros


def leaf_colour(C, table, pal, sp, season, base_colour):
    """tf/leaves.colour (palette per leaf, veins, toward the base, edges / spots, undersides) + the horse chestnut's
    own: each LEAFLET a little apart in value and (autumn) hue, the leaf-miner moth's brown blotches (Cameraria
    ohridella: a few in summer, many in autumn, every Brussels horse chestnut has them)"""
    alb = base_colour(C, table, pal, sp, season)
    on = C.leaf >= 0
    lt = C.lf_table[np.clip(C.lf, 0, None)]
    k = 1 + (lt[..., 0] - 0.5) * season.get("leaflet_v", 0.12)
    alb = alb * np.where(on, k, 1)[..., None]
    if season.get("leaflet_hue"):
        warm = (lt[..., 1] < season["leaflet_hue"]).astype(f32) * on
        alb = alb * (1 - warm[..., None] * 0.5) + warm[..., None] * alb * hexl("#d8a868") / max(hexl("#d8a868").mean(), 1e-3) * 0.5
    p = season.get("miner", 0)
    if p:
        R = C.R
        nz = cv2.GaussianBlur(np.random.default_rng(11).random((R, R)).astype(f32), (0, 0), R * 0.0035)
        nz = (nz - nz.mean()) / (nz.std() + 1e-6)
        hit = (lt[..., 2] < p) & on
        thr = season.get("miner_thr", 1.6)
        core = np.clip((nz - thr) * 3, 0, 1) * hit * (C.vein < 0.5)
        rim = np.clip((nz - thr + 0.35) * 3, 0, 1) * hit * (1 - core)
        alb = alb * (1 - rim[..., None] * 0.4) + rim[..., None] * hexl("#b39a52") * 0.4
        alb = alb * (1 - core[..., None]) + core[..., None] * hexl("#7a5230") * (0.85 + 0.3 * lt[..., 0, None])
    return alb


def candles(C, ros, sp, rng):
    """the spring flower candles over the rosettes (upright white panicles)"""
    R = C.R
    white, cream = hexl("#f3f0e6"), hexl("#e9e2c8")
    yel, pink, stalk = hexl("#e2bd3c"), hexl("#c95a6c"), hexl("#8c9a4e")
    for q, k in ros:
        if rng.random() > sp.get("candle_p", 0.75):
            continue
        a = UP + rng.uniform(-0.28, 0.28)
        L = R * rng.uniform(0.15, 0.2) * (0.8 + 0.25 * k)               # (seen more from the side: longer)
        Wb = L * rng.uniform(0.3, 0.38)
        d = np.array([math.cos(a), math.sin(a)])
        nrm = np.array([-d[1], d[0]])
        base = q + d * R * 0.01
        stroke(C, base, base + d * L, R * 0.006, R * 0.002, stalk, 0.8, -3)
        nf = int(rng.integers(110, 150))
        fl = []
        for _ in range(nf):
            t = rng.random() ** 0.8
            w = Wb * (1 - t ** 1.25) * (0.75 + 0.25 * math.sin(math.pi * min(1, t * 2.5))) + R * 0.003
            x = rng.uniform(-1, 1) * w
            depth = rng.random()                                       # back ones first, darker
            fl.append((depth, t, x))
        fl.sort()
        for depth, t, x in fl:
            p = base + d * (L * t) + nrm * x
            rf = R * rng.uniform(0.006, 0.0085) * (1 - 0.35 * t)
            shade = 0.72 + 0.28 * depth
            col = (white if rng.random() < 0.7 else cream) * shade
            blob(C, p, rng.uniform(0, math.pi), rf, rf * rng.uniform(0.75, 1.0), col, 0.65, -3, hi=None)
            if rng.random() < 0.35:                                    # the blotch: yellow, pink-red when older
                blob(C, p + rng.uniform(-0.3, 0.3, 2) * rf, 0, rf * 0.4, rf * 0.35, (yel if rng.random() < 0.6 else pink) * shade, 0.65, -3)


def winter_twigs(sp, R, seed):
    """the bare spray: opposite-branched stout twigs from the rim, tips curving up, sticky buds"""
    rng = np.random.default_rng(seed + 50)
    C = Canvas(R)
    C.lf = np.full((R, R), -1, np.int32)
    c = np.array([R / 2, R / 2])
    old, young = hexl(sp.get("twig_old", "#6b655d")), hexl(sp.get("twig_young", "#7a6250"))
    bud, bud_hi = hexl("#4a2414"), hexl("#8a4a32")

    def branch(p, h, L, w, order):
        nseg = 6
        step = L / nseg
        for s in range(nseg):
            end = s >= nseg - 2
            h = ang_toward(h, UP, 0.07 + 0.08 * order + (0.3 if end else 0)) + rng.normal(0, 0.1)
            p2 = p + np.array([math.cos(h), math.sin(h)]) * step
            w2 = w * (1 - 0.45 * (s + 1) / nseg)
            col = old * (1 - order * 0.15) + young * order * 0.15
            stroke(C, p, p2, w * (1 - 0.45 * s / nseg), w2, col)
            if s in (1, 3) or (order == 0 and s == 5):
                for side in (-1, 1):
                    ha = h + side * rng.uniform(0.75, 1.15)
                    if order < 2 and rng.random() < (0.85 if order == 0 else 0.55):
                        branch(p2, ha, L * rng.uniform(0.42, 0.6), w2 * 0.75, order + 1)
                    elif rng.random() < 0.4:
                        bp = p2 + np.array([math.cos(ha), math.sin(ha)]) * w2 * 0.9
                        blob(C, bp, ha, R * 0.0045, R * 0.0032, bud, 0.9, -3, hi=bud_hi)
            p = p2
        # the terminal sticky bud: big, glossy, red-brown, on the upturned tip
        bl = R * (0.013 if order == 0 else 0.0105)
        blob(C, p + np.array([math.cos(h), math.sin(h)]) * bl * 0.8, h, bl, bl * 0.6, bud, 0.9, -3, hi=bud_hi)

    nb = sp.get("winter_branches", 4)
    a0 = rng.uniform(0, 2 * math.pi)
    for b in range(nb):
        ent = ang_toward(a0 + 2 * math.pi * b / nb + rng.uniform(-0.3, 0.3), DOWN, 0.35)
        p = c + np.array([math.cos(ent), math.sin(ent)]) * R * 0.42
        h = ent + math.pi + rng.uniform(-0.5, 0.5)
        branch(p, h, R * rng.uniform(0.3, 0.38), R * 0.015, 0)
    return C
