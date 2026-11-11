"""ROCK KIT: concrete rockwork ("rocaille") pieces + a natural-rock variant, for the Parc de la Sauvagere cliff and
cascade (and any park). Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/rockKit.py -- models/parkkit [--no-bake] [--previews] [--only name,name]

WHAT IT IMITATES (docs/heroes/SAUVAGERE_PREP.md): Francois Dumilieu's 1910 rockwork, 3-6 cm of cement on an iron mesh,
hand-finished, imitating STRATIFIED rock: massive blocks split by near-vertical joints and horizontal bedding
planes, blocks stepping in and out (ledges), rounded hand-worked edges, fine bedding lines on the faces, hairline
cracks, dark cave mouths at the water. Restored 2025-26: pale cream / sand colour (ochre in low sun), darker in the
joints, moss and soil on the ledges (the material's job: slot "rocaille_concrete").

HOW (every piece): a stack of boxes (layers x blocks, random set-back per layer and block, small tilts, 4-7 cm gaps
= the joints) + a core 18 cm behind the faces (joints stay 18 cm deep, never through) -> voxel remesh (fused,
manifold) -> optional boolean hollow (grotto / channel) -> remesh -> vertex smoothing (rounded edges) -> noise
displacement along the normal (bulges, bedding lines on steep faces, hairline cracks) -> the hidden bottom removed.
COLOR_0 ("Col", data, not colour): r = cavity (0.5 flat, > 0.5 concave: joints, cracks), g = a per-layer tone value,
b = convexity (edges). UV0 metres (smart-projected islands scaled to metres), UV1 the AO atlas (parkkit_rock_ao.png).
Output: <out>/rockkit.raw.glb + rockkit.json (+ previews). LODs: node tools/park_kit_pack.mjs (meshoptimizer).
"""
import bpy, bmesh, math, os, sys, json, random, time
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/parkkit")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
ONLY = None
if "--only" in ARGS: ONLY = set(ARGS[ARGS.index("--only") + 1].split(","))
VOXEL = 0.04
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()

ROCAILLE = K.mat("rocaille_concrete", (0.5, 0.45, 0.36), 0.85)
SANDSTONE = K.mat("rock_sandstone", (0.52, 0.45, 0.34), 0.9)
SCHIST = K.mat("rock_schist_dark", (0.17, 0.17, 0.16), 0.75)


# ------------------------------------------------------------------------------------------------ the block mass
def chamfered_block(x0, x1, y0, y1, z0, z1, rnd, cuts=2, lean=(0, 0, 0)):
    """a box with 0-3 random corner / edge cuts (the angular, faceted blocks of the photos), leaned / yawed"""
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1.0)
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    bmesh.ops.scale(b, vec=(sx, sy, sz), verts=b.verts)
    for _ in range(cuts):
        # a plane through a point near a top / front corner, normal pointing out of that corner
        cx, cy, cz = rnd.choice((-1, 1)), rnd.choice((-1, -1, 1)), rnd.choice((1, 1, -1))
        nrm = Vector((cx * rnd.uniform(0.3, 1.0), cy * rnd.uniform(0.3, 1.0), cz * rnd.uniform(0.4, 1.0))).normalized()
        corner = Vector((cx * sx / 2, cy * sy / 2, cz * sz / 2))
        depth = rnd.uniform(0.08, 0.35) * min(sx, sy, sz, 0.9)
        co = corner - nrm * depth * 1.6
        r = bmesh.ops.bisect_plane(b, geom=list(b.verts) + list(b.edges) + list(b.faces), plane_co=co, plane_no=nrm, clear_outer=True)
        cut = [e for e in r["geom_cut"] if isinstance(e, bmesh.types.BMEdge)]
        if cut:
            try: bmesh.ops.contextual_create(b, geom=cut)
            except Exception: pass
    m = Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Rotation(lean[2], 4, "Z") @ Matrix.Rotation(lean[0], 4, "X") @ Matrix.Rotation(lean[1], 4, "Y")
    b.transform(m)
    return b


def merge(bm, b):
    me = bpy.data.meshes.new("tmp"); b.to_mesh(me); b.free()
    bm.from_mesh(me); bpy.data.meshes.remove(me)


def add_box(bm, x0, x1, y0, y1, z0, z1, tilt=(0, 0)):
    b = bmesh.new()
    bmesh.ops.create_cube(b, size=1.0)
    bmesh.ops.scale(b, vec=(x1 - x0, y1 - y0, z1 - z0), verts=b.verts)
    b.transform(Matrix.Translation(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)) @ Matrix.Rotation(tilt[0], 4, "X") @ Matrix.Rotation(tilt[1], 4, "Y"))
    merge(bm, b)


def splits(a, b, lo, hi, rnd):
    xs = [a]
    while xs[-1] < b - lo * 1.2:
        xs.append(min(b, xs[-1] + rnd.uniform(lo, hi)))
    xs[-1] = b
    if len(xs) >= 3 and xs[-1] - xs[-2] < lo * 0.6: xs.pop(-2)
    return xs


def block_mass(spec, rnd):
    """a stratified mass of big angular blocks. spec: W, D, H; faces: the sides that show ('front', 'back', 'left',
    'right'; the others are flat, against the soil); joints (column width range); layers (bedding range); setback
    (front offset range); tops (top height range as a fraction of H); overhang (the top blocks pushed out)"""
    W, D, H = spec["W"], spec["D"], spec["H"]
    faces = spec.get("faces", ("front", "left", "right", "back"))
    bm = bmesh.new()
    cin = 0.3
    cx0 = -W / 2 + (cin if "left" in faces else 0.0); cx1 = W / 2 - (cin if "right" in faces else 0.0)
    cy0 = -D / 2 + (cin if "front" in faces else 0.0); cy1 = D / 2 - (cin if "back" in faces else 0.0)
    add_box(bm, cx0, cx1, cy0, cy1, 0.0, H * spec.get("core", 0.78))
    lo, hi = spec.get("joints", (0.45, 1.1))
    gap = spec.get("gap", 0.07)
    sb0, sb1 = spec.get("setback", (-0.34, 0.24))
    t0, t1 = spec.get("tops", (0.62, 1.0))
    for side in faces:
        along = W if side in ("front", "back") else D
        cuts = splits(-along / 2, along / 2, lo, hi, rnd)
        drift = 0.0
        for k in range(len(cuts) - 1):
            a, b = cuts[k] + gap / 2, cuts[k + 1] - gap / 2
            if b - a < 0.15: continue
            mid = (k + 0.5) / (len(cuts) - 1)
            top = H * rnd.uniform(t0, t1) * (1.0 - 0.18 * abs(mid - 0.5) * spec.get("dome", 1.0))
            zs = splits(0.0, top, *spec.get("layers", (0.35, 0.8)), rnd)
            drift = 0.6 * drift + 0.4 * rnd.uniform(sb0, sb1)
            for j in range(len(zs) - 1):
                za = zs[j] + (0.03 if j else -0.1); zb = zs[j + 1] - 0.03
                off = drift + rnd.uniform(sb0, sb1) * 0.6 - (spec.get("overhang", 0.0) if j == len(zs) - 2 and top > H * 0.8 else 0.0)
                th = rnd.uniform(0.5, 0.95)
                lean = (rnd.uniform(-0.12, 0.12), rnd.uniform(-0.08, 0.08), rnd.uniform(-0.18, 0.18))
                cuts_n = rnd.choice((1, 1, 2, 2, 3, 3))
                if side == "front": blk = chamfered_block(a, b, -D / 2 + off, -D / 2 + off + th, za, zb, rnd, cuts_n, lean)
                elif side == "back":
                    blk = chamfered_block(a, b, -D / 2 + off, -D / 2 + off + th, za, zb, rnd, cuts_n, lean)
                    blk.transform(Matrix.Rotation(math.pi, 4, "Z"))
                elif side == "left":
                    blk = chamfered_block(-th / 2, th / 2, a, b, za, zb, rnd, cuts_n, (lean[1], lean[0], lean[2]))
                    blk.transform(Matrix.Translation((-W / 2 + off + th / 2, 0, 0)))
                else:
                    blk = chamfered_block(-th / 2, th / 2, a, b, za, zb, rnd, cuts_n, (lean[1], lean[0], lean[2]))
                    blk.transform(Matrix.Translation((W / 2 - off - th / 2, 0, 0)))
                merge(bm, blk)
    return bm


def remesh(o, voxel):
    md = o.modifiers.new("rm", "REMESH"); md.mode = "VOXEL"; md.voxel_size = voxel; md.adaptivity = 0.0; md.use_smooth_shade = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=md.name)


def subtract(o, cutter):
    md = o.modifiers.new("bool", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cutter; md.solver = "EXACT"
    md.use_self = True; md.use_hole_tolerant = True
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier=md.name)
    bpy.data.objects.remove(cutter)


def ellipsoid(c, r, segs=40):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segs, ring_count=segs // 2, radius=1.0, location=c)
    e = bpy.context.active_object; e.scale = r
    bpy.ops.object.transform_apply(scale=True)
    return e


def capsule_path(pts, r, rz):
    """a chain of overlapping ellipsoids along pts (a channel bed's cutter)"""
    parts = []
    for i in range(len(pts) - 1):
        a, b = Vector(pts[i]), Vector(pts[i + 1])
        n = max(2, int((b - a).length / (r * 0.6)))
        for k in range(n):
            parts.append(ellipsoid(a.lerp(b, k / n), (r, r, rz), 24))
    parts.append(ellipsoid(Vector(pts[-1]), (r, r, rz), 24))
    for x in bpy.context.scene.objects: x.select_set(False)
    for p in parts: p.select_set(True)
    bpy.context.view_layer.objects.active = parts[0]
    bpy.ops.object.join()
    c = bpy.context.active_object
    remesh(c, 0.03)
    return c


# ------------------------------------------------------------------------------------------------ surface work
def fbm(p, oct=4, lac=2.0, gain=0.5):
    s, a, f = 0.0, 1.0, 1.0
    for _ in range(oct):
        s += a * noise.noise(p * f, noise_basis="PERLIN_NEW"); a *= gain; f *= lac
    return s


def displace(o, spec, rnd):
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me)
    # rounded, hand-worked edges
    for _ in range(spec.get("smooth", 1)):
        bmesh.ops.smooth_vert(bm, verts=bm.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    seed = Vector((rnd.uniform(0, 100), rnd.uniform(0, 100), rnd.uniform(0, 100)))
    bed = spec.get("bedding", 0.16)
    amp = spec.get("amp", 1.0)
    crack_scale = Vector((0.9, 0.9, 0.25))
    offs = []
    for v in bm.verts:
        p, n = v.co, v.normal
        steep = max(0.0, 1.0 - abs(n.z) * 1.3)
        d = 0.055 * fbm(p * 1.1 + seed, 3)                                                    # large bulges
        d += 0.016 * fbm(p * 4.5 + seed * 1.7, 3)                                             # hand-worked lumps
        if bed > 0:
            warp = 0.05 * noise.noise(p * 2.5 + seed, noise_basis="PERLIN_NEW")
            ph = (p.z + warp) / bed
            d -= steep * 0.012 * (0.5 + 0.5 * math.cos(2 * math.pi * ph)) ** 2                    # bedding lines (grooves, >= 4 vertices a period)
        if spec.get("cracks", True):
            q = Vector((p.x * crack_scale.x, p.y * crack_scale.y, p.z * crack_scale.z)) + seed
            f = noise.voronoi(q, distance_metric="DISTANCE")[0]
            e = f[1] - f[0]
            if e < 0.05: d -= steep * 0.02 * (1 - e / 0.05)                                     # open cracks (broad: the hairlines are the material's)
        if n.z > 0.5: d += 0.006 * fbm(p * 9 + seed, 2) * (n.z - 0.5) * 2                     # weathered tops
        offs.append(d * amp)
    for v, d in zip(bm.verts, offs): v.co += v.normal * d
    # the hidden bottom (sits in the ground) goes
    bm.normal_update()
    bottom = [f for f in bm.faces if f.normal.z < -0.6 and all(v.co.z < 0.04 for v in f.verts)]
    bmesh.ops.delete(bm, geom=bottom, context="FACES")
    loose = [v for v in bm.verts if not v.link_faces]
    bmesh.ops.delete(bm, geom=loose, context="VERTS")
    bm.to_mesh(me); bm.free()
    me.shade_smooth()


def masks(o, rnd, layer_h=0.4):
    """COLOR_0: r cavity, g layer tone, b convexity (data for the material, not colour)"""
    me = o.data
    bm = bmesh.new(); bm.from_mesh(me); bm.normal_update()
    cav = {}
    for v in bm.verts:
        if not v.link_edges: cav[v.index] = 0.0; continue
        s = 0.0
        for e in v.link_edges:
            w = e.other_vert(v).co - v.co
            s += w.dot(v.normal) / max(w.length, 1e-4)
        cav[v.index] = s / len(v.link_edges)
    seed = rnd.uniform(0, 100)
    vals = []
    for v in bm.verts:
        c = cav[v.index]
        r = max(0.0, min(1.0, 0.5 + c * 2.2))
        layer = math.floor((v.co.z + 0.06 * noise.noise(v.co * 2 + Vector((seed, 0, 0)))) / layer_h)
        g = (math.sin(layer * 12.9898 + seed) * 43758.5453) % 1.0
        b = max(0.0, min(1.0, -c * 3.0))
        vals.append((r, g, b))
    bm.free()
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    data = []
    for li in range(len(me.loops)):
        r, g, b = vals[me.loops[li].vertex_index]; data += [r, g, b, 1.0]
    col.data.foreach_set("color", data)


# ------------------------------------------------------------------------------------------------ the pieces
PIECES = [
    # name, slot, spec (W along x, D along y: the front is -y, H up; faces = the sides that show)
    ("rk_boulder_a", ROCAILLE, dict(W=1.7, D=1.4, H=1.2, joints=(0.5, 0.9), layers=(0.35, 0.6), tops=(0.6, 1.0), setback=(-0.15, 0.12), seed=11)),
    ("rk_boulder_b", ROCAILLE, dict(W=1.3, D=1.2, H=2.1, joints=(0.4, 0.75), layers=(0.6, 1.2), tops=(0.7, 1.0), setback=(-0.12, 0.1), seed=12)),
    ("rk_ledge", ROCAILLE, dict(W=2.6, D=1.5, H=0.6, joints=(0.6, 1.3), layers=(0.25, 0.35), tops=(0.8, 1.0), overhang=0.25, setback=(-0.1, 0.1), dome=0.3, seed=13)),
    ("rk_face_a", ROCAILLE, dict(W=4.0, D=1.7, H=3.0, faces=("front", "left", "right"), joints=(0.45, 1.1), layers=(0.5, 1.2), seed=14)),
    ("rk_face_b", ROCAILLE, dict(W=3.0, D=1.5, H=2.0, faces=("front", "left", "right"), joints=(0.45, 1.0), layers=(0.4, 0.9), seed=15)),
    ("rk_corner", ROCAILLE, dict(W=2.6, D=2.6, H=2.6, faces=("front", "right"), joints=(0.45, 1.0), layers=(0.5, 1.1), seed=16)),
    ("rk_step", ROCAILLE, dict(W=1.6, D=1.0, H=0.38, steps=True, joints=(0.6, 1.0), layers=(0.3, 0.4), tops=(0.92, 1.0), setback=(-0.05, 0.05), dome=0.0, seed=17)),
    ("rk_grotto", ROCAILLE, dict(W=3.4, D=2.4, H=2.7, faces=("front", "left", "right"), joints=(0.5, 1.1), layers=(0.5, 1.1), tops=(0.75, 1.0), hollow=((0.0, -1.3, 0.75), (1.0, 1.4, 1.15)), seed=18)),
    ("rk_channel", ROCAILLE, dict(W=2.4, D=1.3, H=0.45, faces=("front", "back"), joints=(0.45, 0.9), layers=(0.4, 0.5), tops=(0.85, 1.0), setback=(-0.08, 0.08), dome=0.0, channel=True, core=0.9, seed=19)),
    ("nat_boulder", SANDSTONE, dict(W=1.4, D=1.1, H=0.8, natural=True, seed=21)),
    ("nat_slab", SCHIST, dict(W=1.8, D=1.1, H=0.3, joints=(0.7, 1.5), layers=(0.08, 0.12), tops=(0.85, 1.0), setback=(-0.12, 0.06), dome=0.0, bedding=0.04, amp=0.6, smooth=2, seed=22)),
]


def natural_blob(spec, rnd):
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=4, radius=1.0, location=(0, 0, 0))
    o = bpy.context.active_object
    o.scale = (spec["W"] / 2, spec["D"] / 2, spec["H"] * 0.75)
    bpy.ops.object.transform_apply(scale=True)
    seed = Vector((rnd.uniform(0, 50),) * 3)
    for v in o.data.vertices:
        p = v.co
        k = 1.0 + 0.22 * fbm(p * 0.9 + seed, 3)
        v.co = Vector((p.x * k, p.y * k, max(p.z * k, -0.05) + spec["H"] * 0.25))
        if v.co.z > spec["H"] * 0.8: v.co.z = spec["H"] * 0.8 + (v.co.z - spec["H"] * 0.8) * 0.4      # flattened top
    return o


def build(name, slot, spec):
    rnd = random.Random(spec["seed"])
    t = time.time()
    if spec.get("natural"):
        o = natural_blob(spec, rnd)
        o.name = name
    else:
        if spec.get("steps"):
            bm = bmesh.new()
            s1 = dict(spec, H=0.19, D=spec["D"]); s2 = dict(spec, H=0.19, D=spec["D"] * 0.5)
            b1 = block_mass(s1, rnd); b2 = block_mass(s2, rnd)
            me1 = bpy.data.meshes.new("a"); b1.to_mesh(me1); bm.from_mesh(me1)
            b2.transform(Matrix.Translation((0, spec["D"] * 0.25, 0.19)))
            me2 = bpy.data.meshes.new("b"); b2.to_mesh(me2); bm.from_mesh(me2)
            b1.free(); b2.free()
        else:
            bm = block_mass(spec, rnd)
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    remesh(o, VOXEL * 1.15)
    if spec.get("hollow"):
        c, r = spec["hollow"]
        cut = [ellipsoid(c, r)]
        for k in range(3):        # an irregular mouth: lobes around the main hollow
            cc = Vector(c) + Vector((rnd.uniform(-0.6, 0.6) * r[0], rnd.uniform(-0.1, 0.4) * r[1], rnd.uniform(-0.2, 0.45) * r[2]))
            cut.append(ellipsoid(cc, (r[0] * rnd.uniform(0.45, 0.7), r[1] * rnd.uniform(0.5, 0.8), r[2] * rnd.uniform(0.45, 0.7))))
        for x in scn.objects: x.select_set(False)
        for x in cut: x.select_set(True)
        bpy.context.view_layer.objects.active = cut[0]
        bpy.ops.object.join()
        cj = bpy.context.active_object
        remesh(cj, 0.05)
        print("  cutter", len(cj.data.vertices), "verts")
        for v in cj.data.vertices: v.co += v.normal * 0.08 * fbm(v.co * 1.4 + Vector((3, 1, 7)), 3)
        subtract(o, cj)
        print("  after hollow", len(o.data.vertices), "verts")
        remesh(o, VOXEL)
    if spec.get("channel"):
        L = spec["W"] / 2 + 0.3
        path = [(-L, 0.02, spec["H"] + 0.05), (-0.4, -0.12, spec["H"] + 0.02), (0.4, 0.12, spec["H"] + 0.02), (L, -0.02, spec["H"] + 0.05)]
        subtract(o, capsule_path(path, 0.34, 0.26))
        remesh(o, VOXEL)
    if not spec.get("hollow") and not spec.get("channel"): remesh(o, VOXEL)
    displace(o, dict(spec, bedding=0.0 if spec.get("natural") else spec.get("bedding", 0.075), cracks=not spec.get("natural"), amp=spec.get("amp", 1.6 if spec.get("natural") else 1.0)), rnd)
    o.data.materials.clear(); o.data.materials.append(slot)
    masks(o, rnd)
    K.smart_uv_metres(o)
    print(f"{name}: {K.tris(o)} tris, {len(o.data.vertices)} verts, {time.time() - t:.1f}s")
    return o


objs = []
for name, slot, spec in PIECES:
    if ONLY and name not in ONLY: continue
    objs.append(build(name, slot, spec))
print(f"built {len(objs)} pieces {time.time() - T0:.0f}s")

layout = K.atlas_layout(objs)
for o in objs: K.lightmap_uv(o, layout[o.name], margin=0.003)
ao_png = os.path.join(OUT, "rockkit_ao.png")
if BAKE:
    ao_img = K.bake_ao(objs, ao_png, px=2048, samples=64, distance=1.4)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(objs, os.path.join(OUT, "rockkit.raw.glb"), colors=True)
info = {
    "asset": "Park kit: concrete rockwork (rocaille) + natural rock (tools/blender/rockKit.py)",
    "pieces": {o.name: {"slot": o.data.materials[0].name, "triangles_raw": K.tris(o),
                        "size_m": [round(o.dimensions.x, 2), round(o.dimensions.y, 2), round(o.dimensions.z, 2)],
                        "atlas": [round(v, 4) for v in layout[o.name]]} for o in objs},
    "slots": {"rocaille_concrete": "1910 cement rockwork, restored (cream / sand, darker joints, moss on ledges)",
              "rock_sandstone": "natural Brussels sandstone boulder (natural variant)",
              "rock_schist_dark": "dark grey slab (the cascade bed's slabs)"},
    "attributes": {"COLOR_0": "r cavity (0.5 flat, >0.5 concave), g layer tone, b convexity", "TEXCOORD_0": "metres (smart-projected, scaled)",
                   "TEXCOORD_1": "AO atlas rockkit_ao.png"},
    "frame": "glTF Y up, origin = footprint centre on the ground, faces toward -Z (glTF) = the cliff's front; sink 0.05-0.2 m into the terrain",
    "voxel_m": VOXEL,
}
json.dump(info, open(os.path.join(OUT, "rockkit.json"), "w"), indent=1)

if PREVIEWS:
    so, cam = K.preview_setup(ao_img, sun_elev=30, sun_az=320)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    # line the pieces up (x), fronts toward -y
    x = 0.0
    for o in objs:
        o.location = (x + o.dimensions.x / 2, 0, 0); x += o.dimensions.x + 0.8
    K.render(cam, os.path.join(PV, "rock_lineup.jpg"), (x / 2, -16, 5.5), (x / 2, 0, 1.0), 30, (1800, 700))
    # grazing light close-up on the face
    f = next((o for o in objs if o.name == "rk_face_a"), objs[0])
    so.rotation_euler = (math.radians(78), 0, math.radians(280))
    K.render(cam, os.path.join(PV, "rock_grazing_face.jpg"), (f.location.x - 1.0, -3.6, 1.6), (f.location.x, -0.6, 1.4), 35)
    g = next((o for o in objs if o.name == "rk_grotto"), None)
    if g:
        so.rotation_euler = (math.radians(55), 0, math.radians(330))
        K.render(cam, os.path.join(PV, "rock_grotto.jpg"), (g.location.x + 1.5, -6.0, 1.6), (g.location.x, -1.0, 1.0), 35)
print(f"done {time.time() - T0:.0f}s")
