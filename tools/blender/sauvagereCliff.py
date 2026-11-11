"""THE SAUVAGERE CLIFF as ONE continuous scripted hero surface (round 4, after the owner's photo o01): the 1910 concrete
rockwork on the pond's east shore is one built structure of FUSED blocks, not loose rocks. Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/sauvagereCliff.py -- models/parkkit [--no-bake] [--previews]

Method:
  1. the measured mound: models/parkkit/sauvagere_site.json (UrbIS DTM 2021, 0.5 m, in the lab frame: water at y 0,
     the pond toward -z; Blender: X = lab x, Y = -lab z, Z = lab y) as a closed solid (the CORE), its top 0.25 m
     under the ground so that the blocks make the face;
  2. a 2D Voronoi of the face (jittered seeds, ANISOTROPIC: narrow cells = vertical slabs right of centre, x -9..-1 as
     o01; broad cells elsewhere), each cell inset 4-9 cm (the clefts) and extruded into a prism from under the water
     to above the slope (its front rises as a vertical face), its top a tilted plane (wedges), pushed in / out along
     the downhill direction, split by horizontal joints into 1-3 stacked blocks; cells on the upper edge broken and
     raised (a jagged crest), cells at the water flat and pushed out (ledges);
  3. union (voxel remesh 5 cm) -> the grotto carved at the water left of centre (o01) -> displacement (hand-worked
     concrete) = the SCULPT;
  4. a clean LOW-POLY (voxel 12 cm, smoothed, shrink-wrapped onto the sculpt), the hidden underwater / bottom / outer
     faces removed; named slots: rockwork_concrete (faces) and moss (up-facing ledges); UV0 metres; UV1 = the whole
     atlas (one object: full coverage); the sculpt baked onto it (tangent normals + AO, 2048);
  5. cut into 4 m CHUNKS along the shore (cliff_c0..), so each chunk takes its own LOD (tools/park_kit_pack.mjs cliff:
     meshoptimizer with the chunk borders locked: no cracks between neighbours at different LODs).
Output: models/parkkit/sauvagere_cliff.raw.glb, sauvagere_cliff.json, sauvagere_cliff_ao.png, sauvagere_cliff_nrm.jpg.
"""
import bpy, bmesh, math, os, sys, json, random, time
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/parkkit")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
T0 = time.time()
scn = K.reset()
rnd = random.Random(1910)
U = rnd.uniform

ROCK = K.mat("rockwork_concrete", (0.42, 0.39, 0.34), 0.88)
MOSS = K.mat("moss", (0.12, 0.17, 0.06), 0.95)
SITE = json.load(open(os.path.join(OUT, "sauvagere_site.json")))
X0, Z0, ST, COLS, ROWS, HG = SITE["x0"], SITE["z0"], SITE["step"], SITE["cols"], SITE["rows"], SITE["heights"]
EX = SITE["exedra"]["lab"]


def h(x, z):
    c = (x - X0) / ST; r = (z - Z0) / ST
    i = max(0, min(COLS - 2, int(math.floor(c)))); j = max(0, min(ROWS - 2, int(math.floor(r))))
    fc = min(1, max(0, c - i)); fr = min(1, max(0, r - j))
    H = lambda a, b: HG[b * COLS + a]
    return (H(i, j) * (1 - fc) + H(i + 1, j) * fc) * (1 - fr) + (H(i, j + 1) * (1 - fc) + H(i + 1, j + 1) * fc) * fr


def grad(x, z): return ((h(x + 0.5, z) - h(x - 0.5, z)), (h(x, z + 0.5) - h(x, z - 0.5)))
def B(x, z, y): return Vector((x, -z, y))          # lab -> Blender


# ------------------------------------------------------------------------------------------------ the face's extent
XMIN, XMAX = -15.0, 15.0
def face_band(x):
    """the water edge and the top of the face at lab x"""
    zw = -6.0
    while h(x, zw) < 0.12 and zw < 12: zw += 0.2
    zt = zw
    while zt < 14:
        gx, gz = grad(x, zt)
        if math.hypot(gx, gz) < 0.22 and h(x, zt) > 2.4: break
        zt += 0.2
    return zw, zt


# ------------------------------------------------------------------------------------------------ anisotropic Voronoi seeds
seeds = []
x = XMIN
while x < XMAX:
    slab = -9.0 < x < -1.0                                     # o01: vertical slabs right of centre
    dx = U(0.55, 0.85) if slab else U(1.3, 2.1)
    zw, zt = face_band(x)
    z = zw - 0.9
    while z < zt + 0.4:
        dz = U(1.1, 1.6) if slab else U(1.0, 1.8)
        seeds.append((x + U(-0.15, 0.15) * dx, z + U(-0.2, 0.2) * dz, slab, zw, zt))
        z += dz
    x += dx


def clip(poly, a, b):
    """keep the part of poly closer to a than to b (half-plane)"""
    mx, mz = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2; nx, nz = b[0] - a[0], b[1] - a[1]
    side = lambda p: (p[0] - mx) * nx + (p[1] - mz) * nz
    out = []
    for i in range(len(poly)):
        p, q = poly[i], poly[(i + 1) % len(poly)]
        sp, sq = side(p), side(q)
        if sp <= 0: out.append(p)
        if (sp <= 0) != (sq <= 0):
            t = sp / (sp - sq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out


def cell(i):
    a = seeds[i]
    poly = [(a[0] - 3, a[1] - 3), (a[0] + 3, a[1] - 3), (a[0] + 3, a[1] + 3), (a[0] - 3, a[1] + 3)]
    for j, b in enumerate(seeds):
        if j != i and abs(b[0] - a[0]) < 4.5 and abs(b[1] - a[1]) < 4.5:
            poly = clip(poly, a, b)
            if len(poly) < 3: return None
    return poly


def inset(poly, g):
    cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly)
    out = []
    for p in poly:
        dx, dz = p[0] - cx, p[1] - cz; L = math.hypot(dx, dz) or 1
        k = max(0.0, (L - g) / L); out.append((cx + dx * k, cz + dz * k))
    return out, (cx, cz)


def prism(bm, poly, y0, top, tilt_axis, tilt, push):
    """an extruded cell: base y0, top plane through (centroid, top) tilted by `tilt` about `tilt_axis` (2D)"""
    cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly)
    tx, tz = tilt_axis
    lo = [bm.verts.new(B(p[0] + push[0], p[1] + push[1], y0)) for p in poly]
    hi = []
    for p in poly:
        # height of the tilted plane: the distance across the tilt axis times tan(tilt)
        d = (p[0] - cx) * (-tz) + (p[1] - cz) * tx
        hi.append(bm.verts.new(B(p[0] + push[0], p[1] + push[1], top + d * math.tan(tilt))))
    n = len(poly)
    try:
        bm.faces.new(list(reversed(lo))); bm.faces.new(hi)
        for k in range(n): bm.faces.new([lo[k], lo[(k + 1) % n], hi[(k + 1) % n], hi[k]])
    except ValueError:
        pass


t = time.time()
bm = bmesh.new()
ncells = 0
for i, s in enumerate(seeds):
    poly = cell(i)
    if not poly: continue
    cx = sum(p[0] for p in poly) / len(poly); cz = sum(p[1] for p in poly) / len(poly)
    slab, zw, zt = s[2], s[3], s[4]
    hc = h(cx, cz)
    top_edge = cz > zt - 0.9
    if cz < zw - 1.4 or cz > zt + 0.6: continue
    if math.hypot(cx - EX[0], cz - EX[1]) < 3.4 and hc > 4.2: continue              # the exedra's platform stays clear
    gap = U(0.04, 0.09) if slab else U(0.05, 0.11)
    pin, (pcx, pcz) = inset(poly, gap)
    gx, gz = grad(cx, cz); gl = math.hypot(gx, gz) or 1
    dn = (-gx / gl, -gz / gl)                                                       # downhill (toward the pond)
    back = max(h(p[0], p[1]) for p in poly)
    water = hc < 0.5
    if water:          # ledges at the water line: low, flat, pushed out over the water
        top = U(0.15, 0.55); tilt = U(0.0, 0.08); push = U(0.2, 0.6)
    elif top_edge:     # the crest: broken, raised, jagged
        top = back + U(0.2, 0.9); tilt = U(0.25, 0.75); push = U(-0.1, 0.3)
    elif slab:         # vertical slabs: tall, nearly flat tops, some sticking out
        top = back + U(-0.1, 0.5); tilt = U(0.05, 0.35); push = U(-0.15, 0.45)
    else:              # broad blocks and slanted wedges
        top = back + U(-0.25, 0.35); tilt = U(0.1, 0.45); push = U(-0.2, 0.4)
    ax = (math.cos(U(0, math.pi)), math.sin(U(0, math.pi)))
    p2 = (dn[0] * push, dn[1] * push)
    # horizontal joints: 1-3 stacked blocks with 4 cm gaps, the upper ones a little offset
    zs = [-1.2]
    yy = 0.0
    while top - yy > 1.4 and len(zs) < 3 and rnd.random() < 0.7:
        yy += U(0.9, 1.7); zs.append(min(yy, top - 0.5))
    zs.append(top)
    for k in range(len(zs) - 1):
        off = (dn[0] * U(-0.12, 0.18), dn[1] * U(-0.12, 0.18)) if k else (0.0, 0.0)
        last = k == len(zs) - 2
        prism(bm, pin, zs[k] + (0.04 if k else 0.0), zs[k + 1], ax, tilt if last else U(0.0, 0.06), (p2[0] + off[0], p2[1] + off[1]))
    ncells += 1
# the CORE: the measured mound as a closed solid, 0.25 m under the ground
cx0, cx1, cz0, cz1 = XMIN - 1.0, XMAX + 1.0, -4.0, 12.0
nx, nz = int((cx1 - cx0) / 0.5), int((cz1 - cz0) / 0.5)
top = [[bm.verts.new(B(cx0 + i * 0.5, cz0 + j * 0.5, max(-1.0, h(cx0 + i * 0.5, cz0 + j * 0.5) - 0.25))) for i in range(nx + 1)] for j in range(nz + 1)]
bot = [[bm.verts.new(B(cx0 + i * 0.5, cz0 + j * 0.5, -1.25)) for i in range(nx + 1)] for j in range(nz + 1)]
for j in range(nz):
    for i in range(nx):
        bm.faces.new([top[j][i], top[j][i + 1], top[j + 1][i + 1], top[j + 1][i]])
        bm.faces.new([bot[j][i], bot[j + 1][i], bot[j + 1][i + 1], bot[j][i + 1]])
for i in range(nx):
    bm.faces.new([top[0][i], bot[0][i], bot[0][i + 1], top[0][i + 1]]); bm.faces.new([top[nz][i + 1], bot[nz][i + 1], bot[nz][i], top[nz][i]])
for j in range(nz):
    bm.faces.new([top[j + 1][0], bot[j + 1][0], bot[j][0], top[j][0]]); bm.faces.new([top[j][nx], bot[j][nx], bot[j + 1][nx], top[j + 1][nx]])
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
me = bpy.data.meshes.new("cliff_hp"); bm.to_mesh(me); bm.free()
hp = bpy.data.objects.new("cliff_hp", me); scn.collection.objects.link(hp)
sys.stdout.flush(); print(f"{ncells} cells, {len(seeds)} seeds, blocks built {time.time() - t:.1f}s")


def remesh(o, voxel):
    md = o.modifiers.new("rm", "REMESH"); md.mode = "VOXEL"; md.voxel_size = voxel; md.adaptivity = 0.0; md.use_smooth_shade = True
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier=md.name)


def fbm(p, oct=3):
    s, a, f = 0.0, 1.0, 1.0
    for _ in range(oct): s += a * noise.noise(p * f, noise_basis="PERLIN_NEW"); a *= 0.5; f *= 2.0
    return s


t = time.time()
remesh(hp, 0.08)
print(f"union remesh {time.time() - t:.1f}s, {len(hp.data.vertices)} verts")
# the grotto mouth at the water, left of centre (o01): an irregular hollow
gx_, gz_ = 3.5, face_band(3.5)[0] + 0.5
cut = []
for k in range(4):
    c = B(gx_ + U(-0.5, 0.5), gz_ + U(-0.1, 0.6), U(0.5, 1.0)); r = (U(0.7, 1.1), U(1.0, 1.5), U(0.7, 1.0))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=32, ring_count=16, radius=1.0, location=c)
    e = bpy.context.active_object; e.scale = r; cut.append(e)
for o in scn.objects: o.select_set(False)
for o in cut: o.select_set(True)
bpy.context.view_layer.objects.active = cut[0]; bpy.ops.object.transform_apply(scale=True); bpy.ops.object.join()
cj = bpy.context.active_object
md = hp.modifiers.new("b", "BOOLEAN"); md.operation = "DIFFERENCE"; md.object = cj; md.solver = "MANIFOLD"   # (EXACT takes minutes on the 5 cm union)
bpy.context.view_layer.objects.active = hp; bpy.ops.object.modifier_apply(modifier="b"); bpy.data.objects.remove(cj)
remesh(hp, 0.05)
# hand-worked concrete: bulges, lumps, faint striations
bmh = bmesh.new(); bmh.from_mesh(hp.data)
bmesh.ops.smooth_vert(bmh, verts=bmh.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bmh.normal_update()
sd = Vector((3.1, 7.7, 1.9))
for v in bmh.verts:
    p, n = v.co, v.normal
    steep = max(0.0, 1.0 - abs(n.z) * 1.3)
    d = 0.04 * fbm(p * 1.2 + sd) + 0.014 * fbm(p * 4.5 + sd * 1.3)
    d -= steep * 0.006 * (0.5 + 0.5 * math.cos(2 * math.pi * (p.z + 0.03 * noise.noise(p * 2 + sd)) / 0.22)) ** 2
    v.co += n * d
bmh.to_mesh(hp.data); bmh.free(); hp.data.shade_smooth()
print(f"sculpt {K.tris(hp)} tris {time.time() - T0:.0f}s")

# ------------------------------------------------------------------------------------------------ the low-poly
lp = hp.copy(); lp.data = hp.data.copy(); lp.name = "cliff"; scn.collection.objects.link(lp)
remesh(lp, 0.15)
bml = bmesh.new(); bml.from_mesh(lp.data)
bmesh.ops.smooth_vert(bml, verts=bml.verts, factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bml.to_mesh(lp.data); bml.free()
sw = lp.modifiers.new("sw", "SHRINKWRAP"); sw.target = hp; sw.wrap_method = "NEAREST_SURFACEPOINT"
bpy.context.view_layer.objects.active = lp; bpy.ops.object.modifier_apply(modifier="sw")
bml = bmesh.new(); bml.from_mesh(lp.data); bml.normal_update()
# only what is under the water goes (the ends and the back stay closed: no open edge to see through, checker "leak")
drop = [f for f in bml.faces if f.calc_center_median().z < -0.45 or (f.normal.z < -0.7 and f.calc_center_median().z < 0.2)]
bmesh.ops.delete(bml, geom=drop, context="FACES")
bmesh.ops.delete(bml, geom=[v for v in bml.verts if not v.link_faces], context="VERTS")
bmesh.ops.holes_fill(bml, edges=[e for e in bml.edges if e.is_boundary], sides=10)     # pinholes of the remesh
# relax the shrink-wrap's folds (the checker's "streak": stretched folded triangles), then hard edges over 60 deg,
# all on the WHOLE surface before it is cut (the chunks share their border normals)
for _ in range(2):
    bmesh.ops.smooth_vert(bml, verts=[v for v in bml.verts if not v.is_boundary], factor=0.35, use_axis_x=True, use_axis_y=True, use_axis_z=True)
bml.to_mesh(lp.data); bml.free()
lp.data.shade_smooth()
lp.data.set_sharp_from_angle(angle=math.radians(60))
lp.data.materials.clear(); lp.data.materials.append(ROCK)
# MOSS is a mask layer of the rockwork slot (COLOR_0.g), not a second primitive: a separate moss primitive gave the
# LODs slits and crossings along the slot boundary (checker); the material blends the "moss" look in by the mask
# masks: cavity / layer / convexity (data for the material)
bmc = bmesh.new(); bmc.from_mesh(lp.data); bmc.normal_update()
cav = {}
for v in bmc.verts:
    s_ = 0.0
    for e in v.link_edges:
        w = e.other_vert(v).co - v.co; s_ += w.dot(v.normal) / max(w.length, 1e-4)
    cav[v.index] = s_ / max(1, len(v.link_edges))
bmc.free()
col = lp.data.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
data = []
for li in range(len(lp.data.loops)):
    vi = lp.data.loops[li].vertex_index; c = cav[vi]; co = lp.data.vertices[vi].co
    nz = lp.data.vertices[vi].normal.z
    g = max(0.0, min(1.0, (nz - 0.55) / 0.3)) * (1.0 if co.z > 0.35 else 0.0)           # moss mask: up-facing ledges
    data += [max(0, min(1, 0.5 + c * 2.2)), g, max(0, min(1, -c * 3.0)), 1.0]
col.data.foreach_set("color", data)
K.smart_uv_metres(lp)
K.lightmap_uv(lp, (0.0, 0.0, 1.0), margin=0.002)
print(f"low-poly {K.tris(lp)} tris {time.time() - T0:.0f}s")

# ------------------------------------------------------------------------------------------------ bake (sculpt -> low-poly)
ao_png = os.path.join(OUT, "sauvagere_cliff_ao.png"); nrm_jpg = os.path.join(OUT, "sauvagere_cliff_nrm.jpg")
if BAKE:
    scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 48
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 1.6
    imgs = {"NORMAL": bpy.data.images.new("cliff_nrm", 2048, 2048, alpha=False), "AO": bpy.data.images.new("cliff_ao", 2048, 2048, alpha=False)}
    for im in imgs.values(): im.colorspace_settings.name = "Non-Color"
    for flag in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter"): setattr(lp, flag, False)
    for kind in ("NORMAL", "AO"):
        for m in (ROCK,):
            n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = imgs[kind]; n.name = "BAKE"; m.node_tree.nodes.active = n
        for o in scn.objects: o.select_set(False)
        hp.select_set(True); lp.select_set(True); bpy.context.view_layer.objects.active = lp
        lp.data.uv_layers.active = lp.data.uv_layers["Lightmap"]
        kw = dict(type=kind, use_selected_to_active=True, cage_extrusion=0.08, max_ray_distance=0.25, uv_layer="Lightmap", margin=6, use_clear=True)
        if kind == "NORMAL": kw["normal_space"] = "TANGENT"
        t = time.time(); bpy.ops.object.bake(**kw); print(f"  baked {kind} {time.time() - t:.0f}s")
        lp.data.uv_layers.active = lp.data.uv_layers["UVMap"]
        for m in (ROCK,): m.node_tree.nodes.remove(m.node_tree.nodes["BAKE"])
    for flag in ("visible_camera", "visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter"): setattr(lp, flag, True)
    st = scn.render.image_settings
    st.file_format = "JPEG"; st.color_mode = "RGB"; st.quality = 92; imgs["NORMAL"].save_render(nrm_jpg, scene=scn)
    st.file_format = "PNG"; st.color_mode = "BW"; st.color_depth = "8"; st.compression = 90; imgs["AO"].save_render(ao_png, scene=scn)

# ------------------------------------------------------------------------------------------------ chunks along the shore
CH = 4.0
edges = [XMIN - 1 + CH * k for k in range(1, int((XMAX - XMIN + 2) / CH))]
for o in scn.objects: o.select_set(False)
lp.select_set(True); bpy.context.view_layer.objects.active = lp
bpy.ops.object.mode_set(mode="EDIT")
bme = bmesh.from_edit_mesh(lp.data)
for x in edges:
    bmesh.ops.bisect_plane(bme, geom=list(bme.verts) + list(bme.edges) + list(bme.faces), plane_co=(x, 0, 0), plane_no=(1, 0, 0))
bmesh.update_edit_mesh(lp.data)
bpy.ops.object.mode_set(mode="OBJECT")
chunks = []
for k in range(len(edges) + 1):
    a = edges[k - 1] if k else -1e9; b = edges[k] if k < len(edges) else 1e9
    for o in scn.objects: o.select_set(False)
    lp.select_set(True); bpy.context.view_layer.objects.active = lp
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="DESELECT")
    bme = bmesh.from_edit_mesh(lp.data)
    n = 0
    for f in bme.faces:
        cx = f.calc_center_median().x
        if a <= cx < b: f.select_set(True); n += 1
    bmesh.update_edit_mesh(lp.data)
    if n and k < len(edges): bpy.ops.mesh.separate(type="SELECTED")
    bpy.ops.object.mode_set(mode="OBJECT")
for o in scn.objects:
    if o.type == "MESH" and (o.name.startswith("cliff.") or o.name == "cliff") and len(o.data.polygons):
        chunks.append(o)
chunks.sort(key=lambda o: sum(v.co.x for v in o.data.vertices) / max(1, len(o.data.vertices)))
for i, o in enumerate(chunks): o.name = f"cliff_c{i}"; o.data.name = o.name
print("chunks", [(o.name, K.tris(o)) for o in chunks])

K.export_glb(chunks, os.path.join(OUT, "sauvagere_cliff.raw.glb"), colors=True)
info = {
    "asset": "Parc de la Sauvagere: the concrete rockwork cliff as one scripted hero surface (tools/blender/sauvagereCliff.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles_raw": K.tris(o),
                        "size_m": [round(o.dimensions.x, 2), round(o.dimensions.y, 2), round(o.dimensions.z, 2)]} for o in chunks},
    "sculpt_triangles": K.tris(hp), "cells": ncells,
    "slots": {"rockwork_concrete": "the 1910 cement rockwork (grey-brown weathered concrete); its MOSS layer (named 'moss') by the mask in COLOR_0.g"},
    "attributes": {"COLOR_0": "r cavity, g MOSS mask (up-facing ledges), b convexity", "TEXCOORD_0": "metres", "TEXCOORD_1": "the cliff's own atlas (full): AO + tangent normals"},
    "frame": "the LAB frame of models/parkkit/sauvagere_site.json (water y 0, the pond toward -z); instances at identity",
}
json.dump(info, open(os.path.join(OUT, "sauvagere_cliff.json"), "w"), indent=1)
print(f"done {time.time() - T0:.0f}s")
