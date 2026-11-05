"""FACETED CITY CARS: a family of generic European city cars in a hard-surface faceted style (flat planes with
deliberate facets and small chamfers), built entirely in code: no hand modelling, no real brand's design, no logos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/carFaceted.py -- models/cars
      models/cars/faceted.glb     one root node per car type (Body + Wheel_FL/FR/RL/RR), the CC0-pack contract of
                                  tools/cars/convertPacks.mjs: COLOR_0 (palette x baked AO) + _KIND, one material
    ... -- models/cars --preview docs/cars        also Cycles previews docs/cars/faceted_<id>_{front,rear}.png + lineup
    ... --only hatch_s,van_p   --no-bake   --samples 96

Car types (metres, length x width x height; wheelbase; tyre radius) - generic proportions of the European classes:
    hatch_s    small hatchback            4.00 x 1.74 x 1.46   WB 2.50  r 0.300   (Polo / Clio / 208 class)
    hatch_c    compact hatchback          4.30 x 1.80 x 1.46   WB 2.64  r 0.317   (Golf / 308 / Megane class)
    estate     estate                     4.62 x 1.80 x 1.48   WB 2.70  r 0.317
    saloon     saloon                     4.72 x 1.82 x 1.45   WB 2.80  r 0.325
    suv        small SUV / crossover      4.40 x 1.82 x 1.60   WB 2.64  r 0.345
    van_c      compact van                4.50 x 1.84 x 1.82   WB 2.72  r 0.320   (Kangoo / Berlingo class)
    van_p      panel van                  5.05 x 2.02 x 2.30   WB 3.25  r 0.345   (Trafic / Vivaro class)
    taxi       Brussels taxi (estate, black, yellow chequer band, licence number, amber-lit roof sign; keeps its livery)

How a body is built (car frame: x left, y up, z forward; the origin on the ground midway between the axles):
  - the TUB (everything under the belt line) is a stack of seven plan-view loops (underbody edge, sill / bumper bottom,
    sill top / lower bumper crease, lower-door character line / bumper middle, waist crease / bumper top, shoulder /
    lamp top, belt / bonnet edge), each loop the
    same points: the front fascia at fixed fractions of the half width (bowed and with rounded corners in plan), fixed
    side stations (axles, door seams), the rear fascia. Bands between loops are flat facets; the top is a crowned grid
    (bonnet, sill ledge, boot); door seams are real grooves (three stations, the middle one pushed in 5 mm).
  - wheel arches: exact booleans with faceted 14-sided cutters (a chamfer cone where they meet the side, so the arch
    edge catches light, then a well liner).
  - the GREENHOUSE is a stack of four plan rings (window sill, roof rail, roof edge, roof crown) on the sill ledge:
    windscreen, side windows and backlight are the ring bands, the pillars their chamfers; every window is inset into
    a rubber frame and recessed 1 cm; dark tinted glass (the viewer draws it see-through with alpha-to-coverage, so the
    interior shows: seats, headrests, dashboard, steering wheel, headliner).
  - each type has its own FASCIA and REAR (tables below the types): lamp span and height, grille width / height /
    slats / chrome surround, lower intake, corner intakes, skid plates; tail clusters (wide, vertical, L-shaped),
    garnish (gloss black or chrome), reflectors, diffuser with fins. A fuel flap on the right rear quarter.
  - lamps: recessed housings with inner reflector facets and projector cups (head), stepped red facets (tail);
    grilles with slats, Belgian-style plates (white, red characters, random, no real registration), mirrors, door
    handles, wipers, roof rails / fin, exhaust. Tyres: lathe with sidewall bulge, shoulder blocks and a tread groove;
    5-spoke faceted rims, brake disc and caliper behind.
  - AMBIENT OCCLUSION baked with Cycles to per-vertex attributes (ground plane and wheels as occluders), twice: over
    0.9 m (mass, ground, arches) and over 0.22 m (contact darkening in seams, sills, recesses), multiplied into COLOR_0. Paint vertices keep COLOR_0 as a shade (AO), the viewer multiplies the per-instance paint colour.
  - _KIND: 0 fixed colour, 1 paint, 2 head light, 3 tail light, 4 glass, 5 chrome / gloss, 6 rubber, 7 plate,
    8 interior (viewer/drive/carPacks.js packMaterial). No LODs here: the viewer makes them with meshoptimizer.
"""
import bpy, bmesh, math, os, sys, struct, json, random, time
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return ARGS[ARGS.index(name) + 1] if name in ARGS else default
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/cars")
PREVIEW = arg("--preview")
PREVIEW = os.path.abspath(PREVIEW) if PREVIEW else None
ONLY = set(arg("--only").split(",")) if arg("--only") else None
BAKE = "--no-bake" not in ARGS
SAMPLES = int(arg("--samples", "128"))
PV_SAMPLES = int(arg("--pv-samples", "48"))
os.makedirs(OUT, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ palette
# index = Blender material index = palette entry: (name, kind, linear rgb). Paint entries hold a SHADE (grey).
PAL = [
    ("paint", 1, (1, 1, 1)),
    ("paint_seam", 1, (0.22, 0.22, 0.22)),
    ("paint_dark", 1, (0.78, 0.78, 0.78)),
    ("trim", 0, (0.022, 0.022, 0.024)),          # black textured plastic
    ("rubber", 6, (0.010, 0.010, 0.011)),
    ("glass", 4, (0.018, 0.022, 0.026)),
    ("chrome", 5, (0.62, 0.63, 0.64)),
    ("housing", 5, (0.10, 0.10, 0.105)),         # lamp housings, gloss black pillars
    ("head", 2, (0.85, 0.86, 0.88)),
    ("tail", 3, (0.30, 0.012, 0.010)),
    ("tail_hi", 3, (0.62, 0.035, 0.025)),
    ("reverse", 0, (0.72, 0.72, 0.72)),
    ("amber", 0, (0.75, 0.30, 0.02)),
    ("plate", 7, (0.80, 0.80, 0.78)),
    ("plate_red", 0, (0.50, 0.015, 0.02)),
    ("plate_blue", 0, (0.010, 0.035, 0.22)),
    ("interior", 8, (0.030, 0.030, 0.032)),
    ("seat", 8, (0.055, 0.052, 0.050)),
    ("liner", 0, (0.012, 0.012, 0.013)),
    ("under", 0, (0.018, 0.018, 0.019)),
    ("tyre", 6, (0.020, 0.020, 0.021)),
    ("tyre_side", 6, (0.028, 0.028, 0.029)),
    ("rim", 0, (0.42, 0.43, 0.45)),             # painted alloy (a metal reads black under a dim sky)
    ("rim_dark", 0, (0.035, 0.035, 0.037)),
    ("disc", 5, (0.22, 0.22, 0.22)),
    ("caliper", 0, (0.10, 0.10, 0.11)),
    ("white", 0, (0.78, 0.78, 0.76)),
    ("sign", 2, (0.95, 0.55, 0.06)),            # taxi sign letters: amber, lit at night (head-light kind)
    ("skid", 0, (0.40, 0.41, 0.42)),            # SUV skid plates: brushed silver plastic
    ("taxi_yellow", 0, (0.80, 0.52, 0.02)),     # Brussels taxi chequer band and licence number
]
M = {n: i for i, (n, _, _) in enumerate(PAL)}
MATS = []
for name, kind, rgb in PAL:
    m = bpy.data.materials.new(name)
    MATS.append(m)

def smooth01(t):
    t = max(0.0, min(1.0, t)); return t * t * (3 - 2 * t)
def lerp(a, b, t): return a + (b - a) * t
def piecewise(z, knots):
    """knots: [(z, v)] with z DEcreasing (front to rear); linear in between, clamped."""
    if z >= knots[0][0]: return knots[0][1]
    for (z0, v0), (z1, v1) in zip(knots, knots[1:]):
        if z >= z1: return lerp(v0, v1, (z0 - z) / ((z0 - z1) or 1))
    return knots[-1][1]

# ------------------------------------------------------------------------------------------------ mesh builder
class MB:
    """bmesh in CAR coordinates (x left, y up, z forward) -> Blender (x, -z, y). Shared vertices by position."""
    def __init__(self):
        self.bm = bmesh.new(); self.vc = {}
    def v(self, p, share=True):
        k = (round(p[0], 5), round(p[1], 5), round(p[2], 5))
        if share and k in self.vc: return self.vc[k]
        bv = self.bm.verts.new((p[0], -p[2], p[1]))
        if share: self.vc[k] = bv
        return bv
    def face(self, pts, mat, share=True, out=None):
        """out: desired normal direction (car coords vector) or a point the face must look away from (('from', p))."""
        vs = []
        for p in pts:
            bv = self.v(p, share)
            if bv not in vs: vs.append(bv)
        if len(vs) < 3: return None
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return None
        f.material_index = mat
        if out is not None:
            f.normal_update()
            if isinstance(out, tuple) and len(out) == 2 and out[0] == "from":
                c = f.calc_center_median(); want = c - C(out[1])
            else:
                want = C(out)
            if f.normal.dot(want) < 0: f.normal_flip()
        return f
    def grid(self, P, matfn, wrap=False):
        out = {}
        nr, nc = len(P), len(P[0])
        for i in range(nr - 1):
            for j in range(nc if wrap else nc - 1):
                j1 = (j + 1) % nc
                f = self.face([P[i][j], P[i][j1], P[i + 1][j1], P[i + 1][j]], matfn(i, j))
                if f: out[(i, j)] = f
        return out
    def obj(self, name, recalc=True):
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
        if recalc: bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        me = bpy.data.meshes.new(name)
        bm.to_mesh(me); bm.free()
        for m in MATS: me.materials.append(m)
        o = bpy.data.objects.new(name, me)
        scn.collection.objects.link(o)
        return o

def C(p):   # car coords -> Blender vector
    return Vector((p[0], -p[2], p[1]))

def box(mb, c, size, mat, rot=None, taper=None):
    """Closed box (car coords) centred c, size (sx, sy, sz), its own 8 vertices; rot(p) optional point transform;
    taper: (kx, ky) scale of the +z end. Faces point outwards."""
    sx, sy, sz = size[0] / 2, size[1] / 2, size[2] / 2
    V = {}
    for ix in (-1, 1):
        for iy in (-1, 1):
            for iz in (-1, 1):
                kx = ky = 1
                if taper and iz > 0: kx, ky = taper
                p = (ix * sx * kx, iy * sy * ky, iz * sz)
                if rot: p = rot(p)
                V[(ix, iy, iz)] = mb.bm.verts.new(C((c[0] + p[0], c[1] + p[1], c[2] + p[2])))
    cen = C(c)
    fs = []
    for quad in [[(-1,-1,-1),(-1,1,-1),(1,1,-1),(1,-1,-1)], [(-1,-1,1),(1,-1,1),(1,1,1),(-1,1,1)],
                 [(-1,-1,-1),(1,-1,-1),(1,-1,1),(-1,-1,1)], [(-1,1,-1),(-1,1,1),(1,1,1),(1,1,-1)],
                 [(-1,-1,-1),(-1,-1,1),(-1,1,1),(-1,1,-1)], [(1,-1,-1),(1,1,-1),(1,1,1),(1,-1,1)]]:
        f = mb.bm.faces.new([V[q] for q in quad]); f.material_index = mat
        f.normal_update()
        if f.normal.dot(f.calc_center_median() - cen) < 0: f.normal_flip()
        fs.append(f)
    return fs

def chamfer_faces(mb, faces, w):
    """Bevel every edge of these (closed box) faces by w: crisp 45-degree chamfers."""
    es = set()
    for f in faces:
        for e in f.edges: es.add(e)
    bmesh.ops.bevel(mb.bm, geom=list(es) + list({v for e in es for v in e.verts}), offset=w, segments=1, affect="EDGES",
                    profile=0.5, clamp_overlap=True)

def lathe(mb, prof, n, mat_of, x0=0.0, phase=0.0, rfn=None, share=False):
    """Surface of revolution about the car x axis (wheel axle). prof: [(r, x)] open or closed loop; mat_of(k) per band.
    rfn(k, seg, r) may perturb the radius per segment."""
    rings = []
    for k, (r, x) in enumerate(prof):
        ring = []
        for s in range(n):
            a = phase + 2 * math.pi * s / n
            rr = rfn(k, s, r) if rfn else r
            ring.append((x0 + x, rr * math.cos(a), rr * math.sin(a)))
        rings.append(ring)
    fs = []
    for k in range(len(rings) - 1):
        for s in range(n):
            s1 = (s + 1) % n
            f = mb.face([rings[k][s], rings[k][s1], rings[k + 1][s1], rings[k + 1][s]], mat_of(k), share=share)
            if f: fs.append(f)
    return fs, rings

def disc(mb, ring, mat, centre=None, out=None):
    if centre is None:
        return mb.face(ring, mat, share=False, out=out)
    fs = []
    for s in range(len(ring)):
        f = mb.face([centre, ring[s], ring[(s + 1) % len(ring)]], mat, share=False)
        if f: fs.append(f)
    return fs

# ------------------------------------------------------------------------------------------------ plate font (5 x 7)
FONT = {
    "0": ["01110","10001","10011","10101","11001","10001","01110"], "1": ["00100","01100","00100","00100","00100","00100","01110"],
    "2": ["01110","10001","00001","00110","01000","10000","11111"], "3": ["11110","00001","00001","01110","00001","00001","11110"],
    "4": ["00010","00110","01010","10010","11111","00010","00010"], "5": ["11111","10000","11110","00001","00001","10001","01110"],
    "6": ["00110","01000","10000","11110","10001","10001","01110"], "7": ["11111","00001","00010","00100","01000","01000","01000"],
    "8": ["01110","10001","10001","01110","10001","10001","01110"], "9": ["01110","10001","10001","01111","00001","00010","01100"],
    "A": ["01110","10001","10001","11111","10001","10001","10001"], "B": ["11110","10001","10001","11110","10001","10001","11110"],
    "C": ["01110","10001","10000","10000","10000","10001","01110"], "D": ["11100","10010","10001","10001","10001","10010","11100"],
    "E": ["11111","10000","10000","11110","10000","10000","11111"], "F": ["11111","10000","10000","11110","10000","10000","10000"],
    "H": ["10001","10001","10001","11111","10001","10001","10001"], "K": ["10001","10010","10100","11000","10100","10010","10001"],
    "L": ["10000","10000","10000","10000","10000","10000","11111"], "N": ["10001","11001","10101","10011","10001","10001","10001"],
    "P": ["11110","10001","10001","11110","10000","10000","10000"], "R": ["11110","10001","10001","11110","10100","10010","10001"],
    "S": ["01111","10000","10000","01110","00001","00001","11110"], "T": ["11111","00100","00100","00100","00100","00100","00100"],
    "U": ["10001","10001","10001","10001","10001","10001","01110"], "X": ["10001","10001","01010","00100","01010","10001","10001"],
    "Z": ["11111","00001","00010","00100","01000","10000","11111"], "I": ["01110","00100","00100","00100","00100","00100","01110"],
    "-": ["00000","00000","00000","01110","00000","00000","00000"],
}
def glyph_rects(ch):
    """Greedy merge of a 5x7 bitmap into rectangles (x0, y0, x1, y1) in cells, y down."""
    rows = FONT[ch]
    used = [[False] * 5 for _ in range(7)]
    out = []
    for y in range(7):
        for x in range(5):
            if rows[y][x] != "1" or used[y][x]: continue
            x1 = x
            while x1 + 1 < 5 and rows[y][x1 + 1] == "1" and not used[y][x1 + 1]: x1 += 1
            y1 = y
            while y1 + 1 < 7 and all(rows[y1 + 1][k] == "1" and not used[y1 + 1][k] for k in range(x, x1 + 1)): y1 += 1
            for yy in range(y, y1 + 1):
                for xx in range(x, x1 + 1): used[yy][xx] = True
            out.append((x, y, x1 + 1, y1 + 1))
    return out

def text_quads(mb, text, frame, h, mat, gap=0.18, out=None):
    """Characters as flat quads. frame(u, v) -> car point (u along the text, v up), text centred at u = v = 0."""
    cw = h / 7 * 5; adv = cw * (1 + gap)
    total = adv * len(text) - cw * gap
    u0 = -total / 2
    for i, ch in enumerate(text):
        if ch == " ": continue
        for (x0, y0, x1, y1) in glyph_rects(ch):
            a, b = u0 + i * adv + x0 / 5 * cw, u0 + i * adv + x1 / 5 * cw
            c, d = h / 2 - y1 / 7 * h, h / 2 - y0 / 7 * h
            mb.face([frame(a, c), frame(b, c), frame(b, d), frame(a, d)], mat, share=False, out=out)

def plate(mb, centre, tilt, facing, rng, w=0.52, h=0.11):
    """Belgian-style plate: white, red characters and border, blue EU band; 'facing' +1 front (+z), -1 rear.
    tilt: lean back of the plate face (radians). Random characters (format 1-ABC-123), no real registration."""
    ct, st = math.cos(tilt), math.sin(tilt)
    def frame(u, v, n=0.0):
        # u along -x for the front (so text reads left to right seen from the front), v up the tilted face, n out
        x = u * facing
        y = centre[1] + v * ct
        z = centre[2] + facing * (n - v * st)
        return (centre[0] + x, y, z)
    T = 0.006
    # holder (black, sunk into the bumper) and the plate slab
    pts = lambda uu, vv, nn: [frame(-uu, -vv, nn), frame(uu, -vv, nn), frame(uu, vv, nn), frame(-uu, vv, nn)]
    def slab(uu, vv, n0, n1, mat):
        A, B = pts(uu, vv, n0), pts(uu, vv, n1)
        cc = frame(0, 0, (n0 + n1) / 2)
        mb.face(B, mat, share=False, out=("from", cc))
        # the slab's edges in black: a colour border all round the face, so the LOD simplifier (locked borders) can't
        # fold the thin slab flat and lose the white plate
        for k in range(4):
            mb.face([A[k], A[(k + 1) % 4], B[(k + 1) % 4], B[k]], M["trim"], share=False, out=("from", cc))
    slab(w / 2 + 0.012, h / 2 + 0.012, -0.03, 0.004, M["trim"])
    slab(w / 2, h / 2, 0.003, 0.003 + T, M["plate"])
    n = 0.003 + T + 0.0012
    # red border line, blue band with a white B
    bw = 0.004
    for (a, c, b, d) in [(-w/2 + 0.006, h/2 - 0.006 - bw, w/2 - 0.006, h/2 - 0.006), (-w/2 + 0.006, -h/2 + 0.006, w/2 - 0.006, -h/2 + 0.006 + bw)]:
        mb.face([frame(a, c, n), frame(b, c, n), frame(b, d, n), frame(a, d, n)], M["plate_red"], share=False, out=(0, 0, facing))
    mb.face([frame(-w/2 + 0.004, -h/2 + 0.004, n), frame(-w/2 + 0.044, -h/2 + 0.004, n), frame(-w/2 + 0.044, h/2 - 0.004, n), frame(-w/2 + 0.004, h/2 - 0.004, n)], M["plate_blue"], share=False, out=(0, 0, facing))
    text_quads(mb, "B", lambda u, v: frame(-w/2 + 0.024 + u, -0.022 + v, n + 0.0008), 0.024, M["white"], out=(0, 0, facing))
    letters = "ABCDEFHKLNPRSTUXZ"
    txt = f"{rng.randint(1, 2)}-{''.join(rng.choice(letters) for _ in range(3))}-{rng.randint(0, 9)}{rng.randint(0, 9)}{rng.randint(0, 9)}"
    text_quads(mb, txt, lambda u, v: frame(0.022 + u, v, n), 0.062, M["plate_red"], gap=0.22, out=(0, 0, facing))

# ------------------------------------------------------------------------------------------------ the car types
def T(**k): return k
TYPES = {
    "hatch_s": T(label="small hatchback", type="hatchback", L=4.00, W=1.74, WB=2.50, OF=0.80, RW=0.300, TW=0.185, RR=0.196,
                 GC=0.135, HB=0.92, HN=0.73, lampH=0.15, HT=1.00, HR=1.455, bonnet=0.98, ws=0.80, back="hatch", bl=(0.05, 0.40),
                 doors=5, paint=(0.42, 0.03, 0.03), track=1.50),
    "hatch_c": T(label="compact hatchback", type="hatchback", L=4.30, W=1.80, WB=2.64, OF=0.90, RW=0.317, TW=0.205, RR=0.216,
                 GC=0.14, HB=0.94, HN=0.74, HT=1.02, HR=1.455, bonnet=1.12, ws=0.82, back="hatch", bl=(0.06, 0.42),
                 doors=5, paint=(0.025, 0.07, 0.17), track=1.55),
    "estate": T(label="estate", type="estate", L=4.62, W=1.80, WB=2.70, OF=0.92, RW=0.317, TW=0.205, RR=0.216,
                GC=0.14, HB=0.95, HN=0.75, HT=1.02, HR=1.47, bonnet=1.14, ws=0.84, back="estate", bl=(0.06, 0.22),
                doors=5, quarter=True, rails=True, paint=(0.30, 0.31, 0.32), track=1.56),
    "saloon": T(label="saloon", type="sedan", L=4.72, W=1.82, WB=2.80, OF=0.95, RW=0.325, TW=0.215, RR=0.229,
                GC=0.14, HB=0.95, HN=0.74, HT=1.00, HR=1.445, bonnet=1.18, ws=0.86, back="saloon", bl=(0.52, 1.02),
                doors=4, paint=(0.012, 0.013, 0.015), track=1.57),
    "suv": T(label="small SUV", type="suv", L=4.40, W=1.82, WB=2.64, OF=0.90, RW=0.345, TW=0.215, RR=0.229,
             GC=0.19, HB=1.04, HN=0.86, lampH=0.20, HT=1.12, HR=1.60, bonnet=1.10, ws=0.80, back="hatch", bl=(0.07, 0.40),
             doors=5, clad=True, rails=True, paint=(0.06, 0.12, 0.10), track=1.57),
    "van_c": T(label="compact van", type="van", L=4.50, W=1.84, WB=2.72, OF=0.88, RW=0.320, TW=0.205, RR=0.216,
               GC=0.16, HB=1.06, HN=0.88, lampH=0.20, rail=0.10, HT=1.10, HR=1.82, bonnet=0.80, ws=0.95, back="van", bl=(0.05, 0.12),
               doors="slide", clad=True, paint=(0.62, 0.62, 0.60), track=1.56, quarter=True),
    "van_p": T(label="panel van", type="van", L=5.05, W=2.02, WB=3.25, OF=0.95, RW=0.345, TW=0.215, RR=0.229,
               GC=0.18, HB=1.12, HN=0.98, lampH=0.22, rail=0.34, HT=1.15, HR=2.28, bonnet=0.70, ws=0.80, back="van", bl=(0.04, 0.08),
               doors="panel", clad=True, paint=(0.70, 0.70, 0.68), track=1.70),
    "taxi": T(label="Brussels taxi", type="taxi", L=4.66, W=1.80, WB=2.70, OF=0.92, RW=0.317, TW=0.205, RR=0.216,
              GC=0.14, HB=0.95, HN=0.75, lampH=0.12, HT=1.02, HR=1.47, bonnet=1.14, ws=0.84, back="estate", bl=(0.06, 0.22),
              doors=5, quarter=True, rails=True, paint=(0.010, 0.010, 0.011), keepPaint=True, taxi=True, track=1.56),
}
# FASCIAS per type (generic designs). Fractions f of the half width (0 = centre, 1 = the corner); bands of the tub:
# chin (L0-L1), lower (L1-L2), bumpA (L2-L2b), bumpB (L2b-L3), lamp (L3-L4), top (L4-L5).
#   lamp (f0, f1, bands)   grille (f1, bands, slats, chrome surround)   lower intake f1 in 'lower'   corners (f0, f1) in
#   'lower'   skid: silver skid plate in the chin   extra: more fractions for these edges
FASCIA = {
    "hatch_s": dict(lamp=(0.62, 0.965, ("lamp",)), grille=(0.35, ("lamp",), 1, False), lower=0.62, corners=None, skid=False, extra=(0.62, 0.35)),
    "hatch_c": dict(lamp=(0.5, 1.0, ("lamp",)), grille=(0.5, ("lamp",), 2, False), lower=0.5, corners=(0.81, 0.93), skid=False, extra=()),
    "estate": dict(lamp=(0.42, 1.0, ("lamp",)), grille=(0.42, ("lamp",), 1, True), lower=0.79, corners=None, skid=False, extra=(0.42,)),
    "saloon": dict(lamp=(0.42, 0.965, ("lamp",)), grille=(0.42, ("lamp", "bumpB"), 3, True), lower=0.42, corners=(0.62, 0.93), skid=False, extra=(0.42, 0.62)),
    "suv": dict(lamp=(0.5, 1.0, ("lamp",)), grille=(0.5, ("lamp", "bumpB"), 3, False), lower=0.62, corners=None, skid=True, extra=(0.62,)),
    "van_c": dict(lamp=(0.55, 1.0, ("lamp",)), grille=(0.55, ("lamp",), 3, False), lower=0.55, corners=(0.81, 0.93), skid=False, extra=(0.55,)),
    "van_p": dict(lamp=(0.62, 1.0, ("lamp",)), grille=(0.62, ("lamp", "bumpB"), 4, False), lower=0.79, corners=None, skid=False, extra=(0.62,)),
}
FASCIA["taxi"] = FASCIA["estate"]
#   tail: [(f0, f1, bands)] red clusters   garnish (f1, band, material) between the lamps   refl (f0, f1) in 'lower'
#   diffuser: dark centre of the chin with fins   skid: silver   extra fractions
REAR = {
    "hatch_s": dict(tail=[(0.81, 1.0, ("lamp", "top"))], garnish=None, refl=(0.81, 0.93), diffuser=False, skid=False, extra=()),
    "hatch_c": dict(tail=[(0.5, 1.0, ("top",))], garnish=(0.5, "top", "housing"), refl=(0.79, 0.93), diffuser=True, skid=False, extra=()),
    "estate": dict(tail=[(0.62, 1.0, ("top",)), (0.81, 1.0, ("lamp",))], garnish=(0.62, "top", "chrome"), refl=(0.81, 0.93), diffuser=False, skid=False, extra=(0.62,)),
    "saloon": dict(tail=[(0.42, 1.0, ("top",))], garnish=(0.42, "top", "chrome"), refl=(0.62, 0.79), diffuser=True, skid=False, extra=(0.42, 0.62)),
    "suv": dict(tail=[(0.62, 1.0, ("top",))], garnish=(0.62, "top", "housing"), refl=(0.81, 0.93), diffuser=False, skid=True, extra=(0.62,)),
    "van_c": dict(tail=[(0.81, 1.0, ("lamp", "top"))], garnish=None, refl=(0.81, 0.93), diffuser=False, skid=False, extra=()),
    "van_p": dict(tail=[(0.81, 1.0, ("bumpB", "lamp", "top"))], garnish=None, refl=(0.62, 0.79), diffuser=False, skid=False, extra=(0.62,)),
}
REAR["taxi"] = REAR["estate"]
BANDS = ["chin", "lower", "bumpA", "bumpB", "lamp", "top"]

# fractions of the half width at which the front / rear fascia points sit (and the rows of the top grid); each type
# adds its own (FASCIA / REAR extra) so its lamp, grille and intake edges have points
FR0 = [0.965, 0.93, 0.81, 0.80, 0.79, 0.5, 0.0]
L0, L1, L2, L2B, L3, L4, TOP = range(7)
NL = 7
GROOVE_W, GROOVE_D = 0.0045, 0.0055

def crown(f):
    return 0.0 if abs(f) >= 1 else 0.055 * (1 - f * f) ** 0.5

# ------------------------------------------------------------------------------------------------ build one car
def build_car(cid, P):
    rng = random.Random(sum(map(ord, cid)) * 7919)
    FA, RE = FASCIA[cid], REAR[cid]
    FR = sorted(set(FR0) | set(FA["extra"]) | set(RE["extra"]), reverse=True)
    FULL = [1.0] + FR + [-f for f in reversed(FR[:-1])] + [-1.0]
    L, W, WB = P["L"], P["W"], P["WB"]
    hw = W / 2
    zf = WB / 2 + P["OF"]                       # front end
    zr = zf - L                                 # rear end (negative)
    zfa, zra = WB / 2, -WB / 2
    GC, HB, HN, HT, HR = P["GC"], P["HB"], P["HN"], P["HT"], P["HR"]
    RW, TW, RR = P["RW"], P["TW"], P["RR"]
    clad = P.get("clad", False)
    van = P["back"] == "van"
    z_ws0 = zf - P["bonnet"]                    # windscreen base (cowl)
    # backlight: base / top, measured from the rear end
    z_bl0, z_bl1 = zr + P["bl"][0], zr + P["bl"][1]
    if P["back"] == "saloon":
        z_bl0, z_bl1 = zr + P["bl"][0], zr + P["bl"][1]
    z_ws1 = z_ws0 - P["ws"]                     # windscreen top (header)

    # ---- door seams (z), grooves
    if P["doors"] == "panel":
        seams = [z_ws0 - 0.04, z_ws0 - 1.02, zra + 0.55]
    elif P["doors"] == "slide":
        seams = [z_ws0 - 0.04, z_ws0 - 1.00, zra + 0.42]
    elif P["doors"] == 4 or P["doors"] == 5:
        bz = (zfa + zra) / 2 + 0.05 * (WB - 2.5)
        seams = [z_ws0 - 0.04, bz + 0.02, zra + RW + 0.10]
    else:
        seams = [z_ws0 - 0.04, zra + RW + 0.25]
    z_b = seams[1]                               # B pillar at the second seam

    # ---- levels: (name, front y, side y, rear y, half width, end taper, front rake, rear rake)
    Ls = [
        ("L0", GC + 0.05, GC, GC + 0.07, hw - 0.10, 0.94, 0.11, 0.10),
        ("L1", GC + 0.13, GC + 0.075, GC + 0.15, hw - 0.028, 0.965, 0.03, 0.02),
        ("L2", GC + 0.27, GC + 0.20, GC + 0.29, hw - 0.006, 0.975, 0.0, 0.0),
        None,
        ("L3", HN - P.get("lampH", 0.17), HB - 0.33, HT - 0.37, hw, 0.975, 0.025, 0.012),
        ("L4", HN - 0.045, HB - 0.085, HT - 0.17, hw - 0.012, 0.97, 0.10, 0.05),
        ("L5", HN, HB, HT, hw - 0.055, 0.96, 0.16, 0.085),
    ]
    if van:   # boxier vans: steeper, taller fascia
        Ls[L4] = ("L4", HN - 0.05, HB - 0.09, HT - 0.20, hw - 0.012, 0.975, 0.08, 0.02)
        Ls[TOP] = ("L5", HN, HB, HT, hw - 0.05, 0.965, 0.13, 0.03)
    # L2b: the bumper's middle crease at the ends; on the sides a concave character line along the lower doors
    # (1.6 cm in from the sill crease and the waist), so the big door panels break into two facets
    a2, a3 = Ls[L2], Ls[L3]
    Ls[L2B] = ("L2b", lerp(a2[1], a3[1], 0.5), lerp(a2[2], a3[2], 0.42), lerp(a2[3], a3[3], 0.5), hw - 0.017, 0.975,
               lerp(a2[6], a3[6], 0.5) + 0.006, lerp(a2[7], a3[7], 0.5) + 0.004)
    bow, cr = (0.06, 0.20) if not van else (0.05, 0.17)
    rbow, rcr = (0.05, 0.16) if not van else (0.02, 0.10)
    z_fend = z_ws0 + 0.02                        # the fender reaches the side heights here
    z_rs = (z_bl0 if P["back"] == "saloon" else zr + 0.55)
    wedge = 0.025 if not van else 0.0

    def zfront(li, f):
        g = max(0.0, (abs(f) - 0.72) / 0.28) ** 2
        return zf - Ls[li][6] - bow * f * f - cr * g
    def zrear(li, f):
        g = max(0.0, (abs(f) - 0.72) / 0.28) ** 2
        return zr + Ls[li][7] + rbow * f * f + rcr * g
    def side_y(li, z):
        _, yf, ys, yr = Ls[li][:4]
        return piecewise(z, [(zfront(li, 1), yf), (z_fend, ys), (z_rs, ys + wedge), (zrear(li, 1), yr)])
    def side_x(li, z):
        x, ek = Ls[li][4], Ls[li][5]
        k = min(smooth01((zfront(li, 1) - z) / 0.7), smooth01((z - zrear(li, 1)) / 0.6))
        return x * lerp(ek, 1.0, k)

    # side stations (z, front to rear), groove stations tripled
    SZ = [(zfa + 0.38, 0), (zfa, 0), (zfa - 0.40, 0), (z_ws0 + 0.08, 0)]
    for s in seams: SZ += [(s + GROOVE_W, 0), (s, 1), (s - GROOVE_W, 0)]
    SZ += [((seams[0] + seams[1]) / 2, 0), ((seams[1] + seams[-1]) / 2, 0), (zra + 0.40, 0), (zra, 0), (zra - 0.40, 0),
           (zrear(TOP, 1) + 0.16, 0), ((z_b + seams[-1]) / 2 - 0.30, 0), ((seams[0] + z_b) / 2 - 0.30, 0)]
    if P["back"] == "saloon": SZ += [(z_bl0 + 0.05, 0), (z_bl0 - 0.05, 0)]
    if van: SZ += [(z_ws1 - 0.05, 0)]
    zmin_ok = max(zrear(li, 1) for li in range(NL)) + 0.05
    zmax_ok = min(zfront(li, 1) for li in range(NL)) - 0.05
    SZ = sorted({(round(z, 4), g) for z, g in SZ if zmin_ok < z < zmax_ok}, key=lambda t: -t[0])
    # keep only one entry per z (groove flag wins)
    dd = {}
    for z, g in SZ: dd[z] = max(dd.get(z, 0), g)
    SZ = sorted(dd.items(), key=lambda t: -t[0])

    def snap(li, f):   # the bonnet / boot groove rows (0.79 .. 0.81) exist only on the top loop
        return math.copysign(0.80, f) if li < TOP and 0.785 < abs(f) < 0.815 else f
    def pF(li, f):
        f = snap(li, f)
        x = f * side_x(li, zfront(li, 1)) if abs(f) < 1 else math.copysign(side_x(li, zfront(li, 1)), f)
        y = Ls[li][1] + (crown(f) if li == TOP else 0.0)
        return (x, y, zfront(li, f))
    def pR(li, f):
        f = snap(li, f)
        x = f * side_x(li, zrear(li, 1)) if abs(f) < 1 else math.copysign(side_x(li, zrear(li, 1)), f)
        y = Ls[li][3] + (crown(f) if li == TOP else 0.0)
        return (x, y, zrear(li, f))
    def pS(li, z, s, groove):
        x = side_x(li, z) - (GROOVE_D if groove and li >= 1 else 0.0)
        return (s * x, side_y(li, z), z)

    # loop entries
    loop = [("F", 1.0)] + [("S", z, g, 1) for z, g in SZ] + [("R", 1.0)] + [("R", f) for f in FR] + \
           [("R", -f) for f in reversed(FR[:-1])] + [("R", -1.0)] + [("S", z, g, -1) for z, g in reversed(SZ)] + \
           [("F", -1.0)] + [("F", -f) for f in FR[:-1]] + [("F", 0.0)] + [("F", f) for f in reversed(FR[:-1])]
    # fix order: front points from right (-) to left (+) at the end, closing to F(1)
    loop = [e for e in loop]
    def pt(li, e):
        if e[0] == "F": return pF(li, e[1])
        if e[0] == "R": return pR(li, e[1])
        return pS(li, e[1], e[3], e[2])

    mb = MB()
    tags = {}
    def tag(name, f):
        if f: tags.setdefault(name, []).append(f)

    # ---- tub bands
    def inr(fa, fb, f0, f1):
        return min(fa, fb) >= f0 - 1e-6 and max(fa, fb) <= f1 + 1e-6
    def band_mat(b, e0, e1):
        bn = BANDS[b]
        typ = e0[0] if e0[0] == e1[0] else ("S" if "S" in (e0[0], e1[0]) else e0[0])
        if typ == "S":
            if bn == "chin": return M["trim"], None
            if bn == "lower": return (M["trim"] if clad else M["paint"]), None
            return M["paint"], None
        fa, fb = (abs(e0[1]), abs(e1[1])) if e0[0] == e1[0] else (1.0, 1.0)
        sgn = "L" if (e0[1] + e1[1]) > 0 else "R"
        if typ == "F":
            l0, l1, lb = FA["lamp"]; g1, gb, _, _ = FA["grille"]
            if bn in lb and inr(fa, fb, l0, l1): return M["housing"], "lamp" + sgn
            if bn in gb and inr(fa, fb, 0, g1): return M["trim"], "grille"
            if bn == "chin":
                return (M["skid"], "skid") if FA["skid"] and inr(fa, fb, 0, 0.5) else (M["trim"], None)
            if bn == "lower":
                if inr(fa, fb, 0, FA["lower"]): return M["trim"], "lgrille"
                if FA["corners"] and inr(fa, fb, *FA["corners"]): return M["trim"], "fog" + sgn
                return (M["trim"] if clad else M["paint"]), None
            return M["paint"], None
        # rear
        for (t0, t1, tb) in RE["tail"]:
            if bn in tb and inr(fa, fb, t0, t1): return M["tail"], "tail" + sgn
        if RE["garnish"] and bn == RE["garnish"][1] and inr(fa, fb, 0, RE["garnish"][0]): return M[RE["garnish"][2]], "garnish"
        if bn == "chin":
            if RE["diffuser"] and inr(fa, fb, 0, 0.5): return M["housing"], "diffuser"
            if RE["skid"] and inr(fa, fb, 0, 0.5): return M["skid"], None
            return M["trim"], None
        if bn == "lower":
            return (M["trim"] if clad else M["paint"]), ("refl" + sgn if inr(fa, fb, *RE["refl"]) else None)
        return M["paint"], None

    rows = [[pt(li, e) for e in loop] for li in range(NL)]
    n = len(loop)
    for b in range(NL - 1):
        for j in range(n):
            j1 = (j + 1) % n
            mat, tg = band_mat(b, loop[j], loop[j1])
            f = mb.face([rows[b][j], rows[b][j1], rows[b + 1][j1], rows[b + 1][j]], mat)
            if f is None: continue
            if tg: tag(tg, f)
            if loop[j][0] == "S" and loop[j1][0] == "S" and (loop[j][2] or loop[j1][2]) and b >= 1:
                f.material_index = M["paint_seam"] if f.material_index == M["paint"] else f.material_index

    # ---- top grid: front col, side cols, rear col; FULL rows across
    def cap_side(z, groove, f):
        e = pS(TOP, z, 1 if f >= 0 else -1, groove)
        if abs(f) >= 1: return e
        x = f * side_x(TOP, z)
        y = side_y(TOP, z) + crown(f)
        if groove and abs(f) >= 0.93: y -= GROOVE_D
        if abs(abs(f) - 0.80) < 1e-6 and (z > z_ws0 + 0.08 or (P["back"] == "saloon" and z < z_bl0 - 0.05)): y -= GROOVE_D
        return (x, y, z)
    cols = [[pF(TOP, f) for f in FULL]] + [[cap_side(z, g, f) for f in FULL] for z, g in SZ] + [[pR(TOP, f) for f in FULL]]
    colz = [zf + 1] + [z for z, _ in SZ] + [zr - 1]
    cab0 = z_ws0 if not van else z_ws0
    cab1 = z_bl0 if P["back"] == "saloon" else SZ[-1][0] - 1e-4
    for i in range(len(cols) - 1):
        for j in range(len(FULL) - 1):
            fa, fb = abs(FULL[j]), abs(FULL[j + 1])
            za, zb = colz[i], colz[i + 1]
            inside = max(fa, fb) <= 0.93 + 1e-6 and za <= cab0 + 1e-6 and zb >= cab1 - 1e-6
            mat = M["interior"] if inside else M["paint"]
            # grooves: bonnet side lines (rows 0.81-0.79), seams on the ledge
            if not inside and {round(fa, 2), round(fb, 2)} <= {0.81, 0.80, 0.79} and fa != fb:
                if za > z_ws0 + 0.08 or (P["back"] == "saloon" and zb < z_bl0 - 0.05): mat = M["paint_seam"]
            if not inside and (SZ[i - 1][1] if 0 < i <= len(SZ) else 0) + (SZ[i][1] if i < len(SZ) else 0) and min(fa, fb) >= 0.93:
                mat = M["paint_seam"]
            mb.face([cols[i][j], cols[i][j + 1], cols[i + 1][j + 1], cols[i + 1][j]], mat)
    # bonnet rear shut line: a groove across, just ahead of the cowl (visual: seam strip)
    # underbody: one flat polygon of the L0 loop
    mb.face([rows[0][j] for j in range(n)][::-1], M["under"])

    # ---- insets on the tub (lamps, grilles, tail lamps): outward normals first (the tub is closed)
    bm = mb.bm
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-6)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    def inset(faces, th, depth, mat_band=None, mat_in=None, individual=False):
        if not faces: return [], []
        if individual:
            faces = [f for f in faces if f.calc_area() > (th * 6) ** 2 and min(e.calc_length() for e in f.edges) > th * 3]
            if not faces: return [], []
            r = bmesh.ops.inset_individual(bm, faces=faces, thickness=th, depth=depth, use_even_offset=True)
        else:
            r = bmesh.ops.inset_region(bm, faces=faces, thickness=th, depth=depth, use_even_offset=True, use_boundary=True)
        band = r["faces"]
        if mat_band is not None:
            for f in band: f.material_index = mat_band
        if mat_in is not None:
            for f in faces: f.material_index = mat_in
        return band, faces
    projector_spots = []
    for s in "LR":
        fs = tags.get("lamp" + s, [])
        inset(fs, 0.008, -0.004, M["trim"])                     # thin black surround
        inset(fs, 0.006, -0.026, M["housing"], M["housing"])    # deep housing
        band, inner = inset(fs, 0.010, 0.006, M["chrome"], M["head"], individual=True)   # reflector facets
        for f in inner:
            c = f.calc_center_median()
            projector_spots.append((Vector(c), f.normal.copy(), f.calc_area()))
        # outermost facet: amber indicator
        if fs:
            fo = max(fs, key=lambda f: abs(f.calc_center_median().x))
            fo.material_index = M["amber"]
    for s in "LR":
        fs = tags.get("tail" + s, [])
        inset(fs, 0.007, -0.003, M["trim"])
        inset(fs, 0.004, -0.012, M["tail"], M["tail"])
        band, inner = inset(fs, 0.008, 0.005, M["tail"], M["tail_hi"], individual=True)
    for s in "LR":   # bumper lamps: reverse light on the left, rear fog on the right (as on European cars)
        inset(tags.get("refl" + s, []), 0.01, -0.003, M["trim"], M["reverse"] if s == "L" else M["tail"])
    inset(tags.get("garnish", []), 0.006, -0.004, M["trim"])          # gloss black tailgate garnish between the lamps
    for s in "LR":
        inset(tags.get("fog" + s, []), 0.008, -0.025, M["trim"], M["liner"])
    g_band, g_in = inset(tags.get("grille", []), 0.010, -0.035, M["trim"], M["liner"])
    lg_band, lg_in = inset(tags.get("lgrille", []), 0.012, -0.040, M["trim"], M["liner"])
    tub = mb.obj(f"{cid}_tub")

    # ---- wheel arches (boolean)
    cut = MB()
    xin = P["track"] / 2 - TW / 2 - 0.07
    Ra = RW + 0.05
    for z0 in (zfa, zra):
        for s in (1, -1):
            prof = [(Ra + 0.035, s * (hw + 0.25)), (Ra + 0.035, s * (hw - 0.004)), (Ra, s * (hw - 0.04)), (Ra, s * xin),
                    (0.0, s * xin)]
            nseg = 14
            rings = []
            for (r, x) in prof:
                ring = []
                for k in range(nseg):
                    a = math.pi / 2 + 2 * math.pi * (k + 0.5) / nseg
                    ring.append((x, RW + 0.02 + r * math.sin(a), z0 + r * math.cos(a)))
                rings.append(ring)
            mats = [M["trim"] if clad else M["paint"], M["trim"] if clad else M["paint"], M["liner"], M["liner"]]
            for k in range(len(rings) - 1):
                for q in range(nseg):
                    q1 = (q + 1) % nseg
                    cut.face([rings[k][q], rings[k][q1], rings[k + 1][q1], rings[k + 1][q]], mats[k], share=False)
            cut.face(rings[0], mats[0], share=False)
    cutter = cut.obj(f"{cid}_cutter")
    mod = tub.modifiers.new("arches", "BOOLEAN")
    mod.operation = "DIFFERENCE"; mod.solver = "EXACT"; mod.object = cutter
    try: mod.material_mode = "INDEX"
    except Exception: pass
    dg = bpy.context.evaluated_depsgraph_get()
    me2 = bpy.data.meshes.new_from_object(tub.evaluated_get(dg))
    tub.modifiers.clear(); old = tub.data; tub.data = me2; bpy.data.meshes.remove(old)
    bpy.data.objects.remove(cutter);
    parts = [tub]

    # ---- greenhouse
    gh = MB()
    def ledge_y(z, f):
        return side_y(TOP, z) + crown(f * 0.93) - 0.016
    xg0 = lambda z: 0.93 * side_x(TOP, z)
    th = 0.15 if not van else 0.07
    if P["back"] == "van": th = 0.06
    # plan points of ring 0 (sill): front [0, .55, .94], side stations, rear [.94, .55, 0]
    wsb = 0.07
    gz_front0 = z_ws0
    gz_rear0 = z_bl0 if P["back"] != "hatch" else zrear(TOP, 0) + 0.035
    if P["back"] == "hatch": z_bl0 = gz_rear0
    if P["back"] in ("estate", "van"): gz_rear0 = zrear(TOP, 0) + 0.03; z_bl0 = gz_rear0
    side0 = [("A", gz_front0 - wsb * 0.88 - 0.07)]
    if P["doors"] in (4, 5):
        side0 += [("B0", z_b + 0.045), ("B1", z_b - 0.045)]
        side0 += [("Q", seams[-1] + 0.02)]
        if P.get("quarter"): side0 += [("Q2", seams[-1] - 0.07)]
    elif P["doors"] == "slide":
        side0 += [("B0", z_b + 0.045), ("B1", z_b - 0.045), ("Q", seams[-1] - 0.05), ("Q2", seams[-1] - 0.15)]
    elif P["doors"] == "panel":
        side0 += [("B0", z_b + 0.05), ("B1", z_b - 0.05)]
    side0 += [("C", gz_rear0 + 0.04 * 0.88 + 0.08)]
    # ring definitions: (y, half width fn, front z of centre, rear z of centre, plan bow front / rear, side z map)
    roof_y = HR - 0.012
    z_hdr = z_ws1
    z_rtop = z_bl1
    rings = []
    def ring(y, x_of, zfc, zrc, fb, rb, side_map, ylift=None):
        pts = []
        # left half from front centre? -> build full loop: front centre, left front, left side, left rear, rear centre, right...
        fl = [0.0, 0.55, 0.94]
        pts_front_L = [(f, zfc - fb * f * f) for f in fl]
        pts_rear_L = [(f, zrc + rb * f * f) for f in fl]
        L = []
        for f, z in pts_front_L: L.append(("f", f, z))
        for name, z in side_map: L.append(("s", name, z))
        for f, z in reversed(pts_rear_L): L.append(("r", f, z))
        out = []
        for e in L:
            if e[0] == "s": out.append((x_of(e[2]), e[2], 1.0, e[1]))
            else: out.append((e[1] * x_of(e[2]), e[2], e[1], e[0]))
        # full loop: left half (front centre .. rear centre) then right half mirrored (rear .. front, excluding centres)
        left = out
        right = [(-x, z, -f, nm) for (x, z, f, nm) in reversed(out[1:-1])]
        loopp = left + right
        res = []
        for (x, z, f, nm) in loopp:
            yy = y(z, abs(f)) if callable(y) else y
            res.append(((x, yy, z), nm))
        return res
    # ring 0: on the ledge
    r0 = ring(lambda z, f: ledge_y(z, f), xg0, gz_front0, gz_rear0, wsb, 0.04, side0)
    x1 = lambda z: xg0(z) - th
    # ring 1: rail. side stations lean: A goes to the header, C to the roof end, B straight-ish
    def remap(side, zf_new, zr_new, zf_old, zr_old, keepB=True):
        out = []
        for nm, z in side:
            if nm == "A": out.append((nm, zf_new - (zf_old - z) * 0.5))
            elif nm == "C": out.append((nm, zr_new + (z - zr_old) * 0.5))
            else:
                t = (zf_old - z) / (zf_old - zr_old)
                zz = z - 0.03 if nm.startswith("B") else lerp(zf_new, zr_new, t) * 0.5 + z * 0.5
                out.append((nm, zz))
        # clamp monotonic inside (zr_new, zf_new)
        lo, hi = zr_new + 0.03, zf_new - 0.03
        res, prev = [], hi + 0.02
        for nm, z in out:
            z = min(max(z, lo), prev - 0.02); res.append((nm, z)); prev = z
        return res
    side1 = remap(side0, z_hdr, z_rtop, gz_front0, gz_rear0)
    rail = P.get("rail", 0.05)          # vans: the glass stops under a painted roof header
    r1 = ring(roof_y - rail, x1, z_hdr, z_rtop, wsb * 0.55, 0.03, side1)
    x2 = lambda z: x1(z) - 0.035
    side2 = remap(side1, z_hdr - 0.035, z_rtop + 0.035, z_hdr, z_rtop)
    r2 = ring(roof_y - 0.008, x2, z_hdr - 0.035, z_rtop + 0.035, wsb * 0.5, 0.025, side2)
    x3 = lambda z: x2(z) * 0.70
    side3 = remap(side2, z_hdr - 0.16, z_rtop + 0.13, z_hdr - 0.035, z_rtop + 0.035)
    r3 = ring(roof_y + 0.012, x3, z_hdr - 0.16, z_rtop + 0.13, wsb * 0.4, 0.02, side3)
    R = [r0, r1, r2, r3]
    nr = len(r0)
    names = [nm for _, nm in r0]
    # which segment of band 0-1 is what
    def seg_kind(k):
        a, b = names[k], names[(k + 1) % nr]
        if a in ("f", ) and b in ("f",): return "ws"
        if {a, b} == {"f", "A"}: return "apillar"
        if a in ("r",) and b in ("r",): return "bl"
        if {a, b} == {"r", "C"}: return "cpillar"
        pair = (a, b) if k < nr // 2 else (b, a)
        if pair == ("A", "B0"): return "glass"
        if pair == ("B0", "B1"): return "bpillar"
        if pair == ("B1", "Q"): return "glass"
        if pair == ("Q", "Q2"): return "cpillar_q" if P["doors"] != "slide" else "bpillar"
        if pair == ("Q2", "C"): return "glass"
        if pair == ("Q", "C"): return "cpillar"
        if pair == ("B1", "C"): return "panel"
        if pair == ("A", "C"): return "glass"
        return "paint"
    gtags = {}
    for k in range(nr):
        k1 = (k + 1) % nr
        sk = seg_kind(k)
        if van and P["doors"] == "panel" and sk == "glass" and k > 0 and names[k] in ("B1",) : sk = "panel"
        for b in range(3):
            pa, pb = R[b][k][0], R[b][k1][0]
            qa, qb = R[b + 1][k][0], R[b + 1][k1][0]
            if b == 0:
                mat = {"ws": M["glass"], "bl": M["glass"], "glass": M["glass"], "bpillar": M["housing"], "cpillar_q": M["housing"],
                       "apillar": M["paint"], "cpillar": M["paint"], "panel": M["paint"]}.get(sk, M["paint"])
                if P["back"] == "van" and sk == "bl": mat = M["glass"]
            else:
                mat = M["paint"]
            f = gh.face([pa, pb, qb, qa], mat)
            if f and b == 0:
                key = sk if sk in ("ws", "bl") else (f"{sk}_{k}")
                gtags.setdefault(key, []).append(f)
    top = gh.face([p for p, _ in r3], M["paint"])
    bot = gh.face([p for p, _ in reversed(r0)], M["interior"])
    bmesh.ops.recalc_face_normals(gh.bm, faces=gh.bm.faces)
    gbm = gh.bm
    def ginset(faces, thick, depth, band_mat):
        if not faces: return
        r = bmesh.ops.inset_region(gbm, faces=faces, thickness=thick, depth=depth, use_even_offset=True, use_boundary=True)
        for f in r["faces"]: f.material_index = band_mat
    for key, fs in gtags.items():
        if key in ("ws", "bl") or key.startswith("glass_"):
            ginset(fs, 0.024 if key in ("ws", "bl") else 0.02, -0.010, M["rubber"])
        elif key.startswith("bpillar_") or key.startswith("cpillar_q_"):
            ginset(fs, 0.012, -0.004, M["rubber"])
    ghost = gh.obj(f"{cid}_greenhouse", recalc=False)
    parts.append(ghost)

    # ---- details
    d = MB()
    # plates
    fa_, fb_ = pF(L2, 0.0), pF(L3, 0.0)
    plate(d, (0, pF(L2B, 0.0)[1], pF(L2B, 0.0)[2] + 0.002), math.atan2(abs(fa_[2] - fb_[2]), fb_[1] - fa_[1]), +1, rng)
    ra_, rb_ = pR(L2, 0.0), pR(L3, 0.0)
    plate(d, (0, pR(L2B, 0.0)[1] + 0.01, pR(L2B, 0.0)[2] - 0.002), math.atan2(abs(rb_[2] - ra_[2]), rb_[1] - ra_[1]), -1, rng)
    # grille slats: horizontal bars inside the grille recess (chrome on the chrome-surround grilles)
    g1, gb, nslat, gchrome = FA["grille"]
    lo_ = min(BANDS.index(x) for x in gb); hi_ = max(BANDS.index(x) for x in gb) + 1
    a, b = pF(lo_, 0.0), pF(hi_, 0.0)
    for i in range(nslat):
        t = (i + 1) / (nslat + 1)
        y = lerp(a[1], b[1], t); z = lerp(a[2], b[2], t) - 0.022
        box(d, (0, y, z), (2 * (g1 - 0.04) * side_x(lo_, zfront(lo_, 1)), 0.011, 0.02), M["chrome"] if gchrome else M["trim"])
    if gchrome:   # a chrome bar across the top of the grille
        box(d, (0, b[1] - 0.012, b[2] - 0.004), (2 * (g1 - 0.03) * side_x(hi_, zfront(hi_, 1)), 0.008, 0.012), M["chrome"])
    a, b = pF(L1, 0.0), pF(L2, 0.0)
    for i in range(2):
        t = (i + 1) / 3
        box(d, (0, lerp(a[1], b[1], t), lerp(a[2], b[2], t) - 0.025), (2 * (FA["lower"] - 0.05) * side_x(L1, zfront(L1, 1)), 0.011, 0.02), M["trim"])
    # rear diffuser fins
    if RE["diffuser"]:
        a, b = pR(L0, 0.0), pR(L1, 0.0)
        for k in (-0.30, -0.10, 0.10, 0.30):
            box(d, (k * side_x(L1, zrear(L1, 1)), (a[1] + b[1]) / 2, (a[2] + b[2]) / 2 + 0.005), (0.008, abs(b[1] - a[1]) * 0.8, 0.05), M["trim"])
    # fuel flap (right rear quarter): a proud flap 2 mm off the panel in a 1 mm dark seam
    zfl = zra + 0.36
    yfl = lerp(side_y(L3, zfl), side_y(L4, zfl), 0.45)
    xfl = -lerp(side_x(L3, zfl), side_x(L4, zfl), 0.45)
    for (dx, sz, mt) in ((0.0010, (0.18, 0.125), M["paint_seam"]), (0.0021, (0.168, 0.113), M["paint"])):
        w_, h_ = sz[0] / 2, sz[1] / 2
        d.face([(xfl - dx, yfl - h_, zfl - w_), (xfl - dx, yfl - h_, zfl + w_), (xfl - dx, yfl + h_, zfl + w_), (xfl - dx, yfl + h_, zfl - w_)], mt, share=False, out=(-1, 0, 0))
    # projector cups in the head lamps: on the two largest reflector facets per side
    for s in (1, -1):
        spots = sorted([p for p in projector_spots if p[0].x * s > 0], key=lambda p: -p[2])[:2]
        for (cb, nb, _) in spots:
            cc = (cb.x, cb.z, -cb.y)              # Blender -> car
            nn = (nb.x, nb.z, -nb.y)
            # cup: 8-sided short cylinder along the facet normal
            r = 0.028
            # basis
            nv = Vector(nn).normalized(); up = Vector((0, 1, 0))
            t1 = up.cross(nv).normalized() if abs(nv.y) < 0.9 else Vector((1, 0, 0)); t2 = nv.cross(t1)
            ringA, ringB, ringC = [], [], []
            for k in range(8):
                a_ = 2 * math.pi * (k + 0.5) / 8
                off = t1 * (r * math.cos(a_)) + t2 * (r * math.sin(a_))
                base = Vector(cc) - nv * 0.004
                ringA.append(tuple(base + off)); ringB.append(tuple(base + nv * 0.014 + off)); ringC.append(tuple(base + nv * 0.010 + off * 0.72))
            for k in range(8):
                k1 = (k + 1) % 8
                d.face([ringA[k], ringA[k1], ringB[k1], ringB[k]], M["chrome"], share=False, out=("from", tuple(Vector(cc) + nv * 0.005)))
                d.face([ringB[k], ringB[k1], ringC[k1], ringC[k]], M["chrome"], share=False, out=tuple(nv))
            d.face(ringC, M["head"], share=False, out=tuple(nv))
    # mirrors: housing on the door at the A pillar base
    zA = side0[0][1] - 0.06
    for s in (1, -1):
        xb = s * (xg0(zA) + 0.01); yb = ledge_y(zA, 0.93) + 0.075
        # stalk
        box(d, (xb + s * 0.035, yb - 0.035, zA), (0.08, 0.035, 0.07), M["trim"])
        # housing: tapered towards the front
        fs = box(d, (xb + s * 0.13, yb, zA - 0.005), (0.19, 0.115, 0.075), M["paint"], taper=(0.92, 0.80))
        chamfer_faces(d, fs, 0.012)
    # mirror glass: a dark plate on the rear face
    for s in (1, -1):
        xb = s * (xg0(zA) + 0.01); yb = ledge_y(zA, 0.93) + 0.075
        c0 = (xb + s * 0.13, yb, zA - 0.005 - 0.0375 - 0.0012)
        w_, h_ = 0.085, 0.048
        d.face([(c0[0] - w_, c0[1] - h_, c0[2]), (c0[0] - w_, c0[1] + h_, c0[2]), (c0[0] + w_, c0[1] + h_, c0[2]), (c0[0] + w_, c0[1] - h_, c0[2])], M["housing"], share=False, out=(0, 0, -1))
    # door handles
    hz = []
    if P["doors"] in (4, 5): hz = [z_b + 0.20, seams[-1] + 0.18]
    elif P["doors"] == "slide": hz = [z_b + 0.20, seams[-1] + 0.20]
    else: hz = [z_b + 0.20]
    for z in hz:
        yh = side_y(L4, z) - 0.035
        t = (yh - side_y(L3, z)) / (side_y(L4, z) - side_y(L3, z))
        xs = lerp(side_x(L3, z), side_x(L4, z), t)
        for s in (1, -1):
            fs = box(d, (s * (xs + 0.002), yh, z), (0.022, 0.026, 0.135), M["paint_dark"])
            chamfer_faces(d, fs, 0.006)
            box(d, (s * (xs - 0.004), yh - 0.004, z), (0.012, 0.034, 0.16), M["liner"])   # recess behind
    # wipers
    for s, kx in ((1, 0.55), (-1, -0.05)):
        zw = z_ws0 - 0.05
        y0 = ledge_y(zw, 0.5) + 0.03
        box(d, (kx * xg0(zw) * 0.5 + s * 0.0, y0, zw - 0.03), (0.62, 0.014, 0.018), M["trim"],
            rot=lambda p: (p[0] * math.cos(0.12) - p[2] * math.sin(0.12) * 0, p[1] + p[0] * 0.10, p[2] - p[0] * 0.08))
    # side repeaters (amber, on the front wings behind the arch)
    for s in (1, -1):
        zr_ = zfa - RW - 0.16
        y_ = side_y(L3, zr_) + 0.06
        box(d, (s * (side_x(L3, zr_) - 0.002), y_, zr_), (0.012, 0.022, 0.055), M["amber"])
    # rear wiper on hatch / estate / van tailgates
    if P["back"] in ("hatch", "estate", "van"):
        B = Vector([p for p, nm in r0 if nm == "r"][-1]); Tp = Vector([p for p, nm in r1 if nm == "r"][-1])
        B = Vector(r0[len(r0) // 2][0]) if False else B
        cen0 = [p for p, nm in r0 if nm == "r"]; cen1 = [p for p, nm in r1 if nm == "r"]
        B = Vector(min(cen0, key=lambda q: abs(q[0]))); Tp = Vector(min(cen1, key=lambda q: abs(q[0])))
        v = (Tp - B).normalized(); u = Vector((1, 0, 0)); nrm = v.cross(u).normalized()
        if nrm.z > 0: nrm = -nrm                               # out of the tailgate (towards -z)
        ang = 0.35
        ua = (u * math.cos(ang) + v * math.sin(ang)).normalized()
        piv = B + v * 0.07 + nrm * 0.012
        def frame_rot(o, ax, ay, az):
            return lambda p: tuple(ax * p[0] + ay * p[1] + az * p[2])
        box(d, tuple(piv), (0.03, 0.025, 0.03), M["trim"], rot=frame_rot(piv, u, nrm, v))
        arm_c = piv + ua * 0.17 + nrm * 0.006
        box(d, tuple(arm_c), (0.34, 0.012, 0.014), M["trim"], rot=frame_rot(arm_c, ua, nrm, v))
    # roof rails / fin
    if P.get("rails"):
        for s in (1, -1):
            za, zb = z_hdr - 0.22, z_rtop + 0.12
            xr = s * (x2((za + zb) / 2) - 0.06)
            fs = box(d, (xr, roof_y + 0.045, (za + zb) / 2), (0.035, 0.022, za - zb), M["trim"])
            chamfer_faces(d, fs, 0.006)
            for zz in (za - 0.03, zb + 0.03):
                box(d, (xr, roof_y + 0.02, zz), (0.04, 0.04, 0.06), M["trim"])
    elif not van:
        zfin = z_rtop + 0.20
        fs = box(d, (0, roof_y + 0.028, zfin), (0.06, 0.05, 0.17), M["paint"], taper=(0.4, 0.35))
        chamfer_faces(d, fs, 0.006)
    # Brussels taxi (Wikimedia Commons, 2012-2026: Skoda Octavia / Toyota Corolla TS taxis): black, a two-row yellow
    # and black chequer band along the doors under the windows, a yellow licence number on the rear door, a black
    # roof sign with amber TAXI letters (lit)
    if P.get("taxi"):
        zs = (z_hdr + z_rtop) / 2 + 0.10
        fs = box(d, (0, roof_y + 0.09, zs), (0.56, 0.13, 0.17), M["housing"], taper=(0.92, 0.86))
        chamfer_faces(d, fs, 0.010)
        box(d, (0, roof_y + 0.012, zs), (0.36, 0.04, 0.10), M["trim"])
        for face_s in (1, -1):
            zface = zs + face_s * 0.0865
            text_quads(d, "TAXI", lambda u, v, fs_=face_s, zf_=zface: (u * fs_, roof_y + 0.092 + v, zf_), 0.062, M["sign"], out=(0, 0, face_s))
        # chequer band: squares on the shoulder facet (between L4 and the belt), from the front to the rear door
        sq = 0.034
        za, zb = seams[0] - 0.05, seams[-1] + 0.03
        nsq = int((za - zb) / sq)
        def side_pt(sgn, z, t, off):
            y = lerp(side_y(L4, z), side_y(TOP, z), t)
            x = lerp(side_x(L4, z), side_x(TOP, z), t) + off
            return (sgn * x, y, z)
        for sgn in (1, -1):
            for i in range(nsq):
                for row in (0, 1):
                    if (i + row) % 2: continue
                    z0, z1 = za - i * sq, za - (i + 1) * sq
                    t0, t1 = 0.12 + row * 0.38, 0.12 + (row + 1) * 0.38
                    pts = [side_pt(sgn, z0, t0, 0.0016), side_pt(sgn, z1, t0, 0.0016), side_pt(sgn, z1, t1, 0.0016), side_pt(sgn, z0, t1, 0.0016)]
                    d.face(pts, M["taxi_yellow"], share=False, out=(sgn, 0.35, 0))
            # licence number on the rear door, under the band
            zn = seams[-1] + 0.20
            yn = side_y(L3, zn) + 0.13
            xn = lerp(side_x(L3, zn), side_x(L4, zn), (yn - side_y(L3, zn)) / (side_y(L4, zn) - side_y(L3, zn))) + 0.0016
            text_quads(d, "1403", lambda u, v, sg=sgn, z_=zn, y_=yn, x_=xn: (sg * x_, y_ + v, z_ - u * sg), 0.05, M["taxi_yellow"], out=(sgn, 0, 0))
    # exhaust
    zx = zrear(1, 0.6) + 0.06
    ex_c = (0.45 * hw, GC + 0.06, zx)
    ringA = [(ex_c[0] + 0.028 * math.cos(2 * math.pi * k / 8), ex_c[1] + 0.028 * math.sin(2 * math.pi * k / 8), ex_c[2] + 0.10) for k in range(8)]
    ringB = [(p[0], p[1], ex_c[2] - 0.06) for p in ringA]
    ringC = [(ex_c[0] + 0.020 * math.cos(2 * math.pi * k / 8), ex_c[1] + 0.020 * math.sin(2 * math.pi * k / 8), ex_c[2] - 0.06) for k in range(8)]
    ringD = [(p[0], p[1], ex_c[2] - 0.01) for p in ringC]
    for k in range(8):
        k1 = (k + 1) % 8
        rad = lambda q: ((q[0] - ex_c[0]), (q[1] - ex_c[1]), 0.0)
        d.face([ringA[k], ringA[k1], ringB[k1], ringB[k]], M["chrome"], share=False, out=rad(ringA[k]))
        d.face([ringB[k], ringB[k1], ringC[k1], ringC[k]], M["chrome"], share=False, out=(0, 0, -1))
        d.face([ringC[k], ringC[k1], ringD[k1], ringD[k]], M["liner"], share=False, out=tuple(-v for v in rad(ringC[k])))
    d.face(ringD, M["liner"], share=False, out=(0, 0, -1))

    # ---- interior: dashboard, seats, steering wheel, headliner
    # cabin heights from the belt: cushion top HB - 0.40, backrest to + 0.62, headrests to + 0.80 (under the roof)
    yc = HB - 0.40
    zd0, zd1 = z_ws0 - 0.18, z_ws0 - 0.62
    box(d, (0, HB - 0.03, (zd0 + zd1) / 2), (2 * xg0(zd1) * 0.97, 0.26, zd0 - zd1), M["interior"])
    box(d, (xg0(zd1) * 0.50, HB + 0.11, zd1 + 0.07), (0.34, 0.06, 0.14), M["interior"])      # binnacle
    seat_rows = [z_b + 0.18]
    if not (P["doors"] == "panel"): seat_rows.append(seams[-1] + 0.05 if P["doors"] != "slide" else seams[-1] + 0.20)
    xs_ = xg0(z_b) * 0.50
    for ri, zs in enumerate(seat_rows):
        xs_list = (xs_, -xs_) if ri == 0 else (xs_ * 1.05, 0.0, -xs_ * 1.05)
        for x in xs_list:
            wseat = 0.48 if ri == 0 else 0.42
            box(d, (x, yc - 0.06, zs + 0.12), (wseat, 0.12, 0.46), M["seat"])
            box(d, (x, yc + 0.31, zs - 0.12), (wseat * 0.96, 0.60, 0.11), M["seat"], rot=lambda p: (p[0], p[1], p[2] - p[1] * 0.22))
            box(d, (x, yc + 0.72, zs - 0.215), (0.25, 0.15, 0.085), M["seat"])
            box(d, (x, yc + 0.635, zs - 0.21), (0.03, 0.05, 0.03), M["trim"])          # headrest post
    # steering wheel (left-hand drive: +x is the left), 10-sided ring
    sx_, sy_, sz_ = xs_, HB + 0.02, zd1 - 0.12
    tilt_ = 0.45
    ringO, ringI = [], []
    for k in range(10):
        a_ = 2 * math.pi * k / 10
        for (rr, lst) in ((0.19, ringO), (0.165, ringI)):
            u, v = rr * math.cos(a_), rr * math.sin(a_)
            lst.append((sx_ + u, sy_ + v * math.cos(tilt_), sz_ + v * math.sin(tilt_)))
    for k in range(10):
        k1 = (k + 1) % 10
        nz = (0, -math.sin(tilt_), math.cos(tilt_))
        d.face([ringO[k], ringO[k1], ringI[k1], ringI[k]], M["trim"], share=False, out=nz)
        d.face([ringI[k], ringI[k1], ringO[k1], ringO[k]], M["trim"], share=False, out=tuple(-v for v in nz))
    box(d, (sx_, sy_ - 0.03, sz_ + 0.05), (0.05, 0.12, 0.05), M["trim"])
    det = d.obj(f"{cid}_details", recalc=False)
    # double-sided rings: the recalc may flip; fine (both windings present)
    parts.append(det)

    # headliner: the roof seen from inside (a downward-facing copy of the roof crown, 4 cm lower)
    hl = MB()
    hl.face([(p[0] * 0.98, roof_y - 0.06, p[2]) for p, _ in r2], M["interior"])
    hlo = hl.obj(f"{cid}_headliner", recalc=False)
    for poly in hlo.data.polygons:
        pass
    # make it face down
    bmh = bmesh.new(); bmh.from_mesh(hlo.data)
    for f in bmh.faces:
        if f.normal.z > 0: f.normal_flip()
    bmh.to_mesh(hlo.data); bmh.free()
    parts.append(hlo)

    # ---- wheel (left: rim face towards +x), at the origin
    wheel = build_wheel(RW, TW, RR)
    wpos = {"FL": (P["track"] / 2, RW, zfa), "FR": (-P["track"] / 2, RW, zfa), "RL": (P["track"] / 2, RW, zra), "RR": (-P["track"] / 2, RW, zra)}
    return parts, wheel, wpos, dict(zf=zf, zr=zr, H=roof_y + 0.012)

def build_wheel(RW, TW, RR):
    w = MB()
    N = 18
    h = TW / 2
    # tyre: closed cross-section loop (r, x): outer bead -> sidewall -> shoulder -> tread (groove) -> other side -> barrel
    prof = [(RR - 0.004, h * 0.80), (RR + 0.035, h * 0.98), (lerp(RR, RW, 0.55), h * 1.03), (RW - 0.024, h * 0.93),
            (RW, h * 0.62), (RW, h * 0.12), (RW - 0.009, h * 0.06),
            (RW - 0.009, -h * 0.06), (RW, -h * 0.12), (RW, -h * 0.62),
            (RW - 0.024, -h * 0.93), (lerp(RR, RW, 0.55), -h * 1.03), (RR + 0.035, -h * 0.98), (RR - 0.004, -h * 0.80),
            (RR - 0.004, h * 0.80)]
    def tmat(k):
        if k in (1, 2, 11, 12): return M["tyre_side"]
        return M["tyre"]
    def blocks(k, s, r):   # shoulder blocks: alternate segments dip (tread hint)
        if k in (3, 10): return r - (0.007 if s % 2 else 0.0)
        return r
    closed = []
    closed += lathe(w, prof, N, tmat, rfn=blocks)[0]
    # rim: lip, dish, barrel (closed ring)
    rp = [(RR + 0.002, h * 0.80), (RR - 0.004, h * 0.86), (RR - 0.016, h * 0.84), (RR - 0.030, h * 0.62),
          (RR - 0.030, -h * 0.60), (RR + 0.002, -h * 0.78), (RR + 0.002, h * 0.80)]
    closed += lathe(w, rp, N, lambda k: M["rim"] if k <= 2 else M["rim_dark"], phase=math.pi / N)[0]
    # weld each lathe's seams so it is a closed shell, outward normals
    bmesh.ops.remove_doubles(w.bm, verts=list({v for f in closed for v in f.verts}), dist=1e-6)
    closed = [f for f in w.bm.faces if f.is_valid]
    bmesh.ops.recalc_face_normals(w.bm, faces=closed)
    # back disc (hides the inside), brake disc, caliper
    back = [(-h * 0.45, (RR - 0.03) * math.cos(2 * math.pi * k / N), (RR - 0.03) * math.sin(2 * math.pi * k / N)) for k in range(N)]
    disc(w, back, M["rim_dark"], out=(1, 0, 0))
    bd = [(h * 0.05, 0.80 * RR * math.cos(2 * math.pi * k / 12), 0.80 * RR * math.sin(2 * math.pi * k / 12)) for k in range(12)]
    disc(w, bd, M["disc"], out=(1, 0, 0))
    box(w, (h * 0.12, 0.62 * RR, -0.35 * RR), (0.05, 0.10, 0.12), M["caliper"])
    # spokes: 5 faceted V-spokes from the hub to the lip, face at x = h * 0.55 (dish), ridge proud
    xf = h * 0.60
    for i in range(5):
        a0 = 2 * math.pi * i / 5
        secs = []
        for (r, half, depth) in ((0.060, 0.050, 0.035), (0.5 * (0.06 + RR - 0.02), 0.060, 0.030), (RR - 0.022, 0.085, 0.020)):
            ang = half * (0.075 / max(r, 0.06)) * 1.6
            pts = []
            for (da, dx) in ((-ang, -depth), (-ang, 0.0), (0.0, 0.010), (ang, 0.0), (ang, -depth)):
                a = a0 + da
                rr = r if dx != 0.010 else r
                pts.append((xf + dx, rr * math.cos(a), rr * math.sin(a)))
            secs.append(pts)
        for s_ in range(len(secs) - 1):
            rm = 0.5 * ((0.060, 0.5 * (0.06 + RR - 0.02), RR - 0.022)[s_] + (0.060, 0.5 * (0.06 + RR - 0.02), RR - 0.022)[s_ + 1])
            axis_pt = (xf - 0.03, rm * math.cos(a0), rm * math.sin(a0))
            for k in range(4):
                w.face([secs[s_][k], secs[s_][k + 1], secs[s_ + 1][k + 1], secs[s_ + 1][k]], M["rim"], share=False, out=("from", axis_pt))
            w.face([secs[s_][4], secs[s_][0], secs[s_ + 1][0], secs[s_ + 1][4]], M["rim_dark"], share=False, out=(-1, 0, 0))
    # hub + centre cap (8 sides)
    hub_o = [(xf + 0.005, 0.065 * math.cos(2 * math.pi * k / 8), 0.065 * math.sin(2 * math.pi * k / 8)) for k in range(8)]
    hub_b = [(xf - 0.03, p[1], p[2]) for p in hub_o]
    cap = [(xf + 0.016, 0.035 * math.cos(2 * math.pi * k / 8), 0.035 * math.sin(2 * math.pi * k / 8)) for k in range(8)]
    for k in range(8):
        k1 = (k + 1) % 8
        w.face([hub_b[k], hub_b[k1], hub_o[k1], hub_o[k]], M["rim"], share=False, out=("from", (xf - 0.01, 0, 0)))
        w.face([hub_o[k], hub_o[k1], cap[k1], cap[k]], M["rim"], share=False, out=("from", (xf - 0.03, 0, 0)))
    w.face(cap, M["chrome"], share=False, out=(1, 0, 0))
    # lug nuts: 5 small hexes
    for i in range(5):
        a = 2 * math.pi * (i + 0.5) / 5
        cy, cz = 0.048 * math.cos(a), 0.048 * math.sin(a)
        ra = [(xf + 0.006, cy + 0.009 * math.cos(2 * math.pi * k / 6), cz + 0.009 * math.sin(2 * math.pi * k / 6)) for k in range(6)]
        rb = [(xf + 0.014, p[1], p[2]) for p in ra]
        for k in range(6):
            w.face([ra[k], ra[(k + 1) % 6], rb[(k + 1) % 6], rb[k]], M["chrome"], share=False, out=("from", (xf, cy, cz)))
        w.face(rb, M["chrome"], share=False, out=(1, 0, 0))
    bm_ = w.bm
    w.bm = bm_
    me = bpy.data.meshes.new("wheel"); bm_.to_mesh(me); bm_.free()
    for m in MATS: me.materials.append(m)
    o = bpy.data.objects.new("wheel", me); scn.collection.objects.link(o)
    return o

# ------------------------------------------------------------------------------------------------ bake + export
def bake_ao(objs, occluders_extra=()):
    """Two Cycles AO bakes per vertex: 'ao' over 0.9 m (body mass, ground, arches) and 'ao_s' over 0.22 m (contact
    darkening in seams, sills, lamp recesses, under the mirrors); ao_of multiplies them."""
    for o in scn.objects: o.select_set(False)
    for o in objs:
        me = o.data
        for a in list(me.color_attributes): me.color_attributes.remove(a)
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for name, dist in (("ao", 0.9), ("ao_s", 0.22)):
        for o in objs:
            ca = o.data.color_attributes.new(name, "FLOAT_COLOR", "POINT")
            o.data.color_attributes.active_color = ca
        world.light_settings.distance = dist
        if BAKE:
            bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")

def ao_of(o):
    a = o.data.color_attributes.get("ao"); b = o.data.color_attributes.get("ao_s")
    if not a or not BAKE: return [1.0] * len(o.data.vertices)
    if not b: return [d.color[0] for d in a.data]
    return [x.color[0] * lerp(1.0, y.color[0], 0.75) for x, y in zip(a.data, b.data)]

def tri_soup(objs, mirror_x=False, origin=(0, 0, 0), ao_lift=0.0):
    """-> pos, nrm, col, kind arrays (per corner), in car coords relative to origin."""
    pos, nrm, col, kind = [], [], [], []
    for o in objs:
        me = o.data
        me.calc_loop_triangles()
        ao = ao_of(o)
        mw = o.matrix_world
        V = [mw @ v.co for v in me.vertices]
        for t in me.loop_triangles:
            pi = me.polygons[t.polygon_index]
            name, kd, rgb = PAL[pi.material_index]
            vs = list(t.vertices)
            P3 = [(V[i].x, V[i].z, -V[i].y) for i in vs]
            if mirror_x:
                P3 = [(-p[0], p[1], p[2]) for p in P3]; P3 = [P3[0], P3[2], P3[1]]; vs = [vs[0], vs[2], vs[1]]
            P3 = [(p[0] - origin[0], p[1] - origin[1], p[2] - origin[2]) for p in P3]
            a, b, c = Vector(P3[0]), Vector(P3[1]), Vector(P3[2])
            nn = (b - a).cross(c - a)
            if nn.length < 1e-12: continue
            nn.normalize()
            for k in range(3):
                occ = ao[vs[k]]
                occ = lerp(1.0, occ, 0.92) ** 1.15
                occ = max(occ, ao_lift)
                if kd in (2,): occ = lerp(occ, 1.0, 0.6)          # lamps are bright inside
                pos += P3[k]; nrm += (nn.x, nn.y, nn.z)
                col += (rgb[0] * occ, rgb[1] * occ, rgb[2] * occ); kind.append(kd)
    return weld(pos, nrm, col, kind)

def weld(pos, nrm, col, kind):
    m, P, N, Cc, K, I = {}, [], [], [], [], []
    for k in range(len(kind)):
        key = (round(pos[3*k], 5), round(pos[3*k+1], 5), round(pos[3*k+2], 5), round(nrm[3*k], 4), round(nrm[3*k+1], 4),
               round(nrm[3*k+2], 4), round(col[3*k], 4), round(col[3*k+1], 4), round(col[3*k+2], 4), kind[k])
        i = m.get(key)
        if i is None:
            i = len(K); m[key] = i
            P += pos[3*k:3*k+3]; N += nrm[3*k:3*k+3]; Cc += col[3*k:3*k+3]; K.append(kind[k])
        I.append(i)
    return dict(pos=P, nrm=N, col=Cc, kind=K, idx=I)

def write_glb(path, cars):
    chunks, views, accessors, meshes, nodes = [], [], [], [], []
    off = [0]
    def push(data, target=None):
        pad = (4 - len(data) % 4) % 4
        views.append(dict(buffer=0, byteOffset=off[0], byteLength=len(data), **({"target": target} if target else {})))
        chunks.append(data + b"\0" * pad); off[0] += len(data) + pad
        return len(views) - 1
    def acc(arr, typ, comp, minmax=False, target=None):
        ncomp = {"SCALAR": 1, "VEC3": 3}[typ]
        fmt = {5126: "f", 5125: "I", 5123: "H"}[comp]
        data = struct.pack(f"<{len(arr)}{fmt}", *arr)
        a = dict(bufferView=push(data, target), componentType=comp, count=len(arr) // ncomp, type=typ)
        if minmax:
            a["min"] = [min(arr[k::ncomp]) for k in range(ncomp)]; a["max"] = [max(arr[k::ncomp]) for k in range(ncomp)]
        accessors.append(a); return len(accessors) - 1
    roots = []
    for car in cars:
        kids = []
        done = {}
        for name, (mesh, origin) in car["parts"].items():
            if id(mesh) in done:      # the left / right wheels share one mesh
                nodes.append(dict(name=name, mesh=done[id(mesh)], translation=[round(v, 5) for v in origin]))
                kids.append(len(nodes) - 1); continue
            nv = len(mesh["kind"])
            prim = dict(attributes=dict(POSITION=acc(mesh["pos"], "VEC3", 5126, True, 34962), NORMAL=acc(mesh["nrm"], "VEC3", 5126, False, 34962),
                                        COLOR_0=acc(mesh["col"], "VEC3", 5126, False, 34962), _KIND=acc([float(k) for k in mesh["kind"]], "SCALAR", 5126, False, 34962)),
                        indices=acc(mesh["idx"], "SCALAR", 5125 if nv > 65535 else 5123, False, 34963), material=0)
            meshes.append(dict(name=f"{car['id']}_{name}", primitives=[prim])); done[id(mesh)] = len(meshes) - 1
            nodes.append(dict(name=name, mesh=len(meshes) - 1, translation=[round(v, 5) for v in origin]))
            kids.append(len(nodes) - 1)
        nodes.append(dict(name=car["id"], children=kids, extras=dict(label=car["label"], type=car["type"], paint=[round(v, 4) for v in car["paint"]],
                                                                    keepPaint=car["keepPaint"], size=car["size"], tris=car["tris"])))
        roots.append(len(nodes) - 1)
    js = dict(asset=dict(version="2.0", generator="uccle-city tools/blender/carFaceted.py", copyright="uccle-city, scripted (CC0-compatible, original design)"),
              scene=0, scenes=[dict(nodes=roots)], nodes=nodes, meshes=meshes, accessors=accessors, bufferViews=views,
              buffers=[dict(byteLength=off[0])],
              materials=[dict(name="CarPalette", pbrMetallicRoughness=dict(baseColorFactor=[1, 1, 1, 1], metallicFactor=0, roughnessFactor=0.6))])
    jb = json.dumps(js, separators=(",", ":")).encode(); jb += b" " * ((4 - len(jb) % 4) % 4)
    bin_ = b"".join(chunks)
    with open(path, "wb") as fh:
        fh.write(struct.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + 8 + len(bin_)))
        fh.write(struct.pack("<II", len(jb), 0x4E4F534A)); fh.write(jb)
        fh.write(struct.pack("<II", len(bin_), 0x004E4942)); fh.write(bin_)

# ------------------------------------------------------------------------------------------------ scene for the bake
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
scn.cycles.samples = SAMPLES
scn.render.bake.target = "VERTEX_COLORS"
world = bpy.data.worlds.new("w"); scn.world = world
world.light_settings.distance = 0.9
gmb = MB()
gmb.face([(-400, 0, -400), (400, 0, -400), (400, 0, 400), (-400, 0, 400)], M["under"])
ground = gmb.obj("ground")

results = []
built = {}
t0 = time.time()
for cid, P in TYPES.items():
    if ONLY and cid not in ONLY: continue
    tc = time.time()
    parts, wheel, wpos, info = build_car(cid, P)
    # four wheels in place as occluders for the body bake
    wobjs = []
    for k, (x, y, z) in wpos.items():
        o = wheel.copy(); o.data = wheel.data; scn.collection.objects.link(o)
        o.location = C((x, y, z)); o.scale = (1 if x > 0 else -1, 1, 1)
        wobjs.append(o)
    wheel.location = (0, 0, 80)          # the wheel's own bake: alone, high above everything
    bake_ao(parts)
    bake_ao([wheel])
    body = tri_soup(parts)
    wl = tri_soup([wheel], origin=(wheel.location.x, wheel.location.z, -wheel.location.y))
    wr = tri_soup([wheel], mirror_x=True, origin=(-wheel.location.x, wheel.location.z, -wheel.location.y))
    tris = len(body["idx"]) // 3 + 2 * len(wl["idx"]) // 3 + 2 * len(wr["idx"]) // 3
    lo = [min(body["pos"][k::3]) for k in range(3)]; hi = [max(body["pos"][k::3]) for k in range(3)]
    size = [round(P["W"], 3), round(hi[1] - 0.0, 3), round(hi[2] - lo[2], 3)]    # body width (mirrors not counted)
    car = dict(id=cid, label=P["label"], type=P["type"], paint=P["paint"], keepPaint=bool(P.get("keepPaint")), size=size, tris=tris,
               parts={"Body": (body, (0, 0, 0)), "Wheel_FL": (wl, wpos["FL"]), "Wheel_FR": (wr, wpos["FR"]), "Wheel_RL": (wl, wpos["RL"]), "Wheel_RR": (wr, wpos["RR"])})
    results.append(car)
    print(f"[carFaceted] {cid}: {tris} tris (body {len(body['idx']) // 3}, wheel {len(wl['idx']) // 3}), size {size}, {time.time() - tc:.1f}s")
    built[cid] = (parts, wobjs, wheel, wpos, info)
    # out of the way of the next car's bake (previews move it back)
    if not PREVIEW:
        for o in parts + wobjs + [wheel]:
            bpy.data.objects.remove(o)
    else:
        wheel.hide_render = True
        for o in parts + wobjs: o.location.x += 30 * len(built)
        info["dx"] = 30 * len(built)

glb = os.path.join(OUT, "faceted.glb")
write_glb(glb, results)
print(f"[carFaceted] -> {glb} ({os.path.getsize(glb) / 1024:.0f} KB), {len(results)} cars, {time.time() - t0:.1f}s")

# ------------------------------------------------------------------------------------------------ previews (Cycles)
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    # materials for the preview: per palette entry, base colour from the 'pv' corner attribute
    for i, (name, kd, rgb) in enumerate(PAL):
        m = MATS[i]; m.use_nodes = True
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        at = nt.nodes.new("ShaderNodeAttribute"); at.attribute_name = "pv"
        nt.links.new(at.outputs["Color"], bsdf.inputs["Base Color"])
        rough = {1: 0.28, 4: 0.04, 5: 0.22, 6: 0.85, 7: 0.45, 8: 0.8}.get(kd, 0.55)
        bsdf.inputs["Roughness"].default_value = rough
        bsdf.inputs["Metallic"].default_value = {1: 0.0, 5: 1.0}.get(kd, 0.0)
        if kd == 1:
            bsdf.inputs["Coat Weight"].default_value = 1.0; bsdf.inputs["Coat Roughness"].default_value = 0.05
        if kd == 4:
            bsdf.inputs["Alpha"].default_value = 0.55
        if name == "ground": pass
    def set_pv(o, paint):
        me = o.data
        if "pv" in me.color_attributes: me.color_attributes.remove(me.color_attributes["pv"])
        pv = me.color_attributes.new("pv", "FLOAT_COLOR", "CORNER")
        ao = ao_of(o)
        for poly in me.polygons:
            name, kd, rgb = PAL[poly.material_index]
            for li in poly.loop_indices:
                occ = lerp(1.0, ao[me.loops[li].vertex_index], 0.92) ** 1.15
                c = [rgb[k] * (paint[k] if kd == 1 else 1) * occ for k in range(3)]
                pv.data[li].color = (*c, 1)
    gm = bpy.data.materials.new("groundpv"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.16, 0.165, 1)
    gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    ground.data.materials.clear(); ground.data.materials.append(gm)
    world.use_nodes = True
    bg = world.node_tree.nodes["Background"]
    sky = world.node_tree.nodes.new("ShaderNodeTexSky")
    try: sky.sky_type = "NISHITA"
    except Exception: pass
    world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.16
    sun = bpy.data.lights.new("sun", "SUN"); sun.energy = 2.6; sun.angle = math.radians(3)
    so = bpy.data.objects.new("sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(-35))
    cam = bpy.data.cameras.new("cam"); cam.lens = 55
    co = bpy.data.objects.new("cam", cam); scn.collection.objects.link(co); scn.camera = co
    scn.render.resolution_x, scn.render.resolution_y = 1280, 720
    scn.cycles.samples = PV_SAMPLES; scn.cycles.use_denoising = True
    scn.view_settings.view_transform = "AgX"
    for lk in ("AgX - Punchy", "Punchy"):
        try: scn.view_settings.look = lk; break
        except Exception: pass
    scn.view_settings.exposure = -0.45
    def look_at(eye, target):
        co.location = C(eye)
        d_ = C(target) - C(eye)
        co.rotation_euler = d_.to_track_quat("-Z", "Y").to_euler()
    def hide_all_but(keep):
        for o in scn.objects:
            if o.type == "MESH": o.hide_render = o not in keep and o is not ground
    for cid, (parts, wobjs, wheel, wpos, info) in built.items():
        paint = TYPES[cid]["paint"]
        for o in parts + [wheel]: set_pv(o, paint)
        for o in parts + wobjs: o.location.x -= info["dx"]
        hide_all_but(parts + wobjs)
        H = info["H"]; Lc = TYPES[cid]["L"]
        look_at((3.6 + Lc * 0.25, 1.35, info["zf"] + 3.4 + Lc * 0.2), (0, H * 0.42, 0.25))
        scn.render.filepath = os.path.join(PREVIEW, f"faceted_{cid}_front.png"); bpy.ops.render.render(write_still=True)
        look_at((-3.4 - Lc * 0.25, 1.45, info["zr"] - 3.2 - Lc * 0.2), (0, H * 0.42, -0.2))
        scn.render.filepath = os.path.join(PREVIEW, f"faceted_{cid}_rear.png"); bpy.ops.render.render(write_still=True)
        print(f"[carFaceted] previews {cid}")
        for o in parts + wobjs: o.location.x += info["dx"]
    # lineup: every car side by side along x
    if len(built) > 1:
        keep = []
        x = 0.0
        ids = list(built)
        for i, cid in enumerate(ids):
            parts, wobjs, wheel, wpos, info = built[cid]
            dz = -i * 0.0
            for o in parts + wobjs:
                o.location.x += x - info["dx"]
            keep += parts + wobjs
            x -= TYPES[cid]["W"] + 1.2
        hide_all_but(keep)
        x_last = x + TYPES[ids[-1]]["W"] + 1.2           # centre of the last car
        mid = x_last / 2
        span = abs(x_last) + 2.6
        cam.lens = 30                                     # 36 mm sensor: 62 degrees across
        dist = (span / 2 + 1.0) / math.tan(math.atan(18 / 30))
        look_at((mid + 0.22 * dist, 0.13 * dist, 1.6 + 0.95 * dist), (mid, 0.85, 0.6))
        scn.render.resolution_x, scn.render.resolution_y = 1920, 480
        scn.render.filepath = os.path.join(PREVIEW, "faceted_lineup.png"); bpy.ops.render.render(write_still=True)
