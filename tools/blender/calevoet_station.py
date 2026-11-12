"""GARE D'UCCLE-CALEVOET (the passenger building on line 124, Chaussee d'Alsemberg 1067, Uccle): built entirely in code
(no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/calevoet_station.py -- <out_dir> [--no-bake] [--previews] [--fast]
      <out_dir>/calevoet.raw.glb   nodes "Station" (LOD0) and "Station_far" (the scripted far variant = LOD1; LOD2 is made
                                   from it by meshoptimizer in tools/calevoet_pack.mjs); one primitive per NAMED slot
      <out_dir>/calevoet_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/calevoet.json      the measurements used, slots and codes, placement, counts
      docs/calevoet/preview_*.png  Cycles renders (--previews; checker and grazing light with --checker)

INPUT: <out_dir>/site.json + site_dtm.* (tools/calevoet_measure.py), photo_views.json (tools/calevoet_photopose.py). The
plan: the UrbIS footprint of solid 534568 squared into its parts, the DSM's roofs, the photos facade by facade
(models/calevoet_station/NOTES.md); ESTIMATED where no free photo shows a facade (the car-park side: Street View look-only).

SWAPPABLE MATERIALS (the owner's hero rule): NO colour, NO texture in the GLB:
  - every face is in a NAMED slot (SLOTS below); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code / 16 + 1/32 (CODES of the kit); COLOR_0.g = per-vertex AO of the thin parts; COLOR_0.b =
    sqrt(region width / 4 m) (the viewer's anti-sparkle);
  - TEXCOORD_0 = world metres (walls: along the wall / m TAW - 40, so brick courses sit level all round; roofs: along the
    eave / up the slope); TEXCOORD_1 = the lightmap UV of the baked AO.
Frame: Blender x = u, y = -w, z = m TAW - OY (OY = 40). glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes at
the city position of the frame origin, height OY, rotation.y = -rotation (site.json frame).
Kit: tools/blender/wolvendael_kit.py (builder, frames, boxes, lathes, pipes; imported read-only).
"""
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wolvendael_kit as KT
from wolvendael_kit import (K, Builder, Frame, P, hz, Z, OY, face_dir, fbox, box, lathe, pipe, CODES,
                            C_PLAIN, C_BLOCK, C_JOINT, C_REVEAL, C_SILL, C_SURROUND, C_BAND, C_CORNICE, C_PLINTH, C_KEY, C_FRAME,
                            C_BAR, C_PANE, C_LOUVRE, C_HUNG, C_RIDGE)

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/calevoet_station")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
CHECKER = "--checker" in ARGS
AO_PX = 2048
SITE = json.load(open(os.path.join(OUT, "site.json")))
_g = json.load(open(os.path.join(OUT, "site_dtm.json")))
OXC, OZC = SITE["frame"]["origin_city"]; ROT = SITE["frame"]["rotation_rad"]
_ca, _sa = math.cos(ROT), math.sin(ROT)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ slots
SLOTS = ["brick_painted_white", "stone_blue", "slate", "zinc_roof", "terracotta", "wood_frame_dark", "paint_grey_dark",
         "cast_iron_dark", "glass_window"]
(BRICK, BLUE, SLATE, ZINC, TILE, FRAMEW, PAINT, IRON, GLASS) = range(9)

# ------------------------------------------------------------------------------------------------ ground (DTM)
import numpy as np
_dtm = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + _g["base"]
def city(u, w): return OXC + u * _ca - w * _sa, OZC + u * _sa + w * _ca
def ground_city(x, z):
    c = (x - _g["x0"]) / _g["step"]; r = (z - _g["z0"]) / _g["step"]
    c0 = int(min(max(math.floor(c), 0), _g["cols"] - 2)); r0 = int(min(max(math.floor(r), 0), _g["rows"] - 2)); fc, fr = c - c0, r - r0
    a = _dtm
    return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
def ground(u, w): return ground_city(*city(u, w))
def ground_min(ua, wa, ub, wb, n=24, out=1.0):
    return min(ground(ua + (ub - ua) * t / n, wa + (wb - wa) * t / n) for t in range(n + 1))

# ------------------------------------------------------------------------------------------------ THE PLAN (frame, m TAW)
# parts from north (u-) to south (u+); w+ = the track side (NOTES.md). Faces squared to the UrbIS footprint.
FLOOR = 52.50                                   # ground-floor level = the platform (52.45) + 5 cm
BASE = 51.70                                    # walls start below the lowest ground round the building (car park 51.71)
NP = dict(u0=-24.52, u1=-21.02, wt=3.10, ws=-2.12, apex=56.95, wr=0.49, pitch=35.0)        # north pavilion
FW = dict(u0=-21.02, u1=-13.06, wt=3.10, ws=-4.00, top=55.95)                               # flat wing
ZW = dict(u0=-13.06, u1=-6.69, wt=3.23, ws=-4.00, apex=58.91, wr=-0.40, pitch=41.0)        # zinc wing
MB = dict(u0=-6.69, u1=10.84, wt=3.27, ws=-4.12, apex=61.55, wr=-0.43, pitch=43.0)         # main block
LK = dict(u0=10.84, u1=16.18, wt=3.14, ws=-4.12, apex=58.80, wr=-0.50, pitch=41.0)         # link
SP = dict(u0=16.18, u1=24.50, wt=3.20, ws=-4.12, apex=58.98, wr=-0.50, pitch=41.0)         # south pavilion
BAY = dict(u0=16.41, u1=24.33, w1=4.12, top=55.48, fascia=(55.02, 55.48))                 # the box bay on the platform
CANOPY = dict(u0=-1.30, u1=11.00, w1=7.20, h_wall=55.62, h_front=55.02, cols_u=(1.6, 5.8, 10.0), col_w=6.45)
MB_STRING = (55.52, 55.70)                      # the brick string course at the first floor (c04: 55.55-55.69)
MB_EAVE = 58.05                                 # the wall's top under the cornice (c04 corner 58.13, verge foot 58.24)
BAYS = [-4.1, -0.9, 2.3, 5.5, 8.7]              # main block axes (c04 + c09; symmetric about 2.3)
OVH = 0.28                                      # eaves overhang
LANDMARKS = {}

def eave_h(part, w_wall):
    """the roof plane's height at a wall line (the part's ridge, pitch)"""
    return part["apex"] - abs(w_wall - part["wr"]) * math.tan(math.radians(part["pitch"]))

# ------------------------------------------------------------------------------------------------ wall frames
def track_frame(W, u0):  fr, _ = Frame.of(u0, W, u0 + 1.0, W); return fr          # s = u - u0, N = +w
def street_frame(W, u1): fr, _ = Frame.of(u1, W, u1 - 1.0, W); return fr          # s = u1 - u, N = -w
def south_frame(U, w1):  fr, _ = Frame.of(U, w1, U, w1 - 1.0); return fr          # s = w1 - w, N = +u
def north_frame(U, w0):  fr, _ = Frame.of(U, w0, U, w0 + 1.0); return fr          # s = w - w0, N = -u

class Op:
    """an opening on a wall frame: s0..s1, h0 (sill / floor) .. h1 (crown); spring = the springing of a segmental head
    (None: flat); kind: win | door | board | boardwin (a boarded window) | small; label: a raised brick hood"""
    def __init__(self, s0, s1, h0, h1, spring=None, kind="win", label=True, sill="stone", transom=None, ears=True):
        self.s0, self.s1, self.h0, self.h1, self.spring, self.kind, self.label = s0, s1, h0, h1, spring, kind, label
        self.sill = sill; self.transom = transom; self.ears = ears

def seg(c, wdt, h0, crown, rise=None, **kw):
    """a segmental-headed opening centred on c (rise ~ 1/6 of the width by default)"""
    r = rise if rise is not None else max(0.10, wdt / 6.5)
    return Op(c - wdt / 2, c + wdt / 2, h0, crown, crown - r, **kw)

# ------------------------------------------------------------------------------------------------ arcs
def arc_geom(o):
    half = (o.s1 - o.s0) / 2; rise = o.h1 - o.spring
    R = (half * half + rise * rise) / (2 * rise); cs = (o.s0 + o.s1) / 2; ch = o.h1 - R
    a0 = math.atan2(o.spring - ch, half)
    return cs, ch, R, a0

def arc_pts(o, n, inset=0.0):
    cs, ch, R, a0 = arc_geom(o)
    r = R - inset
    return [(cs + r * math.cos(a0 + (math.pi - 2 * a0) * k / n), ch + r * math.sin(a0 + (math.pi - 2 * a0) * k / n)) for k in range(n + 1)]

def NARC(): return 6 if K.FAR else 12

# ------------------------------------------------------------------------------------------------ the wall grid
def wall_grid(fr, s0, s1, hb, ht, openings, mat=BRICK, code=C_PLAIN, top_line=None, extra_s=(), extra_h=()):
    """a planar wall s0..s1 x hb..ht as a grid of quads (no fans), minus the openings (segmental heads: vertical strips
    from the arc to the crown line). top_line(s) -> h: a gable's sloped top (cells under it are cut to it: trapezoids)"""
    sc = {s0, s1} | set(x for x in extra_s if s0 < x < s1); hc = {hb, ht} | set(x for x in extra_h if hb < x < ht)
    for o in openings:
        sc |= {o.s0, o.s1}; hc |= {o.h0, o.h1} | ({o.spring} if o.spring else set())
        if o.spring:
            sc |= set(round(p[0], 5) for p in arc_pts(o, NARC())[1:-1])
    sc = sorted(x for x in sc if s0 - 1e-6 <= x <= s1 + 1e-6); hc = sorted(x for x in hc if hb - 1e-6 <= x <= ht + 1e-6)
    holes = [(o.s0, o.h0, o.s1, o.h1) for o in openings]
    for i in range(len(sc) - 1):
        a, b = sc[i], sc[i + 1]
        if b - a < 1e-5: continue
        ta = top_line(a) if top_line else ht; tb = top_line(b) if top_line else ht
        tmin = min(ta, tb)
        rows = [h for h in hc if h < tmin - 1e-4] + [None]
        if len(rows) == 1 and top_line and max(ta, tb) > hb + 1e-4:
            # the sloped top dips under the wall's foot inside this column: a triangle / trapezoid from the foot line
            if ta < hb:
                sx = a + (b - a) * (hb - ta) / (tb - ta); q = [(sx, hb), (b, hb), (b, tb)]
            else:
                sx = a + (b - a) * (ta - hb) / (ta - tb); q = [(a, hb), (sx, hb), (a, ta)]
            cs = (q[0][0] + q[1][0]) / 2; ch = hb + 0.01
            if not any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in holes):
                face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])
            continue
        for j in range(len(rows) - 1):
            c = rows[j]; d = rows[j + 1]
            cs = (a + b) / 2
            if d is None:
                # the top cell: up to the top line (a trapezoid when sloped)
                q = [(a, c), (b, c), (b, tb), (a, ta)]
                ch = (c + tmin) / 2
            else:
                q = [(a, c), (b, c), (b, d), (a, d)]; ch = (c + d) / 2
            if any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in holes): continue
            face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])
    # the spandrels above segmental heads (from the arc up to the crown line, between the arc's own cuts)
    for o in openings:
        if not o.spring: continue
        pts = sorted(arc_pts(o, NARC()))
        # every grid column cut inside the arch splits its spandrel strips (the arc's height interpolated)
        xs = sorted(set([round(x, 5) for x, _ in pts] + [x for x in sc if o.s0 < x < o.s1]))
        def arc_h(x):
            for (xa, ha), (xb, hb2) in zip(pts[:-1], pts[1:]):
                if xa - 1e-6 <= x <= xb + 1e-6: return ha + (hb2 - ha) * (x - xa) / max(1e-9, xb - xa)
            return o.spring
        pts = [(x, arc_h(x)) for x in xs]
        for k in range(len(pts) - 1):
            (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
            if max(o.h1 - ha, o.h1 - hb_) < 1e-4: continue
            q = [(sa, ha), (sb, hb_), (sb, o.h1), (sa, o.h1)]
            if o.h1 - hb_ < 1e-5: q = [q[0], q[1], q[3]]
            elif o.h1 - ha < 1e-5: q = [q[0], q[1], q[2]]
            face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])

# ------------------------------------------------------------------------------------------------ joinery
def frame_box(fr, s0, s1, h0, h1, d0, d1, mat=FRAMEW, code=C_FRAME, skip=()):
    fbox(fr, s0, s1, h0, h1, d0, d1, mat, code, skip=skip)

def casement(fr, s0, s1, h0, h1, d_front, transom=None, leaves=2, fw=0.06, lw=0.05, far=False, head=False):
    """a dark-framed window in its opening (s0..s1 x h0..h1, h1 = the springing of its head): outer frame, `leaves`
    leaves with one horizontal bar, an optional transom light (its height). Glass 3 cm behind the leaves."""
    df0, df1 = d_front - 0.06, d_front
    K.B.new_group()
    jt = h1 - 0.035 if head else h1 + 0.01          # (under a segmental head the jambs end at its transom bar)
    frame_box(fr, s0 - 0.01, s0 + fw, h0 - 0.01, jt, df0, df1, skip=("top",) if head else ())
    frame_box(fr, s1 - fw, s1 + 0.01, h0 - 0.01, jt, df0, df1, skip=("top",) if head else ())
    frame_box(fr, s0 + fw, s1 - fw, h0 - 0.01, h0 + fw * 1.3, df0, df1, skip=("left", "right"))
    i0, i1, j0, j1 = s0 + fw, s1 - fw, h0 + fw * 1.3, (h1 - 0.035 if head else h1)
    dl1 = df1 - 0.008; dl0 = dl1 - 0.045
    if transom:
        tb = j1 - transom
        frame_box(fr, i0, i1, tb - 0.055, tb, dl0 - 0.005, dl1 + 0.004, skip=("left", "right"))
        face_dir([fr.p(i0, tb, dl0 + 0.012), fr.p(i1, tb, dl0 + 0.012), fr.p(i1, j1, dl0 + 0.012), fr.p(i0, j1, dl0 + 0.012)], fr.N, GLASS, C_PANE,
                 [(0, 0), (1, 0), (1, 1), (0, 1)])
        j1 = tb - 0.055
    lwid = (i1 - i0) / leaves
    for k in range(leaves):
        a, b = i0 + k * lwid, i0 + (k + 1) * lwid
        if far:
            if k > 0: frame_box(fr, a - 0.035, a + 0.035, j0, j1, dl0, dl1, skip=("top", "bottom"))
            continue
        frame_box(fr, a, a + lw, j0, j1, dl0, dl1, skip=("left",) if k > 0 else ())
        frame_box(fr, b - lw, b, j0, j1, dl0, dl1, skip=("right",) if k < leaves - 1 else ())
        frame_box(fr, a + lw, b - lw, j1 - lw, j1, dl0, dl1, skip=("left", "right"))
        frame_box(fr, a + lw, b - lw, j0, j0 + lw * 1.5, dl0, dl1, skip=("left", "right"))
        ga, gb, gc, gd = a + lw, b - lw, j0 + lw * 1.5, j1 - lw
        hm = gc + (gd - gc) * 0.62
        frame_box(fr, ga, gb, hm - 0.016, hm + 0.016, dl0 + 0.006, dl1 - 0.005, code=C_BAR, skip=("left", "right"))
        for ha, hb_ in ((gc, hm - 0.016), (hm + 0.016, gd)):
            face_dir([fr.p(ga, ha, dl0 + 0.02), fr.p(gb, ha, dl0 + 0.02), fr.p(gb, hb_, dl0 + 0.02), fr.p(ga, hb_, dl0 + 0.02)], fr.N, GLASS, C_PANE,
                     [(0, 0), (1, 0), (1, 1), (0, 1)])
    if far:
        face_dir([fr.p(i0, j0, dl0 + 0.02), fr.p(i1, j0, dl0 + 0.02), fr.p(i1, j1, dl0 + 0.02), fr.p(i0, j1, dl0 + 0.02)], fr.N, GLASS, C_PANE,
                 [(0, 0), (1, 0), (1, 1), (0, 1)])

def head_light(fr, o, d_front, fw=0.06, mat=GLASS):
    """the segmental head above the springing: an arched frame (its inner face smooth) on a transom bar, the glass (or a
    board) as a fan of quads from the transom line (strips: no long slivers)"""
    n = NARC()
    df0, df1 = d_front - 0.06, d_front
    K.B.new_group()
    cs, ch, R, a0 = arc_geom(o)
    ro = arc_pts(o, n, -0.01)
    # the inner edge over the angles where it stands above the transom bar's top (it would dip under the jambs' tops)
    t0 = max(a0, math.asin(min(1.0, max(-1.0, (o.spring + 0.02 - ch) / (R - fw)))))
    ri = [(cs + (R - fw) * math.cos(t0 + (math.pi - 2 * t0) * k / n), ch + (R - fw) * math.sin(t0 + (math.pi - 2 * t0) * k / n)) for k in range(n + 1)]
    for k in range(n):
        (sa, ha), (sb, hb_) = ro[k], ro[k + 1]; (ia, ja), (ib, jb) = ri[k], ri[k + 1]
        face_dir([fr.p(sa, ha, df1), fr.p(sb, hb_, df1), fr.p(ib, jb, df1), fr.p(ia, ja, df1)], fr.N, FRAMEW, C_FRAME)
        face_dir([fr.p(ia, ja, df0), fr.p(ib, jb, df0), fr.p(ib, jb, df1), fr.p(ia, ja, df1)], fr.p(cs, ch, 0) - fr.p((ia + ib) / 2, (ja + jb) / 2, 0), FRAMEW, C_FRAME)
    frame_box(fr, o.s0 - 0.01, o.s1 + 0.01, o.spring - 0.035, o.spring + 0.02, df0 + 0.004, df1 - 0.006)
    gl = d_front - 0.045
    base = o.spring + 0.02
    pts = sorted(p for p in ri if p[1] > base + 1e-3)
    pts = [(o.s0 + fw, base)] + pts + [(o.s1 - fw, base)]
    for k in range(len(pts) - 1):
        (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
        q = [(sa, base), (sb, base), (sb, hb_), (sa, ha)]
        if hb_ - base < 1e-4: q = [q[0], q[2], q[3]] if ha - base > 1e-4 else None
        elif ha - base < 1e-4: q = [q[0], q[1], q[2]]
        if q: face_dir([fr.p(x, y, gl) for x, y in q], fr.N, mat, C_PANE if mat == GLASS else C_PLAIN,
                       [((x - o.s0) / (o.s1 - o.s0), (y - o.spring) / max(0.05, o.h1 - o.spring)) for x, y in q])

def door(fr, o, d_front, far):
    """a two-leaf panelled door (painted dark grey) up to the springing, its head a glazed light"""
    top = o.spring if o.spring else o.h1
    tb = top - (0.0 if o.spring else 0.40)
    K.B.new_group()
    jt = top - 0.035 if o.spring else top + 0.01
    frame_box(fr, o.s0 - 0.01, o.s0 + 0.06, o.h0, jt, d_front - 0.06, d_front, PAINT)
    frame_box(fr, o.s1 - 0.06, o.s1 + 0.01, o.h0, jt, d_front - 0.06, d_front, PAINT)
    a, b = o.s0 + 0.06, o.s1 - 0.06
    fbox(fr, a, b, o.h0, tb - (0.035 if o.spring else 0.0), d_front - 0.07, d_front - 0.03, PAINT, C_FRAME, skip=("left", "right"))
    if not far:
        mid = (a + b) / 2
        two = (b - a) > 1.0
        cols = [(a + 0.07, mid - 0.045), (mid + 0.045, b - 0.07)] if two else [(a + 0.08, b - 0.08)]
        for c0, c1 in cols:
            for h0_, h1_ in ((o.h0 + 0.14, o.h0 + 0.85), (o.h0 + 1.0, tb - 0.12)):
                if h1_ - h0_ > 0.12: fbox(fr, c0, c1, h0_, h1_, d_front - 0.045, d_front - 0.018, PAINT, C_FRAME, skip=("back",))
        if two: fbox(fr, mid - 0.012, mid + 0.012, o.h0 + 0.02, tb - 0.02, d_front - 0.045, d_front - 0.02, PAINT, C_BAR, skip=("back",))
    if o.spring: head_light(fr, o, d_front)

def board(fr, o, d_front, far):
    """a boarded opening (the grey panels of 2018-2024): a flat grey board set in a thin frame; its head to the arc"""
    K.B.new_group()
    top = o.spring if o.spring else o.h1
    jt = top - 0.035 if o.spring else top + 0.01
    frame_box(fr, o.s0 - 0.01, o.s0 + 0.05, o.h0 - 0.01, jt, d_front - 0.05, d_front, PAINT)
    frame_box(fr, o.s1 - 0.05, o.s1 + 0.01, o.h0 - 0.01, jt, d_front - 0.05, d_front, PAINT)
    frame_box(fr, o.s0 + 0.05, o.s1 - 0.05, o.h0 - 0.01, o.h0 + 0.05, d_front - 0.05, d_front, PAINT, skip=("left", "right"))
    face_dir([fr.p(o.s0 + 0.05, o.h0 + 0.05, d_front - 0.035), fr.p(o.s1 - 0.05, o.h0 + 0.05, d_front - 0.035),
              fr.p(o.s1 - 0.05, top - (0.035 if o.spring else 0.0), d_front - 0.035), fr.p(o.s0 + 0.05, top - (0.035 if o.spring else 0.0), d_front - 0.035)], fr.N, PAINT, C_PLAIN,
             [(o.s0, hz(o.h0)), (o.s1, hz(o.h0)), (o.s1, hz(top)), (o.s0, hz(top))])
    if o.spring: head_light(fr, o, d_front, fw=0.05, mat=PAINT)

REV = 0.24
def opening_parts(fr, o, far):
    """reveals (painted brick), head soffit, joinery by kind, the bluestone sill or threshold, the raised brick label"""
    rev = REV if not far else 0.20
    K.B.new_group()
    top_side = o.spring if o.spring else o.h1
    for s, sg in ((o.s0, 1), (o.s1, -1)):
        face_dir([fr.p(s, o.h0, 0), fr.p(s, top_side, 0), fr.p(s, top_side, -rev - 0.03), fr.p(s, o.h0, -rev - 0.03)], fr.U * sg, BRICK, C_REVEAL,
                 [(0, hz(o.h0)), (0, hz(top_side)), (rev, hz(top_side)), (rev, hz(o.h0))])
    if o.spring:
        pts = arc_pts(o, NARC()); cs, ch, R, a0 = arc_geom(o)
        for k in range(len(pts) - 1):
            (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
            face_dir([fr.p(sa, ha, 0), fr.p(sb, hb_, 0), fr.p(sb, hb_, -rev - 0.03), fr.p(sa, ha, -rev - 0.03)],
                     fr.p(cs, ch, 0) - fr.p((sa + sb) / 2, (ha + hb_) / 2, 0), BRICK, C_REVEAL)
    else:
        face_dir([fr.p(o.s0, o.h1, 0), fr.p(o.s1, o.h1, 0), fr.p(o.s1, o.h1, -rev - 0.03), fr.p(o.s0, o.h1, -rev - 0.03)], -Z, BRICK, C_REVEAL)
    dfr = -rev + 0.04
    if o.kind == "win":
        casement(fr, o.s0, o.s1, o.h0, top_side, dfr, transom=o.transom, far=far, head=bool(o.spring))
        if o.spring: head_light(fr, o, dfr)
    elif o.kind == "small":
        casement(fr, o.s0, o.s1, o.h0, top_side, dfr, leaves=1, far=far, head=bool(o.spring))
        if o.spring: head_light(fr, o, dfr)
    elif o.kind == "door":
        door(fr, o, dfr, far)
    elif o.kind in ("board", "boardwin"):
        board(fr, o, dfr, far)
    # sill / threshold (bluestone)
    if o.kind in ("win", "small", "boardwin"):
        sa, sb = o.s0 - 0.07, o.s1 + 0.07
        fbox(fr, sa, sb, o.h0 - 0.075, o.h0 + 0.003, -rev - 0.02, 0.055, BLUE, C_SILL, skip=("back",))
        if not far and o.kind != "small":
            cmid = (o.s0 + o.s1) / 2          # the corbel block under the sill (c03)
            fbox(fr, cmid - 0.09, cmid + 0.09, o.h0 - 0.17, o.h0 - 0.075, -0.02, 0.035, BLUE, C_SILL, skip=("back",))
    elif o.kind in ("door", "board") and o.h0 < FLOOR + 0.1:
        fbox(fr, o.s0 - 0.02, o.s1 + 0.02, o.h0 - 0.12, o.h0 + 0.004, -rev - 0.02, 0.04, BLUE, C_SILL, skip=("back",))
    # the raised brick label (hood) over the head, with ears (c03, c09)
    if o.label and o.spring:
        label_arc(fr, o, far)
    elif o.label:
        fbox(fr, o.s0 - 0.10, o.s1 + 0.10, o.h1 + 0.02, o.h1 + 0.13, -0.01, 0.035, BRICK, C_SURROUND, skip=("back",))

def label_arc(fr, o, far, wband=0.11, proud=0.035):
    """a raised band following the segmental head 2-13 cm above it, ending in short drops (ears) beside the opening"""
    n = NARC()
    gap = 0.02
    inner = arc_pts(o, n, -gap); outer = arc_pts(o, n, -gap - wband)
    K.B.new_group()
    cs, ch, R, a0 = arc_geom(o)
    for k in range(n):
        (ia, ja), (ib, jb) = inner[k], inner[k + 1]; (oa, oa_h), (ob, ob_h) = outer[k], outer[k + 1]
        face_dir([fr.p(ia, ja, proud), fr.p(ib, jb, proud), fr.p(ob, ob_h, proud), fr.p(oa, oa_h, proud)], fr.N, BRICK, C_SURROUND,
                 [(ia, hz(ja)), (ib, hz(jb)), (ob, hz(ob_h)), (oa, hz(oa_h))])
        face_dir([fr.p(oa, oa_h, -0.01), fr.p(ob, ob_h, -0.01), fr.p(ob, ob_h, proud), fr.p(oa, oa_h, proud)],
                 fr.p((oa + ob) / 2, (oa_h + ob_h) / 2, 0) - fr.p(cs, ch, 0), BRICK, C_SURROUND)
        face_dir([fr.p(ia, ja, -0.01), fr.p(ib, jb, -0.01), fr.p(ib, jb, proud), fr.p(ia, ja, proud)],
                 fr.p(cs, ch, 0) - fr.p((ia + ib) / 2, (ja + jb) / 2, 0), BRICK, C_SURROUND)
    for (s_in, h_in), (s_out, h_out) in ((inner[0], outer[0]), (inner[-1], outer[-1])):
        cap = [fr.p(s_in, h_in, -0.01), fr.p(s_out, h_out, -0.01), fr.p(s_out, h_out, proud), fr.p(s_in, h_in, proud)]
        face_dir(cap, -Z, BRICK, C_SURROUND)
    if o.ears:
        # the ears: the band's ends turn down beside the opening (to 0.22 below the springing) and out
        for (s_in, h_in), (s_out, h_out), sg in ((inner[0], outer[0], 1), (inner[-1], outer[-1], -1)):
            lo = o.spring - 0.22
            x0, x1 = sorted((s_out - sg * 0.0, s_out - sg * (wband + 0.06)))
            x0, x1 = (min(s_out, s_in) - (0.07 if sg > 0 else 0.0), max(s_out, s_in) + (0.07 if sg < 0 else 0.0))
            hi = max(h_in, h_out)
            fbox(fr, x0, x1, lo, hi + 0.004, -0.01, proud - 0.004, BRICK, C_SURROUND, skip=("back",))

# ------------------------------------------------------------------------------------------------ bands, pilasters, cornices
def ends(s0, s1, pr, e0, e1):
    """an attachment's run along its wall: 'out' = past an external corner by its projection (its end cap closes the
    corner), 'in' = short of it by the other wall's projection, 'cut' = 4 mm short of a flush end (no coplanar caps)"""
    d = {"out": -pr, "in": pr + 0.021, "cut": 0.004, None: 0.0}        # ('in': clear of the other's 2 cm inside the wall too)
    return s0 + d[e0], s1 - d[e1]

def band(fr, s0, s1, h0, h1, proud, mat=BRICK, code=C_BAND, skip=("back",), e0="cut", e1="cut"):
    a, b = ends(s0, s1, proud, e0, e1)
    fbox(fr, a, b, h0, h1, -0.02, proud, mat, code, skip=skip)

def plinth(fr, s0, s1, h_top=None, e0="cut", e1="cut"):
    """the dark painted foot of the walls (c03: a thin grey-blue band at the platform)"""
    ht = (FLOOR + 0.10) if h_top is None else h_top
    a, b = ends(s0, s1, 0.012, e0, e1)
    fbox(fr, a, b, BASE, ht, -0.02, 0.012, PAINT, C_PLINTH, skip=("back",))

def corbel_cornice(fr, s0, s1, h0, steps, ext=0.0, e0="cut", e1="cut"):
    """a brick cornice of stepped courses (each (height, projection)) from h0 up; ends as in ends()"""
    h = h0
    for (hh, pr) in steps:
        a, b = ends(s0, s1, pr, e0, e1)
        fbox(fr, a, b, h, h + hh, -0.02, pr, BRICK, C_CORNICE, skip=("back",))
        h += hh
    return h

# ------------------------------------------------------------------------------------------------ roofs
def slope_roof(part, u0, u1, w_out, side, cover, ovh=OVH, verge0=0.0, verge1=0.0, t=0.14, ridge_cap=True, far=False, lower=0.0):
    """one slope of a pitched roof: from the ridge (part apex at w = wr) down to the eave at w_out + side * ovh; u0..u1
    (+ verge overhangs); a slab: covering on top (cover = ZINC | TILE), soffit + edges in the fascia paint. lower: the
    whole roof dropped a little (the link's under the south pavilion's verge)."""
    tg = math.tan(math.radians(part["pitch"]))
    wr = part["wr"]; ap = part["apex"] - lower
    we = w_out + side * ovh
    he = ap - abs(we - wr) * tg
    ua, ub = u0 - verge0, u1 + verge1
    # Blender: P(u, w, h)
    top = [P(ua, wr, ap), P(ub, wr, ap), P(ub, we, he), P(ua, we, he)]
    nrm = (P(0, wr, ap) - P(0, we, he)).cross(Vector((1, 0, 0)))
    nrm = Vector((0, nrm.y, nrm.z)).normalized()
    if nrm.z < 0: nrm = -nrm
    L = math.hypot(we - wr, ap - he)
    K.B.new_group()
    dn = -nrm * t
    if cover == TILE and not far:
        tile_courses(part, ua, ub, wr, ap, we, he, nrm, L)
    else:
        face_dir(top, nrm, cover, C_PLAIN, [(ua, L), (ub, L), (ub, 0), (ua, 0)])
    bot = [p + dn for p in top]
    drop = t / math.cos(math.radians(part["pitch"]))
    bot[0] = P(ua, wr, ap - drop); bot[1] = P(ub, wr, ap - drop)
    face_dir(bot, -nrm, PAINT if cover == TILE else BRICK, C_CORNICE, [(ua, 0), (ub, 0), (ub, L), (ua, L)])
    # eave edge (fascia), verge edges
    face_dir([top[3], top[2], bot[2], bot[3]], Vector((0, -side * 1.0, 0)) * (1) + Vector((0, 0, 0)), PAINT, C_CORNICE)
    face_dir([top[0], top[3], bot[3], bot[0]], Vector((-1, 0, 0)), PAINT, C_CORNICE)
    face_dir([top[1], top[2], bot[2], bot[1]], Vector((1, 0, 0)), PAINT, C_CORNICE)
    if cover == ZINC and not far:
        seams(ua, ub, wr, ap, we, he, nrm)
    return he

def seams(ua, ub, wr, ap, we, he, nrm, pitch_u=0.55):
    """zinc standing seams down the slope every ~55 cm: thin upstands (2.4 x 3 cm) from the eave to the ridge"""
    n = max(1, int(round((ub - ua) / pitch_u)))
    du = (ub - ua) / n
    for i in range(1, n):
        u = ua + i * du
        a, b = P(u, we, he), P(u, wr, ap)
        tt = 0.012; hh = 0.03
        side = Vector((1, 0, 0)) * tt
        up = nrm * hh
        q1 = [a - side, b - side, b - side + up, a - side + up]; q2 = [a + side, b + side, b + side + up, a + side + up]
        face_dir(q1, Vector((-1, 0, 0)), ZINC, C_RIDGE); face_dir(q2, Vector((1, 0, 0)), ZINC, C_RIDGE)
        face_dir([a - side + up, b - side + up, b + side + up, a + side + up], nrm, ZINC, C_RIDGE)
        face_dir([a - side, a + side, a + side + up, a - side + up], (P(0, we, he) - P(0, wr, ap)).normalized(), ZINC, C_RIDGE)

def tile_courses(part, ua, ub, wr, ap, we, he, nrm, L, gauge=0.33, butt=0.028):
    """interlocking clay tiles as stepped courses: each course a quad tilted a little steeper than the roof, its lower
    butt 2.8 cm proud (the course lines' shadows), the butt face under it"""
    n = max(2, int(round(L / gauge)))
    full = P(0, we, he) - P(0, wr, ap)
    strip = 0.03                                                      # the eave strip under the last course's butt
    down = full * ((full.length - strip) / full.length) / n           # one course down the slope
    for i in range(n):
        a = P(0, wr, ap) + down * i; b = a + down
        a_hi = a + nrm * 0.004; b_hi = b + nrm * butt
        q = [Vector((ua, a_hi.y, a_hi.z)), Vector((ub, a_hi.y, a_hi.z)), Vector((ub, b_hi.y, b_hi.z)), Vector((ua, b_hi.y, b_hi.z))]
        face_dir(q, nrm, TILE, C_PLAIN, [(ua, L - i * L / n), (ub, L - i * L / n), (ub, L - (i + 1) * L / n), (ua, L - (i + 1) * L / n)])
        lo = b + nrm * (0.001 if i == n - 1 else 0.002)
        qb = [Vector((ua, b_hi.y, b_hi.z)), Vector((ub, b_hi.y, b_hi.z)), Vector((ub, lo.y, lo.z)), Vector((ua, lo.y, lo.z))]
        face_dir(qb, down.normalized(), TILE, C_JOINT)
    # the eave strip: from under the last butt to the eave's edge, on the slab's top (it closes the fascia's top edge)
    e0 = P(0, we, he); e1 = e0 - full.normalized() * strip + nrm * 0.001
    face_dir([Vector((ua, e1.y, e1.z)), Vector((ub, e1.y, e1.z)), Vector((ub, e0.y, e0.z)), Vector((ua, e0.y, e0.z))], nrm, TILE, C_JOINT)

def gable_roof(part, u0, u1, cover, verge0=0.12, verge1=0.12, far=False, lower=0.0, ridge=True):
    he_t = slope_roof(part, u0, u1, part["wt"], +1, cover, verge0=verge0, verge1=verge1, far=far, lower=lower)
    he_s = slope_roof(part, u0, u1, part["ws"], -1, cover, verge0=verge0, verge1=verge1, far=far, lower=lower)
    ap = part["apex"] - lower
    if ridge:
        a, b = P(u0 - verge0, part["wr"], ap + 0.01), P(u1 + verge1, part["wr"], ap + 0.01)
        if cover == ZINC:
            if far: hbox_b(u0 - verge0 + 0.01, u1 + verge1 - 0.01, part["wr"] - 0.05, part["wr"] + 0.05, ap - 0.03, ap + 0.06, ZINC, C_RIDGE)
            else: pipe(a, b, 0.045, 16, ZINC, C_RIDGE, smooth=False)
        else:
            if far: hbox_b(u0 - verge0 + 0.01, u1 + verge1 - 0.01, part["wr"] - 0.12, part["wr"] + 0.12, ap - 0.06, ap + 0.08, TILE, C_RIDGE)
            else: ridge_tiles(a, b, 0.13)
    return he_t, he_s

def hbox_b(u0, u1, w0, w1, h0, h1, mat, code=C_PLAIN, skip=()):
    KT.hbox(u0, u1, w0, w1, h0, h1, mat, code, skip)

def ridge_tiles(a, b, r):
    """the half-round ridge tiles: a half cylinder (smooth) in 40 cm tiles, each with a small collar step"""
    L = (b - a).length; n = max(1, int(L / 0.40)); d = (b - a) / n
    for i in range(n):
        p0 = a + d * i; p1 = p0 + d
        lathe(p0, [(r, 0.0), (r, d.length - 0.03), (r * 1.06, d.length - 0.03), (r * 1.06, d.length)], 8, TILE, C_RIDGE,
              axis=d, ref=Vector((0, 1, 0)), a0=0.0, a1=math.pi)
    dn = d.normalized(); X = Vector((0, 1, 0)); Y = dn.cross(X).normalized()
    if Y.z < 0: Y = -Y
    for (c, sg, rr) in ((a, -1, r), (b, 1, r * 1.06)):
        pts = [c + (X * math.cos(math.pi * k / 8) + Y * math.sin(math.pi * k / 8)) * rr for k in range(9)]
        for k in range(4):
            q = [pts[k], pts[k + 1], pts[7 - k], pts[8 - k]]
            if k == 3: q = [pts[3], pts[4], pts[5]]
            face_dir(q, dn * sg, TILE, C_RIDGE)

def gutter(u0, u1, w, h, side, r=0.065):
    """a half-round zinc gutter along an eave (open top; it hangs off the fascia)"""
    if K.FAR: return
    a, b = P(u0, w + side * (r + 0.015), h - 0.05), P(u1, w + side * (r + 0.015), h - 0.05)
    lathe(a, [(r, 0.0), (r, (b - a).length)], 8, ZINC, C_RIDGE, axis=(b - a), ref=Vector((0, 0, -1)), a0=-math.pi / 2, a1=math.pi / 2, smooth=False)
    ax = (b - a).normalized(); X = Vector((0, 0, -1)); Y = ax.cross(X).normalized()
    for c, sg in ((a, -1), (b, 1)):
        pts = [c + (X * math.cos(t) + Y * math.sin(t)) * r for t in np.linspace(-math.pi / 2, math.pi / 2, 9)]
        for k in range(4):
            q = [pts[k], pts[k + 1], pts[7 - k], pts[8 - k]]
            if k == 3: q = [pts[3], pts[4], pts[5]]
            face_dir(q, ax * sg, ZINC, C_RIDGE)

def downpipe(u, w, h_top, h_bot, side_w):
    if K.FAR: return
    pipe(P(u, w + side_w * 0.10, h_bot), P(u, w + side_w * 0.10, h_top), 0.045, 16, ZINC, C_RIDGE, smooth=False)
    for h in np.arange(h_bot + 0.5, h_top - 0.3, 1.6):
        fbox(track_frame(w, 0.0) if side_w > 0 else street_frame(w, 0.0), (u if side_w > 0 else -u) - 0.035, (u if side_w > 0 else -u) + 0.035,
             h, h + 0.04, -0.02, 0.15, ZINC, C_RIDGE, skip=("back",))

def step_face(u, wa, wb, h0, h1, nu):
    """the narrow wall face where two parts' faces step (u = the boundary, wa..wb the step, nu = +1 facing +u)"""
    if h1 - h0 < 0.01 or abs(wb - wa) < 0.005: return
    a, b = sorted((wa, wb))
    face_dir([P(u, a, h0), P(u, b, h0), P(u, b, h1), P(u, a, h1)], Vector((nu, 0, 0)), BRICK, C_PLAIN, [(a, hz(h0)), (b, hz(h0)), (b, hz(h1)), (a, hz(h1))])

# ------------------------------------------------------------------------------------------------ gables
def gable_wall(fr, s0, s1, hb, he0, he1, s_ap, h_ap, openings, mat=BRICK, code=C_PLAIN, extra_h=()):
    """a gable wall: a rectangle to the eave line (he0 at s0, he1 at s1) and the triangle to the apex (s_ap, h_ap); one
    grid (cells cut to the sloped top)"""
    def top(s):
        if s <= s_ap: return he0 + (h_ap - he0) * (s - s0) / max(1e-6, s_ap - s0)
        return h_ap + (he1 - h_ap) * (s - s_ap) / max(1e-6, s1 - s_ap)
    cuts = tuple(np.arange(s0, s1, 0.6)[1:]) + (s_ap,)
    wall_grid(fr, s0, s1, hb, max(he0, he1, h_ap), openings, mat, code, top_line=top, extra_s=cuts, extra_h=(min(he0, he1),) + tuple(extra_h))
    return top

def verge_coping(fr, s0, s1, he0, he1, s_ap, h_ap, wdt=0.22, proud=0.05, mat=BRICK):
    """a raised coping band along both verges of a gable (the south pavilion's: smooth bricks on edge)"""
    K.B.new_group()
    for (sa, ha, sb, hb_) in ((s0, he0, s_ap, h_ap), (s_ap, h_ap, s1, he1)):
        d = Vector((sb - sa, hb_ - ha)).normalized(); n = Vector((-d.y, d.x))
        if n.y > 0: n = -n                                       # the band runs below the line (inside the gable)
        q = [(sa, ha), (sb, hb_), (sb + n.x * wdt, hb_ + n.y * wdt), (sa + n.x * wdt, ha + n.y * wdt)]
        # the inner corner at the apex end slides along the band's lower edge onto the apex's vertical
        lo_d = d.y / d.x if abs(d.x) > 1e-9 else 0.0
        if abs(sb - s_ap) < 1e-6:
            q[2] = (s_ap, q[3][1] + lo_d * (s_ap - q[3][0]))
        if abs(sa - s_ap) < 1e-6:
            q[3] = (s_ap, q[2][1] + lo_d * (s_ap - q[2][0]))
        face_dir([fr.p(x, y, proud) for x, y in q], fr.N, mat, C_CORNICE, [(x, hz(y)) for x, y in q])
        for i in range(4):
            (xa, ya), (xb, yb) = q[i], q[(i + 1) % 4]
            out = fr.U * (yb - ya) - Z * (xb - xa)
            face_dir([fr.p(xa, ya, -0.02), fr.p(xb, yb, -0.02), fr.p(xb, yb, proud), fr.p(xa, ya, proud)], out, mat, C_CORNICE)

def kneelers(fr, pts, proud=0.07):
    for (sx, hx) in pts:
        fbox(fr, sx - 0.17, sx + 0.17, hx - 0.19, hx + 0.08, -0.02, proud, BRICK, C_CORNICE, skip=("back",))

def step_panels(fr, s0, s1, he, s_ap, h_ap, n_side=3, depth=0.035):
    """the south gable's recessed stepped panels (c04): rectangles following each verge 0.45 m under it, + one under the
    apex; drawn as a recessed back plate and its four sides (the gable's grid leaves their cells out)"""
    out = []
    for side in (-1, 1):
        for k in range(n_side):
            t0 = (k + 0.12) / (n_side + 0.75); t1 = (k + 0.78) / (n_side + 0.75)
            if side < 0: sa, sb = s0 + (s_ap - s0) * t0, s0 + (s_ap - s0) * t1
            else: sa, sb = s1 - (s1 - s_ap) * t1, s1 - (s1 - s_ap) * t0
            sl = (h_ap - he) / (s_ap - s0) if side < 0 else (h_ap - he) / (s1 - s_ap)
            edge = (lambda s: he + (s - s0) * sl) if side < 0 else (lambda s: he + (s1 - s) * sl)
            ht = min(edge(sa), edge(sb)) - 0.34; hb_ = ht - 0.52
            if hb_ > he + 0.08: out.append((sa, sb, hb_, ht))
    hb_ = h_ap - 1.35; out.append((s_ap - 0.32, s_ap + 0.32, hb_, hb_ + 0.55))
    return out

# ------------------------------------------------------------------------------------------------ chimneys
def chimney(u, w, top, su=0.62, sw=0.48, base=None):
    """a painted-brick stack with a corbelled cap (two courses), a flue opening on top"""
    b = base if base is not None else top - 2.6
    K.B.new_group()
    hbox_b(u - su / 2, u + su / 2, w - sw / 2, w + sw / 2, b, top - 0.20, BRICK, C_PLAIN, skip=("bottom",))
    hbox_b(u - su / 2 - 0.05, u + su / 2 + 0.05, w - sw / 2 - 0.05, w + sw / 2 + 0.05, top - 0.20, top - 0.12, BRICK, C_CORNICE, skip=("bottom",) if K.FAR else ())
    hbox_b(u - su / 2 - 0.025, u + su / 2 + 0.025, w - sw / 2 - 0.025, w + sw / 2 + 0.025, top - 0.12, top, BRICK, C_CORNICE, skip=("top",) if not K.FAR else ())
    if not K.FAR:
        fi = 0.12
        # the top ring round the flue + the flue's dark inside
        u0, u1, w0, w1 = u - su / 2 - 0.025, u + su / 2 + 0.025, w - sw / 2 - 0.025, w + sw / 2 + 0.025
        a0, a1, b0, b1 = u - su / 2 + fi, u + su / 2 - fi, w - sw / 2 + fi, w + sw / 2 - fi
        for q in ([(u0, w0), (u1, w0), (a1, b0), (a0, b0)], [(u1, w0), (u1, w1), (a1, b1), (a1, b0)], [(u1, w1), (u0, w1), (a0, b1), (a1, b1)],
                  [(u0, w1), (u0, w0), (a0, b0), (a0, b1)]):
            face_dir([P(x, y, top) for x, y in q], Z, BRICK, C_CORNICE)
        for (x0, y0, x1, y1, nn) in ((a0, b0, a1, b0, Vector((0, -1, 0))), (a1, b0, a1, b1, Vector((-1, 0, 0))), (a1, b1, a0, b1, Vector((0, 1, 0))), (a0, b1, a0, b0, Vector((1, 0, 0)))):
            face_dir([P(x0, y0, top), P(x1, y1, top), P(x1, y1, top - 0.35), P(x0, y0, top - 0.35)], -nn, PAINT, C_REVEAL)
        face_dir([P(a0, b0, top - 0.35), P(a1, b0, top - 0.35), P(a1, b1, top - 0.35), P(a0, b1, top - 0.35)], Z, PAINT, C_REVEAL)

# ------------------------------------------------------------------------------------------------ the parts
def north_pavilion(far):
    p = NP
    # track wall (w 3.10, u -24.52..-20.16: its track face runs on to the flat wing's step)
    fr = track_frame(p["wt"], p["u0"]); s = lambda u: u - p["u0"]
    he = eave_h(p, p["wt"])
    ops = [Op(s(-22.98), s(-22.52), 53.62, 54.62, None, "boardwin", label=False), Op(s(-21.72), s(-21.21), 53.62, 54.62, None, "boardwin", label=False)]
    wall_grid(fr, 0.0, s(p["u1"]), BASE, he - 0.05, ops)
    for o in ops: opening_parts(fr, o, far)
    plinth(fr, 0.0, s(p["u1"]), e0="out", e1=None)
    band(fr, 0.0, s(p["u1"]), he - 0.30, he - 0.05, 0.05, code=C_CORNICE, e0="out", e1="cut")
    # street wall (w -2.12; ESTIMATED: one window)
    frs = street_frame(p["ws"], p["u1"]); ss = lambda u: p["u1"] - u
    he_s = eave_h(p, p["ws"])
    ops = [Op(ss(-22.4), ss(-23.0), 53.6, 54.6, None, "boardwin", label=False)]
    ops[0].s0, ops[0].s1 = sorted((ops[0].s0, ops[0].s1))
    wall_grid(frs, 0.0, ss(p["u0"]), BASE, he_s - 0.05, ops)
    for o in ops: opening_parts(frs, o, far)
    plinth(frs, 0.0, ss(p["u0"]), e0="in", e1="out"); band(frs, 0.0, ss(p["u0"]), he_s - 0.30, he_s - 0.05, 0.05, code=C_CORNICE, e0="cut", e1="out")
    # north gable (u -24.52, faces -u): s = w - ws
    frn = north_frame(p["u0"], p["ws"]); sn = lambda w: w - p["ws"]
    ops = [Op(sn(1.94), sn(2.79), FLOOR, 54.10, 53.85, "door", label=False)]
    gable_wall(frn, 0.0, sn(p["wt"]), BASE, he_s - 0.05, he - 0.05, sn(p["wr"]), p["apex"] - 0.10, ops)
    for o in ops: opening_parts(frn, o, far)
    plinth(frn, 0.0, sn(p["wt"]), e0="in", e1="in")
    # the roof (pantiles): the north verge with white bargeboards; the south end runs into the flat wing's wall
    gable_roof(p, p["u0"], p["u1"] + 0.05, TILE, verge0=0.18, verge1=0.0, far=far)
    if not far:
        tg = math.tan(math.radians(p["pitch"]))
        for wo, sg in ((p["wt"] + OVH, 1), (p["ws"] - OVH, -1)):
            wo = wo - 0.03 * sg
            a, b = (p["wr"], p["apex"]), (wo, p["apex"] - abs(wo - p["wr"]) * tg)
            # a bargeboard: a 25 x 3 cm board under the verge, 20 cm before the gable
            q = [(a[0], a[1] - 0.02), (b[0], b[1] - 0.02), (b[0], b[1] - 0.27), (a[0], a[1] - 0.27)]
            for du, nrm in ((-0.20, -1), (-0.17, 1)):
                face_dir([P(p["u0"] + du, x, y) for x, y in q], Vector((nrm, 0, 0)), FRAMEW, C_FRAME)
            face_dir([P(p["u0"] - 0.20, x, y) for x, y in (q[2], q[3])] + [P(p["u0"] - 0.17, x, y) for x, y in (q[3], q[2])], -Z, FRAMEW, C_FRAME)
    # its south gable above the flat wing's roof (the roof's end would show otherwise)
    frg = south_frame(p["u1"], p["wt"]); sg = lambda w: p["wt"] - w
    tg = math.tan(math.radians(p["pitch"]))
    topl = lambda sv: p["apex"] - 0.10 - abs(p["wt"] - sv - p["wr"]) * tg
    hb = FW["top"] - 0.08
    xs = [x for x in np.arange(0.0, sg(p["ws"]) + 1e-6, 0.5)] + [sg(p["wr"])]
    xs = sorted(set(round(x, 4) for x in xs))
    K.B.new_group()
    for a, b in zip(xs[:-1], xs[1:]):
        ta, tb = topl(a), topl(b)
        if max(ta, tb) <= hb + 1e-3: continue
        if ta < hb: sx = a + (b - a) * (hb - ta) / (tb - ta); q = [(sx, hb), (b, hb), (b, tb)]
        elif tb < hb: sx = a + (b - a) * (ta - hb) / (ta - tb); q = [(a, hb), (sx, hb), (a, ta)]
        else: q = [(a, hb), (b, hb), (b, tb), (a, ta)]
        face_dir([frg.p(x, y, 0.0) for x, y in q], frg.N, BRICK, C_PLAIN, [(x, hz(y)) for x, y in q])
    gutter(p["u0"] - 0.18, p["u1"], p["wt"] + OVH, eave_h(p, p["wt"] + OVH), +1)
    downpipe(p["u0"] + 0.15, p["wt"], eave_h(p, p["wt"] + 0.07) - 0.14 / math.cos(math.radians(p["pitch"])) + 0.03, BASE, +1)

def flat_wing(far):
    p = FW
    top = p["top"]
    # track wall (w 3.05 from u -20.16 to -13.06; the short stretch -21.02..-20.16 behind the north pavilion's corner)
    fr = track_frame(p["wt"], p["u0"]); s = lambda u: u - p["u0"]
    ops = [Op(s(-18.68), s(-17.72), 52.92, 54.40, None, "boardwin", label=True),
           seg(-14.205, 1.10, 52.95, 54.62, kind="win", transom=0.35)]
    ops[1].s0, ops[1].s1 = s(ops[1].s0), s(ops[1].s1)
    wall_grid(fr, 0.0, s(p["u1"]), BASE, top - 0.40, ops)
    for o in ops: opening_parts(fr, o, far)
    plinth(fr, 0.0, s(p["u1"]), e0=None, e1="cut")
    band(fr, s(-20.66), s(-20.24), BASE + 0.4, top - 0.40, 0.04, code=C_SURROUND)     # the pilaster at its north end (c01)
    corbel_cornice(fr, 0.0, s(p["u1"]), top - 0.40, [(0.10, 0.04), (0.12, 0.10), (0.18, 0.16)], e0="cut", e1="cut")
    # street wall (w -4.0, u -21.02..-13.06; ESTIMATED 2 windows)
    frs = street_frame(p["ws"], p["u1"]); ss = lambda u: p["u1"] - u
    ops = [seg(ss(-18.2), 1.0, 52.95, 54.55, kind="win"), seg(ss(-15.0), 1.0, 52.95, 54.55, kind="win")]
    wall_grid(frs, 0.0, ss(p["u0"]), BASE, top - 0.40, ops)
    for o in ops: opening_parts(frs, o, far)
    plinth(frs, 0.0, ss(p["u0"]), e0=None, e1="out")
    corbel_cornice(frs, 0.0, ss(p["u0"]), top - 0.40, [(0.10, 0.04), (0.12, 0.10), (0.18, 0.16)], e0="cut", e1="out")
    # the north faces: the step w -4.0..-2.12 at u -21.02 (above the pavilion's eave there it is all wall)
    frn = north_frame(p["u0"], p["ws"]); sn = lambda w: w - p["ws"]
    wall_grid(frn, 0.0, sn(NP["ws"]), BASE, top - 0.40, [])
    plinth(frn, 0.0, sn(NP["ws"]), e0="in", e1="cut")
    corbel_cornice(frn, 0.0, sn(NP["ws"]), top - 0.40, [(0.10, 0.04), (0.12, 0.10), (0.18, 0.16)], e0="in", e1=None)
    # above the north pavilion's roof: the flat wing's north wall shows between the pavilion's roof and its own top
    frn2 = north_frame(p["u0"], NP["ws"]); sn2 = lambda w: w - NP["ws"]
    tg = math.tan(math.radians(NP["pitch"]))
    def under(sv):                                        # the pavilion roof's top line on this wall
        w = NP["ws"] + sv; return NP["apex"] - abs(w - NP["wr"]) * tg - 0.02
    # cells from the pavilion's roof line up to the top: vertical strips (trapezoids)
    xs = [0.0, sn2(NP["wr"]), sn2(p["wt"])]
    K.B.new_group()
    for a, b in ((xs[0], xs[1]), (xs[1], xs[2])):
        q = [(a, under(a)), (b, under(b)), (b, top - 0.40), (a, top - 0.40)]
        if min(top - 0.40 - under(a), top - 0.40 - under(b)) > 0.01:
            face_dir([frn2.p(x, y) for x, y in q], frn2.N, BRICK, C_PLAIN, [(x, hz(y)) for x, y in q])
    corbel_cornice(frn2, 0.0, sn2(p["wt"]), top - 0.40, [(0.10, 0.04), (0.12, 0.10), (0.18, 0.16)], e0=None, e1="in")
    # the flat roof: a membrane (zinc slot) just under the cornice's top, a zinc capping on the cornice
    hbox_b(p["u0"] + 0.02, p["u1"] - 0.02, p["ws"] + 0.02, p["wt"] - 0.02, top - 0.25, top - 0.06, ZINC, C_PLAIN, skip=("bottom",))
    if not far:
        gutter(-20.16, p["u1"], p["wt"] + 0.16, top + 0.05, +1)

def zinc_wing(far):
    p = ZW
    he_t = eave_h(p, p["wt"]); he_s = eave_h(p, p["ws"])
    fr = track_frame(p["wt"], p["u0"]); s = lambda u: u - p["u0"]
    ops = [seg(s(-9.30), 1.20, 52.80, 54.60, kind="win", transom=0.40)]
    wall_grid(fr, 0.0, s(p["u1"]), BASE, he_t - 0.30, ops)
    for o in ops: opening_parts(fr, o, far)
    plinth(fr, 0.0, s(p["u1"]), e0="cut", e1="cut")
    corbel_cornice(fr, 0.0, s(p["u1"]), he_t - 0.30, [(0.10, 0.04), (0.12, 0.10)], e0="cut", e1="cut")
    step_face(p["u0"], FW["wt"], p["wt"], BASE, he_t - 0.30, -1)                 # the 13 cm step to the flat wing
    step_face(p["u1"], p["wt"], MB["wt"], BASE, eave_h(ZW, MB["ws"]) - 0.5, -1)  # the 4 cm step to the main block
    step_face(p["u1"], MB["ws"], p["ws"], BASE, eave_h(ZW, MB["ws"]) - 0.5, -1)
    frs = street_frame(p["ws"], p["u1"]); ss = lambda u: p["u1"] - u
    ops = [seg(ss(-9.9), 1.10, 52.95, 54.55, kind="win")]                   # ESTIMATED
    wall_grid(frs, 0.0, ss(p["u0"]), BASE, he_s - 0.30, ops)
    for o in ops: opening_parts(frs, o, far)
    plinth(frs, 0.0, ss(p["u0"]), e0="cut", e1=None)
    corbel_cornice(frs, 0.0, ss(p["u0"]), he_s - 0.30, [(0.10, 0.04), (0.12, 0.10)], e0="cut", e1="cut")
    # the north gable above the flat wing's roof (c01: painted brick, a small round-headed window)
    frn = north_frame(p["u0"], p["ws"]); sn = lambda w: w - p["ws"]
    hb = FW["top"] - 0.30
    win = Op(sn(p["wr"] - 0.30), sn(p["wr"] + 0.30), 56.55, 57.55, 57.25, "small", label=False)
    gable_wall(frn, 0.0, sn(p["wt"]), hb, he_s - 0.30, he_t - 0.30, sn(p["wr"]), p["apex"] - 0.12, [win])
    opening_parts(frn, win, far)
    gable_roof(p, p["u0"], p["u1"] + 0.10, ZINC, verge0=0.12, verge1=0.0, far=far)
    gutter(p["u0"], p["u1"], p["wt"] + OVH, eave_h(p, p["wt"] + OVH), +1)
    gutter(p["u0"], p["u1"], p["ws"] - OVH, eave_h(p, p["ws"] - OVH), -1)

def main_block(far):
    p = MB
    tg = math.tan(math.radians(p["pitch"]))
    for side in ("t", "s"):
        W = p["wt"] if side == "t" else p["ws"]
        fr = track_frame(W, p["u0"]) if side == "t" else street_frame(W, p["u1"])
        s = (lambda u: u - p["u0"]) if side == "t" else (lambda u: p["u1"] - u)
        L = p["u1"] - p["u0"]
        ops = []
        for i, c in enumerate(BAYS):
            cc = s(c)
            ops.append(seg(cc, 1.02, 55.72, 57.66, rise=0.19, kind="win", transom=0.42, label=(i == 2 and side == "t") or (i == 2 and side == "s")))
            if side == "t":
                kind = "door" if i in (0, 3) else "win"
                wd = 1.40 if i in (0, 1, 2) else (1.16 if i == 3 else 1.30)
            else:                                                            # ESTIMATED (Street View look: a door mid-front)
                kind = "door" if i == 2 else "win"; wd = 1.30
            h0 = FLOOR if kind == "door" else 52.95
            ops.append(seg(cc, wd, h0, 54.50, rise=0.26, kind=kind, transom=0.45 if kind == "win" else None))
        pil = 0.46
        wall_grid(fr, 0.0, L, BASE, MB_EAVE, ops, extra_h=MB_STRING)
        for o in ops: opening_parts(fr, o, far)
        plinth(fr, 0.0, L, e0="cut", e1="cut")
        band(fr, 0.008, L - 0.008, MB_STRING[0], MB_STRING[1], 0.045, e0=None, e1=None)                                 # the string course
        band(fr, 0.014, L - 0.014, MB_STRING[0] + 0.02, MB_STRING[0] + 0.07, 0.085, code=C_CORNICE, e0=None, e1=None)     # its drip
        for a, b in ((0.0, pil), (L - pil, L)):                                              # corner pilasters
            band(fr, a, b, FLOOR + 0.10, MB_EAVE - 0.24, 0.07, code=C_SURROUND)
        corbel_cornice(fr, 0.0, L, MB_EAVE - 0.24, [(0.08, 0.05), (0.08, 0.10), (0.08, 0.16), (0.10, 0.24)], e0="out", e1="out")
        if not far and side == "t":
            for c in [BAYS[0] - 1.6] + [(BAYS[i] + BAYS[i + 1]) / 2 for i in range(4)] + [BAYS[4] + 1.6]:   # wall anchors (c09)
                cc = s(c)
                fbox(fr, cc - 0.02, cc + 0.02, 57.30, 57.62, -0.01, 0.025, IRON, C_KEY, skip=("back",))
                fbox(fr, cc - 0.09, cc + 0.09, 57.44, 57.48, -0.01, 0.022, IRON, C_KEY, skip=("back",))
    # the gables: north (above the zinc wing's roof: painted brick), south (above the link's roof: slate-hung)
    he_t = eave_h(p, p["wt"]); he_s = eave_h(p, p["ws"])
    frn = north_frame(p["u0"], p["ws"]); sn = lambda w: w - p["ws"]
    gable_wall(frn, 0.0, sn(p["wt"]), eave_h(ZW, p["ws"]) - 0.5, MB_EAVE, MB_EAVE, sn(p["wr"]), p["apex"] - 0.14, [])
    corbel_cornice(frn, 0.0, sn(p["wt"]), MB_EAVE - 0.24, [(0.08, 0.05), (0.08, 0.10), (0.08, 0.16), (0.10, 0.24)], e0="in", e1="in")
    frs = south_frame(p["u1"], p["wt"]); ss = lambda w: p["wt"] - w
    gable_wall(frs, 0.0, ss(p["ws"]), eave_h(LK, p["ws"]) - 0.5, MB_EAVE, MB_EAVE, ss(p["wr"]), p["apex"] - 0.14, [])
    corbel_cornice(frs, 0.0, ss(p["ws"]), MB_EAVE - 0.24, [(0.08, 0.05), (0.08, 0.10), (0.08, 0.16), (0.10, 0.24)], e0="in", e1="in")
    # the slate hanging on the south gable: a 4 cm plate over the triangle above the cornice
    K.B.new_group()
    tg = math.tan(math.radians(p["pitch"])); drop = 0.14 / math.cos(math.radians(p["pitch"]))
    h0 = MB_EAVE + 0.14; hap = p["apex"] - drop - 0.03
    sap = ss(p["wr"]); sa = sap - (hap - h0) / tg; sb = sap + (hap - h0) / tg
    tri = [(sa, h0), (sb, h0), (sap, hap)]
    # as vertical strips (no fan): split at the apex column and every ~0.8 m
    cuts = sorted(set([sa, sb, sap] + list(np.arange(sa, sb, 0.8))))
    def ln(x): return h0 + (hap - h0) * ((x - sa) / (sap - sa) if x <= sap else (sb - x) / (sb - sap))
    for a, b in zip(cuts[:-1], cuts[1:]):
        q = [(a, h0), (b, h0), (b, ln(b)), (a, ln(a))]
        q = [x for i, x in enumerate(q) if not (i >= 2 and abs(x[1] - h0) < 1e-4)]
        if len(q) >= 3: face_dir([frs.p(x, y, 0.04) for x, y in q], frs.N, SLATE, C_HUNG, [(x, hz(y)) for x, y in q])
    for (xa, ya), (xb, yb) in ((tri[0], tri[2]), (tri[2], tri[1]), (tri[1], tri[0])):
        out = frs.U * (yb - ya) - Z * (xb - xa)
        face_dir([frs.p(xa, ya, -0.01), frs.p(xb, yb, -0.01), frs.p(xb, yb, 0.04), frs.p(xa, ya, 0.04)], out, SLATE, C_HUNG)
    # the roof: zinc standing seams, a ridge roll; the gables' verges 12 cm over
    gable_roof(p, p["u0"], p["u1"], ZINC, verge0=0.14, verge1=0.14, far=far)
    gutter(p["u0"] - 0.14, p["u1"] + 0.14, p["wt"] + OVH, eave_h(p, p["wt"] + OVH), +1)
    gutter(p["u0"] - 0.14, p["u1"] + 0.14, p["ws"] - OVH, eave_h(p, p["ws"] - OVH), -1)
    # chimneys (measured: the pair astride the ridge near the south gable, the middle one on the ridge)
    chimney(10.30, 0.50, 61.88, su=0.55, sw=0.55)
    chimney(10.30, -0.70, 61.84, su=0.55, sw=0.55)
    chimney(0.50, p["wr"], 61.78, su=0.62, sw=0.48)
    # downpipes on the track front (c09: at the north corner and between bays 3 and 4)
    under = eave_h(p, p["wt"] + 0.07) - 0.14 / math.cos(math.radians(p["pitch"])) + 0.03
    downpipe(p["u0"] + 0.62, p["wt"], under, BASE, +1)
    downpipe(3.9, p["wt"], under, CANOPY["h_wall"] - 0.02, +1)

def link(far):
    p = LK
    he_t = eave_h(p, p["wt"]); he_s = eave_h(p, p["ws"])
    fr = track_frame(p["wt"], p["u0"]); s = lambda u: u - p["u0"]
    ops = [seg(s(13.465), 1.73, FLOOR, 54.66, rise=0.18, kind="door")]
    wall_grid(fr, 0.0, s(p["u1"]), BASE, he_t - 0.25, ops)
    for o in ops: opening_parts(fr, o, far)
    plinth(fr, 0.0, s(p["u1"]), e0="cut", e1="cut")
    corbel_cornice(fr, 0.0, s(p["u1"]), he_t - 0.25, [(0.10, 0.04), (0.12, 0.09)], e0="cut", e1="cut")
    step_face(p["u0"], p["wt"], MB["wt"], BASE, eave_h(LK, MB["ws"]) - 0.5, +1)     # the 13 cm step to the main block
    frs = street_frame(p["ws"], p["u1"]); ss = lambda u: p["u1"] - u
    ops = [seg(ss(13.5), 1.10, 52.95, 54.55, kind="win")]                   # ESTIMATED
    wall_grid(frs, 0.0, ss(p["u0"]), BASE, he_s - 0.25, ops)
    for o in ops: opening_parts(frs, o, far)
    plinth(frs, 0.0, ss(p["u0"]), e0=None, e1=None)
    corbel_cornice(frs, 0.0, ss(p["u0"]), he_s - 0.25, [(0.10, 0.04), (0.12, 0.09)], e0="cut", e1="cut")
    gable_roof(p, p["u0"] - 0.05, p["u1"], ZINC, verge0=0.0, verge1=0.0, far=far, lower=0.0)
    gutter(p["u0"], p["u1"], p["wt"] + OVH, eave_h(p, p["wt"] + OVH), +1)
    gutter(p["u0"], p["u1"], p["ws"] - OVH, eave_h(p, p["ws"] - OVH), -1)
    if not far:
        # a skylight on the track slope (c00 / c04)
        tg = math.tan(math.radians(p["pitch"]))
        wc = 1.35; hc = p["apex"] - abs(wc - p["wr"]) * tg
        nrm = Vector((0, -math.sin(math.radians(p["pitch"])), math.cos(math.radians(p["pitch"]))))
        c = P(13.2, wc, hc) + nrm * 0.02
        ax_u = Vector((1, 0, 0)); ax_s = Vector((0, -math.cos(math.radians(p["pitch"])), -math.sin(math.radians(p["pitch"]))))
        box(c, ax_u, ax_s, nrm, -0.28, 0.28, -0.40, 0.40, 0.0, 0.08, ZINC, C_FRAME)
        face_dir([c + ax_u * a + ax_s * b + nrm * 0.085 for a, b in ((-0.22, -0.34), (0.22, -0.34), (0.22, 0.34), (-0.22, 0.34))], nrm, GLASS, C_PANE,
                 [(0, 0), (1, 0), (1, 1), (0, 1)])

def south_pavilion(far):
    p = SP
    he_t = eave_h(p, p["wt"]); he_s = eave_h(p, p["ws"])
    corn = [(0.09, 0.04), (0.06, 0.08), (0.10, 0.12)]
    # the track wall behind the bay (above the bay's roof only; below, the bay covers it)
    fr = track_frame(p["wt"], p["u0"]); s = lambda u: u - p["u0"]
    wall_grid(fr, 0.0, s(p["u1"]), BAY["top"] - 0.05, he_t - 0.27, [])
    corbel_cornice(fr, 0.0, s(p["u1"]), he_t - 0.27, corn, e0="cut", e1="out")
    # the wall north of the bay (u 16.18..16.41) and the pier south of it (u 24.33..24.50), below the bay's roof
    wall_grid(fr, 0.0, s(BAY["u0"]), BASE, BAY["top"] - 0.05, [])
    plinth(fr, 0.0, s(BAY["u0"]), e0="cut", e1="in")
    wall_grid(fr, s(BAY["u1"]), s(p["u1"]), BASE, BAY["top"] - 0.05, [])
    plinth(fr, s(BAY["u1"]), s(p["u1"]), e0="in", e1="out")
    step_face(p["u0"], LK["wt"], p["wt"], BASE, he_t - 0.27, -1)               # the 6 cm step to the link
    # THE BOX BAY: front (w 4.12) with two boarded shop windows, its south end with a narrow one, a flat roof + fascia
    b0, b1, bw = BAY["u0"], BAY["u1"], BAY["w1"]
    frb = track_frame(bw, b0); sb = lambda u: u - b0
    ops = [Op(sb(16.79), sb(19.67), 53.50, 54.86, None, "boardwin", label=False), Op(sb(21.30), sb(24.05), 53.50, 54.90, None, "boardwin", label=False)]
    wall_grid(frb, 0.0, sb(b1), BASE, BAY["fascia"][0], ops)
    for o in ops: opening_parts(frb, o, far)
    plinth(frb, 0.0, sb(b1), e0="out", e1="out")
    frbs = south_frame(b1, bw); sbs = lambda w: bw - w
    ops = [Op(sbs(3.98), sbs(3.40), 53.46, 54.86, None, "boardwin", label=False)]
    ops[0].s0, ops[0].s1 = sorted((ops[0].s0, ops[0].s1))
    wall_grid(frbs, 0.0, sbs(p["wt"]), BASE, BAY["fascia"][0], ops)
    for o in ops: opening_parts(frbs, o, far)
    plinth(frbs, 0.0, sbs(p["wt"]), e0="in", e1="cut")
    frbn = north_frame(b0, p["wt"]); sbn = lambda w: w - p["wt"]
    wall_grid(frbn, 0.0, sbn(bw), BASE, BAY["fascia"][0], [])
    plinth(frbn, 0.0, sbn(bw), e0="cut", e1="in")
    K.B.new_group()
    hbox_b(b0 - 0.06, b1 + 0.06, p["wt"] - 0.03, bw + 0.08, BAY["fascia"][0], BAY["fascia"][1], PAINT, C_CORNICE)
    # street wall (Street View: one segmental window mid-pavilion)
    frs = street_frame(p["ws"], p["u1"]); ss = lambda u: p["u1"] - u
    ops = [seg(ss(20.3), 1.15, 53.40, 54.85, kind="win", transom=0.40)]
    wall_grid(frs, 0.0, ss(p["u0"]), BASE, he_s - 0.27, ops)
    for o in ops: opening_parts(frs, o, far)
    plinth(frs, 0.0, ss(p["u0"]), e0="out", e1=None)
    corbel_cornice(frs, 0.0, ss(p["u0"]), he_s - 0.27, corn, e0="out", e1="cut")
    # THE SOUTH GABLE (c04 c06 c10): a door and two segmental windows, boarded; recessed stepped panels; verge coping
    frg = south_frame(p["u1"], p["wt"]); sg = lambda w: p["wt"] - w
    gops = [seg(sg(2.40), 0.92, FLOOR, 54.83, rise=0.18, kind="board"),
            seg(sg(0.645), 1.29, 53.42, 54.84, rise=0.20, kind="boardwin"),
            seg(sg(-1.765), 1.49, 53.40, 54.85, rise=0.22, kind="boardwin")]
    Lg = sg(p["ws"]); sap = sg(p["wr"])
    he0, he1 = he_t - 0.27, he_s - 0.27
    panels = step_panels(frg, 0.0, Lg, max(he0, he1), sap, p["apex"] - 0.10)
    pops = [Op(a, b, c, d, None, "none", label=False, sill=None) for (a, b, c, d) in panels]
    gable_wall(frg, 0.0, Lg, BASE, he0, he1, sap, p["apex"] - 0.10, gops + pops)
    for o in gops: opening_parts(frg, o, far)
    for (a, b, c, d) in panels:                                  # the recessed panels: back plate + sides
        K.B.new_group()
        dd = -0.035
        face_dir([frg.p(a, c, dd), frg.p(b, c, dd), frg.p(b, d, dd), frg.p(a, d, dd)], frg.N, BRICK, C_REVEAL, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
        for (xa, ya), (xb, yb) in (((a, c), (b, c)), ((b, c), (b, d)), ((b, d), (a, d)), ((a, d), (a, c))):
            inward = -(frg.U * (yb - ya) - Z * (xb - xa))
            face_dir([frg.p(xa, ya, dd), frg.p(xb, yb, dd), frg.p(xb, yb, 0.0), frg.p(xa, ya, 0.0)], inward, BRICK, C_REVEAL)
    plinth(frg, 0.0, Lg, e0="in", e1="in")
    band(frg, 0.0, Lg, min(he0, he1) - 0.18, min(he0, he1) - 0.04, 0.05, code=C_CORNICE, e0="cut", e1="cut")       # the band at the eaves line
    verge_coping(frg, -0.10, Lg + 0.10, he0 + 0.10, he1 + 0.10, sap, p["apex"] + 0.12, wdt=0.26, proud=0.06)
    kneelers(frg, [(-0.02, he0 + 0.02), (Lg + 0.02, he1 + 0.02), (sap, p["apex"] + 0.10)])
    # the north gable above the link's roof (the diagonal verge in c00 / c04): a sliver of wall + coping
    frn = north_frame(p["u0"], p["ws"]); sn = lambda w: w - p["ws"]
    lk_top = lambda sv: LK["apex"] - abs(p["ws"] + sv - LK["wr"]) * math.tan(math.radians(LK["pitch"]))
    top = lambda sv: p["apex"] - 0.14 / math.cos(math.radians(p["pitch"])) - 0.005 - abs(p["ws"] + sv - p["wr"]) * math.tan(math.radians(p["pitch"]))
    K.B.new_group()
    cuts = [0.0, sn(p["wr"]), sn(p["wt"])]
    for a, b in zip(cuts[:-1], cuts[1:]):
        lo_a, lo_b = lk_top(a) - 0.05, lk_top(b) - 0.05
        if top(a) - lo_a < 0.01 or top(b) - lo_b < 0.01: continue
        q = [(a, lo_a), (b, lo_b), (b, top(b)), (a, top(a))]
        face_dir([frn.p(x, y) for x, y in q], frn.N, BRICK, C_PLAIN, [(x, hz(y)) for x, y in q])
    dtop = 0.14 / math.cos(math.radians(p["pitch"])) + 0.06
    verge_coping(frn, -0.06, sn(p["wt"]) + 0.06, top(0.0) + dtop, top(sn(p["wt"])) + dtop, sn(p["wr"]), p["apex"] + 0.06)
    # the roof (red interlocking tiles)
    gable_roof(p, p["u0"], p["u1"], TILE, verge0=0.0, verge1=0.02, far=far)
    gutter(p["u0"], p["u1"], p["wt"] + OVH, eave_h(p, p["wt"] + OVH), +1)
    gutter(p["u0"], p["u1"], p["ws"] - OVH, eave_h(p, p["ws"] - OVH), -1)
    chimney(16.35, 0.05, 59.40, su=0.50, sw=0.62, base=56.6)

def canopy(far):
    c = CANOPY
    u0, u1, w0, w1 = c["u0"], c["u1"], MB["wt"], c["w1"]
    hw, hf = c["h_wall"], c["h_front"]
    K.B.new_group()
    # the roof sheet (zinc, falling to the platform), 4 cm thick
    top = [P(u0, w0, hw), P(u1, w0, hw), P(u1, w1, hf), P(u0, w1, hf)]
    nrm = Vector((0, -(hw - hf), (w1 - w0))).normalized()
    if nrm.z < 0: nrm = -nrm
    face_dir(top, nrm, ZINC, C_PLAIN, [(u0, 0), (u1, 0), (u1, w1 - w0), (u0, w1 - w0)])
    bot = [x - Vector((0, 0, 0.04)) for x in top]
    face_dir(bot, -nrm, IRON, C_PLAIN, [(u0, 0), (u1, 0), (u1, w1 - w0), (u0, w1 - w0)])
    for a, b, n_ in ((0, 1, Vector((0, 1, 0))), (3, 0, Vector((-1, 0, 0))), (1, 2, Vector((1, 0, 0)))):
        face_dir([top[a], top[b], bot[b], bot[a]], n_, IRON, C_PLAIN)
    # the front fascia (a plain board, dark), the end boards
    hbox_b(u0 - 0.03, u1 + 0.03, w1 - 0.02, w1 + 0.03, hf - 0.20, hf + 0.03, IRON, C_CORNICE)
    sheet = lambda w: hw + (hf - hw) * (w - w0) / (w1 - w0) - 0.045            # the sheet's underside - 5 mm
    for uu in (u0, u1):
        q = [(w0, sheet(w0) - 0.20), (w1 - 0.02, sheet(w1) - 0.20), (w1 - 0.02, sheet(w1) + 0.015), (w0, sheet(w0) + 0.015)]
        for du, nx in ((-0.03, -1), (0.03, 1)):
            face_dir([P(uu + du, w, h) for w, h in q], Vector((nx, 0, 0)), IRON, C_CORNICE)
        face_dir([P(uu - 0.03, q[0][0], q[0][1]), P(uu + 0.03, q[0][0], q[0][1]), P(uu + 0.03, q[1][0], q[1][1]), P(uu - 0.03, q[1][0], q[1][1])], -Z, IRON, C_CORNICE)
    # beams: along the front over the columns, and from each column back to the wall
    cw = c["col_w"]
    hb_top = hf + (hw - hf) * (w1 - cw) / (w1 - w0) - 0.045
    hbox_b(u0 + 0.03, u1 - 0.03, cw - 0.06, cw + 0.06, hb_top - 0.22, hb_top, IRON, C_FRAME)
    for cu in c["cols_u"]:
        q = [(w0 - 0.02, sheet(w0) - 0.16), (cw - 0.06, sheet(cw - 0.06) - 0.16), (cw - 0.06, sheet(cw - 0.06) + 0.015), (w0 - 0.02, sheet(w0) + 0.015)]
        for du, nx in ((-0.05, -1), (0.05, 1)):
            face_dir([P(cu + du, w, h) for w, h in q], Vector((nx, 0, 0)), IRON, C_FRAME)
        face_dir([P(cu - 0.05, q[0][0], q[0][1]), P(cu + 0.05, q[0][0], q[0][1]), P(cu + 0.05, q[1][0], q[1][1]), P(cu - 0.05, q[1][0], q[1][1])], -Z, IRON, C_FRAME)
    # cast-iron columns (base, fluted-looking shaft as a 12-sided lathe, capital), curved brackets either side
    for cu in c["cols_u"]:
        base = P(cu, cw, 52.45)
        prof = [(0.13, 0.0), (0.13, 0.10), (0.10, 0.14), (0.085, 0.30), (0.065, 0.36), (0.060, 1.95), (0.072, 2.00), (0.10, 2.10), (0.12, 2.16)]
        top_h = hb_top - 0.22 - 52.45
        prof = [(r, min(h, top_h)) for r, h in prof]
        if far: prof = [(0.09, 0.0), (0.07, 0.3), (0.065, top_h)]
        lathe(base, prof, 8 if far else 16, IRON, C_FRAME, cap_top=True, smooth=not far)
        if not far:
            hb = hb_top - 0.22
            for sgn in (-1, 1):
                # a curved bracket (a planar spandrel in the beam's plane, 2.5 cm thick): from the column up to the beam,
                # its lower edge a quarter circle (as strips)
                R = 0.55; n = 8
                arc = [(cu + sgn * (0.065 + R * (1 - math.cos(t))), hb - R * (1 - math.sin(t))) for t in np.linspace(0, 0.40 * math.pi, n + 1)]
                for k in range(n):
                    (ua, ha), (ub, hb2) = arc[k], arc[k + 1]
                    for dw, nn in ((-0.0125, Vector((0, 1, 0))), (0.0125, Vector((0, -1, 0)))):
                        q = [P(ua, cw + dw, ha), P(ub, cw + dw, hb2), P(ub, cw + dw, hb), P(ua, cw + dw, hb)]
                        if abs(hb - hb2) < 1e-4: q = [q[0], q[1], q[3]]
                        if abs(hb - ha) < 1e-4: q = [q[0], q[1], q[2]]
                        face_dir(q, nn, IRON, C_FRAME)
                    # the curved underside: its normal points away from the corner (column top x beam)
                    mu, mh = (ua + ub) / 2, (ha + hb2) / 2
                    out = Vector((mu - (cu + sgn * (0.065 + R)), 0, mh - (hb - R))).normalized() * -1
                    face_dir([P(ua, cw - 0.0125, ha), P(ub, cw - 0.0125, hb2), P(ub, cw + 0.0125, hb2), P(ua, cw + 0.0125, ha)], out, IRON, C_FRAME)
                ue, he_ = arc[-1]
                face_dir([P(ue, cw - 0.0125, he_), P(ue, cw + 0.0125, he_), P(ue, cw + 0.0125, hb), P(ue, cw - 0.0125, hb)], Vector((sgn, 0, 0)), IRON, C_FRAME)
    # a gutter along the front and a downpipe down the southern column
    gutter(u0, u1, w1 + 0.03, hf + 0.03, +1, r=0.05)

# ------------------------------------------------------------------------------------------------ build
def build(far):
    K.B = Builder(); K.FAR = far; KT.KNOBS.clear()
    north_pavilion(far)
    flat_wing(far)
    zinc_wing(far)
    main_block(far)
    link(far)
    south_pavilion(far)
    canopy(far)
    return K.B

B_MAIN = build(False)
B_FAR = build(True)
print(f"built LOD0 {len(B_MAIN.f)} faces, far {len(B_FAR.f)} faces ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ mesh
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); mats.append(m)
AO_SPLIT = 0.80
AO_PARK_U = 0.997
PACK_SHAPE = "CONCAVE" if "--fast" not in ARGS else "AABB"

def region_width(me, override):
    """COLOR_0.b = sqrt(width / 4 m) of the face's region (edge-connected faces turning < 50 deg face to face: its
    second extent, or 2 x area / perimeter when smaller) (the town hall's / villa's anti-sparkle)"""
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    cos_t = math.cos(math.radians(50))
    seen = [False] * len(bm.faces); width = [4.0] * len(bm.faces)
    for f0 in bm.faces:
        if seen[f0.index]: continue
        if override[f0.index] is not None:
            seen[f0.index] = True; width[f0.index] = override[f0.index]; continue
        reg, stack = [], [f0]; seen[f0.index] = True; n0 = f0.normal.copy()
        while stack:
            f = stack.pop(); reg.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if not seen[g.index] and override[g.index] is None and g.normal.dot(f.normal) > cos_t:
                        seen[g.index] = True; stack.append(g)
        t = Z.cross(n0); t = t.normalized() if t.length > 1e-3 else Vector((1, 0, 0))
        bv = n0.cross(t).normalized()
        xs = [v.co.dot(t) for f in reg for v in f.verts]; ys = [v.co.dot(bv) for f in reg for v in f.verts]
        zs = [v.co.dot(n0) for f in reg for v in f.verts]
        ext = sorted((max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)))
        w = ext[1] if ext[0] > 0.01 else min(max(xs) - min(xs), max(ys) - min(ys))
        inreg = set(f.index for f in reg)
        area = sum(f.calc_area() for f in reg)
        per = sum(e.calc_length() for f in reg for e in f.edges if sum(1 for g in e.link_faces if g.index in inreg) == 1)
        if per > 1e-6: w = min(w, 2.0 * area / per)
        for f in reg: width[f.index] = w
    bm.free()
    col = me.color_attributes["Col"]
    c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    for poly in me.polygons:
        enc = min(1.0, math.sqrt(max(0.0, width[poly.index]) / 4.0))
        for li in poly.loop_indices: c[4 * li + 2] = enc
    col.data.foreach_set("color", c)

def make_mesh(name, bld):
    used = sorted(set(bld.m)); remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f); me.update()
    for m in used: me.materials.append(mats[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in bld.m])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cdat = []
    for poly, code in zip(me.polygons, bld.c):
        for _ in poly.loop_indices: cdat += [code / 16 + 1 / 32, 1.0, 0.0, 1.0]
    col.data.foreach_set("color", cdat)
    uv0 = me.uv_layers.new(name="UVMap")
    uvd = [0.0] * (2 * len(me.loops))
    for poly, given in zip(me.polygons, bld.uv):
        if given and len(given) == len(poly.loop_indices) and all(g is not None for g in given):
            for li, (u, v) in zip(poly.loop_indices, given): uvd[2 * li] = u; uvd[2 * li + 1] = v
            continue
        n = poly.normal
        if abs(n.z) < 0.75:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:
            t = Vector((1, 0, 0)); b = Vector((0, 1, 0))
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
    me.uv_layers.new(name="Lightmap")
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    sa = me.attributes.new("smoothf", "INT", "FACE"); sa.data.foreach_set("value", [int(x) for x in bld.sm])
    rwa = me.attributes.new("rw", "FLOAT", "FACE"); rwa.data.foreach_set("value", [(-1.0 if r is None else r) for r in bld.rw])
    obj = bpy.data.objects.new(name, me); scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    # weld (0.4 mm); the smooth zinc / terracotta round parts apart from the rest (their smooth normals must not reach a flat neighbour)
    rnd = {i for i, m in enumerate(me.materials) if m.name in ("zinc_roof", "terracotta", "cast_iron_dark")}
    zv = {v for f in bm.faces if f.material_index in rnd for v in f.verts}
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v not in zv], dist=0.0004)
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_valid and v in zv], dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    sm = [0] * len(me.polygons); me.attributes["smoothf"].data.foreach_get("value", sm)
    me.set_sharp_from_angle(angle=math.radians(35))
    me.polygons.foreach_set("use_smooth", [bool(x) for x in sm])
    me.validate()
    rw = [0.0] * len(me.polygons); me.attributes["rw"].data.foreach_get("value", rw)
    region_width(me, [None if r < 0 else r for r in rw])
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    return obj, ntri, {SLOTS[mats.index(me.materials[i])]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == i) for i in range(len(me.materials))}

def lightmap(objs, v0, v1):
    """one lightmap region (v0..v1): smart-projected; THIN faces (< 6 cm across) take no texels (parked at AO 1.0, their
    AO goes per vertex); faces smart_project leaves empty get a planar projection of their own (the villa's fix)"""
    for o in scn.objects: o.select_set(False)
    thin_all = {}
    for obj in objs:
        me = obj.data
        bm = bmesh.new(); bm.from_mesh(me)
        ng = [f_ for f_ in bm.faces if len(f_.verts) > 4]
        if ng: bmesh.ops.triangulate(bm, faces=ng, quad_method="BEAUTY", ngon_method="BEAUTY")
        bm.to_mesh(me); bm.free(); me.update()
        thin = [False] * len(me.polygons)
        for p_ in me.polygons:
            co = [me.vertices[v].co for v in p_.vertices]
            mx = max((co[i] - co[(i + 1) % len(co)]).length for i in range(len(co)))
            thin[p_.index] = mx > 0 and p_.area / mx < (0.06 if len(co) == 4 else 0.03)
        # the round parts (zinc rolls, pipes, pots) take vertex AO too
        for p_ in me.polygons:
            if me.materials[p_.material_index].name in ("zinc_roof", "terracotta", "cast_iron_dark") and p_.area < 0.05: thin[p_.index] = True
        thin_all[obj.name] = thin
        me.uv_layers.active = me.uv_layers["Lightmap"]
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        for f_ in bm.faces: f_.select_set(not thin[f_.index])
        bm.select_flush_mode(); bmesh.update_edit_mesh(me)
        bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        lmd = me.uv_layers["Lightmap"].data; nz = 0
        for p_ in me.polygons:
            if thin[p_.index]: continue
            us = [lmd[li].uv for li in p_.loop_indices]
            if abs(sum(us[i].x * us[(i + 1) % len(us)].y - us[(i + 1) % len(us)].x * us[i].y for i in range(len(us)))) > 1e-12: continue
            n_ = p_.normal; t_ = (Vector((0, 0, 1)) if abs(n_.z) < 0.9 else Vector((1, 0, 0))).cross(n_).normalized(); b_ = n_.cross(t_)
            for li in p_.loop_indices:
                c_ = me.vertices[me.loops[li].vertex_index].co; lmd[li].uv = (c_.dot(t_), c_.dot(b_))
            nz += 1
        print(f"  {obj.name}: {nz} faces projected on their own plane (smart_project left them empty)")
        grp = [0] * len(me.polygons); me.attributes["grp"].data.foreach_get("value", grp)
        for poly, g in zip(me.polygons, grp):
            off = (g % 9973) * 1e-7
            for li in poly.loop_indices: u = lmd[li].uv; lmd[li].uv = (u.x + off, u.y + off)
        obj.select_set(False)
    for obj in objs: obj.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.object.mode_set(mode="EDIT")
    for obj in objs:
        me = obj.data; bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        th = thin_all[obj.name]
        for f_ in bm.faces: f_.select_set(not th[f_.index])
        bm.select_flush_mode(); bmesh.update_edit_mesh(me)
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0008, shape_method=PACK_SHAPE, margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    cov = 0.0; area = 0.0
    for obj in objs:
        me = obj.data; th = thin_all[obj.name]; lm = me.uv_layers["Lightmap"].data
        for p_ in me.polygons:
            for li in p_.loop_indices:
                if th[p_.index]: lm[li].uv = (AO_PARK_U, v0 + 0.5 * (v1 - v0))
                else: u = lm[li].uv; lm[li].uv = (u.x * 0.994, v0 + u.y * (v1 - v0))
            if not th[p_.index]:
                li = list(p_.loop_indices)
                for j in range(1, len(li) - 1):
                    a, b, c_ = lm[li[0]].uv, lm[li[j]].uv, lm[li[j + 1]].uv
                    cov += abs((b.x - a.x) * (c_.y - a.y) - (b.y - a.y) * (c_.x - a.x)) / 2
                area += p_.area
        me.uv_layers.active = me.uv_layers["UVMap"]
    dens = math.sqrt(cov * AO_PX * AO_PX / max(area, 1))
    print(f"  lightmap v {v0:.3f}..{v1:.3f}: {sum(sum(t) for t in thin_all.values())} thin faces (vertex AO), {area:.0f} m2, {dens:.1f} px/m")
    for obj in objs:
        for a in ("grp", "smoothf", "rw"):
            if a in obj.data.attributes: obj.data.attributes.remove(obj.data.attributes[a])
    return thin_all, dens

obj, ntri0, per_slot0 = make_mesh("Station", B_MAIN)
far, ntri_far, per_slot_far = make_mesh("Station_far", B_FAR)
thin0, dens0 = lightmap([obj], 0.0, AO_SPLIT)
thin1, dens1 = lightmap([far], AO_SPLIT + 0.005, 1.0)
print(f"meshes + lightmaps {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground for the bake + previews
def load_ground():
    a = _dtm[::2, ::2]; step = _g["step"] * 2; rows, cols = a.shape
    verts = []
    for r in range(rows):
        for c in range(cols):
            x, z = _g["x0"] + c * step, _g["z0"] + r * step
            dx, dz = x - OXC, z - OZC
            u, w = dx * _ca + dz * _sa, -dx * _sa + dz * _ca
            verts.append((u, -w, a[r, c] - OY - 0.02))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.2, 0.12, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g
ground_obj = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("calevoet_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    m.use_nodes = True
    nt = m.node_tree; n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER"); me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = [0.0] * (4 * len(me.loops)); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    n_set = 0
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices: c[4 * li + 1] = max(0.25, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO {o.name}: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 48 if "--fast" in ARGS else 96
    t = time.time()
    for (targets, others, clear) in (((obj,), (far,), True), ((far,), (obj,), False)):
        for o in others: o.hide_render = True
        for o in targets: o.hide_render = False
        for o in scn.objects: o.select_set(False)
        for o in targets: o.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=clear)
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    far.hide_render = True; obj.hide_render = False
    vertex_ao(obj, thin0[obj.name])
    far.hide_render = False; obj.hide_render = True; vertex_ao(far, thin1[far.name])
    obj.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "calevoet_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "calevoet_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if m.node_tree and "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "calevoet.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
info = {
    "asset": "Gare d'Uccle-Calevoet, the passenger building (tools/blender/calevoet_station.py)",
    "triangles_lod0": ntri0, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot0, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)",
                              "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres per face: walls (along, m TAW - 40), roofs (along the eave, up the slope)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(dens0, 1), "far_px_per_m": round(dens1, 1),
                 "thin_faces_vertex_ao": [sum(thin0[obj.name]), sum(thin1[far.name])]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [SITE["solid"]["id"]], "hides_bu_ids": [x for x in (SITE["solid"]["bu"],) if x]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"parts": {"north_pavilion": NP, "flat_wing": FW, "zinc_wing": ZW, "main_block": MB, "link": LK, "south_pavilion": SP,
                           "bay": BAY, "canopy": CANOPY}, "floor": FLOOR, "main_bays_u": BAYS, "main_string": MB_STRING, "main_eave": MB_EAVE},
    "estimated": "the car-park side's openings (Street View look-only: the track axes mirrored), the north half's car-park side, "
                 "the canopy columns' u (+-0.7 m), the mouldings' profiles, the joinery's sections, the north pavilion's ivy-hidden gable",
    "landmarks": LANDMARKS,
}
json.dump(info, open(os.path.join(OUT, "calevoet.json"), "w"), indent=1)
print(f"done {time.time() - T0:.1f}s")


# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_painted_white": (0.80, 0.79, 0.75), "stone_blue": (0.17, 0.18, 0.19), "slate": (0.10, 0.11, 0.13),
            "zinc_roof": (0.48, 0.50, 0.51), "terracotta": (0.50, 0.17, 0.08), "wood_frame_dark": (0.10, 0.09, 0.08),
            "paint_grey_dark": (0.22, 0.24, 0.26), "cast_iron_dark": (0.07, 0.08, 0.09), "glass_window": (0.04, 0.05, 0.06)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes.get("Principled BSDF")
        if not bsdf: continue
        bsdf.inputs["Base Color"].default_value = (*cols[m.name], 1); bsdf.inputs["Roughness"].default_value = 0.6
        if CHECKER and m.name not in ("glass_window",):
            # a UV0 checker (1 m) on the albedo: stretched or bent UVs and bad normals show at once
            tc = nt.nodes.new("ShaderNodeTexCoord"); ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 1.0
            ck.inputs["Color1"].default_value = (*cols[m.name], 1); ck.inputs["Color2"].default_value = tuple(min(1, c * 0.6 + 0.25) for c in cols[m.name]) + (1,)
            nt.links.new(tc.outputs["UV"], ck.inputs["Vector"]); nt.links.new(ck.outputs["Color"], bsdf.inputs["Base Color"])
    far.hide_render = True
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0; so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.85, 1)
    scn.cycles.samples = 48
    scn.render.image_settings.color_mode = "RGB"
    pdir = os.path.join(ROOT, "docs", "calevoet"); os.makedirs(pdir, exist_ok=True)
    tag = "_checker" if CHECKER else ""
    def look(name, pos, tgt, lens=28, res=(1400, 900), sun_rot=(55, 0, 230)):
        so.rotation_euler = tuple(math.radians(a) for a in sun_rot)
        cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); scn.collection.objects.link(co)
        co.location = pos; d = Vector(tgt) - Vector(pos); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.camera = co; scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(pdir, f"preview_{name}{tag}.png"); bpy.ops.render.render(write_still=True)
    pv = json.load(open(os.path.join(OUT, "photo_views.json")))
    v = pv["c04.jpg"]
    hf_ = 2 * math.atan(math.tan(math.radians(v["fov"]) / 2) * v["size"][0] / v["size"][1])
    look("c04_pose", P(*v["pos"]), P(*v["target"]), lens=18.0 / math.tan(hf_ / 2), res=(1368, 912))
    look("track_front", P(2.0, 30.0, 55.0), P(2.0, 0.0, 56.0), lens=22)
    look("street_side", P(4.0, -26.0, 56.0), P(4.0, 0.0, 56.0), lens=22, sun_rot=(55, 0, 40))
    # grazing light: the sun skimming the track front (low, along u); a dim sky so the relief reads
    scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.15; sun.energy = 7.0
    look("grazing_main", P(-1.0, 9.0, 54.5), P(4.0, 3.0, 55.8), lens=24, sun_rot=(84, 0, 95))
    look("grazing_south_gable", P(31.0, 2.0, 54.0), P(24.5, -0.5, 55.5), lens=26, sun_rot=(82, 0, 175))
    look("north_end", P(-34.0, 15.5, 54.1), P(-12.0, 2.0, 55.5), lens=28, sun_rot=(55, 0, 300))
