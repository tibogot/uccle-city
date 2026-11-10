"""UCCLE TOWN HALL (Maison communale d'Uccle, Place Jean Vander Elst 29; 1872-1882, probably Baptiste Van der Elst,
"Louis XIII" brick and stone with high slate mansards): built entirely in code (no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/townhall.py -- <out_dir> [--no-bake] [--previews]
      <out_dir>/townhall.raw.glb   node "TownHall" (LOD0) + node "TownHall_far" (the scripted far variant); one primitive
                                   per NAMED material slot (brick_red_brussels, stone_white, slate, zinc_roof, ...)
      <out_dir>/townhall_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      <out_dir>/townhall.json      the measurements used, slots and codes, placement, counts
      docs/townhall/preview_*.png  Cycles renders (--previews)

INPUT: <out_dir>/site.json + site_dtm.bin (tools/townhall_measure.py): the UrbIS solid's footprint in the BUILDING FRAME
(u east, w south, symmetric about w = 0), the roof levels of each part in the UrbIS DSM 2021, the ground (DTM).
Bays, storeys, pediments, dormers and oculi follow the photos facade by facade (data/raw/refs/townhall/SOURCES.md):
  east (main) facade: Commons 3557uccleTownHall.jpg (D. Edgar, CC BY-SA 3.0) + the heritage inventory's two views;
  south facade: the inventory's corner view only; north = the mirror of the south (the plan and the roof are symmetric);
  west facade: no photo anywhere, ESTIMATED from the plan (marked in NOTES.md).

SWAPPABLE MATERIALS: the GLB carries NO colour and NO texture.
  - every face is in a NAMED material slot (SLOTS); one primitive per slot = one draw call per slot;
  - COLOR_0.r = per-face code (CODES) / 16 + 1/32; COLOR_0.g = per-vertex baked AO of the THIN parts (glazing bars,
    band tops, balusters...: they take no lightmap texels), 1 elsewhere;
  - TEXCOORD_0 = world metres per face (walls: u along the wall, v up; lathed parts: arc length);
  - TEXCOORD_1 = the lightmap UV of the baked AO (lighting only).

Frame: Blender x = u, y = -w, z = m TAW - OY. glTF (Y up) -> three.js local (u, TAW - OY, w): place the node at the
city position of the frame origin, height OY, rotation.y = -rotation (site.json frame).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/townhall")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "townhall")
T0 = time.time()
SITE = json.load(open(os.path.join(OUT, "site.json")))
FR = SITE["frame"]
OXC, OZC = FR["origin_city"]; ROT = FR["rotation_rad"]
OY = 60.0

SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_frame_dark",
         "glass_window", "cast_iron_green", "cobbles"]
BRICK, STONE, BLUE, SLATE, ZINC, WOOD, DOOR_WOOD, GLASS, IRON, COBBLES = range(10)
CODES = ["plain", "band", "surround", "cornice", "plinth", "pilaster", "sill", "keystone", "pediment", "baluster", "column",
         "interior", "seam", "coping", "console", "door"]
(C_PLAIN, C_BAND, C_SUR, C_CORN, C_PLINTH, C_PIL, C_SILL, C_KEY, C_PED, C_BAL, C_COL, C_INT, C_SEAM, C_COPING,
 C_CONSOLE, C_DOOR) = range(16)

Z = Vector((0, 0, 1))
V3 = lambda x, y, z: Vector((x, y, z))
def P(u, w, h=None): return Vector((u, -w, 0.0 if h is None else h - OY))
def hz(h): return h - OY

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

# ------------------------------------------------------------------------------------------------ builder
class Builder:
    """faces + per-face slot, code, optional UV0, construction group (lightmap islands are split by group)"""
    def __init__(self): self.v = []; self.f = []; self.m = []; self.c = []; self.uv = []; self.g = []; self.grp = 0
    def face(self, pts, mat, code=0, uv=None):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.m.append(mat); self.c.append(code); self.uv.append(uv); self.g.append(self.grp)
    def new_group(self): self.grp += 1
B = Builder()
FAR = False

def quad(a, b, c, d, mat, code=0, uv=None): B.face([a, b, c, d], mat, code, uv)
def newell(pts):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n
def face_dir(pts, want, mat, code=0, uv=None):
    pts = list(pts)
    if newell(pts).dot(want) < 0:
        pts.reverse(); uv = list(reversed(uv)) if uv else None
    B.face(pts, mat, code, uv)
def face_up(pts, mat, code=0): face_dir(pts, Z, mat, code)

class Frame:
    """Planar wall frame: origin O, outward normal N (horizontal), U = Z x N, V = Z. p(s, v, d): v ABSOLUTE Blender z,
    d = depth along N (out of the wall)."""
    def __init__(self, O, N):
        self.O = Vector((O.x, O.y, 0)); self.N = Vector((N.x, N.y, 0)).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, s, v, d=0.0): return self.O + self.U * s + Z * v + self.N * d

def ccw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))
def fill2d(fr, loops, d, mat, code=0, flip=False):
    B.new_group()
    loops = [ccw(l) for l in loops]
    flat = [p for l in loops for p in l]
    for t in tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in loops]):
        a, b, c = flat[t[0]], flat[t[1]], flat[t[2]]
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(cr) < 1e-9: continue
        if (cr < 0) != flip: b, c = c, b
        B.face([fr.p(a[0], a[1], d), fr.p(b[0], b[1], d), fr.p(c[0], c[1], d)], mat, code)
def strip2d(fr, loop, d0, d1, mat, code=0, inward=True):
    """side walls of a loop between depths d0 and d1 (inward: facing the loop's inside, e.g. a reveal)"""
    loop = ccw(loop); n = len(loop)
    for i in range(n):
        a, b = loop[i], loop[(i + 1) % n]
        A0, B0, B1, A1 = fr.p(a[0], a[1], d0), fr.p(b[0], b[1], d0), fr.p(b[0], b[1], d1), fr.p(a[0], a[1], d1)
        mid = fr.p((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, (d0 + d1) / 2)
        cen = fr.p(sum(p[0] for p in loop) / n, sum(p[1] for p in loop) / n, (d0 + d1) / 2)
        out = (mid - cen); out = out - fr.N * out.dot(fr.N)
        face_dir([A0, B0, B1, A1], -out if inward else out, mat, code)
def rect(s0, v0, s1, v1): return [(s0, v0), (s1, v0), (s1, v1), (s0, v1)]
def box(O, U, V, N, u0, u1, v0, v1, w0, w1, mat, code=0, skip=()):
    Pp = lambda u, v, w: O + U * u + V * v + N * w
    F = {"front": [Pp(u0, v0, w1), Pp(u1, v0, w1), Pp(u1, v1, w1), Pp(u0, v1, w1)],
         "back": [Pp(u1, v0, w0), Pp(u0, v0, w0), Pp(u0, v1, w0), Pp(u1, v1, w0)],
         "top": [Pp(u0, v1, w1), Pp(u1, v1, w1), Pp(u1, v1, w0), Pp(u0, v1, w0)],
         "bottom": [Pp(u0, v0, w0), Pp(u1, v0, w0), Pp(u1, v0, w1), Pp(u0, v0, w1)],
         "right": [Pp(u1, v0, w1), Pp(u1, v0, w0), Pp(u1, v1, w0), Pp(u1, v1, w1)],
         "left": [Pp(u0, v0, w0), Pp(u0, v0, w1), Pp(u0, v1, w1), Pp(u0, v1, w0)]}
    cen = Pp((u0 + u1) / 2, (v0 + v1) / 2, (w0 + w1) / 2)
    for k, pts in F.items():
        if k in skip: continue
        face_dir(pts, sum(pts, Vector()) / 4 - cen, mat, code)
def fbox(fr, s0, s1, v0, v1, d0, d1, mat, code=0, skip=("back",)):
    box(fr.O, fr.U, Z, fr.N, s0, s1, v0, v1, d0, d1, mat, code, skip)
def wbox(c, ax, ay, sx, sy, z0, z1, mat, code=0, skip=()):
    """a box centred on c (Blender, z ignored), axes ax / ay (unit, horizontal), half sizes sx / sy, z0..z1 (Blender)"""
    box(Vector((c.x, c.y, 0)), ax, Z, ay, -sx, sx, z0, z1, -sy, sy, mat, code, skip)
def bar(fr, a, b, d, width, depth, mat, code=0):
    """a thin bar in the wall plane from (s, v) a to b at depth d, proud by depth"""
    pa, pb = fr.p(a[0], a[1], d), fr.p(b[0], b[1], d)
    D = pb - pa; L = D.length
    if L < 1e-4: return
    D.normalize(); S = fr.N.cross(D)
    box(pa, D, S, fr.N, 0, L, -width / 2, width / 2, 0, depth, mat, code, skip=("back",))

def lathe_axis(center, axis, ref, profile, segs, mat, code=0, cap_top=False, a0=0.0, arc=2 * math.pi):
    """solid of revolution about `axis` through center; profile [(r, t)] (t along the axis); arc-length UVs"""
    axis = axis.normalized(); X = (ref - axis * ref.dot(axis)).normalized(); Y = axis.cross(X)
    full = abs(arc - 2 * math.pi) < 1e-6
    nk = segs + (0 if full else 1)
    ang = [a0 + arc * k / segs for k in range(segs + 1)]
    rings = [[center + (X * math.cos(a) + Y * math.sin(a)) * r + axis * t for a in ang] for r, t in profile]
    sacc = [0.0]
    for i in range(1, len(profile)):
        sacc.append(sacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    B.new_group()
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]; rm = max(r0, r1, 0.02)
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
            u0, u1 = rm * arc * k / segs, rm * arc * (k + 1) / segs
            uv = [(u0, sacc[i]), (u1, sacc[i]), (u1, sacc[i + 1]), (u0, sacc[i + 1])]
            if r1 < 1e-6: B.face([a, b, d], mat, code, [uv[0], uv[1], uv[3]])
            elif r0 < 1e-6: B.face([a, c, d], mat, code, [uv[0], uv[2], uv[3]])
            else: B.face([a, b, c, d], mat, code, uv)
    if cap_top and profile[-1][0] > 1e-6: face_dir(rings[-1][:segs], axis, mat, code)
def lathe(center, profile, segs, mat, code=0, cap_top=False):
    lathe_axis(center, Z, Vector((1, 0, 0)), profile, segs, mat, code, cap_top)

def miter(n1, n2):
    s = 1 + n1.dot(n2)
    return (n1 + n2) / s if s > 0.2 else (n1 + n2).normalized() * 1.5
def sweep(a, b, ma, mb, z0, profile, mat, code, cap_a=False, cap_b=False):
    """profile [(out, dz)] swept along a -> b (Blender, z ignored) at base height z0; ma / mb offset vectors (miters)"""
    B.new_group()
    a2, b2 = Vector((a.x, a.y, 0)), Vector((b.x, b.y, 0)); L = (b2 - a2).length
    if L < 1e-4: return
    pts = [(a2 + ma * o + Z * (z0 + dz), b2 + mb * o + Z * (z0 + dz)) for o, dz in profile]
    s = 0.0
    # a -> b runs along U = Z x N: (B0 - A0) x (A1 - A0) points out of the profile when it runs bottom -> out -> top -> in
    for i in range(len(pts) - 1):
        (A0, B0), (A1, B1) = pts[i], pts[i + 1]
        ds = math.hypot(profile[i + 1][0] - profile[i][0], profile[i + 1][1] - profile[i][1])
        if ds < 1e-6: continue
        quad(A0, B0, B1, A1, mat, code, [(0, s), (L, s), (L, s + ds), (0, s + ds)])
        s += ds
    d = (b2 - a2).normalized()
    if cap_a: face_dir([p[0] for p in pts], -d, mat, code)
    if cap_b: face_dir([p[1] for p in pts], d, mat, code)

def sweep2d(fr, path, profile, mat, code, closed=False, caps=True, d0=0.0):
    """a moulding along a path [(s, v)] IN the wall plane: profile [(d, e)], d = depth out of the wall (+ d0), e = offset
    along the path's in-plane normal (left of the path direction = 'up' for a path running in +s). Miters at joints."""
    B.new_group()
    n = len(path)
    if n < 2: return
    T = []
    for i in range(n - 1):
        a, b = path[i], path[i + 1]; dx, dy = b[0] - a[0], b[1] - a[1]; L = math.hypot(dx, dy)
        T.append((dx / L, dy / L))
    def nrm(t): return (-t[1], t[0])
    offs = []
    for i in range(n):
        if closed or 0 < i < n - 1:
            t0 = T[i - 1] if i > 0 else T[-1]; t1 = T[i] if i < n - 1 else T[0]
            n0, n1 = nrm(t0), nrm(t1); m = (n0[0] + n1[0], n0[1] + n1[1]); dd = 1 + n0[0] * n1[0] + n0[1] * n1[1]
            offs.append((m[0] / dd, m[1] / dd) if dd > 0.2 else nrm(t1))
        else:
            offs.append(nrm(T[0] if i == 0 else T[-1]))
    rows = [[fr.p(path[i][0] + offs[i][0] * e, path[i][1] + offs[i][1] * e, d0 + d) for (d, e) in profile] for i in range(n)]
    acc = [0.0]
    for i in range(1, n): acc.append(acc[-1] + math.hypot(path[i][0] - path[i - 1][0], path[i][1] - path[i - 1][1]))
    segs = list(range(n - 1)) + ([n - 1] if closed else [])
    pacc = [0.0]
    for k in range(1, len(profile)): pacc.append(pacc[-1] + math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]))
    for i in segs:
        j = (i + 1) % n
        ua, ub = acc[i], (acc[j] if j else acc[-1] + math.hypot(path[0][0] - path[-1][0], path[0][1] - path[-1][1]))
        for k in range(len(profile) - 1):
            # (tangent, in-plane normal, N) is right-handed: quad(A0, B0, B1, A1) faces out of a profile listed
            # wall -> out -> along the normal -> back to the wall (like sweep)
            A0, A1, B0, B1 = rows[i][k], rows[i][k + 1], rows[j][k], rows[j][k + 1]
            if (A1 - A0).length < 1e-7 and (B1 - B0).length < 1e-7: continue
            quad(A0, B0, B1, A1, mat, code, [(ua, pacc[k]), (ub, pacc[k]), (ub, pacc[k + 1]), (ua, pacc[k + 1])])
    if caps and not closed:
        for i, sgn in ((0, -1), (n - 1, 1)):
            t = T[0] if i == 0 else T[-1]
            face_dir(rows[i], (fr.U * t[0] + Z * t[1]) * sgn, mat, code)

# ------------------------------------------------------------------------------------------------ the measured plan
PL = SITE["plan"]; ROOF = SITE["roof"]
UE, UPOR, WPOR = PL["u_east"], PL["u_portico"], PL["w_portico"]
WM, WW, WB = PL["w_main"], PL["w_wing"], PL["w_block"]
UW0, UW1 = PL["u_wing"]; UB0, UB1 = PL["u_block"]; UWP, WWP = PL["u_west_pavilion"], PL["w_west_pavilion"]
# the outer contour (building frame), south half mirrored: vertex list in order (outside on the right walking it)
CONTOUR = [(UE, -WM), (UE, WM), (UW1, WM), (UW1, WW), (UW0, WW), (UW0, WM), (UB1, WM), (UB1, WB), (UB0, WB), (UB0, WWP), (UWP, WWP),
           (UWP, -WWP), (UB0, -WWP), (UB0, -WB), (UB1, -WB), (UB1, -WM), (UW0, -WM), (UW0, -WW), (UW1, -WW), (UW1, -WM)]
# ORDERS: the main block, the two pavilions (cornice 74.6) / the wings and the west blocks (cornice 0.85 m lower:
# the photo 3557). Heights m TAW: cornice tops from the DSM eaves + the photo's proportions (see NOTES.md)
FLOOR_GF = 62.95          # ground floor (the perron's landing): east ground 61.05 (DTM) + 11 risers of 0.17
PLINTH_TOP = 63.00          # the inventory views: ground-floor windows nearly as tall as the first floor ones, a low plinth
GF_SILL, GF_HEAD = 63.25, 66.20
# THE PORTICO (polish 2, measured on the full-size photo 3557 at 61.5 px/m: the door's head is level with the ground-floor
# windows' heads (66.20, y 1235), the soffit of the portico's entablature 35 px above it (66.77), its cornice top 48 px
# higher (67.55 = the balcony's floor); round 1 had them 0.47 m lower and no room for the carved panel over the door)
DOOR_HEAD = 66.22         # the main door's opening
PORTICO_SOFFIT = 66.78    # the underside of the portico's entablature: the carved panel fills the wall from the door to it
BALC_FLOOR = 67.55        # the balcony's floor (the entablature's top), above the string course (66.95-67.37)
BAND1 = 66.95             # string course at the first floor
SILLC = 68.46             # first-floor sill course (68.46-68.68), sills at 68.70
F1_SILL = 68.70
ORD = {
    "main": dict(ct=74.60, f1_head=72.15, arch=73.00, frieze=73.30, corn=74.05, sur=0.20, win=1.45),
    "wing": dict(ct=73.75, f1_head=71.60, arch=72.38, frieze=72.66, corn=73.28, sur=0.17, win=1.30),
}
EDGE_ORDER = ["main", "main", "wing", "wing", "wing", "main", "wing", "wing", "wing", "main", "main",
              "main", "wing", "wing", "wing", "main", "wing", "wing", "wing", "main"]
# bays per edge (south half + the east and west facades), along the edge's varying coordinate (u or w):
#   (c, F1 window, GF window[, width, lights]); window kinds: seg / tri / hood / key / balc / door / None
BAYS = {
    0: [(8.05, "seg", "tri"), (3.35, "tri", "seg"), (0.0, "balc", "door"), (-3.35, "tri", "seg"), (-8.05, "seg", "tri")],   # east, photo 3557
    1: [(10.15, "seg", "tri")],                                                     # main block's south return (inventory corner view)
    2: [(13.5, "tri", "seg", 1.30)],                                                # south wing, east face (3557, left)
    3: [(5.75, "tri", "seg", 1.30), (2.55, "seg", "tri", 2.05, 3), (-0.65, "tri", "seg", 1.30)],   # south wing, south face (corner view)
    4: [(13.5, "tri", "seg", 1.30)],                                                # south wing, west face (estimated)
    5: [(-4.45, "key", "key", 1.20)],                                               # recess between wing and block (estimated)
    6: [],
    7: [(-7.9, "seg", "tri", 1.30), (-10.55, "seg", "tri", 1.30)],                  # south-west block (corner view: 1 visible, estimated)
    8: [(11.4, "seg", "tri", 1.30), (8.0, "seg", "tri", 1.30)],                     # west face of the block (estimated)
    9: [],
    10: [(3.0, "tri", "seg"), (0.0, "hood", "key"), (-3.0, "tri", "seg")],          # west pavilion (estimated)
}
EXTRA_PIL = {0: [(4.65, 5.45), (-5.45, -4.65), (0.98, 1.72), (-1.72, -0.98)]}       # east: pavilion + centre-bay pilasters (3557)
PANELS = {0: [(5.62, 7.12), (8.98, 10.45), (-7.12, -5.62), (-10.45, -8.98)]}       # framed brick fields of the outer bays (3557)

def mirror_edge(i):
    """the north edge mirroring south edge i (or the edge itself for the east / west facades)"""
    return {1: 19, 2: 18, 3: 17, 4: 16, 5: 15, 6: 14, 7: 13, 8: 12, 9: 11}.get(i)
for i in list(BAYS):
    j = mirror_edge(i)
    if j is not None:
        BAYS[j] = [(b[0] if i in (1, 3, 5, 7) else -b[0],) + tuple(b[1:]) for b in BAYS[i]]

# ------------------------------------------------------------------------------------------------ edges
class Edge:
    def __init__(self, i):
        self.i = i; n = len(CONTOUR)
        self.a2, self.b2 = CONTOUR[i], CONTOUR[(i + 1) % n]
        self.order = EDGE_ORDER[i]; self.O = ORD[self.order]
        du, dw = self.b2[0] - self.a2[0], self.b2[1] - self.a2[1]
        self.L = math.hypot(du, dw)
        self.n2 = (dw / self.L, -du / self.L)                 # outward (u, w)
        self.vary = 1 if abs(du) < 1e-6 else 0                 # the coordinate that varies along the edge
        N = Vector((self.n2[0], -self.n2[1], 0))
        # frame origin at b: U = Z x N runs from b to a
        self.fr = Frame(P(*self.b2), N)
        g = [ground(self.a2[0] + du * t + self.n2[0], self.a2[1] + dw * t + self.n2[1]) for t in (0, 0.25, 0.5, 0.75, 1)]
        self.gmin, self.gmax = min(g), max(g)
    def s(self, c):
        """position along the frame (0 at b) of the point whose varying coordinate is c"""
        pt = [self.a2[0], self.a2[1]]; pt[self.vary] = c
        return (P(*pt) - self.fr.O).dot(self.fr.U)
EDGES = [Edge(i) for i in range(len(CONTOUR))]
def _cross(e0, e1):
    d0 = (e0.b2[0] - e0.a2[0], e0.b2[1] - e0.a2[1]); d1 = (e1.b2[0] - e1.a2[0], e1.b2[1] - e1.a2[1])
    return d0[0] * d1[1] - d0[1] * d1[0]
_area = sum(CONTOUR[i][0] * CONTOUR[(i + 1) % len(CONTOUR)][1] - CONTOUR[(i + 1) % len(CONTOUR)][0] * CONTOUR[i][1] for i in range(len(CONTOUR)))
for k, e in enumerate(EDGES):
    nxt, prv = EDGES[(k + 1) % len(EDGES)], EDGES[k - 1]
    # vertex at b (between e and nxt) / at a (between prv and e): convex when the turn has the polygon's sense
    e.convex_b = (_cross(e, nxt) * _area) > 0
    e.convex_a = (_cross(prv, e) * _area) > 0
    e.nxt, e.prv = nxt, prv
def nB(e): return Vector((e.n2[0], -e.n2[1], 0))
def miters(e, same_b=True, same_a=True):
    """offset vectors at the frame's s = 0 end (vertex b) and s = L end (vertex a)"""
    N = nB(e)
    m0 = miter(N, nB(e.nxt)) if same_b else N
    m1 = miter(nB(e.prv), N) if same_a else N
    return m0, m1
def ext(e, d):
    """the s range of a plane at depth d: longer by d at a convex corner, shorter by d at a concave one"""
    return (-d if e.convex_b else d), (e.L + d if e.convex_a else e.L - d)

# ------------------------------------------------------------------------------------------------ profiles
# (out, dz) relative to the top (cornices) or the bottom (courses)
def CORNICE(k):
    p = [(0.0, -0.55), (0.05, -0.55), (0.05, -0.49), (0.09, -0.46), (0.11, -0.42), (0.11, -0.38), (0.16, -0.35), (0.46, -0.31),
         (0.49, -0.29), (0.49, -0.13), (0.53, -0.10), (0.56, -0.05), (0.58, -0.02), (0.58, 0.0), (0.0, 0.0)]
    return [(o * k, z * k) for o, z in p]
CORNICE_FAR = [(0.0, -0.5), (0.48, -0.3), (0.55, -0.05), (0.55, 0.0), (0.0, 0.0)]
ARCHI = [(0.0, 0.0), (0.06, 0.0), (0.06, 0.14), (0.08, 0.16), (0.08, 0.26), (0.11, 0.28), (0.11, 0.3), (0.0, 0.3)]
BAND = [(0.0, 0.0), (0.07, 0.0), (0.07, 0.05), (0.11, 0.09), (0.11, 0.33), (0.15, 0.36), (0.15, 0.42), (0.0, 0.42)]
SILLP = [(0.0, 0.0), (0.05, 0.0), (0.05, 0.17), (0.08, 0.2), (0.08, 0.22), (0.0, 0.22)]
PLINTH_CAP = [(0.09, -0.16), (0.11, -0.13), (0.11, -0.07), (0.0, 0.04)]
D_PL = 0.09                                          # plinth face, proud of the brick
HOOD = [(0.0, 0.0), (0.05, 0.0), (0.05, 0.05), (0.1, 0.09), (0.15, 0.11), (0.15, 0.17), (0.18, 0.19), (0.18, 0.23), (0.0, 0.23)]
RAKE = [(0.0, 0.0), (0.12, 0.0), (0.15, 0.03), (0.15, 0.09), (0.18, 0.11), (0.18, 0.15), (0.0, 0.15)]

def runs(s0, s1, cuts):
    out, a = [], s0
    for c0, c1 in sorted(cuts):
        if c1 <= a or c0 >= s1: continue
        if c0 > a: out.append((a, c0))
        a = max(a, c1)
    if a < s1: out.append((a, s1))
    return [r for r in out if r[1] - r[0] > 0.02]

def edge_sweep(e, z0, profile, mat, code, cuts=(), same=True, cap=True):
    """a profile along edge e at height z0 (Blender), mitered at the corners (same: the neighbours carry it too)"""
    fr = e.fr; m0, m1 = miters(e, same, same)
    for (r0, r1) in runs(0.0, e.L, cuts):
        a = fr.p(r0, 0); b = fr.p(r1, 0)
        sweep(a, b, m0 if r0 < 1e-3 else nB(e), m1 if r1 > e.L - 1e-3 else nB(e), z0, profile, mat, code,
              cap_a=cap and (r0 > 1e-3 or not same), cap_b=cap and (r1 < e.L - 1e-3 or not same))

# ------------------------------------------------------------------------------------------------ openings
class Win:
    """A window / door: stone surround (two steps + ears), stone reveal, white casements with glazing bars, glass, stone
    sill on consoles, and a pediment (seg / tri), a straight hood or a keystone above."""
    def __init__(self, s, sill, head, w, ped, kind="win", lights=2, order="main"):
        self.__dict__.update(s=s, sill=sill, head=head, w=w, ped=ped, kind=kind, lights=lights, sur=ORD[order]["sur"], order=order)
        if kind == "base": self.sur = 0.10
    def outer(self):
        lo = self.sill - (0.0 if self.kind in ("door", "balc") else 0.02)
        return rect(self.s - self.w / 2 - self.sur, lo, self.s + self.w / 2 + self.sur, self.head + self.sur)
    def span(self): return (self.s - self.w / 2 - self.sur - 0.12, self.s + self.w / 2 + self.sur + 0.12)
    def top(self):
        """the highest point of its dressing (bands are cut where it reaches)"""
        h = self.head + self.sur
        if self.ped == "tri": return h + 0.43 + (self.w / 2 + self.sur + 0.16) * 0.36 + 0.15
        if self.ped == "seg": return h + 0.43 + 0.42 + 0.15
        if self.ped == "hood": return h + 0.43
        return h
    def build(self, fr):
        s, w, s0, s1, sur = self.s, self.w, self.sill, self.head, self.sur
        if FAR:
            fill2d(fr, [rect(s - w / 2, s0, s + w / 2, s1)], -0.02, GLASS if self.kind not in ("door",) else DOOR_WOOD, C_DOOR if self.kind == "door" else 0)
            o = self.outer()
            fill2d(fr, [o, rect(s - w / 2, s0, s + w / 2, s1)], 0.02, BLUE if self.kind == "base" else STONE, C_SUR)
            return
        inner = rect(s - w / 2, s0, s + w / 2, s1)
        out = self.outer()
        mat_s = BLUE if self.kind == "base" else STONE
        pr = 0.05
        if self.kind == "base":
            fill2d(fr, [out, inner], D_PL + 0.03, mat_s, C_SUR)
            strip2d(fr, out, D_PL + 0.03, D_PL, mat_s, C_SUR, inward=False)
            strip2d(fr, inner, D_PL + 0.03, -0.22, mat_s, C_SUR)
            fill2d(fr, [inner], -0.2, GLASS, C_INT)
            for k in range(1, 6):                                        # bars
                x = s - w / 2 + w * k / 6
                bar(fr, (x, s0), (x, s1), -0.12, 0.022, 0.022, IRON, C_PLAIN)
            bar(fr, (s - w / 2, (s0 + s1) / 2), (s + w / 2, (s0 + s1) / 2), -0.14, 0.03, 0.02, IRON, C_PLAIN)
            return
        mid = rect(s - w / 2 - 0.065, s0 if self.kind in ("door", "balc") else s0 - 0.02, s + w / 2 + 0.065, s1 + 0.065)
        fill2d(fr, [out, mid], pr, mat_s, C_SUR)
        strip2d(fr, out, pr, 0.0, mat_s, C_SUR, inward=False)
        fill2d(fr, [mid, inner], pr + 0.035, mat_s, C_SUR)
        strip2d(fr, mid, pr + 0.035, pr, mat_s, C_SUR, inward=False)
        strip2d(fr, inner, pr + 0.035, -0.26, mat_s, C_SUR)
        # ears (crossettes) at the top corners of the surround (not the main door: the carved panel sits on its head)
        for sg in ((-1, 1) if self.kind != "door" else ()):
            e0 = s + sg * (w / 2 + sur)
            fbox(fr, min(e0, e0 + sg * 0.085), max(e0, e0 + sg * 0.085), s1 + sur - 0.34, s1 + sur, 0.0, pr, mat_s, C_SUR)
        d = -0.21
        if self.kind == "door":
            self.door(fr, d)
        else:
            self.casement(fr, d)
        if self.kind == "win":
            # sill on two consoles
            fbox(fr, s - w / 2 - sur - 0.07, s + w / 2 + sur + 0.07, s0 - 0.13, s0 - 0.01, 0.0, 0.15, STONE, C_SILL)
            for sg in (-1, 1):
                c = s + sg * (w / 2 + 0.02)
                fbox(fr, c - 0.07, c + 0.07, s0 - 0.36, s0 - 0.13, 0.0, 0.1, STONE, C_CONSOLE)
                fbox(fr, c - 0.06, c + 0.06, s0 - 0.25, s0 - 0.13, 0.1, 0.13, STONE, C_CONSOLE)
        self.crown(fr)
    def casement(self, fr, d):
        s, w, s0, s1 = self.s, self.w, self.sill, self.head
        fw = 0.07
        lights = self.lights
        lo = s0 + (0.95 if self.kind == "balc" else 0.0)          # balcony door: wood panels below
        tr = lo + (s1 - lo) * (0.78 if self.kind != "balc" else 0.8)
        n_low = 3 if (tr - lo) > 2.1 else 2
        panes = []
        for j in range(lights):
            x0 = s - w / 2 + fw + j * (w - fw) / lights; x1 = s - w / 2 + (j + 1) * (w - fw) / lights
            for r in range(n_low):
                y0 = lo + fw + r * (tr - lo - fw) / n_low; y1 = lo + (r + 1) * (tr - lo - fw) / n_low
                panes.append((x0 + 0.012, y0 + 0.012, x1 - 0.012, y1 - 0.012))
            panes.append((x0 + 0.012, tr + fw / 2, x1 - 0.012, s1 - fw))
        fill2d(fr, [rect(s - w / 2, s0, s + w / 2, s1)] + [rect(*q) for q in panes], d, WOOD, C_PLAIN)
        for q in panes: strip2d(fr, rect(*q), d, d - 0.04, WOOD, C_PLAIN)
        fill2d(fr, [rect(s - w / 2, lo, s + w / 2, s1)], d - 0.04, GLASS, C_PLAIN)
        # the transom bar and the meeting stile stand proud of the frame
        fbox(fr, s - w / 2, s + w / 2, tr - 0.05, tr + 0.04, d, d + 0.045, WOOD, C_PLAIN)
        if self.kind == "balc":
            for j in range(2):
                x0, x1 = s - w / 2 + 0.12 + j * w / 2, s - 0.06 + j * w / 2
                fbox(fr, x0, x1, s0 + 0.15, s0 + 0.8, d, d + 0.03, WOOD, C_PLAIN)
    def door(self, fr, d):
        s, w, s0, s1 = self.s, self.w, self.sill, self.head
        lt = s0 + (s1 - s0) * 0.76
        fill2d(fr, [rect(s - w / 2, s0, s + w / 2, lt)], d, DOOR_WOOD, C_DOOR)
        for sg in (-1, 1):
            a0, a1 = (s + 0.09, s + w / 2 - 0.11) if sg > 0 else (s - w / 2 + 0.11, s - 0.09)
            for (v0, v1) in ((s0 + 0.18, s0 + (lt - s0) * 0.36), (s0 + (lt - s0) * 0.44, lt - 0.14)):
                fbox(fr, a0, a1, v0, v1, d, d + 0.03, DOOR_WOOD, C_DOOR)
                fbox(fr, a0 + 0.06, a1 - 0.06, v0 + 0.06, v1 - 0.06, d + 0.03, d + 0.05, DOOR_WOOD, C_DOOR)
        fbox(fr, s - 0.025, s + 0.025, s0, lt, d, d + 0.06, DOOR_WOOD, C_DOOR)
        fbox(fr, s - w / 2, s + w / 2, lt - 0.06, lt + 0.05, d, d + 0.08, DOOR_WOOD, C_DOOR)
        fill2d(fr, [rect(s - w / 2, lt, s + w / 2, s1)], d - 0.03, GLASS, C_PLAIN)
        for k in (1, 2, 3):
            x = s - w / 2 + w * k / 4
            bar(fr, (x, lt), (x, s1), d - 0.03, 0.035, 0.04, DOOR_WOOD, C_DOOR)
    def crown(self, fr):
        s, w, s1, sur = self.s, self.w, self.head, self.sur
        h0 = s1 + sur
        if self.ped in (None, "key", "balc", "door"):
            if self.ped == "key" or self.kind in ("win", "balc"):
                k = [(s - 0.15, h0 + 0.06), (s + 0.15, h0 + 0.06), (s + 0.1, s1 - 0.08), (s - 0.1, s1 - 0.08)]
                fill2d(fr, [k], 0.11, STONE, C_KEY); strip2d(fr, k, 0.11, 0.0, STONE, C_KEY, inward=False)
            return
        hw = w / 2 + sur + 0.16
        # frieze block over the surround + two consoles carrying the hood
        fbox(fr, s - w / 2 - sur, s + w / 2 + sur, h0, h0 + 0.2, 0.0, 0.06, STONE, C_PED)
        for sg in (-1, 1):
            c = s + sg * (w / 2 + sur + 0.03)
            fbox(fr, c - 0.075, c + 0.075, h0 - 0.42, h0 + 0.2, 0.0, 0.1, STONE, C_CONSOLE)
            fbox(fr, c - 0.065, c + 0.065, h0 - 0.1, h0 + 0.2, 0.1, 0.17, STONE, C_CONSOLE)
        hb = h0 + 0.2
        sweep2d(fr, [(s - hw, hb), (s + hw, hb)], HOOD, STONE, C_PED)
        top = hb + 0.23
        if self.ped == "tri":
            rise = hw * 0.36
            pth = [(s - hw, top), (s, top + rise), (s + hw, top)]
            fill2d(fr, [[(s - hw + 0.12, top), (s + hw - 0.12, top), (s, top + rise - 0.06)]], 0.05, STONE, C_PED)
            sweep2d(fr, pth, RAKE, STONE, C_PED)
        elif self.ped == "seg":
            rise = 0.42; R = (hw * hw + rise * rise) / (2 * rise); cy = top + rise - R
            a0 = math.asin(hw / R); n = 9
            pth = [(s + R * math.sin(-a0 + 2 * a0 * k / n), cy + R * math.cos(-a0 + 2 * a0 * k / n)) for k in range(n + 1)]
            fill2d(fr, [[(s + (x - s) * 0.9, top + (y - top) * 0.82) for x, y in pth]], 0.05, STONE, C_PED)
            sweep2d(fr, pth, RAKE, STONE, C_PED)

def openings_of(e):
    O = e.O; out = []
    plinth_h = PLINTH_TOP - e.gmin
    for b in BAYS.get(e.i, []):
        c, f1, gf = b[0], b[1], b[2]
        w = b[3] if len(b) > 3 else O["win"]; lights = b[4] if len(b) > 4 else 2
        s = e.s(c)
        if gf == "door":
            out.append(Win(s, FLOOR_GF, DOOR_HEAD, 1.62, None, "door", order=e.order))
        elif gf:
            out.append(Win(s, GF_SILL, GF_HEAD, w, gf, "win", lights, e.order))
        if f1 == "balc":
            out.append(Win(s, BALC_FLOOR + 0.02, O["f1_head"], 1.5, "hood", "balc", 2, e.order))
        elif f1:
            out.append(Win(s, F1_SILL, O["f1_head"], w, f1, "win", lights, e.order))
        if gf not in ("door",) and plinth_h > 1.25:
            bw = min(w, 1.0)
            out.append(Win(s, max(e.gmax + 0.18, PLINTH_TOP - 0.85), PLINTH_TOP - 0.3, bw, None, "base", order=e.order))
    return out

# ------------------------------------------------------------------------------------------------ facades
def quoin_stack(fr, s0, s1, v0, v1, d, harp=None, mat=STONE, skip_l=False, skip_r=False):
    """a rusticated pilaster / quoin: a stone back plate + courses of proud blocks with sunk joints (harp: alternate
    long and short blocks towards `harp` = 'l' or 'r')"""
    if FAR:
        fill2d(fr, [rect(s0, v0, s1, v1)], d, mat, C_PIL); return
    fbox(fr, s0, s1, v0, v1, 0.0, d, mat, C_PIL, skip=("back",) + (("left",) if skip_l else ()) + (("right",) if skip_r else ()))
    h, g = 0.36, 0.035
    n = max(1, int((v1 - v0) / h)); h = (v1 - v0) / n
    for k in range(n):
        a, b = (s0 - 0.035 if skip_l else s0), (s1 + 0.035 if skip_r else s1)
        if harp and k % 2 == 1:
            if harp == "l": a = s0 + (s1 - s0) * 0.38
            else: b = s1 - (s1 - s0) * 0.38
        fbox(fr, a, b, v0 + k * h + g / 2, v0 + (k + 1) * h - g / 2, d, d + 0.035, mat, C_PIL,
             skip=("back",) + (("left",) if (skip_l and a < s0) else ()) + (("right",) if (skip_r and b > s1) else ()))

def build_edge(e):
    fr, L, O = e.fr, e.L, e.O
    vb = hz(e.gmin - 0.45)
    ct = hz(O["ct"]); cb = ct - 0.55 * (1.0 if e.order == "main" else 0.85)
    wins = openings_of(e)
    main_w = [w_ for w_ in wins if w_.kind != "base"]
    base_w = [w_ for w_ in wins if w_.kind == "base"]
    # walls: brick from the plinth top to the cornice (frieze included), openings cut
    wall_lo = hz(PLINTH_TOP) - 0.16
    holes = [[(x, max(hz(y), wall_lo + 0.01)) for x, y in w_.outer()] for w_ in main_w if hz(w_.outer()[2][1]) > wall_lo + 0.05]
    fill2d(fr, [rect(0.0, wall_lo, L, cb + 0.02)] + [h for h in holes if h[0][1] > wall_lo + 0.005] , 0.0, BRICK, C_PLAIN)
    # (an opening reaching below the brick, the door, is clipped to it: the plinth is cut there instead)
    # plinth: a stone face proud of the brick, basement windows cut, a chamfered cap (sweep)
    p0, p1 = ext(e, D_PL)
    door_cut = [(w_.s - w_.w / 2 - w_.sur, w_.s + w_.w / 2 + w_.sur) for w_ in main_w if w_.kind == "door"]
    bh = [[(x, hz(y)) for x, y in w_.outer()] for w_ in base_w]
    for (r0, r1) in runs(p0, p1, door_cut):
        fill2d(fr, [rect(r0, vb, r1, hz(PLINTH_TOP) - 0.16)] + [h for h in bh if h[0][0] > r0 and h[1][0] < r1], D_PL, BLUE, C_PLINTH)
    edge_sweep(e, hz(PLINTH_TOP), PLINTH_CAP if not FAR else [(0.09, -0.16), (0.0, 0.04)], BLUE, C_PLINTH, cuts=door_cut)
    for w_ in wins:
        w_.sill_b, w_.head_b = w_.sill, w_.head
    # string course (first floor), sill course, architrave: cut where an opening's dressing crosses them
    def cuts_at(z0, z1):
        return [w_.span() for w_ in main_w if w_.sill < z1 and w_.top() > z0]
    edge_sweep(e, hz(BAND1), BAND if not FAR else [(0.0, 0.0), (0.12, 0.0), (0.12, 0.42), (0.0, 0.42)], STONE, C_BAND, cuts=cuts_at(BAND1, BAND1 + 0.42))
    edge_sweep(e, hz(SILLC), SILLP if not FAR else [(0.0, 0.0), (0.06, 0.0), (0.06, 0.22), (0.0, 0.22)], STONE, C_SILL,
               cuts=[w_.span() for w_ in main_w if w_.kind in ("balc",)])
    same = lambda o: o.order == e.order
    m_same_b, m_same_a = same(e.nxt), same(e.prv)
    fr_m0, fr_m1 = miters(e, m_same_b, m_same_a)
    def order_sweep(z0, prof, mat, code, cuts=()):
        for (r0, r1) in runs(0.0, L, cuts):
            sweep(fr.p(r0, 0), fr.p(r1, 0), fr_m0 if r0 < 1e-3 else nB(e), fr_m1 if r1 > L - 1e-3 else nB(e), z0, prof, mat, code,
                  cap_a=(r0 > 1e-3 or not m_same_b), cap_b=(r1 < L - 1e-3 or not m_same_a))
    order_sweep(hz(O["arch"]), ARCHI if not FAR else [(0.0, 0.0), (0.1, 0.0), (0.1, 0.3), (0.0, 0.3)], STONE, C_BAND,
                cuts=cuts_at(O["arch"], O["arch"] + 0.3))
    k = 1.0 if e.order == "main" else 0.85
    order_sweep(ct, CORNICE(k) if not FAR else [(o * k, z * k) for o, z in CORNICE_FAR], STONE, C_CORN)
    # pilasters: quoins at the convex corners (harped), the facade's own pilasters
    q = 0.78 if e.order == "main" else 0.66
    v0, v1 = hz(PLINTH_TOP) - 0.12, hz(O["arch"])
    pils = []
    if e.convex_b: pils.append((-0.045, q, "r", True, False))
    if e.convex_a: pils.append((L - q, L + 0.045, "l", False, True))
    for (c0, c1) in EXTRA_PIL.get(e.i, []):
        a, b = sorted((e.s(c0), e.s(c1))); pils.append((a, b, None, False, False))
    for (a, b, harp, sl, sr) in pils:
        quoin_stack(fr, a, b, v0, v1, 0.045, harp, skip_l=sl, skip_r=sr)
        if not FAR:     # a die in the frieze above it
            fbox(fr, a + 0.04, b - 0.04, hz(O["frieze"]), hz(O["corn"]), 0.0, 0.07, STONE, C_PIL)
    # framed brick fields
    if not FAR:
        for (c0, c1) in PANELS.get(e.i, []):
            a, b = sorted((e.s(c0), e.s(c1)))
            for (z0, z1) in ((hz(GF_SILL) + 0.05, hz(GF_HEAD) + 0.3), (hz(F1_SILL) + 0.05, hz(O["f1_head"]) + 0.35)):
                for (pa, pb) in (((a, z0), (b, z0)), ((b, z0), (b, z1)), ((b, z1), (a, z1)), ((a, z1), (a, z0))):
                    bar(fr, pa, pb, 0.0, 0.11, 0.03, STONE, C_BAND)
        # modillions under the corona
        sp = 0.62
        n = int((L - 0.4) / sp)
        for j in range(n + 1):
            s = (L - n * sp) / 2 + j * sp
            fbox(fr, s - 0.055, s + 0.055, ct - 0.31 * k - 0.16 * k, ct - 0.31 * k, 0.14 * k, 0.44 * k, STONE, C_CONSOLE, skip=("back", "top"))
    for w_ in wins:
        w_.sill, w_.head = hz(w_.sill), hz(w_.head)
        w_.build(fr)
    return wins

# ------------------------------------------------------------------------------------------------ roofs (mansards)
class Mansard:
    """A mansard over the rectangle u [u0, u1] x w [w0, w1]: steep slate BRISIS from the cornice top (eave) up to the curb
    (inset per side; None = the side abuts a higher volume: no slope, the deck runs on by `ext` metres), then either a
    zinc deck at the curb height or a zinc TERRASSON rising to a flat top (rect, height). Heights m TAW."""
    def __init__(self, name, u0, u1, w0, w1, eave, curb, ins, top=None, ext=0.7, bell=0.0):
        self.__dict__.update(name=name, u0=u0, u1=u1, w0=w0, w1=w1, eave=eave, curb=curb, ins=ins, top=top, ext=ext, bell=bell)
    def curb_rect(self):
        i = self.ins
        cu0 = self.u0 + i["w"] if i["w"] is not None else self.u0 - self.ext
        cu1 = self.u1 - i["e"] if i["e"] is not None else self.u1 + self.ext
        cw0 = self.w0 + i["n"] if i["n"] is not None else self.w0 - self.ext
        cw1 = self.w1 - i["s"] if i["s"] is not None else self.w1 + self.ext
        return cu0, cu1, cw0, cw1
    def side_plane(self, side):
        """(eave point fn, inward horizontal vector (Blender), k = inset per metre of height) for a dormer / oculus"""
        i = self.ins[side]; k = i / (self.curb - self.eave)
        return k
def brisis_faces(m):
    cu0, cu1, cw0, cw1 = m.curb_rect()
    eu0 = m.u0 if m.ins["w"] is not None else m.u0 - m.ext
    eu1 = m.u1 if m.ins["e"] is not None else m.u1 + m.ext
    ew0 = m.w0 if m.ins["n"] is not None else m.w0 - m.ext
    ew1 = m.w1 if m.ins["s"] is not None else m.w1 + m.ext
    E = [P(eu1, ew0, m.eave), P(eu1, ew1, m.eave), P(eu0, ew1, m.eave), P(eu0, ew0, m.eave)]       # NE, SE, SW, NW
    C = [P(cu1, cw0, m.curb), P(cu1, cw1, m.curb), P(cu0, cw1, m.curb), P(cu0, cw0, m.curb)]
    sides = ["e", "s", "w", "n"]
    cen = P((m.u0 + m.u1) / 2, (m.w0 + m.w1) / 2, m.eave)
    for k, sd in enumerate(sides):
        if m.ins[sd] is None: continue
        a, b = E[k], E[(k + 1) % 4]; c, d = C[(k + 1) % 4], C[k]
        out = ((a + b) / 2 - cen); out.z = 0
        if FAR or m.bell <= 0:
            B.new_group(); face_dir([a, b, c, d], out + Z * 0.2, SLATE, C_PLAIN)
        else:
            # a bell-cast pavilion face (the photo 3557): flatter at the foot, the inset grows faster than the height
            rows = []
            for t, it in BELL:
                pa_, pb_ = a.lerp(d, it), b.lerp(c, it)
                rows.append((Vector((pa_.x, pa_.y, a.z + (d.z - a.z) * t)), Vector((pb_.x, pb_.y, b.z + (c.z - b.z) * t))))
            B.new_group()
            for r in range(len(rows) - 1):
                face_dir([rows[r][0], rows[r][1], rows[r + 1][1], rows[r + 1][0]], out + Z * 0.2, SLATE, C_PLAIN)
                if not FAR: roll(rows[r][0], rows[r + 1][0], 0.085, ZINC)
        if not FAR:
            # zinc hip rolls on the two hips of this face (each hip drawn once: the face's left end)
            if m.ins[sides[k - 1]] is not None and m.bell <= 0: roll(a, d, 0.085, ZINC)
            # curb moulding (zinc) along the top of the face
            roll(d, c, 0.1, ZINC)
    # deck / terrasson
    if m.top is None:
        B.new_group()
        face_up([C[0], C[1], C[2], C[3]], ZINC, C_PLAIN)
        if not FAR: deck_seams(cu0, cu1, cw0, cw1, m.curb)
    else:
        (tu0, tu1, tw0, tw1), th = m.top
        T = [P(tu1, tw0, th), P(tu1, tw1, th), P(tu0, tw1, th), P(tu0, tw0, th)]
        B.new_group()
        for k in range(4):
            face_up([C[k], C[(k + 1) % 4], T[(k + 1) % 4], T[k]], ZINC, C_PLAIN)
            if not FAR: roll(C[k], T[k], 0.045, ZINC)
        face_up(T, ZINC, C_PLAIN)
    return E, C

BELL = [(0.0, 0.0), (0.1, 0.22), (0.4, 0.58), (1.0, 1.0)]       # (height fraction, inset fraction)

def deck_seams(u0, u1, w0, w1, h):
    """standing seams on a flat zinc deck (0.5 m pitch, along u)"""
    w = w0 + 0.5
    while w < w1 - 0.25:
        fb = P(u0, w, h); fe = P(u1, w, h)
        box(fb, (fe - fb).normalized(), Z, Vector((0, 1, 0)), 0, (fe - fb).length, 0.0, 0.035, -0.012, 0.012, ZINC, C_SEAM, skip=("bottom",))
        w += 0.5

def roll(p0, p1, r, mat):
    """a zinc roll (half-round) along p0 -> p1"""
    d = p1 - p0; L = d.length
    if L < 1e-3: return
    d.normalize(); s = d.cross(Z)
    if s.length < 1e-3: s = V3(1, 0, 0)
    s.normalize(); up = s.cross(d).normalized()
    if up.z < 0: up = -up
    k = 4; prev = None
    for i in range(k + 1):
        a = math.pi * i / k
        off = s * (math.cos(a) * r) + up * (math.sin(a) * r * 0.85)
        cur = (p0 + off, p1 + off)
        if prev: face_dir([prev[0], prev[1], cur[1], cur[0]], (s * math.cos(a - math.pi / k / 2) + up * math.sin(a - math.pi / k / 2)), mat, C_SEAM)
        prev = cur

# the roof parts (m TAW). Decks / tops = DSM p50 of each part (site.json roof); insets read on the DSM grid
# (tools/townhall_measure.py --dump: where each level starts), see NOTES.md
R_CORE_CURB = 79.85
ROOFS = [
    Mansard("main", UB1, UE, -WM, WM, ORD["main"]["ct"], R_CORE_CURB, dict(e=1.19, w=0.55, n=1.9, s=1.9),
            top=((-2.2, 7.4, -5.4, 5.4), ROOF["core_terrasson"]["p90"])),
    Mansard("wing_s", UW0, UW1, WM, WW, ORD["wing"]["ct"], ROOF["wing_s"]["p50"], dict(e=0.8, w=0.7, n=None, s=1.0), ext=1.6),
    Mansard("wing_n", UW0, UW1, -WW, -WM, ORD["wing"]["ct"], ROOF["wing_n"]["p50"], dict(e=0.8, w=0.7, n=1.0, s=None), ext=1.6),
    Mansard("block_s", UB0, UB1, WWP, WB, ORD["wing"]["ct"], ROOF["block_sw"]["p50"], dict(e=0.85, w=1.0, n=None, s=1.05), ext=1.4),
    Mansard("block_n", UB0, UB1, -WB, -WWP, ORD["wing"]["ct"], ROOF["block_nw"]["p50"], dict(e=0.85, w=1.0, n=1.05, s=None), ext=1.4),
    Mansard("west_pavilion", UWP, UB1, -WWP, WWP, ORD["main"]["ct"], ROOF["west_pavilion"]["p50"], dict(e=None, w=1.75, n=1.9, s=1.9), ext=0.55),
    # the east pavilion: a bell-cast truncated pyramid over the three centre bays, flat top at the DSM's 82.2
    Mansard("east_pavilion", 6.0, UE, -5.1, 5.1, ORD["main"]["ct"], ROOF["east_pavilion_top"]["p50"], dict(e=1.44, w=1.6, n=1.8, s=1.8), bell=1.0),
]
VALLEY_DECKS = [((UB1 - 0.85, UB1 + 0.55, WWP, WM - 1.35), ROOF["block_sw"]["p50"]), ((UB1 - 0.85, UB1 + 0.55, -WM + 1.35, -WWP), ROOF["block_nw"]["p50"])]

def roof_point(m, side, c, h):
    """a point on the brisis of side `side` of mansard m: c = the coordinate along the side (w for e/w, u for n/s), height h"""
    k = m.ins[side] / (m.curb - m.eave); t = (h - m.eave) * k
    if side == "e": return P(m.u1 - t, c, h), Vector((1, 0, 0)), k
    if side == "w": return P(m.u0 + t, c, h), Vector((-1, 0, 0)), k
    if side == "s": return P(c, m.w1 - t, h), Vector((0, -1, 0)), k
    return P(c, m.w0 + t, h), Vector((0, 1, 0)), k

def dormer(m, side, c, kind):
    """a stone dormer standing on the cornice: piers, window, pediment (tri / seg) or a flat cornice, slate cheeks, a zinc
    roof running back into the brisis"""
    base = m.eave
    big = kind == "big"
    W = 2.3 if big else 1.62; H = 3.05 if big else 2.55; ww = 1.0 if big else 0.82
    p0, N, k = roof_point(m, side, c, base)
    fr = Frame(p0 + N * 0.06, N)                     # front plane just proud of the wall line
    s0 = 0.0
    z0 = hz(base); z1 = z0 + H
    sill = z0 + 0.32; head = z1 - (0.55 if big else 0.42)
    depth_at = lambda z: (z - z0) * k + 0.1          # how far back the brisis is at height z (from the front plane)
    if FAR:
        zt = z1 + 0.35
        fill2d(fr, [rect(-W / 2, z0, W / 2, zt)], 0.0, STONE, C_SUR)
        for sg in (-1, 1):
            face_dir([fr.p(sg * W / 2, z0), fr.p(sg * W / 2, zt), fr.p(sg * W / 2, zt, -depth_at(zt))], fr.U * sg, SLATE, C_PLAIN)
        face_dir([fr.p(-W / 2, zt), fr.p(W / 2, zt), fr.p(W / 2, zt + 0.1, -depth_at(zt) - 0.1), fr.p(-W / 2, zt + 0.1, -depth_at(zt) - 0.1)], Z, ZINC, C_PLAIN)
        fill2d(fr, [rect(-ww / 2, sill, ww / 2, head)], 0.02, GLASS, C_PLAIN)
        return
    # front: stone with the window opening, two piers with sunk panels
    inner = rect(-ww / 2, sill, ww / 2, head)
    fill2d(fr, [rect(-W / 2, z0, W / 2, z1), inner], 0.0, STONE, C_SUR)
    strip2d(fr, inner, 0.0, -0.22, STONE, C_SUR)
    for sg in (-1, 1):
        a, b = sorted((sg * (ww / 2 + 0.06), sg * (W / 2)))
        fbox(fr, a, b, z0, z1, 0.0, 0.07, STONE, C_PIL)
        fbox(fr, a + 0.07, b - 0.07, z0 + 0.35, z1 - 0.35, 0.07, 0.09, STONE, C_PIL)
    fbox(fr, -ww / 2 - 0.08, ww / 2 + 0.08, sill - 0.12, sill, 0.0, 0.14, STONE, C_SILL)
    w_ = Win(0.0, sill, head, ww, None, "win", 2, "wing"); w_.casement(fr, -0.17)
    # entablature + pediment
    fbox(fr, -W / 2 - 0.05, W / 2 + 0.05, z1, z1 + 0.16, 0.0, 0.1, STONE, C_PED)
    sweep2d(fr, [(-W / 2 - 0.1, z1 + 0.16), (W / 2 + 0.1, z1 + 0.16)], HOOD, STONE, C_PED)
    top = z1 + 0.39; hw = W / 2 + 0.1
    if kind in ("tri",):
        rise = hw * 0.4; pth = [(-hw, top), (0.0, top + rise), (hw, top)]
        fill2d(fr, [[(-hw + 0.12, top), (hw - 0.12, top), (0.0, top + rise - 0.06)]], 0.03, STONE, C_PED)
        sweep2d(fr, pth, RAKE, STONE, C_PED)
        apex = top + rise
    elif kind in ("big", "seg"):
        rise = 0.5; R = (hw * hw + rise * rise) / (2 * rise); cy = top + rise - R; a0 = math.asin(hw / R); n = 10
        pth = [(R * math.sin(-a0 + 2 * a0 * j / n), cy + R * math.cos(-a0 + 2 * a0 * j / n)) for j in range(n + 1)]
        fill2d(fr, [[(x * 0.9, top + (y - top) * 0.8) for x, y in pth]], 0.03, STONE, C_PED)
        sweep2d(fr, pth, RAKE, STONE, C_PED)
        apex = top + rise
    else:                                            # flat: a cornice only (the north wing's dormer, photo 3557)
        pth = None; apex = top
    # cheeks (slate) and roof (zinc): back to where the brisis is
    dz = depth_at(apex) + 0.15
    for sg in (-1, 1):
        pa, pb, pc = fr.p(sg * W / 2, z0, 0.0), fr.p(sg * W / 2, top, 0.0), fr.p(sg * W / 2, top, -depth_at(top))
        face_dir([pa, pb, pc], fr.U * sg, SLATE, C_PLAIN)
    if pth:
        # a gable roof behind the pediment: ridge from the apex back into the brisis
        ra, rb = fr.p(0.0, apex, -0.12), fr.p(0.0, apex, -dz)
        for sg in (-1, 1):
            ea, eb = fr.p(sg * hw, top, -0.12), fr.p(sg * hw, top, -depth_at(top) - 0.05)
            face_dir([ra, rb, eb, ea], Z + fr.U * sg * 0.5, ZINC, C_PLAIN)
        roll(ra, rb, 0.04, ZINC)
    else:
        a_, b_ = fr.p(-hw, top, -0.1), fr.p(hw, top, -0.1)
        face_dir([a_, b_, fr.p(hw, top + 0.1, -dz), fr.p(-hw, top + 0.1, -dz)], Z, ZINC, C_PLAIN)

def oculus(m, side, c, h, r=0.5):
    """an oeil-de-boeuf in the brisis: a zinc ring frame with scrolls left and right and a keystone, glass inside"""
    p, N, k = roof_point(m, side, c, h)
    nrm = (N + Z * k).normalized()                  # the brisis' outward normal
    up = (Z - nrm * Z.dot(nrm)).normalized(); rt = up.cross(nrm)
    cen = p + nrm * 0.03
    segs = 8 if FAR else 18
    if FAR:
        lathe_axis(cen, nrm, up, [(r + 0.12, 0.0), (r + 0.1, 0.12), (0.0, 0.12)], segs, ZINC, C_PLAIN)
        return
    lathe_axis(cen, nrm, up, [(r + 0.16, 0.0), (r + 0.16, 0.08), (r + 0.1, 0.16), (r + 0.02, 0.2), (r - 0.04, 0.17), (r - 0.06, 0.1), (r - 0.06, -0.05)], segs, ZINC, C_SEAM)
    lathe_axis(cen + nrm * -0.04, nrm, up, [(r - 0.06, 0.0), (0.0, 0.0)], segs, GLASS, C_PLAIN)
    # mullion cross
    for ax in (up, rt):
        a = cen - ax * (r - 0.06) + nrm * -0.02; b = cen + ax * (r - 0.06) + nrm * -0.02
        box(a, ax, ax.cross(nrm).normalized(), nrm, 0, (b - a).length, -0.018, 0.018, 0.0, 0.04, ZINC, C_SEAM, skip=("bottom",))
    # scrolls (two volutes as stacked blocks) and the keystone
    for sg in (-1, 1):
        q = cen + rt * sg * (r + 0.2)
        for j, (sz, dz_) in enumerate(((0.12, -0.12), (0.09, 0.02), (0.06, 0.14))):
            box(q + up * dz_ + rt * sg * j * 0.05, rt, up, nrm, -sz, sz, -0.08, 0.08, 0.0, 0.12 - j * 0.02, ZINC, C_SEAM, skip=("back",))
    box(cen + up * (r + 0.12), rt, up, nrm, -0.1, 0.1, -0.05, 0.22, 0.0, 0.18, ZINC, C_KEY, skip=("back",))

def pavilion_crest(m):
    """the east pavilion's flat top: a zinc rim with a moulding and four finials (epis) at the corners"""
    cu0, cu1, cw0, cw1 = m.curb_rect(); h = m.curb
    pts = [P(cu1, cw0, h), P(cu1, cw1, h), P(cu0, cw1, h), P(cu0, cw0, h)]
    if FAR: return
    for k in range(4):
        a, b = pts[k], pts[(k + 1) % 4]
        d = (b - a).normalized(); s = d.cross(Z)
        box(a, d, Z, -s, -0.05, (b - a).length + 0.05, 0.0, 0.18, -0.05, 0.05, ZINC, C_SEAM)
    for p in pts:
        lathe(p + Z * 0.15, [(0.11, 0.0), (0.13, 0.08), (0.06, 0.2), (0.1, 0.42), (0.03, 0.62), (0.05, 0.75), (0.015, 0.95), (0.0, 1.15)], 10, ZINC, C_SEAM)

def chimney(u, w, h0, h1):
    c = P(u, w, 0); ax, ay = Vector((1, 0, 0)), Vector((0, 1, 0))
    wbox(c, ax, ay, 0.45, 0.32, hz(h0), hz(h1), BRICK, C_PLAIN)
    wbox(c, ax, ay, 0.52, 0.39, hz(h1), hz(h1) + 0.14, STONE, C_COPING)
    if not FAR:
        for sg in (-1, 1):
            lathe(c + ax * sg * 0.2 + Z * (hz(h1) + 0.14), [(0.1, 0.0), (0.1, 0.35), (0.12, 0.38), (0.12, 0.42), (0.0, 0.42)], 8, BRICK, C_PLAIN)

def roof_hatch(u, w, h):
    """a small zinc-framed roof light on the terrasson (the DSM shows two dips there)"""
    if FAR: return
    c = P(u, w, h); ax, ay = Vector((1, 0, 0)), Vector((0, 1, 0))
    wbox(c, ax, ay, 0.55, 0.45, hz(h) - 0.3, hz(h) + 0.18, ZINC, C_SEAM)
    face_up([c + V3(-0.48, -0.38, hz(h) + 0.22 - c.z), c + V3(0.48, -0.38, hz(h) + 0.22 - c.z), c + V3(0.48, 0.38, hz(h) + 0.28 - c.z), c + V3(-0.48, 0.38, hz(h) + 0.28 - c.z)], GLASS, C_PLAIN)

# ------------------------------------------------------------------------------------------------ portico, balcony, perron
def portico(e):
    fr = e.fr; s = e.s(0.0)
    dpt = UPOR - UE                                  # 1.76 m (UrbIS footprint)
    g = ground(UE + 4.5, 0.0)
    zgf = hz(FLOOR_GF); dc = dpt - 0.3              # column axis depth
    # landing (blue stone), under the portico and one step beyond
    land_d = dpt + 0.35
    fbox(fr, s - 1.8, s + 1.8, hz(g) - 0.3, zgf, 0.0, land_d, BLUE, C_PLINTH, skip=("back", "left", "right"))
    # the steps down to the square (11 risers in the photos' count, DTM ground)
    n = 11; rise = (FLOOR_GF - g) / n; tread = 0.31
    for i in range(n):
        d0 = land_d + i * tread; top = zgf - (i + 1) * rise
        fbox(fr, s - 1.8, s + 1.8, hz(g) - 0.3, top, d0, d0 + tread, BLUE, C_PLINTH, skip=("back",))
        if not FAR: fbox(fr, s - 1.8, s + 1.8, top - 0.04, top, d0 + tread, d0 + tread + 0.025, BLUE, C_PLINTH, skip=("back",))
    run_end = land_d + n * tread
    # cheek walls with a sloped coping, newel blocks at the foot; cast-iron railings on them
    for sg in (-1, 1):
        a0, a1 = sorted((s + sg * 1.8, s + sg * 2.15))
        t0, t1 = zgf + 0.45, hz(g) + 0.75
        prof = [(a0, a1)]
        for (c0, c1) in prof:
            pts = [(0.0, hz(g) - 0.3), (run_end, hz(g) - 0.3), (run_end, t1), (land_d, t0), (0.0, t0)]
            for x in (c0, c1):
                bz = hz(g) - 0.3
                for poly in ([(0.0, bz), (land_d, bz), (land_d, t0), (0.0, t0)], [(land_d, bz), (run_end, bz), (run_end, t1), (land_d, t0)]):
                    face_dir([fr.p(x, z, d) for d, z in poly], fr.U * (1 if x == c1 else -1), BLUE, C_PLINTH)
            top = [(run_end, t1), (land_d, t0), (0.0, t0)]
            for j in range(len(top) - 1):
                (da, za), (db, zb) = top[j], top[j + 1]
                face_dir([fr.p(c0, za, da), fr.p(c1, za, da), fr.p(c1, zb, db), fr.p(c0, zb, db)], Z, BLUE, C_COPING)
            face_dir([fr.p(c0, hz(g) - 0.3, run_end), fr.p(c1, hz(g) - 0.3, run_end), fr.p(c1, t1, run_end), fr.p(c0, t1, run_end)], fr.N, BLUE, C_PLINTH)
        # newel
        fbox(fr, a0 - 0.05, a1 + 0.05, hz(g) - 0.1, t1 + 0.35, run_end - 0.45, run_end + 0.05, BLUE, C_COPING, skip=())
        if not FAR:
            mid = (a0 + a1) / 2
            rail = lambda d: t0 + 0.95 if d <= land_d else t0 + 0.95 + (t1 - t0) * (d - land_d) / (run_end - land_d)
            base = lambda d: t0 if d <= land_d else t0 + (t1 - t0) * (d - land_d) / (run_end - land_d)
            d = 0.25
            while d < run_end - 0.5:
                q = fr.p(mid, base(d), d)
                box(q, fr.U, Z, fr.N, -0.012, 0.012, 0.0, rail(d) - base(d), -0.012, 0.012, IRON, C_PLAIN, skip=("bottom", "top"))
                d += 0.13
            # handrail (two segments) and posts
            pts = [(0.15, rail(0.15)), (land_d, rail(land_d)), (run_end - 0.45, rail(run_end - 0.45))]
            for j in range(2):
                (da, za), (db, zb) = pts[j], pts[j + 1]
                pa, pb = fr.p(mid, za, da), fr.p(mid, zb, db)
                dd = (pb - pa).normalized(); side = dd.cross(fr.U).normalized()
                box(pa, dd, fr.U, side, 0, (pb - pa).length, -0.03, 0.03, -0.03, 0.03, IRON, C_PLAIN)
            for d in (0.15, land_d, run_end - 0.45):
                q = fr.p(mid, base(d), d)
                box(q, fr.U, Z, fr.N, -0.035, 0.035, 0.0, rail(d) - base(d) + 0.08, -0.035, 0.035, IRON, C_PLAIN)
    # columns (Tuscan, entasis) on square plinths, the wall's pilasters answer them (EXTRA_PIL)
    z_cap = hz(PORTICO_SOFFIT - 0.3); z_ab = hz(PORTICO_SOFFIT)
    for sg in (-1, 1):
        cs = s + sg * 1.33
        c = fr.p(cs, 0, dc)
        if FAR:
            lathe(c + Z * zgf, [(0.24, 0.0), (0.2, z_ab - zgf), (0.0, z_ab - zgf)], 8, STONE, C_COL)
            continue
        wbox(c, fr.U, fr.N, 0.3, 0.3, zgf, zgf + 0.22, STONE, C_COL, skip=("bottom",))
        prof = [(0.27, 0.0), (0.27, 0.06), (0.25, 0.09), (0.25, 0.13), (0.215, 0.17), (0.215, 0.2)]
        H = z_cap - (zgf + 0.42)
        for t in (0.15, 0.33, 0.55, 0.78, 1.0):
            prof.append((0.215 - 0.035 * t ** 1.6, 0.2 + H * t))
        prof += [(0.205, H + 0.24), (0.2, H + 0.26), (0.23, H + 0.3), (0.26, H + 0.36), (0.26, H + 0.38), (0.0, H + 0.38)]
        lathe(c + Z * (zgf + 0.22), prof, 16, STONE, C_COL)
        wbox(c, fr.U, fr.N, 0.31, 0.31, z_cap, z_ab, STONE, C_COL)
    # entablature (architrave + frieze + cornice) on the columns, the balcony slab on top
    ztop = hz(BALC_FLOOR)
    fbox(fr, s - 1.71, s + 1.71, z_ab, ztop - 0.25, 0.0, dpt, STONE, C_CORN, skip=("back",))
    if not FAR:
        fbox(fr, s - 1.74, s + 1.74, z_ab + 0.18, z_ab + 0.24, 0.0, dpt + 0.03, STONE, C_BAND, skip=("back",))
    fbox(fr, s - 1.86, s + 1.86, ztop - 0.25, ztop - 0.12, 0.0, dpt + 0.12, STONE, C_CORN, skip=("back",))
    fbox(fr, s - 1.92, s + 1.92, ztop - 0.12, ztop, 0.0, dpt + 0.18, STONE, C_CORN, skip=("back",))
    # balustrade: corner dies, balusters, rail
    zb0 = ztop; zr = zb0 + 0.86
    dies = [(s - 1.71, dpt - 0.02), (s + 1.71, dpt - 0.02), (s - 1.71, 0.17), (s + 1.71, 0.17)]
    for (x, d) in dies:
        c = fr.p(x, 0, d)
        wbox(c, fr.U, fr.N, 0.16, 0.16, zb0, zr + 0.06, STONE, C_BAL, skip=("bottom",))
        if not FAR: wbox(c, fr.U, fr.N, 0.19, 0.19, zr + 0.06, zr + 0.13, STONE, C_COPING)
    runs_b = [((s - 1.55, dpt - 0.02), (s + 1.55, dpt - 0.02)), ((s - 1.71, 0.33), (s - 1.71, dpt - 0.18)), ((s + 1.71, 0.33), (s + 1.71, dpt - 0.18))]
    for (a, b) in runs_b:
        pa, pb = fr.p(a[0], 0, a[1]), fr.p(b[0], 0, b[1]); L = (pb - pa).length; dd = (pb - pa).normalized(); side = Z.cross(dd)
        box(pa, dd, Z, side, 0, L, zb0, zb0 + 0.13, -0.13, 0.13, STONE, C_BAL)
        box(pa, dd, Z, side, 0, L, zr - 0.12, zr, -0.14, 0.14, STONE, C_COPING)
        if FAR:
            box(pa, dd, Z, side, 0, L, zb0 + 0.13, zr - 0.12, -0.06, 0.06, STONE, C_BAL); continue
        nb = max(2, int(L / 0.2))
        for j in range(nb):
            q = pa + dd * (L * (j + 0.5) / nb)
            lathe(q + Z * (zb0 + 0.13), [(0.06, 0.0), (0.075, 0.03), (0.06, 0.07), (0.05, 0.1), (0.085, 0.24), (0.06, 0.38), (0.04, 0.48),
                                          (0.055, 0.53), (0.07, 0.58), (0.07, 0.61), (0.0, 0.61)], 8, STONE, C_BAL)

# -------------------------------------------------------------------------------------------- polish 2: carved panel, flag poles, paving apron
def wall_dome(fr, cs, cv, a, b, h, d0, ang=0.0, segs=16, mat=STONE, code=C_PED, sharp=1.0):
    """a carved relief boss on a wall: an elliptic dome (half axes a, b in the wall plane, rotated by ang, height h out of
    the wall from depth d0); the profile z = h (1 - r^2)^(0.5 sharp) gives a soft carved edge (no hard rim)"""
    B.new_group()
    ca, sa = math.cos(ang), math.sin(ang)
    def pt(r, t):
        x, y = a * r * math.cos(t), b * r * math.sin(t)
        return fr.p(cs + x * ca - y * sa, cv + x * sa + y * ca, d0 + h * max(0.0, 1 - r * r) ** (0.5 * sharp))
    radii = [1.0, 0.82, 0.55, 0.0]
    top = fr.p(cs, cv, d0 + h)
    back = fr.p(cs, cv, d0 - 0.5)
    for i in range(len(radii) - 1):
        r0, r1 = radii[i], radii[i + 1]
        for k in range(segs):
            t0, t1 = 2 * math.pi * k / segs, 2 * math.pi * (k + 1) / segs
            pts = [pt(r0, t0), pt(r0, t1), pt(r1, t1), pt(r1, t0)] if r1 > 1e-6 else [pt(r0, t0), pt(r0, t1), top]
            c = sum(pts, Vector()) / len(pts)
            face_dir(pts, c - back, mat, code)

def door_panel(e):
    """THE CARVED PANEL OVER THE MAIN DOOR (polish 2): a stone tablet between the centre pilasters, from the door's surround
    to the portico's architrave, framed by a bead moulding; on it a domed cartouche with a rolled rim, C-scrolls at its
    sides and two laurel branches tied by a ribbon under it. The photos (P01, 3557) are too small to read the carving:
    its motif is ESTIMATED (the usual Louis XIII / eclectic cartouche); its size and place are measured."""
    if FAR: return
    fr = e.fr; s = e.s(0.0)
    # the tablet stands on the door surround's inner step (its face 0.095 out covers the surround's 0.085)
    z0, z1 = hz(DOOR_HEAD + 0.075), hz(PORTICO_SOFFIT)
    hw = 0.96; d0 = 0.095
    fbox(fr, s - hw, s + hw, z0, z1, 0.0, d0, STONE, C_PED)
    # bead frame (a closed path, CCW: its left normal points into the field)
    m = 0.045
    BEAD = [(0.0, 0.0), (0.014, 0.0), (0.024, 0.008), (0.028, 0.02), (0.024, 0.032), (0.014, 0.04), (0.0, 0.04)]
    sweep2d(fr, [(s - hw + m, z0 + m), (s + hw - m, z0 + m), (s + hw - m, z1 - m), (s - hw + m, z1 - m)], BEAD, STONE, C_PED,
            closed=True, d0=d0)
    cv = (z0 + z1) / 2 + 0.01
    a, b = 0.21, (z1 - z0) / 2 - 0.085
    # cartouche: a domed shield and a rolled rim (round section)
    wall_dome(fr, s, cv, a, b, 0.045, d0, segs=24, sharp=0.8)
    ROLL = [(0.0, -0.016), (0.012, -0.013), (0.019, -0.004), (0.019, 0.006), (0.012, 0.014), (0.0, 0.017)]
    rim = [(s + (a + 0.012) * math.cos(2 * math.pi * k / 28), cv + (b + 0.012) * math.sin(2 * math.pi * k / 28)) for k in range(28)]
    sweep2d(fr, rim, ROLL, STONE, C_PED, closed=True, d0=d0)
    # on the shield: an inner bead ring following the dome, a rosette of eight petals round a boss at its crown
    hd = 0.045
    ring = [(s + 0.74 * a * math.cos(2 * math.pi * k / 24), cv + 0.74 * b * math.sin(2 * math.pi * k / 24)) for k in range(24)]
    sweep2d(fr, ring, [(0.0, -0.006), (0.006, -0.004), (0.008, 0.0), (0.006, 0.004), (0.0, 0.006)], STONE, C_PED, closed=True,
            d0=d0 + hd * (1 - 0.74 ** 2) ** 0.4 - 0.004)
    ztop = d0 + hd - 0.006
    for k in range(8):
        t = 2 * math.pi * k / 8 + math.pi / 8
        wall_dome(fr, s + math.cos(t) * 0.052, cv + math.sin(t) * 0.052, 0.042, 0.017, 0.012, ztop - 0.004, ang=t, segs=10, sharp=0.7)
    wall_dome(fr, s, cv, 0.024, 0.024, 0.018, ztop, segs=12)
    # C-scrolls at its sides (volutes: a round section swept along a tightening spiral) with a boss at the eye
    ROUND = [(0.0, -0.011), (0.011, -0.008), (0.016, 0.0), (0.011, 0.008), (0.0, 0.011)]
    for sg in (-1, 1):
        cx = s + sg * (a + 0.085)
        path = []
        for k in range(15):
            t = k / 14; th = math.pi * (0.5 + 1.9 * t); rho = 0.075 * (1 - 0.62 * t)
            path.append((cx - sg * rho * math.cos(th), cv + 0.02 + rho * math.sin(th)))
        sweep2d(fr, path, ROUND, STONE, C_PED, d0=d0)
        wall_dome(fr, path[-1][0], path[-1][1], 0.018, 0.018, 0.02, d0, segs=10)
    # laurel branches: a stem from the ribbon under the cartouche out to the panel's ends, leaves in pairs along it
    STEM = [(0.0, -0.007), (0.008, -0.005), (0.011, 0.0), (0.008, 0.005), (0.0, 0.007)]
    for sg in (-1, 1):
        p0 = (s + sg * 0.05, z0 + 0.12); p1 = (s + sg * 0.48, z0 + 0.06); p2 = (s + sg * (hw - 0.12), cv + 0.07)
        bez = lambda t: ((1 - t) ** 2 * p0[0] + 2 * t * (1 - t) * p1[0] + t * t * p2[0], (1 - t) ** 2 * p0[1] + 2 * t * (1 - t) * p1[1] + t * t * p2[1])
        sweep2d(fr, [bez(k / 12) for k in range(13)], STEM, STONE, C_PED, d0=d0)
        n = 9
        for j in range(n):
            t = 0.12 + 0.86 * j / (n - 1)
            x, y = bez(t)
            dx = 2 * (1 - t) * (p1[0] - p0[0]) + 2 * t * (p2[0] - p1[0]); dy = 2 * (1 - t) * (p1[1] - p0[1]) + 2 * t * (p2[1] - p1[1])
            ang = math.atan2(dy, dx); L = 0.05 * (1 - 0.35 * t)
            for side in (1, -1):
                la = ang + side * math.radians(38)
                wall_dome(fr, x + math.cos(la) * L * 0.9, y + math.sin(la) * L * 0.9, L, L * 0.36, 0.016, d0, ang=la, segs=10, sharp=0.7)
            if j == n - 1:
                wall_dome(fr, x + math.cos(ang) * L * 1.2, y + math.sin(ang) * L * 1.2, L, L * 0.36, 0.016, d0, ang=ang, segs=10, sharp=0.7)
    # the ribbon: a knot and two loops over the crossing stems, two tails
    wall_dome(fr, s, z0 + 0.12, 0.03, 0.026, 0.028, d0, segs=12)
    for sg in (-1, 1):
        wall_dome(fr, s + sg * 0.06, z0 + 0.135, 0.045, 0.02, 0.018, d0, ang=sg * math.radians(20), segs=12, sharp=0.7)
        wall_dome(fr, s + sg * 0.05, z0 + 0.075, 0.04, 0.012, 0.014, d0, ang=-sg * math.radians(55), segs=10, sharp=0.7)

FLAG_POLES = []
def flag_poles(e):
    """FLAG POLES on the balcony (polish 2; the flags themselves are left for the cloth-simulation flag system): three
    painted iron poles as in the inventory's frontal view P01 (EU south / Belgium centre / Uccle north; the Commons photo
    3557 of 2008 shows two, Belgium south and Uccle north, from the same corners): the side poles rise from the
    balustrade's front corner dies leaning out sideways and forward, the centre one from the middle of the front rail.
    Each stands in a socket on a bracket fixed to the stone, with a stay; a ball finial on top. The poles' ends, axes and
    lengths go to townhall.json (flag_poles) for the flag system."""
    fr = e.fr; s0 = e.s(0.0)
    dpt = UPOR - UE
    zb0 = hz(BALC_FLOOR); zr = zb0 + 0.86
    spec = [("south", e.s(1.71), zr + 0.13, dpt - 0.02, 38.0, 3.9, "EU (P01) / Belgium (3557, 2008)"),
            ("centre", s0, zr, dpt - 0.02, 16.0, 3.5, "Belgium (P01)"),
            ("north", e.s(-1.71), zr + 0.13, dpt - 0.02, 38.0, 3.9, "Uccle (P01 and 3557)")]
    if not FAR: FLAG_POLES.clear()
    for name, ss, zb, dd, lean, L, flag in spec:
        sgn = 1 if ss > s0 + 1e-6 else (-1 if ss < s0 - 1e-6 else 0)
        a = math.radians(lean)
        D = (Z * math.cos(a) + fr.U * (sgn * math.sin(a) * 0.8) + fr.N * (math.sin(a) * (0.6 if sgn else 1.0))).normalized()
        base = fr.p(ss, zb, dd) + fr.N * 0.03
        ref = fr.U if abs(D.dot(fr.U)) < 0.9 else fr.N
        if FAR:
            lathe_axis(base, D, ref, [(0.03, 0.0), (0.025, L), (0.0, L)], 5, IRON, C_PLAIN)
            continue
        # pole (slight taper), a collar, the ball finial on a neck
        lathe_axis(base, D, ref, [(0.0, -0.02), (0.03, -0.02), (0.03, L - 0.02), (0.022, L), (0.016, L + 0.03), (0.016, L + 0.05),
                                  (0.034, L + 0.07), (0.045, L + 0.1), (0.034, L + 0.135), (0.0, L + 0.15)], 10, IRON, C_PLAIN)
        # the socket: a short tube with a lip
        lathe_axis(base, D, ref, [(0.0, -0.06), (0.045, -0.06), (0.045, 0.28), (0.055, 0.3), (0.055, 0.33), (0.036, 0.33), (0.036, 0.3)], 10, IRON, C_PLAIN)
        q = fr.p(ss, zb, dd)
        if sgn:      # side poles: a plate on the die's coping with two bolt heads
            box(q, fr.U, Z, fr.N, -0.09, 0.09, -0.005, 0.012, -0.12, 0.06, IRON, C_PLAIN)
            for bx in (-0.05, 0.05):
                lathe(q + fr.U * bx - fr.N * 0.07 + Z * 0.012, [(0.012, 0.0), (0.012, 0.01), (0.0, 0.014)], 6, IRON, C_PLAIN)
        else:        # centre pole: a saddle clamp over the rail
            box(q, fr.U, Z, fr.N, -0.08, 0.08, -0.13, 0.015, -0.155, 0.155, IRON, C_PLAIN, skip=("bottom",))
        # a flat stay from the plate to the socket
        st0 = base + D * 0.22; st1 = q + Z * 0.012 - fr.N * 0.05
        dv = st0 - st1; Ls = dv.length; dv.normalize()
        sideV = dv.cross(fr.U if abs(dv.dot(fr.U)) < 0.9 else fr.N).normalized()
        box(st1, dv, sideV, dv.cross(sideV), 0.0, Ls, -0.012, 0.012, -0.006, 0.006, IRON, C_PLAIN)
        tip = base + D * L
        bw = lambda v: [round(v.x, 3), round(-v.y, 3), round(v.z + OY, 3)]
        FLAG_POLES.append({"name": name, "base_building_uwh": bw(base), "tip_building_uwh": bw(tip),
                           "axis_building_uwh": [round(D.x, 4), round(-D.y, 4), round(D.z, 4)], "length_m": L, "radius_m": 0.03,
                           "base_city_xyz": [round(city(base.x, -base.y)[0], 2), round(base.z + OY, 2), round(city(base.x, -base.y)[1], 2)],
                           "tip_city_xyz": [round(city(tip.x, -tip.y)[0], 2), round(tip.z + OY, 2), round(city(tip.x, -tip.y)[1], 2)],
                           "flag_in_photos": flag})

def paving_apron(e):
    """THE FORECOURT PAVING at the foot of the perron (polish 2): the Place Jean Vander Elst's paving reaches the steps in the
    photos (P01: setts between the planted beds), but the city's sidewalk polygon (UrbIS Land cover street surface 140243)
    starts 4.9 m out from the facade, and the city drew grass up to the steps. A paved apron in its OWN slot (cobbles) from
    the facade to the sidewalk's inner edge, between kerbs of blue stone, on the DTM (+5 cm), with a skirt down below the
    ground on its open front (the city's ground there lies up to 25 cm under the DTM)."""
    fr = e.fr; s = e.s(0.0)
    u1 = 17.27 - UE                                   # out from the facade to the sidewalk's edge (UrbIS street surface)
    hw = 3.3; kw = 0.12
    nS, nD = (12, 10) if not FAR else (4, 3)
    ss = [s - hw + kw + (2 * (hw - kw)) * k / nS for k in range(nS + 1)]
    ds = [u1 * k / nD for k in range(nD + 1)]
    def gz(si, di):
        p = fr.p(si, 0.0, di)
        return ground(p.x, -p.y) - OY + 0.05
    B.new_group()
    for i in range(len(ss) - 1):
        for j in range(len(ds) - 1):
            pts = [fr.p(ss[i], gz(ss[i], ds[j]), ds[j]), fr.p(ss[i + 1], gz(ss[i + 1], ds[j]), ds[j]),
                   fr.p(ss[i + 1], gz(ss[i + 1], ds[j + 1]), ds[j + 1]), fr.p(ss[i], gz(ss[i], ds[j + 1]), ds[j + 1])]
            face_dir(pts, Z, COBBLES, C_PLAIN)
    for i in range(len(ss) - 1):           # the open front: an edge of blue stone down below the ground (the city sidewalk meets it)
        a, b = ss[i], ss[i + 1]
        face_dir([fr.p(a, gz(a, u1), u1), fr.p(b, gz(b, u1), u1), fr.p(b, gz(b, u1) - 0.4, u1), fr.p(a, gz(a, u1) - 0.4, u1)], fr.N, BLUE, C_COPING)
    # kerbs along both sides (blue stone, 4 cm proud with a 1 cm chamfer on the paving side), down below the ground
    B.new_group()
    for sg in (-1, 1):
        k0, k1 = s + sg * (hw - kw), s + sg * hw
        lo, hi = sorted((k0, k1)); inner = k0; ch = 0.01
        xc = inner + (ch if inner == lo else -ch)
        for j in range(len(ds) - 1):
            d_a, d_b = ds[j], ds[j + 1]
            za, zb = gz(k1, d_a), gz(k1, d_b)
            t0, t1 = (xc, k1) if inner == lo else (k1, xc)
            face_dir([fr.p(t0, za + 0.04, d_a), fr.p(t1, za + 0.04, d_a), fr.p(t1, zb + 0.04, d_b), fr.p(t0, zb + 0.04, d_b)], Z, BLUE, C_COPING)
            face_dir([fr.p(xc, za + 0.04, d_a), fr.p(inner, za + 0.03, d_a), fr.p(inner, zb + 0.03, d_b), fr.p(xc, zb + 0.04, d_b)], fr.U * (-sg) + Z, BLUE, C_COPING)
            face_dir([fr.p(inner, za + 0.03, d_a), fr.p(inner, za - 0.02, d_a), fr.p(inner, zb - 0.02, d_b), fr.p(inner, zb + 0.03, d_b)], fr.U * (-sg), BLUE, C_COPING)
            face_dir([fr.p(k1, za + 0.04, d_a), fr.p(k1, za - 0.4, d_a), fr.p(k1, zb - 0.4, d_b), fr.p(k1, zb + 0.04, d_b)], fr.U * sg, BLUE, C_COPING)
        zf = gz(k1, u1)
        face_dir([fr.p(k0, zf + 0.04, u1), fr.p(k1, zf + 0.04, u1), fr.p(k1, zf - 0.4, u1), fr.p(k0, zf - 0.4, u1)], fr.N, BLUE, C_COPING)

# ------------------------------------------------------------------------------------------------ build
def build_all():
    for e in EDGES: build_edge(e)
    portico(EDGES[0])
    door_panel(EDGES[0]); flag_poles(EDGES[0]); paving_apron(EDGES[0])
    R = {m.name: m for m in ROOFS}
    for m in ROOFS: brisis_faces(m)
    for (u0, u1, w0, w1), h in VALLEY_DECKS:
        B.new_group(); face_up([P(u1, w0, h), P(u1, w1, h), P(u0, w1, h), P(u0, w0, h)], ZINC, C_PLAIN)
    pavilion_crest(R["east_pavilion"])
    # the east pavilion's attic: a stone parapet on the cornice in front of the pavilion, pedestals at its ends
    fe = EDGES[0].fr
    ct = hz(ORD["main"]["ct"])
    for (a, b) in ((-4.85, -0.95), (0.95, 4.85)):
        sa, sb = sorted((EDGES[0].s(a), EDGES[0].s(b)))
        fbox(fe, sa, sb, ct, ct + 1.05, -0.45, -0.05, STONE, C_COPING, skip=())
        if not FAR:
            fbox(fe, sa - 0.03, sb + 0.03, ct + 1.05, ct + 1.15, -0.48, -0.02, STONE, C_COPING)
            for k in range(int((sb - sa) / 0.9)):
                x = sa + 0.45 + k * 0.9
                fbox(fe, x - 0.3, x + 0.3, ct + 0.25, ct + 0.85, -0.05, -0.03, STONE, C_COPING)
    for c in (-5.0, 5.0):
        x = EDGES[0].s(c)
        fbox(fe, x - 0.32, x + 0.32, ct, ct + 1.45, -0.5, 0.0, STONE, C_PIL, skip=())
        if not FAR: fbox(fe, x - 0.38, x + 0.38, ct + 1.45, ct + 1.58, -0.56, 0.06, STONE, C_COPING, skip=())
    # dormers and oculi (photo 3557 east; inventory corner view south; north = mirror except the wings' east slopes)
    m = R["main"]
    for c in (8.05, -8.05): dormer(m, "e", c, "tri")
    dormer(R["east_pavilion"], "e", 0.0, "big")
    for c in (1.85, -1.85): oculus(R["east_pavilion"], "e", c, 79.4, 0.42)
    oculus(m, "s", 10.15, 77.0, 0.45); oculus(m, "n", 10.15, 77.0, 0.45)
    oculus(R["wing_s"], "e", 13.5, 76.4, 0.42)
    dormer(R["wing_n"], "e", -13.5, "flat")
    dormer(R["wing_s"], "s", 2.55, "tri"); dormer(R["wing_n"], "n", 2.55, "tri")
    dormer(R["block_s"], "s", -9.2, "tri"); dormer(R["block_n"], "n", -9.2, "tri")
    for c in (9.7, -9.7): dormer(R["block_s" if c > 0 else "block_n"], "w", c, "seg")
    dormer(R["west_pavilion"], "w", 0.0, "seg")
    chimney(-0.75, -4.75, 80.6, 82.55)
    roof_hatch(1.0, -7.0, 80.7); roof_hatch(3.5, -7.0, 80.7)

build_all()
B_MAIN = B
print(f"LOD0: {len(B.f)} faces in {time.time() - T0:.1f}s")
B = Builder(); FAR = True
build_all()
B_FAR = B; FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)

def shrink_low_priority(me, thin):
    """flat roof decks and big slate planes vary little in AO: their islands are scaled down so walls, dressings and
    openings get more of the map"""
    import collections
    lm = me.uv_layers["Lightmap"].data
    slot_of = [me.materials[p.material_index].name for p in me.polygons]
    low = {}
    for p in me.polygons:
        n = p.normal; sl = slot_of[p.index]
        if thin[p.index]: continue
        if sl in ("zinc_roof", "glass_window") and n.z > 0.8: low[p.index] = 0.35
        elif sl == "slate": low[p.index] = 0.7
    if not low: return
    parent = list(range(len(me.polygons)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    key = {}
    for p in me.polygons:
        for li in p.loop_indices:
            uv = lm[li].uv; k = (me.loops[li].vertex_index, round(uv.x, 6), round(uv.y, 6))
            if k in key:
                a, b = find(key[k]), find(p.index)
                if a != b: parent[a] = b
            else: key[k] = p.index
    isl = collections.defaultdict(list)
    for p in me.polygons: isl[find(p.index)].append(p.index)
    for faces in isl.values():
        fs = [low.get(f) for f in faces]
        if any(v is None for v in fs): continue
        s_ = max(fs)
        loops = [li for f in faces for li in me.polygons[f].loop_indices]
        cx = sum(lm[li].uv.x for li in loops) / len(loops); cy = sum(lm[li].uv.y for li in loops) / len(loops)
        for li in loops:
            u = lm[li].uv; lm[li].uv = (cx + (u.x - cx) * s_, cy + (u.y - cy) * s_)

def region_width(me):
    """(polish 2b) COLOR_0.b = the WIDTH of the region each face belongs to (edge-connected faces whose normals turn by < 50 deg
    from one face to the next: a flat face, a moulding, a lathed baluster; the
    smaller side of the region's bounding rectangle in its plane, or 2 x area / perimeter when smaller: a frame around
    its panes is as narrow as its bars), encoded b = sqrt(width / 4 m): a quoin course's top
    3.5 cm, a band's top 15 cm, a pilaster's face 0.78 m, a wall several metres. The viewer bends the shading normal of a
    region toward the view once a pixel outgrows it (no sub-pixel sunlit slivers = no sparkle far away)."""
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    cos_t = math.cos(math.radians(50))       # neighbour to neighbour: a lathed or curved part (8-16 facets) is ONE region
    seen = [False] * len(bm.faces); width = [4.0] * len(bm.faces)
    for f0 in bm.faces:
        if seen[f0.index]: continue
        reg, stack = [], [f0]; seen[f0.index] = True; n0 = f0.normal.copy()
        while stack:
            f = stack.pop(); reg.append(f)
            for e in f.edges:
                for g in e.link_faces:
                    if not seen[g.index] and g.normal.dot(f.normal) > cos_t:
                        seen[g.index] = True; stack.append(g)
        t = Z.cross(n0)
        t = t.normalized() if t.length > 1e-3 else Vector((1, 0, 0))
        bv = n0.cross(t).normalized()
        xs = [v.co.dot(t) for f in reg for v in f.verts]; ys = [v.co.dot(bv) for f in reg for v in f.verts]
        w = min(max(xs) - min(xs), max(ys) - min(ys))
        zs = [v.co.dot(n0) for f in reg for v in f.verts]
        ext = sorted((max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs)))
        if ext[0] > 0.01: w = ext[1]                       # a curved / folded region: its second-largest extent (a baluster: its girth)
        # a perforated region (a casement's frame around its panes, a grid of bars) is as narrow as its bars: 2 x area /
        # perimeter (= the width of a long strip) when that is smaller than the bounding rectangle's side
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

def make_object(name, bld, v0, v1):
    used = sorted(set(bld.m))
    remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f)
    me.update()
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
        if given and len(given) == len(poly.loop_indices) and any(abs(g[1]) > 1e-6 for g in given):
            for li, (u, v) in zip(poly.loop_indices, given): uvd[2 * li] = u; uvd[2 * li + 1] = v
            continue
        n = poly.normal
        if abs(n.z) < 0.75:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-4 else Vector((1, 0, 0)); b = n.cross(t).normalized()
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    obj = bpy.data.objects.new(name, me)
    scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0008)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0004)
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(32))
    me.validate()
    region_width(me)
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    uv1 = me.uv_layers.new(name="Lightmap")
    me.uv_layers.active = uv1
    for o in scn.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    t = time.time()
    # THIN faces (< 6 cm across: glazing bars, band tops, joints, balusters' small rings...) take no texels: their
    # lightmap UVs go to a reserved column of AO 1.0; their AO is baked PER VERTEX instead (COLOR_0.g)
    thin = [False] * len(me.polygons)
    for p_ in me.polygons:
        co = [me.vertices[v].co for v in p_.vertices]
        mx = max((co[i] - co[(i + 1) % len(co)]).length for i in range(len(co)))
        thin[p_.index] = mx > 0 and p_.area / mx < (0.06 if len(co) == 4 else 0.03)
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
    for f_ in bm.faces: f_.select_set(not thin[f_.index])
    bm.select_flush_mode(); bmesh.update_edit_mesh(me)
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    lmd = me.uv_layers["Lightmap"].data
    bld_groups = [0] * len(me.polygons); me.attributes["grp"].data.foreach_get("value", bld_groups)
    for poly, g in zip(me.polygons, bld_groups):
        off = (g % 9973) * 1e-7
        for li in poly.loop_indices: u = lmd[li].uv; lmd[li].uv = (u.x + off, u.y + off)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode="OBJECT")
    shrink_low_priority(me, thin)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0006, shape_method=PACK_SHAPE, margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    lmd = me.uv_layers["Lightmap"].data
    for p_ in me.polygons:
        for li in p_.loop_indices:
            if thin[p_.index]: lmd[li].uv = (AO_PARK_U, 0.5)
            else: u = lmd[li].uv; lmd[li].uv = (u.x * 0.994, u.y)
    lm = me.uv_layers["Lightmap"].data
    cov = 0.0
    for poly in me.polygons:
        li = list(poly.loop_indices)
        for j in range(1, len(li) - 1):
            a, b, c_ = lm[li[0]].uv, lm[li[j]].uv, lm[li[j + 1]].uv
            cov += abs((b.x - a.x) * (c_.y - a.y) - (b.y - a.y) * (c_.x - a.x)) / 2
    area = sum(p_.area for p_ in me.polygons if not thin[p_.index])
    dens = math.sqrt(cov * AO_PX * AO_PX * (v1 - v0) / max(area, 1))
    print(f"  lightmap UV {time.time() - t:.1f}s, {sum(thin)} thin faces (vertex AO), coverage {cov:.3f}, area {area:.0f} m2, {dens:.1f} px/m (mean)")
    uv1 = me.uv_layers["Lightmap"]
    d = [0.0] * (2 * len(me.loops)); uv1.data.foreach_get("uv", d)
    for i in range(1, len(d), 2): d[i] = v0 + d[i] * (v1 - v0)
    uv1.data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]
    me.attributes.remove(me.attributes["grp"])
    obj["thin"] = sum(thin); obj["px_per_m"] = dens
    return obj, ntri, {SLOTS[m]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == remap[m]) for m in used}, thin

AO_SPLIT = 0.885
PACK_SHAPE = "CONCAVE" if "--fast" not in ARGS else "AABB"
AO_PARK_U = 0.997
obj, ntri, per_slot, thin0 = make_object("TownHall", B_MAIN, 0.0, AO_SPLIT)
far, ntri_far, per_slot_far, thin1 = make_object("TownHall_far", B_FAR, AO_SPLIT + 0.005, 1.0)
print(f"uv done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground for the bake + previews
def load_ground():
    import numpy as np
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + _g["base"]
    st = 2
    a = a[::st, ::st]; step = _g["step"] * st
    rows, cols = a.shape
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
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.15, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g
ground_obj = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("townhall_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
    """bake AO to a corner colour attribute, copy it into Col.g for the THIN faces (1 elsewhere)"""
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
    n_set = 0
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices:
            c[4 * li + 1] = max(0.25, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 96
    t = time.time()
    for target, other, clear in ((obj, far, True), (far, obj, False)):
        other.hide_render = True; target.hide_render = False
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=clear)
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    far.hide_render = True; obj.hide_render = False; vertex_ao(obj, thin0)
    far.hide_render = False; obj.hide_render = True; vertex_ao(far, thin1)
    obj.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "townhall_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "townhall_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "townhall.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
info = {
    "asset": "Uccle town hall, Place Jean Vander Elst 29 (tools/blender/townhall.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "flag_poles": FLAG_POLES,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "COLOR_0.b": "sqrt(width of the flat region / 4 m)", "names": CODES},
    "uv": {"TEXCOORD_0": "world metres, per face (walls u along / v up; lathed parts arc length)", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": AO_SPLIT, "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1),
                 "thin_faces_vertex_ao": [obj["thin"], far["thin"]]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, rotation.y = -rotation",
    "placement": {"city_local_position": [OXC, OY, OZC], "rotation_y_rad": -ROT,
                  "hides_solids": [SITE["solid"]["id"]], "hides_bu_ids": [SITE["solid"]["bu"]]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"plan_m": PL, "roof_taw": {k: v["p50"] for k, v in ROOF.items()}, "core_curb_taw": R_CORE_CURB,
                 "ground_taw": SITE["ground"], "frame": FR},
    "levels_taw": {"ground_floor": FLOOR_GF, "plinth_top": PLINTH_TOP, "gf_windows": [GF_SILL, GF_HEAD], "string_course": BAND1, "door_head": DOOR_HEAD, "portico_soffit": PORTICO_SOFFIT, "balcony_floor": BALC_FLOOR,
                   "f1_sill": F1_SILL, "orders": ORD},
    "estimated": "storey heights and window sizes from the photo 3557 scaled on the UrbIS facade width (61.5 px/m) and the DSM "
                 "roof levels; mouldings, consoles, modillions, quoin courses; the WEST facade (no photo); the north facade = mirror of the south",
}
json.dump(info, open(os.path.join(OUT, "townhall.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_red_brussels": (0.2, 0.065, 0.04), "stone_white": (0.6, 0.56, 0.48), "stone_blue": (0.33, 0.335, 0.33), "slate": (0.06, 0.065, 0.075),
            "zinc_roof": (0.3, 0.32, 0.33), "wood_frame_white": (0.8, 0.8, 0.78), "wood_frame_dark": (0.03, 0.035, 0.035),
            "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.03, 0.05, 0.04), "cobbles": (0.16, 0.155, 0.15)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else (0.45 if m.name in ("zinc_roof", "slate") else 0.8)
        bsdf.inputs["Metallic"].default_value = 0.4 if m.name == "zinc_roof" else 0.0
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(120))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 40; scn.cycles.use_denoising = True
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
    look("east", (70.0, 0.0, 63.0), (12.0, 0.0, 71.5), 70)
    look("southeast", (34.0, 30.0, 63.0), (4.0, 6.0, 70.0), 30)
    look("aerial_nw", (-40.0, -45.0, 105.0), (2.0, 0.0, 72.0), 32)
    look("portico", (24.0, 5.0, 63.5), (12.5, 0.0, 66.5), 32)
print(f"done {time.time() - T0:.1f}s")
