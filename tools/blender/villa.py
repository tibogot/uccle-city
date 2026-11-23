"""THE VILLA ON AVENUE DU PRINCE D'ORANGE (claude/villa1): a fictional modern luxury villa on a real plot (the detached
house UrbIS solid 543176, tile H9; tools/villa/site.mjs measured the frame and the city's terrain). Everything in code.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/villa.py -- models/villa [--samples 256] [--no-bake] [--preview DIR]
    node tools/villa/pack.mjs                       (mesh audit + meshopt + LODs -> villa.glb, interior.glb)

OUTPUT (models/villa/)
  villa.raw.glb     the exterior: "Villa" (LOD0: plinth, render walls, the slatted upper box, curtain walls, roofs, the
                    garage, the entrance stair, the boundary wall, piers, hedges, the pool terrace + pergola), "Villa_far"
                    (the far variant: the masses), "Villa_gateL" / "Villa_gateR" (the swing gate's leaves, origins on the
                    hinges), "Villa_door" (the pivot front door, origin on its pivot), "Villa_water" (the pool's surface)
  interior.raw.glb  the interior cell: "Cell" (every opaque surface, per-corner baked light _LSKY / _LSUN / _LNIGHT),
                    "Glass" (the curtain walls and balustrades seen from inside), "Collider" (the walker's solids)
  villa.json        placement (hides solid 543176 / BU 1588559), slots, codes, the animated parts, the bounds
  interior.json     levels, the probes (ambient cubes), the inside volumes, the pool, the spawn points

FRAME: Blender (X, Y, Z) = (u, -w, TAW - 100); three.js local (u, TAW - 100, w); u into the plot, w south along the avenue.
MATERIALS: named slots only (no colour baked): COLOR_0.r = a face code (/16), COLOR_0.g = the exterior's baked AO (per
vertex, Cycles AO 2.5 m). The interior's light is baked per corner in Cycles (sky, sun, night lamps), never its colour.
QUALITY (the owner's rules): flat normals on every plane (the soft furniture alone is smooth), every opening built as a
rectangle grid (no n-gon with holes), bevelled steps / copings / furniture, walls and steps sunk 0.3 m under the city's
ground (JOINS), the far variant closed.
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import interior_kit as K

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None): return ARGS[ARGS.index(k) + 1] if k in ARGS else d
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/villa")
BAKE = "--no-bake" not in ARGS
SAMPLES = int(arg("--samples", "256"))
PREVIEW = os.path.abspath(arg("--preview")) if arg("--preview") else None
T0 = time.time()
SITE = json.load(open(os.path.join(OUT, "site.json")))
OY = SITE["frame"]["oy"]
GR = SITE["ground"]

def ground(u, w):
    """the city's terrain (heightmap.js surface) at (u, w), bilinear on the 0.5 m grid of site.json"""
    i = (u - GR["u0"]) / GR["step"]; j = (w - GR["w0"]) / GR["step"]
    i = min(max(i, 0), GR["nu"] - 1.001); j = min(max(j, 0), GR["nw"] - 1.001)
    i0, j0 = int(i), int(j); fi, fj = i - i0, j - j0; h = GR["h"]; nu = GR["nu"]
    g = lambda a, b: h[b * nu + a]
    return (g(i0, j0) * (1 - fi) + g(i0 + 1, j0) * fi) * (1 - fj) + (g(i0, j0 + 1) * (1 - fi) + g(i0 + 1, j0 + 1) * fi) * fj

def gmin(u0, u1, w0, w1, pad=0.5, step=0.25):
    """lowest ground over a rectangle (+ pad): where a wall / a step is sunk to"""
    lo = 1e9; u = u0 - pad
    while u <= u1 + pad + 1e-9:
        w = w0 - pad
        while w <= w1 + pad + 1e-9: lo = min(lo, ground(u, w)); w += step
        u += step
    return lo
def gmax(u0, u1, w0, w1, step=0.25):
    hi = -1e9; u = u0
    while u <= u1 + 1e-9:
        w = w0
        while w <= w1 + 1e-9: hi = max(hi, ground(u, w)); w += step
        u += step
    return hi

def P(u, w, h): return Vector((u, -w, h - OY))
SINK = 0.3                      # walls, steps, kerbs go this far under the city's ground (JOINS: never a floating edge)

# ------------------------------------------------------------------------------------------------ the design (m TAW)
GL, F1 = 118.40, 122.40          # ground floor, first floor (finished)
C0, C1 = 122.00, 125.40          # their ceilings
LIVC, LROOF, LPAR = 125.20, 125.70, 125.95     # the double-height living pavilion: ceiling, roof, parapet
ROOF1, PAR1 = 126.00, 126.30     # the upper box: roof, parapet
GF = dict(u0=14.0, u1=36.0, w0=-23.0, w1=23.0)  # ground floor outer faces
UB = dict(u0=12.0, u1=37.5, w0=-8.0, w1=23.5)   # the cantilevered upper box
T_W = 0.30                       # outer walls
GLASS_IN = 0.15                  # the glass plane from the outer face
# round 2: the garage narrowed to where the old ramp's floor is lowest (max 115.78 m TAW), so ONE flat floor covers the
# terrain everywhere; the drive is a single slope from the sidewalk to it (rule villa-drive-plane)
GAR = dict(door_w=(18.3, 22.0), top=118.0, ceil=118.05, a=(14.3, 19.5, 18.3, 22.0), b=(19.5, 30.0, 16.3, 22.0))
DRIVE_PLANE = dict(u0=9.35, h0=115.74, u1=14.0, h1=115.80)
POOL = dict(u0=38.5, u1=43.0, w0=-15.0, w1=1.0, water=GL - 0.12, floor=GL - 1.35)
TER = dict(u0=36.0, u1=44.5, w0=-17.0, w1=16.0)
WALL_U = 9.6                     # the front wall on the property line (the avenue's half width 9.2 m)
GATE = dict(w0=17.2, w1=23.2, h=1.9)
STAIR = dict(u0=21.42, w0=9.8, w1=11.0, n=22, going=0.28)       # the hall's floating stair (22 risers GL -> F1)
RISE = (F1 - GL) / STAIR["n"]

EXT_SLOTS = ["render_white", "stone_blue", "wood_cladding", "metal_dark", "glass_window", "concrete_soffit", "glow", "hedge", "pool_water", "leaves"]
INT_SLOTS = ["plaster_white", "oak_plank", "walnut", "marble_white", "stone_floor", "fabric_white", "fabric_grey", "leather", "brass",
             "metal_black", "glow", "plant", "ceramic_white", "books", "art", "glass_window"]
CODES = ["plain", "reveal", "plinth", "coping", "step", "slat", "frame", "door", "soffit", "roof", "garage", "led", "fire", "screen",
         "channel", "rug"]
C = {n: i for i, n in enumerate(CODES)}

# ------------------------------------------------------------------------------------------------ geometry builder
def box_uv_frame(p, n):
    """UV0 in metres from a Blender-space point and normal: walls (u along, h up), floors (u, w)"""
    ax, ay, az = abs(n.x), abs(n.y), abs(n.z)
    if az >= ax and az >= ay: return (p.x, -p.y)
    if ax >= ay: return (-p.y, p.z)
    return (p.x, p.z)

class Acc:
    """polygons per object: Blender-space points, slot index, code, UV0 (metres), smooth flag"""
    def __init__(self, name, slots):
        self.name = name; self.slots = slots
        self.v = []; self.f = []; self.fs = []; self.fc = []; self.fuv = []; self.sm = []
    def poly(self, pts, slot, code=0, normal=None, uvs=None, smooth=False):
        pts = [Vector(p) for p in pts]
        if len(pts) < 3: return
        n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
        if n.length < 1e-12 and len(pts) > 3: n = (pts[2] - pts[0]).cross(pts[3] - pts[0])
        if normal is not None and n.dot(Vector(normal)) < 0:
            pts.reverse(); uvs = list(reversed(uvs)) if uvs else None; n = -n
        nn = n.normalized() if n.length > 1e-12 else Vector((0, 0, 1))
        b = len(self.v); self.v.extend(pts)
        self.f.append(tuple(range(b, b + len(pts))))
        self.fs.append(self.slots.index(slot) if isinstance(slot, str) else slot); self.fc.append(code)
        self.fuv.append(uvs or [box_uv_frame(p, nn) for p in pts]); self.sm.append(smooth)
    def rect(self, a, b, c, d, slot, code=0, normal=None, maxlen=0.0, extra_s=(), extra_t=()):
        """a quad a b c d (a grid of quads when maxlen > 0: per-vertex AO / light need corners). The cuts sit on a
        WORLD grid (multiples of maxlen along the edge's axis), so two faces meeting along an edge split it at the same
        points: no T-junction, a welded seam (mesh_audit contact / tjunction)"""
        a, b, c, d = Vector(a), Vector(b), Vector(c), Vector(d)
        if maxlen <= 0:
            self.poly([a, b, c, d], slot, code, normal); return
        S = grid_cuts(a, b, maxlen, extra_s); T = grid_cuts(a, d, maxlen, extra_t)
        q = lambda s, t: a.lerp(b, s).lerp(d.lerp(c, s), t)
        for s0, s1 in zip(S, S[1:]):
            for t0, t1 in zip(T, T[1:]):
                self.poly([q(s0, t0), q(s1, t0), q(s1, t1), q(s0, t1)], slot, code, normal)
    def emit(self, bm, slot, code, M, smooth=False):
        """a kit piece (bmesh in its own frame) placed by M; UV0 box-projected in the piece frame"""
        for fa in bm.faces:
            n = fa.normal
            pts = [M @ l.vert.co for l in fa.loops]
            uvs = [K.box_uv(l.vert.co, n) for l in fa.loops]
            sl = slot(fa) if callable(slot) else slot
            self.poly(pts, sl, code, None, uvs, smooth)
            # (winding kept as the piece's: recalc_face_normals made it outward)
        bm.free()

def grid_cuts(p0, p1, step, extra=()):
    """[0, ..., 1]: the edge p0 -> p1 cut where its coordinate (on its main axis) crosses a multiple of step; an oblique
    edge: uniform cuts"""
    d = p1 - p0; L = d.length
    if L < 1e-9: return [0.0, 1.0]
    k = max(range(3), key=lambda i: abs(d[i]))
    if any(abs(d[i]) > 1e-6 for i in range(3) if i != k):
        n = max(1, math.ceil(L / step)); return [i / n for i in range(n + 1)]
    v0, v1 = p0[k], p1[k]; lo, hi = min(v0, v1), max(v0, v1)
    g = math.floor(lo / step + 1e-6) + 1; out = [0.0]
    while g * step < hi - 1e-4:
        if g * step > lo + 1e-4: out.append((g * step - v0) / (v1 - v0))
        g += 1
    for x in extra:                 # extra cut values on the edge's axis (Blender coordinates)
        if lo + 1e-4 < x < hi - 1e-4: out.append((x - v0) / (v1 - v0))
    out.append(1.0)
    return sorted(set(round(f, 9) for f in out))

# kit frame (x right, y up, z forward) -> Blender (X = x, Y = -z, Z = y): kit forward = +w
R_KIT = Matrix(((1, 0, 0, 0), (0, 0, -1, 0), (0, 1, 0, 0), (0, 0, 0, 1)))
def M_at(u, w, h, face=(0.0, 1.0), s=None):
    """a kit piece at (u, w, h), its front facing (du, dw) in the plan"""
    a = math.atan2(face[0], face[1])
    M = Matrix.Translation(P(u, w, h)) @ Matrix.Rotation(a, 4, "Z") @ R_KIT
    if s is not None: M = M @ Matrix.Diagonal((s, s, s, 1))
    return M

def box(acc, u0, u1, w0, w1, h0, h1, slot, code=0, skip=(), maxlen=0.0):
    """an axis-aligned block, faces outward ('-u' '+u' '-w' '+w' '-h' '+h' in skip are left out)"""
    if u1 - u0 < 1e-6 or w1 - w0 < 1e-6 or h1 - h0 < 1e-6: return
    F = {
        "-u": ([P(u0, w0, h0), P(u0, w1, h0), P(u0, w1, h1), P(u0, w0, h1)], (-1, 0, 0)),
        "+u": ([P(u1, w0, h0), P(u1, w1, h0), P(u1, w1, h1), P(u1, w0, h1)], (1, 0, 0)),
        "-w": ([P(u0, w0, h0), P(u1, w0, h0), P(u1, w0, h1), P(u0, w0, h1)], (0, 1, 0)),
        "+w": ([P(u0, w1, h0), P(u1, w1, h0), P(u1, w1, h1), P(u0, w1, h1)], (0, -1, 0)),
        "-h": ([P(u0, w0, h0), P(u1, w0, h0), P(u1, w1, h0), P(u0, w1, h0)], (0, 0, -1)),
        "+h": ([P(u0, w0, h1), P(u1, w0, h1), P(u1, w1, h1), P(u0, w1, h1)], (0, 0, 1)),
    }
    for k, (pts, n) in F.items():
        if k in skip: continue
        acc.rect(*pts, slot, code, n, maxlen)

def bbox(acc, u0, u1, w0, w1, h0, h1, slot, code=0, bevel=0.01, seg=2, skip_down=True):
    """a bevelled block (kit box: chamfered edges catch the light)"""
    bm = K.box(u1 - u0, h1 - h0, w1 - w0, bevel=bevel, seg=seg)
    if skip_down:
        down = [f for f in bm.faces if f.normal.y < -0.99]
        bmesh.ops.delete(bm, geom=down, context="FACES")
    acc.emit(bm, slot, code, M_at((u0 + u1) / 2, (w0 + w1) / 2, h0))

def wall(acc, axis, c, a0, a1, bot, top, holes, out, slot, code=0, maxlen=0.0, col=0.7, extra=()):
    """a flat wall face on the plane axis = c ('u': the plane u = c, running along w; 'w': w = c, along u), from a0 to
    a1 along it, between bot(a) and top(a) (numbers or callables: evaluated per column, so a sunk foot follows the
    ground), with rectangular holes [(a0, a1, h0, h1)], facing out (+1 / -1 along the axis). Columns of <= col m."""
    cuts = {a0, a1} | {x for x in extra if a0 < x < a1}     # (extra: where a face meeting this one's edge has a vertex)
    for (h_a0, h_a1, _, _) in holes:
        if a0 < h_a0 < a1: cuts.add(h_a0)
        if a0 < h_a1 < a1: cuts.add(h_a1)
    if callable(bot) or callable(top):            # columns on the world grid too (multiples of col): welded seams
        g = math.floor(a0 / col) + 1
        while g * col < a1 - 1e-4:
            if g * col > a0 + 1e-4: cuts.add(g * col)
            g += 1
    xs = sorted(cuts); full = list(zip(xs, xs[1:]))
    nrm = (out, 0, 0) if axis == "u" else (0, -out, 0)
    def pt(a, h): return P(c, a, h) if axis == "u" else P(a, c, h)
    for x0, x1 in full:
        xm = (x0 + x1) / 2
        b = bot(x0, x1) if callable(bot) else bot
        t = top(xm) if callable(top) else top
        cut = sorted([(h0, h1) for (ha0, ha1, h0, h1) in holes if ha0 <= x0 + 1e-6 and ha1 >= x1 - 1e-6])
        spans, h = [], b
        for (h0, h1) in cut:
            if h0 > h + 1e-6: spans.append((h, min(h0, t)))
            h = max(h, h1)
        if t > h + 1e-6: spans.append((h, t))
        for (s0, s1) in spans:
            if s1 - s0 > 1e-6: acc.rect(pt(x0, s0), pt(x1, s0), pt(x1, s1), pt(x0, s1), slot, code, nrm, maxlen)

def reveal(acc, axis, c, depth, hole, slot, code=C["reveal"], maxlen=0.0, sides="lrtb"):
    """the 4 faces round a hole from the wall plane c to c + depth (signed), facing into the opening"""
    a0, a1, h0, h1 = hole
    d = c + depth
    if axis == "u":
        if "l" in sides: acc.rect(P(c, a0, h0), P(d, a0, h0), P(d, a0, h1), P(c, a0, h1), slot, code, (0, -1, 0), maxlen)
        if "r" in sides: acc.rect(P(c, a1, h0), P(d, a1, h0), P(d, a1, h1), P(c, a1, h1), slot, code, (0, 1, 0), maxlen)
        if "b" in sides: acc.rect(P(c, a0, h0), P(d, a0, h0), P(d, a1, h0), P(c, a1, h0), slot, code, (0, 0, 1), maxlen)
        if "t" in sides: acc.rect(P(c, a0, h1), P(d, a0, h1), P(d, a1, h1), P(c, a1, h1), slot, code, (0, 0, -1), maxlen)
    else:
        if "l" in sides: acc.rect(P(a0, c, h0), P(a0, d, h0), P(a0, d, h1), P(a0, c, h1), slot, code, (1, 0, 0), maxlen)
        if "r" in sides: acc.rect(P(a1, c, h0), P(a1, d, h0), P(a1, d, h1), P(a1, c, h1), slot, code, (-1, 0, 0), maxlen)
        if "b" in sides: acc.rect(P(a0, c, h0), P(a0, d, h0), P(a1, d, h0), P(a1, c, h0), slot, code, (0, 0, 1), maxlen)
        if "t" in sides: acc.rect(P(a0, c, h1), P(a0, d, h1), P(a1, d, h1), P(a1, c, h1), slot, code, (0, 0, -1), maxlen)

def pane(acc, axis, c, hole, out, slot, code=0):
    a0, a1, h0, h1 = hole
    nrm = (out, 0, 0) if axis == "u" else (0, -out, 0)
    if axis == "u": acc.rect(P(c, a0, h0), P(c, a1, h0), P(c, a1, h1), P(c, a0, h1), slot, code, nrm)
    else: acc.rect(P(a0, c, h0), P(a1, c, h0), P(a1, c, h1), P(a0, c, h1), slot, code, nrm)

def frames(acc, axis, c, hole, mull=1.6, transom=None, t=0.06, d=0.10, slot="metal_dark"):
    """an aluminium frame round a hole at the glass plane c, mullions every ~mull m, transoms at the given heights"""
    a0, a1, h0, h1 = hole
    def bx(x0, x1, y0, y1):
        if axis == "u": bbox(acc, c - d / 2, c + d / 2, x0, x1, y0, y1, slot, C["frame"], bevel=0.004, seg=1, skip_down=False)
        else: bbox(acc, x0, x1, c - d / 2, c + d / 2, y0, y1, slot, C["frame"], bevel=0.004, seg=1, skip_down=False)
    bx(a0, a0 + t, h0, h1); bx(a1 - t, a1, h0, h1)
    bx(a0 + t, a1 - t, h0, h0 + t); bx(a0 + t, a1 - t, h1 - t, h1)
    n = max(1, round((a1 - a0) / mull))
    for k in range(1, n):
        x = a0 + (a1 - a0) * k / n
        bx(x - t / 2, x + t / 2, h0 + t, h1 - t)
    for y in (transom or []):            # (between the mullions, a little shallower: no face shared with them)
        xs = [a0 + t] + [a0 + (a1 - a0) * k / n + s_ * t / 2 for k in range(1, n) for s_ in (-1, 1)] + [a1 - t]
        for xa, xb in zip(xs[0::2], xs[1::2]):
            if axis == "u": bbox(acc, c - d * 0.42, c + d * 0.42, xa, xb, y - t / 2, y + t / 2, slot, C["frame"], bevel=0.004, seg=1, skip_down=False)
            else: bbox(acc, xa, xb, c - d * 0.42, c + d * 0.42, y - t / 2, y + t / 2, slot, C["frame"], bevel=0.004, seg=1, skip_down=False)

# ================================================================================================ THE EXTERIOR (LOD0)
EX = Acc("Villa", EXT_SLOTS)
IVY = Acc("Villa_ivy", EXT_SLOTS)                # (the climbers' leaf cards: their own node, audited apart: cards overlap by design)
GLS = Acc("Villa_glass_tmp", EXT_SLOTS)          # (merged into EX: kept apart only to count)
ML = 0.7                                         # exterior densify (per-vertex AO)

# openings (outer faces): (axis, plane, out, hole (a0, a1, h0, h1), kind)
DOOR = (6.3, 8.7, GL, GL + 3.0)
DU = 15.2                        # round 2: the entrance recessed 1.2 m into the house (the door's outer plane)
RECESS = (5.9, 9.1, GL, GL + 3.4)
RECESS_IN = (5.6, 9.4, GL, C0)   # its hole in the inner face (the recess walls are 0.3 m thick)
OPEN = {
    "front_gf": [RECESS, (4.5, 5.5, GL, GL + 3.0), (12.0, 21.5, GL + 0.3, GL + 3.0), (-21.2, -19.9, GL + 0.0, GL + 6.4),
                 (-17.0, -15.8, GL + 0.0, GL + 6.4), (-12.6, -11.4, GL + 0.0, GL + 6.4)],
    "back_liv": [(-22.7, -8.15, GL, LIVC)],
    "back_gf": [(-7.85, 4.9, GL, C0 - 0.05), (5.0, 7.9, GL, C0 - 0.05), (8.0, 22.7, GL, C0 - 0.05)],
    "north": [(28.0, 33.0, GL + 0.45, GL + 2.4)],
    "south_gf": [(24.0, 33.0, GL + 0.3, GL + 3.0)],
    "front_f1": [(-6.0, 21.0, F1 + 0.6, F1 + 2.6)],
    "back_f1": [(0.0, 23.2, F1, C1)],
    "side_f1": [(28.0, 34.0, F1 + 0.6, F1 + 2.6)],
}
OPEN_BAY = (5.0, 7.9)            # the hall's back bay: its sliding panel parked open (the walker steps out onto the terrace)

def plinth_bot(axis, c, out):
    """the sunk foot of a face on plane c: min ground over the column and 0.5 m out"""
    def f(x0, x1):
        if axis == "u": return gmin(min(c, c + out * 0.6), max(c, c + out * 0.6), x0, x1, pad=0.05) - SINK
        return gmin(x0, x1, min(c, c - out * 0.6), max(c, c - out * 0.6), pad=0.05) - SINK
    return f

# ---- clipped hedges along the sides and the back of the plot (on the ground, sunk)
def hedge(axis, c, a0, a1, thick=1.0, hgt=2.3):
    n_ = max(1, math.ceil((a1 - a0) / 2.0))
    for k in range(n_):
        x0, x1 = a0 + (a1 - a0) * k / n_, a0 + (a1 - a0) * (k + 1) / n_
        if axis == "w":
            gb_ = gmin(x0, x1, c - thick / 2, c + thick / 2, pad=0.1) - SINK
            gt = gmax(x0, x1, c - thick / 2, c + thick / 2) + hgt
            bbox(EX, x0, x1 + 0.001, c - thick / 2, c + thick / 2, gb_, gt, "hedge", 0, 0.12, 2)
        else:
            gb_ = gmin(c - thick / 2, c + thick / 2, x0, x1, pad=0.1) - SINK
            gt = gmax(c - thick / 2, c + thick / 2, x0, x1) + hgt
            bbox(EX, c - thick / 2, c + thick / 2, x0, x1 + 0.001, gb_, gt, "hedge", 0, 0.12, 2)

def climber(acc, c, w0, w1, h0, h1, seed=0):
    """a climbing plant on the plane u = c (facing -u), round 3: LEAF CARDS (7-13 cm, each with its own 0..1 UV: the
    `leaves` slot cuts the leaf's outline in the fragment with a smooth edge, the TAAU resolves it) scattered where a
    smooth noise field allows (clumps and tendrils thinning at the sides and the top), 2-14 cm off the wall, turned in
    the wall's plane and tipped out a little. No cell grid anywhere: no raster stair-step (rule no-sawtooth-terrain)"""
    rnd = random.Random(seed)
    ph = [rnd.uniform(0, 6.28) for _ in range(6)]
    W, H = w1 - w0, h1 - h0
    def field(x, y):
        n = (math.sin(x * 2.1 + ph[0]) + math.sin(y * 1.7 + ph[1]) + 0.6 * math.sin((x + y) * 3.9 + ph[2]) + 0.5 * math.sin((x - y) * 5.3 + ph[3])) / 3.1
        edge = min(x, W - x, y * 0.6, 0.9) / 0.9
        top = 1.0 - max(0.0, (y - H * (0.55 + 0.35 * math.sin(x * 1.3 + ph[4]))) / 0.8)
        return n * 0.5 + 0.55 * edge + 0.35 * top - 0.25
    n = int(W * H * 70)
    for _ in range(n):
        x, y = rnd.uniform(0, W), rnd.uniform(0, H)
        if field(x, y) < 0.3 + rnd.uniform(-0.08, 0.08): continue
        sz = rnd.uniform(0.07, 0.13); a = rnd.uniform(0, 6.283); tip = rnd.uniform(0.15, 0.6)
        off = rnd.uniform(0.02, 0.14)
        ca_, sa_ = math.cos(a), math.sin(a)
        # card corners in (along-wall w, up h, out -u): its long axis turned by a, its top tipped out by `tip`
        pts = []
        for (cx, cy) in ((-0.5, -0.5), (0.5, -0.5), (0.5, 0.5), (-0.5, 0.5)):
            dw = (cx * ca_ - cy * sa_) * sz * 0.8; dh = (cx * sa_ + cy * ca_) * sz
            out = off + max(0.0, cy) * sz * tip
            pts.append(P(c - out, w0 + x + dw, h0 + y + dh))
        acc.poly(pts, "leaves", 0, (-1, 0, 0), uvs=[(0, 0), (1, 0), (1, 1), (0, 1)])

SEG7 = {"1": "bc", "8": "abcdefg"}
def digits(acc, c, wm, h0, hgt, txt="18"):
    """a house number from bright bars (seven segments) on the plane u = c facing -u, centred on wm"""
    wd = hgt * 0.5; t = hgt * 0.12; gap = hgt * 0.22
    n = len(txt); x0 = wm - (n * wd + (n - 1) * gap) / 2
    for k, ch in enumerate(txt):
        a = x0 + k * (wd + gap); b = a + wd; m = h0 + hgt / 2
        seg = {"a": (a, b, h0 + hgt - t, h0 + hgt), "g": (a + t, b - t, m - t / 2, m + t / 2), "d": (a, b, h0, h0 + t),
               "f": (a, a + t, m + t / 2, h0 + hgt - t), "b": (b - t, b, m + t / 2, h0 + hgt - t), "e": (a, a + t, h0 + t, m - t / 2), "c": (b - t, b, h0 + t, m - t / 2)}
        for sg in SEG7[ch]:
            wa, wb, ha, hb = seg[sg]
            bbox(acc, c - 0.012, c, wa, wb, ha, hb, "glow", C["frame"], 0.002, 1, False)

def exterior():
    g0, g1 = GF["w0"], GF["w1"]
    # ---- the plinth (blue stone), from the sunk foot to GL - 0.0, round the ground floor (the terrace covers it behind)
    gd = GAR["door_w"]
    edges = lambda keys: [x for k in keys for h in OPEN[k] for x in h[:2]] + [UB["w0"]]
    wall(EX, "u", GF["u0"], g0, g1, plinth_bot("u", GF["u0"], -1), GL, [(gd[0], gd[1], -1e3, GAR["top"]), (RECESS[0], RECESS[1], GL - 0.3, GL + 1)], -1, "stone_blue", C["plinth"], ML, extra=edges(["front_gf"]))
    wall(EX, "w", g0, GF["u0"], GF["u1"], plinth_bot("w", g0, -1), GL, [], -1, "stone_blue", C["plinth"], ML, extra=edges(["north"]))
    wall(EX, "w", g1, GF["u0"], GF["u1"], plinth_bot("w", g1, 1), GL, [], 1, "stone_blue", C["plinth"], ML, extra=edges(["south_gf"]))
    wall(EX, "u", GF["u1"], g0, g1, plinth_bot("u", GF["u1"], 1), GL, [], 1, "stone_blue", C["plinth"], ML, extra=edges(["back_liv", "back_gf"]) + [TER["w0"], TER["w1"]])   # (under the terrace too: it closes the deck's house-side edge)
    # the plinth's top edge: a 4 cm blue-stone band proud of the render (a shadow line at GL)
    # ---- ground floor walls (render), living pavilion higher
    liv_top = LPAR
    wall(EX, "u", GF["u0"], g0, UB["w0"], GL, liv_top, OPEN["front_gf"], -1, "render_white", 0, ML)
    wall(EX, "u", GF["u0"], UB["w0"], g1, GL, C0, OPEN["front_gf"], -1, "render_white", 0, ML)
    wall(EX, "w", g0, GF["u0"], GF["u1"], GL, liv_top, OPEN["north"], -1, "render_white", 0, ML)
    wall(EX, "w", g1, GF["u0"], GF["u1"], GL, C0, OPEN["south_gf"], 1, "render_white", 0, ML)
    wall(EX, "u", GF["u1"], g0, UB["w0"], GL, liv_top, OPEN["back_liv"], 1, "render_white", 0, ML)
    wall(EX, "u", GF["u1"], UB["w0"], g1, GL, C0, OPEN["back_gf"], 1, "render_white", 0, ML)
    # reveals, frames, glass of the ground floor (glass plane GLASS_IN inside the outer face)
    for key, axis, c, out in (("front_gf", "u", GF["u0"], -1), ("back_liv", "u", GF["u1"], 1), ("back_gf", "u", GF["u1"], 1),
                              ("north", "w", g0, -1), ("south_gf", "w", g1, 1)):
        for hole in OPEN[key]:
            if hole == DOOR or hole == RECESS: continue
            # a door-height opening (from GL) gets a blue-stone sill instead of the bottom reveal: 2 cm proud, 3 cm over
            # the face: it closes the seam where the plinth, the terrace and the glass meet (rule welded-seams)
            at_gl = abs(hole[2] - GL) < 1e-6
            reveal(EX, axis, c, -out * GLASS_IN, hole, "render_white", C["reveal"], ML, "lrt" if at_gl else "lrtb")
            if at_gl:
                if axis == "u": bbox(EX, *sorted((c - out * GLASS_IN, c + out * 0.03)), hole[0] + 0.004, hole[1] - 0.004, GL - 0.02, GL + 0.02, "stone_blue", C["coping"], 0.004, 1, False)
                else: bbox(EX, hole[0] + 0.004, hole[1] - 0.004, *sorted((c - out * GLASS_IN, c + out * 0.03)), GL - 0.02, GL + 0.02, "stone_blue", C["coping"], 0.004, 1, False)
            gp = c - out * GLASS_IN
            tr = [C0 - 0.05 - 0.0] if key == "back_liv" else None
            if key == "back_liv": tr = [C0]
            open_bay = key == "back_gf" and abs(hole[0] - OPEN_BAY[0]) < 1e-6
            frames(EX, axis, gp, hole, mull=1.6 if key.startswith("back") else 1.2, transom=tr)
            if not open_bay: pane(GLS, axis, gp, hole, out, "glass_window")
    # the open bay's sliding panel, parked in front of the next bay (outside the glass plane)
    sb = OPEN["back_gf"][2]
    bbox(EX, GF["u1"] - GLASS_IN + 0.06, GF["u1"] - GLASS_IN + 0.11, OPEN_BAY[0] + 2.6, OPEN_BAY[0] + 2.6 + 0.05, GL + 0.02, C0 - 0.08, "metal_dark", C["frame"], 0.004, 1, False)
    # the front door's reveal + frame (the leaf: Villa_door), the stop behind the leaf, a stone threshold
    # round 2: THE RECESSED ENTRANCE (1.2 m deep, walnut-lined, a downlight), a fascia canopy under the overhang
    r0, r1, _, rt = RECESS
    wall(EX, "w", r0, GF["u0"], DU, GL, rt, [], 1, "wood_cladding", C["door"], ML)
    wall(EX, "w", r1, GF["u0"], DU, GL, rt, [], -1, "wood_cladding", C["door"], ML)
    EX.rect(P(GF["u0"], r0, rt), P(DU, r0, rt), P(DU, r1, rt), P(GF["u0"], r1, rt), "wood_cladding", C["door"], (0, 0, -1), ML)
    wall(EX, "u", DU, r0, r1, GL, rt, [DOOR], -1, "wood_cladding", C["door"], ML)
    EX.rect(P(14.5, 7.43, rt - 0.004), P(14.7, 7.43, rt - 0.004), P(14.7, 7.57, rt - 0.004), P(14.5, 7.57, rt - 0.004), "glow", C["led"], (0, 0, -1))
    bbox(EX, GF["u0"], DU, r0, r1, GL - 0.3, GL, "stone_blue", C["step"], 0.004, 1, False)
    reveal(EX, "u", DU, 0.30, DOOR, "metal_dark", C["frame"], 0.0, "lrt")
    a0, a1, h0, h1 = DOOR
    for (wa, wb, ha, hb) in ((a0, a0 + 0.04, h0 + 0.015, h1), (a1 - 0.04, a1, h0 + 0.015, h1), (a0 + 0.04, a1 - 0.04, h1 - 0.04, h1)):
        bbox(EX, DU + 0.19, DU + 0.23, wa, wb, ha, hb, "metal_dark", C["frame"], 0.003, 1, False)
    bbox(EX, DU, DU + T_W, a0, a1, GL - 0.06, GL + 0.015, "stone_blue", C["step"], 0.004, 1, False)
    box(EX, 11.8, GF["u0"], 5.2, 12.6, C0 - 0.24, C0, "metal_dark", C["frame"], skip=("+h",), maxlen=ML)
    for w in (6.6, 8.4, 10.2, 11.8):
        EX.rect(P(12.8, w - 0.06, C0 - 0.244), P(12.92, w - 0.06, C0 - 0.244), P(12.92, w + 0.06, C0 - 0.244), P(12.8, w + 0.06, C0 - 0.244), "glow", C["led"], (0, 0, -1))
    # ---- the upper box (dark timber: slats on the front and the south side), its slab edge and soffits
    u0, u1, w0, w1 = UB["u0"], UB["u1"], UB["w0"], UB["w1"]
    wall(EX, "u", u0, w0, w1, C0, PAR1, OPEN["front_f1"], -1, "wood_cladding", 0, ML)
    wall(EX, "u", u1, w0, w1, C0, PAR1, OPEN["back_f1"], 1, "wood_cladding", 0, ML)
    wall(EX, "w", w1, u0, u1, C0, PAR1, OPEN["side_f1"], 1, "wood_cladding", 0, ML)
    # its north side (w0): exterior where it stands clear of the living pavilion, and above the living roof
    wall(EX, "w", w0, u0, GF["u0"], C0, PAR1, [], -1, "wood_cladding", 0, ML)
    wall(EX, "w", w0, GF["u1"], u1, C0, PAR1, [], -1, "wood_cladding", 0, ML)
    wall(EX, "w", w0, GF["u0"], GF["u1"], LPAR, PAR1, [], -1, "wood_cladding", 0, ML)
    for key, axis, c, out in (("front_f1", "u", u0, -1), ("back_f1", "u", u1, 1), ("side_f1", "w", w1, 1)):
        for hole in OPEN[key]:
            reveal(EX, axis, c, -out * GLASS_IN, hole, "wood_cladding", C["reveal"], ML)
            frames(EX, axis, c - out * GLASS_IN, hole, mull=1.8)
            pane(GLS, axis, c - out * GLASS_IN, hole, out, "glass_window")
    # soffits under the overhangs (h = C0), with downlights
    for (a, b, c_, d) in ((u0, GF["u0"], w0, w1), (GF["u1"], u1, w0, w1), (GF["u0"], GF["u1"], GF["w1"], w1)):
        EX.rect(P(a, c_, C0), P(b, c_, C0), P(b, d, C0), P(a, d, C0), "concrete_soffit", C["soffit"], (0, 0, -1), ML)
    for w in [w0 + 1.5 + 2.2 * k for k in range(int((w1 - w0 - 2) / 2.2) + 1)]:
        for u in ((u0 + GF["u0"]) / 2, (GF["u1"] + u1) / 2):
            EX.rect(P(u - 0.07, w - 0.07, C0 - 0.005), P(u + 0.07, w - 0.07, C0 - 0.005), P(u + 0.07, w + 0.07, C0 - 0.005), P(u - 0.07, w + 0.07, C0 - 0.005), "glow", C["led"], (0, 0, -1))
    # slats: 4 x 5 cm battens every 11 cm, 4 cm proud of the cladding, over the front and the south side (the ribbon
    # windows behind them: a screen)
    def slats(axis, c, a0, a1, out):
        n = int((a1 - a0) / 0.11)
        for k in range(n):
            a = a0 + 0.055 + k * (a1 - a0 - 0.11) / max(1, n - 1)
            if axis == "u": bbox(EX, c + out * 0.09 if out < 0 else c + 0.04, c + out * 0.04 if out < 0 else c + 0.09, a - 0.02, a + 0.02, C0 + 0.02, PAR1 - 0.04, "wood_cladding", C["slat"], 0.006, 1, False)
            else: bbox(EX, a - 0.02, a + 0.02, c + 0.04, c + 0.09, C0 + 0.02, PAR1 - 0.04, "wood_cladding", C["slat"], 0.006, 1, False)
    slats("u", u0, w0 + 0.3, w1 - 0.3, -1)
    slats("w", w1, u0 + 0.3, u1 - 0.3, 1)
    # roofs: the upper box (inside the parapet), the living pavilion; parapet inner faces; copings
    def roof(ua, ub, wa, wb, top, par):
        EX.rect(P(ua + T_W, wa + T_W, top), P(ub - T_W, wa + T_W, top), P(ub - T_W, wb - T_W, top), P(ua + T_W, wb - T_W, top), "concrete_soffit", C["roof"], (0, 0, 1), 2.0)
        wall(EX, "u", ua + T_W, wa + T_W, wb - T_W, top, par, [], 1, "render_white", 0)
        wall(EX, "u", ub - T_W, wa + T_W, wb - T_W, top, par, [], -1, "render_white", 0)
        wall(EX, "w", wa + T_W, ua + T_W, ub - T_W, top, par, [], 1, "render_white", 0)
        wall(EX, "w", wb - T_W, ua + T_W, ub - T_W, top, par, [], -1, "render_white", 0)
        for (a, b, c_, d) in ((ua - 0.02, ub + 0.02, wa - 0.02, wa + T_W), (ua - 0.02, ub + 0.02, wb - T_W, wb + 0.02),
                              (ua - 0.02, ua + T_W, wa + T_W, wb - T_W), (ub - T_W, ub + 0.02, wa + T_W, wb - T_W)):
            bbox(EX, a, b, c_, d, par, par + 0.05, "metal_dark", C["coping"], 0.006, 1, False)
    roof(u0, u1, w0, w1, ROOF1, PAR1)
    # the living pavilion's roof meets the upper box's north wall (w0): its parapet runs round three sides
    ua, ub, wa, wb = GF["u0"], GF["u1"], g0, w0
    EX.rect(P(ua + T_W, wa + T_W, LROOF), P(ub - T_W, wa + T_W, LROOF), P(ub - T_W, wb, LROOF), P(ua + T_W, wb, LROOF), "concrete_soffit", C["roof"], (0, 0, 1), 2.0)
    wall(EX, "u", ua + T_W, wa + T_W, wb, LROOF, LPAR, [], 1, "render_white", 0)
    wall(EX, "u", ub - T_W, wa + T_W, wb, LROOF, LPAR, [], -1, "render_white", 0)
    wall(EX, "w", wa + T_W, ua + T_W, ub - T_W, LROOF, LPAR, [], 1, "render_white", 0)
    for (a, b, c_, d) in ((ua - 0.02, ub + 0.02, wa - 0.02, wa + T_W), (ua - 0.02, ua + T_W, wa + T_W, wb), (ub - T_W, ub + 0.02, wa + T_W, wb)):
        bbox(EX, a, b, c_, d, LPAR, LPAR + 0.05, "metal_dark", C["coping"], 0.006, 1, False)
    # ---- the garage (under the lounge, entered from the front through the old basement ramp): inner faces, LED strips
    A, B = GAR["a"], GAR["b"]
    def gb(a0_, a1_, axis, c):
        def f(x0, x1):
            if axis == "u": return gmin(c - 0.05, c + 0.05, x0, x1, pad=0.3) - SINK
            return gmin(x0, x1, c - 0.05, c + 0.05, pad=0.3) - SINK
        return f
    wall(EX, "w", A[2], GF["u0"], A[1], gb(0, 0, "w", A[2]), GAR["ceil"], [], 1, "render_white", C["garage"], ML)        # zone A north wall
    wall(EX, "u", B[0], B[2], A[2], gb(0, 0, "u", B[0]), GAR["ceil"], [], 1, "render_white", C["garage"], ML)            # the step of the L
    wall(EX, "w", B[2], B[0], B[1], gb(0, 0, "w", B[2]), GAR["ceil"], [], 1, "render_white", C["garage"], ML)            # zone B north wall
    wall(EX, "w", A[3], GF["u0"], B[1], gb(0, 0, "w", A[3]), GAR["ceil"], [], -1, "render_white", C["garage"], ML)       # south wall
    wall(EX, "u", B[1], B[2], B[3], gb(0, 0, "u", B[1]), GAR["ceil"], [], -1, "render_white", C["garage"], ML)           # back wall
    for (ua_, ub_, wa_, wb_) in ((GF["u0"], A[1], A[2], A[3]), (B[0], B[1], B[2], B[3])):
        EX.rect(P(ua_, wa_, GAR["ceil"]), P(ub_, wa_, GAR["ceil"]), P(ub_, wb_, GAR["ceil"]), P(ua_, wb_, GAR["ceil"]), "concrete_soffit", C["garage"], (0, 0, -1), ML)
    # the lintel's underside over the door (from the plinth face to the ceiling)
    EX.rect(P(GF["u0"], gd[0], GAR["top"]), P(GF["u0"] + 0.0, gd[1], GAR["top"]), P(GF["u0"], gd[1], GAR["top"]), P(GF["u0"], gd[0], GAR["top"]), "stone_blue", C["plinth"], (0, 0, -1)) if False else None
    EX.rect(P(GF["u0"], gd[0], GAR["top"]), P(GF["u0"], gd[1], GAR["top"]), P(GF["u0"], gd[1], GAR["ceil"]), P(GF["u0"], gd[0], GAR["ceil"]), "stone_blue", C["plinth"], (1, 0, 0))
    for k, w in enumerate((17.3, 19.3, 21.3)):
        ua_ = GF["u0"] + 0.6 if w > A[2] else B[0] + 0.4
        EX.rect(P(ua_, w - 0.04, GAR["ceil"] - 0.01), P(B[1] - 0.6, w - 0.04, GAR["ceil"] - 0.01), P(B[1] - 0.6, w + 0.04, GAR["ceil"] - 0.01), P(ua_, w + 0.04, GAR["ceil"] - 0.01), "glow", C["led"], (0, 0, -1))
    # ---- the entrance: the landing at GL in front of the door and a side flight down toward the drive (along +w)
    lu0 = 11.9
    bbox(EX, lu0, GF["u0"], 5.5, 9.0, gmin(lu0, GF["u0"], 5.5, 9.0) - SINK, GL, "stone_blue", C["step"], 0.012, 2)
    gbot = ground(13.1, 12.6)
    n = max(3, round((GL - gbot) / 0.172))
    rise = (GL - gbot) / n
    for k in range(1, n):
        wa_ = 9.0 + (k - 1) * 0.30; wb_ = wa_ + 0.30
        top = GL - k * rise
        bbox(EX, 12.2, GF["u0"], wa_, wb_ + (0.0 if k < n - 1 else 0.0), gmin(12.2, GF["u0"], wa_, wb_) - SINK, top, "stone_blue", C["step"], 0.01, 2)
    # its cheek wall (render, stone coping), stepping down with the flight
    for k in range(0, n):
        wa_ = 5.5 if k == 0 else 9.0 + (k - 1) * 0.30; wb_ = 9.0 if k == 0 else wa_ + 0.30
        top = (GL if k == 0 else GL - k * rise) + 0.95
        bbox(EX, lu0 - 0.25, lu0 + 0.0 if k == 0 else 12.2, wa_, wb_, gmin(lu0 - 0.25, 12.2, wa_, wb_) - SINK, top, "render_white", 0, 0.008, 1)
    STEPS_INFO.update(dict(n=n, rise=rise, bottom=gbot))
    # ---- the boundary wall on the property line, the gate's piers (lights), stepped tops
    # round 2 (the street side read as a 40 m blank wall): a LOW wall (0.75 m) with a clipped hedge behind it, the
    # forecourt open to the street; low box hedges along the living wing's plinth, climbers between its slot windows;
    # a mailbox and the house number on the gate's piers
    segs = [(-34.0, -20.0), (-20.0, -6.0), (-6.0, -0.8), (-0.8, 6.0), (6.0, GATE["w0"] - 0.5), (GATE["w1"] + 0.5, 30.0)]
    for (a, b) in segs:
        top = round(gmax(WALL_U, WALL_U + 0.3, a, b) + 0.75, 2)
        bot = lambda x0, x1: gmin(WALL_U, WALL_U + 0.3, x0, x1, pad=0.3) - SINK
        wall(EX, "u", WALL_U, a, b, bot, top - 0.06, [], -1, "render_white", 0, ML)
        wall(EX, "u", WALL_U + 0.3, a, b, bot, top - 0.06, [], 1, "render_white", 0, ML)
        for (x, o) in ((a, 1), (b, -1)):
            endbot = lambda x0, x1, x=x: gmin(x0, x1, x - 0.3, x + 0.3, pad=0.05) - SINK
            wall(EX, "w", x, WALL_U, WALL_U + 0.3, endbot, top - 0.06, [], -o, "render_white", 0)
        bbox(EX, WALL_U - 0.03, WALL_U + 0.33, a - (0.03 if a == -34.0 else 0), b + (0.03 if b == 30.0 else 0), top - 0.06, top, "stone_blue", C["coping"], 0.008, 1, False)
    for k, (a, b) in enumerate(((GATE["w0"] - 0.5, GATE["w0"]), (GATE["w1"], GATE["w1"] + 0.5))):
        top = round(gmax(WALL_U, WALL_U + 0.3, a, b) + 2.05, 2)
        bbox(EX, WALL_U - 0.1, WALL_U + 0.4, a, b, gmin(WALL_U - 0.1, WALL_U + 0.4, a, b) - SINK, top, "stone_blue", C["plinth"], 0.01, 2)
        bbox(EX, WALL_U - 0.11, WALL_U - 0.1 + 0.001, a + 0.15, b - 0.15, top - 0.25, top - 0.2, "glow", C["led"], 0.0, 1, False)
        if k == 0:      # the mailbox: a dark box proud of the pier, a lit slot
            bbox(EX, WALL_U - 0.36, WALL_U - 0.1, a + 0.06, b - 0.06, top - 1.25, top - 0.8, "metal_dark", C["frame"], 0.008, 2, False)
            bbox(EX, WALL_U - 0.375, WALL_U - 0.36, a + 0.12, b - 0.12, top - 0.93, top - 0.88, "glow", C["led"], 0.002, 1, False)
        else:           # the house number "18" (fictional) in bright bars on a dark plate
            bbox(EX, WALL_U - 0.13, WALL_U - 0.1, a + 0.05, b - 0.05, top - 0.95, top - 0.55, "metal_dark", C["frame"], 0.004, 1, False)
            digits(EX, WALL_U - 0.13, (a + b) / 2, top - 0.9, 0.3)
    for (a, b) in ((-32.95, -0.9), (GATE["w1"] + 0.6, 28.95)):
        hedge("u", WALL_U + 0.8, a, b, thick=0.9, hgt=1.9)
    hedge("u", 13.55, -22.8, -1.2, thick=0.7, hgt=0.85)
    for (w0_, w1_, ht) in ((-19.6, -17.3, 4.8), (-15.5, -12.9, 5.6), (-11.1, -8.4, 3.6)):
        climber(IVY, GF["u0"], w0_, w1_, GL - 0.1, GL + ht, seed=int(-w0_ * 10))
    # ---- the terrace (blue stone) with the pool, its steps down to the lawn, the pergola
    t = TER; p = POOL
    tb = lambda x0, x1, axis, c: None
    top_ = GL
    # the deck top split round the pool (and the coping band 0.35 m)
    cp = 0.35
    ci = 0.05                    # (the deck runs on under the coping, 5 cm short of the water: its edge is inside the stone)
    back_edges = [x for k in ("back_liv", "back_gf") for h in OPEN[k] for x in h[:2]] + [UB["w0"]]
    for (a, b, c_, d) in ((t["u0"], p["u0"] - ci, t["w0"], t["w1"]), (p["u1"] + ci, t["u1"], t["w0"], -1.0), (p["u1"] + ci, t["u1"], -1.0, 5.0), (p["u1"] + ci, t["u1"], 5.0, t["w1"]),
                          (p["u0"] - ci, p["u1"] + ci, t["w0"], p["w0"] - ci), (p["u0"] - ci, p["u1"] + ci, p["w1"] + ci, t["w1"])):
        EX.rect(P(a, c_, top_), P(b, c_, top_), P(b, d, top_), P(a, d, top_), "stone_blue", C["plain"], (0, 0, 1), ML, extra_t=(-(p["w0"] - ci), -(p["w1"] + ci)))   # (Blender Y = -w: the pool band ends welded)
    gl_ = gmin(t["u1"], t["u1"] + 1.4, -1.0, 5.0, pad=0.0)
    ns = max(2, round((GL - gl_) / 0.18)); rs = (GL - gl_) / ns
    # (the steps' opening in the deck's side wall stops one riser down: the wall itself is the first riser, no slit)
    for (ax_, c, a0, a1, o) in (("u", t["u1"], t["w0"], t["w1"], 1), ("w", t["w0"], t["u0"], t["u1"], -1), ("w", t["w1"], t["u0"], t["u1"], 1)):
        wall(EX, ax_, c, a0, a1, plinth_bot(ax_, c, o), top_, [(-1.0, 5.0, -1e3, GL - rs)] if (ax_ == "u") else [], o, "stone_blue", C["plinth"], ML,
             extra=[p["w0"] - ci, p["w1"] + ci] if ax_ == "u" else [p["u0"] - ci, p["u1"] + ci])
    # coping round the pool (bevelled, 2 cm proud, 3 cm over the water's edge)
    for (a, b, c_, d) in ((p["u0"] - cp, p["u1"] + cp, p["w0"] - cp, p["w0"] + 0.03), (p["u0"] - cp, p["u1"] + cp, p["w1"] - 0.03, p["w1"] + cp),
                          (p["u0"] - cp, p["u0"] + 0.03, p["w0"] + 0.03, p["w1"] - 0.03), (p["u1"] - 0.03, p["u1"] + cp, p["w0"] + 0.03, p["w1"] - 0.03)):
        bbox(EX, a, b, c_, d, top_ - 0.04, top_ + 0.02, "stone_blue", C["coping"], 0.008, 2, False)
    # the basin's walls above the waterline (the water's own shader draws the basin below it)
    for (ax_, c, a0, a1, o) in (("u", p["u0"], p["w0"], p["w1"], 1), ("u", p["u1"], p["w0"], p["w1"], -1), ("w", p["w0"], p["u0"], p["u1"], 1), ("w", p["w1"], p["u0"], p["u1"], -1)):
        wall(EX, ax_, c, a0, a1, p["water"] - 0.06, top_ - 0.04, [], o, "stone_blue", C["coping"])
    # steps down to the lawn (u1 side, w -1 .. 5)
    for k in range(1, ns):
        bbox(EX, t["u1"] + (k - 1) * 0.36 - 0.02, t["u1"] + k * 0.36, -1.0, 5.0, gmin(t["u1"], t["u1"] + k * 0.36, -1.0, 5.0) - SINK, GL - k * rs, "stone_blue", C["step"], 0.01, 2)
    # the pergola: two dark columns and a thin slab off the upper box, downlights
    for w in (7.0, 15.0):
        bbox(EX, t["u1"] - 0.85, t["u1"] - 0.55, w - 0.15, w + 0.15, GL - 0.02, GL + 2.85, "metal_dark", C["frame"], 0.006, 1)
    pu0, pu1, pw0, pw1, ph = UB["u1"], t["u1"] - 0.4, 6.4, 15.6, GL + 2.85
    box(EX, pu0, pu1, pw0, pw1, ph, ph + 0.22, "concrete_soffit", C["soffit"], skip=("-u",), maxlen=ML)
    for u in (39.5, 41.8):
        for w in (8.5, 11.0, 13.5):
            EX.rect(P(u - 0.07, w - 0.07, ph - 0.004), P(u + 0.07, w - 0.07, ph - 0.004), P(u + 0.07, w + 0.07, ph - 0.004), P(u - 0.07, w + 0.07, ph - 0.004), "glow", C["led"], (0, 0, -1))
    plot = SITE["plot"]
    hedge("w", plot["w0"] + 0.5, WALL_U + 0.35, plot["u1"])
    hedge("w", plot["w1"] - 0.5, WALL_U + 0.35, plot["u1"])
    hedge("u", plot["u1"] - 0.5, plot["w0"] + 1.0, plot["w1"] - 1.0)

STEPS_INFO = {}
exterior()
for k in range(len(GLS.f)):            # the glass into the exterior object (its own slot: one primitive)
    pass
print(f"exterior LOD0: {len(EX.f)} faces + glass {len(GLS.f)} ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ the far variant
FAR = Acc("Villa_far", EXT_SLOTS)
# villa2: the slat screens of the upper box (front, south) drawn by the shader on ONE plane at LOD1 / LOD2 (anti-aliased
# stripes: the 4 cm battens alias at 70+ m): code screen = slats over the cladding, channel = slats over the ribbon
# windows (dark glass in the gaps, lit at night). Interior codes, free on the exterior's wood_cladding.
SCR_WALL, SCR_GLASS = C["screen"], C["channel"]
def screen_face(acc, axis, c, a0, a1, h0, h1, out, hole, maxlen=0.0):
    """a slat screen's plane (axis = c, a0..a1, h0..h1, facing out): bands below / at / above the ribbon window behind it"""
    ha0, ha1, hh0, hh1 = hole
    def r(x0, x1, y0, y1, code):
        if x1 - x0 < 1e-6 or y1 - y0 < 1e-6: return
        if axis == "u": acc.rect(P(c, x0, y0), P(c, x1, y0), P(c, x1, y1), P(c, x0, y1), "wood_cladding", code, (out, 0, 0), maxlen)
        else: acc.rect(P(x0, c, y0), P(x1, c, y0), P(x1, c, y1), P(x0, c, y1), "wood_cladding", code, (0, -out, 0), maxlen)
    r(a0, a1, h0, hh0, SCR_WALL); r(a0, a1, hh1, h1, SCR_WALL)
    r(a0, max(a0, ha0), hh0, hh1, SCR_WALL); r(max(a0, ha0), min(a1, ha1), hh0, hh1, SCR_GLASS); r(min(a1, ha1), a1, hh0, hh1, SCR_WALL)

def far():
    """LOD2 (> 240 m): the masses, closed; villa2: the street-side openings as FLUSH dark panes (the front glass, the
    entrance recess, the side windows), the slat screens as screen codes, no duplicate roof face"""
    g0, g1 = GF["w0"], GF["w1"]
    bot = gmin(GF["u0"], GF["u1"], g0, g1, pad=0.2) - SINK
    box(FAR, GF["u0"], GF["u1"], g0, g1, bot, GL, "stone_blue", C["plinth"], skip=("-h", "+h"))
    # the ground floor's front / north / south faces: walls with the openings, each opening a flush pane
    for (axis, c, a0, a1, top, key, out) in (("u", GF["u0"], g0, UB["w0"], LPAR, "front_gf", -1), ("u", GF["u0"], UB["w0"], g1, C0, "front_gf", -1),
                                            ("w", g0, GF["u0"], GF["u1"], LPAR, "north", -1), ("w", g1, GF["u0"], GF["u1"], C0, "south_gf", 1)):
        holes = [h for h in OPEN[key] if h[0] >= a0 - 1e-6 and h[1] <= a1 + 1e-6]
        wall(FAR, axis, c, a0, a1, GL, top, holes, out, "render_white", 0)
        for h in holes:
            if h == RECESS: pane(FAR, axis, c, h, out, "wood_cladding", C["door"])
            else: pane(FAR, axis, c, h, out, "glass_window")
    FAR.rect(P(GF["u1"], UB["w0"], GL), P(GF["u1"], g1, GL), P(GF["u1"], g1, C0), P(GF["u1"], UB["w0"], C0), "glass_window", 0, (1, 0, 0))
    FAR.rect(P(GF["u1"], g0, GL), P(GF["u1"], UB["w0"], GL), P(GF["u1"], UB["w0"], LIVC), P(GF["u1"], g0, LIVC), "glass_window", 0, (1, 0, 0))
    wall(FAR, "u", GF["u1"], g0, UB["w0"], LIVC, LPAR, [], 1, "render_white", 0)
    # the upper box: soffit, north side, top as before; its front and south faces = the slat screens' codes
    box(FAR, UB["u0"], UB["u1"], UB["w0"], UB["w1"], C0, PAR1, "wood_cladding", 0, skip=("+u", "-u", "+w", "+h"))
    # (villa2, the 240 m cross-fade: its top was wood_cladding, a brown roof popping in over LOD1's grey one)
    FAR.rect(P(UB["u0"], UB["w0"], PAR1), P(UB["u1"], UB["w0"], PAR1), P(UB["u1"], UB["w1"], PAR1), P(UB["u0"], UB["w1"], PAR1), "concrete_soffit", C["roof"], (0, 0, 1))
    screen_face(FAR, "u", UB["u0"], UB["w0"], UB["w1"], C0, PAR1, -1, OPEN["front_f1"][0])
    screen_face(FAR, "w", UB["w1"], UB["u0"], UB["u1"], C0, PAR1, 1, OPEN["side_f1"][0])
    FAR.rect(P(UB["u1"], UB["w0"], C0), P(UB["u1"], 0.0, C0), P(UB["u1"], 0.0, PAR1), P(UB["u1"], UB["w0"], PAR1), "wood_cladding", 0, (1, 0, 0))
    FAR.rect(P(UB["u1"], 0.0, C0), P(UB["u1"], UB["w1"], C0), P(UB["u1"], UB["w1"], F1), P(UB["u1"], 0.0, F1), "wood_cladding", 0, (1, 0, 0))
    FAR.rect(P(UB["u1"], 0.0, F1), P(UB["u1"], UB["w1"], F1), P(UB["u1"], UB["w1"], C1), P(UB["u1"], 0.0, C1), "glass_window", 0, (1, 0, 0))
    FAR.rect(P(UB["u1"], 0.0, C1), P(UB["u1"], UB["w1"], C1), P(UB["u1"], UB["w1"], PAR1), P(UB["u1"], 0.0, PAR1), "wood_cladding", 0, (1, 0, 0))
    # (villa2: the living box's own +h face duplicated this roof rect: a coplanar pair, gone with the box)
    FAR.rect(P(GF["u0"], g0, LPAR), P(GF["u1"], g0, LPAR), P(GF["u1"], UB["w0"], LPAR), P(GF["u0"], UB["w0"], LPAR), "concrete_soffit", C["roof"], (0, 0, 1))
    t = TER
    box(FAR, t["u0"], t["u1"], t["w0"], t["w1"], gmin(t["u0"], t["u1"], t["w0"], t["w1"], 0.2) - SINK, GL, "stone_blue", 0, skip=("-h", "-u"))
    for (a, b) in ((-34.0, GATE["w0"] - 0.5), (GATE["w1"] + 0.5, 30.0)):
        box(FAR, WALL_U, WALL_U + 0.3, a, b, gmin(WALL_U, WALL_U + 0.3, a, b, 0.2) - SINK, gmax(WALL_U, WALL_U + 0.3, a, b) + 1.75, "render_white", 0, skip=("-h",))
    plot = SITE["plot"]
    for (ax_, c, a0, a1) in (("w", plot["w0"] + 0.5, WALL_U + 0.35, plot["u1"]), ("w", plot["w1"] - 0.5, WALL_U + 0.35, plot["u1"]), ("u", plot["u1"] - 0.5, plot["w0"] + 1.0, plot["w1"] - 1.0)):
        if ax_ == "w": box(FAR, a0, a1, c - 0.5, c + 0.5, gmin(a0, a1, c - 0.5, c + 0.5, 0.1) - SINK, gmax(a0, a1, c - 0.5, c + 0.5) + 2.3, "hedge", 0, skip=("-h",))
        else: box(FAR, c - 0.5, c + 0.5, a0, a1, gmin(c - 0.5, c + 0.5, a0, a1, 0.1) - SINK, gmax(c - 0.5, c + 0.5, a0, a1) + 2.3, "hedge", 0, skip=("-h",))
far()

# ------------------------------------------------------------------------------------------------ the open bay's far pane
# villa2 (heroshell, 2026-11-23): the hall's back bay stands OPEN (its sliding panel parked: the walker steps out onto the
# terrace) and the interior closes it only once it shows (< 30 m): from 30 to 70 m (LOD0 drawn) one saw through the bay
# to the front wall's inside (6 back hits, heroshell L0). A pane in its own node "Villa_bay": drawn with the exterior's
# far glass, hidden with it when the interior shows (villaCity.js extGlass), outside the root (the walker's colliders read
# the root's LOD0: the pane never blocks the open bay).
BAY = Acc("Villa_bay", EXT_SLOTS)
pane(BAY, "u", GF["u1"] - GLASS_IN, (OPEN_BAY[0], OPEN_BAY[1], GL, C0 - 0.05), 1, "glass_window")

# ------------------------------------------------------------------------------------------------ LOD1 (scripted)
# villa2: LOD1 (70-240 m) was LOD0 simplified by meshopt (tools/hero_pack.mjs): the simplifier collapsed reveals and the
# entrance recess (the door leaf is its own node: the recess's back wall had the door's hole open: back faces seen from
# the street, heroshell L1 23.2 m2) and bent the flat faces (packed audit: 6.5k streak, 1.2k bentflat, 40 leaks). Now a
# SCRIPTED middle level from the same design numbers: the walls with their openings (rectangle grids, flat normals),
# reveals, glass panes (the open bay closed too), frames and mullions as plain boxes, the recess's back wall closed, the
# slat screens as one plane each (codes screen / channel: the stripes drawn anti-aliased by the shader), hedges as stepped
# boxes, no LEDs / climbers / house number. Every face outward, nothing open (rule villa-lod-shells).
L1 = Acc("Villa_lod1", EXT_SLOTS)
ML1 = 2.1                                        # (per-vertex AO: coarser than LOD0's 0.7)

def lframes(acc, axis, c, hole, mull, transom=None, t=0.06, d=0.10):
    """frame + mullions + transoms as plain boxes at the glass plane c; pieces that meet leave out the touching faces
    (no back-to-back pair), the outer sides lie on the reveals (left out too)"""
    a0, a1, h0, h1 = hole
    lo, hi = ("-u", "+u") if axis == "w" else ("-w", "+w")         # (the along-axis faces)
    def bx(x0, x1, y0, y1, skip, dd=d):
        if axis == "u": box(acc, c - dd / 2, c + dd / 2, x0, x1, y0, y1, "metal_dark", C["frame"], skip=skip)
        else: box(acc, x0, x1, c - dd / 2, c + dd / 2, y0, y1, "metal_dark", C["frame"], skip=skip)
    bx(a0, a0 + t, h0, h1, (lo,)); bx(a1 - t, a1, h0, h1, (hi,))
    bx(a0 + t, a1 - t, h0, h0 + t, (lo, hi, "-h")); bx(a0 + t, a1 - t, h1 - t, h1, (lo, hi, "+h"))
    n = max(1, round((a1 - a0) / mull))
    xs = [a0 + (a1 - a0) * k / n for k in range(1, n)]
    for x in xs: bx(x - t / 2, x + t / 2, h0 + t, h1 - t, ("-h", "+h"))
    for y in (transom or []):
        edges = [a0 + t] + [v for x in xs for v in (x - t / 2, x + t / 2)] + [a1 - t]
        for xa, xb in zip(edges[0::2], edges[1::2]): bx(xa, xb, y - t / 2, y + t / 2, (lo, hi), d * 0.84)

def lbox_run(axis, c, a0, a1, thick, hgt, slot="hedge", code=0, seg=2.0):
    """a hedge along a line on the ground: boxes of <= seg m stepping with the ground, the step faces between two boxes
    kept (from the lower top to the higher one), the shared end faces left out"""
    n_ = max(1, math.ceil((a1 - a0) / seg)); xs = [a0 + (a1 - a0) * k / n_ for k in range(n_ + 1)]
    tops, bots = [], []
    for x0, x1 in zip(xs, xs[1:]):
        if axis == "w": bots.append(gmin(x0, x1, c - thick / 2, c + thick / 2, pad=0.1) - SINK); tops.append(gmax(x0, x1, c - thick / 2, c + thick / 2) + hgt)
        else: bots.append(gmin(c - thick / 2, c + thick / 2, x0, x1, pad=0.1) - SINK); tops.append(gmax(c - thick / 2, c + thick / 2, x0, x1) + hgt)
    bot = min(bots)
    lo, hi = ("-u", "+u") if axis == "w" else ("-w", "+w")
    for k, (x0, x1) in enumerate(zip(xs, xs[1:])):
        skip = ["-h"] + ([lo] if k > 0 else []) + ([hi] if k < n_ - 1 else [])
        if axis == "w": box(L1, x0, x1, c - thick / 2, c + thick / 2, bot, tops[k], slot, code, skip=tuple(skip), maxlen=ML1)
        else: box(L1, c - thick / 2, c + thick / 2, x0, x1, bot, tops[k], slot, code, skip=tuple(skip), maxlen=ML1)
        if k < n_ - 1 and abs(tops[k] - tops[k + 1]) > 1e-4:        # the step between this box and the next
            ya, yb = sorted((tops[k], tops[k + 1])); xe = x1; o = 1 if tops[k] > tops[k + 1] else -1
            if axis == "w": L1.rect(P(xe, c - thick / 2, ya), P(xe, c + thick / 2, ya), P(xe, c + thick / 2, yb), P(xe, c - thick / 2, yb), slot, code, (o, 0, 0))
            else: L1.rect(P(c - thick / 2, xe, ya), P(c + thick / 2, xe, ya), P(c + thick / 2, xe, yb), P(c - thick / 2, xe, yb), slot, code, (0, -o, 0))

def lod1():
    g0, g1 = GF["w0"], GF["w1"]
    gd = GAR["door_w"]
    edges = lambda keys: [x for k in keys for h in OPEN[k] for x in h[:2]] + [UB["w0"]]
    # ---- the plinth (the garage mouth, the recess's step) and the ground floor's walls: LOD0's calls, coarser
    wall(L1, "u", GF["u0"], g0, g1, plinth_bot("u", GF["u0"], -1), GL, [(gd[0], gd[1], -1e3, GAR["top"]), (RECESS[0], RECESS[1], GL - 0.3, GL + 1)], -1, "stone_blue", C["plinth"], ML1, col=ML1, extra=edges(["front_gf"]))
    wall(L1, "w", g0, GF["u0"], GF["u1"], plinth_bot("w", g0, -1), GL, [], -1, "stone_blue", C["plinth"], ML1, col=ML1, extra=edges(["north"]))
    wall(L1, "w", g1, GF["u0"], GF["u1"], plinth_bot("w", g1, 1), GL, [], 1, "stone_blue", C["plinth"], ML1, col=ML1, extra=edges(["south_gf"]))
    wall(L1, "u", GF["u1"], g0, g1, plinth_bot("u", GF["u1"], 1), GL, [], 1, "stone_blue", C["plinth"], ML1, col=ML1, extra=edges(["back_liv", "back_gf"]) + [TER["w0"], TER["w1"]])
    wall(L1, "u", GF["u0"], g0, UB["w0"], GL, LPAR, OPEN["front_gf"], -1, "render_white", 0, ML1)
    wall(L1, "u", GF["u0"], UB["w0"], g1, GL, C0, OPEN["front_gf"], -1, "render_white", 0, ML1)
    wall(L1, "w", g0, GF["u0"], GF["u1"], GL, LPAR, OPEN["north"], -1, "render_white", 0, ML1)
    wall(L1, "w", g1, GF["u0"], GF["u1"], GL, C0, OPEN["south_gf"], 1, "render_white", 0, ML1)
    wall(L1, "u", GF["u1"], g0, UB["w0"], GL, LPAR, OPEN["back_liv"], 1, "render_white", 0, ML1)
    wall(L1, "u", GF["u1"], UB["w0"], g1, GL, C0, OPEN["back_gf"], 1, "render_white", 0, ML1)
    for key, axis, c, out in (("front_gf", "u", GF["u0"], -1), ("back_liv", "u", GF["u1"], 1), ("back_gf", "u", GF["u1"], 1),
                              ("north", "w", g0, -1), ("south_gf", "w", g1, 1)):
        for hole in OPEN[key]:
            if hole == DOOR or hole == RECESS: continue
            gp = c - out * GLASS_IN
            reveal(L1, axis, c, -out * GLASS_IN, hole, "render_white", C["reveal"], ML1)
            lframes(L1, axis, gp, hole, 1.6 if key.startswith("back") else 1.2, [C0] if key == "back_liv" else None)
            pane(L1, axis, gp, hole, out, "glass_window")             # (the open bay too: LOD1 is drawn > 60 m, the interior never)
    # ---- the recessed entrance: its walls, ceiling, the back wall CLOSED (the leaf, Villa_door, stands just behind it)
    r0, r1, _, rt = RECESS
    wall(L1, "w", r0, GF["u0"], DU, GL, rt, [], 1, "wood_cladding", C["door"])
    wall(L1, "w", r1, GF["u0"], DU, GL, rt, [], -1, "wood_cladding", C["door"])
    L1.rect(P(GF["u0"], r0, rt), P(DU, r0, rt), P(DU, r1, rt), P(GF["u0"], r1, rt), "wood_cladding", C["door"], (0, 0, -1))
    wall(L1, "u", DU, r0, r1, GL, rt, [], -1, "wood_cladding", C["door"])
    box(L1, GF["u0"], DU, r0, r1, GL - 0.3, GL, "stone_blue", C["step"], skip=("-h", "-w", "+w", "+u"))
    box(L1, 11.8, GF["u0"], 5.2, 12.6, C0 - 0.24, C0, "metal_dark", C["frame"], skip=("+h", "+u"))
    # ---- the upper box: cladding walls, the back ribbon (glass), the slat screens on the front and the south side
    u0, u1, w0, w1 = UB["u0"], UB["u1"], UB["w0"], UB["w1"]
    wall(L1, "u", u0, w0, w1, C0, PAR1, [], -1, "wood_cladding", 0, ML1)
    wall(L1, "u", u1, w0, w1, C0, PAR1, OPEN["back_f1"], 1, "wood_cladding", 0, ML1)
    wall(L1, "w", w1, u0, u1, C0, PAR1, [], 1, "wood_cladding", 0, ML1)
    wall(L1, "w", w0, u0, GF["u0"], C0, PAR1, [], -1, "wood_cladding", 0, ML1)
    wall(L1, "w", w0, GF["u1"], u1, C0, PAR1, [], -1, "wood_cladding", 0, ML1)
    wall(L1, "w", w0, GF["u0"], GF["u1"], LPAR, PAR1, [], -1, "wood_cladding", 0, ML1)
    for hole in OPEN["back_f1"]:
        reveal(L1, "u", u1, -GLASS_IN, hole, "wood_cladding", C["reveal"], ML1)
        lframes(L1, "u", u1 - GLASS_IN, hole, 1.8)
        pane(L1, "u", u1 - GLASS_IN, hole, 1, "glass_window")
    # the screens: a plane at the battens' outer face, its four edges closed (the slats' ends seen from below / the side)
    sh0, sh1 = C0 + 0.02, PAR1 - 0.04
    for (axis, c, a0, a1, out, hole) in (("u", u0, w0 + 0.3, w1 - 0.3, -1, OPEN["front_f1"][0]), ("w", w1, u0 + 0.3, u1 - 0.3, 1, OPEN["side_f1"][0])):
        f = c + out * 0.09
        screen_face(L1, axis, f, a0, a1, sh0, sh1, out, hole, ML1)
        lo_, hi_ = sorted((c, f))
        if axis == "u": box(L1, lo_, hi_, a0, a1, sh0, sh1, "wood_cladding", C["slat"], skip=("-u", "+u"))
        else: box(L1, a0, a1, lo_, hi_, sh0, sh1, "wood_cladding", C["slat"], skip=("-w", "+w"))
    # soffits under the overhangs
    for (a, b, c_, d) in ((u0, GF["u0"], w0, w1), (GF["u1"], u1, w0, w1), (GF["u0"], GF["u1"], GF["w1"], w1)):
        L1.rect(P(a, c_, C0), P(b, c_, C0), P(b, d, C0), P(a, d, C0), "concrete_soffit", C["soffit"], (0, 0, -1), ML1)
    # ---- roofs inside their parapets, copings as boxes
    def roof(ua, ub, wa, wb, top, par, closed_w1=True):
        wb_in = wb - T_W if closed_w1 else wb
        L1.rect(P(ua + T_W, wa + T_W, top), P(ub - T_W, wa + T_W, top), P(ub - T_W, wb_in, top), P(ua + T_W, wb_in, top), "concrete_soffit", C["roof"], (0, 0, 1), ML1)
        wall(L1, "u", ua + T_W, wa + T_W, wb_in, top, par, [], 1, "render_white", 0)
        wall(L1, "u", ub - T_W, wa + T_W, wb_in, top, par, [], -1, "render_white", 0)
        wall(L1, "w", wa + T_W, ua + T_W, ub - T_W, top, par, [], 1, "render_white", 0)
        if closed_w1: wall(L1, "w", wb - T_W, ua + T_W, ub - T_W, top, par, [], -1, "render_white", 0)
        cop = [(ua - 0.02, ub + 0.02, wa - 0.02, wa + T_W), (ua - 0.02, ua + T_W, wa + T_W, wb_in), (ub - T_W, ub + 0.02, wa + T_W, wb_in)]
        if closed_w1: cop.append((ua - 0.02, ub + 0.02, wb - T_W, wb + 0.02))
        for (a, b, c_, d) in cop: box(L1, a, b, c_, d, par, par + 0.05, "metal_dark", C["coping"])
    roof(u0, u1, w0, w1, ROOF1, PAR1)
    roof(GF["u0"], GF["u1"], g0, w0, LROOF, LPAR, closed_w1=False)
    # ---- the garage behind its mouth: walls, ceiling, the lintel's underside
    A, B = GAR["a"], GAR["b"]
    def gb(axis, c):
        def f(x0, x1):
            if axis == "u": return gmin(c - 0.05, c + 0.05, x0, x1, pad=0.3) - SINK
            return gmin(x0, x1, c - 0.05, c + 0.05, pad=0.3) - SINK
        return f
    wall(L1, "w", A[2], GF["u0"], A[1], gb("w", A[2]), GAR["ceil"], [], 1, "render_white", C["garage"], ML1, col=ML1)
    wall(L1, "u", B[0], B[2], A[2], gb("u", B[0]), GAR["ceil"], [], 1, "render_white", C["garage"], ML1, col=ML1)
    wall(L1, "w", B[2], B[0], B[1], gb("w", B[2]), GAR["ceil"], [], 1, "render_white", C["garage"], ML1, col=ML1)
    wall(L1, "w", A[3], GF["u0"], B[1], gb("w", A[3]), GAR["ceil"], [], -1, "render_white", C["garage"], ML1, col=ML1)
    wall(L1, "u", B[1], B[2], B[3], gb("u", B[1]), GAR["ceil"], [], -1, "render_white", C["garage"], ML1, col=ML1)
    for (ua_, ub_, wa_, wb_) in ((GF["u0"], A[1], A[2], A[3]), (B[0], B[1], B[2], B[3])):
        L1.rect(P(ua_, wa_, GAR["ceil"]), P(ub_, wa_, GAR["ceil"]), P(ub_, wb_, GAR["ceil"]), P(ua_, wb_, GAR["ceil"]), "concrete_soffit", C["garage"], (0, 0, -1), ML1)
    L1.rect(P(GF["u0"], gd[0], GAR["top"]), P(GF["u0"], gd[1], GAR["top"]), P(GF["u0"], gd[1], GAR["ceil"]), P(GF["u0"], gd[0], GAR["ceil"]), "stone_blue", C["plinth"], (1, 0, 0))
    # ---- the entrance landing, its flight and cheek wall (boxes, sunk)
    lu0 = 11.9; n = STEPS_INFO["n"]; rise = STEPS_INFO["rise"]
    box(L1, lu0, GF["u0"], 5.5, 9.0, gmin(lu0, GF["u0"], 5.5, 9.0) - SINK, GL, "stone_blue", C["step"], skip=("-h", "+u"))
    for k in range(1, n):
        wa_ = 9.0 + (k - 1) * 0.30; wb_ = wa_ + 0.30
        box(L1, 12.2, GF["u0"], wa_, wb_, gmin(12.2, GF["u0"], wa_, wb_) - SINK, GL - k * rise, "stone_blue", C["step"], skip=("-h", "+u"))
    for k in range(0, n):
        wa_ = 5.5 if k == 0 else 9.0 + (k - 1) * 0.30; wb_ = 9.0 if k == 0 else wa_ + 0.30
        top = (GL if k == 0 else GL - k * rise) + 0.95
        box(L1, lu0 - 0.25, lu0 if k == 0 else 12.2, wa_, wb_, gmin(lu0 - 0.25, 12.2, wa_, wb_) - SINK, top, "render_white", 0, skip=("-h",))
    # ---- the boundary wall, the gate's piers, the hedges
    segs = [(-34.0, -20.0), (-20.0, -6.0), (-6.0, -0.8), (-0.8, 6.0), (6.0, GATE["w0"] - 0.5), (GATE["w1"] + 0.5, 30.0)]
    for (a, b) in segs:
        top = round(gmax(WALL_U, WALL_U + 0.3, a, b) + 0.75, 2)
        bot = lambda x0, x1: gmin(WALL_U, WALL_U + 0.3, x0, x1, pad=0.3) - SINK
        wall(L1, "u", WALL_U, a, b, bot, top - 0.06, [], -1, "render_white", 0, ML1, col=ML1)
        wall(L1, "u", WALL_U + 0.3, a, b, bot, top - 0.06, [], 1, "render_white", 0, ML1, col=ML1)
        for (x, o) in ((a, 1), (b, -1)):
            endbot = lambda x0, x1, x=x: gmin(x0, x1, x - 0.3, x + 0.3, pad=0.05) - SINK
            wall(L1, "w", x, WALL_U, WALL_U + 0.3, endbot, top - 0.06, [], -o, "render_white", 0)
        box(L1, WALL_U - 0.03, WALL_U + 0.33, a - (0.03 if a == -34.0 else 0), b + (0.03 if b == 30.0 else 0), top - 0.06, top, "stone_blue", C["coping"])
    for (a, b) in ((GATE["w0"] - 0.5, GATE["w0"]), (GATE["w1"], GATE["w1"] + 0.5)):
        top = round(gmax(WALL_U, WALL_U + 0.3, a, b) + 2.05, 2)
        box(L1, WALL_U - 0.1, WALL_U + 0.4, a, b, gmin(WALL_U - 0.1, WALL_U + 0.4, a, b) - SINK, top, "stone_blue", C["plinth"], skip=("-h",))
    for (a, b) in ((-32.95, -0.9), (GATE["w1"] + 0.6, 28.95)):
        lbox_run("u", WALL_U + 0.8, a, b, 0.9, 1.9)
    lbox_run("u", 13.55, -22.8, -1.2, 0.7, 0.85)
    plot = SITE["plot"]
    lbox_run("w", plot["w0"] + 0.5, WALL_U + 0.35, plot["u1"], 1.0, 2.3)
    lbox_run("w", plot["w1"] - 0.5, WALL_U + 0.35, plot["u1"], 1.0, 2.3)
    lbox_run("u", plot["u1"] - 0.5, plot["w0"] + 1.0, plot["w1"] - 1.0, 1.0, 2.3)
    # ---- the terrace, the pool's coping and basin rim, the steps to the lawn, the pergola
    t = TER; p = POOL; cp = 0.35; ci = 0.05
    for (a, b, c_, d) in ((t["u0"], p["u0"] - ci, t["w0"], t["w1"]), (p["u1"] + ci, t["u1"], t["w0"], -1.0), (p["u1"] + ci, t["u1"], -1.0, 5.0), (p["u1"] + ci, t["u1"], 5.0, t["w1"]),
                          (p["u0"] - ci, p["u1"] + ci, t["w0"], p["w0"] - ci), (p["u0"] - ci, p["u1"] + ci, p["w1"] + ci, t["w1"])):
        L1.rect(P(a, c_, GL), P(b, c_, GL), P(b, d, GL), P(a, d, GL), "stone_blue", C["plain"], (0, 0, 1), ML1, extra_t=(-(p["w0"] - ci), -(p["w1"] + ci)))
    gl_ = gmin(t["u1"], t["u1"] + 1.4, -1.0, 5.0, pad=0.0)
    ns = max(2, round((GL - gl_) / 0.18)); rs = (GL - gl_) / ns
    for (ax_, c, a0, a1, o) in (("u", t["u1"], t["w0"], t["w1"], 1), ("w", t["w0"], t["u0"], t["u1"], -1), ("w", t["w1"], t["u0"], t["u1"], 1)):
        wall(L1, ax_, c, a0, a1, plinth_bot(ax_, c, o), GL, [(-1.0, 5.0, -1e3, GL - rs)] if (ax_ == "u") else [], o, "stone_blue", C["plinth"], ML1, col=ML1,
             extra=[p["w0"] - ci, p["w1"] + ci] if ax_ == "u" else [p["u0"] - ci, p["u1"] + ci])
    for (a, b, c_, d) in ((p["u0"] - cp, p["u1"] + cp, p["w0"] - cp, p["w0"] + 0.03), (p["u0"] - cp, p["u1"] + cp, p["w1"] - 0.03, p["w1"] + cp),
                          (p["u0"] - cp, p["u0"] + 0.03, p["w0"] + 0.03, p["w1"] - 0.03), (p["u1"] - 0.03, p["u1"] + cp, p["w0"] + 0.03, p["w1"] - 0.03)):
        box(L1, a, b, c_, d, GL - 0.04, GL + 0.02, "stone_blue", C["coping"], skip=("-h",))
    for (ax_, c, a0, a1, o) in (("u", p["u0"], p["w0"], p["w1"], 1), ("u", p["u1"], p["w0"], p["w1"], -1), ("w", p["w0"], p["u0"], p["u1"], 1), ("w", p["w1"], p["u0"], p["u1"], -1)):
        wall(L1, ax_, c, a0, a1, p["water"] - 0.06, GL - 0.04, [], o, "stone_blue", C["coping"])
    for k in range(1, ns):
        box(L1, t["u1"] + (k - 1) * 0.36, t["u1"] + k * 0.36, -1.0, 5.0, gmin(t["u1"], t["u1"] + k * 0.36, -1.0, 5.0) - SINK, GL - k * rs, "stone_blue", C["step"], skip=("-h",) if k == 1 else ("-h", "-u"))   # (butted, not overlapped: no coplanar sides)
    for w in (7.0, 15.0):
        box(L1, t["u1"] - 0.85, t["u1"] - 0.55, w - 0.15, w + 0.15, GL - 0.02, GL + 2.85, "metal_dark", C["frame"], skip=("-h", "+h"))
    pu0, pu1, pw0, pw1, ph = UB["u1"], t["u1"] - 0.4, 6.4, 15.6, GL + 2.85
    box(L1, pu0, pu1, pw0, pw1, ph, ph + 0.22, "concrete_soffit", C["soffit"], skip=("-u",), maxlen=ML1)
lod1()
print(f"LOD1 (scripted): {len(L1.f)} faces; bay pane {len(BAY.f)}")

# ------------------------------------------------------------------------------------------------ the animated parts
def gate_leaf(side):
    """one leaf of the swing gate: a dark aluminium frame with horizontal timber slats; built at the hinge (origin)"""
    A_ = Acc(f"Villa_gate{'L' if side < 0 else 'R'}", EXT_SLOTS)
    hinge_w = GATE["w0"] + 0.02 if side < 0 else GATE["w1"] - 0.02
    half = (GATE["w1"] - GATE["w0"]) / 2 - 0.03
    bot = gmax(WALL_U, WALL_U + 3.2, GATE["w0"], GATE["w1"]) + 0.05
    top = bot + GATE["h"]
    uc = WALL_U + 0.15
    s = 1 if side < 0 else -1                      # the leaf runs from its hinge toward the middle
    wa, wb = sorted((hinge_w, hinge_w + s * half))
    bbox(A_, uc - 0.04, uc + 0.04, wa, wa + 0.06, bot, top, "metal_dark", C["frame"], 0.006, 1, False)
    bbox(A_, uc - 0.04, uc + 0.04, wb - 0.06, wb, bot, top, "metal_dark", C["frame"], 0.006, 1, False)
    bbox(A_, uc - 0.04, uc + 0.04, wa + 0.06, wb - 0.06, bot, bot + 0.08, "metal_dark", C["frame"], 0.006, 1, False)
    bbox(A_, uc - 0.04, uc + 0.04, wa + 0.06, wb - 0.06, top - 0.08, top, "metal_dark", C["frame"], 0.006, 1, False)
    y = bot + 0.12
    while y + 0.09 < top - 0.08:
        bbox(A_, uc - 0.025, uc + 0.025, wa + 0.06, wb - 0.06, y, y + 0.09, "wood_cladding", C["slat"], 0.006, 1, False)
        y += 0.115
    return A_, P(uc, hinge_w, bot), dict(hinge_uw=[uc, hinge_w], bottom=bot, top=top, length=half, side=side)

def front_door():
    A_ = Acc("Villa_door", EXT_SLOTS)
    a0, a1, h0, h1 = DOOR
    uc = DU + 0.15
    bbox(A_, uc - 0.04, uc + 0.04, a0 + 0.006, a1 - 0.006, h0 + 0.02, h1 - 0.006, "wood_cladding", C["door"], 0.008, 2, False)
    bbox(A_, uc - 0.07, uc - 0.04, a1 - 0.35, a1 - 0.31, h0 + 0.6, h0 + 2.2, "metal_dark", C["frame"], 0.008, 2, False)   # a long bar pull
    pivot_w = a0 + 0.8
    return A_, P(uc, pivot_w, h0), dict(pivot_uw=[uc, pivot_w], w=[a0, a1], h=[h0, h1])

WATER = Acc("Villa_water", EXT_SLOTS)
WATER.rect(P(POOL["u0"], POOL["w0"], POOL["water"]), P(POOL["u1"], POOL["w0"], POOL["water"]), P(POOL["u1"], POOL["w1"], POOL["water"]), P(POOL["u0"], POOL["w1"], POOL["water"]), "pool_water", 0, (0, 0, 1))
GATE_L, GATE_L_O, GATE_L_INFO = gate_leaf(-1)
GATE_R, GATE_R_O, GATE_R_INFO = gate_leaf(1)
DOOR_A, DOOR_O, DOOR_INFO = front_door()

# ================================================================================================ THE INTERIOR CELL
IN = Acc("Cell", INT_SLOTS)
IG = Acc("Glass", INT_SLOTS)
COL = []                                           # the walker's collider: triangles
MI = 0.42                                          # interior densify (per-corner light)
def colbox(u0, u1, w0, w1, h0, h1):
    ps = [P(u, w, h) for h in (h0, h1) for w in (w0, w1) for u in (u0, u1)]
    for f in [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]:
        a, b, c, d = [ps[i] for i in f]; COL.extend([a, b, c, a, c, d])

IU0, IU1, IW0, IW1 = GF["u0"] + T_W, GF["u1"] - T_W, GF["w0"] + T_W, GF["w1"] - T_W     # inner faces, ground floor
JU0, JU1, JW1 = UB["u0"] + T_W, UB["u1"] - T_W, UB["w1"] - T_W                          # first floor
PIT = dict(u0=22.0, u1=31.0, w0=-21.0, w1=-12.0, h=GL - 0.45)
LOUNGE_CEIL = C0 - 0.25

def floor_rect(u0, u1, w0, w1, h, slot, code=0, holes=()):
    """a floor (facing up) split round rectangular holes [(u0, u1, w0, w1)]"""
    us = sorted({u0, u1, *[x for hh in holes for x in hh[:2] if u0 < x < u1]})
    for a, b in zip(us, us[1:]):
        cut = sorted([(hh[2], hh[3]) for hh in holes if hh[0] <= a + 1e-6 and hh[1] >= b - 1e-6])
        w = w0
        for (c0_, c1_) in cut:
            if c0_ > w: IN.rect(P(a, w, h), P(b, w, h), P(b, c0_, h), P(a, c0_, h), slot, code, (0, 0, 1), MI)
            w = max(w, c1_)
        if w1 > w: IN.rect(P(a, w, h), P(b, w, h), P(b, w1, h), P(a, w1, h), slot, code, (0, 0, 1), MI)

def ceil_rect(u0, u1, w0, w1, h, holes=(), slot="plaster_white"):
    us = sorted({u0, u1, *[x for hh in holes for x in hh[:2] if u0 < x < u1]})
    for a, b in zip(us, us[1:]):
        cut = sorted([(hh[2], hh[3]) for hh in holes if hh[0] <= a + 1e-6 and hh[1] >= b - 1e-6])
        w = w0
        for (c0_, c1_) in cut:
            if c0_ > w: IN.rect(P(a, w, h), P(b, w, h), P(b, c0_, h), P(a, c0_, h), slot, 0, (0, 0, -1), MI)
            w = max(w, c1_)
        if w1 > w: IN.rect(P(a, w, h), P(b, w, h), P(b, w1, h), P(a, w1, h), slot, 0, (0, 0, -1), MI)

def ibox(u0, u1, w0, w1, h0, h1, slot, code=0, skip=(), col=True, ml=MI):
    box(IN, u0, u1, w0, w1, h0, h1, slot, code, skip, ml)
    if col: colbox(u0, u1, w0, w1, h0, h1)

def put(parts, u, w, h, face=(0.0, 1.0), smooth=True, s=None, colb=None):
    """kit furniture: parts [(bm, slot, code)]; colb = (du, dw, height) collider half-sizes in the plan frame"""
    M = M_at(u, w, h, face, s)
    KIT = {"Hard": "plant", "Wood": "walnut", "Fabric": "fabric_grey", "Glow": "glow", "Plaster": "plaster_white", "Glass": "glass_window"}
    for bm, slot, code in parts:
        if slot in KIT:                     # a house-pilot kit piece (interior_kit: colour tuples): the slot by role,
            leafy = isinstance(code, tuple) and code[1] > code[0] * 1.1        # the code by its colour (leaf / pot)
            slot, code = KIT[slot], (0 if leafy else 1)
        if slot == "walnut" and kit_piece(parts): slot = "plant"
        IN.emit(bm, slot, code, M, smooth and slot in SOFT_SLOTS)
    if kit_piece(parts): PLANTS.append((u, w, h))
    if colb: colbox(u - colb[0], u + colb[0], w - colb[1], w + colb[1], h, h + colb[2])

SOFT_SLOTS = ("fabric_white", "fabric_grey", "leather", "plant", "glow", "ceramic_white")     # smooth-shaded; everything else flat
PLANTS = []                                          # the kit plants (their open leaves: listed in the audit's allow file)
kit_piece = lambda parts: any(p[1] in ("Hard", "Wood", "Fabric", "Glow", "Plaster", "Glass", "plant") for p in parts)
LIGHTS = []                                         # night bake: (name, pos, watts, colour, radius, aim or None)
WARM = (1.0, 0.78, 0.52)
def downlight(u, w, h, watts=14.0, r=0.06):
    IN.rect(P(u - r, w - r, h - 0.004), P(u + r, w - r, h - 0.004), P(u + r, w + r, h - 0.004), P(u - r, w + r, h - 0.004), "glow", C["led"], (0, 0, -1))
    LIGHTS.append((f"dl{len(LIGHTS)}", P(u, w, h - 0.05), watts, WARM, 0.04, P(u, w, h - 3.0)))
def led_strip(a, b, slot="glow", width=0.03, normal=(0, 0, -1), watts_per_m=0.0):
    a, b = Vector(a), Vector(b)
    n = Vector(normal); side = (b - a).cross(n).normalized() * width / 2
    IN.poly([a - side, b - side, b + side, a + side], slot, C["led"], normal)

def interior():
    # ---------------------------------------------------------------- ground floor floors
    floor_rect(IU0, IU1, IW0, -8.0, GL, "oak_plank", 0, holes=[(PIT["u0"], PIT["u1"], PIT["w0"], PIT["w1"])])
    floor_rect(21.15, IU1, -8.0, 4.0, GL, "stone_floor")
    floor_rect(IU0, IU1, 4.0, 11.0, GL, "stone_floor")
    floor_rect(IU0, IU1, 11.3, IW1, GL, "oak_plank")
    floor_rect(IU0, 21.15, -8.0, -7.85, GL, "stone_floor") if False else None
    colbox(IU0 - 0.4, IU1 + 0.4, IW0, IW1, GL - 0.4, GL)
    # the sunken lounge: its floor, three steps round it (0.15 m), a stone edge
    floor_rect(PIT["u0"], PIT["u1"], PIT["w0"], PIT["w1"], PIT["h"], "oak_plank")
    for k in range(3):
        h_ = GL - (k + 1) * 0.15; d = 0.3 * k
        for (ax_, c, a0, a1, o) in (("u", PIT["u0"] + d, PIT["w0"] + d, PIT["w1"] - d, 1), ("u", PIT["u1"] - d, PIT["w0"] + d, PIT["w1"] - d, -1),
                                    ("w", PIT["w0"] + d, PIT["u0"] + d, PIT["u1"] - d, 1), ("w", PIT["w1"] - d, PIT["u0"] + d, PIT["u1"] - d, -1)):
            wall(IN, ax_, c, a0, a1, h_, h_ + 0.15, [], o, "stone_floor", C["step"], MI)
        if k < 2:
            dd = 0.3 * (k + 1)
            for (a, b, c_, e) in ((PIT["u0"] + d, PIT["u0"] + dd, PIT["w0"] + d, PIT["w1"] - d), (PIT["u1"] - dd, PIT["u1"] - d, PIT["w0"] + d, PIT["w1"] - d),
                                  (PIT["u0"] + dd, PIT["u1"] - dd, PIT["w0"] + d, PIT["w0"] + dd), (PIT["u0"] + dd, PIT["u1"] - dd, PIT["w1"] - dd, PIT["w1"] - d)):
                IN.rect(P(a, c_, h_), P(b, c_, h_), P(b, e, h_), P(a, e, h_), "stone_floor", C["step"], (0, 0, 1), MI)
            colbox(PIT["u0"] + dd, PIT["u1"] - dd, PIT["w0"] + dd, PIT["w1"] - dd, h_ - 0.4, h_) if False else None
    for k in range(3):
        dd = 0.3 * k
        colbox(PIT["u0"] + dd, PIT["u1"] - dd, PIT["w0"] + dd, PIT["w1"] - dd, PIT["h"] - 0.4, GL - (k + 1) * 0.15)
    # ---------------------------------------------------------------- outer walls' inner faces (GF), inner reveals
    def inner_wall(axis, c, a0, a1, h0, h1, holes, out, glass_c):
        wall(IN, axis, c, a0, a1, h0, h1, holes, out, "plaster_white", 0, MI)
        for hole in holes:
            if hole == DOOR:                 # to the door stop (DU + 0.23): the leaf closes against it
                reveal(IN, axis, c, (DU + 0.23) - c, hole, "plaster_white", C["reveal"], MI, "lrt"); continue
            if hole == RECESS_IN: continue   # (the recess's own faces below)
            reveal(IN, axis, c, glass_c - c, hole, "plaster_white", C["reveal"], MI)
            if not (hole[0] == OPEN_BAY[0]): pane(IG, axis, glass_c, hole, out, "glass_window")
        colgaps = sorted(holes)
    liv_h = LIVC
    inner_wall("u", IU0, IW0, -8.0, GL, liv_h, [h for h in OPEN["front_gf"] if h[1] <= -8.0], 1, GF["u0"] + GLASS_IN)
    inner_wall("u", IU0, -8.0, IW1, GL, C0, [RECESS_IN if h == RECESS else h for h in OPEN["front_gf"] if h[0] >= -8.0], 1, GF["u0"] + GLASS_IN)
    inner_wall("u", DU + 0.3, RECESS_IN[0], RECESS_IN[1], GL, C0, [DOOR], 1, DU + GLASS_IN)        # the recess's back, inside
    wall(IN, "w", RECESS_IN[0], IU0, DU + 0.3, GL, C0, [], -1, "plaster_white", 0, MI)
    wall(IN, "w", RECESS_IN[1], IU0, DU + 0.3, GL, C0, [], 1, "plaster_white", 0, MI)
    inner_wall("w", IW0, IU0, IU1, GL, liv_h, OPEN["north"], 1, GF["w0"] + GLASS_IN)
    inner_wall("w", IW1, IU0, IU1, GL, LOUNGE_CEIL, OPEN["south_gf"], -1, GF["w1"] - GLASS_IN)
    inner_wall("u", IU1, IW0, -8.0, GL, liv_h, OPEN["back_liv"], -1, GF["u1"] - GLASS_IN)
    inner_wall("u", IU1, -8.0, IW1, GL, C0, [h for h in OPEN["back_gf"]], -1, GF["u1"] - GLASS_IN)
    # walker: the outer walls (door / open bay gaps) are the exterior model's; the inside's own walls below
    # ---------------------------------------------------------------- ceilings
    ceil_rect(IU0, IU1, IW0, -8.0, LIVC)
    ceil_rect(IU0, IU1, -8.0, 11.3, C0, holes=[(21.0, 27.3, 9.6, 11.3)])
    # the lounge: a dropped ceiling with a perimeter LED cove (recess 0.25 m up to C0) and downlights
    cv = 0.3
    ceil_rect(IU0 + cv, IU1 - cv, 11.3 + cv, IW1 - cv, LOUNGE_CEIL)
    for (a, b, c_, d) in ((IU0, IU1, 11.3, 11.3 + cv), (IU0, IU1, IW1 - cv, IW1), (IU0, IU0 + cv, 11.3 + cv, IW1 - cv), (IU1 - cv, IU1, 11.3 + cv, IW1 - cv)):
        IN.rect(P(a, c_, C0), P(b, c_, C0), P(b, d, C0), P(a, d, C0), "plaster_white", 0, (0, 0, -1), MI)
    for (ax_, c, a0, a1, o) in (("u", IU0 + cv, 11.3 + cv, IW1 - cv, -1), ("u", IU1 - cv, 11.3 + cv, IW1 - cv, 1),
                                ("w", 11.3 + cv, IU0 + cv, IU1 - cv, -1), ("w", IW1 - cv, IU0 + cv, IU1 - cv, 1)):
        wall(IN, ax_, c, a0, a1, LOUNGE_CEIL, C0, [], o, "plaster_white", 0, MI)
        # the strip on the cove's lip, facing up into the recess (it washes the recess ceiling)
        if ax_ == "u": led_strip(P(c + o * 0.06, a0, LOUNGE_CEIL + 0.02), P(c + o * 0.06, a1, LOUNGE_CEIL + 0.02), normal=(0, 0, 1))
        else: led_strip(P(a0, c + o * 0.06, LOUNGE_CEIL + 0.02), P(a1, c + o * 0.06, LOUNGE_CEIL + 0.02), normal=(0, 0, 1))
    for (u_, w_) in ((u, w) for u in (17.5, 21.5, 25.5, 29.5, 33.0) for w in (13.5, 17.0, 20.5)):
        downlight(u_, w_, LOUNGE_CEIL, 10.0)
    for (u_, w_) in ((u, w) for u in (16.5, 20.5, 24.5, 28.5, 32.5) for w in (-20.5, -14.5, -10.0)):
        downlight(u_, w_, LIVC, 22.0)
    for (u_, w_) in ((u, w) for u in (23.0, 27.0, 33.5) for w in (-5.5, -1.0, 2.8)):
        downlight(u_, w_, C0, 12.0)
    for u_ in (16.0, 19.5, 30.0, 33.5):
        downlight(u_, 7.5, C0, 12.0)
    # the F1 slab's edges round the voids (living at w -8, the stairwell)
    wall(IN, "w", -8.0, IU0, IU1, C0, F1, [], -1, "plaster_white", 0, MI)
    wall(IN, "u", 21.0, 9.6, 11.0, C0, F1, [], 1, "plaster_white", 0)
    wall(IN, "u", 27.3, 9.6, 11.0, C0, F1, [], -1, "plaster_white", 0)
    wall(IN, "w", 9.6, 21.0, 27.3, C0, F1, [], 1, "plaster_white", 0)
    # ---------------------------------------------------------------- partitions (GF)
    ibox(20.85, 21.15, -8.0, 4.0, GL, C0, "plaster_white", 0, skip=("-h", "+h"))               # the service core's back
    ibox(IU0, 20.85, -8.15, -7.85, GL, C0, "plaster_white", 0, skip=("-h", "+h", "-u"))
    ibox(IU0, 20.85, 3.85, 4.15, GL, C0, "plaster_white", 0, skip=("-h", "+h", "-u"))
    ceil_rect(IU0, 20.85, -7.85, 3.85, C0) if False else None
    # the marble feature wall (hall side) between the hall and the lounge, two storeys; the lounge door (u 31 .. 33)
    for (a, b) in ((IU0, 31.0), (33.0, IU1)):
        ibox(a, b, 11.0, 11.3, GL, C0, "marble_white", 0, skip=("-h", "+h"))
    ibox(31.0, 33.0, 11.0, 11.3, GL + 2.6, C0, "marble_white", 0, skip=("+h",), col=False)
    # ---------------------------------------------------------------- the stair: floating walnut treads on the marble
    # wall, an LED strip under each nosing, the dark slat screen floor to ceiling on its open side
    s = STAIR
    for k in range(1, s["n"]):
        u_ = s["u0"] + (k - 1) * s["going"]
        top = GL + k * RISE
        bbox(IN, u_ - 0.02, u_ + s["going"], s["w0"], s["w1"], top - 0.07, top, "walnut", C["step"], 0.008, 2, False)
        led_strip(P(u_ + 0.01, s["w0"] + 0.04, top - 0.072), P(u_ + 0.01, s["w1"] - 0.04, top - 0.072), normal=(0, 0, -1), width=0.02)
        colbox(u_ - 0.02, u_ + s["going"], s["w0"], s["w1"], top - 0.25, top)
        if k % 3 == 0: LIGHTS.append((f"st{k}", P(u_ + 0.05, (s["w0"] + s["w1"]) / 2, top - 0.1), 3.0, WARM, 0.08, None))
    for k in range(int((27.3 - 21.0) / 0.16)):          # (16 cm: the stair reads through the screen)
        u_ = 21.08 + k * 0.16
        bbox(IN, u_ - 0.017, u_ + 0.017, 9.62, 9.68, GL, C1, "walnut", C["slat"], 0.005, 1, False)
    colbox(21.0, 27.3, 9.6, 9.7, GL, C1)
    # the brass mesh panel and a console on the service wall's hall face (w 4.15), a plant
    bbox(IN, 15.0, 19.0, 4.15, 4.19, GL + 0.9, GL + 3.1, "brass", C["screen"], 0.004, 1, False)
    bbox(IN, 15.4, 18.6, 4.15, 4.6, GL + 0.78, GL + 0.84, "walnut", 0, 0.006, 2)
    for uu in (15.5, 18.5): bbox(IN, uu - 0.03, uu + 0.03, 4.2, 4.55, GL, GL + 0.78, "metal_black", 0, 0.004, 1)
    colbox(15.4, 18.6, 4.15, 4.6, GL, GL + 0.84)
    put(K.plant(1.6, 0.25, seed=3, kind="ficus", spread=0.7), 20.0, 5.0, GL, (0, 1), colb=(0.3, 0.3, 1.2))
    # ---------------------------------------------------------------- the living room: fireplace wall, the pit's sofas
    # (round 2: the marble wall stopped short of the north window, u 28 .. 33)
    bbox(IN, 16.2, 27.4, IW0, IW0 + 0.18, GL, GL + 4.6, "marble_white", 0, 0.01, 2)
    bbox(IN, 18.3, 25.3, IW0 + 0.17, IW0 + 0.185, GL + 0.45, GL + 0.95, "metal_black", C["fire"], 0.004, 1, False)
    IN.rect(P(18.4, IW0 + 0.19, GL + 0.5), P(25.2, IW0 + 0.19, GL + 0.5), P(25.2, IW0 + 0.19, GL + 0.9), P(18.4, IW0 + 0.19, GL + 0.9), "glow", C["fire"], (0, -1, 0))
    LIGHTS.append(("fire", P(21.8, IW0 + 0.4, GL + 0.7), 60.0, (1.0, 0.55, 0.22), 0.3, None))
    colbox(16.2, 27.4, IW0, IW0 + 0.2, GL, GL + 4.6)
    # art: a tall canvas between the front slot windows, a wide one beside the north window
    art(IN, "u", IU0, 1, -15.4, -13.0, GL + 1.1, GL + 4.3, code=1)
    art(IN, "w", IW0, 1, 33.4, 35.4, GL + 1.0, GL + 2.6, code=2)
    # a long low credenza under it (walnut, books and objects on top), plants in big stone planters
    credenza(IN, "u", IU0, 1, -19.4, -9.0, 0.5, 0.62)
    planter(26.6, -9.4, GL, 2.4, 11); planter(34.9, -9.6, GL, 1.8, 13)
    # the pit: cushions on the sofas, side tables with lamps, a throw
    for (u_, w_, f) in ((23.4, PIT["w1"] - 1.15, (0, -1)), (24.2, PIT["w1"] - 1.15, (0, -1)), (29.0, PIT["w1"] - 1.15, (0, -1)), (PIT["u1"] - 1.15, -18.0, (-1, 0)), (PIT["u1"] - 1.15, -15.2, (-1, 0))):
        cushion(u_, w_, PIT["h"] + 0.5, f)
    for (u_, w_) in ((PIT["u0"] + 0.55, PIT["w1"] - 0.9), (PIT["u0"] + 0.55, PIT["w0"] + 0.6)):
        side_table(u_, w_, PIT["h"]); table_lamp(u_, w_, PIT["h"] + 0.55)
    tufted = lambda w_, seats: channel_sofa(w_, seats)
    put(channel_sofa(6.0, 4), 26.5, PIT["w1"] - 1.0, PIT["h"], (0, -1), colb=(3.0, 0.5, 0.75))
    put(channel_sofa(4.2, 3), PIT["u1"] - 1.0, -16.5, PIT["h"], (-1, 0), colb=(0.5, 2.1, 0.75))
    put(coffee_table_stone(2.2, 1.1), 25.5, -16.5, PIT["h"], (0, 1), colb=(1.1, 0.55, 0.38))
    put([(K.box(4.6, 0.012, 3.6, 0.004, 1), "fabric_grey", C["rug"])], 25.8, -16.3, PIT["h"], (0, 1), smooth=False)
    for w_ in (-19.0, -14.0):
        put(lounge_chair(), PIT["u0"] + 1.0, w_, PIT["h"], (1, 0), colb=(0.45, 0.45, 0.8))
    put(K.plant(2.2, 0.32, seed=7, kind="ficus", spread=1.0), 15.4, -21.5, GL, (0, 1), colb=(0.4, 0.4, 1.5))
    put(K.plant(1.9, 0.3, seed=11, kind="ficus", spread=0.9), 34.8, -21.4, GL, (0, 1), colb=(0.4, 0.4, 1.5))
    put(floor_lamp_arc(), 30.6, -20.6, PIT["h"], (0, 1))
    LIGHTS.append(("arc", P(28.6, -18.8, PIT["h"] + 2.0), 40.0, WARM, 0.15, None))
    # ---------------------------------------------------------------- kitchen + dining
    # tall walnut cabinetry on the service wall's back (u 21.15), a marble back-splash niche with a strip
    bbox(IN, 21.15, 21.8, -7.6, 3.6, GL, GL + 2.9, "walnut", C["door"], 0.006, 2)
    for k in range(9):
        w_ = -7.6 + (k + 0.5) * 11.2 / 9
        bbox(IN, 21.8, 21.83, w_ - 0.015, w_ + 0.015, GL + 1.1, GL + 1.7, "brass", 0, 0.003, 1, False)
    colbox(21.15, 21.8, -7.6, 3.6, GL, GL + 2.9)
    bbox(IN, 29.6, 30.8, -5.5, 0.5, GL, GL + 0.88, "walnut", C["door"], 0.006, 2)
    bbox(IN, 29.5, 30.9, -5.6, 0.6, GL + 0.88, GL + 0.93, "marble_white", 0, 0.008, 2)
    colbox(29.5, 30.9, -5.6, 0.6, GL, GL + 0.93)
    for w_ in (-4.3, -2.9, -1.5, -0.1):
        put(bar_stool(), 31.45, w_, GL, (-1, 0), colb=(0.22, 0.22, 0.75))
    put(dining_table(3.4, 1.1), 25.4, -2.5, GL, (1, 0), colb=(0.55, 1.7, 0.76))
    for k in range(4):
        w_ = -3.75 + k * 1.0 - 0.25
        put(dining_chair(), 24.55, w_ + 0.15, GL, (1, 0), colb=(0.25, 0.25, 0.9))
        put(dining_chair(), 26.25, w_ + 0.15, GL, (-1, 0), colb=(0.25, 0.25, 0.9))
    for w_ in (-3.6, -2.5, -1.4):
        put(pendant_globe(), 25.4, w_, C0, (0, 1))
        LIGHTS.append((f"pd{len(LIGHTS)}", P(25.4, w_, C0 - 0.95), 16.0, WARM, 0.08, None))
    for w_ in (-4.0, -1.0):
        put(pendant_globe(), 30.2, w_, C0, (0, 1))
        LIGHTS.append((f"pi{len(LIGHTS)}", P(30.2, w_, C0 - 0.95), 16.0, WARM, 0.08, None))
    # ---------------------------------------------------------------- the lounge: walnut wall cabinetry with brass
    # handles, the wall TV, the lit coffee niche; the channel-tufted white sofa, a stone table, a rug
    cu0, cu1 = 15.0, 35.0
    for (a, b) in ((cu0, 23.0), (26.4, 30.6), (32.6, cu1)):
        bbox(IN, a, b, IW1 - 0.6, IW1, GL, LOUNGE_CEIL - 0.02, "walnut", C["door"], 0.006, 2)
        n_ = max(1, round((b - a) / 0.6))
        for k in range(n_):
            u_ = a + (k + 0.5) * (b - a) / n_
            bbox(IN, u_ - 0.012, u_ + 0.012, IW1 - 0.63, IW1 - 0.6, GL + 0.95, GL + 1.55, "brass", 0, 0.003, 1, False)
    bbox(IN, 23.0, 26.4, IW1 - 0.25, IW1, GL, LOUNGE_CEIL - 0.02, "walnut", C["door"], 0.006, 2)        # the TV's panel
    bbox(IN, 23.3, 26.1, IW1 - 0.3, IW1 - 0.25, GL + 1.0, GL + 2.6, "metal_black", C["screen"], 0.004, 1, False)
    bbox(IN, 23.0, 26.4, IW1 - 0.6, IW1 - 0.25, GL, GL + 0.42, "walnut", C["door"], 0.006, 2)          # its low unit
    bbox(IN, 30.6, 32.6, IW1 - 0.6, IW1, GL, GL + 0.9, "walnut", C["door"], 0.006, 2)                  # the coffee niche
    bbox(IN, 30.6, 32.6, IW1 - 0.6, IW1, GL + 2.05, LOUNGE_CEIL - 0.02, "walnut", C["door"], 0.006, 2)
    bbox(IN, 30.6, 32.6, IW1 - 0.08, IW1, GL + 0.9, GL + 2.05, "marble_white", 0, 0.004, 1, False)
    led_strip(P(30.7, IW1 - 0.3, GL + 2.04), P(32.5, IW1 - 0.3, GL + 2.04), normal=(0, 0, -1), width=0.03)
    LIGHTS.append(("niche", P(31.6, IW1 - 0.3, GL + 1.95), 10.0, WARM, 0.2, None))
    bbox(IN, 31.2, 31.6, IW1 - 0.45, IW1 - 0.1, GL + 0.9, GL + 1.3, "metal_black", 0, 0.01, 2)          # the coffee machine
    for k in range(4): bbox(IN, 31.9 + k * 0.13, 31.98 + k * 0.13, IW1 - 0.4, IW1 - 0.32, GL + 0.9, GL + 0.99, "plaster_white", C["plain"], 0.01, 1)   # cups
    colbox(cu0, cu1, IW1 - 0.6, IW1, GL, LOUNGE_CEIL)
    # round 2 (the owner: "a huge room with one sofa"): a walnut shelving wall at u 27.5 (books and objects both
    # sides, a 4 m opening) splits it: the media lounge in front, a dining room for 8 and a bar behind
    PU = 27.5
    for (a, b) in ((11.3, 15.0), (19.0, IW1 - 0.6)):
        ibox(PU - 0.15, PU + 0.15, a, b, GL, LOUNGE_CEIL, "walnut", C["door"], skip=("-h", "+h"))
        for side in (-1, 1):
            shelves(IN, "u", PU + side * 0.15, side, a + 0.05, b - 0.05, GL + 0.35, LOUNGE_CEIL - 0.3, seed=int(a * 7 + side * 3))
    put(channel_sofa(4.6, 3), 24.7, 16.2, GL, (0, 1), colb=(2.3, 0.5, 0.75))
    for (u_, f) in ((23.6, (0, 1)), (24.4, (0, 1)), (25.9, (0, 1))): cushion(u_, 16.0, GL + 0.5, f)
    put(coffee_table_stone(1.6, 0.9), 24.7, 18.6, GL, (0, 1), colb=(0.8, 0.45, 0.38))
    put([(K.box(5.0, 0.012, 3.6, 0.004, 1), "fabric_grey", C["rug"])], 24.2, 18.0, GL, (0, 1), smooth=False)
    for w_ in (17.4, 19.6):
        put(lounge_chair(), 20.8, w_, GL, (1, 0), colb=(0.45, 0.45, 0.8))
    for (u_, w_) in ((21.9, 15.9),):
        side_table(u_, w_, GL); table_lamp(u_, w_, GL + 0.55)
    put(floor_lamp_arc(), 20.0, 21.4, GL, (0, -1))
    LIGHTS.append(("larc", P(20.6, 19.8, GL + 2.0), 30.0, WARM, 0.15, None))
    planter(14.9, 12.0, GL, 1.9, 17); planter(14.9, 21.7, GL, 2.1, 19)
    art(IN, "w", 11.3, 1, 16.4, 19.6, GL + 1.1, GL + 2.5, code=3)
    # behind: the dining table for 8 under three pendants, a bar (counter, stools, back shelves of bottles)
    put(dining_table(3.2, 1.1), 31.4, 17.0, GL, (1, 0), colb=(0.55, 1.6, 0.76))
    for k in range(4):
        w_ = 15.65 + k * 0.9
        put(dining_chair(), 30.55, w_, GL, (1, 0), colb=(0.25, 0.25, 0.9))
        put(dining_chair(), 32.25, w_, GL, (-1, 0), colb=(0.25, 0.25, 0.9))
    for w_ in (16.0, 17.0, 18.0):
        put(pendant_globe(), 31.4, w_, LOUNGE_CEIL, (0, 1))
        LIGHTS.append((f"dp{len(LIGHTS)}", P(31.4, w_, LOUNGE_CEIL - 0.95), 14.0, WARM, 0.08, None))
    bbox(IN, 28.4, 30.2, 11.9, 12.6, GL, GL + 1.05, "walnut", C["door"], 0.006, 2)
    bbox(IN, 28.3, 30.3, 11.85, 12.7, GL + 1.05, GL + 1.1, "marble_white", 0, 0.006, 2)
    colbox(28.3, 30.3, 11.85, 12.7, GL, GL + 1.1)
    for u_ in (28.8, 29.8): put(bar_stool(), u_, 13.25, GL, (0, -1), colb=(0.22, 0.22, 0.75))
    bottles(IN, 28.4, 30.2, 11.3, GL + 1.6, 3)
    put(K.plant(1.6, 0.26, seed=21, kind="ficus", spread=0.7), 35.0, 12.2, GL, (0, 1), colb=(0.3, 0.3, 1.2))
    art(IN, "w", 11.3, 1, 32.4, 35.2, GL + 1.2, GL + 2.6, code=0)
    # ---------------------------------------------------------------- first floor
    # floor (oak) with the voids; the gallery edge (glass balustrade); walls' inner faces; ceiling at C1
    floor_rect(JU0, JU1, -8.0, JW1, F1, "oak_plank", 0, holes=[(21.0, 27.3, 9.6, 11.3)])
    colbox(JU0, JU1, -8.0, 9.6, F1 - 0.4, F1); colbox(JU0, JU1, 11.3, JW1, F1 - 0.4, F1)
    colbox(JU0, 21.0, 9.6, 11.3, F1 - 0.4, F1); colbox(27.3, JU1, 9.6, 11.3, F1 - 0.4, F1)
    inner_wall("u", JU0, -7.7, JW1, F1, C1, OPEN["front_f1"], 1, UB["u0"] + GLASS_IN)
    inner_wall("u", JU1, -7.7, JW1, F1, C1, OPEN["back_f1"], -1, UB["u1"] - GLASS_IN)
    inner_wall("w", JW1, JU0, JU1, F1, C1, OPEN["side_f1"], -1, UB["w1"] - GLASS_IN)
    for (a, b) in ((JU0, IU0), (IU1, JU1)):
        wall(IN, "w", -7.7, a, b, F1, C1, [], 1, "plaster_white", 0, MI)
        wall(IN, "u", IU0 if a == JU0 else IU1, -8.0, -7.7, F1, C1, [], 1 if a == JU0 else -1, "plaster_white", 0)
    colbox(JU0, IU0, -8.0, -7.7, F1, C1); colbox(IU1, JU1, -8.0, -7.7, F1, C1)
    ceil_rect(JU0, JU1, -7.7, JW1, C1, holes=[]) if False else None
    ceil_rect(JU0, JU1, -8.0, JW1, C1, holes=[(IU0, IU1, -8.0, -7.99)])
    wall(IN, "w", -8.0, IU0, IU1, LIVC, C1, [], 1, "plaster_white", 0, MI)         # the step between the two ceilings (seen from the gallery: facing +w)
    # glass balustrades: the gallery (w -7.95), the stairwell (w 9.6 is the slat screen; its front end u 21)
    for (u0_, u1_, w0_, w1_) in ((IU0, IU1, -7.98, -7.93), (21.0, 21.05, 9.68, 11.0)):
        box(IG, u0_, u1_, w0_, w1_, F1, F1 + 1.05, "glass_window", 0)
        bbox(IN, u0_, u1_, w0_ - 0.01, w1_ + 0.01, F1 + 1.05, F1 + 1.09, "brass", 0, 0.004, 1, False)
        colbox(u0_, u1_, w0_, w1_, F1, F1 + 1.1)
    # rooms: walls (u 30: the landing / bedroom 2, w -5.5 behind bedroom 2, w 11.0 .. 11.3: the master's), doorways
    for (a, b) in ((-5.5, 0.0), (1.2, 11.0)): ibox(29.925, 30.075, a, b, F1, C1, "plaster_white", 0, skip=("-h", "+h"))
    ibox(30.075, JU1, -5.6, -5.45, F1, C1, "plaster_white", 0, skip=("-h", "+h"))
    ibox(JU0, 28.2, 11.0, 11.3, F1, C1, "marble_white", 0, skip=("-h", "+h"))
    ibox(29.4, JU1, 11.0, 11.3, F1, C1, "plaster_white", 0, skip=("-h", "+h"))
    ibox(21.0, 27.3, 11.0, 11.3, C0, F1, "marble_white", 0, skip=("-h", "+h", "+w", "-u", "+u"), col=False)    # the marble through the slab at the stairwell
    for (ax_, c, a0, a1, o, s_) in (("w", 0.0, 29.925, 30.075, 1, None), ("w", 1.2, 29.925, 30.075, -1, None)): pass
    ibox(29.925, 30.075, 0.0, 1.2, F1 + 2.4, C1, "plaster_white", 0, skip=("+h",), col=False)
    ibox(28.2, 29.4, 11.0, 11.3, F1 + 2.4, C1, "plaster_white", 0, skip=("+h",), col=False)
    for (u_, w_) in ((u, w) for u in (15.0, 19.0, 23.0, 27.0, 31.0, 35.0) for w in (-6.8,)):
        downlight(u_, w_, C1, 8.0)
    for (u_, w_) in ((u, w) for u in (15.0, 19.0, 24.0) for w in (-2.0, 4.0)):
        downlight(u_, w_, C1, 9.0)
    for (u_, w_) in ((u, w) for u in (32.5, 35.5) for w in (-2.0, 6.0)):
        downlight(u_, w_, C1, 9.0)
    for (u_, w_) in ((u, w) for u in (15.0, 20.0, 25.0, 30.0, 35.0) for w in (14.5, 20.0)):
        downlight(u_, w_, C1, 9.0)
    downlight(28.6, 8.8, C1, 10.0)
    # the study / library on the mezzanine: a desk to the front window, a chair, two armchairs on a rug, shelves
    put(desk_modern(2.2, 0.8), 13.6, 2.5, F1, (1, 0), colb=(0.4, 1.1, 0.76))
    put(lounge_chair(), 14.7, 2.5, F1, (-1, 0), colb=(0.4, 0.4, 0.8))
    for w_ in (-3.0, 0.0):
        put(lounge_chair(), 20.0, w_, F1, (1, 0) if w_ < 0 else (1, 0), colb=(0.45, 0.45, 0.8))
    put([(K.box(3.0, 0.012, 4.0, 0.004, 1), "fabric_grey", C["rug"])], 21.0, -1.5, F1, (0, 1), smooth=False)
    put(coffee_table_stone(1.0, 1.0), 21.4, -1.5, F1, (0, 1), colb=(0.5, 0.5, 0.38))
    bbox(IN, JU0, JU0 + 0.4, -7.6, -6.4, F1, F1 + 2.4, "walnut", C["door"], 0.006, 2)
    colbox(JU0, JU0 + 0.4, -7.6, -6.4, F1, F1 + 2.4)
    # bedroom 2 (back): a bed to the glass
    put(bed_modern(1.8), 33.0, -1.6, F1, (1, 0), colb=(1.1, 1.0, 0.6))
    # the master suite: a king bed to the back glass, a walnut headboard wall, bedsides, a lounge chair, a rug
    bbox(IN, 29.0, 29.25, 13.2, 21.6, F1, F1 + 1.5, "walnut", C["door"], 0.006, 2)
    colbox(29.0, 29.25, 13.2, 21.6, F1, F1 + 1.5)
    put(bed_modern(2.0), 30.45, 17.4, F1, (1, 0), colb=(1.15, 1.1, 0.6))
    for w_ in (15.6, 19.2):
        bbox(IN, 29.3, 29.8, w_ - 0.3, w_ + 0.3, F1, F1 + 0.5, "walnut", C["door"], 0.006, 2)
    put([(K.box(4.0, 0.012, 3.2, 0.004, 1), "fabric_grey", C["rug"])], 31.2, 17.4, F1, (1, 0), smooth=False)
    put(lounge_chair(), 35.8, 21.6, F1, (-1, -1), colb=(0.45, 0.45, 0.8))
    # round 2: THE BATHROOM (u 12.3 .. 20.5, a partition with a doorway by the marble wall): stone floor, a freestanding
    # tub, a double basin on a walnut vanity with a mirror, a towel ladder, a plant
    ibox(20.4, 20.6, 13.3, JW1, F1, C1, "plaster_white", 0, skip=("-h", "+h"))
    ibox(20.4, 20.6, 11.3, 12.1, F1, C1, "plaster_white", 0, skip=("-h", "+h"))
    ibox(20.4, 20.6, 12.1, 13.3, F1 + 2.4, C1, "plaster_white", 0, skip=("+h",), col=False)
    bbox(IN, JU0, 20.4, 11.3, JW1, F1, F1 + 0.012, "stone_floor", 0, 0.002, 1)
    put([(K.lathe([(0.0, 0.0), (0.88, 0.0), (0.97, 0.08), (1.0, 0.56), (0.97, 0.6), (0.9, 0.6), (0.86, 0.16), (0.0, 0.14)], seg=36, sx=0.86, sz=0.42), "ceramic_white", 0)],
        16.4, 17.3, F1 + 0.012, (1, 0), smooth=True, colb=(0.86, 0.42, 0.6))
    bbox(IN, 13.0, 13.04, 16.6, 16.64, F1, F1 + 0.95, "brass", 0, 0.004, 1)
    bbox(IN, 13.0, 15.2, 22.55, JW1, F1 + 0.3, F1 + 0.85, "walnut", C["door"], 0.006, 2)
    bbox(IN, 12.95, 15.25, 22.5, JW1, F1 + 0.85, F1 + 0.9, "marble_white", 0, 0.004, 1)
    colbox(12.95, 15.25, 22.5, JW1, F1, F1 + 0.9)
    for u_ in (13.55, 14.65):
        put([(K.lathe([(0.0, 0.0), (0.17, 0.005), (0.2, 0.12), (0.185, 0.125), (0.15, 0.03), (0.0, 0.03)], seg=28), "ceramic_white", 0)], u_, 22.86, F1 + 0.9, (0, -1))
        bbox(IN, u_ - 0.015, u_ + 0.015, 23.0, JW1, F1 + 0.9, F1 + 1.2, "brass", 0, 0.004, 1)
        bbox(IN, u_ - 0.011, u_ + 0.011, 22.95, 23.0, F1 + 1.165, F1 + 1.19, "brass", 0, 0.003, 1)
    bbox(IN, 12.9, 15.3, JW1 - 0.03, JW1, F1 + 1.3, F1 + 2.4, "metal_black", C["screen"], 0.004, 1, False)
    led_strip(P(12.95, JW1 - 0.06, F1 + 2.43), P(15.25, JW1 - 0.06, F1 + 2.43), normal=(0, 0, -1), width=0.03)
    LIGHTS.append(("vanity", P(14.1, JW1 - 0.3, F1 + 2.3), 12.0, WARM, 0.15, None))
    for (u_, w_) in ((14.2, 19.0), (17.5, 19.0), (14.2, 14.0), (17.5, 14.0)): downlight(u_, w_, C1, 8.0)
    put(K.plant(1.4, 0.24, seed=23, kind="ficus", spread=0.6), 19.7, 22.5, F1, (0, 1), colb=(0.3, 0.3, 1.1))
    # the bed set: cushions, a folded throw, a leather bench at its foot, lamps on the bedsides, art
    for (w_, f) in ((16.7, (1, 0)), (17.4, (1, 0)), (18.1, (1, 0))): cushion(30.15, w_, F1 + 0.8, f)
    put([(K.soft(2.1, 0.05, 0.55, r=0.02, n=(8, 2, 4), puff=0.01, seed=9, oy=0.62), "leather", 0)], 31.6, 17.4, F1, (1, 0))
    put([(K.soft(0.45, 0.42, 1.5, r=0.05, n=(3, 4, 7), puff=0.01, oy=0.02), "leather", 0)], 32.9, 17.4, F1, (0, 1), colb=(0.23, 0.75, 0.42))
    for w_ in (15.6, 19.2): table_lamp(29.55, w_, F1 + 0.5)
    art(IN, "w", 11.3, 1, 31.0, 33.6, F1 + 1.0, F1 + 2.4, code=2)
    put(K.plant(1.4, 0.24, seed=29, kind="ficus", spread=0.6), 36.4, -6.8, F1, (0, 1), colb=(0.3, 0.3, 1.1))
    # the pool's floor and its entry steps (the walker's), the water's own shader draws it
    p = POOL
    colbox(p["u0"], p["u1"], p["w0"], p["w1"], p["floor"] - 0.3, p["floor"])
    for k in range(4):
        colbox(p["u0"], p["u1"], p["w1"] - 1.2 - 0.0, p["w1"], p["floor"], GL - 0.2 - k * 0.0 - (3 - k) * 0.28) if False else None
        colbox(p["u0"] + 0.0, p["u0"] + 1.6, p["w1"] - (k + 1) * 0.35, p["w1"] - k * 0.35, p["floor"], GL - 0.3 - k * 0.27)

# ------------------------------------------------------------------------------------------------ interior pieces
def _ab(acc, axis, a0, a1, d0, d1, h0, h1, slot, code=0, bevel=0.004, seg=1):
    """a block given along a wall plane: a (along), d (out from the wall, either order), h"""
    d0, d1 = min(d0, d1), max(d0, d1)
    if bevel <= 0:          # (books: a plain block, its bottom on the board left out: 10 triangles)
        if axis == "u": box(acc, d0, d1, a0, a1, h0, h1, slot, code, skip=("-h",))
        else: box(acc, a0, a1, d0, d1, h0, h1, slot, code, skip=("-h",))
        return
    if axis == "u": bbox(acc, d0, d1, a0, a1, h0, h1, slot, code, bevel, seg, False)
    else: bbox(acc, a0, a1, d0, d1, h0, h1, slot, code, bevel, seg, False)

def art(acc, axis, c, out, a0, a1, h0, h1, code=0):
    """a canvas on a wall (the plane axis = c, facing out): 4 cm deep, a thin black float frame; the painting is the
    `art` slot's TSL (a palette per code), never a texture"""
    _ab(acc, axis, a0 - 0.02, a1 + 0.02, c, c + out * 0.035, h0 - 0.02, h1 + 0.02, "metal_black", 0, 0.003, 1)
    _ab(acc, axis, a0, a1, c + out * 0.01, c + out * 0.045, h0, h1, "art", code, 0.004, 1)

def shelves(acc, axis, c, out, a0, a1, h0, h1, seed=0, depth=0.26):
    """open walnut shelves on a wall: boards every ~0.38 m, uprights every ~0.9 m, books (the `books` slot, a colour
    per code) in runs with gaps, a few ceramic vases and boxes"""
    rnd = random.Random(seed)
    n = max(1, round((a1 - a0) / 0.9)); hs = []; h = h0
    while h < h1 - 0.1: hs.append(h); h += 0.38
    for k in range(n + 1):
        x = a0 + (a1 - a0) * k / n
        _ab(acc, axis, x - 0.015, x + 0.015, c + out * 0.002, c + out * depth, h0 - 0.35, h1, "walnut", 0, 0.003, 1)
    for hb in hs:                           # (boards 1 cm shallower than the uprights: no shared front plane)
        _ab(acc, axis, a0, a1, c + out * 0.004, c + out * (depth - 0.01), hb - 0.03, hb, "walnut", 0, 0.003, 1)
    for k in range(n):
        xa, xb = a0 + (a1 - a0) * k / n + 0.03, a0 + (a1 - a0) * (k + 1) / n - 0.03
        for hb in hs:
            if hb + 0.32 > h1: continue
            x = xa
            if rnd.random() < 0.22:          # a vase / an object instead of books
                xm = (xa + xb) / 2 + rnd.uniform(-0.2, 0.2)
                vase(axis, c + out * depth / 2, xm, hb, rnd)
                continue
            while x < xb - 0.05:
                wd = rnd.uniform(0.022, 0.055); ht = rnd.uniform(0.18, 0.3)
                if rnd.random() < 0.08: x += rnd.uniform(0.05, 0.15); continue
                if x + wd > xb: break
                _ab(acc, axis, x, x + wd, c + out * 0.02, c + out * (0.02 + rnd.uniform(0.15, 0.2)), hb, hb + ht, "books", rnd.randrange(8), 0.0, 1)
                x += wd + 0.002

def vase(axis, d, a, h, rnd):
    u_, w_ = (d, a) if axis == "u" else (a, d)
    hh = rnd.uniform(0.16, 0.28)
    put([(K.lathe([(0.0, 0.0), (0.05, 0.0), (0.075, hh * 0.35), (0.045, hh * 0.85), (0.035, hh), (0.0, hh)], seg=16), "ceramic_white", 0)], u_, w_, h, (0, 1))

def bottles(acc, u0, u1, w, h, rows):
    """the bar's back shelves on the wall w (facing +w): walnut boards, bottles (the `books` slot's dark glass codes)"""
    rnd = random.Random(5)
    for r in range(rows):
        hb = h + r * 0.4
        bbox(acc, u0, u1, w, w + 0.24, hb - 0.03, hb, "walnut", 0, 0.003, 1, False)
        u_ = u0 + 0.12
        while u_ < u1 - 0.1:
            ht = rnd.uniform(0.24, 0.32)
            put([(K.lathe([(0.0, 0.0), (0.038, 0.0), (0.04, ht * 0.62), (0.014, ht * 0.8), (0.012, ht), (0.0, ht)], seg=12), "books", 6 + rnd.randrange(2))], u_, w + 0.12, hb, (0, 1))
            u_ += rnd.uniform(0.1, 0.16)

def credenza(acc, axis, c, out, a0, a1, depth, hgt):
    _ab(acc, axis, a0, a1, c, c + out * depth, GL + 0.1, GL + hgt, "walnut", C["door"], 0.006, 2)
    for x in (a0 + 0.1, a1 - 0.12): _ab(acc, axis, x, x + 0.03, c + out * 0.05, c + out * (depth - 0.05), GL, GL + 0.1, "metal_black", 0, 0.003, 1)
    rnd = random.Random(int(a0 * 10))
    x = a0 + 0.4
    for k in range(5):
        wd = rnd.uniform(0.22, 0.3)
        for j in range(rnd.randrange(2, 5)):
            _ab(acc, axis, x, x + wd, c + out * 0.08, c + out * 0.3, GL + hgt + j * 0.035, GL + hgt + (j + 1) * 0.035 - 0.003, "books", rnd.randrange(8), 0.0, 1)
        x += wd + 0.5
        vase(axis, c + out * depth / 2, x, GL + hgt, rnd); x += 0.6
    if axis == "u": colbox(c, c + out * depth, a0, a1, GL, GL + hgt) if out > 0 else colbox(c + out * depth, c, a0, a1, GL, GL + hgt)
    else: colbox(a0, a1, min(c, c + out * depth), max(c, c + out * depth), GL, GL + hgt)

def planter(u, w, h, plant_h, seed):
    """a big plant in a cylindrical stone planter"""
    put([(K.lathe([(0.0, 0.0), (0.3, 0.0), (0.32, 0.02), (0.32, 0.55), (0.29, 0.55), (0.29, 0.5), (0.0, 0.5)], seg=28), "ceramic_white", 0)], u, w, h, (0, 1), colb=(0.32, 0.32, 0.55))
    put(K.plant(plant_h, 0.28, seed=seed, kind="ficus", spread=plant_h * 0.42), u, w, h + 0.5, (0, 1))

def cushion(u, w, h, face):
    put([(K.soft(0.48, 0.46, 0.14, r=0.07, n=(5, 5, 3), puff_side=0.03, seed=int(u * 13 + w * 7), oy=-0.23), "fabric_grey" if int(u * 10) % 3 else "leather", 0)],
        u, w, h, face)

def side_table(u, w, h):
    put([(K.lathe([(0.0, 0.0), (0.24, 0.0), (0.24, 0.5), (0.0, 0.5)], seg=28), "marble_white", 0)], u, w, h, (0, 1), colb=(0.24, 0.24, 0.5))

def table_lamp(u, w, h):
    put([(K.lathe([(0.0, 0.0), (0.08, 0.0), (0.06, 0.05), (0.02, 0.08), (0.02, 0.34), (0.0, 0.34)], seg=18), "brass", 0),
         (K.xform(K.lathe([(0.16, 0.0), (0.12, 0.22), (0.0, 0.22)], seg=24, cap_top=True), K.T(0, 0.3, 0)), "glow", C["led"])], u, w, h, (0, 1))
    LIGHTS.append((f"tl{len(LIGHTS)}", P(u, w, h + 0.42), 10.0, WARM, 0.1, None))

def channel_sofa(w, seats):
    """the channel-tufted sofa: a low plinth, a deep seat, a back of vertical channels (rounded tubes), slim arms"""
    P_ = []
    d = 1.0
    P_.append((K.soft(w, 0.22, d, r=0.03, n=(10, 3, 6), oy=0.06), "fabric_white", 0))
    for sx in (-1, 1):
        P_.append((K.xform(K.soft(0.2, 0.42, d, r=0.07, n=(3, 6, 8), puff_side=0.01, oy=0.24), K.T(sx * (w / 2 - 0.1))), "fabric_white", 0))
    inner = w - 0.4
    for i in range(seats):
        x = -inner / 2 + inner / seats * (i + 0.5)
        P_.append((K.xform(K.soft(inner / seats - 0.01, 0.16, d - 0.28, r=0.06, n=(6, 3, 6), puff=0.02, sag=0.006, seed=i, oy=0.28), K.T(x, 0, 0.12)), "fabric_white", 0))
    nc = max(6, int(inner / 0.2))
    for i in range(nc):
        x = -inner / 2 + inner / nc * (i + 0.5)
        P_.append((K.xform(K.soft(inner / nc - 0.006, 0.5, 0.2, r=0.08, n=(3, 4, 3), puff_side=0.012, seed=40 + i, oy=0.36), K.T(x, 0, -d / 2 + 0.12, rx=-6)), "fabric_white", C["channel"]))
    for sx in (-1, 1):
        P_.append((K.xform(K.box(0.05, 0.06, d - 0.1, 0.008), K.T(sx * (w / 2 - 0.2), 0, 0)), "metal_black", 0))
    return P_

def coffee_table_stone(w, d):
    return [(K.box(w, 0.32, d, bevel=0.03, seg=3, oy=0.04), "marble_white", 0), (K.box(w - 0.2, 0.04, d - 0.2, bevel=0.004, seg=1), "metal_black", 0)]

def lounge_chair():
    P_ = [(K.soft(0.82, 0.18, 0.86, r=0.04, n=(5, 3, 5), oy=0.2), "fabric_grey", 0)]
    back = K.soft(0.8, 0.5, 0.16, r=0.06, n=(6, 6, 3), puff_side=0.01)
    K.xform(back, K.T(0, 0.36, -0.36, rx=-12)); P_.append((back, "fabric_grey", 0))
    P_.append((K.xform(K.soft(0.7, 0.12, 0.62, r=0.05, n=(5, 3, 5), puff=0.02, sag=0.006, oy=0.36), K.T(0, 0, 0.06)), "fabric_grey", 0))
    for sx in (-1, 1):
        P_.append((K.xform(K.box(0.04, 0.5, 0.8, 0.006), K.T(sx * 0.41, 0, 0)), "walnut", 0))
    return P_

def bar_stool():
    return [(K.lathe([(0.0, 0.0), (0.2, 0.0), (0.2, 0.015), (0.03, 0.03), (0.025, 0.66), (0.0, 0.66)], seg=20), "metal_black", 0),
            (K.soft(0.42, 0.08, 0.38, r=0.035, n=(4, 2, 4), puff=0.01, oy=0.66), "leather", 0),
            (K.xform(K.soft(0.38, 0.2, 0.06, r=0.025, n=(4, 3, 2), oy=0.74), K.T(0, 0, -0.17)), "leather", 0)]

def dining_table(w, d):
    P_ = [(K.box(w, 0.06, d, bevel=0.012, seg=2, oy=0.70), "walnut", 0)]
    for sx in (-1, 1):
        P_.append((K.xform(K.box(0.1, 0.70, d - 0.25, bevel=0.01, seg=2), K.T(sx * (w / 2 - 0.4), 0, 0)), "metal_black", 0))
    return P_

def dining_chair():
    P_ = [(K.soft(0.48, 0.07, 0.48, r=0.03, n=(4, 2, 4), puff=0.008, oy=0.44), "leather", 0),
          (K.xform(K.soft(0.46, 0.34, 0.05, r=0.025, n=(4, 4, 2)), K.T(0, 0.52, -0.22, rx=-8)), "leather", 0)]
    for sx in (-1, 1):
        for sz in (-1, 1):
            P_.append((K.xform(K.box(0.03, 0.44, 0.03, 0.004), K.T(sx * 0.2, 0, sz * 0.2)), "walnut", 0))
    return P_

def pendant_globe():
    return [(K.lathe([(0.004, 0.0), (0.004, -0.75)], seg=6, cap_top=False), "metal_black", 0),
            (K.xform(K.lathe([(0.0, -0.12), (0.11, -0.1), (0.15, 0.0), (0.11, 0.1), (0.0, 0.12)], seg=20), K.T(0, -0.9, 0)), "glow", C["led"])]

def floor_lamp_arc():
    P_ = [(K.box(0.4, 0.06, 0.4, 0.01), "marble_white", 0)]
    pts = [(0.0, 0.06 + 0.0, 0.0)] + [(-math.sin(t) * 1.8 * 0.55, 0.06 + math.sin(t * 1.0) * 1.9 + (1 - math.cos(t)) * 0.0, 0.0) for t in [k * 0.16 for k in range(1, 10)]]
    for a, b in zip(pts, pts[1:]):
        A_, B_ = Vector(a), Vector(b); L = (B_ - A_).length
        seg = K.lathe([(0.012, 0.0), (0.012, L)], seg=8, cap_top=False)
        dirv = (B_ - A_).normalized(); q = Vector((0, 1, 0)).rotation_difference(dirv)
        P_.append((K.xform(seg, Matrix.Translation(A_) @ q.to_matrix().to_4x4()), "metal_black", 0))
    P_.append((K.xform(K.lathe([(0.02, 0.0), (0.22, -0.18), (0.22, -0.2), (0.0, -0.05)], seg=22, cap_top=False), K.T(pts[-1][0], pts[-1][1], 0)), "brass", 0))
    return P_

def desk_modern(w, d):
    return [(K.box(w, 0.04, d, bevel=0.008, seg=2, oy=0.72), "walnut", 0),
            (K.xform(K.box(0.04, 0.72, d - 0.1, 0.006), K.T(-w / 2 + 0.1, 0, 0)), "metal_black", 0),
            (K.xform(K.box(0.04, 0.72, d - 0.1, 0.006), K.T(w / 2 - 0.1, 0, 0)), "metal_black", 0),
            (K.xform(K.box(0.5, 0.32, 0.03, 0.004), K.T(0.3, 0.76, -0.2)), "metal_black", C["screen"])]

def bed_modern(w):
    l = 2.15
    return [(K.box(w + 0.2, 0.26, l + 0.1, bevel=0.02, seg=2, oy=0.06), "walnut", 0),
            (K.soft(w, 0.24, l - 0.05, r=0.05, n=(8, 3, 10), puff=0.01, oy=0.32), "fabric_white", 0),
            (K.xform(K.soft(w + 0.02, 0.06, l * 0.6, r=0.03, n=(8, 2, 8), puff=0.02, seed=3, oy=0.56), K.T(0, 0, 0.35)), "fabric_grey", 0),
            (K.xform(K.soft(w / 2 - 0.08, 0.14, 0.42, r=0.06, n=(5, 3, 4), puff=0.03, seed=5, oy=0.56), K.T(-w / 4, 0, -l / 2 + 0.3)), "fabric_white", 0),
            (K.xform(K.soft(w / 2 - 0.08, 0.14, 0.42, r=0.06, n=(5, 3, 4), puff=0.03, seed=6, oy=0.56), K.T(w / 4, 0, -l / 2 + 0.3)), "fabric_white", 0)]

interior()
print(f"interior: {len(IN.f)} faces, glass {len(IG.f)}, collider {len(COL) // 3} tris, {len(LIGHTS)} lamps ({time.time() - T0:.1f}s)")

# ================================================================================================ meshes
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
def materials(slots):
    out = []
    for name in slots:
        m = bpy.data.materials.get(name) or bpy.data.materials.new(name)
        m.use_nodes = True; out.append(m)
    return out
EXT_M = materials(EXT_SLOTS); INT_M = materials(INT_SLOTS)

def make(acc, mats, origin=None, link=True):
    me = bpy.data.meshes.new(acc.name)
    vs = [tuple(v - origin) if origin is not None else tuple(v) for v in acc.v]
    me.from_pydata(vs, [], acc.f)
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set("material_index", acc.fs)
    me.polygons.foreach_set("use_smooth", acc.sm)
    uv = me.uv_layers.new(name="UVMap")
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    li = 0
    uvd = []; cold = []
    for fi, f in enumerate(acc.f):
        for k in range(len(f)):
            uvd.extend(acc.fuv[fi][k]); cold.extend(((acc.fc[fi] + 0.5) / 16.0, 1.0, 0.5, 1.0))
    uv.data.foreach_set("uv", uvd); col.data.foreach_set("color", cold)
    me.validate(clean_customdata=False); me.update()
    o = bpy.data.objects.new(acc.name, me)
    if origin is not None: o.location = origin
    if link: scn.collection.objects.link(o)
    return o

EX.v += GLS.v and []
# the exterior glass into LOD0 (same object, its own slot)
off = len(EX.v)
EX.v.extend(GLS.v); EX.f.extend([tuple(i + off for i in f) for f in GLS.f]); EX.fs.extend(GLS.fs); EX.fc.extend(GLS.fc); EX.fuv.extend(GLS.fuv); EX.sm.extend(GLS.sm)
ob_ext = make(EX, EXT_M); ob_far = make(FAR, EXT_M); ob_ivy = make(IVY, EXT_M); ob_lod1 = make(L1, EXT_M); ob_bay = make(BAY, EXT_M)
ob_gl = make(GATE_L, EXT_M, GATE_L_O); ob_gr = make(GATE_R, EXT_M, GATE_R_O); ob_door = make(DOOR_A, EXT_M, DOOR_O); ob_water = make(WATER, EXT_M)
# the soft furnishings (cushions, rugs, leather, plants: smooth-shaded) in their own node "Soft": the audit checks them
# without the streak / bentflat checks (those guard architecture: a cushion's normals turn round its rounded edges by design)
SOFT = Acc("Soft", INT_SLOTS); HARD = Acc("Cell", INT_SLOTS)
SOFT_IDX = {INT_SLOTS.index(n) for n in ("fabric_white", "fabric_grey", "leather", "plant", "ceramic_white")}
for fi, f in enumerate(IN.f):
    A_ = SOFT if IN.fs[fi] in SOFT_IDX else HARD
    b = len(A_.v); A_.v.extend(IN.v[i] for i in f); A_.f.append(tuple(range(b, b + len(f))))
    A_.fs.append(IN.fs[fi]); A_.fc.append(IN.fc[fi]); A_.fuv.append(IN.fuv[fi]); A_.sm.append(IN.sm[fi])
ob_cell = make(HARD, INT_M); ob_soft = make(SOFT, INT_M); ob_iglass = make(IG, INT_M)
cm = bpy.data.meshes.new("Collider")
cm.from_pydata([tuple(v) for v in COL], [], [(i, i + 1, i + 2) for i in range(0, len(COL), 3)]); cm.update()
ob_col = bpy.data.objects.new("Collider", cm); scn.collection.objects.link(ob_col); cm.materials.append(bpy.data.materials.new("collider"))
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
print(f"meshes: LOD0 {tri(ob_ext)} tris, LOD1 {tri(ob_lod1)}, far {tri(ob_far)}, gate {tri(ob_gl) + tri(ob_gr)}, door {tri(ob_door)}, cell {tri(ob_cell)} + soft {tri(ob_soft)}, glass {tri(ob_iglass)} ({time.time() - T0:.1f}s)")

def weld(objs):
    """merge the builder's duplicate corners (1e-4 m), then WEIGHTED NORMALS on the smooth (soft) faces: face-area
    weighting keeps a cushion's flat top / side exact (no normal bent into a planar region: mesh_audit bentflat), the
    flat faces keep their own normals (sharp)"""
    for o in objs:
        bm = bmesh.new(); bm.from_mesh(o.data); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.to_mesh(o.data); bm.free(); o.data.update()
        if any(p.use_smooth for p in o.data.polygons):
            for x in scn.objects: x.select_set(False)
            o.select_set(True); bpy.context.view_layer.objects.active = o
            md = o.modifiers.new("wn", "WEIGHTED_NORMAL"); md.mode = "FACE_AREA"; md.weight = 100; md.keep_sharp = True; md.thresh = 0.01
            bpy.ops.object.modifier_apply(modifier="wn")

# ================================================================================================ bake
import numpy as np
SUN_DIR = Vector((0.62, 0.35, 0.70)).normalized()      # (u, w, up): a late-afternoon sun from the plot's back (WSW)
sun_b = Vector((SUN_DIR.x, -SUN_DIR.y, SUN_DIR.z))      # Blender
PROBES = [(18.0, -18.0, GL + 1.2), (26.0, -16.5, GL + 0.9), (33.0, -12.0, GL + 1.2), (26.0, -2.0, GL + 1.2), (33.0, 2.0, GL + 1.2),
          (17.0, 7.5, GL + 1.2), (30.0, 7.5, GL + 1.2), (19.0, 17.0, GL + 1.2), (30.0, 17.0, GL + 1.2), (24.0, 10.4, GL + 2.6),
          (17.0, -6.5, F1 + 1.2), (30.0, -6.5, F1 + 1.2), (18.0, 3.0, F1 + 1.2), (33.0, 3.0, F1 + 1.2), (28.6, 5.0, F1 + 1.2),
          (18.0, 17.0, F1 + 1.2), (32.0, 17.0, F1 + 1.2)]
probe_data = []
if BAKE:
    scn.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "OPTIX"; prefs.get_devices()
        ok = False
        for d in prefs.devices: d.use = d.type == "OPTIX"; ok = ok or d.use
        scn.cycles.device = "GPU" if ok else "CPU"
    except Exception as e:
        print("GPU unavailable:", e); scn.cycles.device = "CPU"
    print("bake device", scn.cycles.device)
    if scn.cycles.device != "GPU": raise SystemExit("OptiX required (memory blender-gpu-optix): no CPU bake")
    # bake materials: everything a light grey diffuse (no colour baked), glass clear, glow emissive (night)
    def diffuse(name, c=0.62):
        m = bpy.data.materials.new(name); m.use_nodes = True
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (c, c, c, 1)
        m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        return m
    occ = diffuse("occ", 0.6); occ_dark = diffuse("occ_dark", 0.3); occ_hedge = diffuse("occ_hedge", 0.12)
    clear = bpy.data.materials.new("clear"); clear.use_nodes = True
    nt = clear.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"]); tb = nt.nodes.new("ShaderNodeBsdfTransparent")
    nt.links.new(tb.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    glow = bpy.data.materials.new("glowbake"); glow.use_nodes = True
    nt = glow.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"]); em = nt.nodes.new("ShaderNodeEmission")
    em.inputs["Color"].default_value = (1.0, 0.8, 0.55, 1); em.inputs["Strength"].default_value = 0.0
    nt.links.new(em.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    for o in (ob_ext, ob_far, ob_lod1, ob_bay, ob_gl, ob_gr, ob_door, ob_water, ob_ivy, ob_cell, ob_soft, ob_iglass):
        me = o.data
        for i, mt in enumerate(me.materials):
            nm = mt.name
            me.materials[i] = clear if nm.startswith("glass") or nm == "pool_water" else glow if nm.startswith("glow") else \
                occ_dark if nm in ("wood_cladding", "metal_dark", "walnut", "metal_black") else occ_hedge if nm == "hedge" else occ
    ob_col.hide_render = True
    # the city's ground (the 0.5 m grid, every 1 m) and the neighbours (prisms) as occluders
    gm = bpy.data.meshes.new("Ground"); vs = []; fs = []
    us = [GR["u0"] + k for k in range(int(GR["u1"] - GR["u0"]) + 1)]; ws = [GR["w0"] + k for k in range(int(GR["w1"] - GR["w0"]) + 1)]
    for w in ws:
        for u in us: vs.append(tuple(P(u, w, ground(u, w))))
    nu_ = len(us)
    for j in range(len(ws) - 1):
        for i in range(nu_ - 1):
            fs.append((j * nu_ + i, j * nu_ + i + 1, (j + 1) * nu_ + i + 1, (j + 1) * nu_ + i))
    gm.from_pydata(vs, [], fs); gm.update()
    for pl in gm.polygons:
        if pl.normal.z < 0: pl.flip()
    gm.update()
    ob_ground = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(ob_ground); gm.materials.append(diffuse("lawn", 0.25))
    nb = bpy.data.meshes.new("Neighbours"); vs = []; fs = []
    for b in SITE["neighbours"]:
        r = b["ring"]; n_ = len(r); i0 = len(vs)
        for (u, w) in r: vs.append(tuple(P(u, w, b["base"] - 1))); vs.append(tuple(P(u, w, b["top"])))
        for i in range(n_):
            j = (i + 1) % n_; fs.append((i0 + 2 * i, i0 + 2 * j, i0 + 2 * j + 1, i0 + 2 * i + 1))
        fs.append(tuple(i0 + 2 * i + 1 for i in range(n_)))
    nb.from_pydata(vs, [], fs); nb.update(); ob_nb = bpy.data.objects.new("Neighbours", nb); scn.collection.objects.link(ob_nb); nb.materials.append(occ)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.use_nodes = True
    wbg = scn.world.node_tree.nodes["Background"]
    scn.cycles.samples = SAMPLES; scn.cycles.max_bounces = 6; scn.cycles.diffuse_bounces = 4
    scn.world.light_settings.distance = 2.5
    # ---- exterior AO per vertex (LOD0 alone, then the far variant alone; the gate and the door with LOD0)
    def bake_vc(objs, attr, kind, **kw):
        for o in objs:
            if attr not in o.data.color_attributes: o.data.color_attributes.new(attr, "FLOAT_COLOR", "CORNER")
        for o in scn.objects: o.select_set(False)
        for o in objs:
            o.select_set(True); o.data.color_attributes.active_color = o.data.color_attributes[attr]
        bpy.context.view_layer.objects.active = objs[0]
        bpy.ops.object.bake(type=kind, target="VERTEX_COLORS", **kw)
    wbg.inputs["Color"].default_value = (1, 1, 1, 1); wbg.inputs["Strength"].default_value = 1.0
    t = time.time()
    hide = lambda objs, v: [setattr(o, "hide_render", v) for o in objs]
    hide([ob_cell, ob_soft, ob_iglass, ob_far, ob_lod1], True)
    scn.cycles.samples = min(SAMPLES, 128)
    bake_vc([ob_ext, ob_bay, ob_gl, ob_gr, ob_door], "ao", "AO")
    hide([ob_far], False); hide([ob_ext, ob_bay, ob_gl, ob_gr, ob_door], True)
    bake_vc([ob_far], "ao", "AO")
    hide([ob_far], True); hide([ob_lod1], False)            # (villa2: the scripted LOD1 baked alone, as the far variant)
    bake_vc([ob_lod1], "ao", "AO")
    hide([ob_ext, ob_bay, ob_gl, ob_gr, ob_door, ob_cell, ob_soft, ob_iglass], False); hide([ob_far, ob_lod1], True)
    print(f"bake AO: {time.time() - t:.1f}s")
    def smooth_corners(me, name, iters=8):
        """per-corner bake noise -> one value per (vertex, shading normal), then Laplacian passes over the faces' corners
        (tools/blender/stalle_interior.py: corners of a face share its normal, light does not bleed round sharp edges)"""
        ca = me.color_attributes[name]; n = len(me.loops)
        d = np.zeros(n * 4, dtype=np.float32); ca.data.foreach_get("color", d); val = d.reshape(-1, 4).astype(np.float64)
        keys = np.zeros(n, dtype=np.int64); kmap = {}
        cnor = me.corner_normals
        lv = np.zeros(n, dtype=np.int64); me.loops.foreach_get("vertex_index", lv)
        for li in range(n):
            v_ = cnor[li].vector
            keys[li] = kmap.setdefault((int(lv[li]), round(v_.x * 20), round(v_.y * 20), round(v_.z * 20)), len(kmap))
        K_ = len(kmap)
        acc = np.zeros((K_, 4)); cnt = np.bincount(keys, minlength=K_).astype(np.float64)[:, None]
        np.add.at(acc, keys, val); kv = acc / np.maximum(cnt, 1)
        pa, pb = [], []
        for f in me.polygons:
            ks = [keys[li] for li in f.loop_indices]
            for i in range(len(ks)):
                pa.append(ks[i]); pb.append(ks[(i + 1) % len(ks)]); pa.append(ks[(i + 1) % len(ks)]); pb.append(ks[i])
        pa = np.array(pa); pb = np.array(pb)
        deg = np.bincount(pa, minlength=K_).astype(np.float64)[:, None]
        for _ in range(iters):
            nb_ = np.zeros_like(kv); np.add.at(nb_, pa, kv[pb])
            kv = np.where(deg > 0, 0.5 * kv + 0.5 * nb_ / np.maximum(deg, 1), kv)
        ca.data.foreach_set("color", kv[keys].astype(np.float32).ravel())
    # weld duplicates for the AO smoothing (the builder emits every face with its own corners)
    weld([ob_ext, ob_far, ob_lod1, ob_bay, ob_gl, ob_gr, ob_door, ob_cell, ob_soft])
    for o in (ob_ext, ob_far, ob_lod1, ob_bay, ob_gl, ob_gr, ob_door):
        me = o.data
        smooth_corners(me, "ao", 3)
        a = np.zeros(len(me.loops) * 4, dtype=np.float32); me.color_attributes["ao"].data.foreach_get("color", a)
        c = np.zeros(len(me.loops) * 4, dtype=np.float32); me.color_attributes["Col"].data.foreach_get("color", c)
        c = c.reshape(-1, 4); c[:, 1] = np.clip(a.reshape(-1, 4)[:, 0], 0.0, 1.0)
        me.color_attributes["Col"].data.foreach_set("color", c.ravel())
        me.color_attributes.remove(me.color_attributes["ao"])
    # ---- the interior: sky, sun, night per corner + the probe cubes
    lamps = []
    for (name, p, watts, colour, radius, aim) in LIGHTS:
        ld = bpy.data.lights.new(name, "SPOT" if aim else "POINT"); ld.energy = watts; ld.color = colour; ld.shadow_soft_size = radius
        if aim: ld.spot_size = math.radians(70); ld.spot_blend = 0.5
        lo = bpy.data.objects.new(name, ld); lo.location = p; scn.collection.objects.link(lo); lamps.append(lo)
        if aim: lo.rotation_euler = (aim - p).to_track_quat("-Z", "Y").to_euler()
    sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 4.5; sd.angle = math.radians(0.6); sd.color = (1.0, 0.93, 0.82)
    so = bpy.data.objects.new("sun", sd); scn.collection.objects.link(so)
    so.rotation_euler = (-sun_b).to_track_quat("-Z", "Y").to_euler()
    def set_mode(mode):
        for lo in lamps: lo.hide_render = mode != "night"
        so.hide_render = mode != "sun"
        em.inputs["Strength"].default_value = 6.0 if mode == "night" else 0.0
        nt_ = scn.world.node_tree
        for n_ in list(nt_.nodes):
            if n_.type in ("TEX_COORD", "SEPXYZ", "SEPARATE_XYZ", "MAP_RANGE", "VALTORGB"): nt_.nodes.remove(n_)
        if mode == "sky":
            tc = nt_.nodes.new("ShaderNodeTexCoord"); sep = nt_.nodes.new("ShaderNodeSeparateXYZ"); mr = nt_.nodes.new("ShaderNodeMapRange"); ramp = nt_.nodes.new("ShaderNodeValToRGB")
            nt_.links.new(tc.outputs["Normal"], sep.inputs[0])
            mr.inputs["From Min"].default_value = -0.1; mr.inputs["From Max"].default_value = 1.0
            nt_.links.new(sep.outputs["Z"], mr.inputs["Value"]); nt_.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
            ramp.color_ramp.elements[0].color = (1.05, 1.04, 1.0, 1); ramp.color_ramp.elements[1].color = (0.55, 0.68, 0.95, 1)
            nt_.links.new(ramp.outputs["Color"], wbg.inputs["Color"]); wbg.inputs["Strength"].default_value = 1.0
        else:
            for l in list(nt_.links):
                if l.to_node == wbg: nt_.links.remove(l)
            wbg.inputs["Color"].default_value = (0, 0, 0, 1) if mode == "sun" else (0.006, 0.009, 0.02, 1)
            wbg.inputs["Strength"].default_value = 1.0
    pbm = bpy.data.meshes.new("pb"); pv, pf = [], []
    for (u, w, h) in PROBES:
        c_ = P(u, w, h); s_ = 0.05; i0 = len(pv)
        pv += [tuple(c_ + Vector((x, y, z))) for z in (-s_, s_) for y in (-s_, s_) for x in (-s_, s_)]
        pf += [(i0 + a, i0 + b, i0 + cc, i0 + d) for a, b, cc, d in ((1, 3, 7, 5), (0, 4, 6, 2), (2, 6, 7, 3), (0, 1, 5, 4), (4, 5, 7, 6), (0, 2, 3, 1))]
    pbm.from_pydata(pv, [], pf); pbm.update()
    ob_pb = bpy.data.objects.new("ProbeCubes", pbm); scn.collection.objects.link(ob_pb); pbm.materials.append(diffuse("probe", 1.0))
    scn.cycles.samples = SAMPLES
    pvals = {}
    for mode in ("sky", "sun", "night"):
        set_mode(mode); t = time.time()
        bake_vc([ob_cell, ob_soft], "vl_" + mode, "DIFFUSE", pass_filter={"DIRECT", "INDIRECT"})
        bake_vc([ob_pb], "pb_" + mode, "DIFFUSE", pass_filter={"DIRECT", "INDIRECT"})
        ca = pbm.color_attributes["pb_" + mode]; vals = []
        for k in range(len(PROBES)):
            cube = {}
            for f in pbm.polygons[k * 6:(k + 1) * 6]:
                c_ = [sum(ca.data[li].color[j] for li in f.loop_indices) / f.loop_total for j in range(3)]
                n_ = f.normal          # Blender (u, -w, up) -> three local (u, up, w)
                key = "+x" if n_.x > 0.5 else "-x" if n_.x < -0.5 else "+y" if n_.z > 0.5 else "-y" if n_.z < -0.5 else "+z" if n_.y < -0.5 else "-z"
                cube[key] = [round(v, 5) for v in c_]
            vals.append([cube[k_] for k_ in ("+x", "-x", "+y", "-y", "+z", "-z")])
        pvals[mode] = vals
        print(f"bake {mode}: {time.time() - t:.1f}s")
    for k, (u, w, h) in enumerate(PROBES):
        probe_data.append({"pos": [u, h - OY, w], "sky": pvals["sky"][k], "sun": pvals["sun"][k], "night": pvals["night"][k]})
    for me in (ob_cell.data, ob_soft.data):
        for mode in ("sky", "sun", "night"):
            smooth_corners(me, "vl_" + mode, iters=16 if mode == "sun" else 8)
            ca = me.color_attributes["vl_" + mode]
            d = np.zeros(len(me.loops) * 4, dtype=np.float32); ca.data.foreach_get("color", d)
            at = me.attributes.new("_L" + mode.upper(), "FLOAT_VECTOR", "CORNER")
            at.data.foreach_set("vector", d.reshape(-1, 4)[:, :3].ravel())
            me.color_attributes.remove(ca)
        me.color_attributes.active_color = me.color_attributes["Col"]
    if PREVIEW:
        os.makedirs(PREVIEW, exist_ok=True)
        camd = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", camd); scn.collection.objects.link(cam); scn.camera = cam
        scn.render.resolution_x, scn.render.resolution_y = 960, 600
        scn.cycles.samples = 64; scn.cycles.use_denoising = True
        scn.render.image_settings.file_format = "PNG"; scn.view_settings.view_transform = "AgX"
        ob_pb.hide_render = True
        for name, eye, at_, lens, mode, ev in (("pre_ext", (2.0, 30.0, 119.0), (24.0, 2.0, 120.0), 18, "sun", 0.0),
                                               ("pre_living", (34.5, -9.5, GL + 1.6), (22.0, -20.0, GL + 1.5), 16, "sky", 2.0),
                                               ("pre_living_night", (34.5, -9.5, GL + 1.6), (22.0, -20.0, GL + 1.5), 16, "night", 2.0),
                                               ("pre_lounge", (34.0, 12.5, GL + 1.5), (20.0, 21.0, GL + 1.3), 16, "night", 2.0),
                                               ("pre_stair", (18.0, 6.5, GL + 1.6), (26.0, 10.5, GL + 2.5), 16, "night", 2.0)):
            set_mode(mode)
            cam.location = P(*eye); d_ = P(*at_) - cam.location
            cam.rotation_euler = d_.to_track_quat("-Z", "Y").to_euler(); camd.lens = lens
            scn.view_settings.exposure = ev
            scn.render.filepath = os.path.join(PREVIEW, f"{name}.png"); bpy.ops.render.render(write_still=True)
    for o in list(scn.objects):
        if o.type in ("LIGHT", "CAMERA") or o.name in ("Ground", "Neighbours", "ProbeCubes"): bpy.data.objects.remove(o)
    # back to the named slots for export
    for o, mats in ((ob_ext, EXT_M), (ob_far, EXT_M), (ob_lod1, EXT_M), (ob_bay, EXT_M), (ob_gl, EXT_M), (ob_gr, EXT_M), (ob_door, EXT_M), (ob_water, EXT_M), (ob_ivy, EXT_M), (ob_cell, INT_M), (ob_soft, INT_M), (ob_iglass, INT_M)):
        for i in range(len(o.data.materials)): o.data.materials[i] = mats[i]
else:
    weld([ob_ext, ob_far, ob_lod1, ob_bay, ob_gl, ob_gr, ob_door, ob_cell, ob_soft])
    for me in (ob_cell.data, ob_soft.data):
        for mode in ("SKY", "SUN", "NIGHT"):
            at = me.attributes.new("_L" + mode, "FLOAT_VECTOR", "CORNER")
            at.data.foreach_set("vector", [0.5] * (len(me.loops) * 3))

# ================================================================================================ export
def export(objs, path):
    for o in scn.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                              export_all_vertex_colors=False, export_attributes=True, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
    print("exported", path, os.path.getsize(path) // 1024, "KB")
# drop unused material slots per object (the exporter writes one primitive per used slot only)
export([ob_ext, ob_far, ob_lod1, ob_bay, ob_gl, ob_gr, ob_door, ob_water, ob_ivy], os.path.join(OUT, "villa.raw.glb"))
export([ob_cell, ob_soft, ob_iglass, ob_col], os.path.join(OUT, "interior.raw.glb"))

def loc(u, w, h): return [u, h - OY, w]
F = SITE["frame"]
notes = {
    "about": "tools/blender/villa.py (claude/villa1): a FICTIONAL modern villa on a real plot (Avenue du Prince d'Orange, the house UrbIS solid 543176); no real owner, no brand",
    "placement": {"hides_solids": SITE["hides_solids"], "hides_bu_ids": SITE["hides_bu_ids"], "city_local_position": [F["origin_city"][0], OY, F["origin_city"][1]],
                  "rotation_y_rad": F["rotation_y_rad"], "frame": F},
    "slots": EXT_SLOTS, "interior_slots": INT_SLOTS, "codes": CODES,
    "levels_taw": {"ground": GL, "first": F1, "ceil0": C0, "ceil1": C1, "roof": PAR1},
    "parts": {
        "gateL": {**GATE_L_INFO, "node": "Villa_gateL", "origin": loc(GATE_L_INFO["hinge_uw"][0], GATE_L_INFO["hinge_uw"][1], GATE_L_INFO["bottom"]), "open_deg": 90},
        "gateR": {**GATE_R_INFO, "node": "Villa_gateR", "origin": loc(GATE_R_INFO["hinge_uw"][0], GATE_R_INFO["hinge_uw"][1], GATE_R_INFO["bottom"]), "open_deg": 90},
        "bay": {"node": "Villa_bay", "w": list(OPEN_BAY), "why": "the open bay's pane, drawn with the far glass (hidden when the interior shows)"},
        "door": {**DOOR_INFO, "node": "Villa_door", "origin": loc(DOOR_INFO["pivot_uw"][0], DOOR_INFO["pivot_uw"][1], DOOR_INFO["h"][0]), "open_deg": 90},
    },
    "gate": {"w": [GATE["w0"], GATE["w1"]], "u": WALL_U, "center_local": loc(WALL_U + 0.15, (GATE["w0"] + GATE["w1"]) / 2, 116.0)},
    "garage": {"door_w": list(GAR["door_w"]), "zone_a": list(GAR["a"]), "zone_b": list(GAR["b"]), "ceil": GAR["ceil"],
               "places": [{"kind": "car", "u": 25.6, "w": 17.35, "nose": "-u"}, {"kind": "car", "u": 12.05, "w": 2.3, "nose": "+w"}, {"kind": "moto", "u": 28.6, "w": 21.2, "nose": "-u"}]},   # (the garage's right bay, in line with the door, is the player's: the white SUV waits on the forecourt)
    "grounds": {"drive": [[WALL_U - 0.25, 18.0], [GF["u0"], 18.0], [GF["u0"], GATE["w1"]], [WALL_U - 0.25, GATE["w1"]]],
                "forecourt": [[WALL_U + 0.3, -0.5], [GF["u0"], -0.5], [GF["u0"], 18.0], [WALL_U + 0.3, 18.0]],
                "garage_floor": [[GF["u0"], GAR["a"][2]], [GAR["b"][0], GAR["a"][2]], [GAR["b"][0], GAR["b"][2]], [GAR["b"][1], GAR["b"][2]], [GAR["b"][1], GAR["b"][3]], [GF["u0"], GAR["b"][3]]],
                "path_back": [[GF["u0"] - 0.0, GF["w1"]], [TER["u0"], GF["w1"]], [TER["u0"], GF["w1"] + 1.6], [GF["u0"], GF["w1"] + 1.6]]},
    "drive_plane": {**DRIVE_PLANE, "zones": ["drive", "garage_floor"]},
    "pool": {**POOL},
    "terrace": {**TER},
    "entrance_steps": STEPS_INFO,
    "bounds_uw": {"u": [WALL_U - 0.3, SITE["plot"]["u1"]], "w": [SITE["plot"]["w0"], SITE["plot"]["w1"]], "h": [GR and min(GR["h"]) - 1, PAR1 + 0.1]},
    "tris": {"lod0": tri(ob_ext), "lod1": tri(ob_lod1), "far": tri(ob_far), "gate": tri(ob_gl) + tri(ob_gr), "door": tri(ob_door)},
}
json.dump(notes, open(os.path.join(OUT, "villa.json"), "w"), indent=1)
info = {
    "about": "tools/blender/villa.py: the villa's interior cell (per-corner baked light, three bakes)",
    "levels_taw": {"ground": GL, "first": F1, "oy": OY},
    "inside": [{"u": [GF["u0"], GF["u1"]], "w": [GF["w0"], GF["w1"]], "h": [GL - 0.6, C0 + 0.2]},
               {"u": [UB["u0"], UB["u1"]], "w": [UB["w0"], UB["w1"]], "h": [C0 - 0.2, C1 + 0.4]},
               {"u": [GF["u0"], GF["u1"]], "w": [GF["w0"], UB["w0"]], "h": [GL - 0.6, LIVC + 0.2]}],
    "no_terrain": [{"u": [GF["u0"] - 0.1, GF["u1"] + 0.1], "w": [GF["w0"] - 0.1, GF["w1"] + 0.1]}, {"u": [POOL["u0"], POOL["u1"]], "w": [POOL["w0"], POOL["w1"]]}],
    "ambientCubes": {"probes": probe_data},
    "sun_dir_uwh": list(SUN_DIR), "samples": SAMPLES,
    "spawn": {"gate_out": loc(7.0, 20.2, 115.6), "living": loc(27.0, -9.5, GL), "landing": loc(28.6, 5.0, F1), "terrace": loc(40.5, 6.0, GL), "lounge": loc(30.0, 15.0, GL)},
    "tris": {"cell": tri(ob_cell), "soft": tri(ob_soft), "glass": tri(ob_iglass), "collider": len(COL) // 3},
}
json.dump(info, open(os.path.join(OUT, "interior.json"), "w"), indent=1)
# the mesh audit's allow list: the kit plants' leaves are open blades by design (leak / crossing / seam round them)
os.makedirs(os.path.join(OUT, "audit"), exist_ok=True)
allow = [{"check": ck, "at": [u, h + 1.3, w], "radius": 2.4, "why": "a kit plant (tools/blender/interior_kit.py plant): open leaf blades crossing each other and the pot, by design"}
         for (u, w, h) in PLANTS for ck in ("leak", "crossing", "near", "coplanar")]
json.dump(allow, open(os.path.join(OUT, "audit", "interior.allow.json"), "w"), indent=1)
print(f"done ({time.time() - T0:.1f}s)")
