"""KIT HELPERS shared by tools/blender/playgroundKit.py and tools/blender/rockKit.py (Blender 5.0, run headless with
--factory-startup). Not a kit itself.

What every kit piece gets here (the project's asset rules, docs/BLENDER.md + HANDOFF):
  - NAMED material slots (the shared library's names or new ones proposed in the kit's notes), never a baked colour:
    the colours set on the Blender materials are for the preview renders only (the viewer maps slots by NAME);
  - TEXCOORD_0 in metres: per face, u along the part's GRAIN axis (wood grain, a tube's length), v across it;
    organic meshes (rocks): smart-projected islands scaled back to metres;
  - TEXCOORD_1: the AO lightmap, one atlas per kit (each piece a rectangle of it), baked by Cycles with a ground plane
    under the piece (contact shadow) and the other pieces far away;
  - one object per piece (origin = the piece's footprint centre on the ground, +Z up in Blender = +Y in glTF);
    optional "<piece>__far" objects: hand-made stand-ins for parts meshoptimizer cannot reduce (chains, nets),
    used by the LODs instead of the simplified originals (tools/park_kit_pack.mjs).
LODs are NOT made here (no Blender decimate): tools/park_kit_pack.mjs builds them with meshoptimizer.
"""
import bpy, bmesh, math, os, json, time
from mathutils import Vector, Matrix, noise

Z = Vector((0, 0, 1))


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    scn.unit_settings.system = "METRIC"
    return scn


# ------------------------------------------------------------------------------------------------ materials (slots)
_MATS = {}


def mat(name, preview=(0.5, 0.5, 0.5), rough=0.8, metal=0.0):
    """the named slot (created once); preview colour / roughness are for Blender previews only"""
    m = _MATS.get(name)
    if m: return m
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*preview, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    m["preview"] = list(preview)
    _MATS[name] = m
    return m


# ------------------------------------------------------------------------------------------------ the mesh builder
class Part:
    """a growing bmesh for one piece; every face carries (slot, grain axis) for its UVs"""
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.slot_layer = self.bm.faces.layers.int.new("slot")
        self.gx = self.bm.faces.layers.float_vector.new("grain")
        self.slots = []

    def slot(self, m):
        if m.name not in self.slots: self.slots.append(m.name)
        return self.slots.index(m.name)

    def add_bm(self, other, m, grain=None, matrix=None):
        """merge a temporary bmesh (its faces get slot m and the grain axis, in the final frame)"""
        if matrix is not None: other.transform(matrix)
        si = self.slot(m)
        g = (matrix.to_3x3() @ Vector(grain)).normalized() if (grain is not None and matrix is not None) else (Vector(grain).normalized() if grain is not None else Vector((0, 0, 0)))
        vmap = {}
        for v in other.verts:
            vmap[v] = self.bm.verts.new(v.co)
        for f in other.faces:
            try:
                nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError:
                continue
            nf[self.slot_layer] = si
            nf[self.gx] = g
            nf.smooth = f.smooth
        other.free()

    def to_object(self, smooth_angle=35, coll=None):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=0.0002)
        self.bm.normal_update()
        self.bm.to_mesh(me)
        slots = me.polygons
        for n in self.slots: me.materials.append(_MATS[n])
        idx = [0] * len(me.polygons); me.attributes["slot"].data.foreach_get("value", idx)
        me.polygons.foreach_set("material_index", idx)
        o = bpy.data.objects.new(self.name, me)
        (coll or bpy.context.scene.collection).objects.link(o)
        me.shade_smooth()
        me.set_sharp_from_angle(angle=math.radians(smooth_angle))
        grain_uvs(me)
        me.attributes.remove(me.attributes["slot"])
        self.bm.free()
        return o


def grain_uvs(me):
    """TEXCOORD_0 in metres: u along the face's grain axis, v across (on the face plane); faces without a grain
    (or end grain): the town hall's rule (walls: u horizontal, v up; floors: x / y)"""
    uv = me.uv_layers.new(name="UVMap")
    g = [0.0] * (3 * len(me.polygons))
    me.attributes["grain"].data.foreach_get("vector", g)
    d = [0.0] * (2 * len(me.loops))
    for p in me.polygons:
        n = p.normal
        ga = Vector(g[3 * p.index: 3 * p.index + 3])
        if ga.length > 0.5 and abs(n.dot(ga)) < 0.7:
            t = (ga - n * n.dot(ga)).normalized(); b = n.cross(t).normalized()
        elif abs(n.z) < 0.75:
            t = Z.cross(n).normalized(); b = Z
        else:
            t = Vector((1, 0, 0)); b = n.cross(t).normalized()
        for li in p.loop_indices:
            co = me.vertices[me.loops[li].vertex_index].co
            d[2 * li] = co.dot(t); d[2 * li + 1] = co.dot(b)
    uv.data.foreach_set("uv", d)
    me.attributes.remove(me.attributes["grain"])


# ------------------------------------------------------------------------------------------------ primitives (bmesh, bevelled)
def bm_box(sx, sy, sz, bevel=0.0, segs=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=min(bevel, 0.49 * min(sx, sy, sz)), segments=segs, profile=0.5, affect="EDGES", clamp_overlap=True)
    for f in bm.faces: f.smooth = True
    return bm


def bm_cyl(r, h, segs=16, bevel=0.0, bsegs=2, cap=True, r2=None):
    """a cylinder along +Z from 0 to h (r2: top radius)"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=cap, cap_tris=False, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
    bmesh.ops.translate(bm, vec=(0, 0, h / 2), verts=bm.verts)
    if bevel > 0 and cap:
        ring = [e for e in bm.edges if all(abs(v.co.z) < 1e-5 or abs(v.co.z - h) < 1e-5 for v in e.verts) and abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        bmesh.ops.bevel(bm, geom=ring, offset=bevel, segments=bsegs, profile=0.5, affect="EDGES", clamp_overlap=True)
    for f in bm.faces: f.smooth = True
    return bm


def bm_tube_path(pts, r, segs=8, closed=False, cap=True):
    """a round tube swept along a polyline (parallel-transported frame), for rails, chains' far stand-ins, ropes"""
    bm = bmesh.new()
    pts = [Vector(p) for p in pts]
    n = len(pts)
    tans = []
    for i in range(n):
        a = pts[max(0, i - 1)] if not closed else pts[(i - 1) % n]
        b = pts[min(n - 1, i + 1)] if not closed else pts[(i + 1) % n]
        tans.append((b - a).normalized())
    ref = Z if abs(tans[0].dot(Z)) < 0.9 else Vector((1, 0, 0))
    nrm = tans[0].cross(ref).normalized()
    rings = []
    for i in range(n):
        if i > 0:
            t0, t1 = tans[i - 1], tans[i]
            ax = t0.cross(t1)
            if ax.length > 1e-8:
                ang = math.acos(max(-1, min(1, t0.dot(t1))))
                nrm = (Matrix.Rotation(ang, 3, ax.normalized()) @ nrm).normalized()
        bi = tans[i].cross(nrm).normalized()
        ring = [bm.verts.new(pts[i] + (nrm * math.cos(2 * math.pi * k / segs) + bi * math.sin(2 * math.pi * k / segs)) * r) for k in range(segs)]
        rings.append(ring)
    m = n if closed else n - 1
    for i in range(m):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(segs):
            f = bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]]); f.smooth = True
    if cap and not closed:
        f = bm.faces.new(list(reversed(rings[0]))); f.smooth = False
        f = bm.faces.new(rings[-1]); f.smooth = False
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_torus(R, r, segR=12, segr=6, sx=1.0):
    """a torus in the XZ plane (a chain link when sx > 1 stretches it along X)"""
    bm = bmesh.new()
    rings = []
    for i in range(segR):
        a = 2 * math.pi * i / segR
        c = Vector((math.cos(a) * R * sx, 0, math.sin(a) * R))
        out = Vector((math.cos(a), 0, math.sin(a)))
        rings.append([bm.verts.new(c + (out * math.cos(2 * math.pi * k / segr) + Vector((0, 1, 0)) * math.sin(2 * math.pi * k / segr)) * r) for k in range(segr)])
    for i in range(segR):
        a, b = rings[i], rings[(i + 1) % segR]
        for k in range(segr):
            f = bm.faces.new([a[k], b[k], b[(k + 1) % segr], a[(k + 1) % segr]]); f.smooth = True
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def bm_profile_extrude(outline, depth, bevel=0.0, segs=2):
    """a flat 2D outline (XZ plane, CCW seen from -Y) extruded along +Y by depth, edges bevelled (a board)"""
    bm = bmesh.new()
    vs = [bm.verts.new((x, 0, z)) for x, z in outline]
    f = bm.faces.new(vs)
    r = bmesh.ops.extrude_face_region(bm, geom=[f])
    nv = [e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)]
    bmesh.ops.translate(bm, vec=(0, depth, 0), verts=nv)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bevel > 0:
        cap_edges = [e for e in bm.edges if abs(e.verts[0].co.y - e.verts[1].co.y) < 1e-6]
        bmesh.ops.bevel(bm, geom=cap_edges, offset=bevel, segments=segs, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.translate(bm, vec=(0, -depth / 2, 0), verts=bm.verts)
    for f in bm.faces: f.smooth = True
    return bm


def M(loc=(0, 0, 0), rot=(0, 0, 0), scale=None):
    m = Matrix.Translation(Vector(loc)) @ Matrix.Rotation(rot[2], 4, "Z") @ Matrix.Rotation(rot[1], 4, "Y") @ Matrix.Rotation(rot[0], 4, "X")
    if scale is not None: m = m @ Matrix.Diagonal((*scale, 1))
    return m


def align_z(a, b):
    """matrix that maps +Z (0..1 along it) onto the segment a->b (length scale NOT applied)"""
    a, b = Vector(a), Vector(b)
    d = (b - a); L = d.length; d.normalize()
    q = Z.rotation_difference(d)
    return Matrix.Translation(a) @ q.to_matrix().to_4x4(), L


# ------------------------------------------------------------------------------------------------ lightmap atlas + AO bake
def atlas_layout(objs, margin=0.004):
    """shelf-pack one square per object, side ~ sqrt(surface area) (wt: obj['ao_weight'] scales it); returns {name: (x, y, s)}"""
    items = []
    for o in objs:
        a = sum(p.area for p in o.data.polygons) * o.get("ao_weight", 1.0)
        items.append([o.name, math.sqrt(max(a, 0.01))])
    total = sum(s * s for _, s in items)
    k = 0.93 / math.sqrt(total)
    for it in items: it[1] *= k
    while True:
        out, x, y, row = {}, 0.0, 0.0, 0.0
        ok = True
        for name, s in sorted(items, key=lambda t: -t[1]):
            if x + s > 1.0 + 1e-9: x = 0.0; y += row + margin; row = 0.0
            if y + s > 1.0 + 1e-9: ok = False; break
            out[name] = (x, y, s); x += s + margin; row = max(row, s)
        if ok: return out
        for it in items: it[1] *= 0.97


def lightmap_uv(o, region, margin=0.002):
    """TEXCOORD_1: the piece's UV0 islands (same seams: LOD seams stay consistent), averaged and packed into region"""
    me = o.data
    d = [0.0] * (2 * len(me.loops)); me.uv_layers["UVMap"].data.foreach_get("uv", d)
    me.uv_layers.new(name="Lightmap")
    lm = me.uv_layers["Lightmap"]                      # (a new layer re-allocates: fetch by name after it)
    lm.data.foreach_set("uv", d)
    me.uv_layers.active = lm
    for x in bpy.context.scene.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    try: bpy.ops.uv.pack_islands(rotate=True, margin=margin, shape_method="CONCAVE", margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    x0, y0, s = region
    lm = me.uv_layers["Lightmap"]
    d = [0.0] * (2 * len(me.loops)); lm.data.foreach_get("uv", d)
    for i in range(0, len(d), 2): d[i] = x0 + d[i] * s; d[i + 1] = y0 + d[i + 1] * s
    lm.data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]


def smart_uv_metres(o, angle=66):
    """UV0 for organic meshes: smart-projected islands scaled to metres (texel = 1 m per UV unit)"""
    me = o.data
    if "UVMap" not in me.uv_layers: me.uv_layers.new(name="UVMap")
    me.uv_layers.active = me.uv_layers["UVMap"]
    for x in bpy.context.scene.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(angle), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode="OBJECT")
    uv = me.uv_layers["UVMap"].data
    a3 = sum(p.area for p in me.polygons)
    a2 = 0.0
    for p in me.polygons:
        li = list(p.loop_indices)
        for j in range(1, len(li) - 1):
            a, b, c = uv[li[0]].uv, uv[li[j]].uv, uv[li[j + 1]].uv
            a2 += abs((b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x)) / 2
    k = math.sqrt(a3 / max(a2, 1e-9))
    d = [0.0] * (2 * len(me.loops)); me.uv_layers["UVMap"].data.foreach_get("uv", d)
    me.uv_layers["UVMap"].data.foreach_set("uv", [v * k for v in d])


def bake_ao(objs, out_png, px=2048, samples=64, distance=1.0, spacing=14.0):
    """one AO atlas for all objs (TEXCOORD_1 regions): each piece moved to its own spot on a ground plane, alone"""
    scn = bpy.context.scene
    scn.render.engine = "CYCLES"
    scn.cycles.device = "CPU"
    scn.cycles.samples = samples
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = distance
    img = bpy.data.images.new(os.path.basename(out_png).split(".")[0], px, px, alpha=False, float_buffer=False)
    img.colorspace_settings.name = "Non-Color"
    gmat = bpy.data.materials.new("bake_ground"); gmat.use_nodes = True
    mats = {m for o in objs for m in o.data.materials}
    for m in mats:
        nt = m.node_tree
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = img; n.name = "AO_BAKE"; nt.nodes.active = n
    home = {o.name: o.location.copy() for o in objs}
    cols = max(1, int(math.ceil(math.sqrt(len(objs)))))
    gplanes = []
    for i, o in enumerate(objs):
        o.location = Vector(((i % cols) * spacing, (i // cols) * spacing, 0))
        bpy.ops.mesh.primitive_plane_add(size=spacing * 0.8, location=(o.location.x, o.location.y, -0.002))
        g = bpy.context.active_object; g.data.materials.append(gmat); g.name = "bake_ground_" + o.name; gplanes.append(g)
    t = time.time()
    first = True
    for o in objs:
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        o.data.uv_layers.active = o.data.uv_layers["Lightmap"]
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=4, use_clear=first)
        o.data.uv_layers.active = o.data.uv_layers["UVMap"]
        first = False
        print(f"  AO {o.name} {time.time() - t:.0f}s")
    # 8-bit grey PNG (the AO is one channel)
    st = scn.render.image_settings
    st.file_format = "PNG"; st.color_mode = "BW"; st.color_depth = "8"; st.compression = 90
    img.save_render(out_png, scene=scn)
    for g in gplanes: bpy.data.objects.remove(g)
    for o in objs: o.location = home[o.name]
    for m in mats: m.node_tree.nodes.remove(m.node_tree.nodes["AO_BAKE"])
    return img


def export_glb(objs, path, colors=False):
    for x in bpy.context.scene.objects: x.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    kw = dict(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
              export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE", export_extras=True)
    if colors: kw.update(export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
    else: kw.update(export_vertex_color="NONE")
    bpy.ops.export_scene.gltf(**kw)
    print("exported", path, os.path.getsize(path) // 1024, "KB")


def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)


# ------------------------------------------------------------------------------------------------ previews (Cycles, AO multiplied in)
def preview_setup(ao_img, sun_elev=35, sun_az=130, strength=3.5):
    scn = bpy.context.scene
    for m in _MATS.values():
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        mul.inputs[6].default_value = (*m["preview"], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], b.inputs["Base Color"])
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = strength; sun.angle = math.radians(1.0)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(90 - sun_elev), 0, math.radians(sun_az))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.25
    scn.cycles.samples = 48; scn.cycles.use_denoising = True
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.2
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    gm = bpy.data.materials.new("preview_ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.19, 0.16, 1)
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.003)); bpy.context.active_object.data.materials.append(gm)
    return so, cam


def render(cam, path, pos, tgt, lens=35, res=(1200, 800)):
    scn = bpy.context.scene
    cam.location = Vector(pos)
    cam.rotation_euler = (Vector(tgt) - cam.location).to_track_quat("-Z", "Y").to_euler()
    cam.data.lens = lens
    scn.render.resolution_x, scn.render.resolution_y = res
    scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 88
    scn.render.filepath = path
    t = time.time(); bpy.ops.render.render(write_still=True); print("render", os.path.basename(path), f"{time.time() - t:.0f}s")
