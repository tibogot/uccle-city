"""THE STREET KIT (docs/assets/STREETKIT.md): Belgian road signs, the posts of the bilingual street-name plates, the Villo
bike-share stations. Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/streetKit.py -- models/streetkit [--no-bake] [--previews]

Pieces (one object each; Blender -Y = the FRONT = three.js +Z; posts / skirts run below the origin: JOINS rule):
  sign_pole        the Belgian sign post: a 76 mm hot-dip galvanised tube, 3.10 m out of the ground (0.35 m in), a dark
                   PE cap; origin = the post axis on the ground
  sign_pole_tall   the same, 3.60 m (two plates, or a 0.90 m rectangular plate over another)
  plate_<shape>    the aluminium sign plates (shapes: tools/streetkit/signShapes.py, the Belgian code's small urban
                   format): a 2 mm sheet with its 20 mm folded rim (front edge bevelled), the grey back, two extruded
                   aluminium rails across the back, and a galvanised strap clamp round the post per rail with its
                   bolts. Origin = the FACE centre (the shape's bounding-box centre) on the face plane; the post axis is
                   0.088 m behind it (Blender +Y). The face (slot sign_face) carries NO UVs: the viewer maps it from the
                   local position (the face atlas cell covers the bounding box: tools/streetkit/faceAtlas.py)
  plate_post       the post of a free-standing street-name plate: a 60 mm galvanised tube, 2.95 m, cap, and the two
                   clamp brackets the enamel plate (drawn by the street life layer, 2.6 m up, 4 cm in front of the
                   post axis) is screwed to
  villo_totem      the station terminal (Villo, Brussels; Commons photos "Villo! bike rental in Brussels - Stierch",
                   "VilloStationAlmostFull"; look only): a 2.33 m pillar of ribbed silver aluminium, a dark oval panel
                   on the front holding the screen, card reader and keypad, the ochre head band with the station number
                   and name (slot villo_head: the face atlas strip, mapped from the position). No logo
  villo_dock       one docking point: the silver post with its ribbed foot, the lock head facing the bike (front, -Y),
                   a dark user panel, a status lamp; on its 0.85 m section of the galvanised base rail (the rails of a
                   row abut into one)
  villo_bike       the station bike: a step-through silver frame, the front basket, the ochre skirt guards over the rear
                   wheel (plain colour, no mark), mudguards, the chain case, 26-inch wheels with 32 spokes, black tyres,
                   bars, grips and saddle. Origin = the FRONT tyre's ground contact; the bike runs from there toward -Y
                   (three.js +Z): its front wheel goes into the dock
Slots by NAME only (no baked colour): viewer/streetkit/streetKit.js SLOTS. UV0: metres along the grain; UV1: the AO
atlas (streetkit_ao.png). LODs: in the viewer (meshoptimizer at load).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, "..", "streetkit"))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, Part
from signShapes import SHAPES, outline

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/streetkit")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
ONLY = None
for a in ARGS:
    if a.startswith("--only="): ONLY = a[7:].split(",")
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)
SINK = 0.35

# named slots (preview colours only)
GALV = K.mat("galvanised", (0.5, 0.51, 0.5), 0.45, 0.9)
CAP = K.mat("cap_dark", (0.03, 0.03, 0.03), 0.6, 0.0)
FACE = K.mat("sign_face", (0.85, 0.85, 0.85), 0.35, 0.0)
BACK = K.mat("sign_back", (0.55, 0.56, 0.57), 0.55, 0.6)
RAIL = K.mat("sign_rail", (0.62, 0.63, 0.64), 0.4, 0.8)
BOLT = K.mat("bolt_steel", (0.4, 0.4, 0.4), 0.35, 0.9)
VBODY = K.mat("villo_body", (0.62, 0.63, 0.64), 0.35, 0.75)
VDARK = K.mat("villo_dark", (0.03, 0.035, 0.04), 0.4, 0.2)
VSCREEN = K.mat("villo_screen", (0.08, 0.12, 0.15), 0.1, 0.0)
VHEAD = K.mat("villo_head", (0.8, 0.55, 0.05), 0.4, 0.0)
OCHRE = K.mat("villo_ochre", (0.85, 0.6, 0.04), 0.4, 0.0)
FRAME = K.mat("bike_frame", (0.68, 0.69, 0.7), 0.3, 0.7)
RUBBER = K.mat("bike_black", (0.02, 0.02, 0.02), 0.75, 0.0)
CHROME = K.mat("bike_chrome", (0.75, 0.75, 0.75), 0.2, 1.0)
REFL = K.mat("reflector", (0.9, 0.35, 0.02), 0.3, 0.0)
LED = K.mat("status_led", (0.1, 0.6, 0.2), 0.2, 0.0)


# ------------------------------------------------------------------------------------------------ helpers
def box(P, mat, c, s, bevel=0.003, grain=Zv, segs=2, rot=None):
    P.add_bm(bm_box(*s, bevel, segs), mat, grain, M(c, rot or (0, 0, 0)))


def span(P, mat, x0, x1, y0, y1, z0, z1, bevel=0.003, grain=None, segs=2):
    sx, sy, sz = x1 - x0, y1 - y0, z1 - z0
    if grain is None: grain = X if sx >= max(sy, sz) else (Y if sy >= sz else Zv)
    box(P, mat, ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), (sx, sy, sz), bevel, grain, segs)


def offset_poly(pts, d):
    """a convex CCW 2D polygon moved inward by d (each vertex along its bisector)"""
    n, out = len(pts), []
    for i in range(n):
        p0, p1, p2 = Vector(pts[i - 1]), Vector(pts[i]), Vector(pts[(i + 1) % n])
        e0, e1 = (p1 - p0).normalized(), (p2 - p1).normalized()
        n0, n1 = Vector((-e0.y, e0.x)), Vector((-e1.y, e1.x))          # inward normals of a CCW polygon
        b = (n0 + n1); b = b.normalized() if b.length > 1e-9 else n0
        out.append(tuple(p1 + b * (d / max(0.3, b.dot(n0)))))
    return out


def ngon(pts3, normal):
    """one flat face, wound so its normal points along `normal`"""
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in pts3]
    f = bm.faces.new(vs); f.smooth = False
    f.normal_update()
    if f.normal.dot(Vector(normal)) < 0: f.normal_flip()
    bmesh.ops.triangulate(bm, faces=[f], quad_method="BEAUTY", ngon_method="BEAUTY")
    return bm


def rings_strip(r0, r1, smooth=True, out=None):
    """quads between two equal-length closed rings of 3D points; out(centre) -> the direction each face must face"""
    bm = bmesh.new()
    a = [bm.verts.new(p) for p in r0]; b = [bm.verts.new(p) for p in r1]
    n = len(a)
    for k in range(n):
        f = bm.faces.new([a[k], a[(k + 1) % n], b[(k + 1) % n], b[k]]); f.smooth = smooth
        if out is not None:
            f.normal_update()
            if f.normal.dot(Vector(out(f.calc_center_median()))) < 0: f.normal_flip()
    bm.normal_update()
    return bm


RADIAL_XZ = lambda c: (c.x, 0.0, c.z)
RADIAL_XY = lambda c: (c.x, c.y, 0.0)


def lathe(profile, segs=32, phase=0.0):
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-6: rings.append([bm.verts.new((0, 0, z))]); continue
        rings.append([bm.verts.new((r * math.cos(phase + 2 * math.pi * k / segs), r * math.sin(phase + 2 * math.pi * k / segs), z)) for k in range(segs)])
    for j in range(len(rings) - 1):
        a, b = rings[j], rings[j + 1]
        if len(a) == 1: [bm.faces.new([a[0], b[k], b[(k + 1) % segs]]) for k in range(segs)]
        elif len(b) == 1: [bm.faces.new([a[k], a[(k + 1) % segs], b[0]]) for k in range(segs)]
        else: [bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]]) for k in range(segs)]
    for f in bm.faces: f.smooth = True
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def band_xy(path, z, w, t):
    """a flat strap (w along Z, t across) swept along a 2D polyline in the XY plane at height z (open ends capped)"""
    bm = bmesh.new()
    n = len(path)
    rings = []
    for i in range(n):
        p = Vector(path[i])
        a, b = Vector(path[max(0, i - 1)]), Vector(path[min(n - 1, i + 1)])
        tg = (b - a).normalized(); nr = Vector((-tg.y, tg.x))
        rings.append([bm.verts.new((p.x + nr.x * u, p.y + nr.y * u, z + v)) for u, v in ((-t / 2, -w / 2), (t / 2, -w / 2), (t / 2, w / 2), (-t / 2, w / 2))])
    for i in range(n - 1):
        for k in range(4):
            f = bm.faces.new([rings[i][k], rings[i][(k + 1) % 4], rings[i + 1][(k + 1) % 4], rings[i + 1][k]]); f.smooth = False
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


def hexnut(P, c, axis, s=0.013, h=0.008):
    q = Vector((0, 0, 1)).rotation_difference(Vector(axis).normalized())
    P.add_bm(bm_cyl(s / 2, h, 6, 0.0012, 1), BOLT, Zv, Matrix.Translation(c) @ q.to_matrix().to_4x4())


def tube(P, mat, pts, r, segs=12):
    """a round tube along a polyline; a bent one is resampled so no side triangle runs longer than 5 x its width
    (long thin side triangles across a bend shade as streaks)"""
    pts = [Vector(p) for p in pts]
    if len(pts) > 2:
        step = 5 * 2 * math.pi * r / segs
        out = [pts[0]]
        for a, b in zip(pts, pts[1:]):
            n = max(1, math.ceil((b - a).length / step))
            out += [a.lerp(b, k / n) for k in range(1, n + 1)]
        pts = out
    P.add_bm(bm_tube_path(pts, r, segs), mat, None)


# ------------------------------------------------------------------------------------------------ posts
def pole(name, L, r=0.038):
    P = Part(name)
    P.add_bm(lathe([(0, -SINK), (r, -SINK), (r, L - 0.035), (0, L - 0.035)], 32), GALV, Zv)
    P.add_bm(lathe([(0, L - 0.035), (r, L - 0.035), (r + 0.003, L - 0.031), (r + 0.003, L - 0.01), (r + 0.001, L + 0.008), (r * 0.7, L + 0.022), (0, L + 0.027)], 32), CAP, Zv)
    return P.to_object(smooth_angle=40)


def plate_post():
    """the street-name plate's post + the two clamp brackets of the plate (2.6 m up, 0.04 m in front: -Y)"""
    P = Part("plate_post")
    r, L = 0.030, 2.95
    P.add_bm(lathe([(0, -SINK), (r, -SINK), (r, L - 0.03), (0, L - 0.03)], 28), GALV, Zv)
    P.add_bm(lathe([(0, L - 0.03), (r, L - 0.03), (r + 0.003, L - 0.027), (r + 0.003, L - 0.008), (r + 0.001, L + 0.007), (r * 0.7, L + 0.02), (0, L + 0.024)], 28), CAP, Zv)
    for zc in (2.52, 2.68):
        # strap from the bracket's left ear round the back of the post to the right ear
        path = [(-0.022, -0.031)] + [(math.cos(math.radians(a)) * (r + 0.003), math.sin(math.radians(a)) * (r + 0.003)) for a in range(215, -36, -14)] + [(0.022, -0.031)]
        P.add_bm(band_xy(path, zc, 0.03, 0.003), GALV, X)
        span(P, GALV, -0.03, 0.03, -0.0335, -0.0275, zc - 0.022, zc + 0.022, 0.0015, X)          # the bracket's flat (meets the plate's back)
        for x in (-0.022, 0.022): hexnut(P, Vector((x, -0.026, zc)), (0, 1, 0), 0.011, 0.006)
    return P.to_object(smooth_angle=40)


# ------------------------------------------------------------------------------------------------ sign plates
DEPTH, BEV, RAILD, POLE_R = 0.020, 0.0025, 0.025, 0.038
AXIS_Y = DEPTH + RAILD + POLE_R                        # 0.083 + the strap: the post axis behind the face
AXIS_Y = 0.088


def width_at(poly, z):
    """the outline's x extent at height z (convex)"""
    xs = []
    n = len(poly)
    for i in range(n):
        (x0, z0), (x1, z1) = poly[i], poly[(i + 1) % n]
        if (z0 - z) * (z1 - z) <= 0 and z0 != z1:
            xs.append(x0 + (x1 - x0) * (z - z0) / (z1 - z0))
    return (min(xs), max(xs)) if len(xs) >= 2 else (0, 0)


def plate(kind):
    P = Part("plate_" + kind)
    o = outline(kind)                                              # (x, up), CCW from the front
    oin = offset_poly(o, BEV)
    front = [(x, 0.0, z) for x, z in oin]
    mid = [(x, BEV, z) for x, z in o]
    back = [(x, DEPTH, z) for x, z in o]
    # front face (the printed sheet): CCW seen from -Y = normal -Y
    P.add_bm(ngon([(x, 0.0, z) for x, z in oin], (0, -1, 0)), FACE, X)
    P.add_bm(rings_strip(front, mid, False, RADIAL_XZ), BACK, Y)   # the bevel of the fold
    P.add_bm(rings_strip(mid, back, False, RADIAL_XZ), BACK, Y)    # the folded rim
    P.add_bm(ngon(back, (0, 1, 0)), BACK, X)                       # the back of the sheet
    # rails + clamps at two heights
    h = SHAPES[kind]["h"]
    if kind == "tri_down": zs = (0.12, -0.04)
    elif kind == "tri_up": zs = (0.04, -0.12)
    elif kind == "diamond": zs = (0.11, -0.11)
    elif kind == "rect": zs = (0.27, -0.27)
    else: zs = (0.15, -0.15)
    for zc in zs:
        x0, x1 = width_at(o, zc)
        L = min(x1 - x0 - 0.06, 0.52)
        span(P, RAIL, -L / 2, L / 2, DEPTH, DEPTH + RAILD - 0.004, zc - 0.02, zc + 0.02, 0.003, X)
        span(P, RAIL, -L / 2 - 0.004, L / 2 + 0.004, DEPTH + RAILD - 0.004, DEPTH + RAILD, zc - 0.028, zc + 0.028, 0.0015, X)   # the rail's flanges
        # the strap clamp: from the rail's flange round the far side of the post
        R = POLE_R + 0.003
        path = [(-0.05, DEPTH + RAILD + 0.002)] + [(math.cos(math.radians(a)) * R, AXIS_Y + math.sin(math.radians(a)) * R) for a in range(200, -21, -11)] + [(0.05, DEPTH + RAILD + 0.002)]
        P.add_bm(band_xy(path, zc, 0.03, 0.003), GALV, X)
        for x in (-0.045, 0.045): hexnut(P, Vector((x, DEPTH + RAILD + 0.003, zc)), (0, 1, 0))
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ Villo
def villo_totem():
    P = Part("villo_totem")
    W, D, H = 0.48, 0.30, 2.15
    # the ribbed section: a rounded rectangle whose sides / back carry 10 mm ribs (the front stays flat for the panel)
    sec = []
    r = 0.06
    def add_run(a, b, ribs):
        n = max(2, int((Vector(b) - Vector(a)).length / 0.012)) if ribs else 2
        for k in range(n):
            p = Vector(a).lerp(Vector(b), k / n)
            if ribs and k % 2 == 1:
                e = (Vector(b) - Vector(a)).normalized(); nrm = Vector((e.y, -e.x))
                p = p + nrm * 0.004
            sec.append(tuple(p))
    def add_arc(c, a0, a1):
        for k in range(6): a = math.radians(a0 + (a1 - a0) * k / 6); sec.append((c[0] + r * math.cos(a), c[1] + r * math.sin(a)))
    hw, hd = W / 2, D / 2
    # CCW seen from above: front is -Y
    sec.extend([(-hw + r, -hd), (-hw + r + 0.003, -hd), (hw - r - 0.003, -hd)]); add_arc((hw - r, -hd + r), 270, 360)
    add_run((hw, -hd + r), (hw, hd - r), True); add_arc((hw - r, hd - r), 0, 90)
    add_run((hw - r, hd), (-hw + r, hd), True); add_arc((-hw + r, hd - r), 90, 180)
    add_run((-hw, hd - r), (-hw, -hd + r), True); add_arc((-hw + r, -hd + r), 180, 270)
    lo = [(x, y, -0.12) for x, y in sec]; hi = [(x, y, H + 0.03) for x, y in sec]
    P.add_bm(rings_strip(lo, hi, False, RADIAL_XY), VBODY, Zv)
    P.add_bm(ngon([(x, y, H + 0.03) for x, y in sec], (0, 0, 1)), VBODY, X)
    # plinth band (darker foot, into the paving)
    span(P, VDARK, -hw - 0.006, hw + 0.006, -hd - 0.006, hd + 0.006, -0.12, 0.05, 0.004, X)
    # the head band (ochre) with its sloped cap; its front face carries the station strip (0.52 x 0.13)
    span(P, VHEAD, -0.265, 0.265, -hd - 0.012, hd + 0.005, H, H + 0.16, 0.004, X)
    # (its flat front face carries the station strip: the viewer maps it from the position, no separate face)
    P.add_bm(bm_box(0.55, D + 0.05, 0.03, 0.008, 2), VBODY, X, M((0, -0.004, H + 0.16 + 0.015)))
    # the dark oval panel on the front: a stadium, a silver bezel round it
    def stadium(w, h, zc, n=14):
        pts = []
        rr = w / 2
        for k in range(n + 1):
            a = math.pi * k / n; pts.append((rr * math.cos(a), zc + h / 2 - rr + rr * math.sin(a)))
        for k in range(n + 1):
            a = math.pi + math.pi * k / n; pts.append((rr * math.cos(a), zc - h / 2 + rr + rr * math.sin(a)))
        return pts
    st_o, st_i = stadium(0.40, 1.80, 1.12), stadium(0.36, 1.76, 1.12)
    # bezel: a ring strip from the outer stadium to the inner one, 10 mm proud
    P.add_bm(rings_strip([(x, -hd - 0.010, z) for x, z in st_o], [(x, -hd - 0.010, z) for x, z in st_i], False, lambda c: (0, -1, 0)), VBODY, Zv)
    P.add_bm(rings_strip([(x, -hd + 0.001, z) for x, z in st_o], [(x, -hd - 0.010, z) for x, z in st_o], False, lambda c: (c.x, 0, c.z - 1.12)), VBODY, Zv)
    P.add_bm(rings_strip([(x, -hd - 0.010, z) for x, z in st_i], [(x, -hd - 0.004, z) for x, z in st_i], False, lambda c: (-c.x, 0, 1.12 - c.z)), VBODY, Zv)
    P.add_bm(ngon([(x, -hd - 0.004, z) for x, z in st_i], (0, -1, 0)), VDARK, X)
    # on the panel: the screen in its bezel, card reader, keypad, the ticket slot, the info plate
    span(P, VDARK, -0.12, 0.12, -hd - 0.03, -hd - 0.004, 1.36, 1.56, 0.008, X)
    P.add_bm(ngon([(-0.1, -hd - 0.033, 1.38), (0.1, -hd - 0.033, 1.38), (0.1, -hd - 0.033, 1.54), (-0.1, -hd - 0.033, 1.54)], (0, -1, 0)), VSCREEN, X)
    span(P, VBODY, -0.05, 0.05, -hd - 0.04, -hd - 0.004, 1.12, 1.24, 0.01, X)                      # card reader
    span(P, VSCREEN, -0.03, 0.03, -hd - 0.044, -hd - 0.038, 1.16, 1.2, 0.002, X)                   # its lit window
    span(P, VBODY, 0.06, 0.13, -hd - 0.02, -hd - 0.004, 1.02, 1.12, 0.005, X)                       # keypad
    for i in range(3):
        for j in range(4):
            span(P, VDARK, 0.068 + i * 0.021, 0.082 + i * 0.021, -hd - 0.024, -hd - 0.019, 1.03 + j * 0.022, 1.044 + j * 0.022, 0.001, X)
    span(P, VDARK, -0.09, 0.03, -hd - 0.014, -hd - 0.004, 0.92, 0.945, 0.003, X)                   # ticket slot
    span(P, VBODY, -0.13, 0.13, -hd - 0.012, -hd - 0.004, 0.42, 0.78, 0.006, X)                     # lower info plate
    return P.to_object(smooth_angle=5)      # (faceted round corners: a 7.5 deg facet smoothed into the flat front bent its normals)


def villo_dock():
    P = Part("villo_dock")
    # the base rail section (0.85 m along X, abutting its neighbours), sunk skirt for the joins rule
    span(P, GALV, -0.425, 0.425, -0.17, 0.17, -0.08, 0.03, 0.003, X)
    for y in (-0.16, 0.16): span(P, GALV, -0.425, 0.425, y - 0.008, y + 0.008, 0.03, 0.045, 0.002, X)
    for x in (-0.3, 0.3): hexnut(P, Vector((x, 0.1, 0.03)), (0, 0, 1), 0.02, 0.01)
    # the post: an oval ribbed foot then the smooth upper body
    def oval_ring(z, a, b, ribs=False, n=28):
        pts = []
        for k in range(n):
            t = 2 * math.pi * k / n
            s = 1.0 + (0.035 if ribs and k % 2 else 0.0)
            pts.append((a * math.cos(t) * s, b * math.sin(t) * s, z))
        return pts
    rings = [oval_ring(0.02, 0.085, 0.07, True), oval_ring(0.55, 0.075, 0.062, True), oval_ring(0.56, 0.07, 0.058), oval_ring(0.80, 0.066, 0.056)]
    for a, b in zip(rings, rings[1:]): P.add_bm(rings_strip(a, b, True, RADIAL_XY), VBODY, Zv)
    # the head: a block leaning toward the bike (-Y) with the lock mouth
    head = M((0, -0.04, 0.86), (math.radians(-12), 0, 0))
    P.add_bm(bm_box(0.15, 0.2, 0.16, 0.02, 2), VBODY, X, head)
    P.add_bm(bm_box(0.09, 0.03, 0.07, 0.006, 2), VDARK, X, head @ M((0, -0.098, -0.01)))           # the lock mouth
    P.add_bm(bm_box(0.12, 0.13, 0.008, 0.002, 1), VDARK, X, head @ M((0, 0.01, 0.081)))            # the user panel on top
    P.add_bm(bm_cyl(0.007, 0.004, 10, 0.0), LED, Zv, head @ M((0.045, -0.07, 0.083)))              # the status lamp
    # the top cap of the body under the head
    P.add_bm(ngon(oval_ring(0.80, 0.066, 0.056), (0, 0, 1)), VBODY, X)
    return P.to_object(smooth_angle=35)


def wheel(P, yc, r=0.33, spokes=32):
    """a wheel in the YZ plane at (0, yc, r): tyre, rim, hub, spokes"""
    c = Vector((0, yc, r))
    rot = Matrix.Rotation(math.pi / 2, 4, "Y")
    P.add_bm(K.bm_torus(r - 0.022, 0.022, 36, 8), RUBBER, None, Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.add_bm(K.bm_torus(r - 0.05, 0.011, 36, 6, 1.0), CHROME, None, Matrix.Translation(c) @ Matrix.Rotation(math.pi / 2, 4, "Z"))
    P.add_bm(bm_cyl(0.025, 0.11, 16, 0.004), CHROME, Zv, Matrix.Translation(c + Vector((-0.055, 0, 0))) @ rot)
    for k in range(spokes):
        a = 2 * math.pi * k / spokes
        side = 0.045 if k % 2 else -0.045
        p0 = c + Vector((side, math.cos(a + 0.2) * 0.022, math.sin(a + 0.2) * 0.022))
        p1 = c + Vector((0, math.cos(a) * (r - 0.058), math.sin(a) * (r - 0.058)))
        P.add_bm(bm_tube_path([p0, p1], 0.0012, 3, cap=False), CHROME, None)


def sector_plate(P, mat, x, s, yc, zc, r0, r1, a0, a1, step, t=0.004):
    """a closed annular-sector plate (t thick, outward face toward +s x) in the YZ plane round (yc, zc), built of quads"""
    A = [math.radians(a) for a in range(a0, a1 + 1, step)]
    out = [(yc + math.cos(a) * r1, zc + math.sin(a) * r1) for a in A]
    inn = [(yc + math.cos(a) * r0, zc + math.sin(a) * r0) for a in A]
    for xx, nrm in ((x, s), (x - s * t, -s)):
        bm = bmesh.new()
        vo = [bm.verts.new((xx, y, z)) for y, z in out]; vi = [bm.verts.new((xx, y, z)) for y, z in inn]
        for k in range(len(A) - 1):
            f = bm.faces.new([vo[k], vo[k + 1], vi[k + 1], vi[k]]); f.normal_update()
            if f.normal.x * nrm < 0: f.normal_flip()
        P.add_bm(bm, mat, Y)
    ring = out + inn[::-1]
    cy = sum(p[0] for p in ring) / len(ring); cz = sum(p[1] for p in ring) / len(ring)
    rim = [(x, y, z) for y, z in ring]; rim2 = [(x - s * t, y, z) for y, z in ring]

    def away(c):
        # outward across the arcs, along the arc at the two end edges
        dy, dz = c.y - yc, c.z - zc
        rr = math.hypot(dy, dz)
        if abs(rr - r1) < 0.004: return (0, dy, dz)
        if abs(rr - r0) < 0.004: return (0, -dy, -dz)
        return (0, c.y - cy, c.z - cz)
    P.add_bm(rings_strip(rim, rim2, False, away), mat, Y)


def villo_bike():
    P = Part("villo_bike")
    R = 0.33
    yf, yr = 0.0, -1.12                        # front / rear axle (y), the bike runs toward -Y; origin = front contact
    wheel(P, yf, R); wheel(P, yr, R)
    bb = Vector((0, -0.70, 0.28))
    ht0, ht1 = Vector((0, -0.22, 0.62)), Vector((0, -0.27, 0.82))   # head tube bottom / top (head angle ~70 deg)
    st1 = Vector((0, -0.84, 0.78))                                   # seat tube top
    rax = Vector((0, yr, R)); fax = Vector((0, yf, R))
    # the step-through main tube (one big curve from the head tube down to the bottom bracket, clear of the front tyre)
    curve = [ht0, Vector((0, -0.33, 0.47)), Vector((0, -0.44, 0.34)), Vector((0, -0.57, 0.28)), bb]
    tube(P, FRAME, curve, 0.024, 18)
    tube(P, FRAME, [bb, Vector((0, -0.77, 0.53)), st1], 0.02, 18)
    tube(P, FRAME, [ht0 + (ht0 - ht1) * 0.15, ht1 + (ht1 - ht0) * 0.15], 0.026, 14)               # head tube
    span(P, FRAME, -0.066, 0.066, ht0.y - 0.03, ht0.y + 0.03, ht0.z - 0.05, ht0.z - 0.015, 0.006, X)    # fork crown (round the head tube's foot)
    for s in (-1, 1):
        tube(P, FRAME, [bb + Vector((s * 0.042, -0.04, 0)), rax + Vector((s * 0.058, 0, 0))], 0.011, 8)     # chain stays
        tube(P, FRAME, [st1 + Vector((s * 0.034, 0.0, -0.06)), rax + Vector((s * 0.058, 0, 0))], 0.009, 8)  # seat stays
        tube(P, FRAME, [Vector((s * 0.045, ht0.y, ht0.z - 0.045)), Vector((s * 0.05, -0.12, 0.47)), fax + Vector((s * 0.055, 0, 0))], 0.012, 8)  # fork
    # seat post + saddle
    tube(P, CHROME, [st1, Vector((0, -0.87, 0.93))], 0.013, 10)
    P.add_bm(bm_box(0.17, 0.27, 0.06, 0.015, 4), RUBBER, Y, M((0, -0.90, 0.965)))
    # stem, handlebar (swept back), grips
    tube(P, FRAME, [ht1, Vector((0, -0.27, 0.98))], 0.016, 10)
    bar = [Vector((-0.22, -0.36, 1.0)), Vector((-0.08, -0.27, 0.99)), Vector((0.08, -0.27, 0.99)), Vector((0.22, -0.36, 1.0))]
    tube(P, RUBBER, bar, 0.012, 18)
    for s in (-1, 1): tube(P, RUBBER, [Vector((s * 0.215, -0.355, 1.0)), Vector((s * 0.31, -0.46, 1.025))], 0.017, 14)
    span(P, RUBBER, -0.05, 0.05, -0.25, -0.21, 0.99, 1.04, 0.01, X)                               # the bar's centre block
    # the front basket: a wire frame on a carrier over the front wheel
    bx0, bx1, by0, by1, bz0, bz1 = -0.17, 0.17, -0.13, 0.17, 0.80, 1.02
    for z in (bz0, bz1):
        tube(P, FRAME, [Vector((bx0, by0, z)), Vector((bx1, by0, z)), Vector((bx1, by1, z)), Vector((bx0, by1, z)), Vector((bx0, by0, z))], 0.005, 6)
    for k in range(1, 8):
        x = bx0 + (bx1 - bx0) * k / 8
        tube(P, FRAME, [Vector((x, by1, bz0 + 0.004)), Vector((x, by1, bz1 - 0.004))], 0.0025, 4)
        tube(P, FRAME, [Vector((x, by0, bz0 + 0.004)), Vector((x, by0, bz1 - 0.004))], 0.0025, 4)
        tube(P, FRAME, [Vector((x, by0 + 0.004, bz0 - 0.003)), Vector((x, by1 - 0.004, bz0 - 0.003))], 0.0025, 4)
    for k in range(1, 7):
        y = by0 + (by1 - by0) * k / 7
        for x in (bx0, bx1): tube(P, FRAME, [Vector((x, y, bz0 + 0.004)), Vector((x, y, bz1 - 0.004))], 0.0025, 4)
    span(P, FRAME, -0.06, 0.06, by0 - 0.02, by0 + 0.02, 0.76, 0.80, 0.004, X)                     # the carrier block on the head tube
    for s in (-1, 1): tube(P, FRAME, [Vector((s * 0.12, 0.05, bz0 - 0.004)), Vector((s * 0.075, 0.01, 0.42))], 0.006, 6)   # basket stays
    span(P, REFL, -0.03, 0.03, by1 + 0.006, by1 + 0.012, 0.88, 0.94, 0.002, X)                     # front reflector plate
    # mudguards (arcs over the wheels) and the ochre skirt guards over the rear wheel (both sides, plain colour, no mark)
    for yc, a0, a1 in ((yf, 25, 165), (yr, 10, 175)):
        pts = [Vector((0, yc + math.cos(math.radians(a)) * (R + 0.03), R + math.sin(math.radians(a)) * (R + 0.03))) for a in range(a0, a1 + 1, 10)]
        P.add_bm(band_xy_yz(pts, 0.06, 0.003), FRAME, Y)
    for s in (-1, 1):
        sector_plate(P, OCHRE, s * 0.085, s, yr, R, 0.07, R + 0.02, 10, 140, 10)
    # the chain case (a long silver capsule from the chainring to the rear hub, right side), crank arms, pedals
    tube(P, FRAME, [bb + Vector((0.09, 0.06, 0)), rax + Vector((0.09, -0.04, 0))], 0.034, 12)
    for s, a in ((1, 0.6), (-1, 0.6 + math.pi)):
        x0 = s * 0.13
        p = bb + Vector((x0, math.cos(a) * 0.17, math.sin(a) * 0.17))
        tube(P, RUBBER, [bb + Vector((x0, 0, 0)), p], 0.011, 6)
        px = p.x + s * 0.05
        span(P, RUBBER, px - 0.045, px + 0.045, p.y - 0.035, p.y + 0.035, p.z - 0.012, p.z + 0.012, 0.004, X)
    P.add_bm(bm_cyl(0.022, 0.26, 18, 0.003), FRAME, Zv, Matrix.Translation(bb + Vector((-0.13, 0, 0))) @ Matrix.Rotation(math.pi / 2, 4, "Y"))   # the crank axle
    # rear reflector on the mudguard end, the front lamp on the carrier
    span(P, REFL, -0.03, 0.03, yr - 0.40, yr - 0.385, 0.50, 0.54, 0.003, X)
    P.add_bm(bm_cyl(0.028, 0.05, 12, 0.006), RUBBER, Y, M((0, by0 - 0.02, 0.72), (math.pi / 2, 0, 0)))
    return P.to_object(smooth_angle=28)     # (thin 6-10 sided tubes stay faceted: smoothed, their long sides streak)

def band_xy_yz(pts, w, t):
    """a strap (w along X, t across) along a polyline in the YZ plane"""
    bm = bmesh.new()
    n = len(pts)
    rings = []
    for i in range(n):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        tg = (b - a).normalized(); nr = Vector((0, -tg.z, tg.y))
        p = pts[i]
        rings.append([bm.verts.new(p + Vector((u, 0, 0)) + nr * v) for u, v in ((-w / 2, -t / 2), (w / 2, -t / 2), (w / 2, t / 2), (-w / 2, t / 2))])
    for i in range(n - 1):
        for k in range(4):
            f = bm.faces.new([rings[i][k], rings[i][(k + 1) % 4], rings[i + 1][(k + 1) % 4], rings[i + 1][k]]); f.smooth = k % 2 == 1
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update(); bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return bm


BUILDERS = [lambda: pole("sign_pole", 3.10), lambda: pole("sign_pole_tall", 3.60), plate_post] + \
           [(lambda k: (lambda: plate(k)))(k) for k in SHAPES] + [villo_totem, villo_dock, villo_bike]
objs = []
for b in BUILDERS:
    t = time.time()
    o = b()
    if ONLY and o.name not in ONLY: bpy.data.objects.remove(o); continue
    objs.append(o)
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}, size {tuple(round(v, 3) for v in o.dimensions)} ({time.time() - t:.1f}s)")

for o in objs: o["ao_weight"] = 0.35 if o.name == "villo_bike" else 1.0     # (the spokes: a lot of area for little sight)
layout = K.atlas_layout(objs)
for o in objs: K.lightmap_uv(o, layout[o.name], margin=0.004)
ao_png = os.path.join(OUT, "streetkit_ao.png")
if BAKE:
    ao_img = K.bake_ao(objs, ao_png, px=1024, samples=64, distance=0.5)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(objs, os.path.join(OUT, "streetkit.glb"))
info = {
    "asset": "Street kit: Belgian sign posts and plates, the street-name plate post, Villo totem / dock / bike (tools/blender/streetKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up; posts / totem / dock: origin on the ground; plates: origin = face centre, the post axis 0.088 m behind; bike: origin = front tyre contact, runs toward +Z",
}
json.dump(info, open(os.path.join(OUT, "streetkit.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.render.image_settings.color_mode = "RGB"
    so, cam = K.preview_setup(ao_img, sun_elev=34, sun_az=210)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    # signs on poles in a row, the Villo station
    names = [o.name for o in objs]
    ob = {o.name: o for o in objs}
    x = -4.0
    for k in SHAPES:
        if "plate_" + k not in ob: continue
        ob["plate_" + k].location = (x, -AXIS_Y, 2.65)
        x += 1.0
    if "sign_pole" in ob: ob["sign_pole"].location = (-4.0, 0, 0)
    if "sign_pole_tall" in ob: ob["sign_pole_tall"].location = (-3.0, 0, 0)
    for i, k in enumerate(list(SHAPES)[2:]):
        pass
    if "plate_post" in ob: ob["plate_post"].location = (4.0, 0, 0)
    if "villo_totem" in ob: ob["villo_totem"].location = (5.5, 0, 0)
    if "villo_dock" in ob: ob["villo_dock"].location = (6.6, 0, 0)
    if "villo_bike" in ob: ob["villo_bike"].location = (6.6, -0.42, 0)
    K.render(cam, os.path.join(PV, "streetkit_overview.jpg"), (0.5, -9.5, 2.6), (0.5, 0, 1.4), 30, (1800, 800))
    K.render(cam, os.path.join(PV, "streetkit_backs.jpg"), (-1.5, 4.5, 2.8), (-1.5, 0, 2.5), 30, (1600, 800))
    K.render(cam, os.path.join(PV, "streetkit_villo.jpg"), (8.2, -3.4, 1.5), (6.2, -0.6, 0.8), 32, (1400, 900))
    so.rotation_euler = (math.radians(82), 0, math.radians(120))
    K.render(cam, os.path.join(PV, "streetkit_grazing.jpg"), (-6.5, -2.6, 2.6), (-3.0, 0, 2.6), 40, (1400, 800))
print(f"done {time.time() - T0:.0f}s")
