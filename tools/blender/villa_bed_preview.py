"""Quick look at the villa's bed v3 alone (tools/blender/villa_bed.py): Cycles on OptiX, a grey room, the parts in flat
tints by code, two views + the triangle count. No export.
    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/villa_bed_preview.py -- OUTDIR [width]"""
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import villa_bed as VB
ARGS = sys.argv[sys.argv.index("--") + 1:]
OUT = os.path.abspath(ARGS[0]); W = float(ARGS[1]) if len(ARGS) > 1 else 2.0
os.makedirs(OUT, exist_ok=True)
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
scn = bpy.context.scene
parts = VB.bed_v3(W, seed=1, master=True) + [(bm, s, c) for (bm, s, c) in VB.bench_v3()]
TINT = {3: (0.86, 0.85, 0.82), 4: (0.8, 0.77, 0.72), 6: (0.33, 0.21, 0.12), 7: (0.47, 0.42, 0.36), 8: (0.88, 0.86, 0.83), 9: (0.27, 0.25, 0.22),
        10: (0.65, 0.6, 0.5), 11: (0.15, 0.06, 0.025), 12: (0.43, 0.38, 0.32), 0: (0.02, 0.02, 0.02)}
mats = {}
def mat(code):
    if code in mats: return mats[code]
    m = bpy.data.materials.new(f"c{code}"); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (*TINT.get(code, (0.5, 0.5, 0.5)), 1); b.inputs["Roughness"].default_value = 0.8
    mats[code] = m; return m
R = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))       # kit -> Blender
tris = 0
for i, (bm, slot, code) in enumerate(parts):
    if i >= len(parts) - 6: bmesh.ops.transform(bm, matrix=Matrix.Translation((0, 0, 1.6)) @ Matrix.Rotation(math.pi / 2, 4, "Y"), verts=bm.verts)  # the bench at the foot
    bmesh.ops.transform(bm, matrix=R, verts=bm.verts)
    me = bpy.data.meshes.new(f"p{i}"); bm.to_mesh(me); bm.free()
    for p in me.polygons: p.use_smooth = slot == "props"
    tris += sum(len(p.vertices) - 2 for p in me.polygons)
    me.materials.append(mat(code if slot == "props" else 0))
    o = bpy.data.objects.new(f"p{i}", me); scn.collection.objects.link(o)
print("bed tris (with the bench):", tris)
# room: floor + two walls
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); me = bpy.data.meshes.new("floor"); bm.to_mesh(me)
fl = bpy.data.objects.new("floor", me); scn.collection.objects.link(fl); m = bpy.data.materials.new("fl"); m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.32, 0.24, 0.17, 1); me.materials.append(m)
bm = bmesh.new(); bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=4); bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
bmesh.ops.translate(bm, verts=bm.verts, vec=(0, 1.25, 2)); me = bpy.data.meshes.new("wall"); bm.to_mesh(me)
wl = bpy.data.objects.new("wall", me); scn.collection.objects.link(wl); m = bpy.data.materials.new("wl"); m.use_nodes = True
m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.75, 0.73, 0.7, 1); me.materials.append(m)
scn.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences; prefs.compute_device_type = "OPTIX"; prefs.get_devices()
for d in prefs.devices: d.use = d.type == "OPTIX"
scn.cycles.device = "GPU"; scn.cycles.samples = 64; scn.cycles.use_denoising = True
if scn.world is None: scn.world = bpy.data.worlds.new("w")
scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.6
sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.0; sd.angle = math.radians(8); so = bpy.data.objects.new("sun", sd); scn.collection.objects.link(so)
so.rotation_euler = (math.radians(50), 0, math.radians(-35))
ar = bpy.data.lights.new("area", "AREA"); ar.energy = 300; ar.size = 2; ao_ = bpy.data.objects.new("area", ar); scn.collection.objects.link(ao_); ao_.location = (-2.5, -1, 2.4)
ao_.rotation_euler = (Vector((0, 0, 0.6)) - ao_.location).to_track_quat("-Z", "Y").to_euler()
cd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cd); scn.collection.objects.link(cam); scn.camera = cam
scn.render.resolution_x, scn.render.resolution_y = 1000, 640; scn.view_settings.view_transform = "AgX"
for name, eye, at, lens in (("bed_pre_34", (2.6, -2.8, 1.7), (0, 0, 0.45), 30), ("bed_pre_side", (3.0, 0.2, 0.75), (0, 0.1, 0.5), 32),
                            ("bed_pre_foot", (0.3, -3.6, 1.25), (0, 0, 0.5), 30)):
    cam.location = eye; cam.rotation_euler = (Vector(at) - Vector(eye)).to_track_quat("-Z", "Y").to_euler(); cd.lens = lens
    scn.render.filepath = os.path.join(OUT, name + ".png"); bpy.ops.render.render(write_still=True)
print("done")
