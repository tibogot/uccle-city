"""SHOPFRONT KIT (docs/assets/SHOPS.md): the Brussels shopfront in pieces that STRETCH without distortion (a 3D
"9-slice"), the awning, the projecting-sign bracket and the terrace furniture. Blender 5.0, headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/shopfronts.py -- models/shops [--no-bake] [--previews]

LOOK (look-only, never traced / stored: Google Street View, Place de Saint-Job and Chaussee de Saint-Job 2024, Rue
Vanderkindere 2023-2024; docs/assets/SHOPS.md): two families share the square.
  classic   the painted timber front (Gabriella / La Meute / Espace Photo): a panelled stall riser on a stone plinth, a
            moulded sill, fluted pilasters on base blocks with capitals, a head rail, a framed fascia board between two
            scroll consoles, a moulded cornice with a lead flashing; a panelled glazed door with brass furniture
  modern    the aluminium front (Beobank, Carrefour express, the butcher, the bakery): blue-stone plinth, thin anthracite
            frames, roller-shutter guide rails, a projecting composite fascia box that hides the shutter; a frameless-
            looking glass door with a long steel pull bar
  awning    a folding-arm awning (La Meute, Le Bouquet Varie, Au Petit Job): cassette, sloping canvas, front bar and
            valance, two arms
  blade     a wrought-iron projecting-sign bracket with a scroll (L'Enfant Terrible's corner, Saint-Job)
  terrace   a square market parasol (Le Refuge / L'Enfant Terrible), a square bistro table, a hedge planter (Le Refuge)

STRETCH RULE (the viewer's slice shader, viewer/shops/shopKit.js): the pieces are modelled at a NOMINAL size and every
vertex moves by translation only, so bevels, mouldings and normals never distort:
  x' = x + sign(x) * (W - W0) / 2      for |x| > 0.02 (W0 = 2.0 m; no vertex lies near x = 0 on a stretching piece:
                                        long spans are single faces from end to end)
  y' = y + (H - H0)                    for y > YS (the stretch line; below it nothing moves)
Pieces that do not stretch in a direction are placed with W = W0 / H = H0.

Pieces (one object each; origin = the wall foot at the piece's centre; the STREET = -Y in Blender = +Z in three.js; the
wall plane is Y = 0; plinths / steps / feet run below the origin: JOINS rule on sloping sidewalks):
  front_classic   W0 2.0, fascia bottom 2.55 (YS 1.6), fascia 0.75, cornice top 3.50; glass plane at 0.075 out
  front_modern    W0 2.0, fascia bottom 2.55 (YS 1.6), fascia box 0.65 + flashing; glass plane at 0.075 out
  door_classic    1.0 wide, leaf to 2.20, fanlight to the head (YS 2.26); placed at the door's centre
  door_modern     the same frame of reference
  mullion         a glazing bar from the sill (0.50) to the head (YS 1.6)
  awning          origin = the wall at the fascia bottom; W0 2.0; 1.45 m projection
  blade           origin = the wall at the bracket's top bar; the sign board itself is the street-life SDF box
  parasol_sq      2.6 m square market parasol (origin = its base on the ground)
  table_sq        0.70 m square bistro table
  planter         1.0 x 0.42 m trough with a clipped hedge
Slots by NAME only (no baked colour): viewer/shops/shopKit.js SLOTS ("paint", "alu", "canvas" are per-instance
tints). UV0: metres along the grain (kitlib), UV1: the AO atlas (shopkit_ao.png). LODs: in the viewer (meshoptimizer).
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/shops")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)

# named slots (preview colours only; the viewer maps them by name)
PAINT = K.mat("paint", (0.03, 0.08, 0.06), 0.42, 0.0)          # painted joinery (per-instance colour)
STONE = K.mat("bluestone", (0.11, 0.115, 0.12), 0.7, 0.0)      # Belgian blue stone (petit granit): plinths, steps
LEAD = K.mat("lead", (0.16, 0.17, 0.18), 0.55, 0.3)            # cornice flashing
BRASS = K.mat("brass", (0.55, 0.4, 0.15), 0.3, 1.0)
ALU = K.mat("alu", (0.03, 0.032, 0.035), 0.4, 0.55)            # powder-coated aluminium (per-instance colour)
STEEL = K.mat("steel", (0.56, 0.57, 0.58), 0.28, 0.95)         # stainless pull bars, fixings
RUBBER = K.mat("rubber", (0.02, 0.02, 0.022), 0.75, 0.0)       # gaskets, the shutter slot
IRON = K.mat("iron", (0.025, 0.025, 0.027), 0.5, 0.6)          # wrought iron (blade bracket)
CANVAS = K.mat("canvas", (0.45, 0.06, 0.05), 0.88, 0.0)        # awning / parasol canvas (per-instance colour, stripes)
WOOD = K.mat("wood", (0.3, 0.18, 0.09), 0.6, 0.0)              # parasol mast, planter boards
TOP = K.mat("table_top", (0.5, 0.49, 0.46), 0.3, 0.0)          # compact laminate table top
LEAF = K.mat("leaf", (0.04, 0.09, 0.03), 0.8, 0.0)             # the clipped hedge (the viewer adds a leaf mottle)
SOIL = K.mat("soil", (0.05, 0.035, 0.025), 0.95, 0.0)
CAST = K.mat("cast_iron", (0.03, 0.03, 0.032), 0.5, 0.5)        # table / parasol bases

W0, HF = 2.0, 2.55          # nominal width, nominal fascia bottom
H = W0 / 2


# ------------------------------------------------------------------------------------------------ helpers
def box(P, mat, x0, x1, d0, d1, z0, z1, bevel=0.004, grain=None, segs=2):
    """a bevelled box between corners; d = distance OUT from the wall (Blender y = -d)"""
    sx, sy, sz = x1 - x0, d1 - d0, z1 - z0
    if grain is None: grain = X if sx >= max(sy, sz) else (Y if sy >= sz else Zv)
    P.add_bm(bm_box(sx, sy, sz, bevel, segs), mat, grain, M(((x0 + x1) / 2, -(d0 + d1) / 2, (z0 + z1) / 2)))


def sweep_x(P, mat, prof, x0, x1, grain=X):
    """a closed profile [(d, z)] (any order: it is made CCW) swept along X from x0 to x1: only the two end rings carry
    vertices, so the piece stretches along X without distortion"""
    pts = [(-d, z) for d, z in prof]                # Blender (y, z)
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if a < 0: pts = pts[::-1]
    bm = bmesh.new()
    r0 = [bm.verts.new((x0, y, z)) for y, z in pts]
    r1 = [bm.verts.new((x1, y, z)) for y, z in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([r0[i], r0[j], r1[j], r1[i]])
    bm.faces.new(r0[::-1]); bm.faces.new(r1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, mat, grain)


def sweep_z(P, mat, prof, z0, z1, grain=Zv):
    """a closed profile [(x, d)] swept along Z from z0 to z1 (vertical pieces stretching in height)"""
    pts = [(x, -d) for x, d in prof]
    a = sum(pts[i][0] * pts[(i + 1) % len(pts)][1] - pts[(i + 1) % len(pts)][0] * pts[i][1] for i in range(len(pts)))
    if a < 0: pts = pts[::-1]
    bm = bmesh.new()
    r0 = [bm.verts.new((x, y, z0)) for x, y in pts]
    r1 = [bm.verts.new((x, y, z1)) for x, y in pts]
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new([r0[i], r0[j], r1[j], r1[i]])
    bm.faces.new(r0[::-1]); bm.faces.new(r1)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, mat, grain)


def arc(c, r, a0, a1, n):
    """points on an arc in the (d, z) plane, angles in degrees (0 = +d, 90 = +z)"""
    return [(c[0] + r * math.cos(math.radians(a0 + (a1 - a0) * k / n)), c[1] + r * math.sin(math.radians(a0 + (a1 - a0) * k / n))) for k in range(n + 1)]


def rect_ring(P, mat, x0, x1, z0, z1, w, d0, d1, bevel=0.004):
    """a raised moulded frame (bolection) on a face: four bars mitred by overlap-free butting"""
    box(P, mat, x0, x1, d0, d1, z0, z0 + w, bevel, X)
    box(P, mat, x0, x1, d0, d1, z1 - w, z1, bevel, X)
    box(P, mat, x0, x0 + w, d0, d1, z0 + w, z1 - w, bevel, Zv)
    box(P, mat, x1 - w, x1, d0, d1, z0 + w, z1 - w, bevel, Zv)


def tube(P, mat, pts, r, segs=10):
    P.add_bm(bm_tube_path([(x, -d, z) for x, d, z in pts], r, segs), mat, (0, 0, 0))


def cyl(P, mat, x, d, z, r, h, segs=16, bevel=0.0, r2=None):
    P.add_bm(bm_cyl(r, h, segs, bevel, 2, True, r2), mat, Zv, M((x, -d, z)))


# ------------------------------------------------------------------------------------------------ classic front
def cornice_profile():
    """the cornice over the fascia, from the wall: bed mould, ogee, corona, sloping top (d, z)"""
    p = [(0.0, 3.30), (0.215, 3.30), (0.215, 3.315), (0.235, 3.315)]
    p += [(0.235 + 0.035 * (1 - math.cos(math.pi / 2 * k / 5)), 3.315 + 0.035 * math.sin(math.pi / 2 * k / 5)) for k in range(1, 6)]   # ovolo
    p += [(0.27, 3.36), (0.285, 3.36)]
    # cyma recta (ogee) up to the corona
    for k in range(1, 9):
        t = k / 8
        p.append((0.285 + 0.07 * t, 3.36 + 0.07 * (0.5 - 0.5 * math.cos(math.pi * t))))
    p += [(0.365, 3.43), (0.365, 3.475), (0.35, 3.49), (0.0, 3.515)]
    return p


def console(P, xc):
    """the scroll console at a fascia end: an S-curved bracket face 0.14 wide, a drop under it"""
    w = 0.14
    prof = [(0.0, 2.43), (0.18, 2.43)]
    # lower curl: bulge out to 0.25 at z 2.55, then the long ogee up to 0.31 at the top
    prof += arc((0.18, 2.49), 0.06, -90, 90, 8)[1:]
    for k in range(1, 11):
        t = k / 10
        prof.append((0.215 + 0.095 * (0.5 - 0.5 * math.cos(math.pi * t)), 2.55 + 0.72 * t))
    prof += [(0.31, 3.29), (0.0, 3.29)]
    sweep_x(P, PAINT, prof, xc - w / 2, xc + w / 2)
    # a recessed panel line on the console's face is too fine: a flat leaf block on top instead
    box(P, PAINT, xc - w / 2 - 0.01, xc + w / 2 + 0.01, 0.0, 0.33, 3.27, 3.30, 0.004, X)
    # the turned drop under it
    cyl(P, PAINT, xc, 0.17, 2.33, 0.03, 0.10, 14, 0.008, r2=0.012)
    cyl(P, PAINT, xc, 0.17, 2.405, 0.034, 0.03, 14, 0.006)


def front_classic():
    P = Part("front_classic")
    xi = H - 0.22                      # the pilasters' inner face (0.78)
    box(P, PAINT, -xi, xi, 0.04, 0.11, 2.29, 2.335, 0.006, X)                          # head glazing bead
    # pilasters: base block, fluted shaft, capital
    for s in (-1, 1):
        a, b = sorted((s * xi, s * H))
        box(P, STONE, a - 0.02, b + 0.02, 0.0, 0.25, -0.30, 0.06, 0.006, Zv)               # stone plinth block
        box(P, PAINT, a - 0.012, b + 0.012, 0.0, 0.235, 0.06, 0.58, 0.008, Zv)
        box(P, PAINT, a - 0.006, b + 0.006, 0.0, 0.245, 0.58, 0.61, 0.006, X)              # base moulding
        # shaft: the face with two flutes (grooves 8 mm deep), swept up from 0.61 to the capital
        c = (a + b) / 2
        prof = [(a, 0.0), (a, 0.2), (c - 0.06, 0.2), (c - 0.055, 0.192), (c - 0.03, 0.192), (c - 0.025, 0.2), (c + 0.025, 0.2),
                (c + 0.03, 0.192), (c + 0.055, 0.192), (c + 0.06, 0.2), (b, 0.2), (b, 0.0)]
        sweep_z(P, PAINT, prof, 0.61, 2.30)
        # capital: necking, echinus, abacus
        box(P, PAINT, a - 0.004, b + 0.004, 0.0, 0.21, 2.30, 2.33, 0.004, X)
        box(P, PAINT, a - 0.012, b + 0.012, 0.0, 0.225, 2.33, 2.40, 0.008, X)
        box(P, PAINT, a - 0.02, b + 0.02, 0.0, 0.24, 2.40, 2.43, 0.005, X)
    # head rail (under the fascia) with a bead under it
    box(P, PAINT, -xi, xi, 0.0, 0.13, 2.335, HF, 0.006, X)
    sweep_x(P, PAINT, [(0.0, 2.322), (0.115, 2.322)] + arc((0.115, 2.337), 0.015, -90, 90, 6)[1:] + [(0.0, 2.352)], -xi + 0.004, xi - 0.004)
    # fascia board + its raised frame; the sign panel inside (|x| < 0.80) is where the SDF text box sits
    box(P, PAINT, -H - 0.04, H + 0.04, 0.0, 0.20, HF, 3.30, 0.005, X)
    rect_ring(P, PAINT, -H + 0.2, H - 0.2, HF + 0.04, 3.26, 0.04, 0.20, 0.218, 0.006)
    for s in (-1, 1): console(P, s * (H - 0.09))
    # cornice + lead flashing on its top
    sweep_x(P, PAINT, cornice_profile(), -H - 0.11, H + 0.11)
    sweep_x(P, LEAD, [(0.0, 3.512), (0.352, 3.488), (0.37, 3.476), (0.375, 3.484), (0.355, 3.5), (0.0, 3.53)], -H - 0.115, H + 0.115)
    return P.to_object(smooth_angle=30)


def riser_classic():
    """the stall riser under a window bay (between a pilaster and the door post): stone plinth, panelled riser, sill,
    the bottom glazing bead; W0 2.0, stretched to the bay's width (never under the door)"""
    P = Part("riser_classic")
    # plinth (stone) under the riser and the pilaster bases
    box(P, STONE, -H, H, 0.0, 0.17, -0.30, 0.06, 0.006, X)
    # stall riser (painted, panelled)
    box(P, PAINT, -H, H, 0.0, 0.14, 0.06, 0.46, 0.004, X)
    rect_ring(P, PAINT, -H + 0.08, H - 0.08, 0.12, 0.40, 0.035, 0.14, 0.156, 0.005)
    box(P, PAINT, -H + 0.13, H - 0.13, 0.14, 0.15, 0.165, 0.355, 0.006, X)            # the fielded panel
    # sill: sloping top, rounded nose, drip groove underneath
    sill = [(0.0, 0.46), (0.165, 0.46), (0.165, 0.468), (0.175, 0.468), (0.175, 0.46), (0.19, 0.46)]
    sill += arc((0.19, 0.48), 0.02, -90, 60, 6)[1:]
    sill += [(0.17, 0.505), (0.0, 0.53)]
    sweep_x(P, PAINT, sill, -H, H)
    # glazing beads round the glass (glass plane 0.075 out)
    box(P, PAINT, -H, H, 0.04, 0.11, 0.515, 0.56, 0.006, X)
    return P.to_object(smooth_angle=30)


def riser_modern():
    """the modern bay's bottom rail + gasket (the stone plinth runs under the whole front)"""
    P = Part("riser_modern")
    box(P, ALU, -H, H, 0.0, 0.11, 0.17, 0.23, 0.003, X)
    box(P, RUBBER, -H, H, 0.06, 0.09, 0.23, 0.24, 0.0, X)
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ modern front
def front_modern():
    P = Part("front_modern")
    box(P, STONE, -H - 0.04, H + 0.04, 0.0, 0.075, -0.30, 0.15, 0.006, X)               # blue-stone plinth
    box(P, STONE, -H - 0.045, H + 0.045, 0.0, 0.085, 0.15, 0.17, 0.004, X)              # its top course (a nosing)
    fw, fd = 0.06, 0.11
    for s in (-1, 1):
        a, b = sorted((s * (H - 0.06), s * H))
        box(P, ALU, a, b, 0.0, fd, 0.17, HF - 0.01, 0.003, Zv)                        # jambs
        a2, b2 = sorted((s * H, s * (H + 0.04)))
        # roller-shutter guide rail: a U channel (two flanges + web)
        box(P, ALU, a2, b2, 0.0, 0.012, 0.15, HF, 0.002, Zv)
        box(P, ALU, a2, b2, 0.075, 0.087, 0.15, HF, 0.002, Zv)
        box(P, ALU, (a2 if s > 0 else b2 - 0.008), (a2 + 0.008 if s > 0 else b2), 0.012, 0.075, 0.15, HF, 0.002, Zv)
    box(P, ALU, -H + 0.06, H - 0.06, 0.0, fd, HF - 0.07, HF - 0.01, 0.003, X)          # head
    # glazing gaskets (black) where the glass meets the frame
    for z0, z1 in ((HF - 0.08, HF - 0.07),):
        box(P, RUBBER, -H + 0.06, H - 0.06, 0.06, 0.09, z0, z1, 0.0, X)
    # fascia box (hides the shutter): flat composite face, the shutter slot underneath, a flashing on top
    box(P, ALU, -H - 0.05, H + 0.05, 0.0, 0.27, HF, 3.20, 0.008, X)
    box(P, RUBBER, -H - 0.03, H + 0.03, 0.12, 0.24, HF - 0.004, HF + 0.002, 0.0, X)     # the slot (dark)
    box(P, ALU, -H - 0.05, H + 0.05, 0.268, 0.276, HF + 0.04, HF + 0.045, 0.0, X)      # reveal line
    sweep_x(P, STEEL, [(0.0, 3.20), (0.29, 3.20), (0.30, 3.19), (0.305, 3.195), (0.30, 3.215), (0.0, 3.235)], -H - 0.06, H + 0.06)
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ doors
def door_classic():
    P = Part("door_classic")
    hw = 0.48
    box(P, STONE, -0.62, 0.62, 0.0, 0.34, -0.30, 0.10, 0.008, X)                       # the step
    for s in (-1, 1):                                                                   # frame posts to the head
        a, b = sorted((s * 0.5, s * 0.57))
        box(P, PAINT, a, b, 0.0, 0.16, 0.10, HF - 0.20, 0.005, Zv)
    box(P, PAINT, -0.5, 0.5, 0.0, 0.16, 2.20, 2.28, 0.005, X)                           # transom bar
    box(P, PAINT, -0.5, 0.5, 0.04, 0.11, HF - 0.245, HF - 0.20, 0.005, X)              # fanlight bead (moves up)
    # the leaf (d 0.09 .. 0.135): stiles, rails, the kick panel; its glass is open (the interior shows behind)
    d0, d1 = 0.09, 0.135
    for s in (-1, 1):
        a, b = sorted((s * (hw - 0.11), s * hw))
        box(P, PAINT, a, b, d0, d1, 0.11, 2.19, 0.004, Zv)
    box(P, PAINT, -hw + 0.11, hw - 0.11, d0, d1, 0.11, 0.30, 0.004, X)                 # bottom rail
    box(P, PAINT, -hw + 0.11, hw - 0.11, d0, d1, 0.84, 0.97, 0.004, X)                 # lock rail
    box(P, PAINT, -hw + 0.11, hw - 0.11, d0, d1, 2.08, 2.19, 0.004, X)                 # top rail
    box(P, PAINT, -hw + 0.11, hw - 0.11, d0 + 0.01, d1 - 0.012, 0.30, 0.84, 0.004, X)  # kick panel (recessed)
    box(P, PAINT, -hw + 0.17, hw - 0.17, d1 - 0.012, d1 - 0.004, 0.37, 0.77, 0.008, X) # its raised field
    # glazing beads round the open glass
    rect_ring(P, PAINT, -hw + 0.11, hw - 0.11, 0.97, 2.08, 0.022, d0 + 0.02, d1 + 0.006, 0.003)
    # brass: knob + rose, escutcheon, letter plate, kick plate
    P.add_bm(bm_cyl(0.028, 0.02, 16, 0.004), BRASS, Zv, M((0.37, -(d1 + 0.0), 1.02), (math.pi / 2, 0, 0)))
    P.add_bm(bmesh_sphere(0.03, 12, 8), BRASS, (0, 0, 0), M((0.37, -(d1 + 0.06), 1.02)))
    P.add_bm(bm_cyl(0.008, 0.05, 8), BRASS, (0, 1, 0), M((0.37, -(d1 + 0.01), 1.02), (math.pi / 2, 0, 0)))
    box(P, BRASS, 0.355, 0.385, d1, d1 + 0.006, 0.92, 0.98, 0.002, Zv)
    box(P, BRASS, -0.15, 0.15, d1 - 0.002, d1 + 0.006, 0.88, 0.93, 0.002, X)
    box(P, BRASS, -hw + 0.02, hw - 0.02, d1 - 0.002, d1 + 0.004, 0.115, 0.26, 0.002, X)
    return P.to_object(smooth_angle=30)


def bmesh_sphere(r, u, v):
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=r)
    for f in bm.faces: f.smooth = True
    return bm


def door_modern():
    P = Part("door_modern")
    hw = 0.48
    box(P, STONE, -0.6, 0.6, 0.0, 0.30, -0.30, 0.06, 0.006, X)                         # step
    box(P, STEEL, -0.5, 0.5, 0.0, 0.11, 0.06, 0.075, 0.002, X)                          # threshold
    for s in (-1, 1):
        a, b = sorted((s * 0.5, s * 0.555))
        box(P, ALU, a, b, 0.0, 0.11, 0.06, HF - 0.07, 0.003, Zv)
    box(P, ALU, -0.5, 0.5, 0.0, 0.11, 2.24, 2.30, 0.003, X)                             # transom
    d0, d1 = 0.09, 0.14
    for s in (-1, 1):
        a, b = sorted((s * (hw - 0.07), s * hw))
        box(P, ALU, a, b, d0, d1, 0.08, 2.23, 0.003, Zv)
    box(P, ALU, -hw + 0.07, hw - 0.07, d0, d1, 0.08, 0.20, 0.003, X)
    box(P, ALU, -hw + 0.07, hw - 0.07, d0, d1, 2.16, 2.23, 0.003, X)
    # the pull bar on stand-offs
    cyl(P, STEEL, 0.34, d1 + 0.07, 0.55, 0.016, 1.3, 16, 0.006)
    for z in (0.75, 1.65):
        P.add_bm(bm_cyl(0.009, 0.07, 10), STEEL, Y, M((0.34, -d1, z), (math.pi / 2, 0, 0)))
    box(P, RUBBER, 0.25, 0.3, d0 + 0.004, d1 + 0.002, 1.0, 1.06, 0.002, Zv)             # lock cylinder block
    return P.to_object(smooth_angle=30)


def mullion():
    P = Part("mullion")
    prof = [(-0.032, 0.02), (-0.032, 0.11), (-0.024, 0.13), (-0.01, 0.138), (0.01, 0.138), (0.024, 0.13), (0.032, 0.11), (0.032, 0.02)]
    sweep_z(P, PAINT, prof, 0.52, 2.32)
    box(P, PAINT, -0.045, 0.045, 0.025, 0.15, 0.50, 0.56, 0.005, X)                    # its foot block on the sill
    box(P, PAINT, -0.045, 0.045, 0.025, 0.15, 2.28, 2.34, 0.005, X)                    # its head block
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ awning
def awning():
    """origin = the wall at the fascia bottom; z < 0 hangs below it"""
    P = Part("awning")
    W = H + 0.03
    # cassette: a rounded box in front of the head rail
    cas = [(0.14, -0.02), (0.31, -0.02)] + arc((0.31, -0.08), 0.06, 90, 0, 5)[1:] + [(0.37, -0.12)] + arc((0.33, -0.12), 0.04, 0, -90, 4)[1:] + [(0.14, -0.16)]
    sweep_x(P, ALU, cas, -W, W)
    for s in (-1, 1):                                                                   # end caps
        a, b = sorted((s * W, s * (W + 0.012)))
        box(P, ALU, a, b, 0.14, 0.375, -0.165, -0.015, 0.004, Y)
        a, b = sorted((s * (W - 0.12), s * (W - 0.02)))
        box(P, ALU, a, b, 0.0, 0.15, -0.15, -0.03, 0.004, Y)                              # wall brackets
    # canvas: from under the cassette, down and out at 17 deg to the front bar
    ang = math.radians(17); L = 1.42
    z0, dd0 = -0.15, 0.33
    zf, df = z0 - L * math.sin(ang), dd0 + L * math.cos(ang)
    t = 0.006
    nrm = (math.sin(ang), math.cos(ang))
    # (a thin slab with a soft belly: 6 sections along the slope, 2 cm sag in the middle)
    prof_top, prof_bot = [], []
    for k in range(7):
        u = k / 6
        d = dd0 + (df - dd0) * u; z = z0 + (zf - z0) * u - 0.02 * math.sin(math.pi * u)
        prof_top.append((d + nrm[0] * t, z + nrm[1] * t)); prof_bot.append((d, z))
    sweep_x(P, CANVAS, prof_top + prof_bot[::-1], -W + 0.01, W - 0.01)
    # front bar (alu profile) + valance (canvas) hanging from it
    bar = [(df - 0.02, zf + 0.03), (df + 0.05, zf + 0.03)] + arc((df + 0.05, zf - 0.01), 0.04, 90, -90, 6)[1:] + [(df - 0.02, zf - 0.05)]
    sweep_x(P, ALU, bar, -W, W)
    sweep_x(P, CANVAS, [(df + 0.08, zf - 0.03), (df + 0.086, zf - 0.03), (df + 0.086, zf - 0.27), (df + 0.08, zf - 0.27)], -W, W)
    # folding arms: shoulder bracket on the wall, two tubes meeting at a slightly bent elbow, the front-bar knuckle
    for s in (-1, 1):
        xs = s * (W - 0.16)
        sh = (xs, 0.06, -0.36); fr = (s * (W - 0.10), df - 0.04, zf - 0.02)
        el = ((sh[0] + fr[0]) / 2 - s * 0.18, (sh[1] + fr[1]) / 2, (sh[2] + fr[2]) / 2 - 0.03)
        a, b = sorted((xs - 0.05, xs + 0.05))
        box(P, ALU, a, b, 0.0, 0.08, -0.43, -0.29, 0.006, Zv)
        tube(P, ALU, [sh, el], 0.018, 10)
        tube(P, ALU, [el, fr], 0.016, 10)
        P.add_bm(bmesh_sphere(0.026, 10, 6), ALU, (0, 0, 0), M((el[0], -el[1], el[2])))
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ blade bracket
def blade():
    """origin = the wall at the top bar (z = 0); the board (0.66 x 0.62) hangs at d 0.22 .. 0.88, z -0.08 .. -0.70"""
    P = Part("blade")
    box(P, IRON, -0.06, 0.06, 0.0, 0.015, -0.55, 0.06, 0.004, Zv)                      # wall plate
    for z in (-0.48, -0.02):
        P.add_bm(bm_cyl(0.012, 0.022, 10, 0.002), IRON, Y, M((0, -0.015, z), (math.pi / 2, 0, 0)))   # bolt heads
    tube(P, IRON, [(0, 0.0, 0.0), (0, 0.98, 0.0)], 0.014, 8)                          # top bar
    P.add_bm(bmesh_sphere(0.026, 12, 8), IRON, (0, 0, 0), M((0, -1.0, 0.0)))          # finial ball
    tube(P, IRON, [(0, 0.0, -0.46), (0, 0.18, -0.30), (0, 0.42, -0.12), (0, 0.66, -0.012)], 0.011, 8)   # brace
    # scroll (a spiral curl) between the brace and the bar
    pts = []
    for k in range(29):
        a = math.radians(-90 + k * 16)
        r = 0.11 * (1 - k / 34)
        pts.append((0, 0.2 + r * math.cos(a), -0.11 + r * math.sin(a)))
    tube(P, IRON, pts, 0.008, 6)
    for dpos in (0.25, 0.85):                                                         # the two hooks the board hangs on
        tube(P, IRON, [(0, dpos, -0.012), (0, dpos, -0.06), (0, dpos + 0.012, -0.075)], 0.005, 6)
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ terrace
def parasol_sq():
    P = Part("parasol_sq")
    S = 1.3                                                                          # half side (2.6 m)
    # base: a cast cross foot with four concrete slabs
    for k, r in enumerate((0, math.pi / 2)):                                         # (the second bar 3 mm higher: no shared top face)
        P.add_bm(bm_box(0.9, 0.08, 0.06, 0.008), CAST, X, M((0, 0, 0.03 + 0.003 * k), (0, 0, r + math.pi / 4)))
    for k in range(4):
        a = math.pi / 4 + k * math.pi / 2
        P.add_bm(bm_box(0.3, 0.3, 0.05, 0.006), STONE, X, M((0.3 * math.cos(a), 0.3 * math.sin(a), 0.085), (0, 0, a)))
    cyl(P, CAST, 0, 0, -0.10, 0.06, 0.28, 16, 0.006, r2=0.04)                           # the sleeve (sunk 10 cm)
    cyl(P, WOOD, 0, 0, 0.12, 0.024, 2.44, 16, 0.004)                                    # mast
    cyl(P, WOOD, 0, 0, 1.70, 0.032, 0.16, 16, 0.006)                                    # runner
    top = 2.52
    # canopy: 8 ribs to the corners / edge middles, the canvas a shallow pyramid with a sag between the ribs
    edge_z = top - 0.42
    bm = bmesh.new()
    ring = []
    for k in range(16):                                                              # 16 points round the square
        side, f = divmod(k, 4)
        t = -1 + 2 * f / 4
        p = [(t, -1), (1, t), (-t, 1), (-1, -t)][side]
        x, y = p[0] * S, p[1] * S
        corner = abs(abs(p[0]) - 1) < 1e-6 and abs(abs(p[1]) - 1) < 1e-6
        mid = (f == 2)
        sag = 0.0 if (corner or mid) else 0.05
        ring.append((x, y, edge_z - sag))
    c = bm.verts.new((0, 0, top))
    # two rings: a middle one (sag) and the edge
    mid_ring = [bm.verts.new((x * 0.5, y * 0.5, (top + z) / 2 - 0.035)) for x, y, z in ring]
    out_ring = [bm.verts.new(p) for p in ring]
    n = len(ring)
    for k in range(n):
        j = (k + 1) % n
        bm.faces.new([c, mid_ring[k], mid_ring[j]])
        bm.faces.new([mid_ring[k], out_ring[k], out_ring[j], mid_ring[j]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces:
        if f.normal.z < 0: f.normal_flip()
    # thickness: solidify to 6 mm (both faces drawn)
    bmesh.ops.solidify(bm, geom=bm.faces[:], thickness=0.006)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, CANVAS, (0, 0, 0))
    # valance flaps along the four edges
    for side in range(4):
        a = side * math.pi / 2
        P.add_bm(bm_box(2 * S, 0.006, 0.14, 0.002), CANVAS, X, M((S * math.sin(a), -S * math.cos(a), edge_z - 0.07), (0, 0, a)))
    # ribs (under the canvas) + struts from the runner
    for k in range(8):
        a = k * math.pi / 4
        rr = S * (math.sqrt(2) if k % 2 == 0 else 1)
        aa = a + (math.pi / 4 if True else 0)
        ex, ey = rr * math.cos(aa), rr * math.sin(aa)
        tube(P, WOOD, [(0, 0, top - 0.06), (ex * 0.97, -ey * 0.97, edge_z - 0.035)], 0.009, 6)
        tube(P, WOOD, [(0, 0, 1.78), (ex * 0.45, -ey * 0.45, (top + edge_z) / 2 - 0.04)], 0.007, 6)
    cyl(P, WOOD, 0, 0, top - 0.04, 0.035, 0.10, 14, 0.008)
    cyl(P, CANVAS, 0, 0, top + 0.02, 0.12, 0.04, 16, 0.0, r2=0.05)                       # the vent cap
    P.add_bm(bmesh_sphere(0.03, 12, 8), WOOD, (0, 0, 0), M((0, 0, top + 0.09)))
    return P.to_object(smooth_angle=35)


def table_sq():
    P = Part("table_sq")
    box(P, TOP, -0.35, 0.35, -0.35, 0.35, 0.715, 0.735, 0.004, X)
    box(P, CAST, -0.33, 0.33, -0.33, 0.33, 0.69, 0.715, 0.004, X)                       # the steel under-frame
    cyl(P, CAST, 0, 0, 0.06, 0.03, 0.64, 16, 0.004)
    for k, r in enumerate((0, math.pi / 2)):
        P.add_bm(bm_box(0.62, 0.05, 0.04, 0.008), CAST, X, M((0, 0, 0.03 + 0.003 * k), (0, 0, r + math.pi / 4)))
    for k in range(4):                                                                 # levelling feet (into the ground)
        a = math.pi / 4 + k * math.pi / 2
        cyl(P, RUBBER, 0.29 * math.cos(a), -0.29 * math.sin(a), -0.05, 0.022, 0.06, 12)
    return P.to_object(smooth_angle=35)


def planter():
    P = Part("planter")
    L, D, Hh = 0.5, 0.21, 0.46
    # the trough: planks (wood) on a dark frame, a rim on top
    for s in (-1, 1):
        for k in range(4):
            z0 = -0.05 + k * 0.125
            box(P, WOOD, -L, L, (s * D) - 0.022 if s > 0 else -D, (s * D) if s > 0 else -D + 0.022, z0, z0 + 0.12, 0.004, X)
    for s in (-1, 1):
        a, b = sorted((s * L, s * (L - 0.022)))
        box(P, WOOD, a, b, -D + 0.022, D - 0.022, -0.05, Hh, 0.004, Zv)
    for sx in (-1, 1):
        for sy in (-1, 1):
            a, b = sorted((sx * L, sx * (L + 0.02))); c, d = sorted((sy * D, sy * (D + 0.02)))
            box(P, CAST, a, b, c, d, -0.06, Hh + 0.01, 0.003, Zv)
    box(P, WOOD, -L - 0.03, L + 0.03, -D - 0.03, -D + 0.03, Hh, Hh + 0.025, 0.004, X)
    box(P, WOOD, -L - 0.03, L + 0.03, D - 0.03, D + 0.03, Hh, Hh + 0.025, 0.004, X)
    box(P, SOIL, -L + 0.02, L - 0.02, -D + 0.02, D - 0.02, Hh - 0.05, Hh - 0.03, 0.0, X)
    # clipped hedge: a subdivided rounded box, displaced by noise (leaf clumps)
    bm = bm_box(2 * L - 0.04, 2 * D - 0.02, 0.62, 0.12, 3)
    bmesh.ops.subdivide_edges(bm, edges=bm.edges[:], cuts=3, use_grid_fill=True)
    random.seed(4)
    for v in bm.verts:
        p = v.co
        n = noise.noise(Vector((p.x * 7, p.y * 7, p.z * 7))) * 0.018 + noise.noise(Vector((p.x * 19, p.y * 19, p.z * 19 + 3))) * 0.005
        v.co = p + p.normalized() * n * 0.0 + Vector((p.x, p.y, p.z * 0.6)).normalized() * n
    bmesh.ops.translate(bm, vec=(0, 0, Hh - 0.04 + 0.31), verts=bm.verts)
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, LEAF, (0, 0, 0))
    return P.to_object(smooth_angle=60)


# ------------------------------------------------------------------------------------------------ build, bake, export
builders = [front_classic, riser_classic, front_modern, riser_modern, door_classic, door_modern, mullion, awning, blade, parasol_sq, table_sq, planter]
objs = []
for b in builders:
    t = time.time()
    o = b()
    objs.append(o)
    print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]} ({time.time() - t:.1f}s)")

layout = K.atlas_layout(objs)
for o in objs: K.lightmap_uv(o, layout[o.name], margin=0.004)
ao_png = os.path.join(OUT, "shopkit_ao.png")
if BAKE:
    ao_img = K.bake_ao(objs, ao_png, px=1024, samples=48, distance=0.5)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(objs, os.path.join(OUT, "shopkit.glb"))
info = {
    "asset": "Shopfront kit: classic + modern fronts, doors, mullion, awning, blade bracket, terrace (tools/blender/shopfronts.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up, origin = the wall foot at the piece centre (awning: the fascia bottom; blade: the top bar), street = -Y (Blender) = +Z (three.js)",
    "stretch": {"W0": W0, "HF": HF, "YS": {"front_classic": 1.6, "riser_classic": 99, "riser_modern": 99, "front_modern": 1.6, "door_classic": 2.26, "door_modern": 2.26, "mullion": 1.6}},
}
json.dump(info, open(os.path.join(OUT, "shopkit.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.render.image_settings.color_mode = "RGB"
    so, cam = K.preview_setup(ao_img, sun_elev=38, sun_az=200)
    # a brick wall behind, the pieces set as two shopfronts (stretched by hand like the viewer does: here W = 4.6 m)
    wm = bpy.data.materials.new("preview_wall"); wm.use_nodes = True
    wm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.32, 0.16, 0.1, 1)
    bpy.ops.mesh.primitive_plane_add(size=1, location=(0, 0.001, 3)); wall = bpy.context.active_object
    wall.scale = (20, 6, 1); wall.rotation_euler = (math.pi / 2, 0, 0); wall.data.materials.append(wm)

    def stretch(o, Wt, dH, ys, x0):
        c = o.copy(); c.data = o.data.copy(); scn.collection.objects.link(c)
        for v in c.data.vertices:
            if abs(v.co.x) > 0.02: v.co.x += math.copysign((Wt - W0) / 2, v.co.x)
            if v.co.z > ys: v.co.z += dH
        c.location = (x0, 0, 0); c.hide_render = False
        return c
    for o in objs: o.hide_render = True
    byn = {o.name: o for o in objs}
    stretch(byn["front_classic"], 4.6, 0.3, 1.6, -3.0)
    stretch(byn["door_classic"], W0, 0.3, 2.26, -3.0 - 1.55)
    stretch(byn["mullion"], W0, 0.3, 1.6, -3.0 + 0.6)
    stretch(byn["awning"], 4.6, 0, 99, -3.0).location = (-3.0, 0, HF + 0.3)
    stretch(byn["front_modern"], 4.2, 0.3, 1.6, 2.0)
    stretch(byn["door_modern"], W0, 0.3, 2.26, 2.0 + 1.35)
    stretch(byn["blade"], W0, 0, 99, 4.35).location = (4.35, 0, 3.4)
    for n, p in (("parasol_sq", (-3.0, -3.2)), ("table_sq", (-2.0, -2.6)), ("planter", (0.3, -2.0))):
        stretch(byn[n], W0, 0, 99, p[0]).location = (p[0], p[1], 0)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    K.render(cam, os.path.join(PV, "shops_overview.jpg"), (0.5, -11.5, 2.4), (0.0, 0, 2.0), 30, (1600, 900))
    K.render(cam, os.path.join(PV, "shops_classic_close.jpg"), (-1.3, -3.2, 1.9), (-3.4, 0, 2.2), 32, (1200, 900))
    so.rotation_euler = (math.radians(78), 0, math.radians(255))
    K.render(cam, os.path.join(PV, "shops_grazing.jpg"), (6.5, -2.4, 1.6), (0.5, 0, 2.2), 35, (1200, 800))
print(f"done {time.time() - T0:.0f}s")
