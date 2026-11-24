"""TIMBER PLAY KIT: natural log play equipment, first for the Chenaie garden's sand playground in front of Le Pigeon Noir
(claude/places3; data/overrides.json playgrounds.chenaie). Blender 5.0, headless, Cycles on the GPU (OptiX; the
--factory-startup default is the CPU, switched here):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/timberPlayKit.py -- models/parkkit [--no-bake] [--previews]
    node tools/park_kit_pack.mjs timber          (LODs with meshoptimizer -> models/parkkit/timberkit.glb)

STYLE (look-only Street View, Avenue de la Chenaie, Apr 2024; the usual Brussels robinia play frames): peeled,
crooked robinia logs (12-18 cm) weathered grey-ochre, their sawn ends chamfered with the bark's rim left round the end
grain and ragged bark collars near the ends, hemp-look play rope (16 mm, steel core) in diamond-square nets with knots,
a small tower with a plank deck and a board roof, a log ladder, balance logs on stumps, stepping stumps.

Pieces (one object each, origin = footprint centre on the ground, Blender -Y = glTF +Z = the piece's front); LODs
SCRIPTED here (three levels: "<piece>" + "<piece>__detail" = LOD0, "<piece>__lod1", "<piece>__lod2": fewer log sides and
rings, plain sawn ends, slabs for the boards, the nets as 4-sided ropes at LOD1 and gone at LOD2; one seed per log, so
every level has the same crooks):
  tl_tower   a 1.2 m log tower: 4 crooked posts through the tie logs, a plank deck at 1.1 m on two bearer logs, log
             rails on three sides, a gable roof of bevelled boards on a ridge log, a log ladder at the front, a sloped
             rope net up the side from a half-buried ground log (tl_tower__detail = the net ropes, knots and clamps)
  tl_climb   a log climbing frame: two A-frames, a ridge log, two sloped rope nets (a tent) down to half-buried
             ground logs, a brace in each A (tl_climb__detail: the nets)
  tl_beam    a balance course: two balance logs in a zigzag on stumps, four stepping stumps of different heights
Slots by NAME only (no baked colour): wood_robinia (the peeled logs), bark (rims and collars), end_grain (the sawn
ends), rope_hemp, wood_board (deck planks, roof boards), steel_galvanised (the rope clamps, the bolts).
UV0 metres along each part's grain; UV1 the AO atlas (timberkit_ao.png). Colliders: info["colliders"][piece] = oriented
boxes [cx, cy, cz, ax, ay, az, bx, by, bz, ux, uy, uz] (centre + three half-axes, Blender frame) for the walker's
triangles and the car's band (viewer/playgroundCity.js).
"""
import bpy, bmesh, math, os, sys, json, random, time
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_tube_path, M, align_z, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/parkkit")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
rnd = random.Random(23)

ROB = K.mat("wood_robinia", (0.42, 0.36, 0.28), 0.82)
BARK = K.mat("bark", (0.16, 0.12, 0.09), 0.95)
END = K.mat("end_grain", (0.52, 0.42, 0.30), 0.85)
ROPE = K.mat("rope_hemp", (0.50, 0.41, 0.27), 0.9)
BOARD = K.mat("wood_board", (0.40, 0.33, 0.25), 0.8)
GALV = K.mat("steel_galvanised", (0.55, 0.56, 0.57), 0.45, 0.8)
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)
COL = {}                     # piece -> [oriented boxes]
LV = 0                       # the level being built (0, 1, 2)
SEGS = {0: 1.0, 1: 0.67, 2: 0.42}      # a log's sides x
RING = {0: 0.22, 1: 0.5, 2: 1.2}       # m between a log's rings


def collider(piece, c, a, b, u):
    if LV: return                          # (once: the colliders are the LOD0's)
    COL.setdefault(piece, []).append([round(v, 4) for v in (*c, *a, *b, *u)])


def col_box(piece, c, s):
    collider(piece, c, (s[0] / 2, 0, 0), (0, s[1] / 2, 0), (0, 0, s[2] / 2))


def col_log(piece, a, b, r):
    """an oriented box round a log a -> b"""
    a, b = Vector(a), Vector(b)
    d = b - a; L = d.length; d.normalize()
    s = Vector((0, 0, 1)).cross(d)
    s = s.normalized() if s.length > 1e-6 else Vector((1, 0, 0))
    t = d.cross(s).normalized()
    collider(piece, (a + b) / 2, d * (L / 2), s * r, t * r)


# ------------------------------------------------------------------------------------------------ the log
def log(P, a, b, r0, r1=None, seed=0, segs=12, crook=0.012, bark_ends=(True, True), patches=0.015, cham=0.014):
    """a peeled, crooked robinia log from a to b (radius r0 -> r1): rings every ~0.22 m, the section a little out of
    round, the centreline bowed; each sawn end chamfered (the chamfer = the bark's rim, slot bark) round an end-grain
    face; ragged bark collars near the ends (bark_ends) and a few bark patches (slot by face, flat-shaded nowhere: the
    body is smooth, the end grain flat)"""
    a, b = Vector(a), Vector(b)
    lr = random.Random(f"{seed}:{a.x:.3f},{a.y:.3f},{a.z:.3f}:{b.x:.3f},{b.y:.3f},{b.z:.3f}")   # (the same log at every level)
    segs = max(5, int(round(segs * SEGS[LV])))
    sp = RING[LV]
    cham = cham if LV == 0 else 0.0
    r1 = r0 if r1 is None else r1
    d = b - a; L = d.length; d.normalize()
    s0 = Vector((0, 0, 1)).cross(d)
    s0 = s0.normalized() if s0.length > 1e-6 else Vector((1, 0, 0))
    t0 = d.cross(s0).normalized()
    ph = lr.random() * 10 + seed
    bow = Vector((math.sin(ph), math.cos(ph * 1.3), 0)).normalized()
    bow = (s0 * bow.x + t0 * bow.y) * (crook * L)
    bm = bmesh.new()
    # the rings: per ring, per vertex, the fraction along the log; a bark collar's ring (ragged: 5-13 cm from the end,
    # jittered per vertex) next to each barked end
    # (LOD1 / LOD2: the collar is the first ring strip, its ring straight)
    jag = (lambda: min(0.3, (0.05 + 0.08 * lr.random()) / L)) if LV == 0 else (lambda: min(0.3, 0.09 / L))
    fr = [[0.0] * segs]
    if bark_ends[0]: fr.append([jag() for _ in range(segs)])
    lo, hi = (0.16 / L if bark_ends[0] else 0.0), (1 - 0.16 / L if bark_ends[1] else 1.0)
    if LV and bark_ends[0]: fr.pop(); lo = 0.09 / L
    if LV and bark_ends[1]: hi = 1 - 0.09 / L
    m = max(1, int((hi - lo) * L / sp))
    for i in range(0 if bark_ends[0] else 1, m + (1 if bark_ends[1] else 0)):
        if lo < 1e-9 and i == 0: continue
        fr.append([lo + (hi - lo) * i / m] * segs)
    if bark_ends[1] and LV == 0: fr.append([1 - jag() for _ in range(segs)])
    fr.append([1.0] * segs)
    fr = [q for q in fr if 0 <= q[0] <= 1]
    fr.sort(key=lambda q: sum(q))
    nb0, nb1 = (1 if bark_ends[0] else 0), (len(fr) - 2 if bark_ends[1] else -1)
    rings = []
    for fq in fr:
        ring = []
        for k in range(segs):
            f = fq[k]
            c = a + d * (L * f) + bow * math.sin(math.pi * f) + (s0 * noise.noise(Vector((ph, f * 3, 0))) + t0 * noise.noise(Vector((f * 3, ph, 1)))) * (0.006 * L)
            r = r0 + (r1 - r0) * f
            ang = 2 * math.pi * k / segs
            w = 1.0 + 0.07 * noise.noise(Vector((math.cos(ang) * 1.3 + ph, math.sin(ang) * 1.3, f * 2.0))) + 0.03 * math.sin(2 * ang + ph)
            ring.append(bm.verts.new(c + (s0 * math.cos(ang) + t0 * math.sin(ang)) * r * w))
        rings.append(ring)
    n = len(rings) - 1
    body = []
    for i in range(n):
        for k in range(segs):
            fc = bm.faces.new([rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]]); fc.smooth = True
            bk = (i < nb0) or (i >= nb1 >= 0) or (lr.random() < patches and LV < 2)
            body.append((fc, bk))
    # the sawn ends: a chamfer ring (bark rim) then the end-grain face (flat); LOD1 / LOD2: the end grain alone
    caps = []
    for ring, sgn in ((rings[0], -1), (rings[-1], 1)):
        cen = sum((v.co for v in ring), Vector()) / segs
        if not cham:
            fc = bm.faces.new(ring if sgn > 0 else ring[::-1]); fc.smooth = False; caps.append((fc, None)); continue
        inner = [bm.verts.new(cen + (v.co - cen) * (1 - cham / max(r0, r1) * 1.6) + d * (sgn * cham)) for v in ring]
        for k in range(segs):
            q = [ring[k], ring[(k + 1) % segs], inner[(k + 1) % segs], inner[k]]
            fc = bm.faces.new(q if sgn > 0 else q[::-1]); fc.smooth = False; caps.append((fc, True))
        fc = bm.faces.new(inner if sgn > 0 else inner[::-1]); fc.smooth = False; caps.append((fc, None))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    # split by slot into three temporary meshes (Part.add_bm takes one slot a call)
    for slot, pick in ((ROB, lambda bk: bk is False), (BARK, lambda bk: bk is True), (END, lambda bk: bk is None)):
        sub = bmesh.new()
        vm = {}
        for fc, bk in body + caps:
            if not pick(bk): continue
            vs = []
            for v in fc.verts:
                if v not in vm: vm[v] = sub.verts.new(v.co)
                vs.append(vm[v])
            nf = sub.faces.new(vs); nf.smooth = fc.smooth
        if len(sub.faces): P.add_bm(sub, slot, tuple(d))
        else: sub.free()
    bm.free()


def stump(P, x, y, h, r, seed=0, z0=-0.35):
    log(P, (x, y, z0), (x, y, h), r, r * 0.96, seed, segs=14, crook=0.004, bark_ends=(False, True), patches=0.03)


def plank(P, c, size, grain, mat=BOARD, rot=(0, 0, 0)):
    P.add_bm(bm_box(*size, 0.005 if LV == 0 else 0.0, 1), mat, grain, M(c, rot))


def rope(P, pts, r=0.008, segs=6):
    P.add_bm(bm_tube_path(pts, r, segs), ROPE, None)


def net(D, corners, nu, nv, sag=0.04, knots=True):
    """a square rope net over the quad corners (p00, p10, p11, p01): nu ropes one way, nv the other, a little sag, the
    cross ropes laid 9 mm over the long ones (no shared vertex where they cross); LOD0: 6-sided 16 mm ropes, the knots
    as small rope balls, galvanised clamps at the frame (into D, the detail); LOD1: 4-sided ropes; LOD2: none"""
    if LV == 2: return
    p00, p10, p11, p01 = (Vector(c) for c in corners)
    nrm = (p10 - p00).cross(p01 - p00).normalized()

    def at(u, v, lift=0.0):
        p = p00.lerp(p10, u).lerp(p01.lerp(p11, u), v)
        return p - nrm * (sag * math.sin(math.pi * u) * math.sin(math.pi * v) - lift)
    r, sg = (0.008, 6) if LV == 0 else (0.011, 4)
    for i in range(nu + 1):
        rope(D, [at(i / nu, j / (nv * 2)) for j in range(nv * 2 + 1)], r, sg)
    for j in range(nv + 1):
        rope(D, [at(i / (nu * 2), j / nv, 0.009) for i in range(nu * 2 + 1)], r, sg)
    if LV: return
    if knots:
        for i in range(1, nu):
            for j in range(1, nv):
                bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=0, radius=0.018)
                for f in bm.faces: f.smooth = True
                D.add_bm(bm, ROPE, None, M(at(i / nu, j / nv, 0.0045)))
    # the clamps where the ropes meet the frame (galvanised sleeves on the edge ropes' ends)
    for i in range(nu + 1):
        for v in (0.0, 1.0):
            c = at(i / nu, v)
            D.add_bm(bm_cyl(0.014, 0.04, 8, 0.003, 1), GALV, Zv, M(c - Vector((0, 0, 0.02))))


# ------------------------------------------------------------------------------------------------ pieces
def parts(base):
    if LV == 0: return Part(base), Part(f"{base}__detail")
    P = Part(f"{base}__lod{LV}")
    return P, P


def tower():
    P, D = parts("tl_tower")
    rnd.seed(1)
    s, zd, zt = 0.6, 1.1, 2.2
    for k, (x, y) in enumerate(((-s, -s), (s, -s), (s, s), (-s, s))):
        log(P, (x, y, -0.4), (x + rnd.uniform(-0.02, 0.02), y + rnd.uniform(-0.02, 0.02), zt + 0.05), 0.085, 0.075, k, crook=0.006)   # (the post's sawn top at the tie log's axis: a saddle joint, no shallow crossing)
        col_log("tl_tower", (x, y, -0.1), (x, y, zt + 0.1), 0.085)
    # the deck: two bearer logs along x (clear of the planks), planks across them
    for y in (-s + 0.09, s - 0.09):
        log(P, (-s - 0.12, y, zd - 0.105), (s + 0.12, y, zd - 0.105), 0.06, 0.055, 7, crook=0.004)
    if LV == 0:
        x = -s + 0.02
        while x < s - 0.02:
            plank(P, (x + 0.06, 0, zd - 0.01), (0.115, 2 * s + 0.04, 0.028), Y)
            x += 0.125
    else:
        plank(P, (0, 0, zd - 0.01), (2 * s - 0.03, 2 * s + 0.04, 0.028), Y)
    col_box("tl_tower", (0, 0, zd - 0.06), (2 * s + 0.2, 2 * s + 0.2, 0.12))
    # rails on three sides (the front, -Y, open to the ladder)
    for z in (zd + 0.45, zd + 0.85):
        log(P, (-s, s, z), (s, s, z), 0.045, 0.042, 11, crook=0.01)
        log(P, (-s, -s, z), (-s, s, z), 0.045, 0.042, 12, crook=0.01)
        log(P, (s, -s, z), (s, s, z), 0.045, 0.042, 13, crook=0.01)
    for a, b in (((-s, s), (s, s)), ((-s, -s), (-s, s)), ((s, -s), (s, s))):
        collider("tl_tower", ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2, zd + 0.45), ((b[0] - a[0]) / 2, (b[1] - a[1]) / 2, 0), (0.04, 0, 0) if a[0] == b[0] else (0, 0.04, 0), (0, 0, 0.45))
    # the roof: a ridge log on two king logs, bevelled boards down each slope, the top-frame logs under the eaves
    zr = zt + 0.62
    for x in (-s, s):
        log(P, (x, 0, zt + 0.05), (x, 0, zr), 0.05, 0.048, 20 + x, crook=0.003, bark_ends=(False, True))
        log(P, (x, -s - 0.1, zt + 0.05), (x, s + 0.1, zt + 0.05), 0.055, 0.052, 22 + x, crook=0.006)
    log(P, (-s - 0.25, 0, zr), (s + 0.25, 0, zr), 0.055, 0.05, 25, crook=0.004)
    pitch = math.atan2(zr - (zt + 0.05), s + 0.1)
    run = math.hypot(s + 0.32, (zr - zt) * (s + 0.32) / (s + 0.1)) + 0.02
    zb = zr + 0.09                                     # the boards' mid-plane over the ridge (clear of the ridge log)
    for sgn in (-1, 1):
        nb = 11 if LV == 0 else 1
        for k in range(nb):
            xb = -s - 0.25 + (2 * s + 0.5) * (k + 0.5) / nb
            mid_y = sgn * (run / 2) * math.cos(pitch)
            mid_z = zb - (run / 2) * math.sin(pitch)
            plank(P, (xb, mid_y, mid_z), (((2 * s + 0.5) / nb - 0.008) * (1 if sgn > 0 else 0.99), run, 0.024), Y, rot=(sgn * -pitch, 0, 0))   # (the two slopes' side faces 0.5 % apart: never coplanar at the ridge)
    # a board over the ridge (the cap)
    plank(P, (0, 0, zb + 0.03), (2 * s + 0.56, 0.16, 0.026), X)
    # the log ladder at the front
    yl0, yl1 = -s - 0.85, -s - 0.02
    for x in (-0.25, 0.25):
        log(P, (x, yl0, -0.15), (x, yl1, zd + 0.02), 0.05, 0.045, 30 + x, crook=0.004)
    for k in range(1, 4):
        f = k / 4.0
        y, z = yl0 + (yl1 - yl0) * f, -0.15 + (zd + 0.17) * f
        log(P, (-0.31, y, z + 0.04), (0.31, y, z + 0.04), 0.026, 0.026, 40 + k, crook=0.0, bark_ends=(False, False), patches=0.0, cham=0.006)
    col_log("tl_tower", (0, yl0, -0.15), (0, yl1, zd), 0.3)
    # the side net up to the deck from a half-buried ground log at +X
    xg = s + 1.0
    log(P, (xg, -s, 0.03), (xg, s, 0.03), 0.075, 0.07, 50, crook=0.01)
    net(D, ((xg, -s + 0.05, 0.1), (xg, s - 0.05, 0.1), (s + 0.04, s - 0.05, zd + 0.02), (s + 0.04, -s + 0.05, zd + 0.02)), 5, 6, sag=0.05)
    collider("tl_tower", ((xg + s) / 2, 0, (zd + 0.1) / 2), (0, s, 0), ((xg - s) / 2, 0, -(zd - 0.1) / 2), (0.05 * (zd - 0.1), 0, 0.05 * (xg - s)))
    return P, D


def climb():
    P, D = parts("tl_climb")
    rnd.seed(2)
    hx, hy, zr = 1.4, 1.0, 2.3
    for x in (-hx, hx):
        for sy in (-1, 1):
            log(P, (x + rnd.uniform(-0.03, 0.03), sy * hy, -0.35), (x, sy * 0.05, zr + 0.06), 0.08, 0.07, 60 + x * 3 + sy, crook=0.01, bark_ends=(False, True))
            col_log("tl_climb", (x, sy * hy, -0.1), (x, sy * 0.05, zr), 0.08)
        log(P, (x + 0.017, -0.62, 0.95), (x + 0.017, 0.62, 0.95), 0.045, 0.043, 70 + x, crook=0.008)            # the brace (off the legs' axis plane: no coplanar faces at LOD2)
    log(P, (-hx - 0.3, 0, zr + 0.06), (hx + 0.3, 0, zr + 0.06), 0.085, 0.075, 80, crook=0.008)
    col_log("tl_climb", (-hx - 0.3, 0, zr + 0.06), (hx + 0.3, 0, zr + 0.06), 0.085)
    for sy in (-1, 1):
        log(P, (-hx - 0.15, sy * (hy + 0.04), 0.03), (hx + 0.15, sy * (hy + 0.04), 0.03), 0.08, 0.075, 90 + sy, crook=0.01)
        net(D, ((-hx + 0.12, sy * (hy - 0.02), 0.1), (hx - 0.12, sy * (hy - 0.02), 0.1), (hx - 0.12, sy * 0.1, zr - 0.03), (-hx + 0.12, sy * 0.1, zr - 0.03)), 8, 7, sag=0.07)
        # the net's plane as a thin box (the walker climbs it as a slope, the car stops at it)
        c = Vector((0, sy * (hy + 0.1) / 2, (zr + 0.1) / 2))
        e = Vector((0, sy * (0.1 - hy) / 2, (zr - 0.1) / 2))
        nrm = Vector((0, -e.z, e.y)).normalized() * 0.03
        collider("tl_climb", tuple(c), (hx - 0.1, 0, 0), tuple(e), tuple(nrm))
    return P, D


def balance():
    P, _ = parts("tl_beam")
    rnd.seed(3)
    # two balance logs in a zigzag, each on two stumps (their tops saddled under the log)
    A0, A1, za = Vector((-1.85, -0.45, 0)), Vector((-0.05, 0.3, 0)), 0.34
    B0, B1, zb = Vector((0.1, 0.38, 0)), Vector((1.85, -0.25, 0)), 0.44
    for (p, q, z, r, sd) in ((A0, A1, za, 0.1, 100), (B0, B1, zb, 0.095, 110)):
        d = (q - p).normalized()
        log(P, (p.x, p.y, z), (q.x, q.y, z), r, r * 0.9, sd, crook=0.008)
        col_log("tl_beam", (p.x, p.y, z), (q.x, q.y, z), r)
        for f in (0.12, 0.88):
            c = p.lerp(q, f)
            stump(P, c.x, c.y, z - r * 0.85, 0.11, sd + f * 10)
            col_box("tl_beam", (c.x, c.y, (z - r * 0.85 - 0.1) / 2), (0.22, 0.22, z - r * 0.85 + 0.1))
    # stepping stumps
    for k, (x, y, h, r) in enumerate(((-1.5, 0.75, 0.22, 0.14), (-0.95, 0.95, 0.32, 0.13), (-0.35, 1.05, 0.42, 0.15), (0.55, 0.95, 0.3, 0.13))):
        stump(P, x, y, h, r, 120 + k)
        col_box("tl_beam", (x, y, (h - 0.1) / 2), (2 * r, 2 * r, h + 0.1))
    return P, None


BUILDERS = [tower, climb, balance]
objs, extras = [], []
for LV in (0, 1, 2):
    for b in BUILDERS:
        t = time.time()
        P, D = b()
        o = P.to_object(smooth_angle=40)
        o["ao_weight"] = 1.0 if LV == 0 else 0.35
        (objs if LV == 0 else extras).append(o)
        ex = ""
        if LV == 0 and D is not None:
            x = D.to_object(smooth_angle=40); x["ao_weight"] = 0.6; extras.append(x); ex = f", {x.name} {K.tris(x)}"
        print(f"{o.name}: {K.tris(o)} tris, slots {[m.name for m in o.data.materials]}{ex} {time.time() - t:.1f}s", flush=True)
LV = 0

for o in objs + extras:
    wn = o.modifiers.new("weighted", "WEIGHTED_NORMAL"); wn.keep_sharp = True; wn.weight = 50
allo = objs + extras
layout = K.atlas_layout(allo)
for o in allo: K.lightmap_uv(o, layout[o.name], margin=0.003)
ao_png = os.path.join(OUT, "timberkit_ao.png")
if BAKE:
    ao_img = K.bake_ao(allo, ao_png, px=2048, samples=96, distance=0.8, gpu=True)
else:
    ao_img = bpy.data.images.load(ao_png) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)

K.export_glb(allo, os.path.join(OUT, "timberkit.raw.glb"))
info = {
    "asset": "Park kit: natural timber log play equipment (tools/blender/timberPlayKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles_raw": K.tris(o),
                        "size_m": [round(o.dimensions.x, 2), round(o.dimensions.y, 2), round(o.dimensions.z, 2)],
                        "atlas": [round(v, 4) for v in layout[o.name]]} for o in allo},
    "extra_objects": {f.name: ("LOD0 only detail" if f.name.endswith("__detail") else f"the scripted LOD{f.name[-1]}") for f in extras},
    "slots": {m: "" for m in sorted({m.name for o in allo for m in o.data.materials})},
    "colliders": COL,
    "colliders_note": "oriented boxes [cx, cy, cz, ax, ay, az, bx, by, bz, ux, uy, uz]: centre + three half-axes in the Blender frame (z up; glTF / three: x, z, -y)",
    "attributes": {"TEXCOORD_0": "metres, u along the part's grain (log axis, board length)", "TEXCOORD_1": "AO atlas timberkit_ao.png"},
    "frame": "glTF Y up, origin = footprint centre on the ground, front = -Y (Blender) = +Z (glTF)",
}
# (the footprint the ring check uses: the main object's, the nets included)
for o in objs:
    xs = [v.co.x for x in [o] + [e for e in extras if e.name == o.name + "__detail"] for v in x.data.vertices]
    ys = [v.co.y for x in [o] + [e for e in extras if e.name == o.name + "__detail"] for v in x.data.vertices]
    info["pieces"][o.name]["footprint_m"] = [round(min(xs), 2), round(max(xs), 2), round(min(ys), 2), round(max(ys), 2)]
json.dump(info, open(os.path.join(OUT, "timberkit.json"), "w"), indent=1)

if PREVIEWS:
    for f in extras: f.hide_render = "__lod" in f.name
    so, cam = K.preview_setup(ao_img, sun_elev=38, sun_az=320)
    K.gpu_optix()
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    spots = {"tl_tower": (-3.2, 1.0), "tl_climb": (2.2, 1.5), "tl_beam": (0, -2.6)}
    for o in objs + extras: o.location = (*spots.get(o.name.split("__")[0], (0, 0)), 0)
    K.render(cam, os.path.join(PV, "timber_overview.jpg"), (-1.5, -11, 4.8), (0, 0.5, 1.0), 30, (1800, 1000))
    K.render(cam, os.path.join(PV, "timber_tower_close.jpg"), (-4.6, -2.4, 1.6), (-3.2, 1.0, 1.3), 38, (1400, 900))
    so.rotation_euler = (math.radians(70), 0, math.radians(290))
    K.render(cam, os.path.join(PV, "timber_ends_grazing.jpg"), (1.0, -1.2, 0.7), (0.2, -2.3, 0.35), 45, (1400, 900))
print(f"done {time.time() - T0:.0f}s")
