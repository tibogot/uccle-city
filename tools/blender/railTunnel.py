"""THE TWO ROAD TUNNELS UNDER THE LINKEBEEK RAILWAY EMBANKMENTS, as hero pieces: built entirely in code (no hand
modelling) from MEASURED data and the Street View panoramas (looked at only, never traced, stored or shipped).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/railTunnel.py -- <name> <out_dir> [--no-bake] [--preview <abs dir>]
      <name>    kleindal (Kleindalstraat under the L124, E10) | brasserie (Rue de la Brasserie / Brouwerijstraat under the L26, D9)
      <out_dir>/tunnel_<name>.glb      one mesh, NAMED material slots (brick_red_brussels, stone_blue, concrete,
                                       painted_metal_grey, lamp_glow) = one draw call per slot; UV0 = metres (planar per
                                       face, the vault unrolled: u along the barrel, v round it), UV1 = lightmap
      <out_dir>/tunnel_<name>_ao.png   ambient occlusion baked with Cycles into UV1 (the embankment over the barrel and the
                                       cut approaches occlude). ONLY light is baked: the library draws brick and stone
      <out_dir>/tunnel_<name>.json     placement, the barrel / portal / wing walls the city's terrain stage needs
                                       (viewer/rail/tunnels.js: the cut, the retained earth, the lid over the barrel), the
                                       road lanes through it, the measurements used
      <preview>/tunnel_<name>_*.png    Cycles renders from the Street View viewpoints

FRAME (Blender): X along the road (OSM way from its first node A to its last node B), Y to its left, Z up; origin = the
barrel's centre on its axis, at the road level there. glTF turns it Y-up: three.js x = along the road, -z = Blender +Y;
place with position (cx, road, cz), rotation.y = -THETA (THETA = the road's direction, atan2(dz, dx), city x east z south).

MEASURED [M]: the OSM way (axis, ends), the DTM 2021 / DHMV II mosaic of the city tiles (road levels beyond the portals,
the embankment's toe = the portal faces, the retained earth behind the wing walls, the ground over the barrel), the rail
top over it (data/rail/rail.json). ESTIMATED [E] from Street View (Kleindalstraat 2010 + 2024, Brouwerijstraat 2024):
the clear span (= the drawn road: lanes in the json), springing, headwall height / width, ring, string course, corbel
frieze, wing splay and length, the lamps.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAME = ARGS[0] if ARGS else "kleindal"
OUT = os.path.abspath(ARGS[1] if len(ARGS) > 1 and not ARGS[1].startswith("--") else "models/rail")
BAKE = "--no-bake" not in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
T0 = time.time()
Z = Vector((0, 0, 1))

# ------------------------------------------------------------------------------------------------ the tunnels
# wings: one per corner, [portal][side]: portal 0 = the A end (X < 0), 1 = the B end; side +1 = left (Y > 0), -1 = right.
#   splay = degrees outward from the road axis, length along the wall, tip = the wall's top at its end (over the road)
TUNNELS = {
    # Kleindalstraat (Linkebeek), one-way, under the L124 embankment (rail 80.0 m TAW over the road's 58.6-59.1 m: 21 m).
    # Street View 2010 / 2024 (both portals): dark red brick headwall, round arch on low jambs (the 3.2 m height-limit
    # sign: crown ~4.2 m), a header-brick ring, a grey concrete string course, a short brick parapet with a concrete
    # coping, splayed brick wing walls with sloping concrete copings ending on low piers; a brick barrel with a lamp on the
    # NW wall; a narrow footway on the NW side, a kerb ledge on the SE side.
    "kleindal": {
        "road": "Kleindalstraat - Rue Kleindal", "osm": 430168935, "line": "L124", "tile": "E10",
        "A": (-641.86, 2849.05), "B": (-679.79, 2886.72),                       # [M] OSM nodes
        "A_ll": (50.77339, 4.340413),
        "lanes": {"right": [{"type": "driving", "width": 3.2}, {"type": "sidewalk", "width": 0.9}], "left": [{"type": "sidewalk", "width": 0.5}],
                  "center": {"width": 0, "kind": "none"}},                       # [E] lane 3.2 + NW footway 0.9 + SE ledge 0.5 = 4.6 m
        "roads": [430168935, 430168931],                                         # the tunnel's way + the short way out of the SW portal
        "yoff": -1.8,                                                            # the drawn road's centre (paved -4.1 .. +0.5 of the OSM line)
        "xmid": 0.0, "L": 52.0,                                                  # [M] the embankment's toe at s = +-26 (DTM)
        "r": 2.27, "spring": 1.95,                                               # [E] span 4.54, crown 4.22
        "Wh": 6.6, "Htop": 6.7, "Th": 1.7,                                       # [E] headwall 7.4 wide, 6.7 high; [M]-checked against the DTM behind it
        "ring": 0.34, "band": (5.45, 0.24, 0.10), "coping": (0.18, 0.06),        # [E] header ring, string course (z, height, proud), coping (thick, overhang)
        "frieze": None, "stones": None,
        "wingTw": 0.62, "wingTop0": 4.6,
        "wings": [[{"splay": 32, "length": 9.0, "tip": 1.0}, {"splay": 20, "length": 9.0, "tip": 1.0}],
                  [{"splay": 24, "length": 9.5, "tip": 1.0}, {"splay": 30, "length": 9.0, "tip": 1.0}]],
        "mat_trim": "concrete",
        "lamps": {"kind": "wall", "side": -1, "xs": [-13.0, 0.0, 13.0], "z": 2.45, "color": [1.0, 0.62, 0.25]},   # [E] sodium, NW wall
        "barriers": None,
        "views": {"ne": (-34.0, 1.6, 1.6, 0.0, 1.0, 2.6, 28.0), "sw": (34.0, -1.6, 1.6, 0.0, -1.0, 2.6, 28.0),
                  "inside": (-12.0, -1.0, 1.6, 20.0, -1.0, 2.4, 20.0)},
        "pitch": {"ne": 8, "sw": 8, "inside": 20},
        "views_ll": {"ne": (50.77346, 4.34052, 226), "sw": (50.77296, 4.33972, 46), "inside": (50.77325, 4.34020, 226)},
    },
    # Rue de la Brasserie / Brouwerijstraat (Linkebeek), two-way, under the L26 embankment (rail 63.5 m over the road's
    # 46.8-47.3 m: 16.6 m). Street View 2024 (both portals + inside): red brick headwall ~10 m high, a large semicircular
    # arch with a brick ring and five blue-stone blocks (imposts, haunches, keystone), a corbelled round-arch frieze under
    # the coping, battered brick wing walls (splayed at the NW portal, parallel to the street at the SE one), a brick
    # barrel with lamps at the crown, sidewalks both sides with X-pattern steel guard rails along the kerbs.
    "brasserie": {
        "road": "Rue de la Brasserie - Brouwerijstraat", "osm": 775790690, "line": "L26", "tile": "D9",
        "A": (-1485.35, 2391.5), "B": (-1462.59, 2413.9),
        "A_ll": (50.7775, 4.328451),
        "lanes": {"right": [{"type": "driving", "width": 3.0}, {"type": "sidewalk", "width": 1.3}],
                  "left": [{"type": "driving", "width": 3.0}, {"type": "sidewalk", "width": 1.3}], "center": {"width": 0, "kind": "line"}},
        "roads": [775790690, 775790691, 16403696],
        "yoff": 0.0,
        "xmid": 0.0, "L": 29.6,                                                  # [M] the toe at s = +-14.8
        "r": 4.27, "spring": 3.2,                                                # [E] span 8.54, crown 7.47 (impost stones at ~half the crown)
        "Wh": 12.4, "Htop": 9.9, "Th": 1.9,
        "ring": 0.48, "band": None, "coping": (0.22, 0.07),
        "frieze": {"z0": 8.45, "z1": 9.45, "bays": 11, "proud": 0.13},           # [E] the corbel table (11 small arches)
        "stones": {"w": 0.42, "h": 0.62, "proud": 0.05, "angles": [0, 52, 90, 128, 180]},
        "wingTw": 0.7, "wingTop0": 7.0,
        "wings": [[{"splay": 38, "length": 9.0, "tip": 1.2}, {"splay": 42, "length": 9.0, "tip": 1.2}],
                  [{"splay": 4, "length": 12.0, "tip": 1.0}, {"splay": 4, "length": 12.0, "tip": 1.0}]],
        "mat_trim": "stone_blue",
        "lamps": {"kind": "crown", "xs": [-9.5, 0.0, 9.5], "color": [1.0, 0.95, 0.86]},   # [E] LED boxes at the crown
        "barriers": {"inset": 1.18, "h": 1.0, "panel": 2.0},                     # [E] along both kerbs (sidewalk 1.3)
        "views": {"nw": (-26.0, 0.0, 1.6, 0.0, 0.0, 4.5, 26.0), "se": (26.0, 0.0, 1.6, 0.0, 0.0, 4.5, 26.0),
                  "inside": (-9.0, 1.5, 1.6, 15.0, 0.0, 4.0, 18.0)},
        "pitch": {"nw": 6, "se": 6, "inside": 25},
        "views_ll": {"nw": (50.77762, 4.32827, 133), "se": (50.77719, 4.32895, 313), "inside": (50.77743, 4.32857, 133)},
    },
}
T = TUNNELS[NAME]
ax, az = T["A"]; bx, bz = T["B"]
TH = math.atan2(bz - az, bx - ax)
UX, UZ = math.cos(TH), math.sin(TH)                 # along the road (city x, z)
# Blender +Y (left of the road) in city coordinates: mz = -dx sin + dz cos, Y = -mz -> left = (sin, -cos)
VX, VZ = math.sin(TH), -math.cos(TH)
MX, MZ = (ax + bx) / 2 + UX * T["xmid"] + VX * T["yoff"], (az + bz) / 2 + UZ * T["xmid"] + VZ * T["yoff"]


def to_world(X, Y):
    return MX + UX * X + VX * Y, MZ + UZ * X + VZ * Y


def to_local(x, z):
    dx, dz = x - MX, z - MZ
    return dx * UX + dz * UZ, dx * VX + dz * VZ


# ------------------------------------------------------------------------------------------------ the DTM mosaic
import numpy as np
MAN = json.load(open(os.path.join(ROOT, "data", "tiles", "manifest.json")))
GRIDS = []
for t in MAN["tiles"]:
    bxs, bzs = t["bounds"]["x"], t["bounds"]["z"]
    if bxs[1] < MX - 120 or bxs[0] > MX + 120 or bzs[1] < MZ - 120 or bzs[0] > MZ + 120: continue
    hp = os.path.join(ROOT, "data", "tiles", t["name"], "terrain.json")
    if not os.path.exists(hp): continue
    h = json.load(open(hp))
    a = np.fromfile(os.path.join(ROOT, "data", "tiles", t["name"], "terrain.u16"), dtype="<u2").astype(np.float64).reshape(h["rows"], h["cols"]) / 100
    GRIDS.append((h, a))


def dtm(x, z):
    for h, a in GRIDS:
        if h["x0"] <= x <= h["x0"] + h["size"] and h["z0"] <= z <= h["z0"] + h["size"]:
            c = (x - h["x0"]) / h["step"]; r = (z - h["z0"]) / h["step"]
            c0 = min(int(c), h["cols"] - 2); r0 = min(int(r), h["rows"] - 2); fc = c - c0; fr = r - r0
            return (a[r0, c0] * (1 - fc) + a[r0, c0 + 1] * fc) * (1 - fr) + (a[r0 + 1, c0] * (1 - fc) + a[r0 + 1, c0 + 1] * fc) * fr
    return float("nan")


def dtmL(X, Y):
    return dtm(*to_world(X, Y))


L, R, HS = T["L"], T["r"], T["spring"]
CROWN = HS + R
# [M] the road level: the lowest DTM across the lane (+-1 m) a little beyond each wing tip, linear between
reach = [max(w["length"] * math.cos(math.radians(w["splay"])) for w in T["wings"][p]) for p in (0, 1)]
XA, XB = -L / 2 - reach[0] - 2.5, L / 2 + reach[1] + 2.5
ZA = min(dtmL(XA, y) for y in (-1.0, -0.5, 0.0, 0.5, 1.0))
ZB = min(dtmL(XB, y) for y in (-1.0, -0.5, 0.0, 0.5, 1.0))
GRADE = (ZB - ZA) / (XB - XA)
ROAD0 = ZA - GRADE * XA                             # road level at X = 0 (the model's origin)
rail = json.load(open(os.path.join(ROOT, "data", "rail", "rail.json")))
RAIL_TOP = None
for tr in rail["tracks"]:
    P = tr["pts"]
    for i in range(1, len(P)):
        p, q = P[i - 1], P[i]
        (X1, Y1), (X2, Y2) = to_local(p[0], p[2]), to_local(q[0], q[2])
        if abs(X1) < 40 and Y1 * Y2 <= 0 and Y1 != Y2:            # where the track crosses the road's axis
            f = Y1 / (Y1 - Y2); y = p[1] + (q[1] - p[1]) * f
            RAIL_TOP = y if RAIL_TOP is None else max(RAIL_TOP, y)
print(f"{NAME}: theta {math.degrees(TH):.2f} deg, centre ({MX:.2f}, {MZ:.2f}); road {ZA:.2f} at X {XA:.1f} .. {ZB:.2f} at X {XB:.1f} "
      f"(grade {GRADE * 100:.2f} %), road at origin {ROAD0:.2f}; rail top {RAIL_TOP}; DTM at origin {dtmL(0, 0):.2f}")
for p, sgn in ((0, -1), (1, 1)):
    xs = sgn * L / 2
    print(f"  portal {p}: DTM along the axis behind / at / before the face:",
          " ".join(f"{xs + sgn * d:.1f}:{dtmL(xs + sgn * d, 0) - (ROAD0 + GRADE * (xs + sgn * d)):.1f}" for d in (-6, -4, -2, 0, 2, 4)))


def zroad(X):
    return GRADE * X                                 # model Z of the road (origin = ROAD0)


# ------------------------------------------------------------------------------------------------ geometry builder
MAT_NAMES = ["brick_red_brussels", "stone_blue", "concrete", "painted_metal_grey", "lamp_glow"]
BR, ST, CO, PG, LG = range(5)
TRIM = MAT_NAMES.index(T["mat_trim"])


class Mesh:
    """faces with their material and per-corner UV0 (metres)"""
    def __init__(self):
        self.v, self.f, self.m, self.uv, self.tag = [], [], [], [], []

    def poly(self, pts, mat, uv=None, tag=0, want=None):
        pts = [Vector(p) for p in pts]
        if want is not None:
            n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
            if len(pts) > 3 and n.length < 1e-9: n = (pts[2] - pts[0]).cross(pts[3] - pts[0])
            if n.dot(Vector(want)) < 0:
                pts = pts[::-1]; uv = uv[::-1] if uv is not None else None
        base = len(self.v)
        for p in pts: self.v.append((p.x, p.y, p.z))
        self.f.append(list(range(base, base + len(pts)))); self.m.append(mat); self.tag.append(tag)
        self.uv.append(uv if uv is not None else planar_uv(pts))

    def tri_poly(self, pts, mat, normal):
        """a planar n-gon (maybe concave, no holes): tessellated, oriented to `normal`"""
        pts = [Vector(p) for p in pts]
        n = Vector(normal).normalized()
        t = n.cross(Z) if abs(n.z) < 0.9 else Vector((1, 0, 0))
        t.normalize(); b = n.cross(t)
        for a, bb, c in tessellate_polygon([[(p.dot(t), p.dot(b), 0) for p in pts]]):
            pa, pb, pc = pts[a], pts[bb], pts[c]
            if (pb - pa).cross(pc - pa).dot(n) < 0: pb, pc = pc, pb
            self.poly([pa, pb, pc], mat)

    def quad_strip(self, A, B, mat, want):
        """quads between two polylines; want = the normal they must face (a vector, or a function of the quad)"""
        for i in range(len(A) - 1):
            q = [Vector(A[i]), Vector(A[i + 1]), Vector(B[i + 1]), Vector(B[i])]
            if (q[0] - q[1]).length < 1e-6 and (q[2] - q[3]).length < 1e-6: continue
            self.poly(q, mat, want=want(q) if callable(want) else want)

    def box(self, c, size, mat, frame=None, skip=()):
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        u, v, w = frame or (Vector((1, 0, 0)), Vector((0, 1, 0)), Z)
        c = Vector(c)
        P = [c + u * sx * hx + v * sy * hy + w * sz * hz for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        dirs = (-w, w, -v, v, -u, u)
        for k, q in enumerate(((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5))):
            if k in skip: continue                     # 0 bottom 1 top 2 -v 3 +v 4 -u 5 +u
            self.poly([P[i] for i in q], mat, want=dirs[k])


def planar_uv(pts):
    """UV0 in metres, planar on the face: a along it horizontally, b up it (or across a level face)"""
    n = (pts[1] - pts[0]).cross(pts[2] - pts[0])
    if n.length < 1e-12 and len(pts) > 3: n = (pts[2] - pts[0]).cross(pts[3] - pts[0])
    n = n.normalized() if n.length > 1e-12 else Z
    if abs(n.z) < 0.75:
        t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
    else:
        t = Vector((1, 0, 0)); b = n.cross(t).normalized()
    return [(p.dot(t), p.dot(b)) for p in pts]


M = Mesh()          # masonry: walls, vault, faces, wings (flat / smooth by the curvature rule)
D = Mesh()          # details: copings, bands, stones, piers (bevelled 1 cm)
F = Mesh()          # fine: lamps, guard rails (no bevel)
FOUND = -0.6        # walls go this far under the road (the cut ground and the road meet them)

# ---- the barrel: side walls + semicircular vault, inner faces only (the earth is outside), in 4 m bays
NSEG = 24 if R < 3 else 36
prof = [(R, FOUND)] + [(R * math.cos(math.pi * i / NSEG), HS + R * math.sin(math.pi * i / NSEG)) for i in range(NSEG + 1)] + [(-R, FOUND)]
arc = [0.0]
for i in range(1, len(prof)): arc.append(arc[-1] + math.hypot(prof[i][0] - prof[i - 1][0], prof[i][1] - prof[i - 1][1]))
nb = max(2, round(L / 4.0))
xs = [-L / 2 + L * k / nb for k in range(nb + 1)]
for k in range(nb):
    x0, x1 = xs[k], xs[k + 1]
    for i in range(len(prof) - 1):
        (y0, z0), (y1, z1) = prof[i], prof[i + 1]
        q = [(x0, y0, z0 + zroad(x0)), (x1, y0, z0 + zroad(x1)), (x1, y1, z1 + zroad(x1)), (x0, y1, z1 + zroad(x0))]
        # facing the axis (inward): the profile runs from +Y round the top to -Y
        zm = (z0 + z1) / 2
        M.poly(q, BR, [(x0, arc[i]), (x1, arc[i]), (x1, arc[i + 1]), (x0, arc[i + 1])], want=(0, -(y0 + y1) / 2, HS - zm if zm > HS else 0))

# ---- the floor slab under the road (5 cm under its level): never a void where the ground's mesh stops at a wall
SLAB = -0.05
for k in range(nb):
    x0, x1 = xs[k], xs[k + 1]
    M.poly([(x0, -R - 0.02, SLAB + zroad(x0)), (x1, -R - 0.02, SLAB + zroad(x1)), (x1, R + 0.02, SLAB + zroad(x1)), (x0, R + 0.02, SLAB + zroad(x0))], CO)


# ---- the portals
def arch_pt(a, r=R):
    return (r * math.cos(a), HS + r * math.sin(a))


def face_x(sgn):
    return sgn * L / 2


WH, HTOP, THK = T["Wh"], T["Htop"], T["Th"]
CP_T, CP_O = T["coping"]
WALL_TOP = HTOP - CP_T                                # the masonry's top under the coping
PORTALS = []
WINGS = []
for p, sgn in ((0, -1), (1, 1)):
    X0 = face_x(sgn)
    zr0 = zroad(X0)
    out = Vector((sgn, 0, 0))                         # the face's outward normal
    # front face: radial quads from the arch (+ jambs) to the face's outline (|Y| <= WH/2, FOUND .. WALL_TOP)
    corner_a = math.atan2(WALL_TOP - HS, WH / 2)
    angs = sorted(set([math.pi * i / NSEG for i in range(NSEG + 1)] + [corner_a, math.pi - corner_a]))

    def outline(a):
        c, s = math.cos(a), math.sin(a)
        t = min((WH / 2) / abs(c) if abs(c) > 1e-9 else 1e9, (WALL_TOP - HS) / s if s > 1e-9 else 1e9)
        return (c * t, HS + s * t)
    inner = [arch_pt(a) for a in angs]
    outer = [outline(a) for a in angs]
    ring_o = [arch_pt(a, R + T["ring"]) for a in angs]
    P3 = lambda yz: Vector((X0, yz[0], yz[1] + zr0))
    # the ring band (header bricks, proud by 2.5 cm) and the field between it and the outline
    RP = 0.025
    A_in = [P3(q) for q in inner]; A_ro = [P3(q) for q in ring_o]
    cz0 = HS + zr0
    radial = lambda q: Vector((0, (q[0] + q[1]).y / 2, (q[0] + q[1]).z / 2 - cz0))
    M.quad_strip([a + out * RP for a in A_in], [a + out * RP for a in A_ro], BR, out)
    M.quad_strip(A_ro, [P3(q) for q in outer], BR, out)
    # the ring's proud edges: outer rim (outward), inner rim (towards the opening's centre)
    M.quad_strip(A_ro, [a + out * RP for a in A_ro], BR, radial)
    M.quad_strip([a + out * RP for a in A_in], A_in, BR, lambda q: -radial(q))
    # the jambs under the springing: from the opening to the face's sides
    for side in (1, -1):
        q = [P3((side * R, FOUND)), P3((side * R, HS)), P3((side * (R + T["ring"]), HS)), P3((side * (R + T["ring"]), FOUND))]
        q2 = [P3((side * R, FOUND)), P3((side * R, HS)), P3((side * WH / 2, HS)), P3((side * WH / 2, FOUND))]
        M.poly(q2, BR, want=out)
        # the ring's 2.5 cm step down to the jamb at the springing
        M.poly([P3((side * R, HS)), P3((side * (R + T["ring"]), HS)), P3((side * (R + T["ring"]), HS)) + out * RP, P3((side * R, HS)) + out * RP], BR, want=(0, 0, -1))
    # top of the headwall's masonry (under the coping) and its hidden back
    back = X0 - sgn * THK
    zb = zroad(back)
    # the coping: across the whole width and thickness, overhanging the face
    D.box(((X0 + back) / 2 + sgn * CP_O / 2, 0, WALL_TOP + CP_T / 2 + (zr0 + zb) / 2), (THK + CP_O + 0.02, WH + 2 * CP_O, CP_T), TRIM)
    # string course (Kleindal) / corbel frieze (Brasserie)
    if T["band"]:
        bz, bh, bp = T["band"]
        D.box((X0 + sgn * bp / 2 - sgn * 0.01, 0, bz + bh / 2 + zr0), (bp + 0.02, WH + 2 * bp, bh), TRIM)
    if T["frieze"]:
        fr = T["frieze"]; nbays = fr["bays"]; fp = fr["proud"]
        z0f, z1f = fr["z0"], fr["z1"]
        bayw = WH / nbays
        rb = bayw * 0.36                                # each small arch's radius
        zs = z1f - 0.30 - rb                            # their springing
        cw = (bayw - 2 * rb)                            # corbel width
        fx = X0 + sgn * fp
        for k in range(nbays):
            ya, yb = -WH / 2 + k * bayw, -WH / 2 + (k + 1) * bayw
            ym = (ya + yb) / 2
            # the arched panel: the face above each small arch, quads from the arch up to the band's top
            pts = [(ym - rb * math.cos(math.pi * i / 10), zs + rb * math.sin(math.pi * i / 10)) for i in range(11)]
            lowL = [(ya, zs), (ya + cw / 2, zs)] if True else []
            A1 = [Vector((fx, y, z + zr0)) for y, z in [(ya, zs)] + pts + [(yb, zs)]]
            A2 = [Vector((fx, y, z1f + zr0)) for y, z in [(ya, zs)] + pts + [(yb, zs)]]
            M.quad_strip(A1, A2, BR, out)
            # the frieze's top over this bay, on the panel's own vertices (welded: no T-junction, no open edge)
            M.quad_strip(A2, [Vector((X0 - sgn * 0.02, q.y, q.z)) for q in A2], BR, Z)
            # the small arch's soffit (from the face back into the wall), facing the small arch's centre
            S1 = [Vector((fx, y, z + zr0)) for y, z in pts]; S2 = [Vector((X0 - sgn * 0.02, y, z + zr0)) for y, z in pts]
            M.quad_strip(S1, S2, BR, lambda q, ym=ym: Vector((0, ym - (q[0].y + q[1].y) / 2, zs + zr0 - (q[0].z + q[1].z) / 2)))
        for k in range(nbays + 1):
            yc = -WH / 2 + k * bayw
            w = cw if 0 < k < nbays else cw / 2
            yc = yc + (w / 2 if k == 0 else -w / 2 if k == nbays else 0)
            M.box((X0 + sgn * fp / 2, yc, (z0f + zs) / 2 + zr0), (fp, w, zs - z0f), BR, skip=(1, 4) if sgn > 0 else (1, 5))   # (no bevel: no slit under the panel)
        # the band's top (the frieze's upper face) and its two ends
        for side in (1, -1):
            q = [Vector((X0, side * WH / 2, zs + zr0)), Vector((fx, side * WH / 2, zs + zr0)), Vector((fx, side * WH / 2, z1f + zr0)), Vector((X0, side * WH / 2, z1f + zr0))]
            M.poly(q, BR, want=(0, side, 0))
    if T["stones"]:
        st = T["stones"]
        for adeg in st["angles"]:
            a = math.radians(adeg)
            mid = R + T["ring"] / 2
            dep = RP + st["proud"] + 0.04                  # from 4 cm inside the wall to its proud face
            c = Vector((X0 + sgn * (RP + st["proud"] - dep / 2), mid * math.cos(a), HS + mid * math.sin(a) + zr0))
            if adeg in (0, 180):                       # the imposts: level blocks at the springing
                c.z = HS - st["w"] / 2 + 0.02 + zr0
                c.y = math.copysign(R + T["ring"] / 2 + 0.1, math.cos(a))
                D.box(c, (dep, T["ring"] + 0.45, st["w"]), ST)
            else:                                      # radial blocks: long side along the radius
                u = Vector((1, 0, 0)); w = Vector((0, math.cos(a), math.sin(a))); v = w.cross(u)
                D.box(c, (dep, st["w"], st["h"] + 0.1), ST, frame=(u, v, w))
    # the headwall's ends above the wings' roots (the parapet's side), and its hidden back (closed for the bake)
    wtop0 = T["wingTop0"]
    for side in (1, -1):
        q = [Vector((X0, side * WH / 2, wtop0 - 0.3 + zr0)), Vector((back, side * WH / 2, wtop0 - 0.3 + zb)), Vector((back, side * WH / 2, WALL_TOP + zb)), Vector((X0, side * WH / 2, WALL_TOP + zr0))]
        M.poly(q, BR, want=(0, side, 0))
    qb = [Vector((back, -WH / 2, CROWN + 0.5 + zb)), Vector((back, WH / 2, CROWN + 0.5 + zb)), Vector((back, WH / 2, WALL_TOP + zb)), Vector((back, -WH / 2, WALL_TOP + zb))]
    M.poly(qb, BR, want=(-sgn, 0, 0))
    PORTALS.append({"X": X0, "sign": sgn, "top": HTOP, "wallTop": WALL_TOP, "thick": THK, "width": WH})

    # ---- the wing walls: from the headwall's ends, splayed outward, the top sloping to a pier
    for side, wd in ((1, T["wings"][p][0]), (-1, T["wings"][p][1])):
        a = math.radians(wd["splay"])
        d = Vector((sgn * math.cos(a), side * math.sin(a), 0))          # along the wing (outward)
        nk = Vector((-sgn * math.sin(a), side * math.cos(a), 0))       # behind the wall (away from the road)
        p0 = Vector((X0, side * WH / 2, 0)); p1 = p0 + d * wd["length"]
        tw = T["wingTw"]
        t0, t1 = wtop0, wd["tip"]
        z0w, z1w = zroad(p0.x), zroad(p1.x)
        # inner face (towards the road): bricks; outer = hidden back; end face at the tip
        fq = [Vector((p0.x, p0.y, FOUND + z0w)), Vector((p1.x, p1.y, FOUND + z1w)), Vector((p1.x, p1.y, t1 + z1w)), Vector((p0.x, p0.y, t0 + z0w))]
        M.poly(fq, BR, want=-nk)
        M.poly([q + nk * tw for q in fq], BR, want=nk)                 # the hidden back (closed for the bake)
        # the coping along the slope: a sloped slab, overhanging both faces
        e0 = Vector((p0.x, p0.y, t0 + z0w)); e1 = Vector((p1.x, p1.y, t1 + z1w))
        u = (e1 - e0).normalized(); wv = nk.cross(u).normalized()
        if wv.z < 0: wv = -wv
        D.box((e0 + e1) / 2 + nk * (tw / 2) + wv * (CP_T / 2), ((e1 - e0).length, tw + 2 * CP_O, CP_T), TRIM, frame=(u, nk, wv))
        # the pier at the tip: a brick block with a cap
        pw = tw + 0.2                                   # wider than the coping (no shared face plane)
        pc = p1 + nk * (tw / 2) + d * (pw / 2 - 0.06)
        D.box((pc.x, pc.y, (FOUND + t1 + 0.32) / 2 + z1w), (pw, pw, t1 + 0.32 - FOUND), BR, frame=(d, nk, Z))
        D.box((pc.x, pc.y, t1 + 0.32 + 0.08 + z1w), (pw + 0.12, pw + 0.12, 0.16), TRIM, frame=(d, nk, Z))
        WINGS.append({"portal": p, "side": side, "p0": [round(p0.x, 3), round(p0.y, 3)], "p1": [round(p1.x, 3), round(p1.y, 3)],
                      "back": [round(nk.x, 4), round(nk.y, 4)], "top0": t0, "top1": t1, "thick": tw})
        # the floor slab in front of the wing (the cut ground's edge at the wall)
    # the approach slab: the clear ground between the wings, 5 cm under the road
    wl = [w for w in WINGS if w["portal"] == p]
    L1 = next(w for w in wl if w["side"] == 1); R1 = next(w for w in wl if w["side"] == -1)
    poly = [(X0, R + 0.02), (L1["p0"][0], L1["p0"][1]), (L1["p1"][0], L1["p1"][1]), (R1["p1"][0], R1["p1"][1]), (R1["p0"][0], R1["p0"][1]), (X0, -R - 0.02)]
    M.tri_poly([Vector((x, y, SLAB + zroad(x))) for x, y in poly], CO, Z)

    # ---- the wing walls' and headwall's retained earth: what the city's terrain stage needs is in the json (WINGS / PORTALS)

# ---- lamps (emissive only: the city's light count never changes)
lp = T["lamps"]
LAMPS = []
for x in lp["xs"]:
    zr = zroad(x)
    if lp["kind"] == "wall":
        side = lp["side"]; y = side * R
        # a sodium bulkhead on a bracket: housing 0.42 x 0.22 x 0.24 out from the wall, lens on its underside
        wallface = (3,) if side > 0 else (2,)          # the box face against the wall: left out (no coplanar pair)
        F.box((x, y - side * 0.13, lp["z"] + zr), (0.42, 0.26, 0.22), PG, skip=wallface)
        F.box((x, y - side * 0.03, lp["z"] + 0.16 + zr), (0.12, 0.06, 0.12), PG, skip=wallface)
        lz = lp["z"] - 0.11 - 0.004 + zr
        F.poly([Vector((x - 0.18, y - side * 0.03, lz)), Vector((x + 0.18, y - side * 0.03, lz)), Vector((x + 0.18, y - side * 0.23, lz)), Vector((x - 0.18, y - side * 0.23, lz))], LG, want=(0, 0, -1))
        F.poly([Vector((x - 0.18, y - side * 0.264, lz + 0.03)), Vector((x + 0.18, y - side * 0.264, lz + 0.03)), Vector((x + 0.18, y - side * 0.264, lz + 0.17)), Vector((x - 0.18, y - side * 0.264, lz + 0.17))], LG, want=(0, -side, 0))
        LAMPS.append([x, y - side * 0.2, lz])
    else:
        # an LED box hung at the crown: 0.7 x 0.32 x 0.12, its diffuser under it
        cz = CROWN - 0.08 + zr
        F.box((x, 0, cz - 0.06), (0.7, 0.32, 0.12), PG)
        F.box((x, 0, cz + 0.08), (0.08, 0.08, 0.16), PG, skip=(0, 1))   # the hanger, into the vault
        lz = cz - 0.12 - 0.004
        F.poly([Vector((x - 0.31, -0.13, lz)), Vector((x - 0.31, 0.13, lz)), Vector((x + 0.31, 0.13, lz)), Vector((x + 0.31, -0.13, lz))], LG, want=(0, 0, -1))
        LAMPS.append([x, 0, lz])

# ---- guard rails along the kerbs (Brasserie): posts + top rail + X braces, painted steel
br = T["barriers"]
if br:
    for side in (1, -1):
        y = side * (R - br["inset"])
        x0b, x1b = -L / 2 + 1.0, L / 2 - 1.0
        n = max(1, round((x1b - x0b) / br["panel"]))
        for k in range(n + 1):
            x = x0b + (x1b - x0b) * k / n; zr = zroad(x)
            F.box((x, y, (0.05 + 0.15 + br["h"]) / 2 + zr), (0.06, 0.06, 0.15 + br["h"] - 0.05), PG)
        for k in range(n):
            xa = x0b + (x1b - x0b) * k / n; xb = x0b + (x1b - x0b) * (k + 1) / n
            zr = zroad((xa + xb) / 2)
            F.box(((xa + xb) / 2, y, 0.15 + br["h"] - 0.02 + zr), (xb - xa - 0.06, 0.05, 0.04), PG)
            # the X: two flat bars between the posts
            for s in (1, -1):
                pa = Vector((xa + 0.04, y, 0.15 + 0.08 + zr + (0 if s > 0 else br["h"] - 0.18)))
                pb = Vector((xb - 0.04, y, 0.15 + 0.08 + zr + (br["h"] - 0.18 if s > 0 else 0)))
                u = (pb - pa).normalized(); v = Vector((0, 1, 0)); w = u.cross(v).normalized()
                F.box((pa + pb) / 2 + v * (0.012 * s), ((pb - pa).length, 0.012, 0.04), PG, frame=(u, v, w))

# ------------------------------------------------------------------------------------------------ build, bevel, UVs
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
PREVIEW_COL = {"brick_red_brussels": (0.33, 0.12, 0.075), "stone_blue": (0.42, 0.43, 0.44), "concrete": (0.35, 0.34, 0.32),
               "painted_metal_grey": (0.10, 0.10, 0.11), "lamp_glow": (1.0, 0.7, 0.4)}
mats = []
for nm in MAT_NAMES:
    m = bpy.data.materials.new(nm); m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*PREVIEW_COL[nm], 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    mats.append(m)


def make(name, mb, bevel):
    me = bpy.data.meshes.new(name)
    me.from_pydata(mb.v, [], mb.f)
    me.update()
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set("material_index", mb.m)
    uvl = me.uv_layers.new(name="UVMap")
    data = [0.0] * (2 * len(me.loops))
    for pi, poly in enumerate(me.polygons):
        for k, li in enumerate(poly.loop_indices):
            data[2 * li], data[2 * li + 1] = mb.uv[pi][k]
    uvl.data.foreach_set("uv", data)
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0003)
    bm.to_mesh(me); bm.free()
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel; md.segments = 1; md.limit_method = "ANGLE"; md.angle_limit = math.radians(35)
        md.harden_normals = False; md.use_clamp_overlap = True
        for oo in scn.objects: oo.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="bevel")
    return o


print("faces: masonry", len(M.f), "details", len(D.f), "fine", len(F.f))
parts = [make("mass", M, 0.0), make("details", D, 0.01)]
if F.f: parts.append(make("fine", F, 0.0))
for oo in scn.objects: oo.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
obj = parts[0]; obj.name = "tunnel_" + NAME
me = obj.data
me.shade_smooth()
# CLEAN SHADING: a face is smooth only on a CURVED surface (a neighbour at 0.5-12 deg: the vault's, the arches'
# tessellation), never across a planar wall or a box edge
bm = bmesh.new(); bm.from_mesh(me)
for f in bm.faces:
    angs = [e.calc_face_angle(0) for e in f.edges if len(e.link_faces) == 2]
    f.smooth = bool(angs) and min(angs) > math.radians(0.5) and any(a < math.radians(12) for a in angs)
for e in bm.edges:
    lf = e.link_faces
    e.smooth = len(lf) == 2 and lf[0].smooth and lf[1].smooth and e.calc_face_angle(0) < math.radians(12)
bm.to_mesh(me); bm.free()
me.validate()
ntri = sum(len(p.vertices) - 2 for p in me.polygons)
print(f"{NAME}: {ntri} triangles, {len(me.vertices)} vertices, {time.time() - T0:.1f}s")
uv1 = me.uv_layers.new(name="Lightmap")
me.uv_layers.active = uv1
for oo in scn.objects: oo.select_set(False)
obj.select_set(True); bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.002, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0015)
except Exception as e: print("pack_islands:", e)
bpy.ops.object.mode_set(mode="OBJECT")
me.uv_layers.active = me.uv_layers["UVMap"]


# ------------------------------------------------------------------------------------------------ the site for the bake
def ground_model_z(X, Y, lid=False):
    """the city's ground as viewer/rail/tunnels.js leaves it (same rules, simplified): the approaches cut to the road,
    the earth over the barrel (the lid), the retained earth behind the walls at their tops, the DTM elsewhere"""
    zr = zroad(X)
    g = dtmL(X, Y) - ROAD0
    EPS = 0.3                                          # (0.25 m bake grid: its steps fall inside the masonry, behind the faces)
    if abs(X) <= L / 2 - EPS and abs(Y) <= WH / 2:    # over the barrel / behind a headwall
        d = L / 2 - abs(X)
        if abs(Y) <= R + EPS and not lid: return zr - 0.02      # the barrel's floor (the lid mesh is the earth over it)
        return max(min(g, WALL_TOP - 0.1 + 2 * max(0.0, d - THK)), CROWN + 0.9, WALL_TOP - 0.1 if d <= THK else -1e9) + zr
    for p, sgn in ((0, -1), (1, 1)):
        if (X - face_x(sgn)) * sgn < -EPS: continue
        wl = [w for w in WINGS if w["portal"] == p]
        # inside the clear polygon between the wings: the road
        Lw = next(w for w in wl if w["side"] == 1); Rw = next(w for w in wl if w["side"] == -1)
        def side_y(w, Xq):
            (x0, y0), (x1, y1) = w["p0"], w["p1"]
            t = (Xq - x0) / (x1 - x0) if abs(x1 - x0) > 1e-6 else 0
            return (y0 + (y1 - y0) * t, 0 <= t <= 1)
        yl, inl = side_y(Lw, X); yr, inr = side_y(Rw, X)
        if (X - face_x(sgn)) * sgn < 0 and abs(Y) <= WH / 2: return zr - 0.02     # the headwall's first 0.3 m (inside it)
        if inl and inr and yr - EPS <= Y <= yl + EPS: return zr - 0.02
        best = None
        for w in wl:                                   # behind a wing: its top, the DTM beyond (clamped)
            (x0, y0), (x1, y1) = w["p0"], w["p1"]
            dx, dy = x1 - x0, y1 - y0; Lq = math.hypot(dx, dy)
            t = ((X - x0) * dx + (Y - y0) * dy) / (Lq * Lq)
            if t < -0.05 or t > 1.05: continue
            dd = (X - x0) * w["back"][0] + (Y - y0) * w["back"][1]
            if dd < EPS or dd > 10: continue
            top = w["top0"] + (w["top1"] - w["top0"]) * min(1, max(0, t)) - 0.1
            v = top if dd <= w["thick"] else min(max(g, top - (dd - w["thick"]) / 1.5), top + 2 * (dd - w["thick"]))
            best = v if best is None else max(best, v)
        if best is not None: return best + zr
    return g


def site_ground(Rg=50.0, step=0.25):
    n = int(2 * Rg / step)
    verts, faces = [], []
    for j in range(n + 1):
        for i in range(n + 1):
            X = -Rg + i * step; Y = -Rg + j * step
            z = ground_model_z(X, Y)
            verts.append((X, Y, z if z == z else 0.0))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12, 0.13, 0.09, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g


ground = site_ground()
# the earth over the barrel (the city draws it as the terrain's lid, viewer/rail/tunnels.js): a second sheet for the bake
_lv, _lf = [], []
_nx, _ny = int((L - 0.6) / 0.5), int(2 * (R + 0.6) / 0.25)
for j in range(_ny + 1):
    for i in range(_nx + 1):
        X = -L / 2 + 0.3 + i * 0.5; Y = -R - 0.6 + j * 0.25
        _lv.append((X, Y, ground_model_z(X, Y, lid=True)))
for j in range(_ny):
    for i in range(_nx):
        a = j * (_nx + 1) + i
        _lf.append((a, a + 1, a + _nx + 2, a + _nx + 1))
_lm = bpy.data.meshes.new("Lid"); _lm.from_pydata(_lv, [], _lf); _lm.update()
_lm.materials.append(ground.data.materials[0])
lid_obj = bpy.data.objects.new("Lid", _lm); scn.collection.objects.link(lid_obj)

# ------------------------------------------------------------------------------------------------ AO bake into UV1
AO_PX = 1024                                        # the AO is low-frequency light: 4 MB of GPU memory each, not 16
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 6.0
ao_img = bpy.data.images.new(NAME + "_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    nn = nt.nodes.new("ShaderNodeTexImage"); nn.image = ao_img; nn.name = "AO"; nt.nodes.active = nn
ao_path = os.path.join(OUT, f"tunnel_{NAME}_ao.png")
if BAKE:
    scn.cycles.samples = 96
    t = time.time()
    for oo in scn.objects: oo.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=6, use_clear=True)
    print(f"AO bake {time.time() - t:.1f}s")
    ao_img.filepath_raw = ao_path; ao_img.file_format = "PNG"
    ao_img.save()
elif os.path.exists(ao_path):
    ao_img.filepath = ao_path; ao_img.source = "FILE"; ao_img.reload()
for m in mats: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])

# ------------------------------------------------------------------------------------------------ export
ground.hide_set(True); lid_obj.hide_set(True)
for oo in scn.objects: oo.select_set(False)
obj.select_set(True); bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, f"tunnel_{NAME}.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                          export_extras=False, export_vertex_color="NONE")
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
r3 = lambda v: round(v, 3)
info = {
    "asset": f"road tunnel '{NAME}' (tools/blender/railTunnel.py)", "kind": "tunnel", "name": NAME, "road": T["road"], "osm": T["osm"],
    "line": T["line"], "tile": T["tile"], "triangles": ntri, "materials": MAT_NAMES,
    "frame": "glTF Y up; +x = along the road (OSM first node -> last, city direction theta), -z = Blender +Y (the road's left); origin = the barrel's centre on its axis at road level",
    "placement": {"city_local_position": [r3(MX), r3(ROAD0), r3(MZ)], "rotation_y_rad": -TH},
    # the generic hero-bridge fields bridgeModel.js reads (LOD centre, kind)
    "deck": {"length": r3(L + 2 * max(reach)), "width": r3(WH)},
    "grade": round(GRADE, 5),                                    # road level at local X: placement y + grade * X
    "railTop": r3(RAIL_TOP) if RAIL_TOP else None,
    "barrel": {"length": L, "r": R, "spring": HS, "crown": r3(CROWN), "slab": SLAB, "found": FOUND},
    "portals": [{k: (r3(v) if isinstance(v, float) else v) for k, v in q.items()} for q in PORTALS],
    "wings": WINGS,
    "lamps": [[r3(c) for c in q] for q in LAMPS],
    "lanes": T["lanes"], "roads": T["roads"],
    "measured": "OSM way (axis, ends), DTM 2021 / DHMV II mosaic of the city tiles (road levels beyond the wing tips, the embankment's toe = the portal faces, the retained earth), rail.json (rail top)",
    "estimated": "span (= the drawn lanes), springing, headwall size, ring, string course / corbel frieze, wing splay and length, lamps, guard rails: from Street View (looked at only)",
    "streetview": T["views_ll"],
}
json.dump(info, open(os.path.join(OUT, f"tunnel_{NAME}.json"), "w"), indent=1)

if not PREVIEW:
    sys.exit(0)
# ------------------------------------------------------------------------------------------------ previews (Cycles)
os.makedirs(PREVIEW, exist_ok=True)
ground.hide_set(False); ground.hide_render = False
for m in mats:
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
    col = None
    if m.name == "brick_red_brussels":
        brn = nt.nodes.new("ShaderNodeTexBrick")
        brn.inputs["Scale"].default_value = 1.0
        brn.inputs["Brick Width"].default_value = 0.21; brn.inputs["Row Height"].default_value = 0.065
        brn.inputs["Mortar Size"].default_value = 0.01
        brn.inputs["Color1"].default_value = (0.36, 0.12, 0.07, 1); brn.inputs["Color2"].default_value = (0.26, 0.09, 0.06, 1)
        brn.inputs["Mortar"].default_value = (0.42, 0.40, 0.36, 1)
        nt.links.new(uvn.outputs["UV"], brn.inputs["Vector"])
        col = brn.outputs["Color"]
    uv2 = nt.nodes.new("ShaderNodeUVMap"); uv2.uv_map = "Lightmap"
    ao = nt.nodes.new("ShaderNodeTexImage"); ao.image = ao_img
    nt.links.new(uv2.outputs["UV"], ao.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 1.0
    if col: nt.links.new(col, mul.inputs["Color1"])
    else: mul.inputs["Color1"].default_value = (*PREVIEW_COL[m.name], 1)
    nt.links.new(ao.outputs["Color"], mul.inputs["Color2"])
    nt.links.new(mul.outputs["Color"], p.inputs["Base Color"])
    if m.name == "lamp_glow":
        p.inputs["Emission Color"].default_value = (*T["lamps"]["color"], 1); p.inputs["Emission Strength"].default_value = 30.0
world = scn.world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.35
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1200, 800
scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -0.6
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
lid_obj.hide_set(False)
# the Street View panoramas' positions and headings (lat / lon from the OSM node A: local metres, x east, z south)
LAT0, LON0 = T["A_ll"]
for vname, (lat, lon, hdg) in T["views_ll"].items():
    x = T["A"][0] + (lon - LON0) * 111320 * math.cos(math.radians(lat)); z = T["A"][1] - (lat - LAT0) * 110570
    X, Y = to_local(x, z)
    if abs(X) < L / 2: Y = max(-R + 0.8, min(R - 0.8, Y))      # inside: the panorama's car in the lane (the OSM line is off the drawn lane)
    cam.location = Vector((X, Y, ground_model_z(X, Y) + 2.5)); cam.data.lens = 23.5          # 75 deg across, as the screenshots
    h = math.radians(hdg); dx, dz = math.sin(h), -math.cos(h)
    tX, tY = dx * UX + dz * UZ, dx * VX + dz * VZ
    d = Vector((tX, tY, math.tan(math.radians(T.get("pitch", {}).get(vname, 6)))))
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, f"tunnel_{NAME}_{vname}.png")
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)
print("DONE", time.time() - T0)
