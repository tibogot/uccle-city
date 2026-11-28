"""THE KID'S 90s FREESTYLE BMX (docs/BMX.md, docs/KIDGAME.md): a 20" chromoly freestyle bike, every part scripted.
Blender 5.0, headless, Cycles on OPTIX:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/bmx.py -- [--colourway blue|red|purple] [--no-bake] [--renders] [--checker]
    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/bmx.py -- --textures
        (renders the chain strip and the spoke set into docs/bike/tex/*.png; then python tools/bike/bmx_textures.py -> KTX2)
    python tools/bike/bmx_textures.py --sheet   (after --renders: docs/bike/turntable.jpg from the 8 turntable frames)
    node tools/bike/bmx_pack.mjs        models/bike/bmx.raw.glb -> models/bike/bmx.glb (meshopt, KTX2 textures, mesh audit)

Style (owner 2026-11-18): "stylised but grounded": real proportions and parts, clean readable shapes, soft bevels, nice
paint and chrome, no hyper-detail. LOD0 ~12-15k triangles.

What a 90s freestyle BMX is (references looked at only: catalogue photos of late-80s / early-90s chromoly freestyle
bikes): a round-tube chromoly frame (head tube 35 mm, down tube 1 1/4", top tube 1", seat tube 1 1/8", chain stays
7/8", seat stays 5/8"-3/4") with flat gussets at the head tube, horizontal rear dropouts, U-brake bosses on the seat
stays + a seat-stay bridge, a painted chromoly fork with a forged crown; 7.5" rise 2-piece bars with a crossbar,
mushroom grips, a forged quill stem with a 4-bolt front clamp, pads on the top tube, crossbar and stem; a 3-piece
chromoly crank (175 mm) with a 5-arm spider and a 44T ring, 16T cog (one gear, 4.39 m a crank turn: docs/BIKE.md);
alloy platform pedals with pins; 36-spoke 3-cross wheels on chrome 20" rims, knobby 20 x 2.0 tyres; 4 chromoly pegs;
a rear U-brake fed through a gyro (detangler: a lower plate on the frame, an upper plate turning with the bars).
Lab geometry (viewer/bike/bikePhysics.js on claude/bike): wheelbase 0.95 m, wheel radius 0.254 m; head angle 74 deg.

Output (glTF frame: x LEFT, y UP, z FORWARD; root origin = the ground midway between the axles; 1 unit = 1 m):
  BMX                      root (identity)
    Body                   the frame, seat + post, rear brake, gyro lower plate, rear pegs, BB cups, chain (identity)
      Body_LOD0/1/2        meshes (one primitive per material slot)
      Steer                pivot ON the steering axis (head-tube middle), rotated so its local +Y IS the steering axis
                           (up, 16 deg back from vertical): steer = rotate about local +Y (+ = left turn)
        Steer_LOD0/1/2     fork, crown, headset nut, gyro upper plate, stem, bars, grips, lever, cables, front pegs
        Wheel_F            pivot at the front axle, world-aligned at rest: spin about local +X (+ = rolling forward)
          Wheel_F_LOD0/1/2
        Grip_L, Grip_R     empties: the middle of each grip on its axis (the hands)
        Peg_FL, Peg_FR     empties: the top of each front peg, mid-length (the feet on a peg stall)
      Wheel_R              pivot at the rear axle: spin about local +X
        Wheel_R_LOD0/1/2
      Cog                  pivot at the rear axle (the 16T cog + driver: turn = crank * 44 / 16 while pedalling)
        Cog_LOD0/1/2
      Crank                pivot at the bottom bracket: turn about local +X (+ = pedalling forward); at rest the right
                           (drive side) arm points FORWARD, the left arm back
        Crank_LOD0/1/2     arms, spindle, spider, 44T ring, bolts
        Pedal_L, Pedal_R   pivots at the pedal spindles: counter-rotate (rotation.x = -crank) to stay level
          Pedal_*_LOD0/1/2
          Foot_L, Foot_R   empties: the pedal's top face centre (the feet)
      Seat                 empty: the saddle's top centre (the seat contact)
      Peg_RL, Peg_RR       empties: the top of each rear peg, mid-length
      Contact_F, Contact_R empties: the tyre contact points at rest (under each axle, on the ground)
  Slots (named, the viewer may rebind by name): bmx_paint (frame + fork: the colourway colour, clear coat), bmx_chrome,
  bmx_metal (polished alloy), bmx_black (black anodised / steel), bmx_rubber (tyres, brake pads), bmx_grip, bmx_saddle,
  bmx_pad, bmx_cable, bmx_chain (alpha-tested strip, KTX2), bmx_spokes (blended pre-filtered spoke cards, KTX2).
  COLOR_0 = baked vertex AO (each node alone, Cycles); TEXCOORD_0 in metres (chain: u in 2-link periods, spokes: card).
  models/bike/bmx.json: the rig numbers (axes, pivots, empties, dimensions, colourways, chain UV speed, LOD tris).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kitlib as K
import twowheel_kit as T

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
opt = lambda k, d: ARGS[ARGS.index(k) + 1] if k in ARGS else d
ROOT = os.path.abspath(os.path.join(HERE, "..", ".."))
OUT = os.path.join(ROOT, "models", "bike")
DOCS = os.path.join(ROOT, "docs", "bike")
TEX = os.path.join(DOCS, "tex")
for d in (OUT, DOCS, TEX): os.makedirs(d, exist_ok=True)
COLOURWAY = opt("--colourway", "blue")
BAKE = "--no-bake" not in ARGS
RENDERS = "--renders" in ARGS
CHECKER = "--checker" in ARGS
SWATCH = "--swatch" in ARGS
V = lambda x, y, z: Vector((x, y, z))
X, Y, Z = V(1, 0, 0), V(0, 1, 0), V(0, 0, 1)


def lin(h):
    c = [((h >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(round(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4, 4) for x in c)


# 90s colourways: frame paint, pads, grips, saddle (sRGB hex -> linear)
COLOURWAYS = {
    "blue":   dict(paint=0x1d4fd8, pad=0xf2d21b, grip=0xf2d21b, saddle=0x151515, note="electric blue, neon yellow pads + grips"),
    "red":    dict(paint=0xc4141c, pad=0x161616, grip=0xe8e8e8, saddle=0x161616, note="flame red, black pads, white grips"),
    "purple": dict(paint=0x5a1f8c, pad=0x18b5a0, grip=0x18b5a0, saddle=0x18b5a0, note="purple pearl, mint pads, grips + saddle"),
}
if COLOURWAY not in COLOURWAYS: raise SystemExit(f"colourway {COLOURWAY}? one of {list(COLOURWAYS)}")
CWY = COLOURWAYS[COLOURWAY]

# ------------------------------------------------------------------------------------------------ geometry (build frame: X fwd, Y left, Z up)
WB, RW = 0.95, 0.254                       # wheelbase, tyre outer radius (docs/BIKE.md)
RA, FA = V(-WB / 2, 0, RW), V(WB / 2, 0, RW)
BB = V(-WB / 2 + 0.366, 0, 0.290)         # chain stay 0.366 m (14.4"), BB 0.29 m (11.4") high
HA, SA = math.radians(74), math.radians(71)
dS = V(-math.cos(HA), 0, math.sin(HA))    # steering axis, up
nS = V(math.sin(HA), 0, math.cos(HA))     # perpendicular to it, forward
OFF = 0.028                               # fork offset
A0 = FA - nS * OFF
ax = lambda s: A0 + dS * s                # a point on the steering axis
sT = V(-math.cos(SA), 0, math.sin(SA))    # seat tube, up
st = lambda s: BB + sT * s
HT0, HT1 = 0.330, 0.450                   # head tube along the axis
HTj, DTj = ax(0.420), ax(0.352)           # top / down tube meet the head tube axis
STj = st(0.262)                           # top tube meets the seat tube
STtop = st(0.300)
CL = -0.044                               # chain line (right side = -Y)
R_RING, R_COG = 0.0127 / (2 * math.sin(math.pi / 44)), 0.0127 / (2 * math.sin(math.pi / 16))
CRANK = 0.140          # (owner 2026-11-26: a kid's 20" BMX: 140 mm junior cranks for an 11-year-old of 1.45 m; 175 closed his knee to ~55 deg at the top)
PIVOT_STEER = ax(0.390)
RIM_BED, RIM_HOLE = 0.1945, 0.1945        # spoke bed = nipple seat radius (the nipples sit in the rim)
TYRE_RC = 0.2285                           # tyre section centre radius (carcass top 0.252, knobs to 0.2542)
SEAT_POST_TOP = st(0.395)
GRIP_Y = 0.337

DET = 0                                   # the LOD being built
S = lambda a, b, c: (a, b, c)[DET]


# ------------------------------------------------------------------------------------------------ materials (named slots)
def slot(name, col, rough, metal, coat=0.0):
    m = K.mat(name, col, rough, metal)
    b = m.node_tree.nodes["Principled BSDF"]
    if coat:
        b.inputs["Coat Weight"].default_value = coat
        b.inputs["Coat Roughness"].default_value = 0.04
    return m


def make_materials():
    """the slots (after the scene reset); preview / export values: the glTF factors the viewer starts from"""
    global PAINT, CHROME, METAL, BLACK, RUBBER, GRIP, SADDLE, PAD, CABLE, CHAIN, SPOKES
    K._MATS.clear()
    PAINT = slot("bmx_paint", lin(CWY["paint"]), 0.36, 0.35, coat=1.0)
    CHROME = slot("bmx_chrome", (0.62, 0.62, 0.64), 0.05, 1.0)
    METAL = slot("bmx_metal", (0.74, 0.74, 0.76), 0.28, 1.0)
    BLACK = slot("bmx_black", (0.025, 0.025, 0.028), 0.42, 0.5)
    RUBBER = slot("bmx_rubber", (0.028, 0.028, 0.028), 0.86, 0.0)
    GRIP = slot("bmx_grip", lin(CWY["grip"]), 0.75, 0.0)
    SADDLE = slot("bmx_saddle", lin(CWY["saddle"]), 0.42, 0.0)
    PAD = slot("bmx_pad", lin(CWY["pad"]), 0.55, 0.0)
    CABLE = slot("bmx_cable", (0.02, 0.02, 0.022), 0.30, 0.0)
    CHAIN = slot("bmx_chain", (0.45, 0.45, 0.45), 0.42, 0.85)
    SPOKES = slot("bmx_spokes", (0.85, 0.85, 0.85), 0.22, 1.0)
TEXTURED = {"bmx_chain": "chain_atlas.png", "bmx_spokes": "spokes.png"}


# ------------------------------------------------------------------------------------------------ the mesh builder (+ fixed UVs)
class Part(K.Part):
    """kitlib's Part + faces whose UVs are set by hand (the chain strip, the spoke cards)"""
    def __init__(self, name):
        super().__init__(name)
        self.fix = self.bm.faces.layers.int.new("fixed")
        self.fuv = self.bm.loops.layers.uv.new("fixuv")

    def add_fixed(self, m, verts, faces, uvs):
        si = self.slot(m)
        vs = [self.bm.verts.new(v) for v in verts]
        for f, u in zip(faces, uvs):
            try: nf = self.bm.faces.new([vs[i] for i in f])
            except ValueError: continue
            nf[self.slot_layer] = si; nf[self.fix] = 1; nf.smooth = True
            for lp, uv in zip(nf.loops, u): lp[self.fuv].uv = uv

    def to_object(self, smooth_angle=50, coll=None):
        o = super().to_object(smooth_angle, coll)
        me = o.data
        if "fixed" in me.attributes:
            fx = [0] * len(me.polygons); me.attributes["fixed"].data.foreach_get("value", fx)
            src, dst = me.uv_layers["fixuv"], me.uv_layers["UVMap"]
            for p in me.polygons:
                if fx[p.index]:
                    for li in p.loop_indices: dst.data[li].uv = src.data[li].uv
            me.attributes.remove(me.attributes["fixed"])
        if "fixuv" in me.uv_layers: me.uv_layers.remove(me.uv_layers["fixuv"])
        me.uv_layers.active = me.uv_layers["UVMap"]
        return o


def frame_m(o, ex, ey, ez):
    """a matrix whose local axes are ex, ey, ez at o"""
    m = Matrix.Identity(4)
    for r in range(3):
        m[r][0], m[r][1], m[r][2], m[r][3] = ex[r], ey[r], ez[r], o[r]
    return m


def ymap(u, o):
    """local +Y -> u, origin -> o (for the lathes, which revolve round Y)"""
    q = Y.rotation_difference(Vector(u).normalized())
    return Matrix.Translation(Vector(o)) @ q.to_matrix().to_4x4()


def cyl(P, m, a, b, r, segs=None, bevel=0.0, r2=None):
    """a straight round tube; a long one (> 9 cm) gets rings 3 cm in from each end (the vertex AO darkens only the weld,
    not the whole tube) and none longer than 14 cm (the audit's streak rule); at LOD2 it is flat shaded, no rings"""
    a, b = Vector(a), Vector(b)
    L = (b - a).length
    if L > 0.09 and DET < 2:
        d = (b - a) / L
        n = max(1, math.ceil((L - 0.06) / 0.14))
        ts = [0.0, 0.03] + [0.03 + (L - 0.06) * k / n for k in range(1, n)] + [L - 0.03, L]
        rr = [r + ((r2 if r2 is not None else r) - r) * t / L for t in ts]
        P.add_bm(T.tube([a + d * t for t in ts], rr, segs or S(8, 6, 4)), m, d)
        return
    bm = T.cyl_between(a, b, r, segs or S(8, 6, 4), bevel if DET < 2 else 0.0, r2)
    if DET == 2 and L > 0.09: T.flat(bm)
    P.add_bm(bm, m, b - a)


def tubep(P, m, pts, r, segs=None, per=None, cap=True):
    pts = [Vector(p) for p in pts]
    path = T.smooth_path(pts, per=per or S(3, 2, 1)) if len(pts) > 2 else pts
    P.add_bm(T.tube(path, r, segs or S(8, 6, 4), cap), m, pts[-1] - pts[0])


def lathe_on(P, m, prof, axis, o, segs=None, closed=True):
    bm = T.lathe(prof, segs=segs or S(14, 8, 6), closed=closed)
    bm.transform(ymap(axis, o))
    P.add_bm(bm, m, axis)


def obox(P, m, c, size, ex, ey, ez, bevel=0.002, segs=1):
    bm = K.bm_box(*size, bevel=bevel if DET < 2 else 0.0, segs=segs if DET == 0 else 1)
    bm.transform(frame_m(Vector(c), ex.normalized(), ey.normalized(), ez.normalized()))
    P.add_bm(bm, m, ex)


def plate_xz(P, m, outline, y, thick, bevel=0.0012):
    """a flat outline in the XZ plane (CCW seen from -Y) extruded across Y, centred on y"""
    bm = K.bm_profile_extrude(outline, thick, bevel=bevel if DET < 2 else 0.0, segs=1)
    bm.transform(Matrix.Translation((0, y, 0)))
    P.add_bm(bm, m, X)


def mir(p): return V(p.x, -p.y, p.z)


# ------------------------------------------------------------------------------------------------ frame (Body)
def tube_dir(a, b): return (Vector(b) - Vector(a)).normalized()


def gusset(P, K0, d1, d2, l1, l2):
    """a flat head-tube gusset in the XZ plane: corner K0, edges along d1 (l1) and d2 (l2), a concave free edge"""
    p1, p2 = K0 + d1 * l1, K0 + d2 * l2
    mid = (p1 + p2) / 2 + ((K0 - (p1 + p2) / 2) * 0.35)
    pts = [K0, p1] + [T.bezier(p1, p1 + (mid - p1) * 0.8, p2 + (mid - p2) * 0.8, p2, n=S(6, 3, 1))[i] for i in range(1, S(6, 3, 1))] + [p2]
    out = [(p.x, p.z) for p in pts]
    a = sum(out[i][0] * out[(i + 1) % len(out)][1] - out[(i + 1) % len(out)][0] * out[i][1] for i in range(len(out)))
    if a < 0: out.reverse()
    plate_xz(P, PAINT, out, 0.0, 0.0035, bevel=0.001)


def dropout_outline():
    """the rear horizontal dropout (x, z relative to the axle): a teardrop to the stays, the axle slot open to the rear"""
    h = 0.0072
    pts = [(-0.027, -h), (-0.027, -0.014), (-0.012, -0.021), (0.010, -0.020), (0.034, -0.012), (0.052, -0.002),
           (0.050, 0.014), (0.036, 0.030), (0.020, 0.038), (0.004, 0.030), (-0.016, 0.019), (-0.027, 0.013), (-0.027, h)]
    n = S(7, 4, 2)
    for k in range(n + 1):                      # the slot's round end round the axle
        a = math.pi / 2 - math.pi * k / n
        pts.append((0.004 + h * math.cos(a), h * math.sin(a)))
    return pts


def build_body(P):
    # head tube (lathe along the steering axis, end rings)
    L = HT1 - HT0
    prof = [(0.0128, 0.0), (0.0192, 0.0), (0.0196, 0.003), (0.0196, 0.008), (0.0177, 0.0115), (0.0177, L - 0.0115),
            (0.0196, L - 0.008), (0.0196, L - 0.003), (0.0192, L), (0.0128, L)]
    if DET == 2: prof = [(0.0128, 0.0), (0.019, 0.0), (0.019, L), (0.0128, L)]
    lathe_on(P, PAINT, prof, dS, ax(HT0), segs=S(14, 9, 6))
    # headset cups (chrome) + the gyro's lower plate (static)
    for s0 in ((HT0 - 0.012, HT1) if DET < 2 else ()):
        lathe_on(P, CHROME, [(0.0127, 0.0), (0.0192, 0.0), (0.0198, 0.003), (0.0198, 0.009), (0.0192, 0.012), (0.0127, 0.012)], dS, ax(s0), segs=S(14, 9, 6))
    if DET < 2:
        lathe_on(P, BLACK, [(0.0140, 0.0), (0.0335, 0.0), (0.0345, 0.0025), (0.0335, 0.005), (0.0140, 0.005)], dS, ax(0.463), segs=S(14, 9, 6))
        for s in ((1, -1) if DET == 0 else ()):  # its two cable stops (rear sides)
            c = ax(0.4655) - nS * 0.012 + Y * (s * 0.038)
            obox(P, BLACK, c, (0.016, 0.012, 0.008), nS, Y, dS, bevel=0.002)
            cyl(P, METAL, c + Y * (s * 0.002) - dS * 0.0, c - nS * 0.012 + Y * (s * 0.002), 0.0042, segs=S(10, 6, 4), bevel=0.0008)
    # main tubes
    cyl(P, PAINT, HTj, STj - tube_dir(HTj, STj) * 0.002, 0.0127)               # top tube 1"
    cyl(P, PAINT, DTj, BB + tube_dir(DTj, BB) * 0.006, 0.0159)                 # down tube 1 1/4"
    cyl(P, PAINT, st(0.0), STtop, 0.0143)                                     # seat tube 1 1/8"
    # seat clamp collar
    if DET < 2: lathe_on(P, METAL, [(0.0140, 0.0), (0.0182, 0.0), (0.0188, 0.002), (0.0188, 0.013), (0.0182, 0.015), (0.0140, 0.015)], sT, st(0.286), segs=S(14, 9, 6))
    if DET == 0:
        cb = st(0.2935) - X * 0.019
        cyl(P, METAL, cb + Y * 0.012, cb - Y * 0.012, 0.0055, segs=10, bevel=0.0008)
        cyl(P, BLACK, cb + Y * 0.012, cb + Y * 0.016, 0.0042, segs=6)
    # bottom bracket shell + cups
    cyl(P, PAINT, BB + Y * 0.034, BB - Y * 0.034, 0.0275, segs=S(14, 9, 6), bevel=0.0015)
    for s in ((1, -1) if DET < 2 else ()):
        cyl(P, BLACK, BB + Y * (s * 0.034), BB + Y * (s * 0.0395), 0.0215, segs=S(12, 9, 6))
    # gussets at the head tube
    if DET < 2:
        gusset(P, HTj, -dS, tube_dir(HTj, STj), 0.030, 0.070)
        gusset(P, DTj, dS, tube_dir(DTj, BB), 0.030, 0.075)
    # chain stays + seat stays (both sides), dropouts
    sdir_xz = (STj - RA); sdir_xz.y = 0; sdir_xz.normalize()
    for s in (1, -1):
        cs = [BB + V(-0.012, s * 0.016, -0.004), BB + V(-0.055, s * 0.040, -0.006), RA + V(0.150, s * 0.055, -0.002),
              RA + V(0.036, s * 0.0575, 0.0)]
        tubep(P, PAINT, cs, [0.0105, 0.0105, 0.0100, 0.0062], per=S(2, 2, 1))
        ss = [st(0.250) + V(-0.002, s * 0.004, 0.0), st(0.252) + V(-0.045, s * 0.036, -0.030), RA + sdir_xz * 0.30 + V(0, s * 0.047, 0),
              RA + V(0.014, s * 0.0575, 0.024)]
        tubep(P, PAINT, ss, [0.0085, 0.0085, 0.0082, 0.0052], per=S(2, 2, 1))
        if DET < 2: plate_xz(P, PAINT, [(RA.x + x, RA.z + z) for x, z in dropout_outline()], s * 0.0575, 0.005)
        # U-brake boss
        pb = RA + sdir_xz * 0.205 + V(0, s * 0.0505, 0)
        if DET < 2: cyl(P, PAINT, pb, pb - Y * (s * 0.012), 0.0055, segs=S(10, 6, 4), bevel=0.0008)
    # seat-stay bridge, chain-stay bridge
    br = RA + sdir_xz * 0.30
    cyl(P, PAINT, br + Y * 0.047, br - Y * 0.047, 0.0070, segs=S(10, 6, 4))
    cb = BB + V(-0.095, 0, -0.005)
    if DET < 2: cyl(P, PAINT, cb + Y * 0.046, cb - Y * 0.046, 0.0075, segs=S(10, 6, 4))
    if DET == 0:                                # the cable stop on the bridge
        cyl(P, BLACK, br + V(0, 0, 0.007), br + V(0, 0, 0.015), 0.0040, segs=S(10, 6, 4))
    # rear axle (inside the pegs; its end shows in the peg's recess)
    # rear pegs
    for s in (1, -1): peg(P, RA, s, 0.0615)
    build_seat(P)
    build_brake(P, sdir_xz)
    if DET < 2: build_body_cables(P, br)
    build_chain(P)


def peg(P, c, s, y0):
    """a chromoly peg on an axle end: 38 mm, 100 mm long, bevelled, a recess at the end"""
    L = 0.100
    prof = [(0.0, 0.0), (0.0180, 0.0), (0.0190, 0.0025), (0.0190, L - 0.004), (0.0176, L), (0.0105, L), (0.0095, L - 0.004), (0.0, L - 0.004)]
    if DET == 2: prof = [(0.0, 0.0), (0.019, 0.0), (0.019, L), (0.0, L)]
    lathe_on(P, CHROME, prof, Y * s, c + Y * (s * y0), segs=S(10, 8, 6), closed=False)


def build_seat(P):
    # layback seat post (chrome) + clamp + rails + saddle
    sp = SEAT_POST_TOP
    cyl(P, CHROME, st(0.285 if DET < 2 else 0.300), sp, 0.0127, segs=S(12, 8, 5))
    lathe_on(P, CHROME, [(0.0, 0.0), (0.0127, 0.0), (0.0145, 0.004), (0.0145, 0.014), (0.0, 0.014)], sT, sp - sT * 0.002, closed=False)
    c0 = sp + V(-0.012, 0, 0.016)
    obox(P, BLACK, c0, (0.045, 0.032, 0.016), X, Y, Z, bevel=0.003)
    if DET == 0:
        for s in (1, -1):
            tubep(P, METAL, [c0 + V(-0.065, s * 0.020, 0.014), c0 + V(-0.045, s * 0.022, 0.006), c0 + V(0.045, s * 0.022, 0.006), c0 + V(0.070, s * 0.017, 0.016)], 0.0035, segs=S(4, 4, 3))
    keys = [(-0.105, 0.040, 0.030, 0.010), (-0.094, 0.067, 0.044, 0.002), (-0.050, 0.072, 0.050, 0.0), (0.0, 0.058, 0.047, 0.0),
            (0.060, 0.033, 0.043, 0.002), (0.112, 0.023, 0.039, 0.006), (0.135, 0.011, 0.031, 0.012)]
    bm = T.loft_x(keys, stations=S(8, 6, 3), n=S(14, 10, 6), p_top=2.4, p_bot=4.0)
    bm.transform(Matrix.Translation(c0 + V(-0.005, 0, 0.011)))
    P.add_bm(bm, SADDLE, X)


def build_brake(P, sdir):
    """the rear U-brake on the seat stays: arms, pads on the rim, straddle wire and yoke"""
    rdir = sdir
    tdir = Y.cross(rdir).normalized()              # tangential (in the wheel plane)
    tops = []
    for s in (1, -1):
        if DET == 2:
            obox(P, BLACK, RA + rdir * 0.235 + V(0, s * 0.030, 0), (0.016, 0.010, 0.060), tdir, Y, rdir, bevel=0.0)
            continue
        pv = RA + rdir * 0.205 + V(0, s * 0.0375, 0)
        at = RA + rdir * 0.262 + V(0, s * 0.027, 0)
        tubep(P, BLACK, [pv, pv + rdir * 0.030 + V(0, s * 0.004, 0), at], 0.0052, segs=S(8, 5, 4), per=S(3, 2, 1))
        cyl(P, BLACK, pv + Y * (s * 0.004), pv - Y * (s * 0.006), 0.0075, segs=S(8, 6, 4))
        pad = RA + rdir * 0.2035 + V(0, s * 0.0215, 0)
        obox(P, RUBBER, pad, (0.034, 0.010, 0.0085), tdir, Y, rdir, bevel=0.0018)
        if DET < 2:
            cyl(P, METAL, pad + Y * (s * 0.005), pv - Y * (s * 0.002), 0.0028, segs=S(4, 4, 3))
        tops.append(at)
    yk = RA + rdir * 0.282
    if DET == 0 and tops:
        for at in tops: tubep(P, METAL, [at, (at + yk) / 2 + rdir * 0.004, yk + Y * (0.004 if at.y > 0 else -0.004)], 0.0012, segs=S(4, 4, 3), per=2)
        obox(P, METAL, yk, (0.010, 0.012, 0.010), tdir, Y, rdir, bevel=0.0015)
        tubep(P, METAL, [yk, RA + rdir * 0.30 + V(0, 0, 0.015)], 0.0010, segs=S(4, 4, 3))


def tt_frame():
    tt = tube_dir(HTj, STj)
    dn = tt.cross(Y).normalized()
    if dn.z > 0: dn = -dn
    return tt, dn


def build_body_cables(P, br):
    tt, dn = tt_frame()
    Lt = (STj - HTj).length
    lsp = HTj + tt * (0.20 * Lt) + dn * 0.022
    for s in (1, -1):
        ear = ax(0.4655) - nS * 0.024 + Y * (s * 0.038)
        tubep(P, CABLE, [ear, ear - nS * 0.030 - dS * 0.006, lsp + tt * -0.03 + Y * (s * 0.008), lsp + Y * (s * 0.0045)], 0.0025, segs=S(4, 4, 3))
    obox(P, BLACK, lsp, (0.018, 0.010, 0.008), tt, Y, -dn, bevel=0.002)
    path = [lsp, HTj + tt * (0.55 * Lt) + dn * 0.022, HTj + tt * (0.86 * Lt) + dn * 0.021 + Y * 0.010,
            STj + V(-0.004, 0.024, -0.035), br + V(0.010, 0.012, 0.035), br + V(0, 0, 0.015)]
    tubep(P, CABLE, path, 0.0025, segs=S(4, 4, 3), per=S(2, 2, 1))


# ------------------------------------------------------------------------------------------------ chain (on Body, UV-scrolled)
def chain_path():
    c1, c2 = Vector((BB.x, BB.z)), Vector((RA.x, RA.z))
    d = c2 - c1; D = d.length; th = math.atan2(d.y, d.x)
    ph = math.acos((R_RING - R_COG) / D)
    nu, nl = th - ph, th + ph                     # upper / lower tangent normals (angles)
    pt = lambda c, r, a: c + Vector((math.cos(a), math.sin(a))) * r
    pts = []
    n1, n2 = S(28, 14, 8), S(10, 7, 5)
    # cog top -> ring top (upper run, forward), round the ring's front, ring bottom -> cog bottom, round the cog's back
    a0, a1 = nu, nl - 2 * math.pi
    pts += [pt(c1, R_RING, a0 + (a1 - a0) * k / n1) for k in range(n1 + 1)]
    b0, b1 = nl, nu
    pts += [pt(c2, R_COG, b0 + (b1 - b0) * k / n2) for k in range(n2 + 1)]
    return pts                                    # closed loop (last point -> first point = the upper run)


CH_H, CH_W, CH_TOP = 0.00635, 0.0043, 0.0059


def build_chain(P):
    pts = chain_path()
    n = len(pts)
    seg = [(pts[(i + 1) % n] - pts[i]).length for i in range(n)]
    L = sum(seg); NP = round(L / 0.0254); k = NP / L
    s_acc = [0.0]
    for i in range(n): s_acc.append(s_acc[-1] + seg[i])
    tan = []
    for i in range(n):
        t = (pts[(i + 1) % n] - pts[(i - 1) % n]).normalized(); tan.append(t)
    outw = [Vector((-t.y, t.x)) for t in tan]
    def at(i, off, y):
        p, o = pts[i % n], outw[i % n]
        return V(p.x + o.x * off, y, p.y + o.y * off)
    verts, faces, uvs = [], [], []
    def ribbon(fa, fb, va, vb, flip):
        """fa(i), fb(i): the strip's two edges; va, vb: their atlas v; one quad per path segment (UV u in periods)"""
        for i in range(n):
            j = i + 1
            u0, u1 = s_acc[i] * k, s_acc[i + 1] * k
            q = [fa(i), fb(i), fb(j), fa(j)]
            uv = [(u0, va), (u0, vb), (u1, vb), (u1, va)]
            if flip: q.reverse(); uv.reverse()
            o = len(verts); verts.extend(q); faces.append([o, o + 1, o + 2, o + 3]); uvs.append(uv)
    # a closed box round the pitch line (no slit at its corners): the side plates (atlas top half, the render's 12.7 mm
    # mapped to v 0.5 .. 1, chain top up) and the top / bottom faces (atlas bottom half: plate edges and rollers)
    vs, vt = 0.5 * CH_TOP / 0.0127, 0.5 * CH_W / 0.0127
    for s in (1, -1):
        ribbon(lambda i, s=s: at(i, -CH_TOP, CL + s * CH_W), lambda i, s=s: at(i, CH_TOP, CL + s * CH_W), 0.75 - vs, 0.75 + vs, s < 0)
    ribbon(lambda i: at(i, CH_TOP, CL + CH_W), lambda i: at(i, CH_TOP, CL - CH_W), 0.25 + vt, 0.25 - vt, False)
    ribbon(lambda i: at(i, -CH_TOP, CL + CH_W), lambda i: at(i, -CH_TOP, CL - CH_W), 0.25 + vt, 0.25 - vt, True)
    P.add_fixed(CHAIN, verts, faces, uvs)
    return L, NP


# ------------------------------------------------------------------------------------------------ steering assembly (Steer)
def bar_points():
    uB = (dS * math.cos(math.radians(5)) + nS * math.sin(math.radians(5))).normalized()     # rolled a little forward of the fork
    C = ax(0.530) + nS * 0.048
    gR = V(-math.sin(math.radians(10)), -math.cos(math.radians(10)), math.sin(math.radians(3))).normalized()
    c4 = C + Y * -0.180 + uB * 0.192 + X * -0.010
    end = c4 + gR * ((GRIP_Y - 0.180) / -gR.y)
    right = [C, C + Y * -0.080, C + Y * -0.112 + uB * 0.032, C + Y * -0.158 + uB * 0.168, c4, c4 + gR * 0.030, end]
    return C, uB, gR, right


def build_steer(P):
    # steerer (between crown and stem; shows only in the headset), crown, legs, dropouts
    if DET < 2: cyl(P, METAL, ax(0.300), ax(0.500), 0.0127, segs=S(10, 7, 5))
    cc = ax(0.309) + nS * (OFF * 0.55)
    obox(P, PAINT, cc, (0.058, 0.136, 0.022), nS, Y, dS, bevel=0.007, segs=2)
    for s in (1, -1):
        y = s * 0.0515
        cyl(P, PAINT, FA + dS * 0.012 + Y * y, FA + dS * 0.318 + Y * y, 0.0106, r2=0.0125)
        out = [(-0.0055, -0.017), (-0.0055, 0.0)]
        n = S(6, 3, 2)
        out += [(-0.0055 * math.cos(math.pi * k / n), 0.0055 * math.sin(math.pi * k / n)) for k in range(1, n)]
        out += [(0.0055, 0.0), (0.0055, -0.017), (0.011, -0.016), (0.015, -0.002), (0.015, 0.015), (0.011, 0.030), (-0.012, 0.030), (-0.015, 0.014), (-0.013, -0.004), (-0.010, -0.016)]
        rot = Matrix.Rotation(math.pi / 2 - HA, 2)        # the tab along the leg (tilted with the axis)
        out = [tuple(rot @ Vector(p)) for p in out]
        out = [(FA.x + x, FA.z + z) for x, z in out]
        a = sum(out[i][0] * out[(i + 1) % len(out)][1] - out[(i + 1) % len(out)][0] * out[i][1] for i in range(len(out)))
        if a < 0: out.reverse()
        if DET < 2: plate_xz(P, PAINT, out, s * 0.0525, 0.005)
        peg(P, FA, s, 0.0555)
    # crown race, headset locknut (hex), gyro upper plate + its cable ears
    if DET < 2:
        lathe_on(P, CHROME, [(0.0127, 0.0), (0.0200, 0.0), (0.0200, 0.009), (0.0127, 0.009)], dS, ax(0.4775), segs=6)
        lathe_on(P, BLACK, [(0.0140, 0.0), (0.0335, 0.0), (0.0345, 0.0025), (0.0335, 0.005), (0.0140, 0.005)], dS, ax(0.4705), segs=S(14, 9, 6))
        for s in ((1, -1) if DET == 0 else ()):
            c = ax(0.473) + nS * 0.004 + Y * (s * 0.038)
            obox(P, BLACK, c, (0.012, 0.014, 0.008), nS, Y, dS, bevel=0.002)
            cyl(P, METAL, c + dS * 0.004, c + dS * 0.014, 0.0042, segs=6)
    # stem: quill body, forged arm, front-load clamp, bolts
    L = 0.062
    if DET == 2: cyl(P, METAL, ax(0.4865), ax(0.4865 + L), 0.0166, segs=6)
    else: lathe_on(P, METAL, [(0.0, 0.0), (0.0158, 0.0), (0.0166, 0.004), (0.0166, L - 0.006), (0.0150, L), (0.0070, L), (0.0062, L - 0.004), (0.0, L - 0.004)],
             dS, ax(0.4865), segs=S(14, 9, 6), closed=False)
    C, uB, gR, right = bar_points()
    arm_c = (ax(0.528) + C) / 2
    obox(P, METAL, arm_c - dS * 0.002, (0.050, 0.034, 0.030), nS, Y, dS, bevel=0.008, segs=2)
    cyl(P, METAL, C + Y * 0.029, C - Y * 0.029, 0.0185, segs=S(14, 9, 6), bevel=0.003)
    if DET < 2: obox(P, METAL, C + nS * 0.014, (0.010, 0.052, 0.040), nS, Y, dS, bevel=0.004)
    if DET == 0:
        for sy in (1, -1):
            for sz in (1, -1):
                b = C + nS * 0.019 + Y * (sy * 0.017) + dS * (sz * 0.013)
                cyl(P, BLACK, b, b + nS * 0.004, 0.0040, segs=5)
    # stem pad
    obox(P, PAD, ax(0.546) - nS * 0.002, (0.080, 0.074, 0.050), nS, Y, dS, bevel=0.015, segs=1)
    # bars: one tube, centre clamp section, uprights, grip sections (7.5" rise, 674 mm wide)
    full = [mir(p) for p in reversed(right[1:])] + right
    tubep(P, CHROME, full, 0.0111, segs=S(9, 7, 4), per=S(2, 2, 1))
    f = (0.125 - 0.032) / (0.168 - 0.032)
    cx = right[2].lerp(right[3], f)
    cyl(P, CHROME, mir(cx), cx, 0.0095, segs=S(12, 8, 5))
    padp = [(0.0090, 0.0), (0.0190, 0.0), (0.0222, 0.006), (0.0230, 0.016), (0.0230, 0.075), (0.0230, 0.125), (0.0230, 0.184), (0.0222, 0.194), (0.0190, 0.200), (0.0090, 0.200)]
    if DET == 2: padp = [(0.0200, 0.0), (0.0230, 0.004), (0.0230, 0.100), (0.0230, 0.196), (0.0200, 0.200)]
    if DET < 2: lathe_on(P, PAD, padp, Y * -1, (cx + mir(cx)) / 2 + Y * 0.100, segs=S(14, 9, 6), closed=False)     # (open ends: the bore hides in the crossbar)
    # grips (mushroom), bar ends
    for s in (1, -1):
        pts = right if s < 0 else [mir(p) for p in right]
        g = gR if s < 0 else mir(gR)
        end = pts[-1]
        g0 = end - g * 0.128
        prof = [(0.0108, 0.0), (0.0215, 0.0), (0.0220, 0.004), (0.0165, 0.007)]
        nr = S(2, 2, 0)
        for k in range(nr):
            y = 0.010 + k * (0.105 / max(1, nr))
            prof += [(0.0168, y + 0.002), (0.0178, y + 0.006), (0.0168, y + 0.011)]
        prof += [(0.0168, 0.122), (0.0160, 0.129), (0.0120, 0.131), (0.0, 0.131)]
        if DET >= 1: prof = [(0.0108, 0.0), (0.0215, 0.0), (0.0215, 0.004), (0.0168, 0.008), (0.0168, 0.070), (0.0168, 0.124), (0.0120, 0.131), (0.0, 0.131)]
        if DET == 2: prof = [(0.0108, 0.0), (0.0215, 0.0), (0.0168, 0.007), (0.0168, 0.070), (0.0168, 0.125), (0.0, 0.131)]
        lathe_on(P, GRIP, prof, g, g0, segs=S(9, 8, 5), closed=False)
    # brake lever (right) + its cable to the splitter and the two cables to the gyro's upper plate
    if DET < 2:
        g, end = gR, right[-1]
        lc = end - g * 0.142
        lathe_on(P, BLACK, [(0.0108, 0.0), (0.0150, 0.0), (0.0155, 0.002), (0.0155, 0.012), (0.0150, 0.014), (0.0108, 0.014)], g, lc, segs=S(10, 7, 5))
        pv = lc + X * 0.026 - Z * 0.004 + g * 0.007
        obox(P, BLACK, (lc + pv) / 2, (0.030, 0.014, 0.016), X, Y, Z, bevel=0.003)
        blade = [pv, pv + g * 0.020 + X * 0.010 - Z * 0.006, pv + g * 0.060 + X * 0.012 - Z * 0.012, pv + g * 0.098 + X * 0.006 - Z * 0.014]
        tubep(P, METAL, blade, 0.0042, segs=S(8, 6, 4))
        sp = ax(0.508) + nS * 0.060
        cab = [pv - g * 0.004 + Z * 0.008, pv + X * 0.03 + Z * 0.01, right[3] + X * 0.05 + Y * 0.02, (right[2] + right[3]) / 2 + X * 0.06 + Y * 0.06, sp + dS * 0.02, sp]
        tubep(P, CABLE, cab, 0.0025, segs=S(4, 4, 3), per=S(2, 2, 1))
        obox(P, BLACK, sp, (0.010, 0.020, 0.012), nS, Y, dS, bevel=0.002)
        for s in (1, -1):
            ear = ax(0.473) + nS * 0.004 + Y * (s * 0.038) + dS * 0.014
            tubep(P, CABLE, [sp + Y * (s * 0.006) - dS * 0.004, sp + Y * (s * 0.024) - dS * 0.010 - nS * 0.010, ear + dS * 0.012, ear], 0.0022, segs=S(4, 4, 3))


# ------------------------------------------------------------------------------------------------ wheels
def tyre_ellipse(th):
    rc, a, b = TYRE_RC, 0.0235, 0.027
    return rc + a * math.cos(th), b * math.sin(th)


def build_wheel(P, c, rear):
    # tyre (knobby 20 x 2.0): carcass lathe + knobs on LOD0
    th0 = math.radians(160)
    n = S(8, 7, 5)
    prof = [tyre_ellipse(-th0 + 2 * th0 * k / (n - 1)) for k in range(n)]
    if DET == 2: prof = [(0.2040, -0.0080), (0.2200, -0.0250), (0.2440, -0.0200), (0.2540, 0.0), (0.2440, 0.0200), (0.2200, 0.0250), (0.2040, 0.0080)]
    bm = T.lathe([(r, y) for r, y in prof], segs=S(28, 20, 12), closed=False)
    bm.transform(Matrix.Translation(c)); P.add_bm(bm, RUBBER, Y)
    if DET == 0: knobs(P, c)
    # rim: a narrow (29 mm) chrome rim; the brake track a flat polished-alloy band on each side; the tyre's bead
    # tucked behind the hook (the black rubber meets the rim)
    segs = S(28, 18, 10)

    def rl(prof, m):
        bm = T.lathe(prof, segs=segs, closed=False); bm.transform(Matrix.Translation(c)); P.add_bm(bm, m, Y)
    if DET < 2:
        rl([(0.2092, -0.0148), (0.2106, -0.0145), (0.2118, -0.0128), (0.2050, -0.0100), (0.2010, 0.0), (0.2050, 0.0100), (0.2118, 0.0128), (0.2106, 0.0145), (0.2092, 0.0148)]
           if DET == 0 else [(0.2092, -0.0148), (0.2118, -0.0128), (0.2010, 0.0), (0.2118, 0.0128), (0.2092, 0.0148)], CHROME)
        rl([(0.1998, 0.0148), (0.1958, 0.0110), (0.1945, 0.0), (0.1958, -0.0110), (0.1998, -0.0148)] if DET == 0 else
           [(0.1998, 0.0148), (0.1945, 0.0), (0.1998, -0.0148)], CHROME)
        for sd in (1, -1): rl([(0.1998, sd * 0.0148), (0.2092, sd * 0.0148)], METAL)
    else:
        bm = T.lathe([(0.2050, 0.0), (0.2100, 0.0145), (0.1965, 0.0145), (0.1945, 0.0), (0.1965, -0.0145), (0.2100, -0.0145)], segs=segs, closed=True)
        bm.transform(Matrix.Translation(c)); P.add_bm(bm, CHROME, Y)
    # hub
    w = 0.052 if rear else 0.050
    hp = [(0.0075, w), (0.0160, w - 0.010), (0.0240, 0.0345), (0.0244, 0.0318), (0.0240, 0.0290), (0.0145, 0.026), (0.0140, 0.0)]
    if DET >= 1: hp = [(0.0075, w), (0.0160, w - 0.010), (0.0240, 0.034), (0.0240, 0.029), (0.0145, 0.0)]
    if DET == 2: hp = [(0.0075, w), (0.0240, 0.034), (0.0145, 0.0)]
    yr = -0.040 if rear else -w                         # (the rear hub's right end meets the cog's driver)
    prof = [(r, y) for r, y in hp] + [(r, -y if -y > yr else yr) for r, y in reversed(hp[:-1])]
    bm = T.lathe(prof, segs=S(10, 8, 6), closed=False)
    bm.transform(Matrix.Translation(c)); P.add_bm(bm, METAL, Y)
    spoke_cards(P, c)


def knobs(P, c):
    """the tread (a 90s BMX street / dirt tyre): a smooth centre line, two staggered rows of small low blocks either
    side of it (8.5 x 6.8 mm, 2.2 mm high, 24 a row), sitting 1.2 mm into the carcass"""
    rows = [(math.radians(15), 24, 0.0, 0.0085, 0.0068, 0.0022), (math.radians(-15), 24, 0.5, 0.0080, 0.0068, 0.0022)]
    rc, a, b = TYRE_RC, 0.0235, 0.027
    for th, N, ph, lt, ll, h in rows:
        r0, y0 = tyre_ellipse(th)
        nr, ny = math.cos(th) / a, math.sin(th) / b; l = math.hypot(nr, ny); nr, ny = nr / l, ny / l
        for k in range(N):
            ang = 2 * math.pi * (k + ph) / N
            er = V(math.cos(ang), 0, math.sin(ang)); et = V(-math.sin(ang), 0, math.cos(ang))
            nn = er * nr + Y * ny
            lat = (Y - nn * nn.dot(Y)).normalized()
            base = c + er * r0 + Y * y0 - nn * 0.0012
            vs = []
            for hh, sc in ((0.0, 1.0), (h + 0.0012, 0.78)):
                for su, sv in ((-1, -1), (1, -1), (1, 1), (-1, 1)):
                    vs.append(base + nn * hh + et * (su * lt / 2 * sc) + lat * (sv * ll / 2 * sc))
            bm = bmesh.new(); bv = [bm.verts.new(v) for v in vs]
            for f in ([4, 5, 6, 7], [0, 1, 5, 4], [1, 2, 6, 5], [2, 3, 7, 6], [3, 0, 4, 7]):
                bm.faces.new([bv[i] for i in f])
            bm.normal_update(); bm.faces.ensure_lookup_table()
            if bm.faces[0].normal.dot(nn) < 0: bmesh.ops.reverse_faces(bm, faces=bm.faces)
            for f in bm.faces: f.smooth = False
            P.add_bm(bm, RUBBER, et)


# 3-cross lacing: per side 18 spokes, flange holes every 20 deg; the right set = the left set mirrored, turned 10 deg
FLANGE_R, FLANGE_Y, RIM_Y, CROSS = 0.0225, 0.0318, 0.0025, math.radians(60)
SPOKE_CARD_R = 0.205


def spokes_left():
    out = []
    for i in range(18):
        a = math.radians(20 * i)
        b = a + (CROSS if i % 2 == 0 else -CROSS)
        out.append((V(FLANGE_R * math.cos(a), FLANGE_Y, FLANGE_R * math.sin(a)), V(RIM_HOLE * math.cos(b), RIM_Y, RIM_HOLE * math.sin(b))))
    return out


def spoke_cards(P, c):
    """two blended cone cards (one per side, between the flange and the rim) mapped with the rendered spoke set:
    a pre-filtered texture, never sub-pixel geometry (QUALITY_RULES 23: the player's vehicle in the chase view)"""
    n = S(24, 18, 8)
    r0, r1 = 0.0185, RIM_BED + 0.0018
    yat = lambda r: FLANGE_Y + (RIM_Y - FLANGE_Y) * (r - FLANGE_R) / (RIM_HOLE - FLANGE_R)
    rot = math.radians(10)
    for s in (1, -1):
        verts, faces, uvs = [], [], []
        for k in range(n + 1):
            a = 2 * math.pi * k / n
            for r in (r0, r1):
                verts.append(c + V(r * math.cos(a), s * yat(r), r * math.sin(a)))
        def uv(k, r):
            a = 2 * math.pi * k / n
            x, z = r * math.cos(a), r * math.sin(a)
            if s < 0:                                   # undo the right set's 10 deg turn (the texture is the left set)
                x, z = x * math.cos(-rot) - z * math.sin(-rot), x * math.sin(-rot) + z * math.cos(-rot)
            return (0.5 - x / (2 * SPOKE_CARD_R), 0.5 + z / (2 * SPOKE_CARD_R))
        for k in range(n):
            q = [2 * k, 2 * k + 1, 2 * k + 3, 2 * k + 2]
            u = [uv(k, r0), uv(k, r1), uv(k + 1, r1), uv(k + 1, r0)]
            if s < 0: q.reverse(); u.reverse()
            faces.append(q); uvs.append(u)
        P.add_fixed(SPOKES, verts, faces, uvs)


# ------------------------------------------------------------------------------------------------ cog, crank, pedals
def sprocket(P, m, c, y, N, Rp, r_in, thick, holes=None):
    """a machined sprocket in the XZ plane at y: tooth-shaped teeth (a flat-bottomed roller seat between them, the tips
    chamfered to 1.8 mm), the web flat, optional lightening holes = (r0, r1, centre angles, half angle): kidney cut-outs
    between the bolts. LOD1: a plain annulus; LOD2: a disc."""
    h = thick / 2
    if DET == 1:
        lathe_on(P, m, [(r_in, -h), (Rp + 0.002, -h), (Rp + 0.002, h), (r_in, h)], Y, c + Y * y, segs=20)
        return
    if DET == 2:
        cyl(P, m, c + Y * (y + h), c + Y * (y - h), Rp + 0.002, segs=10)
        return
    step = 2 * math.pi / N
    rr, rt = Rp - 0.0040, Rp + 0.0036          # roller seat (7.9 mm roller), tooth tip
    hr = 0.0009
    bands = [r_in] + ([holes[0], holes[1]] if holes else [])
    bm = bmesh.new()

    def pv(a, r, yy): return bm.verts.new(c + V(r * math.cos(a), yy, r * math.sin(a)))
    S2 = (1, -1)
    circ = {sd: [[pv(k * step, r, y + sd * h) for k in range(N)] for r in bands] for sd in S2}
    rootL = {sd: [pv(k * step - 0.24 * step, rr, y + sd * h) for k in range(N)] for sd in S2}
    rootR = {sd: [pv(k * step + 0.24 * step, rr, y + sd * h) for k in range(N)] for sd in S2}
    tipL = {sd: [pv(k * step - 0.09 * step, rt, y + sd * hr) for k in range(N)] for sd in S2}
    tipR = {sd: [pv(k * step + 0.09 * step, rt, y + sd * hr) for k in range(N)] for sd in S2}

    def hole(k):
        if not holes: return False
        mid = (k + 0.5) * step
        return any(abs((mid - hc + math.pi) % (2 * math.pi) - math.pi) < holes[3] for hc in holes[2])
    F = lambda vs: bm.faces.new(vs)
    for sd in S2:
        C, b = circ[sd], circ[sd][-1]
        for k in range(N):
            j = (k + 1) % N
            for i in range(len(bands) - 1):
                if i == 1 and hole(k): continue
                F([C[i][k], C[i][j], C[i + 1][j], C[i + 1][k]])
            F([b[k], rootR[sd][k], rootL[sd][j], b[j]])
            F([b[k], rootL[sd][k], rootR[sd][k]])
            F([rootL[sd][k], tipL[sd][k], tipR[sd][k], rootR[sd][k]])

    def wall(A, B): F([A[1], B[1], B[-1], A[-1]])
    g = lambda D, k: {sd: D[sd][k] for sd in S2}
    cl = lambda i, k: {sd: circ[sd][i][k] for sd in S2}
    for k in range(N):
        j = (k + 1) % N
        wall(g(rootL, k), g(tipL, k)); wall(g(tipL, k), g(tipR, k)); wall(g(tipR, k), g(rootR, k)); wall(g(rootR, k), g(rootL, j))
        wall(cl(0, j), cl(0, k))
        if holes and hole(k):
            wall(cl(1, k), cl(1, j))
            wall(cl(2, j), cl(2, k))
            if not hole((k - 1) % N): wall(cl(2, k), cl(1, k))
            if not hole(j): wall(cl(1, j), cl(2, j))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    P.add_bm(bm, m, X)


SPIDER_A0 = math.radians(18)
BOLT_R = 0.055
SPIDER_T = 0.0040
SPIDER_Y = CL - 0.00175 - SPIDER_T / 2 + 0.00005      # flat on the ring's outer face (0.05 mm into it)


def spider_outline():
    """the forged 5-arm spider (XZ, relative to the BB): tapered arms ending in a round pad UNDER each ring bolt"""
    pts = []
    for j in range(5):
        a = SPIDER_A0 + 2 * math.pi * j / 5
        er, et = Vector((math.cos(a), math.sin(a))), Vector((-math.sin(a), math.cos(a)))
        pts.append(er * 0.020 - et * 0.0090)
        n = S(4, 3, 2)
        for i in range(n + 1):
            t = -math.pi / 2 + math.pi * i / n
            pts.append(er * BOLT_R + (er * math.cos(t) + et * math.sin(t)) * 0.0064)
        pts.append(er * 0.020 + et * 0.0090)
        av = a + math.pi / 5
        pts.append(Vector((math.cos(av), math.sin(av))) * 0.0165)
    return [(BB.x + p.x, BB.z + p.y) for p in pts]


def build_cog(P):
    sprocket(P, BLACK, RA, CL, 16, R_COG, 0.0140, 0.0030)
    cyl(P, BLACK, RA + Y * (CL + 0.006), RA + Y * -0.054, 0.0165, segs=S(14, 9, 6), bevel=0.001)     # the freewheel driver


def build_crank(P):
    cyl(P, METAL, BB + Y * 0.056, BB - Y * 0.056, 0.0095, segs=S(10, 7, 5))
    for s, d in ((-1, X), (1, -X)):                     # right arm forward, left arm back
        y0, y1 = s * 0.064, s * 0.072
        c0, c1 = BB + Y * y0, BB + d * CRANK + Y * y1
        if DET < 2:
            cyl(P, CHROME, c0 - Y * (s * (0.0165 if s < 0 else 0.010)), c0 + Y * (s * 0.009), 0.0170, segs=S(12, 8, 6), bevel=0.002)
            cyl(P, CHROME, c1 - Y * (s * 0.009), c1 + Y * (s * 0.009), 0.0125, segs=S(10, 8, 6), bevel=0.0)
        tubep(P, CHROME, [c0 + d * 0.010, c0 + d * (0.06 * CRANK / 0.175) + Y * (s * 0.002), c1 - d * 0.008], [0.0118, 0.0105, 0.0098], segs=S(10, 7, 5), per=2)
        if DET == 0:
            cyl(P, BLACK, c0 + Y * (s * 0.009), c0 + Y * (s * 0.0115), 0.0085, segs=6)   # the crank bolt
    # 5-arm spider (right side) flat on the ring, its arms ending under the ring bolts; the 44T ring (polished alloy,
    # 5 kidney lightening holes between the bolts); bolt heads on the spider, sleeve nuts on the ring's inner face
    if DET < 2:
        out = spider_outline()
        a2 = sum(out[i][0] * out[(i + 1) % len(out)][1] - out[(i + 1) % len(out)][0] * out[i][1] for i in range(len(out)))
        if a2 < 0: out.reverse()
        plate_xz(P, CHROME, out, SPIDER_Y, SPIDER_T, bevel=0.0010)
    for j in range(5 if DET == 0 else 0):
        a = SPIDER_A0 + 2 * math.pi * j / 5
        b = BB + V(math.cos(a), 0, math.sin(a)) * BOLT_R
        lathe_on(P, BLACK, [(0.0, 0.0), (0.0046, 0.0), (0.0042, 0.0020), (0.0, 0.0020)], -Y, b + Y * (SPIDER_Y - SPIDER_T / 2 + 0.0002), segs=6, closed=False)
    hc = [SPIDER_A0 + math.pi / 5 + 2 * math.pi * j / 5 for j in range(5)]
    sprocket(P, METAL, BB, CL, 44, R_RING, 0.0470, 0.0035, holes=(0.0625, 0.0765, hc, math.radians(15.5)))


def pedal_centre(side):
    s = 1 if side == "L" else -1
    d = -X if side == "L" else X
    return BB + d * CRANK + Y * (s * 0.130)


def build_pedal(P, side):
    s = 1 if side == "L" else -1
    c = pedal_centre(side)
    if DET >= 1:                                       # (12 m +: a box on its spindle)
        obox(P, BLACK, c, (0.090, 0.100, 0.021), X, Y, Z, bevel=0.003 if DET == 1 else 0.0)
        if DET == 1: cyl(P, METAL, c - Y * (s * 0.056), c - Y * (s * 0.050), 0.0065, segs=5)
        return
    cyl(P, METAL, c - Y * (s * 0.056), c - Y * (s * 0.044), 0.0065, segs=S(10, 6, 4))
    cyl(P, BLACK, c - Y * (s * 0.046), c + Y * (s * 0.046), 0.0105, segs=S(10, 7, 5), bevel=0.001)
    for sx in (1, -1):
        obox(P, BLACK, c + X * (sx * 0.042), (0.010, 0.100, 0.021), X, Y, Z, bevel=0.0025, segs=1)
    for sy in (1, -1):
        obox(P, BLACK, c + Y * (sy * 0.047), (0.086, 0.008, 0.017), X, Y, Z, bevel=0.0, segs=1)
    if DET == 0:
        for sx in (1, -1):
            for k in (-1, 0, 1):
                for sz in (1,):
                    p = c + X * (sx * 0.042) + Y * (k * 0.033) + Z * (sz * 0.0105)
                    cyl(P, METAL, p, p + Z * (sz * 0.0035), 0.0017, segs=4)


# ------------------------------------------------------------------------------------------------ the build
R_EXP = T.R_EXPORT                                     # build frame -> Blender (glTF +Z forward, +X left)
NODES = ["Body", "Steer", "Wheel_F", "Wheel_R", "Cog", "Crank", "Pedal_L", "Pedal_R"]
BUILDERS = {"Body": build_body, "Steer": build_steer, "Wheel_F": lambda P: build_wheel(P, FA, False),
            "Wheel_R": lambda P: build_wheel(P, RA, True), "Cog": build_cog, "Crank": build_crank,
            "Pedal_L": lambda P: build_pedal(P, "L"), "Pedal_R": lambda P: build_pedal(P, "R")}
STEER_ROT = Matrix.Rotation(-(math.pi / 2 - HA), 4, "X")          # Blender: local +Z (glTF +Y) along the steering axis
PIVOTS = {   # name: (parent, build-frame position, Blender world rotation)
    "BMX": (None, V(0, 0, 0), Matrix.Identity(4)),
    "Body": ("BMX", V(0, 0, 0), Matrix.Identity(4)),
    "Steer": ("Body", PIVOT_STEER, STEER_ROT),
    "Wheel_F": ("Steer", FA, Matrix.Identity(4)),
    "Wheel_R": ("Body", RA, Matrix.Identity(4)),
    "Cog": ("Body", RA, Matrix.Identity(4)),
    "Crank": ("Body", BB, Matrix.Identity(4)),
    "Pedal_L": ("Crank", pedal_centre("L"), Matrix.Identity(4)),
    "Pedal_R": ("Crank", pedal_centre("R"), Matrix.Identity(4)),
}


def empties_def():
    C, uB, gR, right = bar_points()
    gl_ = right[-1] - gR * 0.064
    sp = SEAT_POST_TOP + V(-0.022, 0, 0.016 + 0.011 + 0.050)
    return {
        "Grip_R": ("Steer", gl_), "Grip_L": ("Steer", mir(gl_)),
        "Peg_FL": ("Steer", FA + V(0, 0.1055, 0.019)), "Peg_FR": ("Steer", FA + V(0, -0.1055, 0.019)),
        "Peg_RL": ("Body", RA + V(0, 0.1115, 0.019)), "Peg_RR": ("Body", RA + V(0, -0.1115, 0.019)),
        "Seat": ("Body", sp),
        "Foot_L": ("Pedal_L", pedal_centre("L") + Z * 0.0105), "Foot_R": ("Pedal_R", pedal_centre("R") + Z * 0.0105),
        "Contact_F": ("Steer", V(FA.x, 0, 0)), "Contact_R": ("Body", V(RA.x, 0, 0)),
    }


def world_m(name):
    par, p, rot = PIVOTS[name]
    return Matrix.Translation(R_EXP @ p) @ rot


def make_empty(name, parent, W):
    o = bpy.data.objects.new(name, None)
    o.empty_display_size = 0.03
    bpy.context.scene.collection.objects.link(o)
    if parent:
        o.parent = bpy.data.objects[parent]
        o.matrix_parent_inverse = Matrix.Identity(4)
        o.matrix_basis = WORLD[parent].inverted() @ W
    else:
        o.matrix_basis = W
    WORLD[name] = W
    return o


WORLD = {}


def textures_mode():
    """the chain strip (side + top, 2 links = 25.4 mm) and one side's 18 spokes, rendered as albedo x AO emission"""
    scn = K.reset()
    T.gpu_setup(scn)
    scn.cycles.samples = 96
    scn.render.film_transparent = True
    scn.view_settings.view_transform = "Standard"; scn.view_settings.look = "None"
    scn.render.image_settings.file_format = "PNG"; scn.render.image_settings.color_mode = "RGBA"; scn.render.image_settings.color_depth = "8"
    scn.render.filter_size = 1.2
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.use_nodes = True
    scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.0

    def emat(name, col, ao_d, lo=0.5):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        out = nt.nodes.new("ShaderNodeOutputMaterial"); em = nt.nodes.new("ShaderNodeEmission")
        ao = nt.nodes.new("ShaderNodeAmbientOcclusion"); ao.inputs["Distance"].default_value = ao_d; ao.samples = 16
        mr = nt.nodes.new("ShaderNodeMapRange"); mr.inputs["To Min"].default_value = lo
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        mul.inputs[6].default_value = (*col, 1)
        nt.links.new(ao.outputs["AO"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], mul.inputs[7])
        nt.links.new(mul.outputs[2], em.inputs["Color"]); nt.links.new(em.outputs[0], out.inputs[0])
        return m

    def obj(bm, m, name):
        me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free(); me.materials.append(m)
        for p in me.polygons: p.use_smooth = True
        o = bpy.data.objects.new(name, me); scn.collection.objects.link(o); return o

    def cam_ortho(pos, rot, scale, rx, ry, path):
        cd = bpy.data.cameras.new("C"); cd.type = "ORTHO"; cd.ortho_scale = scale; cd.clip_start = 0.001; cd.clip_end = 2.0
        c = bpy.data.objects.new("C", cd); scn.collection.objects.link(c); scn.camera = c
        c.location = pos; c.rotation_euler = rot
        scn.render.resolution_x, scn.render.resolution_y = rx, ry
        scn.render.filepath = path; bpy.ops.render.render(write_still=True)
        bpy.data.objects.remove(c)

    # ---- chain: 12 links along X, centred; the pitch line on z = 0, y = 0 the chain's middle
    plO, plI, rol, pin = emat("outer", (0.58, 0.58, 0.56), 0.004), emat("inner", (0.40, 0.40, 0.39), 0.004), emat("roller", (0.17, 0.16, 0.15), 0.003, 0.35), emat("pin", (0.72, 0.72, 0.70), 0.003)
    p = 0.0127

    def link_plate(x0, y, th, r, h):
        a0 = math.asin(h / r); n = 28; pts = []
        for k in range(n + 1): pts.append((x0 + p + r * math.cos(-math.pi + a0 + (2 * math.pi - 2 * a0) * k / n), r * math.sin(-math.pi + a0 + (2 * math.pi - 2 * a0) * k / n)))
        pts.append((x0 + p / 2, h - 0.0006))
        for k in range(n + 1): pts.append((x0 + r * math.cos(a0 + (2 * math.pi - 2 * a0) * k / n), r * math.sin(a0 + (2 * math.pi - 2 * a0) * k / n)))
        pts.append((x0 + p / 2, -h + 0.0006))
        bm = K.bm_profile_extrude(pts, th, bevel=0.0002, segs=1); bm.transform(Matrix.Translation((0, y, 0))); return bm

    for i in range(-6, 6):
        x0 = i * p
        outer = i % 2 == 0
        for s in (1, -1):
            if outer: obj(link_plate(x0, s * 0.0036, 0.0009, 0.0057, 0.0045), plO, "po")
            else: obj(link_plate(x0, s * 0.0022, 0.0009, 0.0055, 0.0042), plI, "pi")
        bm = T.cyl_between(V(x0, -0.0017, 0), V(x0, 0.0017, 0), 0.0039, segs=24, bevel=0.0); obj(bm, rol, "r")
        bm = T.cyl_between(V(x0, -0.0045, 0), V(x0, 0.0045, 0), 0.0018, segs=16, bevel=0.0); obj(bm, pin, "pn")
        for s in (1, -1):
            bm = T.ellipsoid(V(x0, s * 0.0045, 0), (0.0018, 0.0006, 0.0018), segs=16, rings=8); obj(bm, pin, "ph")
    # side: from +Y looking -Y, 512 x 256 = 25.4 x 12.7 mm (the period centred on x = 0: two links)
    cam_ortho(V(0.0, 0.05, 0.0), (math.radians(90), 0, math.radians(180)), 0.0254, 512, 256, os.path.join(TEX, "chain_side.png"))
    cam_ortho(V(0.0, 0.0, 0.05), (0, 0, math.radians(0)), 0.0254, 512, 256, os.path.join(TEX, "chain_top.png"))
    for o in list(scn.objects): bpy.data.objects.remove(o)
    # ---- spokes (the left set, seen from the left: image u = -x, v = +z), 2 mm, J-bends at the flange, nipples
    spm, nip = emat("spoke", (0.80, 0.80, 0.80), 0.012, 0.6), emat("nipple", (0.62, 0.62, 0.60), 0.006, 0.5)
    for a, b in spokes_left():
        obj(T.cyl_between(a, b, 0.0010, segs=10, bevel=0.0), spm, "s")
        d = (b - a).normalized()
        obj(T.cyl_between(b - d * 0.013, b + d * 0.002, 0.0019, segs=10, bevel=0.0), nip, "n")
        obj(T.ellipsoid(a - d * 0.0006, (0.0022, 0.0022, 0.0022), segs=10, rings=6), spm, "h")
    cam_ortho(V(0.0, 0.3, 0.0), (math.radians(90), 0, math.radians(180)), 2 * SPOKE_CARD_R, 1024, 1024, os.path.join(TEX, "spokes.png"))
    print("textures ->", TEX)


def main():
    global DET
    t0 = time.time()
    scn = K.reset()
    make_materials()
    parts = {}
    for k in range(3):
        DET = k
        for node in NODES:
            P = Part(f"{node}_LOD{k}")
            BUILDERS[node](P)
            o = P.to_object(smooth_angle=(50, 62, 66)[k])
            parts[(node, k)] = o
    chain_len, chain_periods = build_chain_len()
    # pivots (empties) and the meshes parented with node-local data
    for name in PIVOTS:
        par = PIVOTS[name][0]
        make_empty(name, par, world_m(name))
    for name, (par, p) in empties_def().items():
        make_empty(name, par, Matrix.Translation(R_EXP @ p) @ WORLD[par].to_quaternion().to_matrix().to_4x4())
    lod_objs = []
    for (node, k), o in parts.items():
        o.data.transform(R_EXP)
        o.data.transform(WORLD[node].inverted())
        o.parent = bpy.data.objects[node]; o.matrix_parent_inverse = Matrix.Identity(4); o.matrix_basis = Matrix.Identity(4)
        wn = o.modifiers.new("wn", "WEIGHTED_NORMAL"); wn.keep_sharp = True; wn.weight = 50; wn.mode = "FACE_AREA"
        lod_objs.append(o)
    bpy.context.view_layer.update()
    tris = {}
    for (node, k), o in parts.items():
        tris.setdefault(f"LOD{k}", 0); tris[f"LOD{k}"] += K.tris(o)
    print("triangles", tris, flush=True)
    # vertex AO per node alone (no ground: the game draws its own contact), cached
    T.bake_vertex_ao(lod_objs, os.path.join(ROOT, ".bake_cache", "bmx"), bake=BAKE, samples=64, dist=0.06, no_ground=("",))
    for o in lod_objs:                                  # LOD2 (40 m +): no AO (its flat tubes have vertices only at their buried ends)
        if o.name.endswith("_LOD2"):
            col = o.data.color_attributes["Col"]
            col.data.foreach_set("color", [1.0] * (4 * len(col.data)))
    for o in lod_objs:                                  # the sprockets' faces: one AO (tooth tips vs roots made radial wedges)
        node = o.name.rsplit("_LOD", 1)[0]
        if node not in ("Crank", "Cog"): continue
        rin, rp = (0.047, R_RING) if node == "Crank" else (0.014, R_COG)
        col = o.data.color_attributes["Col"]
        for v in o.data.vertices:
            if abs(v.co.x - CL) < 0.0025 and rin - 0.001 < math.hypot(v.co.y, v.co.z) < rp + 0.006: col.data[v.index].color = (0.9, 0.9, 0.9, 1)
    for o in lod_objs:                                  # the spoke cards: no AO (a card's vertices sit inside the hub / rim)
        me = o.data; col = me.color_attributes["Col"]
        si = [i for i, m in enumerate(me.materials) if m.name == "bmx_spokes"]
        if not si: continue
        for p in me.polygons:
            if p.material_index in si:
                for v in p.vertices: col.data[v].color = (1, 1, 1, 1)
    if SWATCH:                                          # a colourway preview only (no export)
        sun, cam = preview_setup()
        for (node, kk), o in parts.items(): o.hide_render = (kk != 0)
        sun.rotation_euler = tuple(math.radians(a) for a in (54, 0, 40))
        K.render(cam, os.path.join(DOCS, f"colourway_{COLOURWAY}.jpg"), R_EXP @ V(1.6, -1.8, 1.0), R_EXP @ V(0.0, 0, 0.45), 42, (1000, 680))
        return
    # export
    for o in scn.objects: o.select_set(True)
    bpy.context.view_layer.objects.active = bpy.data.objects["BMX"]
    raw = os.path.join(OUT, "bmx.raw.glb")
    bpy.ops.export_scene.gltf(filepath=raw, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                              export_extras=True, export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
    print("exported", raw, os.path.getsize(raw) // 1024, "KB", flush=True)
    write_json(tris, chain_len, chain_periods)
    print(f"build {time.time() - t0:.0f}s", flush=True)
    if RENDERS: renders(parts)


def build_chain_len():
    pts = chain_path(); n = len(pts)
    L = sum((pts[(i + 1) % n] - pts[i]).length for i in range(n))
    return L, round(L / 0.0254)


def gl(v): return [round(v[1], 5), round(v[2], 5), round(v[0], 5)]


def write_json(tris, chain_len, chain_periods):
    C, uB, gR, right = bar_points()
    em = empties_def()
    info = {
        "file": "bmx.glb", "source": "tools/blender/bmx.py (+ tools/bike/bmx_pack.mjs)", "frame": "glTF: x left, y up, z forward; root on the ground midway between the axles",
        "colourway": COLOURWAY,
        "colourways": {k: {"paint": lin(v["paint"]), "pad": lin(v["pad"]), "grip": lin(v["grip"]), "saddle": lin(v["saddle"]), "note": v["note"]} for k, v in COLOURWAYS.items()},
        "dims": {"wheelbase": WB, "wheelR": RW, "headAngleDeg": 74, "seatAngleDeg": 71, "forkOffset": OFF, "trail": round((RW * math.cos(HA) - OFF) / math.sin(HA), 4),
                 "bbHeight": BB.z, "chainStay": 0.366, "crankLength": CRANK, "barWidth": round(2 * GRIP_Y, 3), "teeth": [44, 16],
                 "rollout": round(2 * math.pi * RW * 44 / 16, 3)},
        "nodes": {
            "Body": {"parent": "BMX", "pos": gl(V(0, 0, 0))},
            "Steer": {"parent": "Body", "pos": gl(PIVOT_STEER), "axis": gl(dS), "note": "local +Y = the steering axis; rotate about local +Y, + = left"},
            "Wheel_F": {"parent": "Steer", "pos": gl(FA), "spin": "local +X, + = rolling forward"},
            "Wheel_R": {"parent": "Body", "pos": gl(RA), "spin": "local +X, + = rolling forward"},
            "Cog": {"parent": "Body", "pos": gl(RA), "spin": "local +X; = crank angle * 44 / 16 while pedalling (freewheel: free when coasting)"},
            "Crank": {"parent": "Body", "pos": gl(BB), "spin": "local +X, + = pedalling forward; at rest the right arm points forward (+z)"},
            "Pedal_L": {"parent": "Crank", "pos": gl(pedal_centre("L")), "note": "rotation.x = -crank keeps it level"},
            "Pedal_R": {"parent": "Crank", "pos": gl(pedal_centre("R")), "note": "rotation.x = -crank keeps it level"},
        },
        "empties": {k: {"parent": par, "pos": gl(p)} for k, (par, p) in em.items()},
        "gripAxis": {"R": gl(gR), "L": gl(mir(gR))},
        "lods": {"meshes": "<Node>_LOD0/1/2 children of each node (show one level)", "suggestedMetres": [12, 40], "triangles": tris},
        "chain": {"slot": "bmx_chain", "length": round(chain_len, 4), "periods": chain_periods, "period": 0.0254,
                  "uvPerMetre": round(chain_periods / chain_len, 4), "ringPitchRadius": round(R_RING, 5),
                  "scroll": "texture offset.x -= crankAngleDelta * ringPitchRadius * uvPerMetre (pedalling forward: the upper run moves forward)"},
        "textures": {"bmx_chain": {"file": "bmx_chain.ktx2", "alpha": "MASK 0.5"}, "bmx_spokes": {"file": "bmx_spokes.ktx2", "alpha": "BLEND, double sided (pre-filtered cards)"}},
    }
    json.dump(info, open(os.path.join(OUT, "bmx.json"), "w"), indent=1)


# ------------------------------------------------------------------------------------------------ renders
def renders(parts):
    scn = bpy.context.scene
    sun, cam = preview_setup()
    B = lambda p: R_EXP @ Vector(p)
    def show(k):
        for (node, kk), o in parts.items(): o.hide_render = (kk != k)
    def look(name, pos, tgt, lens=50, res=(1400, 900), sun_rot=None, lod=0):
        show(lod)
        if sun_rot: sun.rotation_euler = tuple(math.radians(a) for a in sun_rot)
        K.render(cam, os.path.join(DOCS, name + ".jpg"), B(pos), B(tgt), lens, res)
    tag = "checker_" if CHECKER else ""
    mid = V(0.0, 0, 0.45)
    default_sun = (54, 0, 150)
    if CHECKER:
        look(tag + "side", V(0.0, 2.6, 0.55), mid, 42, sun_rot=default_sun)
        look(tag + "34", V(1.6, -1.8, 1.0), mid, 42, sun_rot=default_sun)
        look(tag + "grazing_side", V(0.0, 2.6, 0.55), mid, 42, sun_rot=(86, 0, 95))
        look(tag + "grazing_front", V(1.9, 0.9, 0.75), V(0.3, 0, 0.6), 45, sun_rot=(85, 0, 10))
        look(tag + "grazing_stem", V(0.85, -0.45, 1.05), ax(0.53), 60, sun_rot=(84, 0, 60))
        look(tag + "grazing_cranks", V(0.05, -0.75, 0.42), BB, 55, sun_rot=(85, 0, 175))
        return
    look("bmx_side", V(0.0, 2.6, 0.55), mid, 42, sun_rot=default_sun)
    look("bmx_side_right", V(0.0, -2.6, 0.55), mid, 42, sun_rot=(54, 0, 30))
    look("bmx_front", V(2.8, 0.0, 0.8), V(0, 0, 0.5), 50, sun_rot=default_sun)
    look("bmx_rear", V(-2.8, 0.3, 0.9), V(0, 0, 0.5), 50, sun_rot=default_sun)
    look("bmx_34", V(1.6, -1.8, 1.0), mid, 42, sun_rot=(54, 0, 40))
    look("bmx_34_rear", V(-1.7, 1.6, 1.1), mid, 42, sun_rot=default_sun)
    look("bmx_chase", V(-2.9, 0.4, 1.45), V(0.1, 0, 0.55), 40, sun_rot=default_sun)
    look("close_cranks", V(0.12, -0.75, 0.40), BB + V(0.0, -0.05, 0.0), 55, sun_rot=(50, 0, 20))
    look("close_stem", V(0.75, -0.40, 1.08), ax(0.53), 58, sun_rot=(50, 0, 40))
    look("close_rear", V(-0.55, -0.55, 0.55), RA + V(0.08, 0, 0.12), 50, sun_rot=(50, 0, 20))
    look("close_ring_side", V(-0.11, -0.62, 0.30), BB + V(0.0, -0.04, 0.0), 60, sun_rot=(50, 0, 10))
    look("close_cog", V(-0.62, -0.42, 0.40), RA + V(0.02, -0.04, 0.0), 75, sun_rot=(50, 0, 20))
    look("close_rim_tyre", V(0.75, -0.42, 0.42), FA + V(0.10, 0, 0.12), 70, sun_rot=(50, 0, 40))
    look("close_tread", FA + V(0.55, -0.20, 0.42), FA + V(0.20, 0, 0.13), 60, sun_rot=(50, 0, 40))
    look("close_downtube", V(0.35, -0.55, 0.75), (DTj + BB) / 2, 50, sun_rot=(54, 0, 40))
    look("lod1_side", V(0.0, 2.6, 0.55), mid, 42, sun_rot=default_sun, lod=1)
    look("lod2_side", V(0.0, 2.6, 0.55), mid, 42, sun_rot=default_sun, lod=2)
    for i in range(8):
        a = 2 * math.pi * i / 8
        look(f"tex/_work/turntable_{i}", V(2.7 * math.cos(a), 2.7 * math.sin(a), 0.9), mid, 45, (700, 450), sun_rot=default_sun)


def preview_setup():
    scn = bpy.context.scene
    T.gpu_setup(scn)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    for m in K._MATS.values():
        nt = m.node_tree; b = nt.nodes["Principled BSDF"]
        vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 1.0
        nt.links.new(vc.outputs["Color"], mul.inputs[7])
        if m.name in TEXTURED and os.path.exists(os.path.join(TEX, TEXTURED[m.name])):
            uv = nt.nodes.new("ShaderNodeUVMap"); uv.uv_map = "UVMap"
            tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = bpy.data.images.load(os.path.join(TEX, TEXTURED[m.name]))
            tx.extension = "REPEAT" if m.name == "bmx_chain" else "CLIP"
            nt.links.new(uv.outputs[0], tx.inputs[0]); nt.links.new(tx.outputs["Color"], mul.inputs[6]); nt.links.new(tx.outputs["Alpha"], b.inputs["Alpha"])
        else:
            mul.inputs[6].default_value = (*m["preview"], 1)
        src = mul.outputs[2]
        if CHECKER and m.name not in TEXTURED:
            ck = nt.nodes.new("ShaderNodeTexChecker"); ck.inputs["Scale"].default_value = 40.0
            ck.inputs["Color1"].default_value = (0.55, 0.55, 0.55, 1); ck.inputs["Color2"].default_value = (0.25, 0.25, 0.25, 1)
            uv2 = nt.nodes.new("ShaderNodeUVMap"); uv2.uv_map = "UVMap"; nt.links.new(uv2.outputs[0], ck.inputs[0])
            m2 = nt.nodes.new("ShaderNodeMix"); m2.data_type = "RGBA"; m2.blend_type = "MULTIPLY"; m2.inputs["Factor"].default_value = 1.0
            nt.links.new(ck.outputs["Color"], m2.inputs[6]); nt.links.new(vc.outputs["Color"], m2.inputs[7]); src = m2.outputs[2]
            b.inputs["Metallic"].default_value = 0.0; b.inputs["Roughness"].default_value = 0.5; b.inputs["Coat Weight"].default_value = 0.0
        nt.links.new(src, b.inputs["Base Color"])
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 3.6; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.30
    scn.cycles.samples = 64; scn.cycles.use_denoising = True
    try: scn.cycles.denoiser = "OPTIX"
    except Exception: pass
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    gm = bpy.data.materials.new("preview_ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.10, 0.10, 0.10, 1)
    gm.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0.0)); bpy.context.active_object.data.materials.append(gm)
    return so, cam


if __name__ == "__main__":
    if "--textures" in ARGS: textures_mode()
    else: main()
