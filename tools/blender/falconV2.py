"""THE FALCON V2 (docs/FALCON_GYM.md "the model"): a Sketchfab peregrine mesh re-rigged onto the Mesh2Motion bird
skeleton (the SAME 55-bone bird rig as models/bird/peregrine.glb: viewer/birdRig.js's layers work on it unchanged),
with the Mesh2Motion bird clips (CC0) and our own falcon clips, exported to models/bird/v2/.

    blender --factory-startup -b -P tools/blender/falconV2.py -- --mesh <model.gltf|glb> --rig <mesh2motion dir> \
        --out models/bird/v2/falcon_v2.glb [--yaw <deg>] [--tex 2048] [--far] [--no-juvenile]

  --mesh     the Sketchfab download (UNTRUSTED DATA: only read by Blender's glTF importer, nothing in it is run)
  --rig      the Mesh2Motion bird assets: model.glb (rig + a skinned reference mesh) and animations/*.glb
             (fetched from github.com/Mesh2Motion/mesh2motion-app static/assets/bird, CC0: CREDITS.md)
  --yaw      turn the mesh about the vertical before fitting (when the nose auto-detection is wrong)
  --tex      the largest texture side kept (JPEG in the glb)
  --far      the far / family bird (the 7k "Falcon_ Merged Animations"): the same pipeline, the textures at 1024
  (previews: tools/blender/falconV2preview.py renders the exported glb)

Steps (all scripted, repeatable, no clicks):
  1. the rig: model.glb's armature + its reference mesh (the weights come from it); every animations/*.glb's action
     onto that armature (Flap, Glide, Idle, Walk, Hop, Take_Off -> TakeOff, Land)
  2. the mesh: the shape the download's OWN skin gives at a frame of its own animation (--frame; its raw rest is
     garbage), with its own rig posed first (V2 POLISH, docs/rules/falcon-gym.md "the v2 model"):
       - the tibiotarsus and tarsus shortened to a peregrine's (0.17 / 0.115 x the body length: the download's are
         ~2x: the stick legs), along the bone only (not thinner)
       - the toes curled half closed (the relaxed foot of a flying falcon; the Perch clip closes, Talons opens them)
     one mesh, 1.05 m span, origin at the feet, nose toward -Y (Blender frame); the download's skin weights and joint
     positions kept for steps 3-4
  3. the fit: the rig + reference mesh scaled uniformly to the mesh's beak-to-tail length; the wing bones (and the
     reference mesh's wings) moved by landmarks onto the download's own shoulder / elbow / wrist / tip (piecewise
     along the span: the Mesh2Motion arm is shorter, so a plain stretch put its elbow and wrist in the wrong places:
     the fold bent the feathers mid-card); the leg bones onto the download's own leg joints (hip, knee, ankle,
     foot, the middle toe's knuckles)
  4. the weights: a Data Transfer of the reference mesh's vertex groups (nearest face, interpolated), then
       - the legs: the download's OWN leg weights, bone for bone (thigh, shank, tarsus, foot, toes: they bend at the
         joints instead of swinging as one stick)
       - every feather card (a loose part the download skins to a flight / tail feather bone) RIGID on one bone: the
         bone with the most transferred weight over the card. A fold turns whole cards, which slide over each other
         instead of crumpling (no card is shared across a fold)
       - the covert sheets of the wings smoothed (Laplacian) so their fold is a bend, not a crease
     normalised, at most 4 bones a vertex; an Armature modifier
  5. the clips: the Mesh2Motion clips RETARGETED onto the moved bones (each bone keeps its Mesh2Motion pose relative
     to where the bone was; the legs take the clip's directions; the toes keep the relaxed curl), then our own:
     Stoop (the tight tuck), Talons (legs forward, toes open), Flare (wings forward and up, tail down, toes open),
     Perch (body upright ~50 deg, head level, wings folded along the back with the primaries over the tail, short
     legs under the belly by IK to the ground, toes closed round the perch)
  6. shading: the mesh's own normals kept where it has custom normals, else a Weighted Normal modifier
  7. export: glTF binary, all actions (rotations only), PNG textures (alpha kept) + raw RGBA dumps for the KTX2 pack
     (tools/falconV2pack.mjs: meshopt + KTX2 -> models/bird/v2/)
  8. the juvenile plumage (the player: the young of the year), painted on v2's OWN UVs from the adult texture: brown
     upperparts with buff edges, buff underparts with dark VERTICAL streaks (the adult's horizontal bars replaced),
     brown hood, bluish-grey cere and eye ring; raw RGBA "juvenile" beside the others (the pack writes
     falcon_v2_juvenile.ktx2; the adult stays for the church family)
"""
import bpy, sys, os, math, re, json
import numpy as np
from mathutils import Vector, Matrix, Quaternion

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
MESH, RIG, OUT = arg("--mesh"), arg("--rig"), arg("--out")
YAW, TEX, FAR = arg("--yaw"), int(arg("--tex", "1024" if "--far" in argv else "2048")), "--far" in argv
JUV = "--no-juvenile" not in argv and not FAR
assert MESH and RIG and OUT, "usage: -- --mesh <file> --rig <dir> --out <glb>"

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
def objs(): return list(scene.objects)
def select(only):
    for o in objs(): o.select_set(o in only)
    bpy.context.view_layer.objects.active = only[0] if only else None
def upd(): bpy.context.view_layer.update()

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
    a = new[0]; a.name = name + "_m2m"; a.use_fake_user = True; actions[name] = a
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
def shape_at(o):
    ev = o.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    W = np.array([tuple(ev.matrix_world @ v.co) for v in m.vertices]); ev.to_mesh_clear(); return W
arms = [m.object for o in meshes for m in o.modifiers if m.type == "ARMATURE" and m.object]
src_arm = arms[0] if arms else None
act = src_arm.animation_data.action if src_arm and src_arm.animation_data else None
def bname(n): return re.sub(r"_\d+_\d+$", "", n)            # "leg1.L_076_140" -> "leg1.L" (the importer's suffixes)
SRC = {bname(pb.name): pb for pb in src_arm.pose.bones} if src_arm else {}
# the download's own rig drives the legs / wing landmarks / feather cards (the Sketchfab peregrine); else the old path
OWN = len(meshes) == 1 and all(k in SRC for k in ("HIP", "leg1.L", "leg2.L", "leg3.L", "foot.L", "WING1.L", "WING2.L", "WING3.L", "leg1.R", "WING1.R"))
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
    LEGFIX = {}
    if OWN:
        # freeze the frame's pose (the action off, the pose kept) so the download's own bones can be posed further
        basis = {pb.name: pb.matrix_basis.copy() for pb in src_arm.pose.bones}
        src_arm.animation_data.action = None
        for pb in src_arm.pose.bones: pb.matrix_basis = basis[pb.name]
        upd()
        W0 = shape_at(meshes[0]); ext = W0.max(0) - W0.min(0); SPANW = float(max(ext[0], ext[1]))   # the wingspan
        WM = src_arm.matrix_world
        jw = lambda n, end="head": WM @ getattr(SRC[n], end)
        # THE LEGS TO A PEREGRINE'S: tarsus ~5.0 cm, tibiotarsus ~7.5 cm on a 1.05 m span (the download's are 6.5 and
        # 8.7: long, thin legs). Scaled along the bone only (Y), the children ignoring that scale (the joint still
        # moves with the shortened bone), the toes kept at their size.
        TIB, TAR = 0.072, 0.050
        for s in "LR":
            tib = (jw(f"leg3.{s}") - jw(f"leg2.{s}")).length; tar = (jw(f"foot.{s}") - jw(f"leg3.{s}")).length
            s2, s3 = min(1.0, TIB * SPANW / tib), min(1.0, TAR * SPANW / tar)
            for n in (f"leg3.{s}", f"foot.{s}"): src_arm.data.bones[SRC[n].name].inherit_scale = "NONE"
            SRC[f"leg2.{s}"].scale = (1, s2, 1); SRC[f"leg3.{s}"].scale = (1, s3, 1)
            LEGFIX[s] = (tib / SPANW, tar / SPANW, s2, s3)
        upd()
        for s in "LR":
            tib = (jw(f"leg3.{s}") - jw(f"leg2.{s}")).length; tar = (jw(f"foot.{s}") - jw(f"leg3.{s}")).length
            print(f"[falconV2] legs {s}: tibiotarsus {LEGFIX[s][0]:.3f} -> {tib / SPANW:.3f}, tarsus {LEGFIX[s][1]:.3f} -> {tar / SPANW:.3f} x the span")
        # THE TOES HALF CLOSED (the relaxed foot): each toe's joints curled toward the sole (the tarsus' direction)
        fwd = (SRC["CHEST"].head - SRC["HIP"].head).normalized() if "CHEST" in SRC else Vector((0, -1, 0))
        TOECHAINS = {}
        for s in "LR":
            foot = SRC[f"foot.{s}"]; n = (foot.head - SRC[f"leg3.{s}"].head).normalized()
            chains = []
            for c in foot.children:
                ch = [c]
                while True:
                    nxt = [x for x in ch[-1].children if not bname(x.name).endswith("_end")]
                    if not nxt: break
                    ch.append(nxt[0])
                ch = [b for b in ch if not bname(b.name).endswith("_end")]
                if not ch: continue
                hallux = (ch[0].tail - ch[0].head).dot(fwd) < 0
                chains.append((hallux, ch))
            TOECHAINS[s] = chains
            # the toes' bases square to the tarsus first (a standing foot: the bind's attack pose hangs them along it;
            # its hallux pointed down would make the bird stand on it), the hallux straight back from the middle toe
            def turn_to(pb, v):
                upd(); d = (pb.tail - pb.head).normalized(); q = d.rotation_difference(v.normalized())
                M = pb.matrix.copy(); R = (q.to_matrix() @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R
            flat = lambda d: (d - n * d.dot(n)).normalized()
            front = [ch for hal, ch in chains if not hal]
            mid = max(front, key=lambda ch: flat(ch[0].tail - ch[0].head).dot(fwd)) if front else None
            for hallux, ch in chains:
                d0 = flat(ch[0].tail - ch[0].head)
                if hallux and (mid is None or d0.dot(fwd) > -0.3): d0 = -flat(mid[0].tail - mid[0].head)
                turn_to(ch[0], d0 + n * 0.12)
            for hallux, ch in chains:
                for pb, ang in zip(ch[1:], (25, 30) if hallux else (28, 34)):
                    upd(); d = (pb.tail - pb.head).normalized(); ax = d.cross(n)
                    if ax.length < 1e-6: continue
                    M = pb.matrix.copy(); R = (Matrix.Rotation(math.radians(ang), 3, ax.normalized()) @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R
        upd()
        TOECHAINS = {s: [(hal, [bname(b.name) for b in ch]) for hal, ch in TOECHAINS[s]] for s in TOECHAINS}   # names (the rig goes)
        print(f"[falconV2] toes: {sum(len(c) for c in TOECHAINS.values())} chains curled half closed")
    for o in meshes:
        dg = bpy.context.evaluated_depsgraph_get()
        nm = bpy.data.meshes.new_from_object(o.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
        o.data = nm
    print(f"[falconV2] bind shape: the skin's deformation at frame {FRAME}")
# the download's own joints (world, the bind pose) and skin weights, before its rig goes
SJ = {}
if OWN:
    # (in the mesh's own space: the transform_apply below takes it to world, as the vertices)
    WM = meshes[0].matrix_world.inverted() @ src_arm.matrix_world
    SJ = {bname(pb.name): (WM @ pb.head, WM @ pb.tail) for pb in src_arm.pose.bones}
    o = meshes[0]
    SRCW = [{bname(o.vertex_groups[g.group].name): g.weight for g in v.groups if g.weight > 1e-4} for v in o.data.vertices]
    used = {}
    for d in SRCW:
        for k in d: used[k] = used.get(k, 0) + 1
    print(f"[falconV2] the download's skin: {len(used)} bones used: " + ", ".join(sorted(k for k in used if not k.startswith(("FLIGHT", "TAILF")))))
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
    if a not in actions.values(): bpy.data.actions.remove(a)
select(meshes)
if len(meshes) > 1: bpy.ops.object.join()
tgt = meshes[0]; tgt.name = "FalconV2"
print(f"[falconV2] mesh objects joined: {len(meshes)}")
def apply_xf(**kw):
    """transform_apply on the mesh; the download's joints follow"""
    global SJ
    upd(); M = tgt.matrix_world.copy(); select([tgt]); bpy.ops.object.transform_apply(**kw)
    SJ = {k: (M @ h, M @ t) for k, (h, t) in SJ.items()}
apply_xf(location=True, rotation=True, scale=True)
me = tgt.data
def bbox(o):
    xs = [o.matrix_world @ v.co for v in o.data.vertices]
    lo = Vector((min(v.x for v in xs), min(v.y for v in xs), min(v.z for v in xs))); hi = Vector((max(v.x for v in xs), max(v.y for v in xs), max(v.z for v in xs)))
    return lo, hi, xs
lo, hi, P = bbox(tgt)
if hi.y - lo.y > hi.x - lo.x:                      # the span along Y: a quarter turn
    tgt.rotation_euler.z = math.pi / 2; apply_xf(rotation=True); lo, hi, P = bbox(tgt)
if YAW is not None:
    tgt.rotation_euler.z = math.radians(float(YAW)); apply_xf(rotation=True); lo, hi, P = bbox(tgt)
else:
    # the nose: the end (along Y) with more vertices within its last 18 % (the head is the detailed end)
    L = hi.y - lo.y
    nlo = sum(1 for v in P if v.y < lo.y + 0.18 * L); nhi = sum(1 for v in P if v.y > hi.y - 0.18 * L)
    if nhi > nlo:                                    # the head toward +Y: turn it to -Y (the rig's nose)
        tgt.rotation_euler.z = math.pi; apply_xf(rotation=True); lo, hi, P = bbox(tgt)
span, length = hi.x - lo.x, hi.y - lo.y
# life size: the wingspan to SPAN m (a juvenile female ~1.05 m), whatever units the download uses
SPAN = float(arg("--span", "1.05"))
kk = SPAN / span
tgt.scale = (kk, kk, kk); apply_xf(scale=True); lo, hi, P = bbox(tgt)
# the origin at the bird's feet: the box's bottom centre (the loader puts the root there)
tgt.location = (-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z); apply_xf(location=True); lo, hi, P = bbox(tgt)
span, length = hi.x - lo.x, hi.y - lo.y
# one UV map (the first: the one the textures use), no shape keys; the extra sets a scan export carries cost bytes only
while len(me.uv_layers) > 1: me.uv_layers.remove(me.uv_layers[-1])
print(f"[falconV2] mesh {len(me.vertices)} verts {len(me.polygons)} faces, span {span:.3f} length {length:.3f} height {hi.z - lo.z:.3f}")
if span < 1.3 * length: print("[falconV2] WARNING: the wings do not look spread (span < 1.3 x length): the fit needs a spread-wing bind pose")
NV = len(me.vertices)
CO = np.array([tuple(v.co) for v in me.vertices])
if OWN and "JAW" in SJ:
    # THE BEAK CLOSED: the bind frame (an attack) has it open; the lower mandible (the download's JAW weights) turned
    # up about its hinge (where JAW and SKULL blend) until its tip meets the upper's, less 3 deg
    jw_ = np.array([d.get("JAW", 0.0) for d in SRCW]); sk_ = np.array([d.get("SKULL", 0.0) for d in SRCW])
    hb = np.minimum(jw_, sk_)
    if hb.sum() > 0 and (jw_ > 0.5).any():
        hinge = (CO * hb[:, None]).sum(0) / hb.sum()
        up_ = CO[(sk_ > 0.9) & (jw_ < 0.01)]; up_ = up_[np.argmin(up_[:, 1])]; lo_ = CO[jw_ > 0.5]; lo_ = lo_[np.argmin(lo_[:, 1])]
        ang = lambda q: math.atan2(q[2] - hinge[2], -(q[1] - hinge[1]))
        th = max(0.0, ang(up_) - ang(lo_) - math.radians(3))
        for vi in np.nonzero(jw_ > 0)[0]:
            R_ = Matrix.Rotation(-th * jw_[vi], 3, "X"); q = Vector(CO[vi]) - Vector(hinge)
            CO[vi] = np.array(R_ @ q) + hinge
        me.vertices.foreach_set("co", CO.reshape(-1).astype(np.float32)); me.update()
        print(f"[falconV2] beak closed: the lower mandible up {math.degrees(th):.1f} deg")

# ------------------------------------------------------------------------------------------------ 3. the fit
rlo, rhi, _ = bbox(ref)
k = length / (rhi.y - rlo.y)
c_t = Vector(((lo.x + hi.x) / 2, (lo.y + hi.y) / 2, lo.z)); c_r = Vector(((rlo.x + rhi.x) / 2, (rlo.y + rhi.y) / 2, rlo.z))
for o in (arm, ref):
    o.matrix_world = Matrix.Translation(c_t) @ Matrix.Scale(k, 4) @ Matrix.Translation(-c_r) @ o.matrix_world
select([arm, ref]); bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# the fitted Mesh2Motion rig as it is now: the retarget source of step 5
arm0 = arm.copy(); arm0.data = arm.data.copy(); arm0.name = "M2M_fitted"; scene.collection.objects.link(arm0)
arm0.animation_data_create(); arm0.animation_data.action = None
rlo, rhi, _ = bbox(ref)
select([arm]); bpy.ops.object.mode_set(mode="EDIT")
EB = arm.data.edit_bones
if OWN:
    # THE WINGS BY LANDMARKS: shoulder, elbow, wrist, tip of the rig onto the download's own (its bind pose), piecewise
    # along the span; a point keeps its offset from the wing's line (the feather bones stay behind the leading edge)
    WMAP = {}
    for s, sg in (("L", 1), ("R", -1)):
        M = [EB[f"wing_1_{s}"].head.copy(), EB[f"wing_1_{s}"].tail.copy(), (EB[f"wing_2_{s}"].tail + EB[f"wing_3_{s}"].head) / 2, EB[f"wing_tip_{s}"].tail.copy()]
        tipv = Vector(CO[np.argmax(sg * CO[:, 0])])
        S = [SJ[f"WING1.{s}"][0], SJ[f"WING2.{s}"][0], SJ[f"WING3.{s}"][0], tipv]
        WMAP[s] = (sg, M, S)
        print(f"[falconV2] wing {s}: rig shoulder/elbow/wrist/tip x " + " ".join(f"{abs(m.x):.3f}" for m in M) + "  -> the download's " + " ".join(f"{abs(q.x):.3f}" for q in S))
    def wmap(p):
        s = "L" if p.x >= 0 else "R"; sg, M, S = WMAP[s]
        ax = sg * p.x; xs = [sg * m.x for m in M]
        if ax <= xs[0]: return p + (S[0] - M[0]) * max(0.0, ax / xs[0])
        i = 0 if ax < xs[1] else 1 if ax < xs[2] else 2
        u = (ax - xs[i]) / (xs[i + 1] - xs[i])
        return p + (S[i] + (S[i + 1] - S[i]) * u) - (M[i] + (M[i + 1] - M[i]) * u)
    orig = {eb.name: (eb.head.copy(), eb.tail.copy()) for eb in EB if eb.name.startswith("wing_")}   # (connected bones share points)
    for n_, (h, t) in orig.items(): EB[n_].head, EB[n_].tail = wmap(h), wmap(t)
    # THE NECK AND HEAD ON THE DOWNLOAD'S: its bind (an attack) holds the head ~15 cm higher than the Mesh2Motion
    # rig's, so the skull got the neck's weights (it stretched with every head turn). The neck / head joints are
    # found where the download's own neck / skull weights blend; the rig's neck, head and beak bones (and the
    # reference mesh's head) are moved by a piecewise offset along the body (none behind spine_1)
    def blend_at(A, B):
        wa = np.array([d.get(A, 0.0) for d in SRCW]); wb = np.array([d.get(B, 0.0) for d in SRCW]); m_ = np.minimum(wa, wb)
        return Vector((CO * m_[:, None]).sum(0) / m_.sum()) if m_.sum() > 0 else None
    sk_ = np.array([d.get("SKULL", 0.0) for d in SRCW]); tipS = Vector(CO[np.argmin(np.where(sk_ > 0.5, CO[:, 1], 9))])
    NK = [("spine_2", blend_at("CHEST", "NECK2")), ("spine_3", blend_at("NECK2", "NECK1")), ("head", blend_at("NECK1", "SKULL"))]
    if all(v is not None for _, v in NK):
        NM = [EB["spine_1"].head.copy()] + [EB[n].head.copy() for n, _ in NK] + [EB["mouth_upper_tip"].tail.copy()]
        NS = [EB["spine_1"].head.copy()] + [v for _, v in NK] + [tipS]
        def nmap(p):
            if p.y >= NM[0].y: return p.copy()
            for i in range(len(NM) - 1):
                if p.y >= NM[i + 1].y or i == len(NM) - 2:
                    u = (p.y - NM[i].y) / (NM[i + 1].y - NM[i].y)
                    return p + (NS[i] - NM[i]) * (1 - u) + (NS[i + 1] - NM[i + 1]) * u
        NECKB = ("spine_2", "spine_3", "head", "mouth_upper", "mouth_upper_tip", "mouth_lower", "mouth_lower_tip")
        orig = {n: (EB[n].head.copy(), EB[n].tail.copy()) for n in NECKB}
        for n, (h, t) in orig.items(): EB[n].use_connect = False
        for n, (h, t) in orig.items(): EB[n].head, EB[n].tail = nmap(h), nmap(t)
        print("[falconV2] neck / head joints onto the download's: " + ", ".join(f"{n} z {v.z:.3f}" for n, v in NK))
    else: nmap = None
    # THE LEGS ON THE DOWNLOAD'S JOINTS: hip, knee, ankle (intertarsal), foot (the toes' base), the middle toe's knuckles
    for s in "LR":
        mid = max((ch for hal, ch in TOECHAINS[s] if not hal), key=lambda ch: -(SJ[ch[-1]][1] - SJ[ch[0]][0]).y)
        pts = [SJ[f"leg1.{s}"][0], SJ[f"leg2.{s}"][0], SJ[f"leg3.{s}"][0], SJ[f"foot.{s}"][0], SJ[mid[1]][0], SJ[mid[-1]][0], SJ[mid[-1]][1]]
        for i, n in enumerate(("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes", "Toes_tip")):
            eb = EB[f"{n}_{s}"]; eb.use_connect = False
        for i, n in enumerate(("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes", "Toes_tip")):
            eb = EB[f"{n}_{s}"]; eb.head = pts[i]; eb.tail = pts[i + 1]; eb.align_roll(Vector((0, -1, 0)))
        print(f"[falconV2] legs {s}: hip {pts[0].z:.3f} knee {pts[1].z:.3f} ankle {pts[2].z:.3f} foot {pts[3].z:.3f} m above the feet")
else:
    # (no usable own rig: the wing chains stretched along X about each shoulder, as v2's first build)
    sx = span / max(rhi.x - rlo.x, 1e-6)
    for side in ("L", "R"):
        sh = EB.get(f"wing_1_{side}")
        if not sh: continue
        x0 = sh.head.x
        for eb in EB:
            if eb.name.startswith("wing_") and eb.name.endswith("_" + side):
                eb.head.x = x0 + (eb.head.x - x0) * sx; eb.tail.x = x0 + (eb.tail.x - x0) * sx
bpy.ops.object.mode_set(mode="OBJECT")
if OWN:
    for v in ref.data.vertices: v.co = wmap(v.co.copy())
    if nmap:
        for v in ref.data.vertices: v.co = nmap(v.co.copy())
else:
    for v in ref.data.vertices:
        if abs(v.co.x) > 0.15 * (rhi.x - rlo.x) / 2: v.co.x = math.copysign(abs(v.co.x) * sx + (1 - sx) * 0.15 * (rhi.x - rlo.x) / 2, v.co.x)
print(f"[falconV2] fit: uniform x{k:.3f}, wings {'by landmarks' if OWN else 'stretched'}")

# ------------------------------------------------------------------------------------------------ 4. the weights
for g in ref.vertex_groups: tgt.vertex_groups.new(name=g.name)
dt = tgt.modifiers.new("weights", "DATA_TRANSFER")
dt.object = ref; dt.use_vert_data = True; dt.data_types_verts = {"VGROUP_WEIGHTS"}
dt.vert_mapping = "POLYINTERP_NEAREST"; dt.layers_vgroup_select_src = "ALL"; dt.layers_vgroup_select_dst = "NAME"
select([tgt]); bpy.ops.object.datalayout_transfer(modifier=dt.name); bpy.ops.object.modifier_apply(modifier=dt.name)
upd()
GN = [g.name for g in tgt.vertex_groups]; GI = {n: i for i, n in enumerate(GN)}
Wt = np.zeros((NV, len(GN)))
for v in me.vertices:
    for g in v.groups: Wt[v.index, g.group] = g.weight
Wt /= np.maximum(Wt.sum(1, keepdims=True), 1e-9)
LEGB = ("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes")
legcols = [GI[n] for n in GN if n.startswith(LEGB)]
# loose parts (union-find over the edges)
E = np.array([tuple(e.vertices) for e in me.edges], dtype=np.int64)
par = np.arange(NV)
def find(i):
    while par[i] != i: par[i] = par[par[i]]; i = par[i]
    return i
for a_, b_ in E:
    ra, rb = find(a_), find(b_)
    if ra != rb: par[ra] = rb
PART = np.array([find(i) for i in range(NV)])
parts = {}
for i, p_ in enumerate(PART): parts.setdefault(p_, []).append(i)
CARD = np.zeros(NV, bool)
if OWN:
    # THE LEGS: the download's own leg weights, bone for bone; the rest of such a vertex keeps its transferred
    # (body) weights; the transferred leg weights elsewhere (the belly near the hips) go: the belly does not follow
    # the legs (the tarsi tuck under it)
    LEGMAP = {}
    for s in "LR":
        LEGMAP.update({f"leg1.{s}": f"UpperLeg_{s}", f"leg2.{s}": f"LowerLeg_{s}", f"leg3.{s}": f"AnkleLeg_{s}", f"foot.{s}": f"Foot_{s}"})
        for hal, ch in TOECHAINS[s]:
            for j, b in enumerate(ch):
                LEGMAP[b] = f"Foot_{s}" if hal or j == 0 else f"Toes_{s}" if j == 1 else f"Toes_tip_{s}"
    nleg = 0
    for vi in range(NV):
        sw = SRCW[vi]; tot = sum(sw.values()) or 1.0
        lw = {}
        for kk_, w in sw.items():
            if kk_ in LEGMAP: lw[LEGMAP[kk_]] = lw.get(LEGMAP[kk_], 0) + w / tot
        share = sum(lw.values()); row = Wt[vi]; row[legcols] = 0; s0 = row.sum()
        if s0 > 0: row *= (1 - share) / s0
        else: row[GI["hips"]] = 1 - share
        for n, w in lw.items(): row[GI[n]] += w
        nleg += share > 0.5
    print(f"[falconV2] legs: {nleg} vertices on the download's own leg weights")
    # THE FEATHER CARDS RIGID: a small loose part the download skins mostly to a flight / tail feather bone
    ncard, hist, CARDS = 0, {}, {}
    for p_, vs in parts.items():
        if len(vs) > 300: continue
        acc = {}
        for vi in vs:
            for kk_, w in SRCW[vi].items(): acc[kk_] = acc.get(kk_, 0) + w
        top = max(acc, key=acc.get) if acc else ""
        if not (top.startswith(("FLIGHTFEATHER", "TAILFEATHER")) or (top.startswith(("WING", "TAIL")) and len(vs) <= 120)): continue
        s = "L" if CO[vs, 0].mean() >= 0 else "R"
        m_ = re.match(r"FLIGHTFEATHER(_END)?(\d+)", top)
        if m_:
            # by the download's own feather groups (its bones' parents): the primaries ride the hand's feather bones,
            # the secondaries and tertials the forearm's (one sheet each: the fold slides the sheets, no splay)
            n_ = int(m_.group(2)); prim = bool(m_.group(1)) or n_ <= 8
            # five sheets a wing, each on a bone whose head is on the wing's leading edge near their roots (the pivot):
            # the outer primaries with the hand itself (the fold leaves them along it), the inner primaries and the
            # secondaries on the feather bones (turned back along the body in the fold: the fan closes by sheets)
            b = GI[f"wing_5_{s}" if (m_.group(1) or n_ <= 3) else f"wing_feather_4_1_{s}" if n_ <= 5 else f"wing_feather_3_1_{s}" if n_ <= 8 else f"wing_feather_2_1_{s}" if n_ <= 11 else f"wing_feather_1_1_{s}"]
        elif top.startswith("TAILFEATHER"): b = GI["tail_2"]
        else: b = int(np.argmax(Wt[vs].sum(0)))
        Wt[vs] = 0; Wt[vs, b] = 1; CARD[vs] = True; ncard += 1; hist[GN[b]] = hist.get(GN[b], 0) + 1
        CARDS.setdefault(GN[b], []).append(np.array(vs))
        if not top.startswith(("FLIGHT", "TAILF")): hist["(" + top + ")"] = hist.get("(" + top + ")", 0) + 1
    print(f"[falconV2] feather cards rigid: {ncard} cards on " + ", ".join(f"{k_} {v_}" for k_, v_ in sorted(hist.items())))
    # THE COVERT SHEETS: the wings' non-card vertices, their weights smoothed over the edges (a bend, not a crease)
    # (their feather-bone weights go to the wing bone that carries that feather bone: the fold turns the feather
    # bones far (the sheets back along the body), a covert half on one tore between its neighbours)
    for s in "LR":
        for fb_, wb_ in (("1", "wing_2"), ("2", "wing_3"), ("3", "wing_4"), ("4", "wing_5")):
            for k_ in ("1", "2"):
                c_ = GI.get(f"wing_feather_{fb_}_{k_}_{s}")
                if c_ is None: continue
                nc = ~CARD; Wt[nc, GI[f"{wb_}_{s}"]] += Wt[nc, c_]; Wt[nc, c_] = 0
    wingcols = [GI[n] for n in GN if n.startswith("wing")]
    sm = (~CARD) & (Wt[:, wingcols].sum(1) > 0.02) & (np.abs(CO[:, 0]) > 0.06)
    deg = np.zeros(NV); np.add.at(deg, E[:, 0], 1); np.add.at(deg, E[:, 1], 1)
    for it in range(8):
        acc = np.zeros_like(Wt); np.add.at(acc, E[:, 0], Wt[E[:, 1]]); np.add.at(acc, E[:, 1], Wt[E[:, 0]])
        avg = acc / np.maximum(deg, 1)[:, None]
        Wt[sm] = 0.5 * Wt[sm] + 0.5 * avg[sm]
    print(f"[falconV2] covert sheets: {int(sm.sum())} vertices smoothed")
else:
    # THE LEGS RIGID (no own rig): every vertex below the thighs or mostly on a leg bone follows its side's thigh alone
    hz = min((arm.matrix_world @ arm.data.bones[f"UpperLeg_{s_}"].head_local).z for s_ in ("L", "R"))
    lx = max(abs((arm.matrix_world @ arm.data.bones[f"UpperLeg_{s_}"].head_local).x) for s_ in ("L", "R"))
    for vi in range(NV):
        if Wt[vi, legcols].sum() > 0.12 or (CO[vi, 2] < hz - 0.01 and abs(CO[vi, 0]) < lx * 3):
            Wt[vi] = 0; Wt[vi, GI["UpperLeg_L" if CO[vi, 0] >= 0 else "UpperLeg_R"]] = 1
# at most 4 bones a vertex, normalised, written back
idx = np.argsort(-Wt, axis=1)[:, :4]
W4 = np.take_along_axis(Wt, idx, 1); W4[W4 < 0.01] = 0; W4 /= np.maximum(W4.sum(1, keepdims=True), 1e-9)
tgt.vertex_groups.clear()
VG = [tgt.vertex_groups.new(name=n) for n in GN]
for vi in range(NV):
    for j in range(4):
        if W4[vi, j] > 0: VG[idx[vi, j]].add([vi], float(W4[vi, j]), "REPLACE")
am = tgt.modifiers.new("rig", "ARMATURE"); am.object = arm
tgt.parent = arm
bpy.data.objects.remove(ref)

# ------------------------------------------------------------------------------------------------ 5. the clips
def pose_reset(a=None):
    for pb in (a or arm).pose.bones: pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
def set_action(a, act_):
    a.animation_data.action = act_
    if act_ is not None and act_.slots: a.animation_data.action_slot = act_.slots[0]
# THE RETARGET: the Mesh2Motion clips onto the moved bones. A bone keeps its pose relative to where the Mesh2Motion bone
# was (its rest offset carried rigidly); the legs take the clip's DIRECTIONS (their rest is the download's, far from
# Mesh2Motion's tucked legs); the toes keep the bind's relaxed curl.
R0 = {b.name: b.matrix_local.copy() for b in arm0.data.bones}
R1 = {b.name: b.matrix_local.copy() for b in arm.data.bones}
ORDER = sorted(arm.data.bones, key=lambda b: len(b.parent_recursive))
LEGDIR = tuple(f"{n}_{s}" for n in ("UpperLeg", "LowerLeg", "AnkleLeg", "Foot") for s in "LR") + ("spine_2", "spine_3", "head")   # (the neck: its rest is the bind's raised head)
TOEKEEP = tuple(f"{n}_{s}" for n in ("Toes", "Toes_tip") for s in "LR")
BEAK = ("mouth_lower", "mouth_lower_tip")          # the beak closed (the download's rest): the clips' gape opened it
YAX = Vector((0, 1, 0))
def retarget(src_act, name):
    set_action(arm0, src_act); pose_reset(arm0)
    act_ = bpy.data.actions.new(name); act_.use_fake_user = True
    set_action(arm, act_)
    f0, f1 = int(src_act.frame_range[0]), int(src_act.frame_range[1])
    for f in range(f0, f1 + 1):
        scene.frame_set(f); upd()
        P0 = {pb.name: pb.matrix.copy() for pb in arm0.pose.bones}
        PM = {}
        for b in ORDER:
            n = b.name
            frame0 = (PM[b.parent.name] @ (R1[b.parent.name].inverted() @ R1[n])) if b.parent else R1[n].copy()
            F3 = frame0.to_3x3()
            if (OWN and n in TOEKEEP) or n in BEAK: T3 = F3
            elif OWN and n in LEGDIR:
                d = (P0[n].to_3x3() @ YAX).normalized(); cur = (F3 @ YAX).normalized()
                T3 = cur.rotation_difference(d).to_matrix() @ F3
            else:
                T3 = P0[n].to_3x3() @ (R0[n].to_3x3().inverted() @ R1[n].to_3x3())
            q = (F3.inverted() @ T3).to_quaternion().normalized()
            pb = arm.pose.bones[n]; pb.rotation_mode = "QUATERNION"; pb.rotation_quaternion = q; pb.location = (0, 0, 0); pb.scale = (1, 1, 1)
            Mq = frame0 @ q.to_matrix().to_4x4(); PM[n] = Mq
        for pb in arm.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f)
    set_action(arm, None); set_action(arm0, None)
    return act_
for name in list(actions):
    src_act = actions[name]
    actions[name] = retarget(src_act, name)
    bpy.data.actions.remove(src_act)
bpy.data.objects.remove(arm0)
pose_reset()
print(f"[falconV2] retargeted {sorted(actions)}")

def aim(name, d):
    """turn pose bone `name` so it points along d (armature space, Blender frame: X left wing, -Y nose, Z up)"""
    pb = arm.pose.bones.get(name)
    if not pb: return
    upd()
    cur = (pb.matrix.to_3x3() @ Vector((0, 1, 0))).normalized()
    q = cur.rotation_difference(Vector(d).normalized())
    M = pb.matrix.copy(); loc = M.to_translation()
    R = (q.to_matrix() @ M.to_3x3()).to_4x4(); R.translation = loc
    pb.matrix = R
def turn(name, axis, ang):
    """turn pose bone `name` by ang (rad) about an armature-space axis through its head"""
    pb = arm.pose.bones[name]; upd()
    M = pb.matrix.copy(); R = (Matrix.Rotation(ang, 3, Vector(axis).normalized()) @ M.to_3x3()).to_4x4(); R.translation = M.translation; pb.matrix = R
def curl(s, ang_toes, ang_tip):
    """the toes closed (+) / opened (-) about the knuckles' hinge (the toe x the sole's normal)"""
    upd()
    foot, ank = arm.pose.bones[f"Foot_{s}"], arm.pose.bones[f"AnkleLeg_{s}"]
    fd = (foot.tail - foot.head).normalized(); ad = (ank.tail - ank.head).normalized()
    n = ad - fd * ad.dot(fd)                           # the sole's side: down the tarsus, square to the foot
    # the knuckles' hinge: the foot's side-to-side axis (a tarsus in line with the foot: the body's side axis)
    ax = fd.cross(n.normalized()) if n.length > 0.3 else Vector((1 if fd.y < 0 else -1, 0, 0))
    for b, a in ((f"Toes_{s}", ang_toes), (f"Toes_tip_{s}", ang_tip)):
        if a and ax.length > 1e-6: turn(b, ax, math.radians(a))
def capture(clip, frame=1):
    act_ = actions.get(clip)
    if not act_: return {}
    set_action(arm, act_); scene.frame_set(frame); upd()
    out = {pb.name: pb.rotation_quaternion.copy() for pb in arm.pose.bones}
    set_action(arm, None)
    return out
def apply_base(base, only=None):
    pose_reset()
    for pb in arm.pose.bones:
        if pb.name in base and (only is None or pb.name.startswith(only)): pb.rotation_quaternion = base[pb.name]
    upd()
def aims(P):
    for bname_, d in P.items():
        if bname_.endswith("*"):
            for s in ("L", "R"): aim(bname_[:-1] + "_" + s, (d[0] * (1 if s == "L" else -1), d[1], d[2]))
        else: aim(bname_, d)
    upd()
KEEPLOC = set()                                      # our clips whose root bone moves (exported: root.position)
def key_clip(name, posers, frames, loc=False):
    """posers: functions that pose the rig (from the reset pose), keyed at frames (24 fps); loc: the root's
    translation keyed too (the Perch's lowered, upright body)"""
    act_ = bpy.data.actions.new(name); act_.use_fake_user = True
    set_action(arm, act_)
    if loc: KEEPLOC.add(name)
    for f, fn in zip(frames, posers):
        fn(); upd()
        for pb in arm.pose.bones: pb.keyframe_insert("rotation_quaternion", frame=f)
        if loc: arm.pose.bones["root"].keyframe_insert("location", frame=f)
    actions[name] = act_
    set_action(arm, None)
    return act_
def eval_co():
    ev = tgt.evaluated_get(bpy.context.evaluated_depsgraph_get()); m = ev.to_mesh()
    a_ = np.empty(len(m.vertices) * 3); m.vertices.foreach_get("co", a_); ev.to_mesh_clear()
    return (np.array(tgt.matrix_world)[:3, :3] @ a_.reshape(-1, 3).T).T + np.array(tgt.matrix_world)[:3, 3]
TAILV = np.array([any(GN[g.group].startswith("tail") and g.weight > 0.5 for g in v.groups) for v in me.vertices])
WINGV = np.array([any(GN[g.group].startswith("wing") and g.weight > 0.5 for g in v.groups) for v in me.vertices])
HANDV = np.array([any(GN[g.group].startswith(("wing_3", "wing_4", "wing_5", "wing_tip", "wing_feather_3", "wing_feather_4")) and g.weight > 0.5 for g in v.groups) for v in me.vertices])
SECV = WINGV & ~HANDV
TIPV = {"L": int(np.argmax(CO[:, 0])), "R": int(np.argmin(CO[:, 0]))}   # the wings' outermost (rest) vertices
def seg_dist(p, a, b):
    d = b - a; t = max(0.0, min(1.0, (p - a).dot(d) / max(d.dot(d), 1e-12))); return (p - (a + d * t)).length
FEETV = np.array([any(GN[g.group].startswith(("Foot", "Toes")) and g.weight > 0.3 for g in v.groups) for v in me.vertices])
def bone_len(n): return arm.data.bones[n].length
def leg_ik(s, T, femur):
    """the leg from the hip to the foot's joint T: the femur along `femur`, the shank and tarsus by two-bone IK with
    the intertarsal joint pointing back (a bird's 'reversed knee')"""
    upd(); sg = 1 if s == "L" else -1
    H = arm.pose.bones[f"UpperLeg_{s}"].head.copy()
    K = H + Vector((femur[0] * sg, femur[1], femur[2])).normalized() * bone_len(f"UpperLeg_{s}")
    a, b = bone_len(f"LowerLeg_{s}"), bone_len(f"AnkleLeg_{s}")
    D = T - K; d = min(max(D.length, abs(a - b) + 1e-4), a + b - 1e-4); u = D.normalized()
    pole = Vector((0, 1, 0)); w = (pole - u * pole.dot(u)).normalized()
    ca = (a * a + d * d - b * b) / (2 * a * d); J = K + (u * ca + w * math.sqrt(max(0.0, 1 - ca * ca))) * a
    aim(f"UpperLeg_{s}", K - H); aim(f"LowerLeg_{s}", J - K); aim(f"AnkleLeg_{s}", K + u * d - J)
def leg_stand(s, T, tarsus_back=0.25):
    """a standing leg from the foot up: the foot's joint at T, the tarsus near upright from it (tilted back by
    tarsus_back rad: square to the flat toes, as the bind), then the femur and shank by two-bone IK from the hip to
    the ankle with the knee forward (a bird's knee, hidden in the belly)"""
    upd(); sg = 1 if s == "L" else -1
    H = arm.pose.bones[f"UpperLeg_{s}"].head.copy()
    lf, a, b = bone_len(f"UpperLeg_{s}"), bone_len(f"LowerLeg_{s}"), bone_len(f"AnkleLeg_{s}")
    J = T + Vector((0, math.sin(tarsus_back), math.cos(tarsus_back))) * b
    D = J - H; d = min(max(D.length, abs(lf - a) + 1e-4), lf + a - 1e-4); u = D.normalized()
    pole = Vector((0, -1, 0)); w = (pole - u * pole.dot(u)).normalized()
    ca = (lf * lf + d * d - a * a) / (2 * lf * d); K = H + (u * ca + w * math.sqrt(max(0.0, 1 - ca * ca))) * lf
    aim(f"UpperLeg_{s}", K - H); aim(f"LowerLeg_{s}", H + u * d - K); aim(f"AnkleLeg_{s}", T - J)
# directions (Blender frame: +X = the left wing's side, -Y = the nose, +Z = up)
FOLDED = capture("Idle", 1)
STOOP = {"tail_1": (0, 1, 0.03), "tail_2": (0, 1, 0), "tail_3": (0, 1, 0), "UpperLeg*": (0.08, 0.75, -0.3), "LowerLeg*": (0.05, 1, -0.1), "AnkleLeg*": (0.02, 1, 0.05), "Foot*": (0, 1, -0.15), "head": (0, -1, 0.08)}
TALONS = {"UpperLeg*": (0.15, -0.6, -0.8), "LowerLeg*": (0.1, -0.85, -0.5), "AnkleLeg*": (0.05, -0.6, -0.8), "Foot*": (0.05, -1, -0.1), "tail_1": (0, 0.85, -0.5)}
FLARE = {"wing_1*": (0.75, -0.3, 0.6), "tail_1": (0, 0.7, -0.7), "tail_2": (0, 0.75, -0.65), **{k_: v_ for k_, v_ in TALONS.items() if not k_.startswith("tail")}}
# THE FOLDED WING (our own, not Mesh2Motion's Idle fold: on this mesh that fold left the feather sheets fanned out from
# the body). Each wing bone and each feather group's bone turned as a FRAME (its line and the wing's upper surface):
# the humerus back, the forearm forward along the flank, the hand back over the back, the primaries back along it
# crossing over the tail, the secondaries / tertials back on the flank. Directions in the body's rest frame (+X the
# left side, -Y the nose, +Z up), the right side mirrored, then turned with the body (spine_1).
def frame_align(a1, a2, b1, b2):
    def basis(u, v):
        u = Vector(u).normalized(); w = u.cross(Vector(v)).normalized(); v2 = w.cross(u)
        return Matrix((u, v2, w)).transposed()
    return basis(b1, b2) @ basis(a1, a2).transposed()
# the feather groups' own line in the rest (the cards' mean root -> tip), per feather bone
GROUPDIR = {}
for gname, cards in (CARDS.items() if OWN else []):
    acc = Vector((0, 0, 0))
    for vs in cards:
        P_ = CO[vs]; c_ = P_.mean(0); bh = Vector(arm.data.bones[gname].head_local)
        r_ = P_[np.argmin(P_[:, 1])]                     # the root: the card's front end (the feathers trail back)
        t_ = P_[np.argmax(np.linalg.norm(P_ - r_, axis=1))]
        acc += Vector(t_ - r_).normalized()
    GROUPDIR[gname] = acc.normalized()
FOLD = {  # bone: (line, upper surface), the left wing
    "wing_1": ((0.40, 0.85, -0.30), (0.45, -0.1, 0.9)),
    "wing_2": ((0.06, -1.0, 0.08), (0.85, 0.0, 0.5)),
    "wing_3": ((-0.05, 1.0, 0.10), (0.75, 0.0, 0.65)),
    "wing_feather_4_1": ((-0.09, 1.0, 0.03), (0.35, 0.0, 0.94)),
    "wing_feather_3_1": ((-0.06, 1.0, 0.02), (0.45, 0.0, 0.9)),
    "wing_feather_2_1": ((-0.12, 1.0, 0.20), (0.65, 0.0, 0.75)),
    "wing_feather_1_1": ((-0.15, 1.0, 0.25), (0.7, 0.0, 0.7)),
}
FOLD_ORDER = ["wing_1", "wing_2", "wing_3", "wing_feather_4_1", "wing_feather_3_1", "wing_feather_2_1", "wing_feather_1_1"]
def fold_wings(tweak=None):
    for pb in arm.pose.bones:                         # the hand straight, the second feather bones at rest
        if pb.name.startswith("wing") and pb.name[:-2] not in FOLD: pb.rotation_quaternion = (1, 0, 0, 0)
    upd()
    Rb = arm.pose.bones["spine_1"].matrix.to_3x3() @ arm.data.bones["spine_1"].matrix_local.to_3x3().inverted()
    for s, sg in (("L", 1), ("R", -1)):
        for b in FOLD_ORDER:
            n = f"{b}_{s}"
            if n not in arm.pose.bones: continue
            line, surf = (tweak or {}).get(b, FOLD[b])
            m3 = lambda v: Vector((v[0] * sg, v[1], v[2]))
            R3 = arm.data.bones[n].matrix_local.to_3x3()
            a1 = GROUPDIR.get(n) if b.startswith("wing_feather") and n in GROUPDIR else R3 @ Vector((0, 1, 0))
            T3 = frame_align(a1, Vector((0, 0, 1)), Rb @ m3(line), Rb @ m3(surf)) @ R3
            upd(); pb = arm.pose.bones[n]; M = pb.matrix.copy(); R = T3.to_4x4(); R.translation = M.translation; pb.matrix = R
    upd()
def p_stoop():
    apply_base({}); fold_wings(); aims(STOOP); [curl(s, 10, 10) for s in "LR"]
def p_talons(): apply_base({}); aims(TALONS); [curl(s, -50, -20) for s in "LR"]
def p_flare(wing1=None):
    def f():
        apply_base({}); aims({**FLARE, **({"wing_1*": wing1} if wing1 else {})}); [curl(s, -50, -20) for s in "LR"]
    return f
PERCH_PITCH = math.radians(float(arg("--perch-pitch", "45")))    # the body's line above the horizontal
PERCH_HIP, PERCH_HIPY = float(arg("--perch-hip", "0.13")), 0.015 # the hip joints above / behind the feet (m)
PERCH_FOOTX = 0.03                                               # the feet either side of the midline (m)
PERCH_NECK = float(arg("--perch-neck", "55"))                    # deg: the neck's line above the horizontal
def body_angle():
    upd(); P_ = arm.pose.bones; d = P_["spine_1"].head - P_["hips"].head
    return math.degrees(math.atan2(d.z, -d.y))
def p_perch(base, look=0.0):
    def f():
        apply_base(base)
        # the body upright: the whole bird turned nose-up (the root) to PERCH_PITCH, then moved (the root's
        # translation: the one translation track) so the hip joints sit PERCH_HIP above the feet, over them
        a0 = body_angle(); pb = arm.pose.bones["root"]; M = pb.matrix.copy()
        pb.matrix = Matrix.Rotation(-math.radians(math.degrees(PERCH_PITCH) - a0), 4, "X") @ M; upd()
        Hm = (arm.pose.bones["UpperLeg_L"].head + arm.pose.bones["UpperLeg_R"].head) / 2
        M = pb.matrix.copy(); pb.matrix = Matrix.Translation(Vector((0, PERCH_HIPY, PERCH_HIP)) - Hm) @ M; upd()
        # the wings pressed onto the back and flanks (the Mesh2Motion fold leaves them off this mesh's body)
        fold_wings()
        # the neck on up the body's line, the head level (a perched falcon's alert look)
        nk = lambda a: (0, -math.cos(math.radians(a)), math.sin(math.radians(a)))
        aims({"spine_2": nk(PERCH_NECK), "spine_3": nk(PERCH_NECK + 25), "head": (math.sin(look), -math.cos(look), -0.12)})
        # the tail on along the body, lifted at its base where it would reach the ground (a falcon standing on a flat
        # roof: the tail just off it)
        for i in range(14):
            if eval_co()[TAILV][:, 2].min() > 0.006: break
            turn("tail_1", (1, 0, 0), math.radians(4))
        # the folded wings' tips onto the tail (a perched falcon's primaries lie on it, crossing): the hand turned
        # up / in (a small search) to bring the tip vertices nearest the tail's line, never below the ground
        upd(); base_q = {s: arm.pose.bones[f"wing_3_{s}"].rotation_quaternion.copy() for s in "LR"}
        best = None
        for up_ in range(-10, 36, 5):
            for in_ in range(0, 26, 5):
                for s, sg in (("L", 1), ("R", -1)):
                    arm.pose.bones[f"wing_3_{s}"].rotation_quaternion = base_q[s]
                    turn(f"wing_3_{s}", (1, 0, 0), math.radians(up_))
                    upd(); fb_ = (arm.pose.bones["spine_1"].head - arm.pose.bones["hips"].head).normalized()
                    turn(f"wing_3_{s}", fb_, sg * math.radians(in_))
                X_ = eval_co(); upd()
                ta, tb = arm.pose.bones["tail_1"].head, arm.pose.bones["tail_tip"].head
                d_ = max(seg_dist(Vector(X_[TIPV[s]]), ta, tb) for s in "LR")
                if X_[HANDV][:, 2].min() < 0.012: d_ += 1.0
                if best is None or d_ < best[0]: best = (d_, up_, in_)
        for s, sg in (("L", 1), ("R", -1)):
            arm.pose.bones[f"wing_3_{s}"].rotation_quaternion = base_q[s]
            turn(f"wing_3_{s}", (1, 0, 0), math.radians(best[1]))
            upd(); fb_ = (arm.pose.bones["spine_1"].head - arm.pose.bones["hips"].head).normalized()
            turn(f"wing_3_{s}", fb_, sg * math.radians(best[2]))
        # the folded wing's sheets likewise (on a steep body the hand's and the secondaries' tips reach the ground)
        for i in range(12):
            X_ = eval_co(); lowh, lows = X_[HANDV][:, 2].min() < 0.012, X_[SECV][:, 2].min() < 0.012
            if not (lowh or lows): break
            for s in "LR":
                if lowh: turn(f"wing_3_{s}", (1, 0, 0), math.radians(2))
                if lows:
                    for b in ("wing_feather_1_1", "wing_feather_2_1"): turn(f"{b}_{s}", (1, 0, 0), math.radians(3))

        # the legs: the feet under the body by IK, the foot and toes flat, the claws curled down (gripping); three times, the
        # later ones with the posed mesh's lowest foot point put on the ground
        P_ = arm.pose.bones
        for it in range(3):
            upd()
            for s, sg in (("L", 1), ("R", -1)):
                H = P_[f"UpperLeg_{s}"].head
                zf = 0.025 if it == 0 else T_z[s]
                T = Vector((sg * PERCH_FOOTX, 0.0, zf))
                leg_stand(s, T); aim(f"Foot_{s}", (sg * 0.14, -1, -0.03)); curl(s, -8, 6)
            upd(); X = eval_co(); feet = X[FEETV]
            T_z = {}
            for s, sg in (("L", 1), ("R", -1)):
                m_ = feet[(feet[:, 0] * sg) > 0]
                T_z[s] = (P_[f"Foot_{s}"].head.z) - (m_[:, 2].min() if len(m_) else 0.0)
    return f
key_clip("Stoop", [p_stoop, p_stoop], [0, 12])
key_clip("Talons", [p_talons, p_talons], [0, 12])
key_clip("Flare", [p_flare(), p_flare((0.7, -0.4, 0.62)), p_flare()], [0, 6, 12])
key_clip("Perch", [p_perch(FOLDED), p_perch(capture("Idle", 13), 0.25), p_perch(FOLDED)], [0, 24, 48], loc=True)
# THE GROUND CLIPS ON THE GROUND: the retargeted legs (the download's lengths, Mesh2Motion's directions) put the feet
# off the floor; the root moved down / up so the lowest foot point is on it (Walk, Idle: each frame; Hop: its first)
# and their wings folded as ours (the Mesh2Motion fold fans this mesh's feather sheets out: see fold_wings)
def ground_clip(name, per_frame=True):
    act_ = actions.get(name)
    if not act_: return
    set_action(arm, act_); KEEPLOC.add(name); pb = arm.pose.bones["root"]
    f0, f1 = int(act_.frame_range[0]), int(act_.frame_range[1]); dz = None
    wingb = [p_.name for p_ in arm.pose.bones if p_.name.startswith("wing")]
    for f in range(f0, f1 + 1):
        scene.frame_set(f); upd()
        fold_wings()
        for n_ in wingb: arm.pose.bones[n_].keyframe_insert("rotation_quaternion", frame=f)
        if per_frame or dz is None: dz = -float(eval_co()[FEETV][:, 2].min())
        M = pb.matrix.copy(); pb.matrix = Matrix.Translation((0, 0, dz)) @ M; upd(); pb.keyframe_insert("location", frame=f)
        if per_frame: dz = None
    set_action(arm, None)
for n_ in ("Walk", "Idle"): ground_clip(n_)
ground_clip("Hop", per_frame=False)
pose_reset(); set_action(arm, None)
print(f"[falconV2] clips {sorted(actions)}")

# the checks the gate repeats on the shipped glb (tools/falconV2pose.mjs), printed here for the build
def metrics(clip, frame=0):
    set_action(arm, actions[clip]); scene.frame_set(frame); upd(); X = eval_co(); set_action(arm, None); return X
X0 = eval_co()
for c in ("Perch", "Stoop", "Glide"):
    X = metrics(c)
    e0 = np.linalg.norm(X0[E[:, 0]] - X0[E[:, 1]], axis=1); e1 = np.linalg.norm(X[E[:, 0]] - X[E[:, 1]], axis=1)
    rel = np.abs(e1 / np.maximum(e0, 1e-6) - 1); card = CARD[E[:, 0]]
    bad = rel > 0.3; vb = np.concatenate([E[bad, 0], E[bad, 1]]); hb_ = {}
    for vi in vb[:4000]:
        g_ = GN[max(me.vertices[int(vi)].groups, key=lambda g: g.weight).group]; hb_[g_] = hb_.get(g_, 0) + 1
    print(f"[falconV2] {c}: edges > 30 % on " + ", ".join(f"{k_} {v_}" for k_, v_ in sorted(hb_.items(), key=lambda x: -x[1])[:6]))
    print(f"[falconV2] {c}: card edges stretch max {rel[card].max() if card.any() else 0:.3f}, all edges p99 {np.percentile(rel, 99):.3f} max {rel.max():.3f}; lowest {X[:, 2].min():.3f} m ({GN[max(me.vertices[int(np.argmin(X[:, 2]))].groups, key=lambda g: g.weight).group]})")

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

# ------------------------------------------------------------------------------------------------ 7. export
# rotations only: the Mesh2Motion clips' bone translations are in its own unscaled units; the bone lengths are ours
for act_ in actions.values():
    for layer in act_.layers:
        for strip in layer.strips:
            for cb in strip.channelbags:
                for fc in list(cb.fcurves):
                    if fc.data_path.endswith(".scale") or (fc.data_path.endswith(".location") and not (act_.name in KEEPLOC and fc.data_path == 'pose.bones["root"].location')): cb.fcurves.remove(fc)
for a_ in list(bpy.data.actions):
    if a_ not in actions.values(): bpy.data.actions.remove(a_)
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
select([arm, tgt])
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_animations=True, export_animation_mode="ACTIONS",
    export_force_sampling=True, export_optimize_animation_size=True, export_image_format="AUTO", export_lights=False, export_cameras=False,
    export_skins=True, export_all_influences=False, export_yup=True, export_apply=False)
# the textures as raw RGBA (top row first) + their colour space, for the pack step's KTX2 (tools/falconV2pack.mjs)
TEXDIR = OUT + ".tex"; os.makedirs(TEXDIR, exist_ok=True)
meta = {}
def dump(name, px, w, h, srgb, **extra):
    a_ = (np.clip(px.reshape(h, w, 4)[::-1], 0, 1) * 255 + 0.5).astype(np.uint8)
    fn = "".join(c if c.isalnum() or c in "._-" else "_" for c in name)
    a_.tofile(os.path.join(TEXDIR, fn + ".rgba"))
    meta[name] = {"file": fn + ".rgba", "width": w, "height": h, "srgb": srgb, **extra}
for img in bpy.data.images:
    if img.users == 0 or img.size[0] == 0: continue
    w, h = img.size; px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    dump(img.name, px, w, h, img.colorspace_settings.name.lower().startswith("srgb"))
tris = sum(len(p.vertices) - 2 for p in me.polygons)
print(f"[falconV2] wrote {OUT}: {tris} triangles, {len(actions)} clips")

# ------------------------------------------------------------------------------------------------ 8. the juvenile plumage
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
def mixc(a, b, t): return a + (b - a) * np.clip(t, 0, 1)[..., None]
C = lambda *rgb: np.array(rgb, np.float32)
def box(img, mask, r):
    """a masked box blur (normalised: the island's own pixels only), radius r px, via integral images"""
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
if JUV:
    mat = tgt.material_slots[0].material
    bsdf = next(n for n in mat.node_tree.nodes if n.type == "BSDF_PRINCIPLED")
    def src_image(sock):
        for l in sock.links:
            n = l.from_node
            if n.type == "TEX_IMAGE": return n.image
            for s_ in n.inputs:
                r_ = src_image(s_)
                if r_: return r_
        return None
    base = src_image(bsdf.inputs["Base Color"])
    w, h = base.size
    A = np.empty(w * h * 4, np.float32); base.pixels.foreach_get(A); A = A.reshape(h, w, 4)   # bottom row first (as UVs)
    # per-vertex attributes in the bind pose: position, normal, region weights
    NRM = np.array([tuple(v.normal) for v in me.vertices])
    def wsum(prefixes):
        out = np.zeros(NV)
        for v in me.vertices:
            out[v.index] = sum(g.weight for g in v.groups if GN[g.group].startswith(prefixes))
        return out
    HEADW = wsum(("head", "mouth", "spine_3")); LEGW = wsum(("UpperLeg", "LowerLeg", "AnkleLeg", "Foot", "Toes"))
    TAILW = wsum(("tail",))
    ATTR = np.concatenate([CO, NRM, HEADW[:, None], LEGW[:, None], CARD[:, None].astype(float), TAILW[:, None]], 1)
    NA = ATTR.shape[1]
    # raster every UV triangle: the attributes interpolated per texel
    me.calc_loop_triangles()
    uvl = me.uv_layers[0].data
    UV = np.empty(len(uvl) * 2); uvl.foreach_get("uv", UV); UV = UV.reshape(-1, 2)
    LT = np.empty(len(me.loop_triangles) * 3, np.int64); me.loop_triangles.foreach_get("loops", LT); LT = LT.reshape(-1, 3)
    LV = np.empty(len(me.loops), np.int64); me.loops.foreach_get("vertex_index", LV)
    G = np.zeros((h, w, NA), np.float32); COV = np.zeros((h, w), bool)
    for tri in LT:
        uv = UV[tri] * [w, h] - 0.5; at = ATTR[LV[tri]]
        x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
        x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, w - 1), min(y1, h - 1)
        if x1 < x0 or y1 < y0: continue
        gx, gy = np.meshgrid(np.arange(x0, x1 + 1), np.arange(y0, y1 + 1))
        (ax_, ay_), (bx_, by_), (cx_, cy_) = uv
        den = (by_ - cy_) * (ax_ - cx_) + (cx_ - bx_) * (ay_ - cy_)
        if abs(den) < 1e-12: continue
        l0 = ((by_ - cy_) * (gx - cx_) + (cx_ - bx_) * (gy - cy_)) / den
        l1 = ((cy_ - ay_) * (gx - cx_) + (ax_ - cx_) * (gy - cy_)) / den
        l2 = 1 - l0 - l1
        ins = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
        if not ins.any(): continue
        vals = l0[ins][:, None] * at[0] + l1[ins][:, None] * at[1] + l2[ins][:, None] * at[2]
        G[gy[ins], gx[ins]] = vals; COV[gy[ins], gx[ins]] = True
    # dilate the attributes 3 px past the islands' edges (mip / filtering bleed)
    for it in range(3):
        nb = box(G, COV, 1); grow = (~COV) & (box(COV.astype(float), np.ones_like(COV), 1) > 0)
        G[grow] = nb[grow]; COV = COV | grow
    p = G[..., 0:3]; n = G[..., 3:6]; headw, legw, cardw, tailw = G[..., 6], G[..., 7], G[..., 8], G[..., 9]
    rgb = A[..., :3]
    Y = rgb @ np.array([0.30, 0.59, 0.11], np.float32)
    Yb = box(Y, COV, 10)
    detail = np.clip(Y / np.maximum(Yb, 0.02), 0.4, 1.8)
    # the palette (sRGB): peregrine.py --variant juvenile's, the photo-checked young of the year
    BROWN_D, BROWN, BROWN_M, BUFF, BUFF_L, STREAK = C(0.12, 0.08, 0.055), C(0.24, 0.16, 0.10), C(0.42, 0.30, 0.19), C(0.80, 0.66, 0.46), C(0.90, 0.80, 0.62), C(0.26, 0.17, 0.11)
    def ramp(y):
        """the adult's lightness -> the juvenile's browns: slate -> dark brown, pale edges -> buff"""
        y = np.clip(y, 0, 1)
        c = mixc(BROWN_D, BROWN, smooth(0.04, 0.30, y)); c = mixc(c, BROWN_M, smooth(0.30, 0.55, y))
        c = mixc(c, BUFF, smooth(0.52, 0.78, y)); return mixc(c, BUFF_L, smooth(0.78, 0.95, y))
    upper = ramp(Y * 0.92)
    # buff fringes on the upperparts' feathers (the juvenile's scaly back): the adult's lighter feather edges, lifted
    upper = mixc(upper, BUFF * 0.85, 0.55 * smooth(1.08, 1.35, detail) * (1 - cardw))
    # underparts: the adult's bars removed (its fine detail only), buff, dark VERTICAL streaks (drops along the body)
    zc = float(np.median(CO[(np.abs(CO[:, 0]) < 0.05) & (np.abs(CO[:, 1]) < 0.05), 2])) if ((np.abs(CO[:, 0]) < 0.05) & (np.abs(CO[:, 1]) < 0.05)).any() else 0.15
    arc = np.arctan2(p[..., 0], -(p[..., 2] - zc)) * 0.06              # metres round the body from the belly's line
    col_id = np.floor(arc / 0.011)
    wob = np.sin(p[..., 1] * 90.0 + col_id * 2.3) * 0.0012
    across = 0.5 + 0.5 * np.cos(2 * np.pi * (arc + wob) / 0.011)
    along = 0.5 + 0.5 * np.sin(2 * np.pi * p[..., 1] / 0.024 + col_id * 1.7)
    streak = smooth(0.62, 0.88, across) * smooth(0.25, 0.65, along)
    fine = np.clip(box(detail, COV, 1) / np.maximum(box(detail, COV, 6), 0.05), 0.8, 1.2)
    under = BUFF[None, None] * fine[..., None]
    # the throat and upper breast plainer (as real juveniles), the flanks and belly heavily streaked
    hz_ = np.array([tuple(arm.data.bones["head"].head_local)])[0]
    dthroat = np.linalg.norm(p - hz_, axis=-1)
    under = mixc(under, STREAK, 0.85 * streak * smooth(0.06, 0.11, dthroat))
    underm = np.maximum(smooth(0.10, -0.30, n[..., 2]), smooth(-0.45, -0.80, n[..., 1]) * (1 - smooth(0.5, 0.8, headw)))
    underm = underm * (1 - cardw) * (1 - smooth(0.5, 0.8, tailw))
    col = mixc(upper, under, underm)
    # the flight feathers: the same ramp (dark brown above, barred buff and brown below: a juvenile's are barred too)
    col = mixc(col, ramp(Y * 0.95), cardw)
    # the head: hood and moustache dark brown, cheeks and throat buff (the ramp), the cere and eye ring bluish-grey
    yellow = smooth(0.25, 0.45, rgb[..., 0] - rgb[..., 2]) * smooth(0.35, 0.55, rgb[..., 1]) * smooth(0.10, 0.25, rgb[..., 0] - rgb[..., 1] * 0.8 + 0.1)
    headm = smooth(0.35, 0.7, headw)
    col = mixc(col, ramp(Y * 0.95), headm * (1 - yellow))
    col = mixc(col, C(0.58, 0.64, 0.70) * np.clip(Y / 0.6, 0.6, 1.2)[..., None], yellow * (1 - smooth(0.3, 0.6, legw)))
    # the feet: a juvenile's are paler, greener yellow
    col = mixc(col, rgb * C(0.92, 0.95, 0.80) + C(0.04, 0.04, 0.06), yellow * smooth(0.3, 0.6, legw))
    # outside the islands: the adult as it was (black); alpha as the adult's (the cut-out feathers)
    OUTI = np.dstack([np.where(COV[..., None], col, rgb), A[..., 3:4]]).astype(np.float32)
    dump("juvenile", OUTI.reshape(-1), w, h, True, variant_of=base.name)   # (bottom row first, as Blender's pixels)
    jimg = bpy.data.images.new("juvenile", w, h, alpha=True); jimg.pixels.foreach_set(OUTI.reshape(-1)); jimg.filepath_raw = OUT + ".juvenile.png"; jimg.file_format = "PNG"; jimg.save()
    print(f"[falconV2] juvenile plumage on v2's UVs: {w}x{h}, {int(COV.sum())} texels painted -> {OUT}.juvenile.png")
json.dump(meta, open(os.path.join(TEXDIR, "textures.json"), "w"), indent=1)
