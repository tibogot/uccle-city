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
# (length along the bone, girth across it) per bone; the UAL mannequin is a 1.83 m adult. A stylised kid of 11-12
# (round 2, after the review "a short adult athlete"): ~1.45 m, a BIG head (1/5.6 of the height: built below), narrow
# shoulders (short clavicles), slim soft limbs (thin girths + demuscle()), a straight flat torso, small hands and feet,
# a longer neck. The pelvis height then sets k (the clips' pelvis translation x k).
PROP = {
    "pelvis": (0.70, 0.84), "spine_01": (0.72, 0.74), "spine_02": (0.72, 0.72), "spine_03": (0.72, 0.68),
    "neck_01": (0.66, 0.66), "Head": (1.0, 1.0),
    "clavicle": (0.50, 0.66), "upperarm": (0.78, 0.64), "lowerarm": (0.76, 0.64), "hand": (0.72, 0.72),
    "finger": (0.72, 0.72),
    "thigh": (0.79, 0.70), "calf": (0.80, 0.66), "foot": (0.72, 0.74), "ball": (0.72, 0.74),
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
KP = (P0.z - floor) / P0.z
shift = Vector((0, P0.y * (KP - 1), -floor))           # = (k - 1) * pelvis rest, with z exactly to the floor
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
tick(f"re-proportioned: height {HEIGHT:.3f} m, pelvis k {KP:.4f}, pelvis {newHead['pelvis'].z:.3f} m")

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


# KID SHAPES (round 2: the coordinator's review "a short adult athlete"): the doll's muscles out. Every limb a smooth
# tube (each vertex's distance from its bone pulled to the median of its slice, the medians smoothed along the bone:
# no biceps, no calves, no knees bulging), the torso a straight soft ellipse per height (no pecs, no abs, no lats, no
# waist pinch), a flat chest. Done on the mannequin before anything is built from it (the weights come from this shape).
def demuscle():
    me_ = body.data
    WSb = vweights(body)
    co = np.array([v.co[:] for v in me_.vertices])
    new = co.copy()
    def slices(t, r, nb=14, lo=-0.12, hi=1.12):
        b = np.clip(((t - lo) / (hi - lo) * nb).astype(int), 0, nb - 1)
        med = np.array([np.median(r[b == k]) if np.any(b == k) else np.nan for k in range(nb)])
        ok = ~np.isnan(med)
        xs = lo + (np.arange(nb) + 0.5) / nb * (hi - lo)
        med = np.interp(xs, xs[ok], med[ok])
        for _ in range(3): med = np.convolve(np.pad(med, 1, mode="edge"), [0.25, 0.5, 0.25], "valid")
        return np.interp(t, xs, med)
    for s_ in "lr":
        for bn, k_ in ((f"upperarm_{s_}", 0.85), (f"lowerarm_{s_}", 0.75), (f"thigh_{s_}", 0.8), (f"calf_{s_}", 0.8)):
            h = np.array(bone_head(bn)[:]); d = np.array(bone_tail(bn)[:]) - h; L2 = d.dot(d)
            idx = np.array([i for i, ws in enumerate(WSb) if ws.get(bn, 0) > 0.5])
            if not len(idx): continue
            P = co[idx]; tt = (P - h) @ d / L2; ax = h + np.outer(tt, d); rv = P - ax; r = np.linalg.norm(rv, axis=1)
            tgt = slices(tt, r)
            nr = r + (tgt - r) * k_
            new[idx] = ax + rv / np.maximum(r, 1e-9)[:, None] * nr[:, None]
    # the torso
    zlo, zhi = bone_head("pelvis").z + 0.03, bone_head("upperarm_l").z - 0.015
    sp_ = lambda ws: sum(ws.get(n, 0) for n in ("spine_01", "spine_02", "spine_03", "pelvis"))
    cl_ = lambda ws: ws.get("clavicle_l", 0) + ws.get("clavicle_r", 0) + ws.get("upperarm_l", 0) + ws.get("upperarm_r", 0) + ws.get("neck_01", 0)
    idx = np.array([i for i, ws in enumerate(WSb) if sp_(ws) > 0.3 and zlo < co[i][2] < zhi])
    # (how much each vertex follows the torso's shape: full deep in the torso, fading out toward the shoulders and the
    # neck: a hard cut there left a ledge on the upper back)
    soft = np.array([np.clip((sp_(WSb[i]) - 0.3) / 0.4, 0, 1) * np.clip(1 - cl_(WSb[i]) / 0.6, 0, 1) for i in idx]) if len(idx) else None
    if len(idx):
        P = co[idx]; z = P[:, 2]; tz = (z - zlo) / (zhi - zlo)
        yc = slices(tz, P[:, 1], lo=0, hi=1)
        ax_ = np.abs(P[:, 0]); front = P[:, 1] < yc
        def pct(v, sel, q):
            out = np.zeros(len(v)); b = np.clip((tz * 8).astype(int), 0, 7)
            vals = np.array([np.percentile(v[sel & (b == k)], q) if np.any(sel & (b == k)) else np.nan for k in range(8)])
            ok = ~np.isnan(vals); xs = (np.arange(8) + 0.5) / 8; vals = np.interp(xs, xs[ok], vals[ok])
            vals = 0.5 * vals + 0.5 * vals.mean()                      # straight: half way to one width all the way up
            return np.interp(tz, xs, vals)
        allsel = np.ones(len(P), bool)
        rx = pct(ax_, allsel, 92)
        ryf = pct(yc - P[:, 1], front, 92) * (1 - 0.10 * np.clip((tz - 0.45) / 0.4, 0, 1))   # a flat chest
        ryb = pct(P[:, 1] - yc, ~front, 92)
        ry = np.where(front, ryf, ryb)
        ux, uy = P[:, 0] / rx, (P[:, 1] - yc) / ry
        rho = np.maximum(np.hypot(ux, uy), 1e-6)
        k_ = 0.7 * np.clip(np.minimum(tz, 1 - tz) / 0.20, 0, 1) * soft     # (eased at both ends and toward the shoulders: no step)
        f = 1 + (1 / rho - 1) * k_
        new[idx, 0] = P[:, 0] * f; new[idx, 1] = yc + (P[:, 1] - yc) * f
    for i, v in enumerate(me_.vertices): v.co = new[i]
    me_.update()
    tick(f"de-muscled: limbs as tubes, the torso straight and flat ({len(idx)} torso verts)")
demuscle()

# the weight source: the re-proportioned mannequin, whole
src = body.copy(); src.data = body.data.copy(); src.name = "WeightSrc"; scn.collection.objects.link(src)
src.modifiers.clear(); src.hide_render = True
# the skin's raw parts: the mannequin minus its head and neck top ...
bm = bm_of(body); bm.faces.ensure_lookup_table()
NB = bone_head("neck_01")
# (all of the doll's head: what was left at its sides fused into bumps on the kid's head)
# (a neck-sized hole only: a wide one, closed by holes_fill, left a flat lid across the shoulders that the remesh
# turned into a ledge on the upper back)
bmesh.ops.delete(bm, geom=[f for f in bm.faces if (f.calc_center_median().z > NB.z + 0.012 and abs(f.calc_center_median().x) < 0.06)
                           or max(head_w[v.index] for v in f.verts) > 0.3], context="FACES")
# (the doll's segments are open shells: closed here, or the voxel remesh drops them)
nb0 = sum(1 for e in bm.edges if e.is_boundary)
bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
tick(f"holes closed: {nb0} open edges -> {sum(1 for e in bm.edges if e.is_boundary)}")
bm.to_mesh(body.data); bm.free()
# ... + the kid's head: BIG (chin to crown 0.255 m = 1/5.6 of the height: a stylised kid), round, full cheeks, a small
# chin and nose, ears from the eyes to the nose. The face at -Y.
Hh = 0.255
z0 = HB.z - 0.030                                  # the chin a little under the skull's base joint
HEAD_TOP = z0 + Hh
cy = HB.y - 0.012
W = 0.170
parts = [
    ellipsoid("cranium", (0, cy + 0.008, z0 + Hh * 0.60), (0.085, 0.093, Hh * 0.42)),
    ellipsoid("face", (0, cy - 0.016, z0 + Hh * 0.36), (0.070, 0.068, Hh * 0.29)),
    ellipsoid("cheekL", (0.040, cy - 0.036, z0 + Hh * 0.31), (0.032, 0.030, 0.034)),
    ellipsoid("cheekR", (-0.040, cy - 0.036, z0 + Hh * 0.31), (0.032, 0.030, 0.034)),
    ellipsoid("jaw", (0, cy - 0.004, z0 + Hh * 0.21), (0.057, 0.056, Hh * 0.18)),
    ellipsoid("chin", (0, cy - 0.050, z0 + Hh * 0.11), (0.023, 0.016, 0.016)),
    ellipsoid("nose", (0, cy - 0.083, z0 + Hh * 0.33), (0.0075, 0.009, 0.012), rot=(math.radians(-20), 0, 0), segs=24, rings=16),
    ellipsoid("earL", (0.082, cy + 0.012, z0 + Hh * 0.37), (0.009, 0.019, 0.028), rot=(0, math.radians(-14), math.radians(-8)), segs=24, rings=16),
    ellipsoid("earR", (-0.082, cy + 0.012, z0 + Hh * 0.37), (0.009, 0.019, 0.028), rot=(0, math.radians(14), math.radians(8)), segs=24, rings=16),
    # under the jaw: fills the crease where the jaw meets the neck (round 3)
    ellipsoid("underjaw", (0, cy + 0.004, z0 + 0.018), (0.042, 0.048, 0.034), segs=32, rings=16),
    # the neck: a kid's thin neck, from the collar up into the jaw
    ellipsoid("neck", (0, (NB.y + HB.y) / 2 + 0.006, (NB.z + z0 + Hh * 0.22) / 2), (0.038, 0.037, (z0 + Hh * 0.22 - NB.z) / 2 + 0.035), segs=32, rings=16),
]
FACE = {"z0": z0, "Hh": Hh, "W": W, "cy": cy}
tick(f"kid head: chin {z0:.3f} crown {HEAD_TOP:.3f} ({Hh:.3f} m), centre y {cy:.3f}")
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
dense = skin.vertex_groups.new(name="_dense")
gi = {g.index: g.name for g in skin.vertex_groups}
for v in skin.data.vertices:
    hw = sum(g.weight for g in v.groups if gi.get(g.group) in HANDS)
    mask.add([v.index], max(0.0, 1.0 - hw * 1.6), "REPLACE")
    # (the head and face keep more triangles: smooth silhouettes, no facets)
    dense.add([v.index], 1.0 if v.co.z > z0 - 0.01 and abs(v.co.x) < 0.13 else 0.0, "REPLACE")
sm = skin.modifiers.new("Smooth", "LAPLACIANSMOOTH"); sm.iterations = 14; sm.lambda_factor = 1.2; sm.use_volume_preserve = True
sm.vertex_group = "_smooth"
apply_mod(skin, sm)
sm = skin.modifiers.new("Smooth2", "SMOOTH"); sm.iterations = 8; sm.factor = 0.5; sm.vertex_group = "_smooth"
apply_mod(skin, sm)
# the chin -> neck: a long local smoothing (no bump, no crease where the sculpted head meets the body)
jn = skin.vertex_groups.new(name="_jaw")
for v in skin.data.vertices:
    dz = abs(v.co.z - (z0 + 0.005)) / 0.06; dx = abs(v.co.x) / 0.075
    w_jaw = max(0.0, 1 - dz * dz - dx * dx * 0.5) if v.co.y > cy - 0.075 else 0.0
    # (+ the neck's base: the crease between the neck and the shoulders, which a shirt offset folds over)
    _na = bone_head("neck_01"); rr = math.hypot(v.co.x - _na.x, v.co.y - _na.y)
    w_base = max(0.0, 1 - ((v.co.z - _na.z - 0.01) / 0.06) ** 2) * max(0.0, min(1.0, (0.14 - rr) / 0.05))
    # (+ the upper back and shoulder tops: the doll's chest plate left a ledge there that the remesh kept)
    w_back = max(0.0, 1 - ((v.co.z - (_na.z - 0.03)) / 0.07) ** 2) * max(0.0, min(1.0, (0.20 - abs(v.co.x)) / 0.05)) * (1.0 if v.co.y > _na.y - 0.06 else 0.0)
    jn.add([v.index], max(w_jaw, w_base, w_back), "REPLACE")
sm = skin.modifiers.new("SmoothJaw", "LAPLACIANSMOOTH"); sm.iterations = 40; sm.lambda_factor = 1.5; sm.use_volume_preserve = True
sm.vertex_group = "_jaw"
apply_mod(skin, sm)
skin.vertex_groups.remove(skin.vertex_groups["_jaw"])
# the smooth high-res skin, kept for its normals
hi = skin.copy(); hi.data = skin.data.copy(); hi.name = "SkinHi"; scn.collection.objects.link(hi); hi.hide_render = True
for p in hi.data.polygons: p.use_smooth = True
# two passes: the body (the head protected by its vertex group) to BODY_TRIS, then the head (the body protected) to
# HEAD_TRIS: the head keeps a third of the skin's budget (a smooth round face, no facets)
BODY_TRIS, HEAD_TRIS = 3150, 2200
HIP_SMOOTH = int(arg("--hipsmooth", "14"))
def in_head(c): return c.z > z0 - 0.01 and abs(c.x) < 0.13
for inv, want_n in ((True, BODY_TRIS), (True, BODY_TRIS), (True, BODY_TRIS), (False, HEAD_TRIS), (False, HEAD_TRIS)):
    n_all = len(skin.data.polygons); n_head = sum(1 for p in skin.data.polygons if in_head(p.center))
    cur = (n_all - n_head) if inv else n_head
    if cur <= want_n * 1.05: continue
    other = n_head if inv else (n_all - n_head)
    dc = skin.modifiers.new("Dec", "DECIMATE"); dc.decimate_type = "COLLAPSE"
    dc.ratio = min(1.0, (other + want_n) / max(1, n_all)); dc.use_collapse_triangulate = True
    dc.vertex_group = "_dense"; dc.vertex_group_factor = 1.0; dc.invert_vertex_group = inv
    apply_mod(skin, dc)
nhead = sum(1 for p in skin.data.polygons if p.center.z > z0 - 0.01 and abs(p.center.x) < 0.13)
tick(f"decimated: {len(skin.data.polygons)} tris, {nhead} on the head")
transfer_weights(skin, src)
for n in ("_smooth", "_dense"):
    if skin.vertex_groups.get(n): skin.vertex_groups.remove(skin.vertex_groups[n])
# the fused skin's weights SMOOTHED: the remesh joined surfaces the doll kept apart (the armpits, the crotch), and the
# nearest-face transfer gave neighbours there weights from different segments (a jump: edges torn x10 in a walk).
# Averaged over the mesh's rings (the hands kept: the fingers' weights are exact), then the 4 largest, normalised.
# The head above the jaw joint: rigid on the Head bone (the bigger head reaches past the mannequin's).
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
    # the hips (pelvis <-> thigh, the crotch): a wider blend, so a sitting / crouching leg folds instead of tearing
    ip, itl, itr = names.index("pelvis"), names.index("thigh_l"), names.index("thigh_r")
    hipm = (np.minimum(W[:, ip], np.maximum(W[:, itl], W[:, itr])) > 0.04)[:, None].astype(float)
    for _ in range(HIP_SMOOTH):
        hipm2 = np.minimum(1, hipm + (np.add.at(S0 := np.zeros_like(hipm), idx, hipm[nb]) or S0) / cnt)   # (the region grown by a ring)
        S = np.zeros_like(W); np.add.at(S, idx, W[nb])
        W = W * (1 - hipm2) + hipm2 * (0.5 * W + 0.5 * S / cnt)
        hipm = hipm2
    co = np.array([v.co[:] for v in me.vertices])
    hk = np.clip((co[:, 2] - (HB.z - 0.020)) / 0.060, 0, 1); hk = hk * hk * (3 - 2 * hk)
    hk *= (np.abs(co[:, 0]) < 0.14) & (np.abs(co[:, 1] - cy) < 0.14)
    Wh = np.zeros(ng); Wh[names.index("Head")] = 1
    W = W * (1 - hk[:, None]) + Wh[None, :] * hk[:, None]
    # the neckline rides on the chest (spine_03): a shrug or a head turn does not fold the collar into the neck
    na = bone_head("neck_01"); zc = na.z + 0.016
    nr = np.hypot(co[:, 0] - na.x, co[:, 1] - na.y)
    nk = np.clip((0.12 - nr) / 0.06, 0, 1) * np.clip(1 - np.abs(co[:, 2] - zc) / 0.06, 0, 1) * 0.3
    Ws = np.zeros(ng); Ws[names.index("spine_03")] = 1
    W = W * (1 - nk[:, None]) + Ws[None, :] * nk[:, None]
    top = np.argsort(-W, axis=1)[:, :4]
    W2 = np.zeros_like(W); rows = np.arange(nvv)[:, None]; W2[rows, top] = W[rows, top]
    W2 /= np.maximum(1e-9, W2.sum(axis=1, keepdims=True))
    allv = list(range(nvv))
    for gi_, g in enumerate(o.vertex_groups):
        g.remove(allv)
        nz = np.nonzero(W2[:, gi_] > 1e-3)[0]
        for i in nz: g.add([int(i)], float(W2[i, gi_]), "REPLACE")
smooth_skin_weights(skin)
tick("skin weights smoothed, the head rigid")
for p in skin.data.polygons: p.use_smooth = True
# smooth shading: the normals of the high-res skin (no facets on the face at any light)
dt = skin.modifiers.new("Nrm", "DATA_TRANSFER"); dt.object = hi
dt.use_loop_data = True; dt.data_types_loops = {"CUSTOM_NORMAL"}; dt.loop_mapping = "POLYINTERP_NEAREST"
try:
    apply_mod(skin, dt); tick("normals from the high-res skin")
except Exception as e:
    skin.modifiers.remove(dt); tick(f"(normal transfer skipped: {e})")
bpy.data.objects.remove(hi)
skin.modifiers.clear()
mod = skin.modifiers.new("Armature", "ARMATURE"); mod.object = arm
skin.parent = arm
me = skin.data
tick(f"skin: {len(me.polygons)} tris")

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
NECK_R = 0.052                                                       # the crew neck's radius round the neck's axis
NECK_UP = 0.020                                                      # and never higher than this over the plane (the back)
NECK_ZC, NECK_M = 0.016, 0.010 / 0.045                                # the crew neck's plane: centre height, tilt (low in front)
def NECK_Z_AT(th, r=0.045): return NECK_AX.z + NECK_ZC - NECK_M * 0.045 * math.cos(th) * r / 0.045
def neck_poly_r(co):
    """the distance from the neck's axis measured against the 20-gon of the tangent cuts (its inscribed radius = NECK_R)"""
    th_ = math.atan2(co.x - NECK_AX.x, -(co.y - NECK_AX.y)); k_ = round(th_ / (2 * math.pi / 20)); c_ = 2 * math.pi * k_ / 20
    return (co.x - NECK_AX.x) * math.sin(c_) - (co.y - NECK_AX.y) * math.cos(c_)
def in_shirt(co, ws):
    # a crew neck: round the neck's axis, above the neckline, is out
    th_ = math.atan2(co.x - NECK_AX.x, -(co.y - NECK_AX.y))
    _over = co.z - NECK_AX.z - NECK_ZC - NECK_M * (co.y - NECK_AX.y)
    if (neck_poly_r(co) < NECK_R and _over > 0) or (neck_poly_r(co) < NECK_R + 0.035 and _over > NECK_UP): return False
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
        old = set(bm.verts)
        bmesh.ops.bisect_plane(bm, geom=geom, plane_co=Vector(co), plane_no=Vector(no).normalized(), dist=0.0004)
        # (the new vertices' skin weights: interpolated here from the two ends of the edge each one split, by distance;
        # bisect_plane does not interpolate the deform layer reliably: a vertex at the neckline once took a thigh's weights)
        dl = bm.verts.layers.deform.active
        if dl is not None:
            for v in bm.verts:
                if v in old: continue
                ends = [e.other_vert(v) for e in v.link_edges if e.other_vert(v) in old]
                ends.sort(key=lambda u: (u.co - v.co).length)
                if len(ends) < 2: ends = ends[:1]
                else:
                    # the two ends on opposite sides of the plane (the edge it split)
                    pn = Vector(no).normalized(); a0 = ends[0]
                    side0 = (a0.co - Vector(co)).dot(pn)
                    b0 = next((u for u in ends[1:] if (u.co - Vector(co)).dot(pn) * side0 < 0), ends[1])
                    ends = [a0, b0]
                if not ends: continue
                ds = [max(1e-6, (u.co - v.co).length) for u in ends]; ws_ = [1 / d for d in ds]; tw = sum(ws_)
                acc = {}
                for u, w_ in zip(ends, ws_):
                    for gi_, x in u[dl].items(): acc[gi_] = acc.get(gi_, 0) + x * w_ / tw
                v[dl].clear()
                for gi_, x in acc.items(): v[dl][gi_] = x
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
    # (islands: a few faces cut off by a hem plane or a region test stand up as flakes: dropped, < 4 % of the part)
    bm.faces.ensure_lookup_table()
    seen, islands = set(), []
    for f in bm.faces:
        if f in seen: continue
        stack, isl = [f], []
        seen.add(f)
        while stack:
            g_ = stack.pop(); isl.append(g_)
            for e in g_.edges:
                for h in e.link_faces:
                    if h not in seen: seen.add(h); stack.append(h)
        islands.append(isl)
    big = max((len(x) for x in islands), default=0)
    drop = [f for isl in islands if len(isl) < max(12, 0.04 * big) for f in isl]
    if drop:
        tick(f"  {name}: {len(drop)} faces in {sum(1 for isl in islands if len(isl) < max(12, 0.04 * big))} stray islands dropped")
        # (which vertices survive, decided BEFORE the delete: a FACES delete also removes the verts it frees)
        dropset = set(drop)
        used = {v for f in bm.faces if f not in dropset for v in f.verts}
        keep_idx = [k for k, v in enumerate(bm.verts) if v in used]
        bmesh.ops.delete(bm, geom=drop, context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if v not in used], context="VERTS")
        src_of = [src_of[k] for k in keep_idx]
        assert len(src_of) == len(bm.verts), "shell: vertex map out of step"
        # (re-packed: BMesh reuses the freed slots for NEW vertices, which then come out in the middle of the mesh's
        # vertex order (the hem's vertices took the weights of the waist's: spikes); a fresh BMesh keeps the order)
        _tmp = bpy.data.meshes.new("_pack"); bm.to_mesh(_tmp); bm.free()
        bm = bmesh.new(); bm.from_mesh(_tmp); bpy.data.meshes.remove(_tmp)
        bm.verts.ensure_lookup_table(); bm.verts.index_update()
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
        # (measured along each vertex's own skin normal from its own skin point: the nearest skin point was the NECK's
        # for the shirt's back neckline, which pushed it the wrong way into folds)
        for v, d, si in zip(list(bm.verts), want, src_of):
            o_ = (v.co - me.vertices[si].co).dot(N[si])
            if o_ < 0.6 * d: v.co = v.co + N[si] * (0.6 * d - o_)
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
    preview(os.path.join(SCRATCH, "body_{v}.jpg"), [("lshoulder", 150, 30, 0.6), ("rshoulder", -150, 30, 0.6)], res=(600, 600), target=(0, FACE["cy"] + 0.03, FACE["z0"] - 0.03))
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
# the crew neck: a plane tilted down to the front (NECK_Z_AT), cut only round the neck
# the crew neck = the skin outside a cylinder round the neck (NECK_R) or under a plane tilted down to the front: the
# plane cut where it meets the skin inside the cylinder, the cylinder as 20 short tangent planes above the plane (the
# trapezius at the back rises over the plane: a plane alone opened a boat neck there)
P_.append(((NECK_AX.x, NECK_AX.y, NECK_AX.z + NECK_ZC), (0, -NECK_M, 1), ((NECK_AX.x - NECK_R - 0.01, NECK_AX.y - NECK_R - 0.01, NECK_AX.z - 0.05), (NECK_AX.x + NECK_R + 0.01, NECK_AX.y + NECK_R + 0.01, NECK_AX.z + 0.08))))
P_.append(((NECK_AX.x, NECK_AX.y, NECK_AX.z + NECK_ZC + NECK_UP), (0, -NECK_M, 1), ((NECK_AX.x - NECK_R - 0.04, NECK_AX.y - NECK_R - 0.04, NECK_AX.z - 0.03), (NECK_AX.x + NECK_R + 0.04, NECK_AX.y + NECK_R + 0.04, NECK_AX.z + 0.10))))
for k_ in range(20):
    th_ = 2 * math.pi * k_ / 20; d_ = Vector((math.sin(th_), -math.cos(th_), 0)); c_ = Vector((NECK_AX.x, NECK_AX.y, 0)) + d_ * NECK_R
    t_ = Vector((-d_.y, d_.x, 0)); half = NECK_R * math.tan(math.pi / 20) + 0.002
    lo_ = [min(c_[a] - t_[a] * half, c_[a] + t_[a] * half) - 0.004 for a in range(2)]; hi_ = [max(c_[a] - t_[a] * half, c_[a] + t_[a] * half) + 0.004 for a in range(2)]
    P_.append(((c_.x, c_.y, NECK_AX.z), (d_.x, d_.y, 0), ((lo_[0], lo_[1], NECK_Z_AT(th_) - 0.01), (hi_[0], hi_[1], NECK_AX.z + 0.12))))
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
smooth_weights(shirt, 4)                                           # (cloth: no fold where the chest meets the shoulder)
# the collar and the cuffs (+ the sweatshirt's waistband): ribbed bands along the garment's borders
def bone_band(name, bone, t, r, out, slot, n=24, flat=0.55):
    """a ribbed band round a limb at `t` along `bone` (the cuffs): a ring on the skin from the bone's axis outward"""
    bvh_ = BVHTree.FromBMesh(bm_of(body))
    h, tl = bone_head(bone), bone_tail(bone); ax = (tl - h).normalized(); c0 = h + (tl - h) * t
    u = ax.cross(Vector((0, 0, 1))); u = (u if u.length > 1e-3 else ax.cross(Vector((0, 1, 0)))).normalized(); w = ax.cross(u)
    ring = []
    for i in range(n):
        d = u * math.cos(2 * math.pi * i / n) + w * math.sin(2 * math.pi * i / n)
        loc, nn, _, dist = bvh_.ray_cast(c0, d, 0.08)
        if loc is None or dist > 0.07: loc, nn = c0 + d * 0.03, d
        ring.append((loc, nn))
    tick(f"  band {name}: radius {min((q - c0).length for q, _ in ring):.3f}-{max((q - c0).length for q, _ in ring):.3f} m")
    bm = bmesh.new(); rings = []
    for i, (q, nn) in enumerate(ring):
        tt = (ring[(i + 1) % n][0] - ring[i - 1][0]).normalized(); sd = tt.cross(nn).normalized(); cc = q + nn * out
        rings.append([bm.verts.new(cc + nn * r * flat * math.sin(a) + sd * r * math.cos(a)) for a in [kk * 2 * math.pi / 5 for kk in range(5)]])
    for i in range(n):
        r0, r1 = rings[i], rings[(i + 1) % n]
        for kk in range(5): bm.faces.new([r0[kk], r0[(kk + 1) % 5], r1[(kk + 1) % 5], r1[kk]]).smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(name, bm, [slot]); nearest_weights(o, body); return o
trims = []
for s_ in "lr":
    if OUTFIT["shirt"] == "tee": trims.append(bone_band(f"cuff_{s_}", f"upperarm_{s_}", SLEEVE - 0.004, 0.0065, 0.0150, "shirt_trim"))
    else: trims.append(bone_band(f"cuff_{s_}", f"lowerarm_{s_}", 0.896, 0.0065, 0.0100, "shirt_trim"))
# THE CREW NECK (round 2: the region's border was a sawtooth): a clean ring on the skin round the neck (lower in front),
# the shirt cut back to it and its border snapped onto it, a ribbed band laid over the seam (no gap, no spikes)
body_bvh = BVHTree.FromBMesh(bm_of(body))
NRING = 40
RING = []
for i in range(NRING):
    th = 2 * math.pi * i / NRING
    d = Vector((math.sin(th), -math.cos(th), 0))
    z = NECK_Z_AT(th)
    # (from OUTSIDE, at the edge of the neckline's region, inward: the outer place where the neckline plane meets the
    # skin: exactly where the shirt was cut)
    # where the shirt ends: on the cylinder if the skin there is above the plane (the back), else where the plane meets
    # the skin inside it (the front)
    pc = Vector((NECK_AX.x, NECK_AX.y, 0)) + d * NECK_R
    hit = body_bvh.ray_cast(Vector((pc.x, pc.y, NECK_AX.z + 0.15)), Vector((0, 0, -1)), 0.25)
    if hit[0] is not None and hit[0].z > z + NECK_UP:
        # (the skin at the cylinder is over the cap height: the shirt ends where the raised plane meets it, outside)
        z2 = z + NECK_UP
        loc, n, _, _ = body_bvh.ray_cast(Vector((NECK_AX.x, NECK_AX.y, z2)) + d * (NECK_R + 0.034), -d, NECK_R + 0.034)
        if loc is None: loc, n = Vector((NECK_AX.x, NECK_AX.y, z2)) + d * NECK_R, d
        z = z2
    elif hit[0] is not None and hit[0].z > z:
        loc, n = hit[0], hit[1]; z = loc.z
    else:
        loc, n, _, _ = body_bvh.ray_cast(Vector((NECK_AX.x, NECK_AX.y, z)) + d * (NECK_R - 0.001), -d, NECK_R)
        if loc is None: loc, n = Vector((NECK_AX.x, NECK_AX.y, z)) + d * 0.045, d
    RING.append((loc, n, z))
# the neckline's radius round the neck: a median against rays that slipped into the shoulder, then FITTED by a low-pass
# Fourier series (3 harmonics): a clean, even curve (round 3: the band followed every bump of the skin)
_raw = [math.hypot(q.x - NECK_AX.x, q.y - NECK_AX.y) for q, _, _ in RING]
_med = [sorted([_raw[(i + k) % NRING] for k in (-2, -1, 0, 1, 2)])[2] for i in range(NRING)]
_th = [2 * math.pi * i / NRING for i in range(NRING)]
_co = [sum(_med[i] * math.cos(h * _th[i]) for i in range(NRING)) * 2 / NRING for h in range(4)]
_si = [sum(_med[i] * math.sin(h * _th[i]) for i in range(NRING)) * 2 / NRING for h in range(4)]
def r_fit(th): return _co[0] / 2 + sum(_co[h] * math.cos(h * th) + _si[h] * math.sin(h * th) for h in range(1, 4))
_lift = max(0.0, max(_med[i] - r_fit(_th[i]) for i in range(NRING)))
_zs = [RING[i][2] for i in range(NRING)]
_zc = [sum(_zs[i] * math.cos(h * _th[i]) for i in range(NRING)) * 2 / NRING for h in range(4)]
_zsn = [sum(_zs[i] * math.sin(h * _th[i]) for i in range(NRING)) * 2 / NRING for h in range(4)]
def z_fit(th): return _zc[0] / 2 + sum(_zc[h] * math.cos(h * th) + _zsn[h] * math.sin(h * th) for h in range(1, 4))
def neck_pt(th):
    d = Vector((math.sin(th), -math.cos(th), 0))
    return Vector((NECK_AX.x, NECK_AX.y, z_fit(th))) + d * (r_fit(th) + min(0.006, _lift)), d
tick(f"  neckline fitted: radius {min(r_fit(t) for t in _th):.3f}-{max(r_fit(t) for t in _th):.3f} m (+{_lift * 1000:.1f} mm)")
def nth(co): return math.atan2(co.x - NECK_AX.x, -(co.y - NECK_AX.y))
def nrad(co): return math.hypot(co.x - NECK_AX.x, co.y - NECK_AX.y)
PLANE_N = Vector((0, -NECK_M, 1)).normalized()
NR2, SIDES, CR = 48, 6, 0.0078
bm = bmesh.new(); rings = []
for i in range(NR2):
    th = 2 * math.pi * i / NR2
    q, d = neck_pt(th)
    q1, _ = neck_pt(th + 0.01); q0, _ = neck_pt(th - 0.01)
    t = (q1 - q0).normalized()
    nout = (d - PLANE_N * d.dot(PLANE_N)).normalized()                 # out from the neck, in the neckline's plane
    up = t.cross(nout).normalized()
    if up.dot(PLANE_N) < 0: up = -up
    c = q + nout * (CR * 0.55)
    rings.append([bm.verts.new(c + nout * CR * 0.55 * math.cos(a) + up * CR * math.sin(a)) for a in [k * 2 * math.pi / SIDES for k in range(SIDES)]])
for i in range(NR2):
    r0, r1 = rings[i], rings[(i + 1) % NR2]
    for kk in range(SIDES): bm.faces.new([r0[kk], r0[(kk + 1) % SIDES], r1[(kk + 1) % SIDES], r1[kk]]).smooth = True
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
def collar_weights(o):
    """the collar's weights by its angle round the neck (no lookup that can pick a wrong vertex): the chest, a little of
    the neck, the collarbones at the sides"""
    gs = {n: o.vertex_groups.new(name=n) for n in ("spine_03", "neck_01", "clavicle_l", "clavicle_r")}
    for v in o.data.vertices:
        th = nth(v.co); side = math.sin(th)
        cl = 0.40 * abs(side)
        w = {"spine_03": 0.75 - cl, "neck_01": 0.25, "clavicle_l" if side > 0 else "clavicle_r": cl}
        for n, x in w.items():
            if x > 1e-4: gs[n].add([v.index], x, "REPLACE")
collar = new_obj("collar", bm, ["shirt_trim"]); collar_weights(collar)   # (the shirt's weights: it moves with the shirt, not the neck)
trims.append(collar)

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
for s_ in "lr":
    if OUTFIT["legs"] == "shorts": trims.append(bone_band(f"hem_{s_}", f"thigh_{s_}", SHORTS - 0.004, 0.0060, 0.0225, "shorts"))
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
HC = Vector((0, cy + 0.006, z0 + Hh * 0.56))                         # the head's centre (rays for hair and cap)
def dirv(az, el): return Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
def scalp(az, el, out=0.0):
    """the head's outer surface in direction (az from the face, el up) from the head's centre, pushed out"""
    d = dirv(az, el)
    loc, n, _, _ = skin_bvh.ray_cast(HC + d * 0.35, -d)
    if loc is None: loc, n, _, _ = skin_bvh.find_nearest(HC + d * 0.1)
    return loc + n * out, n
def el_at(az, z):
    """the elevation (from the head's centre) that reaches height z on the head at azimuth az"""
    lo, hi_ = -1.2, 1.55
    for _ in range(18):
        m = (lo + hi_) / 2
        if scalp(az, m)[0].z < z: lo = m
        else: hi_ = m
    return (lo + hi_) / 2
def surf(p, out=0.0):
    loc, n, _, _ = skin_bvh.find_nearest(Vector(p))
    return loc + n * out, n
def ribbon(name, pts, widths, thick, slot, sides=6, rigid=True, round_tip=False, nfun=None):
    """a tapered lock / strip along pts, widths per point, thick: a flat closed tube lying on the skin"""
    bm = bmesh.new(); rings = []
    for i, p in enumerate(pts):
        q = Vector(p)
        t = (Vector(pts[min(i + 1, len(pts) - 1)]) - Vector(pts[max(i - 1, 0)])).normalized()
        n = nfun(q) if nfun else surf(q)[1]
        sd = t.cross(n).normalized()
        w, th = widths[i], thick * (1 - (0 if nfun else 0.35 if round_tip else 0.6) * i / max(1, len(pts) - 1))
        rings.append([bm.verts.new(q + sd * w * math.cos(a) + n * th * math.sin(a)) for a in [kk * 2 * math.pi / sides for kk in range(sides)]])
    for r0, r1 in zip(rings, rings[1:]):
        for kk in range(sides):
            bm.faces.new([r0[kk], r0[(kk + 1) % sides], r1[(kk + 1) % sides], r1[kk]]).smooth = True
    bm.faces.new(rings[0][::-1]).smooth = True
    if round_tip:
        # a rounded end: a fan to a point a little beyond the last ring
        last, prev = Vector(pts[-1]), Vector(pts[-2])
        tip = bm.verts.new(last + (last - prev).normalized() * widths[-1] * 0.9)
        for kk in range(sides): bm.faces.new([rings[-1][kk], rings[-1][(kk + 1) % sides], tip]).smooth = True
    else: bm.faces.new(rings[-1]).smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    o = new_obj(name, bm, [slot])
    if rigid: rigid_head(o)
    return o

EYE_Z, EYE_X = z0 + Hh * 0.41, 0.033                                  # big eyes, set low in the face (a kid's)
CAP = OUTFIT["cap"] != "0"
WS = vweights(body)
NRM = [v.normal.copy() for v in body.data.vertices]
# HAIR: a 90s kid's cut (a soft "curtains" mop): a thin base shell on the scalp + soft clump-shaped locks over it,
# radiating from a crown whorl at the back of the top: a fringe to the brows, over the ears' tops, down to the nape.
def z_end(az):
    a = abs(math.atan2(math.sin(az), math.cos(az))) / math.pi           # 0 front .. 1 back
    front, side, back = EYE_Z + 0.034, EYE_Z + 0.006, z0 + Hh * 0.24
    return front + (side - front) * smooth01(a / 0.5) if a < 0.5 else side + (back - side) * smooth01((a - 0.5) / 0.5)
def in_hair(co, ws):
    if ws.get("Head", 0) + ws.get("neck_01", 0) < 0.5: return False
    return co.z > z_end(hang(co)) + 0.008 and hu(co) > 0.2
F_hair, _ = face_region(body, in_hair)
hair = shell(body, F_hair, "hair", "hair", 0, off_fn=lambda co, i: 0.0045 + 0.0015 * noise.noise(co * 40), rim_in=0.006, src_normals=NRM)
rigid_head(hair)
locks = []
def lock(name, az0, el0, az1, z1, w, th, n=5, out0=0.011, out1=0.004, sides=6):
    el1 = el_at(az1, z1)
    pts = []
    for k in range(n):
        t = k / (n - 1)
        az = az0 + (az1 - az0) * t; el = el0 + (el1 - el0) * (t ** 0.85)
        pts.append(scalp(az, el, out0 + (out1 - out0) * t)[0])
    # (a soft clump: full most of its length, then a ROUND tip: no needle ends)
    widths = [w * math.sqrt(max(0.0, 1.0 - (k / (n - 1)) ** 2.4)) * 0.92 + w * 0.08 for k in range(n)]
    locks.append(ribbon(name, pts, widths, th * 1.25, "hair", sides=sides, round_tip=True))
NA = 16
cap_el = el_at(0, z0 + Hh * 0.66) if CAP else None
for i in range(NA):                                                   # the top row (under a cap: never seen, left out)
    az = 2 * math.pi * i / NA
    if not CAP: lock(f"top{i}", az + 0.15, 1.30, az + 0.05, (z_end(az) + HEAD_TOP) / 2 - 0.01, 0.034, 0.011, n=4, out0=0.012, out1=0.009)
for i in range(NA):                                                   # the outer row: to the hairline all round
    az = 2 * math.pi * (i + 0.5) / NA
    a = abs(math.atan2(math.sin(az), math.cos(az)))
    if a < 0.62: continue                                             # (the front is the fringe's)
    el0 = 0.95 if not CAP else el_at(az, z0 + Hh * (0.60 + 0.07 * (math.cos(az) + 1) / 2)) - 0.02
    lock(f"row{i}", az, el0, az + 0.04 * math.copysign(1, math.sin(az)), z_end(az), 0.042, 0.010 if not CAP else 0.008, n=4, out0=0.012 if not CAP else 0.006, out1=0.005)
for i, az in enumerate(np.linspace(-0.62, 0.62, 7)):                   # the fringe: curtains parted at the middle
    sweep = 0.10 * (1 if az >= 0 else -1) * (0.4 + abs(az))
    el0 = 1.0 if not CAP else cap_el - 0.03
    lock(f"fringe{i}", az * 0.8, el0, az + sweep, z_end(az) - 0.004 * (1 - abs(az) / 0.62), 0.030, 0.010 if not CAP else 0.008, n=4, out0=0.012 if not CAP else 0.006, out1=0.006)
tick(f"hair: shell {len(hair.data.polygons)} faces + {len(locks)} locks")

# THE CAP: a plain 90s 6-panel baseball cap (no logo): a crown that follows the head + the hair, six panels with raised
# seams, the top button, a curved brim with a thickness and a rounded edge, the back opening with its strap (seen when
# worn backwards: --cap back), all rigid on the head.
caps = []
if CAP:
    off = math.pi if OUTFIT["cap"] == "back" else 0.0
    wrap = lambda a: math.atan2(math.sin(a), math.cos(a))
    rim_z = lambda az: z0 + Hh * (0.60 + 0.07 * (math.cos(az) + 1) / 2)      # higher over the forehead, lower at the back
    NA_, NR = 36, 9
    CLEAR = 0.019                                                    # over the hair
    grid = []
    bm = bmesh.new()
    for j in range(NR):
        t = j / NR
        row = []
        for i in range(NA_):
            az = 2 * math.pi * i / NA_
            el = el_at(az, rim_z(az)) if j == 0 else None
            if j: el = grid[0][i][1] + (1.50 - grid[0][i][1]) * (t ** 0.9)
            p, n = scalp(az, el, 0.0)
            p = p + dirv(az, el) * (CLEAR + 0.006 * math.sin(math.pi * min(1, t * 1.1)))     # (out along the ray: a clean dome, no jitter from the skin's normals)
            row.append((p, el, az))
        grid.append(row)
    # the crown smoothed: each point's distance from the head's centre averaged with its neighbours round and up
    # (the skin under it has small dents; a cap's crown is a taut dome: no crease along a seam)
    for _ in range(6):
        R_ = [[(grid[j][i][0] - HC).length for i in range(NA_)] for j in range(NR)]
        for j in range(NR):
            for i in range(NA_):
                nbs = [R_[j][(i - 1) % NA_], R_[j][(i + 1) % NA_]] + ([R_[j - 1][i]] if j > 0 else []) + ([R_[j + 1][i]] if j < NR - 1 else [])
                r_ = 0.5 * R_[j][i] + 0.5 * sum(nbs) / len(nbs)
                p_, el_, az_ = grid[j][i]
                grid[j][i] = (HC + (p_ - HC).normalized() * max(r_, R_[j][i] - 0.002), el_, az_)
    V_ = [[bm.verts.new(p) for (p, _, _) in row] for row in grid]
    pole = bm.verts.new(scalp(0, math.pi / 2, CLEAR + 0.004)[0])
    def opening(i, j):
        a = wrap(2 * math.pi * (i + 0.5) / NA_ - off - math.pi)
        return abs(a) < 0.40 and j < 3
    for j in range(NR - 1):
        for i in range(NA_):
            if opening(i, j): continue
            bm.faces.new([V_[j][i], V_[j][(i + 1) % NA_], V_[j + 1][(i + 1) % NA_], V_[j + 1][i]]).smooth = True
    for i in range(NA_): bm.faces.new([V_[NR - 1][i], V_[NR - 1][(i + 1) % NA_], pole]).smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if sum(f.normal.dot(f.calc_center_median() - HC) for f in bm.faces) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.003)
    for f in bm.faces: f.smooth = True
    crown = new_obj("cap", bm, ["cap"]); rigid_head(crown); caps.append(crown)
    # the seams: six raised ribs from the band to the button (front pair meeting at the middle)
    for ks in range(6):
        az = off + ks * math.pi / 3
        i = int(round(az / (2 * math.pi) * NA_)) % NA_
        js = [j for j in range(NR) if not opening(i, j) and not opening((i - 1) % NA_, j)]
        # (the piping's path: the crown's own grid points along the seam, lifted half a cord; its cross-section round)
        pts = [grid[j][i][0] + (grid[j][i][0] - HC).normalized() * 0.0024 for j in js]
        pts.append(scalp(0, math.pi / 2, CLEAR + 0.004)[0] + Vector((0, 0, 0.001)))
        if len(pts) > 2 and "--noseams" not in ARGV:
            caps.append(ribbon(f"seam{ks}", pts, [0.0021] * len(pts), 0.0021 / 0.65, "cap", sides=6, nfun=lambda q: (q - HC).normalized()))
    # the button
    b2 = bmesh.new(); bmesh.ops.create_uvsphere(b2, u_segments=12, v_segments=6, radius=1)
    bmesh.ops.transform(b2, matrix=Matrix.Translation(scalp(0, math.pi / 2, CLEAR + 0.007)[0]) @ Matrix.Diagonal((0.008, 0.008, 0.004, 1)), verts=b2.verts)
    for f in b2.faces: f.smooth = True
    caps.append(new_obj("cap_button", b2, ["cap"])); rigid_head(caps[-1])
    # the strap across the opening's bottom (and its snap)
    pts = []
    for a in np.linspace(-0.46, 0.46, 7):
        az = off + math.pi + a
        pts.append(scalp(az, el_at(az, rim_z(az)) + 0.03, CLEAR + 0.004)[0])
    caps.append(ribbon("cap_strap", pts, [0.006] * len(pts), 0.0018, "cap_brim", sides=4))
    # the brim: attached along the front band, a D-shaped plate curved across, 6 mm thick, its outer edge rounded
    fwd = Vector((math.sin(off), -math.cos(off), 0))
    NB_, NRB, TH = 15, 5, 0.006
    prof = []
    for i in range(NB_):
        a = (i / (NB_ - 1) - 0.5) * 2 * 1.10                               # -1.1 .. 1.1 rad round the band
        az = off + a
        base = scalp(az, el_at(az, rim_z(az)), CLEAR - 0.004)[0]
        radial = Vector((math.sin(az), -math.cos(az), 0))
        out = (radial * 0.35 + fwd * 0.65).normalized()
        L = 0.010 + 0.064 * max(0.0, math.cos(a / 1.1 * math.pi / 2)) ** 0.75
        up = Vector((0, 0, 1))
        top, bot = [], []
        for j in range(NRB):
            r = j / (NRB - 1)
            p = base + out * L * r + Vector((0, 0, -0.006 * r - 0.016 * (a / 1.1) ** 2 * r))
            top.append(p + up * TH / 2); bot.append(p - up * TH / 2)
        P1 = base + out * L + Vector((0, 0, -0.006 - 0.016 * (a / 1.1) ** 2))
        edge = [P1 + out * (TH / 2) * math.sin(math.pi * k / 4) + up * (TH / 2) * math.cos(math.pi * k / 4) for k in range(1, 4)]
        prof.append(top + edge + bot[::-1])
    bm = bmesh.new()
    PV = [[bm.verts.new(p) for p in col] for col in prof]
    for i in range(NB_ - 1):
        for kk in range(len(PV[0]) - 1):
            bm.faces.new([PV[i][kk], PV[i + 1][kk], PV[i + 1][kk + 1], PV[i][kk + 1]]).smooth = True
    bm.faces.new(PV[0][::-1]); bm.faces.new(PV[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    caps.append(new_obj("cap_brim", bm, ["cap_brim"])); rigid_head(caps[-1])
    # (the hair under the crown is never seen: dropped)
    bm = bm_of(hair)
    # (but where the back opening shows it)
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if all(v.co.z > rim_z(hang(v.co)) + 0.02 and abs(wrap(hang(v.co) - off - math.pi)) > 0.55 for v in f.verts)], context="FACES")
    bm.to_mesh(hair.data); bm.free()

# THE FACE: big eyes (white, iris, pupil, a highlight) set low, simple arched brows, a small smile: readable at 3 m
def ray_front(x, z):
    hit = skin_bvh.ray_cast(Vector((x, cy - 0.4, z)), Vector((0, 1, 0)))
    return hit[0], hit[1]
def disc(bm, c, n, r, segs=16, up=Vector((0, 0, 1))):
    sd = up.cross(n).normalized(); up2 = n.cross(sd).normalized()
    ring = [bm.verts.new(c + (sd * math.cos(a) + up2 * math.sin(a)) * r) for a in [kk * 2 * math.pi / segs for kk in range(segs)]]
    ctr = bm.verts.new(c + n * r * 0.08)
    for kk in range(segs): bm.faces.new([ctr, ring[kk], ring[(kk + 1) % segs]]).smooth = True
features = []
for s in (1, -1):
    p, n = ray_front(s * EYE_X, EYE_Z)
    n = (n + Vector((0, -1, 0)) * 1.5).normalized()
    bm = bmesh.new(); bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=12, radius=1)
    M = Matrix.Translation(p - n * 0.0020) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((0.0170, 0.0150, 0.0074, 1))
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    for f in bm.faces: f.smooth = True
    white = new_obj(f"eye_white{s}", bm, ["eye_white"]); rigid_head(white); features.append(white)
    front = p - n * 0.0020 + n * 0.0074
    look = Vector((-s * 0.0012, 0, -0.0006))
    bm = bmesh.new(); disc(bm, front + n * 0.0003 + look, n, 0.0106)
    iris = new_obj(f"iris{s}", bm, ["iris"]); rigid_head(iris); features.append(iris)
    bm = bmesh.new(); disc(bm, front + n * 0.0006 + look, n, 0.0056)
    disc(bm, front + n * 0.0009 + look + Vector((0.0036, 0, 0.0038)), n, 0.0019, segs=8)
    pup = new_obj(f"pupil{s}", bm, ["pupil", "eye_white"]); rigid_head(pup); features.append(pup)
    for poly in pup.data.polygons: poly.material_index = 1 if poly.index >= 16 else 0
    pts = []                                                        # the brow: a soft arch over the eye
    for t in np.linspace(-1, 1, 6):
        q, _ = ray_front(s * (EYE_X + t * 0.018), EYE_Z + 0.027 + 0.004 * (1 - t * t) - 0.0015 * t)
        if q: pts.append(q + Vector((0, -0.0025, 0)))
    features.append(ribbon(f"brow{s}", pts, [0.0030, 0.0040, 0.0042, 0.0040, 0.0034, 0.0022][:len(pts)], 0.0020, "brow"))
pts = []
for t in np.linspace(-1, 1, 7):
    q, _ = ray_front(t * 0.015, z0 + Hh * 0.205 + 0.0035 * t * t)
    if q: pts.append(q + Vector((0, -0.0012, 0)))
features.append(ribbon("mouth", pts, [0.0012, 0.0019, 0.0022, 0.0023, 0.0022, 0.0019, 0.0012][:len(pts)], 0.0012, "mouth"))
tick(f"cap {'on (' + OUTFIT['cap'] + ')' if CAP else 'off'}: {len(caps)} parts; face {len(features)} parts")

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
       "pelvisScale": round(KP, 5), "joints": {b.name: G(b.head_local) for b in arm.data.bones}, "outfit": OUTFIT,
       "tris": [len(o.data.polygons) for o in lods], "slots": names, "prop": {a: list(b) for a, b in PROP.items()},
       "face": {"eyeZ": round(EYE_Z, 4), "chin": round(z0, 4), "crown": round(HEAD_TOP, 4)}, "sole": 0.012}
json.dump(rig, open(os.path.join(OUT, "kid_rig.json"), "w"), indent=1)
tick(f"wrote kid_rig.json: k {KP:.4f}, tris {rig['tris']}")

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
                kp.co.y *= KP; kp.handle_left.y *= KP; kp.handle_right.y *= KP
def pose(clip, t):
    act = bpy.data.actions.get(clip)
    ad = arm.animation_data or arm.animation_data_create()
    ad.action = act
    try: ad.action_slot = act.slots[0]
    except Exception: pass
    f0, f1 = act.frame_range
    scn.frame_set(int(round(f0 + (f1 - f0) * t)))
W_ = (900, 1200)
if "--restview" in ARGV:
    for pb in arm.pose.bones: pb.matrix_basis = Matrix.Identity(4)
    preview(os.path.join(DOCS, "rest_{v}.jpg"), [("neck", 20, 10, 0.7), ("lshoulder", 60, 25, 0.6)], res=(700, 700), lens=50, samples=32, target=(0, FACE["cy"], NECK_AX.z + 0.03))
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
