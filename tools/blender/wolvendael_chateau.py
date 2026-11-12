"""CHATEAU DE WOLVENDAEL (Parc de Wolvendael, Uccle; 18th c.; today the Ecole d'art d'Uccle): built entirely in code
(no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/wolvendael_chateau.py -- <out_dir> [--no-bake] [--previews] [--fast]
      <out_dir>/wolvendael.raw.glb   nodes "Chateau" (LOD0) and "Chateau_far" (the scripted far variant = LOD1; LOD2 is
                                     made from it by meshoptimizer in tools/wolvendael_pack.mjs); one primitive per NAMED
                                     material slot
      <out_dir>/wolvendael_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/wolvendael.json      the measurements used, slots and codes, placement, counts
      docs/wolvendael/preview_*.png  Cycles renders (--previews)

INPUT: <out_dir>/site.json + site_dtm.* (tools/wolvendael_measure.py), photo_measured.json (tools/wolvendael_photopose.py
--measure). The plan below: the UrbIS footprint (solid 537523 + annex 538880) squared, the DSM's roof parts, the
photos facade by facade (models/wolvendael_chateau/NOTES.md); ESTIMATED where no photo shows a facade (NOTES).

SWAPPABLE MATERIALS: NO colour, NO texture in the GLB:
  - every face is in a NAMED slot (SLOTS in wolvendael_kit.py); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code / 16 + 1/32 (CODES); COLOR_0.g = per-vertex AO of the thin parts; COLOR_0.b =
    sqrt(region width / 4 m) (the viewer's anti-sparkle);
  - TEXCOORD_0 = world metres (walls: along / m TAW - OY; roofs: along the eave / up the slope); TEXCOORD_1 = the
    lightmap UV of the baked AO.
Frame: Blender x = u, y = -w, z = m TAW - OY (OY = 40). glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes at
the city position of the frame origin, height OY, rotation.y = -rotation (site.json frame).
"""
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wolvendael_kit as KT
from wolvendael_kit import (K, Builder, Frame, P, hz, Z, OY, face_dir, fbox, hbox, box, cblock, lathe, pipe, offset_poly,
                            sweep_closed, sweep_open, SLOTS, CODES, RENDER, STONE, BLUE, SLATE, ZINC, WOODW, WOODG, GLASS, TERRA,
                            C_PLAIN, C_BLOCK, C_JOINT, C_REVEAL, C_SILL, C_SURROUND, C_BAND, C_CORNICE, C_PLINTH, C_KEY, C_FRAME,
                            C_BAR, C_PANE, C_LOUVRE, C_HUNG, C_RIDGE)

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/wolvendael_chateau")
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
SITE = json.load(open(os.path.join(OUT, "site.json")))
_g = json.load(open(os.path.join(OUT, "site_dtm.json")))
OXC, OZC = SITE["frame"]["origin_city"]; ROT = SITE["frame"]["rotation_rad"]
_ca, _sa = math.cos(ROT), math.sin(ROT)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

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

# ------------------------------------------------------------------------------------------------ THE PLAN (building frame, m TAW)
# footprint: UrbIS 537523 squared to the frame (its corners within 0.15 m of these lines); w- = the pond side
W_F, U_NE, W_B, U_SWNE, W_SWB, U_SW = -11.36, 20.49, -2.72, -0.59, 3.39, -12.68
FP = [(U_NE, W_F), (U_NE, W_B), (U_SWNE, W_B), (U_SWNE, W_SWB), (U_SW, W_SWB), (U_SW, W_F)]
ANNEX = (-6.62, -0.66, W_SWB, 7.68)            # u0, u1, w0, w1 (UrbIS 538880: -6.64..-0.56 x 3.08..7.70; its NE face 7 cm back)
# levels (photo_measured.json: w04 back-projected on the pond front; the cornice top = UrbIS eaves 57.91)
GF_FLOOR = 50.35
PL_CAP = (50.18, 50.32)                         # plinth cap band (ESTIMATED: the hedge hides the plinth)
GF_SILL, GF_HEAD = 50.38, 52.95
ARCH_SPRING, ARCH_CROWN = 52.47, 52.95
STRING = (53.76, 53.99)
CBAND = (53.32, 54.02); CBAND_U = (4.55, 11.21)
FF_SILL, FF_HEAD = 54.50, 56.30
ARCHITRAVE, SOFFIT, CORNICE = 56.98, 57.40, 57.91
BRISIS_IN0, BRISIS_IN1, BREAK = 0.10, 0.90, 60.05
RIDGE_A, RIDGE_B = 62.94, 63.85
# bays: the main block (B1-B9) symmetric about B5 (the mirror pairs' mean: photo_measured.json); the SW part's 3 about its middle
CB = 7.88
OFF = {1: 10.905, 2: 7.435, 3: 4.53, 4: 2.26, 5: 0.0}
BAY = {1: CB + OFF[1], 2: CB + OFF[2], 3: CB + OFF[3], 4: CB + OFF[4], 5: CB, 6: CB - OFF[4], 7: CB - OFF[3], 8: CB - OFF[2], 9: CB - OFF[1]}
SWC = -8.565
BAY.update({10: SWC + 2.15, 11: SWC, 12: SWC - 2.15})
STRIP_W = 0.57
STRIPS_FRONT = [CB + 5.89, CB - 5.89, CB - 12.61]           # A, B, C (centres); corners at U_NE / U_SW
WIN_W, ARCH_W = 1.18, 1.24
CHIMNEYS = [dict(u=13.23, w=-6.66, su=1.0, sw=1.8, top=63.95, pots=["cowl"]),
            dict(u=1.84, w=-7.58, su=1.0, sw=1.8, top=63.95, pots=["pot", "pot", "pot"]),
            dict(u=-10.70, w=-10.0, su=1.15, sw=0.45, top=60.85, pots=["pot", "pot", "pot", "pot"], pot_r=0.62, est=True)]
LANDMARKS = {}

# ------------------------------------------------------------------------------------------------ helpers
def inside_fp(u, w, poly=FP):
    c = False
    for i in range(len(poly)):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % len(poly)]
        if (y1 > w) != (y2 > w) and u < (x2 - x1) * (w - y1) / (y2 - y1) + x1: c = not c
    return c

def wall_frame(a, b, poly=FP):
    fr, L = Frame.of(a[0], a[1], b[0], b[1])
    mid = fr.p(L / 2, OY, 0.2)
    if inside_fp(mid.x, -mid.y, poly):
        fr, L = Frame.of(b[0], b[1], a[0], a[1]); a, b = b, a
    return fr, L, a, b

def s_of(fr, u, w): return (P(u, w, OY) - fr.O).dot(fr.U)

class Opening:
    def __init__(self, s0, s1, h0, h1, spring=None, kind="ff", sill=None, shutters=None, hb=None):
        self.s0, self.s1, self.h0, self.h1, self.spring, self.kind = s0, s1, h0, h1, spring, kind
        self.sill = sill; self.shutters = shutters; self.hb = hb

# ------------------------------------------------------------------------------------------------ the wall grid
def wall_grid(fr, s0, s1, hb, ht, openings, plates=(), extra_cuts=()):
    """a planar wall s0..s1 x hb..ht as a grid of quads (no fans), minus the openings (arches: vertical strips from the
    arc to the crown line), minus the cells hidden under the stone plates"""
    sc = {s0, s1}; hc = {hb, ht}
    for o in openings:
        sc |= {o.s0, o.s1}; hc |= {o.h0, o.h1} | ({o.spring} if o.spring else set())
    for (a, b, c, d) in plates: sc |= {a, b}; hc |= {c, d}
    sc |= set(x for x in extra_cuts if s0 < x < s1)
    sc = sorted(x for x in sc if s0 - 1e-6 <= x <= s1 + 1e-6); hc = sorted(x for x in hc if hb - 1e-6 <= x <= ht + 1e-6)
    holes = [(o.s0, o.h0, o.s1, o.h1) for o in openings] + [(a, c, b, d) for (a, b, c, d) in plates]
    for i in range(len(sc) - 1):
        for j in range(len(hc) - 1):
            a, b, c, d = sc[i], sc[i + 1], hc[j], hc[j + 1]
            if b - a < 1e-5 or d - c < 1e-5: continue
            cs, ch = (a + b) / 2, (c + d) / 2
            if any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in holes): continue
            face_dir([fr.p(a, c), fr.p(b, c), fr.p(b, d), fr.p(a, d)], fr.N, RENDER, C_PLAIN, [(a, hz(c)), (b, hz(c)), (b, hz(d)), (a, hz(d))])
    # arch spandrels
    for o in openings:
        if not o.spring: continue
        for (sa, ha), (sb, hb_) in arc_pairs(o):
            if max(o.h1 - ha, o.h1 - hb_) < 1e-4: continue
            q = [(sa, ha), (sb, hb_), (sb, o.h1), (sa, o.h1)]
            if o.h1 - hb_ < 1e-5: q = [q[0], q[1], q[3]]
            elif o.h1 - ha < 1e-5: q = [q[0], q[1], q[2]]
            face_dir([fr.p(x, y) for x, y in q], fr.N, RENDER, C_PLAIN, [(x, hz(y)) for x, y in q])

def arc_geom(o):
    half = (o.s1 - o.s0) / 2; rise = o.h1 - o.spring
    R = (half * half + rise * rise) / (2 * rise); cs = (o.s0 + o.s1) / 2; ch = o.h1 - R
    a0 = math.atan2(o.spring - ch, half)
    return cs, ch, R, a0

def arc_pts(o, n=14, inset=0.0):
    cs, ch, R, a0 = arc_geom(o)
    r = R - inset
    return [(cs + r * math.cos(a0 + (math.pi - 2 * a0) * k / n), ch + r * math.sin(a0 + (math.pi - 2 * a0) * k / n)) for k in range(n + 1)]

def arc_pairs(o, n=14):
    pts = arc_pts(o, n)
    pts = sorted(pts)
    return [(pts[k], pts[k + 1]) for k in range(len(pts) - 1)]

# ------------------------------------------------------------------------------------------------ joinery
def casement(fr, s0, s1, h0, h1, d_front, panes_h, transom=None, leaves=2, depth=0.06, fw=0.065, lw=0.055, bar=0.028, glass=True, far=False):
    """a window's joinery in its opening (s0..s1 x h0..h1) at depth d_front (the frame's front face): outer frame,
    `leaves` leaves each with panes_h panes high, an optional fixed transom light (its height); glazing bars 5 mm behind
    the leaves' fronts; glass panes 3 cm behind them. far: frame + mullion + glass only."""
    df0, df1 = d_front - depth, d_front
    K.B.new_group()
    # outer frame (jambs from below the sill line to above the head: they end inside the reveal's head / sill)
    fbox(fr, s0 - 0.01, s0 + fw, h0 - 0.01, h1 + 0.01, df0, df1, WOODW, C_FRAME, skip=())
    fbox(fr, s1 - fw, s1 + 0.01, h0 - 0.01, h1 + 0.01, df0, df1, WOODW, C_FRAME, skip=())
    fbox(fr, s0 + fw, s1 - fw, h1 - fw, h1 + 0.01, df0, df1, WOODW, C_FRAME, skip=())
    fbox(fr, s0 + fw, s1 - fw, h0 - 0.01, h0 + fw * 1.3, df0, df1, WOODW, C_FRAME, skip=())
    i0, i1, j0, j1 = s0 + fw, s1 - fw, h0 + fw * 1.3, h1 - fw
    dl1 = df1 - 0.008            # leaves 8 mm behind the frame front
    dl0 = dl1 - 0.045
    if transom:
        tb = j1 - transom
        fbox(fr, i0, i1, tb - 0.05, tb, dl0 - 0.005, dl1 + 0.004, WOODW, C_FRAME, skip=())
        if not far:
            fbox(fr, (i0 + i1) / 2 - bar / 2, (i0 + i1) / 2 + bar / 2, tb, j1, dl0, dl1 - 0.005, WOODW, C_BAR, skip=())
        if glass:
            face_dir([fr.p(i0, tb, dl0 + 0.012), fr.p(i1, tb, dl0 + 0.012), fr.p(i1, j1, dl0 + 0.012), fr.p(i0, j1, dl0 + 0.012)], fr.N, GLASS, C_PANE,
                     [(0, 0), (1, 0), (1, 1), (0, 1)])
        j1 = tb - 0.05
    lwid = (i1 - i0) / leaves
    for k in range(leaves):
        a, b = i0 + k * lwid, i0 + (k + 1) * lwid
        if far:
            if k > 0: fbox(fr, a - 0.04, a + 0.04, j0, j1, dl0, dl1, WOODW, C_FRAME, skip=())
            continue
        # stiles and rails of the leaf
        fbox(fr, a, a + lw, j0, j1, dl0, dl1, WOODW, C_FRAME, skip=("left",) if k > 0 else ())
        fbox(fr, b - lw, b, j0, j1, dl0, dl1, WOODW, C_FRAME, skip=("right",) if k < leaves - 1 else ())
        fbox(fr, a + lw, b - lw, j1 - lw, j1, dl0, dl1, WOODW, C_FRAME, skip=("left", "right"))
        fbox(fr, a + lw, b - lw, j0, j0 + lw * 1.6, dl0, dl1, WOODW, C_FRAME, skip=("left", "right"))
        ga, gb, gc, gd = a + lw, b - lw, j0 + lw * 1.6, j1 - lw
        for q in range(1, panes_h):
            hq = gc + (gd - gc) * q / panes_h
            fbox(fr, ga, gb, hq - bar / 2, hq + bar / 2, dl0 + 0.006, dl1 - 0.005, WOODW, C_BAR, skip=("left", "right"))
        if glass:
            for q in range(panes_h):
                ha, hb_ = gc + (gd - gc) * q / panes_h, gc + (gd - gc) * (q + 1) / panes_h
                face_dir([fr.p(ga, ha, dl0 + 0.02), fr.p(gb, ha, dl0 + 0.02), fr.p(gb, hb_, dl0 + 0.02), fr.p(ga, hb_, dl0 + 0.02)], fr.N, GLASS, C_PANE,
                         [(0, 0), (1, 0), (1, 1), (0, 1)])
    if far and glass:
        face_dir([fr.p(i0, j0, dl0 + 0.02), fr.p(i1, j0, dl0 + 0.02), fr.p(i1, j1, dl0 + 0.02), fr.p(i0, j1, dl0 + 0.02)], fr.N, GLASS, C_PANE,
                 [(0, 0), (1, 0), (1, 1), (0, 1)])

def fanlight(fr, o, d_front, depth=0.06, fw=0.065, bars=4, far=False):
    """the arched head of a French window: an arched frame (revolved about the arch centre, smooth), radiating bars,
    the glass as sectors"""
    cs, ch, R, a0 = arc_geom(o)
    ctr = fr.p(cs, ch, 0)
    df0, df1 = d_front - depth, d_front
    n = 14 if not far else 7
    # frame: inner face (smooth), front ring, back ring
    ring_o = arc_pts(o, n, -0.01); ring_i = arc_pts(o, n, fw)
    K.B.new_group()
    for k in range(n):
        (sa, ha), (sb, hb_) = ring_o[k], ring_o[k + 1]; (ia, ja), (ib, jb) = ring_i[k], ring_i[k + 1]
        face_dir([fr.p(sa, ha, df1 - 0.01), fr.p(sb, hb_, df1 - 0.01), fr.p(ib, jb, df1 - 0.01), fr.p(ia, ja, df1 - 0.01)], fr.N, WOODW, C_FRAME)
        K.B.smooth = True
        face_dir([fr.p(ia, ja, df0), fr.p(ib, jb, df0), fr.p(ib, jb, df1 - 0.01), fr.p(ia, ja, df1 - 0.01)], fr.p(cs, ch, 0) - fr.p((ia + ib) / 2, (ja + jb) / 2, 0), WOODW, C_FRAME)
        K.B.smooth = False
    # transom bar at the springing
    fbox(fr, o.s0 + fw - 0.005, o.s1 - fw + 0.005, o.spring - 0.03, o.spring + 0.03, df0 + 0.004, df1 - 0.02, WOODW, C_FRAME, skip=())
    gl = d_front - 0.052
    rin = arc_pts(o, n, fw)
    if not far:
        # radiating bars from the transom's centre
        # a half-round hub on the transom (its front 5 mm before the bars'), the bars from its rim
        hub = 0.07
        hp = [(cs + hub * math.cos(math.pi * i / 8), o.spring + 0.03 + hub * math.sin(math.pi * i / 8)) for i in range(9)]
        for i in range(8):
            face_dir([fr.p(cs, o.spring + 0.025, df1 - 0.025), fr.p(*hp[i], df1 - 0.025), fr.p(*hp[i + 1], df1 - 0.025)], fr.N, WOODW, C_BAR)
            face_dir([fr.p(*hp[i], df1 - 0.05), fr.p(*hp[i + 1], df1 - 0.05), fr.p(*hp[i + 1], df1 - 0.025), fr.p(*hp[i], df1 - 0.025)],
                     fr.U * (hp[i][0] + hp[i + 1][0] - 2 * cs) + Z * (hp[i][1] + hp[i + 1][1] - 2 * o.spring - 0.06), WOODW, C_BAR)
        for k in range(1, bars):
            ang = a0 + (math.pi - 2 * a0) * k / bars
            tip = (cs + (R - fw + 0.01) * math.cos(ang), ch + (R - fw + 0.01) * math.sin(ang))
            A0 = Vector((cs, o.spring + 0.03)); Bv = Vector(tip); dv = (Bv - A0).normalized(); A = A0 + dv * (hub - 0.01)
            nv = Vector((-dv.y, dv.x)) * 0.012
            q = [A - nv, Bv - nv, Bv + nv, A + nv]
            for dd, wnt in ((df1 - 0.03, fr.N), (df1 - 0.045, -fr.N)):
                face_dir([fr.p(x.x, x.y, dd) for x in q], wnt, WOODW, C_BAR)
            for (x, y_) in ((q[0], q[1]), (q[3], q[2])):
                face_dir([fr.p(x.x, x.y, df1 - 0.045), fr.p(y_.x, y_.y, df1 - 0.045), fr.p(y_.x, y_.y, df1 - 0.03), fr.p(x.x, x.y, df1 - 0.03)],
                         fr.U * (x - A).dot(Vector((1, 0))) + Z * (x - A).dot(Vector((0, 1))), WOODW, C_BAR)
    # glass: one polygon (the arc + the transom line), its own pane UV
    poly = [(o.s0 + fw, o.spring + 0.03)] + [p for p in rin if p[1] >= o.spring + 0.03] + [(o.s1 - fw, o.spring + 0.03)]
    poly = sorted(poly, key=lambda p: math.atan2(p[1] - (o.spring + 0.03), -(p[0] - cs)))
    cen = (cs, o.spring + 0.03)
    for k in range(len(poly) - 1):
        a, b = poly[k], poly[k + 1]
        tri = [cen, a, b]
        face_dir([fr.p(x, y, gl) for x, y in tri], fr.N, GLASS, C_PANE, [((x - o.s0) / (o.s1 - o.s0), (y - o.spring) / (o.h1 - o.spring)) for x, y in tri])

def shutter_leaf(fr, s0, s1, h0, h1, d0, far=False, sections=2):
    """one louvred shutter leaf folded back against the wall: frame (stiles, rails), louvres at 45 deg between the
    stiles, 1.5 cm off the render"""
    t = 0.032; d1 = d0 + t
    K.B.new_group()
    if far:
        fbox(fr, s0, s1, h0, h1, d0, d1, WOODG, C_LOUVRE, skip=())
        return
    st, rl = 0.048, 0.065
    fbox(fr, s0, s0 + st, h0, h1, d0, d1, WOODG, C_FRAME, skip=())
    fbox(fr, s1 - st, s1, h0, h1, d0, d1, WOODG, C_FRAME, skip=())
    rails = [h0, h1 - rl] + ([h0 + (h1 - h0) / 2 - rl / 2] if sections == 2 else [])
    for r in rails:
        fbox(fr, s0 + st, s1 - st, r, r + rl, d0 + 0.002, d1 - 0.002, WOODG, C_FRAME, skip=("left", "right"))
    rails = sorted(rails)
    pitch = 0.072
    for k in range(len(rails) - 1):
        a, b = rails[k] + rl, rails[k + 1]
        n = max(1, int((b - a) / pitch))
        for i in range(n):
            hc = a + (i + 0.5) * (b - a) / n
            # a slat: a thin plate tilted 45 deg (front edge low), between the stiles (ends inside them)
            hh = 0.026; th = 0.006
            dm = (d0 + d1) / 2
            pts = lambda dh, dd: [fr.p(s0 + st - 0.004, hc + dh, dm + dd), fr.p(s1 - st + 0.004, hc + dh, dm + dd)]
            fa, fb = pts(-hh, hh), pts(hh, -hh)                     # front-low / back-high edge, upper face
            ga_, gb_ = pts(-hh - th, hh - th), pts(hh - th, -hh - th)
            nrm_up = (Z + fr.N).normalized()
            face_dir([fa[0], fa[1], fb[1], fb[0]], nrm_up, WOODG, C_LOUVRE)
            face_dir([ga_[0], ga_[1], gb_[1], gb_[0]], -nrm_up, WOODG, C_LOUVRE)
            face_dir([fa[0], fa[1], ga_[1], ga_[0]], (fr.N - Z).normalized(), WOODG, C_LOUVRE)
            face_dir([fb[0], fb[1], gb_[1], gb_[0]], (Z - fr.N).normalized(), WOODG, C_LOUVRE)

# ------------------------------------------------------------------------------------------------ openings with their parts
REV = 0.22            # reveal depth
def opening_parts(fr, o, far):
    """reveals, joinery, sills, thresholds, shutters, keystones for one opening"""
    rev = REV if not far else 0.18
    K.B.new_group()
    # reveal sides (split at the head / spring)
    top_side = o.spring if o.spring else o.h1
    for s, sg in ((o.s0, 1), (o.s1, -1)):
        face_dir([fr.p(s, o.h0, 0), fr.p(s, top_side, 0), fr.p(s, top_side, -rev - 0.03), fr.p(s, o.h0, -rev - 0.03)], fr.U * sg, RENDER, C_REVEAL,
                 [(0, hz(o.h0)), (0, hz(top_side)), (rev, hz(top_side)), (rev, hz(o.h0))])
    if o.spring:
        K.B.smooth = True
        pts = arc_pts(o, 14 if not far else 7)
        cs, ch, R, a0 = arc_geom(o)
        for k in range(len(pts) - 1):
            (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
            face_dir([fr.p(sa, ha, 0), fr.p(sb, hb_, 0), fr.p(sb, hb_, -rev - 0.03), fr.p(sa, ha, -rev - 0.03)],
                     fr.p(cs, ch, 0) - fr.p((sa + sb) / 2, (ha + hb_) / 2, 0), RENDER, C_REVEAL)
        K.B.smooth = False
    else:
        face_dir([fr.p(o.s0, o.h1, 0), fr.p(o.s1, o.h1, 0), fr.p(o.s1, o.h1, -rev - 0.03), fr.p(o.s0, o.h1, -rev - 0.03)], -Z, RENDER, C_REVEAL)
    dfr = -rev + 0.03          # the frame's front face (it sits 3 cm in front of the reveal's back end)
    kind = o.kind
    if kind == "ff":
        casement(fr, o.s0, o.s1, o.h0, o.h1, dfr, 3, far=far)
    elif kind == "gf":
        casement(fr, o.s0, o.s1, o.h0, o.h1, dfr, 3, transom=0.40, far=far)
    elif kind == "arch":
        casement(fr, o.s0, o.s1, o.h0, o.spring, dfr, 3, far=far)
        fanlight(fr, o, dfr, far=far)
    elif kind == "door":
        # a two-leaf panelled door (ESTIMATED) under a transom light
        tb = o.h1 - 0.45
        casement(fr, o.s0, o.s1, tb, o.h1, dfr, 1, far=far)
        fbox(fr, o.s0 - 0.015, o.s1 + 0.015, o.h0 - 0.01, tb + 0.01, dfr - 0.055, dfr - 0.012, WOODG, C_FRAME, skip=())
        if not far:
            mid = (o.s0 + o.s1) / 2
            for a, b in ((o.s0 + 0.08, mid - 0.06), (mid + 0.06, o.s1 - 0.08)):
                for h0_, h1_ in ((o.h0 + 0.15, o.h0 + 0.9), (o.h0 + 1.05, tb - 0.12)):
                    fbox(fr, a, b, h0_, h1_, dfr - 0.02, dfr + 0.012, WOODG, C_FRAME, skip=("back",))
            fbox(fr, mid - 0.015, mid + 0.015, o.h0 + 0.02, tb - 0.02, dfr - 0.02, dfr + 0.008, WOODG, C_BAR, skip=("back",))
    elif kind == "basement":
        casement(fr, o.s0, o.s1, o.h0, o.h1, dfr, 1, leaves=1, far=far)
    elif kind == "dormer":
        pass
    # sills / thresholds
    if o.sill == "stone":
        cblock(fr, o.s0 - 0.09, o.s1 + 0.09, o.h0 - 0.075, o.h0 + 0.002, -rev - 0.02, 0.07, 0.012, STONE, C_SILL, chamfer_sides="t")
    elif o.sill == "threshold":
        fbox(fr, o.s0 - 0.03, o.s1 + 0.03, o.h0 - 0.17, o.h0 + 0.002, -rev - 0.02, 0.045, BLUE, C_SILL, skip=("back",))
    elif o.sill == "plain":
        face_dir([fr.p(o.s0, o.h0, 0.0), fr.p(o.s1, o.h0, 0.0), fr.p(o.s1, o.h0, -rev - 0.03), fr.p(o.s0, o.h0, -rev - 0.03)], Z, RENDER, C_REVEAL)
    # shutters (folded back against the wall beside the opening)
    if o.shutters:
        top = o.spring if o.spring else o.h1
        for side in o.shutters.get("sides", ("l", "r")):
            wl = o.shutters.get("wl", {}).get(side, o.shutters.get("w", (o.s1 - o.s0) / 2 + 0.01))
            if side == "l": a, b = o.s0 - 0.03 - wl, o.s0 - 0.03
            else: a, b = o.s1 + 0.03, o.s1 + 0.03 + wl
            if o.shutters.get("bifold"):
                shutter_leaf(fr, a, b, o.h0 + 0.02, top - 0.02, 0.015, far)
                shutter_leaf(fr, a + 0.012, b - 0.012, o.h0 + 0.05, top - 0.05, 0.052, far)
            else:
                shutter_leaf(fr, a, b, o.h0 + 0.02, top - 0.02, 0.015, far)
    if o.spring and not far:
        # the keystone: a tapered stone at the crown, up into the central band
        cs = (o.s0 + o.s1) / 2
        kb, kt, w0_, w1_ = o.h1 - 0.13, CBAND[0] + 0.02, 0.085, 0.13
        q = [(cs - w0_, kb), (cs + w0_, kb), (cs + w1_, kt), (cs - w1_, kt)]
        K.B.new_group()
        face_dir([fr.p(x, y, 0.058) for x, y in q], fr.N, STONE, C_KEY, [(x, y) for x, y in q])
        for i in range(4):
            (xa, ya), (xb, yb) = q[i], q[(i + 1) % 4]
            out = fr.U * (yb - ya) - Z * (xb - xa)
            face_dir([fr.p(xa, ya, -0.02), fr.p(xb, yb, -0.02), fr.p(xb, yb, 0.058), fr.p(xa, ya, 0.058)], out, STONE, C_KEY)

# ------------------------------------------------------------------------------------------------ quoins and strips
COURSE_Q = None
def quoin_courses():
    n = round((ARCHITRAVE - PL_CAP[1]) / 0.29)
    return [PL_CAP[1] + (ARCHITRAVE - PL_CAP[1]) * k / n for k in range(n + 1)]

def strip(fr, sc, far, skip_band=True):
    """a rusticated strip (pilaster) centred at s = sc: a stone plate 1.5 cm proud and chamfered blocks 4.5 cm proud
    (V-joints: the plate shows in the 12 mm joints); far: the plate alone (the shader paints the courses)"""
    s0, s1 = sc - STRIP_W / 2, sc + STRIP_W / 2
    K.B.new_group()
    fbox(fr, s0, s1, PL_CAP[1] - 0.02, ARCHITRAVE + 0.02, -0.02, 0.015 if not far else 0.03, STONE, C_JOINT if not far else C_BLOCK, skip=("back",))
    if far: return (s0, s1, PL_CAP[1], ARCHITRAVE)
    hs = quoin_courses()
    for k in range(len(hs) - 1):
        a, b = hs[k] + 0.006, hs[k + 1] - 0.006
        if skip_band and b > STRING[0] - 0.01 and a < STRING[1] + 0.01: continue
        cblock(fr, s0 + 0.004, s1 - 0.004, a, b, 0.0, 0.045, 0.012, STONE, C_BLOCK)
    return (s0, s1, PL_CAP[1], ARCHITRAVE)

def corner_quoins(fr, s_corner, side, far, length=STRIP_W, short=0.40):
    """quoins at a wall's end (side = +1: the corner at s_corner is the wall's right end): blocks alternate long /
    short; the front block wraps the corner by its own projection (the next wall's blocks start beyond it)"""
    K.B.new_group()
    hs = quoin_courses()
    wrap = 0.045
    if side > 0: s0, s1 = s_corner - length, s_corner + (0.015 if not far else 0.03)
    else: s0, s1 = s_corner + 0.02, s_corner + length
    fbox(fr, s0, s1, PL_CAP[1] - 0.02, ARCHITRAVE + 0.02, -0.02, 0.015 if not far else 0.03, STONE, C_JOINT if not far else C_BLOCK, skip=("back",))
    plate = (min(s0, s1), max(s0, s1), PL_CAP[1], ARCHITRAVE)
    if far: return plate
    for k in range(len(hs) - 1):
        a, b = hs[k] + 0.006, hs[k + 1] - 0.006
        if b > STRING[0] - 0.01 and a < STRING[1] + 0.01: continue
        L = (length if (k % 2 == 0) == (side > 0) else short) - 0.004
        if side > 0:
            cblock(fr, s_corner - L, s_corner, a, b, 0.0, 0.045, 0.012, STONE, C_BLOCK, chamfer_sides="ltb")
            fbox(fr, s_corner, s_corner + wrap, a, b, 0.0, 0.045, STONE, C_BLOCK, skip=("left",))
        else: cblock(fr, s_corner, s_corner + L, a, b, 0.0, 0.045, 0.012, STONE, C_BLOCK, chamfer_sides="rtb")
    return plate

# ------------------------------------------------------------------------------------------------ facades
def pond_front_openings(fr, far):
    ops = []
    for k in range(1, 13):
        sc = s_of(fr, BAY[k], W_F)
        if k != 11:
            ops.append(Opening(sc - WIN_W / 2, sc + WIN_W / 2, FF_SILL, FF_HEAD, kind="ff", sill="stone"))
        if k in (4, 5, 6):
            ops.append(Opening(sc - ARCH_W / 2, sc + ARCH_W / 2, GF_SILL, ARCH_CROWN, spring=ARCH_SPRING, kind="arch", sill="threshold",
                               shutters=dict(bifold=True, w=0.31)))
        else:
            sh = dict() if k <= 9 else dict(sides=("r",) if k == 10 else ("l",) if k == 12 else ())
            if k == 10: sh = dict(sides=("l",))
            if k == 12: sh = dict(sides=("r",))
            if k == 11: sh = None
            ops.append(Opening(sc - WIN_W / 2, sc + WIN_W / 2, GF_SILL, GF_HEAD, kind="gf", sill="threshold", shutters=sh))
    return ops

def generic_openings(fr, centres_uw, gf_kind="gf", ff=True, gf=True, shutters=True, door_at=None, gf_skip=(), ff_skip=()):
    ops = []
    for i, (u, w) in enumerate(centres_uw):
        sc = s_of(fr, u, w)
        if ff and i not in ff_skip: ops.append(Opening(sc - WIN_W / 2, sc + WIN_W / 2, FF_SILL, FF_HEAD, kind="ff", sill="stone"))
        if not gf or i in gf_skip: continue
        if door_at is not None and i == door_at:
            ops.append(Opening(sc - 0.72, sc + 0.72, GF_SILL, GF_HEAD + 0.05, kind="door", sill="threshold"))
        else:
            ops.append(Opening(sc - WIN_W / 2, sc + WIN_W / 2, GF_SILL, GF_HEAD, kind=gf_kind, sill="threshold", shutters=dict() if shutters else None))
    return ops

def clamp_shutters(ops, plates, L):
    """each folded shutter leaf as wide as half its opening, but never over a stone strip, a neighbour's leaves (the
    gap shared) or the wall's end"""
    gf = [o for o in ops if o.h0 < 53.5 and o.kind in ("gf", "arch", "door")]
    has = lambda q, sd: q.shutters is not None and sd in q.shutters.get("sides", ("l", "r"))
    for o in gf:
        if o.shutters is None: continue
        sides = o.shutters.get("sides", ("l", "r")); wdef = o.shutters.get("w", (o.s1 - o.s0) / 2 + 0.01)
        wl = {}
        for side in sides:
            if side == "l":
                lim = 0.10
                for p in plates:
                    if p[1] <= o.s0 + 1e-6: lim = max(lim, p[1] + 0.03)
                for q in gf:
                    if q is not o and q.s1 <= o.s0 + 1e-6:
                        lim = max(lim, (q.s1 + o.s0) / 2 + 0.02 if has(q, "r") else q.s1 + 0.04)
                avail = o.s0 - 0.03 - lim
            else:
                lim = L - 0.10
                for p in plates:
                    if p[0] >= o.s1 - 1e-6: lim = min(lim, p[0] - 0.03)
                for q in gf:
                    if q is not o and q.s0 >= o.s1 - 1e-6:
                        lim = min(lim, (q.s0 + o.s1) / 2 - 0.02 if has(q, "l") else q.s0 - 0.04)
                avail = lim - o.s1 - 0.03
            wl[side] = max(0.0, min(wdef, avail))
        o.shutters["wl"] = wl
        o.shutters["sides"] = tuple(sd for sd in sides if wl[sd] >= 0.2)

def build_walls(far):
    """every facade of the L (and the annex), their openings, strips and quoins"""
    walls = {}
    for i in range(len(FP)):
        a, b = FP[i], FP[(i + 1) % len(FP)]
        fr, L, a2, b2 = wall_frame(a, b)
        walls[(a, b)] = (fr, L, a2, b2)
    def W(a, b): return walls[(a, b)]
    hb = PL_CAP[0] + 0.07           # the wall starts behind the plinth cap
    ht = ARCHITRAVE + 0.03          # and ends behind the architrave
    convex = {FP[0], FP[1], FP[3], FP[4], FP[5]}        # FP[2] (the re-entrant corner) has no quoins
    for i in range(len(FP)):
        a, b = FP[i], FP[(i + 1) % len(FP)]
        fr, L, a2, b2 = W(a, b)
        name = {0: "ne_end", 1: "back", 2: "sw_ne", 3: "sw_back", 4: "sw_end", 5: "front"}[i]
        plates = []
        # corner quoins at both ends (convex corners only)
        if a2 in convex: plates.append(corner_quoins(fr, 0.0, -1, far))
        if b2 in convex: plates.append(corner_quoins(fr, L, +1, far))
        if name == "front":
            ops = pond_front_openings(fr, far)
            for u in STRIPS_FRONT: plates.append(strip(fr, s_of(fr, u, W_F), far))
        elif name == "ne_end":
            ops = generic_openings(fr, [(U_NE, -7.04 - 1.70), (U_NE, -7.04 + 1.70)])
        elif name == "back":          # ESTIMATED: the pond front's rhythm, a door at B5
            ops = generic_openings(fr, [(BAY[k], W_B) for k in range(1, 9)], door_at=4)
            for u in STRIPS_FRONT[:2]: plates.append(strip(fr, s_of(fr, u, W_B), far))
        elif name == "sw_ne":         # ESTIMATED
            ops = generic_openings(fr, [(U_SWNE, 0.335)])
        elif name == "sw_back":       # ESTIMATED; the annex covers the ground floor at u -6.62..-0.6
            ops = generic_openings(fr, [(BAY[12], W_SWB), (BAY[11], W_SWB), (BAY[10], W_SWB)], gf_skip=(2,), ff_skip=(2,))
        elif name == "sw_end":        # ESTIMATED (street side): 4 bays, basement windows (the ground is 3.4 m under the floor)
            cen = [(U_SW, W_F + 14.75 * (k + 0.5) / 4) for k in range(4)]
            ops = generic_openings(fr, cen)
            for (u, w) in cen:
                sc = s_of(fr, u, w)
                ops.append(Opening(sc - 0.45, sc + 0.45, 47.75, 48.55, kind="basement", sill="stone"))
        # the wall goes down to the ground where it is lower than the plinth (the plinth sweep covers 46.4 .. 50.32)
        clamp_shutters(ops, plates, L)
        wall_grid(fr, 0.0, L, hb, ht, [o for o in ops if o.kind != "basement"], plates)
        for o in ops:
            if o.kind == "basement": continue
            opening_parts(fr, o, far)
        bas = [o for o in ops if o.kind == "basement"]
        if bas:
            # the basement windows sit in the plinth: their reveals + joinery; the plinth sweep is cut round them below
            for o in bas: opening_parts(fr, o, far)
        walls[(a, b)] = (fr, L, a2, b2, ops, name)
    return walls

def plinth(far, walls):
    """the plinth: a rendered band 3 cm proud from below the ground to 50.18, a stone cap 50.18-50.32 (5.5 cm proud),
    swept round the L; the SW end's basement windows cut out of it (that face is built as a grid instead)"""
    gl = min(ground_min(*FP[i], *FP[(i + 1) % len(FP)]) for i in range(len(FP))) - 0.45
    # the cap all round
    sweep_closed(FP, [(-0.03, PL_CAP[0]), (0.055, PL_CAP[0]), (0.055, PL_CAP[1] - 0.025), (0.035, PL_CAP[1]), (-0.03, PL_CAP[1])], STONE, C_BAND)
    # the plinth face per wall (grid with the basement windows as holes), 3 cm proud
    for (a, b), (fr, L, a2, b2, ops, name) in walls.items():
        g0 = ground_min(a[0], a[1], b[0], b[1]) - 0.45
        bas = [Opening(o.s0, o.s1, o.h0, o.h1) for o in ops if o.kind == "basement"]
        # convex corners: the plinth faces extend by their projection (the neighbour's face starts there)
        ext0 = 0.03 if a2 != FP[2] else -0.03
        ext1 = 0.03 if b2 != FP[2] else -0.03
        sc = sorted({-ext0, L + ext1} | {x for o in bas for x in (o.s0, o.s1)})
        hc = sorted({g0, PL_CAP[0] + 0.01} | {x for o in bas for x in (o.h0, o.h1)})
        for i in range(len(sc) - 1):
            for j in range(len(hc) - 1):
                s0_, s1_, h0_, h1_ = sc[i], sc[i + 1], hc[j], hc[j + 1]
                if any(o.s0 <= (s0_ + s1_) / 2 <= o.s1 and o.h0 <= (h0_ + h1_) / 2 <= o.h1 for o in bas): continue
                face_dir([fr.p(s0_, h0_, 0.03), fr.p(s1_, h0_, 0.03), fr.p(s1_, h1_, 0.03), fr.p(s0_, h1_, 0.03)], fr.N, RENDER, C_PLINTH,
                         [(s0_, hz(h0_)), (s1_, hz(h0_)), (s1_, hz(h1_)), (s0_, hz(h1_))])
        # its top (under the cap): hidden; its ends at the re-entrant corner: the neighbour's face covers them
        for o in bas:
            # the opening's reveal in the 3 cm plinth band: from the plinth face back to the wall (the reveal goes on inward)
            for s, sg in ((o.s0, 1), (o.s1, -1)):
                face_dir([fr.p(s, o.h0, 0.03), fr.p(s, o.h1, 0.03), fr.p(s, o.h1, 0.0), fr.p(s, o.h0, 0.0)], fr.U * sg, RENDER, C_REVEAL)
            face_dir([fr.p(o.s0, o.h1, 0.03), fr.p(o.s1, o.h1, 0.03), fr.p(o.s1, o.h1, 0.0), fr.p(o.s0, o.h1, 0.0)], -Z, RENDER, C_REVEAL)

def entablature(far):
    """the architrave, frieze and cornice swept round the L"""
    if far:
        prof = [(-0.04, ARCHITRAVE), (0.035, ARCHITRAVE), (0.035, 57.11), (0.012, 57.11), (0.012, SOFFIT), (0.44, SOFFIT), (0.44, CORNICE - 0.02),
                (0.47, CORNICE), (-0.12, CORNICE + 0.02)]
        sweep_closed(FP, prof, STONE, C_CORNICE)
        return
    bed = [(0.012 + 0.10 * (1 - math.cos(t * math.pi / 2)), 57.30 + 0.10 * math.sin(t * math.pi / 2)) for t in [k / 6 for k in range(7)]]
    cym = [(0.42 + 0.08 * math.sin(t * math.pi / 2), 57.66 + 0.20 * (1 - math.cos(t * math.pi / 2))) for t in [k / 8 for k in range(9)]]
    prof = [(-0.04, ARCHITRAVE), (0.035, ARCHITRAVE), (0.035, 57.09), (0.025, 57.11), (0.012, 57.11)] + bed + [(0.42, SOFFIT)] + cym + \
           [(0.50, CORNICE), (-0.12, CORNICE + 0.02)]
    # (flat facets: 6 on the bed mould, 8 on the cavetto, 1.5-3.5 cm each; smooth long strips read as bent flat walls to the checker)
    sweep_closed(FP, prof, STONE, C_CORNICE)

def string_course(far, walls):
    prof = [(-0.03, STRING[0]), (0.055, STRING[0]), (0.055, STRING[1] - 0.03), (0.035, STRING[1]), (-0.03, STRING[1])]
    sweep_closed(FP, prof, STONE, C_BAND)
    # the centre's deeper band (B4-B6): a moulded band over the arches, its ends returned to the wall
    fr = [v for v in walls.values() if v[5] == "front"][0][0]
    s0, s1 = sorted((s_of(fr, CBAND_U[1], W_F), s_of(fr, CBAND_U[0], W_F)))
    prof2 = [(-0.02, CBAND[0]), (0.065, CBAND[0]), (0.065, CBAND[1] - 0.08), (0.085, CBAND[1] - 0.05), (0.085, CBAND[1] - 0.025), (0.06, CBAND[1]), (-0.02, CBAND[1])]
    sweep_open(fr, s0, s1, prof2, STONE, C_BAND)
    # the sign "Ecole d'Art d'Uccle" (a plain panel; no lettering) over B5, above the string course
    sc = s_of(fr, BAY[5], W_F)
    fbox(fr, sc - 0.90, sc + 0.90, 54.0, 54.31, -0.02, 0.07 if far else 0.06, STONE, C_PLAIN, skip=("back",))

# ------------------------------------------------------------------------------------------------ the roof
def roof(far):
    """the mansard: the brisis (the steep lower slope, the L ring from the cornice to the break) and the terrasson =
    the UNION of two hipped roofs (Blender's exact boolean): A over the main block (ridge 62.94 along u at w -7.04,
    hipped at the NE end, ending under B), B the SW part's pavilion roof (ridge 63.85 along w at u -6.635, its pond hip
    in A's pond plane). Returns the terrasson's faces (for the zinc rolls) and the break polygon."""
    outer = offset_poly(FP, -BRISIS_IN0); inner = offset_poly(FP, -BRISIS_IN1)
    # the brisis
    sweep_closed(FP, [(-BRISIS_IN0, CORNICE - 0.03), (-BRISIS_IN1, BREAK)], SLATE, C_PLAIN)
    # A and B as convex hulls
    u_a0, u_a1, w_a0, w_a1 = -6.635, U_NE - BRISIS_IN1, W_F + BRISIS_IN1, W_B - BRISIS_IN1
    u_b0, u_b1, w_b0, w_b1 = U_SW + BRISIS_IN1, U_SWNE - BRISIS_IN1, W_F + BRISIS_IN1, W_SWB - BRISIS_IN1
    wr = (w_a0 + w_a1) / 2; ha = (w_a1 - w_a0) / 2; slope_a = (RIDGE_A - BREAK) / ha
    ur = (u_b0 + u_b1) / 2; hb_ = (u_b1 - u_b0) / 2; slope_b = (RIDGE_B - BREAK) / hb_
    wb_pond = w_b0 + (RIDGE_B - BREAK) / slope_a            # B's pond hip in A's pond plane
    wb_back = w_b1 - (RIDGE_B - BREAK) / slope_b
    ptsA = [(u_a0, w_a0, BREAK), (u_a1, w_a0, BREAK), (u_a1, w_a1, BREAK), (u_a0, w_a1, BREAK), (u_a1 - ha, wr, RIDGE_A), (u_a0, wr, RIDGE_A)]
    ptsA += [(x, y, BREAK - 1.2) for (x, y, _) in ptsA[:4]]
    ptsB = [(u_b0, w_b0, BREAK), (u_b1, w_b0, BREAK), (u_b1, w_b1, BREAK), (u_b0, w_b1, BREAK), (ur, wb_pond, RIDGE_B), (ur, wb_back, RIDGE_B)]
    ptsB += [(x, y, BREAK - 1.5) for (x, y, _) in ptsB[:4]]
    def hull(name, pts):
        bm = bmesh.new()
        for (u, w, h) in pts: bm.verts.new(P(u, w, h))
        bmesh.ops.convex_hull(bm, input=bm.verts)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.5), verts=bm.verts, edges=bm.edges)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); scn.collection.objects.link(o); return o
    oa, ob = hull("roofA", ptsA), hull("roofB", ptsB)
    mod = oa.modifiers.new("u", "BOOLEAN"); mod.operation = "UNION"; mod.solver = "EXACT"; mod.object = ob
    bpy.context.view_layer.objects.active = oa
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(oa.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.2), verts=bm.verts, edges=bm.edges)
    bm.faces.ensure_lookup_table()
    tops = []
    for f in bm.faces:
        n = f.normal
        if n.z < 0.05: continue
        if max(v.co.z for v in f.verts) < hz(BREAK) + 1e-3: continue
        pts = [v.co.copy() for v in f.verts]
        tops.append((pts, n.copy()))
    bm.free(); bpy.data.objects.remove(oa); bpy.data.objects.remove(ob)
    K.B.new_group()
    for pts, n in tops:
        X = Z.cross(n); X = X.normalized() if X.length > 1e-6 else Vector((1, 0, 0))
        sl = max(0.2, math.sqrt(max(0.0, 1 - n.z * n.z)))
        uv = [(p.dot(X), (p.z - hz(BREAK)) / sl) for p in pts]          # v = slope distance from the break: courses level round the hips
        face_dir(pts, n, SLATE, C_PLAIN, uv)
    return tops, inner, dict(A=dict(u=[u_a0, u_a1], w=[w_a0, w_a1], ridge_w=wr, ridge=RIDGE_A, slope_deg=math.degrees(math.atan(slope_a))),
                             B=dict(u=[u_b0, u_b1], w=[w_b0, w_b1], ridge_u=ur, ridge=RIDGE_B, ridge_w=[wb_pond, wb_back],
                                    slope_side_deg=math.degrees(math.atan(slope_b)), slope_pond_deg=math.degrees(math.atan(slope_a))))

def roof_rolls(tops, inner, far):
    """zinc rolls on the convex edges of the terrasson (hips, ridges), on the brisis' convex arrises and along the
    break: 16-sided, half buried, a knob where they meet"""
    if far: return
    segs = []
    # edges shared by two top faces turning convex
    edges = {}
    for idx, (pts, n) in enumerate(tops):
        for i in range(len(pts)):
            a, b = pts[i], pts[(i + 1) % len(pts)]
            key = tuple(sorted((tuple(round(x, 4) for x in a), tuple(round(x, 4) for x in b))))
            edges.setdefault(key, []).append((idx, n))
    for key, fs in edges.items():
        if len(fs) != 2: continue
        n1, n2 = fs[0][1], fs[1][1]
        if n1.dot(n2) > 0.995: continue
        a, b = Vector(key[0]), Vector(key[1])
        mid = (a + b) / 2
        # convex if the midpoint of the edge is above the average of the two planes' heights a little to each side
        c1 = sum(tops[fs[0][0]][0], Vector()) / len(tops[fs[0][0]][0]); c2 = sum(tops[fs[1][0]][0], Vector()) / len(tops[fs[1][0]][0])
        if (mid - c1).dot(n1) < -1e-4 or (mid - c2).dot(n2) < -1e-4: continue
        convex = (c2 - mid).dot(n1) < 0
        if not convex: continue
        nn = (n1 + n2).normalized()
        segs.append((a + nn * 0.012, b + nn * 0.012))
    # merge collinear touching segments (the boolean splits the ridges at every vertex of the other roof)
    merged = []
    for a, b in segs:
        d = (b - a).normalized()
        for m in merged:
            ma, mb = m
            md = (mb - ma).normalized()
            if abs(md.dot(d)) < 0.9995: continue
            if ((a - ma) - md * (a - ma).dot(md)).length > 0.003: continue
            ta, tb = sorted(((a - ma).dot(md), (b - ma).dot(md)))
            t0, t1 = 0.0, (mb - ma).length
            if ta > t1 + 0.01 or tb < t0 - 0.01: continue
            n0, n1_ = min(t0, ta), max(t1, tb)
            m[0], m[1] = ma + md * n0, ma + md * n1_
            break
        else:
            merged.append([a.copy(), b.copy()])
    for a, b in merged:
        if (b - a).length < 0.3: continue
        pipe(a, b, 0.032, 16, ZINC, C_RIDGE, smooth=False)
        for p in (a, b): KT.knob(p, 0.045, ZINC, C_RIDGE)
    # the break line (the L ring at the break)
    for i in range(len(inner)):
        a, b = inner[i], inner[(i + 1) % len(inner)]
        pa, pb = P(a[0], a[1], BREAK + 0.005), P(b[0], b[1], BREAK + 0.005)
        d = (pb - pa).normalized()
        # each run stops 3.2 cm short of its corners, inside the corner's knob (two equal pipes crossing would touch tangentially)
        pipe(pa + d * 0.032, pb - d * 0.032, 0.03, 16, ZINC, C_RIDGE, smooth=False)
        KT.knob(pa, 0.045, ZINC, C_RIDGE)
    # the brisis' convex arrises (corners): FP[2] is the re-entrant corner
    outer = offset_poly(FP, -BRISIS_IN0)
    for i in range(len(FP)):
        if i == 2: continue
        a = P(outer[i][0], outer[i][1], CORNICE + 0.02); b = P(inner[i][0], inner[i][1], BREAK)
        pipe(a, b, 0.03, 16, ZINC, C_RIDGE, smooth=False)

def roof_h(u, w):
    """the terrasson's height over (u, w) (A and B as planes; the union = max): dormers and chimneys use it"""
    w_a0, w_a1 = W_F + BRISIS_IN1, W_B - BRISIS_IN1; wr = (w_a0 + w_a1) / 2; ha = (w_a1 - w_a0) / 2; sa_ = (RIDGE_A - BREAK) / ha
    A = -1e9
    if -6.635 <= u <= U_NE - BRISIS_IN1 and w_a0 <= w <= w_a1:
        A = min(RIDGE_A, BREAK + (w - w_a0) * sa_, BREAK + (w_a1 - w) * sa_, BREAK + (U_NE - BRISIS_IN1 - u) * sa_)
    u_b0, u_b1, w_b0, w_b1 = U_SW + BRISIS_IN1, U_SWNE - BRISIS_IN1, W_F + BRISIS_IN1, W_SWB - BRISIS_IN1
    sb = (RIDGE_B - BREAK) / ((u_b1 - u_b0) / 2)
    Bh = -1e9
    if u_b0 <= u <= u_b1 and w_b0 <= w <= w_b1:
        Bh = min(RIDGE_B, BREAK + (u - u_b0) * sb, BREAK + (u_b1 - u) * sb, BREAK + (w - w_b0) * sa_, BREAK + (w_b1 - w) * sb)
    return max(A, Bh)

# ------------------------------------------------------------------------------------------------ dormers
def dormer(side, c, far):
    """a dormer on the brisis (side: 'front' w-, 'back' w+, 'ne' u+, 'sw' u-; c = its centre along the wall):
    slate-hung front and cheeks, a white arched window, a small hipped roof with a zinc-edged eave; the body and the roof
    run back into the terrasson (hidden there)"""
    if side == "front": fr, L, *_ = wall_frame((U_NE, W_F), (U_SW, W_F)); base = (c, W_F)
    elif side == "back": fr, L, *_ = wall_frame((U_NE, W_B), (U_SWNE, W_B)); base = (c, W_B)
    elif side == "ne": fr, L, *_ = wall_frame((U_NE, W_F), (U_NE, W_B)); base = (U_NE, c)
    else: fr, L, *_ = wall_frame((U_SW, W_F), (U_SW, W_SWB)); base = (U_SW, c)
    sc = s_of(fr, *base)
    dfront = -0.115                # the dormer's front face: on the cornice's top, just in front of the brisis' foot
    depth = 2.6
    bw = 0.80                      # half width of the body
    h_bot, h_eave, h_apex = CORNICE - 0.10, 59.80, 60.45
    win0, win1, wh0, wh1 = sc - 0.56, sc + 0.56, 58.15, 59.42
    K.B.new_group()
    o = Opening(win0, win1, wh0, wh1 + 0.10, spring=wh1 - 0.05, kind="dormer")
    # front face (slate-hung) as a grid round the window
    cutsS = sorted({sc - bw, win0, win1, sc + bw}); cutsH = sorted({h_bot, wh0, o.spring, o.h1, h_eave})
    for i in range(len(cutsS) - 1):
        for j in range(len(cutsH) - 1):
            a, b, c0, c1 = cutsS[i], cutsS[i + 1], cutsH[j], cutsH[j + 1]
            if win0 <= (a + b) / 2 <= win1 and wh0 <= (c0 + c1) / 2 <= o.h1: continue
            face_dir([fr.p(a, c0, dfront), fr.p(b, c0, dfront), fr.p(b, c1, dfront), fr.p(a, c1, dfront)], fr.N, SLATE, C_HUNG,
                     [(a, hz(c0)), (b, hz(c0)), (b, hz(c1)), (a, hz(c1))])
    for (sa, ha), (sb, hb_) in arc_pairs(o, 10):
        face_dir([fr.p(sa, ha, dfront), fr.p(sb, hb_, dfront), fr.p(sb, o.h1, dfront), fr.p(sa, o.h1, dfront)], fr.N, SLATE, C_HUNG)
    # cheeks (sides) back into the roof
    for s, sg in ((sc - bw, -1), (sc + bw, 1)):
        face_dir([fr.p(s, h_bot, dfront), fr.p(s, h_eave, dfront), fr.p(s, h_eave, dfront - depth), fr.p(s, h_bot, dfront - depth)], fr.U * sg, SLATE, C_HUNG,
                 [(0, hz(h_bot)), (0, hz(h_eave)), (depth, hz(h_eave)), (depth, hz(h_bot))])
    # the window: white casing (the frame proud of the slate), reveal, the joinery
    cas = 0.075
    rv = 0.10
    for s, sg in ((win0, 1), (win1, -1)):
        face_dir([fr.p(s, wh0, dfront), fr.p(s, o.spring, dfront), fr.p(s, o.spring, dfront - rv - 0.03), fr.p(s, wh0, dfront - rv - 0.03)], fr.U * sg, WOODW, C_REVEAL)
    K.B.smooth = True
    pts = arc_pts(o, 10); cs, ch, R, a0 = arc_geom(o)
    for k in range(len(pts) - 1):
        (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
        face_dir([fr.p(sa, ha, dfront), fr.p(sb, hb_, dfront), fr.p(sb, hb_, dfront - rv - 0.03), fr.p(sa, ha, dfront - rv - 0.03)],
                 fr.p(cs, ch, 0) - fr.p((sa + sb) / 2, (ha + hb_) / 2, 0), WOODW, C_REVEAL)
    K.B.smooth = False
    # casing: jambs + arch ring, 2.5 cm proud of the slate
    fbox(fr, win0 - cas, win0, wh0 - 0.02, o.spring, dfront, dfront + 0.025, WOODW, C_FRAME, skip=("back",))
    fbox(fr, win1, win1 + cas, wh0 - 0.02, o.spring, dfront, dfront + 0.025, WOODW, C_FRAME, skip=("back",))
    ro = arc_pts(o, 10, -cas); ri = arc_pts(o, 10, 0.0)
    for k in range(len(ro) - 1):
        face_dir([fr.p(*ro[k], dfront + 0.025), fr.p(*ro[k + 1], dfront + 0.025), fr.p(*ri[k + 1], dfront + 0.025), fr.p(*ri[k], dfront + 0.025)], fr.N, WOODW, C_FRAME)
        K.B.smooth = True
        face_dir([fr.p(*ro[k], dfront), fr.p(*ro[k + 1], dfront), fr.p(*ro[k + 1], dfront + 0.025), fr.p(*ro[k], dfront + 0.025)],
                 fr.p(*ro[k], 0) - fr.p(cs, ch, 0), WOODW, C_FRAME)
        K.B.smooth = False
    # sill (zinc-covered)
    fbox(fr, win0 - cas - 0.02, win1 + cas + 0.02, wh0 - 0.06, wh0 + 0.002, dfront - rv - 0.03, dfront + 0.06, ZINC, C_SILL, skip=("back",))
    dfr = dfront - rv
    casement(fr, win0, win1, wh0, o.spring, dfr, 2, far=far)
    fanlight(fr, o, dfr, bars=1 if not far else 0, far=True)
    # the hipped roof: a convex hull (eave rectangle 9 cm out, front hip, ridge back into the terrasson), no bottom
    ov = 0.10
    e = [fr.p(sc - bw - ov, h_eave, dfront + ov), fr.p(sc + bw + ov, h_eave, dfront + ov), fr.p(sc + bw + ov, h_eave, dfront - depth), fr.p(sc - bw - ov, h_eave, dfront - depth)]
    ap0 = fr.p(sc, h_apex, dfront + ov - (bw + ov) * 0.75); ap1 = fr.p(sc, h_apex, dfront - depth - 0.6)
    bm = bmesh.new()
    for p in e + [ap0, ap1]: bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bm.faces.ensure_lookup_table()
    for f in bm.faces:
        pts_ = [v.co.copy() for v in f.verts]
        n = f.normal.copy(); X = Z.cross(n); X = X.normalized() if X.length > 1e-6 else Vector((1, 0, 0)); Y = n.cross(X).normalized()
        face_dir(pts_, n, SLATE, C_PLAIN, [(p.dot(X), p.dot(Y)) for p in pts_])
    bm.free()
    # the eave's zinc edge (a thin band under the slates' edge, round the front and the sides)
    if not far:
        for (a, b) in ((e[0], e[1]), (e[1], e[2]), (e[3], e[0])):
            d = (b - a).normalized()
            pipe(a - d * 0.02 - Z * 0.015, b + d * 0.02 - Z * 0.015, 0.022, 12, ZINC, C_RIDGE, smooth=False)
        for p in (e[0], e[1]): KT.knob(p - Z * 0.015, 0.03, ZINC, C_RIDGE)
        # hip rolls
        for p in (e[0], e[1]):
            pipe(p + Z * 0.01, ap0 + Z * 0.01, 0.02, 12, ZINC, C_RIDGE, smooth=False)
        KT.knob(ap0 + Z * 0.01, 0.03, ZINC, C_RIDGE)
    LANDMARKS[f"dormer_{side}_{round(c, 2)}"] = [round(sc, 3), wh0, wh1]

def skylight(u, far):
    """a roof window in A's pond plane (photos: between the B8 and B9 dormers)"""
    w_a0 = W_F + BRISIS_IN1; sa_ = (RIDGE_A - BREAK) / ((W_B - BRISIS_IN1 - w_a0) / 2)
    n = Vector((0, sa_, 1)).normalized()                         # Blender y = -w: the pond plane faces +y and up
    X = Vector((1, 0, 0)); Y = n.cross(X).normalized()
    if Y.z < 0: Y = -Y
    o = P(u, w_a0 + 0.35, BREAK + 0.35 * sa_)
    K.B.new_group()
    for (a0, a1, b0, b1) in ((-0.30, -0.24, 0.0, 0.80), (0.24, 0.30, 0.0, 0.80), (-0.24, 0.24, 0.0, 0.06), (-0.24, 0.24, 0.74, 0.80)):
        box(o, X, Y, n, a0, a1, b0, b1, -0.03, 0.065, ZINC, C_FRAME, skip=("back",))
    face_dir([o + X * -0.245 + Y * 0.055 + n * 0.045, o + X * 0.245 + Y * 0.055 + n * 0.045, o + X * 0.245 + Y * 0.745 + n * 0.045, o + X * -0.245 + Y * 0.745 + n * 0.045],
             n, GLASS, C_PANE, [(0, 0), (1, 0), (1, 1), (0, 1)])

# ------------------------------------------------------------------------------------------------ chimneys
def chimney(c, far):
    """a slate-hung stack (zigzag hanging: code 'hung'), a projecting cap, pots / a cowl"""
    u, w, su, sw, top = c["u"], c["w"], c["su"], c["sw"], c["top"]
    base = min(roof_h(u + du, w + dw) for du in (-su / 2, su / 2) for dw in (-sw / 2, sw / 2)) - 0.4
    K.B.new_group()
    hbox(u - su / 2, u + su / 2, w - sw / 2, w + sw / 2, base, top, SLATE, C_HUNG, skip=("bottom", "top"))
    hbox(u - su / 2 + 0.01, u + su / 2 - 0.01, w - sw / 2 + 0.01, w + sw / 2 - 0.01, top - 0.02, top + 0.0, SLATE, C_HUNG, skip=("bottom",)) if far else None
    # cap: a stone slab 5 cm proud, chamfered top
    ov = 0.05
    hbox(u - su / 2 - ov, u + su / 2 + ov, w - sw / 2 - ov, w + sw / 2 + ov, top - 0.02, top + 0.10, STONE, C_CORNICE)
    if far: return
    # the pots on the cap
    n = len(c["pots"])
    for i, kind in enumerate(c["pots"]):
        t = (i + 0.5) / n
        pw = w - sw / 2 + 0.25 + (sw - 0.5) * t if sw > 0.9 else w
        pu = u if sw > 0.9 else u - su / 2 + 0.15 + (su - 0.3) * t
        p0 = P(pu, pw, top + 0.08)
        if kind == "pot":
            k_ = c.get("pot_r", 1.0)
            prof = [(0.125 * k_, 0.0), (0.135 * k_, 0.04), (0.118 * k_, 0.09), (0.105 * k_, 0.40), (0.118 * k_, 0.44), (0.12 * k_, 0.47), (0.095 * k_, 0.47), (0.095 * k_, 0.30)]
            lathe(p0, prof, 16, TERRA, C_PLAIN, cap_top=True)
        else:
            # a galvanised rotating cowl (NE stack, w02 / w04: one light grey pot)
            prof = [(0.12, 0.0), (0.12, 0.30), (0.17, 0.33), (0.19, 0.45), (0.17, 0.58), (0.09, 0.66), (0.0, 0.70)]
            lathe(p0, prof, 16, ZINC, C_PLAIN, cap_top=False)

# ------------------------------------------------------------------------------------------------ steps, terrace, downpipes, annex
def terrace(far):
    """the terrace before the arches (DTM 50.0 up to 3 m out, u 4.5..10.5) and its steps down to the lawn (5 risers);
    a threshold step in each arch"""
    u0, u1 = 4.30, 11.45
    top = 50.02
    w_out = W_F - 2.95
    g = ground(7.9, W_F - 4.6)
    n = 5; rise = (top - g) / n
    K.B.new_group()
    hbox(u0 + 0.02, u1 - 0.02, w_out, W_F + 0.05, g - 0.6, top, BLUE, C_PLAIN, skip=("bottom", "left", "right", "front"))
    for k in range(n - 1):
        h = top - rise * (k + 1)
        hbox(u0 + 0.02, u1 - 0.02, w_out - 0.30 * (k + 1), w_out - 0.30 * k + 0.02, g - 0.6, h, BLUE, C_PLAIN, skip=("bottom", "left", "right", "front"))
    # the cheek walls each side of the steps (rendered, a stone coping)
    wend = w_out - 0.30 * (n - 1) - 0.05
    for (ua, ub) in ((u0 - 0.30, u0 + 0.03), (u1 - 0.03, u1 + 0.30)):
        hbox(ua, ub, wend, W_F + 0.05, g - 0.4, top + 0.20, RENDER, C_PLINTH, skip=("bottom", "top"))
        hbox(ua - 0.03, ub + 0.03, wend - 0.03, W_F + 0.05, top + 0.20, top + 0.28, STONE, C_BAND, skip=("bottom",))

def downpipe(u, w, side_n, far):
    """a zinc downpipe from the cornice to the ground (brackets every 1.8 m, a shoe)"""
    nrm = Vector((side_n[0], side_n[1], 0)).normalized()
    top = P(u, w, SOFFIT + 0.02) + nrm * 0.12; g = ground(u + side_n[0] * 0.3, w - side_n[1] * 0.3)
    bot = P(u, w, g + 0.25) + nrm * 0.12
    if far:
        K.B.new_group()
        lathe(bot, [(0.05, 0.0), (0.05, (top - bot).length)], 8, ZINC, C_PLAIN, smooth=False)
        return
    L = (top - bot).length + 0.25
    lathe(bot - Z * 0.25, [(0.075, 0.0), (0.075, 0.05), (0.06, 0.12), (0.05, 0.22), (0.05, L)], 16, ZINC, C_PLAIN)
    h = g + 1.2
    while h < SOFFIT - 0.4:
        c0 = P(u, w, h) + nrm * 0.12
        lathe(c0 - Z * 0.03, [(0.05, 0.0), (0.058, 0.004), (0.058, 0.056), (0.05, 0.06)], 16, ZINC, C_FRAME)
        a, b = P(u, w, h) - nrm * 0.02, c0 - nrm * 0.05
        pipe(a, b, 0.012, 8, ZINC, C_FRAME, smooth=False)
        h += 1.8

def annex(far):
    """the low annex behind the SW part (UrbIS 538880; ESTIMATED: no photo): rendered walls, a stone band at the eave,
    a slate roof hip-ended away from the house (ridge 54.99 = the UrbIS top)"""
    u0, u1, w0, w1 = ANNEX
    eave = 51.85
    g = min(ground(u, w) for u in (u0, u1) for w in (w0, w1)) - 0.45
    poly = [(u1, w0 - 0.25), (u1, w1), (u0, w1), (u0, w0 - 0.25)]
    for i, (a, b) in enumerate([(poly[0], poly[1]), (poly[1], poly[2]), (poly[2], poly[3])]):
        fr, L, a2, b2 = wall_frame(a, b, poly)
        ops = []
        if i == 1:
            for t in (0.25, 0.75):
                ops.append(Opening(L * t - 0.55, L * t + 0.55, 49.95, 51.25, kind="ff", sill="stone"))
        if i == 2:
            ops.append(Opening(L * 0.6 - 0.55, L * 0.6 + 0.55, 49.95, 51.25, kind="ff", sill="stone"))
        wall_grid(fr, 0.0, L, g, eave - 0.10, ops)
        for o in ops: opening_parts(fr, o, far)
    sweep_closed([(u1, w0 - 0.25), (u1, w1), (u0, w1), (u0, w0 - 0.25)], [(-0.03, eave - 0.18), (0.095, eave - 0.18), (0.095, eave - 0.02), (-0.06, eave)], STONE, C_CORNICE)
    # the roof: ridge along w from inside the house wall to a hip; hull
    ur = (u0 + u1) / 2; half = (u1 - u0) / 2 - 0.06
    ridge_end = w1 - 0.06 - half * 0.0 - (54.99 - eave) / ((54.99 - eave) / half)
    pts = [P(u0 + 0.06, w0 - 0.3, eave), P(u1 - 0.06, w0 - 0.3, eave), P(u1 - 0.06, w1 - 0.06, eave), P(u0 + 0.06, w1 - 0.06, eave),
           P(ur, w0 - 0.3, 54.99), P(ur, ridge_end, 54.99)]
    bm = bmesh.new()
    for p in pts: bm.verts.new(p)
    bmesh.ops.convex_hull(bm, input=bm.verts)
    bm.faces.ensure_lookup_table()
    K.B.new_group()
    for f in bm.faces:
        if f.normal.z < 0.05: continue
        pts_ = [v.co.copy() for v in f.verts]
        n = f.normal.copy(); X = Z.cross(n); X = X.normalized() if X.length > 1e-6 else Vector((1, 0, 0)); Y = n.cross(X).normalized()
        face_dir(pts_, n, SLATE, C_PLAIN, [(p.dot(X), p.dot(Y)) for p in pts_])
    bm.free()
    if not far:
        pipe(P(ur, w0 - 0.3, 54.99 + 0.012), P(ur, ridge_end, 54.99 + 0.012), 0.03, 16, ZINC, C_RIDGE, smooth=False)
        KT.knob(P(ur, ridge_end, 54.99 + 0.012), 0.04, ZINC, C_RIDGE)

# ------------------------------------------------------------------------------------------------ build
def build(far):
    K.B = Builder(); K.FAR = far; KT.KNOBS.clear()
    walls = build_walls(far)
    plinth(far, walls)
    entablature(far)
    string_course(far, walls)
    tops, inner, roofinfo = roof(far)
    roof_rolls(tops, inner, far)
    for k in (2, 4, 6, 8, 10): dormer("front", BAY[k], far)
    for w_ in (-7.04 - 1.70, -7.04 + 1.70): dormer("ne", w_, far)
    for k in (2, 4, 6): dormer("back", BAY[k], far)          # ESTIMATED
    for w_ in (-5.83, -2.14): dormer("sw", w_, far)           # ESTIMATED
    skylight(-2.2, far)
    for c in CHIMNEYS: chimney(c, far)
    terrace(far)
    downpipe(STRIPS_FRONT[1], W_F, (0, 1), far)               # in front of strip B (w04); Blender +y = towards the pond
    downpipe(U_SW + 0.15, W_F, (0, 1), far)                    # in front of the SW corner quoins (w04)
    downpipe(U_NE - 0.22, W_B, (0, -1), far)                  # ESTIMATED
    downpipe(U_SW + 0.25, W_SWB, (0, -1), far)                # ESTIMATED
    annex(far)
    return K.B, roofinfo

B_MAIN, ROOFINFO = build(False)
B_FAR, _ = build(True)
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
    rnd = {i for i, m in enumerate(me.materials) if m.name in ("zinc_roof", "terracotta")}
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
            if me.materials[p_.material_index].name in ("zinc_roof", "terracotta") and p_.area < 0.05: thin[p_.index] = True
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

obj, ntri0, per_slot0 = make_mesh("Chateau", B_MAIN)
far, ntri_far, per_slot_far = make_mesh("Chateau_far", B_FAR)
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
ao_img = bpy.data.images.new("wolvendael_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    ao_img.filepath_raw = os.path.join(OUT, "wolvendael_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "wolvendael_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if m.node_tree and "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "wolvendael.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
info = {
    "asset": "Chateau de Wolvendael, Parc de Wolvendael (tools/blender/wolvendael_chateau.py)",
    "triangles_lod0": ntri0, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot0, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)",
                              "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres per face: walls (along, m TAW - 40), roofs (along the eave, up the slope from the break)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(dens0, 1), "far_px_per_m": round(dens1, 1),
                 "thin_faces_vertex_ao": [sum(thin0[obj.name]), sum(thin1[far.name])]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [SITE["solids"]["537523"]["id"], SITE["solids"]["538880"]["id"]],
                  "hides_bu_ids": [x for x in (SITE["solids"]["537523"]["bu"], SITE["solids"]["538880"]["bu"]) if x]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"footprint_squared": FP, "annex": ANNEX, "levels_taw": {"gf_floor": GF_FLOOR, "gf_head": GF_HEAD, "arch_spring": ARCH_SPRING, "arch_crown": ARCH_CROWN,
                 "string_course": STRING, "centre_band": CBAND, "ff_sill": FF_SILL, "ff_head": FF_HEAD, "architrave": ARCHITRAVE, "soffit": SOFFIT,
                 "cornice": CORNICE, "break": BREAK, "ridge_A": RIDGE_A, "ridge_B": RIDGE_B}, "bays_u": BAY, "strips_u": STRIPS_FRONT, "roof": ROOFINFO,
                 "chimneys": CHIMNEYS},
    "estimated": "the entrance side (back of the main block: the pond front's rhythm, a door at B5), the SW part's back / NE / SW-end faces, the annex, "
                 "the plinth (hidden by the hedge), the back and SW-end dormers, the SW chimney's size, the mouldings' profiles, the joinery's sections",
    "landmarks": LANDMARKS,
}
json.dump(info, open(os.path.join(OUT, "wolvendael.json"), "w"), indent=1)
print(f"done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"render_white_lime": (0.78, 0.76, 0.71), "stone_white": (0.62, 0.57, 0.47), "stone_blue": (0.30, 0.31, 0.31), "slate": (0.11, 0.12, 0.14),
            "zinc_roof": (0.42, 0.44, 0.45), "wood_frame_white": (0.85, 0.85, 0.82), "wood_painted_grey": (0.45, 0.46, 0.45),
            "glass_window": (0.05, 0.06, 0.08), "terracotta": (0.45, 0.2, 0.1)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes.get("Principled BSDF")
        if bsdf: bsdf.inputs["Base Color"].default_value = (*cols[m.name], 1); bsdf.inputs["Roughness"].default_value = 0.6
    far.hide_render = True
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0; so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(55), 0, math.radians(200))
    scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.85, 1)
    scn.cycles.samples = 48
    scn.render.image_settings.color_mode = "RGB"
    pdir = os.path.join(ROOT, "docs", "wolvendael"); os.makedirs(pdir, exist_ok=True)
    def look(name, pos, tgt, lens=28, res=(1200, 800)):
        cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); scn.collection.objects.link(co)
        co.location = pos; d = Vector(tgt) - Vector(pos); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.camera = co; scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(pdir, f"preview_{name}.png"); bpy.ops.render.render(write_still=True)
    look("pond_front", P(28.1, -62.9, 48.4), P(4.0, -8.0, 55.0), lens=27 * 0.85)
    look("arches_close", P(9.0, -22.0, 51.5), P(7.9, -11.4, 53.2), lens=24)
    look("ne_corner", P(38.0, -30.0, 53.0), P(14.0, -7.0, 56.0), lens=26)
