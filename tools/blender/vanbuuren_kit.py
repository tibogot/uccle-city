"""VILLA VAN BUUREN: the geometry kit (builder, frames, brick course fields, boxes, sweeps), imported by
tools/blender/vanbuuren.py (sys.path = this folder).

Frame (tools/vanbuuren_measure.py -> models/vanbuuren/site.json): u ~ east, w ~ south, heights m TAW. Blender: x = u,
y = -w, z = TAW - OY. glTF (Y up) -> three.js local (u, TAW - OY, w): the node goes at the city position of the frame
origin, height OY, rotation.y = -rotation.

OWNER'S ASSET RULES built in (HANDOFF.md):
  - no coplanar / near-coincident overlaps: attachments start INSIDE the surface they sit on (they cross it at 90 deg),
    course grooves end one groove depth short of a convex corner (the corner brick is solid), the next wall's groove
    starts there; reveals are split at every course line (no T-junctions with the courses);
  - no bad shading: every face is FLAT (its own normal) unless the builder marks it smooth (round parts only, enough
    segments); walls are strips of planar quads, no fans (openings are cut out of the course strips, not tessellated).
"""
import math
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

OY = 90.0
Z = Vector((0, 0, 1))
def P(u, w, h): return Vector((u, -w, h - OY))
def hz(h): return h - OY

SLOTS = ["brick_orange_amsterdam", "brick_pattern", "concrete_white", "roof_tiles_flat_dark", "wood_varnished", "wood_frame_white",
         "glass_window", "glass_leaded", "oak_door", "metal_green_veranda", "zinc_gutter", "stone_blue"]
(BRICK, BPAT, CONC, TILES, WOODV, WOODW, GLASS, LEAD, OAK, GREEN, ZINC, BLUE) = range(12)
CODES = ["plain", "course", "joint", "reveal", "lattice", "sill", "soffit", "drip", "frame", "bar", "pane", "lead", "panel",
         "ridge", "coping", "interior"]
(C_PLAIN, C_COURSE, C_JOINT, C_REVEAL, C_LATTICE, C_SILL, C_SOFFIT, C_DRIP, C_FRAME, C_BAR, C_PANE, C_LEAD, C_PANEL,
 C_RIDGE, C_COPING, C_INT) = range(16)

# brick (Amsterdam School: small orange-red bricks, stretcher bond, the BED joints raked deep, the perpends flush)
COURSE = 0.0625          # one course: a 50 mm brick + a 12.5 mm bed joint
JOINT = 0.0125
GROOVE = 0.013           # rake depth of the bed joints
COURSE_BASE = 90.0       # course k spans [COURSE_BASE + k COURSE, + COURSE]: the same levels on every wall

class Builder:
    """faces + per-face slot, code, optional UV0, construction group (lightmap islands), smooth flag, region width
    override (metres; None = computed from the mesh), lightmap projection group (planar lightmap islands for course
    fields: (group id, origin, s axis, v axis) or None = smart project)"""
    def __init__(self):
        self.v = []; self.f = []; self.m = []; self.c = []; self.uv = []; self.g = []; self.sm = []; self.rw = []; self.lp = []
        self.grp = 0; self.smooth = False; self.rw_cur = None; self.lp_cur = None
    def face(self, pts, mat, code=0, uv=None):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.m.append(mat); self.c.append(code); self.uv.append(uv)
        self.g.append(self.grp); self.sm.append(self.smooth); self.rw.append(self.rw_cur); self.lp.append(self.lp_cur)
    def new_group(self): self.grp += 1

class K:            # the active builder + LOD flag (set by the main script)
    B = None
    FAR = False

def newell(pts):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n
def face_dir(pts, want, mat, code=0, uv=None):
    pts = list(pts)
    if newell(pts).dot(want) < 0:
        pts.reverse(); uv = list(reversed(uv)) if uv else None
    K.B.face(pts, mat, code, uv)
def quad(a, b, c, d, mat, code=0, uv=None): K.B.face([a, b, c, d], mat, code, uv)

class Frame:
    """a vertical wall plane: origin O (Blender), outward normal N (horizontal), U = Z x N (left -> right seen from
    outside), V = Z. p(s, h, d): h in m TAW, d along N (out of the wall)."""
    def __init__(self, O, N):
        self.O = Vector((O.x, O.y, 0)); self.N = Vector((N.x, N.y, 0)).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, s, h, d=0.0): return self.O + self.U * s + Z * hz(h) + self.N * d
    @staticmethod
    def of(ua, wa, ub, wb):
        """the wall from (ua, wa) to (ub, wb), traversed left -> right as seen from outside (outward = right of travel
        in the (u, w) plane seen from above with w down = left of travel in Blender x, y)"""
        A, Bp = P(ua, wa, OY), P(ub, wb, OY)
        d = (Bp - A); d.z = 0; d.normalize()
        N = Vector((d.y, -d.x, 0))          # Blender: outward = right of travel (Z x N = d)
        fr = Frame(A, N)
        return fr, (Bp - A).length

def ccw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))
def rect(s0, v0, s1, v1): return [(s0, v0), (s1, v0), (s1, v1), (s0, v1)]

def fill_rect_grid(fr, s_cuts, h_cuts, d, mat, code, holes=(), want=None):
    """a planar region as a grid of quads (no fans): cells between consecutive cuts, minus the hole rectangles"""
    for i in range(len(s_cuts) - 1):
        for j in range(len(h_cuts) - 1):
            s0, s1, h0, h1 = s_cuts[i], s_cuts[i + 1], h_cuts[j], h_cuts[j + 1]
            if s1 - s0 < 1e-5 or h1 - h0 < 1e-5: continue
            cs, ch = (s0 + s1) / 2, (h0 + h1) / 2
            if any(a <= cs <= b and c <= ch <= e for (a, c, b, e) in holes): continue
            face_dir([fr.p(s0, h0, d), fr.p(s1, h0, d), fr.p(s1, h1, d), fr.p(s0, h1, d)], want or fr.N, mat, code,
                     [(s0, h0), (s1, h0), (s1, h1), (s0, h1)])

def box(O, U, V, N, u0, u1, v0, v1, w0, w1, mat, code=0, skip=()):
    Pp = lambda u, v, w: O + U * u + V * v + N * w
    F = {"front": [Pp(u0, v0, w1), Pp(u1, v0, w1), Pp(u1, v1, w1), Pp(u0, v1, w1)],
         "back": [Pp(u1, v0, w0), Pp(u0, v0, w0), Pp(u0, v1, w0), Pp(u1, v1, w0)],
         "top": [Pp(u0, v1, w1), Pp(u1, v1, w1), Pp(u1, v1, w0), Pp(u0, v1, w0)],
         "bottom": [Pp(u0, v0, w0), Pp(u1, v0, w0), Pp(u1, v0, w1), Pp(u0, v0, w1)],
         "right": [Pp(u1, v0, w1), Pp(u1, v0, w0), Pp(u1, v1, w0), Pp(u1, v1, w1)],
         "left": [Pp(u0, v0, w0), Pp(u0, v0, w1), Pp(u0, v1, w1), Pp(u0, v1, w0)]}
    cen = Pp((u0 + u1) / 2, (v0 + v1) / 2, (w0 + w1) / 2)
    for k, pts in F.items():
        if k in skip: continue
        face_dir(pts, sum(pts, Vector()) / 4 - cen, mat, code)
def fbox(fr, s0, s1, h0, h1, d0, d1, mat, code=0, skip=("back",)):
    """a box on a wall frame: s, h (m TAW), d (out of the wall). Starts inside the wall (d0 < 0) when it sits on it."""
    box(fr.O, fr.U, Z, fr.N, s0, s1, hz(h0), hz(h1), d0, d1, mat, code, skip)
def hbox(u0, u1, w0, w1, h0, h1, mat, code=0, skip=()):
    """an axis-aligned box in the building frame"""
    box(P(0, 0, OY), Vector((1, 0, 0)), Z, Vector((0, -1, 0)), u0, u1, hz(h0), hz(h1), w0, w1, mat, code, skip)

def lathe(center, profile, segs, mat, code=0, cap_top=False, cap_bottom=False, smooth=True, axis=Z, ref=Vector((1, 0, 0))):
    """solid of revolution: profile [(r, t)] (t along the axis); arc-length UVs; smooth (round parts)"""
    axis = axis.normalized(); X = (ref - axis * ref.dot(axis)).normalized(); Y = axis.cross(X)
    ang = [2 * math.pi * k / segs for k in range(segs + 1)]
    rings = [[center + (X * math.cos(a) + Y * math.sin(a)) * r + axis * t for a in ang] for r, t in profile]
    sacc = [0.0]
    for i in range(1, len(profile)):
        sacc.append(sacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    K.B.new_group(); sv = K.B.smooth; K.B.smooth = smooth
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]; rm = max(r0, r1, 0.02)
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
            u0, u1 = rm * 2 * math.pi * k / segs, rm * 2 * math.pi * (k + 1) / segs
            uv = [(u0, sacc[i]), (u1, sacc[i]), (u1, sacc[i + 1]), (u0, sacc[i + 1])]
            if r1 < 1e-6: K.B.face([a, b, d], mat, code, [uv[0], uv[1], uv[3]])
            elif r0 < 1e-6: K.B.face([a, c, d], mat, code, [uv[0], uv[2], uv[3]])
            else: K.B.face([a, b, c, d], mat, code, uv)
    K.B.smooth = False
    # caps: flat, as rings of quads to the centre (no fan of slivers from one vertex: a centre vertex + quads)
    for (ok, ring, sgn, r) in ((cap_top, rings[-1], 1, profile[-1][0]), (cap_bottom, rings[0], -1, profile[0][0])):
        if not ok or r < 1e-6: continue
        c0 = center + axis * (profile[-1][1] if sgn > 0 else profile[0][1])
        mid = [c0 + (p - c0) * 0.5 for p in ring]
        for k in range(segs):
            face_dir([ring[k], ring[k + 1], mid[k + 1], mid[k]], axis * sgn, mat, code)
        for k in range(0, segs, 2):
            face_dir([mid[k], mid[(k + 1) % segs], mid[(k + 2) % segs], c0], axis * sgn, mat, code)
    K.B.smooth = sv

def pipe(a, b, r, segs, mat, code=0):
    """a round pipe from a to b (smooth sides, open ends: they end inside something)"""
    ax = (b - a); L = ax.length
    ref = Vector((1, 0, 0)) if abs(ax.normalized().x) < 0.9 else Vector((0, 1, 0))
    lathe(a, [(r, 0.0), (r, L)], segs, mat, code, axis=ax, ref=ref)

# ------------------------------------------------------------------------------------------------ brick course fields
def course_bands(h0, h1):
    """the course bands between h0 and h1 (m TAW): [(a, b, kind)] kind 'j' = bed joint (raked), 'f' = brick face"""
    out = []
    k = math.floor((h0 - COURSE_BASE) / COURSE)
    while True:
        base = COURSE_BASE + k * COURSE
        for (a, b, kind) in ((base, base + JOINT, "j"), (base + JOINT, base + COURSE, "f")):
            a2, b2 = max(a, h0), min(b, h1)
            if b2 - a2 > 1e-4: out.append((a2, b2, kind))
        if base + COURSE >= h1 - 1e-6: break
        k += 1
    return out

def snap_course(h, to="f0"):
    """snap a level to the nearest course line: 'f0' = the bottom of a brick face (the top of a joint), 'j0' = the
    bottom of a joint (the top of a brick face)"""
    off = JOINT if to == "f0" else 0.0
    k = round((h - COURSE_BASE - off) / COURSE)
    return COURSE_BASE + k * COURSE + off

