"""EGLISE NOTRE-DAME DU ROSAIRE (Uccle, wikidata Q3580420; 1930s, coursed rubble stone with blue-stone dressings, a tall
north-east tower and a small north-west one, cross gables on both sides, a polygonal apse): built entirely in code from
MEASURED data + photos (method and helpers as tools/blender/russian.py).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/rosaire.py -- models/rosaire [--no-bake] [--previews] [--fast]
      models/rosaire/rosaire.raw.glb  node "Rosaire" (LOD0) + "Rosaire_far"; one primitive per NAMED material slot
      models/rosaire/rosaire_ao.png   ambient occlusion (Cycles) in TEXCOORD_1
      models/rosaire/rosaire.json     measurements, slots, codes, placement, counts

INPUT: models/rosaire/site.json + site_dtm.* (tools/rosaire_measure.py). Photos: Commons (docs/landmarks/CHURCHES2.md):
the north front + tower (August Dominus 2025, CC0; Grentidez 2018), the east side (panoramio 2011 x3), the interior
(panoramio 2011). ESTIMATED: the west side's windows (as the east), the apse's windows, the annex, the towers' backs.
SWAPPABLE MATERIALS as the other heroes: COLOR_0.r = code, COLOR_0.g = thin-part AO, TEXCOORD_0 metres, TEXCOORD_1 AO.
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                             sweep3d, face_dir, face_up, quad, circle, offset_loop, arc_pts, ccw, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/rosaire")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "churches2")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]

SLOTS = ["rubble_stone", "stone_blue", "slate", "zinc_roof", "wood_frame_dark", "glass_window", "cast_iron_green"]
WHITE, BLUE, CUB, ZINC, WOOD, GLASS, IRON = range(7)   # WHITE = the rubble walls, CUB = slate (names kept from russian.py)
CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
         "gilt", "door", "mosaic", "frame", "lead"]
(C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_MOSAIC,
 C_FRAME, C_LEAD) = range(16)
C_QUOIN = C_PLINTH
FAR = lambda: K.FAR

# ------------------------------------------------------------------------------------------------ THE PLAN (measured + photos)
# frame (tools/rosaire_measure.py): u along the nave (north front -> south apse), w to the WEST; heights m TAW
NAVE_W, NAVE_U1 = 11.0, 45.25        # OSM: side walls w +11.00 / -10.95, the nave to u 44.6-45.0, the choir from 45
EAVE, RIDGE = 117.0, 128.2           # UrbIS eaves 117.0, DSM ridge 128.0-128.2 (45.5 deg)
XG_APEX = 120.5                      # the cross gables' apex (UrbIS 120.0-120.3, DSM 120-121 at the wall line)
BAY0 = 3.78; NBAYS = 6; BAY = (NAVE_U1 - BAY0) / NBAYS     # DSM: cross-gable ridges every 6.9 m
TOWER = (-2.89, 3.86, -14.0, -7.2)   # OSM / UrbIS: the north-east tower, 6.8 m square, 2.9 m proud of the front
TOWER_TOP, TURRET_TOP, TOWER_EAVE, TOWER_APEX = 136.9, 139.6, 141.7, 151.1   # UrbIS eaves 141.5-141.9, apex 151.14; DSM 150.98
SMALL_T = (-0.78, 3.78, 6.98, 11.54) # the north-west stair tower, 4.6 m square
SMALL_EAVE, SMALL_APEX = 124.8, 131.1                     # UrbIS 124.6-125.0 / 131.1
STAIR = (3.86, 7.6, -13.55, -10.95); STAIR_TOP = 111.0    # OSM jog behind the tower; DSM ~111-112
APSE_C, APSE_R, CHOIR_W = 52.4, 8.0, 8.2                 # OSM: half a dodecagon, r 7.9-8.3 round (52.4, 0)
APSE_EAVE, APSE_RIDGE = 113.6, 124.3                      # DSM ~113-115 at the apse's edge; UrbIS ridge 124.2-124.3
ANNEX = (45.25, 59.1, -18.68, -8.2); ANNEX_TOP = 108.0   # UrbIS 107.9-108.0
G_FRONT, FLOOR = 102.4, 103.8        # DTM before the portals 102.0-103.1; eight risers (photos)
HB = 100.5                           # walls go this far down (DTM min round the church 101.6)

def gnd(u, w): return G(u, w)

def frame_uw(u, w, nu, nw): return Frame(P(u, w, OY), Vector((nu, -nw, 0)))

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

# ------------------------------------------------------------------------------------------------ the church (Rosaire)
pointed = SC.pointed

def wall(fr, loop, holes=(), mat=WHITE, code=C_PLAIN):
    fill2d(fr, [loop] + list(holes), 0.0, mat, code)

def window(fr, s, w, v0, v1, depth=0.35, head="flat", bars=(1, 3), surround=True):
    """a window: hole, reveal, leaded glass, glazing bars; a blue-stone sill and (flat head) lintel"""
    if head == "flat": hole = rect(s - w / 2, hz(v0), s + w / 2, hz(v1))
    elif head == "round": hole = arched(s - w / 2, s + w / 2, hz(v0), hz(v1) - w / 2)
    else: hole = pointed(s - w / 2, s + w / 2, hz(v1) - w * 0.7, hz(v1), n=10, bottom=hz(v0))
    opening(fr, hole, depth, code=C_SUR)
    glazing(fr, s - w / 2, s + w / 2, hz(v0), hz(v1) - (w / 2 if head == "round" else 0), -depth + 0.03, nx=bars[0], ny=bars[1])
    if surround and not FAR():
        fbox(fr, s - w / 2 - 0.12, s + w / 2 + 0.12, hz(v0) - 0.14, hz(v0), 0.0, 0.07, BLUE, C_SILL)
        if head == "flat": fbox(fr, s - w / 2 - 0.12, s + w / 2 + 0.12, hz(v1), hz(v1) + 0.2, 0.0, 0.04, BLUE, C_SUR)
    return hole

def front():
    """the north front between the towers (Commons August Dominus 2025 frontal, Grentidez 2018): a gable to the nave's
    ridge, five tall flat-headed windows stepped to the middle, an oculus, three pointed portals in blue stone with
    tympana and panelled doors, a flight of blue-stone steps; a stone cross on the apex"""
    fr = Frame(P(0.0, -NAVE_W, OY), Vector((-1, 0, 0)))          # s = w + NAVE_W (east -> west), d = north of u 0
    L = 2 * NAVE_W
    loop = [(0, hz(HB)), (L, hz(HB)), (L, hz(EAVE)), (NAVE_W, hz(RIDGE)), (0, hz(EAVE))]
    holes = []
    wins = [(-4.05, 119.7), (-2.0, 121.5), (0.0, 123.1), (2.0, 121.5), (4.05, 119.7)]
    for w_, top in wins:
        holes.append(rect(NAVE_W + w_ - 0.62, hz(114.5), NAVE_W + w_ + 0.62, hz(top)))
    ocu = circle(NAVE_W, hz(125.4), 0.48, 10 if FAR() else 24)
    holes.append(ocu)
    portals = []
    for w_ in (-3.95, 0.0, 3.95):
        o = pointed(NAVE_W + w_ - 1.45, NAVE_W + w_ + 1.45, hz(108.0), hz(110.3), n=10, bottom=hz(FLOOR))
        holes.append(o); portals.append((NAVE_W + w_, o))
    wall(fr, loop, holes)
    for (w_, top), h in zip(wins, holes[:5]):
        s = NAVE_W + w_
        opening(fr, h, 0.4)
        glazing(fr, s - 0.62, s + 0.62, hz(114.5), hz(top), -0.37, nx=1, ny=int((top - 114.5) / 1.1))
        if not FAR():
            fbox(fr, s - 0.74, s + 0.74, hz(114.5) - 0.16, hz(114.5), 0.0, 0.08, BLUE, C_SILL)
    opening(fr, ocu, 0.4)
    glazing(fr, NAVE_W - 0.5, NAVE_W + 0.5, hz(125.4) - 0.5, hz(125.4) + 0.5, -0.37, nx=1, ny=1)          # the bars reach into the reveal
    if not FAR():
        sweep2d(fr, [(NAVE_W + 0.48 * math.cos(2 * math.pi * k / 24), hz(125.4) + 0.48 * math.sin(2 * math.pi * k / 24)) for k in range(24)],
                [(0.0, -0.14), (0.06, -0.14), (0.06, 0.0), (0.0, 0.0)], BLUE, C_SUR, closed=True, caps=False)
    for c, o in portals:
        # the arch's reveal to the door plane (blue stone), the door + tympanum there
        strip2d(fr, o, 0.0, -1.0, BLUE, C_SUR)
        dh = 107.3
        fill2d(fr, [rect(c - 1.05, hz(FLOOR), c + 1.05, hz(dh))], -1.0, WOOD, C_DOOR)
        tymp = [p for p in o if p[1] >= hz(dh) - 1e-6]
        tymp = ccw([(c - 1.45, hz(dh)), (c + 1.45, hz(dh))] + [p for p in tymp if p[1] > hz(dh) + 1e-6])
        fill2d(fr, [tymp], -1.0, BLUE, C_SCULPT)
        fill2d(fr, [rect(c - 1.45, hz(FLOOR), c - 1.05, hz(dh)), ], -1.0, BLUE, C_SUR)
        fill2d(fr, [rect(c + 1.05, hz(FLOOR), c + 1.45, hz(dh))], -1.0, BLUE, C_SUR)
        if not FAR():
            fbox(fr, c - 1.05, c + 1.05, hz(dh), hz(dh) + 0.25, -1.0, -0.82, BLUE, C_SUR)        # lintel
            for s0 in (c - 0.98, c + 0.04):
                for j in range(3):
                    v0 = hz(FLOOR) + 0.2 + j * (dh - FLOOR - 0.4) / 3
                    fbox(fr, s0, s0 + 0.94, v0, v0 + (dh - FLOOR - 0.4) / 3 - 0.12, -1.0, -0.96, WOOD, C_DOOR)
            # the archivolt: a blue-stone roll round the arch
            arc = [p for p in o if p[1] > hz(108.0) - 1e-6]
            arc = sorted(arc, key=lambda p: p[0])
            moulding(fr, [(c - 1.45, hz(108.0) - 2.0)] + arc + [(c + 1.45, hz(108.0) - 2.0)], 0.0, ((0.0, 0.0), (0.12, 0.0), (0.16, 0.06), (0.16, 0.3), (0.0, 0.34)), BLUE, C_SUR)
    if not FAR():
        # piers (blue stone) between and beside the portals
        for w_ in (-5.75, -1.975, 1.975, 5.75):
            fbox(fr, NAVE_W + w_ - 0.32, NAVE_W + w_ + 0.32, hz(HB), hz(108.6), 0.0, 0.18, BLUE, C_QUOIN)
        # the stone cross on the apex
        t = fr.p(NAVE_W, hz(RIDGE) + 0.15, 0.1)
        wbox(t + Z * 0.0, Vector((0, 1, 0)), Vector((1, 0, 0)), 0.14, 0.12, t.z, t.z + 1.6, BLUE, C_SCULPT)
        wbox(t, Vector((0, 1, 0)), Vector((1, 0, 0)), 0.45, 0.1, t.z + 0.95, t.z + 1.2, BLUE, C_SCULPT)
        # coping along the rakes
        coping(fr, L)
    steps(fr)

def steps(fr):
    """the flight of blue-stone steps before the portals (Grentidez 2018: eight risers, the full width of the portals)"""
    n = 8; g0 = G_FRONT; rise = (FLOOR - g0) / n; tread = 0.34
    s0, s1 = NAVE_W - 6.2, NAVE_W + 6.2
    land = 0.9
    fbox(fr, s0, s1, hz(HB + 0.3), hz(FLOOR), 0.0, land, BLUE, C_PLAIN)
    d_prev = land
    for k in range(1, n):
        top = FLOOR - rise * k
        d1 = land + tread * k
        fbox(fr, s0 - 0.0, s1 + 0.0, hz(HB + 0.3), hz(top), d_prev, d1, BLUE, C_PLAIN)
        d_prev = d1
    if not FAR():                                  # low cheek walls (rubble) both sides
        for a, b in ((s0 - 0.45, s0), (s1, s1 + 0.45)):
            fbox(fr, a, b, hz(HB + 0.3), hz(FLOOR + 0.6), 0.0, d_prev, WHITE, C_PLAIN)
            fbox(fr, a - 0.04, b + 0.04, hz(FLOOR + 0.6), hz(FLOOR + 0.72), 0.0, d_prev + 0.04, BLUE, C_COPING, skip=())

def side(sgn):
    """a side wall (sgn +1 west, -1 east): six bays of 6.9 m (DSM: the cross gables' ridges every 6.9 m from u 3.85),
    each with a cross gable to 120.5, two tall flat-headed windows up into the gable and two low ones (Commons
    'Le Rosaire - salles de reunions', 'N.D. du Rosaire avant le coucher du soleil': the east side), blue-stone
    buttresses between the bays"""
    wl = NAVE_W if sgn > 0 else -NAVE_W
    for k in range(NBAYS):
        u0 = BAY0 + BAY * k; u1 = u0 + BAY
        uc = BAY0 + BAY * k + BAY / 2
        if sgn > 0: fr = Frame(P(u0, wl, OY), Vector((0, -1, 0))); s_of = lambda u: u - u0
        else: fr = Frame(P(u1, wl, OY), Vector((0, 1, 0))); s_of = lambda u: u1 - u
        L = u1 - u0
        sc = s_of(uc)
        ga, gb = s_of(uc - BAY / 2), s_of(uc + BAY / 2)
        loop = [(0, hz(HB)), (L, hz(HB)), (L, hz(EAVE))]
        pk = sorted([(ga, hz(EAVE)), (sc, hz(XG_APEX)), (gb, hz(EAVE))], key=lambda p: -p[0])
        loop += [p for p in pk if -1e-6 <= p[0] <= L + 1e-6]
        loop += [(0, hz(EAVE))]
        clean = [loop[0]]
        for p in loop[1:]:
            if abs(p[0] - clean[-1][0]) > 1e-4 or abs(p[1] - clean[-1][1]) > 1e-4: clean.append(p)
        holes = []
        wins = []
        for ds in (-1.05, 1.05):
            s = sc + ds
            if 0.7 < s < L - 0.7:
                ug = (u0 + s) if sgn > 0 else (u1 - s)
                g = gnd(ug, wl + sgn * 0.5)
                for (v0, v1) in ((110.8, 118.6), (max(105.6, g + 0.7), 108.2)):
                    if v1 - v0 > 1.0: wins.append((s, v0, v1))
        for s, v0, v1 in wins: holes.append(rect(s - 0.5, hz(v0), s + 0.5, hz(v1)))
        wall(fr, ccw(clean), holes)
        for (s, v0, v1), h in zip(wins, holes):
            opening(fr, h, 0.38)
            glazing(fr, s - 0.5, s + 0.5, hz(v0), hz(v1), -0.35, nx=1, ny=max(1, int((v1 - v0) / 1.0)))
            if not FAR(): fbox(fr, s - 0.62, s + 0.62, hz(v0) - 0.15, hz(v0), 0.0, 0.08, BLUE, C_SILL)
        # the gable's coping + the buttress at the bay's end
        if not FAR():
            for ri_, (a, b) in enumerate((((ga, hz(EAVE)), (sc, hz(XG_APEX))), ((sc, hz(XG_APEX)), (gb, hz(EAVE))))):
                if min(a[0], b[0]) >= -1e-6 and max(a[0], b[0]) <= L + 1e-6:
                    dp = 0.08 + 0.02 * (k % 2) + 0.03 * ri_
                    sweep2d(fr, [a, b] if a[0] < b[0] else [b, a], [(0.0, -0.04), (dp, -0.04), (dp, 0.16), (0.0, 0.16)], BLUE, C_COPING, caps=True)
            if k < NBAYS - 1:
                be = s_of(BAY0 + BAY * (k + 1))
                fbox(fr, be - 0.3, be + 0.3, hz(HB), hz(EAVE - 1.2), 0.0, 0.32, WHITE, C_PLAIN)
                fbox(fr, be - 0.34, be + 0.34, hz(EAVE - 1.2), hz(EAVE - 1.0), 0.0, 0.36, BLUE, C_COPING, skip=())

def coping(fr, L):
    """the gable's blue-stone coping: 0.3 m over the roof line, reaching 0.25 m back over the roof's edge, the two rakes at
    different depths (they cross at the apex)"""
    k = (RIDGE - EAVE) / NAVE_W; ex = 0.2                  # each rake runs 0.2 m past the apex: its end is buried in the other
    for (a, b), dp in ((((0.0, hz(EAVE)), (NAVE_W + ex, hz(RIDGE) + ex * k)), 0.1), (((NAVE_W - ex, hz(RIDGE) + ex * k), (L, hz(EAVE))), 0.13)):
        sweep2d(fr, [a, b], [(-0.25, -0.06), (dp, -0.06), (dp, 0.3), (-0.25, 0.3)], BLUE, C_COPING, caps=True)

def south_gable():
    fr = Frame(P(NAVE_U1, NAVE_W, OY), Vector((1, 0, 0)))         # s = NAVE_W - w (west -> east), facing south
    L = 2 * NAVE_W
    wall(fr, [(0, hz(HB)), (L, hz(HB)), (L, hz(EAVE)), (NAVE_W, hz(RIDGE)), (0, hz(EAVE))])
    if not FAR(): coping(fr, L)

def nave_roof():
    """the nave's slate roof (DSM ridge 128.0-128.2, eaves 117.0: 45.5 deg) and the twelve cross gables' roofs. The main
    roof stops at the wall heads (the cross roofs cover its eaves all along both sides; the towers its front corners) and
    at the gables (stone copings stand above it). Each cross roof (45 deg, apex 120.55) is a quad on its own plane: the
    ridge from the gable's overhang to where it meets the main roof, the valley down that roof to the bay's end, the
    short horizontal valley with the next cross roof, out to the eave overhang: neighbours share edges, never overlap."""
    o = 0.4; th = 0.16
    k_m = (RIDGE - EAVE) / NAVE_W                       # the main roof's slope (m per m)
    xa = XG_APEX + 0.05
    for sgn in (1, -1):
        we = sgn * (NAVE_W + 0.05); he = RIDGE - k_m * (NAVE_W + 0.05)
        top = [P(0.15, 0.0, RIDGE), P(NAVE_U1 - 0.15, 0.0, RIDGE), P(NAVE_U1 - 0.15, we, he), P(0.15, we, he)]     # ends hidden under the copings
        slab(top, th, CUB, C_PLAIN); flat_group()
        ri = (RIDGE - xa) / k_m
        hb = xa - BAY / 2
        wv = (RIDGE - hb) / k_m
        for k in range(NBAYS):
            uc = BAY0 + BAY * k + BAY / 2
            Ro = P(uc, sgn * (NAVE_W + o), xa); Ri = P(uc, sgn * ri, xa)
            for d in (-1, 1):
                ue = uc + d * BAY / 2 - (0.03 if (k == NBAYS - 1 and d > 0) else 0.0)
                Vb = P(ue, sgn * wv, hb); Eb = P(ue, sgn * (NAVE_W + o), hb)
                slab([Ro, Ri, Vb, Eb], th, CUB, C_PLAIN); flat_group()
    if not FAR():
        sweep3d([P(0.4, 0.0, RIDGE + 0.02), P(NAVE_U1 - 0.4, 0.0, RIDGE + 0.02)], [(-0.12, -0.05), (-0.12, 0.08), (0.12, 0.08), (0.12, -0.05)], Z, ZINC, C_RIDGE, caps=True)

def tower():
    """the north-east tower (UrbIS: 6.8 m square, eaves 141.5-141.9, apex 151.14; DSM 150.98): a tall shaft with corner
    pilasters and slit windows, blue-stone string courses, the belfry stage with two tall louvred openings a face, four
    corner turrets with small slate spires (August Dominus 2025), the set-back top stage and its slate pyramid, a gilt ball"""
    u0, u1, w0, w1 = TOWER
    faces = body_faces(u0, u1, w0, w1)
    for name, fr, L in faces:
        holes = []; wins = []
        for v0 in (112.0, 120.0):
            for s in (L * 0.33, L * 0.67):
                if name == "W" and v0 < 118: continue
                h = rect(s - 0.12, hz(v0), s + 0.12, hz(v0 + 1.5)); holes.append(h); wins.append(h)
        bel = []
        for s in (L * 0.33, L * 0.67):
            h = rect(s - 0.36, hz(130.4), s + 0.36, hz(135.8)); holes.append(h); bel.append((s, h))
        wall(fr, rect(0, hz(HB), L, hz(TOWER_TOP)), holes)
        for h in wins: opening(fr, h, 0.3)
        for s, h in bel:
            strip2d(fr, h, 0.0, -0.4, BLUE, C_SUR)
            fill2d(fr, [h], -0.9, WOOD, C_LOUVRE)
            strip2d(fr, h, -0.4, -0.9, WOOD, C_LOUVRE)
            if not FAR():
                for j in range(10):
                    v = hz(130.6) + j * 0.52
                    fbox(fr, s - 0.36, s + 0.36, v, v + 0.07, -0.42, -0.3, WOOD, C_LOUVRE, skip=())
        if not FAR():
            fbox(fr, -0.14, 0.55, hz(HB), hz(TOWER_TOP - 0.3), 0.0, 0.14, WHITE, C_QUOIN)
            fbox(fr, L - 0.55, L, hz(HB), hz(TOWER_TOP - 0.3), 0.0, 0.14, WHITE, C_QUOIN)
    lp = [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
    for h in (EAVE, 129.6):
        ring_prism(offset_uw(lp, 0.2), h - 0.25, h, BLUE, C_BAND, top=False, top_to=lp, bottom_to=lp)
        flat_group()
    ring_prism(offset_uw(lp, 0.24), TOWER_TOP - 0.3, TOWER_TOP, BLUE, C_CORN, top=True)
    flat_group()
    # corner turrets with small slate spires
    t = 1.3
    for (cu, cw) in ((u0, w0), (u1, w0), (u1, w1), (u0, w1)):
        a = (cu + (t / 2 if cu == u0 else -t / 2) - (0.1 if cu == u0 else -0.1), cw + (t / 2 if cw == w0 else -t / 2) - (0.1 if cw == w0 else -0.1))
        loop = [(a[0] - t / 2, a[1] - t / 2), (a[0] + t / 2, a[1] - t / 2), (a[0] + t / 2, a[1] + t / 2), (a[0] - t / 2, a[1] + t / 2)]
        wall_loop(loop, TOWER_TOP - 0.05, TURRET_TOP, WHITE, C_PLAIN)
        ring_prism(offset_uw(loop, 0.08), TURRET_TOP - 0.15, TURRET_TOP, BLUE, C_CORN, top=True); flat_group()
        pyramid(a, t / 2 + 0.12, TURRET_TOP, TURRET_TOP + 1.7, CUB)
    # the set-back top stage and the main pyramid
    ts = [(u0 + 0.9, w0 + 0.9), (u1 - 0.9, w0 + 0.9), (u1 - 0.9, w1 - 0.9), (u0 + 0.9, w1 - 0.9)]
    for i in range(4):
        fr, Lp = edge_frame(*[ccw_uw(ts)[j] for j in (i, (i + 1) % 4)])
        h = rect(Lp / 2 - 0.45, hz(TOWER_TOP + 1.0), Lp / 2 + 0.45, hz(TOWER_EAVE - 0.9))
        wall(fr, rect(0, hz(TOWER_TOP - 0.1), Lp, hz(TOWER_EAVE)), [h])
        strip2d(fr, h, 0.0, -0.4, BLUE, C_SUR); fill2d(fr, [h], -0.4, WOOD, C_LOUVRE)
    ring_prism(offset_uw(ts, 0.12), TOWER_EAVE - 0.3, TOWER_EAVE, BLUE, C_CORN, top=True); flat_group()
    c = ((u0 + u1) / 2, (w0 + w1) / 2)
    pyramid(c, (u1 - u0) / 2 - 0.9 + 0.35, TOWER_EAVE, TOWER_APEX, CUB)
    tt = P(c[0], c[1], TOWER_APEX - 0.25)
    lathe(tt, [(0.0, 0.0), (0.12, 0.0), (0.12, 0.25), (0.3, 0.45), (0.32, 0.6), (0.28, 0.78), (0.12, 0.92), (0.06, 0.95), (0.0, 0.96)], 6 if FAR() else 16, IRON, C_GILT)
    rodc(tt + Z * 0.9, tt + Z * 2.3, 0.03, IRON, C_PLAIN)
    rodc(tt + Z * 1.9 + Vector((0, -0.45, 0)), tt + Z * 1.9 + Vector((0, 0.45, 0)), 0.025, IRON, C_PLAIN)
    rodc(tt + Z * 1.98 + Vector((-0.45, 0, 0)), tt + Z * 1.98 + Vector((0.45, 0, 0)), 0.025, IRON, C_PLAIN)

def pyramid(c, half, h0, h1, mat):
    """a square slate pyramid (flat facets) with eaves overhang, centred (u, w) c, half-width at the eaves"""
    K.B.new_group(); flat_group()
    ev = [P(c[0] + dx * half, c[1] + dw * half, h0 + 0.02) for dx, dw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    ap = P(c[0], c[1], h1)
    for i in range(4):
        a, b = ev[i], ev[(i + 1) % 4]
        face_dir([a, b, ap], Z, mat, C_PLAIN)
        face_dir([a, b, b - Z * 0.12, a - Z * 0.12], ((a + b) / 2 - ap) * Vector((1, 1, 0)), mat, C_RIDGE)
    face_dir([p - Z * 0.12 for p in ev], -Z, mat, C_PLAIN)

def small_tower():
    """the north-west stair tower (UrbIS: 4.6 m square, eaves 124.6-125.0, apex 131.1): slit windows, a window under
    the eaves on each face (August Dominus 2025), a blue-stone cornice, a slate pyramid"""
    u0, u1, w0, w1 = SMALL_T
    for name, fr, L in body_faces(u0, u1, w0, w1):
        holes = []
        tops = []
        if name != "E":
            h = rect(L / 2 - 0.45, hz(121.6), L / 2 + 0.45, hz(123.6)); holes.append(h); tops.append(h)
            for v0 in (108.0, 113.5):
                hh = rect(L / 2 - 0.11, hz(v0), L / 2 + 0.11, hz(v0 + 1.3)); holes.append(hh)
        wall(fr, rect(0, hz(HB), L, hz(SMALL_EAVE)), holes)
        for h in holes: opening(fr, h, 0.3)
        for h in tops: glazing(fr, L / 2 - 0.45, L / 2 + 0.45, hz(121.6), hz(123.6), -0.27, nx=1, ny=1)
    lp = [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
    ring_prism(offset_uw(lp, 0.22), SMALL_EAVE - 0.35, SMALL_EAVE, BLUE, C_CORN, top=True); flat_group()
    ring_prism(offset_uw(lp, 0.12), 120.9, 121.1, BLUE, C_BAND, top=False, top_to=lp, bottom_to=lp); flat_group()
    pyramid(((u0 + u1) / 2, (w0 + w1) / 2), (u1 - u0) / 2 + 0.3, SMALL_EAVE, SMALL_APEX, CUB)
    lathe(P((u0 + u1) / 2, (w0 + w1) / 2, SMALL_APEX - 0.15), [(0.0, 0.0), (0.09, 0.0), (0.12, 0.2), (0.1, 0.33), (0.0, 0.38)], 6 if FAR() else 12, IRON, C_GILT)

def stair_block():
    """the low block east of the nave's first bay, behind the tower (OSM: u 3.86-7.6, w -13.55..-10.95): its own lean-to"""
    u0, u1, w0, w1 = STAIR
    for name, fr, L in body_faces(u0, u1, w0, w1):
        if name in ("W", "S"): continue                  # against the tower's back and the nave's east wall
        wall(fr, rect(0, hz(HB), L, hz(STAIR_TOP)))
    top = [P(u0 - 0.1, w0 - 0.3, STAIR_TOP - 0.6), P(u1 + 0.3, w0 - 0.3, STAIR_TOP - 0.6), P(u1 + 0.3, w1, STAIR_TOP + 0.8), P(u0 - 0.1, w1, STAIR_TOP + 0.8)]
    slab(top, 0.15, CUB, C_PLAIN); flat_group()
    for name, fr, L in body_faces(u0, u1, w0, w1):
        if name in ("N", "S"):
            pass

def choir_apse():
    """the choir and the polygonal apse (OSM: half a dodecagon of radius 8.0 round (52.4, 0); DSM eaves ~113.5) with a
    tall round-headed window in each facet (ESTIMATED from the interior panorama, Commons 2011), its slate roof: a ridge
    at 124.3 (UrbIS) from the nave's south gable to the apse centre, flat facets down to the eaves"""
    cu = APSE_C; R = APSE_R
    pts = [(cu + R * math.cos(math.radians(a)), R * math.sin(math.radians(a))) for a in (-90, -60, -30, 0, 30, 60, 90)]
    loop = [(NAVE_U1 - 0.2, -CHOIR_W)] + [(cu, -CHOIR_W)] + pts[1:-1] + [(cu, CHOIR_W), (NAVE_U1 - 0.2, CHOIR_W)]
    loop = [(NAVE_U1 - 0.2, -CHOIR_W), (cu, -CHOIR_W)] + pts[1:-1] + [(cu, CHOIR_W), (NAVE_U1 - 0.2, CHOIR_W)]
    L = ccw_uw(loop)
    for i in range(len(L)):
        a, b = L[i], L[(i + 1) % len(L)]
        if abs(a[0] - (NAVE_U1 - 0.2)) < 1e-6 and abs(b[0] - (NAVE_U1 - 0.2)) < 1e-6: continue
        fr, Ls = edge_frame(a, b)
        holes = []
        if Ls > 3.0:
            holes.append(window(fr, Ls / 2, 0.95, 108.4, 112.6, head="round", bars=(1, 3)) if False else arched(Ls / 2 - 0.48, Ls / 2 + 0.48, hz(108.4), hz(112.1)))
        wall(fr, rect(0, hz(HB), Ls, hz(APSE_EAVE)), holes)
        for h in holes:
            opening(fr, h, 0.38)
            glazing(fr, Ls / 2 - 0.48, Ls / 2 + 0.48, hz(108.4), hz(112.1), -0.35, nx=1, ny=3)
            if not FAR(): fbox(fr, Ls / 2 - 0.6, Ls / 2 + 0.6, hz(108.4) - 0.15, hz(108.4), 0.0, 0.08, BLUE, C_SILL)
    cornice_ring(L, APSE_EAVE - 0.35, APSE_EAVE, 0.22, mat=BLUE, steps=2)
    # roof: ridge from the nave's gable to the apse centre, facets down to the eaves (overhang 0.35)
    o = 0.35
    er = [(NAVE_U1, -(CHOIR_W + o)), (cu, -(CHOIR_W + o))] + [(cu + (R + o) * math.cos(math.radians(a)), (R + o) * math.sin(math.radians(a))) for a in (-60, -30, 0, 30, 60)] + [(cu, CHOIR_W + o), (NAVE_U1, CHOIR_W + o)]
    he = APSE_EAVE + 0.05
    r0 = P(NAVE_U1, 0.0, APSE_RIDGE); r1 = P(cu, 0.0, APSE_RIDGE)
    E = [P(p[0], p[1], he) for p in er]
    K.B.new_group(); flat_group()
    face_dir([E[0], E[1], r1, r0], Z, CUB, C_PLAIN)
    for i in range(1, len(E) - 2):
        face_dir([E[i], E[i + 1], r1], Z, CUB, C_PLAIN)
    face_dir([E[-2], E[-1], r0, r1], Z, CUB, C_PLAIN)
    for i in range(len(E) - 1):
        a, b = E[i], E[i + 1]
        out = Vector(((b - a).y, -(b - a).x, 0))
        cen = P(cu - 3, 0, he)
        if out.dot(((a + b) / 2) - cen) < 0: out = -out
        face_dir([a, b, b - Z * 0.12, a - Z * 0.12], out, CUB, C_RIDGE)
    face_dir([p - Z * 0.12 for p in E], -Z, CUB, C_PLAIN)

def annex():
    """the flat-roofed south-east annex (UrbIS: u 44.6-59.1, w -18.7..-9.0, roof 107.9-108.0)"""
    u0, u1, w0, w1 = ANNEX
    lp = [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
    for name, fr, L in body_faces(u0, u1, w0, w1):
        holes = []
        if name in ("S", "N") and L > 8: pass
        if name == "E":
            for s in (L * 0.25, L * 0.5, L * 0.75):
                holes.append(rect(s - 0.5, hz(105.0), s + 0.5, hz(106.6)))
        wall(fr, rect(0, hz(HB), L, hz(ANNEX_TOP)), holes)
        for h in holes:
            opening(fr, h, 0.3)
    ring_prism(offset_uw(lp, 0.08), ANNEX_TOP - 0.05, ANNEX_TOP + 0.3, BLUE, C_COPING, top=False, top_to=offset_uw(lp, -0.2), bottom_to=lp); flat_group()
    inner_wall(offset_uw(lp, -0.2), ANNEX_TOP + 0.05, ANNEX_TOP + 0.3, BLUE, C_COPING); flat_group()
    face_up([P(p[0], p[1], ANNEX_TOP + 0.12) for p in offset_uw(lp, -0.2)], ZINC, C_PLAIN)

def inner_wall(loop_uw, h0, h1, mat, code):
    """walls round a loop facing INWARD (a parapet's inside)"""
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    cu = sum(p[0] for p in L) / n; cw = sum(p[1] for p in L) / n; c = P(cu, cw, OY)
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        q = [P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1)]
        m = (q[0] + q[1]) / 2
        face_dir(q, Vector((c.x - m.x, c.y - m.y, 0)), mat, code)

def build_all():
    front(); side(1); side(-1); south_gable(); nave_roof()
    tower(); small_tower(); stair_block()
    choir_apse(); annex()

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
    obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "Rosaire", B_MAIN, 0.0, AO_SPLIT, AO_PX)
with GroupTag(B_FAR):
    far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "Rosaire_far", B_FAR, AO_SPLIT + 0.005, 1.0, AO_PX)
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
ao_img = bpy.data.images.new("rosaire_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    ao_img.filepath_raw = os.path.join(OUT, "rosaire_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "rosaire_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "rosaire.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
S_ = SITE["solids"]
info = {
    "asset": "Eglise Notre-Dame du Rosaire, Uccle (tools/blender/rosaire.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"rubble_stone": "coursed rubble sandstone in brick-sized courses, grey-ochre (the 1930s church); the police station uses the same slot name"},
    "uv": {"TEXCOORD_0": "world metres, per face", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 1.0], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1)},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                  "hides_solids": [S_["church"]["id"]], "hides_bu_ids": [S_["church"]["bu"]], "church_bu_id": S_["church"]["bu"]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "footprint_osm": SITE["footprint_local"]["osm"], "solid_top": SITE["solid_top"], "dsm_peaks": SITE["dsm_peaks"],
                 "roof_dsm": SITE["roof"], "ground_taw": SITE["ground"]},
    "levels_taw": {"ground_front": G_FRONT, "floor": FLOOR, "eave": EAVE, "ridge": RIDGE, "cross_gable_apex": XG_APEX,
                   "tower": {"shaft_top": TOWER_TOP, "turrets": TURRET_TOP, "eave": TOWER_EAVE, "apex": TOWER_APEX},
                   "small_tower": [SMALL_EAVE, SMALL_APEX], "apse": [APSE_EAVE, APSE_RIDGE], "annex": ANNEX_TOP},
    "estimated": "the west side's windows (as the east side's), the apse's windows, the annex's openings, the tower's lower slit windows and the "
                 "back faces of both towers, the front's window heights and portal sizes (frontal photo at ~42 px/m, calibrated on the floor and "
                 "the gable apex), the tympana (plain blue stone, the reliefs not modelled), wall thicknesses (reveals 0.35-0.4 m)",
}
json.dump(info, open(os.path.join(OUT, "rosaire.json"), "w"), indent=1)

if PREVIEWS:
    cols = {"rubble_stone": (0.42, 0.37, 0.29), "stone_blue": (0.12, 0.13, 0.14), "slate": (0.05, 0.055, 0.065),
            "zinc_roof": (0.25, 0.26, 0.27), "wood_frame_dark": (0.12, 0.06, 0.03), "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.6, 0.42, 0.12)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else (0.4 if m.name in ("cast_iron_green",) else 0.85)
        if m.name in ("cast_iron_green",): bsdf.inputs["Metallic"].default_value = 0.7
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
        os.makedirs(PREV, exist_ok=True); scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 88; scn.render.filepath = os.path.join(PREV, f"rosaire_{name}.jpg")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    only = [a.split("=")[1] for a in ARGS if a.startswith("--views=")]
    views = {"north": ((-38.0, 0.0, 104.5), (0.0, 0.0, 120.0), 24, (900, 1000)),
             "northeast": ((-30.0, -32.0, 104.5), (12.0, -6.0, 118.0), 22, (1000, 850)),
             "east": ((26.0, -45.0, 106.0), (26.0, 0.0, 116.0), 22, (1100, 750)),
             "aerial": ((-40.0, -45.0, 165.0), (25.0, 0.0, 115.0), 26, (1000, 800)),
             "southwest": ((75.0, 30.0, 110.0), (40.0, 0.0, 115.0), 24, (1000, 800))}
    for k, (pos, tgt, lens, res) in views.items():
        if only and k not in only[0].split(","): continue
        look(k, pos, tgt, lens, res)
print(f"done {time.time() - T0:.1f}s")
