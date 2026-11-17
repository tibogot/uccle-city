"""THE FIR'S NEEDLE SPRAYS (the Christmas fir's near level, docs/CHRISTMAS.md "needle cards"): Nordmann fir branchlets
MODELLED needle by needle (no hand painting, no photo, no AI), rendered top and bottom into one RGBA atlas that the
fir's alpha-tested needle cards (slot "fir_cards", tools/blender/christmasKit.py) map.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/firNeedles.py -- [--samples 32]
    python -E -P tools/christmas/fir_needles_ktx2.py      (coverage-preserving alpha mips, colour bleed -> KTX2)

What a Nordmann fir branchlet is (reference: photos of cut Nordmann firs, looked at only): a reddish-brown / olive twig
with a terminal shoot and side shoots at the annual node (+ a smaller pair lower down), stout flat needles 18-30 mm,
blunt, glossy dark green above, two silvery-white stomatal bands below; the needles are parted to the SIDES and swept
FORWARD, raised into a shallow V, a shorter row on top lying forward over the twig (the twig shows from below, hardly
from above); the last summer's growth at the shoot tips a lighter, yellower green; ovoid reddish-brown buds at the tips.

Atlas (2048 x 1024, sRGB RGBA, alpha = coverage): 4 variants side by side, each cell 512 x 512 px = a spray 0.15 m wide
x 0.30 m long (the base at the cell's bottom edge, centred; the tip toward the top):
  top half    (v 0 .. 0.5)  the sprays seen from ABOVE (the card's front face)
  bottom half (v 0.5 .. 1)  the same sprays seen from BELOW, mirrored so a texel shows the same needle as the top half
                            (the card's back face samples uv + (0, 0.5): the silvery undersides, the twig)
  variants    0, 1: outer tip sprays (light new growth at the tips); 2: an older inner spray (darker, sparser, 3 node
              pairs); 3: a forked inner spray (two leaders)
Colour = linear albedo x (0.55 + 0.45 Cycles AO between the needles, 1.5 cm), rendered as emission (data, not lighting).
The coverage is kept clear of the cell borders (8 px), so no mip pulls a neighbour in.
"""
import bpy, math, os, sys, random
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = lambda k, d: ARGS[ARGS.index(k) + 1] if k in ARGS else d
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "data", "raw", "textures", "christmas")
SAMPLES = int(opt("--samples", 32))
CW, CL = 0.15, 0.30                        # a cell: spray width x length (m)
NV = 4                                     # variants
PXW, PXH = 2048, 1024                      # the render: 0.6 x 0.3 m at 3413 px / m (the atlas squeezes it to 2048 x 512)
os.makedirs(OUT, exist_ok=True)
Z = Vector((0, 0, 1))


def lin(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def lerp(a, b, t): return tuple(x + (y - x) * t for x, y in zip(a, b))
def scale(a, k): return tuple(x * k for x in a)


TOP = lin(0x274a2d)            # glossy dark green, above
TOP_DARK = lin(0x1c3a24)       # older needles
NEW = lin(0x557f3c)            # the last summer's growth at the tips
UNDER = lin(0x62816e)          # below: green + the two silvery-white stomatal bands (sub-texel at 3 px a needle: mixed)
TWIG_NEW = lin(0x7a5532)       # young shoot: reddish brown / olive
TWIG_OLD = lin(0x5d4a38)
BUD = lin(0x8a5a36)


class B:
    """one mesh: vertices, faces, a linear colour per face corner (the emission's albedo)"""
    def __init__(self): self.v, self.f, self.c = [], [], []

    def add(self, verts, faces, cols):
        o = len(self.v); self.v.extend(verts)
        for f, c in zip(faces, cols): self.f.append([o + i for i in f]); self.c.append(c)

    def obj(self, name):
        me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in self.v], [], self.f); me.update()
        for p in me.polygons: p.use_smooth = True
        a = me.attributes.new("ncol", "FLOAT_COLOR", "CORNER")
        d = []
        for p in me.polygons:
            c = self.c[p.index]
            for _ in p.loop_indices: d.extend((*c, 1.0))
        me.attributes["ncol"].data.foreach_set("color", d)
        o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
        return o


def tube(Bm, pts, r0, r1, col, sides=6):
    n = len(pts); rows = []
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
        u = t.cross(Z); u = u.normalized() if u.length > 1e-6 else Vector((1, 0, 0)); w = t.cross(u)
        r = r0 + (r1 - r0) * i / max(1, n - 1)
        rows.append([p + (u * math.cos(2 * math.pi * k / sides) + w * math.sin(2 * math.pi * k / sides)) * r for k in range(sides)])
    V = [v for r in rows for v in r]; F = []
    for i in range(n - 1):
        for k in range(sides): F.append([i * sides + k, i * sides + (k + 1) % sides, (i + 1) * sides + (k + 1) % sides, (i + 1) * sides + k])
    F.append(list(reversed(range(sides)))); F.append([(n - 1) * sides + k for k in range(sides)])
    Bm.add(V, F, [col] * len(F))


def bud(Bm, c, d, r):
    """an ovoid bud (8 x 4) at a shoot's tip, pointing along d"""
    d = d.normalized(); u = d.cross(Z); u = u.normalized() if u.length > 1e-6 else Vector((1, 0, 0)); w = d.cross(u)
    rings = [(-0.2, 0.75), (0.35, 1.0), (0.9, 0.7)]
    V = [c + d * (a * r * 1.6) + (u * math.cos(2 * math.pi * k / 8) + w * math.sin(2 * math.pi * k / 8)) * rr * r for a, rr in rings for k in range(8)]
    b0 = len(V); V.append(c - d * r * 0.6); t0 = len(V); V.append(c + d * r * 2.3)
    F = [[j * 8 + k, j * 8 + (k + 1) % 8, (j + 1) * 8 + (k + 1) % 8, (j + 1) * 8 + k] for j in range(2) for k in range(8)]
    F += [[b0, (k + 1) % 8, k] for k in range(8)] + [[t0, 16 + k, 16 + (k + 1) % 8] for k in range(8)]
    Bm.add(V, F, [BUD] * len(F))


def needle(Bm, p, D, up, L, top_col, under_col, w=0.0021, th=0.0008):
    """a flat, blunt needle: a lens-shaped section (left, top, right, bottom) at 5 stations, curving a little up; the
    upper faces take the top colour, the lower faces the underside's"""
    D = D.normalized(); W = D.cross(up).normalized(); U = W.cross(D).normalized()
    st = [(0.0, 0.45), (0.12, 0.9), (0.5, 1.0), (0.85, 0.85), (1.0, 0.45)]
    V = []
    for s, k in st:
        q = p + D * (L * s) + U * (L * 0.07 * s * s)                 # (a slight upward curve)
        hw, ht = w * 0.5 * k, th * 0.5 * k
        V += [q - W * hw, q + U * ht, q + W * hw, q - U * ht]
    F, C = [], []
    for i in range(len(st) - 1):
        a = i * 4; b = a + 4
        F += [[a, b, b + 1, a + 1], [a + 1, b + 1, b + 2, a + 2], [a + 2, b + 2, b + 3, a + 3], [a + 3, b + 3, b, a]]
        C += [top_col, top_col, under_col, under_col]
    tip = len(V); V.append(p + D * (L * 1.03) + U * (L * 0.07))
    e = (len(st) - 1) * 4
    for k in range(4): F.append([e + k, e + (k + 1) % 4, tip]); C.append(top_col if k < 2 else under_col)
    F.append([3, 2, 1, 0]); C.append(under_col)
    Bm.add(V, F, C)


def shoot(Bm, rnd, base, d0, Ls, bend, new_len, nl_k, old, density=1.0, twig_r=0.0015):
    """a shoot: its twig (a gentle curve in the spray's plane, drooping a hair), its needles, the bud at its tip.
    Returns the twig's points."""
    n = 10
    pts = []
    d = Vector(d0).normalized()
    for i in range(n + 1):
        t = i / n
        ang = bend * t
        dd = Matrix.Rotation(ang, 3, Z) @ d
        pts.append(base + dd * (Ls * t) + Z * (-0.004 * t * t))
    tube(Bm, pts, twig_r, twig_r * 0.55, lerp(TWIG_OLD, TWIG_NEW, 0.4 if old else 0.85))
    s_step = 0.00088 / density
    s = 0.004
    i = 0
    while s < Ls - 0.002:
        t = s / Ls
        k = min(n - 1, int(t * n)); f = t * n - k
        P = pts[k].lerp(pts[k + 1], f)
        T = (pts[k + 1] - pts[k]).normalized(); Bv = Z.cross(T).normalized(); N = T.cross(Bv).normalized()
        tipness = max(0.0, (s - (Ls - new_len)) / max(new_len, 1e-6))   # 0 old .. 1 at the tip (new growth)
        taper = 0.5 + 0.5 * min(1.0, (Ls - s) / 0.03)                     # shorter needles toward the tip
        if old and rnd.random() < 0.14: s += s_step; i += 1; continue    # older shoots: some needles lost
        r = rnd.random()
        if r < 0.72:
            side = 1 if i % 2 else -1
            lift = math.radians(rnd.uniform(10, 26))
            beta = math.radians(rnd.uniform(56, 74) - 22 * tipness)          # swept forward toward the tip
            radial = Bv * (side * math.cos(lift)) + N * math.sin(lift)
            Dn = T * math.cos(beta) + radial * math.sin(beta)
            L = rnd.uniform(0.019, 0.027) * nl_k * taper
            up = N
        else:
            phi = math.radians(rnd.uniform(-40, 40))
            beta = math.radians(rnd.uniform(26, 40))
            radial = N * math.cos(phi) + Bv * math.sin(phi)
            Dn = T * math.cos(beta) + radial * math.sin(beta)
            L = rnd.uniform(0.014, 0.02) * nl_k * taper
            up = (N - T * N.dot(T)).normalized() if abs(phi) < 0.3 else N
        tw = rnd.uniform(-0.1, 0.1)
        base_c = TOP_DARK if old else TOP
        top = lerp(base_c, NEW, min(1.0, tipness * 1.1) * (0.0 if old else 1.0))
        top = scale(top, rnd.uniform(0.82, 1.15))
        under = scale(lerp(UNDER, lerp(UNDER, NEW, 0.5), tipness * (0.0 if old else 0.6)), rnd.uniform(0.85, 1.1))
        needle(Bm, P + N * 0.0006, Dn, (up + T * tw).normalized(), L, top, under)
        s += s_step * rnd.uniform(0.8, 1.2); i += 1
    bud(Bm, pts[-1], pts[-1] - pts[-2], 0.0016 if not old else 0.0013)
    return pts


def spray(v, x0):
    """one variant, its base at (x0, 0), growing along +Y"""
    rnd = random.Random(310 + v * 17)
    Bm = B()
    base = Vector((x0, 0.002, 0))
    if v in (0, 1):
        sgn = 1 if v == 0 else -1
        main = shoot(Bm, rnd, base, (0.02 * sgn, 1, 0), 0.272, 0.06 * sgn, 0.085, 1.0, False, twig_r=0.0017)
        node = main[4]
        for side, Ls, ang in ((1, 0.106 if v == 0 else 0.094, 46), (-1, 0.096 if v == 0 else 0.108, 48)):
            d = Matrix.Rotation(math.radians(ang * side), 3, Z) @ (main[5] - main[4]).normalized()
            shoot(Bm, rnd, node, d, Ls, -0.12 * side, 0.05, 0.85, False, twig_r=0.0011)
        node2 = main[1]
        for side in (1, -1):
            d = Matrix.Rotation(math.radians(56 * side), 3, Z) @ (main[2] - main[1]).normalized()
            shoot(Bm, rnd, node2, d, 0.066, -0.1 * side, 0.0, 0.75, True, density=0.8, twig_r=0.0009)
    elif v == 2:
        main = shoot(Bm, rnd, base, (-0.01, 1, 0), 0.28, -0.04, 0.0, 0.95, True, density=0.85, twig_r=0.0018)
        for j, (i, Ls) in enumerate(((2, 0.06), (5, 0.085), (7, 0.06))):
            for side in (1, -1):
                d = Matrix.Rotation(math.radians((50 + 6 * j) * side), 3, Z) @ (main[i + 1] - main[i]).normalized()
                shoot(Bm, rnd, main[i], d, Ls * rnd.uniform(1.0, 1.2), -0.1 * side, 0.0, 0.85, True, density=0.85, twig_r=0.001)
    else:
        main = shoot(Bm, rnd, base, (0, 1, 0), 0.11, 0.0, 0.0, 0.95, True, density=0.9, twig_r=0.0019)
        fork = main[-1]
        for side, Ls in ((1, 0.17), (-1, 0.18)):
            d = Matrix.Rotation(math.radians(17 * side), 3, Z) @ Vector((0, 1, 0))
            sub = shoot(Bm, rnd, fork, d, Ls, -0.05 * side, 0.05, 0.95, False, twig_r=0.0013)
            dd = Matrix.Rotation(math.radians(46 * side), 3, Z) @ (sub[4] - sub[3]).normalized()
            shoot(Bm, rnd, sub[3], dd, 0.06, -0.1 * side, 0.03, 0.8, False, twig_r=0.0009)
        for side in (1, -1):
            d = Matrix.Rotation(math.radians(50 * side), 3, Z) @ Vector((0, 1, 0))
            shoot(Bm, rnd, main[4], d, 0.055, -0.1 * side, 0.0, 0.75, True, density=0.8, twig_r=0.0009)
    o = Bm.obj(f"spray{v}")
    # keep it inside its cell (8 px = 2.3 mm clear of the borders): scale about the base if it overflows
    xs = [p.x - x0 for p in Bm.v]; ys = [p.y for p in Bm.v]
    m = 0.0024
    k = min(1.0, (CW / 2 - m) / max(1e-6, max(abs(min(xs)), abs(max(xs)))), (CL - m) / max(1e-6, max(ys)))
    if k < 1.0:
        o.data.transform(Matrix.Translation((x0, 0, 0)) @ Matrix.Scale(k, 4) @ Matrix.Translation((-x0, 0, 0)))
    print(f"[firNeedles] spray {v}: {len(Bm.f)} faces, fit x {k:.3f}")
    return o


# ------------------------------------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "OPTIX"; pr.get_devices()
    on = [d for d in pr.devices if d.type == "OPTIX"]
    for d in pr.devices: d.use = d.type == "OPTIX"
    scn.cycles.device = "GPU" if on else "CPU"
except Exception as e:
    scn.cycles.device = "CPU"; print("[firNeedles] CPU:", e)
print("[firNeedles] Cycles device:", scn.cycles.device)
scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = False; scn.cycles.max_bounces = 0
scn.render.film_transparent = True
scn.render.resolution_x, scn.render.resolution_y, scn.render.resolution_percentage = PXW, PXH, 100
scn.render.image_settings.file_format = "PNG"; scn.render.image_settings.color_mode = "RGBA"; scn.render.image_settings.color_depth = "8"
scn.view_settings.view_transform = "Standard"; scn.view_settings.look = "None"
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0; scn.world = w

mat = bpy.data.materials.new("needles"); mat.use_nodes = True
nt = mat.node_tree; nt.nodes.clear()
out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "ncol"; at.attribute_type = "GEOMETRY"
ao = nt.nodes.new("ShaderNodeAmbientOcclusion"); ao.samples = 16; ao.inputs["Distance"].default_value = 0.015
mk = nt.nodes.new("ShaderNodeMath"); mk.operation = "MULTIPLY_ADD"; mk.inputs[1].default_value = 0.45; mk.inputs[2].default_value = 0.55
nt.links.new(ao.outputs["AO"], mk.inputs[0])
mul = nt.nodes.new("ShaderNodeVectorMath"); mul.operation = "SCALE"
nt.links.new(at.outputs["Color"], mul.inputs[0]); nt.links.new(mk.outputs[0], mul.inputs["Scale"])
nt.links.new(mul.outputs[0], em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs["Surface"])

objs = [spray(v, CW * (v + 0.5)) for v in range(NV)]
for o in objs: o.data.materials.append(mat)

cam_d = bpy.data.cameras.new("cam"); cam_d.type = "ORTHO"; cam_d.ortho_scale = CW * NV; cam_d.clip_start, cam_d.clip_end = 0.01, 5
cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
CX, CY = CW * NV / 2, CL / 2


def shot(path, below):
    if below:
        cam.location = (CX, CY, -1.0); cam.rotation_euler = (0, math.pi, 0)       # looking up; +Y stays up, x mirrored
    else:
        cam.location = (CX, CY, 1.0); cam.rotation_euler = (0, 0, 0)
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("[firNeedles] wrote", path)


shot(os.path.join(OUT, "fir_needles_top.png"), False)
shot(os.path.join(OUT, "fir_needles_bottom.png"), True)
print("[firNeedles] done: python -E -P tools/christmas/fir_needles_ktx2.py")
