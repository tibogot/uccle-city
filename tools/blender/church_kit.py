"""CHURCH KIT (landmark churches round 5, branch claude/landmark5): the helpers of tools/blender/rosaire.py made importable
(rosaire.py runs at import), on top of tools/blender/stpierre_common.py (builder, frames, fills, sweeps, lathes), plus:
  - vwall(): a wall segment between two plan points with an explicit top profile (gables, rakes, roofs against walls),
    holes given along the segment; the face always points the given way out;
  - lancet() / portal(): pointed openings with a stone surround ring, reveal, glass or door;
  - roof_poly(): a planar roof slab from (u, w) points on a plane h = f(u, w);
  - the build -> mesh -> GPU (OptiX) AO bake -> GLB export -> previews tail shared by the scripts (finish()).
Frame as Rosaire / Saint-Pierre: P(u, w, h) = Blender (u, -w, h - OY); u along the church, w to the right seen from the
entrance; heights m TAW. Materials: SLOTS (the script's list), COLOR_0.r = code / 16 + 1/32, COLOR_0.g = thin-face AO.
"""
import bpy, math, os, json, time
from mathutils import Vector
import stpierre_common as SC
from stpierre_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                             sweep3d, face_dir, face_up, quad, circle, offset_loop, arc_pts, ccw, OY, pointed)

CODES = ["plain", "coping", "surround", "cornice", "plinth", "band", "sill", "sculpture", "ridge", "louvre", "gutter",
         "gilt", "door", "mosaic", "frame", "lead"]
(C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_MOSAIC,
 C_FRAME, C_LEAD) = range(16)
STONE, BLUE, SLATE, ZINC, WOOD, GLASS, IRON = range(7)    # slot indices: the scripts' SLOTS follow this order
FAR = lambda: bool(K.FAR)
XFAR = lambda: K.FAR == 2


def segs(n_near, n_far=None, n_xfar=None):
    """arc segment counts per level"""
    if XFAR(): return n_xfar or max(2, (n_far or n_near) // 2)
    if FAR(): return n_far or max(3, n_near // 2)
    return n_near

# ------------------------------------------------------------------------------------------------ plan helpers
def ccw_uw(l):
    """counter-clockwise in Blender's (x, y) = (u, -w): walls round it face out"""
    a = sum(l[i][0] * (-l[(i + 1) % len(l)][1]) - l[(i + 1) % len(l)][0] * (-l[i][1]) for i in range(len(l)))
    return list(l) if a > 0 else list(reversed(l))

def offset_uw(l, d):
    m = [(u, -w) for u, w in ccw_uw(l)]
    return [(x, -y) for x, y in offset_loop(m, d)]

def edge_frame(a, b):
    """wall frame of a (u, w) loop edge a -> b (loop ccw_uw): s along a -> b, N outward"""
    A, B_ = P(a[0], a[1], OY), P(b[0], b[1], OY)
    e = (B_ - A).normalized()
    return Frame(A, Vector((e.y, -e.x, 0))), (B_ - A).length

def flat_group():
    """the current construction group is FLAT: all its edges sharp"""
    K.B.__dict__.setdefault("flat", set()).add(K.B.grp)

def regroup(i0, gid):
    for i in range(i0, len(K.B.g)): K.B.g[i] = gid

# ------------------------------------------------------------------------------------------------ walls
class Seg:
    """a vertical wall plane through plan points a -> b (u, w) facing `out` (a plan vector (du, dw)); t = metres from a.
    .p(t, h, d) Blender point (d out of the wall); .fr the Frame with s = t (or L - t when the frame runs b -> a)"""
    def __init__(self, a, b, out):
        self.a, self.b = a, b
        A, B_ = P(a[0], a[1], OY), P(b[0], b[1], OY)
        self.L = (B_ - A).length
        N = Vector((out[0], -out[1], 0)).normalized()
        e = (B_ - A).normalized()
        N = (N - e * N.dot(e)).normalized()
        U = Z.cross(N)
        if U.dot(e) > 0: self.fr = Frame(A, N); self.flip = False
        else: self.fr = Frame(B_, N); self.flip = True
    def s(self, t): return self.L - t if self.flip else t
    def st(self, pts): return [(self.s(t), hz(h)) for t, h in pts]
    def p(self, t, h, d=0.0): return self.fr.p(self.s(t), hz(h), d)

def vwall(seg, top, bottom=None, holes=(), mat=STONE, code=C_PLAIN):
    """the wall face of `seg`: from `bottom` (a height or [(t, h)] profile, default the kit's HB) up to `top` (a height or
    [(t, h)] profile from t 0 to L, sharp breaks allowed); holes: loops in (s, v) of seg.fr"""
    L = seg.L
    tp = [(0.0, top), (L, top)] if isinstance(top, (int, float)) else list(top)
    b0 = KIT.HB if bottom is None else bottom
    bt = [(0.0, b0), (L, b0)] if isinstance(b0, (int, float)) else list(b0)
    loop = [(t, h) for t, h in bt] + [(t, h) for t, h in reversed(tp)]
    clean = []
    for p in seg.st(loop):
        if not clean or abs(p[0] - clean[-1][0]) > 1e-4 or abs(p[1] - clean[-1][1]) > 1e-4: clean.append(p)
    if abs(clean[0][0] - clean[-1][0]) < 1e-4 and abs(clean[0][1] - clean[-1][1]) < 1e-4: clean.pop()
    fill2d(seg.fr, [ccw(clean)] + [ccw(h) for h in holes], 0.0, mat, code)

class KIT:
    HB = 101.0          # walls go this far down (set by the script)

# ------------------------------------------------------------------------------------------------ openings
def arch_pts(s0, s1, spring, apex, n):
    """a pointed arch from (s0, spring) over the apex to (s1, spring), left to right. Rise >= half the span: two-centred
    (the centres on the springing line, as stpierre_common.pointed); a DEPRESSED pointed arch (rise < half the span, the
    1950s portals): each half an elliptical arc, vertical at the springing, meeting its mirror at the apex at an angle."""
    a = (s1 - s0) / 2; h = apex - spring; sm = s0 + a
    if h >= a:
        R = (a * a + h * h) / (2 * a)
        aL = math.atan2(h, sm - (s0 + R))
        left = [((s0 + R) + R * math.cos(math.pi + (aL - math.pi) * k / n), spring + abs(R * math.sin(math.pi + (aL - math.pi) * k / n))) for k in range(n + 1)]
    else:
        T = math.radians(66)
        left = [(s0 + a * (1 - math.cos(T * k / n)) / (1 - math.cos(T)), spring + h * math.sin(T * k / n) / math.sin(T)) for k in range(n + 1)]
    left[-1] = (sm, apex)
    right = [(2 * sm - x, y) for x, y in reversed(left[:-1])]
    return left + right

def parch(s0, s1, v0, spring, apex, n=None):
    """a pointed opening as a path from (s0, v0) up the left jamb, over the arch, down to (s1, v0)"""
    pts = arch_pts(s0, s1, spring, apex, n or segs(8, 4, 2))
    if v0 < spring - 1e-6: pts = [(s0, v0)] + pts + [(s1, v0)]
    return pts

def lancet_loop(s0, s1, v0, v1, rise=None, n=None):
    """a pointed light s0..s1 from v0 (Blender z) to the apex v1; rise = arch height (default ~ equilateral)"""
    w = s1 - s0
    r = min(rise if rise is not None else w * 0.87, (v1 - v0) * 0.8)
    return ccw(parch(s0, s1, v0, v1 - r, v1, n))

def lancet(seg, t, wd, h0, h1, depth=0.3, sur=0.12, proud=0.025, rise=None, glass=True, sill=True, bars=2, sur_mat=BLUE):
    """a lancet window at t along seg (h0 sill .. h1 apex, TAW): returns the wall hole (the surround's outer loop).
    The stone surround ring stands `proud` out of the wall, its reveal runs in to the glass at -depth; a sill below;
    saddle bars (iron) across the light at LOD0."""
    fr = seg.fr; sc = seg.s(t)
    v0, v1 = hz(h0), hz(h1)
    hole = lancet_loop(sc - wd / 2, sc + wd / 2, v0, v1, rise)
    if XFAR():                     # very far: a shallow dark panel
        strip2d(fr, hole, 0.0, -0.06, sur_mat, C_SUR)
        if glass: fill2d(fr, [hole], -0.06, GLASS, C_LEAD)
        return hole
    r = rise if rise is not None else wd * 0.87
    if sill:      # the surround's legs stand on the sill: one U-shaped face (no zero-width bottom strip)
        outer = parch(sc - wd / 2 - sur, sc + wd / 2 + sur, v0, v1 - r, v1 + sur * 1.15)
        fill2d(fr, [outer + list(reversed(parch(sc - wd / 2, sc + wd / 2, v0, v1 - r, v1)))], proud, sur_mat, C_SUR)
    else:
        outer = lancet_loop(sc - wd / 2 - sur, sc + wd / 2 + sur, v0 - sur, v1 + sur * 1.15, r + sur * 1.15)
        fill2d(fr, [outer, hole], proud, sur_mat, C_SUR)
    strip2d(fr, outer, 0.0, proud, sur_mat, C_SUR, inward=False)
    strip2d(fr, hole, proud, -depth, sur_mat, C_SUR)
    if glass: fill2d(fr, [hole], -depth, GLASS, C_LEAD)
    if sill and not FAR():
        fbox(fr, sc - wd / 2 - sur - 0.04, sc + wd / 2 + sur + 0.04, v0 - 0.13, v0 + 0.002, -0.01, proud + 0.07, sur_mat, C_SILL)
    if bars and glass and not FAR():
        for j in range(bars):
            v = v0 + (v1 - r - v0) * (j + 1) / (bars + 1)
            bar(fr, (sc - wd / 2 - 0.02, v), (sc + wd / 2 + 0.02, v), -depth + 0.005, 0.018, 0.022, IRON, C_FRAME)
    return outer

def rect_window(seg, t, wd, h0, h1, depth=0.25, sur=0.1, proud=0.02, mullion=False, sur_mat=BLUE):
    fr = seg.fr; sc = seg.s(t)
    hole = rect(sc - wd / 2, hz(h0), sc + wd / 2, hz(h1))
    if XFAR():
        strip2d(fr, hole, 0.0, -0.05, sur_mat, C_SUR); fill2d(fr, [hole], -0.05, GLASS, C_LEAD); return hole
    outer = rect(sc - wd / 2 - sur, hz(h0) - 0.02, sc + wd / 2 + sur, hz(h1) + sur)
    fill2d(fr, [outer, hole], proud, sur_mat, C_SUR)
    strip2d(fr, outer, 0.0, proud, sur_mat, C_SUR, inward=False)
    strip2d(fr, hole, proud, -depth, sur_mat, C_SUR)
    fill2d(fr, [hole], -depth, GLASS, C_LEAD)
    if not FAR():
        fbox(fr, sc - wd / 2 - sur - 0.03, sc + wd / 2 + sur + 0.03, hz(h0) - 0.12, hz(h0) - 0.02 + 0.002, -0.01, proud + 0.06, sur_mat, C_SILL)
        if mullion: bar(fr, (sc, hz(h0)), (sc, hz(h1)), -depth + 0.005, 0.05, 0.05, WOOD, C_FRAME)
    return outer

# ------------------------------------------------------------------------------------------------ masses
def slab(top, th, mat, code=C_PLAIN):
    """a planar slab: top polygon (Blender points), thickness down"""
    up = (top[1] - top[0]).cross(top[2] - top[1])
    n = len(top)
    nw = Vector((0, 0, 0))
    for i in range(n):
        a, b = top[i], top[(i + 1) % n]
        nw += Vector(((a.y - b.y) * (a.z + b.z), (a.z - b.z) * (a.x + b.x), (a.x - b.x) * (a.y + b.y)))
    if nw.z < 0: top = list(reversed(top)); nw = -nw
    up = nw.normalized()
    bot = [p - Z * th for p in top]
    K.B.new_group()
    face_dir(top, up, mat, code); face_dir(bot, -up, mat, code)
    for i in range(n):
        a, b = top[i], top[(i + 1) % n]
        out = (b - a).cross(up).normalized()
        face_dir([a, b, bot[(i + 1) % n], bot[i]], out, mat, code)

def roof_poly(pts_uw, hfun, mat=SLATE, th=0.14, code=C_PLAIN):
    """a planar roof slab over (u, w) points at h = hfun(u, w) (TAW); flat-shaded"""
    slab([P(u, w, hfun(u, w)) for u, w in pts_uw], th, mat, code); flat_group()

def ring_prism(loop_uw, h0, h1, mat, code, top=True, chamfer=0.0, top_to=None, bottom_to=None):
    """a prism round a (u, w) loop (as rosaire.py): walls out, an optional top chamfer, a top face / a top ring back to
    `top_to` / nothing; a soffit ring under it back to `bottom_to`"""
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    inner = offset_uw(L, -chamfer) if chamfer else L
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        e = P(b[0], b[1], 0) - P(a[0], a[1], 0)
        face_dir([P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1 - chamfer), P(a[0], a[1], h1 - chamfer)], Vector((e.y, -e.x, 0)), mat, code)
        if chamfer:
            ia, ib = inner[i], inner[(i + 1) % n]
            face_dir([P(a[0], a[1], h1 - chamfer), P(b[0], b[1], h1 - chamfer), P(ib[0], ib[1], h1), P(ia[0], ia[1], h1)], Z, mat, code)
    def ring(outer, inn, h, up):
        o = ccw_uw(outer); q = ccw_uw(inn)
        for i in range(len(o)):
            j = (i + 1) % len(o)
            face_dir([P(o[i][0], o[i][1], h), P(o[j][0], o[j][1], h), P(q[j % len(q)][0], q[j % len(q)][1], h), P(q[i][0], q[i][1], h)], Z if up else -Z, mat, code)
    if top_to is not None: ring(inner, top_to, h1, True)
    elif top: face_up([P(p[0], p[1], h1) for p in inner], mat, code)
    if bottom_to is not None: ring(L, bottom_to, h0, False)

def pyramid(c, half, h0, h1, mat, th=0.12, code=C_PLAIN, n=4, rot=0.0, hu=None):
    """a pyramid spire / roof (flat facets) over a regular n-gon (n=4: square, half = half side; else circumradius) with
    a fascia of depth th at its eaves"""
    K.B.new_group(); flat_group()
    if n == 4:
        hu = hu or half
        ev = [P(c[0] + du * hu, c[1] + dw * half, h0) for du, dw in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
    else:
        ev = [P(c[0] + half * math.cos(rot + 2 * math.pi * k / n), c[1] + half * math.sin(rot + 2 * math.pi * k / n), h0) for k in range(n)]
    ap = P(c[0], c[1], h1)
    m = len(ev)
    for i in range(m):
        a, b = ev[i], ev[(i + 1) % m]
        face_dir([a, b, ap], Z, mat, code)
        face_dir([a, b, b - Z * th, a - Z * th], ((a + b) / 2 - ap) * Vector((1, 1, 0)), mat, C_RIDGE)
    face_dir([p - Z * th for p in ev], -Z, mat, code)
    return ev, ap

def rodc(a, b, r, mat, code=0, segs_=6):
    ax = b - a
    if ax.length < 1e-5: return
    ref = Vector((1, 0, 0)) if abs(ax.normalized().x) < 0.9 else Vector((0, 1, 0))
    lathe_axis(a, ax, ref, [(r, 0.0), (r, ax.length)], segs_, mat, code, cap_top=True, cap_bottom=True)

def iron_cross(base, height, span, bar_h, t=0.06, mat=IRON, code=C_GILT, along=Vector((0, 1, 0))):
    """a square-section iron cross: upright from `base` (Blender) `height` tall, the bar `span` wide at `bar_h` up"""
    side = along.normalized(); fwd = Z.cross(side).normalized()
    wbox(base, side, fwd, t / 2, t / 2, base.z, base.z + height, mat, code)
    c = base + Z * bar_h
    wbox(c, side, fwd, span / 2, t * 0.62, c.z - t / 2, c.z + t / 2, mat, code)    # (the bar a little deeper: no faces in the upright's planes)

def ridge_cap(a, b, mat=ZINC, w=0.13, h=0.09):
    """a ridge / hip roll from Blender a to b (a rounded-off box sweep)"""
    if FAR() and XFAR(): return
    up = Z if abs((b - a).normalized().z) < 0.9 else Vector((1, 0, 0))
    sweep3d([a, b], [(-w, -0.05), (-w, h * 0.6), (-w * 0.6, h), (w * 0.6, h), (w, h * 0.6), (w, -0.05)], up, mat, C_RIDGE, caps=True)

def gutter(a, b, mat=ZINC):
    """a half-round-ish eaves gutter (box with a lip) along Blender a -> b, hanging outward of the line (to the right)"""
    if FAR(): return
    sweep3d([a, b], [(0.0, 0.0), (0.0, -0.1), (0.05, -0.15), (0.14, -0.15), (0.17, -0.1), (0.17, 0.02)], Z, mat, C_GUTTER, caps=True)

# ------------------------------------------------------------------------------------------------ mesh, bake, export
class GroupTag:
    """during SC.make_object: the first bmesh.ops.remove_doubles call writes each face's construction group into a face
    attribute 'grp_keep' that survives the welding (as rosaire.py)"""
    def __init__(self, bld): self.bld = bld; self.done = False
    def __enter__(self):
        import bmesh as real
        tag = self
        def wrapped(bm, **kw):
            if not tag.done:
                lay = bm.faces.layers.int.get("grp_keep") or bm.faces.layers.int.new("grp_keep")
                bm.faces.ensure_lookup_table()
                for f in bm.faces: f[lay] = tag.bld.g[f.index]
                tag.done = True
            return real.ops.remove_doubles(bm, **kw)
        class Ops:
            remove_doubles = staticmethod(wrapped)
            def __getattr__(self, k): return getattr(real.ops, k)
        class Bm:
            ops = Ops()
            def __getattr__(self, k): return getattr(real, k)
        self.real = real; SC.bmesh = Bm()
        return self
    def __exit__(self, *a): SC.bmesh = self.real

def sharpen(o, bld, angle=28.0, all_flat=False):
    """edges between construction groups always sharp; within a group sharp above `angle`; FLAT groups all sharp"""
    import bmesh
    me = o.data
    me.set_sharp_from_angle(angle=math.radians(angle))
    bm = bmesh.new(); bm.from_mesh(me)
    lay = bm.faces.layers.int.get("grp_keep")
    flat = bld.__dict__.get("flat", set())
    n = 0
    if lay is not None:
        for e in bm.edges:
            lf = e.link_faces
            if not e.smooth: continue
            if all_flat or (len(lf) == 2 and lf[0][lay] != lf[1][lay]) or any(f[lay] in flat for f in lf): e.smooth = False; n += 1
    bm.to_mesh(me); bm.free()
    if "grp_keep" in me.attributes: me.attributes.remove(me.attributes["grp_keep"])
    print(f"  {o.name}: {n} group-border edges made sharp")

def gpu_setup(scn):
    """Cycles on the RTX through OptiX (CUDA as a fallback, CPU when neither)"""
    scn.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind
                prefs.get_devices()
                devs = [d for d in prefs.devices if d.type == kind]
                if devs:
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"
                    print("Cycles device:", kind, [d.name for d in devs])
                    return kind
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.device = "CPU"
    print("Cycles device: CPU")
    return "CPU"

def load_ground(scn, G, g, out, color=(0.16, 0.16, 0.15)):
    import numpy as np
    a = np.fromfile(os.path.join(out, "site_dtm.bin"), dtype="<u2").reshape(g["rows"], g["cols"]).astype(np.float64) / 100 + g["base"]
    st = 2
    a = a[::st, ::st]; step = g["step"] * st
    rows, cols = a.shape
    xs = g["x0"] + np.arange(cols) * step; zs = g["z0"] + np.arange(rows) * step
    X, Zg = np.meshgrid(xs, zs)
    dx, dz = X - G.ox, Zg - G.oz
    U = dx * G.ca + dz * G.sa; W = -dx * G.sa + dz * G.ca
    verts = np.stack([U, -W, a - OY - 0.02], -1).reshape(-1, 3)
    r, c = np.meshgrid(np.arange(rows - 1), np.arange(cols - 1), indexing="ij")
    i0 = (r * cols + c).ravel()
    faces = np.stack([i0, i0 + 1, i0 + cols + 1, i0 + cols], -1)
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts.tolist(), [], faces.tolist()); gm.update()
    nz = np.empty(len(faces) * 3, np.float32); gm.polygons.foreach_get("normal", nz)
    if nz.reshape(-1, 3)[:, 2].mean() < 0:
        import bmesh
        bm = bmesh.new(); bm.from_mesh(gm); bmesh.ops.reverse_faces(bm, faces=bm.faces); bm.to_mesh(gm); bm.free(); gm.update()
    go = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(go)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*color, 1)
    gm.materials.append(gmat)
    return go

def vertex_ao(scn, o, thin):
    import numpy as np
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try: bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = np.empty(4 * len(me.loops), np.float32); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = np.empty(4 * len(me.loops), np.float32); col.data.foreach_get("color", c)
    lp = np.empty(len(me.loops), np.int32)
    tp = np.array(thin, bool)
    ls = np.empty(len(me.polygons), np.int32); lt = np.empty(len(me.polygons), np.int32)
    me.polygons.foreach_get("loop_start", ls); me.polygons.foreach_get("loop_total", lt)
    loop_thin = np.repeat(tp, lt)
    c = c.reshape(-1, 4); a = a.reshape(-1, 4)
    c[loop_thin, 1] = np.clip(a[loop_thin, 0], 0.25, 1.0)
    col.data.foreach_set("color", c.ravel())
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO: {int(loop_thin.sum())} corners of thin faces")

def finish(name, title, out, prev_dir, args, slots, builders, G, g, site, info_extra, ao_px=2048, views=None, cols=None,
           sun=(50, 230), t0=None):
    """mesh (three levels), lightmap UVs, GPU AO bake (each level ALONE), GLB, <name>.json, previews"""
    import numpy as np
    t0 = t0 or time.time()
    bake = "--no-bake" not in args
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scn = bpy.context.scene
    mats = []
    for s in slots:
        m = bpy.data.materials.new(s); m.use_nodes = True; mats.append(m)
    split = (0.74, 0.9)                         # LOD0 v 0..0.74, LOD1 0.745..0.895, LOD2 0.9..1
    names = [title, title + "_far", title + "_xfar"]
    ranges = [(0.0, split[0]), (split[0] + 0.005, split[1] - 0.005), (split[1], 1.0)]
    objs, ntris, per_slot, thins = [], [], [], []
    for k, (bld, nm, (v0, v1)) in enumerate(zip(builders, names, ranges)):
        with GroupTag(bld):
            o, nt, ps, th = SC.make_object(scn, mats, slots, nm, bld, v0, v1, ao_px)
        sharpen(o, bld, all_flat=(k >= 1))           # the far levels flat shaded (4-segment arches: no smoothing into jambs)
        objs.append(o); ntris.append(nt); per_slot.append(ps); thins.append(th)
    print(f"uv done {time.time() - t0:.1f}s")
    ground = load_ground(scn, G, g, out)
    dev = gpu_setup(scn)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 3.0
    ao_img = bpy.data.images.new(name + "_ao", ao_px, ao_px, alpha=False, float_buffer=False)
    ao_img.colorspace_settings.name = "Non-Color"
    for m in mats:
        nt = m.node_tree
        n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n
    if bake:
        scn.cycles.samples = 64 if "--fast" not in args else 16
        t = time.time()
        for i, target in enumerate(objs):            # each level ALONE (the others do not occlude it)
            for o in objs: o.hide_render = o is not target
            for o in scn.objects: o.select_set(False)
            target.select_set(True); bpy.context.view_layer.objects.active = target
            bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
        print(f"AO bake ({dev}) {time.time() - t:.1f}s")
        t = time.time()
        for target, th in zip(objs, thins):
            for o in objs: o.hide_render = o is not target
            vertex_ao(scn, target, th)
        for o in objs: o.hide_render = False
        print(f"vertex AO {time.time() - t:.1f}s")
        px = np.empty(ao_px * ao_px * 4, np.float32); ao_img.pixels.foreach_get(px)
        px = px.reshape(ao_px, ao_px, 4); px[:, int(0.9945 * ao_px):, :3] = 1.0
        ao_img.pixels.foreach_set(px.ravel())
        ao_img.filepath_raw = os.path.join(out, name + "_ao.png"); ao_img.file_format = "PNG"
        scn.render.image_settings.color_mode = "BW"
        ao_img.save()
    else:
        p = os.path.join(out, name + "_ao.png")
        if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()
    for m in mats:
        if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
    for o in scn.objects: o.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    glb = os.path.join(out, name + ".raw.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                              export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
    print("exported", glb, os.path.getsize(glb) // 1024, "KB")
    B = builders[0]
    bx = [p.x for p in B.v]; by = [p.y for p in B.v]
    corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
    S_ = site["solids"]
    info = {
        "asset": f"{site.get('name', name)} (tools/blender/{name}.py)",
        "triangles": {"lod0": ntris[0], "lod1": ntris[1], "lod2": ntris[2]},
        "triangles_per_slot": {"lod0": per_slot[0], "lod1": per_slot[1], "lod2": per_slot[2]},
        "levels": {"LOD0": names[0], "LOD1": names[1] + " (scripted far variant)", "LOD2": names[2] + " (scripted very-far variant, flat shaded)"},
        "slots": slots, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
        "uv": {"TEXCOORD_0": "world metres, per face", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
        "lightmap": {"px": ao_px, "split_v": list(split), "px_per_m": [round(o["px_per_m"], 1) for o in objs], "bake_device": dev},
        "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
        "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot,
                      "hides_solids": [S_["church"]["id"]], "hides_bu_ids": [S_["church"]["bu"]]},
        "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                        "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                        "y": [round(min(p.z for p in B.v) + OY, 1), round(max(p.z for p in B.v) + OY, 1)]},
    }
    info.update(info_extra)
    json.dump(info, open(os.path.join(out, name + ".json"), "w"), indent=1)
    if "--previews" in args and views:
        for m in mats:
            nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
            uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
            tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
            mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
            mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
            nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
            bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else 0.85
        lvl = [a.split("=")[1] for a in args if a.startswith("--level=")]
        show = int(lvl[0]) if lvl else 0
        for k, o in enumerate(objs): o.hide_render = k != show
        if "--checker" in args:                         # shading check: one grey material, grazing sun
            g_ = bpy.data.materials.new("Checker"); g_.use_nodes = True
            g_.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.5, 0.5, 0.5, 1)
            for o in objs: o.data.materials.clear(); o.data.materials.append(g_)
            sun = (10, float(next((a.split("=")[1] for a in args if a.startswith("--sunaz=")), sun[1])))
        sl = bpy.data.lights.new("Sun", "SUN"); sl.energy = 4.0; sl.angle = math.radians(1.5)
        so = bpy.data.objects.new("Sun", sl); scn.collection.objects.link(so)
        so.rotation_euler = (math.radians(90 - sun[0]), 0, math.radians(sun[1]))
        scn.world.use_nodes = True
        bg = scn.world.node_tree.nodes.get("Background")
        sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
        scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
        scn.cycles.samples = 24; scn.cycles.use_denoising = True
        scn.render.image_settings.color_mode = "RGB"
        scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
        cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
        only = [a.split("=", 1)[1] for a in args if a.startswith("--views=")]
        tag = ("_checker" if "--checker" in args else "") + (f"_lod{show}" if show else "")
        for k, (pos, tgt, lens, res) in views.items():
            if only and k not in only[0].split(","): continue
            cam.location = P(*pos); tg = P(*tgt)
            cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
            cam_d.lens = lens
            scn.render.resolution_x, scn.render.resolution_y = res
            os.makedirs(prev_dir, exist_ok=True)
            scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 88
            scn.render.filepath = os.path.join(prev_dir, f"{name}_{k}{tag}.jpg")
            t = time.time(); bpy.ops.render.render(write_still=True); print("render", k, f"{time.time() - t:.0f}s")
    print(f"done {time.time() - t0:.1f}s")
    return ntris
