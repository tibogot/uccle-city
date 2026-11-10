"""CHAPELLE DE STALLE (Notre-Dame de Bon-Secours / des Affligés, rue de Stalle 50, Uccle; Gothic, probably end of the
15th century on a foundation of 1369, reworked c. 1693-97, restored 1932-33 and 1990-91; protected 1938) and the
sacristan's house of 1711: built entirely in code (no hand modelling) from MEASURED data + the photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stalle.py -- models/stalle [--no-bake] [--previews] [--fast]
      models/stalle/stalle.raw.glb   node "Stalle" (LOD0) + "Stalle_far" (the scripted far variant) + "Stalle_door" (the
                                     west door's two leaves, hidden while the interior cell is loaded); one primitive per
                                     NAMED material slot (SLOTS)
      models/stalle/stalle_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      models/stalle/stalle.json      measurements, slots, codes, placement, counts
      docs/stalle/preview_*.png      Cycles renders (--previews)

INPUT: models/stalle/site.json + site_dtm.* (tools/stalle_measure.py). Openings counted facade by facade on the photos
(data/raw/refs/stalle/SOURCES.md): west front (Commons c00 EmDee CC BY-SA 3.0, c05 Stemgée CC BY 4.0, inventory P02/P03),
north side (inventory P01 + c05 + c08), east chevet (reflexcity r_rear), the house (inventory P02 + P04). The SOUTH side
of the nave and the house's south / east faces have no photo: estimated (stalle.json "estimated").

SWAPPABLE MATERIALS: no colour, no texture in the GLB. COLOR_0.r = per-face code / 16 + 1/32, COLOR_0.g = per-vertex AO
of the thin parts; TEXCOORD_0 = world metres per face; TEXCOORD_1 = the baked AO's lightmap UV (lighting only).
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stalle_common as SC
import roofkit as RK
from stalle_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                           sweep3d, face_dir, face_up, quad, circle, pointed, offset_loop, foil, cusped_lancet, arc_pts, ccw,
                           WC, A_OUT, NW, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stalle")
BAKE = "--no-bake" not in ARGS and "--audit-only" not in ARGS     # --audit-only: geometry for the mesh audit (no lightmap UV, no bake; writes stalle.audit.raw.glb)
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "stalle")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]

SLOTS = ["sandstone_rubble", "stone_white", "stone_blue", "brick_red_brussels", "slate", "zinc_roof", "wood_frame_dark",
         "painted_wood_red", "glass_window", "cast_iron_green", "cobbles"]
RUB, STONE, BLUE, BRICK, SLATE, ZINC, WOOD, DOOR, GLASS, IRON, COBB = range(11)
CODES = ["plain", "coping", "surround", "tracery", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
         "interior", "door", "bell", "quoin", "lead"]
(C_PLAIN, C_COPING, C_SUR, C_TRAC, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_INT, C_DOOR, C_BELL,
 C_QUOIN, C_LEAD) = range(16)

HB = 33.2                     # walls go this far down (below every ground point of the site)
FAR = lambda: K.FAR

def poly_s(fr, pts):
    """plan points (u, w, h) -> wall-frame (s, Blender z)"""
    return [(fr.s_of(u, w), hz(h)) for u, w, h in pts]
def frame_uw(u, w, nu, nw):
    """a wall frame through plan point (u, w) with the outward normal (nu, nw) in plan"""
    return Frame(P(u, w, OY), Vector((nu, -nw, 0)))
def gnd(u, w): return G(u, w)

# ------------------------------------------------------------------------------------------------ dressings
def quoins(fr, s, v0, v1, side, d=0.0, alt=(0.28, 0.18), course=0.3, proud=0.008, mat=None, skip=("back",)):
    """long-and-short dressed quoins on an edge at s (side +1: the stones extend to +s)"""
    if FAR(): return
    mat = STONE if mat is None else mat
    v = v0; k = 0
    while v < v1 - 0.05:
        h = min(course, v1 - v)
        L = alt[k % 2]
        a, b = (s, s + side * L) if side > 0 else (s + side * L, s)
        fbox(fr, min(a, b), max(a, b), v + 0.006, v + h - 0.006, d, d + proud, mat, C_QUOIN, skip=skip)
        v += h; k += 1

GW_CH = 0.06            # the windows' chamfer at the face
def hole(loop, chamfer):
    """the wall's hole for an opening with a chamfered reveal: the loop widened by the chamfer (the chamfer faces fill
    the ring between; nothing lies behind the wall face there = no hidden flush ring to z-fight with)"""
    return offset_loop(loop, chamfer) if chamfer > 0 and not FAR() else loop

def door_hole(r, chamfer):
    """a door's hole: the rect widened by the chamfer on the jambs and the head only (the threshold stays square)"""
    if FAR() or chamfer <= 0: return r
    (a, v0), (b, _), (_, v1) = r[0], r[1], r[2]
    return rect(a - chamfer, v0, b + chamfer, v1 + chamfer)
def opening_reveal(fr, loop, depth, mat=STONE, code=C_SUR, chamfer=0.05, door=False):
    """a chamfered reveal: from the hole (the loop widened by `chamfer`, see hole()) at the face to the loop at
    -chamfer, then square back to `depth`. The wall's hole MUST be hole(loop, chamfer) (doors: door_hole(rect, chamfer),
    whose threshold is square and runs from the face)."""
    if FAR() or chamfer <= 0:
        strip2d(fr, loop, 0.0, -depth, mat, code); return
    if door:
        (a, v0), (b, _), (_, v1) = loop[0], loop[1], loop[2]
        c = chamfer
        K.B.new_group()
        for (p0, p1, q0, q1, nrm) in (((a - c, v0), (a - c, v1 + c), (a, v0), (a, v1), fr.U), ((a - c, v1 + c), (b + c, v1 + c), (a, v1), (b, v1), -Z),
                                      ((b + c, v1 + c), (b + c, v0), (b, v1), (b, v0), -fr.U)):
            face_dir([fr.p(*p0, 0.0), fr.p(*p1, 0.0), fr.p(*q1, -c), fr.p(*q0, -c)], nrm + fr.N, mat, code)
        for (p0, p1, nrm) in (((a, v0), (a, v1), fr.U), ((a, v1), (b, v1), -Z), ((b, v1), (b, v0), -fr.U)):
            face_dir([fr.p(*p0, -c), fr.p(*p1, -c), fr.p(*p1, -depth), fr.p(*p0, -depth)], nrm, mat, code)
        face_dir([fr.p(a - c, v0, 0.0), fr.p(b + c, v0, 0.0), fr.p(b, v0, -c), fr.p(a, v0, -c)], Z, mat, code)
        face_dir([fr.p(a, v0, -c), fr.p(b, v0, -c), fr.p(b, v0, -depth), fr.p(a, v0, -depth)], Z, mat, code)
        return
    big = ccw(offset_loop(loop, chamfer)); lp = ccw(loop); n = len(lp)
    K.B.new_group()
    for i in range(n):
        a0, b0 = big[i], big[(i + 1) % n]; a1, b1 = lp[i], lp[(i + 1) % n]
        A0, B0 = fr.p(a0[0], a0[1], 0.0), fr.p(b0[0], b0[1], 0.0)
        A1, B1 = fr.p(a1[0], a1[1], -chamfer), fr.p(b1[0], b1[1], -chamfer)
        ex, ey = b1[0] - a1[0], b1[1] - a1[1]
        out = fr.U * ey + Z * (-ex)
        if out.length < 1e-9: continue
        face_dir([A0, B0, B1, A1], -out + fr.N * out.length, mat, code)
    strip2d(fr, loop, -chamfer, -depth, mat, code)

def leaded_glass(fr, loop, d, code=C_LEAD):
    fill2d(fr, [loop], d, GLASS, code)

def tracery(fr, outline, lights, d0, d1, mat=STONE):
    """a stone tracery plate: the opening's outline minus the lights, from depth d0 (face) back to d1, the lights' sides"""
    # the plate's outer edge runs 1.2 cm INTO the reveal (it ended on the reveal's surface: 1-4 mm cracks to the wall's
    # inside next to the cusps, the audit's tracery leaks)
    fill2d(fr, [SC.offset_loop(outline, 0.012)] + lights, d0, mat, C_TRAC)
    for L in lights: strip2d(fr, L, d0, d1, mat, C_TRAC)

def hood(fr, loop_top, prof=((0.0, -0.06), (0.05, -0.06), (0.07, -0.03), (0.07, 0.04), (0.0, 0.07))):
    """a label (hood mould) along a path over an opening head"""
    if FAR(): return
    sweep2d(fr, loop_top, list(prof), STONE, C_SUR)

def gothic_window(fr, s, sill, spring, apex, w, n_lights, depth=0.32, foils=(), hood_off=0.16, statue=False):
    """a pointed window: chamfered reveal, stone tracery (cusped lancets + foils in the head), leaded glass, hood mould,
    a weathered sill. foils: [(ds, h, r, lobes)]. The wall's hole: hole(pointed(...), GW_CH)."""
    s0, s1 = s - w / 2, s + w / 2
    outline = pointed(s0, s1, hz(spring), hz(apex), n=16, bottom=hz(sill))
    if FAR():
        fill2d(fr, [outline], -0.12, GLASS, C_LEAD); strip2d(fr, outline, 0.0, -0.12, STONE, C_SUR)
        return outline
    opening_reveal(fr, outline, depth * 0.55, chamfer=GW_CH)
    outline, lights, l_spring, mullions = SC.window_lights(s, sill, spring, apex, w, n_lights, foils)
    tracery(fr, outline, lights, -0.08, -0.2)
    for L in lights: leaded_glass(fr, L, -0.17)
    # mullions' front fillets (rounded look): thin bars
    for x in mullions:
        fbox(fr, x - 0.025, x + 0.025, hz(sill) + 0.05, l_spring, -0.08, -0.055, STONE, C_TRAC)
    # sill: weathered stone ledge (sits on the wall face: no back face)
    fbox(fr, s0 - 0.12 - GW_CH, s1 + 0.12 + GW_CH, hz(sill) - GW_CH - 0.16, hz(sill) - GW_CH + 0.002, 0.0, 0.09, STONE, C_SILL)
    # hood mould: the arch's extrados offset
    big = pointed(s0 - hood_off, s1 + hood_off, hz(spring), hz(apex) + hood_off * 1.05, n=16)
    top = [p for p in big if p[1] >= hz(spring) - 1e-6]
    top = sorted(top, key=lambda p: p[0])
    hood(fr, [(top[0][0], top[0][1] - 0.12)] + top + [(top[-1][0], top[-1][1] - 0.12)])
    return outline
def window_hole(s, sill, spring, apex, w):
    return hole(pointed(s - w / 2, s + w / 2, hz(spring), hz(apex), n=16, bottom=hz(sill)), GW_CH)

OCU_N = 32
def oculus(fr, s, h, r_in, r_out, depth=0.3):
    c_in = circle(s, hz(h), r_in, OCU_N)
    if FAR():
        fill2d(fr, [c_in], -0.1, GLASS, C_LEAD); return c_in
    c_out = circle(s, hz(h), r_out, OCU_N)
    fill2d(fr, [c_out, c_in], 0.03, STONE, C_SUR)
    strip2d(fr, c_out, 0.03, 0.0, STONE, C_SUR, inward=False)
    strip2d(fr, c_in, 0.03, -depth * 0.5, STONE, C_SUR)
    fill2d(fr, [c_in], -0.12, GLASS, C_LEAD)
    return c_in

def anchor(fr, s, h, L=1.0):
    """a wrought-iron wall anchor (ancre): a flat vertical bar with a central boss"""
    if FAR(): return
    bar(fr, (s, hz(h - L / 2)), (s, hz(h + L / 2)), 0.0, 0.045, 0.025, IRON, C_PLAIN)
    fbox(fr, s - 0.04, s + 0.04, hz(h) - 0.05, hz(h) + 0.05, 0.0, 0.05, IRON, C_PLAIN)
    for e in (-1, 1):            # curled ends (stand off the bar's face: no coplanar faces)
        fbox(fr, s - 0.05, s + 0.05, hz(h + e * L / 2) - 0.02 + e * 0.02, hz(h + e * L / 2) + 0.02 + e * 0.02, 0.0, 0.032, IRON, C_PLAIN)

def plinth_run(fr, s0, s1, h_top=SC.PLINTH_TOP, out=0.07, caps=True):
    """the chamfered plinth course along a wall"""
    v = hz(h_top)
    if FAR():
        fbox(fr, s0, s1, hz(HB), v - out, 0.0, out, RUB, C_PLINTH); return
    sweep2d(fr, [(s0, v), (s1, v)], [(out, -(v - hz(HB))), (out, -out), (0.0, 0.0)], RUB, C_PLINTH, caps=caps)

def coping(a, b, half_in, half_out, th=0.2, mat=STONE, code=C_COPING, caps=True):
    """a stone coping on a wall top running a -> b (Blender points on the wall's outer face line, top of the coping)"""
    prof = [(-half_in, -th), (half_out, -th), (half_out, -0.05), (half_out - 0.03, 0.0), (-half_in + 0.03, 0.0), (-half_in, -0.05)]
    prof.append(prof[0])
    sweep3d([a, b], prof, Z, mat, code, caps=caps)

def coping_rake(a, apex, b, half_in, half_out, th=0.2, mat=STONE, code=C_COPING):
    """the raked coping of a gable as ONE mitred piece: the two slopes meet in the vertical plane through the apex
    (no overlapping halves = no coplanar side faces)"""
    if FAR():
        half_in, half_out = half_in, half_out
    prof = [(-half_in, -th), (half_out, -th), (half_out, -0.05), (half_out - 0.03, 0.0), (-half_in + 0.03, 0.0), (-half_in, -0.05)]
    if FAR(): prof = [(-half_in, -th), (half_out, -th), (half_out, 0.0), (-half_in, 0.0)]
    plane_n = Vector(((b - a).x, (b - a).y, 0)).normalized()        # horizontal, along the gable
    rows = []
    for p0, p1 in ((a, apex), (apex, b)):
        t = (p1 - p0).normalized(); r = t.cross(Z).normalized(); u2 = r.cross(t).normalized()
        rows.append([[p + r * x + u2 * y for x, y in prof] for p in (p0, p1)])
    # mitre: move the apex rows along their own path direction onto the vertical plane through the apex
    for k, (p0, p1) in enumerate(((a, apex), (apex, b))):
        t = (p1 - p0).normalized(); j = 1 if k == 0 else 0
        rows[k][j] = [q - t * ((q - apex).dot(plane_n) / t.dot(plane_n)) for q in rows[k][j]]
    K.B.new_group()
    n = len(prof)
    for R in rows:
        for i in range(n):
            A0, A1, B0, B1 = R[0][i], R[0][(i + 1) % n], R[1][i], R[1][(i + 1) % n]
            c = (A0 + B0) / 2 - (sum(R[0], Vector()) / n + sum(R[1], Vector()) / n) / 2
            face_dir([A0, B0, B1, A1], c, mat, code)
    face_dir(rows[0][0], a - apex, mat, code); face_dir(rows[1][1], b - apex, mat, code)

# ------------------------------------------------------------------------------------------------ the chapel
U_NE = SC.U_APSE
DF, DL = SC.DOOR_FRAME, SC.DOOR_LEAF
def west_front():
    fr = frame_uw(0.0, WC, -1, 0)                       # s = w - WC (south to the right)
    A, nw = A_OUT, NW
    cap = 0.2                                           # coping thickness: the wall stops under it
    R = SC.RAISE
    out = [(-A, hz(HB)), (A, hz(HB)), (A, hz(SC.AISLE_EAVE + R - cap)), (nw, hz(SC.AISLE_TOP + R - cap)), (nw, hz(SC.KNEEL - cap)),
           (0.0, hz(SC.GABLE_APEX - cap)), (-nw, hz(SC.KNEEL - cap)), (-nw, hz(SC.AISLE_TOP + R - cap)), (-A, hz(SC.AISLE_EAVE + R - cap))]
    dch = 0.07                                          # the door's chamfer (jambs + head; the threshold is square)
    door_hole = rect(-SC.DOOR_W / 2 - (dch if not FAR() else 0), hz(SC.FLOOR), SC.DOOR_W / 2 + (dch if not FAR() else 0), hz(SC.DOOR_TOP) + (dch if not FAR() else 0))
    win = window_hole(0.0, SC.WWIN_SILL, SC.WWIN_SPRING, SC.WWIN_APEX, SC.WWIN_W)
    ocu = circle(0.0, hz(SC.OCULUS_W_H), 0.2, OCU_N)
    fill2d(fr, [out, door_hole, win, ocu], 0.0, RUB, C_PLAIN)
    gothic_window(fr, 0.0, SC.WWIN_SILL, SC.WWIN_SPRING, SC.WWIN_APEX, SC.WWIN_W, 3, foils=SC.WEST_WINDOW["foils"])
    oculus(fr, 0.0, SC.OCULUS_W_H, 0.2, 0.34)
    west_door_opening(fr, dch)
    # steps (blue stone): two; the upper one runs into the opening under the leaves = the threshold (sealed bottom)
    g0 = gnd(-1.0, WC)
    box(P(0, WC, OY) * 1, Vector((0, -1, 0)), Z, Vector((-1, 0, 0)), -0.95, 0.95, hz(HB), hz(SC.FLOOR), -DF["u1"], 0.32, BLUE, C_SILL, skip=("back",))
    box(P(0, WC, OY) * 1, Vector((0, -1, 0)), Z, Vector((-1, 0, 0)), -1.1, 1.1, hz(HB), hz((SC.FLOOR + g0) / 2), 0.32, 0.68, BLUE, C_SILL, skip=("back",))
    # plinth course across the front (photo: a weathered band ~1.1 m up), quoins at the corners
    plinth_run(fr, -A, -SC.DOOR_W / 2 - 0.36, 35.0)
    plinth_run(fr, SC.DOOR_W / 2 + 0.36, A, 35.0)
    for sg in (-1, 1):
        quoins(fr, sg * A, hz(35.0), hz(SC.AISLE_EAVE + R - cap), -sg)                  # from the plinth's top
    # anchors (photo c00: two in the gable, two lower)
    anchor(fr, -1.39, 40.6); anchor(fr, 1.2, 40.6); anchor(fr, -1.92, 37.4); anchor(fr, 2.0, 37.4)
    # copings: the gable's rake (one mitred piece), the aisles' shoulders (raised above the aisle roofs), kneelers, the
    # apex block and its cross
    ti = SC.T_WEST
    rake_a = fr.p(-nw - 0.05, hz(SC.KNEEL), -ti / 2); rake_m = fr.p(0.0, hz(SC.GABLE_APEX), -ti / 2); rake_b = fr.p(nw + 0.05, hz(SC.KNEEL), -ti / 2)
    coping_rake(rake_a, rake_m, rake_b, ti / 2 + 0.03, ti / 2 + 0.06, cap)
    def cope(sa, ha, sb, hb):
        a = fr.p(sa, hz(ha), -ti / 2); b = fr.p(sb, hz(hb), -ti / 2)
        if FAR():
            sweep3d([a, b], [(-ti / 2 - 0.03, -cap), (ti / 2 + 0.05, -cap), (ti / 2 + 0.05, 0.0), (-ti / 2 - 0.03, 0.0), (-ti / 2 - 0.03, -cap)], Z, STONE, C_COPING)
        else: coping(a, b, ti / 2 + 0.03, ti / 2 + 0.06, cap)
    cope(-A - 0.05, SC.AISLE_EAVE + R, -nw + 0.02, SC.AISLE_TOP + R); cope(nw - 0.02, SC.AISLE_TOP + R, A + 0.05, SC.AISLE_EAVE + R)
    for sg in (-1, 1):
        # kneelers at the nave's eaves and at the aisles' outer corners
        fbox(fr, min(sg * (nw - 0.32), sg * (nw + 0.08)), max(sg * (nw - 0.32), sg * (nw + 0.08)), hz(SC.KNEEL - 0.42), hz(SC.KNEEL) + 0.02, -ti - 0.02, 0.08, STONE, C_COPING, skip=())
        fbox(fr, min(sg * (A - 0.36), sg * (A + 0.06)), max(sg * (A - 0.36), sg * (A + 0.06)), hz(SC.AISLE_EAVE + R - 0.4), hz(SC.AISLE_EAVE + R) + 0.03, -ti - 0.02, 0.08, STONE, C_COPING, skip=())
    parapet_backs()
    # apex block + the stone cross (botonnée: trefoil ends; photo c04)
    fbox(fr, -0.2, 0.2, hz(SC.GABLE_APEX) - 0.25, hz(SC.GABLE_APEX) + 0.18, -ti / 2 - 0.2, -ti / 2 + 0.2, STONE, C_COPING, skip=("bottom",))
    cross(fr, 0.0, SC.GABLE_APEX + 0.18, -ti / 2)
    if not FAR(): statue(fr)

def parapet_backs():
    """the gable wall's inner face where it stands above the roofs (u = T_WEST, facing east): from under the slates up
    into the coping. With it the roofs stop against a wall, not under an open coping (no slit, no z-fight)"""
    ti = SC.T_WEST; R = SC.RAISE; cap = 0.2
    fb = Frame(P(ti, WC, OY), Vector((1, 0, 0)))          # facing east; s = -(w - WC)
    S_ = lambda w: fb.s_of(ti, w)
    pit = SC.PITCH; nw = NW; A = A_OUT
    sl = (SC.AISLE_TOP - SC.AISLE_EAVE) / (A - nw)
    roof = lambda dw: (SC.RIDGE - dw * pit) if dw <= nw else (SC.AISLE_TOP + 0.04 - (dw - nw) * sl)
    cop = lambda dw: (SC.GABLE_APEX - (SC.GABLE_APEX - SC.KNEEL) * dw / (nw + 0.05) - cap) if dw <= nw else (SC.AISLE_TOP + R - (SC.AISLE_TOP - SC.AISLE_EAVE) * (dw - nw) / (A + 0.05 - nw) - cap)
    for sg in (-1, 1):
        ws = [0.0, nw - 0.001, nw + 0.001, A - 0.02]
        bot = [(S_(WC + sg * dw), hz(roof(dw) - 0.06)) for dw in ws]
        top = [(S_(WC + sg * dw), hz(cop(dw) + 0.01)) for dw in reversed(ws)]
        fill2d(fb, [bot + top], 0.0, RUB, C_PLAIN)

def west_door_opening(fr, dch):
    """the west door in the stone: chamfered jambs and head (the threshold square), the reveal back to the oak frame
    (dormant: jambs under a head, its back face closes the opening seen from inside), a lintel, quoined jambs and the
    relieving arch of voussoirs above. The leaves are their own node (west_door_leaves)."""
    W2, F, Tp = SC.DOOR_W / 2, hz(SC.FLOOR), hz(SC.DOOR_TOP)
    if FAR():
        strip2d(fr, rect(-W2, F - 0.02, W2, Tp), 0.0, -DF["u0"], STONE, C_SUR)      # its bottom buried in the step
        fill2d(fr, [rect(-W2, F - 0.02, W2, Tp)], -DF["u0"], WOOD, C_DOOR)
        return
    K.B.new_group()
    # chamfers: left jamb, head, right jamb (big at the face -> loop at -dch)
    big = [(-W2 - dch, F), (-W2 - dch, Tp + dch), (W2 + dch, Tp + dch), (W2 + dch, F)]
    lp = [(-W2, F), (-W2, Tp), (W2, Tp), (W2, F)]
    for i in range(3):
        A0, B0 = fr.p(*big[i], 0.0), fr.p(*big[i + 1], 0.0)
        A1, B1 = fr.p(*lp[i], -dch), fr.p(*lp[i + 1], -dch)
        mid = Vector(((lp[i][0] + lp[i + 1][0]) / 2, (lp[i][1] + lp[i + 1][1]) / 2))
        inward = fr.U * (-mid.x) + Z * (-(mid.y - (F + Tp) / 2) if i == 1 else 0.0)
        face_dir([A0, B0, B1, A1], inward.normalized() + fr.N, STONE, C_SUR)
    # the reveal (jambs + soffit) from the chamfer back into the frame's front
    for (a, b, nrm) in (((-W2, F), (-W2, Tp), fr.U), ((-W2, Tp), (W2, Tp), -Z), ((W2, Tp), (W2, F), -fr.U)):
        face_dir([fr.p(*a, -dch), fr.p(*b, -dch), fr.p(*b, -DF["u0"] - 0.005), fr.p(*a, -DF["u0"] - 0.005)], nrm, STONE, C_SUR)
    # the oak frame: jambs stop under the head (no overlapping fronts), the back faces stay (seen from inside)
    f = DF["face"]
    for sg in (-1, 1):
        a, b = sorted((sg * W2, sg * (W2 - f)))
        fbox(fr, a, b, F, Tp - DF["head"], -DF["u1"], -DF["u0"], WOOD, C_DOOR, skip=("right" if sg > 0 else "left", "bottom", "top", "back"))
    fbox(fr, -W2, W2, Tp - DF["head"], Tp, -DF["u1"], -DF["u0"], WOOD, C_DOOR, skip=("top", "left", "right", "back"))
    # quoined jambs: dressed stones beside the chamfer, proud 12 mm (they start at the chamfer's edge: closed boxes)
    for sg in (-1, 1):
        x = sg * (W2 + dch)
        v = F; k = 0
        while v < Tp - 0.05:
            h = min(0.32, Tp - v); L = (0.3, 0.2)[k % 2]
            a, b = sorted((x, x + sg * L))
            fbox(fr, a, b, v + 0.006, v + h - 0.006, 0.0, 0.012, STONE, C_SUR)
            v += h; k += 1
    lt = Tp + dch                                          # the lintel over the chamfered head
    fbox(fr, -W2 - 0.37, W2 + 0.37, lt, lt + 0.2, 0.0, 0.02, STONE, C_SUR)
    # relieving arch: a flat segmental band of 11 voussoirs, its ends resting on the lintel (photo: under the sill)
    R = 4.6; n = 11; half = 0.95
    a0 = math.asin(half / R)
    cy = lt + 0.2 + 0.006 - R * math.cos(a0)
    for k in range(n):
        t0 = -a0 + 2 * a0 * k / n + 0.0025; t1 = -a0 + 2 * a0 * (k + 1) / n - 0.0025
        pts = [(R * math.sin(t0), cy + R * math.cos(t0)), (R * math.sin(t1), cy + R * math.cos(t1)),
               ((R + 0.3) * math.sin(t1), cy + (R + 0.3) * math.cos(t1)), ((R + 0.3) * math.sin(t0), cy + (R + 0.3) * math.cos(t0))]
        fill2d(fr, [pts], 0.012, STONE, C_SUR); strip2d(fr, pts, 0.012, 0.0, STONE, C_SUR, inward=False)

def cross(fr, s, h0, d):
    """the gable's stone cross (botonnée: trefoil ends, photo c04) as ONE solid: the outline of shaft + arms extruded
    (no crossing boxes = no coplanar fronts), three-ball ends, a base"""
    th = 0.11
    if not FAR(): fbox(fr, s - 0.1, s + 0.1, hz(h0), hz(h0 + 0.12), d - 0.08, d + 0.08, STONE, C_SCULPT, skip=("bottom",))
    a, b, y0, y1, ya, yb = 0.055, 0.29, hz(h0 + (0.12 if not FAR() else 0.0)), hz(h0 + 0.88), hz(h0 + 0.5), hz(h0 + 0.61)
    outline = [(s - a, y0), (s + a, y0), (s + a, ya), (s + b, ya), (s + b, yb), (s + a, yb), (s + a, y1), (s - a, y1), (s - a, yb), (s - b, yb), (s - b, ya), (s - a, ya)]
    fill2d(fr, [outline], d + th / 2, STONE, C_SCULPT)
    fill2d(fr, [outline], d - th / 2, STONE, C_SCULPT, flip=True)
    strip2d(fr, outline, d + th / 2, d - th / 2, STONE, C_SCULPT, inward=False)
    if FAR(): return
    for (cs, cv, ax) in ((s, h0 + 0.93, "v"), (s - 0.33, h0 + 0.555, "h"), (s + 0.33, h0 + 0.555, "h")):
        for k in range(3):
            if ax == "v": ps, pv = cs + (k - 1) * 0.055, cv + (0.0 if k != 1 else 0.05)
            else: ps, pv = cs + (0.0 if k != 1 else (0.05 if cs > s else -0.05)), cv + (k - 1) * 0.055
            lathe_axis(fr.p(ps, hz(pv), d - th / 2 - 0.004), fr.N, Z, [(0.0, 0.0), (0.035, 0.006), (0.047, 0.03), (0.05, th / 2 + 0.004), (0.047, th - 0.022 + 0.008), (0.035, th + 0.002), (0.0, th + 0.008)], 14, STONE, C_SCULPT)

STATUE_FILE = os.path.join(OUT, "statue_mesh.json")
def statue(fr):
    """the Virgin and Child ('O.L. Vrouw der Nood', photo c03) on her pedestal on the west window's sill: an inscribed
    block, a moulded octagonal capital, a plinth; the figure itself is sculpted by tools/blender/stalle_statue.py
    (armature-posed body, cloth-simulated drapery, face and hands, weathering) -> models/stalle/statue_mesh.json"""
    s = 0.0; base = SC.WWIN_SILL - GW_CH + 0.002          # the sill ledge's top
    d0 = 0.0
    # inscribed block (O.L. VROUW DER NOOD) standing on the sill, the octagonal capital, the figure's plinth
    fbox(fr, s - 0.17, s + 0.17, hz(base), hz(base + 0.21), d0 - 0.06, d0 + 0.2, STONE, C_SCULPT, skip=("bottom",))
    c = fr.p(s, hz(base + 0.21), d0 + 0.08)
    lathe_axis(c, Z, fr.U, [(0.15, 0.0), (0.16, 0.012), (0.165, 0.03), (0.2, 0.06), (0.215, 0.085), (0.215, 0.105), (0.0, 0.105)], 8, STONE, C_SCULPT, a0=math.pi / 8)
    top = c + Z * 0.105
    fbox(fr, s - 0.14, s + 0.14, top.z, top.z + 0.05, d0 - 0.05, d0 + 0.21, STONE, C_SCULPT, skip=("bottom",))
    foot = top + Z * 0.05
    if not os.path.exists(STATUE_FILE):
        print("WARNING: no", STATUE_FILE, "(run tools/blender/stalle_statue.py): the statue is left out"); return
    S_ = json.load(open(STATUE_FILE))
    sv_vao, sv_seed = K.VAO, K.SEED
    K.VAO = True; K.SEED = 0.5
    K.B.new_group()
    X, Y = -fr.U, fr.N                                    # statue frame (right-handed): x = the viewer's left, y = out of the wall, z up
    V = [foot + X * x + Y * y + Z * z for x, y, z in S_["verts"]]
    for f in S_["faces"]:
        K.B.face([V[i] for i in f], STONE, C_SCULPT)
    K.VAO, K.SEED = sv_vao, sv_seed

def side_wall(u0, u1, w, side, h0, h1, holes_fn=None, mat=RUB):
    """a long wall face (side -1 north / +1 south) from u0 to u1, Blender z h0..h1 (m TAW), holes from holes_fn(fr)"""
    fr = frame_uw(u0, w, 0, side)
    s0, s1 = sorted((fr.s_of(u0, w), fr.s_of(u1, w)))
    holes = holes_fn(fr) if holes_fn else []
    fill2d(fr, [rect(s0, hz(h0), s1, hz(h1))] + holes, 0.0, mat, C_PLAIN)
    return fr, s0, s1

def north_aisle():
    w = WC - A_OUT
    acc = {}
    def holes(fr):
        L = []
        # the leper's window (low, small, mitre-headed, barred; panel + P01 + c05): u 1.0
        s = fr.s_of(SC.N_AISLE["leper"], w)
        lep = [(s - 0.15, hz(35.0)), (s + 0.15, hz(35.0)), (s + 0.15, hz(35.6)), (s, hz(35.88)), (s - 0.15, hz(35.6))]
        acc["leper"] = lep; L.append(hole(lep, 0.04))
        for u in SC.N_AISLE["oculi"]:
            c = circle(fr.s_of(u, w), hz(SC.AISLE_OCULUS_H), 0.2, OCU_N); L.append(c)
        u0, u1 = SC.N_AISLE["door"]
        a, b = sorted((fr.s_of(u0, w), fr.s_of(u1, w)))
        dr = rect(a, hz(34.62), b, hz(36.78)); acc["door"] = dr; L.append(door_hole(dr, 0.05))
        return L
    fr, s0, s1 = side_wall(0.0, SC.U_AISLE_N, w, -1, HB, SC.AISLE_EAVE - 0.02, holes)
    # the NE corner: past the aisle roof's end (u > U_AISLE_N - T_AISLE) the wall rises to the east gable's coping (it
    # stopped at the eave: an 11 cm open top over the corner quoins)
    if not FAR():
        ea, eb = sorted((fr.s_of(SC.U_AISLE_N - SC.T_AISLE - 0.02, w), fr.s_of(SC.U_AISLE_N, w)))
        fill2d(fr, [rect(ea, hz(SC.AISLE_EAVE - 0.02), eb, hz(SC.AISLE_EAVE + SC.RAISE - 0.17))], 0.0, RUB, C_PLAIN)
    for u in SC.N_AISLE["oculi"]: oculus(fr, fr.s_of(u, w), SC.AISLE_OCULUS_H, 0.2, 0.33)
    lep = acc["leper"]
    opening_reveal(fr, lep, 0.3, chamfer=0.04)
    fill2d(fr, [lep], -0.2, GLASS, C_LEAD)
    if not FAR():
        sc = sum(p[0] for p in lep) / len(lep)
        sur = offset_loop(lep, 0.13)
        fill2d(fr, [sur, offset_loop(lep, 0.04)], 0.02, STONE, C_SUR); strip2d(fr, sur, 0.02, 0.0, STONE, C_SUR, inward=False)
        for k in (-1, 0, 1): bar(fr, (sc + k * 0.075, hz(35.0)), (sc + k * 0.075, hz(35.75)), -0.06, 0.016, 0.016, IRON)
        for v in (35.25, 35.5): bar(fr, (sc - 0.15, hz(v)), (sc + 0.15, hz(v)), -0.05, 0.016, 0.016, IRON)
    dr = acc["door"]
    opening_reveal(fr, dr, 0.3, chamfer=0.05, door=True)
    door_leaf(fr, dr, -0.14, leaves=1)
    if not FAR():
        a, b = dr[0][0], dr[1][0]
        fbox(fr, a - 0.22, b + 0.22, hz(36.83), hz(37.08), 0.0, 0.014, STONE, C_SUR)
        for x in (a - 0.05, b + 0.05): quoins(fr, x, hz(34.62), hz(36.83), -1 if x < a else 1, alt=(0.24, 0.16), course=0.27, proud=0.012)
        # T-anchor
        s = fr.s_of(SC.N_AISLE["anchor"], w)
        bar(fr, (s, hz(36.55)), (s, hz(37.1)), 0.0, 0.04, 0.025, IRON); bar(fr, (s - 0.17, hz(37.1)), (s + 0.17, hz(37.1)), 0.0, 0.04, 0.03, IRON)
    plinth_run(fr, s0 - 0.07, dr[0][0] - 0.3, 34.75); plinth_run(fr, dr[1][0] + 0.3, s1 + 0.07, 34.75)
    for (ss, sg, uu) in ((s1, -1, SC.U_AISLE_N), (s0, 1, 0.0)):
        if abs(fr.s_of(uu, w) - ss) > 0.01: uu = SC.U_AISLE_N if uu == 0.0 else 0.0
        quoins(fr, ss, hz(34.75), hz(SC.AISLE_EAVE - 0.05), sg)                         # from the plinth's top
    # east end wall of the aisle (u = U_AISLE_N), sloped top under its (raised) coping, its inner face above the roof
    R = SC.RAISE
    fe = frame_uw(SC.U_AISLE_N, w, 1, 0)
    pts = poly_s(fe, [(SC.U_AISLE_N, w, HB), (SC.U_AISLE_N, WC - NW, HB), (SC.U_AISLE_N, WC - NW, SC.AISLE_TOP + R - 0.18), (SC.U_AISLE_N, w, SC.AISLE_EAVE + R - 0.18)])
    fill2d(fe, [pts], 0.0, RUB, C_PLAIN)
    fb = frame_uw(SC.U_AISLE_N - SC.T_AISLE, WC, -1, 0)
    sl = (SC.AISLE_TOP - SC.AISLE_EAVE) / (A_OUT - NW)
    ws = [NW - 0.02, A_OUT - 0.02]
    ub = SC.U_AISLE_N - SC.T_AISLE
    bot = [(fb.s_of(ub, WC - dw), hz(SC.AISLE_TOP + 0.04 - (dw - NW) * sl - 0.06)) for dw in ws]
    top = [(fb.s_of(ub, WC - dw), hz(SC.AISLE_TOP + R - (SC.AISLE_TOP - SC.AISLE_EAVE) * (dw - NW) / (A_OUT + 0.05 - NW) - 0.18 + 0.01)) for dw in reversed(ws)]
    fill2d(fb, [bot + top], 0.0, RUB, C_PLAIN)
    a = P(SC.U_AISLE_N - SC.T_AISLE / 2, w - 0.05, SC.AISLE_EAVE + R); b = P(SC.U_AISLE_N - SC.T_AISLE / 2, WC - NW, SC.AISLE_TOP + R)
    coping(a, b, SC.T_AISLE / 2 + 0.04, SC.T_AISLE / 2 + 0.06, 0.18) if not FAR() else sweep3d([a, b], [(-0.35, -0.18), (0.36, -0.18), (0.36, 0.0), (-0.35, 0.0), (-0.35, -0.18)], Z, STONE, C_COPING)
    plinth_run(fe, *sorted((fe.s_of(SC.U_AISLE_N, w), fe.s_of(SC.U_AISLE_N, WC - NW))), 34.75)

def door_leaf(fr, r, d, leaves=1, mat=DOOR):
    """boarded door leaves (vertical planks with V-joints, ledges behind) in an opening rect r at depth d"""
    a, b = r[0][0], r[1][0]; v0, v1 = r[0][1], r[2][1]
    if FAR():
        fill2d(fr, [rect(a, v0, b, v1)], d, mat, C_DOOR); return
    n = max(3, int(round((b - a) / 0.15)))
    wb = (b - a) / n
    for k in range(n):
        x0 = a + k * wb + 0.004; x1 = a + (k + 1) * wb - 0.004
        fbox(fr, x0, x1, v0 + 0.01, v1 - 0.005, d - 0.04, d, mat, C_DOOR, skip=("back",))
    fill2d(fr, [rect(a, v0, b, v1)], d - 0.035, mat, C_DOOR)
    if leaves == 2:
        fbox(fr, -0.012, 0.012, v0, v1, d, d + 0.015, mat, C_DOOR)

def west_door_leaves():
    """the west door's two leaves as their own node (the interior cell swaps them for its opening ones): behind the oak
    frame (they overlap its inner edge by DOOR_LEAF.lap = the rebate), boards with V-joints on a sealed backing, a cover
    strip over the meeting stiles, strap hinges, a ring handle; the bottom just above the threshold stone, which runs
    under them: there is no line of light anywhere around the leaves"""
    fr = frame_uw(0.0, WC, -1, 0)
    W2, F, Tp = SC.DOOR_W / 2, hz(SC.FLOOR), hz(SC.DOOR_TOP)
    xo = W2 - DF["face"] + DL["lap"]                     # the leaves' outer edges, behind the jambs
    vt = Tp - DF["head"] + DL["lap"]                     # their top, behind the head
    d0, d1 = -(DL["u0"] + DL["gap"]), -DL["u1"]
    if FAR():
        fill2d(fr, [rect(-xo, F, xo, vt)], d0, DOOR, C_DOOR); return
    for sg in (-1, 1):
        a, b = sorted((sg * 0.0015, sg * xo))
        n = 4; wb = (b - a) / n
        for k in range(n):
            fbox(fr, a + k * wb + 0.002, a + (k + 1) * wb - 0.002, F, vt, d1 + 0.006, d0, DOOR, C_DOOR, skip=("back", "bottom"))
        fill2d(fr, [rect(a, F, b, vt)], d1 + 0.008, DOOR, C_DOOR)                       # the backing: closes the V-joints
        fill2d(fr, [rect(a, F, b, vt)], d1, DOOR, C_DOOR, flip=True)                    # the leaf's inner face
        for v in (34.75, 36.0):                                                        # strap hinges
            bar(fr, (sg * (xo - 0.03), hz(v)), (sg * 0.25, hz(v)), d0, 0.05, 0.01, IRON)
    # cover strip (astragal): from 3 mm INTO the threshold stone (it stopped 4 mm above it: a 3 x 4 mm hole into the nave
    # between the meeting stiles, the audit's threshold leak)
    fbox(fr, -0.025, 0.025, F - 0.003, vt - 0.01, d0, d0 + 0.014, DOOR, C_DOOR, skip=("back",))
    lathe_axis(fr.p(0.1, hz(35.45), d0 - 0.002), fr.N, Z, [(0.045, 0.0), (0.045, 0.031), (0.03, 0.031), (0.03, 0.0)], 16, IRON)   # the ring plate ON the leaf (it floated 14 mm in front)

def south_aisle():
    w = WC + A_OUT
    def holes(fr):
        return [circle(fr.s_of(u, w), hz(SC.AISLE_OCULUS_H), 0.2, OCU_N) for u in SC.S_AISLE["oculi"]]
    fr, s0, s1 = side_wall(0.0, SC.U_AISLE_S, w, 1, HB, SC.AISLE_EAVE - 0.02, holes)
    for u in SC.S_AISLE["oculi"]: oculus(fr, fr.s_of(u, w), SC.AISLE_OCULUS_H, 0.2, 0.33)
    plinth_run(fr, s0 - 0.07, s1, 34.75)
    quoins(fr, s0 if fr.s_of(0.0, w) == s0 else s1, hz(34.75), hz(SC.AISLE_EAVE - 0.05), 1 if fr.s_of(0.0, w) == s0 else -1)

def clerestory(side):
    """the nave + choir side walls: above the aisle roof along the nave (3 oculi), full height along the choir (north: the
    two-light window; south: above the sacristy's roof)"""
    w = WC + side * NW
    ua = SC.U_AISLE_N if side < 0 else SC.U_AISLE_S
    fr = frame_uw(0.0, w, 0, side)
    def S(u): return fr.s_of(u, w)
    oc = [circle(S(u), hz(39.72), 0.16, OCU_N) for u in SC.CLER_OCULI]
    eave = SC.NAVE_EAVE
    if side < 0:
        out = poly_s(fr, [(0.0, w, SC.AISLE_TOP - 0.25), (ua, w, SC.AISLE_TOP - 0.25), (ua, w, HB), (SC.U_APSE, w, HB), (SC.U_APSE, w, eave), (0.0, w, eave)])
        cw = window_hole(S(SC.CHOIR_WIN_N), 37.4, 38.85, 39.75, 1.1)
        fill2d(fr, [out, cw] + oc, 0.0, RUB, C_PLAIN)
        gothic_window(fr, S(SC.CHOIR_WIN_N), 37.4, 38.85, 39.75, 1.1, 2, foils=[(0.0, 39.42, 0.2, 4)])
        a, b = sorted((S(ua), S(SC.U_APSE)))
        plinth_run(fr, a, b + (0.07 if not FAR() else 0.0), 34.85)       # (far: boxes, no overlap at the apse)
        # string course at the sill level along the choir (P01)
        if not FAR():
            sweep2d(fr, [(a, hz(37.25)), (b + 0.07, hz(37.25))], [(0.0, -0.1), (0.07, -0.06), (0.07, 0.03), (0.0, 0.06)], STONE, C_BAND)
    else:
        # full height behind the sacristy (its hipped roof left the wall's lower edge open above the hips)
        out = poly_s(fr, [(0.0, w, SC.AISLE_TOP - 0.25), (ua, w, SC.AISLE_TOP - 0.25), (ua, w, HB), (SC.U_APSE, w, HB), (SC.U_APSE, w, eave), (0.0, w, eave)])
        fill2d(fr, [out] + oc, 0.0, RUB, C_PLAIN)
    for u in SC.CLER_OCULI: oculus(fr, S(u), 39.72, 0.16, 0.27, depth=0.26)
    # flashing ledge where the aisle roof meets the clerestory (photo P01: a light stone line)
    if not FAR():
        a, b = sorted((S(SC.T_WEST / 2), S(ua - (SC.T_AISLE / 2 if side < 0 else 0.0))))
        sweep2d(fr, [(a, hz(SC.AISLE_TOP + 0.1)), (b, hz(SC.AISLE_TOP + 0.1))], [(0.0, -0.06), (0.09, -0.04), (0.09, 0.03), (0.0, 0.07)], STONE, C_BAND)
    return fr

def apse():
    """the three-sided apse (footprint): oblique faces + the east face with its two-light window (blind inside: the
    17th-century retable stands against it)"""
    pts = [(SC.U_APSE, WC - NW), (SC.U_EAST, WC - SC.APSE_HW), (SC.U_EAST, WC + SC.APSE_HW), (SC.U_APSE, WC + NW)]
    for i in range(3):
        (ua, wa), (ub, wb) = pts[i], pts[i + 1]
        du, dw = ub - ua, wb - wa; L = math.hypot(du, dw)
        nu, nw_ = dw / L, -du / L                 # outward (to the right walking a -> b... check with the centre)
        cu, cw_ = (ua + ub) / 2 - (SC.U_APSE - 1.0), (wa + wb) / 2 - WC
        if nu * cu + nw_ * cw_ < 0: nu, nw_ = -nu, -nw_
        fr = frame_uw(ua, wa, nu, nw_)
        sa, sb = sorted((fr.s_of(ua, wa), fr.s_of(ub, wb)))
        out = rect(sa, hz(HB), sb, hz(SC.NAVE_EAVE))
        holes = []
        if i == 1:
            sm = (sa + sb) / 2
            holes.append(window_hole(sm, 37.4, 38.85, 39.75, 1.1))
        fill2d(fr, [out] + holes, 0.0, RUB, C_PLAIN)
        if i == 1: gothic_window(fr, (sa + sb) / 2, 37.4, 38.85, 39.75, 1.1, 2, foils=[(0.0, 39.42, 0.2, 4)])
        ex = 0.0 if FAR() else 0.03
        plinth_run(fr, sa - ex, sb + ex, 34.85)        # past the corners by out * tan(22.5 deg): the runs meet in a mitre
        if not FAR() and i != 2:
            sweep2d(fr, [(sa - 0.03, hz(37.25)), (sb + 0.03, hz(37.25))], [(0.0, -0.1), (0.07, -0.06), (0.07, 0.03), (0.0, 0.06)], STONE, C_BAND)

# ------------------------------------------------------------------------------------------------ roofs
def slab(top, th, mat, code=C_PLAIN, edges=(True, True, True, True), uvs=None):
    """a roof slab: top quad (Blender points, ccw seen from above), a soffit th below, edge faces"""
    up = (top[1] - top[0]).cross(top[2] - top[1]).normalized()
    n0 = len(top)
    if up.z < 0:
        top = list(reversed(top)); up = -up
        edges = [edges[(n0 - 2 - i) % n0] for i in range(n0)]
        if uvs: uvs = list(reversed(uvs))
    bot = [p - Z * th for p in top]
    K.B.new_group()
    face_dir(top, up, mat, code, uvs)
    face_dir(bot, -up, mat, code)
    n = len(top)
    for i in range(n):
        if not edges[i % len(edges)]: continue
        a, b = top[i], top[(i + 1) % n]
        e = (b - a); out = e.cross(up).normalized()
        face_dir([a, b, bot[(i + 1) % n], bot[i]], out, mat, code)

B_SL = SC.Builder()                                     # the slates (LOD0 only: node "Stalle_slates")
SLATE_SEED = [100]
def slates(*corners):
    """real slates on a roof facet (tools/blender/roofkit.py): LOD0 only, into their own node"""
    if FAR(): return
    KB, K.B = K.B, B_SL
    SLATE_SEED[0] += 1
    RK.slate_quad(*corners, SLATE, C_PLAIN, spec=RK.NATURAL, seed=SLATE_SEED[0])
    K.B = KB

def ridge_cap(a, b, pitch, half=0.17):
    """a ridge capping that lies on both slopes (an inverted V 2 cm thick + a roll): the slates' heads end inside it,
    no slit between ridge and slates"""
    if FAR(): return
    # flanks 5 cm above the deck (vertical; 2.9 cm square to the slope at 55 deg): the slates stand up to 1.7 cm, so
    # their tops never come near the flank's face (round 3: 2.8 cm left the slates' tops 0.1-0.7 mm under it)
    T = 0.05
    # the underside 5 mm INSIDE the deck (at +6 mm it sat among the slates' tops)
    prof = [(-half, -half * pitch - 0.005), (0.0, -0.005), (half, -half * pitch - 0.005), (half, -half * pitch + T), (0.034, -0.034 * pitch + T)]
    for k in range(1, 8):
        t = k / 8 * math.pi
        prof.append((0.034 * math.cos(t), T + 0.036 * math.sin(t) * 0.9))
    prof += [(-0.034, -0.034 * pitch + T), (-half, -half * pitch + T)]
    prof.append(prof[0])
    sweep3d([a, b], list(reversed(prof)), Z, SLATE, C_RIDGE)

def hip_roll(a, b, r=0.055, lift=0.03):
    """a round hip roll along a hip line (the slates' clipped edges end inside it)"""
    if FAR(): return
    prof = [(r * math.cos(2 * math.pi * k / 16), lift + r * math.sin(2 * math.pi * k / 16)) for k in range(16)]   # 16 sides: smooth without streaks
    prof.append(prof[0])
    sweep3d([a, b], prof, Z, SLATE, C_RIDGE)

def gutter(a, b, r=0.065):
    """a half-round zinc gutter hung along an eave a -> b: one closed profile (outer shell, rolled lips, inner shell)
    with stop ends: no open edges to look through"""
    if FAR(): return
    prof = [(math.cos(math.pi * k / 10) * r, -math.sin(math.pi * k / 10) * r) for k in range(11)]
    inner = [(x * 0.9, y * 0.9) for x, y in reversed(prof)]
    loop = prof + [(-r * 0.95, 0.006)] + inner + [(r * 0.95, 0.006)]
    loop.append(loop[0])
    c = Vector((0, 0, -0.02))
    sweep3d([a + c, b + c], loop, Z, ZINC, C_GUTTER)

def gutter_path(pts, r=0.065):
    """gutter() along a polyline (mitred corners)"""
    if FAR(): return
    prof = [(math.cos(math.pi * k / 10) * r, -math.sin(math.pi * k / 10) * r) for k in range(11)]
    inner = [(x * 0.9, y * 0.9) for x, y in reversed(prof)]
    loop = prof + [(-r * 0.95, 0.006)] + inner + [(r * 0.95, 0.006)]
    loop.append(loop[0])
    c = Vector((0, 0, -0.02))
    # two extra rows 10 cm either side of every corner (beyond the mitre: 4 cm folded the inner shell): the averaged normals stay within 20 cm (on 2.4 m triangles
    # they shaded the whole apse gutter: the audit's streaks)
    path = [pts[0]]
    for i in range(1, len(pts) - 1):
        a_, b_, c_ = pts[i - 1], pts[i], pts[i + 1]
        if (b_ - a_).normalized().dot((c_ - b_).normalized()) > 0.999: path.append(b_); continue
        path += [b_ + (a_ - b_).normalized() * 0.1, b_, b_ + (c_ - b_).normalized() * 0.1]
    path.append(pts[-1])
    sweep3d([p + c for p in path], loop, Z, ZINC, C_GUTTER)

def downpipe(top, bottom_h, r=0.045):
    if FAR(): return
    b = Vector((top.x, top.y, hz(bottom_h)))
    lathe_axis(b, Z, Vector((1, 0, 0)), [(r, 0.0), (r, top.z - b.z - 0.02), (r * 0.6, top.z - b.z)], 16, ZINC, C_GUTTER)
    lathe_axis(b + Z * 0.004, Z, Vector((1, 0, 0)), [(0.0, -0.004), (r * 1.5, -0.004), (r * 1.5, 0.12), (r * 1.02, 0.18)], 16, ZINC, C_GUTTER)

def roofs():
    th = 0.12; ov = 0.16                                    # c05's pose: the nave's eaves at 40.0-40.7 over the clerestory
    ridge = SC.RIDGE; pit = SC.PITCH
    ew = NW + ov; eh = ridge - ew * pit                     # nave eave line (overhang)
    ua = 14.55                                              # the ridge's east end: the apse hip's apex
    u_w = SC.T_WEST                                         # the roofs stop against the west gable's inner face
    for side in (-1, 1):
        r0, r1 = P(u_w, WC, ridge), P(ua, WC, ridge)
        e0, e1 = P(u_w, WC + side * ew, eh), P(SC.U_APSE, WC + side * ew, eh)
        slab([e0, e1, r1, r0], th, SLATE, C_PLAIN, edges=(True, False, False, True), uvs=RK.facet_uv(e0, e1, r1, r0, [e0, e1, r1, r0]))
        slates(e0, e1, r1, r0)
    # the apse hip: facets from the apex to the apse's eave polygon (offset by ov)
    pa = [(SC.U_APSE, WC - ew), (SC.U_EAST + ov * 0.8, WC - SC.APSE_HW - ov * 0.45), (SC.U_EAST + ov * 0.8, WC + SC.APSE_HW + ov * 0.45), (SC.U_APSE, WC + ew)]
    apex = P(ua, WC, ridge)
    K.B.new_group()
    for i in range(3):
        a, b = P(pa[i][0], pa[i][1], eh), P(pa[i + 1][0], pa[i + 1][1], eh)
        face_dir([a, b, apex], Z, SLATE, C_PLAIN, RK.facet_uv(a, b, apex, apex, [a, b, apex]))
        face_dir([a - Z * th, b - Z * th, apex - Z * th], -Z, SLATE, C_PLAIN)
        e = b - a; out = e.cross(Z).normalized()
        if out.dot(a - apex) < 0: out = -out
        face_dir([a, b, b - Z * th, a - Z * th], out, SLATE, C_PLAIN)
        slates(a, b, apex, apex)
    # ONE gutter from the west gable along the north eave, round the apse, back along the south eave (mitred corners; 2 cm
    # inside the eave edge and 3 cm under it like before: no crossing with the deck's edge)
    gp = [(u_w, WC - (ew - 0.02))] + [(pa[0][0], pa[0][1] + 0.02), (pa[1][0] - 0.02, pa[1][1] + 0.02), (pa[2][0] - 0.02, pa[2][1] - 0.02), (pa[3][0], pa[3][1] - 0.02)] + [(u_w, WC + (ew - 0.02))]
    gutter_path([P(u, w_, eh - 0.03) for u, w_ in gp])
    # the ridge capping along the ridge and the rolls down the apse's hips (and the nave facets' hip ends)
    if not FAR():
        ridge_cap(P(u_w - 0.02, WC, ridge), P(ua + 0.04, WC, ridge), pit)
        for p in (pa[1], pa[2], pa[0], pa[3]):
            hip_roll(apex, P(p[0], p[1], eh))
    # aisles: lean-to roofs from the clerestory (AISLE_TOP) to the eaves over the outer walls; the north one stops
    # against its east gable's inner face
    for side, u1 in ((-1, SC.U_AISLE_N - SC.T_AISLE), (1, SC.U_AISLE_S + 0.02)):
        aw = A_OUT + 0.25
        sl = (SC.AISLE_TOP - SC.AISLE_EAVE) / (A_OUT - NW)
        eh2 = SC.AISLE_TOP - (aw - NW) * sl
        top = [P(u_w, WC + side * aw, eh2), P(u1, WC + side * aw, eh2), P(u1, WC + side * NW, SC.AISLE_TOP + 0.04), P(u_w, WC + side * NW, SC.AISLE_TOP + 0.04)]
        slab(top, 0.1, SLATE, C_PLAIN, edges=(True, True, False, True), uvs=RK.facet_uv(*top, top))
        slates(*top)
        gutter(P(u_w - 0.05, WC + side * (aw - 0.02), eh2 - 0.03), P(u1 + (0.0 if side < 0 else -0.02), WC + side * (aw - 0.02), eh2 - 0.03))
        downpipe(P(u_w + 0.1, WC + side * (aw + 0.04), eh2 - 0.05), 33.9 if side < 0 else 34.0)
    # downpipes: from the nave gutter at the choir / north aisle junction (P01), at the west front's corners (c05)
    downpipe(P(SC.U_AISLE_N + 0.12, WC - ew - 0.04, eh - 0.05), 34.4)

def belfry():
    """the hexagonal bell-cote on the ridge (photos c00, c05, P01): slate-clad base, open timber belfry stage with
    louvre boards and a bell, flared cornice, bell-cast slate spire, ball and wrought-iron cross"""
    c = P(SC.BELL_U, WC, OY)
    R0 = 0.72
    a0 = math.pi / 6
    if FAR():
        lathe(c + Z * hz(42.6), [(R0, 0.0), (R0, 45.5 - 42.6), (0.98, 45.55 - 42.6), (0.0, 47.0 - 42.6)], 6, SLATE, C_PLAIN, a0=a0)
        rod(c + Z * hz(47.0), c + Z * hz(48.0), 0.03, IRON)
        return
    lathe(c + Z * hz(42.4), [(R0, 0.0), (R0, 44.38 - 42.4)], 6, SLATE, C_PLAIN, a0=a0)
    face_dir([c + Z * hz(44.38) + Vector((math.cos(a0 + k * math.pi / 3) * R0, math.sin(a0 + k * math.pi / 3) * R0, 0)) for k in range(6)], Z, WOOD, C_PLAIN)
    lathe(c + Z * hz(44.36), [(R0 + 0.02, 0.0), (R0 + 0.07, 0.04), (R0 + 0.07, 0.1), (R0 - 0.02, 0.14)], 6, WOOD, C_PLAIN, a0=a0)
    # posts + louvres
    h0, h1 = 44.5, 45.42
    Rp = 0.66
    corners = [c + Vector((math.cos(a0 + k * math.pi / 3) * Rp, math.sin(a0 + k * math.pi / 3) * Rp, 0)) for k in range(6)]
    for p in corners:
        wbox(p, Vector((1, 0, 0)), Vector((0, 1, 0)), 0.055, 0.055, hz(h0), hz(h1), WOOD, C_PLAIN)
    for k in range(6):
        a, b = corners[k], corners[(k + 1) % 6]
        mid = (a + b) / 2; t = (b - a).normalized(); out = (mid - c); out.z = 0; out.normalize()
        L = (b - a).length - 0.1
        for j in range(4):
            zc = hz(h0 + 0.16 + j * 0.2)
            box(mid, t, (Z * 0.5 - out * 0.866).normalized(), out, -L / 2, L / 2, -0.07, 0.07, -0.012, 0.012, WOOD, C_LOUVRE)
    # bell on a beam
    wbox(c, Vector((1, 0, 0)), Vector((0, 1, 0)), 0.62, 0.05, hz(45.18), hz(45.3), WOOD, C_PLAIN)
    lathe(c + Z * hz(44.72), [(0.0, 0.0), (0.24, 0.0), (0.25, 0.04), (0.21, 0.12), (0.15, 0.3), (0.12, 0.42), (0.06, 0.45), (0.0, 0.46)], 14, IRON, C_BELL)
    # cornice + spire
    lathe(c + Z * hz(45.42), [(R0 - 0.02, 0.0), (R0 + 0.12, 0.05), (0.97, 0.13), (0.99, 0.18)], 6, WOOD, C_PLAIN, a0=a0)
    lathe(c + Z * hz(45.58), [(0.99, 0.0), (0.86, 0.06), (0.7, 0.2), (0.48, 0.55), (0.24, 0.95), (0.05, 1.38), (0.0, 1.42)], 6, SLATE, C_PLAIN, a0=a0)
    face_dir([c + Z * hz(45.58) + Vector((math.cos(a0 + k * math.pi / 3) * 0.99, math.sin(a0 + k * math.pi / 3) * 0.99, 0)) for k in range(6)], -Z, WOOD, C_PLAIN)
    # finial: lead ball + the wrought-iron cross with scrolls (c00)
    top = c + Z * hz(46.98)
    lathe(top, [(0.0, 0.0), (0.06, 0.02), (0.08, 0.08), (0.06, 0.14), (0.0, 0.16)], 10, ZINC, C_PLAIN)
    rod(top + Z * 0.15, top + Z * 1.1, 0.018, IRON)
    for ang in (0.0, math.pi / 2):
        d = Vector((math.cos(ang + 0.0), math.sin(ang), 0)) if ang == 0 else Vector((0, 1, 0))
    d = Vector((0, 1, 0))                       # the cross faces west-east (seen flat from the west)
    rod(top + Z * 0.78 - d * 0.32, top + Z * 0.78 + d * 0.32, 0.016, IRON)
    for k in range(4):                           # rays between the arms
        a = math.pi / 4 + k * math.pi / 2
        v = (d * math.cos(a) + Z * math.sin(a))
        rod(top + Z * 0.78 + v * 0.06, top + Z * 0.78 + v * 0.2, 0.01, IRON)
    for e in (-1, 1):                            # trefoil-ish ends: small rings
        for q in (d * e * 0.34 + Z * 0.78, Z * (1.12 if e > 0 else 0.42)):
            lathe_axis(top + q, Vector((1, 0, 0)), d, [(0.035, -0.008), (0.035, 0.008)], 8, IRON)

def sacristy():
    """the sacristy (brick, against the choir's south side; r_rear): lean-to slate roof with hipped ends (estimated
    openings: a window south, a door west)"""
    u0, u1, w1 = SC.SAC["u0"], SC.SAC["u1"], WC + SC.SAC["w1"] - 0.1
    w0 = WC + NW
    eave, top = SC.SAC["eave"], SC.AISLE_TOP
    # south face
    fr = frame_uw(u0, w1, 0, 1)
    s0, s1 = sorted((fr.s_of(u0, w1), fr.s_of(u1, w1)))
    sw = fr.s_of(12.85, w1)
    win = rect(sw - 0.33, hz(35.35), sw + 0.33, hz(36.45))
    fill2d(fr, [rect(s0, hz(HB), s1, hz(eave)), win], 0.0, BRICK, C_PLAIN)
    house_window(fr, win, shutters=False, bars=True)
    fbox(fr, s0 - 0.04, s1 + 0.04, hz(HB), hz(34.75), 0.0, 0.04, RUB, C_PLINTH) if not FAR() else None
    # west face (u = u0) from the aisle's outer face to w1
    fw = frame_uw(u0, w1, -1, 0)
    a, b = sorted((fw.s_of(u0, WC + A_OUT), fw.s_of(u0, w1)))
    dm = fw.s_of(u0, (WC + A_OUT + w1) / 2)
    dr = rect(dm - 0.42, hz(34.35), dm + 0.42, hz(36.35))
    fill2d(fw, [rect(a, hz(HB), b, hz(eave)), dr], 0.0, BRICK, C_PLAIN)
    opening_reveal(fw, dr, 0.25, chamfer=0.0); door_leaf(fw, dr, -0.12)
    if not FAR():
        fbox(fw, dm - 0.55, dm + 0.55, hz(36.35), hz(36.55), 0.0, 0.02, STONE, C_SUR)
        fbox(fw, a, b, hz(HB), hz(34.75), 0.0, 0.04, RUB, C_PLINTH, skip=("back", "left", "right"))
    # east face (u = u1) from w1 to the apse
    fe = frame_uw(u1, w1, 1, 0)
    w_apse = WC + NW - (u1 - SC.U_APSE) * (NW - SC.APSE_HW) / (SC.U_EAST - SC.U_APSE)
    a, b = sorted((fe.s_of(u1, w_apse), fe.s_of(u1, w1)))
    fill2d(fe, [rect(a, hz(HB), b, hz(eave))], 0.0, BRICK, C_PLAIN)
    if not FAR(): fbox(fe, a, b, hz(HB), hz(34.75), 0.0, 0.04, RUB, C_PLINTH, skip=("back", "left", "right"))
    # roof: the south slope + two hips, the high edge against the choir wall
    ov = 0.22
    sl = (top - eave) / (w1 - w0)
    eh = eave - ov * sl
    E = [P(u0 - ov, w1 + ov, eh), P(u1 + ov, w1 + ov, eh)]
    Rr = [P(u0 + 0.9, w0, top), P(u1 - 0.6, w0, top)]
    K.B.new_group()
    face_dir([E[0], E[1], Rr[1], Rr[0]], Z, SLATE, C_PLAIN, RK.facet_uv(E[0], E[1], Rr[1], Rr[0], [E[0], E[1], Rr[1], Rr[0]]))
    # the east hip's inner eave corner sits 3 cm INSIDE the apse's oblique wall (at w0 + 0.3 it left a slit between the
    # hip and the wall, into the roof void)
    w_ap = lambda u: WC + NW - (u - SC.U_APSE) * (NW - SC.APSE_HW) / (SC.U_EAST - SC.U_APSE)
    hw_, he_ = [P(u0 - ov, w0, eh), E[0], Rr[0]], [E[1], P(u1 + ov, w_ap(u1 + ov) - 0.03, eh), Rr[1]]
    face_dir(hw_, Z, SLATE, C_PLAIN, RK.facet_uv(hw_[0], hw_[1], hw_[2], hw_[2], hw_))
    face_dir(he_, Z, SLATE, C_PLAIN, RK.facet_uv(he_[0], he_[1], he_[2], he_[2], he_))
    for a_, b_ in ((E[0], E[1]), (P(u0 - ov, w0, eh), E[0]), (E[1], he_[1])):
        e = b_ - a_; out = e.cross(Z).normalized()
        face_dir([a_, b_, b_ - Z * 0.1, a_ - Z * 0.1], -out if out.dot(Vector((0, -1, 0))) < -0.5 else out, SLATE, C_PLAIN)
    ge = (E[1] - E[0]).normalized() * 0.02
    gutter(E[0] - ge, E[1] + ge)
    slates(E[0], E[1], Rr[1], Rr[0])
    slates(P(u0 - ov, w0, eh), E[0], Rr[0], Rr[0])
    slates(E[1], he_[1], Rr[1], Rr[1])
    hip_roll(Rr[0], E[0]); hip_roll(Rr[1], E[1])

def house_window(fr, r, shutters=True, bars=False, surround=0.1):
    """a casement window in a brick wall: stone surround, frame with a cross bar, glass; shutters / bars"""
    a, b = r[0][0], r[1][0]; v0, v1 = r[0][1], r[2][1]
    if FAR():
        fill2d(fr, [r], -0.1, GLASS, C_PLAIN); return
    sur = rect(a - surround, v0 - 0.02, b + surround, v1 + surround)
    fill2d(fr, [sur, r], 0.025, STONE, C_SUR); strip2d(fr, sur, 0.025, 0.0, STONE, C_SUR, inward=False)
    strip2d(fr, r, 0.025, -0.18, STONE, C_SUR)
    fbox(fr, a - surround - 0.04, b + surround + 0.04, v0 - 0.1, v0 - 0.01, 0.0, 0.07, STONE, C_SILL)
    d = -0.12; fw = 0.055
    inner = rect(a + fw, v0 + fw, b - fw, v1 - fw)
    fill2d(fr, [r, inner], d, WOOD, C_PLAIN); strip2d(fr, inner, d, d - 0.03, WOOD, C_PLAIN)
    fill2d(fr, [inner], d - 0.03, GLASS, C_PLAIN)
    mid = (a + b) / 2
    fbox(fr, mid - 0.022, mid + 0.022, v0 + fw, v1 - fw, d - 0.03, d, WOOD, C_PLAIN)
    tv = v0 + (v1 - v0) * 0.7
    fbox(fr, a + fw, b - fw, tv - 0.022, tv + 0.022, d - 0.03, d + 0.004, WOOD, C_PLAIN)
    if bars:
        n = max(2, int((b - a) / 0.12))
        for k in range(1, n): x = a + (b - a) * k / n; bar(fr, (x, v0), (x, v1), -0.05, 0.018, 0.018, IRON)
    if shutters:
        wsh = (b - a) / 2 + 0.06
        for sg in (-1, 1):
            x0 = (a - surround - 0.02 - wsh) if sg < 0 else (b + surround + 0.02)
            fbox(fr, x0, x0 + wsh, v0 + 0.0, v1 + 0.02, 0.0, 0.035, DOOR, C_DOOR)
            for k in range(1, 4):
                x = x0 + wsh * k / 4
                fbox(fr, x - 0.004, x + 0.004, v0 + 0.02, v1, 0.035, 0.038, DOOR, C_DOOR)
            for v in (v0 + 0.25, v1 - 0.25):
                bar(fr, (x0 + 0.04, v), (x0 + wsh - 0.04, v), 0.035, 0.035, 0.008, IRON)

def house():
    """the sacristan's house of 1711 (inventory P02, P04; Ucclensia 112): red brick on a stone plinth, white-stone bands,
    quoins and surrounds, a Baroque arched door with imposts and keystone, slate gable roof between stone-coped gables with
    a chimney on each. North face + west gable from the photos; south and east faces estimated."""
    H = SC.HOUSE; u0, u1, w0, w1 = H["u0"], H["u1"], H["w0"], H["w1"]
    eave, ridge = H["eave"], H["ridge"]
    wm = (w0 + w1) / 2
    bands = [(36.85, 36.97), (37.72, 37.9)]
    def deco(fr, s0, s1, v_top, long=True, no_quoin=()):
        """plinth, bands, quoins; the long faces' courses run past the corners by their projection, the gables' stop
        at the corners (no coincident end faces)"""
        if FAR(): return
        e1, e2 = (0.035, 0.03) if long else (0.0, 0.0)
        sk = ("back",) if long else ("back", "left", "right")
        fbox(fr, s0 - e1, s1 + e1, hz(HB), hz(34.95), 0.0, 0.035, RUB, C_PLINTH, skip=sk)
        for (h0, h1) in bands:
            if h1 <= v_top + 0.01: fbox(fr, s0 - e2, s1 + e2, hz(h0), hz(h1), 0.0, 0.03, STONE, C_BAND, skip=sk)
        for s, side in ((s0, 1), (s1, -1)):
            if s in no_quoin: continue                     # a corner buried in the chapel's wall
            quoins(fr, s, hz(34.95), hz(min(v_top, eave) - 0.25), side, alt=(0.3, 0.2), course=0.24, proud=0.02)   # up to the kneelers
    # north face (P04): small barred window, the arched door, the shuttered window (east -> west)
    fn = frame_uw(u1, w0, 0, -1)
    s0, s1 = sorted((fn.s_of(u0, w0), fn.s_of(u1, w0)))
    sm = lambda u: fn.s_of(u, w0)
    w_small = rect(sm(-0.62) - 0.25, hz(35.55), sm(-0.62) + 0.25, hz(36.1))
    dc = sm(-2.2)
    door = [(dc - 0.45, hz(34.0))] + [(dc + 0.45 * math.cos(math.pi * k / 10), hz(35.85) + 0.45 * math.sin(math.pi * k / 10)) for k in range(10, -1, -1)][::-1] + [(dc + 0.45, hz(34.0))]
    door = ccw([(dc - 0.45, hz(34.0)), (dc + 0.45, hz(34.0))] + [(dc + 0.45 * math.cos(math.pi * k / 10), hz(35.85) + 0.4 * math.sin(math.pi * k / 10)) for k in range(11)])
    w_main = rect(sm(-4.6) - 0.3, hz(35.05), sm(-4.6) + 0.3, hz(36.62))
    fill2d(fn, [rect(s0, hz(HB), s1, hz(eave)), w_small, door, w_main], 0.0, BRICK, C_PLAIN)
    house_window(fn, w_small, shutters=False, bars=True)
    house_window(fn, w_main, shutters=True)
    strip2d(fn, door, 0.0, -0.22, STONE, C_SUR)
    door_leaf_arch(fn, door, dc, -0.16)
    if not FAR():
        # the Baroque surround: jambs with imposts, an arched moulding, keystone, ears
        # path round the opening's edge (left jamb up, over the arch, right jamb down): the band lies outside it
        pth = [(dc - 0.45, hz(34.0))] + [(dc + 0.45 * math.cos(math.pi * (10 - k) / 10), hz(35.85) + 0.4 * math.sin(math.pi * (10 - k) / 10)) for k in range(11)] + [(dc + 0.45, hz(34.0))]
        sweep2d(fn, pth, [(0.0, 0.0), (0.05, 0.0), (0.07, 0.02), (0.07, 0.13), (0.05, 0.15), (0.0, 0.15)], STONE, C_SUR)
        for sg in (-1, 1):
            fbox(fn, dc + sg * 0.45 - 0.12, dc + sg * 0.45 + 0.12, hz(35.78), hz(35.92), 0.0, 0.1, STONE, C_SUR)
        fbox(fn, dc - 0.11, dc + 0.11, hz(36.12), hz(36.42), 0.0, 0.1, STONE, C_SUR)
        fbox(fn, dc - 0.62, dc + 0.62, hz(33.75), hz(34.012), -0.22, 0.25, BLUE, C_SILL, skip=())
    deco(fn, s0, s1, eave)
    # south face (estimated: two windows)
    fs = frame_uw(u0, w1, 0, 1)
    a, b = sorted((fs.s_of(u0, w1), fs.s_of(u1, w1)))
    wins = [rect(fs.s_of(u, w1) - 0.3, hz(35.05), fs.s_of(u, w1) + 0.3, hz(36.62)) for u in (-4.9, -1.6)]
    fill2d(fs, [rect(a, hz(HB), b, hz(eave))] + wins, 0.0, BRICK, C_PLAIN)
    for wr in wins: house_window(fs, wr, shutters=True)
    deco(fs, a, b, eave)
    # gables: west (P02: two attic windows, the bands, a chimney at the apex) and east (estimated: one attic window)
    for uu, nu in ((u0, -1), (u1, 1)):
        fg = frame_uw(uu, wm, nu, 0)
        sA, sB = sorted((fg.s_of(uu, w0), fg.s_of(uu, w1)))
        smid = fg.s_of(uu, wm)
        # the gable's top edge runs 1-2 cm INTO the coping (it stopped 3-4 cm under the coping's underside: a slit)
        out = [(sA, hz(HB)), (sB, hz(HB)), (sB, hz(eave + 0.07)), (smid, hz(ridge + 0.31)), (sA, hz(eave + 0.07))]
        holes = []
        if nu < 0: holes = [rect(smid + k * 0.95 - 0.27, hz(38.15), smid + k * 0.95 + 0.27, hz(39.1)) for k in (-1, 1)]
        else: holes = [rect(smid - 0.27, hz(38.15), smid + 0.27, hz(39.1))]
        fill2d(fg, [out] + holes, 0.0, BRICK, C_PLAIN)
        for hr in holes: house_window(fg, hr, shutters=False)
        # the east gable's north corner (w0) stands inside the chapel's south aisle wall: no quoins there
        deco(fg, sA, sB, eave, long=False, no_quoin=(fg.s_of(uu, w0),) if nu > 0 else ())
        # stone copings + kneelers on the gable
        a = fg.p(sA - 0.06, hz(eave + 0.14), -0.2); m = fg.p(smid, hz(ridge + 0.45), -0.2); b = fg.p(sB + 0.06, hz(eave + 0.14), -0.2)
        coping_rake(a, m, b, 0.24, 0.28, 0.16)          # one mitred piece (two halves overlapped at the apex)
        for s in (sA, sB):
            fbox(fg, s - 0.2, s + 0.2, hz(eave - 0.25), hz(eave + 0.2), -0.45, 0.11, STONE, C_COPING, skip=())   # 3 cm prouder than the coping
        # the gable's inner face above the roof, under the coping (the roof stops against it)
        if not FAR():
            fb = frame_uw(uu - nu * 0.4, wm, -nu, 0)
            slh = (ridge - eave) / (wm - w0)
            cop_b = lambda dw: (ridge + 0.45) - ((ridge + 0.45) - (eave + 0.14)) * dw / (wm - w0 + 0.06) - 0.16
            ws = [-(wm - w0) + 0.02, 0.0, (wm - w0) - 0.02]
            bot = [(fb.s_of(uu - nu * 0.4, wm + dw), hz(ridge - abs(dw) * slh - 0.06)) for dw in ws]
            top = [(fb.s_of(uu - nu * 0.4, wm + dw), hz(cop_b(abs(dw)) + 0.01)) for dw in reversed(ws)]
            fill2d(fb, [bot + top], 0.0, BRICK, C_PLAIN)
        # chimney on the gable's apex (P02, P04)
        cc = fg.p(smid, 0.0, -0.3)
        wbox(cc, fg.U, fg.N, 0.3, 0.24, hz(ridge - 0.3), hz(42.35), BRICK, C_PLAIN)
        wbox(cc, fg.U, fg.N, 0.36, 0.3, hz(42.1), hz(42.22), STONE, C_BAND)
        wbox(cc, fg.U, fg.N, 0.33, 0.27, hz(42.22), hz(42.42), BRICK, C_PLAIN)
    # roof: two slate planes (ridge along u), gutters
    ov = 0.25; sl = (ridge - eave) / (wm - w0); eh = eave - ov * sl
    for sg in (-1, 1):
        we = wm + sg * (wm - w0 + ov)
        rf = [P(u0 + 0.4, we, eh), P(u1 - 0.4, we, eh), P(u1 - 0.4, wm, ridge), P(u0 + 0.4, wm, ridge)]
        slab(rf, 0.1, SLATE, C_PLAIN, edges=(True, False, False, False), uvs=RK.facet_uv(*rf, rf))
        slates(*rf)
        gutter(P(u0 + 0.1, we, eh - 0.02), P(u1 - 0.1, we, eh - 0.02))
        downpipe(P(u1 - 0.15 if sg < 0 else u0 + 0.15, we + sg * 0.05, eh - 0.05), 33.9)
    if not FAR():
        ridge_cap(P(u0 + 0.38, wm, ridge), P(u1 - 0.38, wm, ridge), (ridge - eave) / (wm - w0))

def door_leaf_arch(fr, loop, dc, d):
    """the house's arched door leaf: vertical boards clipped to the round head"""
    if FAR():
        fill2d(fr, [loop], d, DOOR, C_DOOR); return
    fill2d(fr, [loop], d, DOOR, C_DOOR)
    xs = [p[0] for p in loop]; a, b = min(xs), max(xs)
    n = 6; wb = (b - a) / n
    for k in range(1, n):
        x = a + k * wb
        top = hz(35.85) + 0.4 * math.sqrt(max(0.0, 1 - ((x - dc) / 0.45) ** 2))
        fbox(fr, x - 0.005, x + 0.005, loop[0][1] if False else hz(34.0), top - 0.01, d, d + 0.006, DOOR, C_DOOR)
    lathe_axis(fr.p(dc + 0.25, hz(35.0), d), fr.N, Z, [(0.03, 0.0), (0.03, 0.04), (0.0, 0.05)], 8, IRON)

def forecourt():
    """the cobbled forecourt in front of the west door and along the house's north face (photos c00, P02, P03)"""
    us = [-6.6 + 0.5 * i for i in range(14)] + [0.0]
    w_lo, w_hi = WC - A_OUT - 0.35, SC.HOUSE["w0"] + 0.03
    ws = [w_lo + (w_hi - w_lo) * j / 10 for j in range(11)]
    K.B.new_group()
    for i in range(len(us) - 1):
        for j in range(len(ws) - 1):
            pts = [(us[i], ws[j]), (us[i + 1], ws[j]), (us[i + 1], ws[j + 1]), (us[i], ws[j + 1])]
            face_up([P(u, w, gnd(u, w) + 0.035) for u, w in pts], COBB, C_PLAIN)

# ------------------------------------------------------------------------------------------------ build
def build_all():
    west_front()
    north_aisle(); south_aisle()
    clerestory(-1); clerestory(1)
    apse()
    roofs()
    belfry()
    sacristy()
    house()
    forecourt()

build_all()
B_MAIN = K.B
print(f"LOD0: {len(B_MAIN.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = True
build_all()
west_door_leaves()
B_FAR = K.B
K.B = SC.Builder(); K.FAR = False
west_door_leaves()
B_DOOR = K.B
print(f"far: {len(B_FAR.f)} faces, door {len(B_DOOR.f)}, slates {len(B_SL.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
AO_SPLIT = 0.86
obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "Stalle", B_MAIN, 0.0, AO_SPLIT, AO_PX)
far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "Stalle_far", B_FAR, AO_SPLIT + 0.005, 0.94, AO_PX)
door, ntri_door, _, thin2 = SC.make_object(scn, mats, SLOTS, "Stalle_door", B_DOOR, 0.945, 1.0, AO_PX)
slat, ntri_slat, _, thin3 = SC.make_object(scn, mats, SLOTS, "Stalle_slates", B_SL, 0.945, 1.0, AO_PX)
print(f"uv done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground (bake occluder + previews)
def load_ground():
    import numpy as np
    g = _g
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(g["rows"], g["cols"]).astype(np.float64) / 100 + g["base"]
    st = 2
    a = a[::st, ::st]; step = g["step"] * st
    rows, cols = a.shape
    verts = []
    for r in range(rows):
        for c in range(cols):
            x, z = g["x0"] + c * step, g["z0"] + r * step
            u, w = G.local(x, z)
            verts.append((u, -w, a[r, c] - OY - 0.02))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    go = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(go)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.15, 1)
    gm.materials.append(gmat)
    return go
ground_obj = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 3.0
ao_img = bpy.data.images.new("stalle_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
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
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    n_set = 0
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices:
            c[4 * li + 1] = max(0.25, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 96 if "--fast" not in ARGS else 24
    t = time.time()
    objs = [obj, far, door, slat]
    for i, target in enumerate(objs[:3]):
        for o in objs: o.hide_render = o is not target and not (target is door and o is obj)
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    for target, th in ((obj, thin0), (far, thin1), (door, thin2), (slat, thin3)):
        for o in objs: o.hide_render = o is not target and not (target in (door, slat) and o is obj)
        vertex_ao(target, th)
    for o in objs: o.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "stalle_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "stalle_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far, door, slat): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "stalle.audit.raw.glb" if "--audit-only" in ARGS else "stalle.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
S = SITE["solids"]
info = {
    "asset": "Chapelle de Stalle (Notre-Dame de Bon-Secours), rue de Stalle 50, Uccle + the sacristan's house (tools/blender/stalle.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_door": ntri_door, "triangles_slates": ntri_slat, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"sandstone_rubble": "rough-squared Brussels sandstone (white stone) in irregular courses: the chapel's walls (not in the shared library yet: falls back to stone_white)",
                       "painted_wood_red": "the red-brown painted doors and shutters (not in the library: falls back to wood_frame_dark)"},
    "uv": {"TEXCOORD_0": "world metres, per face (walls u along / v up; swept parts path x profile)", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 0.94], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1),
                 "thin_faces_vertex_ao": [obj["thin"], far["thin"], door["thin"]]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                  "hides_solids": [S["chapel"]["id"], S["house"]["id"]], "hides_bu_ids": [S["chapel"]["bu"], S["house"]["bu"]],
                  "chapel_bu_id": S["chapel"]["bu"]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "ridge_taw": SC.RIDGE, "roof_dsm": SITE["roof"], "ground_taw": SITE["ground"], "footprint_local": SITE["footprint_local"]},
    "levels_taw": {"floor": SC.FLOOR, "choir_floor": SC.CHOIR_FLOOR, "aisle_eave": SC.AISLE_EAVE, "aisle_top": SC.AISLE_TOP, "nave_eave": round(SC.NAVE_EAVE, 2),
                   "ridge": SC.RIDGE, "gable_apex": SC.GABLE_APEX, "door_top": SC.DOOR_TOP, "west_window": [SC.WWIN_SILL, SC.WWIN_SPRING, SC.WWIN_APEX]},
    "plan": {"axis_w": WC, "aisle_outer": A_OUT, "nave_outer": NW, "u_aisle_n": SC.U_AISLE_N, "u_aisle_s": SC.U_AISLE_S, "u_apse": SC.U_APSE, "u_east": SC.U_EAST,
             "bell_u": SC.BELL_U, "clerestory_oculi_u": SC.CLER_OCULI, "north_aisle": SC.N_AISLE, "south_aisle": SC.S_AISLE},
    "estimated": "the south side of the nave (mirror of the north: oculi, no door), the sacristy's openings, the house's south and east faces; "
                 "wall thicknesses; the bell-cote's spire / cross heights (DSM under-samples thin parts); the statue is a stylised figure",
}
if "--audit-only" not in ARGS: json.dump(info, open(os.path.join(OUT, "stalle.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"sandstone_rubble": (0.42, 0.39, 0.32), "stone_white": (0.6, 0.57, 0.5), "stone_blue": (0.2, 0.21, 0.22), "brick_red_brussels": (0.3, 0.09, 0.05),
            "slate": (0.06, 0.065, 0.075), "zinc_roof": (0.3, 0.32, 0.33), "wood_frame_dark": (0.05, 0.035, 0.025), "painted_wood_red": (0.18, 0.05, 0.03),
            "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.02, 0.02, 0.02), "cobbles": (0.18, 0.17, 0.15)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else (0.5 if m.name in ("zinc_roof", "slate") else 0.85)
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(200))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 40; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, tgt, lens=28, res=(900, 1100)):
        cam.location = P(*pos); tg = P(*tgt)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"preview_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    look("west", (-13.0, 0.3, 35.5), (0.0, 0.1, 39.5), 30)
    look("northwest", (-12.0, -11.0, 35.5), (4.0, 0.0, 38.5), 26, (1100, 900))
    look("northeast", (19.0, -15.0, 36.0), (8.0, -1.0, 38.0), 26, (1100, 800))
    look("aerial", (24.0, -22.0, 58.0), (5.0, 1.0, 38.0), 30, (1100, 800))
print(f"done {time.time() - T0:.1f}s")
