"""HERO SHELL VIEWS (claude/heroshell 2026-11-18): Cycles renders of a hero GLB (raw, not meshopt) to judge its shell:
missing walls (class A), bad shading from topology (checker + grazing light), before / after comparisons.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/hero_shellview.py -- \
        <file.raw.glb | file.obj (tools/mesh_audit/glb2obj.mjs, for packed GLBs)> <out_prefix> [--node StPierre] [--ground H] [--samples 24] [--modes shaded,checker,grazing] \
        --cam name:x,y,z:tx,ty,tz[:lens] [--cam ...]

Camera / target in the GLB's LOCAL glTF frame (x, y up, z), as the hero's .json "frame" says (Saint-Pierre: u, TAW - 50, w).
Back faces are drawn as NOTHING (transparent), as the browser culls them: a hole shows as a hole.
Modes: shaded = the slot names coloured by keyword (no textures: the GLB carries none), sun + sky;
checker = one 1 m checker in object space on every face (stretching / normals show), sun + sky;
grazing = shaded with a sun 7 degrees above the horizon along the camera's view (normal / topology faults show).
Cycles on the GPU (OptiX, then CUDA; CPU if neither). Only the named node (+ its children) is drawn: LOD0 by default.
"""
import bpy, math, os, sys
from mathutils import Vector

A = sys.argv[sys.argv.index("--") + 1:]
GLB, OUTP = os.path.abspath(A[0]), os.path.abspath(A[1])
def opt(k, d=None):
    return A[A.index(k) + 1] if k in A else d
NODE = opt("--node")
GROUND = opt("--ground")
SAMPLES = int(opt("--samples", "24"))
MODES = opt("--modes", "shaded,checker,grazing").split(",")
CAMS = []
for i, a in enumerate(A):
    if a == "--cam":
        parts = A[i + 1].split(":")
        CAMS.append((parts[0], [float(v) for v in parts[1].split(",")], [float(v) for v in parts[2].split(",")], float(parts[3]) if len(parts) > 3 else 24.0))

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
if GLB.lower().endswith(".obj"):         # a packed (meshopt) GLB decoded by tools/mesh_audit/glb2obj.mjs
    bpy.ops.wm.obj_import(filepath=GLB, forward_axis="NEGATIVE_Z", up_axis="Y")
else:
    bpy.ops.import_scene.gltf(filepath=GLB)
objs = [o for o in scn.objects if o.type == "MESH"]
import re as _re
if NODE == "lod0":                       # every node but the far / LOD ones (+ the model's _door / _slates parts)
    for o in objs:
        if _re.search(r"_(far|xfar|lod\d)(\.\d+)?$", o.name): o.hide_render = True
elif NODE:
    for o in objs:
        if o.name != NODE and not o.name.startswith(NODE + "."):
            o.hide_render = True
for o in objs:
    if o.hide_render: continue
    for p in o.data.polygons: p.use_smooth = p.use_smooth      # keep the exported normals

def gl(x, y, z): return Vector((x, -z, y))           # glTF local -> Blender

# ---------------------------------------------------------------- GPU
def use_gpu():
    prefs = bpy.context.preferences.addons["cycles"].preferences
    for kind in ("OPTIX", "CUDA"):
        try:
            prefs.compute_device_type = kind
            prefs.get_devices()
            devs = [d for d in prefs.devices if d.type == kind]
            if devs:
                for d in prefs.devices: d.use = d.type == kind
                scn.cycles.device = "GPU"
                print("Cycles device:", kind, [d.name for d in devs])
                return kind
        except Exception as e:
            print("no", kind, e)
    scn.cycles.device = "CPU"; print("Cycles device: CPU")
    return "CPU"

scn.render.engine = "CYCLES"
use_gpu()
scn.cycles.samples = SAMPLES
scn.cycles.use_denoising = True
scn.view_settings.view_transform = "AgX"
scn.view_settings.exposure = -0.6
scn.render.image_settings.file_format = "PNG"
scn.render.image_settings.color_mode = "RGB"

# ---------------------------------------------------------------- materials
PALETTE = [("brick", (0.33, 0.1, 0.06)), ("stone_white", (0.62, 0.56, 0.44)), ("stone_blue", (0.12, 0.13, 0.14)), ("blue", (0.12, 0.13, 0.14)),
           ("stone", (0.55, 0.52, 0.46)), ("slate", (0.05, 0.055, 0.065)), ("copper_brown", (0.13, 0.08, 0.05)), ("copper", (0.15, 0.35, 0.28)),
           ("zinc", (0.3, 0.32, 0.33)), ("wood", (0.05, 0.03, 0.025)), ("glass", (0.02, 0.025, 0.03)), ("iron", (0.03, 0.03, 0.03)),
           ("plaster", (0.6, 0.58, 0.54)), ("render", (0.6, 0.58, 0.54)), ("tile", (0.35, 0.12, 0.08)), ("roof", (0.2, 0.2, 0.22))]
def colour_of(name):
    n = name.lower()
    for k, c in PALETTE:
        if k in n: return c
    return (0.5, 0.5, 0.5)

orig = {}
for o in objs:
    for slot in o.material_slots:
        m = slot.material
        if m and m.name not in orig:
            orig[m.name] = m

def culled(nt, bsdf_out, out):
    """back faces drawn as nothing (the browser culls them): a hole in the shell shows as a hole here too"""
    geo = nt.nodes.new("ShaderNodeNewGeometry"); tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mix = nt.nodes.new("ShaderNodeMixShader")
    nt.links.new(geo.outputs["Backfacing"], mix.inputs[0]); nt.links.new(bsdf_out, mix.inputs[1]); nt.links.new(tr.outputs[0], mix.inputs[2])
    nt.links.new(mix.outputs[0], out.inputs[0])

def set_shaded():
    for name, m in orig.items():
        m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        b.inputs["Base Color"].default_value = (*colour_of(name), 1)
        b.inputs["Roughness"].default_value = 0.1 if "glass" in name else (0.45 if any(k in name for k in ("copper", "slate", "zinc")) else 0.85)
        if "copper" in name: b.inputs["Metallic"].default_value = 0.6
        culled(nt, b.outputs[0], out)

def set_checker():
    for name, m in orig.items():
        nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial"); b = nt.nodes.new("ShaderNodeBsdfPrincipled")
        tc = nt.nodes.new("ShaderNodeTexCoord"); ck = nt.nodes.new("ShaderNodeTexChecker")
        ck.inputs["Scale"].default_value = 1.0
        ck.inputs["Color1"].default_value = (0.8, 0.8, 0.8, 1); ck.inputs["Color2"].default_value = (0.25, 0.25, 0.25, 1)
        nt.links.new(tc.outputs["Object"], ck.inputs["Vector"]); nt.links.new(ck.outputs["Color"], b.inputs["Base Color"])
        b.inputs["Roughness"].default_value = 0.6
        culled(nt, b.outputs[0], out)

# ---------------------------------------------------------------- ground, light, camera
if GROUND is not None:
    bpy.ops.mesh.primitive_plane_add(size=600, location=gl(0, float(GROUND), 0))
    g = bpy.context.active_object; gm = bpy.data.materials.new("GroundMat"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.15, 1)
    g.data.materials.append(gm)
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.use_nodes = True
bg = scn.world.node_tree.nodes.get("Background")
sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.3
sun_d = bpy.data.lights.new("Sun", "SUN"); sun = bpy.data.objects.new("Sun", sun_d); scn.collection.objects.link(sun)
cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
scn.render.resolution_x, scn.render.resolution_y = 1280, 800

def render(name, pos, tgt, lens, mode):
    cam.location = gl(*pos); t = gl(*tgt)
    d = t - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam_d.lens = lens
    if mode == "grazing":
        # a sun 7 degrees above the horizon raking across what the camera faces: its travel direction is the view's
        # horizontal direction turned 70 degrees (cos 70 = 0.34 of it still goes into the faces seen)
        yaw = math.atan2(d.y, d.x) + math.radians(70)
        el = math.radians(7)
        travel = Vector((math.cos(yaw) * math.cos(el), math.sin(yaw) * math.cos(el), -math.sin(el)))
        sun_d.energy = 6.0; sun_d.angle = math.radians(0.5)
        sun.rotation_euler = travel.to_track_quat("-Z", "Y").to_euler()
        bg.inputs[1].default_value = 0.06
    else:
        sun_d.energy = 4.0; sun_d.angle = math.radians(1.5)
        sun.rotation_euler = (math.radians(50), 0, math.radians(200))
        bg.inputs[1].default_value = 0.3
    scn.render.filepath = f"{OUTP}_{name}_{mode}.png"
    bpy.ops.render.render(write_still=True)
    print("wrote", scn.render.filepath)

# --look name:x,y,z[:dist] : a camera DIST m (default 18) out from the drawn model's plan centre through that point,
# 2 m above it, looking at it (a cluster from the probe, in the local frame)
vis = [o for o in objs if not o.hide_render]
if vis:
    xs = [(o.matrix_world @ Vector(c)).x for o in vis for c in o.bound_box]; ys = [(o.matrix_world @ Vector(c)).y for o in vis for c in o.bound_box]
    cen = Vector(((min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, 0))
    for i, a in enumerate(A):
        if a == "--look":
            parts = A[i + 1].split(":"); x, y, z = [float(v) for v in parts[1].split(",")]; dist = float(parts[2]) if len(parts) > 2 else 18.0
            p = gl(x, y, z); d = Vector((p.x - cen.x, p.y - cen.y, 0)); d = d.normalized() if d.length > 1e-3 else Vector((1, 0, 0))
            c = p + d * dist
            CAMS.append((parts[0], [c.x, c.z + 2.0, -c.y], [x, y, z], 24.0))

for mode in MODES:
    if mode == "checker": set_checker()
    else: set_shaded()
    for (name, pos, tgt, lens) in CAMS:
        render(name, pos, tgt, lens, mode)
