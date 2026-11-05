"""A GENERIC MODERN EUROPEAN HATCHBACK (C segment, Golf / 308 / Megane class), an original design built entirely in
code (no hand modelling): the player's car for drive mode, and later the parked cars. Deterministic: re-run to change it.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/car.py -- models/car
      models/car/hatchback.glb      Body (paint, glass, black trim, head / tail lights, plates) + Wheel_FL/FR/RL/RR
    ... -- models/car --preview <dir>   also <dir>/preview_*.png: 3/4 front, 3/4 rear, side (Cycles), to look at

How it is built:
  - the BODY is a loft: ~40 cross-sections along the car, each a ring of 20 points from the rocker over the shoulder,
    the belt line, the window, the roof rail to the roof centre. Five curves of the station x drive the ring (half width,
    sill height, belt line, top surface = bumper / bonnet / windscreen / roof / hatch, greenhouse width), so the bonnet,
    windscreen, roof and hatch come out of one surface. Faces get their material from (station, ring band): side glass
    between belt and roof rail, windscreen and rear window on the top bands, black B pillars, lights at the corners.
    Then subdivision (level 2) and the wheel arches cut out with booleans, with black arch liners behind them.
  - the WHEELS are separate objects (origin at the wheel centre, so the viewer spins and steers them): tyre (lathe with a
    rounded shoulder), a 5-spoke alloy (dish + spoke windows cut by booleans), a brake disc behind it.
  - no LODs here: the viewer makes them with meshoptimizer (viewer/drive/carModel.js), as for the lamp.

Units: metres. Built with X forward, Y left, Z up, then turned so that in glTF / three.js the car faces +Z, left = +X,
y up, its origin on the ground midway between the axles. Dimensions: 4.28 m long, 1.79 m wide, 1.47 m tall,
wheelbase 2.62 m, 225/45 R17 tyres (radius 0.317 m), track 1.54 m.
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else "car_out")
os.makedirs(OUT, exist_ok=True)
# previews only with --preview <dir> (they are not shipped)
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

WB = 2.62            # wheelbase
AX_F, AX_R = WB / 2, -WB / 2
TRACK = 1.54
R_TYRE, W_TYRE, R_RIM = 0.317, 0.225, 0.216

# ---------------------------------------------------------------- materials (names are read by the viewer)
def material(name, rgb, rough, metal=0.0, emit=None, emit_strength=0.0, alpha=1.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = emit_strength
    if alpha < 1:
        p.inputs["Alpha"].default_value = alpha
    return m

PAINT = material("Paint", (0.06, 0.13, 0.26), 0.3, metal=0.5)        # metallic blue (the viewer sets its own colours)
GLASS = material("Glass", (0.02, 0.025, 0.03), 0.05, metal=0.0)
TRIM = material("Trim", (0.015, 0.015, 0.016), 0.55)                 # black plastic: sills, grille, B pillars, liners
HEAD = material("HeadLight", (0.55, 0.57, 0.6), 0.08, metal=0.8, emit=(1, 0.97, 0.9), emit_strength=0.0)
TAIL = material("TailLight", (0.45, 0.02, 0.02), 0.15, emit=(1, 0.05, 0.03), emit_strength=0.0)
PLATE = material("Plate", (0.85, 0.85, 0.82), 0.4)
TYRE = material("Tyre", (0.025, 0.025, 0.025), 0.85)
RIM = material("Rim", (0.62, 0.63, 0.65), 0.28, metal=1.0)
BRAKE = material("Brake", (0.18, 0.18, 0.19), 0.5, metal=0.8)
MATS = [PAINT, GLASS, TRIM, HEAD, TAIL, PLATE]
MI = {m.name: i for i, m in enumerate(MATS)}

def link(name, bm, mats, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    for m in mats: o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = smooth
    return o

def apply_mods(o):
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)

# ---------------------------------------------------------------- body profile curves (x -> value), Catmull-Rom
def curve(keys):
    def f(x):
        if x <= keys[0][0]: return keys[0][1]
        if x >= keys[-1][0]: return keys[-1][1]
        for i in range(len(keys) - 1):
            if keys[i][0] <= x <= keys[i + 1][0]: break
        x0, y0 = keys[max(i - 1, 0)]; x1, y1 = keys[i]; x2, y2 = keys[i + 1]; x3, y3 = keys[min(i + 2, len(keys) - 1)]
        t = (x - x1) / (x2 - x1)
        m1 = (y2 - y0) / (x2 - x0) * (x2 - x1) if x2 != x0 else 0
        m2 = (y3 - y1) / (x3 - x1) * (x2 - x1) if x3 != x1 else 0
        t2, t3 = t * t, t * t * t
        return (2 * t3 - 3 * t2 + 1) * y1 + (t3 - 2 * t2 + t) * m1 + (-2 * t3 + 3 * t2) * y2 + (t3 - t2) * m2
    return f

X_REAR, X_FRONT = -2.07, 2.21
W = curve([(-2.07, 0.78), (-2.03, 0.86), (-1.9, 0.89), (-1.31, 0.895), (0.0, 0.895), (1.31, 0.89), (1.9, 0.875), (2.12, 0.84), (2.21, 0.77)])
ZB = curve([(-2.07, 0.40), (-2.0, 0.30), (-1.8, 0.23), (-1.31, 0.19), (1.31, 0.18), (1.85, 0.22), (2.1, 0.27), (2.21, 0.36)])
ZT = curve([(-2.07, 0.86), (-2.04, 0.99), (-1.97, 1.05), (-1.88, 1.15), (-1.68, 1.36), (-1.4, 1.445), (-0.6, 1.47),
            (0.0, 1.44), (0.5, 1.21), (1.02, 0.995), (1.25, 0.965), (1.7, 0.915), (2.0, 0.855), (2.15, 0.785), (2.21, 0.70)])
BELT = curve([(-2.07, 0.84), (-2.03, 0.96), (-1.9, 1.01), (-1.4, 1.035), (0.0, 0.995), (1.02, 0.97), (1.25, 0.95),
              (1.7, 0.9), (2.0, 0.84), (2.15, 0.77), (2.21, 0.69)])
WR = curve([(-2.07, 0.68), (-1.6, 0.66), (-0.6, 0.685), (0.4, 0.70), (1.02, 0.80), (1.3, 0.85), (2.21, 0.74)])

def ring(x):
    """Half cross-section, bottom centre -> roof centre, as (y, z). 11 points."""
    w, zb, zt, wr = W(x), ZB(x), ZT(x), WR(x)
    belt = min(BELT(x), zt - 0.012)
    h = zt - belt
    pts = [
        (0.0, zb),
        (w * 0.82, zb),
        (w * 0.975, zb + 0.06),
        (w, zb + 0.2),
        (w * 0.995, (zb + 0.2) * 0.45 + (belt - 0.1) * 0.55),
        (w * 0.975, belt - 0.07),
        (w * 0.93, belt),
        (wr + (w * 0.93 - wr) * 0.08, belt + h * 0.86),
        (wr * 0.86, zt - 0.02),
        (wr * 0.45, zt - 0.003),
        (0.0, zt),
    ]
    # bonnet / tailgate stations (no greenhouse): keep the points ordered upward, a crowned panel
    for k in range(7, 11):
        if pts[k][1] < pts[k - 1][1] + 0.002: pts[k] = (pts[k][0], pts[k - 1][1] + 0.002)
    return pts

# stations: denser at the ends (the nose and tail curl round) and at the windscreen / hatch
xs = []
for i in range(41):
    t = i / 40
    s = 0.5 - 0.5 * math.cos(math.pi * t)            # cosine spacing: tight at both ends
    xs.append(X_REAR + (X_FRONT - X_REAR) * (0.35 * t + 0.65 * s))

def face_mat(xc, j):
    """Material of the loft face between ring points j and j+1 (half index) at station centre xc."""
    if j <= 1: return MI["Trim"]                                       # underbody, sill
    if xc > 2.05 and j == 2: return MI["Trim"]                        # lower grille / front splitter
    if xc < -1.98 and j == 2: return MI["Trim"]                        # rear diffuser
    if (xc > 1.95 and j == 5) or (xc > 2.08 and j == 4): return MI["HeadLight"]                   # headlights wrap the front corners
    if xc < -1.93 and j in (5, 6): return MI["TailLight"]             # tail lights wrap the rear corners
    if j == 6:                                                          # side glass band
        if -0.33 < xc < -0.2: return MI["Trim"]                        # black B pillar
        if -1.13 < xc < 1.0: return MI["Glass"]
    if j >= 8 and 0.06 < xc < 1.0: return MI["Glass"]                  # windscreen
    if j >= 8 and -1.93 < xc < -1.42: return MI["Glass"]               # hatch window
    if j == 7 and 0.06 < xc < 1.0: return MI["Trim"]                   # A pillars, black
    return MI["Paint"]

def build_body():
    bm = bmesh.new()
    rings = []
    for x in xs:
        half = ring(x)
        full = half + [(-y, z) for (y, z) in reversed(half[1:-1])]   # 11 + 9 = 20 points, closed loop
        rings.append([bm.verts.new((x, y, z)) for (y, z) in full])
    n = len(rings[0])
    for i in range(len(rings) - 1):
        xc = (xs[i] + xs[i + 1]) / 2
        for k in range(n):
            a, b = rings[i][k], rings[i][(k + 1) % n]
            c, d = rings[i + 1][(k + 1) % n], rings[i + 1][k]
            f = bm.faces.new((a, d, c, b))
            j = k if k < 10 else (n - 1 - k)        # mirror index on the right half
            f.material_index = face_mat(xc, j)
    # caps: the nose (grille) and the tail (tailgate), as fans to a centre point pulled in a little
    for idx, sgn in ((0, -1), (len(rings) - 1, 1)):
        r = rings[idx]
        cz = sum(v.co.z for v in r) / n
        c = bm.verts.new((xs[idx] + sgn * 0.012, 0.0, cz))
        for k in range(n):
            a, b = r[k], r[(k + 1) % n]
            f = bm.faces.new((a, b, c) if sgn > 0 else (b, a, c))
            f.material_index = MI["Trim"] if (sgn > 0 and v_low(a, b)) else MI["Paint"]
    bm.normal_update()
    o = link("Body", bm, MATS)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")
    sd = o.modifiers.new("sd", "SUBSURF"); sd.levels = 2; sd.render_levels = 2
    apply_mods(o)
    return o

def v_low(a, b):
    return (a.co.z + b.co.z) / 2 < 0.5

body = build_body()

# ---------------------------------------------------------------- wheel arches: boolean cut + black liners
R_ARCH = 0.375
cutters = []
for ax in (AX_F, AX_R):
    bpy.ops.mesh.primitive_cylinder_add(vertices=48, radius=R_ARCH, depth=3.0, location=(ax, 0, R_TYRE + 0.01), rotation=(math.pi / 2, 0, 0))
    cutters.append(bpy.context.active_object)
for ccut in cutters:
    m = body.modifiers.new("arch", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = ccut; m.solver = "EXACT"
    apply_mods(body)
for ccut in cutters: bpy.data.objects.remove(ccut)

def liner(ax, side):
    """Half a tube inside the arch (inward facing), from the body side 0.34 m inward."""
    bm = bmesh.new()
    segs = 24
    y0, y1 = side * (W(ax) + 0.02), side * (W(ax) - 0.34)
    cz = R_TYRE + 0.01
    rows = []
    for y in (y0, y1):
        rows.append([bm.verts.new((ax + R_ARCH * 0.995 * math.cos(a), y, cz + R_ARCH * 0.995 * math.sin(a)))
                     for a in [math.pi * (-0.08 + 1.16 * k / segs) for k in range(segs + 1)]])
    for k in range(segs):
        f = bm.faces.new((rows[0][k], rows[0][k + 1], rows[1][k + 1], rows[1][k]))
    # the inner wall closing the arch
    bm.faces.new(rows[1] if side > 0 else list(reversed(rows[1])))
    bm.normal_update()
    o = link("liner", bm, [TRIM], smooth=False)
    # face the inside of the arch (toward the wheel)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=True); bpy.ops.object.mode_set(mode="OBJECT")
    o.data.materials.clear(); o.data.materials.append(TRIM)
    return o

def box(name, size, loc, mat, bevel=0.0, rot=(0, 0, 0)):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=rot)
    o = bpy.context.active_object; o.name = name
    o.scale = size
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    if bevel:
        b = o.modifiers.new("bv", "BEVEL"); b.width = bevel; b.segments = 3; b.limit_method = "NONE"
        apply_mods(o)
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = True
    return o

extras = [liner(ax, s) for ax in (AX_F, AX_R) for s in (1, -1)]
# mirrors on short stalks at the A-pillar base (painted shell, black stalk)
for s in (1, -1):
    extras.append(box("mirror", (0.2, 0.1, 0.12), (0.95, s * 0.985, 1.03), PAINT, bevel=0.035, rot=(0, 0, s * -0.12)))
    extras.append(box("mirrorStalk", (0.08, 0.1, 0.03), (0.99, s * 0.915, 0.985), TRIM, bevel=0.01))
    extras.append(box("mirrorGlass", (0.012, 0.085, 0.1), (0.848, s * 0.99, 1.03), GLASS, rot=(0, 0, s * -0.12)))
# plates (Belgian plates are white with red letters; plain white here)
extras.append(box("plateF", (0.02, 0.52, 0.11), (X_FRONT + 0.004, 0, 0.42), PLATE, bevel=0.005))
extras.append(box("plateR", (0.02, 0.52, 0.11), (X_REAR + 0.0, 0, 0.74), PLATE, bevel=0.005))
# a third brake light / roof spoiler lip over the hatch
extras.append(box("spoiler", (0.14, 1.0, 0.025), (-1.66, 0, ZT(-1.66) + 0.006), PAINT, bevel=0.01, rot=(0, -0.3, 0)))
# door handles (flush, painted) and a slim black window surround line under the glass
for s in (1, -1):
    for hx in (0.12, -0.78):
        extras.append(box("handle", (0.17, 0.03, 0.03), (hx, s * 0.915, 0.93), PAINT, bevel=0.012))

for o in extras: o.select_set(True)
body.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
body = bpy.context.view_layer.objects.active
body.name = "Body"

# ---------------------------------------------------------------- wheels
def lathe_y(name, profile, mat, segs=40, closed=True):
    """Solid of revolution around the Y axis: profile = [(r, y), ...]."""
    bm = bmesh.new()
    rows = []
    for (r, y) in profile:
        rows.append([bm.verts.new((r * math.cos(2 * math.pi * k / segs), y, r * math.sin(2 * math.pi * k / segs))) for k in range(segs)])
    m = len(rows) - (0 if closed else 1)
    for i in range(m):
        A, B = rows[i], rows[(i + 1) % len(rows)]
        for k in range(segs):
            bm.faces.new((A[k], A[(k + 1) % segs], B[(k + 1) % segs], B[k]))
    bm.normal_update()
    return link(name, bm, [mat])

def fix_normals(o):
    bpy.context.view_layer.objects.active = o
    for q in scn.objects: q.select_set(q == o)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.mesh.normals_make_consistent(inside=False); bpy.ops.object.mode_set(mode="OBJECT")

def wheel(name):
    """A left wheel (outer face toward +Y) at the origin."""
    hw = W_TYRE / 2
    tyre = lathe_y("tyre", [(R_RIM - 0.004, -hw + 0.012), (R_RIM + 0.03, -hw), (R_TYRE - 0.03, -hw - 0.004), (R_TYRE - 0.008, -hw + 0.02),
                            (R_TYRE, -hw * 0.4), (R_TYRE, hw * 0.4), (R_TYRE - 0.008, hw - 0.02), (R_TYRE - 0.03, hw + 0.004),
                            (R_RIM + 0.03, hw), (R_RIM - 0.004, hw - 0.012)], TYRE, segs=48)
    fix_normals(tyre)
    # alloy: a dish (barrel + face), then 5 spoke windows cut through the face
    rim = lathe_y("rim", [(0.0, hw - 0.005), (0.045, hw - 0.002), (0.06, hw - 0.02), (0.17, hw - 0.035), (R_RIM - 0.01, hw - 0.012),
                          (R_RIM + 0.004, hw - 0.006), (R_RIM, hw - 0.025), (R_RIM - 0.012, -hw + 0.03), (R_RIM - 0.014, -hw + 0.02),
                          (R_RIM - 0.03, -hw + 0.02), (R_RIM - 0.028, hw - 0.04), (0.17, hw - 0.055), (0.06, hw - 0.04), (0.0, hw - 0.03)], RIM, segs=48)
    fix_normals(rim)
    for k in range(5):
        a = 2 * math.pi * (k + 0.5) / 5
        r0, r1 = 0.075, 0.185
        bm = bmesh.new()
        # a rounded wedge window between two spokes
        pts = []
        for t in range(9):
            aa = a - 0.42 + 0.84 * t / 8
            pts.append((r1 * math.cos(aa), r1 * math.sin(aa)))
        for t in range(5):
            aa = a + 0.3 - 0.6 * t / 4
            pts.append((r0 * 1.15 * math.cos(aa), r0 * 1.15 * math.sin(aa)))
        top = [bm.verts.new((px, hw + 0.05, pz)) for (px, pz) in pts]
        bot = [bm.verts.new((px, hw - 0.09, pz)) for (px, pz) in pts]
        bm.faces.new(top); bm.faces.new(list(reversed(bot)))
        for i in range(len(pts)):
            bm.faces.new((top[i], bot[i], bot[(i + 1) % len(pts)], top[(i + 1) % len(pts)]))
        bm.normal_update()
        cut = link("cut", bm, [RIM], smooth=False)
        fix_normals(cut)
        m = rim.modifiers.new("win", "BOOLEAN"); m.operation = "DIFFERENCE"; m.object = cut; m.solver = "EXACT"
        apply_mods(rim)
        bpy.data.objects.remove(cut)
    disc = lathe_y("disc", [(0.04, hw - 0.075), (0.165, hw - 0.075), (0.165, hw - 0.1), (0.04, hw - 0.1)], BRAKE, segs=32)
    caliper = box("caliper", (0.09, 0.035, 0.05), (0.0, hw - 0.068, 0.15), TRIM, bevel=0.01)
    for o in scn.objects: o.select_set(o in (tyre, rim, disc, caliper))
    bpy.context.view_layer.objects.active = tyre
    bpy.ops.object.join()
    w = bpy.context.view_layer.objects.active
    w.name = name
    for p in w.data.polygons: p.use_smooth = True
    return w

wheels = {}
for nm, ax, side in (("Wheel_FL", AX_F, 1), ("Wheel_FR", AX_F, -1), ("Wheel_RL", AX_R, 1), ("Wheel_RR", AX_R, -1)):
    w = wheel(nm)
    if side < 0:                                   # a right wheel = the left one turned round (outer face to -Y)
        w.rotation_euler = (0, 0, math.pi)
        for o in scn.objects: o.select_set(o == w)
        bpy.context.view_layer.objects.active = w
        bpy.ops.object.transform_apply(location=False, rotation=True, scale=False)
    w.location = (ax, side * (TRACK / 2), R_TYRE)
    wheels[nm] = w

# smooth shading with sharp creases kept (glTF export writes split normals)
for o in [body, *wheels.values()]:
    for p in o.data.polygons: p.use_smooth = True
    try:
        o.data.set_sharp_from_angle(angle=math.radians(50))
    except Exception:
        pass

# ---------------------------------------------------------------- turn to the viewer's frame: forward -Y here = +Z in glTF
R = Matrix.Rotation(-math.pi / 2, 4, "Z")
for o in [body, *wheels.values()]:
    o.matrix_world = R @ o.matrix_world
    for q in scn.objects: q.select_set(q == o)
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)

def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
print("CAR tris body", tris(body), "wheel", tris(wheels["Wheel_FL"]), flush=True)
xs_ = [v.co.x for v in body.data.vertices]; ys_ = [v.co.y for v in body.data.vertices]; zs_ = [v.co.z for v in body.data.vertices]
print("CAR bounds x", round(min(xs_), 3), round(max(xs_), 3), "y", round(min(ys_), 3), round(max(ys_), 3), "z", round(min(zs_), 3), round(max(zs_), 3), flush=True)

for o in scn.objects: o.select_set(o in (body, *wheels.values()))
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "hatchback.glb"), export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True)
print("EXPORTED", os.path.join(OUT, "hatchback.glb"), flush=True)

if not PREVIEW:
    sys.exit(0)
os.makedirs(PREVIEW, exist_ok=True)

# ---------------------------------------------------------------- previews (Cycles, a sky and a sun)
world = bpy.data.worlds.new("sky"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.3
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(45), 0, math.radians(140))
gm = bpy.data.meshes.new("g"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=12); bm.to_mesh(gm)
g = bpy.data.objects.new("ground", gm); scn.collection.objects.link(g)
g.data.materials.append(material("asphalt", (0.07, 0.07, 0.075), 0.9))
scn.render.engine = "CYCLES"; scn.cycles.samples = 32; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 960, 540
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam

def shot(fname, loc, look, lens=50):
    cam.location = Vector(loc); cam.data.lens = lens
    d = Vector(look) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, fname)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)

# (forward is -Y in Blender now, left +X)
shot("preview_front.png", (4.2, -6.2, 1.9), (0, -0.2, 0.65), lens=45)
shot("preview_rear.png", (-4.4, 5.6, 2.0), (0, 0.1, 0.65), lens=45)
shot("preview_side.png", (8.5, 0.0, 1.0), (0, 0.0, 0.7), lens=50)
print("DONE", PREVIEW, flush=True)
