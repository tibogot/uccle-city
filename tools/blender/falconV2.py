"""THE FALCON V2 (docs/FALCON_GYM.md "the model"): a Sketchfab peregrine mesh re-rigged onto the Mesh2Motion bird
skeleton (the SAME 55-bone bird rig as models/bird/peregrine.glb: viewer/birdRig.js's layers work on it unchanged),
with the Mesh2Motion bird clips (CC0) and our own falcon clips, exported to models/bird/v2/.

    blender --factory-startup -b -P tools/blender/falconV2.py -- --mesh <model.gltf|glb> --rig <mesh2motion dir> \
        --out models/bird/v2/falcon_v2.glb [--preview <dir>] [--yaw <deg>] [--tex 2048] [--far]

  --mesh     the Sketchfab download (UNTRUSTED DATA: only read by Blender's glTF importer, nothing in it is run)
  --rig      the Mesh2Motion bird assets: model.glb (rig + a skinned reference mesh) and animations/*.glb
             (fetched from github.com/Mesh2Motion/mesh2motion-app static/assets/bird, CC0: CREDITS.md)
  --yaw      turn the mesh about the vertical before fitting (when the nose auto-detection is wrong)
  --tex      the largest texture side kept (JPEG in the glb)
  --far      the far / family bird (the 7k "Falcon_ Merged Animations"): the same pipeline, the textures at 1024

Steps (all scripted, repeatable, no clicks):
  1. the rig: model.glb's armature + its reference mesh (the weights come from it); every animations/*.glb's action
     onto that armature (Flap, Glide, Idle, Walk, Hop, Take_Off -> TakeOff, Land)
  2. the mesh: every mesh object of the download joined into one, its own armature / animation dropped (the shape its
     skin gives at a frame of its own animation: --frame), transforms applied, 1.05 m span, origin at the feet; turned so the wingspan is along X and the nose toward -Y (Blender frame), the
     nose found as the denser end (the head) unless --yaw
  3. the fit: the rig + reference mesh scaled uniformly to the mesh's beak-to-tail length, moved onto it; the wing
     chains then stretched along X so the rig's wing tips reach the mesh's (the joints scale with it)
  4. the weights: a Data Transfer of the reference mesh's vertex groups (nearest face, interpolated), normalised, at
     most 4 bones a vertex; an Armature modifier
  5. our clips (keyed poses on the rig, by aiming bones as viewer/falcons.js bakes its Perch): Stoop (the tight tuck:
     wrists in, hands back along the body), Talons (legs swung forward, toes open), Flare (wings forward and up,
     tail down and fanned), Perch (upright, wings folded along the back, legs under)
  6. shading: the mesh's own normals kept where it has custom normals, else a Weighted Normal modifier (no smoothing
     across hard edges: docs/rules/blender-clean-normals.md)
  7. export: glTF binary, all actions (rotations only), PNG textures (alpha kept) + raw RGBA dumps for the KTX2 pack
     (tools/falconV2pack.mjs: meshopt + KTX2 -> models/bird/v2/), no lights / cameras; --preview: Cycles (OPTIX) renders of the
     Glide, Stoop and Perch poses under a grazing light + a checker ground (the shading check)
"""
import bpy, sys, os, math, glob
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
MESH, RIG, OUT, PREV = arg("--mesh"), arg("--rig"), arg("--out"), arg("--preview")
YAW, TEX, FAR = arg("--yaw"), int(arg("--tex", "1024" if "--far" in argv else "2048")), "--far" in argv
assert MESH and RIG and OUT, "usage: -- --mesh <file> --rig <dir> --out <glb>"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def objs(): return list(scene.objects)
def select(only):
    for o in objs(): o.select_set(o in only)
    bpy.context.view_layer.objects.active = only[0] if only else None

# ------------------------------------------------------------------------------------------------ 1. the rig
bpy.ops.import_scene.gltf(filepath=os.path.join(RIG, "model.glb"))
arm = next(o for o in objs() if o.type == "ARMATURE")
ref = next(o for o in objs() if o.type == "MESH" and o.vertex_groups)
arm.name = "FalconRig"; ref.name = "M2M_reference"
for o in objs():
    if o not in (arm, ref) and o.type == "MESH": bpy.data.objects.remove(o)
arm.animation_data_create()
for a in list(bpy.data.actions): bpy.data.actions.remove(a)
CLIPS = {"flap": "Flap", "glide": "Glide", "idle": "Idle", "walk": "Walk", "hop": "Hop", "take-off": "TakeOff", "land": "Land"}
actions = {}
for f, name in CLIPS.items():
    p = os.path.join(RIG, "animations", f + ".glb")
    if not os.path.exists(p): print(f"[falconV2] no clip {p}"); continue
    before = set(bpy.data.objects); acts0 = set(bpy.data.actions)
    bpy.ops.import_scene.gltf(filepath=p)
    new = [a for a in bpy.data.actions if a not in acts0]
    for o in set(bpy.data.objects) - before: bpy.data.objects.remove(o)
    if not new: continue
    a = new[0]; a.name = name; a.use_fake_user = True; actions[name] = a
    for x in new[1:]: bpy.data.actions.remove(x)
print(f"[falconV2] rig {arm.name}: {len(arm.data.bones)} bones, clips {sorted(actions)}")

# ------------------------------------------------------------------------------------------------ 2. the mesh
before = set(bpy.data.objects)
if MESH.lower().endswith((".glb", ".gltf")): bpy.ops.import_scene.gltf(filepath=MESH)
elif MESH.lower().endswith(".fbx"): bpy.ops.import_scene.fbx(filepath=MESH)
else: raise SystemExit(f"unknown mesh format {MESH}")
imported = [o for o in bpy.data.objects if o not in before]
meshes = [o for o in imported if o.type == "MESH" and (any(m.type == "ARMATURE" for m in o.modifiers) or o.parent is not None)]
# (the importer also makes an "Icosphere" bone-display shape: no skin, no parent: not the bird)
meshes.sort(key=lambda o: -len(o.data.vertices))
assert meshes, "no mesh in the download"
# THE BIND SHAPE. Some downloads carry vertices whose raw (bind) positions are garbage that only their skin brings
# back (the Sketchfab peregrine: 1786 of 15195 vertices hundreds of metres off in the rest pose). So the mesh is taken
# as its skin DEFORMS it at a frame of its own animation: --frame N, or the frame (every 5th) whose shape is the most
# symmetric spread-wing one in the smallest box (the bird's own "T-pose"); none: the raw positions.
import numpy as np
def shape_at(o):
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    W = np.array([tuple(ev.matrix_world @ v.co) for v in m.vertices]); ev.to_mesh_clear(); return W
arms = [m.object for o in meshes for m in o.modifiers if m.type == "ARMATURE" and m.object]
act = arms[0].animation_data.action if arms and arms[0].animation_data else None
FRAME = arg("--frame")
if act or FRAME is not None:
    if FRAME is None:
        best = None
        for f in range(int(act.frame_range[0]), int(act.frame_range[1]) + 1, 5):
            scene.frame_set(f); W = np.vstack([shape_at(o) for o in meshes]); lo_, hi_ = W.min(0), W.max(0); ext = hi_ - lo_
            sym = min(-lo_[0], hi_[0]) / max(-lo_[0], hi_[0], 1e-9) if lo_[0] < 0 < hi_[0] else 0
            # symmetric (>= 0.95) and compact: the smallest box for its span (a stray part stretches the box)
            score = ext[0] ** 3 / max(ext[0] * ext[1] * ext[2], 1e-12) if sym >= 0.95 and ext[0] > ext[1] else -1
            if best is None or score > best[0]: best = (score, f)
        FRAME = best[1]
    scene.frame_set(int(FRAME))
    for o in meshes:
        dg = bpy.context.evaluated_depsgraph_get()
        nm = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        o.data = nm
    print(f"[falconV2] bind shape: the skin's deformation at frame {FRAME}")
for o in meshes:
    for m in list(o.modifiers):
        if m.type == "ARMATURE": o.modifiers.remove(m)
for o in meshes:
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    if o.data.shape_keys: o.shape_key_clear()
    o.vertex_groups.clear()
for o in imported:
    if o not in meshes: bpy.data.objects.remove(o)
for a in list(bpy.data.actions):
    if a.name not in actions: bpy.data.actions.remove(a)
select(meshes)
if len(meshes) > 1: bpy.ops.object.join()
tgt = meshes[0]; tgt.name = "FalconV2"
print(f"[falconV2] mesh objects joined: {len(meshes)}")
select([tgt]); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
me = tgt.data
def bbox(o):
    xs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs))); hi = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    return lo, hi, xs
lo, hi, P = bbox(tgt)
if hi.y - lo.y > hi.x - lo.x:                      # the span along Y: a quarter turn
    tgt.rotation_euler.z = math.pi / 2; select([tgt]); bpy.ops.object.transform_apply(rotation=True); lo, hi, P = bbox(tgt)
if YAW is not None:
    tgt.rotation_euler.z = math.radians(float(YAW)); select([tgt]); bpy.ops.object.transform_apply(rotation=True); lo, hi, P = bbox(tgt)
else:
    # the nose: the end (along Y) with more vertices within its last 18 % (the head is the detailed end)
    L = hi.y - lo.y
    nlo = sum(1 for v in P if v.y < lo.y + 0.18 * L); nhi = sum(1 for v in P if v.y > hi.y - 0.18 * L)
    if nhi > nlo:                                    # the head toward +Y: turn it to -Y (the rig's nose)
        tgt.rotation_euler.z = math.pi; select([tgt]); bpy.ops.object.transform_apply(rotation=True); lo, hi, P = bbox(tgt)
span, length = hi.x - lo.x, hi.y - lo.y
# life size: the wingspan to SPAN m (a juvenile female ~1.05 m), whatever units the download uses
SPAN = float(arg("--span", "1.05"))
kk = SPAN / span
tgt.scale = (kk, kk, kk); select([tgt]); bpy.ops.object.transform_apply(scale=True); lo, hi, P = bbox(tgt)
# the origin at the bird's feet: the box's bottom centre (the loader puts the root there)
tgt.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z); select([tgt]); bpy.ops.object.transform_apply(location=True); lo, hi, P = bbox(tgt)
span, length = hi.x - lo.x, hi.y - lo.y
# one UV map (the first: the one the textures use), no shape keys; the extra sets a scan export carries cost bytes only
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
print(f"[falconV2] mesh {len(me.vertices)} verts {len(me.polygons)} faces, span {span:.3f} length {length:.3f} height {hi.z - lo.z:.3f}")
if span < 1.3 * length: print("[falconV2] WARNING: the wings do not look spread (span < 1.3 x length): the fit needs a spread-wing bind pose")

# ------------------------------------------------------------------------------------------------ 3. the fit
rlo, rhi, _ = bbox(ref)
k = length / (rhi.y - rlo.y)
c_t = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)); c_r = Vector(((rlo.x + rhi.x) / 2, (rlo.y + rhi.y) / 2, rlo.z))
for o in (arm, ref):
    o.matrix_world = Matrix.Translation(c_t) @ Matrix.Scale(k, 4) @ Matrix.Translation(-c_r) @ o.matrix_world
select([arm, ref]); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
rlo, rhi, _ = bbox(ref)
sx = span / max(rhi.x - rlo.x, 1e-6)
print(f"[falconV2] fit: uniform x{k:.3f}, wings x{sx:.3f}")
# the wing chains stretched along X about each shoulder (edit bones), the reference mesh's wing verts likewise
select([arm]); bpy.ops.object.mode_set(mode="EDIT")
for side in ("L", "R"):
    sh = arm.data.edit_bones.get(f"wing_1_{side}")
    if not sh: continue
    x0 = sh.head.x
    for eb in arm.data.edit_bones:
        if eb.name.startswith("wing_") and eb.name.endswith("_" + side):
            eb.head.x = x0 + (eb.head.x - x0) * sx; eb.tail.x = x0 + (eb.tail.x - x0) * sx
bpy.ops.object.mode_set(mode="OBJECT")
for v in ref.data.vertices:
    if abs(v.co.x) > 0.15 * (rhi.x - rlo.x) / 2: v.co.x = math.copysign(abs(v.co.x) * sx + (1 - sx) * 0.15 * (rhi.x - rlo.x) / 2, v.co.x)

# ------------------------------------------------------------------------------------------------ 4. the weights
for g in ref.vertex_groups: tgt.vertex_groups.new(name=g.name)
dt = tgt.modifiers.new("weights", "DATA_TRANSFER")
dt.object = ref; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
select([tgt]); bpy.ops.object.datalayout_transfer(modifier=dt.name); bpy.ops.object.modifier_apply(modifier=dt.name)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
bpy.ops.object.vertex_group_limit_total(limit=4)
bpy.ops.object.vertex_group_normalize_all(lock_active=False)
# THE LEGS RIGID. The download's legs (hanging in its bind pose) do not lie along the rig's (tucked) leg bones: a
# nearest-surface transfer splits a foot between the leg, the hips and the tail and the toes stretch into streaks.
# Every vertex below the thighs (and inside the body's width) or mostly on a leg bone follows its side's thigh alone:
# the leg swings as one piece (the flight layers and the Talons / Perch clips turn the thigh), never stretches.
bpy.context.view_layer.update()
gi = {g.name: g.index for g in tgt.vertex_groups}
LEGB = ("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes")
hz = min((arm.matrix_world @ arm.data.bones[f"UpperLeg_{s_}"].head_local).z for s_ in ("L", "R"))
lx = max(abs((arm.matrix_world @ arm.data.bones[f"UpperLeg_{s_}"].head_local).x) for s_ in ("L", "R"))
rigid = 0
for v in me.vertices:
    w = {tgt.vertex_groups[g.group].name: g.weight for g in v.groups}
    legw = sum(x for k, x in w.items() if k.startswith(LEGB))
    if legw > 0.12 or (v.co.z < hz - 0.01 and abs(v.co.x) < lx * 3):
        side = "L" if v.co.x >= 0 else "R"
        for g in list(v.groups): tgt.vertex_groups[g.group].remove([v.index])
        tgt.vertex_groups[f"UpperLeg_{side}"].add([v.index], 1.0, "REPLACE"); rigid += 1
print(f"[falconV2] legs: {rigid} vertices rigid on the thighs (below z {hz:.3f})")
am = tgt.modifiers.new("rig", "ARMATURE"); am.object = arm
tgt.parent = arm
bpy.data.objects.remove(ref)

# ------------------------------------------------------------------------------------------------ 5. our clips
def pose_reset():
    for pb in arm.pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def aim(name, d, roll=0.0):
    """turn pose bone `name` so it points along d (armature space, Blender frame: X left wing, -Y nose, Z up)"""
    pb = arm.pose.bones.get(name)
    if not pb: return
    bpy.context.view_layer.update()
    cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    q = cur.rotation_difference(Vector(d).normalized())
    M = pb.matrix.copy(); loc = M.to_translation()
    R = (q.to_matrix() @ M.to_3x3()).to_4x4(); R.translation = loc
    pb.matrix = R
def capture(clip, frame=1):
    """the pose of a clip at a frame: {bone: quaternion} (the Mesh2Motion ground clips fold the wings properly)"""
    act = actions.get(clip)
    if not act: return {}
    arm.animation_data.action = act
    if act.slots: arm.animation_data.action_slot = act.slots[0]
    scene.frame_set(frame); bpy.context.view_layer.update()
    out = {pb.name: pb.rotation_quaternion.copy() for pb in arm.pose.bones}
    arm.animation_data.action = None
    return out
def key_clip(name, poses, frames):
    """poses: list of (base, {bone: dir}) keyed at frames (24 fps): the base pose (captured quaternions, the wings
    folded) then bones aimed along dirs; '*' = both sides, mirrored in X"""
    act = bpy.data.actions.new(name); act.use_fake_user = True
    arm.animation_data.action = act
    for f, (base, P) in zip(frames, poses):
        pose_reset()
        for pb in arm.pose.bones:
            if pb.name in base and (pb.name.startswith("wing") or name == "Perch"): pb.rotation_quaternion = base[pb.name]
        for bname, d in P.items():
            if bname.endswith("*"):
                for s in ("L", "R"): aim(bname[:-1] + "_" + s, (d[0] * (1 if s == "L" else -1), d[1], d[2]))
            else: aim(bname, d)
        bpy.context.view_layer.update()
        for pb in arm.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f)
    actions[name] = act
    arm.animation_data.action = None
    return act
# directions (Blender frame: +X = the left wing's side, -Y = the nose, +Z = up)
FOLDED = capture("Idle", 1)
SPREAD = {}
STOOP = {"tail_1": (0, 1, 0.03), "tail_2": (0, 1, 0), "tail_3": (0, 1, 0), "UpperLeg*": (0.08, 0.75, -0.25), "LowerLeg*": (0.03, 1, -0.05), "AnkleLeg*": (0, 1, 0), "Foot*": (0, 1, 0.1), "head": (0, -1, 0.08)}
TALONS = {"UpperLeg*": (0.15, -0.6, -0.8), "LowerLeg*": (0.1, -0.85, -0.5), "AnkleLeg*": (0.05, -0.6, -0.8), "Foot*": (0.05, -1, -0.1), "Toes*": (0.15, -1, 0.1), "tail_1": (0, 0.85, -0.5)}
FLARE = {"wing_1*": (0.75, -0.3, 0.6), "tail_1": (0, 0.7, -0.7), "tail_2": (0, 0.75, -0.65), **{k: v for k, v in TALONS.items() if not k.startswith("tail")}}
key_clip("Stoop", [(FOLDED, STOOP), (FOLDED, STOOP)], [0, 12])
key_clip("Talons", [(SPREAD, TALONS), (SPREAD, TALONS)], [0, 12])
key_clip("Flare", [(SPREAD, FLARE), (SPREAD, {**FLARE, "wing_1*": (0.7, -0.4, 0.62)}), (SPREAD, FLARE)], [0, 6, 12])
key_clip("Perch", [(FOLDED, {}), (capture("Idle", 13), {}), (FOLDED, {})], [0, 24, 48])
pose_reset(); arm.animation_data.action = None
print(f"[falconV2] clips {sorted(actions)}")

# ------------------------------------------------------------------------------------------------ 6. shading
if not me.has_custom_normals:
    wn = tgt.modifiers.new("normals", "WEIGHTED_NORMAL"); wn.keep_sharp = True
    select([tgt]); bpy.ops.object.modifier_apply(modifier=wn.name)
# the materials: named slots (no baked colour change), textures capped to TEX
for i, slot in enumerate(tgt.material_slots):
    if slot.material and not slot.material.name.startswith("falcon_"): slot.material.name = f"falcon_{i}_{slot.material.name}"[:60]
for img in bpy.data.images:
    if img.size[0] > TEX or img.size[1] > TEX:
        s = TEX / max(img.size); img.scale(max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s)))

# ------------------------------------------------------------------------------------------------ 7. export (+ previews)
# rotations only: the Mesh2Motion clips' bone translations are in its own unscaled units (the hips 1.2 m up after
# the fit); the bone lengths are ours
for act in actions.values():
    for layer in act.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in list(cb.fcurves):
                    if fc.data_path.endswith((".location", ".scale")): cb.fcurves.remove(fc)
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
select([arm, tgt])
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_optimize_animation_size=True, export_image_format="AUTO", export_lights=False, export_cameras=False,
    export_skins=True, export_all_influences=False, export_yup=True, export_apply=False)
# the textures as raw RGBA (top row first) + their colour space, for the pack step's KTX2 (tools/falconV2pack.mjs)
TEXDIR = OUT + ".tex"; os.makedirs(TEXDIR, exist_ok=True)
import json
meta = {}
for img in bpy.data.images:
    if img.users == 0 or img.size[0] == 0: continue
    w, h = img.size; px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    a = (np.clip(px.reshape(h, w, 4)[::-1], 0, 1) * 255 + 0.5).astype(np.uint8)
    fn = "".join(c if c.isalnum() or c in "._-" else "_" for c in img.name)
    a.tofile(os.path.join(TEXDIR, fn + ".rgba"))
    meta[img.name] = {"file": fn + ".rgba", "width": w, "height": h, "srgb": img.colorspace_settings.name.lower().startswith("srgb")}
json.dump(meta, open(os.path.join(TEXDIR, "textures.json"), "w"), indent=1)
tris = sum(len(p.vertices) - 2 for p in me.polygons)
print(f"[falconV2] wrote {OUT}: {tris} triangles, {len(actions)} clips")

if PREV:
    os.makedirs(PREV, exist_ok=True)
    scene.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "OPTIX"; prefs.get_devices()
        for d in prefs.devices: d.use = True
        scene.cycles.device = "GPU"
    except Exception as e: print(f"[falconV2] OPTIX unavailable ({e}): CPU")
    scene.cycles.samples = 48; scene.render.resolution_x = 960; scene.render.resolution_y = 640
    lo, hi, _ = bbox(tgt)
    c = (lo + hi) / 2; R = max(hi.x - lo.x, hi.y - lo.y)
    bpy.ops.mesh.primitive_plane_add(size=R * 8, location=(c.x, c.y, lo.z - 0.02 * R))
    ground = bpy.context.active_object; gm = bpy.data.materials.new("checker"); gm.use_nodes = True
    nt = gm.node_tree; ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 24
    nt.links.new(ck.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"]); ground.data.materials.append(gm)
    sun = bpy.data.objects.new("grazing", bpy.data.lights.new("grazing", "SUN")); scene.collection.objects.link(sun)
    sun.data.energy = 4; sun.rotation_euler = (math.radians(78), 0, math.radians(35))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
    cam.location = c + Vector((R * 0.9, -R * 1.1, R * 0.7)); cam.rotation_euler = (Vector((c - cam.location))).to_track_quat("-Z", "Y").to_euler()
    scene.world = bpy.data.worlds.new("w"); scene.world.color = (0.5, 0.55, 0.6)
    for clip in ("Glide", "Stoop", "Perch", "Flare"):
        if clip not in actions: continue
        arm.animation_data.action = actions[clip]
        if actions[clip].slots: arm.animation_data.action_slot = actions[clip].slots[0]
        scene.frame_set(1)
        # frame the POSED bird (the evaluated mesh), a three-quarter view from the front left, a little above
        ev = tgt.evaluated_get(bpy.context.evaluated_depsgraph_get()); em = ev.to_mesh()
        V = [ev.matrix_world @ v.co for v in em.vertices]; ev.to_mesh_clear()
        a = Vector((min(v.x for v in V), min(v.y for v in V), min(v.z for v in V))); b = Vector((max(v.x for v in V), max(v.y for v in V), max(v.z for v in V)))
        cc = (a + b) / 2; RR = max((b - a).length, 0.1)
        ground.location.z = a.z - 0.01 * RR
        cam.location = cc + Vector((0.55, -0.85, 0.45)).normalized() * RR * 1.35
        cam.rotation_euler = (cc - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = os.path.join(PREV, f"v2_{clip.lower()}.png"); bpy.ops.render.render(write_still=True)
    print(f"[falconV2] previews in {PREV}")
