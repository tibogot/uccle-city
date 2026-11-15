"""THE PLAYER'S MOTORBIKE: an invented modern naked / streetfighter (~1000 cc inline four class; no real brand, no logo),
built entirely in code (no hand modelling), with a stylised rider fixed to it. Deterministic: re-run to change it.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/motorbike.py -- models/moto [--bake] [--preview <dir>]
      models/moto/moto.raw.glb   the pieces (nodes below), LOD0 only: the viewer makes LOD1 / LOD2 with meshoptimizer
      models/moto/moto.json      the rig numbers the viewer needs (wheel centres, steering axis, rider joints, lamps)
      models/moto/moto_ao.png    (--bake) one AO atlas on TEXCOORD_1, each piece baked ALONE on a ground plane (GPU / OptiX,
                                 per-piece cache in models/moto/.aocache: unchanged pieces are not re-baked)

Nodes (each its own origin, so the viewer can move it):
  Body        frame, engine, exhaust, tank, seat, tail, swingarm, shock, chain, pegs, rear caliper (origin: the ground
              midway between the axles)
  Steer       fork, yokes, handlebar, grips, levers, mirrors, headlight, flyscreen, dash, front calipers, front fender
              (origin: the steering axis at the top yoke; it turns about moto.json steer.axis)
  Wheel_F     front wheel: tyre, rim, two discs (origin: the axle; spins about its local x)
  Wheel_R     rear wheel: tyre, rim, disc, sprocket
  RiderLegs   pelvis, thighs, shins, boots (fixed to the bike)
  RiderTorso  torso, shoulders, neck, helmet + visor (origin: the hip pivot: it tucks forward at speed)
  ArmU_L/R    upper arms, ArmF_L/R forearms + gloves: built along +Z from their joint (glTF frame): the viewer solves a
              two-bone IK from the shoulder to the grip every frame (the hands stay on the bars while steering / tucking)

Real proportions (looked up on spec sheets / photos of current naked 1000s, never traced): wheelbase 1.45 m, rake 24.5 deg,
trail 100 mm, seat 0.83 m, tyres 120/70 ZR17 (r 0.300) and 190/55 ZR17 (r 0.320), 320 mm front discs, 220 mm rear,
bars ~0.74 m wide, overall ~2.10 m long.

Material slots (NAMED, the viewer maps them by name; colours here are for the Blender previews only):
  Paint (tank, scoops, tail, fender), Frame (trellis), Metal (cast alloy: swingarm, yokes, covers), Engine (dark engine
  castings), Chrome (headers, stanchions), Anodized (fork tubes, calipers, spring), Rubber (tyres, grips, boots, gloves),
  Plastic (black plastics), Seat, Rim, Disc, Glass (flyscreen, dash, mirrors), HeadLight, TailLight, Plate,
  Suit (rider leathers), Helmet, Visor.
Build frame: X forward, Y left, Z up; exported turned so that glTF +Z = forward, +X = left (as the car).
"""
import bpy, bmesh, math, os, sys, json, hashlib, time
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/moto")
os.makedirs(OUT, exist_ok=True)
BAKE = "--bake" in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None

K.reset()
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ dimensions
WB = 1.45
XF, XR = WB / 2, -WB / 2
RF, RR = 0.300, 0.320              # tyre radii
WF, WR = 0.122, 0.192              # tyre section widths
RIM = 0.216                        # 17" bead seat radius
RAKE = math.radians(24.5)
TRAIL = 0.100
AXD = Vector((-math.sin(RAKE), 0, math.cos(RAKE)))          # steering axis, pointing up
AXG = Vector((XF + TRAIL, 0, 0))                            # where it meets the ground
A_F = Vector((XF, 0, RF)); A_R = Vector((XR, 0, RR))
def axis_at(z): return AXG + AXD * (z / AXD.z)
FORK_Y = 0.104
def fork(s, y=0.0): return A_F + AXD * s + Vector((0, y, 0))
H = axis_at(fork(0.70).z)                                   # steer pivot: the axis at the top yoke

# ------------------------------------------------------------------------------------------------ materials
mat = K.mat
PAINT = mat("Paint", (0.50, 0.03, 0.035), 0.25, 0.3)
FRAME = mat("Frame", (0.07, 0.075, 0.08), 0.45, 0.6)
METAL = mat("Metal", (0.55, 0.56, 0.58), 0.35, 1.0)
ENGINE = mat("Engine", (0.10, 0.10, 0.11), 0.5, 0.7)
CHROME = mat("Chrome", (0.85, 0.85, 0.86), 0.12, 1.0)
ANOD = mat("Anodized", (0.75, 0.52, 0.12), 0.3, 1.0)
RUBBER = mat("Rubber", (0.025, 0.025, 0.025), 0.85)
PLASTIC = mat("Plastic", (0.035, 0.035, 0.04), 0.55)
SEAT = mat("Seat", (0.04, 0.04, 0.045), 0.75)
RIMM = mat("Rim", (0.03, 0.03, 0.035), 0.35, 0.8)
DISC = mat("Disc", (0.50, 0.50, 0.52), 0.3, 1.0)
GLASS = mat("Glass", (0.03, 0.035, 0.04), 0.05)
HEAD = mat("HeadLight", (0.85, 0.88, 0.92), 0.1, 0.5)
TAIL = mat("TailLight", (0.45, 0.02, 0.02), 0.15)
PLATE = mat("Plate", (0.9, 0.9, 0.9), 0.4)
SUIT = mat("Suit", (0.04, 0.04, 0.05), 0.6)
HELMET = mat("Helmet", (0.85, 0.85, 0.86), 0.2, 0.1)
VISOR = mat("Visor", (0.02, 0.02, 0.025), 0.05)

# ------------------------------------------------------------------------------------------------ mesh helpers
def smooth(bm):
    for f in bm.faces: f.smooth = True
    return bm

def sexp(c, p):
    """superellipse coordinate: sign(c) |c|^(2/p)"""
    return math.copysign(abs(c) ** (2.0 / p), c)

def loft(sections, n=24, cap=True):
    """sections: [(centre, U, V, Vb, p)] -> a closed lofted solid; each ring = centre + U sx + (V if up else Vb) sy
    (U, V, Vb vectors: half axes; V above, Vb below), superellipse exponent p"""
    bm = bmesh.new()
    rings = []
    for (c, U, V, Vb, p) in sections:
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            sx, sy = sexp(math.cos(a), p), sexp(math.sin(a), p)
            ring.append(bm.verts.new(Vector(c) + Vector(U) * sx + (Vector(V) if sy >= 0 else Vector(Vb)) * sy))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n):
            bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
    if cap:
        bm.faces.new(list(reversed(rings[0])))
        bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)

def sample(keys, t):
    """Catmull-Rom through keys [(t, value...)] at t (values: tuples)"""
    ts = [k[0] for k in keys]
    if t <= ts[0]: return keys[0][1:]
    if t >= ts[-1]: return keys[-1][1:]
    i = max(j for j in range(len(ts) - 1) if ts[j] <= t)
    p0, p1, p2, p3 = keys[max(0, i - 1)], keys[i], keys[i + 1], keys[min(len(keys) - 1, i + 2)]
    u = (t - p1[0]) / (p2[0] - p1[0])
    out = []
    for j in range(1, len(p1)):
        a, b, c, d = p0[j], p1[j], p2[j], p3[j]
        out.append(0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u ** 3))
    return tuple(out)

def loft_x(keys, stations=24, n=28, p_top=2.6, p_bot=3.4, y0=0.0):
    """a body of revolution-like solid along X: keys [(x, half width, z top, z bottom)], sections across Y/Z"""
    keys = sorted(keys)
    xs = [k[0] for k in keys]
    secs = []
    for i in range(stations + 1):
        t = xs[0] + (xs[-1] - xs[0]) * (0.5 - 0.5 * math.cos(math.pi * i / stations))   # denser at the ends
        hw, zt, zb = sample(keys, t)
        zc = (zt + zb) / 2
        p = p_top
        secs.append(((t, y0, zc), (0, hw, 0), (0, 0, zt - zc), (0, 0, zt - zc), p, zb - zc))
    # asymmetric top / bottom: build directly
    bm = bmesh.new(); rings = []
    for (c, U, V, _, p, hb) in secs:
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            sy = math.sin(a)
            pp = p_top if sy >= 0 else p_bot
            sx, syy = sexp(math.cos(a), pp), sexp(sy, pp)
            z = c[2] + (V[2] * syy if syy >= 0 else -hb * syy)
            ring.append(bm.verts.new((c[0], c[1] + U[1] * sx, z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n): bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)

def tube(pts, radii, segs=14, cap=True, closed=False):
    """a round tube along a polyline with a radius per point (parallel-transport frame)"""
    pts = [Vector(p) for p in pts]
    if not isinstance(radii, (list, tuple)): radii = [radii] * len(pts)
    if len(radii) != len(pts):                       # resample the radii along the (smoothed) path
        m = len(radii) - 1; rr = []
        for i in range(len(pts)):
            f = i / max(1, len(pts) - 1) * m; j = min(m - 1, int(f)); u = f - j
            rr.append(radii[j] * (1 - u) + radii[j + 1] * u)
        radii = rr
    bm = bmesh.new(); n = len(pts)
    tans = []
    for i in range(n):
        a = pts[(i - 1) % n] if closed else pts[max(0, i - 1)]
        b = pts[(i + 1) % n] if closed else pts[min(n - 1, i + 1)]
        tans.append((b - a).normalized())
    ref = K.Z if abs(tans[0].dot(K.Z)) < 0.9 else Vector((1, 0, 0))
    nrm = tans[0].cross(ref).normalized()
    rings = []
    for i in range(n):
        if i > 0:
            ax = tans[i - 1].cross(tans[i])
            if ax.length > 1e-8:
                ang = math.acos(max(-1, min(1, tans[i - 1].dot(tans[i]))))
                nrm = (Matrix.Rotation(ang, 3, ax.normalized()) @ nrm).normalized()
        bi = tans[i].cross(nrm).normalized()
        rings.append([bm.verts.new(pts[i] + (nrm * math.cos(2 * math.pi * k / segs) + bi * math.sin(2 * math.pi * k / segs)) * radii[i]) for k in range(segs)])
    for i in range(n if closed else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]])
    if cap and not closed:
        f0 = bm.faces.new(list(reversed(rings[0]))); f1 = bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    smooth(bm)
    return bm

def bezier(p0, p1, p2, p3, n=12):
    p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    return [((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3 for t in (i / n for i in range(n + 1))]

def smooth_path(pts, per=6):
    """Catmull-Rom through points (a rounded polyline for tubes)"""
    pts = [Vector(p) for p in pts]; out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for j in range(per):
            u = j / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(pts[-1])
    return out

def ellipsoid(c, r, segs=20, rings=12, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=r, verts=bm.verts)
    if rot is not None: bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return smooth(bm)

def lathe(profile, segs=48, axis="Y", closed=True):
    """revolve [(radius, along)] round the axis (Y: a wheel's axle)"""
    bm = bmesh.new(); rings = []
    for k in range(segs):
        a = 2 * math.pi * k / segs
        ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, y, r * sa)) for (r, y) in profile])
    m = len(profile)
    for k in range(segs):
        A, B = rings[k], rings[(k + 1) % segs]
        for j in range(m if closed else m - 1):
            j2 = (j + 1) % m
            try: bm.faces.new([A[j], A[j2], B[j2], B[j]])
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)

def box(size, loc, bevel=0.004, rot=None, segs=2):
    bm = K.bm_box(*size, bevel=bevel, segs=segs)
    m = Matrix.Translation(Vector(loc)) @ (rot.to_4x4() if rot is not None else Matrix())
    bm.transform(m)
    return bm

def cyl(r, h, loc, rot=None, segs=20, bevel=0.002, r2=None):
    """a cylinder along +Z from its base centre, rotated then moved to loc"""
    bm = K.bm_cyl(r, h, segs=segs, bevel=bevel, r2=r2)
    m = Matrix.Translation(Vector(loc)) @ (rot.to_4x4() if rot is not None else Matrix())
    bm.transform(m)
    return bm

def cyl_between(a, b, r, segs=20, bevel=0.0015, r2=None):
    if r < 0.02: bevel = 0.0
    m, L = K.align_z(a, b)
    bm = K.bm_cyl(r, L, segs=segs, bevel=bevel, r2=r2)
    bm.transform(m)
    return bm

ROT_Y = Matrix.Rotation(math.pi / 2, 3, "X")        # +Z -> -Y ... (cylinders along Y)
def along_y(r, y0, y1, x, z, segs=24, bevel=0.002):
    return cyl_between((x, y0, z), (x, y1, z), r, segs=segs, bevel=bevel)

def bar_between(a, b, w, t, bevel=0.003):
    """a bevelled flat bar from a to b (w across in the XZ-ish plane, t thick along Y)"""
    m, L = K.align_z(a, b)
    bm = K.bm_box(w, t, L, bevel=bevel, segs=1)
    bm.transform(m @ Matrix.Translation((0, 0, L / 2)))
    return bm

def plate(outline_xz, y, thick, bevel=0.003, yaw=0.0):
    """a flat outline in the XZ plane extruded across Y (thick), centred on y"""
    bm = K.bm_profile_extrude(outline_xz, thick, bevel=bevel, segs=1)
    if yaw:
        cx = sum(p[0] for p in outline_xz) / len(outline_xz)
        bm.transform(Matrix.Translation((cx, 0, 0)) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Translation((-cx, 0, 0)))
    bm.transform(Matrix.Translation((0, y, 0)))
    return bm

def mirror_y(bm):
    bm.transform(Matrix.Scale(-1, 4, (0, 1, 0)))
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm

def both(fn, part, m, grain=None):
    """fn(s) -> bmesh for side s = +1 (left) and -1 (right)"""
    for s in (1, -1): part.add_bm(fn(s), m, grain)

# ------------------------------------------------------------------------------------------------ WHEELS
def tyre_profile(R, W, n=18):
    """closed cross-section (radius, y) of a tyre: rounded crown, bulging sidewalls, the beads straight down into the rim
    well (between the rim flanges, facing them 1.5 mm apart: no shallow crossing with the rim)"""
    yb = 0.43 * W
    pts = [(RIM - 0.006, yb)]
    for i in range(n + 1):                         # from the left bead over the crown to the right bead
        a = math.pi * i / n
        y = (W / 2) * math.cos(a) * (0.86 + 0.14 * math.sin(a))
        r = RIM + 0.012 + (R - RIM - 0.012) * (math.sin(a) ** 0.62)
        pts.append((r, y))
    pts.append((RIM - 0.006, -yb))
    return pts

def rim_profile(W):
    """closed rim cross-section (radius, y): flanges hugging the tyre beads, the well, the inner barrel"""
    yi = 0.43 * W + 0.0015
    left = [(RIM - 0.010, yi), (RIM + 0.006, yi), (RIM + 0.0105, yi + 0.003), (RIM + 0.007, yi + 0.0065), (RIM - 0.014, yi + 0.005)]
    inner = [(RIM - 0.024, yi - 0.004), (RIM - 0.030, 0.02)]
    right = [(r, -y) for (r, y) in reversed(left)]
    return left + inner + [(RIM - 0.030, -0.02), (RIM - 0.024, -yi + 0.004)] + right

def wheel(name, R, W, front):
    P = K.Part(name)
    P.add_bm(lathe(tyre_profile(R, W), segs=56), RUBBER, grain=(0, 1, 0))
    # rim: flanges, well, barrel
    prof = rim_profile(W)
    P.add_bm(lathe(prof, segs=56), RIMM)
    # hub
    hub_hw = 0.075 if front else 0.09
    P.add_bm(along_y(0.048, -hub_hw, hub_hw, 0, 0, segs=24, bevel=0.006), RIMM)
    P.add_bm(along_y(0.016, -hub_hw - 0.012, hub_hw + 0.012, 0, 0, segs=14, bevel=0.0), METAL)   # axle ends
    # five split spokes: each a Y from the hub to the barrel
    for k in range(5):
        a0 = 2 * math.pi * k / 5 + 0.3
        for d in (-1, 1):                          # a twin spoke: two arms apart from the hub to the barrel
            r0, r1 = 0.042, RIM - 0.026
            mid = 0.5 * (r0 + r1)
            pts = [(r0 * math.cos(a0 + d * 0.30), 0, r0 * math.sin(a0 + d * 0.30)),
                   (mid * math.cos(a0 + d * 0.13), 0, mid * math.sin(a0 + d * 0.13)),
                   (r1 * math.cos(a0 + d * 0.12), 0, r1 * math.sin(a0 + d * 0.12))]
            sp = tube(smooth_path(pts, 3), [0.0105, 0.0085, 0.008], segs=8)
            sp.transform(Matrix.Scale(1.7, 4, (0, 1, 0)))           # flattened across: a cast spoke
            P.add_bm(sp, RIMM)
    # brake discs (petal edge) + carriers
    def disc(y, ro, ri, petals=12):
        bm = bmesh.new(); n = petals * 8; t = 0.0025
        outer = [(ro + 0.004 * math.cos(petals * 2 * math.pi * i / n)) for i in range(n)]
        rings = []
        for yy in (y - t, y + t):
            rings.append([bm.verts.new((outer[i] * math.cos(2 * math.pi * i / n), yy, outer[i] * math.sin(2 * math.pi * i / n))) for i in range(n)])
            rings.append([bm.verts.new((ri * math.cos(2 * math.pi * i / n), yy, ri * math.sin(2 * math.pi * i / n))) for i in range(n)])
        o0, i0, o1, i1 = rings
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([o0[i], o0[j], i0[j], i0[i]]); bm.faces.new([o1[i], i1[i], i1[j], o1[j]])
            bm.faces.new([o0[i], o1[i], o1[j], o0[j]]); bm.faces.new([i0[i], i0[j], i1[j], i1[i]])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.smooth = abs(f.normal.y) < 0.5
        return bm
    if front:
        for y in (0.068, -0.068):
            P.add_bm(disc(y, 0.160, 0.112), DISC)
            P.add_bm(lathe([(0.050, y - 0.003), (0.107, y - 0.003), (0.107, y + 0.003), (0.050, y + 0.003)], segs=36), RIMM)   # carrier
            for k in range(8):                                   # floating-disc bobbins
                a = 2 * math.pi * k / 8
                P.add_bm(along_y(0.007, y - 0.0045, y + 0.0045, 0.1125 * math.cos(a), 0.1125 * math.sin(a), segs=14, bevel=0.0), METAL)
    else:
        y = -0.088
        P.add_bm(disc(y, 0.110, 0.072, petals=10), DISC)
        P.add_bm(lathe([(0.046, y - 0.003), (0.069, y - 0.003), (0.069, y + 0.003), (0.046, y + 0.003)], segs=32), RIMM)
        for k in range(5):                                       # disc bolts bridging carrier and disc
            a = 2 * math.pi * k / 5
            P.add_bm(along_y(0.0065, y - 0.005, y + 0.005, 0.0705 * math.cos(a), 0.0705 * math.sin(a), segs=8, bevel=0.0), METAL)
        # sprocket (left): toothed ring
        bm = bmesh.new(); n = 42 * 2; ys = 0.098; t = 0.003
        rr = [(0.106 if i % 2 == 0 else 0.098) for i in range(n)]
        rings = []
        for yy in (ys - t, ys + t):
            rings.append([bm.verts.new((rr[i] * math.cos(2 * math.pi * i / n), yy, rr[i] * math.sin(2 * math.pi * i / n))) for i in range(n)])
            rings.append([bm.verts.new((0.05 * math.cos(2 * math.pi * i / n), yy, 0.05 * math.sin(2 * math.pi * i / n))) for i in range(n)])
        o0, i0, o1, i1 = rings
        for i in range(n):
            j = (i + 1) % n
            bm.faces.new([o0[i], o0[j], i0[j], i0[i]]); bm.faces.new([o1[i], i1[i], i1[j], o1[j]])
            bm.faces.new([o0[i], o1[i], o1[j], o0[j]]); bm.faces.new([i0[i], i0[j], i1[j], i1[i]])
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        for f in bm.faces: f.smooth = False
        P.add_bm(bm, METAL)
    o = P.to_object(smooth_angle=40)
    return o

# ------------------------------------------------------------------------------------------------ STEER (fork, bars, lights)
def build_steer():
    P = K.Part("Steer")
    for s in (1, -1):
        y = s * FORK_Y
        # upside-down fork: chrome stanchion low, big anodized outer tube high, axle foot
        P.add_bm(cyl_between(fork(-0.035, y), fork(0.33, y), 0.0235, segs=20), CHROME)
        P.add_bm(cyl_between(fork(0.29, y), fork(0.745, y), 0.0305, segs=24, bevel=0.003), ANOD)
        P.add_bm(cyl_between(fork(0.745, y) - AXD * 0.003, fork(0.77, y), 0.022, segs=16, bevel=0.003), METAL)   # preload cap
        foot = box((0.085, 0.062, 0.11), fork(0.0, y) + AXD * 0.015, bevel=0.012, rot=Matrix.Rotation(-RAKE, 3, "Y"))
        P.add_bm(foot, METAL)
        # radial 4-pot caliper behind the leg, straddling the disc
        dy = 0.068 * s
        ang = math.radians(152)
        cc = A_F + Vector((0.138 * math.cos(ang), 0, 0.138 * math.sin(ang)))
        rotc = Matrix.Rotation(-(ang - math.pi / 2), 3, "Y")
        P.add_bm(box((0.026, 0.044, 0.105), (cc.x, dy, cc.z), bevel=0.009, rot=rotc), ANOD)
        # mount ears from the caliper to the foot
        P.add_bm(bar_between(Vector((cc.x, y - 0.008 * s, cc.z)), fork(0.012, y - 0.008 * s), 0.03, 0.016), METAL)
    # yokes
    for s_, th in ((0.52, 0.03), (0.70, 0.022)):
        a, b = fork(s_, 0), axis_at(fork(s_, 0).z)
        c = (a + b) / 2
        rot = Matrix.Rotation(-RAKE, 3, "Y")
        P.add_bm(box((abs(a.x - b.x) / math.cos(RAKE) + 0.085, 2 * FORK_Y + 0.07, th), c, bevel=0.012, rot=rot), METAL)
    # steering stem nut on the top yoke
    P.add_bm(cyl_between(H, H + AXD * 0.022, 0.018, segs=16), METAL)
    # handlebar: tapered alloy bar on risers, swept back
    for s in (1, -1):
        P.add_bm(cyl_between(fork(0.70, s * 0.042) + AXD * 0.008, Vector((H.x - 0.01, s * 0.042, 1.013)), 0.017, segs=20), PLASTIC)
    mid = smooth_path([(0.352, -0.27, 1.022), (0.382, -0.13, 1.006), (0.392, 0.0, 1.002), (0.382, 0.13, 1.006), (0.352, 0.27, 1.022)], per=4)
    bar = [Vector((0.338, -0.375, 1.030))] + mid + [Vector((0.338, 0.375, 1.030))]
    P.add_bm(tube(bar, 0.0125, segs=14), METAL)
    for s in (1, -1):
        A_, B_ = Vector((0.352, s * 0.27, 1.022)), Vector((0.338, s * 0.375, 1.030)); dg = (B_ - A_).normalized()
        g0, g1 = A_ + dg * 0.006, B_ + dg * 0.006
        P.add_bm(cyl_between(g0, g1, 0.0175, segs=16, bevel=0.004), RUBBER)                     # grip
        P.add_bm(cyl_between(g1 - (g1 - g0).normalized() * 0.003, g1 + (g1 - g0).normalized() * 0.022, 0.0215, segs=20, bevel=0.004), METAL)   # bar end
        # lever + perch + master cylinder / switch block
        perch = Vector((0.355, s * 0.235, 1.018))
        P.add_bm(box((0.05, 0.035, 0.038), perch, bevel=0.008), PLASTIC)
        lev = [perch + Vector((0.02, s * 0.0, 0.0)), Vector((0.40, s * 0.28, 1.020)), Vector((0.402, s * 0.36, 1.015))]
        P.add_bm(tube(smooth_path(lev, 4), [0.006, 0.0055, 0.005], segs=8), METAL)
        if s < 0:
            P.add_bm(box((0.04, 0.032, 0.03), (0.37, -0.20, 1.045), bevel=0.008), PLASTIC)       # front brake reservoir
        # mirror: stalk + head + glass
        st = [Vector((0.372, s * 0.215, 1.022)), Vector((0.36, s * 0.255, 1.10)), Vector((0.335, s * 0.305, 1.175))]
        P.add_bm(tube(smooth_path(st, 4), [0.0065, 0.006, 0.0055], segs=8), METAL)
        mc = Vector((0.33, s * 0.345, 1.192))
        P.add_bm(ellipsoid(mc, (0.022, 0.062, 0.034), 20, 10, rot=Matrix.Rotation(s * 0.25, 3, "X")), PLASTIC)
        P.add_bm(_mirror_glass(mc, s), GLASS)
    # headlight: compact housing + twin LED eyes + DRL brow
    hk = [(0.505, 0.050, 0.905, 0.825), (0.530, 0.086, 0.935, 0.792), (0.585, 0.102, 0.945, 0.782), (0.625, 0.094, 0.935, 0.798), (0.640, 0.070, 0.915, 0.825)]
    P.add_bm(loft_x(hk, stations=14, n=28, p_top=3.0, p_bot=2.6), PLASTIC)
    for s in (1, -1):
        P.add_bm(ellipsoid((0.629, s * 0.044, 0.862), (0.016, 0.034, 0.030), 20, 10, rot=Matrix.Rotation(s * 0.18, 3, "Z")), HEAD)
        brow = smooth_path([(0.626, s * 0.012, 0.912), (0.621, s * 0.05, 0.906), (0.606, s * 0.085, 0.888)], per=4)
        P.add_bm(tube(brow, 0.0045, segs=8), HEAD)
    # headlight brackets to the fork tubes
    for s in (1, -1):
        P.add_bm(cyl_between((0.545, s * 0.07, 0.87), fork(0.60, s * (FORK_Y - 0.02)), 0.009, segs=14), METAL)
    # flyscreen (smoked) and dash
    fs = [(0.585, 0.935), (0.555, 0.985), (0.52, 1.028)]
    secs = []
    for i, (x, z) in enumerate(fs):
        hw = [0.072, 0.078, 0.062][i]
        nrm = Vector((0.75, 0, 0.66)).normalized()
        secs.append(((x, 0, z), (0, hw, 0), nrm * 0.0025, nrm * 0.0025, 8))
    P.add_bm(loft(secs, n=24), GLASS)
    dash_c = Vector((0.47, 0, 1.005)); dr = Matrix.Rotation(math.radians(-52), 3, "Y")
    P.add_bm(box((0.032, 0.13, 0.085), dash_c, bevel=0.008, rot=dr), PLASTIC)
    P.add_bm(box((0.004, 0.112, 0.066), dash_c + dr @ Vector((-0.0175, 0, 0)), bevel=0.0012, rot=dr), GLASS)
    P.add_bm(cyl_between(dash_c + dr @ Vector((0.012, 0, -0.03)), axis_at(0.96) + Vector((0.01, 0, 0)), 0.008, segs=8), METAL)
    # front fender: a strip over the tyre (fixed to the sliders)
    secs = []
    for i in range(15):
        a = math.radians(28 + (132 - 28) * i / 14)
        rr = RF + 0.028
        c = A_F + Vector((rr * math.cos(a), 0, rr * math.sin(a)))
        rad = Vector((math.cos(a), 0, math.sin(a)))
        hw = 0.058 - 0.012 * abs(i - 6) / 8
        secs.append((c, (0, hw, 0), rad * 0.0035, rad * 0.0035, 6))
    P.add_bm(loft(secs, n=16), PAINT)
    for s in (1, -1):                                    # fender stays to the stanchions
        P.add_bm(cyl_between(A_F + Vector((0.02, s * 0.06, RF + 0.025)) - Vector((0, 0, 0.04)), fork(0.26, s * (FORK_Y - 0.02)), 0.006, segs=8), PLASTIC)
    o = P.to_object(smooth_angle=38)
    return o

def _mirror_glass(mc, s):
    """the mirror glass: a flat oval disc on the rear of the head (4 mm thick, its front inside the head)"""
    bm = bmesh.new(); n = 28
    ring0 = [bm.verts.new((mc.x - 0.0175, mc.y + 0.050 * math.cos(2 * math.pi * k / n), mc.z + 0.026 * math.sin(2 * math.pi * k / n))) for k in range(n)]
    ring1 = [bm.verts.new((mc.x - 0.0225, mc.y + 0.050 * math.cos(2 * math.pi * k / n), mc.z + 0.026 * math.sin(2 * math.pi * k / n))) for k in range(n)]
    for k in range(n): bm.faces.new([ring0[k], ring0[(k + 1) % n], ring1[(k + 1) % n], ring1[k]])
    bm.faces.new(list(reversed(ring0))); bm.faces.new(ring1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    bm.transform(Matrix.Translation(mc) @ Matrix.Rotation(s * 0.25, 4, "X") @ Matrix.Translation(-mc))
    return bm

# ------------------------------------------------------------------------------------------------ BODY
def build_body():
    P = K.Part("Body")
    # ---- frame: steel trellis with cast lugs
    head0, head1 = axis_at(0.765), axis_at(0.925)
    P.add_bm(cyl_between(head0, head1, 0.034, segs=24, bevel=0.004), FRAME)
    def rails(s):
        up = [(0.405, s * 0.048, 0.905), (0.27, s * 0.118, 0.875), (0.08, s * 0.145, 0.815), (-0.12, s * 0.152, 0.665)]
        lo = [(0.455, s * 0.048, 0.785), (0.34, s * 0.112, 0.68), (0.22, s * 0.142, 0.56)]
        diag = [((0.27, s * 0.118, 0.875), (0.352, s * 0.11, 0.692)), ((0.115, s * 0.142, 0.828), (0.31, s * 0.124, 0.652)),
                ((0.08, s * 0.145, 0.815), (0.22, s * 0.142, 0.56)), ((0.045, s * 0.147, 0.79), (-0.10, s * 0.152, 0.50))]
        return up, lo, diag
    for s in (1, -1):
        up, lo, diag = rails(s)
        P.add_bm(tube(smooth_path(up, 5), 0.0135, segs=16), FRAME)
        P.add_bm(tube(smooth_path(lo, 5), 0.0135, segs=16), FRAME)
        for a, b in diag: P.add_bm(cyl_between(a, b, 0.0115, segs=14, bevel=0.0), FRAME)
        for p in [up[1], up[2], up[3], lo[1], lo[2], (-0.10, s * 0.152, 0.50), (0.115, s * 0.142, 0.828), (0.045, s * 0.147, 0.79), (0.31, s * 0.124, 0.652), (0.352, s * 0.11, 0.692)]:
            P.add_bm(ellipsoid(p, (0.029, 0.029, 0.029), 18, 10), FRAME)
        # swingarm pivot plate (cast) + pivot bolt
        P.add_bm(plate([(-0.07, 0.69), (-0.20, 0.66), (-0.21, 0.36), (-0.12, 0.33), (-0.05, 0.40), (-0.06, 0.55)], s * 0.157, 0.026, bevel=0.006), METAL)
        P.add_bm(along_y(0.022, s * 0.170, s * 0.182, -0.135, 0.45, segs=16), METAL)
        # subframe
        P.add_bm(tube([(-0.12, s * 0.15, 0.665), (-0.40, s * 0.105, 0.695), (-0.70, s * 0.07, 0.765)], 0.011, segs=14), FRAME)
        P.add_bm(cyl_between((-0.575, s * 0.084, 0.736), (-0.575, s * 0.084, 0.81), 0.009, segs=14), FRAME)
        P.add_bm(ellipsoid((-0.46, s * 0.098, 0.709), (0.024, 0.024, 0.024), 16, 10), FRAME)
        P.add_bm(cyl_between((-0.69, s * 0.072, 0.758), (-0.69, s * 0.072, 0.855), 0.009, segs=14), FRAME)
        P.add_bm(cyl_between((-0.17, s * 0.15, 0.40), (-0.46, s * 0.098, 0.709), 0.0095, segs=14, bevel=0.0), FRAME)
    P.add_bm(cyl_between((-0.12, 0.15, 0.665), (-0.12, -0.15, 0.665), 0.012, segs=20), FRAME)           # cross tube (shock top)
    # ---- engine: canted inline four
    P.add_bm(box((0.42, 0.30, 0.22), (0.08, 0, 0.36), bevel=0.03, segs=4), ENGINE)               # crankcase
    P.add_bm(box((0.30, 0.22, 0.07), (0.06, 0, 0.245), bevel=0.022, segs=4), ENGINE)             # sump
    tilt = Matrix.Rotation(math.radians(30), 3, "Y")
    cz = Vector((0.0, 0, 1.0)); cz = tilt @ cz
    base = Vector((0.13, 0, 0.42))
    P.add_bm(box((0.17, 0.35, 0.26), base + cz * 0.14, bevel=0.016, rot=tilt), ENGINE)           # block
    for k in range(5):                                                                               # cooling ribs
        P.add_bm(box((0.188, 0.372, 0.007), base + cz * (0.05 + 0.04 * k), bevel=0.0, rot=tilt), ENGINE)
    P.add_bm(box((0.20, 0.38, 0.10), base + cz * 0.31, bevel=0.024, rot=tilt, segs=4), ENGINE)    # head
    P.add_bm(box((0.15, 0.32, 0.05), base + cz * 0.365, bevel=0.018, rot=tilt, segs=4), METAL)   # cam cover
    for k in range(4):                                                                               # plug caps
        P.add_bm(cyl_between(base + cz * 0.38 + Vector((0, -0.12 + 0.08 * k, 0)), base + cz * 0.405 + Vector((0, -0.12 + 0.08 * k, 0)), 0.013, segs=14), PLASTIC)
    P.add_bm(along_y(0.092, -0.14, -0.188, 0.02, 0.37, segs=36, bevel=0.01), METAL)               # clutch cover
    P.add_bm(along_y(0.072, 0.14, 0.182, 0.20, 0.33, segs=32, bevel=0.009), METAL)                # alternator cover
    P.add_bm(along_y(0.04, 0.14, 0.165, -0.04, 0.36, segs=20, bevel=0.004), ENGINE)               # sprocket cover boss
    # radiator (+ core) in front of the headers
    rt = Matrix.Rotation(math.radians(-12), 3, "Y")
    P.add_bm(box((0.05, 0.34, 0.29), (0.505, 0, 0.565), bevel=0.01, rot=rt), PLASTIC)
    P.add_bm(box((0.006, 0.30, 0.25), Vector((0.505, 0, 0.565)) + rt @ Vector((0.025, 0, 0)), bevel=0.0, rot=rt), ENGINE)
    # ---- exhaust: 4-2-1 headers, collector, link, short upswept can (right)
    port = base + cz * 0.31 + (tilt @ Vector((0.1, 0, 0))) + Vector((0, 0, -0.01))
    for yy in (-0.14, -0.047, 0.047, 0.14):
        dz = 0.022 if abs(yy) < 0.1 else -0.018        # inner pipes over the outer ones where they bunch together
        pts = [port + Vector((-0.01, yy, 0)), port + Vector((0.035, yy, -0.07)), Vector((port.x + 0.045, yy * 0.92, 0.42)),
               Vector((0.43, yy * 0.75, 0.27 + dz * 0.4)), Vector((0.33, yy * 0.5, 0.18 + dz)), Vector((0.24, yy * 0.4 - 0.02, 0.16 + dz)), Vector((0.14, yy * 0.36 - 0.025, 0.16 + dz * 0.8))]
        P.add_bm(tube(smooth_path(pts, 5), 0.0175, segs=14), CHROME)
    P.add_bm(box((0.17, 0.15, 0.085), (0.08, -0.025, 0.16), bevel=0.035, segs=4), METAL)            # collector box
    link = [(0.0, -0.05, 0.165), (-0.12, -0.13, 0.215), (-0.21, -0.19, 0.31), (-0.27, -0.215, 0.40)]
    P.add_bm(tube(smooth_path(link, 5), 0.03, segs=14), CHROME)
    can0, can1 = Vector((-0.25, -0.215, 0.385)), Vector((-0.56, -0.222, 0.535))
    d = (can1 - can0).normalized(); up = Vector((0, 0, 1)); side = d.cross(up).normalized(); upn = side.cross(d).normalized()
    secs = []
    for i in range(11):
        t = i / 10
        c = can0 + (can1 - can0) * t
        k = 0.55 + 0.45 * math.sin(min(1, t * 3.5) * math.pi / 2) if t < 0.5 else 1.0 - 0.12 * ((t - 0.5) / 0.5) ** 2
        secs.append((c, side * 0.062 * k, upn * 0.072 * k, upn * 0.072 * k, 3.2))
    P.add_bm(loft(secs, n=28), METAL)
    P.add_bm(cyl_between(can1 - d * 0.01, can1 + d * 0.03, 0.05, segs=24, bevel=0.006), PLASTIC)     # carbon end cap
    for o_ in (-0.022, 0.022):
        P.add_bm(cyl_between(can1 + d * 0.025 + upn * o_, can1 + d * 0.05 + upn * o_, 0.016, segs=14, bevel=0.002), CHROME)
    P.add_bm(cyl_between((-0.40, -0.18, 0.47), (-0.42, -0.12, 0.66), 0.008, segs=8), METAL)          # can hanger
    # ---- tank, scoops, side covers
    tank = [(0.385, 0.045, 0.935, 0.885), (0.35, 0.125, 0.985, 0.83), (0.26, 0.178, 1.03, 0.79), (0.13, 0.184, 1.035, 0.778),
            (0.02, 0.158, 0.99, 0.785), (-0.07, 0.12, 0.925, 0.80), (-0.105, 0.075, 0.895, 0.825)]
    P.add_bm(loft_x(tank, stations=26, n=32, p_top=2.4, p_bot=3.6), PAINT)
    for s in (1, -1):
        # radiator shroud: a thin curved fin beside the radiator, tapering forward and down (toe-in)
        secs = []
        fk = [(0.245, 0.835, 0.05), (0.29, 0.815, 0.105), (0.36, 0.785, 0.125), (0.43, 0.745, 0.10), (0.485, 0.71, 0.05), (0.505, 0.70, 0.018)]
        for i in range(16):
            x = fk[0][0] + (fk[-1][0] - fk[0][0]) * i / 15
            zc, hz = sample(fk, x)
            y = s * (0.205 - 0.03 * (x - 0.245))
            secs.append(((x, y, zc), (0, 0.011, 0), (0, 0, hz), (0, 0, hz), 2.2))
        P.add_bm(loft(secs, n=20), PAINT)
        P.add_bm(plate([(0.0, 0.775), (-0.25, 0.765), (-0.25, 0.672), (-0.12, 0.61), (0.03, 0.68)], s * 0.10, 0.010, bevel=0.003), PLASTIC)
    # ---- seat, pillion pad, tail
    seat = [(-0.075, 0.095, 0.880, 0.765), (-0.13, 0.128, 0.858, 0.762), (-0.26, 0.136, 0.838, 0.765), (-0.40, 0.122, 0.852, 0.775), (-0.49, 0.10, 0.876, 0.79)]
    P.add_bm(loft_x(seat, stations=18, n=28, p_top=3.2, p_bot=4.0), SEAT)
    pill = [(-0.47, 0.072, 0.895, 0.80), (-0.54, 0.078, 0.915, 0.82), (-0.64, 0.066, 0.935, 0.845), (-0.70, 0.04, 0.94, 0.87)]
    P.add_bm(loft_x(pill, stations=12, n=24, p_top=3.2, p_bot=4.0), SEAT)
    tail = [(-0.29, 0.148, 0.805, 0.665), (-0.42, 0.13, 0.845, 0.725), (-0.58, 0.10, 0.885, 0.79), (-0.74, 0.066, 0.915, 0.845), (-0.87, 0.032, 0.935, 0.885), (-0.90, 0.012, 0.935, 0.905)]
    P.add_bm(loft_x(tail, stations=20, n=28, p_top=2.4, p_bot=2.2), PAINT)
    # tail light: a slim LED blade under the tail tip
    P.add_bm(box((0.03, 0.10, 0.022), (-0.86, 0, 0.881), bevel=0.004), TAIL)
    # hugger arm + plate + indicators
    P.add_bm(tube(smooth_path([(-0.70, 0.0, 0.80), (-0.80, 0.0, 0.72), (-0.86, 0.0, 0.64)], 4), 0.014, segs=14), PLASTIC)
    P.add_bm(box((0.006, 0.20, 0.13), (-0.875, 0, 0.60), bevel=0.0025, rot=Matrix.Rotation(math.radians(-12), 3, "Y")), PLATE)
    P.add_bm(box((0.015, 0.215, 0.145), (-0.865, 0, 0.602), bevel=0.004, rot=Matrix.Rotation(math.radians(-12), 3, "Y")), PLASTIC)
    for s in (1, -1):
        P.add_bm(cyl_between((-0.84, s * 0.02, 0.69), (-0.85, s * 0.13, 0.69), 0.006, segs=8), PLASTIC)
        P.add_bm(ellipsoid((-0.85, s * 0.14, 0.69), (0.018, 0.012, 0.009), 12, 6), TAIL)
    # ---- swingarm, rear shock, chain, hugger
    for s in (1, -1):
        secs = []
        p0, p1 = Vector((-0.135, s * 0.140, 0.45)), Vector((XR, s * 0.140, RR))
        dd = (p1 - p0).normalized(); nz = Vector((0, 1, 0)).cross(dd).normalized() * -1
        if nz.z < 0: nz = -nz
        for i in range(9):
            t = i / 8
            c = p0 + (p1 - p0) * t
            h = 0.050 - 0.020 * t + (0.012 if 0.2 < t < 0.6 else 0) * math.sin((t - 0.2) / 0.4 * math.pi)
            secs.append((c, (0, 0.021, 0), nz * h, nz * h, 4.0))
        P.add_bm(loft(secs, n=20), METAL)
        P.add_bm(box((0.05, 0.03, 0.045), (XR + 0.01, s * 0.14, RR), bevel=0.008), METAL)            # adjuster block
    P.add_bm(box((0.05, 0.25, 0.05), (-0.31, 0, 0.458), bevel=0.012), METAL)                           # brace
    sh0, sh1 = Vector((-0.30, 0, 0.455)), Vector((-0.13, 0, 0.645))
    P.add_bm(cyl_between(sh0, sh1, 0.021, segs=24, bevel=0.003), METAL)
    sd = (sh1 - sh0); L = sd.length; sd.normalize()
    sx_ = sd.cross(Vector((0, 1, 0))).normalized(); sy_ = sd.cross(sx_).normalized()
    hel = []
    turns, n = 7.5, 120
    for i in range(n + 1):
        t = i / n; a = 2 * math.pi * turns * t
        hel.append(sh0 + sd * (0.03 + t * (L - 0.07)) + (sx_ * math.cos(a) + sy_ * math.sin(a)) * 0.033)
    P.add_bm(tube(hel, 0.0055, segs=8), ANOD)
    P.add_bm(cyl_between(sh0 + sd * 0.025, sh0 + sd * 0.035, 0.04, segs=20), METAL)
    P.add_bm(cyl_between(sh1 - sd * 0.035, sh1 - sd * 0.025, 0.04, segs=20), METAL)
    # chain (left): a closed loop round the sprockets
    cf, rf_, cr, rr_ = Vector((-0.04, 0.0, 0.36)), 0.042, Vector((XR, 0.0, RR)), 0.102
    loop = []
    for i in range(24):
        a = math.radians(90 + 180 * i / 23)                 # rear sprocket: top -> back -> bottom
        loop.append(cr + Vector((math.cos(a) * rr_, 0, math.sin(a) * rr_)))
    for i in range(12):
        a = math.radians(-90 + 180 * i / 11)                # front sprocket: bottom -> front -> top
        loop.append(cf + Vector((math.cos(a) * rf_, 0, math.sin(a) * rf_)))
    loop = [p + Vector((0, 0.098, 0)) for p in loop]
    P.add_bm(tube(loop, 0.0065, segs=8, closed=True), ENGINE)
    P.add_bm(plate([(-0.30, 0.47), (-0.62, 0.43), (-0.62, 0.405), (-0.30, 0.445)], 0.098, 0.004, bevel=0.0012), PLASTIC)   # chain guard
    # rear hugger over the tyre
    secs = []
    for i in range(12):
        a = math.radians(55 + (128 - 55) * i / 11)
        rr = RR + 0.024
        c = A_R + Vector((rr * math.cos(a), 0, rr * math.sin(a)))
        rad = Vector((math.cos(a), 0, math.sin(a)))
        secs.append((c, (0, 0.105, 0), rad * 0.003, rad * 0.003, 6))
    P.add_bm(loft(secs, n=16), PLASTIC)
    # rear caliper (under the right arm) + its hanger
    ang = math.radians(-58); cc = A_R + Vector((0.095 * math.cos(ang), 0, 0.095 * math.sin(ang)))
    P.add_bm(box((0.02, 0.036, 0.07), (cc.x, -0.088, cc.z), bevel=0.007, rot=Matrix.Rotation(-(ang - math.pi / 2), 3, "Y")), ANOD)
    P.add_bm(cyl_between((cc.x, -0.10, cc.z), (XR + 0.15, -0.135, RR + 0.03), 0.008, segs=8), METAL)
    # ---- pegs, hangers, levers
    for s in (1, -1):
        P.add_bm(plate([(-0.05, 0.47), (-0.11, 0.48), (-0.20, 0.37), (-0.19, 0.315), (-0.13, 0.32)], s * 0.182, 0.008, bevel=0.0025), METAL)
        P.add_bm(along_y(0.0125, s * 0.186, s * 0.262, -0.168, 0.338, segs=14, bevel=0.003), METAL)
        P.add_bm(plate([(-0.38, 0.60), (-0.43, 0.61), (-0.46, 0.46), (-0.41, 0.44)], s * 0.112, 0.008, bevel=0.0025), METAL)
        P.add_bm(along_y(0.011, s * 0.115, s * 0.18, -0.44, 0.455, segs=14, bevel=0.003), METAL)
    P.add_bm(tube([(-0.16, -0.188, 0.35), (-0.08, -0.205, 0.33), (-0.02, -0.21, 0.355)], 0.0055, segs=8), METAL)   # brake pedal
    P.add_bm(tube([(-0.16, 0.188, 0.35), (-0.08, 0.205, 0.37), (-0.03, 0.21, 0.36)], 0.0055, segs=8), METAL)      # gear lever
    o = P.to_object(smooth_angle=40)
    return o

# ------------------------------------------------------------------------------------------------ RIDER
HIP = Vector((-0.27, 0.0, 0.925))
SPINE = Vector((math.sin(math.radians(27)), 0, math.cos(math.radians(27))))
FWD_T = Vector((math.cos(math.radians(27)), 0, -math.sin(math.radians(27))))     # across the torso, forward
def spine(s): return HIP + SPINE * s
SHOULDER = {1: spine(0.47) + Vector((0.0, 0.19, 0)), -1: spine(0.47) + Vector((0.0, -0.19, 0))}
GRIP = {s: Vector((0.341, s * 0.322, 1.026)) for s in (1, -1)}
ARM_U, ARM_F = 0.29, 0.335

def build_legs():
    P = K.Part("RiderLegs")
    # pelvis / seat of the trousers (sunk into the seat foam)
    secs = []
    for i in range(9):
        t = i / 8
        x = HIP.x - 0.11 + 0.22 * t
        k = math.sin(math.pi * (0.08 + 0.84 * t)) ** 0.5
        secs.append(((x, 0, HIP.z - 0.005), (0, 0.175 * k, 0), (0, 0, 0.09 * k), (0, 0, 0.09 * k), 2.6))
    P.add_bm(loft(secs, n=32), SUIT)
    for s in (1, -1):
        hipj = HIP + Vector((0.0, s * 0.098, -0.01))
        knee = Vector((0.045, s * 0.238, 0.785))
        ankle = Vector((-0.20, s * 0.245, 0.43))
        P.add_bm(tube(smooth_path([hipj, (hipj + knee) / 2 + Vector((0, 0, 0.012)), knee], 4), [0.088, 0.083, 0.078, 0.072, 0.066, 0.06, 0.056, 0.054, 0.052], segs=16), SUIT)
        P.add_bm(ellipsoid(knee, (0.07, 0.068, 0.07), 18, 10), SUIT)
        P.add_bm(ellipsoid(knee + Vector((0.05, 0.03 * s, 0.0)), (0.032, 0.038, 0.042), 14, 8), PLASTIC)        # knee slider
        P.add_bm(tube([knee, (knee + ankle) / 2 + Vector((0.01, 0, 0)), ankle], [0.052, 0.049, 0.045], segs=16), SUIT)
        # boot: on the peg, toe forward
        boot = []
        for i in range(10):
            t = i / 9
            x = -0.275 + 0.235 * t
            hw = 0.042 + 0.006 * math.sin(math.pi * t)
            zt = 0.40 + 0.08 * (1 - t) ** 2 + 0.01
            zb = 0.338
            boot.append((x, hw, zt, zb))
        bm = loft_x(boot, stations=14, n=20, p_top=2.4, p_bot=5.0, y0=s * 0.238)
        P.add_bm(bm, RUBBER)
        dsh = (knee - ankle).normalized()
        P.add_bm(cyl_between(ankle - dsh * 0.05, ankle + dsh * 0.12, 0.057, segs=24, bevel=0.01), RUBBER)  # boot shaft
    return P.to_object(smooth_angle=50)

def build_torso():
    P = K.Part("RiderTorso")
    keys = [(0.02, 0.150, 0.102), (0.16, 0.148, 0.098), (0.30, 0.185, 0.118), (0.44, 0.205, 0.108), (0.52, 0.17, 0.085), (0.56, 0.09, 0.06)]
    secs = []
    for i in range(17):
        s_ = keys[0][0] + (keys[-1][0] - keys[0][0]) * i / 16
        hw, hd = sample(keys, s_)
        c = spine(s_) + FWD_T * (0.012 * math.sin(math.pi * i / 16))
        secs.append((c, (0, hw, 0), FWD_T * hd, FWD_T * hd, 2.5))
    P.add_bm(loft(secs, n=28), SUIT)
    # hump (aero back protector) + shoulders
    P.add_bm(ellipsoid(spine(0.36) - FWD_T * 0.07, (0.07, 0.13, 0.17), 18, 10, rot=Matrix.Rotation(math.radians(27), 3, "Y")), SUIT)
    for s in (1, -1):
        P.add_bm(ellipsoid(SHOULDER[s], (0.062, 0.062, 0.062), 16, 8), SUIT)
        P.add_bm(ellipsoid(SHOULDER[s] + Vector((0.0, s * 0.02, 0.04)), (0.05, 0.05, 0.04), 14, 8), PLASTIC)   # shoulder armour
    # neck + helmet
    hc = spine(0.70) + FWD_T * 0.035
    P.add_bm(cyl_between(spine(0.52), hc - SPINE * 0.06, 0.055, segs=16, bevel=0.0), SUIT)
    hr = Matrix.Rotation(math.radians(18), 3, "Y")
    P.add_bm(ellipsoid(hc, (0.158, 0.132, 0.142), 28, 16, rot=hr), HELMET)
    P.add_bm(ellipsoid(hc + hr @ Vector((0.085, 0, -0.07)), (0.085, 0.105, 0.075), 20, 10, rot=hr), HELMET)    # chin bar
    # visor: the helmet's front window, 4 mm proud
    bm = ellipsoid(Vector((0, 0, 0)), (0.162, 0.136, 0.146), 32, 18)
    kill = [f for f in bm.faces if not (f.calc_center_median().x > 0.085 and -0.035 < f.calc_center_median().z < 0.065)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    # thicken the visor shell (closed: no open edge to see through)
    r = bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.003)
    bm.transform(Matrix.Translation(hc) @ hr.to_4x4())
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.add_bm(bm, VISOR)
    P.add_bm(ellipsoid(hc + hr @ Vector((-0.13, 0, 0.06)), (0.05, 0.07, 0.022), 14, 8, rot=hr @ Matrix.Rotation(math.radians(-15), 3, "Y")), HELMET)   # spoiler
    return P.to_object(smooth_angle=50)

def build_arm(name, upper):
    """an arm segment along +X from its joint (turned to glTF +Z on export): upper arm (with elbow) or forearm (+ glove)"""
    P = K.Part(name)
    if upper:
        P.add_bm(tube([(0, 0, 0), (ARM_U * 0.5, 0, 0), (ARM_U, 0, 0)], [0.052, 0.047, 0.043], segs=14), SUIT)
        P.add_bm(ellipsoid((ARM_U, 0, 0), (0.046, 0.046, 0.046), 14, 8), SUIT)
        P.add_bm(ellipsoid((ARM_U + 0.012, 0, 0.012), (0.035, 0.04, 0.03), 12, 6), PLASTIC)      # elbow armour
    else:
        P.add_bm(tube([(0, 0, 0), (0.15, 0, 0), (0.27, 0, 0)], [0.042, 0.04, 0.034], segs=14), SUIT)
        P.add_bm(cyl_between((0.25, 0, 0), (0.29, 0, 0), 0.04, segs=14, bevel=0.006), RUBBER)    # gauntlet cuff
        P.add_bm(ellipsoid((ARM_F - 0.012, 0, 0.0), (0.052, 0.036, 0.042), 14, 8), RUBBER)        # fist round the grip
    return P.to_object(smooth_angle=50)

# ------------------------------------------------------------------------------------------------ build all
t0 = time.time()
wf = wheel("Wheel_F", RF, WF, True)
wr = wheel("Wheel_R", RR, WR, False)
steer = build_steer()
body = build_body()
legs = build_legs()
torso = build_torso()
arms = [build_arm("ArmU_L", True), build_arm("ArmU_R", True), build_arm("ArmF_L", False), build_arm("ArmF_R", False)]
print(f"built in {time.time() - t0:.1f}s", flush=True)

# origins: wheels at their axles (already built at the origin: move), steer at its pivot, torso at the hip
def set_origin(o, p):
    o.data.transform(Matrix.Translation(-Vector(p)))
    o.location = Vector(p)
wf.location = A_F; wr.location = A_R           # wheels were built round (0, 0, 0)
set_origin(steer, H)
set_origin(torso, HIP)

# to the export frame: build X forward -> Blender -Y (= glTF +Z)
R = Matrix.Rotation(-math.pi / 2, 4, "Z")
pieces = [body, steer, wf, wr, legs, torso, *arms]
for o in pieces:
    o.data.transform(R)
    o.location = R @ o.location
for o in pieces: o.data.update()

def gl(v):
    """build frame (X fwd, Y left, Z up) -> glTF (x left, y up, z fwd)"""
    return [round(v[1], 5), round(v[2], 5), round(v[0], 5)]

# ------------------------------------------------------------------------------------------------ AO per VERTEX (GPU bake, per-piece cache)
# (a lightmap atlas was tried first: the grain UVs make one island per face, thousands per piece, and the packed atlas was
# mostly seams; these meshes are dense enough for a per-vertex AO, which also survives the LOD simplification for free)
CACHE = os.path.join(OUT, ".aocache")

def piece_hash(o):
    me = o.data
    h = hashlib.sha1()
    co = [0.0] * (3 * len(me.vertices)); me.vertices.foreach_get("co", co)
    h.update(str([round(c, 5) for c in co]).encode()); h.update(str((64, 0.3, "vertex")).encode())
    return h.hexdigest()[:16]

def gpu_setup(scn):
    scn.render.engine = "CYCLES"
    try:
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "OPTIX"; p.get_devices()
        for d in p.devices: d.use = (d.type == "OPTIX")
        scn.cycles.device = "GPU"
        print("cycles: OPTIX", [d.name for d in p.devices if d.use], flush=True)
    except Exception as e:
        print("cycles: CPU fallback", e, flush=True); scn.cycles.device = "CPU"

def bake_vertex_ao(objs, bake=True):
    """COLOR_0 "Col" (POINT domain, grey) = ambient occlusion of each piece ALONE on a ground plane; cached per piece
    (models/moto/.aocache/<piece>_<geometry hash>.npy): an unchanged piece is not re-baked. bake=False: cache or white."""
    import numpy as np
    os.makedirs(CACHE, exist_ok=True)
    if bake:
        gpu_setup(scn)
        scn.cycles.samples = 64
        if scn.world is None: scn.world = bpy.data.worlds.new("World")
        scn.world.light_settings.distance = 0.3
        scn.render.bake.target = "VERTEX_COLORS"
    gmat = bpy.data.materials.new("bake_ground"); gmat.use_nodes = True
    done = 0
    for o in objs:
        me = o.data
        attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        me.color_attributes.active_color = attr; me.attributes.active_color = attr
        cp = os.path.join(CACHE, f"{o.name}_{piece_hash(o)}.npy")
        n = len(me.vertices)
        if os.path.exists(cp) or not bake:
            v = np.load(cp) if os.path.exists(cp) else np.ones(n, dtype=np.float32)
            rgba = np.repeat(v[:, None], 4, axis=1); rgba[:, 3] = 1
            attr.data.foreach_set("color", rgba.ravel())
            print("  AO", "cached" if os.path.exists(cp) else "none", o.name, flush=True); continue
        t = time.time()
        for q in objs: q.hide_render = (q is not o)
        g = None
        if not o.name.startswith("Arm"):                 # (the arm segments are built lying at the origin: no ground for them)
            bpy.ops.mesh.primitive_plane_add(size=6, location=(o.location.x, o.location.y, -0.001))
            g = bpy.context.active_object; g.data.materials.append(gmat)
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        c = np.zeros(n * 4, dtype=np.float32); attr.data.foreach_get("color", c)
        v = c.reshape(n, 4)[:, 0].copy()
        np.save(cp, v)
        if g: bpy.data.objects.remove(g)
        done += 1
        print(f"  AO {o.name} {time.time() - t:.1f}s (mean {v.mean():.2f})", flush=True)
    for q in objs: q.hide_render = False
    return done

bake_vertex_ao(pieces, BAKE)

# ------------------------------------------------------------------------------------------------ export + rig numbers
K.export_glb(pieces, os.path.join(OUT, "moto.raw.glb"), colors=True)
info = {
    "note": "tools/blender/motorbike.py: glTF frame (x left, y up, z forward), metres, origin = the ground midway between the axles",
    "wheelbase": WB,
    "wheels": {"F": {"pos": gl(A_F), "r": RF, "crown": WF / 2}, "R": {"pos": gl(A_R), "r": RR, "crown": WR / 2}},
    "steer": {"pivot": gl(H), "axis": gl(AXD), "rake": round(math.degrees(RAKE), 2), "trail": TRAIL},
    "rider": {"hip": gl(HIP), "shoulder": {"L": gl(SHOULDER[1]), "R": gl(SHOULDER[-1])}, "grip": {"L": gl(GRIP[1]), "R": gl(GRIP[-1])},
              "upper": ARM_U, "fore": ARM_F, "elbowOut": 0.35},
    "lamps": {"head": gl(Vector((0.645, 0, 0.862))), "tail": gl(Vector((-0.875, 0, 0.88)))},
    "size": [0.80, 1.24, 2.12],
    "tris": {o.name: K.tris(o) for o in pieces},
    "ao": "vertex (COLOR_0.r)",
}
with open(os.path.join(OUT, "moto.json"), "w") as f: json.dump(info, f, indent=1)
print("MOTO tris", info["tris"], "total", sum(info["tris"].values()), flush=True)

# ------------------------------------------------------------------------------------------------ previews (only with --preview; renders: after "machine free")
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    gpu_setup(scn)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    img = bpy.data.images.new("white", 4, 4); img.generated_color = (1, 1, 1, 1)
    sun, cam = K.preview_setup(img, sun_elev=38, sun_az=145)
    for m in K._MATS.values():                       # (preview: the AO from the vertex colours, not the lightmap)
        nt = m.node_tree; tex = next(n for n in nt.nodes if n.bl_idname == "ShaderNodeTexImage")
        vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
        for l in list(tex.outputs["Color"].links): nt.links.new(vc.outputs["Color"], l.to_socket)
    # pose the arm segments as the viewer does (two-bone IK, elbows out and down); build frame -> export frame by R
    for side, s_ in (("L", 1), ("R", -1)):
        S_, G_ = SHOULDER[s_], GRIP[s_]
        D_ = (G_ - S_); dl = D_.length; D_.normalize()
        a, b = ARM_U, ARM_F; d = min(dl, a + b - 1e-3)
        x = (a * a - b * b + d * d) / (2 * d); h = math.sqrt(max(0, a * a - x * x))
        Pv = Vector((-0.2, s_ * 0.35, -1)); Pv = (Pv - D_ * Pv.dot(D_)).normalized()
        E_ = S_ + D_ * x + Pv * h
        for nm, A_, B_ in ((f"ArmU_{side}", S_, E_), (f"ArmF_{side}", E_, G_)):
            o = bpy.data.objects[nm]
            q = Vector((1, 0, 0)).rotation_difference((B_ - A_).normalized())
            o.matrix_world = R @ Matrix.Translation(A_) @ q.to_matrix().to_4x4() @ R.inverted()
    scn.cycles.samples = 64
    # (build frame turned: forward = -Y, left = +X)
    K.render(cam, os.path.join(PREVIEW, "moto_34front.jpg"), (2.4, -3.2, 1.5), (0, -0.1, 0.62), lens=40)
    K.render(cam, os.path.join(PREVIEW, "moto_side.jpg"), (-4.6, 0, 0.9), (0, 0, 0.6), lens=45)
    K.render(cam, os.path.join(PREVIEW, "moto_34rear.jpg"), (-2.2, 3.0, 1.6), (0, 0.1, 0.65), lens=40)
    K.render(cam, os.path.join(PREVIEW, "moto_front_detail.jpg"), (1.1, -1.6, 1.25), (0, -0.55, 0.75), lens=50)
