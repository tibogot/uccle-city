"""CHATEAU LATOUR DE FREIN / DOMAINE DE LATOUR DE FREINS (Rue Engeland 555, Uccle; wikidata Q127161341): the scripted
landmark, built entirely in code from MEASURED data (UrbIS solid 538562 + DSM / DTM 2021, OSM way 30498629) and photos
(looked at only; docs/landmarks/LATOURDEFREIN.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/latourdefrein.py -- models/latourdefrein [--no-bake] [--fast] [--previews] [--views=a,b] [--checker] [--level=1]
      models/latourdefrein/latourdefrein.raw.glb   nodes "LatourDeFrein" (LOD0), "LatourDeFrein_far" (LOD1), "LatourDeFrein_xfar" (LOD2)
      models/latourdefrein/latourdefrein_ao.png    ambient occlusion (Cycles on the GPU through OptiX, each level alone) in TEXCOORD_1
      models/latourdefrein/latourdefrein.json      slots, codes, placement, counts, measured / estimated

THE BUILDING (Ucclensia 221: the convalescent hospital "Refuge de Latour de Freins", built from 1899 to 1903 to the plans
of Henri Maquet in the Renaissance style, the front in red Silesian brick, the side wings raised by a storey thanks to
Georges Brugmann; today a school): a long two-storey brick block with white stone bands, quoins and harped window
surrounds under a tall slate roof with two rows of dormers; a central avant-corps on the north front (the entrance, a
round-arched door under a segmental pediment, a stone lucarne with a pediment); two short pavilions on the end walls;
two wings to the south round a courtyard closed by a one-storey gallery under a terrace.
Frame (tools/landmark5_measure.py latourdefrein): u from the north front (u 0 = the avant-corps' front) to the south, w to
the WEST (w > 0: the west wing); heights m TAW.
MEASURED (UrbIS LoD2 levels, DSM 2021 on a 0.25 m building-frame grid, OSM): the plan (OSM / UrbIS walls); the eaves 115.0
(UrbIS 114.82-115.09; DSM); the main ridge 120.85 at u 13.75 (DSM 120.83-120.92 along w -27 .. 27; UrbIS 120.97) with
hipped ends (ridge ends |w| ~27: DSM); the avant-corps' ridge 120.75 (DSM 120.7 at w 0, u 6-12), its front hip, the stone
lucarne (UrbIS 115.06 base at w +-1.78, steps 117.3-118.2, DSM 119.2-119.5); the wings' ridges 119.55 at w +-25.3 (DSM
119.5-119.7) with hipped south ends (ridge ends u ~35.1: DSM); the gallery's flat roof 109.15 (UrbIS 109.13-109.16, DSM
109.2); the pavilions' low roofs (UrbIS eaves 112.2-112.6, top 113.8-114.0); the central roof lantern (UrbIS 2.5 x 2.9 m,
120.93 -> 122.48; DSM 122.2-122.4); the chimneys (DSM 121.1-121.4 at (5.75, +-4.0) and (15.25, 26.75)); the dormers'
positions (DSM bumps to 117.45 at |w| 11.75, 18.75, 25.25 on the front slope); the rear lucarne (DSM 119.2 ridge, u 15.5-19);
the ground (DTM 102.2 round the building); the perron (DSM 103.7 -> 102.6 over u -1 .. -3).
FROM THE PHOTOS (north front, 2020; a pavilion, 2017; Google Maps user photos, looked at only): calibrated on the eaves
and the ground: GF windows 104.6-108.1 (transom 107.0), FF 110.2-113.25 (transom 112.2), the band levels, the frieze, the
door (4.2 m round arch), the pediment, the lucarne, the 7 bays a side at 3.45 m, the dormer rows, the quoins / harps,
the louvred basement vents, the pavilion's double window, blank cartouche and four iron anchors.
ESTIMATED (not visible from a public street): every opening of the side, back, wing and courtyard walls (same rhythm and
details as the front), the gallery's windows, the skylights on the courtyard slopes (white rectangles on the 2024
orthophoto), the wing dormers, the door's panelling, the lantern's louvres, the wall depths.
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
import church_kit as CK
import castle_kit as CA
from stpierre_common import K, P, hz, Z, fill2d, strip2d, rect, fbox, wbox, bar, sweep2d, sweep3d, face_dir, OY, arc_pts, circle
from church_kit import (Seg, ccw_uw, flat_group, FAR, XFAR, ridge_cap, pyramid, rodc, C_PLAIN, C_COPING, C_SUR, C_CORN,
                        C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_FRAME)
from castle_kit import (Facade, cross_window, vent, roof_face, dormer, chimney, sloop, BRICK, SW, SLATE, ZINC, WOODW,
                        GLASS, IRON, BS, WOODD, TERR)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/latourdefrein")
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "castle1")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
SLOTS = ["brick_red_brussels", "stone_white", "slate", "zinc_roof", "wood_frame_white", "glass_window", "cast_iron_green",
         "stone_blue", "wood_frame_dark", "terrace_tiles"]

# ------------------------------------------------------------------------------------------------ THE PLAN (measured)
HB = 100.0; CK.KIT.HB = HB          # walls go this far down (DTM round the walls 100.3-102.4: light wells at a few feet)
GR, FL = 102.2, 103.7                # the ground at the front (DTM 102.2-102.3); the ground floor (perron top, DSM 103.7)
EAVE = 115.0                         # UrbIS 114.82-115.09 (front, ends, wings); the cornice below it
UF, UB = 7.75, 19.75                 # the main block's front / back walls (OSM)
WP, WN = 31.55, -31.47               # its end walls (OSM west 31.50-31.60, east -31.44 .. -31.49)
RU, RIDGE = 13.75, 120.85            # the main ridge (DSM)
KM = (RIDGE - EAVE) / (RU - UF)      # 0.975 (44 deg)
KH = 1.3                             # the main hips (ridge ends |w| ~27: DSM 120.2-120.4 to w -27.5 / 26.5)
RWP, RWN = WP - (RIDGE - EAVE) / KH, WN + (RIDGE - EAVE) / KH
AW = 6.94                            # the avant-corps: u 0 .. 7.75, w +-6.94 (OSM)
A_RIDGE, A_R0 = 120.75, 6.0          # its ridge (DSM 120.7 at w 0 from u 6 to the main ridge)
KA = (A_RIDGE - EAVE) / AW           # its side slopes (39.6 deg)
KF = (A_RIDGE - EAVE) / A_R0         # its front hip (43.8 deg)
A_R1 = UF + (A_RIDGE - EAVE) / KM    # where its ridge meets the main front slope (13.65)
LW, L_CHEEK, L_RIDGE = 1.6, 117.6, 119.2      # the stone lucarne (UrbIS +-1.78 at 115.06; DSM ridge 119.2)
L_UC, L_UR = (L_CHEEK - EAVE) / KF, (L_RIDGE - EAVE) / KF        # its valleys on the front hip (2.71, 4.38)
R_UC, R_UR = RU + (RIDGE - L_CHEEK) / KM, RU + (RIDGE - L_RIDGE) / KM   # the rear lucarne's on the back slope (17.08, 15.44)
W_RIDGE, KS = 119.55, (119.55 - EAVE) / 3.5   # the wings (DSM 119.5-119.7; hips to u_end - 3.5)
WINGS = {1: dict(win=20.91, wout=30.0, uend=38.51, gal_end=37.28, gal_w=18.02),
         -1: dict(win=-20.66, wout=-29.88, uend=38.75, gal_end=37.42, gal_w=-17.88)}
for s_, W_ in WINGS.items():
    W_["c"] = (W_["win"] + W_["wout"]) / 2; W_["half"] = abs(W_["wout"] - W_["win"]) / 2
    W_["k"] = (W_RIDGE - EAVE) / W_["half"]; W_["ur"] = W_["uend"] - (W_RIDGE - EAVE) / KS
U_V = UB - (W_RIDGE - EAVE) / KM     # the wing ridges meet the main back slope (15.08)
GU, G_TOP = 22.3, 109.15             # the courtyard gallery: its courtyard wall, its terrace (UrbIS 109.13-109.16)
PAV = {1: dict(w0=WP, w1=34.47, u0=10.58, u1=15.80), -1: dict(w0=WN, w1=-34.43, u0=10.99, u1=16.05)}
PAV_EAVE, PAV_TOP = 112.5, 113.9     # UrbIS 112.22-112.62 / 113.78-114.02
LANT = (13.55, 0.0, 1.25, 1.45, 119.3, 121.55, 122.45)    # the roof lantern: centre u, w, half u, half w, base, body top, apex
CHIMNEYS = [(5.75, 4.0, 117.0), (5.75, -4.0, 117.0), (15.25, 26.75, 119.0)]   # DSM peaks (top 121.1-121.4: the cap 121.7)
CH_TOP = 121.7
# levels (photo, calibrated on the eaves 115.0 and the ground 102.2)
GF = (104.6, 107.0, 108.1)           # ground floor: sill, transom, head
FF = (110.2, 112.2, 113.25)          # first floor
BAYS = [8.25 + 3.45 * k for k in range(7)]     # |w| of the front bays (dormer bumps at |w| 11.75 / 18.75 / 25.25)
WING_BAYS = [21.6 + 3.45 * k for k in range(5)]
CORN = 114.3                         # the main cornice 114.3 -> 115.0
FRIEZE = (113.75, 114.3)

# roof planes
hF = lambda u, w: EAVE + KM * (u - UF)
hB = lambda u, w: EAVE + KM * (UB - u)
hHP = lambda u, w: EAVE + KH * (WP - w)
hHN = lambda u, w: EAVE + KH * (w - WN)
hAP = lambda u, w: EAVE + KA * (AW - w)
hAN = lambda u, w: EAVE + KA * (w + AW)
hAF = lambda u, w: EAVE + KF * u
hL = lambda u, w: L_RIDGE - 1.0 * abs(w)
def hWin(s): W_ = WINGS[s]; return lambda u, w: EAVE + W_["k"] * (w - W_["win"]) * s
def hWout(s): W_ = WINGS[s]; return lambda u, w: EAVE + W_["k"] * (W_["wout"] - w) * s
def hWhip(s): W_ = WINGS[s]; return lambda u, w: EAVE + KS * (W_["uend"] - u)
def roof_at(u, w):
    """the roof's height at a plan point (the hipped main block / avant-corps / wings: max over the masses of the min of
    their planes; for chimney / lantern bases)"""
    main = min(hF(u, w), hB(u, w), hHP(u, w), hHN(u, w))
    av = min(hAP(u, w), hAN(u, w), hAF(u, w)) if abs(w) <= AW and u <= A_R1 else -1e9
    wg = max(min(hWin(s)(u, w), hWout(s)(u, w), hWhip(s)(u, w)) if (WINGS[s]["win"] - w) * s <= 0 <= (WINGS[s]["wout"] - w) * s else -1e9 for s in (1, -1))
    return max(main, av, wg)

# ------------------------------------------------------------------------------------------------ helpers
def seg_u(u, w0, w1, out):
    """a wall at constant u from w0 to w1 facing out (+1: +u)"""
    return Seg((u, w0), (u, w1), (out, 0))

def seg_w(w, u0, u1, out):
    return Seg((u0, w), (u1, w), (0, out))

def t_of(seg, u, w):
    """metres along seg from its a end to the plan point's projection"""
    a, b = seg.a, seg.b
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    return ((u - a[0]) * (b[0] - a[0]) + (w - a[1]) * (b[1] - a[1])) / L

def frieze(F, h0=FRIEZE[0], h1=FRIEZE[1], sq=0.25, pitch=0.9):
    """the stone frieze under the cornice with small brick squares (the photo's chequer)"""
    F.band(h0, h1, SW)
    if FAR(): return
    n = int((F.t1 - F.t0 - 0.6) / pitch)
    if n < 1: return
    x0 = F.t0 + (F.t1 - F.t0 - (n - 1) * pitch) / 2
    hm = (h0 + h1) / 2
    for k in range(n):
        F.add(BRICK, x0 + k * pitch - sq / 2, x0 + k * pitch + sq / 2, hm - sq / 2, hm + sq / 2)

def bands(F, lower=True, upper=True, gallery=False):
    """the stone bands of a two-storey wall (photo: sill, transom and lintel lines, the string course, the frieze)"""
    F.add(BS, F.t0, F.t1, HB, 102.45)                       # blue stone plinth
    F.add(BS, F.t0, F.t1, 103.55, 103.8)                    # water table (+ the proud moulding: sweep)
    if lower:
        F.band(104.45, 104.6)
        if not XFAR(): F.band(107.0, 107.13)
        F.band(108.1, 108.32)
    if gallery:
        F.band(108.55, 108.85)
        return
    if upper:
        F.band(109.25, 109.55)
        if not XFAR():
            F.band(110.05, 110.2); F.band(112.2, 112.33)
        F.band(113.25, 113.47)
        frieze(F)

def two_storey(seg, t0, t1, bays_t, top=CORN, qa=True, qb=True, vents=True, gf=True, ff=True, h0=HB, wd=1.5, ff_only=False,
               extra=None):
    """a standard wall: bands, quoins, a cross window per bay on each floor, basement vents under the GF windows"""
    F = Facade(seg, h0, top, t0, t1)
    bands(F, lower=not ff_only, upper=True)
    F.quoins(qa, qb, h0=103.8 if h0 < 103.8 else h0, h1=FRIEZE[0])
    for t in bays_t:
        if gf and not ff_only:
            cross_window(F, t, wd, GF[0], GF[2], GF[1])
            if vents: vent(F, t)
        if ff: cross_window(F, t, wd, FF[0], FF[2], FF[1])
    if extra: extra(F)
    F.emit()
    return F

def oriented(path_uw, probe, want):
    """Blender points of a (u, w) path, ordered so the sweep's +x (right of the path) points `want` (u, w) at segment
    `probe` (index of its first point)"""
    pts = [P(u, w, OY) for u, w in path_uw]
    a, b = pts[probe], pts[probe + 1]
    r = (b - a).normalized().cross(Z)
    if r.dot(Vector((want[0], -want[1], 0))) < 0:
        return list(reversed(path_uw))
    return list(path_uw)

def sweep_at(path_uw, h, profile, mat, code, closed=False, caps=True, probe=0, want=(-1, 0)):
    p = oriented(path_uw, probe, want)
    sweep3d([P(u, w, h) for u, w in p], profile, Z, mat, code, closed=closed, caps=caps)
    flat_group()                                  # mouldings flat shaded (smooth normals bled into their flat faces)

# ------------------------------------------------------------------------------------------------ the walls
def main_front():
    for s in (1, -1):
        wa, wb = (AW, WP) if s > 0 else (WN, -AW)
        seg = seg_u(UF, wa, wb, -1)
        ts = [t_of(seg, UF, s * b) for b in BAYS]
        two_storey(seg, 0.0, seg.L, ts, qa=(s < 0), qb=(s > 0))

def avant_front():
    seg = seg_u(0.0, -AW, AW, -1)
    tc = t_of(seg, 0, 0)
    tl, tr = t_of(seg, 0, -4.2), t_of(seg, 0, 4.2)
    def extra(F):
        door(F, tc)
    F = Facade(seg, HB, CORN)
    bands(F)
    F.quoins(True, True, h0=103.8, h1=FRIEZE[0])
    for t in (tl, tr):
        cross_window(F, t, 1.5, GF[0], GF[2], GF[1]); vent(F, t)
    for t in (tl, tc, tr):
        cross_window(F, t, 1.5, FF[0], FF[2], FF[1])
    door(F, tc)
    F.emit()
    if not FAR(): perron(seg, tc)

def door(F, tc):
    """the entrance (photo): a round-arched door 1.7 m wide (crown 107.75) in a stone surround with an architrave and a
    keystone, a fanlight, dark double doors; a segmental pediment on two consoles above (108.35 -> 109.2)"""
    seg, fr = F.seg, F.seg.fr
    hw, spring, crown = 0.85, 106.9, 107.75
    F.add(SW, tc - 1.3, tc + 1.3, FL - 0.1, 108.32)
    F.hole(tc - hw, tc + hw, FL, crown)
    s0, s1 = sorted((seg.s(tc - hw), seg.s(tc + hw))); sc = (s0 + s1) / 2
    n = 12 if not FAR() else (6 if not XFAR() else 3)
    arc = [(sc + hw * math.cos(math.pi * (1 - k / n)), hz(spring) + hw * math.sin(math.pi * (1 - k / n))) for k in range(n + 1)]
    opening = [(s0, hz(FL))] + arc + [(s1, hz(FL))]
    # the spandrels between the rectangular raster hole and the arch (stone, in the wall plane)
    h = n // 2
    fill2d(fr, [arc[:h + 1] + [(s0, hz(crown))]], 0.0, SW, C_SUR)
    fill2d(fr, [arc[h:] + [(s1, hz(crown))]], 0.0, SW, C_SUR)
    D = 0.45 if not XFAR() else 0.1
    K.B.new_group(); strip2d(fr, opening, 0.0, -D, SW, C_SUR); flat_group()       # the reveal faceted (no smooth arc into the jambs)
    vs = hz(spring)
    fill2d(fr, [rect(s0, hz(FL), s1, vs)], -D, WOODD, C_DOOR)
    fill2d(fr, [[(s0, vs)] + arc[1:-1] + [(s1, vs)]], -D, GLASS, C_GILT)        # the fanlight: lit at night
    if XFAR(): return
    if not FAR():
        # the fanlight's transom and radial bars, the leaves' meeting stile, rails, panels
        fbox(fr, s0, s1, vs - 0.08, vs + 0.04, -D, -D + 0.07, WOODD, C_DOOR, skip=("back",))
        for k in (1, 2, 3):
            a = math.pi * k / 4
            p0 = (sc + 0.12 * math.cos(a), vs + 0.04 + 0.12 * math.sin(a)); p1 = (sc + (hw - 0.04) * math.cos(a), vs + 0.04 + (hw - 0.04) * math.sin(a))
            bar(fr, p0, p1, -D, 0.025, 0.03, WOODD, C_DOOR)
        fbox(fr, sc - 0.04, sc + 0.04, hz(FL), vs - 0.08, -D, -D + 0.06, WOODD, C_DOOR, skip=("back",))
        for x0, x1 in ((s0 + 0.12, sc - 0.12), (sc + 0.12, s1 - 0.12)):
            for v0, v1 in ((hz(FL) + 0.25, hz(FL) + 1.2), (hz(FL) + 1.45, vs - 0.3)):
                fbox(fr, x0, x1, v0, v1, -D, -D + 0.035, WOODD, C_DOOR, skip=("back",))
        # architrave round the arch, keystone
        path = [(s0 - 0.0, hz(FL))] + arc + [(s1, hz(FL))]
        sweep2d(fr, path, [(0.0, 0.0), (0.06, 0.0), (0.06, 0.13), (0.03, 0.18), (0.0, 0.18)], SW, C_SUR, caps=True); flat_group()
        fbox(fr, sc - 0.16, sc + 0.16, hz(crown) - 0.12, hz(crown) + 0.35, 0.0, 0.1, SW, C_SCULPT)
    # the segmental pediment on consoles
    pw, b0, b1, ap = 1.95, 108.35, 108.55, 109.05
    fbox(fr, sc - pw, sc + pw, hz(b0), hz(b1), 0.0, 0.26, SW, C_CORN)
    m = 10 if not FAR() else 4
    R = ((pw ** 2) + (ap - b1) ** 2) / (2 * (ap - b1))
    cy = hz(ap) - R
    a0 = math.asin(pw / R)
    seg_arc = [(sc + R * math.sin(-a0 + 2 * a0 * k / m), cy + R * math.cos(-a0 + 2 * a0 * k / m)) for k in range(m + 1)]
    fill2d(fr, [[(sc - pw, hz(b1))] + seg_arc[1:-1] + [(sc + pw, hz(b1))]], 0.06, SW, C_SCULPT)
    strip2d(fr, [(sc - pw, hz(b1))] + seg_arc[1:-1] + [(sc + pw, hz(b1))], 0.0, 0.06, SW, C_SCULPT, inward=False)
    prof = [(0.0, 0.0), (0.16, 0.0), (0.2, 0.06), (0.2, 0.14), (0.0, 0.16)] if not FAR() else [(0.0, 0.0), (0.18, 0.0), (0.18, 0.14), (0.0, 0.14)]
    sweep2d(fr, seg_arc, prof, SW, C_CORN, caps=True, d0=0.06); flat_group()
    for x in (sc - pw + 0.2, sc + pw - 0.2):
        fbox(fr, x - 0.11, x + 0.11, hz(b0) - 0.45, hz(b0), 0.0, 0.2, SW, C_SCULPT)

def perron(seg, tc):
    """the perron (DSM 103.7 at u -1 .. 0 down to 102.6 at u -3): a landing and three steps of blue stone"""
    w0, w1 = -2.1, 2.1
    tops = [(FL, -1.2), (FL - 0.375, -1.7), (FL - 0.75, -2.2), (FL - 1.125, -2.7)]
    bot = 101.9
    # treads and risers
    K.B.new_group()
    prev_u = 0.0
    for h, u in tops:
        face_dir([P(prev_u, w0, h), P(prev_u, w1, h), P(u, w1, h), P(u, w0, h)], Z, BS, C_PLINTH)
        lo = tops[tops.index((h, u)) + 1][0] if (h, u) != tops[-1] else bot
        face_dir([P(u, w0, h), P(u, w1, h), P(u, w1, lo), P(u, w0, lo)], Vector((-1, 0, 0)), BS, C_PLINTH)
        prev_u = u
    # the two side faces (one staircase polygon each)
    for w, nrm in ((w0, Vector((0, 1, 0))), (w1, Vector((0, -1, 0)))):
        prof = [(0.0, bot), (0.0, FL)]
        for i, (h, u) in enumerate(tops):
            prof.append((u, h))
            if i + 1 < len(tops): prof.append((u, tops[i + 1][0]))
        prof.append((tops[-1][1], bot))
        from mathutils.geometry import tessellate_polygon
        vs = [Vector((u, h, 0)) for u, h in prof]
        for t in tessellate_polygon([vs]):
            face_dir([P(prof[i][0], w, prof[i][1]) for i in t], nrm, BS, C_PLINTH)

def avant_sides():
    for s in (1, -1):
        seg = seg_w(s * AW, 0.0, UF, s)
        two_storey(seg, 0.0, seg.L, [t_of(seg, 3.9, s * AW)], qa=True, qb=False, wd=1.4)

def main_ends():
    for s, Pv in PAV.items():
        w = Pv["w0"]
        seg = seg_w(w, UF, UB, s)
        tA, tB = t_of(seg, Pv["u0"], w), t_of(seg, Pv["u1"], w)
        # the two full-height strips beside the pavilion, a narrow window each floor (estimated)
        for (t0, t1, qa, qb) in ((0.0, tA, True, False), (tB, seg.L, False, True)):
            a, b = sorted((t0, t1))
            two_storey(seg, a, b, [(a + b) / 2], qa=(a == 0.0), qb=(b == seg.L), wd=1.1)
        # above the pavilion's roof: brick to the cornice
        a, b = sorted((tA, tB))
        F = Facade(seg, PAV_EAVE - 0.1, CORN, a, b)
        F.band(113.25, 113.47); frieze(F)
        F.emit()

def pavilions():
    for s, Pv in PAV.items():
        w0, w1, u0, u1 = Pv["w0"], Pv["w1"], Pv["u0"], Pv["u1"]
        uc = (u0 + u1) / 2
        top = 111.85
        # the front face (photo 2017): the double cross window, the blank cartouche and four iron anchors, a cross window
        # under the frieze, four louvred vents, quoins
        seg = seg_w(w1, u0, u1, s)
        tc = t_of(seg, uc, w1)
        F = Facade(seg, HB, top)
        bands(F, upper=False)
        F.band(109.25, 109.55); F.band(111.25, 111.45)
        frieze(F, 111.5, 111.85, sq=0.22, pitch=0.75)
        F.quoins(True, True, h0=103.8, h1=111.5)
        for d in (-0.785, 0.785):
            cross_window(F, tc + d, 1.25, GF[0], GF[2], GF[1], sill=False)
        F.add(SW, tc - 0.17, tc + 0.17, GF[0], GF[2])              # the pier between
        cross_window(F, tc, 1.4, 109.95, 111.25, 110.85)
        for d in (-1.1, -0.35, 0.35, 1.1):
            vent(F, tc + d, wd=0.55)
        F.emit()
        fr = seg.fr
        if not XFAR():
            sc = seg.s(tc)
            fbox(fr, sc - 1.58, sc + 1.58, hz(GF[0]) - 0.15, hz(GF[0]), 0.0, 0.07, SW, C_SILL)      # one sill under the pair
            fbox(fr, sc - 0.45, sc + 0.45, hz(108.6), hz(109.05), 0.0, 0.04, SW, C_SCULPT)          # the blank cartouche
            if not FAR():
                for d in (-2.0, -1.05, 1.05, 2.0):
                    x = seg.s(tc + d)
                    fbox(fr, x - 0.025, x + 0.025, hz(108.45), hz(109.15), 0.0, 0.035, IRON, C_FRAME)
                    fbox(fr, x - 0.14, x + 0.14, hz(108.77), hz(108.83), 0.0, 0.03, IRON, C_FRAME)
        # the sides: blank, bands, quoins at the outer corner
        for u, out in ((u0, -1), (u1, 1)):
            sg = seg_u(u, w0, w1, out)
            F = Facade(sg, HB, top)
            bands(F, upper=False); F.band(109.25, 109.55); F.band(111.25, 111.45)
            frieze(F, 111.5, 111.85, sq=0.22, pitch=0.75)
            far_end_is_b = abs(sg.b[1]) > abs(sg.a[1])
            F.quoins(not far_end_is_b, far_end_is_b, h0=103.8, h1=111.5)
            F.emit()
        # cornice round the three faces, the low hipped roof (a half pyramid against the end wall)
        path = [(u0, w0), (u0, w1), (u1, w1), (u1, w0)]
        prof = [(0.0, 0.0), (0.07, 0.0), (0.07, 0.08), (0.14, 0.16), (0.14, 0.26), (0.28, 0.44), (0.32, 0.46), (0.32, 0.65), (0.0, 0.65)] \
            if not FAR() else [(0.0, 0.0), (0.1, 0.0), (0.3, 0.4), (0.3, 0.65), (0.0, 0.65)]
        sweep_at(path, top, prof, SW, C_CORN, caps=False, probe=1, want=(0, s))
        apex = (uc, w0, PAV_TOP)
        A = lambda u, w, h=PAV_EAVE: (u, w, h)
        for tri in ([A(u0, w1), A(u1, w1), apex], [A(u0, w0), A(u0, w1), apex], [A(u1, w1), A(u1, w0), apex]):
            K.B.new_group(); flat_group()
            face_dir([P(*p) for p in tri], Z, SLATE, C_PLAIN)
        if not FAR():
            for a in (A(u0, w1), A(u1, w1)):
                ridge_cap(P(a[0], a[1], a[2] + 0.02), P(apex[0], apex[1], apex[2] + 0.02), w=0.09, h=0.06)

def main_back():
    # above the gallery's terrace: first-floor windows, the central window between two cartouches (Ucclensia 221)
    seg = seg_u(UB, WINGS[-1]["win"], WINGS[1]["win"], 1)
    ws = [0.0] + [s * x for x in (4.4, 7.85, 11.3, 14.75, 18.2) for s in (1, -1)]
    F = Facade(seg, G_TOP, CORN)
    bands(F, lower=False)
    for w in ws:
        cross_window(F, t_of(seg, UB, w), 1.5, FF[0], FF[2], FF[1])
    F.emit()
    if not XFAR():
        fr = seg.fr
        for w in (-1.75, 1.75):
            x = seg.s(t_of(seg, UB, w))
            fbox(fr, x - 0.4, x + 0.4, hz(110.9), hz(111.5), 0.0, 0.04, SW, C_SCULPT)
    # the strips between the wings' outer walls and the end walls (full height)
    for s in (1, -1):
        wa, wb = (WINGS[s]["wout"], WP) if s > 0 else (WN, WINGS[s]["wout"])
        sg = seg_u(UB, wa, wb, 1)
        F = Facade(sg, HB, CORN)
        bands(F)
        F.quoins(s < 0, s > 0, h0=103.8, h1=FRIEZE[0])
        F.emit()

def wings():
    for s, W_ in WINGS.items():
        win, wout, uend, gend = W_["win"], W_["wout"], W_["uend"], W_["gal_end"]
        # outer wall: five bays on both floors
        seg = seg_w(wout, UB, uend, s)
        two_storey(seg, 0.0, seg.L, [t_of(seg, u, wout) for u in WING_BAYS], qa=False, qb=True)
        # the south end: two bays
        sg = seg_u(uend, min(win, wout), max(win, wout), 1)
        cs = [W_["c"] - s * 2.25, W_["c"] + s * 2.25]
        two_storey(sg, 0.0, sg.L, [t_of(sg, uend, c) for c in cs], qa=True, qb=True)
        # inner wall above the gallery's terrace: first-floor windows
        si = seg_w(win, UB, gend, -s)
        F = Facade(si, G_TOP, CORN)
        bands(F, lower=False)
        for u in WING_BAYS:
            cross_window(F, t_of(si, u, win), 1.5, FF[0], FF[2], FF[1])
        F.emit()
        # the inner strip beyond the gallery's end (full height)
        st = seg_w(win, gend, uend, -s)
        F = Facade(st, HB, CORN)
        bands(F)
        F.quoins(False, True, h0=103.8, h1=FRIEZE[0])
        F.emit()

def gallery():
    """the one-storey gallery round the courtyard (estimated openings: tall cross windows at the bays' rhythm)"""
    gw = {s: WINGS[s]["gal_w"] for s in (1, -1)}
    seg = seg_u(GU, gw[-1], gw[1], 1)
    ws = [s * (1.725 + 3.45 * k) for k in range(5) for s in (1, -1)]
    F = Facade(seg, HB, 108.85)
    bands(F, upper=False, gallery=True)
    for w in ws:
        cross_window(F, t_of(seg, GU, w), 1.5, GF[0], GF[2], GF[1])
        if abs(w) > 6: vent(F, t_of(seg, GU, w))        # (the courtyard's ground rises to 103.3 in the middle: DTM)
    F.emit()
    for s in (1, -1):
        gend = WINGS[s]["gal_end"]
        sg = seg_w(gw[s], GU, gend, -s)
        F = Facade(sg, HB, 108.85)
        bands(F, upper=False, gallery=True)
        for u in (24.0, 27.45, 30.9, 34.35):
            cross_window(F, t_of(sg, u, gw[s]), 1.5, GF[0], GF[2], GF[1]); vent(F, t_of(sg, u, gw[s]))
        F.emit()
        se = seg_u(gend, min(gw[s], WINGS[s]["win"]), max(gw[s], WINGS[s]["win"]), 1)
        F = Facade(se, HB, 108.85)
        bands(F, upper=False, gallery=True)
        F.emit()
    # the terrace (salmon tiles: the 2024 orthophoto) and its coping
    pts = [(UB, WINGS[-1]["win"]), (WINGS[-1]["gal_end"], WINGS[-1]["win"]), (WINGS[-1]["gal_end"], gw[-1]), (GU, gw[-1]),
           (GU, gw[1]), (WINGS[1]["gal_end"], gw[1]), (WINGS[1]["gal_end"], WINGS[1]["win"]), (UB, WINGS[1]["win"])]
    # the orthophoto: salmon tiles on the back and west strips, a grey (zinc) roof on the east strip
    wm = WINGS[-1]
    roof_face([(UB, wm["win"]), (GU, wm["win"]), (GU, gw[-1]), (GU, gw[1]), (WINGS[1]["gal_end"], gw[1]),
               (WINGS[1]["gal_end"], WINGS[1]["win"]), (UB, WINGS[1]["win"])], lambda u, w: G_TOP, TERR, C_PLAIN)
    roof_face([(GU, wm["win"]), (wm["gal_end"], wm["win"]), (wm["gal_end"], gw[-1]), (GU, gw[-1])], lambda u, w: G_TOP, ZINC, C_PLAIN)
    path = pts[1:-1]
    prof = [(0.0, -0.02), (0.08, -0.02), (0.08, 0.3), (-0.3, 0.4), (-0.3, 0.28)] if not XFAR() else [(0.0, 0.0), (0.06, 0.0), (0.06, 0.4), (-0.3, 0.4), (-0.3, 0.28)]
    sweep_at(path, 108.85, prof, SW, C_COPING, caps=True, probe=2, want=(1, 0))

# ------------------------------------------------------------------------------------------------ roofs
def lucarne(u_face, out, cheek_u, ridge_u):
    """a stone wall dormer (lucarne) on the eaves: a cross window, pilasters, a triangular pediment with an oculus and a
    finial; slate roof back to the main roof (front: on the avant-corps' hip; rear: on the back slope)"""
    seg = seg_u(u_face, -LW, LW, out)
    fr = seg.fr
    F = Facade(seg, EAVE, L_CHEEK, base=SW)
    cross_window(F, seg.L / 2, 1.3, 115.35, 117.3, 116.75, harp=False, sill=False)
    F.emit()
    ped = L_RIDGE + 0.2
    s0, s1 = sorted((seg.s(0.0), seg.s(seg.L)))
    sc = (s0 + s1) / 2
    tri = [(s0, hz(L_CHEEK)), (s1, hz(L_CHEEK)), (sc, hz(ped))]
    if XFAR():
        fill2d(fr, [tri], 0.0, SW, C_SCULPT)
    else:
        oc = circle(sc, hz(L_CHEEK) + 0.62, 0.24, 12 if not FAR() else 8)
        fill2d(fr, [tri, oc], 0.0, SW, C_SCULPT)
        strip2d(fr, oc, 0.0, -0.12, SW, C_SUR)
        fill2d(fr, [oc], -0.12, GLASS, C_PLAIN)
        # the raking cornices (closed over the slab behind) and the horizontal cornice
        prof = [(-0.3, -0.02), (0.12, -0.02), (0.14, 0.05), (0.14, 0.14), (-0.3, 0.16)]
        sweep2d(fr, [(s0 - 0.12, hz(L_CHEEK) + 0.04), (sc, hz(ped) + 0.04), (s1 + 0.12, hz(L_CHEEK) + 0.04)], prof, SW, C_CORN, caps=True); flat_group()
        fbox(fr, s0 - 0.1, s1 + 0.1, hz(L_CHEEK) - 0.14, hz(L_CHEEK) + 0.04, 0.0, 0.12, SW, C_CORN)
        for x in (s0 + 0.11, s1 - 0.11):                   # pilasters
            fbox(fr, x - 0.11, x + 0.11, hz(EAVE), hz(L_CHEEK) - 0.14, 0.0, 0.07, SW, C_SUR)
        # the finial
        c = fr.p(sc, hz(ped) + 0.18, 0.0)
        wbox(c, fr.U, fr.N, 0.12, 0.12, hz(ped) + 0.1, hz(ped) + 0.3, SW, C_SCULPT)
        if not FAR():
            SC.lathe(Vector((c.x, c.y, hz(ped) + 0.3)), [(0.1, 0.0), (0.13, 0.08), (0.1, 0.2), (0.04, 0.32), (0.0, 0.42)], 8, SW, C_SCULPT)
    # cheeks (stone) and roof
    sgn = 1 if out < 0 else -1                             # into the building along u
    for w in (-LW, LW):
        face_dir([P(u_face, w, EAVE), P(u_face, w, L_CHEEK), P(cheek_u, w, L_CHEEK)], Vector((0, -1 if w > 0 else 1, 0)), SW, C_PLAIN)
    for s in (1, -1):
        roof_face([(u_face, 0.0), (u_face, s * LW), (cheek_u, s * LW), (ridge_u, 0.0)], hL, SLATE)
    if not FAR(): ridge_cap(P(u_face + sgn * 0.25, 0.0, L_RIDGE + 0.02), P(ridge_u, 0.0, L_RIDGE + 0.02), w=0.09, h=0.06)

def roofs():
    # the main block
    roof_face([(UF, WN), (UF, -AW), (A_R1, 0.0), (UF, AW), (UF, WP), (RU, RWP), (RU, RWN)], hF)
    wi = {s: WINGS[s] for s in (1, -1)}
    back = [(RU, RWP), (UB, WP), (UB, wi[1]["wout"]), (U_V, wi[1]["c"]), (UB, wi[1]["win"]), (UB, LW), (R_UC, LW), (R_UR, 0.0),
            (R_UC, -LW), (UB, -LW), (UB, wi[-1]["win"]), (U_V, wi[-1]["c"]), (UB, wi[-1]["wout"]), (UB, WN), (RU, RWN)]
    roof_face(back, hB)
    roof_face([(UF, WP), (UB, WP), (RU, RWP)], hHP)
    roof_face([(UF, WN), (RU, RWN), (UB, WN)], hHN)
    # the avant-corps (front hip with the lucarne's notch, two side slopes into the main front slope)
    roof_face([(0.0, -AW), (0.0, -LW), (L_UC, -LW), (L_UR, 0.0), (L_UC, LW), (0.0, LW), (0.0, AW), (A_R0, 0.0)], hAF)
    roof_face([(0.0, AW), (A_R0, 0.0), (A_R1, 0.0), (UF, AW)], hAP)
    roof_face([(0.0, -AW), (UF, -AW), (A_R1, 0.0), (A_R0, 0.0)], hAN)
    lucarne(0.0, -1, L_UC, L_UR)
    lucarne(UB, 1, R_UC, R_UR)
    # the wings
    for s, W_ in WINGS.items():
        win, wout, uend, c, ur = W_["win"], W_["wout"], W_["uend"], W_["c"], W_["ur"]
        roof_face([(UB, win), (U_V, c), (ur, c), (uend, win)], hWin(s))
        roof_face([(UB, wout), (uend, wout), (ur, c), (U_V, c)], hWout(s))
        roof_face([(uend, win), (ur, c), (uend, wout)], hWhip(s))
    # ridge / hip rolls (zinc)
    if not XFAR():
        rc = lambda a, b: ridge_cap(P(a[0], a[1], a[2] + 0.03), P(b[0], b[1], b[2] + 0.03))
        def hip(a, b, stop=0.4):
            # a hip roll from the eave corner a up to the ridge end b, stopped short of b (the rolls met at ~7 deg)
            L = math.dist(a, b); f = 1 - stop / L
            rc(a, tuple(a[i] + (b[i] - a[i]) * f for i in range(3)))
        rc((RU, RWN, RIDGE), (RU, RWP, RIDGE))
        for (cu, cw) in ((UF, WP), (UB, WP)): hip((cu, cw, EAVE), (RU, RWP, RIDGE))
        for (cu, cw) in ((UF, WN), (UB, WN)): hip((cu, cw, EAVE), (RU, RWN, RIDGE))
        rc((A_R0, 0.0, A_RIDGE), (A_R1 - 0.6, 0.0, A_RIDGE))
        for w in (-AW, AW): hip((0.0, w, EAVE), (A_R0, 0.0, A_RIDGE))
        for s, W_ in WINGS.items():
            rc((U_V, W_["c"], W_RIDGE), (W_["ur"], W_["c"], W_RIDGE))
            for w in (W_["win"], W_["wout"]): hip((W_["uend"], w, EAVE), (W_["ur"], W_["c"], W_RIDGE))
    # the main cornice round the 115 m masses (one closed sweep, started mid-edge so the closing joint is straight)
    loop = [(0.0, 0.0), (0.0, AW), (UF, AW), (UF, WP), (UB, WP), (UB, WINGS[1]["wout"]), (WINGS[1]["uend"], WINGS[1]["wout"]),
            (WINGS[1]["uend"], WINGS[1]["win"]), (UB, WINGS[1]["win"]), (UB, WINGS[-1]["win"]), (WINGS[-1]["uend"], WINGS[-1]["win"]),
            (WINGS[-1]["uend"], WINGS[-1]["wout"]), (UB, WINGS[-1]["wout"]), (UB, WN), (UF, WN), (UF, -AW), (0.0, -AW), (0.0, 0.0)]
    prof = ([(0.0, 0.0), (0.08, 0.0), (0.08, 0.1), (0.16, 0.18), (0.16, 0.3), (0.34, 0.5), (0.4, 0.52), (0.4, 0.7), (0.0, 0.7)] if not FAR()
            else [(0.0, 0.0), (0.12, 0.0), (0.38, 0.48), (0.38, 0.7), (0.0, 0.7)])
    sweep_at(loop, CORN, prof, SW, C_CORN, closed=True, caps=False, probe=0, want=(-1, 0))

def outer_mouldings():
    """the string course (109.25) round the outer walls, the water table (103.55) round every wall but the perron"""
    if XFAR(): return
    W1, Wm = WINGS[1], WINGS[-1]
    pv1, pvm = PAV[1], PAV[-1]
    outer = [(W1["gal_end"], W1["win"]), (W1["uend"], W1["win"]), (W1["uend"], W1["wout"]), (UB, W1["wout"]), (UB, WP),
             (pv1["u1"], WP), (pv1["u1"], pv1["w1"]), (pv1["u0"], pv1["w1"]), (pv1["u0"], WP), (UF, WP), (UF, AW), (0.0, AW),
             (0.0, -AW), (UF, -AW), (UF, WN), (pvm["u0"], WN), (pvm["u0"], pvm["w1"]), (pvm["u1"], pvm["w1"]), (pvm["u1"], WN),
             (UB, WN), (UB, Wm["wout"]), (Wm["uend"], Wm["wout"]), (Wm["uend"], Wm["win"]), (Wm["gal_end"], Wm["win"])]
    i_front = outer.index((0.0, AW))
    prof = [(0.0, 0.0), (0.06, 0.0), (0.06, 0.2), (0.0, 0.3)]
    sweep_at(outer, 109.25, prof, SW, C_BAND, caps=True, probe=i_front, want=(-1, 0))
    gw1, gwm = W1["gal_w"], Wm["gal_w"]
    court = [(W1["gal_end"], W1["win"]), (W1["gal_end"], gw1), (GU, gw1), (GU, gwm), (Wm["gal_end"], gwm), (Wm["gal_end"], Wm["win"])]
    # the full footprint ring (outer path + courtyard), open at the perron
    left = outer[:i_front + 1]                       # gallery end (w > 0) ... (0, AW)
    right = outer[i_front + 1:]                      # (0, -AW) ... gallery end (w < 0)
    path = [(0.0, -1.3)] + right + court[::-1][1:-1] + left + [(0.0, 1.3)]
    wt = [(0.0, 0.0), (0.05, 0.0), (0.05, 0.13), (0.0, 0.25)]
    sweep_at(path, 103.55, wt, BS, C_PLINTH, caps=True, probe=0, want=(-1, 0))

def roof_furniture():
    # dormers on the front slope: the big lower row over the even bays, the small upper row over the odd ones (photo)
    for s in (1, -1):
        for k, b in enumerate(BAYS):
            if k in (1, 3, 5):
                dormer(hF, KM, (1, 0), s * b, UF + 0.35, 0.8, 116.65, 117.45, win=(0.9, 1.0))
            elif k in (0, 2, 4):
                dormer(hF, KM, (1, 0), s * b, 10.7, 0.42, 118.5, 118.95, win=(0.45, 0.5), ov=0.07)
    # the avant-corps' two small dormers beside the lucarne (photo)
    for s in (1, -1):
        dormer(hAF, KF, (1, 0), s * 4.0, 0.5, 0.5, 116.7, 117.3, win=(0.55, 0.75), ov=0.08)
    # wing outer slopes: a dormer over each bay (the orthophoto shows 4-5 a wing)
    for s, W_ in WINGS.items():
        for u in WING_BAYS:
            dormer(hWout(s), W_["k"], (0, -s), u, W_["wout"] - s * 0.35, 0.8, 116.65, 117.45, win=(0.9, 1.0))
    # skylights on the main back slope (5 white rectangles a side on the 2024 orthophoto; estimated sizes)
    if not XFAR():
        for s in (1, -1):
            for k in range(5):
                w = s * (3.0 + 3.45 * k)
                skylight(hB, 17.6, 18.8, w - 0.45, w + 0.45)
    for (u, w, base) in CHIMNEYS:
        chimney(u, w, base, CH_TOP, lvl_bands=(120.6,))
    lantern()
    if not FAR():                                          # downpipes at the front's inner and outer corners (estimated)
        for (u, w) in ((UF - 0.15, AW + 0.2), (UF - 0.15, -AW - 0.2), (UF - 0.15, WP - 0.25), (UF - 0.15, WN + 0.25)):
            rodc(P(u, w, GR - 0.2), P(u, w, CORN + 0.1), 0.05, ZINC, C_GUTTER, 8)

def skylight(hfun, u0, u1, w0, w1):
    K.B.new_group()
    lift, fr_ = 0.06, 0.06
    o = [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
    i = [(u0 + fr_, w0 + fr_), (u1 - fr_, w0 + fr_), (u1 - fr_, w1 - fr_), (u0 + fr_, w1 - fr_)]
    up = lambda u, w: P(u, w, hfun(u, w) + lift)
    dn = lambda u, w: P(u, w, hfun(u, w) - 0.03)
    face_dir([up(*p) for p in i], Z, GLASS, C_PLAIN)
    for k in range(4):
        a, b = o[k], o[(k + 1) % 4]; ia, ib = i[k], i[(k + 1) % 4]
        face_dir([up(*a), up(*b), up(*ib), up(*ia)], Z, ZINC, C_FRAME)
        c = Vector(((a[0] + b[0]) / 2 - (u0 + u1) / 2, -((a[1] + b[1]) / 2 - (w0 + w1) / 2), 0))
        face_dir([dn(*a), dn(*b), up(*b), up(*a)], c, ZINC, C_FRAME)

def lantern():
    """the roof lantern over the ridge (UrbIS 2.5 x 2.9 m, top 122.48): a louvred wooden body, a slate pyramid, an iron
    finial with a vane (the photo's spike)"""
    u, w, hu, hw, h0, h1, ap = LANT
    c = P(u, w, OY)
    ax, ay = Vector((1, 0, 0)), Vector((0, 1, 0))
    wbox(c, ax, ay, hu, hw, hz(h0), hz(h1), WOODW, C_PLAIN, skip=("bottom", "top"))
    if not XFAR():
        wbox(c, ax, ay, hu + 0.1, hw + 0.1, hz(h1), hz(h1 + 0.15), WOODW, C_CORN, skip=())
        # louvre panels on the four faces
        for N, half_s, d in ((Vector((1, 0, 0)), hw, hu), (Vector((-1, 0, 0)), hw, hu), (Vector((0, 1, 0)), hu, hw), (Vector((0, -1, 0)), hu, hw)):
            fr = SC.Frame(c + N * d, N)
            fbox(fr, -half_s + 0.25, half_s - 0.25, hz(120.95), hz(h1 - 0.15), 0.0, 0.02, WOODD, C_LOUVRE)
            if not FAR():
                for k in range(4):
                    v = hz(121.2) + k * 0.24
                    face_dir([fr.p(-half_s + 0.27, v, 0.1), fr.p(half_s - 0.27, v, 0.1), fr.p(half_s - 0.27, v - 0.18, 0.025), fr.p(-half_s + 0.27, v - 0.18, 0.025)],
                             N + Z, WOODW, C_LOUVRE)
    pyramid((u, w), hw + 0.22, h1 + 0.25, ap, SLATE, th=0.1, hu=hu + 0.22)
    if not FAR():
        rodc(P(u, w, ap - 0.1), P(u, w, ap + 0.95), 0.025, IRON, C_GILT)
        SC.lathe(P(u, w, ap + 0.35), [(0.0, 0.0), (0.07, 0.07), (0.0, 0.14)], 8, IRON, C_GILT)
        fr = SC.Frame(P(u, w, OY), Vector((0, 1, 0)))
        fbox(fr, 0.03, 0.55, hz(ap + 0.62), hz(ap + 0.85), -0.006, 0.006, IRON, C_GILT, skip=())

# ------------------------------------------------------------------------------------------------ build
def build_all():
    CA._LIT.seed(1899)                                 # the same windows lit on every level
    main_front(); avant_front(); avant_sides(); main_ends(); pavilions(); main_back(); wings(); gallery()
    roofs(); outer_mouldings(); roof_furniture()

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
    "new_slot_names": {"terrace_tiles": "the gallery's flat roof terrace (salmon on the 2024 orthophoto; not in the shared library: temporary material)"},
    "measured": {"frame": SITE["frame"], "footprint_osm": SITE["footprint_local"]["osm"], "solid_top": SITE["solid_top"]},
    "levels_taw": {"ground_front": GR, "floor": FL, "eaves": EAVE, "main_ridge": RIDGE, "avant_corps_ridge": A_RIDGE,
                   "lucarne": [L_CHEEK, L_RIDGE], "wing_ridge": W_RIDGE, "gallery_terrace": G_TOP, "pavilions": [PAV_EAVE, PAV_TOP],
                   "lantern": [LANT[4], LANT[5], LANT[6]], "chimneys": CH_TOP, "ground_floor": GF, "first_floor": FF},
    "estimated": "every opening of the side, back, wing and courtyard walls (not visible from public streets: the front's "
                 "rhythm and details repeated), the gallery's windows, the skylights, the wing dormers, the door's panelling, "
                 "the lantern's louvres, the wall depths; the front from photos (calibrated on the eaves and the ground, +-0.3 m)",
}
views = {"north": ((-62.0, 2.0, 104.0), (12.0, 0.0, 110.5), 26, (1400, 820)),
         "door": ((-16.0, 0.0, 104.2), (0.0, 0.0, 108.0), 30, (900, 1000)),
         "northwest": ((-30.0, 60.0, 112.0), (14.0, 5.0, 110.0), 24, (1300, 850)),
         "aerial": ((-55.0, -70.0, 165.0), (20.0, 0.0, 110.0), 26, (1300, 900)),
         "court": ((85.0, 10.0, 140.0), (25.0, 0.0, 110.0), 26, (1300, 900)),
         "pavilion": ((13.0, -60.0, 106.0), (13.0, -31.0, 108.5), 28, (1000, 900))}
cols = {"brick_red_brussels": (0.33, 0.10, 0.06), "stone_white": (0.62, 0.59, 0.52), "slate": (0.05, 0.055, 0.065),
        "zinc_roof": (0.25, 0.26, 0.27), "wood_frame_white": (0.8, 0.8, 0.78), "glass_window": (0.02, 0.025, 0.03),
        "cast_iron_green": (0.03, 0.03, 0.03), "stone_blue": (0.12, 0.13, 0.14), "wood_frame_dark": (0.05, 0.06, 0.05),
        "terrace_tiles": (0.45, 0.25, 0.18)}
CK.finish("latourdefrein", "LatourDeFrein", OUT, PREV, ARGS, SLOTS, [B0, B1, B2], G, _g, SITE, info, ao_px=2048, views=views,
          cols=cols, sun=(40, 140), t0=T0)
