"""STREET FURNITURE KIT 2 (docs/assets/FURNITURE2.md): kit 3 "seating and bikes" and kit 5 "cleanliness" of
docs/assets/STREET_KITS.md. Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/streetFurniture.py -- models/furniture2 [--no-bake] [--previews]

Pieces (one object each; origin = the footprint centre on the ground; the ROAD side = -Y in Blender = +Z in three.js;
legs / posts / feet run below the origin so a piece on a slope keeps its feet in the ground: JOINS rule):
  bench_street    the Uccle street bench (Av. Bourgmestre Jean Herinckx, Commons photo): three wide wooden seat slats,
                  two back slats, two dark steel side frames; 1.8 m, seat 0.46 m, back 0.86 m. The sitter faces -Y
  bench_park      the classic park bench: cast side frames (curved legs, back support, armrests), five narrow seat
                  slats and three back slats; 1.9 m
  bench_backless  five slats on two flat-bar U frames (OSM backrest=no); 1.8 m
  hoop            the Brussels "arceau": an inverted U of 48 mm tube, 0.80 m high, 0.70 m between the legs (dark grey,
                  as on Street View, Rue Stalle / Ch. de Saint-Job corner, April 2024); its plane = Blender XZ
  bikebox         the parking.brussels covered bike box ("box vélo", OSM bicycle_parking=shed, capacity 5): a ribbed
                  dark barrel shell between two light grey end panels perforated with a bicycle drawing, the door on
                  +Y; 1.98 m along X (the kerb), 2.1 m deep, 1.35 m high
  bin_round       the Bruxelles-Propreté classic round bin (Square des Héros, Uccle, Commons photo): dark green
                  pebbled drum on a ribbed foot, a fluted dome lid with the round mouth on top, the bag band
  bin_column      the slim dark-green column bin at the STIB stops (Dieweg, Uccle, Commons photo): fluted front, the
                  open mouth under a sloping hood, on its own post
  glassbank       the Bruxelles-Propreté glass bank (Tenreuken, Auderghem, Commons photo): three bays (the middle one
                  taller with the lifting hook) on a galvanised skid, a round mouth per bay with its ring. ONE mesh for
                  both kinds: white glass (all white, black rings) and coloured glass (grey bays, a blue-green middle
                  bay, orange / green rings) are per-instance palettes in the viewer (iVar.x)
Slots by NAME only (no baked colour): viewer/furniture2/furnitureKit.js SLOTS. UV0: metres along the part's grain
(the wood grain of the slats), UV1: the AO atlas (furniture2_ao.png). LODs: in the viewer (meshoptimizer at load).
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/furniture2")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
ONLY = None
for a in ARGS:
    if a.startswith("--only="): ONLY = a[7:].split(",")
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)
SINK = 0.3

# named slots (preview colours only)
WOOD = K.mat("wood_slat", (0.30, 0.17, 0.09), 0.62, 0.0)
FRAME = K.mat("frame_dark", (0.03, 0.033, 0.035), 0.45, 0.55)          # powder-coated steel, anthracite
CAST = K.mat("cast_green", (0.025, 0.045, 0.03), 0.5, 0.35)           # painted cast iron, very dark green
HOOP = K.mat("hoop_grey", (0.12, 0.125, 0.13), 0.4, 0.6)              # the arceaux: dark grey coated steel
GALV = K.mat("galvanised", (0.45, 0.46, 0.46), 0.5, 0.85)
ALU = K.mat("alu_panel", (0.55, 0.56, 0.57), 0.42, 0.6)
SHELL = K.mat("box_shell", (0.11, 0.105, 0.1), 0.5, 0.3)
DARK = K.mat("rubber_black", (0.02, 0.02, 0.02), 0.75, 0.0)
WHITE = K.mat("white_plate", (0.8, 0.8, 0.78), 0.35, 0.0)
GREEN = K.mat("bin_green", (0.018, 0.05, 0.03), 0.45, 0.15)
BAND = K.mat("bin_band", (0.22, 0.05, 0.035), 0.55, 0.0)
HULL = K.mat("bank_hull", (0.78, 0.78, 0.75), 0.55, 0.0)              # per-instance palette in the viewer
BAY = K.mat("bank_bay", (0.78, 0.78, 0.75), 0.55, 0.0)
RING = K.mat("bank_ring", (0.03, 0.03, 0.03), 0.5, 0.0)
RING_MID = K.mat("bank_ring_mid", (0.03, 0.03, 0.03), 0.5, 0.0)


# ------------------------------------------------------------------------------------------------ helpers
def box(P, mat, c, s, bevel=0.004, grain=Zv, segs=2, rot=None):
    m = M(c, rot or (0, 0, 0))
    P.add_bm(bm_box(*s, bevel, segs), mat, grain, m)


def span(P, mat, x0, x1, y0, y1, z0, z1, bevel=0.004, grain=None, segs=2):
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    if grain is None: grain = X if sx >= max(sy, sz) else (Y if sy >= sz else Zv)
    box(P, mat, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (sx, sy, sz), bevel, grain, segs)


def fillet(pts, r, steps=6):
    """a 2D polyline with its inner corners rounded (radius r, `steps` segments per corner)"""
    if len(pts) < 3 or r <= 0: return [tuple(p) for p in pts]
    out = [tuple(pts[0])]
    for i in range(1, len(pts) - 1):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[i + 1])
        a, b = (p0 - p1).normalized(), (p2 - p1).normalized()
        ang = math.acos(max(-1, min(1, a.dot(b))))
        if ang > math.radians(175): out.append(tuple(p1)); continue
        t = r / math.tan(ang / 2)
        t = min(t, (p0 - p1).length * 0.49, (p2 - p1).length * 0.49)
        rr = t * math.tan(ang / 2)
        s, e = p1 + a * t, p1 + b * t
        bis = (a + b).normalized()
        c = p1 + bis * (rr / math.sin(ang / 2))
        a0 = math.atan2(s.y - c.y, s.x - c.x); a1 = math.atan2(e.y - c.y, e.x - c.x)
        da = (a1 - a0 + math.pi) % (2 * math.pi) - math.pi
        for k in range(steps + 1):
            q = a0 + da * k / steps
            out.append((c.x + rr * math.cos(q), c.y + rr * math.sin(q)))
    out.append(tuple(pts[-1]))
    return out


def smooth_path(ctrl, n=24):
    """a Catmull-Rom curve through 2D control points (n samples)"""
    P = [Vector(p) for p in ctrl]
    P = [P[0] * 2 - P[1]] + P + [P[-1] * 2 - P[-2]]
    out = []
    segs = len(ctrl) - 1
    for i in range(segs):
        p0, p1, p2, p3 = P[i], P[i + 1], P[i + 2], P[i + 3]
        m = max(2, round(n / segs))
        for k in range(m if i < segs - 1 else m + 1):
            t = k / m
            q = 0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3)
            out.append((q.x, q.y))
    return out


def rrect(w, t, r, n=2):
    """rounded-rectangle section (w along u, t along v), CCW"""
    pts = []
    r = min(r, w / 2 - 1e-4, t / 2 - 1e-4)
    for cx, cy, a0 in ((w / 2 - r, t / 2 - r, 0), (-w / 2 + r, t / 2 - r, 90), (-w / 2 + r, -t / 2 + r, 180), (w / 2 - r, -t / 2 + r, 270)):
        for k in range(n + 1):
            a = math.radians(a0 + 90 * k / n)
            pts.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return pts


def sweep_yz(path, w, t, r=0.006, x=0.0, cap=True):
    """a bar with a rounded-rectangle section (w in the YZ plane across the path, t along X) swept along a 2D path in
    the YZ plane at x; mitred joints (the section scaled by 1 / cos(half angle) across)"""
    bm = bmesh.new()
    sec = rrect(w, t, r)
    P = [Vector((0.0, p[0], p[1])) for p in path]
    n = len(P)
    rings = []
    for i in range(n):
        if i == 0: tg = (P[1] - P[0]).normalized(); sc = 1.0
        elif i == n - 1: tg = (P[-1] - P[-2]).normalized(); sc = 1.0
        else:
            t0, t1 = (P[i] - P[i - 1]).normalized(), (P[i + 1] - P[i]).normalized()
            tg = (t0 + t1).normalized(); sc = 1.0 / max(0.5, t0.dot(tg))
        nrm = Vector((0, -tg.z, tg.y))                       # in-plane normal
        ring = [bm.verts.new((x + v, P[i].y + nrm.y * u * sc, P[i].z + nrm.z * u * sc)) for u, v in sec]
        rings.append(ring)
    m = len(sec)
    for i in range(n - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(m):
            f = bm.faces.new([a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]]); f.smooth = True
    if cap:
        for ring, rev in ((rings[0], True), (rings[-1], False)):
            f = bm.faces.new(list(reversed(ring)) if rev else ring); f.smooth = False
            bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def lathe(profile, segs=48, phase=0.0, radial=None):
    """revolve a (r, z) profile round +Z; radial(r, z, theta, row) -> r (pebbles, flutes); r = 0 ends close as a fan
    ring (pole caps get their own centre vertex)"""
    bm = bmesh.new()
    rings = []
    for j, (r, z) in enumerate(profile):
        if r < 1e-6:
            rings.append([bm.verts.new((0, 0, z))]); continue
        ring = []
        for k in range(segs):
            a = phase + 2 * math.pi * k / segs
            rr = radial(r, z, a, j) if radial else r
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        rings.append(ring)
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1:
            for k in range(segs): bm.faces.new([a[0], b[k], b[(k + 1) % segs]])
        elif len(b) == 1:
            for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[0]])
        else:
            for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]])
    for f in bm.faces: f.smooth = True
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def prism(outline, z0, z1, x_axis=False):
    """a closed prism of a convex-ish 2D outline (x, y) from z0 to z1, caps triangulated BEAUTY"""
    bm = bmesh.new()
    lo = [bm.verts.new((x, y, z0)) for x, y in outline]
    hi = [bm.verts.new((x, y, z1)) for x, y in outline]
    n = len(outline)
    for k in range(n):
        f = bm.faces.new([lo[k], lo[(k + 1) % n], hi[(k + 1) % n], hi[k]]); f.smooth = True
    caps = [bm.faces.new(list(reversed(lo))), bm.faces.new(hi)]
    for f in caps: f.smooth = False
    bmesh.ops.triangulate(bm, faces=caps, quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def annulus(r0, r1, depth, segs=32):
    """a ring prism along +Z from 0 to depth (inner radius r0, outer r1)"""
    bm = bmesh.new()
    rings = [[bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)]
             for r, z in ((r1, 0), (r1, depth), (r0, depth), (r0, 0))]
    for j in range(4):
        a, b = rings[j], rings[(j + 1) % 4]
        for k in range(segs):
            f = bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]]); f.smooth = j in (0, 2)
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def disc(r, segs=24):
    bm = bmesh.new()
    vs = [bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), 0)) for k in range(segs)]
    f = bm.faces.new(vs); f.smooth = False
    bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="BEAUTY")
    return bm


def finish(P, name):
    return P.to_object(smooth_angle=20)


def slat(P, x0, x1, yc, zc, w, t, ang=0.0, bevel=0.006):
    """a wooden slat along X: width w (across, in the YZ plane, tilted by ang about X), thickness t; rounded ends"""
    box(P, WOOD, ((x0 + x1) / 2, yc, zc), (x1 - x0, w, t), bevel, X, 2, (ang, 0, 0))


def bolts(P, xs, yc, zc, ang=0.0, n=(0, 0, 1)):
    """carriage-bolt domes on a slat's face (n = the face normal before the tilt)"""
    for x in xs:
        nv = Matrix.Rotation(ang, 3, "X") @ Vector(n)
        q = Vector((0, 0, 1)).rotation_difference(nv)
        c = Vector((x, yc, zc))
        P.add_bm(bm_cyl(0.009, 0.004, 12, 0.0), GALV, Zv, Matrix.Translation(c) @ q.to_matrix().to_4x4())


# ------------------------------------------------------------------------------------------------ benches
def bench_street():
    """three wide seat slats, two back slats on two dark steel side frames (the Herinckx bench)"""
    P = Part("bench_street")
    L = 1.8
    back0, back1 = Vector((0.17, -SINK)), Vector((0.285, 0.86))              # the back leg's line (y, z)
    bdir = (back1 - back0).normalized()
    for x in (-0.72, 0.72):
        P.add_bm(sweep_yz([(-0.19, -SINK), (-0.19, 0.405)], 0.05, 0.04, 0.006, x), FRAME, Zv)          # front leg
        P.add_bm(sweep_yz([tuple(back0), tuple(back1)], 0.05, 0.04, 0.006, x), FRAME, Zv)                # back leg
        P.add_bm(sweep_yz([(-0.205, 0.40), (0.235, 0.40)], 0.035, 0.05, 0.005, x), FRAME, Y)             # seat bearer
        P.add_bm(sweep_yz([(-0.19, 0.12), (0.19, 0.12)], 0.03, 0.03, 0.004, x), FRAME, Y)                # low stretcher
        box(P, FRAME, (x, -0.19, 0.004), (0.11, 0.11, 0.008), 0.002, Zv)                                  # foot plates
        box(P, FRAME, (x, back0.x + (0.0 - back0.y) / bdir.y * bdir.x, 0.004), (0.11, 0.11, 0.008), 0.002, Zv)
    for k, yc in enumerate((-0.165, -0.03, 0.105)):
        slat(P, -L / 2, L / 2, yc, 0.4175 + 0.02 + 0.0015, 0.12, 0.04, 0.0, 0.006)
        bolts(P, (-0.72, 0.72), yc, 0.4615)
    for z in (0.62, 0.775):
        yb = back0.x + (z - back0.y) / bdir.y * bdir.x                       # the back leg's centre at z
        yc = yb - 0.025 - 0.0175 - 0.0015
        box(P, WOOD, (0, yc, z), (L, 0.035, 0.11), 0.006, X, 2, (-math.atan2(bdir.x, bdir.y), 0, 0))
        nv = Matrix.Rotation(-math.atan2(bdir.x, bdir.y), 3, "X") @ Vector((0, -1, 0))
        for x in (-0.72, 0.72):
            c = Vector((x, yc, z)) + nv * 0.0175
            P.add_bm(bm_cyl(0.009, 0.004, 12, 0.0), GALV, Zv, Matrix.Translation(c) @ Vector((0, 0, 1)).rotation_difference(nv).to_matrix().to_4x4())
    return finish(P, "bench_street")


def bench_park():
    """the classic park bench: curved cast side frames with armrests, five seat slats, three back slats"""
    P = Part("bench_park")
    L = 1.9
    front = smooth_path([(-0.235, -SINK), (-0.235, 0.0), (-0.215, 0.22), (-0.212, 0.42), (-0.222, 0.632)], 20)
    back = smooth_path([(0.25, -SINK), (0.24, 0.0), (0.205, 0.22), (0.195, 0.40), (0.235, 0.60), (0.295, 0.78), (0.322, 0.885)], 28)
    arm = smooth_path([(0.24, 0.625), (0.05, 0.648), (-0.17, 0.655), (-0.255, 0.645), (-0.282, 0.615)], 18)
    for x in (-0.8, 0.8):
        P.add_bm(sweep_yz(front, 0.055, 0.035, 0.008, x), CAST, Zv)
        P.add_bm(sweep_yz(back, 0.055, 0.035, 0.008, x), CAST, Zv)
        P.add_bm(sweep_yz([(-0.265, 0.398), (0.21, 0.398)], 0.045, 0.04, 0.008, x), CAST, Y)               # seat bearer
        P.add_bm(sweep_yz(arm, 0.045, 0.05, 0.012, x), CAST, Y)                                           # armrest
        P.add_bm(sweep_yz(smooth_path([(-0.225, 0.10), (0.0, 0.135), (0.225, 0.10)], 10), 0.035, 0.028, 0.006, x), CAST, Y)
    span(P, CAST, -0.8, 0.8, -0.012, 0.012, 0.118, 0.142, 0.006, X)                                     # long stretcher
    for k in range(5):
        yc = -0.232 + k * 0.083
        slat(P, -L / 2, L / 2, yc, 0.4205 + 0.0175 + 0.0015, 0.07, 0.035, 0.0, 0.006)
        bolts(P, (-0.8, 0.8), yc, 0.4575)
    # back slats: in front of the back support's straight upper part
    a, b = Vector((0.235, 0.60)), Vector((0.31, 0.84))
    d = (b - a).normalized()
    ang = -math.atan2(d.x, d.y)
    nrm = Vector((-d.y, d.x))                                                 # toward -y (the sitter)
    if nrm.x > 0: nrm = -nrm
    for s in (0.04, 0.135, 0.23):
        c = a + d * s + nrm * (0.0275 + 0.0175 + 0.0015)
        box(P, WOOD, (0, c.x, c.y), (L, 0.035, 0.08), 0.006, X, 2, (ang, 0, 0))
        nv = Vector((0, nrm.x, nrm.y))
        for x in (-0.8, 0.8):
            q = Vector((x, c.x, c.y)) + nv * 0.0175
            P.add_bm(bm_cyl(0.009, 0.004, 12, 0.0), GALV, Zv, Matrix.Translation(q) @ Vector((0, 0, 1)).rotation_difference(nv).to_matrix().to_4x4())
    return finish(P, "bench_park")


def bench_backless():
    P = Part("bench_backless")
    L = 1.8
    for x in (-0.7, 0.7):
        P.add_bm(sweep_yz(fillet([(-0.19, -SINK), (-0.19, 0.405), (0.19, 0.405), (0.19, -SINK)], 0.05, 6), 0.06, 0.014, 0.004, x), FRAME, Zv)
        for y in (-0.19, 0.19): box(P, FRAME, (x, y, 0.004), (0.09, 0.09, 0.008), 0.002, Zv)
    for k in range(5):
        yc = -0.174 + k * 0.087
        slat(P, -L / 2, L / 2, yc, 0.435 + 0.0175 + 0.0015, 0.075, 0.035, 0.0, 0.006)
        bolts(P, (-0.7, 0.7), yc, 0.4715)
    return finish(P, "bench_backless")


# ------------------------------------------------------------------------------------------------ bike hoop
def hoop():
    P = Part("hoop")
    w, h, r = 0.70, 0.80, 0.17
    pts = [Vector((-w / 2, 0, -SINK)), Vector((-w / 2, 0, 0.0)), Vector((-w / 2, 0, h - r))]
    for k in range(1, 9):
        a = math.pi - math.pi / 2 * k / 9
        pts.append(Vector((-w / 2 + r + r * math.cos(a), 0, h - r + r * math.sin(a))))
    pts += [Vector((-w / 2 + r, 0, h)), Vector((0, 0, h)), Vector((w / 2 - r, 0, h))]
    for k in range(1, 9):
        a = math.pi / 2 - math.pi / 2 * k / 9
        pts.append(Vector((w / 2 - r + r * math.cos(a), 0, h - r + r * math.sin(a))))
    pts += [Vector((w / 2, 0, h - r)), Vector((w / 2, 0, 0.0)), Vector((w / 2, 0, -SINK))]
    P.add_bm(bm_tube_path(pts, 0.024, 20), HOOP, Zv)
    for x in (-w / 2, w / 2):                                                  # ground collars (paving cut-outs)
        P.add_bm(annulus(0.026, 0.046, 0.012, 24), HOOP, Zv, M((x, 0, -0.004)))
    return finish(P, "hoop")


# ------------------------------------------------------------------------------------------------ bike box
def bikebox():
    P = Part("bikebox")
    LX, W, H, R, Z0 = 0.97, 1.05, 1.35, 0.36, 0.09        # half length, half depth, height, roof corner radius, shell base
    # the outline (y, z) of the shell's cross-section: vertical sides, rounded top corners, flat-ish crown
    def outline(off=0.0, ribs=True, n=14):
        half = [(W + off, Z0), (W + off, H - R)]
        for k in range(1, n + 1):
            a = math.radians(90 * k / n)
            half.append((W - R + (R + off) * math.cos(a), H - R + (R + off) * math.sin(a)))
        m = int((W - R) / 0.06)
        for k in range(1, m):
            half.append((W - R - (W - R) * k / m, H + off))
        pts = half + [(-y, z) for y, z in reversed(half)] + []
        pts = pts[:len(half)] + [(0.0, H + off)] + pts[len(half):]
        if not ribs: return pts
        out = []
        for i, (y, z) in enumerate(pts):                                      # corrugation: ribs along X over the roof
            if z >= H - R + 0.05:
                if abs(y) > W - R: nrm = (Vector((y, z)) - Vector((math.copysign(W - R, y), H - R))).normalized()
                else: nrm = Vector((0, 1))
                rib = 0.007 * (1 if i % 2 else -1)
                out.append((y + nrm.x * rib, z + nrm.y * rib))
            else:
                out.append((y, z))
        return out
    # shell: outer surface swept along X (open ends: the end panels close them), inner surface (dark) 25 mm in
    def shell(pts, mat, flip):
        bm = bmesh.new()
        a = [bm.verts.new((-LX, y, z)) for y, z in pts]
        b = [bm.verts.new((LX, y, z)) for y, z in pts]
        for k in range(len(pts) - 1):
            f = bm.faces.new([a[k], a[k + 1], b[k + 1], b[k]] if not flip else [a[k], b[k], b[k + 1], a[k + 1]]); f.smooth = False
        return bm
    outer = outline(0.0, True)
    P.add_bm(shell(outer, SHELL, False), SHELL, X)
    inner = [(y * (W - 0.025) / W, Z0 + (z - Z0) * (H - 0.025 - Z0) / (H - Z0)) for y, z in outline(0.0, False)]
    P.add_bm(shell(inner, DARK, True), DARK, X)
    # the bottom edge of the shell: a closing strip outer -> inner on each side
    for s in (1, -1):
        bm = bmesh.new()
        yo, yi = s * W, s * (W - 0.025)
        vs = [bm.verts.new(p) for p in ((-LX, yo, Z0), (LX, yo, Z0), (LX, yi, Z0), (-LX, yi, Z0))]
        f = bm.faces.new(vs); f.smooth = False
        bm.normal_update()
        if f.normal.z > 0: f.normal_flip()
        P.add_bm(bm, SHELL, X)
    # end panels: light grey plates a little proud of the shell outline, rounded edge
    panel = outline(0.012, False, 10)
    for s in (1, -1):
        bm = prism([(p[0], p[1]) for p in panel], 0, 0.018)
        bm.transform(Matrix.Translation((LX if s > 0 else -LX - 0.018, 0, 0)) @ Matrix(((0, 0, 1, 0), (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 0, 1))))
        P.add_bm(bm, ALU, Zv)
    # the perforated bicycle (dots 1.5 mm proud of each end panel's face), + a scatter of loose dots
    rnd = random.Random(7)
    dots = []
    def line(a, b, step=0.042):
        n = max(1, int((Vector(b) - Vector(a)).length / step))
        for k in range(n + 1): dots.append((a[0] + (b[0] - a[0]) * k / n, a[1] + (b[1] - a[1]) * k / n))
    def circ(c, r, step=0.042):
        n = int(2 * math.pi * r / step)
        for k in range(n): dots.append((c[0] + r * math.cos(2 * math.pi * k / n), c[1] + r * math.sin(2 * math.pi * k / n)))
    wr, zc = 0.27, 0.44
    circ((-0.5, zc), wr); circ((0.5, zc), wr); circ((-0.5, zc), 0.05, 0.035); circ((0.5, zc), 0.05, 0.035)
    crank = (-0.06, zc); seat = (-0.17, zc + 0.42); head = (0.33, zc + 0.40)
    line((-0.5, zc), crank); line(crank, seat); line((-0.5, zc), seat); line(seat, head); line(crank, head); line(head, (0.5, zc))
    line(seat, (-0.13, zc + 0.47)); line((-0.25, zc + 0.47), (-0.06, zc + 0.47)); line(head, (0.30, zc + 0.52)); line((0.22, zc + 0.52), (0.40, zc + 0.52))
    circ(crank, 0.07, 0.035)
    for _ in range(70):
        y, z = rnd.uniform(-0.95, 0.95), rnd.uniform(Z0 + 0.08, H - 0.12)
        if abs(y) > W - R and z > H - R and math.hypot(abs(y) - (W - R), z - (H - R)) > R - 0.08: continue
        if all(math.hypot(y - a, z - b) > 0.06 for a, b in dots): dots.append((y, z))
    for s in (1, -1):
        bm = bmesh.new()
        xf = s * (LX + 0.018 + 0.0032)
        kept = []
        for (y, z) in dots:
            if any((y - a) ** 2 + (z - b) ** 2 < 0.027 ** 2 for a, b in kept): continue
            kept.append((y, z))
        for (y, z) in kept:
            vs = [bm.verts.new((xf, y + 0.012 * math.cos(2 * math.pi * k / 6) * s, z + 0.012 * math.sin(2 * math.pi * k / 6))) for k in range(6)]
            f = bm.faces.new(vs); f.smooth = False
        bm.normal_update()
        for f in bm.faces:
            if f.normal.x * s < 0: f.normal_flip()
        bmesh.ops.triangulate(bm, faces=list(bm.faces), quad_method="BEAUTY", ngon_method="BEAUTY")
        P.add_bm(bm, DARK, Zv)
    # the door on +Y (the walkway side): a panel 12 mm proud over the shell's lower part, a handle, a lock, a plate
    span(P, SHELL, -0.86, 0.86, W, W + 0.012, Z0 + 0.06, 0.92, 0.004, X)
    span(P, DARK, -0.86, 0.86, W - 0.001, W + 0.006, 0.925, 0.935, 0.0, X)
    span(P, GALV, -0.25, 0.25, W + 0.012, W + 0.042, 0.80, 0.83, 0.008, X)                               # handle bar
    for x in (-0.22, 0.22): span(P, GALV, x - 0.015, x + 0.015, W + 0.011, W + 0.036, 0.78, 0.818, 0.004, Zv)
    span(P, DARK, 0.48, 0.56, W + 0.011, W + 0.02, 0.72, 0.84, 0.003, Zv)                                # lock / badge reader
    span(P, WHITE, -0.62, -0.34, W + 0.011, W + 0.016, 0.62, 0.74, 0.002, X)                             # the user plate (blank)
    # base: a galvanised channel frame and four levelling feet into the ground
    span(P, GALV, -LX - 0.01, LX + 0.01, -W - 0.01, W + 0.01, 0.04, Z0 - 0.002, 0.006, X)
    for x in (-0.85, 0.85):
        for y in (-0.92, 0.92):
            P.add_bm(bm_cyl(0.035, 0.04 + SINK, 16, 0.006), GALV, Zv, M((x, y, -SINK)))
    return finish(P, "bikebox")


# ------------------------------------------------------------------------------------------------ bins
def bin_round():
    """the classic round bin: ribbed foot, pebbled drum, the bag band, fluted dome lid with the round mouth"""
    P = Part("bin_round")
    S = 48
    foot = [(0.0, -SINK), (0.17, -SINK), (0.17, 0.0), (0.215, 0.0), (0.232, 0.012), (0.232, 0.03), (0.218, 0.04), (0.228, 0.05),
            (0.228, 0.068), (0.214, 0.078), (0.205, 0.09), (0.222, 0.105), (0.232, 0.118)]
    P.add_bm(lathe(foot, S), GREEN, Zv)
    rows = [0.118 + k * (0.70 - 0.118) / 14 for k in range(15)]
    def peb(r, z, a, j):                                                      # a diamond pebble: alternate rows / columns
        k = round((a % (2 * math.pi)) / (2 * math.pi) * S)
        return r + (0.004 if (k + j) % 2 == 0 and 0 < j < 14 else 0.0)
    P.add_bm(lathe([(0.232, z) for z in rows], S, 0.0, peb), GREEN, Zv)
    P.add_bm(lathe([(0.232, 0.70), (0.236, 0.704), (0.236, 0.76), (0.232, 0.764)], S), GREEN, Zv)        # rim under the band
    P.add_bm(lathe([(0.2405, 0.69), (0.2405, 0.752)], S), BAND, Zv)                                       # the bag band (a tube)
    P.add_bm(lathe([(0.2405, 0.752), (0.236, 0.756)], S), BAND, Zv)
    P.add_bm(lathe([(0.236, 0.686), (0.2405, 0.69)], S), BAND, Zv)
    lid = [(0.232, 0.764), (0.242, 0.772), (0.243, 0.80), (0.233, 0.85), (0.205, 0.90), (0.16, 0.94), (0.118, 0.962)]
    flute = lambda r, z, a, j: r * (1 + (0.035 * math.cos(16 * a) if 0 < j < len(lid) - 1 else 0))
    P.add_bm(lathe(lid, S, 0.0, flute), GREEN, Zv)
    P.add_bm(lathe([(0.118, 0.962), (0.115, 0.985), (0.105, 0.995), (0.092, 0.995), (0.086, 0.985), (0.086, 0.93)], S), GREEN, Zv)   # mouth rim
    P.add_bm(lathe([(0.086, 0.93), (0.0, 0.93)], S), DARK, Zv)                                                # the dark throat
    return finish(P, "bin_round")


def bin_column():
    """the slim column bin on its post: fluted front, the open mouth under the sloping hood"""
    P = Part("bin_column")
    w, d, z0, z1 = 0.34, 0.27, 0.06, 0.86
    yc = -0.05                                                                 # body centre (the post is behind it, +Y)
    # body: rounded-rectangle outline (front corners round 9 cm, back corners 2 cm)
    out = []
    for cx, cy, a0, r in ((w / 2 - 0.09, yc - d / 2 + 0.09, 270, 0.09), (w / 2 - 0.02, yc + d / 2 - 0.02, 0, 0.02),
                          (-w / 2 + 0.02, yc + d / 2 - 0.02, 90, 0.02), (-w / 2 + 0.09, yc - d / 2 + 0.09, 180, 0.09)):
        for k in range(7):
            a = math.radians(a0 + 90 * k / 6)
            out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    P.add_bm(prism(out, z0, z1 - 0.20), GREEN, Zv)
    # the mouth zone: the body continues as a thin shell (back + sides) with the dark opening in front
    span(P, GREEN, -w / 2, w / 2, yc + d / 2 - 0.03, yc + d / 2, z1 - 0.20 - 0.001, z1, 0.004, Zv)
    for s in (1, -1):
        span(P, GREEN, s * w / 2 - (0.025 if s > 0 else 0), s * w / 2 + (0 if s > 0 else 0.025), yc - d / 2 + 0.07, yc + d / 2 - 0.029, z1 - 0.20 - 0.001, z1, 0.004, Zv)
    span(P, DARK, -w / 2 + 0.025, w / 2 - 0.025, yc - d / 2 + 0.07, yc + d / 2 - 0.03, z1 - 0.202, z1 - 0.19, 0.0, X)   # the liner top
    span(P, DARK, -w / 2 + 0.03, w / 2 - 0.03, yc - d / 2 + 0.072, yc - d / 2 + 0.078, z1 - 0.19, z1 - 0.02, 0.0, X)    # the bag inside
    span(P, GREEN, -w / 2 + 0.01, w / 2 - 0.01, yc - d / 2 + 0.06, yc - d / 2 + 0.085, z1 - 0.205, z1 - 0.185, 0.004, X)  # the mouth sill
    # flutes on the front (vertical ribs 6 mm proud), and a foot plinth
    for k in range(7):
        x = -0.105 + k * 0.035
        span(P, GREEN, x - 0.008, x + 0.008, yc - d / 2 - 0.006, yc - d / 2 + 0.004, z0 + 0.05, z1 - 0.24, 0.003, Zv)
    P.add_bm(prism([(x * 1.04, yc + (y - yc) * 1.06) for x, y in out], 0.0, z0), GREEN, Zv)
    # the hood: a slab sloping down to the front, overhanging 4 cm, on the back plate
    hood = M((0, yc + 0.02, z1 + 0.055), (math.radians(9), 0, 0))
    P.add_bm(bm_box(w + 0.04, d + 0.15, 0.035, 0.008, 2), GREEN, X, hood)
    span(P, GREEN, -w / 2, w / 2, yc + d / 2 - 0.03, yc + d / 2, z1, z1 + 0.06, 0.004, Zv)
    span(P, GALV, 0.12, 0.15, yc + d / 2 - 0.035, yc + d / 2 - 0.02, z1 - 0.12, z1 - 0.06, 0.003, Zv)      # the hinge latch
    # the post behind (60 mm square tube into the ground) and its two collars
    span(P, FRAME, -0.03, 0.03, yc + d / 2 + 0.002, yc + d / 2 + 0.062, -SINK, 0.885, 0.006, Zv)
    for z in (0.25, 0.70): span(P, FRAME, -0.045, 0.045, yc + d / 2 - 0.001, yc + d / 2 + 0.07, z, z + 0.05, 0.004, X)
    return finish(P, "bin_column")


# ------------------------------------------------------------------------------------------------ glass bank
def glassbank():
    P = Part("glassbank")
    D = 0.86
    span(P, GALV, -0.83, 0.83, -0.48, 0.48, -0.02, 0.08, 0.006, X)                                     # the skid
    for y in (-0.47, 0.47): span(P, GALV, -0.83, 0.83, y - 0.01, y + 0.01, 0.08, 0.1, 0.003, X)          # skid lips
    bays = ((-0.545, 0.53, 1.25, HULL, RING), (0.0, 0.55, 1.45, BAY, RING_MID), (0.545, 0.53, 1.25, HULL, RING))
    for x, w, h, mat, ring in bays:
        z0 = 0.10
        box(P, mat, (x, 0, z0 + h / 2), (w - 0.004, D, h), 0.045, Zv, 2)
        # the top: a slightly smaller cap with a drip edge
        box(P, mat, (x, 0, z0 + h + 0.015), (w - 0.06, D - 0.06, 0.03), 0.012, X, 2)
        # the round mouth on the front (-Y, the walkway side... the bank faces the walkway: -Y here, turned at placement)
        zc = z0 + h - 0.27
        P.add_bm(annulus(0.075, 0.115, 0.022, 32), ring, Zv, M((x, -D / 2 + 0.012, zc), (math.pi / 2, 0, 0)))
        P.add_bm(annulus(0.065, 0.075, 0.07, 32), DARK, Zv, M((x, -D / 2 + 0.052, zc), (math.pi / 2, 0, 0)))
        P.add_bm(disc(0.0755, 32), DARK, Zv, M((x, -D / 2 + 0.05, zc), (-math.pi / 2, 0, 0)))
        # a recessed label panel under the mouth (white plate, blank)
        span(P, WHITE, x - 0.12, x + 0.12, -D / 2 - 0.004, -D / 2 + 0.01, zc - 0.25, zc - 0.17, 0.002, X)
        # the bottle outline embossed below: two raised strips (a hint of the moulding)
        span(P, mat, x - 0.08, x + 0.08, -D / 2 - 0.006, -D / 2 + 0.01, z0 + 0.12, z0 + 0.135, 0.003, X)
        # back + sides: the vertical moulding seams
        for s in (1, -1): span(P, mat, x + s * (w / 2 - 0.04) - 0.006, x + s * (w / 2 - 0.04) + 0.006, D / 2 - 0.01, D / 2 + 0.006, z0 + 0.1, z0 + h - 0.12, 0.003, Zv)
    # the lifting hook on the middle bay
    zt = 0.10 + 1.45 + 0.03
    hook = [Vector((-0.07, 0, zt - 0.02)), Vector((-0.05, 0, zt + 0.22)), Vector((-0.035, 0, zt + 0.27)), Vector((0.035, 0, zt + 0.27)), Vector((0.05, 0, zt + 0.22)), Vector((0.07, 0, zt - 0.02))]
    for y in (-0.05, 0.05):
        P.add_bm(bm_tube_path([p + Vector((0, y, 0)) for p in hook], 0.012, 12), GALV, Zv)
    P.add_bm(sweep_yz([(-0.07, zt + 0.27), (0.07, zt + 0.27)], 0.03, 0.03, 0.008, 0.0), GALV, Y)
    return finish(P, "glassbank")


BUILDERS = [bench_street, bench_park, bench_backless, hoop, bikebox, bin_round, bin_column, glassbank]
objs = []
for b in BUILDERS:
    if ONLY and b.__name__ not in ONLY: continue
    t = time.time()
    o = b()
    objs.append(o)
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}, size {tuple(round(v, 3) for v in o.dimensions)} ({time.time() - t:.1f}s)")

layout = K.atlas_layout(objs)
for o in objs: K.lightmap_uv(o, layout[o.name], margin=0.004)
ao_png = os.path.join(OUT, "furniture2_ao.png")
if BAKE:
    ao_img = K.bake_ao(objs, ao_png, px=1024, samples=64, distance=0.5)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(objs, os.path.join(OUT, "furniture2.glb"))
info = {
    "asset": "Street furniture kit 2: benches, bike hoop, bike box, bins, glass bank (tools/blender/streetFurniture.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up, origin = footprint centre on the ground, road side = -Y (Blender) = +Z (three.js); legs 0.3 m below",
}
json.dump(info, open(os.path.join(OUT, "furniture2.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.render.image_settings.color_mode = "RGB"
    so, cam = K.preview_setup(ao_img, sun_elev=34, sun_az=210)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    spot = {"bench_street": (-4.6, 0), "bench_park": (-2.4, 0), "bench_backless": (-0.3, 0), "hoop": (1.2, 0), "bikebox": (3.3, 0.3),
            "bin_round": (5.0, -0.5), "bin_column": (5.8, -0.5), "glassbank": (7.6, 0)}
    for o in objs: o.location = (*spot[o.name], 0)
    K.render(cam, os.path.join(PV, "furniture2_overview.jpg"), (1.6, -9.5, 2.8), (1.6, 0, 0.6), 30, (1800, 800))
    K.render(cam, os.path.join(PV, "furniture2_benches.jpg"), (-2.4, -3.6, 1.5), (-2.4, 0, 0.45), 30, (1400, 800))
    K.render(cam, os.path.join(PV, "furniture2_box_bins.jpg"), (5.6, -4.4, 1.6), (5.4, 0, 0.7), 32, (1400, 800))
    so.rotation_euler = (math.radians(82), 0, math.radians(120))
    K.render(cam, os.path.join(PV, "furniture2_grazing.jpg"), (-7.5, -2.6, 0.9), (-2.4, 0, 0.5), 40, (1400, 800))
print(f"done {time.time() - T0:.0f}s")
