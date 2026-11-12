"""LEAF-SPRAY TEXTURES for the stylized trees' leaf cards, baked from MODELLED leaves (no hand painting, no AI):
one camera-facing card = one spray texture filling the card's unit square, as the procedural masks of
viewer/treesPlane.js / viewer/treesBeech.js (same layout: twigs from the centre out, the cluster rounded off), but
from real 3D leaves: cupped, folded along the midrib, tilted (foreshortened), with petioles and twigs, lit by nothing
(every pass is an emission of a data value) except a Cycles ambient occlusion between the leaves in the albedo.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/leafAtlas.py -- data/raw/textures/trees/blender [--species plane|beech] [--size 2048] [--samples 48]

Passes per species (PNG, RGBA, film transparent: alpha = coverage of the spray):
  <sp>_albedo.png     linear emission rendered with the Standard view (sRGB PNG): the leaf colour per leaf (hue / value
                      spread), lighter veins, darker toward the petiole, yellow-green petioles, grey-brown twigs, x AO
  <sp>_normal.png     Raw view (linear PNG, 16 bit): the shading normal in CAMERA space (x right, y UP in the image,
                      z toward the viewer), OpenGL convention, back faces flipped toward the camera, veins as bump
  <sp>_thick.png      Raw view: thickness (0.25 blade .. 1 twig): the light through the leaf, 1 - thickness
Then tools/textures/process_tree_textures.py fades the cluster round, bleeds the colour under alpha 0, builds the
coverage-preserving alpha mips and writes the KTX2.

Plane (Platanus x acerifolia): palmate, 5 pointed lobes (the central longest), a few big teeth, a truncate base,
5 main veins radiating from the petiole. Beech (Fagus sylvatica): ovate, pointed, wavy margin, a midrib and 7 straight
parallel vein pairs; flat two-ranked sprays on zigzag twigs.
"""
import bpy, bmesh, math, os, sys, random
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "data/raw/textures/trees/blender")
opt = lambda k, d: ARGS[ARGS.index(k) + 1] if k in ARGS else d
SPECIES = [opt("--species", None)] if "--species" in ARGS else ["plane", "beech"]
SIZE = int(opt("--size", 2048))
SAMPLES = int(opt("--samples", 48))
os.makedirs(OUT, exist_ok=True)


def lin(hexrgb):
    c = [((hexrgb >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


# ------------------------------------------------------------------------------------------- leaf outlines
# (leaf frame: x along the midrib from the petiole's end (0) to the tip (1), y across; returns (x, y) points CCW)
PLANE_LOBES = [(0.0, 1.0), (0.78, 0.8), (-0.78, 0.8), (1.55, 0.45), (-1.55, 0.45)]


def plane_outline(wob, n=160):
    pts = []
    for i in range(n):
        th = -math.pi + (i / n) * math.pi * 2
        # (a broad blade, lobed to about a third: the canvas mask's star-like lobes (r from 0.2) read as a flower when
        # modelled; the plane's leaf is a maple-like palm with shallow, pointed lobes)
        r = 0.5 * (1 - 0.35 * (abs(th) / math.pi) ** 2)
        for a, L in PLANE_LOBES:
            x = th - a * (1 + wob * 0.02)
            c = max(0.0, math.cos(x * 1.9))
            r = max(r, L * c ** 1.5)
        r *= 1 + 0.07 * max(0.0, math.sin(th * 13 + wob)) ** 6          # big teeth on the lobe sides
        if abs(abs(th) - math.pi) < 0.35:                                 # the truncate base, the petiole's notch
            r *= 0.55 + 0.45 * (abs(abs(th) - math.pi) / 0.35)
        pts.append((0.42 + math.cos(th) * r * 0.62, math.sin(th) * r * 0.62))
    return pts, (0.42 - 0.62 * 0.11, 0.0)      # outline, the petiole's attachment point


def beech_outline(wav, n=60):
    def half(t):
        return 0.31 * math.sin(math.pi * min(1.0, t * 0.94 + 0.03)) ** 0.75 * (1 - 0.3 * t) * (1 + 0.045 * math.sin(t * math.pi * 9 + wav))
    pts = [(i / n, -half(i / n)) for i in range(n + 1)] + [(i / n, half(i / n)) for i in range(n - 1, 0, -1)]
    return pts, (0.0, 0.0)


# ------------------------------------------------------------------------------------------- geometry
class Builder:
    """All leaves of a spray in one mesh (shared vertices: smooth normals); per vertex leafuv (leaf frame), leafcol
    (linear RGB), part (0 blade, 2 petiole, 3 twig), written as corner attributes."""
    def __init__(self):
        self.v, self.f, self.uv, self.col, self.part = [], [], [], [], []
        self.tuv = {}                                   # scanned leaves: vertex -> uv in the scan atlas

    def vert(self, p, uv, col, part):
        self.v.append(p); self.uv.append(uv); self.col.append(col); self.part.append(part)
        return len(self.v) - 1

    def leaf(self, outline, attach, M, length, col, cup, fold, arch, part=0.0):
        """A blade: the outline in rings toward a centre on the midrib, bent (cupped across, folded along the midrib,
        arched along it), placed by M (leaf frame -> card), `length` = midrib length."""
        cx = sum(p[0] for p in outline) / len(outline)
        rings = [0.35, 0.68, 1.0]
        def bend(x, y):
            z = -cup * y * y * 4 + fold * abs(y) * 2 + arch * math.sin(math.pi * max(0.0, min(1.0, x))) * 0.6
            return Vector((x * length, y * length, z * length))
        n = len(outline)
        c = self.vert(M @ bend(cx, 0.0), (cx, 0.0), col, part)
        ids = []
        for r in rings:
            row = []
            for (px, py) in outline:
                q = (cx + (px - cx) * r, py * r)
                row.append(self.vert(M @ bend(*q), q, col, part))
            ids.append(row)
        for i in range(n):
            self.f.append((c, ids[0][i], ids[0][(i + 1) % n]))
        for k in range(len(rings) - 1):
            for i in range(n):
                a, b = ids[k][i], ids[k][(i + 1) % n]
                d, e = ids[k + 1][i], ids[k + 1][(i + 1) % n]
                self.f.append((a, d, e)); self.f.append((a, e, b))
        return M @ bend(*attach)

    def tube(self, pts, r0, r1, col, part, sides=6):
        """A twig / petiole: a tube along pts (card space), radius r0 -> r1."""
        n = len(pts)
        rows = []
        for i, p in enumerate(pts):
            t = (pts[min(i + 1, n - 1)] - pts[max(i - 1, 0)]).normalized()
            u = t.cross(Vector((0, 0, 1)))
            if u.length < 1e-4:
                u = Vector((1, 0, 0))
            u.normalize()
            w = t.cross(u)
            r = r0 + (r1 - r0) * (i / max(1, n - 1))
            rows.append([self.vert(p + (u * math.cos(a) + w * math.sin(a)) * r, (0.5, 0.0), col, part)
                         for a in (2 * math.pi * k / sides for k in range(sides))])
        for i in range(n - 1):
            for k in range(sides):
                a, b = rows[i][k], rows[i][(k + 1) % sides]
                c, d = rows[i + 1][k], rows[i + 1][(k + 1) % sides]
                self.f.append((a, b, d)); self.f.append((a, d, c))

    def scan_leaf(self, M, length, cell, col, cup, fold, arch):
        """A SCANNED leaf (option C): a bent grid quad showing one leaf of a CC0 leaf atlas (cell = its uv box, the
        petiole at the bottom of the image), the same bend as the modelled blades; the scan's own petiole is drawn."""
        u0, v0, u1, v1 = cell
        asp = (u1 - u0) / max(1e-6, (v1 - v0)) * SCAN_ASPECT
        nu, nv = 7, 12
        ids = []
        for j in range(nv + 1):
            x = j / nv
            row = []
            for i in range(nu + 1):
                y = (i / nu - 0.5) * asp
                yy = y / max(asp, 1e-6) * 0.62          # (the bend's "across" in the modelled leaves' units)
                z = -cup * yy * yy * 4 + fold * abs(yy) * 2 + arch * math.sin(math.pi * x) * 0.6
                p = M @ Vector((x * length, y * length, z * length))
                ti = len(self.v)
                self.vert(p, (x, y), col, 0.0)
                self.tuv[ti] = (u0 + (i / nu) * (u1 - u0), v0 + x * (v1 - v0))
                row.append(ti)
            ids.append(row)
        for j in range(nv):
            for i in range(nu):
                a, b, c, d = ids[j][i], ids[j][i + 1], ids[j + 1][i], ids[j + 1][i + 1]
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
        me.uv_layers.new(name="UVMap")
        for nm, kind in (("leafuv", "FLOAT2"), ("leafcol", "FLOAT_COLOR"), ("part", "FLOAT")):
            me.attributes.new(nm, kind, "CORNER")
        # (looked up again after every creation: adding an attribute reallocates the collection)
        flat = lambda rows: [x for r in rows for x in r]
        me.uv_layers["UVMap"].data.foreach_set("uv", flat(self.tuv.get(v, (0.0, 0.0)) for v in vis))
        me.attributes["leafuv"].data.foreach_set("vector", flat(self.uv[v] for v in vis))
        me.attributes["leafcol"].data.foreach_set("color", flat((*self.col[v], 1.0) for v in vis))
        me.attributes["part"].data.foreach_set("value", [self.part[v] for v in vis])
        ob = bpy.data.objects.new(name, me)
        bpy.context.scene.collection.objects.link(ob)
        return ob


def leaf_matrix(pos, ang, roll, pitch, z):
    """Leaf frame -> card: turned by ang in the card plane, rolled round its midrib, pitched (tip up / down)."""
    return (Matrix.Translation(Vector((pos[0], pos[1], z))) @ Matrix.Rotation(ang, 4, "Z")
            @ Matrix.Rotation(pitch, 4, "Y") @ Matrix.Rotation(roll, 4, "X"))


def jit(c, rng, v=0.16, h=0.08):
    k = 1 + (rng.random() - 0.5) * 2 * v
    hy = (rng.random() - 0.5) * 2 * h           # toward yellow (+) or blue-green (-)
    return (max(0, c[0] * k * (1 + hy * 1.2)), max(0, c[1] * k), max(0, c[2] * k * (1 - hy * 1.5)))


def build_plane(B, rng):
    """7 twigs from near the centre out, 9-11 alternate leaves each, 34 loose leaves of shoots behind (as
    planeLeafMask, card units: the card is [-1, 1]^2)."""
    green, twigc, petc = lin(0x5d7a32), lin(0x6b5a45), lin(0x7a843f)
    leaves = []
    twigs = []
    for i in range(7):
        a = (i / 7) * math.pi * 2 + rng.random() * 0.7
        L = 2 * (0.28 + rng.random() * 0.14)
        s = Vector((math.cos(a + 2) * 0.08, math.sin(a + 2) * 0.08, -0.05))
        e = Vector((math.cos(a) * L, math.sin(a) * L, 0.02))
        m = (s + e) / 2 + Vector((math.cos(a + 1.57), math.sin(a + 1.57), 0)) * L * 0.12
        pts = [s * (1 - u) ** 2 + m * 2 * u * (1 - u) + e * u * u for u in (k / 12 for k in range(13))]
        twigs.append(pts)
        n = 9 + int(rng.random() * 3)
        for k in range(n):
            u = 0.18 + (k / n) * 0.9
            p = s * (1 - u) ** 2 + m * 2 * u * (1 - u) + e * u * u
            side = 1 if k % 2 else -1
            leaves.append(dict(p=p, ang=a + side * (0.7 + rng.random() * 0.6), len=2 * (0.1 + rng.random() * 0.045),
                               z=0.02 + 0.06 * p.length, back=False))
    for i in range(34):
        r = math.sqrt(rng.random()) * 2 * 0.3
        a = rng.random() * math.pi * 2
        leaves.append(dict(p=Vector((math.cos(a) * r, math.sin(a) * r, 0)), ang=rng.random() * math.pi * 2,
                           len=2 * (0.085 + rng.random() * 0.04), z=-0.12 - rng.random() * 0.05, back=True))
    for pts in twigs:
        B.tube(pts, 0.012, 0.006, twigc, 3.0)
    for L in leaves:
        wob = rng.random() * 6
        outline, attach = plane_outline(wob)
        roll = (rng.random() - 0.5) * 2 * 0.85           # tilted round the midrib (the foreshortened leaves of the mask)
        pitch = (rng.random() - 0.5) * 2 * 0.45
        ln = L["len"]
        # the petiole: the leaf sits ~18 % of its length past its node
        M = leaf_matrix((L["p"].x, L["p"].y), L["ang"], roll, pitch, L["z"])
        M = M @ Matrix.Translation(Vector((ln * 0.18, 0, 0)))
        col = jit(green, rng)
        if L["back"]:
            col = tuple(c * 0.8 for c in col)
        if SCAN:
            k = (0.8 if L["back"] else 1.0) * (0.9 + rng.random() * 0.2)
            B.scan_leaf(leaf_matrix((L["p"].x, L["p"].y), L["ang"], roll, pitch, L["z"]), ln * 1.15, rng.choice(SCAN), (k, k, k),
                        cup=0.05 + rng.random() * 0.06, fold=0.05 + rng.random() * 0.04, arch=0.04)
            continue
        tip = B.leaf(outline, attach, M, ln, col, cup=0.05 + rng.random() * 0.06, fold=0.05 + rng.random() * 0.04, arch=0.04)
        base = L["p"].to_3d() if hasattr(L["p"], "to_3d") else L["p"]
        start = Vector((base.x, base.y, L["z"] - 0.01))
        B.tube([start, start.lerp(tip, 0.5) + Vector((0, 0, 0.01)), tip], 0.0045, 0.003, petc, 2.0, sides=4)


def build_beech(B, rng):
    """10 flat sprays on zigzag twigs (7-9 two-ranked, alternate leaves, smaller toward the tip, a terminal leaf), 34
    fill leaves of the sprays behind (as beechLeafMask)."""
    green, twigc, petc = lin(0x4f7a2c), lin(0x5c4a3a), lin(0x7d8a45)
    leaves, twigs = [], []
    for k in range(10):
        a = (k / 10) * math.pi * 2 + rng.random() * 0.5
        L = 2 * (0.3 + rng.random() * 0.12)
        x, y = math.cos(a) * 0.1, math.sin(a) * 0.1
        nL = 7 + int(rng.random() * 3)
        seg = L / nL
        z0 = 0.0
        path = [Vector((x, y, z0))]
        for i in range(nL):
            zig = (0.22 if i % 2 else -0.22)
            d = a + zig + (rng.random() - 0.5) * 0.1
            x += math.cos(d) * seg
            y += math.sin(d) * seg
            z = z0 + 0.03 * (i + 1) / nL
            path.append(Vector((x, y, z)))
            side = 1 if i % 2 else -1
            size = 1 - 0.45 * (i / nL)
            leaves.append(dict(p=Vector((x, y, z)), ang=a + side * (0.95 + rng.random() * 0.35), len=2 * (0.125 + rng.random() * 0.025) * size, z=z + 0.02, back=False))
        leaves.append(dict(p=Vector((x, y, z)), ang=a + (rng.random() - 0.5) * 0.3, len=2 * 0.075, z=z + 0.025, back=False))
        twigs.append(path)
    for i in range(34):
        r = math.sqrt(rng.random()) * 2 * 0.3
        a = rng.random() * math.pi * 2
        leaves.append(dict(p=Vector((math.cos(a) * r, math.sin(a) * r, 0)), ang=rng.random() * math.pi * 2,
                           len=2 * (0.1 + rng.random() * 0.03), z=-0.12 - rng.random() * 0.05, back=True))
    for path in twigs:
        B.tube(path, 0.01, 0.005, twigc, 3.0)
    for L in leaves:
        outline, attach = beech_outline(rng.random() * 6)
        roll = (rng.random() - 0.5) * 2 * (0.6 if L["back"] else 0.32)   # flat sprays: little roll
        pitch = (rng.random() - 0.5) * 2 * 0.25
        ln = L["len"]
        M = leaf_matrix((L["p"].x, L["p"].y), L["ang"], roll, pitch, L["z"]) @ Matrix.Translation(Vector((ln * 0.06, 0, 0)))
        col = jit(green, rng, v=0.13, h=0.06)
        if L["back"]:
            col = tuple(c * 0.8 for c in col)
        if SCAN:
            k = (0.8 if L["back"] else 1.0) * (0.9 + rng.random() * 0.2)
            B.scan_leaf(leaf_matrix((L["p"].x, L["p"].y), L["ang"], roll, pitch, L["z"]), ln * 1.12, rng.choice(SCAN), (k, k, k),
                        cup=0.03 + rng.random() * 0.03, fold=0.06 + rng.random() * 0.03, arch=0.05)
            continue
        # the beech blade: cupped a little, the margin wavy (in the outline), folded along the midrib
        tip = B.leaf(outline, attach, M, ln, col, cup=0.03 + rng.random() * 0.03, fold=0.06 + rng.random() * 0.03, arch=0.05)
        start = L["p"].copy()
        start.z = L["z"] - 0.005
        B.tube([start, tip], 0.004, 0.003, petc, 2.0, sides=4)


# ------------------------------------------------------------------------------------------- materials
def node(nt, kind, **kw):
    n = nt.nodes.new(kind)
    for k, v in kw.items():
        setattr(n, k, v)
    return n


def math_node(nt, op, a, b=None, clamp=False):
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


def vein_mask(nt, species, uvx, uvy):
    """0..1 vein lines in the leaf frame (x along the midrib, y across)."""
    if species == "plane":
        # 5 main veins radiating from the petiole's end (x 0.35), toward the lobes; plus a few secondaries
        dx = math_node(nt, "SUBTRACT", uvx, 0.35)
        th = math_node(nt, "ARCTAN2", uvy, dx)
        r = math_node(nt, "SQRT", math_node(nt, "ADD", math_node(nt, "MULTIPLY", dx, dx), math_node(nt, "MULTIPLY", uvy, uvy)))
        acc = None
        for a, L in PLANE_LOBES:
            d = math_node(nt, "MULTIPLY", math_node(nt, "ABSOLUTE", math_node(nt, "SUBTRACT", th, a)), r)
            w = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", d, 0.012), clamp=True)
            # the vein thins toward the lobe tip
            w = math_node(nt, "MULTIPLY", w, math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", r, 0.62 * L), clamp=True))
            acc = w if acc is None else math_node(nt, "MAXIMUM", acc, w)
        return acc
    # beech: the midrib and 7 straight parallel pairs, slanting toward the tip
    ay = math_node(nt, "ABSOLUTE", uvy)
    mid = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", ay, 0.011), clamp=True)
    mid = math_node(nt, "MULTIPLY", mid, math_node(nt, "SUBTRACT", 1.0, uvx, clamp=True))
    s = math_node(nt, "SUBTRACT", uvx, math_node(nt, "MULTIPLY", ay, 1.05))
    f = math_node(nt, "FRACT", math_node(nt, "MULTIPLY", s, 8.5))
    dl = math_node(nt, "ABSOLUTE", math_node(nt, "SUBTRACT", f, 0.5))
    lat = math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", math_node(nt, "SUBTRACT", 0.5, dl), 0.07), clamp=True)
    inside = math_node(nt, "MULTIPLY", math_node(nt, "GREATER_THAN", s, 0.08), math_node(nt, "LESS_THAN", s, 0.9))
    lat = math_node(nt, "MULTIPLY", lat, math_node(nt, "MULTIPLY", inside, math_node(nt, "SUBTRACT", 1.0, math_node(nt, "DIVIDE", ay, 0.3), clamp=True)))
    return math_node(nt, "MAXIMUM", mid, math_node(nt, "MULTIPLY", lat, 0.8))


def make_material(species, mode):
    """mode: albedo | normal | thick (all emission: the passes are data, not lighting)."""
    m = bpy.data.materials.new(f"{species}_{mode}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial")
    em = node(nt, "ShaderNodeEmission")
    em.inputs["Strength"].default_value = 1.0
    nt.links.new(em.outputs[0], out.inputs["Surface"])
    a_uv = node(nt, "ShaderNodeAttribute", attribute_name="leafuv", attribute_type="GEOMETRY")
    a_col = node(nt, "ShaderNodeAttribute", attribute_name="leafcol", attribute_type="GEOMETRY")
    a_part = node(nt, "ShaderNodeAttribute", attribute_name="part", attribute_type="GEOMETRY")
    sep = node(nt, "ShaderNodeSeparateXYZ")
    nt.links.new(a_uv.outputs["Vector"], sep.inputs[0])
    uvx, uvy = sep.outputs[0], sep.outputs[1]
    vein = vein_mask(nt, species, uvx, uvy)
    blade = math_node(nt, "LESS_THAN", a_part.outputs["Fac"], 0.5)
    vein = math_node(nt, "MULTIPLY", vein, blade)
    if mode == "albedo":
        # leaf colour x (lighter, yellower veins) x (darker toward the petiole, where the blade cups) x AO
        base = a_col.outputs["Color"]
        vk = 1.45 if species == "plane" else 1.25
        mixv = node(nt, "ShaderNodeMix", data_type="RGBA", blend_type="MULTIPLY")
        # (by index: the Mix node has a float, a vector and a colour A / B; the colour ones are 6 / 7, its output 2)
        mixv.inputs[7].default_value = (vk, vk * 1.08, vk * 0.8, 1)
        nt.links.new(vein, mixv.inputs[0])
        nt.links.new(base, mixv.inputs[6])
        # radial value from the petiole: darker near it
        if species == "plane":
            dx = math_node(nt, "SUBTRACT", uvx, 0.35)
        else:
            dx = uvx
        rr = math_node(nt, "SQRT", math_node(nt, "ADD", math_node(nt, "MULTIPLY", dx, dx), math_node(nt, "MULTIPLY", uvy, uvy)))
        shade = math_node(nt, "ADD", 0.78, math_node(nt, "MULTIPLY", math_node(nt, "MINIMUM", rr, 0.6), 0.45))
        shade = math_node(nt, "ADD", math_node(nt, "MULTIPLY", shade, blade), math_node(nt, "SUBTRACT", 1.0, blade))
        mul = node(nt, "ShaderNodeVectorMath", operation="SCALE")
        nt.links.new(mixv.outputs[2], mul.inputs[0])
        nt.links.new(shade, mul.inputs["Scale"])
        ao = node(nt, "ShaderNodeAmbientOcclusion", samples=16)
        ao.inputs["Distance"].default_value = 0.12
        aok = math_node(nt, "ADD", 0.55, math_node(nt, "MULTIPLY", ao.outputs["AO"], 0.45))
        mul2 = node(nt, "ShaderNodeVectorMath", operation="SCALE")
        nt.links.new(mul.outputs[0], mul2.inputs[0])
        nt.links.new(aok, mul2.inputs["Scale"])
        nt.links.new(mul2.outputs[0], em.inputs["Color"])
    elif mode == "normal":
        geo = node(nt, "ShaderNodeNewGeometry")
        bump = node(nt, "ShaderNodeBump")
        bump.inputs["Strength"].default_value = 0.6
        bump.inputs["Distance"].default_value = 0.004
        nt.links.new(math_node(nt, "MULTIPLY", vein, 1.0), bump.inputs["Height"])
        # (bump normal faces the camera for back faces too: Cycles flips the shading normal of a back face)
        n = bump.outputs["Normal"]
        sc = node(nt, "ShaderNodeVectorMath", operation="MULTIPLY_ADD")
        nt.links.new(n, sc.inputs[0])
        sc.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(sc.outputs[0], em.inputs["Color"])
        _ = geo
    else:
        # thickness: blade 0.25, veins up to 0.55, petiole 0.8, twig 1
        part = a_part.outputs["Fac"]
        t = math_node(nt, "ADD", 0.25, math_node(nt, "MULTIPLY", vein, 0.3))
        t = math_node(nt, "ADD", math_node(nt, "MULTIPLY", t, blade), math_node(nt, "MULTIPLY", math_node(nt, "SUBTRACT", 1.0, blade),
                      math_node(nt, "ADD", 0.8, math_node(nt, "MULTIPLY", math_node(nt, "GREATER_THAN", part, 2.5), 0.2))))
        comb = node(nt, "ShaderNodeCombineXYZ")
        for i in range(3):
            nt.links.new(t, comb.inputs[i])
        nt.links.new(comb.outputs[0], em.inputs["Color"])
    return m


# ------------------------------------------------------------------------------------------- render
def setup_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = SAMPLES
    scn.cycles.use_denoising = False
    scn.cycles.max_bounces = 0
    scn.render.film_transparent = True
    scn.render.resolution_x = scn.render.resolution_y = SIZE
    scn.render.resolution_percentage = 100
    scn.render.image_settings.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"
    w = bpy.data.worlds.new("w")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.0
    scn.world = w
    cam = bpy.data.cameras.new("cam")
    cam.type = "ORTHO"
    cam.ortho_scale = 2.0
    cam.clip_start, cam.clip_end = 0.1, 20
    co = bpy.data.objects.new("cam", cam)
    co.location = (0, 0, 5)
    scn.collection.objects.link(co)
    scn.camera = co
    return scn


def render(scn, path, raw, depth):
    scn.view_settings.view_transform = "Raw" if raw else "Standard"
    scn.view_settings.look = "None"
    scn.render.image_settings.color_depth = depth
    scn.render.filepath = path
    bpy.ops.render.render(write_still=True)
    print("wrote", path)


def scan_cells(path):
    """The leaves of a CC0 leaf atlas: the bounding boxes (uv, v up) of the connected components of its opacity,
    found on a 256 px copy; specks under 0.3 % of the image dropped."""
    import numpy as np
    img = bpy.data.images.load(path)
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32)
    img.pixels.foreach_get(px)
    a = px.reshape(h, w, 4)[:, :, 0]                   # (row 0 = the BOTTOM of the image in Blender)
    s = max(1, w // 256)
    m = a[::s, ::s] > 0.5
    H, W = m.shape
    seen = np.zeros_like(m)
    cells = []
    for y0 in range(H):
        for x0 in range(W):
            if not m[y0, x0] or seen[y0, x0]:
                continue
            stack, n = [(y0, x0)], 0
            seen[y0, x0] = True
            ys, xs = [y0, y0], [x0, x0]
            while stack:
                y, x = stack.pop()
                n += 1
                ys[0], ys[1], xs[0], xs[1] = min(ys[0], y), max(ys[1], y), min(xs[0], x), max(xs[1], x)
                for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    yy, xx = y + dy, x + dx
                    if 0 <= yy < H and 0 <= xx < W and m[yy, xx] and not seen[yy, xx]:
                        seen[yy, xx] = True
                        stack.append((yy, xx))
            if n < 0.003 * H * W:
                continue
            pad = 2
            cells.append(((xs[0] - pad) / W, (ys[0] - pad) / H, (xs[1] + 1 + pad) / W, (ys[1] + 1 + pad) / H))
    bpy.data.images.remove(img)
    return cells


def make_scan_material(mode, root):
    """Option C: the scanned leaf's own albedo (x the per-leaf value in leafcol), opacity, normal (tangent space)."""
    m = bpy.data.materials.new(f"scan_{mode}")
    m.use_nodes = True
    nt = m.node_tree
    nt.nodes.clear()
    out = node(nt, "ShaderNodeOutputMaterial")
    em = node(nt, "ShaderNodeEmission")
    tr = node(nt, "ShaderNodeBsdfTransparent")
    mix = node(nt, "ShaderNodeMixShader")
    uvn = node(nt, "ShaderNodeUVMap", uv_map="UVMap")
    def tex(name, colour):
        t = node(nt, "ShaderNodeTexImage", interpolation="Cubic")
        t.image = bpy.data.images.load(os.path.join(root, name))
        t.image.colorspace_settings.name = "sRGB" if colour else "Non-Color"
        nt.links.new(uvn.outputs["UV"], t.inputs["Vector"])
        return t
    op = tex("opacity.png", False)
    nt.links.new(op.outputs["Color"], mix.inputs[0])
    nt.links.new(tr.outputs[0], mix.inputs[1])
    nt.links.new(em.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs["Surface"])
    if mode == "albedo":
        al = tex("albedo.png", True)
        a_col = node(nt, "ShaderNodeAttribute", attribute_name="leafcol", attribute_type="GEOMETRY")
        mul = node(nt, "ShaderNodeVectorMath", operation="MULTIPLY")
        nt.links.new(al.outputs["Color"], mul.inputs[0])
        nt.links.new(a_col.outputs["Color"], mul.inputs[1])
        ao = node(nt, "ShaderNodeAmbientOcclusion", samples=16)
        ao.inputs["Distance"].default_value = 0.12
        aok = math_node(nt, "ADD", 0.55, math_node(nt, "MULTIPLY", ao.outputs["AO"], 0.45))
        mul2 = node(nt, "ShaderNodeVectorMath", operation="SCALE")
        nt.links.new(mul.outputs[0], mul2.inputs[0])
        nt.links.new(aok, mul2.inputs["Scale"])
        nt.links.new(mul2.outputs[0], em.inputs["Color"])
    elif mode == "normal":
        nm = tex("normal.png", False)
        nmap = node(nt, "ShaderNodeNormalMap", space="TANGENT", uv_map="UVMap")
        nmap.inputs["Strength"].default_value = 1.0
        nt.links.new(nm.outputs["Color"], nmap.inputs["Color"])
        sc = node(nt, "ShaderNodeVectorMath", operation="MULTIPLY_ADD")
        nt.links.new(nmap.outputs["Normal"], sc.inputs[0])
        sc.inputs[1].default_value = (0.5, 0.5, 0.5)
        sc.inputs[2].default_value = (0.5, 0.5, 0.5)
        nt.links.new(sc.outputs[0], em.inputs["Color"])
    else:
        em.inputs["Color"].default_value = (0.3, 0.3, 0.3, 1)   # (the scans carry no thickness: a thin blade)
    return m


SCAN_SETS = {"plane": "LeafSet010", "beech": "LeafSet024"}   # ambientCG CC0: a green maple (palmate), round beech-like leaves
SCAN_ROOT = os.path.abspath(opt("--scan-root", "data/raw/textures/trees/ambientcg"))
SCAN_ASPECT = 1.0
SCAN = None
VARIANTS = ["model"] + (["scan"] if "--scan" in ARGS else []) if "--scan-only" not in ARGS else ["scan"]
for sp in SPECIES:
    for variant in VARIANTS:
        scn = setup_scene()
        rng = random.Random(424242 if sp == "plane" else 778899)
        root = os.path.join(SCAN_ROOT, SCAN_SETS[sp])
        if variant == "scan":
            SCAN = scan_cells(os.path.join(root, "opacity.png"))
            print(f"{sp}: {len(SCAN)} scanned leaves in {SCAN_SETS[sp]}")
        else:
            SCAN = None
        B = Builder()
        (build_plane if sp == "plane" else build_beech)(B, rng)
        ob = B.mesh(f"{sp}_spray")
        print(f"{sp} ({variant}): {len(B.f)} triangles, {len(B.v)} vertices")
        tag = sp if variant == "model" else f"{sp}_scan"
        for mode, raw, depth in (("albedo", False, "8"), ("normal", True, "16"), ("thick", True, "8")):
            ob.data.materials.clear()
            ob.data.materials.append(make_material(sp, mode) if variant == "model" else make_scan_material(mode, root))
            render(scn, os.path.join(OUT, f"{tag}_{mode}.png"), raw, depth)
