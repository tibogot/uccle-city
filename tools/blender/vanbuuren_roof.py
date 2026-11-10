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

def lay_courses(n, pts, mat=TILES, far=None, flat_slot=None):
    """the tile courses over one roof plane polygon (Blender points, any shape: triangulated, each triangle clipped per
    course; pieces of a course share the course's plane). FAR (or a flat plane): the polygon itself, UV0 in the facet
    frame."""
    far = K.FAR if far is None else far
    B = K.B
    o, X, Y = plane_frame(n, pts)
    loc = [((p - o).dot(X), (p - o).dot(Y)) for p in pts]
    B.new_group(); sv = B.lp_cur; sv_rw = B.rw_cur
    B.lp_cur = (B.grp, o.copy(), X.copy(), n.copy(), Y.copy())
    span = max(max(a for a, b in loc) - min(a for a, b in loc), 0.5)
    B.rw_cur = min(span, 8.0)
    tris = tessellate_polygon([[Vector((x, y, 0)) for (x, y) in loc]])
    if far or abs(n.z) > 0.98:
        slot = flat_slot if (flat_slot is not None and abs(n.z) > 0.98) else mat
        for t in tris:
            q = [loc[t[0]], loc[t[1]], loc[t[2]]]
            face_dir([o + X * x + Y * y for x, y in q], n, slot, C_PLAIN, q)
        B.lp_cur = sv; B.rw_cur = sv_rw
        return
    ymax = max(y for x, y in loc)
    G, T = TILE_GAUGE, TILE_T
    k = 0
    while k * G < ymax - 1e-4:
        y0, y1 = k * G, min((k + 1) * G, ymax)
        # height above the plane: T at the butt (y0), 0 at y0 + G (the next course's butt starts there)
        hgt = lambda y: T * (1.0 - (y - y0) / G)
        for t in tris:
            tri = [loc[t[0]], loc[t[1]], loc[t[2]]]
            cp = clip_band(tri, y0, y1)
            if len(cp) < 3: continue
            area = abs(sum(cp[i][0] * cp[(i + 1) % len(cp)][1] - cp[(i + 1) % len(cp)][0] * cp[i][1] for i in range(len(cp)))) / 2
            if area < 1e-6: continue
            face_dir([o + X * x + Y * y + n * hgt(y) for x, y in cp], n, mat, C_PLAIN, [(x, y) for x, y in cp])
            # the butt: the piece's edge(s) on y = y0 (k > 0: rises from the course below's top end; k = 0: from the
            # eave's fascia line, 2 cm below the plane)
            for i in range(len(cp)):
                p_, q_ = cp[i], cp[(i + 1) % len(cp)]
                if abs(p_[1] - y0) < 1e-6 and abs(q_[1] - y0) < 1e-6 and abs(p_[0] - q_[0]) > 1e-5:
                    lo = 0.0 if k > 0 else -0.02
                    a_, b_ = o + X * p_[0] + Y * y0, o + X * q_[0] + Y * y0
                    face_dir([a_ + n * lo, b_ + n * lo, b_ + n * T, a_ + n * T], -Y, mat, C_PLAIN,
                             [(p_[0], y0 - 0.01), (q_[0], y0 - 0.01), (q_[0], y0), (p_[0], y0)])
        k += 1
    B.lp_cur = sv; B.rw_cur = sv_rw
