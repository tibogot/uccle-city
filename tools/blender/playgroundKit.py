"""PLAYGROUND KIT: the equipment of a Brussels public playground, first for the Parc de la Sauvagere (Uccle).
Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/playgroundKit.py -- models/parkkit [--no-bake] [--previews]

STYLE (read on the look-only photos of THIS park, Google Maps 2018-2022, docs/heroes/SAUVAGERE_PREP.md): stained
square pine posts with chamfered tops and turned caps, orange-brown HPL side panels, galvanised steel (curved hoop
ladder with red rungs, brackets, chains), dark grey rope nets, green leaf-shaped HDPE roofs, a stainless slide,
spring riders (plywood / HDPE animal on a galvanised coil), A-frame swings of round peeled poles, round-log borders
half buried, green welded-mesh fences, bark-chip / sand / rubber surfaces.

Pieces (one object each, origin = footprint centre on the ground, front = -Y in Blender = +Z... see rockkit notes):
  pg_swing (2 seats, link chains; pg_swing__far = chains as thin rods), pg_slide (tower 1.2 m + ladder + slide),
  pg_climb (tower 1.5 m, hoop ladder with rungs, rope net, climbing wall; pg_climb__far = a coarse net),
  pg_spring (spring rider), pg_sandpit (log border + sand), pg_seesaw, pg_bench, pg_fence (2 m), pg_gate (1 m + posts),
  pg_surface (4 x 4 m safety-surface patch, slot "surface_rubber"; swap to surface_woodchip / sand).
Slots by NAME only (no baked colour): see SLOTS below. UV0 metres along each part's grain; UV1 the AO atlas
(playgroundkit_ao.png). LODs: node tools/park_kit_pack.mjs (meshoptimizer, JS).
"""
import bpy, bmesh, math, os, sys, json, random, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, bm_torus, bm_profile_extrude, M, align_z, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/parkkit")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
rnd = random.Random(7)

WOOD = K.mat("wood_stained", (0.30, 0.17, 0.09), 0.75)
LOG = K.mat("wood_log", (0.42, 0.33, 0.24), 0.85)
GALV = K.mat("steel_galvanised", (0.55, 0.56, 0.57), 0.45, 0.8)
RED = K.mat("steel_painted_red", (0.45, 0.04, 0.03), 0.5)
GREEN = K.mat("steel_painted_green", (0.04, 0.16, 0.08), 0.55)
HPL = K.mat("hpl_panel", (0.50, 0.20, 0.07), 0.45)
HDPE_G = K.mat("hdpe_green", (0.05, 0.30, 0.22), 0.5)
HDPE_R = K.mat("hdpe_red", (0.55, 0.06, 0.05), 0.5)
ROPE = K.mat("rope_grey", (0.10, 0.10, 0.11), 0.9)
RUBBER = K.mat("rubber_black", (0.03, 0.03, 0.03), 0.8)
INOX = K.mat("stainless_steel", (0.7, 0.7, 0.72), 0.25, 1.0)
BENCHW = K.mat("wood_bench", (0.36, 0.22, 0.12), 0.7)
SURF = K.mat("surface_rubber", (0.20, 0.08, 0.06), 0.9)
SAND = K.mat("sand", (0.62, 0.55, 0.42), 0.95)
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)


# ------------------------------------------------------------------------------------------------ part makers
def post(P, x, y, h, s=0.09, cap=True, mat=WOOD, z0=-0.1):
    """a square stained post, bevelled, with a chamfered top and a turned cap"""
    P.add_bm(bm_box(s, s, h - z0, 0.008), mat, Zv, M((x, y, (h + z0) / 2)))
    if cap:
        P.add_bm(bm_cyl(s * 0.42, 0.05, 12, 0.012, 2, r2=s * 0.3), mat, Zv, M((x, y, h)))
        P.add_bm(bm_cyl(s * 0.18, 0.04, 10, 0.015, 2, r2=0.004), mat, Zv, M((x, y, h + 0.05)))


def beam(P, a, b, sy, sz, mat=WOOD, bevel=0.006):
    m, L = align_z(a, b)
    P.add_bm(bm_box(sy, sz, L, bevel), mat, Zv, m @ M((0, 0, L / 2)))


def rod(P, a, b, r, mat, segs=10, cap=True, bevel=0.0):
    m, L = align_z(a, b)
    P.add_bm(bm_cyl(r, L, segs, bevel, 1, cap), mat, Zv, m)


def tube(P, pts, r, mat, segs=10, cap=True):
    P.add_bm(bm_tube_path(pts, r, segs, cap=cap), mat, None)


def bolt(P, c, n, r=0.012, mat=GALV):
    """a round bolt head (dome) on a face with normal n"""
    m, _ = align_z(c, Vector(c) + Vector(n))
    P.add_bm(bm_cyl(r, 0.008, 8, 0.004, 1, r2=r * 0.6), mat, Zv, m)


def bent(a, b, h, n=10, axis="z"):
    """an inverted-U handle polyline from a to b rising by h"""
    a, b = Vector(a), Vector(b)
    pts = []
    for i in range(n + 1):
        t = i / n; ang = math.pi * t
        p = a.lerp(b, (1 - math.cos(ang)) / 2)
        pts.append(p + Vector((0, 0, h * math.sin(ang))))
    return pts


def sweep_profile(path, profile, side=Vector((1, 0, 0)), closed=True):
    """a closed 2D profile (a = along side, b = along 'up' = side x tangent) swept along a 3D path"""
    bm = bmesh.new()
    path = [Vector(p) for p in path]
    rings = []
    for i, p in enumerate(path):
        t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
        s = (side - t * side.dot(t)).normalized()
        u = t.cross(s).normalized()
        rings.append([bm.verts.new(p + s * a + u * b) for a, b in profile])
    n = len(profile)
    for i in range(len(rings) - 1):
        A, B = rings[i], rings[i + 1]
        for k in range(n if closed else n - 1):
            f = bm.faces.new([A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]]); f.smooth = True
    if closed:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def thick_line(mid, t):
    """a closed outline around a 2D polyline, thickness t (for sheet profiles: slides, flat bars)"""
    L, R = [], []
    for i, (a, b) in enumerate(mid):
        pa = Vector(mid[max(i - 1, 0)]); pb = Vector(mid[min(i + 1, len(mid) - 1)])
        d = (pb - pa).normalized(); nrm = Vector((-d.y, d.x))
        L.append(tuple(Vector((a, b)) + nrm * t / 2)); R.append(tuple(Vector((a, b)) - nrm * t / 2))
    return L + list(reversed(R))


def chain(P, top, bottom, pitch=0.075, far=None):
    """a hanging chain of oval links (alternately turned 90 deg) from top to bottom"""
    top, bottom = Vector(top), Vector(bottom)
    n = int((top - bottom).length / pitch)
    for i in range(n):
        c = top.lerp(bottom, (i + 0.5) / n)
        rot = (math.pi / 2, 0, (math.pi / 2) * (i % 2))
        P.add_bm(bm_torus(0.021, 0.0042, 8, 4, 1.65), GALV, Zv, M(c) @ Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    if far is not None:
        far.add_bm(bm_cyl(0.007, (top - bottom).length, 5, 0, 1, False), GALV, Zv, align_z(bottom, top)[0])


def plank_deck(P, x0, x1, y0, y1, z, w=0.12, gap=0.012, th=0.03):
    y = y0
    while y < y1 - 0.02:
        y2 = min(y1, y + w)
        P.add_bm(bm_box(x1 - x0, y2 - y - gap, th, 0.004), WOOD, X, M(((x0 + x1) / 2, (y + y2 - gap) / 2 + gap / 2, z - th / 2)))
        y = y2


def leaf_outline(L, Wd, n=20):
    """a pointed leaf shape (roof board), centred, along X"""
    pts = []
    for i in range(n):
        t = i / (n - 1); x = -L / 2 + L * t
        pts.append((x, Wd / 2 * math.sin(math.pi * t) ** 0.8))
    for i in range(n - 2, 0, -1):
        t = i / (n - 1); x = -L / 2 + L * t
        pts.append((x, -Wd / 2 * math.sin(math.pi * t) ** 0.8))
    return pts


def leaf_roof(P, c, L=1.5, Wd=1.0, tilt=0.35, yaw=0.0):
    out = leaf_outline(L, Wd)
    bm = bm_profile_extrude(out, 0.025, 0.008, 2)        # outline in XZ, thickness along Y
    m = M(c, (0, 0, yaw)) @ Matrix.Rotation(tilt, 4, "X") @ Matrix.Rotation(math.pi / 2, 4, "X")
    P.add_bm(bm, HDPE_G, X, m)
    # the central rib (galvanised) under it
    P.add_bm(bm_box(L * 0.9, 0.03, 0.03, 0.006), GALV, X, m @ M((0, -0.03, 0)) @ Matrix.Rotation(math.pi / 2, 4, "X"))


def hpl_panel(P, c, w, h, yaw, holes=False):
    """an orange-brown HPL board (19 mm) with rounded corners"""
    r = 0.06; pts = []
    for cx, cz, a0 in ((w / 2 - r, h / 2 - r, 0), (-w / 2 + r, h / 2 - r, 90), (-w / 2 + r, -h / 2 + r, 180), (w / 2 - r, -h / 2 + r, 270)):
        for k in range(5):
            a = math.radians(a0 + 90 * k / 4); pts.append((cx + r * math.cos(a), cz + r * math.sin(a)))
    P.add_bm(bm_profile_extrude(pts, 0.019, 0.005, 2), HPL, X, M(c, (0, 0, yaw)))


# ------------------------------------------------------------------------------------------------ pieces
def swing():
    P, F, D = Part("pg_swing"), Part("pg_swing__far"), Part("pg_swing__detail")
    H, half, spread = 2.35, 1.65, 0.85
    for sx in (-1, 1):
        x = sx * half
        for sy in (-1, 1):
            rod(P, (x, sy * spread, -0.15), (x, sy * 0.06, H - 0.02), 0.06, LOG, 14, True, 0.012)
        # galvanised A-head bracket
        P.add_bm(bm_box(0.04, 0.28, 0.22, 0.008), GALV, None, M((x, 0, H - 0.04)))
        for sy in (-1, 1): bolt(P, (x - sx * 0.02 * 0 + 0.021 * sx, sy * 0.08, H - 0.06), (sx, 0, 0))
        rod(P, (x, -spread * 0.55, 0.75), (x, spread * 0.55, 0.75), 0.035, LOG, 10, True, 0.006)      # brace
    rod(P, (-half - 0.12, 0, H + 0.07), (half + 0.12, 0, H + 0.07), 0.07, LOG, 16, True, 0.015)      # top beam
    for x0 in (-0.85, 0.85):
        for dx in (-0.23, 0.23):
            xx = x0 + dx
            P.add_bm(bm_box(0.06, 0.05, 0.05, 0.006), GALV, None, M((xx, 0, H)))                       # swivel hanger
            rod(P, (xx, 0, H - 0.025), (xx, 0, H - 0.08), 0.008, GALV, 8)
            chain(D, (xx, 0, H - 0.08), (xx, 0, 0.5), far=F)
        # flat rubber seat with steel clevises
        seat = bm_box(0.46, 0.17, 0.035, 0.012, 3)
        for v in seat.verts: v.co.z += 0.18 * v.co.x * v.co.x              # slight curve
        P.add_bm(seat, RUBBER, X, M((x0, 0, 0.45)))
        for dx in (-0.23, 0.23):
            P.add_bm(bm_box(0.03, 0.05, 0.06, 0.006), GALV, None, M((x0 + dx, 0, 0.49)))
    return P, F, D


def slide():
    P = Part("pg_slide")
    zp, s = 1.2, 0.5           # platform height, half size
    for x in (-s, s):
        for y in (-s, s):
            post(P, x, y, 2.45 if y > 0 else 1.95)
    plank_deck(P, -s + 0.045, s - 0.045, -s + 0.045, s - 0.045, zp)
    beam(P, (-s, -s, zp - 0.07), (s, -s, zp - 0.07), 0.045, 0.09)
    beam(P, (-s, s, zp - 0.07), (s, s, zp - 0.07), 0.045, 0.09)
    beam(P, (-s, -s, zp - 0.07), (-s, s, zp - 0.07), 0.045, 0.09)
    beam(P, (s, -s, zp - 0.07), (s, s, zp - 0.07), 0.045, 0.09)
    for x in (-s - 0.01, s + 0.01):
        hpl_panel(P, (x, 0, zp + 0.45), 0.86, 0.7, math.pi / 2)
        for z in (zp + 0.2, zp + 0.7):
            bolt(P, (x + (0.012 if x > 0 else -0.012), -0.38, z), (1 if x > 0 else -1, 0, 0)); bolt(P, (x + (0.012 if x > 0 else -0.012), 0.38, z), (1 if x > 0 else -1, 0, 0))
    beam(P, (-s, -s, 1.95), (s, -s, 1.95), 0.045, 0.09)
    leaf_roof(P, (0, 0.05, 2.5), 1.6, 1.05, -0.35)
    # slide (stainless sheet U with lips), path in the YZ plane, exit toward -Y
    path = []
    for i in range(29):
        t = i / 28
        y = -s - 0.02 - 2.7 * t
        z = zp - 0.02 - (zp - 0.33) * (0.5 - 0.5 * math.cos(math.pi * min(1, t / 0.85))) if t < 0.85 else 0.31
        path.append((0, y, z))
    path.append((0, -s - 2.95, 0.30)); path.append((0, -s - 3.15, 0.31))
    mid = [(-0.3, 0.26), (-0.27, 0.25), (-0.26, 0.07), (-0.24, 0.025), (-0.2, 0.0), (0.2, 0.0), (0.24, 0.025), (0.26, 0.07), (0.27, 0.25), (0.3, 0.26)]
    P.add_bm(sweep_profile(path, thick_line(mid, 0.018), side=Vector((1, 0, 0))), INOX, Y)
    for x in (-0.31, 0.31):                                               # rolled lips
        tube(P, [(x, p[1], p[2] + 0.262) for p in path[:-1]], 0.015, INOX, 8)
    for y, z in ((-s - 2.85, 0.3),):                                       # exit support
        for x in (-0.22, 0.22): rod(P, (x, y, -0.1), (x, y, z - 0.01), 0.022, GALV, 10)
        rod(P, (-0.22, y, 0.2), (0.22, y, 0.2), 0.016, GALV, 8)
    hood = bent((-0.32, -s - 0.02, zp + 0.02), (0.32, -s - 0.02, zp + 0.02), 0.62, 14)
    tube(P, hood, 0.019, GALV, 10)
    # ladder at the back
    for x in (-0.24, 0.24):
        beam(P, (x, s + 0.9, -0.1), (x, s + 0.05, zp + 0.05), 0.045, 0.1)
    for i in range(1, 5):
        t = i / 5
        a = Vector((0, s + 0.9, -0.1)).lerp(Vector((0, s + 0.05, zp + 0.05)), t)
        rod(P, (-0.22, a.y, a.z), (0.22, a.y, a.z), 0.02, WOOD, 10, True, 0.004)
    for x in (-0.3, 0.3):
        tube(P, [(x, s + 0.75, 0.75), (x, s + 0.3, zp + 0.55), (x, s - 0.05, zp + 0.75), (x, s - 0.15, zp + 0.55)], 0.017, GALV, 10)
    return P, None, None


def climb():
    P, F, D = Part("pg_climb"), Part("pg_climb__far"), Part("pg_climb__detail")
    zp, s = 1.5, 0.6
    for x in (-s, s):
        for y in (-s, s):
            post(P, x, y, 2.9 if (x > 0) == (y > 0) else 2.4)
    plank_deck(P, -s + 0.045, s - 0.045, -s + 0.045, s - 0.045, zp)
    for a, b in (((-s, -s), (s, -s)), ((-s, s), (s, s)), ((-s, -s), (-s, s)), ((s, -s), (s, s))):
        beam(P, (a[0], a[1], zp - 0.07), (b[0], b[1], zp - 0.07), 0.045, 0.09)
    leaf_roof(P, (0.05, 0.05, 3.0), 1.7, 1.1, 0.3, 0.6)
    # hoop ladder (front, -Y): two galvanised flat-bar arcs, red rungs
    R = 1.25; cy = -s - 0.02
    def hoop(t):        # t 0 = the foot on the ground, out front; 1 = the platform edge
        return cy - R * 0.95 * math.sin(math.pi / 2 * (1 - t)), max(-0.1, (zp + 0.05) - (zp + 0.15) * math.cos(math.pi / 2 * t))
    for x in (-0.36, 0.36):
        pts = [(x, *hoop(i / 24)) for i in range(25)]
        P.add_bm(sweep_profile(pts, [(-0.007, -0.03), (0.007, -0.03), (0.007, 0.03), (-0.007, 0.03)], side=Vector((1, 0, 0))), GALV, Y)
    for i in range(1, 8):
        y, z = hoop(i / 8)
        rod(P, (-0.37, y, z), (0.37, y, z), 0.016, RED, 10, True, 0.004)
    # rope net (right, +X): diamond grid between the two right posts, zp-1.4..zp
    x = s + 0.06
    knots = {}
    N = 5
    for i in range(N + 1):
        for j in range(N + 1):
            knots[(i, j)] = Vector((x + 0.02 * math.sin(i + j), -s + 2 * s * i / N, 0.05 + (zp - 0.05) * j / N))
    for i in range(N + 1):
        for j in range(N + 1):
            for di, dj in ((1, 0), (0, 1)):
                if (i + di, j + dj) in knots:
                    a, b = knots[(i, j)], knots[(i + di, j + dj)]
                    rod(D, a, b, 0.008, ROPE, 6, False)
                    rod(F, a, b, 0.011, ROPE, 4, False)
            bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=1, radius=0.018)
            for f in bm.faces: f.smooth = True
            D.add_bm(bm, ROPE, None, M(knots[(i, j)]))
    # climbing wall (back, +Y): HPL panel with holds
    hpl_panel(P, (0, s + 0.02, zp / 2 + 0.05), 1.1, zp - 0.1, 0.0)
    for k in range(9):
        bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=2, radius=0.045)
        for v in bm.verts: v.co.y *= 0.45; v.co.x *= 1.0 + 0.4 * rnd.random()
        for f in bm.faces: f.smooth = True
        P.add_bm(bm, HDPE_R if k % 2 else HDPE_G, None, M((rnd.uniform(-0.4, 0.4), s + 0.04, 0.25 + 1.1 * k / 8), (0, rnd.uniform(0, 3), 0)))
    return P, F, D


def spring_rider():
    P = Part("pg_spring")
    P.add_bm(bm_box(0.36, 0.36, 0.012, 0.004), GALV, None, M((0, 0, 0.006)))
    pts = []
    turns, hgt, rr = 5.5, 0.42, 0.095
    for i in range(int(turns * 20) + 1):
        a = 2 * math.pi * i / 20
        pts.append((rr * math.cos(a), rr * math.sin(a), 0.03 + hgt * i / (turns * 20)))
    tube(P, pts, 0.017, GALV, 8)
    P.add_bm(bm_box(0.28, 0.2, 0.012, 0.004), GALV, None, M((0, 0, 0.47)))
    # the animal (a stylised horse) in HDPE, 4 cm board, profile in XZ
    horse = [(-0.38, 0.0), (0.18, 0.0), (0.22, 0.12), (0.30, 0.30), (0.36, 0.36), (0.40, 0.33), (0.37, 0.24), (0.30, 0.10), (0.30, -0.02),
             (0.20, -0.08), (-0.30, -0.08), (-0.40, -0.04)]
    P.add_bm(bm_profile_extrude(horse, 0.04, 0.012, 2), HDPE_R, X, M((0, 0, 0.6)))
    seat = [(-0.22, 0.0), (0.10, 0.0), (0.12, 0.03), (-0.24, 0.03)]
    P.add_bm(bm_box(0.34, 0.2, 0.04, 0.012), HDPE_G, X, M((-0.08, 0, 0.62)))
    P.add_bm(bm_box(0.1, 0.14, 0.1, 0.01), GALV, None, M((0, 0, 0.52)))
    rod(P, (0.27, -0.13, 0.86), (0.27, 0.13, 0.86), 0.014, HDPE_G, 10, True, 0.004)      # handles
    rod(P, (0.05, -0.16, 0.5), (0.05, 0.16, 0.5), 0.013, HDPE_G, 10, True, 0.004)        # foot pegs
    return P, None, None


def sandpit():
    P = Part("pg_sandpit")
    a = 1.5
    for k, (ax, z) in enumerate(((0, 0.03), (1, 0.06))):
        for sgn in (-1, 1):
            if ax == 0: rod(P, (-a - 0.12, sgn * a, z), (a + 0.12, sgn * a, z), 0.085, LOG, 14, True, 0.015)
            else: rod(P, (sgn * a, -a - 0.12, z), (sgn * a, a + 0.12, z), 0.085, LOG, 14, True, 0.015)
    bm = bmesh.new()
    n = 18
    vs = {}
    for i in range(n + 1):
        for j in range(n + 1):
            x = -a + 0.07 + (2 * a - 0.14) * i / n; y = -a + 0.07 + (2 * a - 0.14) * j / n
            edge = min(i, j, n - i, n - j) / (n / 2)
            vs[(i, j)] = bm.verts.new((x, y, 0.0 + 0.05 * min(1, edge * 3) + 0.02 * math.sin(3 * x) * math.cos(2.3 * y) * min(1, edge * 3)))
    for i in range(n):
        for j in range(n):
            f = bm.faces.new([vs[(i, j)], vs[(i + 1, j)], vs[(i + 1, j + 1)], vs[(i, j + 1)]]); f.smooth = True
    P.add_bm(bm, SAND, X)
    return P, None, None


def seesaw():
    P = Part("pg_seesaw")
    beam(P, (-0.18, 0, 0.0), (0.18, 0, 0.0), 0.4, 0.35, WOOD)        # pivot block (bottom at -0.17: buried)
    P.add_bm(bm_box(0.2, 0.3, 0.42, 0.01), WOOD, Zv, M((0, 0, 0.21)))
    rod(P, (0, -0.17, 0.5), (0, 0.17, 0.5), 0.03, GALV, 12)
    for sy in (-1, 1): P.add_bm(bm_box(0.12, 0.012, 0.16, 0.004), GALV, None, M((0, sy * 0.155, 0.47)))
    beam(P, (-1.6, 0, 0.58), (1.6, 0, 0.58), 0.12, 0.1, WOOD)
    for sx in (-1, 1):
        x = sx * 1.35
        P.add_bm(bm_box(0.36, 0.3, 0.035, 0.01), WOOD, Y, M((x, 0, 0.645)))
        tube(P, bent((x - sx * 0.25, -0.16, 0.63), (x - sx * 0.25, 0.16, 0.63), 0.3, 10), 0.016, RED, 10)
        P.add_bm(bm_torus(0.24, 0.085, 18, 8), RUBBER, None, M((x, 0, 0.02)) @ Matrix.Rotation(math.pi / 2, 4, "X"))
    return P, None, None


def bench():
    P = Part("pg_bench")
    L = 1.8
    # side frames: one steel profile each (seat support + back support + leg), 12 mm plate x 60 mm, swept
    frame = [(0.0, 0.30, -0.05), (0.0, 0.26, 0.40), (0.0, -0.20, 0.42), (0.0, -0.24, 0.40), (0.0, -0.28, 0.0)]
    back = [(0.0, -0.18, 0.42), (0.0, -0.27, 0.85)]
    for x in (-0.72, 0.72):
        for path in (frame, back):
            pts = [(x, p[1], p[2]) for p in path]
            P.add_bm(sweep_profile(pts, [(-0.006, -0.03), (0.006, -0.03), (0.006, 0.03), (-0.006, 0.03)], side=Vector((1, 0, 0))), GREEN, Y)
        tube(P, [(x + (0.06 if x > 0 else -0.06), 0.24, 0.40), (x + (0.06 if x > 0 else -0.06), 0.22, 0.62), (x + (0.06 if x > 0 else -0.06), -0.1, 0.64), (x + (0.06 if x > 0 else -0.06), -0.2, 0.5)], 0.016, GREEN, 10)
    for k, y in enumerate((0.21, 0.1, -0.01, -0.12)):
        P.add_bm(bm_box(L, 0.095, 0.035, 0.008), BENCHW, X, M((0, y, 0.455)))
    for k, z in enumerate((0.56, 0.68, 0.80)):
        yy = -0.20 - (z - 0.42) / 0.43 * 0.09
        P.add_bm(bm_box(L, 0.095, 0.035, 0.008), BENCHW, X, M((0, yy - 0.03, z), (math.radians(-78), 0, 0)))
    return P, None, None


def mesh_panel(P, x0, x1, z0, z1, y=0.0, mat=GREEN, vstep=0.05, hstep=0.2, far=None, detail=None):
    """double-wire welded mesh: vertical 5 mm wires every vstep, horizontal pairs (6 mm, both faces) every hstep"""
    n = int(round((x1 - x0) / vstep))
    for i in range(n + 1):
        x = x0 + (x1 - x0) * i / n
        rod(detail or P, (x, y, z0), (x, y, z1 + 0.03), 0.0025, mat, 5, False)
    m = int(round((z1 - z0) / hstep))
    for j in range(m + 1):
        z = z0 + (z1 - z0) * j / m
        for dy in (-0.005, 0.005):
            rod(P, (x0, y + dy, z), (x1, y + dy, z), 0.003, mat, 5, False)
    if far is not None:
        far.add_bm(bm_box(x1 - x0, 0.006, z1 - z0, 0.0), mat, X, M(((x0 + x1) / 2, y, (z0 + z1) / 2)))


def fence():
    P, D = Part("pg_fence"), Part("pg_fence__detail")
    for x in (-1.0, 1.0):
        P.add_bm(bm_box(0.06, 0.04, 1.2, 0.004), GREEN, Zv, M((x, 0, 0.5)))
        P.add_bm(bm_box(0.066, 0.046, 0.012, 0.003), GREEN, None, M((x, 0, 1.106)))
    mesh_panel(P, -0.96, 0.96, 0.06, 1.0, 0.03, detail=D)
    for x in (-0.97, 0.97):
        for z in (0.2, 0.85): P.add_bm(bm_box(0.03, 0.03, 0.05, 0.004), GREEN, None, M((x, 0.03, z)))
    return P, None, D


def gate():
    P, D = Part("pg_gate"), Part("pg_gate__detail")
    for x in (-0.58, 0.58):
        P.add_bm(bm_box(0.08, 0.08, 1.3, 0.005), GREEN, Zv, M((x, 0, 0.55)))
        P.add_bm(bm_box(0.088, 0.088, 0.012, 0.003), GREEN, None, M((x, 0, 1.206)))
    x0, x1, z0, z1 = -0.5, 0.5, 0.08, 1.05
    for a, b in (((x0, z0), (x1, z0)), ((x0, z1), (x1, z1)), ((x0, z0), (x0, z1)), ((x1, z0), (x1, z1))):
        beam(P, (a[0], 0.03, a[1]), (b[0], 0.03, b[1]), 0.04, 0.04, GREEN, 0.004)
    mesh_panel(P, x0 + 0.03, x1 - 0.03, z0 + 0.03, z1 - 0.03, 0.03, detail=D)
    for z in (0.2, 0.9):
        rod(P, (-0.535, 0.03, z - 0.05), (-0.535, 0.03, z + 0.05), 0.016, GALV, 10, True, 0.003)
    P.add_bm(bm_box(0.08, 0.06, 0.14, 0.006), GALV, None, M((0.53, 0.03, 0.95)))
    tube(P, bent((0.42, -0.03, 0.88), (0.42, -0.03, 1.0), 0.06, 8), 0.011, GALV, 8)
    return P, None, D


def surface():
    P = Part("pg_surface")
    a, r, th = 2.0, 0.45, 0.04
    pts = []
    for cx, cy, a0 in ((a - r, a - r, 0), (-a + r, a - r, 90), (-a + r, -a + r, 180), (a - r, -a + r, 270)):
        for k in range(7):
            ang = math.radians(a0 + 90 * k / 6); pts.append((cx + r * math.cos(ang), cy + r * math.sin(ang)))
    bm = bmesh.new()
    vs = [bm.verts.new((x, y, th)) for x, y in pts]
    f = bm.faces.new(vs)
    rr = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in rr["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, 0, -th - 0.04), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    top = [e for e in bm.edges if all(v.co.z > th - 1e-4 for v in e.verts)]
    bmesh.ops.bevel(bm, geom=top, offset=0.03, segments=3, profile=0.5, affect="EDGES", clamp_overlap=True)
    bot = [f for f in bm.faces if f.normal.z < -0.9]
    bmesh.ops.delete(bm, geom=bot, context="FACES")
    for f in bm.faces: f.smooth = True
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    P.add_bm(bm, SURF, X)
    return P, None, None


BUILDERS = [swing, slide, climb, spring_rider, sandpit, seesaw, bench, fence, gate, surface]
objs, fars = [], []          # (fars: the __far stand-ins AND the __detail parts: both are extra objects of a piece)
for b in BUILDERS:
    t = time.time()
    P, F, D = b()
    o = P.to_object()
    o["ao_weight"] = 0.15 if o.name in ("pg_surface",) else 1.0
    objs.append(o)
    extra = ""
    for X_, w in ((F, 0.3), (D, 0.6)):
        if X_ is None: continue
        x = X_.to_object(); x["ao_weight"] = w; fars.append(x); extra += f", {x.name} {K.tris(x)}"
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}{extra} {time.time() - t:.1f}s")

allo = objs + fars
layout = K.atlas_layout(allo)
for o in allo: K.lightmap_uv(o, layout[o.name], margin=0.003)
ao_png = os.path.join(OUT, "playgroundkit_ao.png")
if BAKE:
    # far stand-ins bake where their piece stands (same AO look): place them on their piece
    ao_img = K.bake_ao(allo, ao_png, px=2048, samples=64, distance=0.8)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(allo, os.path.join(OUT, "playgroundkit.raw.glb"))
info = {
    "asset": "Park kit: playground equipment (tools/blender/playgroundKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles_raw": K.tris(o),
                        "size_m": [round(o.dimensions.x, 2), round(o.dimensions.y, 2), round(o.dimensions.z, 2)],
                        "atlas": [round(v, 4) for v in layout[o.name]]} for o in allo},
    "extra_objects": {f.name: ("LOD1+ stand-in" if f.name.endswith("__far") else "LOD0 only detail") for f in fars},
    "slots": {m: "" for m in sorted({m.name for o in allo for m in o.data.materials})},
    "attributes": {"TEXCOORD_0": "metres, u along the part's grain (wood grain, tubes' length)", "TEXCOORD_1": "AO atlas playgroundkit_ao.png"},
    "frame": "glTF Y up, origin = footprint centre on the ground, front = -Y (Blender) = +Z (glTF)",
}
json.dump(info, open(os.path.join(OUT, "playgroundkit.json"), "w"), indent=1)

if PREVIEWS:
    for f in fars: f.hide_render = f.name.endswith("__far")
    so, cam = K.preview_setup(ao_img, sun_elev=38, sun_az=320)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    spots = {"pg_swing": (-5, 3), "pg_slide": (0, 3.5), "pg_climb": (4.5, 3), "pg_spring": (-6, -2), "pg_sandpit": (-3, -2.5),
             "pg_seesaw": (1.5, -2.5), "pg_bench": (5, -2.5), "pg_fence": (-2, 7.5), "pg_gate": (0.5, 7.5), "pg_surface": (0, 3.5)}
    for o in objs + fars: o.location = (*spots.get(o.name.split("__")[0], (0, 0)), 0)
    K.render(cam, os.path.join(PV, "playground_overview.jpg"), (-2, -15, 7.5), (0, 2, 0.8), 30, (1800, 1000))
    so.rotation_euler = (math.radians(76), 0, math.radians(285))
    s = next(o for o in objs if o.name == "pg_slide")
    K.render(cam, os.path.join(PV, "playground_grazing_timber.jpg"), (s.location.x + 1.3, s.location.y - 1.9, 1.5), (s.location.x + 0.4, s.location.y, 1.2), 40)
    w = next(o for o in objs if o.name == "pg_swing")
    so.rotation_euler = (math.radians(55), 0, math.radians(330))
    K.render(cam, os.path.join(PV, "playground_swing_chains.jpg"), (w.location.x - 0.3, w.location.y - 2.0, 1.4), (w.location.x - 0.8, w.location.y, 1.4), 45)
print(f"done {time.time() - T0:.0f}s")
