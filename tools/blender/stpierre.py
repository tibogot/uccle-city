"""EGLISE SAINT-PIERRE D'UCCLE (Parvis Saint-Pierre, Uccle-Centre; neoclassical, J.-F. Wincqz 1778-1782 for the abbey of
Forest; facades embellished by J. Baes 1883-84; a fourth nave on the north side + annexes by G. C. Veraart 1938-1950;
restored by Arter 2013-14; protected 25 October 1938): built entirely in code (no hand modelling) from MEASURED data + photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stpierre.py -- models/stpierre [--no-bake] [--previews] [--fast]
      models/stpierre/stpierre.raw.glb  node "StPierre" (LOD0) + "StPierre_far" (the scripted far variant); one primitive
                                        per NAMED material slot (SLOTS)
      models/stpierre/stpierre_ao.png   ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      models/stpierre/stpierre.json     measurements, slots, codes, placement, counts
      docs/saint-pierre/preview_*.png   Cycles renders (--previews)

INPUT: models/stpierre/site.json + site_dtm.* (tools/stpierre_measure.py). Openings counted facade by facade on the photos
(data/raw/refs/saint-pierre/SOURCES.md): the west front + tower (inventory P02 frontal, Commons EmDee 10 / 11, Arter 2014,
the 1938 Veraart elevation), the south side (inventory P01), the north-west (inventory P03: the 1938-50 fourth nave). The
EAST end, the annexes, the north wall of the fourth nave and the porch's sides have no usable photo: estimated (stpierre.json
"estimated"), volumes from the DSM.

SWAPPABLE MATERIALS: no colour, no texture in the GLB. COLOR_0.r = per-face code / 16 + 1/32, COLOR_0.g = per-vertex AO
of the thin parts; TEXCOORD_0 = world metres per face; TEXCOORD_1 = the baked AO's lightmap UV (lighting only).
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                             sweep3d, face_dir, face_up, quad, circle, offset_loop, arc_pts, ccw, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stpierre")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "saint-pierre")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]

SLOTS = ["brick_red_brussels", "stone_white", "stone_blue", "slate", "copper_brown", "copper_patina", "zinc_roof",
         "wood_frame_dark", "glass_window", "cast_iron_green"]
BRICK, STONE, BLUE, SLATE, CUB, CUP, ZINC, WOOD, GLASS, IRON = range(10)
CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
         "gilt", "door", "dial", "quoin", "lead"]
(C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_DIAL,
 C_QUOIN, C_LEAD) = range(16)
FAR = lambda: K.FAR
HB = 48.4                       # walls go this far down (below every ground point of the site: DTM min 48.86)

# ------------------------------------------------------------------------------------------------ THE PLAN (measured + photos)
WC = -0.07                      # the axis: the 1782 front's central bay + the tower (footprint -4.20 / +4.06; DSM ridge -0.1..0)
G_FRONT = 49.85                 # the parvis at the front (DTM 49.74-49.85 before the portal)
# west front (inventory P02, frontal, 36 px/m at the front plane; ground + the DSM eaves / tower top fix the scale)
HALF = 9.78                     # half the front's width (footprint 19.56 m)
CB, SB = 4.13, 8.45             # central bay half-width; the side bays end where the corner piers begin
D_CORNER, D_SIDE, D_CENTRAL = 0.0, 0.3, 0.6         # the front's three planes (footprint: u 0 / -0.3 / -0.6)
PANEL_TOP = 59.56
PLINTH_TOP = 51.5               # c10: the brick panels start 1.2 m above the portal's threshold
ARCHI, FRIEZE, CORN_B, CORN_T = 59.81, 60.17, 60.42, 60.83      # the lower order's entablature (the roof's eave, DSM 59.46, lies lower: box gutter behind)
DOOR_W, DOOR_SILL, DOOR_TOP = 2.64, 50.3, 56.65                # the central portal (+ blue-stone piers, entablature, fanlight)
FAN_C, FAN_R = 56.65 + 0.87, 1.18
SDOOR_S, SDOOR_W, SDOOR_SILL, SDOOR_SPRING = 6.15, 1.53, 50.2, 55.04     # the side doors (round fanlights)
SWIN_W, SWIN_SILL, SWIN_TOP = 1.4, 58.01, 58.72                 # the side bays' small windows above
BAND = (57.19, 57.5)           # the stone band across the side bays' brick panels
UP_TOP, UP_CORN, ATTIC = 65.93, 66.34, 67.1                     # upper register: cornice, attic block (tower base)
UWIN = (1.18, 61.92, 63.76)     # its window: half-width, sill, head
AIL_OUT, AIL_LOW = 8.3, 61.85   # the ailerons' concave curves end on the urn pedestals
# the tower (P02 at the tower plane 35.2 px/m; c11; Arter 2014; DSM: centre u 3.2, dome ~79, UrbIS top 82.38)
TW_U = 3.25; TW_H = 3.05; TW_C = 0.85                            # centre, half across flats, the canted corners' cut
TW_STRING = (73.58, 73.88); TW_TOP = (75.06, 75.46)
BELFRY = (0.93, 69.86, 73.22)     # louvred openings: half-width, sill, head
DIAL_H, DIAL_R = 75.08, 1.08    # the west clock (the others smaller: wiki "the west clock is larger, with a drip mould")
DOME_TOP = 78.9                 # DSM: 79.4 at 0.75 m from the axis, the bulb's peak 81.7; UrbIS top 82.38
# the sides (P01 south, P03 north-west; footprint jogs): pilasters with urns at u 6.25-7.53 (south) / 5.9-6.4 (north)
WALL_S, WALL_N = 9.53, -9.8
BAY1 = (1.34, 6.25)
NAVE_U0, NAVE_BAY, NAVE_N = 7.53, 4.954, 5                     # 5 bays to u 32.3 (footprint)
SWIN = (0.76, 53.79, 57.92)      # the side windows: half-width, sill, springing (semicircular heads, r = half-width)
U_EAST = 40.3                   # the main block's east wall (DSM: the roof ends at u 40.3 for |w| > 6.3)
APSE = [(U_EAST, 6.3), (43.5, 2.6)]                             # three-sided apse (DSM roof outline)
RIDGE = 67.7                    # DSM ridge plateau u 7-40
EAVE_W, EAVE_H = 9.35, 59.3     # the roof's eave line behind the cornice
# the fourth nave (Veraart 1938-50, footprint + DSM: ridge 63.5 at w -12.4, valley -8.6 at 60.0 = a symmetric roof
# whose south half rests on the old roof)
N4 = dict(u0=5.9, u1=U_EAST, w_out=-17.3, ridge_w=-12.4, ridge=63.5, eave=59.0, corn=59.05)
# annexes (Veraart; DSM flat roofs at 53.9-54.1; footprint) and the south porch
ANNEX_TOP = 54.0
PORCH = dict(u0=17.81, u1=21.58, w1=12.33, corn=54.8)
SE_ANNEX = dict(u0=33.3, u1=40.58, w1=14.56)

def gnd(u, w): return G(u, w)
def frame_uw(u, w, nu, nw): return Frame(P(u, w, OY), Vector((nu, -nw, 0)))

# ------------------------------------------------------------------------------------------------ helpers
def arched(s0, s1, bottom, spring, n=14):
    """a round-arched opening: rectangle bottom..spring + a semicircular head (ccw loop)"""
    r = (s1 - s0) / 2; c = (s0 + s1) / 2
    return ccw([(s0, bottom), (s1, bottom)] + [(c + r * math.cos(math.pi * k / n), spring + r * math.sin(math.pi * k / n)) for k in range(n + 1)])

def arch_path(c, spring, r, n=14, legs=0.0):
    """the path round an arched opening's head (left -> right over the top), optionally down the jambs by `legs`"""
    pts = [(c + r * math.cos(math.pi - math.pi * k / n), spring + r * math.sin(math.pi - math.pi * k / n)) for k in range(n + 1)]
    if legs: pts = [(c - r, spring - legs)] + pts + [(c + r, spring - legs)]
    return pts

def slab2d(fr, loop, d0, d1, mat, code=C_PLAIN, holes=()):
    """a free-standing wall piece in the frame: front at d0, back at d1 (< d0), sides"""
    fill2d(fr, [loop] + list(holes), d0, mat, code)
    fill2d(fr, [loop] + list(holes), d1, mat, code, flip=True)
    strip2d(fr, loop, d0, d1, mat, code, inward=False)

def reveal(fr, loop, d0, depth, mat=STONE, code=C_SUR):
    strip2d(fr, loop, d0, d0 - depth, mat, code)

def moulding(fr, path, d0, prof, mat=STONE, code=C_SUR, caps=True):
    if FAR(): return
    sweep2d(fr, path, list(prof), mat, code, caps=caps, d0=d0)

PROF_ARCHI = ((0.0, -0.18), (0.035, -0.18), (0.035, -0.06), (0.06, -0.06), (0.06, 0.0), (0.0, 0.0))
PROF_SUR = ((0.0, 0.0), (0.04, 0.0), (0.06, 0.03), (0.06, 0.15), (0.03, 0.18), (0.0, 0.2))           # e = out from the opening
PROF_BAND = ((0.0, -0.15), (0.05, -0.15), (0.06, -0.12), (0.06, 0.0), (0.0, 0.02))

def cornice_run(fr, s0, s1, d, h_bot, h_top, proj=0.42, caps=True, archi=True):
    """the entablature along a wall: architrave (two fascias), frieze, a moulded cornice (cyma, corona, bed mould)"""
    if FAR():
        fbox(fr, s0 - proj * 0.6, s1 + proj * 0.6, hz(h_bot), hz(h_top), d, d + proj * 0.7, STONE, C_CORN, skip=())
        return
    H = h_top - h_bot
    # cornice profile (d = out, e = up from h_bot)
    prof = [(0.0, 0.0), (0.06, 0.0), (0.08, 0.05), (0.16, 0.08), (0.18, 0.12), (proj - 0.06, 0.16), (proj, 0.2), (proj, H * 0.72),
            (proj - 0.03, H * 0.8), (proj - 0.02, H * 0.9), (proj - 0.06, H), (0.0, H)]
    prof = [(dd, e) for dd, e in prof]
    path = [(s0 - proj, hz(h_bot)), (s1 + proj, hz(h_bot))]
    K.B.new_group()
    # swept along s at the cornice height: profile (out, up) -> sweep2d wants (depth, offset across the path = up)
    sweep2d(fr, path, [(dd, e) for dd, e in prof], STONE, C_CORN, caps=caps, d0=d)

def pilaster(fr, s0, s1, h0, h1, d, proud=0.06, mat=STONE, code=C_QUOIN):
    fbox(fr, s0, s1, hz(h0), hz(h1), d, d + proud, mat, code)

def urn(c, base_h, scale=1.0):
    """the 'pots a feu' (flaming urns) on the pedestals: pedestal block, a gadrooned urn, a flame finial (photos P01-P03)"""
    k = scale
    if FAR():
        lathe(Vector((c.x, c.y, hz(base_h))), [(0.42 * k, 0.0), (0.42 * k, 0.75 * k), (0.3 * k, 0.8 * k), (0.32 * k, 1.5 * k), (0.0, 1.9 * k)], 6, STONE, C_SCULPT)
        return
    b = Vector((c.x, c.y, hz(base_h)))
    # square plinth under the urn
    wbox(b, Vector((1, 0, 0)), Vector((0, 1, 0)), 0.36 * k, 0.36 * k, b.z, b.z + 0.12 * k, STONE, C_SCULPT)
    prof = [(0.0, 0.12), (0.17, 0.12), (0.17, 0.2), (0.12, 0.26), (0.11, 0.34), (0.2, 0.42), (0.3, 0.55), (0.34, 0.7), (0.34, 0.8),
            (0.3, 0.84), (0.33, 0.9), (0.33, 0.96), (0.24, 1.02), (0.16, 1.06), (0.2, 1.12), (0.17, 1.2), (0.1, 1.3), (0.13, 1.38),
            (0.08, 1.5), (0.04, 1.62), (0.0, 1.66)]
    prof = [(r * k, h * k) for r, h in prof]
    lathe(b, prof, 16, STONE, C_SCULPT)
    # gadroons on the belly: 12 ribs
    for j in range(12):
        a = 2 * math.pi * j / 12
        d = Vector((math.cos(a), math.sin(a), 0))
        p0 = b + d * 0.2 * k + Z * 0.44 * k; p1 = b + d * 0.335 * k + Z * 0.72 * k
        rod(p0, p1, 0.035 * k, STONE, C_SCULPT, segs=5)

# ------------------------------------------------------------------------------------------------ the west front
def front_frame(): return frame_uw(0.0, WC, -1, 0)          # s = w - WC (south to the right), d = west of u 0

def front_lower():
    fr = front_frame()
    S = lambda w: w - WC
    # --- the three planes + returns, plinth to the cornice --------------------------------------------------------------
    hb, ht = hz(HB), hz(CORN_B)
    # corner piers (d 0): s -HALF..-SB and SB..HALF (the footprint corners are at u 0)
    for sg in (-1, 1):
        a, b = sorted((sg * SB, sg * HALF))
        fill2d(fr, [rect(a, hb, b, ht)], D_CORNER, STONE, C_PLAIN)
        # the return from the side bay plane back to the corner plane
        x = sg * SB
        fbox(fr, min(x, x), max(x, x) + 0.0001, hb, ht, D_CORNER, D_SIDE, STONE, C_PLAIN, skip=("back", "front", "top", "bottom", "left" if sg > 0 else "right"))
    # side bays (d 0.3): brick panels with the doors + windows
    for sg in (-1, 1):
        c = sg * SDOOR_S
        a, b = sorted((sg * CB, sg * SB))
        door = arched(c - SDOOR_W / 2, c + SDOOR_W / 2, hz(SDOOR_SILL), hz(SDOOR_SPRING))
        win = rect(c - SWIN_W / 2, hz(SWIN_SILL), c + SWIN_W / 2, hz(SWIN_TOP))
        panel_lo = rect(c - 1.4, hz(PLINTH_TOP), c + 1.4, hz(BAND[0]))
        panel_hi = rect(c - 1.4, hz(BAND[1]), c + 1.4, hz(PANEL_TOP))
        # stone face with the panels as holes; the door cuts the plinth too (door hole joins the lower panel's hole)
        lo_hole = ccw([(c - 1.4, hz(PLINTH_TOP)), (c - SDOOR_W / 2, hz(PLINTH_TOP)), (c - SDOOR_W / 2, hz(SDOOR_SILL)), (c + SDOOR_W / 2, hz(SDOOR_SILL)),
                       (c + SDOOR_W / 2, hz(PLINTH_TOP)), (c + 1.4, hz(PLINTH_TOP)), (c + 1.4, hz(BAND[0])), (c - 1.4, hz(BAND[0]))])
        fill2d(fr, [rect(a, hb, b, ht), lo_hole, panel_hi], D_SIDE, STONE, C_PLAIN)
        # recessed brick panels (0.05 behind the stone)
        rd = D_SIDE - 0.05
        strip2d(fr, lo_hole, D_SIDE, rd, STONE, C_PLAIN); strip2d(fr, panel_hi, D_SIDE, rd, STONE, C_PLAIN)
        r_ = SDOOR_W / 2
        brick_lo = ccw([(c - 1.4, hz(PLINTH_TOP)), (c - r_, hz(PLINTH_TOP))] + [(c + r_ * math.cos(math.pi - math.pi * k / 14), hz(SDOOR_SPRING) + r_ * math.sin(math.pi - math.pi * k / 14)) for k in range(15)]
                       + [(c + r_, hz(PLINTH_TOP)), (c + 1.4, hz(PLINTH_TOP)), (c + 1.4, hz(BAND[0])), (c - 1.4, hz(BAND[0]))])
        fill2d(fr, [brick_lo], rd, BRICK, C_PLAIN)
        fill2d(fr, [panel_hi, win], rd, BRICK, C_PLAIN)
        side_door(fr, c, rd)
        small_window(fr, c, rd)
    # central bay (d 0.6): the portal
    a, b = -CB, CB
    door = rect(-DOOR_W / 2, hz(DOOR_SILL), DOOR_W / 2, hz(DOOR_TOP))
    fan = ccw([(-FAN_R, hz(FAN_C))] + [(FAN_R * math.cos(math.pi * k / 16), hz(FAN_C) + FAN_R * math.sin(math.pi * k / 16)) for k in range(17)])
    panel = ccw([(-2.6, hz(PLINTH_TOP)), (-DOOR_W / 2 - 0.62, hz(PLINTH_TOP)), (-DOOR_W / 2 - 0.62, hz(DOOR_SILL)), (DOOR_W / 2 + 0.62, hz(DOOR_SILL)),
                 (DOOR_W / 2 + 0.62, hz(PLINTH_TOP)), (2.6, hz(PLINTH_TOP)), (2.6, hz(PANEL_TOP)), (-2.6, hz(PANEL_TOP))])
    fill2d(fr, [rect(a, hb, b, ht), panel], D_CENTRAL, STONE, C_PLAIN)
    rd = D_CENTRAL - 0.05
    strip2d(fr, panel, D_CENTRAL, rd, STONE, C_PLAIN)
    R_ = FAN_R + 0.37; pe = DOOR_W / 2 + 0.62
    brick_c = ccw([(-2.6, hz(PLINTH_TOP)), (-pe, hz(PLINTH_TOP)), (-pe, hz(FAN_C)), (-R_, hz(FAN_C))]
                  + [(R_ * math.cos(math.pi - math.pi * k / 18), hz(FAN_C) + R_ * math.sin(math.pi - math.pi * k / 18)) for k in range(1, 18)]
                  + [(R_, hz(FAN_C)), (pe, hz(FAN_C)), (pe, hz(PLINTH_TOP)), (2.6, hz(PLINTH_TOP)), (2.6, hz(PANEL_TOP)), (-2.6, hz(PANEL_TOP))])
    fill2d(fr, [brick_c], rd, BRICK, C_PLAIN)
    portal(fr, rd)
    # returns between the central and the side planes
    for sg in (-1, 1):
        fbox(fr, sg * CB - 0.0001, sg * CB + 0.0001, hb, ht, D_SIDE, D_CENTRAL, STONE, C_PLAIN, skip=("back", "front", "top", "bottom", "left" if sg > 0 else "right"))
    # --- plinth (Gobertange: a proud band to 51.27 with a chamfered top) ----------------------------------------------
    for (s0, s1, d) in ((-HALF, -SB, D_CORNER), (SB, HALF, D_CORNER), (-SB, -CB, D_SIDE), (CB, SB, D_SIDE), (-CB, CB, D_CENTRAL)):
        segs = [(s0, s1)]
        cut = []
        if d == D_SIDE: c = SDOOR_S if s0 > 0 else -SDOOR_S; cut = [(c - SDOOR_W / 2 - 0.2, c + SDOOR_W / 2 + 0.2)]
        if d == D_CENTRAL: cut = [(-DOOR_W / 2 - 0.62, DOOR_W / 2 + 0.62)]
        for (c0, c1) in cut:
            segs = [(s0, c0), (c1, s1)]
        for (a, b) in segs:
            if FAR(): fbox(fr, a, b, hb, hz(PLINTH_TOP), d, d + 0.05, STONE, C_PLINTH); continue
            sweep2d(fr, [(a, hz(PLINTH_TOP)), (b, hz(PLINTH_TOP))], [(0.06, -(PLINTH_TOP - HB)), (0.06, -0.06), (0.0, 0.0)], STONE, C_PLINTH, d0=d)
    # --- the entablature over the three planes (architrave + frieze + cornice) -----------------------------------------
    for (s0, s1, d) in ((-HALF, -SB, D_CORNER), (SB, HALF, D_CORNER), (-SB, -CB, D_SIDE), (CB, SB, D_SIDE), (-CB, CB, D_CENTRAL)):
        if not FAR():
            fbox(fr, s0, s1, hz(ARCHI), hz(ARCHI + 0.17), d, d + 0.035, STONE, C_CORN, skip=("back",))
            fbox(fr, s0, s1, hz(ARCHI + 0.17), hz(FRIEZE), d, d + 0.06, STONE, C_CORN, skip=("back",))
        cornice_run(fr, s0, s1, d, CORN_B, CORN_T, proj=0.42, caps=True)
    # the side elevations' first metres: the corner piers return along the sides (u 0..1.34) as part of side walls
    # --- the steps (blue stone): three before the portal, two before the side doors ------------------------------------
    for (c, half, sill, n) in ((0.0, DOOR_W / 2 + 0.9, DOOR_SILL, 3), (-SDOOR_S, 1.05, SDOOR_SILL, 2), (SDOOR_S, 1.05, SDOOR_SILL, 2)):
        d0 = D_CENTRAL if c == 0 else D_SIDE
        g = G_FRONT - 0.05
        rise = (sill - g) / n
        for k in range(n):
            top = sill - k * rise
            fbox(fr, c - half - k * 0.12, c + half + k * 0.12, hz(HB + 1.0), hz(top), d0, d0 + 0.34 * (k + 1), BLUE, C_SILL, skip=("back",))

def portal(fr, d):
    """the main portal (Baes 1884, photos P02, c10): blue-stone piers ending in triglyph blocks with guttae, an entablature,
    a semicircular fanlight with a radiating fan under a blue-stone archivolt on imposts; two panelled leaves"""
    w2 = DOOR_W / 2
    door = rect(-w2, hz(DOOR_SILL), w2, hz(DOOR_TOP))
    if FAR():
        fill2d(fr, [rect(-w2 - 0.62, hz(DOOR_SILL), w2 + 0.62, hz(DOOR_TOP + 0.78))] , d + 0.06, BLUE, C_SUR)
        fill2d(fr, [door], d - 0.35, WOOD, C_DOOR)
        fill2d(fr, [circle(0.0, hz(FAN_C), FAN_R + 0.37, 12)], d + 0.02, BLUE, C_SUR)
        return
    # piers (proud 0.12) with a panel sunk in, capitals = triglyph blocks
    for sg in (-1, 1):
        a, b = sorted((sg * w2, sg * (w2 + 0.62)))
        fbox(fr, a, b, hz(DOOR_SILL), hz(DOOR_TOP), d, d + 0.14, BLUE, C_SUR)
        fbox(fr, a + 0.1, b - 0.1, hz(DOOR_SILL + 0.5), hz(DOOR_TOP - 0.35), d + 0.14, d + 0.15, BLUE, C_SUR)        # raised panel
        # triglyph block: three vertical bars + guttae
        fbox(fr, a - 0.03, b + 0.03, hz(DOOR_TOP), hz(DOOR_TOP + 0.65), d, d + 0.2, BLUE, C_SUR)
        for j in range(3):
            x = a + 0.1 + j * 0.22
            fbox(fr, x, x + 0.12, hz(DOOR_TOP + 0.1), hz(DOOR_TOP + 0.6), d + 0.2, d + 0.24, BLUE, C_SUR)
            for gg in range(2):
                lathe_axis(fr.p(x + 0.03 + gg * 0.06, hz(DOOR_TOP + 0.05), d + 0.2), Z * -1, fr.U, [(0.0, 0.0), (0.025, 0.0), (0.02, 0.05), (0.0, 0.05)], 6, BLUE, C_SUR)
    # the lintel / entablature across the door (between the triglyphs) and its cornice
    fbox(fr, -w2, w2, hz(DOOR_TOP), hz(DOOR_TOP + 0.65), d, d + 0.12, BLUE, C_SUR)
    sweep2d(fr, [(-w2 - 0.72, hz(DOOR_TOP + 0.65)), (w2 + 0.72, hz(DOOR_TOP + 0.65))], [(0.0, 0.0), (0.26, 0.0), (0.3, 0.06), (0.3, 0.12), (0.22, 0.2), (0.0, 0.22)], BLUE, C_SUR, d0=d)
    # the fanlight: reveal, the radiating fan (wood), glass behind; archivolt (blue stone) round it
    fan = ccw([(-FAN_R, hz(FAN_C))] + [(FAN_R * math.cos(math.pi * k / 18), hz(FAN_C) + FAN_R * math.sin(math.pi * k / 18)) for k in range(19)])
    fill2d(fr, [ccw([(-FAN_R - 0.37, hz(FAN_C))] + [((FAN_R + 0.37) * math.cos(math.pi * k / 18), hz(FAN_C) + (FAN_R + 0.37) * math.sin(math.pi * k / 18)) for k in range(19)]), fan], d + 0.1, BLUE, C_SUR)
    strip2d(fr, [(x, y) for x, y in arc_pts(0.0, hz(FAN_C), FAN_R + 0.37, 0.0, math.pi, 18)] + [(-FAN_R - 0.37, hz(FAN_C) - 0.001)], d + 0.1, d, BLUE, C_SUR, inward=False)
    moulding(fr, arch_path(0.0, hz(FAN_C), FAN_R + 0.37, 18), d + 0.1, ((0.0, 0.0), (0.03, 0.0), (0.05, 0.03), (0.05, 0.08), (0.0, 0.1)), BLUE, C_SUR, caps=True)
    # keystone
    fbox(fr, -0.18, 0.18, hz(FAN_C + FAN_R - 0.05), hz(FAN_C + FAN_R + 0.5), d + 0.1, d + 0.18, BLUE, C_SUR, skip=("back",))
    reveal(fr, fan, d, 0.35, BLUE, C_SUR)
    fill2d(fr, [fan], d - 0.3, GLASS, C_LEAD)
    # the fan: a hub + 11 spokes + an inner ring (wood, painted)
    hub = [(0.22 * math.cos(math.pi * k / 10), hz(FAN_C) + 0.22 * math.sin(math.pi * k / 10)) for k in range(11)]
    fill2d(fr, [ccw([(-0.22, hz(FAN_C))] + hub)], d - 0.24, WOOD, C_DOOR)
    for k in range(1, 12):
        a = math.pi * k / 12
        bar(fr, (0.2 * math.cos(a), hz(FAN_C) + 0.2 * math.sin(a)), ((FAN_R - 0.02) * math.cos(a), hz(FAN_C) + (FAN_R - 0.02) * math.sin(a)), d - 0.28, 0.035, 0.04, WOOD, C_DOOR)
    sweep2d(fr, arch_path(0.0, hz(FAN_C), 0.75, 16), [(0.0, -0.02), (0.04, -0.02), (0.04, 0.02), (0.0, 0.02)], WOOD, C_DOOR, d0=d - 0.28)
    # door reveal + two panelled leaves (dark varnished oak: photos)
    reveal(fr, door, d, 0.4, BLUE, C_SUR)
    door_leaves(fr, -w2, w2, hz(DOOR_SILL), hz(DOOR_TOP), d - 0.4, 2)

def door_leaves(fr, a, b, v0, v1, d, n, transom=None):
    """panelled leaves (stiles, rails, raised panels) at depth d"""
    if FAR():
        fill2d(fr, [rect(a, v0, b, v1)], d, WOOD, C_DOOR); return
    fill2d(fr, [rect(a, v0, b, v1)], d, WOOD, C_DOOR)
    lw = (b - a) / n
    for k in range(n):
        x0, x1 = a + k * lw, a + (k + 1) * lw
        # stiles and rails as a frame proud 0.03; panels 2 x 3
        fbox(fr, x0 + 0.005, x0 + 0.1, v0, v1, d, d + 0.035, WOOD, C_DOOR)
        fbox(fr, x1 - 0.1, x1 - 0.005, v0, v1, d, d + 0.035, WOOD, C_DOOR)
        rows = 3 if v1 - v0 > 3.5 else 2
        ph = (v1 - v0 - 0.1 * (rows + 1)) / rows
        for r in range(rows + 1):
            y = v0 + r * (ph + 0.1)
            fbox(fr, x0 + 0.1, x1 - 0.1, y, y + 0.1, d, d + 0.035, WOOD, C_DOOR)
        for r in range(rows):
            y = v0 + 0.1 + r * (ph + 0.1)
            fbox(fr, x0 + 0.17, x1 - 0.17, y + 0.07, y + ph - 0.07, d, d + 0.02, WOOD, C_DOOR)
    if n == 2:
        fbox(fr, (a + b) / 2 - 0.015, (a + b) / 2 + 0.015, v0, v1, d + 0.035, d + 0.05, WOOD, C_DOOR)

def side_door(fr, c, d):
    """a side door (photos P02, c10): blue-stone surround with a round head on imposts, a keystone, a radiating fanlight,
    a boarded leaf"""
    r = SDOOR_W / 2
    hole = arched(c - r, c + r, hz(SDOOR_SILL), hz(SDOOR_SPRING))
    if FAR():
        fill2d(fr, [arched(c - r - 0.2, c + r + 0.2, hz(SDOOR_SILL), hz(SDOOR_SPRING)), hole], d + 0.05, BLUE, C_SUR)
        fill2d(fr, [hole], d - 0.3, WOOD, C_DOOR); return
    # surround: a band 0.2 wide, proud 0.07, following jambs + arch
    path = [(c - r, hz(SDOOR_SILL))] + arch_path(c, hz(SDOOR_SPRING), r, 14) + [(c + r, hz(SDOOR_SILL))]
    sweep2d(fr, path, [(0.0, 0.0), (0.05, 0.0), (0.07, 0.03), (0.07, 0.17), (0.04, 0.2), (0.0, 0.2)], BLUE, C_SUR, d0=d)
    for sg in (-1, 1):            # impost blocks
        fbox(fr, min(c + sg * r, c + sg * (r + 0.26)), max(c + sg * r, c + sg * (r + 0.26)), hz(SDOOR_SPRING - 0.12), hz(SDOOR_SPRING + 0.04), d, d + 0.1, BLUE, C_SUR)
    fbox(fr, c - 0.13, c + 0.13, hz(SDOOR_SPRING + r - 0.05), hz(SDOOR_SPRING + r + 0.28), d, d + 0.1, BLUE, C_SUR, skip=("back",))
    reveal(fr, hole, d, 0.35, BLUE, C_SUR)
    fan = ccw([(c - r, hz(SDOOR_SPRING))] + [(c + r * math.cos(math.pi * k / 14), hz(SDOOR_SPRING) + r * math.sin(math.pi * k / 14)) for k in range(15)])
    fill2d(fr, [fan], d - 0.3, GLASS, C_LEAD)
    for k in range(1, 8):
        a = math.pi * k / 8
        bar(fr, (c + 0.1 * math.cos(a), hz(SDOOR_SPRING) + 0.1 * math.sin(a)), (c + (r - 0.02) * math.cos(a), hz(SDOOR_SPRING) + (r - 0.02) * math.sin(a)), d - 0.27, 0.03, 0.03, WOOD, C_DOOR)
    fbox(fr, c - r, c + r, hz(SDOOR_SPRING) - 0.06, hz(SDOOR_SPRING) + 0.02, d - 0.3, d - 0.24, WOOD, C_DOOR)       # transom
    door_leaves(fr, c - r, c + r, hz(SDOOR_SILL), hz(SDOOR_SPRING) - 0.06, d - 0.3, 2)

def small_window(fr, c, d):
    """the side bays' upper windows: a moulded white-stone frame with guttae (wiki), a leaded light"""
    w2 = SWIN_W / 2
    hole = rect(c - w2, hz(SWIN_SILL), c + w2, hz(SWIN_TOP))
    reveal(fr, hole, d, 0.3, STONE, C_SUR)
    fill2d(fr, [hole], d - 0.22, GLASS, C_LEAD)
    if FAR(): return
    sur = offset_loop(hole, 0.2)
    fill2d(fr, [sur, hole], d + 0.06, STONE, C_SUR); strip2d(fr, sur, d + 0.06, d, STONE, C_SUR, inward=False)
    strip2d(fr, hole, d + 0.06, d, STONE, C_SUR)
    moulding(fr, [(c - w2 - 0.2, hz(SWIN_SILL) - 0.2), (c - w2 - 0.2, hz(SWIN_TOP) + 0.2), (c + w2 + 0.2, hz(SWIN_TOP) + 0.2), (c + w2 + 0.2, hz(SWIN_SILL) - 0.2)],
             d + 0.06, ((0.0, 0.0), (0.03, 0.0), (0.03, 0.04), (0.0, 0.06)), STONE, C_SUR)
    fbox(fr, c - w2 - 0.25, c + w2 + 0.25, hz(SWIN_SILL) - 0.32, hz(SWIN_SILL) - 0.2, d, d + 0.14, STONE, C_SILL, skip=())
    for k in range(6):          # guttae under the sill
        x = c - 0.5 + k * 0.2
        lathe_axis(fr.p(x, hz(SWIN_SILL) - 0.32, d + 0.08), Z * -1, fr.U, [(0.0, 0.0), (0.03, 0.0), (0.024, 0.06), (0.0, 0.06)], 6, STONE, C_SUR)
    for k in (1, 2):            # leaded glazing bars
        x = c - w2 + SWIN_W * k / 3
        bar(fr, (x, hz(SWIN_SILL)), (x, hz(SWIN_TOP)), d - 0.21, 0.03, 0.02, IRON, C_PLAIN)

def front_upper():
    """above the cornice: the urn pedestals on the corner piers, the upper register (central bay) with its window and
    the cartouche, the concave ailerons, the upper cornice and the attic block (the tower's base)"""
    fr = front_frame()
    d = D_CENTRAL - 0.15                      # the upper register stands back from the lower central bay
    tk = 1.1                                  # wall thickness (back face visible above the roofs)
    # upper register: stone face with a brick panel + the window
    win = rect(-UWIN[0], hz(UWIN[1]), UWIN[0], hz(UWIN[2]))
    panel = rect(-2.5, hz(61.85), 2.5, hz(65.22))
    out = rect(-CB, hz(CORN_T - 0.02), CB, hz(UP_TOP))
    fill2d(fr, [out, panel], d, STONE, C_PLAIN)
    strip2d(fr, panel, d, d - 0.05, STONE, C_PLAIN)
    fill2d(fr, [panel, win], d - 0.05, BRICK, C_PLAIN)
    for sg in (-1, 1):
        fill2d(fr, [rect(min(sg * CB, sg * 4.13), hz(CORN_T - 0.02), max(sg * CB, sg * 4.13) + 0.0, hz(UP_TOP))], d, STONE, C_PLAIN) if False else None
    # the sides of the upper register (seen from the north / south above the ailerons) and its back
    for sg in (-1, 1):
        a = sg * CB
        quad(fr.p(a, hz(CORN_T), d), fr.p(a, hz(CORN_T), d - tk), fr.p(a, hz(UP_TOP), d - tk), fr.p(a, hz(UP_TOP), d), STONE, C_PLAIN) if sg < 0 else \
            quad(fr.p(a, hz(CORN_T), d - tk), fr.p(a, hz(CORN_T), d), fr.p(a, hz(UP_TOP), d), fr.p(a, hz(UP_TOP), d - tk), STONE, C_PLAIN)
    fill2d(fr, [out], d - tk, STONE, C_PLAIN, flip=True)
    # its window: blue-stone frame (eared), reveal, leaded glass with a grid of bars (P02)
    reveal(fr, win, d - 0.05, 0.35, STONE, C_SUR)
    fill2d(fr, [win], d - 0.3, GLASS, C_LEAD)
    if not FAR():
        sur = offset_loop(win, 0.22)
        fill2d(fr, [sur, win], d + 0.03, BLUE, C_SUR); strip2d(fr, sur, d + 0.03, d - 0.05, BLUE, C_SUR, inward=False)
        strip2d(fr, win, d + 0.03, d - 0.05, BLUE, C_SUR)
        for sg in (-1, 1):       # ears at the top corners
            fbox(fr, min(sg * (UWIN[0] + 0.22), sg * (UWIN[0] + 0.34)), max(sg * (UWIN[0] + 0.22), sg * (UWIN[0] + 0.34)), hz(UWIN[2] + 0.02), hz(UWIN[2] + 0.22), d - 0.05, d + 0.03, BLUE, C_SUR)
        sweep2d(fr, [(-UWIN[0] - 0.42, hz(UWIN[2] + 0.22)), (UWIN[0] + 0.42, hz(UWIN[2] + 0.22))], [(0.0, 0.0), (0.12, 0.0), (0.16, 0.05), (0.16, 0.12), (0.0, 0.15)], BLUE, C_SUR, d0=d)
        fbox(fr, -UWIN[0] - 0.3, UWIN[0] + 0.3, hz(UWIN[1]) - 0.14, hz(UWIN[1]), d - 0.05, d + 0.12, BLUE, C_SILL, skip=())
        for k in range(1, 4):
            x = -UWIN[0] + 2 * UWIN[0] * k / 4
            bar(fr, (x, hz(UWIN[1])), (x, hz(UWIN[2])), d - 0.28, 0.035, 0.03, IRON, C_PLAIN)
        for k in range(1, 3):
            y = hz(UWIN[1]) + (UWIN[2] - UWIN[1]) * k / 3
            bar(fr, (-UWIN[0], y), (UWIN[0], y), d - 0.28, 0.035, 0.03, IRON, C_PLAIN)
        # the cartouche (an escutcheon on a scrolled shield; P02, c11)
        fbox(fr, -0.36, 0.36, hz(64.78), hz(65.73), d, d + 0.08, STONE, C_SCULPT)
        lathe_axis(fr.p(0.0, hz(65.25), d + 0.08), fr.N, fr.U, [(0.26, 0.0), (0.26, 0.04), (0.2, 0.08), (0.0, 0.1)], 12, STONE, C_SCULPT)
        # flat pilaster strips at the register's edges (P02: lighter dressed stone)
        for sg in (-1, 1):
            pilaster(fr, min(sg * 3.3, sg * CB), max(sg * 3.3, sg * CB), CORN_T, UP_TOP - 0.25, d, 0.05)
    # the upper cornice + the attic block
    cornice_run(fr, -CB, CB, d, UP_TOP, UP_CORN, proj=0.36)
    attic = rect(-CB + 0.15, hz(UP_CORN), CB - 0.15, hz(ATTIC))
    slab2d(fr, attic, d - 0.05, d - tk - 4.0, STONE, C_PLAIN)
    if not FAR():
        sweep2d(fr, [(-CB + 0.05, hz(ATTIC)), (CB - 0.05, hz(ATTIC))], [(0.0, -0.1), (0.1, -0.06), (0.12, 0.0), (0.0, 0.03)], STONE, C_CORN, d0=d - 0.05)
    # --- the ailerons: concave quarter-ellipses from the register's edge (64.45) down to the urn pedestals (60.45) --------
    da = D_SIDE - 0.1
    for sg in (-1, 1):
        n = 6 if FAR() else 18
        curve = [(sg * (AIL_OUT + (AIL_OUT - CB) * math.cos(math.pi + 0.5 * math.pi * k / n) * 1.0 - 0.0), 0.0) for k in range(n + 1)]
        curve = [(sg * (AIL_OUT + (AIL_OUT - CB) * math.cos(math.pi + 0.5 * math.pi * k / n)), hz(UP_TOP - 0.1) + (UP_TOP - 0.1 - AIL_LOW) * math.sin(math.pi + 0.5 * math.pi * k / n)) for k in range(n + 1)]
        loop = ccw([(sg * CB, hz(CORN_T - 0.02))] + curve + [(sg * AIL_OUT, hz(CORN_T - 0.02))])
        inner = ccw([(sg * (CB + 0.35), hz(CORN_T + 0.25))] + [(sg * (AIL_OUT + (AIL_OUT - CB - 0.35) * math.cos(math.pi + 0.5 * math.pi * k / n)), hz(UP_TOP - 0.45) + (UP_TOP - 0.45 - AIL_LOW - 0.3) * math.sin(math.pi + 0.5 * math.pi * k / n)) for k in range(n + 1)][:-1]
                     + [(sg * (AIL_OUT - 0.35), hz(CORN_T + 0.25))])
        if FAR():
            slab2d(fr, loop, da, da - 0.6, BRICK, C_PLAIN)
        else:
            fill2d(fr, [loop, inner], da, STONE, C_PLAIN)
            fill2d(fr, [inner], da - 0.04, BRICK, C_PLAIN); strip2d(fr, inner, da, da - 0.04, STONE, C_PLAIN)
            fill2d(fr, [loop], da - 0.6, BRICK, C_PLAIN, flip=True)
            strip2d(fr, loop, da, da - 0.6, STONE, C_COPING, inward=False)
            # the moulded coping along the curve (a rounded roll with a fillet)
            sweep2d(fr, curve, [(0.0, 0.0), (0.08, 0.0), (0.1, 0.05), (0.1, 0.16), (0.06, 0.2), (-0.62, 0.2), (-0.62, 0.0)][::-1] if sg < 0 else [(0.0, 0.0), (0.08, 0.0), (0.1, 0.05), (0.1, 0.16), (0.06, 0.2), (-0.62, 0.2), (-0.62, 0.0)],
                    STONE, C_COPING, d0=da)
            # a scroll (volute) where the curve meets the pedestal
            lathe_axis(fr.p(sg * (AIL_OUT - 0.25), hz(AIL_LOW + 0.3), da - 0.62), fr.N, Z, [(0.0, 0.0), (0.24, 0.0), (0.27, 0.05), (0.27, 0.66), (0.24, 0.72), (0.0, 0.72)], 14, STONE, C_SCULPT)
    # --- the urn pedestals on the corner piers + the urns -------------------------------------------------------------------
    for sg in (-1, 1):
        s = sg * (HALF - 0.6)
        b0 = hz(CORN_T)
        fbox(fr, s - 0.5, s + 0.5, b0, b0 + 0.85, D_CORNER + 0.02, D_CORNER - 1.0, STONE, C_PLAIN, skip=())
        if not FAR():
            sweep3d([fr.p(s - 0.55, b0 + 0.85, D_CORNER + 0.07), fr.p(s + 0.55, b0 + 0.85, D_CORNER + 0.07)], [(0.0, 0.0), (0.0, 0.06), (1.1, 0.06), (1.1, 0.0)], Z, STONE, C_CORN)
        urn(fr.p(s, 0.0, D_CORNER - 0.48), CORN_T + 0.91)

# ------------------------------------------------------------------------------------------------ the tower
def oct_pts(c, R, cut):
    """the tower's plan (Blender, CCW seen from above): a square of half-width R with the corners cut by `cut`"""
    a = R - cut
    pts = [(R, -a), (R, a), (a, R), (-a, R), (-R, a), (-R, -a), (-a, -R), (a, -R)]
    return [Vector((c.x + x, c.y + y, 0)) for x, y in pts]

def tower():
    c = P(TW_U, WC, OY); c.z = 0
    R, cut = TW_H, TW_C
    base = oct_pts(c, R, cut)
    # faces: the 8 sides of the octagon, ATTIC -> TW_TOP[0]; main faces (W, S, E, N) carry the belfry openings + dials
    for i in range(8):
        a, b = base[i], base[(i + 1) % 8]
        mid = (a + b) / 2; t = (b - a).normalized(); out = t.cross(Z).normalized()
        if out.dot(mid - c) < 0: out = -out
        fr = Frame(mid, out)
        L = (b - a).length / 2
        main = L > 1.0
        holes = []
        if main:
            holes.append(rect(-BELFRY[0], hz(BELFRY[1]), BELFRY[0], hz(BELFRY[2])))
            if abs(out.x + 1) < 0.01:       # the west face: a slit window under the belfry (P02)
                holes.append(rect(-0.12, hz(67.46), 0.12, hz(67.82)))
        fill2d(fr, [rect(-L, hz(ATTIC - 3.4), L, hz(TW_TOP[0]))] + holes, 0.0, BRICK, C_PLAIN)       # down into the roof (it falls to 64.9 at the tower's sides)
        # quoins (long and short) at both vertical edges of every face
        if not FAR():
            for sg in (-1, 1):
                v = hz(ATTIC); k = 0
                while v < hz(TW_STRING[0]) - 0.05:
                    h = min(0.3, hz(TW_STRING[0]) - v); Lq = (0.42, 0.24)[k % 2] if main else (0.3, 0.18)[k % 2]
                    x0 = sg * L; x1 = sg * (L - Lq)
                    fbox(fr, min(x0, x1), max(x0, x1), v + 0.005, v + h - 0.005, 0.0, 0.02, STONE, C_QUOIN)
                    v += h; k += 1
                v = hz(TW_STRING[1])
                while v < hz(TW_TOP[0]) - 0.05:
                    h = min(0.3, hz(TW_TOP[0]) - v); Lq = (0.36, 0.22)[k % 2]
                    x0 = sg * L; x1 = sg * (L - min(Lq, L * 0.45))
                    fbox(fr, min(x0, x1), max(x0, x1), v + 0.005, v + h - 0.005, 0.0, 0.02, STONE, C_QUOIN)
                    v += h; k += 1
        if main:
            belfry_opening(fr)
            west = abs(out.x + 1) < 0.01
            dial(fr, DIAL_R if west else 0.82, west)
            if west and not FAR():
                reveal(fr, holes[1], 0.0, 0.3, STONE, C_SUR); fill2d(fr, [holes[1]], -0.25, GLASS, C_PLAIN)
    # string course + top cornice (closed sweeps round the octagon), the base moulding on the attic
    ring = lambda R_, h: [Vector((p.x, p.y, hz(h))) for p in oct_pts(c, R_, cut * R_ / R)]
    def band(h, prof):
        pts = ring(R, h); pts.append(pts[0])
        sweep3d(pts, prof, Z, STONE, C_CORN, closed=True, caps=False)
    if FAR():
        band(TW_STRING[0], [(0.0, 0.0), (0.12, 0.0), (0.12, 0.3), (0.0, 0.3)])
        band(TW_TOP[0], [(0.0, 0.0), (0.3, 0.0), (0.3, 0.4), (0.0, 0.4)])
    else:
        band(ATTIC - 0.3, [(0.0, 0.0), (0.08, 0.0), (0.1, 0.06), (0.1, 0.2), (0.06, 0.26), (0.0, 0.3)])
        band(TW_STRING[0], [(0.0, 0.0), (0.04, 0.0), (0.06, 0.04), (0.13, 0.1), (0.15, 0.2), (0.15, 0.26), (0.0, 0.3)])
        band(TW_TOP[0], [(0.0, 0.0), (0.06, 0.0), (0.09, 0.05), (0.18, 0.1), (0.2, 0.16), (0.33, 0.24), (0.36, 0.3), (0.36, 0.36), (0.3, 0.4), (0.0, 0.4)])
    # top of the cornice: the flat (lead) ring under the dome
    top = ring(R + 0.36, TW_TOP[1]); inner = ring(R - 0.15, TW_TOP[1])
    K.B.new_group()
    for i in range(8):
        quad(top[i], top[(i + 1) % 8], inner[(i + 1) % 8], inner[i], ZINC, C_GUTTER) if False else face_dir([top[i], top[(i + 1) % 8], inner[(i + 1) % 8], inner[i]], Z, CUB, C_PLAIN)
    dome(c)

def belfry_opening(fr):
    """a louvred belfry opening (abat-son) with a blue-stone frame and sill (wiki; P02, c11)"""
    w2, s0, s1 = BELFRY
    hole = rect(-w2, hz(s0), w2, hz(s1))
    reveal(fr, hole, 0.0, 0.6, STONE, C_SUR)
    fill2d(fr, [hole], -0.6, WOOD, C_LOUVRE)
    if FAR():
        for k in range(5):
            v = hz(s0) + 0.3 + k * 0.6
            fbox(fr, -w2, w2, v - 0.04, v + 0.04, -0.5, -0.1, WOOD, C_LOUVRE, skip=())
        return
    sur = offset_loop(hole, 0.2)
    fill2d(fr, [sur, hole], 0.04, BLUE, C_SUR); strip2d(fr, sur, 0.04, 0.0, BLUE, C_SUR, inward=False); strip2d(fr, hole, 0.04, 0.0, BLUE, C_SUR)
    fbox(fr, -w2 - 0.3, w2 + 0.3, hz(s0) - 0.18, hz(s0), -0.05, 0.14, BLUE, C_SILL, skip=())
    # louvre boards: 8 sloping boards
    n = 8
    for k in range(n):
        v = hz(s0) + 0.25 + k * (s1 - s0 - 0.35) / (n - 1)
        box(fr.p(-w2, v, -0.3), fr.U, (Z * 0.6 - fr.N * 0.8).normalized(), fr.N, 0.0, 2 * w2, -0.11, 0.11, -0.012, 0.012, WOOD, C_LOUVRE)

def dial(fr, r, west):
    """a clock: a stone surround rising into a segmental hood over the top cornice (c11), the dial, gilt ring, Roman hour
    marks, hands (photos: black dial, gilt numerals)"""
    h = DIAL_H if west else DIAL_H - 0.05
    if FAR():
        fill2d(fr, [circle(0.0, hz(h), r, 12)], 0.06, IRON, C_DIAL); return
    # the stone ground behind the dial, rising above the cornice in a segmental hood
    top = h + r + 0.32
    pts = ccw([(-r - 0.3, hz(TW_STRING[1]))] + [(-r - 0.3, hz(TW_TOP[0]))] + [((r + 0.3) * math.cos(math.pi - math.pi * k / 12), hz(h) + (r + 0.3) * math.sin(math.pi - math.pi * k / 12)) for k in range(13)] + [(r + 0.3, hz(TW_TOP[0])), (r + 0.3, hz(TW_STRING[1]))])
    slab2d(fr, pts, 0.03, -0.4, STONE, C_PLAIN)
    sweep2d(fr, arch_path(0.0, hz(h), r + 0.3, 14), [(0.0, 0.0), (0.12, 0.0), (0.16, 0.06), (0.16, 0.14), (0.24, 0.2), (0.26, 0.28), (0.0, 0.3)][::1], STONE, C_CORN, d0=0.03)
    # dial + rings + hour marks + hands
    lathe_axis(fr.p(0.0, hz(h), 0.03), fr.N, Z, [(r, 0.0), (r, 0.05), (r * 0.92, 0.06), (r * 0.9, 0.05), (r * 0.62, 0.05), (r * 0.6, 0.06), (0.0, 0.06)], 32, IRON, C_DIAL)
    lathe_axis(fr.p(0.0, hz(h), 0.08), fr.N, Z, [(r * 0.99, 0.0), (r * 0.99, 0.02), (r * 0.93, 0.02), (r * 0.93, 0.0)], 32, IRON, C_GILT)
    for k in range(12):
        a = math.pi / 2 - 2 * math.pi * k / 12
        n = 1 if k % 3 else 2
        for j in range(n):
            off = (j - (n - 1) / 2) * 0.06 * r
            p0 = (math.cos(a) * r * 0.66 - math.sin(a) * off, hz(h) + math.sin(a) * r * 0.66 + math.cos(a) * off)
            p1 = (math.cos(a) * r * 0.86 - math.sin(a) * off, hz(h) + math.sin(a) * r * 0.86 + math.cos(a) * off)
            bar(fr, p0, p1, 0.09, 0.035 * r, 0.015, IRON, C_GILT)
    bar(fr, (0.0, hz(h)), (r * 0.45 * math.cos(1.0), hz(h) + r * 0.45 * math.sin(1.0)), 0.1, 0.05, 0.015, IRON, C_GILT)
    bar(fr, (0.0, hz(h)), (r * 0.75 * math.cos(2.4), hz(h) + r * 0.75 * math.sin(2.4)), 0.115, 0.035, 0.015, IRON, C_GILT)
    lathe_axis(fr.p(0.0, hz(h), 0.1), fr.N, Z, [(0.06, 0.0), (0.06, 0.04), (0.0, 0.05)], 10, IRON, C_GILT)

def dome(c):
    """the copper dome (standing seams, brown: re-covered 2013-14, c11 / Arter), its curb, a small lucarne, the finial
    (copper, green): a turned pine-cone bulb, ball, cross with a ring, the cockerel (c11)"""
    b = hz(TW_TOP[1])
    prof = [(2.92, 0.0), (2.98, 0.08), (2.96, 0.3), (2.86, 0.9), (2.62, 1.6), (2.22, 2.35), (1.66, 3.05), (1.0, 3.6), (0.5, 4.05), (0.3, 4.75), (0.0, 4.8)]
    k = (DOME_TOP - TW_TOP[1]) / 4.8                 # the profile's shape (c11, Arter 2014), its rise from the DSM
    prof = [(r, h * k) for r, h in prof]
    segs = 8 if FAR() else 32
    lathe(Vector((c.x, c.y, b)), prof, segs, CUB, C_PLAIN, a0=math.pi / 8 if FAR() else 0.0)
    if not FAR():
        # standing seams: 24 ribs following the profile
        for j in range(24):
            a = 2 * math.pi * (j + 0.5) / 24
            d = Vector((math.cos(a), math.sin(a), 0))
            path = [Vector((c.x, c.y, b)) + d * (r + 0.012) + Z * h for r, h in prof[1:-2]]
            sweep3d(path, [(-0.012, 0.0), (-0.012, 0.03), (0.012, 0.03), (0.012, 0.0)], d, CUB, C_RIDGE, caps=True)
        # the curb: a roll at the dome's foot
        lathe(Vector((c.x, c.y, b)), [(3.0, 0.0), (3.06, 0.05), (3.06, 0.12), (2.98, 0.16)], 32, CUB, C_RIDGE)
        # a small lucarne (hatch) on the west side of the dome (c11, Arter 2014)
        dW = Vector((-1, 0, 0)); p = Vector((c.x, c.y, b)) + dW * 2.55 + Z * 1.55
        wbox(p, Vector((0, 1, 0)), dW, 0.24, 0.3, p.z - 0.25, p.z + 0.3, CUB, C_PLAIN)
        fbox(Frame(p + dW * 0.3, dW), -0.16, 0.16, p.z - 0.18, p.z + 0.18, 0.0, 0.01, GLASS, C_PLAIN, skip=("back",))
    finial(Vector((c.x, c.y, hz(DOME_TOP))))

def finial(t):
    if FAR():
        lathe(t, [(0.25, 0.0), (0.3, 0.6), (0.12, 1.4), (0.05, 1.6), (0.0, 1.7)], 6, CUP, C_PLAIN)
        rod(t + Z * 1.6, t + Z * 3.7, 0.04, CUP)
        rod(t + Z * 3.1 + Vector((0, -0.45, 0)), t + Z * 3.1 + Vector((0, 0.45, 0)), 0.04, CUP)
        return
    lathe(t, [(0.0, -0.05), (0.3, -0.05), (0.3, 0.05), (0.12, 0.12), (0.1, 0.35), (0.22, 0.42), (0.34, 0.6), (0.36, 0.8), (0.3, 1.02),
              (0.2, 1.16), (0.1, 1.24), (0.08, 1.32), (0.13, 1.38), (0.13, 1.44), (0.06, 1.5), (0.06, 1.7), (0.14, 1.78), (0.15, 1.9),
              (0.1, 1.98), (0.04, 2.02), (0.0, 2.05)], 16, CUP, C_PLAIN)
    # pine-cone scales on the bulb: rings of small leaves
    for ring_i, (h, r) in enumerate(((0.5, 0.33), (0.66, 0.36), (0.82, 0.35), (0.96, 0.3))):
        for j in range(10):
            a = 2 * math.pi * (j + 0.5 * (ring_i % 2)) / 10
            d = Vector((math.cos(a), math.sin(a), 0))
            lathe_axis(t + d * (r - 0.02) + Z * h, d, Z, [(0.0, 0.0), (0.06, 0.01), (0.05, 0.04), (0.0, 0.06)], 6, CUP, C_PLAIN)
    # the cross (arms along w: seen flat from the parvis) with a ring at the crossing and fleur-de-lis ends
    cx = t + Z * 2.05
    D = Vector((0, 1, 0))
    rod(cx, cx + Z * 1.9, 0.035, CUP, segs=8)
    arm_h = cx + Z * 1.3
    rod(arm_h - D * 0.48, arm_h + D * 0.48, 0.035, CUP, segs=8)
    lathe_axis(arm_h - Vector((0.02, 0, 0)), Vector((1, 0, 0)), Z, [(0.2, 0.0), (0.2, 0.04), (0.16, 0.04), (0.16, 0.0)], 20, CUP, C_PLAIN)
    for q in (arm_h - D * 0.5, arm_h + D * 0.5, cx + Z * 1.92):
        lathe_axis(q - Vector((0.02, 0, 0)), Vector((1, 0, 0)), Z, [(0.0, 0.0), (0.07, 0.0), (0.07, 0.04), (0.0, 0.04)], 8, CUP, C_PLAIN)
    # the cockerel (weathervane): a flat silhouette on the top (c11)
    ck = cx + Z * 1.95
    body = [(-0.25, 0.0), (0.22, 0.0), (0.3, 0.12), (0.26, 0.26), (0.32, 0.4), (0.26, 0.44), (0.18, 0.3), (0.05, 0.18), (-0.12, 0.22),
            (-0.24, 0.42), (-0.32, 0.38), (-0.3, 0.16)]
    fr = Frame(ck, Vector((1, 0, 0)))
    pts = [(D.y * s, ck.z + v) for s, v in body]
    slab2d(fr, ccw(pts), 0.012, -0.012, CUP, C_PLAIN)

# ------------------------------------------------------------------------------------------------ the sides
def side_window(fr, s, d, sill=SWIN[1], spring=SWIN[2], r=SWIN[0], bars=True):
    """the tall round-arched windows of the sides (P01, P03): a moulded white-stone surround with a keystone, a sill,
    a deep reveal, leaded glass on an iron grid"""
    hole = arched(s - r, s + r, hz(sill), hz(spring))
    reveal(fr, hole, d, 0.55, STONE, C_SUR)
    fill2d(fr, [hole], d - 0.45, GLASS, C_LEAD)
    if FAR(): return hole
    path = [(s - r, hz(sill))] + arch_path(s, hz(spring), r, 16) + [(s + r, hz(sill))]
    sweep2d(fr, path, [(0.0, 0.0), (0.04, 0.0), (0.07, 0.03), (0.07, 0.1), (0.05, 0.14), (0.05, 0.2), (0.0, 0.22)], STONE, C_SUR, d0=d)
    fbox(fr, s - 0.12, s + 0.12, hz(spring + r - 0.05), hz(spring + r + 0.24), d, d + 0.09, STONE, C_SUR, skip=("back",))
    fbox(fr, s - r - 0.32, s + r + 0.32, hz(sill) - 0.16, hz(sill), d - 0.02, d + 0.12, STONE, C_SILL, skip=())
    if bars:
        for k in range(1, 3):
            x = s - r + 2 * r * k / 3
            bar(fr, (x, hz(sill)), (x, hz(spring) + math.sqrt(max(r * r - (x - s) ** 2, 0)) - 0.02), d - 0.43, 0.025, 0.025, IRON, C_PLAIN)
        y = hz(sill) + 0.62
        while y < hz(spring) + r * 0.8:
            half = math.sqrt(max(r * r - max(0.0, y - hz(spring)) ** 2, 0.0)) if y > hz(spring) else r
            bar(fr, (s - half, y), (s + half, y), d - 0.43, 0.02, 0.02, IRON, C_PLAIN)
            y += 0.62
    return hole

def side_elevation(side):
    """a long side of the 1782 church (south: P01; north: only bay 1 is outside, the rest is the 1938-50 fourth nave):
    corner pier, bay 1 with a window, the big pilaster with an urn, then (south) 5 nave bays of 4.95 m with flat stone
    pilasters, brick panels and tall round-arched windows, the plinth, the entablature + cornice"""
    w = WALL_S if side > 0 else WALL_N
    fr = frame_uw(0.0, w, 0, side)
    S = lambda u: fr.s_of(u, w)
    u_end = 33.3 if side > 0 else 5.9
    hb, ht = hz(HB), hz(CORN_B)
    # bays: (u0, u1, window?)
    bays = [(BAY1[0], BAY1[1] if side > 0 else 5.9)]
    if side > 0:
        bays += [(NAVE_U0 + k * NAVE_BAY + 0.38, NAVE_U0 + (k + 1) * NAVE_BAY - 0.38) for k in range(NAVE_N)]
    panels, holes = [], []
    for k, (a, b) in enumerate(bays):
        m = (a + b) / 2
        s0, s1 = sorted((S(a + 0.15), S(b - 0.15)))
        porch = side > 0 and k == 3
        if porch:
            continue            # the porch bay: handled below (a shorter window above the porch's roof)
        pan = rect(s0, hz(PLINTH_TOP), s1, hz(PANEL_TOP))
        panels.append((pan, S(m), porch))
    # the stone face
    sa, sb = sorted((S(0.0), S(u_end)))
    fill2d(fr, [rect(sa, hb, sb, ht)] + [p[0] for p in panels] + ([porch_panel(fr, S)] if side > 0 else []), 0.0, STONE, C_PLAIN)
    for pan, sm, _ in panels:
        strip2d(fr, pan, 0.0, -0.05, STONE, C_PLAIN)
        win = arched(sm - SWIN[0], sm + SWIN[0], hz(SWIN[1]), hz(SWIN[2]))
        fill2d(fr, [pan, win], -0.05, BRICK, C_PLAIN)
        side_window(fr, sm, -0.05)
    if side > 0:
        porch_bay(fr, S)
    # big pilaster (urn) at u 6.25-7.53 (south) / 5.9-6.4 (north, the 4th nave's corner): projects 0.3
    if side > 0:
        a, b = sorted((S(6.25), S(7.53)))
        fbox(fr, a, b, hb, ht, 0.0, 0.32, STONE, C_PLAIN, skip=("back",))
        cornice_run(fr, a, b, 0.32, CORN_B, CORN_T, proj=0.42)
        if not FAR():
            fbox(fr, a, b, hz(ARCHI), hz(FRIEZE), 0.32, 0.36, STONE, C_CORN, skip=("back",))
        pedestal_urn(fr, (a + b) / 2, 0.32)
        # flat pilasters between the nave bays
        for k in range(1, NAVE_N):
            u = NAVE_U0 + k * NAVE_BAY
            a, b = sorted((S(u - 0.38), S(u + 0.38)))
            pilaster(fr, a, b, PLINTH_TOP, ARCHI, 0.0, 0.07, STONE, C_QUOIN)
        a, b = sorted((S(32.3), S(33.3)))
        fbox(fr, a, b, hb, ht, 0.0, 0.16, STONE, C_PLAIN, skip=("back",))
    # the corner pier's side (u 0..1.34): its face is part of this wall plane; the pier stands 0.24 proud of it (footprint)
    a, b = sorted((S(0.0), S(BAY1[0])))
    fbox(fr, a, b, hb, ht, 0.0, 0.24, STONE, C_PLAIN, skip=("back",))
    # plinth + entablature along the whole side
    plinth_cuts = [(17.81, 21.58)] if side > 0 else []
    runs = [(0.0, u_end)]
    for (c0, c1) in plinth_cuts: runs = [(0.0, c0), (c1, u_end)]
    for (u0, u1) in runs:
        a, b = sorted((S(u0), S(u1)))
        if FAR(): fbox(fr, a, b, hb, hz(PLINTH_TOP), 0.0, 0.06, STONE, C_PLINTH)
        else: sweep2d(fr, [(a, hz(PLINTH_TOP)), (b, hz(PLINTH_TOP))], [(0.06, -(PLINTH_TOP - HB)), (0.06, -0.06), (0.0, 0.0)], STONE, C_PLINTH, d0=0.0)
    a, b = sorted((S(0.0), S(u_end)))
    if not FAR():
        fbox(fr, a, b, hz(ARCHI), hz(ARCHI + 0.17), 0.0, 0.035, STONE, C_CORN, skip=("back",))
        fbox(fr, a, b, hz(ARCHI + 0.17), hz(FRIEZE), 0.0, 0.06, STONE, C_CORN, skip=("back",))
    cornice_run(fr, a, b, 0.0, CORN_B, CORN_T, proj=0.42, caps=True)
    parapet(fr, a, b)
    # the wall above the cornice up to the roof's eave (a low parapet / the gutter's lining) + the copper gutter
    if side > 0:
        gl = [P(0.3, w + 0.05, CORN_T), P(u_end - 0.2, w + 0.05, CORN_T)]
        downpipe(P(32.0, w + 0.6, CORN_T - 0.1), 49.3)
        downpipe(P(17.3, w + 0.6, CORN_T - 0.1), 49.6)
    return fr

def parapet(fr, s0, s1, t=0.65):
    """the wall's top behind the cornice: the roof's eave (DSM 59.3-59.5) lies 1.5 m below the cornice top in a box
    gutter, so the parapet's inner face and its top are seen from above"""
    fbox(fr, s0, s1, hz(EAVE_H - 0.6), hz(CORN_B), -t, 0.0, STONE, C_COPING, skip=("front", "bottom"))

def porch_panel(fr, S):
    a, b = sorted((S(NAVE_U0 + 3 * NAVE_BAY + 0.53), S(NAVE_U0 + 4 * NAVE_BAY - 0.53)))
    return rect(a, hz(PORCH["corn"] + 0.6), b, hz(PANEL_TOP))

def porch_bay(fr, S):
    """bay 4 (from the west) over the south porch: a shorter window above the porch's roof (estimated; P01 too far)"""
    pan = porch_panel(fr, S)
    sm = S(NAVE_U0 + 3.5 * NAVE_BAY)
    win = arched(sm - SWIN[0], sm + SWIN[0], hz(56.4), hz(SWIN[2]))
    strip2d(fr, pan, 0.0, -0.05, STONE, C_PLAIN)
    fill2d(fr, [pan, win], -0.05, BRICK, C_PLAIN)
    side_window(fr, sm, -0.05, sill=56.4)

def pedestal_urn(fr, s, d):
    b0 = hz(CORN_T)
    fbox(fr, s - 0.5, s + 0.5, b0, b0 + 0.85, d - 0.9, d + 0.02, STONE, C_PLAIN, skip=())
    if not FAR():
        sweep3d([fr.p(s - 0.55, b0 + 0.85, d - 0.95), fr.p(s + 0.55, b0 + 0.85, d - 0.95)], [(-0.07 - 0.0, 0.0), (-0.07, 0.06), (1.04, 0.06), (1.04, 0.0)][::-1], Z, STONE, C_CORN)
    urn(fr.p(s, 0.0, d - 0.44), CORN_T + 0.91)

def bay1_north():
    """the north wall of the 1782 front bay (u 0..5.9, w -9.8), between the front and the fourth nave's west face (P03:
    a round-arched window)"""
    side_elevation(-1)

def fourth_nave():
    """the fourth nave (Veraart 1938-50; P03: west face with a tall round-arched window between stone corner piers with
    urns, a cornice, a hipped slate roof). Its north wall has no photo: estimated with the south side's rhythm (stone
    pilasters, brick panels, round-arched windows)"""
    n = N4; w0, w1 = WALL_N, n["w_out"]
    # west face (u 5.9)
    fr = frame_uw(n["u0"], (w0 + w1) / 2, -1, 0)
    S = lambda w: fr.s_of(n["u0"], w)
    a, b = sorted((S(w0), S(w1)))
    sm = (a + b) / 2
    pan = rect(a + 1.05, hz(PLINTH_TOP), b - 1.05, hz(PANEL_TOP))
    win = arched(sm - 0.85, sm + 0.85, hz(53.54), hz(57.92))
    fill2d(fr, [rect(a, hz(HB), b, hz(CORN_B)), pan], 0.0, STONE, C_PLAIN)
    strip2d(fr, pan, 0.0, -0.05, STONE, C_PLAIN)
    fill2d(fr, [pan, win], -0.05, BRICK, C_PLAIN)
    side_window(fr, sm, -0.05, sill=53.54, spring=57.92, r=0.85)
    for x in (a, b):
        fbox(fr, min(x, x + (1.0 if x == a else -1.0)), max(x, x + (1.0 if x == a else -1.0)), hz(HB), hz(CORN_B), 0.0, 0.08, STONE, C_QUOIN)
    if FAR(): fbox(fr, a, b, hz(HB), hz(PLINTH_TOP), 0.0, 0.1, STONE, C_PLINTH)
    else: sweep2d(fr, [(a, hz(PLINTH_TOP)), (b, hz(PLINTH_TOP))], [(0.14, -(PLINTH_TOP - HB)), (0.14, -0.06), (0.08, 0.0)], STONE, C_PLINTH, d0=0.0)
    if not FAR():
        fbox(fr, a, b, hz(ARCHI), hz(ARCHI + 0.17), 0.08, 0.11, STONE, C_CORN, skip=("back",))
        fbox(fr, a, b, hz(ARCHI + 0.17), hz(FRIEZE), 0.08, 0.14, STONE, C_CORN, skip=("back",))
    cornice_run(fr, a, b, 0.08, CORN_B, CORN_T, proj=0.42)
    parapet(fr, a, b)
    pedestal_urn(fr, b - 0.5, 0.08)          # the north-west corner (P03); the south-west one is the old pilaster's
    pedestal_urn(fr, a + 0.5, 0.08)
    # north wall (u 6.39 .. 26.7 at w -17.3): estimated, 4 bays
    frn = frame_uw(n["u0"], w1, 0, -1)
    Sn = lambda u: frn.s_of(u, w1)
    a, b = sorted((Sn(n["u0"]), Sn(n["u1"])))
    bays = 7; L = (n["u1"] - n["u0"] - 0.5) / bays
    pans = []
    for k in range(bays):
        u0 = n["u0"] + 0.5 + k * L + 0.5; u1 = n["u0"] + 0.5 + (k + 1) * L - 0.5
        s0, s1 = sorted((Sn(u0), Sn(u1)))
        pans.append((rect(s0, hz(PLINTH_TOP), s1, hz(PANEL_TOP)), (s0 + s1) / 2))
    fill2d(frn, [rect(a, hz(HB), b, hz(CORN_B))] + [p for p, _ in pans], 0.0, STONE, C_PLAIN)
    for p, sm in pans:
        strip2d(frn, p, 0.0, -0.05, STONE, C_PLAIN)
        fill2d(frn, [p, arched(sm - 0.8, sm + 0.8, hz(53.64), hz(57.92))], -0.05, BRICK, C_PLAIN)
        side_window(frn, sm, -0.05, sill=53.64, spring=57.92, r=0.8)
    if FAR(): fbox(frn, a, b, hz(HB), hz(PLINTH_TOP), 0.0, 0.06, STONE, C_PLINTH)
    else: sweep2d(frn, [(a, hz(PLINTH_TOP)), (b, hz(PLINTH_TOP))], [(0.06, -(PLINTH_TOP - HB)), (0.06, -0.06), (0.0, 0.0)], STONE, C_PLINTH, d0=0.0)
    if not FAR():
        fbox(frn, a, b, hz(ARCHI), hz(ARCHI + 0.17), 0.0, 0.035, STONE, C_CORN, skip=("back",))
        fbox(frn, a, b, hz(ARCHI + 0.17), hz(FRIEZE), 0.0, 0.06, STONE, C_CORN, skip=("back",))
    cornice_run(frn, a, b, 0.0, CORN_B, CORN_T, proj=0.42)
    parapet(frn, a, b)
    downpipe(P(n["u0"] + 0.9, w1 - 0.55, CORN_T - 0.1), 49.5)
    # its east wall (u 40.3, above the annexes' flat roofs): brick, estimated
    fe = frame_uw(n["u1"], (w0 + w1) / 2, 1, 0)
    a, b = sorted((fe.s_of(n["u1"], w0), fe.s_of(n["u1"], w1)))
    fill2d(fe, [rect(a, hz(ANNEX_TOP - 0.5), b, hz(CORN_B))], 0.0, BRICK, C_PLAIN)
    cornice_run(fe, a, b, 0.0, CORN_B, CORN_T, proj=0.35)
    parapet(fe, a, b)
    # roof: hipped west end, ridge to u 38.4, hipped east end down to the annexes (DSM), the south half buried in the
    # old roof (the valley at w -8.6 / 60.0 falls out of the two planes)
    rw, rh, eh = n["ridge_w"], n["ridge"], n["eave"]
    half = abs(w1 - rw) + 0.35
    slope = (rh - eh) / (abs(w1 - rw))
    e_h = rh - half * slope
    u_w = n["u0"] - 0.35; u_e = n["u1"] + 0.35
    r0 = P(u_w + half, rw, rh); r1 = P(u_e - half, rw, rh)
    eN0, eN1 = P(u_w, rw - half, e_h), P(u_e, rw - half, e_h)
    eS0, eS1 = P(u_w, rw + half, e_h), P(u_e, rw + half, e_h)
    slab([eN0, eN1, r1, r0], 0.12, SLATE, C_PLAIN, edges=(True, False, False, False))
    slab([eS1, eS0, r0, r1], 0.12, SLATE, C_PLAIN, edges=(True, False, False, False))
    K.B.new_group()
    face_dir([eS0, eN0, r0], Vector((-1, 0, 0.5)), SLATE, C_PLAIN)       # west hip
    face_dir([eN1, eS1, r1], Vector((1, 0, 0.5)), SLATE, C_PLAIN)        # east hip
    if not FAR():
        ridge_roll([r0, r1])
        for e, r in ((eN0, r0), (eS0, r0), (eN1, r1), (eS1, r1)): ridge_roll([r, e + Z * 0.03], 0.05)
    gutter(eN0 + Vector((0.3, 0, -0.03)), eN1 + Vector((-0.3, 0, -0.03)))

# ------------------------------------------------------------------------------------------------ roofs
def slab(top, th, mat, code=C_PLAIN, edges=(True, True, True, True), uvs=None):
    """a roof slab: top polygon (Blender points), a soffit th below, edge faces"""
    up = (top[1] - top[0]).cross(top[2] - top[1]).normalized()
    n0 = len(top)
    if up.z < 0:
        top = list(reversed(top)); up = -up
        edges = [edges[(n0 - 2 - i) % n0] for i in range(n0)]
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

def ridge_roll(pts, r=0.07):
    if FAR(): return
    sweep3d(pts, [(math.cos(math.pi * k / 6) * r, math.sin(math.pi * k / 6) * r - 0.02) for k in range(7)], Z, ZINC, C_RIDGE, caps=False)

def gutter(a, b, r=0.075):
    if FAR(): return
    prof = [(math.cos(math.pi * k / 8) * r, -math.sin(math.pi * k / 8) * r) for k in range(9)]
    sweep3d([a, b], prof, Z, CUP, C_GUTTER)
    sweep3d([a, b], [(x * 0.92, y * 0.92) for x, y in reversed(prof)], Z, CUP, C_GUTTER, caps=False)

def downpipe(top, bottom_h, r=0.06):
    if FAR(): return
    b = Vector((top.x, top.y, hz(bottom_h)))
    lathe_axis(b, Z, Vector((1, 0, 0)), [(r, 0.0), (r, top.z - b.z)], 8, CUP, C_GUTTER)
    lathe_axis(b, Z, Vector((1, 0, 0)), [(r * 1.5, 0.0), (r * 1.5, 0.15), (r, 0.22)], 8, CUP, C_GUTTER)
    for k in range(1, int((top.z - b.z) / 2.0) + 1):        # pipe brackets
        lathe_axis(b + Z * (k * 2.0), Z, Vector((1, 0, 0)), [(r * 1.35, 0.0), (r * 1.35, 0.05)], 8, CUP, C_GUTTER)

def main_roof():
    """the 1782 roof (renewed with Spanish slates 2013-14): two slopes over nave + aisles (one roof: Veraart's section),
    ridge 67.7 (DSM), eaves behind the cornices; hipped corners at the east wall; the steep apse roof (DSM)"""
    th = 0.14
    ew, eh = EAVE_W, EAVE_H
    r_w = 0.6                                          # the roof starts behind the front's upper register
    rE = P(U_EAST - 0.4, WC, RIDGE); rW = P(r_w, WC, RIDGE)
    for side in (-1, 1):
        e0 = P(r_w, WC + side * ew, eh); e1 = P(U_EAST + 0.25, WC + side * ew, eh)
        slab([e0, e1, rE, rW], th, SLATE, C_PLAIN, edges=(True, False, False, True))
        gutter(P(r_w + 0.6, WC + side * (ew - 0.05), eh - 0.02), P(U_EAST if side > 0 else N4["u0"] - 0.4, WC + side * (ew - 0.05), eh - 0.02))
    # the east end: hip facets from the ridge's end to the eave polygon (main block corners + the apse)
    a1, a2 = APSE
    poly = [(U_EAST + 0.25, WC - ew), (a1[0] + 0.25, WC - a1[1] - 0.25), (a2[0] + 0.3, WC - a2[1] - 0.15), (a2[0] + 0.3, WC + a2[1] + 0.15),
            (a1[0] + 0.25, WC + a1[1] + 0.25), (U_EAST + 0.25, WC + ew)]
    K.B.new_group()
    for i in range(len(poly) - 1):
        (ua, wa), (ub, wb) = poly[i], poly[i + 1]
        A, B = P(ua, wa, eh), P(ub, wb, eh)
        face_dir([A, B, rE], Vector((1, 0, 0.3)), SLATE, C_PLAIN)
        face_dir([A - Z * th, B - Z * th, rE - Z * th], Vector((-1, 0, -1)), SLATE, C_PLAIN)
        e = B - A; out = e.cross(Z).normalized()
        if out.x < 0: out = -out
        face_dir([A, B, B - Z * th, A - Z * th], out, SLATE, C_PLAIN)
        if i > 0: gutter(A + Vector((0, 0, -0.02)), B + Vector((0, 0, -0.02)))
    for (uu, ww) in poly: ridge_roll([rE, P(uu, ww, eh) + Z * 0.04], 0.05)
    ridge_roll([rW, rE])
    # the roof's west end against the back of the upper register: a flashing strip (lead)
    if not FAR():
        for side in (-1, 1):
            a = P(r_w - 0.05, WC + side * ew, eh + 0.05); b = P(r_w - 0.05, WC, RIDGE + 0.05)
            sweep3d([a, b], [(-0.12, 0.0), (0.12, 0.0), (0.12, 0.03), (-0.12, 0.03)], Z, ZINC, C_RIDGE)

def east_end():
    """the main block's east wall + the three-sided apse: brick with stone pilasters and cornice (estimated: hidden
    behind the annexes and the houses of rue du Doyenne; volumes from the DSM)"""
    a1, a2 = APSE
    # east wall stubs (u = U_EAST) from the side walls to the apse
    for sg in (-1, 1):
        fr = frame_uw(U_EAST, WC + sg * 8.0, 1, 0)
        S = lambda w: fr.s_of(U_EAST, w)
        s0, s1 = sorted((S(WC + sg * a1[1]), S(WC + sg * (WALL_S if sg > 0 else -WALL_N))))
        fill2d(fr, [rect(s0, hz(ANNEX_TOP - 0.5), s1, hz(CORN_B))], 0.0, BRICK, C_PLAIN)
        cornice_run(fr, s0, s1, 0.0, CORN_B, CORN_T, proj=0.35)
        parapet(fr, s0, s1)
    pts = [(U_EAST, WC - a1[1]), (a2[0], WC - a2[1]), (a2[0], WC + a2[1]), (U_EAST, WC + a1[1])]
    for i in range(3):
        (ua, wa), (ub, wb) = pts[i], pts[i + 1]
        du, dw = ub - ua, wb - wa; L = math.hypot(du, dw)
        nu, nw_ = dw / L, -du / L
        cu, cw = (ua + ub) / 2 - (U_EAST - 1.0), (wa + wb) / 2 - WC
        if nu * cu + nw_ * cw < 0: nu, nw_ = -nu, -nw_
        fr = frame_uw(ua, wa, nu, nw_)
        sa, sb = sorted((fr.s_of(ua, wa), fr.s_of(ub, wb)))
        sm = (sa + sb) / 2
        holes = [arched(sm - 0.7, sm + 0.7, hz(56.29), hz(59.15))] if i != 1 else []
        fill2d(fr, [rect(sa, hz(ANNEX_TOP - 0.5), sb, hz(CORN_B))] + holes, 0.0, BRICK, C_PLAIN)
        if holes: side_window(fr, sm, 0.0, sill=56.29, spring=59.15, r=0.7, bars=False)
        for x in (sa, sb):
            fbox(fr, min(x, x + (0.45 if x == sa else -0.45)), max(x, x + (0.45 if x == sa else -0.45)), hz(ANNEX_TOP - 0.5), hz(CORN_B), 0.0, 0.05, STONE, C_QUOIN)
        cornice_run(fr, sa, sb, 0.0, CORN_B, CORN_T, proj=0.35)
        parapet(fr, sa, sb)

def annexes():
    """Veraart's annexes (1938-50; DSM: flat roofs at 53.9-54.1; footprint): sacristies round the chevet, the south-east
    block, the north-east block; brick with a stone coping, flat zinc roofs. The south porch (P01: a lower block with a
    cornice and a small window). All estimated except the volumes."""
    top = ANNEX_TOP
    # the ring of flat-roofed annexes (plan polygon, CCW in (u, w)): from the SE block round the chevet to the NE block
    ring = [(33.3, 9.69), (33.3, 14.56), (40.58, 14.52), (48.84, 8.82), (38.33, -24.82), (29.98, -22.22), (30.73, -19.81),
            (27.5, -19.65), (27.5, -19.05), (26.7, -18.81), (26.7, -17.3), (U_EAST, -17.3), (U_EAST, 9.53)]
    # outer walls = the footprint edges not shared with the church
    outer = [(0, 1), (1, 2), (2, 3), (3, 4), (4, 5), (5, 6), (6, 7), (7, 8), (8, 9), (9, 10)]
    for i, j in outer:
        (ua, wa), (ub, wb) = ring[i], ring[j]
        du, dw = ub - ua, wb - wa; L = math.hypot(du, dw)
        if L < 0.05: continue
        nu, nw_ = dw / L, -du / L                       # right-hand normal of a CW-in-(u,w)... checked by the centroid
        cu, cw = (ua + ub) / 2 - 38.0, (wa + wb) / 2 - 0.0
        if nu * cu + nw_ * cw < 0: nu, nw_ = -nu, -nw_
        fr = frame_uw(ua, wa, nu, nw_)
        sa, sb = sorted((fr.s_of(ua, wa), fr.s_of(ub, wb)))
        holes = []
        if L > 4.0:
            nwin = int(L / 3.2)
            for k in range(nwin):
                sm = sa + (k + 0.5) * (sb - sa) / nwin
                holes.append(rect(sm - 0.45, hz(51.2), sm + 0.45, hz(52.9)))
        fill2d(fr, [rect(sa, hz(HB), sb, hz(top - 0.25))] + holes, 0.0, BRICK, C_PLAIN)
        for hr in holes:
            reveal(fr, hr, 0.0, 0.25, STONE, C_SUR); fill2d(fr, [hr], -0.22, GLASS, C_PLAIN)
            if not FAR(): fbox(fr, hr[0][0] - 0.08, hr[1][0] + 0.08, hr[0][1] - 0.1, hr[0][1], -0.05, 0.08, BLUE, C_SILL, skip=())
        if not FAR():
            fbox(fr, sa, sb, hz(HB), hz(50.3), 0.0, 0.04, STONE, C_PLINTH)
        fbox(fr, sa - 0.02, sb + 0.02, hz(top - 0.25), hz(top), -0.05, 0.08, STONE, C_COPING, skip=())
    # flat roof
    K.B.new_group()
    from mathutils.geometry import tessellate_polygon
    loop = ccw([(u, w) for u, w in ring])
    vs = [P(u, w, top - 0.12) for u, w in loop]
    for t in tessellate_polygon([[Vector((u, -w, 0)) for u, w in loop]]):
        face_dir([vs[t[0]], vs[t[1]], vs[t[2]]], Z, ZINC, C_PLAIN)
    # the south porch (u 17.81-21.58, w 9.52-12.33): stone + brick, cornice 54.8, a lead-covered roof
    p = PORCH
    for (ua, wa, ub, wb, nu, nw_) in ((p["u0"], 9.53, p["u0"], p["w1"], -1, 0), (p["u0"], p["w1"], p["u1"], p["w1"], 0, 1), (p["u1"], p["w1"], p["u1"], 9.53, 1, 0)):
        fr = frame_uw(ua, wa, nu, nw_)
        sa, sb = sorted((fr.s_of(ua, wa), fr.s_of(ub, wb)))
        holes = []
        if nw_ == 1:
            sm = (sa + sb) / 2; holes = [rect(sm - 0.28, hz(51.9), sm + 0.28, hz(53.1))]       # P01: a small window
        if nu == -1:
            sm = (sa + sb) / 2; holes = [arched(sm - 0.6, sm + 0.6, hz(49.75), hz(52.3))]       # a door on the west side (estimated)
        fill2d(fr, [rect(sa, hz(HB), sb, hz(p["corn"] - 0.3))] + holes, 0.0, BRICK, C_PLAIN)
        for hr in holes:
            reveal(fr, hr, 0.0, 0.3, STONE, C_SUR)
            if nu == -1: door_leaves(fr, hr[0][0] + 0.0, hr[1][0], hz(49.75), hz(52.3), -0.28, 2)
            else: fill2d(fr, [hr], -0.25, GLASS, C_LEAD)
        for x in (sa, sb):
            fbox(fr, min(x, x + (0.4 if x == sa else -0.4)), max(x, x + (0.4 if x == sa else -0.4)), hz(HB), hz(p["corn"] - 0.3), 0.0, 0.05, STONE, C_QUOIN)
        cornice_run(fr, sa, sb, 0.0, p["corn"] - 0.3, p["corn"], proj=0.25)
        if not FAR(): fbox(fr, sa, sb, hz(HB), hz(50.6), 0.0, 0.06, STONE, C_PLINTH)
    K.B.new_group()
    top_ = [P(p["u0"] - 0.2, 9.5, p["corn"] + 0.05), P(p["u1"] + 0.2, 9.5, p["corn"] + 0.05), P(p["u1"] + 0.2, p["w1"] + 0.2, p["corn"]), P(p["u0"] - 0.2, p["w1"] + 0.2, p["corn"])]
    slab(top_, 0.1, ZINC, C_PLAIN)

def build_all():
    front_lower(); front_upper()
    tower()
    side_elevation(1); bay1_north()
    fourth_nave()
    main_roof()
    east_end()
    annexes()

build_all()
B_MAIN = K.B
print(f"LOD0: {len(B_MAIN.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = True
build_all()
B_FAR = K.B
K.FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
AO_SPLIT = 0.86
obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "StPierre", B_MAIN, 0.0, AO_SPLIT, AO_PX)
far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "StPierre_far", B_FAR, AO_SPLIT + 0.005, 1.0, AO_PX)
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
ao_img = bpy.data.images.new("stpierre_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    objs = [obj, far]
    for i, target in enumerate(objs):
        for o in objs: o.hide_render = o is not target
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    for target, th in ((obj, thin0), (far, thin1)):
        for o in objs: o.hide_render = o is not target
        vertex_ao(target, th)
    for o in objs: o.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "stpierre_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "stpierre_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "stpierre.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
S_ = SITE["solids"]
info = {
    "asset": "Eglise Saint-Pierre d'Uccle, Parvis Saint-Pierre (tools/blender/stpierre.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"copper_brown": "copper sheet in its brown (not yet green) state: the dome, re-covered 2013-14 (photos c11, Arter 2014); not in the shared library yet (falls back to the temporary material whatever SOURCE says)"},
    "uv": {"TEXCOORD_0": "world metres, per face (walls u along / v up; swept parts path x profile)", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 1.0], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1),
                 "thin_faces_vertex_ao": [obj["thin"], far["thin"]]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                  "hides_solids": [S_["church"]["id"]], "hides_bu_ids": [S_["church"]["bu"]], "church_bu_id": S_["church"]["bu"]},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "roof_dsm": SITE["roof"], "ground_taw": SITE["ground"], "footprint_local": SITE["footprint_local"]},
    "levels_taw": {"ground_front": G_FRONT, "plinth": PLINTH_TOP, "cornice": [CORN_B, CORN_T], "upper_register": [UP_TOP, UP_CORN], "attic": ATTIC,
                   "tower_string": TW_STRING, "tower_top": TW_TOP, "dome_top": DOME_TOP, "ridge": RIDGE, "eave": EAVE_H, "portal": [DOOR_SILL, DOOR_TOP, FAN_C + FAN_R],
                   "fourth_nave": [N4["eave"], N4["ridge"]], "annexes": ANNEX_TOP},
    "plan": {"axis_w": WC, "front_half": HALF, "central_bay": CB, "side_bays_to": SB, "tower": [TW_U, TW_H, TW_C], "nave_bays": [NAVE_U0, NAVE_BAY, NAVE_N],
             "east_wall": U_EAST, "apse": APSE, "fourth_nave": N4, "porch": PORCH},
    "estimated": "the east end (main block's east wall, the apse's walls and windows), the annexes' walls and windows, the north-east block's roof, "
                 "the fourth nave's north wall (4 bays with the south side's window type), the porch's sides and door, the window over the porch, "
                 "the dial sizes on the N / E / S faces, the cartouche and the urns (stylised), the wall thicknesses",
}
json.dump(info, open(os.path.join(OUT, "stpierre.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"brick_red_brussels": (0.33, 0.1, 0.06), "stone_white": (0.62, 0.56, 0.44), "stone_blue": (0.12, 0.13, 0.14), "slate": (0.05, 0.055, 0.065),
            "copper_brown": (0.13, 0.08, 0.05), "copper_patina": (0.15, 0.35, 0.28), "zinc_roof": (0.3, 0.32, 0.33), "wood_frame_dark": (0.05, 0.03, 0.025),
            "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.02, 0.02, 0.02)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else (0.45 if m.name in ("copper_brown", "copper_patina", "slate") else 0.85)
        if m.name.startswith("copper"): bsdf.inputs["Metallic"].default_value = 0.6
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
    look("west", (-24.0, 0.5, 51.5), (0.0, -0.07, 63.0), 24)
    look("southwest", (-18.0, 22.0, 51.5), (12.0, 4.0, 60.0), 22, (1100, 900))
    look("northwest", (-16.0, -26.0, 51.5), (8.0, -6.0, 60.0), 22, (1100, 900))
    look("aerial", (-30.0, 45.0, 95.0), (22.0, -2.0, 58.0), 30, (1100, 800))
print(f"done {time.time() - T0:.1f}s")
