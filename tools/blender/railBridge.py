"""THE RAILWAY BRIDGES OF UCCLE, as hero pieces: built entirely in code (no hand modelling) from MEASURED data and photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/railBridge.py -- <bridge> <out_dir> [--no-bake] [--preview <abs dir>]
      <bridge>  stjob (L26 over Chaussée de Saint-Job, UrbIS bridge/692) | calevoet (L124 Viaduc de Calevoet, bridge/687)
      <out_dir>/<bridge>.glb      one mesh, NAMED material slots from the shared library (brick_red_brussels, stone_blue,
                                  concrete, painted_metal_white) = one draw call per slot; UV0 = metres (planar per face,
                                  "a" along the face, "b" up it), UV1 = lightmap
      <out_dir>/<bridge>_ao.png   ambient occlusion baked with Cycles into UV1 (the ground and the embankments occlude).
                                  ONLY light is baked: no colour, no pattern (the library draws brick and stone from UV0)
      <out_dir>/<bridge>.json     placement in the city, the measurements used, counts
      <preview>/<bridge>_*.png    Cycles renders from the reference photos' viewpoints (data/raw/refs/trains/SOURCES.json)

FRAME (Blender): X along the track (the city direction THETA), Y to its left, Z up; origin = the centre of the UrbIS
bridge polygon at the level of the road under it. glTF turns it Y-up: three.js x = along the track, -z = Blender +Y;
place with position (cx, road, cz), rotation.y = -THETA.

MEASURED, per bridge (see BRIDGES): the UrbIS Land cover polygon (length and width of the deck, its axis), the road under
it (OSM centreline crossing, UrbIS street surfaces: roadway + sidewalks width), the rail top over it and the road level
under it (data/rail/rail.json, LiDAR DTM 2021), hence the skew. ESTIMATED from the photos (Wikimedia Commons, CC BY-SA,
listed in docs/trains/RESEARCH.md): spans and rises of the arches, the springing heights, the stone and brick
vocabulary (pilasters, quoins, voussoirs, the corbel arcade, the hood moulding's scrolls, cornice, parapet, caps),
counts of arches / consoles / voussoirs from the photos.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAME = ARGS[0] if ARGS else "stjob"
OUT = os.path.abspath(ARGS[1] if len(ARGS) > 1 and not ARGS[1].startswith("--") else "models/rail")
BAKE = "--no-bake" not in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
Z = Vector((0, 0, 1))

# ------------------------------------------------------------------------------------------------ the bridges
BRIDGES = {
    # L26 (Schaerbeek - Halle) over Chaussée de Saint-Job, UrbIS bridge/692 (rail bridge, level +1). Brick with blue-stone
    # (petit granit) dressings: one wide SEGMENTAL skew arch over the road between two quoined pilasters, a smaller round
    # arch each side, a corbel table of small round arches on stone consoles under a stone cornice, a brick parapet with a
    # stone coping; the main arch's stone hood moulding drops down the pilaster and ends in a scroll with a ball (photo
    # "détail"). The road crosses the line at 35 deg: the vault is a long skewed barrel (photo "Kauwberg").
    "stjob": {
        "urbis": "bridge/692", "line": "L26", "road": "Chaussée de Saint-Job",
        "centre": (417.42, 791.08), "theta": 151.62, "length": 63.65, "width": 8.70,     # [M] UrbIS polygon (min. rectangle 63.8 x 8.7)
        "road_level": 59.80, "rail_top": 69.76,                                           # [M] DTM under it, rail.json over it
        "road_dir": 6.6, "road_cross": (424.0, 790.0), "road_clear": 11.5,               # [M] OSM axis, UrbIS roadway 9 m + sidewalks
        "main": {"kind": "segment", "rise": 5.3, "spring": 2.3, "ring": 0.72, "pier": 0.6},   # [E] photos
        "pilaster": {"w": 1.70, "proj": 0.30, "cap": 0.55},                               # [E]
        "side": [{"span": 5.0, "gap": 1.2, "spring": 1.4}],                               # [E] one each side, both faces
        "arcade": {"z0": 8.15, "z1": 9.25, "pitch": 1.18, "proj": 0.13},                  # [E] counted 17-19 bays between the pilasters (photos 2023)
        "cornice": 9.25, "parapet": 10.55, "coping": 0.16, "parapet_t": 0.42,
        "ends": "quoin",
        "views": {    # camera (bridge frame, m) -> look-at, lens (35 mm equivalent), for the side-by-side sheets
            "stjob_bridge_2": ((0.0, 30.0, 1.6), (0.0, 0.0, 5.2), 21.0),
            "stjob_bridge_kauwberg": ((-6.0, -24.0, 0.8), (-6.0, 0.0, 5.0), 19.0),
            "stjob_bridge_1": ((30.0, 18.0, 1.5), (-2.0, 0.0, 5.0), 24.0),
        },
    },
    # L124 (Brussels - Charleroi), the Viaduc de Calevoet over Chaussée de Saint-Job / Rue du Château d'Or, UrbIS bridge/687:
    # three tall round arches on brick piers with stone imposts, stone archivolts with a stepped brick edge, a plain brick
    # parapet with a stone coping and a painted steel railing on top (photo "Calevoet Viaduc - Soir").
    "calevoet": {
        "urbis": "bridge/687", "line": "L124", "road": "Chaussée de Saint-Job / Rue du Château d'Or",
        "centre": (-1124.72, 1123.19), "theta": 81.2, "length": 82.2, "width": 9.5,      # [M] UrbIS polygon 47.4 x 9.5 covers the
        # roads only; the DTM keeps dropping under the structure to |s| = 40 m (an embankment would keep it at the rail):
        # the viaduct runs on over the outer slopes - 5 arches, the photo shows the 4th (left, behind trees)
        "road_level": 39.64, "rail_top": 54.59,
        "road_dir": 171.2, "road_cross": (-1124.72, 1123.19), "road_clear": None,
        "arches": {"n": 5, "span": 13.0, "pier": 3.2, "spring": 6.55, "ring": 0.72},       # [E] photo: span ~ ground-to-cornice height, piers span / 4.1
        "cornice": 14.15, "parapet": 15.25, "coping": 0.18, "parapet_t": 0.45,
        "railing": 1.05,
        "ends": "quoin",
        "views": {"calevoet_viaduct": ((0.0, 42.0, 1.4), (0.0, 0.0, 8.0), 24.0)},
    },
    # ROUND 2 (docs/trains/BRIDGES_ROUND2.md). L124 over Rue de Stalle (primary road + trams), UrbIS bridge/686: a red brick
    # viaduct of THREE equal round arches on tall piers (Street View 2024, looked at only: the road and the trams pass the
    # middle arch, the side arches open over the embankment slopes), each pier carrying a flat brick pilaster strip from the
    # footing to a pier head that rises through the parapet, a thin blue-stone impost band where the arches spring, the
    # arch rings plain brick rowlocks (no stone), a stone string course just over the crowns under a low brick parapet with
    # a stone coping, and on it a modern safety fence (galvanised posts, welded-mesh panels). The UrbIS polygon's notches are
    # the pilasters: piers at |X| 8.1-10.5, the abutments' two pilasters at |X| 26.6-29.0 and 31.9-34.3.
    "ruestalle": {
        "urbis": "bridge/686", "line": "L124", "road": "Rue de Stalle",
        "centre": (-1489.0, 276.26), "theta": 64.05, "length": 68.6, "width": 9.4,         # [M] UrbIS polygon 68.6 x 9.4 (+ pilasters)
        "road_level": 31.80, "rail_top": 49.59,                                            # [M] DTM 2021 at the crossing, rail.json
        "road_dir": 154.05, "road_cross": (-1489.0, 276.26), "road_clear": None,          # [M] OSM crosses at 85 deg; built square (the polygon's piers face each other)
        "arches": {"n": 3, "span": 16.2, "pier": 2.4, "spring": 8.3, "ring": 0.36},        # [M] spans / piers: polygon notches; [E] springing: semicircles under the string course
        "cornice": 17.55, "parapet": 18.45, "coping": 0.16, "parapet_t": 0.40,             # [E] Street View: string course over the crowns, parapet ~0.9 m
        "style": "viaduct",
        "end_pilasters": [(28.3, 2.3), (33.1, 2.4)],                                       # [M] |X|, width (polygon notches; the first kept clear of the arch ring)
        "pier_strip": 1.5, "pilaster_proj": 0.30, "pier_head": 1.45,                       # [E] the heads rise through the parapet to the fence top
        "fence": {"h": 1.45, "post": 2.5},                                                # [E] welded-mesh panels between posts
        "ends": None,
        "views": {
            "ruestalle_ne": ((2.0, 40.0, 1.6), (2.0, 0.0, 9.0), 24.0),
            "ruestalle_sw": ((-2.0, -40.0, 1.6), (-2.0, 0.0, 9.0), 24.0),
            "ruestalle_far": ((-30.0, 75.0, 3.0), (0.0, 0.0, 9.0), 30.0),
        },
    },
}
B = BRIDGES[NAME]
L, W = B["length"], B["width"]
H_RAIL = B["rail_top"] - B["road_level"]
DECK = H_RAIL - 0.62                      # ballast trough floor (the viewer lays ballast + sleepers + rails on it)
TOP = B["parapet"]                        # parapet top (under the coping)
FOUND = -2.5                              # walls go this far under the road (the terrain meets them)
TH = math.radians(B["theta"])


def to_local(x, z):
    dx, dz = x - B["centre"][0], z - B["centre"][1]
    mx = dx * math.cos(TH) + dz * math.sin(TH)
    mz = -dx * math.sin(TH) + dz * math.cos(TH)
    return mx, -mz                         # Blender X, Y


# the road's direction in the bridge frame -> skew: X shift per metre of Y along the openings
rel = math.radians(B["road_dir"] - B["theta"])
dirB = Vector((math.cos(rel), -math.sin(rel), 0))
SKEW = dirB.x / dirB.y if abs(dirB.y) > 1e-3 else 0.0      # dX / dY along the road
X_ROAD = to_local(*B["road_cross"])[0] - SKEW * to_local(*B["road_cross"])[1]   # road axis at Y = 0
print(f"{NAME}: L {L} W {W} rail {H_RAIL:.2f} m over the road; skew dX/dY {SKEW:.3f} ({math.degrees(math.atan(abs(SKEW))):.1f} deg); road at X {X_ROAD:.2f}")

MAT_NAMES = ["brick_red_brussels", "stone_blue", "concrete", "painted_metal_white", "brick_yellow", "painted_metal_grey", "wire_mesh_grey"]
BR, ST, CO, PM, BY, PG, WM = 0, 1, 2, 3, 4, 5, 6
STYLE = B.get("style")


# ------------------------------------------------------------------------------------------------ geometry builder
class Mesh:
    def __init__(self):
        self.v, self.f, self.m = [], [], []

    def vert(self, p):
        self.v.append((float(p[0]), float(p[1]), float(p[2])))
        return len(self.v) - 1

    def poly(self, pts, mat):
        idx = [self.vert(p) for p in pts]
        self.f.append(idx); self.m.append(mat)

    def npoly(self, pts, mat, normal):
        """A planar n-gon with holes-free, maybe concave outline: tessellated, oriented to `normal`."""
        pts = [Vector(p) for p in pts]
        n = Vector(normal).normalized()
        t = n.cross(Z) if abs(n.z) < 0.9 else Vector((1, 0, 0))
        t.normalize(); b = n.cross(t)
        tri = tessellate_polygon([[(p.dot(t), p.dot(b), 0) for p in pts]])
        base = len(self.v)
        for p in pts: self.vert(p)
        for a, bb, c in tri:
            pa, pb, pc = pts[a], pts[bb], pts[c]
            if (pb - pa).cross(pc - pa).dot(n) < 0: bb, c = c, bb
            self.f.append([base + a, base + bb, base + c]); self.m.append(mat)

    def quad_strip(self, A, Bp, mat, closed=False, flip=False):
        """Quads between two polylines of equal length."""
        n = len(A)
        rng = range(n if closed else n - 1)
        for i in rng:
            j = (i + 1) % n
            q = [A[i], A[j], Bp[j], Bp[i]]
            self.poly(q[::-1] if flip else q, mat)

    def box(self, c, size, mat, rotz=0.0, frame=None):
        """Axis box (centre, size), optionally turned about Z, or given a frame (u, v, w unit vectors)."""
        hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        u, v, w = frame or (Vector((math.cos(rotz), math.sin(rotz), 0)), Vector((-math.sin(rotz), math.cos(rotz), 0)), Z)
        c = Vector(c)
        P = [c + u * sx * hx + v * sy * hy + w * sz * hz for sz in (-1, 1) for sy in (-1, 1) for sx in (-1, 1)]
        for q in ((0, 2, 3, 1), (4, 5, 7, 6), (0, 1, 5, 4), (2, 6, 7, 3), (0, 4, 6, 2), (1, 3, 7, 5)):
            self.poly([P[k] for k in q], mat)

    def prism(self, outline, origin, u, v, w, depth, mat, caps=True):
        """Extrude a 2D outline (in the u, v plane at origin) by depth along w (outline counter-clockwise in u, v)."""
        o = Vector(origin)
        F = [o + u * a + v * b for a, b in outline]
        K = [p + w * depth for p in F]
        n = len(F)
        for i in range(n):
            j = (i + 1) % n
            self.poly([F[i], F[j], K[j], K[i]], mat)
        if caps:
            self.npoly(F, mat, -w)
            self.npoly(K, mat, w)

    def sweep(self, profile, path, ups, mat, cap=True):
        """Sweep a closed 2D profile (x = sideways, y = up, in the path's normal plane) along path points."""
        rings = []
        for i, p in enumerate(path):
            tng = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            up = ups[i] - tng * ups[i].dot(tng); up.normalize()
            side = tng.cross(up)
            rings.append([p + side * a + up * b for a, b in profile])
        for k in range(len(rings) - 1):
            self.quad_strip(rings[k + 1], rings[k], mat, closed=True)
        if cap:
            tA = (path[1] - path[0]).normalized(); tB = (path[-1] - path[-2]).normalized()
            self.npoly(rings[0], mat, -tA); self.npoly(rings[-1], mat, tB)

    def sphere(self, c, r, mat, seg=12, ring=8):
        c = Vector(c)
        R = [[c + Vector((r * math.sin(math.pi * i / ring) * math.cos(2 * math.pi * k / seg), r * math.sin(math.pi * i / ring) * math.sin(2 * math.pi * k / seg), r * math.cos(math.pi * i / ring))) for k in range(seg)] for i in range(ring + 1)]
        for i in range(ring):
            for k in range(seg):
                kk = (k + 1) % seg
                self.poly([R[i][k], R[i + 1][k], R[i + 1][kk], R[i][kk]], mat)


MASS, DET, FINE = Mesh(), Mesh(), Mesh()       # walls / vaults / deck; stone + brick details (bevelled); railing (thin)


# ------------------------------------------------------------------------------------------------ arch curves
def seg_arch(x0, x1, zs, rise, n=48):
    """Segmental arch intrados from (x0, zs) to (x1, zs) with the given rise (a circle)."""
    s = x1 - x0; R = (s * s / 4 + rise * rise) / (2 * rise); cx = (x0 + x1) / 2; cz = zs + rise - R
    a = math.asin(min(1.0, s / 2 / R))
    return [(cx + R * math.sin(-a + 2 * a * k / n), cz + R * math.cos(-a + 2 * a * k / n)) for k in range(n + 1)], (cx, cz, R, a)


def round_arch(x0, x1, zs, n=32):
    r = (x1 - x0) / 2; cx = (x0 + x1) / 2
    return [(cx - r * math.cos(math.pi * k / n), zs + r * math.sin(math.pi * k / n)) for k in range(n + 1)], (cx, zs, r, math.pi / 2)


# openings: per face (Y = +W/2 front, -W/2 back): (x0, x1, curve [(x, z)...], info, kind)
def opening_at(face_y, x0_axis, x1_axis, maker):
    dx = SKEW * face_y
    return (x0_axis + dx, x1_axis + dx, maker(x0_axis + dx, x1_axis + dx))


def openings():
    """The arches at Y = 0 (the axis); each face sees them shifted by the skew."""
    ops = []
    if "main" in B:
        m = B["main"]
        span_axis = B["road_clear"] / abs(math.sin(rel)) if B["road_clear"] else 20.0   # [M] clear width across the road -> along the face
        x0, x1 = X_ROAD - span_axis / 2, X_ROAD + span_axis / 2
        ops.append({"x0": x0, "x1": x1, "kind": "segment", "rise": m["rise"], "spring": m["spring"], "ring": m["ring"], "main": True, "floor": 0.0})
        p = B["pilaster"]
        for sgn in (-1, 1):
            for sd in B.get("side", []):
                edge = (x0 if sgn < 0 else x1) + sgn * (0.4 + p["w"] + sd["gap"])
                a, b = (edge - sd["span"], edge) if sgn < 0 else (edge, edge + sd["span"])
                ops.append({"x0": a, "x1": b, "kind": "round", "spring": sd["spring"], "ring": 0.5, "main": False, "floor": 0.35})
    if "arches" in B:
        a = B["arches"]; n = a["n"]
        total = n * a["span"] + (n - 1) * a["pier"]
        for k in range(n):
            x0 = X_ROAD - total / 2 + k * (a["span"] + a["pier"])
            ops.append({"x0": x0, "x1": x0 + a["span"], "kind": "round", "spring": a["spring"], "ring": a.get("ring", 0.62), "main": True, "floor": None})
    return ops


OPS = openings()
for o in OPS: print("opening", {k: (round(v, 2) if isinstance(v, float) else v) for k, v in o.items()})


def curve_of(o, dx=0.0, n=None):
    if o["kind"] == "segment":
        pts, info = seg_arch(o["x0"] + dx, o["x1"] + dx, o["spring"], o["rise"], n or 56)
    else:
        pts, info = round_arch(o["x0"] + dx, o["x1"] + dx, o["spring"], n or 32)
    return pts, info


# ------------------------------------------------------------------------------------------------ the mass: faces, vaults, deck
def face_outline(face_y):
    """The face wall's outline in (x, z): the bottom notched up into every opening."""
    dx = SKEW * face_y
    out = [(-L / 2, FOUND)]
    for o in sorted(OPS, key=lambda o: o["x0"]):
        pts, _ = curve_of(o, dx)
        out += [(pts[0][0], FOUND)] + pts + [(pts[-1][0], FOUND)]
    out += [(L / 2, FOUND), (L / 2, TOP), (-L / 2, TOP)]
    return out


for sgn in (1, -1):
    fy = sgn * W / 2
    ol = face_outline(fy)
    MASS.npoly([(x, fy, z) for x, z in ol], BR, (0, sgn, 0))

# vaults: ruled surfaces between the two faces' arch curves (+ the abutment walls under the springing)
for o in OPS:
    pf, _ = curve_of(o, SKEW * W / 2); pb, _ = curve_of(o, -SKEW * W / 2)
    full_f = [(pf[0][0], FOUND)] + pf + [(pf[-1][0], FOUND)]
    full_b = [(pb[0][0], FOUND)] + pb + [(pb[-1][0], FOUND)]
    A = [Vector((x, W / 2, z)) for x, z in full_f]
    Bv = [Vector((x, -W / 2, z)) for x, z in full_b]
    MASS.quad_strip(A, Bv, BR, flip=False)

# ends of the mass (buried in the embankment, closed for the bake) and the top: parapets + ballast trough
PT = B["parapet_t"]
for sx in (-1, 1):
    X = sx * L / 2
    # the end walls stop at the trough floor between the parapets: the track runs on onto the embankment over them (a
    # full-height end wall stood 0.6-1.3 m out of the ballast where the embankment is the track bed: Rue de Stalle)
    yi = W / 2 - B["parapet_t"]
    MASS.npoly([(X, -W / 2, FOUND), (X, W / 2, FOUND), (X, W / 2, TOP), (X, yi, TOP), (X, yi, H_RAIL - 0.62), (X, -yi, H_RAIL - 0.62),
                (X, -yi, TOP), (X, -W / 2, TOP)], BR, (sx, 0, 0))
for sgn in (1, -1):
    yo, yi = sgn * W / 2, sgn * (W / 2 - PT)
    MASS.npoly([(-L / 2, yi, DECK), (L / 2, yi, DECK), (L / 2, yi, TOP), (-L / 2, yi, TOP)], BR, (0, -sgn, 0))   # parapet inner face
MASS.npoly([(-L / 2, -(W / 2 - PT), DECK), (L / 2, -(W / 2 - PT), DECK), (L / 2, W / 2 - PT, DECK), (-L / 2, W / 2 - PT, DECK)], CO, (0, 0, 1))

# coping: a stone slab on each parapet, 5 cm overhang both sides, weathered top
CP = B["coping"]
for sgn in (1, -1):
    yc = sgn * (W / 2 - PT / 2)
    DET.box((0, yc, TOP + CP / 2), (L + 0.1, PT + 0.10, CP), ST)

# ------------------------------------------------------------------------------------------------ details on each face
def on_face(sgn, x, d, z):
    """A point on face sgn: x along, d out of the face (metres in front of it), z up."""
    return Vector((x, sgn * (W / 2 + d), z))


def face_frame(sgn):
    return Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0))   # u along, v up, w out


CORN = B["cornice"]
# cornice: a moulded stone string course along the whole face (ogee + fillet), profile in (out, up)
CORNICE = [(0.0, -0.32), (0.06, -0.32), (0.06, -0.26), (0.10, -0.22), (0.13, -0.15), (0.15, -0.08), (0.20, -0.06), (0.22, 0.0), (0.0, 0.0)]
for sgn in ((1, -1) if STYLE != "viaduct" else ()):
    u, v, w = face_frame(sgn)
    for k in range(len(CORNICE)):
        a, b = CORNICE[k], CORNICE[(k + 1) % len(CORNICE)]
        P = [on_face(sgn, -L / 2, a[0], CORN + a[1]), on_face(sgn, L / 2, a[0], CORN + a[1]), on_face(sgn, L / 2, b[0], CORN + b[1]), on_face(sgn, -L / 2, b[0], CORN + b[1])]
        DET.poly(P if sgn > 0 else P[::-1], ST)
    for sx in (-1, 1):
        DET.npoly([on_face(sgn, sx * L / 2, a, CORN + b) for a, b in CORNICE], ST, (sx, 0, 0))

# string course at the parapet foot on the inside? (not visible) - none. Plinth band at the road: a blue-stone base course
for sgn in (1, -1):
    pass


def voussoirs(sgn, o, info, ring, n_st, stone_long=0.35):
    """The arch ring on a face: brick ring (slightly proud), with n_st stone voussoirs (alternating long / short tails)
    and a stone springer at each end."""
    dx = SKEW * sgn * W / 2
    pts, _ = curve_of(o, dx)
    cx, cz, R, a = info
    proud = 0.05
    # brick ring: an extruded band between the intrados and intrados + ring, proud of the face
    inner = [Vector((x, 0, z)) for x, z in pts]
    outer = []
    for x, z in pts:
        nrm = Vector((x - cx, 0, z - cz)).normalized()
        outer.append(Vector((x, 0, z)) + nrm * ring)
    ring_poly = [(p.x, p.z) for p in inner] + [(p.x, p.z) for p in reversed(outer)]
    DET.prism(ring_poly, (0, sgn * W / 2 - 0.02 * sgn, 0), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), proud + 0.02, BR)
    # stone voussoirs: radial blocks at even angles; t = 0 and 1 are the springers
    span_a = (math.atan2(pts[-1][0] - cx, pts[-1][1] - cz) - math.atan2(pts[0][0] - cx, pts[0][1] - cz))
    a0 = math.atan2(pts[0][0] - cx, pts[0][1] - cz)
    for k in range(n_st):
        t = k / (n_st - 1)
        ang = a0 + span_a * t
        nrm = Vector((math.sin(ang), 0, math.cos(ang)))
        tang = Vector((math.cos(ang), 0, -math.sin(ang)))
        base = Vector((cx, 0, cz)) + nrm * R
        tail = ring + (stone_long if k % 2 == 0 else stone_long * 0.45)
        half = 0.22 if 0 < k < n_st - 1 else 0.32
        if k == (n_st - 1) // 2 and n_st % 2 == 1: half, tail = 0.30, ring + stone_long * 1.25     # keystone
        quad = [base + tang * -half, base + tang * half, base + tang * half + nrm * tail, base + tang * -half + nrm * tail]
        if k in (0, n_st - 1):                     # springer: square below the springing line
            quad = [base + tang * -half, base + tang * half, base + tang * half + nrm * tail, base + tang * -half + nrm * tail]
        DET.prism([(p.x, p.z) for p in quad], (0, sgn * W / 2 - 0.02 * sgn, 0), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), proud + 0.045, ST)
    return outer


def roll_mould(sgn, path_xz, r=0.085, d=0.10):
    """A stone roll moulding (hood) along a path on face sgn, d proud."""
    prof = [(r * math.cos(2 * math.pi * k / 10), r * math.sin(2 * math.pi * k / 10)) for k in range(10)]
    path = [on_face(sgn, x, d, z) for x, z in path_xz]
    ups = [Vector((0, sgn, 0))] * len(path)
    DET.sweep(prof, path, ups, ST)


def scroll(sgn, x, z, r0=0.33, turns=1.25, side=1, d=0.10):
    """The hood moulding's end: a spiral of the roll, ending in a ball (photo 'détail'): starts going down at (x, z)."""
    pts = []
    n = 36
    cx, cz = x - side * r0, z
    for k in range(n + 1):
        t = k / n
        ang = 2 * math.pi * turns * t
        r = r0 * (1 - 0.62 * t)
        pts.append((cx + side * r * math.cos(ang), cz - r * math.sin(ang)))
    roll_mould(sgn, pts, r=0.085 * (1.0), d=d)
    DET.sphere(on_face(sgn, pts[-1][0], d + 0.03, pts[-1][1]), 0.13, ST, seg=12, ring=8)


def calevoet_arch(sgn, o, info, dx):
    """The Calevoet arch ring (photo "Calevoet Viaduc - Soir"): a lighter brick ring several rowlock courses deep, proud
    of the face by 12 cm, its extrados STEPPED (the bricks of the spandrel step round it), the intrados plain."""
    cx, cz, R, a = info
    ring = o["ring"]
    n = 44
    inner = [(cx - R * math.cos(math.pi * k / n), cz + R * math.sin(math.pi * k / n)) for k in range(n + 1)]
    # stepped extrados: the outer arc sampled, each step a horizontal then a vertical run (0.15-0.3 m treads)
    m = 22
    arc = [(cx - (R + ring) * math.cos(math.pi * k / m), cz + (R + ring) * math.sin(math.pi * k / m)) for k in range(m + 1)]
    steps = [arc[0]]
    for k in range(1, m + 1):
        (x0, z0), (x1, z1) = steps[-1], arc[k]
        if k <= m // 2: steps += [(x0, z1), (x1, z1)]        # rising half: up, then across
        else: steps += [(x1, z0), (x1, z1)]                  # falling half: across, then down
    outline = inner + list(reversed(steps))
    base = (0, sgn * W / 2 - 0.02 * sgn, 0)
    DET.prism(outline, base, Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), 0.14, BY)
    # a thin brick course framing the intrados edge (the ring's soffit lip)
    lip = inner + [(cx - (R + 0.11) * math.cos(math.pi * k / n), cz + (R + 0.11) * math.sin(math.pi * k / n)) for k in range(n, -1, -1)]
    DET.prism(lip, base, Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), 0.17, BY)


def calevoet_piers(sgn, dx):
    """Piers: a stone impost band where each arch springs (wrapping the pier face), a brick pilaster strip up each pier
    centre to under the string course ending in a stepped corbel; a stone string course under the parapet."""
    arches = sorted(OPS, key=lambda o: o["x0"])
    zs = arches[0]["spring"]
    for o in arches:
        for xx, side in ((o["x0"] + dx, -1), (o["x1"] + dx, 1)):
            # impost: a stone band from the arch edge across the pier (0.35 high, 10 cm proud), with a chamfered nose
            w = B["arches"]["pier"] / 2 + 0.05
            DET.box(on_face(sgn, xx + side * w / 2, 0.06, zs - 0.18), (w + 0.04, 0.12, 0.36), ST)
    for k in range(len(arches) - 1):
        xm = (arches[k]["x1"] + arches[k + 1]["x0"]) / 2 + dx
        top = CORN - 0.75
        DET.box(on_face(sgn, xm, 0.09, (FOUND + zs - 0.4) / 2), (1.15, 0.18, zs - 0.4 - FOUND), BR)        # strip under the impost
        DET.box(on_face(sgn, xm, 0.09, (zs + top) / 2), (1.15, 0.18, top - zs), BR)                       # above it
        for j, w in enumerate((0.95, 0.72, 0.5, 0.28)):
            DET.box(on_face(sgn, xm, 0.09 - 0.015 * j, top + 0.09 + j * 0.17), (w, 0.18 - 0.03 * j, 0.17), BR)
    # stone string course along the face under the parapet + a plinth course at the pier feet
    DET.box(on_face(sgn, 0, 0.05, CORN + 0.1), (L, 0.12, 0.28), ST)



def viaduct_arch(sgn, o, info):
    """Rue de Stalle: a plain brick rowlock ring (0.36 m) 7 cm proud of the spandrel, an outer header course 3.5 cm proud
    round it (the stepped edge Street View shows), the intrados plain. Both stop short of the pier strips (clean mesh: no
    shallow crossing), the ring's soffit 1 cm off the vault's."""
    cx, cz, R, a = info
    ring = o["ring"]; n = 44
    arc = lambda r: [(cx - r * math.cos(math.pi * k / n), cz + r * math.sin(math.pi * k / n)) for k in range(n + 1)]
    y0 = sgn * (W / 2 - 0.02)
    ring_band(arc(R + 0.01), arc(R + ring), y0, sgn * 0.09, BR)
    ring_band(arc(R + ring), arc(R + ring + 0.07), y0, sgn * 0.055, BR)


def ring_band(inner, outer, y0, depth, mat):
    """An arch band (inner / outer arcs of equal count, in x z) from the plane Y = y0 out by depth: its caps as QUADS between
    the two arcs (a fan / ear-clipped thin annulus gives overlapping slivers), the curved sides, the two springer ends."""
    P = lambda pts, y: [Vector((x, y, z)) for x, z in pts]
    iB, oB, iF, oF = P(inner, y0), P(outer, y0), P(inner, y0 + depth), P(outer, y0 + depth)
    out = depth > 0
    DET.quad_strip(iF, oF, mat, flip=out)          # front cap
    # no back cap: it lies 2 cm inside the wall (clean mesh: hidden backs are left out)
    DET.quad_strip(iB, iF, mat, flip=out)          # soffit side
    DET.quad_strip(oB, oF, mat, flip=not out)      # extrados side
    for k in (0, -1):                              # the two ends
        q = [iB[k], oB[k], oF[k], iF[k]]
        DET.poly(q if (k == 0) == out else q[::-1], mat)


def viaduct_piers(sgn):
    """Rue de Stalle: per pier a brick pilaster strip from the footing to a capped head over the coping, a blue-stone
    plinth and an impost band at the springing (across the pier face, returning into the soffit); the abutments' two
    pilasters; the stone string course along the face over the crowns."""
    arches = sorted(OPS, key=lambda o: o["x0"])
    zs = arches[0]["spring"]; pp = B["pilaster_proj"]
    strips = [((arches[k]["x1"] + arches[k + 1]["x0"]) / 2, B["pier_strip"]) for k in range(len(arches) - 1)]
    for xa, w in B.get("end_pilasters", []):
        strips += [(-xa, w), (xa, w)]
    head = TOP + B["coping"] + B["pier_head"]
    for xm, w in strips:
        # (CLEAN MESH: no two boxes share a face plane where they overlap - backs, tops and ends are staggered by >= 1 cm)
        xm_c = max(-L / 2 + w / 2 + 0.02, min(L / 2 - w / 2 - 0.02, xm))          # the end pilaster stops 2 cm short of the end wall
        if xm_c != xm: w = w - 2 * abs(xm_c - xm); xm = xm_c
        zt = TOP - 0.12
        DET.box(on_face(sgn, xm, (pp - 0.05) / 2, (FOUND + zt) / 2), (w, pp + 0.05, zt - FOUND), BR)                 # back -0.05
        # two corbelled courses widening the strip under the string course (the pier head's footing)
        for j, (dw, dp) in enumerate(((0.16, 0.06), (0.32, 0.11))):
            bk = 0.035 - 0.01 * j
            DET.box(on_face(sgn, xm, (pp + dp - bk) / 2, CORN - 0.55 + j * 0.22), (w + dw, pp + dp + bk, 0.22), BR)   # backs -0.035 / -0.025
        # the head over the coping: thickened through the parapet, a stone cap with a weathered (sloped) top
        hb = TOP - 0.25
        DET.box(on_face(sgn, xm, (pp + 0.02 - PT - 0.02) / 2, (hb + head) / 2), (w + 0.1, PT + 0.02 + pp + 0.02, head - hb), BR)
        c = on_face(sgn, xm, (pp + 0.02 - PT - 0.02) / 2, head + 0.07)
        DET.box(c, (w + 0.26, PT + pp + 0.2, 0.14), ST)
        DET.box(c + Vector((0, 0, 0.11)), (w + 0.06, PT + pp, 0.08), ST)
        # blue-stone plinth: 0.75 m over the ground line, chamfered course on top
        DET.box(on_face(sgn, xm, (pp + 0.06 - 0.015) / 2, (FOUND + 0.75) / 2), (w + 0.14, pp + 0.06 + 0.015, 0.75 - FOUND), ST)
        DET.box(on_face(sgn, xm, (pp + 0.03 - 0.012) / 2, 0.8), (w + 0.08, pp + 0.03 + 0.012, 0.1), ST)
    # impost bands: a stone course 0.32 m high at the springing, across every pier face, 6 cm proud
    for k in range(len(arches) - 1):
        xa, xb = arches[k]["x1"], arches[k + 1]["x0"]
        DET.box(on_face(sgn, (xa + xb) / 2, 0.03, zs - 0.16), (xb - xa + 0.10, 0.06 + 0.04 - 0.008, 0.32), ST)
    for o in (arches[0], arches[-1]):                       # the abutments' side of the outer arches
        xe = o["x0"] if o is arches[0] else o["x1"]
        sx = -1 if o is arches[0] else 1
        DET.box(on_face(sgn, xe + sx * 0.6, 0.03, zs - 0.16), (1.2 + 0.10, 0.092, 0.32), ST)
    # string course: a stone band 0.3 m high, 12 cm proud, a drip under it
    DET.box(on_face(sgn, 0, 0.06, CORN - 0.15), (L - 0.03, 0.12 + 0.04, 0.3), ST)
    DET.box(on_face(sgn, 0, 0.095, CORN - 0.33), (L - 0.05, 0.07, 0.06), ST)


def viaduct_impost_soffit():
    """The impost band returns into the arch soffits (both piers' sides): a stone course 4 cm proud of the vault's wall."""
    arches = sorted(OPS, key=lambda o: o["x0"])
    zs = arches[0]["spring"]
    for o in arches:
        for xe, sx in ((o["x0"], 1), (o["x1"], -1)):
            DET.box((xe + sx * 0.02, 0, zs - 0.165), (0.08, W + 0.04, 0.30), ST)       # 1 cm inside the face band's top / bottom

ops_sorted = sorted(OPS, key=lambda o: o["x0"])
for sgn in (1, -1):
    dx = SKEW * sgn * W / 2
    for o in OPS:
        pts, info = curve_of(o, dx)
        ring = o["ring"]
        outer = voussoirs(sgn, o, info, ring, 11 if o["main"] and o["kind"] == "segment" else (9 if o["main"] else 7)) if NAME != "calevoet" and not STYLE else None
        if o["main"] and o["kind"] == "segment":
            # hood moulding along the extrados, down the pilasters' sides, into the scrolls
            hood = [(p.x, p.z + 0.0) for p in outer]
            cx, cz, R, a = info
            hood = []
            for x, z in pts:
                nrm = Vector((x - cx, 0, z - cz)).normalized()
                q = Vector((x, 0, z)) + nrm * (ring + 0.12)
                hood.append((q.x, q.z))
            zs = o["spring"]
            left = [(hood[0][0] + 0.0, hood[0][1] - t) for t in (0.6, 0.3)]
            right = [(hood[-1][0], hood[-1][1] - t) for t in (0.3, 0.6)]
            roll_mould(sgn, left[::1][::-1][::-1] + hood + right)
            # drop to the scroll: vertical run down along the pilaster's inner edge, then the spiral
            for side, (hx, hz) in ((-1, hood[0]), (1, hood[-1])):
                zt = hz - 0.6
                zb = zs - 0.15
                roll_mould(sgn, [(hx, zt), (hx, (zt + zb) / 2), (hx, zb)])
                scroll(sgn, hx, zb, side=-side)
        if NAME == "calevoet":
            calevoet_arch(sgn, o, info, dx)
        elif STYLE == "viaduct":
            viaduct_arch(sgn, o, info)
    # pilasters (St-Job): quoined, a stone base, a stone capital block at the arcade, a cap above the parapet
    if "pilaster" in B:
        p = B["pilaster"]
        main = [o for o in OPS if o["main"]][0]
        for xe, sx in ((main["x0"] + dx - 0.4 - p["w"] / 2, -1), (main["x1"] + dx + 0.4 + p["w"] / 2, 1)):
            pw, pp = p["w"], p["proj"]
            ztop = TOP + CP + 0.05
            DET.box(on_face(sgn, xe, pp / 2 - 0.02, (FOUND + ztop) / 2), (pw, pp + 0.04, ztop - FOUND), BR)
            DET.box(on_face(sgn, xe, pp / 2 + 0.01, (FOUND + 1.45) / 2), (pw + 0.12, pp + 0.10, 1.45 - FOUND), ST)        # stone base
            DET.box(on_face(sgn, xe, pp / 2 + 0.03, 1.52), (pw + 0.18, pp + 0.14, 0.14), ST)                                   # base moulding
            # quoins up both vertical edges, alternating long / short, 0.34 m courses
            z = 1.6
            k = 0
            ztop_q = B["arcade"]["z0"] if "arcade" in B else CORN - 0.4
            while z + 0.34 < ztop_q:
                for edge in (-1, 1):
                    long = (k + (edge > 0)) % 2 == 0
                    qw = 0.52 if long else 0.30                 # along the face; the return on the side alternates the other way
                    DET.box(on_face(sgn, xe + edge * (pw / 2 - qw / 2 + 0.025), pp / 2 + 0.005, z + 0.17), (qw + 0.05, pp + 0.07, 0.32), ST)
                z += 0.34; k += 1
            za = B["arcade"]["z0"] if "arcade" in B else CORN - 0.6
            DET.box(on_face(sgn, xe, pp / 2 + 0.03, (za + CORN) / 2), (pw + 0.10, pp + 0.10, CORN - za), ST)                    # stone block at the arcade
            DET.box(on_face(sgn, xe, pp / 2 + 0.04, CORN + 0.04), (pw + 0.22, pp + 0.22, 0.1), ST)
            # cap above the coping: a stone block with a cushioned (domed) top
            cap_z0 = TOP + CP
            DET.box(on_face(sgn, xe, pp / 2 - 0.05, cap_z0 + 0.2), (pw + 0.06, pp + PT + 0.12, 0.4), ST)
            # dome: a squashed half sphere
            c = on_face(sgn, xe, pp / 2 - 0.05, cap_z0 + 0.4)
            n0 = len(DET.v)
            DET.sphere(c, 1.0, ST, seg=12, ring=6)
            for i in range(n0, len(DET.v)):
                vx, vy, vz = DET.v[i]
                dz = max(0.0, vz - c.z)
                DET.v[i] = (c.x + (vx - c.x) * (pw / 2 + 0.02), c.y + (vy - c.y) * ((pp + PT) / 2 + 0.05), c.z + dz * 0.22)

    # corbel table (St-Job): small round brick arches on stone consoles between the pilasters, under the cornice
    if "arcade" in B:
        ar = B["arcade"]; p = B["pilaster"]
        main = [o for o in OPS if o["main"]][0]
        xa, xb = main["x0"] + dx - 0.4, main["x1"] + dx + 0.4
        n = max(4, round((xb - xa) / ar["pitch"]))
        pitch = (xb - xa) / n
        z0, z1, pr = ar["z0"], ar["z1"], ar["proj"]
        zsp = z1 - pitch * 0.5 - 0.10                       # springing of the little arches
        for k in range(n):
            a, b = xa + k * pitch, xa + (k + 1) * pitch
            cxk = (a + b) / 2; rr = pitch / 2 - 0.09
            # the corbelled band's face over this bay: a rectangle with a round notch underneath
            outline = [(a, zsp - 0.0), (a + 0.09, zsp)]
            for j in range(13):
                ang = math.pi - math.pi * j / 12
                outline.append((cxk + rr * math.cos(ang), zsp + rr * math.sin(ang)))
            outline += [(b - 0.09, zsp), (b, zsp), (b, z1), (a, z1)]
            DET.prism(outline, (0, sgn * W / 2 - 0.02 * sgn, 0), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), pr + 0.02, BR)
            # the little arch's stone-less brick ring: a thin proud band round the notch (reads as the arch)
            ringp = []
            for j in range(13):
                ang = math.pi - math.pi * j / 12
                ringp.append((cxk + (rr + 0.075) * math.cos(ang), zsp + (rr + 0.075) * math.sin(ang)))
            for j in range(12, -1, -1):
                ang = math.pi - math.pi * j / 12
                ringp.append((cxk + rr * math.cos(ang), zsp + rr * math.sin(ang)))
            DET.prism(ringp, (0, sgn * (W / 2 + pr) - 0.0 * sgn, 0), Vector((1, 0, 0)), Vector((0, 0, 1)), Vector((0, sgn, 0)), 0.025, BR)
        for k in range(n + 1):
            x = xa + k * pitch
            if k in (0, n):
                continue
            # console: a stone block hanging under the band, its lower face rounded off (two steps)
            DET.box(on_face(sgn, x, pr / 2 + 0.01, zsp - 0.05), (0.2, pr + 0.06, 0.26), ST)
            DET.box(on_face(sgn, x, pr / 2 - 0.01, zsp - 0.24), (0.16, pr + 0.0, 0.14), ST)
            DET.box(on_face(sgn, x, pr / 2 - 0.03, zsp - 0.36), (0.11, pr - 0.04, 0.10), ST)

    # end piers: stone quoins at the two ends of the face
    if B.get("ends") == "quoin":
        for sx in (-1, 1):
            z = 0.0; k = 0
            while z + 0.34 < CORN - 0.35:
                long = k % 2 == 0
                qw = 0.5 if long else 0.28
                DET.box(on_face(sgn, sx * (L / 2 - qw / 2), 0.025, z + 0.17), (qw, 0.07, 0.32), ST)
                z += 0.34; k += 1

    if NAME == "calevoet":
        calevoet_piers(sgn, dx)
    elif STYLE == "viaduct":
        viaduct_piers(sgn)

# railing (Calevoet): painted steel posts + two rails on the coping, both sides
if B.get("railing"):
    hR = B["railing"]
    for sgn in (1, -1):
        yc = sgn * (W / 2 - PT / 2)
        zb = TOP + CP
        for k in range(int(L / 1.6) + 1):
            x = -L / 2 + 0.2 + k * (L - 0.4) / int(L / 1.6)
            FINE.box((x, yc, zb + hR / 2), (0.06, 0.06, hR), PM)
        for zr in (zb + hR, zb + hR * 0.5, zb + 0.12):
            FINE.box((0, yc, zr), (L - 0.2, 0.05, 0.05), PM)

# fence (Rue de Stalle): galvanised posts every ~2.5 m on the coping between the pier heads, a top rail, welded-mesh
# panels (the wire_mesh_grey slot draws the wires: alpha-to-coverage), both sides
if B.get("fence"):
    fh = B["fence"]["h"]; zb = TOP + B["coping"]
    heads = []
    if STYLE == "viaduct":
        arches = sorted(OPS, key=lambda o: o["x0"])
        heads = [((arches[k]["x1"] + arches[k + 1]["x0"]) / 2, B["pier_strip"]) for k in range(len(arches) - 1)]
        for xa, w in B.get("end_pilasters", []): heads += [(-xa, w), (xa, w)]
    gaps, cur = [], -L / 2
    for lo, hi in sorted((x - w / 2 - 0.05, x + w / 2 + 0.05) for x, w in heads):
        if lo > cur: gaps.append((cur, lo))
        cur = max(cur, hi)
    if cur < L / 2: gaps.append((cur, L / 2))
    for sgn in (1, -1):
        yc = sgn * (W / 2 - PT / 2 + 0.06)
        for a, b in gaps:
            if b - a < 0.6: continue
            n = max(1, round((b - a) / B["fence"]["post"]))
            for k in range(n + 1):
                FINE.box((a + 0.05 + k * (b - a - 0.1) / n, yc, zb + (fh + 0.03) / 2), (0.07, 0.07, fh + 0.03), PG)    # post tops 3 cm over the rail
            a, b = max(a, -L / 2 + 0.03), min(b, L / 2 - 0.03)
            FINE.box(((a + b) / 2, yc, zb + fh - 0.03), (b - a, 0.06, 0.06), PG)
            FINE.box(((a + b) / 2, yc, zb + 0.08), (b - a, 0.05, 0.05), PG)
            FINE.box(((a + b) / 2, yc, zb + 0.08 + (fh - 0.11) / 2), (b - a - 0.02, 0.012, fh - 0.17), WM)
if STYLE == "viaduct":
    viaduct_impost_soffit()

# ------------------------------------------------------------------------------------------------ build, bevel, UVs
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
PREVIEW_COL = {"brick_red_brussels": (0.33, 0.12, 0.075), "stone_blue": (0.42, 0.43, 0.44), "concrete": (0.35, 0.34, 0.32),
               "painted_metal_white": (0.75, 0.75, 0.73), "brick_yellow": (0.55, 0.40, 0.24),
               "painted_metal_grey": (0.42, 0.44, 0.45), "wire_mesh_grey": (0.5, 0.52, 0.53)}
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
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0006)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0003)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces) if name != "mass" else None
    bm.to_mesh(me); bm.free()
    if bevel:
        md = o.modifiers.new("bevel", "BEVEL")
        md.width = bevel; md.segments = 2 if name == "mass" else 1; md.limit_method = "ANGLE"; md.angle_limit = math.radians(35)
        md.harden_normals = False; md.use_clamp_overlap = True
        for oo in scn.objects: oo.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="bevel")
    return o


print("faces before bevel: mass", len(MASS.f), "details", len(DET.f), "fine", len(FINE.f))
parts = [make("mass", MASS, 0.025 if not STYLE else 0.0), make("details", DET, 0.012)]   # STYLE: the rings / bands cover the mass edges (a bevel there splits the vault strips into n-gons: bent normals)
if FINE.f: parts.append(make("fine", FINE, 0.0))
for oo in scn.objects: oo.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
obj = parts[0]; obj.name = NAME
me = obj.data
me.shade_smooth()
me.set_sharp_from_angle(angle=math.radians(35))
if STYLE:
    # CLEAN SHADING (no bad shading from topology): a face is smooth only on a CURVED surface (a neighbour at 0.5-12 deg, the tessellation of a curve,
    # not a bevel step, and no coplanar neighbour: vault strips, ring sides); every planar wall / box face keeps its face normal
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

# UV0 = metres, planar per face: a = along the face horizontally, b = up the face / up the slope
uv0 = me.uv_layers.new(name="UVMap")
uvd = [0.0] * (2 * len(me.loops))
for poly in me.polygons:
    n = poly.normal
    if abs(n.z) < 0.75:
        t = Z.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Z
    else:
        t = Vector((1, 0, 0)); b = n.cross(t).normalized()
    for li in poly.loop_indices:
        p = me.vertices[me.loops[li].vertex_index].co
        uvd[2 * li] = p.dot(t); uvd[2 * li + 1] = p.dot(b)
uv0.data.foreach_set("uv", uvd)
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
print(f"uv done {time.time() - T0:.1f}s")


# ------------------------------------------------------------------------------------------------ the site (DTM) for the bake + previews
def site_ground(margin=45.0):
    import numpy as np
    man = json.load(open(os.path.join(ROOT, "data", "tiles", "manifest.json")))
    cx, cz = B["centre"]; R = L / 2 + margin
    grids = {}
    for t in man["tiles"]:
        bx, bz = t["bounds"]["x"], t["bounds"]["z"]
        if bx[1] < cx - R or bx[0] > cx + R or bz[1] < cz - R or bz[0] > cz + R: continue
        hp = os.path.join(ROOT, "data", "tiles", t["name"], "terrain.json")
        if not os.path.exists(hp): continue
        h = json.load(open(hp))
        a = np.fromfile(os.path.join(ROOT, "data", "tiles", t["name"], "terrain.u16"), dtype="<u2").astype(np.float64).reshape(h["rows"], h["cols"]) / 100
        grids[(h["x0"], h["z0"])] = (h, a)

    def H(x, z):
        for (x0, z0), (h, a) in grids.items():
            if x0 <= x <= x0 + h["size"] and z0 <= z <= z0 + h["size"]:
                c = min(int(round(x - x0)), h["cols"] - 1); r = min(int(round(z - z0)), h["rows"] - 1)
                return a[r, c]
        return B["road_level"]
    step = 1.0
    n = int(2 * R / step)
    verts, faces = [], []
    c, s = math.cos(TH), math.sin(TH)
    for j in range(n + 1):
        for i in range(n + 1):
            X = -R + i * step; Yb = -R + j * step
            mz = -Yb
            wx = B["centre"][0] + X * c - mz * s; wz = B["centre"][1] + X * s + mz * c
            verts.append((X, Yb, H(wx, wz) - B["road_level"]))
    for j in range(n):
        for i in range(n):
            a = j * (n + 1) + i
            faces.append((a, a + 1, a + n + 2, a + n + 1))
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12, 0.13, 0.09, 1)
    gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.95
    gm.materials.append(gmat)
    return g


ground = site_ground()
GROUND_AT = None


def ground_z(X, Yb):
    """the site's ground height (bridge frame) under a point, from the ground mesh (ray down)"""
    hit, loc, *_ = ground.ray_cast(Vector((X, Yb, 60.0)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0

# ------------------------------------------------------------------------------------------------ AO bake into UV1
AO_PX = 2048
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 6.0
ao_img = bpy.data.images.new(NAME + "_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    nn = nt.nodes.new("ShaderNodeTexImage"); nn.image = ao_img; nn.name = "AO"; nt.nodes.active = nn
ao_path = os.path.join(OUT, NAME + "_ao.png")
if BAKE:
    scn.cycles.samples = 128
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
ground.hide_set(True)
for oo in scn.objects: oo.select_set(False)
obj.select_set(True); bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, NAME + ".glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                          export_extras=False, export_vertex_color="NONE")
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
info = {
    "asset": f"railway bridge '{NAME}' (tools/blender/railBridge.py)", "urbis": B["urbis"], "line": B["line"], "road": B["road"],
    "triangles": ntri, "materials": MAT_NAMES,
    "frame": "glTF Y up; +x = along the track (city direction theta), -z = Blender +Y; origin = UrbIS polygon centre at road level",
    "placement": {"city_local_position": [B["centre"][0], B["road_level"], B["centre"][1]], "rotation_y_rad": -TH},
    "deck": {"length": L, "width": W, "railTop": round(H_RAIL, 3), "ballastFloor": round(DECK, 3), "parapetInner": round(W / 2 - PT, 3), "parapetTop": round(TOP + CP, 3)},
    "openings": [{k: (round(v, 3) if isinstance(v, float) else v) for k, v in o.items()} for o in OPS],
    "skew_dx_per_dy": round(SKEW, 4),
    "measured": "UrbIS Land cover Bridges polygon (length, width, axis), OSM road axis + UrbIS street surfaces (clear width), DTM 2021 (road level), rail.json (rail top)",
    "estimated": "arch rise / springing, pilaster / arcade / cornice / parapet dimensions, stone counts: from the Wikimedia Commons photos",
}
json.dump(info, open(os.path.join(OUT, NAME + ".json"), "w"), indent=1)

if not PREVIEW:
    sys.exit(0)
# ------------------------------------------------------------------------------------------------ previews: Cycles, the photos' viewpoints
os.makedirs(PREVIEW, exist_ok=True)
ground.hide_set(False); ground.hide_render = False
# preview materials: brick via the Brick Texture node on UV0 (metres), stone flat, both x the baked AO
for m in mats:
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
    if m.name == "brick_red_brussels":
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.inputs["Scale"].default_value = 1.0
        br.inputs["Brick Width"].default_value = 0.21; br.inputs["Row Height"].default_value = 0.065
        br.inputs["Mortar Size"].default_value = 0.01
        br.inputs["Color1"].default_value = (0.36, 0.12, 0.07, 1); br.inputs["Color2"].default_value = (0.26, 0.09, 0.06, 1)
        br.inputs["Mortar"].default_value = (0.42, 0.40, 0.36, 1)
        nt.links.new(uvn.outputs["UV"], br.inputs["Vector"])
        col = br.outputs["Color"]
    else:
        col = None
    uv2 = nt.nodes.new("ShaderNodeUVMap"); uv2.uv_map = "Lightmap"
    ao = nt.nodes.new("ShaderNodeTexImage"); ao.image = ao_img
    nt.links.new(uv2.outputs["UV"], ao.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 1.0
    if col: nt.links.new(col, mul.inputs["Color1"])
    else: mul.inputs["Color1"].default_value = (*PREVIEW_COL[m.name], 1)
    nt.links.new(ao.outputs["Color"], mul.inputs["Color2"])
    nt.links.new(mul.outputs["Color"], p.inputs["Base Color"])
world = scn.world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.35
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(55), 0, math.radians(-40))
scn.cycles.samples = 64; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1200, 800
scn.view_settings.view_transform = "AgX"
if STYLE: scn.view_settings.exposure = -0.8          # round 2 previews: the sun at 3.5 washed the brick out
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
for vname, (loc, look, lens) in B["views"].items():
    cam.location = Vector((loc[0], loc[1], ground_z(loc[0], loc[1]) + loc[2])); cam.data.lens = lens
    d = Vector(look) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, f"{NAME}_{vname}.png")
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)
print("DONE", time.time() - T0)
