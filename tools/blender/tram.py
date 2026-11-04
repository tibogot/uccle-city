"""THE STIB T3000 TRAM (Bombardier Flexity Outlook "Cityrunner", 5 sections, 31.85 m), the rolling stock of tram 92
past Place de Saint-Job (2024-2026 photos: cars 3007, 3036, 3128, 3131; data/raw/refs/tram/SOURCES.md). Built entirely
in code (no hand modelling), parametric: module lengths, doors and windows are lists of numbers below. Deterministic.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/tram.py -- <out_dir> [--preview <abs dir>]
      <out_dir>/t3000.glb     five pieces, each its own object with its own pivot (see PIECES), up to 4 materials each
      <out_dir>/t3000.json    the numbers the viewer needs (pivots, bogie positions, lengths) - read by viewer/tramModel.js
      <preview dir>/preview_*.png   Cycles renders to compare with the photos (never shipped: pass an absolute path)

PIECES (Blender: X forward, Y left, Z up; glTF / three.js: +x forward, y up, +z right). Every piece's origin is on the
track centre line at rail-top height:
  Cab      the driver's module (sections 1 and 5; the rear one is the same mesh turned 180 deg). Origin = the middle of
           its length from the nose tip to its articulation pivot. One bogie under its rear part.
  Susp     the suspended module (sections 2 and 4): no bogie, it hangs between the two pivots at its ends. Origin = midway
           between them. Section 4 is the same mesh turned 180 deg; the pantograph is its own piece (Panto), placed by
           the viewer on section 2 only.
  Centre   the short centre module (section 3), one bogie under its middle. Origin = its middle.
  Bellows  the articulation (4 per tram), origin = the pivot; rigid, 0.72 m long, inset 7 cm from the body: the viewer
           turns it to the bisector of the two modules, and up to the joint angle of an 18 m curve (~0.29 rad) it covers
           the opening wedge on the outside and hides inside the bodies on the inside.
  Bogie    wheels + frame (3 per tram), origin = the bogie centre; the viewer puts it on the track, tangent to it.
  Panto    the single-arm pantograph, raised to the contact wire (5.6 m above the rail top); origin = its base centre.

MATERIALS (names read by the viewer; it draws all four with one node material and a per-vertex kind):
  Paint     body paint; COLOR_0 = linear colour, alpha = metallic paint (1 silver / gold, 0 matt)
  Glass     windows, windscreen, door glass; COLOR_0.r = 1 saloon (lit at night), 0.3 driver's cab
  Trim      near-black parts: wipers, mirrors, seals, bogies, pantograph, underside
  Emissive  lamps and destination displays; COLOR_0 = (headlight, tail light, display, 0); the displays have
            TEXCOORD_0 = 0..1 over the text area (the viewer draws the LED text there)

MEASURED (published, STIB via techno-science.net; railjournal.com): length 31.85 m, width 2.30 m, floor 0.35 m,
5 sections, 3 bogies. ESTIMATED from the photos (no published drawing found): height 3.30 m to the roof crown, module
lengths (cab 8.825 / suspended 5.6 / centre 3.0 m pivot to pivot, summing to 31.85), door and window positions,
bogie positions, livery colours (sampled from the photos), wheel diameter 0.68 m, pantograph.
"""
import bpy, bmesh, math, os, sys, json
from mathutils import Vector, Matrix

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else "tram_out")
os.makedirs(OUT, exist_ok=True)
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ dimensions (m)
W = 2.30                      # body width (published)
HW = W / 2
FLOOR = 0.35                  # floor above rail (published)
ROOF = 3.30                   # roof crown above rail (estimated)
L_CAB, L_SUSP, L_CEN = 8.825, 5.6, 3.0        # pivot to pivot (cab: nose tip to pivot); 2*8.825 + 2*5.6 + 3.0 = 31.85
GAP = 0.17                    # body end to articulation pivot (no overlap of the inner corners down to an 18 m curve)
BOGIE_CAB = 2.05              # cab bogie centre, from the cab's rear pivot (estimated from photos)
WHEEL_R, GAUGE, BOGIE_WB = 0.34, 1.435, 1.80
WIRE = 5.6                    # contact wire above rail top (viewer/tram.js: 5.8 m above the road surface; tram origin +0.2)
TOTAL = 2 * L_CAB + 2 * L_SUSP + L_CEN

# heights of the livery / openings on the side
Z_BOT, Z_SILL, Z_WIN0, Z_WIN1, Z_BAND1, Z_GOLD1 = 0.20, 1.00, 1.07, 2.27, 2.32, 2.56
Z_DOOR0, Z_DOOR1 = 0.36, 2.32
SHOULDER_C, SHOULDER_R = 2.70, 0.55   # roof shoulder: an arc from (HW, 2.70) up to (HW - 0.55, 3.25), then the crown

# openings, in metres from the module's FRONT end (pivot, or nose tip for the cab): (start, end)
CAB_DOOR = (1.78, 2.58)                       # single leaf, right behind the gold sweep
CAB_WINDOWS = [(2.78, 5.30), (5.42, 8.50)]
SUSP_DOORS = [(0.32, 1.62), (4.00, 5.30)]     # two double doors
SUSP_WINDOWS = [(1.82, 3.80)]
CEN_WINDOWS = [(0.30, 2.70)]
SIDE_DISPLAY = (2.25, 3.35)                   # side destination display on the suspended module, top of the window band

# ------------------------------------------------------------------------------------------------ colours (linear) and materials
def lin(c): return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
def srgb(r, g, b, metal=0.0): return (lin(r), lin(g), lin(b), metal)
SILVER = srgb(0.66, 0.67, 0.69, 1.0)          # STIB silver-grey (photos: 3025 / 3097)
ROOFC = srgb(0.64, 0.65, 0.67, 1.0)
GOLD = srgb(0.74, 0.53, 0.31, 1.0)            # STIB "gold" (champagne bronze) nose panel and cantrail band
DARK = srgb(0.085, 0.095, 0.105, 0.0)         # the black window band and window surrounds
BUMPER = srgb(0.42, 0.42, 0.43, 0.5)
BELLOWS = srgb(0.50, 0.52, 0.55, 0.0)
ENDWALL = srgb(0.20, 0.21, 0.22, 0.0)
SKIRT = srgb(0.66, 0.67, 0.69, 1.0)
GLASS_SALOON, GLASS_CAB = (1.0, 0, 0, 1), (0.3, 0, 0, 1)
TRIM_C = (0.012, 0.012, 0.013, 1)
E_HEAD, E_TAIL, E_DISP = (1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0)

def material(name, rgb, rough, metal=0.0, emit=None, strength=0.0, use_col=False):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    p = nt.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if use_col:                                  # previews: the vertex colour drives the base colour
        a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
        nt.links.new(a.outputs["Color"], p.inputs["Base Color"])
    if emit:
        p.inputs["Emission Color"].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = strength
    return m

PAINT = material("Paint", (0.5, 0.5, 0.5), 0.32, metal=0.45, use_col=True)
GLASS = material("Glass", (0.01, 0.012, 0.014), 0.04)
TRIM = material("Trim", TRIM_C[:3], 0.55)
EMIT = material("Emissive", (0.6, 0.6, 0.6), 0.2, emit=(1.0, 0.55, 0.1), strength=0.0)
MATS = [PAINT, GLASS, TRIM, EMIT]
MP, MG, MT, ME = 0, 1, 2, 3

# ------------------------------------------------------------------------------------------------ a small mesh builder
class MB:
    """Vertices + polygons with a material index, a colour and optional UVs per polygon. `out` orients a polygon:
    its normal is flipped to point along `out` (a direction, or a callable of the centroid)."""
    def __init__(self): self.v, self.f = [], []
    def vert(self, p): self.v.append(tuple(p)); return len(self.v) - 1
    def poly(self, idx, mat, col, out=None, uv=None):
        if len(set(idx)) < 3: return
        if out is not None:
            pts = [Vector(self.v[i]) for i in idx]
            n = Vector((0, 0, 0))
            for k in range(len(pts)): n += pts[k].cross(pts[(k + 1) % len(pts)])
            c = sum(pts, Vector((0, 0, 0))) / len(pts)
            o = Vector(out(c) if callable(out) else out)
            if n.dot(o) < 0:
                idx = list(reversed(idx))
                if uv: uv = list(reversed(uv))
        self.f.append((list(idx), mat, col, uv))
    def quad_strip(self, a, b, mat, col, out=None):
        for k in range(len(a) - 1): self.poly([a[k], a[k + 1], b[k + 1], b[k]], mat, col, out)
    def merge(self, o):
        n = len(self.v); self.v += o.v
        for idx, m, c, uv in o.f: self.f.append(([i + n for i in idx], m, c, uv))

def to_object(name, mb, sharp_deg=32, merge=True):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in mb.v]
    col = bm.loops.layers.float_color.new("Col")
    uvl = bm.loops.layers.uv.new("UVMap")
    for idx, m, c, uv in mb.f:
        try:
            f = bm.faces.new([vs[i] for i in idx])
        except ValueError:
            continue                                         # duplicate face
        f.material_index = m
        for k, l in enumerate(f.loops):
            l[col] = c
            l[uvl].uv = uv[k] if uv else (0.0, 0.0)
    if merge: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    for m in MATS: o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    try: o.data.set_sharp_from_angle(angle=math.radians(sharp_deg))
    except Exception: pass
    return o

# ------------------------------------------------------------------------------------------------ the body cross-section
def profile_rows(extra=()):
    """Half cross-section rows bottom -> crown: [(z, half width)]. `extra` adds rows in the flat part of the side."""
    rows = [(Z_BOT, HW - 0.10), (0.27, HW - 0.025)]
    flat = sorted(set([Z_DOOR0, Z_SILL, Z_WIN0, Z_WIN1, Z_BAND1, Z_GOLD1, SHOULDER_C] + [z for z in extra if Z_DOOR0 < z < SHOULDER_C]))
    rows += [(z, HW) for z in flat]
    for a in (18, 36, 54, 72, 90):                                   # the roof shoulder arc
        t = math.radians(a)
        rows.append((SHOULDER_C + SHOULDER_R * math.sin(t), HW - SHOULDER_R + SHOULDER_R * math.cos(t)))
    rows += [(ROOF - 0.02, 0.32), (ROOF, 0.0)]
    return rows

def side_colour(x_from_front, z, cab):
    """Paint colour of the body side at a point (x measured from the module's front end, z height)."""
    if z < Z_SILL: return SILVER
    if z < Z_BAND1: return DARK
    if z < Z_GOLD1: return GOLD
    return SILVER if z < SHOULDER_C + 0.25 else ROOFC

def sweep_x(z):
    """The cab's gold sweep: distance from the nose tip of its front edge at height z (it runs from the nose panel
    at the windscreen's foot up and back to the cantrail band above the door)."""
    t = min(max((z - 1.05) / (Z_GOLD1 - 1.05), 0.0), 1.0)
    return 0.92 + 0.68 * (1 - (1 - t) ** 1.6)             # 0.92 m at the bottom -> 1.60 m at the band
SWEEP_W = 0.13

# ------------------------------------------------------------------------------------------------ the nose (cab front)
NOSE_LEN = 0.90               # the nose region, from the tip back (beyond it the side is straight)
def nose_shape(z):
    """(setback of the front face from the tip, plan corner radius) at height z."""
    keys_s = [(Z_BOT, 0.07), (0.27, 0.015), (0.40, 0.0), (0.58, 0.0), (0.62, 0.02), (1.12, 0.06), (1.18, 0.07),
              (2.34, 0.30), (2.40, 0.31), (2.68, 0.33), (2.80, 0.37), (2.95, 0.43), (3.08, 0.51), (3.18, 0.60),
              (3.25, 0.66), (3.28, 0.70), (3.30, 0.74)]
    keys_r = [(Z_BOT, 0.34), (0.58, 0.36), (0.62, 0.44), (1.12, 0.46), (1.18, 0.52), (2.34, 0.56), (2.68, 0.56), (3.30, 0.56)]
    def interp(keys):
        if z <= keys[0][0]: return keys[0][1]
        for (z0, a), (z1, b) in zip(keys, keys[1:]):
            if z <= z1: return a + (b - a) * (z - z0) / (z1 - z0)
        return keys[-1][1]
    return interp(keys_s), interp(keys_r)

NOSE_BULGE = 0.07
def nose_outline(z, w, xtip, n_side=2, n_arc=7, n_front=5):
    """Plan outline of the nose at height z, half (y >= 0), from the start of the nose region on the side to the front
    centre: [(x, y, kind)], kind 0 side, 1 corner, 2 front."""
    s, rc = nose_shape(z)
    rc = min(rc, w * 0.985)
    xf = xtip - s
    x0 = xtip - NOSE_LEN
    pts = []
    xa = max(xf - rc, x0 + 0.01)                                   # the corner arc starts here on the side
    for k in range(n_side):
        pts.append((x0 + (xa - x0) * k / n_side, w, 0))
    fw = max(w - rc, 0.0)                                         # half width of the front face
    # corner: an arc of radius rc from (xa, w) round to (xf, fw) (slightly blended into the bulging front)
    for k in range(n_arc + 1):
        t = (math.pi / 2) * k / n_arc
        pts.append((xa + rc * math.sin(t), fw + rc * math.cos(t), 1))
    for k in range(1, n_front + 1):
        y = fw * (1 - k / n_front)
        bul = NOSE_BULGE * (1 - (y / fw) ** 2) if fw > 1e-6 else 0
        pts.append((xf + bul, y, 2))
    return pts

def front_x(z, y, xtip):
    """x of the nose surface at height z, lateral y (front face with its bulge, or the corner arc beyond it)."""
    s, rc = nose_shape(z)
    fw = max(HW - rc, 1e-6)
    if abs(y) <= fw: return xtip - s + NOSE_BULGE * (1 - (abs(y) / fw) ** 2)
    d = min(abs(y) - fw, rc)
    return xtip - s - rc + math.sqrt(rc * rc - d * d)

# ------------------------------------------------------------------------------------------------ one module body
def body(length, cab, doors, windows, bogies, side_display=None):
    """The body shell of one module, origin at its middle (pivot to pivot, nose tip to pivot for the cab).
    doors / windows: [(start, end)] from the module's front end. bogies: [x from the front end]. Returns an MB.
    The side is a grid of stations (x) by profile rows (z), coarse: only the edges of the openings and colours. The cab
    adds zone A (from the nose to its door) whose columns follow the gold sweep, and the nose."""
    mb = MB()
    xF = length / 2
    rows = profile_rows()
    f_start = CAB_DOOR[0] if cab else GAP
    fs = set([f_start, length - GAP])
    for a, b in list(doors) + list(windows): fs.update([a, b])
    END_IN = 0.035                     # end rounding: the last station pulls the side in a little at the joints
    fs.add(length - GAP - 0.07)
    if not cab: fs.add(GAP + 0.07)
    fs = sorted(f for f in fs if f_start <= f <= length - GAP)

    def X(f): return xF - f
    def in_rect(f, z, rects, z0, z1): return any(a <= f <= b for a, b in rects) and z0 <= z <= z1
    axis = lambda c: (c.x if abs(c.x) < length / 2 - 0.6 else math.copysign(length / 2 - 0.6, c.x), 0, min(max(c.z, 1.0), 2.4))
    out_of = lambda c: c - Vector(axis(c))
    is_end = lambda f: f >= length - GAP - 1e-6 or (not cab and f <= GAP + 1e-6)

    for side in (1, -1):
        grid = []
        for f in fs:
            pull = END_IN if is_end(f) else 0.0
            grid.append([mb.vert((X(f), side * max(w - pull * (1 if w > 0.5 else 0), 0), z - (pull * 0.6 if z > ROOF - 0.05 else 0))) for z, w in rows])
        for i in range(len(fs) - 1):
            fc = (fs[i] + fs[i + 1]) / 2
            for j in range(len(rows) - 1):
                zc = (rows[j][0] + rows[j + 1][0]) / 2
                if in_rect(fc, zc, doors, Z_DOOR0, Z_DOOR1) or in_rect(fc, zc, windows, Z_WIN0, Z_WIN1): continue   # inset below
                mb.poly([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]], MP, side_colour(fc, zc, cab), out_of)
        if cab: zone_a(mb, xF, side, out_of)
    # underside
    fu = ([NOSE_LEN] if cab else []) + fs
    for i in range(len(fu) - 1):
        a = mb.vert((X(fu[i]), HW - 0.10, Z_BOT)); b = mb.vert((X(fu[i + 1]), HW - 0.10, Z_BOT))
        c = mb.vert((X(fu[i + 1]), -HW + 0.10, Z_BOT)); d = mb.vert((X(fu[i]), -HW + 0.10, Z_BOT))
        mb.poly([a, b, c, d], MT, TRIM_C, (0, 0, -1))
    # joint end walls (dark), at the rear end and (not cab) the front end
    for f in ([length - GAP] + ([] if cab else [GAP])):
        ring = [(max(w - END_IN * (1 if w > 0.5 else 0), 0), z) for z, w in rows]
        ring = ring + [(-y, z) for y, z in reversed(ring[:-1])]
        c = mb.vert((X(f), 0, 1.7))
        vv = [mb.vert((X(f), y, z - (END_IN * 0.6 if z > ROOF - 0.05 else 0))) for y, z in ring]
        sgn = -1 if f > length / 2 else 1
        for k in range(len(vv) - 1): mb.poly([c, vv[k], vv[k + 1]], MP, ENDWALL, (sgn, 0, 0))
        mb.poly([c, vv[-1], vv[0]], MP, ENDWALL, (sgn, 0, 0))
    for a, b in windows: window(mb, X(a), X(b))
    for a, b in doors: door(mb, X(a), X(b))
    for x in bogies: skirt(mb, X(x))
    if side_display: side_disp(mb, X(SIDE_DISPLAY[0]), X(SIDE_DISPLAY[1]))
    if cab: nose(mb, xF)
    return mb

def zone_a(mb, xtip, side, out_of):
    """The cab side between the nose and the door: three columns whose middle one IS the gold sweep (its edges follow
    sweep_x(z)), so the sweep is a smooth band with few triangles: driver's window ahead of it, window band behind."""
    extra = [0.62, 1.05, 1.12] + [round(1.15 + 0.1 * k, 3) for k in range(14)]
    rows = profile_rows(extra)
    f_end = CAB_DOOR[0]
    def cols(z):
        zz = min(max(z, 1.05), Z_GOLD1)
        a = sweep_x(zz)
        return [NOSE_LEN, a, a + SWEEP_W, f_end]
    grid = [[mb.vert((xtip - f, side * w, z)) for f in cols(z)] for z, w in rows]
    for j in range(len(rows) - 1):
        zc = (rows[j][0] + rows[j + 1][0]) / 2
        for i in range(3):
            mat, colr = MP, side_colour(0, zc, True)
            if 0.62 <= zc < Z_GOLD1:
                if i == 1: colr = GOLD
                elif i == 0:
                    if zc < 1.12: colr = GOLD
                    elif zc < Z_BAND1: mat, colr = MG, GLASS_CAB
                    else: colr = DARK
                else:
                    colr = SILVER if zc < Z_SILL else DARK if zc < Z_BAND1 else GOLD
            mb.poly([grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]], mat, colr, out_of)

def reveal(mb, xa, xb, z0, z1, depth, col):
    """The four inner faces of an opening in both sides (x from xa down to xb)."""
    for side in (1, -1):
        y0, y1 = side * HW, side * (HW - depth)
        P = lambda x, y, z: mb.vert((x, y, z))
        for (pa, pb) in [((xa, z0), (xb, z0)), ((xb, z0), (xb, z1)), ((xb, z1), (xa, z1)), ((xa, z1), (xa, z0))]:
            q = [P(pa[0], y0, pa[1]), P(pb[0], y0, pb[1]), P(pb[0], y1, pb[1]), P(pa[0], y1, pa[1])]
            cx, cz = (xa + xb) / 2, (z0 + z1) / 2
            mb.poly(q, MP, col, lambda c, cx=cx, cz=cz: Vector((cx - c.x, 0, cz - c.z)))

def window(mb, xa, xb):
    reveal(mb, xa, xb, Z_WIN0, Z_WIN1, 0.035, DARK)
    for side in (1, -1):
        y = side * (HW - 0.035)
        q = [mb.vert((xa, y, Z_WIN0)), mb.vert((xb, y, Z_WIN0)), mb.vert((xb, y, Z_WIN1)), mb.vert((xa, y, Z_WIN1))]
        mb.poly(q, MG, GLASS_SALOON, (0, side, 0))

def stadium(cx, cz, w, h, n):
    """n points round a vertical stadium (rounded top and bottom), counter-clockwise seen from +Y... angle order."""
    r = w / 2; hh = h / 2 - r
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        dx, dz = math.cos(t), math.sin(t)
        px = cx + r * dx
        pz = cz + (hh if dz >= 0 else -hh) + r * dz
        pts.append((px, pz))
    return pts

def door(mb, xa, xb):
    """A door opening from xa (front) to xb: reveal, then one leaf (< 1 m) or two, inset, silver with tall oval glass."""
    depth = 0.04
    reveal(mb, xa, xb, Z_DOOR0, Z_DOOR1, depth, DARK)
    n_leaf = 1 if abs(xa - xb) < 1.0 else 2
    lw = (xa - xb) / n_leaf
    for side in (1, -1):
        y = side * (HW - depth + 0.005)
        for k in range(n_leaf):
            la, lb = xa - k * lw - 0.006, xa - (k + 1) * lw + 0.006     # leaf edges (a thin dark seam between)
            cx, cz = (la + lb) / 2, (Z_DOOR0 + Z_DOOR1) / 2 + 0.06
            gw, gh = abs(la - lb) * 0.50, 1.42
            N = 24
            inner = stadium(cx, cz, gw, gh, N)
            outer = []
            for (px, pz) in inner:                                   # project each inner point outward onto the leaf edge
                dx, dz = px - cx, pz - cz
                sx = (abs(la - lb) / 2 - 0.001) / max(abs(dx), 1e-6)
                sz0 = ((Z_DOOR1 - 0.002) - cz) / dz if dz > 0 else ((Z_DOOR0 + 0.002) - cz) / dz if dz < 0 else 1e9
                s = min(sx, sz0)
                outer.append((cx + dx * s, cz + dz * s))
            # make the leaf corners exact: snap points nearest the corners
            for (qx, qz) in [(la, Z_DOOR1), (lb, Z_DOOR1), (lb, Z_DOOR0), (la, Z_DOOR0)]:
                kk = min(range(N), key=lambda i: (outer[i][0] - qx) ** 2 + (outer[i][1] - qz) ** 2)
                outer[kk] = (qx, qz)
            vi = [mb.vert((px, y, pz)) for px, pz in inner]
            vo = [mb.vert((px, y, pz)) for px, pz in outer]
            for i in range(N):
                mb.poly([vo[i], vo[(i + 1) % N], vi[(i + 1) % N], vi[i]], MP, SILVER, (0, side, 0))
            vg = [mb.vert((px, y - side * 0.008, pz)) for px, pz in inner]
            mb.poly(vg, MG, GLASS_SALOON, (0, side, 0))
            for i in range(N):                                        # the glass sits 8 mm back in a black seal
                mb.poly([vi[i], vi[(i + 1) % N], vg[(i + 1) % N], vg[i]], MT, TRIM_C, lambda c, cx=cx, cz=cz: Vector((cx - c.x, 0, cz - c.z)))
            # the leaf's dark edge seam: a thin frame face behind the leaf
        q = [mb.vert((xa, y - side * 0.025, Z_DOOR0)), mb.vert((xb, y - side * 0.025, Z_DOOR0)),
             mb.vert((xb, y - side * 0.025, Z_DOOR1)), mb.vert((xa, y - side * 0.025, Z_DOOR1))]
        mb.poly(q, MT, TRIM_C, (0, side, 0))
        # door step (dark) under the opening
        q = [mb.vert((xa, side * (HW + 0.0), Z_DOOR0 - 0.02)), mb.vert((xb, side * HW, Z_DOOR0 - 0.02)),
             mb.vert((xb, side * (HW - depth), Z_DOOR0 - 0.0)), mb.vert((xa, side * (HW - depth), Z_DOOR0))]
        mb.poly(q, MT, TRIM_C, (0, 0, 1))

def rounded_rect(cx, cz, l, h, r, n=5):
    pts = []
    for (qx, qz, a0) in [(cx + l / 2 - r, cz + h / 2 - r, 0), (cx - l / 2 + r, cz + h / 2 - r, 90), (cx - l / 2 + r, cz - h / 2 + r, 180), (cx + l / 2 - r, cz - h / 2 + r, 270)]:
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n)
            pts.append((qx + r * math.cos(t), qz + r * math.sin(t)))
    return pts

def skirt(mb, x):
    """The rounded bogie cover on both sides of the body over a bogie."""
    pts = rounded_rect(x, 0.43, 1.70, 0.50, 0.22, 5)
    for side in (1, -1):
        y0, y1 = side * (HW - 0.01), side * (HW + 0.03)
        a = [mb.vert((px, y1, pz)) for px, pz in pts]
        b = [mb.vert((px, y0, pz)) for px, pz in pts]
        mb.poly(a, MP, SKIRT, (0, side, 0))
        n = len(pts)
        for i in range(n):
            mb.poly([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]], MP, SKIRT, lambda c, x=x: Vector((c.x - x, 0, c.z - 0.43)))

def side_disp(mb, xa, xb):
    """Side destination display (LED) at the top of a window, just in front of its glass; UV 0..1 reading left to right."""
    z0, z1 = 2.05, 2.21
    for side in (1, -1):
        y = side * (HW - 0.031)
        q = [mb.vert((xa, y, z0)), mb.vert((xb, y, z0)), mb.vert((xb, y, z1)), mb.vert((xa, y, z1))]
        # seen from +Y the reader's right is -X: u grows toward -X on +Y (xa > xb: xa is u=0); on -Y toward +X
        uv = [(0, 0), (1, 0), (1, 1), (0, 1)] if side > 0 else [(1, 0), (0, 0), (0, 1), (1, 1)]
        mb.poly(q, ME, E_DISP, None, uv)
        # orient: normal should face +side; the order above gives (+X->-X along bottom, then up) = normal -Y for side>0?
        idx, m, c, u = mb.f[-1]
        pts = [Vector(mb.v[i]) for i in idx]
        nrm = (pts[1] - pts[0]).cross(pts[2] - pts[1])
        if nrm.y * side < 0: mb.f[-1] = (list(reversed(idx)), m, c, list(reversed(u)))

def nose(mb, xtip):
    """The nose: rows (heights) x the plan outline of the front at each height, both halves; colours by zone; then the
    lamps, the destination display, mirrors and the wiper."""
    rows_side = profile_rows([0.45, 0.52, 0.58, 0.62, 0.85, 1.12, 1.18, 1.6, 2.0, 2.34, 2.40, 2.52, 2.64])
    zs = sorted(set([z for z, _ in rows_side] + [0.33]))
    wmap = dict(rows_side)
    def width(z):
        if z in wmap: return wmap[z]
        if z < 0.27: return HW - 0.10 + 0.075 * (z - Z_BOT) / 0.07
        if z < Z_DOOR0: return HW - 0.025 + 0.025 * (z - 0.27) / 0.09
        return HW
    for side in (1, -1):
        grid = []
        for z in zs:
            pts = nose_outline(z, width(z), xtip)
            grid.append([(mb.vert((x, side * y, z)), x, y, kind) for x, y, kind in pts])
        for j in range(len(zs) - 1):
            z0, z1 = zs[j], zs[j + 1]
            zc = (z0 + z1) / 2
            for i in range(len(grid[j]) - 1):
                a, b = grid[j][i], grid[j][i + 1]
                c, d = grid[j + 1][i + 1], grid[j + 1][i]
                xc = (a[1] + b[1]) / 2; yc = (a[2] + b[2]) / 2
                f_from_tip = xtip - xc
                kind = max(a[3], b[3])
                mat, colr = MP, SILVER
                if zc < 0.33: colr = SILVER
                elif zc < 0.58: colr = BUMPER                                     # the grey bumper band
                elif zc < 0.62: colr = DARK
                elif zc < 1.12: colr = GOLD                                       # the gold nose panel
                elif zc < 2.34:
                    if kind == 0 and f_from_tip > sweep_x(zc) - 0.02: colr = GOLD
                    elif zc < 1.18 or zc > 2.30: colr = DARK                       # black frame of the windscreen
                    else: mat, colr = MG, GLASS_CAB
                elif zc < 2.68: colr = DARK                                       # the display band (display on top)
                elif zc < 2.82 and kind >= 1: colr = DARK
                else: colr = SILVER if zc < 3.05 else ROOFC
                if kind == 0 and Z_BAND1 <= zc < Z_GOLD1: colr = GOLD
                mb.poly([a[0], b[0], c[0], d[0]], mat, colr, lambda cc: cc - Vector((xtip - 2.0, 0, min(max(cc.z, 0.8), 2.2))))
        # the bottom of the nose (underside fan)
        bot = grid[0]
        cen = mb.vert((xtip - 0.6, 0, Z_BOT))
        for i in range(len(bot) - 1):
            mb.poly([cen, bot[i][0], bot[i + 1][0]], MT, TRIM_C, (0, 0, -1))
    # lamps on the nose panel corners: (height, lateral, radius, code)
    for side in (1, -1):
        for z, y, r, code in [(0.86, 0.86, 0.062, E_HEAD), (0.72, 0.90, 0.045, E_HEAD), (1.00, 0.88, 0.04, E_TAIL),
                              (0.86, 1.00, 0.035, E_TAIL), (0.30, 0.96, 0.035, E_TAIL)]:
            lamp(mb, xtip, z, side * y, r, code)
    display_front(mb, xtip)
    for side in (1, -1): mirror(mb, xtip, side)
    # wiper (one, on the driver's side, parked diagonally)
    a = Vector((front_x(1.25, 0.1, xtip) + 0.012, -0.05, 1.22)); b = Vector((front_x(1.95, 0.55, xtip) + 0.012, 0.55, 1.95))
    bar(mb, a, b, 0.018, TRIM_C, MT)

def lamp(mb, xtip, z, y, r, code, n=10):
    """A round lamp lens on the nose surface (normal = the surface's, roughly forward + sideways at the corners)."""
    s, rc = nose_shape(z)
    fw = HW - rc
    if abs(y) <= fw:
        x = front_x(z, y, xtip); nrm = Vector((1, 0, 0))
    else:                                                  # on the corner arc
        t = math.asin(min((abs(y) - fw) / rc, 1.0))
        x = xtip - s - rc + rc * math.cos(t)
        nrm = Vector((math.cos(t), math.copysign(math.sin(t), y), 0))
    c = Vector((x, y, z)) + nrm * 0.006
    u = Vector((0, 0, 1)); v = nrm.cross(u).normalized()
    ring = [mb.vert(c + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * r) for k in range(n)]
    mb.poly(ring, ME, code, nrm)
    back = [mb.vert(c - nrm * 0.01 + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * (r + 0.012)) for k in range(n)]
    for k in range(n):
        mb.poly([ring[k], ring[(k + 1) % n], back[(k + 1) % n], back[k]], MT, TRIM_C, lambda cc, c=c: cc - c + nrm * 0.02)

def display_front(mb, xtip, half=0.80, z0=2.40, z1=2.64, n=16):
    """The front destination display: a curved strip just in front of the nose surface; u 0..1 reading left to right
    (seen from the front, the reader's right is +Y)."""
    top, bot = [], []
    for k in range(n + 1):
        y = -half + 2 * half * k / n
        bot.append(mb.vert((front_x(z0, y, xtip) + 0.006, y, z0)))
        top.append(mb.vert((front_x(z1, y, xtip) + 0.006, y, z1)))
    for k in range(n):
        u0, u1 = k / n, (k + 1) / n
        idx = [bot[k], bot[k + 1], top[k + 1], top[k]]
        uv = [(u0, 0), (u1, 0), (u1, 1), (u0, 1)]
        mb.poly(idx, ME, E_DISP, (1, 0, 0.2), uv)

def bar(mb, a, b, r, col, mat):
    """A thin square bar from a to b (4 sides, capped)."""
    d = (b - a).normalized()
    u = d.cross(Vector((0, 0, 1)))
    if u.length < 1e-3: u = d.cross(Vector((1, 0, 0)))
    u.normalize(); v = d.cross(u).normalized()
    ca = [mb.vert(a + (u * math.cos(t) + v * math.sin(t)) * r) for t in (0.785, 2.356, 3.927, 5.498)]
    cb = [mb.vert(b + (u * math.cos(t) + v * math.sin(t)) * r) for t in (0.785, 2.356, 3.927, 5.498)]
    m = (a + b) / 2
    for k in range(4): mb.poly([ca[k], ca[(k + 1) % 4], cb[(k + 1) % 4], cb[k]], mat, col, lambda c, m=m, d=d: (c - m) - d * (c - m).dot(d))
    mb.poly(ca, mat, col, -d); mb.poly(cb, mat, col, d)

def rbox(mb, cx, cy, cz, lx, ly, lz, r, col, mat, n=3, ends=True):
    """A box along x with its four long edges rounded (radius r), centred at (cx, cy, cz)."""
    sec = []
    for (qy, qz, a0) in [(ly / 2 - r, lz / 2 - r, 0), (-ly / 2 + r, lz / 2 - r, 90), (-ly / 2 + r, -lz / 2 + r, 180), (ly / 2 - r, -lz / 2 + r, 270)]:
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n)
            sec.append((qy + r * math.cos(t), qz + r * math.sin(t)))
    A = [mb.vert((cx + lx / 2, cy + y, cz + z)) for y, z in sec]
    B = [mb.vert((cx - lx / 2, cy + y, cz + z)) for y, z in sec]
    N = len(sec)
    for k in range(N): mb.poly([A[k], A[(k + 1) % N], B[(k + 1) % N], B[k]], mat, col, lambda c: Vector((0, c.y - cy, c.z - cz)))
    if ends: mb.poly(A, mat, col, (1, 0, 0)); mb.poly(B, mat, col, (-1, 0, 0))

def mirror(mb, xtip, side):
    """Exterior rear-view mirror: an arm from the cab's top corner and a black housing."""
    base = Vector((xtip - 0.55, side * (HW - 0.02), 2.45))
    elbow = Vector((xtip - 0.30, side * (HW + 0.20), 2.48))
    bar(mb, base, elbow, 0.016, TRIM_C, MT)
    rbox(mb, xtip - 0.28, side * (HW + 0.24), 2.18, 0.10, 0.20, 0.42, 0.04, TRIM_C, MT, n=2)

def roof_pod(mb, cx, length, width=1.5, height=0.26):
    rbox(mb, cx, 0, ROOF - 0.03 + height / 2, length, width, height, 0.09, SILVER, MP, n=3)

# ------------------------------------------------------------------------------------------------ the pieces
def cab_piece():
    L = L_CAB
    mb = body(L, True, [CAB_DOOR], CAB_WINDOWS, [L - BOGIE_CAB])
    roof_pod(mb, -L / 2 + 3.6, 3.4)                       # traction / HVAC fairing over the rear half
    roof_pod(mb, L / 2 - 2.25, 0.9, width=1.1, height=0.16)
    return mb

def susp_piece():
    L = L_SUSP
    mb = body(L, False, SUSP_DOORS, SUSP_WINDOWS, [], side_display=SIDE_DISPLAY)
    roof_pod(mb, -L / 2 + 1.25, 1.6, width=1.3, height=0.18)   # pantograph base box (the pantograph is its own piece)
    return mb

def centre_piece():
    L = L_CEN
    mb = body(L, False, [], CEN_WINDOWS, [L / 2])
    roof_pod(mb, 0.0, 2.2, width=1.6, height=0.30)
    return mb

BELLOWS_HALF = 0.36
def bellows_piece():
    """Accordion bellows round the gangway, from x=-0.36 to +0.36 (it reaches into each body, hidden inside)."""
    mb = MB()
    prof = [(z, w - 0.07) for z, w in profile_rows() if Z_BOT + 0.07 < z]
    prof = [(0.30, HW - 0.09)] + [(z, w) for z, w in prof if z > 0.31 and w > 0.12][:-1] + [(ROOF - 0.08, 0.25)]
    ring = prof + [(z, -w) for z, w in reversed(prof)]
    nf = 9
    rings = []
    for k in range(nf * 2 + 1):
        x = -BELLOWS_HALF + 2 * BELLOWS_HALF * k / (nf * 2)
        inset = 0.0 if k % 2 == 0 else 0.03
        rings.append([mb.vert((x, (abs(w) - inset) * (1 if w >= 0 else -1), z - (inset if z > 2.5 else 0))) for z, w in ring])
    for k in range(len(rings) - 1):
        for i in range(len(ring) - 1):
            mb.poly([rings[k][i], rings[k + 1][i], rings[k + 1][i + 1], rings[k][i + 1]], MP, BELLOWS, lambda c: Vector((0, c.y, c.z - 1.7)))
    # the gangway floor plate under it (dark), so the joint never shows daylight from below
    a, b = mb.vert((-BELLOWS_HALF, HW - 0.09, 0.30)), mb.vert((BELLOWS_HALF, HW - 0.09, 0.30))
    c, d = mb.vert((BELLOWS_HALF, -HW + 0.09, 0.30)), mb.vert((-BELLOWS_HALF, -HW + 0.09, 0.30))
    mb.poly([a, b, c, d], MT, TRIM_C, (0, 0, -1))
    return mb

def cyl_x(mb, c, r, w, n, col, mat, axis="y"):
    """A wheel: a cylinder of radius r, width w along y, centred at c."""
    A = [mb.vert((c[0] + r * math.cos(2 * math.pi * k / n), c[1] + w / 2, c[2] + r * math.sin(2 * math.pi * k / n))) for k in range(n)]
    B = [mb.vert((c[0] + r * math.cos(2 * math.pi * k / n), c[1] - w / 2, c[2] + r * math.sin(2 * math.pi * k / n))) for k in range(n)]
    for k in range(n): mb.poly([A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]], mat, col, lambda p, c=c: Vector((p.x - c[0], 0, p.z - c[2])))
    mb.poly(A, mat, col, (0, 1, 0)); mb.poly(B, mat, col, (0, -1, 0))

def bogie_piece():
    mb = MB()
    steel = (0.06, 0.06, 0.065, 1)
    for x in (BOGIE_WB / 2, -BOGIE_WB / 2):
        for side in (1, -1):
            cyl_x(mb, (x, side * GAUGE / 2 + side * 0.035, WHEEL_R), WHEEL_R, 0.12, 14, steel, MT)
    for side in (1, -1):
        rbox(mb, 0, side * (GAUGE / 2 + 0.17), WHEEL_R + 0.05, BOGIE_WB + 0.75, 0.16, 0.34, 0.05, TRIM_C, MT, n=1)   # side frames
    rbox(mb, 0, 0, WHEEL_R + 0.02, 0.5, GAUGE + 0.2, 0.22, 0.04, TRIM_C, MT, n=1)                            # bolster
    return mb

def panto_piece():
    """Single-arm pantograph raised to the wire: origin at its base centre on the roof pod (z = 0 here = rail top)."""
    mb = MB()
    z0 = ROOF + 0.15
    for x, y in [(0.55, 0.45), (0.55, -0.45), (-0.55, 0.45), (-0.55, -0.45)]:     # insulators
        rbox(mb, x, y, z0 + 0.06, 0.08, 0.08, 0.12, 0.02, (0.35, 0.12, 0.08, 1), MT, n=1)
    for y in (0.45, -0.45): bar(mb, Vector((-0.6, y, z0 + 0.13)), Vector((0.6, y, z0 + 0.13)), 0.025, TRIM_C, MT)
    for x in (0.55, -0.55): bar(mb, Vector((x, 0.45, z0 + 0.13)), Vector((x, -0.45, z0 + 0.13)), 0.025, TRIM_C, MT)
    hinge = Vector((-0.45, 0, z0 + 0.18))
    head_z = WIRE - 0.04
    knee = Vector((0.95, 0, z0 + (head_z - z0) * 0.48))
    head = Vector((-0.30, 0, head_z - 0.12))
    for y in (0.22, -0.22): bar(mb, hinge + Vector((0, y, 0)), knee + Vector((0, y * 0.25, 0)), 0.03, TRIM_C, MT)     # lower arm (a frame)
    bar(mb, hinge + Vector((0.2, 0, 0)), knee, 0.012, TRIM_C, MT)                                                     # push rod
    for y in (0.06, -0.06): bar(mb, knee + Vector((0, y, 0)), head + Vector((0, y * 4, 0)), 0.02, TRIM_C, MT)          # upper arm
    for y in (0.3, -0.3): bar(mb, head + Vector((0, y, 0)), head + Vector((0, y, 0.10)), 0.012, TRIM_C, MT)           # head springs
    for dx in (0.12, -0.12):                                                                                           # two contact strips
        bar(mb, Vector((head.x + dx, -0.62, head_z)), Vector((head.x + dx, 0.62, head_z)), 0.025, TRIM_C, MT)
    for y in (0.62, -0.62):                                                                                            # the horns, bent down
        s = 1 if y > 0 else -1
        bar(mb, Vector((head.x, y, head_z)), Vector((head.x, y + s * 0.2, head_z - 0.12)), 0.015, TRIM_C, MT)
    bar(mb, Vector((head.x + 0.12, 0.3, head_z - 0.02)), Vector((head.x - 0.12, 0.3, head_z - 0.02)), 0.012, TRIM_C, MT)
    bar(mb, Vector((head.x + 0.12, -0.3, head_z - 0.02)), Vector((head.x - 0.12, -0.3, head_z - 0.02)), 0.012, TRIM_C, MT)
    return mb

PANTO_ON_SUSP = -L_SUSP / 2 + 1.25        # x of the pantograph base on the suspended module (section 2)

objs = {
    "Cab": to_object("Cab", cab_piece()),
    "Susp": to_object("Susp", susp_piece()),
    "Centre": to_object("Centre", centre_piece()),
    "Bellows": to_object("Bellows", bellows_piece(), sharp_deg=80),
    "Bogie": to_object("Bogie", bogie_piece(), sharp_deg=40),
    "Panto": to_object("Panto", panto_piece(), sharp_deg=40, merge=False),
}
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
counts = {k: tris(o) for k, o in objs.items()}
per_tram = 2 * counts["Cab"] + 2 * counts["Susp"] + counts["Centre"] + 4 * counts["Bellows"] + 3 * counts["Bogie"] + counts["Panto"]
print("TRAM tris", counts, "per tram", per_tram, flush=True)

# layout along the track, distances from the tram's front (nose tip), measured along it
layout = {
    "length": TOTAL, "width": W, "height": ROOF, "floor": FLOOR, "gap": GAP, "bellowsHalf": BELLOWS_HALF, "wire": WIRE,
    "modules": [
        {"piece": "Cab", "front": 0.0, "length": L_CAB, "bogie": L_CAB - BOGIE_CAB, "flip": False},
        {"piece": "Susp", "front": L_CAB, "length": L_SUSP, "bogie": None, "flip": False, "panto": PANTO_ON_SUSP},
        {"piece": "Centre", "front": L_CAB + L_SUSP, "length": L_CEN, "bogie": L_CEN / 2, "flip": False},
        {"piece": "Susp", "front": L_CAB + L_SUSP + L_CEN, "length": L_SUSP, "bogie": None, "flip": True},
        {"piece": "Cab", "front": TOTAL - L_CAB, "length": L_CAB, "bogie": BOGIE_CAB, "flip": True},
    ],
    "tris": counts, "trisPerTram": per_tram,
    "measured": "length 31.85 m, width 2.30 m, floor 0.35 m, 5 sections, 3 bogies (STIB via techno-science.net; railjournal.com)",
    "estimated": "height 3.30 m, module lengths, door / window / bogie positions, livery colours (sampled from photos), wheels, pantograph",
}
with open(os.path.join(OUT, "t3000.json"), "w") as f: json.dump(layout, f, indent=1)

for o in scn.objects: o.select_set(o.name in objs)
glb = os.path.join(OUT, "t3000.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("EXPORTED", glb, flush=True)

if not PREVIEW:
    sys.exit(0)
os.makedirs(PREVIEW, exist_ok=True)

# ------------------------------------------------------------------------------------------------ previews: a whole tram on a straight track
def place(name, x, flip=False):
    src = objs[name]
    o = src.copy(); o.data = src.data; o.hide_render = False; scn.collection.objects.link(o)
    o.location = (x, 0, 0); o.rotation_euler = (0, 0, math.pi if flip else 0)
    return o
for o in list(objs.values()): o.hide_render = True
for m in layout["modules"]:
    cx = -(m["front"] + m["length"] / 2)
    place(m["piece"], cx, m["flip"])
    if m["bogie"] is not None:
        bx = -(m["front"] + m["bogie"])
        place("Bogie", bx)
    if m.get("panto") is not None: place("Panto", cx + m["panto"])
for k in range(4):
    place("Bellows", -[L_CAB, L_CAB + L_SUSP, L_CAB + L_SUSP + L_CEN, TOTAL - L_CAB][k])
# the emissive display shows something in the preview
EMIT.node_tree.nodes["Principled BSDF"].inputs["Emission Strength"].default_value = 0.6

world = bpy.data.worlds.new("sky"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.25
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
gm = bpy.data.meshes.new("g"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(gm)
g = bpy.data.objects.new("ground", gm); scn.collection.objects.link(g); g.location = (-16, 0, 0)
g.data.materials.append(material("setts", (0.16, 0.15, 0.14), 0.85))
scn.render.engine = "CYCLES"; scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1280, 840
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam

def shot(fname, loc, look, lens=35):
    cam.location = Vector(loc); cam.data.lens = lens
    d = Vector(look) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, fname)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)

# 3/4 front like the 3097 photo (Grand Sablon), the front like 3025, a side view
shot("preview_34front.png", (6.5, -7.5, 1.6), (-6.0, 0.0, 1.6), lens=28)
shot("preview_front.png", (7.0, -2.2, 1.7), (0.0, 0.0, 1.5), lens=40)
shot("preview_side.png", (-16.0, -34.0, 2.0), (-16.0, 0.0, 1.6), lens=40)
shot("preview_top.png", (-9.0, -9.0, 9.5), (-6.0, 0.0, 2.6), lens=28)
print("DONE", PREVIEW, flush=True)
