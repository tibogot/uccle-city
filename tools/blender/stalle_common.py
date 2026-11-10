"""CHAPELLE DE STALLE: shared geometry kit + the measured plan, for tools/blender/stalle.py (exterior) and
tools/blender/stalle_interior.py (the interior cell). Imported by both (sys.path = this folder).

Frame (tools/stalle_measure.py -> models/stalle/site.json): u along the chapel's axis (west front -> chevet), w to the
south side, heights m TAW. Blender: x = u, y = -w, z = TAW - OY. glTF (Y up) -> three.js local (u, TAW - OY, w): the
node goes at the city position of the frame origin, height OY, rotation.y = -rotation.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon, delaunay_2d_cdt

OY = 30.0
Z = Vector((0, 0, 1))
def P(u, w, h): return Vector((u, -w, h - OY))
def hz(h): return h - OY

# ------------------------------------------------------------------------------------------------ site
def load_site(out):
    site = json.load(open(os.path.join(out, "site.json")))
    g = json.load(open(os.path.join(out, "site_dtm.json")))
    gd = memoryview(open(os.path.join(out, "site_dtm.bin"), "rb").read()).cast("H")
    return site, g, gd

class Ground:
    def __init__(self, site, g, gd):
        fr = site["frame"]; self.ox, self.oz = fr["origin_city"]; self.rot = fr["rotation_rad"]
        self.ca, self.sa = math.cos(self.rot), math.sin(self.rot); self.g, self.gd = g, gd
    def city(self, u, w): return self.ox + u * self.ca - w * self.sa, self.oz + u * self.sa + w * self.ca
    def local(self, x, z):
        dx, dz = x - self.ox, z - self.oz
        return dx * self.ca + dz * self.sa, -dx * self.sa + dz * self.ca
    def at_city(self, x, z):
        g = self.g
        c = min(max((x - g["x0"]) / g["step"], 0), g["cols"] - 1.001); r = min(max((z - g["z0"]) / g["step"], 0), g["rows"] - 1.001)
        c0, r0 = int(c), int(r); fc, fr = c - c0, r - r0
        H = lambda i, j: self.gd[j * g["cols"] + i] / 100 + g["base"]
        return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr
    def __call__(self, u, w): return self.at_city(*self.city(u, w))

# ------------------------------------------------------------------------------------------------ THE PLAN (measured + photos)
# axis of the nave / choir: w = WC (the footprint's west front is centred on 0.0, the choir on 0.3, the DSM ridge 0.25)
WC = 0.1
A_OUT = 4.35            # aisles' outer wall faces, |w - WC| (footprint: -4.19 / +4.21..4.54)
NW = 2.25               # nave clerestory + choir outer wall faces (footprint choir: -1.93 / +2.53 about 0.3)
U_AISLE_N = 11.2        # north aisle's east end (footprint 11.19..11.29)
U_AISLE_S = 10.55       # south aisle's east end (the sacristy beyond: footprint 10.50..10.60)
U_APSE = 14.75          # the apse starts (footprint 14.71)
U_EAST = 16.88          # the apse's east face (footprint 16.88)
APSE_HW = 1.4           # half-width of the apse's east face (footprint -1.07..1.67 -> 2.74 m)
T_WEST, T_AISLE, T_CLER, T_CHOIR = 0.75, 0.6, 0.5, 0.65   # wall thicknesses (estimated: rubble faced on brick)
# heights (m TAW): DSM 2021 + the west front photo (Commons, EmDee 2011) scaled on the footprint's 8.4 m front
RIDGE = 43.35           # DSM ridge plateau u 0..15
PITCH = math.tan(math.radians(55))      # nave / choir roof
NAVE_EAVE = RIDGE - NW * PITCH          # 40.13 at the wall face
AISLE_TOP = 39.2        # where the aisle roofs meet the clerestory (photo shoulders)
AISLE_EAVE = 37.35      # aisle walls' top (DSM 37.25-37.6 at the eaves, the photo's shoulder ends)
FLOOR = 34.32           # nave floor: the west door's threshold, two steps above the forecourt (33.85)
CHOIR_FLOOR = 34.49     # one step up (the DTM rises to 34.3 at the east end)
PLINTH_TOP = 34.95
# the bell-cote: the DSM's ridge bump (45.3 at u 6.5-7.0)
BELL_U = 6.5
# the west front (photo c00, 242 px/m at the front, ground y 3150 = 33.85)
DOOR_W, DOOR_TOP = 1.40, 36.42
# the west door's oak frame (dormant) set in the stone opening, its rebate and the leaves (shared by the exterior, which
# shows the closed leaves, and the interior cell, whose leaves open): depths = u from the west face (m)
DOOR_FRAME = dict(u0=0.26, u1=0.37, face=0.075, head=0.075)   # the frame's jambs + head: 7.5 cm faces, u 0.26..0.37
DOOR_LEAF = dict(u0=0.37, u1=0.415, lap=0.022, gap=0.0)         # the leaves lie BEHIND the frame (inside), against its back
                                                                # face, overlapping its inner edge by `lap` (the rebate / stop),
                                                                # their bottom ON the threshold: no slit to see through
DOOR_OPEN_DEG = 92                                              # the interior leaves' swing (hinges on their inner corners:
                                                                # at 92 deg they clear the inner reveal by 4 cm)
RAISE = 0.27            # the west gable's shoulder copings stand this much above the aisle roofs' line (roof + 3 cm + coping)
WWIN_W, WWIN_SILL, WWIN_SPRING, WWIN_APEX = 1.70, 37.35, 39.0, 40.25
GABLE_APEX = 44.05      # coping top at the apex (0.7 m above the ridge: a raised stone gable)
KNEEL = 40.75           # nave kneelers
OCULUS_W_H = 41.97      # the west gable's oculus centre
# sides (P01 heritage + c05 Commons, projective fits along the north aisle; south = estimated mirror)
CLER_OCULI = [2.8, 5.3, 7.75]          # photo poses c05 + P01 agree within 0.1 m
N_AISLE = dict(leper=1.0, oculi=[1.72, 6.74, 9.14], door=(3.95, 4.9), anchor=2.38)
AISLE_OCULUS_H = 36.55            # the aisles' oculi centres (pose probes: just under the north door's head)
S_AISLE = dict(oculi=[1.72, 6.74, 9.14])
COLS_U = [4.05, 6.5, 9.0]         # arcade piers: arches under the clerestory oculi (interior photo: 3 + a short bay)
RESP_W = 1.55                     # the west respond (a pier against the west wall)
ARC_RESP_W, ARC_RESP_E = T_WEST, 10.45
CHOIR_ARCH_U = (10.45, 11.2)
CHOIR_WIN_N = 12.95               # the choir's north window (P01), two lights + quatrefoil
# the sacristy (brick, south of the choir: footprint u 10.5-15.2, w 2.53-7.34) and the sacristan's house (1711)
SAC = dict(u0=10.5, u1=15.2, w1=7.34, eave=36.95, top=39.0)
HOUSE = dict(u0=-6.67, u1=0.58, w0=4.15, w1=9.97, eave=37.9, ridge=41.3)

# ------------------------------------------------------------------------------------------------ builder
class Builder:
    """faces + per-face slot, code, optional UV0, construction group (lightmap islands are split by group), the per-piece
    seed (COLOR_0.b: 0 = none; slates, statue...) and a forced per-vertex AO flag (small repeated pieces: slates)"""
    def __init__(self): self.v = []; self.f = []; self.m = []; self.c = []; self.uv = []; self.g = []; self.b = []; self.vao = []; self.grp = 0
    def face(self, pts, mat, code=0, uv=None):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.m.append(mat); self.c.append(code); self.uv.append(uv); self.g.append(self.grp)
        self.b.append(K.SEED); self.vao.append(K.VAO)
    def new_group(self): self.grp += 1

class K:
    """the active builder + level of detail flag (module-level state shared by the helpers)"""
    B = None
    FAR = False
    SEED = 0.0          # COLOR_0.b of the faces being added (a per-piece random 0..1; 0 = none)
    VAO = False         # the faces being added take per-vertex AO (no lightmap texels)
K.B = Builder()

def quad(a, b, c, d, mat, code=0, uv=None): K.B.face([a, b, c, d], mat, code, uv)
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
    K.B.face(pts, mat, code, uv)
def face_up(pts, mat, code=0): face_dir(pts, Z, mat, code)

class Frame:
    """Planar wall frame: origin O, outward normal N (horizontal), U = Z x N, V = Z. p(s, v, d): v ABSOLUTE Blender z,
    d = depth along N (out of the wall)."""
    def __init__(self, O, N):
        self.O = Vector((O.x, O.y, 0)); self.N = Vector((N.x, N.y, 0)).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, s, v, d=0.0): return self.O + self.U * s + Z * v + self.N * d
    def s_of(self, u, w): return (P(u, w, OY) - self.O).dot(self.U)

def ccw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))
def inside(p, poly):
    x, y = p; c = False; n = len(poly)
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): c = not c
    return c
CDT_STEP = 0.55        # m: interior points of large fills (walls): no long slivers between far-apart openings
def _seg_dist(p, a, b):
    ax, ay = b[0] - a[0], b[1] - a[1]; L2 = ax * ax + ay * ay
    t = 0.0 if L2 < 1e-12 else max(0.0, min(1.0, ((p[0] - a[0]) * ax + (p[1] - a[1]) * ay) / L2))
    return math.hypot(p[0] - a[0] - ax * t, p[1] - a[1] - ay * t)
def cdt_tris(loops, step=CDT_STEP):
    """constrained Delaunay triangulation of a polygon with holes (loops[0] = outer), with a hex grid of interior points
    when the polygon is large: well-shaped triangles everywhere (no slivers = no lightmap / normal streaks)"""
    xs = [p[0] for p in loops[0]]; ys = [p[1] for p in loops[0]]
    if min(max(xs) - min(xs), max(ys) - min(ys)) < 2.2 * step: return None
    pts = [p for l in loops for p in l]
    segs = [(l[i], l[(i + 1) % len(l)]) for l in loops for i in range(len(l))]
    edges = []; k = 0
    for l in loops:
        n = len(l); edges += [(k + i, k + (i + 1) % n) for i in range(n)]; k += n
    extra = []
    y = min(ys) + step * 0.5; row = 0
    while y < max(ys):
        x = min(xs) + step * (0.5 + 0.5 * (row % 2))
        while x < max(xs):
            q = (x, y)
            if inside(q, loops[0]) and not any(inside(q, h) for h in loops[1:]) and min(_seg_dist(q, a, b) for a, b in segs) > step * 0.45:
                extra.append(q)
            x += step
        y += step * 0.866; row += 1
    allp = pts + extra
    vs, _, fs, _, _, _ = delaunay_2d_cdt([Vector(p) for p in allp], edges, [], 0, 1e-7, False)
    out = []
    for f in fs:
        a, b, c = vs[f[0]], vs[f[1]], vs[f[2]]
        m = ((a.x + b.x + c.x) / 3, (a.y + b.y + c.y) / 3)
        if inside(m, loops[0]) and not any(inside(m, h) for h in loops[1:]): out.append(((a.x, a.y), (b.x, b.y), (c.x, c.y)))
    return out
def fill2d(fr, loops, d, mat, code=0, flip=False):
    """a planar polygon with holes in the wall plane at depth d, facing out (+N) (flip: facing in)"""
    K.B.new_group()
    loops = [ccw(l) for l in loops]
    flat = [p for l in loops for p in l]
    tris = cdt_tris(loops)
    if tris is None:
        tris = [(flat[t[0]], flat[t[1]], flat[t[2]]) for t in tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in loops])]
    for a, b, c in tris:
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(cr) < 1e-9: continue
        if (cr < 0) != flip: b, c = c, b
        K.B.face([fr.p(a[0], a[1], d), fr.p(b[0], b[1], d), fr.p(c[0], c[1], d)], mat, code)
def strip2d(fr, loop, d0, d1, mat, code=0, inward=True):
    """side walls of a loop between depths d0 and d1 (inward: facing the loop's inside, e.g. a reveal)"""
    loop = ccw(loop); n = len(loop)
    cs = sum(p[0] for p in loop) / n; cv = sum(p[1] for p in loop) / n
    for i in range(n):
        a, b = loop[i], loop[(i + 1) % n]
        A0, B0, B1, A1 = fr.p(a[0], a[1], d0), fr.p(b[0], b[1], d0), fr.p(b[0], b[1], d1), fr.p(a[0], a[1], d1)
        # outward = the edge's right-hand normal for a ccw loop
        ex, ey = b[0] - a[0], b[1] - a[1]
        out = fr.U * ey + Z * (-ex)
        if out.length < 1e-9: continue
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
    K.B.new_group()
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
def rod(a, b, r, mat, code=0, segs=6):
    """a round bar between two Blender points"""
    ax = (b - a); L = ax.length
    if L < 1e-5: return
    ref = Vector((1, 0, 0)) if abs(ax.normalized().x) < 0.9 else Vector((0, 1, 0))
    lathe_axis(a, ax, ref, [(r, 0.0), (r, L)], segs, mat, code)

def lathe_axis(center, axis, ref, profile, segs, mat, code=0, cap_top=False, a0=0.0, arc=2 * math.pi, cap_bottom=False):
    """solid of revolution about `axis` through center; profile [(r, t)] (t along the axis); arc-length UVs"""
    axis = axis.normalized(); X = (ref - axis * ref.dot(axis)).normalized(); Y = axis.cross(X)
    ang = [a0 + arc * k / segs for k in range(segs + 1)]
    rings = [[center + (X * math.cos(a) + Y * math.sin(a)) * r + axis * t for a in ang] for r, t in profile]
    sacc = [0.0]
    for i in range(1, len(profile)):
        sacc.append(sacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    K.B.new_group()
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]; rm = max(r0, r1, 0.02)
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
            u0, u1 = rm * arc * k / segs, rm * arc * (k + 1) / segs
            uv = [(u0, sacc[i]), (u1, sacc[i]), (u1, sacc[i + 1]), (u0, sacc[i + 1])]
            if r1 < 1e-6: K.B.face([a, b, d], mat, code, [uv[0], uv[1], uv[3]])
            elif r0 < 1e-6: K.B.face([a, c, d], mat, code, [uv[0], uv[2], uv[3]])
            else: K.B.face([a, b, c, d], mat, code, uv)
    if cap_top and profile[-1][0] > 1e-6: face_dir(rings[-1][:segs], axis, mat, code)
    if cap_bottom and profile[0][0] > 1e-6: face_dir(rings[0][:segs], -axis, mat, code)
def lathe(center, profile, segs, mat, code=0, cap_top=False, a0=0.0):
    lathe_axis(center, Z, Vector((1, 0, 0)), profile, segs, mat, code, cap_top, a0=a0)

def sweep2d(fr, path, profile, mat, code, closed=False, caps=True, d0=0.0):
    """a moulding along a path [(s, v)] IN the wall plane: profile [(d, e)], d = depth out of the wall (+ d0), e = offset
    along the path's in-plane normal (left of the path direction). Miters at joints."""
    K.B.new_group()
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
            A0, A1, B0, B1 = rows[i][k], rows[i][k + 1], rows[j][k], rows[j][k + 1]
            if (A1 - A0).length < 1e-7 and (B1 - B0).length < 1e-7: continue
            quad(A0, B0, B1, A1, mat, code, [(ua, pacc[k]), (ub, pacc[k]), (ub, pacc[k + 1]), (ua, pacc[k + 1])])
    if caps and not closed:
        for i, sgn in ((0, -1), (n - 1, 1)):
            t = T[0] if i == 0 else T[-1]
            face_dir(rows[i], (fr.U * t[0] + Z * t[1]) * sgn, mat, code)

def sweep3d(path, profile, up, mat, code, closed=False, caps=True):
    """a profile [(x, y)] (x across = right of the path, y = along `up`) swept along a 3D path (Blender points)"""
    K.B.new_group()
    n = len(path)
    T = [(path[i + 1] - path[i]).normalized() for i in range(n - 1)]
    rows = []
    for i in range(n):
        t = (T[i - 1] + T[i]).normalized() if 0 < i < n - 1 else (T[0] if i == 0 else T[-1])
        if closed and (i == 0 or i == n - 1): t = (T[-1] + T[0]).normalized()
        r = t.cross(up).normalized(); u2 = r.cross(t).normalized()
        k = 1.0
        if 0 < i < n - 1:
            k = 1.0 / max(0.3, T[i - 1].normalized().dot(t))
        rows.append([path[i] + r * x * k + u2 * y for x, y in profile])
    acc = [0.0]
    for i in range(1, n): acc.append(acc[-1] + (path[i] - path[i - 1]).length)
    pacc = [0.0]
    for k in range(1, len(profile)): pacc.append(pacc[-1] + math.hypot(profile[k][0] - profile[k - 1][0], profile[k][1] - profile[k - 1][1]))
    for i in range(n - 1):
        for k in range(len(profile) - 1):
            A0, A1, B0, B1 = rows[i][k], rows[i][k + 1], rows[i + 1][k], rows[i + 1][k + 1]
            quad(A0, B0, B1, A1, mat, code, [(acc[i], pacc[k]), (acc[i + 1], pacc[k]), (acc[i + 1], pacc[k + 1]), (acc[i], pacc[k + 1])])
    if caps and not closed:
        face_dir(rows[0], -T[0], mat, code); face_dir(rows[-1], T[-1], mat, code)

# ------------------------------------------------------------------------------------------------ 2D shapes (s, v)
def arc_pts(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * k / n), cy + r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]
def circle(cx, cy, r, n=20): return [(cx + r * math.cos(2 * math.pi * k / n), cy + r * math.sin(2 * math.pi * k / n)) for k in range(n)]
def pointed(s0, s1, spring, apex=None, n=8, bottom=None):
    """a pointed (equilateral or set-apex) arch opening: rectangle s0..s1 from `bottom` (or spring) to the spring line,
    then two arcs meeting at the apex. Returns the loop (ccw)."""
    w = s1 - s0
    if apex is None: R = w
    else:
        h = apex - spring; R = (w * w / 4 + h * h) / w if h > 0 else w      # arcs centred on the spring line
    # left arc: centre (s0 + R, spring) from angle pi to the apex; right arc mirrored
    sm = (s0 + s1) / 2
    hgt = math.sqrt(max(R * R - (sm - (s0 + R)) ** 2, 0.0)) if R >= w / 2 else 0
    aL = math.atan2(hgt, sm - (s0 + R))
    left = [((s0 + R) + R * math.cos(math.pi + (aL - math.pi) * k / n), spring + R * math.sin(math.pi + (aL - math.pi) * k / n)) for k in range(n + 1)]
    left = [(x, spring + abs(y - spring)) for x, y in left]
    right = [(s0 + s1 - x, y) for x, y in reversed(left)]
    pts = left + right[1:]
    if bottom is not None: pts = [(s0, bottom)] + pts + [(s1, bottom)]
    return ccw(pts)
def offset_loop(loop, d):
    """offset a ccw loop outward by d (miter)"""
    loop = ccw(loop); n = len(loop); out = []
    for i in range(n):
        a, b, c = loop[i - 1], loop[i], loop[(i + 1) % n]
        t0 = (b[0] - a[0], b[1] - a[1]); l0 = math.hypot(*t0) or 1; t0 = (t0[0] / l0, t0[1] / l0)
        t1 = (c[0] - b[0], c[1] - b[1]); l1 = math.hypot(*t1) or 1; t1 = (t1[0] / l1, t1[1] / l1)
        n0, n1 = (t0[1], -t0[0]), (t1[1], -t1[0])
        m = (n0[0] + n1[0], n0[1] + n1[1]); dd = 1 + n0[0] * n1[0] + n0[1] * n1[1]
        k = d / max(dd, 0.25)
        out.append((b[0] + m[0] * k, b[1] + m[1] * k))
    return out
def foil(cx, cy, r, lobes, rot=math.pi / 2, n=7):
    """a trefoil / quatrefoil opening: the union of `lobes` circles (centres at 0.42 r, radius 0.58 r): sharp cusps
    where neighbouring lobes cross"""
    c, lr = 0.42 * r, 0.58 * r
    hp = math.pi / lobes
    rho = c * math.cos(hp) + math.sqrt(max(lr * lr - (c * math.sin(hp)) ** 2, 0.0))
    pts = []
    for k in range(lobes):
        a = rot + 2 * math.pi * k / lobes
        C = (cx + c * math.cos(a), cy + c * math.sin(a))
        cp = (cx + rho * math.cos(a - hp), cy + rho * math.sin(a - hp)); cn = (cx + rho * math.cos(a + hp), cy + rho * math.sin(a + hp))
        t0 = math.atan2(cp[1] - C[1], cp[0] - C[0]); t1 = math.atan2(cn[1] - C[1], cn[0] - C[0])
        t1 = t0 + (t1 - t0) % (2 * math.pi)
        for j in range(n):
            t = t0 + (t1 - t0) * j / n
            pts.append((C[0] + lr * math.cos(t), C[1] + lr * math.sin(t)))
    return ccw(pts)
def cusped_lancet(s0, s1, spring, apex, bottom, n=16):
    """a lancet light with a cusped (trefoiled) head: two sharp cusps project into the arch"""
    w = s1 - s0; sm = (s0 + s1) / 2
    base = pointed(s0, s1, spring, apex, n=n, bottom=bottom)
    out = []
    tgt = (sm, spring + (apex - spring) * 0.35)
    for (x, y) in base:
        if y > spring + 1e-6:
            t = (y - spring) / (apex - spring)
            pull = 0.3 * w * max(0.0, 1 - abs(t - 0.5) / 0.4) ** 2.6
            dx = tgt[0] - x; dy = tgt[1] - y; L = math.hypot(dx, dy) or 1
            out.append((x + dx / L * pull, y + dy / L * pull))
        else: out.append((x, y))
    return out

def inside(p, poly):
    x, y = p; c = False; n = len(poly)
    for i in range(n):
        (x0, y0), (x1, y1) = poly[i], poly[(i + 1) % n]
        if (y0 > y) != (y1 > y) and x < x0 + (y - y0) * (x1 - x0) / (y1 - y0): c = not c
    return c

def window_lights(s, sill, spring, apex, w, n_lights, foils=()):
    """a pointed window's outline + its lights (cusped lancets + foils fitted in the head), wall-frame (s, Blender z).
    Shared by the exterior (tracery front) and the interior cell (tracery back), so both see the same stone."""
    s0, s1 = s - w / 2, s + w / 2
    outline = pointed(s0, s1, hz(spring), hz(apex), n=10, bottom=hz(sill))
    mull, edge = 0.1, 0.06
    lw = (w - 2 * edge - mull * (n_lights - 1)) / n_lights
    lights = []
    l_spring = hz(spring) - (0.45 if n_lights > 2 else 0.1)          # c00: the lancets' heads at mid-window, big foils above
    l_apex = l_spring + lw * 0.95
    for k in range(n_lights):
        a = s0 + edge + k * (lw + mull)
        lights.append(cusped_lancet(a, a + lw, l_spring, l_apex, hz(sill) + 0.05))
    inner = offset_loop(outline, -0.055)
    for (ds, h, r, lobes) in foils:
        while r > 0.08:
            f = foil(s + ds, hz(h), r, lobes, rot=math.pi / 2 if lobes == 3 else math.pi / 4)
            if all(inside(p, inner) for p in f) and min(p[1] for p in f) > l_apex + 0.02: break
            r *= 0.94
        lights.append(f)
    mullions = [s0 + edge + k * (lw + mull) - mull / 2 for k in range(1, n_lights)]
    return outline, lights, l_spring, mullions

# the windows (shared): (name, u or None, wall, s-centre, sill, spring, apex, width, lights, foils)
WEST_WINDOW = dict(sill=WWIN_SILL, spring=WWIN_SPRING, apex=WWIN_APEX, w=WWIN_W, n=3, foils=[(-0.4, 39.62, 0.36, 3), (0.4, 39.62, 0.36, 3)])
CHOIR_WINDOW = dict(sill=37.4, spring=38.85, apex=39.75, w=1.1, n=2, foils=[(0.0, 39.42, 0.2, 4)])

# ------------------------------------------------------------------------------------------------ mesh + lightmap UV
def make_object(scn, mats, slots, name, bld, v0, v1, ao_px, smart=True, thin_limit=0.06):
    used = sorted(set(bld.m))
    remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f)
    me.update()
    for m in used: me.materials.append(mats[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in bld.m])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cdat = []
    for poly, code, sb in zip(me.polygons, bld.c, bld.b):
        for _ in poly.loop_indices: cdat += [code / 16 + 1 / 32, 1.0, sb, 1.0]
    col.data.foreach_set("color", cdat)
    uv0 = me.uv_layers.new(name="UVMap")
    uvd = [0.0] * (2 * len(me.loops))
    for poly, given in zip(me.polygons, bld.uv):
        if given and len(given) == len(poly.loop_indices) and any(abs(g[1]) > 1e-6 for g in given):
            for li, (u, v) in zip(poly.loop_indices, given): uvd[2 * li] = u; uvd[2 * li + 1] = v
            continue
        n = poly.normal
        if abs(n.z) < 0.2:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:                       # slopes and floors: v up the slope, true metres
            t = Z.cross(n); t = t.normalized() if t.length > 1e-4 else Vector((1, 0, 0)); b = n.cross(t).normalized()
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    va = me.attributes.new("vao", "INT", "FACE"); va.data.foreach_set("value", [1 if x else 0 for x in bld.vao])
    obj = bpy.data.objects.new(name, me)
    scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0008)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0004)
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(32))
    me.validate()
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    thin = [False] * len(me.polygons)
    vflag = [0] * len(me.polygons); me.attributes["vao"].data.foreach_get("value", vflag); me.attributes.remove(me.attributes["vao"])
    for p_ in me.polygons:
        co = [me.vertices[v].co for v in p_.vertices]
        mx = max((co[i] - co[(i + 1) % len(co)]).length for i in range(len(co)))
        # small AND narrow (glazing bars, band tops, louvres): long slivers of a tessellated wall keep their lightmap texels
        thin[p_.index] = bool(vflag[p_.index]) or (0 < mx < 0.9 and p_.area / mx < (thin_limit if len(co) == 4 else thin_limit / 2))
    if not smart:
        me.attributes.remove(me.attributes["grp"])
        return obj, ntri, {slots[m]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == remap[m]) for m in used}, thin
    uv1 = me.uv_layers.new(name="Lightmap")
    if all(thin) or "--audit-only" in sys.argv:   # every face takes per-vertex AO (slates): the lightmap UV parks at AO 1.0
        # (--audit-only: a geometry-only build for the mesh audit, no lightmap UV; never packed)
        uv1.data.foreach_set("uv", [0.997, v0 + 0.5 * (v1 - v0)] * len(me.loops))
        me.uv_layers.active = me.uv_layers["UVMap"]; me.attributes.remove(me.attributes["grp"])
        obj["thin"] = len(thin); obj["px_per_m"] = 0.0
        return obj, ntri, {slots[m]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == remap[m]) for m in used}, thin
    me.uv_layers.active = uv1
    for o in scn.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    t = time.time()
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
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0006, shape_method="CONCAVE", margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    lmd = me.uv_layers["Lightmap"].data
    for p_ in me.polygons:
        for li in p_.loop_indices:
            if thin[p_.index]: lmd[li].uv = (0.997, 0.5)
            else: u = lmd[li].uv; lmd[li].uv = (u.x * 0.994, u.y)
    cov = 0.0
    for poly in me.polygons:
        li = list(poly.loop_indices)
        for j in range(1, len(li) - 1):
            a, b, c_ = lmd[li[0]].uv, lmd[li[j]].uv, lmd[li[j + 1]].uv
            cov += abs((b.x - a.x) * (c_.y - a.y) - (b.y - a.y) * (c_.x - a.x)) / 2
    area = sum(p_.area for p_ in me.polygons if not thin[p_.index])
    dens = math.sqrt(cov * ao_px * ao_px * (v1 - v0) / max(area, 1))
    print(f"  lightmap UV {time.time() - t:.1f}s, {sum(thin)} thin faces (vertex AO), coverage {cov:.3f}, area {area:.0f} m2, {dens:.1f} px/m (mean)")
    uv1 = me.uv_layers["Lightmap"]
    d = [0.0] * (2 * len(me.loops)); uv1.data.foreach_get("uv", d)
    for i in range(1, len(d), 2): d[i] = v0 + d[i] * (v1 - v0)
    uv1.data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]
    me.attributes.remove(me.attributes["grp"])
    obj["thin"] = sum(thin); obj["px_per_m"] = dens
    return obj, ntri, {slots[m]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == remap[m]) for m in used}, thin
