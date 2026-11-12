"""ROYAL OBSERVATORY OF BELGIUM (Uccle, avenue Circulaire 3; Octave Van Rysselberghe, 1883-1890): the campus, built
entirely in code (no hand modelling) from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/observatory.py -- <out_dir> [--no-bake] [--previews]
      <out_dir>/observatory.glb      node "Observatory" (LOD0) + node "Observatory_far" (the scripted far variant); one
                                     primitive per NAMED material slot (brick_red_brussels, stone_white, ...)
      <out_dir>/observatory_ao.png   ambient occlusion (Cycles) in TEXCOORD_1, LOD0 in v 0..0.855, far in v 0.86..1
      <out_dir>/observatory.json     the measurements used, the slots and codes, placement, counts
      docs/observatory/preview_*.png Cycles renders (--previews)

INPUT: <out_dir>/site.json + site_dtm.bin, written by tools/observatory_measure.py from the UrbIS 3D solids (footprints,
base heights) and the UrbIS DSM/DTM 2021 (wall tops, roof crowns, dome centres / radii / springing / tops, the ground).
Details (bands, windows, cornices, consoles, ribs, slits, shutters) follow the reference photos (data/raw/refs/
observatory/, not shipped): estimated, not measured.

SWAPPABLE MATERIALS (the Material Lab's library replaces them by name): the GLB carries NO colour and NO texture.
  - every face is in a NAMED material slot (SLOTS below); one primitive per slot = one draw call per slot;
  - COLOR_0.r = a per-face code (CODES below: wall / band / surround / cornice / rib / shutter / interior ...) /16 + 1/32
    so a library material can vary its look per element (e.g. a weathered band, a darker dome interior);
  - TEXCOORD_0 = world-scale metres, oriented per face (walls: u along the wall, v up; roofs: planar; domes / towers /
    vaults: arc length, continuous), so any library material tiles at the right size;
  - TEXCOORD_1 = the lightmap UV of the baked AO (lighting only, no colour).

Frame: Blender x = city x - OX (east), y = -(city z - OZ) (north), z = m TAW - OY. glTF export (Y up): three.js
(x, y, z) = (city x - OX, TAW - OY, city z - OZ): place it at position (OX, OY, OZ), no rotation.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/observatory")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "observatory")
T0 = time.time()
SITE = json.load(open(os.path.join(OUT, "site.json")))
OX, OY, OZ = 654.0, 100.0, 60.0

SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "copper_patina", "painted_metal_white", "zinc_roof", "slate",
         "render_white", "wood_frame_white", "glass_window", "cast_iron_green", "gravel_path", "lawn_edge"]
BRICK, STONE, BLUE, COPPER, WHITE_METAL, ZINC, SLATE, RENDER, WOOD, GLASS, IRON, GRAVEL, LAWN = range(13)
# per-face codes (COLOR_0.r = code / 16 + 1 / 32)
CODES = ["plain", "band", "surround", "cornice", "plinth", "pilaster", "sill", "keystone", "dome", "rib", "shutter",
         "interior", "seam", "parapet_coping", "console", "door"]
C_PLAIN, C_BAND, C_SUR, C_CORN, C_PLINTH, C_PIL, C_SILL, C_KEY, C_DOME, C_RIB, C_SHUT, C_INT, C_SEAM, C_COPING, C_CONSOLE, C_DOOR = range(16)

Z = Vector((0, 0, 1))
V3 = lambda x, y, z: Vector((x, y, z))
def P(x, z, h=None):
    """city local (x, z) [+ m TAW] -> Blender"""
    return Vector((x - OX, -(z - OZ), 0.0 if h is None else h - OY))
def hz(h): return h - OY

# ------------------------------------------------------------------------------------------------ ground (DTM)
_g = json.load(open(os.path.join(OUT, "site_dtm.json")))
_gd = memoryview(open(os.path.join(OUT, "site_dtm.bin"), "rb").read()).cast("H")
def ground_at(x, z):
    """UrbIS DTM, m TAW, at city (x, z)"""
    c = min(max((x - _g["x0"]) / _g["step"], 0), _g["cols"] - 1.001); r = min(max((z - _g["z0"]) / _g["step"], 0), _g["rows"] - 1.001)
    c0, r0 = int(c), int(r); fc, fr = c - c0, r - r0
    H = lambda i, j: _gd[j * _g["cols"] + i] / 100 + 60
    return (H(c0, r0) * (1 - fc) + H(c0 + 1, r0) * fc) * (1 - fr) + (H(c0, r0 + 1) * (1 - fc) + H(c0 + 1, r0 + 1) * fc) * fr
def ground_b(p):
    """ground under a Blender point, Blender z"""
    return hz(ground_at(p.x + OX, -p.y + OZ))

# ------------------------------------------------------------------------------------------------ builder
class Builder:
    """faces + per-face slot, code, optional UV0, and a construction GROUP (one sweep run, one fill, one lathe column):
    lightmap islands are split by group, so ring-shaped islands (cornice tops, copings, gravel round a building) do
    not waste the map with their bounding boxes"""
    def __init__(self): self.v = []; self.f = []; self.m = []; self.c = []; self.uv = []; self.g = []; self.grp = 0
    def face(self, pts, mat, code=0, uv=None):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.m.append(mat); self.c.append(code); self.uv.append(uv); self.g.append(self.grp)
    def new_group(self): self.grp += 1
B = Builder()
FAR = False

def quad(a, b, c, d, mat, code=0, uv=None): B.face([a, b, c, d], mat, code, uv)

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
    B.face(pts, mat, code, uv)
def face_up(pts, mat, code=0): face_dir(pts, Z, mat, code)

class Frame:
    """Planar wall frame: origin O, outward normal N (horizontal), U = Z x N (rightwards seen from outside), V = Z.
    p(u, v, w): v is the ABSOLUTE Blender z."""
    def __init__(self, O, N):
        self.O = Vector((O.x, O.y, 0)); self.N = Vector((N.x, N.y, 0)).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, u, v, w=0.0): return self.O + self.U * u + Z * v + self.N * w

def ccw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))

def fill2d(fr, loops, w, mat, code=0, flip=False):
    B.new_group()
    loops = [ccw(l) for l in loops]
    flat = [p for l in loops for p in l]
    for t in tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in loops]):
        a, b, c = flat[t[0]], flat[t[1]], flat[t[2]]
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(cr) < 1e-9: continue
        if (cr < 0) != flip: b, c = c, b
        B.face([fr.p(a[0], a[1], w), fr.p(b[0], b[1], w), fr.p(c[0], c[1], w)], mat, code)

def strip2d(fr, loop, w0, w1, mat, code=0, inward=True):
    loop = ccw(loop); n = len(loop)
    for i in range(n):
        a, b = loop[i], loop[(i + 1) % n]
        A0, B0, B1, A1 = fr.p(a[0], a[1], w0), fr.p(b[0], b[1], w0), fr.p(b[0], b[1], w1), fr.p(a[0], a[1], w1)
        if inward: quad(A0, B0, B1, A1, mat, code)
        else: quad(A0, A1, B1, B0, mat, code)

def rect(u0, v0, u1, v1): return [(u0, v0), (u1, v0), (u1, v1), (u0, v1)]

def box(O, U, V, N, u0, u1, v0, v1, w0, w1, mat, code=0, skip=()):
    Pp = lambda u, v, w: O + U * u + V * v + N * w
    F = {"front": [Pp(u0, v0, w1), Pp(u1, v0, w1), Pp(u1, v1, w1), Pp(u0, v1, w1)],
         "back": [Pp(u1, v0, w0), Pp(u0, v0, w0), Pp(u0, v1, w0), Pp(u1, v1, w0)],
         "top": [Pp(u0, v1, w1), Pp(u1, v1, w1), Pp(u1, v1, w0), Pp(u0, v1, w0)],
         "bottom": [Pp(u0, v0, w0), Pp(u1, v0, w0), Pp(u1, v0, w1), Pp(u0, v0, w1)],
         "right": [Pp(u1, v0, w1), Pp(u1, v0, w0), Pp(u1, v1, w0), Pp(u1, v1, w1)],
         "left": [Pp(u0, v0, w0), Pp(u0, v0, w1), Pp(u0, v1, w1), Pp(u0, v1, w0)]}
    for k, pts in F.items():
        if k not in skip: B.face(pts, mat, code)

def fbox(fr, u0, u1, v0, v1, w0, w1, mat, code=0, skip=("back",)):
    box(fr.O, fr.U, Z, fr.N, u0, u1, v0, v1, w0, w1, mat, code, skip)

def bar(fr, a, b, w, width, depth, mat, code=0):
    """a thin bar in the wall plane from (u, v) a to b, at depth w, proud by depth (front + two sides)"""
    pa, pb = fr.p(a[0], a[1], w), fr.p(b[0], b[1], w)
    D = pb - pa; L = D.length
    if L < 1e-4: return
    D.normalize(); S = fr.N.cross(D)
    box(pa, D, S, fr.N, 0, L, -width / 2, width / 2, 0, depth, mat, code, skip=("back", "left", "right"))

def lathe(center, profile, segs, mat, code=0, a0=0.0, cap_bottom=False, uvs=True):
    """Solid of revolution about the vertical through center; profile [(r, z)] (z relative), arc-length UVs."""
    rings = [[center + V3(r * math.cos(a0 + 2 * math.pi * k / segs), r * math.sin(a0 + 2 * math.pi * k / segs), zz) for k in range(segs + 1)] for r, zz in profile]
    sacc = [0.0]
    for i in range(1, len(profile)):
        sacc.append(sacc[-1] + math.hypot(profile[i][0] - profile[i - 1][0], profile[i][1] - profile[i - 1][1]))
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]; rm = max(r0, r1, 0.05)
        for k in range(segs):
            if abs(r1 - r0) > 0.5 * abs(profile[i + 1][1] - profile[i][1]): B.new_group()     # flat-ish rings: a group per segment
            a, b, c, d = rings[i][k], rings[i][k + 1], rings[i + 1][k + 1], rings[i + 1][k]
            u0, u1 = rm * 2 * math.pi * k / segs, rm * 2 * math.pi * (k + 1) / segs
            uv = [(u0, sacc[i]), (u1, sacc[i]), (u1, sacc[i + 1]), (u0, sacc[i + 1])] if uvs else None
            if r1 < 1e-6: B.face([a, b, d], mat, code, [uv[0], uv[1], uv[3]] if uv else None)
            elif r0 < 1e-6: B.face([a, c, d], mat, code, [uv[0], uv[2], uv[3]] if uv else None)
            else: B.face([a, b, c, d], mat, code, uv)
    if cap_bottom and profile[0][0] > 1e-6: B.face(list(reversed(rings[0][:-1])), mat, code)

# ------------------------------------------------------------------------------------------------ profiles
CORNICE_STD = [(0.0, -0.78), (0.05, -0.78), (0.05, -0.52), (0.09, -0.48), (0.09, -0.34), (0.15, -0.28), (0.31, -0.17), (0.37, -0.15), (0.37, 0.0), (0.0, 0.0)]
CORNICE_HERO = [(0.0, -1.0), (0.06, -1.0), (0.06, -0.78), (0.03, -0.78), (0.03, -0.44), (0.12, -0.4), (0.12, -0.3), (0.42, -0.24), (0.5, -0.2), (0.5, -0.04), (0.56, 0.0), (0.0, 0.0)]
CORNICE_TOWER = [(0.0, -0.9), (0.06, -0.9), (0.06, -0.7), (0.1, -0.66), (0.1, -0.5), (0.38, -0.32), (0.46, -0.28), (0.46, -0.1), (0.52, -0.06), (0.52, 0.0), (0.0, 0.0)]
CORNICE_FAR = [(0.0, -0.7), (0.3, -0.25), (0.35, -0.2), (0.35, 0.0), (0.0, 0.0)]
PLINTH_PROF = [(0.0, -0.6), (0.07, -0.6), (0.07, 0.72), (0.03, 0.82), (0.0, 0.82)]           # heights from the base
COPING = [(-0.42, -0.12), (0.06, -0.12), (0.06, 0.0), (-0.42, 0.0)]                          # parapet coping (out, dz)

def miter(n1, n2):
    s = 1 + n1.dot(n2)
    return (n1 + n2) / s if s > 0.2 else (n1 + n2).normalized() * 1.5

def sweep(a, b, ma, mb, n, z0, profile, mat, code, cap_a=False, cap_b=False, closed_back=False):
    """Sweep a profile [(out, dz)] along the wall segment a -> b (Blender, z ignored) at base height z0. ma / mb: offset
    vectors at the ends (miters at polygon corners, n elsewhere). Faces outward; caps where the sweep stops mid-wall."""
    B.new_group()
    L = (Vector((b.x, b.y, 0)) - Vector((a.x, a.y, 0))).length
    pts = [(Vector((a.x, a.y, 0)) + ma * o + Z * (z0 + dz), Vector((b.x, b.y, 0)) + mb * o + Z * (z0 + dz)) for o, dz in profile]
    s = 0.0
    for i in range(len(pts) - 1):
        (A0, B0), (A1, B1) = pts[i], pts[i + 1]
        ds = math.hypot(profile[i + 1][0] - profile[i][0], profile[i + 1][1] - profile[i][1])
        # outward: (B0 - A0) x (A1 - A0) should point away from the wall when the profile runs bottom -> top
        quad(A0, B0, B1, A1, mat, code, [(0, s), (L, s), (L, s + ds), (0, s + ds)])
        s += ds
    if cap_a: face_dir([p[0] for p in pts], -(Vector((b.x, b.y, 0)) - Vector((a.x, a.y, 0))), mat, code)
    if cap_b: face_dir([p[1] for p in pts], (Vector((b.x, b.y, 0)) - Vector((a.x, a.y, 0))), mat, code)

# ------------------------------------------------------------------------------------------------ openings
class Win:
    """A rectangular window (or door) with a proud stone surround, stone reveal, white frame (mullion + transom), glass,
    a stone sill; hero: keystone, hood cornice and diamond glazing bars (the photos)."""
    def __init__(self, uc, sill, head, w, hero=False, kind="win", sur=0.17, depth=0.26):
        self.__dict__.update(uc=uc, sill=sill, head=head, w=w, hero=hero, kind=kind, sur=sur, depth=depth)
    def outer(self):
        b = self.sill - (0.06 if self.kind in ("win", "arch") else 0.0)
        if self.kind == "arch":           # the hole: the round-headed surround, as a polygon
            r, sp = self.w / 2 + self.sur, self.head - self.w / 2
            return [(self.uc - r, b), (self.uc + r, b)] + [(self.uc + r * math.cos(math.pi * i / 8), sp + r * math.sin(math.pi * i / 8)) for i in range(9)]
        return rect(self.uc - self.w / 2 - self.sur, b, self.uc + self.w / 2 + self.sur, self.head + self.sur)
    def span(self): return (self.uc - self.w / 2 - self.sur - 0.15, self.uc + self.w / 2 + self.sur + 0.15)
    def build(self, fr):
        uc, w, s0, s1, sur = self.uc, self.w, self.sill, self.head, self.sur
        if FAR:
            fill2d(fr, [rect(uc - w / 2, s0, uc + w / 2, s1 - (w / 2 if self.kind == "arch" else 0))], 0.03, WOOD if self.kind == "door" else GLASS, C_DOOR if self.kind == "door" else 0)
            return
        inner = rect(uc - w / 2, s0, uc + w / 2, s1)
        out = self.outer()
        pr = 0.06
        if self.kind == "arch":
            sp = s1 - w / 2
            arc = lambda r, b: [(uc - r, b), (uc + r, b)] + [(uc + r * math.cos(math.pi * i / 8), sp + r * math.sin(math.pi * i / 8)) for i in range(9)]
            inner_a = arc(w / 2, s0); out_a = arc(w / 2 + sur, s0 - 0.06)
            fill2d(fr, [out_a, inner_a], pr, STONE, C_SUR)
            strip2d(fr, out_a, pr, 0.0, STONE, C_SUR, inward=False)
            strip2d(fr, inner_a, pr, -self.depth, STONE, C_SUR)
            d = -self.depth + 0.04
            lights(fr, uc - w / 2, uc + w / 2, s0, sp, d, False)
            fill2d(fr, [[(uc + w / 2 * math.cos(math.pi * i / 8), sp + w / 2 * math.sin(math.pi * i / 8)) for i in range(9)]], d - 0.035, GLASS)
            fbox(fr, uc - w / 2 - sur - 0.06, uc + w / 2 + sur + 0.06, s0 - 0.16, s0 - 0.04, 0.0, 0.13, STONE, C_SILL)
            k = [(uc - 0.14, s1 + sur), (uc + 0.14, s1 + sur), (uc + 0.1, s1 - 0.1), (uc - 0.1, s1 - 0.1)]
            fill2d(fr, [k], pr + 0.05, STONE, C_KEY); strip2d(fr, k, pr + 0.05, pr, STONE, C_KEY, inward=False)
            return
        fill2d(fr, [out, inner], pr, STONE, C_SUR)
        strip2d(fr, out, pr, 0.0, STONE, C_SUR, inward=False)
        strip2d(fr, inner, pr, -self.depth, STONE, C_SUR)
        d = -self.depth + 0.04
        if self.kind == "door":
            lt = s0 + (s1 - s0) * 0.74                      # fanlight above
            fill2d(fr, [rect(uc - w / 2, s0, uc + w / 2, lt)], d, WOOD, C_DOOR)
            for su in (-1, 1):                              # two leaves, two raised panels each
                for (v0, v1) in ((s0 + 0.18, s0 + (lt - s0) * 0.42), (s0 + (lt - s0) * 0.5, lt - 0.16)):
                    a0, a1 = (uc + 0.1, uc + w / 2 - 0.12) if su > 0 else (uc - w / 2 + 0.12, uc - 0.1)
                    fbox(fr, a0, a1, v0, v1, d, d + 0.035, WOOD, C_DOOR)
            fbox(fr, uc - w / 2, uc + w / 2, lt - 0.06, lt + 0.04, d, d + 0.08, WOOD, C_DOOR)
            fill2d(fr, [rect(uc - w / 2, lt, uc + w / 2, s1)], d - 0.02, GLASS)
            fbox(fr, uc - 0.03, uc + 0.03, lt, s1, d - 0.02, d + 0.03, WOOD, C_DOOR)
            # the step(s) in front (blue stone): a flight up to a raised floor
            base = getattr(self, "base", s0 - 0.12)
            nst = max(1, round((s0 - base) / 0.17))
            rise = (s0 - base) / nst
            for i in range(nst):
                ww = w / 2 + sur + 0.25 + (0.08 * i if nst > 1 else 0)
                fbox(fr, uc - ww, uc + ww, base - 0.6, s0 - i * rise, 0.0, 0.55 + 0.32 * i, BLUE, C_PLINTH)
            if getattr(self, "portal", False):
                # stone pilasters + a triangular pediment over the portal (inventory 0003_P01)
                for sx in (-1, 1):
                    x0 = uc + sx * (w / 2 + sur)
                    fbox(fr, min(x0, x0 + sx * 0.32), max(x0, x0 + sx * 0.32), s0, s1 + sur, 0.0, 0.12, STONE, C_PIL)
                pz = s1 + sur + 0.05
                fbox(fr, uc - w / 2 - sur - 0.45, uc + w / 2 + sur + 0.45, pz, pz + 0.22, 0.0, 0.25, STONE, C_CORN)
                tri = [(uc - w / 2 - sur - 0.45, pz + 0.22), (uc + w / 2 + sur + 0.45, pz + 0.22), (uc, pz + 1.0)]
                fill2d(fr, [tri], 0.2, STONE, C_CORN); strip2d(fr, tri, 0.2, 0.0, STONE, C_CORN, inward=False)
        else:
            cols = 2 if w > 0.95 else 1
            tr = s0 + (s1 - s0) * 0.7
            fw = 0.065
            panes = []
            for j in range(cols):
                x0 = uc - w / 2 + fw + j * (w - fw) / cols; x1 = uc - w / 2 + (j + 1) * (w - fw) / cols
                panes.append((x0, s0 + fw, x1, tr - fw / 2)); panes.append((x0, tr + fw / 2, x1, s1 - fw))
            fill2d(fr, [inner] + [rect(*q) for q in panes], d, WOOD)
            for q in panes: strip2d(fr, rect(*q), d, d - 0.035, WOOD)
            fill2d(fr, [inner], d - 0.035, GLASS)
            if self.hero:                                   # diamond glazing bars: a lozenge in every pane, X in the upper ones
                for (x0, y0, x1, y1) in panes:
                    mx, my = (x0 + x1) / 2, (y0 + y1) / 2
                    lz = [(mx, y0), (x1, my), (mx, y1), (x0, my)]
                    for i in range(4): bar(fr, lz[i], lz[(i + 1) % 4], d - 0.03, 0.022, 0.025, WOOD)
                    if y0 > tr - 0.01:
                        bar(fr, (x0, y0), (x1, y1), d - 0.03, 0.02, 0.02, WOOD); bar(fr, (x0, y1), (x1, y0), d - 0.03, 0.02, 0.02, WOOD)
            # sill
            fbox(fr, uc - w / 2 - sur - 0.06, uc + w / 2 + sur + 0.06, s0 - 0.16, s0 - 0.04, 0.0, 0.13, STONE, C_SILL)
        if self.hero:
            # keystone and a hood cornice over the surround
            k = [(uc - 0.16, s1 + sur), (uc + 0.16, s1 + sur), (uc + 0.11, s1 - 0.12), (uc - 0.11, s1 - 0.12)]
            fill2d(fr, [k], pr + 0.05, STONE, C_KEY)
            strip2d(fr, k, pr + 0.05, pr, STONE, C_KEY, inward=False)
            h0 = s1 + sur
            fbox(fr, uc - w / 2 - sur - 0.12, uc + w / 2 + sur + 0.12, h0, h0 + 0.1, 0, 0.12, STONE, C_CORN)
            fbox(fr, uc - w / 2 - sur - 0.18, uc + w / 2 + sur + 0.18, h0 + 0.1, h0 + 0.22, 0, 0.2, STONE, C_CORN)

def lights(fr, x0, x1, s0, s1, d, diamond, cols=None):
    """the white frame (mullion + transom) and the glass of one light [x0, x1] x [s0, s1] at depth d; diamond glazing
    bars (a lozenge in every pane, an X in the upper ones) where the photos show them"""
    w = x1 - x0
    cols = cols or (2 if w > 0.95 else 1)
    tr = s0 + (s1 - s0) * 0.7
    fw = 0.065
    panes = []
    for j in range(cols):
        a = x0 + fw + j * (w - fw) / cols; b = x0 + (j + 1) * (w - fw) / cols
        panes.append((a, s0 + fw, b, tr - fw / 2)); panes.append((a, tr + fw / 2, b, s1 - fw))
    inner = rect(x0, s0, x1, s1)
    fill2d(fr, [inner] + [rect(*q) for q in panes], d, WOOD)
    for q in panes: strip2d(fr, rect(*q), d, d - 0.035, WOOD)
    fill2d(fr, [inner], d - 0.035, GLASS)
    if diamond:
        for (a, y0, b, y1) in panes:
            mx, my = (a + b) / 2, (y0 + y1) / 2
            lz = [(mx, y0), (b, my), (mx, y1), (a, my)]
            for i in range(4): bar(fr, lz[i], lz[(i + 1) % 4], d - 0.03, 0.022, 0.025, WOOD)
            if y0 > tr - 0.01:
                bar(fr, (a, y0), (b, y1), d - 0.03, 0.02, 0.02, WOOD); bar(fr, (a, y1), (b, y0), d - 0.03, 0.02, 0.02, WOOD)

class WinGroup:
    """n lights in ONE stone surround, separated by stone mullion-piers (the main building's triplets, the wings' pairs,
    the galleries' triplets: inventory photos 0003_P01 / P03 / P10, owner photo 1)"""
    kind = "group"
    def __init__(self, uc, sill, head, n, wl, mull=0.24, glazing="plain", hero=False, sur=0.17, depth=0.28, cols=None):
        self.__dict__.update(uc=uc, sill=sill, head=head, n=n, wl=wl, mull=mull, glazing=glazing, hero=hero, sur=sur, depth=depth, cols=cols)
        self.w = n * wl + (n - 1) * mull
    def outer(self): return rect(self.uc - self.w / 2 - self.sur, self.sill - 0.06, self.uc + self.w / 2 + self.sur, self.head + self.sur)
    def span(self): return (self.uc - self.w / 2 - self.sur - 0.15, self.uc + self.w / 2 + self.sur + 0.15)
    def xs(self):
        x = self.uc - self.w / 2
        return [(x + i * (self.wl + self.mull), x + i * (self.wl + self.mull) + self.wl) for i in range(self.n)]
    def build(self, fr):
        s0, s1, sur, pr = self.sill, self.head, self.sur, 0.06
        if FAR:
            for (x0, x1) in self.xs(): fill2d(fr, [rect(x0, s0, x1, s1)], 0.03, GLASS)
            return
        inner = rect(self.uc - self.w / 2, s0, self.uc + self.w / 2, s1)
        out = self.outer()
        fill2d(fr, [out, inner], pr, STONE, C_SUR)
        strip2d(fr, out, pr, 0.0, STONE, C_SUR, inward=False)
        strip2d(fr, inner, pr, -self.depth, STONE, C_SUR)
        d = -self.depth + 0.04
        xs = self.xs()
        for i, (x0, x1) in enumerate(xs):
            lights(fr, x0, x1, s0, s1, d, self.glazing == "diamond", self.cols)
            if i: fbox(fr, xs[i - 1][1], x0, s0, s1, -self.depth, pr, STONE, C_PIL, skip=("back",))      # stone mullion-pier
        fbox(fr, self.uc - self.w / 2 - sur - 0.06, self.uc + self.w / 2 + sur + 0.06, s0 - 0.16, s0 - 0.04, 0.0, 0.13, STONE, C_SILL)
        if self.hero:
            h0 = s1 + sur
            fbox(fr, self.uc - self.w / 2 - sur - 0.12, self.uc + self.w / 2 + sur + 0.12, h0, h0 + 0.1, 0, 0.12, STONE, C_CORN)
            fbox(fr, self.uc - self.w / 2 - sur - 0.18, self.uc + self.w / 2 + sur + 0.18, h0 + 0.1, h0 + 0.22, 0, 0.2, STONE, C_CORN)

class Blind:
    """a blind panel: recessed brick in a proud stone frame (the wings' ground floor, owner photo 1)"""
    kind = "blind"
    def __init__(self, uc, sill, head, w, sur=0.17):
        self.__dict__.update(uc=uc, sill=sill, head=head, w=w, sur=sur)
    def outer(self): return rect(self.uc - self.w / 2 - self.sur, self.sill - self.sur, self.uc + self.w / 2 + self.sur, self.head + self.sur)
    def span(self): return (self.uc - self.w / 2 - self.sur - 0.15, self.uc + self.w / 2 + self.sur + 0.15)
    def build(self, fr):
        inner = rect(self.uc - self.w / 2, self.sill, self.uc + self.w / 2, self.head)
        if FAR:
            fill2d(fr, [self.outer(), inner], 0.02, STONE, C_SUR); fill2d(fr, [inner], 0.0, BRICK, C_PLAIN); return
        out = self.outer(); pr = 0.06
        fill2d(fr, [out, inner], pr, STONE, C_SUR)
        strip2d(fr, out, pr, 0.0, STONE, C_SUR, inward=False)
        strip2d(fr, inner, pr, -0.1, STONE, C_SUR)
        fill2d(fr, [inner], -0.1, BRICK, C_PLAIN)

# FAÇADES COUNTED ON PHOTOS: (part, side) -> storeys bottom to top, each a list of items spread evenly along the face
# ("g", n lights, light width, glazing) | ("d", width) door | ("b", width) blind panel | ("a", width) arched window
# Sources: inventory = monument.heritage.brussels/fr/buildings/27031 photos (reference only); owner = the owner's photos.
G = lambda n, wl, gl="plain": ("g", n, wl, gl)
FACADES = {
    # main building, north front (inventory 0003_P01, P10): 2 storeys; triplets of tall narrow lights between banded
    # brick piers with stone blocks; ground floor triplet | portal | triplet, upper floor three triplets
    # measured on the photo at its scale (the face is 17.1 m wide = 610 px: 35.6 px/m): ground floor raised (steps),
    # heads 5.0 m up, sills 1.6; upper sills 7.7, heads 10.5; the groups 4.8 m apart about the axis; a pedimented portal
    ("main_front", "N"): dict(rows=[[G(3, 0.82), ("p", 1.5), G(3, 0.82)], [G(3, 0.82), G(3, 0.82), G(3, 0.82)]],
                              sill=[1.6, 7.7], head=[5.0, 10.5], c=[[-4.8, 0, 4.8], [-4.8, 0, 4.8]], floor=1.0),
    # its long sides (inventory 0003_P10, oblique): pairs, four bays a storey
    ("main_front", "E"): dict(rows=[[G(2, 0.9)] * 4, [G(2, 0.9)] * 4], sill=[1.6, 7.7], head=[5.0, 10.5]),
    ("main_front", "W"): dict(rows=[[G(2, 0.9)] * 4, [G(2, 0.9)] * 4], sill=[1.6, 7.7], head=[5.0, 10.5]),
    # the two court wings (owner photo 1: end bays, ground floor blind panels in stone frames, upper floor PAIRS of tall
    # diamond-glazed lights between broad banded piers; bay 3.9 m from the photo, so 9 bays on the 34 m court side)
    ("wing_e", "W"): [[("b", 1.9)] + [G(2, 1.0)] * 7 + [("b", 1.9)], [G(2, 1.0, "diamond")] * 9],
    ("wing_w", "E"): [[("b", 1.9)] + [G(2, 1.0)] * 7 + [("b", 1.9)], [G(2, 1.0, "diamond")] * 9],
    ("wing_e", "N"): [[("b", 1.9)] * 3, [G(2, 1.0, "diamond")] * 3],
    ("wing_e", "S"): [[("b", 1.9), ("d", 1.4)], [G(2, 1.0, "diamond")] * 2],
    ("wing_w", "S"): [[("b", 1.9)] * 3, [G(2, 1.0, "diamond")] * 3],
    ("wing_w", "N"): [[("b", 1.9), ("b", 1.9)], [G(2, 1.0, "diamond")] * 2],
    # the low galleries (owner photo 1 right, inventory 0003_P03): triplets and pairs between stone piers, doors
    ("gallery_e", "N"): [[G(2, 0.75), G(3, 0.75), ("d", 1.1), G(3, 0.75), G(2, 0.75)]],
    ("gallery_w", "N"): [[G(2, 0.75), G(3, 0.75), ("d", 1.1), G(3, 0.75), G(2, 0.75)]],
    ("gallery_e", "S"): [[G(3, 0.75), G(3, 0.75), G(3, 0.75)]],
    ("gallery_w", "S"): [[G(3, 0.75), G(3, 0.75), G(3, 0.75)]],
    # great equatorial block (inventory 0003_P04): two storeys of two-light windows with transoms
    ("great_eq", "E"): [[G(1, 1.25), G(1, 1.25)], [G(1, 1.25), G(1, 1.25)]],
    ("great_eq", "W"): [[G(1, 1.25), G(1, 1.25)], [G(1, 1.25), G(1, 1.25)]],
    ("great_eq", "N"): [[("d", 1.4)], [G(1, 1.25)]],
    # domed pavilions (inventory 0003_P08): one storey on a tall plinth, two wide windows (two lights, transom, many
    # panes) either side of a glazed double door
    ("pav_sw", "E"): [[G(1, 1.6), ("d", 1.15), G(1, 1.6)]],
    ("pav_sw", "W"): [[G(1, 1.6), G(1, 1.6)]], ("pav_sw", "N"): [[G(1, 1.6), G(1, 1.6)]], ("pav_sw", "S"): [[G(1, 1.6), G(1, 1.6)]],
    ("pav_w", "S"): [[G(1, 1.6), ("d", 1.15), G(1, 1.6)]],
    ("pav_w", "N"): [[G(1, 1.6), G(1, 1.6), G(1, 1.6)]], ("pav_w", "E"): [[G(1, 1.6), G(1, 1.6)]], ("pav_w", "W"): [[G(1, 1.6), G(1, 1.6)]],
    # the residences (inventory 0001_P01 / P02, 0007_P01 / P02): stone front onto the avenue, 3 bays x 3 storeys
    # (arched ground floor + arched door, tall first-floor windows under hoods, small square top windows); brick sides,
    # 4 bays (arched ground floor)
    ("house_w", "N"): [[("a", 1.1), ("d", 1.3), ("a", 1.1)], [G(1, 1.15), G(1, 1.15), G(1, 1.15)], [G(1, 0.85), G(1, 0.85), G(1, 0.85)]],
    ("house_e", "N"): [[("a", 1.1), ("d", 1.3), ("a", 1.1)], [G(1, 1.15), G(1, 1.15), G(1, 1.15)], [G(1, 0.85), G(1, 0.85), G(1, 0.85)]],
    ("house_w", "E"): [[("a", 1.0)] * 4, [G(1, 1.0)] * 4, [G(1, 0.85)] * 4], ("house_w", "W"): [[("a", 1.0)] * 4, [G(1, 1.0)] * 4, [G(1, 0.85)] * 4],
    ("house_e", "E"): [[("a", 1.0)] * 4, [G(1, 1.0)] * 4, [G(1, 0.85)] * 4], ("house_e", "W"): [[("a", 1.0)] * 4, [G(1, 1.0)] * 4, [G(1, 0.85)] * 4],
    ("house_w", "S"): [[("a", 1.0)] * 3, [G(1, 1.0)] * 3, [G(1, 0.85)] * 3], ("house_e", "S"): [[("a", 1.0)] * 3, [G(1, 1.0)] * 3, [G(1, 0.85)] * 3],
}
# wall finish per (part, side) where the photos show other than banded brick: (wall slot, band slot or None)
WALLS = {("house_w", "N"): (STONE, None), ("house_e", "N"): (STONE, None),            # inventory 0001_P01, 0007_P01: stone front
         ("eq_block", "*"): (STONE, BLUE), ("eq_n", "*"): (STONE, BLUE), ("eq_s", "*"): (STONE, BLUE)}   # 0003_P03: white / grey stone
# plinth heights where the photos show a tall one (pavilions on a raised floor: 0003_P08)
PLINTH_H = {"pav_sw": 1.35, "pav_w": 1.35}

def side_of(N):
    return ("E" if N.x > 0 else "W") if abs(N.x) > abs(N.y) else ("N" if N.y > 0 else "S")

def wall_finish(part, side):
    return WALLS.get((part.id, side)) or WALLS.get((part.id, "*")) or (BRICK, STONE)

def spec_openings(part, side, L, hero, corn_lim):
    """the openings of a façade counted on a photo: storeys share the wall height above the plinth"""
    spec = FACADES[(part.id, side)]
    if isinstance(spec, dict):
        return spec_metric(part, spec, L, hero)
    rows = spec
    ph = PLINTH_H.get(part.id, 0.82)
    z0 = part.fb + ph + 0.13
    sh = (corn_lim - 0.2 - z0) / len(rows)
    out = []
    for k, row in enumerate(rows):
        zf = z0 + k * sh
        top = len(rows) > 1 and k == len(rows) - 1 and len(rows) >= 3          # the residences' low top storey
        sill = zf + (0.15 if part.style == "gallery" or len(rows) == 1 and ph > 1 else 0.7)
        head = zf + sh - (0.7 if hero else 0.55)
        if top: sill = zf + 0.55; head = min(head, sill + 1.1)
        n = len(row)
        for i, it in enumerate(row):
            uc = (i + 0.5) * L / n
            if it[0] == "g":
                _, nl, wl, gl = it
                h = min(head, sill + max(2.0, 3.0 * wl) if nl > 1 else sill + 2.6 * wl + 0.4)
                out.append(WinGroup(uc, sill, h, nl, wl, glazing=gl, hero=hero and k > 0 and not top))
            elif it[0] == "d":
                h = min(head, part.fb + ph + (3.4 if hero else 2.6))
                out.append(Win(uc, part.fb + ph - 0.05 if ph > 1 else part.fb + 0.12, h, it[1], hero, "door"))
            elif it[0] == "b":
                out.append(Blind(uc, sill, head, it[1]))
            elif it[0] == "a":
                out.append(Win(uc, sill, min(head, sill + 2.4 * it[1]), it[1], hero, "arch"))
    return out

def spec_metric(part, spec, L, hero):
    """a façade measured on a photo: per storey the sill and head heights (m above the base) and the items' centres
    (m from the face's middle), a raised floor reached by steps at the portal"""
    out = []
    for k, row in enumerate(spec["rows"]):
        sill, head = part.fb + spec["sill"][k], part.fb + spec["head"][k]
        cs = (spec.get("c") or [None] * 9)[k] or [(i + 0.5) * L / len(row) - L / 2 for i in range(len(row))]
        for it, cx in zip(row, cs):
            uc = L / 2 + cx
            if it[0] == "g":
                out.append(WinGroup(uc, sill, head, it[1], it[2], glazing=it[3], hero=hero and k > 0))
            elif it[0] in ("d", "p"):
                fl = part.fb + spec.get("floor", 0.12)
                w_ = Win(uc, fl, head + 0.3, it[1], hero, "door")
                w_.base = part.fb; w_.portal = it[0] == "p"
                out.append(w_)
            elif it[0] == "b":
                out.append(Blind(uc, sill, head, it[1]))
    return out

# ------------------------------------------------------------------------------------------------ the plan
PARTS = {p["id"]: p for p in SITE["parts"]}
DOMES = SITE["domes"]
# wall tops [M]: the DSM roof level of each part (site.json p50 / p10), overridden where the part holds a lower or a
# higher piece (read on the DSM cross sections, see NOTES.md)
HW = {"main_front": 113.9, "main_rear": 107.88, "west_wing": 108.70, "links": 101.81, "eq_n": 109.6, "eq_block": 109.8, "eq_w": 106.29,
      "eq_s": 107.43, "meridian": 105.9, "great_eq": 110.48, "gallery_w": 102.44, "gallery_e": 101.9, "pav_e": 108.63, "east_wing": 104.43,
      "block_e": 108.73, "annex_s": 103.29, "glazed": 102.7, "hall_s": 107.95, "front_w": 104.91, "wing_w_n": 105.0, "wing_w": 109.8,
      "wing_e_n": 104.16, "wing_e": 110.8, "wing_e_s": 105.88, "house_w": 112.6, "house_e": 112.6, "tall_w": 116.97, "block_w": 106.25,
      "wing_ww": 113.37, "pav_w": 107.03, "pav_sw": 107.47, "octagon": 105.96}
CROWN = {"main_front": 113.9, "eq_n": 110.9, "house_w": 118.2, "house_e": 118.3, "octagon": 108.5, "glazed": 104.5}
DOOR_DIR = {"main_front": "N", "great_eq": "N", "wing_w": "E", "wing_e": "W", "tall_w": "E", "pav_sw": "E", "pav_w": "S", "eq_n": "N",
            "block_e": "N", "front_w": "S", "gallery_w": "S", "house_w": "S", "house_e": "S", "octagon": "N", "pav_e": "S"}
# towers [M]: centre + radius from the UrbIS footprint arc, cornice top from the DSM profile (r just inside the wall)
TOWERS = {"great": dict(r=5.3, top=108.2, door=180, base_part="great_eq"),
          "small": dict(r=4.3, top=109.0, door=200, base_part="west_wing"),        # DSM ~108.5; set just above the wing roof
          "east_open": dict(r=3.6, top=107.4, door=250, base_part="east_wing"),     # DSM blurred (r 3.6): from the photo
          "east_n": dict(r=3.25, top=107.2, door=90, base_part="east_wing")}        # proportions, tower = 2.1 x dome height

class Part:
    def __init__(self, d):
        self.id = d["id"]; self.d = d
        pts = [P(x, z) for x, z in d["poly"]]
        # drop near-duplicate points
        q = []
        for p in pts:
            if not q or (p - q[-1]).length > 0.25: q.append(p)
        if (q[0] - q[-1]).length < 0.25: q.pop()
        # footprint points on a tower's arc (UrbIS draws the tower into its wing) move just inside the tower wall: the
        # wing's walls, cornice and roof then stop inside the tower instead of wrapping it
        for i, p in enumerate(q):
            for t in TW.values():
                dv = Vector((p.x - t["c"].x, p.y - t["c"].y, 0))
                if 0.01 < dv.length < t["r"] + 0.6: q[i] = Vector((t["c"].x, t["c"].y, 0)) + dv.normalized() * (t["r"] - 0.3)
        q2 = []
        for p in q:
            if not q2 or (p - q2[-1]).length > 0.2: q2.append(p)
        if len(q2) > 2 and (q2[0] - q2[-1]).length < 0.2: q2.pop()
        q = q2
        # make CCW (seen from above)
        a = sum(q[i].x * q[(i + 1) % len(q)].y - q[(i + 1) % len(q)].x * q[i].y for i in range(len(q)))
        if a < 0: q.reverse()
        self.pts = q
        self.base = hz(d["base"]); self.top = hz(HW[self.id])
        self.crown = hz(CROWN[self.id]) if self.id in CROWN else None
        self.style = d["style"]; self.roof = d["roof"]
        self.hero = self.style == "hero"
        self.parapet = self.hero and self.roof == "flat" or self.id == "main_front"      # main front: attic (0003_P01)


def edges_of(part):
    n = len(part.pts)
    out = []
    for i in range(n):
        a, b = part.pts[i], part.pts[(i + 1) % n]
        d = (b - a); d.z = 0; L = d.length; d.normalize()
        N = Vector((d.y, -d.x, 0))
        out.append((a, b, d, N, L))
    return out

def tower_geo():
    t = {}
    for k, s in TOWERS.items():
        dm = DOMES[k]; c = dm["fit"]["centre"]
        t[k] = dict(s, c=P(c[0], c[1]), ctr=c, base=hz(PARTS[s["base_part"]]["base"]), top_b=hz(s["top"]))
    return t
TW = tower_geo()
PARTS_L = [Part(d) for d in SITE["parts"]]

def cover_intervals(part, a, d, N, L):
    """[(u0, u1, cover height)] along an edge: other parts' walls against it, towers around it"""
    cov = []
    for q in PARTS_L:
        if q is part: continue
        for (qa, qb, qd, qN, qL) in edges_of(q):
            if qd.dot(d) > -0.97: continue
            # distance of q's edge from this edge's line
            if abs((qa - a).dot(N)) > 0.8 or abs((qb - a).dot(N)) > 0.8: continue
            u0, u1 = sorted(((qa - a).dot(d), (qb - a).dot(d)))
            u0, u1 = max(u0, 0), min(u1, L)
            if u1 - u0 > 0.2: cov.append((u0, u1, q.top))
    for k, t in TW.items():
        # portion of the edge inside the tower circle
        c = t["c"]; rel = c - a; rel.z = 0
        along = rel.dot(d); off = rel.dot(N)
        r = t["r"] + 0.1
        if abs(off) < r:
            h = math.sqrt(r * r - off * off)
            u0, u1 = max(along - h, 0), min(along + h, L)
            if u1 - u0 > 0.05: cov.append((u0, u1, t["top_b"]))
    # split [0, L] into sub-intervals with the max cover
    cuts = sorted(set([0.0, L] + [u for c in cov for u in c[:2]]))
    out = []
    for i in range(len(cuts) - 1):
        u0, u1 = cuts[i], cuts[i + 1]
        if u1 - u0 < 1e-3: continue
        m = (u0 + u1) / 2
        h = max([c[2] for c in cov if c[0] <= m <= c[1]], default=-1e9)
        if out and abs(out[-1][2] - h) < 1e-6: out[-1] = (out[-1][0], u1, h)
        else: out.append((u0, u1, h))
    return out

GROUND_OFF = 0.6                     # walls go this far below the part's base (the DTM falls away on some sides)
BAND_PITCH, BAND_H, BAND_D = 0.66, 0.19, 0.025

def storeys(part):
    H = part.top - getattr(part, "fb", part.base)
    ent = 1.6 if part.hero else 0.8
    use = H - 0.9 - ent
    if part.style == "gallery" or use < 3.2: return 1, use
    n = max(1, round(use / 5.0))
    return n, use / n

def bands_z(part, z_lo, z_hi):
    out = []
    z = part.base + PLINTH_H.get(part.id, 0.82) + 0.45
    while z + BAND_H < z_hi:
        if z > z_lo: out.append((z, z + BAND_H))
        z += BAND_PITCH
    return out

def wall_segment(fr, u0, u1, vb, vt, wins, part, bands=True, ext0=0.0, ext1=0.0, finish=None):
    """Wall [u0, u1] x [vb, vt] (banded brick, or the finish the photos show) with window holes, the windows, the bands
    (proud, cut at the openings)."""
    wmat, bmat = finish or (BRICK, STONE)
    if bmat is None: bands = False
    if FAR:
        # in-plane strips: wall / band (no relief), the openings are flat shapes in front
        zs = [vb] + ([z for b in bands_z(part, vb, vt) for z in b] if bands else []) + [vt]
        for i in range(len(zs) - 1):
            if zs[i + 1] - zs[i] < 1e-3: continue
            B.face([fr.p(u0, zs[i]), fr.p(u1, zs[i]), fr.p(u1, zs[i + 1]), fr.p(u0, zs[i + 1])], bmat if i % 2 else wmat, C_BAND if i % 2 else C_PLAIN)
        for w_ in wins: w_.build(fr)
        return
    holes = [w_.outer() for w_ in wins]
    fill2d(fr, [rect(u0, vb, u1, vt)] + holes, 0.0, wmat, C_PLAIN)
    for w_ in wins: w_.build(fr)
    if not bands: return
    for (z0, z1) in bands_z(part, vb, vt):
        # the u intervals not crossed by an opening
        segs = [(u0 - ext0, u1 + ext1)]
        for w_ in wins:
            o = w_.outer(); a, b = min(q[0] for q in o), max(q[0] for q in o); c0, c1 = min(q[1] for q in o), max(q[1] for q in o)
            if z1 <= c0 or z0 >= c1: continue
            ns = []
            for (s0, s1) in segs:
                if b <= s0 or a >= s1: ns.append((s0, s1)); continue
                if a > s0: ns.append((s0, a))
                if b < s1: ns.append((b, s1))
            segs = ns
        for (s0, s1) in segs:
            if s1 - s0 < 0.05: continue
            fbox(fr, s0, s1, z0, z1, 0.0, BAND_D, bmat, C_BAND, skip=("back", "bottom"))

def floor_base(part, E):
    """the ground floor's level: the footprint's lowest DTM point (part.base) is the downhill corner; the floor sits above
    the HIGHEST ground along the exposed walls (the north court is 2.4 m above the main building's south end): the
    plinth grows downhill, openings and string courses follow the floor"""
    g = []
    for (a, b, d, N, L) in E:
        iv = cover_intervals(part, a, d, N, L)
        for k in range(int(L / 2.0) + 1):
            u = min(L, k * 2.0 + 0.5)
            if any(u0 <= u <= u1 and cv < -1e8 for (u0, u1, cv) in iv):
                q = a + d * u + N * 1.2
                g.append(ground_b(q))
    if not g: return part.base
    g.sort()
    return min(part.base + 3.0, max(part.base, g[int(0.85 * (len(g) - 1))] - 0.05))

def build_part(part):
    E = edges_of(part)
    n = len(E)
    part.fb = floor_base(part, E)
    ns_, sh = storeys(part)
    hero = part.hero
    corn = CORNICE_FAR if FAR else (CORNICE_HERO if hero else CORNICE_STD)
    corn_top = part.top - (0.7 if part.parapet else 0.0)
    corn_h = -corn[0][1]
    win_w = 1.4 if hero else (1.1 if part.style == "gallery" else 1.2)
    bay = 3.7 if hero else 3.3
    # the door edge
    door_e = None
    if part.id in DOOR_DIR:
        want = {"N": V3(0, 1, 0), "S": V3(0, -1, 0), "E": V3(1, 0, 0), "W": V3(-1, 0, 0)}[DOOR_DIR[part.id]]
        cands = [i for i in range(n) if E[i][3].dot(want) > 0.9 and E[i][4] > 2.5]
        if cands: door_e = max(cands, key=lambda i: E[i][4])
    exposed_ends = []
    # floor lines: from the photo-measured façades of this part, else the rule's storeys
    strings = []
    for (pid, sd), sp in FACADES.items():
        if pid == part.id and isinstance(sp, dict) and len(sp["rows"]) > 1:
            strings = [part.fb + (sp["head"][k] + sp["sill"][k + 1]) / 2 + 0.17 for k in range(len(sp["rows"]) - 1)]; break
    else:
        lst = [sp for (pid, sd), sp in FACADES.items() if pid == part.id and not isinstance(sp, dict)]
        if lst and len(lst[0]) > 1:                       # same storey split as spec_openings
            z0 = part.fb + PLINTH_H.get(part.id, 0.82) + 0.13; shh = (corn_top - corn_h - 0.2 - z0) / len(lst[0])
            strings = [z0 + k * shh + 0.12 for k in range(1, len(lst[0]))]
        elif part.style != "gallery" and ns_ > 1:
            strings = [part.fb + 0.95 + k * sh + 0.1 for k in range(1, ns_)]
    if FAR: strings = []
    for i, (a, b, d, N, L) in enumerate(E):
        fr = Frame(a, N)
        iv = cover_intervals(part, a, d, N, L)
        exposed_ends.append((iv[0][2] < part.base + 0.5, iv[-1][2] < part.base + 0.5))
        # the openings: counted on a photo (FACADES) for the main face of each side, else the rule (bays, storeys)
        side = side_of(N)
        main_face = L >= max([e[4] for e in E if side_of(e[3]) == side]) - 1e-6
        wins_all = []
        if (part.id, side) in FACADES and main_face:
            wins_all = spec_openings(part, side, L, hero, corn_top - corn_h)
            spec_used.add((part.id, side))
        nb = int((L - 0.6) // bay) if L >= 2.6 and not wins_all and (part.id, side) not in FACADES else 0
        for j in range(nb):
            uc = (j + 0.5) * L / nb
            for k in range(ns_):
                zf = part.fb + 0.95 + k * sh
                sill = zf + (0.45 if part.style == "gallery" else 0.75)
                head = min(zf + sh - (0.75 if hero else 0.55), sill + 2.45 * win_w)
                if part.style == "gallery": head = min(head, corn_top - corn_h - 0.25)
                if head - sill < 1.0: continue
                is_door = (i == door_e and k == 0 and j == nb // 2)
                if is_door:
                    wins_all.append(Win(uc, part.fb + 0.12, min(head, part.fb + 3.4 + (0.6 if hero else 0)), 1.6 if hero else 1.3, hero, "door"))
                else:
                    wins_all.append(Win(uc, sill, head, win_w, hero))
        if i == door_e and nb == 0 and L > 2.0:
            wins_all.append(Win(L / 2, part.fb + 0.12, part.fb + 2.7, 1.1, hero, "door"))
        for (u0, u1, cv) in iv:
            vb = part.base - GROUND_OFF if cv < -1e8 else cv
            if vb >= part.top - 0.02: continue
            wins = [w_ for w_ in wins_all if w_.span()[0] >= u0 and w_.span()[1] <= u1 and min(q[1] for q in w_.outer()) > vb + 0.25
                    and max(q[1] for q in w_.outer()) < corn_top - corn_h - 0.05]
            ext0 = BAND_D if u0 < 1e-3 else 0.0; ext1 = BAND_D if u1 > L - 1e-3 else 0.0
            wall_segment(fr, u0, u1, vb, part.top, wins, part, ext0=ext0, ext1=ext1, finish=wall_finish(part, side))
            # plinth, cornice: sweeps with miters at the polygon corners
            ma = miter(E[i - 1][3], N) if u0 < 1e-3 else N
            mb = miter(N, E[(i + 1) % n][3]) if u1 > L - 1e-3 else N
            pa, pb = a + d * u0, a + d * u1
            if vb < part.base + 0.6:
                plinth_run(a, d, N, u0, u1, L, ma, mb, part.base, wins, PLINTH_H.get(part.id, 0.82) + part.fb - part.base)
            if vb < corn_top - corn_h:
                sweep(pa, pb, ma, mb, N, corn_top, corn, STONE, C_CORN, cap_a=u0 > 1e-3, cap_b=u1 < L - 1e-3)
                if hero and not FAR: modillions(fr, u0, u1, corn_top)
            # stone string courses between the storeys (the photos: a heavy band at each floor line)
            for zs_ in strings:
                if vb < zs_ - 0.4 and zs_ < corn_top - corn_h - 0.3:
                    sweep(pa, pb, ma, mb, N, zs_, [(0.0, -0.34), (0.07, -0.34), (0.07, -0.06), (0.1, -0.03), (0.1, 0.0), (0.0, 0.0)],
                          STONE, C_CORN, cap_a=u0 > 1e-3, cap_b=u1 < L - 1e-3)
            if part.parapet and vb < part.top - 0.1:
                # parapet: inner face, coping
                fill2d(fr, [rect(u0, part.top - 0.75, u1, part.top - 0.12)], -0.3, BRICK, C_PLAIN, flip=True)
                sweep(pa, pb, ma, mb, N, part.top, COPING, STONE, C_COPING, cap_a=u0 > 1e-3, cap_b=u1 < L - 1e-3)
    if part.id == "main_front":
        i = max([k for k in range(n) if side_of(E[k][3]) == "N"], key=lambda k: E[k][4])
        pediment(Frame(E[i][0], E[i][3]), E[i][4] / 2, part.top)
    if not FAR and part.style != "gallery":
        pilasters(part, E, exposed_ends)
    roof(part, E)

def plinth_run(a, d, N, u0, u1, L, ma, mb, base, wins, ph=0.82):
    """the blue-stone plinth along [u0, u1] (ph high: taller under the raised pavilions), interrupted at the doors"""
    prof = [(0.0, -0.6), (0.07, -0.6), (0.07, ph - 0.1), (0.03, ph), (0.0, ph)] if not FAR else [(0, -0.6), (0.06, -0.6), (0.06, ph), (0, ph)]
    cuts = sorted((w_.uc - w_.w / 2 - w_.sur, w_.uc + w_.w / 2 + w_.sur) for w_ in wins if w_.kind == "door")
    runs, s0 = [], u0
    for c0, c1 in cuts:
        if c0 > s0: runs.append((s0, c0))
        s0 = max(s0, c1)
    if s0 < u1: runs.append((s0, u1))
    for r0, r1 in runs:
        if r1 - r0 < 0.02: continue
        sweep(a + d * r0, a + d * r1, ma if r0 < 1e-3 else N, mb if r1 > L - 1e-3 else N, N, base, prof, BLUE, C_PLINTH,
              cap_a=r0 > 1e-3, cap_b=r1 < L - 1e-3)

def pediment(fr, uc, z0, w=4.2, h=1.15):
    """a stone pediment rising from the attic, with a round oculus (the main front's clock: inventory 0003_P01)"""
    tri = [(uc - w / 2, z0), (uc + w / 2, z0), (uc, z0 + h)]
    fill2d(fr, [tri], 0.02, STONE, C_CORN); fill2d(fr, [tri], -0.3, STONE, C_CORN, flip=True)
    for a, b in ((tri[0], tri[2]), (tri[2], tri[1])):
        pa, pb = fr.p(a[0], a[1], 0.0), fr.p(b[0], b[1], 0.0)
        beam(pa + Z * 0.06, pb + Z * 0.06, 0.25, 0.14, STONE, C_COPING)
    if FAR: return
    oc = (uc, z0 + h * 0.4); r = 0.32
    ring = [(oc[0] + (r + 0.09) * math.cos(2 * math.pi * k / 20), oc[1] + (r + 0.09) * math.sin(2 * math.pi * k / 20)) for k in range(20)]
    disc = [(oc[0] + r * math.cos(2 * math.pi * k / 20), oc[1] + r * math.sin(2 * math.pi * k / 20)) for k in range(20)]
    fill2d(fr, [ring, disc], 0.07, STONE, C_SUR); strip2d(fr, ring, 0.07, 0.02, STONE, C_SUR, inward=False)
    fill2d(fr, [disc], 0.04, BLUE, C_PLAIN)

def modillions(fr, u0, u1, top):
    """small stone brackets under the hero cornice's corona"""
    u = u0 + 0.45
    while u < u1 - 0.45:
        fbox(fr, u - 0.06, u + 0.06, top - 0.4, top - 0.24, 0.03, 0.42, STONE, C_CONSOLE, skip=("back", "top"))
        u += 0.62

def pilasters(part, E, ex):
    """stone corner pilasters (strips on both faces of each exposed convex corner)"""
    n = len(E)
    top = part.top - (0.7 if part.parapet else 0.0) - (-(CORNICE_HERO if part.hero else CORNICE_STD)[0][1])
    for i in range(n):
        a, b, d, N, L = E[i]
        pa, pb, pd, pN, pL = E[i - 1]
        if pd.cross(d).z <= 0.1: continue                    # not convex
        if not (ex[i][0] and ex[i - 1][1]): continue
        w = 0.55 if part.hero else 0.42
        if L < 2 * w + 0.5 or pL < 2 * w + 0.5: continue
        f1 = Frame(a, N); fbox(f1, -0.04, w, part.fb + 0.82, top, 0.0, 0.05, STONE, C_PIL, skip=("back", "left"))
        f0 = Frame(pa, pN); fbox(f0, pL - w, pL + 0.04, part.fb + 0.82, top, 0.0, 0.05, STONE, C_PIL, skip=("back", "right"))

def poly_tris(pts, z, mat, code=0):
    B.new_group()
    loop = [Vector((p.x, p.y, 0)) for p in pts]
    for t in tessellate_polygon([loop]):
        face_up([Vector((pts[k].x, pts[k].y, z)) for k in t], mat, code)

def roof(part, E):
    pts = part.pts
    if part.roof == "flat":
        poly_tris(pts, part.top - (0.62 if part.parapet else 0.0), ZINC, C_PLAIN)
        if not FAR and not part.parapet and part.style != "gallery":
            roof_lights(part)
    elif part.roof in ("low", "hip"):
        xs = [p.x for p in pts]; ys = [p.y for p in pts]
        ov = 0.0
        if part.roof == "hip":
            # the residences: a flat deck behind the cornice and a hip set back from the façades (the street photos,
            # inventory 0001_P01 / 0007_P01, show no roof above the cornice; the DSM's 118 m peak is this hip)
            poly_tris(pts, part.top - 0.02, ZINC, C_PLAIN)
            ov = -0.27 * min(max(p_.x for p_ in pts) - min(p_.x for p_ in pts), max(p_.y for p_ in pts) - min(p_.y for p_ in pts))
        x0, x1, y0, y1 = min(xs) - ov, max(xs) + ov, min(ys) - ov, max(ys) + ov
        ez = part.top - (0.62 if part.parapet else 0.0)
        rz = part.crown
        mat = SLATE if part.roof == "hip" else ZINC
        if x1 - x0 >= y1 - y0:
            h = (y1 - y0) / 2; r0, r1 = Vector((x0 + h, (y0 + y1) / 2, rz)), Vector((x1 - h, (y0 + y1) / 2, rz))
        else:
            h = (x1 - x0) / 2; r0, r1 = Vector(((x0 + x1) / 2, y0 + h, rz)), Vector(((x0 + x1) / 2, y1 - h, rz))
        c = [V3(x0, y0, ez), V3(x1, y0, ez), V3(x1, y1, ez), V3(x0, y1, ez)]
        # each eave edge with the nearest ridge end(s)
        def near(p): return r0 if (p - r0).length < (p - r1).length else r1
        for i in range(4):
            p, q = c[i], c[(i + 1) % 4]
            a_, b_ = near(p), near(q)
            if (a_ - b_).length < 1e-6: face_up([p, q, a_], mat, C_PLAIN)
            else: face_up([p, q, b_, a_], mat, C_PLAIN)
        if part.roof == "hip" and not FAR:
            # soffit + fascia, ridge and hip rolls (zinc), two chimneys
            for i in range(4):
                p, q = c[i], c[(i + 1) % 4]
                face_dir([p, q, q - Z * 0.18, p - Z * 0.18], ((p + q) / 2 - V3((x0 + x1) / 2, (y0 + y1) / 2, ez)), ZINC, C_SEAM)
            for e0, e1 in ((r0, r1),) + tuple((c[i], near(c[i])) for i in range(4)):
                if (e1 - e0).length > 0.1: roll(e0, e1, 0.07, ZINC)
            for t in (0.25, 0.75):
                cp = r0.lerp(r1, t) if (r1 - r0).length > 1 else r0 + V3(0.8 * (1 if t > 0.5 else -1), 0, 0)
                ch = Frame(V3(cp.x, cp.y - 0.4, 0), V3(0, -1, 0))
                fbox(ch, -0.45, 0.45, rz - 1.5, rz + 1.1, 0.0, 0.8, BRICK, C_PLAIN, skip=())
                fbox(ch, -0.52, 0.52, rz + 1.1, rz + 1.25, -0.07, 0.87, STONE, C_COPING, skip=())
        if part.roof == "low" and not FAR:
            roll(r0, r1, 0.06, ZINC)
            roof_lights(part, z=None)
    elif part.roof == "pyramid":
        cx = sum(p.x for p in pts) / len(pts); cy = sum(p.y for p in pts) / len(pts)
        apex = V3(cx, cy, part.crown)
        ov = 0.3
        for i in range(len(pts)):
            p, q = pts[i], pts[(i + 1) % len(pts)]
            pe = V3(cx, cy, 0) + (V3(p.x, p.y, 0) - V3(cx, cy, 0)) * (1 + ov / (V3(p.x, p.y, 0) - V3(cx, cy, 0)).length) + Z * (part.top - 0.15)
            qe = V3(cx, cy, 0) + (V3(q.x, q.y, 0) - V3(cx, cy, 0)) * (1 + ov / (V3(q.x, q.y, 0) - V3(cx, cy, 0)).length) + Z * (part.top - 0.15)
            face_up([pe, qe, apex], ZINC, C_PLAIN)
            if not FAR: roll(pe, apex, 0.05, ZINC)
        if not FAR:
            lathe(apex - Z * 0.1, [(0.12, 0), (0.16, 0.15), (0.08, 0.35), (0.03, 0.9), (0.0, 1.1)], 10, IRON, C_PLAIN)
    elif part.roof == "glass":
        pass
    if part.id == "glazed": glazed_roof(part)
    if part.d.get("barrel"): barrel(part, part.d["barrel"])

def roll(p0, p1, r, mat):
    """a ridge / hip roll: a half-round cap along p0 -> p1"""
    d = p1 - p0; L = d.length
    if L < 1e-3: return
    d.normalize(); s = d.cross(Z)
    if s.length < 1e-3: s = V3(1, 0, 0)
    s.normalize(); up = s.cross(d).normalized()
    if up.z < 0: up = -up
    k = 4
    prev = None
    for i in range(k + 1):
        a = math.pi * i / k
        off = s * (math.cos(a) * r) + up * (math.sin(a) * r * 0.8)
        cur = (p0 + off, p1 + off)
        if prev: quad(prev[0], prev[1], cur[1], cur[0], mat, C_SEAM)
        prev = cur

def roof_lights(part, z=None):
    """skylights on the larger flat roofs (the orthophoto shows rows of them on the main blocks): glass hip-boxes"""
    xs = [p.x for p in part.pts]; ys = [p.y for p in part.pts]
    w, h = max(xs) - min(xs), max(ys) - min(ys)
    if w * h < 220: return
    zt = part.top if z is None else z
    long_x = w >= h
    L = (w if long_x else h) - 6; n = max(1, int(L / 6))
    cx, cy = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2
    for i in range(n):
        t = (i + 0.5) / n - 0.5
        px, py = (cx + t * L, cy) if long_x else (cx, cy + t * L)
        inside = point_in(part.pts, px, py)
        if not inside: continue
        sx, sy = (1.6, 3.2) if long_x else (3.2, 1.6)
        base = zt + (0.25 if part.roof == "low" else 0.0)
        if part.roof == "low": base = zt + (part.crown - part.top) * 0.6
        c = [V3(px - sx, py - sy, base), V3(px + sx, py - sy, base), V3(px + sx, py + sy, base), V3(px - sx, py + sy, base)]
        cu = [p + Z * 0.35 for p in c]
        for k in range(4): face_dir([c[k], c[(k + 1) % 4], cu[(k + 1) % 4], cu[k]], (c[k] + c[(k + 1) % 4]) / 2 - V3(px, py, base), ZINC, C_SEAM)
        top = [V3(px - sx * 0.55, py - sy * 0.55, base + 0.9), V3(px + sx * 0.55, py - sy * 0.55, base + 0.9),
               V3(px + sx * 0.55, py + sy * 0.55, base + 0.9), V3(px - sx * 0.55, py + sy * 0.55, base + 0.9)]
        for k in range(4): face_dir([cu[k], cu[(k + 1) % 4], top[(k + 1) % 4], top[k]], (cu[k] + cu[(k + 1) % 4]) / 2 - V3(px, py, base), GLASS, C_PLAIN)
        face_up(top, GLASS, C_PLAIN)

def point_in(pts, x, y):
    ins = False
    for i in range(len(pts)):
        a, b = pts[i], pts[i - 1]
        if (a.y > y) != (b.y > y) and x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x: ins = not ins
    return ins

def glazed_roof(part):
    """the glazed annex: a pitched glass roof on cast-iron glazing bars [M walls 102.7, ridge 104.5 (DSM)]"""
    xs = [p.x for p in part.pts]; ys = [p.y for p in part.pts]
    x0, x1, y0, y1 = min(xs) - 0.1, max(xs) + 0.1, min(ys), max(ys)
    zc, zr = part.top + 0.05, part.crown
    xm = (x0 + x1) / 2
    for s in (-1, 1):
        xe = x0 if s < 0 else x1
        face_up([V3(xe, y0, zc), V3(xe, y1, zc), V3(xm, y1, zr), V3(xm, y0, zr)], GLASS, C_PLAIN)
        if FAR: continue
        y = y0
        while y <= y1 + 1e-3:
            p0, p1 = V3(xe, y, zc + 0.02), V3(xm, y, zr + 0.02)
            beam(p0, p1, 0.03, 0.06, IRON)
            y += 0.8
    for yy in (y0, y1):                                      # gable triangles in glass, ridge beam
        face_dir([V3(x0, yy, zc), V3(x1, yy, zc), V3(xm, yy, zr)], V3(0, -1 if yy == y0 else 1, 0), GLASS, C_PLAIN)
    beam(V3(xm, y0, zr), V3(xm, y1, zr), 0.06, 0.12, IRON)

def beam(p0, p1, hw, hh, mat, code=0):
    d = p1 - p0; L = d.length
    if L < 1e-4: return
    d.normalize(); s = d.cross(Z)
    if s.length < 1e-3: s = V3(1, 0, 0)
    s.normalize(); up = s.cross(d).normalized()
    if up.z < 0: up = -up; s = -s
    box(p0, d, up, d.cross(up).normalized(), 0, L, -hh / 2, hh / 2, -hw, hw, mat, code, skip=("left", "right"))

# ------------------------------------------------------------------------------------------------ barrel vaults
def barrel(part, b):
    """A vault along x (city): the meridian hall [M DSM: crest 111.4, springing ~106.4, span ~9.4] with standing seams and
    two transverse meridian slits (closed shutters, the DSM bumps at x 683-686 / 692-695); low segmental zinc vault on
    the south hall [M crest 109.0]."""
    x0, x1 = b["x0"] - OX, b["x1"] - OX
    yc = -(b["zc"] - OZ)
    half = b["span"] / 2
    low = b.get("low", False)
    crest = hz(PARTS[part.id]["dsm"]["max"]) if not low else hz(109.0)
    zs = part.top + (0.35 if not low else 0.0)
    rise = crest - zs
    nseg = 8 if FAR else (14 if low else 24)
    mat = ZINC if low else WHITE_METAL
    if rise >= half:                                         # stilted: a semicircle on short vertical feet
        Rb = half; zc = crest - Rb
        arc = [(-half, zs)] + [(Rb * math.sin(a), zc + Rb * math.cos(a)) for a in [-math.pi / 2 + math.pi * i / nseg for i in range(nseg + 1)]] + [(half, zs)]
        nseg += 2
    else:
        Rb = (half * half + rise * rise) / (2 * rise)
        zc = crest - Rb
        a_max = math.asin(min(1.0, half / Rb))
        arc = [(Rb * math.sin(a), zc + Rb * math.cos(a)) for a in [-a_max + 2 * a_max * i / nseg for i in range(nseg + 1)]]   # (y offset, z)
    sl = [0.0]
    for i in range(1, len(arc)): sl.append(sl[-1] + math.hypot(arc[i][0] - arc[i - 1][0], arc[i][1] - arc[i - 1][1]))
    ov = 0.25
    for i in range(nseg):
        (ya, za), (yb, zb) = arc[i], arc[i + 1]
        pa0, pb0 = V3(x0 - ov, yc + ya, za), V3(x0 - ov, yc + yb, zb)
        pa1, pb1 = V3(x1 + ov, yc + ya, za), V3(x1 + ov, yc + yb, zb)
        face_dir([pa0, pa1, pb1, pb0], V3(0, (ya + yb) / 2, (za + zb) / 2 - zc), mat, C_DOME,
                 [(0, sl[i]), (x1 - x0 + 2 * ov, sl[i]), (x1 - x0 + 2 * ov, sl[i + 1]), (0, sl[i + 1])])
        # underside (the overhang shows from below), 6 cm in: a coincident face blotched the outer skin's AO bake
        ins = lambda p_: p_ - V3(0, p_.y - yc, p_.z - zc).normalized() * 0.06
        face_dir([ins(pa0), ins(pa1), ins(pb1), ins(pb0)], -V3(0, (ya + yb) / 2, (za + zb) / 2 - zc), mat, C_INT)
    # end walls: lunettes in brick with a stone arch band and a half-round window (LOD0)
    for xe, sgn in ((x0, -1), (x1, 1)):
        fr = Frame(V3(xe, yc, 0), V3(sgn, 0, 0))
        pts = [(fr.U.dot(V3(0, a_[0], 0)), a_[1]) for a_ in arc]
        loop = [(pts[0][0], zs - 0.02)] + pts + [(pts[-1][0], zs - 0.02)]
        loop = [(u, v) for u, v in loop]
        if not FAR and not low:
            ws = [(Rb * 0.55 * math.cos(math.pi * i / 10), zs + 0.4 + Rb * 0.55 * math.sin(math.pi * i / 10)) for i in range(11)]
            fill2d(fr, [loop, ws], -0.02, BRICK, C_PLAIN)
            fill2d(fr, [ws], -0.25, GLASS)
            strip2d(fr, ws, -0.02, -0.25, STONE, C_SUR)
            for i in range(9):                               # radial glazing bars
                a = math.pi * (i + 1) / 10
                bar(fr, (0, zs + 0.4), (Rb * 0.55 * math.cos(a), zs + 0.4 + Rb * 0.55 * math.sin(a)), -0.24, 0.03, 0.03, WOOD)
            fbox(fr, -half, half, zs - 0.1, zs + 0.08, -0.02, 0.1, STONE, C_CORN)
        else:
            fill2d(fr, [loop], -0.02, BRICK, C_PLAIN)
    if FAR: return
    # standing seams (transverse arcs every 0.9 m) and the meridian slits' shutters
    nx = int((x1 - x0) / 0.9)
    slits = [s - OX for s in b.get("slits", [])]
    for i in range(nx + 1):
        x = x0 + (x1 - x0) * i / nx
        if any(abs(x - s) < 1.0 for s in slits): continue
        for k in range(nseg):
            (ya, za), (yb, zb) = arc[k], arc[k + 1]
            na = V3(0, ya, za - zc).normalized(); nb_ = V3(0, yb, zb - zc).normalized()
            pa, pb = V3(x, yc + ya, za), V3(x, yc + yb, zb)
            quad(pa - V3(0.02, 0, 0), pb - V3(0.02, 0, 0), pb + nb_ * 0.04 - V3(0.02, 0, 0), pa + na * 0.04 - V3(0.02, 0, 0), mat, C_SEAM)
            quad(pa + na * 0.04 + V3(0.02, 0, 0), pb + nb_ * 0.04 + V3(0.02, 0, 0), pb + V3(0.02, 0, 0), pa + V3(0.02, 0, 0), mat, C_SEAM)
            quad(pa + na * 0.04 - V3(0.02, 0, 0), pb + nb_ * 0.04 - V3(0.02, 0, 0), pb + nb_ * 0.04 + V3(0.02, 0, 0), pa + na * 0.04 + V3(0.02, 0, 0), mat, C_SEAM)
    for s in slits:
        for k in range(nseg):
            (ya, za), (yb, zb) = arc[k], arc[k + 1]
            na = V3(0, ya, za - zc).normalized(); nb_ = V3(0, yb, zb - zc).normalized()
            for xa, xb in ((s - 0.65, s + 0.65),):
                A0, B0 = V3(xa, yc + ya, za) + na * 0.3, V3(xa, yc + yb, zb) + nb_ * 0.3
                A1, B1 = V3(xb, yc + ya, za) + na * 0.3, V3(xb, yc + yb, zb) + nb_ * 0.3
                face_dir([A0, A1, B1, B0], na + nb_, WHITE_METAL, C_SHUT)
                face_dir([A0, B0, V3(xa, yc + yb, zb), V3(xa, yc + ya, za)], V3(-1, 0, 0), WHITE_METAL, C_SHUT)
                face_dir([A1, B1, V3(xb, yc + yb, zb), V3(xb, yc + ya, za)], V3(1, 0, 0), WHITE_METAL, C_SHUT)
            # the shutter's middle seam
            pa, pb = V3(s, yc + ya, za) + na * 0.3, V3(s, yc + yb, zb) + nb_ * 0.3
            quad(pa + na * 0.04, pb + nb_ * 0.04, pb, pa, IRON, C_SEAM)

# ------------------------------------------------------------------------------------------------ towers + domes
def tower(k):
    """A round banded tower [M: centre, radius (UrbIS arc), cornice top (DSM)]: blue-stone plinth, red brick with white
    stone bands, a door and small windows in stone frames, a stone entablature on scroll consoles."""
    t = TW[k]
    c, r, base, top = t["c"], t["r"], t["base"], t["top_b"]
    n = 20 if FAR else 44
    # openings: door at az (deg, clockwise from north), a window over it, two more around
    az0 = t["door"]
    ops = [(az0, "door"), (az0, "win_hi"), (az0 + 120, "win"), (az0 - 120, "win")]
    # facets; around each opening one chord facet as wide as the opening needs
    half_w = {"door": 0.95, "win": 0.75, "win_hi": 0.75}
    angs = []
    for i in range(n):
        angs.append(2 * math.pi * i / n)
    def azr(az): return math.radians(90 - az)          # azimuth (clockwise from north, +y) -> math angle from +x
    chords = {}
    for az, kind in ops:
        if kind == "win_hi": continue
        a = azr(az) % (2 * math.pi); hw = math.asin(min(0.95, half_w[kind] * 1.25 / r))
        chords[a] = hw
    # build the facet list: replace facets inside each chord by the chord
    pts = []
    for i in range(n):
        a = angs[i]
        if any(abs(((a - ca + math.pi) % (2 * math.pi)) - math.pi) < hw for ca, hw in chords.items()): continue
        pts.append(a)
    for ca, hw in chords.items(): pts += [(ca - hw) % (2 * math.pi), (ca + hw) % (2 * math.pi)]
    pts.sort()
    ring = [c + V3(r * math.cos(a), r * math.sin(a), 0) for a in pts]
    # a pseudo part so the façade code builds it
    tp = type("TowerPart", (), {})()
    tp.id = "tower_" + k; tp.base = base; tp.top = top; tp.style = "tower"; tp.hero = False; tp.parapet = False; tp.roof = "none"
    tp.pts = ring
    E = edges_of(tp)
    ne = len(E)
    for i, (a, b, d, N, L) in enumerate(E):
        fr = Frame(a, N)
        mid = (a + b) / 2 - c
        az = (90 - math.degrees(math.atan2(mid.y, mid.x))) % 360
        wins = []
        for oaz, kind in ops:
            if abs(((az - oaz + 180) % 360) - 180) < 4 and L > 1.0:
                if kind == "door": wins.append(Win(L / 2, base + 0.15, base + 2.6, 1.05, False, "door", sur=0.2))
                elif kind == "win_hi": wins.append(Win(L / 2, base + 3.6, min(base + 5.1, top - 1.6), 0.8, False))
                else: wins.append(Win(L / 2, base + 2.4, min(base + 3.9, top - 1.6), 0.8, False))
        # the tower is free-standing except where its building meets it: cover from the parts
        iv = cover_intervals(tp, a, d, N, L) if False else [(0, L, -1e9)]
        wall_segment(fr, 0, L, base - GROUND_OFF, top, wins, tp, ext0=BAND_D, ext1=BAND_D)
        ma = miter(E[i - 1][3], N); mb = miter(N, E[(i + 1) % ne][3])
        plinth_run(a, d, N, 0, L, L, ma, mb, base, wins)
        sweep(a, b, ma, mb, N, top, CORNICE_FAR if FAR else CORNICE_TOWER, STONE, C_CORN)
        if not FAR:
            # a second, thin string course a storey below
            sweep(a, b, ma, mb, N, top - 2.1, [(0, -0.22), (0.06, -0.22), (0.06, 0.0), (0, 0)], STONE, C_CORN)
    if not FAR:
        # consoles under the cornice, every ~1.1 m (scrolls, the photos)
        nc = max(8, int(2 * math.pi * r / 1.1))
        prof = [(0.0, -0.9), (0.05, -0.9), (0.1, -0.78), (0.12, -0.62), (0.2, -0.48), (0.34, -0.4), (0.36, -0.32), (0.0, -0.32)]
        for i in range(nc):
            a = 2 * math.pi * (i + 0.5) / nc
            N = V3(math.cos(a), math.sin(a), 0)
            fr = Frame(c + N * (r * math.cos(math.pi / n) - 0.0), V3(-N.y, N.x, 0))    # frame facing sideways: u = outward
            # build the console's side profile in a frame whose normal is tangential
            sp = [(o, top + dz) for o, dz in prof]
            for s in (-0.09, 0.09):
                fill2d(fr, [[(-o, v) for o, v in sp]], s, STONE, C_CONSOLE, flip=s < 0)
            loop = [(-o, v) for o, v in sp]
            strip2d(fr, loop, 0.09, -0.09, STONE, C_CONSOLE, inward=False)
    # roof ring between the wall and the dome's drum
    return c, r, top

def cone_roof(k):
    """the north-east tower's pointed slate roof (inventory 0003_P05: a banded round tower with a conical slate roof
    beside a low banded wing): from the cornice to an apex estimated from the photo (cone height 1.25 x the tower's
    diameter), a small zinc finial"""
    t = TW[k]; c, r, top = t["c"], t["r"], t["top_b"]
    hgt = 1.25 * 2 * r * 0.62
    n = 12 if FAR else 32
    lathe(c + Z * (top - 0.05), [(r + 0.3, 0.0), (r + 0.3, 0.12), (0.0, hgt)], n, SLATE, C_PLAIN)
    if not FAR:
        lathe(c + Z * (top + hgt - 0.25), [(0.09, 0), (0.12, 0.25), (0.05, 0.55), (0.02, 1.0), (0.0, 1.1)], 10, ZINC, C_RIB)

def balcony(k):
    """the great equatorial tower's balcony under its upper window (inventory 0003_P04): a stone slab on two
    consoles, a cast-iron railing"""
    t = TW[k]; c, r = t["c"], t["r"]
    az = math.radians(90 - t["door"]); N = V3(math.cos(az), math.sin(az), 0)
    fr = Frame(c + N * r, N)
    z = t["base"] + 3.55
    fbox(fr, -1.0, 1.0, z - 0.2, z, -0.1, 0.75, STONE, C_SILL, skip=())
    if FAR: return
    for u in (-0.7, 0.7):
        fbox(fr, u - 0.09, u + 0.09, z - 0.75, z - 0.2, 0.0, 0.5, STONE, C_CONSOLE, skip=("back",))
    rail = [fr.p(-0.95, z + 1.0, 0.0), fr.p(-0.95, z + 1.0, 0.7), fr.p(0.95, z + 1.0, 0.7), fr.p(0.95, z + 1.0, 0.0)]
    for a_, b_ in zip(rail, rail[1:]): beam(a_, b_, 0.025, 0.05, IRON, C_PLAIN)
    for a_, b_ in zip(rail, rail[1:]):
        L = (b_ - a_).length; m = max(2, int(L / 0.12))
        for i in range(1, m):
            q = a_.lerp(b_, i / m); beam(q - Z * 1.0, q, 0.008, 0.008, IRON, C_RIB)

def dome(k, on_roof_z=None):
    """An observatory dome [M: sphere fitted to the DSM cap: radius, springing, top]: a cylindrical skirt from the tower
    (or the block's roof) up to the springing, a hemisphere with meridian ribs, a base ring, the slit (shutters closed,
    or open with the upper shutter run back over the top and the dark interior and the telescope inside)."""
    dm = DOMES[k]; f = dm["fit"]
    cx, cz = f["centre"]
    R = f["radius"]; zs = hz(f["springing"])
    c = P(cx, cz)
    mat = SLOTS.index(dm["mat"])
    slit_open = dm["slit"]
    dr = R + 0.45                                            # masonry drum under the metal skirt
    if k in TW:
        t = TW[k]; base = t["top_b"]; tr = t["r"]
        dr = min(dr, tr - 0.15)
        # flat roof ring (zinc) between the cornice and the drum
        ring_o = tr * math.cos(math.pi / 44) - 0.02
        if ring_o > dr + 0.05: lathe(c + Z * (base + 0.01), [(ring_o, 0.0), (dr, 0.0)], 20 if FAR else 44, ZINC, C_PLAIN, uvs=False)
    else:
        base = on_roof_z - 0.3
    zd = max(base + 0.45, zs - 1.25)                         # the drum's cornice top: 1.25 m of metal skirt above it
    nd = 16 if FAR else 40
    lathe(c + Z * base, [(dr, 0.0), (dr, zd - 0.26 - base)], nd, BRICK, C_PLAIN)
    if not FAR:
        zz = base + 0.3
        while zz + 0.19 < zd - 0.3:
            lathe(c + Z * zz, [(dr, 0.0), (dr + 0.025, 0.0), (dr + 0.025, 0.19), (dr, 0.19)], nd, STONE, C_BAND)
            zz += BAND_PITCH
    lathe(c + Z * (zd - 0.26), [(dr, 0.0), (dr + 0.12, 0.05), (dr + 0.16, 0.2), (dr + 0.02, 0.26), (0.0, 0.26)], nd, STONE, C_CORN)
    zb = zd
    seg = 20 if FAR else 48
    # skirt (vertical, part of the rotating dome) + the base ring
    sk = R + 0.06
    lathe(c + Z * zb, [(sk, 0.0), (sk, zs - zb)], seg, mat, C_DOME)
    if not FAR:
        lathe(c + Z * zb, [(sk + 0.1, 0.0), (sk + 0.12, 0.08), (sk + 0.1, 0.22), (sk, 0.24)], seg, mat, C_RIB, uvs=False)
    # hemisphere in (alpha, beta): X = R sin(alpha) across the slit, (Y, Zup) = R cos(alpha) (cos b, sin b) along it
    az = math.radians(dm["slit_az"])
    Y = V3(math.sin(az), math.cos(az), 0); X = V3(Y.y, -Y.x, 0)
    ws = 0.19 * R                                            # slit half-width
    a_s = math.asin(ws / R)
    b_end = math.radians(112)                                # the slit runs from the skirt over the zenith to 22 deg beyond
    na = 10 if FAR else 22; nb = 12 if FAR else 36
    al = sorted(set([-math.pi / 2 + math.pi * i / na for i in range(na + 1)] + [-a_s, a_s]))
    be = sorted(set([math.pi * j / nb for j in range(nb + 1)] + [b_end]))
    def S(a, b, rr=R):
        return c + Z * zs + X * (rr * math.sin(a)) + (Y * math.cos(b) + Z * math.sin(b)) * (rr * math.cos(a))
    def uv(a, b): return (R * a, R * b * math.cos(a) + 0.0)
    for i in range(len(al) - 1):
        for j in range(len(be) - 1):
            a0, a1, b0, b1 = al[i], al[i + 1], be[j], be[j + 1]
            in_slit = abs((a0 + a1) / 2) < a_s and (b0 + b1) / 2 < b_end
            if in_slit and slit_open: continue
            pts = [S(a0, b0), S(a1, b0), S(a1, b1), S(a0, b1)]
            q = [pts[0], pts[1], pts[2], pts[3]]
            # degenerate at the side poles (alpha = +-90)
            cen = sum(q, Vector((0, 0, 0))) / 4
            face_dir(q, cen - (c + Z * zs), mat, C_SHUT if in_slit else C_DOME, [uv(a0, b0), uv(a1, b0), uv(a1, b1), uv(a0, b1)])
            if slit_open:                                    # the inside, seen through the slit
                qi = [S(a0, b0, R - 0.06), S(a1, b0, R - 0.06), S(a1, b1, R - 0.06), S(a0, b1, R - 0.06)]
                face_dir(qi, (c + Z * zs) - cen, WHITE_METAL, C_INT)
    if slit_open:
        # slit jambs (the dome's thickness)
        for sgn in (-1, 1):
            for j in range(len(be) - 1):
                b0, b1 = be[j], be[j + 1]
                if b0 >= b_end - 1e-6: continue
                face_dir([S(sgn * a_s, b0), S(sgn * a_s, b1), S(sgn * a_s, b1, R - 0.06), S(sgn * a_s, b0, R - 0.06)], -X * sgn, mat, C_INT)
        # the skirt's opening is part of the slit too: a dark recess (the slit reaches the base ring)
        # the shutter: two leaves hinged on the slit's edges, swung open and standing up on either side of the slit
        for sgn in (-1, 1):
            js = [j for j in range(len(be) - 1) if be[j] >= math.radians(8) - 1e-6 and be[j + 1] <= b_end + 1e-6]
            prev = None
            for j in js + [None]:
                b_ = be[j] if j is not None else be[js[-1] + 1]
                hinge = S(sgn * (a_s + 0.03), b_, R + 0.12)
                nrm = (hinge - (c + Z * zs)).normalized()
                lat = X * sgn
                free = hinge + nrm * (ws * 1.5) + lat * (ws * 1.5)              # broad leaves (owner photo 2), opened ~45 degrees
                cur = (hinge, free)
                if prev:
                    face_dir([prev[0], cur[0], cur[1], prev[1]], lat, mat, C_SHUT)
                    face_dir([prev[0], cur[0], cur[1], prev[1]], -lat, mat, C_SHUT)
                prev = cur
        lathe(c + Z * zb, [(sk - 0.05, zs - zb), (sk - 0.05, 0.0), (0.0, 0.0)], seg, WHITE_METAL, C_INT, uvs=False)
        if not FAR: telescope(c, zb, zs, R, Y)
    if FAR: return
    # rails along the slit (both sides, skirt to the end of the slit)
    for sgn in (-1, 1):
        aa = sgn * (a_s + 0.035)
        for j in range(len(be) - 1):
            b0, b1 = be[j], be[j + 1]
            if b0 >= b_end - 1e-6: continue
            for (r0, r1, e0, e1) in ((R, R + 0.14, -0.035, -0.035), (R + 0.14, R + 0.14, -0.035, 0.035), (R + 0.14, R, 0.035, 0.035)):
                A = S(aa + e0 / R, b0, r0); Bp = S(aa + e0 / R, b1, r0); C2 = S(aa + e1 / R, b1, r1); D = S(aa + e1 / R, b0, r1)
                face_dir([A, Bp, C2, D], (A + C2) / 2 - (c + Z * zs), mat, C_RIB)
    # meridian ribs (vertical great circles), stopping at the slit's rails
    nr = 20
    for i in range(nr):
        phi = 2 * math.pi * (i + 0.5) / nr
        dirh = X * math.sin(phi) + Y * math.cos(phi)
        sphi = abs(math.sin(phi))
        if sphi < 1e-3: continue
        lim = (ws + 0.12) / (R * sphi)
        th_max = math.acos(min(1.0, lim)) if lim < 1 else 0.0
        if math.cos(phi) < 0 and lim >= 1: continue
        if th_max < 0.15: continue
        steps = 10
        prev = None
        for s_ in range(steps + 1):
            th = th_max * s_ / steps
            p = c + Z * zs + (dirh * math.cos(th) + Z * math.sin(th)) * R
            nrm = (p - (c + Z * zs)).normalized()
            side = Z.cross(dirh).normalized()
            cur = (p + side * 0.045, p + side * 0.045 + nrm * 0.05, p - side * 0.045 + nrm * 0.05, p - side * 0.045)
            if prev:
                for e in range(3):
                    quad(prev[e], cur[e], cur[e + 1], prev[e + 1], mat, C_RIB)
            prev = cur
        # down the skirt
        p0 = c + Z * zb + dirh * sk; p1 = c + Z * zs + dirh * sk
        side = Z.cross(dirh).normalized()
        quad(p0 + side * 0.045 + dirh * 0.05, p1 + side * 0.045 + dirh * 0.05, p1 - side * 0.045 + dirh * 0.05, p0 - side * 0.045 + dirh * 0.05, mat, C_RIB)
    # finial / hood at the top
    lathe(c + Z * (zs + R - 0.05), [(0.22, 0.0), (0.25, 0.08), (0.14, 0.18), (0.05, 0.4), (0.0, 0.5)], 12, mat, C_RIB)
    if slit_open:
        # a ladder up the dome's side (the photo), painted white
        lad_dir = -X
        for sgn in (-0.22, 0.22):
            prev = None
            for s_ in range(13):
                th = math.radians(84) * s_ / 12
                p = c + Z * zs + (lad_dir * math.cos(th) + Z * math.sin(th)) * (R + 0.18) + Y * sgn
                if prev is not None: beam(prev, p, 0.018, 0.018, WHITE_METAL, C_RIB)
                prev = p
        for s_ in range(1, 12):
            th = math.radians(84) * s_ / 12
            p = c + Z * zs + (lad_dir * math.cos(th) + Z * math.sin(th)) * (R + 0.18)
            beam(p - Y * 0.22, p + Y * 0.22, 0.012, 0.012, WHITE_METAL, C_RIB)

def telescope(c, zb, zs, R, Y):
    """the refractor inside the open dome: a pier, the fork and a long tube aimed out of the slit"""
    floor = zb + 0.6
    lathe(c + Z * (floor - 0.3), [(0.42, 0.0), (0.36, 0.2), (0.3, 1.2), (0.36, 1.4), (0.0, 1.45)], 12, IRON, C_PLAIN)
    pivot = c + Z * (floor + 1.65)
    d = (Y * math.cos(math.radians(38)) + Z * math.sin(math.radians(38))).normalized()
    a0, a1 = pivot - d * 1.0, pivot + d * min(2.8, R * 0.85)
    side = Z.cross(d).normalized(); up = d.cross(side).normalized()
    n = 12
    rr = [0.17, 0.2, 0.15]
    rings = []
    for (p, r_) in ((a0, rr[0]), (pivot, rr[1]), (a1, rr[2])):
        rings.append([p + (side * math.cos(2 * math.pi * k / n) + up * math.sin(2 * math.pi * k / n)) * r_ for k in range(n)])
    for i in range(2):
        for k in range(n):
            quad(rings[i][k], rings[i][(k + 1) % n], rings[i + 1][(k + 1) % n], rings[i + 1][k], WHITE_METAL, C_PLAIN)
    B.face(list(reversed(rings[0])), IRON, C_PLAIN); B.face(rings[2], IRON, C_PLAIN)
    for s in (-1, 1):
        box(pivot - Z * 0.55 + side * s * 0.3, side, Z, side.cross(Z), -0.05, 0.05, 0, 0.6, -0.12, 0.12, IRON, C_PLAIN)

# ------------------------------------------------------------------------------------------------ ground apron
def apron(part):
    """gravel strips along the exposed walls (gravel_path) with a steel lawn edging (lawn_edge), on the DTM"""
    E = edges_of(part)
    n = len(E)
    for i, (a, b, d, N, L) in enumerate(E):
        iv = cover_intervals(part, a, d, N, L)
        for (u0, u1, cv) in iv:
            if cv > -1e8 or u1 - u0 < 0.8: continue
            ma = miter(E[i - 1][3], N) if u0 < 1e-3 else N
            mb = miter(N, E[(i + 1) % n][3]) if u1 > L - 1e-3 else N
            m = max(1, int((u1 - u0) / 2.0))
            B.new_group()
            prev = None
            for k in range(m + 1):
                t = k / m; u = u0 + (u1 - u0) * t
                mm = (ma * (1 - t) + mb * t) if (k in (0, m)) else N
                if k == 0: mm = ma
                if k == m: mm = mb
                p = a + d * u
                inner = p + mm * 0.09; outer = p + mm * 0.75; edge = p + mm * 0.8
                g_in = ground_b(inner) + 0.035; g_out = ground_b(outer) + 0.035
                cur = (V3(inner.x, inner.y, g_in), V3(outer.x, outer.y, g_out), V3(edge.x, edge.y, g_out + 0.04), V3(outer.x, outer.y, g_out + 0.04))
                if prev:
                    face_up([prev[0], cur[0], cur[1], prev[1]], GRAVEL, C_PLAIN)
                    face_up([prev[3], cur[3], cur[2], prev[2]], LAWN, C_PLAIN)
                    face_dir([prev[1], cur[1], cur[3], prev[3]], -N, LAWN, C_PLAIN)
                    face_dir([prev[2], cur[2], V3(cur[2].x, cur[2].y, cur[2].z - 0.1), V3(prev[2].x, prev[2].y, prev[2].z - 0.1)], N, LAWN, C_PLAIN)
                prev = cur

# ------------------------------------------------------------------------------------------------ build
spec_used = set()
def build_all():
    for p in PARTS_L: build_part(p)
    for k in TW: tower(k)
    balcony("great")
    for k in DOMES:
        if DOMES[k].get("cone"): cone_roof(k)
        elif k in TW: dome(k)
        else: dome(k, on_roof_z=PARTS_L[[q.id for q in PARTS_L].index(DOMES[k]["part"])].top)
    if not FAR:
        for p in PARTS_L: apron(p)

build_all()
B_MAIN = B
print(f"LOD0: {len(B.f)} faces in {time.time() - T0:.1f}s")
B = Builder(); FAR = True
build_all()
B_FAR = B; FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)

def shrink_low_priority(me, thin):
    """Lightmap texels where AO varies: the islands of flat roof decks and the domes' outer skins (AO nearly uniform
    there) are scaled down before the pack, so walls, cornices and openings get more of the 2048 px map."""
    import collections
    lm = me.uv_layers["Lightmap"].data
    slot_of = [me.materials[p.material_index].name for p in me.polygons]
    low = {}
    for p in me.polygons:
        n = p.normal; sl = slot_of[p.index]
        if thin[p.index]: continue
        if sl in ("zinc_roof", "slate", "glass_window", "gravel_path") and n.z > 0.8: low[p.index] = 0.3
        elif sl in ("copper_patina", "painted_metal_white", "zinc_roof") and n.z > 0.15: low[p.index] = 0.55
    if not low: return
    # islands = faces connected through loops that share a vertex AND the same lightmap uv
    parent = list(range(len(me.polygons)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    key = {}
    for p in me.polygons:
        for li in p.loop_indices:
            uv = lm[li].uv; k = (me.loops[li].vertex_index, round(uv.x, 6), round(uv.y, 6))
            if k in key:
                a, b = find(key[k]), find(p.index)
                if a != b: parent[a] = b
            else: key[k] = p.index
    isl = collections.defaultdict(list)
    for p in me.polygons: isl[find(p.index)].append(p.index)
    n_s = 0
    for faces in isl.values():
        fs = [low.get(f) for f in faces]
        if any(v is None for v in fs): continue
        s_ = max(fs)
        loops = [li for f in faces for li in me.polygons[f].loop_indices]
        cx = sum(lm[li].uv.x for li in loops) / len(loops); cy = sum(lm[li].uv.y for li in loops) / len(loops)
        for li in loops:
            u = lm[li].uv; lm[li].uv = (cx + (u.x - cx) * s_, cy + (u.y - cy) * s_)
        n_s += 1
    print(f"  lightmap: {n_s} low-priority islands scaled down")

def make_object(name, bld, v0, v1):
    """Mesh: one material slot per named slot, the code colour, UV0 world metres (given arc-length UVs or a per-face
    planar projection), merged vertices, smooth-by-angle normals, a lightmap UV1 in the strip v0..v1."""
    used = sorted(set(bld.m))
    remap = {m: i for i, m in enumerate(used)}
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f)
    me.update()
    for m in used: me.materials.append(mats[m])
    me.polygons.foreach_set("material_index", [remap[m] for m in bld.m])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cdat = []
    for poly, code in zip(me.polygons, bld.c):
        for _ in poly.loop_indices: cdat += [code / 16 + 1 / 32, 1.0, 0.0, 1.0]       # g: vertex AO (thin faces), 1 elsewhere
    col.data.foreach_set("color", cdat)
    uv0 = me.uv_layers.new(name="UVMap")
    uvd = [0.0] * (2 * len(me.loops))
    for poly, given in zip(me.polygons, bld.uv):
        if given and len(given) == len(poly.loop_indices):
            for li, (u, v) in zip(poly.loop_indices, given): uvd[2 * li] = u; uvd[2 * li + 1] = v
            continue
        n = poly.normal
        if abs(n.z) < 0.75:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-4 else Vector((1, 0, 0)); b = n.cross(t).normalized()
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
    ga = me.attributes.new("grp", "INT", "FACE"); ga.data.foreach_set("value", bld.g)
    obj = bpy.data.objects.new(name, me)
    scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0008)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0004)
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(32))
    me.validate()
    ntri = sum(len(p.vertices) - 2 for p in me.polygons)
    print(name, "faces", len(me.polygons), "triangles", ntri, "verts", len(me.vertices))
    uv1 = me.uv_layers.new(name="Lightmap")
    me.uv_layers.active = uv1
    for o in scn.objects: o.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    t = time.time()
    # THIN faces (band tops, glazing bars, ribs, seams, fillets: < 6 cm across) get no texels of their own: a pixel of
    # margin round each of their thousands of islands cost more map than the walls. They sample a reserved column of
    # constant AO (AO_PARK) at the right edge of the map; everything else is unwrapped and packed.
    thin = [False] * len(me.polygons)
    for p_ in me.polygons:
        if len(p_.vertices) == 4:
            co = [me.vertices[v].co for v in p_.vertices]
            mx = max((co[i] - co[(i + 1) % 4]).length for i in range(4))
            thin[p_.index] = mx > 0 and p_.area / mx < 0.06
    bpy.context.tool_settings.mesh_select_mode = (False, False, True)
    bpy.ops.object.mode_set(mode="EDIT")
    bm = bmesh.from_edit_mesh(me); bm.faces.ensure_lookup_table()
    for f_ in bm.faces: f_.select_set(not thin[f_.index])
    bm.select_flush_mode(); bmesh.update_edit_mesh(me)
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    lmd = me.uv_layers["Lightmap"].data
    bld_groups = [0] * len(me.polygons); me.attributes["grp"].data.foreach_get("value", bld_groups)
    for poly, g in zip(me.polygons, bld_groups):
        off = (g % 9973) * 1e-7
        for li in poly.loop_indices: u = lmd[li].uv; lmd[li].uv = (u.x + off, u.y + off)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    bpy.ops.object.mode_set(mode="OBJECT")
    shrink_low_priority(me, thin)
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.uv.select_all(action="SELECT")
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0005, shape_method="AABB", margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    lmd = me.uv_layers["Lightmap"].data
    for p_ in me.polygons:
        for li in p_.loop_indices:
            if thin[p_.index]: lmd[li].uv = (AO_PARK_U, 0.5)
            else: u = lmd[li].uv; lmd[li].uv = (u.x * 0.994, u.y)
    print(f"  lightmap: {sum(thin)} thin faces parked (their AO per vertex)")
    THIN[name] = thin
    lm = me.uv_layers["Lightmap"].data
    cov = 0.0
    for poly in me.polygons:
        li = list(poly.loop_indices)
        for j in range(1, len(li) - 1):
            a, b, c_ = lm[li[0]].uv, lm[li[j]].uv, lm[li[j + 1]].uv
            cov += abs((b.x - a.x) * (c_.y - a.y) - (b.y - a.y) * (c_.x - a.x)) / 2
    area = sum(p_.area for p_ in me.polygons)
    print(f"  lightmap UV {time.time() - t:.1f}s, coverage {cov:.3f}, area {area:.0f} m2, {math.sqrt(cov * AO_PX * AO_PX * (v1 - v0) / area):.1f} px/m")
    uv1 = me.uv_layers["Lightmap"]; uv0 = me.uv_layers["UVMap"]
    d = [0.0] * (2 * len(me.loops)); uv1.data.foreach_get("uv", d)
    for i in range(1, len(d), 2): d[i] = v0 + d[i] * (v1 - v0)
    uv1.data.foreach_set("uv", d)
    me.uv_layers.active = uv0
    me.attributes.remove(me.attributes["grp"])
    return obj, ntri, {SLOTS[m]: sum(len(p.vertices) - 2 for p in me.polygons if p.material_index == remap[m]) for m in used}

AO_SPLIT = 0.895
AO_PARK_U, AO_PARK_VALUE = 0.997, 1.0             # the reserved column (u > 0.994): AO 1, the thin faces' AO is per vertex
THIN = {}
obj, ntri, per_slot = make_object("Observatory", B_MAIN, 0.0, AO_SPLIT)
far, ntri_far, per_slot_far = make_object("Observatory_far", B_FAR, AO_SPLIT + 0.005, 1.0)
print(f"uv done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground for the bake + previews
def load_ground():
    import numpy as np
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(_g["rows"], _g["cols"]).astype(np.float64) / 100 + 60.0
    st = 2
    a = a[::st, ::st]; step = _g["step"] * st
    rows, cols = a.shape
    verts = [(_g["x0"] + c * step - OX, -(_g["z0"] + r * step - OZ), a[r, c] - OY) for r in range(rows) for c in range(cols)]
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.13, 0.17, 0.09, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g
ground = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 6.0
ao_img = bpy.data.images.new("observatory_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n
def vertex_ao(o, thin):
    """Cycles AO baked to a corner colour attribute; copied into Col.g for the THIN faces (1 elsewhere), whose lightmap
    texels are a constant reserved column: band tops, glazing bars, ribs, seams, railings keep their own occlusion"""
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = [0.0] * (4 * len(me.loops)); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; cc = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", cc)
    n_set = 0
    for p_ in me.polygons:
        if not thin[p_.index]: continue
        for li in p_.loop_indices: cc[4 * li + 1] = max(0.2, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", cc)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 64
    t = time.time()
    for target, other, clear in ((obj, far, True), (far, obj, False)):
        other.hide_render = True; target.hide_render = False
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=clear)
    obj.hide_render = far.hide_render = False
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    far.hide_render = True; obj.hide_render = False; vertex_ao(obj, THIN["Observatory"])
    far.hide_render = False; obj.hide_render = True; vertex_ao(far, THIN["Observatory_far"])
    obj.hide_render = far.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = AO_PARK_VALUE
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "observatory_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "observatory_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "observatory.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

info = {
    "asset": "Royal Observatory of Belgium, Uccle (tools/blender/observatory.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "facades_from_photos": sorted(f"{a} {b}" for a, b in spec_used),
    "uv": {"TEXCOORD_0": "world metres, per face (walls u along / v up; domes, towers, vaults arc length)", "TEXCOORD_1": "AO lightmap"},
    "frame": "glTF Y up; three.js (x, y, z) = (city x - OX, m TAW - OY, city z - OZ)",
    "placement": {"city_local_position": [OX, OY, OZ], "rotation_y_rad": 0.0,
                  "hides_solids": [s["id"] for s in SITE["solids"].values()],
                  "hides_bu_ids": sorted(set(s["bu"] for s in SITE["solids"].values() if s["bu"]))},
    "bounds_city": {"x": [round(min(p.x for p in B_MAIN.v) + OX, 1), round(max(p.x for p in B_MAIN.v) + OX, 1)],
                    "z": [round(OZ - max(p.y for p in B_MAIN.v), 1), round(OZ - min(p.y for p in B_MAIN.v), 1)]},
    "measured": {"wall_tops_taw": HW, "crowns_taw": CROWN,
                 "domes": {k: {"centre_city": d["fit"]["centre"], "radius": d["fit"]["radius"], "springing_taw": d["fit"]["springing"],
                               "top_taw": d["fit"]["top"], "material": d["mat"], "slit_open": d["slit"]} for k, d in DOMES.items()},
                 "towers": {k: {"radius": t["r"], "cornice_top_taw": t["top"]} for k, t in TOWERS.items()}},
    "estimated": "storeys, bays, window sizes, band pitch (0.66 m) and height (0.19 m), cornice profiles, consoles, ribs (20), slit width (0.38 R), door positions",
}
json.dump(info, open(os.path.join(OUT, "observatory.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_red_brussels": (0.2, 0.06, 0.035), "stone_white": (0.62, 0.6, 0.54), "stone_blue": (0.17, 0.18, 0.19), "copper_patina": (0.16, 0.38, 0.3),
            "painted_metal_white": (0.75, 0.76, 0.75), "zinc_roof": (0.25, 0.27, 0.29), "slate": (0.07, 0.075, 0.085), "render_white": (0.7, 0.68, 0.62),
            "wood_frame_white": (0.8, 0.8, 0.78), "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.04, 0.08, 0.05),
            "gravel_path": (0.45, 0.42, 0.36), "lawn_edge": (0.2, 0.2, 0.2)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.15 if m.name == "glass_window" else (0.4 if "metal" in m.name or "copper" in m.name else 0.8)
        bsdf.inputs["Metallic"].default_value = 0.5 if m.name in ("painted_metal_white",) else 0.0
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(48), 0, math.radians(215))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 40; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos_city, tgt_city, lens=28, res=(1100, 800)):
        cam.location = P(*pos_city); tg = P(*tgt_city)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"preview_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    look("aerial_sw", (520, 280, 205), (650, 95, 102), 30)
    look("great_eq", (630, 185, 102.5), (653, 155, 109), 30)
    look("east_towers", (735, 75, 102), (712, 38, 106), 30)
print(f"done {time.time() - T0:.1f}s")
