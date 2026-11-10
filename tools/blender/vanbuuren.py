"""VILLA VAN BUUREN (Avenue Leo Errera 41, Uccle; 1928, Govaerts & Van Vaerenbergh; Amsterdam School): built entirely
in code (no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/vanbuuren.py -- <out_dir> [--no-bake] [--previews] [--fast]
      <out_dir>/vanbuuren.raw.glb   nodes "Villa" (LOD0 without the courses), "Villa_courses" (LOD0's brick courses and
                                    roof tile courses: drawn with Villa), "Villa_far" (the scripted far variant: flat
                                    walls and roofs, joinery simplified); one primitive per NAMED material slot
      <out_dir>/vanbuuren_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/vanbuuren.json      the measurements used, slots and codes, placement, counts, landmarks (photo poses)
      docs/vanbuuren/preview_*.png  Cycles renders (--previews)

INPUT: <out_dir>/site.json + site_dtm.bin (tools/vanbuuren_measure.py). The plan below: the UrbIS footprint (solid
550409) idealised, the DSM's roof parts, the photos facade by facade (models/vanbuuren/NOTES.md).

SWAPPABLE MATERIALS: NO colour, NO texture in the GLB:
  - every face is in a NAMED slot (SLOTS in vanbuuren_kit.py); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code / 16 + 1/32 (CODES); COLOR_0.g = per-vertex AO of the thin parts; COLOR_0.b =
    sqrt(region width / 4 m) (the viewer's anti-sparkle);
  - TEXCOORD_0 = world metres (walls: along / up from 90 m TAW, so the material's courses fall in the geometry's
    joints; roofs: along the eave / up the slope from the eave); TEXCOORD_1 = the lightmap UV of the baked AO.
Frame: Blender x = u, y = -w, z = m TAW - OY (OY = 90). glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes
at the city position of the frame origin, height OY, rotation.y = -rotation (site.json frame).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.bvhtree import BVHTree
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import vanbuuren_kit as KT
from vanbuuren_kit import (K, Builder, Z, P, OY, hz, face_dir, quad, Frame, box, fbox, hbox, lathe, pipe, rect, fill_rect_grid,
                           SLOTS, CODES, BRICK, BPAT, CONC, TILES, WOODV, WOODW, GLASS, LEAD, OAK, GREEN, ZINC, BLUE,
                           C_PLAIN, C_COURSE, C_JOINT, C_REVEAL, C_LATTICE, C_SILL, C_SOFFIT, C_DRIP, C_FRAME, C_BAR,
                           C_PANE, C_LEAD, C_PANEL, C_RIDGE, C_COPING, C_INT, COURSE, JOINT, snap_course, course_bands)
from vanbuuren_walls import wall_field, Opening, ladder
import vanbuuren_roof as RF
import vanbuuren_parts as PT

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/vanbuuren")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "vanbuuren")
T0 = time.time()
SITE = json.load(open(os.path.join(OUT, "site.json")))
FR = SITE["frame"]
OXC, OZC = FR["origin_city"]; ROT = FR["rotation_rad"]

# ------------------------------------------------------------------------------------------------ ground (DTM)
_g = json.load(open(os.path.join(OUT, "site_dtm.json")))
_gd = memoryview(open(os.path.join(OUT, "site_dtm.bin"), "rb").read()).cast("H")
_ca, _sa = math.cos(ROT), math.sin(ROT)
def city(u, w): return OXC + u * _ca - w * _sa, OZC + u * _sa + w * _ca
def ground_city(x, z):
    c = min(max((x - _g["x0"]) / _g["step"], 0), _g["cols"] - 1.001); r = min(max((z - _g["z0"]) / _g["step"], 0), _g["rows"] - 1.001)
    c0, r0 = int(c), int(r); fc, fr = c - c0, r - r0
    H = lambda i, j: _gd[j * _g["cols"] + i] / 100 + _g["base"]
    return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr
def ground(u, w): return ground_city(*city(u, w))
def ground_min(ua, wa, ub, wb, n=12):
    return min(ground(ua + (ub - ua) * i / n, wa + (wb - wa) * i / n) for i in range(n + 1))

# ------------------------------------------------------------------------------------------------ THE PLAN (building frame, m TAW)
# levels
GF = 95.45               # ground floor: the porch's threshold (v03 pose: the door's foot at 95.3-95.5; DTM 95.25 in front)
FF = 98.75               # first floor
EAVE_LINE = 101.65       # the DSM's common eave level (~ the first-floor hoods)
# east (entrance) front: the planes (DSM: where each ridge ends, minus the verge; the footprint for the ground floor)
U_S = 5.75               # the big south-east gable (roof B's east end)
U_BAY = 6.50             # its projecting bay (the right half, under the middle hood: v04's side face)
U_N = 5.30               # the smaller north-east gable (roof C's east end)
U_PORCH = 7.60           # the porch's front wall (door, leaded windows) under the canopy
U_CANOPY = 8.92          # the canopy's front edge (footprint 8.80-8.98)
U_NWING = 6.27           # the north wing's east wall (footprint)
W_SE = 7.10              # south-east corner (footprint 7.03-7.17)
W_VAL = 0.855            # the valley between roofs B and C (DSM 0.85; both east and west)
W_NG = -3.85             # the north-east gable's north edge (footprint -3.73 / the north wing)
W_BAY = 2.95             # the bay's south edge (v03 pose: 2.94)
W_PORCH_S = 1.20         # the porch box's south side
# south: the third gable (roof A's south end) and the set-back parts beside it
W_A = 8.45               # the south gable face (footprint 8.34-8.55)
U_A0, U_A1 = -2.48, 3.72 # its sides (footprint)
W_SW = 6.85              # the south-west part (footprint 6.71-6.99)
# west (garden) front
U_B_W = -5.65            # the big south-west gable (roof B's west end; DSM)
U_C_W = -7.00            # the north-west gable (roof C's west end; footprint -7.21 / -6.78, DSM -7.0)
W_C_S = 1.30             # the step between the two west gables (footprint 1.26-1.41)
W_C_N = -4.70            # the north-west gable wall's north end (footprint)
# north: against 509389 (the line of the footprint), the north wing
NORTH = [(6.282, -7.566), (-1.56, -8.096)]
# the NW wing (the footprint's rotated rectangle, 7.14 x 3.6-3.9 m): ESTIMATED except its plan
NWW = [(-7.563, -4.218), (-9.495, -7.234), (-3.66, -11.347), (-1.56, -8.096)]

H_SPLIT = snap_course(101.06, "j0")     # the bay's top under the middle hood (a course line over the windows' heads)
CHIM = (3.30, 4.62, 107.35)             # the chimney breast / stack: w extent, top (v03 pose: 3.30..4.62, 107.2-107.3)
# roofs (DSM): ridge positions / heights, pitches (tan)
RA = dict(c=0.65, h=106.85, t=1.60)      # north-south: the south gable
RB = dict(c=3.70, h=106.80, t=1.57)      # east-west: the big gables (east with the chimney, west)
RC = dict(c=-1.35, h=105.60, t=1.483)    # east-west: the smaller gables
RD = dict(h=104.85, u0=-3.40, u1=2.10, te=1.57, tw=2.00)   # east eave ~97.85 (v03: at the wing's slab)   # the north wing: flat top, steep sides
VERGE = 0.15             # gable roofs overhang the gable walls
EAVE_OUT = 0.32          # ... and the eave walls
B_EAVE_S = 7.25          # roof B's south eave: short over the south-west part (its concrete eave slab and the oriel take over)

def tan_h(r, x): return r["h"] - abs(x - r["c"]) * r["t"]

def build_roof_solids():
    """every roof PLANE as its own convex slab (the plane's convex polygon extruded T_SLAB under it): the union of the
    slabs is a thin roof shell with exact valleys, ridges and crossings (a gable prism's convex hull would fill the
    attic: its flat underside crossed every wall)"""
    S = []
    def gable(axis, r, a0, a1, e_l, e_r):
        """the two planes of a gable roof: ridge along `axis` at cross coordinate r['c'], eave edges e_l < c < e_r,
        from a0 to a1 along the axis (verges included)"""
        c, h, t = r["c"], r["h"], r["t"]
        hl, hr = h - (c - e_l) * t, h - (e_r - c) * t
        P_ = (lambda a, x, z: (a, x, z)) if axis == "u" else (lambda a, x, z: (x, a, z))
        S.append(RF.plane_slab([P_(a0, e_l, hl), P_(a1, e_l, hl), P_(a1, c, h), P_(a0, c, h)]))
        S.append(RF.plane_slab([P_(a0, c, h), P_(a1, c, h), P_(a1, e_r, hr), P_(a0, e_r, hr)]))
    gable("w", RA, -1.6, W_A + VERGE, U_A0 - EAVE_OUT, U_A1 + EAVE_OUT)
    gable("u", RB, U_B_W - VERGE, U_S + VERGE, W_VAL - 0.02, B_EAVE_S)
    gable("u", RC, U_C_W - VERGE, -2.0, W_C_N - 0.22, W_C_S + 0.22)
    gable("u", RC, -2.0, U_N + VERGE, W_NG - 0.25, W_C_S + 0.22)
    # D: the north wing: a flat top, steep slopes east / west, the north end on the line against 509389 (2 cm inside);
    # the east slope's south end stops at the north-east gable's north edge (+ the verge), the plateau runs on to w -1.6
    ue, uw = U_NWING + EAVE_OUT, -6.2
    he, hw = RD["h"] - (ue - RD["u1"]) * RD["te"], RD["h"] - (RD["u0"] - uw) * RD["tw"]
    def wn(u):
        (u1, w1), (u2, w2) = NORTH
        return w1 + (w2 - w1) * (u - u1) / (u2 - u1) + 0.02
    S.append(RF.plane_slab([(RD["u0"], -1.6, RD["h"]), (RD["u1"], -1.6, RD["h"]), (RD["u1"], wn(RD["u1"]), RD["h"]), (RD["u0"], wn(RD["u0"]), RD["h"])]))
    S.append(RF.plane_slab([(RD["u1"], wn(RD["u1"]), RD["h"]), (RD["u1"], -1.6, RD["h"]), (ue, W_NG - 0.25, he), (ue, wn(ue), he)]))
    S.append(RF.plane_slab([(RD["u0"], -1.6, RD["h"]), (RD["u0"], wn(RD["u0"]), RD["h"]), (uw, wn(uw), hw), (uw, -1.6, hw)]))
    # the NW wing (ESTIMATED): a roof along its long axis, hipped over the veranda end, against 509389 at the other
    a0, a1, b1, b0 = [Vector((u, w)) for (u, w) in NWW]       # a0-a1 the SW (veranda) end, b1-b0 the NE end
    ax = ((b1 - a1) + (b0 - a0)) / 2; L = ax.length; ax = ax / L
    cr = Vector((-ax.y, ax.x))
    mid0 = (a0 + a1) / 2; half = (a0 - a1).length / 2
    e_out = half + 0.3; hr, tt = 103.45, 1.30
    he_ = hr - e_out * tt
    s0, s1 = -0.15, L - 0.05
    q = lambda along, side, h: (*(mid0 + ax * along + cr * side), h)
    S.append(RF.plane_slab([q(s0, e_out, he_), q(s1, e_out, he_), q(s1, 0.0, hr), q(s0, 0.0, hr)]))
    S.append(RF.plane_slab([q(s0, 0.0, hr), q(s1, 0.0, hr), q(s1, -e_out, he_), q(s0, -e_out, he_)]))
    return S

# windows / openings: facade by facade (models/vanbuuren/NOTES.md; positions from the photos scaled on the measured
# gable widths, levels on the DSM's eave / ridge levels; refined against the solved photo poses, tools/vanbuuren_photopose.py)
_PM = os.path.join(OUT, "photo_measured.json")
PHOTO_MEAS = json.load(open(_PM)) if os.path.exists(_PM) and "--no-photo" not in ARGS else {}
LANDMARKS = {}
PLANES = {}           # facade -> [nu, nw, d, Uu, Uw]: the wall plane nu u + nw w = d (outward normal), its running axis
def lm(name, u, w, h): LANDMARKS[name] = [round(u, 3), round(w, 3), round(h, 3)]

# ------------------------------------------------------------------------------------------------ build
def wall_top_from_roof(bvh, fr, L, below=0.05):
    """the wall's top profile under the roof union (ray down at the wall line, 2 cm samples) - `below`"""
    n = max(8, int(L / 0.02))
    xs = [L * i / n for i in range(n + 1)]
    hs = []
    for x in xs:
        p = fr.p(x, 120.0, 0.0)
        hit = bvh.ray_cast(p, Vector((0, 0, -1)), 40.0)
        hs.append((hit[0].z + OY - below) if hit[0] is not None else 0.0)
    def top(s):
        if s <= 0: return hs[0]
        if s >= L: return hs[-1]
        f = s / L * n; i = int(f); t = f - i
        return hs[i] * (1 - t) + hs[min(i + 1, n)] * t
    return top

def W(ua, wa, ub, wb):
    return Frame.of(ua, wa, ub, wb)

def s_of(fr, u, w):
    p = P(u, w, OY) - fr.O; return p.dot(fr.U)

class Facade:
    """one wall of the plan: frame, extent, ends, openings and their fills"""
    def __init__(self, name, a, b, ends=("convex", "convex"), h_bot=None, top=None, below=0.08):
        self.name = name; self.fr, self.L = W(a[0], a[1], b[0], b[1]); self.ends = ends
        self.h_bot = h_bot if h_bot is not None else ground_min(a[0], a[1], b[0], b[1]) - 0.45
        self.top = top; self.below = below; self.ops = []; self.fills = []; self.a = a; self.b = b
    def s(self, u=None, w=None):
        """s along the wall of a point given by its u (walls along u) or w (walls along w)"""
        if u is None: u = self.a[0] + (self.b[0] - self.a[0]) * ((w - self.a[1]) / (self.b[1] - self.a[1]))
        if w is None: w = self.a[1] + (self.b[1] - self.a[1]) * ((u - self.a[0]) / (self.b[0] - self.a[0]))
        return s_of(self.fr, u, w)
    def win(self, c, width, h0, h1, **kw):
        """a window centred on c (the wall's running coordinate: w for walls along w, u for walls along u)"""
        along_w = abs(self.b[1] - self.a[1]) > abs(self.b[0] - self.a[0])
        pm = PHOTO_MEAS.get(f"{self.name}.{kw.get('tag')}")
        if pm and not kw.get("no_photo"):
            # the photo's measurement (tools/vanbuuren_photopose.py: the solved pose, the picked corners back-projected
            # onto this wall's plane) replaces the first read
            c, width, h0, h1 = pm["c"], pm["w"], pm["h0"], pm["h1"]
            if kw.get("kind") == "none" or kw.get("family") == "white": h0 = h0 if h0 > GF + 0.05 else h0
        kw.pop("no_photo", None)
        sc = self.s(w=c) if along_w else self.s(u=c)
        o = Opening(sc - width / 2, sc + width / 2, h0, h1, depth=kw.pop("depth", 0.12), jambs=kw.pop("jambs", "brick"),
                    head=kw.pop("head", "brick"), sill=kw.pop("sill", None))
        o.tag = kw.pop("tag", None)
        self.ops.append(o); self.fills.append((o, kw)); return o

def build_facade(f, bvh):
    top = f.top or wall_top_from_roof(bvh, f.fr, f.L, f.below)
    wall_field(f.fr, 0.0, f.L, f.h_bot, top, f.ops, f.ends, mat_split=getattr(f, "mat_split", None), far=True if getattr(f, "flat", False) else None)
    for (o, kw) in f.fills:
        kind = kw.get("kind", "window")
        if kind == "window":
            PT.window(f.fr, o.s0, o.s1, o.h0, o.h1, kw.get("family", "wood"), kw.get("lights", 2), kw.get("rows", 4),
                      d=kw.get("d", -0.06), glass=kw.get("glass", GLASS), transom=kw.get("transom"), sill=kw.get("sill_block", True))
        elif kind == "none":
            pass
    return top

# ------------------------------------------------------------------------------------------------ parts (hoods, bays, chimney, ...)
def frame_at(u0, w0, u1, w1, d=0.0):
    fr, L = Frame.of(u0, w0, u1, w1)
    if d: fr.O = fr.O + fr.N * d
    return fr, L

def brick_faces(u0, u1, w0, w1, h0, h1, sides="nsew", mat=BRICK, far=None, ends=None, tops=None, openings=None):
    """the brick walls of an axis-aligned box (a bay, an oriel, a planter): course fields on the listed sides (n: w0,
    s: w1, w: u0, e: u1), convex corners between listed sides, 'concave2' / 'concave' ends where a side is missing (the
    box meets the house there; override with ends={'e0': ..., 'n1': ...})"""
    defs = {"e": ((u1, w1), (u1, w0)), "n": ((u1, w0), (u0, w0)), "w": ((u0, w0), (u0, w1)), "s": ((u0, w1), (u1, w1))}
    order = "enws"
    for k in sides:
        a, b = defs[k]
        prev = order[(order.index(k) - 1) % 4]; nxt = order[(order.index(k) + 1) % 4]
        e0 = "convex" if prev in sides else (ends or {}).get(k + "0", "concave2")
        e1 = "convex" if nxt in sides else (ends or {}).get(k + "1", "concave2")
        fr, L = Frame.of(a[0], a[1], b[0], b[1])
        top = (tops or {}).get(k, lambda s, h1=h1: h1)
        wall_field(fr, 0.0, L, h0, top, (openings or {}).get(k, ()), (e0, e1), mat=mat, far=far)

def corbel(u0, u1, w0, w1, h_top, steps=3, inset=0.11, sides="sw", mat=BRICK):
    """stepped brick courses under a projecting mass (one brick tall each, receding `inset` per course on the listed
    free sides); they run into the wall behind"""
    for k in range(steps):
        a0 = u0 + (inset * k if "w" in sides else 0.0); a1 = u1 - (inset * k if "e" in sides else 0.0)
        b0 = w0 + (inset * k if "n" in sides else 0.0); b1 = w1 - (inset * k if "s" in sides else 0.0)
        g = 0.01 if k == 0 else 0.0          # the first course is 1 cm wider than the mass above: its walls end inside it
        hb, ht = h_top - COURSE * (k + 1) - 0.004, h_top - COURSE * k + (0.02 if k == 0 else 0.0) - 0.004 * k
        hbox(a0 - g, a1 + g, b0 - g, b1 + g, hb, ht, mat, C_COURSE, skip=("top",))

def soldier_band(f, top, h, ht=0.10, proud=0.02):
    xs = [f.L * i / 400 for i in range(401)]
    ins = [x for x in xs if top(x) >= h + ht + 0.06]
    if len(ins) < 2: return
    fbox(f.fr, ins[0], ins[-1], h - 0.004, h + ht - 0.006, -0.02, proud, BPAT, C_LATTICE, skip=("back",))

def s_of_u(f, u): return s_of(f.fr, u, f.a[1])

def box_window(f):
    """a deep white concrete box frame round the facade's 'box' opening (the cut is 2 cm inside the box: its sides cross
    the courses), a timber window at the back, the folding grille (v00, v06)"""
    o = f.box; fr = f.fr; band = 0.17
    PT.box_frame(fr, o.s0 - 0.02, o.s1 + 0.02, o.h0 - 0.02, o.h1 + 0.02, band=band, proud=0.38, back=0.18)
    a0, a1, b0, b1 = o.s0 - 0.02 + band, o.s1 + 0.02 - band, o.h0 - 0.02 + band, o.h1 + 0.02 - band
    PT.window(fr, a0, a1, b0, b1, "wood", 3, 2, d=-0.09, sill=False)
    PT.grille(fr, a0 + 0.02, a1 - 0.02, b0 + 0.02, b1 - 0.02, 0.06)

def planter(u0, u1, w0, w1, wall_side):
    """a low brick planter wall in front of a bay (v02, v06): the soil 12 cm under the rim"""
    g = ground_min(u0, (w0 + w1) / 2, u1, (w0 + w1) / 2) - 0.3
    sides = "nsew".replace(wall_side, "")
    top = max(ground((u0 + u1) / 2, (w0 + w1) / 2) + 0.55, 95.9)
    brick_faces(u0, u1, w0, w1, g, top, sides, far=True, ends={})
    face_dir([P(u0, w0, top - 0.10), P(u1, w0, top - 0.10), P(u1, w1, top - 0.10), P(u0, w1, top - 0.10)], Z, BRICK, C_INT)

def veranda(frn, Ln, depth=2.4, h_top=98.45):
    """the glazed veranda in front of the NW wing's garden end: green steel posts, glass, a white slab (ESTIMATED: v06 /
    v01 / v02 show four bays)"""
    if Ln < 1: return
    hb = GF - 0.1
    posts = [0.10 + (Ln - 0.20) * k / 4 for k in range(5)]
    for s in posts:
        fbox(frn, s - 0.04, s + 0.04, hb - 0.2, h_top - 0.17, depth - 0.08, depth, GREEN, C_FRAME, skip=("top", "bottom"))
    for s_ in (posts[0], posts[-1]):
        fbox(frn, s_ - 0.04, s_ + 0.04, hb - 0.2, h_top - 0.17, depth * 0.5 - 0.04, depth * 0.5 + 0.04, GREEN, C_FRAME, skip=("top", "bottom"))
    for (y0, y1) in ((hb - 0.15, hb + 0.35), (h_top - 0.30, h_top - 0.172)):
        fbox(frn, posts[0] + 0.04, posts[-1] - 0.04, y0, y1, depth - 0.07, depth - 0.01, GREEN, C_FRAME, skip=("back",))
    for i in range(4):
        fbox(frn, posts[i] + 0.04, posts[i + 1] - 0.04, hb + 0.35, h_top - 0.30, depth - 0.05, depth - 0.03, GLASS, C_PANE, skip=("back", "top", "bottom", "left", "right"))
    for s_ in (posts[0], posts[-1]):
        fbox(frn, s_ - 0.012, s_ + 0.012, hb + 0.35, h_top - 0.30, -0.02, depth - 0.08, GLASS, C_PANE, skip=("top", "bottom", "front", "back"))
    fbox(frn, -0.10, Ln + 0.10, h_top - 0.18, h_top, -0.03, depth + 0.30, CONC, C_PLAIN, skip=("back",))

def build_parts(FD, tops):
    # ---------------- EAST
    e1, e1h, eb, e2, ep, e4 = FD["east_S"], FD["east_S_hi"], FD["east_bay"], FD["east_N"], FD["porch_front"], FD["east_wing"]
    # the south-east corner hood: over the first-floor window, round the corner over the south-east window (v03, v00)
    PT.slab([(U_S - 0.03, U_S + 0.48, 5.20, W_SE - 0.03, "ne"), (U_S - 0.03, U_S + 0.48, W_SE - 0.03, W_SE + 0.45, "es"),
             (3.95, U_S - 0.03, W_SE - 0.03, W_SE + 0.45, "sw")], 101.20, 0.20)
    # the middle hood on the bay (its walls end inside it) and beyond the valley
    PT.slab([(U_S - 0.03, U_BAY + 0.50, W_VAL, 3.63, "se"), (U_S - 0.03, U_BAY + 0.50, 0.42, W_VAL, "new")], H_SPLIT + 0.13, 0.20)
    # the ground-floor French window's small slab (south-east gable), the north wing's slab (door + window)
    PT.slab([(U_S - 0.03, U_S + 0.40, 5.50, 6.85, "nse")], 97.95, 0.16)
    PT.slab([(U_NWING - 0.03, U_NWING + 0.45, -7.45, -4.45, "nse")], 97.78, 0.18)
    # the canopy over the porch (DSM top 98.1, the v03 pose 97.8): 0.30 thick; its stepped soffit over the door
    CT, CB = 98.00, 97.70
    PT.slab([(U_N - 0.03, U_NWING - 0.03, W_NG, 1.75, "ns"), (U_NWING - 0.03, U_CANOPY, W_NG, 1.75, "se"),
             (U_NWING - 0.03, U_CANOPY, -4.45, W_NG, "ne")], CT, CT - CB)
    for (wa, wb, ua, hb) in ((-2.85, 0.15, 8.70, 0.07), (-2.45, -0.25, 8.52, 0.13), (-2.05, -0.65, 8.36, 0.19)):
        hbox(U_PORCH - 0.03, ua, wa, wb, CB - hb, CB + 0.03, CONC, C_SOFFIT, skip=("top", "left"))
    if not K.FAR:      # the lantern: glass under the soffit's lowest step
        hbox(7.92, 8.28, -1.70, -1.00, CB - 0.19 - 0.16, CB - 0.19 + 0.01, GLASS, C_PANE, skip=("top", "bottom"))
        hbox(7.90, 8.30, -1.72, -0.98, CB - 0.19 - 0.19, CB - 0.19 - 0.16, CONC, C_FRAME, skip=())
    # the door: a stepped brick recess (two steps of 11 cm), the oak leaf with a column of four leaded panels
    fr = ep.fr; o = ep.door
    for k, inset in enumerate((0.12, 0.24)):
        frk, _ = frame_at(U_PORCH, W_PORCH_S, U_PORCH, W_NG, -0.11 * (k + 1))
        lo, hi = o.s0 + 0.12 * k, o.s1 - 0.12 * k
        inner = Opening(lo + 0.12, hi - 0.12, o.h0 - 0.3, o.h1, depth=0.11, jambs="brick", head="brick", sill=None, snap=False)
        wall_field(frk, lo, hi, GF - 0.3, lambda s: o.h1, [inner], ("free", "free"))
    s0, s1 = o.s0 + 0.24, o.s1 - 0.24; dl = -0.11 * 3 - 0.02
    fbox(fr, s0 - 0.01, s1 + 0.01, GF - 0.02, o.h1 + 0.01, dl - 0.04, dl, OAK, C_PANEL, skip=("back",))
    if not K.FAR:
        fbox(fr, s0 + 0.04, s1 - 0.04, GF + 0.06, o.h1 - 0.06, dl - 0.01, dl + 0.012, OAK, C_FRAME, skip=("back",))   # the black edging bead
        sc = (s0 + s1) / 2
        for j in range(4):
            y0 = GF + 0.95 + j * 0.30
            fbox(fr, sc - 0.10, sc + 0.10, y0, y0 + 0.24, dl + 0.005, dl + 0.02, LEAD, C_LEAD, skip=("back",))
        fbox(fr, sc - 0.33, sc - 0.29, GF + 1.0, GF + 1.08, dl + 0.005, dl + 0.05, ZINC, C_PLAIN, skip=("back",))   # the knob
        # vertical brick ribs on the porch wall both sides of the recess (v04 / v05)
        for side in (-1, 1):
            for k in range(3):
                x = (o.s0 - 0.14 - 0.19 * k) if side < 0 else (o.s1 + 0.14 + 0.19 * k)
                fbox(fr, x - 0.055, x + 0.055, GF + 0.08, CB + 0.02, -0.02, 0.055, BRICK, C_COURSE, skip=("back", "top"))
    # the two leaded windows' deep white frames (the frame closes the reveal)
    for o2 in [x for x in ep.ops if x.tag in ("lead_l", "lead_r")]:
        PT.box_frame(fr, o2.s0 - 0.09, o2.s1 + 0.09, o2.h0 - 0.09, o2.h1 + 0.09, band=0.11, proud=0.07, back=0.18)
    # planters (brick, the soil 10 cm under the rim) and the two blue-stone steps
    g0 = ground(U_PORCH + 0.6, -1.35)
    for (wa, wb) in ((0.25, 1.35), (-4.05, -2.95)):
        brick_faces(U_PORCH - 0.02, U_PORCH + 0.95, wa, wb, g0 - 0.3, g0 + 0.48, "nse", far=True)
        face_dir([P(U_PORCH, wa, g0 + 0.38), P(U_PORCH + 0.93, wa, g0 + 0.38), P(U_PORCH + 0.93, wb, g0 + 0.38), P(U_PORCH, wb, g0 + 0.38)], Z, BRICK, C_INT)
    hbox(U_PORCH - 0.12, U_CANOPY - 0.15, -2.50, -0.20, g0 - 0.2, g0 + 0.10, BLUE, C_COPING, skip=("bottom", "left"))
    hbox(U_PORCH - 0.10, U_PORCH + 0.42, -2.40, -0.30, g0 + 0.10 - 0.01, GF, BLUE, C_COPING, skip=("bottom", "left"))
    # the chimney: a breast on the gable face (from a stepped corbel at 101.3), the stack (v03 pose: top 107.3)
    CW0, CW1, CTOP = CHIM
    fr_b, Lb = frame_at(U_S, CW1, U_S, CW0, 0.20)
    wall_field(fr_b, 0.0, Lb, 101.30, lambda s: CTOP, (), ("convex", "convex"))
    # the sides: from the gable face to the breast's front (101.3 up), and behind the face above the roof (105.0 up)
    # (each side is ONE field from behind the face to the breast's front: inside the house below the roof it is hidden;
    # the gable's courses end against it, 'concave2' jambs: its groove runs through)
    for (a, b, e, h0) in (((U_S - 0.60, CW1), (U_S + 0.20, CW1), ("convex", "convex"), 101.30), ((U_S + 0.20, CW0), (U_S - 0.60, CW0), ("convex", "convex"), 101.30)):
        frs, Ls = Frame.of(a[0], a[1], b[0], b[1])
        wall_field(frs, 0.0, Ls, h0, lambda s: CTOP, (), e)
    frk, Lk = Frame.of(U_S - 0.60, CW0, U_S - 0.60, CW1)
    wall_field(frk, 0.0, Lk, 105.0, lambda s: CTOP, (), ("convex", "convex"))
    hbox(U_S - 0.64, U_S + 0.24, CW0 - 0.04, CW1 + 0.04, CTOP - 0.0565, CTOP - 0.0185, BRICK, C_COURSE, skip=())
    hbox(U_S - 0.62, U_S + 0.22, CW0 - 0.02, CW1 + 0.02, CTOP - 0.025, CTOP + 0.06, CONC, C_COPING, skip=("bottom",))
    for k in range(3):
        g = 0.01 if k == 0 else 0.0
        a0, a1 = CW0 + 0.16 * k - g, CW1 - 0.16 * k + g
        hbox(U_S - 0.03, U_S + 0.20 - 0.06 * k + g, a0, a1, 101.30 - COURSE * (k + 1) - 0.004, 101.30 - COURSE * k + (0.02 if k == 0 else 0.0) - 0.004 * k, BRICK, C_COURSE, skip=("top", "left"))
    # the lattice tops (projecting brick panels) above a soldier band: both east gables
    for (f, top_) in ((e2, tops["east_N"]), (e1h, tops["east_S_hi"])):
        hb = f.mat_split[0]
        soldier_band(f, top_, hb - 0.10)
        PT.lattice(f.fr, 0.05, f.L - 0.05, hb + 0.02, lambda s, t=top_: t(s) - 0.04)
    # the north wing's dormer (in roof D's east slope, v03: a 3-light timber window, a white slab roof)
    DF, DB, DW0, DW1, DT = 5.40, 4.50, -6.80, -4.45, 100.72
    frd, Ld = Frame.of(DF, DW1, DF, DW0)
    od = Opening(0.12, Ld - 0.12, 99.45, 100.55, depth=0.10)
    wall_field(frd, 0.0, Ld, 98.9, lambda s: DT, [od], ("convex", "convex"))
    PT.window(frd, od.s0, od.s1, od.h0, od.h1, "wood", 3, 2, d=-0.05)
    for (a, b, e) in (((DB, DW1), (DF, DW1), ("free", "convex")), ((DF, DW0), (DB, DW0), ("convex", "free"))):
        frs, Ls = Frame.of(a[0], a[1], b[0], b[1])
        wall_field(frs, 0.0, Ls, 98.9, lambda s: DT, (), e)
    PT.slab([(DB - 0.10, DF + 0.32, DW0 - 0.12, -3.95, "nsew")], DT + 0.15, 0.17)
    # downpipes (east): at the bay's north corner from the middle hood to the canopy; the north wing's
    PT.downpipe(U_BAY + 0.07, W_VAL - 0.07, H_SPLIT - 0.06, CT - 0.02)
    PT.downpipe(U_NWING + 0.08, -7.40, 97.6, ground(U_NWING + 0.1, -7.4) - 0.1)
    # ---------------- SOUTH
    sa = FD["south_A"]
    box_window(sa)
    # the ground-floor bay of the south gable (v00: picture window + two side lights under a slab)
    AB0, AB1, AW = -1.55, 2.85, 9.00
    frA, LA = Frame.of(AB0, AW, AB1, AW)
    sA = lambda u: (P(u, AW, OY) - frA.O).dot(frA.U)
    opsA = [Opening(sA(-1.19), sA(-0.69), 95.65, 97.85, depth=0.12), Opening(sA(-0.55), sA(1.85), 95.65, 97.85, depth=0.12),
            Opening(sA(1.99), sA(2.49), 95.65, 97.85, depth=0.12)]
    brick_faces(AB0, AB1, W_A, AW, ground_min(AB0, AW, AB1, AW) - 0.4, 98.00, "esw", openings={"s": opsA})
    for o_, (ll, rr) in zip(opsA, ((1, 4), (3, 2), (1, 4))):
        PT.window(frA, o_.s0, o_.s1, o_.h0, o_.h1, "white", ll, rr, d=-0.05)
    PT.slab([(-1.83, 3.18, W_A - 0.03, 9.42, "wes")], 98.05, 0.18)
    planter(AB0 - 0.05, AB1 + 0.05, AW, AW + 0.55, "n")
    # the south-west part: the corbelled first-floor corner oriel and the concrete eave slab (v00, v02)
    OU0, OU1, OW0, OW1 = -6.10, -3.90, 6.00, 7.30
    ops_s = [Opening(0.15, 1.55, 99.60, 101.20, depth=0.12)]
    ops_w = [Opening(OW1 - 6.90, OW1 - 6.20, 99.60, 101.20, depth=0.12)]
    # its four walls: west, south (convex corners), the east return to the south-west wall and the north return to the
    # big gable (the house's walls own those corners: their grooves run on behind the oriel)
    for (a, b, ops_, e) in (((OU0, OW0), (OU0, OW1), ops_w, ("convex", "convex")), ((OU0, OW1), (OU1, OW1), ops_s, ("convex", "convex")),
                            ((OU1, OW1), (OU1, W_SW), (), ("convex", "concave2")), ((U_B_W, OW0), (OU0, OW0), (), ("concave2", "convex"))):
        fro, Lo = Frame.of(a[0], a[1], b[0], b[1])
        wall_field(fro, 0.0, Lo, 98.80, lambda s: 101.72, ops_, e)
    frs_, _ = Frame.of(OU0, OW1, OU1, OW1); PT.window(frs_, ops_s[0].s0, ops_s[0].s1, ops_s[0].h0, ops_s[0].h1, "wood", 2, 5, d=-0.06)
    frw_, _ = Frame.of(OU0, OW0, OU0, OW1); PT.window(frw_, ops_w[0].s0, ops_w[0].s1, ops_w[0].h0, ops_w[0].h1, "wood", 1, 5, d=-0.06)
    corbel(OU0, OU1, OW0, OW1, 98.80, steps=3, inset=0.10, sides="nwse")
    PT.slab([(-6.55, -2.45, 6.82, 7.75, "ws"), (-6.55, -5.62, 5.55, 6.82, "nw")], 101.85, 0.20)
    # ---------------- WEST
    w1 = FD["west_C"]
    box_window(w1)
    # the north-west gable's ground-floor bay (v06: a big fixed light between two narrow ones, brick, under a slab)
    CB0, CB1, CU = -4.20, 0.90, -7.60
    frC, LC = Frame.of(CU, CB0, CU, CB1)
    sC = lambda w: (P(CU, w, OY) - frC.O).dot(frC.U)
    opsC = [Opening(sC(-3.60), sC(-3.10), 95.65, 97.70, depth=0.12), Opening(sC(-2.55), sC(-0.15), 95.65, 97.70, depth=0.12),
            Opening(sC(0.40), sC(0.80), 95.65, 97.70, depth=0.12)]
    brick_faces(CU, U_C_W, CB0, CB1, ground_min(CU, CB0, CU, CB1) - 0.4, 98.02, "nws", openings={"w": opsC})
    for o_, (ll, rr) in zip(opsC, ((1, 6), (2, 4), (1, 6))):
        PT.window(frC, o_.s0, o_.s1, o_.h0, o_.h1, "white", ll, rr, d=-0.05)
    PT.slab([(-8.05, U_C_W - 0.03, -4.45, 1.15, "nsw")], 98.10, 0.18)
    planter(CU - 0.55, CU, CB0 - 0.05, CB1 + 0.05, "e")
    # the big south-west gable's long bay of white French windows (v02, v06): white piers, one slab round the corner
    BU = -6.25
    frB, LB = Frame.of(BU, W_C_S, BU, W_SW)
    sB = lambda w: (P(BU, w, OY) - frB.O).dot(frB.U)
    opsB = [Opening(sB(c - 0.74), sB(c + 0.74), GF + 0.02, 97.62, depth=0.10, jambs="brick", head="brick", sill=None) for c in (2.30, 3.98, 5.66)]
    wall_field(frB, 0.0, LB, GF - 0.35, lambda s: 97.90, opsB, ("concave2", "convex"), mat=CONC, far=True)
    for o_ in opsB: PT.window(frB, o_.s0, o_.s1, o_.h0, o_.h1, "white", 2, 6, d=-0.04)
    frBs, LBs = Frame.of(BU, W_SW, U_B_W, W_SW)
    ob = Opening(0.10, LBs - 0.08, GF + 0.02, 97.62, depth=0.10)
    wall_field(frBs, 0.0, LBs, GF - 0.35, lambda s: 97.90, [ob], ("convex", "concave2"), mat=CONC, far=True)
    PT.window(frBs, ob.s0, ob.s1, ob.h0, ob.h1, "white", 1, 6, d=-0.04)
    PT.slab([(-6.70, U_B_W + 0.03, 1.32, 6.82, "w"), (-6.70, -4.05, 6.82, 7.35, "wse")], 97.95, 0.18)
    planter(BU - 0.55, BU, W_C_S + 0.05, W_SW + 0.05, "e")
    # downpipes (west, south)
    PT.downpipe(U_B_W - 0.08, W_C_S + 0.08, 101.6, 97.95)
    PT.downpipe(U_A0 - 0.08, W_A - 0.10, 101.6, 98.05)
    PT.downpipe(U_A0 - 0.08, W_SW + 0.10, 98.0, ground(U_A0 - 0.1, W_SW + 0.1) - 0.1)
    # ---------------- the NW wing (ESTIMATED): a first-floor window pair under a slab, the green veranda (v06, v01)
    a0, a1, b1, b0 = NWW
    frn, Ln = Frame.of(a1[0], a1[1], a0[0], a0[1])
    for c in (Ln * 0.3, Ln * 0.7):
        fbox(frn, c - 0.45, c + 0.45, 99.35, 100.45, -0.02, 0.03, WOODV, C_FRAME, skip=("back",))
        fbox(frn, c - 0.38, c + 0.38, 99.42, 100.38, 0.03, 0.035, GLASS, C_PANE, skip=("back",))
    veranda(frn, Ln)

def build_all(bvh, roof_bm):
    """the walls (traversed with the outside on the right seen from above with w down: east walls run north, west
    walls south, south walls east, north walls west) and their openings; then the parts"""
    F = []
    # ---- EAST: the big south-east gable (B's east end), its projecting bay (the right half, up to the middle hood)
    e1 = Facade("east_S", (U_S, W_SE), (U_S, W_BAY), ends=("convex", "concave"), top=lambda s: H_SPLIT)
    e1.win(6.17, 1.00, GF + 0.02, 97.55, family="white", lights=2, rows=6, d=-0.05, tag="gf")
    e1.win(6.16, 1.34, 99.25, 100.85, rows=5, tag="ff")
    F.append(e1)
    e1h = Facade("east_S_hi", (U_S, W_SE), (U_S, W_VAL), ends=("convex", "convex"), h_bot=H_SPLIT)
    e1h.win(5.10, 0.80, 102.52, 103.46, rows=4, lights=1, tag="attic_l")
    e1h.win(2.85, 0.80, 102.55, 103.55, rows=4, lights=1, tag="attic_r")
    sbr0, sbr1 = sorted((e1h.s(w=CHIM[1]), e1h.s(w=CHIM[0])))
    e1h.ops.append(Opening(sbr0, sbr1, 101.30, 112.0, depth=0.0, jambs="concave2", head=None, sill=None, snap=False))
    e1h.mat_split = (103.95, BPAT)
    F.append(e1h)
    bay_top = lambda s: H_SPLIT
    F.append(Facade("east_bay_s", (U_S, W_BAY), (U_BAY, W_BAY), ends=("concave2", "convex"), top=bay_top))
    eb = Facade("east_bay", (U_BAY, W_BAY), (U_BAY, W_VAL), ends=("convex", "convex"), top=bay_top)
    eb.win(2.27, 1.50, 99.25, 100.85, rows=5, tag="ff")
    F.append(eb)
    F.append(Facade("east_bay_n", (U_BAY, W_VAL), (U_N, W_VAL), ends=("convex", "concave2"), h_bot=97.95, top=bay_top))
    F.append(Facade("east_ret", (U_S, W_VAL), (U_N, W_VAL), ends=("convex", "concave2"), h_bot=H_SPLIT, below=0.20))   # (under the valley line)
    # ---- EAST: the smaller north-east gable (C's east end) above the porch: attic twin, the stair window, lattice top
    e2 = Facade("east_N", (U_N, W_VAL), (U_N, W_NG), ends=("concave", "convex"), h_bot=97.95)
    e2.win(-1.35, 1.27, 102.96, 103.58, rows=2, lights=2, tag="attic")
    e2.win(-1.35, 2.20, 98.45, 100.90, rows=8, lights=3, glass=LEAD, tag="stair")
    e2.mat_split = (snap_course(103.25, "j0"), BPAT)          # the band over the attic window (v03 pose 103.1)
    F.append(e2)
    F.append(Facade("east_N_cheek", (U_N, W_NG), (3.9, W_NG), ends=("convex", "free"), h_bot=99.0))
    # the porch box (ground floor, under the canopy): front wall with the door recess and two leaded windows, sides
    porch_top = lambda s: 97.87
    ep = Facade("porch_front", (U_PORCH, W_PORCH_S), (U_PORCH, W_NG), ends=("convex", "convex"), top=porch_top)
    ep.win(0.30, 0.66, 96.20, 97.50, family="white", lights=1, rows=6, glass=LEAD, depth=0.16, tag="lead_l")
    ep.door = ep.win(-1.35, 1.48, GF, 97.62, kind="none", depth=0.11, tag="door")
    ep.win(-3.00, 0.66, 96.20, 97.50, family="white", lights=1, rows=6, glass=LEAD, depth=0.16, tag="lead_r")
    F.append(ep)
    F.append(Facade("porch_s", (U_BAY, W_PORCH_S), (U_PORCH, W_PORCH_S), ends=("concave2", "convex"), top=porch_top))
    F.append(Facade("porch_n", (U_PORCH, W_NG), (U_NWING, W_NG), ends=("convex", "concave2"), top=porch_top))
    # ---- EAST: the north wing (under roof D's east slope): a timber door + a window (under one slab); the dormer
    e4 = Facade("east_wing", (U_NWING, W_NG), (U_NWING, NORTH[0][1]), ends=("concave", "free"))
    e4.win(-5.03, 0.62, GF, 97.75, family="wood", lights=1, rows=1, d=-0.05, tag="door")
    e4.win(-6.42, 1.45, 96.35, 97.60, lights=3, rows=2, tag="gf")
    F.append(e4)
    # ---- SOUTH (west -> east): the south-west part, the south gable (A) and its sides, the south-east part
    s1 = Facade("south_W", (U_B_W, W_SW), (U_A0, W_SW), ends=("convex", "concave"))
    s1.win(-4.10, 1.60, GF + 0.02, 97.75, family="white", lights=2, rows=6, d=-0.05, tag="gf")
    F.append(s1)
    F.append(Facade("south_A_w", (U_A0, W_SW), (U_A0, W_A), ends=("concave2", "convex")))
    sa = Facade("south_A", (U_A0, W_A), (U_A1, W_A), ends=("convex", "convex"))
    sa.box = sa.win(0.65, 2.60, 98.95, 100.95, kind="none", jambs=None, head=None, depth=0.16, tag="box")
    sa.win(0.65, 1.95, 102.40, 103.40, rows=3, lights=3, tag="attic")
    sa.mat_split = (103.62, BPAT)
    F.append(sa)
    F.append(Facade("south_A_e", (U_A1, W_A), (U_A1, W_SE), ends=("convex", "concave")))
    s5 = Facade("south_E", (U_A1, W_SE), (U_S, W_SE), ends=("concave2", "convex"))
    s5.win(4.75, 1.30, 99.25, 100.85, rows=5, tag="ff")
    F.append(s5)
    # ---- WEST (north -> south): the NW wing's link, the north-west gable (C), the step, the big south-west gable (B)
    w1 = Facade("west_C", (U_C_W, W_C_N), (U_C_W, W_C_S), ends=("concave2", "convex"))
    w1.box = w1.win(-1.35, 2.70, 98.95, 100.85, kind="none", jambs=None, head=None, depth=0.16, tag="box")
    w1.win(-1.35, 1.05, 102.85, 103.55, rows=2, lights=2, tag="attic")
    w1.mat_split = (103.70, BPAT)
    F.append(w1)
    F.append(Facade("west_step", (U_C_W, W_C_S), (U_B_W, W_C_S), ends=("convex", "concave")))
    w3 = Facade("west_B", (U_B_W, W_C_S), (U_B_W, W_SW), ends=("concave2", "convex"))
    w3.win(1.80, 0.45, 99.60, 100.40, rows=2, lights=1, tag="small")
    w3.win(3.45, 1.50, 99.20, 100.85, rows=5, tag="ff")
    w3.win(3.70, 2.00, 102.25, 103.85, rows=3, lights=3, tag="attic")
    w3.mat_split = (103.95, BPAT)
    F.append(w3)
    # ---- NORTH: against 509389 (hidden; 3 cm inside the shared line), the NW wing (ESTIMATED except its plan)
    (u1, w1_), (u2, w2_) = NORTH
    F.append(Facade("north", (u1, w1_ + 0.06), (u2, w2_ + 0.06), ends=("free", "free")))
    F[-1].flat = True                       # hidden against 509389: no courses
    a0, a1, b1, b0 = [tuple(x) for x in NWW]
    F.append(Facade("nw_nw", b1, a1, ends=("free", "convex")))
    F.append(Facade("nw_sw", a1, a0, ends=("convex", "convex")))
    F.append(Facade("nw_link", a0, (U_C_W, W_C_N), ends=("convex", "concave")))
    tops = {}
    for f in F:
        tops[f.name] = build_facade(f, bvh)
    FD = {f.name: f for f in F}
    build_parts(FD, tops)
    return F, tops

# ------------------------------------------------------------------------------------------------ run
K.B = Builder(); K.FAR = False
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
roof_bm = RF.union_roof(build_roof_solids())
tops_, soffits_, ends_ = RF.roof_faces(roof_bm)
bvh = BVHTree.FromPolygons([v.co.copy() for v in roof_bm.verts], [[v.index for v in f.verts] for f in roof_bm.faces if f.normal.z > 0.2])
print(f"roof union: {len(roof_bm.faces)} faces ({len(tops_)} tops, {len(soffits_)} soffits, {len(ends_)} ends) {time.time() - T0:.1f}s")

def landmarks(F, tops):
    """named 3D points (u, w, h) for the photo poses: every opening's corners, every wall's top (gable apex), the roof's
    ridge ends at the verges"""
    for f in F:
        top = tops[f.name]
        xs = [f.L * i / 200 for i in range(201)]; hs = [top(x) for x in xs]
        k = max(range(201), key=lambda i: hs[i])
        p = f.fr.p(xs[k], hs[k] + f.below, 0.0)
        lm(f"{f.name}.apex", p.x, -p.y, p.z + OY)
        for j, o in enumerate(f.ops):
            for (cn, (ss, hh)) in (("bl", (o.s0, o.h0)), ("br", (o.s1, o.h0)), ("tr", (o.s1, o.h1)), ("tl", (o.s0, o.h1))):
                q = f.fr.p(ss, hh, 0.0)
                lm(f"{f.name}.{o.tag or 'o%d' % j}.{cn}", q.x, -q.y, hh)
        for (cn, ss) in (("start", 0.0), ("end", f.L)):
            q = f.fr.p(ss, f.h_bot, 0.0)
            lm(f"{f.name}.{cn}.ground", q.x, -q.y, ground(q.x, -q.y))
            lm(f"{f.name}.{cn}.top", q.x, -q.y, top(ss) + f.below)
    for f in F:
        n = f.fr.N; o = f.fr.O
        PLANES[f.name] = [round(n.x, 5), round(-n.y, 5), round(o.x * n.x + o.y * n.y, 4), round(f.fr.U.x, 5), round(-f.fr.U.y, 5)]
    lm("ridgeA.south", RA["c"], W_A + VERGE, RA["h"]); lm("ridgeB.east", U_S + VERGE, RB["c"], RB["h"]); lm("ridgeB.west", U_B_W - VERGE, RB["c"], RB["h"])
    lm("ridgeC.east", U_N + VERGE, RC["c"], RC["h"]); lm("ridgeC.west", U_C_W - VERGE, RC["c"], RC["h"])

def build_lod(far):
    K.B = Builder(); K.FAR = far
    F, tops = build_all(bvh, roof_bm)
    if not far: landmarks(F, tops)
    for (n, polys) in RF.group_planes(tops_):
        RF.lay_courses(n, polys, flat_slot=ZINC)
    RF.trims(roof_bm)         # (the soffits, verges and fascias are the union's non-top faces, emitted there)
    return K.B
B_MAIN = build_lod(False)
print(f"LOD0: {len(B_MAIN.f)} faces {time.time() - T0:.1f}s")
B_FAR = build_lod(True)
print(f"far: {len(B_FAR.f)} faces {time.time() - T0:.1f}s")

json.dump({"landmarks": LANDMARKS, "planes": PLANES}, open(os.path.join(OUT, "vanbuuren_landmarks.json"), "w"), indent=0)
if "--quick" in ARGS:
    mats_q = [bpy.data.materials.new(n) for n in SLOTS]
    used = sorted(set(B_MAIN.m)); remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new("Villa"); me.from_pydata([tuple(p) for p in B_MAIN.v], [], B_MAIN.f); me.update()
    for m in used: me.materials.append(mats_q[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in B_MAIN.m])
    o = bpy.data.objects.new("Villa", me); scn.collection.objects.link(o)
    print("Villa tris", sum(len(p.vertices) - 2 for p in me.polygons))
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "vanbuuren_quick.blend"))
    sys.exit(0)
# ------------------------------------------------------------------------------------------------ mesh
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); mats.append(m)
AO_SPLIT = 0.86          # LOD0 (+ its courses) in v 0..AO_SPLIT, the far variant above
AO_PARK_U = 0.997
PACK_SHAPE = "CONCAVE" if "--fast" not in ARGS else "AABB"

def split_builder(bld, keep):
    """a builder with the faces where keep(i) (the LOD0 courses go to their own node)"""
    out = Builder()
    for i in range(len(bld.f)):
        if not keep(i): continue
        pts = [bld.v[j] for j in bld.f[i]]
        i0 = len(out.v); out.v.extend(pts); out.f.append(tuple(range(i0, i0 + len(pts))))
        for a in ("m", "c", "uv", "g", "sm", "rw", "lp"): getattr(out, a).append(getattr(bld, a)[i])
    return out

def is_course(bld, i):
    lp = bld.lp[i]
    if lp is None: return False
    if len(lp) == 4: return bld.c[i] in (C_COURSE, C_JOINT)
    return bld.m[i] == TILES and bld.c[i] == C_PLAIN

def region_width(me, override):
    """COLOR_0.b = sqrt(width / 4 m) of the face's region (edge-connected faces turning < 50 deg face to face: its
    second extent, or 2 x area / perimeter when smaller), or the builder's override (course faces: the wall's width;
    the grooves' tops / bottoms: 2 cm): the viewer's anti-sparkle bends sub-pixel parts' normals toward the view"""
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
            o = 0.0
        else:
            t = Vector((1, 0, 0)); b = Vector((0, 1, 0)); o = 0.0
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b) + (OY - KT.COURSE_BASE if abs(n.z) < 0.75 else 0.0)
    uv0.data.foreach_set("uv", uvd)
    # lightmap projection per face (planar groups) kept as attributes through the weld
    lmu = me.uv_layers.new(name="Lightmap")
    lmd = [0.0] * (2 * len(me.loops)); planar = [False] * len(me.polygons)
    for poly, lp in zip(me.polygons, bld.lp):
        if lp is None: continue
        planar[poly.index] = True
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            if len(lp) == 4: _, O, U, N = lp; lmd[2 * li] = (p - O).dot(U); lmd[2 * li + 1] = p.z
            else: _, O, X, N, Y = lp; lmd[2 * li] = (p - O).dot(X); lmd[2 * li + 1] = (p - O).dot(Y)
    lmu.data.foreach_set("uv", lmd)
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    pa = me.attributes.new("planar", "INT", "FACE"); pa.data.foreach_set("value", [int(x) for x in planar])
    sa = me.attributes.new("smoothf", "INT", "FACE"); sa.data.foreach_set("value", [int(x) for x in bld.sm])
    rwa = me.attributes.new("rw", "FLOAT", "FACE"); rwa.data.foreach_set("value", [(-1.0 if r is None else r) for r in bld.rw])
    obj = bpy.data.objects.new(name, me); scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    # weld (0.4 mm), the smooth zinc parts apart from the rest (their smooth normals must not reach a flat neighbour)
    zi = {i for i, m in enumerate(me.materials) if m.name == "zinc_gutter"}
    zv = {v for f in bm.faces if f.material_index in zi for v in f.verts}
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v not in zv], dist=0.0004)
    bmesh.ops.remove_doubles(bm, verts=[v for v in bm.verts if v.is_valid and v in zv], dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    # FLAT faces everywhere (the owner's rule: flat walls keep flat normals), smooth only where the builder said so
    # (pipes, gutters, ridge rolls, the basin), with sharp edges by angle between smooth faces
    sm = [0] * len(me.polygons); me.attributes["smoothf"].data.foreach_get("value", sm)
    # (only the round zinc parts can be smooth; set_sharp_from_angle FIRST: in Blender 5 it marks every face smooth)
    me.set_sharp_from_angle(angle=math.radians(35))
    zi = [i for i, m in enumerate(me.materials) if m.name == "zinc_gutter"]
    me.polygons.foreach_set("use_smooth", [bool(x) and p.material_index in zi for x, p in zip(sm, me.polygons)])
    me.validate()
    rw = [0.0] * len(me.polygons); me.attributes["rw"].data.foreach_get("value", rw)
    region_width(me, [None if r < 0 else r for r in rw])
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    return obj, ntri, {SLOTS[mats.index(me.materials[i])]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == i) for i in range(len(me.materials))}

def lightmap(objs, v0, v1):
    """one lightmap region (v0..v1) for these objects: planar course fields keep their projection (one island each),
    the rest smart-projected; THIN faces (< 6 cm across, not planar fields) take no texels (parked at AO 1.0, their AO
    goes per vertex); islands averaged and packed together"""
    for o in scn.objects: o.select_set(False)
    thin_all = {}
    for obj in objs:
        me = obj.data
        planar = [0] * len(me.polygons); me.attributes["planar"].data.foreach_get("value", planar); planar = [bool(x) for x in planar]
        thin = [False] * len(me.polygons)
        for p_ in me.polygons:
            if planar[p_.index]: continue
            co = [me.vertices[v].co for v in p_.vertices]
            mx = max((co[i] - co[(i + 1) % len(co)]).length for i in range(len(co)))
            thin[p_.index] = mx > 0 and p_.area / mx < (0.06 if len(co) == 4 else 0.03)
        thin_all[obj.name] = thin
        me.uv_layers.active = me.uv_layers["Lightmap"]
        obj.select_set(True)
        bpy.context.view_layer.objects.active = obj
        bpy.ops.object.mode_set(mode="EDIT")
        bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
        for f_ in bm.faces: f_.select_set(not thin[f_.index] and not planar[f_.index])
        bm.select_flush_mode(); bmesh.update_edit_mesh(me)
        bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
        bpy.ops.object.mode_set(mode="OBJECT")
        # split islands by construction group (no island bridging two parts that only touch)
        lmd = me.uv_layers["Lightmap"].data
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
    dens = 0.0; cov = 0.0; area = 0.0
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
        for a in ("grp", "planar", "smoothf", "rw"):
            if a in obj.data.attributes: obj.data.attributes.remove(obj.data.attributes[a])
    return thin_all, dens

B_COURSES = split_builder(B_MAIN, lambda i: is_course(B_MAIN, i))
B_REST = split_builder(B_MAIN, lambda i: not is_course(B_MAIN, i))
obj, ntri0, per_slot0 = make_mesh("Villa", B_REST)
crs, ntri_c, per_slot_c = make_mesh("Villa_courses", B_COURSES)
far, ntri_far, per_slot_far = make_mesh("Villa_far", B_FAR)
thin0, dens0 = lightmap([obj, crs], 0.0, AO_SPLIT)
thin1, dens1 = lightmap([far], AO_SPLIT + 0.005, 1.0)
print(f"meshes + lightmaps {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground for the bake + previews
def load_ground():
    import numpy as np
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + _g["base"]
    st = 2; a = a[::st, ::st]; step = _g["step"] * st; rows, cols = a.shape
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
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.18, 0.13, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g
ground_obj = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("vanbuuren_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    scn.cycles.samples = 64 if "--fast" in ARGS else 96
    t = time.time()
    for (targets, others, clear) in (((obj, crs), (far,), True), ((far,), (obj, crs), False)):
        for o in others: o.hide_render = True
        for o in targets: o.hide_render = False
        for o in scn.objects: o.select_set(False)
        for o in targets: o.select_set(True)
        bpy.context.view_layer.objects.active = targets[0]
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=clear)
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    far.hide_render = True; obj.hide_render = crs.hide_render = False
    vertex_ao(obj, thin0[obj.name]); vertex_ao(crs, thin0[crs.name])
    far.hide_render = False; obj.hide_render = crs.hide_render = True; vertex_ao(far, thin1[far.name])
    obj.hide_render = crs.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "vanbuuren_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "vanbuuren_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if m.node_tree and "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
ground_obj.hide_render = False
for o in scn.objects: o.select_set(False)
for o in (obj, crs, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "vanbuuren.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
info = {
    "asset": "Villa van Buuren, Avenue Leo Errera 41 (tools/blender/vanbuuren.py)",
    "triangles_lod0": ntri0 + ntri_c, "triangles_lod0_main": ntri0, "triangles_lod0_courses": ntri_c, "triangles_far": ntri_far,
    "triangles_per_slot_lod0": {k: per_slot0.get(k, 0) + per_slot_c.get(k, 0) for k in set(per_slot0) | set(per_slot_c)},
    "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)",
                              "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres per face: walls (along, up from 90 m TAW: the courses' levels), roofs (along the eave, up the slope)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "brick": {"course_m": COURSE, "bed_joint_m": JOINT, "groove_m": KT.GROOVE, "course_base_taw": KT.COURSE_BASE},
    "tiles": {"gauge_m": RF.TILE_GAUGE, "thick_m": RF.TILE_T},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(dens0, 1), "far_px_per_m": round(dens1, 1),
                 "thin_faces_vertex_ao": [sum(thin0[obj.name]) + sum(thin0[crs.name]), sum(thin1[far.name])]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [SITE["solid"]["id"]], "hides_bu_ids": [SITE["solid"]["bu"]]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "roof": {"A": RA, "B": RB, "C": RC, "D": RD}, "levels_taw": {"ground_floor": GF, "first_floor": FF, "eave_line": EAVE_LINE},
                 "planes": {"U_S": U_S, "U_BAY": U_BAY, "U_N": U_N, "U_PORCH": U_PORCH, "U_CANOPY": U_CANOPY, "U_NWING": U_NWING, "W_A": W_A,
                            "U_B_W": U_B_W, "U_C_W": U_C_W}, "photo_measured_openings": len(PHOTO_MEAS)},
    "estimated": "the north side (against 509389), the NW wing and its veranda (plan from UrbIS, the rest from v06 / v01 from far), "
                 "the east bay's ground floor, the south-east ground floor, the lattice pattern, the leaded patterns, the bays' depths",
}
json.dump(info, open(os.path.join(OUT, "vanbuuren.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_orange_amsterdam": (0.42, 0.11, 0.05), "brick_pattern": (0.46, 0.14, 0.06), "concrete_white": (0.75, 0.73, 0.68),
            "roof_tiles_flat_dark": (0.07, 0.06, 0.055), "wood_varnished": (0.28, 0.11, 0.04), "wood_frame_white": (0.8, 0.8, 0.77),
            "glass_window": (0.02, 0.025, 0.03), "glass_leaded": (0.05, 0.05, 0.04), "oak_door": (0.4, 0.2, 0.06),
            "metal_green_veranda": (0.05, 0.14, 0.09), "zinc_gutter": (0.32, 0.33, 0.34), "stone_blue": (0.2, 0.21, 0.21)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name.startswith("glass") else (0.45 if m.name == "zinc_gutter" else 0.8)
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(48), 0, math.radians(135))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 48; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, tgt, lens=28, res=(1100, 800)):
        cam.location = P(*pos); tg = P(*tgt)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"preview_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    look("east", (20.0, -0.5, 96.6), (5.5, -0.5, 100.8), 26)
    look("west", (-26.0, 12.5, 96.5), (-5.5, 1.5, 100.5), 30)
    look("south", (0.3, 32.0, 95.5), (0.6, 8.0, 101.0), 30)
    look("porch", (11.5, 1.6, 96.4), (7.4, -1.4, 96.9), 28)
    look("aerial", (30.0, 26.0, 124.0), (0.0, 0.0, 100.0), 30)
print(f"done {time.time() - T0:.1f}s")
