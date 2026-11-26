"""THE VILLA'S BED v3 (claude/villa3, docs/VILLA_V3_PLAN.md item 1): the owner's "better bed".

Round 2's bed was five inflated boxes (a frame, a mattress slab, a flat duvet plate, two pillows) with a stiff leather
"throw" slab floating 10 cm over it. This one is built like a real made bed, all in code:

  - a recessed dark plinth (a 6 cm shadow gap under the bed), an upholstered platform and a tall upholstered headboard
    (rounded soft boxes: bouclé), a mattress in a white fitted sheet;
  - the DUVET, its TURNED-DOWN top and a knitted THROW are Blender CLOTH SIMULATIONS (headless, scripted): grids
    dropped onto colliders that are the very same mattress / platform / headboard meshes, so they drape over the edges
    and fold where they meet; then thickened (solidify: a 3 cm duvet, a 1.2 cm throw) and decimated to budget, their UV
    kept in metres (the fabric scans tile on it);
  - pillows: the pinched-corner pillow surface (the two faces meet at a welted seam, the corners thin out), Euro
    pillows standing against the headboard, sleeping pillows leaning on them, two small cushions (master);
  - every part in the `props` slot with its fabric code (the viewer's TSL picks the scan layer and the tint: no colour
    baked); the light is the cell's Cycles bake per corner, as every interior surface.

    parts = bed_v3(width, seed=0, master=True)   -> [(bmesh in the KIT frame: x right, y up, z = the foot), slot, code]
Budget (docs/VILLA_V3_PLAN.md): ~9-10k triangles per bed, no new draw (props is one slot)."""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
import interior_kit as K

# the props codes (viewer/villa/villaInterior.js PROPS: tint + scan layer per code)
SHEET, DUVET, THROW, BOUCLE, PILLOW, EURO, CUSHION, LEATHER, BASE = 3, 4, 6, 7, 8, 9, 10, 11, 12
L = 2.15                       # mattress length (m)
TOP = 0.52                     # mattress top above the floor

R_KIT_INV = Matrix(((1, 0, 0, 0), (0, 0, 1, 0), (0, -1, 0, 0), (0, 0, 0, 1)))    # Blender (X, Y, Z) -> kit (x, y, z) = (X, Z, -Y)
R_KIT = R_KIT_INV.inverted()

def _obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.update()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    return o

def _kit_to_blender(bm):
    bmesh.ops.transform(bm, matrix=R_KIT, verts=bm.verts)
    return bm

def _grid(name, sx, sy, step, z, x0=0.0, y0=0.0, rot=0.0):
    """a cloth grid sx * sy (Blender X, Y) at height z, centred at (x0, y0), turned by rot (deg) round Z; UV in metres"""
    nx, ny = max(2, round(sx / step)), max(2, round(sy / step))
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    vs = [[bm.verts.new((-sx / 2 + sx * i / nx, -sy / 2 + sy * j / ny, 0.0)) for i in range(nx + 1)] for j in range(ny + 1)]
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((vs[j][i], vs[j][i + 1], vs[j + 1][i + 1], vs[j + 1][i]))
            for l in f.loops: l[uvl].uv = (l.vert.co.x + sx / 2, l.vert.co.y + sy / 2)
    M = Matrix.Translation((x0, y0, z)) @ Matrix.Rotation(math.radians(rot), 4, "Z")
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return _obj(name, bm)

def _collider(o, friction=30.0):
    o.modifiers.new("col", "COLLISION")
    o.collision.thickness_outer = 0.004; o.collision.cloth_friction = friction; o.collision.damping = 0.9
    return o

def _cloth(o, mass=0.35, bend=0.8, stiff=18.0, frames=70, pin_head=0.0, self_col=True):
    """pin_head > 0: the grid's vertices within pin_head of its head edge (Blender +Y) are pinned where they start (a
    duvet's top edge lies under the pillows: without it the foot's overhang drags the whole duvet off the bed)"""
    if pin_head > 0:
        vg = o.vertex_groups.new(name="pin"); ymax = max(v.co.y for v in o.data.vertices)
        vg.add([v.index for v in o.data.vertices if v.co.y > ymax - pin_head], 1.0, "REPLACE")
    md = o.modifiers.new("cloth", "CLOTH"); s = md.settings
    if pin_head > 0: s.vertex_group_mass = "pin"
    s.quality = 8; s.mass = mass; s.tension_stiffness = stiff; s.compression_stiffness = stiff; s.shear_stiffness = stiff * 0.5
    s.bending_stiffness = bend; s.air_damping = 2.0
    cs = md.collision_settings; cs.collision_quality = 4; cs.distance_min = 0.004
    cs.use_self_collision = self_col
    if self_col: cs.self_distance_min = 0.005; cs.self_friction = 10.0
    md.point_cache.frame_start = 1; md.point_cache.frame_end = frames
    return md

def _simulate(frames):
    scn = bpy.context.scene
    scn.frame_start = 1; scn.frame_end = frames
    for f in range(1, frames + 1): scn.frame_set(f)

def _bake_result(o, thick, keep_tris):
    """the simulated cloth at the last frame -> solidified (thick, outward), decimated to keep_tris -> bmesh (Blender)"""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
    tmp = bpy.data.objects.new(o.name + "_baked", me); bpy.context.scene.collection.objects.link(tmp)
    # (a light relax first: the corner's micro-crumples, folded over within a few mm, became flipped slivers after the
    # solidify + decimate: mesh audit `flipped` at the duvet's foot corners, claude/villa3)
    rx = tmp.modifiers.new("relax", "SMOOTH"); rx.factor = 0.5; rx.iterations = 3
    sm = tmp.modifiers.new("sol", "SOLIDIFY"); sm.thickness = thick; sm.offset = 1.0; sm.use_rim = True; sm.use_even_offset = True
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    tris = sum(len(p.vertices) - 2 for p in me2.polygons)
    tmp2 = bpy.data.objects.new(o.name + "_dec", me2); bpy.context.scene.collection.objects.link(tmp2)
    if tris > keep_tris:
        dm = tmp2.modifiers.new("dec", "DECIMATE"); dm.decimate_type = "COLLAPSE"; dm.ratio = keep_tris / tris; dm.use_collapse_triangulate = True
    dg = bpy.context.evaluated_depsgraph_get()
    me3 = bpy.data.meshes.new_from_object(tmp2.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me3)
    bmesh.ops.dissolve_degenerate(bm, dist=0.0015, edges=bm.edges)
    # the folded-over slivers left at a crease's tip (a face turned against its corners' area-weighted normal: what the
    # mesh audit calls `flipped`, cm2-sized at the duvet's hem corners) are dissolved into their neighbours
    for _ in range(3):
        bm.normal_update()
        vn = {v: sum((f.normal * f.calc_area() for f in v.link_faces), Vector()) for v in bm.verts}
        bad = [f for f in bm.faces if sum((vn[v].normalized() for v in f.verts), Vector()).normalized().dot(f.normal) < -0.1]
        if not bad: break
        bmesh.ops.dissolve_faces(bm, faces=bad, use_verts=True) if False else bmesh.ops.collapse(bm, edges=list({e for f in bad for e in f.edges}), uvs=True)
    for x in (tmp, tmp2): bpy.data.objects.remove(x)
    for m_ in (me, me2, me3): bpy.data.meshes.remove(m_)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _outward(bm)

def pillow(sx, sy, sz, n=11, weld_r=0.006, seed=0, slump=0.0):
    """the pinched-corner pillow (kit frame, lying flat: sx along x, sz along z, sy thick, its seam at y = sy / 2):
    two faces z = +-(sy / 2) (1 - |s|^3.2)^0.8 (1 - |t|^3.2)^0.8 over the (s, t) grid, the seam a welt weld_r proud;
    slump sags the middle a little (a used pillow), a slight random twist of the outline"""
    rnd = random.Random(seed)
    bm = bmesh.new(); uvl = bm.loops.layers.uv.new("UVMap")
    ring = {}
    def V(i, j, side):
        s, t = -1 + 2 * i / n, -1 + 2 * j / n
        on_edge = i in (0, n) or j in (0, n)
        if on_edge and (i, j) in ring: return ring[(i, j)]
        e = ((max(0.0, 1 - abs(s) ** 4) * max(0.0, 1 - abs(t) ** 4)) ** 0.55) * 0.9 + 0.1 * (0 if on_edge else 1)
        h = side * (sy / 2) * e - slump * e * (1 if side > 0 else 0.4)
        bulge = 1.0 + 0.04 * e
        x = s * sx / 2 * bulge + rnd.uniform(-1, 1) * 0.002 * e
        z = t * sz / 2 * bulge + rnd.uniform(-1, 1) * 0.002 * e
        if on_edge:            # the welt: the seam pushed out
            x += math.copysign(weld_r, s) if i in (0, n) else 0.0
            z += math.copysign(weld_r, t) if j in (0, n) else 0.0
        v = bm.verts.new((x, h + sy / 2, z))
        if on_edge: ring[(i, j)] = v
        return v
    for side in (1, -1):
        g = [[V(i, j, side) for i in range(n + 1)] for j in range(n + 1)]
        for j in range(n):
            for i in range(n):
                q = (g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i])
                if side < 0: q = q[::-1]
                try: f = bm.faces.new(q)
                except ValueError: continue
                for l in f.loops: l[uvl].uv = (l.vert.co.x, l.vert.co.z)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return _outward(bm)

def _outward(bm):
    """the winding outward, checked by the signed volume (the first build's Euro pillows came out inside-out: their
    per-corner bake sampled the pillow's inside and drew them black)"""
    vol = 0.0
    for f in bm.faces:
        vs = [l.vert.co for l in f.loops]
        for i in range(1, len(vs) - 1): vol += vs[0].dot(vs[i].cross(vs[i + 1])) / 6.0
    if vol < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm

def _xf(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    return bm

def bed_v3(w=2.0, seed=0, master=True):
    rnd = random.Random(seed)
    parts = []
    # ---- the hard parts (kit frame): plinth, platform, mattress, headboard
    base = K.box(w - 0.2, 0.06, L - 0.3, bevel=0.004, seg=1, oy=0.0)
    parts.append((base, "metal_black", 0))
    plat = K.soft(w + 0.14, 0.24, L + 0.1, r=0.035, n=(6, 2, 8), puff_side=0.004, oy=0.06)
    parts.append((plat, "props", BASE))
    matt = K.soft(w, 0.22, L - 0.04, r=0.05, n=(8, 3, 9), puff=0.006, puff_side=0.006, oy=0.30)
    parts.append((matt, "props", SHEET))
    head = K.xform(K.soft(w + 0.5, 1.12, 0.13, r=0.045, n=(9, 7, 2), puff=0.0, puff_side=0.012, seed=seed + 2, oy=0.06),
                   K.T(0, 0, -L / 2 - 0.1))
    parts.append((head, "props", BOUCLE))
    # ---- the cloth: colliders = copies of the same meshes in Blender coordinates
    made = []
    cols = []
    for (bm_src, nm) in ((matt, "c_matt"), (plat, "c_plat"), (head, "c_head")):
        b2 = bm_src.copy(); _kit_to_blender(b2); cols.append(_collider(_obj(nm, b2)))
    floor = bmesh.new(); bmesh.ops.create_grid(floor, x_segments=2, y_segments=2, size=3.0); cols.append(_collider(_obj("c_floor", floor)))
    made += cols
    # (Blender coordinates: X = across the bed, Y = toward the HEAD (kit -z), Z up; the mattress spans Y +-L/2)
    duv_y0, duv_y1 = -L / 2 - 0.22, L / 2 - 0.78              # the duvet: overhanging the foot, stopping short of the pillows
    # (laid ON the mattress, its head edge pinned there: the overhangs fall, nothing slides)
    duv = _grid("duvet", w + 0.7, duv_y1 - duv_y0, 0.04, TOP + 0.006, 0.0, (duv_y0 + duv_y1) / 2, rot=rnd.uniform(-0.6, 0.6))
    _cloth(duv, mass=0.6, bend=0.35, stiff=14.0, pin_head=0.05, frames=90); made.append(duv)
    _simulate(90)
    duv_bm = _bake_result(duv, 0.03, 3000 if master else 2600)
    # the duvet as the collider of the second pass (the turned-down top and the throw lie on it)
    dcol = _collider(_obj("c_duv", duv_bm.copy())); made.append(dcol)
    for o in (duv,): o.modifiers.clear(); o.hide_viewport = True
    fold = _grid("fold", w + 0.16, 0.4, 0.04, TOP + 0.05, 0.0, duv_y1 - 0.13)
    _cloth(fold, mass=0.5, bend=0.5, stiff=14.0, frames=90); made.append(fold)
    thr_w = 0.62
    throw = _grid("throw", w + 0.7, thr_w, 0.035, TOP + 0.07, rnd.uniform(0.04, 0.1), -L / 2 + 0.5, rot=rnd.uniform(-3.0, 3.0))
    _cloth(throw, mass=0.3, bend=0.1, stiff=12.0, frames=90); made.append(throw)
    for o in (duv,): bpy.context.scene.collection.objects.unlink(o)
    bpy.context.scene.frame_set(1)
    _simulate(90)
    fold_bm = _bake_result(fold, 0.028, 700)
    thr_bm = _bake_result(throw, 0.012, 1300)
    for nm, bm_ in (("duvet", duv_bm), ("fold", fold_bm), ("throw", thr_bm)):
        zmin = min(v.co.z for v in bm_.verts)
        print(f"bed {w}: {nm} {len(bm_.faces)} faces, lowest {zmin:.3f} m")
        if zmin < 0.03: raise SystemExit(f"villa_bed: the {nm} reached {zmin:.2f} m (slid off the bed)")
    for bm_, code in ((duv_bm, DUVET), (fold_bm, DUVET), (thr_bm, THROW)):
        bmesh.ops.transform(bm_, matrix=R_KIT_INV, verts=bm_.verts)
        parts.append((bm_, "props", code))
    for o in made:
        me = o.data
        if o.name in bpy.data.objects: bpy.data.objects.remove(o)
        if me and me.users == 0: bpy.data.meshes.remove(me)
    # ---- pillows (kit frame: the head at -z; the headboard's face at z = -L/2 - 0.035)
    hz = -L / 2 - 0.03
    euros = 2 if w < 1.9 else 2
    for k in range(euros):
        x = (k + 0.5 - euros / 2) * (w / euros) * 0.98
        p = pillow(0.64, 0.24, 0.64, seed=seed * 7 + k, slump=0.012)
        # stood up against the headboard, leaning back ~14 degrees, sitting on the mattress
        _xf(p, Matrix.Translation((x, TOP + 0.33, hz + 0.21)) @ Matrix.Rotation(math.radians(90 - 14 + rnd.uniform(-2, 2)), 4, "X") @ Matrix.Translation((0, -0.12, 0)))
        parts.append((p, "props", EURO))
    for k in range(2):
        x = (k - 0.5) * (w * 0.5)
        p = pillow(0.74, 0.15, 0.5, seed=seed * 7 + 5 + k, slump=0.02)
        _xf(p, Matrix.Translation((x + rnd.uniform(-0.02, 0.02), TOP + 0.245, hz + 0.43)) @ Matrix.Rotation(math.radians(50 + rnd.uniform(-3, 3)), 4, "X")
            @ Matrix.Rotation(math.radians(rnd.uniform(-3, 3)), 4, "Y") @ Matrix.Translation((0, -0.075, 0)))
        parts.append((p, "props", PILLOW))
    if master:
        for k in range(1):
            x = 0.0
            p = pillow(0.45, 0.13, 0.32, n=9, seed=seed * 7 + 9 + k, slump=0.01)
            _xf(p, Matrix.Translation((x, TOP + 0.17, hz + 0.62)) @ Matrix.Rotation(math.radians(35 + rnd.uniform(-4, 4)), 4, "X")
                @ Matrix.Rotation(math.radians(rnd.uniform(-8, 8)), 4, "Y") @ Matrix.Translation((0, -0.065, 0)))
            parts.append((p, "props", CUSHION))
    return parts

def bench_v3(length=1.5, depth=0.45, h=0.44):
    """the leather bench at the bed's foot: a tufted-free leather cushion on a slim black frame (kit frame: x = length)"""
    top = K.soft(length, 0.11, depth, r=0.04, n=(8, 2, 3), puff=0.01, puff_side=0.006, seed=3, oy=h - 0.11)
    parts = [(top, "props", LEATHER)]
    rail = K.box(length - 0.06, 0.03, depth - 0.06, bevel=0.004, seg=1, oy=h - 0.14)
    parts.append((rail, "metal_black", 0))
    for sx in (-1, 1):
        for sz in (-1, 1):
            leg = K.xform(K.box(0.03, h - 0.14, 0.03, bevel=0.003, seg=1), K.T(sx * (length / 2 - 0.06), 0, sz * (depth / 2 - 0.06)))
            parts.append((leg, "metal_black", 0))
    return parts
