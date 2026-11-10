"""ROOF KIT: real slate roofs as geometry, for any scripted building (first user: tools/blender/stalle.py).

Every slate is a thin plate with its own size, angle and lift, laid in courses with a broken bond (half a slate),
each course resting on the two below it: the butt of each slate stands proud by one slate thickness, so every course
casts its own shadow line, and the vertical joints show the slate beneath. Only the exposed part is modelled (the
covered head of each slate ends a few cm under the next course), so a slate is 8-12 triangles.

    import roofkit as RK
    RK.slate_quad(e0, e1, r1, r0, mat, code, spec=RK.NATURAL, seed=1)   # a planar facet: eave e0->e1, top r0 / r1
    RK.slate_poly(origin, X, Y, poly, mat, code, spec, seed)            # any convex facet in its own (x, y) frame

Faces go to the active stalle_common builder (K.B) with K.SEED = a per-slate random (COLOR_0.b) and K.VAO = True (per-
vertex AO: thousands of small plates take no lightmap space). The shader reads COLOR_0.b > 0 as "real slate" (no
painted courses) and uses it for the per-slate tone. The deck under the slates (the roof slab) stays: it is what the
far LOD shows with the painted-course material, and what one sees through the joints.

Specs (m): width / gauge (exposed height) / head (cover under the next course) / thickness / joint / jitters.
"""
import math, random
from mathutils import Vector
from stalle_common import K

# natural Belgian / Ardennes slate as seen on the chapel (photos P01, c05): small rectangular slates ~ 0.22 wide,
# ~0.14 exposed, 6-7 mm thick, dark blue-grey
NATURAL = dict(width=0.22, gauge=0.135, head=0.035, thick=0.0065, joint=0.004, w_jit=0.07, rot_jit=0.014, butt_jit=0.004,
               lift_jit=0.0015, chip=0.06, eave_over=0.04)
# a regular modern fibre-cement / machine-cut slate (for later: the city's 19th-20th c. roofs)
REGULAR = dict(width=0.30, gauge=0.20, head=0.04, thick=0.005, joint=0.003, w_jit=0.0, rot_jit=0.002, butt_jit=0.001,
               lift_jit=0.0003, chip=0.0, eave_over=0.04)

def _clip_poly(P, C):
    """clip polygon P by convex polygon C (both ccw), Sutherland-Hodgman"""
    out = P
    for i in range(len(C)):
        if not out: break
        A, B = C[i], C[(i + 1) % len(C)]
        side = lambda p: (B[0] - A[0]) * (p[1] - A[1]) - (B[1] - A[1]) * (p[0] - A[0])
        inp, out = out, []
        for k in range(len(inp)):
            p, q = inp[k], inp[(k + 1) % len(inp)]
            sp, sq = side(p), side(q)
            if sp >= -1e-12: out.append(p)
            if (sp >= -1e-12) != (sq >= -1e-12):
                t = sp / (sp - sq); out.append((p[0] + (q[0] - p[0]) * t, p[1] + (q[1] - p[1]) * t))
    return out

def _on_border(m, poly, tol=0.002):
    for i in range(len(poly)):
        a, b = poly[i], poly[(i + 1) % len(poly)]
        ax, ay = b[0] - a[0], b[1] - a[1]; L2 = ax * ax + ay * ay or 1e-12
        t = max(0.0, min(1.0, ((m[0] - a[0]) * ax + (m[1] - a[1]) * ay) / L2))
        if math.hypot(m[0] - a[0] - ax * t, m[1] - a[1] - ay * t) < tol: return True
    return False

def facet_uv(e0, e1, r1, r0, pts):
    """UV0 for a roof deck face in the same facet frame slate_quad uses (x along the eave from e0, y up the slope from
    the eave line): the shader's painted courses (the far roof) line up with the real slates' courses"""
    X = (e1 - e0).normalized()
    up = (r0 - e0) if (r0 - e0).length > 1e-6 else (r1 - e0)
    N = X.cross(up).normalized()
    if N.z < 0: N = -N
    Y = N.cross(X).normalized()
    if Y.dot(up) < 0: Y = -Y
    if X.cross(Y).dot(N) < 0: X = -X; e0 = e1
    return [((p - e0).dot(X), (p - e0).dot(Y)) for p in pts]

def _ccw(l):
    a = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    return l if a > 0 else list(reversed(l))

def slate_poly(origin, X, Y, poly, mat, code=0, spec=NATURAL, seed=1, lift=0.0):
    """slates over a convex facet: origin + x X + y Y (+ z N, N = X x Y, out of the roof), poly [(x, y)] the area to
    cover (y = 0 at the eave line, up the slope). Returns the number of slates."""
    rnd = random.Random(seed)
    N = X.cross(Y).normalized()
    poly = _ccw(poly)
    xs = [p[0] for p in poly]; ys = [p[1] for p in poly]
    W, G, Hd, T, J = spec["width"], spec["gauge"], spec["head"], spec["thick"], spec["joint"]
    y = min(ys) - spec["eave_over"]
    # the facet's area grows by the eave overhang: extend the polygon's lowest edge downward
    ext = [(p[0], p[1] - spec["eave_over"] if p[1] < min(ys) + 1e-6 else p[1]) for p in poly]
    n = 0; row = 0
    sv_seed, sv_vao = K.SEED, K.VAO
    K.VAO = True
    while y < max(ys) - 0.02:
        off = (0.5 * W if row % 2 else 0.0) + rnd.uniform(-0.03, 0.03)
        x = min(xs) - W + off
        while x < max(xs):
            w = W * (1 + rnd.uniform(-spec["w_jit"], spec["w_jit"]))
            x0, x1 = x + J / 2, x + w - J / 2
            yb = y + rnd.uniform(-spec["butt_jit"], spec["butt_jit"])
            yt = y + G + Hd
            # the slate's own frame: a small rotation about its butt centre
            a = rnd.uniform(-spec["rot_jit"], spec["rot_jit"]); ca, sa = math.cos(a), math.sin(a)
            cx, cy = (x0 + x1) / 2, yb
            rect = [(x0, yb), (x1, yb), (x1, yt), (x0, yt)]
            if spec["chip"] and rnd.random() < spec["chip"]:            # a chipped butt corner
                c = rnd.uniform(0.012, 0.035)
                rect = [(x0, yb + c), (x0 + c, yb), (x1, yb), (x1, yt), (x0, yt)] if rnd.random() < 0.5 else [(x0, yb), (x1 - c, yb), (x1, yb + c), (x1, yt), (x0, yt)]
            rect = [(cx + (px - cx) * ca - (py - cy) * sa, cy + (px - cx) * sa + (py - cy) * ca) for px, py in rect]
            P = _clip_poly(_ccw(rect), ext)
            x += w
            if len(P) < 3: continue
            area = abs(sum(P[i][0] * P[(i + 1) % len(P)][1] - P[(i + 1) % len(P)][0] * P[i][1] for i in range(len(P)))) / 2
            if area < 0.0015: continue
            lj = rnd.uniform(0, spec["lift_jit"])
            th = T * rnd.uniform(0.85, 1.15)
            # height above the deck: 2 slates at the butt, dropping one slate over one gauge (resting on the course below)
            def hgt(py): return lift + lj + 2 * th - th * max(0.0, py - yb) / G
            top = [origin + X * px + Y * py + N * hgt(py) for px, py in P]
            K.SEED = 0.02 + 0.98 * rnd.random()
            K.B.new_group()
            K.B.face(top, mat, code)
            # edges: the butt (and a chipped corner) drops one thickness = the course's shadow line; so do the edges cut
            # by the facet's border (verges, hips: seen side-on); the side joints (4 mm, only seen at grazing angles: the
            # slate beneath shows through them) take no faces
            for i in range(len(P)):
                p, q = P[i], P[(i + 1) % len(P)]
                if min(p[1], q[1]) > yb + G + 0.004: continue                  # under the next course: hidden
                dx, dy = q[0] - p[0], q[1] - p[1]
                if abs(dy) > 3 * abs(dx) and not _on_border(((p[0] + q[0]) / 2, (p[1] + q[1]) / 2), ext): continue
                a_, b_ = top[i], top[(i + 1) % len(P)]
                K.B.face([b_, a_, a_ - N * th, b_ - N * th], mat, code)
            n += 1
        y += G; row += 1
    K.SEED, K.VAO = sv_seed, sv_vao
    return n

def slate_quad(e0, e1, r1, r0, mat, code=0, spec=NATURAL, seed=1, lift=0.0):
    """slates on a planar facet given by its eave corners e0 -> e1 and its top corners r0 (above e0), r1 (above e1);
    r0 == r1 for a triangle (a hip end). Blender points ON the roof deck."""
    X = (e1 - e0).normalized()
    up = (r0 - e0) if (r0 - e0).length > 1e-6 else (r1 - e0)
    N = X.cross(up).normalized()
    if N.z < 0: N = -N
    Y = N.cross(X).normalized()
    if Y.dot(up) < 0: Y = -Y
    # keep the frame right-handed with N up: X x Y = N
    if X.cross(Y).dot(N) < 0: X = -X; e0, e1, r0, r1 = e1, e0, r1, r0
    pr = lambda p: ((p - e0).dot(X), (p - e0).dot(Y))
    pts = [pr(e0), pr(e1), pr(r1), pr(r0)]
    poly = [p for i, p in enumerate(pts) if i == 0 or (Vector(p) - Vector(pts[i - 1])).length > 1e-6]
    return slate_poly(e0, X, Y, poly, mat, code, spec, seed, lift)
