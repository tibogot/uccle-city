"""LOD1's AO, baked on LOD1 itself (polish 2b; the LOD is made by meshoptimizer in tools/townhall_pack.mjs, Blender only
bakes lighting on it, it never simplifies):

    node tools/townhall_pack.mjs models/townhall/townhall.raw.glb models/townhall/townhall.glb      # writes townhall_lod1_bake.bin
    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/townhall_lod1_ao.py -- models/townhall
    node tools/townhall_pack.mjs models/townhall/townhall.raw.glb models/townhall/townhall.glb      # uses townhall_lod1_ao.bin

IN  <dir>/townhall_lod1_bake.bin: uint32 N corners, float32 checksum, then N x (x, y, z) float32 in the Blender frame of
    tools/blender/townhall.py (x = u, y = -w, z = m TAW - 60), three corners per triangle.
OUT <dir>/townhall_lod1_ao.bin: the same header, then N float32: Cycles AO (4 m, like the main bake; baked to an image on
    a lightmap UV of LOD1, read a quarter of the way in from each corner) per corner, over LOD1
    itself + the DTM ground. Why: LOD1 sampled LOD0's lightmap, where the faces the simplification uncovers (a pilaster's
    plate behind its quoin courses, the reveals behind frames) are baked dark = dark strips, and a speckled hand-over.
"""
import bpy, os, sys, json, math, struct, time
import numpy as np

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else "models/townhall")
T0 = time.time()
raw = open(os.path.join(OUT, "townhall_lod1_bake.bin"), "rb").read()
N = struct.unpack_from("<I", raw, 0)[0]
P = np.frombuffer(raw, dtype="<f4", count=N * 3, offset=8).reshape(N, 3)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
me = bpy.data.meshes.new("Lod1")
me.from_pydata([tuple(map(float, p)) for p in P], [], [(i, i + 1, i + 2) for i in range(0, N, 3)])
me.update()
obj = bpy.data.objects.new("Lod1", me); scn.collection.objects.link(obj)
mat = bpy.data.materials.new("m"); mat.use_nodes = True; me.materials.append(mat)

# the ground (DTM), as in tools/blender/townhall.py
SITE = json.load(open(os.path.join(OUT, "site.json"))); FR = SITE["frame"]
OXC, OZC = FR["origin_city"]; ROT = FR["rotation_rad"]; OY = 60.0
g = json.load(open(os.path.join(OUT, "site_dtm.json")))
a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(g["rows"], g["cols"]).astype(np.float64) / 100 + g["base"]
st = 2; a = a[::st, ::st]; step = g["step"] * st; rows, cols = a.shape
ca, sa = math.cos(ROT), math.sin(ROT)
verts = []
for r in range(rows):
    for c in range(cols):
        x, z = g["x0"] + c * step, g["z0"] + r * step
        dx, dz = x - OXC, z - OZC
        u, w = dx * ca + dz * sa, -dx * sa + dz * ca
        verts.append((u, -w, a[r, c] - OY - 0.02))
faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
for p_ in gm.polygons:
    if p_.normal.z < 0: p_.flip()
gm.update(); gm.materials.append(mat)
ground = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(ground)

scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 96
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
# an AO IMAGE on a lightmap UV of the soup, sampled per corner a quarter of the way toward its triangle's centroid (a
# vertex-colour bake samples AT the corner, where the neighbouring faces of a crease black it out)
PX = 2048
uvl = me.uv_layers.new(name="Lightmap"); me.uv_layers.active = uvl
for o in scn.objects: o.select_set(False)
obj.select_set(True); bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.select_all(action="SELECT"); bpy.ops.uv.average_islands_scale()
bpy.ops.uv.pack_islands(rotate=True, margin=0.0015, shape_method="AABB", margin_method="FRACTION")
bpy.ops.object.mode_set(mode="OBJECT")
img = bpy.data.images.new("lod1_ao", PX, PX, alpha=False, float_buffer=True); img.colorspace_settings.name = "Non-Color"
nt = mat.node_tree; tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; nt.nodes.active = tn
bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=True)
px = np.empty(PX * PX * 4, np.float32); img.pixels.foreach_get(px); A = px.reshape(PX, PX, 4)[:, :, 0]
uvl = me.uv_layers["Lightmap"]          # (re-fetched: the edit-mode round trip invalidates the old reference)
uvd = np.empty(len(me.loops) * 2, np.float32); uvl.data.foreach_get("uv", uvd); uvd = uvd.reshape(-1, 2)
def sample(u, v):
    x = min(max(u * PX - 0.5, 0), PX - 1.001); y = min(max(v * PX - 0.5, 0), PX - 1.001)
    x0, y0 = int(x), int(y); fx, fy = x - x0, y - y0
    return (A[y0, x0] * (1 - fx) + A[y0, x0 + 1] * fx) * (1 - fy) + (A[y0 + 1, x0] * (1 - fx) + A[y0 + 1, x0 + 1] * fx) * fy
ao = np.empty(N, np.float32)
for poly in me.polygons:
    li = list(poly.loop_indices); c = uvd[li].mean(axis=0)
    for k, l in enumerate(li):
        q = uvd[l] * 0.75 + c * 0.25
        ao[poly.index * 3 + k] = sample(q[0], q[1])
open(os.path.join(OUT, "townhall_lod1_ao.bin"), "wb").write(raw[:8] + ao.astype("<f4").tobytes())
print(f"LOD1 AO: {N} corners, mean {ao.mean():.3f}, {time.time() - T0:.1f}s")
