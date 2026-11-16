"""THE PAPENKASTEEL (Chateau de Stalle, Rue Papenkasteel 99, Uccle; built 1685-1688 for Philippe-Vincent Franckheim,
reworked in the 19th century, roof restored 1967, listed 16 Oct 1975, heritage inventory 27820): the castle on the
Geleytsbeek, built entirely in code (no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/papenkasteel.py -- <out_dir> [--no-bake] [--previews] [--checker] [--fast]
      <out_dir>/papenkasteel.raw.glb  nodes "Papenkasteel" (LOD0) and "Papenkasteel_far" (the scripted far variant = LOD1;
                                      LOD2 is made from it by meshoptimizer in tools/papenkasteel_pack.mjs); one primitive
                                      per NAMED slot
      <out_dir>/papenkasteel_ao.png   ambient occlusion (Cycles, GPU: OptiX) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/papenkasteel.json     the measurements used, slots and codes, placement, counts
      docs/geleytsbeek/preview_*.png  Cycles renders (--previews; a UV checker with --checker)

INPUT: <out_dir>/site.json + site_dtm.* (tools/papenkasteel_measure.py: UrbIS solids 528339 + 528019, the DSM / DTM 2021
mosaic). The plan: the UrbIS footprints squared into their parts, the DSM's roofs (hipped main roof 51 deg with a bell-cast
eave, ridge 64.6; the tower's bell roof and lantern 70.6 / 72.9; the annexes' 32 deg hips; the outbuilding range's 50 deg
roof, ridge 59.2; its wing's 24 deg hip, ridge 56.4), the references facade by facade (models/papenkasteel/NOTES.md);
ESTIMATED where no reference shows a face (the garden front, the outbuildings' courtyard faces: NOTES).

SWAPPABLE MATERIALS (the owner's hero rule): NO colour, NO texture in the GLB:
  - every face is in a NAMED slot (SLOTS below); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code / 16 + 1/32 (CODES of the kit); COLOR_0.g = per-vertex AO of the thin parts; COLOR_0.b =
    sqrt(region width / 4 m) (the viewer's anti-sparkle);
  - TEXCOORD_0 = world metres (walls: along the wall / m TAW - 40, so brick courses sit level all round; roofs: along the
    eave / up the slope, undistorted on hips); TEXCOORD_1 = the lightmap UV of the baked AO.
Frame: Blender x = u, y = -w, z = m TAW - OY (OY = 40). glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes at
the city position of the frame origin, height OY, rotation.y = -rotation (site.json frame). u runs along the main range's
courtyard front (u+ = east-north-east), w across (w+ = the courtyard, south-south-east).
Kit: tools/blender/wolvendael_kit.py (builder, frames, boxes, lathes, pipes, offsets; imported read-only); the wall grid,
casements, sills, gutters and the mesh / lightmap / bake / export steps follow tools/blender/calevoet_station.py.
"""
import bpy, bmesh, json, math, os, sys, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import wolvendael_kit as KT
from wolvendael_kit import (K, Builder, Frame, P, hz, Z, OY, face_dir, fbox, box, lathe, pipe, knob, offset_poly, sweep_closed, CODES,
                            C_PLAIN, C_BLOCK, C_JOINT, C_REVEAL, C_SILL, C_SURROUND, C_BAND, C_CORNICE, C_PLINTH, C_KEY, C_FRAME,
                            C_BAR, C_PANE, C_LOUVRE, C_HUNG, C_RIDGE)
import numpy as np

T0 = time.time()
ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/papenkasteel")
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
SLOTS = ["render_white", "brick_red_brussels", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white",
         "wood_frame_dark", "cast_iron_dark", "glass_window"]
(RENDER, BRICK, STONE, BLUE, SLATE, ZINC, FRAMEW, FRAMED, IRON, GLASS) = range(10)
ROUND_SLOTS = ("zinc_roof", "cast_iron_dark")       # smooth round parts kept apart from flat neighbours at the weld

# ------------------------------------------------------------------------------------------------ ground (DTM)
_dtm = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + _g["base"]
def city(u, w): return OXC + u * _ca - w * _sa, OZC + u * _sa + w * _ca
def ground_city(x, z):
    c = (x - _g["x0"]) / _g["step"]; r = (z - _g["z0"]) / _g["step"]
    c0 = int(min(max(math.floor(c), 0), _g["cols"] - 2)); r0 = int(min(max(math.floor(r), 0), _g["rows"] - 2)); fc, fr = c - c0, r - r0
    a = _dtm
    return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
def ground(u, w): return ground_city(*city(u, w))
def ground_min(ua, wa, ub, wb, n=24):
    return min(ground(ua + (ub - ua) * t / n, wa + (wb - wa) * t / n) for t in range(n + 1))

# ------------------------------------------------------------------------------------------------ THE PLAN (frame, m TAW)
# Footprints squared to the UrbIS solids (site.json footprint_local); heights from the DSM (NOTES.md "Roofs").
FLOOR = 49.75                                   # ground floor (the courtyard 49.45 + two steps)
HOUSE = dict(u0=-12.10, u1=9.15, w0=-9.20, w1=1.50, top=58.30)          # the main range (2 storeys, hipped roof)
# the hipped roof: a bell-cast (coyau) eave (30 deg over 1 m) then 51 deg to the ridge 64.6 (DSM 64.5-64.8 at w -4.6..-4.8)
HOUSE_ROOF = [(0.40, 58.16), (-0.60, 58.74)] + [(-5.338, 58.74 + (5.338 - 0.60) * math.tan(math.radians(51)))]
TOWER = dict(u0=-4.04, u1=1.56, w0=-3.00, w1=2.93, top=67.00)          # the brick tower (DSM top 72.9 = the lantern)
TU, TW = (TOWER["u0"] + TOWER["u1"]) / 2, (TOWER["w0"] + TOWER["w1"]) / 2
T_LEVELS = [(54.75, 56.95), (58.00, 60.20), (61.20, 63.40), (64.40, 66.40)]   # the tower's windows (sill, head)
WA = dict(u0=-12.10, u1=-7.80, w0=1.50, w1=9.20, top=52.85, pitch=32.0)    # west annex (one storey)
EA = dict(u0=5.80, u1=8.80, w0=1.45, w1=8.10, top=52.85, pitch=32.0)       # east annex
NX = dict(u0=9.10, u1=12.13, w0=-8.98, w1=-2.21, top=52.85, pitch=32.0)    # the north-east extension (under the plane tree)
LR = dict(u0=-20.90, u1=9.47, w0=21.50, w1=28.80, top=54.85, pitch=50.0)   # the outbuilding range (528019)
RW = dict(u0=-17.80, u1=-11.25, w0=13.50, w1=21.50, top=54.95, pitch=24.0) # its wing towards the house
GF = (50.55, 53.25); FF = (54.75, 57.25)        # the house's windows (sill, head): ground and first floor
OVH = 0.30
LANDMARKS = {}

def base_of(ua, wa, ub, wb):
    """a wall's foot: 30 cm under the lowest ground 1 m before it (the joins rule: the terrain covers the foot)"""
    return round(ground_min(ua, wa, ub, wb) - 0.30, 3)

# ------------------------------------------------------------------------------------------------ wall frames
def side_frame(r, side):
    """the wall of rectangle r on `side` ('+w', '-w', '+u', '-u'): (frame, length, s(coord)) - traversed left -> right
    as seen from outside; s maps the coordinate along the wall (u for the w faces, w for the u faces) to the frame's s"""
    u0, u1, w0, w1 = r["u0"], r["u1"], r["w0"], r["w1"]
    if side == "+w": fr, L = Frame.of(u0, w1, u1, w1); return fr, L, (lambda c: c - u0)
    if side == "-w": fr, L = Frame.of(u1, w0, u0, w0); return fr, L, (lambda c: u1 - c)
    if side == "+u": fr, L = Frame.of(u1, w1, u1, w0); return fr, L, (lambda c: w1 - c)
    fr, L = Frame.of(u0, w0, u0, w1); return fr, L, (lambda c: c - w0)

class Op:
    """an opening on a wall frame: s0..s1, h0 (sill / floor) .. h1 (crown); spring = the springing of an arched head
    (None: flat); kind: win | french | door | carriage | small; surround: None | 'flat' (a painted band) | 'stone'
    (alternating blocks + lintel: the tower)"""
    def __init__(self, s0, s1, h0, h1, spring=None, kind="win", surround="flat", sill=True, transom=None, rows=None):
        self.s0, self.s1, self.h0, self.h1, self.spring, self.kind = s0, s1, h0, h1, spring, kind
        self.surround, self.sill, self.transom, self.rows = surround, sill, transom, rows

def op(s, c, wd, h0, h1, kind="win", arch=None, **kw):
    """an opening centred on the wall coordinate c (s maps it), width wd; arch: None | 'round' | 'seg' (rise wd / 6)"""
    a, b = sorted((s(c - wd / 2), s(c + wd / 2)))
    spring = None
    if arch == "round": spring = h1 - wd / 2
    elif arch == "seg": spring = h1 - max(0.12, wd / 6.0)
    return Op(a, b, h0, h1, spring, kind, **kw)

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

def NARC(): return 6 if K.FAR else 14

# ------------------------------------------------------------------------------------------------ the wall grid
def wall_grid(fr, s0, s1, hb, ht, openings, mat=RENDER, code=C_PLAIN, top_line=None, extra_s=(), extra_h=(), holes=()):
    """a planar wall s0..s1 x hb..ht as a grid of quads (no fans), minus the openings (arched heads: vertical strips
    from the arc to the crown line) and the hidden `holes` [(s0, h0, s1, h1)] (behind another part); top_line(s) -> h
    cuts the cells under a sloped top (gables)"""
    sc = {s0, s1} | set(x for x in extra_s if s0 < x < s1); hc = {hb, ht} | set(x for x in extra_h if hb < x < ht)
    for o in openings:
        sc |= {o.s0, o.s1}; hc |= {o.h0, o.h1} | ({o.spring} if o.spring else set())
        if o.spring:
            sc |= set(round(p[0], 5) for p in arc_pts(o, NARC())[1:-1])
    for (a, b_, c, d) in holes:
        sc |= {a, c}; hc |= {b_, d}
    sc = sorted(x for x in sc if s0 - 1e-6 <= x <= s1 + 1e-6); hc = sorted(x for x in hc if hb - 1e-6 <= x <= ht + 1e-6)
    cut = [(o.s0, o.h0, o.s1, o.h1) for o in openings] + list(holes)
    for i in range(len(sc) - 1):
        a, b = sc[i], sc[i + 1]
        if b - a < 1e-5: continue
        ta = top_line(a) if top_line else ht; tb = top_line(b) if top_line else ht
        tmin = min(ta, tb)
        if max(ta, tb) <= hb + 1e-4: continue
        rows = [h for h in hc if h < tmin - 1e-4] + [None]
        if len(rows) == 1 and top_line:
            if ta < hb: sx = a + (b - a) * (hb - ta) / (tb - ta); q = [(sx, hb), (b, hb), (b, tb)]
            else: sx = a + (b - a) * (ta - hb) / (ta - tb); q = [(a, hb), (sx, hb), (a, ta)]
            cs = (q[0][0] + q[1][0]) / 2; ch = hb + 0.01
            if not any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in cut):
                face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])
            continue
        for j in range(len(rows) - 1):
            c = rows[j]; d = rows[j + 1]
            cs = (a + b) / 2
            if d is None: q = [(a, c), (b, c), (b, tb), (a, ta)]; ch = (c + tmin) / 2
            else: q = [(a, c), (b, c), (b, d), (a, d)]; ch = (c + d) / 2
            if any(x0 <= cs <= x1 and y0 <= ch <= y1 for (x0, y0, x1, y1) in cut): continue
            face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])
    for o in openings:
        if not o.spring: continue
        pts = sorted(arc_pts(o, NARC()))
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
            q = clip2d(q, hb, ht)
            if len(q) >= 3: face_dir([fr.p(x, y) for x, y in q], fr.N, mat, code, [(x, hz(y)) for x, y in q])

def clip2d(q, lo, hi):
    """a 2D polygon [(s, h)] clipped to lo <= h <= hi"""
    for (lim, keep_ge) in ((lo, True), (hi, False)):
        out = []
        for k in range(len(q)):
            a, b = q[k], q[(k + 1) % len(q)]
            ia = (a[1] >= lim - 1e-9) if keep_ge else (a[1] <= lim + 1e-9)
            ib = (b[1] >= lim - 1e-9) if keep_ge else (b[1] <= lim + 1e-9)
            if ia: out.append(a)
            if ia != ib:
                t = (lim - a[1]) / (b[1] - a[1]); out.append((a[0] + (b[0] - a[0]) * t, lim))
        q = [p for i, p in enumerate(out) if i == 0 or abs(p[0] - out[i - 1][0]) + abs(p[1] - out[i - 1][1]) > 1e-6]
        if len(q) > 2 and abs(q[0][0] - q[-1][0]) + abs(q[0][1] - q[-1][1]) < 1e-6: q.pop()
        if len(q) < 3: return []
    return q

BAND_PITCH, BAND_H, BAND_START = 1.45, 0.13, 50.62     # the tower's stone bands (the 1972 photo: one course every ~1.45 m)
def banded_wall(fr, s0, s1, hb, ht, ops):
    """a brick wall with the Brabant-Spanish white stone bands ("briques en bandeau", the heritage text and the 1972
    photo): the wall split into rows, brick and stone in turn, each row its own grid round the same openings"""
    cuts = [hb]
    h = BAND_START
    while h < ht - 0.25:
        if h > hb + 0.05: cuts += [h, h + BAND_H]
        h += BAND_PITCH
    cuts.append(ht)
    for i in range(len(cuts) - 1):
        a, b = cuts[i], cuts[i + 1]
        if b - a < 1e-4: continue
        stone = (i % 2 == 1)
        wall_grid(fr, s0, s1, a, b, ops, STONE if stone else BRICK, code=C_BAND if stone else C_PLAIN)

# ------------------------------------------------------------------------------------------------ joinery
def frame_box(fr, s0, s1, h0, h1, d0, d1, mat=FRAMEW, code=C_FRAME, skip=()):
    fbox(fr, s0, s1, h0, h1, d0, d1, mat, code, skip=skip)

def pane(fr, a, b, c, d, dd, mat=GLASS):
    face_dir([fr.p(a, c, dd), fr.p(b, c, dd), fr.p(b, d, dd), fr.p(a, d, dd)], fr.N, mat, C_PANE if mat == GLASS else C_PLAIN, [(0, 0), (1, 0), (1, 1), (0, 1)])

def casement(fr, s0, s1, h0, h1, d_front, leaves=2, rows=None, transom=None, far=False, head=False, mat=FRAMEW):
    """a white-painted casement in its opening (s0..s1 x h0..h1, h1 = the springing of an arched head): outer frame,
    `leaves` leaves, SMALL PANES (petits-bois: `rows` rows, one vertical bar per leaf when it is wide), an optional
    transom light; glass 2 cm behind the leaves' fronts. far: frame + one glass pane per leaf."""
    fw, lw = 0.065, 0.055
    df0, df1 = d_front - 0.065, d_front
    K.B.new_group()
    jt = h1 - 0.035 if head else h1 + 0.01
    frame_box(fr, s0 - 0.01, s0 + fw, h0 - 0.01, jt, df0, df1, mat, skip=("top",) if head else ())
    frame_box(fr, s1 - fw, s1 + 0.01, h0 - 0.01, jt, df0, df1, mat, skip=("top",) if head else ())
    frame_box(fr, s0 + fw, s1 - fw, h0 - 0.01, h0 + fw * 1.3, df0, df1, mat, skip=("left", "right"))
    if not head: frame_box(fr, s0 + fw, s1 - fw, h1 - fw, h1 + 0.01, df0, df1, mat, skip=("left", "right"))
    i0, i1, j0, j1 = s0 + fw, s1 - fw, h0 + fw * 1.3, (h1 - 0.035 if head else h1 - fw)
    dl1 = df1 - 0.008; dl0 = dl1 - 0.045
    if transom:
        tb = j1 - transom
        frame_box(fr, i0, i1, tb - 0.06, tb, dl0 - 0.005, dl1 + 0.004, mat, skip=("left", "right"))
        if not far:
            nb = max(1, int(round((i1 - i0) / 0.32)))
            for k in range(1, nb):
                x = i0 + (i1 - i0) * k / nb
                frame_box(fr, x - 0.014, x + 0.014, tb, j1, dl0 + 0.008, dl1 - 0.006, mat, C_BAR, skip=("top", "bottom"))
        pane(fr, i0, i1, tb, j1, dl0 + 0.014)
        j1 = tb - 0.06
    lwid = (i1 - i0) / leaves
    nrows = rows if rows else max(2, int(round((j1 - j0) / 0.40)))
    for k in range(leaves):
        a, b = i0 + k * lwid, i0 + (k + 1) * lwid
        if far:
            if k > 0: frame_box(fr, a - 0.035, a + 0.035, j0, j1, dl0, dl1, mat, skip=("top", "bottom"))
            continue
        frame_box(fr, a, a + lw, j0, j1, dl0, dl1, mat, skip=("left",) if k > 0 else ())
        frame_box(fr, b - lw, b, j0, j1, dl0, dl1, mat, skip=("right",) if k < leaves - 1 else ())
        frame_box(fr, a + lw, b - lw, j1 - lw, j1, dl0, dl1, mat, skip=("left", "right"))
        frame_box(fr, a + lw, b - lw, j0, j0 + lw * 1.6, dl0, dl1, mat, skip=("left", "right"))
        ga, gb, gc, gd = a + lw, b - lw, j0 + lw * 1.6, j1 - lw
        # the glazing bars (5 mm behind the leaf's front): horizontal across, one vertical when the leaf is wide
        for r in range(1, nrows):
            hm = gc + (gd - gc) * r / nrows
            frame_box(fr, ga, gb, hm - 0.013, hm + 0.013, dl0 + 0.008, dl1 - 0.005, mat, C_BAR, skip=("left", "right"))
        if gb - ga > 0.42:
            xm = (ga + gb) / 2
            for r in range(nrows):
                h0_ = gc + (gd - gc) * r / nrows + (0.013 if r > 0 else 0.0); h1_ = gc + (gd - gc) * (r + 1) / nrows - (0.013 if r < nrows - 1 else 0.0)
                frame_box(fr, xm - 0.013, xm + 0.013, h0_, h1_, dl0 + 0.010, dl1 - 0.007, mat, C_BAR, skip=("top", "bottom"))
        pane(fr, ga, gb, gc, gd, dl0 + 0.018)
    if far:
        pane(fr, i0, i1, j0, j1, dl0 + 0.02)

def head_light(fr, o, d_front, fw=0.065, mat=GLASS, frame_mat=FRAMEW):
    """the arched head above the springing: an arched frame on a transom bar, glass as strips from the transom line"""
    n = NARC()
    df0, df1 = d_front - 0.065, d_front
    K.B.new_group()
    cs, ch, R, a0 = arc_geom(o)
    ro = arc_pts(o, n, -0.01)
    t0 = max(a0, math.asin(min(1.0, max(-1.0, (o.spring + 0.02 - ch) / (R - fw)))))
    ri = [(cs + (R - fw) * math.cos(t0 + (math.pi - 2 * t0) * k / n), ch + (R - fw) * math.sin(t0 + (math.pi - 2 * t0) * k / n)) for k in range(n + 1)]
    for k in range(n):
        (sa, ha), (sb, hb_) = ro[k], ro[k + 1]; (ia, ja), (ib, jb) = ri[k], ri[k + 1]
        face_dir([fr.p(sa, ha, df1), fr.p(sb, hb_, df1), fr.p(ib, jb, df1), fr.p(ia, ja, df1)], fr.N, frame_mat, C_FRAME)
        face_dir([fr.p(ia, ja, df0), fr.p(ib, jb, df0), fr.p(ib, jb, df1), fr.p(ia, ja, df1)], fr.p(cs, ch, 0) - fr.p((ia + ib) / 2, (ja + jb) / 2, 0), frame_mat, C_FRAME)
    frame_box(fr, o.s0 - 0.01, o.s1 + 0.01, o.spring - 0.035, o.spring + 0.02, df0 + 0.004, df1 - 0.006, frame_mat)
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
    if not K.FAR and mat == GLASS:
        # radiating glazing bars of the fanlight (3)
        for k in (0.25, 0.5, 0.75):
            ang = math.pi * k
            x0, y0 = cs + 0.09 * math.cos(ang), base + 0.09 * math.sin(ang)
            x1, y1 = cs + (R - fw) * math.cos(ang) * 0.98, ch + (R - fw) * math.sin(ang) * 0.98
            dv = Vector((x1 - x0, y1 - y0)); L = dv.length
            if L < 0.1 or y1 <= base: continue
            t = dv / L; nrm = Vector((-t.y, t.x)) * 0.013
            q = [(x0 - nrm.x, y0 - nrm.y), (x1 - nrm.x, y1 - nrm.y), (x1 + nrm.x, y1 + nrm.y), (x0 + nrm.x, y0 + nrm.y)]
            face_dir([fr.p(x, y, gl + 0.012) for x, y in q], fr.N, frame_mat, C_BAR)

def door(fr, o, d_front, far, mat=FRAMEW):
    """a two-leaf panelled door up to the springing (or 40 cm under a flat head: a transom light), its head glazed"""
    top = o.spring if o.spring else o.h1
    tb = top - (0.0 if o.spring else 0.45)
    K.B.new_group()
    jt = top - 0.035 if o.spring else top + 0.01
    frame_box(fr, o.s0 - 0.01, o.s0 + 0.07, o.h0, jt, d_front - 0.07, d_front, mat)
    frame_box(fr, o.s1 - 0.07, o.s1 + 0.01, o.h0, jt, d_front - 0.07, d_front, mat)
    a, b = o.s0 + 0.07, o.s1 - 0.07
    fbox(fr, a, b, o.h0, tb - (0.035 if o.spring else 0.0), d_front - 0.08, d_front - 0.035, mat, C_FRAME, skip=("left", "right"))
    if not o.spring:
        frame_box(fr, o.s0 + 0.07, o.s1 - 0.07, tb, tb + 0.07, d_front - 0.07, d_front, mat, skip=("left", "right"))
        frame_box(fr, o.s0 + 0.07, o.s1 - 0.07, top - 0.06, top + 0.01, d_front - 0.07, d_front, mat, skip=("left", "right"))
        pane(fr, a, b, tb + 0.07, top - 0.06, d_front - 0.05)
        if not far:
            nb = max(1, int(round((b - a) / 0.30)))
            for k in range(1, nb):
                x = a + (b - a) * k / nb
                frame_box(fr, x - 0.014, x + 0.014, tb + 0.07, top - 0.06, d_front - 0.055, d_front - 0.02, mat, C_BAR, skip=("top", "bottom"))
    if not far:
        mid = (a + b) / 2
        two = (b - a) > 1.0
        cols = [(a + 0.08, mid - 0.05), (mid + 0.05, b - 0.08)] if two else [(a + 0.09, b - 0.09)]
        H = tb - o.h0
        bands = ((o.h0 + 0.15, o.h0 + 0.15 + H * 0.28), (o.h0 + 0.30 + H * 0.28, tb - 0.15))
        for c0, c1 in cols:
            for h0_, h1_ in bands:
                if h1_ - h0_ > 0.12: fbox(fr, c0, c1, h0_, h1_, d_front - 0.05, d_front - 0.022, mat, C_FRAME, skip=("back",))
        if two: fbox(fr, mid - 0.014, mid + 0.014, o.h0 + 0.02, tb - 0.02, d_front - 0.05, d_front - 0.02, mat, C_BAR, skip=("back",))
    if o.spring: head_light(fr, o, d_front, frame_mat=mat)

REV = 0.26
def opening_parts(fr, o, far, wall=RENDER, sill_mat=BLUE):
    """reveals (the wall's material), head soffit, joinery by kind, the sill / threshold, the surround"""
    rev = REV if not far else 0.22
    K.B.new_group()
    top_side = o.spring if o.spring else o.h1
    for s, sg in ((o.s0, 1), (o.s1, -1)):
        face_dir([fr.p(s, o.h0, 0), fr.p(s, top_side, 0), fr.p(s, top_side, -rev - 0.03), fr.p(s, o.h0, -rev - 0.03)], fr.U * sg, wall, C_REVEAL,
                 [(0, hz(o.h0)), (0, hz(top_side)), (rev, hz(top_side)), (rev, hz(o.h0))])
    if o.spring:
        pts = arc_pts(o, NARC()); cs, ch, R, a0 = arc_geom(o)
        for k in range(len(pts) - 1):
            (sa, ha), (sb, hb_) = pts[k], pts[k + 1]
            face_dir([fr.p(sa, ha, 0), fr.p(sb, hb_, 0), fr.p(sb, hb_, -rev - 0.03), fr.p(sa, ha, -rev - 0.03)],
                     fr.p(cs, ch, 0) - fr.p((sa + sb) / 2, (ha + hb_) / 2, 0), wall, C_REVEAL)
    else:
        face_dir([fr.p(o.s0, o.h1, 0), fr.p(o.s1, o.h1, 0), fr.p(o.s1, o.h1, -rev - 0.03), fr.p(o.s0, o.h1, -rev - 0.03)], -Z, wall, C_REVEAL)
    dfr = -rev + 0.07
    if o.kind in ("win", "french"):
        casement(fr, o.s0, o.s1, o.h0, top_side, dfr, transom=o.transom, rows=o.rows, far=far, head=bool(o.spring))
        if o.spring: head_light(fr, o, dfr)
    elif o.kind == "small":
        casement(fr, o.s0, o.s1, o.h0, top_side, dfr, leaves=1, rows=o.rows, far=far, head=bool(o.spring))
        if o.spring: head_light(fr, o, dfr)
    elif o.kind == "door":
        door(fr, o, dfr, far)
    elif o.kind == "carriage":
        door(fr, o, dfr, far, mat=FRAMED)
    # the floor of a french window / door = a threshold; a window = its sill
    if o.kind in ("win", "small") and o.sill:
        sa, sb = o.s0 - 0.06, o.s1 + 0.06
        fbox(fr, sa, sb, o.h0 - 0.08, o.h0 + 0.003, -rev - 0.02, 0.06, sill_mat, C_SILL, skip=("back",))
    elif o.kind in ("french", "door", "carriage"):
        fbox(fr, o.s0 - 0.03, o.s1 + 0.03, o.h0 - 0.12, o.h0 + 0.004, -rev - 0.02, 0.05, sill_mat, C_SILL, skip=("back",))
    if o.surround == "flat" and not far:
        # a painted flat band round the opening (the house's: 12 cm, 1.5 cm proud), the sill's ends under it
        bw, pr = 0.12, 0.015
        lo = o.h0 - (0.02 if o.kind in ("win", "small") else 0.06)
        hi = (o.h1 if not o.spring else o.spring)
        fbox(fr, o.s0 - bw, o.s0, lo, hi + bw, 0.0, pr, wall, C_SURROUND, skip=("back",))
        fbox(fr, o.s1, o.s1 + bw, lo, hi + bw, 0.0, pr, wall, C_SURROUND, skip=("back",))
        if not o.spring: fbox(fr, o.s0 + 0.004, o.s1 - 0.004, o.h1, o.h1 + bw, 0.0, pr, wall, C_SURROUND, skip=("back", "left", "right"))
    elif o.surround == "stone":
        stone_surround(fr, o, far)

def stone_surround(fr, o, far, pr=0.025, ch=0.012):
    """the tower's white stone frames (the 1972 photo): jambs of alternating long / short blocks bonded into the brick,
    a lintel (or for an arch: voussoirs + keystone), the sill on its own"""
    hi = o.spring if o.spring else o.h1
    n = max(2, int(round((hi - o.h0) / 0.30)))
    dh = (hi - o.h0) / n
    for k in range(n):
        h0, h1 = o.h0 + k * dh + 0.006, o.h0 + (k + 1) * dh - 0.006
        wlen = 0.21 if k % 2 == 0 else 0.12
        if far:
            fbox(fr, o.s0 - wlen, o.s0 - 0.004, h0, h1, -0.01, pr, STONE, C_BLOCK, skip=("back",))
            fbox(fr, o.s1 + 0.004, o.s1 + wlen, h0, h1, -0.01, pr, STONE, C_BLOCK, skip=("back",))
        else:
            KT.cblock(fr, o.s0 - wlen, o.s0 - 0.004, h0, h1, -0.01, pr, ch, STONE, C_BLOCK, chamfer_sides="ltb")
            KT.cblock(fr, o.s1 + 0.004, o.s1 + wlen, h0, h1, -0.01, pr, ch, STONE, C_BLOCK, chamfer_sides="rtb")
    if not o.spring:
        lt = 0.20
        if far: fbox(fr, o.s0 - 0.18, o.s1 + 0.18, o.h1 + 0.006, o.h1 + lt, -0.01, pr, STONE, C_BLOCK, skip=("back",))
        else: KT.cblock(fr, o.s0 - 0.18, o.s1 + 0.18, o.h1 + 0.006, o.h1 + lt, -0.01, pr + 0.01, ch, STONE, C_KEY)
    else:
        # voussoirs: 9 wedge blocks round the arch, the keystone proud
        cs, ch_, R, a0 = arc_geom(o)
        nv = 9 if not far else 5
        r0, r1 = R + 0.004, R + 0.27
        for k in range(nv):
            t0 = a0 + (math.pi - 2 * a0) * k / nv + 0.004; t1 = a0 + (math.pi - 2 * a0) * (k + 1) / nv - 0.004
            key = k == nv // 2
            rr = r1 + (0.06 if key else 0.0); dd = pr + (0.015 if key else 0.0)
            pts = [(cs + r0 * math.cos(t), ch_ + r0 * math.sin(t)) for t in (t0, t1)] + [(cs + rr * math.cos(t), ch_ + rr * math.sin(t)) for t in (t1, t0)]
            face_dir([fr.p(x, y, dd) for x, y in pts], fr.N, STONE, C_KEY if key else C_BLOCK, [(x, hz(y)) for x, y in pts])
            for i in range(4):
                (xa, ya), (xb, yb) = pts[i], pts[(i + 1) % 4]
                out = fr.U * (yb - ya) - Z * (xb - xa)
                face_dir([fr.p(xa, ya, -0.01), fr.p(xb, yb, -0.01), fr.p(xb, yb, dd), fr.p(xa, ya, dd)], out, STONE, C_BLOCK)

# ------------------------------------------------------------------------------------------------ bands, plinths
def ends(s0, s1, pr, e0, e1):
    """an attachment's run: 'out' = past an external corner by its projection, 'in' = short of it by the other wall's
    projection, 'cut' = 4 mm short of a flush end"""
    d = {"out": -pr, "in": pr + 0.021, "cut": 0.004, None: 0.0}
    return s0 + d[e0], s1 - d[e1]

def band(fr, s0, s1, h0, h1, proud, mat=RENDER, code=C_BAND, skip=("back",), e0="cut", e1="cut"):
    a, b = ends(s0, s1, proud, e0, e1)
    fbox(fr, a, b, h0, h1, -0.02, proud, mat, code, skip=skip)

def plinth(fr, s0, s1, hb, ht, e0="out", e1="out", pr=0.03, mat=BLUE):
    """the blue stone plinth at the wall's foot (from under the ground), a chamfered top edge"""
    a, b = ends(s0, s1, pr, e0, e1)
    fbox(fr, a, b, hb, ht - (0.0 if K.FAR else 0.03), -0.02, pr, mat, C_PLINTH, skip=("back",))
    if not K.FAR:
        face_dir([fr.p(a, ht - 0.03, pr), fr.p(b, ht - 0.03, pr), fr.p(b, ht, 0.0), fr.p(a, ht, 0.0)], fr.N + Z, mat, C_PLINTH)
        for s_, sg in ((a, -1), (b, 1)):
            if (sg < 0 and e0 == "out") or (sg > 0 and e1 == "out"): continue
            face_dir([fr.p(s_, ht - 0.03, -0.02), fr.p(s_, ht, -0.02), fr.p(s_, ht, 0.0), fr.p(s_, ht - 0.03, pr)], fr.U * sg, mat, C_PLINTH)
    else:
        pass                             # (far: the box above runs up to the top)

def anchor(fr, s, h, size=0.34, vertical=False):
    """a wrought-iron wall anchor (the inventory's 'gevelankers'): the house's a bar with a cross bar; the tower's
    (vertical=True, the 1972 photo) a long vertical rod with a small plate at its middle"""
    if K.FAR: return
    if vertical:
        fbox(fr, s - 0.016, s + 0.016, h - 0.30, h + 0.30, -0.01, 0.022, IRON, C_KEY, skip=("back",))
        fbox(fr, s - 0.035, s + 0.035, h - 0.035, h + 0.035, -0.01, 0.016, IRON, C_KEY, skip=("back",))
        return
    fbox(fr, s - 0.018, s + 0.018, h - size / 2, h + size / 2, -0.01, 0.022, IRON, C_KEY, skip=("back",))
    fbox(fr, s - 0.10, s + 0.10, h - 0.02, h + 0.02, -0.01, 0.018, IRON, C_KEY, skip=("back",))

def putlogs(fr, L, top):
    """the small square holes in stone frames just under the tower's cornice (the 1972 photo: three per face)"""
    if K.FAR: return
    for c in (L / 2 - 1.95, L / 2, L / 2 + 1.95):
        h0, h1 = top - 0.36, top - 0.08
        fbox(fr, c - 0.15, c - 0.055, h0, h1, -0.01, 0.022, STONE, C_BLOCK, skip=("back",))
        fbox(fr, c + 0.055, c + 0.15, h0, h1, -0.01, 0.022, STONE, C_BLOCK, skip=("back",))
        fbox(fr, c - 0.051, c + 0.051, h0, h0 + 0.09, -0.01, 0.022, STONE, C_BLOCK, skip=("back", "left", "right"))
        fbox(fr, c - 0.051, c + 0.051, h1 - 0.085, h1, -0.01, 0.022, STONE, C_BLOCK, skip=("back", "left", "right"))
        face_dir([fr.p(c - 0.051, h0 + 0.09, -0.006), fr.p(c + 0.051, h0 + 0.09, -0.006), fr.p(c + 0.051, h1 - 0.085, -0.006), fr.p(c - 0.051, h1 - 0.085, -0.006)], fr.N, IRON, C_REVEAL)

# ------------------------------------------------------------------------------------------------ roofs
def prof_h(profile, d):
    """the roof surface's height at an outward offset d (profile [(d, h)] going inward)"""
    for (da, ha), (db, hb) in zip(profile[:-1], profile[1:]):
        if db <= d <= da: return ha + (hb - ha) * (da - d) / max(1e-9, da - db)
    return profile[0][1] if d > profile[0][0] else profile[-1][1]

def rect_poly(r, w1=None, w0=None, u0=None, u1=None):
    a = r["u0"] if u0 is None else u0; b = r["u1"] if u1 is None else u1
    c = r["w0"] if w0 is None else w0; d = r["w1"] if w1 is None else w1
    return [(a, c), (b, c), (b, d), (a, d)]

def roof_sweep(poly, profile, mat, code=C_PLAIN, smooth=(), cap=True, cap_mat=None):
    """a hipped roof (or a bell) as the profile [(d, h)] swept round the plan polygon (d = outward offset of each ring):
    one planar quad per edge per step (mitred: the hips); UV0 = TRUE metres on each plane (along its eave, up its slope:
    slates / zinc undistorted on the hips, unlike the kit's sweep); a flat cap on the last ring. Returns the rings."""
    rings = [offset_poly(poly, d) for d, _ in profile]
    n = len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n))
    sgn = 1.0 if area > 0 else -1.0
    pacc = [0.0]
    for i in range(1, len(profile)):
        pacc.append(pacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    K.B.new_group()
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        L = math.hypot(x2 - x1, y2 - y1); tx, ty = (x2 - x1) / L, (y2 - y1) / L
        on_u, on_w = ty * sgn, -tx * sgn
        out3 = Vector((on_u, -on_w, 0))
        for k in range(len(profile) - 1):
            sv = K.B.smooth; K.B.smooth = k in smooth
            a0, b0 = rings[k][i], rings[k][(i + 1) % n]; a1, b1 = rings[k + 1][i], rings[k + 1][(i + 1) % n]
            h0, h1 = profile[k][1], profile[k + 1][1]
            uvf = lambda p, v: ((p[0] - x1) * tx + (p[1] - y1) * ty, v)
            pts = [P(a0[0], a0[1], h0), P(b0[0], b0[1], h0), P(b1[0], b1[1], h1), P(a1[0], a1[1], h1)]
            uv = [uvf(a0, pacc[k]), uvf(b0, pacc[k]), uvf(b1, pacc[k + 1]), uvf(a1, pacc[k + 1])]
            dd, dh = profile[k + 1][0] - profile[k][0], profile[k + 1][1] - profile[k][1]
            want = out3 * dh - Z * dd
            if want.length < 1e-9: want = out3
            if (pts[2] - pts[3]).length < 1e-4:
                face_dir(pts[:3], want, mat, code, uv[:3])
            else:
                face_dir(pts, want, mat, code, uv)
            K.B.smooth = sv
    if cap:
        top = rings[-1]; h = profile[-1][1]
        face_dir([P(x, y, h) for x, y in top], Z, cap_mat if cap_mat is not None else mat, code, [(x, y) for x, y in top])
    return rings

def eaves_soffit(poly, ovh, h_edge, mat, depth=0.14):
    """the eave's fascia and soffit round a plan polygon: a horizontal soffit from the wall to the eave line, the fascia
    up to the roof's edge (h_edge)"""
    sweep_closed(poly, [(-0.03, h_edge - depth), (ovh, h_edge - depth), (ovh, h_edge)], mat, C_CORNICE)

def roll_line(pts, r=0.038, segs=16):
    """zinc rolls along a polyline (Blender points): a flat 16-sided pipe per segment (the Wolvendael's: smooth rolls
    streak), each ending inside the knob at its joints and ends; far: a tent of two strips dipping into the roof"""
    if K.FAR: return                     # (a 4 cm roll is sub-pixel past the LOD0 band)
    tube(pts, r, segs)
    for p in (pts[0], pts[-1]): knob(p, r * 1.35, ZINC, C_RIDGE)

def tube(pts, r, segs, mat=ZINC, code=C_RIDGE):
    """a continuous flat-faceted tube along a polyline: one ring per point in the plane bisecting the bend (parallel-
    transported frame: no twist), quads between rings; open ends (they end inside the knobs)"""
    pts = [p for i, p in enumerate(pts) if i == 0 or (p - pts[i - 1]).length > 1e-4]
    if len(pts) < 2: return
    n = len(pts)
    tans = []
    for i in range(n):
        a = (pts[i] - pts[i - 1]).normalized() if i > 0 else None
        b = (pts[i + 1] - pts[i]).normalized() if i < n - 1 else None
        t = (a + b) if (a is not None and b is not None) else (a if a is not None else b)
        tans.append(t.normalized())
    ref = Vector((0, 0, 1)) if abs(tans[0].z) < 0.9 else Vector((1, 0, 0))
    X = tans[0].cross(ref).normalized()
    rings = []
    for i in range(n):
        if i > 0:
            X = (X - tans[i] * X.dot(tans[i])).normalized()          # parallel transport
        Y = tans[i].cross(X).normalized()
        # the mitre: a ring in the bisecting plane is wider across the bend by 1 / cos(half the bend)
        sc = 1.0
        if 0 < i < n - 1:
            d0 = (pts[i] - pts[i - 1]).normalized(); c = max(0.5, d0.dot(tans[i])); sc = 1.0 / c
        rings.append([pts[i] + (X * math.cos(2 * math.pi * k / segs) + Y * math.sin(2 * math.pi * k / segs)) * r * (sc if abs(math.cos(2 * math.pi * k / segs)) > 0 else 1.0) for k in range(segs)])
    K.B.new_group()
    for i in range(n - 1):
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]
            ctr = (a + b + c + d) / 4
            axis_p = (pts[i] + pts[i + 1]) / 2
            face_dir([a, b, c, d], ctr - axis_p, mat, code)

def hip_rolls(rings, profile, lift=0.015, ridge=True):
    """rolls up every hip (the rings' corners) and along the ridge (the last ring's long edges)"""
    n = len(rings[0])
    up = lambda x, y, h: P(x, y, h + lift)
    step = max(1, len(rings) // 14)
    ks = list(range(0, len(rings) - 1, step)) + [len(rings) - 1]
    for i in range(n):
        roll_line([up(rings[k][i][0], rings[k][i][1], profile[k][1]) for k in ks])
    if ridge:
        top = rings[-1]; h = profile[-1][1]
        # the ridge: the longest edge's midline of the thin last ring
        e = max(range(n), key=lambda i: math.hypot(top[(i + 1) % n][0] - top[i][0], top[(i + 1) % n][1] - top[i][1]))
        a, b = top[e], top[(e + 1) % n]; c, d = top[(e + 2) % n], top[(e + 3) % n]
        m0 = ((a[0] + d[0]) / 2, (a[1] + d[1]) / 2); m1 = ((b[0] + c[0]) / 2, (b[1] + c[1]) / 2)
        roll_line([up(m0[0], m0[1], h), up(m1[0], m1[1], h)])

def hip_part(r, pitch, h_wall, ovh=OVH, cover=SLATE, soffit=RENDER, extend=None, clip=None):
    """a simple hipped roof on rectangle r: eave at ovh out (its edge 4 cm under the wall top + slope), ridge along the
    long axis; `extend`: {'w0'|'w1'|'u0'|'u1': metres} the plan pushed INTO a neighbour (the hip end hidden there)"""
    poly = rect_poly(r)
    ext = extend or {}
    poly = rect_poly(r, u0=r["u0"] - ext.get("u0", 0.0), u1=r["u1"] + ext.get("u1", 0.0), w0=r["w0"] - ext.get("w0", 0.0), w1=r["w1"] + ext.get("w1", 0.0))
    half = min(poly[1][0] - poly[0][0], poly[2][1] - poly[1][1]) / 2
    tg = math.tan(math.radians(pitch))
    he = h_wall + 0.05 - ovh * tg
    prof = [(ovh, he), (-(half - 0.01), h_wall + 0.05 + (half - 0.01) * tg)]
    start = len(K.B.f)
    rings = roof_sweep(poly, prof, cover)
    eaves_soffit(poly, ovh, he, soffit)
    hip_rolls(rings, prof)
    if clip: clip_faces(start, *clip)
    return prof, poly

def roof_height(profile, poly, u, w):
    """a hipped roof's surface height over the plan point (u, w): the profile at the distance in from the nearest edge"""
    d_in = min(u - poly[0][0], poly[1][0] - u, w - poly[0][1], poly[2][1] - w)
    return prof_h(profile, -d_in)

def clip_faces(start, axis, keep_ge, value):
    """clip every face built since `start` against the plane axis ('u' | 'w') = value, keeping the side >= value
    (keep_ge) or <= value: a roof whose plan was pushed into a neighbour ends AT that neighbour's wall (its cut edge 3 cm
    inside it), instead of an overhang sticking out past a flush wall. UVs are interpolated."""
    B = K.B
    def coord(p): return p.x if axis == "u" else -p.y
    def inside(p): return (coord(p) >= value) if keep_ge else (coord(p) <= value)
    lists = [B.f, B.m, B.c, B.uv, B.g, B.sm, B.rw]
    keep = [l[:start] for l in lists]
    for i in range(start, len(B.f)):
        pts = [B.v[j] for j in B.f[i]]; uv = B.uv[i]
        if all(inside(p) for p in pts):
            for l, k in zip(lists, keep): k.append(l[i])
            continue
        if not any(inside(p) for p in pts): continue
        out, ouv = [], []
        n = len(pts)
        for k in range(n):
            a, b = pts[k], pts[(k + 1) % n]
            ia, ib = inside(a), inside(b)
            if ia: out.append(a); ouv.append(uv[k] if uv else None)
            if ia != ib:
                t = (value - coord(a)) / (coord(b) - coord(a))
                out.append(a + (b - a) * t)
                ouv.append((uv[k][0] + (uv[(k + 1) % n][0] - uv[k][0]) * t, uv[k][1] + (uv[(k + 1) % n][1] - uv[k][1]) * t) if uv else None)
        # drop near-duplicate points
        o2, u2 = [], []
        for p, q in zip(out, ouv):
            if not o2 or (p - o2[-1]).length > 1e-5: o2.append(p); u2.append(q)
        if len(o2) > 2 and (o2[0] - o2[-1]).length < 1e-5: o2.pop(); u2.pop()
        if len(o2) < 3: continue
        i0 = len(B.v); B.v.extend(o2)
        keep[0].append(tuple(range(i0, i0 + len(o2)))); keep[1].append(B.m[i]); keep[2].append(B.c[i])
        keep[3].append(u2 if uv else None); keep[4].append(B.g[i]); keep[5].append(B.sm[i]); keep[6].append(B.rw[i])
    B.f, B.m, B.c, B.uv, B.g, B.sm, B.rw = keep

def gutter_line(a, b, h, out_dir, r=0.07):
    """a half-round zinc gutter along a straight eave from (u, w) a to b, hung `out_dir` (unit (u, w)) of the edge"""
    if K.FAR: return
    ox, ow = out_dir
    A = P(a[0] + ox * (r + 0.01), a[1] + ow * (r + 0.01), h - 0.05); Bp = P(b[0] + ox * (r + 0.01), b[1] + ow * (r + 0.01), h - 0.05)
    lathe(A, [(r, 0.0), (r, (Bp - A).length)], 8, ZINC, C_RIDGE, axis=(Bp - A), ref=Vector((0, 0, -1)), a0=-math.pi / 2, a1=math.pi / 2, smooth=False)
    ax = (Bp - A).normalized(); X = Vector((0, 0, -1)); Y = ax.cross(X).normalized()
    for c, sg in ((A, -1), (Bp, 1)):
        pts = [c + (X * math.cos(t) + Y * math.sin(t)) * r for t in np.linspace(-math.pi / 2, math.pi / 2, 9)]
        for k in range(4):
            q = [pts[k], pts[k + 1], pts[7 - k], pts[8 - k]]
            if k == 3: q = [pts[3], pts[4], pts[5]]
            face_dir(q, ax * sg, ZINC, C_RIDGE)

def downpipe(u, w, h_top, h_bot, out_dir):
    if K.FAR: return
    ox, ow = out_dir
    pipe(P(u + ox * 0.10, w + ow * 0.10, h_bot), P(u + ox * 0.10, w + ow * 0.10, h_top), 0.045, 16, ZINC, C_RIDGE, smooth=False)
    for h in np.arange(h_bot + 0.6, h_top - 0.3, 1.8):
        lathe(P(u + ox * 0.10, w + ow * 0.10, h), [(0.058, 0.0), (0.058, 0.05)], 16, ZINC, C_RIDGE, cap_top=True, cap_bottom=True, smooth=False)

# ------------------------------------------------------------------------------------------------ chimneys, dormers
def chimney(u, w, top, base, su=0.75, sw=0.55):
    """a brick stack (the Bing / aerial views: red brick) with a stone cap and its flue"""
    K.B.new_group()
    KT.hbox(u - su / 2, u + su / 2, w - sw / 2, w + sw / 2, base, top - 0.30, BRICK, C_PLAIN, skip=("bottom",))
    KT.hbox(u - su / 2 - 0.06, u + su / 2 + 0.06, w - sw / 2 - 0.06, w + sw / 2 + 0.06, top - 0.30, top - 0.14, STONE, C_CORNICE, skip=())
    KT.hbox(u - su / 2 + 0.02, u + su / 2 - 0.02, w - sw / 2 + 0.02, w + sw / 2 - 0.02, top - 0.14, top, BRICK, C_CORNICE, skip=("top",) if not K.FAR else ())
    if not K.FAR:
        fi = 0.11
        u0, u1, w0, w1 = u - su / 2 + 0.02, u + su / 2 - 0.02, w - sw / 2 + 0.02, w + sw / 2 - 0.02
        a0, a1, b0, b1 = u0 + fi, u1 - fi, w0 + fi, w1 - fi
        for q in ([(u0, w0), (u1, w0), (a1, b0), (a0, b0)], [(u1, w0), (u1, w1), (a1, b1), (a1, b0)], [(u1, w1), (u0, w1), (a0, b1), (a1, b1)],
                  [(u0, w1), (u0, w0), (a0, b0), (a0, b1)]):
            face_dir([P(x, y, top) for x, y in q], Z, BRICK, C_CORNICE)
        for (x0, y0, x1, y1, nn) in ((a0, b0, a1, b0, Vector((0, -1, 0))), (a1, b0, a1, b1, Vector((-1, 0, 0))), (a1, b1, a0, b1, Vector((0, 1, 0))), (a0, b1, a0, b0, Vector((1, 0, 0)))):
            face_dir([P(x0, y0, top), P(x1, y1, top), P(x1, y1, top - 0.35), P(x0, y0, top - 0.35)], nn, IRON, C_REVEAL)
        face_dir([P(a0, b0, top - 0.35), P(a1, b0, top - 0.35), P(a1, b1, top - 0.35), P(a0, b1, top - 0.35)], Z, IRON, C_REVEAL)
        # two clay-coloured pots are not in the references: none

def solve_w(fn, target, wa, wb):
    """the w in [wa, wb] where fn(w) = target (bisection; fn monotonic)"""
    fa = fn(wa) - target
    for _ in range(50):
        m = (wa + wb) / 2; fm = fn(m) - target
        if (fm > 0) == (fa > 0): wa, fa = m, fm
        else: wb = m
    return (wa + wb) / 2

def dormer(face, uc, wf, W, hs, he, ha, roofh, far, front_mat=RENDER):
    """a gabled roof dormer facing +w (face = +1) or -w (-1) at u = uc, its front plane at w = wf: a white front with a
    casement (sill hs, head he - 0.14), slate cheeks down to the roof, a slate gable roof (eave he, apex ha) running back
    until it meets the main roof; roofh(w) = the main roof's height along the dormer's axis."""
    sgn = face
    # front frame: faces sgn * w
    if sgn > 0: fr, _ = Frame.of(uc - W / 2, wf, uc + W / 2, wf); s = lambda u: u - (uc - W / 2)
    else: fr, _ = Frame.of(uc + W / 2, wf, uc - W / 2, wf); s = lambda u: (uc + W / 2) - u
    hb = roofh(wf) - 0.10
    def top(sv):
        u = (uc - W / 2) + sv if sgn > 0 else (uc + W / 2) - sv
        return he + (ha - he) * (1 - abs(u - uc) / (W / 2))
    win = op(s, uc, W - 0.36, hs, he - 0.16, "small" if W < 1.0 else "win", surround=None, rows=2)
    K.B.new_group()
    wall_grid(fr, 0.0, W, hb, ha, [win], front_mat, top_line=top, extra_s=(W / 2,), extra_h=(he,))
    opening_parts(fr, win, far, wall=front_mat, sill_mat=ZINC)
    # cheeks (slate-hung): from the front back to where the roof reaches the eave line
    wback = solve_w(roofh, he + 0.02, wf, wf - sgn * 6.0)
    for uu, nu in ((uc - W / 2, -1), (uc + W / 2, 1)):
        tri = [P(uu, wf, hb), P(uu, wf, he), P(uu, wback, he)]
        face_dir(tri, Vector((nu, 0, 0)), SLATE, C_HUNG, [(0, hz(hb)), (0, hz(he)), (abs(wback - wf), hz(he))])
    # the gable roof: two slabs from 12 cm before the front back to the main roof (apex + 5 cm)
    wr = solve_w(roofh, ha + 0.05, wf, wf - sgn * 6.0)
    ov = 0.12; wfo = wf + sgn * ov
    tg = (ha - he) / (W / 2); ue = W / 2 + ov
    hee = ha - ue * tg
    K.B.new_group()
    for side in (-1, 1):
        a, b = P(uc, wfo, ha + 0.02), P(uc, wr, ha + 0.02)
        c, d = P(uc + side * ue, wr, hee + 0.02), P(uc + side * ue, wfo, hee + 0.02)
        nrm = (b - a).cross(d - a)
        if nrm.z < 0: nrm = -nrm
        face_dir([a, b, c, d], nrm, SLATE, C_PLAIN, [(0, 0), (abs(wr - wfo), 0), (abs(wr - wfo), ue / math.cos(math.atan(tg))), (0, ue / math.cos(math.atan(tg)))])
        dn = Vector((0, 0, -0.07))
        face_dir([a + dn, b + dn, c + dn, d + dn], -nrm, front_mat, C_CORNICE)
        face_dir([d, a, a + dn, d + dn], Vector((0, -sgn, 0)), front_mat, C_CORNICE)
        face_dir([c, d, d + dn, c + dn], Vector((side, 0, 0)), front_mat, C_CORNICE)
    roll_line([P(uc, wfo, ha + 0.045), P(uc, wr, ha + 0.045)], r=0.03)

# ------------------------------------------------------------------------------------------------ corner quoins
def chbox(u0, u1, w0, w1, h0, h1, ch, mat, code=C_BLOCK):
    """an axis-aligned box with every edge chamfered (ch): the quoin block (6 inset faces, 12 bevels, 8 corners)"""
    if K.FAR or ch <= 0:
        KT.hbox(u0, u1, w0, w1, h0, h1, mat, code); return
    xs = (u0, u1); ys = (w0, w1); zs = (h0, h1)
    c = Vector(((u0 + u1) / 2, -(w0 + w1) / 2, hz((h0 + h1) / 2)))
    def V(ix, iy, iz, ax):
        """the corner (ix, iy, iz) moved in by ch on every axis except `ax`"""
        x = xs[ix] + (0 if ax == 0 else (ch if ix == 0 else -ch))
        y = ys[iy] + (0 if ax == 1 else (ch if iy == 0 else -ch))
        z = zs[iz] + (0 if ax == 2 else (ch if iz == 0 else -ch))
        return P(x, y, z)
    for ax in range(3):
        for side in (0, 1):
            pts = []
            for a in (0, 1):
                for b in ((0, 1) if a == 0 else (1, 0)):
                    idx = [0, 0, 0]; idx[ax] = side
                    o = [i for i in range(3) if i != ax]; idx[o[0]] = a; idx[o[1]] = b
                    pts.append(V(*idx, ax))
            ctr = sum(pts, Vector()) / 4
            face_dir(pts, ctr - c, mat, code)
    # bevels: one per edge (between the two faces' inset edges)
    for ax in range(3):                      # edges parallel to axis ax
        o = [i for i in range(3) if i != ax]
        for a in (0, 1):
            for b in (0, 1):
                p = []
                for t in (0, 1):
                    i1 = [0, 0, 0]; i1[ax] = t; i1[o[0]] = a; i1[o[1]] = b
                    p.append((V(*i1, o[0]), V(*i1, o[1])))
                q = [p[0][0], p[1][0], p[1][1], p[0][1]]
                ctr = sum(q, Vector()) / 4
                face_dir(q, ctr - c, mat, code)
    for ix in (0, 1):
        for iy in (0, 1):
            for iz in (0, 1):
                tri = [V(ix, iy, iz, 0), V(ix, iy, iz, 1), V(ix, iy, iz, 2)]
                ctr = sum(tri, Vector()) / 3
                face_dir(tri, ctr - c, mat, code)

def quoins(uc, wc, du, dw, h0, h1, start=0, pr=0.025, course=0.30, long_=0.44, short_=0.27):
    """the white stone quoins up a corner (uc, wc) whose faces run toward du (+-1 along u) and dw (+-1 along w): each
    course one block wrapping the corner, long on one face and short on the other, alternating; 1 cm joints"""
    n = int((h1 - h0) / course)
    for k in range(n):
        a, b = h0 + k * course + 0.005, h0 + (k + 1) * course - 0.005
        lu, lw = (long_, short_) if (k + start) % 2 == 0 else (short_, long_)
        us = sorted((uc - du * pr, uc + du * lu)); ws = sorted((wc - dw * pr, wc + dw * lw))
        chbox(us[0], us[1], ws[0], ws[1], a, b, 0.012, STONE)

# ------------------------------------------------------------------------------------------------ the parts
def rect_walls(r, sides, far, base, top, wall=RENDER, plinth_top=None, sill_mat=BLUE, cornice=None):
    """the walls of a rectangular part: sides = {side: dict(ops=[(c, wd, h0, h1, kind, arch, kw)], holes=[...], hb=None,
    skip=False, anchors=[(c, h)])}; a blue stone plinth; `cornice`: a moulded profile swept along each wall (ends 'out')"""
    for side, spec in sides.items():
        if spec.get("skip"): continue
        fr, L, s = side_frame(r, side)
        hb = spec.get("hb", base)
        ops = [op(s, *o[:4], **(dict(kind=o[4], arch=o[5]) | (o[6] if len(o) > 6 else {}))) for o in spec.get("ops", [])]
        holes = [(min(s(a), s(b)), h0, max(s(a), s(b)), h1) for (a, b, h0, h1) in spec.get("holes", [])]
        wall_grid(fr, 0.0, L, hb, top, ops, wall, holes=holes, extra_h=spec.get("cuts", ()))
        for o in ops: opening_parts(fr, o, far, wall=wall, sill_mat=sill_mat)
        dflt = "out" if side in ("+w", "-w") else "in"          # (the w faces wrap the corners, the u faces stop short)
        if plinth_top is not None and spec.get("plinth", True):
            plinth(fr, 0.0, L, hb, plinth_top, e0=spec.get("e0", dflt), e1=spec.get("e1", dflt))
        for (c, h) in spec.get("anchors", []): anchor(fr, s(c), h)
        if cornice:
            K.B.new_group()
            a, b = ends(0.0, L, max(d for d, _ in cornice), spec.get("c0", "out"), spec.get("c1", "out"))
            KT.sweep_open(fr, a, b, cornice, STONE, C_CORNICE, smooth_steps=())

def house(far):
    r = HOUSE
    base = min(base_of(r["u0"], r["w0"] - 1, r["u1"], r["w0"] - 1), base_of(r["u0"] - 1, r["w0"], r["u0"] - 1, r["w1"]))
    pt = FLOOR + 0.05
    gf = (GF[0], GF[1]); ff = (FF[0], FF[1])
    tw = 1.02
    back_bays = [-9.80, -6.95, -4.10, -1.25, 1.60, 4.45, 7.30]          # ESTIMATED (no reference): 7 bays about the tower axis
    hid = lambda a, b, h1: (a, b, base, h1)
    sides = {
        # the courtyard front (Bing 2014 / the heritage aerial): two bays each side of the tower, a first-floor window over each annex
        "+w": dict(ops=[(c, tw, *gf, "win", None) for c in (-7.00, -5.18, 2.70, 4.52)] +
                       [(c, tw, *ff, "win", None) for c in (-7.00, -5.18, 2.70, 4.52)] +
                       [(c, tw, 54.95, FF[1], "win", None) for c in (-9.95, 7.30)],
                   holes=[hid(r["u0"], WA["u1"], 52.55), hid(TOWER["u0"] + 0.02, TOWER["u1"] - 0.02, r["top"]), hid(EA["u0"], EA["u1"], 52.55)],
                   anchors=[(c, 54.15) for c in (-8.35, -6.09, 3.61, 5.95)], e0="in"),
        # the garden front (north-west, the lawn): French windows almost to the floor (the heritage text), ESTIMATED bays
        "-w": dict(ops=[(c, 1.10, FLOOR + 0.05, gf[1], "french", None, dict(transom=0.45)) for c in back_bays] +
                       [(c, 1.10, *ff, "win", None) for c in back_bays],
                   anchors=[(c, 54.15) for c in (-8.375, -5.525, -2.675, 0.175, 3.025, 5.875)]),
        # the west end (the parterre; Bing: three bays, tall windows behind the ivy)
        "-u": dict(ops=[(c, 1.10, FLOOR + 0.05, gf[1], "french", None, dict(transom=0.45)) for c in (-7.25, -3.85, -0.45)] +
                       [(c, 1.10, *ff, "win", None) for c in (-7.25, -3.85, -0.45)]),
        # the east end (under the plane tree, ESTIMATED): the extension covers its ground floor north of w -2.2
        "+u": dict(ops=[(-0.40, tw, *gf, "win", None)] + [(c, tw, *ff, "win", None) for c in (-6.90, -3.85, -0.40)],
                   holes=[hid(NX["w0"], NX["w1"], 52.55)]),
    }
    cornice = [(-0.02, 57.78), (0.05, 57.78), (0.05, 57.86), (0.10, 57.91), (0.15, 57.98), (0.21, 58.03), (0.36, 58.06), (0.36, 58.12), (0.40, 58.15), (0.40, 58.18)]
    rect_walls(r, sides, far, base, r["top"], RENDER, plinth_top=pt, cornice=None)
    # the cornice: one sweep round the house (mitred corners); the roof's bell-cast eave rests on it
    sweep_closed(rect_poly(r), cornice, STONE, C_CORNICE, smooth_steps=())
    # modillion-free (the 1967 restoration: a plain moulded cornice)
    poly = rect_poly(r)
    rings = roof_sweep(poly, HOUSE_ROOF, SLATE)
    hip_rolls(rings, HOUSE_ROOF)
    LANDMARKS["house_ridge"] = round(HOUSE_ROOF[-1][1], 2)
    # gutters front / back, downpipes at the corners
    ge = HOUSE_ROOF[0][1]
    gutter_line((r["u0"] - 0.40, r["w1"] + 0.40), (TOWER["u0"] - 0.01, r["w1"] + 0.40), ge, (0, 1))
    gutter_line((TOWER["u1"] + 0.01, r["w1"] + 0.40), (r["u1"] + 0.40, r["w1"] + 0.40), ge, (0, 1))
    gutter_line((r["u0"] - 0.40, r["w0"] - 0.40), (r["u1"] + 0.40, r["w0"] - 0.40), ge, (0, -1))
    for (u, w, od) in ((r["u0"] + 0.25, r["w0"], (0, -1)), (r["u1"] - 0.25, r["w0"], (0, -1)), (TOWER["u0"] - 0.30, r["w1"], (0, 1)), (TOWER["u1"] + 0.30, r["w1"], (0, 1))):
        downpipe(u, w, ge - 0.10, base + 0.2, od)
    # chimneys (Bing 2014 + the aerial: red brick stacks behind the ridge, one on the west hip)
    for (u, w, t) in ((-9.30, -3.85, 65.90), (4.60, -5.20, 66.20), (7.40, -6.80, 65.60)):
        chimney(u, w, t, roof_height(HOUSE_ROOF, poly, u, w) - 0.40)
    # dormers: two on the courtyard slope (symmetric about the tower: Bing), two on the garden slope (ESTIMATED)
    for (uc, face) in ((-6.05, 1), (3.55, 1), (-6.05, -1), (3.55, -1)):
        wf = 0.55 if face > 0 else -8.25
        dormer(face, uc, wf, 1.05, 59.40, 60.55, 61.20, lambda w, uc=uc: roof_height(HOUSE_ROOF, poly, uc, w), far)

def tower(far):
    t = TOWER
    base = base_of(t["u0"], t["w1"] + 1, t["u1"], t["w1"] + 1)
    top = t["top"]
    # front (+w): the door (round-arched, stone voussoirs) and the four windows above it
    fr, L, s = side_frame(t, "+w")
    door_op = op(s, TU, 1.40, FLOOR, 52.95, "door", "round", surround="stone")
    ops = [door_op] + [op(s, TU, 1.04, a, b, "win", None, surround="stone") for (a, b) in T_LEVELS]
    banded_wall(fr, 0.0, L, base, top, ops)
    for o in ops: opening_parts(fr, o, far, wall=BRICK, sill_mat=STONE)
    plinth(fr, 0.0, L, base, FLOOR + 0.20, e0="out", e1="out", pr=0.035)
    for (a, b) in T_LEVELS:
        for c in (TU - 1.55, TU + 1.55): anchor(fr, s(c), (a + b) / 2 + 0.3, vertical=True)
    fr_front = fr
    putlogs(fr, L, top)
    # the sides: below the roof only the part in front of the house (w > 1.45); above it the whole depth
    roof_lo = 58.05
    for side in ("+u", "-u"):
        fr, L, s = side_frame(t, side)
        sa, sb = sorted((s(HOUSE["w1"] - 0.05), s(t["w1"])))
        banded_wall(fr, sa, sb, base, roof_lo, [])
        plinth(fr, sa, sb, base, FLOOR + 0.20, e0="cut" if side == "-u" else "in", e1="in" if side == "-u" else "cut", pr=0.035)
        win = op(s, TW, 0.72, T_LEVELS[3][0], T_LEVELS[3][1], "small", None, surround="stone")
        banded_wall(fr, 0.0, L, roof_lo, top, [win])
        opening_parts(fr, win, far, wall=BRICK, sill_mat=STONE)
        putlogs(fr, L, top)
    # the back: above the roof (63.6 at the tower's back)
    fr, L, s = side_frame(t, "-w")
    win = op(s, TU, 0.90, T_LEVELS[3][0], T_LEVELS[3][1], "win", None, surround="stone")
    banded_wall(fr, 0.0, L, 62.90, top, [win])
    opening_parts(fr, win, far, wall=BRICK, sill_mat=STONE)
    putlogs(fr, L, top)
    # quoins: the two front corners from the plinth up, the back corners above the roof
    for (uc, du) in ((t["u0"], 1), (t["u1"], -1)):
        quoins(uc, t["w1"], du, -1, FLOOR + 0.20, top - 0.02, start=0)
        quoins(uc, t["w0"], du, 1, 63.20, top - 0.02, start=1)
    # the cornice: frieze, bed mould, modillions, corona (stone)
    corn = [(-0.02, top - 0.02), (0.06, top - 0.02), (0.06, top + 0.10), (0.12, top + 0.16), (0.14, top + 0.24), (0.42, top + 0.27),
            (0.42, top + 0.43), (0.46, top + 0.47), (0.46, top + 0.50)]
    tpoly = rect_poly(t)
    sweep_closed(tpoly, corn, STONE, C_CORNICE)
    if not far:
        for side in ("+w", "-w", "+u", "-u"):
            fr, L, s = side_frame(t, side)
            nm = int((L + 0.2) / 0.36)
            for k in range(nm):
                c = -0.10 + (L + 0.2) * (k + 0.5) / nm
                fbox(fr, c - 0.055, c + 0.055, top + 0.16, top + 0.265, 0.10, 0.38, STONE, C_KEY, skip=("back", "top"))
    # THE BELL ROOF (slate): a flared eave, a convex bell (DSM: 69.4 at 0.5 m in, 70.2 at 1 m, 70.6 at 1.5 m), a flat top
    h0 = top + 0.50
    ctrl = [(0.46, h0), (0.24, h0 + 0.22), (0.02, h0 + 0.52), (-0.18, h0 + 0.94), (-0.38, h0 + 1.46), (-0.58, h0 + 1.94),
            (-0.82, h0 + 2.38), (-1.10, h0 + 2.74), (-1.42, h0 + 2.98), (-1.75, h0 + 3.10), (-1.95, h0 + 3.13)]
    bell = spline_profile(ctrl, 6 if far else 8)
    rings = roof_sweep(tpoly, bell, SLATE, smooth=tuple(range(1, len(bell) - 1)), cap_mat=ZINC)
    hip_rolls(rings, bell, lift=0.02, ridge=False)
    LANDMARKS["bell_top"] = round(bell[-1][1], 2)
    # four oval oeils-de-boeuf (the 1972 photo), one per face, on the bell's steep part
    for side in ("+w", "-w", "+u", "-u"):
        oeil(t, side, bell, far)
    # the lantern: an octagonal drum with small arched openings, a cornice, an ogee cap, a ball and the spike
    lantern(Vector((TU, TW)), bell[-1][1], far)
    # four small stone urns on the bell's top corners (Bing 2014)
    for (x, y) in rings[-1]:
        cx, cy = x + (0.16 if x < TU else -0.16), y + (0.16 if y < TW else -0.16)
        lathe(P(cx, cy, bell[-1][1] - 0.02), [(0.11, 0.0), (0.11, 0.06), (0.05, 0.10), (0.06, 0.18), (0.12, 0.28), (0.10, 0.38), (0.03, 0.44), (0.0, 0.50)],
              8 if far else 12, STONE, C_KEY, cap_bottom=False)
    # the steps before the door (blue stone)
    gs = ground(TU, t["w1"] + 1.0) - 0.25
    KT.hbox(TU - 1.06, TU + 1.06, t["w1"] + 0.32, t["w1"] + 0.66, gs, FLOOR - 0.15, BLUE, C_SILL, skip=("bottom",))
    KT.hbox(TU - 1.05, TU + 1.05, t["w1"] - 0.05, t["w1"] + 0.34, gs, FLOOR, BLUE, C_SILL, skip=("bottom",))

def spline_profile(ctrl, per):
    """a Catmull-Rom curve through the profile's control points, `per` samples per span (the bell's slates turn < 3 deg
    from strip to strip: no bent normals on its planar strips)"""
    P_ = [ctrl[0]] + ctrl + [ctrl[-1]]
    out = []
    for i in range(1, len(P_) - 2):
        p0, p1, p2, p3 = P_[i - 1], P_[i], P_[i + 1], P_[i + 2]
        for k in range(per):
            t = k / per; t2 = t * t; t3 = t2 * t
            out.append(tuple(0.5 * ((2 * p1[j]) + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3) for j in (0, 1)))
    out.append(ctrl[-1])
    return out

def oeil(t, side, bell, far):
    """an oval oeil-de-boeuf on one face of the bell: a vertical stone oval ring standing out of the slates (16
    segments), its glass, a small slate hood over it running back into the roof"""
    fr, L, s = side_frame(t, side)
    sc = L / 2
    dfront = -0.10                                    # the oval's front plane (10 cm inside the wall line)
    hc = prof_h(bell, dfront) + 0.30                  # its centre: 30 cm over the slates there
    ra, rb = 0.30, 0.38                               # outer half-width / half-height
    ri, rj = 0.20, 0.27
    n = 10 if far else 18
    dback = -0.85
    out = [(sc + ra * math.cos(2 * math.pi * k / n), hc + rb * math.sin(2 * math.pi * k / n)) for k in range(n)]
    inn = [(sc + ri * math.cos(2 * math.pi * k / n), hc + rj * math.sin(2 * math.pi * k / n)) for k in range(n)]
    K.B.new_group()
    for k in range(n):
        a, b = out[k], out[(k + 1) % n]; c, d = inn[(k + 1) % n], inn[k]
        face_dir([fr.p(*a, dfront), fr.p(*b, dfront), fr.p(*c, dfront), fr.p(*d, dfront)], fr.N, STONE, C_SURROUND)
        sv = K.B.smooth; K.B.smooth = True
        mid = ((a[0] + b[0]) / 2 - sc, (a[1] + b[1]) / 2 - hc)
        face_dir([fr.p(*a, dback), fr.p(*b, dback), fr.p(*b, dfront), fr.p(*a, dfront)], fr.U * mid[0] + Z * mid[1], STONE, C_SURROUND)
        mi = ((c[0] + d[0]) / 2 - sc, (c[1] + d[1]) / 2 - hc)
        face_dir([fr.p(*d, dfront), fr.p(*c, dfront), fr.p(*c, dfront - 0.12), fr.p(*d, dfront - 0.12)], -(fr.U * mi[0] + Z * mi[1]), STONE, C_REVEAL)
        K.B.smooth = sv
    # the glass: an oval disc as strips (no fan): pairs of points left / right of the axis
    half = n // 2
    for k in range(1, half // 2 + 1):
        pass
    pts = sorted(inn, key=lambda p: p[1])
    # strips between successive heights
    hs_ = sorted(set(round(p[1], 5) for p in inn))
    def xs_at(h):
        xs = []
        for k in range(n):
            (x1, y1), (x2, y2) = inn[k], inn[(k + 1) % n]
            if (y1 - h) * (y2 - h) <= 0 and abs(y2 - y1) > 1e-9:
                xs.append(x1 + (x2 - x1) * (h - y1) / (y2 - y1))
        return (min(xs), max(xs)) if xs else (sc, sc)
    for h_a, h_b in zip(hs_[:-1], hs_[1:]):
        (a0, a1), (b0, b1) = xs_at(h_a + 1e-6), xs_at(h_b - 1e-6)
        q = [(a0, h_a), (a1, h_a), (b1, h_b), (b0, h_b)]
        if abs(a1 - a0) < 1e-4: q = [q[0], q[2], q[3]]
        elif abs(b1 - b0) < 1e-4: q = [q[0], q[1], q[2]]
        face_dir([fr.p(x, y, dfront - 0.10) for x, y in q], fr.N, GLASS, C_PANE, [((x - sc) / 0.4 + 0.5, (y - hc) / 0.5 + 0.5) for x, y in q])
    # the hood: a half-elliptic slate shell over the top half, from the front back into the bell
    K.B.new_group()
    m = 8 if far else 12
    arc = [(sc + (ra + 0.05) * math.cos(math.pi * k / m), hc + (rb + 0.05) * math.sin(math.pi * k / m)) for k in range(m + 1)]
    for k in range(m):
        a, b = arc[k], arc[k + 1]
        sv = K.B.smooth; K.B.smooth = True
        mid = ((a[0] + b[0]) / 2 - sc, (a[1] + b[1]) / 2 - hc)
        face_dir([fr.p(*a, dback), fr.p(*b, dback), fr.p(*b, dfront + 0.04), fr.p(*a, dfront + 0.04)], fr.U * mid[0] + Z * mid[1], SLATE, C_HUNG,
                 [(k * 0.2, dback), ((k + 1) * 0.2, dback), ((k + 1) * 0.2, dfront), (k * 0.2, dfront)])
        face_dir([fr.p(*a, dfront + 0.04), fr.p(*b, dfront + 0.04), fr.p(sc + (b[0] - sc) * 0.86, hc + (b[1] - hc) * 0.86, dfront + 0.04),
                  fr.p(sc + (a[0] - sc) * 0.86, hc + (a[1] - hc) * 0.86, dfront + 0.04)], fr.N, ZINC, C_RIDGE)
        K.B.smooth = sv

def lantern(c, hb, far):
    """the cupola on the bell (the heritage aerial, Bing 2014; the 1972 photo, after the 1967 roof works, shows only the
    spike): a slate bulb with zinc ribs on a zinc collar, a ball, the iron spike and a vane (DSM top 72.9 = the bulb,
    UrbIS top 74.4)"""
    segs = 8
    ctr = P(c.x, c.y, hb)
    ref = Vector((math.cos(math.pi / 8), math.sin(math.pi / 8), 0))
    if True:          # (the bulb)
        # the bulb (the heritage aerial, Bing 2014: a slate dome swelling over the bell, a zinc collar, a ball, the spike)
        n = 12 if far else 24
        lathe(ctr, [(0.74, -0.06), (0.74, 0.06), (0.69, 0.08)], n, ZINC, C_PLAIN, smooth=True)                  # the collar
        bulb = [(0.69, 0.06), (0.77, 0.30), (0.79, 0.52), (0.74, 0.76), (0.62, 1.00), (0.45, 1.24), (0.28, 1.46), (0.15, 1.66),
                (0.09, 1.82), (0.06, 1.95), (0.0, 1.96)]
        lathe(ctr, bulb, n, SLATE, C_HUNG, smooth=True)
        if not far:
            for k in range(8):                                                                                  # zinc ribs
                a = 2 * math.pi * k / 8
                dv = Vector((math.cos(a), math.sin(a), 0))
                roll_line([ctr + dv * (r + 0.012) + Z * h for (r, h) in bulb[:-2]], r=0.022, segs=8)
        rb = 0.10
        ball = [(rb * math.sin(math.pi * i / 6), 1.95 + rb - rb * math.cos(math.pi * i / 6)) for i in range(7)]
        lathe(ctr, ball, 12 if not far else 6, ZINC, C_KEY, smooth=True)
        lathe(ctr, [(0.022, 1.95 + 2 * rb - 0.02), (0.022, 3.20), (0.0, 3.45)], 8, IRON, C_KEY, smooth=False)
        if not far:
            o = P(c.x, c.y, hb + 2.95)
            face_dir([o + Vector((0.02, 0, 0)), o + Vector((0.42, 0, 0)), o + Vector((0.42, 0, 0.22)), o + Vector((0.02, 0, 0.22))], Vector((0, 1, 0)), IRON, C_KEY)
            face_dir([o + Vector((0.02, -0.004, 0)), o + Vector((0.02, -0.004, 0.22)), o + Vector((0.42, -0.004, 0.22)), o + Vector((0.42, -0.004, 0))], Vector((0, -1, 0)), IRON, C_KEY)
        LANDMARKS["spike_top"] = round(hb + 3.45, 2)
        return

def annex(r, sides, far, extend, clip=None):
    """a one-storey white wing with a hipped slate roof (32 deg), plinth, eaves; extend: the roof's plan pushed into the
    house so its inner hip is hidden there"""
    base = base_of(r["u0"], r["w1"] + 1, r["u1"], r["w1"] + 1)
    for sd in ("+u", "-u", "+w", "-w"):
        if sd not in sides: continue
    rect_walls(r, sides, far, base, r["top"], RENDER, plinth_top=FLOOR + 0.03)
    prof, poly = hip_part(r, r["pitch"], r["top"], extend=extend, clip=clip)
    return prof, poly, base

def outbuildings(far):
    # the long range (stables / coach house; its courtyard face ESTIMATED: openings after the type; the back in brick)
    r = LR
    base_f = base_of(r["u0"], r["w0"] - 1, r["u1"], r["w0"] - 1)
    base_b = base_of(r["u0"], r["w1"] + 1, r["u1"], r["w1"] + 1)
    lo = (49.65 + 0.80, 52.45)
    sides = {
        "-w": dict(ops=[(-8.60, 2.60, 49.65, 52.95, "carriage", "seg"), (-19.30, 1.00, *lo, "win", None),
                        (-5.40, 1.00, *lo, "win", None), (-2.60, 1.00, *lo, "win", None), (0.40, 1.05, 49.65, 52.30, "door", None),
                        (3.20, 1.00, *lo, "win", None), (6.00, 1.00, *lo, "win", None)] +
                       [(c, 0.80, 53.30, 54.30, "small", None, dict(rows=2)) for c in (-19.30, -5.40, -2.60, 3.20, 6.00)],
                   holes=[(RW["u0"], RW["u1"], base_f, r["top"])], hb=base_f),
        "+w": dict(ops=[(c, 0.70, 53.10, 54.20, "small", None, dict(rows=2)) for c in (-14.0, -6.0, 2.0, 6.5)], hb=base_b),
        "-u": dict(ops=[(25.15, 0.90, 51.40, 53.20, "win", None)], hb=base_of(r["u0"] - 1, r["w0"], r["u0"] - 1, r["w1"])),
        "+u": dict(ops=[(25.15, 0.90, 51.40, 53.20, "win", None)], hb=base_of(r["u1"] + 1, r["w0"], r["u1"] + 1, r["w1"])),
    }
    for side, spec in sides.items():
        fr, L, s = side_frame(r, side)
        hb = spec["hb"]
        ops = [op(s, *o[:4], **(dict(kind=o[4], arch=o[5]) | (o[6] if len(o) > 6 else {}))) for o in spec.get("ops", [])]
        holes = [(min(s(a), s(b)), h0, max(s(a), s(b)), h1) for (a, b, h0, h1) in spec.get("holes", [])]
        wall = BRICK if side == "+w" else RENDER
        surround = None if side == "+w" else "flat"
        for o in ops: o.surround = surround if o.kind not in ("carriage",) else None
        wall_grid(fr, 0.0, L, hb, r["top"], ops, wall, holes=holes)
        for o in ops: opening_parts(fr, o, far, wall=wall)
        gl = ground_min(*( (r["u0"], r["w0"] - 1, r["u1"], r["w0"] - 1) if side == "-w" else (r["u0"], r["w1"] + 1, r["u1"], r["w1"] + 1) if side == "+w" else
                          (r["u0"] - 1, r["w0"], r["u0"] - 1, r["w1"]) if side == "-u" else (r["u1"] + 1, r["w0"], r["u1"] + 1, r["w1"])))
        if side == "-w":
            # the plinth stops at the wing (it stands before the range there); s = u1 - u
            plinth(fr, 0.0, s(RW["u1"]), hb, 49.95, e0="out", e1="cut")
            plinth(fr, s(RW["u0"]), L, hb, 49.95, e0="cut", e1="out")
        else:
            d = "out" if side == "+w" else "in"
            plinth(fr, 0.0, L, hb, gl + 0.40, e0=d, e1=d)
    prof, poly = hip_part(r, r["pitch"], r["top"])
    he = prof[0][1]
    gutter_line((r["u0"] - OVH, r["w0"] - OVH), (r["u1"] + OVH, r["w0"] - OVH), he, (0, -1))
    downpipe(r["u1"] - 0.30, r["w0"] - OVH, he - 0.10, base_f + 0.2, (0, -1))
    downpipe(RW["u1"] + 0.35, r["w0"] - OVH, he - 0.10, base_f + 0.2, (0, -1))
    rh = lambda uc: (lambda w: roof_height(prof, poly, uc, w))
    for uc in (-3.40, 1.40, 5.60):          # the courtyard slope's dormers (Bing 2014: three)
        dormer(-1, uc, 22.40, 1.00, 56.10, 57.05, 57.65, rh(uc), far)
    for uc in (4.20, 7.20):                 # the back slope's two small white dormers (Bing 2014)
        dormer(1, uc, 27.95, 0.90, 56.05, 56.90, 57.40, rh(uc), far)
    # the wing (two storeys, a low hipped roof: DSM 56.4 ridge, 24 deg)
    r = RW
    base = base_of(r["u0"], r["w0"] - 1, r["u1"], r["w0"] - 1)
    g1 = (50.45, 52.05); g2 = (52.95, 54.45)
    sides = {
        "-w": dict(ops=[(-14.525, 1.00, *g1, "win", None), (-14.525, 1.00, *g2, "win", None)]),
        "-u": dict(ops=[(c, 1.00, *g, "win", None) for c in (15.5, 19.0) for g in (g1, g2)], e0="in", e1="cut"),
        "+u": dict(ops=[(15.0, 1.05, 49.65, 52.25, "door", None), (18.6, 1.00, *g1, "win", None)] + [(c, 1.00, *g2, "win", None) for c in (15.0, 18.6)], e0="cut", e1="in"),
    }
    rect_walls(r, sides, far, base, r["top"], RENDER, plinth_top=49.91)
    prof, poly = hip_part(r, r["pitch"], r["top"], extend={"w1": 2.60})
    chimney(-14.525, 17.40, 57.70, roof_height(prof, poly, -14.525, 17.40) - 0.40, su=0.60, sw=0.48)

def wings(far):
    tall = lambda a, b: (a, b)
    gw = (50.55, 52.35)
    annex(WA, {
        "+w": dict(ops=[(-9.95, 1.00, *gw, "win", None)]),
        "-u": dict(ops=[(c, 1.05, FLOOR + 0.05, 52.35, "french", None) for c in (4.00, 7.00)], e0="cut", e1="in"),
        "+u": dict(ops=[(5.30, 1.00, *gw, "win", None)], e0="in", e1="cut"),
    }, far, extend={"w0": 2.70}, clip=("w", True, HOUSE["w1"] - 0.03))
    annex(EA, {
        "+w": dict(ops=[(7.30, 1.00, *gw, "win", None)]),
        "-u": dict(ops=[(6.40, 1.00, FLOOR, 52.35, "door", None), (3.60, 1.00, *gw, "win", None)], e0="cut", e1="in"),
        "+u": dict(ops=[(5.00, 1.00, *gw, "win", None)], e0="in", e1="cut"),
    }, far, extend={"w0": 2.70}, clip=("w", True, HOUSE["w1"] - 0.03))
    annex(NX, {
        "+u": dict(ops=[(c, 1.00, *gw, "win", None) for c in (-7.20, -4.00)], e0="out", e1="out"),
        "-w": dict(ops=[(10.60, 1.00, *gw, "win", None)], e0="in", e1="cut"),
        "+w": dict(ops=[(10.60, 1.00, *gw, "win", None)], e0="cut", e1="in"),
    }, far, extend={"u0": 2.70}, clip=("u", True, HOUSE["u1"] - 0.03))

# ------------------------------------------------------------------------------------------------ build
def build(far):
    K.B = Builder(); K.FAR = far; KT.KNOBS.clear()
    house(far)
    tower(far)
    wings(far)
    outbuildings(far)
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
    # weld (0.4 mm); the smooth round parts apart from the rest (their smooth normals must not reach a flat neighbour)
    rnd = {i for i, m in enumerate(me.materials) if m.name in ROUND_SLOTS}
    zv = {v for f in bm.faces if f.material_index in rnd for v in f.verts}
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v not in zv], dist=0.0004)
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_valid and v in zv], dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    sm = [0] * len(me.polygons); me.attributes["smoothf"].data.foreach_get("value", sm)
    me.set_sharp_from_angle(angle=math.radians(35))
    me.polygons.foreach_set("use_smooth", [bool(x) for x in sm])
    # the hips of the curved (smooth) roofs: two faces whose horizontal facing differs > 40 deg never blend
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table(); bm.edges.ensure_lookup_table()
    cosh = math.cos(math.radians(40)); nh = 0
    for e in bm.edges:
        if len(e.link_faces) != 2 or not e.smooth: continue
        f1, f2 = e.link_faces
        if not (f1.smooth and f2.smooth): continue
        a = Vector((f1.normal.x, f1.normal.y, 0)); b = Vector((f2.normal.x, f2.normal.y, 0))
        if a.length < 0.03 or b.length < 0.03: continue
        if a.normalized().dot(b.normalized()) < cosh: e.smooth = False; nh += 1
    bm.to_mesh(me); bm.free()
    print(f"  {name}: {nh} hip edges kept sharp")
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
        for p_ in me.polygons:
            if me.materials[p_.material_index].name in ROUND_SLOTS and p_.area < 0.05: thin[p_.index] = True
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

obj, ntri0, per_slot0 = make_mesh("Papenkasteel", B_MAIN)
far, ntri_far, per_slot_far = make_mesh("Papenkasteel_far", B_FAR)
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

# ------------------------------------------------------------------------------------------------ AO bake (lighting only), Cycles on the GPU
def use_gpu():
    """--factory-startup leaves Cycles on the CPU: switch to OptiX (the RTX 4050), else CUDA, else CPU"""
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"; print("Cycles device:", kind); return kind
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.device = "CPU"; return "CPU"

scn.render.engine = "CYCLES"
DEVICE = use_gpu()
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("papenkasteel_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    a = np.empty(4 * len(me.loops), np.float32); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = np.empty(4 * len(me.loops), np.float32); col.data.foreach_get("color", c)
    th = np.array(thin, bool)
    loop_poly = np.empty(len(me.loops), np.int64)
    ls = np.empty(len(me.polygons), np.int64); lt = np.empty(len(me.polygons), np.int64)
    me.polygons.foreach_get("loop_start", ls); me.polygons.foreach_get("loop_total", lt)
    loop_poly = np.repeat(np.arange(len(me.polygons)), lt)
    sel = th[loop_poly]
    c.reshape(-1, 4)[sel, 1] = np.clip(a.reshape(-1, 4)[sel, 0], 0.25, 1.0)
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO {o.name}: {int(sel.sum())} corners of thin faces")

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
    print(f"AO bake {time.time() - t:.1f}s ({DEVICE})")
    t = time.time()
    far.hide_render = True; obj.hide_render = False
    vertex_ao(obj, thin0[obj.name])
    far.hide_render = False; obj.hide_render = True; vertex_ao(far, thin1[far.name])
    obj.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "papenkasteel_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "papenkasteel_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if m.node_tree and "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "papenkasteel.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
solids = SITE["solids"]
info = {
    "asset": "Papenkasteel / Chateau de Stalle, Rue Papenkasteel 99, Uccle: the castle on the Geleytsbeek (tools/blender/papenkasteel.py)",
    "triangles_lod0": ntri0, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot0, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)",
                              "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres per face: walls (along, m TAW - 40), roofs (along the eave, up the slope)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(dens0, 1), "far_px_per_m": round(dens1, 1),
                 "thin_faces_vertex_ao": [sum(thin0[obj.name]), sum(thin1[far.name])], "device": DEVICE},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [s["id"] for s in solids], "hides_bu_ids": [s["bu"] for s in solids if s["bu"]]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"house": HOUSE, "house_roof_profile": HOUSE_ROOF, "tower": TOWER, "tower_levels": T_LEVELS, "west_annex": WA,
                 "east_annex": EA, "ne_extension": NX, "range": LR, "range_wing": RW, "floor": FLOOR},
    "estimated": "the garden (north-west) front's bays, the east end and the north-east extension (under the plane tree), the "
                 "outbuildings' courtyard openings, the annexes' side openings, the back slope dormers, the mouldings' profiles, the "
                 "joinery's sections, the lantern's details (Bing 2014 at ~0.3 m/px)",
    "landmarks": LANDMARKS,
}
json.dump(info, open(os.path.join(OUT, "papenkasteel.json"), "w"), indent=1)
print(f"done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"render_white": (0.82, 0.81, 0.77), "brick_red_brussels": (0.42, 0.17, 0.11), "stone_white": (0.78, 0.75, 0.68),
            "stone_blue": (0.17, 0.18, 0.19), "slate": (0.09, 0.10, 0.12), "zinc_roof": (0.45, 0.47, 0.48), "wood_frame_white": (0.85, 0.85, 0.82),
            "wood_frame_dark": (0.10, 0.12, 0.10), "cast_iron_dark": (0.05, 0.05, 0.06), "glass_window": (0.04, 0.05, 0.06)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes.get("Principled BSDF")
        if not bsdf: continue
        bsdf.inputs["Base Color"].default_value = (*cols[m.name], 1); bsdf.inputs["Roughness"].default_value = 0.6
        if CHECKER and m.name not in ("glass_window",):
            tc = nt.nodes.new("ShaderNodeTexCoord"); ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 1.0
            ck.inputs["Color1"].default_value = (*cols[m.name], 1); ck.inputs["Color2"].default_value = tuple(min(1, c * 0.6 + 0.25) for c in cols[m.name]) + (1,)
            nt.links.new(tc.outputs["UV"], ck.inputs["Vector"]); nt.links.new(ck.outputs["Color"], bsdf.inputs["Base Color"])
    far.hide_render = "--far" not in ARGS
    obj.hide_render = "--far" in ARGS
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0; so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.55, 0.65, 0.85, 1)
    scn.cycles.samples = 32 if "--fast" in ARGS else 64
    scn.render.image_settings.color_mode = "RGB"
    pdir = os.path.join(ROOT, "docs", "geleytsbeek"); os.makedirs(pdir, exist_ok=True)
    tag = ("_checker" if CHECKER else "") + ("_far" if "--far" in ARGS else "")
    only = [a.split("=", 1)[1] for a in ARGS if a.startswith("--only=")]
    def look(name, pos, tgt, lens=28, res=(1400, 900), sun_rot=(55, 0, 230)):
        if only and name not in only[0].split(","): return
        so.rotation_euler = tuple(math.radians(a) for a in sun_rot)
        cam = bpy.data.cameras.new(name); cam.lens = lens; co = bpy.data.objects.new(name, cam); scn.collection.objects.link(co)
        co.location = pos; d = Vector(tgt) - Vector(pos); co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.camera = co; scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(pdir, f"preview_{name}{tag}.png"); bpy.ops.render.render(write_still=True)
    # the Bing 2014 oblique (inventory photo P03): from the south-south-east, high, looking down over the outbuildings
    look("bing_oblique", P(4.0, 95.0, 120.0), P(-2.0, 5.0, 58.0), lens=50, sun_rot=(50, 0, 160))
    # the heritage-PDF aerial (urban.brussels): from the south, further and higher
    look("aerial_south", P(-30.0, 140.0, 140.0), P(-4.0, 8.0, 60.0), lens=55, sun_rot=(50, 0, 200))
    # the courtyard, eye height, from the gate side (the inventory gate photos: from the east)
    look("courtyard", P(16.0, 16.0, 51.1), P(-3.0, 2.0, 58.0), lens=24, sun_rot=(45, 0, 140))
    # the tower close (the 1972 photo: from the courtyard, looking up)
    look("tower_1972", P(-2.5, 17.0, 50.6), P(-1.2, 2.0, 66.0), lens=35, sun_rot=(40, 0, 120))
    # the garden front from the lawn (north-west)
    look("garden_front", P(-6.0, -40.0, 53.0), P(-1.5, -5.0, 58.0), lens=26, sun_rot=(35, 0, 320))
    # the west end and the parterre
    look("west_parterre", P(-40.0, 6.0, 54.0), P(-8.0, 2.0, 56.0), lens=26, sun_rot=(45, 0, 250))
    # grazing light on the tower's front: the sun skimming it (relief of quoins, bands, voussoirs)
    scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.15; sun.energy = 7.0
    look("grazing_tower", P(-6.6, 10.5, 52.0), P(-1.2, 2.9, 60.0), lens=28, sun_rot=(83, 0, 92))
    look("grazing_house", P(5.0, 2.6, 50.6), P(-7.0, 1.5, 56.0), lens=24, sun_rot=(84, 0, 268))
