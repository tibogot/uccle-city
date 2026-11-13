"""RUSSIAN ORTHODOX CHURCH OF SAINT-JOB (Avenue De Fre 19, Uccle; the memorial church of St Job the Long-Suffering;
architect N. Istselenov after the 16th-c. Transfiguration church at Ostrov; first stone 1936, near-finished 1938,
consecrated 1950; protected 1984): built entirely in code (no hand modelling) from MEASURED data + photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/russian.py -- models/russian [--no-bake] [--previews] [--fast]
      models/russian/russian.raw.glb   node "Russian" (LOD0) + "Russian_far" (the scripted far variant); one primitive per
                                       NAMED material slot (SLOTS)
      models/russian/russian_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      models/russian/russian.json      measurements, slots, codes, placement, counts
      docs/landmarks/churches2/russian_*.png   Cycles previews (--previews)

INPUT: models/russian/site.json + site_dtm.* (tools/russian_measure.py): the frame, the OSM wall outline, the UrbIS
solid's LoD2 levels (cornice 60.79, the two kokoshnik tiers 61.2-64.3, the drum 64.3-68.53 r 2.51, the onion to 72.4,
the belfry's tent 60.28-66.87, the annex 57.97-59.89, the apse 56.6-58.16, the low link 52.21) and the DSM peaks (onion
73.5). Openings and ornament from the Commons photos listed in docs/landmarks/CHURCHES2.md (west front: Melioratif 2017,
N.astier 2016, Luc Viatour, Silbel 2015 I-VI; belfry: Silbel VI). The north side, the apse, the annex, the link and the
belfry's lower shaft have no usable photo: estimated (russian.json "estimated").

SWAPPABLE MATERIALS: no colour, no texture in the GLB. COLOR_0.r = per-face code / 16 + 1/32, COLOR_0.g = per-vertex AO
of the thin parts; TEXCOORD_0 = world metres per face; TEXCOORD_1 = the baked AO's lightmap UV (lighting only).
Frame: u along the axis (west front -> apse), w to the south; Blender x = u, y = -w, z = TAW - OY (stpierre_common).
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                             sweep3d, face_dir, face_up, quad, circle, offset_loop, arc_pts, ccw, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/russian")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "churches2")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]

SLOTS = ["brick_painted_white", "stone_blue", "copper_brown", "zinc_roof", "wood_frame_dark", "glass_window", "cast_iron_green"]
WHITE, BLUE, CUB, ZINC, WOOD, GLASS, IRON = range(7)
CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
         "gilt", "door", "mosaic", "frame", "lead"]
(C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_MOSAIC,
 C_FRAME, C_LEAD) = range(16)
FAR = lambda: K.FAR

# ------------------------------------------------------------------------------------------------ THE PLAN (measured + photos)
# main body: the OSM outline (= the wall faces; UrbIS is ~0.35 m larger: the cornice line)
U0, U1, W0, W1 = 0.0, 12.83, -5.77, 5.77
G_FRONT = 48.3                  # DTM before the west steps 48.17-48.39
FLOOR = 49.1                    # five risers up (photos Silbel III, N.astier): 0.8 m over the path
HB = 47.6                       # walls go this far down (below every ground point under the church: DTM 48.17)
PLINTH = 49.05
WALL_TOP = 60.6                 # hidden in the cornice; UrbIS wall top 60.79
CORN = (60.3, 61.2)             # the crowning entablature (photos: a plain frieze + a three-step cornice)
PIL_C, PIL_I, PIL_PROUD = 0.85, 0.62, 0.08    # corner / inner pilasters (Melioratif 2017 frontal: 0.89 / 0.62 m)
# the kokoshnik tiers (UrbIS levels: tier 1 tops 62.99-63.13 front / 63.44-63.66 sides; tier 2 tops 64.15-64.30)
T1_SPR = 61.25
T2 = dict(u0=0.95, u1=11.15, w0=-4.38, w1=4.62, spr=63.6)      # tier 2's walls (UrbIS plan 0.88-11.21 / -4.37..4.62); spring from
# the Luc Viatour frontal (51 px/m, calibrated on the cornice + the onion's base 68.7 / apex 73.1 against UrbIS / DSM):
# tier 1 tops 62.7-63.0, tier 2 cusps 63.6, tier 2 tops 65.1 (UrbIS LoD2 flattens the stack to 64.3)
DOME_U, DOME_W = 6.04, 0.12     # the drum's axis (UrbIS rings, least squares)
DRUM_R, DRUM_TOP = 2.48, 68.53
ONION_TOP = 73.25               # onion apex (DSM 73.5 at the ball; Silbel I: onion height / drum width 0.94)
# west front (Melioratif 2017 / N.astier 2016 frontal; 56 px/m at the front plane)
PORTAL = dict(c=5.77, w=1.72, top=51.95, outer=1.45, proud=0.32)  # door opening, its round tympanum over it
OCULUS = dict(v=56.55, r=0.34, shell=0.92)
SLIT = dict(w=0.34, sill=53.1, top=54.75)
LOWWIN = dict(w=0.52, sill=49.85, spring=50.42)
# apse (OSM bulge to u 16.4; UrbIS eave circle r 4.0 + the half-cone 56.60 -> 58.16): a circular arc through the
# east wall's ends (u 12.83, w -4.03 / +4.2) and its apex (16.4, 0.12)
APSE_C, APSE_R, APSE_TOP, APSE_APEX = (12.21, 0.12), 4.19, 56.45, 58.2
# the low link (flat roof 52.21) and the annex (hipped, eaves 57.97 ridge 59.89) on the south-east, turned ~30 deg
LINK = [(12.83, 0.45), (12.83, 5.77), (13.31, 5.77), (15.23, 7.48), (15.12, 9.35), (16.57, 9.09), (19.85, 3.37), (16.45, 0.45)]
LINK_TOP = 52.21
ANNEX_EAVE = [(19.93, 3.57), (24.17, 5.98), (22.25, 9.44), (18.01, 7.03)]   # UrbIS: the roof outline
ANNEX = dict(eave=57.97, ridge=59.89, wall=57.75, inset=0.3)
TURRET = dict(c=(21.4, 10.75), r=1.25, eave=57.97, apex=59.02)
# the belfry (UrbIS: octagonal tent 60.28 -> 66.87 on an eaves ring r 3.2-3.5 round (17.17, 12.07); DSM 66.49)
BEL = dict(c=(17.17, 12.07), rot=math.radians(6.0), rc=2.72, band=56.55, stage=(56.85, 59.75), corn=(59.75, 60.28),
           eave_r=3.35, apex=66.87, ground=49.27)

def frame_uw(u, w, nu, nw): return Frame(P(u, w, OY), Vector((nu, -nw, 0)))
def gnd(u, w): return G(u, w)

def body_faces(u0, u1, w0, w1):
    """the four faces of a box (u0..u1, w0..w1): (name, frame, length); s runs left -> right seen from outside, 0..L"""
    return [("W", frame_uw(u0, w0, -1, 0), w1 - w0), ("S", frame_uw(u0, w1, 0, 1), u1 - u0),
            ("E", frame_uw(u1, w1, 1, 0), w1 - w0), ("N", frame_uw(u1, w0, 0, -1), u1 - u0)]

# ------------------------------------------------------------------------------------------------ helpers
def arched(s0, s1, bottom, spring, n=16):
    r = (s1 - s0) / 2; c = (s0 + s1) / 2
    n = 6 if FAR() else n
    return ccw([(s0, bottom), (s1, bottom)] + [(c + r * math.cos(math.pi * k / n), spring + r * math.sin(math.pi * k / n)) for k in range(n + 1)])

def arch_path(c, spring, a, b=None, n=20, legs=0.0):
    b = a if b is None else b
    pts = [(c + a * math.cos(math.pi - math.pi * k / n), spring + b * math.sin(math.pi - math.pi * k / n)) for k in range(n + 1)]
    if legs: pts = [(c - a, spring - legs)] + pts + [(c + a, spring - legs)]
    return pts

def rodc(a, b, r, mat, code=0, segs=6):
    """a round bar with closed ends"""
    ax = b - a
    if ax.length < 1e-5: return
    ref = Vector((1, 0, 0)) if abs(ax.normalized().x) < 0.9 else Vector((0, 1, 0))
    lathe_axis(a, ax, ref, [(r, 0.0), (r, ax.length)], segs, mat, code, cap_top=True, cap_bottom=True)

def moulding(fr, path, d0, prof, mat=WHITE, code=C_SUR, caps=True):
    if FAR(): return
    sweep2d(fr, path, list(prof), mat, code, caps=caps, d0=d0)

def opening(fr, loop, depth, glass=True, sill=None, code=C_SUR):
    """a hole's reveal (painted) to `depth`, the glass there (or nothing), a stone-less painted sill"""
    strip2d(fr, loop, 0.0, -depth, WHITE, code)
    if glass: fill2d(fr, [loop], -depth, GLASS, C_LEAD)

def glazing(fr, s0, s1, v0, v1, d, nx=1, ny=2, t=0.035):
    """glazing bars (painted white) a little proud of the glass"""
    if FAR(): return
    for i in range(1, nx + 1):
        s = s0 + (s1 - s0) * i / (nx + 1)
        bar(fr, (s, v0), (s, v1), d, t, 0.032, WHITE, C_FRAME)
    for j in range(1, ny + 1):
        v = v0 + (v1 - v0) * j / (ny + 1)
        bar(fr, (s0, v), (s1, v), d, t, 0.022, WHITE, C_FRAME)

def ring_prism(loop_uw, h0, h1, mat, code, top=True, chamfer=0.0, top_to=None, bottom_to=None):
    """a prism round a (u, w) loop: walls facing out, an optional chamfer on the top edge, then either a full top face
    (top=True), a top RING back to the loop `top_to` (a wall line behind), or nothing; `bottom_to`: a soffit ring under
    it back to that loop (an overhanging band must close underneath)"""
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    inner = offset_uw(L, -chamfer) if chamfer else L
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        face_dir([P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1 - chamfer), P(a[0], a[1], h1 - chamfer)],
                 Vector(((P(b[0], b[1], 0) - P(a[0], a[1], 0)).y, -(P(b[0], b[1], 0) - P(a[0], a[1], 0)).x, 0)), mat, code)
        if chamfer:
            ia, ib = inner[i], inner[(i + 1) % n]
            face_dir([P(a[0], a[1], h1 - chamfer), P(b[0], b[1], h1 - chamfer), P(ib[0], ib[1], h1), P(ia[0], ia[1], h1)], Z, mat, code)
    def ring(outer, inn, h, up):
        o = ccw_uw(outer); q = ccw_uw(inn)
        for i in range(len(o)):
            face_dir([P(o[i][0], o[i][1], h), P(o[(i + 1) % len(o)][0], o[(i + 1) % len(o)][1], h), P(q[(i + 1) % len(q)][0], q[(i + 1) % len(q)][1], h), P(q[i][0], q[i][1], h)],
                     Z if up else -Z, mat, code)
    if top_to is not None: ring(inner, top_to, h1, True)
    elif top: face_up([P(p[0], p[1], h1) for p in inner], mat, code)
    if bottom_to is not None: ring(L, bottom_to, h0, False)

def edge_frame(a, b):
    """the wall frame of a (u, w) loop edge a -> b (the loop counter-clockwise by ccw_uw): s along a -> b, N outward"""
    A, B_ = P(a[0], a[1], OY), P(b[0], b[1], OY)
    e = (B_ - A).normalized()
    return Frame(A, Vector((e.y, -e.x, 0))), (B_ - A).length

def ccw_uw(l):
    """counter-clockwise in Blender's (x, y) = (u, -w): fix the orientation so the walls face out"""
    a = sum(l[i][0] * (-l[(i + 1) % len(l)][1]) - l[(i + 1) % len(l)][0] * (-l[i][1]) for i in range(len(l)))
    return list(l) if a > 0 else list(reversed(l))

def offset_uw(l, d):
    """offset a (u, w) loop outward by d (ccw_uw order)"""
    m = [(u, -w) for u, w in l]
    o = offset_loop(m, d)
    return [(x, -y) for x, y in o]

def wall_loop(loop_uw, h0, h1, mat=WHITE, code=C_PLAIN):
    """outward walls round a (u, w) loop, no top / bottom"""
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        quad(P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1), mat, code)

def cornice_ring(loop_uw, h0, h1, proj, mat=WHITE, code=C_CORN, steps=3):
    """a stepped crowning cornice swept round a closed (u, w) loop: `steps` corbelled courses out to `proj`"""
    if FAR():
        ring_prism(offset_uw(loop_uw, proj * 0.7), h0, h1, mat, code, top=False, top_to=loop_uw, bottom_to=loop_uw)
        return
    L = ccw_uw(loop_uw)
    H = h1 - h0
    prof = [(0.0, 0.0)]
    for k in range(steps):
        x0 = proj * k / steps; x1 = proj * (k + 1) / steps
        y0 = H * k / steps; y1 = H * (k + 1) / steps
        ch = min((x1 - x0) * 0.45, (y1 - y0) * 0.3)
        prof += [(x1 - ch * 0.6, y0), (x1, y0 + ch), (x1, y1)]     # each course: a steep chamfer (60 deg), then its face
    prof += [(0.0, H)]
    m0 = ((L[0][0] + L[1][0]) / 2, (L[0][1] + L[1][1]) / 2)        # start mid-edge: the closing row needs no mitre
    path = [P(m0[0], m0[1], h0)] + [P(u, w, h0) for u, w in L[1:]] + [P(L[0][0], L[0][1], h0), P(m0[0], m0[1], h0)]
    sweep3d(path, [(x, y) for x, y in prof], Z, mat, code, closed=True, caps=False)
    flat_group()

def slab(top, th, mat, code=C_PLAIN):
    up = (top[1] - top[0]).cross(top[2] - top[1]).normalized()
    if up.z < 0: top = list(reversed(top)); up = -up
    bot = [p - Z * th for p in top]
    K.B.new_group()
    face_dir(top, up, mat, code); face_dir(bot, -up, mat, code)
    n = len(top)
    for i in range(n):
        a, b = top[i], top[(i + 1) % n]
        out = (b - a).cross(up).normalized()
        face_dir([a, b, bot[(i + 1) % n], bot[i]], out, mat, code)

def flat_group():
    """mark the current construction group FLAT: all its edges sharp (stepped cornices, copper sheet hoods)"""
    K.B.__dict__.setdefault("flat", set()).add(K.B.grp)

def regroup(i0, gid):
    """put the faces built since index i0 into construction group gid (one smooth surface)"""
    for i in range(i0, len(K.B.g)): K.B.g[i] = gid

class CylFrame:
    """a frame WRAPPED on a vertical cylinder (centre c Blender, radius r): s = arc length from angle a0 (counter-
    clockwise seen from above), v = Blender z, d = out of the surface. Planar constructions (fill2d / strip2d / sweep2d)
    follow the curvature."""
    def __init__(self, c, r, a0):
        self.c = Vector((c.x, c.y, 0)); self.r = r; self.a0 = a0
        self.N = Vector((math.cos(a0), math.sin(a0), 0)); self.U = Z.cross(self.N).normalized(); self.O = self.c + self.N * r
    def p(self, s, v, d=0.0):
        a = self.a0 + s / self.r
        return self.c + Vector((math.cos(a), math.sin(a), 0)) * (self.r + d) + Z * v

def cyl_band(c, r, h0, h1, a_list, mat, code=C_PLAIN):
    """the cylinder's surface between heights h0..h1 (Blender z) at the given angles (joins the CURRENT construction group:
    one smooth surface with its neighbours)"""
    for i in range(len(a_list) - 1):
        a, b = a_list[i], a_list[i + 1]
        pa = Vector((math.cos(a), math.sin(a), 0)) * r + Vector((c.x, c.y, 0)); pb = Vector((math.cos(b), math.sin(b), 0)) * r + Vector((c.x, c.y, 0))
        quad(pa + Z * h0, pb + Z * h0, pb + Z * h1, pa + Z * h1, mat, code, [(r * a, h0), (r * b, h0), (r * b, h1), (r * a, h1)])

def cyl_wall_with_windows(c, r, h0, h1, segs, wins, mat=WHITE, a0=0.0, arc=2 * math.pi):
    """a round wall (Blender centre c, radius r, z h0..h1; the arc a0..a0+arc in `segs` segments) with arched windows:
    wins = [(angle, width, sill, spring, depth)]. Each window sits in a panel of whole segments wrapped on the cylinder
    (no T-junctions with the plain segments)."""
    step = arc / segs
    full = abs(arc - 2 * math.pi) < 1e-6
    used = set()
    panels = []
    for (a, wdt, sill, spring, depth) in wins:
        half = max(1, math.ceil((wdt / 2 + 0.12) / (r * step)))
        k = round((a - a0) / step)
        ks = [((k + j) % segs) if full else (k + j) for j in range(-half, half)]
        used.update(ks)
        panels.append((k - half, 2 * half, wdt, sill, spring, depth))
    gid = K.B.grp
    for k in range(segs):
        if k in used: continue
        cyl_band(c, r, h0, h1, [a0 + k * step, a0 + (k + 1) * step], mat)
    for (k0, nseg, wdt, sill, spring, depth) in panels:
        fr = CylFrame(c, r, a0 + k0 * step)
        Lp = nseg * step * r; sc = Lp / 2
        outer = [(Lp * j / nseg, h0) for j in range(nseg + 1)] + [(Lp * j / nseg, h1) for j in range(nseg, -1, -1)]
        hole = arched(sc - wdt / 2, sc + wdt / 2, sill, spring)
        i0 = len(K.B.g)
        fill2d(fr, [outer, hole], 0.0, mat, C_PLAIN)
        regroup(i0, gid)                                  # the panel is part of the round wall's smooth surface
        opening(fr, hole, depth)
        moulding(fr, arch_path(sc, spring, wdt / 2 + 0.07, legs=spring - sill + 0.07), 0.0, PROF_SUR, WHITE, C_SUR)
        if not FAR():
            frc = CylFrame(c, r, a0 + k0 * step + nseg * step / 2)
            fbox(frc, -wdt / 2 - 0.08, wdt / 2 + 0.08, sill - 0.09, sill - 0.01, -0.03, 0.07, WHITE, C_SILL)

PROF_SUR = ((0.0, 0.0), (0.035, 0.0), (0.05, 0.02), (0.05, 0.09), (0.0, 0.1))           # e = out from the opening
PROF_KOK = ((0.0, -0.32), (0.05, -0.32), (0.06, -0.27), (0.13, -0.24), (0.13, -0.03), (0.0, -0.03))  # e = up / out of the arc
PROF_BAND = ((0.0, -0.12), (0.05, -0.12), (0.07, -0.08), (0.07, 0.0), (0.0, 0.02))

# ------------------------------------------------------------------------------------------------ the main body
def front_west(fr, L):
    """the west front (photos frontal): two inner pilasters, the portal with its mosaic tympanum, the shell oculus,
    two slit windows, two small round-headed windows low down"""
    vb, vt = hz(HB), hz(WALL_TOP)
    c = PORTAL["c"]
    sc = [(PIL_C + L / 3 - PIL_I / 2) / 2, (L - PIL_C + 2 * L / 3 + PIL_I / 2) / 2]     # the side bays' centres
    door = rect(c - PORTAL["w"] / 2, hz(FLOOR), c + PORTAL["w"] / 2, hz(PORTAL["top"]))
    tymp_r = PORTAL["w"] / 2
    portal_hole = arched(c - PORTAL["w"] / 2, c + PORTAL["w"] / 2, hz(FLOOR), hz(PORTAL["top"]), n=16)
    ocu = circle(c, hz(OCULUS["v"]), OCULUS["r"], 8 if FAR() else 24)
    slits = [rect(s - SLIT["w"] / 2, hz(SLIT["sill"]), s + SLIT["w"] / 2, hz(SLIT["top"])) for s in sc]
    lows = [arched(s - LOWWIN["w"] / 2, s + LOWWIN["w"] / 2, hz(LOWWIN["sill"]), hz(LOWWIN["spring"])) for s in sc]
    # the portal block stands proud: the wall's hole is its outer outline
    po = PORTAL["outer"]
    portal_out = arched(c - po, c + po, vb, hz(PORTAL["top"]), n=16)
    fill2d(fr, [rect(0, vb, L, vt), portal_out, ocu] + slits + lows, 0.0, WHITE, C_PLAIN)
    portal(fr, c)
    for s, sl, lw in zip(sc, slits, lows):
        opening(fr, sl, 0.32); glazing(fr, s - SLIT["w"] / 2, s + SLIT["w"] / 2, hz(SLIT["sill"]), hz(SLIT["top"]), -0.3, nx=0, ny=3)
        moulding(fr, [(s - SLIT["w"] / 2 - 0.06, hz(SLIT["sill"])), (s - SLIT["w"] / 2 - 0.06, hz(SLIT["top"]) + 0.06),
                      (s + SLIT["w"] / 2 + 0.06, hz(SLIT["top"]) + 0.06), (s + SLIT["w"] / 2 + 0.06, hz(SLIT["sill"]))], 0.0, ((0.0, 0.0), (0.03, 0.0), (0.03, 0.07), (0.0, 0.08)))
        if not FAR(): fbox(fr, s - SLIT["w"] / 2 - 0.1, s + SLIT["w"] / 2 + 0.1, hz(SLIT["sill"]) - 0.07, hz(SLIT["sill"]), 0.0, 0.08, WHITE, C_SILL)
        opening(fr, lw, 0.3)
        if not FAR():
            for k in range(1, 4):         # the low windows' grilles (photos: three bars)
                s_ = s - LOWWIN["w"] / 2 + LOWWIN["w"] * k / 4
                bar(fr, (s_, hz(LOWWIN["sill"])), (s_, hz(LOWWIN["spring"]) + 0.2), -0.12, 0.022, 0.022, IRON, C_PLAIN)
            fbox(fr, s - LOWWIN["w"] / 2 - 0.08, s + LOWWIN["w"] / 2 + 0.08, hz(LOWWIN["sill"]) - 0.07, hz(LOWWIN["sill"]), 0.0, 0.07, WHITE, C_SILL)
    oculus(fr, c)

def portal(fr, c):
    """the portal (Silbel III / V): a proud block with a three-order round archivolt on colonnettes, the gold mosaic of the
    Virgin in the tympanum, a panelled double door; five blue-stone steps before it"""
    po, pd = PORTAL["outer"], PORTAL["proud"]
    vb, vf, vt = hz(HB + 0.05), hz(FLOOR), hz(PORTAL["top"])
    w2 = PORTAL["w"] / 2
    outer = arched(c - po, c + po, vb, vt, n=16)
    # stepped orders: concentric recesses from the block's face (pd) to the door plane (dd)
    orders = 1 if FAR() else 3
    rs = [po - (po - w2) * k / orders for k in range(orders + 1)]
    rs[0] = po
    rs = [rs[0]] + [w2 + (po - 0.18 - w2) * (orders - k) / orders for k in range(1, orders + 1)] if orders > 1 else [po, w2]
    ds = [pd - (pd + 0.25) * k / orders for k in range(orders + 1)]
    oline = lambda r: arched(c - r, c + r, vf, vt, n=16)
    # the block's front (the hole = the first order), its sides
    fill2d(fr, [outer, oline(rs[1])], pd, WHITE, C_SUR)
    strip2d(fr, outer, 0.0, pd, WHITE, C_SUR, inward=False)
    for k in range(orders):
        strip2d(fr, oline(rs[k + 1]), ds[k], ds[k + 1], WHITE, C_SUR)
        if k < orders - 1:
            fill2d(fr, [oline(rs[k + 1]), oline(rs[k + 2])], ds[k + 1], WHITE, C_SUR)
    dd = ds[-1]
    # the door: two leaves under the tympanum (code door), raised panels
    lint = vt
    fill2d(fr, [rect(c - w2, vf, c + w2, lint)], dd, WOOD, C_DOOR)
    # the tympanum: gold mosaic in the arch (Silbel V)
    fill2d(fr, [ccw([(c + w2 * math.cos(math.pi * k / 16), lint + w2 * math.sin(math.pi * k / 16)) for k in range(17)])], dd, IRON, C_MOSAIC)
    if not FAR():
        fbox(fr, c - w2 + 0.01, c + w2 - 0.01, lint - 0.06, lint + 0.08, dd, dd + 0.1, WHITE, C_SUR)   # the lintel band
        for s0 in (c - w2 + 0.1, c + 0.1):
            s1 = s0 + w2 - 0.2
            for j in range(4):
                v0 = vf + 0.2 + j * (lint - vf - 0.35) / 4
                v1 = v0 + (lint - vf - 0.35) / 4 - 0.1
                fbox(fr, s0, s1, v0, v1, dd, dd + 0.035, WOOD, C_DOOR)
        bar(fr, (c, vf), (c, lint - 0.06), dd, 0.03, 0.04, WOOD, C_DOOR)
        # colonnettes in the orders' corners (Silbel V: turned shafts, cushion capitals)
        for side in (-1, 1):
            for k in range(orders):
                s_ = c + side * (rs[k + 1] + 0.0)
                base = fr.p(s_, vf, ds[k + 1] + 0.04)
                prof = [(0.0, 0.0), (0.1, 0.0), (0.1, 0.12), (0.075, 0.18), (0.075, vt - vf - 0.35), (0.1, vt - vf - 0.3), (0.11, vt - vf - 0.12),
                        (0.12, vt - vf - 0.05), (0.12, vt - vf), (0.0, vt - vf)]
                lathe(base, prof, 10, WHITE, C_SUR)
        # the archivolt's outer roll on the block face
        moulding(fr, arch_path(c, vt, po - 0.06, legs=0.0), pd, ((0.0, -0.12), (0.06, -0.1), (0.08, -0.06), (0.06, -0.01), (0.0, 0.0)), WHITE, C_SUR)
        # impost blocks at the springing
        fbox(fr, c - po - 0.04, c - rs[1] - 0.02, vt - 0.14, vt, pd - 0.02, pd + 0.05, WHITE, C_SUR, skip=())
        fbox(fr, c + rs[1] + 0.02, c + po + 0.04, vt - 0.14, vt, pd - 0.02, pd + 0.05, WHITE, C_SUR, skip=())
    steps(fr, c)

def steps(fr, c):
    """five blue-stone steps from the path (DTM 48.3) to the floor, 3.4 m wide; a landing; white tube handrails"""
    n = 5; rise = (FLOOR - G_FRONT) / n; tread = 0.32
    land = 0.9
    half = 1.75
    pd, po = PORTAL["proud"], PORTAL["outer"]
    # the landing beside the portal block (its threshold reveals carry the floor between the block's sides)
    fbox(fr, c - half, c - po, hz(HB + 0.2), hz(FLOOR), 0.0, pd, BLUE, C_PLAIN, skip=("back", "right", "front"))
    fbox(fr, c + po, c + half, hz(HB + 0.2), hz(FLOOR), 0.0, pd, BLUE, C_PLAIN, skip=("back", "left", "front"))
    d_prev = pd
    for k in range(n):
        top = FLOOR - rise * k
        d1 = PORTAL["proud"] + land + tread * k
        fbox(fr, c - half, c + half, hz(HB + 0.2), hz(top), d_prev, d1, BLUE, C_PLAIN)
        d_prev = d1
    if not FAR():
        for side in (-1, 1):
            s = c + side * (half - 0.1)
            d0 = PORTAL["proud"] + 0.3; d1 = PORTAL["proud"] + land + tread * (n - 1) + tread / 2
            p0 = fr.p(s, hz(FLOOR) + 0.95, d0)
            p1 = fr.p(s, hz(FLOOR - rise * (n - 1)) + 0.95, d1)
            rodc(p0, p1, 0.022, WHITE, C_FRAME)
            for q in (p0, p1):
                rodc(Vector((q.x, q.y, q.z - 0.97)), q + Z * 0.02, 0.02, WHITE, C_FRAME)

def oculus(fr, c):
    """the round window over the portal in its fluted 'sunburst' disc (24 flutes, Silbel III close-up), a cross of bars"""
    v = hz(OCULUS["v"]); r0, r1 = OCULUS["r"], OCULUS["shell"]
    opening(fr, circle(c, v, r0, 8 if FAR() else 24), 0.3)
    if FAR():
        fill2d(fr, [circle(c, v, r1, 12), circle(c, v, r0, 8)], 0.04, WHITE, C_SCULPT)
        return
    glazing(fr, c - r0, c + r0, v - r0, v + r0, -0.28, nx=1, ny=1)
    n = 24; K.B.new_group()
    for k in range(n):
        a0 = 2 * math.pi * k / n; a1 = 2 * math.pi * (k + 1) / n; am = (a0 + a1) / 2
        rings = [r0 + 0.05, r0 + 0.25, r1 - 0.12, r1]
        dep = lambda rr, mid: (0.03 + 0.1 * (rr - r0) / (r1 - r0)) * (1.0 if mid else 0.35) if rr < r1 - 0.01 else 0.02
        for j in range(len(rings) - 1):
            ra, rb = rings[j], rings[j + 1]
            for (x0, x1, m0, m1) in ((a0, am, False, True), (am, a1, True, False)):
                pts = [fr.p(c + ra * math.cos(x0), v + ra * math.sin(x0), dep(ra, m0)), fr.p(c + rb * math.cos(x0), v + rb * math.sin(x0), dep(rb, m0)),
                       fr.p(c + rb * math.cos(x1), v + rb * math.sin(x1), dep(rb, m1)), fr.p(c + ra * math.cos(x1), v + ra * math.sin(x1), dep(ra, m1))]
                face_dir(pts, fr.N, WHITE, C_SCULPT)
    # the disc's rim + the ring round the glass
    lathe_axis(fr.p(c, v, 0.0), fr.N, Z, [(r1, 0.0), (r1, 0.02), (r1 + 0.04, 0.03), (r1 + 0.04, 0.0)], 32, WHITE, C_SCULPT)
    lathe_axis(fr.p(c, v, 0.0), fr.N, Z, [(r0, 0.0), (r0, 0.06), (r0 + 0.05, 0.06), (r0 + 0.05, 0.03)], 24, WHITE, C_SCULPT)

def side_face(fr, L, side):
    """the north / south / east walls: three bays; the north + south get the front's slits in the outer bays and a tall
    round-headed window in the middle (ESTIMATED: no usable photo; Silbel VI shows the south wall's west end plain);
    the east wall is the apse's back (its roof meets it)"""
    vb, vt = hz(HB), hz(WALL_TOP)
    holes = []; wins = []
    if side in ("N", "S"):
        sc = [(PIL_C + L / 3 - PIL_I / 2) / 2, L / 2, (L - PIL_C + 2 * L / 3 + PIL_I / 2) / 2]
        for i, s in enumerate(sc):
            if i == 1:
                h = arched(s - 0.45, s + 0.45, hz(52.6), hz(55.2)); holes.append(h); wins.append(("big", s, h))
            else:
                h = rect(s - SLIT["w"] / 2, hz(SLIT["sill"]), s + SLIT["w"] / 2, hz(SLIT["top"])); holes.append(h); wins.append(("slit", s, h))
            lw = arched(s - LOWWIN["w"] / 2, s + LOWWIN["w"] / 2, hz(LOWWIN["sill"] + 0.3), hz(LOWWIN["spring"] + 0.3))
            if i != 1: holes.append(lw); wins.append(("low", s, lw))
    fill2d(fr, [rect(0, vb, L, vt)] + holes, 0.0, WHITE, C_PLAIN)
    for kind, s, h in wins:
        opening(fr, h, 0.32)
        if kind == "big":
            glazing(fr, s - 0.45, s + 0.45, hz(52.6), hz(55.2), -0.3, nx=1, ny=3)
            moulding(fr, arch_path(s, hz(55.2), 0.52, legs=55.2 - 52.6 + 0.07), 0.0, PROF_SUR, WHITE, C_SUR)
            if not FAR(): fbox(fr, s - 0.6, s + 0.6, hz(52.6) - 0.08, hz(52.6), 0.0, 0.08, WHITE, C_SILL)
        elif kind == "slit":
            glazing(fr, s - SLIT["w"] / 2, s + SLIT["w"] / 2, hz(SLIT["sill"]), hz(SLIT["top"]), -0.3, nx=0, ny=3)
            if not FAR(): fbox(fr, s - SLIT["w"] / 2 - 0.1, s + SLIT["w"] / 2 + 0.1, hz(SLIT["sill"]) - 0.07, hz(SLIT["sill"]), 0.0, 0.08, WHITE, C_SILL)

def pilasters(fr, L):
    """corner + inner pilasters (the left corner one wraps the corner; the right one stops at the corner)"""
    top = hz(CORN[0] - 0.37)                             # into the frieze band (59.88-60.3)
    fbox(fr, -PIL_PROUD, PIL_C, hz(HB), top, 0.0, PIL_PROUD, WHITE, C_PLAIN)
    fbox(fr, L - PIL_C, L, hz(HB), top, 0.0, PIL_PROUD, WHITE, C_PLAIN)
    for s in (L / 3, 2 * L / 3):
        fbox(fr, s - PIL_I / 2, s + PIL_I / 2, hz(HB), top, 0.0, PIL_PROUD, WHITE, C_PLAIN)
        if not FAR():          # the capital: a small impost block under the frieze
            fbox(fr, s - PIL_I / 2 - 0.05, s + PIL_I / 2 + 0.05, top - 0.27, top - 0.07, 0.0, PIL_PROUD + 0.05, WHITE, C_SUR)

# ------------------------------------------------------------------------------------------------ the kokoshnik tiers
def kokoshniks(fr, L, spring, depth, b_ratio=0.94, n=3, v_bot=None, recess=0.0, back_drop=0.0):
    """a tier of n semicircular kokoshniks on a face: the gable wall (from v_bot) up to the arcs, a white archivolt in
    each, and a copper HOOD behind each arch sloping back to the spring line at `depth` (the zakomary roofs)"""
    a = L / (2 * n); b = a * b_ratio
    vs = hz(spring)
    segs = 6 if FAR() else 16
    top = []
    for k in range(n):
        c = a * (2 * k + 1)
        top += [(c + a * math.cos(math.pi - math.pi * j / segs), vs + b * math.sin(math.pi - math.pi * j / segs)) for j in range(segs + 1)][(1 if k else 0):]
    loop = ccw([(0.0, hz(v_bot))] + top + [(L, hz(v_bot))])
    fill2d(fr, [loop], 0.0, WHITE, C_PLAIN)
    for k in range(n):
        c = a * (2 * k + 1)
        moulding(fr, arch_path(c, vs, a, b, n=segs), 0.0, PROF_KOK, WHITE, C_SUR)
        # the copper hood: front lip over the arch (0.15 proud) -> the spring line at `depth`; flat facets = the sheets
        K.B.new_group(); flat_group()
        lip = 0.15 if not FAR() else 0.05
        front = [(c + a * math.cos(math.pi - math.pi * j / segs), vs + 0.02 + (b + 0.05) * math.sin(math.pi - math.pi * j / segs)) for j in range(segs + 1)]
        edge = [(c + a * math.cos(math.pi - math.pi * j / segs), vs + b * math.sin(math.pi - math.pi * j / segs)) for j in range(segs + 1)]
        front[0] = (c - a, vs + 0.02); front[-1] = (c + a, vs + 0.02)      # no overlap with the neighbour's lip at a cusp
        # the depth is mitred near the face's ends: the corner hoods of two faces meet on the diagonal (a valley), not crossing
        dep = lambda s_: max(0.0, min(depth, s_, L - s_))
        for j in range(segs):
            (s0, v0), (s1, v1) = front[j], front[j + 1]
            A, B_ = fr.p(s0, v0, lip), fr.p(s1, v1, lip)
            C_, D_ = fr.p(edge[j + 1][0], vs + 0.02 - back_drop, -dep(edge[j + 1][0])), fr.p(edge[j][0], vs + 0.02 - back_drop, -dep(edge[j][0]))
            for tri in ((A, B_, C_), (A, C_, D_)):                    # two triangles: the mitred quads are not planar
                out = (tri[1] - tri[0]).cross(tri[2] - tri[0])
                if out.length > 1e-9: face_dir(list(tri), out if out.z > 0 else -out, CUB, C_PLAIN)
            # the lip's front band and its underside back to the gable
            (e0, f0), (e1, f1) = edge[j], edge[j + 1]
            face_dir([fr.p(s0, v0, lip), fr.p(s1, v1, lip), fr.p(e1, f1, lip), fr.p(e0, f0, lip)], fr.N, CUB, C_RIDGE)
            face_dir([fr.p(e0, f0, lip), fr.p(e1, f1, lip), fr.p(e1, f1, 0.0), fr.p(e0, f0, 0.0)],
                     fr.U * (c - (e0 + e1) / 2) + Z * (vs - (f0 + f1) / 2), CUB, C_RIDGE)

def tier_floor(u0, u1, w0, w1, h, mat=CUB):
    face_up([P(u0, w0, h), P(u1, w0, h), P(u1, w1, h), P(u0, w1, h)], mat, C_PLAIN)

def tiers():
    # tier 1 on the main walls (spring 61.25), hoods back into tier 2's walls
    for name, fr, L in body_faces(U0, U1, W0, W1):
        dep = {"W": T2["u0"] - U0, "E": U1 - T2["u1"], "N": T2["w0"] - W0, "S": W1 - T2["w1"]}[name] + 0.45
        kokoshniks(fr, L, T1_SPR, dep, b_ratio=0.94 if name in ("W", "E") else 0.98, v_bot=CORN[1] - 0.25)
    tier_floor(U0 + 0.3, U1 - 0.3, W0 + 0.3, W1 - 0.3, T1_SPR - 0.05)
    # tier 2: a block set back ~1 m (centred on the drum), its own kokoshniks; hoods to the drum's axis
    u0, u1, w0, w1 = T2["u0"], T2["u1"], T2["w0"], T2["w1"]
    for name, fr, L in body_faces(u0, u1, w0, w1):
        dep = {"W": DOME_U - u0, "E": u1 - DOME_U, "N": DOME_W - w0, "S": w1 - DOME_W}[name] - 0.6
        kokoshniks(fr, L, T2["spr"], dep, b_ratio=1.0 if name in ("W", "E") else 0.96, v_bot=T1_SPR - 0.1, back_drop=0.0)
    tier_floor(u0 + 0.2, u1 - 0.2, w0 + 0.2, w1 - 0.2, T2["spr"] - 0.05)

# ------------------------------------------------------------------------------------------------ drum + onion
def drum():
    c = P(DOME_U, DOME_W, OY)
    segs = 16 if FAR() else 72
    h0, h1 = hz(T2["spr"] - 0.1), hz(DRUM_TOP)
    wins = [(a, 0.44, hz(65.3), hz(66.75), 0.35) for a in (0.0, math.pi / 2, math.pi, 3 * math.pi / 2)]   # Luc Viatour: 65.2-67.0
    # the window band in panels; plain bands below / above (same segment angles: no T-junctions)
    hw0, hw1 = hz(65.05), hz(67.2)
    step = 2 * math.pi / segs
    K.B.new_group(); gid = K.B.grp
    cyl_band(c, DRUM_R, h0, hw0, [k * step for k in range(segs + 1)], WHITE)
    cyl_wall_with_windows(c, DRUM_R, hw0, hw1, segs, wins)
    K.B.grp = gid
    cyl_band(c, DRUM_R, hw1, h1, [k * step for k in range(segs + 1)], WHITE)
    K.B.new_group()
    if not FAR():
        # the 'begunets' band (Silbel I: a row of diamond-set squares), the blind arcature over it, a plain band below
        lathe(Vector((c.x, c.y, hz(67.3))), [(DRUM_R, 0.0), (DRUM_R + 0.05, 0.0), (DRUM_R + 0.05, 0.07), (DRUM_R, 0.08)], segs, WHITE, C_BAND)
        lathe(Vector((c.x, c.y, hz(67.86))), [(DRUM_R, 0.0), (DRUM_R + 0.05, 0.0), (DRUM_R + 0.05, 0.07), (DRUM_R, 0.08)], segs, WHITE, C_BAND)
        nd = 40
        for k in range(nd):
            a = 2 * math.pi * (k + 0.5) / nd
            fr = CylFrame(c, DRUM_R, a)
            v = hz(67.62); s = 0.14
            K.B.new_group()
            pts = [(0, v - s), (s, v), (0, v + s), (-s, v)]
            flat_group()
            tip = fr.p(0, v, 0.05)
            for i in range(4):
                (s0, v0), (s1, v1) = pts[i], pts[(i + 1) % 4]
                face_dir([fr.p(s0, v0, 0.0), fr.p(s1, v1, 0.0), tip], fr.N, WHITE, C_SCULPT)
        na = 24
        for k in range(na):
            a = 2 * math.pi * (k + 0.5) / na
            fr = CylFrame(c, DRUM_R, a)
            rr = math.pi * DRUM_R / na - 0.06
            sweep2d(fr, arch_path(0.0, hz(68.12), rr, n=8, legs=0.16), [(0.0, -0.06), (0.04, -0.06), (0.05, -0.03), (0.04, 0.0), (0.0, 0.0)], WHITE, C_SCULPT, caps=True)
        # the crowning cornice (corbelled out under the onion)
        lathe(Vector((c.x, c.y, hz(68.33))), [(DRUM_R, 0.0), (DRUM_R + 0.07, 0.0), (DRUM_R + 0.07, 0.06), (DRUM_R + 0.13, 0.09), (DRUM_R + 0.13, 0.2),
                                             (DRUM_R - 0.05, 0.2)], segs, WHITE, C_CORN)
    else:
        lathe(Vector((c.x, c.y, hz(68.1))), [(DRUM_R, 0.0), (DRUM_R + 0.15, 0.2), (DRUM_R + 0.15, 0.43), (DRUM_R - 0.05, 0.43)], segs, WHITE, C_CORN)
    onion(Vector((c.x, c.y, hz(DRUM_TOP))), 1.0, ONION_TOP - DRUM_TOP, segs=16 if FAR() else 48, seams=0 if FAR() else 24)
    cross(Vector((c.x, c.y, hz(ONION_TOP))), 1.0, chains=not FAR(), dome_r=2.7, dome_h=hz(DRUM_TOP) + 1.1)

ONION = [(0.0, 0.0), (0.95, 0.0), (0.99, 0.025), (1.05, 0.07), (1.1, 0.15), (1.12, 0.24), (1.1, 0.34), (1.04, 0.46), (0.92, 0.58), (0.74, 0.7),
         (0.53, 0.8), (0.33, 0.88), (0.18, 0.945), (0.1, 0.98), (0.05, 1.0), (0.01, 1.003)]      # Luc Viatour frontal: widest at ~1/4, a long taper

def onion(base, scale, height, segs=48, seams=24, mat=CUB):
    """an onion dome: radius in units of the drum radius x scale (ONION: (r / R, h / H)), seams (standing ribs)"""
    R = 2.5 * scale
    prof = [(r * R, h * height) for r, h in ONION]
    lathe(base, prof, segs, mat, C_PLAIN, cap_top=True)
    if seams:
        for j in range(seams):
            a = 2 * math.pi * (j + 0.5) / seams
            d = Vector((math.cos(a), math.sin(a), 0))
            path = [base + d * (r * R - 0.012 * scale) + Z * (h * height) for r, h in ONION[2:-3]]
            sweep3d(path, [(-0.012 * scale, 0.0), (-0.012 * scale, 0.04 * scale), (0.012 * scale, 0.04 * scale), (0.012 * scale, 0.0)], d, mat, C_RIDGE, caps=True)

def cross(t, k=1.0, chains=False, dome_r=2.7, dome_h=0.0):
    """the gilt ball on a neck and the Orthodox cross (three bars, the lowest slanted), arms across the axis (seen flat
    from the west); the main dome's cross has four guy chains to the onion (Silbel I, Luc Viatour)"""
    segs = 6 if FAR() else 14
    lathe(t + Z * (-0.08 * k), [(0.0, 0.0), (0.12 * k, 0.0), (0.1 * k, 0.1 * k), (0.07 * k, 0.16 * k), (0.12 * k, 0.2 * k), (0.2 * k, 0.3 * k),
                                (0.21 * k, 0.4 * k), (0.18 * k, 0.5 * k), (0.1 * k, 0.57 * k), (0.05 * k, 0.6 * k), (0.0, 0.61 * k)], segs, IRON, C_GILT)
    D = Vector((0, 1, 0))
    b = t + Z * 0.55 * k
    H = 1.9 * k
    r = 0.035 * k
    rodc(b, b + Z * H, r, IRON, C_GILT, segs=6)
    rodc(b + Z * H * 0.72 - D * 0.45 * k, b + Z * H * 0.72 + D * 0.45 * k, r, IRON, C_GILT, segs=6)
    rodc(b + Z * H * 0.9 - D * 0.22 * k, b + Z * H * 0.9 + D * 0.22 * k, r * 0.9, IRON, C_GILT, segs=6)
    rodc(b + Z * (H * 0.3 - 0.12 * k) - D * 0.3 * k, b + Z * (H * 0.3 + 0.12 * k) + D * 0.3 * k, r * 0.9, IRON, C_GILT, segs=6)
    if chains:
        for j in range(4):
            a = math.pi / 4 + j * math.pi / 2
            dd = Vector((math.cos(a), math.sin(a), 0))
            top = b + Z * H * 0.72 + (D * 0.4 * k if dd.y > 0 else -D * 0.4 * k)
            low = Vector((t.x, t.y, dome_h)) + dd * dome_r * 0.98
            rodc(top, low, 0.01, IRON, C_PLAIN, segs=4)

# ------------------------------------------------------------------------------------------------ apse, link, annex, belfry
def apse():
    """the semicircular apse (estimated: three narrow windows), its cornice and a copper half-cone roof to the east wall"""
    cu, cw = APSE_C; R = APSE_R
    c = P(cu, cw, OY)
    a_end = math.acos((U1 - cu) / R)                  # the angle (from +u) where the arc meets the east wall
    # Blender angles: +u = +x, +w = -y  ->  angle_bl = -angle_uw
    segs = 12 if FAR() else 40
    a0, a1 = -a_end, a_end                            # uw angles from -a_end (north) to +a_end (south)
    angs_uw = [a0 + (a1 - a0) * k / segs for k in range(segs + 1)]
    bl = [-a for a in angs_uw][::-1]                  # increasing Blender angles
    wins = [(-0.62, 0.4, hz(52.7), hz(54.0), 0.3), (0.0, 0.4, hz(52.7), hz(54.0), 0.3), (0.62, 0.4, hz(52.7), hz(54.0), 0.3)]     # ESTIMATED: three narrow lights
    step = (bl[-1] - bl[0]) / segs
    # the wall in three bands (one smooth surface): plain below, the windows' band, plain above
    K.B.new_group(); gid = K.B.grp
    wb0, wb1 = hz(52.35), hz(54.75)
    cyl_band(c, R, hz(HB), wb0, [bl[0] + k * step for k in range(segs + 1)], WHITE)
    cyl_wall_with_windows(c, R, wb0, wb1, segs, wins, WHITE, a0=bl[0], arc=bl[-1] - bl[0])
    K.B.grp = gid
    cyl_band(c, R, wb1, hz(APSE_TOP), [bl[0] + k * step for k in range(segs + 1)], WHITE)
    K.B.new_group()
    # cornice + plinth bands (arcs)
    if not FAR():
        for (h0, prof) in ((APSE_TOP - 0.35, [(R, 0.0), (R + 0.06, 0.0), (R + 0.06, 0.1), (R + 0.14, 0.18), (R + 0.14, 0.28), (R + 0.2, 0.31), (R + 0.2, 0.42), (R - 0.05, 0.42)]),
                           (HB, [(R + 0.08, 0.0), (R + 0.08, PLINTH - HB), (R, PLINTH - HB + 0.08)])):
            ro = max(r_ for r_, _ in prof)
            ac = math.acos((U1 - 0.03 - cu) / ro)                       # the arc ends INSIDE the east wall
            lathe_axis(Vector((c.x, c.y, hz(h0))), Z, Vector((math.cos(-ac), math.sin(-ac), 0)), prof, segs, WHITE, C_CORN if h0 > 50 else C_PLINTH, a0=0.0, arc=2 * ac)
    # the roof: a half cone from the eave circle (R + 0.3) to the apex, both ending inside the east wall
    apex = P(U1 - 0.05, cw, APSE_APEX)
    K.B.new_group()
    re = R + (0.3 if not FAR() else 0.2)
    eh = hz(APSE_TOP + 0.07)
    ar = math.acos((U1 - 0.03 - cu) / re)
    ring = [Vector((c.x + math.cos(a) * re, c.y + math.sin(a) * re, eh)) for a in [-ar + 2 * ar * k / segs for k in range(segs + 1)]]
    flat_group()
    for i in range(segs):
        face_dir([ring[i], ring[i + 1], apex], Z, CUB, C_PLAIN)
    for i in range(segs):           # the roof's edge (thickness) facing out
        a, b_ = ring[i], ring[i + 1]
        face_dir([a, b_, b_ - Z * 0.08, a - Z * 0.08], (a + b_) / 2 - Vector((c.x, c.y, (a.z + b_.z) / 2)), CUB, C_RIDGE)
    face_dir([ring[i] - Z * 0.08 for i in range(segs + 1)][::-1] + [Vector((c.x, c.y, eh - 0.08))], -Z, CUB, C_PLAIN)

def link():
    """the low flat-roofed link (UrbIS 52.21) between the apse, the south wall and the annex / belfry; an arched door on
    its south-west face (Silbel VI); walls painted like the church"""
    top = LINK_TOP
    L = ccw_uw(LINK); n = len(L)
    K.B.new_group()
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        if abs(a[0] - U1) < 0.01 and abs(b[0] - U1) < 0.01: continue        # against the church's east wall
        if a[1] < 0.5 and b[1] < 0.5: continue                              # inside the apse
        fr, Lseg = edge_frame(a, b)
        holes = []
        if abs(Lseg - 2.57) < 0.1:                                       # the south-west face (13.31, 5.77) -> (15.23, 7.48)
            door = arched(Lseg / 2 - 0.55, Lseg / 2 + 0.55, hz(FLOOR - 0.15), hz(51.2))
            holes = [door]
        fill2d(fr, [rect(0, hz(HB), Lseg, hz(top))] + holes, 0.0, WHITE, C_PLAIN)
        for h in holes:
            strip2d(fr, h, 0.0, -0.3, WHITE, C_SUR)
            fill2d(fr, [h], -0.3, WOOD, C_DOOR)
            moulding(fr, arch_path(Lseg / 2, hz(51.2), 0.62, legs=51.2 - FLOOR + 0.15), 0.0, PROF_SUR, WHITE, C_SUR)
            fbox(fr, Lseg / 2 - 0.7, Lseg / 2 + 0.7, hz(HB), hz(FLOOR - 0.15), 0.0, 0.45, BLUE, C_PLAIN)
    # coping + flat roof (zinc), a parapet lip
    ring_prism(offset_uw(LINK, 0.11), top - 0.05, top + 0.12, WHITE, C_COPING, top=False, bottom_to=LINK)
    face_up([P(p[0], p[1], top + 0.12) for p in offset_uw(LINK, 0.11)], ZINC, C_PLAIN)

def annex():
    """the annex (UrbIS: hipped roof, eaves 57.97, ridge 59.89, turned ~30 deg to the church): plain painted walls, a
    cornice, two windows on each long side (ESTIMATED), a dark metal hipped roof; the round stair turret at its south corner"""
    E = ccw_uw(ANNEX_EAVE)
    walls = offset_uw(E, -ANNEX["inset"])
    for i in range(4):
        a, b = walls[i], walls[(i + 1) % 4]
        fr, Lseg = edge_frame(a, b)
        holes = []
        if Lseg > 4.0:
            for s in (Lseg * 0.3, Lseg * 0.7):
                for (v0, v1) in ((51.0, 52.6), (54.3, 55.9)):
                    holes.append((s, v0, v1, arched(s - 0.4, s + 0.4, hz(v0), hz(v1))))
        fill2d(fr, [rect(0, hz(HB), Lseg, hz(ANNEX["wall"]))] + [h[3] for h in holes], 0.0, WHITE, C_PLAIN)
        for s, v0, v1, h in holes:
            opening(fr, h, 0.3)
            glazing(fr, s - 0.4, s + 0.4, hz(v0), hz(v1), -0.28, nx=1, ny=2)
            moulding(fr, arch_path(s, hz(v1), 0.47, legs=v1 - v0 + 0.07), 0.0, PROF_SUR, WHITE, C_SUR)
    cornice_ring(walls, ANNEX["wall"] - 0.35, ANNEX["wall"] + 0.05, 0.25)
    # the hipped roof: eaves ring (UrbIS outline) -> the ridge along the long axis
    cu = sum(p[0] for p in E) / 4; cw = sum(p[1] for p in E) / 4
    l01 = math.hypot(E[1][0] - E[0][0], E[1][1] - E[0][1]); l12 = math.hypot(E[2][0] - E[1][0], E[2][1] - E[1][1])
    i0 = 0 if l01 >= l12 else 1
    ax = ((E[i0 + 1][0] - E[i0][0]), (E[i0 + 1][1] - E[i0][1])); la = math.hypot(*ax); ax = (ax[0] / la, ax[1] / la)
    half_ridge = max(max(l01, l12) / 2 - min(l01, l12) / 2, 0.3)
    r0 = P(cu - ax[0] * half_ridge, cw - ax[1] * half_ridge, ANNEX["ridge"]); r1 = P(cu + ax[0] * half_ridge, cw + ax[1] * half_ridge, ANNEX["ridge"])
    eh = ANNEX["eave"]
    ev = [P(p[0], p[1], eh) for p in E]
    K.B.new_group(); flat_group()
    for i in range(4):
        a, b = ev[i], ev[(i + 1) % 4]
        e = (b - a).normalized()
        if abs(e.dot((r1 - r0).normalized())) > 0.7:                    # a long side: a trapezoid to the ridge
            x, y = (r0, r1) if (a - r0).length < (a - r1).length else (r1, r0)
            face_dir([a, b, y, x], Z, ZINC, C_PLAIN)
        else:                                                           # a hip end: a triangle
            m = (a + b) / 2
            face_dir([a, b, r0 if (m - r0).length < (m - r1).length else r1], Z, ZINC, C_PLAIN)
        out = Vector((e.y, -e.x, 0))
        face_dir([a, b, b - Z * 0.1, a - Z * 0.1], out, ZINC, C_RIDGE)
    face_dir([p - Z * 0.1 for p in ev], -Z, ZINC, C_PLAIN)
    if not FAR():
        sweep3d([r0, r1], [(-0.06, -0.03), (-0.06, 0.04), (0.06, 0.04), (0.06, -0.03)], Z, ZINC, C_RIDGE, caps=True)
        for i in range(4):                                              # the hips, stopping short of the ridge cap
            r = r0 if (ev[i] - r0).length < (ev[i] - r1).length else r1
            sweep3d([ev[i] + (r - ev[i]) * 0.02, ev[i] + (r - ev[i]) * 0.93], [(-0.04, -0.02), (-0.04, 0.03), (0.04, 0.03), (0.04, -0.02)], Z, ZINC, C_RIDGE, caps=True)
    # the round stair turret (UrbIS: a half round at the annex's south corner, cone 57.97 -> 59.02)
    tc = P(TURRET["c"][0], TURRET["c"][1], OY)
    segs = 12 if FAR() else 64
    lathe(Vector((tc.x, tc.y, hz(HB))), [(TURRET["r"], 0.0), (TURRET["r"], TURRET["eave"] - 0.2 - HB)], segs, WHITE, C_PLAIN)
    lathe(Vector((tc.x, tc.y, hz(TURRET["eave"] - 0.2))), [(TURRET["r"], 0.0), (TURRET["r"] + 0.25, 0.12), (TURRET["r"] + 0.25, 0.2), (0.02, TURRET["apex"] - TURRET["eave"] + 0.2)], segs, ZINC, C_PLAIN, cap_top=True)

def belfry():
    """the bell tower (Silbel VI; UrbIS octagonal tent): an octagonal shaft, a band, the bell stage with eight round-
    arched openings (dark boarded core inside), a cornice, the octagonal tent roof, a small onion and cross"""
    cu, cw = BEL["c"]; rc = BEL["rc"]
    n = 8
    rf = rc * math.cos(math.pi / n)                   # across flats / 2
    side = 2 * rc * math.sin(math.pi / n)
    gb = BEL["ground"]
    corners = [(cu + rc * math.cos(BEL["rot"] + 2 * math.pi * k / n), cw + rc * math.sin(BEL["rot"] + 2 * math.pi * k / n)) for k in range(n)]
    L = ccw_uw(corners)
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        fr, _ = edge_frame(a, b)
        mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        facing_link = mid[1] < cw - 1.0                                   # the north faces meet the link / annex
        # the shaft
        holes = []
        if i % 2 == 0 and not FAR() and not facing_link:
            holes.append(arched(side / 2 - 0.22, side / 2 + 0.22, hz(52.0), hz(53.1)))
        fill2d(fr, [rect(0, hz(HB), side, hz(BEL["band"]))] + holes, 0.0, WHITE, C_PLAIN)
        for h in holes: opening(fr, h, 0.3)
        # the bell stage: an arched opening in each face
        s0, s1 = hz(BEL["stage"][0]), hz(BEL["stage"][1])
        op = arched(side / 2 - 0.42, side / 2 + 0.42, hz(57.25), hz(58.95), n=16)
        fill2d(fr, [rect(0, s0 - 0.05, side, s1 + 0.05), op], 0.0, WHITE, C_PLAIN)
        strip2d(fr, op, 0.0, -0.45, WHITE, C_SUR)
        fill2d(fr, [op], -1.0, WOOD, C_LOUVRE)                             # the dark boarded core behind
        moulding(fr, arch_path(side / 2, hz(58.95), 0.5, legs=58.95 - 57.25 + 0.04), 0.0, PROF_SUR, WHITE, C_SUR)
        if not FAR():
            fbox(fr, side / 2 - 0.55, side / 2 + 0.55, hz(57.25) - 0.08, hz(57.25), 0.0, 0.08, WHITE, C_SILL)
            # the inner side walls of the opening's depth to the core (closed box)
            strip2d(fr, op, -0.45, -1.0, WOOD, C_LOUVRE)
    # bands and cornices round the octagon
    cornice_ring(L, BEL["band"] - 0.05, BEL["stage"][0] + 0.05, 0.14, steps=2)
    cornice_ring(L, BEL["corn"][0] - 0.05, BEL["corn"][1], 0.28)
    if not FAR(): ring_prism(offset_uw(L, 0.08), HB, gb + 0.45, WHITE, C_PLINTH, top=True)
    # the tent roof
    K.B.new_group()
    er = BEL["eave_r"]
    ev = [P(cu + er * math.cos(BEL["rot"] + 2 * math.pi * k / n), cw + er * math.sin(BEL["rot"] + 2 * math.pi * k / n), BEL["corn"][1] + 0.04) for k in range(n)]
    ev = [P(p[0], p[1], 0) for p in []] or ev
    apex = P(cu, cw, BEL["apex"])
    flat_group()
    for i in range(n):
        a, b_ = ev[i], ev[(i + 1) % n]
        face_dir([a, b_, apex], Z, CUB, C_PLAIN)
        m = (a + b_) / 2
        face_dir([a, b_, b_ - Z * 0.1, a - Z * 0.1], m - Vector((apex.x, apex.y, m.z)), CUB, C_RIDGE)
    face_dir([p - Z * 0.1 for p in ev], -Z, CUB, C_PLAIN)
    if not FAR():
        for i in range(n):                                                   # hip rolls
            sweep3d([ev[i] + (apex - ev[i]) * 0.02, ev[i] + (apex - ev[i]) * 0.88], [(-0.035, -0.02), (-0.035, 0.03), (0.035, 0.03), (0.035, -0.02)], Z, CUB, C_RIDGE, caps=True)
    # the small drum, onion and cross
    t = P(cu, cw, BEL["apex"] - 0.45)
    lathe(t, [(0.0, 0.0), (0.3, 0.0), (0.3, 0.55), (0.36, 0.6), (0.36, 0.68), (0.0, 0.68)], 8 if FAR() else 16, CUB, C_PLAIN)
    onion(t + Z * 0.68, 0.19, 1.05, segs=10 if FAR() else 24, seams=0 if FAR() else 12)
    cross(t + Z * (0.68 + 1.05), 0.55)

# ------------------------------------------------------------------------------------------------ assemble
def main_body():
    rect_uw = [(U0, W0), (U1, W0), (U1, W1), (U0, W1)]
    for name, fr, L in body_faces(U0, U1, W0, W1):
        if name == "W": front_west(fr, L)
        else: side_face(fr, L, name)
        pilasters(fr, L)
    cornice_ring(offset_uw(rect_uw, PIL_PROUD), CORN[0], CORN[1], 0.32)
    # the frieze band under the cornice (Melioratif 2017: a plain band, then the cornice), closed underneath to the wall
    ring_prism(offset_uw(rect_uw, PIL_PROUD + 0.04), CORN[0] - 0.42, CORN[0], WHITE, C_BAND, top=False, bottom_to=rect_uw)
    # the plinth (painted, 0.06 proud of the pilasters, chamfered top, its top closed back to the wall)
    ch = 0.06 if not FAR() else 0.0
    ring_prism(offset_uw(rect_uw, PIL_PROUD + 0.06), HB, PLINTH, WHITE, C_PLINTH, top=False, chamfer=ch, top_to=rect_uw)

def build_all():
    main_body()
    tiers()
    drum()
    apse()
    link()
    annex()
    belfry()

build_all()
B_MAIN = K.B
print(f"LOD0: {len(B_MAIN.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = True
build_all()
B_FAR = K.B
K.FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
AO_SPLIT = 0.86
class GroupTag:
    """during SC.make_object: the first bmesh.ops.remove_doubles call (face order = the builder's there) writes each face's
    construction group into a face attribute 'grp_keep' that survives the welding (bmesh keeps face attributes)"""
    def __init__(self, bld): self.bld = bld; self.done = False
    def __enter__(self):
        import bmesh as real
        tag = self
        def wrapped(bm, **kw):
            if not tag.done:
                lay = bm.faces.layers.int.get("grp_keep") or bm.faces.layers.int.new("grp_keep")
                bm.faces.ensure_lookup_table()
                for f in bm.faces: f[lay] = tag.bld.g[f.index]
                tag.done = True
            return real.ops.remove_doubles(bm, **kw)
        class Ops:
            remove_doubles = staticmethod(wrapped)
            def __getattr__(self, k): return getattr(real.ops, k)
        class Bm:
            ops = Ops()
            def __getattr__(self, k): return getattr(real, k)
        self.real = real; SC.bmesh = Bm()
        return self
    def __exit__(self, *a):
        SC.bmesh = self.real

def sharpen(o, bld, angle=28.0, all_flat=False):
    """smoothing rule: edges between two construction groups (separate pieces: a hood and its neighbour, a moulding and its
    wall) are always sharp; within a piece, sharp above `angle` (28: an octagon's chamfered cornice corner, 31 deg, stays
    sharp)"""
    import bmesh
    me = o.data
    cnt = lambda: sum(1 for e in me.edges if e.use_edge_sharp)
    n0 = cnt()
    me.set_sharp_from_angle(angle=math.radians(angle))
    print(f"  sharp edges: {n0} -> {cnt()} (of {len(me.edges)})")
    bm = bmesh.new(); bm.from_mesh(me)
    lay = bm.faces.layers.int.get("grp_keep")
    flat = bld.__dict__.get("flat", set())
    n = 0
    if lay is not None:
        for e in bm.edges:
            lf = e.link_faces
            if not e.smooth: continue
            if all_flat or (len(lf) == 2 and lf[0][lay] != lf[1][lay]) or any(f[lay] in flat for f in lf): e.smooth = False; n += 1
    bm.to_mesh(me); bm.free()
    if "grp_keep" in me.attributes: me.attributes.remove(me.attributes["grp_keep"])
    print(f"  {o.name}: {n} group-border edges made sharp")

with GroupTag(B_MAIN):
    obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "Russian", B_MAIN, 0.0, AO_SPLIT, AO_PX)
with GroupTag(B_FAR):
    far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "Russian_far", B_FAR, AO_SPLIT + 0.005, 1.0, AO_PX)
sharpen(obj, B_MAIN)
sharpen(far, B_FAR, all_flat=True)      # the far variant (>= 300 m): flat facets everywhere (a 16-sided drum reads round at that range)
print(f"uv done {time.time() - T0:.1f}s")

def load_ground():
    import numpy as np
    g = _g
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(g["rows"], g["cols"]).astype(np.float64) / 100 + g["base"]
    st = 2
    a = a[::st, ::st]; step = g["step"] * st
    rows, cols = a.shape
    verts = []
    for r in range(rows):
        for c in range(cols):
            x, z = g["x0"] + c * step, g["z0"] + r * step
            u, w = G.local(x, z)
            verts.append((u, -w, a[r, c] - OY - 0.02))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    go = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(go)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.15, 1)
    gm.materials.append(gmat)
    return go
ground_obj = load_ground()

scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 3.0
ao_img = bpy.data.images.new("russian_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = [0.0] * (4 * len(me.loops)); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices: c[4 * li + 1] = max(0.25, min(1.0, a[4 * li]))
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])

if BAKE:
    scn.cycles.samples = 96 if "--fast" not in ARGS else 24
    scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)   # half the CPU: another agent shares this laptop
    t = time.time()
    objs = [obj, far]
    for i, target in enumerate(objs):
        for o in objs: o.hide_render = o is not target
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
    print(f"AO bake {time.time() - t:.1f}s")
    for target, th in ((obj, thin0), (far, thin1)):
        for o in objs: o.hide_render = o is not target
        vertex_ao(target, th)
    for o in objs: o.hide_render = False
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "russian_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "russian_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "russian.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
S_ = SITE["solids"]
info = {
    "asset": "Russian Orthodox church of Saint-Job, Avenue De Fre 19 (tools/blender/russian.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"brick_painted_white": "brick under thick white paint (the church's walls, photos 2015-2017: the coursing reads through the paint); not in the shared library yet",
                       "copper_brown": "copper sheet in its dark brown state (the onions and the hoods since the 2010s re-covering; green-painted before: Luc Viatour, Napoleon Vier 2005); shared with Saint-Pierre"},
    "uv": {"TEXCOORD_0": "world metres, per face", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 1.0], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1)},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                  "hides_solids": [S_["church"]["id"]], "hides_bu_ids": [S_["church"]["bu"]], "church_bu_id": S_["church"]["bu"]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "footprint_osm": SITE["footprint_local"]["osm"], "dome": SITE["dome"], "belfry": SITE["belfry"],
                 "dsm_peaks": SITE["dsm_peaks"], "ground_taw": SITE["ground"]},
    "levels_taw": {"ground_front": G_FRONT, "floor": FLOOR, "cornice": CORN, "tier1_spring": T1_SPR, "tier2_spring": T2["spr"], "drum_top": DRUM_TOP,
                   "onion_top": ONION_TOP, "apse": [APSE_TOP, APSE_APEX], "link": LINK_TOP, "annex": [ANNEX["eave"], ANNEX["ridge"]],
                   "belfry": {"band": BEL["band"], "stage": BEL["stage"], "eave": BEL["corn"][1], "apex": BEL["apex"]}},
    "estimated": "the north and south walls' windows (the front's slits + a tall round-headed window in the middle bay), the apse's windows, "
                 "the annex's windows and its hidden corner, the link's door, the belfry's lower shaft and its small windows, the cross sizes, "
                 "the onion's profile between the drum top (UrbIS) and the apex (DSM + photo proportions), the wall thicknesses (reveals 0.3 m)",
}
json.dump(info, open(os.path.join(OUT, "russian.json"), "w"), indent=1)

if PREVIEWS:
    cols = {"brick_painted_white": (0.78, 0.78, 0.76), "stone_blue": (0.12, 0.13, 0.14), "copper_brown": (0.1, 0.065, 0.045),
            "zinc_roof": (0.25, 0.26, 0.27), "wood_frame_dark": (0.12, 0.06, 0.03), "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.6, 0.42, 0.12)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else (0.4 if m.name in ("copper_brown", "cast_iron_green") else 0.85)
        if m.name in ("copper_brown", "cast_iron_green"): bsdf.inputs["Metallic"].default_value = 0.7
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(230))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 32; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, tgt, lens=28, res=(800, 1000)):
        cam.location = P(*pos); tg = P(*tgt)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"russian_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    only = [a.split("=")[1] for a in ARGS if a.startswith("--views=")]
    views = {"west": ((-22.0, 0.3, 49.9), (0.0, 0.3, 60.0), 24, (800, 1000)),
             "southwest": ((-14.0, 18.0, 49.9), (8.0, 4.0, 59.0), 22, (1000, 850)),
             "northwest": ((-12.0, -18.0, 49.9), (6.0, -2.0, 59.0), 22, (1000, 850)),
             "aerial": ((-22.0, 26.0, 82.0), (9.0, 3.0, 58.0), 26, (1000, 800)),
             "top": ((8.0, 3.0, 110.0), (8.0, 2.99, 50.0), 30, (900, 900)),
             "east": ((34.0, -6.0, 52.0), (10.0, 2.0, 60.0), 24, (1000, 850)),
             "drum": ((-6.0, -4.0, 66.0), (6.0, 0.1, 68.0), 35, (900, 800))}
    for k, (pos, tgt, lens, res) in views.items():
        if only and k not in only[0].split(","): continue
        look(k, pos, tgt, lens, res)
print(f"done {time.time() - T0:.1f}s")
