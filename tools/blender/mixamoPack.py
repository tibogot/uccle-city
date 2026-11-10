# MIXAMO PACK: the Y Bot character + every Mixamo clip in ONE GLB, on ONE skeleton (no retargeting).
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/mixamoPack.py -- <mixamo dir> <pack.glb> <model.glb>
#
# pack.glb: the skeleton + every clip as authored (an intermediate: data/raw/animations/mixamo/glb/pack.glb);
# model.glb: the skinned Y Bot without clips (models/characters/ybot.glb).
#
# <mixamo dir>: ybot.fbx (FBX Binary, With Skin, T-pose) + the clips (FBX Binary, Without Skin, 30 fps, downloaded with
# Y Bot selected: the same skeleton). Each clip's action is moved onto Y Bot's armature under the file's name. The rest
# pose of every clip's armature is CHECKED against Y Bot's (bone by bone, head / tail / roll): an action is local to its
# rest pose, so a clip from another skeleton would bend the limbs (that is what retargeting fixes; here nothing is
# retargeted, so a mismatch is an error, not a silent distortion).
#
# Adobe's terms: the outputs are for this project only (git-ignored), see CREDITS.md.
# The clips are left as authored (root motion in the hips); tools/characters/mixamoClips.mjs makes them in place and
# writes their metadata.
import bpy, sys, os, glob

argv = sys.argv[sys.argv.index("--") + 1:]
src, out, model_out = argv[0], argv[1], argv[2]
SKIP = {"ybot.fbx"}

def imp(path):
    before = set(bpy.data.objects)
    acts0 = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=path, automatic_bone_orientation=False, ignore_leaf_bones=False)
    new = [o for o in bpy.data.objects if o not in before]
    arm = next((o for o in new if o.type == "ARMATURE"), None)
    return arm, new, [a for a in bpy.data.actions if a not in acts0]

bpy.ops.wm.read_factory_settings(use_empty=True)
ybot, ynew, yacts = imp(os.path.join(src, "ybot.fbx"))
for a in yacts: bpy.data.actions.remove(a)           # (its bind "take")
rest = {b.name: (b.head_local.copy(), b.tail_local.copy(), b.matrix_local.copy()) for b in ybot.data.bones}
print(f"mixamoPack: Y Bot: {len(rest)} bones, meshes {[o.name for o in ynew if o.type == 'MESH']}")

files = sorted(f for f in glob.glob(os.path.join(src, "*.fbx")) if os.path.basename(f).lower() not in SKIP)
kept = []
for f in files:
    name = os.path.splitext(os.path.basename(f))[0]
    arm, new, acts = imp(f)
    if arm is None or not acts:
        print(f"  {name}: no armature / action, skipped")
    else:
        # the rest pose check (bone positions in the armature's space: the actions are relative to it)
        worst, worstB, missing = 0.0, "", []
        for b in arm.data.bones:
            r = rest.get(b.name)
            if r is None: missing.append(b.name); continue
            d = max((b.head_local - r[0]).length, (b.tail_local - r[1]).length)
            # (and the bone's own axes: a different roll turns every local rotation)
            for k in range(3):
                d = max(d, (b.matrix_local.col[k].to_3d() - r[2].col[k].to_3d()).length * 10)
            if d > worst: worst, worstB = d, b.name
        ok = worst < 0.5 and not missing           # (FBX units: cm; axes x10: 0.05 = ~3 deg)
        print(f"  {name}: {len(acts)} action(s), {acts[0].frame_range[1] - acts[0].frame_range[0] + 1:.0f} frames, rest pose vs Y Bot: max {worst:.3f} ({worstB}){' MISSING ' + str(missing[:4]) if missing else ''} -> {'OK' if ok else 'MISMATCH, skipped'}")
        if ok:
            a = acts[0]; a.name = name; a.use_fake_user = True
            kept.append(a)
            for extra in acts[1:]: bpy.data.actions.remove(extra)
        else:
            for a in acts: bpy.data.actions.remove(a)
    for o in new: bpy.data.objects.remove(o, do_unlink=True)

# every kept action on Y Bot's armature, one NLA track each (the glTF exporter writes one animation per action)
ybot.animation_data_create()
for a in kept:
    tr = ybot.animation_data.nla_tracks.new(); tr.name = a.name
    st = tr.strips.new(a.name, int(a.frame_range[0]), a); st.name = a.name
    tr.mute = True
ybot.animation_data.action = None
bpy.context.scene.render.fps = 30
os.makedirs(os.path.dirname(os.path.abspath(out)), exist_ok=True)
bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_animation_mode="NLA_TRACKS",
                          export_force_sampling=True, export_frame_step=1, export_optimize_animation_size=True,
                          export_skins=True, export_def_bones=False, export_apply=False, export_yup=True,
                          export_morph=False, export_reset_pose_bones=True, export_anim_single_armature=True)
print(f"mixamoPack: {len(kept)} clips -> {out} ({os.path.getsize(out) / 1024:.0f} KB)")
# the model alone (the clips come from tools/characters/mixamoClips.mjs)
ybot.animation_data_clear()
bpy.ops.export_scene.gltf(filepath=model_out, export_format="GLB", export_animations=False, export_skins=True,
                          export_def_bones=False, export_apply=False, export_yup=True, export_morph=False)
print(f"mixamoPack: model -> {model_out} ({os.path.getsize(model_out) / 1024:.0f} KB)")
