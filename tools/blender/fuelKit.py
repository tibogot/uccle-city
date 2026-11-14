"""PETROL STATION KIT (Blender 5.0, headless): the canopy modules, the pump island with a modern dispenser, the price
totem, the shop front, the car-wash box, the air / water stand, the pay terminal, bollards, drainage channel, paint.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/fuelKit.py -- models/fuel [--no-bake] [--previews]

LOOK (look only, never traced / stored; docs/assets/FUEL.md): the Uccle stations on Google Street View (2024): a flat
canopy, its top ~5.2-5.4 m (the UrbIS DSM says the same), a ~0.9-1 m fascia band in the brand colour with a stripe and a
lit underside, a white soffit with flush LED panels, slim clad columns rising out of the pump islands, a kerbed concrete
island with yellow crash hoops at its ends, a double-sided dispenser (~1.1 x 0.5 x 1.95 m: cabinet, screen + keypad head,
brand header, nozzles in boots on both faces, black hoses hanging from the top), a slim price totem (~5.5 m: the brand
emblem on top, grade tabs with LED price windows), the shop's glass front with a signage band. Brand: OUR OWN generic
designs (tools/fuel/make_brands.py): the brand_* slots take a per-station colour scheme at run time, the wordmarks /
emblems come from our own atlas (no real logo, no real name).

Frame (glTF / three.js): x along the piece, y up, +z = its FRONT (the road side / the face) = -Y in Blender. Origin on
the ground at the footprint centre, except:
  canopy_fascia   a 1 m run along x of the fascia profile (scaled along x at run time): origin = the TOP OUTER edge;
                  the outer face at z = 0, it runs 0.30 m inward (-z), the band hangs 0.95 m below
  canopy_corner   the rounded corner (R 0.35) joining two fascias: origin = the corner point of the two outer faces
  canopy_deck     a 1 x 1 m deck (scaled x / z): origin = the soffit (its underside), 0.30 m thick up
  canopy_light    a flush LED panel (1.2 x 0.6): origin = the soffit plane
  canopy_column   a 1 m column (scaled y): origin = its foot
  solar           1 x 1 m of solar panels (scaled x / z), origin = its underside
  shopfront/door  a 1.5 m glazed bay (scaled x a little), origin = its foot on the wall's face (+z out of the wall)
  shopsign        1 m of the signage band (scaled x), origin = its BOTTOM front edge
  fascia_sign     the brand wordmark box (3.2 x 0.62, 6 cm proud), origin = the middle of its back face
  line, grate     1 m of paint / drainage channel
Legs, plinths, columns, island kerbs, totem plinth run 0.3-0.5 m below the origin (JOINS rule). Slots by NAME only.
<piece>__sign: the brand atlas planes (slot "sign"): UV0 u in [0, 1] = the wordmark cell, [1, 2] = the emblem cell,
[2, 3] = the four grade tabs, [3, 4] = the LED price window (the shared last row); v 0..1 up (the cell's row is the scheme, at run time).
<piece>__glass: the clear panes (drawn see-through in their own pass).
UV0 metres along the grain (kitlib), UV1 the AO atlas (fuelkit_ao.png). LODs: viewer/fuel/fuelKit.js (meshoptimizer).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/fuel")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()

# named slots (preview colours only; the viewer maps by name: viewer/fuel/fuelKit.js SLOTS)
WHITE = K.mat("canopy_white", (0.82, 0.83, 0.83), 0.4, 0.1)          # powder-coated cladding, cabinets
SOFFIT = K.mat("soffit_white", (0.86, 0.87, 0.87), 0.35, 0.2)        # the soffit's metal panels
ALU = K.mat("trim_alu", (0.62, 0.64, 0.66), 0.35, 0.85)              # copings, lips, frames
STEEL = K.mat("steel_brushed", (0.55, 0.56, 0.57), 0.3, 0.9)
GALV = K.mat("steel_galv", (0.5, 0.52, 0.53), 0.45, 0.8)
P1 = K.mat("brand_primary", (0.1, 0.25, 0.6), 0.35, 0.05)            # the scheme's colours at run time
P2 = K.mat("brand_secondary", (0.95, 0.6, 0.1), 0.35, 0.05)
P3 = K.mat("brand_accent", (0.85, 0.1, 0.1), 0.35, 0.05)
LEDS = K.mat("led_strip", (0.95, 0.95, 0.92), 0.3, 0.0)              # fascia underside line (emissive)
LEDP = K.mat("led_panel", (0.95, 0.96, 0.98), 0.3, 0.0)              # soffit panels (emissive)
SCREEN = K.mat("screen", (0.05, 0.12, 0.16), 0.15, 0.0)              # dispenser / terminal screens (emissive)
RUBBER = K.mat("rubber_black", (0.02, 0.02, 0.02), 0.7, 0.0)
HOSE = K.mat("hose_black", (0.015, 0.015, 0.016), 0.55, 0.0)
CHROME = K.mat("chrome", (0.8, 0.8, 0.82), 0.12, 1.0)
GREEN = K.mat("grade_green", (0.05, 0.35, 0.12), 0.4, 0.0)            # petrol nozzle grips (E10 / E5)
YELLOW = K.mat("safety_yellow", (0.85, 0.65, 0.05), 0.45, 0.0)
CONC = K.mat("concrete", (0.55, 0.54, 0.51), 0.85, 0.0)
SOLAR = K.mat("solar_cell", (0.03, 0.05, 0.1), 0.2, 0.3)
PAINT = K.mat("paint_white", (0.85, 0.85, 0.82), 0.6, 0.0)
DARK = K.mat("plastic_dark", (0.05, 0.05, 0.055), 0.5, 0.0)            # keypads, card slots, door seals
CAB = K.mat("dispenser_body", (0.78, 0.79, 0.8), 0.35, 0.3)           # the dispenser's cabinet (brushed panels)
INTER = K.mat("shop_interior", (0.12, 0.11, 0.1), 0.8, 0.0)           # behind the glass (glows warm at night)
ROOF = K.mat("roof_membrane", (0.3, 0.3, 0.31), 0.9, 0.0)
BRUSH = K.mat("brush_blue", (0.08, 0.22, 0.55), 0.8, 0.0)
IRON = K.mat("cast_iron", (0.07, 0.07, 0.075), 0.6, 0.6)
SIGN = K.mat("sign", (0.9, 0.9, 0.9), 0.3, 0.0)
GLASS = K.mat("glass", (0.8, 0.85, 0.86), 0.05, 0.0)
Xv, Yv, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)
SINK = 0.5


def span(P, mat, x0, x1, y0, y1, z0, z1, bevel=0.004, grain=None, segs=2):
    """a bevelled box between two corners (Blender coordinates: y = -front)"""
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    if grain is None: grain = Xv if sx >= max(sy, sz) else (Yv if sy >= sz else Zv)
    bm = bm_box(sx, sy, sz, bevel, segs)
    for f in bm.faces: f.smooth = False                       # every bevel step its own flat facet (no bentflat)
    P.add_bm(bm, mat, grain, M(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))


def prism_x(P, mat, pts, x0, x1, grain=Xv, cap=True):
    """a closed profile in (y, z) (Blender) extruded along x from x0 to x1: NO bevel at the ends (scaled along x at run
    time: an end bevel would stretch); chamfers belong in the profile itself"""
    bm = bmesh.new()
    a = [bm.verts.new((x0, y, z)) for y, z in pts]
    b = [bm.verts.new((x1, y, z)) for y, z in pts]
    n = len(pts)
    for k in range(n):
        f = bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]]); f.smooth = False
    if cap:
        bm.faces.new(list(reversed(a))).smooth = False
        bm.faces.new(b).smooth = False
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    P.add_bm(bm, mat, grain)


def prism_z(P, mat, pts, z0, z1, grain=Zv, top_chamfer=0.0):
    """a closed outline in (x, y) (Blender) extruded up from z0 to z1 (columns, islands); top_chamfer: an inset ring"""
    bm = bmesh.new()
    n = len(pts)
    a = [bm.verts.new((x, y, z0)) for x, y in pts]
    if top_chamfer > 0:
        cx = sum(p[0] for p in pts) / n; cy = sum(p[1] for p in pts) / n
        b = [bm.verts.new((x, y, z1 - top_chamfer)) for x, y in pts]
        c = []
        for x, y in pts:
            dx, dy = x - cx, y - cy
            L = math.hypot(dx, dy) or 1
            c.append(bm.verts.new((x - dx / L * top_chamfer, y - dy / L * top_chamfer, z1)))
        for k in range(n):
            bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
            bm.faces.new([b[k], b[(k + 1) % n], c[(k + 1) % n], c[k]])
        bm.faces.new(c)
    else:
        b = [bm.verts.new((x, y, z1)) for x, y in pts]
        for k in range(n):
            bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]])
        bm.faces.new(b)
    bm.faces.new(list(reversed(a)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        # the short steps of an arc smooth; long straight sides, caps and the chamfer ring flat (no bleed into a plane)
        horiz = [e for e in f.edges if abs(e.verts[0].co.z - e.verts[1].co.z) < 1e-6]
        f.smooth = bool(horiz) and abs(f.normal.z) < 0.5 and max(e.calc_length() for e in horiz) < 0.25
    P.add_bm(bm, mat, grain)


def rounded_rect(w, d, r, seg=4):
    """outline of a w x d rectangle with corner radius r (CCW), in (x, y)"""
    out = []
    for cx, cy, a0 in ((w / 2 - r, d / 2 - r, 0), (-w / 2 + r, d / 2 - r, 90), (-w / 2 + r, -d / 2 + r, 180), (w / 2 - r, -d / 2 + r, 270)):
        for k in range(seg + 1):
            a = math.radians(a0 + 90 * k / seg)
            out.append((cx + r * math.cos(a), cy + r * math.sin(a)))
    return out


def stadium(L, W, seg=10):
    r = W / 2
    out = []
    for k in range(seg + 1):
        a = -math.pi / 2 + math.pi * k / seg
        out.append((L / 2 - r + r * math.cos(a), r * math.sin(a)))
    for k in range(seg + 1):
        a = math.pi / 2 + math.pi * k / seg
        out.append((-L / 2 + r + r * math.cos(a), r * math.sin(a)))
    return out


def smooth_path(ctrl, n=6):
    """Catmull-Rom through the control points, n samples per span (hoses: no kink for the swept tube to fold on)"""
    P = [Vector(c) for c in ctrl]
    out = []
    for i in range(len(P) - 1):
        p0, p1, p2, p3 = P[max(0, i - 1)], P[i], P[i + 1], P[min(len(P) - 1, i + 2)]
        for k in range(n):
            t = k / n
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    out.append(P[-1])
    return [tuple(v) for v in out]


def quad_uv(bm, corners, uvs):
    uvl = bm.loops.layers.uv.verify()
    f = bm.faces.new([bm.verts.new(c) for c in corners])
    for loop, uv in zip(f.loops, uvs): loop[uvl].uv = uv
    f.smooth = False
    return f


def sign_plane(S, x0, x1, y, z0, z1, u0, u1, facing=-1):
    """an atlas plane at Blender y (facing -Y = the front, or +Y), x0..x1 (left to right as seen from the front), u0..u1"""
    bm = bmesh.new()
    if facing < 0:
        quad_uv(bm, [(x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1)], [(u0, 0), (u1, 0), (u1, 1), (u0, 1)])
    else:
        quad_uv(bm, [(x1, y, z0), (x0, y, z0), (x0, y, z1), (x1, y, z1)], [(u0, 0), (u1, 0), (u1, 1), (u0, 1)])
    S.append(bm)


def glass_pane(G, x0, x1, y0, y1, z0, z1):
    G.append(bm_box(x1 - x0, y1 - y0, z1 - z0, 0.0))
    G[-1].transform(M(((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)))


def merge_planes(name, planes, mat, uv=True):
    bm = bmesh.new()
    uvl = bm.loops.layers.uv.verify()
    for b in planes:
        bu = b.loops.layers.uv.verify() if uv else None
        vm = {v: bm.verts.new(v.co) for v in b.verts}
        for f in b.faces:
            nf = bm.faces.new([vm[v] for v in f.verts]); nf.smooth = False
            if uv:
                for l0, l1 in zip(f.loops, nf.loops): l1[uvl].uv = l0[bu].uv
        b.free()
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    if me.uv_layers: me.uv_layers[0].name = "UVMap"
    else: me.uv_layers.new(name="UVMap")
    me.materials.append(mat)
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    return o


def finish(P, signs, glass, name, smooth=20):
    # kitlib's to_object shades everything smooth then sharpens by angle: the faces built FLAT here (box bevel steps,
    # straight sides of rounded outlines) get every edge sharp afterwards, so no smooth normal bleeds into a plane
    lay = P.bm.faces.layers.int.new("flat")
    for f in P.bm.faces: f[lay] = 0 if f.smooth else 1
    o = P.to_object(smooth_angle=smooth)
    me = o.data
    flat = [0] * len(me.polygons); me.attributes["flat"].data.foreach_get("value", flat)
    sharp = [False] * len(me.edges)
    if "sharp_edge" in me.attributes: me.attributes["sharp_edge"].data.foreach_get("value", sharp)
    ekey = {e.key: e.index for e in me.edges}
    for poly in me.polygons:
        if flat[poly.index]:
            for ek in poly.edge_keys: sharp[ekey[ek]] = True
    if "sharp_edge" not in me.attributes: me.attributes.new("sharp_edge", "BOOLEAN", "EDGE")
    me.attributes["sharp_edge"].data.foreach_set("value", sharp)
    me.attributes.remove(me.attributes["flat"])
    extra = []
    if signs: extra.append(merge_planes(name + "__sign", signs, SIGN))
    if glass: extra.append(merge_planes(name + "__glass", glass, GLASS, uv=False))
    return o, extra


# ------------------------------------------------------------------------------------------------ canopy
FASCIA, DEPTH, R = 0.95, 0.30, 0.35
# the fascia's sub-profiles in (t inward from the outer face, h from the top), each its own slot
FPROF = [
    (ALU, [(-0.03, -0.012), (-0.022, 0.0), (DEPTH + 0.03, 0.0), (DEPTH + 0.03, -0.055), (-0.022, -0.055), (-0.03, -0.047)]),    # coping
    (P1, [(0.0, -0.055), (0.025, -0.055), (0.025, -0.80), (0.0, -0.80)]),                                                     # the skin
    (WHITE, [(0.03, -0.055), (DEPTH, -0.055), (DEPTH, -0.80), (0.03, -0.80)]),                                                # structure / inner face
    (P2, [(-0.006, -0.50), (0.0, -0.50), (0.0, -0.62), (-0.006, -0.62)]),                                                    # the stripe
    (ALU, [(-0.012, -0.80), (DEPTH, -0.80), (DEPTH, -FASCIA), (0.006, -FASCIA), (-0.012, -FASCIA + 0.018)]),                 # the lip
    (LEDS, [(0.02, -FASCIA), (0.10, -FASCIA), (0.10, -FASCIA - 0.006), (0.02, -FASCIA - 0.006)]),                            # LED line under it
]


def tb(t, h):
    """(t inward, h) -> Blender (y, z) of a fascia whose outer face looks -Y (the front)"""
    return (t, h)


def canopy_fascia():
    P = Part("canopy_fascia")
    for mat, pts in FPROF:
        prism_x(P, mat, [tb(t, h) for t, h in pts], -0.5, 0.5)
    return finish(P, [], [], "canopy_fascia")


def canopy_corner(seg=10):
    """the fascia profile swept round a quarter circle (centre (-R, -R) in three.js x / z = (-R, +R) in Blender x / y)"""
    P = Part("canopy_corner")
    for mat, pts in FPROF:
        bm = bmesh.new()
        rings = []
        for k in range(seg + 1):
            th = math.pi / 2 * k / seg
            ring = []
            for t, h in pts:
                rr = R - t
                x3, z3 = -R + math.sin(th) * rr, -R + math.cos(th) * rr
                ring.append(bm.verts.new((x3, -z3, h)))
            rings.append(ring)
        n = len(pts)
        for k in range(seg):
            for j in range(n):
                f = bm.faces.new([rings[k][j], rings[k][(j + 1) % n], rings[k + 1][(j + 1) % n], rings[k + 1][j]])
                # the outer / inner (curved) faces smooth, the flat top / bottom / ends sharp
                f.smooth = True
        bm.faces.new(rings[0]).smooth = False
        bm.faces.new(list(reversed(rings[-1]))).smooth = False
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        P.add_bm(bm, mat, Zv)
    return finish(P, [], [], "canopy_corner", smooth=30)


def canopy_deck():
    """1 x 1 m, origin = the soffit; the soffit panels face down, the roof membrane up (scaled x / z at run time)"""
    P = Part("canopy_deck")
    bm = bm_box(1.0, 1.0, 0.02, 0.0); P.add_bm(bm, SOFFIT, Xv, M((0, 0, 0.01)))
    bm = bm_box(1.0, 1.0, 0.02, 0.0); P.add_bm(bm, ROOF, Xv, M((0, 0, 0.29)))
    bm = bm_box(1.0, 1.0, 0.26, 0.0); P.add_bm(bm, WHITE, Xv, M((0, 0, 0.15)))
    return finish(P, [], [], "canopy_deck")


def canopy_light():
    P = Part("canopy_light")
    span(P, ALU, -0.62, 0.62, -0.32, 0.32, -0.014, 0.0, 0.003, Xv)
    span(P, LEDP, -0.59, 0.59, -0.29, 0.29, -0.018, -0.013, 0.0, Xv)
    return finish(P, [], [], "canopy_light")


def canopy_column():
    """1 m (scaled y), a 0.30 m clad column with 40 mm rounded corners and two shadow joints"""
    P = Part("canopy_column")
    prism_z(P, WHITE, rounded_rect(0.30, 0.30, 0.04, 3), 0.0, 1.0)
    return finish(P, [], [], "canopy_column", smooth=35)


def column_base():
    """the crash sleeve round a column's foot (stands on the island top): stainless 1.0 m, a brand band"""
    P = Part("column_base")
    prism_z(P, STEEL, rounded_rect(0.40, 0.40, 0.06, 3), -0.05, 0.86, top_chamfer=0.012)
    prism_z(P, P2, rounded_rect(0.405, 0.405, 0.062, 3), 0.62, 0.74)
    return finish(P, [], [], "column_base", smooth=35)


def solar():
    P = Part("solar")
    span(P, ALU, -0.5, 0.5, -0.5, 0.5, 0.0, 0.035, 0.0, Xv)
    span(P, SOLAR, -0.49, 0.49, -0.49, 0.49, 0.035, 0.045, 0.0, Xv)
    return finish(P, [], [], "solar")


def fascia_sign():
    """the wordmark box on a fascia / band, 3.2 x 0.62 m, 6 cm proud (its back at the origin, front = -Y)"""
    P, S = Part("fascia_sign"), []
    w, h, d = 3.2, 0.62, 0.06
    span(P, ALU, -w / 2, w / 2, -d, 0.0, -h / 2, h / 2, 0.008, Xv)
    sign_plane(S, -w / 2 + 0.03, w / 2 - 0.03, -d - 0.002, -h / 2 + 0.03, h / 2 - 0.03, 0.0, 1.0)
    return finish(P, S, [], "fascia_sign")


# ------------------------------------------------------------------------------------------------ the island and the dispenser
IL, IW, IH = 5.0, 1.3, 0.16


def island():
    P = Part("island")
    prism_z(P, CONC, stadium(IL, IW, 10), -0.3, IH, top_chamfer=0.015)
    # galvanised nosing: a band round the top edge, 6 mm proud of the kerb face
    prism_z(P, GALV, stadium(IL + 0.012, IW + 0.012, 10), IH - 0.06, IH - 0.02)
    # yellow hazard paint on the rounded noses (3 mm on the top)
    r = IW / 2 * 0.97
    for s in (1, -1):
        c = s * (IL / 2 - IW / 2)
        pts = [(c + s * r * math.cos(a), r * math.sin(a)) for a in [-math.pi / 2 + math.pi * k / 10 for k in range(11)]]
        if s < 0: pts = list(reversed(pts))
        prism_z(P, YELLOW, pts, IH - 0.001, IH + 0.003)
    # the crash hoops at both ends, on the island's top (one draw with the island)
    for e in (1, -1):
        bumper(P, (e * (IL / 2 - 0.25), 0, IH + 0.003), 0.0 if e > 0 else math.pi)
    return finish(P, [], [], "island", smooth=35)


def bumper(P=None, at=(0, 0, 0), rz=0.0):
    """a U crash hoop (76 mm tube, 0.82 m) across the island end, base plates (into P at `at` when given)"""
    own = P is None
    if own: P = Part("bumper")
    T = M(at, (0, 0, rz))
    r = 0.038
    pts = [(0, -0.42, 0.0)]
    for k in range(9):
        a = math.pi * k / 8
        pts.append((0, -0.42 * math.cos(a) * 1.0, 0.62 + 0.2 * math.sin(a)))
    pts.append((0, 0.42, 0.0))
    path = [(0, -0.42, -0.25), (0, -0.42, 0.62)] + [(0, -0.42 * math.cos(math.pi * k / 8), 0.62 + 0.2 * math.sin(math.pi * k / 8)) for k in range(1, 8)] + [(0, 0.42, 0.62), (0, 0.42, -0.25)]
    P.add_bm(bm_tube_path(path, r, 16), YELLOW, Zv, T)
    # black bands
    for z in (0.25, 0.45):
        for y in (-0.42, 0.42):
            P.add_bm(bm_cyl(r + 0.002, 0.08, 16, 0.0), RUBBER, Zv, T @ M((0, y, z)))
    for y in (-0.42, 0.42):
        bm = bm_box(0.16, 0.16, 0.022, 0.004)
        for f in bm.faces: f.smooth = False
        P.add_bm(bm, GALV, Xv, T @ M((0, y, 0.001)))
    return finish(P, [], [], "bumper", smooth=35) if own else None


def nozzle(P, x, y_face, z, grip):
    """a nozzle in its boot on a face (y_face < 0: the front), spout down into the boot"""
    s = -1 if y_face < 0 else 1
    yb = y_face + s * 0.035
    span(P, DARK, x - 0.055, x + 0.055, min(y_face, yb), max(y_face, yb), z - 0.13, z + 0.04, 0.008, Zv)       # the boot
    # handle: a body sloping out of the boot, a grip cover in the grade colour, the trigger guard
    span(P, RUBBER, x - 0.032, x + 0.032, min(yb, yb + s * 0.055), max(yb, yb + s * 0.055), z - 0.02, z + 0.12, 0.006, Zv)
    span(P, grip, x - 0.042, x + 0.042, min(yb - s * 0.004, yb + s * 0.066), max(yb - s * 0.004, yb + s * 0.066), z + 0.03, z + 0.128, 0.008, Zv)
    P.add_bm(bm_cyl(0.012, 0.11, 10, 0.0), CHROME, Zv, M((x, yb + s * 0.02, z - 0.11)))
    span(P, RUBBER, x - 0.03, x + 0.03, min(yb + s * 0.07, yb + s * 0.1), max(yb + s * 0.07, yb + s * 0.1), z + 0.09, z + 0.125, 0.006, Zv)


def dispenser():
    """1.10 x 0.50 x 1.95 m double-sided multi-product dispenser (faces -Y / +Y), on a stainless plinth"""
    P, S = Part("dispenser"), []
    w, d = 1.10, 0.46
    span(P, STEEL, -0.62, 0.62, -0.30, 0.30, -0.02, 0.10, 0.01, Xv)                                   # plinth
    span(P, CAB, -w / 2, w / 2, -d / 2, d / 2, 0.10, 0.86, 0.012, Zv)                                  # hydraulics cabinet
    for s in (-1, 1):                                                                                 # door seams + louvres
        y = s * (d / 2 + 0.001)
        span(P, DARK, -0.004, 0.004, min(y, y + s * 0.002), max(y, y + s * 0.002), 0.14, 0.82, 0.0, Zv)
        for k in range(5):
            z = 0.2 + k * 0.035
            for x0 in (-0.42, 0.06):
                span(P, DARK, x0, x0 + 0.36, min(y, y + s * 0.003), max(y, y + s * 0.003), z, z + 0.012, 0.0, Xv)
    span(P, WHITE, -w / 2 - 0.01, w / 2 + 0.01, -d / 2 - 0.02, d / 2 + 0.02, 0.86, 0.90, 0.006, Xv)     # waist band
    span(P, CAB, -w / 2 + 0.02, w / 2 - 0.02, -0.25, 0.25, 0.90, 1.45, 0.012, Zv)                      # electronics head
    for s in (-1, 1):
        y = s * 0.25
        yo = lambda dd: (min(y - s * dd * 0.4, y + s * dd), max(y - s * dd * 0.4, y + s * dd))
        # screen in a dark bezel, keypad, card terminal, grade buttons
        span(P, DARK, -0.24, 0.10, *yo(0.012), 1.08, 1.36, 0.006, Xv)
        span(P, SCREEN, -0.22, 0.08, *yo(0.016), 1.11, 1.33, 0.0, Xv)
        span(P, DARK, 0.15, 0.40, *yo(0.03), 1.05, 1.32, 0.008, Xv)
        for i in range(4):
            for j in range(3):
                span(P, ALU, 0.17 + j * 0.07, 0.22 + j * 0.07, *yo(0.036), 1.08 + i * 0.05, 1.115 + i * 0.05, 0.003, Xv)
        span(P, DARK, 0.28, 0.38, *yo(0.04), 1.22, 1.30, 0.004, Xv)                                   # card reader
        # grade tabs over the nozzles (atlas: grade row): E10 left, B7 diesel right
        for i, xg in ((0, -0.38), (2, 0.38)):
            sign_plane(S, xg - 0.1, xg + 0.1, y + s * 0.0125, 0.94, 1.0, 2.0 + i * 0.25, 2.0 + (i + 1) * 0.25, facing=s)
        # nozzles in boots on the cabinet face (d / 2): E10 green left, diesel black right
        nozzle(P, -0.38, s * d / 2, 0.62, GREEN)
        nozzle(P, 0.38, s * d / 2, 0.62, RUBBER)
    # the header: brand colour with a stripe, the emblem each side
    span(P, P1, -w / 2 - 0.02, w / 2 + 0.02, -0.27, 0.27, 1.45, 1.86, 0.015, Xv)
    span(P, P2, -w / 2 - 0.024, w / 2 + 0.024, -0.274, 0.274, 1.66, 1.70, 0.004, Xv)
    span(P, ALU, -w / 2 - 0.03, w / 2 + 0.03, -0.28, 0.28, 1.86, 1.92, 0.01, Xv)
    for s in (-1, 1):
        sign_plane(S, -0.26, 0.26, s * 0.276, 1.49, 1.64, 0.0, 1.0, facing=s)
    # hose outlets on the header's ends, the hoses hanging in a loop down to the nozzles
    for xs in (-1, 1):
        x = xs * (w / 2 + 0.03)
        P.add_bm(bm_cyl(0.035, 0.08, 12, 0.006), STEEL, Xv, M((x, 0, 1.70), (0, math.pi / 2 * xs, 0)))
    # each nozzle's hose: out of the outlet on its own end, down the end in a loose loop, up into the handle's top
    for s in (-1, 1):
        for sx in (-1, 1):
            ye = s * (d / 2 + 0.035 + 0.0275)
            ctrl = [(sx * (w / 2 + 0.07), s * 0.05, 1.70), (sx * (w / 2 + 0.12), s * 0.12, 1.45), (sx * (w / 2 + 0.15), s * 0.24, 1.0),
                    (sx * (w / 2 + 0.12), s * 0.36, 0.55), (sx * 0.52, s * 0.42, 0.30), (sx * 0.40, ye + s * 0.12, 0.58),
                    (sx * 0.38, ye + s * 0.09, 0.80), (sx * 0.38, ye + s * 0.03, 0.81), (sx * 0.38, ye, 0.765), (sx * 0.38, ye, 0.7455)]
            P.add_bm(bm_tube_path(smooth_path(ctrl, 6), 0.012, 10, cap=True), HOSE, Zv)
    return finish(P, S, [], "dispenser", smooth=30)


# ------------------------------------------------------------------------------------------------ totem
def totem():
    """5.6 m price totem, 1.4 m wide, 0.40 deep; faces -Y / +Y: emblem on top, 4 grade rows (tab + LED window)"""
    P, S = Part("totem"), []
    w, d = 1.40, 0.40
    span(P, CONC, -0.85, 0.85, -0.32, 0.32, -0.45, 0.35, 0.02, Xv)                                   # plinth
    for xs in (-1, 1):                                                                                # side posts
        span(P, STEEL, xs * w / 2 - 0.05, xs * w / 2 + 0.05, -d / 2 - 0.01, d / 2 + 0.01, 0.30, 5.50, 0.012, Zv)
    span(P, P1, -w / 2 + 0.04, w / 2 - 0.04, -d / 2, d / 2, 0.35, 5.45, 0.01, Zv)                     # the body
    span(P, ALU, -w / 2 - 0.06, w / 2 + 0.06, -d / 2 - 0.02, d / 2 + 0.02, 5.45, 5.58, 0.015, Xv)    # cap
    span(P, P2, -w / 2 + 0.042, w / 2 - 0.042, -d / 2 - 0.004, d / 2 + 0.004, 4.05, 4.12, 0.0, Xv)  # stripe
    for s in (-1, 1):
        y = s * (d / 2 + 0.007)
        sign_plane(S, -0.56, 0.56, y, 4.22, 5.34, 1.0, 2.0, facing=s)                               # emblem
        for k in range(4):
            z0 = 3.55 - k * 0.48
            # a dark row panel 4 mm proud of the body: the grade tab (left) + the LED price window (right)
            span(P, DARK, -0.6, 0.6, min(s * d / 2, s * (d / 2 + 0.004)), max(s * d / 2, s * (d / 2 + 0.004)), z0, z0 + 0.40, 0.0, Xv)
            sign_plane(S, -0.58, -0.08, y, z0 + 0.03, z0 + 0.37, 2.0 + k * 0.25, 2.0 + (k + 1) * 0.25, facing=s)
            sign_plane(S, -0.04, 0.58, y, z0 + 0.03, z0 + 0.37, 3.0, 4.0, facing=s)
    return finish(P, S, [], "totem", smooth=20)


# ------------------------------------------------------------------------------------------------ shop front
def shopfront(door=False):
    """a 1.5 m glazed bay, 3.0 m high, applied on a wall (its back at the origin, front = -Y)"""
    name = "shopdoor" if door else "shopfront"
    P, G = Part(name), []
    W, H = 1.5, 3.0
    y0, y1 = -0.14, 0.0
    span(P, ALU, -W / 2, -W / 2 + 0.06, y0, y1, -0.05, H, 0.006, Zv)                                 # mullions
    span(P, ALU, W / 2 - 0.06, W / 2, y0, y1, -0.05, H, 0.006, Zv)
    span(P, DARK, -W / 2 + 0.06, W / 2 - 0.06, y0 + 0.02, y1, -0.05, 0.25 if not door else 0.03, 0.004, Xv)   # kick plate / sill
    span(P, ALU, -W / 2 + 0.06, W / 2 - 0.06, y0, y1, 2.45, 2.55, 0.006, Xv)                        # transom
    span(P, ALU, -W / 2 + 0.06, W / 2 - 0.06, y0, y1, H - 0.08, H, 0.006, Xv)                        # head
    for za, zb in (((0.25 if not door else 0.03), 2.45), (2.55, H - 0.08)):                       # the interior behind the glass
        span(P, INTER, -W / 2 + 0.061, W / 2 - 0.061, -0.021, -0.001, za + 0.001, zb - 0.001, 0.0, Xv)
    if door:
        for xs in (-1, 1):                                                                            # sliding leaves' stiles
            span(P, ALU, xs * 0.03 - 0.025, xs * 0.03 + 0.025, y0 - 0.02, y0 + 0.03, 0.03, 2.45, 0.004, Zv)
            span(P, STEEL, xs * 0.12 - 0.012, xs * 0.12 + 0.012, y0 - 0.06, y0 - 0.02, 0.9, 1.3, 0.004, Zv)   # pull handles
        glass_pane(G, -W / 2 + 0.07, W / 2 - 0.07, y0 + 0.01, y0 + 0.02, 0.04, 2.44)
    else:
        glass_pane(G, -W / 2 + 0.07, W / 2 - 0.07, y0 + 0.04, y0 + 0.05, 0.26, 2.44)
    glass_pane(G, -W / 2 + 0.07, W / 2 - 0.07, y0 + 0.04, y0 + 0.05, 2.56, H - 0.09)
    return finish(P, [], G, name)


def shopsign():
    """1 m of the signage band (scaled x): 0.75 m high, 0.25 deep, origin = its bottom front edge"""
    P = Part("shopsign")
    prism_x(P, ALU, [(-0.012, 0.0), (0.25, 0.0), (0.25, 0.05), (-0.012, 0.05)], -0.5, 0.5)
    prism_x(P, P1, [(0.0, 0.05), (0.25, 0.05), (0.25, 0.70), (0.0, 0.70)], -0.5, 0.5)
    prism_x(P, P2, [(-0.006, 0.08), (0.0, 0.08), (0.0, 0.16), (-0.006, 0.16)], -0.5, 0.5)
    prism_x(P, ALU, [(-0.015, 0.70), (0.25, 0.70), (0.25, 0.75), (-0.008, 0.75), (-0.015, 0.743)], -0.5, 0.5)
    prism_x(P, LEDS, [(0.01, -0.006), (0.08, -0.006), (0.08, 0.0), (0.01, 0.0)], -0.5, 0.5)
    # (flip: the profile's t is -Y = the front)
    return finish(P, [], [], "shopsign")


# ------------------------------------------------------------------------------------------------ small pieces
def airstand():
    P, S = Part("airstand"), []
    span(P, CONC, -0.3, 0.3, -0.25, 0.25, -0.35, 0.08, 0.01, Xv)
    span(P, P2, -0.17, 0.17, -0.13, 0.13, 0.08, 1.25, 0.02, Zv)
    span(P, P1, -0.175, 0.175, -0.135, 0.135, 1.0, 1.262, 0.015, Xv)
    span(P, DARK, -0.12, 0.12, -0.15, -0.125, 0.80, 0.95, 0.004, Xv)
    span(P, SCREEN, -0.08, 0.08, -0.155, -0.145, 0.84, 0.92, 0.0, Xv)
    P.add_bm(bm_cyl(0.06, 0.04, 16, 0.006), STEEL, Yv, M((0.0, -0.13, 0.62), (math.pi / 2, 0, 0)))   # gauge
    # the coiled hose on a hook on the side
    span(P, STEEL, 0.17, 0.24, -0.02, 0.02, 0.95, 1.0, 0.004, Xv)
    coil = [(0.30 + 0.09 * math.cos(2 * math.pi * k / 16), 0.03 * (k / 16) - 0.015, 0.72 + 0.25 * math.sin(2 * math.pi * k / 16) * 0.9) for k in range(33)]
    P.add_bm(bm_tube_path(coil, 0.011, 8), HOSE, Zv)
    sign_plane(S, -0.15, 0.15, -0.136, 1.03, 1.22, 1.0, 2.0)
    return finish(P, S, [], "airstand", smooth=30)


def paypoint():
    P, S = Part("paypoint"), []
    span(P, CONC, -0.38, 0.38, -0.32, 0.32, -0.35, 0.08, 0.01, Xv)
    span(P, CAB, -0.28, 0.28, -0.2, 0.2, 0.08, 1.55, 0.02, Zv)
    span(P, P1, -0.285, 0.285, -0.205, 0.205, 1.55, 1.75, 0.015, Xv)
    span(P, DARK, -0.22, 0.22, -0.215, -0.2, 1.0, 1.42, 0.006, Xv)
    span(P, SCREEN, -0.18, 0.18, -0.22, -0.212, 1.18, 1.40, 0.0, Xv)
    span(P, DARK, -0.12, 0.12, -0.28, -0.195, 0.98, 1.1, 0.008, Xv)
    span(P, STEEL, -0.03, 0.03, 0.12, 0.18, 1.75, 2.3, 0.006, Zv)
    span(P, P2, -0.45, 0.45, -0.38, 0.28, 2.3, 2.38, 0.012, Xv)                                      # little rain roof
    sign_plane(S, -0.24, 0.24, -0.207, 1.58, 1.72, 0.0, 1.0)
    return finish(P, S, [], "paypoint")


def bollard():
    P = Part("bollard")
    P.add_bm(bm_cyl(0.07, 1.0 + 0.4, 20, 0.0), GALV, Zv, M((0, 0, -0.4)))
    P.add_bm(bm_cyl(0.071, 0.05, 20, 0.0), YELLOW, Zv, M((0, 0, 0.78)))
    P.add_bm(bm_cyl(0.071, 0.05, 20, 0.0), YELLOW, Zv, M((0, 0, 0.88)))
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=20, v_segments=8, radius=0.07)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if v.co.z < -1e-4], context="VERTS")
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, GALV, Zv, M((0, 0, 1.0)))
    return finish(P, [], [], "bollard", smooth=40)


def grate():
    """1 m of linear drainage channel: galvanised edge rails, cast-iron cross bars over the dark channel, flush + 2-4 mm"""
    P = Part("grate")
    for ys in (-1, 1):
        span(P, GALV, -0.5, 0.5, ys * 0.11 - 0.012, ys * 0.11 + 0.012, -0.25, 0.002, 0.0, Xv)
    span(P, DARK, -0.5, 0.5, -0.098, 0.098, -0.25, -0.03, 0.0, Xv)                                 # the channel (its floor)
    for k in range(25):
        x = -0.49 + k * 0.04
        span(P, IRON, x, x + 0.02, -0.097, 0.097, -0.03, 0.004, 0.0, Yv)
    return finish(P, [], [], "grate")


def line():
    P = Part("line")
    span(P, PAINT, -0.5, 0.5, -0.06, 0.06, 0.0, 0.003, 0.0, Xv)
    return finish(P, [], [], "line")


def carwash():
    """a roll-over wash box 4.8 x 7.8 x 3.7 m, open at both ends (along Y), a gantry with brushes inside"""
    P, S = Part("carwash"), []
    W, L, H = 4.8, 7.8, 3.7
    span(P, CONC, -W / 2 - 0.3, W / 2 + 0.3, -L / 2 - 0.2, L / 2 + 0.2, -0.3, 0.06, 0.02, Yv)       # apron
    for xs in (-1, 1):                                                                                # side walls
        span(P, WHITE, xs * W / 2 - 0.1, xs * W / 2 + 0.1, -L / 2 + 0.13, L / 2 - 0.13, 0.055, H - 0.355, 0.01, Yv)
        span(P, P2, xs * (W / 2 + 0.1) - 0.003, xs * (W / 2 + 0.1) + 0.003, -L / 2 + 0.1, L / 2 - 0.1, 1.2, 1.5, 0.0, Yv)
        for ys in (-1, 1):
            span(P, ALU, xs * W / 2 - 0.13, xs * W / 2 + 0.13, ys * L / 2 - 0.13, ys * L / 2 + 0.13, 0.05, H - 0.31, 0.008, Zv)
    span(P, P1, -W / 2 - 0.15, W / 2 + 0.15, -L / 2 - 0.15, L / 2 + 0.15, H - 0.35, H, 0.02, Yv)     # roof fascia
    span(P, SOFFIT, -W / 2 + 0.1, W / 2 - 0.1, -L / 2 + 0.05, L / 2 - 0.05, H - 0.36, H - 0.34, 0.0, Yv)
    for ys in (-1, 1):
        span(P, ALU, -W / 2, W / 2, ys * (L / 2 - 0.2) - 0.18, ys * (L / 2 - 0.2) + 0.18, H - 0.75, H - 0.36, 0.01, Xv)   # door rolls
        sign_plane(S, -1.0, 1.0, ys * (L / 2 + 0.152), H - 0.32, H - 0.03, 0.0, 1.0, facing=ys)
    # the gantry and its brushes
    span(P, CAB, -W / 2 + 0.25, -W / 2 + 0.55, -0.35, 0.35, 0.06, 3.0, 0.01, Zv)
    span(P, CAB, W / 2 - 0.55, W / 2 - 0.25, -0.35, 0.35, 0.06, 3.0, 0.01, Zv)
    span(P, CAB, -W / 2 + 0.27, W / 2 - 0.27, -0.33, 0.33, 2.75, 3.05, 0.01, Xv)
    for xs in (-1, 1):
        bm = bm_cyl(0.42, 2.1, 24, 0.0); P.add_bm(bm, BRUSH, Zv, M((xs * 1.25, 0, 0.35)))
    bm = bm_cyl(0.38, 2.6, 24, 0.0); P.add_bm(bm, BRUSH, Xv, M((-1.3, 0, 2.2), (0, math.pi / 2, 0)))
    for ys in (-1.5, 1.5):                                                                            # wheel guide rails
        span(P, GALV, -1.05, -0.85, ys - 1.2, ys + 1.2, 0.06, 0.16, 0.01, Yv)
        span(P, GALV, 0.85, 1.05, ys - 1.2, ys + 1.2, 0.06, 0.16, 0.01, Yv)
    return finish(P, S, [], "carwash")


BUILD = [canopy_fascia, canopy_corner, canopy_deck, canopy_light, canopy_column, column_base, solar, fascia_sign,
         island, dispenser, totem, lambda: shopfront(False), lambda: shopfront(True), shopsign,
         airstand, paypoint, bollard, grate, line, carwash]
# pieces scaled at run time (their AO is not baked: a unit piece's AO is meaningless once stretched)
SCALED = {"canopy_fascia", "canopy_deck", "canopy_column", "solar", "shopsign", "line"}

objs, extras = [], []
for b in BUILD:
    t = time.time()
    o, ex = b()
    objs.append(o); extras += ex
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}; " + ", ".join(f"{x.name} {K.tris(x)}" for x in ex) + f" ({time.time() - t:.1f}s)", flush=True)

baked = [o for o in objs if o.name not in SCALED]
def lightmap_uv(o, region, margin=0.004):
    """kitlib.lightmap_uv with a box packer (the concave packer took minutes per piece on this kit)"""
    me = o.data
    d = [0.0] * (2 * len(me.loops)); me.uv_layers["UVMap"].data.foreach_get("uv", d)
    me.uv_layers.new(name="Lightmap")
    lm = me.uv_layers["Lightmap"]
    lm.data.foreach_set("uv", d)
    if o.name in SCALED:                                         # (not baked: the viewer reads no AO for these)
        lm.data.foreach_set("uv", [0.0] * len(d)); return
    me.uv_layers.active = lm
    for x in bpy.context.scene.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.lightmap_pack(PREF_CONTEXT="ALL_FACES", PREF_PACK_IN_ONE=True, PREF_BOX_DIV=12, PREF_MARGIN_DIV=0.3)
    bpy.ops.object.mode_set(mode="OBJECT")
    x0, y0, sz = region
    lm = me.uv_layers["Lightmap"]
    d = [0.0] * (2 * len(me.loops)); lm.data.foreach_get("uv", d)
    for i in range(0, len(d), 2): d[i] = x0 + d[i] * sz; d[i + 1] = y0 + d[i + 1] * sz
    lm.data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]


layout = K.atlas_layout(baked)
for o in objs: lightmap_uv(o, layout.get(o.name, (0, 0, 0.001)), margin=0.004)
print("lightmaps", f"{time.time() - T0:.0f}s", flush=True)
ao_png = os.path.join(OUT, "fuelkit_ao.png")
# pieces hanging below their origin (a fascia corner, a sign centred on its origin, the LED panel under the soffit) are
# lifted above the bake's ground plane while baking, else the ground swallows them (black AO)
LIFT = {"canopy_corner": 1.0, "fascia_sign": 0.4, "canopy_light": 0.05}
if BAKE:
    for o in baked:
        if o.name in LIFT: o.data.transform(Matrix.Translation((0, 0, LIFT[o.name])))
if BAKE:
    ao_img = K.bake_ao(baked, ao_png, px=2048, samples=48, distance=0.8)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

if BAKE:
    for o in baked:
        if o.name in LIFT: o.data.transform(Matrix.Translation((0, 0, -LIFT[o.name])))
K.export_glb(objs + extras, os.path.join(OUT, "fuelkit.glb"))
info = {
    "asset": "Petrol station kit (tools/blender/fuelKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.z, 3), round(o.dimensions.y, 3)]} for o in objs + extras},
    "scaled": sorted(SCALED),
    "frame": "glTF Y up, +Z = the front (Blender -Y); origins: see the script's doc",
    "sign_uv": "u 0..1 wordmark cell, 1..2 emblem cell (the scheme's row); 2..3 the four grade tabs, 3..4 the LED price window (the shared last row); v 0 bottom (glTF flips v)",
}
json.dump(info, open(os.path.join(OUT, "fuelkit.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.render.image_settings.color_mode = "RGB"
    so, cam = K.preview_setup(ao_img, sun_elev=38, sun_az=215)
    for m, col in ((GLASS, (0.9, 0.95, 0.96)), (SIGN, (0.9, 0.9, 0.9))):
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        for l in list(b.inputs["Base Color"].links): nt.links.remove(l)
        b.inputs["Base Color"].default_value = (*col, 1)
    GLASS.node_tree.nodes["Principled BSDF"].inputs["Transmission Weight"].default_value = 1.0
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    # an assembled station: canopy 12 x 7, top 5.3, one island, the totem, a shop bay row
    def place(o, x, y, z, rz=0.0, s=(1, 1, 1)):
        c = o.copy(); c.data = o.data; scn.collection.objects.link(c)
        c.location = (x, y, z); c.rotation_euler = (0, 0, rz); c.scale = s; c.hide_render = False
        return c
    for o in objs + extras: o.hide_render = True
    lib = {o.name: o for o in objs + extras}
    w, d, top = 12.0, 7.0, 5.3
    under = top - FASCIA
    place(lib["canopy_deck"], 0, 0, under + 0.12, 0, (w - 0.3, d - 0.3, 1))
    for (x, y, rz, L) in ((0, -d / 2, 0, w), (0, d / 2, math.pi, w), (w / 2, 0, math.pi / 2, d), (-w / 2, 0, -math.pi / 2, d)):
        place(lib["canopy_fascia"], x, y, top, rz, (L - 2 * R, 1, 1))
    for (ex, ey, rz) in ((1, -1, 0), (-1, -1, -math.pi / 2), (-1, 1, math.pi), (1, 1, math.pi / 2)):
        place(lib["canopy_corner"], ex * w / 2, ey * d / 2, top, rz)
    for n in ("fascia_sign", "fascia_sign__sign"):
        place(lib[n], 0, -d / 2, top - FASCIA / 2, 0); place(lib[n], 0, d / 2, top - FASCIA / 2, math.pi)
    for i in range(3):
        for j in range(2):
            place(lib["canopy_light"], -w / 2 + w * (i + 0.5) / 3, -d / 2 + d * (j + 0.5) / 2, under + 0.12)
    for n in ("island", "bumper", "dispenser", "dispenser__sign", "canopy_column", "column_base"):
        pass
    place(lib["island"], 0, 0, 0)
    place(lib["dispenser"], -0.55, 0, IH); place(lib["dispenser__sign"], -0.55, 0, IH)
    place(lib["canopy_column"], 1.65, 0, -0.5, 0, (1, 1, under + 0.12 + 0.5))
    place(lib["column_base"], 1.65, 0, IH)
    place(lib["totem"], 8.5, -5.0, 0, math.pi / 2); place(lib["totem__sign"], 8.5, -5.0, 0, math.pi / 2)
    for k in range(4):
        n = "shopdoor" if k == 2 else "shopfront"
        place(lib[n], -3 + k * 1.5, 7.5, 0, math.pi); place(lib[n + "__glass"], -3 + k * 1.5, 7.5, 0, math.pi)
    place(lib["shopsign"], 0, 7.5, 3.2, math.pi, (6.3, 1, 1))
    place(lib["airstand"], -7.0, 3.0, 0); place(lib["airstand__sign"], -7.0, 3.0, 0)
    place(lib["bollard"], 7.6, -4.1, 0); place(lib["bollard"], 9.4, -4.1, 0)
    for k in range(10): place(lib["grate"], -4.5 + k, -6.0, 0)
    place(lib["line"], 0, -3.2, 0.0, 0, (10, 1, 1)); place(lib["line"], 0, 3.2, 0.0, 0, (10, 1, 1))
    place(lib["carwash"], -13, 2, 0); place(lib["carwash__sign"], -13, 2, 0)
    K.render(cam, os.path.join(PV, "fuel_overview.jpg"), (14, -20, 7), (-1.5, 0, 2.2), 30, (1600, 900))
    K.render(cam, os.path.join(PV, "fuel_island.jpg"), (2.6, -3.6, 1.6), (-0.4, 0, 1.0), 30, (1200, 800))
    K.render(cam, os.path.join(PV, "fuel_canopy_under.jpg"), (-4, -6, 1.7), (1, 2, 4.2), 24, (1200, 800))
    K.render(cam, os.path.join(PV, "fuel_totem.jpg"), (12, -10, 2.5), (8.5, -5, 3.0), 35, (900, 1200))
    so.rotation_euler = (math.radians(82), 0, math.radians(120))
    K.render(cam, os.path.join(PV, "fuel_grazing.jpg"), (10, -9, 2.0), (0, 0, 2.5), 28, (1200, 800))
print(f"done {time.time() - T0:.0f}s")
