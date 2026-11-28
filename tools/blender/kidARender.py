"""Renders of the GAME kid A (docs/KIDCHAR.md): models/characters/kidA.glb (or --glb) as the game plays it: a clip pose
(the Idle by default) instead of the bind pose, the atlas (models/characters/kidA_atlas.png) + the baked AO, the cap's
brim chosen; day (sky + sun) and night (blue + a sodium lamp). Cycles on OPTIX.

    blender -b --factory-startup -P tools/blender/kidARender.py -- --out DIR --prefix A_v3 [--glb F] [--clip Idle] [--t 0.3] [--cap fwd|back]
"""
import bpy, sys, os, math
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
arg = lambda k, d=None: argv[argv.index(k) + 1] if k in argv else d
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
GLB = arg("--glb", os.path.join(ROOT, "models", "characters", "kidA.glb"))
ATLAS = os.path.join(ROOT, "models", "characters", "kidA_atlas.png")
OUT, PREFIX, CLIP, T, CAP = arg("--out"), arg("--prefix", "A"), arg("--clip", "Idle"), float(arg("--t", "0.3")), arg("--cap", "fwd")
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
bpy.ops.import_scene.gltf(filepath=GLB)
arm = next(o for o in scn.objects if o.type == "ARMATURE")
meshes = [o for o in scn.objects if o.type == "MESH"]
lod0 = next(o for o in meshes if o.name.endswith("LOD0"))
for o in meshes:
    if o is not lod0: o.hide_render = True
# the atlas material (one for the whole mesh), AO from COLOR_0, the hidden brim by the _SLOT attribute
img = bpy.data.images.load(ATLAS)
m = bpy.data.materials.new("kidA"); m.use_nodes = True; nt = m.node_tree
b = nt.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.7
tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = img
ao = nt.nodes.new("ShaderNodeVertexColor"); ao.layer_name = next((a.name for a in lod0.data.color_attributes), "")
mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "MULTIPLY"; mx.inputs["Factor"].default_value = 0.6
nt.links.new(tx.outputs["Color"], mx.inputs["A"]); nt.links.new(ao.outputs["Color"], mx.inputs["B"])
nt.links.new(mx.outputs["Result"], b.inputs["Base Color"])
slots = [n for n in (lod0.data.get("slots") or [])]
at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "_SLOT"
import json
meta = json.load(open(os.path.splitext(GLB)[0] + ".json"))
sl = meta["kid"]["slots"]; hide = sl.index("brim_b" if CAP == "fwd" else "brim_f")
cmp = nt.nodes.new("ShaderNodeMath"); cmp.operation = "COMPARE"; cmp.inputs[1].default_value = hide; cmp.inputs[2].default_value = 0.5
nt.links.new(at.outputs["Fac"], cmp.inputs[0])
inv = nt.nodes.new("ShaderNodeMath"); inv.operation = "SUBTRACT"; inv.inputs[0].default_value = 1.0
nt.links.new(cmp.outputs[0], inv.inputs[1])
mul = nt.nodes.new("ShaderNodeMath"); mul.operation = "MULTIPLY"
nt.links.new(tx.outputs["Alpha"], mul.inputs[0]); nt.links.new(inv.outputs[0], mul.inputs[1])
nt.links.new(mul.outputs[0], b.inputs["Alpha"])
lod0.data.materials.clear(); lod0.data.materials.append(m)
# the clip pose
act = bpy.data.actions.get(CLIP) or next((a for a in bpy.data.actions if a.name.startswith(CLIP)), None)
if act:
    arm.animation_data_create(); arm.animation_data.action = act
    try:
        slot = act.slots[0] if hasattr(act, "slots") and len(act.slots) else None
        if slot: arm.animation_data.action_slot = slot
    except Exception: pass
    scn.frame_set(int(round(T * scn.render.fps)) + int(act.frame_range[0]))
print("pose", CLIP, "action", act.name if act else None)

def gpu():
    scn.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind; prefs.get_devices()
            if any(d.type == kind for d in prefs.devices):
                for d in prefs.devices: d.use = d.type == kind
                scn.cycles.device = "GPU"; return
        except Exception: pass
gpu(); scn.cycles.samples = 96; scn.cycles.use_denoising = True
scn.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True; bg = w.node_tree.nodes["Background"]
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA")); scn.collection.objects.link(fill)
lamp = bpy.data.objects.new("lamp", bpy.data.lights.new("lamp", "POINT")); scn.collection.objects.link(lamp)
bpy.ops.mesh.primitive_plane_add(size=10); gp = bpy.context.active_object
gm = bpy.data.materials.new("ground"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.36, 0.36, 0.34, 1); gp.data.materials.append(gm)
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
bpy.context.view_layer.update()
dg = bpy.context.evaluated_depsgraph_get(); ev = lod0.evaluated_get(dg)
vs = [lod0.matrix_world @ v.co for v in ev.data.vertices]
H = max(v.z for v in vs)
hb = arm.pose.bones.get("Head"); face = arm.matrix_world @ ((hb.head + hb.tail) * 0.5) + Vector((0, 0, 0.03))
# (glTF +Z forward -> Blender -Y: the kid faces -Y)
def light(mode):
    if mode == "day":
        bg.inputs[0].default_value = (0.62, 0.70, 0.80, 1); bg.inputs[1].default_value = 0.65
        sun.data.energy = 3.4; sun.data.angle = math.radians(6); sun.rotation_euler = (math.radians(48), 0, math.radians(30)); sun.hide_render = False
        fill.data.energy = 120; fill.data.size = 3; fill.location = (-2.5, -2.5, 1.6); fill.rotation_euler = (math.radians(70), 0, math.radians(-45)); fill.hide_render = False
        lamp.hide_render = True
    else:
        bg.inputs[0].default_value = (0.05, 0.07, 0.13, 1); bg.inputs[1].default_value = 0.35
        sun.data.energy = 0.08; sun.data.color = (0.6, 0.7, 1.0); fill.hide_render = True
        lamp.hide_render = False; lamp.location = (1.6, -1.6, 3.0); lamp.data.energy = 260; lamp.data.color = (1.0, 0.72, 0.42); lamp.data.shadow_soft_size = 0.15
def look(t):
    d = t - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
mid = Vector((0, 0, H * 0.52))
for mode in ("day", "night"):
    light(mode)
    scn.render.resolution_x, scn.render.resolution_y = 800, 1100; cam.data.lens = 85
    views = {"front": (0, -1, 0.05), "q34": (0.75, -0.75, 0.08), "side": (1, 0, 0.05), "back": (0, 1, 0.08)} if mode == "day" else {"q34": (0.75, -0.75, 0.08)}
    for nm, d in views.items():
        cam.location = mid + Vector(d).normalized() * 4.3; look(mid)
        scn.render.filepath = os.path.join(OUT, f"{PREFIX}_{mode}_{nm}.png"); bpy.ops.render.render(write_still=True)
    cam.data.lens = 100; scn.render.resolution_x = scn.render.resolution_y = 900
    cam.location = face + Vector((0.35, -1.1, 0.04)).normalized() * 1.25; look(face)
    scn.render.filepath = os.path.join(OUT, f"{PREFIX}_{mode}_face.png"); bpy.ops.render.render(write_still=True)
print("RENDERS DONE", OUT)
