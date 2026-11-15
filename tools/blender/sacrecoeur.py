"""EGLISE DU SACRE-COEUR / HEILIG HARTKERK (Rue Vanderkindere, Uccle; wikidata Q62570896; built 1952): the scripted
landmark, built entirely in code from MEASURED data (UrbIS solid 729884 + DSM / DTM 2021, OSM way 226396246) and the
Street View front (looked at only; docs/landmarks/SACRECOEUR.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/sacrecoeur.py -- models/sacrecoeur [--no-bake] [--fast] [--previews] [--views=a,b] [--checker] [--level=1]
      models/sacrecoeur/sacrecoeur.raw.glb   nodes "SacreCoeur" (LOD0), "SacreCoeur_far" (LOD1), "SacreCoeur_xfar" (LOD2)
      models/sacrecoeur/sacrecoeur_ao.png    ambient occlusion (Cycles on the GPU, each level alone) in TEXCOORD_1
      models/sacrecoeur/sacrecoeur.json      slots, codes, placement, counts, measured / estimated

THE CHURCH (nl.wikipedia "Heilig Hartkerk (Ukkel)": a non-oriented church, a nave of three bays, a wider crossing, a
narrower choir with a three-sided closure, the bell tower in the western angle of the choir and the crossing, the nave's
saddle roof running into the crossing's tent roof, the choir's lower saddle roof too; the portal on the north side under
the tall narrow windows). Frame (tools/landmark5_measure.py): u along the axis from the north front (u 0) to the choir
(south), w to the WEST; heights m TAW.
MEASURED (DSM 2021 0.25 m resampled, UrbIS LoD2 levels, OSM): the front line and the walls' plan (OSM), the nave ridge
121.6 (DSM 121.5-121.7) and eaves 113.2 at the front walls (UrbIS 113.21), the roof running down to 111.6 at |w| 7.2
over the aisles (UrbIS 111.61-111.65; DSM 112.0 at |w| 7.0), the aisles' lean-tos (DSM 108.0 -> 106.3; UrbIS eaves
106.18-106.31), the crossing u 22.5-37.0 x w -8.1..7.6 (UrbIS 113.25-113.30) under its tent roof (DSM apex 123.0-123.1),
the choir (eaves 110.2, ridge 117.0, the hip down to 110.7 at u 49), the tower (3.4 m square; DSM spire apex 129.3;
UrbIS top 130.06), the side and back blocks' roofs (west block ridge 112.6 at u 40.5; south block gable ridge 109.8
at u 53, flat 106.8), the front annexes (u -3.85 / -3.5; their roofs slope to the street: DSM 109.2 -> 106.3).
FROM THE FRONT PHOTO (Street View 2023, calibrated on the floor and the ridge): coursed rubble sandstone walls with pale
stone dressings, the gable with seven stepped lancets (apex 110.4-112.5, sills 107.6) on a sill band, the stone
crucifix relief (113.4-118.8), three pointed portals with two-order arches (centre 2.5 m, sides 1.2 m) and oak doors,
four steps, the side annexes with three small lancets each, the east annex's gabled dormer, the west annex's
spired dormer, the corner piers.
ESTIMATED (not visible from public streets): every opening of the side, crossing, choir and back walls, the tower's
belfry openings and slits, the buttresses' rhythm, the blocks' windows, the wall thicknesses (reveals 0.25-0.35 m).
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
import church_kit as CK
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, fbox, wbox, bar, lathe, sweep2d, sweep3d, face_dir,
                             face_up, quad, ccw, OY, pointed)
from church_kit import (Seg, vwall, lancet, rect_window, roof_poly, ring_prism, pyramid, rodc, iron_cross, ridge_cap, gutter,
                        offset_uw, ccw_uw, flat_group, segs, FAR, XFAR, STONE, BLUE, SLATE, ZINC, WOOD, GLASS, IRON,
                        C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER,
                        C_GILT, C_DOOR, C_FRAME, C_LEAD)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/sacrecoeur")
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "landmark5")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
SLOTS = ["rubble_stone", "stone_white", "slate", "zinc_roof", "wood_oak", "glass_window", "cast_iron_green"]

# ------------------------------------------------------------------------------------------------ THE PLAN (measured)
HB = 101.2; CK.KIT.HB = HB          # walls go this far down (DTM round the walls 101.75-103.5)
G_FRONT, FLOOR = 101.9, 102.8       # the street before the steps (DTM 101.85-102.08); the church floor (photo: four risers)
NW = 6.07                           # the nave's front wall half-width (OSM w -6.08 .. 6.07)
SW = 7.2                            # the nave roof comes down to |w| 7.2 over the aisles (UrbIS 111.61-111.65)
RIDGE, KN = 121.6, 1.384            # nave ridge (DSM 121.5-121.7), slope (eaves 113.2 at |w| 6.07: 54 deg)
A_TOP, KA = 108.0, 0.65             # the aisles' lean-to: 108.0 at |w| 7.2 down to 106.3 at the outer walls (33 deg)
WE, WW = -9.8, 10.2                 # the outer walls (OSM east w -9.68..-9.87, west 10.18..10.27)
AN_TOP, KAN = 109.2, 0.85           # the front annexes' roofs slope to the street (DSM 109.2 at u 0, 106.3 at u -3)
AN_UE, AN_UW = -3.85, -3.5          # the annexes' fronts (OSM)
CU0, CU1, CWE, CWW = 22.5, 37.0, -8.1, 7.6     # the crossing (UrbIS 113.25-113.30 corners)
C_EAVE, APEX = 113.3, (29.75, -0.25, 123.0)    # its tent roof (DSM 123.0-123.1)
KCU = (APEX[2] - C_EAVE) / ((CU1 - CU0) / 2)
CHE, CHW, CHC = -5.0, 4.5, -0.25               # the choir walls (DSM eaves line; the ridge at w -0.25 .. -0.6)
CH_EAVE, CH_RIDGE = 110.2, 117.0
KC = (CH_RIDGE - CH_EAVE) / (CHW - CHC)
CH_U1, APSE_U = 46.8, 49.3                     # the straight choir, the closure's end facet (DSM hip to 110.7 at u 49)
APSE_HALF = 2.2                                # the end facet |w - CHC| (OSM west facet (46.70, 4.26) -> (48.97, 2.16))
TU0, TU1, TW0, TW1 = 37.0, 40.4, 3.4, 6.8      # the tower (DSM spire centred (38.7, 5.1), 3.4 m square)
T_TOP, SPIRE_TOP, CROSS_TOP = 119.0, 129.3, 130.1
WB_RIDGE_U, WB_RIDGE, KWB = 40.5, 112.6, 0.95  # the west block (UrbIS 112.58 at u 40.34-40.54)
SB_U1, SB_FLAT, SB_GABLE = 59.5, 106.8, (50.0, 56.0, 53.0, 109.8, -1.0)   # the south block: flat + a gable along w
O = 0.3                                        # eaves overhang
J = 0.012                                      # a roof slab stops this short of the wall it abuts (no face in the wall plane)
CE = C_EAVE - 0.14                             # the crossing walls stop under the tent roof slab (its fascia stands above them)

def h_nave(u, w): return RIDGE - KN * abs(w)
def h_aisle(u, w): return A_TOP - KA * (abs(w) - SW)
def h_annex(u, w): return AN_TOP + KAN * u
def h_choir(u, w): return CH_RIDGE - KC * abs(w - CHC)
def h_wb(u, w): return WB_RIDGE - KWB * abs(u - WB_RIDGE_U)
def h_pyr_n(u, w): return APEX[2] - KCU * (APEX[0] - u)
def h_pyr_s(u, w): return APEX[2] - KCU * (u - APEX[0])
# the valleys: the nave ridge meets the tent roof's north face, the choir ridge its south face
U_VN = APEX[0] - (APEX[2] - RIDGE) / KCU                       # 28.70
W_VN = (RIDGE - C_EAVE) / KN                                   # 6.00 (|w| where the nave roof is at the crossing's eaves)
U_VS = APEX[0] + (APEX[2] - CH_RIDGE) / KCU                    # 34.23
W_VS = (CH_RIDGE - C_EAVE) / KC                                # 2.59 (|w - CHC|)
R1_U = APSE_U + O - (CH_RIDGE - (CH_EAVE - O * KC)) / KC       # the choir ridge's end (the closure's hips)
APSE = [(CH_U1, CHW), (APSE_U, CHC + APSE_HALF), (APSE_U, CHC - APSE_HALF), (CH_U1, CHE)]

def gnd(u, w): return G(u, w)

# ------------------------------------------------------------------------------------------------ helpers
parch = CK.parch

def ushape(outer, inner):
    """the face between two openings that share the bottom line (an arch order's step): one simple polygon"""
    return outer + list(reversed(inner))

def portal(seg, t, wd, spring, apex, orders, door_d=0.55):
    """a pointed portal in blue stone: concentric orders stepping in (each 0.14 deep), the arch's reveal to the door,
    the oak door filling the arch; a hood moulding round the outer order"""
    fr = seg.fr; sc = seg.s(t); n = segs(10, 5, 3)
    v0 = hz(FLOOR) - 0.02
    loops = [parch(sc - wd / 2 - o, sc + wd / 2 + o, v0, hz(spring), hz(apex) + o * 1.1, n) for o in [0.0] + [o for o in orders]]
    if XFAR():
        strip2d(fr, loops[-1], 0.0, -0.2, BLUE, C_SUR); fill2d(fr, [loops[-1]], -0.2, WOOD, C_DOOR); return loops[-1]
    d = 0.0
    for k in range(len(loops) - 1, 0, -1):
        strip2d(fr, loops[k], d, d - 0.14, BLUE, C_SUR)
        d -= 0.14
        fill2d(fr, [ushape(loops[k], loops[k - 1])], d, BLUE, C_SUR)
    strip2d(fr, loops[0], d, -door_d, BLUE, C_SUR)
    fill2d(fr, [loops[0]], -door_d, WOOD, C_DOOR)
    if not FAR():
        # the hood moulding over the outer order's arch (from the springing up and over)
        arc = [p for p in loops[-1] if p[1] >= hz(spring) - 1e-6]
        sweep2d(fr, arc, [(0.0, -0.02), (0.07, -0.02), (0.1, 0.03), (0.1, 0.1), (0.0, 0.12)], BLUE, C_SUR, caps=True)
        # door: stiles, rails (raised oak), the leaves' meeting stile on the double door, iron ring handles
        dz0 = hz(FLOOR); dzs = hz(spring)
        for v in (dz0 + 0.25, dz0 + (dzs - dz0) * 0.5, dzs - 0.12):
            fbox(fr, sc - wd / 2, sc + wd / 2, v - 0.06, v + 0.06, -door_d, -door_d + 0.045, WOOD, C_DOOR, skip=("back",))
        for s_ in ((sc - wd / 2 + 0.08,) + ((sc,) if wd > 1.6 else ()) + (sc + wd / 2 - 0.08,)):
            fbox(fr, s_ - 0.06, s_ + 0.06, dz0, dzs, -door_d, -door_d + 0.05, WOOD, C_DOOR, skip=("back",))
        rodc(fr.p(sc + (0.12 if wd > 1.6 else wd / 2 - 0.25), dz0 + 1.05, -door_d + 0.06), fr.p(sc + (0.12 if wd > 1.6 else wd / 2 - 0.25), dz0 + 1.2, -door_d + 0.06), 0.02, IRON, C_FRAME)
    return loops[-1]

def buttress(seg, t, half, proud, top, cap=0.35, mat=STONE, cap_mat=BLUE):
    """a stepped buttress against the wall: a block to `top` and a sloped stone weathering back into the wall"""
    fr = seg.fr; s = seg.s(t)
    fbox(fr, s - half, s + half, hz(HB), hz(top), 0.0, proud, mat, C_PLAIN)
    if XFAR(): return
    K.B.new_group()
    a0, a1 = fr.p(s - half - 0.03, hz(top), proud + 0.04), fr.p(s + half + 0.03, hz(top), proud + 0.04)
    b0, b1 = fr.p(s - half - 0.03, hz(top) + cap, 0.0), fr.p(s + half + 0.03, hz(top) + cap, 0.0)
    c0, c1 = fr.p(s - half - 0.03, hz(top) - 0.08, proud + 0.04), fr.p(s + half + 0.03, hz(top) - 0.08, proud + 0.04)
    d0, d1 = fr.p(s - half - 0.03, hz(top) - 0.08, 0.0), fr.p(s + half + 0.03, hz(top) - 0.08, 0.0)
    up = (fr.N + Z).normalized()
    face_dir([a0, a1, b1, b0], up, cap_mat, C_COPING)
    face_dir([c0, c1, a1, a0], fr.N, cap_mat, C_COPING)
    face_dir([c0, a0, b0, d0], -fr.U, cap_mat, C_COPING)
    face_dir([c1, d1, b1, a1], fr.U, cap_mat, C_COPING)
    face_dir([c0, d0, d1, c1], -Z, cap_mat, C_COPING)
    flat_group()

def coping_rake(seg, pts, proud=0.1, up=0.28, back=0.3, mat=BLUE):
    """a stone coping along a gable's rake: pts [(t, h)] from the eaves up to past the apex"""
    if XFAR(): return
    sweep2d(seg.fr, seg.st(pts) if not seg.flip else seg.st(pts), [(-back, -0.05), (proud, -0.05), (proud, up), (-back, up)], mat, C_COPING, caps=True)

def dormer(uf, wc, half, h_sill, eave, apex, kind="gable"):
    """a small dormer on the north-sloping annex roof (plane h_annex): front wall at u = uf facing north, slate cheeks,
    a gabled (east annex) or spired (west annex) roof; a small window"""
    hroof = lambda u: h_annex(u, 0)
    ub = (eave - AN_TOP) / KAN                       # where the eave line meets the roof plane
    sf = Seg((uf, wc - half), (uf, wc + half), (-1, 0))
    top = [(0, eave), (half, apex), (2 * half, eave)] if kind == "gable" else eave
    hole = rect(sf.s(half) - 0.24, hz(h_sill), sf.s(half) + 0.24, hz(eave - 0.12))
    vwall(sf, top, bottom=hroof(uf) - 0.25, holes=[hole], mat=SLATE)
    strip2d(sf.fr, hole, 0.0, -0.12, WOOD, C_FRAME)
    fill2d(sf.fr, [hole], -0.12, GLASS, C_LEAD)
    for sgn in (-1, 1):
        sc = Seg((uf, wc + sgn * half), (ub, wc + sgn * half), (0, sgn))
        vwall(sc, [(0, eave), (ub - uf, eave)], bottom=[(0, hroof(uf) - 0.25), (ub - uf, eave - 0.25)], mat=SLATE)
    if kind == "gable":
        for sgn in (-1, 1):
            roof_poly([(uf - 0.15, wc), (ub + 0.6, wc), (ub + 0.6, wc + sgn * (half + 0.12)), (uf - 0.15, wc + sgn * (half + 0.12))],
                      lambda u, w: apex - (apex - eave + 0.08) * abs(w - wc) / (half + 0.12) + 0.04, th=0.08)
    else:
        pyramid(((uf + ub) / 2, wc), half + 0.1, eave, apex, SLATE, th=0.08, hu=(ub - uf) / 2 + 0.1)
        if not FAR(): rodc(P((uf + ub) / 2, wc, apex - 0.05), P((uf + ub) / 2, wc, apex + 0.35), 0.015, IRON, C_GILT)

# ------------------------------------------------------------------------------------------------ the north front
LANCETS = [(0.0, 112.5), (1.04, 112.2), (-1.04, 112.2), (2.08, 111.4), (-2.08, 111.4), (3.12, 110.4), (-3.12, 110.4)]
L_W, L_SILL = 0.6, 107.6

def front():
    seg = Seg((0.0, -SW), (0.0, SW), (-1, 0))           # t = w + 7.2 (east -> west), facing north
    fr = seg.fr; mid = SW
    top = [(0.0, h_nave(0, SW)), (mid, RIDGE), (2 * SW, h_nave(0, SW))]
    holes = [lancet(seg, mid + w_, L_W, L_SILL, top_, depth=0.32, sur=0.13, bars=3) for w_, top_ in LANCETS]
    holes += [portal(seg, mid, 2.5, 105.2, 106.5, (0.17, 0.34)),
              portal(seg, mid - 3.1, 1.2, 104.75, 105.3, (0.15, 0.3), door_d=0.5),
              portal(seg, mid + 3.1, 1.2, 104.75, 105.3, (0.15, 0.3), door_d=0.5)]
    vwall(seg, top, holes=holes)
    if not XFAR():
        # the sill band under the lancets
        fbox(fr, mid - 3.75, mid + 3.75, hz(L_SILL) - 0.42, hz(L_SILL) - 0.13, -0.01, 0.12, BLUE, C_BAND, skip=("back",))
        # the coping on the rakes (past the apex: each rake buried in the other), kneelers at the feet
        k = KN; ex = 0.25
        coping_rake(seg, [(0.0, h_nave(0, SW)), (mid + ex, RIDGE + ex * k)], proud=0.1)
        coping_rake(seg, [(mid - ex, RIDGE + ex * k), (2 * SW, h_nave(0, SW))], proud=0.13)
        for s0, s1 in ((-0.12, 0.42), (2 * SW - 0.42, 2 * SW + 0.12)):
            fbox(fr, s0, s1, hz(h_nave(0, SW)) - 0.45, hz(h_nave(0, SW)) + 0.05, -0.3, 0.14, BLUE, C_COPING, skip=())
        crucifix(fr, mid)
    # the corner piers (photo: pale-stone-edged rubble piers framing the portal bay, set back once, weathered tops)
    for s0 in (SW - 6.3, SW + 5.75):
        fbox(fr, s0, s0 + 0.55, hz(HB), hz(106.0), 0.0, 0.42, STONE, C_PLAIN)
        fbox(fr, s0 + 0.05, s0 + 0.5, hz(106.0), hz(110.6), 0.0, 0.26, STONE, C_PLAIN)
        if not XFAR():
            for (v, dp) in ((106.0, 0.42), (110.6, 0.26)):
                K.B.new_group()
                a = [fr.p(s0 - 0.02, hz(v), dp + 0.04), fr.p(s0 + 0.57, hz(v), dp + 0.04), fr.p(s0 + 0.57, hz(v) + 0.3, 0.0), fr.p(s0 - 0.02, hz(v) + 0.3, 0.0)]
                face_dir(a, (fr.N + Z * 1.4).normalized(), BLUE, C_COPING)
                face_dir([fr.p(s0 - 0.02, hz(v) - 0.08, dp + 0.04), fr.p(s0 + 0.57, hz(v) - 0.08, dp + 0.04), a[1], a[0]], fr.N, BLUE, C_COPING)
                for sx, sg in ((s0 - 0.02, -1), (s0 + 0.57, 1)):
                    face_dir([fr.p(sx, hz(v) - 0.08, dp + 0.04), fr.p(sx, hz(v), dp + 0.04), fr.p(sx, hz(v) + 0.3, 0.0), fr.p(sx, hz(v) - 0.08, 0.0)], fr.U * sg, BLUE, C_COPING)
                flat_group()
    steps(fr)

def crucifix(fr, s):
    """the stone crucifix relief on the gable (photo: a corbel at 113.4, the cross to 118.8, the bar at 116.3, the
    corpus): plain blocks, the figure simplified"""
    fbox(fr, s - 0.3, s + 0.3, hz(113.0), hz(113.2), 0.0, 0.3, BLUE, C_SCULPT)
    fbox(fr, s - 0.22, s + 0.22, hz(113.2), hz(113.5), 0.0, 0.24, BLUE, C_SCULPT)
    fbox(fr, s - 0.13, s + 0.13, hz(113.5), hz(118.8), 0.0, 0.16, BLUE, C_SCULPT)
    fbox(fr, s - 1.0, s - 0.13, hz(116.15), hz(116.45), 0.0, 0.16, BLUE, C_SCULPT)
    fbox(fr, s + 0.13, s + 1.0, hz(116.15), hz(116.45), 0.0, 0.16, BLUE, C_SCULPT)
    if FAR(): return
    # the corpus: arms along the bar, the torso, the legs, the head (a short lathe)
    for sg in (-1, 1):
        a = fr.p(s + sg * 0.12, hz(116.18), 0.2); b = fr.p(s + sg * 0.88, hz(116.38), 0.2)
        rodc(a, b, 0.055, BLUE, C_SCULPT, 6)
    fbox(fr, s - 0.15, s + 0.15, hz(115.25), hz(116.25), 0.16, 0.27, BLUE, C_SCULPT, skip=("back",))
    fbox(fr, s - 0.11, s + 0.11, hz(114.15), hz(115.25), 0.16, 0.25, BLUE, C_SCULPT, skip=("back",))
    lathe(fr.p(s, hz(116.27), 0.21), [(0.0, 0.0), (0.06, 0.0), (0.1, 0.06), (0.11, 0.14), (0.09, 0.22), (0.0, 0.26)], 8, BLUE, C_SCULPT)

def steps(fr):
    """four blue-stone steps across the portal bay, from the street (101.9) to the floor (102.8), and the landing"""
    s0, s1 = SW - 5.75, SW + 5.75
    n = 4; rise = (FLOOR - G_FRONT) / n
    fbox(fr, s0, s1, hz(HB + 0.3), hz(FLOOR), 0.0, 1.2, BLUE, C_PLAIN)
    d = 1.2
    for k in range(1, n):
        fbox(fr, s0, s1, hz(HB + 0.3), hz(FLOOR - rise * k), d, d + 0.55, BLUE, C_PLAIN)
        d += 0.55

def annex(sgn):
    """a front annex (sgn -1 east, +1 west): the front wall with three small lancets, the inner wall over the steps (its
    top follows the roof), the back wall above the aisle roof, the roof sloping to the street, the dormer"""
    uf = AN_UE if sgn < 0 else AN_UW
    wo = WE if sgn < 0 else WW
    wi = sgn * NW
    ef = h_annex(uf, 0)
    sf = Seg((uf, wi), (uf, wo), (-1, 0))
    L = abs(wo - wi)
    holes = [lancet(sf, L / 2 + dt, 0.3, 104.0, 105.5, depth=0.25, sur=0.09, bars=1) for dt in (-0.62, 0.0, 0.62)]
    vwall(sf, ef, holes=holes)
    if not XFAR(): fbox(sf.fr, 0.012, L - 0.012, hz(103.6), hz(103.84), -0.01, 0.1, BLUE, C_BAND, skip=("back",))
    si = Seg((uf, wi), (0.0, wi), (0, -sgn))
    vwall(si, [(0.0, ef), (-uf, AN_TOP)])
    # the annex's back wall above the aisle lean-to (u 0, |w| 7.2 .. outer)
    sb = Seg((0.0, sgn * SW), (0.0, wo), (1, 0))
    vwall(sb, AN_TOP, bottom=[(0.0, A_TOP - 0.3), (abs(wo) - SW, h_aisle(0, wo) - 0.3)])
    # the roof (verge over the inner wall, eave over the front)
    wv = wi - sgn * 0.14
    roof_poly([(-J, wv), (-J, wo + sgn * 0.05), (uf - O, wo + sgn * 0.05), (uf - O, wv)], h_annex)
    gut((uf - O, wv), (uf - O, wo), h_annex(uf - O, 0) - 0.02, (-1, 0))
    if not XFAR():
        if sgn < 0: dormer(-2.35, -7.95, 0.5, 107.3, 107.95, 108.55, "gable")
        else: dormer(-2.1, 8.15, 0.42, 107.4, 108.0, 109.5, "spire")

# ------------------------------------------------------------------------------------------------ the sides
BAYS = [2.3 + 4.6 * k for k in range(8)]          # bay centres (u); buttresses half-way between (ESTIMATED rhythm)

def long_wall(sgn):
    """the east (sgn -1) or west (+1) outer wall from the annex front to the back blocks: its top follows the annex
    roof's rake, the aisle eaves, the blocks (east: the south block's gable at u 50-56; west: the west block's gable)"""
    wo = WE if sgn < 0 else WW
    uf = AN_UE if sgn < 0 else AN_UW
    ue = SB_U1 if sgn < 0 else CH_U1
    seg = Seg((uf, wo), (ue, wo), (0, sgn))
    t = lambda u: u - uf
    ea = h_aisle(0, wo)
    if sgn < 0:
        g0, g1, gr, gh, _ = SB_GABLE
        top = [(0, h_annex(uf, 0)), (t(0), AN_TOP), (t(0), ea), (t(APSE_U - J), ea), (t(APSE_U - J), SB_FLAT), (t(g0), SB_FLAT), (t(gr), gh), (t(g1), SB_FLAT), (t(SB_U1), SB_FLAT)]
    else:
        top = [(0, h_annex(uf, 0)), (t(0), AN_TOP), (t(0), ea), (t(CU1), ea), (t(CU1), h_wb(CU1, 0)), (t(WB_RIDGE_U), WB_RIDGE), (t(CH_U1), h_wb(CH_U1, 0))]
    holes = []
    for k, uc in enumerate(BAYS):
        for dt in (-0.45, 0.45):
            holes.append(lancet(seg, t(uc + dt), 0.4, 104.0, 105.55, depth=0.28, sur=0.1, bars=1))
    if sgn < 0:
        for uc in (40.5, 44.5): holes.append(rect_window(seg, t(uc), 1.0, 103.9, 105.4))
        for uc in (51.4, 54.6): holes.append(rect_window(seg, t(uc), 0.9, 103.9, 105.6))
        holes.append(rect_window(seg, t(57.8), 0.9, 103.9, 105.6))
    else:
        holes.append(rect_window(seg, t(43.6), 1.0, 104.6, 106.4, mullion=True))
    vwall(seg, top, holes=holes)
    for k in range(1, len(BAYS)):
        buttress(seg, t(BAYS[k] - 2.3), 0.24, 0.42, 105.35, cap=0.5)

def strip_wall(sgn):
    """the wall under the nave roof's eave (|w| 7.2, u 0 - 22.5) above the aisle roof: a small lancet a bay (ESTIMATED)"""
    seg = Seg((0.0, sgn * SW), (CU0, sgn * SW), (0, sgn))
    holes = [lancet(seg, uc, 0.42, 108.55, 110.95, depth=0.25, sur=0.1, bars=1) for uc in BAYS[:5]]
    vwall(seg, h_nave(0, SW) + 0.02, bottom=A_TOP - 0.3, holes=holes)

# ------------------------------------------------------------------------------------------------ crossing, choir, tower
def crossing():
    for sgn, wc in ((-1, CWE), (1, CWW)):
        seg = Seg((CU0, wc), (CU1, wc), (0, sgn))
        L = CU1 - CU0
        holes = [lancet(seg, L / 2 + dt, 0.62, 108.5, top, depth=0.32, sur=0.12, bars=2) for dt, top in ((-1.15, 111.9), (0.0, 112.6), (1.15, 111.9))]
        vwall(seg, CE, bottom=h_aisle(0, wc) - 0.4, holes=holes)
        # north face beside the nave roof: from the nave roof's line (or the aisle roof) up to the eaves
        w0 = (RIDGE - CE) / KN
        sn = Seg((CU0, sgn * w0), (CU0, wc), (-1, 0))
        Ln = abs(wc) - w0
        vwall(sn, CE, bottom=[(0.0, CE), (SW - w0, h_nave(0, SW) - 0.05), (SW - w0, A_TOP - 0.35), (Ln, h_aisle(0, wc) - 0.35)])
    # south face: beside the choir roof east, between the valley and the tower west, above the west block
    se = Seg((CU1, CWE), (CU1, CHE), (1, 0))
    vwall(se, CE, bottom=[(0.0, h_aisle(0, CWE) - 0.35), (CWE * -1 + CHE, h_aisle(0, CHE) - 0.35)])
    wv = (CH_RIDGE - CE) / KC
    sc = Seg((CU1, CHE), (CU1, CHC - wv), (1, 0))
    vwall(sc, CE, bottom=[(0.0, h_choir(0, CHE) - 0.05), (sc.L, CE)])
    sw = Seg((CU1, CHC + wv), (CU1, TW0), (1, 0))
    vwall(sw, CE, bottom=[(0.0, CE), (sw.L, h_choir(0, TW0) - 0.05)])
    sx = Seg((CU1, TW1), (CU1, CWW), (1, 0))
    vwall(sx, CE, bottom=h_wb(CU1, 0) - 0.3)
    # the eaves: a stone course under the tent roof on the east and west faces
    if not XFAR():
        for wc, sgn in ((CWE, -1), (CWW, 1)):
            seg = Seg((CU0, wc), (CU1, wc), (0, sgn))
            fbox(seg.fr, 0.012, seg.L - 0.012, hz(CE) - 0.26, hz(CE) - 0.012, 0.0, 0.16, BLUE, C_CORN, skip=("back",))
    # the tent roof: four planar faces; the north and south faces cut by the nave's and the choir's valleys
    ap = (APEX[0], APEX[1])
    roof_poly([(CU0, CWE), (CU0, -W_VN), (U_VN, 0.0), (CU0, W_VN), (CU0, CWW), ap], h_pyr_n)
    roof_poly([(CU1, CWW), (CU1, CHC + W_VS), (U_VS, CHC), (CU1, CHC - W_VS), (CU1, CWE), ap], h_pyr_s)
    roof_poly([(CU0, CWE), ap, (CU1, CWE)], lambda u, w: APEX[2] - (APEX[2] - C_EAVE) * (APEX[1] - w) / (APEX[1] - CWE))
    roof_poly([(CU0, CWW), (CU1, CWW), ap], lambda u, w: APEX[2] - (APEX[2] - C_EAVE) * (w - APEX[1]) / (CWW - APEX[1]))
    if not FAR():
        for c in ((CU0, CWE), (CU0, CWW), (CU1, CWE), (CU1, CWW)):
            a_, b_ = P(c[0], c[1], C_EAVE + 0.05), P(ap[0], ap[1], APEX[2] + 0.02)
            ridge_cap(a_, b_ + (a_ - b_).normalized() * 0.35, w=0.09, h=0.07)
        gut((CU0 + 0.2, CWE - 0.02), (CU1 - 0.2, CWE - 0.02), C_EAVE - 0.02, (0, -1))
        gut((CU0 + 0.2, CWW + 0.02), (CU1 - 0.2, CWW + 0.02), C_EAVE - 0.02, (0, 1))
    if not XFAR():
        rodc(P(ap[0], ap[1], APEX[2] - 0.1), P(ap[0], ap[1], APEX[2] + 0.55), 0.04, ZINC, C_RIDGE, 8)

def choir():
    """the choir and its three-sided closure (the hips down to the end facet), slate roof running into the tent roof"""
    # walls: east above the east lean-to, west where the west block's roof is below the choir eave, the three facets
    se = Seg((CU1, CHE), (CH_U1, CHE), (0, -1))
    vwall(se, CH_EAVE, bottom=h_aisle(0, CHE) - 0.3)
    u_wb = WB_RIDGE_U + (WB_RIDGE - CH_EAVE) / KWB          # 43.03: south of this the west block's roof is below the eave
    sw = Seg((u_wb, CHW), (CH_U1, CHW), (0, 1))
    vwall(sw, CH_EAVE, bottom=[(0.0, CH_EAVE - 0.3), (sw.L, h_wb(CH_U1, 0) - 0.3)])
    ap = APSE
    for i in range(3):
        a, b = ap[i], ap[i + 1]
        m = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
        out = (m[0] - (CH_U1 - 2.0), m[1] - CHC)
        seg = Seg(a, b, out)
        bot = SB_FLAT - 0.3 if i == 1 else HB
        h0 = 107.2 if i == 1 else 106.5
        holes = [lancet(seg, seg.L / 2, 0.55, h0, 109.25, depth=0.3, sur=0.11, bars=2)]
        vwall(seg, CH_EAVE - 0.25, bottom=bot, holes=holes)
    # roof
    eav = offset_uw([(CU1 - 5, CHE), (CH_U1, CHE), ap[2], ap[1], (CH_U1, CHW), (CU1 - 5, CHW)], O)
    near = lambda c: min(eav, key=lambda p: (p[0] - c[0]) ** 2 + (p[1] - c[1]) ** 2)
    E = {"A": near((CH_U1, CHE)), "B": near(ap[2]), "C": near(ap[1]), "D": near((CH_U1, CHW))}
    he = CH_EAVE - O * KC
    R0, R1 = (U_VS, CHC), (R1_U, CHC)
    ws_e, ws_w = CHC - (CH_RIDGE - he) / KC, CHC + (CH_RIDGE - he) / KC
    roof_poly([(CU1 + J, ws_e), (E["A"][0], ws_e), R1, R0, (CU1 + J, CHC - W_VS)], h_choir)
    roof_poly([(CU1 + J, CHC + W_VS), R0, R1, (E["D"][0], ws_w), (CU1 + J, ws_w)], h_choir)
    hip = lambda a, b: (lambda u, w, a=a, b=b: plane3(P(a[0], a[1], he), P(b[0], b[1], he), P(R1[0], R1[1], CH_RIDGE), u, w))
    roof_poly([(E["A"][0], ws_e), E["B"], R1], hip((E["A"][0], ws_e), E["B"]))
    roof_poly([E["B"], E["C"], R1], hip(E["B"], E["C"]))
    roof_poly([E["C"], (E["D"][0], ws_w), R1], hip(E["C"], (E["D"][0], ws_w)))
    if not FAR():
        ridge_cap(P(R0[0] + 0.3, R0[1], CH_RIDGE + 0.02), P(R1[0] - 0.3, R1[1], CH_RIDGE + 0.02))
        for p in ((E["A"][0], ws_e), E["B"], E["C"], (E["D"][0], ws_w)):
            a_, b_ = P(p[0], p[1], he + 0.05), P(R1[0], R1[1], CH_RIDGE + 0.02)
            ridge_cap(a_, b_ + (a_ - b_).normalized() * 0.35, w=0.09, h=0.07)
        gut((E["A"][0], ws_e - 0.02), (CU1 + 0.05, ws_e - 0.02), he, (0, -1))

def plane3(a, b, c, u, w):
    """the height (TAW) at (u, w) on the plane through Blender points a, b, c"""
    n = (b - a).cross(c - a)
    q = P(u, w, OY)
    return (a.z - (n.x * (q.x - a.x) + n.y * (q.y - a.y)) / n.z) + OY

def tower():
    """the bell tower in the western angle of the choir and the crossing (DSM: 3.4 m square, the spire's apex 129.3;
    UrbIS top 130.06): rubble shaft, stone string courses, two louvred lancets a face in the belfry (ESTIMATED), a
    stone cornice, the slate spire, the iron cross"""
    lp = [(TU0, TW0), (TU1, TW0), (TU1, TW1), (TU0, TW1)]
    faces = [("N", Seg((TU0, TW0), (TU0, TW1), (-1, 0))), ("E", Seg((TU0, TW0), (TU1, TW0), (0, -1))),
             ("S", Seg((TU1, TW0), (TU1, TW1), (1, 0))), ("W", Seg((TU0, TW1), (TU1, TW1), (0, 1)))]
    for name, seg in faces:
        L = seg.L
        holes = []
        for dt in (-0.52, 0.52):
            holes.append(lancet(seg, L / 2 + dt, 0.42, 115.6, 118.05, depth=0.3, sur=0.1, glass=False, bars=0))
        if name in ("W", "S"): holes.append(lancet(seg, L / 2, 0.16, 110.6, 111.9, depth=0.25, sur=0.06, bars=0, sill=False))
        bot = C_EAVE - 0.1 if name == "N" else HB
        vwall(seg, T_TOP, bottom=bot, holes=holes)
        for dt in (-0.52, 0.52):
            sc = seg.s(L / 2 + dt)
            fill2d(seg.fr, [CK.lancet_loop(sc - 0.21, sc + 0.21, hz(115.6), hz(118.05))], -0.3, WOOD, C_LOUVRE)
            if not FAR():
                for j in range(6):
                    v = hz(115.75) + j * 0.36
                    fbox(seg.fr, sc - 0.21, sc + 0.21, v, v + 0.06, -0.3, -0.12, WOOD, C_LOUVRE, skip=())
    if not XFAR():
        for h in (113.3, 115.05):
            ring_prism(offset_uw(lp, 0.12), h - 0.22, h, BLUE, C_BAND, top=False, top_to=lp, bottom_to=lp); flat_group()
    ring_prism(offset_uw(lp, 0.2), T_TOP - 0.35, T_TOP, BLUE, C_CORN, top=True); flat_group()
    c = ((TU0 + TU1) / 2, (TW0 + TW1) / 2)
    ev, apx = pyramid(c, (TW1 - TW0) / 2 + 0.25, T_TOP - 0.05, SPIRE_TOP, SLATE, th=0.12, hu=(TU1 - TU0) / 2 + 0.25)
    if not FAR():
        for e in ev: ridge_cap(e + Z * 0.04, apx + (e - apx).normalized() * 0.35, w=0.06, h=0.05)
    top = P(c[0], c[1], SPIRE_TOP - 0.15)
    if not XFAR():
        lathe(top, [(0.0, 0.0), (0.09, 0.0), (0.12, 0.12), (0.09, 0.24), (0.04, 0.3), (0.0, 0.32)], segs(10, 6, 4), ZINC, C_GILT)
    iron_cross(top + Z * 0.25, CROSS_TOP - SPIRE_TOP - 0.1, 0.55, 0.55, t=0.06 if not XFAR() else 0.1)

# ------------------------------------------------------------------------------------------------ roofs, blocks
def nave_roof():
    for sgn in (-1, 1):
        roof_poly([(0.08, 0.0), (U_VN, 0.0), (CU0 - J, sgn * (W_VN + J / KCU * 0)), (CU0 - J, sgn * (SW + O)), (0.08, sgn * (SW + O))], h_nave)
        gut((0.15, sgn * (SW + O)), (CU0 - 0.05, sgn * (SW + O)), h_nave(0, SW + O) - 0.02, (0, sgn))
    if not FAR():
        ridge_cap(P(0.3, 0.0, RIDGE + 0.02), P(U_VN, 0.0, RIDGE + 0.02))
    # the aisles' lean-tos (east one runs on along the choir to the south block)
    roof_poly([(J, -SW - J), (CU1 + J, -SW - J), (CU1 + J, CHE - J), (APSE_U - J, CHE - J), (APSE_U - J, WE - O), (J, WE - O)], h_aisle)
    roof_poly([(J, SW + J), (J, WW + O), (CU1 - J, WW + O), (CU1 - J, SW + J)], h_aisle)
    if not FAR():
        gut((APSE_U - 0.05, WE - O), (0.05, WE - O), h_aisle(0, WE - O) - 0.02, (0, -1))
        gut((0.05, WW + O), (CU1 - 0.05, WW + O), h_aisle(0, WW + O) - 0.02, (0, 1))
    # the west block (a gable along w, ridge at u 40.5) and its walls
    roof_poly([(WB_RIDGE_U, CHW + J), (WB_RIDGE_U, WW + O), (CH_U1 + O, WW + O), (CH_U1 + O, CHW + J)], h_wb)
    roof_poly([(CU1 + J, TW1 + J), (CU1 + J, WW + O), (WB_RIDGE_U, WW + O), (WB_RIDGE_U, TW1 + J)], h_wb)
    roof_poly([(TU1 + J, CHW + J), (TU1 + J, TW1 + J), (WB_RIDGE_U, TW1 + J), (WB_RIDGE_U, CHW + J)], h_wb)
    if not FAR(): ridge_cap(P(WB_RIDGE_U, TW1 + 0.04, WB_RIDGE + 0.02), P(WB_RIDGE_U, WW + O - 0.03, WB_RIDGE + 0.02))
    sn = Seg((CU1, CWW), (CU1, WW), (-1, 0))
    vwall(sn, h_wb(CU1, 0), bottom=[(0.0, h_aisle(0, CWW) - 0.3), (sn.L, h_aisle(0, WW) - 0.3)])
    ss = Seg((CH_U1, CHW), (CH_U1, WW), (1, 0))
    vwall(ss, h_wb(CH_U1, 0), holes=[rect_window(ss, ss.L / 2, 1.0, 103.9, 105.6)])
    u_wb = WB_RIDGE_U + (WB_RIDGE - CH_EAVE) / KWB
    sx = Seg((TU1, CHW), (u_wb, CHW), (0, -1))
    vwall(sx, [(0.0, h_wb(TU1, 0)), (WB_RIDGE_U - TU1, WB_RIDGE), (sx.L, CH_EAVE)], bottom=CH_EAVE - 0.05)

def south_block():
    """the low back block (presbytery / sacristy): flat roof behind a coping, a gabled part along w (DSM ridge 109.8 at
    u 53), the curved bay on the west side (OSM), rectangular windows (ESTIMATED)"""
    bulge = [(56.4, 5.0), (55.52, 4.88), (54.68, 5.37), (53.88, 5.79), (52.93, 5.89), (52.11, 5.84), (51.51, 5.65), (50.88, 5.40), (50.4, 5.05)]
    loop = [(APSE_U, WE), (SB_U1, WE), (SB_U1, 4.2), (56.4, 4.3)] + bulge + [(APSE_U, 4.98), (APSE_U, CHE)]
    L = ccw_uw(loop)
    for i in range(len(L)):
        a, b = L[i], L[(i + 1) % len(L)]
        if abs(a[1] - WE) < 1e-6 and abs(b[1] - WE) < 1e-6: continue          # the long east wall
        if abs(a[0] - APSE_U) < 1e-6 and abs(b[0] - APSE_U) < 1e-6: continue  # against the apse / the east block (below)
        seg = Seg(a, b, ccw_out(a, b))
        holes = [rect_window(seg, seg.L * f, 0.9, 103.9, 105.7) for f in (0.2, 0.5, 0.8)] if abs(a[0] - SB_U1) < 1e-6 and seg.L > 3 else []
        vwall(seg, SB_FLAT, holes=holes)
    # the walls at u = APSE_U facing north: the well (CHE .. the apse's east corner) and the courtyard (the apse's west corner .. 4.98)
    for w0, w1 in ((CHE, CHC - APSE_HALF), (CHC + APSE_HALF, 4.98)):
        seg = Seg((APSE_U, w0), (APSE_U, w1), (-1, 0))
        vwall(seg, SB_FLAT)
    # the south block's north face behind the east lean-to, and the east block's end above the flat roof
    wcut = -(SW + (A_TOP - SB_FLAT) / KA)                # the east lean-to is above the flat roof from here to the choir
    seg = Seg((APSE_U, WE), (APSE_U, wcut), (-1, 0))
    vwall(seg, SB_FLAT, bottom=[(0.0, h_aisle(0, WE) - 0.3), (seg.L, SB_FLAT - 0.3)])
    seg = Seg((APSE_U, wcut), (APSE_U, CHE), (1, 0))
    vwall(seg, [(0.0, SB_FLAT), (seg.L, h_aisle(0, CHE))], bottom=SB_FLAT)
    # the east block's west face into the well
    seg = Seg((CH_U1, CHE), (APSE_U, CHE), (0, 1))
    vwall(seg, h_aisle(0, CHE))
    # flat roof + coping
    inner = offset_uw(loop, -0.25)
    face_up([P(u, w, SB_FLAT - 0.05) for u, w in ccw_uw(inner)], ZINC, C_PLAIN); flat_group()
    if not XFAR():
        ring_prism(offset_uw(loop, 0.06), SB_FLAT - 0.04, SB_FLAT + 0.16, BLUE, C_COPING, top=False, top_to=inner, bottom_to=loop); flat_group()
        inner_wall(inner, SB_FLAT - 0.06, SB_FLAT + 0.16, BLUE, C_COPING); flat_group()
    # the gabled part (ridge along w at u 53)
    g0, g1, gr, gh, gw = SB_GABLE
    kg = (gh - SB_FLAT) / (gr - g0)
    hg = lambda u, w: gh - kg * abs(u - gr)
    gv = gw + 0.15                                   # the verge over the gable end
    roof_poly([(gr, gv), (gr, WE - O), (g0 - O, WE - O), (g0 - O, gv)], hg)
    roof_poly([(gr, gv), (g1 + O, gv), (g1 + O, WE - O), (gr, WE - O)], hg)
    seg = Seg((g0, gw), (g1, gw), (0, 1))
    vwall(seg, [(0.0, SB_FLAT), (gr - g0, gh), (seg.L, SB_FLAT)], bottom=SB_FLAT - 0.2)
    if not FAR(): ridge_cap(P(gr, gv - 0.03, gh + 0.02), P(gr, WE - O + 0.03, gh + 0.02))

def ccw_out(a, b):
    """outward normal of a ccw_uw loop edge a -> b, in (u, w): Blender e = (du, -dw), N = (e.y, -e.x) = (-dw, -du) -> (u, w) (-dw, du)"""
    return (-(b[1] - a[1]), b[0] - a[0])

def gut(a, b, h, out):
    """an eaves gutter along (u, w) a - b at height h hanging toward `out` (u, w): ordered so the gutter's right side is out"""
    if FAR(): return
    du, dw = b[0] - a[0], b[1] - a[1]
    if (-dw) * out[0] + du * out[1] < 0: a, b = b, a
    gutter(P(a[0], a[1], h), P(b[0], b[1], h))

def inner_wall(loop_uw, h0, h1, mat, code):
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    cu = sum(p[0] for p in L) / n; cw = sum(p[1] for p in L) / n; c = P(cu, cw, OY)
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        q = [P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1)]
        e = q[1] - q[0]
        nrm = Vector((e.y, -e.x, 0))
        face_dir(q, -nrm, mat, code)

def downpipes():
    if FAR(): return
    for (u, w) in ((-3.7, WE - 0.12), (22.0, WE - 0.12), (49.0, WE - 0.12), (-3.35, WW + 0.12), (22.0, WW + 0.12)):
        top = h_aisle(0, WE) - 0.15 if u > 0 else h_annex(u, 0) - 0.15
        rodc(P(u, w, G(u, w) - 0.3), P(u, w, top), 0.05, ZINC, C_GUTTER, 8)

def build_all():
    front(); annex(-1); annex(1)
    long_wall(-1); long_wall(1); strip_wall(-1); strip_wall(1)
    crossing(); choir(); tower()
    nave_roof(); south_block(); downpipes()

build_all()
B0 = K.B
print(f"LOD0: {len(B0.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = 1
build_all()
B1 = K.B
print(f"LOD1: {len(B1.f)} faces")
K.B = SC.Builder(); K.FAR = 2
build_all()
B2 = K.B
K.FAR = False
print(f"LOD2: {len(B2.f)} faces")

info = {
    "dressings": "stone_white (the photo's pale grey-beige window surrounds, portal arches, copings, crucifix and steps; slot index BLUE in the kit)",
    "new_slot_names": {"wood_oak": "the portals' oak doors (light brown boards; not in the shared library: temporary material)",
                       "rubble_stone": "coursed rubble sandstone (Rosaire's slot; temporary material)"},
    "measured": {"frame": SITE["frame"], "footprint_osm": SITE["footprint_local"]["osm"], "solid_top": SITE["solid_top"]},
    "levels_taw": {"street": G_FRONT, "floor": FLOOR, "nave": {"ridge": RIDGE, "eaves_front_walls": round(h_nave(0, NW), 2), "eaves_low": round(h_nave(0, SW), 2)},
                   "aisles": [A_TOP, round(h_aisle(0, WE), 2)], "crossing": {"eaves": C_EAVE, "apex": APEX[2]},
                   "choir": {"eaves": CH_EAVE, "ridge": CH_RIDGE}, "tower": {"top": T_TOP, "spire": SPIRE_TOP, "cross": CROSS_TOP},
                   "west_block_ridge": WB_RIDGE, "south_block": {"flat": SB_FLAT, "gable": SB_GABLE[3]}},
    "estimated": "every opening of the side, crossing, choir, tower and back walls (not visible from public streets), the buttresses' rhythm, "
                 "the dormers' sizes, the door panelling, the wall thicknesses; the front's openings are from the Street View front "
                 "(calibrated on the floor and the ridge, +-0.3 m)",
}
views = {"north": ((-15.0, 0.6, 103.7), (0.0, 0.0, 111.0), 18, (900, 1100)),
         "northwide": ((-24.0, -9.0, 104.0), (8.0, 0.0, 112.0), 20, (1100, 900)),
         "east": ((26.0, -36.0, 106.0), (26.0, 0.0, 112.0), 20, (1200, 800)),
         "aerial": ((-30.0, -38.0, 150.0), (26.0, 0.0, 110.0), 26, (1100, 850)),
         "southwest": ((75.0, 32.0, 122.0), (32.0, 0.0, 112.0), 26, (1100, 850)),
         "tower": ((52.0, 22.0, 116.0), (38.7, 5.1, 120.0), 28, (900, 1000))}
cols = {"rubble_stone": (0.40, 0.33, 0.22), "stone_white": (0.55, 0.53, 0.48), "slate": (0.05, 0.055, 0.065), "zinc_roof": (0.25, 0.26, 0.27),
        "wood_oak": (0.35, 0.16, 0.06), "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.03, 0.03, 0.03)}
CK.finish("sacrecoeur", "SacreCoeur", OUT, PREV, ARGS, SLOTS, [B0, B1, B2], G, _g, SITE, info, ao_px=2048, views=views, cols=cols, sun=(42, 210), t0=T0)
