"""CLIPPED-HEDGE SURFACE TEXTURE (the city's garden hedges, viewer/gardens/gardenHedge.js), baked from MODELLED
leaves: a tileable patch of a clipped hedge's face seen straight on (no hand painting, no AI, no photo).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/hedgeSurface.py -- textures/hedges [--size 1024] [--samples 64]

The patch (unit square, 0.6 m of a privet hedge; the shader scales it per species: box smaller, beech / hornbeam and
laurel larger leaves) is a slab of ~2,600 elliptic leaves (cupped, folded on the midrib, tilted 0-65 degrees out of the
face, any yaw) packed densely near the clipped surface and thinning inward (an exponential depth), pushed deeper in
clumps of a tileable noise (the dark holes of a real clipped hedge), with twigs inside and a dark interior behind.
Every leaf near an edge is copied across it (the patch tiles, the AO too). Two passes, both emission of data values
(Raw view, 8-bit PNG, no lighting):
  hedge_leaf_a.png   R = the leaf's own value (per-leaf jitter, a lighter midrib, darker toward the petiole; twigs 0.5)
                     G = ambient occlusion (Cycles AO, 7 cm: the gaps between leaves, the holes, the interior)
                     B = part: 0 leaf, 1 twig / the interior (the shader colours it bark-brown)
  hedge_leaf_n.png   the shading normal in the patch's frame (x = u, y = v, z out of the hedge), 0.5 + 0.5 n
Then (shipped as lossless WebP, 2 x ~1.1 MB; the PNGs are not committed):
    python -c "from PIL import Image; [Image.open(f'textures/hedges/hedge_leaf_{n}.png').convert('RGB').save(f'textures/hedges/hedge_leaf_{n}.webp', 'WEBP', lossless=True, method=6) for n in 'an']"
~15 s on the laptop GPU (OptiX). Seed fixed: the same patch every run.
"""
import bpy, math, os, sys, random
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "textures/hedges")
opt = lambda k, d: ARGS[ARGS.index(k) + 1] if k in ARGS else d
SIZE = int(opt("--size", 1024))
SAMPLES = int(opt("--samples", 64))
N_LEAVES = int(opt("--leaves", 3400))
os.makedirs(OUT, exist_ok=True)
rng = random.Random(20261118)


# ------------------------------------------------------------------------------------------- tileable noise
def _h(i, j, s):
    v = (i * 374761393 + j * 668265263 + s * 2147483647) & 0xFFFFFFFF
    v = ((v ^ (v >> 13)) * 1274126177) & 0xFFFFFFFF
    return ((v ^ (v >> 16)) & 0xFFFFFFFF) / 4294967296


def vnoise(x, y, p, s):
    fx, fy = x * p, y * p
    ix, iy = math.floor(fx), math.floor(fy)
    tx, ty = fx - ix, fy - iy
    sx, sy = tx * tx * (3 - 2 * tx), ty * ty * (3 - 2 * ty)
    g = lambda i, j: _h(i % p, j % p, s)
    a, b, c, d = g(ix, iy), g(ix + 1, iy), g(ix, iy + 1), g(ix + 1, iy + 1)
    return (a * (1 - sx) + b * sx) * (1 - sy) + (c * (1 - sx) + d * sx) * sy


def clump(x, y):
    """0 (a hole: the leaves sit deep) .. 1 (a clump at the clipped surface); tileable over the unit patch"""
    v = 0.6 * vnoise(x, y, 5, 3) + 0.4 * vnoise(x, y, 11, 7)
    return max(0.0, min(1.0, (v - 0.28) / 0.4))


# ------------------------------------------------------------------------------------------- geometry
def outline(n=12):
    """elliptic, slightly pointed (privet-like); leaf frame x 0 (petiole) .. 1 (tip), y across"""
    half = lambda t: 0.23 * math.sin(math.pi * t ** 0.8) ** 0.7 * (1 - 0.12 * t)
    return [(i / n, -half(i / n)) for i in range(n + 1)] + [(i / n, half(i / n)) for i in range(n - 1, 0, -1)]


OUTLINE = outline()


class Builder:
    def __init__(self):
        self.v, self.f, self.uv, self.val, self.part = [], [], [], [], []

    def vert(self, p, uv, val, part):
        self.v.append(p); self.uv.append(uv); self.val.append(val); self.part.append(part)
        return len(self.v) - 1

    def leaf(self, M, length, val, cup, fold, arch):
        cx = 0.5
        def bend(x, y):
            z = -cup * y * y * 4 + fold * abs(y) * 2 + arch * math.sin(math.pi * max(0.0, min(1.0, x))) * 0.6
            return Vector((x * length, y * length, z * length))
        c = self.vert(M @ bend(cx, 0.0), (cx, 0.0), val, 0.0)
        ids = []
        for r in (0.5, 1.0):
            ids.append([self.vert(M @ bend(cx + (px - cx) * r, py * r), (cx + (px - cx) * r, py * r), val, 0.0) for (px, py) in OUTLINE])
        n = len(OUTLINE)
        for i in range(n):
            self.f.append((c, ids[0][i], ids[0][(i + 1) % n]))
        for i in range(n):
            a, b, d, e = ids[0][i], ids[0][(i + 1) % n], ids[1][i], ids[1][(i + 1) % n]
            self.f.append((a, d, e)); self.f.append((a, e, b))

    def tube(self, pts, r0, r1, val, sides=5):
        rows = []
        n = len(pts)
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            u = t.cross(Vector((0, 0, 1)))
            if u.length < 1e-4:
                u = Vector((1, 0, 0))
            u.normalize()
            w = t.cross(u)
            r = r0 + (r1 - r0) * (i / max(1, n - 1))
            rows.append([self.vert(p + (u * math.cos(a) + w * math.sin(a)) * r, (0.5, 0.0), val, 1.0)
                         for a in (2 * math.pi * k / sides for k in range(sides))])
        for i in range(n - 1):
            for k in range(sides):
                a, b = rows[i][k], rows[i][(k + 1) % sides]
                c, d = rows[i + 1][k], rows[i + 1][(k + 1) % sides]
                self.f.append((a, b, d)); self.f.append((a, d, c))

    def mesh(self, name):
        me = bpy.data.meshes.new(name)
        me.from_pydata(self.v, [], self.f)
        me.update()
        for p in me.polygons:
            p.use_smooth = True
        nl = len(me.loops)
        vis = [0] * nl
        me.loops.foreach_get("vertex_index", vis)
        for nm, kind in (("leafuv", "FLOAT2"), ("val", "FLOAT"), ("part", "FLOAT")):
            me.attributes.new(nm, kind, "CORNER")
        me.attributes["leafuv"].data.foreach_set("vector", [x for v in vis for x in self.uv[v]])
        me.attributes["val"].data.foreach_set("value", [self.val[v] for v in vis])
        me.attributes["part"].data.foreach_set("value", [self.part[v] for v in vis])
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def copies(x, y, reach):
    """the shifts that keep a thing near (x, y) visible inside the unit patch (the patch tiles)"""
    out = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            if -reach <= x + dx <= 1 + reach and -reach <= y + dy <= 1 + reach:
                out.append((dx, dy))
    return out


# CLUMPS (coordinator round 1b: a clipped hedge reads by 10-30 cm leaf masses with soft shadowed hollows, not an even
# salt-and-pepper of leaves): a jittered 4 x 4 grid of domes (radius 0.14-0.24 of the patch = 8-15 cm, 35 % as tall),
# tileable; the leaves sit on the dome surface (the hollows between them deeper: darker AO) and turn with the dome's
# normal (clump-scale shading in the normal map). 3 x 3 domes, radius 0.2-0.32 (12-19 cm), 55 % as tall
_cr = random.Random(11)
DOMES = [((i + 0.2 + 0.6 * _cr.random()) / 3, (j + 0.2 + 0.6 * _cr.random()) / 3, 0.2 + 0.12 * _cr.random()) for i in range(3) for j in range(3)]


def dome(x, y):
    """the clump surface height (0 on a dome's top) and its normal at (x, y); -0.16 in a hollow"""
    best, bn = -0.16, Vector((0, 0, 1))
    for cx, cy, R in DOMES:
        for ox in (-1, 0, 1):
            for oy in (-1, 0, 1):
                dx, dy = x - cx - ox, y - cy - oy
                q = (dx * dx + dy * dy) / (R * R)
                if q >= 1:
                    continue
                h = 0.55 * R * math.sqrt(1 - q) - 0.55 * 0.32
                if h > best:
                    k = 0.55 / math.sqrt(max(1e-4, 1 - q))       # dh/dr / r
                    best, bn = h, Vector((dx * k, dy * k, 1)).normalized()
    return best, bn


def build(B):
    LEAF = 0.075                                          # 4.5 cm on the 0.6 m patch (privet)
    n = 0
    up = Vector((0, 0, 1))
    while n < N_LEAVES:
        x, y = rng.random(), rng.random()
        c = clump(x, y)
        h, dn = dome(x, y)
        # depth under the clump surface: dense at it, thinning inward; a little deeper where the noise says
        d = -math.log(1 - rng.random() * 0.97) * 0.03 + (1 - c) * 0.04 - h
        if d > 0.32:
            continue
        n += 1
        ln = LEAF * (0.8 + rng.random() * 0.4) * (0.85 if d + h > 0.08 else 1.0)
        yaw = rng.random() * math.pi * 2
        tilt = math.acos(1 - rng.random() * (1 - math.cos(math.radians(50))))   # 0..50 deg out of the clump's face
        roll = (rng.random() - 0.5) * 0.8
        val = (0.88 + rng.random() * 0.18) * (1.0 if d + h < 0.05 else 0.92)
        cup, fold, arch = 0.04 + rng.random() * 0.05, 0.04 + rng.random() * 0.05, (rng.random() - 0.3) * 0.12
        align = up.rotation_difference(up.lerp(dn, 0.85).normalized()).to_matrix().to_4x4()
        for dx, dy in copies(x, y, 0.12):
            M = (Matrix.Translation(Vector((x + dx, y + dy, -d))) @ align @ Matrix.Rotation(yaw, 4, "Z")
                 @ Matrix.Rotation(-tilt, 4, "Y") @ Matrix.Rotation(roll, 4, "X") @ Matrix.Translation(Vector((-ln * 0.3, 0, 0))))
            B.leaf(M, ln, val, cup, fold, arch)
    # twigs inside: grey-brown, mostly across the face, a few toward it
    for k in range(70):
        x, y = rng.random(), rng.random()
        a = rng.random() * math.pi * 2
        L = 0.08 + rng.random() * 0.22
        z0 = dome(x, y)[0] - 0.07 - rng.random() * 0.13       # (under the clump surface there)
        dz = (rng.random() - 0.3) * 0.08
        r0 = 0.003 + rng.random() * 0.005
        val = 0.4 + rng.random() * 0.25
        for dx, dy in copies(x, y, L + 0.02):
            s = Vector((x + dx, y + dy, z0))
            e = s + Vector((math.cos(a) * L, math.sin(a) * L, dz))
            m = (s + e) / 2 + Vector((rng.random() - 0.5, rng.random() - 0.5, 0)) * L * 0.15
            B.tube([s, m, e], r0, r0 * 0.6, val)
    return n


# ------------------------------------------------------------------------------------------- materials
def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def mnode(nt, op, a, b=None, clamp=False):
    n = nt.nodes.new("ShaderNodeMath")
    n.operation = op
    n.use_clamp = clamp
    for i, x in enumerate((a, b)):
        if x is None:
            continue
        if isinstance(x, (int, float)):
            n.inputs[i].default_value = x
        else:
            nt.links.new(x, n.inputs[i])
    return n.outputs[0]


def make_material(mode, backing=False):
    m = bpy.data.materials.new(f"hedge_{mode}{'_back' if backing else ''}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial")
    em = node(nt, "ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    comb = node(nt, "ShaderNodeCombineXYZ")
    if mode == "a":
        ao = node(nt, "ShaderNodeAmbientOcclusion", samples=16)
        ao.inputs["Distance"].default_value = 0.22
        # (the occlusion x a depth term: light fades fast into a clipped hedge, deep leaves read dark)
        geo = node(nt, "ShaderNodeNewGeometry")
        pz = node(nt, "ShaderNodeSeparateXYZ")
        nt.links.new(geo.outputs["Position"], pz.inputs[0])
        depthk = mnode(nt, "ADD", 1.0, mnode(nt, "DIVIDE", pz.outputs[2], 0.3), clamp=True)
        aod = mnode(nt, "MULTIPLY", ao.outputs["AO"], mnode(nt, "POWER", depthk, 2.2))
        if backing:
            comb.inputs[0].default_value = 0.25
            comb.inputs[1].default_value = 0.0
            comb.inputs[2].default_value = 1.0
        else:
            a_uv = node(nt, "ShaderNodeAttribute", attribute_name="leafuv", attribute_type="GEOMETRY")
            a_val = node(nt, "ShaderNodeAttribute", attribute_name="val", attribute_type="GEOMETRY")
            a_part = node(nt, "ShaderNodeAttribute", attribute_name="part", attribute_type="GEOMETRY")
            sep = node(nt, "ShaderNodeSeparateXYZ")
            nt.links.new(a_uv.outputs["Vector"], sep.inputs[0])
            ux, uy = sep.outputs[0], sep.outputs[1]
            # midrib: lighter line along y = 0, fading toward the tip; the blade darker toward the petiole
            mid = mnode(nt, "SUBTRACT", 1.0, mnode(nt, "DIVIDE", mnode(nt, "ABSOLUTE", uy), 0.014), clamp=True)
            mid = mnode(nt, "MULTIPLY", mid, mnode(nt, "SUBTRACT", 1.0, ux, clamp=True))
            base = mnode(nt, "ADD", 0.9, mnode(nt, "MULTIPLY", mnode(nt, "MINIMUM", ux, 0.5), 0.2))
            v = mnode(nt, "MULTIPLY", a_val.outputs["Fac"], base)
            v = mnode(nt, "ADD", v, mnode(nt, "MULTIPLY", mid, 0.07))
            blade = mnode(nt, "LESS_THAN", a_part.outputs["Fac"], 0.5)
            v = mnode(nt, "ADD", mnode(nt, "MULTIPLY", v, blade), mnode(nt, "MULTIPLY", a_val.outputs["Fac"], mnode(nt, "SUBTRACT", 1.0, blade)))
            nt.links.new(mnode(nt, "MULTIPLY", v, 0.8), comb.inputs[0])      # (headroom: values up to ~1.25 -> 1.0)
            nt.links.new(aod, comb.inputs[1])
            nt.links.new(a_part.outputs["Fac"], comb.inputs[2])
    else:
        geo = node(nt, "ShaderNodeNewGeometry")
        sc = node(nt, "ShaderNodeVectorMath", operation="MULTIPLY_ADD")
        if backing:
            sc.inputs[0].default_value = (0, 0, 1)
        else:
            nt.links.new(geo.outputs["Normal"], sc.inputs[0])
        sc.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(sc.outputs[0], em.inputs["Color"])
        return m
    nt.links.new(comb.outputs[0], em.inputs["Color"])
    return m


# ------------------------------------------------------------------------------------------- render
def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    try:
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "OPTIX"
        p.get_devices()
        for d in p.devices:
            d.use = d.type == "OPTIX"
        scn.cycles.device = "GPU" if any(d.use for d in p.devices) else "CPU"
    except Exception as e:                      # (no OptiX: the CPU)
        print("OPTIX unavailable:", e)
        scn.cycles.device = "CPU"
    scn.cycles.samples = SAMPLES
    scn.cycles.use_denoising = False
    scn.cycles.max_bounces = 0
    scn.cycles.filter_width = 1.2
    scn.render.film_transparent = False
    scn.render.resolution_x = scn.render.resolution_y = SIZE
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGB"
    scn.render.image_settings.color_depth = "8"
    scn.view_settings.view_transform = "Raw"
    scn.view_settings.look = "None"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    scn.world = w
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = 1.0
    cam.clip_start, cam.clip_end = 0.1, 20
    co = bpy.data.objects.new("cam", cam)
    co.location = (0.5, 0.5, 5)
    scn.collection.objects.link(co)
    scn.camera = co
    return scn


def main():
    scn = setup_scene()
    B = Builder()
    n = build(B)
    leaves = B.mesh("hedge_leaves")
    bpy.ops.mesh.primitive_plane_add(size=3, location=(0.5, 0.5, -0.3))
    back = bpy.context.active_object
    print(f"hedgeSurface: {n} leaves (+ copies across the edges), {len(B.f)} faces, device {scn.cycles.device}")
    for mode, name in (("a", "hedge_leaf_a.png"), ("n", "hedge_leaf_n.png")):
        leaves.data.materials.clear(); leaves.data.materials.append(make_material(mode))
        back.data.materials.clear(); back.data.materials.append(make_material(mode, backing=True))
        scn.render.filepath = os.path.join(OUT, name)
        bpy.ops.render.render(write_still=True)
        print("wrote", scn.render.filepath)


main()
