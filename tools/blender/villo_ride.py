"""THE RIDEABLE VILLO BIKE: the street kit's station bike (tools/blender/streetKit.py villo_bike: the SAME geometry,
dimensions and slot names) split into the nodes a ridden bike needs, with a pedalling commuter. Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/villo_ride.py -- models/villo [--bake] [--preview <dir>]
      models/villo/villo.raw.glb   the nodes below (LOD0; AO per vertex in COLOR_0), models/villo/villo.json the rig numbers

Nodes (glTF frame as the motorbike: x left, y up, z FORWARD; root origin = the ground midway between the axles):
  Body         frame, seat post + saddle, rear mudguard, the ochre skirt guards, chain case, crank axle, rear reflector
  Steer        fork + crown, stem, bar, grips, the bar's centre block, basket + carrier + stays, front mudguard, front
               lamp, front reflector (origin = the steering axis at the stem top; turns about villo.json steer.axis)
  Wheel_F/R    26" wheels, 32 spokes (origin = the axle, spin about local x); Wheel_F_far / Wheel_R_far the far stand-ins
  Cranks       the two crank arms (origin = the bottom bracket; they turn about local x; rest angle in villo.json)
  Pedal_L/R    each pedal round its spindle (origin = the spindle centre; the viewer keeps them level)
  RiderTorso   pelvis, jacket, neck, head, bicycle helmet (origin = the hip pivot over the saddle)
  Thigh_L/R    built along +X of the build frame (= the glTF +Z) from the hip joint to the knee ("thigh" m)
  Shin_L/R     from the knee to the ankle ("shin" m) + the shoe (set flat on the pedal in the rest pose)
  ArmU_L/R, ArmF_L/R   as the motorbike (two-bone IK from the shoulders to the grips)
The street kit's piece runs from its FRONT tyre contact toward the rear (its +z); this model's forward is +Z and the
street kit's origin is at villo.json kitFront.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, Part
import twowheel_kit as T
import rider_kit as RK
from twowheel_kit import gl, ellipsoid, cyl_between

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/villo")
os.makedirs(OUT, exist_ok=True)
BAKE = "--bake" in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)

# the street kit's slots (viewer/streetkit/streetKit.js SLOTS) + the rider's
FRAME = K.mat("bike_frame", (0.68, 0.69, 0.7), 0.3, 0.7)
RUBBER = K.mat("bike_black", (0.02, 0.02, 0.02), 0.75, 0.0)
CHROME = K.mat("bike_chrome", (0.75, 0.75, 0.75), 0.2, 1.0)
REFL = K.mat("reflector", (0.9, 0.35, 0.02), 0.3, 0.0)
OCHRE = K.mat("villo_ochre", (0.85, 0.6, 0.04), 0.4, 0.0)
HELMET = K.mat("Helmet", (0.15, 0.35, 0.55), 0.35, 0.0)
JACKET = K.mat("Jacket", (0.32, 0.30, 0.22), 0.75)
TROUSERS = K.mat("Trousers", (0.10, 0.14, 0.24), 0.8)
BOOT = K.mat("Boot", (0.75, 0.75, 0.72), 0.6)
SKIN = K.mat("Skin", (0.62, 0.45, 0.36), 0.55)
PLASTIC = K.mat("Plastic", (0.035, 0.035, 0.04), 0.55)
SOLE = K.mat("Rubber", (0.025, 0.025, 0.025), 0.85)

# ------------------------------------------------------------------------------------------------ the street kit's helpers (copied)
def box(P, mat, c, s, bevel=0.003, grain=Zv, segs=2, rot=None):
    P.add_bm(bm_box(*s, bevel, segs), mat, grain, M(c, rot or (0, 0, 0)))

def span(P, mat, x0, x1, y0, y1, z0, z1, bevel=0.003, grain=None, segs=2):
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    if grain is None: grain = X if sx >= max(sy, sz) else (Y if sy >= sz else Zv)
    box(P, mat, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (sx, sy, sz), bevel, grain, segs)

def rings_strip(r0, r1, smooth=True, out=None):
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in r0]; b = [bm.verts.new(p) for p in r1]
    n = len(a)
    for k in range(n):
        f = bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]]); f.smooth = smooth
        if out is not None:
            f.normal_update()
            if f.normal.dot(Vector(out(f.calc_center_median()))) < 0: f.normal_flip()
    bm.normal_update()
    return bm

def tube(P, mat, pts, r, segs=12):
    pts = [Vector(p) for p in pts]
    if len(pts) > 2:
        step = 5 * 2 * math.pi * r / segs
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            n = max(1, math.ceil((b - a).length / step))
            out += [a.lerp(b, k / n) for k in range(1, n + 1)]
        pts = out
    P.add_bm(bm_tube_path(pts, r, segs), mat, None)

def wheel(P, yc, r=0.33, spokes=32):
    c = Vector((0, yc, r))
    rot = Matrix.Rotation(math.pi / 2, 4, "Y")
    P.add_bm(K.bm_torus(r - 0.022, 0.022, 36, 8), RUBBER, None, Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.add_bm(K.bm_torus(r - 0.05, 0.011, 36, 6, 1.0), CHROME, None, Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.add_bm(bm_cyl(0.025, 0.11, 16, 0.004), CHROME, Zv, Matrix.Translation(c + Vector((-0.055, 0, 0))) @ rot)
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        side = 0.045 if k % 2 else -0.045
        p0 = c + Vector((side, math.cos(a + 0.2) * 0.022, math.sin(a + 0.2) * 0.022))
        p1 = c + Vector((0, math.cos(a) * (r - 0.058), math.sin(a) * (r - 0.058)))
        P.add_bm(bm_tube_path([p0, p1], 0.0012, 3, cap=False), CHROME, None)

def sector_plate(P, mat, x, s, yc, zc, r0, r1, a0, a1, step, t=0.004):
    A = [math.radians(a) for a in range(a0, a1 + 1, step)]
    out = [(yc + math.cos(a) * r1, zc + math.sin(a) * r1) for a in A]
    inn = [(yc + math.cos(a) * r0, zc + math.sin(a) * r0) for a in A]
    for xx, nrm in ((x, s), (x - s * t, -s)):
        bm = bmesh.new()
        vo = [bm.verts.new((xx, y, z)) for y, z in out]; vi = [bm.verts.new((xx, y, z)) for y, z in inn]
        for k in range(len(A) - 1):
            f = bm.faces.new([vo[k], vo[k + 1], vi[k + 1], vi[k]]); f.normal_update()
            if f.normal.x * nrm < 0: f.normal_flip()
        P.add_bm(bm, mat, Y)
    ring = out + inn[::-1]
    cy = sum(p[0] for p in ring) / len(ring); cz = sum(p[1] for p in ring) / len(ring)
    rim = [(x, y, z) for y, z in ring]; rim2 = [(x - s * t, y, z) for y, z in ring]
    def away(c):
        dy, dz = c.y - yc, c.z - zc
        rr = math.hypot(dy, dz)
        if abs(rr - r1) < 0.004: return (0, dy, dz)
        if abs(rr - r0) < 0.004: return (0, -dy, -dz)
        return (0, c.y - cy, c.z - cz)
    P.add_bm(rings_strip(rim, rim2, False, away), mat, Y)

def band_xy_yz(pts, w, t):
    bm = bmesh.new()
    n = len(pts); rings = []
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        tg = (b - a).normalized(); nr = Vector((0, -tg.z, tg.y))
        p = pts[i]
        rings.append([bm.verts.new(p + Vector((u, 0, 0)) + nr * v) for u, v in ((-w / 2, -t / 2), (w / 2, -t / 2), (w / 2, t / 2), (-w / 2, t / 2))])
    for i in range(n - 1):
        for k in range(4):
            f = bm.faces.new([rings[i][k], rings[i][(k + 1) % 4], rings[i + 1][(k + 1) % 4], rings[i + 1][k]]); f.smooth = k % 2 == 1
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

# ------------------------------------------------------------------------------------------------ the bike (street kit frame), split
R = 0.33
yf, yr = 0.0, -1.12
KIT_BB = Vector((0, -0.70, 0.28))
KIT_HT0, KIT_HT1 = Vector((0, -0.22, 0.62)), Vector((0, -0.27, 0.82))
CRANK_A = 0.6                              # the right crank's angle in the street kit (above forward)

def build_bike():
    PB, PS, PWF, PWR, PC, PPL, PPR = (Part(n) for n in ("Body", "Steer", "Wheel_F", "Wheel_R", "Cranks", "Pedal_L", "Pedal_R"))
    wheel(PWF, yf, R); wheel(PWR, yr, R)
    bb, ht0, ht1 = KIT_BB, KIT_HT0, KIT_HT1
    st1 = Vector((0, -0.84, 0.78))
    rax = Vector((0, yr, R)); fax = Vector((0, yf, R))
    curve = [ht0, Vector((0, -0.33, 0.47)), Vector((0, -0.44, 0.34)), Vector((0, -0.57, 0.28)), bb]
    tube(PB, FRAME, curve, 0.024, 18)
    tube(PB, FRAME, [bb, Vector((0, -0.77, 0.53)), st1], 0.02, 18)
    tube(PB, FRAME, [ht0 + (ht0 - ht1) * 0.15, ht1 + (ht1 - ht0) * 0.15], 0.026, 14)
    span(PS, FRAME, -0.066, 0.066, ht0.y - 0.03, ht0.y + 0.03, ht0.z - 0.05, ht0.z - 0.015, 0.006, X)
    for s in (-1, 1):
        tube(PB, FRAME, [bb + Vector((s * 0.042, -0.04, 0)), rax + Vector((s * 0.058, 0, 0))], 0.011, 8)
        tube(PB, FRAME, [st1 + Vector((s * 0.034, 0.0, -0.06)), rax + Vector((s * 0.058, 0, 0))], 0.009, 8)
        tube(PS, FRAME, [Vector((s * 0.045, ht0.y, ht0.z - 0.045)), Vector((s * 0.05, -0.12, 0.47)), fax + Vector((s * 0.055, 0, 0))], 0.012, 8)
    tube(PB, CHROME, [st1, Vector((0, -0.87, 0.93))], 0.013, 10)
    PB.add_bm(bm_box(0.17, 0.27, 0.06, 0.015, 4), RUBBER, Y, M((0, -0.90, 0.965)))
    tube(PS, FRAME, [ht1, Vector((0, -0.27, 0.98))], 0.016, 10)
    bar = [Vector((-0.22, -0.36, 1.0)), Vector((-0.08, -0.27, 0.99)), Vector((0.08, -0.27, 0.99)), Vector((0.22, -0.36, 1.0))]
    tube(PS, RUBBER, bar, 0.012, 18)
    for s in (-1, 1): tube(PS, RUBBER, [Vector((s * 0.215, -0.355, 1.0)), Vector((s * 0.31, -0.46, 1.025))], 0.017, 14)
    span(PS, RUBBER, -0.05, 0.05, -0.25, -0.21, 0.99, 1.04, 0.01, X)
    bx0, bx1, by0, by1, bz0, bz1 = -0.17, 0.17, -0.13, 0.17, 0.80, 1.02
    for z in (bz0, bz1):
        tube(PS, FRAME, [Vector((bx0, by0, z)), Vector((bx1, by0, z)), Vector((bx1, by1, z)), Vector((bx0, by1, z)), Vector((bx0, by0, z))], 0.005, 6)
    for k in range(1, 8):
        x = bx0 + (bx1 - bx0) * k / 8
        tube(PS, FRAME, [Vector((x, by1, bz0 + 0.004)), Vector((x, by1, bz1 - 0.004))], 0.0025, 4)
        tube(PS, FRAME, [Vector((x, by0, bz0 + 0.004)), Vector((x, by0, bz1 - 0.004))], 0.0025, 4)
        tube(PS, FRAME, [Vector((x, by0 + 0.004, bz0 - 0.003)), Vector((x, by1 - 0.004, bz0 - 0.003))], 0.0025, 4)
    for k in range(1, 7):
        y = by0 + (by1 - by0) * k / 7
        for x in (bx0, bx1): tube(PS, FRAME, [Vector((x, y, bz0 + 0.004)), Vector((x, y, bz1 - 0.004))], 0.0025, 4)
    span(PS, FRAME, -0.06, 0.06, by0 - 0.02, by0 + 0.02, 0.76, 0.80, 0.004, X)
    for s in (-1, 1): tube(PS, FRAME, [Vector((s * 0.12, 0.05, bz0 - 0.004)), Vector((s * 0.075, 0.01, 0.42))], 0.006, 6)
    span(PS, REFL, -0.03, 0.03, by1 + 0.006, by1 + 0.012, 0.88, 0.94, 0.002, X)
    for P_, yc, a0, a1 in ((PS, yf, 25, 165), (PB, yr, 10, 175)):
        pts = [Vector((0, yc + math.cos(math.radians(a)) * (R + 0.03), R + math.sin(math.radians(a)) * (R + 0.03))) for a in range(a0, a1 + 1, 10)]
        P_.add_bm(band_xy_yz(pts, 0.06, 0.003), FRAME, Y)
    for s in (-1, 1):
        sector_plate(PB, OCHRE, s * 0.085, s, yr, R, 0.07, R + 0.02, 10, 140, 10)
    tube(PB, FRAME, [bb + Vector((0.09, 0.06, 0)), rax + Vector((0.09, -0.04, 0))], 0.034, 12)
    for s, a, PP in ((1, CRANK_A, PPR), (-1, CRANK_A + math.pi, PPL)):
        x0 = s * 0.13
        p = bb + Vector((x0, math.cos(a) * 0.17, math.sin(a) * 0.17))
        tube(PC, RUBBER, [bb + Vector((x0, 0, 0)), p], 0.011, 6)
        px = p.x + s * 0.05
        span(PP, RUBBER, px - 0.045, px + 0.045, p.y - 0.035, p.y + 0.035, p.z - 0.012, p.z + 0.012, 0.004, X)
        tube(PP, CHROME, [Vector((p.x - s * 0.004, p.y, p.z)), Vector((p.x + s * 0.004, p.y, p.z))], 0.008, 8)   # the spindle's stub into the crank eye
    PB.add_bm(bm_cyl(0.022, 0.26, 18, 0.003), FRAME, Zv, Matrix.Translation(bb + Vector((-0.13, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y"))
    span(PB, REFL, -0.03, 0.03, yr - 0.372, yr - 0.357, 0.50, 0.54, 0.003, X)      # (the kit floats it 4 cm off the mudguard end: moved onto it)
    PS.add_bm(bm_cyl(0.028, 0.05, 12, 0.006), RUBBER, Y, M((0, by0 - 0.02, 0.72), (math.pi / 2, 0, 0)))
    objs = [p.to_object(smooth_angle=28) for p in (PB, PS, PWF, PWR, PC, PPL, PPR)]
    return objs

# kit frame (x right, y forward, front contact at the origin) -> build frame (X forward, Y left, Z up, centred between the axles)
KIT2B = Matrix.Translation((0.56, 0, 0)) @ Matrix.Rotation(-math.pi / 2, 4, "Z")
def kb(v): return (KIT2B @ Vector(v).to_4d()).to_3d()

WB = 1.12
A_F, A_R = kb(Vector((0, yf, R))), kb(Vector((0, yr, R)))
BB = kb(KIT_BB)
HT0, HT1 = kb(KIT_HT0), kb(KIT_HT1)
AXD = (HT1 - HT0).normalized()
H = HT0 + AXD * ((0.98 - HT0.z) / AXD.z)                     # the steer pivot: the head axis at the stem top
CRANK = 0.17
PEDAL_X = 0.18
def pedal_at(a, side):
    """the pedal spindle centre for a crank angle a (rad, from forward toward up; the right crank's angle)"""
    aa = a if side < 0 else a + math.pi
    return BB + Vector((math.cos(aa) * CRANK, side * PEDAL_X, math.sin(aa) * CRANK))

# ------------------------------------------------------------------------------------------------ the cyclist
HIP = Vector((-0.355, 0.0, 1.075))
LEAN = math.radians(23)
SPINE = Vector((math.sin(LEAN), 0, math.cos(LEAN)))
FWD_T = Vector((math.cos(LEAN), 0, -math.sin(LEAN)))
def spine(s): return HIP + SPINE * s
SHOULDER = {s: spine(0.48) + Vector((0.0, s * 0.180, 0)) for s in (1, -1)}
GRIP = {s: kb(Vector((-s * 0.262, -0.407, 1.012))) for s in (1, -1)}
HIPJ = {s: HIP + Vector((0.0, s * 0.092, -0.020)) for s in (1, -1)}
ARM_U, ARM_F = 0.30, 0.34
THIGH, SHIN = 0.45, 0.45
HC = spine(0.72) + FWD_T * 0.035
HTILT = Matrix.Rotation(math.radians(-14), 3, "Y")         # the head up, looking ahead
EYE = HC + HTILT @ Vector((0.085, 0, 0.012))
FOOT_B = Vector((-0.125, 0, 0.012 + 0.090))                # the ankle from the pedal spindle, foot flat (ball over the spindle)
REST_A = 0.0                                               # the rest pose: the right crank forward (3 o'clock)

def build_torso():
    P = K.Part("RiderTorso")
    secs = []
    for i in range(9):                                      # the pelvis on the saddle
        t = i / 8
        x = HIP.x - 0.10 + 0.20 * t
        k = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.5
        secs.append(((x, 0, HIP.z - 0.035), (0, 0.160 * k, 0), (0, 0, 0.080 * k), (0, 0, 0.070 * k), 2.6))
    P.add_bm(T.loft(secs, n=28), TROUSERS)
    keys = [(0.02, 0.155, 0.108), (0.16, 0.150, 0.102), (0.30, 0.175, 0.114), (0.42, 0.192, 0.108), (0.50, 0.165, 0.088), (0.55, 0.082, 0.060)]
    RK.torso(P, HIP, SPINE, FWD_T, keys, JACKET, zip_mat=PLASTIC)
    for s in (1, -1):
        P.add_bm(ellipsoid(SHOULDER[s], (0.058, 0.056, 0.058), 16, 8), JACKET)
    RK.head(P, HC, HTILT, SKIN, neck_from=spine(0.52), neck_r=0.050)
    RK.bike_helmet(P, HC, HTILT, HELMET, PLASTIC)
    return P.to_object(smooth_angle=50)

def build_thigh(name):
    P = K.Part(name)
    P.add_bm(T.tube([(0, 0, 0), (THIGH * 0.5, 0, 0), (THIGH - 0.025, 0, 0)], [0.080, 0.068, 0.055], segs=16), TROUSERS)
    P.add_bm(ellipsoid((THIGH, 0, 0), (0.057, 0.057, 0.057), 16, 8), TROUSERS)
    return P.to_object(smooth_angle=50)

def leg_pose(a, s):
    """(hip, knee, ankle, pedal) for crank angle a, side s (+1 left)"""
    ped = pedal_at(a, s)
    ank = ped + FOOT_B
    knee = T.two_bone(HIPJ[s], ank, THIGH, SHIN, (1, s * 0.15, 0.2))
    return HIPJ[s], knee, ank, ped

def build_shin(name, s):
    """the shin along +X from the knee + the shoe, placed so that in the rest pose the sole lies flat on the pedal"""
    P = K.Part(name)
    P.add_bm(T.tube([(0, 0, 0), (SHIN * 0.5, 0, 0), (SHIN - 0.045, 0, 0)], [0.052, 0.046, 0.041], segs=16), TROUSERS)
    P.add_bm(cyl_between((SHIN - 0.075, 0, 0), (SHIN - 0.02, 0, 0), 0.046, segs=16, bevel=0.004), TROUSERS)   # the hem
    hip, knee, ank, ped = leg_pose(REST_A, s)
    q = Vector((1, 0, 0)).rotation_difference((ank - knee).normalized())
    inv = q.to_matrix().inverted().to_4x4()
    # the shoe in the world rest pose (heel 0.19 behind the ball, the sole on the pedal's top), into the shin's frame
    L = Matrix.Translation((SHIN, 0, 0)) @ inv @ Matrix.Translation(-ank)
    class _Into:                                            # (the shoe's parts go into P moved by L, each keeping its slot)
        def add_bm(self, bm, m, grain=None, matrix=None):
            if matrix is not None: bm.transform(matrix)
            bm.transform(L); P.add_bm(bm, m, grain)
    heel = ped + Vector((-0.19, 0, 0.012))
    RK.shoe(_Into(), heel, 0.27, s, BOOT, SOLE, hw=0.044, high=0.092)
    o = P.to_object(smooth_angle=50)
    return o, (inv @ (ped - ank).to_4d()).to_3d()

def build_arm(name, upper, side):
    P = K.Part(name)
    if upper: RK.sleeve_upper(P, ARM_U, JACKET)
    else:
        RK.sleeve_fore(P, ARM_F, JACKET, SKIN, cuff=True)
        RK.fist(P, (ARM_F, 0, 0), side, SKIN, grip_r=0.017)
    return P.to_object(smooth_angle=50)

# ------------------------------------------------------------------------------------------------ build all
t0 = time.time()
body, steer, wf, wr, cranks, pl, pr = build_bike()
for o in (body, steer, wf, wr, cranks, pl, pr): o.data.transform(KIT2B)
wff = T.far_wheel("Wheel_F_far", R, 0.044, R - 0.05, RUBBER, CHROME, hub_w=0.012)
wrf = T.far_wheel("Wheel_R_far", R, 0.044, R - 0.05, RUBBER, CHROME, hub_w=0.012)
T.set_origin(wf, A_F); T.set_origin(wr, A_R)
wff.location = A_F; wrf.location = A_R
T.set_origin(steer, H)
T.set_origin(cranks, BB)
T.set_origin(pl, pedal_at(CRANK_A, 1)); T.set_origin(pr, pedal_at(CRANK_A, -1))
torso = build_torso()
T.set_origin(torso, HIP)
thighs = [build_thigh("Thigh_L"), build_thigh("Thigh_R")]
(shinL, footL), (shinR, footR) = build_shin("Shin_L", 1), build_shin("Shin_R", -1)
arms = [build_arm("ArmU_L", True, 1), build_arm("ArmU_R", True, -1), build_arm("ArmF_L", False, 1), build_arm("ArmF_R", False, -1)]
print(f"built in {time.time() - t0:.1f}s", flush=True)
pieces = [body, steer, wf, wr, cranks, pl, pr, torso, *thighs, shinL, shinR, *arms, wff, wrf]
T.to_export(pieces)
T.bake_vertex_ao(pieces, os.path.join(OUT, ".aocache"), BAKE, samples=32)
T.export_glb(pieces, os.path.join(OUT, "villo.raw.glb"))
crank_rest = math.degrees(CRANK_A)                          # (the street kit's crank: forward = the kit's +y = this +X)
info = {
    "note": "tools/blender/villo_ride.py: glTF frame (x left, y up, z forward), metres, origin = the ground midway between the axles; the street kit's villo_bike split for riding",
    "kind": "villo",
    "forward": "+Z",
    "kitFront": gl(kb(Vector((0, 0, 0)))),
    "wheelbase": WB,
    "wheels": {"F": {"pos": gl(A_F), "r": R, "crown": 0.022}, "R": {"pos": gl(A_R), "r": R, "crown": 0.022}},
    "steer": {"pivot": gl(H), "axis": gl(AXD), "rake": round(math.degrees(math.atan2(-AXD.x, AXD.z)), 2)},
    "bb": gl(BB), "crank": CRANK, "pedalX": PEDAL_X,
    "crankRest_deg": {"R": round(crank_rest, 2), "L": round(crank_rest + 180, 2), "note": "the Cranks node as built: the right arm at this angle from forward (+Z) toward up (+Y); the cranks turn about local x; forward pedalling DEcreases... see 'pedalSense'"},
    "pedalSense": "pedalling forward the right pedal goes forward -> down -> back -> up: the angle (from +Z toward +Y) decreases",
    "rider": {"hip": gl(HIP), "hipJoint": {"L": gl(HIPJ[1]), "R": gl(HIPJ[-1])}, "thigh": THIGH, "shin": SHIN,
              "foot": gl(footL), "footBike": gl(-FOOT_B), "restCrank_deg": math.degrees(REST_A),
              "shoulder": {"L": gl(SHOULDER[1]), "R": gl(SHOULDER[-1])}, "grip": {"L": gl(GRIP[1]), "R": gl(GRIP[-1])},
              "upper": ARM_U, "fore": ARM_F, "elbowOut": 0.30, "eye": gl(EYE)},
    "lamps": {"head": gl(kb(Vector((0, -0.13 - 0.045, 0.72)))), "tail": gl(kb(Vector((0, yr - 0.372, 0.52))))},
    "size": [0.62, 1.95, round(max(v.co.x for v in body.data.vertices) - min(v.co.x for v in body.data.vertices), 3)],
    "slots": sorted({m.name for o in pieces for m in o.data.materials}),
    "tris": {o.name: K.tris(o) for o in pieces},
    "ao": "vertex (COLOR_0.r)",
}
with open(os.path.join(OUT, "villo.json"), "w") as f: json.dump(info, f, indent=1)
print("VILLO tris", info["tris"], "total (no far)", sum(v for k, v in info["tris"].items() if not k.endswith("_far")), flush=True)

if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    sun, cam = T.preview_setup(sun_elev=38, sun_az=145)
    for o in (wff, wrf): o.hide_render = True
    # pose as the viewer would at the rest crank angle: cranks + pedals at REST_A, legs by IK, arms by IK
    rot = math.radians(math.degrees(REST_A) - crank_rest)
    cranks.matrix_world = T.R_EXPORT @ Matrix.Translation(BB) @ Matrix.Rotation(-rot, 4, "Y") @ T.R_EXPORT.inverted()
    for o, s in ((pl, 1), (pr, -1)):
        o.matrix_world = T.R_EXPORT @ Matrix.Translation(pedal_at(REST_A, s)) @ T.R_EXPORT.inverted()
    for side, s in (("L", 1), ("R", -1)):
        hip, knee, ank, ped = leg_pose(REST_A, s)
        T.pose_segment(bpy.data.objects[f"Thigh_{side}"], hip, knee)
        T.pose_segment(bpy.data.objects[f"Shin_{side}"], knee, ank)
        E_ = T.two_bone(SHOULDER[s], GRIP[s], ARM_U, ARM_F, (-0.3, s * 0.3, -1))
        T.pose_segment(bpy.data.objects[f"ArmU_{side}"], SHOULDER[s], E_)
        T.pose_segment(bpy.data.objects[f"ArmF_{side}"], E_, GRIP[s])
    scn.cycles.samples = 48
    K.render(cam, os.path.join(PREVIEW, "villo_ride_34front.jpg"), (2.2, -2.9, 1.5), (0, -0.1, 0.8), lens=40)
    K.render(cam, os.path.join(PREVIEW, "villo_ride_side.jpg"), (-4.4, 0, 1.0), (0, 0, 0.85), lens=42)
