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
GF = 95.55               # ground floor: the porch's threshold, two blue-stone steps above the front path (DTM 95.25)
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
W_BAY = 3.20             # the bay's south edge (v03: x 1245)
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

# roofs (DSM): ridge positions / heights, pitches (tan)
RA = dict(c=0.65, h=106.85, t=1.60)      # north-south: the south gable
RB = dict(c=3.70, h=106.80, t=1.57)      # east-west: the big gables (east with the chimney, west)
RC = dict(c=-1.35, h=105.60, t=1.483)    # east-west: the smaller gables
RD = dict(h=104.85, u0=-3.40, u1=2.10, te=1.70, tw=2.00)   # the north wing: flat top, steep sides
VERGE = 0.15             # gable roofs overhang the gable walls
EAVE_OUT = 0.32          # ... and the eave walls

def tan_h(r, x): return r["h"] - abs(x - r["c"]) * r["t"]

def build_roof_solids():
    S = []
    # A: ridge along w at u = c
    S.append(RF.gable_slab("w", RA["c"], RA["h"], RA["t"], RA["t"], -1.6, W_A + VERGE, U_A0 - EAVE_OUT, U_A1 + EAVE_OUT, "A"))
    # B: ridge along u at w = c (north side: dies in C)
    S.append(RF.gable_slab("u", RB["c"], RB["h"], RB["t"], RB["t"], U_B_W - VERGE, U_S + VERGE, W_VAL - 0.02, W_SE + EAVE_OUT, "B"))
    # C: west part (eaves to the north-west gable wall's ends) and east part (the north-east gable)
    S.append(RF.gable_slab("u", RC["c"], RC["h"], RC["t"], RC["t"], U_C_W - VERGE, -2.0, W_C_N - 0.22, W_C_S + 0.22, "Cw"))
    S.append(RF.gable_slab("u", RC["c"], RC["h"], RC["t"], RC["t"], -2.0, U_N + VERGE, W_NG - 0.25, W_C_S + 0.22, "Ce"))
    # D: the north wing, flat top, slopes east / west, the north end on the line against 509389 (2 cm inside)
    t = RF.T_SLAB
    ue, uw = U_NWING + EAVE_OUT, -6.2
    he, hw = RD["h"] - (ue - RD["u1"]) * RD["te"], RD["h"] - (RD["u0"] - uw) * RD["tw"]
    def wn(u):   # the north line, 2 cm inside
        (u1, w1), (u2, w2) = NORTH
        return w1 + (w2 - w1) * (u - u1) / (u2 - u1) + 0.02
    # the east slope's south end stops at the north-east gable's north edge (+ the verge): it must not run out in front
    # of that gable; the plateau runs on to w -1.6 inside roof C
    top = [(RD["u0"], wn(RD["u0"]), RD["h"]), (RD["u1"], wn(RD["u1"]), RD["h"]), (RD["u1"], -1.6, RD["h"]), (RD["u0"], -1.6, RD["h"]),
           (ue, wn(ue), he), (ue, W_NG - 0.25, he), (uw, wn(uw), hw), (uw, -1.6, hw)]
    S.append(RF.block(top + [(u, w, h - t * 1.9) for (u, w, h) in top]))
    # the NW wing (ESTIMATED): a gable along its long axis, hipped over the veranda end, against 509389 at the other
    a0, a1, b1, b0 = [Vector((u, w)) for (u, w) in NWW]       # a0-a1 the SW (veranda) end, b1-b0 the NE end
    ax = ((b1 - a1) + (b0 - a0)) / 2; L = ax.length; ax = ax / L
    cr = Vector((-ax.y, ax.x))
    mid0 = (a0 + a1) / 2; half = (a0 - a1).length / 2
    e_out = half + 0.3; hr, tt = 103.45, 1.30
    he_ = hr - e_out * tt
    pts = []
    for (along, rr) in ((0.0 - 0.3, 1.2), (L - 0.02, 0.0)):
        c0 = mid0 + ax * along
        pts += [(c0 + cr * e_out, he_), (c0 - cr * e_out, he_)]
    ridge_a = mid0 + ax * 1.6; ridge_b = mid0 + ax * (L - 0.02)
    pts += [(ridge_a, hr), (ridge_b, hr)]
    sol = [(p.x, p.y, h) for (p, h) in pts]
    S.append(RF.block(sol + [(u, w, h - t * 1.7) for (u, w, h) in sol]))
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
    def __init__(self, name, a, b, ends=("convex", "convex"), h_bot=None, top=None, below=0.05):
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
    wall_field(f.fr, 0.0, f.L, f.h_bot, top, f.ops, f.ends, mat_split=getattr(f, "mat_split", None))
    for (o, kw) in f.fills:
        kind = kw.get("kind", "window")
        if kind == "window":
            PT.window(f.fr, o.s0, o.s1, o.h0, o.h1, kw.get("family", "wood"), kw.get("lights", 2), kw.get("rows", 4),
                      d=kw.get("d", -0.06), glass=kw.get("glass", GLASS), transom=kw.get("transom"), sill=kw.get("sill_block", True))
        elif kind == "none":
            pass
    return top

def build_all(bvh, roof_bm):
    """the walls (traversed with the outside on the right seen from above with w down: east walls run north, west
    walls south, south walls east, north walls west) and their openings; then the parts"""
    F = []
    H_SPLIT = snap_course(100.99, "j0")     # the bay's top under the middle hood (a course line)
    # ---- EAST: the big south-east gable (B's east end), its projecting bay (the right half, up to the middle hood)
    e1 = Facade("east_S", (U_S, W_SE), (U_S, W_BAY), ends=("convex", "concave"), top=lambda s: H_SPLIT)
    e1.win(6.17, 1.00, GF + 0.02, 97.55, family="white", lights=2, rows=6, d=-0.05, tag="gf")
    e1.win(6.16, 1.34, 99.25, 100.85, rows=5, tag="ff")
    F.append(e1)
    e1h = Facade("east_S_hi", (U_S, W_SE), (U_S, W_VAL), ends=("convex", "convex"), h_bot=H_SPLIT)
    e1h.win(5.10, 0.80, 102.52, 103.46, rows=4, lights=1, tag="attic_l")
    e1h.win(2.95, 0.84, 102.55, 103.55, rows=4, lights=1, tag="attic_r")
    e1h.mat_split = (103.95, BPAT)
    F.append(e1h)
    bay_top = lambda s: H_SPLIT
    F.append(Facade("east_bay_s", (U_S, W_BAY), (U_BAY, W_BAY), ends=("concave2", "convex"), top=bay_top))
    eb = Facade("east_bay", (U_BAY, W_BAY), (U_BAY, W_VAL), ends=("convex", "convex"), top=bay_top)
    eb.win(2.27, 1.50, 99.25, 100.85, rows=5, tag="ff")
    F.append(eb)
    F.append(Facade("east_bay_n", (U_BAY, W_VAL), (U_N, W_VAL), ends=("convex", "concave2"), h_bot=97.95, top=bay_top))
    F.append(Facade("east_ret", (U_S, W_VAL), (U_N, W_VAL), ends=("convex", "concave2"), h_bot=H_SPLIT))
    # ---- EAST: the smaller north-east gable (C's east end) above the porch: attic twin, the stair window, lattice top
    e2 = Facade("east_N", (U_N, W_VAL), (U_N, W_NG), ends=("concave", "convex"), h_bot=97.95)
    e2.win(-1.35, 1.27, 102.96, 103.58, rows=2, lights=2, tag="attic")
    e2.win(-1.35, 2.20, 98.45, 100.90, rows=8, lights=3, glass=LEAD, tag="stair")
    e2.mat_split = (103.64, BPAT)
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
    s1.win(-4.20, 1.30, 99.25, 100.85, rows=5, tag="ff")
    F.append(s1)
    F.append(Facade("south_A_w", (U_A0, W_SW), (U_A0, W_A), ends=("concave2", "convex")))
    sa = Facade("south_A", (U_A0, W_A), (U_A1, W_A), ends=("convex", "convex"))
    sa.win(0.65, 3.10, 95.75, 97.75, family="white", lights=3, rows=1, d=-0.05, tag="gf")
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
    w1.win(-1.35, 3.00, GF + 0.10, 97.85, family="white", lights=3, rows=6, d=-0.05, tag="gf")
    w1.box = w1.win(-1.35, 2.70, 98.95, 100.85, kind="none", jambs=None, head=None, depth=0.16, tag="box")
    w1.win(-1.35, 1.05, 102.85, 103.55, rows=2, lights=2, tag="attic")
    w1.mat_split = (103.70, BPAT)
    F.append(w1)
    F.append(Facade("west_step", (U_C_W, W_C_S), (U_B_W, W_C_S), ends=("convex", "concave")))
    w3 = Facade("west_B", (U_B_W, W_C_S), (U_B_W, W_SW), ends=("concave2", "convex"))
    w3.win(3.90, 4.60, GF + 0.02, 97.90, family="white", lights=6, rows=6, d=-0.05, tag="gf")
    w3.win(1.80, 0.45, 99.60, 100.40, rows=2, lights=1, tag="small")
    w3.win(3.45, 1.50, 99.20, 100.85, rows=5, tag="ff")
    w3.win(3.70, 2.00, 102.25, 103.85, rows=3, lights=3, tag="attic")
    w3.mat_split = (103.95, BPAT)
    F.append(w3)
    # ---- NORTH: against 509389 (hidden; 3 cm inside the shared line), the NW wing (ESTIMATED except its plan)
    (u1, w1_), (u2, w2_) = NORTH
    F.append(Facade("north", (u1, w1_ + 0.03), (u2, w2_ + 0.03), ends=("free", "free")))
    a0, a1, b1, b0 = [tuple(x) for x in NWW]
    F.append(Facade("nw_ne", (b0[0] - 0.02, b0[1] + 0.03), (b1[0] + 0.02, b1[1] + 0.03), ends=("free", "free")))
    F.append(Facade("nw_nw", b1, a1, ends=("free", "convex")))
    F.append(Facade("nw_sw", a1, a0, ends=("convex", "convex")))
    F.append(Facade("nw_link", a0, (U_C_W, W_C_N), ends=("convex", "concave")))
    tops = {}
    for f in F:
        tops[f.name] = build_facade(f, bvh)
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
    for (n, pts) in tops_:
        RF.lay_courses(n, pts, flat_slot=ZINC)
    for (n, pts) in soffits_:
        face_dir(pts, n, WOODV, C_SOFFIT)
    return K.B
B_MAIN = build_lod(False)
print(f"LOD0: {len(B_MAIN.f)} faces {time.time() - T0:.1f}s")
B_FAR = build_lod(True)
print(f"far: {len(B_FAR.f)} faces {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ quick mesh + preview (development)
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
def quick_object(name, bld):
    used = sorted(set(bld.m)); remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(p) for p in bld.v], [], bld.f); me.update()
    for m in used: me.materials.append(mats[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in bld.m])
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    print(name, "tris", sum(len(p.vertices) - 2 for p in me.polygons))
    return o
json.dump({"landmarks": LANDMARKS, "planes": PLANES}, open(os.path.join(OUT, "vanbuuren_landmarks.json"), "w"), indent=0)
if "--quick" in ARGS:
    o0 = quick_object("Villa", B_MAIN)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT, "vanbuuren_quick.blend"))
