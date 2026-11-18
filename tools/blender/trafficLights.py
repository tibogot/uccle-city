"""TRAFFIC LIGHTS KIT (claude/tlights, owner playtest 2026-11-18 "make better traffic lights in Blender"; docs/TLIGHTS.md).
The Brussels-Capital Region signal post as it stands at Uccle's junctions (looked at on Street View, nothing traced or
stored): a round anthracite / green-grey steel pole straight out of the pavement (a small galvanised collar at the
foot), the main 3-aspect head (200 mm lenses, each under a visor) on two clamp brackets with a black backplate edged in
white retro-reflective tape, the small 3-aspect REPEATER (100 mm) at eye level for the driver stopped at the line,
the 2-aspect PEDESTRIAN head (standing / walking figure) on the road side facing across the street, and the push-button
box on the pavement side. Variant: the BIKE head (100 mm, bicycle figures) under the main head where a cycle lane comes
up to the line. Mast arms (potences) are rare in Uccle: not modelled (docs/TLIGHTS.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/trafficLights.py -- \
        models/tlights [--no-bake] [--previews docs/tlights] [--samples 64]

Pieces (one root object per piece and LOD: <piece>_LOD0 / _LOD1 / _LOD2):
  tl_post        pole + main head + repeater + pedestrian head + push button
  tl_post_bike   the same + the bike head
Frame (Blender, Z up): the pole's axis on the origin, the ground at z = 0 (the pole goes 0.30 m below it: JOINS rule, a
post on a slope keeps its foot in the ground); the vehicle heads look along +Y (= -Z in three.js: toward the coming
cars), the pedestrian head along +X (three.js +X: across the road, the post stands on the traffic's right kerb), the
push button along -X (the pavement).
Slots by NAME only (no baked colour; the preview colours are for these renders): viewer/tlights/tlightKit.js SLOTS.
The lenses are their own slots (lens_red / lens_amber / lens_green, ped_red / ped_green): the viewer lights the active
aspect by emission (no light is added: the light count is fixed). UV0 on a lens = its place in the pictogram atlas
(tlights_picto.png: plain disc, standing man, walking man, bicycle); elsewhere a constant (unused).
COLOR_0.r = ambient occlusion baked per vertex by Cycles (OptiX on the RTX GPU; --no-bake: 1).
LODs are authored here (not decimated): LOD0 the close detail (bevels, bezels, visors, clamps, bolts), LOD1 the same
shapes with fewer segments and no small parts, LOD2 boxes and flat lens discs (the lit aspect still reads at 400 m).
"""
import bpy, bmesh, math, os, sys, json, time
import numpy as np
from mathutils import Vector, Matrix

A = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(k, d=None):
    return A[A.index(k) + 1] if k in A else d
OUT = os.path.abspath(A[0] if A and not A[0].startswith("--") else "models/tlights")
BAKE = "--no-bake" not in A
PREV = opt("--previews")
SAMPLES = int(opt("--samples", "64"))
os.makedirs(OUT, exist_ok=True)
if PREV: os.makedirs(os.path.abspath(PREV), exist_ok=True)
T0 = time.time()
def tick(s): print(f"[{time.time() - T0:6.1f}s] {s}", flush=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.unit_settings.system = "METRIC"
Z = Vector((0, 0, 1))

# ------------------------------------------------------------------------------------------------ slots (preview colours only)
SLOTS = {
    "tl_pole": ((0.055, 0.062, 0.060), 0.48, 0.35),       # Brussels signal pole: anthracite with a green cast, satin
    "tl_housing": ((0.018, 0.018, 0.020), 0.42, 0.0),     # black polycarbonate heads, visors, bezels
    "tl_backplate": ((0.010, 0.010, 0.010), 0.75, 0.0),   # matt black contrast plate
    "tl_border": ((0.80, 0.80, 0.78), 0.38, 0.0),         # white retro-reflective edge
    "tl_bracket": ((0.42, 0.43, 0.43), 0.45, 0.85),       # galvanised clamps, arms, collar, bolts
    "lens_red": ((0.10, 0.012, 0.010), 0.06, 0.0),        # off: dark tinted glass over the reflector
    "lens_amber": ((0.11, 0.050, 0.004), 0.06, 0.0),
    "lens_green": ((0.004, 0.060, 0.045), 0.06, 0.0),
    "ped_red": ((0.10, 0.012, 0.010), 0.06, 0.0),
    "ped_green": ((0.004, 0.060, 0.045), 0.06, 0.0),
    "tl_buttonbox": ((0.060, 0.062, 0.066), 0.5, 0.1),
    "tl_buttonplate": ((0.72, 0.72, 0.70), 0.4, 0.0),
    "tl_button": ((0.020, 0.020, 0.020), 0.35, 0.0),
}
MATS = {}
for name, (rgb, rough, metal) in SLOTS.items():
    m = bpy.data.materials.new(name); m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    m["preview"] = list(rgb)
    MATS[name] = m
LENS_SLOTS = ["lens_red", "lens_amber", "lens_green", "ped_red", "ped_green"]

# pictogram atlas cells (u0, v0) of 0.5 x 0.5: 0 plain disc, 1 standing man, 2 walking man, 3 bicycle
CELL = {"disc": (0.0, 0.0), "stand": (0.5, 0.0), "walk": (0.0, 0.5), "bike": (0.5, 0.5)}
LENS_FILL = 0.94      # the lens radius in the cell's half width (a margin for the mip chain)
NOUV = (0.25, 0.25)   # non-lens faces: the disc cell's centre (unused by the viewer)


# ------------------------------------------------------------------------------------------------ the mesh builder
class Build:
    """one object: parts merged in (each with its slot, its UVs computed in the part's own frame, then transformed)"""
    def __init__(self, name):
        self.name = name
        self.bm = bmesh.new()
        self.uv = self.bm.loops.layers.uv.new("UVMap")
        self.sl = self.bm.faces.layers.int.new("slot")
        self.slots = []
        self.clamps = []

    def add(self, part, slot, matrix=None, uvf=None):
        si = self.slots.index(slot) if slot in self.slots else (self.slots.append(slot) or len(self.slots) - 1)
        uvs = {v: (uvf(v.co) if uvf else NOUV) for v in part.verts}
        if matrix is not None: part.transform(matrix)
        vmap = {v: self.bm.verts.new(v.co) for v in part.verts}
        for f in part.faces:
            try: nf = self.bm.faces.new([vmap[v] for v in f.verts])
            except ValueError: continue
            nf[self.sl] = si; nf.smooth = f.smooth
            for lo, lsrc in zip(nf.loops, f.loops): lo[self.uv].uv = uvs[lsrc.vert]
        part.free()

    def to_object(self, sharp_deg=40):
        me = bpy.data.meshes.new(self.name)
        # weld exactly coincident vertices (the backplate's border / field loops: one plane, two slots)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-5)
        self.bm.normal_update()
        self.bm.to_mesh(me); self.bm.free()
        for n in self.slots: me.materials.append(MATS[n])
        idx = [0] * len(me.polygons); me.attributes["slot"].data.foreach_get("value", idx)
        me.polygons.foreach_set("material_index", idx)
        me.attributes.remove(me.attributes["slot"])
        o = bpy.data.objects.new(self.name, me)
        scn.collection.objects.link(o)
        me.set_sharp_from_angle(angle=math.radians(sharp_deg))
        # weighted normals: the big flat faces stay flat, the bevels carry the turn (no shading from topology)
        wn = o.modifiers.new("WeightedNormal", "WEIGHTED_NORMAL")
        wn.mode = "FACE_AREA"; wn.weight = 50; wn.keep_sharp = True; wn.thresh = 0.01
        return o


def fix_normals(bm, faces, desired):
    """flip every face whose normal disagrees with desired(face) (the analytic outward direction)"""
    bm.normal_update()
    for f in faces:
        d = desired(f)
        if d is not None and f.normal.dot(d) < 0: f.normal_flip()


def lathe(profile, segs, smooth=True):
    """a solid of revolution about +Z: profile [(r, z)] walked with the OUTSIDE on its right (normal = (dz, -dr));
    r = 0 points make fans. Returns a bmesh."""
    bm = bmesh.new()
    rings = []
    for r, z in profile:
        if r < 1e-7: rings.append([bm.verts.new((0, 0, z))])
        else: rings.append([bm.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)])
    owner = {}
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        (r0, z0), (r1, z1) = profile[i], profile[i + 1]
        n2 = Vector((z1 - z0, -(r1 - r0)))
        for k in range(segs):
            k1 = (k + 1) % segs
            if len(a) == 1 and len(b) == 1: continue
            if len(a) == 1: vs = [a[0], b[k], b[k1]]
            elif len(b) == 1: vs = [a[k], a[k1], b[0]]
            else: vs = [a[k], a[k1], b[k1], b[k]]
            f = bm.faces.new(vs); f.smooth = smooth
            am = 2 * math.pi * (k + 0.5) / segs
            owner[f] = Vector((n2.x * math.cos(am), n2.x * math.sin(am), n2.y))
    fix_normals(bm, list(owner), lambda f: owner[f])
    return bm


def box(sx, sy, sz, bevel=0.0, segs=3, smooth=True):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(sx, sy, sz), verts=bm.verts)
    if bevel > 0:
        bmesh.ops.bevel(bm, geom=list(bm.edges) + list(bm.verts), offset=min(bevel, 0.45 * min(sx, sy, sz)), segments=segs,
                        profile=0.5, affect="EDGES", clamp_overlap=True)
    for f in bm.faces: f.smooth = smooth and bevel > 0
    bm.normal_update()
    return bm


def rrect(w, h, rc, k):
    """a rounded rectangle (x, z), CCW seen from +Y... (from the front), 4 (k + 1) points"""
    pts = []
    for (cx, cz, a0) in ((w / 2 - rc, -h / 2 + rc, -90), (w / 2 - rc, h / 2 - rc, 0), (-w / 2 + rc, h / 2 - rc, 90), (-w / 2 + rc, -h / 2 + rc, 180)):
        for j in range(k + 1):
            a = math.radians(a0 + 90 * j / k)
            pts.append((cx + rc * math.cos(a), cz + rc * math.sin(a)))
    return pts


def strip(bm, L1, L2, closed=True, smooth=False):
    out = []
    n = len(L1)
    for i in range(n if closed else n - 1):
        j = (i + 1) % n
        f = bm.faces.new([L1[i], L1[j], L2[j], L2[i]]); f.smooth = smooth; out.append(f)
    return out


def backplate(w, h, rc, border, hole_w, hole_h, hole_rc, y0, thick, k=4, chamfer=0.003):
    """the contrast plate in the head frame (lenses along +Y): front at y0 + thick, a hole for the housing; front face
    split in two slots (the white border ring, the black field) on ONE plane: returns (bm_border, bm_plate)"""
    yb, yf = y0, y0 + thick
    def loop(bm, pts, y): return [bm.verts.new((x, y, z)) for x, z in pts]
    O, Oc = rrect(w, h, rc, k), rrect(w - 2 * chamfer, h - 2 * chamfer, rc - chamfer, k)   # (chamfer 0: none)
    B, H = rrect(w - 2 * border, h - 2 * border, max(0.006, rc - border), k), rrect(hole_w, hole_h, hole_rc, k)
    # border ring (front only)
    bb = bmesh.new()
    Lc, Lb = loop(bb, Oc, yf), loop(bb, B, yf)
    fs = strip(bb, Lc, Lb); fix_normals(bb, fs, lambda f: Vector((0, 1, 0)))
    # the plate: rim, chamfer, black field, hole rim, back
    bp = bmesh.new()
    Ab, Af, Bf, Hf, Hb = loop(bp, O, yb), loop(bp, O, yf - chamfer), loop(bp, B, yf), loop(bp, H, yf), loop(bp, H, yb)
    cen = lambda f: f.calc_center_median()
    rim = strip(bp, Ab, Af, smooth=k > 1); fix_normals(bp, rim, lambda f: Vector((cen(f).x, 0, cen(f).z)))
    if chamfer > 0:
        Acf = loop(bp, Oc, yf)
        ch = strip(bp, Af, Acf, smooth=False); fix_normals(bp, ch, lambda f: Vector((cen(f).x, 0, cen(f).z)).normalized() + Vector((0, 1, 0)))
    fr = strip(bp, Bf, Hf); fix_normals(bp, fr, lambda f: Vector((0, 1, 0)))
    hr = strip(bp, Hf, Hb, smooth=k > 1); fix_normals(bp, hr, lambda f: -Vector((cen(f).x, 0, cen(f).z)))
    bk = strip(bp, Hb, Ab); fix_normals(bp, bk, lambda f: Vector((0, -1, 0)))
    # the border ring and the plate share the loop Oc / B positions: merged later by the object weld (remove_doubles)
    return bb, bp


def visor(r_in, thick, y0, lmin, lmax, a0, a1, segs, lip=0.0015, round_lip=0):
    """a cap visor in the lens frame (axis +Y, top = +Z): a shell from angle a0 to a1 (0 = +X, 90 = top), longer at the
    top; open at the back (it sits on the housing face), chamfered lip, closed ends"""
    bm = bmesh.new()
    r_out = r_in + thick
    def L(a): return y0 + lmin + (lmax - lmin) * ((math.sin(a) + 1) / 2) ** 1.6
    if round_lip:   # (LOD0, polish round) the lip rounded: two quarter arcs of radius `lip`, round_lip steps each
        def prof(a):
            l = L(a)
            arc = lambda cx, a0d, a1d: [(cx + lip * math.cos(math.radians(a0d + (a1d - a0d) * k / round_lip)), l - lip + lip * math.sin(math.radians(a0d + (a1d - a0d) * k / round_lip))) for k in range(round_lip + 1)]
            return [(r_out, y0)] + arc(r_out - lip, 0, 90) + arc(r_in + lip, 90, 180) + [(r_in, y0)]
    else:
        prof = lambda a: [(r_out, y0), (r_out, L(a) - lip), (r_out - lip, L(a)), (r_in + lip, L(a)), (r_in, L(a) - lip), (r_in, y0)]
    angs = [math.radians(a0 + (a1 - a0) * i / segs) for i in range(segs + 1)]
    rings = []
    for a in angs:
        c, s = math.cos(a), math.sin(a)
        rings.append([bm.verts.new((r * c, y, r * s)) for r, y in prof(a)])
    owner = {}
    for i in range(segs):
        am = (angs[i] + angs[i + 1]) / 2
        rad = Vector((math.cos(am), 0, math.sin(am)))
        P = prof(am)
        for j in range(len(P) - 1):           # (j = 5 -> 0 would be the back strip: open)
            f = bm.faces.new([rings[i][j], rings[i + 1][j], rings[i + 1][j + 1], rings[i][j + 1]]); f.smooth = True
            (ra, ya), (rb, yb) = P[j], P[j + 1]
            owner[f] = rad * (yb - ya) + Vector((0, -(rb - ra), 0))
    for ring, a, sgn in ((rings[0], angs[0], -1), (rings[-1], angs[-1], 1)):
        f = bm.faces.new(ring); f.smooth = False
        owner[f] = Vector((-math.sin(a), 0, math.cos(a))) * sgn
    fix_normals(bm, list(owner), lambda f: owner[f])
    return bm


def to_y(bm, y=0.0, x=0.0, z=0.0):
    """a lathe built about +Z turned to look along +Y, moved to (x, y, z)"""
    bm.transform(Matrix.Translation((x, y, z)) @ Matrix.Rotation(-math.pi / 2, 4, "X"))
    return bm


def lens_uv(cell, rl, zc, xc=0.0):
    u0, v0 = CELL[cell]
    k = 0.5 / (2 * rl / LENS_FILL)
    return lambda co: (u0 + 0.25 + (co.x - xc) * k, v0 + 0.25 + (co.z - zc) * k)


# ------------------------------------------------------------------------------------------------ the heads (head frame)
# origin = the centre of the housing's back face; lenses along +Y, top = +Z
HEADS = {
    "main": dict(n=3, rl=0.098, pitch=0.25, W=0.27, H=0.78, D=0.20, vmin=0.05, vmax=0.20, plate=(0.52, 1.00, 0.045, 0.05, 0.11)),
    "rep": dict(n=3, rl=0.048, pitch=0.122, W=0.135, H=0.39, D=0.11, vmin=0.02, vmax=0.085, plate=None),
    "ped": dict(n=2, rl=0.098, pitch=0.25, W=0.27, H=0.53, D=0.20, vmin=0.05, vmax=0.20, plate=None),
    "bike": dict(n=3, rl=0.05, pitch=0.125, W=0.14, H=0.40, D=0.11, vmin=0.02, vmax=0.09, plate=None),
}
LENSES = {"main": [("lens_red", "disc"), ("lens_amber", "disc"), ("lens_green", "disc")],
          "rep": [("lens_red", "disc"), ("lens_amber", "disc"), ("lens_green", "disc")],
          "ped": [("ped_red", "stand"), ("ped_green", "walk")],
          "bike": [("lens_red", "bike"), ("lens_amber", "bike"), ("lens_green", "bike")]}


def head(b, kind, M, lod):
    """the head `kind` into Build b at matrix M (head frame -> piece frame)"""
    h = HEADS[kind]
    W, H, D, rl = h["W"], h["H"], h["D"], h["rl"]
    yf = D
    zs = [((h["n"] - 1) / 2 - i) * h["pitch"] for i in range(h["n"])]
    T = lambda x=0, y=0, z=0: M @ Matrix.Translation((x, y, z))
    # housing
    if lod == 0: hb = box(W, D, H, bevel=min(0.014, W * 0.08), segs=4)        # (4 segments: 22.5 deg a step, no streak)
    elif lod == 1: hb = box(W, D, H)                                             # (a 1 cm bevel is < 0.5 px past 25 m)
    else: hb = box(W, D, H)
    b.add(hb, "tl_housing", T(0, D / 2, 0))
    # backplate (main head)
    if h["plate"]:
        pw, ph, prc, border, py = h["plate"]
        cl = 0.002
        hrc = min(0.014, W * 0.08) + cl if lod == 0 else 0.004
        bb, bp = backplate(pw, ph, prc, border, W + 2 * cl, H + 2 * cl, hrc, py, 0.012, k=4 if lod == 0 else (2 if lod == 1 else 1), chamfer=0.003 if lod < 2 else 0.0)
        b.add(bb, "tl_border", M); b.add(bp, "tl_backplate", M)
    for (slot, cell), zc in zip(LENSES[kind], zs):
        # (polish round: LOD0 rims round, not octagonal: 32 / 24 segments; the dome behind the bezel lip needs fewer)
        segs = (32 if rl > 0.07 else 20) if lod == 0 else ((12 if rl > 0.07 else 8) if lod == 1 else 6)
        dsegs = (16 if rl > 0.07 else 14) if lod == 0 else segs
        if lod == 0:
            # bezel ring (sits on the housing face), lens dome behind its lip, visor
            rb = rl + 0.016 * (rl / 0.098) ** 0.5
            q = 0.012 * (rl / 0.098) ** 0.5
            bz = lathe([(rb, -0.003), (rb, q * 0.65), (rb - 0.003, q), (rl + 0.002, q), (rl, q * 0.75), (rl, q * 0.3)] if rl > 0.07
                       else [(rb, -0.003), (rb, q), (rl, q), (rl, q * 0.3)], segs)      # (the 100 mm bezels: no chamfers, budget)
            b.add(to_y(bz, yf, 0, zc), "tl_housing", M)
            dome = lathe([(rl - 0.001, q * 0.4)] + [((rl - 0.001) * math.cos(t), q * 0.4 + 0.012 * (rl / 0.098) * math.sin(t)) for t in (0.6, 1.1)] + [(0.0, q * 0.4 + 0.012 * (rl / 0.098))], dsegs)
            b.add(to_y(dome, yf, 0, zc), slot, M, uvf=lens_uv(cell, rl, zc))
            v = visor(rb + 0.0005, 0.003, -0.003, h["vmin"], h["vmax"], -22, 202, 18 if rl > 0.07 else 12, lip=0.0013, round_lip=2 if rl > 0.07 else 1)
            b.add(v, "tl_housing", T(0, yf, zc))
        elif lod == 1:
            lz = 0.004
            disc = lathe([(rl, -0.002), (rl, lz), (0.0, lz + 0.004)], segs)
            b.add(to_y(disc, yf, 0, zc), slot, M, uvf=lens_uv(cell, rl, zc))
            v = visor(rl + 0.008, 0.003, -0.003, h["vmin"], h["vmax"], -22, 202, 6, lip=0.0)
            b.add(v, "tl_housing", T(0, yf, zc))
        else:
            # a flat disc 8 mm proud of the housing (resolvable to 450 m), no side band
            disc = bmesh.new()
            f = disc.faces.new([disc.verts.new((rl * math.cos(2 * math.pi * k / segs), 0.0, rl * math.sin(2 * math.pi * k / segs))) for k in range(segs)])
            fix_normals(disc, [f], lambda f: Vector((0, 1, 0))); f.smooth = False
            disc.transform(Matrix.Translation((0, yf + 0.008, zc)))
            b.add(disc, slot, M, uvf=lens_uv(cell, rl, zc))


PR = 0.057            # pole radius (114 mm)
GAP = 0.045           # pole surface -> housing back
POLE_TOP = 3.42
SINK = 0.30


def mount(b, M_pole_side, zs, lod, arm_w=0.05):
    """clamp bands round the pole at heights zs and arms out to a head whose back is GAP off the pole in the direction
    of M_pole_side (a rotation about Z: +Y = that direction)"""
    for z in zs:
        shared = any(abs(z - c) < 0.06 for c in b.clamps)       # one band round the pole serves two heads
        if not shared: b.clamps.append(z)
        if lod == 0 and not shared:
            cb = lathe([(PR - 0.001, z - 0.022), (PR + 0.007, z - 0.022), (PR + 0.007, z + 0.022), (PR - 0.001, z + 0.022)], 16)
            b.add(cb, "tl_bracket")
            for sx in (-1, 1):   # the clamp's bolts, either side of the arm
                bolt = lathe([(0.0065, -0.004), (0.0065, 0.010), (0.004, 0.0135), (0.0, 0.0135)], 6, smooth=False)
                b.add(bolt, "tl_bracket", M_pole_side @ Matrix.Translation((sx * 0.034, PR + 0.002, z)) @ Matrix.Rotation(-math.pi / 2, 4, "X"))
        if lod < 2:
            arm = box(arm_w, GAP + 0.016, 0.034, bevel=0.003 if lod == 0 else 0.0, segs=1)
            b.add(arm, "tl_bracket", M_pole_side @ Matrix.Translation((0, PR - 0.012 + (GAP + 0.016) / 2 + 0.004, z)))
        elif arm_w >= 0.05:      # LOD2: the big heads' arms only
            arm = box(arm_w, GAP + 0.01, 0.03)
            b.add(arm, "tl_bracket", M_pole_side @ Matrix.Translation((0, PR + GAP / 2, z)))


def pole(b, lod):
    if lod == 0:
        zs = [-SINK, 0.0, 0.08, 0.4, 1.3, 2.2, 2.8, 3.36]
        prof = [(PR, z) for z in zs] + [(PR + 0.004, 3.36), (PR + 0.004, 3.40), (PR, 3.412), (PR * 0.7, 3.424), (0.0, 3.428)]
        b.add(lathe(prof, 20), "tl_pole")
        # galvanised collar at the foot (the pavement's joint round the pole)
        b.add(lathe([(0.074, -0.04), (0.074, 0.032), (0.070, 0.044), (PR - 0.0008, 0.050)], 20), "tl_bracket")
    elif lod == 1:
        b.add(lathe([(PR, -SINK), (PR, 0.0), (PR, 0.08), (PR, 0.5), (PR, 1.5), (PR, 2.5), (PR, 3.40), (PR * 0.6, 3.425), (0.0, 3.428)], 16), "tl_pole")
        b.add(lathe([(0.074, -0.04), (0.074, 0.04), (PR - 0.0008, 0.050)], 16), "tl_bracket")
    else:
        b.add(lathe([(PR, -SINK), (PR, 0.0), (PR, 3.42), (0.0, 3.42)], 6, smooth=False), "tl_pole")


def button(b, M, lod):
    """the push-button box (frame: +Y = its face, origin on the pole axis)"""
    y0 = PR - 0.002
    if lod == 0:
        b.add(box(0.095, 0.072, 0.165, bevel=0.009, segs=3), "tl_buttonbox", M @ Matrix.Translation((0, y0 + 0.036, 0)))
        b.add(box(0.072, 0.006, 0.122, bevel=0.0022, segs=2), "tl_buttonplate", M @ Matrix.Translation((0, y0 + 0.072 + 0.0015, 0.004)))
        btn = lathe([(0.019, -0.002), (0.019, 0.007), (0.016, 0.011), (0.0, 0.0125)], 16)
        b.add(to_y(btn, y0 + 0.0775, 0, 0.028), "tl_button", M)
        # the tactile arrow under the button (a raised triangle, for the blind: the crossing's direction)
        ar = bmesh.new()
        pts = [(-0.012, -0.03), (0.016, -0.03), (0.016, -0.022), (-0.012, -0.022)]
        tri = [(0.016, -0.038), (0.03, -0.026), (0.016, -0.014)]
        for poly in (pts, tri):
            vs = [ar.verts.new((x, 0.0, z)) for x, z in poly]
            f = ar.faces.new(vs)
            r = bmesh.ops.extrude_face_region(ar, geom=[f])
            bmesh.ops.translate(ar, vec=(0, 0.004, 0), verts=[e for e in r["geom"] if isinstance(e, bmesh.types.BMVert)])
        bmesh.ops.recalc_face_normals(ar, faces=ar.faces)
        for f in ar.faces: f.smooth = False
        b.add(ar, "tl_button", M @ Matrix.Translation((0, y0 + 0.0775 - 0.0015, 0)))
        cb = lathe([(PR - 0.001, -0.10), (PR + 0.005, -0.10), (PR + 0.006, -0.098), (PR + 0.006, -0.072), (PR + 0.005, -0.07), (PR - 0.001, -0.07)], 24)
        b.add(cb, "tl_bracket", M)
    elif lod == 1:
        b.add(box(0.095, 0.072, 0.165), "tl_buttonbox", M @ Matrix.Translation((0, y0 + 0.036, 0)))
        b.add(box(0.072, 0.004, 0.122), "tl_buttonplate", M @ Matrix.Translation((0, y0 + 0.073, 0.004)))


def build_piece(name, lod, bike=False):
    b = Build(f"{name}_LOD{lod}")
    pole(b, lod)
    R = lambda deg: Matrix.Rotation(math.radians(deg), 4, "Z")
    # main head: faces +Y, centre 3.00 m
    zc = 3.0
    head(b, "main", Matrix.Translation((0, PR + GAP, zc)), lod)
    mount(b, R(0), [zc - 0.25, zc + 0.25], lod)
    # repeater at eye level, turned 20 deg toward the road (+X) for the driver at the line
    zr = 1.62
    head(b, "rep", R(-20) @ Matrix.Translation((0, PR + GAP * 0.7, zr)), lod)
    mount(b, R(-20), [zr], lod, arm_w=0.04)
    # pedestrian head on the road side, across the street
    zp = 2.25
    head(b, "ped", R(-90) @ Matrix.Translation((0, PR + GAP, zp)), lod)
    mount(b, R(-90), [zp - 0.15, zp + 0.15], lod)
    # bike head under the main head (variant)
    if bike:
        zb = 2.13
        head(b, "bike", Matrix.Translation((0, PR + GAP * 0.7, zb)), lod)
        mount(b, R(0), [zb], lod, arm_w=0.04)
    # push button on the pavement side (-X), at hand height
    button(b, R(90) @ Matrix.Translation((0, 0, 1.08)), lod)
    return b.to_object(sharp_deg=40)


PIECES = {"tl_post": False, "tl_post_bike": True}
objs = {}
for p, bike in PIECES.items():
    for lod in range(3):
        o = build_piece(p, lod, bike)
        objs[(p, lod)] = o
tick("built " + ", ".join(f"{o.name}" for o in objs.values()))


def tris(o):
    dg = bpy.context.evaluated_depsgraph_get()
    me = o.evaluated_get(dg).to_mesh()
    n = sum(len(p.vertices) - 2 for p in me.polygons)
    o.evaluated_get(dg).to_mesh_clear()
    return n


# ------------------------------------------------------------------------------------------------ the pictogram atlas
def picto(px=512):
    """tlights_picto.png: 2 x 2 cells (grey = how lit). Signed distances of capsules / rings, 1.5 px anti-aliased.
    Image rows bottom-up (Blender); the glTF / three.js flip keeps the cells upright on the lenses."""
    n = px // 2
    ys, xs = np.mgrid[0:n, 0:n].astype(np.float64)
    # cell coords: lens radius = 1 (the LENS_FILL margin outside)
    X = ((xs + 0.5) / n * 2 - 1) / LENS_FILL; Y = ((ys + 0.5) / n * 2 - 1) / LENS_FILL
    aa = 1.5 / (n / 2 * LENS_FILL)
    def cap(ax, ay, bx, by, r):
        pax, pay, bax, bay = X - ax, Y - ay, bx - ax, by - ay
        h = np.clip((pax * bax + pay * bay) / (bax * bax + bay * bay + 1e-12), 0, 1)
        return np.hypot(pax - bax * h, pay - bay * h) - r
    def circ(cx, cy, r): return np.hypot(X - cx, Y - cy) - r
    def ring(cx, cy, R, t): return np.abs(np.hypot(X - cx, Y - cy) - R) - t
    def U(*ds): return np.minimum.reduce(ds)
    def fill(d): return np.clip(0.5 - d / aa, 0, 1)
    disc = fill(np.hypot(X, Y) - 0.985)
    stand = fill(U(circ(0, 0.60, 0.15), cap(0, 0.36, 0, 0.0, 0.16), cap(-0.21, 0.36, -0.24, -0.02, 0.065), cap(0.21, 0.36, 0.24, -0.02, 0.065),
                   cap(-0.08, -0.05, -0.09, -0.66, 0.085), cap(0.08, -0.05, 0.09, -0.66, 0.085)))
    walk = fill(U(circ(0.07, 0.61, 0.145), cap(0.04, 0.38, -0.04, 0.0, 0.125), cap(0.03, 0.35, 0.27, 0.10, 0.06), cap(0.27, 0.10, 0.36, 0.02, 0.055),
                  cap(0.0, 0.35, -0.22, 0.12, 0.06), cap(-0.22, 0.12, -0.27, -0.06, 0.055),
                  cap(-0.04, -0.02, 0.17, -0.32, 0.075), cap(0.17, -0.32, 0.30, -0.64, 0.07),
                  cap(-0.04, -0.02, -0.16, -0.33, 0.075), cap(-0.16, -0.33, -0.36, -0.58, 0.07)))
    bike = fill(U(ring(-0.43, -0.25, 0.29, 0.045), ring(0.43, -0.25, 0.29, 0.045),
                  cap(-0.43, -0.25, -0.04, -0.25, 0.04), cap(-0.04, -0.25, 0.26, 0.14, 0.04), cap(-0.43, -0.25, -0.12, 0.14, 0.035),
                  cap(-0.12, 0.14, 0.26, 0.14, 0.04), cap(-0.04, -0.25, -0.15, 0.27, 0.04), cap(-0.27, 0.29, -0.05, 0.29, 0.045),
                  cap(0.26, 0.14, 0.43, -0.25, 0.04), cap(0.26, 0.14, 0.22, 0.34, 0.035), cap(0.22, 0.34, 0.36, 0.38, 0.035)))
    img = np.zeros((px, px), np.float64)
    for (u0, v0), a in ((CELL["disc"], disc), (CELL["stand"], stand), (CELL["walk"], walk), (CELL["bike"], bike)):
        r0, c0 = int(v0 * px), int(u0 * px)
        img[r0:r0 + n, c0:c0 + n] = a * disc
    im = bpy.data.images.new("tlights_picto", px, px, alpha=False, float_buffer=False)
    im.colorspace_settings.name = "Non-Color"
    rgba = np.zeros((px, px, 4), np.float32); rgba[..., 0] = rgba[..., 1] = rgba[..., 2] = img; rgba[..., 3] = 1
    im.pixels.foreach_set(rgba.ravel())
    path = os.path.join(OUT, "tlights_picto.png")
    im.filepath_raw = path; im.file_format = "PNG"; im.save()
    tick(f"pictograms -> {path}")
    return im


PICTO = picto()


# ------------------------------------------------------------------------------------------------ AO per vertex (Cycles GPU)
def gpu_setup():
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            pr.compute_device_type = kind; pr.get_devices()
            on = [d for d in pr.devices if d.type == kind]
            if on:
                for d in pr.devices: d.use = d.type == kind
                scn.cycles.device = "GPU"; tick(f"Cycles device: {kind} {[d.name for d in on]}"); return
        scn.cycles.device = "CPU"; tick("Cycles device: CPU (no OptiX / CUDA)")
    except Exception as e:
        scn.cycles.device = "CPU"; tick(f"Cycles device: CPU ({e})")


scn.render.engine = "CYCLES"
gpu_setup()
if scn.world is None: scn.world = bpy.data.worlds.new("World")
for o in objs.values():
    me = o.data
    me.color_attributes.new("Col", "BYTE_COLOR", "CORNER")
    me.color_attributes.active_color = me.color_attributes["Col"]
    c = [1.0] * (4 * len(me.loops)); me.color_attributes["Col"].data.foreach_set("color", c)
if BAKE:
    scn.cycles.samples = 128
    scn.world.light_settings.distance = 0.35
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, 0)); ground = bpy.context.active_object; ground.name = "bake_ground"
    t = time.time()
    for o in objs.values():
        for q in objs.values(): q.hide_render = q is not o
        me = o.data
        ao = me.color_attributes.new("AO", "BYTE_COLOR", "CORNER"); me.color_attributes.active_color = ao
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS", margin=0)
        n = len(me.loops)
        a = [0.0] * (4 * n); me.color_attributes["AO"].data.foreach_get("color", a)
        c = [0.0] * (4 * n)
        for li in range(n):
            v = 0.25 + 0.75 * a[4 * li]          # (soften: a vertex AO under-samples big faces)
            c[4 * li] = c[4 * li + 1] = c[4 * li + 2] = v; c[4 * li + 3] = 1
        # the white border is a big flat ring of long triangles: a per-vertex AO gradient across it would draw their
        # zigzag; it stays open (1)
        for poly in me.polygons:
            if me.materials[poly.material_index].name == "tl_border":
                for li in poly.loop_indices: c[4 * li] = c[4 * li + 1] = c[4 * li + 2] = 1.0
        me.color_attributes["Col"].data.foreach_set("color", c)
        me.color_attributes.remove(me.color_attributes["AO"])
        me.color_attributes.active_color = me.color_attributes["Col"]
    for q in objs.values(): q.hide_render = False
    bpy.data.objects.remove(ground)
    tick(f"AO baked ({time.time() - t:.0f}s)")

# ------------------------------------------------------------------------------------------------ export + info
for x in scn.objects: x.select_set(False)
for o in objs.values(): o.select_set(True)
bpy.context.view_layer.objects.active = next(iter(objs.values()))
glb = os.path.join(OUT, "tlights.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE",
                          export_extras=True, export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False)
tick(f"exported {glb} {os.path.getsize(glb) // 1024} KB")
INFO = {"asset": "Traffic lights kit (tools/blender/trafficLights.py): the Brussels signal post, docs/TLIGHTS.md",
        "frame": "glTF: y up, the pole axis on the origin, ground y = 0 (foot to -0.30); vehicle heads look along -z, the pedestrian head along +x, the button along -x",
        "colour": {"COLOR_0.r": "vertex AO (1 = open)"}, "uv0": "lens slots: the pictogram atlas tlights_picto.png (cells: disc, standing, walking, bicycle)",
        "slots": list(SLOTS), "lens_slots": LENS_SLOTS, "pieces": {}}
for (p, lod), o in objs.items():
    INFO["pieces"].setdefault(p, {})[f"lod{lod}"] = {"triangles": tris(o), "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]}
json.dump(INFO, open(os.path.join(OUT, "tlights.json"), "w"), indent=1)
tick("triangles: " + ", ".join(f"{p} {'/'.join(str(v['triangles']) for v in d.values())}" for p, d in INFO["pieces"].items()))

# ------------------------------------------------------------------------------------------------ previews
if PREV:
    P = os.path.abspath(PREV)
    scn.cycles.samples = SAMPLES; scn.cycles.use_denoising = True
    # the view transform nearest the engine's ACES filmic tone map (three ACESFilmicToneMapping), else AgX
    for vt in ("ACES 1.3", "ACES 2.0", "AgX"):
        try: scn.view_settings.view_transform = vt; break
        except TypeError: pass
    tick(f"preview view transform: {scn.view_settings.view_transform}")
    scn.view_settings.exposure = -0.8
    scn.render.image_settings.file_format = "JPEG"; scn.render.image_settings.quality = 90
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky"); scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0])
    sun_d = bpy.data.lights.new("Sun", "SUN"); sun = bpy.data.objects.new("Sun", sun_d); scn.collection.objects.link(sun)
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    gm = bpy.data.materials.new("pv_ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.07, 0.068, 0.065, 1)   # (asphalt-dark pavement)
    bpy.ops.mesh.primitive_plane_add(size=60, location=(0, 0, 0)); gp = bpy.context.active_object; gp.data.materials.append(gm)
    # the OLD signal (viewer/furniture.js MODELS.signal before claude/tlights), for the comparison only (frame: head to +Y)
    old_parts = []
    def oadd(op, **kw):
        op(**kw); o = bpy.context.active_object; old_parts.append(o); return o
    om = {k: bpy.data.materials.new("old_" + k) for k in ("iron", "white", "r", "a", "g")}
    for k, c in (("iron", (0.03, 0.035, 0.035)), ("white", (0.8, 0.8, 0.78)), ("r", (0.08, 0.01, 0.01)), ("a", (0.06, 0.04, 0)), ("g", (0, 0.05, 0.02))):
        om[k].use_nodes = True; om[k].node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*c, 1)
    OLDX = 1.4
    oadd(bpy.ops.mesh.primitive_cylinder_add, vertices=8, radius=0.06, depth=3.2, location=(OLDX, 0, 1.6 + 0.12)).data.materials.append(om["iron"])
    oadd(bpy.ops.mesh.primitive_cube_add, size=1, location=(OLDX, 0.12, 2.85 + 0.12), scale=(0.3, 0.22, 0.85)).data.materials.append(om["iron"])
    for zz, k in ((3.12, "r"), (2.86, "a"), (2.6, "g")):
        oadd(bpy.ops.mesh.primitive_cylinder_add, vertices=12, radius=0.085, depth=0.04, location=(OLDX, 0.24, zz + 0.12), rotation=(math.pi / 2, 0, 0)).data.materials.append(om[k])
    oadd(bpy.ops.mesh.primitive_cube_add, size=1, location=(OLDX, 0, 0.9 + 0.12), scale=(0.5, 0.12, 0.12)).data.materials.append(om["white"])
    for o in old_parts: o.hide_render = True

    # the engine's lit aspect (viewer/tlights/tlightPlace.js LIT / EMIT: saturated, a hot centre only), rendered with
    # the view transform closest to the engine's ACES filmic
    LIT = {"red": (1, 0.04, 0.02), "amber": (1, 0.4, 0), "green": (0.02, 1, 0.72)}
    EMIT = {"red": 1.1, "amber": 0.85, "green": 0.38, "hot": 0.9}

    def lit(on, night=1.0):
        """preview emission: the lens slots in `on` glow through the pictogram mask x the hot centre"""
        for s in LENS_SLOTS:
            m = MATS[s]; nt = m.node_tree; b = nt.nodes["Principled BSDF"]
            for n in [n for n in nt.nodes if n.name.startswith("pv_")]: nt.nodes.remove(n)
            for l in list(b.inputs["Emission Strength"].links): nt.links.remove(l)
            if s in on:
                kind = s.split("_")[1]
                N = lambda t, name: (lambda n: (setattr(n, "name", "pv_" + name), n)[1])(nt.nodes.new(t))
                tex = N("ShaderNodeTexImage", "tex"); tex.image = PICTO
                uvn = N("ShaderNodeUVMap", "uv"); uvn.uv_map = "UVMap"
                v2 = N("ShaderNodeVectorMath", "x2"); v2.operation = "MULTIPLY"; v2.inputs[1].default_value = (2, 2, 2)
                fr = N("ShaderNodeVectorMath", "fr"); fr.operation = "FRACTION"
                sub = N("ShaderNodeVectorMath", "sub"); sub.operation = "SUBTRACT"; sub.inputs[1].default_value = (0.5, 0.5, 0)
                ln = N("ShaderNodeVectorMath", "len"); ln.operation = "LENGTH"
                mr = N("ShaderNodeMapRange", "hot"); mr.interpolation_type = "SMOOTHSTEP"
                mr.inputs["From Min"].default_value = 0.0; mr.inputs["From Max"].default_value = 0.45 * 0.47
                mr.inputs["To Min"].default_value = 1 + EMIT["hot"]; mr.inputs["To Max"].default_value = 1.0
                for a_, b_ in ((uvn.outputs[0], v2.inputs[0]), (v2.outputs[0], fr.inputs[0]), (fr.outputs[0], sub.inputs[0]), (sub.outputs[0], ln.inputs[0]), (ln.outputs["Value"], mr.inputs["Value"])):
                    nt.links.new(a_, b_)
                mul = N("ShaderNodeMath", "mul"); mul.operation = "MULTIPLY"
                nt.links.new(tex.outputs["Color"], mul.inputs[0]); nt.links.new(mr.outputs["Result"], mul.inputs[1])
                k = N("ShaderNodeMath", "k"); k.operation = "MULTIPLY"; k.inputs[1].default_value = EMIT[kind] * night
                nt.links.new(mul.outputs[0], k.inputs[0])
                b.inputs["Emission Color"].default_value = (*LIT[kind], 1)
                nt.links.new(k.outputs[0], b.inputs["Emission Strength"])
            else:
                b.inputs["Emission Strength"].default_value = 0.0

    def checker(on):
        for name, m in MATS.items():
            nt = m.node_tree; b = nt.nodes["Principled BSDF"]
            for n in [n for n in nt.nodes if n.name.startswith("ck_")]: nt.nodes.remove(n)
            if on:
                tc = nt.nodes.new("ShaderNodeTexCoord"); tc.name = "ck_tc"; ck = nt.nodes.new("ShaderNodeTexChecker"); ck.name = "ck_ck"
                ck.inputs["Scale"].default_value = 10.0      # 10 cm squares (object space)
                ck.inputs["Color1"].default_value = (0.8, 0.8, 0.8, 1); ck.inputs["Color2"].default_value = (0.22, 0.22, 0.22, 1)
                nt.links.new(tc.outputs["Object"], ck.inputs["Vector"]); nt.links.new(ck.outputs["Color"], b.inputs["Base Color"])
                b.inputs["Metallic"].default_value = 0.0; b.inputs["Roughness"].default_value = 0.6; b.inputs["Emission Strength"].default_value = 0
            else:
                for l in list(b.inputs["Base Color"].links): nt.links.remove(l)
                rgb, rough, metal = SLOTS[name]
                b.inputs["Base Color"].default_value = (*rgb, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal

    def show(keys, offsets=None):
        for k, o in objs.items():
            o.hide_render = k not in keys
            o.location = (offsets or {}).get(k, (0, 0, 0))

    def sun_at(elev, az, energy=4.0):
        sun_d.energy = energy; sun_d.angle = math.radians(1.0)
        sun.rotation_euler = (math.radians(90 - elev), 0, math.radians(az))

    def shot(name, pos, tgt, lens=50, res=(1100, 1400)):
        cam.location = Vector(pos)
        cam.rotation_euler = (Vector(tgt) - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        scn.render.filepath = os.path.join(P, name)
        t = time.time(); bpy.ops.render.render(write_still=True); tick(f"render {name} {time.time() - t:.0f}s")

    bg.inputs[1].default_value = 0.08
    # 1. the post as a driver sees it coming (3/4 from the road side), the car aspect red, the walking man green
    lit({"lens_red", "ped_green"}); sun_at(38, 215)
    show({("tl_post_bike", 0)})
    shot("tl_post_shaded.jpg", (2.6, 5.2, 1.9), (0, 0, 2.15), lens=40)
    # 2. the heads close up (lens domes, bezels, visors, backplate border)
    lit({"lens_amber", "ped_red"})
    shot("tl_heads_closeup.jpg", (1.05, 1.9, 2.75), (0.05, 0.2, 2.55), lens=45, res=(1400, 1100))
    # 3. checker (10 cm, object space) + 4. grazing light (sun 7 deg over the horizon across the view)
    lit(set()); checker(True); sun_at(38, 215)
    shot("tl_post_checker.jpg", (2.4, 3.6, 2.2), (0, 0, 2.2), lens=45)
    checker(False)
    sun_d.energy = 6.0; sun.rotation_euler = Vector((-0.9, 0.2, -0.12)).to_track_quat("-Z", "Y").to_euler()
    bg.inputs[1].default_value = 0.06
    shot("tl_post_grazing.jpg", (2.4, 3.6, 2.2), (0, 0, 2.2), lens=45)
    bg.inputs[1].default_value = 0.08; sun_at(38, 215)
    # 5. LOD0 / LOD1 / LOD2 side by side (same light)
    lit({"lens_red", "ped_green"})
    show({("tl_post", 0), ("tl_post", 1), ("tl_post", 2)}, {("tl_post", 0): (-1.1, 0, 0), ("tl_post", 1): (0, 0, 0), ("tl_post", 2): (1.1, 0, 0)})
    shot("tl_lods.jpg", (0.4, 7.5, 2.0), (0, 0, 1.9), lens=35, res=(1500, 1100))
    # 6. the old post (left) vs the new one, same camera, same light
    for o in old_parts: o.hide_render = False
    show({("tl_post", 0)}, {("tl_post", 0): (0.0, 0, 0)})
    shot("tl_old_vs_new.jpg", (0.9, 5.6, 2.0), (0.7, 0, 1.95), lens=38, res=(1500, 1100))
    for o in old_parts: o.hide_render = True
    # 7. night: the heads lit, no sun
    sun_d.energy = 0.0; bg.inputs[1].default_value = 0.004
    lit({"lens_green", "ped_red"}, night=1.15)
    show({("tl_post_bike", 0)})
    shot("tl_post_night.jpg", (2.6, 5.2, 1.9), (0, 0, 2.15), lens=40)
tick("done")
