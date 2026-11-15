"""THE PLAYER'S SCOOTER: an invented classic step-through scooter in the Italian style (~125 cc class; no real brand, no
logo, no badge text), built entirely in code, with a seated upright commuter. Deterministic: re-run to change it.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/scooter.py -- models/scooter [--bake] [--preview <dir>]
      models/scooter/scooter.raw.glb   the pieces (nodes below), LOD0; the viewer makes LOD1 / LOD2 (meshoptimizer)
      models/scooter/scooter.json      the rig numbers (wheels, steering axis, rider joints, lamps, side stand)
      models/scooter/.aocache          the per-vertex AO per piece (GPU / OptiX bake, by geometry hash)

Nodes (as tools/blender/motorbike.py):
  Body        the pressed-steel monocoque: floorboard (rubber strips, alloy edge trims), the apron / leg shield with its
              central bulge (the steering column runs in it), the horn grille, the rear body with the two cowls (the
              right one over the engine: vent louvres), seat with piping, grab rail / rack, tail light, plate, indicators,
              the engine + CVT case arm (the single-sided rear), muffler, rear shock, centre + side stands (stowed)
  Steer       the handlebar casing with the round headlight and the speedo, grips, levers, round mirrors, front
              indicators, the single-sided link fork (wheel exposed on the right), its damper, the front caliper, the
              front mudguard (origin = the steering axis at the headset; it turns about scooter.json steer.axis)
  Wheel_F/R   12-inch split steel rims (5 nuts), 110/70-12 and 120/70-12 tyres; front disc (origin = the axle)
  Wheel_F_far, Wheel_R_far   the solid-disc stand-ins for the far LODs (same origins)
  RiderLegs   trousers, knees, shoes flat on the floorboard (fixed); RiderTorso (jacket, head, jet helmet; origin =
              the hip pivot); ArmU_L/R, ArmF_L/R (built along +X from their joint: the viewer's two-bone IK)
Proportions from photos of classic / modern Italian-style scooters (looked at only, never traced): wheelbase 1.37 m,
seat 0.79 m, ~1.86 m long, bars ~0.74 m wide, rake 27 deg.
Slots: Paint, Frame, Metal, Engine, Chrome, Rubber, Plastic, Seat, Rim, Disc, Glass, HeadLight, TailLight, Plate,
Helmet, Visor, Jacket, Trousers, Glove, Boot, Skin. Build frame X forward, Y left, Z up; exported glTF +Z forward, +X left.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
import twowheel_kit as T
import rider_kit as RK
from twowheel_kit import loft, loft_x, tube, lathe, ellipsoid, smooth_path, cyl_between, along_y, box, plate, bar_between, gl

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/scooter")
os.makedirs(OUT, exist_ok=True)
BAKE = "--bake" in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
K.reset()
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ dimensions
WB = 1.37
XF, XR = WB / 2, -WB / 2
RF, RR = 0.229, 0.235                 # 110/70-12, 120/70-12
WF, WR = 0.110, 0.120
RIM = 0.1524                          # 12" bead seat radius
RAKE = math.radians(27)
TRAIL = 0.090
AXD = Vector((-math.sin(RAKE), 0, math.cos(RAKE)))
AXG = Vector((XF + TRAIL - RF * 0.0, 0, 0))
A_F = Vector((XF, 0, RF)); A_R = Vector((XR, 0, RR))
def axis_at(z): return AXG + AXD * (z / AXD.z)
H = axis_at(1.02)                     # steer pivot: the axis at the headset
FY = 0.092                            # the fork leg's side offset (left)

mat = K.mat
PAINT = mat("Paint", (0.55, 0.70, 0.62), 0.25, 0.2)     # (preview: a pale green; the viewer sets the paint)
FRAME = mat("Frame", (0.06, 0.065, 0.07), 0.45, 0.5)
METAL = mat("Metal", (0.55, 0.56, 0.58), 0.35, 1.0)
ENGINE = mat("Engine", (0.12, 0.12, 0.13), 0.5, 0.6)
CHROME = mat("Chrome", (0.85, 0.85, 0.86), 0.12, 1.0)
RUBBER = mat("Rubber", (0.025, 0.025, 0.025), 0.85)
PLASTIC = mat("Plastic", (0.035, 0.035, 0.04), 0.55)
SEAT = mat("Seat", (0.10, 0.06, 0.04), 0.7)
RIMM = mat("Rim", (0.55, 0.56, 0.58), 0.35, 0.8)
DISC = mat("Disc", (0.50, 0.50, 0.52), 0.3, 1.0)
GLASS = mat("Glass", (0.03, 0.035, 0.04), 0.05)
HEAD = mat("HeadLight", (0.85, 0.88, 0.92), 0.1, 0.5)
TAIL = mat("TailLight", (0.45, 0.02, 0.02), 0.15)
PLATE = mat("Plate", (0.9, 0.9, 0.9), 0.4)
HELMET = mat("Helmet", (0.75, 0.74, 0.70), 0.2, 0.1)
VISOR = mat("Visor", (0.05, 0.05, 0.06), 0.05)
JACKET = mat("Jacket", (0.12, 0.14, 0.18), 0.7)
TROUSERS = mat("Trousers", (0.10, 0.14, 0.24), 0.8)
GLOVE = mat("Glove", (0.05, 0.04, 0.035), 0.6)
BOOT = mat("Boot", (0.20, 0.13, 0.08), 0.6)
SKIN = mat("Skin", (0.62, 0.45, 0.36), 0.55)

# ------------------------------------------------------------------------------------------------ WHEELS
def tyre_profile(R, W, n=16):
    yb = 0.40 * W
    pts = [(RIM - 0.004, yb)]
    for i in range(n + 1):
        a = math.pi * i / n
        y = (W / 2) * math.cos(a) * (0.88 + 0.12 * math.sin(a))
        r = RIM + 0.010 + (R - RIM - 0.010) * (math.sin(a) ** 0.55)
        pts.append((r, y))
    pts.append((RIM - 0.004, -yb))
    return pts

def rim_profile(W):
    """a pressed-steel split rim, closed: the flanges round the beads, the well, the dished disc to the hub"""
    yi = 0.40 * W + 0.0015
    half = [(RIM - 0.002, yi), (RIM + 0.009, yi + 0.002), (RIM + 0.010, yi + 0.008), (RIM - 0.010, yi + 0.007), (0.118, 0.020), (0.050, 0.028), (0.034, 0.028)]
    return half + [(r, -y) for (r, y) in reversed(half)]

def wheel(name, R, W, front):
    """e = the exposed side (front: right, the fork on the left; rear: left, the engine on the right)"""
    P = K.Part(name)
    e = -1 if front else 1
    P.add_bm(lathe(tyre_profile(R, W), segs=48), RUBBER)
    P.add_bm(lathe(rim_profile(W), segs=48), RIMM)
    for k in range(5):                                   # the split rim's 5 nuts on the exposed side, the centre cap
        a = 2 * math.pi * k / 5 + 0.2
        P.add_bm(along_y(0.0085, e * 0.0225, e * 0.0345, 0.074 * math.cos(a), 0.074 * math.sin(a), segs=6, bevel=0.0), CHROME)
    P.add_bm(lathe([(0.0, e * 0.046), (0.020, e * 0.044), (0.031, e * 0.036), (0.034, e * 0.027), (0.0, e * 0.027)], segs=24), CHROME)
    # the hub on the other side: front into the fork's axle boss, rear into the drum of the engine case
    P.add_bm(along_y(0.034, -e * 0.026, -e * (0.062 if front else 0.090), 0, 0, segs=24, bevel=0.004), METAL)
    if front:
        y = 0.052; n = 72; t = 0.002
        bm = bmesh.new()
        ro, ri = 0.100, 0.068
        rings = []
        for yy in (y - t, y + t):
            rings.append([bm.verts.new((ro * math.cos(2 * math.pi * i / n), yy, ro * math.sin(2 * math.pi * i / n))) for i in range(n)])
            rings.append([bm.verts.new((ri * math.cos(2 * math.pi * i / n), yy, ri * math.sin(2 * math.pi * i / n))) for i in range(n)])
        o0, i0, o1, i1 = rings
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([o0[i], o0[j], i0[j], i0[i]]); bm.faces.new([o1[i], i1[i], i1[j], o1[j]])
            bm.faces.new([o0[i], o1[i], o1[j], o0[j]]); bm.faces.new([i0[i], i0[j], i1[j], i1[i]])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.smooth = abs(f.normal.y) < 0.5
        P.add_bm(bm, DISC)
        for k in range(6):                                           # the disc's carrier arms from the hub
            a = 2 * math.pi * k / 6
            P.add_bm(bar_between(Vector((0.030 * math.cos(a), y, 0.030 * math.sin(a))), Vector((0.070 * math.cos(a), y, 0.070 * math.sin(a))), 0.014, 0.004, bevel=0.0), DISC)
    return P.to_object(smooth_angle=40)

# ------------------------------------------------------------------------------------------------ BODY
# the apron / leg shield: a vertical loft of cross-sections (x across y) from the floor to the headset
def shield_back(z): return 0.385 - (z - 0.24) * (0.12 / 0.69)
def shield_hw(z): return T.sample([(0.22, 0.20), (0.45, 0.268), (0.70, 0.262), (0.86, 0.205), (0.945, 0.125)], z)[0]
def bulge(z):
    """the central bulge's depth in front of the shield (it holds the steering column), 0 below the mudguard"""
    t = max(0.0, min(1.0, (z - 0.50) / 0.09)); t = t * t * (3 - 2 * t)
    return t * max(0.0, axis_at(z).x + 0.055 - shield_back(z) - 0.028)
def shield_front(z, y):
    hw = shield_hw(z); u = y / hw
    return shield_back(z) + 0.028 - 0.062 * u * u + bulge(z) * math.exp(-(y / 0.072) ** 2)

def build_apron(P):
    n = 40; rings = []; bm = bmesh.new()
    zs = [0.22 + (0.945 - 0.22) * i / 26 for i in range(27)]
    for z in zs:
        hw = shield_hw(z); ring = []
        for i in range(n // 2 + 1):                              # front: right edge -> left edge
            u = -1 + 2 * i / (n // 2)
            y = hw * math.copysign(abs(u) ** 0.85, u)
            ring.append(bm.verts.new((shield_front(z, y * 0.985), y * 0.985, z)))
        for i in range(n // 2 + 1):                              # back: left -> right (the concave leg shield)
            u = 1 - 2 * i / (n // 2)
            y = hw * math.copysign(abs(u) ** 0.85, u)
            ring.append(bm.verts.new((shield_back(z) - 0.062 * (y / hw) ** 2, y, z)))
        rings.append(ring)
    m = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for k in range(m): bm.faces.new([a[k], a[(k + 1) % m], b[(k + 1) % m], b[k]])
    for r in (rings[0], rings[-1]):
        f = bm.faces.new(r if r is rings[-1] else list(reversed(r)))
        for t_ in bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="EAR_CLIP")["faces"]: t_.tag = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = not f.tag
    P.add_bm(bm, PAINT)
    # the leg shield's alloy edge trim (both outer edges, floor to headset)
    for s in (1, -1):
        pts = [Vector((shield_back(z) - 0.031, s * (shield_hw(z) + 0.002), z)) for z in zs[1:-1]]
        P.add_bm(tube(pts, 0.0062, segs=10), METAL)
    # the horn grille: chrome surround, dark slats, on the bulge's front; the chrome ridge strip below it
    zc = 0.765
    loop = []
    for i in range(24):
        a = 2 * math.pi * i / 24
        y, z = 0.040 * math.cos(a), zc + 0.050 * math.sin(a) * (1 + 0.25 * math.cos(a) ** 2)
        loop.append(Vector((shield_front(z, y) + 0.002, y, z)))
    P.add_bm(tube(loop, 0.0055, segs=8, closed=True), CHROME)
    for k in range(5):
        z = zc - 0.036 + 0.018 * k; hy = 0.022 * math.sqrt(max(0.05, 1 - ((z - zc) / 0.052) ** 2))
        P.add_bm(box((0.008, 2 * hy, 0.007), (shield_front(z, 0) + 0.0005, 0, z), bevel=0.002), PLASTIC)
    ridge = [Vector((shield_front(z, 0) + 0.002, 0, z)) for z in [0.58 + 0.12 * i / 8 for i in range(9)]]
    P.add_bm(tube(ridge, 0.005, segs=8), CHROME)

def floorboard(P):
    keys = [(-0.15, 0.172, 0.300, 0.225), (0.0, 0.176, 0.300, 0.222), (0.25, 0.176, 0.300, 0.222), (0.36, 0.165, 0.300, 0.23)]
    P.add_bm(loft_x(keys, stations=12, n=28, p_top=10.0, p_bot=5.0, ends=False), PAINT)
    for k in range(5):                                                         # rubber strips
        y = -0.112 + 0.056 * k
        P.add_bm(box((0.44, 0.020, 0.008), (0.135, y, 0.3015), bevel=0.0025), RUBBER)
    for s in (1, -1):                                                          # alloy edge trims
        P.add_bm(tube(smooth_path([(-0.14, s * 0.170, 0.297), (0.10, s * 0.174, 0.297), (0.25, s * 0.174, 0.297), (0.345, s * 0.163, 0.297)], 8), 0.0065, segs=10), METAL)
    # the frame / belly under the floor, the side stand (left, stowed) and the centre stand (stowed)
    P.add_bm(box((0.50, 0.24, 0.05), (0.12, 0, 0.205), bevel=0.0, segs=1, flat_=True), FRAME)
    P.add_bm(tube([(-0.08, 0.175, 0.205), (-0.20, 0.183, 0.180), (-0.34, 0.178, 0.165)], 0.011, segs=10), FRAME)
    P.add_bm(box((0.05, 0.03, 0.012), (-0.355, 0.178, 0.160), bevel=0.004), RUBBER)
    stand = [(-0.26, 0.132, 0.20), (-0.34, 0.136, 0.175), (-0.405, 0.138, 0.166), (-0.42, 0.11, 0.165), (-0.42, -0.11, 0.165), (-0.405, -0.138, 0.166), (-0.34, -0.136, 0.175), (-0.26, -0.132, 0.20)]
    P.add_bm(tube(smooth_path(stand, 4), 0.012, segs=10), FRAME)          # the centre stand (stowed): one U tube

def body_section(x):
    """the rear body's closed cross-section at x: (y, z) control points (top centre, the left cowl bulging low and
    rolling under into the tunnel over the wheel, the tunnel roof, then the right side with its own tunnel width)"""
    hw, zt, zc, zl, tl, tr, tz = T.sample(BODY_SORTED, x)
    def side(s, ti):
        return [(s * hw * 0.50, zt - 0.003), (s * hw * 0.80, zt - 0.032), (s * hw * 0.96, zc + 0.075), (s * hw, zc),
                (s * hw * 0.955, (zc + zl) / 2 - 0.004), (s * hw * 0.80, zl + 0.010), (s * (ti + 0.035), zl), (s * ti, zl + 0.030),
                (s * ti, tz - 0.030), (s * ti * 0.55, tz)]
    L, R_ = side(1, tl), side(-1, tr)
    return [(0.0, zt)] + L + [(0.0, tz)] + list(reversed(R_))

#             x       hw    zt     zc    zl    tunnel L / R   roof
BODY_KEYS = [(-0.105, 0.168, 0.660, 0.47, 0.232, 0.07, 0.07, 0.295),
             (-0.22, 0.172, 0.690, 0.47, 0.232, 0.07, 0.07, 0.295),
             (-0.33, 0.196, 0.705, 0.45, 0.285, 0.085, 0.13, 0.360),
             (-0.43, 0.252, 0.712, 0.44, 0.300, 0.097, 0.188, 0.410),
             (-0.55, 0.306, 0.712, 0.44, 0.310, 0.097, 0.188, 0.500),
             (-0.68, 0.322, 0.704, 0.45, 0.322, 0.097, 0.188, 0.520),
             (-0.78, 0.300, 0.685, 0.47, 0.355, 0.097, 0.176, 0.505),
             (-0.87, 0.242, 0.655, 0.50, 0.420, 0.090, 0.130, 0.505),
             (-0.93, 0.165, 0.620, 0.535, 0.470, 0.070, 0.080, 0.540),
             (-0.958, 0.095, 0.598, 0.555, 0.505, 0.040, 0.040, 0.560)]
BODY_SORTED = sorted(BODY_KEYS)

def ring_points(x, scale=1.0, per=3):
    cp = body_section(x)
    cy = sum(p[0] for p in cp) / len(cp); cz = sum(p[1] for p in cp) / len(cp)
    cp = [(cy + (p[0] - cy) * scale, cz + (p[1] - cz) * scale) for p in cp]
    n = len(cp); out = []
    for i in range(n):
        p0, p1, p2, p3 = (Vector(cp[(i + k) % n]) for k in (-1, 0, 1, 2))
        for j in range(per):
            u = j / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    return out

def rear_body(P):
    bm = bmesh.new(); rings = []
    xs = [-0.105 + (-0.958 + 0.105) * (0.5 - 0.5 * math.cos(math.pi * i / 30)) for i in range(31)]
    stations = [(x, 1.0) for x in xs] + [(-0.968, 0.80), (-0.975, 0.50), (-0.978, 0.18)]
    for x, sc in stations:
        xx = max(-0.958, min(-0.105, x))
        rings.append([bm.verts.new((x, p.x, p.y)) for p in ring_points(xx, sc)])
    m = len(rings[0])
    for a, b in zip(rings, rings[1:]):
        for k in range(m): bm.faces.new([a[k], b[k], b[(k + 1) % m], a[(k + 1) % m]])
    for r, rev in ((rings[0], False), (rings[-1], True)):
        f = bm.faces.new(list(reversed(r)) if rev else r)
        for t_ in bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="EAR_CLIP")["faces"]: t_.tag = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = not f.tag
    P.add_bm(bm, PAINT)
    # the right cowl's vent louvres (the engine side): horizontal slots stacked on its rear flank
    for k in range(5):
        z = 0.410 + 0.016 * k; x = -0.70 + 0.004 * k
        hw = T.sample(BODY_SORTED, x)[0]
        P.add_bm(box((0.075, 0.010, 0.0065), (x, -(hw - 0.0035), z), bevel=0.003, rot=None, flat_=True), PLASTIC)

def seat(P):
    keys = [(-0.158, 0.040, 0.748, 0.712), (-0.18, 0.090, 0.770, 0.690), (-0.26, 0.135, 0.790, 0.692), (-0.42, 0.148, 0.795, 0.697),
            (-0.60, 0.145, 0.800, 0.695), (-0.74, 0.128, 0.795, 0.672), (-0.80, 0.090, 0.778, 0.655), (-0.818, 0.040, 0.755, 0.665)]
    P.add_bm(loft_x(keys, stations=24, n=28, p_top=3.4, p_bot=6.0), SEAT)
    side = []
    for x in [-0.175 - (0.80 - 0.175) * i / 18 for i in range(19)]:
        hw, zt, zb = T.sample(sorted(keys), x)
        side.append((x, hw + 0.001, (zt + zb) / 2))
    loop = [Vector((x, y, z)) for x, y, z in side] + [Vector((x, -y, z)) for x, y, z in reversed(side)]
    P.add_bm(tube(loop, 0.0042, segs=6, closed=True), PLASTIC)
    # the seat's chrome hinge strap at the front edge
    P.add_bm(box((0.025, 0.10, 0.010), (-0.165, 0, 0.705), bevel=0.003), CHROME)

def rack(P):
    half = [(-0.60, 0.150, 0.700), (-0.62, 0.158, 0.748), (-0.72, 0.158, 0.755), (-0.84, 0.138, 0.755), (-0.91, 0.090, 0.753), (-0.945, 0.045, 0.752)]
    loop = half + [(-0.955, 0.0, 0.752)] + [(x, -y, z) for (x, y, z) in reversed(half)]
    P.add_bm(tube(smooth_path(loop, 4), 0.0095, segs=12), CHROME)               # the grab rail: one tube round the rack
    for s in (1, -1):
        P.add_bm(cyl_between((-0.845, s * 0.13, 0.655), (-0.845, s * 0.13, 0.745), 0.008, segs=10), CHROME)
    for x in (-0.84, -0.88):
        P.add_bm(cyl_between((x, 0.13 - (x + 0.84) * 0.9, 0.755), (x, -0.13 + (x + 0.84) * 0.9, 0.755), 0.0065, segs=8), CHROME)

def tail(P):
    # the tail light on the tail's end, a chrome bezel; the plate holder; rear indicators
    P.add_bm(ellipsoid((-0.966, 0, 0.560), (0.020, 0.062, 0.028), 22, 10), TAIL)
    bz = [Vector((-0.963, 0.065 * math.cos(2 * math.pi * i / 28), 0.560 + 0.031 * math.sin(2 * math.pi * i / 28))) for i in range(28)]
    P.add_bm(tube(bz, 0.0045, segs=8, closed=True), CHROME)
    P.add_bm(tube(smooth_path([(-0.94, 0, 0.52), (-0.975, 0, 0.505), (-0.985, 0, 0.47)], 3), 0.012, segs=10), PLASTIC)
    rot = Matrix.Rotation(math.radians(-12), 3, "Y")
    P.add_bm(box((0.014, 0.205, 0.140), (-0.988, 0, 0.415), bevel=0.004, rot=rot), PLASTIC)
    P.add_bm(box((0.004, 0.185, 0.122), (-0.997, 0, 0.417), bevel=0.0015, rot=rot), PLATE)
    for s in (1, -1):                                      # rear indicators on short stalks off the tail
        P.add_bm(cyl_between((-0.915, s * 0.10, 0.60), (-0.93, s * 0.165, 0.615), 0.006, segs=8), PLASTIC)
        P.add_bm(ellipsoid((-0.932, s * 0.180, 0.617), (0.022, 0.018, 0.016), 14, 8), GLASS)

def engine(P):
    # the engine (under the seat, the cylinder forward), the CVT case arm on the right to the rear hub, the drum
    P.add_bm(box((0.20, 0.16, 0.13), (-0.30, -0.035, 0.250), bevel=0.025, segs=1, flat_=True), ENGINE)
    for k in range(4):
        P.add_bm(box((0.006, 0.17, 0.14), (-0.215 - 0.018 * k, -0.035, 0.250), bevel=0.0, rot=None, flat_=True), ENGINE)
    secs = []
    p0, p1 = Vector((-0.30, -0.125, 0.285)), Vector((XR, -0.125, RR))
    for i in range(13):
        t = i / 12
        c = p0 + (p1 - p0) * t
        h = 0.085 - 0.025 * t + 0.02 * math.sin(math.pi * t)
        hw = 0.038 + 0.005 * math.sin(math.pi * t)
        secs.append((c, (0, hw, 0), (0, 0, h), (0, 0, h * 0.9), 3.6))
    P.add_bm(loft(secs, n=24), METAL)
    P.add_bm(along_y(0.112, -0.075, -0.178, XR, RR, segs=40, bevel=0.010), METAL)          # the drum / CVT cover round the hub
    for k in range(8):                                                                        # its cooling ribs
        a = 2 * math.pi * k / 8
        P.add_bm(box((0.04, 0.006, 0.012), (XR + 0.08 * math.cos(a), -0.179, RR + 0.08 * math.sin(a)), bevel=0.0, rot=Matrix.Rotation(-a, 3, "Y"), flat_=True), METAL)
    # the muffler under the right cowl, its heat shield and the tail pipe
    P.add_bm(tube(smooth_path([(-0.25, -0.03, 0.19), (-0.30, -0.09, 0.14), (-0.36, -0.15, 0.132), (-0.44, -0.212, 0.20)], 4), 0.018, segs=12), CHROME)
    can0, can1 = Vector((-0.43, -0.222, 0.205)), Vector((-0.80, -0.250, 0.285))
    d = (can1 - can0).normalized(); side = d.cross(Vector((0, 0, 1))).normalized(); upn = side.cross(d).normalized()
    secs = []
    for i in range(11):
        t = i / 10
        k = 0.6 + 0.4 * math.sin(min(1, t * 4) * math.pi / 2) if t < 0.5 else 1.0 - 0.15 * ((t - 0.5) / 0.5) ** 2
        secs.append((can0 + (can1 - can0) * t, side * 0.056 * k, upn * 0.068 * k, upn * 0.068 * k, 3.0))
    P.add_bm(loft(secs, n=24), METAL)
    P.add_bm(cyl_between(can1 - d * 0.01, can1 + d * 0.04, 0.016, segs=14, bevel=0.002), CHROME)
    # the rear shock (right, under the cowl), its spring
    sh0, sh1 = Vector((-0.58, -0.135, 0.32)), Vector((-0.50, -0.135, 0.50))
    P.add_bm(cyl_between(sh0, sh1, 0.016, segs=16, bevel=0.002), METAL)
    sd = (sh1 - sh0); L = sd.length; sd.normalize()
    sx_ = sd.cross(Vector((0, 1, 0))).normalized(); sy_ = sd.cross(sx_).normalized()
    hel = [sh0 + sd * (0.03 + i / 80 * (L - 0.08)) + (sx_ * math.cos(2 * math.pi * 6 * i / 80) + sy_ * math.sin(2 * math.pi * 6 * i / 80)) * 0.026 for i in range(81)]
    P.add_bm(tube(hel, 0.0045, segs=6), CHROME)

def build_body():
    P = K.Part("Body")
    build_apron(P)
    floorboard(P)
    rear_body(P)
    seat(P)
    rack(P)
    tail(P)
    engine(P)
    return P.to_object(smooth_angle=38)

# ------------------------------------------------------------------------------------------------ STEER
HS_X = lambda y: 0.288 - 0.65 * y * y              # the handlebar casing's centre line (swept back to the grips)
def headset(P):
    keys = [(0.0, 0.160, 0.088, 0.072), (0.07, 0.152, 0.082, 0.068), (0.13, 0.118, 0.066, 0.056), (0.19, 0.070, 0.046, 0.040),
            (0.235, 0.038, 0.030, 0.028), (0.272, 0.024, 0.0235, 0.0235)]
    secs = []
    for i in range(-16, 17):
        y = 0.272 * i / 16
        hx, ht, hb = T.sample(keys, abs(y))
        zc = 1.020 - 0.03 * (y / 0.272) ** 2
        secs.append(((HS_X(y), y, zc), (hx, 0, 0), (0, 0, ht), (0, 0, hb), 2.3))
    bm = loft(secs, n=28)
    P.add_bm(bm, PAINT)
    # the round headlight in its nose: chrome bezel, the lens
    hc = Vector((HS_X(0) + 0.152, 0, 1.012))
    P.add_bm(cyl_between((HS_X(0) + 0.05, 0, 1.012), hc + Vector((0.001, 0, 0)), 0.068, segs=36, bevel=0.008), PAINT)   # the lamp's cowl
    bz = [hc + Vector((0, 0.068 * math.cos(2 * math.pi * i / 36), 0.068 * math.sin(2 * math.pi * i / 36))) for i in range(36)]
    P.add_bm(tube(bz, 0.0095, segs=10, closed=True), CHROME)
    P.add_bm(ellipsoid(hc + Vector((-0.004, 0, 0)), (0.020, 0.062, 0.062), 28, 14), HEAD)
    # the speedo on top, tilted to the rider
    sc = Vector((HS_X(0) - 0.045, 0, 1.098)); n_ = Vector((-0.55, 0, 0.84)).normalized()
    P.add_bm(cyl_between(sc - n_ * 0.02, sc + n_ * 0.012, 0.050, segs=28, bevel=0.004), PLASTIC)
    P.add_bm(cyl_between(sc + n_ * 0.010, sc + n_ * 0.016, 0.044, segs=28, bevel=0.0), GLASS)
    ring = [sc + n_ * 0.013 + (Vector((0, 1, 0)) * math.cos(2 * math.pi * i / 28) + n_.cross(Vector((0, 1, 0))) * math.sin(2 * math.pi * i / 28)) * 0.047 for i in range(28)]
    P.add_bm(tube(ring, 0.0035, segs=6, closed=True), CHROME)
    # the column's rubber gaiter down to the apron
    P.add_bm(cyl_between(axis_at(0.925), axis_at(0.985), 0.034, segs=20, bevel=0.0), RUBBER)
    for s in (1, -1):
        g0, g1 = Vector((HS_X(0.265), s * 0.262, 1.000)), Vector((HS_X(0.37), s * 0.372, 0.997))
        P.add_bm(cyl_between(g0, g1, 0.0172, segs=18, bevel=0.004), RUBBER)                       # grip
        P.add_bm(cyl_between(g1 - (g1 - g0).normalized() * 0.002, g1 + (g1 - g0).normalized() * 0.016, 0.0195, segs=18, bevel=0.004), CHROME)
        perch = Vector((HS_X(0.235) + 0.012, s * 0.238, 1.018))
        P.add_bm(box((0.035, 0.028, 0.030), perch, bevel=0.007), PLASTIC)
        lev = [perch + Vector((0.02, 0, 0)), Vector((HS_X(0.30) + 0.050, s * 0.300, 1.008)), Vector((HS_X(0.36) + 0.050, s * 0.358, 1.004))]
        P.add_bm(tube(smooth_path(lev, 4), [0.0062, 0.0055, 0.005], segs=8), METAL)
        # the mirror: stalk from the casing, a round chrome head facing back, its glass
        st = [Vector((HS_X(0.20) - 0.01, s * 0.200, 1.055)), Vector((HS_X(0.23) - 0.02, s * 0.235, 1.16)), Vector((HS_X(0.27) - 0.04, s * 0.268, 1.245))]
        P.add_bm(tube(smooth_path(st, 4), [0.0062, 0.0058, 0.0052], segs=8), CHROME)
        mc = Vector((HS_X(0.27) - 0.052, s * 0.278, 1.268))
        md = Vector((-1, s * 0.25, 0.15)).normalized()
        P.add_bm(cyl_between(mc + md * 0.002, mc - md * 0.024, 0.052, segs=28, bevel=0.008, r2=0.038), CHROME)
        P.add_bm(cyl_between(mc + md * 0.0045, mc + md * 0.001, 0.045, segs=28, bevel=0.0), GLASS)
        # front indicators at the casing's ends
        P.add_bm(ellipsoid((HS_X(0.19) + 0.060, s * 0.190, 1.020), (0.022, 0.020, 0.016), 14, 8), GLASS)

def fork(P):
    # the single-sided link fork on the LEFT: out of the bulge, offset to the side, down to the link pivot
    top = axis_at(0.585)
    pts = [top, axis_at(0.545) + Vector((0, 0.035, 0)), axis_at(0.50) + Vector((0, 0.080, 0)), axis_at(0.45) + Vector((0, FY, 0)), axis_at(0.30) + Vector((0, FY, 0))]
    P.add_bm(tube(smooth_path(pts, 4), 0.026, segs=18), FRAME)
    piv = axis_at(0.30) + Vector((0, FY, 0))
    P.add_bm(along_y(0.020, FY - 0.022, FY + 0.022, piv.x, piv.z, segs=16, bevel=0.003), METAL)
    hub = Vector((XF, FY, RF))
    P.add_bm(bar_between(piv + Vector((0, 0.003, 0)), hub + Vector((0, 0.003, 0)), 0.042, 0.026, bevel=0.008), METAL)    # the link
    P.add_bm(along_y(0.024, 0.066, FY + 0.021, XF, RF, segs=18, bevel=0.003), METAL)       # the axle stub boss
    # the damper ahead of the fork leg, with its spring
    d0, d1 = axis_at(0.47) + Vector((0.048, FY + 0.004, 0)), Vector((XF - 0.005, FY + 0.004, RF + 0.045))
    P.add_bm(cyl_between(d0, d1, 0.013, segs=14, bevel=0.002), METAL)
    sd = (d1 - d0); L = sd.length; sd.normalize()
    sx_ = sd.cross(Vector((0, 1, 0))).normalized(); sy_ = sd.cross(sx_).normalized()
    hel = [d0 + sd * (0.02 + i / 60 * (L - 0.05)) + (sx_ * math.cos(2 * math.pi * 5 * i / 60) + sy_ * math.sin(2 * math.pi * 5 * i / 60)) * 0.021 for i in range(61)]
    P.add_bm(tube(hel, 0.0040, segs=6), CHROME)
    P.add_bm(bar_between(axis_at(0.47) + Vector((0, FY, 0)), d0 + Vector((0.01, 0, 0)), 0.03, 0.02, bevel=0.005), METAL)
    # the caliper on the link, straddling the disc (y 0.052), upper rear
    ang = math.radians(138); cc = A_F + Vector((0.085 * math.cos(ang), 0, 0.085 * math.sin(ang)))
    P.add_bm(box((0.026, 0.034, 0.058), (cc.x, 0.054, cc.z), bevel=0.008, rot=Matrix.Rotation(-(ang - math.pi / 2), 3, "Y")), ENGINE)
    P.add_bm(bar_between(Vector((cc.x, 0.072, cc.z)), piv + Vector((0.01, -0.012, 0.02)), 0.022, 0.012, bevel=0.003), METAL)
    # the front mudguard on the fork: an arc over the tyre, its bracket to the fork top
    secs = []
    for i in range(15):
        a = math.radians(22 + (150 - 22) * i / 14)
        rr = RF + 0.034
        c = A_F + Vector((rr * math.cos(a), 0, rr * math.sin(a)))
        rad = Vector((math.cos(a), 0, math.sin(a)))
        hw = 0.074 - 0.010 * abs(i - 7) / 7
        secs.append((c, (0, hw, 0), rad * 0.006, rad * 0.006, 5))
    P.add_bm(loft(secs, n=20), PAINT)
    a = math.radians(122); mtop = A_F + Vector(((RF + 0.040) * math.cos(a), 0.0, (RF + 0.040) * math.sin(a)))
    P.add_bm(tube(smooth_path([mtop + Vector((0, 0.03, 0.002)), axis_at(0.505) + Vector((0.012, 0.06, 0)), axis_at(0.50) + Vector((0, 0.078, 0))], 3), 0.008, segs=8), FRAME)

def build_steer():
    P = K.Part("Steer")
    headset(P)
    fork(P)
    return P.to_object(smooth_angle=38)

# ------------------------------------------------------------------------------------------------ RIDER (upright commuter)
HIP = Vector((-0.275, 0.0, 0.885))
LEAN = math.radians(11)
SPINE = Vector((math.sin(LEAN), 0, math.cos(LEAN)))
FWD_T = Vector((math.cos(LEAN), 0, -math.sin(LEAN)))
def spine(s): return HIP + SPINE * s
SHOULDER = {s: spine(0.475) + Vector((0.0, s * 0.185, 0)) for s in (1, -1)}
GRIP = {s: Vector((HS_X(0.32) + 0.004, s * 0.320, 0.998)) for s in (1, -1)}
ARM_U, ARM_F = 0.29, 0.33
HC = spine(0.70) + FWD_T * 0.025                     # the head's centre
HTILT = Matrix.Rotation(math.radians(4), 3, "Y")
EYE = HC + HTILT @ Vector((0.085, 0, 0.012))
KNEE = {s: Vector((0.145, s * 0.168, 0.765)) for s in (1, -1)}
ANKLE = {s: Vector((0.110, s * 0.160, 0.385)) for s in (1, -1)}

def build_legs():
    P = K.Part("RiderLegs")
    secs = []
    for i in range(9):
        t = i / 8
        x = HIP.x - 0.10 + 0.20 * t
        k = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.5
        secs.append(((x, 0, HIP.z - 0.035), (0, 0.172 * k, 0), (0, 0, 0.085 * k), (0, 0, 0.075 * k), 2.6))
    P.add_bm(loft(secs, n=32), TROUSERS)
    for s in (1, -1):
        hipj = HIP + Vector((0.0, s * 0.095, -0.04))
        knee, ankle = KNEE[s], ANKLE[s]
        dk = (knee - hipj).normalized(); ds = (ankle - knee).normalized()
        P.add_bm(tube(smooth_path([hipj, (hipj + knee) / 2 + Vector((0, 0, 0.012)), knee - dk * 0.022], 4), [0.085, 0.080, 0.074, 0.068, 0.062, 0.058, 0.055, 0.053, 0.052], segs=16), TROUSERS)
        P.add_bm(ellipsoid(knee, (0.065, 0.065, 0.067), 18, 10), TROUSERS)
        P.add_bm(tube([knee + ds * 0.022, (knee + ankle) / 2 + Vector((0.008, 0, 0)), ankle + Vector((0, 0, 0.05))], [0.053, 0.049, 0.047], segs=16), TROUSERS)
        P.add_bm(cyl_between(ankle + Vector((0, 0, 0.01)), ankle + Vector((0, 0, 0.078)), 0.054, segs=16, bevel=0.004), TROUSERS)   # the hem
        RK.shoe(P, Vector((ankle.x - 0.075, s * 0.160, 0.307)), 0.275, s, BOOT, RUBBER, hw=0.046, high=0.095)
    return P.to_object(smooth_angle=50)

def build_torso():
    P = K.Part("RiderTorso")
    keys = [(0.02, 0.158, 0.110), (0.16, 0.152, 0.104), (0.30, 0.178, 0.118), (0.42, 0.198, 0.112), (0.50, 0.168, 0.090), (0.545, 0.085, 0.062)]
    RK.torso(P, HIP, SPINE, FWD_T, keys, JACKET, zip_mat=PLASTIC)
    for s in (1, -1):
        P.add_bm(ellipsoid(SHOULDER[s], (0.060, 0.058, 0.060), 16, 8), JACKET)
    RK.head(P, HC, HTILT, SKIN, neck_from=spine(0.52), neck_r=0.050)
    RK.jet_helmet(P, HC, HTILT, HELMET, VISOR, PLASTIC)
    return P.to_object(smooth_angle=50)

def build_arm(name, upper, side):
    P = K.Part(name)
    if upper: RK.sleeve_upper(P, ARM_U, JACKET)
    else:
        RK.sleeve_fore(P, ARM_F, JACKET, GLOVE)
        RK.fist(P, (ARM_F, 0, 0), side, GLOVE, grip_r=0.0172)
    return P.to_object(smooth_angle=50)

# ------------------------------------------------------------------------------------------------ build all
t0 = time.time()
wf = wheel("Wheel_F", RF, WF, True)
wr = wheel("Wheel_R", RR, WR, False)
wff = T.far_wheel("Wheel_F_far", RF, WF, RIM, RUBBER, RIMM)
wrf = T.far_wheel("Wheel_R_far", RR, WR, RIM, RUBBER, RIMM)
steer = build_steer()
body = build_body()
legs = build_legs()
torso = build_torso()
arms = [build_arm("ArmU_L", True, 1), build_arm("ArmU_R", True, -1), build_arm("ArmF_L", False, 1), build_arm("ArmF_R", False, -1)]
print(f"built in {time.time() - t0:.1f}s", flush=True)
for o in (wf, wff): o.location = A_F
for o in (wr, wrf): o.location = A_R
T.set_origin(steer, H)
T.set_origin(torso, HIP)
pieces = [body, steer, wf, wr, legs, torso, *arms, wff, wrf]
T.to_export(pieces)

T.bake_vertex_ao(pieces, os.path.join(OUT, ".aocache"), BAKE, samples=32)
T.export_glb(pieces, os.path.join(OUT, "scooter.raw.glb"))
info = {
    "note": "tools/blender/scooter.py: glTF frame (x left, y up, z forward), metres, origin = the ground midway between the axles",
    "kind": "scooter",
    "wheelbase": WB,
    "wheels": {"F": {"pos": gl(A_F), "r": RF, "crown": WF / 2}, "R": {"pos": gl(A_R), "r": RR, "crown": WR / 2}},
    "steer": {"pivot": gl(H), "axis": gl(AXD), "rake": round(math.degrees(RAKE), 2), "trail": TRAIL},
    "rider": {"hip": gl(HIP), "shoulder": {"L": gl(SHOULDER[1]), "R": gl(SHOULDER[-1])}, "grip": {"L": gl(GRIP[1]), "R": gl(GRIP[-1])},
              "upper": ARM_U, "fore": ARM_F, "elbowOut": 0.55, "eye": gl(EYE)},
    "lamps": {"head": gl(Vector((HS_X(0) + 0.165, 0, 1.012))), "tail": gl(Vector((-0.985, 0, 0.560)))},
    "sideStand": {"lean_deg": 7.0, "contact": gl(Vector((-0.08, 0.30, 0.0))), "side": "left"},
    "size": [0.76, 1.32, 1.99],
    "slots": sorted({m.name for o in pieces for m in o.data.materials}),
    "tris": {o.name: K.tris(o) for o in pieces},
    "ao": "vertex (COLOR_0.r)",
}
with open(os.path.join(OUT, "scooter.json"), "w") as f: json.dump(info, f, indent=1)
print("SCOOTER tris", info["tris"], "total (no far)", sum(v for k, v in info["tris"].items() if not k.endswith("_far")), flush=True)

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sun, cam = T.preview_setup(sun_elev=38, sun_az=145)
    for o in (wff, wrf): o.hide_render = True
    for side, s_ in (("L", 1), ("R", -1)):
        E_ = T.two_bone(SHOULDER[s_], GRIP[s_], ARM_U, ARM_F, (-0.2, s_ * 0.55, -1))
        T.pose_segment(bpy.data.objects[f"ArmU_{side}"], SHOULDER[s_], E_)
        T.pose_segment(bpy.data.objects[f"ArmF_{side}"], E_, GRIP[s_])
    scn.cycles.samples = 48
    # (build frame turned: forward = -Y, left = +X)
    K.render(cam, os.path.join(PREVIEW, "scooter_34front.jpg"), (2.3, -3.0, 1.45), (0, -0.15, 0.62), lens=40)
    K.render(cam, os.path.join(PREVIEW, "scooter_side.jpg"), (-4.4, 0, 0.85), (0, 0, 0.62), lens=45)
    K.render(cam, os.path.join(PREVIEW, "scooter_34rear.jpg"), (2.4, 2.9, 1.5), (0, 0.1, 0.6), lens=40)
    K.render(cam, os.path.join(PREVIEW, "scooter_rider_detail.jpg"), (1.15, -1.7, 1.75), (0, -0.15, 1.2), lens=42)
    if "--nobike" in ARGS: pass
