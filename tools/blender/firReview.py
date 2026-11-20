"""FIR ROUND 3 review renders (docs/CHRISTMAS.md "FIR ROUND 3"): the square's fir from the street at 8 / 21 / 45 / 60 /
100 m, the near level (LOD0) to 45 m and the middle level (LOD1) from 45 m, at the GAME's pixel density (1080 px over
55 deg = 19.6 px / deg, cropped to the tree), from a RAW kit GLB (tools/blender/christmasKit.py's export), with the
VIEWER's materials (viewer/christmas/xmasKit.js: the cards' atlas x tint x xmas.look.cards 0.78, the backs x .under 0.55,
the canopy AO; the solid fronds' greens x AO; same sun and sky for every tag). Film transparent: the alpha is the
silhouette tools/christmas/fir_review.py compares at the 45 m switch.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/firReview.py -- --raw <christmas.raw.glb> --tag old|new
    -> data/raw/textures/christmas/_review/<tag>_<d>m_lod<k>.png     (then: python -E tools/christmas/fir_review.py old new)

Cycles on the GPU (OptiX: --factory-startup = CPU otherwise), 64 samples, denoised.
"""
import bpy, math, os, sys, time
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, default): return ARGS[ARGS.index(name) + 1] if name in ARGS else default
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
RAW = os.path.abspath(opt("--raw", os.path.join(ROOT, "models", "christmas", "christmas.raw.glb")))
TAG = opt("--tag", "new")
ATLAS = os.path.join(ROOT, "data", "raw", "textures", "christmas", "fir_needles_atlas.png")
OUTD = os.path.join(ROOT, "data", "raw", "textures", "christmas", "_review")
T0 = time.time()
def tick(s): print(f"[firReview] {s} {time.time() - T0:.0f}s", flush=True)
os.makedirs(OUTD, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.engine = "CYCLES"
try:
    pr = bpy.context.preferences.addons["cycles"].preferences
    pr.compute_device_type = "OPTIX"; pr.get_devices()
    on = [d for d in pr.devices if d.type == "OPTIX"]
    for d in pr.devices: d.use = d.type == "OPTIX"
    scn.cycles.device = "GPU" if on else "CPU"
except Exception as e:
    scn.cycles.device = "CPU"
tick(f"Cycles device {scn.cycles.device}")
scn.cycles.samples = 64; scn.cycles.use_denoising = True
scn.render.film_transparent = True
scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)

bpy.ops.import_scene.gltf(filepath=RAW)
keep = {"tree": 0, "tree__lod1": 1}
lv = {}
for o in list(scn.objects):
    if o.type == "MESH" and o.name in keep: lv[keep[o.name]] = o
    elif o.type == "MESH": bpy.data.objects.remove(o)
tick(f"imported {RAW}: {sorted(lv)}")


def lin(h):
    c = [((h >> 16) & 255) / 255, ((h >> 8) & 255) / 255, (h & 255) / 255]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]


def build(m):
    """the viewer's material for slot m.name (xmasKit.js make()), approximately, in Cycles"""
    m.use_nodes = True
    nt = m.node_tree; N, L = nt.nodes, nt.links
    for n in list(N): N.remove(n)
    out = N.new("ShaderNodeOutputMaterial")
    b = N.new("ShaderNodeBsdfPrincipled")
    vc = N.new("ShaderNodeVertexColor")
    sep = N.new("ShaderNodeSeparateColor"); L.new(vc.outputs["Color"], sep.inputs[0])
    def math_(op, a, bb=None, c=None):
        n = N.new("ShaderNodeMath"); n.operation = op
        for i, v in enumerate((a, bb, c)):
            if v is None: continue
            if isinstance(v, (int, float)): n.inputs[i].default_value = v
            else: L.new(v, n.inputs[i])
        return n.outputs[0]
    def mixf(a, bb, t): return math_("MULTIPLY_ADD", t, bb - a, a)               # a + (b - a) t (constants a, b)
    def mixc(a, bb, t):
        n = N.new("ShaderNodeMix"); n.data_type = "RGBA"; n.inputs["Factor"].default_value = 0
        if isinstance(t, (int, float)): n.inputs["Factor"].default_value = t
        else: L.new(t, n.inputs["Factor"])
        for k, v in ((6, a), (7, bb)):
            if isinstance(v, list): n.inputs[k].default_value = (*v, 1)
            else: L.new(v, n.inputs[k])
        return n.outputs[2]
    def scale(c, s):
        n = N.new("ShaderNodeVectorMath"); n.operation = "SCALE"
        if isinstance(c, list): n.inputs[0].default_value = c
        else: L.new(c, n.inputs[0])
        if isinstance(s, (int, float)): n.inputs["Scale"].default_value = s
        else: L.new(s, n.inputs["Scale"])
        return n.outputs[0]
    ao = mixf(0.35, 1.0, sep.outputs[2])
    name = m.name
    L.new(b.outputs[0], out.inputs["Surface"])
    b.inputs["Metallic"].default_value = 0.0
    if name == "fir_cards":
        geo = N.new("ShaderNodeNewGeometry"); uvn = N.new("ShaderNodeUVMap")
        off = N.new("ShaderNodeVectorMath"); off.operation = "MULTIPLY_ADD"
        L.new(geo.outputs["Backfacing"], off.inputs[0]); off.inputs[1].default_value = (0, -0.5, 0); L.new(uvn.outputs["UV"], off.inputs[2])
        tx = N.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(ATLAS, check_existing=True); tx.interpolation = "Linear"
        L.new(off.outputs[0], tx.inputs["Vector"])
        tint = mixf(0.86, 1.12, sep.outputs[0])
        side = math_("MULTIPLY_ADD", geo.outputs["Backfacing"], 0.55 - 1.0, 1.0)            # back faces x .under 0.55
        k = math_("MULTIPLY", math_("MULTIPLY", tint, side), math_("MULTIPLY", 0.78, mixf(0.3, 1.0, sep.outputs[2])))
        col = scale(tx.outputs["Color"], k)
        L.new(col, b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.46
        tr = N.new("ShaderNodeBsdfTranslucent"); L.new(col, tr.inputs["Color"])
        sd = N.new("ShaderNodeMixShader"); L.new(geo.outputs["Backfacing"], sd.inputs[0]); L.new(b.outputs[0], sd.inputs[1]); L.new(tr.outputs[0], sd.inputs[2])
        cut = math_("GREATER_THAN", tx.outputs["Alpha"], 0.5)
        tp = N.new("ShaderNodeBsdfTransparent"); mx = N.new("ShaderNodeMixShader")
        L.new(cut, mx.inputs[0]); L.new(tp.outputs[0], mx.inputs[1]); L.new(sd.outputs[0], mx.inputs[2])
        L.new(mx.outputs[0], out.inputs["Surface"])
        return
    if name == "fir_needles":
        col = scale(mixc(lin(0x16301e), lin(0x24452b), sep.outputs[0]), mixf(0.45, 1.0, sep.outputs[1]))
        mr = N.new("ShaderNodeMapRange"); mr.interpolation_type = "SMOOTHSTEP"; L.new(sep.outputs[0], mr.inputs["Value"]); mr.inputs["From Min"].default_value = 0.82; mr.inputs["From Max"].default_value = 1.0
        col = mixc(col, lin(0x3c5a52), math_("MULTIPLY", mr.outputs[0], 0.35))
        nz = N.new("ShaderNodeSeparateXYZ"); geo = N.new("ShaderNodeNewGeometry"); L.new(geo.outputs["Normal"], nz.inputs[0])
        mr2 = N.new("ShaderNodeMapRange"); mr2.interpolation_type = "SMOOTHSTEP"; L.new(nz.outputs[2], mr2.inputs["Value"]); mr2.inputs["From Min"].default_value = 0.1; mr2.inputs["From Max"].default_value = -0.5
        under = scale(lin(0x6d8a80), mixf(0.55, 0.9, sep.outputs[1]))
        col = mixc(col, under, math_("MULTIPLY", mr2.outputs[0], 0.6))
        L.new(scale(col, ao), b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.62
    elif name == "fir_bark":
        L.new(scale(lin(0x3a2c22), ao), b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.9
    elif name == "bauble":
        rp = N.new("ShaderNodeValToRGB"); rp.color_ramp.interpolation = "CONSTANT"; L.new(sep.outputs[1], rp.inputs[0])
        rp.color_ramp.elements[0].color = (*lin(0x9c0f14), 1); rp.color_ramp.elements[1].position = 0.775; rp.color_ramp.elements[1].color = (*lin(0xe6d6b8), 1)
        e = rp.color_ramp.elements.new(0.275); e.color = (*lin(0xd6a24a), 1)
        L.new(scale(rp.outputs[0], ao), b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.16; b.inputs["Metallic"].default_value = 0.8
    elif name in ("gold_metal", "star_glow"):
        L.new(scale(lin(0xc89a48 if name == "gold_metal" else 0xe0b35a), ao), b.inputs["Base Color"]); b.inputs["Metallic"].default_value = 1.0; b.inputs["Roughness"].default_value = 0.3
        if name == "star_glow": b.inputs["Emission Color"].default_value = (*lin(0xffc66b), 1); b.inputs["Emission Strength"].default_value = 1.1 * 0.7
    elif name == "bulb_warm":
        b.inputs["Base Color"].default_value = (*[x * 0.6 for x in lin(0xfff0d8)], 1); b.inputs["Emission Color"].default_value = (*lin(0xffc27e), 1); b.inputs["Emission Strength"].default_value = 1.1
    elif name == "wood_planks":
        L.new(scale(scale(mixc(lin(0x7b5a3a), lin(0x9a7650), sep.outputs[0]), mixf(0.75, 1.0, sep.outputs[1])), ao), b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 0.75
    elif name == "mulch":
        L.new(scale(lin(0x2a1d14), ao), b.inputs["Base Color"]); b.inputs["Roughness"].default_value = 1.0
    else:
        L.new(scale([0.5, 0.5, 0.5], ao), b.inputs["Base Color"])


for m in {s.material for o in lv.values() for s in o.material_slots if s.material}: build(m)
# the vertex colour layer: the first colour attribute (COLOR_0)
for o in lv.values():
    ca = o.data.color_attributes
    nm = ca[0].name if len(ca) else "Col"
    for s in o.material_slots:
        for n in s.material.node_tree.nodes:
            if n.type == "VERTEX_COLOR": n.layer_name = nm

# the kit's still light (tools/blender/christmasKit.py shot(): sun 3.5 from 200 deg, 30 deg up; Nishita sky x 0.3; AgX -1)
scn.world = bpy.data.worlds.new("World"); scn.world.use_nodes = True
bg = scn.world.node_tree.nodes.get("Background")
sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky"); sky.sun_disc = False
scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.3
sun = bpy.data.lights.new("Sun", "SUN"); sun.angle = math.radians(1.0); sun.energy = 3.5
so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so); so.rotation_euler = (math.radians(60), 0, math.radians(200))
scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam

PXDEG = 1080 / 55
for d in (8, 21, 45, 60, 100):
    top = math.atan2(10.5 - 1.7, d); bot = math.atan2(-1.7, max(0.5, d - 1.5))
    vf = (top - bot) * 1.08; hf = 2 * math.atan2(3.25, d) * 1.12
    res = (max(48, round(math.degrees(hf) * PXDEG)), max(64, round(math.degrees(vf) * PXDEG)))
    for k in ([0] if d < 45 else [0, 1] if d == 45 else [1]):
        if k not in lv: continue
        for o in lv.values(): o.hide_render = o is not lv[k]
        # (glTF +Z front = Blender -Y: the camera south of the tree, eye 1.7 m)
        cam.location = Vector((0.0, -d, 1.7)); cam.rotation_euler = (math.pi / 2 + (top + bot) / 2, 0.0, 0.0)
        cam.data.sensor_fit = "VERTICAL"; cam.data.angle = vf
        scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.image_settings.file_format = "PNG"; scn.render.image_settings.color_mode = "RGBA"
        scn.render.filepath = os.path.join(OUTD, f"{TAG}_{d}m_lod{k}.png"); t = time.time()
        bpy.ops.render.render(write_still=True); tick(f"{TAG} {d} m lod{k} {res} {time.time() - t:.0f}s")
tick("done")
