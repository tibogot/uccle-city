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

VARIANTS (the Saint-Job falcon family, viewer/falcons.js): the same painter on the SAME UVs, a texture only:
    blender --factory-startup -b -P tools/blender/peregrine.py -- models/bird/peregrine.glb models/bird/eyas.jpg <prev> --variant eyas
    blender --factory-startup -b -P tools/blender/peregrine.py -- models/bird/peregrine.glb models/bird/juvenile.jpg <prev> --variant juvenile
  eyas      a downy chick (~3 weeks, the Derby / Allenberg nest photos): creamy off-white down in soft clumps, a few
            dark contour feathers breaking through on the back, big dark eyes in bluish-grey skin, slate beak with a
            dark tip, pale cere, bright yellow feet
  juvenile  the young of the year (the fly-mode player leaving the eyrie): dark brown upperparts with buff feather
            edges, buff underparts with heavy dark VERTICAL streaks, brown hood, thinner moustache, bluish-grey cere
            and eye ring, yellow feet
The source must be peregrine.glb (its unique "FalconUV" is kept: the texture swaps onto the same mesh).
"""
import bpy, bmesh, sys, os, math
import numpy as np
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:]
VARIANT = argv[argv.index("--variant") + 1] if "--variant" in argv else "adult"
argv = [a for i, a in enumerate(argv) if a != "--variant" and (i == 0 or argv[i - 1] != "--variant")]
SRC, DST, PREV = argv[0], argv[1], argv[2] if len(argv) > 2 else None
KEEP_UV = VARIANT != "adult"
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
if KEEP_UV:                                  # a variant: paint on peregrine.glb's own unique UVs
    me.uv_layers.active.name = "FalconUV"
old_uv = me.uv_layers.active.name if not KEEP_UV else None
if KEEP_UV: pass
else:
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
    # yellow only below the "trousers": a peregrine's thighs are barred cream like the belly
    if name.startswith("UpperLeg"): return "body"
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

def vnoise(p, f, seed=0.0):
    """Cheap smooth 3D value-ish noise (sum of sines), -1..1."""
    x, y, z = p[:, 0] * f, p[:, 1] * f, p[:, 2] * f
    return (np.sin(x * 1.7 + y * 2.3 + seed) * np.sin(y * 1.9 - z * 2.1 + seed * 1.3) +
            np.sin(z * 2.7 + x * 1.1 - seed) * 0.6 + np.sin((x - y + z) * 3.3 + seed * 2.0) * 0.4) / 2.0

# head landmarks from the bones (rest pose, Blender coords): the eye sits behind the beak's base, high on the side
_bones = {b.name: arm.matrix_world @ b.head_local for b in arm.data.bones}
_H, _BT = Vector(_bones["head"]), Vector(_bones["mouth_upper"])
EYE = np.array([(_H.x + _BT.x) / 2, _H.y + (_BT.y - _H.y) * 0.5, _H.z + 0.015], np.float32)
print("EYE centre", EYE.round(3), "head", tuple(round(c, 3) for c in _H), "beak base", tuple(round(c, 3) for c in _BT), flush=True)

def eye_mask(p, n, r):
    """1 inside the eye disc on each side of the head (seen along x)."""
    d = np.sqrt((p[:, 1] - EYE[1]) ** 2 + ((p[:, 2] - EYE[2]) * 1.15) ** 2)
    side = smooth(0.25, 0.55, np.abs(n[:, 0]))
    return smooth(r, r * 0.75, d) * side

def plumage_eyas(p, n, w):
    """A ~3-week eyas: creamy down in soft clumps, dark contour feathers starting on the back, big dark eyes."""
    up = smooth(-0.15, 0.35, n[:, 2])
    clump = vnoise(p, 22.0, 1.0) * 0.75 + vnoise(p, 47.0, 4.0) * 0.25         # tufts of down
    down = mixc(C(0.86, 0.84, 0.79), C(0.97, 0.96, 0.93), 0.55 + 0.45 * clump)
    down = mixc(down, C(0.80, 0.80, 0.80), 0.25 * up)                          # greyer on the back
    # first dark feathers through the down on the back and the wing coverts (~20 days)
    pins = smooth(0.35, 0.75, vnoise(p, 14.0, 7.0)) * smooth(0.5, 0.9, n[:, 2]) * w[:, REG.index("wing")]
    col = mixc(down, C(0.45, 0.40, 0.36), 0.35 * pins)
    # face: bluish-grey bare skin round the eye, the dark eye, a dusky smudge below it (the moustache to come)
    rel = p - EYE
    skin = eye_mask(p, n, 0.085)
    col = mixc(col, C(0.55, 0.60, 0.66), skin * w[:, REG.index("head")])
    col = mixc(col, C(0.05, 0.04, 0.04), eye_mask(p, n, 0.05) * w[:, REG.index("head")])
    smudge = smooth(0.06, 0.02, np.abs(rel[:, 1] + 0.01)) * smooth(-0.04, -0.09, rel[:, 2]) * smooth(-0.2, -0.1, rel[:, 2]) * smooth(0.3, 0.55, np.abs(n[:, 0]))
    col = mixc(col, C(0.62, 0.58, 0.54), 0.6 * smudge * w[:, REG.index("head")])
    wb = w[:, REG.index("beak")]
    col = mixc(col, C(0.72, 0.74, 0.76), smooth(0.4, 0.55, wb))                 # pale cere
    col = mixc(col, C(0.30, 0.34, 0.40), smooth(0.6, 0.75, wb))                 # slate beak
    col = mixc(col, C(0.10, 0.11, 0.13), smooth(0.85, 0.95, wb))                # dark tip
    col = mixc(col, C(0.95, 0.80, 0.25), smooth(0.55, 0.85, w[:, REG.index("leg")]))
    return col

def plumage_juvenile(p, n, w):
    """The young of the year: brown above with buff edges, buff below with dark vertical streaks."""
    x, y, z = p[:, 0], p[:, 1], p[:, 2]
    up = smooth(-0.15, 0.35, n[:, 2])
    BROWN, BROWN_D, BUFF, STREAK = C(0.27, 0.20, 0.15), C(0.17, 0.13, 0.10), C(0.84, 0.72, 0.55), C(0.30, 0.21, 0.15)
    scal = 0.5 + 0.5 * np.sin(x * 26.0) * np.sin(y * 30.0)
    edges = smooth(0.82, 0.95, scal)                                            # buff fringes on the feathers
    upper = mixc(mixc(BROWN, BROWN_D, 0.3 * smooth(0.2, 0.9, y)), C(0.52, 0.40, 0.28), 0.45 * edges)
    streak = smooth(0.62, 0.85, 0.5 + 0.5 * np.sin(x * 70.0 + np.sin(y * 9.0) * 1.5)) * smooth(0.3, 0.7, 0.5 + 0.5 * np.sin(y * 34.0))
    under = mixc(BUFF, STREAK, 0.75 * streak * smooth(-0.55, -0.2, y))
    col = mixc(under, upper, up)
    bars = smooth(0.78, 0.92, 0.5 + 0.5 * np.sin(y * 110.0 + np.abs(x) * 14.0))
    col = mixc(col, mixc(C(0.12, 0.10, 0.09), mixc(BUFF, STREAK, 0.6 * bars), 0.3 * (1 - up)), w[:, REG.index("tip")])
    tb = smooth(0.55, 0.75, 0.5 + 0.5 * np.sin(y * 48.0))
    col = mixc(col, mixc(BROWN, C(0.62, 0.50, 0.36), 0.5 * tb), w[:, REG.index("tail")])
    rel = p - HC
    hood = smooth(-0.02, 0.03, rel[:, 2])
    side = np.abs(rel[:, 0])
    mous = smooth(0.06, 0.03, np.abs(rel[:, 1] + 0.03)) * smooth(0.02, 0.05, side) * smooth(0.05, -0.06, rel[:, 2])
    head = mixc(C(0.86, 0.78, 0.64), C(0.23, 0.17, 0.13), np.maximum(hood * 0.95, mous * 0.9))
    col = mixc(col, head, w[:, REG.index("head")])
    col = mixc(col, C(0.55, 0.62, 0.70), eye_mask(p, n, 0.07) * w[:, REG.index("head")] * 0.8)   # bluish eye ring
    col = mixc(col, C(0.05, 0.04, 0.04), eye_mask(p, n, 0.045) * w[:, REG.index("head")])
    wb = w[:, REG.index("beak")]
    col = mixc(col, head, smooth(0.0, 0.3, wb))
    col = mixc(col, C(0.60, 0.66, 0.72), smooth(0.45, 0.6, wb) * (1 - smooth(0.7, 0.85, wb)))   # bluish-grey cere
    col = mixc(col, C(0.20, 0.23, 0.28), smooth(0.7, 0.85, wb))
    col = mixc(col, C(0.90, 0.80, 0.30), smooth(0.55, 0.85, w[:, REG.index("leg")]))
    return col

if VARIANT == "eyas": plumage = plumage_eyas
elif VARIANT == "juvenile": plumage = plumage_juvenile

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
if KEEP_UV:   # sRGB values were painted: store them as such (the image is sRGB), JPEG beside the glb
    im.pixels.foreach_set(rgba.ravel())
    im.filepath_raw = os.path.abspath(DST); im.file_format = "JPEG"
    bpy.context.scene.render.image_settings.quality = 90
    im.save()
    print("SAVED", DST, flush=True)
im.pixels.foreach_set(rgba.ravel())          # Blender images: row 0 = bottom = uv.y 0, as painted
im.pack()
mat = me.materials[0]
for nd in mat.node_tree.nodes:
    if nd.type == "TEX_IMAGE": nd.image = im
    if nd.type == "UVMAP": nd.uv_map = "FalconUV"
    if nd.type == "BSDF_PRINCIPLED": nd.inputs["Roughness"].default_value = 0.75

# ---------------------------------------------------------------- export (rig + all clips)
for o in bpy.context.scene.objects: o.select_set(True)
if not KEEP_UV: bpy.ops.export_scene.gltf(filepath=DST, export_format="GLB", use_selection=True, export_animations=True,
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
    act = bpy.data.actions.get("Idle" if KEEP_UV else "Glide")
    if act: arm.animation_data.action = act; scn.frame_set(3)
    pre = "" if not KEEP_UV else VARIANT + "_"
    if not KEEP_UV:
        shot("falcon_above.png", (0.5, 3.0, 9.0), c)
        shot("falcon_below.png", (0.5, 2.5, -8.0), c)
    shot(pre + "falcon_head.png", (1.2, -2.6, 0.9), Vector((0, -0.75, 0.45)))
    if KEEP_UV: shot(pre + "falcon_side.png", (4.5, -1.0, 1.2), Vector((0, 0, 0.4)))
    print("DONE", flush=True)
