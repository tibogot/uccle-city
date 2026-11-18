"""THE KID (docs/KID.md): the game's main character, a 90s kid of ~11-12 (1.45 m), stylised but grounded, built by
script on the Quaternius UAL skeleton (Universal Animation Library 1, CC0) so every UAL clip plays on it unchanged.

  blender -b --factory-startup -P tools/characters/kid.py -- [--raw <data/raw>] [--renders] [--quick] [--out <dir>]
          [--shirt tee|sweat] [--legs shorts|jeans] [--cap 0|1|back]

What it does (Blender 5.0, headless; Cycles on OPTIX for the AO bake and the renders):
  1. imports the UAL1 mannequin (its rig and skin weights: the deformation the clips were made on);
  2. RE-PROPORTIONS it into a kid: every bone gets a length scale (along it) and a girth scale (across it); each
     vertex is moved by the linear blend of its bones' "old rest -> new rest" maps (the same blend the skinning does,
     so the weights stay right), then the bones' heads move to their mapped places. Bone ORIENTATIONS are kept: only
     the joints' offsets change, so the clips' local rotations mean the same thing on the kid. The pelvis is moved by
     the same factor k as its height (kid.json `pelvisScale`): the clips' pelvis translation is scaled by k;
  3. reshapes the head (a rounder cranium, softer jaw: a kid, not a small adult);
  4. dresses it from the body itself: each garment is the body's own faces of a region (chosen by the bones that
     drive them), offset out along the normals, with a turned-in hem (no open edge to see through), its weights copied
     (it deforms exactly with the skin); the body faces fully under a garment are deleted (no poke-through, fewer tris);
  5. sneakers (upper, a thick sole with a foxing band, laces), socks, an optional cap, hair (clumped shells + a
     fringe), a simple readable face (eyes with iris + pupil + highlight, brows, nose, mouth, ears): rigid on the head;
  6. NAMED material slots (no baked colour): skin, shirt, shirt_trim, shorts, socks, sock_stripe, shoe, shoe_accent,
     sole, lace, hair, brow, eye_white, iris, pupil, mouth, cap, cap_brim. The colours here are for the renders only;
     the viewer's palette (viewer/kid/kidModel.js KID_PALETTE) sets them;
  7. AO baked per vertex (Cycles) into COLOR_0 (grey): contact shading under the hems, the cap, between fingers;
  8. LODs by Decimate (collapse, weights interpolated): LOD0 <= 15k tris, LOD1 ~ 5k, LOD2 ~ 1.6k;
  9. exports models/characters/kid_src.glb (rig + the three LOD meshes, no clips) + kid_rig.json (the new joints);
     tools/characters/kidBuild.mjs then adds the UAL clips (on the kid's joints) -> models/characters/kid.glb + kid.json.
 10. --renders: turnaround, poses from the UAL clips (walk, run, jump, crouch, sit), the face close-up -> docs/kid/.
"""
import bpy, bmesh, math, os, sys, json, time
import numpy as np
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

T0 = time.time()
def tick(msg): print(f"[kid {time.time() - T0:6.1f}s] {msg}", flush=True)

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None):
    return ARGV[ARGV.index(k) + 1] if k in ARGV and ARGV.index(k) + 1 < len(ARGV) else d
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
RAW = arg("--raw") or next((p for p in [os.path.join(ROOT, "data", "raw"), os.path.join(ROOT, "..", "uccle-city", "data", "raw")]
                             if os.path.isdir(os.path.join(p, "characters", "ual1"))), None)
UAL1 = os.path.join(RAW, "characters", "ual1", "x", "Universal Animation Library[Standard]", "Unreal-Godot", "UAL1_Standard.glb")
OUT = arg("--out") or os.path.join(ROOT, "models", "characters")
DOCS = arg("--docs") or os.path.join(ROOT, "docs", "kid")
RENDERS = "--renders" in ARGV
QUICK = "--quick" in ARGV
OUTFIT = {"shirt": arg("--shirt", "tee"), "legs": arg("--legs", "shorts"), "cap": arg("--cap", "1")}

# ------------------------------------------------------------------------------------------------ the proportions
# (length along the bone, girth across it) per bone; the UAL mannequin is a 1.83 m adult. A kid of 11-12: 1.45 m,
# legs ~48 % of the height, the head ~1/6.2 of it (slightly big: stylised), narrow shoulders, slim limbs, hands a
# little big. The pelvis height then sets k (the clips' pelvis translation x k).
PROP = {
    "pelvis": (0.70, 0.86), "spine_01": (0.74, 0.76), "spine_02": (0.74, 0.75), "spine_03": (0.74, 0.74),
    "neck_01": (0.50, 0.72), "Head": (0.90, 0.90),
    "clavicle": (0.70, 0.76), "upperarm": (0.78, 0.76), "lowerarm": (0.76, 0.76), "hand": (0.86, 0.86),
    "finger": (0.86, 0.86),
    "thigh": (0.79, 0.74), "calf": (0.80, 0.77), "foot": (0.80, 0.80), "ball": (0.80, 0.80),
}
def prop(name):
    if name in PROP: return PROP[name]
    base = name.rsplit("_", 1)[0]
    if base in PROP: return PROP[base]
    if any(name.startswith(f) for f in ("index", "middle", "ring", "pinky", "thumb")): return PROP["finger"]
    if name.startswith("ball"): return PROP["ball"]
    return (1.0, 1.0)

# ------------------------------------------------------------------------------------------------ scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.unit_settings.system = "METRIC"
bpy.ops.import_scene.gltf(filepath=UAL1)
arm = next(o for o in scn.objects if o.type == "ARMATURE")
body = bpy.data.objects["Mannequin"]
for o in list(scn.objects):
    if o.type == "MESH" and o is not body: bpy.data.objects.remove(o)
arm.name = "KidRig"; body.name = "Body"
assert body.matrix_world == Matrix.Identity(4) and arm.matrix_world == Matrix.Identity(4), "expected identity object transforms"
tick(f"UAL1 imported: {len(arm.data.bones)} bones, body {len(body.data.polygons)} faces, {len(bpy.data.actions)} clips")

def mat(name, col, rough=0.8, metal=0.0, sss=0.0):
    m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if sss: b.inputs["Subsurface Weight"].default_value = sss; b.inputs["Subsurface Radius"].default_value = (0.6, 0.25, 0.15)
    m["preview"] = list(col)
    return m
# preview colours (sRGB-ish authoring -> linear) of the default outfit: a yellow tee with a teal trim, denim-blue
# shorts, white socks with red stripes, white / red sneakers, a red cap, brown hair
lin = lambda h: tuple(pow(((h >> s) & 255) / 255, 2.2) for s in (16, 8, 0))
SLOTS = {
    "skin": (lin(0xE8B796), 0.55, 0, 0.15), "shirt": (lin(0xF2C230), 0.85, 0, 0), "shirt_trim": (lin(0x1F8A8A), 0.85, 0, 0),
    "shorts": (lin(0x3D5A8A), 0.9, 0, 0), "socks": (lin(0xF2F0EA), 0.9, 0, 0), "sock_stripe": (lin(0xC83030), 0.9, 0, 0),
    "shoe": (lin(0xF4F4F2), 0.6, 0, 0), "shoe_accent": (lin(0xC83030), 0.6, 0, 0), "sole": (lin(0xE9E4D8), 0.75, 0, 0),
    "lace": (lin(0xFAFAFA), 0.8, 0, 0), "hair": (lin(0x5A3A22), 0.6, 0, 0), "brow": (lin(0x3E2716), 0.8, 0, 0),
    "eye_white": (lin(0xF4F1EC), 0.25, 0, 0), "iris": (lin(0x4A7A3C), 0.2, 0, 0), "pupil": (lin(0x121212), 0.15, 0, 0),
    "mouth": (lin(0xA4504A), 0.6, 0, 0), "cap": (lin(0xC8302C), 0.8, 0, 0), "cap_brim": (lin(0xC8302C), 0.8, 0, 0),
}
MATS = {k: mat(k, c, r, m, s) for k, (c, r, m, s) in SLOTS.items()}

# ------------------------------------------------------------------------------------------------ 2. re-proportion
bones = arm.data.bones
order = []
def walk(b):
    order.append(b)
    for c in b.children: walk(c)
for b in bones:
    if b.parent is None: walk(b)
Rold = {b.name: b.matrix_local.copy() for b in bones}
D, newHead = {}, {}
for b in order:
    sl, sg = prop(b.name) if b.name != "root" else (1.0, 1.0)
    h = Rold[b.name].to_translation()
    nh = D[b.parent.name] @ h if b.parent else h.copy()
    newHead[b.name] = nh
    Tn = Rold[b.name].copy(); Tn.translation = nh
    S = Matrix.Diagonal((sg, sl, sg, 1.0))            # (a bone's local Y runs along it)
    D[b.name] = Tn @ S @ Rold[b.name].inverted()
# the pelvis: moved with its height factor so the clips' pelvis translation can just be scaled (tools/kidBuild.mjs)
me = body.data
gi = {g.index: g.name for g in body.vertex_groups}
V = np.array([v.co[:] for v in me.vertices])
def blend_map(V, weights_of):
    out = np.zeros_like(V)
    for i, v in enumerate(me.vertices):
        ws = [(gi[g.group], g.weight) for g in v.groups if g.weight > 0 and gi[g.group] in D]
        tot = sum(w for _, w in ws) or 1.0
        p = Vector(V[i]); acc = Vector((0, 0, 0))
        for n, w in ws: acc += (D[n] @ p) * (w / tot)
        out[i] = acc[:] if ws else V[i]
    return out
V2 = blend_map(V, None)
floor = V2[:, 2].min()
P0 = Rold["pelvis"].to_translation()
k = (P0.z - floor) / P0.z
shift = Vector((0, P0.y * (k - 1), -floor))           # = (k - 1) * pelvis rest, with z exactly to the floor
shift.z = -floor
V2 += np.array(shift[:])
for n in newHead:
    if n != "root": newHead[n] = newHead[n] + shift
for i, v in enumerate(me.vertices): v.co = V2[i]
bpy.context.view_layer.objects.active = arm
bpy.ops.object.mode_set(mode="EDIT")
for eb in arm.data.edit_bones:
    if eb.name == "root": continue
    sl, sg = prop(eb.name)
    d = (eb.tail - eb.head) * sl
    roll = eb.roll
    eb.head = newHead[eb.name]; eb.tail = newHead[eb.name] + d; eb.roll = roll
bpy.ops.object.mode_set(mode="OBJECT")
HEIGHT = V2[:, 2].max() - V2[:, 2].min()
tick(f"re-proportioned: height {HEIGHT:.3f} m, pelvis k {k:.4f}, pelvis {newHead['pelvis'].z:.3f} m")

def bone_head(n): return arm.data.bones[n].head_local.copy()
def bone_tail(n): return arm.data.bones[n].tail_local.copy()

# per vertex: its dominant bone + weights (for regions)
def vweights(o):
    gi = {g.index: g.name for g in o.vertex_groups}
    out = []
    for v in o.data.vertices:
        ws = {gi[g.group]: g.weight for g in v.groups if g.weight > 1e-4}
        out.append(ws)
    return out

# ------------------------------------------------------------------------------------------------ 3. one smooth skin + a kid's head
# The UAL mannequin is SEGMENTED (a jointed doll: plates, rims and grooves at the knees, elbows, waist) and its head is
# a featureless egg. The kid's skin: the re-proportioned mannequin without its head + a sculpted kid head (cranium,
# cheeks, jaw, chin, nose, ears as overlapping ellipsoids), fused by a voxel remesh, smoothed (the doll's rims and
# grooves and the head's creases melt; the hands masked out: the fingers stay), decimated to the game budget, then
# the mannequin's skin weights transferred back (nearest face, interpolated): the clips' deformation is the mannequin's.
WS = vweights(body)
head_w = np.array([ws.get("Head", 0) for ws in WS])
Vh = np.array([v.co[:] for v in me.vertices])
H_ = Vh[head_w > 0.5]
HEAD_TOP, HEAD_BOT = H_[:, 2].max(), H_[:, 2].min()
HW, HDp = H_[:, 0].max() - H_[:, 0].min(), H_[:, 1].max() - H_[:, 1].min()
HYC = (H_[:, 1].max() + H_[:, 1].min()) / 2
HB = bone_head("Head")
tick(f"mannequin head: z {HEAD_BOT:.3f}-{HEAD_TOP:.3f}, width {HW:.3f}, depth {HDp:.3f}, Head bone at {HB.z:.3f}")

def bm_of(o):
    bm = bmesh.new(); bm.from_mesh(o.data); return bm
def sel_only(o):
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
def apply_mod(o, m):
    sel_only(o); bpy.ops.object.modifier_apply(modifier=m.name)
def ellipsoid(name, c, r, rot=(0, 0, 0), segs=48, rings=32):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    M = Matrix.LocRotScale(Vector(c), __import__("mathutils").Euler(rot), Vector(r))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free()
    o = bpy.data.objects.new(name, m); scn.collection.objects.link(o); return o

# the weight source: the re-proportioned mannequin, whole
src = body.copy(); src.data = body.data.copy(); src.name = "WeightSrc"; scn.collection.objects.link(src)
src.modifiers.clear(); src.hide_render = True
# the skin's raw parts: the mannequin minus its head ...
bm = bm_of(body); bm.faces.ensure_lookup_table()
NB = bone_head("neck_01")
bmesh.ops.delete(bm, geom=[f for f in bm.faces if f.calc_center_median().z > NB.z + 0.012 and abs(f.calc_center_median().x) < 0.07], context="FACES")
# (the doll's segments are open shells: closed here, or the voxel remesh drops them)
nb0 = sum(1 for e in bm.edges if e.is_boundary)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
tick(f"holes closed: {nb0} open edges -> {sum(1 for e in bm.edges if e.is_boundary)}")
bm.to_mesh(body.data); bm.free()
# ... + the kid's head (sizes from the mannequin's head scaled to the kid: HEAD_TOP is the crown, the face at -Y)
Hh = 0.226                                         # chin to crown (a kid's ~0.21 m, a touch big: stylised)
z0 = HEAD_TOP - Hh
cy = HB.y - 0.012                                  # the skull's centre a little in front of the neck joint (face = -Y)
W = 0.150
NB = bone_head("neck_01")
parts = [
    ellipsoid("cranium", (0, cy + 0.010, z0 + Hh * 0.60), (0.080, 0.091, Hh * 0.42)),
    ellipsoid("face", (0, cy - 0.016, z0 + Hh * 0.37), (0.064, 0.066, Hh * 0.30)),
    ellipsoid("jaw", (0, cy - 0.004, z0 + Hh * 0.24), (0.058, 0.058, Hh * 0.21)),
    ellipsoid("chin", (0, cy - 0.048, z0 + Hh * 0.13), (0.031, 0.021, 0.021)),
    ellipsoid("nose", (0, cy - 0.080, z0 + Hh * 0.385), (0.0095, 0.012, 0.017), rot=(math.radians(-20), 0, 0), segs=24, rings=16),
    ellipsoid("earL", (0.078, cy + 0.008, z0 + Hh * 0.43), (0.009, 0.019, 0.029), rot=(0, math.radians(-12), math.radians(-10)), segs=24, rings=16),
    ellipsoid("earR", (-0.078, cy + 0.008, z0 + Hh * 0.43), (0.009, 0.019, 0.029), rot=(0, math.radians(12), math.radians(10)), segs=24, rings=16),
    # the neck: from the collar up into the jaw (the mannequin's own neck top went with its head)
    ellipsoid("neck", (0, (NB.y + HB.y) / 2 + 0.006, (NB.z + z0 + Hh * 0.25) / 2), (0.043, 0.042, (z0 + Hh * 0.25 - NB.z) / 2 + 0.035), segs=32, rings=16),
]
FACE = {"z0": z0, "Hh": Hh, "W": W, "cy": cy}
tick(f"kid head: chin {z0:.3f} crown {HEAD_TOP:.3f}, centre y {cy:.3f} (neck joint y {HB.y:.3f})")
sel_only(body)
for o in parts: o.select_set(True)
bpy.ops.object.join()
skin = body
rm = skin.modifiers.new("Remesh", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = 0.0025 if not QUICK else 0.006; rm.adaptivity = 0
apply_mod(skin, rm)
tick(f"remeshed: {len(skin.data.polygons)} faces")
def transfer_weights(dst, source):
    dst.vertex_groups.clear()
    for g in source.vertex_groups: dst.vertex_groups.new(name=g.name)
    dt = dst.modifiers.new("DT", "DATA_TRANSFER"); dt.object = source
    dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}; dt.vert_mapping = "POLYINTERP_NEAREST"
    dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
    apply_mod(dst, dt)
    sel_only(dst)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
transfer_weights(skin, src)
# the smoothing mask: everything but the hands (and fingers)
HANDS = [b.name for b in bones if b.name.startswith(("hand", "index", "middle", "ring", "pinky", "thumb"))]
mask = skin.vertex_groups.new(name="_smooth")
gi = {g.index: g.name for g in skin.vertex_groups}
for v in skin.data.vertices:
    hw = sum(g.weight for g in v.groups if gi.get(g.group) in HANDS)
    mask.add([v.index], max(0.0, 1.0 - hw * 1.6), "REPLACE")
sm = skin.modifiers.new("Smooth", "LAPLACIANSMOOTH"); sm.iterations = 12; sm.lambda_factor = 1.2; sm.use_volume_preserve = True
sm.vertex_group = "_smooth"
apply_mod(skin, sm)
sm = skin.modifiers.new("Smooth2", "SMOOTH"); sm.iterations = 6; sm.factor = 0.5; sm.vertex_group = "_smooth"
apply_mod(skin, sm)
dc = skin.modifiers.new("Dec", "DECIMATE"); dc.decimate_type = "COLLAPSE"
dc.ratio = min(1.0, 7400 / max(1, len(skin.data.polygons) * 2)); dc.use_collapse_triangulate = True
apply_mod(skin, dc)
transfer_weights(skin, src)
skin.vertex_groups.remove(skin.vertex_groups["_smooth"]) if skin.vertex_groups.get("_smooth") else None
# the fused skin's weights SMOOTHED: the remesh joined surfaces the doll kept apart (the armpits, the crotch), and the
# nearest-face transfer gave neighbours there weights from different segments (a jump: edges torn x10 in a walk).
# Averaged over the mesh's rings (the hands kept: the fingers' weights are exact), then the 4 largest, normalised.
def smooth_skin_weights(o, iters=10, keep=HANDS):
    me = o.data; nvv = len(me.vertices); ng = len(o.vertex_groups)
    W = np.zeros((nvv, ng))
    for v in me.vertices:
        for g in v.groups: W[v.index, g.group] = g.weight
    names = [g.name for g in o.vertex_groups]
    hand = W[:, [names.index(n) for n in keep if n in names]].sum(axis=1)
    lock = np.clip(hand * 1.5, 0, 1)[:, None]
    A = [[] for _ in range(nvv)]
    for e in me.edges: x, y = e.vertices; A[x].append(y); A[y].append(x)
    idx = np.repeat(np.arange(nvv), [len(a) for a in A]); nb = np.concatenate([np.array(a, dtype=np.int64) for a in A if a] or [np.zeros(0, np.int64)])
    cnt = np.array([max(1, len(a)) for a in A])[:, None]
    for _ in range(iters):
        S = np.zeros_like(W); np.add.at(S, idx, W[nb])
        W = lock * W + (1 - lock) * (0.5 * W + 0.5 * S / cnt)
    top = np.argsort(-W, axis=1)[:, :4]
    W2 = np.zeros_like(W); rows = np.arange(nvv)[:, None]; W2[rows, top] = W[rows, top]
    W2 /= np.maximum(1e-9, W2.sum(axis=1, keepdims=True))
    allv = list(range(nvv))
    for gi_, g in enumerate(o.vertex_groups):
        g.remove(allv)
        nz = np.nonzero(W2[:, gi_] > 1e-3)[0]
        for i in nz: g.add([int(i)], float(W2[i, gi_]), "REPLACE")
smooth_skin_weights(skin)
tick("skin weights smoothed")
for p in skin.data.polygons: p.use_smooth = True
skin.modifiers.clear()
mod = skin.modifiers.new("Armature", "ARMATURE"); mod.object = arm
skin.parent = arm
me = skin.data
tick(f"skin: {len(me.polygons)} tris after the decimate")
# ------------------------------------------------------------------------------------------------ helpers
def bm_of(o):
    bm = bmesh.new(); bm.from_mesh(o.data); return bm

def new_obj(name, bm, slots, weights=None, parent_bone=None):
    m = bpy.data.meshes.new(name); bm.to_mesh(m); bm.free()
    o = bpy.data.objects.new(name, m); scn.collection.objects.link(o)
    for s in slots: m.materials.append(MATS[s])
    o.parent = arm
    if parent_bone:
        g = o.vertex_groups.new(name=parent_bone); g.add(list(range(len(m.vertices))), 1.0, "REPLACE")
    mod = o.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    return o

def copy_weights(dst, src, src_idx_of_dst):
    """dst vertex i gets src vertex src_idx_of_dst[i]'s weights"""
    for g in src.vertex_groups:
        if dst.vertex_groups.get(g.name) is None: dst.vertex_groups.new(name=g.name)
    sgi = {g.index: g.name for g in src.vertex_groups}
    for i, j in enumerate(src_idx_of_dst):
        for g in src.data.vertices[j].groups:
            if g.weight > 1e-4: dst.vertex_groups[sgi[g.group]].add([i], g.weight, "REPLACE")

def nearest_weights(dst, src, rigid=None):
    """weights from the nearest skin vertex (for garments not made from the body's faces)"""
    from mathutils.kdtree import KDTree
    kd = KDTree(len(src.data.vertices))
    for v in src.data.vertices: kd.insert(v.co, v.index)
    kd.balance()
    copy_weights(dst, src, [kd.find(v.co)[1] for v in dst.data.vertices])

def smooth_weights(o, iters=2):
    """averages each vertex's weights with its ring (a garment's offset shell, made smooth across the region)"""
    me = o.data
    nb = [[] for _ in me.vertices]
    for e in me.edges: a, b = e.vertices; nb[a].append(b); nb[b].append(a)
    names = [g.name for g in o.vertex_groups]
    W = np.zeros((len(me.vertices), len(names)))
    for v in me.vertices:
        for g in v.groups: W[v.index, g.group] = g.weight
    for _ in range(iters):
        W2 = W.copy()
        for i, n in enumerate(nb):
            if n: W2[i] = 0.5 * W[i] + 0.5 * W[n].mean(axis=0)
        W = W2
    for gidx, g in enumerate(o.vertex_groups):
        for i in range(len(me.vertices)):
            if W[i, gidx] > 1e-4: g.add([i], float(W[i, gidx]), "REPLACE")
            else: g.remove([i])

body.data.materials.clear()
body.data.materials.append(MATS["skin"])
for p in body.data.polygons: p.material_index = 0
for p in body.data.polygons: p.use_smooth = True
tick("body ready")

# ------------------------------------------------------------------------------------------------ regions
# A face's region from the weights of its vertices and their height along a bone. "along(v, bone)" = 0 at the
# bone's head, 1 at its tail.
WS = vweights(body)
def along(co, n):
    h, t = bone_head(n), bone_tail(n)
    d = t - h
    return (co - h).dot(d) / max(1e-9, d.length_squared)
def wsum(ws, names): return sum(ws.get(n, 0) for n in names)
SPINE = ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01", "clavicle_l", "clavicle_r"]
ARMS = lambda s: [f"upperarm_{s}", f"lowerarm_{s}", f"hand_{s}"]
LEG = lambda s: [f"thigh_{s}", f"calf_{s}"]
FOOT = lambda s: [f"foot_{s}", f"ball_{s}", f"ball_leaf_{s}"]
FINGERS = [b.name for b in bones if any(b.name.startswith(f) for f in ("index", "middle", "ring", "pinky", "thumb"))]

WAIST_Z = bone_head("pelvis").z + 0.055                   # the tee's hem / the shorts' waistband
NECK_Z = bone_head("neck_01").z + 0.004
SLEEVE = 0.44 if OUTFIT["shirt"] == "tee" else 0.98       # along the upper arm (tee) / to the wrist (sweatshirt)
SHORTS = 0.80 if OUTFIT["legs"] == "shorts" else 0.93     # along the thigh / along the calf (jeans)

NECK_AX = bone_head("neck_01")
def neck_r(co): return math.hypot(co.x - NECK_AX.x, (co.y - NECK_AX.y) * 1.15 + 0.012)
def in_shirt(co, ws):
    # a crew neck: everything round the neck's axis within the collar's radius, above the collarbones, is out
    if co.z > NECK_AX.z - 0.035 and neck_r(co) < 0.062: return False
    if co.z > NECK_AX.z + 0.06: return False
    up = 0
    for s in "lr":
        a = wsum(ws, ARMS(s)) + wsum(ws, FINGERS)
        if a > 0.5:
            if OUTFIT["shirt"] == "tee": return ws.get(f"upperarm_{s}", 0) > 0.3 and along(co, f"upperarm_{s}") < SLEEVE and ws.get(f"lowerarm_{s}", 0) < 0.3
            return along(co, f"lowerarm_{s}") < 0.90 and wsum(ws, [f"hand_{s}"] + FINGERS) < 0.3
    if wsum(ws, ["Head"]) > 0.3: return False
    if wsum(ws, LEG("l") + LEG("r")) > 0.4: return False
    return co.z > WAIST_Z - (0.0 if OUTFIT["shirt"] == "tee" else 0.03)
def in_legs(co, ws):
    for s in "lr":
        if wsum(ws, FOOT(s)) > 0.3: return False
        if OUTFIT["legs"] == "shorts":
            if ws.get(f"calf_{s}", 0) > 0.35: return False
            if ws.get(f"thigh_{s}", 0) > 0.2 and along(co, f"thigh_{s}") > SHORTS: return False
        else:
            if ws.get(f"calf_{s}", 0) > 0.3 and along(co, f"calf_{s}") > SHORTS: return False
    if wsum(ws, SPINE[1:] + ARMS("l") + ARMS("r")) > 0.4: return False
    return co.z < WAIST_Z + 0.025
def in_socks(co, ws):
    for s in "lr":
        if ws.get(f"calf_{s}", 0) + wsum(ws, FOOT(s)) > 0.5 and along(co, f"calf_{s}") > 0.66: return True
    return False
def in_shoe(co, ws):
    for s in "lr":
        if wsum(ws, FOOT(s)) > 0.5 or (ws.get(f"calf_{s}", 0) > 0.2 and along(co, f"calf_{s}") > 0.93): return True
    return False

def face_region(o, test):
    """the faces whose CENTRE (with its vertices' mean weights) passes test: the hems were cut along clean lines first
    (cut_hems), so a region's border follows them instead of zig-zagging across the triangles"""
    me = o.data
    WSo = vweights(o)
    faces = []
    for p in me.polygons:
        ws = {}
        for vi in p.vertices:
            for n_, w in WSo[vi].items(): ws[n_] = ws.get(n_, 0) + w / len(p.vertices)
        if test(p.center, ws): faces.append(p.index)
    return set(faces), None

def cut(o, planes):
    """bisects o's mesh by planes [(point, normal, (box min, box max) | None)] (the weights are interpolated)"""
    bm = bm_of(o)
    for co, no, box in planes:
        geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
        if box:
            lo, hi = Vector(box[0]), Vector(box[1])
            keep = [f for f in bm.faces if all(lo[a] <= f.calc_center_median()[a] <= hi[a] for a in range(3))]
            es = {e for f in keep for e in f.edges}; vs = {v for f in keep for v in f.verts}
            geom = list(vs) + list(es) + keep
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no).normalized(), dist=0.0004)
    bmesh.ops.triangulate(bm, faces=[f for f in bm.faces if len(f.verts) > 4])
    bm.to_mesh(o.data); bm.free(); o.data.update()

def relax_border(bm, iters=6):
    """straightens a region's open border (a zig-zag across triangles left by a region test): each border vertex
    toward the mean of its two border neighbours"""
    for _ in range(iters):
        moves = {}
        for v in bm.verts:
            nb = [e.other_vert(v) for e in v.link_edges if e.is_boundary]
            if len(nb) == 2: moves[v] = v.co * 0.5 + (nb[0].co + nb[1].co) * 0.25
        for v, c in moves.items(): v.co = c


def shell(o_src, faces, name, slot, off, off_fn=None, rim_in=0.012, hem_slot=None, src_normals=None, drape=0):
    """the src mesh's faces as a garment: a copy offset out along the vertex normals (off m, or off_fn(co, src_index)),
    every open border turned in toward the skin by rim_in (a hem band: no see-through edge), weights copied"""
    me = o_src.data
    bm = bmesh.new()
    vmap, src_of = {}, []
    for fi in sorted(faces):
        p = me.polygons[fi]
        vs = []
        for vi in p.vertices:
            if vi not in vmap: vmap[vi] = bm.verts.new(me.vertices[vi].co); src_of.append(vi)
            vs.append(vmap[vi])
        try: bm.faces.new(vs).smooth = True
        except ValueError: pass
    bm.verts.ensure_lookup_table()
    relax_border(bm, 4)
    N = src_normals if src_normals is not None else [v.normal.copy() for v in me.vertices]
    want = []
    for v, si in zip(list(bm.verts), src_of):
        d = off_fn(v.co, si) if off_fn else off
        v.co = v.co + N[si] * d; want.append(d)
    if drape:
        # cloth drapes over the doll's muscles instead of shrink-wrapping them: smoothed, then kept at least 60 % of
        # its offset off the skin (no poke-through)
        inner = [v for v in bm.verts if not v.is_boundary]
        for _ in range(drape): bmesh.ops.smooth_vert(bm, verts=inner, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
        sk = BVHTree.FromObject(o_src, bpy.context.evaluated_depsgraph_get())
        for v, d in zip(list(bm.verts), want):
            loc, n, _, dist = sk.find_nearest(v.co)
            if loc is not None and (v.co - loc).dot(n) < 0.6 * d: v.co = loc + n * 0.6 * d
    base = len(src_of)
    # the outer border's loops (ordered), for trims: [(points, source vertex indices)]
    loops, seen = [], set()
    for e in bm.edges:
        if not e.is_boundary or e.index in seen: continue
        chain, v, prev = [], e.verts[0], None
        cur = e
        while True:
            seen.add(cur.index); chain.append(v)
            v = cur.other_vert(v)
            nxt = [x for x in v.link_edges if x.is_boundary and x.index not in seen]
            if not nxt: break
            cur = nxt[0]
        if len(chain) > 5: loops.append(([x.co.copy() for x in chain], [src_of[x.index] for x in chain]))
    if rim_in > 0:
        border = [e for e in bm.edges if e.is_boundary]
        inner = {}
        for e in border:
            for v in e.verts:
                if v.index not in inner:
                    nv = bm.verts.new(v.co - N[src_of[v.index]] * rim_in); inner[v.index] = nv; src_of.append(src_of[v.index])
        bm.verts.ensure_lookup_table()
        for e in border:
            f0 = e.link_faces[0]
            # the edge in its face's loop order: a -> b; the hem face goes b -> a -> a' -> b' (consistent winding)
            lp = next(l for l in f0.loops if l.edge == e)
            a, b = lp.vert, lp.link_loop_next.vert
            try:
                f = bm.faces.new([b, a, inner[a.index], inner[b.index]]); f.smooth = True
                f.material_index = 1 if hem_slot else 0
            except ValueError: pass
    o = new_obj(name, bm, [slot] + ([hem_slot] if hem_slot else []))
    copy_weights(o, o_src, src_of)
    o["loops"] = len(loops); SHELL_LOOPS[name] = loops
    return o
SHELL_LOOPS = {}

def trim(name, o_src, loops, r, slot, keep=lambda c: True, out=0.002, flat=0.55):
    """a ribbed band (collar, cuff, waistband) along a garment's border loops: a closed tube, flattened against the
    body, its weights from the skin under it"""
    bm = bmesh.new(); src = []
    for pts, sidx in loops:
        c = sum(pts, Vector()) / len(pts)
        if not keep(c): continue
        if len(pts) > 24: pts, sidx = pts[::2], sidx[::2]                 # (every other border point: enough for a band)
        n = len(pts); rings = []
        for i in range(n):
            p, a_, b_ = pts[i], pts[i - 1], pts[(i + 1) % n]
            t = (b_ - a_).normalized()
            nrm = o_src.data.vertices[sidx[i]].normal
            sd = t.cross(nrm).normalized()
            q = p + nrm * out
            ring = [bm.verts.new(q + nrm * r * flat * math.sin(a) + sd * r * math.cos(a)) for a in [kk * 2 * math.pi / 5 for kk in range(5)]]
            src += [sidx[i]] * 5; rings.append(ring)
        for i in range(n):
            r0, r1 = rings[i], rings[(i + 1) % n]
            for kk in range(5):
                try: bm.faces.new([r0[kk], r0[(kk + 1) % 5], r1[(kk + 1) % 5], r1[kk]]).smooth = True
                except ValueError: pass
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(name, bm, [slot]); copy_weights(o, o_src, src); return o

def delete_covered(o, faces, keep_ring=True):
    """deletes the body's faces under a garment, keeping the ones on its border (under the hem)"""
    me = o.data
    inF = np.zeros(len(me.polygons), bool); inF[list(faces)] = True
    outside_v = set()
    for p in me.polygons:
        if not inF[p.index]: outside_v.update(p.vertices)
    bm = bm_of(o); bm.faces.ensure_lookup_table()
    kill = [bm.faces[i] for i in faces if not (keep_ring and any(v in outside_v for v in me.polygons[i].vertices))]
    # (two rings kept: the hem's inner edge sits on the skin a ring further in)
    ring2 = set()
    for p in me.polygons:
        if inF[p.index] and any(v in outside_v for v in p.vertices): ring2.update(p.vertices)
    kill = [f for f in kill if not any(v.index in ring2 for v in f.verts)]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bm.to_mesh(me); bm.free()
    return len(kill)

def preview(path, views, res=(900, 1100), lens=50, samples=24, target=None):
    """quick Cycles previews (OPTIX): a sun, a sky, a ground; views = [(name, azimuth deg, elevation deg, dist)]"""
    scn.render.engine = "CYCLES"; scn.cycles.samples = samples; scn.cycles.use_denoising = True
    gpu_setup()
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    if not bpy.data.objects.get("PrevSun"):
        sun = bpy.data.lights.new("PrevSun", "SUN"); sun.energy = 3.2; sun.angle = math.radians(3)
        so = bpy.data.objects.new("PrevSun", sun); scn.collection.objects.link(so)
        so.rotation_euler = (math.radians(52), 0, math.radians(-35))
        scn.world.use_nodes = True
        bg = scn.world.node_tree.nodes.get("Background")
        sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky"); scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0])
        bg.inputs[1].default_value = 0.22
        gm = bpy.data.materials.new("prev_ground"); gm.use_nodes = True
        gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.32, 0.3, 0.27, 1)
        bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.0)); g = bpy.context.active_object; g.name = "PrevGround"; g.data.materials.append(gm)
        cam = bpy.data.objects.new("PrevCam", bpy.data.cameras.new("PrevCam")); scn.collection.objects.link(cam); scn.camera = cam
        scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -0.6
    cam = bpy.data.objects["PrevCam"]
    tgt = Vector(target or (0, 0, HEIGHT * 0.52))
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 90
    outs = []
    for name, az, el, dist in views:
        a, e = math.radians(az), math.radians(el)
        # azimuth 0 = in front (the kid faces -Y)
        cam.location = tgt + Vector((math.sin(a) * math.cos(e), -math.cos(a) * math.cos(e), math.sin(e))) * dist
        cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam.data.lens = lens
        f = path.replace("{v}", name); scn.render.filepath = f
        bpy.ops.render.render(write_still=True); outs.append(f)
    tick(f"rendered {len(outs)} previews -> {os.path.dirname(path)}")
    return outs

def gpu_setup():
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "OPTIX"; pr.get_devices()
        on = [d for d in pr.devices if d.type == "OPTIX"]
        for d in pr.devices: d.use = d.type == "OPTIX"
        scn.cycles.device = "GPU" if on else "CPU"
        if not getattr(gpu_setup, "said", False): tick(f"Cycles device: {scn.cycles.device} ({[d.name for d in on]})"); gpu_setup.said = True
    except Exception as e:
        scn.cycles.device = "CPU"; tick(f"Cycles device: CPU ({e})")

STAGE = arg("--stage", "all")
SCRATCH = arg("--scratch", os.path.join(ROOT, ".kid_tmp"))
if STAGE == "body":
    os.makedirs(SCRATCH, exist_ok=True)
    preview(os.path.join(SCRATCH, "body_{v}.jpg"), [("front", 0, 8, 3.2), ("side", 90, 8, 3.2)], res=(700, 900))
    preview(os.path.join(SCRATCH, "body_{v}.jpg"), [("face", 0, 3, 0.55), ("face34", 35, 5, 0.55), ("profile", 90, 0, 0.55)], res=(600, 600), target=(0, FACE["cy"], FACE["z0"] + FACE["Hh"] * 0.5))
    sys.exit(0)

# ------------------------------------------------------------------------------------------------ 4. the clothes
smooth01 = lambda x: 0.0 if x <= 0 else 1.0 if x >= 1 else x * x * (3 - 2 * x)
NRM = [v.normal.copy() for v in body.data.vertices]
FLOOR = min(v.co.z for v in body.data.vertices)
WS = vweights(body)
covered = set()
def side_of(c): return "l" if c.x > 0 else "r"

# the hems cut as clean lines into the skin first (planes across the bones: tee hem, sleeves, collar, shorts, socks,
# shoe collar)
def across(n, t, box=None):
    h, tl = bone_head(n), bone_tail(n)
    return (h + (tl - h) * t, (tl - h), box)
P_ = []
P_.append(((0, 0, WAIST_Z), (0, 0, 1), ((-0.3, -0.3, WAIST_Z - 0.2), (0.3, 0.3, WAIST_Z + 0.2))))
for s_ in "lr":
    if OUTFIT["shirt"] == "tee": P_.append(across(f"upperarm_{s_}", SLEEVE)); P_.append(across(f"upperarm_{s_}", SLEEVE - 0.035))
    else: P_.append(across(f"lowerarm_{s_}", 0.90)); P_.append(across(f"lowerarm_{s_}", 0.82))
    if OUTFIT["legs"] == "shorts": P_.append(across(f"thigh_{s_}", SHORTS))
    else: P_.append(across(f"calf_{s_}", SHORTS))
    for t_ in (0.66, 0.715, 0.735, 0.75, 0.77, 0.93): P_.append(across(f"calf_{s_}", t_))
cut(body, P_)
tick(f"hems cut: {len(body.data.polygons)} faces")
NRM = [v.normal.copy() for v in body.data.vertices]
WS = vweights(body)

# the tee (a 90s RINGER: contrasting collar and cuffs) / the sweatshirt (ribbed cuffs and waistband)
F_shirt, _ = face_region(body, in_shirt)
def shirt_off(co, i):
    ws = WS[i]
    hem = 1 - smooth01((co.z - WAIST_Z) / 0.12)                       # looser toward the hem
    sl = 0
    for s in "lr":
        if ws.get(f"upperarm_{s}", 0) > 0.3: sl = max(sl, smooth01((along(co, f"upperarm_{s}") - 0.1) / 0.3))
    return 0.0085 + 0.007 * hem + 0.006 * sl + 0.0015 * noise.noise(co * 18)
shirt = shell(body, F_shirt, "shirt", "shirt", 0, off_fn=shirt_off, rim_in=0.013, hem_slot="shirt_trim", drape=6)
# the collar and the cuffs (+ the sweatshirt's waistband): ribbed bands along the garment's borders
trims = [trim("collar", body, SHELL_LOOPS["shirt"], 0.0075, "shirt_trim", keep=lambda c: c.z > WAIST_Z + 0.2 and abs(c.x) < 0.12, out=0.0),
         trim("cuffs", body, SHELL_LOOPS["shirt"], 0.0062, "shirt_trim", keep=lambda c: abs(c.x) > 0.12, out=0.0)]
if OUTFIT["shirt"] != "tee": trims.append(trim("waistband", body, SHELL_LOOPS["shirt"], 0.008, "shirt_trim", keep=lambda c: c.z < WAIST_Z + 0.1, out=0.0))
covered |= F_shirt

# the shorts (long, baggy: the early 90s) / jeans
F_legs, _ = face_region(body, in_legs)
def legs_off(co, i):
    ws = WS[i]
    t = 0
    for s in "lr":
        if ws.get(f"thigh_{s}", 0) > 0.2: t = max(t, along(co, f"thigh_{s}"))
        if ws.get(f"calf_{s}", 0) > 0.2: t = max(t, 1 + along(co, f"calf_{s}"))
    return 0.010 + 0.012 * smooth01(t / SHORTS if OUTFIT["legs"] == "shorts" else t / 1.9) + 0.0012 * noise.noise(co * 16)
shorts = shell(body, F_legs, "shorts", "shorts", 0, off_fn=legs_off, rim_in=0.016, drape=4)
trims.append(trim("shorts_hem", body, SHELL_LOOPS["shorts"], 0.0055, "shorts", keep=lambda c: c.z < WAIST_Z - 0.1, out=0.0, flat=0.5))
covered |= F_legs

# the socks (white tube socks, two red stripes) and the sneakers
F_shoe, _ = face_region(body, in_shoe)
F_sock, _ = face_region(body, in_socks)
F_sock -= F_shoe
socks = shell(body, F_sock, "socks", "socks", 0.0028, rim_in=0.006, hem_slot="sock_stripe")
for p in socks.data.polygons:
    c = p.center
    a = along(c, f"calf_{side_of(c)}")
    p.material_index = 1 if (0.715 < a < 0.735 or 0.75 < a < 0.77) else 0
covered |= F_sock

def shoe_off(co, i):
    ws = WS[i]
    toe = max(ws.get("ball_l", 0) + ws.get("ball_leaf_l", 0), ws.get("ball_r", 0) + ws.get("ball_leaf_r", 0))
    return 0.011 + 0.007 * toe + 0.004 * smooth01((0.06 - (co.z - FLOOR)) / 0.06)
shoes = shell(body, F_shoe, "shoes", "shoe", 0, off_fn=shoe_off, rim_in=0.010)
SOLE = 0.026
for v in shoes.data.vertices:                                      # a flat, thick sole under the foot
    h = v.co.z - FLOOR
    if h < 0.035:
        k_ = smooth01((0.035 - h) / 0.035)
        v.co.z = v.co.z + ((FLOOR - 0.012) - v.co.z) * k_
for m in ("sole", "shoe_accent", "lace"): shoes.data.materials.append(MATS[m])
shoes.data.update()
cut(shoes, [((0, 0, FLOOR + SOLE - 0.010), (0, 0, 1), None), ((0, 0, FLOOR + 0.024), (0, 0, 1), None), ((0, 0, FLOOR + 0.050), (0, 0, 1), None)])
for p in shoes.data.polygons:
    c = p.center; h = c.z - FLOOR; s = side_of(c)
    fx = bone_head(f"foot_{s}").x
    if h < SOLE - 0.010: p.material_index = 1                                                      # the sole + foxing
    elif 0.024 < h < 0.050 and abs(c.x - fx) > 0.026 and p.normal.z < 0.5: p.material_index = 2    # the side stripe
    elif p.normal.z > 0.45 and abs(c.x - fx) < 0.02 and 0.15 < along(c, f"foot_{s}") < 1.2 and h > 0.05: p.material_index = 3   # laces
covered |= F_shoe
n_del = delete_covered(body, covered)
tick(f"clothes: shirt {len(shirt.data.polygons)}, shorts {len(shorts.data.polygons)}, socks {len(socks.data.polygons)}, shoes {len(shoes.data.polygons)} faces; {n_del} skin faces under them deleted")

# ------------------------------------------------------------------------------------------------ 5. hair, cap, face
skin_bvh = BVHTree.FromBMesh(bm_of(body))
z0, Hh, cy = FACE["z0"], FACE["Hh"], FACE["cy"]
def hu(co): return (co.z - z0) / Hh
def hang(co): return math.atan2(co.x, -(co.y - cy))                    # 0 = the face, +-pi = the back
def rigid_head(o):
    o.vertex_groups.clear()
    g = o.vertex_groups.new(name="Head"); g.add(list(range(len(o.data.vertices))), 1.0, "REPLACE")

WS = vweights(body)
NRM = [v.normal.copy() for v in body.data.vertices]
def hairline(co):
    return 0.32 + 0.40 * math.cos(hang(co) / 2) ** 2
def in_hair(co, ws):
    if ws.get("Head", 0) + ws.get("neck_01", 0) < 0.5: return False
    u = hu(co)
    if abs(co.x) > 0.062 and 0.30 < u < 0.56 and abs(co.y - cy - 0.008) < 0.03: return False   # (the ears)
    return u > hairline(co)
F_hair, _ = face_region(body, in_hair)
def hair_off(co, i):
    u = hu(co)
    clump = noise.noise(Vector((co.x * 34, co.y * 34, co.z * 12)))      # long clumps running down the head
    lift = 0.010 * smooth01((u - 0.55) / 0.4) if OUTFIT["cap"] == "0" else 0.0
    return 0.007 + lift + 0.0035 * clump
hair = shell(body, F_hair, "hair", "hair", 0, off_fn=hair_off, rim_in=0.010, src_normals=NRM)
rigid_head(hair)

def surf(p, out=0.0):
    """the skin's closest point to p and its normal, pushed out"""
    loc, n, _, _ = skin_bvh.find_nearest(Vector(p))
    return loc + n * out, n
def ribbon(name, pts, widths, thick, slot):
    """a tapered lock / strip along pts, widths per point, thick: a flat closed tube lying on the skin"""
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        q = Vector(p)
        t = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        _, n = surf(q)
        sd = t.cross(n).normalized()
        w, th = widths[i], thick * (1 - 0.6 * i / max(1, len(pts) - 1))
        rings.append([bm.verts.new(q + sd * w * math.cos(a) + n * th * math.sin(a)) for a in [kk * 2 * math.pi / 6 for kk in range(6)]])
    for r0, r1 in zip(rings, rings[1:]):
        for kk in range(6):
            bm.faces.new([r0[kk], r0[(kk + 1) % 6], r1[(kk + 1) % 6], r1[kk]]).smooth = True
    bm.faces.new(rings[0][::-1]).smooth = True; bm.faces.new(rings[-1]).smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(name, bm, [slot]); rigid_head(o); return o

# the fringe: locks from the hairline down over the forehead (parted a little off centre)
locks = []
for i, x in enumerate(np.linspace(-0.058, 0.058, 9)):
    dirx = -1 if x < 0.012 else 1
    pts = [surf((x, cy - 0.09, z0 + Hh * 0.80), 0.006)[0]]
    for kk in range(1, 5):
        t = kk / 4
        pts.append(surf((x + dirx * 0.012 * t, cy - 0.12, z0 + Hh * (0.80 - 0.19 * t - 0.03 * abs(x) / 0.058 * t)), 0.009 - 0.005 * t)[0])
    locks.append(ribbon(f"lock{i}", pts, [0.010, 0.010, 0.009, 0.006, 0.0015], 0.006, "hair"))
for s in (1, -1):                                                   # sideburn tufts
    pts = [surf((s * 0.07, cy - 0.03, z0 + Hh * 0.62), 0.010)[0], surf((s * 0.072, cy - 0.035, z0 + Hh * 0.50), 0.006)[0], surf((s * 0.07, cy - 0.037, z0 + Hh * 0.42), 0.003)[0]]
    locks.append(ribbon(f"side{s}", pts, [0.010, 0.008, 0.002], 0.005, "hair"))
for i, x in enumerate(np.linspace(-0.045, 0.045, 5)):               # the nape
    pts = [surf((x, cy + 0.09, z0 + Hh * 0.42), 0.012)[0], surf((x * 1.05, cy + 0.08, z0 + Hh * 0.30), 0.008)[0], surf((x * 1.1, cy + 0.06, z0 + Hh * 0.22), 0.004)[0]]
    locks.append(ribbon(f"nape{i}", pts, [0.012, 0.011, 0.003], 0.006, "hair"))

# the cap (a plain 6-panel baseball cap, no logo): a dome over the crown, a curved brim, the top button
caps = []
if OUTFIT["cap"] != "0":
    back = OUTFIT["cap"] == "back"
    def in_cap(co, ws):
        if ws.get("Head", 0) < 0.5: return False
        u = hu(co); a = abs(hang(co))
        return u > 0.64 + 0.04 * math.cos(a) ** 2 - (0.05 if a > 2.4 else 0)
    F_cap, _ = face_region(body, in_cap)
    cap = shell(body, F_cap, "cap", "cap", 0, off_fn=lambda co, i: 0.016 + 0.001 * smooth01((hu(co) - 0.7) / 0.3), rim_in=0.012, src_normals=NRM)
    rigid_head(cap)
    bm = bmesh.new()
    sgn = 1 if back else -1
    rows = []
    for j in range(5):
        r = j / 4
        row = []
        for i in range(13):
            a = (i / 12 - 0.5) * math.radians(116)
            base = surf((math.sin(a) * 0.075, cy + sgn * math.cos(a) * 0.09, z0 + Hh * 0.70), 0.018)[0]
            outw = Vector((math.sin(a) * 0.25, sgn * 1.0, 0)).normalized()
            row.append(base + outw * (0.070 * r * (0.2 + 0.8 * math.cos(a) ** 1.5)) + Vector((0, 0, -0.010 * r * r - 0.006 * r - 0.006 * (1 - math.cos(a)) * r)))
        rows.append(row)
    TH = 0.005
    top = [[bm.verts.new(p + Vector((0, 0, TH / 2))) for p in row] for row in rows]
    bot = [[bm.verts.new(p - Vector((0, 0, TH / 2))) for p in row] for row in rows]
    for j in range(4):
        for i in range(12):
            bm.faces.new([top[j][i], top[j + 1][i], top[j + 1][i + 1], top[j][i + 1]])
            bm.faces.new([bot[j][i], bot[j][i + 1], bot[j + 1][i + 1], bot[j + 1][i]])
    for i in range(12):
        bm.faces.new([top[4][i], top[4][i + 1], bot[4][i + 1], bot[4][i]])
        bm.faces.new([top[0][i], top[0][i + 1], bot[0][i + 1], bot[0][i]])
    for j in range(4):
        bm.faces.new([top[j][0], bot[j][0], bot[j + 1][0], top[j + 1][0]]); bm.faces.new([top[j][12], top[j + 1][12], bot[j + 1][12], bot[j][12]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    brim = new_obj("cap_brim", bm, ["cap_brim"]); rigid_head(brim)
    b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=10, v_segments=6, radius=0.006)
    bmesh.ops.translate(b2, verts=b2.verts, vec=surf((0, cy + 0.01, HEAD_TOP + 0.05), 0.0185)[0])
    for f in b2.faces: f.smooth = True
    button = new_obj("cap_button", b2, ["cap"]); rigid_head(button)
    caps = [cap, brim, button]
    # (the hair under the cap's dome is never seen: dropped)
    bm = bm_of(hair)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(hu(v.co) > 0.80 for v in f.verts)], context="FACES")
    bm.to_mesh(hair.data); bm.free()

# the face: eyes (white, iris, pupil, a highlight), brows, the mouth (a small smile) - readable at 3 m
def ray_front(x, z):
    hit = skin_bvh.ray_cast(Vector((x, cy - 0.4, z)), Vector((0, 1, 0)))
    return hit[0], hit[1]
def disc(bm, c, n, r, segs=16, up=Vector((0, 0, 1))):
    sd = up.cross(n).normalized(); up2 = n.cross(sd).normalized()
    ring = [bm.verts.new(c + (sd * math.cos(a) + up2 * math.sin(a)) * r) for a in [kk * 2 * math.pi / segs for kk in range(segs)]]
    ctr = bm.verts.new(c + n * r * 0.08)
    for kk in range(segs): bm.faces.new([ctr, ring[kk], ring[(kk + 1) % segs]]).smooth = True
features = []
EYE_Z, EYE_X = z0 + Hh * 0.47, 0.029
for s in (1, -1):
    p, n = ray_front(s * EYE_X, EYE_Z)
    n = (n + Vector((0, -1, 0)) * 1.5).normalized()               # (looking ahead, not along the cheek's slant)
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
    M = Matrix.Translation(p - n * 0.0018) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((0.0150, 0.0128, 0.0068, 1))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    for f in bm.faces: f.smooth = True
    white = new_obj(f"eye_white{s}", bm, ["eye_white"]); rigid_head(white); features.append(white)
    front = p - n * 0.0018 + n * 0.0068
    look = Vector((-s * 0.0012, 0, 0))
    bm = bmesh.new(); disc(bm, front + n * 0.0003 + look, n, 0.0092)
    iris = new_obj(f"iris{s}", bm, ["iris"]); rigid_head(iris); features.append(iris)
    bm = bmesh.new(); disc(bm, front + n * 0.0006 + look, n, 0.0047)
    disc(bm, front + n * 0.0009 + look + Vector((0.0032, 0, 0.0033)), n, 0.0016, segs=8)
    pup = new_obj(f"pupil{s}", bm, ["pupil", "eye_white"]); rigid_head(pup); features.append(pup)
    for poly in pup.data.polygons: poly.material_index = 1 if poly.index >= 16 else 0
    pts = []                                                        # the brow: an arch over the eye
    for t in np.linspace(-1, 1, 6):
        q, _ = ray_front(s * (EYE_X + t * 0.017), EYE_Z + 0.022 + 0.004 * (1 - t * t) - 0.002 * t)
        if q: pts.append(q + Vector((0, -0.0028, 0)))
    features.append(ribbon(f"brow{s}", pts, [0.0035, 0.0042, 0.0042, 0.0040, 0.0034, 0.0022][:len(pts)], 0.0022, "brow"))
pts = []
for t in np.linspace(-1, 1, 7):
    q, _ = ray_front(t * 0.016, z0 + Hh * 0.255 + 0.0035 * t * t)
    if q: pts.append(q + Vector((0, -0.0012, 0)))
features.append(ribbon("mouth", pts, [0.0012, 0.0019, 0.0022, 0.0023, 0.0022, 0.0019, 0.0012][:len(pts)], 0.0012, "mouth"))
tick(f"hair {len(hair.data.polygons)} faces + {len(locks)} locks, cap {'on' if caps else 'off'}, face {len(features)} parts")

# ------------------------------------------------------------------------------------------------ 6. one mesh, AO, LODs
parts_all = [body, shirt, shorts, socks, shoes, hair] + trims + locks + features + caps
for o in parts_all: o.modifiers.clear()
sel_only(body)
for o in parts_all: o.select_set(True)
bpy.ops.object.join()
kid = body; kid.name = "kid_LOD0"
names, remap = [], []
for m in kid.data.materials:                                       # one slot per name
    if m.name not in names: names.append(m.name)
    remap.append(names.index(m.name))
idx = [remap[p.material_index] for p in kid.data.polygons]
kid.data.materials.clear()
for n in names: kid.data.materials.append(MATS[n])
kid.data.polygons.foreach_set("material_index", idx)
sel_only(kid)
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode="OBJECT")
mod = kid.modifiers.new("Armature", "ARMATURE"); mod.object = arm
TRIS0 = len(kid.data.polygons)
tick(f"LOD0: {TRIS0} tris, {len(kid.data.vertices)} verts, slots {names}")

def bake_ao(o, samples=64, dist=0.18):
    scn.render.engine = "CYCLES"; gpu_setup(); scn.cycles.samples = samples
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = dist
    ca = o.data.color_attributes.new("AO", "BYTE_COLOR", "POINT")
    o.data.color_attributes.active_color = ca
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, FLOOR - 0.012)); g = bpy.context.active_object
    sel_only(o)
    scn.render.bake.target = "VERTEX_COLORS"
    t = time.time(); bpy.ops.object.bake(type="AO"); tick(f"AO baked per vertex ({time.time() - t:.1f}s)")
    bpy.data.objects.remove(g)
    d = np.zeros(len(o.data.vertices) * 4); ca.data.foreach_get("color", d); d = d.reshape(-1, 4)
    d[:, :3] = 0.35 + 0.65 * d[:, :3]; ca.data.foreach_set("color", d.ravel())       # (soft: the painted look stays light)
bake_ao(kid, samples=16 if QUICK else 64)

lods = [kid]
for i, target in ((1, 5000), (2, 1600)):
    o = kid.copy(); o.data = kid.data.copy(); o.name = f"kid_LOD{i}"; scn.collection.objects.link(o)
    o.modifiers.clear()
    dc = o.modifiers.new("Dec", "DECIMATE"); dc.decimate_type = "COLLAPSE"; dc.ratio = target / TRIS0; dc.use_collapse_triangulate = True
    apply_mod(o, dc)
    mod = o.modifiers.new("Armature", "ARMATURE"); mod.object = arm
    lods.append(o)
    tick(f"LOD{i}: {len(o.data.polygons)} tris")

# ------------------------------------------------------------------------------------------------ 7. export
for o in list(scn.objects):
    if o.type == "MESH" and o not in lods: bpy.data.objects.remove(o)
for o in lods: o.parent = arm; o.matrix_parent_inverse = Matrix.Identity(4)
os.makedirs(OUT, exist_ok=True)
glb = os.path.join(OUT, "kid_src.glb")
for x in scn.objects: x.select_set(False)
arm.select_set(True)
for o in lods: o.select_set(True)
bpy.context.view_layer.objects.active = arm
arm.animation_data_clear() if arm.animation_data else None
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=False,
    export_texcoords=False, export_normals=True, export_materials="EXPORT", export_image_format="NONE", export_skins=True,
    export_animations=False, export_vertex_color="NAME", export_vertex_color_name="AO", export_all_vertex_colors=False,
    export_extras=False, export_def_bones=False)
tick(f"exported {glb} ({os.path.getsize(glb) // 1024} KB)")
G = lambda p: [round(p.x, 6), round(p.z, 6), round(-p.y, 6)]      # Blender Z-up -> glTF Y-up
rig = {"source": "UAL1_Standard.glb (Quaternius, CC0) re-proportioned by tools/characters/kid.py", "height": round(HEIGHT + 0.012, 4),
       "pelvisScale": round(k, 5), "joints": {b.name: G(b.head_local) for b in arm.data.bones}, "outfit": OUTFIT,
       "tris": [len(o.data.polygons) for o in lods], "slots": names, "prop": {a: list(b) for a, b in PROP.items()},
       "face": {"eyeZ": round(EYE_Z, 4), "chin": round(z0, 4), "crown": round(HEAD_TOP, 4)}, "sole": 0.012}
json.dump(rig, open(os.path.join(OUT, "kid_rig.json"), "w"), indent=1)
tick(f"wrote kid_rig.json: k {k:.4f}, tris {rig['tris']}")

# ------------------------------------------------------------------------------------------------ 8. renders (docs/kid/)
if not RENDERS: sys.exit(0)
os.makedirs(DOCS, exist_ok=True)
for o in lods[1:]: o.hide_render = True
def fcurves(act):
    try: return [fc for l in act.layers for st in l.strips for cb in st.channelbags for fc in cb.fcurves]
    except AttributeError: return list(act.fcurves)
for act in bpy.data.actions:                                       # the pelvis translation x k (as kidBuild.mjs)
    for fc in fcurves(act):
        if fc.data_path == 'pose.bones["pelvis"].location':
            for kp in fc.keyframe_points:
                kp.co.y *= k; kp.handle_left.y *= k; kp.handle_right.y *= k
def pose(clip, t):
    act = bpy.data.actions.get(clip)
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    try: ad.action_slot = act.slots[0]
    except Exception: pass
    f0, f1 = act.frame_range
    scn.frame_set(int(round(f0 + (f1 - f0) * t)))
W_ = (900, 1200)
pose("Idle_Loop", 0.0)
preview(os.path.join(DOCS, "turn_{v}.jpg"), [("front", 0, 6, 3.0), ("q34", 40, 8, 3.0), ("side", 90, 6, 3.0), ("back", 180, 8, 3.0)], res=W_, lens=55, samples=48)
for clip, t, nm in [("Walk_Loop", 0.25, "walk"), ("Jog_Fwd_Loop", 0.3, "run"), ("Jump_Loop", 0.5, "jump"), ("Crouch_Idle_Loop", 0.2, "crouch"), ("Sitting_Idle_Loop", 0.3, "sit")]:
    stool = None
    if nm == "sit":
        bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0.16, 0.18)); stool = bpy.context.active_object; stool.scale = (0.4, 0.34, 0.36)
        stool.data.materials.append(MATS["shorts"])
    pose(clip, t)
    preview(os.path.join(DOCS, "pose_{v}.jpg"), [(nm, 35, 8, 3.0)], res=W_, lens=55, samples=40)
    if stool: bpy.data.objects.remove(stool)
pose("Idle_Loop", 0.0)
scn.frame_set(scn.frame_current)
HC_ = (0, FACE["cy"], EYE_Z - 0.01)
preview(os.path.join(DOCS, "face_{v}.jpg"), [("front", 0, -4, 0.62), ("q34", 30, -2, 0.62)], res=(800, 800), lens=60, samples=64, target=HC_)
preview(os.path.join(DOCS, "face_{v}.jpg"), [("3m", 15, 3, 3.0)], res=(800, 800), lens=50, samples=48, target=HC_)
tick("renders done")
