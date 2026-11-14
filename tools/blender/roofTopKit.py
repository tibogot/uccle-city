"""ROOF-TOP KIT (docs/assets/ROOFS.md): what stands on Uccle's roofs, for the city's instanced pools (viewer/roofs/).
Blender 5.0, headless (not tools/blender/roofkit.py: that one lays real slates on the scripted heroes):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/roofTopKit.py -- models/roofs [--no-bake] [--previews]

The chimney STACK itself is procedural in JS (a brick box whose bricks are laid in world space by the shader, any size:
viewer/roofs/roofKit.js); this script builds what needs real modelling, each in THREE SCRIPTED LODs (no decimation):
  chimcap   the stack's head: two corbelled brick courses + a concrete cap slab with a weathered top and a drip
            (unit footprint x / z -0.5..0.5, scaled to the stack; y 0 = the stack's top, 0.25 = the cap's top)
  pot       a terracotta chimney pot (Brussels: plain tapered pots with a rolled rim and a collar), open, sooty inside;
            0.55 m, its foot 2 cm in the cap
  cowl      a steel gas-flue terminal (liner pipe + a conical rain cap on three straps)
  velux     a centre-pivot roof window lying on the slope: a flashing collar, the grey aluminium sash cladding, the pane,
            the top cover (unit 1 x 1 on the slope: x along the eave, +z up the slope; scaled 0.78-1.14 x 0.98-1.18);
            its underside 2 cm into the roof
  pv        a solar module, 1.0 x 1.7 m portrait (x 1.0, z 1.7), dark frame, the glass (its cells drawn by the shader
            from TEXCOORD_0 in metres), on two mounting rails over the roof, hooks into the roof
  pvframe   the flat-roof A-frame for one module in landscape (x 1.7 along the row, the north edge (-z) raised: 13 deg),
            with concrete ballast blocks
  cond      a split air-conditioning condenser (0.9 x 0.72 x 0.35) with its fan grille, on two rubber-footed rails
  ahu       a rooftop air-handling unit (2.6 x 1.2 x 1.3), louvred panels, two fan outlets on top, base frame
  vent      a soil / extract vent pipe with a rubber flashing boot and a hat
  ventbox   a square louvred extract box on an upstand
  hatch     a roof access hatch: upstand (membrane dressed up it), the aluminium lid with ribs, hinges, handle
  dome      an opal acrylic rooflight dome on its upstand and aluminium ring
  skylight  a flat glazed rooflight (3 deg fall) on an upstand
  dish      a satellite dish (0.7 m offset dish) on a 1.1 m mast with a stay, on a ballast frame (flat roofs); it looks
            along +z, 30 deg up (the satellites over the equator seen from Brussels)
Frames (glTF Y up: Blender -Y = three.js +Z): every piece's origin is the roof surface under its centre (y 0); what meets
the roof goes 2-3 cm into it (JOINS). Slots by NAME only (no baked colour): brick, cap, clay, soot, steel, alu, glass,
pv_cell, pv_frame, hvac, grille, upstand, opal, concrete, dish, rubber. AO: Cycles, baked per VERTEX (COLOR_0) with the
piece on a ground plane (the roof).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/roofs")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)

BRICK = K.mat("brick", (0.2, 0.07, 0.045), 0.85)
CAP = K.mat("cap", (0.4, 0.39, 0.36), 0.85)
CLAY = K.mat("clay", (0.36, 0.13, 0.06), 0.8)
SOOT = K.mat("soot", (0.02, 0.02, 0.02), 0.9)
STEEL = K.mat("steel", (0.32, 0.33, 0.34), 0.45, 0.8)
ALU = K.mat("alu", (0.12, 0.125, 0.13), 0.5, 0.6)
GLASS = K.mat("glass", (0.02, 0.025, 0.03), 0.08)
PVC = K.mat("pv_cell", (0.015, 0.02, 0.04), 0.15)
PVF = K.mat("pv_frame", (0.03, 0.03, 0.03), 0.4, 0.6)
HVAC = K.mat("hvac", (0.62, 0.61, 0.58), 0.6)
GRILLE = K.mat("grille", (0.04, 0.04, 0.045), 0.6, 0.5)
UPSTAND = K.mat("upstand", (0.05, 0.05, 0.055), 0.9)
OPAL = K.mat("opal", (0.7, 0.7, 0.68), 0.3)
CONC = K.mat("concrete", (0.38, 0.37, 0.35), 0.9)
DISH = K.mat("dish", (0.6, 0.6, 0.6), 0.5)
RUBBER = K.mat("rubber", (0.02, 0.02, 0.02), 0.9)


# ------------------------------------------------------------------------------------------------ helpers
def lathe(profile, segs, cap0=False, cap1=False):
    """a surface of revolution about +Z: profile [(r, z)] bottom to top (r 0 = on the axis: a point); returns bmesh"""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r <= 1e-6: rings.append([bm.verts.new((0, 0, z))]); continue
        rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        if len(a) == 1 and len(b) == 1: continue
        if len(a) == 1:
            for k in range(segs): bm.faces.new([a[0], b[k], b[(k + 1) % segs]][::-1])
        elif len(b) == 1:
            for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[0]])
        else:
            for k in range(segs): bm.faces.new([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]])
    if cap0 and len(rings[0]) > 1: bm.faces.new(list(reversed(rings[0])))
    if cap1 and len(rings[-1]) > 1: bm.faces.new(rings[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    return bm


def box(P, mat, cx, cy, cz, sx, sy, sz, bevel=0.0, segs=1, grain=X):
    """a box centred at (cx, cy, cz) (Blender: z up), its edges chamfered (one flat facet: no smooth normals bleed
    into the flat faces, docs/mesh audit 'bentflat')"""
    bm = bm_box(sx, sy, sz, bevel, 1)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, grain, M((cx, cy, cz)))


def lid_box(P, mat, cx, cy, z0, sx, sy, sz, grain=X):
    """a box with no bottom face (the far LODs: what stands on something never shows its underside): 10 triangles"""
    bm = bm_box(sx, sy, sz, 0.0, 1)
    for f in [f for f in bm.faces if f.normal.z < -0.9]: bm.faces.remove(f)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, grain, M((cx, cy, z0 + sz / 2)))


def slab_chamfer(sx, sy, h, ch):
    """a slab sx x sy x h (z 0..h) whose top is weathered (chamfered by ch toward the edges), with a drip line under
    the oversail (a ring of vertices 1.2 cm in)"""
    bm = bmesh.new()
    hx, hy = sx / 2, sy / 2
    ring = lambda ox, oy, z: [bm.verts.new((x, y, z)) for x, y in ((-ox, -oy), (ox, -oy), (ox, oy), (-ox, oy))]
    r0 = ring(hx - 0.012, hy - 0.012, 0.0)
    r1 = ring(hx, hy, 0.0)
    r2 = ring(hx, hy, h - ch)
    r3 = ring(hx - ch * 1.6, hy - ch * 1.6, h)
    for a, b in ((r1, r2), (r2, r3)):
        for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]])
    for k in range(4): bm.faces.new([r1[k], r0[k], r0[(k + 1) % 4], r1[(k + 1) % 4]])
    bm.faces.new(list(reversed(r0))); bm.faces.new(r3)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    return bm


# ------------------------------------------------------------------------------------------------ the pieces
def chimcap(lod):
    """unit footprint (x, y -0.5..0.5 in Blender), z 0 = the stack top: two corbelled courses (brick), the cap slab"""
    P = Part(f"chimcap_lod{lod}")
    c1, c2 = 0.035, 0.065                               # the courses oversail 3.5 / 6.5 cm (relative: the unit is scaled)
    if lod == 2:                                        # far: the head as one open-bottom block (10 tris)
        lid_box(P, CAP, 0, 0, 0.0, 1 + 2 * c2 + 0.08, 1 + 2 * c2 + 0.08, 0.25)
        return P.to_object(smooth_angle=30)
    bev = 0.006 if lod == 0 else 0.0
    box(P, BRICK, 0, 0, 0.0375, 1 + 2 * c1, 1 + 2 * c1, 0.075, bev, 1)
    box(P, BRICK, 0, 0, 0.1125 + 0.0005, 1 + 2 * c2, 1 + 2 * c2, 0.074, bev, 1)
    # the cap slab: oversails the top course by 4 cm, 10 cm thick, its top weathered toward the edges
    if lod < 2:
        P.add_bm(slab_chamfer(1 + 2 * c2 + 0.08, 1 + 2 * c2 + 0.08, 0.1, 0.025), CAP, X, M((0, 0, 0.15)))
    else:
        box(P, CAP, 0, 0, 0.2, 1 + 2 * c2 + 0.08, 1 + 2 * c2 + 0.08, 0.1)
    return P.to_object(smooth_angle=30)


def pot(lod):
    """terracotta pot: foot at z 0 (2 cm in the cap's mortar), 0.55 m, a collar band, a rolled rim, open with a sooty
    plug inside"""
    P = Part(f"pot_lod{lod}")
    segs = (16, 8, 5)[lod]
    if lod == 0:
        prof = [(0.0, 0.0), (0.125, 0.0), (0.13, 0.06), (0.118, 0.075), (0.112, 0.4), (0.108, 0.48), (0.118, 0.5), (0.122, 0.53), (0.116, 0.55), (0.095, 0.55), (0.095, 0.42), (0.0, 0.42)]
    elif lod == 1:
        prof = [(0.0, 0.0), (0.125, 0.0), (0.12, 0.07), (0.11, 0.47), (0.12, 0.53), (0.096, 0.55), (0.095, 0.46), (0.0, 0.46)]
    else:
        prof = [(0.122, 0.0), (0.11, 0.55), (0.0, 0.53)]
    bm = lathe(prof, segs)
    P.add_bm(bm, CLAY, Zv)
    if lod == 0:   # a sooty disc a little over the inner floor (the flue seen from above)
        P.add_bm(lathe([(0.0, prof[-1][1] + 0.004), (0.09, prof[-1][1] + 0.004)][::-1], segs), SOOT, Zv)
    return P.to_object(smooth_angle=50)


def cowl(lod):
    P = Part(f"cowl_lod{lod}")
    segs = (14, 8, 6)[lod]
    P.add_bm(lathe([(0.0, 0.0), (0.075, 0.0), (0.075, 0.6), (0.0, 0.6)], segs), STEEL, Zv)
    if lod < 2:
        P.add_bm(lathe([(0.0, 0.68), (0.165, 0.645), (0.17, 0.66), (0.0, 0.7)], segs), STEEL, Zv)      # the rain cap
        for k in range(3):
            a = 2 * math.pi * k / 3
            box(P, STEEL, 0.07 * math.cos(a), 0.07 * math.sin(a), 0.635, 0.012, 0.012, 0.09)
        if lod == 0: P.add_bm(lathe([(0.075, 0.0), (0.088, 0.0), (0.088, 0.05), (0.075, 0.06)], segs), STEEL, Zv)   # the collar
    else:
        P.add_bm(lathe([(0.0, 0.64), (0.17, 0.65), (0.0, 0.7)], segs), STEEL, Zv)
    return P.to_object(smooth_angle=40)


def velux(lod):
    """unit 1 x 1 on the slope (Blender: x along the eave, -y = up the slope (three +z), z = the slope normal)"""
    P = Part(f"velux_lod{lod}")
    if lod == 2:                                        # far: an open-bottom block + the pane on it (12 tris)
        lid_box(P, ALU, 0, 0, -0.02, 1.0, 1.0, 0.11)
        bm = bmesh.new(); vs = [bm.verts.new((x, y, 0.094)) for x, y in ((-0.4, -0.35), (0.4, -0.35), (0.4, 0.39), (-0.4, 0.39))]
        bm.faces.new(vs); P.add_bm(bm, GLASS, X)
        return P.to_object()
    # the flashing collar, sloping from the roof (z -0.02) up to the frame (z 0.06), closed underneath
    bm = bmesh.new()
    def rect(hx, hy, z): return [bm.verts.new((x, y, z)) for x, y in ((-hx, -hy), (hx, -hy), (hx, hy), (-hx, hy))]
    r0, r1, r2 = rect(0.52, 0.52, -0.02), rect(0.5, 0.5, 0.02), rect(0.47, 0.47, 0.06)
    for a, b in ((r0, r1), (r1, r2)):
        for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]])
    bm.faces.new(list(reversed(r0)))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, ALU, X)
    # the sash cladding: a frame 7 cm wide from z 0.06 to 0.1, the pane 1.5 cm below its top
    w = 0.07
    bev = 0.008 if lod == 0 else 0.0
    box(P, ALU, 0, 0.47 - w / 2, 0.08, 0.94, w, 0.05, bev)                         # the bottom rail (down the slope: Blender +y)
    box(P, ALU, 0, -0.47 + w / 2 + 0.005, 0.085, 0.95, w + 0.02, 0.06, bev)         # the top rail (+ the top cover)
    box(P, ALU, -0.47 + w / 2 + 0.002, 0, 0.08, w - 0.004, 0.94 - 2 * w + 0.01, 0.046, bev)   # (4 mm in from the rails' ends, 2 mm lower)
    box(P, ALU, 0.47 - w / 2 - 0.002, 0, 0.08, w - 0.004, 0.94 - 2 * w + 0.01, 0.046, bev)
    box(P, GLASS, 0, 0.0, 0.0875, 0.94 - 2 * w + 0.012, 0.94 - 2 * w + 0.012, 0.025)
    if lod == 0:   # the vent bar / handle along the top rail
        box(P, ALU, 0, -0.47 + w / 2, 0.118, 0.6, 0.03, 0.008, 0.003)
    return P.to_object(smooth_angle=20)


def pv(lod):
    """1.0 (x) x 1.7 (three z = Blender -y) module; the glass top at z 0.103, frame 35 mm, on two rails"""
    P = Part(f"pv_lod{lod}")
    W, L, t = 1.0, 1.7, 0.035
    z0 = 0.07
    if lod == 2:                                        # far: a block down to the roof + the glass on it (12 tris)
        lid_box(P, PVF, 0, 0, -0.01, W, L, z0 + t + 0.01)
        bm = bmesh.new(); vs = [bm.verts.new((x, y, z0 + t + 0.004)) for x, y in ((-W / 2 + 0.03, -L / 2 + 0.03), (W / 2 - 0.03, -L / 2 + 0.03), (W / 2 - 0.03, L / 2 - 0.03), (-W / 2 + 0.03, L / 2 - 0.03))]
        bm.faces.new(vs); P.add_bm(bm, PVC, X)
        return P.to_object()
    f = 0.03
    bev = 0.003 if lod == 0 else 0.0
    box(P, PVF, 0, L / 2 - f / 2, z0 + t / 2, W, f, t, bev)
    box(P, PVF, 0, -L / 2 + f / 2, z0 + t / 2, W, f, t, bev)
    box(P, PVF, W / 2 - f / 2 - 0.002, 0, z0 + t / 2, f - 0.004, L - 2 * f + 0.006, t - 0.004, bev)   # (inset 4 / 2 mm)
    box(P, PVF, -W / 2 + f / 2 + 0.002, 0, z0 + t / 2, f - 0.004, L - 2 * f + 0.006, t - 0.004, bev)
    box(P, PVC, 0, 0, z0 + t / 2 + 0.006, W - 2 * f + 0.006, L - 2 * f + 0.003, t - 0.012 + 0.002)   # the laminate: glass top 2 mm under the frame's
    # two rails across the module (along x) on hooks into the roof
    for y in (-0.45, 0.45):
        box(P, STEEL, 0, y, z0 - 0.0195, W + 0.08, 0.04, 0.04, 0.004 if lod == 0 else 0.0)
        if lod == 0:
            for x in (-0.35, 0.35):
                box(P, STEEL, x, y + 0.03, 0.01, 0.03, 0.02, 0.07)
    return P.to_object(smooth_angle=20)


def pvframe(lod):
    """three x = Blender x (1.7 along the row); the north edge (three -z = Blender +y) raised: the module plane 13 deg.
    Two side frames (a base rail on the roof, a front and a rear post, an inclined rail), two purlins along the row on
    them, ballast blocks. The module (pv) is placed on it separately: its rails (which run up the tilt) rest on the
    purlins, whose tops lie on the plane z = 0.3 + y tan 13 deg (Blender), so the module origin goes 0.27 m up"""
    P = Part(f"pvframe_lod{lod}")
    tl = math.radians(13)
    top = lambda y: 0.3 + y * math.tan(tl)              # the purlins' top plane
    bv = 0.003 if lod == 0 else 0.0
    rot = Matrix.Rotation(tl, 4, "X")
    for x in (-0.72, 0.72):
        box(P, ALU, x, 0, 0.0, 0.04, 1.15, 0.04, bv)                              # the base rail on the roof (2 cm into it)
        for y in (-0.42, 0.42):                                                    # front / rear posts up to the inclined rail
            h = top(y) - 0.08
            box(P, ALU, x, y, (h + 0.02) / 2, 0.03, 0.03, h - 0.02 + 0.005)
        # the inclined rail (its top 4 cm under the purlins' plane)
        ib = bm_box(0.034, 1.0, 0.04, bv, 1)
        for f in ib.faces: f.smooth = False
        P.add_bm(ib, ALU, Y, Matrix.Translation((x, 0, top(0) - 0.04 - 0.02 / math.cos(tl))) @ rot)
        if lod < 2:   # the ballast: two concrete blocks on the base rail
            for y in (-0.3, 0.3):
                box(P, CONC, x, y, 0.05, 0.22, 0.2, 0.06, 0.004 if lod == 0 else 0.0)
    for y in (-0.3, 0.3):                                                          # the purlins along the row
        pb = bm_box(1.62, 0.04, 0.04, bv, 1)
        for f in pb.faces: f.smooth = False
        P.add_bm(pb, ALU, X, Matrix.Translation((0, y, top(y) - 0.02 / math.cos(tl))) @ rot)
    return P.to_object(smooth_angle=20)


def cond(lod):
    """0.9 (x) x 0.35 (depth: three z) x 0.72 high on two rails 0.1 high; the fan grille on the front (three +z =
    Blender -y)"""
    P = Part(f"cond_lod{lod}")
    W, D, H, z0 = 0.9, 0.35, 0.72, 0.1
    bev = 0.012 if lod == 0 else 0.0
    box(P, HVAC, 0, 0, z0 + H / 2, W, D, H, bev, 1)
    for x in (-0.3, 0.3):
        box(P, STEEL, x, 0, z0 / 2 - 0.005, 0.05, 0.5, z0 + 0.01, 0.004 if lod == 0 else 0.0)
    if lod < 2:
        segs = 24 if lod == 0 else 12
        cz = z0 + H * 0.52
        # the fan grille: a dark disc 1 cm proud of the front
        P.add_bm(bm_cyl(0.26, 0.012, segs, 0.0), GRILLE, Zv, M((-0.1, -D / 2 + 0.002, cz), (math.pi / 2, 0, 0)))
        if lod == 0:
            for rr in (0.08, 0.15, 0.22):
                P.add_bm(K.bm_torus(rr, 0.005, 24, 4), GRILLE, X, M((-0.1, -D / 2 - 0.014, cz)))
            for a in range(4):
                P.add_bm(bm_box(0.5, 0.006, 0.008), GRILLE, X, M((-0.1, -D / 2 - 0.016, cz), (0, a * math.pi / 4, 0)))
            for k in range(6):   # the side louvres
                box(P, GRILLE, W / 2 + 0.003, 0, z0 + 0.15 + k * 0.08, 0.008, D * 0.7, 0.02)
            box(P, HVAC, W / 2 - 0.08, -D / 2 - 0.03, z0 + 0.18, 0.12, 0.07, 0.2, 0.01)   # the pipe cover
    return P.to_object(smooth_angle=30)


def ahu(lod):
    P = Part(f"ahu_lod{lod}")
    W, D, H, z0 = 2.6, 1.3, 1.2, 0.12
    bev = 0.02 if lod == 0 else 0.0
    box(P, HVAC, 0, 0, z0 + H / 2, W, D, H, bev, 1)
    box(P, STEEL, 0, 0, z0 / 2 - 0.01, W + 0.06, D + 0.06, z0 + 0.02, 0.006 if lod == 0 else 0.0)        # the base frame
    if lod < 2:
        segs = 24 if lod == 0 else 12
        for x in (-0.6, 0.6):
            P.add_bm(lathe([(0.33, z0 + H - 0.01), (0.36, z0 + H - 0.01), (0.36, z0 + H + 0.12), (0.33, z0 + H + 0.12)], segs), HVAC, Zv, M((x, 0, 0)))
            P.add_bm(lathe([(0.0, z0 + H + 0.05), (0.33, z0 + H + 0.05)][::-1], segs), GRILLE, Zv, M((x, 0, 0)))
        n = 10 if lod == 0 else 5
        for sgn in (-1, 1):
            for k in range(n):
                box(P, GRILLE, -0.35, sgn * (D / 2 + 0.006), z0 + 0.25 + k * (0.7 / n), 1.4, 0.012, 0.025)
        if lod == 0:
            for x in (0.75, 1.05):
                box(P, STEEL, x, -D / 2 - 0.012, z0 + 0.6, 0.03, 0.02, 0.15)
    return P.to_object(smooth_angle=30)


def vent(lod):
    P = Part(f"vent_lod{lod}")
    segs = (14, 8, 6)[lod]
    if lod < 2:
        P.add_bm(lathe([(0.17, -0.02), (0.17, 0.0), (0.075, 0.1), (0.055, 0.12)], segs), RUBBER, Zv)        # the flashing boot
    P.add_bm(lathe([(0.055, -0.02), (0.055, 0.62), (0.0, 0.62)], segs), STEEL, Zv)
    if lod < 2:
        P.add_bm(lathe([(0.0, 0.69), (0.128, 0.645), (0.13, 0.66), (0.0, 0.74)], segs), STEEL, Zv)          # the hat
        for k in range(3):
            a = 2 * math.pi * k / 3 + 0.4
            box(P, STEEL, 0.05 * math.cos(a), 0.05 * math.sin(a), 0.64, 0.01, 0.01, 0.07)
    else:
        P.add_bm(lathe([(0.0, 0.65), (0.13, 0.66), (0.0, 0.72)], segs), STEEL, Zv)
    return P.to_object(smooth_angle=40)


def ventbox(lod):
    P = Part(f"ventbox_lod{lod}")
    bev = 0.006 if lod == 0 else 0.0
    box(P, UPSTAND, 0, 0, 0.055, 0.62, 0.62, 0.17, bev)
    box(P, ALU, 0, 0, 0.14 + 0.2, 0.5, 0.45, 0.4, bev)
    bm = bmesh.new()                                     # the sloping hood
    vs = [bm.verts.new(v) for v in ((-0.29, -0.27, 0.53), (0.29, -0.27, 0.53), (0.29, 0.27, 0.6), (-0.29, 0.27, 0.6),
                                    (-0.29, -0.27, 0.56), (0.29, -0.27, 0.56), (0.29, 0.27, 0.63), (-0.29, 0.27, 0.63))]
    for f in ((0, 3, 2, 1), (4, 5, 6, 7), (0, 1, 5, 4), (1, 2, 6, 5), (2, 3, 7, 6), (3, 0, 4, 7)): bm.faces.new([vs[i] for i in f])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, ALU, X)
    if lod < 2:
        for sgn in (-1, 1):
            for k in range(5 if lod == 0 else 3):
                box(P, GRILLE, 0, sgn * 0.231, 0.22 + k * 0.06, 0.4, 0.012, 0.025)
    return P.to_object(smooth_angle=25)


def upstand(P, sx, sy, h, lod):
    """a rooflight's / hatch's upstand from 3 cm under the roof (JOINS) to h, its top edge rounded at LOD0"""
    box(P, UPSTAND, 0, 0, (h - 0.03) / 2, sx, sy, h + 0.03, 0.015 if lod == 0 else 0.0, 1)


def hatch(lod):
    P = Part(f"hatch_lod{lod}")
    upstand(P, 1.0, 1.0, 0.32, lod)
    bev = 0.01 if lod == 0 else 0.0
    box(P, ALU, 0, 0, 0.32 + 0.045, 1.08, 1.08, 0.09, bev, 1)
    if lod < 2:
        for x in (-0.25, 0.0, 0.25): box(P, ALU, x, 0, 0.32 + 0.094, 0.05, 1.0, 0.012, 0.004 if lod == 0 else 0.0)     # ribs
        for x in (-0.35, 0.35): box(P, STEEL, x, 0.55, 0.37, 0.1, 0.04, 0.04)                                          # hinges
        box(P, STEEL, 0, -0.555, 0.37, 0.14, 0.04, 0.03)                                                               # handle
    return P.to_object(smooth_angle=30)


def dome(lod):
    P = Part(f"dome_lod{lod}")
    if lod == 2:                                        # far: the upstand block + a low pyramid (14 tris)
        lid_box(P, UPSTAND, 0, 0, -0.03, 1.04, 1.04, 0.32)
        bm = bmesh.new(); c = [bm.verts.new((x, y, 0.29)) for x, y in ((-0.49, -0.49), (0.49, -0.49), (0.49, 0.49), (-0.49, 0.49))]
        a = bm.verts.new((0, 0, 0.5))
        for k in range(4): bm.faces.new([c[k], c[(k + 1) % 4], a])
        for f in bm.faces: f.smooth = False
        P.add_bm(bm, OPAL, Zv)
        return P.to_object(smooth_angle=30)
    upstand(P, 1.0, 1.0, 0.25, lod)
    box(P, ALU, 0, 0, 0.27, 1.04, 1.04, 0.04, 0.006 if lod == 0 else 0.0)
    # the dome: a square-based bubble (a superellipse outline) rising 0.22 from the ring's top
    n = (10, 6, 3)[lod]
    m4 = 4 * n
    bm = bmesh.new()
    rows = []
    for j in range(n):
        a = j / n
        s = math.cos(a * math.pi / 2)
        z = 0.289 + 0.22 * math.sin(a * math.pi / 2)
        ring = []
        for k in range(m4):
            t = k / m4 * 2 * math.pi
            c, si = math.cos(t), math.sin(t)
            m = (abs(c) ** 4 + abs(si) ** 4) ** -0.25
            ring.append(bm.verts.new((0.49 * s * c * m, 0.49 * s * si * m, z)))
        rows.append(ring)
    top = bm.verts.new((0, 0, 0.289 + 0.22))
    for j in range(n - 1):
        a, b = rows[j], rows[j + 1]
        for k in range(m4): bm.faces.new([a[k], a[(k + 1) % m4], b[(k + 1) % m4], b[k]])
    last = rows[n - 1]
    for k in range(m4): bm.faces.new([last[k], last[(k + 1) % m4], top])
    bm.faces.new(list(reversed(rows[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, OPAL, Zv)
    return P.to_object(smooth_angle=30)


def skylight(lod):
    P = Part(f"skylight_lod{lod}")
    upstand(P, 1.0, 1.0, 0.2, lod)
    fall = math.radians(3)
    rot = Matrix.Rotation(-fall, 4, "X")
    P.add_bm(bm_box(1.06, 1.06, 0.06, 0.008 if lod == 0 else 0.0, 1), ALU, X, Matrix.Translation((0, 0, 0.225)) @ rot)
    P.add_bm(bm_box(0.92, 0.92, 0.02, 0.0), GLASS, X, Matrix.Translation((0, 0, 0.25)) @ rot)
    return P.to_object(smooth_angle=20)


def dish(lod):
    """the dish looks along three +z (Blender -y), 30 deg up; mast 1.1 m on a ballast frame"""
    P = Part(f"dish_lod{lod}")
    segs = (20, 12, 6)[lod]
    box(P, STEEL, 0, 0, 0.01, 0.9, 0.05, 0.04)
    box(P, STEEL, 0, 0.2375, 0.01, 0.05, 0.425, 0.04); box(P, STEEL, 0, -0.2375, 0.01, 0.05, 0.425, 0.04)
    if lod < 2:
        for x, y in ((0.32, 0), (-0.32, 0), (0, 0.32), (0, -0.32)):
            box(P, CONC, x, y, 0.06, 0.22, 0.22, 0.06, 0.004 if lod == 0 else 0.0)
    P.add_bm(lathe([(0.0, 0.03), (0.025, 0.03), (0.025, 1.1), (0.0, 1.1)], (10, 6, 4)[lod]), STEEL, Zv)
    if lod < 2:   # the stay
        P.add_bm(K.bm_tube_path([Vector((0, 0.3, 0.06)), Vector((0, 0.022, 0.7))], 0.01, 6), STEEL, Zv)
    # the dish: a shallow paraboloid shell (0.7 x 0.64), its axis 30 deg up toward Blender -y
    m = Matrix.Translation((0, -0.12, 0.95)) @ Matrix.Rotation(math.radians(90 - 30), 4, "X") @ Matrix.Rotation(math.pi, 4, "Z")
    prof = [(0.0, 0.06), (0.12, 0.052), (0.24, 0.035), (0.35, 0.0)] if lod < 2 else [(0.0, 0.05), (0.35, 0.0)]
    bm = bmesh.new()
    def shell(off, flip):
        rings = []
        for r, z in prof:
            if r < 1e-6: rings.append([bm.verts.new((0, 0, z - off))]); continue
            rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / segs), 0.92 * r * math.sin(2 * math.pi * k / segs), z - off)) for k in range(segs)])
        for i in range(len(rings) - 1):
            a, b = rings[i], rings[i + 1]
            for k in range(segs):
                f = [a[0], b[k], b[(k + 1) % segs]] if len(a) == 1 else [a[k], b[k], b[(k + 1) % segs], a[(k + 1) % segs]]
                bm.faces.new(f[::-1] if flip else f)
        return rings[-1]
    e1 = shell(0.0, False); e2 = shell(0.006, True)
    rim = [bm.faces.new([e1[k], e1[(k + 1) % segs], e2[(k + 1) % segs], e2[k]]) for k in range(segs)]
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    for f in rim: f.smooth = False
    bm.transform(m)
    P.add_bm(bm, DISH, Zv)
    box(P, STEEL, 0, -0.06, 0.95, 0.06, 0.14, 0.06)            # the dish's bracket to the mast
    if lod < 2:   # the LNB arm and head
        a = m @ Vector((0, -0.31, 0.01)); b = m @ Vector((0, -0.02, 0.42))
        P.add_bm(K.bm_tube_path([a, b], 0.008, 6), STEEL, Zv)
        P.add_bm(bm_box(0.05, 0.05, 0.1, 0.006 if lod == 0 else 0.0, 1), RUBBER, Zv, Matrix.Translation(b))
    return P.to_object(smooth_angle=32)


BUILD = [chimcap, pot, cowl, velux, pv, pvframe, cond, ahu, vent, ventbox, hatch, dome, skylight, dish]
objs = []
for lod in (0, 1, 2):
    for f in BUILD: objs.append(f(lod))
for o in objs: print(f"{o.name}: {K.tris(o)} tris, size {tuple(round(v, 3) for v in o.dimensions)}")


def bake_vertex_ao(objs):
    """Cycles AO per vertex into 'Col' (COLOR_0), each piece alone on what it stands on: contact darkening"""
    scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 64
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 0.5
    t = time.time()
    for o in objs:
        me = o.data
        me.color_attributes.new("Col", "BYTE_COLOR", "POINT")
        me.color_attributes.active_color = me.color_attributes["Col"]
        stand = []
        if o.name.startswith(("pot", "cowl")):         # on the cap slab (1.2 x 0.8)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.05)); c = bpy.context.active_object; c.scale = (1.2, 0.8, 0.1); stand.append(c)
        elif o.name.startswith("chimcap"):            # on the stack
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0, 0, -0.75)); c = bpy.context.active_object; c.scale = (1.0, 1.0, 1.5); stand.append(c)
        else:
            bpy.ops.mesh.primitive_plane_add(size=8, location=(0, 0, 0)); stand.append(bpy.context.active_object)
        # every other piece out of the render: they all sit at the origin (baked together they occluded each other:
        # AO ~ 0 everywhere)
        for x in objs: x.hide_render = x is not o
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        for c in stand: bpy.data.objects.remove(c)
    for x in objs: x.hide_render = False
    print(f"AO baked {time.time() - t:.0f}s")


if BAKE: bake_vertex_ao(objs)
K.export_glb(objs, os.path.join(OUT, "roofkit.glb"), colors=BAKE)
info = {
    "asset": "Roof-top kit: chimney heads, pots, flue cowls, roof windows, solar modules + flat-roof frames, AC condensers, air-handling units, vents, hatches, rooflights, satellite dishes (tools/blender/roofTopKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up; origin = the roof surface under the piece's centre; chimcap: y 0 = the stack top; pot / cowl: y 0 = the cap's top",
    "ao": "COLOR_0 (Cycles AO per vertex, on what the piece stands on)" if BAKE else "none (--no-bake)",
}
json.dump(info, open(os.path.join(OUT, "roofkit.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    blank = bpy.data.images.new("blank", 8, 8); blank.pixels = [1.0] * 256
    for o in objs:
        if "Lightmap" not in o.data.uv_layers: o.data.uv_layers.new(name="Lightmap")
    so, cam = K.preview_setup(blank, sun_elev=38, sun_az=210)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    names = [f.__name__ for f in BUILD]
    for o in objs:
        lod = int(o.name[-1]); i = names.index(o.name.rsplit("_lod", 1)[0])
        o.location = ((i % 7) * 3.2, (i // 7) * 3.2 + lod * 9.0, 0)
    K.render(cam, os.path.join(PV, "roofkit_lod0.jpg"), (9.6, -7.0, 4.0), (9.6, 1.6, 0.3), 30, (1800, 900))
    K.render(cam, os.path.join(PV, "roofkit_lods.jpg"), (9.6, -14.0, 14.0), (9.6, 10.0, 0.3), 30, (1800, 1100))
print(f"done {time.time() - T0:.0f}s")
