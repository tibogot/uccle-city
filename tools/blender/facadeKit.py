# THE FAÇADE KIT: premium pieces for the UrbIS terraces of Uccle (1880-1930 row houses), placed by rules on the city's
# façades (viewer/facadeKit/). Run headless:
#   "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/facadeKit.py -- <out_dir> [--no-bake] [--previews <dir>] [--only id,id]
#   e.g. ... -- models/facadekit/src --previews docs/facadekit
# then: node tools/facadekit/packKit.mjs (meshoptimizer LODs, 9-slice classes) -> models/facadekit/kit.json + kit.bin
#
# FRAME (three.js, metres): x along the wall (to the right seen from the street), y up, z OUT of the wall; the wall plane
# is z = 0. An opening's origin is the middle of its bottom edge: x = 0, y = 0 = the opening's sill line as the city's
# façade shader draws it (viewer/interior/facadeWindows.js: the whole opening = the frame's outer edge). Blender's own
# axes are irrelevant here (AO is omnidirectional; previews place their camera in this frame).
#
# PARAMETRIC: each piece is built at a REFERENCE opening (REF below). The city stretches it by 9-slice in the vertex
# shader: everything within SLICE_X of a jamb, SLICE_B of the sill and SLICE_T of the head moves rigidly with that edge,
# only the middle scales (mouldings, sills, keystones keep their section). Runs (cornice, plinth, steps) are 1 m along x
# and scale along x only (their section is constant). The packer tags every vertex with its slice class.
#
# MATERIALS: every face is in a NAMED slot of the shared library (viewer/materials/, branch claude/materials): colour and
# pattern come at run time. Baked here: AO only (Cycles, per vertex, with the wall / ground the piece sits on as
# occluders). UV0 = box projection in metres in the piece frame.
#
# References (data/raw/refs/facadekit/SOURCES.md, git-ignored): Brussels heritage inventory (monument.heritage.brussels)
# notices of Uccle row houses around Place de Saint-Job / Chaussée de Saint-Job / rue Basse, Wikimedia Commons photos of
# Uccle and Ixelles/Saint-Gilles terraces (eclectic and neo-classical 1880-1914): blue-stone plinths and sills, white
# stone (Euville / Savonnières) or blue-stone window surrounds with keystones and hood mouldings, segmental brick arches
# with a stone sill on plain brick fronts, casement windows with a transom light ("imposte"), panelled oak front doors
# with a fanlight and a grille, 1-3 blue-stone steps, cast-iron balconnets on stone slabs with consoles, a cornice with
# modillions under a zinc-capped gutter.
import bpy, bmesh, math, os, sys, json, time, struct
from mathutils import Vector, Matrix

ARGV = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = ARGV[0] if ARGV and not ARGV[0].startswith("--") else "models/facadekit/src"
BAKE = "--no-bake" not in ARGV
PREV = ARGV[ARGV.index("--previews") + 1] if "--previews" in ARGV else None
ONLY = set(ARGV[ARGV.index("--only") + 1].split(",")) if "--only" in ARGV else None
os.makedirs(OUT, exist_ok=True)

SLOTS = ["stone_white", "stone_blue", "brick_red_brussels", "brick_yellow", "wood_frame_white", "wood_frame_dark",
         "glass_window", "cast_iron_green", "painted_metal_white", "zinc_roof"]
# the reference openings (m) and the 9-slice bands (keep in sync with tools/facadekit/packKit.mjs and viewer/facadeKit/)
REF = {"window": (1.2, 1.6), "door": (1.1, 2.448)}
SLICE_X, SLICE_B, SLICE_T = 0.25, 0.30, 0.35
FRAME = 0.07

# ------------------------------------------------------------------------------------------------ scene
scn = bpy.context.scene
for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
for m in list(bpy.data.meshes): bpy.data.meshes.remove(m)
PREVIEW_COL = {
    "stone_white": (0.62, 0.58, 0.49), "stone_blue": (0.12, 0.13, 0.14), "brick_red_brussels": (0.33, 0.1, 0.06),
    "brick_yellow": (0.5, 0.36, 0.18), "wood_frame_white": (0.82, 0.81, 0.77), "wood_frame_dark": (0.05, 0.035, 0.022),
    "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.02, 0.05, 0.03), "painted_metal_white": (0.8, 0.8, 0.78),
    "zinc_roof": (0.35, 0.37, 0.38),
}
MATS = {}
for s in SLOTS:
    m = bpy.data.materials.new(s); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*PREVIEW_COL[s], 1)
    b.inputs["Roughness"].default_value = 0.08 if s == "glass_window" else (0.45 if "wood" in s or "metal" in s or "iron" in s else 0.8)
    if s == "glass_window": b.inputs["Metallic"].default_value = 0.0
    MATS[s] = m
WALLMAT = bpy.data.materials.new("wall"); WALLMAT.use_nodes = True
WALLMAT.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.12, 0.08, 1)
WALLMAT.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9

V = Vector

# ------------------------------------------------------------------------------------------------ geometry builder
class Part:
    """Polygons per slot, in the piece frame."""
    def __init__(self):
        self.v = []; self.f = []; self.s = []

    def poly(self, pts, slot):
        b = len(self.v); self.v.extend(V(p) for p in pts); self.f.append(tuple(range(b, b + len(pts)))); self.s.append(slot)

    def bm(self, bm, slot, M=None):
        """add a bmesh (consumed)"""
        for fa in bm.faces:
            pts = [(M @ l.vert.co) if M else l.vert.co.copy() for l in fa.loops]
            self.poly(pts, slot)
        bm.free()

    def add(self, other):
        b = len(self.v); self.v.extend(other.v); self.f.extend(tuple(i + b for i in f) for f in other.f); self.s.extend(other.s)

def T(x=0, y=0, z=0): return Matrix.Translation((x, y, z))
def RZ(a): return Matrix.Rotation(a, 4, "Z")
def RY(a): return Matrix.Rotation(a, 4, "Y")
def RX(a): return Matrix.Rotation(a, 4, "X")

def bbox(x0, x1, y0, y1, z0, z1, r=0.006, seg=2, faces_skip=()):
    """a box with bevelled edges (r m, seg segments)"""
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts:
        v.co = V(((x0 + x1) / 2 + v.co.x * (x1 - x0), (y0 + y1) / 2 + v.co.y * (y1 - y0), (z0 + z1) / 2 + v.co.z * (z1 - z0)))
    r = min(r, (x1 - x0) * 0.45, (y1 - y0) * 0.45, (z1 - z0) * 0.45)
    if r > 0.0005:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    return bm

def wedge(pts2d, z0, z1, r=0.005, seg=2):
    """a prism: polygon pts2d (x, y, counter-clockwise) extruded z0..z1, bevelled"""
    bm = bmesh.new()
    vs0 = [bm.verts.new((x, y, z0)) for x, y in pts2d]
    vs1 = [bm.verts.new((x, y, z1)) for x, y in pts2d]
    bm.faces.new(list(reversed(vs0))); bm.faces.new(vs1)
    n = len(pts2d)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((vs0[i], vs0[j], vs1[j], vs1[i]))
    bm.normal_update()
    if r > 0.0005:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=r, segments=seg, profile=0.5, affect="EDGES", clamp_overlap=True)
    return bm

def cyl(r, y0, y1, seg=10, x=0.0, z=0.0, axis="y"):
    """a closed cylinder along y (or x / z), small chamfer"""
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r, radius2=r, depth=y1 - y0)
    M = {"y": RX(-math.pi / 2), "x": RY(math.pi / 2), "z": Matrix.Identity(4)}[axis]
    c = (y0 + y1) / 2
    off = {"y": (x, c, z), "x": (c, x, z), "z": (x, z, c)}[axis]
    bmesh.ops.transform(bm, matrix=T(*off) @ M, verts=bm.verts)
    return bm

def lathe(profile, seg=12, x=0.0, z=0.0):
    """profile [(r, y)] around the y axis at (x, z); closed top / bottom where r = 0"""
    bm = bmesh.new()
    rings = []
    for r, y in profile:
        r = max(r, 0.0008)
        ring = [bm.verts.new((x + r * math.cos(2 * math.pi * k / seg), y, z + r * math.sin(2 * math.pi * k / seg))) for k in range(seg)]
        rings.append(ring)
    for a, b in zip(rings, rings[1:]):
        for k in range(seg):
            bm.faces.new((a[k], a[(k + 1) % seg], b[(k + 1) % seg], b[k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm

def arc(cx, cy, r, a0, a1, n):
    return [(cx + r * math.cos(a0 + (a1 - a0) * k / n), cy + r * math.sin(a0 + (a1 - a0) * k / n)) for k in range(n + 1)]

def newell(pts):
    n = V((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y)
    return n

def poly_facing(P, pts, want, slot):
    """a polygon, wound so its normal points along `want`"""
    pts = [V(p) for p in pts]
    if newell(pts).dot(V(want)) < 0: pts = pts[::-1]
    P.poly(pts, slot)

def sweep(P, profile, path, U, closed=False, caps=(True, True), slot="stone_white"):
    """MITRED SWEEP: profile [(a, b)] along path [Vector]; a = offset along N = U x T (outward), b = along U. The
    profile (implicitly closed) is the section of the solid: it is re-ordered clockwise in (a, b) so every quad faces
    out. caps: close the open ends with the profile polygon, facing out of the ends."""
    U = V(U).normalized()
    area = sum(profile[i][0] * profile[(i + 1) % len(profile)][1] - profile[(i + 1) % len(profile)][0] * profile[i][1] for i in range(len(profile)))
    if area > 0: profile = profile[::-1]
    n = len(path)
    segs = n if closed else n - 1
    Ts = [(path[(i + 1) % n] - path[i]).normalized() for i in range(segs)]
    Ns = [U.cross(t).normalized() for t in Ts]
    def frame(i):
        if closed: a, b = Ns[(i - 1) % segs], Ns[i % segs]
        elif i == 0: a = b = Ns[0]
        elif i == n - 1: a = b = Ns[-1]
        else: a, b = Ns[i - 1], Ns[i]
        m = (a + b).normalized(); k = 1.0 / max(0.2, m.dot(a))
        return m * k
    rings = []
    for i in range(n):
        Nm = frame(i)
        rings.append([path[i] + Nm * a + U * b for a, b in profile])
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        r0, r1 = rings[i], rings[(i + 1) % n]
        for k in range(len(profile) - 1):
            P.poly([r0[k], r1[k], r1[k + 1], r0[k + 1]], slot)
    if not closed:
        if caps[0]: poly_facing(P, rings[0], -Ts[0], slot)
        if caps[1]: poly_facing(P, rings[-1], Ts[-1], slot)

def extrude_x(P, prof, x0, x1, slot, caps=True):
    """profile [(y, z)] (the section, ends on the wall z ~ 0) extruded along x"""
    sweep(P, [(-z, y) for y, z in prof], [V((x0, 0, 0)), V((x1, 0, 0))], (0, 1, 0), caps=(caps, caps), slot=slot)

def flip(P, i0):
    for i in range(i0, len(P.f)): P.f[i] = tuple(reversed(P.f[i]))

def ogee(a0, b0, a1, b1, n=6, recta=True):
    """S curve from (a0, b0) to (a1, b1): cyma recta (concave then convex) or reversa"""
    pts = []
    for k in range(n + 1):
        t = k / n
        s = (1 - math.cos(math.pi * t)) / 2 if recta else t - math.sin(2 * math.pi * t) / (2 * math.pi)
        pts.append((a0 + (a1 - a0) * t, b0 + (b1 - b0) * s))
    return pts

# ------------------------------------------------------------------------------------------------ shared sub-parts
def reveal(P, W, H, depth, slot, head_slot=None, sill_slot=None, ext=0.0, top_fn=None, nseg=10):
    """THE REVEAL LINING: the hole the city's wall cuts, lined from the wall plane (z = 0) back to z = -depth; the
    lining runs ext m past the opening behind the wall (no light leak at grazing views). top_fn(x) -> head height
    (segmental heads), else H."""
    hw = W / 2
    i0 = len(P.f)
    top = top_fn or (lambda x: H)
    # jambs (normals toward the opening axis)
    for sx in (-1, 1):
        x = sx * hw
        poly_facing(P, [V((x, -0.002, ext)), V((x, top(x), ext)), V((x, top(x), -depth)), V((x, -0.002, -depth))], (-sx, 0, 0), slot)
    # head: flat or segmental soffit (normals down)
    xs = [-hw + W * k / nseg for k in range(nseg + 1)]
    for a, b in zip(xs, xs[1:]):
        poly_facing(P, [V((a, top(a), ext)), V((b, top(b), ext)), V((b, top(b), -depth)), V((a, top(a), -depth))], (0, -1, 0), head_slot or slot)
    # bottom (the stone under the frame, sloped out 1 cm for the rain; normals up)
    poly_facing(P, [V((-hw, -0.002, -depth)), V((hw, -0.002, -depth)), V((hw, -0.012, ext)), V((-hw, -0.012, ext))], (0, 1, 0), sill_slot or slot)

def frame_rect(P, x0, x1, y0, y1, w, z0, z1, slot, r=0.006, mids=()):
    """a rectangular frame of members w wide (in the wall plane) between z0..z1, + horizontal mid rails (y, h)"""
    P.bm(bbox(x0, x0 + w, y0, y1, z0, z1, r), slot)
    P.bm(bbox(x1 - w, x1, y0, y1, z0, z1, r), slot)
    P.bm(bbox(x0 + w - 0.002, x1 - w + 0.002, y1 - w, y1, z0, z1, r), slot)
    P.bm(bbox(x0 + w - 0.002, x1 - w + 0.002, y0, y0 + w, z0, z1, r), slot)
    for y, h in mids:
        P.bm(bbox(x0 + w - 0.002, x1 - w + 0.002, y - h / 2, y + h / 2, z0, z1, r), slot)

def glazing_bead(P, x0, x1, y0, y1, z, slot, s=0.014):
    """a quarter-round bead around a pane, against the frame face at depth z (the putty / bead line)"""
    prof = [(0.0, 0.0), (0.0, s)] + [(s * math.sin(math.pi / 2 * k / 4), s * math.cos(math.pi / 2 * k / 4)) for k in range(1, 5)]
    # counter-clockwise round the pane (seen from the street): N = z x T points INTO the pane
    path = [V((x0, y0, z)), V((x1, y0, z)), V((x1, y1, z)), V((x0, y1, z))]
    sweep(P, prof, path, (0, 0, 1), closed=True, slot=slot)

def pane(P, x0, x1, y0, y1, z, slot="glass_window"):
    poly_facing(P, [V((x0, y0, z)), V((x1, y0, z)), V((x1, y1, z)), V((x0, y1, z))], (0, 0, 1), slot)

def leaf(P, x0, x1, y0, y1, zf, d, slot, stile=0.052, top=0.052, bot=0.085, bars=(), vbars=()):
    """a glazed casement leaf (sash): stiles, rails, glass, beads, an ovolo on the front inner arris, a weather board
    (jet d'eau) on the bottom rail. zf = front face, d = thickness."""
    z0 = zf - d
    P.bm(bbox(x0, x0 + stile, y0, y1, z0, zf, 0.005), slot)
    P.bm(bbox(x1 - stile, x1, y0, y1, z0, zf, 0.005), slot)
    P.bm(bbox(x0 + stile - 0.002, x1 - stile + 0.002, y1 - top, y1, z0, zf, 0.005), slot)
    P.bm(bbox(x0 + stile - 0.002, x1 - stile + 0.002, y0, y0 + bot, z0, zf, 0.005), slot)
    # weather board: a sloped moulded strip on the bottom rail's face
    prof = [(0.0, 0.0), (0.024, 0.0), (0.03, 0.006), (0.026, 0.014)] + [(0.026 - 0.018 * math.sin(t), 0.014 + 0.016 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]] + [(0.0, 0.03)]
    extrude_x(P, [(y0 + 0.012 + b, zf + a) for a, b in prof], x0 + 0.004, x1 - 0.004, slot)
    gx0, gx1, gy0, gy1 = x0 + stile, x1 - stile, y0 + bot, y1 - top
    zg = zf - d * 0.55
    # glazing bars (moulded: a rectangle with chamfered front)
    hb = 0.022
    for y in bars:
        P.bm(bbox(gx0 - 0.002, gx1 + 0.002, y - hb / 2, y + hb / 2, zg - 0.012, zf - 0.006, 0.006), slot)
    for x in vbars:
        P.bm(bbox(x - hb / 2, x + hb / 2, gy0 - 0.002, gy1 + 0.002, zg - 0.012, zf - 0.006, 0.006), slot)
    ys = [gy0] + sorted(sum(([y - hb / 2, y + hb / 2] for y in bars), [])) + [gy1]
    xs = [gx0] + sorted(sum(([x - hb / 2, x + hb / 2] for x in vbars), [])) + [gx1]
    for j in range(0, len(ys), 2):
        for i in range(0, len(xs), 2):
            pane(P, xs[i], xs[i + 1], ys[j], ys[j + 1], zg)
            glazing_bead(P, xs[i], xs[i + 1], ys[j], ys[j + 1], zg + 0.0005, slot, s=0.012)

def architrave_profile(scale=1.0):
    """a moulded stone architrave (a, b): a = from the opening edge outward, b = proud of the wall. 16.5 cm x 7.5 cm."""
    s = scale
    p = [(0.0, -0.004), (0.0, 0.03 * s)]
    p += [(0.012 * s - 0.012 * s * math.cos(t), 0.03 * s + 0.012 * s * math.sin(t)) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]   # bead
    p += [(0.016 * s, 0.042 * s), (0.06 * s, 0.042 * s), (0.064 * s, 0.05 * s), (0.11 * s, 0.05 * s)]                                  # two fasciae
    p += ogee(0.11 * s, 0.05 * s, 0.145 * s, 0.072 * s, n=6, recta=False)[1:]                                                          # cyma reversa
    p += [(0.158 * s, 0.072 * s), (0.163 * s, 0.067 * s), (0.163 * s, -0.004)]
    return p

def hood_moulding(P, x0, x1, y0, h, depth, slot, ret=True, zinc=True):
    """A HOOD MOULDING / CORNICE over an opening, with returned ends: core block + moulded profile swept in plan
    (bed mould, corona, cymatium), the top weathered back to the wall, a zinc flashing on top."""
    s = h / 0.12
    prof = [(0.0, 0.0), (0.012 * s, 0.0)]
    prof += [(0.012 * s + 0.016 * s * math.sin(t), 0.016 * s * (1 - math.cos(t))) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]   # ovolo bed mould
    prof += [(0.03 * s, 0.024 * s), (0.068 * s, 0.03 * s), (0.068 * s, 0.072 * s), (0.072 * s, 0.076 * s)]                              # soffit, corona
    prof += ogee(0.072 * s, 0.076 * s, 0.092 * s, 0.104 * s, n=6, recta=True)[1:]                                                       # cyma recta
    prof += [(0.092 * s, 0.112 * s), (0.0, 0.12 * s)]                                                                                    # weathered top
    k = depth / (0.092 * s)
    prof = [(a * k, y0 + b) for a, b in prof]
    zc = 0.02
    path = [V((x1, 0, -0.01)), V((x1, 0, zc)), V((x0, 0, zc)), V((x0, 0, -0.01))] if ret else [V((x1, 0, zc)), V((x0, 0, zc))]
    sweep(P, prof, path, (0, 1, 0), slot=slot)
    P.bm(bbox(x0, x1, y0, y0 + h * 0.99, -0.01, zc, 0.0), slot)   # the core (hidden faces mostly)
    if zinc:     # zinc flashing on the weathered top: a thin folded strip
        top = y0 + 0.12 * s
        poly_facing(P, [V((x0 - 0.005, top + 0.004, -0.005)), V((x1 + 0.005, top + 0.004, -0.005)), V((x1 + 0.005, y0 + 0.112 * s + 0.004, zc + depth + 0.003)), V((x0 - 0.005, y0 + 0.112 * s + 0.004, zc + depth + 0.003))], (0, 1, 0.1), "zinc_roof")

def keystone(P, y0, h, wb, wt, d, slot):
    """a trapezoid keystone (bottom width wb at y0, top wt at y0 + h), proud d, bevelled, with a sunken margin panel"""
    P.bm(wedge([(-wb / 2, y0), (wb / 2, y0), (wt / 2, y0 + h), (-wt / 2, y0 + h)], -0.02, d, r=0.006), slot)
    i = 0.025
    P.bm(wedge([(-wb / 2 + i, y0 + i), (wb / 2 - i, y0 + i), (wt / 2 - i, y0 + h - i), (-wt / 2 + i, y0 + h - i)], d - 0.002, d + 0.008, r=0.003), slot)

# ------------------------------------------------------------------------------------------------ the pieces
PIECES = {}
def piece(fn):
    PIECES[fn.__name__] = fn
    return fn

@piece
def winA():
    """WINDOW A: white-stone framed casement window (the city may remap the stone to blue stone, the frame to dark):
    moulded architrave on three sides, a frieze and a hood cornice with returns, a keystone, a stone reveal 20 cm
    deep, a frame with two casement leaves and a transom light (imposte) whose bar lines up with the painted transom."""
    W, H = REF["window"]; hw = W / 2
    P = Part()
    reveal(P, W, H, 0.2, "stone_white")
    # architrave: left jamb up, head, right jamb down (outward = away from the opening)
    path = [V((-hw, -0.004, 0)), V((-hw, H, 0)), V((hw, H, 0)), V((hw, -0.004, 0))]
    sweep(P, architrave_profile(), path, (0, 0, 1), slot="stone_white")
    keystone(P, H - 0.03, 0.32, 0.15, 0.21, 0.092, "stone_white")
    # the frame (dormant) set in the reveal, its front 10 cm back; transom at the painted bar's height
    zf, d = -0.1, 0.065
    tr = FRAME + 0.7 * (H - 2 * FRAME)
    frame_rect(P, -hw, hw, 0.0, H, FRAME, zf - d, zf, "wood_frame_white", r=0.006, mids=[(tr, 0.075)])
    # transom drip moulding (rain off the transom onto the leaves)
    extrude_x(P, [(tr - 0.045 + b, zf + a) for a, b in [(0, 0), (0.022, 0.0), (0.026, 0.006), (0.02, 0.02), (0, 0.03)]], -hw + FRAME, hw - FRAME, "wood_frame_white")
    # two leaves below the transom (meeting stiles = the painted mullion), a fixed light above with two bars
    lx0, lx1, ly0, ly1 = -hw + FRAME, hw - FRAME, FRAME, tr - 0.0375
    leaf(P, lx0, -0.002, ly0, ly1, zf - 0.008, 0.05, "wood_frame_white", bars=[ly0 + (ly1 - ly0) * 0.52])
    leaf(P, 0.002, lx1, ly0, ly1, zf - 0.008, 0.05, "wood_frame_white", bars=[ly0 + (ly1 - ly0) * 0.52])
    # astragal (the moulded cover strip on the meeting stiles)
    P.bm(bbox(-0.018, 0.018, ly0 + 0.01, ly1 - 0.005, zf - 0.01, zf + 0.006, 0.008), "wood_frame_white")
    ty0, ty1 = tr + 0.0375, H - FRAME
    zg = zf - 0.035
    for a, b in ((lx0, -0.21), (-0.19, 0.19), (0.21, lx1)):
        pane(P, a, b, ty0, ty1, zg); glazing_bead(P, a, b, ty0, ty1, zg + 0.0005, "wood_frame_white", s=0.012)
    for x in (-0.2, 0.2):
        P.bm(bbox(x - 0.011, x + 0.011, ty0 - 0.002, ty1 + 0.002, zg - 0.01, zf - 0.006, 0.006), "wood_frame_white")
    return P, {"kind": "window", "ref": REF["window"], "occ": "opening"}

@piece
def hood():
    """THE HOOD over window A (separate: the placement drops it where the eaves cornice leaves no room): a frieze panel
    with a sunk margin over the architrave, a hood cornice with returns under a zinc flashing."""
    W, H = REF["window"]; hw = W / 2
    P = Part()
    ft = H + 0.163
    P.bm(bbox(-hw - 0.163, hw + 0.163, ft - 0.01, ft + 0.15, -0.02, 0.035, 0.006), "stone_white")
    P.bm(bbox(-hw - 0.12, hw + 0.12, ft + 0.025, ft + 0.115, 0.03, 0.042, 0.004), "stone_white")
    hood_moulding(P, -hw - 0.2, hw + 0.2, ft + 0.15, 0.13, 0.11, "stone_white")
    return P, {"kind": "window", "ref": REF["window"], "occ": "wall", "slice": "window"}

@piece
def winB():
    """WINDOW B: a plain brick front's window: a segmental arch of bricks on edge (rowlock) over a segmental head, a
    brick reveal 22 cm deep (the city cuts the arched head into the wall: aKit.y = rise), a frame with two leaves and
    a transom light following the arch. The sill is the separate stone sill."""
    W, H = REF["window"]; hw = W / 2
    rise = 0.13
    R = (hw * hw + rise * rise) / (2 * rise)
    yc = H + rise - R
    top = lambda x: yc + math.sqrt(max(0.0, R * R - x * x))
    P = Part()
    reveal(P, W, H, 0.22, "brick_red_brussels", top_fn=top, nseg=12)
    # the arch: n bricks on edge radiating from the centre, 21.5 cm long, joints 1 cm, proud 1.2 cm
    a0 = math.asin(hw / R)
    arcl = 2 * a0 * R
    n = max(9, int(round(arcl / 0.075))) | 1
    L = 0.215
    for k in range(n):
        t0 = -a0 + 2 * a0 * (k + 0.06) / n
        t1 = -a0 + 2 * a0 * (k + 0.94) / n
        q = []
        for t, r in ((t0, R), (t1, R), (t1, R + L), (t0, R + L)):
            q.append((r * math.sin(t), yc + r * math.cos(t)))
        # counter-clockwise in (x, y): order is (t0 inner) (t1 inner) (t1 outer) (t0 outer): t grows to +x, so reverse
        q = [q[1], q[0], q[3], q[2]]
        if (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]) < 0: q.reverse()
        P.bm(wedge(q, -0.03, 0.012 + 0.003 * ((k * 7) % 3 - 1), r=0.005, seg=1), "brick_red_brussels")
    # skewbacks: the bricks the arch springs from (cut brick, flush), both sides
    for sx in (-1, 1):
        t = sx * a0
        x_in, y_in = R * math.sin(t), yc + R * math.cos(t)
        x_out, y_out = (R + L) * math.sin(t), yc + (R + L) * math.cos(t)
        q = [(x_in, y_in), (x_out, y_out), (x_out + sx * 0.05, y_out), (x_in + sx * 0.05, y_in - 0.0)]
        q = [(x_in, y_in - 0.07), (x_in + sx * 0.11, y_in - 0.07), (x_out + sx * 0.02, y_out), (x_in, y_in)]
        if (q[1][0] - q[0][0]) * (q[2][1] - q[0][1]) - (q[1][1] - q[0][1]) * (q[2][0] - q[0][0]) < 0: q.reverse()
        P.bm(wedge(q, -0.03, 0.008, r=0.004), "brick_red_brussels")
    # the jambs' outer arris: a bullnose brick quoin column each side (courses of 6.5 cm, proud 6 mm)
    for sx in (-1, 1):
        y = 0.0
        k = 0
        while y + 0.06 < H - 0.04:
            w = 0.11 if k % 2 == 0 else 0.165
            x0, x1 = (sx * hw, sx * (hw + w)) if sx > 0 else (sx * (hw + w), sx * hw)
            P.bm(bbox(x0, x1, y + 0.005, y + 0.06, -0.03, 0.006, 0.006, seg=1), "brick_red_brussels")
            y += 0.065; k += 1
    # frame with a segmental head, two leaves, a transom light following the arch
    zf, d = -0.11, 0.065
    tr = FRAME + 0.7 * (H - 2 * FRAME)
    for sx in (-1, 1):
        x0, x1 = (-hw, -hw + FRAME) if sx < 0 else (hw - FRAME, hw)
        P.bm(bbox(x0, x1, 0.0, top(x0 if sx > 0 else x1) - 0.002, zf - d, zf, 0.005), "wood_frame_white")
    P.bm(bbox(-hw + FRAME - 0.002, hw - FRAME + 0.002, 0.0, FRAME, zf - d, zf, 0.005), "wood_frame_white")
    P.bm(bbox(-hw + FRAME - 0.002, hw - FRAME + 0.002, tr - 0.0375, tr + 0.0375, zf - d, zf, 0.005), "wood_frame_white")
    # the arched head member: profile swept along the arch (a 7 x 6.5 cm section, chamfered)
    m = 16
    archpath = [V((R * math.sin(-a0 + 2 * a0 * k / m), yc + R * math.cos(-a0 + 2 * a0 * k / m), zf - d)) for k in range(m + 1)]
    sec = [(0.0, 0.0), (0.0, d - 0.008), (-0.008, d), (-FRAME + 0.008, d), (-FRAME, d - 0.008), (-FRAME, 0.0)]
    sweep(P, sec, archpath, (0, 0, 1), slot="wood_frame_white")
    lx0, lx1, ly0, ly1 = -hw + FRAME, hw - FRAME, FRAME, tr - 0.0375
    leaf(P, lx0, -0.002, ly0, ly1, zf - 0.008, 0.05, "wood_frame_white")
    leaf(P, 0.002, lx1, ly0, ly1, zf - 0.008, 0.05, "wood_frame_white")
    P.bm(bbox(-0.018, 0.018, ly0 + 0.01, ly1 - 0.005, zf - 0.01, zf + 0.006, 0.008), "wood_frame_white")
    # transom light: glass under the arch (a fan of 2 bars)
    zg = zf - 0.035
    ty0 = tr + 0.0375
    pts = [V((lx0, ty0, zg)), V((lx1, ty0, zg))]
    for k in range(12, -1, -1):
        x = lx0 + (lx1 - lx0) * k / 12
        pts.append(V((x, top(x) - FRAME, zg)))
    poly_facing(P, pts, (0, 0, 1), "glass_window")
    for x in (-0.2, 0.2):
        P.bm(bbox(x - 0.011, x + 0.011, ty0 - 0.002, top(x) - FRAME + 0.004, zg - 0.01, zf - 0.006, 0.006), "wood_frame_white")
    return P, {"kind": "window", "ref": REF["window"], "occ": "opening_arch", "rise": rise}

@piece
def sill():
    """THE STONE SILL (blue stone): 10 cm thick, 7 cm proud, sloped weathered top, rounded nose, a drip groove under,
    lugs built into the wall at both ends. Spans the window surround (opening + 2 x 0.2 m). y = 0 = the opening line."""
    W = REF["window"][0] + 0.4; hw = W / 2
    P = Part()
    prof = [(-0.1, -0.03), (-0.1, 0.034), (-0.092, 0.034), (-0.092, 0.044), (-0.1, 0.044), (-0.1, 0.062)]   # (y, z): underside, drip groove 8 mm
    prof += [(-0.1 + 0.008 * (1 - math.cos(t)), 0.062 + 0.008 * math.sin(t)) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]   # rounded arris
    prof += [(-0.012, 0.07)]
    prof += [(-0.012 + 0.008 * math.sin(t), 0.07 - 0.008 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]   # nose
    prof += [(0.0, 0.03), (0.0015, -0.03)]                                          # sloped top back into the wall
    extrude_x(P, prof, -hw, hw, "stone_blue")
    return P, {"kind": "window", "ref": REF["window"], "occ": "wall", "slice": "window"}

@piece
def soup():
    """SOUPIRAIL: the basement light in the blue-stone plinth: a stone block proud 7 cm with a chamfered surround,
    a recessed opening, a cast-iron grille (round bars through a flat bar), dark glass behind. Fixed size 0.9 x 0.55;
    origin = bottom middle at the plinth's foot."""
    P = Part()
    W, Hh = 0.9, 0.55
    P.bm(bbox(-W / 2, W / 2, -0.25, Hh, -0.02, 0.07, 0.008), "stone_blue")
    # the opening: a sunk reveal with chamfered edges (0.56 x 0.28 at y 0.13..0.41)
    ox, oy0, oy1 = 0.28, 0.13, 0.41
    i0 = len(P.f)
    ch = 0.03
    rim = [V((-ox - ch, oy0 - ch, 0.0702)), V((ox + ch, oy0 - ch, 0.0702)), V((ox + ch, oy1 + ch, 0.0702)), V((-ox - ch, oy1 + ch, 0.0702))]
    inn = [V((-ox, oy0, 0.045)), V((ox, oy0, 0.045)), V((ox, oy1, 0.045)), V((-ox, oy1, 0.045))]
    back = [V((-ox, oy0, 0.006)), V((ox, oy0, 0.006)), V((ox, oy1, 0.006)), V((-ox, oy1, 0.006))]
    for k in range(4):
        j = (k + 1) % 4
        c = (rim[k] + rim[j]) / 2; o = V((-c.x, (oy0 + oy1) / 2 - c.y, 0.0)).normalized()
        poly_facing(P, [rim[k], rim[j], inn[j], inn[k]], o + V((0, 0, 0.8)), "stone_blue")
        poly_facing(P, [inn[k], inn[j], back[j], back[k]], o, "stone_blue")
    # (the block's front face is under the rim: the dark recess draws over it)
    pane(P, -ox, ox, oy0, oy1, 0.008)
    # grille: vertical round bars, a flat bar across, rivet heads
    for k in range(7):
        x = -ox + 2 * ox * (k + 0.5) / 7
        P.bm(cyl(0.008, oy0 - 0.01, oy1 + 0.01, seg=8, x=x, z=0.03), "cast_iron_green")
    P.bm(bbox(-ox - 0.01, ox + 0.01, (oy0 + oy1) / 2 - 0.016, (oy0 + oy1) / 2 + 0.016, 0.036, 0.044, 0.002), "cast_iron_green")
    return P, {"kind": "soup", "ref": (W, Hh), "occ": "plinth"}

def door_leaf(P, x0, x1, y0, y1, zf, d, slot, panels="four"):
    """A PANELLED DOOR LEAF: stiles / rails, raised and fielded panels with a bolection moulding, a letter plate and a
    knob (painted metal), a kick rail."""
    z0 = zf - d
    st, tr_, mr, br = 0.11, 0.11, 0.16, 0.2
    P.bm(bbox(x0, x0 + st, y0, y1, z0, zf, 0.006), slot)
    P.bm(bbox(x1 - st, x1, y0, y1, z0, zf, 0.006), slot)
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, y1 - tr_, y1, z0, zf, 0.006), slot)
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, y0, y0 + br, z0, zf, 0.006), slot)
    ym = y0 + (y1 - y0) * 0.42
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, ym - mr / 2, ym + mr / 2, z0, zf, 0.006), slot)
    xm = (x0 + x1) / 2
    P.bm(bbox(xm - 0.05, xm + 0.05, y0 + br - 0.002, y1 - tr_ + 0.002, z0, zf, 0.006), slot)   # muntin
    cells = [(x0 + st, xm - 0.05, y0 + br, ym - mr / 2), (xm + 0.05, x1 - st, y0 + br, ym - mr / 2),
             (x0 + st, xm - 0.05, ym + mr / 2, y1 - tr_), (xm + 0.05, x1 - st, ym + mr / 2, y1 - tr_)]
    for a, b, c, e in cells:
        # sunk panel ground, then a raised field with a bevelled margin
        poly_facing(P, [V((a, c, zf - 0.02)), V((b, c, zf - 0.02)), V((b, e, zf - 0.02)), V((a, e, zf - 0.02))], (0, 0, 1), slot)
        m = 0.045
        P.bm(wedge([(a + m, c + m), (b - m, c + m), (b - m, e - m), (a + m, e - m)], zf - 0.025, zf - 0.006, r=0.012, seg=3), slot)
        # bolection moulding round the panel: over the stile's edge (a < 0) and onto the field (a > 0), proud 1.4 cm
        prof = [(-0.008, 0.0), (-0.008, 0.006), (-0.002, 0.013), (0.008, 0.015), (0.018, 0.01), (0.026, -0.002), (0.026, -0.022), (-0.008, -0.022)]
        path = [V((a, c, zf)), V((b, c, zf)), V((b, e, zf)), V((a, e, zf))]
        sweep(P, prof, path, (0, 0, 1), closed=True, slot=slot)
    # letter plate (painted metal) on the middle rail
    P.bm(bbox(xm - 0.13, xm + 0.13, ym - 0.025, ym + 0.025, zf - 0.002, zf + 0.006, 0.003), "painted_metal_white")
    return P

def knob(P, x, y, zf):
    bm = lathe([(0.0, 0.0), (0.011, 0.0), (0.011, 0.035), (0.028, 0.05), (0.032, 0.064), (0.022, 0.074), (0.0, 0.076)], seg=12)
    bmesh.ops.transform(bm, matrix=T(x, y, zf) @ RX(math.pi / 2), verts=bm.verts)
    P.bm(bm, "painted_metal_white")

def steps_front(P, W, hw):
    """the threshold stone (blue stone) in the reveal and out to the street"""
    P.bm(bbox(-hw - 0.15, hw + 0.15, -0.06, 0.0, -0.3, 0.3, 0.008), "stone_blue")
    # nosing roll on the threshold's front
    P.bm(cyl(0.012, -hw - 0.15 + 0.01, hw + 0.15 - 0.01, seg=8, x=-0.018, z=0.298, axis="x"), "stone_blue")

@piece
def doorA():
    """DOOR A: the panelled oak front door of an Uccle bel-étage house: blue-stone surround (pilasters on bases with
    capitals, a frieze, a hood cornice with returns), a moulded transom, a fanlight with a cast-iron grille, a blue-stone
    threshold; reveal 30 cm."""
    W, H = REF["door"]; hw = W / 2
    P = Part()
    reveal(P, W, H, 0.3, "stone_blue")
    # pilasters (0.2 wide, proud 6 cm) with a base block and a capital
    for sx in (-1, 1):
        a, b = (-hw - 0.2, -hw) if sx < 0 else (hw, hw + 0.2)
        P.bm(bbox(a, b, 0.0, H, -0.02, 0.055, 0.006), "stone_blue")
        P.bm(bbox(a - 0.02, b + 0.02, 0.0, 0.3, -0.02, 0.075, 0.008), "stone_blue")            # base block
        P.bm(bbox(a + 0.03, b - 0.03, 0.42, H - 0.3, 0.05, 0.062, 0.003), "stone_blue")        # sunk panel margin
        P.bm(bbox(a - 0.015, b + 0.015, H - 0.12, H - 0.06, -0.02, 0.07, 0.008), "stone_blue") # capital necking
        P.bm(bbox(a - 0.03, b + 0.03, H - 0.06, H, -0.02, 0.085, 0.01), "stone_blue")          # capital abacus
    # frieze over the opening + hood cornice
    P.bm(bbox(-hw - 0.23, hw + 0.23, H, H + 0.22, -0.02, 0.05, 0.006), "stone_blue")
    hood_moulding(P, -hw - 0.28, hw + 0.28, H + 0.22, 0.15, 0.14, "stone_blue")
    # frame (oak, dark): jambs, head, the transom (moulded) at the painted fanlight line
    zf, d = -0.16, 0.08
    tr = FRAME + 0.78 * (H - 2 * FRAME)
    frame_rect(P, -hw, hw, 0.0, H, 0.08, zf - d, zf, "wood_frame_dark", r=0.006, mids=[(tr, 0.09)])
    extrude_x(P, [(tr - 0.06 + b, zf + a) for a, b in [(0, 0), (0.025, 0.0), (0.032, 0.008), (0.03, 0.02), (0.018, 0.035), (0, 0.04)]], -hw + 0.08, hw - 0.08, "wood_frame_dark")
    # the leaf (one wide leaf, 6 cm thick), set 1 cm behind the frame face
    door_leaf(P, -hw + 0.08, hw - 0.08, 0.0, tr - 0.045, zf - 0.01, 0.06, "wood_frame_dark")
    knob(P, hw - 0.08 - 0.07, (tr - 0.045) * 0.47, zf - 0.01)
    # fanlight: glass + a cast-iron grille (verticals, a ring)
    zg = zf - 0.04
    fy0, fy1 = tr + 0.045, H - 0.08
    pane(P, -hw + 0.08, hw - 0.08, fy0, fy1, zg)
    glazing_bead(P, -hw + 0.08, hw - 0.08, fy0, fy1, zg + 0.0005, "wood_frame_dark", s=0.014)
    for k in range(9):
        x = -hw + 0.08 + (W - 0.16) * (k + 0.5) / 9
        if abs(x) < 0.13: continue
        P.bm(cyl(0.006, fy0, fy1, seg=6, x=x, z=zg + 0.02), "cast_iron_green")
    cy = (fy0 + fy1) / 2
    rr = min(0.13, (fy1 - fy0) / 2 - 0.02)
    ring = [V((rr * math.cos(2 * math.pi * k / 20), cy + rr * math.sin(2 * math.pi * k / 20), zg + 0.02)) for k in range(20)]
    sec = [(-0.008, -0.006), (0.008, -0.006), (0.008, 0.006), (-0.008, 0.006), (-0.008, -0.006)]
    sweep(P, sec, ring, (0, 0, 1), closed=True, slot="cast_iron_green")
    P.bm(bbox(-hw + 0.08, hw - 0.08, cy - 0.007, cy + 0.007, zg + 0.012, zg + 0.026, 0.002), "cast_iron_green")
    steps_front(P, W, hw)
    return P, {"kind": "door", "ref": REF["door"], "occ": "opening"}

@piece
def doorB():
    """DOOR B: a simpler door: a white-stone flat surround (chamfered band) and lintel, a glazed upper half with bars
    over a panelled lower half (painted wood), a transom with plain glass."""
    W, H = REF["door"]; hw = W / 2
    P = Part()
    reveal(P, W, H, 0.24, "stone_white")
    # flat band surround 0.15 m, 4 cm proud, chamfered inner arris; lintel 0.25 m with a fillet
    prof = [(0.0, -0.004), (0.0, 0.02), (0.02, 0.04), (0.15, 0.04), (0.155, 0.035), (0.155, -0.004)]
    path = [V((-hw, -0.004, 0)), V((-hw, H, 0)), V((hw, H, 0)), V((hw, -0.004, 0))]
    sweep(P, prof, path, (0, 0, 1), slot="stone_white")
    P.bm(bbox(-hw - 0.2, hw + 0.2, H + 0.15, H + 0.3, -0.02, 0.05, 0.008), "stone_white")
    P.bm(bbox(-hw - 0.22, hw + 0.22, H + 0.3, H + 0.34, -0.02, 0.07, 0.008), "stone_white")
    zf, d = -0.13, 0.075
    tr = FRAME + 0.78 * (H - 2 * FRAME)
    frame_rect(P, -hw, hw, 0.0, H, 0.075, zf - d, zf, "wood_frame_white", r=0.006, mids=[(tr, 0.08)])
    x0, x1, y0, y1 = -hw + 0.075, hw - 0.075, 0.0, tr - 0.04
    zl = zf - 0.01
    # leaf: stiles, rails, a lower panel pair, glazed top with a cross of bars
    st = 0.1
    P.bm(bbox(x0, x0 + st, y0, y1, zl - 0.055, zl, 0.006), "wood_frame_white")
    P.bm(bbox(x1 - st, x1, y0, y1, zl - 0.055, zl, 0.006), "wood_frame_white")
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, y1 - 0.1, y1, zl - 0.055, zl, 0.006), "wood_frame_white")
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, y0, y0 + 0.2, zl - 0.055, zl, 0.006), "wood_frame_white")
    ym = y0 + 0.95
    P.bm(bbox(x0 + st - 0.002, x1 - st + 0.002, ym - 0.07, ym + 0.07, zl - 0.055, zl, 0.006), "wood_frame_white")
    xm = 0.0
    P.bm(bbox(xm - 0.045, xm + 0.045, y0 + 0.2, ym - 0.07, zl - 0.055, zl, 0.006), "wood_frame_white")
    for a, b in ((x0 + st, xm - 0.045), (xm + 0.045, x1 - st)):
        P.poly([V((a, y0 + 0.2, zl - 0.02)), V((b, y0 + 0.2, zl - 0.02)), V((b, ym - 0.07, zl - 0.02)), V((a, ym - 0.07, zl - 0.02))], "wood_frame_white")
        P.bm(wedge([(a + 0.04, y0 + 0.24), (b - 0.04, y0 + 0.24), (b - 0.04, ym - 0.11), (a + 0.04, ym - 0.11)], zl - 0.024, zl - 0.008, r=0.01, seg=3), "wood_frame_white")
    gz = zl - 0.03
    gx0, gx1, gy0, gy1 = x0 + st, x1 - st, ym + 0.07, y1 - 0.1
    for (a, b) in ((gx0, -0.011), (0.011, gx1)):
        for (c, e) in ((gy0, (gy0 + gy1) / 2 - 0.011), ((gy0 + gy1) / 2 + 0.011, gy1)):
            pane(P, a, b, c, e, gz); glazing_bead(P, a, b, c, e, gz + 0.0005, "wood_frame_white", s=0.012)
    P.bm(bbox(-0.011, 0.011, gy0, gy1, gz - 0.01, zl - 0.006, 0.006), "wood_frame_white")
    P.bm(bbox(gx0, gx1, (gy0 + gy1) / 2 - 0.011, (gy0 + gy1) / 2 + 0.011, gz - 0.01, zl - 0.006, 0.006), "wood_frame_white")
    knob(P, x1 - 0.06, (y1) * 0.47, zl)
    fy0, fy1 = tr + 0.04, H - 0.075
    pane(P, x0, x1, fy0, fy1, zf - 0.04)
    glazing_bead(P, x0, x1, fy0, fy1, zf - 0.0395, "wood_frame_white", s=0.012)
    P.bm(bbox(-hw - 0.12, hw + 0.12, -0.05, 0.0, -0.24, 0.26, 0.008), "stone_blue")       # threshold
    return P, {"kind": "door", "ref": REF["door"], "occ": "opening"}

@piece
def cornice():
    """THE CORNICE RUN (1 m, stretched along x): a frieze band, a bed moulding (fillet + ovolo), a deep corona with a
    drip soffit, a cyma recta crown, the top weathered back to the gutter under a zinc flashing. y = 0 = the wall's
    top (the eaves line); 0.55 m tall, 0.36 m deep; it encloses the city's two-step box cornice."""
    P = Part()
    extrude_x(P, cornice_profile(), -0.5, 0.5, "stone_white")
    # zinc flashing over the weathered top
    poly_facing(P, [V((-0.5, 0.006, 0.04)), V((0.5, 0.006, 0.04)), V((0.5, -0.05, 0.376)), V((-0.5, -0.05, 0.376))], (0, 1, 0.2), "zinc_roof")
    poly_facing(P, [V((-0.5, -0.05, 0.376)), V((0.5, -0.05, 0.376)), V((0.5, -0.075, 0.378)), V((-0.5, -0.075, 0.378))], (0, 0, 1), "zinc_roof")
    return P, {"kind": "run", "ref": (1.0, 0.6), "occ": "eaves"}

@piece
def cornCorner():
    """THE CORNICE OUTSIDE CORNER: the same profile swept round a mitred 90 degree corner. Frame: wall A along x <= 0
    (outside +z), wall B along z <= 0 (outside +x), the corner line at x = z = 0."""
    P = Part()
    prof = cornice_profile()
    path = [V((0, 0, -0.004)), V((0, 0, 0)), V((-0.004, 0, 0))]     # 4 mm onto each run: no seam
    sweep(P, [(z, y) for y, z in prof], path, (0, 1, 0), caps=(False, False), slot="stone_white")
    return P, {"kind": "corner", "ref": (1.0, 0.6), "occ": "corner"}

def cornice_profile():
    """(y, z): frieze band + fillet, an ovolo bed mould, the corona's soffit with a drip lip, the corona face, a cyma
    recta crown, the weathered top back to the wall"""
    prof = [(-0.6, -0.002), (-0.6, 0.012), (-0.594, 0.018), (-0.47, 0.018), (-0.464, 0.024), (-0.464, 0.04)]
    prof += [(-0.44, 0.04), (-0.44, 0.052)]
    prof += [(-0.44 + 0.055 * (1 - math.cos(t)), 0.052 + 0.055 * math.sin(t)) for t in [math.pi / 2 * k / 6 for k in range(1, 7)]]
    prof += [(-0.38, 0.12), (-0.36, 0.13), (-0.36, 0.3)]
    prof += [(-0.352, 0.306), (-0.352, 0.31), (-0.36, 0.31), (-0.36, 0.33), (-0.22, 0.33)]
    prof += [(-0.215, 0.334), (-0.2, 0.334)]
    prof += [(b, a) for a, b in ogee(0.334, -0.2, 0.37, -0.075, n=8, recta=True)[1:]]
    prof += [(-0.062, 0.37), (-0.055, 0.364), (-0.0, 0.05), (0.002, -0.002)]
    return prof

@piece
def modillion():
    """A MODILLION (scrolled console block under the corona): 0.1 m wide, a double-scroll side profile 0.24 deep under
    the soffit at y = -0.36 (cornice frame), an acanthus-less but moulded face, a small cap."""
    P = Part()
    w = 0.1
    # side profile (z, y): a big scroll at the wall, a small one at the tip; polygon in the (z, y) plane, extruded along x
    pts = [(0.0, -0.36), (0.3, -0.36), (0.3, -0.385)]
    pts += [(0.3 - 0.03 * (1 - math.cos(t)), -0.385 - 0.03 * math.sin(t)) for t in [math.pi / 2 * k / 5 for k in range(1, 6)]]   # tip scroll
    pts += [(0.24, -0.425), (0.12, -0.45)]
    pts += [(0.12 - 0.07 * math.sin(t), -0.45 - 0.07 * (1 - math.cos(t)) * 0.9) for t in [math.pi / 2 * k / 6 for k in range(1, 7)]]   # heel scroll
    pts += [(0.04, -0.53), (0.0, -0.53)]
    bm = bmesh.new()
    a = [bm.verts.new((-w / 2, y, z)) for z, y in pts]
    b = [bm.verts.new((w / 2, y, z)) for z, y in pts]
    bm.faces.new(a); bm.faces.new(list(reversed(b)))
    for i in range(len(pts)):
        j = (i + 1) % len(pts)
        bm.faces.new((a[i], b[i], b[j], a[j]))
    bm.normal_update()
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bmesh.ops.bevel(bm, geom=[e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-6], offset=0.006, segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
    P.bm(bm, "stone_white")
    # face fillet: a raised strip along the underside
    P.bm(bbox(-w / 2 + 0.02, w / 2 - 0.02, -0.372, -0.362, 0.03, 0.29, 0.003), "stone_white")
    return P, {"kind": "bracket", "ref": (0.1, 0.2), "occ": "eaves"}

@piece
def plinth():
    """THE PLINTH BAND (1 m run, blue stone): from 0.3 m below the base (sloped streets) to 0.56 m, 4 cm proud, a
    chamfered and rounded weathered top, coursed joints come from the material."""
    P = Part()
    prof = [(-0.3, -0.002), (-0.3, 0.042), (0.5, 0.042)]
    prof += [(0.5 + 0.012 * math.sin(t), 0.042 - 0.012 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]
    prof += [(0.548, 0.012), (0.556, 0.0035), (0.558, -0.002)]
    extrude_x(P, prof, -0.5, 0.5, "stone_blue")
    return P, {"kind": "run", "ref": (1.0, 0.6), "occ": "ground"}

@piece
def step():
    """A BLUE-STONE STEP (1.5 m run, stretched along x): 17 cm rise, 32 cm tread, a rounded nosing over a small cavetto."""
    P = Part()
    prof = [(-0.17, -0.3), (-0.17, 0.3), (-0.04, 0.3)]
    prof += [(-0.04 + 0.03 * math.sin(t), 0.3 - 0.0 + 0.015 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 3 for k in range(1, 4)]][:0]
    prof = [(-0.17, -0.3), (-0.17, 0.29), (-0.05, 0.29), (-0.045, 0.3)]
    prof += [(-0.02 - 0.02 * math.cos(t), 0.3 + 0.012 * math.sin(t)) for t in [math.pi * k / 6 for k in range(1, 6)]]
    prof += [(0.0, 0.3), (0.0, -0.3)]
    extrude_x(P, prof, -0.75, 0.75, "stone_blue")
    return P, {"kind": "run", "ref": (1.5, 0.17), "occ": "ground"}

@piece
def balcony():
    """A SMALL BALCONY: a moulded stone slab 0.5 m deep on two scrolled consoles, a cast-iron railing (square bars,
    a moulded handrail, corner posts with finials, a central panel of C-scrolls round a ring). Anchored on a window:
    y = 0 = the opening line; the slab's top at the sill's foot (-0.1)."""
    W = REF["window"][0]
    P = Part()
    hw = W / 2 + 0.3
    y0 = -0.1
    # slab: moulded edge swept in plan with returns (the slab's front at z = 0.5)
    prof = [(0.0, -0.14), (0.012, -0.14), (0.012, -0.122), (0.02, -0.112), (0.02, -0.03)]
    prof += [(0.02 + 0.012 * math.sin(t), -0.03 + 0.012 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 4 for k in range(1, 5)]]
    prof += [(0.03, -0.005), (0.0, 0.0)]
    path = [V((hw, 0, -0.01)), V((hw, 0, 0.48)), V((-hw, 0, 0.48)), V((-hw, 0, -0.01))]
    sweep(P, [(a, y0 + b) for a, b in prof], path, (0, 1, 0), slot="stone_white")
    P.bm(bbox(-hw, hw, y0 - 0.14, y0, -0.01, 0.48, 0.0), "stone_white")
    # consoles: scrolled side profile, 0.16 wide
    for sx in (-1, 1):
        x = sx * (hw - 0.2)
        pts = [(0.0, y0 - 0.14), (0.42, y0 - 0.14), (0.42, y0 - 0.17)]
        pts += [(0.42 - 0.035 * (1 - math.cos(t)), y0 - 0.17 - 0.035 * math.sin(t)) for t in [math.pi / 2 * k / 5 for k in range(1, 6)]]
        pts += [(0.3, y0 - 0.25), (0.15, y0 - 0.32)]
        pts += [(0.15 - 0.1 * math.sin(t), y0 - 0.32 - 0.1 * (1 - math.cos(t))) for t in [math.pi / 2 * k / 6 for k in range(1, 7)]]
        pts += [(0.03, y0 - 0.48), (0.0, y0 - 0.48)]
        bm = bmesh.new()
        a = [bm.verts.new((x - 0.08, y, z)) for z, y in pts]
        b = [bm.verts.new((x + 0.08, y, z)) for z, y in pts]
        bm.faces.new(a); bm.faces.new(list(reversed(b)))
        for i in range(len(pts)):
            j = (i + 1) % len(pts)
            bm.faces.new((a[i], b[i], b[j], a[j]))
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        bmesh.ops.bevel(bm, geom=[e for e in bm.edges if abs(e.verts[0].co.x - e.verts[1].co.x) < 1e-6], offset=0.008, segments=2, profile=0.5, affect="EDGES", clamp_overlap=True)
        P.bm(bm, "stone_white")
    # railing: posts, bottom rail, handrail, bars, central ornament
    rh = 0.62
    zr = 0.43
    yb = y0 + 0.03
    for x, z in ((-hw + 0.04, zr), (hw - 0.04, zr), (-hw + 0.04, 0.02), (hw - 0.04, 0.02)):
        P.bm(bbox(x - 0.018, x + 0.018, y0, yb + rh, z - 0.018, z + 0.018, 0.004), "cast_iron_green")
        P.bm(lathe([(0.0, 0.0), (0.016, 0.0), (0.02, 0.012), (0.012, 0.025), (0.018, 0.05), (0.0, 0.085)], seg=8, x=x, z=z), "cast_iron_green", M=T(0, yb + rh + 0.03, 0))
    # rails along the front and the two returns
    runs = [((-hw + 0.04, zr), (hw - 0.04, zr)), ((-hw + 0.04, 0.02), (-hw + 0.04, zr)), ((hw - 0.04, 0.02), (hw - 0.04, zr))]
    hand = [(0.0, -0.016), (0.024, -0.016), (0.026, 0.0), (0.02, 0.012), (0.0, 0.018), (-0.02, 0.012), (-0.026, 0.0), (-0.024, -0.016), (0.0, -0.016)]
    for (ax, az), (bx, bz) in runs:
        A, B = V((ax, 0, az)), V((bx, 0, bz))
        sweep(P, [(a, yb + rh + 0.016 + b) for a, b in hand], [A, B], (0, 1, 0), slot="cast_iron_green")
        L = (B - A).length; d = (B - A) / L
        P.bm(bbox(0, L, yb, yb + 0.03, -0.012, 0.012, 0.003), "cast_iron_green", M=T(ax, 0, az) @ Matrix.Rotation(-math.atan2(d.z, d.x), 4, "Y"))
        P.bm(bbox(0, L, yb + rh - 0.12, yb + rh - 0.095, -0.008, 0.008, 0.003), "cast_iron_green", M=T(ax, 0, az) @ Matrix.Rotation(-math.atan2(d.z, d.x), 4, "Y"))
        n = int(L / 0.11)
        for k in range(1, n):
            p = A + d * (L * k / n)
            if (az == bz) and abs(p.x) < 0.24: continue        # the ornament panel in the middle
            P.bm(bbox(p.x - 0.008, p.x + 0.008, yb + 0.03, yb + rh - 0.1, p.z - 0.008, p.z + 0.008, 0.002), "cast_iron_green")
    # ornament: a ring and four C-scrolls, flat bar section
    cy = yb + 0.03 + (rh - 0.15) / 2
    sec = [(-0.007, -0.005), (0.007, -0.005), (0.007, 0.005), (-0.007, 0.005), (-0.007, -0.005)]
    ring = [V((0.09 * math.cos(2 * math.pi * k / 18), cy + 0.09 * math.sin(2 * math.pi * k / 18), zr)) for k in range(18)]
    sweep(P, sec, ring, (0, 0, 1), closed=True, slot="cast_iron_green")
    for sx in (-1, 1):
        # a C-scroll each side, open toward the ring, its two ends curled inward (mirror-symmetric)
        pts = []
        for k in range(23):
            a = math.radians(-128 + 256 * k / 22)                     # round the far side of the C
            r = 0.075
            pts.append(V((sx * (0.165 + r * math.cos(a)), cy + r * math.sin(a) * 1.25, zr)))
        for end in (0, -1):
            p0 = pts[end]
            curl = [V((p0.x - sx * 0.022 * (1 - math.cos(t)), p0.y + (1 if end == 0 else -1) * 0.022 * math.sin(t) * -1, zr)) for t in [math.pi * q / 6 for q in range(1, 7)]]
            pts = (curl[::-1] + pts) if end == 0 else (pts + curl)
        sweep(P, sec, pts, (0, 0, 1), slot="cast_iron_green")
        # collars tying the scroll to the ring
        P.bm(bbox(sx * 0.09 - 0.008, sx * 0.09 + 0.008, cy - 0.014, cy + 0.014, zr - 0.009, zr + 0.009, 0.002), "cast_iron_green")
    for x in (-0.235, 0.235):
        P.bm(bbox(x - 0.01, x + 0.01, yb + 0.03, yb + rh - 0.1, zr - 0.008, zr + 0.008, 0.002), "cast_iron_green")
    return P, {"kind": "window", "ref": REF["window"], "occ": "wall", "slice": "window"}

# ------------------------------------------------------------------------------------------------ objects, AO, export
def make_object(name, P):
    used = [s for s in SLOTS if s in set(P.s)]
    me = bpy.data.meshes.new(name)
    me.from_pydata([tuple(v) for v in P.v], [], P.f)
    me.update()
    for s in used: me.materials.append(MATS[s])
    me.polygons.foreach_set("material_index", [used.index(s) for s in P.s])
    obj = bpy.data.objects.new(name, me)
    scn.collection.objects.link(obj)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
    bm.to_mesh(me); bm.free()
    me.shade_smooth()
    me.set_sharp_from_angle(angle=math.radians(34))
    me.validate()
    return obj, used

def occluders(meta):
    """the wall / ground the piece sits on, for the AO bake (hidden from export)"""
    objs = []
    def plane(pts, name):
        m = bpy.data.meshes.new(name); m.from_pydata(pts, [], [list(range(len(pts)))]); m.update()
        o = bpy.data.objects.new(name, m); scn.collection.objects.link(o); m.materials.append(WALLMAT); objs.append(o)
    occ = meta["occ"]
    W, H = meta["ref"]
    if occ in ("opening", "opening_arch"):
        hw = W / 2
        rise = meta.get("rise", 0)
        top = H + rise
        # a wall with a hole (4 quads round the opening), and the room behind (dark box)
        plane([(-3, -1.5, 0), (-hw, -1.5, 0), (-hw, H + 3, 0), (-3, H + 3, 0)], "wl")
        plane([(hw, -1.5, 0), (3, -1.5, 0), (3, H + 3, 0), (hw, H + 3, 0)], "wr")
        plane([(-hw, top, 0), (hw, top, 0), (hw, H + 3, 0), (-hw, H + 3, 0)], "wt")
        plane([(-hw, -1.5, 0), (hw, -1.5, 0), (hw, 0, 0), (-hw, 0, 0)], "wb")
        plane([(-3, -1.5, -2.5), (3, -1.5, -2.5), (3, H + 3, -2.5), (-3, H + 3, -2.5)], "room")
        if meta["kind"] == "door": plane([(-3, -0.06 - 0.0, 3), (3, -0.06, 3), (3, -0.06, -1), (-3, -0.06, -1)][::-1], "street")
    elif occ in ("wall", "plinth", "eaves", "ground", "corner"):
        plane([(-4, -2, 0), (4, -2, 0), (4, 3, 0), (-4, 3, 0)], "wall")
        if occ in ("ground", "plinth"): plane([(-4, -0.0, 4), (4, -0.0, 4), (4, -0.0, -0.01), (-4, -0.0, -0.01)][::-1], "ground")
        if occ == "corner":
            for o in objs: bpy.data.objects.remove(o, do_unlink=True)
            objs.clear()
            plane([(-4, -2, 0), (0, -2, 0), (0, 1, 0), (-4, 1, 0)], "wallA")
            plane([(0, -2, 0), (0, -2, -4), (0, 1, -4), (0, 1, 0)], "wallB")
    return objs

def bake_ao(obj):
    me = obj.data
    aov = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")

def export(obj, used, meta, name):
    """raw arrays in the piece frame: per slot, triangles with per-corner position, normal, uv (m), ao"""
    me = obj.data
    me.calc_loop_triangles()
    cn = me.corner_normals
    ao = me.color_attributes.get("AO")
    aod = [1.0] * len(me.loops)
    if ao:
        buf = [0.0] * (4 * len(me.loops)); ao.data.foreach_get("color", buf)
        aod = [max(0.15, min(1.0, buf[4 * i])) for i in range(len(me.loops))]
    per = {s: {"p": [], "n": [], "uv": [], "ao": []} for s in used}
    for lt in me.loop_triangles:
        s = used[lt.material_index]
        fn = lt.normal
        ax, ay, az = abs(fn.x), abs(fn.y), abs(fn.z)
        for li in lt.loops:
            p = me.vertices[me.loops[li].vertex_index].co
            n = cn[li].vector
            # box projection in metres, the face's dominant axis; u along x where possible (runs stretch along x)
            if az >= ax and az >= ay: uv = (p.x, p.y)
            elif ay >= ax: uv = (p.x, p.z)
            else: uv = (p.z, p.y)
            d = per[s]
            d["p"] += [p.x, p.y, p.z]; d["n"] += [n.x, n.y, n.z]; d["uv"] += list(uv); d["ao"].append(aod[li])
    return per

def preview(obj, meta, path):
    """a Cycles still of the piece on a plain wall, 3/4 view"""
    W, H = meta["ref"]
    cam = bpy.data.cameras.new("cam"); co = bpy.data.objects.new("cam", cam); scn.collection.objects.link(co)
    cam.lens = 50
    k = meta["kind"]
    tgt = V((0, H * 0.55, 0)) if k in ("window", "door") else V((0, -0.25, 0.1))
    dist = {"window": 3.6, "door": 4.6, "run": 2.4, "corner": 2.0, "bracket": 1.2, "soup": 2.0}.get(k, 3)
    eye = tgt + V((0.55, 0.12, 0.83)).normalized() * dist
    if k == "corner": eye = tgt + V((0.75, -0.25, 0.75)).normalized() * dist
    def look(o, frm, to):
        """orient a camera / light at frm looking at to, +Y up (the piece frame is y-up)"""
        f = (to - frm).normalized(); r = f.cross(V((0, 1, 0))).normalized(); u = r.cross(f)
        M = Matrix(((r.x, u.x, -f.x, frm.x), (r.y, u.y, -f.y, frm.y), (r.z, u.z, -f.z, frm.z), (0, 0, 0, 1)))
        o.matrix_world = M
    look(co, eye, tgt)
    scn.camera = co
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 3.2; sun.angle = 0.04
    so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    look(so, V((-1.0, 1.6, 1.4)), V((0, 0, 0)))
    w = scn.world; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs["Color"].default_value = (0.42, 0.5, 0.62, 1); bg.inputs["Strength"].default_value = 0.9
    scn.render.engine = "CYCLES"; scn.cycles.samples = 48; scn.cycles.use_denoising = True
    scn.render.resolution_x = 900; scn.render.resolution_y = 900
    scn.render.filepath = path
    scn.view_settings.view_transform = "AgX"
    bpy.ops.render.render(write_still=True)
    for o in (co, so): bpy.data.objects.remove(o, do_unlink=True)

def tris_of(per):
    return sum(len(d["ao"]) // 3 for d in per.values())

scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 0.35
scn.cycles.samples = 128

manifest = {"slots": SLOTS, "ref": REF, "slice": {"x": SLICE_X, "bottom": SLICE_B, "top": SLICE_T}, "frame": FRAME, "pieces": {}}
blob = bytearray()
for name, fn in PIECES.items():
    if ONLY and name not in ONLY: continue
    t = time.time()
    P, meta = fn()
    obj, used = make_object(name, P)
    occ = occluders(meta)
    if BAKE: bake_ao(obj)
    per = export(obj, used, meta, name)
    if PREV:
        os.makedirs(PREV, exist_ok=True)
        preview(obj, meta, os.path.abspath(os.path.join(PREV, f"blender_{name}.png")))
    for o in occ: bpy.data.objects.remove(o, do_unlink=True)
    entry = {**meta, "slots": {}}
    for s, d in per.items():
        n = len(d["ao"])
        off = len(blob)
        blob += struct.pack(f"<{3 * n}f", *d["p"]); blob += struct.pack(f"<{3 * n}f", *d["n"])
        blob += struct.pack(f"<{2 * n}f", *d["uv"]); blob += struct.pack(f"<{n}f", *d["ao"])
        entry["slots"][s] = {"offset": off, "corners": n}
    manifest["pieces"][name] = entry
    obj.hide_render = True
    print(f"{name}: {tris_of(per)} triangles, slots " + ", ".join(f"{s} {len(d['ao']) // 3}" for s, d in per.items()) + f", {time.time() - t:.1f} s")

if ONLY and os.path.exists(os.path.join(OUT, "kit_raw.json")):
    # merge with the pieces built before (only the listed ones were rebuilt)
    old = json.load(open(os.path.join(OUT, "kit_raw.json")))
    oldb = open(os.path.join(OUT, "kit_raw.bin"), "rb").read()
    for name, e in old["pieces"].items():
        if name in manifest["pieces"]: continue
        for s, sl in e["slots"].items():
            n = sl["corners"]; size = n * 4 * 9
            off = len(blob); blob += oldb[sl["offset"]: sl["offset"] + size]; sl["offset"] = off
        manifest["pieces"][name] = e
open(os.path.join(OUT, "kit_raw.bin"), "wb").write(blob)
json.dump(manifest, open(os.path.join(OUT, "kit_raw.json"), "w"), indent=1)
print("wrote", OUT, len(blob), "bytes")
