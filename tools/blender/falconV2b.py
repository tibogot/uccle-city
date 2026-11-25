"""THE FALCON V2, BASE B (docs/FALCON_GYM.md "the model", rule falcon-gym "the v2 base"): Hector Bonada's "Falcon_ Merged
Animations" (Sketchfab, CC BY 4.0: CREDITS.md) re-rigged onto OUR bird rig's bone names (viewer/birdRig.js's layers,
the gym, the checks), with its OWN skin weights and its OWN authored motion, plus our clips for what it lacks.

    blender --factory-startup -b -P tools/blender/falconV2b.py -- --mesh <falcon__merged_animations.glb> \
        --out <src>/build/falcon_v2.raw.glb [--bind 48] [--span 1.05]
    node tools/falconV2pack.mjs <src>/build/falcon_v2.raw.glb models/bird/v2/falcon_v2.glb

Why this base (2026-11-25, the owner: "plenty of holes in its body", "the model looks good on Sketchfab"): the first v2
(tools/blender/falconV2.py, the 25k "peregrine_falcon" download) is built of separate tube-like feather cards on a
spread-wing bind; every fold opened gaps between them. This model has continuous wing and tail surfaces with painted
feathers, a closed perched idle with the toes flat on the ground, a take-off, a glide and a landing.

Steps (all scripted, the download untouched: UNTRUSTED DATA, only read by Blender's glTF importer):
  1. the download: its armature (95 joints), three meshes (body, eyes, flight feathers: three materials), one action
     "Scene" at 24 fps: idle perched f1-178, take-off f184-232, glide f238-304, landing f310-346, idle again
  2. THE BIND: the importer's bone rest does not match the skin's bind (its rest wing tips coincide), so the bind is a
     frame of its own animation (--bind, default 48: the perched idle, the hero pose, reproduced exactly): the mesh as
     its skin deforms it there, the bones as posed there
  3. OUR FRAME: nose -Y, up +Z, the left wing +X (Blender), uniform scale to --span (the glide's wing tips), the feet
     at the origin
  4. THE RIG: the download's own skeleton, every bone renamed to our rig's name where it has one (BONEMAP), the others
     kept as "b_<name>"; our bones it lacks added as helpers (root, spine_3, tail_tip, wing_tip): the 55 names are all
     there, so the layers / clip names / checks work
  5. THE SKIN: the download's own weights, bone for bone (renamed): no transfer, no rigid cards: its surfaces stay
     continuous
  6. ITS CLIPS, baked exactly (every bone's posed matrix -> our local rotation): Perch / Idle (the idle, looped),
     TakeOff, Glide (a held glide frame), Flap (one beat of its own, looped), Land
  7. OUR CLIPS from its poses: Stoop, Talons, Flare, Walk, Hop (see their functions)
  8. export (rotations + the root's translation), raw RGBA texture dumps for the pack, the juvenile plumage
"""
import bpy, sys, os, math, re, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None): return argv[argv.index(k) + 1] if k in argv else d
MESH, OUT = arg("--mesh"), arg("--out")
BIND, SPAN = int(arg("--bind", "48")), float(arg("--span", "1.05"))
GLIDE_F = int(arg("--glide", "256"))
JUV = "--no-juvenile" not in argv
assert MESH and OUT, "usage: -- --mesh <glb> --out <raw.glb>"
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def upd(): bpy.context.view_layer.update()
def select(only):
    for o in scene.objects: o.select_set(o in only)
    bpy.context.view_layer.objects.active = only[0] if only else None

# ------------------------------------------------------------------------------------------------ 1. the download
bpy.ops.import_scene.gltf(filepath=MESH)
SA = next(o for o in scene.objects if o.type == "ARMATURE")
SM = [o for o in scene.objects if o.type == "MESH" and any(m.type == "ARMATURE" for m in o.modifiers)]
SACT = SA.animation_data.action
scene.render.fps = 24
def base(n): return re.sub(r"_bone_?\d*(\.\d+)?$", "", n).replace("falcon_", "")   # "falcon_l_Humerus_bone_078" -> "l_Humerus"
print(f"[v2b] download: {len(SA.pose.bones)} bones, meshes {[(o.name, len(o.data.vertices)) for o in SM]}, action {SACT.name} {tuple(SACT.frame_range)}")

# ------------------------------------------------------------------------------------------------ 4. the name map
BONEMAP = {"_rootJoint": "hips", "Spine1": "spine_0", "Spine3": "spine_1", "Neck": "spine_2", "Head": "head",
           "Beak": "mouth_upper", "Beak-nub": "mouth_upper_tip", "Mandible": "mouth_lower", "Mandible-nub": "mouth_lower_tip",
           "Tail": "tail_1", "TF1": "tail_2", "TF1-nub": "tail_3"}
for s, S in (("l", "L"), ("r", "R")):
    BONEMAP.update({f"{s}_Thigh": f"UpperLeg_{S}", f"{s}_Knee": f"LowerLeg_{S}", f"{s}_Ankle": f"AnkleLeg_{S}", f"{s}_Toe": f"Foot_{S}",
                    f"{s}_DigitIII_1": f"Toes_{S}", f"{s}_DigitIII_2": f"Toes_tip_{S}",
                    f"{s}_Humerus": f"wing_1_{S}", f"{s}_Ulna": f"wing_2_{S}", f"{s}_Aula": f"wing_3_{S}", f"{s}_Pollex": f"wing_4_{S}", f"{s}_Pollex-nub": f"wing_5_{S}",
                    f"{s}_SF2": f"wing_feather_1_1_{S}", f"{s}_SF2-nub": f"wing_feather_1_2_{S}", f"{s}_SF3": f"wing_feather_2_1_{S}", f"{s}_SF3-nub": f"wing_feather_2_2_{S}",
                    f"{s}_PF2": f"wing_feather_3_1_{S}", f"{s}_PF2-nub": f"wing_feather_3_2_{S}", f"{s}_PF1": f"wing_feather_4_1_{S}", f"{s}_PF1-nub": f"wing_feather_4_2_{S}",
                    f"{s}_TF2": f"tail_fan_1_{S}", f"{s}_TF3": f"tail_fan_2_{S}"})
SKIP = set()                                          # (the importer made the Pelvis node the armature: its _rootJoint is the pelvis)
SRCB = [pb for pb in SA.pose.bones if pb.name not in SKIP]
NAME = {pb.name: BONEMAP.get(base(pb.name), "b_" + base(pb.name)) for pb in SRCB}
assert len(set(NAME.values())) == len(NAME), "two download bones on one name"

# ------------------------------------------------------------------------------------------------ 2-3. the bind and our frame
def src_world(f):
    """the download's posed bone matrices (world, unit-free rotation) at frame f"""
    scene.frame_set(f); upd()
    out = {}
    for pb in SRCB:
        M = SA.matrix_world @ pb.matrix
        out[pb.name] = (M.to_3x3().normalized(), M.translation.copy(), (SA.matrix_world @ pb.tail - SA.matrix_world @ pb.head).length)
    return out
G = src_world(GLIDE_F)
tipL, tipR = G[[n for n in NAME if NAME[n] == "wing_5_L"][0]][1], G[[n for n in NAME if NAME[n] == "wing_5_R"][0]][1]
K = SPAN / (tipL - tipR).length
B0 = src_world(BIND)
feet = [B0[n][1] for n in NAME if NAME[n].startswith("Foot_")]
# (the download's world: up +Z, the nose toward -Y already; checked: its left wing (l_) at +X)
ORG = Vector(((feet[0].x + feet[1].x) / 2, (feet[0].y + feet[1].y) / 2, 0.0))
def to_ours(R, P): return R, (P - ORG) * K
lw = [B0[n][1] for n in NAME if NAME[n] == "wing_1_L"][0]
assert lw.x > ORG.x, "the download's l_ wing is not at +X: the frame needs a turn"
print(f"[v2b] bind f{BIND}, glide f{GLIDE_F}: scale x{K:.3f} (glide span {(tipL - tipR).length:.3f} -> {SPAN})")

# the rig: edit bones at the bind's posed matrices (our frame), parents as the download's, renamed
RIG = bpy.data.armatures.new("FalconRig"); arm = bpy.data.objects.new("FalconRig", RIG); scene.collection.objects.link(arm)
select([arm]); bpy.ops.object.mode_set(mode="EDIT"); EB = RIG.edit_bones
REST = {}
for pb in SRCB:
    R, P, L = B0[pb.name]; R, P = to_ours(R, P)
    eb = EB.new(NAME[pb.name]); eb.head = (0, 0, 0); eb.tail = (0, max(L * K, 0.004), 0)
    eb.matrix = Matrix.LocRotScale(P, R.to_quaternion(), None); REST[NAME[pb.name]] = Matrix.LocRotScale(P, R.to_quaternion(), None)
for pb in SRCB:
    if pb.parent and pb.parent.name in NAME: EB[NAME[pb.name]].parent = EB[NAME[pb.parent.name]]
# our helpers: root (the feet's origin), spine_3 (mid-neck: the head's parent), tail_tip, wing_tip
r = EB.new("root"); r.head = (0, 0, 0); r.tail = (0, 0, 0.05); EB["hips"].parent = r
n2, hd = EB["spine_2"], EB["head"]
s3 = EB.new("spine_3"); s3.head = (n2.head + hd.head) / 2; s3.tail = hd.head.copy(); s3.align_roll(n2.z_axis); s3.parent = n2; hd.parent = s3
t3 = EB["tail_3"]; tt = EB.new("tail_tip"); tt.head = t3.head.copy(); tt.tail = t3.head + (t3.head - EB["tail_2"].head).normalized() * 0.02; tt.parent = t3
for S in "LR":
    w5 = EB[f"wing_5_{S}"]; wt = EB.new(f"wing_tip_{S}"); d = (w5.head - EB[f"wing_4_{S}"].head).normalized()
    wt.head = w5.head + d * 0.005; wt.tail = w5.head + d * 0.02; wt.parent = w5
for eb in EB: eb.use_connect = False
bpy.ops.object.mode_set(mode="OBJECT"); upd()
for b in RIG.bones: REST[b.name] = b.matrix_local.copy()
OURS55 = ["root", "hips", "spine_0", "spine_1", "spine_2", "spine_3", "head", "mouth_upper", "mouth_upper_tip", "mouth_lower", "mouth_lower_tip",
          "tail_1", "tail_2", "tail_3", "tail_tip"] + [f"{n}_{S}" for S in "LR" for n in ("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes", "Toes_tip",
          "wing_1", "wing_2", "wing_3", "wing_4", "wing_5", "wing_tip", "wing_feather_1_1", "wing_feather_1_2", "wing_feather_2_1", "wing_feather_2_2",
          "wing_feather_3_1", "wing_feather_3_2", "wing_feather_4_1", "wing_feather_4_2")]
missing = [n for n in OURS55 if n not in RIG.bones]
assert not missing, f"our rig names missing: {missing}"
print(f"[v2b] rig: {len(RIG.bones)} bones (our 55 names + {len(RIG.bones) - 55} of the download's own: tail fans, digits, clavicles...)")

# ------------------------------------------------------------------------------------------------ 5. the skin
scene.frame_set(BIND); upd()
for o in SM:
    dg = bpy.context.evaluated_depsgraph_get()
    nm = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg); o.data = nm
for o in SM:
    for m in list(o.modifiers): o.modifiers.remove(m)
    mw = o.matrix_world.copy(); o.parent = None; o.matrix_world = mw
    for g in o.vertex_groups:
        if g.name in NAME: g.name = NAME[g.name]
select(SM); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in SM:
    for v in o.data.vertices: v.co = (v.co - ORG) * K
    o.data.update()
mesh_names = [o.name for o in SM]
select(SM); bpy.ops.object.join(); tgt = bpy.context.view_layer.objects.active; tgt.name = "FalconV2"; me = tgt.data
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
_mw = SA.matrix_world.copy(); SA.parent = None; SA.matrix_world = _mw; upd()   # (its parents, the importer's empties, go)
for o in list(scene.objects):
    if o not in (arm, tgt, SA): bpy.data.objects.remove(o)
for g in list(tgt.vertex_groups):
    if g.name not in RIG.bones: tgt.vertex_groups.remove(g)
am = tgt.modifiers.new("rig", "ARMATURE"); am.object = arm; tgt.parent = arm
NV = len(me.vertices)
CO = np.array([tuple(v.co) for v in me.vertices])
GN = [g.name for g in tgt.vertex_groups]
print(f"[v2b] mesh: {NV} vertices, {sum(len(p.vertices) - 2 for p in me.polygons)} triangles, materials {[m.name for m in me.materials]}, box {tuple(round(x, 3) for x in CO.min(0))} .. {tuple(round(x, 3) for x in CO.max(0))}")

# ------------------------------------------------------------------------------------------------ 6. its clips, baked
ORDER = sorted(RIG.bones, key=lambda b: len(b.parent_recursive))
SRC_OF = {v: k for k, v in NAME.items()}
def locals_from_world(W):
    """our pose locals (matrix_basis) from target armature-space matrices W (missing: the bone follows its parent)"""
    PW, out = {}, {}
    for b in ORDER:
        n = b.name; rel = (REST[b.parent.name].inverted() @ REST[n]) if b.parent else REST[n]
        par = PW[b.parent.name] if b.parent else Matrix.Identity(4)
        if n in W: L = rel.inverted() @ par.inverted() @ W[n]; PW[n] = W[n]
        else: L = Matrix.Identity(4); PW[n] = par @ rel
        out[n] = L
    return out
arm.animation_data_create()
actions = {}
def set_action(a, act_):
    a.animation_data.action = act_
    if act_ is not None and act_.slots: a.animation_data.action_slot = act_.slots[0]
def key_locals(act_, f, Ls):
    for n, L in Ls.items():
        pb = arm.pose.bones[n]; pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = L.to_quaternion()
        pb.keyframe_insert("rotation_quaternion", frame=f)
        if n == "root": pb.location = L.translation; pb.keyframe_insert("location", frame=f)
def src_locals(f):
    W = {NAME[n]: Matrix.LocRotScale(to_ours(R, P)[1], R.to_quaternion(), None) for n, (R, P, L) in src_world(f).items()}
    return locals_from_world(W)
def slerpL(A, B_, u):
    return {n: Matrix.LocRotScale(A[n].translation.lerp(B_[n].translation, u), A[n].to_quaternion().slerp(B_[n].to_quaternion(), u), None) for n in A}
def bake(name, frames, loop=False, fade=0):
    """the download's frames as our clip `name` (keys at 0, 1, ...); loop: the last `fade` frames blend into the first"""
    act_ = bpy.data.actions.new(name); act_.use_fake_user = True; set_action(arm, act_)
    Ls = [src_locals(f) for f in frames]
    if loop and fade:
        for i in range(fade):
            k = len(Ls) - fade + i; u = (i + 1) / (fade + 1); Ls[k] = slerpL(Ls[k], Ls[0], u * u * (3 - 2 * u))
        Ls.append(Ls[0])
    tmax = 0.0
    for i, L in enumerate(Ls):
        key_locals(act_, i, L)
        tmax = max(tmax, max(L[n].translation.length for n in L if n not in ("root",)))
    set_action(arm, None); actions[name] = act_
    print(f"[v2b] {name}: {len(Ls)} frames from the download's {frames[0]}..{frames[-1]}{' (looped)' if loop else ''}; largest bone translation dropped {tmax * 100:.2f} cm")
    return Ls
# (diagnostics: the download still animates, and which bones carry a translation in their locals)
for f_ in (48, 200, 256):
    W_ = src_world(f_); n_ = [k for k in NAME if NAME[k] == "wing_5_L"][0]; print(f"[v2b] diag f{f_} wing_5_L at {tuple(round(x, 3) for x in W_[n_][1])}")
Ld = src_locals(256); big = sorted(((L.translation.length, n) for n, L in Ld.items()), reverse=True)[:5]; print("[v2b] diag translations f256:", [(n, round(t, 3)) for t, n in big])
Ld = src_locals(BIND); big = sorted(((L.translation.length, n) for n, L in Ld.items()), reverse=True)[:3]; print("[v2b] diag translations at the bind:", [(n, round(t, 4)) for t, n in big])
PERCH_L = bake("Perch", list(range(24, 179)), loop=True, fade=24)
bake("TakeOff", list(range(178, 239)))
GLIDE_L = src_locals(GLIDE_F)
bake("Land", list(range(304, 353)))

# a flap: the download's beat whose ends match best (take-off f186-236), looped
def pose_diff(A, B_): return sum(A[n].to_quaternion().rotation_difference(B_[n].to_quaternion()).angle for n in A if n.startswith("wing"))
cand = {f: src_locals(f) for f in range(186, 237)}
best = min(((a, p) for a in range(186, 224) for p in range(9, 17) if a + p in cand), key=lambda ap: pose_diff(cand[ap[0]], cand[ap[0] + ap[1]]))
fa, fp = best
act_ = bpy.data.actions.new("Flap"); act_.use_fake_user = True; set_action(arm, act_)
for i in range(fp + 1): key_locals(act_, i, cand[fa + i] if i < fp else cand[fa])
set_action(arm, None); actions["Flap"] = act_
print(f"[v2b] Flap: the download's beat f{fa}-{fa + fp} ({fp} frames), ends {math.degrees(pose_diff(cand[fa], cand[fa + fp])):.0f} deg apart (summed) before the loop")

os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
json.dump({"bind": BIND, "glide": GLIDE_F, "scale": K}, open(OUT + ".v2b.json", "w"))

def held(name, L, n=12):
    act_ = bpy.data.actions.new(name); act_.use_fake_user = True; set_action(arm, act_)
    key_locals(act_, 0, L); key_locals(act_, n, L); set_action(arm, None); actions[name] = act_


# ------------------------------------------------------------------------------------------------ 7. our clips, from its poses
PB = arm.pose.bones
def apply_L(Ls):
    for n, L in Ls.items():
        pb = PB[n]; pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = L.to_quaternion(); pb.location = L.translation if n == "root" else (0, 0, 0)
    upd()
def aim(name, d):
    """turn pose bone `name` so its line (Y) points along d (armature space: +X the left wing, -Y the nose, +Z up)"""
    upd(); pb = PB[name]; cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    q = cur.rotation_difference(Vector(d).normalized()); M = pb.matrix.copy()
    R = (q.to_matrix() @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R
def turn(name, axis, ang):
    upd(); pb = PB[name]; M = pb.matrix.copy()
    R = (Matrix.Rotation(ang, 3, Vector(axis).normalized()) @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R
def aims(P):
    for n, d in P.items():
        if n.endswith("*"):
            for S, sg in (("L", 1), ("R", -1)): aim(n[:-1] + "_" + S, (d[0] * sg, d[1], d[2]))
        else: aim(n, d)
    upd()
def kids(n): return [c.name for c in RIG.bones[n].children]
def chains(S):
    """the toes of a foot: lists of joints from the foot out (the nubs, the ends, left out)"""
    out = []
    for c in kids(f"Foot_{S}"):
        if "nub" in c: continue
        ch = [c]
        while True:
            nx = [k for k in kids(ch[-1]) if "nub" not in k]
            if not nx: break
            ch.append(nx[0])
        out.append(ch)
    return out
DIGITS = {S: [b for ch in chains(S) for b in ch] for S in "LR"}
def curl(S, ang):
    """every toe joint turned toward the sole (+) or opened (-) by ang deg: the closed grip in flight"""
    for ch in chains(S):
        for b in ch:
            upd(); n_ = (PB[f"AnkleLeg_{S}"].head - PB[f"Foot_{S}"].head).normalized(); d = (PB[b].matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
            ax = n_.cross(d)
            if ax.length > 1e-4: turn(b, ax, math.radians(ang))
def copy_locals(Ls, names):
    for n in names: PB[n].rotation_quaternion = Ls[n].to_quaternion()
    upd()
def body_angle():
    upd(); d = PB["spine_1"].head - PB["hips"].head; return math.degrees(math.atan2(d.z, -d.y))
def eval_co():
    ev = tgt.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    a_ = np.empty(len(m.vertices) * 3); m.vertices.foreach_get("co", a_); ev.to_mesh_clear(); return a_.reshape(-1, 3)
def wmask(prefixes):
    gi = [i for i, n in enumerate(GN) if n.startswith(prefixes)]
    return np.array([any(g.group in gi and g.weight > 0.5 for g in v.groups) for v in me.vertices])
PADV = {S: wmask(tuple(DIGITS[S])) for S in "LR"}
FOOTV = {S: PADV[S] | wmask((f"Foot_{S}",)) for S in "LR"}
TAILV = wmask(("tail", "b_l_TF", "b_r_TF", "b_Tail"))
def jl(a, b): return (Vector(REST[b].translation) - Vector(REST[a].translation)).length
LEN = {S: (jl(f"UpperLeg_{S}", f"LowerLeg_{S}"), jl(f"LowerLeg_{S}", f"AnkleLeg_{S}"), jl(f"AnkleLeg_{S}", f"Foot_{S}")) for S in "LR"}
def leg_stand(S, T, tarsus_back=0.25):
    """the leg from the foot up (as V2 POLISH's Perch): the foot's joint at T, the tarsus near upright (tilted back),
    the femur and the shank by two-bone IK from the hip with the knee forward (in the belly)"""
    upd(); lf, a, b = LEN[S]; H = PB[f"UpperLeg_{S}"].head.copy()
    J = T + Vector((0, math.sin(tarsus_back), math.cos(tarsus_back))) * b
    D = J - H; d = min(max(D.length, abs(lf - a) + 1e-4), lf + a - 1e-4); u = D.normalized()
    pole = Vector((0, -1, 0)); w = (pole - u * pole.dot(u)).normalized()
    ca = (lf * lf + d * d - a * a) / (2 * lf * d); Kp = H + (u * ca + w * math.sqrt(max(0.0, 1 - ca * ca))) * lf
    aim(f"UpperLeg_{S}", Kp - H); aim(f"LowerLeg_{S}", H + u * d - Kp); aim(f"AnkleLeg_{S}", T - J)
KEEPLOC = set()
def key_clip(name, posers, frames):
    act_ = bpy.data.actions.new(name); act_.use_fake_user = True; set_action(arm, act_)
    for f, fn in zip(frames, posers):
        fn(); upd()
        for pb in PB:
            pb.keyframe_insert("rotation_quaternion", frame=f)
        PB["root"].keyframe_insert("location", frame=f)
    set_action(arm, None); actions[name] = act_
IDLE = PERCH_L[0]                                    # (refreshed from the keyed Perch after off_floor, below)
apply_L(IDLE)
IDLE_PITCH = body_angle()
IDLE_FOOT = {S: Vector(PB[f"Foot_{S}"].head) for S in "LR"}
IDLE_HIP = (PB["UpperLeg_L"].head + PB["UpperLeg_R"].head) / 2
IDLE_FOOT_R = {S: PB[f"Foot_{S}"].matrix.to_3x3().copy() for S in "LR"}
X_ = eval_co()
print(f"[v2b] the idle: body {IDLE_PITCH:.0f} deg up, hips {IDLE_HIP.z * 100:.1f} cm, the feet's joints {IDLE_FOOT['L'].z * 100:.1f} cm up, pads lowest {min(X_[PADV[S]][:, 2].min() for S in 'LR') * 100:.2f} cm")
ROOT_PB = PB["root"]
def place_body(pitch, hip, hipy=None, roll=0.0):
    """the whole bird (the root) turned nose-up to `pitch` deg and moved so the hip joints sit `hip` m up over (0, hipy)"""
    a0 = body_angle(); M = ROOT_PB.matrix.copy(); ROOT_PB.matrix = Matrix.Rotation(-math.radians(pitch - a0), 4, "X") @ M; upd()
    Hm = (PB["UpperLeg_L"].head + PB["UpperLeg_R"].head) / 2
    if hipy is None: hipy = IDLE_HIP.y - (IDLE_FOOT["L"].y + IDLE_FOOT["R"].y) / 2
    ROOT_PB.matrix = Matrix.Translation(Vector((0, hipy, hip)) - Hm) @ ROOT_PB.matrix; upd()
    if roll:
        Hm = (PB["UpperLeg_L"].head + PB["UpperLeg_R"].head) / 2; ax = (PB["spine_1"].head - PB["hips"].head).normalized()
        ROOT_PB.matrix = Matrix.Translation(Hm) @ Matrix.Rotation(math.radians(roll), 4, ax) @ Matrix.Translation(-Hm) @ ROOT_PB.matrix; upd()
def feet_on_ground(targets):
    """targets: side -> (x, y, lift): the legs by IK, the toes as the idle's (flat, spread) or curled with the lift; three
    passes, the posed mesh's lowest toe-pad point put at its lift over the ground (the pads, not a claw tip)"""
    zf = {S: IDLE_FOOT[S].z + targets[S][2] for S in "LR"}
    for it in range(3):
        for S in "LR":
            x, y, lift = targets[S]
            leg_stand(S, Vector((x, y, zf[S])), 0.25 + 12 * lift)
            upd(); M_ = PB[f"Foot_{S}"].matrix.copy(); R_ = IDLE_FOOT_R[S].to_4x4(); R_.translation = M_.translation; PB[f"Foot_{S}"].matrix = R_   # (the foot flat as perched)
            copy_locals(IDLE, DIGITS[S])
            if lift > 0.002: curl(S, 900 * lift)
        X = eval_co()
        for S in "LR": zf[S] += targets[S][2] - X[PADV[S]][:, 2].min()
def lift_tail():
    for i in range(14):
        if eval_co()[TAILV][:, 2].min() > 0.006: return
        turn("tail_1", (1, 0, 0), math.radians(4))
def p_idle_at(i): return lambda: apply_L(PERCH_L[i])
# Walk: crouched, the body lower than perched, 12 cm steps (60 % stance), a waddle
WALK_N, WALK_STRIDE, WALK_DUTY = 10, 0.12, 0.6
WALK_PITCH = max(25.0, IDLE_PITCH - 25)
WALK_HIP = IDLE_HIP.z * 0.82
def smooth01(x): x = min(1.0, max(0.0, x)); return x * x * (3 - 2 * x)
def walk_foot(u):
    S_ = WALK_STRIDE
    if u < WALK_DUTY: return (-S_ / 2 + S_ * u / WALK_DUTY, 0.0)
    v = (u - WALK_DUTY) / (1 - WALK_DUTY); return (S_ / 2 - S_ * smooth01(v), 0.02 * math.sin(math.pi * v))
def p_walk(u):
    def f():
        apply_L(IDLE); place_body(WALK_PITCH, WALK_HIP + 0.004 * math.cos(4 * math.pi * u), roll=3.0 * math.sin(2 * math.pi * u))
        lift_tail()
        fx = {S: IDLE_FOOT[S].x for S in "LR"}
        (yL, lL), (yR, lR) = walk_foot(u), walk_foot((u + 0.5) % 1)
        feet_on_ground({"L": (fx["L"], yL, lL), "R": (fx["R"], yR, lR)})
    return f
HOP_N = 20
def hop_at(u):
    if u < 0.3: return 0.92 - 0.12 * smooth01(u / 0.3), 0.0, WALK_PITCH + 5
    if u < 0.45: k = smooth01((u - 0.3) / 0.15); return 0.80 + 0.30 * k, 0.0, WALK_PITCH + 5 - 10 * k
    if u < 0.8: k = math.sin(math.pi * (u - 0.45) / 0.35); return 1.10, 0.035 * k, WALK_PITCH - 5
    k = smooth01((u - 0.8) / 0.2); return 1.10 - 0.18 * k, 0.0, WALK_PITCH - 5 + 10 * k
def p_hop(u):
    def f():
        h, lift, pitch = hop_at(u); apply_L(IDLE); place_body(pitch, IDLE_HIP.z * h); lift_tail()
        feet_on_ground({S: (IDLE_FOOT[S].x, -0.01 * lift / 0.035, lift) for S in "LR"})
    return f
# flight: the toes closed (the grip: in flight, or with prey); the stoop's legs back under the tail
# (the three long leg bones aimed; the foot and the toes keep their pose relative to the shank: this rig's foot bone is
# not along the toes, so aiming it turned the toes up)
STOOP_LEGS = {"UpperLeg*": (0.06, 0.45, -0.89), "LowerLeg*": (0.03, 1, 0.25), "AnkleLeg*": (0.0, 0.85, -0.5)}   # (the feet under the tail's base)
TALON_LEGS = {"UpperLeg*": (0.15, -0.6, -0.8), "LowerLeg*": (0.1, -0.85, -0.5), "AnkleLeg*": (0.05, -0.6, -0.8)}
def legs(P, Ls):
    aims(P); copy_locals(Ls, [f"Foot_{S}" for S in "LR"])
def aim_beak(d):
    """the head turned so the beak (head -> mouth_upper_tip) points along d (this rig's head bone is not along the beak)"""
    upd(); cur = (PB["mouth_upper_tip"].head - PB["head"].head).normalized(); q = cur.rotation_difference(Vector(d).normalized())
    M = PB["head"].matrix.copy(); R = (q.to_matrix() @ M.to_3x3()).to_4x4(); R.translation = M.translation; PB["head"].matrix = R; upd()
def p_glide():
    apply_L(GLIDE_L); [curl(S, 110) for S in "LR"]
def p_stoop():
    apply_L(IDLE); place_body(-8, IDLE_HIP.z + 0.25, hipy=0.0)      # the folded idle wings and tail, the body level / nose down
    aims({"spine_2": (0, -1, 0.35), "spine_3": (0, -1, 0.1)}); aim_beak((0, -1, -0.08))
    upd(); aim("tail_1", -(PB["spine_1"].head - PB["hips"].head).normalized() + Vector((0, 0, 0.05)))   # the tail on the body's line
    legs(STOOP_LEGS, IDLE); [curl(S, 110) for S in "LR"]
def fan_tail(deg):
    """the tail's own feather bones (tail_fan_*) turned outward in the tail's plane (deg at the outer pair)"""
    upd(); t = (PB["tail_tip"].head - PB["tail_1"].head).normalized(); lat = Vector((1, 0, 0)); nrm = t.cross(lat).normalized()
    if nrm.z < 0: nrm = -nrm
    for i, k in ((1, 0.55), (2, 1.0)):
        for S, sg in (("L", 1), ("R", -1)):
            n_ = f"tail_fan_{i}_{S}"
            if n_ in PB: turn(n_, nrm, -sg * math.radians(deg * k))
def p_talons():
    apply_L(GLIDE_L); legs(TALON_LEGS, IDLE); [copy_locals(IDLE, DIGITS[S]) for S in "LR"]; [curl(S, -15) for S in "LR"]
def p_flare(k=1.0):
    def f():
        apply_L(GLIDE_L); aims({"wing_1*": (0.75, -0.3 * k, 0.6)}); turn("tail_1", (1, 0, 0), math.radians(-25 * k)); fan_tail(25 * k)
        legs(TALON_LEGS, IDLE); [copy_locals(IDLE, DIGITS[S]) for S in "LR"]; [curl(S, -15) for S in "LR"]
    return f
# THE IDLE OFF THE FLOOR: in the download's own idle the primaries' tips and the tail dip up to 2 cm through the floor it
# stands on (its viewer has no floor). Per frame, the hands and the tail turned up (1 deg steps) until nothing of them is
# under the floor; the angles max-filtered and smoothed over time (no pop), then keyed on top of its pose
HANDV = wmask(("wing_3", "wing_4", "wing_5", "wing_tip", "wing_feather_3", "wing_feather_4"))
def off_floor(name):
    act_ = actions[name]; set_action(arm, act_); f0, f1 = int(act_.frame_range[0]), int(act_.frame_range[1]); need = []
    for f in range(f0, f1 + 1):
        scene.frame_set(f); upd(); a_t = a_h = 0
        while a_t < 20 and eval_co()[TAILV][:, 2].min() < 0.002: turn("tail_1", (1, 0, 0), math.radians(1)); a_t += 1
        while a_h < 25 and eval_co()[HANDV][:, 2].min() < 0.004:
            for S in "LR": turn(f"wing_3_{S}", (1, 0, 0), math.radians(1))
            a_h += 1
        need.append((a_t, a_h))
    N = np.array(need, float); K_ = 10
    mx = np.array([N[max(0, i - K_):i + K_ + 1].max(0) for i in range(len(N))]); sm = np.array([mx[max(0, i - 4):i + 5].mean(0) for i in range(len(N))]) + 1.5
    for i, f in enumerate(range(f0, f1 + 1)):
        scene.frame_set(f); upd()
        turn("tail_1", (1, 0, 0), math.radians(sm[i, 0]))
        for S in "LR": turn(f"wing_3_{S}", (1, 0, 0), math.radians(sm[i, 1]))
        for n_ in ("tail_1", "wing_3_L", "wing_3_R"): PB[n_].keyframe_insert("rotation_quaternion", frame=f)
    set_action(arm, None)
    print(f"[v2b] {name} off the floor: the tail up to {N[:, 0].max():.0f} deg, the hands up to {N[:, 1].max():.0f} deg (smoothed)")
off_floor("Perch")      # (not TakeOff / Land: their own wing beats reach under the feet' level, in the air)
set_action(arm, actions["Perch"]); scene.frame_set(0); upd()
IDLE = {pb.name: Matrix.LocRotScale(pb.location, pb.rotation_quaternion, None) for pb in PB}; set_action(arm, None)
key_clip("Glide", [p_glide, p_glide], [0, 12])
key_clip("Stoop", [p_stoop, p_stoop], [0, 12])
key_clip("Talons", [p_talons, p_talons], [0, 12])
key_clip("Flare", [p_flare(1.0), p_flare(0.85), p_flare(1.0)], [0, 6, 12])
key_clip("Walk", [p_walk(i / WALK_N) for i in range(WALK_N + 1)], list(range(WALK_N + 1)))
key_clip("Hop", [p_hop(i / HOP_N) for i in range(HOP_N + 1)], list(range(HOP_N + 1)))
idle = actions["Perch"].copy(); idle.name = "Idle"; idle.use_fake_user = True; actions["Idle"] = idle
print(f"[v2b] ours: Glide (the download's f{GLIDE_F}, toes closed), Stoop, Talons, Flare, Walk ({WALK_N} frames, body {WALK_PITCH:.0f} deg, hips {WALK_HIP * 100:.1f} cm, {WALK_STRIDE / (WALK_DUTY * WALK_N / 24):.2f} m/s planted), Hop ({HOP_N})")
pose_reset = lambda: [setattr(pb, "rotation_quaternion", (1, 0, 0, 0)) or setattr(pb, "location", (0, 0, 0)) for pb in PB]
pose_reset(); set_action(arm, None)

# ------------------------------------------------------------------------------------------------ 8. export
def dark_eyes():
    """the download's eyes are a glowing blue (an emissive iris); a peregrine's eye is dark brown, near black: its eye
    texture recoloured by its own lightness (the highlight kept), the emission dropped by the pack"""
    for slot in tgt.material_slots:
        if "Eye" not in slot.material.name: continue
        # (and glossy, not a mirror: at roughness 0 its specular 1 reflected the sky over the whole eye, a blue eye again)
        for nd in slot.material.node_tree.nodes:
            if nd.type == "BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value = 0.28
        for nd in slot.material.node_tree.nodes:
            if nd.type != "TEX_IMAGE" or not nd.image or nd.image.get("_dark"): continue
            im = nd.image
            if im.size[0] > 256: im.scale(256, 256)                 # (a few mm of eye: 256 px is plenty)
            w, h = im.size; A = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(A); A = A.reshape(-1, 4)
            Y = A[:, :3] @ np.array([0.30, 0.59, 0.11], np.float32); hi = np.clip((Y - 0.80) / 0.15, 0, 1)[:, None]
            dark = np.array([0.045, 0.030, 0.022], np.float32) + np.array([0.20, 0.13, 0.08], np.float32) * (Y ** 2)[:, None]
            A[:, :3] = dark * (1 - hi) + A[:, :3] * hi; im.pixels.foreach_set(A.reshape(-1)); im["_dark"] = 1; im.update()
            print(f"[v2b] eyes: {im.name} {w}x{h} recoloured dark brown")
def export():
    dark_eyes()
    if SA.name in bpy.data.objects: bpy.data.objects.remove(SA)
    for act_ in actions.values():
        for layer in act_.layers:
            for strip in layer.strips:
                for cb in strip.channelbags:
                    for fc in list(cb.fcurves):
                        if fc.data_path.endswith(".scale") or (fc.data_path.endswith(".location") and fc.data_path != 'pose.bones["root"].location'): cb.fcurves.remove(fc)
    for a_ in list(bpy.data.actions):
        if a_ not in actions.values(): bpy.data.actions.remove(a_)
    for i, slot in enumerate(tgt.material_slots):
        if slot.material and not slot.material.name.startswith("falcon_"): slot.material.name = f"falcon_{i}_{slot.material.name}"[:60]
    os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
    select([arm, tgt])
    bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
        export_force_sampling=True, export_optimize_animation_size=True, export_image_format="AUTO", export_lights=False, export_cameras=False,
        export_skins=True, export_all_influences=False, export_yup=True, export_apply=False)
    TEXDIR = OUT + ".tex"; os.makedirs(TEXDIR, exist_ok=True); meta = {}
    for img in bpy.data.images:
        if img.users == 0 or img.size[0] == 0: continue
        w, h = img.size; px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
        a_ = (np.clip(px.reshape(h, w, 4)[::-1], 0, 1) * 255 + 0.5).astype(np.uint8)
        fn = "".join(c if c.isalnum() or c in "._-" else "_" for c in img.name); a_.tofile(os.path.join(TEXDIR, fn + ".rgba"))
        meta[img.name] = {"file": fn + ".rgba", "width": w, "height": h, "srgb": img.colorspace_settings.name.lower().startswith("srgb")}
    json.dump(meta, open(os.path.join(TEXDIR, "textures.json"), "w"), indent=1)
    print(f"[v2b] wrote {OUT}: {sum(len(p.vertices) - 2 for p in me.polygons)} triangles, clips {sorted(actions)}, textures {sorted(meta)}")

# ------------------------------------------------------------------------------------------------ 9. the juvenile plumage
# The player is the young of the year (V2 POLISH, rule falcon-gym "the v2 model"): painted by script on this model's
# OWN UVs from the adult's textures, the body's and the flight feathers'. As the first v2's: the adult's lightness ramped
# to the juvenile's browns, buff fringes on the upperparts; the underparts buff with dark VERTICAL drop streaks (the
# adult's bars replaced, the throat plainer); the cere and eye ring bluish-grey; paler feet. Upper / under are read on
# the GLIDE pose (the body level, the wings spread: the bind here is the perched idle). The wing's faces that face
# outward when folded keep the upperparts' colour (V2 FIX "the folded wing shows its upper side").
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def mixc(a, b, t): return a + (b - a) * np.clip(t, 0, 1)[..., None]
C = lambda *rgb: np.array(rgb, np.float32)
def box(img, mask, r):
    def integ(a):
        s = np.cumsum(np.cumsum(a, 0), 1); return np.pad(s, ((1, 0), (1, 0)) + ((0, 0),) * (a.ndim - 2))
    def boxsum(S):
        H_, W_ = S.shape[0] - 1, S.shape[1] - 1
        y0 = np.clip(np.arange(H_) - r, 0, H_); y1 = np.clip(np.arange(H_) + r + 1, 0, H_)
        x0 = np.clip(np.arange(W_) - r, 0, W_); x1 = np.clip(np.arange(W_) + r + 1, 0, W_)
        return S[y1][:, x1] - S[y0][:, x1] - S[y1][:, x0] + S[y0][:, x0]
    m = mask.astype(np.float64)
    num = boxsum(integ(img * (m[..., None] if img.ndim == 3 else m))); den = boxsum(integ(m))
    return num / np.maximum(den, 1e-6)[..., None] if img.ndim == 3 else num / np.maximum(den, 1e-6)
def src_image(sock):
    for l in sock.links:
        n = l.from_node
        if n.type == "TEX_IMAGE": return n.image
        for s_ in n.inputs:
            r_ = src_image(s_)
            if r_: return r_
    return None
def posed(clip, frame=0):
    set_action(arm, actions[clip]); scene.frame_set(frame); upd()
    ev = tgt.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    X = np.empty(len(m.vertices) * 3); m.vertices.foreach_get("co", X); N = np.empty(len(m.vertices) * 3); m.vertices.foreach_get("normal", N); ev.to_mesh_clear()
    H = {n: Vector(PB[n].head) for n in ("hips", "spine_1", "head")}; set_action(arm, None)
    return X.reshape(-1, 3), N.reshape(-1, 3), H
def juvenile(TEXDIR):
    meta = json.load(open(os.path.join(TEXDIR, "textures.json")))
    def wsum(prefixes):
        gi = {i for i, n in enumerate(GN) if n.startswith(prefixes)}
        return np.array([sum(g.weight for g in v.groups if g.group in gi) for v in me.vertices])
    P_, N_, H_ = posed("Glide")
    HEADW = wsum(("head", "mouth", "spine_3", "b_Jaw")); LEGW = wsum(("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes") + tuple("b_" + s + "_Digit" for s in "lr"))
    TAILW = wsum(("tail", "b_l_TF", "b_r_TF", "b_Tail")); WINGW = wsum(("wing", "b_l_SF1", "b_r_SF1", "b_l_Clav", "b_r_Clav"))
    fslot = next((i for i, s_ in enumerate(tgt.material_slots) if "Feather" in s_.material.name), -1)
    FEATH = np.zeros(NV)
    for p_ in me.polygons:
        if p_.material_index == fslot:
            for vi in p_.vertices: FEATH[vi] = 1.0
    WINGSW = WINGW * (1 - FEATH)
    EXPO = np.zeros(NV)
    for c_ in ("Perch", "Walk", "Stoop"):
        Xc, Nc, Hc = posed(c_); h_, s_ = np.array(Hc["hips"]), np.array(Hc["spine_1"]); u_ = (s_ - h_) / np.linalg.norm(s_ - h_)
        d_ = Xc - h_; o_ = d_ - np.outer(d_ @ u_, u_); o_ /= np.maximum(np.linalg.norm(o_, axis=1, keepdims=True), 1e-9)
        EXPO = np.maximum(EXPO, ((Nc * o_).sum(1) > 0.1).astype(float))
    EXPO *= (N_[:, 2] < 0.3) * (WINGW > 0.5)
    ATTR = np.concatenate([P_, N_, HEADW[:, None], LEGW[:, None], FEATH[:, None], TAILW[:, None], WINGSW[:, None], EXPO[:, None]], 1); NA = ATTR.shape[1]
    me.calc_loop_triangles()
    uvl = me.uv_layers[0].data; UV = np.empty(len(uvl) * 2); uvl.foreach_get("uv", UV); UV = UV.reshape(-1, 2)
    LT = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get("loops", LT); LT = LT.reshape(-1, 3)
    MI = np.empty(len(me.loop_triangles), np.int64); me.loop_triangles.foreach_get("material_index", MI)
    LV = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", LV)
    zc = float(np.median(P_[(np.abs(P_[:, 0]) < 0.03) & (np.abs(P_[:, 1] - H_["hips"].y) < 0.04), 2])) if ((np.abs(P_[:, 0]) < 0.03) & (np.abs(P_[:, 1] - H_["hips"].y) < 0.04)).any() else H_["hips"].z
    hz_ = np.array(H_["head"])
    BROWN_D, BROWN, BROWN_M, BUFF, BUFF_L, STREAK = C(0.12, 0.08, 0.055), C(0.24, 0.16, 0.10), C(0.42, 0.30, 0.19), C(0.80, 0.66, 0.46), C(0.90, 0.80, 0.62), C(0.26, 0.17, 0.11)
    def ramp(y):
        y = np.clip(y, 0, 1)
        c = mixc(BROWN_D, BROWN, smooth(0.04, 0.30, y)); c = mixc(c, BROWN_M, smooth(0.30, 0.55, y))
        c = mixc(c, BUFF, smooth(0.52, 0.78, y)); return mixc(c, BUFF_L, smooth(0.78, 0.95, y))
    done = []
    for si, slot in enumerate(tgt.material_slots):
        mat = slot.material
        if "Eye" in mat.name: continue
        bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED"); base = src_image(bsdf.inputs["Base Color"])
        if base is None: continue
        w, h = base.size
        A = np.empty(w * h * 4, np.float32); base.pixels.foreach_get(A); A = A.reshape(h, w, 4)
        G = np.zeros((h, w, NA), np.float32); COV = np.zeros((h, w), bool)
        for tri in LT[MI == si]:
            uv = UV[tri] * [w, h] - 0.5; at = ATTR[LV[tri]]
            x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
            x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, w - 1), min(y1, h - 1)
            if x1 < x0 or y1 < y0: continue
            gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
            (ax_, ay_), (bx_, by_), (cx_, cy_) = uv
            den = (by_ - cy_) * (ax_ - cx_) + (cx_ - bx_) * (ay_ - cy_)
            if abs(den) < 1e-12: continue
            l0 = ((by_ - cy_) * (gx - cx_) + (cx_ - bx_) * (gy - cy_)) / den; l1 = ((cy_ - ay_) * (gx - cx_) + (ax_ - cx_) * (gy - cy_)) / den; l2 = 1 - l0 - l1
            ins = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
            if not ins.any(): continue
            G[gy[ins], gx[ins]] = l0[ins][:, None] * at[0] + l1[ins][:, None] * at[1] + l2[ins][:, None] * at[2]; COV[gy[ins], gx[ins]] = True
        for it in range(3):
            nb = box(G, COV, 1); grow = (~COV) & (box(COV.astype(float), np.ones_like(COV), 1) > 0); G[grow] = nb[grow]; COV = COV | grow
        p = G[..., 0:3]; n = G[..., 3:6]; headw, legw, cardw, tailw, wingsw, expo = (G[..., k] for k in range(6, 12))
        rgb = A[..., :3]; Y = rgb @ np.array([0.30, 0.59, 0.11], np.float32); Yb = box(Y, COV, 10); detail = np.clip(Y / np.maximum(Yb, 0.02), 0.4, 1.8)
        upper = ramp(Y * 0.92)
        upper = mixc(upper, BUFF * 0.85, 0.55 * smooth(1.08, 1.35, detail) * (1 - cardw))
        arc = np.arctan2(p[..., 0], -(p[..., 2] - zc)) * 0.06; col_id = np.floor(arc / 0.011)
        wob = np.sin(p[..., 1] * 90.0 + col_id * 2.3) * 0.0012
        across = 0.5 + 0.5 * np.cos(2 * np.pi * (arc + wob) / 0.011); along = 0.5 + 0.5 * np.sin(2 * np.pi * p[..., 1] / 0.024 + col_id * 1.7)
        streak = smooth(0.62, 0.88, across) * smooth(0.25, 0.65, along)
        fine = np.clip(box(detail, COV, 1) / np.maximum(box(detail, COV, 6), 0.05), 0.8, 1.2)
        under = BUFF[None, None] * fine[..., None]
        under = mixc(under, STREAK, 0.85 * streak * smooth(0.06, 0.11, np.linalg.norm(p - hz_, axis=-1)))
        underm = np.maximum(smooth(0.10, -0.30, n[..., 2]), smooth(-0.45, -0.80, n[..., 1]) * (1 - smooth(0.5, 0.8, headw)) * (1 - smooth(0.3, 0.6, wingsw)))
        underm = underm * (1 - cardw) * (1 - smooth(0.5, 0.8, tailw)) * (1 - smooth(0.2, 0.6, expo))
        col = mixc(upper, under, underm)
        edge_w = (1 - smooth(0.2, 0.6, np.abs(n[..., 2]))) * smooth(0.3, 0.6, wingsw) * (1 - cardw)
        col = mixc(col, ramp(np.minimum(Y * 0.92, 0.30)), np.maximum(edge_w, smooth(0.2, 0.6, expo) * smooth(0.3, 0.6, wingsw)))
        col = mixc(col, ramp(Y * 0.95), cardw)                 # the flight feathers: the ramp (a juvenile's are barred too)
        yellow = smooth(0.25, 0.45, rgb[..., 0] - rgb[..., 2]) * smooth(0.35, 0.55, rgb[..., 1]) * smooth(0.10, 0.25, rgb[..., 0] - rgb[..., 1] * 0.8 + 0.1)
        col = mixc(col, ramp(Y * 0.95), smooth(0.35, 0.7, headw) * (1 - yellow))
        col = mixc(col, C(0.58, 0.64, 0.70) * np.clip(Y / 0.6, 0.6, 1.2)[..., None], yellow * (1 - smooth(0.3, 0.6, legw)))
        col = mixc(col, rgb * C(0.92, 0.95, 0.80) + C(0.04, 0.04, 0.06), yellow * smooth(0.3, 0.6, legw))
        OUTI = np.dstack([np.where(COV[..., None], col, rgb), A[..., 3:4]]).astype(np.float32)
        key = "juvenile" if not done else f"juvenile_{len(done)}"
        a_ = (np.clip(OUTI[::-1], 0, 1) * 255 + 0.5).astype(np.uint8); a_.tofile(os.path.join(TEXDIR, key + ".rgba"))
        meta[key] = {"file": key + ".rgba", "width": w, "height": h, "srgb": True, "variant_of": base.name, "material": mat.name}
        jimg = bpy.data.images.new(key, w, h, alpha=True); jimg.pixels.foreach_set(OUTI.reshape(-1)); jimg.filepath_raw = OUT + f".{key}.png"; jimg.file_format = "PNG"; jimg.save()
        done.append((key, mat.name, base.name, w, int(COV.sum())))
    json.dump(meta, open(os.path.join(TEXDIR, "textures.json"), "w"), indent=1)
    print("[v2b] juvenile plumage: " + ", ".join(f"{k} on {m} ({b} {w}px, {c} texels)" for k, m, b, w, c in done))

export()
if JUV: juvenile(OUT + ".tex")

