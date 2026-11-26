"""THE VILLA'S SCULPTURES (claude/villa3 job 4, docs/VILLA_V3_PLAN.md item 6; licences in models/villa/LICENCES.md).

Three real CC0 scans from Poly Haven (each asset page + https://polyhaven.com/license read 2026-11-26), downloaded
untouched to data/raw/villa_sculptures/<id>/ (glTF 1k + its maps): a classical marble bust, a marble horse (its wooden
display base dropped: it stands on our stone plinth) and a bronze whale. Here: imported read-only, transformed in
memory, decimated per level (LOD0 <= 15k, LOD1 ~25 %, LOD2 a few hundred triangles; the UVs kept, so the scans' own
normal / AO / roughness maps, baked from the full scans by Poly Haven, still apply), and returned as bmeshes in BLENDER
coordinates (Z up), centred in plan, the base at z = 0, scaled to their garden size.

    statue(k, level) -> bmesh        (k: the index in ART = the KTX2 layer = the face code)"""
import bpy, bmesh, os
from mathutils import Vector, Matrix
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
SRC = os.path.join(ROOT, "data", "raw", "villa_sculptures")
# (id, scale, LOD0 / LOD1 / LOD2 target triangles)
# (LOD0 = the scan itself, welded: decimating it opened slits, mesh audit `leak`; LOD1 / LOD2 = a VOXEL REMESH of it
# (watertight: the collapse-decimated scan folded over itself, `crossing` / `flipped`), decimated, its UV transferred
# back from the scan so the same maps apply)
ART = [("marble_bust_01", 1.0, (None, 3000, 300), 0.006),
       ("horse_statue_01", 6.0, (None, 3000, 300), 0.016),   # (0.012: a 7 mm pinch between the legs read as a slit, audit `leak`)
       ("bronze_whale_statue", 1.0, (None, 1500, 250), 0.014)]
_cache = {}

def _import(k):
    pid, sc, _, vox = ART[k]
    if k in _cache: return _cache[k]
    before = set(bpy.data.objects)
    bpy.ops.import_scene.gltf(filepath=os.path.join(SRC, pid, f"{pid}_1k.gltf"))
    objs = [o for o in bpy.data.objects if o not in before and o.type == "MESH"]
    bm = bmesh.new()
    for o in objs:
        me = o.data
        keep = {i for i, m in enumerate(me.materials) if m and not m.name.endswith("_base")}
        tmp = bmesh.new(); tmp.from_mesh(me); tmp.transform(o.matrix_world)
        drop = [f for f in tmp.faces if f.material_index not in keep]
        bmesh.ops.delete(tmp, geom=drop, context="FACES")
        me2 = bpy.data.meshes.new("art_tmp"); tmp.to_mesh(me2); tmp.free(); bm.from_mesh(me2); bpy.data.meshes.remove(me2)
    for o in [o for o in bpy.data.objects if o not in before]: bpy.data.objects.remove(o)
    bmesh.ops.scale(bm, vec=(sc, sc, sc), verts=bm.verts)
    # (the scan's own seams: a few mm once scaled x6 for the horse: mesh audit `leak`; welded at 0.5 mm x the scale)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005 * sc)
    # (the horse's underside lost its wooden display base: that opening, 3 cm slits in the audit, is closed)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    lo = Vector((min(v.co.x for v in bm.verts), min(v.co.y for v in bm.verts), min(v.co.z for v in bm.verts)))
    hi = Vector((max(v.co.x for v in bm.verts), max(v.co.y for v in bm.verts), max(v.co.z for v in bm.verts)))
    bmesh.ops.translate(bm, vec=(-(lo.x + hi.x) / 2, -(lo.y + hi.y) / 2, -lo.z), verts=bm.verts)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    _cache[k] = bm
    print(f"art {pid}: {len(bm.faces)} triangles, size {hi.x - lo.x:.2f} x {hi.y - lo.y:.2f} x {hi.z - lo.z:.2f} m")
    return bm

def _unfold(bm):
    """dissolve the folded-over slivers (a face turned against its corners' area-weighted normal: mesh audit `flipped`)"""
    for _ in range(6):
        bm.normal_update()
        vn = {v: sum((f.normal * f.calc_area() for f in v.link_faces), Vector()) for v in bm.verts}
        bad = [f for f in bm.faces if sum((vn[v].normalized() for v in f.verts), Vector()).normalized().dot(f.normal) < -0.1]
        if not bad: break
        bmesh.ops.collapse(bm, edges=list({e for f in bad for e in f.edges}), uvs=True)
    return bm

def statue(k, level=0):
    """the scan (level 0) or its remeshed, decimated, UV-transferred far copy (bmesh, Blender coordinates)"""
    src = _import(k); target = ART[k][2][level]
    if target is None: return _unfold(src.copy())
    me_s = bpy.data.meshes.new("art_src"); src.to_mesh(me_s)
    os_ = bpy.data.objects.new("art_src", me_s); bpy.context.scene.collection.objects.link(os_)
    me = bpy.data.meshes.new("art_far"); src.to_mesh(me)
    o = bpy.data.objects.new("art_far", me); bpy.context.scene.collection.objects.link(o)
    rm = o.modifiers.new("vox", "REMESH"); rm.mode = "VOXEL"; rm.voxel_size = ART[k][3] * (1.0 if level == 1 else 2.6); rm.use_smooth_shade = True
    dg = bpy.context.evaluated_depsgraph_get()
    me1 = bpy.data.meshes.new_from_object(o.evaluated_get(dg)); o.modifiers.clear(); o.data = me1
    n = len(me1.polygons) * 2
    if n > target:
        dm = o.modifiers.new("dec", "DECIMATE"); dm.decimate_type = "COLLAPSE"; dm.ratio = target / n; dm.use_collapse_triangulate = True
    me1.uv_layers.new(name="UVMap")
    dt = o.modifiers.new("uv", "DATA_TRANSFER"); dt.object = os_; dt.use_loop_data = True; dt.data_types_loops = {"UV"}; dt.loop_mapping = "POLYINTERP_NEAREST"
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me2)
    for x in (o, os_): bpy.data.objects.remove(x)
    for m_ in (me, me1, me2, me_s):
        if m_.users == 0: bpy.data.meshes.remove(m_)
    # (the decimation's own seams on thin parts, the horse's legs: one 30 mm slit, a folded sliver: closed, unfolded)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.002)
    bmesh.ops.holes_fill(bm, edges=[e for e in bm.edges if e.is_boundary], sides=0)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _unfold(bm)

def size(k):
    bm = _import(k)
    return (max(v.co.x for v in bm.verts) * 2, max(v.co.y for v in bm.verts) * 2, max(v.co.z for v in bm.verts))
