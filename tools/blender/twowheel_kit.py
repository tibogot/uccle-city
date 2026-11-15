"""TWO-WHEELER KIT: the shared helpers of the scripted two-wheelers (tools/blender/scooter.py, tools/blender/villo_ride.py;
tools/blender/motorbike.py keeps its own copies). Blender 5.0, headless. Not a model itself.

  geometry   loft / loft_x (superellipse lofts), tube (parallel transport), lathe, ellipsoid, bezier, smooth_path,
             cyl_between, along_y, box, plate, bar_between, mirror_y, far_wheel (the solid-disc far LOD stand-in)
  rig        set_origin, to_export (build X fwd / Y left / Z up -> glTF +Z fwd / +X left), gl()
  AO         gpu_setup (Cycles OPTIX), bake_vertex_ao: per-VERTEX AO into COLOR_0 "Col", each piece alone on a ground
             plane, cached per piece by a geometry hash (numpy foreach_get / foreach_set)
  previews   preview_vertex_ao (the materials read the vertex AO), pose_arm (the viewer's two-bone IK)
Build frame: X forward, Y left, Z up (as motorbike.py).
"""
import bpy, bmesh, math, os, hashlib, time
from mathutils import Vector, Matrix
import kitlib as K


def smooth(bm):
    for f in bm.faces: f.smooth = True
    return bm


def flat(bm):
    for f in bm.faces: f.smooth = False
    return bm


def sexp(c, p):
    return math.copysign(abs(c) ** (2.0 / p), c)


def loft(sections, n=24, cap=True):
    """sections: [(centre, U, V, Vb, p)] -> a closed lofted solid (ring = c + U sx + (V above | Vb below) sy)"""
    bm = bmesh.new(); rings = []
    for (c, U, V, Vb, p) in sections:
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            sx, sy = sexp(math.cos(a), p), sexp(math.sin(a), p)
            ring.append(bm.verts.new(Vector(c) + Vector(U) * sx + (Vector(V) if sy >= 0 else Vector(Vb)) * sy))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n): bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
    if cap:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)


def sample(keys, t):
    """Catmull-Rom through keys [(t, value...)] at t"""
    ts = [k[0] for k in keys]
    if t <= ts[0]: return keys[0][1:]
    if t >= ts[-1]: return keys[-1][1:]
    i = max(j for j in range(len(ts) - 1) if ts[j] <= t)
    p0, p1, p2, p3 = keys[max(0, i - 1)], keys[i], keys[i + 1], keys[min(len(keys) - 1, i + 2)]
    u = (t - p1[0]) / (p2[0] - p1[0])
    out = []
    for j in range(1, len(p1)):
        a, b, c, d = p0[j], p1[j], p2[j], p3[j]
        out.append(0.5 * ((2 * b) + (-a + c) * u + (2 * a - 5 * b + 4 * c - d) * u * u + (-a + 3 * b - 3 * c + d) * u ** 3))
    return tuple(out)


def loft_x(keys, stations=24, n=28, p_top=2.6, p_bot=3.4, y0=0.0, ends=True):
    """a solid along X: keys [(x, half width, z top, z bottom)], sections across Y / Z (top / bottom superellipses)"""
    keys = sorted(keys)
    xs = [k[0] for k in keys]
    bm = bmesh.new(); rings = []
    for i in range(stations + 1):
        t = xs[0] + (xs[-1] - xs[0]) * (0.5 - 0.5 * math.cos(math.pi * i / stations)) if ends else xs[0] + (xs[-1] - xs[0]) * i / stations
        hw, zt, zb = sample(keys, t)
        zc = (zt + zb) / 2
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            sy = math.sin(a)
            pp = p_top if sy >= 0 else p_bot
            sx, syy = sexp(math.cos(a), pp), sexp(sy, pp)
            z = zc + ((zt - zc) * syy if syy >= 0 else (zc - zb) * syy)
            ring.append(bm.verts.new((t, y0 + hw * sx, z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        for k in range(n): bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)


def tube(pts, radii, segs=14, cap=True, closed=False):
    """a round tube along a polyline, a radius per point (resampled if fewer), parallel-transport frame"""
    pts = [Vector(p) for p in pts]
    if not isinstance(radii, (list, tuple)): radii = [radii] * len(pts)
    if len(radii) != len(pts):
        m = len(radii) - 1; rr = []
        for i in range(len(pts)):
            f = i / max(1, len(pts) - 1) * m; j = min(m - 1, int(f)); u = f - j
            rr.append(radii[j] * (1 - u) + radii[j + 1] * u)
        radii = rr
    bm = bmesh.new(); n = len(pts); tans = []
    for i in range(n):
        a = pts[(i - 1) % n] if closed else pts[max(0, i - 1)]
        b = pts[(i + 1) % n] if closed else pts[min(n - 1, i + 1)]
        tans.append((b - a).normalized())
    ref = K.Z if abs(tans[0].dot(K.Z)) < 0.9 else Vector((1, 0, 0))
    nrm = tans[0].cross(ref).normalized()
    rings = []
    for i in range(n):
        if i > 0:
            ax = tans[i - 1].cross(tans[i])
            if ax.length > 1e-8:
                ang = math.acos(max(-1, min(1, tans[i - 1].dot(tans[i]))))
                nrm = (Matrix.Rotation(ang, 3, ax.normalized()) @ nrm).normalized()
        bi = tans[i].cross(nrm).normalized()
        rings.append([bm.verts.new(pts[i] + (nrm * math.cos(2 * math.pi * k / segs) + bi * math.sin(2 * math.pi * k / segs)) * radii[i]) for k in range(segs)])
    for i in range(n if closed else n - 1):
        a, b = rings[i], rings[(i + 1) % n]
        for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]])
    if cap and not closed:
        bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)


def bezier(p0, p1, p2, p3, n=12):
    p0, p1, p2, p3 = map(Vector, (p0, p1, p2, p3))
    return [((1 - t) ** 3) * p0 + 3 * ((1 - t) ** 2) * t * p1 + 3 * (1 - t) * t * t * p2 + t ** 3 * p3 for t in (i / n for i in range(n + 1))]


def smooth_path(pts, per=6):
    pts = [Vector(p) for p in pts]; out = []
    for i in range(len(pts) - 1):
        p0, p1, p2, p3 = pts[max(0, i - 1)], pts[i], pts[i + 1], pts[min(len(pts) - 1, i + 2)]
        for j in range(per):
            u = j / per
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u * u + (-p0 + 3 * p1 - 3 * p2 + p3) * u ** 3))
    out.append(pts[-1])
    return out


def ellipsoid(c, r, segs=20, rings=12, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=segs, v_segments=rings, radius=1.0)
    bmesh.ops.scale(bm, vec=r, verts=bm.verts)
    if rot is not None: bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=rot)
    bmesh.ops.translate(bm, vec=c, verts=bm.verts)
    return smooth(bm)


def lathe(profile, segs=48, closed=True):
    """revolve [(radius, y)] round the Y axis (a wheel's axle)"""
    bm = bmesh.new(); rings = []
    for k in range(segs):
        a = 2 * math.pi * k / segs; ca, sa = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * ca, y, r * sa)) for (r, y) in profile])
    m = len(profile)
    for k in range(segs):
        A, B = rings[k], rings[(k + 1) % segs]
        for j in range(m if closed else m - 1):
            j2 = (j + 1) % m
            try: bm.faces.new([A[j], A[j2], B[j2], B[j]])
            except ValueError: pass
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return smooth(bm)


def box(size, loc, bevel=0.004, rot=None, segs=2, flat_=False):
    bm = K.bm_box(*size, bevel=bevel, segs=segs)
    if flat_: flat(bm)
    bm.transform(Matrix.Translation(Vector(loc)) @ (rot.to_4x4() if rot is not None else Matrix()))
    return bm


def cyl_between(a, b, r, segs=20, bevel=0.0015, r2=None):
    if r < 0.02: bevel = min(bevel, 0.0)
    m, L = K.align_z(a, b)
    bm = K.bm_cyl(r, L, segs=segs, bevel=bevel, r2=r2)
    bm.transform(m)
    return bm


def along_y(r, y0, y1, x, z, segs=24, bevel=0.002):
    return cyl_between((x, y0, z), (x, y1, z), r, segs=segs, bevel=bevel)


def bar_between(a, b, w, t, bevel=0.003):
    m, L = K.align_z(a, b)
    bm = K.bm_box(w, t, L, bevel=bevel, segs=1)
    bm.transform(m @ Matrix.Translation((0, 0, L / 2)))
    return bm


def plate(outline_xz, y, thick, bevel=0.003):
    """a flat outline in the XZ plane extruded across Y (thick), centred on y"""
    bm = K.bm_profile_extrude(outline_xz, thick, bevel=bevel, segs=1)
    bm.transform(Matrix.Translation((0, y, 0)))
    return bm


def mirror_y(bm):
    bm.transform(Matrix.Scale(-1, 4, (0, 1, 0)))
    bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm


def far_wheel(name, R, W, rim_r, rubber, rim, ribs=0, hub_w=None):
    """the far-LOD stand-in of a wheel (origin = the axle, axle along Y): a coarse tyre (lathed 6-point section) and a
    CLOSED rim disc (dished, no holes); ribs > 0 embosses that many flat spoke ribs on both faces. ~150-300 tris."""
    P = K.Part(name)
    yb = 0.42 * W
    prof = [(rim_r + 0.010, yb), (R - 0.35 * (R - rim_r), 0.5 * W), (R, 0.28 * W), (R, -0.28 * W), (R - 0.35 * (R - rim_r), -0.5 * W), (rim_r + 0.010, -yb)]
    P.add_bm(lathe(prof, segs=20, closed=False), rubber)
    hw = hub_w if hub_w is not None else 0.3 * W
    disc = [(rim_r + 0.022, 0.80 * yb), (rim_r * 0.45, hw), (0.0, hw * 1.1), (0.0, -hw * 1.1), (rim_r * 0.45, -hw), (rim_r + 0.022, -0.80 * yb)]
    bm = lathe(disc, segs=20, closed=False)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    P.add_bm(bm, rim)
    for k in range(ribs):
        a = 2 * math.pi * k / ribs + 0.3
        for s in (1, -1):
            c0 = Vector((math.cos(a) * rim_r * 0.25, s * hw * 0.95, math.sin(a) * rim_r * 0.25))
            c1 = Vector((math.cos(a) * rim_r * 0.92, s * (yb * 0.9), math.sin(a) * rim_r * 0.92))
            P.add_bm(bar_between(c0, c1, rim_r * 0.12, 0.006, bevel=0.0), rim)
    return P.to_object(smooth_angle=40)


# ------------------------------------------------------------------------------------------------ rig / export frame
def set_origin(o, p):
    o.data.transform(Matrix.Translation(-Vector(p)))
    o.location = Vector(p)


R_EXPORT = Matrix.Rotation(-math.pi / 2, 4, "Z")      # build X forward -> Blender -Y (= glTF +Z)


def to_export(pieces):
    for o in pieces:
        o.data.transform(R_EXPORT)
        o.location = R_EXPORT @ o.location
        o.data.update()


def gl(v):
    """build frame (X fwd, Y left, Z up) -> glTF (x left, y up, z fwd)"""
    return [round(v[1], 5), round(v[2], 5), round(v[0], 5)]


# ------------------------------------------------------------------------------------------------ AO per vertex (GPU)
def gpu_setup(scn):
    scn.render.engine = "CYCLES"
    try:
        p = bpy.context.preferences.addons["cycles"].preferences
        p.compute_device_type = "OPTIX"; p.get_devices()
        for d in p.devices: d.use = (d.type == "OPTIX")
        scn.cycles.device = "GPU"
        print("cycles: OPTIX", [d.name for d in p.devices if d.use], flush=True)
    except Exception as e:
        print("cycles: CPU fallback", e, flush=True); scn.cycles.device = "CPU"


def piece_hash(o, samples, dist):
    import numpy as np
    me = o.data
    co = np.zeros(3 * len(me.vertices), dtype=np.float32); me.vertices.foreach_get("co", co)
    h = hashlib.sha1(); h.update(np.round(co, 5).tobytes()); h.update(str((samples, dist, "vertex", tuple(o.location))).encode())
    return h.hexdigest()[:16]


def bake_vertex_ao(objs, cache, bake=True, samples=32, dist=0.3, no_ground=("Arm", "Thigh", "Shin", "Pedal", "Cranks")):
    """COLOR_0 "Col" (POINT, grey) = AO of each piece ALONE on a ground plane (pieces built lying at their joint get
    none), cached in <cache>/<piece>_<hash>.npy; bake=False: the cache or white"""
    import numpy as np
    scn = bpy.context.scene
    os.makedirs(cache, exist_ok=True)
    if bake:
        gpu_setup(scn)
        scn.cycles.samples = samples
        if scn.world is None: scn.world = bpy.data.worlds.new("World")
        scn.world.light_settings.distance = dist
        scn.render.bake.target = "VERTEX_COLORS"
    gmat = bpy.data.materials.get("bake_ground") or bpy.data.materials.new("bake_ground")
    for o in objs:
        me = o.data
        attr = me.color_attributes.get("Col") or me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
        me.color_attributes.active_color = attr; me.attributes.active_color = attr
        cp = os.path.join(cache, f"{o.name}_{piece_hash(o, samples, dist)}.npy")
        n = len(me.vertices)
        if os.path.exists(cp) or not bake:
            v = np.load(cp) if os.path.exists(cp) else np.ones(n, dtype=np.float32)
            rgba = np.repeat(v[:, None], 4, axis=1).astype(np.float32); rgba[:, 3] = 1
            attr.data.foreach_set("color", rgba.ravel())
            print("  AO", "cached" if os.path.exists(cp) else "none", o.name, flush=True); continue
        t = time.time()
        for q in objs: q.hide_render = (q is not o)
        g = None
        if not o.name.startswith(no_ground):
            bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -0.001))
            g = bpy.context.active_object; g.data.materials.append(gmat)
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        c = np.zeros(n * 4, dtype=np.float32); attr.data.foreach_get("color", c)
        v = c.reshape(n, 4)[:, 0].copy()
        np.save(cp, v)
        if g: bpy.data.objects.remove(g)
        print(f"  AO {o.name} {time.time() - t:.1f}s (mean {v.mean():.2f})", flush=True)
    for q in objs: q.hide_render = False


def export_glb(objs, path):
    """GLB with COLOR_0 (the AO) and NO TEXCOORD_0 (the viewer's materials use no textures)"""
    for x in bpy.context.scene.objects: x.select_set(False)
    for o in objs:
        o.select_set(True)
        for uv in list(o.data.uv_layers): o.data.uv_layers.remove(uv)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=False, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                              export_extras=True, export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
    print("exported", path, os.path.getsize(path) // 1024, "KB", flush=True)


# ------------------------------------------------------------------------------------------------ previews
def preview_setup(sun_elev=36, sun_az=145, strength=3.5):
    """Cycles GPU, denoised; the materials multiply their preview colour by the vertex AO ("Col")"""
    scn = bpy.context.scene
    gpu_setup(scn)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    for m in K._MATS.values():
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        mul.inputs[6].default_value = (*m["preview"], 1); nt.links.new(vc.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], b.inputs["Base Color"])
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = strength; sun.angle = math.radians(1.0)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(90 - sun_elev), 0, math.radians(sun_az))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.25
    scn.cycles.samples = 48; scn.cycles.use_denoising = True
    try: scn.cycles.denoiser = "OPTIX"
    except Exception: pass
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.2
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    gm = bpy.data.materials.new("preview_ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.2, 0.19, 0.16, 1)
    bpy.ops.mesh.primitive_plane_add(size=400, location=(0, 0, -0.003)); bpy.context.active_object.data.materials.append(gm)
    return so, cam


def pose_segment(o, A, B):
    """place a segment built along +X from its joint (export frame) so it runs from A to B (build frame points)"""
    q = Vector((1, 0, 0)).rotation_difference((Vector(B) - Vector(A)).normalized())
    o.matrix_world = R_EXPORT @ Matrix.Translation(Vector(A)) @ q.to_matrix().to_4x4() @ R_EXPORT.inverted()


def two_bone(S, G, a, b, pole):
    """the elbow / knee E of a two-bone chain S -> E -> G (lengths a, b), bent toward pole"""
    S, G = Vector(S), Vector(G)
    D = G - S; dl = D.length; D.normalize()
    d = min(dl, a + b - 1e-3)
    x = (a * a - b * b + d * d) / (2 * d); h = math.sqrt(max(0, a * a - x * x))
    P = Vector(pole); P = (P - D * P.dot(D)).normalized()
    return S + D * x + P * h
