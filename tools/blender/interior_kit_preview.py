# THE FURNITURE KIT ON A STUDIO FLOOR: every piece of tools/blender/interior_kit.py in a grid, under a soft sky and a
# sun, rendered in Cycles, so the pieces can be judged on their own (the quality bar: no "box and cylinder" look).
#   blender --factory-startup -b -P tools/blender/interior_kit_preview.py -- docs/interior [--only sofa,chair] [--samples 48]
import bpy, bmesh, sys, os, math
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import interior_kit as K
from interior_kit import T, C, fabric, col

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(argv[0] if argv else "docs/interior")
def arg(n, d=None): return argv[argv.index(n) + 1] if n in argv else d
ONLY = arg("--only"); SAMPLES = int(arg("--samples", "48"))
PIECES = {
    "sofa": lambda: K.sofa(2.05, 0.9, fabric(0x55644F, "velvet")), "armchair": lambda: K.armchair(),
    "coffee_table": lambda: K.coffee_table(), "dining_table": lambda: K.dining_table(), "chair": lambda: K.chair(),
    "bed": lambda: K.bed(), "bedside": lambda: K.bedside(), "wardrobe": lambda: K.wardrobe(1.5),
    "bookcase": lambda: K.bookcase(1.0, 2.0, 0.32, seed=3), "radiator": lambda: K.radiator(1.0, 0.6),
    "fireplace": lambda: K.fireplace(), "floor_lamp": lambda: K.floor_lamp(), "table_lamp": lambda: K.table_lamp(),
    "plant": lambda: K.plant(1.3, 0.19, seed=2, kind="monstera"), "ficus": lambda: K.plant(1.1, 0.16, seed=9),
    "kitchen": lambda: K.kitchen_base(1.2, col(0x6E8270, "Wood", "painted"), C["worktop"], sink=True),
    "hob_oven": lambda: K.kitchen_base(0.6, col(0x6E8270, "Wood", "painted"), C["worktop"], oven=True, hob=True),
    "fridge": lambda: K.fridge(), "dresser": lambda: K.dresser(), "bathtub": lambda: K.bathtub(), "washbasin": lambda: K.washbasin(),
    "toilet": lambda: K.toilet(), "desk": lambda: K.desk(), "coat_rack": lambda: K.coat_rack(),
    "curtains": lambda: K.curtain_pair(1.2, 2.4, fabric(0xB79C7A, "linen")), "picture": lambda: K.picture(0.8, 0.6),
}
names = [n for n in PIECES if not ONLY or n in ONLY.split(",")]
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
scn = bpy.context.scene
mats = {}
for n in K.MATS:
    m = bpy.data.materials.new(n); m.use_nodes = True; nt = m.node_tree; bs = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "Col"; nt.links.new(at.outputs["Color"], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = {"Hard": 0.35, "Glass": 0.05, "Fabric": 0.9}.get(n, 0.6)
    if n == "Glass": bs.inputs["Transmission Weight"].default_value = 1.0
    mats[n] = m
def mesh(B, name):
    me = bpy.data.meshes.new(name); me.from_pydata([(x, -z, y) for (x, y, z) in B.v], [], B.f); me.update()
    for n in K.MATS: me.materials.append(mats[n])
    me.polygons.foreach_set("material_index", B.fm)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER"); cd = []
    for fi, p in enumerate(me.polygons):
        for _ in p.loop_indices: cd.extend(B.fc[fi])
    ca.data.foreach_set("color", cd)
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob)
    me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(35))
    return ob
scn.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"; prefs.get_devices()
    for d in prefs.devices: d.use = d.type == "OPTIX"
    scn.cycles.device = "GPU"
except Exception: pass
scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 640, 480
scn.view_settings.view_transform = "AgX"; scn.view_settings.look = "AgX - Medium High Contrast"
if scn.world is None: scn.world = bpy.data.worlds.new("W")
scn.world.use_nodes = True; scn.world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.7, 0.75, 0.85, 1)
sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.5; sd.angle = math.radians(3)
so = bpy.data.objects.new("sun", sd); scn.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(35))
fl = K.Builder(); fl.quad((-20, 0, -20), (-20, 0, 20), (20, 0, 20), (20, 0, -20), "Plaster", K.plaster(0xB9B4AA)); mesh(fl, "floor")
camd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", camd); scn.collection.objects.link(cam); scn.camera = cam
os.makedirs(OUT, exist_ok=True)
for n in names:
    B = K.Builder()
    parts = PIECES[n]()
    lo = Vector((1e9,) * 3); hi = Vector((-1e9,) * 3)
    for bm, mat, c in parts:
        for v in bm.verts: lo = Vector(map(min, lo, v.co)); hi = Vector(map(max, hi, v.co))
        B.emit(bm, mat, c)
    ob = mesh(B, n)
    ctr = (lo + hi) / 2; size = max((hi - lo).length, 0.4)
    eye = ctr + Vector((0.75, 0.55, 1.0)).normalized() * size * 1.45
    cam.location = (eye.x, -eye.z, eye.y)
    cam.rotation_euler = (Vector((ctr.x, -ctr.z, ctr.y)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    camd.lens = 40
    scn.render.filepath = os.path.join(OUT, f"kit_{n}.png")
    bpy.ops.render.render(write_still=True)
    print("kit", n, B.tris, "tris")
    bpy.data.objects.remove(ob)
