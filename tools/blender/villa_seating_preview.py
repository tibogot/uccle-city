"""Quick look at the villa's sofa / armchair v3 (tools/blender/villa_seating.py): Cycles OptiX, flat tints by code.
    blender --factory-startup -b -P tools/blender/villa_seating_preview.py -- OUTDIR"""
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import villa_seating as VS
OUT = os.path.abspath(sys.argv[sys.argv.index("--") + 1]); os.makedirs(OUT, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
scn = bpy.context.scene
R = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
TINT = {13: (0.7, 0.66, 0.6), 5: (0.74, 0.7, 0.64), 10: (0.6, 0.55, 0.45), 9: (0.27, 0.25, 0.22), 12: (0.43, 0.38, 0.32), 0: (0.02, 0.02, 0.02)}
mats = {}
def mat(c):
    if c not in mats:
        m = bpy.data.materials.new(f"c{c}"); m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*TINT.get(c, (0.5, 0.5, 0.5)), 1); mats[c] = m
    return mats[c]
tris = 0
for (parts, off) in ((VS.sofa_v3(3.0, 3, seed=1), (0, 0, 0)), (VS.armchair_v3(seed=2), (2.3, 0.6, 0))):
    for i, (bm, slot, code) in enumerate(parts):
        bmesh.ops.transform(bm, matrix=Matrix.Translation(off) @ R, verts=bm.verts)
        me = bpy.data.meshes.new("p"); bm.to_mesh(me); bm.free()
        for p in me.polygons: p.use_smooth = slot == "props"
        tris += sum(len(p.vertices) - 2 for p in me.polygons)
        me.materials.append(mat(code if slot == "props" else 0)); o = bpy.data.objects.new("p", me); scn.collection.objects.link(o)
print("seating tris:", tris)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=5); me = bpy.data.meshes.new("f"); bm.to_mesh(me)
o = bpy.data.objects.new("f", me); scn.collection.objects.link(o); m = bpy.data.materials.new("fl"); m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.22, 0.16, 1); me.materials.append(m)
scn.render.engine = "CYCLES"; prefs = bpy.context.preferences.addons["cycles"].preferences; prefs.compute_device_type = "OPTIX"; prefs.get_devices()
for d in prefs.devices: d.use = d.type == "OPTIX"
scn.cycles.device = "GPU"; scn.cycles.samples = 64; scn.cycles.use_denoising = True
if scn.world is None: scn.world = bpy.data.worlds.new("w")
scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
sd = bpy.data.lights.new("s", "SUN"); sd.energy = 3; sd.angle = math.radians(8); so = bpy.data.objects.new("s", sd); scn.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-30))
cd = bpy.data.cameras.new("c"); cam = bpy.data.objects.new("c", cd); scn.collection.objects.link(cam); scn.camera = cam
scn.render.resolution_x, scn.render.resolution_y = 1000, 600; scn.view_settings.view_transform = "AgX"
for name, eye, at in (("sofa_front", (1.0, -3.6, 1.3), (0.6, 0, 0.45)), ("sofa_34", (3.4, -3.0, 1.6), (0.8, 0, 0.4))):
    cam.location = eye; cam.rotation_euler = (Vector(at) - Vector(eye)).to_track_quat("-Z", "Y").to_euler(); cd.lens = 32
    scn.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
print("done")
