"""CAR SHEETS: render any car GLB of the pack contract (root node per car, Body / Wheel_* children, COLOR_0 + _KIND;
tools/blender/carFaceted.py, tools/blender/cars2.py) from four views, to compare body shapes:
front 3/4, rear 3/4, side (orthographic) and top (orthographic), one row per car, Cycles on the GPU (OptiX).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/carSheet.py -- \
        models/cars/faceted.glb docs/cars2/sheet_faceted [--only hatch_c,estate] [--lod 0|1|2] [--samples 32] [--night]

Writes <out>_<car>.png (1600 x 900, four views) per car. --lod N draws the authored LOD N parts (Body_L1 ...) when the
GLB has them. --night: dark sky, lamps lit (head white, tail red) to check the lamp shapes.
"""
import bpy, math, os, sys, struct, json
import numpy as np
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default
GLB, OUT = os.path.abspath(ARGS[0]), os.path.abspath(ARGS[1])
ONLY = set(arg("--only").split(",")) if arg("--only") else None
LOD = int(arg("--lod", "0"))
SAMPLES = int(arg("--samples", "32"))
NIGHT = "--night" in ARGS
os.makedirs(os.path.dirname(OUT), exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
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
gpu_setup()

# ---------------------------------------------------------------------------------------------- GLB reader (numpy)
def read_glb(path):
    b = open(path, "rb").read()
    o, js, binoff = 12, None, None
    while o < len(b):
        ln, ty = struct.unpack_from("<II", b, o)
        if ty == 0x4E4F534A: js = json.loads(b[o + 8:o + 8 + ln])
        elif ty == 0x004E4942: binoff = o + 8
        o += 8 + ln
    DT = {5126: np.float32, 5125: np.uint32, 5123: np.uint16, 5121: np.uint8}
    NC = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4}
    def acc(i):
        a = js["accessors"][i]; v = js["bufferViews"][a["bufferView"]]
        off = binoff + v.get("byteOffset", 0) + a.get("byteOffset", 0)
        n = a["count"] * NC[a["type"]]
        return np.frombuffer(b, DT[a["componentType"]], n, off).reshape(a["count"], NC[a["type"]]) if NC[a["type"]] > 1 else np.frombuffer(b, DT[a["componentType"]], n, off)
    cars = []
    for ri in js["scenes"][js.get("scene", 0)]["nodes"]:
        n = js["nodes"][ri]
        parts = []
        for ci in n.get("children", []):
            c = js["nodes"][ci]; p = js["meshes"][c["mesh"]]["primitives"][0]; A = p["attributes"]
            parts.append(dict(name=c["name"], pos=c.get("translation", [0, 0, 0]), P=acc(A["POSITION"]), C=acc(A["COLOR_0"]),
                              N=acc(A["NORMAL"]), K=acc(A["_KIND"]), I=acc(p["indices"]).astype(np.int64)))
        cars.append(dict(id=n["name"], extras=n.get("extras", {}), parts=parts))
    return cars

# ---------------------------------------------------------------------------------------------- materials
def make_mat(paint):
    m = bpy.data.materials.new("car"); m.use_nodes = True
    nt = m.node_tree; N = nt.nodes; Lk = nt.links
    bsdf = N["Principled BSDF"]
    col = N.new("ShaderNodeAttribute"); col.attribute_name = "col"
    kin = N.new("ShaderNodeAttribute"); kin.attribute_name = "kind"; kin.attribute_type = "GEOMETRY"
    # kind -> (paint mask, roughness, metal, glass, head, tail) through math compare nodes
    def eq(k):
        c = N.new("ShaderNodeMath"); c.operation = "COMPARE"; c.inputs[1].default_value = k; c.inputs[2].default_value = 0.25
        Lk.new(kin.outputs["Fac"], c.inputs[0]); return c.outputs[0]
    isPaint, isGlass, isHead, isTail, isChrome = eq(1), eq(4), eq(2), eq(3), eq(5)
    pc = N.new("ShaderNodeRGB"); pc.outputs[0].default_value = (*paint, 1)
    mul = N.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs[0].default_value = 1
    Lk.new(col.outputs["Color"], mul.inputs[6]); Lk.new(pc.outputs[0], mul.inputs[7])
    sel = N.new("ShaderNodeMix"); sel.data_type = "RGBA"
    Lk.new(isPaint, sel.inputs[0]); Lk.new(col.outputs["Color"], sel.inputs[6]); Lk.new(mul.outputs[2], sel.inputs[7])
    Lk.new(sel.outputs[2], bsdf.inputs["Base Color"])
    def mix_f(mask, a, b_):
        mm = N.new("ShaderNodeMix"); mm.data_type = "FLOAT"; Lk.new(mask, mm.inputs[0]); mm.inputs[2].default_value = a; mm.inputs[3].default_value = b_
        return mm
    r1 = mix_f(isPaint, 0.6, 0.3)
    r2 = N.new("ShaderNodeMix"); r2.data_type = "FLOAT"; Lk.new(isGlass, r2.inputs[0]); Lk.new(r1.outputs[0], r2.inputs[2]); r2.inputs[3].default_value = 0.04
    Lk.new(r2.outputs[0], bsdf.inputs["Roughness"])
    Lk.new(isChrome, bsdf.inputs["Metallic"])
    cw = N.new("ShaderNodeMath"); cw.operation = "MULTIPLY"; Lk.new(isPaint, cw.inputs[0]); cw.inputs[1].default_value = 0.8
    Lk.new(cw.outputs[0], bsdf.inputs["Coat Weight"]); bsdf.inputs["Coat Roughness"].default_value = 0.05
    al = N.new("ShaderNodeMath"); al.operation = "MULTIPLY_ADD"; Lk.new(isGlass, al.inputs[0]); al.inputs[1].default_value = -0.3; al.inputs[2].default_value = 1
    Lk.new(al.outputs[0], bsdf.inputs["Alpha"])
    if NIGHT:
        em = N.new("ShaderNodeMix"); em.data_type = "RGBA"
        h = N.new("ShaderNodeMath"); h.operation = "MULTIPLY"; Lk.new(isHead, h.inputs[0]); h.inputs[1].default_value = 6
        t = N.new("ShaderNodeMath"); t.operation = "MULTIPLY"; Lk.new(isTail, t.inputs[0]); t.inputs[1].default_value = 3
        hc = N.new("ShaderNodeMix"); hc.data_type = "RGBA"; hc.blend_type = "MULTIPLY"; hc.inputs[0].default_value = 1
        Lk.new(col.outputs["Color"], hc.inputs[6]); Lk.new(h.outputs[0], hc.inputs[7])
        tc = N.new("ShaderNodeMix"); tc.data_type = "RGBA"; tc.blend_type = "ADD"; tc.inputs[0].default_value = 1
        Lk.new(hc.outputs[2], tc.inputs[6])
        tr = N.new("ShaderNodeCombineColor"); Lk.new(t.outputs[0], tr.inputs[0]); tr.inputs[1].default_value = 0.0; tr.inputs[2].default_value = 0.0
        Lk.new(tr.outputs[0], tc.inputs[7])
        Lk.new(tc.outputs[2], bsdf.inputs["Emission Color"]); bsdf.inputs["Emission Strength"].default_value = 1.0
    return m

def to_blender(P):   # car coords (x left, y up, z forward) -> Blender (x, -z, y)
    return np.stack([P[:, 0], -P[:, 2], P[:, 1]], 1)

def make_obj(name, part, mat, mirror=False):
    P = to_blender(part["P"].astype(np.float64) + np.array(part["pos"]))
    I = part["I"].reshape(-1, 3)
    me = bpy.data.meshes.new(name)
    me.vertices.add(len(P)); me.vertices.foreach_set("co", P.ravel())
    me.loops.add(I.size); me.loops.foreach_set("vertex_index", I.ravel())
    me.polygons.add(len(I)); me.polygons.foreach_set("loop_start", np.arange(0, I.size, 3)); me.polygons.foreach_set("loop_total", np.full(len(I), 3))
    me.update()
    me.polygons.foreach_set("use_smooth", np.ones(len(I), bool))
    N = to_blender(part["N"].astype(np.float64))
    me.normals_split_custom_set_from_vertices([tuple(n) for n in N])
    ca = me.color_attributes.new("col", "FLOAT_COLOR", "POINT")
    C4 = np.concatenate([part["C"], np.ones((len(P), 1), np.float32)], 1)
    ca.data.foreach_set("color", C4.ravel())
    ka = me.attributes.new("kind", "FLOAT", "POINT"); ka.data.foreach_set("value", part["K"].astype(np.float32))
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    return o

# ---------------------------------------------------------------------------------------------- scene
world = bpy.data.worlds.new("w"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
try: sky.sky_type = "NISHITA"
except Exception: pass
try: sky.sun_elevation = math.radians(35 if not NIGHT else -8)
except Exception: pass
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.18 if not NIGHT else 0.02
sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 2.6 if not NIGHT else 0.0; sun.angle = math.radians(3)
so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so); so.rotation_euler = (math.radians(50), 0, math.radians(-35))
gme = bpy.data.meshes.new("ground"); gme.from_pydata([(-60, -60, 0), (60, -60, 0), (60, 60, 0), (-60, 60, 0)], [], [(0, 1, 2, 3)])
gm = bpy.data.materials.new("g"); gm.use_nodes = True
gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.165, 1)
gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
gme.materials.append(gm)
ground = bpy.data.objects.new("ground", gme); scn.collection.objects.link(ground)
# a 1 m grid on the ground for the side / top views (scale)
cam = bpy.data.cameras.new("cam"); co = bpy.data.objects.new("cam", cam); scn.collection.objects.link(co); scn.camera = co
scn.render.resolution_x, scn.render.resolution_y = 800, 450
scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
scn.view_settings.view_transform = "AgX"
scn.view_settings.exposure = -0.4 if not NIGHT else 0.5
scn.render.film_transparent = False

def look(eye, tgt, ortho=None, lens=50):
    co.location = Vector(eye); d = Vector(tgt) - Vector(eye)
    co.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if ortho: cam.type = "ORTHO"; cam.ortho_scale = ortho
    else: cam.type = "PERSP"; cam.lens = lens

cars = read_glb(GLB)
tiles = []
for car in cars:
    if ONLY and car["id"] not in ONLY: continue
    sfx = "" if LOD == 0 else f"_L{LOD}"
    names = {p["name"] for p in car["parts"]}
    use = [p for p in car["parts"] if (p["name"].endswith(sfx) if sfx else not p["name"].endswith(("_L1", "_L2")))] if (sfx == "" or any(n.endswith(sfx) for n in names)) else None
    if not use: print("no LOD", LOD, "for", car["id"]); continue
    paint = car["extras"].get("paint", [0.5, 0.5, 0.5])
    mat = make_mat(paint)
    objs = [make_obj(f"{car['id']}_{p['name']}", p, mat) for p in use]
    tris = sum(len(p["I"]) // 3 for p in use)
    allP = np.concatenate([p["P"] + np.array(p["pos"]) for p in use])
    lo, hi = allP.min(0), allP.max(0)
    Lc, Hc = hi[2] - lo[2], hi[1]
    zc = (hi[2] + lo[2]) / 2
    views = [
        ("front", lambda: look((-(3.4 + Lc * 0.3), -(zc + 3.2 + Lc * 0.35), 1.25), (0, -(zc + 0.4), Hc * 0.42), lens=45)),
        ("rear", lambda: look(((3.4 + Lc * 0.3), -(zc - 3.2 - Lc * 0.35), 1.4), (0, -(zc - 0.4), Hc * 0.42), lens=45)),
        ("side", lambda: look((-12, -zc, Hc * 0.5), (0, -zc, Hc * 0.5), ortho=Lc * 1.12)),
        ("top", lambda: look((0, -zc, 15), (0, -zc + 0.0001, 0), ortho=Lc * 1.12)),
    ]
    files = []
    for vn, f in views:
        f()
        fp = f"{OUT}_{car['id']}_{vn}.png"; scn.render.filepath = fp
        bpy.ops.render.render(write_still=True); files.append(fp)
    # 2 x 2 sheet
    imgs = [bpy.data.images.load(fp) for fp in files]
    W, H = 800, 450
    sheet = np.zeros((H * 2, W * 2, 4), np.float32)
    for k, im in enumerate(imgs):
        a = np.array(im.pixels[:], np.float32).reshape(H, W, 4)
        r, c = 1 - k // 2, k % 2          # Blender pixels start bottom-left
        sheet[r * H:(r + 1) * H, c * W:(c + 1) * W] = a
    out = bpy.data.images.new("sheet", W * 2, H * 2, alpha=False)
    out.pixels.foreach_set(sheet.ravel()); out.filepath_raw = f"{OUT}_{car['id']}.png"; out.file_format = "PNG"; out.save()
    for im in imgs: bpy.data.images.remove(im)
    for fp in files: os.remove(fp)
    print(f"[carSheet] {car['id']}: {tris} tris, size L {Lc:.2f} H {Hc:.2f} W {hi[0] - lo[0]:.2f} -> {OUT}_{car['id']}.png")
    for o in objs: bpy.data.objects.remove(o)
