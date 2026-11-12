"""CHATEAU DE WOLVENDAEL: the geometry kit (builder, frames, boxes, chamfered blocks, profile sweeps along a polygon,
lathes, pipes), imported by tools/blender/wolvendael_chateau.py (sys.path = this folder). The builder, frames, box and
lathe are the Villa van Buuren's kit (claude/vanbuuren tools/blender/vanbuuren_kit.py), the rest is new.

Frame (tools/wolvendael_measure.py -> models/wolvendael_chateau/site.json): u along the pond front (u+ = NE), w across
(w- = the pond side), heights m TAW. Blender: x = u, y = -w, z = TAW - OY. glTF (Y up) -> three.js local
(u, TAW - OY, w): the node goes at the city position of the frame origin, height OY, rotation.y = -rotation.

OWNER'S ASSET RULES built in (HANDOFF.md):
  - no coplanar / near-coincident overlaps: an attachment starts INSIDE the surface it sits on (crossing it at 90 deg);
    parts that meet another part's front stop short of it or stand at another depth (glazing bars 5 mm behind the frames'
    fronts, blocks 1.5 cm proud of their plate, ...);
  - no bad shading: every face is FLAT (its own normal) unless the builder marks it smooth (round parts, the mouldings'
    curves, with enough segments); walls are grids of planar quads, no fans (openings are cells left out; arches get
    vertical strips from the arc to a cut line).
"""
import math
from mathutils import Vector

OY = 40.0
Z = Vector((0, 0, 1))
def P(u, w, h): return Vector((u, -w, h - OY))
def hz(h): return h - OY

SLOTS = ["render_white_lime", "stone_white", "stone_blue", "slate", "zinc_roof", "wood_frame_white", "wood_painted_grey",
         "glass_window", "terracotta"]
(RENDER, STONE, BLUE, SLATE, ZINC, WOODW, WOODG, GLASS, TERRA) = range(9)
CODES = ["plain", "block", "joint", "reveal", "sill", "surround", "band", "cornice", "plinth", "keystone", "frame", "bar",
         "pane", "louvre", "hung", "ridge"]
(C_PLAIN, C_BLOCK, C_JOINT, C_REVEAL, C_SILL, C_SURROUND, C_BAND, C_CORNICE, C_PLINTH, C_KEY, C_FRAME, C_BAR, C_PANE,
 C_LOUVRE, C_HUNG, C_RIDGE) = range(16)


class Builder:
    """faces + per-face slot, code, optional UV0, construction group (lightmap islands), smooth flag, region width
    override (metres; None = computed from the mesh)"""
    def __init__(self):
        self.v = []; self.f = []; self.m = []; self.c = []; self.uv = []; self.g = []; self.sm = []; self.rw = []
        self.grp = 0; self.smooth = False; self.rw_cur = None
    def face(self, pts, mat, code=0, uv=None):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.m.append(mat); self.c.append(code); self.uv.append(uv)
        self.g.append(self.grp); self.sm.append(self.smooth); self.rw.append(self.rw_cur)
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


class Frame:
    """a vertical wall plane: origin O (Blender), outward normal N (horizontal), U = Z x N (left -> right seen from
    outside), V = Z. p(s, h, d): h in m TAW, d along N (out of the wall)."""
    def __init__(self, O, N):
        self.O = Vector((O.x, O.y, 0)); self.N = Vector((N.x, N.y, 0)).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, s, h, d=0.0): return self.O + self.U * s + Z * hz(h) + self.N * d
    @staticmethod
    def of(ua, wa, ub, wb):
        """the wall from (ua, wa) to (ub, wb), traversed left -> right as seen from outside"""
        A, Bp = P(ua, wa, OY), P(ub, wb, OY)
        d = (Bp - A); d.z = 0; d.normalize()
        N = Vector((d.y, -d.x, 0))
        return Frame(A, N), (Bp - A).length


def box(O, U, V, N, u0, u1, v0, v1, w0, w1, mat, code=0, skip=(), uvs=True):
    Pp = lambda u, v, w: O + U * u + V * v + N * w
    F = {"front": ([Pp(u0, v0, w1), Pp(u1, v0, w1), Pp(u1, v1, w1), Pp(u0, v1, w1)], [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]),
         "back": ([Pp(u1, v0, w0), Pp(u0, v0, w0), Pp(u0, v1, w0), Pp(u1, v1, w0)], [(-u1, v0), (-u0, v0), (-u0, v1), (-u1, v1)]),
         "top": ([Pp(u0, v1, w1), Pp(u1, v1, w1), Pp(u1, v1, w0), Pp(u0, v1, w0)], [(u0, w1), (u1, w1), (u1, w0), (u0, w0)]),
         "bottom": ([Pp(u0, v0, w0), Pp(u1, v0, w0), Pp(u1, v0, w1), Pp(u0, v0, w1)], [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]),
         "right": ([Pp(u1, v0, w1), Pp(u1, v0, w0), Pp(u1, v1, w0), Pp(u1, v1, w1)], [(w1, v0), (w0, v0), (w0, v1), (w1, v1)]),
         "left": ([Pp(u0, v0, w0), Pp(u0, v0, w1), Pp(u0, v1, w1), Pp(u0, v1, w0)], [(-w0, v0), (-w1, v0), (-w1, v1), (-w0, v1)])}
    cen = Pp((u0 + u1) / 2, (v0 + v1) / 2, (w0 + w1) / 2)
    for k, (pts, uv) in F.items():
        if k in skip: continue
        face_dir(pts, sum(pts, Vector()) / 4 - cen, mat, code, uv if uvs else None)


def fbox(fr, s0, s1, h0, h1, d0, d1, mat, code=0, skip=("back",)):
    """a box on a wall frame: s, h (m TAW), d (out of the wall). Starts inside the wall (d0 < 0) when it sits on it."""
    box(fr.O, fr.U, Z, fr.N, s0, s1, hz(h0), hz(h1), d0, d1, mat, code, skip)


def hbox(u0, u1, w0, w1, h0, h1, mat, code=0, skip=()):
    """an axis-aligned box in the building frame"""
    box(P(0, 0, OY), Vector((1, 0, 0)), Z, Vector((0, -1, 0)), u0, u1, hz(h0), hz(h1), w0, w1, mat, code, skip)


def cblock(fr, s0, s1, h0, h1, d0, d1, ch, mat, code=C_BLOCK, chamfer_sides="lrtb"):
    """a stone block on a wall frame with its front edges chamfered (ch metres, 45 deg) on the given sides: front face
    inset, a bevel quad per chamfered side; the back is not drawn (inside the wall / plate)"""
    cl = ch if "l" in chamfer_sides else 0.0; cr = ch if "r" in chamfer_sides else 0.0
    cb = ch if "b" in chamfer_sides else 0.0; ct = ch if "t" in chamfer_sides else 0.0
    p = lambda s, h, d: fr.p(s, h, d)
    df = d1 - ch
    # front
    face_dir([p(s0 + cl, h0 + cb, d1), p(s1 - cr, h0 + cb, d1), p(s1 - cr, h1 - ct, d1), p(s0 + cl, h1 - ct, d1)], fr.N, mat, code,
             [(s0 + cl, h0 + cb), (s1 - cr, h0 + cb), (s1 - cr, h1 - ct), (s0 + cl, h1 - ct)])
    # bevels + sides: each side a quad from d0 to the bevel start (df or d1), then the bevel quad
    sides = [("b", [(s0, h0), (s1, h0)], [(s0 + cl, h0 + cb), (s1 - cr, h0 + cb)], -Z),
             ("r", [(s1, h0), (s1, h1)], [(s1 - cr, h0 + cb), (s1 - cr, h1 - ct)], fr.U),
             ("t", [(s1, h1), (s0, h1)], [(s1 - cr, h1 - ct), (s0 + cl, h1 - ct)], Z),
             ("l", [(s0, h1), (s0, h0)], [(s0 + cl, h1 - ct), (s0 + cl, h0 + cb)], -fr.U)]
    for key, (a, b), (ia, ib), out in sides:
        has = key in chamfer_sides
        dd = df if has else d1
        face_dir([p(a[0], a[1], d0), p(b[0], b[1], d0), p(b[0], b[1], dd), p(a[0], a[1], dd)], out, mat, code)
        if has:
            # the bevel: from the side's edge at df to the front's inner edge at d1 (corners: the neighbours' insets)
            face_dir([p(a[0], a[1], dd), p(b[0], b[1], dd), p(ib[0], ib[1], d1), p(ia[0], ia[1], d1)], (out + fr.N).normalized(), mat, code)


def lathe(center, profile, segs, mat, code=0, cap_top=False, cap_bottom=False, smooth=True, axis=Z, ref=Vector((1, 0, 0)), a0=0.0, a1=2 * math.pi):
    """solid of revolution: profile [(r, t)] (t along the axis); arc-length UVs; smooth (round parts)"""
    axis = axis.normalized(); X = (ref - axis * ref.dot(axis)).normalized(); Y = axis.cross(X)
    full = abs(a1 - a0 - 2 * math.pi) < 1e-6
    ang = [a0 + (a1 - a0) * k / segs for k in range(segs + 1)]
    rings = [[center + (X * math.cos(a) + Y * math.sin(a)) * r + axis * t for a in ang] for r, t in profile]
    sacc = [0.0]
    for i in range(1, len(profile)):
        sacc.append(sacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    K.B.new_group(); sv = K.B.smooth; K.B.smooth = smooth
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]; rm = max(r0, r1, 0.02)
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
            u0, u1 = rm * (ang[k] - a0), rm * (ang[k + 1] - a0)
            uv = [(u0, sacc[i]), (u1, sacc[i]), (u1, sacc[i + 1]), (u0, sacc[i + 1])]
            if r1 < 1e-6: K.B.face([a, b, d], mat, code, [uv[0], uv[1], uv[3]])
            elif r0 < 1e-6: K.B.face([a, c, d], mat, code, [uv[0], uv[2], uv[3]])
            else: K.B.face([a, b, c, d], mat, code, uv)
    K.B.smooth = False
    for (ok, ring, sgn, r) in ((cap_top, rings[-1], 1, profile[-1][0]), (cap_bottom, rings[0], -1, profile[0][0])):
        if not ok or r < 1e-6 or not full: continue
        c0 = center + axis * (profile[-1][1] if sgn > 0 else profile[0][1])
        mid = [c0 + (p - c0) * 0.5 for p in ring]
        for k in range(segs):
            face_dir([ring[k], ring[k + 1], mid[k + 1], mid[k]], axis * sgn, mat, code)
        for k in range(0, segs, 2):
            face_dir([mid[k], mid[(k + 1) % segs], mid[(k + 2) % segs], c0], axis * sgn, mat, code)
    K.B.smooth = sv


def pipe(a, b, r, segs, mat, code=0, smooth=True):
    """a round pipe from a to b (open ends: they end inside something). Its X axis is horizontal: with 12 or 16 segments
    no facet is exactly horizontal (two crossing pipes never share a coplanar facet)."""
    ax = (b - a); L = ax.length
    ref = Vector((1, 0, 0)) if abs(ax.normalized().x) < 0.9 else Vector((0, 1, 0))
    lathe(a, [(r, 0.0), (r, L)], segs, mat, code, axis=ax, ref=ref, smooth=smooth)


KNOBS = []          # the knobs of the current build (one per place: where three rolls meet, one knob)
def knob(c, r, mat, code=0, rings=6, segs=12):
    """a small sphere (smooth): the zinc knob where rolls meet (covers their open ends)"""
    for (q, rq) in KNOBS:
        if (q - c).length < 0.03: return
    KNOBS.append((c.copy(), r))
    prof = [(r * math.sin(math.pi * i / rings), -r * math.cos(math.pi * i / rings)) for i in range(rings + 1)]
    lathe(c, prof, segs, mat, code, smooth=True)


# ------------------------------------------------------------------------------------------------ polygons
def offset_poly(poly, d):
    """a simple polygon [(u, w)] (any orientation) with every edge moved OUTWARD by d (d < 0: inward); corners = the
    intersections of the moved edges (no collapse handling: the offsets used here are small)"""
    n = len(poly)
    area = sum(poly[i][0] * poly[(i + 1) % n][1] - poly[(i + 1) % n][0] * poly[i][1] for i in range(n)) / 2
    sgn = 1.0 if area > 0 else -1.0
    lines = []
    for i in range(n):
        (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
        L = math.hypot(x2 - x1, y2 - y1); tx, ty = (x2 - x1) / L, (y2 - y1) / L
        nx, ny = ty * sgn, -tx * sgn                      # outward (right of travel for a ccw polygon in (u, w))
        lines.append(((x1 + nx * d, y1 + ny * d), (tx, ty)))
    out = []
    for i in range(n):
        (p1, d1), (p2, d2) = lines[i - 1], lines[i]
        den = d1[0] * d2[1] - d1[1] * d2[0]
        if abs(den) < 1e-9: out.append(p2); continue
        t = ((p2[0] - p1[0]) * d2[1] - (p2[1] - p1[1]) * d2[0]) / den
        out.append((p1[0] + d1[0] * t, p1[1] + d1[1] * t))
    return out


def sweep_closed(poly, profile, mat, code, smooth_steps=(), uv_along=True):
    """a profile [(d, h)] (d = outward offset from the polygon in m, h m TAW) swept round a closed polygon [(u, w)]:
    ring k = offset_poly(poly, d_k) at h_k; one planar quad per edge per profile step (mitred at the corners). UV0 =
    (length along the polygon, length along the profile). smooth_steps: indices of the profile steps drawn smooth (the
    mouldings' curves)."""
    rings = [offset_poly(poly, d) for d, _ in profile]
    n = len(poly)
    pacc = [0.0]
    for i in range(1, len(profile)):
        pacc.append(pacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    K.B.new_group()
    for k in range(len(profile) - 1):
        sv = K.B.smooth; K.B.smooth = k in smooth_steps
        sacc = 0.0
        for i in range(n):
            a0, b0 = rings[k][i], rings[k][(i + 1) % n]; a1, b1 = rings[k + 1][i], rings[k + 1][(i + 1) % n]
            h0, h1 = profile[k][1], profile[k + 1][1]
            L = math.hypot(poly[(i + 1) % n][0] - poly[i][0], poly[(i + 1) % n][1] - poly[i][1])
            pts = [P(a0[0], a0[1], h0), P(b0[0], b0[1], h0), P(b1[0], b1[1], h1), P(a1[0], a1[1], h1)]
            uv = [(sacc, pacc[k]), (sacc + L, pacc[k]), (sacc + L, pacc[k + 1]), (sacc, pacc[k + 1])]
            # orientation: outward + up by the profile's own normal (d increasing outward, h up)
            dd, dh = profile[k + 1][0] - profile[k][0], profile[k + 1][1] - profile[k][1]
            mu, mw = (a0[0] + b0[0]) / 2, (a0[1] + b0[1]) / 2
            (x1, y1), (x2, y2) = poly[i], poly[(i + 1) % n]
            ex, ey = x2 - x1, y2 - y1; El = math.hypot(ex, ey)
            area = sum(poly[j][0] * poly[(j + 1) % n][1] - poly[(j + 1) % n][0] * poly[j][1] for j in range(n))
            s = 1.0 if area > 0 else -1.0
            on_u, on_w = ey / El * s, -ex / El * s       # outward in (u, w)
            out3 = Vector((on_u, -on_w, 0))
            want = out3 * dh - Z * dd                     # normal of the profile segment (rotate (dd, dh) by -90 deg)
            if want.length < 1e-9: want = out3
            face_dir(pts, want, mat, code, uv if uv_along else None)
            sacc += L
        K.B.smooth = sv


def sweep_open(fr, s0, s1, profile, mat, code, smooth_steps=(), caps=True):
    """the same profile along a straight wall stretch s0..s1 of a Frame, square end caps (the profile's polygon)"""
    K.B.new_group()
    pacc = [0.0]
    for i in range(1, len(profile)):
        pacc.append(pacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    for k in range(len(profile) - 1):
        sv = K.B.smooth; K.B.smooth = k in smooth_steps
        (d0, h0), (d1, h1) = profile[k], profile[k + 1]
        want = fr.N * (h1 - h0) - Z * (d1 - d0)
        if want.length < 1e-9: want = fr.N
        face_dir([fr.p(s0, h0, d0), fr.p(s1, h0, d0), fr.p(s1, h1, d1), fr.p(s0, h1, d1)], want, mat, code,
                 [(s0, pacc[k]), (s1, pacc[k]), (s1, pacc[k + 1]), (s0, pacc[k + 1])])
        K.B.smooth = sv
    if caps:
        # the end caps: the profile polygon closed by the wall (d from the profile's back at the wall)
        for s, sg in ((s0, -1), (s1, 1)):
            pts = [fr.p(s, h, d) for d, h in profile]
            dmin = min(d for d, _ in profile)
            pts = [fr.p(s, profile[-1][1], dmin)] + pts if profile[-1][0] != dmin else pts
            # fan-free: as quads between consecutive profile points and the wall line (d = dmin)
            for k in range(len(profile) - 1):
                (da, ha), (db, hb) = profile[k], profile[k + 1]
                if abs(ha - hb) < 1e-6: continue
                q = [fr.p(s, ha, dmin), fr.p(s, hb, dmin), fr.p(s, hb, db), fr.p(s, ha, da)]
                if (db - dmin) < 1e-6 and (da - dmin) < 1e-6: continue
                if (da - dmin) < 1e-6: q = [q[0], q[1], q[2]]
                elif (db - dmin) < 1e-6: q = [q[0], q[1], q[3]]
                face_dir(q, fr.U * sg, mat, code)
