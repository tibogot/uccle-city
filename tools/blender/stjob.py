"""ÉGLISE SAINT-JOB (Uccle), the hero asset: built entirely in code (no hand modelling), from MEASURED data.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stjob.py -- <out_dir> [--no-bake] [--previews]
      <out_dir>/stjob.glb        one mesh, 4 materials (Masonry, Roof, Glass, Metal) = 4 draw calls; node "nest" (falcon nest
                                 in the belfry), node "spire_tip"
      <out_dir>/stjob_ao.png     ambient occlusion baked with Cycles into the second UV set (TEXCOORD_1), 2048 px grey
      <out_dir>/stjob.json       the measurements used, placement in the city, counts
      <out_dir>/preview_*.png    Cycles renders from the reference photos' viewpoints (--previews)

MEASURED (UrbIS 3D building solid buildingsolid/509924, BU_ID building/1587133, osm way/225221596, and the UrbIS DSM /
DTM 2021 at 0.5 m, CC0; see stjob.json "measured"): the footprint, every height below marked [M]. The plan is an
OCTAGONAL crossing (drum, ribbed octagonal dome, lantern) with EIGHT gabled wings, one per octagon face: the long
front wing (north, onto Place de Saint-Job, with the portal and steps), a long south wing, an east wing ending in a
three-sided apse, short west and diagonal wings; the tower stands on the north-west diagonal; low polygonal chapels
with pyramidal (conical) roofs fill the eight corners between the wings; a round stair turret on the tower; a low
sacristy annex at the south-east. Details (windows, bands, roses, belfry, clock gables, lantern) are from the
reference photos (data/raw/refs/stjob/, not shipped), estimated, NOT measured.

Frame: Blender X = the church's east (axis 2), +Y = the front (north, axis 0), Z up; origin = the centre of the
octagon at FLOOR (75.40 m TAW, estimated: 13 steps of 17 cm above the street at the portal, DTM 73.2 m). glTF export
turns it Y-up: three.js x = east, -z = front. Place it in the city with position (1216.19, 75.40, 561.44) and
rotation.y = +0.09225 rad (see stjob.json "placement").

Materials: per-face codes in the corner colour attribute "Col" (R = subtype / 8 + 1/16, G = band pattern / 4 + 1/8):
  Masonry  0 brick (white stone bands by height, blue-grey plinth below PLINTH: in the shader), 1 white stone,
           2 sandstone, 3 dark wood (louvres, doors), 4 dark interior, 5 brick without bands
  Roof     0 slate, 1 dome slate (grey-green), 2 red paint, 3 lead / zinc
  Glass    0 leaded glass
  Metal    0 wrought iron, 1 gilded, 2 clock dial
UV0 = world-scale planar projection per face (1 unit = 1 m): brick coursing and slate rows in the shader.
UV1 = lightmap (smart project), the baked AO.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stjob")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
os.makedirs(OUT, exist_ok=True)
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "stjob")   # previews: docs/ is not deployed
T0 = time.time()

# ------------------------------------------------------------------------------------------------ measurements
FLOOR = 75.40                         # m TAW of z = 0 (estimate, see above)
def taw(h): return h - FLOOR
C_WORLD = (1216.19, 561.44)           # [M] octagon centre (lantern axis in the UrbIS mesh), city local x, z
ROT_Y = 0.09225                       # [M] the wings' axes are turned 5.29 deg from the grid (N wing end 16-18)
GROUND = -3.6                         # walls go this far down (DTM around: 72.5..74.7 m TAW)
A = 10.33                             # [M] octagon: centre to the middle of a face (across flats 20.66, face 8.56)
W2 = A * math.tan(math.pi / 8)        # half the width of a wing = half an octagon face (4.28; UrbIS ends 8.56-8.70)
EAVE = taw(86.50)                     # [M] wing eaves (DSM cross sections, all eight wings)
RIDGE = taw(90.10)                    # [M] wing ridges
PAR = 0.30                            # gable parapet above the roof
CH_EAVE = taw(82.00)                  # [M] corner chapels' eaves (DSM, 82.0-82.6)
CH_TOP = taw(85.00)                   # [M] chapel roof apex (DSM 84.5 peak, smoothed; UrbIS cones 84.5-85)
DRUM_TOP = taw(98.30)                 # [M] drum wall top (UrbIS)
DOME = [(10.05, taw(98.6)), (9.6, taw(99.9)), (9.0, taw(101.3)), (8.0, taw(103.9)), (7.0, taw(105.5)), (6.0, taw(106.8)),
        (5.0, taw(107.6)), (4.0, taw(108.2)), (3.0, taw(108.7)), (2.2, taw(109.0))]   # [M] DSM profile (flat radius, z)
LANTERN_BASE = taw(109.0); LANTERN_DECK = taw(110.6); LANTERN_TOP = taw(115.8); CUPOLA_TOP = taw(118.5)   # [M] UrbIS
LANTERN_R = 1.45                      # [M] UrbIS lantern cylinder radius
T_R = 19.03                           # [M] tower centre on the NW diagonal (spire tip 1201.64, 549.25)
T_H = 9.07 / 2                        # [M] tower half side (UrbIS square, rotated 45 deg to the wings)
T_TOP = taw(104.80)                   # [M] tower walls top (UrbIS)
SPIRE_TIP = taw(130.25)               # [M] slate spire tip (UrbIS)
CROSS_TOP = taw(135.45)               # [M] DSM maximum = the weathercock
PLINTH = 0.9                          # top of the blue-grey stone plinth (photos)

# the UrbIS footprint in the church frame (x = east, y = front/north), metres; index = the UrbIS ring order
FP = [(-18.37, 14.79), (-19.26, 15.69), (-19.56, 16.34), (-19.67, 17.04), (-19.6, 17.76), (-19.35, 18.42), (-18.92, 19.0),
      (-18.36, 19.44), (-17.35, 19.79), (-16.28, 19.71), (-15.57, 19.41), (-14.68, 18.52), (-13.35, 19.85), (-9.75, 16.29),
      (-7.52, 18.42), (-4.21, 17.88), (-4.28, 25.56), (-0.12, 25.5), (4.28, 25.56), (4.38, 18.5), (7.57, 18.31), (10.03, 16.17),
      (10.29, 16.44), (13.51, 13.32), (16.45, 10.31), (15.86, 9.66), (18.36, 7.63), (18.45, 4.15), (19.82, 4.17), (22.37, 1.68),
      (22.28, -1.67), (19.84, -4.11), (18.43, -4.21), (18.46, -7.62), (20.83, -9.84), (23.37, -7.47), (25.09, -9.25),
      (23.44, -11.13), (27.75, -15.31), (26.8, -18.34), (24.04, -19.36), (22.56, -18.18), (22.56, -18.74), (21.77, -19.61),
      (20.58, -19.63), (19.24, -18.25), (15.99, -21.62), (14.3, -20.09), (11.77, -22.68), (9.73, -20.69), (12.28, -18.09),
      (18.41, -12.15), (16.59, -10.4), (10.69, -16.69), (10.05, -16.09), (7.91, -18.22), (4.52, -18.26), (4.64, -25.1),
      (-3.99, -25.25), (-4.12, -18.32), (-7.2, -18.37), (-10.01, -15.61), (-7.84, -13.99), (-13.97, -8.23), (-13.12, -7.37),
      (-14.44, -4.58), (-15.35, -4.57), (-15.3, -0.15), (-15.42, 4.13), (-16.91, 8.43), (-16.92, 9.45), (-16.41, 10.1),
      (-19.74, 13.41)]
# wings: axis k (0 = N, clockwise seen from above), outer end distance from the centre [M footprint + DSM ridges]
WINGS = {0: ("N", 25.53, "front"), 1: ("NE", 19.0, "lancets"), 2: ("E", 18.45, "apse"), 3: ("SE", 19.1, "lancets"),
         4: ("S", 25.2, "rose"), 5: ("SW", 15.6, "lancets"), 6: ("W", 15.3, "rose"), 7: ("NW", T_R - T_H, "tower")}
# corner chapels between wing k and k+1: their outer walls through these footprint points [M]
CHAPELS = {0: [19, 20, 21], 1: [25, 26, 27], 2: [32, 33, 52], 3: [54, 55, 56], 4: [59, 60, 61, 62], 5: [64, 65, 66],
           6: [68, 69, 70, 71], 7: [13, 14, 15]}
TURRET_PTS = list(range(0, 12))       # [M] the round stair turret on the tower's outer face

# ------------------------------------------------------------------------------------------------ builder
MASONRY, ROOF, GLASS, METAL = 0, 1, 2, 3
MAT_NAMES = ["Masonry", "Roof", "Glass", "Metal"]
BRICK, STONE, SAND, WOOD, DARK, BRICK_PLAIN = 0, 1, 2, 3, 4, 5
SLATE, DOME_SLATE, RED, LEAD = 0, 1, 2, 3
IRON, GILT, DIAL = 0, 1, 2
Z = Vector((0, 0, 1))
V3 = lambda x, y, z: Vector((x, y, z))

class Builder:
    def __init__(self):
        self.v = []; self.f = []; self.attr = []        # attr per face: (mat, sub, band)
    def face(self, pts, mat, sub=0, band=0):
        if len(pts) < 3: return
        i0 = len(self.v); self.v.extend(Vector(p) for p in pts)
        self.f.append(tuple(range(i0, i0 + len(pts)))); self.attr.append((mat, sub, band))
    def tris(self, pts, tri_idx, mat, sub=0, band=0):
        for t in tri_idx: self.face([pts[t[0]], pts[t[1]], pts[t[2]]], mat, sub, band)
B = Builder()
FAR = False                 # True while building the far LOD: the same plan, openings as flat dark shapes, no small details
S = dict(mat=MASONRY, sub=BRICK, band=1)        # current style for convenience helpers

def quad(a, b, c, d, mat, sub=0, band=0): B.face([a, b, c, d], mat, sub, band)

def newell(pts):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n

def face_dir(pts, want, mat, sub=0, band=0):
    """Add a face, flipped if needed so that its normal points along `want`."""
    pts = list(pts)
    if newell(pts).dot(want) < 0: pts.reverse()
    B.face(pts, mat, sub, band)

def face_up(pts, mat, sub=0, band=0): face_dir(pts, Z, mat, sub, band)
def face_down(pts, mat, sub=0, band=0): face_dir(pts, -Z, mat, sub, band)
def face_out(pts, centre, mat, sub=0, band=0):
    """Normal away from the vertical axis through centre."""
    c = sum(pts, Vector((0, 0, 0))) / len(pts)
    d = c - Vector((centre.x, centre.y, c.z))
    face_dir(pts, d, mat, sub, band)

def axis(k):  a = math.radians(45 * k); return V3(math.sin(a), math.cos(a), 0)
def perp(k):  a = math.radians(45 * k); return V3(math.cos(a), -math.sin(a), 0)
def ang_dir(deg): a = math.radians(deg); return V3(math.sin(a), math.cos(a), 0)

class Frame:
    """A planar wall frame: origin O, outward normal N (horizontal), U = Z x N (to the right seen from outside), V = Z."""
    def __init__(self, O, N):
        self.O = Vector(O); self.N = Vector(N).normalized(); self.U = Z.cross(self.N).normalized()
    def p(self, u, v, w=0.0): return self.O + self.U * u + Z * v + self.N * w

def ccw(pts2):
    a = sum(pts2[i][0] * pts2[(i + 1) % len(pts2)][1] - pts2[(i + 1) % len(pts2)][0] * pts2[i][1] for i in range(len(pts2)))
    return pts2 if a > 0 else list(reversed(pts2))

def fill2d(fr, loops, w, mat, sub=0, band=0, flip=False):
    """Triangulate 2D loops (first = outline, rest = holes) in frame fr at depth w, facing +N (or -N if flip)."""
    loops = [ccw(l) for l in loops]
    flat = [p for l in loops for p in l]
    tri = tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in loops])
    for t in tri:
        a, b, c = flat[t[0]], flat[t[1]], flat[t[2]]
        cr = (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])
        if abs(cr) < 1e-9: continue
        if (cr < 0) != flip: b, c = c, b
        B.face([fr.p(a[0], a[1], w), fr.p(b[0], b[1], w), fr.p(c[0], c[1], w)], mat, sub, band)

def strip2d(fr, loop, w0, w1, mat, sub=0, band=0, inward=True):
    """Side walls of a 2D loop between depths w0 (front) and w1: facing into the loop (a hole's reveal) or out of it."""
    loop = ccw(loop)
    n = len(loop)
    for i in range(n):
        a, b = loop[i], loop[(i + 1) % n]
        A0, B0, B1, A1 = fr.p(a[0], a[1], w0), fr.p(b[0], b[1], w0), fr.p(b[0], b[1], w1), fr.p(a[0], a[1], w1)
        if inward: quad(A0, B0, B1, A1, mat, sub, band)
        else: quad(A0, A1, B1, B0, mat, sub, band)

def circle2d(cx, cy, r, n, a0=0.0):
    return [(cx + r * math.cos(a0 + 2 * math.pi * i / n), cy + r * math.sin(a0 + 2 * math.pi * i / n)) for i in range(n)]

def box(O, U, V, N, u0, u1, v0, v1, w0, w1, mat, sub=0, band=0, skip=()):
    """An oriented box (U, V, N orthonormal, right-handed: U x V = N)."""
    P = lambda u, v, w: O + U * u + V * v + N * w
    F = {"front": [P(u0, v0, w1), P(u1, v0, w1), P(u1, v1, w1), P(u0, v1, w1)],
         "back": [P(u1, v0, w0), P(u0, v0, w0), P(u0, v1, w0), P(u1, v1, w0)],
         "top": [P(u0, v1, w1), P(u1, v1, w1), P(u1, v1, w0), P(u0, v1, w0)],
         "bottom": [P(u0, v0, w0), P(u1, v0, w0), P(u1, v0, w1), P(u0, v0, w1)],
         "right": [P(u1, v0, w1), P(u1, v0, w0), P(u1, v1, w0), P(u1, v1, w1)],
         "left": [P(u0, v0, w0), P(u0, v0, w1), P(u0, v1, w1), P(u0, v1, w0)]}
    for k, pts in F.items():
        if k not in skip: B.face(pts, mat, sub, band)

def fbox(fr, u0, u1, v0, v1, w0, w1, mat, sub=0, band=0, skip=()):
    if FAR and v1 - v0 < 0.36 and w1 - w0 < 0.45: return          # ledges, string courses, corbels: not in the far LOD
    box(fr.O, fr.U, Z, fr.N, u0, u1, v0, v1, w0, w1, mat, sub, band, skip)

def lathe(center, profile, segs, mat, sub=0, band=0, a0=0.0, cap_bottom=False):
    """Solid of revolution about the vertical through center; profile [(r, z)] bottom to top (r=0 closes)."""
    rings = []
    if FAR: segs = max(4, segs // 2)
    for r, z in profile:
        rings.append([center + V3(r * math.cos(a0 + 2 * math.pi * k / segs), r * math.sin(a0 + 2 * math.pi * k / segs), z) for k in range(segs)])
    for i in range(len(rings) - 1):
        r0, r1 = profile[i][0], profile[i + 1][0]
        for k in range(segs):
            a, b = rings[i][k], rings[i][(k + 1) % segs]
            c, d = rings[i + 1][(k + 1) % segs], rings[i + 1][k]
            if r1 < 1e-6: B.face([a, b, d], mat, sub, band)
            elif r0 < 1e-6: B.face([a, c, d], mat, sub, band)
            else: B.face([a, b, c, d], mat, sub, band)
    if cap_bottom and profile[0][0] > 1e-6: B.face(list(reversed(rings[0])), mat, sub, band)

def beam(p0, p1, up, hw, h0, h1, mat, sub=0, band=0, ends=True):
    """A box along p0->p1, cross-section: +-hw across (side = dir x up), h0..h1 along up."""
    d = (p1 - p0); L = d.length; d.normalize()
    side = d.cross(up).normalized(); up2 = side.cross(d).normalized()
    # box with U = d, V = up2, N = side  (U x V = d x (side x d) = side) right-handed
    box(p0, d, up2, side, 0, L, h0, h1, -hw, hw, mat, sub, band, skip=() if ends else ("left", "right"))

# ------------------------------------------------------------------------------------------------ openings
class Arch:
    """A round-arched opening: stone surround (proud), reveal, glass / louvres / door at the back, stone sill."""
    def __init__(self, uc, sill, top, w, depth=0.32, sur=0.2, kind="glass", proud=0.05, seg=8, ledge=True):
        self.__dict__.update(uc=uc, sill=sill, top=top, w=w, depth=depth, sur=sur, kind=kind, proud=proud, seg=seg, ledge=ledge)
    def contour(self, r, bottom):
        uc, sp = self.uc, self.top - self.w / 2
        pts = [(uc - r, bottom), (uc + r, bottom)]
        for i in range(self.seg + 1):
            a = math.pi * i / self.seg
            pts.append((uc + r * math.cos(a), sp + r * math.sin(a)))
        return pts
    def inner(self): return self.contour(self.w / 2, self.sill)
    def hole(self): return self.contour(self.w / 2 + self.sur, self.sill - (0.12 if self.ledge else self.sur))
    def build(self, fr):
        inner, outer = self.inner(), self.hole()
        fill2d(fr, [outer, inner], self.proud, MASONRY, STONE)
        strip2d(fr, outer, self.proud, 0.0, MASONRY, STONE, 0, inward=False)
        strip2d(fr, inner, self.proud, -self.depth, MASONRY, BRICK_PLAIN if self.kind != "door" else STONE)
        if self.kind == "glass":
            fill2d(fr, [inner], -self.depth, GLASS, 0)
            # a stone mullion + transom for wide windows (reads at street distance)
            if self.w >= 1.15:
                fbox(fr, self.uc - 0.06, self.uc + 0.06, self.sill, self.top - self.w / 2, -self.depth, -self.depth + 0.1, MASONRY, STONE, skip=("back",))
        elif self.kind == "louvre":
            louvres(fr, self)
        elif self.kind == "door":
            sp = self.top - self.w / 2
            fill2d(fr, [[(self.uc - self.w / 2, self.sill), (self.uc + self.w / 2, self.sill), (self.uc + self.w / 2, sp), (self.uc - self.w / 2, sp)]], -self.depth, MASONRY, WOOD)
            semi = [(self.uc + self.w / 2 * math.cos(math.pi * i / self.seg), sp + self.w / 2 * math.sin(math.pi * i / self.seg)) for i in range(self.seg + 1)]
            fill2d(fr, [semi], -self.depth, MASONRY, STONE)           # the tympanum
            fbox(fr, self.uc - self.w / 2, self.uc + self.w / 2, sp - 0.18, sp, -self.depth, -self.depth + 0.12, MASONRY, STONE, skip=("back",))
        elif self.kind == "blind":
            fill2d(fr, [inner], -self.depth, MASONRY, DARK)
        if self.ledge:
            fbox(fr, self.uc - self.w / 2 - self.sur - 0.06, self.uc + self.w / 2 + self.sur + 0.06, self.sill - 0.16, self.sill - 0.0, 0.0, 0.14, MASONRY, STONE, skip=("back",))

def louvres(fr, op):
    """Belfry louvre boards (abat-sons): slats tilted down outward, behind a dark interior."""
    x0, x1 = op.uc - op.w / 2 + 0.01, op.uc + op.w / 2 - 0.01
    sp = op.top - op.w / 2
    wb = -op.depth + 0.12
    y = op.sill + 0.12
    while y < sp + op.w * 0.35:
        half = math.sqrt(max(0.0, (op.w / 2) ** 2 - max(0.0, y + 0.2 - sp) ** 2)) if y + 0.2 > sp else op.w / 2
        a, b = max(x0, op.uc - half + 0.02), min(x1, op.uc + half - 0.02)
        if b - a > 0.1:
            # a board: front edge low and outward, back edge high and inward (sheds the rain out)
            p0, p1 = fr.p(a, y, wb + 0.1), fr.p(b, y, wb + 0.1)
            q0, q1 = fr.p(a, y + 0.22, wb - 0.12), fr.p(b, y + 0.22, wb - 0.12)
            quad(p0, p1, q1, q0, MASONRY, WOOD)
            t = Z * -0.025
            quad(p1 + t, p0 + t, q0 + t, q1 + t, MASONRY, WOOD)
            quad(p0 + t, p1 + t, p1, p0, MASONRY, WOOD)
        y += 0.27

class Rose:
    """A rose window: stone surround, reveal, eight-petal stone tracery (central oculus, 8 petals, 8 small oculi), glass."""
    def __init__(self, uc, vc, r, sur=0.34, depth=0.34, seg=40, pseg=12, proud=0.07):
        self.__dict__.update(uc=uc, vc=vc, r=r, sur=sur, depth=depth, seg=seg, pseg=pseg, proud=proud)
    def hole(self): return circle2d(self.uc, self.vc, self.r + self.sur, self.seg)
    def build(self, fr):
        u, v, r = self.uc, self.vc, self.r
        inner = circle2d(u, v, r, self.seg); outer = self.hole()
        fill2d(fr, [outer, inner], self.proud, MASONRY, STONE)
        strip2d(fr, outer, self.proud, 0.0, MASONRY, STONE, inward=False)
        # a second, inner order of the surround (a step back into the reveal)
        mid = circle2d(u, v, r + self.sur * 0.45, self.seg)
        strip2d(fr, inner, self.proud, -0.06, MASONRY, STONE)
        fill2d(fr, [circle2d(u, v, r, self.seg), circle2d(u, v, r * 0.93, self.seg)], -0.06, MASONRY, STONE)
        strip2d(fr, circle2d(u, v, r * 0.93, self.seg), -0.06, -0.14, MASONRY, STONE)
        wt0, wt1 = -0.14, -0.27
        holes = [circle2d(u, v, 0.2 * r, self.pseg)]
        for i in range(8):
            a = 2 * math.pi * i / 8 + math.pi / 2
            holes.append(circle2d(u + 0.585 * r * math.cos(a), v + 0.585 * r * math.sin(a), 0.2 * r, self.pseg))
            b = a + math.pi / 8
            holes.append(circle2d(u + 0.85 * r * math.cos(b), v + 0.85 * r * math.sin(b), 0.075 * r, 8))
        fill2d(fr, [circle2d(u, v, r * 0.93, self.seg)] + holes, wt0, MASONRY, STONE)
        for h in holes: strip2d(fr, h, wt0, wt1, MASONRY, STONE)
        fill2d(fr, [circle2d(u, v, r * 0.93, self.seg)], -self.depth, GLASS, 0)

class Clock:
    def __init__(self, uc, vc, r): self.__dict__.update(uc=uc, vc=vc, r=r)
    def hole(self): return None
    def build(self, fr):
        u, v, r = self.uc, self.vc, self.r
        ring_o, ring_i = circle2d(u, v, r + 0.22, 32), circle2d(u, v, r, 32)
        fill2d(fr, [ring_o, ring_i], 0.1, MASONRY, STONE)
        strip2d(fr, ring_o, 0.1, 0.0, MASONRY, STONE, inward=False)
        strip2d(fr, ring_i, 0.1, 0.05, MASONRY, STONE)
        fill2d(fr, [ring_i], 0.05, METAL, DIAL)
        for i in range(12):                                   # hour marks
            a = 2 * math.pi * i / 12
            c = (u + 0.82 * r * math.cos(a), v + 0.82 * r * math.sin(a))
            s = 0.05 if i % 3 else 0.075
            fill2d(fr, [circle2d(c[0], c[1], s, 4, a)], 0.062, METAL, IRON)
        # hands at ten past ten (gilded)
        for ang, L, wdt in ((math.radians(150), 0.55, 0.05), (math.radians(60), 0.8, 0.035)):
            d = (math.cos(ang), math.sin(ang)); n = (-d[1], d[0])
            pts = [(u - n[0] * wdt, v - n[1] * wdt), (u + n[0] * wdt, v + n[1] * wdt), (u + d[0] * L * r, v + d[1] * L * r)]
            fill2d(fr, [pts], 0.075, METAL, GILT)

def wall(fr, outline, openings=(), sub=BRICK, band=1, mat=MASONRY):
    if FAR:                                  # far LOD: a plain wall, each opening a flat dark shape just in front of it
        fill2d(fr, [outline], 0.0, mat, sub, band)
        for o in openings:
            if isinstance(o, Arch):
                o2 = Arch(o.uc, o.sill, o.top, o.w + 0.1, seg=3)
                fill2d(fr, [o2.inner()], 0.03, GLASS if o.kind == "glass" else MASONRY, 0 if o.kind == "glass" else DARK)
            elif isinstance(o, Rose):
                fill2d(fr, [circle2d(o.uc, o.vc, o.r + o.sur, 12)], 0.03, MASONRY, STONE)
                fill2d(fr, [circle2d(o.uc, o.vc, o.r * 0.93, 10)], 0.06, GLASS, 0)
        return
    holes = [o.hole() for o in openings if o.hole()]
    fill2d(fr, [outline] + holes, 0.0, mat, sub, band)
    for o in openings: o.build(fr)

# ------------------------------------------------------------------------------------------------ parts
def gable_coping(fr, half, z_eave, z_apex, w_front=0.14, w_back=-0.42, thick=0.2):
    """Stone coping along both sloped edges of a parapet gable, kneelers at the eaves."""
    for s in (-1, 1):
        p0 = fr.p(s * (half + 0.08), z_eave - 0.05, 0); p1 = fr.p(0, z_apex + 0.02, 0)
        d = (p1 - p0).normalized(); up = (Z - d * Z.dot(d)).normalized()
        N = d.cross(up)
        w0, w1 = (w_back, w_front) if N.dot(fr.N) > 0 else (-w_front, -w_back)
        box(p0, d, up, N, 0, (p1 - p0).length + 0.12, 0, thick, w0, w1, MASONRY, STONE)
    for s in (-1, 1):
        a, b = (half - 0.35, half + 0.1) if s > 0 else (-half - 0.1, -half + 0.35)
        fbox(fr, a, b, z_eave - 0.35, z_eave + 0.05, w_back, w_front, MASONRY, STONE)

def apex_cross(p, size=1.0, mat=METAL, sub=IRON, facing=None):
    f = facing or V3(0, 1, 0)
    side = Z.cross(f).normalized()
    box(p, side, Z, f, -0.05, 0.05, 0, size, -0.05, 0.05, mat, sub)
    box(p, side, Z, f, -0.3 * size, 0.3 * size, 0.62 * size, 0.72 * size, -0.05, 0.05, mat, sub)

def wing(k):
    name, L, kind = WINGS[k]
    ax, pp = axis(k), perp(k)
    r0 = A - 0.05
    pitch = (RIDGE - EAVE) / W2
    ov = 0.38                                         # eaves overhang
    # --- side walls (x2): from the drum to the gable; tall window on the long N and S wings beyond the chapels
    for s in (1, -1):
        fr = Frame(pp * s * W2, pp * s)
        # u along the axis: + outward for s=+1, - for s=-1
        sg = 1 if fr.U.dot(ax) > 0 else -1
        uA, uL = r0 * sg, L * sg
        endL = L if kind != "apse" else 19.83
        uL = endL * sg
        outline = [(min(uA, uL), GROUND), (max(uA, uL), GROUND), (max(uA, uL), EAVE), (min(uA, uL), EAVE)]
        ops = []
        if kind in ("front", "rose") and L > 24:
            ops.append(Arch(22.15 * sg, 2.7, 8.6, 1.3))
        wall(fr, outline, ops)
        # eaves cornice (stone) and the plinth ledge
        fbox(fr, min(uA, uL), max(uA, uL), EAVE - 0.32, EAVE - 0.02, 0, 0.18, MASONRY, STONE, skip=("back",))
        fbox(fr, min(uA, uL), max(uA, uL), PLINTH - 0.18, PLINTH, 0, 0.1, MASONRY, STONE, skip=("back",))
    # --- roof (two slopes), fascia, soffit, ridge cap
    rr0 = A - 2.0
    rr1 = L if kind not in ("apse",) else 18.75
    if kind == "tower": rr1 = L + 1.0
    eave_z = EAVE - ov * pitch
    for s in (1, -1):
        pr = ax * rr0 + Z * RIDGE; pe = ax * rr1 + Z * RIDGE
        er0 = ax * rr0 + pp * s * (W2 + ov) + Z * eave_z
        er1 = ax * (rr1 if kind != "apse" else 19.83) + pp * s * (W2 + ov) + Z * eave_z
        pts = [pr, pe, er1, er0] if s < 0 else [pe, pr, er0, er1]
        B.face(pts, ROOF, SLATE)
        # fascia + soffit
        f0, f1 = er0, er1
        d0, d1 = f0 - Z * 0.14, f1 - Z * 0.14
        w0, w1 = ax * rr0 + pp * s * W2 + Z * (EAVE - 0.3), ax * (rr1 if kind != "apse" else 19.83) + pp * s * W2 + Z * (EAVE - 0.3)
        if s > 0:
            quad(f0, d0, d1, f1, ROOF, LEAD); quad(d0, w0, w1, d1, MASONRY, STONE)
        else:
            quad(f1, d1, d0, f0, ROOF, LEAD); quad(d1, w1, w0, d0, MASONRY, STONE)
    beam(ax * rr0 + Z * (RIDGE - 0.02), ax * (rr1 + (0.0 if kind != "apse" else 0)) + Z * (RIDGE - 0.02), Z, 0.12, 0, 0.12, ROOF, LEAD)
    if kind == "apse":
        apse(k, pitch, ov); return
    if kind == "tower": return
    # --- the gable end
    fr = Frame(ax * L, ax)
    outline = [(-W2, GROUND), (W2, GROUND), (W2, EAVE + PAR), (0, RIDGE + PAR), (-W2, EAVE + PAR)]
    ops = []
    if kind == "front":
        ops = [Arch(0, 0.0, 4.75, 2.4, depth=1.0, sur=0.5, kind="door", proud=0.12, seg=10, ledge=False), Rose(0, 9.55, 2.05)]
    elif kind == "rose":
        ops = [Rose(0, 9.75, 2.0)] + [Arch(x, 2.7, 5.3, 0.8, sur=0.16) for x in (-1.25, 0, 1.25)]
    elif kind == "lancets":
        ops = [Arch(x, 2.5, 8.9 if x == 0 else 8.4, 0.92, sur=0.18) for x in (-1.45, 0, 1.45)] + \
              [Arch(0, RIDGE - 2.7, RIDGE - 1.2, 0.3, sur=0.1, kind="blind", depth=0.15, ledge=False, seg=6)]
    wall(fr, outline, ops, band=2 if kind == "front" else 1)
    gable_coping(fr, W2, EAVE + PAR, RIDGE + PAR)
    apex_cross(ax * (L + 0.0) + Z * (RIDGE + PAR + 0.2), 1.1 if kind == "front" else 0.8, MASONRY, STONE, facing=ax)
    # plinth ledge on the gable (around the portal on the front)
    if kind == "front":
        for a0, a1 in ((-W2, -1.8), (1.8, W2)): fbox(fr, a0, a1, PLINTH - 0.18, PLINTH, 0, 0.1, MASONRY, STONE, skip=("back",))
        fbox(fr, -W2, W2, 5.55, 5.8, 0, 0.12, MASONRY, STONE, skip=("back",))     # string course over the portal
    else:
        fbox(fr, -W2, W2, PLINTH - 0.18, PLINTH, 0, 0.1, MASONRY, STONE, skip=("back",))
    # corner buttresses (pilasters) with stone caps; tall ones on the front
    bw, bd, bh = (0.95, 0.62, EAVE + 1.1) if kind == "front" else (0.75, 0.42, EAVE - 1.2)
    for s in (-1, 1):
        ua, ub = (W2 - bw, W2 + 0.02) if s > 0 else (-W2 - 0.02, -W2 + bw)
        fbox(fr, ua, ub, GROUND, bh, 0, bd, MASONRY, BRICK, 1, skip=("back",))
        quoins(fr, ua, ub, bd, PLINTH, bh - 0.4)
        # sloped stone cap
        p = [fr.p(ua, bh, bd), fr.p(ub, bh, bd), fr.p(ub, bh + 0.45, 0.0), fr.p(ua, bh + 0.45, 0.0)]
        B.face(p, MASONRY, STONE)
        B.face([fr.p(ua, bh, bd), fr.p(ua, bh + 0.45, 0), fr.p(ua, bh, 0)], MASONRY, STONE)
        B.face([fr.p(ub, bh, bd), fr.p(ub, bh, 0), fr.p(ub, bh + 0.45, 0)], MASONRY, STONE)
        if kind == "front":
            lathe(fr.p((ua + ub) / 2, bh + 0.3, bd * 0.45), [(0.3, 0), (0.3, 0.5), (0.22, 0.6), (0.24, 0.9), (0.1, 1.3), (0, 1.5)], 8, MASONRY, STONE)
    if kind == "front": steps(fr)

def quoins(fr, ua, ub, w, z0, z1):
    """Stone quoins on the outer face of a pier, alternating long and short, slightly proud."""
    if FAR: return
    z, i = z0, 0
    while z + 0.3 < z1:
        L = 0.55 if i % 2 == 0 else 0.32
        for edge in (ua, ub):
            a, b = (edge, edge + L) if edge == ua else (edge - L, edge)
            a, b = max(a, ua), min(b, ub)
            fbox(fr, a, b, z, z + 0.3, w, w + 0.025, MASONRY, STONE, skip=("back",))
        z += 0.6; i += 1

def tower_quoins(fr, half, z0, z1):
    if FAR: return
    z, i = z0, 0
    while z + 0.3 < z1:
        L = 0.6 if i % 2 == 0 else 0.34
        for s in (-1, 1):
            a, b = (half - L, half + 0.025) if s > 0 else (-half - 0.025, -half + L)
            fbox(fr, a, b, z, z + 0.32, 0, 0.025, MASONRY, STONE, skip=("back",))
        z += 0.64; i += 1

def apse(k, pitch, ov):
    """The east wing's three-sided apse [M footprint 27-32, DSM hip slope]: walls to the eaves, tall windows, hip roof."""
    ax, pp = axis(k), perp(k)
    pts = [(19.83, W2), (22.35, 1.68), (22.35, -1.68), (19.83, -W2)]           # (along axis, across) [M]
    P = [ax * a + pp * b for a, b in pts]
    for i in range(3):
        a, b = P[i], P[i + 1]
        N = (b - a).cross(Z).normalized()
        if N.dot(ax) < 0: N = -N
        fr = Frame((a + b) / 2, N)
        L = (b - a).length
        wall(fr, [(-L / 2, GROUND), (L / 2, GROUND), (L / 2, EAVE), (-L / 2, EAVE)], [Arch(0, 2.6, 8.6, 1.2)])
        fbox(fr, -L / 2, L / 2, EAVE - 0.32, EAVE - 0.02, 0, 0.18, MASONRY, STONE, skip=("back",))
        fbox(fr, -L / 2, L / 2, PLINTH - 0.18, PLINTH, 0, 0.1, MASONRY, STONE, skip=("back",))
    # hip roof: from the ridge end down to the overhanging eaves polygon
    top = ax * 18.75 + Z * RIDGE
    E = [ax * 19.83 + pp * (W2 + ov) + Z * (EAVE - ov * pitch), ax * (22.35 + ov) + pp * (1.68 + ov * 0.6) + Z * (EAVE - ov * pitch),
         ax * (22.35 + ov) - pp * (1.68 + ov * 0.6) + Z * (EAVE - ov * pitch), ax * 19.83 - pp * (W2 + ov) + Z * (EAVE - ov * pitch)]
    for i in range(3):
        face_up([top, E[i + 1], E[i]], ROOF, SLATE)
    for e in (E[1], E[2]): beam(top, e, Z, 0.09, 0, 0.1, ROOF, LEAD)

def chapel(k):
    """Corner chapel between wings k and k+1: a polygonal apse through the measured footprint points, low walls with
    small arched windows, a pyramidal ("conical") roof from the arc's centre, leaning on the two wings."""
    idx = CHAPELS[k]
    pts = [Vector((FP[i][0], FP[i][1], 0)) for i in idx]
    pa, pm, pb = pts[0], max(pts[1:-1], key=lambda p: p.length), pts[-1]
    c, rad = circle3(pa, pm, pb)
    # sample the arc pa -> pb through pm with 5 facets
    a0 = math.atan2(pa.y - c.y, pa.x - c.x); a1 = math.atan2(pb.y - c.y, pb.x - c.x); am = math.atan2(pm.y - c.y, pm.x - c.x)
    def norm(a): return (a + math.pi) % (2 * math.pi) - math.pi
    d1 = norm(a1 - a0); dm = norm(am - a0)
    if (dm > 0) != (d1 > 0) or abs(dm) > abs(d1): d1 = d1 - math.copysign(2 * math.pi, d1)
    nf = 3 if FAR else 5
    arc = [c + V3(rad * math.cos(a0 + d1 * i / nf), rad * math.sin(a0 + d1 * i / nf), 0) for i in range(nf + 1)]
    small = k == 5
    eave = CH_EAVE - (0.5 if small else 0.0)
    for i in range(nf):
        a, b = arc[i], arc[i + 1]
        N = (b - a).cross(Z).normalized()
        if N.dot((a + b) / 2 - c) < 0: N = -N
        fr = Frame((a + b) / 2, N)
        L = (b - a).length
        ops = [Arch(0, 2.3, 4.7, 0.78, sur=0.16)] if (1 <= i <= nf - 2 and L > 1.5 and not small) else []
        wall(fr, [(-L / 2 - 0.02, GROUND), (L / 2 + 0.02, GROUND), (L / 2 + 0.02, eave), (-L / 2 - 0.02, eave)], ops)
        fbox(fr, -L / 2, L / 2, eave - 0.28, eave - 0.02, 0, 0.14, MASONRY, STONE, skip=("back",))
        fbox(fr, -L / 2, L / 2, PLINTH - 0.18, PLINTH, 0, 0.08, MASONRY, STONE, skip=("back",))
    # roof: apex over the arc centre, leaning back to the drum corner along the bisector
    bis = ang_dir(45 * k + 22.5)
    D = bis * (A / math.cos(math.pi / 8))
    top_z = CH_TOP - (1.0 if small else 0.0)
    X = c + Z * top_z
    ov = 0.3
    E = [c + (p - c) * ((rad + ov) / rad) + Z * (eave - ov * 0.7) for p in arc]
    for i in range(nf): face_up([X, E[i], E[i + 1]], ROOF, SLATE)
    for i in (1, nf - 1): beam(X, E[i], Z, 0.06, 0, 0.08, ROOF, LEAD)
    # lean-to parts between the apex, the drum corner and the wing walls (mostly hidden; closes the roof)
    Dz = D + Z * top_z
    face_up([Dz, E[0], X], ROOF, SLATE)
    face_up([Dz, X, E[-1]], ROOF, SLATE)
    # soffit ring
    for i in range(nf):
        a, b = arc[i] + Z * (eave - 0.02), arc[i + 1] + Z * (eave - 0.02)
        face_down([a, E[i] - Z * 0.1, E[i + 1] - Z * 0.1, b], MASONRY, STONE)
    return dict(center=(round(c.x, 2), round(c.y, 2)), radius=round(rad, 2))

def circle3(a, b, c):
    """Circle through three points (x, y)."""
    ax_, ay = a.x, a.y; bx, by = b.x, b.y; cx, cy = c.x, c.y
    d = 2 * (ax_ * (by - cy) + bx * (cy - ay) + cx * (ay - by))
    ux = ((ax_ * ax_ + ay * ay) * (by - cy) + (bx * bx + by * by) * (cy - ay) + (cx * cx + cy * cy) * (ay - by)) / d
    uy = ((ax_ * ax_ + ay * ay) * (cx - bx) + (bx * bx + by * by) * (ax_ - cx) + (cx * cx + cy * cy) * (bx - ax_)) / d
    cen = Vector((ux, uy, 0))
    return cen, (a - cen).length

def steps(fr):
    """The front flight [photos: ~13 steps fanning out; DTM 73.2 m at the foot]: a landing and 13 steps of 16.9 cm."""
    n = 13; rise = 0.169; run = 0.34; top_w = 5.2; land = 1.25
    fbox(fr, -top_w / 2, top_w / 2, GROUND, 0.0, 0, land, MASONRY, STONE, skip=("back",))
    for i in range(1, n + 1):
        w = top_w + i * 0.4
        z = -i * rise
        fbox(fr, -w / 2, w / 2, GROUND, z, land + (i - 1) * run, land + i * run, MASONRY, STONE, skip=("back",))
    # cheek walls along the landing, two handrails down the flight
    for s in (-1, 1):
        fbox(fr, min(s * top_w / 2, s * (top_w / 2 + 0.4)), max(s * top_w / 2, s * (top_w / 2 + 0.4)), GROUND, 0.75, 0, land + 0.3, MASONRY, STONE, skip=("back",))
        for x in (() if FAR else (s * 1.2,)):
            p0 = fr.p(x, 0.95, land - 0.1); p1 = fr.p(x * (1 + n * 0.05), -n * rise + 0.9, land + n * run)
            beam(p0, p1, Z, 0.025, -0.025, 0.025, METAL, IRON)
            for t in (0.0, 0.5, 1.0):
                q = p0.lerp(p1, t)
                box(q - Z * 0.95, fr.U, Z, fr.N, -0.02, 0.02, 0, 0.95, -0.02, 0.02, METAL, IRON)

def drum():
    """The octagonal drum [M UrbIS walls to 98.30 m]: brick with stone bands, a rose (oculus) in each face, cornice,
    corner turrets (pinnacles) with domed caps."""
    for k in range(8):
        fr = Frame(axis(k) * A, axis(k))
        wall(fr, [(-W2, 6.0), (W2, 6.0), (W2, DRUM_TOP - 0.5), (-W2, DRUM_TOP - 0.5)], [Rose(0, 19.55, 1.72, sur=0.3, seg=36, pseg=10)])
        fbox(fr, -W2 - 0.3, W2 + 0.3, DRUM_TOP - 0.55, DRUM_TOP, 0, 0.38, MASONRY, STONE, skip=("back",))
        fbox(fr, -W2, W2, DRUM_TOP - 1.25, DRUM_TOP - 1.05, 0, 0.1, MASONRY, STONE, skip=("back",))
        fbox(fr, -W2, W2, 16.6, 16.85, 0, 0.12, MASONRY, STONE, skip=("back",))
        # corner turret at the corner between face k and k+1
        bis = ang_dir(45 * k + 22.5)
        cpos = bis * (A / math.cos(math.pi / 8) + 0.15)
        tf = Frame(cpos, bis)
        fbox(tf, -0.55, 0.55, 8.0, 25.0, -0.55, 0.55, MASONRY, BRICK, 1, skip=("bottom",))
        for zb in (12.0, 16.6, 21.2):
            fbox(tf, -0.62, 0.62, zb, zb + 0.22, -0.62, 0.62, MASONRY, STONE, skip=("bottom",))
        fbox(tf, -0.68, 0.68, 24.75, 25.05, -0.68, 0.68, MASONRY, STONE)
        lathe(cpos + Z * 25.05, [(0.5, 0), (0.56, 0.25), (0.5, 0.45), (0.38, 0.95), (0.22, 1.35), (0.07, 1.62), (0, 1.75)], 10, ROOF, DOME_SLATE)
        lathe(cpos + Z * 26.75, [(0.04, 0), (0.1, 0.12), (0.12, 0.2), (0.08, 0.3), (0.02, 0.42), (0, 0.45)], 8, METAL, IRON)

def dome():
    """Ribbed octagonal dome [M DSM profile], faces bulging a little between lead-covered ribs, eight small red
    dormers, the lantern [M UrbIS heights] with its red railing and a small cupola."""
    prof = []
    for i in range(len(DOME) - 1):                       # Catmull-Rom densify (x3)
        p0 = DOME[max(i - 1, 0)]; p1 = DOME[i]; p2 = DOME[i + 1]; p3 = DOME[min(i + 2, len(DOME) - 1)]
        for j in range(3):
            t = j / 3
            prof.append(tuple(0.5 * ((2 * p1[q]) + (-p0[q] + p2[q]) * t + (2 * p0[q] - 5 * p1[q] + 4 * p2[q] - p3[q]) * t * t + (-p0[q] + 3 * p1[q] - 3 * p2[q] + p3[q]) * t ** 3) for q in (0, 1)))
    prof.append(DOME[-1])
    prof = [(DOME[0][0], DRUM_TOP)] + prof
    NS = 1 if FAR else 4                                 # segments across each face
    if FAR: prof = prof[::2] + ([prof[-1]] if len(prof) % 2 == 0 else [])
    cosk = math.cos(math.pi / 8)
    def P(rho, z, k, s):                                 # face k (centred on axis k), s in [0, 1] across
        a0 = math.radians(45 * k - 22.5); a1 = math.radians(45 * k + 22.5)
        c0 = V3(math.sin(a0), math.cos(a0), 0) * (rho / cosk); c1 = V3(math.sin(a1), math.cos(a1), 0) * (rho / cosk)
        p = c0.lerp(c1, s)
        bulge = 1 + 0.035 * math.sin(math.pi * s) * min(1.0, rho / 4.0)
        return p * bulge + Z * z
    for k in range(8):
        for i in range(len(prof) - 1):
            (r0, z0), (r1, z1) = prof[i], prof[i + 1]
            for j in range(NS):
                s0, s1 = j / NS, (j + 1) / NS
                face_out([P(r0, z0, k, s0), P(r0, z0, k, s1), P(r1, z1, k, s1), P(r1, z1, k, s0)], Vector((0, 0, 0)), ROOF, DOME_SLATE)
        if FAR: continue
        # rib at the corner between face k and k+1: a rounded lead roll
        a = math.radians(45 * k + 22.5); d = V3(math.sin(a), math.cos(a), 0); t = Z.cross(d)
        for i in range(len(prof) - 1):
            (r0, z0), (r1, z1) = prof[i], prof[i + 1]
            q0 = d * (r0 / cosk) + Z * z0; q1 = d * (r1 / cosk) + Z * z1
            n0 = (q1 - q0).cross(t).normalized()
            if n0.dot(d) < 0: n0 = -n0
            w = 0.17; h = 0.13
            L0, M0, R0 = q0 - t * w, q0 + n0 * h, q0 + t * w
            L1, M1, R1 = q1 - t * w, q1 + n0 * h, q1 + t * w
            face_out([L0, M0, M1, L1], Vector((0, 0, 0)), ROOF, LEAD); face_out([M0, R0, R1, M1], Vector((0, 0, 0)), ROOF, LEAD)
        # a dormer on each face
        dormer(k, prof)
    # the base of the lantern: an octagonal stone drum, deck, red railing
    lt = LANTERN_BASE - 0.3
    for k in range(8):
        fr = Frame(axis(k) * 1.95, axis(k))
        e = 1.95 * math.tan(math.pi / 8)
        fbox(fr, -e, e, lt, LANTERN_DECK - 0.25, -0.2, 0.0, MASONRY, BRICK, 1, skip=("back",))
        fbox(fr, -e - 0.1, e + 0.1, LANTERN_DECK - 0.25, LANTERN_DECK, -0.2, 0.22, MASONRY, STONE, skip=("back",))
    face_up([ang_dir(45 * k + 22.5) * (2.17 / cosk) + Z * LANTERN_DECK for k in range(8)], MASONRY, STONE)
    # lead flashing where the lantern drum (flat radius 1.95) stands on the dome, whose last ring is at 2.2: without it
    # a 25 cm ring stays open into the hollow dome. Skirt from the drum face down onto the slates (laps 0.3 m over them).
    r_in, z_in = 1.95, DOME[-1][1] + 0.22
    r_out = 2.5
    z_out = DOME[-2][1] + (DOME[-1][1] - DOME[-2][1]) * (r_out - DOME[-2][0]) / (DOME[-1][0] - DOME[-2][0]) + 0.03
    for k in range(8):
        a0, a1 = 45 * k - 22.5, 45 * k + 22.5
        face_out([ang_dir(a0) * (r_out / cosk) + Z * z_out, ang_dir(a1) * (r_out / cosk) + Z * z_out,
                  ang_dir(a1) * (r_in / cosk) + Z * z_in, ang_dir(a0) * (r_in / cosk) + Z * z_in], Vector((0, 0, z_out - 50)), ROOF, LEAD)
    if not FAR: railing(2.08, LANTERN_DECK, 1.0)
    # the open lantern: eight piers, arches, entablature
    lantern()

def dormer(k, prof):
    """A small dormer on dome face k [photos: red-painted, with a little gable], at about a third of the dome's height."""
    ax = axis(k)
    z0 = 26.3; zt = z0 + 1.55
    # dome flat radius at z0 (interpolate the profile)
    def rho_at(z):
        for (r0, a), (r1, b) in zip(prof, prof[1:]):
            if a <= z <= b: return r0 + (r1 - r0) * (z - a) / (b - a)
        return prof[-1][0]
    rf = rho_at(z0) + 0.05
    fr = Frame(ax * rf, ax)
    hw = 0.62
    outline = [(-hw, z0), (hw, z0), (hw, zt), (0, zt + 0.5), (-hw, zt)]
    win = [(-0.36, z0 + 0.18), (0.36, z0 + 0.18), (0.36, zt - 0.14), (-0.36, zt - 0.14)]
    fill2d(fr, [outline, win], 0.0, ROOF, RED)
    strip2d(fr, win, 0.0, -0.1, ROOF, RED)
    fill2d(fr, [win], -0.1, GLASS, 0)
    depth = 1.6
    for s in (-1, 1):                                    # cheeks
        a = fr.p(s * hw, z0, 0); b = fr.p(s * hw, zt, 0); c = fr.p(s * hw, zt, -depth); d = fr.p(s * hw, z0 - 0.6, -depth)
        face_dir([a, b, c, d], fr.U * s, ROOF, RED)
        # roof slopes
        e0 = fr.p(s * (hw + 0.08), zt - 0.06, 0.1); e1 = fr.p(s * (hw + 0.08), zt - 0.06, -depth)
        r0_ = fr.p(0, zt + 0.5, 0.1); r1_ = fr.p(0, zt + 0.5, -depth)
        face_up([r0_, e0, e1, r1_], ROOF, DOME_SLATE)

def railing(r, z0, h):
    """The red railing round the lantern deck [photos]: posts, top and bottom rails, bars."""
    cosk = math.cos(math.pi / 8)
    C8 = [ang_dir(45 * k + 22.5) * (r / cosk) + Z * z0 for k in range(8)]
    for k in range(8):
        a, b = C8[k], C8[(k + 1) % 8]
        for zz in (0.08, h):
            beam(a + Z * zz, b + Z * zz, Z, 0.035, -0.04, 0.04, ROOF, RED)
        n = 7
        for i in range(n + 1):
            p = a.lerp(b, i / n)
            box(p, (b - a).normalized(), Z, Z.cross((b - a).normalized()) * -1, -0.022 if i else -0.05, 0.022 if i else 0.05, 0, h, -0.022 if i else -0.05, 0.022 if i else 0.05, ROOF, RED, skip=("bottom",))

def lantern():
    cosk = math.cos(math.pi / 8)
    z0, z1 = LANTERN_DECK, LANTERN_TOP - 0.85
    for k in range(8):
        c = ang_dir(45 * k + 22.5) * (LANTERN_R / cosk)
        d = ang_dir(45 * k + 22.5)
        box(c, Z.cross(d), Z, d, -0.17, 0.17, z0, z1, -0.17, 0.17, MASONRY, STONE)
        # arch between pier k and k+1 (face k+1 direction): a spandrel panel with a round-arched opening, both sides
        ax = axis(k + 1)
        fr = Frame(ax * LANTERN_R, ax)
        e = LANTERN_R * math.tan(math.pi / 8) - 0.17
        top = z1
        spring = z1 - 0.95
        pts = [(e, spring)] + [(e * math.cos(math.pi * i / 6), spring + e * math.sin(math.pi * i / 6)) for i in range(1, 6)] + [(-e, spring), (-e, top), (e, top)]
        fill2d(fr, [pts], 0.06, MASONRY, STONE)
        fill2d(fr, [pts], -0.06, MASONRY, STONE, flip=True)
        # a low balustrade panel at the foot of each opening (dark: the photos show the openings dark-edged)
        fbox(fr, -e, e, z0, z0 + 0.55, -0.05, 0.05, MASONRY, STONE)
    # entablature ring and the cupola
    for k in range(8):
        fr = Frame(axis(k) * LANTERN_R, axis(k))
        e = LANTERN_R * math.tan(math.pi / 8)
        fbox(fr, -e - 0.12, e + 0.12, z1, LANTERN_TOP, -0.35, 0.22, MASONRY, STONE)
    lathe(Z * LANTERN_TOP, [(1.72, 0), (1.66, 0.25), (1.5, 0.85), (1.24, 1.5), (0.86, 2.05), (0.44, 2.45), (0.12, 2.66), (0, 2.7)], 16, ROOF, DOME_SLATE, a0=math.pi / 16)
    lathe(Z * (CUPOLA_TOP - 0.05), [(0.08, 0), (0.16, 0.1), (0.19, 0.25), (0.16, 0.4), (0.06, 0.5), (0, 0.52)], 10, METAL, GILT)
    p = Z * (CUPOLA_TOP + 0.45)
    apex_cross(p, 1.25, METAL, IRON)

def tower():
    """The tower [M square 9.07 m on the NW diagonal, walls to 104.80 m, spire tip 130.25 m, weathercock 135.45 m],
    levels from the photos: slit windows, a triple window, the belfry (three louvred arches per face), corbel cornice,
    four clock gables, corner pinnacles, an octagonal broach spire in slate, cross and weathercock."""
    u = axis(7); v = Z.cross(u)
    Tc = u * T_R
    h = T_H
    faces = [u, -v, -u, v]
    nest = None
    for j, n in enumerate(faces):
        fr = Frame(Tc + n * h, n)
        ops = []
        if j != 2:
            ops.append(Arch(0, 11.8, 13.6, 0.45, sur=0.13, seg=6))
        ops += [Arch(x, 17.1, 19.25, 0.56, sur=0.14, seg=6) for x in (-0.9, 0, 0.9)]
        ops += [Arch(x, 21.45, 26.35, 1.04, sur=0.19, kind="louvre", depth=0.62, seg=8) for x in (-1.5, 0, 1.5)]
        wall(fr, [(-h, GROUND), (h, GROUND), (h, T_TOP), (-h, T_TOP)], ops)
        # string courses and the top cornice (stone), plinth ledge
        for z0, z1, pr in ((PLINTH - 0.18, PLINTH, 0.1), (16.5, 16.75, 0.14), (20.75, 21.05, 0.22), (27.35, 27.55, 0.1)):
            fbox(fr, -h - pr, h + pr, z0, z1, 0, pr, MASONRY, STONE, skip=("back",))
        # corbel table under the cornice: small stone brackets
        for i in range(11):
            x = -h + 0.45 + i * (2 * h - 0.9) / 10
            fbox(fr, x - 0.12, x + 0.12, 28.05, 28.55, 0, 0.22, MASONRY, STONE, skip=("back",))
        fbox(fr, -h - 0.32, h + 0.32, 28.55, T_TOP - 0.05, 0, 0.32, MASONRY, STONE, skip=("back",))
        # checker of small stone squares under the belfry cornice (photo a)
        for i in range(7):
            x = -2.4 + i * 0.8
            fbox(fr, x - 0.11, x + 0.11, 27.75, 27.97, 0, 0.03, MASONRY, STONE, skip=("back",))
        tower_quoins(fr, h, PLINTH, 28.0)
        # clock gable
        gb = h - 0.95
        g = [(-gb, T_TOP - 0.06), (gb, T_TOP - 0.06), (gb, T_TOP + 0.45), (0, T_TOP + 4.45), (-gb, T_TOP + 0.45)]
        fill2d(fr, [g], 0.0, MASONRY, BRICK, 1)
        if FAR: fill2d(fr, [circle2d(0, T_TOP + 1.95, 1.0, 10)], 0.05, METAL, DIAL)
        else: Clock(0, T_TOP + 1.95, 0.88).build(fr)
        gable_coping(fr, gb, T_TOP + 0.45, T_TOP + 4.45, w_front=0.16, w_back=-0.3)
        apex_cross(fr.p(0, T_TOP + 4.6, 0), 0.6, MASONRY, STONE, facing=n)
        # the gable's roof, back into the spire
        depth = 2.6
        for s in (-1, 1):
            e0 = fr.p(s * (gb + 0.1), T_TOP + 0.38, -0.02); e1 = fr.p(s * (gb + 0.1), T_TOP + 0.38 - 0.0, -depth)
            r0_ = fr.p(0, T_TOP + 4.42, -0.02); r1_ = fr.p(0, T_TOP + 4.42, -depth)
            face_up([r0_, e0, e1, r1_], ROOF, SLATE)
        if j == 0:
            nest = fr.p(1.5, 20.95, -1.05)                   # on the chamber floor behind the right-hand belfry arch, outer face
    # belfry chamber (dark, seen through the louvres), its floor = the nest ledge
    hi = h - 0.62
    for j, n in enumerate(faces if not FAR else []):
        fr = Frame(Tc + n * hi, n)
        fill2d(fr, [[(-hi, 20.9), (hi, 20.9), (hi, 28.2), (-hi, 28.2)]], 0.0, MASONRY, DARK, flip=True)
    if not FAR: face_up([Tc + u * hi + v * hi + Z * 20.9, Tc + u * hi - v * hi + Z * 20.9, Tc - u * hi - v * hi + Z * 20.9, Tc - u * hi + v * hi + Z * 20.9], MASONRY, DARK)
    # corner pinnacles
    for su in (-1, 1):
        for sv in (-1, 1):
            c = Tc + u * su * (h - 0.42) + v * sv * (h - 0.42)
            box(c, v, Z, u, -0.42, 0.42, T_TOP - 0.1, T_TOP + 2.0, -0.42, 0.42, MASONRY, BRICK, 1, skip=("bottom",))
            box(c, v, Z, u, -0.5, 0.5, T_TOP + 2.0, T_TOP + 2.2, -0.5, 0.5, MASONRY, STONE)
            lathe(c + Z * (T_TOP + 2.2), [(0.48, 0), (0.3, 0.9), (0.12, 1.6), (0, 1.9)], 4, ROOF, SLATE, a0=math.pi / 4 + math.radians(45 * 7))
    # spire: square (bell-cast eaves) -> octagon -> tip
    zb = T_TOP + 0.05
    sq = h + 0.12
    oct_r, z_oct = 3.65, T_TOP + 4.0
    tip = Tc + Z * SPIRE_TIP
    O = [Tc + (u * math.cos(math.radians(22.5 + 45 * i)) + v * math.sin(math.radians(22.5 + 45 * i))) * (oct_r / math.cos(math.pi / 8)) + Z * z_oct for i in range(8)]
    # square ring points: corners and the points under the octagon's vertices
    def sqp(angle):
        d = u * math.cos(angle) + v * math.sin(angle)
        m = max(abs(math.cos(angle)), abs(math.sin(angle)))
        return Tc + d * (sq / m) + Z * zb
    S8 = [sqp(math.radians(22.5 + 45 * i)) for i in range(8)]
    SC = [sqp(math.radians(45 + 90 * i)) for i in range(4)]
    for i in range(8):
        a, b = S8[i], S8[(i + 1) % 8]
        oa, ob = O[i], O[(i + 1) % 8]
        if i % 2 == 0:                                   # across a corner of the square: the broach
            corner = SC[i // 2]
            face_out([a, corner, oa], Tc, ROOF, SLATE)
            face_out([corner, ob, oa], Tc, ROOF, SLATE)
            face_out([corner, b, ob], Tc, ROOF, SLATE)
        else:
            face_out([a, b, ob, oa], Tc, ROOF, SLATE)
        face_out([oa, ob, tip], Tc, ROOF, SLATE)
    # bell-cast eaves skirt under the square ring
    for i in range(4):
        c0, c1 = SC[i], SC[(i + 1) % 4]
        d0 = Tc + (c0 - Tc - Z * zb) * ((sq + 0.28) / sq) + Z * (zb - 0.22)
        d1 = Tc + (c1 - Tc - Z * zb) * ((sq + 0.28) / sq) + Z * (zb - 0.22)
        face_out([c0, c1, d1, d0], Tc, ROOF, SLATE)
    # finial: ball, cross, weathercock
    lathe(tip - Z * 0.3, [(0.1, 0), (0.22, 0.25), (0.24, 0.42), (0.2, 0.6), (0.06, 0.75), (0, 0.8)], 10, METAL, GILT)
    top = Z * CROSS_TOP
    box(tip, v, Z, u, -0.045, 0.045, 0.4, CROSS_TOP - SPIRE_TIP - 0.75, -0.045, 0.045, METAL, IRON)
    box(tip, v, Z, u, -0.55, 0.55, 2.9, 3.0, -0.04, 0.04, METAL, IRON)
    box(tip, v, Z, u, -0.04, 0.04, 2.9, 3.0, -0.55, 0.55, METAL, IRON)
    if not FAR: cock(tip + Z * (CROSS_TOP - SPIRE_TIP - 0.8), u)
    return Tc, nest

def cock(base, facing):
    """A flat gilded weathercock (silhouette), 0.8 m tall."""
    prof = [(-0.42, 0.05), (-0.1, 0.0), (0.18, 0.05), (0.3, 0.25), (0.34, 0.5), (0.28, 0.62), (0.36, 0.7), (0.26, 0.74), (0.2, 0.68),
            (0.12, 0.5), (0.0, 0.32), (-0.2, 0.34), (-0.38, 0.62), (-0.48, 0.52), (-0.46, 0.25)]
    side = Z.cross(facing).normalized()
    fr = Frame(base, side)
    fill2d(fr, [prof], 0.02, METAL, GILT)
    fill2d(fr, [prof], -0.02, METAL, GILT, flip=True)
    strip2d(fr, prof, 0.02, -0.02, METAL, GILT, inward=False)

def stair_turret():
    """The round stair turret on the tower's outer face [M footprint points 0-11, DSM top 85 m]."""
    pts = [Vector((FP[i][0], FP[i][1], 0)) for i in TURRET_PTS]
    c, r = circle3(pts[1], pts[6], pts[10])
    n = 8 if FAR else 16
    eave = CH_EAVE + 0.3
    for i in range(n):
        a0, a1 = 2 * math.pi * i / n, 2 * math.pi * (i + 1) / n
        p0 = c + V3(r * math.cos(a0), r * math.sin(a0), 0); p1 = c + V3(r * math.cos(a1), r * math.sin(a1), 0)
        N = ((p0 + p1) / 2 - c).normalized()
        fr = Frame((p0 + p1) / 2, N)
        L = (p1 - p0).length
        ops = [Arch(0, 3.2, 4.2, 0.22, sur=0.1, seg=4, depth=0.2)] if i == 4 else []
        wall(fr, [(-L / 2 - 0.01, GROUND), (L / 2 + 0.01, GROUND), (L / 2 + 0.01, eave), (-L / 2 - 0.01, eave)], ops)
        fbox(fr, -L / 2, L / 2, eave - 0.25, eave, 0, 0.12, MASONRY, STONE, skip=("back",))
        fbox(fr, -L / 2, L / 2, PLINTH - 0.18, PLINTH, 0, 0.08, MASONRY, STONE, skip=("back",))
    lathe(c + Z * (eave - 0.15), [(r + 0.28, 0), (0, taw(85.6) - eave + 0.15)], n, ROOF, SLATE)
    return dict(center=(round(c.x, 2), round(c.y, 2)), radius=round(r, 2))

def house(fr_o, s0, s1, t0, t1, eave, ridge, along_s, sd, td, windows=True):
    """A plain gabled block in the frame (origin, s dir, t dir): the sacristy annex [M footprint 34-51, DSM]."""
    P = lambda s, t, z: fr_o + sd * s + td * t + Z * z
    corners = [(s0, t0), (s1, t0), (s1, t1), (s0, t1)]
    for i in range(4):
        (a_s, a_t), (b_s, b_t) = corners[i], corners[(i + 1) % 4]
        pa, pb = P(a_s, a_t, 0), P(b_s, b_t, 0)
        N = (pb - pa).cross(Z).normalized()
        if N.dot(pa - P((s0 + s1) / 2, (t0 + t1) / 2, 0)) < 0: N = -N
        fr = Frame((pa + pb) / 2, N)
        L = (pb - pa).length
        gable = (i in (1, 3)) if along_s else (i in (0, 2))
        top = [(L / 2, eave), (0, ridge + 0.0), (-L / 2, eave)] if gable and ridge > eave else [(L / 2, eave), (-L / 2, eave)]
        ops = []
        if windows and L > 4 and not FAR:
            nwin = int(L // 3.2)
            for q in range(nwin):
                x = -L / 2 + (q + 0.5) * L / nwin
                ops.append(Arch(x, 1.2, min(3.2, eave - 0.6), 0.75, sur=0.14, seg=6))
        wall(fr, [(-L / 2, GROUND), (L / 2, GROUND)] + top, ops)
        fbox(fr, -L / 2, L / 2, PLINTH - 0.18, PLINTH, 0, 0.08, MASONRY, STONE, skip=("back",))
    ov = 0.3
    if ridge > eave:
        if along_s:
            tm = (t0 + t1) / 2
            for ta, tb in ((t0 - ov, tm), (t1 + ov, tm)):
                pts = [P(s0 - ov, ta, eave - 0.2), P(s1 + ov, ta, eave - 0.2), P(s1 + ov, tb, ridge), P(s0 - ov, tb, ridge)]
                if (pts[1] - pts[0]).cross(pts[3] - pts[0]).z < 0: pts = pts[::-1]
                B.face(pts, ROOF, SLATE)
        else:
            sm = (s0 + s1) / 2
            for sa, sb in ((s0 - ov, sm), (s1 + ov, sm)):
                pts = [P(sa, t0 - ov, eave - 0.2), P(sa, t1 + ov, eave - 0.2), P(sb, t1 + ov, ridge), P(sb, t0 - ov, ridge)]
                if (pts[1] - pts[0]).cross(pts[3] - pts[0]).z < 0: pts = pts[::-1]
                B.face(pts, ROOF, SLATE)
    else:
        pts = [P(s0, t0, eave), P(s1, t0, eave), P(s1, t1, eave), P(s0, t1, eave)]
        if (pts[1] - pts[0]).cross(pts[3] - pts[0]).z < 0: pts = pts[::-1]
        B.face(pts, ROOF, LEAD)

def annex():
    sd = axis(3)
    # (s, t): s along the SE axis, t = (x + y) / sqrt2  -> t dir = (1, 1)/sqrt2 (NE)
    td = V3(1, 1, 0).normalized()
    o = Vector((0, 0, 0))
    house(o, 21.5, 24.4, -7.75, 11.2, 4.2, 6.2, False, sd, td)          # the corridor along the SE wing's end
    house(o, 24.4, 31.6, 0.7, 8.8, 4.2, 7.4, True, sd, td)              # the sacristy proper (DSM ridge 82.8 m)
    house(o, 24.3, 26.6, -4.1, 0.7, 3.4, 3.4, True, sd, td, windows=False)
    house(o, 19.1, 21.5, -3.0, 3.4, 1.6, 1.6, True, sd, td, windows=False)

# ------------------------------------------------------------------------------------------------ build
def build_all():
    info = {}
    for k in range(8): wing(k)
    for k in range(8): info[k] = chapel(k)
    drum(); dome()
    tc, ns = tower()
    tur = stair_turret()
    annex()
    return info, tc, ns, tur

chapels_info, Tc, nest, turret = build_all()
B_MAIN = B
print(f"built {len(B.f)} faces in {time.time() - T0:.1f}s")
B = Builder(); FAR = True                       # the far LOD: same plan and functions, details off
build_all()
B_FAR = B
FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for i, name in enumerate(MAT_NAMES):
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)

def make_object(name, bld, v0, v1):
    """Mesh from a builder: material slots, the code colours, UV0 (world metres), merged vertices, smooth-by-angle
    normals, and a lightmap UV1 packed into the strip v0..v1 of the shared AO image."""
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(p) for p in bld.v], [], bld.f)
    me.update()
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set("material_index", [a[0] for a in bld.attr])
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cdat = []
    for poly, (mt, sub, band) in zip(me.polygons, bld.attr):
        for _ in poly.loop_indices: cdat += [sub / 8 + 1 / 16, band / 4 + 1 / 8, mt / 4 + 1 / 8, 1.0]
    col.data.foreach_set("color", cdat)
    uv0 = me.uv_layers.new(name="UVMap")
    uvd = [0.0] * (2 * len(me.loops))
    for poly in me.polygons:
        n = poly.normal
        if abs(n.z) < 0.75:
            t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
        else:
            t = Z.cross(n)
            t = t.normalized() if t.length > 1e-4 else Vector((1, 0, 0))
            b = n.cross(t).normalized()
        for li in poly.loop_indices:
            p = me.vertices[me.loops[li].vertex_index].co
            uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
    uv0.data.foreach_set("uv", uvd)
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
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.0015, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0012)
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    uv1 = me.uv_layers["Lightmap"]; uv0 = me.uv_layers["UVMap"]       # (edit mode re-allocated the layers)
    d = [0.0] * (2 * len(me.loops)); uv1.data.foreach_get("uv", d)
    for i in range(1, len(d), 2): d[i] = v0 + d[i] * (v1 - v0)
    uv1.data.foreach_set("uv", d)
    me.uv_layers.active = uv0
    return obj, ntri

AO_SPLIT = 0.875                                 # main model: v 0..0.875 of the AO image; far LOD: 0.88..1
obj, ntri = make_object("StJob", B_MAIN, 0.0, AO_SPLIT)
far, ntri_far = make_object("StJob_far", B_FAR, AO_SPLIT + 0.005, 1.0)
print(f"uv done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground for the bake + previews
def load_ground():
    import numpy as np
    meta = json.load(open(os.path.join(OUT, "site_dtm.json")))
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(meta["rows"], meta["cols"]).astype(np.float64) / 100 + 60.0
    st = 2                                          # 1 m grid
    a = a[::st, ::st]; step = meta["step"] * st
    rows, cols = a.shape
    cr, sr = math.cos(ROT_Y), math.sin(ROT_Y)
    verts = []
    for r in range(rows):
        for c in range(cols):
            wx = meta["x0"] + c * step - C_WORLD[0]; wz = meta["z0"] + r * step - C_WORLD[1]
            # world (x, z) -> church frame: x' = east = (cos, -sin) . (x, z)... (three.js rotation.y = ROT_Y)
            lx = cr * wx - sr * wz; lz = sr * wx + cr * wz        # inverse of the model's rotation
            verts.append((lx, -lz, a[r, c] - FLOOR))              # three z (south) -> blender -y
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.15, 0.13, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g
ground = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 5.0
ao_img = bpy.data.images.new("stjob_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"
    nt.nodes.active = n
if BAKE:
    scn.cycles.samples = 96
    scn.render.bake.margin = 4
    t = time.time()
    for target, other, clear in ((obj, far, True), (far, obj, False)):
        other.hide_render = True; target.hide_render = False
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=4, use_clear=clear)
    obj.hide_render = far.hide_render = False
    print(f"AO bake {time.time() - t:.1f}s")
    ao_img.filepath_raw = os.path.join(OUT, "stjob_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "stjob_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:                                     # drop the bake node so the GLB carries no image
    m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
nest_e = bpy.data.objects.new("nest", None); nest_e.location = nest; scn.collection.objects.link(nest_e)
nest_e.empty_display_type = "SPHERE"; nest_e.empty_display_size = 0.4
tip_e = bpy.data.objects.new("spire_tip", None); tip_e.location = Tc + Z * SPIRE_TIP; scn.collection.objects.link(tip_e)
for o in scn.objects: o.select_set(False)
for o in (obj, far, nest_e, tip_e): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "stjob.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

# notes
info = {
    "asset": "Église Saint-Job, Uccle (tools/blender/stjob.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far,
    "materials": MAT_NAMES,
    "codes": {"Col.r": "subtype/8 + 1/16", "Col.g": "band pattern/4 + 1/8 (0 none, 1 stone bands every 1.10 m)", "Col.b": "material/4 + 1/8",
              "Masonry": ["brick", "white stone", "sandstone", "dark wood", "dark interior", "brick, no bands"],
              "Roof": ["slate", "dome slate", "red paint", "lead"], "Glass": ["leaded glass"], "Metal": ["iron", "gilded", "clock dial"]},
    "frame": "glTF Y up; +x = the church's east (axis E), -z = the front (north, portal); origin = octagon centre at FLOOR",
    "placement": {"city_local_position": [C_WORLD[0], FLOOR, C_WORLD[1]], "rotation_y_rad": ROT_Y,
                  "hides": "the UrbIS solid(s) with attrs.BU_ID == https://databrussels.be/id/building/1587133 (buildingsolid/509924)"},
    "measured": {
        "source": "UrbIS 3D BuildingSolids (buildingsolid/509924, CC0) + UrbIS DSM/DTM 2021 0.5 m (sheet 149164, CC0)",
        "octagon_centre_city": C_WORLD, "wing_axes_rotation_deg": round(math.degrees(ROT_Y), 2),
        "octagon_face_to_centre": A, "wing_width": round(2 * W2, 2),
        "wing_ends_from_centre": {v[0]: v[1] for v in WINGS.values()},
        "wing_eaves_taw": 86.5, "wing_ridge_taw": 90.1, "chapel_eaves_taw": 82.0, "chapel_apex_taw": 85.0,
        "drum_top_taw": 98.3, "dome_profile_taw": [(r, round(z + FLOOR, 2)) for r, z in DOME],
        "lantern_taw": [109.0, 110.6, 115.8, 118.5], "tower_centre_from_octagon": T_R, "tower_side": 2 * T_H,
        "tower_walls_top_taw": 104.8, "spire_tip_taw": 130.25, "weathercock_taw": 135.45,
        "chapels": chapels_info, "stair_turret": turret,
        "ground_taw": {"front_steps_foot": 73.2, "south": 74.4, "north_west": 72.7},
    },
    "estimated": {"floor_taw": FLOOR, "plinth_top_above_floor": PLINTH,
                  "from_photos": "window / rose / belfry / clock positions and sizes, band spacing, steps, dormers, lantern piers, railing"},
    "nest": [round(nest.x, 2), round(nest.z, 2), round(-nest.y, 2)],
}
json.dump(info, open(os.path.join(OUT, "stjob.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    import numpy as np
    def preview_material(m, kind):
        nt = m.node_tree; nodes = nt.nodes; links = nt.links
        bsdf = nodes["Principled BSDF"]
        attr = nodes.new("ShaderNodeAttribute"); attr.attribute_name = "Col"
        sep = nodes.new("ShaderNodeSeparateColor"); links.new(attr.outputs["Color"], sep.inputs[0])
        ramp = nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.interpolation = "CONSTANT"
        cols = {"Masonry": [(0.17, 0.055, 0.032), (0.72, 0.68, 0.6), (0.45, 0.44, 0.4), (0.06, 0.045, 0.035), (0.02, 0.018, 0.016), (0.17, 0.055, 0.032)],
                "Roof": [(0.07, 0.075, 0.085), (0.1, 0.12, 0.11), (0.45, 0.04, 0.03), (0.22, 0.23, 0.24)],
                "Glass": [(0.03, 0.035, 0.04)], "Metal": [(0.03, 0.03, 0.03), (0.8, 0.55, 0.2), (0.75, 0.72, 0.65)]}[kind]
        els = ramp.color_ramp.elements
        els[0].position = 0.0; els[0].color = (*cols[0], 1)
        els[1].position = min(0.999, 1 / 8) if len(cols) > 1 else 0.999; els[1].color = (*(cols[1] if len(cols) > 1 else cols[0]), 1)
        for i in range(2, len(cols)):
            e = els.new(i / 8); e.color = (*cols[i], 1)
        links.new(sep.outputs["Red"], ramp.inputs["Fac"])
        out_col = ramp.outputs["Color"]
        if kind == "Masonry":
            geo = nodes.new("ShaderNodeNewGeometry")
            sz = nodes.new("ShaderNodeSeparateXYZ"); links.new(geo.outputs["Position"], sz.inputs[0])
            m1 = nodes.new("ShaderNodeMath"); m1.operation = "SUBTRACT"; m1.inputs[1].default_value = PLINTH; links.new(sz.outputs["Z"], m1.inputs[0])
            m2 = nodes.new("ShaderNodeMath"); m2.operation = "DIVIDE"; m2.inputs[1].default_value = 1.1; links.new(m1.outputs[0], m2.inputs[0])
            m3 = nodes.new("ShaderNodeMath"); m3.operation = "FRACT"; links.new(m2.outputs[0], m3.inputs[0])
            m4 = nodes.new("ShaderNodeMath"); m4.operation = "LESS_THAN"; m4.inputs[1].default_value = 0.15 / 1.1; links.new(m3.outputs[0], m4.inputs[0])
            isb = nodes.new("ShaderNodeMath"); isb.operation = "LESS_THAN"; isb.inputs[1].default_value = 1 / 8; links.new(sep.outputs["Red"], isb.inputs[0])
            bandg = nodes.new("ShaderNodeMath"); bandg.operation = "GREATER_THAN"; bandg.inputs[1].default_value = 0.25; links.new(sep.outputs["Green"], bandg.inputs[0])
            f1 = nodes.new("ShaderNodeMath"); f1.operation = "MULTIPLY"; links.new(m4.outputs[0], f1.inputs[0]); links.new(isb.outputs[0], f1.inputs[1])
            f2 = nodes.new("ShaderNodeMath"); f2.operation = "MULTIPLY"; links.new(f1.outputs[0], f2.inputs[0]); links.new(bandg.outputs[0], f2.inputs[1])
            mix = nodes.new("ShaderNodeMix"); mix.data_type = "RGBA"
            links.new(f2.outputs[0], mix.inputs["Factor"]); links.new(out_col, mix.inputs[6]); mix.inputs[7].default_value = (0.72, 0.68, 0.6, 1)
            pl = nodes.new("ShaderNodeMath"); pl.operation = "LESS_THAN"; pl.inputs[1].default_value = PLINTH; links.new(sz.outputs["Z"], pl.inputs[0])
            pf = nodes.new("ShaderNodeMath"); pf.operation = "MULTIPLY"; links.new(pl.outputs[0], pf.inputs[0]); links.new(isb.outputs[0], pf.inputs[1])
            mix2 = nodes.new("ShaderNodeMix"); mix2.data_type = "RGBA"
            links.new(pf.outputs[0], mix2.inputs["Factor"]); links.new(mix.outputs[2], mix2.inputs[6]); mix2.inputs[7].default_value = (0.36, 0.37, 0.36, 1)
            out_col = mix2.outputs[2]
        # AO multiply
        uvn = nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nodes.new("ShaderNodeTexImage"); tex.image = ao_img; links.new(uvn.outputs[0], tex.inputs[0])
        mul = nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.75
        links.new(out_col, mul.inputs[6]); links.new(tex.outputs["Color"], mul.inputs[7])
        links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = {"Masonry": 0.85, "Roof": 0.6, "Glass": 0.12, "Metal": 0.4}[kind]
        bsdf.inputs["Metallic"].default_value = {"Masonry": 0, "Roof": 0, "Glass": 0, "Metal": 0.8}[kind]
    for m in mats: preview_material(m, m.name)
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(200))
    wn = scn.world.node_tree if scn.world.use_nodes else None
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    try: sky.sky_type = "NISHITA"
    except Exception: pass
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 48; scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 720, 960
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.3
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, target, lens=28, sun_rot=None, res=(720, 960)):
        cam.location = pos
        d = (Vector(target) - Vector(pos)); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        if sun_rot: so.rotation_euler = sun_rot
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"preview_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    look("b_front", (0, 62, 0.2), (0, 0, 16), 26)
    look("a_northwest", (-44, 44, -0.5), (-12, 12, 22), 24)
    look("c_southwest", (-30, -62, 7.5), (2, 0, 13), 28, res=(960, 960))
    look("e_aerial", (-14, 80, 58), (-3, 0, 6), 30, res=(900, 1100))
    look("f_south", (-5.4, -78.4, 0.7), (-3, 0, 20), 45)
print(f"done {time.time() - T0:.1f}s")
