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

SLOTS = ["stone_blue", "bronze_gilt", "cast_iron_black", "cast_iron_green", "soil_bed", "plant_grass"]
STONE, BRONZE, IRON, GREEN, SOIL, PLANT = range(6)
CODES = ["plain", "panel", "letters", "nosing", "riser", "tread", "kerb", "relief", "bouquet", "animal", "rail", "post",
         "finial", "cap", "plinth", "seat"]
(C_PLAIN, C_PANEL, C_LETTERS, C_NOSING, C_RISER, C_TREAD, C_KERB, C_RELIEF, C_BOUQUET, C_ANIMAL, C_RAIL, C_POST,
 C_FINIAL, C_CAP, C_PLINTH, C_SEAT) = range(16)
FAR = lambda: K.FAR
# codes re-used with a slot-specific meaning (16 codes max in COLOR_0.r): on plant_grass "finial" = a flower head; on
# cast_iron_green "panel" = lantern glass, "cap" = the floodlight's grey housing, "seat" = a bin's red band
C_BLOOM, C_GLASS, C_HOUSING, C_BAND = 12, 1, 13, 15

# ------------------------------------------------------------------------------------------------ LEVELS (m TAW)
# the terrace: DTM 50.46-50.60 at 4.5-6 m round the centre (median 50.55); the DSM shows the platform ring at ~3.6-4.1 m
# (50.9-51.2 smoothed) and the wall + railing at 51.9-52.0 (r 2.6-3.1), the obelisk's top 57.34 (0.5 m cells: the bronze
# lost); the photos (heritage.uccle.be DSC_4594, IMG_0040; Commons "Square Heros Bxl 01") give the rest in proportion
T = 50.55                        # terrace (the dolomite round the platform)
PT = T + 0.16                    # the round platform's top (one low step, bullnosed)
PLAT_R = SITE.get("platform_r", 4.05)
SEAT = PT + 0.45                 # the 1948 benches' seats
WALL_TOP = PT + 1.08             # the benches' backs = the names' panels; coping on top
RAIL_H = 0.62                    # the railing over the coping (the owner's photo: low, dark green, spear-topped bars)
BED = WALL_TOP - 0.16            # the soil inside the enclosure
OCT_R = sum(MON["wall_radius"]) / 2      # 3.04: the OSM octagon (outer wall face), vertices at 22.5 + 45 k degrees
OCT_A = OCT_R * math.cos(math.pi / 8)    # its apothem 2.81
WALL_T = 0.36
SEAT_D = 0.42
# the obelisk (OSM base 2.38 x 2.25; the owner's photos 2026-11: a stout tapering shaft of four stones (a plain top stone,
# the French inscription, the Dutch one, the Saint Peter relief), its moulded plinth just over the railing's top, a thin
# cap slab under the rock; shaft ~2.7 x as tall as wide at the top, taper ~0.89)
PED = (1.17, 1.11, PT + 1.45)    # half sizes u, w; top
PLI = (0.98, 0.93, PT + 1.95)
SHAFT0, SHAFT1 = (0.84, 0.79), (0.74, 0.69)
SHAFT_TOP = PT + 6.2
JOINTS = [PLI[2] + 1.25, PLI[2] + 2.25, PLI[2] + 3.25]     # the bed joints: relief / NL / FR / top stones
CAP1 = (0.8, 0.75, SHAFT_TOP + 0.18)
CAP2 = (0.7, 0.65, SHAFT_TOP + 0.24)
STATUE_BASE = CAP2[2]            # 57.15 (DSM 57.34 with the rock's foot)
STATUE_H = 4.5                   # the bronze group incl. its rock, cap top -> the raised wing's tip: ~4.5 m (the owner's
                                 # photos: 1.0-1.15 x the visible shaft, 3.0-3.2 x the shaft's top width; Commons C2)
ROCK_H = 0.36                    # the rock under the bronze: grey stone in the photos (not gilded)

# THE LETTERING CELLS (tools/heros_letters.py draws them; textures/heros/heros_letters.json lists the ones with text):
# fixed indices; every one is a lettered face in the model from the start, so names can be engraved later without
# rebuilding the model (a cell absent from the atlas reads as plain stone)
CELL_NAMES = ["front_fr", "front_nl", "years", "shaft_w_1", "shaft_w_2", "shaft_n_1", "shaft_n_2", "shaft_e_1", "shaft_e_2"] + \
             [f"bench_{k}" for k in range(8)]
CELL = {n: i for i, n in enumerate(CELL_NAMES)}
CELL_SIZES = {}                  # name -> (s, v) metres, filled while building LOD0

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

def letters_face(corners, cell, s_len, v_len, mat=STONE, out=None):
    """a planar quad lettered from the atlas cell, read from in front: corners = bottom-left, bottom-right, top-right,
    top-left SEEN FROM OUTSIDE (`out` = the outward normal: the order is checked against it, s must run to the reader's
    right = Z x out, and the face must face out). TEXCOORD_0 = (1000 (cell + 1) + s, v) metres on the panel. The glTF
    exporter writes v' = 1 - v: written here as 1 - v so the file carries v (the reader's up)."""
    bl, br, tr, tl = corners
    if out is not None:
        right = Z.cross(out) if abs(out.z) < 0.9 else Vector((1, 0, 0))   # (a horizontal face: s along the given order)
        if abs(out.z) < 0.9 and (br - bl).dot(right) < 0: bl, br, tr, tl = br, bl, tl, tr
        assert newell_dot([bl, br, tr, tl], out) > 0, "lettered face wound inward"
    if isinstance(cell, str):
        CELL_SIZES[cell] = (round(s_len, 4), round(v_len, 4)); cell = CELL[cell]
    o = 1000.0 * (cell + 1)
    # METRIC planar UVs (s along the bottom edge, v up the face, both in metres from the bottom-left corner): a tapered
    # (trapezoid) face keeps the letters undistorted (corner-pinned UVs sheared one of its two triangles: italic letters);
    # the narrower top only trims the cell's margins
    R = (br - bl).normalized(); nrm_ = R.cross(tl - bl).cross(R).normalized()      # (in the face's plane, toward its top)
    uvs = [(o + (p - bl).dot(R), 1.0 - (p - bl).dot(nrm_)) for p in (bl, br, tr, tl)]
    K.B.face([bl, br, tr, tl], mat, C_LETTERS, uvs)

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
                              fr.p(s1 - 0.18, hz(SEAT), 0.0), fr.p(s0 + 0.18, hz(SEAT), 0.0)], "years", L, seat_front - ch, out=Z)
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
            # the names' panel: a lettered face (cell bench_k) from the start; uninscribed until models/heros/names.json
            # has the names (tools/heros_letters.py), then they read without rebuilding the model
            hs0, hv0, hs1, hv1 = -hs + 0.3, v0 + pf, hs - 0.3, v1 - pf
            letters_face([fr.p(hs0, hv0, -0.02), fr.p(hs1, hv0, -0.02), fr.p(hs1, hv1, -0.02), fr.p(hs0, hv1, -0.02)],
                         f"bench_{k}", hs1 - hs0, hv1 - hv0, out=fr.N)
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
    """the corner blocks between the benches: a low pedestal at seat height carrying a carved bouquet of roses (the
    owner's photo, C2; IMG_0040) or, on the two back corners, a small animal (DSC_4602: a frog), a pilaster behind"""
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
        # the corner pieces (the owner's photo from the steps, Commons C2: the carved "pineapple" bouquets of roses sit ON
        # the low corner pedestals, their crowns near the coping; H4: a frog on its block): bouquets on the six front and
        # side corners, the frog and a tortoise on the two back ones
        top = c + Z * hz(SEAT + 0.12)
        if k in (3, 4):
            ac = top + n * 0.3
            if k == 3:
                blob(ac + Z * 0.07, 0.11, 0.1, 0.075, STONE, C_ANIMAL, segs=10, rings=6)                    # the body
                blob(ac + Z * 0.11 + n * 0.08, 0.075, 0.07, 0.055, STONE, C_ANIMAL, segs=10, rings=5)       # the head
                for e in (-1, 1):
                    blob(ac + Z * 0.15 + n * 0.11 + t * (0.035 * e), 0.02, 0.02, 0.018, STONE, C_ANIMAL, segs=6, rings=3)  # the eyes
                    blob(ac + Z * 0.03 + n * -0.02 + t * (0.11 * e), 0.06, 0.045, 0.035, STONE, C_ANIMAL, segs=7, rings=4)  # the haunches
            else:
                blob(ac + Z * 0.05, 0.14, 0.12, 0.07, STONE, C_ANIMAL, segs=12, rings=5)                   # the shell
                blob(ac + Z * 0.04 + n * 0.15, 0.045, 0.04, 0.035, STONE, C_ANIMAL, segs=8, rings=4)       # the head
        else:
            rose_bouquet(top + n * 0.27 + Z * 0.255, n, t)

def rose_bouquet(bc, n, t, segs=42, rings=24):
    """a carved bouquet round the vertical axis through bc: a fluted sheaf (z -0.26..-0.04) under a scalloped dome
    (z -0.04..0.2), r(theta, z) modulated by 7 rose lobes round the waist and 4 + 1 over the crown; one closed lathe-like
    grid (top closed by a fan, bottom by a cap); flattened a little against the pilaster (n: out of it)"""
    K.B.new_group()
    def r_at(th, z):
        # the photos: a tall egg of rose heads in staggered tiers, the stems gathered into a narrow sheaf that FLARES into
        # it (no undercut: a mushroom read came from a thin stem under a wide cap)
        if z < -0.1:                                           # the sheaf: 0.05 at the foot flaring to the head, 10 flutes
            f = (z + 0.26) / 0.16
            return (0.05 + 0.055 * f ** 1.6) * (1 + 0.07 * math.cos(10 * th)), z
        f = (z + 0.1) / 0.36                                   # the head: 0 at the sheaf, 1 at the crown
        prof = 0.165 * math.sin(math.pi * (0.13 + 0.87 * f)) ** 0.55 + 0.003   # an egg: ~0.1 at the sheaf, 0.165 wide, closed at the crown
        # rose heads: 4 staggered tiers of 7, each a round bump (raised-cosine in angle and height), a spiral groove each
        tier = f * 4.0
        i = min(3, int(tier)); ft = tier - i
        ang = 7 * th + i * math.pi                              # staggered by half a head per tier
        head = (0.5 + 0.5 * math.cos(ang)) * math.sin(math.pi * ft)
        groove = 1 - 0.035 * math.sin(3 * ang + 9 * ft) * head
        return prof * (1 + 0.14 * math.sqrt(head)) * groove, z   # (sqrt: round heads, not spikes)
    zs = [-0.26 + 0.16 * k / 3 for k in range(4)] + [-0.1 + 0.36 * k / 24 for k in range(1, 25)]
    grid = []
    for z in zs:
        row = []
        for k in range(segs):
            th = 2 * math.pi * k / segs
            r, zz = r_at(th, z)
            d = t * math.cos(th) + n * (math.sin(th) * (0.75 if math.sin(th) < 0 else 1.0))
            row.append(bc + d * r + Z * zz)
        grid.append(row)
    cen = bc + Z * (zs[-1] + 0.006)
    for i in range(len(grid) - 1):
        for k in range(segs):
            a, b, c2, d2 = grid[i][k], grid[i][(k + 1) % segs], grid[i + 1][(k + 1) % segs], grid[i + 1][k]
            mid = (a + b + c2 + d2) / 4
            face_dir([a, b, c2, d2], mid - (bc + Z * ((zs[i] + zs[i + 1]) / 2)), STONE, C_BOUQUET)
    for k in range(segs):
        face_dir([grid[-1][k], grid[-1][(k + 1) % segs], cen], Z, STONE, C_BOUQUET)
    face_dir([grid[0][k] for k in range(segs)], -Z, STONE, C_BOUQUET)

def railing_rails(V8, h0, h1):
    """the two rails as closed octagonal rings (no box ends overlapping at the corners): a flat bar 40 x 14 mm under the
    spear tips, a 30 x 12 mm bottom rail 8 cm over the coping"""
    for hh, w_, d_ in ((h1 - 0.02, 0.04, 0.0105), (h0 + 0.08, 0.03, 0.0105)):     # (thicker than the 15 mm bars: they end inside)
        path = [PW(p[0], p[1], hh - w_ / 2) for p in V8] + [PW(V8[0][0], V8[0][1], hh - w_ / 2)]
        sweep3d(path, [(-d_, -w_ / 2), (d_, -w_ / 2), (d_, w_ / 2), (-d_, w_ / 2), (-d_, -w_ / 2)], Z, GREEN, C_RAIL, closed=True, caps=False)

def spear(p, D, S, r, z0, h):
    """a spear tip on a bar: a square pyramid with a collar (4 + 4 faces), its base buried in the bar's top"""
    K.B.new_group()
    c = [p + D * (r * a) + S * (r * b) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    q = [p + D * (r * 1.7 * a) + S * (r * 1.7 * b) for a, b in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    tip = p + Z * (z0 + h)
    face_dir([x + Z * (z0 - 0.01) for x in c], -Z, GREEN, C_FINIAL)
    for i in range(4):
        a, b = c[i], c[(i + 1) % 4]; qa, qb = q[i], q[(i + 1) % 4]
        out = ((a + b) / 2 - p); out.z = 0
        face_dir([a + Z * (z0 - 0.01), b + Z * (z0 - 0.01), qb + Z * (z0 + h * 0.3), qa + Z * (z0 + h * 0.3)], out + Z * 0.3, GREEN, C_FINIAL)
        face_dir([qa + Z * (z0 + h * 0.3), qb + Z * (z0 + h * 0.3), tip], out + Z * 0.6, GREEN, C_FINIAL)

def railing():
    """the railing on the coping (the owner's photo from the steps, C2 2025): dark green painted iron, square posts with a
    ball finial at every corner and mid-side, round bars every 11 cm rising 8 cm over the top rail to spear tips, a top
    and a bottom rail (no row of rings any more: the 2025 railing has plain bars)"""
    rc = OCT_A - WALL_T / 2                          # on the coping's centre line
    h0, h1 = WALL_TOP, WALL_TOP + RAIL_H
    rR = rc / math.cos(math.pi / 8)
    V8 = octagon(rR)
    railing_rails(V8, h0, h1)
    for k in range(8):
        a = Vector(V8[k]); b = Vector(V8[(k + 1) % 8])
        A = PW(a.x, a.y, OY); B = PW(b.x, b.y, OY)          # on Blender z = 0: heights added below
        D = (B - A); L = D.length; D.normalize(); S = D.cross(Z)
        for m in (0.0, 0.5):                       # posts at the corner and mid-side, a little taller, a ball on a neck
            p = A + D * (L * m)
            wbox(p, D, S, 0.02, 0.02, hz(h0) - 0.02, hz(h1) + 0.09, GREEN, C_POST)
            lathe(p + Z * (hz(h1) + 0.089), [(0.0, 0.0), (0.026, 0.0), (0.026, 0.012), (0.012, 0.02), (0.012, 0.03), (0.026, 0.042),
                                            (0.03, 0.06), (0.024, 0.078), (0.0, 0.088)], 10, GREEN, C_FINIAL)
        nb = max(2, round(L / 0.11))
        for j in range(1, nb):
            p = A + D * (L * j / nb)
            if abs(L * j / nb - L / 2) < 0.05: continue     # (the mid-side post stands there)
            lathe_axis(p + Z * (hz(h0) + 0.07), Z, Vector((1, 0, 0)), [(0.0075, 0.0), (0.0075, RAIL_H - 0.07 + 0.06)], 6, GREEN, C_FINIAL,
                       cap_top=True, cap_bottom=True)    # ("finial" on the iron: the round, smooth-shaded parts)
            spear(p, D, S, 0.0055, hz(h1) + 0.06, 0.07)

def grasses():
    """the flower bed (the owner's photo from the steps: low bedding plants filling the bed inside the railing, orange and
    yellow marigolds, red begonias, ~0.2-0.3 m): overlapping low leafy mounds (the shader dots them with flowers from
    above) with a few flower heads each; far: fewer, bigger mounds, no heads"""
    rin = OCT_A - WALL_T - 0.08
    r2 = random.Random(48)
    pitch = 0.62 if FAR() else 0.34
    pts = []
    for i in range(-12, 13):
        for j in range(-12, 13):
            u = (i + (0.5 if j % 2 else 0.0)) * pitch + r2.uniform(-0.08, 0.08); w = j * pitch * 0.866 + r2.uniform(-0.08, 0.08)
            a = math.atan2(w, u); r = math.hypot(u, w)
            # inside the inner octagon (apothem rin), outside the pedestal (+ 8 cm)
            ap = max(abs(math.cos(a - math.pi / 4 * round(a / (math.pi / 4)))), 1e-3)
            if r * ap > rin - 0.12 or (abs(u) < PED[0] + 0.1 and abs(w) < PED[1] + 0.1): continue
            pts.append((u, w))
    for (u, w) in pts:
        rr = r2.uniform(0.22, 0.28) * (1.4 if FAR() else 1.0)
        hh = r2.uniform(0.1, 0.16)
        c = PW(u, w, BED)
        # a low dome (its foot 3 cm into the soil), smooth shaded: the shader dots it with round flowers from above
        foot = -(0.025 + 0.0012 * pts.index((u, w)))     # (every foot at its own depth, 1.2 mm apart: no coplanar bottoms)
        prof = [(rr, foot), (rr * 0.97, hh * 0.3), (rr * 0.8, hh * 0.65), (rr * 0.45, hh * 0.93), (0.0, hh)]
        ns = 6 if FAR() else 9
        lathe(c, prof if not FAR() else [prof[0], prof[2], prof[4]], ns, PLANT, C_PLAIN)
        face_dir([c + Vector((rr * math.cos(2 * math.pi * k / ns), rr * math.sin(2 * math.pi * k / ns), foot)) for k in range(ns)], -Z, PLANT, C_PLAIN)
        if FAR(): continue
        for q in range(2):                       # a couple of heads standing proud of the mound
            ang = r2.uniform(0, 2 * math.pi); rad = r2.uniform(0.0, 0.6) * rr
            z = hh * math.sqrt(max(0.0, 1 - (rad / rr) ** 2)) + 0.002
            hc = c + Vector((math.cos(ang) * rad, math.sin(ang) * rad, z))
            blob(hc, 0.026, 0.026, 0.015, PLANT, C_BLOOM, segs=5, rings=2)

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
    """the tapering shaft as its four stones (the owner's photos): bed joints as V grooves (1.6 cm wide, 8 mm deep) all
    round; every stone face a quad of its own. The front: the top stone plain, the French inscription with 1914-1918 on
    the next, the Dutch one under it, the Saint Peter relief on the lowest; the three other faces (the names of the 138
    dead of 1914-1918 in reality) carry LETTERED faces on their two middle stones (cells shaft_<w|n|e>_<1|2>): blank
    until models/heros/names.json has the names"""
    h0, h1 = PLI[2], SHAFT_TOP
    def half(h):
        f = (h - h0) / (h1 - h0)
        return SHAFT0[0] + (SHAFT1[0] - SHAFT0[0]) * f, SHAFT0[1] + (SHAFT1[1] - SHAFT0[1]) * f
    def at(su, sw, h, inset=0.0):                  # a point on the shaft at the corner signs (su, sw), height h
        a, b = half(h)
        return PW(su * (a - inset), sw * (b - inset), h)
    # faces: (outward normal (u, w), the corners' signs from the viewer's left to right seen from outside, cells per stone)
    faces = [((1, 0), ((1, 1), (1, -1)), [None, "front_nl", "front_fr", None]),
             ((0, -1), ((1, -1), (-1, -1)), [None, "shaft_e_2", "shaft_e_1", None]),
             ((-1, 0), ((-1, -1), (-1, 1)), [None, "shaft_n_2", "shaft_n_1", None]),
             ((0, 1), ((-1, 1), (1, 1)), [None, "shaft_w_2", "shaft_w_1", None])]
    g, dg = 0.008, 0.008
    if FAR():
        rings = [(h0, 0.0), (h1, 0.0)]; stones = [(0, 1, 0)]
    else:
        rings = [(h0, 0.0)]
        for j in JOINTS: rings += [(j - g, 0.0), (j, dg), (j + g, 0.0)]
        rings.append((h1, 0.0))
        stones = [(0, 1, 0), (3, 4, 1), (6, 7, 2), (9, 10, 3)]        # (ring index lo, hi, stone k) of each stone's face
    K.B.new_group()
    for (nu, nw), (L_, R_), cells in faces:
        out = Vector((nu, -nw, 0))
        for i in range(len(rings) - 1):
            (ha, ia), (hb, ib) = rings[i], rings[i + 1]
            st = next((k for lo, hi, k in stones if lo == i), None)
            q = [at(*L_, ha, ia), at(*R_, ha, ia), at(*R_, hb, ib), at(*L_, hb, ib)]
            if st is None:                              # a groove face (slanted in or out)
                face_dir(q, out + Z * (1.0 if ib > ia else -1.0), STONE, C_PLAIN)
            elif not FAR() and cells[st]:
                letters_face(q, cells[st], (q[1] - q[0]).length, hb - ha, out=out)
            elif not FAR() and st == 0 and nu == 1:
                relief_stone(q, out, ha, hb)
            else:
                face_dir(q, out, STONE, C_PLAIN)

def relief_stone(q, out, ha, hb):
    """the lowest front stone: the face round a sunk square panel (the Saint Peter relief, ~0.66 x 0.78 m: the owner's
    photos), the panel's reveal 3 cm deep, the relief itself (relief_panel) on the panel's floor"""
    bl, br, tr, tl = q
    W, Hh = 0.66, 0.78
    cv = (ha + hb) / 2 + 0.02
    def on(fs, h):                                    # fs: -0.5..0.5 across the face at height h (on the tapered face)
        f = (h - ha) / (hb - ha)
        l = bl.lerp(tl, f); r = br.lerp(tr, f)
        return l.lerp(r, 0.5 + fs)
    wid = (br - bl).length
    s0, s1 = -W / 2 / wid, W / 2 / wid
    v0, v1 = cv - Hh / 2, cv + Hh / 2
    # the frame: four quads round the panel opening
    face_dir([bl, br, on(0.5, v0), on(-0.5, v0)], out, STONE, C_PLAIN)
    face_dir([on(-0.5, v1), on(0.5, v1), tr, tl], out, STONE, C_PLAIN)
    face_dir([on(-0.5, v0), on(s0, v0), on(s0, v1), on(-0.5, v1)], out, STONE, C_PLAIN)
    face_dir([on(s1, v0), on(0.5, v0), on(0.5, v1), on(s1, v1)], out, STONE, C_PLAIN)
    # the reveal: the opening's four sides 3 cm into the stone
    D = 0.03
    O = [on(s0, v0), on(s1, v0), on(s1, v1), on(s0, v1)]
    I_ = [p - out * D for p in O]
    for i in range(4):
        a, b = O[i], O[(i + 1) % 4]; ai, bi = I_[i], I_[(i + 1) % 4]
        inward = ((O[(i + 2) % 4] + O[(i + 3) % 4]) / 2 - (a + b) / 2).normalized()
        face_dir([a, b, bi, ai], inward, STONE, C_RELIEF)
    relief_panel(I_, out)

def newell_dot(pts, v):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    return n.dot(v)

def relief_height(nx, ny, W, H):
    """SAINT PETER, seated (the patron of Uccle; the owner's photos: a seated figure in a square sunk panel low on the
    front): a height field (metres out of the panel's floor) of carved "pillow" forms (each shape's height rises over a
    soft edge from its outline: the look of a low relief cut in stone) unioned: the throne's back behind him, the halo, the
    bearded head, the mantle widening to the feet with vertical folds, the knees and lap, the right arm bent with the two
    keys held up across the chest, the left hand on a book on the knee, the feet on a footstool. x: -W/2..W/2 (the
    viewer's right), y: 0..H (up); designed on a 0.66 x 0.78 panel"""
    import numpy as np
    sx, sy = W / 0.66, H / 0.78
    X, Y = np.meshgrid(np.linspace(-0.33, 0.33, nx), np.linspace(0, 0.78, ny))
    def pillow(sd, d, edge, p=0.6):                    # sd < 0 inside: height d * (depth inside / edge)^p, capped
        return d * np.clip(-sd / edge, 0, 1) ** p
    def ellipse(cx, cy, rx, ry):                         # approximate signed distance (scaled by the smaller radius)
        return (np.sqrt(((X - cx) / rx) ** 2 + ((Y - cy) / ry) ** 2) - 1) * min(rx, ry)
    def capsule(pts, r):
        best = np.full(X.shape, 9.0)
        for (ax, ay), (bx, by) in zip(pts, pts[1:]):
            dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
            t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
            best = np.minimum(best, np.hypot(X - ax - dx * t, Y - ay - dy * t))
        return best - r
    def polygon(pts):
        d = np.full(X.shape, 9.0); inside = np.zeros(X.shape, bool)
        for i in range(len(pts)):
            (ax, ay), (bx, by) = pts[i - 1], pts[i]
            dx, dy = bx - ax, by - ay; L2 = dx * dx + dy * dy
            t = np.clip(((X - ax) * dx + (Y - ay) * dy) / L2, 0, 1)
            d = np.minimum(d, np.hypot(X - ax - dx * t, Y - ay - dy * t))
            cross = ((ay > Y) != (by > Y)) & (X < (bx - ax) * (Y - ay) / (by - ay + 1e-12) + ax)
            inside ^= cross
        return np.where(inside, -d, d)
    parts = []
    parts.append(pillow(polygon([(-0.17, 0.26), (0.17, 0.26), (0.17, 0.64), (0.12, 0.68), (-0.12, 0.68), (-0.17, 0.64)]), 0.008, 0.01))   # throne back
    parts.append(pillow(polygon([(-0.24, 0.0), (0.24, 0.0), (0.22, 0.035), (-0.22, 0.035)]), 0.016, 0.008))           # footstool
    halo = np.hypot(X, Y - 0.6)
    parts.append(0.006 * np.clip((0.1 - halo) / 0.006, 0, 1) * np.clip((halo - 0.0) / 0.006, 0, 1))                     # halo disc
    parts.append(pillow(np.abs(halo - 0.094) - 0.007, 0.012, 0.006))                                                    # its rim
    parts.append(pillow(ellipse(0.0, 0.6, 0.05, 0.06), 0.036, 0.03))                                                    # head
    parts.append(pillow(ellipse(0.0, 0.545, 0.045, 0.045), 0.032, 0.02))                                                # beard
    robe = polygon([(-0.11, 0.51), (0.11, 0.51), (0.14, 0.42), (0.16, 0.2), (0.17, 0.05), (-0.17, 0.05), (-0.16, 0.2), (-0.14, 0.42)])
    folds = 1 + 0.16 * np.cos((X / 0.17) * 6.5 * np.pi / 2) * np.clip((0.24 - Y) / 0.18, 0, 1)
    parts.append(pillow(robe, 0.03, 0.025) * folds)                                                                    # mantle + robe
    parts.append(pillow(ellipse(0.0, 0.29, 0.17, 0.06), 0.044, 0.03))                                                  # knees / lap
    parts.append(pillow(ellipse(-0.06, 0.045, 0.045, 0.022), 0.03, 0.015))                                             # feet
    parts.append(pillow(ellipse(0.06, 0.045, 0.045, 0.022), 0.03, 0.015))
    parts.append(pillow(capsule([(-0.1, 0.49), (-0.15, 0.4), (-0.07, 0.425)], 0.028), 0.04, 0.02))                     # right arm, bent
    parts.append(pillow(ellipse(-0.065, 0.43, 0.026, 0.024), 0.046, 0.015))                                            # its hand
    parts.append(pillow(capsule([(-0.07, 0.43), (-0.16, 0.57)], 0.009), 0.05, 0.006))                                  # the keys, crossed
    parts.append(pillow(capsule([(-0.06, 0.43), (-0.03, 0.58)], 0.009), 0.05, 0.006))
    parts.append(pillow(polygon([(-0.19, 0.55), (-0.15, 0.53), (-0.13, 0.57), (-0.17, 0.6)]), 0.05, 0.005))             # their bits
    parts.append(pillow(polygon([(-0.05, 0.57), (-0.01, 0.56), (-0.01, 0.6), (-0.05, 0.61)]), 0.05, 0.005))
    parts.append(pillow(capsule([(0.1, 0.49), (0.14, 0.39), (0.1, 0.34)], 0.027), 0.04, 0.02))                         # left arm
    parts.append(pillow(polygon([(0.03, 0.27), (0.15, 0.27), (0.15, 0.345), (0.03, 0.345)]), 0.05, 0.006))             # the book
    h = np.zeros(X.shape)
    for p_ in parts: h = np.maximum(h, p_)
    hp = np.pad(h, 1, mode="edge")                                                                                     # one light softening pass
    h = (hp[:-2, 1:-1] + hp[2:, 1:-1] + hp[1:-1, :-2] + hp[1:-1, 2:] + 4 * hp[1:-1, 1:-1]) / 8
    h[0, :] = h[-1, :] = 0; h[:, 0] = h[:, -1] = 0
    return h

def relief_panel(I_, out):
    """the relief's floor as a displaced grid (LOD0 only): ~1.5 cm cells, smooth shaded (code relief: carved)"""
    bl, br, tr, tl = I_
    W = (br - bl).length; H = ((tl + tr) / 2 - (bl + br) / 2).length
    nx, ny = 56, 66
    h = relief_height(nx, ny, W, H)
    def P_(i, j): return bl.lerp(br, i / (nx - 1)).lerp(tl.lerp(tr, i / (nx - 1)), j / (ny - 1)) + out * float(h[j, i])
    K.B.new_group()
    G_ = [[P_(i, j) for i in range(nx)] for j in range(ny)]
    for j in range(ny - 1):
        for i in range(nx - 1):
            a, b, c, d = G_[j][i], G_[j][i + 1], G_[j + 1][i + 1], G_[j + 1][i]
            # split along the shorter diagonal (smoother relief)
            if (a - c).length <= (b - d).length:
                face_dir([a, b, c], out, STONE, C_RELIEF); face_dir([a, c, d], out, STONE, C_RELIEF)
            else:
                face_dir([a, b, d], out, STONE, C_RELIEF); face_dir([b, c, d], out, STONE, C_RELIEF)

# ------------------------------------------------------------------------------------------------ THE BRONZE
def statue():
    """our scripted bronze (tools/blender/heros_statue.py), unchanged (3.81 m); the rock under it is grey stone (the
    photos), not bronze. In the city it gives way to models/heros/statue.glb when
    that is there (the owner's statue slot: viewer/heros/herosStatue.js, docs/landmarks/HEROS.md)"""
    d = json.load(open(os.path.join(OUT, "statue_far.json" if FAR() else "statue_mesh.json")))
    k = 1.0           # (the owner, 2026-11-14: keep our bronze as it is (it reads well from afar); the measured STATUE_H is the
                      #  slot's expected height for a dropped-in statue, ours stays at its modelled 3.81 m)
    V_ = [Vector((x * k, y * k, z * k + hz(STATUE_BASE))) for x, y, z in d["verts"]]
    K.B.new_group()
    rock_top = hz(STATUE_BASE) + ROCK_H
    for f in d["faces"]:
        tri = [V_[f[0]], V_[f[1]], V_[f[2]]]
        if max(v.z for v in tri) < rock_top: K.B.face(tri, BRONZE, C_CAP)        # (the bronze slot's "cap" = the rock, grey stone:
                                                                                  #  one primitive, hidden with the bronze for a statue slot)
        else: K.B.face(tri, BRONZE, C_PLAIN)
    return dict(d, height=d["height"] * k)

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
        # worn: the tread dips toward its nosing (4-12 mm, the photo: rough, worn, mossy treads), the nosing's edge a 2.5 cm
        # chamfer; risers from the chamfer's foot down to the next tread
        wr = 0.0 if FAR() else rnd.uniform(0.004, 0.012)
        ch = 0.0 if FAR() else 0.025
        hn = h - wr                                                # the tread's height at its nosing
        K.B.new_group()
        hb_ = h - r - 0.5
        if FAR():
            face_up([P_(sa, -hw, h), P_(sb, -hw, h), P_(sb, hw, h), P_(sa, hw, h)], STONE, C_TREAD)
        else:
            nose = 0.14
            hm = h - wr * (sb - nose - sa) / (sb - sa)             # (one plane: the slope runs on through the nosing strip)
            face_up([P_(sa, -hw, h), P_(sb - nose, -hw, hm), P_(sb - nose, hw, hm), P_(sa, hw, h)], STONE, C_TREAD)
            face_up([P_(sb - nose, -hw, hm), P_(sb - ch, -hw, hn), P_(sb - ch, hw, hn), P_(sb - nose, hw, hm)], STONE, C_NOSING)
            dn0 = Vector((D.x, -D.y, 0))
            face_dir([P_(sb - ch, -hw, hn), P_(sb, -hw, hn - ch), P_(sb, hw, hn - ch), P_(sb - ch, hw, hn)], dn0 + Z, STONE, C_NOSING)
        top_r = hn - ch                                            # the riser's top
        dn = Vector((D.x, -D.y, 0))                                # Blender direction down the flight
        face_dir([P_(sb, -hw, h - r), P_(sb, hw, h - r), P_(sb, hw, top_r), P_(sb, -hw, top_r)], dn, STONE, C_RISER)
        if j == risers - 1:                                        # the bottom riser goes on down into the ground
            face_dir([P_(sb, -hw, hb_), P_(sb, hw, hb_), P_(sb, hw, h - r), P_(sb, -hw, h - r)], dn, STONE, C_RISER)
        if j == 0:                                                 # the landing's back edge (buried in the terrace)
            face_dir([P_(sa, -hw, hb_), P_(sa, hw, hb_), P_(sa, hw, h), P_(sa, -hw, h)], -dn, STONE, C_PLAIN)
        for x, sgn in ((-hw, -1), (hw, 1)):
            sd = Vector((Sx.x, -Sx.y, 0)) * sgn
            if FAR(): face_dir([P_(sa, x, hb_), P_(sb, x, hb_), P_(sb, x, h), P_(sa, x, h)], sd, STONE, C_PLAIN)
            else: face_dir([P_(sa, x, hb_), P_(sb, x, hb_), P_(sb, x, top_r), P_(sb - ch, x, hn), P_(sb - nose, x, hm), P_(sa, x, h)], sd, STONE, C_PLAIN)
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
            post_s = [s_top - 0.25 + (s_bot + 0.45 - s_top) * q / 5 for q in range(6)]     # six posts a side (the owner's photo)
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
                           h_from=round(top - 0.08, 3), h_to=round(bottom + r - 0.08, 3), floor=round(bottom - 0.05, 3),
                           fill=dict(over_line=0.14, flat=0.3, slope=0.6, reach=1.6) if cheek else None),
                handrails_blender=rails, _frame=dict(ua=ua, wa=wa, D=(D.x, D.y), S=(Sx.x, Sx.y), s_top=s_top, s_bot=s_bot, hw=hw, top=top, bottom=bottom))

STEPS = SITE["steps"]
def all_steps():
    # south: 12 risers from the terrace (50.40 at the top of the OSM line) down to the dolomite path at 48.32 (DTM profile
    # along the line: 50.33 at +0.5 m, 48.34 at +5 m); 3.0 m wide, handrails both sides (OSM handrail=yes; photo c5)
    s = STEPS["w1154611802"]
    a = flight("south", s["line"], 12, 48.32, 50.45, 0.35, 3.0, True)     # (the landing 5 cm over the terrace: it stands proud of the dolomite)
    # west: 4 risers from the Avenue Brugmann sidewalk (51.15) down to the path (50.52), 2.4 m wide, no handrail (OSM)
    w = STEPS["w1154611806"]
    b = flight("west", w["line"], 4, 50.52, 51.15, 0.45, 2.4, False)
    return [a, b]

# ------------------------------------------------------------------------------------------------ THE FURNITURE
def lathe_ribbed(center, profile, segs, ribs, depth, mat, code_of=lambda i: C_PLAIN, cap_top=True, cap_bottom=True):
    """a solid of revolution with vertical ribs (r x (1 + depth cos(ribs a)) on the rows flagged in the profile: (r, z, ribbed))"""
    K.B.new_group()
    ang = [2 * math.pi * k / segs for k in range(segs)]
    rings = [[center + Vector((math.cos(a), math.sin(a), 0)) * (r * (1 + (depth * math.cos(ribs * a) if rb else 0.0))) + Z * z for a in ang]
             for r, z, rb in profile]
    for i in range(len(rings) - 1):
        for k in range(segs):
            a, b, c, d = rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]
            mid = (a + b + c + d) / 4; out = mid - (center + Z * ((profile[i][1] + profile[i + 1][1]) / 2))
            face_dir([a, b, c, d], out, mat, code_of(i))
    if cap_top: face_dir(rings[-1], Z, mat, code_of(len(rings) - 2))
    if cap_bottom: face_dir(rings[0], -Z, mat, code_of(0))

def bin_at(u, w, h):
    """a Brussels litter bin (Commons C2, 2025: the dark green ribbed cylinder with a domed hood and a red band, ~0.95 m),
    its foot 5 cm into the ground"""
    c = PW(u, w, h - 0.05)
    segs = 10 if FAR() else 24
    prof = [(0.17, 0.0, False), (0.17, 0.08, False), (0.215, 0.1, False), (0.215, 0.6, True), (0.222, 0.6, False), (0.222, 0.68, False),
            (0.215, 0.68, False), (0.215, 0.8, True), (0.225, 0.82, False), (0.2, 0.9, False), (0.14, 0.96, False), (0.05, 0.99, False)]
    lathe_ribbed(c, prof, segs, 12, 0.0 if FAR() else 0.035, GREEN, code_of=lambda i: C_BAND if i == 4 else C_PLAIN, cap_bottom=True)

def lamp_column(u, w, h):
    """the ornate green cast-iron lamp column at the Brugmann path mouth (Commons C2: a moulded base with a bulging,
    decorated drum, a fluted shaft, a collar; the lantern from the city's Brussels lamps: a hexagonal glass lantern under a
    domed roof); ~4.9 m, the glass emissive only at night (no light)"""
    c = PW(u, w, h - 0.1)
    segs = 8 if FAR() else 16
    prof = [(0.21, 0.0, False), (0.21, 0.22, False), (0.17, 0.3, False), (0.16, 0.42, False), (0.19, 0.55, True), (0.2, 0.75, True),
            (0.16, 0.95, True), (0.12, 1.08, False), (0.13, 1.15, False), (0.095, 1.25, False), (0.09, 1.3, True), (0.07, 3.9, True),
            (0.09, 3.95, False), (0.09, 4.02, False), (0.06, 4.08, False), (0.05, 4.2, False)]
    lathe_ribbed(c, prof, segs, 8, 0.0 if FAR() else 0.06, GREEN, cap_bottom=False)
    # the lantern: a hexagonal frustum of glass between a ring and a domed roof
    base = c + Z * 4.2
    lathe(base, [(0.0, 0.0), (0.12, 0.0), (0.12, 0.05)], 6, GREEN, C_PLAIN, a0=math.pi / 6)
    lathe(base + Z * 0.05, [(0.12, 0.0), (0.2, 0.42)], 6, GREEN, C_GLASS, a0=math.pi / 6)
    lathe(base + Z * 0.47, [(0.2, 0.0), (0.24, 0.02), (0.22, 0.06), (0.16, 0.16), (0.07, 0.24), (0.025, 0.3), (0.035, 0.36), (0.0, 0.4)],
          6 if FAR() else 12, GREEN, C_PLAIN, a0=math.pi / 6)

def floodlight(u, w, h, aim):
    """the monument's floodlight (the owner's photo from the steps: a grey box lamp on a short post on the platform, right
    of the steps), aimed at the obelisk; no light (a fixed light budget): its glass reads only at night"""
    c = PW(u, w, h)
    lathe_axis(c - Z * 0.05, Z, Vector((1, 0, 0)), [(0.03, 0.0), (0.03, 0.33)], 8, GREEN, C_HOUSING, cap_top=True, cap_bottom=True)
    d = Vector((aim[0] - u, -(aim[1] - w), 0)).normalized(); sd = d.cross(Z)
    o = c + Z * 0.3
    # the lamp body: a squat box tilted ~55 deg up toward the obelisk (the glass faces up and in), on a yoke
    tilt = math.radians(55)
    fw = (d * math.cos(tilt) + Z * math.sin(tilt)).normalized(); up = fw.cross(sd).normalized()
    if up.z < 0: up = -up
    box(o, sd, up, fw, -0.12, 0.12, -0.08, 0.08, -0.06, 0.1, GREEN, C_HOUSING)
    face_dir([o + sd * -0.1 + up * -0.06 + fw * 0.105, o + sd * 0.1 + up * -0.06 + fw * 0.105, o + sd * 0.1 + up * 0.06 + fw * 0.105,
              o + sd * -0.1 + up * 0.06 + fw * 0.105], fw, GREEN, C_GLASS)

def furniture(flights):
    """at the top of the west flight (Commons C2: the path mouth on the Brugmann sidewalk): a bin, the ornate lamp column
    on the north side; the floodlight on the platform right of the 12 steps (the owner's photo)"""
    f = next(x for x in flights if x["name"] == "west")["_frame"]
    D, S = Vector(f["D"]), Vector(f["S"])
    def at(s, x):
        q = Vector((f["ua"], f["wa"])) + D * s + S * x
        return q.x, q.y
    # the lamp on the north side (smaller u: toward the Square des Heros street), one bin on the south side: the city's
    # street furniture (viewer/furniture2) already stands a round bin in the middle of this path mouth, so the pair of C2
    # reads with ours (a second one of ours made three)
    sides = [at(f["s_top"] - 0.9, x) for x in (-(f["hw"] + 1.6), f["hw"] + 1.6)]
    u, w = min(sides, key=lambda p: p[0])
    bs = [at(f["s_top"] - 0.6, x) for x in (-(f["hw"] + 0.55), f["hw"] + 0.55)]
    bu, bw = max(bs, key=lambda p: p[0])
    bin_at(bu, bw, max(f["top"], G(bu, bw)))
    lamp_column(u, w, max(f["top"], G(u, w)))
    th = -2 * math.pi / 8 * 0.9                       # the platform, right of the steps' top (seen from them: east)
    r = OCT_R + 0.7
    floodlight(r * math.cos(th), r * math.sin(th), PT, (0.0, 0.0))

def build_all():
    platform()
    enclosure()
    obelisk()
    st = statue()
    flights = all_steps()
    furniture(flights)
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
    # carved forms (the rose bouquets, the animals) shade smooth like the bronze: read each face's code from COLOR_0.r
    col = me.color_attributes["Col"]; cd = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", cd)
    carved = set(p_.index for p_ in me.polygons if int(cd[4 * p_.loop_indices[0]] * 16) in (C_BOUQUET, C_ANIMAL, C_RELIEF))
    # round iron (bars, the lamp column, the bins: 6-24 sided lathes) and the plants shade smooth up to 62 deg; boxes stay
    # sharp; the lantern's glass panes stay flat
    soft = [i for i, m in enumerate(me.materials) if m and m.name in ("cast_iron_green", "plant_grass")]
    plant = [i for i, m in enumerate(me.materials) if m and m.name == "plant_grass"]
    # round: every plant face; on the iron the lathed parts (bars, finials, the lamp column, the bins: codes finial / plain /
    # seat), not the rails' and posts' boxes (smoothed at the octagon's corners they streaked)
    round_ = set(p_.index for p_ in me.polygons if p_.material_index in plant or
                 (p_.material_index in soft and int(cd[4 * p_.loop_indices[0]] * 16) in (C_FINIAL, C_PLAIN, C_BAND)))
    bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
    n = 0
    for e in bm.edges:
        lf = e.link_faces
        if len(lf) != 2: e.smooth = False; continue
        ang = lf[0].normal.angle(lf[1].normal, 0.0)
        isb = (lf[0].material_index in bronze and lf[1].material_index in bronze) or (lf[0].index in carved and lf[1].index in carved)
        iss = lf[0].index in round_ and lf[1].index in round_
        lim = 62.0 if iss else 30.0 if isb else 2.5
        if ang > math.radians(lim): e.smooth = False; n += 1   # (stone: the platform's 64 segments read as its cut stones)
        else: e.smooth = True                                  # (make_object's 32 deg pass made the plants' and bars' edges sharp)
    for f in bm.faces:
        if not (f.material_index in bronze or f.index in round_): continue
        L = [e.calc_length() for e in f.edges]
        # (stretched faces flat: smooth corner normals streak along them; the bars' long sides are such faces)
        if max(L) > 0 and f.calc_area() * 2 / max(L) < max(L) / 5.0:
            for e in f.edges: e.smooth = False
    bm.to_mesh(me); bm.free()
    print(f"  {o.name}: {n} sharp edges by angle")
for o in (obj, far): sharpen(o)
print(f"uv done {time.time() - T0:.1f}s")

def carved(x, z, h):
    """the bake's ground as the city carves it under the flights (viewer/heros/herosSurface.js carveFlights): the raw DTM
    runs through the treads and buried the risers in the AO bake (they came out black)"""
    for f in FLIGHTS:
        c = f["carve"]; ring = c["ring"]
        (ax, az), (bx, bz) = c["from_"], c["to"]
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz
        t = min(1.0, max(0.0, ((x - ax) * dx + (z - az) * dz) / L2))
        line = c["h_from"] + (c["h_to"] - c["h_from"]) * t
        if SC.inside((x, z), ring): h = min(h, max(c["floor"], line - 0.27))
        elif c.get("fill") and 0.0 <= ((x - ax) * dx + (z - az) * dz) / L2 <= 1.0:   # the bank built up beside the cheek kerbs
            fl = c["fill"]; d = dist_ring(ring, x, z)                                  # (herosSurface.js carveFlights)
            if d < fl["reach"]: h = max(h, line + fl["over_line"] - max(0.0, d - fl["flat"]) * fl["slope"])
    return h

def dist_ring(r, x, z):
    best = 1e9
    for i in range(len(r)):
        (ax, az), (bx, bz) = r[i - 1], r[i]
        dx, dz = bx - ax, bz - az; L2 = dx * dx + dz * dz or 1.0
        t = max(0.0, min(1.0, ((x - ax) * dx + (z - az) * dz) / L2))
        best = min(best, math.hypot(x - ax - dx * t, z - az - dz * t))
    return best

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
            verts.append((u, -w, carved(x, z, a[r, c]) - OY - 0.02))
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
    "lettering": {"about": "every lettered face's atlas cell (TEXCOORD_0.x = 1000 (index + 1) + s): tools/heros_letters.py draws the ones "
                           "with text (the front FR / NL blocks, 1940-1945, and the names from models/heros/names.json)",
                  "cells": [dict(index=CELL[n], name=n, size_m=list(CELL_SIZES[n]),
                                 kind="front" if n.startswith("front") or n == "years" else "shaft" if n.startswith("shaft") else "bench")
                            for n in CELL_NAMES]},
    "statue_slot": {"about": "the bronze group's place (viewer/heros/herosStatue.js: models/heros/statue.glb replaces our scripted bronze)",
                    "base_local": [0.0, round(STATUE_BASE - OY, 4), 0.0], "base_taw": STATUE_BASE, "front_local": "+X (u: south, the 12 steps)",
                    "height_m": STATUE_H, "rock_m": ROCK_H, "cap_top_half_m": [CAP2[0], CAP2[1]]},
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
    "flights": [{k: v for k, v in f_.items() if k != "_frame"} for f_ in FLIGHTS],
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
