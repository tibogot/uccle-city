# POSE STRIPS (offline): renders the posed character frames that tools/characters/ualSim.mjs exported (the real viewer
# code driving the UAL mannequin on the test course) from the side, one image per frame, Cycles on the GPU (OPTIX).
# tools/characters/stripTile.py tiles them into docs/ual/<run>.jpg with the frame labels.
#
#   blender -b --factory-startup -P tools/blender/ualStrip.py -- <objdir> <run> [<run> ...]
import bpy, sys, os, json, math

argv = sys.argv[sys.argv.index("--") + 1:]
OBJ, RUNS = argv[0], argv[1:]
scn = bpy.context.scene

def gpu_setup():
    scn.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"; print("Cycles device:", kind); return
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.device = "CPU"

for o in list(bpy.data.objects): bpy.data.objects.remove(o)
gpu_setup()
scn.cycles.samples = 24; scn.cycles.use_denoising = True
scn.render.resolution_x = 360; scn.render.resolution_y = 460; scn.render.film_transparent = False
scn.view_settings.view_transform = "AgX"
w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True
w.node_tree.nodes["Background"].inputs[0].default_value = (0.72, 0.78, 0.86, 1); w.node_tree.nodes["Background"].inputs[1].default_value = 0.7

def mat(name, rgb, checker=False):
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Roughness"].default_value = 0.7
    if checker:
        # a 10 cm world-space checker: the treads and the foot placement readable
        nt = m.node_tree; tc = nt.nodes.new("ShaderNodeTexCoord"); ck = nt.nodes.new("ShaderNodeTexChecker")
        ck.inputs["Scale"].default_value = 10; ck.inputs["Color1"].default_value = (*rgb, 1); ck.inputs["Color2"].default_value = tuple(c * 0.75 for c in rgb) + (1,)
        nt.links.new(tc.outputs["Object"], ck.inputs["Vector"]); nt.links.new(ck.outputs["Color"], b.inputs["Base Color"])
    else: b.inputs["Base Color"].default_value = (*rgb, 1)
    return m

def imp(path, m):
    bpy.ops.wm.obj_import(filepath=path, forward_axis="NEGATIVE_Z", up_axis="Y")
    o = bpy.context.selected_objects[0]; o.data.materials.clear(); o.data.materials.append(m)
    return o

course = imp(os.path.join(OBJ, "course.obj"), mat("course", (0.62, 0.62, 0.6), True))
ground = bpy.data.meshes.new("g"); ground.from_pydata([(-200, -200, 0), (200, -200, 0), (200, 200, 0), (-200, 200, 0)], [], [(0, 1, 2, 3)])
go = bpy.data.objects.new("ground", ground); scn.collection.objects.link(go); go.data.materials.append(mat("gr", (0.55, 0.56, 0.52), True))
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3.2; so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
so.rotation_euler = (math.radians(50), math.radians(10), math.radians(35))
cam = bpy.data.cameras.new("cam"); cam.type = "ORTHO"; cam.ortho_scale = 2.9
co = bpy.data.objects.new("cam", cam); scn.collection.objects.link(co); scn.camera = co
body_m = mat("body", (0.85, 0.42, 0.12))

for run in RUNS:
    d = os.path.join(OBJ, run)
    meta = json.load(open(os.path.join(d, "frames.json")))
    for f in meta["frames"]:
        o = imp(os.path.join(d, f"f{f['k']}.obj"), body_m)
        bpy.context.view_layer.objects.active = o; o.select_set(True)
        bpy.ops.object.shade_smooth()
        # three.js (x, y, z) -> Blender (x, -z, y); the side camera looks across the motion from the body's right
        yaw = f["yaw"]; fx, fz = math.sin(yaw), math.cos(yaw)
        if meta.get("side") == "front": sx, sz = fx, fz              # (a turn: from the front)
        else: sx, sz = -fz, fx                                        # (the body's right: +x left in three = -fz, fx)
        sx, sz = -sx, -sz
        px, py, pz = f["x"] + sx * 8, f["y"] + 0.95, f["z"] + sz * 8
        co.location = (px, -pz, py)
        dx, dy, dz = -sx, 0, -sz
        # look at the body: rotation from the direction (Blender camera looks down -Z)
        bx, by, bz = dx, -dz, dy
        co.rotation_euler = (math.pi / 2, 0, math.atan2(-bx, by))      # (looks along (-sin, cos) in Blender's xy)
        scn.render.filepath = os.path.join(d, f"r{f['k']}.png")
        bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(o)
    print("rendered", run, len(meta["frames"]))
