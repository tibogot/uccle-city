"""ROAD BRIDGES OVER THE RAILWAY, as hero pieces: built entirely in code (no hand modelling) from measured data and photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/roadBridge.py -- <bridge> <out_dir> [--no-bake] [--preview <abs dir>]
      <bridge>  verrewinkel (Rue de Verrewinkel over L26, UrbIS ROB 879)
      <out_dir>/<bridge>.glb     two mesh nodes: "<bridge>" (the masonry bridge + its road deck) and "<bridge>_foot" (the
                                 2022 footbridge, the mesh railings: modern, hidden for the 2021 photo compare).
                                 NAMED material slots (the shared library's names where it has them: brick_red_brussels,
                                 stone_blue, asphalt, paving_concrete, painted_metal_white, glass_window, wood_frame_dark; plus
                                 concrete, painted_metal_grey, resin_terracotta drawn by bridgeModel.js stand-ins); no colour
                                 baked. UV0 = metres (planar per face; arch rings polar: brick length radial; vaults: along
                                 the barrel x arc length). UV1 = lightmap (every face has texels).
      <out_dir>/<bridge>_ao.png  ambient occlusion baked with Cycles into UV1 (the site's terrain occludes): light only
      <out_dir>/<bridge>.json    placement, the deck profile (road heights, kerbs: for the walk / drive height and the
                                 terrain carve), openings, counts, what is measured and what is estimated

FRAME (Blender): X along the ROAD (NW -> SE for verrewinkel), +Y to the road's left (north-east), Z up; origin = the
UrbIS bridge polygon's centroid at the level of the cutting floor (`floor` m TAW). glTF Y-up: three x = X, three y = Z,
three z = -Y. In the city: position (cx, floor, cz), rotation.y = -atan2(dir_z, dir_x) (same convention as railBridge.py,
so viewer/rail/railData.js heroFrame() reads both).

Notes, counts and what is measured / estimated: models/rail/verrewinkel_NOTES.md (written before this script).
CLEAN MESH RULES (the mesh checker, tools/mesh_audit): every surface belongs to a closed shell or lies ON another surface
with its open edges on it; no two same-facing faces overlap in a plane (details are proud by >= 12 mm, their backs are
left out); flat faces are flat-shaded (sharp > 30 deg), curved ones (vaults, coping, tubes) smooth.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
from mathutils.geometry import tessellate_polygon

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
NAME = ARGS[0] if ARGS else "verrewinkel"
OUT = os.path.abspath(ARGS[1] if len(ARGS) > 1 and not ARGS[1].startswith("--") else "models/rail")
BAKE = "--no-bake" not in ARGS
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
SAMPLES = int(ARGS[ARGS.index("--samples") + 1]) if "--samples" in ARGS else 256
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
Z = Vector((0, 0, 1))

# ------------------------------------------------------------------------------------------------ the bridges
BRIDGES = {
    "verrewinkel": {
        "urbis": "ROB 879", "line": "L26", "road": "Rue de Verrewinkel",
        "centre": (-268.81, 1308.28), "dir": (28.2, 26.2), "floor": 70.30,                 # [M] UrbIS centroid, OSM axis, DTM floor
        "ends": (-19.85, 19.85), "road_ends": (76.79, 78.73),                               # [M] polygon ends, city terrain there
        "fold": 17.2, "flare": 0.80,                                                        # [M] UrbIS: the wings flare 0.8 m over 2.65 m
        "y_upper": 2.50, "y_lower": 2.38, "y_inner": 2.10,                                  # [M] +-2.46 UrbIS; corbel 0.12 [P/E]; parapet 0.40 [E]
        "kerb_ne": 1.20, "kerb_sw": -1.75,                                                  # [M] UrbIS level +1 strips (NE sidewalk, SW strip)
        "coping_bottom": 0.90, "coping_h": 0.27, "coping_w": 0.56, "coping_block": 1.25,    # over the road [P courses / L]
        "arcade": {"x": 16.65, "n": 18, "spring": -0.60, "rise": 0.47, "ring": 0.26,       # [P] 17 consoles, 18 bays; heights over the road
                   "console": {"w": 0.52, "h": 0.17, "d": 0.25, "w2": 0.36, "h2": 0.16, "d2": 0.20}},
        "arches": [                                                                          # [P] spans / rises, crowns 1.65 under the road
            {"name": "A", "x0": -15.0, "x1": -7.0, "rise": 3.40, "floor": None},
            {"name": "B", "x0": -5.5, "x1": 5.5, "rise": 3.30, "floor": 0.0},
            {"name": "C", "x0": 7.0, "x1": 15.0, "rise": 3.40, "floor": None},
        ],
        "crown_under_road": 1.65, "ring": 0.45, "ring_proud": 0.02,
        "foot": {                                                                            # the 2022 footbridge, SW side [L / M plan / E]
            "x0": -21.5, "x1": 21.0, "gap": 0.06, "w": 6.4, "w_nw": 8.6, "x_flare": -13.0,
            "top_under_road": 0.25, "depth": 0.85, "supports": [-6.25, 6.25],
            "benches": [(-270.6, 1313.9), (-276.3, 1308.6)],
        },
        # s05 (Stratoswift 2021, CC BY-SA 4.0): camera from tools/verrewinkel_photopose.py (bridge frame, m; Blender lens mm)
        "views": {},
    },
}
B = BRIDGES[NAME]
DIRV = Vector((B["dir"][0], B["dir"][1])).normalized()
FLOOR = B["floor"]
XA, XB = B["ends"]
FOUND = -1.6                                         # walls go this far under the cutting floor (the terrain meets them)
YU, YL, YI = B["y_upper"], B["y_lower"], B["y_inner"]
FOLD, FLARE = B["fold"], B["flare"]


def road(x):
    """road surface (bridge frame Z) at X: the measured end heights, a straight grade between (the photo's coping is straight)"""
    (r0, r1), x = B["road_ends"], max(XA, min(XB, x))
    return r0 + (x - XA) * (r1 - r0) / (XB - XA) - FLOOR


GRADE = (B["road_ends"][1] - B["road_ends"][0]) / (XB - XA)


def to_local(x, z):
    """city (x, z) -> bridge (X, Y)"""
    dx, dz = x - B["centre"][0], z - B["centre"][1]
    X = dx * DIRV.x + dz * DIRV.y
    n = (-DIRV.y, DIRV.x)                            # city (x, z) normal = SW for verrewinkel; +Y is the opposite
    return X, -(dx * n[0] + dz * n[1])


def to_city(X, Y):
    n = (-DIRV.y, DIRV.x)
    return B["centre"][0] + X * DIRV.x - Y * n[0], B["centre"][1] + X * DIRV.y - Y * n[1]


def face_y(x, base):
    """the face line in plan with the wing flare beyond the fold: base + flare (linear, as the UrbIS polygon)"""
    t = max(0.0, (abs(x) - FOLD) / (XB - FOLD))
    return base + FLARE * t


MATS = ["brick_red_brussels", "stone_blue", "asphalt", "paving_concrete", "concrete", "painted_metal_white",
        "painted_metal_grey", "glass_window", "resin_terracotta", "wood_frame_dark"]
BR, ST, AS, PV, CO, PW, PG, GL, RS, WD = range(len(MATS))


# ------------------------------------------------------------------------------------------------ geometry builder
class Mesh:
    """faces with a material, an optional explicit UV0 per corner (else planar metres) and a smooth flag group"""
    def __init__(self, name):
        self.name, self.v, self.f, self.m, self.uv, self.s = name, [], [], [], [], []

    def _add(self, pts, mat, uv, smooth=False):
        base = len(self.v)
        for p in pts: self.v.append((float(p[0]), float(p[1]), float(p[2])))
        self.f.append(list(range(base, base + len(pts)))); self.m.append(mat); self.uv.append(uv); self.s.append(smooth)

    def poly(self, pts, mat, out=None, uv=None, smooth=False):
        pts = [Vector(p) for p in pts]
        if out is not None:
            n = Vector((0, 0, 0))
            for i in range(len(pts)):
                a, b = pts[i], pts[(i + 1) % len(pts)]
                n += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
            if n.dot(Vector(out)) < 0:
                pts = pts[::-1]; uv = uv[::-1] if uv else uv
        self._add(pts, mat, uv, smooth)

    def npoly(self, pts, mat, normal, uv=None, smooth=False):
        """planar polygon (maybe concave, no holes) as ONE n-gon, oriented to `normal`"""
        self.poly(pts, mat, normal, uv, smooth)

    def strip(self, A, Bp, mat, outs, uvA=None, uvB=None, closed=False, smooth=False):
        """quads between two polylines; outs[i] = outward direction for quad i (or one vector for all)"""
        n = len(A)
        for i in range(n if closed else n - 1):
            j = (i + 1) % n
            o = outs[i] if isinstance(outs, list) else outs
            uv = [uvA[i], uvA[j], uvB[j], uvB[i]] if uvA else None
            self.poly([A[i], A[j], Bp[j], Bp[i]], mat, o, uv, smooth)

    def box(self, c, size, mat, frame=None, skip=()):
        """box at c with size (sx, sy, sz) in frame (u, v, w); skip = face names to leave out ('-u','+u','-v','+v','-w','+w')"""
        u, v, w = frame or (Vector((1, 0, 0)), Vector((0, 1, 0)), Z)
        c = Vector(c); hx, hy, hz = size[0] / 2, size[1] / 2, size[2] / 2
        P = lambda sx, sy, sz: c + u * sx * hx + v * sy * hy + w * sz * hz
        faces = {"-u": ((-1, -1, -1), (-1, 1, -1), (-1, 1, 1), (-1, -1, 1)), "+u": ((1, -1, -1), (1, 1, -1), (1, 1, 1), (1, -1, 1)),
                 "-v": ((-1, -1, -1), (1, -1, -1), (1, -1, 1), (-1, -1, 1)), "+v": ((-1, 1, -1), (1, 1, -1), (1, 1, 1), (-1, 1, 1)),
                 "-w": ((-1, -1, -1), (1, -1, -1), (1, 1, -1), (-1, 1, -1)), "+w": ((-1, -1, 1), (1, -1, 1), (1, 1, 1), (-1, 1, 1))}
        dirs = {"-u": -u, "+u": u, "-v": -v, "+v": v, "-w": -w, "+w": w}
        for k, q in faces.items():
            if k in skip: continue
            self.poly([P(*s) for s in q], mat, dirs[k])

    def prism(self, outline, origin, u, v, w, depth, mat, back=True, uv_front=None):
        """extrude a 2D outline (u, v plane at origin) by depth along +w; the FRONT is at origin + w * depth"""
        o = Vector(origin)
        F = [o + u * a + v * b for a, b in outline]
        K = [p + w * depth for p in F]
        n = len(F)
        ctr = sum(F, Vector()) / n
        for i in range(n):
            j = (i + 1) % n
            mid = (F[i] + F[j]) / 2
            side = (mid - ctr); side -= w * side.dot(w)
            # outward of a side quad: perpendicular to the edge in the outline plane, away from the outline's inside
            e = (F[j] - F[i]); nrm = e.cross(w).normalized()
            if nrm.dot(side) < 0 and self._inside_test(outline, origin, u, v, mid + nrm * 1e-3): nrm = -nrm
            self.poly([F[i], F[j], K[j], K[i]], mat, nrm)
        self.npoly(K, mat, w, uv_front)
        if back: self.npoly(F, mat, -w)

    @staticmethod
    def _inside_test(outline, origin, u, v, p):
        q = Vector(p) - Vector(origin); x, y = q.dot(u), q.dot(v)
        c = False
        for i in range(len(outline)):
            (x1, y1), (x2, y2) = outline[i], outline[i - 1]
            if (y1 > y) != (y2 > y) and x < (x2 - x1) * (y - y1) / (y2 - y1) + x1: c = not c
        return c


MASS, DET, COP, DECK, FOOT = Mesh("mass"), Mesh("details"), Mesh("coping"), Mesh("deck"), Mesh("foot")


# ------------------------------------------------------------------------------------------------ curves
def ellipse(x0, x1, zs, rise, n=48):
    """intrados: a semi-ellipse from (x0, zs) over to (x1, zs), sampled at EQUAL TURNS OF THE NORMAL (3.75 deg for
    n = 48): the corner normals of the smooth vault stay within 2 deg of every facet (no bent facets near the springing,
    where a flat ellipse turns fastest)"""
    a, cx = (x1 - x0) / 2, (x0 + x1) / 2
    out = []
    for k in range(n + 1):
        ph = math.pi * k / n                                  # the normal's angle from the -X horizontal
        t = math.atan2(rise * math.sin(ph), a * math.cos(ph))
        out.append((cx - a * math.cos(t), zs + rise * math.sin(t)))
    return out


def ell_normal(cx, zs, a, b, x, z):
    """outward normal (away from the opening) of the ellipse at (x, z)"""
    nx, nz = (x - cx) / (a * a), (z - zs) / (b * b)
    L = math.hypot(nx, nz) or 1
    return nx / L, nz / L


def seg_arc(x0, x1, zs, rise, n=14):
    """small segmental arch from (x0, zs) to (x1, zs); returns points and (cx, cz, R)"""
    s = x1 - x0; R = (s * s / 4 + rise * rise) / (2 * rise); cx = (x0 + x1) / 2; cz = zs + rise - R
    a = math.asin(min(1.0, s / 2 / R))
    return [(cx + R * math.sin(-a + 2 * a * k / n), cz + R * math.cos(-a + 2 * a * k / n)) for k in range(n + 1)], (cx, cz, R)


# the big openings: springing = crown - rise, crown = road at the centre - crown_under_road
OPS = []
for a in B["arches"]:
    cx = (a["x0"] + a["x1"]) / 2
    crown = road(cx) - B["crown_under_road"]
    OPS.append({**a, "cx": cx, "a": (a["x1"] - a["x0"]) / 2, "spring": crown - a["rise"], "crown": crown})
for o in OPS: print("opening", o["name"], {k: round(o[k], 2) for k in ("x0", "x1", "spring", "crown")})


def opening_curve(o, n=48):
    """the opening outline at a face: jamb foot -> springing -> ellipse -> springing -> foot"""
    pts = ellipse(o["x0"], o["x1"], o["spring"], o["rise"], n)
    return [(o["x0"], FOUND)] + pts + [(o["x1"], FOUND)]


# the arcade: consoles at the bay joints, small arches spring from the console tops (over the road: following the grade)
AR = B["arcade"]
AX = AR["x"]; NB = AR["n"]; PITCH = 2 * AX / NB
CON = AR["console"]
CONSOLES = [-AX + k * PITCH for k in range(1, NB)]
print(f"arcade: {NB} bays of {PITCH:.3f} m, {len(CONSOLES)} consoles")


def zspring(x): return road(x) + AR["spring"]


HW = 0.26                                         # a small arch springs this far either side of a console centre


def scallops():
    """the springing line of the corbelled upper wall from X = -AX to +AX: over each console a straight run, in each bay
    a segmental arch; everything SHEARED by the road grade (the arcade follows the road like the coping, as on s05).
    Returns [(x, z)] and per bay (pts, (cx, cz_rel, R), x0, x1)."""
    out, arcs = [], []
    sup = [-AX] + CONSOLES + [AX]
    for k in range(NB):
        x0 = sup[k] + (HW if k > 0 else 0.0)
        x1 = sup[k + 1] - (HW if k < NB - 1 else 0.0)
        pts, (cx, cz, R) = seg_arc(x0, x1, 0.0, AR["rise"])
        pts = [(x, zspring(x) + z) for x, z in pts]
        out += pts if not out else pts
        arcs.append((pts, (cx, cz, R), x0, x1))
    return out, arcs


SCAL, ARCS = scallops()

# ------------------------------------------------------------------------------------------------ the mass (brick shell)
def zcb(x): return road(x) + B["coping_bottom"]


for sg in (1, -1):
    yl, yu = sg * YL, sg * YU
    # (a) the recessed lower face: bottom notched into the openings, top = the scallop line
    ol = [(-AX, FOUND)]
    for o in OPS: ol += opening_curve(o)
    ol += [(AX, FOUND)] + SCAL[::-1]
    MASS.npoly([(x, yl, z) for x, z in ol], BR, (0, sg, 0))
    # (b) the upper face (and the end piers to the fold) at YU
    ou = [(-FOLD, FOUND), (-AX, FOUND)] + SCAL + [(AX, FOUND), (FOLD, FOUND)]
    ou += [(FOLD, zcb(FOLD)), (-FOLD, zcb(-FOLD))]
    MASS.npoly([(x, yu, z) for x, z in ou], BR, (0, sg, 0))
    # (c) the returns at the arcade ends (from the lower to the upper face)
    for sx in (-1, 1):
        x = sx * AX
        zt = SCAL[0][1] if sx < 0 else SCAL[-1][1]
        MASS.poly([(x, yl, FOUND), (x, yu, FOUND), (x, yu, zt), (x, yl, zt)], BR, (-sx, 0, 0))
    # (d) the soffit under the corbelled wall, along the scallops
    A = [Vector((x, yl, z)) for x, z in SCAL]; Bv = [Vector((x, yu, z)) for x, z in SCAL]
    for i in range(len(SCAL) - 1):
        (xa, za), (xb, zb) = SCAL[i], SCAL[i + 1]
        mx = (xa + xb) / 2
        arc = next((r for r in ARCS if r[2] + 1e-6 < mx < r[3] - 1e-6), None)
        if arc:
            cx, cz, R = arc[1]; o_ = Vector((cx - mx, 0, zspring(mx) + cz - (za + zb) / 2))
        else: o_ = Vector((-GRADE, 0, -1))
        MASS.poly([A[i], A[i + 1], Bv[i + 1], Bv[i]], BR, o_, smooth=arc is not None)
    # (e) wings: the flared outer face beyond the fold (FOUND to the coping bottom) and the wing's end
    for sx in (-1, 1):
        xf, xe = sx * FOLD, sx * XB
        MASS.poly([(xf, sg * face_y(xf, YU), FOUND), (xe, sg * face_y(xe, YU), FOUND), (xe, sg * face_y(xe, YU), zcb(xe)), (xf, sg * face_y(xf, YU), zcb(xf))], BR, (0, sg, 0))
        MASS.poly([(xe, sg * face_y(xe, YI), road(xe) - 0.03), (xe, sg * face_y(xe, YU), road(xe) - 0.03), (xe, sg * face_y(xe, YU), zcb(xe)), (xe, sg * face_y(xe, YI), zcb(xe))], BR, (sx, 0, 0))
    # (f) parapet inner face, fold to fold and along the wings (from the pavement to the coping bottom)
    xs = [-XB, -FOLD] + [-FOLD + k * 2 * FOLD / 24 for k in range(1, 24)] + [FOLD, XB]
    zb = lambda x: road(x) + (0.13 if sg > 0 else 0.10)        # NE sidewalk top / SW strip top at the wall
    A = [Vector((x, sg * face_y(x, YI), zb(x))) for x in xs]
    Bv = [Vector((x, sg * face_y(x, YI), zcb(x))) for x in xs]
    MASS.strip(A, Bv, BR, Vector((0, -sg, 0)))

# (f2) the parapet tops (under the coping), fold to fold and along the wings
for sg in (1, -1):
    xs = [-XB, -FOLD, FOLD, XB]
    A = [Vector((x, sg * face_y(x, YI), zcb(x))) for x in xs]; Bv = [Vector((x, sg * face_y(x, YU), zcb(x))) for x in xs]
    MASS.strip(A, Bv, BR, Vector((0, 0, 1)))

# (g) the vaults: ruled surfaces through the full width between the lower faces (jambs to FOUND)
for o in OPS:
    c = opening_curve(o)
    A = [Vector((x, YL, z)) for x, z in c]; Bv = [Vector((x, -YL, z)) for x, z in c]
    # UV: u = along the barrel (Y), v = arc length along the intrados (courses run along the barrel)
    L = [0.0]
    for i in range(1, len(c)): L.append(L[-1] + math.hypot(c[i][0] - c[i - 1][0], c[i][1] - c[i - 1][1]))
    uvA = [(YL, l) for l in L]; uvB = [(-YL, l) for l in L]
    outs = []
    for i in range(len(c) - 1):
        mx, mz = (c[i][0] + c[i + 1][0]) / 2, (c[i][1] + c[i + 1][1]) / 2
        if mz <= o["spring"] + 1e-6: outs.append(Vector((o["cx"] - mx, 0, 0)))
        else:
            nx, nz = ell_normal(o["cx"], o["spring"], o["a"], o["rise"], mx, mz); outs.append(Vector((-nx, 0, -nz)))
    for i in range(len(c) - 1):
        mz = (c[i][1] + c[i + 1][1]) / 2
        MASS.poly([A[i], A[i + 1], Bv[i + 1], Bv[i]], BR, outs[i], [uvA[i], uvA[i + 1], uvB[i + 1], uvB[i]], smooth=mz > o["spring"] + 1e-6)

# (h) ends: X = +-XB, from FOUND to just under the deck tongue (buried in the banks; closes the shell for the bake)
for sx in (-1, 1):
    x = sx * XB
    yo = face_y(x, YU)
    MASS.poly([(x, -yo, FOUND), (x, yo, FOUND), (x, yo, road(x) - 0.03), (x, -yo, road(x) - 0.03)], BR, (sx, 0, 0))

# ------------------------------------------------------------------------------------------------ the road deck
KNE, KSW = B["kerb_ne"], B["kerb_sw"]
XS = sorted(set([-XB - 0.6, -XB, -FOLD, FOLD, XB, XB + 0.6] + [-FOLD + k * 2 * FOLD / 16 for k in range(1, 16)]))


def rd(x):                                     # road heights carried 0.6 m past the ends, tucked 3 cm under the city's road
    return road(x) - (0.03 if abs(x) > XB + 1e-6 else 0.0)


def deck_strip(y0, y1, dz0, dz1, mat):
    """a deck surface between y0 and y1 (clamped to the parapets' inner faces, flared beyond the fold); dz0 / dz1 = height
    over the road at y0 / y1"""
    for i in range(len(XS) - 1):
        xa, xb = XS[i], XS[i + 1]
        q = []
        for x in (xa, xb):
            w = face_y(x, YI)
            lo, hi = max(y0, -w), min(y1, w)
            q.append((x, lo, hi))
        (xa, la, ha), (xb, lb, hb) = q
        DECK.poly([(xa, la, rd(xa) + dz0), (xb, lb, rd(xb) + dz0), (xb, hb, rd(xb) + dz1), (xa, ha, rd(xa) + dz1)], mat, Z)


deck_strip(KSW, KNE, 0.0, 0.0, AS)                          # roadway
deck_strip(KNE + 0.15, YI + 0.9, 0.13, 0.13, PV)                  # NE sidewalk (concrete slabs), out to the parapet
deck_strip(KNE, KNE + 0.15, 0.13, 0.13, PV)                 # kerb top
deck_strip(-YI - 0.9, KSW, 0.10, 0.02, PV)                        # SW sloping concrete strip
# kerb face (NE): vertical 0.13
for i in range(len(XS) - 1):
    xa, xb = XS[i], XS[i + 1]
    DECK.poly([(xa, KNE, rd(xa)), (xb, KNE, rd(xb)), (xb, KNE, rd(xb) + 0.13), (xa, KNE, rd(xa) + 0.13)], PV, (0, -1, 0))
    DECK.poly([(xa, KSW, rd(xa)), (xb, KSW, rd(xb)), (xb, KSW, rd(xb) + 0.02), (xa, KSW, rd(xa) + 0.02)], PV, (0, 1, 0))

# ------------------------------------------------------------------------------------------------ details: arch rings, consoles
def polar_uv(cx, cz, pts_in, pts_out):
    """rowlock rings: u = radial (brick length), v = along the arc (courses)"""
    L = [0.0]
    for i in range(1, len(pts_in)): L.append(L[-1] + math.hypot(pts_in[i][0] - pts_in[i - 1][0], pts_in[i][1] - pts_in[i - 1][1]))
    return [(0.0, l) for l in L], [(1.0, l) for l in L]


for sg in (1, -1):
    w = Vector((0, sg, 0))
    # big arch rings: a band from the intrados to +ring, proud of the lower face, springing to springing
    for o in OPS:
        pts = ellipse(o["x0"], o["x1"], o["spring"], o["rise"])
        rin = [Vector((x, 0, z)) for x, z in pts]
        rout = []
        for x, z in pts:
            nx, nz = ell_normal(o["cx"], o["spring"], o["a"], o["rise"], x, z)
            rout.append(Vector((x + nx * B["ring"], 0, z + nz * B["ring"])))
        y0, y1 = sg * YL, sg * (YL + B["ring_proud"])
        Fi = [p + Vector((0, y1, 0)) for p in rin]; Fo = [p + Vector((0, y1, 0)) for p in rout]
        Ii = [p + Vector((0, y0, 0)) for p in rin]; Io = [p + Vector((0, y0, 0)) for p in rout]
        uvi, uvo = polar_uv(o["cx"], o["spring"], pts, pts)
        uvi = [(0.0, v) for _, v in uvi]; uvo = [(B["ring"], v) for _, v in uvo]
        DET.strip(Fi, Fo, BR, w, uvi, uvo)                                     # front (polar UV)
        DET.strip(Ii, Fi, BR, [Vector((-nx, 0, -nz)) for nx, nz in [ell_normal(o["cx"], o["spring"], o["a"], o["rise"], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) for i in range(len(pts) - 1)]], smooth=True)
        DET.strip(Io, Fo, BR, [Vector((nx, 0, nz)) for nx, nz in [ell_normal(o["cx"], o["spring"], o["a"], o["rise"], (pts[i][0] + pts[i + 1][0]) / 2, (pts[i][1] + pts[i + 1][1]) / 2) for i in range(len(pts) - 1)]], smooth=True)
        for k in (0, -1):                                                       # the band's ends at the springing
            DET.poly([Ii[k], Io[k], Fo[k], Fi[k]], BR, (0, 0, -1))
    # small arch rings on the upper face (rowlock, 12 mm proud), sheared like the arcade
    for pts, (cx, cz, R), x0, x1 in ARCS:
        lvl = [(x, z - zspring(x)) for x, z in pts]                         # back to the level arch
        rin = [Vector((x, 0, zspring(x) + z)) for x, z in lvl]
        lim0 = x0 - HW if x0 > -AX + 1e-6 else -1e9          # the neighbouring rings meet on the console's centre line
        lim1 = x1 + HW if x1 < AX - 1e-6 else 1e9
        ro = []
        for x, z in lvl:
            dx_, dz_ = (x - cx) / R, (z - cz) / R
            t = AR["ring"]
            if dx_ < -1e-9: t = min(t, (x - lim0) / -dx_)
            if dx_ > 1e-9: t = min(t, (lim1 - x) / dx_)
            ro.append((x + dx_ * t, z + dz_ * t))
        rout = [Vector((x, 0, zspring(x) + z)) for x, z in ro]
        y0, y1 = sg * YU, sg * (YU + 0.012)
        Fi = [p + Vector((0, y1, 0)) for p in rin]; Fo = [p + Vector((0, y1, 0)) for p in rout]
        Ii = [p + Vector((0, y0, 0)) for p in rin]; Io = [p + Vector((0, y0, 0)) for p in rout]
        L = [0.0]
        for i in range(1, len(rin)): L.append(L[-1] + (rin[i] - rin[i - 1]).length)
        DET.strip(Fi, Fo, BR, w, [(0.0, l) for l in L], [(AR["ring"], l) for l in L])
        mids = [((lvl[i][0] + lvl[i + 1][0]) / 2, (lvl[i][1] + lvl[i + 1][1]) / 2) for i in range(len(lvl) - 1)]
        DET.strip(Ii, Fi, BR, [Vector((cx - mx, 0, cz - mz)) for mx, mz in mids], smooth=True)
        DET.strip(Io, Fo, BR, [Vector((mx - cx, 0, mz - cz)) for mx, mz in mids], smooth=True)
        for k in (0, -1): DET.poly([Ii[k], Io[k], Fo[k], Fi[k]], BR, (0, 0, -1))
    # consoles: a stone slab under each joint of the arcade and a smaller block with a rounded nose under it; built level
    # about the console centre, then sheared by the grade (their tops lie under the arcade's straight run)
    for x in CONSOLES:
        top = zspring(x)
        n0 = len(DET.v)
        d, h = CON["d"], CON["h"]
        DET.box((x, sg * (YL + d / 2), top - h / 2), (CON["w"], d, h), ST, skip=("-v" if sg > 0 else "+v",))
        d2, h2 = CON["d2"], CON["h2"]
        prof = [(0.0, 0.0), (0.0, -h2)] + [(d2 - 0.09 + 0.09 * math.sin(math.pi / 2 * k / 6), -h2 + 0.09 - 0.09 * math.cos(math.pi / 2 * k / 6)) for k in range(7)] + [(d2, 0.0)]
        o = Vector((x - CON["w2"] / 2, sg * YL, top - h))
        F = [o + Vector((0, sg * a, b)) for a, b in prof]
        K = [p + Vector((CON["w2"], 0, 0)) for p in F]
        n = len(F)
        cy = sum((p.y for p in F), 0.0) / n; cz_ = sum((p.z for p in F), 0.0) / n
        for i in range(1, n):                                                # i = 0: the back against the wall, left out
            j = (i + 1) % n
            mid = (F[i] + F[j]) / 2
            e = F[j] - F[i]
            nrm = Vector((0, -e.z, e.y))
            if nrm.dot(Vector((0, mid.y - cy, mid.z - cz_))) < 0: nrm = -nrm
            DET.poly([F[i], F[j], K[j], K[i]], ST, nrm, smooth=2 <= i <= 7)
        DET.npoly(F[1:] + [F[0]], ST, (-1, 0, 0)); DET.npoly(K[1:] + [K[0]], ST, (1, 0, 0))
        for i in range(n0, len(DET.v)):                                     # shear
            vx, vy, vz = DET.v[i]; DET.v[i] = (vx, vy, vz + GRADE * (vx - x))

# ------------------------------------------------------------------------------------------------ the coping (blue stone)
CW, CH = B["coping_w"], B["coping_h"]
PROF = [(-CW / 2, 0.0), (CW / 2, 0.0), (CW / 2, 0.09)]
NPC = 14
for k in range(1, NPC):
    t = math.pi * k / NPC
    PROF.append((CW / 2 * math.cos(t), 0.09 + (CH - 0.09) * math.sin(t)))
PROF.append((-CW / 2, 0.09))
SMOOTHP = [False, False] + [True] * NPC + [False]        # per profile edge: bottom, side, the arc (smooth), side


def coping_run(sg, xs):
    """blocks along X (block ends xs); the plan follows the wall's centre line (flared beyond the folds); the ends at a
    fold are mitred (both blocks end on the bisector plane), the others square with a V chamfer"""
    yc = lambda x: sg * (face_y(x, YI) + face_y(x, YU)) / 2
    def tdir(x0, x1): return Vector((x1 - x0, yc(x1) - yc(x0), zcb(x1) - zcb(x0))).normalized()
    def plan_side(t):
        sd = Vector((-t.y, t.x, 0)).normalized()                  # outward: away from the road axis
        return sd if sd.y * sg > 0 else -sd
    for i in range(len(xs) - 1):
        x0, x1 = xs[i], xs[i + 1]
        tx = tdir(x0, x1)
        side = plan_side(tx)
        def ring(x, inset, sd=None):
            sd = sd if sd is not None else side
            c = Vector((x, yc(x), zcb(x)))
            return [c + sd * (a * (1 - inset * 2 / CW)) + Z * (b * (1 - inset / CH) if b > 0 else 0) for a, b in PROF]
        def end_side(other):                         # a mitre at a fold: the bisector of this block's and the neighbour's sides
            if other is None: return side, True
            s2 = plan_side(tdir(*other))
            bis = (side + s2).normalized()
            return bis / max(0.5, bis.dot(side)), False
        o0 = (xs[i - 1], x0) if abs(abs(x0) - FOLD) < 1e-6 and i > 0 else None
        o1 = (x1, xs[i + 2]) if abs(abs(x1) - FOLD) < 1e-6 and i + 2 < len(xs) else None
        s0, ch0 = end_side(o0); s1, ch1 = end_side(o1)
        e = 0.02 * (1 if x1 > x0 else -1)
        r0 = ring(x0, 0.018 if ch0 else 0.0, s0); r1 = ring(x0 + e, 0.0) if ch0 else r0
        r3 = ring(x1, 0.018 if ch1 else 0.0, s1); r2 = ring(x1 - e, 0.0) if ch1 else r3
        n = len(PROF)
        for A_, B_, main in ((r0, r1, False), (r1, r2, True), (r2, r3, False)):
            if A_ is B_: continue
            for j in range(n):
                jj = (j + 1) % n
                pa = (A_[j] + A_[jj]) / 2
                c = Vector((pa.x, yc(pa.x), zcb(pa.x) + 0.1))
                o = (pa - c); o -= tx * o.dot(tx)
                COP.poly([A_[j], A_[jj], B_[jj], B_[j]], ST, o, smooth=main and SMOOTHP[j])
        COP.npoly(r0, ST, -tx); COP.npoly(r3, ST, tx)


for sg in (1, -1):
    xs = [-XB]
    n_main = max(1, round(2 * FOLD / B["coping_block"]))
    wing = [-XB, -FOLD]
    blocks = [-XB, -XB + (XB - FOLD) / 2, -FOLD] + [-FOLD + k * 2 * FOLD / n_main for k in range(1, n_main)] + [FOLD, FOLD + (XB - FOLD) / 2, XB]
    coping_run(sg, blocks)

# end piers: a square brick pier at each wing end with a stone cap (estimated)
for sx in (-1, 1):
    for sg in (1, -1):
        x = sx * (XB - 0.30)
        yc = sg * (face_y(x, YI) + face_y(x, YU)) / 2
        zt = zcb(x) + CH + 0.18
        DET.box((x, yc, (FOUND + zt) / 2), (0.62, 0.62, zt - FOUND), BR)
        DET.box((x, yc, zt + 0.06), (0.74, 0.74, 0.12), ST)
        DET.box((x, yc, zt + 0.17), (0.56, 0.56, 0.10), ST)

# ------------------------------------------------------------------------------------------------ the 2022 footbridge (SW side)
FB = B["foot"]
YF0 = -(YU + FB["gap"])                                     # its inner edge, along the old SW face


def fw(x):                                                  # width (plan): wider at the NW landing
    if x >= FB["x_flare"]: return FB["w"]
    t = (FB["x_flare"] - x) / (FB["x_flare"] - FB["x0"])
    return FB["w"] + (FB["w_nw"] - FB["w"]) * t


def ftop(x): return road(max(XA, min(XB, x))) - FB["top_under_road"] + (x - max(XA, min(XB, x))) * GRADE


FXS = [FB["x0"] + k * (FB["x1"] - FB["x0"]) / 34 for k in range(35)]
D = FB["depth"]
# deck section (inner edge vertical; outer edge: vertical 0.35 then a chamfer back 0.30 to the soffit)
SEC = lambda x: [(YF0, ftop(x)), (YF0, ftop(x) - D), (YF0 - fw(x) + 0.30, ftop(x) - D), (YF0 - fw(x), ftop(x) - 0.35),
                 (YF0 - fw(x), ftop(x))]
rings = [[Vector((x, y, z)) for y, z in SEC(x)] for x in FXS]
outs_k = [Vector((0, 1, 0)), Vector((0, 0, -1)), Vector((0, -0.75, -1)), Vector((0, -1, 0)), Vector((0, 0, 1))]
for k in range(5):
    kk = (k + 1) % 5
    for i in range(len(FXS) - 1):
        q = [rings[i][k], rings[i + 1][k], rings[i + 1][kk], rings[i][kk]]
        FOOT.poly(q, RS if k == 4 else CO, outs_k[k])
for i, sx in ((0, -1), (-1, 1)):
    FOOT.npoly(rings[i], CO, (sx, 0, 0))
# outer upstand (concrete kerb) and the glass parapet with leaning white fins
UP_H, UP_W = 0.15, 0.25
for i in range(len(FXS) - 1):
    xa, xb = FXS[i], FXS[i + 1]
    ya, yb = YF0 - fw(xa), YF0 - fw(xb)
    A0 = [Vector((xa, ya, ftop(xa))), Vector((xa, ya + UP_W, ftop(xa))), Vector((xa, ya + UP_W, ftop(xa) + UP_H)), Vector((xa, ya, ftop(xa) + UP_H))]
    B0 = [Vector((xb, yb, ftop(xb))), Vector((xb, yb + UP_W, ftop(xb))), Vector((xb, yb + UP_W, ftop(xb) + UP_H)), Vector((xb, yb, ftop(xb) + UP_H))]
    for k, o in ((1, (0, 1, 0)), (2, (0, 0, 1)), (3, (0, -1, 0))):
        FOOT.poly([A0[k], B0[k], B0[(k + 1) % 4], A0[(k + 1) % 4]], CO, o)
for i, sx in ((0, -1), (-1, 1)):
    x = FXS[i]; y = YF0 - fw(x)
    FOOT.poly([(x, y, ftop(x)), (x, y + UP_W, ftop(x)), (x, y + UP_W, ftop(x) + UP_H), (x, y, ftop(x) + UP_H)], CO, (sx, 0, 0))
LEAN = math.radians(12)
n_fin = int((FB["x1"] - FB["x0"] - 0.6) / 1.25)
for k in range(n_fin + 1):
    x = FB["x0"] + 0.3 + k * (FB["x1"] - FB["x0"] - 0.6) / n_fin
    y = YF0 - fw(x) + UP_W / 2
    zb = ftop(x) + UP_H
    up = Vector((0, -math.sin(LEAN), math.cos(LEAN)))
    FOOT.box(Vector((x, y, zb)) + up * 0.95, (0.035, 0.14, 1.9), PW, frame=(Vector((1, 0, 0)), Vector((0, math.cos(LEAN), math.sin(LEAN))), up))
    if k < n_fin:
        x2 = FB["x0"] + 0.3 + (k + 1) * (FB["x1"] - FB["x0"] - 0.6) / n_fin
        xm = (x + x2) / 2; ym = YF0 - fw(xm) + UP_W / 2; zm = ftop(xm) + UP_H
        L = x2 - x - 0.06
        tz = (ftop(x2) - ftop(x)) / (x2 - x)
        uax = Vector((1, (YF0 - fw(x2) - (YF0 - fw(x))) / (x2 - x), tz)).normalized()
        FOOT.box(Vector((xm, ym, zm)) + up * 0.86 - Vector((0, 0.04, 0)), (L, 0.02, 1.62), GL, frame=(uax, up.cross(uax).normalized() * -1, up))
# supports: four splayed steel tubes from one concrete footing at each pier line (estimated from the BX1 photo)
def tube(a, b, r, mat, seg=12):
    a, b = Vector(a), Vector(b); t = (b - a).normalized()
    s1 = t.cross(Z).normalized() if abs(t.z) < 0.99 else Vector((1, 0, 0)); s2 = t.cross(s1)
    R0 = [a + (s1 * math.cos(2 * math.pi * k / seg) + s2 * math.sin(2 * math.pi * k / seg)) * r for k in range(seg)]
    R1 = [p + (b - a) for p in R0]
    for k in range(seg):
        kk = (k + 1) % seg
        FOOT.poly([R0[k], R0[kk], R1[kk], R1[k]], mat, (R0[k] + R0[kk]) / 2 - a)


SUPPORTS = []
for xs_ in FB["supports"]:
    SUPPORTS.append(xs_)

# benches (OSM nodes): a timber seat on two steel frames, along the deck
BENCHES = [to_local(*p) for p in FB["benches"]]

# NE + SW mesh railings on the copings (galvanised posts, top / bottom rails, vertical bars), 0.9 m over the coping
def mesh_railing(sg):
    yc = lambda x: sg * (face_y(x, YI) + face_y(x, YU)) / 2
    ztop = lambda x: zcb(x) + CH
    x0, x1 = -FOLD + 0.2, FOLD - 0.2
    n = int((x1 - x0) / 2.5)
    for k in range(n + 1):
        x = x0 + k * (x1 - x0) / n
        FOOT.box((x, yc(x), ztop(x) + 0.45 - 0.02), (0.06, 0.06, 0.94), PG, skip=("-w",))
        if k == n: continue
        xa, xb = x + 0.03, x0 + (k + 1) * (x1 - x0) / n - 0.03
        for zr in (0.08, 0.86):
            za, zb = ztop(xa) + zr, ztop(xb) + zr
            L = xb - xa; tz = (zb - za) / L
            uax = Vector((1, 0, tz)).normalized()
            FOOT.box(((xa + xb) / 2, yc(x), (za + zb) / 2), (math.hypot(L, zb - za), 0.03, 0.04), PG, frame=(uax, Vector((0, 1, 0)), Vector((-tz, 0, 1)).normalized()), skip=("-u", "+u"))
        m = int((xb - xa) / 0.15)
        for j in range(1, m):
            xx = xa + j * (xb - xa) / m
            FOOT.box((xx, yc(x), ztop(xx) + 0.47), (0.012, 0.012, 0.74), PG, skip=("-w", "+w"))


for sg in (1, -1): mesh_railing(sg)

print(f"faces: mass {len(MASS.f)} details {len(DET.f)} coping {len(COP.f)} deck {len(DECK.f)} foot {len(FOOT.f)} ({time.time() - T0:.1f}s)")


# ------------------------------------------------------------------------------------------------ build, bevel, UVs
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
PREVIEW_COL = {"brick_red_brussels": (0.33, 0.12, 0.075), "stone_blue": (0.40, 0.41, 0.42), "asphalt": (0.08, 0.08, 0.085),
               "paving_concrete": (0.45, 0.44, 0.41), "concrete": (0.62, 0.62, 0.60), "painted_metal_white": (0.8, 0.8, 0.78),
               "painted_metal_grey": (0.35, 0.36, 0.37), "glass_window": (0.2, 0.25, 0.27), "resin_terracotta": (0.55, 0.30, 0.20),
               "wood_frame_dark": (0.25, 0.15, 0.08)}
for nm in MATS:
    m = bpy.data.materials.new(nm); m.use_nodes = True
    m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*PREVIEW_COL[nm], 1)
    m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
    mats.append(m)


def planar_uv(pts):
    """metres: a = along the face horizontally, b = up the face; floors: X, Y"""
    a, b, c = Vector(pts[0]), Vector(pts[1]), Vector(pts[2])
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        p, q = Vector(pts[i]), Vector(pts[(i + 1) % len(pts)])
        n += Vector(((p.y - q.y) * (p.z + q.z), (p.z - q.z) * (p.x + q.x), (p.x - q.x) * (p.y + q.y)))
    n = n.normalized() if n.length > 1e-12 else Z
    if abs(n.z) < 0.75:
        t = Z.cross(n).normalized(); bb = Z
    else:
        t = Vector((1, 0, 0)); bb = n.cross(t).normalized()
    return [(Vector(p).dot(t), Vector(p).dot(bb)) for p in pts]


def make(mb, bevel, part):
    me = bpy.data.meshes.new(mb.name)
    me.from_pydata(mb.v, [], mb.f)
    me.update()
    for m in mats: me.materials.append(m)
    me.polygons.foreach_set("material_index", mb.m)
    me.polygons.foreach_set("use_smooth", mb.s)
    uvl = me.uv_layers.new(name="UVMap")
    for poly, uv in zip(me.polygons, mb.uv):
        pts = [mb.v[vi] for vi in poly.vertices]
        uvs = uv if uv else planar_uv(pts)
        for li, (u_, v_) in zip(poly.loop_indices, uvs): uvl.data[li].uv = (u_, v_)
    at = me.attributes.new("part", "INT", "FACE")
    at.data.foreach_set("value", [part] * len(me.polygons))
    o = bpy.data.objects.new(mb.name, me); scn.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    if bevel:
        bm = bmesh.new(); bm.from_mesh(me)
        sharp = [e for e in bm.edges if len(e.link_faces) == 2 and e.calc_face_angle(0) > math.radians(35)]
        res = bmesh.ops.bevel(bm, geom=sharp, offset=bevel, offset_type="OFFSET", segments=1, profile=0.5, affect="EDGES",
                              clamp_overlap=True, loop_slide=True)
        for f in res["faces"]: f.smooth = False
        bm.to_mesh(me); bm.free()
    return o


# ------------------------------------------------------------------------------------------------ the site (DTM) for the bake + previews
def site_ground(margin=30.0):
    import numpy as np
    man = json.load(open(os.path.join(ROOT, "data", "tiles", "manifest.json")))
    cx, cz = B["centre"]; R = XB + margin
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
                fx, fz = x - x0, z - z0; c, r = min(int(fx), h["cols"] - 2), min(int(fz), h["rows"] - 2); tx, tz = fx - c, fz - r
                return a[r, c] * (1 - tx) * (1 - tz) + a[r, c + 1] * tx * (1 - tz) + a[r + 1, c] * (1 - tx) * tz + a[r + 1, c + 1] * tx * tz
        return FLOOR
    step = 1.0
    n = int(2 * R / step)
    verts, faces = [], []
    for j in range(n + 1):
        for i in range(n + 1):
            X = -R + i * step; Yb = -R + j * step
            wx, wz = to_city(X, Yb)
            h = H(wx, wz) - FLOOR
            # under the deck the DTM has the cutting (no deck in it here); keep it under the vaults' feet
            verts.append((X, Yb, h))
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
    return g, H


ground, HCITY = site_ground()


def ground_z(X, Yb):
    hit, loc, *_ = ground.ray_cast(Vector((X, Yb, 60.0)), Vector((0, 0, -1)))
    return loc.z if hit else 0.0


# supports and benches need the ground: build them now as a separate object, joined before the bake
SUP = Mesh("supports")
for xs_ in SUPPORTS:
    yfc = YF0 - fw(xs_) / 2
    gz = ground_z(xs_, yfc)
    SUP.box((xs_, yfc, gz + 0.15), (1.6, 1.4, 1.3), CO)                    # footing (sunk 0.5 m)
    top = Vector((xs_, yfc, gz + 0.80))
    for dx in (-1.6, 1.6):
        for dy in (-1.9, 1.9):
            b = Vector((xs_ + dx, yfc + dy, ftop(xs_ + dx) - D + 0.25))
            a = top + Vector((dx, dy, 0)) * 0.08 - Vector((0, 0, 0.15))
            t = (b - a).normalized(); s1 = t.cross(Z).normalized(); s2 = t.cross(s1)
            R0 = [a + (s1 * math.cos(2 * math.pi * k / 24) + s2 * math.sin(2 * math.pi * k / 24)) * 0.135 for k in range(24)]
            R1 = [p + (b - a) for p in R0]
            for k in range(24):
                kk = (k + 1) % 24
                SUP.poly([R0[k], R0[kk], R1[kk], R1[k]], PW, (R0[k] + R0[kk]) / 2 - a, smooth=True)
for bx, by in BENCHES:
    z0 = ftop(bx)
    SUP.box((bx, by, z0 + 0.43), (1.8, 0.42, 0.05), WD)
    SUP.box((bx, by - 0.24, z0 + 0.68), (1.8, 0.04, 0.32), WD)
    for ex in (-0.7, 0.7):
        SUP.box((bx + ex, by, z0 + 0.195), (0.05, 0.38, 0.41), PG)

parts = [make(MASS, 0.02, 0), make(DET, 0.012, 0), make(COP, 0.006, 0), make(DECK, 0.0, 0), make(FOOT, 0.0, 1), make(SUP, 0.0, 1)]
for oo in scn.objects: oo.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.join()
obj = parts[0]; obj.name = NAME
me = obj.data
bm = bmesh.new(); bm.from_mesh(me)
bmesh.ops.triangulate(bm, faces=bm.faces, quad_method="BEAUTY", ngon_method="BEAUTY")
def _alt(f):
    L = max(e.calc_length() for e in f.edges)
    return 2 * f.calc_area() / L if L > 0 else 0.0
bmesh.ops.delete(bm, geom=[f for f in bm.faces if _alt(f) < 3e-4], context="FACES")
# sharp edges: wherever a flat face is involved, or between smooth faces at > 30 deg (set_sharp_from_angle would also
# turn every face smooth: flat walls must keep their face normal)
for e in bm.edges:
    lf = e.link_faces
    e.smooth = len(lf) == 2 and lf[0].smooth and lf[1].smooth and e.calc_face_angle(0) < math.radians(30)
bm.to_mesh(me); bm.free()
me.validate()
ntri = len(me.polygons)
print(f"{NAME}: {ntri} triangles, {len(me.vertices)} vertices, {time.time() - T0:.1f}s")

# UV1 = lightmap: smart project (every face gets an island), packed
uv1 = me.uv_layers.new(name="Lightmap")
me.uv_layers.active = uv1
for oo in scn.objects: oo.select_set(False)
obj.select_set(True); bpy.context.view_layer.objects.active = obj
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(40), island_margin=0.003, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
try: bpy.ops.uv.pack_islands(rotate=True, margin=0.002)
except Exception as e: print("pack_islands:", e)
bpy.ops.object.mode_set(mode="OBJECT")
me.uv_layers.active = me.uv_layers["UVMap"]
zero = 0
uvd = me.uv_layers["Lightmap"].data
for p in me.polygons:
    a_, b_, c_ = (uvd[li].uv for li in p.loop_indices)
    if abs((b_.x - a_.x) * (c_.y - a_.y) - (c_.x - a_.x) * (b_.y - a_.y)) < 1e-12: zero += 1
degen = sum(1 for p in me.polygons if p.area < 1e-7)
print(f"lightmap: {zero} faces with zero UV1 area (of {len(me.polygons)}); {degen} faces with ~zero 3D area")

# ------------------------------------------------------------------------------------------------ AO bake into UV1
AO_PX = 2048
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 5.0
ao_img = bpy.data.images.new(NAME + "_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    nn = nt.nodes.new("ShaderNodeTexImage"); nn.image = ao_img; nn.name = "AO"; nt.nodes.active = nn
ao_path = os.path.join(OUT, NAME + "_ao.png")
if BAKE:
    scn.cycles.samples = SAMPLES
    t = time.time()
    for oo in scn.objects: oo.select_set(False)
    obj.select_set(True); bpy.context.view_layer.objects.active = obj
    me.uv_layers.active = me.uv_layers["Lightmap"]
    bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=8, use_clear=True)
    me.uv_layers.active = me.uv_layers["UVMap"]
    print(f"AO bake {time.time() - t:.1f}s")
    ao_img.filepath_raw = ao_path; ao_img.file_format = "PNG"
    ao_img.save()
elif os.path.exists(ao_path):
    ao_img.filepath = ao_path; ao_img.source = "FILE"; ao_img.reload()
for m in mats: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])

# ------------------------------------------------------------------------------------------------ split (bridge / footbridge) and export
foot = obj.copy(); foot.data = obj.data.copy(); foot.name = NAME + "_foot"; foot.data.name = NAME + "_foot"
scn.collection.objects.link(foot)
for o, keep in ((obj, 0), (foot, 1)):
    bm = bmesh.new(); bm.from_mesh(o.data)
    lay = bm.faces.layers.int.get("part")
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f[lay] != keep], context="FACES")
    bm.to_mesh(o.data); bm.free()
    o.data.attributes.remove(o.data.attributes["part"])
tri_bridge, tri_foot = len(obj.data.polygons), len(foot.data.polygons)
ground.hide_set(True)
for oo in scn.objects: oo.select_set(False)
obj.select_set(True); foot.select_set(True); bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, NAME + ".glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                          export_extras=False, export_vertex_color="NONE")
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

th = -math.atan2(DIRV.y, DIRV.x)
deck_xs = [XA + k * (XB - XA) / 8 for k in range(9)]
info = {
    "asset": f"road bridge '{NAME}' over the railway (tools/blender/roadBridge.py)", "kind": "road_over_rail",
    "urbis": B["urbis"], "line": B["line"], "road": B["road"],
    "triangles": tri_bridge + tri_foot, "triangles_bridge": tri_bridge, "triangles_foot": tri_foot, "materials": MATS,
    "nodes": {"bridge": NAME, "foot": NAME + "_foot"},
    "frame": "glTF Y up; +x = along the road (NW->SE), -z = Blender +Y (NE); origin = UrbIS polygon centroid at the cutting floor",
    "placement": {"city_local_position": [B["centre"][0], FLOOR, B["centre"][1]], "rotation_y_rad": th},
    "deck": {"length": XB - XA, "width": 2 * (YU + 0.06), "x0": XA, "x1": XB,
             "road_ends": list(B["road_ends"]), "grade": round(GRADE, 5), "kerb_ne": KNE, "kerb_sw": B["kerb_sw"],
             "sidewalk_ne": 0.13, "strip_sw": [0.10, 0.02], "parapet_inner": YI, "parapet_top": B["coping_bottom"] + CH,
             "fold": FOLD, "flare": FLARE},
    "footprint": [[XA - 0.5, -(YF0 * -1 + FB["w_nw"] + 0.5)], [XB + 0.5, -(YF0 * -1 + FB["w"] + 0.5)], [XB + 0.5, YU + FLARE + 0.5], [XA - 0.5, YU + FLARE + 0.5]],
    "foot": {"x0": FB["x0"], "x1": FB["x1"], "y_inner": YF0, "w": FB["w"], "w_nw": FB["w_nw"], "x_flare": FB["x_flare"], "top_under_road": FB["top_under_road"]},
    "openings": [{"name": o["name"], "x0": o["x0"], "x1": o["x1"], "spring": round(o["spring"], 3), "crown": round(o["crown"], 3),
                  "rise": o["rise"], "floor": o["floor"]} for o in OPS],
    "skew_dx_per_dy": 0.0,
    "arcade": {"bays": NB, "pitch": round(PITCH, 3), "consoles": len(CONSOLES)},
    "measured": "UrbIS Land cover ROB 879 (length, width, wing flare, axis), level +1 street surfaces (kerbs), DTM 2021 (cutting floor, slopes), city terrain at the deck ends (road heights), rail.json (rails), OSM (tracks, footbridge, benches)",
    "estimated": "from the free photo s05 (solved camera): spans, rises, crowns, the arcade (count 17 consoles, pitch), console / coping shape; the NE face (mirror), the wings and end piers, the footbridge's supports and level (look-only references), the corbel depth",
}
json.dump(info, open(os.path.join(OUT, NAME + ".json"), "w"), indent=1)
print(json.dumps({k: info[k] for k in ("triangles", "triangles_bridge", "triangles_foot")}))

if not PREVIEW:
    sys.exit(0)
# ------------------------------------------------------------------------------------------------ previews: Cycles
os.makedirs(PREVIEW, exist_ok=True)
ground.hide_set(False); ground.hide_render = False
for m in mats:
    nt = m.node_tree; p = nt.nodes["Principled BSDF"]
    uv2 = nt.nodes.new("ShaderNodeUVMap"); uv2.uv_map = "Lightmap"
    ao = nt.nodes.new("ShaderNodeTexImage"); ao.image = ao_img
    nt.links.new(uv2.outputs["UV"], ao.inputs["Vector"])
    mul = nt.nodes.new("ShaderNodeMixRGB"); mul.blend_type = "MULTIPLY"; mul.inputs["Fac"].default_value = 1.0
    if m.name == "brick_red_brussels":
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "UVMap"
        br = nt.nodes.new("ShaderNodeTexBrick")
        br.inputs["Scale"].default_value = 1.0; br.inputs["Brick Width"].default_value = 0.21; br.inputs["Row Height"].default_value = 0.063
        br.inputs["Mortar Size"].default_value = 0.01
        br.inputs["Color1"].default_value = (0.36, 0.12, 0.07, 1); br.inputs["Color2"].default_value = (0.26, 0.09, 0.06, 1)
        br.inputs["Mortar"].default_value = (0.42, 0.40, 0.36, 1)
        nt.links.new(uvn.outputs["UV"], br.inputs["Vector"]); nt.links.new(br.outputs["Color"], mul.inputs["Color1"])
    else:
        mul.inputs["Color1"].default_value = (*PREVIEW_COL[m.name], 1)
    if os.path.exists(ao_path): nt.links.new(ao.outputs["Color"], mul.inputs["Color2"])
    else: mul.inputs["Color2"].default_value = (1, 1, 1, 1)
    nt.links.new(mul.outputs["Color"], p.inputs["Base Color"])
world = scn.world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.3
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 2.2; sun.rotation_euler = (math.radians(62), 0, math.radians(150))
scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
G = lambda X, Y, h: (X, Y, ground_z(X, Y) + h)          # camera h over the ground
views = {"sw_track": (G(-1.0, -26.0, 1.7), (0.0, 0.0, 4.0), 20.0, 1200, 800, False),
         "sw_bank": (G(-20.0, -14.0, 1.7), (2.0, 0.0, 4.5), 22.0, 1200, 800, False),
         "ne_track": (G(1.0, 24.0, 1.7), (-1.0, 0.0, 4.0), 20.0, 1200, 800, False),
         "deck": ((-26.0, 0.3, road(-26) + 1.7), (5.0, 0.0, road(5.0) + 1.2), 22.0, 1200, 800, False),
         "close": (G(-6.0, -9.0, 1.7), (-6.0, -2.5, 6.2), 24.0, 1200, 800, False),
         "above": ((-30.0, -40.0, 30.0), (0.0, 0.0, 4.0), 30.0, 1200, 800, False)}
pv = os.path.join(ROOT, "models", "rail", NAME + "_photo_views.json")
if os.path.exists(pv):
    for k, v in json.load(open(pv)).items():
        views[k] = (tuple(v["pos"]), tuple(v["target"]), v["lens"], 1224, 918, v.get("roll", 0.0))
for vname, (loc, look, lens, rx, ry, extra) in views.items():
    scn.render.resolution_x, scn.render.resolution_y = rx, ry
    cam.location = Vector(loc); cam.data.lens = lens; cam.data.sensor_width = 36.0
    d = Vector(look) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    if isinstance(extra, float) and extra: cam.rotation_euler.rotate_axis("Z", extra)
    foot.hide_render = vname.startswith("s05")
    scn.render.filepath = os.path.join(PREVIEW, f"{NAME}_{vname}.png")
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)
print("DONE", time.time() - T0)
