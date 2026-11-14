"""SQUARE DES HEROS, Uccle: THE WAR MEMORIAL and THE TWO FLIGHTS OF STEPS, built entirely in code (no hand modelling) from
the MEASURED data (tools/heros_measure.py -> models/heros/site.json) and photos (docs/landmarks/HEROS.md).

The Monument aux morts by Leandre Grandmoulin (1925, engineer Van Hoey, bronze cast by Verbeyst; enlarged 1948): a
truncated obelisk of blue stone (petit granit) on a pedestal, crowned by the gilded bronze group (a winged Victory holding
a dying soldier: tools/blender/heros_statue.py), the inscription "ERIGE PAR LA COMMUNE D'UCCLE A LA MEMOIRE DE SES ENFANTS
MORTS POUR LA PATRIE 1914-1918" under a bas-relief of Saint Peter on the front (south, toward the 12 steps and the
Wolvendael park), the names of the 138 dead of 1914-1918 on the other faces; round it the 1948 enlargement: an
OCTAGONAL enclosure of blue-stone benches whose backs carry the names of the 193 dead of 1940-1945 ("1940-1945" carved
on the front seat), carved rose bouquets and small animals (a frog, ...) at the corners, a wrought-iron railing with a
row of rings on the wall top, ornamental grasses in the bed inside; the whole on a low round platform.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros.py -- models/heros [--no-bake] [--previews] [--fast]
      models/heros/heros.raw.glb   node "Heros" (LOD0) + "Heros_far" (the scripted far variant); one primitive per NAMED slot
      models/heros/heros_ao.png    ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      models/heros/heros.json      measurements, slots, codes, placement, the terrain carves under the steps, colliders
    then: node tools/hero_pack.mjs models/heros/heros.raw.glb models/heros/heros.glb 14000 3000 --name Heros

INPUT: site.json (frame: origin = the octagon's centroid (OSM retaining wall w225781827), u toward the front = south,
w = (-sin r, cos r); the obelisk's square base (OSM inner ring w1154611811, 2.38 x 2.25 m), the terrace level (DTM 50.55),
the steps (OSM w1154611802: 12 steps, handrails; w1154611806: 4 steps), their ground (DTM)), statue_mesh.json /
statue_far.json (the bronze), site_dtm.* (the ground for the AO bake). textures/heros/heros_letters.png is the lettering
atlas the city's stone material reads (codes "letters": TEXCOORD_0 = 1000 * (cell + 1) + s, v in metres on the panel).

SWAPPABLE MATERIALS: no colour, no texture in the GLB. COLOR_0.r = per-face code / 16 + 1/32, COLOR_0.g = per-vertex AO
of the thin parts; TEXCOORD_0 = world metres per face; TEXCOORD_1 = the baked AO lightmap UV (lighting only).
Frame: Blender x = u, y = -w, z = TAW - OY (stpierre_common).
"""
import bpy, math, os, sys, json, time, random
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                             sweep3d, face_dir, face_up, quad, circle, offset_loop, arc_pts, ccw, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/heros")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "heros")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]
MON = SITE["monument"]
rnd = random.Random(1925)

SLOTS = ["stone_blue", "bronze_gilt", "cast_iron_black", "cast_iron_green", "soil_bed", "plant_grass", "cobbles"]
STONE, BRONZE, IRON, GREEN, SOIL, PLANT, SETTS = range(7)
CODES = ["plain", "panel", "letters", "nosing", "riser", "tread", "kerb", "relief", "bouquet", "animal", "rail", "post",
         "finial", "cap", "plinth", "seat"]
(C_PLAIN, C_PANEL, C_LETTERS, C_NOSING, C_RISER, C_TREAD, C_KERB, C_RELIEF, C_BOUQUET, C_ANIMAL, C_RAIL, C_POST,
 C_FINIAL, C_CAP, C_PLINTH, C_SEAT) = range(16)
FAR = lambda: K.FAR
# the lettering atlas cells (tools/heros_letters.py writes the same table into textures/heros/heros_letters.json)
CELL_FRONT, CELL_NAMES_A, CELL_NAMES_B, CELL_NAMES_C, CELL_BENCH, CELL_YEARS = range(6)

# ------------------------------------------------------------------------------------------------ LEVELS (m TAW)
# the terrace: DTM 50.46-50.60 at 4.5-6 m round the centre (median 50.55); the DSM shows the platform ring at ~3.6-4.1 m
# (50.9-51.2 smoothed) and the wall + railing at 51.9-52.0 (r 2.6-3.1), the obelisk's top 57.34 (0.5 m cells: the bronze
# lost); the photos (heritage.uccle.be DSC_4594, IMG_0040; Commons "Square Heros Bxl 01") give the rest in proportion
T = 50.55                        # terrace (the dolomite round the platform)
PT = T + 0.16                    # the round platform's top (one low step, bullnosed)
PLAT_R = SITE.get("platform_r", 4.05)
SEAT = PT + 0.45                 # the 1948 benches' seats
WALL_TOP = PT + 1.08             # the benches' backs = the names' panels; coping on top
RAIL_H = 0.74                    # the wrought-iron railing over the coping
BED = WALL_TOP - 0.16            # the soil inside the enclosure
OCT_R = sum(MON["wall_radius"]) / 2      # 3.04: the OSM octagon (outer wall face), vertices at 22.5 + 45 k degrees
OCT_A = OCT_R * math.cos(math.pi / 8)    # its apothem 2.81
WALL_T = 0.36
SEAT_D = 0.42
# the obelisk (OSM base 2.38 x 2.25; photos: pedestal, moulded plinth, tapering shaft, a two-step cap under the rock)
PED = (1.17, 1.11, PT + 1.78)    # half sizes u, w; top
PLI = (0.94, 0.89, PT + 2.32)
SHAFT0, SHAFT1 = (0.8, 0.75), (0.63, 0.58)
SHAFT_TOP = PT + 6.0
CAP1 = (0.73, 0.68, SHAFT_TOP + 0.22)
CAP2 = (0.6, 0.55, SHAFT_TOP + 0.42)
STATUE_BASE = CAP2[2]

# ------------------------------------------------------------------------------------------------ helpers
def PW(u, w, h): return P(u, w, h)
def octagon(r, n=8, a0=math.pi / 8):
    return [(r * math.cos(a0 + 2 * math.pi * k / n), r * math.sin(a0 + 2 * math.pi * k / n)) for k in range(n)]
def ccw_uw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))

def prism(loop, h0, h1, mat, code, top=True, bottom=False, top_code=None):
    """walls round a (u, w) loop from h0 to h1 facing out, optional top / bottom faces"""
    K.B.new_group()
    L = ccw_uw(loop); n = len(L)
    cu = sum(p[0] for p in L) / n; cw = sum(p[1] for p in L) / n
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        mid = Vector(((a[0] + b[0]) / 2 - cu, -((a[1] + b[1]) / 2 - cw), 0))
        face_dir([PW(a[0], a[1], h0), PW(b[0], b[1], h0), PW(b[0], b[1], h1), PW(a[0], a[1], h1)], mid, mat, code)
    if top: face_dir([PW(p[0], p[1], h1) for p in L], Z, mat, top_code if top_code is not None else code)
    if bottom: face_dir([PW(p[0], p[1], h0) for p in L], -Z, mat, code)

def frustum(a0, b0, a1, b1, h0, h1, mat, code, top=True):
    """a rectangular frustum: half sizes (a0 along u, b0 along w) at h0 -> (a1, b1) at h1"""
    K.B.new_group()
    lo = [(a0, b0), (-a0, b0), (-a0, -b0), (a0, -b0)]; hi = [(a1, b1), (-a1, b1), (-a1, -b1), (a1, -b1)]
    for i in range(4):
        j = (i + 1) % 4
        mid = Vector(((lo[i][0] + lo[j][0]) / 2, -(lo[i][1] + lo[j][1]) / 2, 0))
        face_dir([PW(*lo[i], h0), PW(*lo[j], h0), PW(*hi[j], h1), PW(*hi[i], h1)], mid, mat, code)
    if top: face_dir([PW(*p, h1) for p in hi], Z, mat, code)

def blob(c, rx, ry, rz, mat, code, segs=8, rings=5, squash=0.0):
    """an ellipsoid (a rose, a frog's body): lathe about Z through c (Blender point)"""
    prof = [(math.sin(math.pi * k / rings) * 1.0, -math.cos(math.pi * k / rings)) for k in range(rings + 1)]
    K.B.new_group()
    ang = [2 * math.pi * k / segs for k in range(segs)]
    pts = [[c + Vector((rx * r * math.cos(a), ry * r * math.sin(a), rz * t * (1 - squash * (t < 0)))) for a in ang] for r, t in prof]
    for i in range(rings):
        for k in range(segs):
            a, b, cc, d = pts[i][k], pts[i][(k + 1) % segs], pts[i + 1][(k + 1) % segs], pts[i + 1][k]
            if i == 0: K.B.face([a, cc, d], mat, code)
            elif i == rings - 1: K.B.face([a, b, d], mat, code)
            else: K.B.face([a, b, cc, d], mat, code)

def letters_face(corners, cell, s_len, v_len, mat=STONE):
    """a planar quad (4 Blender points, ccw seen from outside: bottom-left, bottom-right, top-right, top-left) lettered from
    the atlas cell: TEXCOORD_0 = (1000 (cell + 1) + s, v) metres on the panel"""
    o = 1000.0 * (cell + 1)
    K.B.face(corners, mat, C_LETTERS, [(o, 0.0), (o + s_len, 0.0), (o + s_len, v_len), (o, v_len)])

# ------------------------------------------------------------------------------------------------ THE PLATFORM
def platform():
    n = 24 if FAR() else 64
    ring = [(PLAT_R * math.cos(2 * math.pi * k / n), PLAT_R * math.sin(2 * math.pi * k / n)) for k in range(n)]
    # a bullnosed edge: the top ring 4 cm in, the face down to 0.35 under the terrace (no gap where the DTM dips)
    inner = [(p[0] * (PLAT_R - 0.04) / PLAT_R, p[1] * (PLAT_R - 0.04) / PLAT_R) for p in ring]
    K.B.new_group()
    for i in range(n):
        a, b = ring[i], ring[(i + 1) % n]; ai, bi = inner[i], inner[(i + 1) % n]
        out = Vector(((a[0] + b[0]) / 2, -(a[1] + b[1]) / 2, 0))
        face_dir([PW(*a, T - 0.35), PW(*b, T - 0.35), PW(*b, PT - 0.04), PW(*a, PT - 0.04)], out, STONE, C_PLINTH)
        face_dir([PW(*a, PT - 0.04), PW(*b, PT - 0.04), PW(*bi, PT), PW(*ai, PT)], out + Vector((0, 0, 1.2)), STONE, C_PLINTH)
    # the top: the ring between the platform's edge and the benches' feet (the octagon + the seat depth)
    feet = octagon((OCT_A + SEAT_D + 0.02) / math.cos(math.pi / 8))
    fill_ring(inner, feet, PT, STONE, C_PLAIN)

def fill_ring(outer, inner, h, mat, code):
    """a flat horizontal ring between two (u, w) loops at height h, facing up"""
    from mathutils.geometry import tessellate_polygon
    K.B.new_group()
    O = ccw_uw(outer); I = list(reversed(ccw_uw(inner)))
    loops = [O, I]
    flat = O + I
    for t in tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in loops]):
        face_dir([PW(*flat[t[0]], h), PW(*flat[t[1]], h), PW(*flat[t[2]], h)], Z, mat, code)

def fill_ring_down(outer, inner, h, mat, code):
    """the same ring facing down (an overhang's underside)"""
    from mathutils.geometry import tessellate_polygon
    K.B.new_group()
    O = ccw_uw(outer); I = list(reversed(ccw_uw(inner)))
    flat = O + I
    for t in tessellate_polygon([[Vector((p[0], p[1], 0)) for p in l] for l in (O, I)]):
        face_dir([PW(*flat[t[0]], h), PW(*flat[t[1]], h), PW(*flat[t[2]], h)], -Z, mat, code)

# ------------------------------------------------------------------------------------------------ THE ENCLOSURE (1948)
def side_frames():
    """the 8 sides: (centre angle, frame on the wall's outer face: s along the side (left -> right seen from outside), d out)"""
    out = []
    for k in range(8):
        th = 2 * math.pi * k / 8                     # side centred on angle th (k = 0: the front, +u)
        n = Vector((math.cos(th), -math.sin(th), 0))  # Blender (u, -w)
        O = PW(OCT_A * math.cos(th), OCT_A * math.sin(th), OY)
        out.append((th, Frame(O, n)))
    return out
SIDE = 2 * OCT_R * math.sin(math.pi / 8)            # 2.33 m

def enclosure():
    outer = octagon(OCT_R); inner = octagon(OCT_R - WALL_T / math.cos(math.pi / 8))
    K.B.new_group()
    # the wall (outer face from the platform to the coping, inner face from the bed down)
    for k, (th, fr) in enumerate(side_frames()):
        hs = SIDE / 2
        # the bench under each side: a solid seat block between the corner blocks
        cb = 0.15                                      # the bench runs on into the corner blocks (their ends hidden inside)
        s0, s1 = -hs + cb, hs - cb
        seat_front = SEAT_D
        ch = 0.0 if FAR() else 0.025
        K.B.new_group()
        fbox(fr, s0, s1, hz(PT - 0.05), hz(SEAT - 0.09), 0.0, seat_front - 0.05, STONE, C_SEAT, skip=("back", "bottom"))
        # the seat slab, a little proud of the block, a chamfered front edge
        fbox(fr, s0, s1, hz(SEAT - 0.09), hz(SEAT - ch), 0.0, seat_front, STONE, C_SEAT, skip=("back", "bottom", "top"))
        sl0 = fr.p(s0, hz(SEAT - ch), seat_front); sl1 = fr.p(s1, hz(SEAT - ch), seat_front)
        sb0 = fr.p(s0, hz(SEAT), 0.0); sb1 = fr.p(s1, hz(SEAT), 0.0)
        if ch:
            st0 = fr.p(s0, hz(SEAT), seat_front - ch); st1 = fr.p(s1, hz(SEAT), seat_front - ch)
            face_dir([sl0, sl1, st1, st0], fr.N + Z, STONE, C_SEAT)
            if k == 0 and not FAR():                   # "1940-1945" carved in the front seat (IMG_0040)
                m0 = fr.p(s0 + 0.18, hz(SEAT), seat_front - ch - 0.06); m1 = fr.p(s1 - 0.18, hz(SEAT), seat_front - ch - 0.06)
                b0 = fr.p(s0 + 0.18, hz(SEAT), 0.05); b1 = fr.p(s1 - 0.18, hz(SEAT), 0.05)
                face_up([st0, st1, sb1, sb0], STONE, C_SEAT) if False else None
                # split the seat top: a lettered strip in the middle (v across the seat, toward the wall)
                L = (s1 - s0) - 0.36
                face_dir([st0, fr.p(s0 + 0.18, hz(SEAT), seat_front - ch), fr.p(s0 + 0.18, hz(SEAT), 0.0), sb0], Z, STONE, C_SEAT)
                face_dir([fr.p(s1 - 0.18, hz(SEAT), seat_front - ch), st1, sb1, fr.p(s1 - 0.18, hz(SEAT), 0.0)], Z, STONE, C_SEAT)
                letters_face([fr.p(s0 + 0.18, hz(SEAT), seat_front - ch), fr.p(s1 - 0.18, hz(SEAT), seat_front - ch),
                              fr.p(s1 - 0.18, hz(SEAT), 0.0), fr.p(s0 + 0.18, hz(SEAT), 0.0)], CELL_YEARS, L, seat_front - ch)
            else:
                face_dir([st0, st1, sb1, sb0], Z, STONE, C_SEAT)
        else:
            face_dir([sl0, sl1, sb1, sb0], Z, STONE, C_SEAT)
        # the back: the wall face above the seat, the names' panel recessed 2 cm in a 6 cm frame
        v0, v1 = hz(SEAT), hz(WALL_TOP - 0.07)
        if FAR():
            fill2d(fr, [rect(-hs, v0, hs, v1)], 0.0, STONE, C_PANEL)
        else:
            pf = 0.07
            outer_r = rect(-hs, v0, hs, v1); hole = rect(-hs + 0.3, v0 + pf, hs - 0.3, v1 - pf)
            fill2d(fr, [outer_r, list(reversed(hole))], 0.0, STONE, C_PANEL)
            strip2d(fr, hole, 0.0, -0.02, STONE, C_PANEL)
            a, b = hole[0], hole[2]
            letters_face([fr.p(a[0], a[1], -0.02), fr.p(b[0], a[1], -0.02), fr.p(b[0], b[1], -0.02), fr.p(a[0], b[1], -0.02)],
                         CELL_BENCH, b[0] - a[0], b[1] - a[1])
    # the coping: ONE octagonal ring slab over the wall (3 cm proud outside and inside), its underside closed
    co = octagon((OCT_A + 0.03) / math.cos(math.pi / 8)); ci = octagon((OCT_A - WALL_T - 0.03) / math.cos(math.pi / 8))
    v1 = WALL_TOP - 0.07
    K.B.new_group()
    for i in range(8):
        a, b = co[i], co[(i + 1) % 8]; ai, bi = ci[i], ci[(i + 1) % 8]
        out = Vector(((a[0] + b[0]), -(a[1] + b[1]), 0))
        face_dir([PW(*a, v1), PW(*b, v1), PW(*b, WALL_TOP), PW(*a, WALL_TOP)], out, STONE, C_CAP)
        face_dir([PW(*ai, v1), PW(*bi, v1), PW(*bi, WALL_TOP), PW(*ai, WALL_TOP)], -out, STONE, C_CAP)
    fill_ring(co, ci, WALL_TOP, STONE, C_CAP)
    fill_ring_down(co, ci, v1, STONE, C_CAP)
    # the wall's inner face (toward the bed) and the bed itself
    K.B.new_group()
    for i in range(8):
        a, b = inner[i], inner[(i + 1) % 8]
        mid = Vector((-(a[0] + b[0]), (a[1] + b[1]), 0))
        face_dir([PW(*a, BED - 0.1), PW(*b, BED - 0.1), PW(*b, WALL_TOP - 0.07), PW(*a, WALL_TOP - 0.07)], mid, STONE, C_PLAIN)
    ped = [(PED[0], PED[1]), (-PED[0], PED[1]), (-PED[0], -PED[1]), (PED[0], -PED[1])]
    fill_ring(inner, ped, BED, SOIL, C_PLAIN)
    corners()
    if not FAR(): railing()
    grasses()

def corners():
    """the corner blocks between the benches: a pedestal at seat height with a small animal (DSC_4602: a frog), the
    pilaster behind it carved with a bouquet of roses (IMG_0040) up to the panel's top"""
    for k in range(8):
        th = 2 * math.pi * (k + 0.5) / 8           # the octagon's vertex between side k and k + 1
        cu, cw = OCT_R * math.cos(th), OCT_R * math.sin(th)
        n = Vector((math.cos(th), -math.sin(th), 0)); t = Z.cross(n)
        c = PW(cu, cw, OY)
        # the low pedestal (seat height + 12 cm), 0.54 wide, out to the seat front + 6 cm
        K.B.new_group()
        box(Vector((c.x, c.y, 0)), t, Z, n, -0.27, 0.27, hz(PT - 0.05), hz(SEAT + 0.12), -0.25, SEAT_D / math.cos(math.pi / 8) * 0.0 + 0.5, STONE, C_PLINTH, skip=("bottom",))
        # the pilaster (corner post) behind it, to the coping
        box(Vector((c.x, c.y, 0)), t, Z, n, -0.2, 0.2, hz(SEAT + 0.12), hz(WALL_TOP - 0.07), -0.25, 0.14, STONE, C_PLINTH, skip=("bottom",))
        if FAR():
            continue
        # the bouquet of roses: a dome of roses over a sheaf of stems, in front of the pilaster's top half
        bc = c + n * 0.2 + Z * (hz(WALL_TOP) - 0.36)
        r2 = random.Random(k)
        lathe_axis(bc + Z * -0.26, Z, n, [(0.05, 0.0), (0.09, 0.1), (0.13, 0.2), (0.0, 0.2)], 8, STONE, C_BOUQUET)   # the sheaf
        for j in range(13):
            ring = 0 if j < 7 else (1 if j < 12 else 2)
            a = 2 * math.pi * (j / 7 if ring == 0 else (j - 7) / 5 + 0.3) + r2.uniform(-0.15, 0.15)
            rr = (0.13, 0.075, 0.0)[ring] + (r2.uniform(-0.008, 0.008) if ring < 2 else 0.0)
            p = bc + t * (rr * math.cos(a)) + n * (rr * math.sin(a) * 0.7 + 0.02) + Z * (0.02 + 0.07 * ring)
            blob(p, 0.055, 0.055, 0.045, STONE, C_BOUQUET, segs=7, rings=4)
        # the animal on the pedestal (alternately a frog and a tortoise; the photos show a frog and leave the rest unclear)
        ac = c + n * 0.3 + Z * hz(SEAT + 0.12)
        if k % 2 == 0:
            blob(ac + Z * 0.07 + n * 0.0, 0.11, 0.1, 0.075, STONE, C_ANIMAL, segs=10, rings=6)          # the body
            blob(ac + Z * 0.11 + n * 0.08, 0.075, 0.07, 0.055, STONE, C_ANIMAL, segs=10, rings=5)       # the head
            for e in (-1, 1):
                blob(ac + Z * 0.15 + n * 0.11 + t * (0.035 * e), 0.02, 0.02, 0.018, STONE, C_ANIMAL, segs=6, rings=3)  # the eyes
                blob(ac + Z * 0.03 + n * -0.02 + t * (0.11 * e), 0.06, 0.045, 0.035, STONE, C_ANIMAL, segs=7, rings=4)  # the haunches
        else:
            blob(ac + Z * 0.05, 0.14, 0.12, 0.07, STONE, C_ANIMAL, segs=12, rings=5)                   # the shell
            blob(ac + Z * 0.04 + n * 0.15, 0.045, 0.04, 0.035, STONE, C_ANIMAL, segs=8, rings=4)       # the head

def railing_rails(V8, h0, h1):
    """the three rails as closed octagonal rings (no box ends overlapping at the corners): a flat bar 35 x 24 mm on top,
    two 20 x 24 mm bars under it"""
    for hh, w_, d_ in ((h1, 0.035, 0.012), (h1 - 0.14, 0.02, 0.012), (h0 + 0.07, 0.02, 0.012)):
        path = [PW(p[0], p[1], hh - w_ / 2) for p in V8] + [PW(V8[0][0], V8[0][1], hh - w_ / 2)]
        sweep3d(path, [(-d_, -w_ / 2), (d_, -w_ / 2), (d_, w_ / 2), (-d_, w_ / 2), (-d_, -w_ / 2)], Z, IRON, C_RAIL, closed=True, caps=False)

def railing():
    """black wrought iron on the coping (IMG_0040, DSC_4594): square posts with a ball finial at every corner and mid-side,
    a top rail, a second rail 14 cm under it with a row of rings between the two, square bars every 12 cm"""
    rc = OCT_A - WALL_T / 2                          # on the coping's centre line
    h0, h1 = WALL_TOP, WALL_TOP + RAIL_H
    rR = rc / math.cos(math.pi / 8)
    V8 = octagon(rR)
    railing_rails(V8, h0, h1)
    for k in range(8):
        a = Vector(V8[k]); b = Vector(V8[(k + 1) % 8])
        A = PW(a.x, a.y, OY); B = PW(b.x, b.y, OY)          # on Blender z = 0: heights added below
        D = (B - A); L = D.length; D.normalize(); S = D.cross(Z)
        for m in (0.0, 0.5):                       # posts at the corner and mid-side
            p = A + D * (L * m)
            wbox(p, D, S, 0.022, 0.022, hz(h0) - 0.02, hz(h1) + 0.031, IRON, C_POST)
            lathe(p + Z * (hz(h1) + 0.03), [(0.0, 0.0), (0.03, 0.012), (0.035, 0.035), (0.02, 0.06), (0.0, 0.07)], 8, IRON, C_FINIAL)
        nb = max(2, int(L / 0.12))
        for j in range(1, nb):
            p = A + D * (L * j / nb)
            if j * 2 == nb: continue                       # (the mid-side post stands there)
            wbox(p, D, S, 0.007, 0.007, hz(h0 + 0.06), hz(h1 - 0.145), IRON, C_RAIL)
        nr = max(2, int(L / 0.14))
        for j in range(nr):
            p = A + D * (L * (j + 0.5) / nr) + Z * (hz(h1 - 0.07))
            lathe_axis(p, S, Z, [(0.055, -0.006), (0.062, -0.006), (0.062, 0.006), (0.055, 0.006), (0.055, -0.006)], 10, IRON, C_RAIL)

def grasses():
    """ornamental grasses in the bed (DSC_4594, summer 2025: pale straw clumps above the railing's foot), each a fan of
    thin wedge blades"""
    rin = OCT_A - WALL_T - 0.15
    n = 10 if FAR() else 34
    r2 = random.Random(48)
    for i in range(n):
        a = 2 * math.pi * (i + r2.random() * 0.6) / n
        rr = r2.uniform(PED[0] * 1.15, rin)
        rr = min(rr, rin / max(abs(math.cos(a)), abs(math.sin(a)), 0.92))
        cu, cw = rr * math.cos(a), rr * math.sin(a)
        if abs(cu) < PED[0] + 0.12 and abs(cw) < PED[1] + 0.12: continue
        c = PW(cu, cw, BED - 0.02)
        nb = 4 if FAR() else 9
        hgt = r2.uniform(0.55, 0.8)
        K.B.new_group()
        for j in range(nb):
            ang = 2 * math.pi * j / nb + r2.random() * 0.5
            lean = r2.uniform(0.15, 0.4)
            d = Vector((math.cos(ang), math.sin(ang), 0))
            b0 = c + d * 0.035
            tip = b0 + d * (lean * hgt) + Z * hgt * r2.uniform(0.85, 1.05)
            side = d.cross(Z).normalized()
            mid = b0 + d * (lean * hgt * 0.35) + Z * (hgt * 0.6)
            # a blade: a thin closed wedge (a 2 cm wide strip with a 6 mm keel behind it), tapering to the tip
            K.B.new_group()
            a0, a1, k0 = b0 - side * 0.01, b0 + side * 0.01, b0 - d * 0.006
            m0, m1, km = mid - side * 0.008, mid + side * 0.008, mid - d * 0.005
            face_dir([a0, a1, m1, m0], d, PLANT, C_PLAIN)
            face_dir([a1, k0, km, m1], (side - d).normalized(), PLANT, C_PLAIN)
            face_dir([k0, a0, m0, km], (-side - d).normalized(), PLANT, C_PLAIN)
            face_dir([m0, m1, tip], d, PLANT, C_PLAIN)
            face_dir([m1, km, tip], (side - d).normalized(), PLANT, C_PLAIN)
            face_dir([km, m0, tip], (-side - d).normalized(), PLANT, C_PLAIN)
            face_dir([a0, k0, a1], -Z, PLANT, C_PLAIN)

# ------------------------------------------------------------------------------------------------ THE OBELISK
def obelisk():
    # the pedestal from under the bed, a chamfered top
    frustum(PED[0], PED[1], PED[0], PED[1], BED - 0.4, PED[2] - 0.08, STONE, C_PLINTH, top=False)
    frustum(PED[0], PED[1], PED[0] - 0.08, PED[1] - 0.08, PED[2] - 0.08, PED[2], STONE, C_PLINTH, top=False)
    fill_ring([(PED[0] - 0.08, PED[1] - 0.08), (-PED[0] + 0.08, PED[1] - 0.08), (-PED[0] + 0.08, -PED[1] + 0.08), (PED[0] - 0.08, -PED[1] + 0.08)],
              [(PLI[0], PLI[1]), (-PLI[0], PLI[1]), (-PLI[0], -PLI[1]), (PLI[0], -PLI[1])], PED[2], STONE, C_PLINTH)
    # the plinth with a cyma moulding at its top (a sweep round the square)
    frustum(PLI[0], PLI[1], PLI[0], PLI[1], PED[2], PLI[2] - 0.12, STONE, C_PLINTH, top=False)
    frustum(PLI[0], PLI[1], PLI[0] + 0.05, PLI[1] + 0.05, PLI[2] - 0.12, PLI[2] - 0.06, STONE, C_PLINTH, top=False)
    frustum(PLI[0] + 0.05, PLI[1] + 0.05, PLI[0] + 0.05, PLI[1] + 0.05, PLI[2] - 0.06, PLI[2], STONE, C_PLINTH, top=False)
    fill_ring([(PLI[0] + 0.05, PLI[1] + 0.05), (-PLI[0] - 0.05, PLI[1] + 0.05), (-PLI[0] - 0.05, -PLI[1] - 0.05), (PLI[0] + 0.05, -PLI[1] - 0.05)],
              [(SHAFT0[0], SHAFT0[1]), (-SHAFT0[0], SHAFT0[1]), (-SHAFT0[0], -SHAFT0[1]), (SHAFT0[0], -SHAFT0[1])], PLI[2], STONE, C_PLINTH)
    shaft()
    # the cap: a cornice slab (chamfered underside), then the upper block the rock stands on
    frustum(SHAFT1[0], SHAFT1[1], CAP1[0], CAP1[1], SHAFT_TOP, SHAFT_TOP + 0.08, STONE, C_CAP, top=False)
    frustum(CAP1[0], CAP1[1], CAP1[0], CAP1[1], SHAFT_TOP + 0.08, CAP1[2], STONE, C_CAP, top=False)
    fill_ring([(CAP1[0], CAP1[1]), (-CAP1[0], CAP1[1]), (-CAP1[0], -CAP1[1]), (CAP1[0], -CAP1[1])],
              [(CAP2[0], CAP2[1]), (-CAP2[0], CAP2[1]), (-CAP2[0], -CAP2[1]), (CAP2[0], -CAP2[1])], CAP1[2], STONE, C_CAP)
    frustum(CAP2[0], CAP2[1], CAP2[0] - 0.02, CAP2[1] - 0.02, CAP1[2], CAP2[2], STONE, C_CAP, top=True)

def shaft():
    """the tapering shaft, each face split in rows / columns so the lettered panel is its own quad: the front carries the
    1914-1918 inscription over the Saint Peter relief, the three others the names (gibberish rows in the atlas: the real
    names are not in our data)"""
    h0, h1 = PLI[2], SHAFT_TOP
    def at(su, sw, h):                             # a point on the shaft at fraction (su, sw) of the half sizes, height h
        f = (h - h0) / (h1 - h0)
        a = SHAFT0[0] + (SHAFT1[0] - SHAFT0[0]) * f; b = SHAFT0[1] + (SHAFT1[1] - SHAFT0[1]) * f
        return PW(su * a, sw * b, h)
    # faces: (outward normal (u, w), the 4 corners' (su, sw) from the viewer's left to right seen from outside)
    faces = [((1, 0), ((1, 1), (1, -1)), CELL_FRONT), ((0, -1), ((1, -1), (-1, -1)), CELL_NAMES_A),
             ((-1, 0), ((-1, -1), (-1, 1)), CELL_NAMES_B), ((0, 1), ((-1, 1), (1, 1)), CELL_NAMES_C)]
    rows = [h0, h0 + 1.25, h0 + 3.2, h1] if not FAR() else [h0, h1]
    K.B.new_group()
    for (nu, nw), (L_, R_), cell in faces:
        out = Vector((nu, -nw, 0))
        for i in range(len(rows) - 1):
            ha, hb = rows[i], rows[i + 1]
            lettered = (not FAR()) and i == 1
            if lettered:
                m = 0.16                                # side margins (fraction of the half width)
                pl = lambda f, h: at(L_[0] + (R_[0] - L_[0]) * f, L_[1] + (R_[1] - L_[1]) * f, h)
                fa, fb = m / 2, 1 - m / 2
                face_dir([pl(0, ha), pl(fa, ha), pl(fa, hb), pl(0, hb)], out, STONE, C_PLAIN)
                face_dir([pl(fb, ha), pl(1, ha), pl(1, hb), pl(fb, hb)], out, STONE, C_PLAIN)
                c = [pl(fa, ha), pl(fb, ha), pl(fb, hb), pl(fa, hb)]
                if newell_dot(c, out) < 0: c = [c[1], c[0], c[3], c[2]]
                letters_face(c, cell, (c[1] - c[0]).length, hb - ha)
            else:
                face_dir([at(*L_, ha), at(*R_, ha), at(*R_, hb), at(*L_, hb)], out, STONE, C_PLAIN)
    if not FAR(): relief()

def newell_dot(pts, v):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n.dot(v)

def relief():
    """Saint Peter, the patron of Uccle, in low relief on the shaft's front under the inscription (heritage.uccle.be):
    a framed plaque, the standing saint (robe, mantle, head, halo, the keys held up) proud of its ground"""
    h0 = PLI[2] + 0.22; h1 = h0 + 0.92
    f = (h0 - PLI[2]) / (SHAFT_TOP - PLI[2])
    a = SHAFT0[0] + (SHAFT1[0] - SHAFT0[0]) * f
    fr = Frame(PW(a, 0.0, OY), Vector((1, 0, 0)))
    # the shaft leans back 0.17 / 3.68 = 2.6 deg: the plaque stands on its own, its back sunk into the shaft
    W = 0.36
    fbox(fr, -W, W, hz(h0), hz(h1), -0.06, 0.035, STONE, C_RELIEF)
    fbox(fr, -W + 0.05, W - 0.05, hz(h0) + 0.05, hz(h1) - 0.05, 0.035, 0.045, STONE, C_RELIEF, skip=("back",)) if False else None
    v = lambda y: hz(h0) + 0.08 + y * (h1 - h0 - 0.16)
    robe = [(-0.13, v(0.0)), (0.13, v(0.0)), (0.1, v(0.45)), (0.12, v(0.62)), (0.09, v(0.74)), (0.05, v(0.78)), (-0.05, v(0.78)),
            (-0.1, v(0.72)), (-0.11, v(0.55)), (-0.09, v(0.45))]
    fill2d(fr, [robe], 0.065, STONE, C_RELIEF); strip2d(fr, robe, 0.035, 0.065, STONE, C_RELIEF, inward=False)
    head = circle(0.0, v(0.86), 0.06, 12)
    fill2d(fr, [head], 0.07, STONE, C_RELIEF); strip2d(fr, head, 0.035, 0.07, STONE, C_RELIEF, inward=False)
    halo = circle(0.0, v(0.87), 0.1, 16)
    fill2d(fr, [halo], 0.045, STONE, C_RELIEF); strip2d(fr, halo, 0.035, 0.045, STONE, C_RELIEF, inward=False)
    keys = [(0.12, v(0.55)), (0.15, v(0.57)), (0.2, v(0.82)), (0.17, v(0.84))]
    fill2d(fr, [keys], 0.06, STONE, C_RELIEF); strip2d(fr, keys, 0.035, 0.06, STONE, C_RELIEF, inward=False)

# ------------------------------------------------------------------------------------------------ THE BRONZE
def statue():
    d = json.load(open(os.path.join(OUT, "statue_far.json" if FAR() else "statue_mesh.json")))
    V_ = [Vector((x, y, z + hz(STATUE_BASE))) for x, y, z in d["verts"]]
    K.B.new_group()
    for f in d["faces"]:
        K.B.face([V_[f[0]], V_[f[1]], V_[f[2]]], BRONZE, C_PLAIN)
    return d

# ------------------------------------------------------------------------------------------------ THE STEPS
def flight(name, line, risers, bottom, top, s_top, width, handrails, run=0.42, cheek=True):
    """a straight flight along the OSM steps line (first point = the top): the top riser at s_top from the line's first
    point, `risers` risers of (top - bottom) / risers, treads `run` deep; a blue-stone nosing on every tread, the tread
    behind it of rubble setts (the photos), solid blocks down 0.5 m into the bank; stone cheek kerbs on both sides
    following the nosing line; handrails (green steel tube on posts) when OSM says so"""
    (ax, az), (bx, bz) = line
    ua, wa = G.local(ax, az); ub, wb = G.local(bx, bz)
    D = Vector((ub - ua, wb - wa)); D.normalize()                 # down the flight (u, w)
    Sx = Vector((-D.y, D.x))                                       # across
    r = (top - bottom) / risers
    n_tr = risers - 1
    s_bot = s_top + n_tr * run                                     # the bottom riser
    def uw(s, x): return (ua + D.x * s + Sx.x * x, wa + D.y * s + Sx.y * x)
    hw = width / 2
    K.B.new_group()
    for k in range(risers):
        # step k from the top: its riser at s = s_top + k * run, its tread from there down the flight to the next riser
        # (the top "tread" is the landing: it reaches back 0.6 m onto the terrace)
        h = top - k * r
        s0 = s_top + k * run - (0.6 if k == 0 else 0.0)            # tread start (upper side)
        s1 = s_top + (k + 1) * run if k < n_tr else s_bot          # its lower edge = the next riser
        if k == n_tr: s1 = s_bot
        # the riser face of step k is at s = s_top + k * run going DOWN to h - r ... the tread of step k is at height h
        # from s_top + (k - 1) * run to s_top + k * run; restate cleanly below
    # cleaner: tread j (j = 0 the landing at `top`, j = risers the ground at the bottom) spans s in [s_j - run, s_j]
    for j in range(risers):
        h = top - j * r                                            # the tread's height
        sa = s_top + (j - 1) * run if j > 0 else s_top - 0.5       # its upper edge (the landing reaches back 0.5 m)
        sb = s_top + j * run                                       # its nosing (the riser down to h - r)
        P_ = lambda s, x, hh: PW(*uw(s, x), hh)
        nose = 0.14
        # the block: top (nosing strip in stone, the rest setts), the riser face, the sides (into the cheeks), down 0.5
        K.B.new_group()
        hb_ = h - r - 0.5
        if FAR():
            face_up([P_(sa, -hw, h), P_(sb, -hw, h), P_(sb, hw, h), P_(sa, hw, h)], STONE, C_TREAD)
        else:
            face_up([P_(sa, -hw, h), P_(sb - nose, -hw, h), P_(sb - nose, hw, h), P_(sa, hw, h)], SETTS, C_TREAD)
            face_up([P_(sb - nose, -hw, h), P_(sb, -hw, h), P_(sb, hw, h), P_(sb - nose, hw, h)], STONE, C_NOSING)
        dn = Vector((D.x, -D.y, 0))                                # Blender direction down the flight
        face_dir([P_(sb, -hw, h - r), P_(sb, hw, h - r), P_(sb, hw, h), P_(sb, -hw, h)], dn, STONE, C_RISER)
        if j == risers - 1:                                        # the bottom riser goes on down into the ground
            face_dir([P_(sb, -hw, hb_), P_(sb, hw, hb_), P_(sb, hw, h - r), P_(sb, -hw, h - r)], dn, STONE, C_RISER)
        if j == 0:                                                 # the landing's back edge (buried in the terrace)
            face_dir([P_(sa, -hw, hb_), P_(sa, hw, hb_), P_(sa, hw, h), P_(sa, -hw, h)], -dn, STONE, C_PLAIN)
        for x, sgn in ((-hw, -1), (hw, 1)):
            sd = Vector((Sx.x, -Sx.y, 0)) * sgn
            face_dir([P_(sa, x, hb_), P_(sb, x, hb_), P_(sb, x, h), P_(sa, x, h)], sd, STONE, C_PLAIN)
    # the cheek kerbs: 0.22 wide, their top 0.12 over the nosing line, from the landing to the ground at the foot
    if cheek:
        for sgn in (-1, 1):
            x0, x1 = (hw - 0.03, hw + 0.22) if sgn > 0 else (-hw - 0.22, -hw + 0.03)   # 3 cm into the steps: no face shared with their sides
            pts = [(s_top - 0.42, top + 0.12), (s_top, top + 0.12), (s_bot, bottom + r + 0.12), (s_bot + 0.35, bottom + 0.1)]
            K.B.new_group()
            for i in range(len(pts) - 1):
                (sa, ha), (sb, hb) = pts[i], pts[i + 1]
                for x, sg in ((x0, -1), (x1, 1)):
                    sd = Vector((Sx.x, -Sx.y, 0)) * sg
                    face_dir([PW(*uw(sa, x), ha - 0.7), PW(*uw(sb, x), hb - 0.7), PW(*uw(sb, x), hb), PW(*uw(sa, x), ha)], sd, STONE, C_KERB)
                face_dir([PW(*uw(sa, x0), ha), PW(*uw(sb, x0), hb), PW(*uw(sb, x1), hb), PW(*uw(sa, x1), ha)], Z, STONE, C_KERB)
            for (s_, h_), sg in ((pts[0], -1), (pts[-1], 1)):
                dn = Vector((D.x, -D.y, 0)) * sg
                face_dir([PW(*uw(s_, x0), h_ - 0.7), PW(*uw(s_, x1), h_ - 0.7), PW(*uw(s_, x1), h_), PW(*uw(s_, x0), h_)], dn, STONE, C_KERB)
    rails = []
    if handrails:
        for sgn in (-1, 1):
            x = sgn * (hw + 0.11)
            # posts on the cheeks every ~1.6 m, the rail 0.9 over the nosing line, level ends 0.3 m past the flight
            ends = [(s_top - 0.35, top + 0.12), (s_bot + 0.3, bottom + r + 0.12 - 0.1)]
            post_s = [s_top - 0.25, s_top + (s_bot - s_top) * 0.5, s_bot + 0.2]
            def hline(s):
                if s <= s_top: return top
                if s >= s_bot: return bottom + r
                return top + (s - s_top) / (s_bot - s_top) * (bottom + r - top)
            for ps in post_s:
                base = hline(ps) + 0.12
                p0 = PW(*uw(ps, x), base - 0.08); p1 = PW(*uw(ps, x), hline(ps) + 0.9)
                lathe_axis(p0, p1 - p0, Vector((1, 0, 0)), [(0.024, 0.0), (0.024, (p1 - p0).length - 0.012)], 8 if not FAR() else 4, GREEN, C_POST, cap_top=True, cap_bottom=True)
            path = [PW(*uw(s_top - 0.35, x), top + 0.9), PW(*uw(s_top, x), top + 0.9), PW(*uw(s_bot, x), bottom + r + 0.9), PW(*uw(s_bot + 0.3, x), bottom + r + 0.9)]
            prof = [(0.024 * math.cos(2 * math.pi * k / 8), 0.024 * math.sin(2 * math.pi * k / 8)) for k in range(9)] if not FAR() else \
                   [(0.024 * math.cos(2 * math.pi * k / 4), 0.024 * math.sin(2 * math.pi * k / 4)) for k in range(5)]
            sweep3d(path, prof, Z, GREEN, C_RAIL, caps=True)
            rails.append([[round(v_.x, 3), round(v_.y, 3), round(v_.z + OY, 3)] for v_ in path])
    # the carve the tile worker applies to the terrain under the flight (heros.json "carves"): below the line through the
    # nosings minus 8 cm; the footprint incl. the cheeks
    xw = hw + (0.22 if cheek else 0.0)
    ring = [G.city(*uw(s_top - 0.5, -xw)), G.city(*uw(s_bot + 0.35, -xw)), G.city(*uw(s_bot + 0.35, xw)), G.city(*uw(s_top - 0.5, xw))]
    o = G.city(*uw(s_top, 0.0)); e = G.city(*uw(s_bot, 0.0))
    return dict(name=name, risers=risers, riser_m=round(r, 3), run_m=run, width_m=width, top=top, bottom=bottom,
                carve=dict(ring=[[round(p[0], 3), round(p[1], 3)] for p in ring], from_=[round(o[0], 3), round(o[1], 3)], to=[round(e[0], 3), round(e[1], 3)],
                           h_from=round(top - 0.08, 3), h_to=round(bottom + r - 0.08, 3), floor=round(bottom - 0.05, 3)),
                handrails_blender=rails)

STEPS = SITE["steps"]
def all_steps():
    # south: 12 risers from the terrace (50.40 at the top of the OSM line) down to the dolomite path at 48.32 (DTM profile
    # along the line: 50.33 at +0.5 m, 48.34 at +5 m); 3.0 m wide, handrails both sides (OSM handrail=yes; photo c5)
    s = STEPS["w1154611802"]
    a = flight("south", s["line"], 12, 48.32, 50.40, 0.35, 3.0, True)
    # west: 4 risers from the Avenue Brugmann sidewalk (51.15) down to the path (50.52), 2.4 m wide, no handrail (OSM)
    w = STEPS["w1154611806"]
    b = flight("west", w["line"], 4, 50.52, 51.15, 0.45, 2.4, False)
    return [a, b]

def build_all():
    platform()
    enclosure()
    obelisk()
    st = statue()
    flights = all_steps()
    return st, flights

STAT, FLIGHTS = build_all()
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

obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "Heros", B_MAIN, 0.0, AO_SPLIT, AO_PX)
far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "Heros_far", B_FAR, AO_SPLIT + 0.005, 1.0, AO_PX)
def sharpen(o):
    """the bronze smooth (edges under 30 deg), its stretched triangles flat (all their edges sharp: meshopt leaves slivers
    on the thin parts, whose smooth corner normals streak); everything else sharp above 2.5 deg"""
    import bmesh
    me = o.data
    bronze = [i for i, m in enumerate(me.materials) if m and m.name == "bronze_gilt"]
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    n = 0
    for e in bm.edges:
        lf = e.link_faces
        if len(lf) != 2: e.smooth = False; continue
        ang = lf[0].normal.angle(lf[1].normal, 0.0)
        isb = lf[0].material_index in bronze and lf[1].material_index in bronze
        if ang > math.radians(30.0 if isb else 2.5): e.smooth = False; n += 1   # (stone: the platform's 64 segments read as its cut stones)
    for f in bm.faces:
        if f.material_index not in bronze or len(f.verts) != 3: continue
        L = [e.calc_length() for e in f.edges]
        if max(L) > 0 and f.calc_area() * 2 / max(L) < max(L) / 5.0:
            for e in f.edges: e.smooth = False
    bm.to_mesh(me); bm.free()
    print(f"  {o.name}: {n} sharp edges by angle")
for o in (obj, far): sharpen(o)
print(f"uv done {time.time() - T0:.1f}s")

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

scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 2.0
ao_img = bpy.data.images.new("heros_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
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
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices: c[4 * li + 1] = max(0.25, min(1.0, a[4 * li]))
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])

if BAKE:
    scn.cycles.samples = 96 if "--fast" not in ARGS else 24
    scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)   # half the CPU: another agent shares this laptop
    t = time.time()
    objs = [obj, far]
    for i, target in enumerate(objs):
        for o in objs: o.hide_render = o is not target
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
    print(f"AO bake {time.time() - t:.1f}s")
    for target, th in ((obj, thin0), (far, thin1)):
        for o in objs: o.hide_render = o is not target
        vertex_ao(target, th)
    for o in objs: o.hide_render = False
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "heros_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "heros_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "heros.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

# the colliders the city builds from what is drawn (viewer/heros/herosCity.js): the round platform (a low step the walker
# climbs), the enclosure (benches + wall + railing: one octagonal solid to the railing's top), the obelisk (pedestal box,
# shaft box), the statue's rock + bronze (a box), the steps (their treads: the walker reads the LOD0 mesh), the handrails
bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
mon_bx = [p.x for p, m in zip(B_MAIN.v, [0] * len(B_MAIN.v))]
info = {
    "asset": "Square des Heros: the war memorial (L. Grandmoulin 1925, enlarged 1948) and the two flights of steps (tools/blender/heros.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"bronze_gilt": "gilded bronze, the gilding worn to dark bronze in the hollows (photos 2010s-2025)",
                       "cast_iron_black": "black-painted wrought iron (the enclosure's railing)",
                       "soil_bed": "the planted bed's soil", "plant_grass": "ornamental grass blades (straw-green)"},
    "uv": {"TEXCOORD_0": "world metres, per face; lettered faces (code 'letters'): 1000 (cell + 1) + s, v (metres on the panel)",
           "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "letters_cells": ["front: the 1914-1918 inscription", "names A", "names B", "names C", "bench backs: names 1940-1945", "1940-1945 (front seat)"],
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 1.0], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1)},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                  "hides_solids": ["https://databrussels.be/id/buildingsolid/534309"], "hides_bu_ids": []},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "levels_taw": {"terrace": T, "platform": PT, "seat": SEAT, "wall_top": WALL_TOP, "railing_top": WALL_TOP + RAIL_H, "bed": BED,
                   "pedestal": PED[2], "plinth": PLI[2], "shaft_top": SHAFT_TOP, "cap": CAP2[2], "statue_top": round(STATUE_BASE + STAT["height"], 2)},
    "sizes": {"platform_r": PLAT_R, "octagon_r": round(OCT_R, 3), "octagon_apothem": round(OCT_A, 3), "wall_t": WALL_T, "seat_d": SEAT_D,
              "pedestal_half": PED[:2], "plinth_half": PLI[:2], "shaft_half": [SHAFT0, SHAFT1], "cap_half": [CAP1[:2], CAP2[:2]]},
    "colliders": {"platform": {"r": PLAT_R, "top": PT},
                  "enclosure": {"r": round(OCT_R + SEAT_D / math.cos(math.pi / 8) * 0.0 + 0.5, 3), "top": round(WALL_TOP + RAIL_H, 2), "seat": SEAT, "seat_r": round((OCT_A + SEAT_D) / math.cos(math.pi / 8), 3)},
                  "obelisk": {"half": PED[:2], "top": CAP2[2]}, "statue": {"half": [0.75, 1.5], "bottom": CAP2[2], "top": round(STATUE_BASE + STAT["height"], 2)}},
    "flights": FLIGHTS,
    "measured": {"frame": FR, "octagon_city": MON["wall_city"], "obelisk_base_city": MON["base_city"], "dsm_top": MON["dsm_top"], "terrace": MON["terrace"], "steps": STEPS},
    "estimated": "every height above the terrace except the obelisk's top (DSM 57.34: the shaft + cap modelled to 57.13, the rock and bronze "
                 "over it), the platform (one low step, r 4.05 from the DSM ring), the benches' depth and height, the railing's pattern and "
                 "height, the obelisk's sections and taper, the relief and the animals' forms, the bronze group's size (~3.8 m) and pose, "
                 "the steps' width (3.0 / 2.4 m), riser counts from OSM, levels from the DTM profiles",
}
json.dump(info, open(os.path.join(OUT, "heros.json"), "w"), indent=1)

if PREVIEWS:
    cols = {"stone_blue": (0.1, 0.11, 0.12), "bronze_gilt": (0.45, 0.32, 0.12), "cast_iron_black": (0.02, 0.02, 0.02), "cast_iron_green": (0.02, 0.06, 0.04),
            "soil_bed": (0.06, 0.045, 0.03), "plant_grass": (0.35, 0.33, 0.18), "cobbles": (0.12, 0.12, 0.11)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.35 if m.name == "bronze_gilt" else 0.8
        if m.name in ("bronze_gilt",): bsdf.inputs["Metallic"].default_value = 0.9
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(200))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 32; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, tgt, lens=28, res=(800, 1000)):
        cam.location = P(*pos); tg = P(*tgt)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 88; scn.render.filepath = os.path.join(PREV, f"blender_{name}.jpg")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    only = [a.split("=")[1] for a in ARGS if a.startswith("--views=")]
    views = {"steps": ((14.5, 0.4, 49.9), (0.0, 0.0, 54.0), 28, (800, 1000)),
             "threequarter": ((9.0, -7.0, 52.2), (0.0, 0.0, 53.5), 28, (1000, 850)),
             "enclosure": ((5.2, -2.6, 52.0), (2.6, 0.0, 51.4), 30, (1000, 750)),
             "aerial": ((16.0, 14.0, 66.0), (2.0, 0.0, 51.0), 26, (1000, 800)),
             "top": ((3.0, 0.0, 90.0), (3.0, 0.01, 50.0), 30, (900, 900))}
    for k, (pos, tgt, lens, res) in views.items():
        if only and k not in only[0].split(","): continue
        look(k, pos, tgt, lens, res)
print(f"done {time.time() - T0:.1f}s")
