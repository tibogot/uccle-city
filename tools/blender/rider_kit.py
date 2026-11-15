"""RIDER KIT: the scripted riders' parts shared by tools/blender/scooter.py, villo_ride.py and motorbike.py (round 2).
Build frame: X forward, Y left, Z up. Every part goes into a kitlib Part with a named slot (Jacket, Trousers, Glove,
Boot, Skin, Helmet, Visor, Rubber...). Stylised but in real proportions (a 1.75 m adult); no faces beyond volumes.

  torso(P, hip, spine, fwd, keys, ...)   the jacket: a lofted chest / back, the hem band, the collar, the zip line
  head(P, hc, tilt, skin)                 skull + face volumes (brow, nose, chin, ears), neck
  jet_helmet / full_helmet / bike_helmet  helmets (shells cut and solidified: no open edge to see through)
  sleeve_upper / sleeve_fore              arm segments along +X from their joint (the viewer's two-bone IK)
  fist(P, at, side, glove)                fingers wrapped round a grip along Y through `at`, the thumb on the inner side
  shoe(P, heel, length, side, ...)        a sneaker / boot: upper, sole, heel, toe box
"""
import bmesh, math
from mathutils import Vector, Matrix
import kitlib as K
import twowheel_kit as T


def torso(P, hip, spine, fwd, keys, jacket, zip_mat=None, collar=True, n=28, hem=True):
    """keys [(s along the spine, half width, half depth)]; spine / fwd: unit vectors (up the back, forward across)"""
    hip, spine, fwd = Vector(hip), Vector(spine), Vector(fwd)
    sp = lambda s: hip + spine * s
    secs = []
    s0, s1 = keys[0][0], keys[-1][0]
    for i in range(19):
        s_ = s0 + (s1 - s0) * i / 18
        hw, hd = T.sample(keys, s_)
        c = sp(s_) + fwd * (0.010 * math.sin(math.pi * i / 18))
        secs.append((c, (0, hw, 0), fwd * hd, fwd * hd, 2.4))
    P.add_bm(T.loft(secs, n=n), jacket)
    if hem:                                                      # the jacket's hem: a band a little proud of the waist
        hw, hd = T.sample(keys, s0 + 0.02)
        hs = [(sp(s0 - 0.005), (0, hw + 0.008, 0), fwd * (hd + 0.008), fwd * (hd + 0.008), 2.4),
              (sp(s0 + 0.045), (0, hw + 0.008, 0), fwd * (hd + 0.008), fwd * (hd + 0.008), 2.4)]
        P.add_bm(T.loft(hs, n=n), jacket)
    if zip_mat is not None:                                      # the zip / placket down the front
        pts = []
        for i in range(10):
            s_ = s0 + 0.05 + (s1 - 0.06 - s0 - 0.05) * i / 9
            hw, hd = T.sample(keys, s_)
            pts.append(sp(s_) + fwd * (hd + 0.0035 + 0.010 * math.sin(math.pi * (s_ - s0) / (s1 - s0))))
        P.add_bm(T.tube(pts, 0.004, segs=6), zip_mat)
    if collar:
        hw, hd = T.sample(keys, s1)
        c = sp(s1 - 0.005)
        P.add_bm(T.loft([(c, (0, hw * 0.78, 0), fwd * hd * 0.95, fwd * hd * 0.95, 2.2),
                         (c + spine * 0.055, (0, hw * 0.62, 0), fwd * hd * 0.78, fwd * hd * 0.78, 2.2)], n=n), jacket)
    return sp


def head(P, hc, tilt, skin, neck_from=None, neck_r=0.052):
    """the head (centre hc, tilt: rotation matrix): skull, brow, nose, chin, ears; the neck from neck_from"""
    hc = Vector(hc)
    P.add_bm(T.ellipsoid(hc, (0.100, 0.078, 0.115), 24, 14, rot=tilt), skin)
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.072, 0, 0.030)), (0.035, 0.068, 0.022), 16, 8, rot=tilt), skin)     # brow
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.098, 0, -0.008)), (0.022, 0.014, 0.030), 12, 8, rot=tilt @ Matrix.Rotation(-0.25, 3, "Y")), skin)   # nose
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.030, 0, -0.068)), (0.056, 0.054, 0.042), 16, 8, rot=tilt), skin)    # jaw / chin
    for s in (1, -1):
        P.add_bm(T.ellipsoid(hc + tilt @ Vector((-0.005, s * 0.076, 0.0)), (0.018, 0.010, 0.030), 10, 6, rot=tilt), skin)   # ears
    if neck_from is not None:
        P.add_bm(T.cyl_between(Vector(neck_from), hc + tilt @ Vector((-0.02, 0, -0.07)), neck_r, segs=16, bevel=0.0), skin)


def _shell(c, r, rot, keep, thick, segs=32, rings=18):
    """an ellipsoid shell (centre c, radii r), faces kept where keep(local centre) is true, solidified (closed)"""
    bm = T.ellipsoid(Vector((0, 0, 0)), r, segs, rings)
    kill = [f for f in bm.faces if not keep(f.calc_center_median())]
    bmesh.ops.delete(bm, geom=kill, context="FACES")
    bmesh.ops.solidify(bm, geom=list(bm.faces), thickness=thick)
    bm.transform(Matrix.Translation(Vector(c)) @ rot.to_4x4())
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = True
    return bm


def jet_helmet(P, hc, tilt, helmet, visor, plastic):
    """an open-face (jet) helmet: the shell over the skull and ears, the face open below the brow; a short peak visor;
    the liner rim (plastic) round the opening"""
    hc = Vector(hc)
    hcen = hc + tilt @ Vector((-0.012, 0, 0.012))
    R = (0.150, 0.122, 0.142)
    keep = lambda p: not (p.z < -0.115 or (p.x > 0.02 and p.z < 0.030 - 0.25 * max(0, p.x - 0.02)) or (p.z < -0.06 and p.x > -0.04))
    P.add_bm(_shell(hcen, R, tilt, keep, 0.012), helmet)
    # the peak visor: a strip of a slightly larger shell over the brow, smoked
    keep_v = lambda p: p.x > 0.10 and 0.0 < p.z < 0.07 and abs(p.y) < 0.105
    P.add_bm(_shell(hcen, (0.162, 0.130, 0.152), tilt, keep_v, 0.003, 40, 22), visor)
    for s in (1, -1):                                            # visor pivots
        P.add_bm(T.ellipsoid(hcen + tilt @ Vector((0.045, s * 0.131, 0.025)), (0.016, 0.004, 0.016), 12, 6, rot=tilt), plastic)


def full_helmet(P, hc, tilt, helmet, visor, plastic):
    """a full-face helmet ~0.30 long, 0.24 wide, 0.27 tall: shell, chin bar, the visor over the eye port with its
    pivot plates, a top vent and a rear spoiler"""
    hc = Vector(hc)
    R = (0.150, 0.120, 0.135)
    keep = lambda p: not (p.z < -0.125 or (p.x > 0.06 and -0.045 < p.z < 0.045 and abs(p.y) < 0.09))
    P.add_bm(_shell(hc, R, tilt, keep, 0.014, 36, 20), helmet)
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.062, 0, -0.082)), (0.080, 0.104, 0.056), 22, 12, rot=tilt), helmet)   # chin bar
    keep_v = lambda p: p.x > 0.055 and -0.052 < p.z < 0.058 and abs(p.y) < 0.106
    P.add_bm(_shell(hc, (0.156, 0.125, 0.140), tilt, keep_v, 0.003, 40, 22), visor)
    for s in (1, -1):
        P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.030, s * 0.122, 0.020)), (0.022, 0.005, 0.020), 14, 6, rot=tilt), plastic)   # pivot plates
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.050, 0, 0.128)), (0.035, 0.022, 0.010), 14, 6, rot=tilt), plastic)       # top vent
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((-0.135, 0, 0.055)), (0.040, 0.065, 0.018), 14, 8, rot=tilt @ Matrix.Rotation(math.radians(-15), 3, "Y")), helmet)   # spoiler
    P.add_bm(T.ellipsoid(hc + tilt @ Vector((0.136, 0, -0.080)), (0.008, 0.028, 0.011), 10, 6, rot=tilt), plastic)       # chin vent


def bike_helmet(P, hc, tilt, helmet, plastic):
    """a light bicycle helmet: an elongated shell over the top of the head, five dark vent slots, the strap band"""
    hc = Vector(hc)
    hcen = hc + tilt @ Vector((-0.012, 0, 0.040))
    keep = lambda p: p.z > -0.010 + 0.12 * max(0, -p.x) * 0.5 - 0.02 * max(0, p.x)
    P.add_bm(_shell(hcen, (0.150, 0.112, 0.118), tilt, keep, 0.020, 32, 16), helmet)
    for s in (1, -1):
        P.add_bm(T.tube([hcen + tilt @ Vector((0.03, s * 0.10, -0.02)), hc + tilt @ Vector((0.02, s * 0.080, -0.075)), hc + tilt @ Vector((0.045, s * 0.04, -0.118))], 0.0035, segs=6), plastic)


def sleeve_upper(P, L, jacket, r0=0.050, r1=0.042):
    P.add_bm(T.tube([(0, 0, 0), (L * 0.5, 0, 0), (L, 0, 0)], [r0, (r0 + r1) / 2, r1], segs=14), jacket)
    P.add_bm(T.ellipsoid((L, 0, 0), (r1 + 0.003, r1 + 0.003, r1 + 0.003), 14, 8), jacket)


def sleeve_fore(P, L, jacket, glove, cuff=True, r0=0.042, r1=0.036, gauntlet=False):
    """the forearm (sleeve) to the wrist at L - 0.085, the cuff, then the fist round the grip at L"""
    w = L - 0.085
    P.add_bm(T.tube([(0, 0, 0), (w * 0.5, 0, 0), (w, 0, 0)], [r0, (r0 + r1) / 2, r1], segs=14), jacket)
    if cuff: P.add_bm(T.cyl_between((w - 0.018, 0, 0), (w + 0.004, 0, 0), r1 + 0.005, segs=14, bevel=0.003), jacket)
    if gauntlet: P.add_bm(T.cyl_between((w - 0.055, 0, 0), (w + 0.03, 0, 0), r1 + 0.010, segs=16, bevel=0.006, r2=r1 + 0.004), glove)
    else: P.add_bm(T.cyl_between((w - 0.004, 0, 0), (w + 0.03, 0, 0), 0.030, segs=14, bevel=0.004), glove)   # the wrist of the glove


def fist(P, at, side, glove, grip_r=0.0175):
    """a gloved fist closed round a grip whose axis runs along Y through `at` (the forearm comes from -X): the back of
    the hand over the grip, four fingers wrapped over the front and under, the thumb under from the inner side.
    side = +1 left hand, -1 right hand (the thumb is toward the bike's centre)."""
    at = Vector(at)
    ra = grip_r + 0.0105 + 0.002                                  # finger tube centre radius (2 mm off the grip)
    P.add_bm(T.ellipsoid(at + Vector((-0.040, 0, 0.018)), (0.048, 0.044, 0.024), 16, 8, rot=Matrix.Rotation(-0.35, 3, "Y")), glove)   # back of the hand
    P.add_bm(T.ellipsoid(at + Vector((-0.045, 0, -0.012)), (0.040, 0.040, 0.022), 14, 8), glove)    # palm heel
    for k, y in enumerate((-0.031, -0.0105, 0.0105, 0.031)):
        y = y * 1.0
        r = 0.0098 if k in (1, 2) else 0.0088
        a0, a1 = math.radians(112), math.radians(-115 + (8 if k in (0, 3) else 0))
        pts = [at + Vector((ra * math.cos(a0 + (a1 - a0) * i / 9), y, ra * math.sin(a0 + (a1 - a0) * i / 9))) for i in range(10)]
        P.add_bm(T.tube(pts, r, segs=8), glove)
    ty = -side * 0.044
    pts = [at + Vector((-0.040, ty * 0.9, -0.010)), at + Vector((-0.018, ty, -ra * 0.95)), at + Vector((0.004, ty * 0.75, -ra * 1.02)), at + Vector((0.020, ty * 0.45, -ra * 0.80))]
    P.add_bm(T.tube(T.smooth_path(pts, 3), [0.0115, 0.0105, 0.0095], segs=8), glove)


def shoe(P, heel, length, side, upper, sole, hw=0.046, high=0.10, boot=0.0, pitch=0.0):
    """a shoe from its heel point (on the sole's bottom) toward +X (rotated by pitch about Y round the heel): the upper
    (a lofted last), a 1.8 cm sole with its heel, the toe box; boot > 0 adds a shaft of that height"""
    heel = Vector(heel)
    rot = Matrix.Rotation(-pitch, 4, "Y")
    keys = [(0.0, hw * 0.78, high * 0.92, 0.012), (0.06, hw * 0.92, high, 0.012), (0.15, hw, high * 0.70, 0.012),
            (0.22, hw * 0.96, high * 0.48, 0.012), (length - 0.02, hw * 0.75, high * 0.36, 0.012), (length, hw * 0.35, high * 0.25, 0.014)]
    bm = T.loft_x(keys, stations=16, n=20, p_top=2.4, p_bot=6.0)
    bm.transform(Matrix.Translation(heel) @ rot)
    P.add_bm(bm, upper)
    sk = [(-0.004, hw * 0.80, 0.018, 0.0), (0.06, hw * 0.98, 0.018, 0.0), (0.16, hw * 1.04, 0.016, 0.0),
          (length - 0.03, hw * 0.86, 0.016, 0.0), (length + 0.004, hw * 0.42, 0.017, 0.0)]
    bm = T.loft_x(sk, stations=14, n=20, p_top=6.0, p_bot=8.0)
    bm.transform(Matrix.Translation(heel + Vector((0, 0, 0.0005))) @ rot)
    P.add_bm(bm, sole)
    if boot > 0:
        c = heel + (rot @ Vector((0.075, 0, 0)))
        P.add_bm(T.cyl_between(c + Vector((0, 0, high * 0.6)), c + Vector((0, 0, high * 0.6 + boot)), hw * 1.05, segs=20, bevel=0.008, r2=hw * 1.12), upper)
