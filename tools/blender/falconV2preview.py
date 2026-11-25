"""THE FALCON V2 PREVIEWS (docs/FALCON_GYM.md "the model"): Cycles renders (OptiX) of an exported falcon_v2 glb (the raw
one: Blender cannot read meshopt / KTX2) in its clips, on a checker ground under a grazing sun (the shading check:
docs/rules/blender-clean-normals.md) and a sky.

    blender --factory-startup -b -P tools/blender/falconV2preview.py -- --glb <raw.glb> --out <dir> [--prefix v2polish_]
        [--tex <basecolour.png>] [--shots perch_front,perch_side,stoop,glide,talons] [--samples 64] [--size 960x640]

  --tex   a base colour to wear instead of the glb's (the juvenile: <raw.glb>.juvenile.png)
"""
import bpy, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None): return argv[argv.index(k) + 1] if k in argv else d
GLB, OUT, PRE, TEXP = arg("--glb"), arg("--out"), arg("--prefix", "v2polish_"), arg("--tex")
SHOTS = arg("--shots", "perch_front,perch_side,stoop,glide,talons").split(",")
SW, SH = (int(x) for x in arg("--size", "960x640").split("x"))
bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in scene.objects if o.type == "ARMATURE")
bird = next(o for o in scene.objects if o.type == "MESH" and any(m.type == "ARMATURE" for m in o.modifiers))
for o in list(scene.objects):
    if o.type == "MESH" and o is not bird: bpy.data.objects.remove(o)
if TEXP:
    img = bpy.data.images.load(TEXP)
    for slot in bird.material_slots:
        for n in slot.material.node_tree.nodes:
            if n.type == "TEX_IMAGE" and n.image and n.image.colorspace_settings.name.lower().startswith("srgb"): n.image = img
# Cycles on the GPU (OptiX): factory settings are CPU
scene.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"; prefs.get_devices()
    for d in prefs.devices: d.use = True
    scene.cycles.device = "GPU"
except Exception as e: print(f"[preview] OPTIX unavailable ({e}): CPU")
scene.cycles.samples = int(arg("--samples", "64")); scene.cycles.use_denoising = True
scene.render.resolution_x, scene.render.resolution_y = SW, SH
scene.view_settings.view_transform = "AgX"
# the ground: a checker (10 cm squares), the sun low and to the side, a sky
bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0))
ground = bpy.context.active_object; gm = bpy.data.materials.new("checker"); gm.use_nodes = True
nt = gm.node_tree; ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 80
ck.inputs["Color1"].default_value = (0.55, 0.55, 0.55, 1); ck.inputs["Color2"].default_value = (0.32, 0.32, 0.32, 1)
nt.links.new(ck.outputs["Color"], nt.nodes["Principled BSDF"].inputs["Base Color"]); ground.data.materials.append(gm)
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scene.collection.objects.link(sun)
sun.data.energy = 3.5; sun.data.angle = math.radians(2); sun.rotation_euler = (math.radians(62), 0, math.radians(-35))
scene.world = bpy.data.worlds.new("w"); scene.world.use_nodes = True
bg = scene.world.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.52, 0.60, 0.72, 1); bg.inputs["Strength"].default_value = 0.8
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scene.collection.objects.link(cam); scene.camera = cam
cam.data.lens = 70
# shot: clip, frame, view direction (from the bird toward the camera; Blender frame: -Y nose, +X left wing), lift
SHOT = {
    "perch_front": ("Perch", 1, (0.25, -1, 0.12), 0.0),
    "perch_side": ("Perch", 1, (1, -0.08, 0.10), 0.0),
    "perch_back": ("Perch", 1, (0.35, 1, 0.45), 0.0),
    "stoop": ("Stoop", 1, (0.7, -0.6, 0.55), 0.25),
    "glide": ("Glide", 1, (0.45, -0.75, 0.75), 0.25),
    "talons": ("Talons", 1, (1, -0.45, 0.2), 0.25),
    "flare": ("Flare", 1, (0.8, -0.6, 0.3), 0.25),
    "walk": ("Walk", 5, (0.9, -0.5, 0.3), 0.0),
    "walk_side": ("Walk", 2, (1, -0.05, 0.12), 0.0),
    "walk_back": ("Walk", 2, (0.3, 1, 0.35), 0.0),
    "hop": ("Hop", 12, (1, -0.1, 0.15), 0.0),
    "hop_crouch": ("Hop", 7, (1, -0.1, 0.15), 0.0),
    "perch_wrist": ("Perch", 1, (1, -0.35, 0.05), 0.0),
    "stoop_side": ("Stoop", 1, (1, 0.0, 0.1), 0.25),
    "walk_front": ("Walk", 2, (0.6, -1, 0.2), 0.0),
}
os.makedirs(OUT, exist_ok=True)
acts = {a.name: a for a in bpy.data.actions}
for sh in SHOTS:
    clip, frame, view, lift = SHOT[sh]
    a = next((x for n, x in acts.items() if n == clip or n.startswith(clip + "_") or n.endswith("|" + clip)), None)
    if a is None: print(f"[preview] no clip {clip}"); continue
    arm.animation_data_create(); arm.animation_data.action = a
    if a.slots: arm.animation_data.action_slot = a.slots[0]
    arm.location.z = lift
    scene.frame_set(frame); bpy.context.view_layer.update()
    ev = bird.evaluated_get(bpy.context.evaluated_depsgraph_get()); em = ev.to_mesh()
    V = [ev.matrix_world @ v.co for v in em.vertices]; ev.to_mesh_clear()
    lo = Vector((min(v.x for v in V), min(v.y for v in V), min(v.z for v in V))); hi = Vector((max(v.x for v in V), max(v.y for v in V), max(v.z for v in V)))
    c = (lo + hi) / 2; R = max((hi - lo).length, 0.1)
    cam.location = c + Vector(view).normalized() * R * 2.1
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.render.filepath = os.path.join(OUT, f"{PRE}{sh}.png"); bpy.ops.render.render(write_still=True)
    print(f"[preview] {scene.render.filepath}")
