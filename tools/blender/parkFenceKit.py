"""PARK FENCE KIT: the fences and gates of the Parc de Wolvendael and the Parc de la Sauvagere (claude/parkfence,
docs/PARKFENCE.md, rule park-fence). Blender 5.0, headless, Cycles on the GPU (OptiX; --factory-startup = CPU, switched
here):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/parkFenceKit.py -- models/parkfence [--no-bake] [--previews]

STYLE (look-only Street View, 2024, data/parkfence/<park>.obs.json): Wolvendael's Avenue Wolvendael frontage is a pale
dressed-stone plinth with a black wrought-iron spear railing and rusticated stone piers with moulded caps; its other
sides dark green welded mesh on round posts; its entrances stone piers with black iron double gates. The Sauvagere: a
plain black bar fence, grey rubble-stone piers, plain bar gates.

Pieces (one object per piece and LOD, "<piece>_lod<k>"):
  pf_rail    a 2.5 m module of the spear railing (x 0..2.5, z 0 = the plinth's coping top; bars 3 cm into it), 1.8 m
             of bars at 12.5 cm, cast lance finials, two flat rails. No post: it runs between piers.
  pf_bars    a 2.5 m module of the plain bar fence (x 0..2.5, z 0 = the ground line), a square post at x = 0 (0.4 m into
             the ground), 20 mm bars at 12 cm up to a capping rail at 1.6 m, a bottom rail.
  pf_mesh    a 2.5 m module of welded mesh (200 x 50 mm, 6 mm wires) with its round post at x = 0 (into the ground)
             and the clips; the mesh from 5 cm over the ground line to 1.8 m.
  pf_post    the post alone (a run's free end), round, capped.
  pf_pier    a stone pier, 0.7 x 0.7 x 3.0 m nominal (the viewer scales it): a base block, a rusticated shaft (banded
             courses with V joints), a moulded cornice and a cap; its foot 0.5 m under the ground line (the skirt).
  pf_plinth  a 2.5 m module of the stone plinth wall, 0.4 m deep, 0.8 m over the ground line, a bevelled coping with
             a drip; 0.6 m under the ground line (the skirt: the viewer shears it to the slope).
  pf_gate2   one leaf of the big double park gate: 2.0 x 2.4 m nominal, hinge at x = 0; tube frame, 20 mm bars with
             lances over the top rail, a band of rings between two middle rails, dog bars, two hinges, a drop bolt.
  pf_gate1   the pedestrian leaf: 1.1 x 1.8 m nominal, frame, bars, lances, a latch box.
  pf_brick   (claude/places3, the Papenkasteel's old garden wall on Rue Kinsendael) a 2.5 m module of a 2.3 m red-brown
             brick wall, 0.33 m thick: Flemish bond (stretcher + header, 55 mm bricks, 10 mm lime joints) on both faces
             and on the ends (a step of the wall shows its end above the lower module), the bricks 8 mm proud of the
             recessed mortar (LOD0: the street face's bricks with chamfered bed edges, the grounds face flat), a
             STEPPED coping: an oversailing course of creasing tiles under bevelled saddleback coping stones; its body
             1.0 m under the ground line (the skirt: the viewer sets it LEVEL, stepped down the street by whole
             courses, viewer/parkFenceLayout.js). Per-brick tone in COLOR_0.g (a random per brick, 0.5 = the mean).
LODs: the stone pieces three scripted levels (LOD0 bevelled courses, LOD1 boxes with the cap, LOD2 one box + cap);
the ironwork ONE modelled level: far away the viewer draws its coverage card (viewer/thinBars.js ironCards: the LOD0
rasterised into an atlas with box mips, rule 35: no shimmer / moire), so LOD1 / LOD2 of thin bars are never drawn.
Slots by NAME only (no baked colour): iron_paint (black or green per instance), iron_tip (finials), steel_dark
(hinges, latches, clips), stone (pier / plinth body: limestone or rubble per instance), stone_cap (copings, caps);
(pf_brick) brick, mortar, coping.
AO: Cycles, baked per VERTEX into COLOR_0 with the piece standing on the ground / its plinth (contact darkening).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_torus, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/parkfence")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)

PAINT = K.mat("iron_paint", (0.02, 0.02, 0.022), 0.45, 0.4)
TIP = K.mat("iron_tip", (0.02, 0.02, 0.022), 0.4, 0.5)
STEEL = K.mat("steel_dark", (0.05, 0.05, 0.052), 0.4, 0.7)
STONE = K.mat("stone", (0.55, 0.53, 0.49), 0.85)
CAP = K.mat("stone_cap", (0.5, 0.49, 0.46), 0.8)
BRICK = K.mat("brick", (0.36, 0.17, 0.11), 0.88)
MORTAR = K.mat("mortar", (0.55, 0.52, 0.46), 0.95)
COPING = K.mat("coping", (0.30, 0.29, 0.28), 0.8)
W = 2.5                 # the panel module
MESH_WIRE = 0.006       # the welded mesh's wires (heavy park panels: 6 mm; tools/audit/parkFenceCheck.mjs MESH)


def tick(s): print(f"[{time.time() - T0:6.1f}s] {s}", flush=True)


# ------------------------------------------------------------------------------------------------ primitives
def bar(P, mat, x, y, z0, z1, w, d, rings=(), cham=0.002, caps=True):
    """a vertical bar (w along x, d along y) from z0 to z1, chamfered (8 sides), extra vertex rings (the AO)"""
    bm = bmesh.new()
    hw, hd = w / 2, d / 2
    c = min(cham, hw * 0.4, hd * 0.4)
    sec = [(hw, -hd + c), (hw, hd - c), (hw - c, hd), (-hw + c, hd), (-hw, hd - c), (-hw, -hd + c), (-hw + c, -hd), (hw - c, -hd)] if c > 0 else [(hw, -hd), (hw, hd), (-hw, hd), (-hw, -hd)]
    zs = [z0] + [r for r in sorted(rings) if z0 < r < z1] + [z1]
    R = [[bm.verts.new((x + a, y + b, z)) for a, b in sec] for z in zs]
    n = len(sec)
    for i in range(len(R) - 1):
        for k in range(n): bm.faces.new([R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]])
    if caps: bm.faces.new(list(reversed(R[0]))); bm.faces.new(R[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, Zv)


def rail(P, mat, x0, x1, y, z0, z1, d, bevel=0.002, caps=False, xs=()):
    """a horizontal rail along x (d deep along y); xs: extra vertex rings along it (AO)"""
    bm = bmesh.new()
    hd = d / 2
    c = min(bevel, hd * 0.4, (z1 - z0) * 0.4)
    sec = [(y + hd, z0 + c), (y + hd, z1 - c), (y + hd - c, z1), (y - hd + c, z1), (y - hd, z1 - c), (y - hd, z0 + c), (y - hd + c, z0), (y + hd - c, z0)] if c > 0 else [(y + hd, z0), (y + hd, z1), (y - hd, z1), (y - hd, z0)]
    R = [[bm.verts.new((x, a, b)) for a, b in sec] for x in [x0] + [q for q in sorted(xs) if x0 < q < x1] + [x1]]
    n = len(sec)
    for i in range(len(R) - 1):
        for k in range(n): bm.faces.new([R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]])
    if caps: bm.faces.new(R[0]); bm.faces.new(list(reversed(R[-1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, X)


def lance(P, x, y, z, s=1.0):
    """a cast spear finial on a bar top at z: a collar and a four-sided lance head with a waist"""
    P.add_bm(bm_cyl(0.0135 * s, 0.018 * s, 12, 0.002, 1), TIP, Zv, M((x, y, z - 0.004)))
    bm = bmesh.new()
    prof = [(0.007, 0.0), (0.006, 0.012), (0.018, 0.034), (0.009, 0.054), (0.0, 0.08)]
    rings = []
    for r, h in prof:
        if r == 0: rings.append([bm.verts.new((x, y, z + 0.012 * s + h * s))]); continue
        rings.append([bm.verts.new((x + r * s * c, y + r * s * sn * 0.55, z + 0.012 * s + h * s)) for c, sn in ((1, 0), (0, 1), (-1, 0), (0, -1))])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        if len(b) == 1:
            for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[0]])
        else:
            for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]])
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, TIP, Zv)


def box(P, mat, c, s, bevel=0.0, segs=2):
    P.add_bm(bm_box(*s, bevel, segs), mat, None, M(c))


def round_post(P, x, z0, z1, r=0.03):
    P.add_bm(bm_cyl(r, z1 - z0, 16, 0.0, 1, cap=True), PAINT, Zv, M((x, 0, z0)))
    P.add_bm(bm_cyl(r * 1.15, 0.03, 16, 0.006, 2, r2=r * 0.6), TIP, Zv, M((x, 0, z1)))       # the domed cap


# ------------------------------------------------------------------------------------------------ the ironwork (one level)
def pf_rail():
    P = Part("pf_rail_lod0")
    pitch = 0.125
    for k in range(20):
        x = pitch / 2 + k * pitch
        bar(P, PAINT, x, 0, -0.03, 1.80, 0.022, 0.022, (0.06, 0.2))
        lance(P, x, 0, 1.80)
    rail(P, PAINT, 0, W, 0, 0.12, 0.16, 0.014)
    rail(P, PAINT, 0, W, 0, 1.56, 1.60, 0.014)
    return P.to_object(smooth_angle=20)


def pf_bars():
    P = Part("pf_bars_lod0")
    bar(P, PAINT, 0.0, 0, -0.4, 1.62, 0.06, 0.06, (-0.05, 0.05, 0.15, 0.8, 1.5), cham=0.004)       # the post
    box(P, TIP, (0, 0, 1.635), (0.075, 0.075, 0.03), 0.006)                                     # its cap plate
    pitch = 0.12
    xs = []
    x = 0.03 + pitch / 2
    while x < W - 0.03: xs.append(x); x += pitch
    for x in xs: bar(P, PAINT, x, 0, 0.05, 1.56, 0.02, 0.02, (0.15,))
    rail(P, PAINT, 0.03, W - 0.03, 0, 0.12, 0.16, 0.025, 0.003)
    rail(P, PAINT, 0.03, W - 0.03, 0, 1.56, 1.60, 0.03, 0.003)
    return P.to_object(smooth_angle=20)


def pf_mesh():
    P = Part("pf_mesh_lod0")
    round_post(P, 0.0, -0.4, 1.86)
    x0, x1, z0, z1 = 0.05, W - 0.05, 0.05, 1.80
    # vertical wires every 5 cm, horizontal every 20 cm (double at the top and bottom: the panel's edge)
    vx = []
    x = x0
    while x <= x1 + 1e-6: vx.append(x); x += 0.05
    hz = [z0, z0 + 0.05] + [z0 + 0.2 * k for k in range(1, 9)] + [z1 - 0.05, z1]
    hz = sorted(set(round(z, 4) for z in hz if z <= z1 + 1e-6))
    for x in vx: bar(P, PAINT, x, 0.0035, z0 - 0.01, z1 + 0.01, MESH_WIRE, MESH_WIRE, (z0 + 0.1,), cham=0.0, caps=False)
    for z in hz: rail(P, PAINT, x0 - 0.01, x1 + 0.01, -0.0035, z - MESH_WIRE / 2, z + MESH_WIRE / 2, MESH_WIRE, 0.0)
    # clips on the post (4) holding the panel
    for z in (0.25, 0.75, 1.25, 1.7):
        box(P, STEEL, (0.035, 0, z), (0.04, 0.02, 0.05), 0.003)
    return P.to_object(smooth_angle=20)


def pf_post():
    P = Part("pf_post_lod0")
    round_post(P, 0.0, -0.4, 1.86)
    return P.to_object(smooth_angle=20)


def leaf(name, Wl, H, rings_band=True, latch=False):
    """a gate leaf: hinge at x = 0, width Wl, height H from the ground line"""
    P = Part(f"{name}_lod0")
    st = 0.05
    x0, x1 = 0.0, Wl
    zb, zt = 0.08, H - 0.12
    bar(P, PAINT, x0 + st / 2, 0, zb - 0.005, H + 0.02, st, st, (zb + 0.1, zt - 0.1), cham=0.004)
    bar(P, PAINT, x1 - st / 2, 0, zb - 0.005, zt + 0.005, st, st, (zb + 0.1, zt - 0.1), cham=0.004)
    lance(P, x0 + st / 2, 0, H + 0.02, 1.6)
    ra, rb = x0 + st - 0.005, x1 - st + 0.005
    rail(P, PAINT, ra, rb, 0, zb, zb + 0.05, 0.035, 0.003)
    rail(P, PAINT, ra, rb, 0, zt - 0.05, zt, 0.035, 0.003)
    pitch = 0.13
    xs = []
    x = x0 + st + pitch / 2
    while x < x1 - st - 0.02: xs.append(x); x += pitch
    zm0, zm1 = zb + 0.42, zb + 0.72
    if rings_band:
        rail(P, PAINT, ra, rb, 0, zm0, zm0 + 0.03, 0.028, 0.002)
        rail(P, PAINT, ra, rb, 0, zm1, zm1 + 0.03, 0.028, 0.002)
        for a, b in zip(xs, xs[1:]): P.add_bm(bm_torus(0.055, 0.007, 16, 6), PAINT, X, M(((a + b) / 2, 0, (zm0 + zm1 + 0.03) / 2)))
        # dog bars between the bars at the bottom (short, with small lances)
        for a, b in zip(xs, xs[1:]):
            bar(P, PAINT, (a + b) / 2, 0, zb + 0.04, zb + 0.3, 0.014, 0.014, (zb + 0.12,))
            lance(P, (a + b) / 2, 0, zb + 0.3, 0.7)
    for x in xs:
        # (the bars in one piece through the top rail to their lances)
        bar(P, PAINT, x, 0, zb + 0.03, H, 0.02, 0.02, (zb + 0.15,))
        lance(P, x, 0, H)
    # hinges (knuckles on the hinge stile) + the drop bolt / the latch
    for z in (zb + 0.2, zt - 0.2):
        P.add_bm(bm_cyl(0.016, 0.1, 12, 0.003, 1), STEEL, Zv, M((-0.012, 0, z - 0.05)))
        box(P, STEEL, (0.01, 0, z), (0.04, 0.008, 0.07), 0.002)
    if latch:
        box(P, STEEL, (x1 - st - 0.04, 0, 1.0), (0.1, 0.05, 0.15), 0.004)
        P.add_bm(bm_box(0.12, 0.014, 0.018, 0.004, 2), STEEL, X, M((x1 - st - 0.1, -0.04, 1.03)))
    else:
        bar(P, STEEL, x1 - 0.08, -0.035, -0.1, zb + 0.4, 0.018, 0.018, (), cham=0.003)
        box(P, STEEL, (x1 - 0.08, -0.035, zb + 0.42), (0.04, 0.025, 0.04), 0.003)
    return P.to_object(smooth_angle=20)


# ------------------------------------------------------------------------------------------------ the stone (three levels)
def pf_pier(lod):
    P = Part(f"pf_pier_lod{lod}")
    s, H = 0.7, 3.0
    foot = -0.5
    if lod == 0:
        box(P, STONE, (0, 0, foot / 2), (s + 0.12, s + 0.12, -foot))                                 # the footing (the skirt)
        box(P, STONE, (0, 0, 0.225), (s + 0.12, s + 0.12, 0.45), 0.02)                              # base block
        box(P, CAP, (0, 0, 0.47), (s + 0.08, s + 0.08, 0.05), 0.012)                               # its weathering
        z = 0.5
        k = 0
        cz = H - 0.42
        while z < cz - 0.05:
            h = min(0.32, cz - z)
            inset = 0.0 if k % 2 == 0 else 0.018                                                    # banded rustication
            box(P, STONE, (0, 0, z + h / 2), (s - inset, s - inset, h - 0.012), 0.012, 2)
            box(P, STONE, (0, 0, z + h - 0.006), (s - 0.05, s - 0.05, 0.016), 0.0)                  # the V joint's core
            z += h; k += 1
        # the cornice: a moulding stepping out, the cap slab, a low pyramid
        box(P, CAP, (0, 0, cz + 0.05), (s + 0.04, s + 0.04, 0.1), 0.02, 3)
        box(P, CAP, (0, 0, cz + 0.16), (s + 0.12, s + 0.12, 0.12), 0.03, 3)
        box(P, CAP, (0, 0, cz + 0.28), (s + 0.16, s + 0.16, 0.12), 0.025, 3)
        bm = bm_cyl((s + 0.06) * 0.7071, 0.12, 4, 0.0, 1, r2=0.08)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, "Z"))
        P.add_bm(bm, CAP, None, M((0, 0, cz + 0.34)))
    elif lod == 1:
        box(P, STONE, (0, 0, foot / 2), (s + 0.12, s + 0.12, -foot))
        box(P, STONE, (0, 0, 0.225), (s + 0.12, s + 0.12, 0.45))
        box(P, STONE, (0, 0, (0.45 + H - 0.42) / 2), (s, s, H - 0.42 - 0.45))
        box(P, CAP, (0, 0, H - 0.42 + 0.17), (s + 0.12, s + 0.12, 0.34))
        bm = bm_cyl((s + 0.06) * 0.7071, 0.12, 4, 0.0, 1, r2=0.08)
        bmesh.ops.rotate(bm, verts=bm.verts, cent=(0, 0, 0), matrix=Matrix.Rotation(math.pi / 4, 3, "Z"))
        P.add_bm(bm, CAP, None, M((0, 0, H - 0.08)))
    else:
        box(P, STONE, (0, 0, (foot + H - 0.42) / 2), (s, s, H - 0.42 - foot))
        box(P, CAP, (0, 0, H - 0.42 + 0.2), (s + 0.12, s + 0.12, 0.4))
    return P.to_object(smooth_angle=30)


def pf_plinth(lod):
    P = Part(f"pf_plinth_lod{lod}")
    d, h, foot = 0.4, 0.8, -0.6
    ch = 0.12                     # the coping
    if lod == 0:
        box(P, STONE, (W / 2, 0, (foot + 0.0) / 2), (W, d, -foot))                                   # the buried footing
        # two courses of dressed blocks (1.25 m and 0.625 m bond), V joints
        zc = [0.0, (h - ch) / 2, h - ch]
        for r in range(2):
            z0, z1 = zc[r], zc[r + 1]
            L = 1.25 if r == 0 else 0.625
            xs = [0.0]
            x = L / 2 if r == 1 else L
            while x < W - 1e-6: xs.append(x); x += L
            xs.append(W)
            for a, b in zip(xs, xs[1:]):
                box(P, STONE, ((a + b) / 2, 0, (z0 + z1) / 2), (b - a - 0.01, d, z1 - z0 - 0.01), 0.012)
            box(P, STONE, (W / 2, 0, z1 - 0.005), (W, d - 0.03, 0.012))                               # joint core
        for x in (0.0, W):
            pass
        box(P, CAP, (W / 2, 0, h - ch / 2), (W, d + 0.08, ch), 0.02, 3)                              # coping with drip
        box(P, CAP, (W / 2, 0, h - ch - 0.006), (W, d + 0.02, 0.012), 0.0)
    elif lod == 1:
        box(P, STONE, (W / 2, 0, foot / 2), (W, d, -foot))
        box(P, STONE, (W / 2, 0, (h - ch) / 2), (W, d, h - ch))
        box(P, CAP, (W / 2, 0, h - ch / 2), (W, d + 0.08, ch))
    else:
        box(P, STONE, (W / 2, 0, (foot + h) / 2), (W, d + 0.04, h - foot))
    return P.to_object(smooth_angle=30)


# ------------------------------------------------------------------------------------------------ the brick wall (three levels)
BW_H, BW_D, BW_FOOT = 2.3, 0.33, -1.0         # height over the ground line, thickness, the skirt's foot
BR_H, BR_J = 0.055, 0.010                      # brick height, joint (a course = 65 mm: viewer/parkFenceLayout.js BRICK_COURSE)
BR_UNIT = W / 8                                # one stretcher + one header + two joints (Flemish bond, 8 a module)
BR_S = (BR_UNIT - 2 * BR_J) * 0.678            # the stretcher's length (~0.198)
BR_HD = BR_UNIT - 2 * BR_J - BR_S              # the header's (~0.094)
BR_P = 0.008                                   # the bricks' face proud of the mortar
CREASE_T, STONE_H = 0.035, 0.11                # the creasing course, the coping stone (5 cm side + 6 cm ridge)
BW_ZB = BW_H - CREASE_T - STONE_H              # the brickwork's top (under the coping)


def course_bricks(i, length):
    """course i (0 = the top one) along [0, length]: [(x0, x1)], Flemish bond (odd courses shifted half a unit: each
    header centred on the stretcher under it)"""
    out = []
    off = BR_UNIT / 2 if i % 2 else 0.0
    x = -off - BR_UNIT
    while x < length:
        for a, b in ((x, x + BR_S), (x + BR_S + BR_J, x + BR_S + BR_J + BR_HD)):
            a2, b2 = max(a, 0.0), min(b, length)
            if b2 - a2 > 0.012: out.append((a2, b2))
        x += BR_UNIT
    return out


def courses():
    """[(i, z0, z1)] from the top of the brickwork down to 0.4 m under the ground line"""
    out, i = [], 0
    while True:
        z1 = BW_ZB - i * (BR_H + BR_J); z0 = max(z1 - BR_H, -0.4)
        if z1 <= -0.4 + 0.01: break
        out.append((i, z0, z1)); i += 1
    return out


def brick_face(bm, x0, x1, z0, z1, y, s, cham):
    """one brick on a wall face (s = -1: the street face at -y, +1 the grounds face), BR_P proud of the mortar at y;
    cham: its bed edges chamfered down to the mortar (front quad + two slopes: the shadow line under every course)"""
    yf = y + s * BR_P
    c = min(0.004, (z1 - z0) * 0.3) if cham else 0.0
    if c:
        v = [bm.verts.new(p) for p in ((x0, yf, z0 + c), (x1, yf, z0 + c), (x1, yf, z1 - c), (x0, yf, z1 - c),
                                        (x0, y, z0), (x1, y, z0), (x1, y, z1), (x0, y, z1))]
        for q in ((0, 1, 2, 3), (4, 5, 1, 0), (3, 2, 6, 7)): bm.faces.new([v[k] for k in q])
    else:
        v = [bm.verts.new(p) for p in ((x0, yf, z0), (x1, yf, z0), (x1, yf, z1), (x0, yf, z1))]
        bm.faces.new(v if s < 0 else v[::-1])               # (wound by hand: the normal out of the face)


def brick_end(bm, x, s, z0, z1, i):
    """the bricks of an end (x = 0: s = -1, x = W: s = +1), BR_P proud: across the thickness, alternate courses
    a stretcher + a header or a header + a stretcher"""
    parts = [BR_S, BR_HD] if i % 2 else [BR_HD, BR_S]
    k = (BW_D - BR_J) / (sum(parts) + BR_J)
    y = -BW_D / 2
    xf = x + s * BR_P
    for L in parts:
        a, b = y, y + L * k
        v = [bm.verts.new(p) for p in ((xf, a, z0), (xf, b, z0), (xf, b, z1), (xf, a, z1))]
        bm.faces.new(v if s > 0 else v[::-1])
        y = b + BR_J * k


def coping_stone(P, x0, x1, bev):
    """a saddleback coping stone over [x0, x1]: vertical sides 5 cm, a ridge 6 cm higher, 2 cm over each face"""
    hw = BW_D / 2 + 0.02
    z0 = BW_ZB + CREASE_T
    prof = [(-hw, z0), (hw, z0), (hw, z0 + 0.05), (0.0, z0 + STONE_H), (-hw, z0 + 0.05)]
    bm = bmesh.new()
    A = [bm.verts.new((x0, y, z)) for y, z in prof]; B = [bm.verts.new((x1, y, z)) for y, z in prof]
    bm.faces.new(list(reversed(A))); bm.faces.new(B)
    n = len(prof)
    for k in range(n): bm.faces.new([A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    if bev:
        top = [e for e in bm.edges if not (abs(e.verts[0].co.z - z0) < 1e-6 and abs(e.verts[1].co.z - z0) < 1e-6)]
        bmesh.ops.bevel(bm, geom=top, offset=bev, segments=1, profile=0.5, affect="EDGES", clamp_overlap=True)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, COPING, X)


def pf_brick(lod):
    P = Part(f"pf_brick_lod{lod}")
    hd = BW_D / 2
    if lod == 0:
        # the body: the recessed mortar faces (the bricks stand 8 mm proud), the skirt under it in brick
        box(P, MORTAR, (W / 2, 0, (-0.4 + BW_ZB) / 2), (W, BW_D, BW_ZB + 0.4))
        box(P, BRICK, (W / 2, 0, (BW_FOOT - 0.4) / 2), (W, BW_D + 2 * BR_P, -0.4 - BW_FOOT))
        bm = bmesh.new()
        for i, z0, z1 in courses():
            for a, b in course_bricks(i, W):
                brick_face(bm, a, b, z0, z1, -hd, -1, True)
                brick_face(bm, a, b, z0, z1, hd, 1, False)
            brick_end(bm, 0.0, -1, z0, z1, i); brick_end(bm, W, 1, z0, z1, i)
        for f in bm.faces: f.smooth = False                 # (open shells, wound by hand: no recalc)
        P.add_bm(bm, BRICK, X)
        # the stepped coping: creasing tiles (W / 9, oversailing 4 cm) under the saddleback stones (W / 4, 6 mm joints)
        nt = 9
        for k in range(nt):
            a, b = W * k / nt + 0.003, W * (k + 1) / nt - 0.003
            box(P, COPING, ((a + b) / 2, 0, BW_ZB + CREASE_T / 2), (b - a, BW_D + 0.08, CREASE_T), 0.005, 1)
        box(P, MORTAR, (W / 2, 0, BW_ZB + CREASE_T / 2), (W, BW_D + 0.06, CREASE_T - 0.008))          # the tiles' joints
        for k in range(4):
            coping_stone(P, W * k / 4 + 0.003, W * (k + 1) / 4 - 0.003, 0.008)
        box(P, MORTAR, (W / 2, 0, BW_ZB + CREASE_T + 0.024), (W, BW_D + 0.03, 0.046))                  # the stones' joints
    elif lod == 1:
        box(P, BRICK, (W / 2, 0, (BW_FOOT + BW_ZB) / 2), (W, BW_D + 2 * BR_P, BW_ZB - BW_FOOT))
        box(P, COPING, (W / 2, 0, BW_ZB + CREASE_T / 2), (W, BW_D + 0.08, CREASE_T))
        coping_stone(P, 0.0, W, 0.0)
    else:
        box(P, BRICK, (W / 2, 0, (BW_FOOT + BW_ZB + CREASE_T) / 2), (W, BW_D + 0.04, BW_ZB + CREASE_T - BW_FOOT))
        coping_stone(P, 0.0, W, 0.0)
    o = P.to_object(smooth_angle=30)
    wn = o.modifiers.new("weighted", "WEIGHTED_NORMAL"); wn.keep_sharp = True; wn.weight = 50
    return o


def brick_tones(o, seed=11):
    """COLOR_0.g: one random tone per brick (a connected island of brick faces), 0.5 elsewhere (and on LOD1 / LOD2)"""
    import random
    me = o.data
    col = me.color_attributes.get("Col")
    if col is None: return
    bi = next((i for i, m in enumerate(me.materials) if m.name == "brick"), -1)
    tone = [0.5] * len(me.vertices)
    if o.name.endswith("_lod0") and bi >= 0:
        rnd = random.Random(seed)
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        seen = set()
        for f in bm.faces:
            if f.material_index != bi or f.index in seen: continue
            stack, isl = [f], []
            seen.add(f.index)
            while stack:
                g = stack.pop(); isl.append(g)
                for e in g.edges:
                    for h in e.link_faces:
                        if h.material_index == bi and h.index not in seen: seen.add(h.index); stack.append(h)
            vs = {v.index for g in isl for v in g.verts}
            if len(vs) > 64: continue                          # (the skirt box: the mean)
            t = min(1.0, max(0.0, rnd.gauss(0.5, 0.2)))
            for v in vs: tone[v] = t
        bm.free()
    for v, c in enumerate(col.data):
        r = c.color[0]; c.color = (r, tone[v], r, 1.0)


objs = [pf_rail(), pf_bars(), pf_mesh(), pf_post(), leaf("pf_gate2", 2.0, 2.4, True, False), leaf("pf_gate1", 1.1, 1.8, False, True)]
for lod in (0, 1, 2): objs += [pf_pier(lod), pf_plinth(lod), pf_brick(lod)]
for o in objs: tick(f"{o.name}: {K.tris(o)} tris, size {tuple(round(v, 3) for v in o.dimensions)}")


def gpu_setup():
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "OPTIX"; pr.get_devices()
        on = [d for d in pr.devices if d.type == "OPTIX"]
        for d in pr.devices: d.use = d.type == "OPTIX"
        scn.cycles.device = "GPU" if on else "CPU"
        tick(f"Cycles device: {scn.cycles.device} ({[d.name for d in on]})")
    except Exception as e:
        scn.cycles.device = "CPU"; tick(f"Cycles device: CPU ({e})")


def bake_vertex_ao(objs):
    """Cycles AO per vertex into 'Col' (COLOR_0): each piece alone, on its stand (the ground; a railing on its plinth)"""
    scn.render.engine = "CYCLES"; gpu_setup(); scn.cycles.samples = 128
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 0.6
    for o in objs:
        me = o.data
        me.color_attributes.new("Col", "BYTE_COLOR", "POINT")
        me.color_attributes.active_color = me.color_attributes["Col"]
        stand = []
        if o.name.startswith("pf_rail"):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(W / 2, 0, -0.4)); c = bpy.context.active_object
            c.scale = (W * 3, 0.48, 0.8); stand.append(c)
        else:
            bpy.ops.mesh.primitive_plane_add(size=12, location=(W / 2, 0, 0)); stand.append(bpy.context.active_object)
        for x in objs: x.hide_render = x is not o
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        for c in stand: bpy.data.objects.remove(c)
    for x in objs: x.hide_render = False
    # the coarser stone LODs: their mean AO matched to LOD0's (no brightness step at the hand-over); LOD2 flat
    def mean(o):
        d = o.data.color_attributes["Col"].data
        v = [c.color[0] for c, q in zip(d, o.data.vertices) if q.co.z >= -0.001]
        return sum(v) / max(1, len(v))
    by = {o.name: o for o in objs}
    for o in objs:
        for k in ("_lod1", "_lod2"):
            if not o.name.endswith(k): continue
            ref = by.get(o.name[: -len(k)] + "_lod0")
            m0, m = mean(ref), mean(o)
            for c in o.data.color_attributes["Col"].data:
                v = m0 if (k == "_lod2" or m <= 1e-4) else min(1.0, c.color[0] * m0 / m)
                c.color = (v, v, v, 1.0)
    tick("AO baked")


if BAKE:
    bake_vertex_ao(objs)
    for o in objs:
        if o.name.startswith("pf_brick"): brick_tones(o)
K.export_glb(objs, os.path.join(OUT, "parkfence.glb"), colors=BAKE)
info = {
    "asset": "Park fence kit: railings, bar fence, welded mesh, posts, stone piers and plinths, park gate leaves (tools/blender/parkFenceKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up; panels: x 0..2.5 along the run, y 0 = the ground line (pf_rail: the plinth's coping top), +Z (three.js) = outside the park; leaves: x 0 = the hinge; piers: centred",
    "ao": "COLOR_0 (Cycles AO per vertex, on the ground / the plinth)" if BAKE else "none (--no-bake)",
}
json.dump(info, open(os.path.join(OUT, "parkfence.json"), "w"), indent=1)

if PREVIEWS:
    blank = bpy.data.images.new("blank", 8, 8); blank.pixels = [1.0] * 256
    so, cam = K.preview_setup(blank, sun_elev=34, sun_az=210)
    scn.render.engine = "CYCLES"; gpu_setup(); scn.cycles.samples = 64
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    lay = {"pf_rail_lod0": (0, 0, 0.8), "pf_plinth_lod0": (0, 0, 0), "pf_pier_lod0": (-0.45, 0, 0), "pf_bars_lod0": (3.2, 0, 0), "pf_mesh_lod0": (6.2, 0, 0),
           "pf_post_lod0": (8.9, 0, 0), "pf_gate2_lod0": (10.0, 0, 0), "pf_gate1_lod0": (12.6, 0, 0),
           "pf_pier_lod1": (16, 0, 0), "pf_pier_lod2": (17.2, 0, 0), "pf_plinth_lod1": (18.4, 0, 0), "pf_plinth_lod2": (21.2, 0, 0),
           "pf_brick_lod0": (24.0, 0, 0), "pf_brick_lod1": (27.0, 0, 0), "pf_brick_lod2": (30.0, 0, 0)}
    for o in objs:
        o.location = lay.get(o.name, (0, 40, 0))
    K.render(cam, os.path.join(PV, "parkfence_all.jpg"), (7.0, -11.0, 2.2), (7.0, 0, 1.2), 28, (1800, 800))
    K.render(cam, os.path.join(PV, "parkfence_close.jpg"), (0.6, -2.4, 1.6), (0.9, 0, 1.3), 35, (1400, 900))
    K.render(cam, os.path.join(PV, "parkfence_gate.jpg"), (11.0, -3.6, 1.4), (11.0, 0, 1.2), 35, (1400, 900))
    K.render(cam, os.path.join(PV, "parkfence_brick.jpg"), (25.6, -4.6, 1.5), (25.4, 0, 1.2), 35, (1400, 900))
    K.render(cam, os.path.join(PV, "parkfence_brick_close.jpg"), (24.4, -1.2, 2.1), (25.0, 0, 1.9), 40, (1400, 900))
tick("done")
