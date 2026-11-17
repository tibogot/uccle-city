"""THE CHRISTMAS KIT (Uccle, December): the seasonal decorations of docs/CHRISTMAS.md, built entirely in code (no hand
modelling). Blender 5.0 headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/christmasKit.py -- [--no-bake] [--previews] [--only a,b] [--samples 48]
    node tools/christmas_pack.mjs        (LODs with meshoptimizer + the mesh audit -> models/christmas/christmas.glb)

Pieces (one object each; front = Blender -Y = glTF +Z; origin given per piece):
  tree       the square's Nordmann fir, 10 m to the leader + the star: a trunk, 22 whorls of drooping needle FRONDS
             (each a lumpy flattened sleeve with two side fronds), a dark inner cone (no see-through), ~110 baubles
             (red / gold / champagne) and ~560 warm-white LED bulbs set ON the foliage by ray casts (a spiral string),
             a faceted gold star on a rod, the octagonal timber planter (corner posts, 6 boards a side, rim, mulch).
             Origin: the trunk's foot on the ground.
  wreath     a door wreath (55 cm): lumpy fir ring + 28 sprigs, red ribbon bow with tails, berry clusters, 10 battery
             LEDs, the hook. Origin: the wall / door plane at the ring's centre.
  swag       a 1.6 m shopfront garland module: a sagging fir rope with sprigs, 12 LEDs, two small baubles, a bow at its
             left end, two screw-eye hooks. Origin: the wall plane at the module's centre, hook height.
  lampmotif  the lamp-post motif: an LED-rope snowflake (6 arms with V branches) on an aluminium frame, clamped to the
             post. Origin: the post's axis at clamp height; the flake stands toward the road (glTF -Z), in the plane
             that faces along the street (glTF YZ).
  spanmotif  the cross-street centre motif: an LED-rope double star on its frame, hung from a hook. Origin: the hook on
             the span wire; the star faces along the street (glTF XY plane), the span runs along glTF X.

GLB contract (raw, before tools/christmas_pack.mjs): nodes = pieces; one primitive per NAMED slot (no texture);
COLOR_0 = (r: a random per element: bulb phase / frond tint, g: variant: bauble colour 0 red, 0.5 gold, 1 champagne;
needle shade, b: Cycles-baked ambient occlusion (each piece alone on a ground plane), a: 1);
TEXCOORD_0 = metres (fronds: u along the frond, v round it; planks: along the grain).
Hand-made far stand-ins "<piece>__lod1" / "<piece>__lod2" carry the small EMISSIVE parts (bulbs, LED rope) and the
baubles as fewer-sided shapes at the same places (meshoptimizer would prune them away); the packer uses them for those
slots instead of simplifying.
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, default): return ARGS[ARGS.index(name) + 1] if name in ARGS else default
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "models", "christmas")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
ONLY = [s for s in opt("--only", "").split(",") if s]
SAMPLES = int(opt("--samples", 48))
T0 = time.time()
sys.stdout.reconfigure(line_buffering=True)
def tick(s): print(f"[christmas] {s} {time.time() - T0:.0f}s")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.unit_settings.system = "METRIC"
scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)   # half the CPU (shared laptop)
Z = Vector((0, 0, 1))

# ------------------------------------------------------------------------------------------------ named slots
# preview colour / roughness / metal / emission: Blender previews only (the viewer maps slots by NAME)
SLOTS = {
    "fir_needles": ((0.035, 0.085, 0.045), 0.8, 0.0, 0),     # Nordmann fir: dark glossy green, silver undersides
    "fir_bark": ((0.16, 0.11, 0.08), 0.9, 0.0, 0),
    "bauble": ((0.5, 0.05, 0.04), 0.18, 0.6, 0),             # colour per COLOR_0.g (red / gold / champagne)
    "gold_metal": ((0.8, 0.6, 0.25), 0.3, 1.0, 0),            # caps, hooks, the star's rod
    "star_glow": ((1.0, 0.75, 0.35), 0.25, 1.0, 6),           # the star: gold that glows at night
    "bulb_warm": ((1.0, 0.8, 0.5), 0.2, 0.0, 12),             # warm-white LEDs (2700 K)
    "led_rope": ((1.0, 0.82, 0.55), 0.3, 0.0, 8),             # LED rope light of the motifs
    "metal_frame": ((0.7, 0.72, 0.74), 0.35, 1.0, 0),         # aluminium motif frames / clamps
    "wood_planks": ((0.42, 0.3, 0.18), 0.75, 0.0, 0),         # the planter's pine boards
    "mulch": ((0.12, 0.08, 0.05), 1.0, 0.0, 0),
    "ribbon_red": ((0.45, 0.02, 0.03), 0.45, 0.0, 0),         # velvet ribbon
}
MATS = {}
for n, (c, r, m, e) in SLOTS.items():
    mt = bpy.data.materials.new(n); mt.use_nodes = True
    b = mt.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*c, 1); b.inputs["Roughness"].default_value = r; b.inputs["Metallic"].default_value = m
    mt["preview"] = list(c); mt["emit"] = e
    MATS[n] = mt


# ------------------------------------------------------------------------------------------------ the mesh builder
class Mesh:
    """vertices / faces with per-face slot, colour, smooth flag and per-corner UVs (None: projected in metres along a
    grain axis, kitlib's rule)"""
    def __init__(self, name):
        self.name = name; self.V = []; self.F = []; self.FS = []; self.FC = []; self.FU = []; self.FG = []; self.FSM = []
        self.slots = []

    def slot(self, s):
        if s not in self.slots: self.slots.append(s)
        return self.slots.index(s)

    def add(self, verts, faces, slot, col=(0.5, 0.5, 1.0), uvs=None, grain=None, smooth=True):
        """verts: list of Vector; faces: index lists into verts; uvs: per-vertex (u, v) or None"""
        o = len(self.V); si = self.slot(slot)
        self.V.extend(Vector(v) for v in verts)
        for f in faces:
            self.F.append([o + i for i in f]); self.FS.append(si); self.FC.append(col); self.FSM.append(smooth)
            self.FU.append([uvs[i] for i in f] if uvs is not None else None)
            self.FG.append(Vector(grain).normalized() if grain is not None else None)

    def extend(self, other):
        for s in other.slots: self.slot(s)
        o = len(self.V)
        self.V.extend(other.V)
        for f, s, c, u, g, sm in zip(other.F, other.FS, other.FC, other.FU, other.FG, other.FSM):
            self.F.append([o + i for i in f]); self.FS.append(self.slot(other.slots[s])); self.FC.append(c); self.FU.append(u); self.FG.append(g); self.FSM.append(sm)

    def tris(self): return sum(len(f) - 2 for f in self.F)

    def to_object(self, crease=60.0):
        me = bpy.data.meshes.new(self.name)
        me.from_pydata([tuple(v) for v in self.V], [], self.F)
        me.update()
        for s in self.slots: me.materials.append(MATS[s])
        n = len(me.polygons)
        assert n == len(self.F), f"{self.name}: {n} polygons after validate, {len(self.F)} built"
        me.polygons.foreach_set("material_index", self.FS)
        me.polygons.foreach_set("use_smooth", self.FSM)
        uv = me.uv_layers.new(name="UVMap")
        col = me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
        ud = [0.0] * (2 * len(me.loops)); cd = [1.0] * (4 * len(me.loops))
        for p in me.polygons:
            fu, g, c = self.FU[p.index], self.FG[p.index], self.FC[p.index]
            if fu is None:
                nrm = p.normal
                if g is not None and abs(nrm.dot(g)) < 0.7: t = (g - nrm * nrm.dot(g)).normalized(); b = nrm.cross(t).normalized()
                elif abs(nrm.z) < 0.75: t = Z.cross(nrm).normalized(); b = Z
                else: t = Vector((1, 0, 0)); b = nrm.cross(t).normalized()
            for k, li in enumerate(p.loop_indices):
                if fu is not None: ud[2 * li], ud[2 * li + 1] = fu[k]
                else:
                    co = me.vertices[me.loops[li].vertex_index].co; ud[2 * li] = co.dot(t); ud[2 * li + 1] = co.dot(b)
                cd[4 * li], cd[4 * li + 1], cd[4 * li + 2] = c
        # (a new layer re-allocates the others: fetch both by name now)
        me.uv_layers["UVMap"].data.foreach_set("uv", ud)
        me.color_attributes["Col"].data.foreach_set("color", cd)
        o = bpy.data.objects.new(self.name, me); scn.collection.objects.link(o)
        fix_normals(o, crease)
        return o


def fix_normals(o, crease=60.0, planar_area=0.2):
    """(tools/blender/publicart.py) the shading normals every LOD0 ships with: a face inside a PLANAR region (flood-filled
    over edges within 1 deg, larger than 0.2 m2) or marked flat is shaded flat; any other corner averages the area-weighted
    normals of the faces round its vertex within `crease` of its own face (the mesh checker's bentflat / streak rules)"""
    me = o.data
    b = bmesh.new(); b.from_mesh(me)
    bmesh.ops.triangulate(b, faces=[f for f in b.faces if len(f.verts) > 3], quad_method="BEAUTY", ngon_method="BEAUTY")
    b.normal_update(); b.faces.index_update()
    # (Blender 5.0: polygon.normal read right after bmesh.to_mesh crashed: the face data comes from the bmesh)
    FN = [f.normal.copy() for f in b.faces]; A = [f.calc_area() for f in b.faces]; SM = [f.smooth for f in b.faces]
    b.to_mesh(me); b.free(); me.update()
    P = me.polygons
    par = list(range(len(P)))
    def fnd(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    em = {}
    for p in P:
        for ek in p.edge_keys: em.setdefault(ek, []).append(p.index)
    c1 = math.cos(math.radians(1.0))
    for fs in em.values():
        for i in range(1, len(fs)):
            a, bb = fs[0], fs[i]
            if FN[a].dot(FN[bb]) > c1:
                ra, rb = fnd(a), fnd(bb)
                if ra != rb: par[ra] = rb
    area = {}
    for i in range(len(P)): r = fnd(i); area[r] = area.get(r, 0.0) + A[i]
    flat = [area[fnd(i)] > planar_area or not SM[i] for i in range(len(P))]
    vf = [[] for _ in me.vertices]
    for p in P:
        for v in p.vertices: vf[v].append(p.index)
    cc = math.cos(math.radians(crease))
    out = [None] * len(me.loops)
    for p in P:
        f = p.index
        for li in p.loop_indices:
            if flat[f]: out[li] = FN[f]; continue
            v = me.loops[li].vertex_index
            n = Vector((0, 0, 0))
            for g in vf[v]:
                if SM[g] and FN[g].dot(FN[f]) >= cc: n += FN[g] * A[g]
            out[li] = n.normalized() if n.length > 1e-12 else FN[f]
    cs = math.cos(math.radians(25))
    for p in P:
        li = list(p.loop_indices)
        vs = [me.vertices[me.loops[l].vertex_index].co for l in li]
        el = [(vs[1] - vs[0]).length, (vs[2] - vs[1]).length, (vs[0] - vs[2]).length]; L = max(el)
        h = 2 * A[p.index] / L if L > 0 else 0
        spread = min(out[li[0]].dot(out[li[1]]), out[li[1]].dot(out[li[2]]), out[li[0]].dot(out[li[2]]))
        if (L > 0.12 and h > 0 and L / h > 5 and spread < cs) or min(out[l].dot(FN[p.index]) for l in li) < 0.2:
            for l in li: out[l] = FN[p.index]
    me.normals_split_custom_set([tuple(n) for n in out])


# ------------------------------------------------------------------------------------------------ primitives
def frame_along(pts):
    """parallel-transported normals along a polyline: [(tangent, normal, binormal)]"""
    n = len(pts); tans = []
    for i in range(n):
        a = pts[max(0, i - 1)]; b = pts[min(n - 1, i + 1)]
        tans.append((b - a).normalized())
    ref = Z if abs(tans[0].dot(Z)) < 0.9 else Vector((1, 0, 0))
    nrm = tans[0].cross(ref).normalized()
    out = []
    for i in range(n):
        if i > 0:
            ax = tans[i - 1].cross(tans[i])
            if ax.length > 1e-8:
                ang = math.acos(max(-1, min(1, tans[i - 1].dot(tans[i]))))
                nrm = (Matrix.Rotation(ang, 3, ax.normalized()) @ nrm).normalized()
        out.append((tans[i], nrm, tans[i].cross(nrm).normalized()))
    return out


def tube(M, pts, r, slot, segs=8, col=(0.5, 0.5, 1.0), closed=False, cap=True, smooth=True):
    """a round tube along a polyline (r: a number or one per point); caps: flat ngons (shaded flat)"""
    pts = [Vector(p) for p in pts]
    if closed: m = (pts[0] + pts[1]) / 2; pts = [m] + pts[1:] + [pts[0], m]     # (the seam mid-edge, never at a corner)
    fr = frame_along(pts)
    if closed:                                                  # (the seam ring: the first frame)
        fr[-1] = fr[0]
    rr = r if isinstance(r, (list, tuple)) else [r] * len(pts)
    V, F, U = [], [], []
    s = 0.0
    for i, (p, (t, n, b)) in enumerate(zip(pts, fr)):
        if i > 0: s += (pts[i] - pts[i - 1]).length
        for k in range(segs + 1):
            a = 2 * math.pi * k / segs
            V.append(p + (n * math.cos(a) + b * math.sin(a)) * rr[i]); U.append((s, a * rr[i]))
    W = segs + 1
    for i in range(len(pts) - 1):
        for k in range(segs):
            F.append([i * W + k, i * W + k + 1, (i + 1) * W + k + 1, (i + 1) * W + k])
    M.add(V, F, slot, col, U, smooth=smooth)
    if cap and not closed:
        for i, sgn in ((0, -1), (len(pts) - 1, 1)):
            t, n, b = fr[i]
            cv = [pts[i] + (n * math.cos(2 * math.pi * k / segs) + b * math.sin(2 * math.pi * k / segs)) * rr[i] for k in range(segs)]
            f = list(range(segs)) if sgn > 0 else list(reversed(range(segs)))
            M.add(cv, [f], slot, col, smooth=False)


def sphere(M, c, r, slot, segs=10, rings=7, col=(0.5, 0.5, 1.0), squash=1.0):
    """a UV sphere (closed by small fans at the poles), faces outward"""
    c = Vector(c); V, F, U = [], [], []
    for j in range(1, rings):
        ph = math.pi * j / rings
        for k in range(segs):
            a = 2 * math.pi * k / segs
            V.append(c + Vector((math.sin(ph) * math.cos(a) * r, math.sin(ph) * math.sin(a) * r, math.cos(ph) * r * squash)))
            U.append((a * r, ph * r))
    for j in range(rings - 2):
        for k in range(segs):
            a, b = j * segs + k, j * segs + (k + 1) % segs
            F.append([a, b, b + segs, a + segs])
    top = len(V); V.append(c + Vector((0, 0, r * squash))); U.append((0, 0))
    bot = len(V); V.append(c - Vector((0, 0, r * squash))); U.append((0, math.pi * r))
    o = (rings - 2) * segs
    for k in range(segs):
        F.append([top, k, (k + 1) % segs]); F.append([bot, o + k, o + (k + 1) % segs])
    M.add(V, outward(V, F, c), slot, col, U)


def outward(V, F, c):
    """faces wound so their normal points away from c"""
    out = []
    for f in F:
        a, b, d = (V[i] for i in f[:3])
        cen = sum((V[i] for i in f), Vector()) / len(f)
        out.append(f if (b - a).cross(d - a).dot(cen - c) > 0 else f[::-1])
    return out


def poly_shape(M, c, r, slot, kind, col, axis=Z):
    """small far stand-ins: 'oct' (8 tris), 'tet' (4 tris), 'ico' (20 tris), centred on c, radius r"""
    c = Vector(c)
    if kind == "oct":
        V = [c + Vector(v) * r for v in ((1, 0, 0), (-1, 0, 0), (0, 1, 0), (0, -1, 0), (0, 0, 1), (0, 0, -1))]
        F = [[0, 2, 4], [2, 1, 4], [1, 3, 4], [3, 0, 4], [2, 0, 5], [1, 2, 5], [3, 1, 5], [0, 3, 5]]
    elif kind == "tet":
        s = 1 / math.sqrt(3)
        V = [c + Vector(v) * r for v in ((s, s, s), (s, -s, -s), (-s, s, -s), (-s, -s, s))]
        F = [[0, 1, 2], [0, 3, 1], [0, 2, 3], [1, 3, 2]]
    else:
        t = (1 + 5 ** 0.5) / 2
        raw = [(-1, t, 0), (1, t, 0), (-1, -t, 0), (1, -t, 0), (0, -1, t), (0, 1, t), (0, -1, -t), (0, 1, -t), (t, 0, -1), (t, 0, 1), (-t, 0, -1), (-t, 0, 1)]
        V = [c + Vector(v).normalized() * r for v in raw]
        F = [[0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
             [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1]]
    # outward winding
    F2 = []
    for f in F:
        a, b, d = (V[i] for i in f)
        F2.append(f if (b - a).cross(d - a).dot((a + b + d) / 3 - c) > 0 else f[::-1])
    M.add(V, F2, slot, col, smooth=kind == "ico")


def bead(M, c, r, slot, col, axis=Z, segs=6):
    """an LED bulb: a small lathed bead (24 tris at 6 sides), long axis `axis`"""
    c = Vector(c); axis = Vector(axis).normalized()
    ref = Vector((1, 0, 0)) if abs(axis.x) < 0.9 else Vector((0, 1, 0))
    u = axis.cross(ref).normalized(); w = axis.cross(u)
    prof = [(-1.15, 0.0), (-0.55, 0.85), (0.35, 0.95), (1.1, 0.0)]
    V = []
    for zz, rr in prof[1:-1]:
        for k in range(segs):
            a = 2 * math.pi * k / segs
            V.append(c + axis * zz * r + (u * math.cos(a) + w * math.sin(a)) * rr * r)
    b0 = len(V); V.append(c + axis * prof[0][0] * r); t0 = len(V); V.append(c + axis * prof[-1][0] * r)
    F = []
    for k in range(segs):
        k1 = (k + 1) % segs
        F.append([k, k1, segs + k1, segs + k])
        F.append([b0, k1, k]); F.append([t0, segs + k, segs + k1])
    F2 = []
    for f in F:
        a, b, d = (V[i] for i in f[:3])
        F2.append(f if (b - a).cross(d - a).dot((a + b + d) / 3 - c) > 0 else f[::-1])
    M.add(V, F2, slot, col)


def box(M, c, size, slot, col=(0.5, 0.5, 1.0), rot=None, grain=(0, 0, 1), bevel=0.0):
    """an axis box (bevelled with one 45-degree chamfer when bevel > 0), rotated by rot (Matrix 3x3)"""
    bm = bmesh.new(); bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=size, verts=bm.verts)
    if bevel > 0: bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bevel, segments=1, profile=0.5, affect="EDGES", clamp_overlap=True)
    R = rot if rot is not None else Matrix.Identity(3)
    V = [Vector(c) + R @ v.co for v in bm.verts]
    F = [[v.index for v in f.verts] for f in bm.faces]
    bm.free()
    M.add(V, F, slot, col, grain=R @ Vector(grain), smooth=False)


def prism(M, ring_lo, ring_hi, slot, col, top=True, bottom=False, grain=(0, 0, 1)):
    """side walls between two rings (+ caps)"""
    n = len(ring_lo); V = list(ring_lo) + list(ring_hi)
    F = [[i, (i + 1) % n, n + (i + 1) % n, n + i] for i in range(n)]
    if top: F.append([n + i for i in range(n)])
    if bottom: F.append(list(reversed(range(n))))
    M.add(V, F, slot, col, grain=grain, smooth=False)


# ------------------------------------------------------------------------------------------------ the fir frond
def frond(M, p0, d, L, W, droop, tip_up, col, seed, nl=8, na=8, side=4, snl=5, sna=6):
    """a needle frond: a lumpy, flattened sleeve along a drooping curve (u along it, v round it, metres), tip closed by a
    small fan, two side fronds; d = horizontal-ish direction (unit)"""
    rnd = random.Random(seed)
    d = Vector(d).normalized()
    pts = []
    for i in range(nl + 1):
        t = i / nl
        pts.append(Vector(p0) + d * (L * t) + Z * (L * (-droop * t * t + tip_up * t ** 3)))
    fr = frame_along(pts)
    V, F, U = [], [], []
    s = 0.0
    for i in range(nl + 1):
        t = i / nl
        if i > 0: s += (pts[i] - pts[i - 1]).length
        tan = fr[i][0]
        wv = tan.cross(Z); wv = wv.normalized() if wv.length > 1e-6 else Vector((1, 0, 0))
        nv = wv.cross(tan).normalized()
        # a spray: full width over most of its length, a rounded end (not a spike)
        w = W * (0.3 + 0.7 * math.sin(math.pi * min(1.0, 0.1 + t * 0.78)) ** 0.5) * (1 - 0.2 * t)
        if i == nl: w *= 0.55
        th = 0.36 * w + 0.02
        for k in range(na):
            a = 2 * math.pi * k / na
            j = 1 + 0.22 * noise.noise(Vector((seed * 0.37 + t * 3.1, k * 0.9, 0.5))) + 0.1 * math.sin(i * 2.4 + k * 1.7 + seed)
            off = wv * math.cos(a) * w * 0.5 * j + nv * (math.sin(a) * th * 0.5 * j + 0.25 * th * math.cos(a) ** 2)
            V.append(pts[i] + off); U.append((s, a / (2 * math.pi) * (w * 1.6 + 0.05)))
    for i in range(nl):
        for k in range(na):
            k1 = (k + 1) % na
            F.append([i * na + k, (i + 1) * na + k, (i + 1) * na + k1, i * na + k1])
    tip = len(V); V.append(pts[-1] + fr[-1][0] * W * 0.22); U.append((s + W * 0.22, 0))
    for k in range(na): F.append([nl * na + (k + 1) % na, nl * na + k, tip])
    base = len(V); V.append(pts[0] - fr[0][0] * 0.02); U.append((-0.02, 0))
    for k in range(na): F.append([base, k, (k + 1) % na])
    M.add(V, F, "fir_needles", col, U)
    if side:
        # four side sprays, alternating, layered a little above / below the main one
        for q, (ts, sg) in enumerate(((0.22, 1), (0.4, -1), (0.58, 1), (0.76, -1)) if side >= 4 else ((0.3, 1), (0.62, -1))):
            ts += rnd.uniform(-0.04, 0.04)
            i = min(nl - 1, int(round(ts * nl)))
            p = pts[i]; tan = fr[i][0]
            dd = (Matrix.Rotation(sg * math.radians(rnd.uniform(34, 50)), 3, Z) @ tan); dd.z = dd.z * 0.4 + rnd.uniform(-0.12, 0.12)
            frond(M, p, dd, L * (0.5 - 0.3 * ts), W * (0.72 if side >= 4 else 0.8), droop * 0.6, tip_up, col, seed * 7 + q, nl=snl, na=sna, side=0)
    return pts


# ------------------------------------------------------------------------------------------------ pieces
STATS = {}


def build_tree():
    """the square's fir: returns (lod0 Mesh, far meshes {1: Mesh, 2: Mesh}, info)"""
    rnd = random.Random(1225)
    M = Mesh("tree")
    H_TOP, Z0, NT = 9.45, 1.2, 30
    def L_at(z): return 0.3 + 2.55 * max(0.0, (H_TOP - z) / (H_TOP - Z0)) ** 0.95
    # trunk (to the leader) and the inner cone (dark needles: no see-through to the sky)
    ring = lambda r, z, n=12: [Vector((r * math.cos(2 * math.pi * k / n), r * math.sin(2 * math.pi * k / n), z)) for k in range(n)]
    tube(M, [(0, 0, 0.3), (0, 0, 3.0), (0, 0, 6.0), (0, 0, 9.0)], [0.17, 0.13, 0.08, 0.03], "fir_bark", segs=12, col=(0.5, 0.5, 1.0))   # (ends under the leader)
    far1, far2 = Mesh("tree__lod1"), Mesh("tree__lod2")
    def inner_cone(Mx, nseg):
        cone_z = [Z0 + 0.15 + (9.2 - Z0) * j / 18 for j in range(19)]
        cone = [ring(L_at(z) * 0.5 + 0.08, z, nseg) for z in cone_z]
        V, F = [], []
        for r_ in cone: V.extend(r_)
        for j in range(len(cone) - 1):
            for k in range(nseg): F.append([j * nseg + k, j * nseg + (k + 1) % nseg, (j + 1) * nseg + (k + 1) % nseg, (j + 1) * nseg + k])
        F.append(list(reversed(range(nseg))))                            # (the underside, inside the lowest whorl)
        top = len(V); V.append(Vector((0, 0, 9.5)))
        for k in range(nseg): F.append([(len(cone) - 1) * nseg + k, (len(cone) - 1) * nseg + (k + 1) % nseg, top])
        Mx.add(V, F, "fir_needles", (0.5, 0.15, 1.0))
    # the whorls: one branch list, three detail levels (LOD0 here; the far stand-ins with fewer sides / sprays)
    branches = []
    ang0 = 0.0
    for j in range(NT):
        z = Z0 + (H_TOP - 0.35 - Z0) * (j / (NT - 1)) ** 1.05
        L = L_at(z)
        n = max(6, round(12 - 6 * j / (NT - 1)))
        ang0 += math.radians(137.5)
        for b in range(n):
            a = ang0 + 2 * math.pi * b / n + rnd.uniform(-0.18, 0.18)
            d = Vector((math.cos(a), math.sin(a), math.tan(math.radians(-14 + 26 * j / NT))))
            p0 = Vector((0, 0, z + rnd.uniform(-0.06, 0.06))) + Vector((math.cos(a), math.sin(a), 0)) * 0.1
            LL = L * rnd.uniform(0.9, 1.06)
            branches.append((p0, d, LL, 0.5 + 0.35 * LL / 2.85, rnd.uniform(0.14, 0.22), rnd.uniform(0.06, 0.12), (rnd.random(), 0.75 + 0.25 * rnd.random(), 1.0), j * 31 + b))
    nfr = len(branches)
    for Mx, det, cs in ((M, dict(nl=8, na=8, side=4, snl=5, sna=6), 24), (far1, dict(nl=4, na=5, side=2, snl=3, sna=4), 16), (far2, dict(nl=3, na=4, side=0), 10)):
        inner_cone(Mx, cs)
        for (p0, d, LL, W, dr, tu, col, sd) in branches:
            frond(Mx, p0, d, LL, W, dr, tu, col, seed=sd, **det)
        frond(Mx, Vector((0, 0, H_TOP - 0.35)), Vector((0.0, 0.05, 1.0)), 0.55, 0.16, 0.0, 0.0, (0.3, 0.9, 1.0), seed=999, nl=6 if Mx is M else 3, na=8 if Mx is M else 4, side=0)
    foliage_tris = M.tris()
    # ---------------------------------------------------------------- ornaments by ray casts onto the foliage
    bvh = BVHTree.FromPolygons([tuple(v) for v in M.V], M.F, all_triangles=False)
    def clear(c, need, nrm):
        """push an ornament out along nrm until the foliage is `need` m from its centre (None: no room)"""
        for _ in range(8):
            loc_, _n, _i, dist = bvh.find_nearest(c)
            if loc_ is None or dist >= need: return c
            c = c + nrm * 0.012
        return None
    def hit(theta, z):
        R = L_at(z) + 1.5
        o = Vector((R * math.cos(theta), R * math.sin(theta), z + 0.35))
        tgt = Vector((0, 0, z - 0.25))
        loc, nrm, idx, dist = bvh.ray_cast(o, (tgt - o).normalized(), R + 1)
        if loc is None: return None
        if nrm.dot(o - loc) < 0: nrm = -nrm
        return loc, nrm
    # baubles: stratified over the cone surface, kept apart; caps on top
    bb = []
    PAL = [0.0, 0.5, 1.0]
    for j in range(1200):
        if len(bb) >= 130: break
        z = 1.2 + 7.6 * ((j * 0.618034) % 1.0) ** 1.15
        th = rnd.uniform(0, 2 * math.pi)
        h = hit(th, z)
        if not h: continue
        loc, nrm = h
        r = 0.085 + 0.05 * rnd.random() * (1 - z / 10) + 0.02
        c = clear(loc + nrm * (r + 0.012) - Z * 0.02, r * 1.12 + 0.01, nrm)
        if c is None or any((c - q).length < r + qr + 0.25 for q, qr in bb): continue
        bb.append((c, r))
        g = PAL[len(bb) % 3] if rnd.random() > 0.2 else PAL[0]
        col = (rnd.random(), g, 1.0)
        sphere(M, c, r, "bauble", segs=12, rings=8, col=col)
        tube(M, [c + Z * (r * 0.9), c + Z * (r * 1.08)], r * 0.22, "gold_metal", segs=8, col=col)
        poly_shape(far1, c, r, "bauble", "ico", col); poly_shape(far2, c, r * 1.05, "bauble", "oct", col)
    # LEDs: a spiral string (11 turns, a bulb every ~21 cm along it), each put onto the foliage
    bulbs = []
    TURNS, ZA, ZB = 17, 0.7, 9.1
    t = 0.0
    while t < 1.0:
        z = ZA + (ZB - ZA) * t
        th = 2 * math.pi * TURNS * t + rnd.uniform(-0.05, 0.05)
        r_here = L_at(z) * 0.85
        h = hit(th, z + rnd.uniform(-0.08, 0.08))
        t += 0.21 / (2 * math.pi * TURNS * max(r_here, 0.35) + 1e-6)
        if not h: continue
        loc, nrm = h
        c = clear(loc + nrm * 0.035, 0.034, nrm)
        if c is None or any((c - q).length < qr + 0.06 for q, qr in bb) or any((c - q).length < 0.09 for q in bulbs): continue
        flash = 1.0 if rnd.random() < 0.14 else 0.0
        col = (rnd.random(), flash, 1.0)
        bulbs.append(c)
        bead(M, c, 0.022, "bulb_warm", col, axis=nrm)
        poly_shape(far1, c, 0.026, "bulb_warm", "oct", col); poly_shape(far2, c, 0.04, "bulb_warm", "tet", col)
    # ---------------------------------------------------------------- the star on its rod
    sc = Vector((0, 0, 9.98)); RO, RI, DEP = 0.42, 0.18, 0.11
    out = [sc + Vector((math.sin(2 * math.pi * k / 10) * (RO if k % 2 == 0 else RI), 0, math.cos(2 * math.pi * k / 10) * (RO if k % 2 == 0 else RI))) for k in range(10)]
    fr_, bk = sc + Vector((0, -DEP, 0)), sc + Vector((0, DEP, 0))
    V = out + [fr_, bk]; F = []
    for k in range(10):
        F.append([10, (k + 1) % 10, k]); F.append([11, k, (k + 1) % 10])
    F2 = []
    for f in F:
        a, b, d = (V[i] for i in f)
        F2.append(f if (b - a).cross(d - a).dot((a + b + d) / 3 - sc) > 0 else f[::-1])
    M.add(V, F2, "star_glow", (0.5, 0.0, 1.0), smooth=False)
    far1.add(V, F2, "star_glow", (0.5, 0.0, 1.0), smooth=False); far2.add(V, F2, "star_glow", (0.5, 0.0, 1.0), smooth=False)
    tube(M, [(0, 0, 9.4), (0, 0, sc.z - RO * 0.6)], 0.018, "gold_metal", segs=8)
    # ---------------------------------------------------------------- the octagonal planter
    A, HP = 1.25, 0.55
    RC = A / math.cos(math.pi / 8)
    corners = [Vector((RC * math.cos(math.pi / 8 + k * math.pi / 4), RC * math.sin(math.pi / 8 + k * math.pi / 4), 0)) for k in range(8)]
    back_lo = [c_ * (A - 0.002) / A for c_ in corners]
    prism(M, [Vector((c_.x, c_.y, 0.0)) for c_ in back_lo], [Vector((c_.x, c_.y, HP - 0.07)) for c_ in back_lo], "wood_planks", (0.5, 0.45, 1.0), top=False)
    M.add([Vector((c_.x * 0.999, c_.y * 0.999, HP - 0.07)) for c_ in back_lo], [list(range(8))], "mulch", (0.5, 0.5, 1.0), smooth=False)
    for k in range(8):
        a0, a1 = corners[k], corners[(k + 1) % 8]
        mid = (a0 + a1) / 2; out_n = Vector((mid.x, mid.y, 0)).normalized(); along = (a1 - a0).normalized()
        R = Matrix((along, -out_n, Z)).transposed()
        side = (a1 - a0).length
        nb = 6; usable = side - 0.12; bw = (usable - (nb - 1) * 0.012) / nb
        for i in range(nb):
            u = -usable / 2 + bw / 2 + i * (bw + 0.012)
            box(M, mid + along * u + out_n * (0.002 + 0.014) + Z * (HP / 2), (bw, 0.028, HP - 0.01), "wood_planks", (rnd.random(), 0.6 + 0.4 * rnd.random(), 1.0), rot=R, grain=(0, 0, 1), bevel=0.004)
        # corner post
        cp = a0 + Vector((a0.x, a0.y, 0)).normalized() * 0.03
        box(M, cp + Z * (HP / 2 + 0.025), (0.1, 0.1, HP + 0.05), "wood_planks", (0.5, 0.5, 1.0), rot=Matrix.Rotation(math.pi / 8 + k * math.pi / 4, 3, Z), bevel=0.006)
        # rim board (a trapezoid slab on top)
        ri, ro = (A - 0.12) / A, (A + 0.07) / A
        lo = [Vector((a0.x * ri, a0.y * ri, HP)), Vector((a1.x * ri, a1.y * ri, HP)), Vector((a1.x * ro, a1.y * ro, HP)), Vector((a0.x * ro, a0.y * ro, HP))]
        hi = [v + Z * 0.035 for v in lo]
        prism(M, lo, hi, "wood_planks", (0.5, 0.7, 1.0), top=True, bottom=True, grain=along)
    info = {"foliage_tris": foliage_tris, "fronds": nfr, "baubles": len(bb), "bulbs": len(bulbs), "height_m": round(sc.z + RO, 2), "width_m": round(2 * (L_at(Z0) + 0.1), 2)}
    return M, {1: far1, 2: far2}, info


def build_wreath():
    rnd = random.Random(24)
    M = Mesh("wreath"); f1 = Mesh("wreath__lod1"); f2 = Mesh("wreath__lod2")
    C = Vector((0, -0.075, 0)); R0, r0 = 0.2, 0.055
    # the lumpy core ring (fir), in the XZ plane facing -Y
    n, m = 28, 8; V, F, U = [], [], []
    for i in range(n):
        a = 2 * math.pi * i / n; ca = Vector((math.cos(a), 0, math.sin(a)))
        for k in range(m):
            b = 2 * math.pi * k / m
            j = 1 + 0.22 * noise.noise(Vector((i * 0.7, k * 0.9, 3.3)))
            V.append(C + ca * (R0 + math.cos(b) * r0 * j) + Vector((0, -math.sin(b) * r0 * 0.85 * j, 0))); U.append((a * R0, b * r0))
    for i in range(n):
        for k in range(m):
            F.append([i * m + k, ((i + 1) % n) * m + k, ((i + 1) % n) * m + (k + 1) % m, i * m + (k + 1) % m])
    M.add(V, F, "fir_needles", (0.4, 0.8, 1.0), U)
    # sprigs round it (tangential, alternating out / in, all toward the front)
    for i in range(44):
        a = 2 * math.pi * (i + 0.5) / 44 + rnd.uniform(-0.05, 0.05)
        ca = Vector((math.cos(a), 0, math.sin(a))); tg = Vector((-math.sin(a), 0, math.cos(a)))
        rr = R0 + (0.035 if i % 2 else -0.025)
        p = C + ca * rr + Vector((0, -0.03, 0))
        d = (tg * 0.8 + ca * (0.35 if i % 2 else -0.25) + Vector((0, -0.25, 0))).normalized()
        frond(M, p, d, 0.15, 0.065, 0.0, 0.0, (rnd.random(), 0.85, 1.0), seed=500 + i, nl=5, na=6, side=0)
    bvh = BVHTree.FromPolygons([tuple(v) for v in M.V], M.F, all_triangles=False)
    def clear(c, need, nrm=Vector((0, -1, 0))):
        for _ in range(10):
            loc_, _n, _i, dist = bvh.find_nearest(c)
            if loc_ is None or dist >= need: return c
            c = c + nrm * 0.004
        return c
    # the bow at the bottom: two loops, the knot, two tails
    kb = C + Vector((0, -0.07, -R0 - 0.01))
    for sg in (-1, 1):
        pts = [kb + Vector((sg * (0.07 - 0.07 * math.cos(t)), -0.01 * math.sin(t), 0.045 * math.sin(t))) for t in [math.pi * 2 * q / 14 for q in range(15)]]
        tube(M, pts, 0.012, "ribbon_red", segs=8, col=(0.5, 0.5, 1.0), closed=False, cap=True)
        tail = [kb + Vector((sg * 0.012, -0.005, -0.02)), kb + Vector((sg * 0.035, -0.012, -0.08)), kb + Vector((sg * 0.05, -0.01, -0.14))]
        tube(M, tail, 0.009, "ribbon_red", segs=6)
    sphere(M, kb, 0.022, "ribbon_red", segs=10, rings=6, squash=0.8)
    # berry clusters (red) and the LEDs
    for i in range(4):
        a = 2 * math.pi * (i + 0.25) / 4 + 0.35
        base = C + Vector((math.cos(a) * R0, -0.078, math.sin(a) * R0))
        for q in range(3):
            c = clear(base + Vector((rnd.uniform(-0.02, 0.02), -0.012 * q, rnd.uniform(-0.02, 0.02))), 0.016)
            sphere(M, c, 0.011, "bauble", segs=8, rings=5, col=(rnd.random(), 0.0, 1.0))
    for i in range(10):
        a = 2 * math.pi * i / 10 + 0.2
        c = clear(C + Vector((math.cos(a) * (R0 + 0.01), -0.088, math.sin(a) * (R0 + 0.01))), 0.017)
        col = (rnd.random(), 0.0, 1.0)
        bead(M, c, 0.011, "bulb_warm", col, axis=Vector((0, -1, 0)))
        poly_shape(f1, c, 0.013, "bulb_warm", "oct", col); poly_shape(f2, c, 0.02, "bulb_warm", "tet", col)
    # the hook: from the door at the top of the ring
    tube(M, [Vector((0, -0.002, R0 + 0.12)), Vector((0, -0.04, R0 + 0.1)), C + Vector((0, 0.0, R0 + r0 * 0.6))], 0.004, "gold_metal", segs=6)
    return M, {1: f1, 2: f2}, {}


def build_swag():
    rnd = random.Random(7)
    M = Mesh("swag"); f1 = Mesh("swag__lod1"); f2 = Mesh("swag__lod2")
    HALF, SAG, Y = 0.8, 0.2, -0.095
    def P(x): return Vector((x, Y, -SAG * (1 - (x / HALF) ** 2)))
    xs = [-HALF + 2 * HALF * i / 24 for i in range(25)]
    pts = [P(x) for x in xs]
    rr = [0.045 * (1 + 0.15 * math.sin(i * 1.9)) for i in range(25)]
    tube(M, pts, rr, "fir_needles", segs=8, col=(0.4, 0.75, 1.0))
    for i in range(64):
        x = -HALF + 0.03 + (2 * HALF - 0.06) * (i + 0.5) / 64
        p = P(x); a = rnd.uniform(0, 2 * math.pi)
        d = Vector((rnd.uniform(-0.6, 0.6) + (1 if i % 2 else -1) * 0.5, -abs(math.cos(a)) * 0.8 - 0.2, math.sin(a) * 0.9)).normalized()
        frond(M, p + Vector((0, -0.01, 0)), d, rnd.uniform(0.12, 0.17), 0.065, 0.0, 0.0, (rnd.random(), 0.8, 1.0), seed=900 + i, nl=5, na=6, side=0)
    bvh = BVHTree.FromPolygons([tuple(v) for v in M.V], M.F, all_triangles=False)
    def clear(c, need, nrm=Vector((0, -1, 0))):
        for _ in range(12):
            loc_, _n, _i, dist = bvh.find_nearest(c)
            if loc_ is None or dist >= need: return c
            c = c + nrm * 0.004
        return c
    for i in range(12):
        x = -HALF + 0.07 + (2 * HALF - 0.14) * i / 11
        c = clear(P(x) + Vector((0, -0.08, 0.01 * math.sin(i))), 0.017)
        col = (rnd.random(), 1.0 if i % 5 == 2 else 0.0, 1.0)
        bead(M, c, 0.011, "bulb_warm", col, axis=Vector((0, -1, 0)))
        poly_shape(f1, c, 0.013, "bulb_warm", "oct", col); poly_shape(f2, c, 0.022, "bulb_warm", "tet", col)
    for x, g in ((-0.33, 0.0), (0.38, 0.5)):
        c = clear(P(x) + Vector((0, -0.02, -0.1)), 0.046, Vector((0, -0.3, -1)).normalized())
        sphere(M, c, 0.038, "bauble", segs=10, rings=7, col=(rnd.random(), g, 1.0))
        tube(M, [c + Z * 0.036, P(x) + Vector((0, -0.02, -0.05))], 0.004, "gold_metal", segs=6)
        poly_shape(f1, c, 0.038, "bauble", "ico", (0.5, g, 1.0)); poly_shape(f2, c, 0.04, "bauble", "oct", (0.5, g, 1.0))
    # the bow at the left end, the two screw-eye hooks
    kb = P(-HALF) + Vector((0.0, -0.06, 0.0))
    for sg in (-1, 1):
        pts = [kb + Vector((sg * (0.05 - 0.05 * math.cos(t)), -0.008 * math.sin(t), 0.035 * math.sin(t))) for t in [math.pi * 2 * q / 12 for q in range(13)]]
        tube(M, pts, 0.009, "ribbon_red", segs=6)
        tube(M, [kb + Vector((sg * 0.008, -0.004, -0.015)), kb + Vector((sg * 0.03, -0.008, -0.11))], 0.007, "ribbon_red", segs=6)
    sphere(M, kb, 0.016, "ribbon_red", segs=8, rings=6, squash=0.8)
    for x in (-HALF, HALF):
        tube(M, [Vector((x, -0.001, 0.0)), Vector((x, Y + 0.03, 0.0))], 0.005, "gold_metal", segs=6)
    return M, {1: f1, 2: f2}, {}


def rope_and_far(M, f1, f2, pts, r, closed=False, col=(0.5, 0.0, 1.0), trim=0.0, far_off=None):
    """the LED rope + its far stand-ins (fewer sides; a branch's stand-in starts `trim` m further out, off its arm; a ring
    crossing the arms is set `far_off` off their plane: flat prism faces must not overlap)"""
    tube(M, pts, r, "led_rope", segs=8, col=col, closed=closed)
    if trim: pts = [pts[0] + (pts[1] - pts[0]).normalized() * trim] + list(pts[1:])
    o = Vector(far_off) if far_off is not None else Vector()
    tube(f1, [p + o * 0.6 for p in pts], r, "led_rope", segs=4, col=col, closed=closed)
    tube(f2, [p + o for p in pts], r * 1.25, "led_rope", segs=3, col=col, closed=closed)


def build_lampmotif():
    M = Mesh("lampmotif"); f1 = Mesh("lampmotif__lod1"); f2 = Mesh("lampmotif__lod2")
    CY, R = 0.74, 0.5
    C = Vector((0, CY, 0))
    def at(a, r): return C + Vector((0, math.cos(a) * r, math.sin(a) * r))
    rnd = random.Random(3)
    for k in range(6):
        a = math.pi * k / 3                      # arm 3 (a = pi) points at the post
        col = (rnd.random(), 0.0, 1.0)
        rope_and_far(M, f1, f2, [at(a, 0.07), at(a, R * 0.5), at(a, R)], 0.013, col=col)
        for fr_, ln in ((0.5, 0.17), (0.78, 0.11)):
            base = at(a, R * fr_)
            for sg in (-1, 1):
                tip = base + Vector((0, math.cos(a + sg * math.radians(48)) * ln, math.sin(a + sg * math.radians(48)) * ln))
                rope_and_far(M, f1, f2, [base + (tip - base) * 0.09, tip], 0.011, col=col, trim=0.025)
        # the frame behind the arm (2.5 cm behind the rope, along +X)
        tube(M, [at(a, 0.04) + Vector((0.022, 0, 0)), at(a, R * 0.96) + Vector((0.022, 0, 0))], 0.0075, "metal_frame", segs=6)
    rope_and_far(M, f1, f2, [at(math.pi / 3 * k + math.pi / 6, 0.2) for k in range(6)], 0.011, closed=True, far_off=(-0.008, 0, 0))
    sphere(M, C + Vector((0.022, 0, 0)), 0.045, "metal_frame", segs=10, rings=6)
    # the clamps round the post (shaft radius ~6.5 cm at 4 m) and the two brackets
    for zc in (0.0, -0.38):
        ring = [Vector((math.cos(2 * math.pi * k / 16) * 0.078, math.sin(2 * math.pi * k / 16) * 0.078, zc)) for k in range(16)]
        tube(M, ring, 0.011, "metal_frame", segs=6, closed=True)
    tube(M, [Vector((0.022, 0.087, 0.0)), at(math.pi, R) + Vector((0.022, 0, 0))], 0.009, "metal_frame", segs=6)
    lo = at(math.radians(240), R * 0.96) + Vector((0.022, 0, 0))
    tube(M, [Vector((0.022, 0.087, -0.38)), lo], 0.009, "metal_frame", segs=6)
    return M, {1: f1, 2: f2}, {}


def build_spanmotif():
    M = Mesh("spanmotif"); f1 = Mesh("spanmotif__lod1"); f2 = Mesh("spanmotif__lod2")
    C = Vector((0, 0, -0.98))
    def star(ro, ri, rot=0.0):
        return [C + Vector((math.sin(rot + 2 * math.pi * k / 10) * (ro if k % 2 == 0 else ri), 0, math.cos(rot + 2 * math.pi * k / 10) * (ro if k % 2 == 0 else ri))) for k in range(10)]
    outer, inner = star(0.78, 0.34), star(0.4, 0.17)
    rope_and_far(M, f1, f2, outer, 0.016, closed=True, col=(0.3, 0.0, 1.0))
    rope_and_far(M, f1, f2, inner, 0.014, closed=True, col=(0.7, 1.0, 1.0))
    # frame (behind, +Y), the hook
    # (radial spokes from a small hub to the outer star's inner corners, 1-3 mm behind the ropes)
    B = Vector((0, 0.024, 0))
    for k in range(5):
        dv = (outer[2 * k + 1] - C).normalized()
        tube(M, [C + B + dv * 0.035, outer[2 * k + 1] + B], 0.006, "metal_frame", segs=6)
    sphere(M, C + B, 0.04, "metal_frame", segs=10, rings=6)
    top = outer[0]
    tube(M, [top + Vector((0, 0.024, -0.02)), Vector((0, 0.024, -0.06))], 0.008, "metal_frame", segs=6)
    ring = [Vector((math.cos(2 * math.pi * k / 12) * 0.03, 0.024, -0.03 + math.sin(2 * math.pi * k / 12) * 0.03)) for k in range(12)]
    tube(M, ring, 0.006, "metal_frame", segs=6, closed=True)
    return M, {1: f1, 2: f2}, {}


BUILD = {"tree": build_tree, "wreath": build_wreath, "swag": build_swag, "lampmotif": build_lampmotif, "spanmotif": build_spanmotif}
objs, fars, INFO = [], {}, {}
for name, fn in BUILD.items():
    if ONLY and name not in ONLY: continue
    t = time.time()
    M, F, info = fn()
    o = M.to_object(); objs.append(o)
    fars[name] = [Fm.to_object() for k, Fm in sorted(F.items()) if Fm.F]
    INFO[name] = {**info, "triangles_lod0": sum(len(p.vertices) - 2 for p in o.data.polygons), "slots": list(M.slots),
                  "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]}
    tick(f"{name}: {INFO[name]['triangles_lod0']} tris, slots {M.slots}, far {[f.name for f in fars[name]]} ({time.time() - t:.0f}s)")


# ------------------------------------------------------------------------------------------------ AO into COLOR_0.b (Cycles, per vertex)
def gpu_setup():
    """the bakes and previews on the laptop's RTX GPU (OptiX) when Blender sees it (--factory-startup = CPU), else the CPU"""
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "OPTIX"; pr.get_devices()
        on = [d for d in pr.devices if d.type == "OPTIX"]
        for d in pr.devices: d.use = d.type == "OPTIX"
        scn.cycles.device = "GPU" if on else "CPU"
        tick(f"Cycles device: {scn.cycles.device} ({[d.name for d in on]})")
    except Exception as e:
        scn.cycles.device = "CPU"; tick(f"Cycles device: CPU ({e})")


AO_DIST = {"tree": 0.9, "wreath": 0.12, "swag": 0.12, "lampmotif": 0.1, "spanmotif": 0.1}
if BAKE and objs:
    scn.render.engine = "CYCLES"; scn.cycles.samples = SAMPLES
    gpu_setup()
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    home = {o.name: o.location.copy() for o in objs}
    for x in list(scn.objects):
        if x not in objs: x.hide_render = True
    t = time.time()
    bake_list = objs + [f for v in fars.values() for f in v]
    for i, o in enumerate(bake_list):
        base = o.name.split("__")[0]
        # alone, on a ground plane (the tree) or against a wall (the wall pieces) / in the air (the motifs)
        for q in bake_list: q.hide_render = q is not o
        extra = []
        if base == "tree":
            bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.002)); extra.append(bpy.context.active_object)
        elif base in ("wreath", "swag"):
            bpy.ops.mesh.primitive_plane_add(size=4, location=(0, 0.002, 0), rotation=(math.pi / 2, 0, 0)); extra.append(bpy.context.active_object)
        elif base == "lampmotif":
            bpy.ops.mesh.primitive_cylinder_add(radius=0.066, depth=4, location=(0, 0, 0)); extra.append(bpy.context.active_object)
        scn.world.light_settings.distance = AO_DIST[base]
        me = o.data
        ao = me.color_attributes.new("AO", "BYTE_COLOR", "CORNER")
        me.color_attributes.active_color = ao
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS", margin=0)
        n = len(me.loops)
        a = [0.0] * (4 * n); me.color_attributes["AO"].data.foreach_get("color", a)
        c = [0.0] * (4 * n); me.color_attributes["Col"].data.foreach_get("color", c)
        for li in range(n): c[4 * li + 2] = a[4 * li]
        me.color_attributes["Col"].data.foreach_set("color", c)
        me.color_attributes.remove(me.color_attributes["AO"])
        me.color_attributes.active_color = me.color_attributes["Col"]
        for e in extra: bpy.data.objects.remove(e)
        tick(f"  AO {o.name} ({time.time() - t:.0f}s)")
    for q in bake_list: q.hide_render = False


# ------------------------------------------------------------------------------------------------ export
exp = objs + [f for v in fars.values() for f in v]
for x in scn.objects: x.select_set(False)
for o in exp: o.select_set(True)
bpy.context.view_layer.objects.active = exp[0]
raw = os.path.join(OUT, "christmas.raw.glb")
bpy.ops.export_scene.gltf(filepath=raw, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                          export_extras=True, export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
tick(f"exported {raw} {os.path.getsize(raw) // 1024} KB")
infof = os.path.join(OUT, "christmas.json")
prev = json.load(open(infof)) if os.path.exists(infof) else {}
prev.setdefault("pieces", {}).update(INFO)
prev.update({
    "asset": "Christmas kit (tools/blender/christmasKit.py): the square's fir, door wreath, shopfront swag, lamp-post snowflake, cross-street star",
    "colour": {"COLOR_0.r": "random per element (bulb phase / frond tint)", "COLOR_0.g": "variant: bauble 0 red / 0.5 gold / 1 champagne; bulb 1 = flash bulb; needle shade",
               "COLOR_0.b": "Cycles AO (each piece alone)"},
    "frame": "glTF Y up, front +Z; tree origin = trunk foot; wall pieces origin = the wall plane; lampmotif = post axis at the clamp; spanmotif = the hook",
})
json.dump(prev, open(infof, "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews (day + night)
if PREVIEWS and objs:
    PV = os.path.join(ROOT, "docs", "christmas", "blender"); os.makedirs(PV, exist_ok=True)
    scn.render.engine = "CYCLES"; gpu_setup(); scn.cycles.samples = 32; scn.cycles.use_denoising = True
    for m in MATS.values():
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        attr = nt.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "Col"
        sep = nt.nodes.new("ShaderNodeSeparateColor"); nt.links.new(attr.outputs["Color"], sep.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        base = m["preview"]
        if m.name == "bauble":
            ramp = nt.nodes.new("ShaderNodeValToRGB"); nt.links.new(sep.outputs[1], ramp.inputs[0])
            ramp.color_ramp.elements[0].color = (0.45, 0.02, 0.02, 1); ramp.color_ramp.elements[1].color = (0.85, 0.75, 0.55, 1)
            e = ramp.color_ramp.elements.new(0.5); e.color = (0.85, 0.55, 0.12, 1)
            nt.links.new(ramp.outputs[0], mul.inputs[6])
        else:
            mul.inputs[6].default_value = (*base, 1)
        nt.links.new(sep.outputs[2], mul.inputs[7]); nt.links.new(mul.outputs[2], b.inputs["Base Color"])
        if m["emit"]:
            b.inputs["Emission Color"].default_value = (*base, 1)
            m["emit_node"] = True
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    sun = bpy.data.lights.new("Sun", "SUN"); sun.angle = math.radians(1.0); so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(60), 0, math.radians(200))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky"); scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0])
    gm = bpy.data.materials.new("preview_ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.18, 0.17, 0.16, 1)
    bpy.ops.mesh.primitive_plane_add(size=200, location=(0, 0, -0.003)); bpy.context.active_object.data.materials.append(gm)
    for f in [x for v in fars.values() for x in v]: f.hide_render = True
    # the small pieces apart, each shot from its front
    POS = {"wreath": (2.0, -6.0, 1.6), "swag": (4.5, -6.0, 1.6), "lampmotif": (7.5, -6.0, 1.6), "spanmotif": (10.5, -6.0, 2.6)}
    VIEW = {"wreath": ((2.0, -7.4, 1.6), (2.0, -6.0, 1.6), 50), "swag": ((4.5, -8.4, 1.45), (4.5, -6.0, 1.45), 50),
            "lampmotif": ((9.6, -5.26, 1.5), (7.5, -5.26, 1.55), 50), "spanmotif": ((10.5, -9.4, 1.62), (10.5, -6.0, 1.62), 50)}
    for o in objs:
        if o.name in POS: o.location = POS[o.name]
    def shot(path, pos, tgt, lens, res, night):
        for m in MATS.values():
            b = m.node_tree.nodes["Principled BSDF"]
            b.inputs["Emission Strength"].default_value = (m["emit"] if night else m["emit"] * 0.08)
        sun.energy = 0.0 if night else 3.5; bg.inputs[1].default_value = 0.004 if night else 0.3
        scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = 0.3 if night else -1.0
        cam.location = Vector(pos); cam.rotation_euler = (Vector(tgt) - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 88
        scn.render.filepath = path; t = time.time(); bpy.ops.render.render(write_still=True); tick(f"render {os.path.basename(path)} {time.time() - t:.0f}s")
    if "tree" in [o.name for o in objs]:
        shot(os.path.join(PV, "tree_day.jpg"), (2.0, -17.0, 3.2), (0.6, 0, 4.6), 35, (900, 1100), False)
        shot(os.path.join(PV, "tree_night.jpg"), (2.0, -17.0, 3.2), (0.6, 0, 4.6), 35, (900, 1100), True)
        shot(os.path.join(PV, "tree_close.jpg"), (1.6, -4.2, 2.4), (0.6, 0, 2.6), 35, (1000, 800), False)
    for o in objs:
        if o.name in VIEW:
            pos, tgt, lens = VIEW[o.name]
            for night in (False, True):
                shot(os.path.join(PV, f"{o.name}_{'night' if night else 'day'}.jpg"), pos, tgt, lens, (800, 600), night)
tick("done")
