"""SQUARE DES HEROS: THE STATUE SLOT PIPELINE. Any source model of the bronze group (the owner's Tripo AI model, or our
own scripted one) -> the game-ready slot files the city loads instead of our scripted bronze (viewer/heros/herosStatue.js,
docs/landmarks/HEROS.md "statue slot"):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros_statue_slot.py -- <source>
        [--out models/heros] [--height 4.5] [--yaw 0] [--rock 0.36] [--lod 26000,7000,1600] [--tex 2048] [--samples 64] [--keep-scale]

  <source>   .glb / .gltf (Tripo's export), .obj, .fbx, .ply, .stl, or our statue_raw.json (tools/blender/heros_statue.py)
  --height   the group's height in metres from the foot of the base (rock) to the top of the raised wing: the source is
             scaled to it (default 4.5, measured on the photos; --keep-scale keeps the source's own metres)
  --yaw      degrees about the vertical, applied after import, to turn the source's front toward glTF +Z (Tripo: usually 0)
  --rock     metres: the faces entirely under this height above the base become the "stone_rock" part (grey stone, not
             gilded: the photos); 0 = none
  --lod      LOD0, LOD1, LOD2 triangle targets (meshoptimizer, tools/heros_statue_lods.mjs)
  --tex      the normal / AO maps' size

What it does:
  1. imports and joins the source, applies its transforms, triangulates, turns it by --yaw;
  2. NORMALISES: +Y up / front +Z in the written file (Blender: +Z up, front -Y), metres, the pivot = the centre of the
     base's footprint (the lowest 8 % of the height) at (0, 0, 0), sunk 2 cm (the base sits INTO the cap: no floating
     edge, the JOINS rule);
  3. LOD0 = the source simplified by meshoptimizer to ~26k triangles; UV-unwrapped (smart project); the SOURCE's detail
     baked onto it (Cycles, selected-to-active): a tangent-space NORMAL map and AMBIENT OCCLUSION (the patina: our bronze
     material darkens the folds and gilds the raised parts from it);
  4. LOD1 / LOD2 = LOD0 simplified again (UVs kept: the same maps serve all three);
  5. writes models/heros/statue.glb (nodes Statue_LOD0/1/2, material slots "bronze_gilt" / "stone_rock": no colour, no
     texture inside: our own bronze applies by the slot name), statue_normal.png, statue_ao.png, and statue_slot.json
     (the city's switch: glb set = the slot is used; the cap's point, LOD distances, triangle counts, the source's name).
     Then the GLB is meshopt-packed (tools/hero_pack.mjs --nolod). To go back to our scripted bronze: set "glb": null in
     statue_slot.json (or ?herostatue=ours in the URL to compare).
"""
import bpy, bmesh, math, os, sys, json, time, struct, subprocess
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, default):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default
SRC = os.path.abspath(ARGS[0])
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.abspath(opt("--out", os.path.join(ROOT, "models", "heros")))
HEIGHT = float(opt("--height", 4.5))
YAW = math.radians(float(opt("--yaw", 0)))
ROCK = float(opt("--rock", 0.36))
LODS = [int(x) for x in opt("--lod", "26000,7000,1600").split(",")]
TEX = int(opt("--tex", 2048))
SAMPLES = int(opt("--samples", 64))
KEEP = "--keep-scale" in ARGS
WORK = os.path.join(OUT, "statue_work")
os.makedirs(WORK, exist_ok=True)
T0 = time.time()
sys.stdout.reconfigure(line_buffering=True)
def tick(what): print(f"[statue slot] {what} {time.time() - T0:.1f}s")

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
def activate(o):
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o

# ------------------------------------------------------------------------------------------------ 1. import
ext = os.path.splitext(SRC)[1].lower()
if ext in (".glb", ".gltf"): bpy.ops.import_scene.gltf(filepath=SRC)
elif ext == ".obj": bpy.ops.wm.obj_import(filepath=SRC)
elif ext == ".fbx": bpy.ops.import_scene.fbx(filepath=SRC)
elif ext == ".ply": bpy.ops.wm.ply_import(filepath=SRC)
elif ext == ".stl": bpy.ops.wm.stl_import(filepath=SRC)
elif ext == ".json":                     # our statue_raw.json: x = front, y = the viewer's right, z up -> Blender front -Y
    d = json.load(open(SRC))
    me = bpy.data.meshes.new("src"); me.from_pydata([(y, -x, z) for x, y, z in d["verts"]], [], d["faces"]); me.update()
    scn.collection.objects.link(bpy.data.objects.new("src", me))
else: raise SystemExit(f"unknown source type {ext}")
meshes = [o for o in scn.objects if o.type == "MESH"]
if not meshes: raise SystemExit("no mesh in the source")
for o in scn.objects: o.select_set(o.type == "MESH")
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1: bpy.ops.object.join()
src = bpy.context.view_layer.objects.active; src.name = "Source"
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
for o in list(scn.objects):
    if o is not src: bpy.data.objects.remove(o, do_unlink=True)
bm = bmesh.new(); bm.from_mesh(src.data)
bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
bmesh.ops.triangulate(bm, faces=bm.faces)
bm.transform(Matrix.Rotation(YAW, 4, "Z"))
# ------------------------------------------------------------------------------------------------ 2. normalise
zs = [v.co.z for v in bm.verts]; z0, z1 = min(zs), max(zs)
k = 1.0 if KEEP else HEIGHT / (z1 - z0)
foot = [v.co for v in bm.verts if v.co.z < z0 + 0.08 * (z1 - z0)]
cx = (min(p.x for p in foot) + max(p.x for p in foot)) / 2; cy = (min(p.y for p in foot) + max(p.y for p in foot)) / 2
bm.transform(Matrix.Translation((0, 0, -0.02)) @ Matrix.Scale(k, 4) @ Matrix.Translation((-cx, -cy, -z0)))
bm.to_mesh(src.data); bm.free()
src.data.materials.clear()
for p in src.data.polygons: p.use_smooth = True
H = (z1 - z0) * k
tick(f"source: {len(src.data.polygons)} triangles, scaled x{k:.4f} to {H:.3f} m, pivot = the base's centre")

# ------------------------------------------------------------------------------------------------ helpers: meshopt round trip
def write_bin(path, verts, tris):
    fpv = len(verts[0])
    with open(path, "wb") as f:
        f.write(struct.pack("<III", len(verts), len(tris), fpv))
        f.write(struct.pack(f"<{len(verts) * fpv}f", *[c for v in verts for c in v]))
        f.write(struct.pack(f"<{len(tris) * 3}I", *[i for t in tris for i in t]))
def read_bin(path):
    b = open(path, "rb").read()
    nv, nt, fpv = struct.unpack_from("<III", b, 0)
    fl = struct.unpack_from(f"<{nv * fpv}f", b, 12)
    ix = struct.unpack_from(f"<{nt * 3}I", b, 12 + nv * fpv * 4)
    return [fl[i * fpv:(i + 1) * fpv] for i in range(nv)], [ix[i * 3:i * 3 + 3] for i in range(nt)]
def simplify(name, verts, tris, target, err=0.02, flags=""):
    a, b = os.path.join(WORK, f"{name}_in.bin"), os.path.join(WORK, f"{name}_out.bin")
    write_bin(a, verts, tris)
    r = subprocess.run(["node", os.path.join(ROOT, "tools", "heros_statue_lods.mjs"), a, b, str(target), str(err)] + ([flags] if flags else []), capture_output=True, text=True)
    print(r.stdout.strip(), r.stderr.strip())
    if r.returncode: raise SystemExit("meshoptimizer failed")
    return read_bin(b)
def mesh_from(name, verts, tris, with_uv):
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v[:3]) for v in verts], [], [tuple(t) for t in tris]); me.update()
    if with_uv:
        uvl = me.uv_layers.new(name="UVMap")
        uvd = [0.0] * (2 * len(me.loops))
        for li, l in enumerate(me.loops): uvd[2 * li], uvd[2 * li + 1] = verts[l.vertex_index][3], verts[l.vertex_index][4]
        uvl.data.foreach_set("uv", uvd)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)       # (seam vertices welded: smooth normals across UV seams)
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    return o

# ------------------------------------------------------------------------------------------------ 3. LOD0 + UV + bakes
sm = src.data
sv = [tuple(v.co) for v in sm.vertices]
sm.calc_loop_triangles()
st = [tuple(t.vertices) for t in sm.loop_triangles]
v0, t0 = simplify("lod0", sv, st, LODS[0])
lod0 = mesh_from("Statue_LOD0", v0, t0, False)
# the unwrap runs on a SMOOTHED copy (same topology): a scanned / remeshed surface's noisy face normals cut a smart
# projection into thousands of crumbs; smoothed, the islands follow the big forms (limbs, wing panels, robe folds); the
# UVs are copied back loop for loop
tmp = bpy.data.objects.new("UVProxy", lod0.data.copy()); scn.collection.objects.link(tmp)
smo = tmp.modifiers.new("smooth", "SMOOTH"); smo.factor = 1.0; smo.iterations = 40
activate(tmp); bpy.ops.object.modifier_apply(modifier="smooth")
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(70), island_margin=0.002, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.object.mode_set(mode="OBJECT")
uvp = lod0.data.uv_layers.new(name="UVMap")
d_ = [0.0] * (2 * len(tmp.data.loops)); tmp.data.uv_layers["UVMap"].data.foreach_get("uv", d_); uvp.data.foreach_set("uv", d_)
bpy.data.objects.remove(tmp, do_unlink=True)
activate(lod0)
bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.select_all(action="SELECT")
bpy.ops.uv.average_islands_scale()                     # (texel density from the REAL surface)
bpy.ops.uv.pack_islands(margin=0.003, rotate=True)
bpy.ops.object.mode_set(mode="OBJECT")
tick(f"LOD0 {len(t0)} triangles, unwrapped: {len(set(tuple(round(c, 5) for c in l.uv) for l in lod0.data.uv_layers['UVMap'].data))} uv points")

mats = {}
for name in ("bronze_gilt", "stone_rock"):
    m = bpy.data.materials.new(name); mats[name] = m
lod0.data.materials.append(mats["bronze_gilt"])
nimg = bpy.data.images.new("statue_normal", TEX, TEX, alpha=False, float_buffer=False); nimg.colorspace_settings.name = "Non-Color"
aimg = bpy.data.images.new("statue_ao", TEX // 2, TEX // 2, alpha=False, float_buffer=False); aimg.colorspace_settings.name = "Non-Color"
m = mats["bronze_gilt"]
nt_ = m.node_tree if m.node_tree else None
if nt_ is None:
    m.use_nodes = True; nt_ = m.node_tree
tex = nt_.nodes.new("ShaderNodeTexImage"); nt_.nodes.active = tex
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = SAMPLES
scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)   # half the CPU (shared laptop)
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 0.6
diag = max(lod0.dimensions)
def bake(kind, img):
    """NORMAL: the source's detail onto LOD0 (selected to active); AO: LOD0 on its own (the source hidden: lying within
    millimetres of LOD0 it would occlude every ray)"""
    tex.image = img
    activate(lod0)
    s2a = kind == "NORMAL"
    src.hide_render = not s2a
    if s2a: src.select_set(True); bpy.context.view_layer.objects.active = lod0
    bpy.ops.object.bake(type=kind, use_selected_to_active=s2a, cage_extrusion=0.012 * diag / 4.5, max_ray_distance=0.03 * diag / 4.5,
                        normal_space="TANGENT", margin=8, uv_layer="UVMap", use_clear=True)
    src.hide_render = False
    img.filepath_raw = os.path.join(OUT, f"{img.name}.png"); img.file_format = "PNG"; img.save()
t = time.time(); bake("NORMAL", nimg); tick(f"normal map {TEX}^2 baked ({time.time() - t:.0f}s)")
t = time.time(); bake("AO", aimg); tick(f"AO {TEX // 2}^2 baked ({time.time() - t:.0f}s)")
nt_.nodes.remove(tex)

# ------------------------------------------------------------------------------------------------ 4. LOD1 / LOD2 (UVs kept)
uvl = lod0.data.uv_layers["UVMap"].data
lod0.data.calc_loop_triangles()
key = {}; uvverts = []; uvtris = []
for tri in lod0.data.loop_triangles:
    f = []
    for li in tri.loops:
        vi = lod0.data.loops[li].vertex_index; u, v = uvl[li].uv
        kk = (vi, round(u, 6), round(v, 6))
        if kk not in key:
            key[kk] = len(uvverts); co = lod0.data.vertices[vi].co; uvverts.append((co.x, co.y, co.z, u, v))
        f.append(key[kk])
    uvtris.append(f)
lods = [lod0]
for i, target, err, fl in ((1, LODS[1], 0.05, ""), (2, LODS[2], 0.4, "Permissive")):
    vv, tt = simplify(f"lod{i}", uvverts, uvtris, target, err, fl)
    o = mesh_from(f"Statue_LOD{i}", vv, tt, True); o.data.materials.append(mats["bronze_gilt"])
    lods.append(o)

# ------------------------------------------------------------------------------------------------ 5. the rock part, export
tris = []
for o in lods:
    me = o.data
    if ROCK > 0:
        me.materials.append(mats["stone_rock"])
        for p in me.polygons:
            if max(me.vertices[v].co.z for v in p.vertices) < ROCK - 0.02: p.material_index = 1
    tris.append(sum(len(p.vertices) - 2 for p in me.polygons))
bpy.data.objects.remove(src, do_unlink=True)
for o in scn.objects: o.select_set(o in lods)
raw = os.path.join(WORK, "statue.raw.glb")
bpy.ops.export_scene.gltf(filepath=raw, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_tangents=True, export_materials="EXPORT",
                          export_image_format="NONE", export_vertex_color="NONE", export_extras=False)
glb = os.path.join(OUT, "statue.glb")
r = subprocess.run(["node", os.path.join(ROOT, "tools", "hero_pack.mjs"), raw, glb, "--nolod", "--name", "Statue"], capture_output=True, text=True)
print(r.stdout.strip(), r.stderr.strip())
if r.returncode: raise SystemExit("hero_pack failed")
heros = json.load(open(os.path.join(OUT, "heros.json")))
slot = heros.get("statue_slot", {})
info = {
    "about": "The bronze group's slot: written by tools/blender/heros_statue_slot.py (docs/landmarks/HEROS.md 'statue slot'). "
             "Set glb to null to go back to our scripted bronze (or ?herostatue=ours to compare).",
    "glb": "statue.glb", "normal": "statue_normal.png", "ao": "statue_ao.png",
    "source": os.path.basename(SRC), "height_m": round(H, 3), "scale": round(k, 5), "yaw_deg": round(math.degrees(YAW), 2), "rock_m": ROCK,
    "base_local": slot.get("base_local", [0.0, 7.15, 0.0]), "lod_m": [40, 110], "band_m": [6, 12], "tris": tris,
    "bytes": os.path.getsize(glb), "maps_px": [TEX, TEX // 2],
    "frame": "metres, +Y up, front +Z, pivot (0, 0, 0) = the centre of the base on the cap (sunk 2 cm)",
}
json.dump(info, open(os.path.join(OUT, "statue_slot.json"), "w"), indent=1)
tick(f"done: {glb} ({os.path.getsize(glb) // 1024} KB), LODs {tris} triangles, maps {TEX} / {TEX // 2} px")
