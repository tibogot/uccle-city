"""THE SAINT-JOB PEREGRINE FALCON: repaints the fly-mode bird (models/bird/bird.glb) as an adult peregrine
(Falco peregrinus; a family nests in the Saint-Job church tower in the story, as real pairs do on Brussels
churches) and exports it with the SAME rig and animation clips.

    blender --factory-startup -b -P tools/blender/peregrine.py -- <in.glb> <out.glb> <preview_dir>

The plumage is painted straight into a new texture on the model's own UVs: for every texel of every UV
triangle, the point's 3D position, its normal and its bone weights (vertex groups) choose the colour.
  upperparts   dark slate blue-grey, faint feather scalloping; darker primaries / wingtips
  head         black hood and the falcon's black moustache stripe, white cheeks and throat
  underparts   cream, fine dark horizontal barring (belly, flanks, underwing)
  tail         grey, barred, a dark band near the tip, a pale tip
  bare parts   yellow cere (beak base), eye ring and feet; the beak tip dark blue-grey
Edges are dilated a few texels so the UV seams don't show. Blender coordinates (Z up): wingspan along X,
the nose toward -Y. --factory-startup: the user's add-ons (GScatter) break headless runs.
"""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
SRC, DST, PREV = argv[0], argv[1], argv[2] if len(argv) > 2 else None
SIZE = 1024   # unique UVs: ~60 % of it painted

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=SRC)
for o in list(bpy.context.scene.objects):
    if o.type == "MESH" and not o.vertex_groups: bpy.data.objects.remove(o)      # the stray Icosphere
mesh_obj = next(o for o in bpy.context.scene.objects if o.type == "MESH")
arm = next(o for o in bpy.context.scene.objects if o.type == "ARMATURE")
me = mesh_obj.data
gname = {g.index: g.name for g in mesh_obj.vertex_groups}

# ---------------------------------------------------------------- unique UVs
# the model's own UVs point many faces at a few shared colour swatches (a palette texture): painting into them
# mixed regions (yellow feet over the wings). A new unwrapped UV map, unique per face, becomes the only one.
bpy.context.view_layer.objects.active = mesh_obj
for o in bpy.context.scene.objects: o.select_set(o is mesh_obj)
old_uv = me.uv_layers.active.name
new_uv = me.uv_layers.new(name="FalconUV")
me.uv_layers.active = new_uv
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(55), island_margin=0.004, area_weight=0.0)
bpy.ops.object.mode_set(mode="OBJECT")
me.uv_layers.remove(me.uv_layers[old_uv])
me.uv_layers.active = me.uv_layers["FalconUV"]
me.uv_layers["FalconUV"].active_render = True

# ---------------------------------------------------------------- per-vertex region weights from the bones
def region(name):
    if name.startswith("mouth"): return "beak"
    if name == "head": return "head"
    if name.startswith("wing_tip") or name.startswith("wing_5") or name.startswith("wing_feather_4"): return "tip"
    if name.startswith("wing"): return "wing"
    if name.startswith("tail"): return "tail"
    if "Leg" in name or name.startswith("Foot") or name.startswith("Toes"): return "leg"
    return "body"
REG = ["body", "head", "beak", "wing", "tip", "tail", "leg"]
NV = len(me.vertices)
W = np.zeros((NV, len(REG)), np.float32)
for v in me.vertices:
    for g in v.groups:
        W[v.index, REG.index(region(gname[g.group]))] += g.weight
W /= np.maximum(W.sum(1, keepdims=True), 1e-6)
P = np.array([v.co[:] for v in me.vertices], np.float32)
N = np.array([v.normal[:] for v in me.vertices], np.float32)

# the head's centre (for the hood / moustache / cheek layout): weighted mean of the head vertices
hw = W[:, REG.index("head")]
HC = (P * hw[:, None]).sum(0) / max(hw.sum(), 1e-6)
print("HEAD centre", HC.round(3), "span x", P[:, 0].min().round(2), P[:, 0].max().round(2), flush=True)

def mixc(a, b, t): return a + (b - a) * np.clip(t, 0, 1)[..., None]
def smooth(e0, e1, x):
    t = np.clip((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t)
C = lambda *rgb: np.array(rgb, np.float32)
SLATE, SLATE_D, TIP = C(0.30, 0.34, 0.40), C(0.18, 0.21, 0.26), C(0.09, 0.09, 0.11)
HOOD, WHITE, CREAM, BAR = C(0.07, 0.07, 0.08), C(0.95, 0.94, 0.90), C(0.90, 0.85, 0.75), C(0.28, 0.25, 0.23)
YEL, BEAK = C(0.96, 0.76, 0.14), C(0.20, 0.23, 0.28)

def plumage(p, n, w):
    """p, n: (k,3) object-space points / normals; w: (k, regions) weights -> (k,3) sRGB colours."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    up = smooth(-0.15, 0.35, n[:, 2])                      # 1 on the back / top of the wings, 0 underneath
    # upperparts: slate, faint scalloping (feather rows), darker toward the wing's trailing edge
    scal = 0.5 + 0.5 * np.sin(x * 26.0) * np.sin(y * 30.0)
    upper = mixc(SLATE, SLATE_D, 0.35 * scal + 0.3 * smooth(0.2, 0.9, y))
    # underparts: cream with fine dark bars (across the body: vary along its length y; on the wing a little along x)
    # fine, dense, slightly irregular bars (a real peregrine's underwing / belly), lighter than solid stripes
    jit = np.sin(x * 11.0 + y * 3.0) * 0.35
    bars = smooth(0.78, 0.92, 0.5 + 0.5 * np.sin(y * 110.0 + np.abs(x) * 14.0 + jit * 6.0))
    under = mixc(CREAM, BAR, 0.5 * bars * smooth(-0.45, -0.1, y))      # the breast (front) is plainer
    col = mixc(under, upper, up)
    # wingtips / primaries: dark above and below
    col = mixc(col, mixc(TIP, mixc(CREAM, BAR, 0.6 * bars), 0.25 * (1 - up)), w[:, REG.index("tip")])
    # tail: grey with bars along its length, a dark band near the tip, a pale tip
    tb = smooth(0.55, 0.75, 0.5 + 0.5 * np.sin(y * 48.0))
    tail = mixc(mixc(SLATE, C(0.45, 0.48, 0.52), 0.4), SLATE_D, tb)
    tipd = y.max() if len(y) else 0
    col = mixc(col, tail, w[:, REG.index("tail")])
    # head: black hood above the eye line and the moustache, white cheeks and throat
    rel = p - HC
    hood = smooth(-0.03, 0.02, rel[:, 2])                                   # above the eye line
    side = np.abs(rel[:, 0])
    mous = smooth(0.09, 0.04, np.abs(rel[:, 1] + 0.03)) * smooth(0.02, 0.05, side) * smooth(0.06, -0.08, rel[:, 2])   # the black moustache
    head = mixc(WHITE, HOOD, np.maximum(hood, mous))
    # (no eye ring: a pixel or two at game distance, and too big a patch it hid the moustache)
    col = mixc(col, head, w[:, REG.index("head")])
    # beak: yellow cere at the base, dark blue-grey hook
    # the mouth bones weight much of the face: the face keeps the head's colours (white cheeks, moustache),
    # only the beak proper (high mouth weight) is the dark hook, with a narrow yellow cere where it starts
    wb = w[:, REG.index("beak")]
    col = mixc(col, head, smooth(0.0, 0.3, wb))
    col = mixc(col, YEL, smooth(0.45, 0.6, wb) * (1 - smooth(0.7, 0.85, wb)))
    col = mixc(col, BEAK, smooth(0.7, 0.85, wb))
    # yellow only where the legs really are (their weight bleeds onto the body near the hips)
    col = mixc(col, YEL, smooth(0.55, 0.85, w[:, REG.index("leg")]))
    return col

# ---------------------------------------------------------------- rasterise every UV triangle
img = np.zeros((SIZE, SIZE, 3), np.float32)
filled = np.zeros((SIZE, SIZE), bool)
uvl = me.uv_layers.active.data
me.calc_loop_triangles()
for tri in me.loop_triangles:
    vi = list(tri.vertices)
    uv = np.array([uvl[l].uv[:] for l in tri.loops], np.float32) * SIZE
    x0, y0 = np.floor(uv.min(0)).astype(int); x1, y1 = np.ceil(uv.max(0)).astype(int)
    x0, y0 = max(x0, 0), max(y0, 0); x1, y1 = min(x1, SIZE - 1), min(y1, SIZE - 1)
    if x1 < x0 or y1 < y0: continue
    gx, gy = np.meshgrid(np.arange(x0, x1 + 1) + 0.5, np.arange(y0, y1 + 1) + 0.5)
    a, b, c = uv
    d = (b[1] - c[1]) * (a[0] - c[0]) + (c[0] - b[0]) * (a[1] - c[1])
    if abs(d) < 1e-9: continue
    l0 = ((b[1] - c[1]) * (gx - c[0]) + (c[0] - b[0]) * (gy - c[1])) / d
    l1 = ((c[1] - a[1]) * (gx - c[0]) + (a[0] - c[0]) * (gy - c[1])) / d
    l2 = 1 - l0 - l1
    inside = (l0 >= -0.02) & (l1 >= -0.02) & (l2 >= -0.02)
    if not inside.any(): continue
    L = np.stack([l0[inside], l1[inside], l2[inside]], 1)
    p = L @ P[vi]; n = L @ N[vi]; n /= np.maximum(np.linalg.norm(n, axis=1, keepdims=True), 1e-6)
    w = L @ W[vi]
    iy, ix = gy[inside].astype(int), gx[inside].astype(int)
    img[iy, ix] = plumage(p, n, w)
    filled[iy, ix] = True
print("texels painted", int(filled.sum()), flush=True)
# dilate: 6 rounds, each empty texel takes the mean of its filled neighbours (no seams)
for _ in range(6):
    acc = np.zeros_like(img); cnt = np.zeros((SIZE, SIZE), np.float32)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            sh = np.roll(np.roll(filled, dy, 0), dx, 1)
            acc += np.roll(np.roll(img, dy, 0), dx, 1) * sh[..., None]; cnt += sh
    grow = (~filled) & (cnt > 0)
    img[grow] = acc[grow] / cnt[grow][:, None]
    filled |= grow

# ---------------------------------------------------------------- the new texture into the material
im = bpy.data.images.new("Peregrine", SIZE, SIZE)
rgba = np.concatenate([img, np.ones((SIZE, SIZE, 1), np.float32)], 2)
im.pixels.foreach_set(rgba.ravel())          # Blender images: row 0 = bottom = uv.y 0, as painted
im.pack()
mat = me.materials[0]
for nd in mat.node_tree.nodes:
    if nd.type == "TEX_IMAGE": nd.image = im
    if nd.type == "UVMAP": nd.uv_map = "FalconUV"
    if nd.type == "BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value = 0.75

# ---------------------------------------------------------------- export (rig + all clips)
for o in bpy.context.scene.objects: o.select_set(True)
bpy.ops.export_scene.gltf(filepath=DST, export_format="GLB", use_selection=True, export_animations=True,
                          export_animation_mode="ACTIONS", export_image_format="JPEG", export_jpeg_quality=90)
print("EXPORTED", DST, flush=True)

# ---------------------------------------------------------------- previews: from above and below, Glide pose
if PREV:
    os.makedirs(PREV, exist_ok=True)
    scn = bpy.context.scene
    act = bpy.data.actions.get("Glide")
    if act and arm.animation_data is not None: arm.animation_data.action = act
    elif act: arm.animation_data_create(); arm.animation_data.action = act
    scn.frame_set(3)
    world = bpy.data.worlds.new("w"); scn.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.65, 0.8, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.9
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    sun.data.energy = 3.0; sun.rotation_euler = (math.radians(30), 0, math.radians(30))
    scn.render.engine = "CYCLES"; scn.cycles.samples = 32; scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 900, 600
    scn.view_settings.view_transform = "AgX"
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    def shot(name, loc, look):
        cam.location = Vector(loc); d = Vector(look) - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.render.filepath = os.path.join(PREV, name); bpy.ops.render.render(write_still=True); print("PREVIEW", name, flush=True)
    c = Vector((0, 0, 0.4))
    shot("falcon_above.png", (0.5, 3.0, 9.0), c)
    shot("falcon_below.png", (0.5, 2.5, -8.0), c)
    shot("falcon_head.png", (1.2, -2.6, 0.9), Vector((0, -0.75, 0.45)))
    print("DONE", flush=True)
