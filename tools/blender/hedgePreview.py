# HEDGE PREVIEW (headless, not shipped): "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/hedgePreview.py -- <abs textures/hedges> <out dir>
# round 1b: a 5 m privet hedge run as gardenHedge.js draws it: the LOD0 section (H 1.3, W 0.6), the baked surface
# (two anti-tiling taps, AO into colour, normals), the foot (leaves thin out into stems / dark inside), the grazing
# silhouette breakup, and the 48 + 6 leaf cards a module as real leaf sprays (top corners x3, top x1.6, upper sides,
# both run ends). Sun on the long face, sky fill.
import bpy, bmesh, math, sys, os, random
from mathutils import Vector, Matrix
ARGS = sys.argv[sys.argv.index("--") + 1:]
TEX, OUT = ARGS[0], ARGS[1]
rng = random.Random(5)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
p = bpy.context.preferences.addons["cycles"].preferences; p.compute_device_type = "OPTIX"; p.get_devices()
for d in p.devices: d.use = d.type == "OPTIX"
scn.cycles.device = "GPU"; scn.cycles.samples = 128; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1280, 720
scn.view_settings.view_transform = "AgX"; scn.view_settings.look = "AgX - Medium High Contrast"
def lin(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
LEAF = lin(0x557a2b)
H, W, Lr = 1.3, 0.6, 5.0
B, r, wt = -0.12, 0.16, 0.47
half = [(-0.46, B), (-0.48, 0.06), (-0.5, 0.32), (-0.49, 0.6)]
for k in range(4):
    a = math.pi - (k / 3) * (math.pi / 2); half.append((-wt + r + math.cos(a) * r, 1 - r + math.sin(a) * r))
sec = half + [(0, 1.03)] + [(-z, y) for (z, y) in reversed(half)]
vs = [0.0]
for k in range(1, len(sec)):
    vs.append(vs[-1] + abs(sec[k][1] - sec[k - 1][1]) * H + abs(sec[k][0] - sec[k - 1][0]) * W)
bm = bmesh.new(); uvl = bm.loops.layers.uv.new()
NR = 60
def lump(x, y):
    return 0.03 * (math.sin(x * 2.6 + y * 3) * 0.6 + math.sin(x * 7.3 + 1.7) * 0.4) * min(1, max(0, y) * H / 0.25)
rows = []
for i in range(NR + 1):
    x = Lr * i / NR
    row = []
    for (z, y) in sec:
        l = lump(x, y)
        n = Vector((0, z, y - 0.5)).normalized() if y > 0.6 else Vector((0, math.copysign(1, z), 0))
        row.append(bm.verts.new((x, z * W + n.y * l, y * H + n.z * l)))
    rows.append(row)
for i in range(NR):
    for k in range(len(sec) - 1):
        f = bm.faces.new((rows[i][k], rows[i + 1][k], rows[i + 1][k + 1], rows[i][k + 1]))
        for lp, (ii, kk) in zip(f.loops, ((i, k), (i + 1, k), (i + 1, k + 1), (i, k + 1))):
            lp[uvl].uv = (Lr * ii / NR / 0.6, vs[kk] / 0.6)
for (ii, s) in ((0, -1), (NR, 1)):
    f = bm.faces.new(rows[ii] if s > 0 else list(reversed(rows[ii])))
    for lp in f.loops:
        lp[uvl].uv = (s * lp.vert.co.y / 0.6 + 7, lp.vert.co.z / 0.6)
me = bpy.data.meshes.new("hedge"); bm.to_mesh(me); hedge = bpy.data.objects.new("hedge", me); scn.collection.objects.link(hedge)
for f in me.polygons: f.use_smooth = False

m = bpy.data.materials.new("hedge"); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes["Principled BSDF"]
def N(kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items(): setattr(n, k, v)
    return n
def M(op, a, b=None):
    n = N("ShaderNodeMath", operation=op)
    for i, x in enumerate((a, b)):
        if x is None: continue
        if isinstance(x, (int, float)): n.inputs[i].default_value = x
        else: nt.links.new(x, n.inputs[i])
    return n.outputs[0]
def SS(x, a, b):
    n = N("ShaderNodeMapRange", interpolation_type="SMOOTHSTEP"); n.inputs[1].default_value = a; n.inputs[2].default_value = b
    if isinstance(x, (int, float)): n.inputs[0].default_value = x
    else: nt.links.new(x, n.inputs[0])
    return n.outputs[0]
def MIXC(f, a, b):
    n = N("ShaderNodeMix", data_type="RGBA"); nt.links.new(f, n.inputs[0])
    for i, x in ((6, a), (7, b)):
        if isinstance(x, tuple): n.inputs[i].default_value = (*x, 1)
        else: nt.links.new(x, n.inputs[i])
    return n.outputs[2]
imgA = bpy.data.images.load(os.path.join(TEX, "hedge_leaf_a.webp")); imgA.colorspace_settings.name = "Non-Color"
imgN = bpy.data.images.load(os.path.join(TEX, "hedge_leaf_n.webp")); imgN.colorspace_settings.name = "Non-Color"
tc = N("ShaderNodeTexCoord")
mp = N("ShaderNodeMapping"); nt.links.new(tc.outputs["UV"], mp.inputs[0])
mp.inputs["Rotation"].default_value = (0, 0, 1.1); mp.inputs["Scale"].default_value = (0.83, 0.83, 1); mp.inputs["Location"].default_value = (0.31, 0.57, 0)
def tex(img, vec):
    t = N("ShaderNodeTexImage"); t.image = img; nt.links.new(vec, t.inputs[0]); return t.outputs["Color"]
a1, a2 = tex(imgA, tc.outputs["UV"]), tex(imgA, mp.outputs[0])
n1, n2 = tex(imgN, tc.outputs["UV"]), tex(imgN, mp.outputs[0])
s1 = N("ShaderNodeSeparateColor"); nt.links.new(a1, s1.inputs[0])
s2 = N("ShaderNodeSeparateColor"); nt.links.new(a2, s2.inputs[0])
nz = N("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 0.6 / 2.2 * 3; nt.links.new(tc.outputs["UV"], nz.inputs["Vector"])
wB = SS(M("ADD", nz.outputs["Fac"], M("MULTIPLY", M("SUBTRACT", s2.outputs[1], s1.outputs[1]), 0.6)), 0.38, 0.62)
A = MIXC(wB, a1, a2); Nn = MIXC(wB, n1, n2)
sa = N("ShaderNodeSeparateColor"); nt.links.new(A, sa.inputs[0])
val, occl, part = sa.outputs[0], sa.outputs[1], sa.outputs[2]
geo = N("ShaderNodeNewGeometry"); sp = N("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Position"], sp.inputs[0])
footK = SS(sp.outputs[2], 0.04, 0.42)
thr = M("MULTIPLY", M("SUBTRACT", 1.0, footK), 0.62)
leafy = M("MAXIMUM", SS(M("SUBTRACT", occl, thr), -0.1, 0.1), SS(footK, 0.85, 1.0))
gz = N("ShaderNodeSeparateXYZ"); nt.links.new(geo.outputs["Normal"], gz.inputs[0])
upk = M("ADD", 0.92, M("MULTIPLY", M("POWER", M("MAXIMUM", gz.outputs[2], 0.0), 2.0), 0.2))
leafC = MIXC(part, LEAF, (0.05, 0.038, 0.028))
alb = N("ShaderNodeVectorMath", operation="SCALE"); nt.links.new(leafC, alb.inputs[0]); nt.links.new(M("MULTIPLY", M("MULTIPLY", val, 1.25), upk), alb.inputs["Scale"])
wave = N("ShaderNodeTexWave", wave_type="BANDS", bands_direction="X"); wave.inputs["Scale"].default_value = 5.3 * 0.6; wave.inputs["Distortion"].default_value = 4; nt.links.new(tc.outputs["UV"], wave.inputs["Vector"])
stem = M("MULTIPLY", SS(wave.outputs["Fac"], 0.82, 0.95), SS(sp.outputs[2], 0.0, 0.08))
inside = MIXC(M("MULTIPLY", stem, 0.8), (0.016, 0.013, 0.01), (0.075, 0.062, 0.048))
base = MIXC(leafy, inside, alb.outputs[0])
soil = SS(sp.outputs[2], 0.035, 0.0)
base = MIXC(M("MULTIPLY", soil, 0.8), base, (0.045, 0.034, 0.025))
col = N("ShaderNodeVectorMath", operation="SCALE"); nt.links.new(base, col.inputs[0]); nt.links.new(M("ADD", 0.5, M("MULTIPLY", occl, 0.5)), col.inputs["Scale"])
nt.links.new(col.outputs[0], bs.inputs["Base Color"])
nmix = MIXC(leafy, (0.5, 0.5, 1.0), Nn)
nm = N("ShaderNodeNormalMap"); nt.links.new(nmix, nm.inputs["Color"]); nt.links.new(nm.outputs[0], bs.inputs["Normal"])
bs.inputs["Roughness"].default_value = 0.6
lw = N("ShaderNodeLayerWeight"); lw.inputs["Blend"].default_value = 0.5
corner = M("MULTIPLY", M("MULTIPLY", SS(gz.outputs[2], 0.1, 0.25), SS(gz.outputs[2], 0.97, 0.9)), SS(sp.outputs[2], 0.8 * H, 0.9 * H))
graze = M("MULTIPLY", SS(lw.outputs["Facing"], 0.72, 0.95), corner)
keep = M("GREATER_THAN", occl, M("MULTIPLY", graze, 0.42))
tr = N("ShaderNodeBsdfTransparent"); ms = N("ShaderNodeMixShader")
nt.links.new(keep, ms.inputs[0]); nt.links.new(tr.outputs[0], ms.inputs[1]); nt.links.new(bs.outputs[0], ms.inputs[2])
nt.links.new(ms.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
hedge.data.materials.append(m)

# the cards as leaf sprays: 9 leaves each, ~0.24 m, tilted 25-65 deg out of the surface
outline = [(i / 10, -0.23 * math.sin(math.pi * (i / 10) ** 0.8) ** 0.7) for i in range(11)] + [(i / 10, 0.23 * math.sin(math.pi * (i / 10) ** 0.8) ** 0.7) for i in range(9, 0, -1)]
V, F, C = [], [], []
def leaf(Mx, ln, v):
    c0 = len(V)
    for (x, y) in outline:
        V.append(Mx @ Vector((x * ln, y * ln, -0.08 * ln * (y / 0.23) ** 2)))
    F.append(list(range(c0, len(V)))); C.append(v)
def spray(pos, nrm, size):
    upv = Vector((1, 0, 0)) if abs(nrm.z) > 0.9 else Vector((0, 0, 1))
    t1 = upv.cross(nrm).normalized(); t2 = nrm.cross(t1)
    ang = rng.random() * 6.283; ax = t1 * math.cos(ang) + t2 * math.sin(ang); ay = t2 * math.cos(ang) - t1 * math.sin(ang)
    tilt = 1.05 + 0.45 * rng.random()
    cn = (nrm * math.cos(tilt) + ay * math.sin(tilt)).normalized()
    centre = pos + nrm * size * 0.12 + cn * 0.0
    bx = cn.cross(ax).normalized()
    for k in range(12):
        a = rng.random() * 6.283; rr = math.sqrt(rng.random()) * size * 0.32
        q = centre + (ax * math.cos(a) + bx * math.sin(a)) * rr
        aa = a + (rng.random() - 0.5)
        xdir = (ax * math.cos(aa) + bx * math.sin(aa)).normalized()
        ydir = cn.cross(xdir)
        Mx = Matrix((xdir, ydir, cn)).transposed().to_4x4(); Mx.translation = q
        leaf(Mx, 0.045 * (0.8 + 0.4 * rng.random()), 0.8 + 0.3 * rng.random())
segs = []
S1 = [(z, y) for (z, y) in sec if y > 0.25]
for k in range(len(S1) - 1):
    (z0, y0), (z1, y1) = S1[k], S1[k + 1]
    L = math.hypot(z1 - z0, y1 - y0); round_ = y0 > 0.8 and y1 > 0.8 and (abs(z0) > 0.3 or abs(z1) > 0.3)
    w = 1.8 if round_ else 1.3 if (y0 > 0.99 and y1 > 0.99) else 1
    segs.append((z0, y0, z1, y1, L * w))
tot = sum(s[4] for s in segs)
for mod in range(5):
    for c in range(48):
        t = rng.random() * tot
        for s in segs:
            if t < s[4]: break
            t -= s[4]
        f = rng.random(); z = s[0] + (s[2] - s[0]) * f; y = s[1] + (s[3] - s[1]) * f
        nrm = Vector((0, (s[3] - s[1]) * H, -(s[2] - s[0]) * W)).normalized()
        if Vector((0, z, y - 0.5)).dot(nrm) < 0: nrm = -nrm
        x = mod + (c + rng.random()) / 48
        spray(Vector((x, z * W, y * H + lump(x, y))), nrm, 0.24 * (0.5 + 0.3 * rng.random()))
for end in (0, 1):
    for c in range(3):
        spray(Vector((end * Lr, (rng.random() - 0.5) * 0.8 * W, (0.35 + 0.6 * rng.random()) * H)), Vector((1 if end else -1, 0, 0)), 0.24 * (0.5 + 0.3 * rng.random()))
cm = bpy.data.meshes.new("cards"); cm.from_pydata(V, [], F); cm.update()
cm.attributes.new("val", "FLOAT", "FACE"); cm.attributes["val"].data.foreach_set("value", C)
cards = bpy.data.objects.new("cards", cm); scn.collection.objects.link(cards)
lm = bpy.data.materials.new("leaf"); lm.use_nodes = True; lt = lm.node_tree; lb = lt.nodes["Principled BSDF"]
at = lt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "val"
sc = lt.nodes.new("ShaderNodeVectorMath"); sc.operation = "SCALE"; sc.inputs[0].default_value = LEAF; lt.links.new(at.outputs["Fac"], sc.inputs["Scale"])
lt.links.new(sc.outputs[0], lb.inputs["Base Color"]); lb.inputs["Roughness"].default_value = 0.55
cards.data.materials.append(lm)

bpy.ops.mesh.primitive_plane_add(size=40, location=(2.5, 0, 0.0)); g = bpy.context.active_object
gm = bpy.data.materials.new("lawn"); gm.use_nodes = True; gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.045, 0.075, 0.02, 1); g.data.materials.append(gm)
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 4.0; sun.angle = 0.02
so = bpy.data.objects.new("sun", sun); so.rotation_euler = (math.radians(50), 0, math.radians(-20)); scn.collection.objects.link(so)
w = bpy.data.worlds.new("w"); w.use_nodes = True; w.node_tree.nodes["Background"].inputs[0].default_value = (0.62, 0.72, 0.86, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7; scn.world = w
cam = bpy.data.cameras.new("c"); cam.lens = 30; co = bpy.data.objects.new("c", cam); scn.collection.objects.link(co); scn.camera = co
for name, loc, tgt in (("near", (-1.0, -2.6, 1.55), (2.0, 0, 0.8)), ("far", (-6.5, -9.0, 1.7), (2.5, 0, 0.7)), ("close", (0.6, -1.3, 1.2), (1.8, 0, 0.9))):
    co.location = loc
    d = [tgt[i] - loc[i] for i in range(3)]
    co.rotation_euler = (math.atan2(math.hypot(d[0], d[1]), -d[2]), 0, math.atan2(d[1], d[0]) - math.pi / 2)
    scn.render.filepath = os.path.join(OUT, f"preview2_{name}.png")
    bpy.ops.render.render(write_still=True)
