# FBX animation files -> GLB (armature + its actions only), as plain format conversion for the retargeter
# (tools/characters/retarget.mjs does the retargeting math). Mixamo: download "FBX Binary", "Without Skin", 30 fps.
#
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/fbx2glb.py -- <in_dir> <out_dir>
#
# Every *.fbx in in_dir -> out_dir/<same name>.glb. Each file's actions keep their names; a file with one take gets the
# file's name as its action name. Meshes (a skinned "Y Bot" reference) are dropped: only the skeleton and its motion.
import bpy, sys, os, glob

argv = sys.argv[sys.argv.index("--") + 1:]
src, dst = argv[0], argv[1]
os.makedirs(dst, exist_ok=True)
files = sorted(glob.glob(os.path.join(src, "*.fbx")))
print(f"fbx2glb: {len(files)} files in {src}")
for f in files:
    bpy.ops.wm.read_factory_settings(use_empty=True)
    before = set(bpy.data.actions)
    bpy.ops.import_scene.fbx(filepath=f, automatic_bone_orientation=False, ignore_leaf_bones=False)
    for o in list(bpy.data.objects):
        if o.type != "ARMATURE": bpy.data.objects.remove(o, do_unlink=True)
    acts = [a for a in bpy.data.actions if a not in before]
    name = os.path.splitext(os.path.basename(f))[0]
    if len(acts) == 1: acts[0].name = name
    arm = next((o for o in bpy.data.objects if o.type == "ARMATURE"), None)
    if arm is None:
        print(f"  {name}: no armature, skipped"); continue
    if acts and arm.animation_data is None: arm.animation_data_create()
    if acts: arm.animation_data.action = acts[0]
    out = os.path.join(dst, name + ".glb")
    bpy.ops.export_scene.gltf(filepath=out, export_format="GLB", export_animations=True, export_animation_mode="ACTIONS",
                              export_force_sampling=True, export_frame_step=1, export_skins=True, export_def_bones=False,
                              export_apply=False, export_yup=True)
    print(f"  {name}: {len(acts)} action(s) -> {out}")
