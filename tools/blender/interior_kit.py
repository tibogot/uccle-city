# THE INTERIOR KIT: geometry helpers and the furniture pieces for tools/blender/interior.py (imported, not run).
#
# Everything is built in HOUSE-LOCAL metres, three.js style: x along the street face, y up from the building's
# base, z into the house. Builder.mesh() turns that into Blender's z-up frame (bx = x, by = -z, bz = y), and the glTF
# exporter's +Y-up conversion brings it back to (x, y, z): the GLB is in house-local coordinates.
#
# A piece is a small bmesh made at the origin (soft boxes with bevelled edges, cushions puffed from a rounded-box
# lattice, lathed turnings, swept mouldings, pleated cloth, leaves), emitted into a Builder with a material, a colour
# (RGBA: rgb = albedo, linear; a = the pattern code the TSL material decodes: CODE[...]) and a transform. UV0 is
# a box projection in the PIECE's own frame, in metres (so wood grain runs along a piece, not along the house).
# Few materials for the whole house (one draw call each): Plaster, Wood, Fabric, Hard, Glow, Glass.
import bmesh, math, random
from mathutils import Matrix, Vector

MATS = ["Plaster", "Wood", "Fabric", "Hard", "Glow", "Glass"]
# pattern codes (COLOR_0.a = code / 8): decoded in viewer/interior/interiorMaterials.js
CODE = {
    "Plaster": {"paint": 0, "brick": 1, "ceiling": 2},
    "Wood": {"painted": 0, "oak": 1, "walnut": 2, "herringbone": 3, "boards": 4, "pine": 5},
    "Fabric": {"weave": 0, "velvet": 1, "rug": 2, "canvas": 3, "linen": 4, "knit": 5, "rug2": 6},
    "Hard": {"enamel": 0, "steel": 1, "marble": 2, "tiles": 3, "cement": 4, "ceramic": 5, "bluestone": 6, "leaf": 7, "paper": 8 - 1e-3},
    "Glow": {"shade": 0, "bulb": 1},
    "Glass": {"clear": 0, "mirror": 1},
}

def col(hexrgb, mat, code, k=1.0):
    """sRGB hex -> linear RGBA with the pattern code in alpha."""
    r, g, b = ((hexrgb >> 16) & 255) / 255, ((hexrgb >> 8) & 255) / 255, (hexrgb & 255) / 255
    lin = lambda c: c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
    return (lin(r) * k, lin(g) * k, lin(b) * k, (CODE[mat][code] + 0.5) / 8.0)


class Builder:
    """Triangles per material, with per-corner colour + UV0, in house-local coordinates."""
    def __init__(self):
        self.v = []; self.f = []; self.fm = []; self.fc = []; self.fuv = []; self.flm = []
        self.tris = 0
        self.lm = True           # the faces added by quad / poly: lightmapped architecture; emit(): vertex-lit pieces

    def face(self, pts, mat, c, uvs, lm=None):
        base = len(self.v)
        self.v.extend(pts)
        self.f.append(tuple(range(base, base + len(pts))))
        self.fm.append(MATS.index(mat)); self.fc.append(c); self.fuv.append(uvs); self.flm.append(self.lm if lm is None else lm)
        self.tris += len(pts) - 2

    def quad(self, a, b, c_, d, mat, c, uvmode="auto"):
        """A flat polygon (counter-clockwise seen from its front), UV0 = world box projection."""
        pts = [tuple(a), tuple(b), tuple(c_), tuple(d)]
        self.face(pts, mat, c, [box_uv(Vector(p), poly_normal(pts)) for p in pts])

    def poly(self, pts, mat, c):
        self.face([tuple(p) for p in pts], mat, c, [box_uv(Vector(p), poly_normal(pts)) for p in pts])

    def emit(self, bm, mat, c, M=Matrix.Identity(4), uv_scale=1.0, skip_down=False):
        """A piece (bmesh at its origin) placed by M. UV0 from the piece frame. skip_down: drop faces facing straight
        down at the piece's bottom (hidden on the floor: no wasted lightmap texels)."""
        if not bm.faces: return
        zmin = min(v.co.y for v in bm.verts)
        R = M.to_3x3()
        for fa in bm.faces:
            n = fa.normal
            if skip_down and n.y < -0.98 and all(abs(l.vert.co.y - zmin) < 1e-4 for l in fa.loops): continue
            pts = [tuple(M @ l.vert.co) for l in fa.loops]
            uvs = [box_uv(l.vert.co, n, uv_scale) for l in fa.loops]
            self.face(pts, mat if isinstance(mat, str) else mat(fa), c if not callable(c) else c(fa), uvs, lm=False)
        bm.free()


def poly_normal(pts):
    a, b, c = Vector(pts[0]), Vector(pts[1]), Vector(pts[2])
    n = (b - a).cross(c - a)
    if n.length < 1e-12 and len(pts) > 3: n = (c - a).cross(Vector(pts[3]) - a)
    return n.normalized() if n.length > 1e-12 else Vector((0, 1, 0))

def box_uv(p, n, s=1.0):
    ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
    if ay >= ax and ay >= az: return (p.x * s, p.z * s)          # tops: grain along x
    if ax >= az: return (p.z * s, p.y * s)
    return (p.x * s, p.y * s)

def T(x=0, y=0, z=0, ry=0.0, rx=0.0, rz=0.0, s=None):
    """Transform: scale, then rotate x, z, y (degrees), then translate."""
    M = Matrix.Translation((x, y, z)) @ Matrix.Rotation(math.radians(ry), 4, "Y") @ Matrix.Rotation(math.radians(rz), 4, "Z") @ Matrix.Rotation(math.radians(rx), 4, "X")
    if s is not None:
        if isinstance(s, (int, float)): s = (s, s, s)
        M = M @ Matrix.Diagonal((s[0], s[1], s[2], 1))
    return M


# ------------------------------------------------------------------------------------------------ primitives (bmesh)
def box(sx, sy, sz, bevel=0.0, seg=2, oy=0.0):
    """A box sx * sy * sz, its bottom at y = oy (centred in x, z), edges bevelled."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((v.co.x * sx, v.co.y * sy + sy / 2 + oy, v.co.z * sz))
    if bevel > 0:
        bv = min(bevel, sx * 0.49, sy * 0.49, sz * 0.49)
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=bv, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def soft(sx, sy, sz, r=0.04, n=(6, 4, 6), puff=0.0, puff_side=0.0, sag=0.0, oy=0.0, seed=0):
    """A cushion: a lattice cube pushed onto a rounded box (radius r), the top puffed up by `puff` toward the middle,
    the sides bulged by `puff_side`, the top sagging by `sag` (a seat dent). Smooth, no hard edges."""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2.0)
    bmesh.ops.subdivide_edges(bm, edges=list(bm.edges), cuts=max(n) - 1, use_grid_fill=True)
    rnd = random.Random(seed)
    hx, hy, hz = sx / 2, sy / 2, sz / 2
    ix, iy, iz = max(hx - r, 1e-4), max(hy - r, 1e-4), max(hz - r, 1e-4)
    for v in bm.verts:
        q = Vector((v.co.x * hx, v.co.y * hy, v.co.z * hz))
        c = Vector((max(-ix, min(ix, q.x)), max(-iy, min(iy, q.y)), max(-iz, min(iz, q.z))))
        d = q - c
        p = c + (d.normalized() * r if d.length > 1e-6 else d)
        fx, fz = 1 - min(1, (p.x / hx) ** 2), 1 - min(1, (p.z / hz) ** 2)
        if p.y > 0: p.y += puff * fx * fz - sag * fx * fz * 0.0 - sag * math.exp(-((p.x / hx) ** 2 + (p.z / hz) ** 2) * 2.5)
        fy = 1 - min(1, (p.y / max(hy, 1e-4)) ** 2)
        p.x += math.copysign(puff_side * fy * (1 - (p.z / hz) ** 2), p.x) if abs(p.x) > ix * 0.98 else 0
        p.z += math.copysign(puff_side * fy * (1 - (p.x / hx) ** 2), p.z) if abs(p.z) > iz * 0.98 else 0
        p += Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-1, 1))) * 0.0015
        v.co = Vector((p.x, p.y + hy + oy, p.z))
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def lathe(profile, seg=24, cap_top=True, cap_bottom=False, sx=1.0, sz=1.0):
    """A turned piece: profile = [(radius, y), ...] bottom to top, revolved round y."""
    bm = bmesh.new()
    rings = []
    for (r, y) in profile:
        ring = []
        for i in range(seg):
            a = 2 * math.pi * i / seg
            ring.append(bm.verts.new((math.cos(a) * r * sx, y, math.sin(a) * r * sz)))
        rings.append(ring)
    for k in range(len(rings) - 1):
        A, B = rings[k], rings[k + 1]
        for i in range(seg):
            j = (i + 1) % seg
            if profile[k][0] < 1e-5 and profile[k + 1][0] < 1e-5: continue
            bm.faces.new((A[i], A[j], B[j], B[i]))
    if cap_top and profile[-1][0] > 1e-5: bm.faces.new(list(reversed(rings[-1])))
    if cap_bottom and profile[0][0] > 1e-5: bm.faces.new(rings[0])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def sweep(profile, path, closed=False):
    """A moulding: profile [(a, b), ...] in the plane normal to the path (a = outward from the wall = +side, b = up),
    swept along path [(x, y, z), ...] (horizontal runs); `side` = the path's left normal in xz."""
    bm = bmesh.new()
    P = [Vector(p) for p in path]
    rings = []
    n = len(P)
    for i, p in enumerate(P):
        if closed: d0 = (P[i] - P[i - 1]); d1 = (P[(i + 1) % n] - P[i])
        else: d0 = (P[i] - P[i - 1]) if i > 0 else (P[1] - P[0]); d1 = (P[i + 1] - P[i]) if i < n - 1 else (P[i] - P[i - 1])
        d0.y = d1.y = 0
        d0.normalize(); d1.normalize()
        s0 = Vector((-d0.z, 0, d0.x)); s1 = Vector((-d1.z, 0, d1.x))
        s = (s0 + s1); s = s.normalized() / max(0.3, s.normalized().dot(s0)) if s.length > 1e-6 else s0
        rings.append([bm.verts.new(p + s * a + Vector((0, b, 0))) for (a, b) in profile])
    m = len(profile)
    for k in range(n - (0 if closed else 1)):
        A, B = rings[k], rings[(k + 1) % n]
        for i in range(m - 1):
            bm.faces.new((A[i], B[i], B[i + 1], A[i + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def merge(*bms):
    out = bmesh.new()
    for b in bms:
        me_tmp = __import__("bpy").data.meshes.new("_tmp")
        b.to_mesh(me_tmp); out.from_mesh(me_tmp)
        __import__("bpy").data.meshes.remove(me_tmp); b.free()
    return out

def xform(bm, M):
    bmesh.ops.transform(bm, matrix=M, verts=bm.verts)
    if M.determinant() < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
    return bm

def cloth(width, height, folds=7, depth=0.05, seg_x=None, seg_y=8, gather_top=1.0, gather_bot=1.0, hem=0.0, seed=0):
    """A hanging curtain: a sheet in the xy plane (its top at y = 0, hanging down), pleated along x with `folds` folds
    of `depth`, gathered toward its top / bottom (gather < 1 narrows), a little irregular. Two-sided by thickness."""
    rnd = random.Random(seed)
    nx = seg_x or folds * 6
    bm = bmesh.new()
    rows = []
    ph = [rnd.uniform(-0.4, 0.4) for _ in range(folds + 2)]
    for j in range(seg_y + 1):
        t = j / seg_y
        y = -t * height
        g = gather_top + (gather_bot - gather_top) * t
        row = []
        for i in range(nx + 1):
            s = i / nx
            x = (s - 0.5) * width * g
            fold = math.sin(s * folds * 2 * math.pi + ph[int(s * folds)] * t) * depth * (0.75 + 0.5 * t)
            row.append(bm.verts.new((x, y + (hem * math.sin(s * math.pi) if j == seg_y else 0), fold)))
        rows.append(row)
    for j in range(seg_y):
        for i in range(nx):
            bm.faces.new((rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]))
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.008)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def leaf(length, width, bend=0.3, seg=5, fold=0.25):
    """One leaf: a pointed blade along +z from the origin, bent down by `bend`, folded along its rib."""
    bm = bmesh.new()
    rows = []
    for j in range(seg + 1):
        t = j / seg
        w = width * math.sin(math.pi * min(1, t * 1.08)) * (1 - 0.15 * t)
        z = t * length
        y = -bend * length * t * t
        rib = fold * w
        rows.append([bm.verts.new((-w / 2, y - rib * 0.5, z)), bm.verts.new((0, y, z)), bm.verts.new((w / 2, y - rib * 0.5, z))])
    for j in range(seg):
        A, B = rows[j], rows[j + 1]
        bm.faces.new((A[0], B[0], B[1], A[1])); bm.faces.new((A[1], B[1], B[2], A[2]))
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=0.003)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


# ------------------------------------------------------------------------------------------------ colours
C = {
    "white_paint": col(0xEDEAE2, "Wood", "painted"), "frame_white": col(0xE6E4DC, "Wood", "painted"),
    "oak": col(0xA27A4E, "Wood", "oak"), "oak_light": col(0xB89366, "Wood", "oak"), "walnut": col(0x5C3B26, "Wood", "walnut"),
    "parquet": col(0x9C7448, "Wood", "herringbone"), "boards": col(0xA88459, "Wood", "boards"), "stair_oak": col(0x8E6740, "Wood", "oak"),
    "black_wood": col(0x2A2522, "Wood", "painted"), "green_paint": col(0x4E6B5A, "Wood", "painted"),
    "steel": col(0xB8BBBE, "Hard", "steel"), "brass": col(0xB08A4A, "Hard", "steel"), "black_iron": col(0x262626, "Hard", "enamel"),
    "enamel_white": col(0xEEEEEA, "Hard", "ceramic"), "marble_black": col(0x2B2B2D, "Hard", "marble"), "marble_white": col(0xDCD8D0, "Hard", "marble"),
    "worktop": col(0x3A3836, "Hard", "marble"), "bluestone": col(0x4A4F55, "Hard", "bluestone"), "tiles_white": col(0xE8E6E0, "Hard", "tiles"),
    "tiles_green": col(0x6F8C7E, "Hard", "tiles"), "cement": col(0xB9AE9C, "Hard", "cement"), "leaf": col(0x2E5A2A, "Hard", "leaf"),
    "leaf_dark": col(0x23461F, "Hard", "leaf"), "terracotta": col(0xA4553A, "Hard", "enamel"), "soil": col(0x2C2118, "Hard", "enamel"),
    "radiator": col(0xE9E6DD, "Hard", "enamel"), "appliance": col(0x2E3032, "Hard", "enamel"), "fridge": col(0xDEDCD6, "Hard", "enamel"),
    "paper": col(0xEDE6D6, "Hard", "paper"),
    "brick": col(0x8E3B26, "Plaster", "brick"),
}

def plaster(hexrgb): return col(hexrgb, "Plaster", "paint")
def fabric(hexrgb, code="weave"): return col(hexrgb, "Fabric", code)


# ------------------------------------------------------------------------------------------------ furniture
# Each returns a list of (bm, mat, colour) in the piece frame (x right, y up, z FORWARD = the side people use: a sofa
# faces +z, a cabinet's doors are at +z), its back at z = -depth/2 unless noted, standing on y = 0. place() emits them.
def place(B, parts, M, skip_down=True):
    for bm, mat, c in parts: B.emit(bm, mat, c, M, skip_down=skip_down)

def tapered_leg(h, r0, r1, seg=10):
    return lathe([(r1, 0.0), (r1 * 1.05, 0.02), (r0, h - 0.01), (r0 * 0.9, h)], seg=seg)

def sofa(w=2.1, d=0.92, fabric_c=None, seats=3, seed=0, wood=None):
    fc = fabric_c or fabric(0x5E6B57, "velvet"); wood = wood or C["walnut"]
    P = []
    seat_h, base_h, arm_w, back_d = 0.43, 0.24, 0.17, 0.2
    # plinth frame (upholstered), arms, back
    P.append((soft(w, base_h, d, r=0.03, n=(10, 3, 6), oy=0.12), "Fabric", fc))
    for sx in (-1, 1):
        P.append((xform(soft(arm_w, 0.40, d, r=0.075, n=(4, 6, 8), puff=0.012, puff_side=0.008, oy=0.28), T(sx * (w / 2 - arm_w / 2))), "Fabric", fc))
    P.append((xform(soft(w - 2 * arm_w + 0.02, 0.42, back_d, r=0.06, n=(10, 6, 3), puff=0.0, oy=0.34), T(0, 0, -d / 2 + back_d / 2)), "Fabric", fc))
    inner = w - 2 * arm_w
    cw = inner / seats
    for i in range(seats):
        x = -inner / 2 + cw * (i + 0.5)
        P.append((xform(soft(cw - 0.012, 0.13, d - back_d - 0.03, r=0.05, n=(6, 3, 6), puff=0.018, puff_side=0.006, sag=0.006, seed=seed + i, oy=0.36), T(x, 0, back_d / 2 + 0.005)), "Fabric", fc))
        # back cushions leaning on the back
        bc = soft(cw - 0.03, 0.44, 0.16, r=0.06, n=(6, 6, 3), puff=0.0, puff_side=0.02, seed=seed + 10 + i)
        xform(bc, T(0, -0.22, 0) ); xform(bc, T(x, 0.22 + 0.47, -d / 2 + back_d + 0.07, rx=-10))
        P.append((bc, "Fabric", fc))
    # a throw pillow at one end
    pl = soft(0.42, 0.42, 0.13, r=0.08, n=(6, 6, 3), puff_side=0.04, seed=seed + 33)
    xform(pl, T(0, -0.21, 0)); xform(pl, T(-inner / 2 + 0.24, 0.21 + 0.5, -d / 2 + back_d + 0.18, rx=-14, rz=8))
    P.append((pl, "Fabric", fabric(0xC9A15A, "linen")))
    # legs
    for sx in (-1, 1):
        for sz in (-1, 1):
            P.append((xform(tapered_leg(0.12, 0.022, 0.016), T(sx * (w / 2 - 0.08), 0, sz * (d / 2 - 0.08))), "Wood", wood))
    return P

def armchair(fabric_c=None, wood=None, seed=0):
    fc = fabric_c or fabric(0x8A4B3A, "velvet"); wood = wood or C["walnut"]
    w, d = 0.82, 0.84
    P = [(soft(w, 0.22, d, r=0.03, n=(5, 3, 5), oy=0.14), "Fabric", fc)]
    for sx in (-1, 1):
        P.append((xform(soft(0.15, 0.36, d, r=0.07, n=(3, 5, 7), puff_side=0.008, oy=0.30), T(sx * (w / 2 - 0.075))), "Fabric", fc))
    back = soft(w - 0.02, 0.62, 0.17, r=0.07, n=(6, 7, 3), puff_side=0.01)
    xform(back, T(0, 0, 0)); xform(back, T(0, 0.30, -d / 2 + 0.1, rx=-8))
    P.append((back, "Fabric", fc))
    P.append((xform(soft(w - 0.3, 0.12, d - 0.22, r=0.05, n=(5, 3, 5), puff=0.02, sag=0.006, seed=seed, oy=0.36), T(0, 0, 0.08)), "Fabric", fc))
    for sx in (-1, 1):
        for sz in (-1, 1):
            P.append((xform(tapered_leg(0.14, 0.022, 0.015), T(sx * (w / 2 - 0.07), 0, sz * (d / 2 - 0.07), rz=-6 * sx)), "Wood", wood))
    return P

def coffee_table(w=1.1, d=0.6, h=0.42, wood=None):
    wood = wood or C["walnut"]
    P = [(box(w, 0.035, d, bevel=0.008, seg=2, oy=h - 0.035), "Wood", wood),
         (box(w - 0.12, 0.02, d - 0.12, bevel=0.004, seg=1, oy=0.12), "Wood", wood)]
    for sx in (-1, 1):
        for sz in (-1, 1):
            P.append((xform(tapered_leg(h - 0.035, 0.022, 0.014), T(sx * (w / 2 - 0.06), 0, sz * (d / 2 - 0.06))), "Wood", wood))
    # a few objects: a book stack, a bowl
    P.append((xform(box(0.22, 0.03, 0.16, bevel=0.003, seg=1, oy=h), T(-0.25, 0, 0.05, ry=12)), "Hard", C["paper"]))
    P.append((xform(box(0.2, 0.025, 0.15, bevel=0.003, seg=1, oy=h + 0.03), T(-0.24, 0, 0.04, ry=-6)), "Fabric", fabric(0x7A2E2A, "canvas")))
    P.append((xform(lathe([(0.0, 0.0), (0.05, 0.002), (0.11, 0.035), (0.125, 0.07), (0.118, 0.072), (0.1, 0.04), (0.0, 0.012)], seg=28, cap_top=False), T(0.25, h, 0)), "Hard", C["enamel_white"]))
    return P

def turned_leg(h, r=0.028, seg=12):
    return lathe([(r * 0.8, 0.0), (r * 0.9, 0.04), (r * 0.7, 0.10), (r, h * 0.45), (r * 1.15, h * 0.5), (r * 0.9, h * 0.55),
                  (r * 1.0, h * 0.82), (r * 1.25, h * 0.86), (r * 1.25, h)], seg=seg)

def dining_table(w=1.6, d=0.9, h=0.75, wood=None):
    wood = wood or C["oak"]
    P = [(box(w, 0.04, d, bevel=0.01, seg=2, oy=h - 0.04), "Wood", wood)]
    for sx in (-1, 1):
        P.append((xform(box(0.025, 0.09, d - 0.16, bevel=0.004, seg=1, oy=h - 0.13), T(sx * (w / 2 - 0.09))), "Wood", wood))
    for sz in (-1, 1):
        P.append((xform(box(w - 0.18, 0.09, 0.025, bevel=0.004, seg=1, oy=h - 0.13), T(0, 0, sz * (d / 2 - 0.09))), "Wood", wood))
        for sx in (-1, 1):
            P.append((xform(turned_leg(h - 0.04), T(sx * (w / 2 - 0.09), 0, sz * (d / 2 - 0.09))), "Wood", wood))
    return P

def chair(wood=None, seat_c=None):
    wood = wood or C["oak"]; seat_c = seat_c or fabric(0x6B5644, "weave")
    P = []
    s, h = 0.44, 0.46
    for sx in (-1, 1):
        P.append((xform(tapered_leg(h, 0.017, 0.013), T(sx * (s / 2 - 0.03), 0, s / 2 - 0.03)), "Wood", wood))
        # back legs run up into the back posts, raked
        P.append((xform(box(0.034, 0.92, 0.034, bevel=0.006, seg=1), T(sx * (s / 2 - 0.03), 0, -s / 2 + 0.03, rx=-5)), "Wood", wood))
    P.append((box(s, 0.03, s, bevel=0.006, seg=1, oy=h - 0.03), "Wood", wood))
    P.append((soft(s - 0.04, 0.045, s - 0.05, r=0.02, n=(4, 2, 4), puff=0.008, oy=h), "Fabric", seat_c))
    for k, y in enumerate((0.62, 0.74, 0.86)):
        P.append((xform(box(s - 0.06, 0.05 if k else 0.035, 0.018, bevel=0.004, seg=1, oy=y), T(0, 0, -s / 2 + 0.03 - math.tan(math.radians(5)) * y, rx=-5)), "Wood", wood))
    for sx in (-1, 1):
        P.append((xform(box(0.018, 0.018, s - 0.06, bevel=0.003, seg=1, oy=0.16), T(sx * (s / 2 - 0.03))), "Wood", wood))
    return P

def bed(w=1.6, l=2.05, frame=None, duvet=None, sheet=None, seed=0):
    frame = frame or C["oak_light"]; duvet = duvet or fabric(0xD9D2C3, "linen"); sheet = sheet or fabric(0xF0EDE6, "linen")
    P = []
    # frame: rails, posts, the headboard (upholstered) at -z
    P.append((box(w + 0.06, 0.2, l + 0.06, bevel=0.012, seg=2, oy=0.12), "Wood", frame))
    for sx in (-1, 1):
        for sz in (-1, 1):
            P.append((xform(box(0.06, 0.13, 0.06, bevel=0.01, seg=1), T(sx * (w / 2 - 0.0), 0, sz * (l / 2 - 0.0))), "Wood", frame))
    hb = soft(w + 0.1, 0.62, 0.1, r=0.04, n=(10, 7, 3), puff=0, puff_side=0.01)
    P.append((xform(hb, T(0, 0.38, -l / 2 - 0.02)), "Fabric", fabric(0x7D8C93, "velvet")))
    P.append((soft(w - 0.02, 0.22, l - 0.04, r=0.05, n=(8, 3, 10), puff=0.01, oy=0.32), "Fabric", sheet))
    # duvet: draped over the mattress, folded back at the head, a little rumpled
    dv = soft(w + 0.1, 0.07, l - 0.4, r=0.035, n=(12, 3, 14), puff=0.03, puff_side=0.0, seed=seed)
    for v in dv.verts:
        x, y, z = v.co
        if abs(x) > w / 2 - 0.02: v.co.y -= min(0.22, (abs(x) - (w / 2 - 0.02)) * 4.0)   # hangs over the sides
        v.co.y += 0.008 * math.sin(z * 9 + seed) * math.cos(x * 7)
    P.append((xform(dv, T(0, 0.5, 0.2)), "Fabric", duvet))
    fold = soft(w + 0.06, 0.05, 0.3, r=0.025, n=(12, 2, 4), puff=0.02)
    P.append((xform(fold, T(0, 0.56, -l / 2 + 0.62)), "Fabric", duvet))
    for sx in (-1, 1):
        pl = soft(0.62, 0.15, 0.42, r=0.07, n=(6, 3, 5), puff=0.03, puff_side=0.02, seed=seed + sx)
        P.append((xform(pl, T(sx * w / 4.1, 0.52, -l / 2 + 0.3, rx=-12)), "Fabric", sheet))
    P.append((xform(soft(w + 0.14, 0.03, 0.55, r=0.012, n=(10, 2, 4), puff=0.006), T(0, 0.585, l / 2 - 0.35)), "Fabric", fabric(0x9C6B4E, "knit")))
    return P

def bedside(wood=None):
    wood = wood or C["oak_light"]
    P = [(box(0.45, 0.04, 0.38, bevel=0.008, oy=0.52), "Wood", wood), (box(0.43, 0.32, 0.36, bevel=0.006, oy=0.2), "Wood", wood),
         (xform(box(0.38, 0.12, 0.012, bevel=0.003, seg=1, oy=0.38), T(0, 0, 0.18)), "Wood", wood),
         (xform(lathe([(0.008, 0), (0.008, 0.02), (0.012, 0.03)], seg=8), T(0, 0.44, 0.19, rx=90)), "Hard", C["brass"])]
    for sx in (-1, 1):
        for sz in (-1, 1):
            P.append((xform(tapered_leg(0.2, 0.016, 0.012), T(sx * 0.19, 0, sz * 0.15)), "Wood", wood))
    return P

def table_lamp(shade_c=None, base_c=None, h=0.5):
    shade_c = shade_c or col(0xEFE3C8, "Glow", "shade"); base_c = base_c or C["enamel_white"]
    base = lathe([(0.0, 0), (0.06, 0.0), (0.075, 0.02), (0.085, 0.09), (0.07, 0.17), (0.03, 0.22), (0.012, 0.24), (0.008, h * 0.62)], seg=24)
    shade = lathe([(0.15, h * 0.52), (0.105, h * 0.98)], seg=32, cap_top=False)
    bmesh.ops.solidify(shade, geom=list(shade.faces), thickness=0.004)
    return [(base, "Hard", base_c), (shade, "Glow", shade_c)]

def floor_lamp(shade_c=None):
    shade_c = shade_c or col(0xE8DCC2, "Glow", "shade")
    P = [(lathe([(0.0, 0), (0.15, 0.0), (0.16, 0.015), (0.14, 0.03), (0.02, 0.04)], seg=28), "Hard", C["brass"]),
         (lathe([(0.012, 0.03), (0.012, 1.42), (0.02, 1.43)], seg=10), "Hard", C["brass"])]
    sh = lathe([(0.22, 1.32), (0.17, 1.62)], seg=36, cap_top=False)
    bmesh.ops.solidify(sh, geom=list(sh.faces), thickness=0.004)
    P.append((sh, "Glow", shade_c))
    return P

def pendant(drop=0.8, kind="drum", shade_c=None):
    shade_c = shade_c or col(0xF2E8D2, "Glow", "shade")
    P = [(lathe([(0.06, -0.04), (0.06, 0.0)], seg=20, cap_bottom=True, cap_top=False), "Hard", C["enamel_white"]),
         (lathe([(0.004, -drop), (0.004, -0.04)], seg=6, cap_top=False), "Hard", C["black_iron"])]
    if kind == "drum":
        sh = lathe([(0.24, -drop - 0.24), (0.24, -drop)], seg=40, cap_top=False)
        bmesh.ops.solidify(sh, geom=list(sh.faces), thickness=0.004)
        P.append((sh, "Glow", shade_c))
    elif kind == "bowl":
        sh = lathe([(0.0, -drop - 0.17), (0.12, -drop - 0.165), (0.2, -drop - 0.12), (0.23, -drop - 0.05), (0.235, -drop)], seg=40, cap_top=False)
        bmesh.ops.solidify(sh, geom=list(sh.faces), thickness=0.004)
        P.append((sh, "Glow", shade_c))
    elif kind == "dome":           # enamel kitchen pendant
        sh = lathe([(0.02, -drop), (0.05, -drop - 0.02), (0.12, -drop - 0.09), (0.19, -drop - 0.2), (0.2, -drop - 0.22)], seg=40, cap_top=True)
        bmesh.ops.solidify(sh, geom=list(sh.faces), thickness=0.004)
        P.append((sh, "Hard", col(0x2F4A3E, "Hard", "enamel")))
        P.append((lathe([(0.0, -drop - 0.19), (0.045, -drop - 0.17), (0.0, -drop - 0.12)], seg=16), "Glow", col(0xFFF4DE, "Glow", "bulb")))
    elif kind == "lantern":
        P.append((xform(box(0.24, 0.34, 0.24, bevel=0.01, seg=1), T(0, -drop - 0.34)), "Glow", col(0xF4E9CF, "Glow", "shade")))
        for y in (-drop - 0.34, -drop):
            P.append((xform(box(0.27, 0.025, 0.27, bevel=0.005, seg=1), T(0, y - 0.0125)), "Hard", C["black_iron"]))
    return P

def ceiling_rose(r=0.3):
    return [(lathe([(r, 0.0), (r * 0.96, -0.012), (r * 0.8, -0.018), (r * 0.65, -0.03), (r * 0.5, -0.03), (r * 0.38, -0.045), (r * 0.2, -0.05), (0.0, -0.055)], seg=48, cap_top=False), "Plaster", plaster(0xF2EFE8))]

def bookcase(w=1.0, h=2.0, d=0.32, wood=None, seed=0, fill=0.9):
    wood = wood or C["white_paint"]
    rnd = random.Random(seed)
    P = [(xform(box(w, h, 0.015), T(0, 0, -d / 2 + 0.0075)), "Wood", wood)]
    for sx in (-1, 1): P.append((xform(box(0.022, h, d, bevel=0.003, seg=1), T(sx * (w / 2 - 0.011))), "Wood", wood))
    shelves = [0.06] + [0.06 + (h - 0.1) * k / 5 for k in range(1, 5)] + [h - 0.03]
    for y in shelves: P.append((xform(box(w - 0.044, 0.024, d - 0.02, bevel=0.003, seg=1, oy=y - 0.012), T(0, 0, 0.005)), "Wood", wood))
    P.append((xform(box(w + 0.04, 0.04, d + 0.03, bevel=0.008, seg=2, oy=h), T(0, 0, 0.012)), "Wood", wood))
    spines = [0x7A2E2A, 0x2F4A5E, 0x3D5A3A, 0xC9B38A, 0x5B3A5E, 0x8C6A3A, 0x1F2A33, 0xA8522E, 0xD8CFB8, 0x4C4C4C, 0x6E2230]
    for k in range(len(shelves) - 1):
        y0 = shelves[k] + 0.012; space = shelves[k + 1] - y0 - 0.03
        x = -w / 2 + 0.03
        while x < w / 2 - 0.06:
            if rnd.random() > fill: x += rnd.uniform(0.06, 0.18); continue
            bw = rnd.uniform(0.018, 0.045); bh = min(space, rnd.uniform(0.17, 0.29)); bd = rnd.uniform(0.15, 0.23)
            if rnd.random() < 0.08 and x < w / 2 - 0.3:     # a lying pile
                for j in range(rnd.randint(2, 4)):
                    P.append((xform(box(0.2, 0.03, 0.15, bevel=0.003, seg=1, oy=y0 + j * 0.031), T(x + 0.1, 0, 0.0, ry=rnd.uniform(-6, 6))), "Fabric", fabric(rnd.choice(spines), "canvas")))
                x += 0.24; continue
            lean = rnd.uniform(-3, 3) if rnd.random() < 0.15 else 0
            P.append((xform(box(bw, bh, bd, bevel=0.002, seg=1, oy=0), T(x + bw / 2, y0, -d / 2 + 0.02 + bd / 2 + rnd.uniform(0, 0.02), rz=lean)), "Fabric", fabric(rnd.choice(spines), "canvas")))
            x += bw + 0.002
    return P

def radiator(w=1.0, h=0.62, cols=None):
    """A cast-iron column radiator (Brussels 'radiateur à colonnes')."""
    n = cols or max(6, int(w / 0.06))
    P = []
    pitch = w / n
    for i in range(n):
        x = -w / 2 + pitch * (i + 0.5)
        P.append((xform(box(pitch * 0.72, h, 0.16, bevel=pitch * 0.3, seg=2, oy=0.1), T(x, 0, 0)), "Hard", C["radiator"]))
    for y in (0.16, h + 0.04):
        P.append((xform(lathe([(0.018, -w / 2), (0.018, w / 2)], seg=8, cap_top=True, cap_bottom=True), T(0, y, 0, rz=90)), "Hard", C["radiator"]))
    for sx in (-1, 1):
        P.append((xform(lathe([(0.011, 0), (0.011, 0.1)], seg=8), T(sx * (w / 2 - pitch * 0.5), 0, 0)), "Hard", C["radiator"]))
    P.append((xform(lathe([(0.016, 0), (0.016, 0.05), (0.022, 0.06), (0.022, 0.09)], seg=10), T(w / 2 + 0.03, 0.1, 0.0, rz=0)), "Hard", C["brass"]))
    return P

def fireplace(w=1.42, h=1.12, d=0.3, marble=None, seed=0):
    """A Brussels marble mantelpiece (cheminée en marbre) with a cast-iron insert and a hearth slab; its back at
    z = -d/2 against the wall."""
    m = marble or C["marble_black"]
    P = []
    jw = 0.2
    for sx in (-1, 1):
        P.append((xform(box(jw, h - 0.08, d - 0.04, bevel=0.012, seg=2), T(sx * (w / 2 - jw / 2), 0, -0.02)), "Hard", m))
        P.append((xform(box(jw + 0.04, 0.1, d, bevel=0.01, seg=2), T(sx * (w / 2 - jw / 2))), "Hard", m))
        P.append((xform(box(jw - 0.06, 0.12, 0.03, bevel=0.01, seg=2, oy=h - 0.32), T(sx * (w / 2 - jw / 2), 0, d / 2 - 0.02)), "Hard", m))
    P.append((xform(box(w - 2 * jw + 0.02, 0.2, d - 0.06, bevel=0.012, seg=2, oy=h - 0.3), T(0, 0, -0.03)), "Hard", m))
    P.append((xform(box(w + 0.1, 0.05, d + 0.08, bevel=0.012, seg=3, oy=h - 0.1), T(0, 0, 0.02)), "Hard", m))
    P.append((xform(box(w + 0.16, 0.05, d + 0.14, bevel=0.018, seg=3, oy=h - 0.05), T(0, 0, 0.04)), "Hard", m))
    # the insert: an arched cast-iron fireback with a grate
    P.append((xform(box(w - 2 * jw, h - 0.3, 0.04), T(0, 0, -d / 2 + 0.03)), "Hard", C["black_iron"]))
    P.append((xform(box(w - 2 * jw - 0.02, 0.02, d - 0.08, oy=0.0), T(0, 0, 0.0)), "Hard", C["black_iron"]))
    for k in range(6):
        P.append((xform(box(0.012, 0.012, 0.22, oy=0.14 + k * 0.025), T(0, 0, 0.0)), "Hard", C["black_iron"]))
    P.append((xform(box(w - 2 * jw - 0.12, 0.012, 0.012, oy=0.28), T(0, 0, 0.1)), "Hard", C["black_iron"]))
    # hearth
    P.append((xform(box(w + 0.2, 0.03, 0.42, bevel=0.006, seg=1), T(0, 0, d / 2 + 0.06)), "Hard", m))
    # on the mantel: a clock, two candlesticks, a vase
    P.append((xform(box(0.3, 0.26, 0.11, bevel=0.03, seg=3, oy=h), T(0, 0, 0.03)), "Hard", C["brass"]))
    P.append((xform(lathe([(0.0, 0.0), (0.075, 0.0), (0.0, 0.0)], seg=24), T(0, h + 0.15, 0.09, rx=90)), "Hard", C["paper"]))
    for sx in (-1, 1):
        P.append((xform(lathe([(0.045, 0), (0.04, 0.01), (0.015, 0.03), (0.012, 0.18), (0.022, 0.2), (0.01, 0.21)], seg=14), T(sx * 0.5, h, 0.04)), "Hard", C["brass"]))
        P.append((xform(lathe([(0.011, 0.21), (0.011, 0.31), (0.0, 0.315)], seg=10), T(sx * 0.5, h, 0.04)), "Hard", C["enamel_white"]))
    return P

def mirror(w=1.0, h=1.3, frame_c=None):
    """An overmantel mirror (gilded), its back at z = 0 against the wall, bottom at y = 0."""
    fc = frame_c or C["brass"]
    P = []
    prof = [(0.0, 0.0), (0.035, 0.0), (0.04, 0.012), (0.03, 0.03), (0.012, 0.045), (0.0, 0.05)]
    # frame as four mitred mouldings (sweep round the rectangle, the profile's 'a' = inward)
    path = [(-w / 2, 0, 0), (w / 2, 0, 0), (w / 2, h, 0), (-w / 2, h, 0)]
    bm = bmesh.new()
    pts = [Vector(p) for p in path]
    rings = []
    for i in range(4):
        p = pts[i]; inward = (Vector((0, h / 2, 0)) - Vector((p.x, p.y - 0, 0)))
        inward = Vector((-math.copysign(1, p.x), -math.copysign(1, p.y - h / 2), 0))
        rings.append([bm.verts.new(p + inward * a + Vector((0, 0, b))) for (a, b) in prof])
    for i in range(4):
        A, B_ = rings[i], rings[(i + 1) % 4]
        for k in range(len(prof) - 1): bm.faces.new((A[k], B_[k], B_[k + 1], A[k + 1]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.append((bm, "Hard", fc))
    P.append((xform(box(w - 0.06, h - 0.06, 0.006), T(0, 0.03, 0.006)), "Glass", (0.8, 0.82, 0.82, (CODE["Glass"]["mirror"] + 0.5) / 8)))
    return P

def picture(w=0.6, h=0.45, frame_c=None, canvas_c=None):
    fc = frame_c or C["black_wood"]; cc = canvas_c or fabric(0x6A7A8A, "canvas")
    P = []
    t, dd = 0.04, 0.03
    for (cx, cy, sx, sy) in ((0, h / 2 - t / 2, w, t), (0, -h / 2 + t / 2, w, t), (w / 2 - t / 2, 0, t, h - 2 * t), (-w / 2 + t / 2, 0, t, h - 2 * t)):
        P.append((xform(box(sx, sy, dd, bevel=0.006, seg=2, oy=-sy / 2), T(cx, cy, dd / 2)), "Wood", fc))
    P.append((xform(box(w - 2 * t + 0.004, h - 2 * t + 0.004, 0.006, oy=-(h - 2 * t) / 2), T(0, 0, 0.012)), "Fabric", cc))
    return P

def rug(w, l, c=None, thick=0.012):
    c = c or fabric(0x7A3B32, "rug")
    return [(soft(w, thick, l, r=0.005, n=(6, 1, 6)), "Fabric", c)]

def plant(h=1.4, pot_r=0.2, seed=0, kind="ficus"):
    rnd = random.Random(seed)
    P = [(lathe([(0.0, 0.0), (pot_r * 0.72, 0.0), (pot_r * 0.8, 0.02), (pot_r, pot_r * 1.55), (pot_r * 1.06, pot_r * 1.6), (pot_r * 1.04, pot_r * 1.66), (pot_r * 0.94, pot_r * 1.62)], seg=28, cap_top=False), "Hard", C["terracotta"]),
         (lathe([(pot_r * 0.95, pot_r * 1.5), (0.0, pot_r * 1.52)], seg=24, cap_top=False), "Hard", C["soil"])]
    top = pot_r * 1.5
    if kind == "ficus":       # stems with clusters of leaves
        for s in range(5):
            a = rnd.uniform(0, 360); lean = rnd.uniform(3, 14); sh = h * rnd.uniform(0.6, 1.0)
            st = xform(lathe([(0.012, 0), (0.006, sh)], seg=6), T(0, top, 0, ry=a, rx=lean))
            P.append((st, "Wood", C["walnut"]))
            dirv = Matrix.Rotation(math.radians(a), 4, "Y") @ Matrix.Rotation(math.radians(lean), 4, "X")
            for k in range(14):
                t = rnd.uniform(0.35, 1.0)
                p = Vector((0, top, 0)) + (dirv.to_3x3() @ Vector((0, sh * t, 0)))
                lf = leaf(rnd.uniform(0.09, 0.14), rnd.uniform(0.04, 0.06), bend=rnd.uniform(0.15, 0.45))
                P.append((xform(lf, T(p.x, p.y, p.z, ry=rnd.uniform(0, 360), rx=rnd.uniform(-40, 25))), "Hard", C["leaf"] if rnd.random() < 0.6 else C["leaf_dark"]))
    else:                      # a big-leaf plant (monstera / philodendron)
        for k in range(19):
            a = rnd.uniform(0, 360); el = rnd.uniform(20, 72); L = h * rnd.uniform(0.45, 0.8)
            stem = xform(lathe([(0.006, 0), (0.004, L)], seg=5), T(0, top, 0, ry=a, rx=90 - el))
            P.append((stem, "Hard", C["leaf_dark"]))
            tip = Vector((0, top, 0)) + Vector((math.sin(math.radians(a)) * math.cos(math.radians(el)) * L, math.sin(math.radians(el)) * L, math.cos(math.radians(a)) * math.cos(math.radians(el)) * L))
            lf = leaf(rnd.uniform(0.3, 0.42), rnd.uniform(0.26, 0.34), bend=rnd.uniform(0.2, 0.5), seg=7, fold=0.15)
            P.append((xform(lf, T(tip.x, tip.y, tip.z, ry=a, rx=rnd.uniform(-20, 10))), "Hard", C["leaf"]))
    return P

def wardrobe(w=1.9, h=2.15, d=0.6, wood=None):
    wood = wood or C["white_paint"]
    P = [(box(w, h - 0.1, d - 0.02, bevel=0.006, seg=1, oy=0.08), "Wood", wood), (box(w + 0.05, 0.06, d + 0.02, bevel=0.01, seg=2, oy=h - 0.04), "Wood", wood),
         (box(w + 0.02, 0.08, d, bevel=0.006, seg=1), "Wood", wood)]
    nd = 3 if w > 1.4 else 2
    dw = (w - 0.04) / nd
    for i in range(nd):
        x = -w / 2 + 0.02 + dw * (i + 0.5)
        P.extend(panel_door(dw - 0.008, h - 0.22, wood, x, 0.12, d / 2 - 0.01))
        P.append((xform(lathe([(0.009, 0), (0.009, 0.025), (0.013, 0.035)], seg=10), T(x + (dw / 2 - 0.05) * (1 if i % 2 else -1), 1.05, d / 2 + 0.01, rx=90)), "Hard", C["brass"]))
    return P

def panel_door(w, h, wood, x=0.0, y=0.0, z=0.0, panels=2):
    """A flat door leaf with raised panels (lit by the lightmap), its face at z, centred on x, bottom at y."""
    P = [(xform(box(w, h, 0.02, bevel=0.004, seg=1), T(x, y, z)), "Wood", wood)]
    ph = (h - 0.12 * (panels + 1)) / panels
    for k in range(panels):
        py = y + 0.12 + k * (ph + 0.12)
        P.append((xform(box(w - 0.18, ph, 0.012, bevel=0.01, seg=2), T(x, py, z + 0.012)), "Wood", wood))
    return P

def kitchen_base(w, wood, top_c, d=0.6, h=0.9, sink=False, hob=False, oven=False, drawers=False, seed=0):
    """Base units w long (along x), doors at +z, worktop over. Its back at z = -d/2."""
    P = [(xform(box(w, 0.1, d - 0.06), T(0, 0, -0.03)), "Hard", C["appliance"]),
         (xform(box(w, h - 0.14, d - 0.03, bevel=0.002, seg=1, oy=0.1), T(0, 0, -0.015)), "Wood", wood)]
    n = max(1, round(w / 0.6))
    uw = w / n
    for i in range(n):
        x = -w / 2 + uw * (i + 0.5)
        if oven and i == 0:
            P.append((xform(box(uw - 0.01, 0.58, 0.02, bevel=0.004, seg=1, oy=0.2), T(x, 0, d / 2 - 0.02)), "Hard", C["steel"]))
            P.append((xform(box(uw - 0.12, 0.34, 0.006, oy=0.28), T(x, 0, d / 2 - 0.004)), "Glass", (0.02, 0.02, 0.02, (CODE["Glass"]["clear"] + 0.5) / 8)))
            P.append((xform(lathe([(0.009, -uw * 0.35), (0.009, uw * 0.35)], seg=8, cap_top=True, cap_bottom=True), T(x, 0.71, d / 2 + 0.02, rz=90)), "Hard", C["steel"]))
            P.append((xform(box(uw - 0.01, 0.1, 0.02, bevel=0.004, seg=1, oy=0.75), T(x, 0, d / 2 - 0.02)), "Wood", wood))
            continue
        if drawers and i == n - 1:
            for k, (y, hh) in enumerate(((0.12, 0.3), (0.43, 0.2), (0.64, 0.18))):
                P.extend(shaker(uw - 0.008, hh - 0.006, wood, x, y, d / 2 - 0.02))
                P.append((xform(box(0.12, 0.012, 0.012, bevel=0.004, seg=1, oy=y + hh - 0.05), T(x, 0, d / 2 + 0.008)), "Hard", C["brass"]))
            continue
        P.extend(shaker(uw - 0.008, h - 0.24, wood, x, 0.12, d / 2 - 0.02))
        P.append((xform(box(0.012, 0.12, 0.012, bevel=0.004, seg=1, oy=h - 0.3), T(x + (uw / 2 - 0.06) * (1 if i % 2 else -1), 0, d / 2 + 0.008)), "Hard", C["brass"]))
    top = box(w + 0.02, 0.035, d + 0.02, bevel=0.004, seg=2, oy=h - 0.035)
    P.append((top, "Hard", top_c))
    if sink:
        bowl = lathe([(0.0, h - 0.2), (0.17, h - 0.2), (0.2, h - 0.185), (0.21, h - 0.02), (0.235, h - 0.002), (0.25, h + 0.002)], seg=4, cap_top=False, sx=1.25, sz=0.95)
        bmesh.ops.rotate(bowl, verts=bowl.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.radians(45), 3, "Y"))
        P.append((xform(bowl, T(0, 0, 0.02)), "Hard", C["steel"]))
        tap = sweep([(0.012 * math.cos(a), 0.012 * math.sin(a)) for a in [k * math.pi / 4 for k in range(9)]],
                    [(0, h, -0.22), (0, h + 0.3, -0.22), (0, h + 0.33, -0.15), (0, h + 0.27, -0.08)])
        P.append((lathe([(0.025, h), (0.022, h + 0.05), (0.014, h + 0.06)], seg=12), "Hard", C["steel"]))
        P.append((tap, "Hard", C["steel"]))
    if hob:
        P.append((xform(box(0.58, 0.006, 0.5, bevel=0.003, seg=1, oy=h), T(0, 0, 0.0)), "Hard", col(0x101112, "Hard", "ceramic")))
        for (hx, hz, r) in ((-0.14, -0.1, 0.09), (0.14, -0.1, 0.07), (-0.14, 0.12, 0.07), (0.14, 0.12, 0.09)):
            P.append((xform(lathe([(r, 0), (r - 0.004, 0.0005), (r - 0.008, 0)], seg=24, cap_top=False), T(hx, h + 0.0065, hz)), "Hard", C["steel"]))
    return P

def shaker(w, h, wood, x, y, z):
    """A shaker cabinet door: frame + recessed flat panel."""
    t = 0.07
    P = [(xform(box(w, t, 0.02, bevel=0.003, seg=1), T(x, y, z)), "Wood", wood), (xform(box(w, t, 0.02, bevel=0.003, seg=1), T(x, y + h - t, z)), "Wood", wood),
         (xform(box(t, h - 2 * t, 0.02, bevel=0.003, seg=1), T(x - w / 2 + t / 2, y + t, z)), "Wood", wood), (xform(box(t, h - 2 * t, 0.02, bevel=0.003, seg=1), T(x + w / 2 - t / 2, y + t, z)), "Wood", wood),
         (xform(box(w - 2 * t + 0.004, h - 2 * t + 0.004, 0.012), T(x, y + t - 0.002, z - 0.004)), "Wood", wood)]
    return P

def kitchen_wall(w, wood, d=0.34, h=0.72):
    P = [(xform(box(w, h, d - 0.02, bevel=0.002, seg=1), T(0, 0, -0.01)), "Wood", wood)]
    n = max(1, round(w / 0.5)); uw = w / n
    for i in range(n):
        x = -w / 2 + uw * (i + 0.5)
        P.extend(shaker(uw - 0.008, h - 0.01, wood, x, 0.005, d / 2 - 0.01))
        P.append((xform(box(0.012, 0.1, 0.012, bevel=0.004, seg=1, oy=0.04), T(x + (uw / 2 - 0.05) * (1 if i % 2 else -1), 0, d / 2 + 0.018)), "Hard", C["brass"]))
    P.append((xform(box(w + 0.03, 0.04, d + 0.03, bevel=0.006, seg=1, oy=h), T(0, 0, 0)), "Wood", wood))
    return P

def hood(w=0.6):
    P = [(xform(box(w, 0.08, 0.5, bevel=0.004, seg=1), T(0, 0, 0)), "Hard", C["steel"]),
         (xform(lathe([(0.0, 0.08), (w * 0.5, 0.08), (0.14, 0.42), (0.14, 0.42)], seg=4, cap_top=True, sx=1.0, sz=0.9), T(0, 0, -0.03, ry=45)), "Hard", C["steel"]),
         (xform(box(0.26, 0.6, 0.24, bevel=0.004, seg=1, oy=0.42), T(0, 0, -0.13)), "Hard", C["steel"])]
    return P

def fridge(w=0.6, h=1.85, d=0.62):
    P = [(box(w, h, d - 0.04, bevel=0.01, seg=2), "Hard", C["fridge"]),
         (xform(box(w - 0.006, h * 0.62 - 0.01, 0.04, bevel=0.012, seg=2, oy=0.02), T(0, 0, d / 2 - 0.03)), "Hard", C["fridge"]),
         (xform(box(w - 0.006, h * 0.36 - 0.012, 0.04, bevel=0.012, seg=2, oy=h * 0.63 + 0.002), T(0, 0, d / 2 - 0.03)), "Hard", C["fridge"])]
    for (y0, y1) in ((0.9, 1.15), (1.25, 1.5)):
        P.append((xform(lathe([(0.011, y0), (0.011, y1)], seg=8), T(w / 2 - 0.05, 0, d / 2 + 0.02)), "Hard", C["steel"]))
    return P

def bathtub(l=1.7, w=0.76, h=0.6):
    """A freestanding roll-top tub on claw feet (old Brussels bathrooms): an oval lathe, hollow, rolled rim."""
    R = w / 2
    sx = (l / 2) / R
    prof = [(0.0, 0.1), (R * 0.55, 0.1), (R * 0.82, 0.13), (R * 0.95, 0.22), (R * 1.0, 0.4), (R * 1.0, h - 0.03), (R * 1.04, h - 0.01),
            (R * 1.03, h + 0.015), (R * 0.97, h + 0.02), (R * 0.93, h), (R * 0.9, h - 0.08), (R * 0.85, 0.3), (R * 0.72, 0.2), (R * 0.4, 0.165), (0.0, 0.16)]
    tub = lathe(prof, seg=40, cap_top=False, sx=sx, sz=1.0)
    P = [(tub, "Hard", C["enamel_white"])]
    for (fx, fz) in ((-1, -1), (-1, 1), (1, -1), (1, 1)):
        foot = lathe([(0.03, 0.0), (0.045, 0.01), (0.035, 0.04), (0.022, 0.08), (0.03, 0.12), (0.0, 0.13)], seg=12)
        P.append((xform(foot, T(fx * (l / 2 - 0.22), 0, fz * (R - 0.12))), "Hard", C["brass"]))
    P.append((xform(lathe([(0.02, 0), (0.02, 0.12), (0.026, 0.13)], seg=10), T(l / 2 - 0.1, h - 0.03, 0)), "Hard", C["brass"]))
    P.append((xform(sweep([(0.011 * math.cos(a), 0.011 * math.sin(a)) for a in [k * math.pi / 4 for k in range(9)]], [(0, 0.12, 0), (0, 0.2, 0), (-0.07, 0.17, 0)]), T(l / 2 - 0.1, h - 0.03, 0)), "Hard", C["brass"]))
    return P

def washbasin(w=0.8, d=0.48, wood=None):
    wood = wood or C["green_paint"]
    P = [(xform(box(w, 0.48, d, bevel=0.006, seg=1, oy=0.36), T(0, 0, 0)), "Wood", wood)]
    P.extend(shaker(w / 2 - 0.01, 0.44, wood, -w / 4, 0.38, d / 2))
    P.extend(shaker(w / 2 - 0.01, 0.44, wood, w / 4, 0.38, d / 2))
    for sx in (-1, 1): P.append((xform(tapered_leg(0.36, 0.02, 0.017), T(sx * (w / 2 - 0.04), 0, d / 2 - 0.04)), "Wood", wood))
    for sx in (-1, 1): P.append((xform(tapered_leg(0.36, 0.02, 0.017), T(sx * (w / 2 - 0.04), 0, -d / 2 + 0.04)), "Wood", wood))
    P.append((box(w + 0.02, 0.03, d + 0.02, bevel=0.005, seg=2, oy=0.84), "Hard", C["marble_white"]))
    P.append((xform(lathe([(0.0, 0.0), (0.12, 0.0), (0.2, 0.04), (0.22, 0.13), (0.21, 0.135), (0.19, 0.05), (0.11, 0.015), (0.0, 0.018)], seg=36, cap_top=False, sx=1.0, sz=0.8), T(0, 0.87, 0.02)), "Hard", C["enamel_white"]))
    P.append((xform(lathe([(0.018, 0), (0.016, 0.16), (0.02, 0.17)], seg=10), T(0, 0.87, -d / 2 + 0.06)), "Hard", C["steel"]))
    P.append((xform(sweep([(0.009 * math.cos(a), 0.009 * math.sin(a)) for a in [k * math.pi / 4 for k in range(9)]], [(0, 0.16, 0), (0, 0.19, 0.05), (0, 0.15, 0.12)]), T(0, 0.87, -d / 2 + 0.06)), "Hard", C["steel"]))
    return P

def toilet():
    P = [(lathe([(0.13, 0), (0.14, 0.03), (0.12, 0.2), (0.17, 0.36), (0.19, 0.4)], seg=28, cap_top=False, sx=1.0, sz=1.3), "Hard", C["enamel_white"]),
         (xform(lathe([(0.19, 0.4), (0.2, 0.41), (0.19, 0.43), (0.12, 0.43), (0.11, 0.41)], seg=28, cap_top=False, sx=1.0, sz=1.3), T(0, 0.0, 0)), "Hard", C["enamel_white"]),
         (xform(box(0.42, 0.4, 0.18, bevel=0.03, seg=3, oy=0.4), T(0, 0, -0.3)), "Hard", C["enamel_white"]),
         (xform(box(0.44, 0.03, 0.2, bevel=0.012, seg=2, oy=0.8), T(0, 0, -0.3)), "Hard", C["enamel_white"])]
    return P

def towel_rail(w=0.5, h=0.9):
    P = []
    for sx in (-1, 1): P.append((xform(lathe([(0.012, 0), (0.012, h)], seg=8), T(sx * w / 2, 0.15, 0)), "Hard", C["steel"]))
    for k in range(7): P.append((xform(lathe([(0.008, -w / 2), (0.008, w / 2)], seg=6), T(0, 0.2 + k * (h - 0.1) / 6, 0, rz=90)), "Hard", C["steel"]))
    P.append((xform(cloth(w * 0.85, 0.5, folds=3, depth=0.01, seg_y=4, seed=3), T(0, 0.2 + 5 * (h - 0.1) / 6, 0.02)), "Fabric", fabric(0xD8CBB4, "knit")))
    return P

def desk(w=1.1, d=0.55, wood=None):
    wood = wood or C["oak"]
    P = [(box(w, 0.03, d, bevel=0.006, seg=2, oy=0.72), "Wood", wood), (xform(box(w - 0.1, 0.08, 0.02, oy=0.64), T(0, 0, d / 2 - 0.05)), "Wood", wood)]
    for sx in (-1, 1):
        for sz in (-1, 1): P.append((xform(tapered_leg(0.72, 0.02, 0.014), T(sx * (w / 2 - 0.05), 0, sz * (d / 2 - 0.05))), "Wood", wood))
    P.append((xform(box(0.32, 0.015, 0.23, bevel=0.003, seg=1, oy=0.75), T(-0.2, 0, 0.05, ry=-8)), "Hard", C["paper"]))
    return P

def desk_lamp():
    P = [(lathe([(0.0, 0), (0.08, 0.0), (0.085, 0.02), (0.02, 0.03)], seg=20), "Hard", C["black_iron"]),
         (xform(lathe([(0.008, 0), (0.008, 0.38)], seg=6), T(0, 0.02, 0, rx=-15)), "Hard", C["black_iron"]),
         (xform(lathe([(0.008, 0), (0.008, 0.3)], seg=6), T(0, 0.38, -0.1, rx=60)), "Hard", C["black_iron"])]
    sh = lathe([(0.02, 0), (0.05, -0.03), (0.08, -0.12)], seg=24, cap_top=False)
    bmesh.ops.solidify(sh, geom=list(sh.faces), thickness=0.003)
    P.append((xform(sh, T(0, 0.52, 0.16, rx=-40)), "Hard", col(0x2F4A3E, "Hard", "enamel")))
    P.append((xform(lathe([(0.0, -0.1), (0.03, -0.085), (0.0, -0.06)], seg=12), T(0, 0.52, 0.16, rx=-40)), "Glow", col(0xFFF4DE, "Glow", "bulb")))
    return P

def coat_rack(w=0.9):
    P = [(xform(box(w, 0.12, 0.022, bevel=0.006, seg=2, oy=1.62), T(0, 0, -0.01)), "Wood", C["oak"])]
    rnd = random.Random(7)
    for k in range(4):
        x = -w / 2 + 0.12 + k * (w - 0.24) / 3
        P.append((xform(lathe([(0.01, 0), (0.01, 0.07), (0.016, 0.08)], seg=8), T(x, 1.68, 0, rx=70)), "Hard", C["brass"]))
        if k in (0, 2):     # a coat hanging
            c = cloth(0.4, 0.95, folds=4, depth=0.03, seg_y=6, gather_top=0.45, gather_bot=1.05, seed=k)
            P.append((xform(c, T(x, 1.7, 0.09, ry=rnd.uniform(-10, 10))), "Fabric", fabric(rnd.choice([0x2B3640, 0x6B4A32, 0x3B3B3B]), "weave")))
    return P

def dresser(w=1.3, h=1.95, d=0.45, wood=None):
    """A kitchen dresser (vaisselier): a buffet with drawers, a glazed upper cabinet with plates."""
    wood = wood or C["oak"]
    P = [(box(w, 0.86, d, bevel=0.006, seg=1, oy=0.06), "Wood", wood), (box(w + 0.04, 0.035, d + 0.03, bevel=0.008, seg=2, oy=0.92), "Wood", wood),
         (box(w - 0.04, 0.06, d - 0.04, oy=0.0), "Wood", wood)]
    for i in range(3):
        x = -w / 2 + w / 3 * (i + 0.5)
        P.extend(shaker(w / 3 - 0.012, 0.18, wood, x, 0.7, d / 2))
        P.extend(shaker(w / 3 - 0.012, 0.5, wood, x, 0.12, d / 2))
        P.append((xform(lathe([(0.008, 0), (0.008, 0.02), (0.014, 0.03)], seg=8), T(x, 0.79, d / 2 + 0.02, rx=90)), "Hard", C["brass"]))
    ud = 0.3
    P.append((xform(box(w - 0.06, h - 0.98, 0.015), T(0, 0.955, -d / 2 + 0.01)), "Wood", wood))
    for sx in (-1, 1): P.append((xform(box(0.025, h - 0.98, ud), T(sx * (w / 2 - 0.04), 0.955, -d / 2 + ud / 2)), "Wood", wood))
    for y in (1.3, 1.62): P.append((xform(box(w - 0.1, 0.02, ud - 0.02, oy=y), T(0, 0, -d / 2 + ud / 2)), "Wood", wood))
    P.append((xform(box(w - 0.02, 0.05, ud + 0.04, bevel=0.008, seg=2, oy=h - 0.03), T(0, 0, -d / 2 + ud / 2)), "Wood", wood))
    for y in (1.32, 1.64):     # plates standing on the shelves
        for k in range(5):
            P.append((xform(lathe([(0.0, 0), (0.1, 0.0), (0.11, 0.012), (0.0, 0.006)], seg=24), T(-w / 2 + 0.17 + k * 0.24, y + 0.11, -d / 2 + 0.08, rx=80)), "Hard", C["enamel_white"]))
    return P

def curtain_pair(width, drop, fab, rod_c=None, seed=0):
    """Two drapes and a rod over a window `width` wide; the rod at y = 0, the drapes hang down from it at z = 0."""
    rod_c = rod_c or C["brass"]
    P = [(xform(lathe([(0.012, -width / 2 - 0.25), (0.012, width / 2 + 0.25)], seg=10, cap_top=True, cap_bottom=True), T(0, 0, 0, rz=90)), "Hard", rod_c)]
    for sx in (-1, 1):
        P.append((xform(lathe([(0.0, 0), (0.025, 0.005), (0.026, 0.03), (0.0, 0.05)], seg=12), T(sx * (width / 2 + 0.28), 0, 0, rz=-90 * sx)), "Hard", rod_c))
        cw = 0.55
        c = cloth(cw, drop, folds=6, depth=0.035, seg_y=10, gather_top=1.0, gather_bot=0.9 + 0.1 * random.Random(seed + sx).random(), seed=seed + sx)
        P.append((xform(c, T(sx * (width / 2 + 0.25 - cw / 2), -0.03, 0.0)), "Fabric", fab))
    return P

def sheer(width, drop, seed=0):
    """A lace half-curtain (vitrage, very Belgian) on a thin rod across the lower sash."""
    c = cloth(width - 0.02, drop, folds=10, depth=0.012, seg_y=4, seed=seed)
    return [(c, "Fabric", fabric(0xEEE9DE, "linen"))]
