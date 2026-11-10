"""VILLA VAN BUUREN: the roofs, for tools/blender/vanbuuren.py.

The roof is the UNION (Blender boolean, exact solver) of convex roof SLABS (each a gable prism or the north wing's
flat-topped block, 0.18 m thick, with its eave and verge overhangs): the union's upward faces are the roof planes with
exact valleys and crossings, its downward faces the soffits. The vertical ends are dropped: bargeboards and fascias are
built over them (their boards cross the slab ends: no coplanar faces).

Tiles (the flat dark tiles of the photos; the shared roof kit's rules, tools/blender/roofkit.py on claude/stalle):
LOD0 lays real COURSES on every plane: each course is a plane tilted by the tile thickness (the butt stands proud, so
every course casts its shadow line) plus its butt face; consecutive courses form one closed sawtooth surface, no deck
under it. The tiles' vertical joints are in the material (UV0 = (along the eave, up the slope) in metres from the eave,
the same frame for the far roof's painted courses). Individual tiles as geometry (~27k tiles) were over budget.
Valleys get a zinc flashing over the course ends, ridges a ridge-tile roll.
"""
import bpy, bmesh, math
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
from vanbuuren_kit import K, Z, P, OY, hz, face_dir, TILES, ZINC, WOODV, C_PLAIN, C_RIDGE, C_COPING, C_SOFFIT

T_SLAB = 0.18
TILE_GAUGE = 0.11
TILE_T = 0.012

def gable_slab(axis, c, h_ridge, slope_l, slope_r, a0, a1, e_l, e_r, name):
    """a gable prism: ridge along `axis` ('u' or 'w') at cross coordinate c, height h_ridge; the two slopes (tan) to
    the eave edges at cross coordinates e_l < c < e_r; from a0 to a1 along the axis (the verge ends). Returns the
    convex hull's vertices (Blender)."""
    hl = h_ridge - (c - e_l) * slope_l; hr = h_ridge - (e_r - c) * slope_r
    # the slab's underside: offset T_SLAB perpendicular to each slope (vertically T / cos)
    tl = T_SLAB * math.sqrt(1 + slope_l * slope_l); tr = T_SLAB * math.sqrt(1 + slope_r * slope_r)
    # the ridge's underside: where the two offset planes meet
    # z_l(x) = h_ridge - (c - x) slope_l - tl ; z_r(x) = h_ridge - (x - c) slope_r - tr ; equal at x_m
    xm = c + (tl - tr) / (slope_l + slope_r) if (slope_l + slope_r) > 0 else c
    zm = h_ridge - (xm - c) * slope_r - tr if xm >= c else h_ridge - (c - xm) * slope_l - tl
    sec = [(e_l, hl), (c, h_ridge), (e_r, hr), (e_r, hr - tr), (xm, zm), (e_l, hl - tl)]
    pts = []
    for a in (a0, a1):
        for (x, h) in sec:
            pts.append(P(a, x, h) if axis == "u" else P(x, a, h))
    return pts

def plane_slab(poly_uwh):
    """a convex roof plane polygon (u, w, h) extruded T_SLAB under itself (perpendicular)"""
    pts = [P(u, w, h) for (u, w, h) in poly_uwh]
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0]).normalized()
    if n.z < 0: n = -n
    return pts + [p - n * T_SLAB for p in pts]

def block(verts_uwh):
    return [P(u, w, h) for (u, w, h) in verts_uwh]

def union_roof(solids):
    """boolean union of convex solids (lists of Blender points) -> bmesh of the union (planar faces dissolved)"""
    objs = []
    for i, pts in enumerate(solids):
        bm = bmesh.new()
        for p in pts: bm.verts.new(p)
        bmesh.ops.convex_hull(bm, input=bm.verts)
        bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.05), verts=bm.verts, edges=bm.edges)
        me = bpy.data.meshes.new(f"roofslab{i}"); bm.to_mesh(me); bm.free()
        o = bpy.data.objects.new(f"roofslab{i}", me); bpy.context.scene.collection.objects.link(o); objs.append(o)
    base = objs[0]
    for o in objs[1:]:
        md = base.modifiers.new("u", "BOOLEAN"); md.operation = "UNION"; md.solver = "EXACT"; md.object = o
        md.use_self = False
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(base.evaluated_get(dg))
    for o in objs: bpy.data.objects.remove(o, do_unlink=True)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.05), verts=bm.verts, edges=bm.edges)
    # every face planar for sure (the exact union can leave n-gons a hair off their plane where slabs touch)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.normal_update()
    return bm

def plane_frame(n, pts):
    """X horizontal along the eave, Y up the slope, origin at the lowest point (y = 0 at the eave line)"""
    X = Z.cross(n); X = X.normalized() if X.length > 1e-6 else Vector((1, 0, 0))
    Y = n.cross(X).normalized()
    if Y.z < 0: Y = -Y; X = -X
    o = min(pts, key=lambda p: p.z)
    y0 = min((p - o).dot(Y) for p in pts)
    o = o + Y * y0
    return o, X, Y

def clip_band(poly, y0, y1):
    """convex polygon [(x, y)] clipped to y0 <= y <= y1"""
    def clip(P_, keep):
        out = []
        for i in range(len(P_)):
            p, q = P_[i], P_[(i + 1) % len(P_)]
            sp, sq = keep(p), keep(q)
            if sp >= 0: out.append(p)
            if (sp >= 0) != (sq >= 0):
                t = sp / (sp - sq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
        return out
    r = clip(poly, lambda p: p[1] - y0)
    if len(r) >= 3: r = clip(r, lambda p: y1 - p[1])
    return r if len(r) >= 3 else []

def roof_faces(bm):
    """the union's faces sorted: tops (normal z > 0.2), soffits (< -0.2), ends (vertical)"""
    tops, soffits, ends = [], [], []
    for f in bm.faces:
        n = f.normal
        pts = [v.co.copy() for v in f.verts]
        (tops if n.z > 0.2 else soffits if n.z < -0.2 else ends).append((n.copy(), pts))
    return tops, soffits, ends

def group_planes(tops):
    """the union's top triangles grouped by plane (normal + offset): [(n, [triangle points, ...])]"""
    groups = {}
    for (n, pts) in tops:
        key = (round(n.x, 3), round(n.y, 3), round(n.z, 3), round(pts[0].dot(n), 3))
        groups.setdefault(key, (n, []))[1].append(pts)
    return list(groups.values())

def lay_courses(n, polys, mat=TILES, far=None, flat_slot=None):
    """the tile courses over one roof plane polygon (Blender points, any shape: triangulated, each triangle clipped per
    course; pieces of a course share the course's plane). FAR (or a flat plane): the polygon itself, UV0 in the facet
    frame."""
    far = K.FAR if far is None else far
    B = K.B
    allp = [p for poly in polys for p in poly]
    o, X, Y = plane_frame(n, allp)
    B.new_group(); sv = B.lp_cur; sv_rw = B.rw_cur
    B.lp_cur = (B.grp, o.copy(), X.copy(), n.copy(), Y.copy())
    locs = [[((p - o).dot(X), (p - o).dot(Y)) for p in poly] for poly in polys]
    xs = [a for l in locs for a, b in l]
    B.rw_cur = min(max(max(xs) - min(xs), 0.5), 8.0)
    tris = []
    for loc in locs:
        for t in tessellate_polygon([[Vector((x, y, 0)) for (x, y) in loc]]):
            tris.append([loc[t[0]], loc[t[1]], loc[t[2]]])
    if far or abs(n.z) > 0.98:
        slot = flat_slot if (flat_slot is not None and abs(n.z) > 0.98) else mat
        for q in tris:
            face_dir([o + X * x + Y * y for x, y in q], n, slot, C_PLAIN, q)
        B.lp_cur = sv; B.rw_cur = sv_rw
        return
    ymax = max(y for l in locs for x, y in l)
    G, T = TILE_GAUGE, TILE_T
    k = 0
    while k * G < ymax - 1e-4:
        y0, y1 = k * G, min((k + 1) * G, ymax)
        hgt = lambda y: T * (1.0 - (y - y0) / G)
        for tri in tris:
            cp = clip_band(tri, y0, y1)
            if len(cp) < 3: continue
            area = abs(sum(cp[i][0] * cp[(i + 1) % len(cp)][1] - cp[(i + 1) % len(cp)][0] * cp[i][1] for i in range(len(cp)))) / 2
            if area < 1e-6: continue
            face_dir([o + X * x + Y * y + n * hgt(y) for x, y in cp], n, mat, C_PLAIN, [(x, y) for x, y in cp])
            for i in range(len(cp)):
                p_, q_ = cp[i], cp[(i + 1) % len(cp)]
                if abs(p_[1] - y0) < 1e-6 and abs(q_[1] - y0) < 1e-6 and abs(p_[0] - q_[0]) > 1e-5:
                    a_, b_ = o + X * p_[0] + Y * y0, o + X * q_[0] + Y * y0
                    face_dir([a_, b_, b_ + n * T, a_ + n * T], -Y, mat, C_PLAIN,
                             [(p_[0], y0 - 0.01), (q_[0], y0 - 0.01), (q_[0], y0), (p_[0], y0)])
        k += 1
    B.lp_cur = sv; B.rw_cur = sv_rw

def trims(bm, far=None):
    """bargeboards / fascias (the union's vertical ends, dark timber, raised 3.5 cm over the tiles so the courses' cut
    ends are covered), gutters under the eaves, ridge rolls, valley flashings"""
    from vanbuuren_parts import gutter
    from vanbuuren_kit import lathe
    far = K.FAR if far is None else far
    B = K.B
    is_top = lambda f: f.normal.z > 0.2
    eaves = []
    # the verges' top chain: every vertex of a vertical end face on an edge it shares with a roof plane, raised the same
    # in every face that holds it (no overlaps, no cracks)
    top_v = set()
    for f in bm.faces:
        if is_top(f) or abs(f.normal.z) > 0.2: continue
        for e in f.edges:
            if any(g is not f and is_top(g) for g in e.link_faces):
                top_v.update(v.index for v in e.verts)
    for f in bm.faces:
        if is_top(f): continue
        n = f.normal.copy()
        B.new_group()
        vertical = abs(n.z) <= 0.2
        lift = Z * ((0.035 if not far else 0.02) if vertical else 0.0)
        # a verge (vertical end): its top chain raised 3.5 cm over the tiles = the bargeboard (covers the courses' cut ends)
        face_dir([v.co.copy() + (lift if v.index in top_v else Vector()) for v in f.verts], n, WOODV, C_PLAIN if vertical else C_SOFFIT)
        if vertical: continue
        for e in f.edges:
            if not any(g is not f and is_top(g) for g in e.link_faces): continue
            a, b = e.verts[0].co.copy(), e.verts[1].co.copy()
            # an eave: a horizontal edge below 103 m TAW between a roof plane and its slab's tilted end, the plane's lowest
            if abs(a.z - b.z) < 1e-4 and a.z + OY < 103.0 and n.z < 0 and not far:
                hn = Vector((n.x, n.y, 0))
                if hn.length > 1e-3: eaves.append((a, b, hn.normalized()))
    # gutters: collinear eave edges merged (the union splits eaves), 1 cm short of each end, >= 1 m long
    merged = []
    for (a, b, hn) in eaves:
        d = (b - a).normalized()
        for m in merged:
            if abs(m[2].dot(hn)) > 0.999 and abs(abs(m[3].dot(d)) - 1) < 1e-4 and abs((a - m[0]).dot(m[3].cross(Z).normalized())) < 1e-3 and abs(a.z - m[0].z) < 1e-3:
                ts = [(x - m[0]).dot(m[3]) for x in (a, b)] + [0.0, (m[1] - m[0]).dot(m[3])]
                lo, hi = min(ts), max(ts)
                if min((a - m[0]).dot(m[3]), (b - m[0]).dot(m[3])) <= (m[1] - m[0]).dot(m[3]) + 1e-3 and max((a - m[0]).dot(m[3]), (b - m[0]).dot(m[3])) >= -1e-3:
                    m[0], m[1] = m[0] + m[3] * lo, m[0] + m[3] * hi
                    break
        else:
            merged.append([a.copy(), b.copy(), hn, d])
    # an eave under another roof (a slab end inside the attic) gets no gutter: a ray up from in front of it hits a roof
    from mathutils.bvhtree import BVHTree
    tv = [v.co.copy() for v in bm.verts]
    bvh = BVHTree.FromPolygons(tv, [[v.index for v in f.verts] for f in bm.faces if is_top(f)])
    for (a, b, hn, d) in merged:
        if (b - a).length < 1.0: continue
        mid = (a + b) / 2 + hn * 0.12
        if bvh.ray_cast(mid + Z * 0.01, Z, 30.0)[0] is not None: continue
        gutter(a + d * 0.01 - Z * 0.04, b - d * 0.01 - Z * 0.04, hn)
    for e in bm.edges:
        fs = [g for g in e.link_faces if is_top(g)]
        if len(fs) != 2: continue
        a, b = e.verts[0].co.copy(), e.verts[1].co.copy()
        if (b - a).length < 0.2: continue
        f1, f2 = fs
        if f1.normal.dot(f2.normal) > 0.999: continue          # coplanar pieces of one plane: no seam
        c1 = f1.calc_center_median()
        convex = (c1 - a).dot(f2.normal) < 0
        if convex:
            # a ridge cap: on each slope a strip of ridge tiles 13 cm wide lying 18 mm over the plane (over the tiles'
            # butts), its lower edge folded down into the courses; the two strips cross each other along the ridge
            ax = (b - a).normalized()
            B.new_group()
            for ff in fs:
                nn = ff.normal
                cen = ff.calc_center_median()
                side = nn.cross(ax)
                if side.dot(cen - a) < 0: side = -side
                lo = 0.018 if not far else 0.012
                p0, p1 = a + nn * lo - side * 0.03, b + nn * lo - side * 0.03
                q0, q1 = a + nn * lo + side * 0.13, b + nn * lo + side * 0.13
                face_dir([p0, p1, q1, q0], nn, TILES, C_RIDGE)
                face_dir([q0, q1, q1 - nn * (lo + 0.004), q0 - nn * (lo + 0.004)], side, TILES, C_RIDGE)
        else:
            if far: continue
            # a zinc valley flashing over the course ends: a strip on each plane, 16 mm over it, with a lip into the tiles;
            # 15 cm short of a junction with another valley (the strips of two valleys would overlap there)
            B.new_group()
            ax = (b - a).normalized()
            def junction(v):
                for e2 in v.link_edges:
                    if e2 is e: continue
                    f2s = [g for g in e2.link_faces if is_top(g)]
                    if len(f2s) != 2 or f2s[0].normal.dot(f2s[1].normal) > 0.999: continue
                    d2 = (e2.other_vert(v).co - v.co).normalized()
                    if abs(abs(d2.dot(ax)) - 1) > 1e-3: return True
                return False
            ta = 0.5 if junction(e.verts[0]) else 0.0
            tb = 0.5 if junction(e.verts[1]) else 0.0
            if (b - a).length - ta - tb < 0.1: continue
            a2, b2 = a + ax * ta, b - ax * tb
            for ff in fs:
                nn = ff.normal
                cen = ff.calc_center_median()
                side = nn.cross(ax)
                if side.dot(cen - a) < 0: side = -side
                lo, hi = 0.016, -0.004
                p0, p1 = a2 + nn * lo, b2 + nn * lo
                q0, q1 = p0 + side * 0.13, p1 + side * 0.13
                face_dir([p0, p1, q1, q0], nn, ZINC, C_PLAIN)
                face_dir([q0, q1, q1 - nn * (lo - hi), q0 - nn * (lo - hi)], side, ZINC, C_PLAIN)
