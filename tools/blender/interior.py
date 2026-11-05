# THE INTERIOR CELL of one terraced house (a "maison bruxelloise", two bays, ground + first floor + attic), built by
# script from the house spec (tools/interior/houseSpec.mjs -> <house dir>/house.json: the real UrbIS footprint, base,
# eaves, and the façade openings exactly as viewer/facades.js draws them), then lit in Cycles: two lightmaps (DAY: the
# sky through the windows; NIGHT: the house's lamps + a street lamp) on a second UV set, plus Blender previews.
#
#   blender --factory-startup -b -P tools/blender/interior.py -- models/interior/maison1 [--seed 7] [--lm 1024]
#           [--samples 384] [--no-bake] [--preview docs/interior] [--pv-samples 64]
#
# Output (in the house dir): interior.glb (house-local frame, see interior_kit.py; meshes: Interior = all lightmapped
# surfaces in 5 materials, Glass, FrontDoor (its origin on the hinge), Colliders (simplified, not drawn)),
# lm_day.png / lm_night.png (RGBM, gamma 2: lin = (rgb * a * 4)^2), interior.json (rooms, openings, lights, probes,
# stats). The layout and furniture are INVENTED (a plausible plan for the real footprint, varied by --seed): no real
# family's home is copied.
import bpy, bmesh, sys, os, json, math, time, random
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import interior_kit as K
from interior_kit import T, C, xform, box, place, plaster, fabric, col

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
HOUSE = os.path.abspath(argv[0] if argv and not argv[0].startswith("--") else "models/interior/maison1")
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
SEED = int(arg("--seed", "7")); LM = int(arg("--lm", "1024")); SAMPLES = int(arg("--samples", "384"))
BAKE = "--no-bake" not in argv; PREVIEW = arg("--preview"); PV_SAMPLES = int(arg("--pv-samples", "64"))
T0 = time.time()
rnd = random.Random(SEED)
spec = json.load(open(os.path.join(HOUSE, "house.json")))

# ------------------------------------------------------------------------------------------------ the plan frame
# Plan coordinates (s, y, z): s across the house from the left party wall's inner face, z into the house from the
# street face (outer plane z = 0), y up from the building's base. The real party walls are not quite parallel to the
# house frame (UrbIS footprint): the final map x = xl(z) + s * k(z) shears everything onto them (< 1 degree).
fp = spec["footprintLocal"]
faces = spec["faces"]
front = next(f for f in faces if f["kind"] == "street")
back = next((f for f in faces if f["kind"] == "free"), None)
parties = [f for f in faces if f["kind"] == "party"]
TH_FACADE, TH_PARTY = 0.30, 0.15
def edge_x_at(side, z):
    """x of the footprint's left (side -1) or right (+1) edge at depth z (house local)."""
    pts = sorted(fp, key=lambda p: p[0])
    L = sorted(pts[:2], key=lambda p: p[1]); R = sorted(pts[2:], key=lambda p: p[1])
    a, b = (L if side < 0 else R)
    t = (z - a[1]) / (b[1] - a[1])
    return a[0] + (b[0] - a[0]) * t
ZB_OUT = max(p[1] for p in fp) - 0.003                 # the back façade's outer plane (mean)
ZF_IN, ZB_IN = TH_FACADE, ZB_OUT - TH_FACADE
xl = lambda z: edge_x_at(-1, z) + TH_PARTY
xr = lambda z: edge_x_at(1, z) - TH_PARTY
WI = (xr(ZF_IN) - xl(ZF_IN) + xr(ZB_IN) - xl(ZB_IN)) / 2   # plan width (inner)
def to_local(p):
    s, y, z = p
    k = (xr(z) - xl(z)) / WI
    return (xl(z) + s * k, y, z)
def s_of(x, z): return (x - xl(z)) * WI / (xr(z) - xl(z))
print(f"house {spec['BU_ID']}: inner width {WI:.3f} m, depth {ZB_IN - ZF_IN:.3f} m, eaves {spec['eaves'] - spec['base']:.2f} m")

# levels (above base)
GF, GF_CEIL, FF, FF_CEIL = 0.12, 3.12, 3.40, 6.25
# openings of the two façades in plan coordinates
def face_openings(f, zmid):
    out = []
    for o in f["openings"]:
        xa = f["originLocal"][0] + f["tLocal"][0] * o["u0"]; xb = f["originLocal"][0] + f["tLocal"][0] * o["u1"]
        sa, sb = sorted((s_of(xa, zmid), s_of(xb, zmid)))
        out.append(dict(o, s0=sa, s1=sb))
    return out
F_OPEN = face_openings(front, TH_FACADE / 2)
B_OPEN = face_openings(back, ZB_OUT - TH_FACADE / 2) if back else []
door = next(o for o in F_OPEN if o["kind"] == "door")
MIRROR = door["s0"] > WI / 2                             # the plan is drawn for a door on the left; mirror if not
if MIRROR:
    for o in F_OPEN + B_OPEN: o["s0"], o["s1"] = WI - o["s1"], WI - o["s0"]
def M_s(s): return WI - s if MIRROR else s              # plan s (door-left) -> real plan s
print("front openings", [(o["kind"], o["floor"], round(o["s0"], 2), round(o["s1"], 2)) for o in F_OPEN])
print("back openings", [(o["kind"], o["floor"], round(o["s0"], 2), round(o["s1"], 2)) for o in B_OPEN])

# ------------------------------------------------------------------------------------------------ the layout (plan, door on the left)
HALL = min(2.30, door["s1"] + 0.22)                     # hall width: the door + a jamb
STAIR_W = 0.95; STRINGER = 0.05
NR = 18; RISE = (FF - GF) / NR; GOING = 0.24
Z_STAIR = 1.40                                           # first riser
Z_TOP = Z_STAIR + (NR - 1) * GOING                       # the last riser: the first floor starts here
Z_CROSS = Z_TOP + 0.02                                   # GF cross partition (hall | kitchen, salon | dining)
VOID_Z0 = Z_STAIR + 3.6 * GOING                          # the stairwell opening in the first floor (headroom >= 2 m)
PT = 0.10                                                # partition thickness
assert Z_CROSS + PT + 4.0 < ZB_IN, "house too shallow for this plan"
# rooms: (name, level, s0, s1, z0, z1, floor, wall colour, ceiling)
S1 = HALL; S2 = HALL + PT
pal = {"salon": rnd.choice([0xE2DCCD, 0xC9CDB8, 0xD9D2C2]), "hall": rnd.choice([0xD8CCB4, 0xCFC6B2]), "kitchen": rnd.choice([0xE9E3D5, 0xDCE0D6]),
       "bed": rnd.choice([0xC6CFD3, 0xD3C7BC, 0xC2C9BB]), "bath": 0xEEEDE8, "study": rnd.choice([0xD6C29C, 0xBFC8C0]), "landing": None}
pal["landing"] = pal["hall"]
Z_BED = 6.80; Z_STUDY = 7.90
ROOMS = [
    ("hall", 0, 0.0, S1, ZF_IN, Z_CROSS, "cement_hall", pal["hall"]),
    ("salon", 0, S2, WI, ZF_IN, Z_CROSS, "parquet", pal["salon"]),
    ("kitchen", 0, 0.0, WI, Z_CROSS + PT, ZB_IN, "cement_kitchen", pal["kitchen"]),
    ("alcove", 1, 0.0, S1, ZF_IN, VOID_Z0 - PT, "parquet", pal["bed"]),
    ("bedroom", 1, S2, WI, ZF_IN, Z_BED, "parquet", pal["bed"]),
    ("corridor", 1, STAIR_W + STRINGER, S1, VOID_Z0, Z_TOP, "boards", pal["landing"]),
    ("landing", 1, 0.0, S1, Z_TOP, Z_STUDY, "boards", pal["landing"]),
    ("bathroom", 1, S2, WI, Z_BED + PT, ZB_IN, "tiles_bath", pal["bath"]),
    ("study", 1, 0.0, S1, Z_STUDY + PT, ZB_IN, "boards", pal["study"]),
]
# partitions: (level, axis, at, from, to, [openings (a, b, height, leaf)])  axis "s": a wall at s = at (thickness +PT),
# spanning z; axis "z": at z = at, spanning s. Door openings: (a, b) along the wall, height above the floor.
DOOR_H = 2.08
PARTS = [
    (0, "s", S1, ZF_IN, Z_CROSS, [(3.90, 4.75, DOOR_H, ("hinge_hi", "into+"))]),
    (0, "z", Z_CROSS, 0.0, WI, [(1.28, 2.12, DOOR_H, ("hinge_hi", "into+")), (S2 + 0.75, min(WI - 0.5, S2 + 2.35), 2.45, None)]),
    (1, "z", VOID_Z0 - PT, 0.0, S1, []),
    (1, "s", S1, VOID_Z0 - PT, Z_BED + PT, [(3.00, 3.85, DOOR_H, ("hinge_hi", "into+"))]),
    (1, "z", Z_BED, S2, WI, []),
    (1, "s", S1, Z_BED + PT, ZB_IN, [(7.00, 7.80, DOOR_H, ("hinge_hi", "into+"))]),
    (1, "z", Z_STUDY, 0.0, S1, [(1.30, 2.10, DOOR_H, ("hinge_hi", "into+"))]),
]
VOID = (0.0, STAIR_W + STRINGER, VOID_Z0, Z_TOP)          # s0, s1, z0, z1 (the first floor's stairwell)

# ------------------------------------------------------------------------------------------------ builders
B = K.Builder()          # lightmapped interior
DOOR = K.Builder()       # the front door leaf (animated)
GLASS = K.Builder()      # window panes (not lightmapped, not in the bake)
OCC = K.Builder()        # bake-only occluders: outer shell, roof, surroundings (not exported)
COL = K.Builder()        # colliders (exported, not drawn)
LIGHTS = []              # night lamps: (name, plan position, watts, colour, radius)
PROBES = []

def ms(p):               # mirror a plan point when the door is on the right
    return (M_s(p[0]), p[1], p[2]) if MIRROR else tuple(p)

class Mirrored:
    """Wraps a Builder: points given in the door-left plan are mirrored (and faces re-wound) when MIRROR."""
    def __init__(self, b): self.b = b
    def quad(self, a, b_, c, d, mat, cl):
        if MIRROR: self.b.quad(ms(d), ms(c), ms(b_), ms(a), mat, cl)
        else: self.b.quad(a, b_, c, d, mat, cl)
    def emit(self, bm, mat, cl, M=Matrix.Identity(4), uv_scale=1.0, skip_down=False):
        if MIRROR: M = Matrix.Translation((WI, 0, 0)) @ Matrix.Diagonal((-1, 1, 1, 1)) @ M
        if MIRROR and M.determinant() < 0:
            # the mirror flips winding: emit reversed faces
            bmesh.ops.reverse_faces(bm, faces=bm.faces)
        self.b.emit(bm, mat, cl, M, uv_scale, skip_down)
Bm, Dm, Gm, Om, Cm = (Mirrored(x) for x in (B, DOOR, GLASS, OCC, COL))

def rect_y(bl, s0, s1, z0, z1, y, mat, cl, up=True):
    """A horizontal rectangle at height y (facing up or down)."""
    a, b_, c, d = (s0, y, z0), (s1, y, z0), (s1, y, z1), (s0, y, z1)
    if up: bl.quad(a, d, c, b_, mat, cl)
    else: bl.quad(a, b_, c, d, mat, cl)

def wall_face(bl, axis, at, normal_sign, a0, a1, y0, y1, holes, mat, cl, also=None):
    """A vertical wall face with rectangular holes, as a grid of cells. axis "s": the plane s = at (spanning z = a);
    "z": the plane z = at (spanning s = a). normal_sign: +1 the face looks toward +axis. holes: [(a0, a1, y0, y1)]."""
    xs = sorted(set([a0, a1] + [max(a0, min(a1, h[0])) for h in holes] + [max(a0, min(a1, h[1])) for h in holes]))
    ys = sorted(set([y0, y1] + [max(y0, min(y1, h[2])) for h in holes] + [max(y0, min(y1, h[3])) for h in holes]))
    for i in range(len(xs) - 1):
        for j in range(len(ys) - 1):
            ca, cb, cy0, cy1 = xs[i], xs[i + 1], ys[j], ys[j + 1]
            if cb - ca < 1e-4 or cy1 - cy0 < 1e-4: continue
            mid_a, mid_y = (ca + cb) / 2, (cy0 + cy1) / 2
            if any(h[0] <= mid_a <= h[1] and h[2] <= mid_y <= h[3] for h in holes): continue
            P = lambda a, y: (at, y, a) if axis == "s" else (a, y, at)
            q = [P(ca, cy0), P(cb, cy0), P(cb, cy1), P(ca, cy1)]
            # winding: for axis s, +normal => (z increasing) seen from +s is clockwise -> reverse
            if (axis == "s") == (normal_sign > 0): q = q[::-1]
            for t in ([bl] + ([also] if also else [])): t.quad(*q, mat, cl)

def jamb(bl, axis, at0, at1, a0, a1, y0, y1, mat, cl, sides="lrbt"):
    """The faces lining a rectangular hole through a wall between planes at0 < at1 (reveal / door lining)."""
    def P(a, y, w): return (w, y, a) if axis == "s" else (a, y, w)
    if "l" in sides: q = [P(a0, y0, at0), P(a0, y0, at1), P(a0, y1, at1), P(a0, y1, at0)]; bl.quad(*(q if axis == "s" else q[::-1]), mat, cl)
    if "r" in sides: q = [P(a1, y0, at0), P(a1, y1, at0), P(a1, y1, at1), P(a1, y0, at1)]; bl.quad(*(q if axis == "s" else q[::-1]), mat, cl)
    if "b" in sides: q = [P(a0, y0, at0), P(a1, y0, at0), P(a1, y0, at1), P(a0, y0, at1)]; bl.quad(*(q[::-1] if axis == "s" else q), mat, cl)
    if "t" in sides: q = [P(a0, y1, at0), P(a0, y1, at1), P(a1, y1, at1), P(a1, y1, at0)]; bl.quad(*(q[::-1] if axis == "s" else q), mat, cl)

WALL_CEIL = {0: (GF, GF_CEIL), 1: (FF, FF_CEIL)}
ceil_c = plaster(0xF1EEE7)
FLOORS = {"parquet": C["parquet"], "boards": C["boards"], "cement_hall": col(0xB9AE9C, "Hard", "cement"), "cement_kitchen": col(0xC8BFAE, "Hard", "cement"),
          "tiles_bath": col(0xDCDAD4, "Hard", "tiles")}

# ------------------------------------------------------------------------------------------------ outer walls (façades + party walls)
def outer_wall(side, opens):
    """The front (side "f") or back ("b") façade: inner faces per storey with the window holes, reveals, the frames,
    sills, glass; the outer face (occluder only)."""
    z_out, z_in, nsign = (0.0, ZF_IN, 1) if side == "f" else (ZB_OUT, ZB_IN, -1)
    zf_frame0 = z_out + nsign * 0.10; zf_frame1 = z_out + nsign * 0.17
    for lev, (y0, y1) in WALL_CEIL.items():
        holes = [(o["s0"], o["s1"], max(y0, o["h0"]), min(y1, o["h1"])) for o in opens if o["h1"] > y0 and o["h0"] < y1]
        room = next(r for r in ROOMS if r[1] == lev and r[4] <= (z_in + 0.5 if side == "f" else z_in - 0.5) <= r[5]) if False else None
        # inner face, coloured per room it bounds
        cuts = sorted(set([0.0, WI] + [p[3] if p[1] == "s" else 0 for p in PARTS if p[0] == lev and p[1] == "s"] + [p[2] for p in PARTS if p[0] == lev and p[1] == "s"] + [p[2] + PT for p in PARTS if p[0] == lev and p[1] == "s"]))
        segs = []
        for r in ROOMS:
            if r[1] != lev: continue
            if (side == "f" and abs(r[4] - z_in) < 1e-3) or (side == "b" and abs(r[5] - z_in) < 1e-3): segs.append((r[2], r[3], r))
        for (a0, a1, r) in segs:
            hh = [h for h in holes if h[1] > a0 and h[0] < a1]
            wall_face(Bm, "z", z_in, nsign, a0, a1, y0, y1, hh, "Plaster", plaster(r[7]), also=Cm)
        # where partitions butt into this wall: their end strips get no face (hidden)
    # the outer face (the city façade covers it) and the floor band between storeys, for the bake
    holes = [(o["s0"], o["s1"], o["h0"], o["h1"]) for o in opens]
    wall_face(Om, "z", z_out, -nsign, -TH_PARTY, WI + TH_PARTY, 0.0, FF_CEIL + 0.3, holes, "Plaster", C["brick"])
    for (a, b_) in ((GF_CEIL, FF),):
        wall_face(Om, "z", z_in, nsign, 0, WI, a, b_, [], "Plaster", C["brick"])
    wall_face(Om, "z", z_in, nsign, 0, WI, FF_CEIL, FF_CEIL + 0.3, [], "Plaster", C["brick"])
    for o in opens:
        s0, s1, h0, h1 = o["s0"], o["s1"], o["h0"], o["h1"]
        za, zb = (min(z_out, zf_frame0) - (0.004 if side == "f" else -0.004), max(z_out, zf_frame0)) if side == "f" else (min(z_out, zf_frame0), max(z_out, zf_frame0) + 0.004)
        # outer reveal (brick, seen from the street), inner reveal (plaster)
        is_door = o["kind"] == "door"
        jamb(Bm, "z", min(z_out, zf_frame0) - 0.004 * (1 if side == "f" else -1) * 0, max(z_out, zf_frame0), s0, s1, h0, h1, "Plaster", C["brick"], sides="lrt" + ("" if not is_door else ""))
        lev_y0 = GF if h0 < FF else FF
        jamb(Bm, "z", min(z_in, zf_frame1), max(z_in, zf_frame1), s0, s1, max(h0, lev_y0) if not is_door else GF, h1, "Plaster", plaster(0xEFEBE3), sides="lrt" if not is_door else "lrt")
        jamb(Cm, "z", min(z_out, z_in), max(z_out, z_in), s0, s1, max(h0, GF), h1, "Plaster", C["brick"], sides="lrt")
        if is_door:
            front_door(o, z_out, zf_frame0, zf_frame1)
            continue
        # exterior blue-stone sill (projecting 5 cm), interior sill board
        zo = z_out - 0.05 * nsign
        sill = box(s1 - s0 + 0.12, 0.08, abs(zf_frame0 - zo), bevel=0.006, seg=1)
        Bm.emit(sill, "Hard", C["bluestone"], T((s0 + s1) / 2, h0 - 0.08, (zo + zf_frame0) / 2))
        isill = box(s1 - s0 + 0.08, 0.028, abs(z_in - zf_frame1) + 0.045, bevel=0.005, seg=1)
        Bm.emit(isill, "Wood", C["white_paint"] if rnd.random() < 0.5 else C["marble_white"] if False else C["white_paint"], T((s0 + s1) / 2, h0 - 0.0, (z_in + zf_frame1) / 2 + nsign * 0.022))
        window_frame(o, zf_frame0, zf_frame1, nsign)

FRAME_C = C["frame_white"]
def window_frame(o, za, zb, nsign):
    """The window: outer frame (7 cm, as the shader), a mullion and a transom (the shader's glazing bars), two
    casement sashes and a fixed fanlight, glass panes; all at the frame plane za..zb."""
    s0, s1, h0, h1 = o["s0"], o["s1"], o["h0"], o["h1"]
    zc, dz = (za + zb) / 2, abs(zb - za)
    fw = 0.07
    ring(Bm, s0, s1, h0, h1, fw, dz, zc, "Wood", FRAME_C)
    tr = o["transom"]
    Bm.emit(box(s1 - s0 - 2 * fw, 0.06, dz, bevel=0.004, seg=1), "Wood", FRAME_C, T((s0 + s1) / 2, tr - 0.03, zc))
    lights = []
    if o["mullion"]:
        sm = (s0 + s1) / 2
        Bm.emit(box(0.06, tr - 0.03 - (h0 + fw), dz, bevel=0.004, seg=1), "Wood", FRAME_C, T(sm, h0 + fw, zc))
        lights = [(s0 + fw, sm - 0.03, h0 + fw, tr - 0.03), (sm + 0.03, s1 - fw, h0 + fw, tr - 0.03)]
    else: lights = [(s0 + fw, s1 - fw, h0 + fw, tr - 0.03)]
    for (a, b_, c, d) in lights:          # casement sashes (5 cm rails), glass inside
        ring(Bm, a, b_, c, d, 0.05, dz * 0.7, zc + nsign * 0.006, "Wood", FRAME_C)
        pane(a + 0.05, b_ - 0.05, c + 0.05, d - 0.05, zc)
        # a lever handle on the inner side of each sash's meeting rail
    if o["mullion"]:
        sm = (s0 + s1) / 2
        Bm.emit(xform(K.lathe([(0.008, 0), (0.008, 0.012), (0.012, 0.02)], seg=8), T(0, 0, 0, rx=90 * nsign)), "Hard", C["brass"], T(sm + 0.04, h0 + (tr - h0) * 0.5, zb + nsign * 0.0))
        Bm.emit(box(0.012, 0.11, 0.012, bevel=0.004, seg=1), "Hard", C["brass"], T(sm + 0.04, h0 + (tr - h0) * 0.5 - 0.1, zb + nsign * 0.02))
    pane(s0 + fw, s1 - fw, tr + 0.03, h1 - fw, zc)

def ring(bl, s0, s1, h0, h1, w, dz, zc, mat, cl):
    for (cx, cy, sx, sy) in (((s0 + s1) / 2, h0, s1 - s0, w), ((s0 + s1) / 2, h1 - w, s1 - s0, w), (s0 + w / 2, h0 + w, w, h1 - h0 - 2 * w), (s1 - w / 2, h0 + w, w, h1 - h0 - 2 * w)):
        bl.emit(box(sx, sy, dz, bevel=min(0.006, w * 0.2), seg=1), mat, cl, T(cx, cy, zc))

def pane(s0, s1, h0, h1, z):
    a, b_, c, d = (s0, h0, z), (s1, h0, z), (s1, h1, z), (s0, h1, z)
    Gm.quad((s0, h0, z), (s1, h0, z), (s1, h1, z), (s0, h1, z), "Glass", (0.9, 0.92, 0.92, 0.0625))

def front_door(o, z_out, za, zb):
    """The Brussels front door: frame, a panelled oak leaf (painted the façade shader's door colour), a glazed fanlight
    over a transom, a blue-stone step. The leaf goes in its own mesh with its origin on the hinge."""
    s0, s1, h0, h1 = o["s0"], o["s1"], o["h0"], o["h1"]
    zc, dz = (za + zb) / 2, abs(zb - za)
    fw = 0.07
    tr = o["transom"]
    # step (outside) + threshold
    Bm.emit(box(s1 - s0 + 0.3, GF + 0.0, 0.32, bevel=0.01, seg=2), "Hard", C["bluestone"], T((s0 + s1) / 2, 0.0, z_out - 0.16 + 0.005))
    Bm.emit(box(s1 - s0, GF + 0.0, abs(ZF_IN - z_out), bevel=0.004, seg=1), "Hard", C["bluestone"], T((s0 + s1) / 2, 0.0, (z_out + ZF_IN) / 2))
    for (cx, sx) in ((s0 + fw / 2, fw), (s1 - fw / 2, fw)):
        Bm.emit(box(sx, h1 - GF, dz + 0.02, bevel=0.006, seg=1), "Wood", DOOR_C, T(cx, GF, zc))
    Bm.emit(box(s1 - s0, fw, dz + 0.02, bevel=0.006, seg=1), "Wood", DOOR_C, T((s0 + s1) / 2, h1 - fw, zc))
    Bm.emit(box(s1 - s0 - 2 * fw, 0.08, dz + 0.02, bevel=0.006, seg=1), "Wood", DOOR_C, T((s0 + s1) / 2, tr - 0.04, zc))
    pane(s0 + fw, s1 - fw, tr + 0.04, h1 - fw, zc)
    # the leaf (hinge on the s0 side, at the inner face of the frame): local frame x from the hinge, z = 0 its outer face
    lw, lh = s1 - s0 - 2 * fw - 0.006, tr - 0.04 - GF - 0.006
    leaf = []
    leaf.append((box(lw, lh, 0.055, bevel=0.006, seg=1), "Wood", DOOR_C))
    for k, (py, ph) in enumerate(((0.12, lh * 0.36), (0.18 + lh * 0.36, lh * 0.5 - 0.06))):
        for sx in (-1, 1):
            for zz in (-1, 1):
                pnl = box(lw / 2 - 0.16, ph - 0.0, 0.014, bevel=0.012, seg=2)
                leaf.append((xform(pnl, T(sx * lw / 4, py, zz * 0.033)), "Wood", DOOR_C))
    leaf.append((xform(K.lathe([(0.03, 0), (0.028, 0.01), (0.02, 0.02), (0.0, 0.03)], seg=16), T(0, 1.05 - GF, 0.0275 + 0.01, rx=-90)), "Hard", C["brass"]))
    leaf.append((xform(box(0.06, 0.14, 0.012, bevel=0.004, seg=1), T(lw / 2 - 0.09, 1.0 - GF, 0.034)), "Hard", C["brass"]))
    leaf.append((xform(box(0.25, 0.04, 0.012, bevel=0.004, seg=1), T(0, 0.85, 0.034)), "Hard", C["brass"]))       # letter plate
    leaf.append((xform(box(0.012, 0.18, 0.02, bevel=0.004, seg=1), T(lw / 2 - 0.09, 1.0 - GF, -0.035)), "Hard", C["brass"]))
    hinge = (s0 + fw + 0.003, GF + 0.003, zb - 0.005)
    hinge_m = Vector(hinge)
    for bm, mat, cl in leaf:
        # piece frame -> leaf frame: leaf centred at x = lw / 2 from the hinge, outer face toward -z
        Dm.emit(bm, mat, cl, Matrix.Translation(hinge_m) @ Matrix.Translation((lw / 2, 0, -0.0275)), skip_down=False)
    DOOR_INFO.update(hinge_plan=list(hinge), width=lw, height=lh)
DOOR_INFO = {}
DI = int(((math.floor(spec["rnd"] * 4096 + 0.5) / 4096) * 31) % 1 * 4)
DOOR_C = [col(0x264A33, "Wood", "painted"), col(0x6B1F1F, "Wood", "painted"), col(0x1F2D4D, "Wood", "painted"), col(0x5A3A1E, "Wood", "oak")][DI]
fr = ((math.floor(spec["rnd"] * 4096 + 0.5) / 4096) * 7) % 1
if fr >= 0.8: FRAME_C = col(0x1A1918, "Wood", "painted")

outer_wall("f", F_OPEN)
if back: outer_wall("b", B_OPEN)

# party walls: inner faces per storey per room (holes where partitions butt in), outer faces for the bake
for side_s, nsign in ((0.0, 1), (WI, -1)):
    for lev, (y0, y1) in WALL_CEIL.items():
        for r in ROOMS:
            if r[1] != lev: continue
            if abs((r[2] if nsign > 0 else r[3]) - side_s) > 1e-3: continue
            wall_face(Bm, "s", side_s, nsign, r[4], r[5], y0, y1, [], "Plaster", plaster(r[7]), also=Cm)
    wall_face(Om, "s", side_s - nsign * TH_PARTY, -nsign, 0.0, ZB_OUT, 0.0, FF_CEIL + 0.3, [], "Plaster", C["brick"])

# ------------------------------------------------------------------------------------------------ partitions
for (lev, axis, at, a0, a1, opens) in PARTS:
    y0, y1 = WALL_CEIL[lev]
    holes = [(a, b_, y0, y0 + h) for (a, b_, h, _) in opens]
    # each side: coloured by the room it faces
    for side in (0, 1):
        plane = at + (PT if side else 0.0)
        nsign = 1 if side else -1
        probe = plane + nsign * 0.05
        segs = []
        for r in ROOMS:
            if r[1] != lev: continue
            inside = (r[2] <= probe <= r[3]) if axis == "s" else (r[4] <= probe <= r[5])
            if not inside: continue
            ra0, ra1 = (r[4], r[5]) if axis == "s" else (r[2], r[3])
            lo, hi = max(a0, ra0), min(a1, ra1)
            if hi - lo > 0.01: segs.append((lo, hi, r))
        for (lo, hi, r) in segs:
            wall_face(Bm, axis, plane, nsign, lo, hi, y0, y1, [h for h in holes if h[1] > lo and h[0] < hi], "Plaster", plaster(r[7]), also=Cm)
    for (a, b_, h, leaf) in opens:
        if leaf:             # door lining (painted wood) + architraves on both sides
            jamb(Bm, axis, at, at + PT, a, b_, y0, y0 + h, "Wood", C["white_paint"], sides="lrt")
            for side in (0, 1):
                plane = at + (PT if side else 0.0); nsign = 1 if side else -1
                arch = 0.07
                for (cx, cy, sx, sy) in (((a + b_) / 2, y0 + h, b_ - a + 2 * arch, arch), (a - arch / 2, y0, arch, h), (b_ + arch / 2, y0, arch, h)):
                    bm = box(sx, sy, 0.018, bevel=0.006, seg=2)
                    if axis == "s": Bm.emit(bm, "Wood", C["white_paint"], T(plane + nsign * 0.009, cy, cx, ry=90))
                    else: Bm.emit(bm, "Wood", C["white_paint"], T(cx, cy, plane + nsign * 0.009))
            # the leaf, open: hinged at the b_ end, swung into +axis side by ~80-95 degrees
            ang = rnd.uniform(78, 96)
            lw, lh = b_ - a - 0.01, h - 0.012
            leaf_parts = K.panel_door(lw, lh, C["white_paint"], 0.0, 0.0, 0.0, panels=2) + K.panel_door(lw, lh, C["white_paint"], 0.0, 0.0, 0.0, panels=2)
            hinge = (at + PT, b_ - 0.005) if axis == "s" else (b_ - 0.005, at + PT)
            for k, (bm, mat, cl) in enumerate(leaf_parts):
                flip = k >= len(leaf_parts) // 2
                Mleaf = T(-lw / 2, 0, -0.02 if flip else 0.0, ry=180 if flip else 0)
                if axis == "s":   # hinge at (s = at + PT, z = b_): the leaf runs from the hinge along -z when closed
                    M = T(hinge[0], y0 + 0.006, hinge[1], ry=-90 + ang) @ Mleaf
                else:             # hinge at (s = b_, z = at + PT): the leaf runs along -s when closed
                    M = T(hinge[0], y0 + 0.006, hinge[1], ry=0 + ang - 180 + 180) @ T(0, 0, 0, ry=180) @ Mleaf
                Bm.emit(bm, mat, cl, M)
            # handles
            # collider: the open leaf as a thin box
        else:                # a wide opening: plaster lining
            jamb(Bm, axis, at, at + PT, a, b_, y0, y0 + h, "Plaster", plaster(0xEFEBE3), sides="lrt")
        # the floor in the doorway (threshold)
        if axis == "s": rect_y(Bm, at, at + PT, a, b_, y0, "Wood", C["oak"])
        else: rect_y(Bm, a, b_, at, at + PT, y0, "Wood", C["oak"])
    # the partition's ends, where they stand free (void edge): none in this plan
    # colliders: the solid partition minus the openings
    for k, (lo, hi) in enumerate(zip([a0] + [o[1] for o in opens], [o[0] for o in opens] + [a1])):
        if hi - lo < 0.01: continue
        if axis == "s": Cm.emit(box(PT, y1 - y0, hi - lo), "Plaster", ceil_c, T(at + PT / 2, y0, (lo + hi) / 2))
        else: Cm.emit(box(hi - lo, y1 - y0, PT), "Plaster", ceil_c, T((lo + hi) / 2, y0, at + PT / 2))
    for (a, b_, h, _) in opens:     # the lintel over each opening
        if axis == "s": Cm.emit(box(PT, y1 - y0 - h, b_ - a), "Plaster", ceil_c, T(at + PT / 2, y0 + h, (a + b_) / 2))
        else: Cm.emit(box(b_ - a, y1 - y0 - h, PT), "Plaster", ceil_c, T((a + b_) / 2, y0 + h, at + PT / 2))

# ------------------------------------------------------------------------------------------------ floors, ceilings, the stairwell
for r in ROOMS:
    name, lev, s0, s1, z0, z1, flo, wc = r
    y0, y1 = WALL_CEIL[lev]
    rect_y(Bm, s0, s1, z0, z1, y0, *(("Wood", FLOORS[flo]) if flo in ("parquet", "boards") else ("Hard", FLOORS[flo])))
    rect_y(Cm, s0, s1, z0, z1, y0, "Plaster", ceil_c)
    # ceiling (minus the stairwell over the hall)
    if lev == 0 and name == "hall":
        vs0, vs1, vz0, vz1 = VOID
        rect_y(Bm, s0, s1, z0, vz0, y1, "Plaster", ceil_c, up=False)
        rect_y(Bm, vs1, s1, vz0, z1, y1, "Plaster", ceil_c, up=False)
        rect_y(Bm, s0, vs1, vz1, z1, y1, "Plaster", ceil_c, up=False)
        rect_y(Cm, s0, s1, z0, vz0, y1, "Plaster", ceil_c, up=False); rect_y(Cm, vs1, s1, vz0, z1, y1, "Plaster", ceil_c, up=False)
        # the slab's edges round the stairwell
        wall_face(Bm, "s", vs1, -1, vz0, vz1, GF_CEIL, FF, [], "Plaster", ceil_c)
        wall_face(Bm, "z", vz0, 1, vs0, vs1, GF_CEIL, FF, [], "Plaster", ceil_c)
        wall_face(Bm, "s", 0.0, 1, vz0, vz1, GF_CEIL, FF, [], "Plaster", plaster(pal["hall"]))
    else:
        rect_y(Bm, s0, s1, z0, z1, y1, "Plaster", ceil_c, up=False)
        rect_y(Cm, s0, s1, z0, z1, y1, "Plaster", ceil_c, up=False)
# the stairwell's party-wall face from GF ceiling up (one tall face over the flight)
# (the hall's GF party wall stops at GF_CEIL; the landing's FF wall starts at FF; the band between is the slab edge
# drawn above on s = 0 over the void)
# occluders: slabs between storeys, the attic
for (ya, yb) in ((GF_CEIL, FF), (FF_CEIL, FF_CEIL + 0.3)):
    rect_y(Om, -TH_PARTY, WI + TH_PARTY, 0, ZB_OUT, yb, "Plaster", ceil_c)
    rect_y(Om, -TH_PARTY, WI + TH_PARTY, 0, ZB_OUT, ya, "Plaster", ceil_c, up=False) if ya > FF_CEIL - 0.01 else None
for tri in [spec["roof"][i:i + 3] for i in range(0, len(spec["roof"]), 3)]:
    pts = [(s_of(p[0], p[2]), p[1], p[2]) for p in tri]
    Om.b.poly([to_plan_p for to_plan_p in pts], "Plaster", C["brick"]) if not MIRROR else Om.b.poly([ms(p) for p in pts][::-1], "Plaster", C["brick"])

# ------------------------------------------------------------------------------------------------ the stair
OAK = C["stair_oak"]; RISER_C = C["white_paint"]
for i in range(1, NR):
    y = GF + i * RISE; z0 = Z_STAIR + (i - 1) * GOING
    Bm.emit(box(STAIR_W, 0.032, GOING + 0.03, bevel=0.008, seg=2), "Wood", OAK, T(STAIR_W / 2, y - 0.032, z0 + GOING / 2 - 0.015))
    Bm.quad((0.0, y - RISE, z0), (STAIR_W, y - RISE, z0), (STAIR_W, y - 0.032, z0), (0.0, y - 0.032, z0), "Wood", RISER_C)
# the last riser up to the first floor
Bm.quad((0.0, FF - RISE, Z_TOP), (STAIR_W, FF - RISE, Z_TOP), (STAIR_W, FF, Z_TOP), (0.0, FF, Z_TOP), "Wood", RISER_C)
Bm.emit(box(STAIR_W, 0.03, 0.06, bevel=0.008, seg=2), "Wood", OAK, T(STAIR_W / 2, FF - 0.03, Z_TOP + 0.0))
# stringer + spandrel (closed side under the flight, panelled) on the hall side
def stair_y(z): return GF + max(0, min(NR, (z - Z_STAIR) / GOING + 1)) * RISE
spand = bmesh.new()
pts_top = [(STAIR_W, GF, Z_STAIR - 0.03)] + [(STAIR_W, GF + (i + 1) * RISE + 0.06, Z_STAIR + i * GOING) for i in range(NR - 1)]
# a sloped stringer board (wood) along the flight, the spandrel below it (plaster panel) down to the floor
L = math.hypot(Z_TOP - Z_STAIR, FF - GF - RISE); ang = math.degrees(math.atan2(FF - GF - RISE, Z_TOP - Z_STAIR))
Bm.emit(box(STRINGER, 0.28, L + 0.2, bevel=0.01, seg=2), "Wood", RISER_C, T(STAIR_W + STRINGER / 2, GF + RISE - 0.12, Z_STAIR + (Z_TOP - Z_STAIR) / 2, rx=-ang) @ T(0, -0.14 + 0.14, 0) @ T(0, 0, 0))
for side_s in (STAIR_W + STRINGER, ):
    # spandrel: vertical panel s = STAIR_W + STRINGER from the floor to under the stringer
    n = 12
    for k in range(n):
        za = Z_STAIR + (Z_TOP - Z_STAIR) * k / n; zb = Z_STAIR + (Z_TOP - Z_STAIR) * (k + 1) / n
        ya = min(GF_CEIL, GF + RISE + (za - Z_STAIR) * math.tan(math.radians(ang)) - 0.14); yb = min(GF_CEIL, GF + RISE + (zb - Z_STAIR) * math.tan(math.radians(ang)) - 0.14)
        Bm.quad((side_s, GF, za), (side_s, GF, zb), (side_s, yb, zb), (side_s, ya, za), "Wood", C["white_paint"])
        Cm.quad((side_s, GF, za), (side_s, GF, zb), (side_s, yb, zb), (side_s, ya, za), "Plaster", ceil_c)
    # panel mouldings on the spandrel
    for k in range(4):
        za = Z_STAIR + 0.5 + k * 0.95; zb = za + 0.75
        top = GF + RISE + (za - Z_STAIR) * math.tan(math.radians(ang)) - 0.35
        if top - GF < 0.5: continue
        for (a, b_, y0_, y1_) in ((za, zb, GF + 0.18, GF + 0.2), (za, zb, top - 0.02, top), (za, za + 0.02, GF + 0.18, top), (zb - 0.02, zb, GF + 0.18, top)):
            Bm.emit(box(0.012, y1_ - y0_, b_ - a, bevel=0.004, seg=1), "Wood", C["white_paint"], T(side_s + 0.006, y0_, (a + b_) / 2))
# stair colliders: each tread as a box down to the floor (a solid flight)
for i in range(1, NR):
    y = GF + i * RISE; z0 = Z_STAIR + (i - 1) * GOING
    Cm.emit(box(STAIR_W, y - GF, GOING), "Plaster", ceil_c, T(STAIR_W / 2, GF, z0 + GOING / 2))
Cm.emit(box(STRINGER + 0.002, FF - GF, Z_TOP - Z_STAIR), "Plaster", ceil_c, T(STAIR_W + STRINGER / 2, GF, (Z_STAIR + Z_TOP) / 2))
# balustrade: newel, handrail along the pitch, balusters (two per tread), then the landing rail round the void
RAIL_H = 0.9
newel = K.lathe([(0.055, 0), (0.055, 0.12), (0.045, 0.16), (0.042, 0.85), (0.05, 0.9), (0.06, 0.98), (0.045, 1.02), (0.02, 1.08), (0.0, 1.1)], seg=16)
Bm.emit(xform(newel, Matrix.Identity(4)), "Wood", OAK, T(STAIR_W + STRINGER / 2, GF, Z_STAIR + 0.06))
rail_prof = [(0.03 * math.cos(a), 0.024 * math.sin(a)) for a in [k * math.pi / 6 for k in range(13)]]
def rail_y(z): return GF + RISE * (1 + (z - Z_STAIR) / GOING) + RAIL_H
p0 = (STAIR_W + STRINGER / 2, rail_y(Z_STAIR + 0.1) - 0.05, Z_STAIR + 0.1); p1 = (STAIR_W + STRINGER / 2, rail_y(Z_TOP), Z_TOP)
L = math.dist(p0, p1); ang2 = math.degrees(math.atan2(p1[1] - p0[1], p1[2] - p0[2]))
Bm.emit(K.lathe([(0.028, 0), (0.028, L)], seg=10, cap_top=True, cap_bottom=True, sz=0.85), "Wood", OAK, T(*p0, rx=90 - ang2))
for i in range(1, NR):
    for k in (0.25, 0.75):
        z = Z_STAIR + (i - 1 + k) * GOING
        yb = GF + i * RISE; yt = rail_y(z) - 0.02
        bal = K.lathe([(0.016, 0), (0.016, 0.06), (0.011, 0.1), (0.014, (yt - yb) * 0.45), (0.011, (yt - yb) * 0.55), (0.011, yt - yb - 0.05), (0.016, yt - yb)], seg=8)
        Bm.emit(bal, "Wood", C["white_paint"], T(STAIR_W + STRINGER / 2, yb, z))
# landing rail along the void edge (s = STAIR_W + STRINGER, z from VOID_Z0 to Z_TOP), balusters every 11 cm
rs = STAIR_W + STRINGER + 0.03
Bm.emit(K.lathe([(0.03, 0), (0.03, Z_TOP - VOID_Z0)], seg=10, cap_top=True, cap_bottom=True, sz=0.85), "Wood", OAK, T(rs, FF + 0.95, VOID_Z0, rx=90))
Bm.emit(box(0.05, 0.06, Z_TOP - VOID_Z0, bevel=0.01, seg=1), "Wood", C["white_paint"], T(rs, FF, (VOID_Z0 + Z_TOP) / 2))
nb = int((Z_TOP - VOID_Z0) / 0.11)
for k in range(1, nb):
    z = VOID_Z0 + (Z_TOP - VOID_Z0) * k / nb
    Bm.emit(K.lathe([(0.013, 0), (0.013, 0.05), (0.01, 0.1), (0.012, 0.45), (0.01, 0.8), (0.013, 0.89)], seg=8), "Wood", C["white_paint"], T(rs, FF + 0.06, z))
Cm.emit(box(0.06, 1.0, Z_TOP - VOID_Z0), "Plaster", ceil_c, T(rs, FF, (VOID_Z0 + Z_TOP) / 2))
# the flight's handrail as a collider (a tall thin box along the pitch, so nobody walks off the open side)
Cm.emit(box(0.06, 1.0, L), "Plaster", ceil_c, T(STAIR_W + STRINGER / 2, GF + RISE + 0.0, Z_STAIR + 0.05, rx=-ang2) )

# ------------------------------------------------------------------------------------------------ skirting, cornices, ceiling roses
SKIRT = [(0.0, 0.0), (0.018, 0.0), (0.018, 0.11), (0.012, 0.13), (0.008, 0.15), (0.0, 0.155)]
CORNICE = [(0.0, -0.16), (0.012, -0.15), (0.02, -0.12), (0.035, -0.1), (0.055, -0.08), (0.09, -0.04), (0.12, -0.012), (0.13, 0.0)]
def openings_on(lev, axis, at):
    """Door / window intervals on the wall line (for skirting gaps)."""
    out = []
    for (l, ax, a, a0, a1, opens) in PARTS:
        if l != lev or ax != axis: continue
        if abs(a - at) < 0.02 or abs(a + PT - at) < 0.02: out += [(o[0], o[1]) for o in opens]
    if axis == "z" and lev == 0 and abs(at - ZF_IN) < 0.02: out += [(o["s0"], o["s1"]) for o in F_OPEN if o["kind"] == "door"]
    return out
for r in ROOMS:
    name, lev, s0, s1, z0, z1, flo, wc = r
    y0, y1 = WALL_CEIL[lev]
    edges = [("z", z0, s0, s1, +1), ("s", s1, z0, z1, -1), ("z", z1, s1, s0, -1), ("s", s0, z1, z0, +1)]
    for (axis, at, a, b_, nrm) in edges:
        if name == "corridor" and axis == "s" and abs(at - s0) < 1e-3: continue          # the void side: the rail
        if name == "landing" and axis == "z" and abs(at - z0) < 1e-3: continue            # the stair arrives here
        if name == "hall" and axis == "s" and abs(at - s0) < 1e-3: continue               # the stair side
        gaps = sorted(openings_on(lev, axis, at))
        lo, hi = min(a, b_), max(a, b_)
        cur = lo; runs = []
        for (g0, g1) in gaps:
            if g1 <= lo or g0 >= hi: continue
            if g0 > cur: runs.append((cur, g0))
            cur = max(cur, g1)
        if cur < hi: runs.append((cur, hi))
        for (u0, u1) in runs:
            if u1 - u0 < 0.05: continue
            if axis == "z": path = [(u0, y0, at), (u1, y0, at)] if nrm > 0 else [(u1, y0, at), (u0, y0, at)]
            else: path = [(at, y0, u1), (at, y0, u0)] if nrm > 0 else [(at, y0, u0), (at, y0, u1)]
            Bm.emit(K.sweep(SKIRT, path), "Wood", C["white_paint"])
    if name in ("salon", "kitchen", "bedroom", "hall"):
        path = [(s0, y1, z0), (s1, y1, z0), (s1, y1, z1), (s0, y1, z1)]
        Bm.emit(K.sweep([(a, b_) for (a, b_) in CORNICE], path[::-1], closed=True), "Plaster", ceil_c)

# ------------------------------------------------------------------------------------------------ furniture
def put(parts, s, y, z, ry=0, solid=True, box_pad=0.0):
    """Place a furniture piece (its frame: x right, z forward) at plan (s, y, z) turned ry degrees; register its box
    as a collider."""
    M = T(s, y, z, ry=ry)
    lo = Vector((1e9, 1e9, 1e9)); hi = Vector((-1e9, -1e9, -1e9))
    for bm, mat, cl in parts:
        for v in bm.verts:
            p = M @ v.co
            lo = Vector(map(min, lo, p)); hi = Vector(map(max, hi, p))
        Bm.emit(bm, mat, cl, M, skip_down=True)
    if solid:
        c = (lo + hi) / 2; d = hi - lo
        Cm.emit(box(d.x + box_pad, d.y, d.z + box_pad), "Plaster", ceil_c, T(c.x, lo.y, c.z))
    return lo, hi
def light(name, s, y, z, watts, colour=(1.0, 0.78, 0.52), radius=0.05):
    LIGHTS.append((name, ms((s, y, z)), watts, colour, radius))

# salon
SAL = next(r for r in ROOMS if r[0] == "salon"); s0, s1, z0, z1 = SAL[2], SAL[3], SAL[4], SAL[5]
fz = rnd.uniform(2.6, 3.1)
put(K.fireplace(seed=SEED), s1 - 0.15, GF, fz, ry=-90)
put(K.mirror(1.05, 1.25), s1 - 0.005, GF + 1.2 + 0.02, fz, ry=-90, solid=False)
sofa_c = rnd.choice([fabric(0x55644F, "velvet"), fabric(0x7B6A55, "weave"), fabric(0x3E4E5E, "velvet"), fabric(0x8C8274, "linen")])
put(K.sofa(2.05, 0.9, sofa_c, seats=3, seed=SEED), s0 + 0.48, GF, fz, ry=90)
put(K.coffee_table(1.0, 0.55), (s0 + s1) / 2 + 0.05, GF, fz, ry=90)
put(K.rug(1.7, 2.3, fabric(rnd.choice([0x7A3B32, 0x3F4D63, 0x8A6A3E]), "rug")), (s0 + s1) / 2 + 0.05, GF, fz, ry=90, solid=False)
put(K.armchair(fabric(rnd.choice([0x8A4B3A, 0xA88A5A, 0x51606E]), "velvet"), seed=SEED), s1 - 0.75, GF, z0 + 0.78, ry=-145)
put(K.floor_lamp(), s0 + 0.32, GF, fz - 1.3)
light("salon_floor_lamp", s0 + 0.32, GF + 1.5, fz - 1.3, 45, radius=0.06)
put(K.bookcase(1.15, 2.1, 0.32, seed=SEED + 1), s1 - 0.17, GF, z1 - 0.75, ry=-90)
F_SALON = next(o for o in F_OPEN if o["kind"] == "window" and o["floor"] == 0)
put(K.radiator(F_SALON["s1"] - F_SALON["s0"] - 0.1, 0.6), (F_SALON["s0"] + F_SALON["s1"]) / 2, GF, ZF_IN + 0.1, solid=True)
put(K.plant(1.35, 0.19, seed=SEED + 2, kind="monstera"), s1 - 0.32, GF, z0 + 0.4 + 0.0)
put(K.curtain_pair(F_SALON["s1"] - F_SALON["s0"], F_SALON["h1"] + 0.12 - GF - 0.02, fabric(rnd.choice([0xB79C7A, 0x7E8B6E, 0xA35A4A]), "linen"), seed=SEED), (F_SALON["s0"] + F_SALON["s1"]) / 2, F_SALON["h1"] + 0.14, ZF_IN + 0.1, solid=False)
put(K.picture(0.9, 0.65, C["brass"], fabric(0x5B6E6A, "canvas")), s0 + 0.012, GF + 1.75, fz, ry=90, solid=False)
put(K.picture(0.42, 0.55, C["black_wood"], fabric(0x9A7A4E, "canvas")), s1 - 0.012, GF + 1.6, z1 - 1.6 - 0.0, ry=-90, solid=False) if False else None
put(K.table_lamp(), s1 - 0.17, GF + 2.1, z1 - 1.05, solid=False)
put(K.ceiling_rose(0.34), (s0 + s1) / 2, GF_CEIL, fz, solid=False)
put(K.pendant(0.75, "bowl"), (s0 + s1) / 2, GF_CEIL, fz, solid=False)
light("salon_pendant", (s0 + s1) / 2, GF_CEIL - 0.85, fz, 25, radius=0.06)
PROBES.append(("salon", s0, s1, z0, z1, GF, GF_CEIL))

# hall
HAL = next(r for r in ROOMS if r[0] == "hall"); s0, s1, z0, z1 = HAL[2], HAL[3], HAL[4], HAL[5]
put(K.coat_rack(0.8), s1 - 0.01, GF, z0 + 1.6, ry=-90, solid=True, box_pad=-0.1)
put(K.radiator(0.7, 0.62), s1 - 0.1, GF, z0 + 2.75, ry=-90)
put(K.pendant(0.55, "lantern"), (STAIR_W + s1) / 2, GF_CEIL, z0 + 0.9, solid=False)
light("hall_lantern", (STAIR_W + s1) / 2, GF_CEIL - 0.75, z0 + 0.9, 30)
put(K.rug(0.75, 2.2, fabric(0x6A3A2C, "rug2")), (STAIR_W + STRINGER + s1) / 2, GF, z0 + 2.9, solid=False)
put(K.picture(0.5, 0.65, C["black_wood"], fabric(0x8A7A5E, "canvas")), s1 - 0.012, GF + 1.6, z0 + 3.4 - 0.0, ry=-90, solid=False) if False else None

# kitchen-dining
KIT = next(r for r in ROOMS if r[0] == "kitchen"); s0, s1, z0, z1 = KIT[2], KIT[3], KIT[4], KIT[5]
kwood = rnd.choice([col(0x6E8270, "Wood", "painted"), col(0xE4DED0, "Wood", "painted"), col(0x3E4A55, "Wood", "painted")])
ktop = rnd.choice([C["worktop"], C["marble_white"], col(0x6B5038, "Wood", "oak")])
ktop = ktop if ktop[3] < 0.3 or True else ktop
put(K.fridge(0.6, 1.85), s0 + 0.31, GF, z0 + 0.34, ry=90)
runs = [(z0 + 0.66, 1.2, dict(drawers=True)), (z0 + 1.86, 0.6, dict(oven=True, hob=True)), (z0 + 2.46, 0.6, dict()), (z0 + 3.06, 1.2, dict(sink=True))]
zc = z0 + 0.66
for (za, w, kw) in runs:
    put(K.kitchen_base(w, kwood, ktop, **kw), s0 + 0.3, GF, za + w / 2, ry=90)
z_end = z0 + 3.06 + 1.2
put(K.kitchen_wall(1.2, kwood), s0 + 0.17, GF + 1.45, z0 + 1.26, ry=90, solid=False)
put(K.kitchen_wall(1.2, kwood), s0 + 0.17, GF + 1.45, z0 + 3.66, ry=90, solid=False)
put(K.hood(0.6), s0 + 0.3, GF + 1.6, z0 + 2.16, ry=90, solid=False)
# splashback tiles behind the worktop
for (za, zb) in ((z0 + 0.66, z_end),):
    Bm.emit(box(0.008, 0.55, zb - za, bevel=0.0), "Hard", rnd.choice([C["tiles_white"], C["tiles_green"]]), T(s0 + 0.004, GF + 0.9, (za + zb) / 2))
dt_s = s0 + rnd.uniform(3.35, 3.6) + (WI - 5.36) * 0.5
dt_z = (z0 + z1) / 2 + 0.25
put(K.dining_table(1.6, 0.9), dt_s, GF, dt_z, ry=90)
for k, (cs, cz, ry) in enumerate(((dt_s - 0.62, dt_z - 0.4, 90), (dt_s - 0.62, dt_z + 0.4, 90), (dt_s + 0.62, dt_z - 0.4, -90), (dt_s + 0.62, dt_z + 0.4, -90), (dt_s, dt_z + 1.05, 180))):
    put(K.chair(), cs + rnd.uniform(-0.04, 0.04), GF, cz + rnd.uniform(-0.04, 0.04), ry=ry + rnd.uniform(-7, 7))
put(K.pendant(0.95, "dome"), dt_s, GF_CEIL, dt_z, solid=False)
light("dining_pendant", dt_s, GF_CEIL - 1.12, dt_z, 55, radius=0.04)
light("kitchen_spot", s0 + 0.9, GF_CEIL - 0.1, z0 + 2.3, 30, radius=0.1)
put(K.ceiling_rose(0.28), dt_s, GF_CEIL, dt_z, solid=False)
put(K.dresser(1.3, 1.95, 0.45), s1 - 0.23, GF, z0 + 1.0, ry=-90)
for o in B_OPEN:
    if o["floor"] != 0: continue
    put(K.radiator(o["s1"] - o["s0"] - 0.1, 0.6), (o["s0"] + o["s1"]) / 2, GF, ZB_IN - 0.1, ry=180)
    put(K.sheer(o["s1"] - o["s0"] - 0.14, 0.75), (o["s0"] + o["s1"]) / 2, o["h0"] + 0.85, ZB_IN - 0.21, ry=180, solid=False)
    put(K.plant(0.28, 0.07, seed=SEED + 5 + int(o["s0"] * 10)), (o["s0"] + o["s1"]) / 2 + 0.3, o["h0"] + 0.025, ZB_IN - 0.24, solid=False)
put(K.picture(0.7, 0.5, C["oak"], fabric(0xA8603A, "canvas")), s1 - 0.012, GF + 1.75, z0 + 2.6, ry=-90, solid=False)
PROBES.append(("kitchen", s0, s1, z0, z1, GF, GF_CEIL))
PROBES.append(("hall", HAL[2], HAL[3], HAL[4], HAL[5], GF, GF_CEIL))

# bedroom (+ the alcove over the hall)
BED = next(r for r in ROOMS if r[0] == "bedroom"); s0, s1, z0, z1 = BED[2], BED[3], BED[4], BED[5]
bz = rnd.uniform(3.2, 3.6)
put(K.bed(1.6, 2.05, seed=SEED), s1 - 1.06, FF, bz, ry=-90)
for dz in (-1.08, 1.08):
    put(K.bedside(), s1 - 0.24, FF, bz + dz, ry=-90)
    put(K.table_lamp(h=0.42), s1 - 0.24, FF + 0.56, bz + dz, solid=False)
    light("bed_lamp_%d" % (dz > 0), s1 - 0.24, FF + 0.56 + 0.3, bz + dz, 14, radius=0.04)
put(K.wardrobe(1.9 if z1 - 4.6 > 2.0 else 1.5, 2.15, 0.6), s0 + 0.31, FF, z1 - 1.08, ry=90)
put(K.rug(1.4, 2.0, fabric(rnd.choice([0xC8B9A0, 0x6E7F8A]), "rug2")), s1 - 2.5, FF, bz, ry=90, solid=False)
F_BED = [o for o in F_OPEN if o["floor"] == 1]
for o in F_BED:
    put(K.radiator(o["s1"] - o["s0"] - 0.1, 0.6), (o["s0"] + o["s1"]) / 2, FF, ZF_IN + 0.1)
    put(K.curtain_pair(o["s1"] - o["s0"], o["h1"] + 0.12 - FF - 0.02, fabric(rnd.choice([0x8E9AA3, 0xC9B79A, 0x6D5A6E]), "linen"), seed=SEED + 3), (o["s0"] + o["s1"]) / 2, o["h1"] + 0.14, ZF_IN + 0.1, solid=False)
put(K.picture(0.8, 0.55, C["oak_light"], fabric(0x8BA0A8, "canvas")), s1 - 0.012, FF + 1.55, bz, ry=-90, solid=False)
put(K.ceiling_rose(0.3), (s0 + s1) / 2, FF_CEIL, (z0 + z1) / 2, solid=False)
put(K.pendant(0.6, "drum"), (s0 + s1) / 2, FF_CEIL, (z0 + z1) / 2, solid=False)
ALC = next(r for r in ROOMS if r[0] == "alcove")
put(K.desk(1.05, 0.5, C["walnut"]), (F_BED[0]["s0"] + F_BED[0]["s1"]) / 2 if F_BED else 1.2, FF, ZF_IN + 0.27, ry=180)
put(K.chair(), (F_BED[0]["s0"] + F_BED[0]["s1"]) / 2 + 0.1 if F_BED else 1.2, FF, ZF_IN + 0.85, ry=180 + rnd.uniform(-15, 15))
put(K.plant(1.1, 0.16, seed=SEED + 9), ALC[2] + 0.3, FF, ALC[5] - 0.35)
PROBES.append(("bedroom", s0, s1, z0, z1, FF, FF_CEIL))
PROBES.append(("alcove", ALC[2], ALC[3], ALC[4], ALC[5], FF, FF_CEIL))

# bathroom
BAT = next(r for r in ROOMS if r[0] == "bathroom"); s0, s1, z0, z1 = BAT[2], BAT[3], BAT[4], BAT[5]
put(K.bathtub(1.7, 0.75), s1 - 0.85, FF, z1 - 0.38)
put(K.washbasin(0.8, 0.48), s1 - 0.25, FF, z0 + 1.1, ry=-90)
put(K.mirror(0.7, 0.8, C["steel"]), s1 - 0.005, FF + 1.05, z0 + 1.1, ry=-90, solid=False)
put(K.toilet(), s0 + 0.35, FF, z1 - 1.5, ry=90)
put(K.towel_rail(0.5, 0.9), s0 + 0.04, FF, z0 + 1.45, ry=90, solid=False)
# wall tiles to 1.5 m on the four walls (a 7 mm layer)
tc = rnd.choice([C["tiles_white"], C["tiles_green"]])
for (axis, at, a, b_, nrm) in (("z", z0, s0, s1, 1), ("s", s1, z0, z1, -1), ("z", z1, s0, s1, -1), ("s", s0, z0, z1, 1)):
    gaps = [(7.00, 7.80)] if axis == "s" and abs(at - s0) < 1e-3 else []
    cur = a; runs_ = []
    for (g0, g1) in gaps:
        if g0 > cur: runs_.append((cur, g0)); cur = g1
    runs_.append((cur, b_))
    for (u0, u1) in runs_:
        if axis == "z": Bm.emit(box(u1 - u0, 1.5, 0.007), "Hard", tc, T((u0 + u1) / 2, FF, at + nrm * 0.0035))
        else: Bm.emit(box(0.007, 1.5, u1 - u0), "Hard", tc, T(at + nrm * 0.0035, FF, (u0 + u1) / 2))
light("bath_ceiling", (s0 + s1) / 2, FF_CEIL - 0.05, (z0 + z1) / 2, 0, radius=0.12)        # off at night
put(K.pendant(0.25, "bowl"), (s0 + s1) / 2, FF_CEIL, (z0 + z1) / 2, solid=False)
PROBES.append(("bathroom", s0, s1, z0, z1, FF, FF_CEIL))

# study
STU = next(r for r in ROOMS if r[0] == "study"); s0, s1, z0, z1 = STU[2], STU[3], STU[4], STU[5]
bw_ = next((o for o in B_OPEN if o["floor"] == 1 and o["s1"] < WI / 2 + 0.5), None)
dsk = (bw_["s0"] + bw_["s1"]) / 2 if bw_ else (s0 + s1) / 2
put(K.desk(1.1, 0.55, C["oak"]), dsk, FF, z1 - 0.3, ry=0)
put(K.chair(), dsk, FF, z1 - 0.95, ry=rnd.uniform(-20, 20))
put(K.desk_lamp(), dsk - 0.38, FF + 0.75, z1 - 0.38, ry=200, solid=False)
light("study_lamp", dsk - 0.3, FF + 1.15, z1 - 0.3, 12, radius=0.03)
put(K.bookcase(1.0, 2.0, 0.3, seed=SEED + 4), s0 + 0.16, FF, z0 + 0.75, ry=90)
put(K.rug(1.2, 1.6, fabric(0x5E4A3A, "rug")), (s0 + s1) / 2, FF, (z0 + z1) / 2, solid=False)
put(K.pendant(0.5, "drum", col(0xE9DCC0, "Glow", "shade")), (s0 + s1) / 2, FF_CEIL, (z0 + z1) / 2, solid=False)
PROBES.append(("study", s0, s1, z0, z1, FF, FF_CEIL))

# landing + corridor
LAN = next(r for r in ROOMS if r[0] == "landing"); s0, s1, z0, z1 = LAN[2], LAN[3], LAN[4], LAN[5]
put(K.pendant(0.4, "lantern"), (s0 + s1) / 2, FF_CEIL, (z0 + z1) / 2 + 0.2, solid=False)
light("landing", (s0 + s1) / 2, FF_CEIL - 0.6, (z0 + z1) / 2 + 0.2, 22)
put(K.picture(0.55, 0.7, C["black_wood"], fabric(0x3D4A5A, "canvas")), s0 + 0.012, FF + 1.55, (z0 + z1) / 2 + 0.3, ry=90, solid=False)
put(K.radiator(0.6, 0.55), s0 + 0.1, FF, z1 - 0.55, ry=90)
COR = next(r for r in ROOMS if r[0] == "corridor")
put(K.rug(0.65, (COR[5] - COR[4]) - 0.5, fabric(0x4A5A6A, "rug2")), (COR[2] + COR[3]) / 2 + 0.05, FF, (COR[4] + COR[5]) / 2, solid=False)
PROBES.append(("landing", s0, s1, VOID[2], z1, FF, FF_CEIL))

# a street lamp outside the front at night (through the front windows), a moon/sky ambient
light("street_lamp", WI * 0.55, 5.5, -5.0, 220, colour=(1.0, 0.62, 0.32), radius=0.15)

# ------------------------------------------------------------------------------------------------ the surroundings (bake only)
for c in spec.get("context", []):
    for ring_ in c["rings"][:1]:
        pts = [(s_of(x, z), z) for (x, z) in ring_]
        if MIRROR: pts = [(WI - s, z) for (s, z) in pts]
        y0, y1 = c["base"] - spec["base"], c["top"] - spec["base"]
        n = len(pts)
        area = sum(pts[i][0] * pts[(i + 1) % n][1] - pts[(i + 1) % n][0] * pts[i][1] for i in range(n))
        for i in range(n):
            a, b_ = pts[i], pts[(i + 1) % n]
            q = [(a[0], y0, a[1]), (b_[0], y0, b_[1]), (b_[0], y1, b_[1]), (a[0], y1, a[1])]
            OCC.quad(*(q if area > 0 else q[::-1]), "Plaster", C["brick"])
        OCC.poly([(p[0], y1, p[1]) for p in (pts if area < 0 else pts[::-1])], "Plaster", C["brick"])
gg = spec["groundGrid"]
for j in range(gg["n"] - 1):
    for i in range(gg["n"] - 1):
        def gp(ii, jj):
            x = gg["x0"] + ii * gg["step"]; z = gg["z0"] + jj * gg["step"]
            s = s_of(x, z); return ((WI - s) if MIRROR else s, gg["y"][jj * gg["n"] + ii] - 0.02, z)
        a, b_, c_, d = gp(i, j), gp(i + 1, j), gp(i + 1, j + 1), gp(i, j + 1)
        OCC.quad(a, d, c_, b_, "Hard", col(0x4A4845, "Hard", "enamel")) if not MIRROR else OCC.quad(a, b_, c_, d, "Hard", col(0x4A4845, "Hard", "enamel"))
print(f"geometry: interior {B.tris} tris, door {DOOR.tris}, glass {GLASS.tris}, colliders {COL.tris}, occluders {OCC.tris}  ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ Blender objects
for o in list(bpy.data.objects): bpy.data.objects.remove(o)
scn = bpy.context.scene
mats = {}
def bake_mat(name):
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; bs = nt.nodes["Principled BSDF"]
    at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "Col"
    nt.links.new(at.outputs["Color"], bs.inputs["Base Color"])
    bs.inputs["Roughness"].default_value = {"Hard": 0.35, "Glass": 0.05}.get(name, 0.75)
    if name == "Glass":
        bs.inputs["Transmission Weight"].default_value = 1.0
    if name == "Glow":
        nt.links.new(at.outputs["Color"], bs.inputs["Emission Color"])
        bs.inputs["Emission Strength"].default_value = 0.0
    mats[name] = m
    return m
for n in K.MATS + ["Collider"]: bake_mat(n)

def mesh_from(bl, name, link=True):
    """Builder -> mesh object (Blender frame), Col (corner colours), UVMap (UV0), materials."""
    verts = [to_local(p) for p in bl.v]
    verts = [(x, -z, y) for (x, y, z) in verts]
    me = bpy.data.meshes.new(name)
    me.from_pydata(verts, [], bl.f)
    me.update()
    used = sorted(set(bl.fm))
    for n in K.MATS: me.materials.append(mats[n])
    me.polygons.foreach_set("material_index", bl.fm)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cd = []
    for c in bl.fc:
        pass
    for fi, poly in enumerate(me.polygons):
        c = bl.fc[fi]
        for _ in poly.loop_indices: cd.extend(c)
    ca.data.foreach_set("color", cd)
    uv = me.uv_layers.new(name="UVMap")
    ud = []
    for fi, poly in enumerate(me.polygons):
        for k in range(poly.loop_total): ud.extend(bl.fuv[fi][k])
    uv.data.foreach_set("uv", ud)
    ob = bpy.data.objects.new(name, me)
    if link: scn.collection.objects.link(ob)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free()
    me.shade_smooth(); me.set_sharp_from_angle(angle=math.radians(35))
    me.validate()
    return ob

ob_int = mesh_from(B, "Interior")
ob_door = mesh_from(DOOR, "FrontDoor")
ob_glass = mesh_from(GLASS, "Glass")
ob_occ = mesh_from(OCC, "Occluders")
ob_col = mesh_from(COL, "Colliders")
for o in (ob_col,): o.data.materials.clear(); o.data.materials.append(mats["Collider"])
ob_col.hide_render = True
tri = lambda o: sum(len(p.vertices) - 2 for p in o.data.polygons)
print(f"objects: Interior {tri(ob_int)} tris, FrontDoor {tri(ob_door)}, Glass {tri(ob_glass)}, Colliders {tri(ob_col)}  ({time.time() - T0:.1f}s)")

# lightmap UVs: Interior + FrontDoor share one atlas (multi-object edit mode)
for o in (ob_int, ob_door):
    lm = o.data.uv_layers.new(name="Lightmap"); o.data.uv_layers.active = lm
for o in scn.objects: o.select_set(False)
ob_int.select_set(True); ob_door.select_set(True); bpy.context.view_layer.objects.active = ob_int
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(52), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
bpy.ops.uv.average_islands_scale()
try: bpy.ops.uv.pack_islands(rotate=True, margin=0.0028, shape_method="AABB")
except Exception as e:
    print("pack_islands:", e); bpy.ops.uv.pack_islands(rotate=True, margin=0.0028)
bpy.ops.object.mode_set(mode="OBJECT")
for o in (ob_int, ob_door): o.data.uv_layers.active = o.data.uv_layers["UVMap"]
print(f"lightmap UVs packed ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ bake
scn.render.engine = "CYCLES"
prefs = bpy.context.preferences.addons["cycles"].preferences
try:
    prefs.compute_device_type = "OPTIX"; prefs.get_devices()
    for d in prefs.devices: d.use = d.type == "OPTIX"
    scn.cycles.device = "GPU"
except Exception as e:
    print("GPU unavailable, CPU bake:", e); scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.use_nodes = True
wbg = scn.world.node_tree.nodes["Background"]
lamp_objs = []
for (name, p, watts, colour, radius) in LIGHTS:
    ld = bpy.data.lights.new(name, "POINT"); ld.energy = watts; ld.color = colour; ld.shadow_soft_size = radius
    lo = bpy.data.objects.new(name, ld)
    x, y, z = to_local(p); lo.location = (x, -z, y)
    scn.collection.objects.link(lo); lamp_objs.append(lo)

def set_mode(mode):
    """DAY: a bright sky (overcast-ish, a bit bluer at the top), no lamps. NIGHT: a dark blue sky, the lamps on, shades
    glowing."""
    for lo in lamp_objs: lo.hide_render = mode != "night" or lo.data.energy <= 0
    nt = scn.world.node_tree
    for n in list(nt.nodes):
        if n.type in ("TEX_SKY", "TEX_GRADIENT", "MAPPING", "TEX_COORD", "VALTORGB", "MIX_RGB", "SEPXYZ", "SEPARATE_XYZ", "MAP_RANGE"): nt.nodes.remove(n)
    if mode == "day":
        # sky radiance: zenith 0.8 blue-white, horizon 1.1 (relative units; the viewer scales it to the city sky)
        tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); mr = nt.nodes.new("ShaderNodeMapRange")
        ramp = nt.nodes.new("ShaderNodeValToRGB")
        nt.links.new(tc.outputs["Generated"], sep.inputs[0])
        nt.links.new(tc.outputs["Normal"], sep.inputs[0])
        mr.inputs["From Min"].default_value = -0.1; mr.inputs["From Max"].default_value = 1.0
        nt.links.new(sep.outputs["Z"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
        ramp.color_ramp.elements[0].color = (1.05, 1.04, 1.0, 1); ramp.color_ramp.elements[1].color = (0.55, 0.68, 0.95, 1)
        nt.links.new(ramp.outputs["Color"], wbg.inputs["Color"]); wbg.inputs["Strength"].default_value = 1.0
    else:
        for l in list(nt.links):
            if l.to_node == wbg: nt.links.remove(l)
        wbg.inputs["Color"].default_value = (0.012, 0.018, 0.035, 1); wbg.inputs["Strength"].default_value = 1.0
    gm = mats["Glow"].node_tree.nodes["Principled BSDF"]
    gm.inputs["Emission Strength"].default_value = 0.6 if mode == "night" else 0.0

import numpy as np
def encode_rgbm(img, path, rng=4.0):
    """Float lightmap -> RGBM PNG, gamma 2: v = sqrt(lin) / rng; m = max(v) rounded up to 1/255; rgb = v / m."""
    w, h = img.size
    a = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    lin = np.clip(a[..., :3], 0, None)
    # a light 3x3 cross-bilateral denoise inside charts (alpha > 0): range weight on luminance
    mask = a[..., 3:4] > 0.5
    v = np.sqrt(lin) / rng
    out = v.copy()
    lum = v.mean(axis=2, keepdims=True)
    acc = v * 1.0; wsum = np.ones_like(lum)
    for dy in (-1, 0, 1):
        for dx in (-1, 0, 1):
            if dx == 0 and dy == 0: continue
            sv = np.roll(np.roll(v, dy, 0), dx, 1); sl = np.roll(np.roll(lum, dy, 0), dx, 1); sm = np.roll(np.roll(mask, dy, 0), dx, 1)
            wgt = np.exp(-((sl - lum) ** 2) / (2 * 0.012 ** 2)) * sm * 0.6
            acc += sv * wgt; wsum += wgt
    out = np.where(mask, acc / wsum, v)
    m = np.clip(np.ceil(out.max(axis=2, keepdims=True) * 255) / 255, 1 / 255, 1)
    rgb = np.clip(out / m, 0, 1)
    px = np.concatenate([rgb, m], axis=2).astype(np.float32)
    im = bpy.data.images.new(os.path.basename(path), w, h, alpha=True, float_buffer=False)
    im.colorspace_settings.name = "Non-Color"; im.alpha_mode = "STRAIGHT"
    im.pixels.foreach_set(px.ravel())
    im.filepath_raw = path; im.file_format = "PNG"
    scn.render.image_settings.color_mode = "RGBA"; scn.render.image_settings.color_depth = "8"
    im.save()
    print("wrote", path, os.path.getsize(path) // 1024, "KB; max", float(lin.max()), "mean", float(lin[mask[..., 0]].mean()) if mask.any() else 0)

if BAKE:
    img = bpy.data.images.new("lm", LM, LM, alpha=True, float_buffer=True)
    for n in K.MATS:
        nt = mats[n].node_tree
        tn = nt.nodes.new("ShaderNodeTexImage"); tn.image = img; tn.name = "LM"; nt.nodes.active = tn
    ob_glass.hide_render = True
    scn.cycles.samples = SAMPLES
    scn.cycles.max_bounces = 6; scn.cycles.diffuse_bounces = 5
    scn.render.bake.margin = 6; scn.render.bake.margin_type = "EXTEND"
    for mode in ("day", "night"):
        set_mode(mode)
        t = time.time()
        for o in scn.objects: o.select_set(False)
        ob_int.select_set(True); ob_door.select_set(True); bpy.context.view_layer.objects.active = ob_int
        for o in (ob_int, ob_door): o.data.uv_layers.active = o.data.uv_layers["Lightmap"]
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, uv_layer="Lightmap", margin=6, use_clear=True, target="IMAGE_TEXTURES")
        print(f"bake {mode}: {time.time() - t:.1f}s")
        encode_rgbm(img, os.path.join(HOUSE, f"lm_{mode}.png"))
    for o in (ob_int, ob_door): o.data.uv_layers.active = o.data.uv_layers["UVMap"]
    for n in K.MATS: mats[n].node_tree.nodes.remove(mats[n].node_tree.nodes["LM"])
    ob_glass.hide_render = False

# ------------------------------------------------------------------------------------------------ previews (Cycles renders of the rooms)
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    scn.render.resolution_x, scn.render.resolution_y = 1280, 720
    scn.cycles.samples = PV_SAMPLES; scn.cycles.use_denoising = True
    scn.render.image_settings.file_format = "PNG"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.look = "AgX - Medium High Contrast"
    def shot(name, eye, at, lens=18, mode="day", exposure=0.0):
        set_mode(mode)
        e = to_local(ms(eye)); a = to_local(ms(at))
        cam.location = (e[0], -e[2], e[1])
        d = Vector((a[0], -a[2], a[1])) - cam.location
        cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.view_settings.exposure = exposure
        scn.render.filepath = os.path.join(PREVIEW, f"blender_{name}.png")
        bpy.ops.render.render(write_still=True)
        print("preview", name)
    S = next(r for r in ROOMS if r[0] == "salon")
    shot("salon", (S[2] + 0.3, GF + 1.5, S[5] - 0.3), (S[3] - 0.6, GF + 1.0, S[4] + 1.6), 16, "day", 1.0)
    shot("salon_night", (S[2] + 0.3, GF + 1.5, S[5] - 0.3), (S[3] - 0.6, GF + 1.0, S[4] + 1.6), 16, "night", 2.0)
    Kt = next(r for r in ROOMS if r[0] == "kitchen")
    shot("kitchen", (Kt[3] - 0.4, GF + 1.6, Kt[4] + 0.3), (Kt[2] + 0.8, GF + 0.9, Kt[5] - 1.2), 16, "day", 1.0)
    shot("hall_stair", (S1 - 0.3, GF + 1.6, ZF_IN + 0.25), (0.6, GF + 1.8, Z_TOP), 16, "day", 1.2)
    Bd = next(r for r in ROOMS if r[0] == "bedroom")
    shot("bedroom", (Bd[2] + 0.3, FF + 1.6, Bd[5] - 0.3), (Bd[3] - 0.8, FF + 0.6, Bd[4] + 1.8), 16, "day", 1.0)
    Bt = next(r for r in ROOMS if r[0] == "bathroom")
    shot("bathroom", (Bt[2] + 0.3, FF + 1.6, Bt[4] + 0.3), (Bt[3] - 0.6, FF + 0.8, Bt[5] - 0.6), 14, "day", 1.0)

# ------------------------------------------------------------------------------------------------ export
for o in scn.objects: o.select_set(False)
ob_occ.hide_render = True
for o in (ob_int, ob_door, ob_glass, ob_col): o.select_set(True)
bpy.context.view_layer.objects.active = ob_int
# the front door's origin on its hinge (so the viewer turns it about y)
hp = to_local(ms(DOOR_INFO["hinge_plan"]))
hb = Vector((hp[0], -hp[2], hp[1]))
ob_door.data.transform(Matrix.Translation(-hb)); ob_door.location = hb
glb = os.path.join(HOUSE, "interior.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

# notes for the viewer
def plan_to_local_rect(s0, s1, z0, z1):
    return [list(to_local(ms((s, 0, z))))[0::2] for (s, z) in ((s0, z0), (s1, z0), (s1, z1), (s0, z1))]
info = {
    "house": spec["BU_ID"], "seed": SEED, "lightmap": {"size": LM, "encoding": "RGBM gamma 2: lin = (rgb * a * 4)^2", "day": "lm_day.png", "night": "lm_night.png",
                                                       "samples": SAMPLES, "day_sky": "zenith 0.55/0.68/0.95, horizon 1.05 (relative)", "night": [l[0] for l in LIGHTS if l[2] > 0]},
    "levels": {"gf": GF, "gf_ceiling": GF_CEIL, "ff": FF, "ff_ceiling": FF_CEIL, "stair": {"risers": NR, "rise": round(RISE, 4), "going": GOING}},
    "rooms": [{"name": r[0], "level": r[1], "rect": plan_to_local_rect(r[2], r[3], r[4], r[5]), "y": WALL_CEIL[r[1]]} for r in ROOMS],
    "probes": [{"name": p[0], "rect": plan_to_local_rect(p[1], p[2], p[3], p[4]), "y": [p[5], p[6]]} for p in PROBES],
    "frontDoor": {"hinge": list(hp), "width": DOOR_INFO["width"], "height": DOOR_INFO["height"], "opens": "about +y toward the inside (house local)",
                  "outside": [list(to_local(ms(((door["s0"] + door["s1"]) / 2, 0, -1.0))))]},
    "lights": [{"name": l[0], "pos": list(to_local(l[1])), "watts": l[2], "color": l[3]} for l in LIGHTS],
    "mirror": MIRROR, "spawn": {"outside": list(to_local(ms(((door["s0"] + door["s1"]) / 2, 0.0, -2.5)))), "yaw_into": 0.0},
    "inner": {"width": WI, "zf": ZF_IN, "zb": ZB_IN},
    "triangles": {"interior": tri(ob_int), "door": tri(ob_door), "glass": tri(ob_glass), "colliders": tri(ob_col)},
    "build_s": round(time.time() - T0, 1),
}
json.dump(info, open(os.path.join(HOUSE, "interior.json"), "w"), indent=1)
print(f"done in {time.time() - T0:.1f}s")
