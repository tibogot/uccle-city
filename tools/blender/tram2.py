"""THE STIB T3000, SECOND PASS (Bombardier Flexity Outlook "Cityrunner", 5 sections, 31.85 m): the tram of line 92
through Uccle (Commons photos of cars 3007, 3028, 3041, 3095, 3097, 3131, 3135 on line 92, 2015-2024; research and
licences: docs/tram2/RESEARCH.md, photos in data/raw/refs/tram/, never shipped). Built entirely in code, deterministic.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" -b --factory-startup -P tools/blender/tram2.py -- <out_dir> [--no-bake] [--preview <abs dir>]
      <out_dir>/t3000.glb      the pieces (below) + their "_far" variants, NAMED MATERIAL SLOTS (no colour in the file),
                               TEXCOORD_0 = metres (planar per face; the LED displays: 0..1 over the text area),
                               TEXCOORD_1 = the lightmap UV of the baked AO, COLOR_0 = door-leaf data (below)
      <out_dir>/t3000_ao.png   Cycles ambient occlusion of the whole assembled tram, baked into TEXCOORD_1 (1024 px)
      <out_dir>/t3000.json     layout the viewer needs (module lengths, pivots, bogies, pantograph, door leaves, slots)

What is new against tools/blender/tram.py (v1, kept for ?tram=v1): the real nose (raked windscreen and display band
under one glass, the silver hood, the gold panel with its corner lamp pods, the two-tier bumper), heights re-measured
on the photos (3041 / 3001 / 3097: hood 3.62 m, not 3.30; gold panel 0.79-1.38 m), windows with depth (black seals, 8 cm walls,
transom bars), see-through glass onto an interior (lining, floor, lit ceiling coves, wooden ceiling panels, brown
leather seats, grey poles, the driver's cab), plug doors that open (leaf data in COLOR_0), roof fairings with the
equipment well between them, pillow bogie skirts, ribbed bellows that the viewer bends, a better pantograph, mirrors
with the lower kerb mirror, marker lamps, panel grooves and bevelled module ends.

PIECES (Blender: X forward, Y left, Z up; glTF / three.js: +x forward, y up, +z right). Origin on the track centre
line at rail-top height: Cab (sections 1 / 5, origin mid nose-tip..pivot), Susp (2 / 4, hangs between pivots),
Centre (3), Bellows (x4, origin = pivot; the viewer bends it: a vertex at local x turns by angle * x / (2 * half)),
Bogie (x3), Panto (on section 2; the viewer stretches it vertically above PANTO_BASE so the head meets the wire).

COLOR_0 (door leaves only, else 0,0,0,1): r = slide direction (0.25 = toward -x, 0.75 = toward +x), g = slide
distance / 1 m, b = side (0.25 = +Y Blender = three.js -z = LEFT, 0.75 = RIGHT), a = 1.
MEASURED (published): length 31.85 m, width 2.30 m, floor 0.35 m, 5 sections, 3 bogies, 6 doors per side (2 single,
4 double, counted on the photos). ESTIMATED from the photos: heights, module lengths, openings, colours, roof equipment.
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else "tram2_out")
os.makedirs(OUT, exist_ok=True)
PREVIEW = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
BAKE = "--no-bake" not in ARGS
T0 = time.time()

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# ------------------------------------------------------------------------------------------------ dimensions (m)
W = 2.30; HW = W / 2; FLOOR = 0.35
L_CAB, L_SUSP, L_CEN = 8.825, 5.6, 3.0                 # pivot to pivot (cab: nose tip to pivot); sums to 31.85
GAP = 0.17                                             # body end to the articulation pivot
BOGIE_CAB = 2.05                                       # cab bogie centre from the cab's rear pivot
WHEEL_R, GAUGE, BOGIE_WB = 0.34, 1.435, 1.80
WIRE = 5.78                                            # contact wire above the rail top (viewer/tram.js: 5.8 above the road)
TOTAL = 2 * L_CAB + 2 * L_SUSP + L_CEN

Z_BOT = 0.24                                           # body bottom (side skirt line)
# HEIGHTS (docs/tram2/RESEARCH.md "Heights"): the T3000 is TALLER than v1 assumed (3.30 m). Scaled on the photos by
# three independent references (front width 2.30 m on 3041 / 3001, people beside 3001, the door sill 0.35 m on 3097):
# hood 3.62 m, side fairings 3.50 m, cantrail gold band 2.74-3.00 m, window band 1.14-2.74 m.
Z_DOOR0, Z_DOOR1 = 0.36, 2.74                          # door opening
Z_BAND0, Z_BAND1 = 1.14, 2.74                          # the black window band
Z_GL0, Z_GL1 = 1.20, 2.68                              # side glass
Z_TRANSOM = 2.32                                       # the hopper bar
Z_GOLD0, Z_GOLD1 = 2.74, 3.00                          # gold cantrail band
Z_SH, SH_R = 3.06, 0.42                                # roof shoulder arc
Z_FAIR, Z_DECK = 3.50, 3.34                            # roof fairing top, equipment deck between the fairings
Y_FAIR = HW - SH_R                                     # 0.73
CEIL = 2.98                                            # saloon ceiling crown
# the nose, bottom to top (3041 / 3001 front photos): bumper, its dark band, gold panel, windscreen, frame bar,
# display band (under the same glass), hood
NB0, NBD0, NBD1, NB1, NG0, NG1, NW0, NW1, ND0, NH0, NTOP = 0.22, 0.44, 0.58, 0.76, 0.79, 1.38, 1.42, 2.96, 3.00, 3.47, 3.58
TAPER = 0.06                                           # the nose narrows by this much a side toward the tip (aerial photo)
WALL = 0.08                                            # body wall thickness at the openings

# openings (start, end[, side]) from the module's front end; side +1 = left (Blender +Y), -1 = right, none = both.
# The cab is not mirror-symmetric (photos 3017 / 3029 right side, 3097 / 3095 / 3028 left side): a single leaf on its
# left, a double door on its right; the tram is symmetric by rotation (cab 5 = cab 1 turned round).
CAB_DOOR = (1.78, 2.58)
CAB_DOORS = [(1.78, 2.58, 1), (1.78, 3.08, -1)]
CAB_WINDOWS = [(2.78, 5.30, 1), (3.28, 5.30, -1), (5.42, 8.50)]
SUSP_DOORS = [(0.32, 1.62), (4.00, 5.30)]             # double doors
SUSP_WINDOWS = [(1.82, 3.80)]
CEN_WINDOWS = [(0.30, 2.70)]
SIDE_DISPLAY = (2.05, 3.55)
NOSE_LEN = 1.00
DETAIL = 2                                             # 2 full (LOD0 source), 1 mid (LOD1: no interior, opaque glass), 0 far
GLASS = lambda cab=False: S["GlassCab" if cab else "Glass"] if DETAIL == 2 else S["GlassFar"]

# ------------------------------------------------------------------------------------------------ material slots
# names read by viewer/tram2Model.js (colours / roughness live there, never in this file); preview colours only
SLOTS = [
    ("Silver", (0.40, 0.41, 0.43), 0.35, 0.6), ("Gold", (0.46, 0.28, 0.11), 0.35, 0.6), ("Black", (0.012, 0.013, 0.015), 0.25, 0.0),
    ("Bumper", (0.30, 0.31, 0.32), 0.5, 0.2), ("BumperDark", (0.05, 0.05, 0.055), 0.6, 0.0), ("Glass", (0.02, 0.025, 0.03), 0.05, 0.0),
    ("GlassCab", (0.01, 0.012, 0.014), 0.05, 0.0), ("Rubber", (0.01, 0.01, 0.011), 0.8, 0.0), ("Metal", (0.05, 0.05, 0.055), 0.55, 0.5),
    ("Bellows", (0.22, 0.23, 0.24), 0.8, 0.0), ("LampHead", (0.8, 0.8, 0.78), 0.1, 0.0), ("LampTail", (0.5, 0.02, 0.02), 0.15, 0.0),
    ("LampMarker", (0.7, 0.7, 0.7), 0.2, 0.0), ("Display", (0.01, 0.01, 0.01), 0.3, 0.0), ("Seat", (0.07, 0.025, 0.012), 0.45, 0.0),
    ("Lining", (0.45, 0.46, 0.46), 0.5, 0.0), ("Floor", (0.06, 0.06, 0.065), 0.7, 0.0), ("CeilingLight", (0.9, 0.88, 0.8), 0.3, 0.0),
    ("Pole", (0.55, 0.56, 0.57), 0.3, 0.6), ("Wood", (0.42, 0.26, 0.13), 0.55, 0.0), ("Console", (0.03, 0.03, 0.035), 0.6, 0.0),
    ("GlassFar", (0.02, 0.025, 0.03), 0.06, 0.0),          # the mid / far variants' glass: opaque, no interior behind
]
S = {name: i for i, (name, *_r) in enumerate(SLOTS)}
MATS = []
for name, rgb, rough, metal in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1); p.inputs["Roughness"].default_value = rough; p.inputs["Metallic"].default_value = metal
    if name in ("Glass", "GlassCab"):
        p.inputs["Alpha"].default_value = 0.45 if name == "Glass" else 0.7
    MATS.append(m)

# ------------------------------------------------------------------------------------------------ mesh builder
NODOOR = (0.0, 0.0, 0.0, 1.0)
class MB:
    """Vertices + polygons with a slot, optional explicit UVs (else planar metres) and a door code per polygon.
    `out` orients a polygon: its normal is flipped to point along `out` (a vector or a callable of the centroid)."""
    def __init__(self): self.v, self.f = [], []
    def vert(self, p): self.v.append(tuple(p)); return len(self.v) - 1
    def poly(self, idx, slot, out=None, uv=None, door=NODOOR):
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
        self.f.append((list(idx), slot, uv, door))
    def merge(self, o):
        n = len(self.v); self.v += o.v
        for idx, s, uv, d in o.f: self.f.append(([i + n for i in idx], s, uv, d))

ZUP = Vector((0, 0, 1))
def planar_uv(pts, n):
    """UV in metres on the face's plane (as tools/blender/stjob.py)."""
    if abs(n.z) < 0.75:
        t = ZUP.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = ZUP
    else:
        t = ZUP.cross(n); t = t.normalized() if t.length > 1e-4 else Vector((1, 0, 0)); b = n.cross(t).normalized()
    return [(p.dot(t), p.dot(b)) for p in pts]

def to_object(name, mb, sharp_deg=34, merge=True):
    bm = bmesh.new()
    vs = [bm.verts.new(p) for p in mb.v]
    col = bm.loops.layers.float_color.new("Col")
    uvl = bm.loops.layers.uv.new("UVMap")
    for idx, s, uv, door in mb.f:
        try: f = bm.faces.new([vs[i] for i in idx])
        except ValueError: continue
        f.material_index = s
        if uv is None:
            pts = [Vector(mb.v[i]) for i in idx]
            n = Vector((0, 0, 0))
            for k in range(len(pts)): n += pts[k].cross(pts[(k + 1) % len(pts)])
            uv = planar_uv(pts, n.normalized() if n.length > 1e-9 else ZUP)
        for k, l in enumerate(f.loops):
            l[col] = door
            l[uvl].uv = uv[k]
    if merge: bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0004)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    for m in MATS: o.data.materials.append(m)
    for p in o.data.polygons: p.use_smooth = True
    o.data.set_sharp_from_angle(angle=math.radians(sharp_deg))
    return o

def quad(mb, a, b, c, d, slot, out=None, door=NODOOR):
    mb.poly([mb.vert(a), mb.vert(b), mb.vert(c), mb.vert(d)], slot, out, None, door)

def box(mb, cx, cy, cz, lx, ly, lz, slot, faces="all"):
    x0, x1, y0, y1, z0, z1 = cx - lx / 2, cx + lx / 2, cy - ly / 2, cy + ly / 2, cz - lz / 2, cz + lz / 2
    F = {"+x": [(x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)], "-x": [(x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)],
         "+y": [(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], "-y": [(x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)],
         "+z": [(x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)], "-z": [(x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)]}
    D = {"+x": (1, 0, 0), "-x": (-1, 0, 0), "+y": (0, 1, 0), "-y": (0, -1, 0), "+z": (0, 0, 1), "-z": (0, 0, -1)}
    for k, pts in F.items():
        if faces == "all" or k in faces: quad(mb, *pts, slot, D[k])

def rbox(mb, cx, cy, cz, lx, ly, lz, r, slot, n=3, ends=True, top_slot=None):
    """A box along x with its four long edges rounded (radius r)."""
    sec = []
    for (qy, qz, a0) in [(ly / 2 - r, lz / 2 - r, 0), (-ly / 2 + r, lz / 2 - r, 90), (-ly / 2 + r, -lz / 2 + r, 180), (ly / 2 - r, -lz / 2 + r, 270)]:
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / max(n, 1)) if n else math.radians(a0 + 45)
            rr = r if n else r * math.sqrt(2)
            sec.append((qy + rr * math.cos(t), qz + rr * math.sin(t)))
            if not n: break
    A = [mb.vert((cx + lx / 2, cy + y, cz + z)) for y, z in sec]
    B = [mb.vert((cx - lx / 2, cy + y, cz + z)) for y, z in sec]
    N = len(sec)
    for k in range(N):
        zc = (sec[k][1] + sec[(k + 1) % N][1]) / 2
        s = top_slot if (top_slot is not None and zc > lz / 2 - r * 0.3) else slot
        mb.poly([A[k], A[(k + 1) % N], B[(k + 1) % N], B[k]], s, lambda c: Vector((0, c.y - cy, c.z - cz)))
    if ends: mb.poly(A, slot, (1, 0, 0)); mb.poly(B, slot, (-1, 0, 0))

def bar(mb, a, b, r, slot, n=4, caps=True):
    """A tube from a to b (n sides)."""
    a, b = Vector(a), Vector(b)
    d = (b - a).normalized()
    u = d.cross(ZUP)
    if u.length < 1e-3: u = d.cross(Vector((1, 0, 0)))
    u.normalize(); v = d.cross(u).normalized()
    ang = [2 * math.pi * (k + 0.5) / n for k in range(n)]
    ca = [mb.vert(a + (u * math.cos(t) + v * math.sin(t)) * r) for t in ang]
    cb = [mb.vert(b + (u * math.cos(t) + v * math.sin(t)) * r) for t in ang]
    m = (a + b) / 2
    for k in range(n): mb.poly([ca[k], ca[(k + 1) % n], cb[(k + 1) % n], cb[k]], slot, lambda c, m=m, d=d: (c - m) - d * (c - m).dot(d))
    if caps: mb.poly(ca, slot, -d); mb.poly(cb, slot, d)

def cyl_y(mb, c, r, w, n, slot, caps=True):
    """A cylinder of radius r, axis along Y, width w, centred at c."""
    A = [mb.vert((c[0] + r * math.cos(2 * math.pi * k / n), c[1] + w / 2, c[2] + r * math.sin(2 * math.pi * k / n))) for k in range(n)]
    B = [mb.vert((c[0] + r * math.cos(2 * math.pi * k / n), c[1] - w / 2, c[2] + r * math.sin(2 * math.pi * k / n))) for k in range(n)]
    for k in range(n): mb.poly([A[k], A[(k + 1) % n], B[(k + 1) % n], B[k]], slot, lambda p, c=c: Vector((p.x - c[0], 0, p.z - c[2])))
    if caps: mb.poly(A, slot, (0, 1, 0)); mb.poly(B, slot, (0, -1, 0))

# ------------------------------------------------------------------------------------------------ the cross-section
def arc_rows(n):
    out = []
    for k in range(1, n + 1):
        t = math.radians(90 * k / n)
        out.append((Z_SH + SH_R * math.sin(t), HW - SH_R + SH_R * math.cos(t)))
    return out

def profile_rows(extra=(), roof=True):
    """Half cross-section (z, half width) from the bottom to the fairing top, then (roof=True) into the equipment
    well and to the centre of the deck. `extra` adds rows in the vertical part."""
    rows = [(Z_BOT, HW - 0.07), (0.27, HW - 0.03), (0.31, HW - 0.008)] if DETAIL else [(Z_BOT, HW - 0.06)]
    flat = set([Z_DOOR0, Z_BAND0, Z_GL0, Z_GL1, Z_BAND1, Z_GOLD1, Z_SH] + [z for z in extra if Z_DOOR0 < z < Z_SH])
    if DETAIL: flat |= {0.95, 0.958, 0.966, Z_TRANSOM, Z_TRANSOM + 0.03}
    for z in sorted(flat):
        w = HW - (0.004 if DETAIL and 0.957 < z < 0.967 else 0)        # the groove under the window band
        rows.append((z, w))
    rows += arc_rows((2, 3, 5)[DETAIL])
    if roof:
        rows += [(Z_FAIR, Y_FAIR - 0.03), (Z_FAIR - 0.02, Y_FAIR - 0.07), (Z_DECK, Y_FAIR - 0.10), (Z_DECK, 0.0)]
    return rows

def on(lst, side):
    """The openings of a list on one side."""
    return [(o[0], o[1]) for o in lst if len(o) < 3 or o[2] == side]

def side_slot(z):
    if z < Z_BAND0: return S["Silver"]
    if z < Z_BAND1: return S["Black"]
    if z < Z_GOLD1: return S["Gold"]
    return S["Silver"]

# ------------------------------------------------------------------------------------------------ one module body
def body(length, cab, doors, windows, bogies, side_display=None):
    """The shell of one module (origin mid-length; the cab from the nose tip to its rear pivot), its openings with
    their reveals, glass and door leaves, the bogie skirts, the interior (DETAIL 2) and the nose (cab)."""
    mb = MB()
    xF = length / 2
    X = lambda f: xF - f
    rows = profile_rows()
    f_start = CAB_DOOR[0] if cab else GAP
    fs = {f_start, length - GAP}
    if DETAIL:
        for o in list(doors) + list(windows): fs.update([o[0], o[1]])
        fs.update([length - GAP - 0.03, length - GAP - 0.09])
        if not cab: fs.update([GAP + 0.03, GAP + 0.09])
    fs = sorted(f for f in fs if f_start <= f <= length - GAP)
    is_end = lambda f: f >= length - GAP - 1e-6 or (not cab and f <= GAP + 1e-6)
    near_end = lambda f: (f >= length - GAP - 0.031) or (not cab and f <= GAP + 0.031)
    axis = lambda c: Vector((max(min(c.x, xF - 0.8), -xF + 0.8), 0, min(max(c.z, 1.0), 2.6)))
    out_of = lambda c: c - axis(c)
    def in_rect(f, z, rects, z0, z1): return any(a <= f <= b for a, b in rects) and z0 <= z <= z1
    all_doors, all_windows = doors, windows
    for side in (1, -1):
        doors, windows = on(all_doors, side), on(all_windows, side)
        grid = []
        for f in fs:
            pull = 0.035 if is_end(f) else (0.010 if DETAIL and near_end(f) else 0.0)     # bevelled module ends
            col = []
            for z, w in rows:
                ww = max(w - pull, 0) if w > 0.3 else w
                zz = z - (pull * 0.7 if z > Z_FAIR - 0.05 or (w < 0.66 and z > Z_DECK - 0.01) else 0)
                col.append(mb.vert((X(f), side * ww, zz)))
            grid.append(col)
        for i in range(len(fs) - 1):
            fc = (fs[i] + fs[i + 1]) / 2
            for j in range(len(rows) - 1):
                zc = (rows[j][0] + rows[j + 1][0]) / 2
                slot = side_slot(zc)
                if rows[j][1] < HW - 0.2 and rows[j + 1][1] < HW - 0.2: slot = S["Silver"]
                if DETAIL:
                    if in_rect(fc, zc, doors, Z_DOOR0, Z_DOOR1): continue
                    if in_rect(fc, zc, windows, Z_GL0, Z_GL1): continue
                else:
                    if in_rect(fc, zc, doors, Z_DOOR0, Z_DOOR1): slot = S["Silver"] if not (Z_GL0 + 0.1 < zc < Z_GL1) else S["GlassFar"]
                    if in_rect(fc, zc, windows, Z_GL0, Z_GL1): slot = S["GlassFar"]
                mb.poly([grid[i][j], grid[i + 1][j], grid[i + 1][j + 1], grid[i][j + 1]], slot, out_of)
        if cab: zone_a(mb, xF, side, out_of)
    # underside
    fu = ([NOSE_LEN] if cab else []) + fs
    for i in range(len(fu) - 1):
        quad(mb, (X(fu[i]), HW - 0.07, Z_BOT), (X(fu[i + 1]), HW - 0.07, Z_BOT), (X(fu[i + 1]), -HW + 0.07, Z_BOT), (X(fu[i]), -HW + 0.07, Z_BOT), S["Rubber"], (0, 0, -1))
    # joint end walls: the closed cross-section at the pivot ends (the bellows cover them)
    for f in ([length - GAP] + ([] if cab else [GAP])):
        ring = [(max(w - 0.035, 0) if w > 0.3 else w, z - (0.035 * 0.7 if z > Z_FAIR - 0.05 or (w < 0.66 and z > Z_DECK - 0.01) else 0)) for z, w in rows]
        ring = ring + [(-y, z) for y, z in reversed(ring[:-1])]
        c = mb.vert((X(f), 0, 1.7))
        vv = [mb.vert((X(f), y, z)) for y, z in ring]
        sgn = -1 if f > length / 2 else 1
        for k in range(len(vv) - 1): mb.poly([c, vv[k], vv[k + 1]], S["Rubber"], (sgn, 0, 0))
    if DETAIL:
        for side in (1, -1):
            for a, b in on(all_windows, side): window(mb, X(a), X(b), (side,))
            for a, b in on(all_doors, side): door(mb, X(a), X(b), (side,))
        if DETAIL == 2: interior(mb, length, cab, all_doors, all_windows, X)
        if side_display: side_disp(mb, X(side_display[0]), X(side_display[1]))
    for x in bogies: skirt(mb, X(x))
    if cab: nose(mb, xF)
    return mb

def sweep_x(z):
    """The cab's gold sweep: distance from the nose tip of its front edge at height z (from the gold nose panel's
    side up and back to the cantrail band)."""
    t = min(max((z - NG1) / (Z_GOLD0 - NG1), 0.0), 1.0)
    return 1.04 + 0.60 * (1 - (1 - t) ** 1.7)
SWEEP_W = 0.12

def zone_a(mb, xtip, side, out_of):
    """The cab side from the nose region to the door: three columns, the middle one IS the gold sweep. Ahead of it
    the windscreen's side wrap (cab glass) and the display wrap (black); behind it the black driver's window panel."""
    step = (0.12, 0.2, 0.35)[2 - DETAIL]
    extra = [NB1, NG0, NG1, NW0] + [round(NW0 + step * k, 3) for k in range(int((Z_GOLD0 - NW0) / step) + 1)]
    rows = profile_rows(extra, roof=False)
    rows = rows + [(Z_FAIR, Y_FAIR - 0.03)]
    f_end = CAB_DOOR[0]
    def cols(z):
        zz = min(max(z, NG1), Z_GOLD0)
        a = sweep_x(zz)
        return [NOSE_LEN, a, a + SWEEP_W, f_end]
    grid = [[mb.vert((xtip - f, side * w, z)) for f in cols(z)] for z, w in rows]
    for j in range(len(rows) - 1):
        zc = (rows[j][0] + rows[j + 1][0]) / 2
        for i in range(3):
            slot = side_slot(zc)
            if i == 0:
                if zc < NB1: slot = S["Bumper"]
                elif zc < NG0: slot = S["Rubber"]
                elif zc < NG1: slot = S["Gold"]
                elif zc < NW0: slot = S["Black"]
                elif zc < Z_BAND1: slot = GLASS(True)
                elif zc < Z_SH + 0.15: slot = S["Silver"]
                else: slot = S["Silver"]
            elif i == 1:
                if NG0 <= zc < Z_GOLD1: slot = S["Gold"]
            else:
                if NG0 <= zc < NG1: slot = S["Gold"]
            mb.poly([grid[j][i], grid[j][i + 1], grid[j + 1][i + 1], grid[j + 1][i]], slot, out_of)
    # the roof well's front wall behind the nose hood (the nose caps the roof up to NOSE_LEN)
    x0 = xtip - NOSE_LEN
    if side > 0:
        quad(mb, (x0, Y_FAIR - 0.03, Z_FAIR), (x0, -(Y_FAIR - 0.03), Z_FAIR), (x0, -(Y_FAIR - 0.10), Z_DECK), (x0, Y_FAIR - 0.10, Z_DECK), S["Silver"], (-1, 0, 0))

def reveal(mb, xa, xb, z0, z1, d0, d1, slot, sides=(1, -1)):
    """The four inner faces of an opening on the given sides, from depth d0 to d1 (from the outer surface)."""
    for side in sides:
        y0, y1 = side * (HW - d0), side * (HW - d1)
        cx, cz = (xa + xb) / 2, (z0 + z1) / 2
        for (pa, pb) in [((xa, z0), (xb, z0)), ((xb, z0), (xb, z1)), ((xb, z1), (xa, z1)), ((xa, z1), (xa, z0))]:
            q = [(pa[0], y0, pa[1]), (pb[0], y0, pb[1]), (pb[0], y1, pb[1]), (pa[0], y1, pa[1])]
            quad(mb, *q, slot, lambda c, cx=cx, cz=cz: Vector((cx - c.x, 0, cz - c.z)))

def window(mb, xa, xb, sides=(1, -1)):
    """Glass 3 cm in (black seal ahead of it), a 2nd glass face looking in, the lining reveal behind, transom bar."""
    reveal(mb, xa, xb, Z_GL0, Z_GL1, 0.0, 0.03, S["Rubber"], sides)
    if DETAIL == 2: reveal(mb, xa, xb, Z_GL0, Z_GL1, 0.035, WALL, S["Lining"], sides)
    for side in sides:
        for d, o in (((0.03, side), (0.035, -side)) if DETAIL == 2 else ((0.03, side),)):
            y = side * (HW - d)
            quad(mb, (xa, y, Z_GL0), (xb, y, Z_GL0), (xb, y, Z_GL1), (xa, y, Z_GL1), GLASS(), (0, o, 0))
        # transom (the hopper's bottom bar) and a vertical bar on the long windows, just proud of the glass
        y = side * (HW - 0.026)
        quad(mb, (xa, y, Z_TRANSOM), (xb, y, Z_TRANSOM), (xb, y, Z_TRANSOM + 0.035), (xa, y, Z_TRANSOM + 0.035), S["Black"], (0, side, 0))
        xm = (xa + xb) / 2
        if abs(xa - xb) > 2.2:
            quad(mb, (xm + 0.02, y, Z_GL0), (xm - 0.02, y, Z_GL0), (xm - 0.02, y, Z_GL1), (xm + 0.02, y, Z_GL1), S["Black"], (0, side, 0))

def stadium(cx, cz, w, h, n):
    r = w / 2; hh = h / 2 - r
    pts = []
    for k in range(n):
        t = 2 * math.pi * k / n
        dx, dz = math.cos(t), math.sin(t)
        pts.append((cx + r * dx, cz + (hh if dz >= 0 else -hh) + r * dz))
    return pts

def door(mb, xa, xb, sides=(1, -1)):
    """A plug-door opening from xa (front) to xb: the frame (reveal through the wall), a step plate, and one leaf
    (< 1 m) or two. Each leaf: 3 cm thick, silver outside, lining inside, a tall stadium window with see-through glass
    in a black seal; its vertices carry the slide code (COLOR_0) the viewer opens it with."""
    reveal(mb, xa, xb, Z_DOOR0, Z_DOOR1, 0.0, WALL, S["Black"], sides)
    n_leaf = 1 if abs(xa - xb) < 1.0 else 2
    lw = (xa - xb) / n_leaf
    N = 20 if DETAIL == 2 else 8
    for side in sides:
        quad(mb, (xa, side * (HW + 0.004), Z_DOOR0 - 0.03), (xb, side * (HW + 0.004), Z_DOOR0 - 0.03),
             (xb, side * (HW - WALL), Z_DOOR0), (xa, side * (HW - WALL), Z_DOOR0), S["Metal"], (0, 0, 1))      # step plate
        for k in range(n_leaf):
            la, lb = xa - k * lw - 0.004, xa - (k + 1) * lw + 0.004
            if n_leaf == 1: sdir = -1                                       # the single cab door slides back
            else: sdir = 1 if k == 0 else -1                               # double doors part from the middle
            code = (0.75 if sdir > 0 else 0.25, abs(lw) - 0.02, 0.75 if side < 0 else 0.25, 1.0)
            yo, yi = side * (HW - 0.002), side * (HW - 0.032)
            cx, cz = (la + lb) / 2, (Z_DOOR0 + Z_DOOR1) / 2 + 0.10
            gw, gh = abs(la - lb) * 0.56, 1.55
            inner = stadium(cx, cz, gw, gh, N)
            outer = []
            for (px, pz) in inner:
                dx, dz = px - cx, pz - cz
                sx = (abs(la - lb) / 2) / max(abs(dx), 1e-6)
                sz = ((Z_DOOR1 - 0.004) - cz) / dz if dz > 0 else ((Z_DOOR0 + 0.004) - cz) / dz if dz < 0 else 1e9
                s = min(sx, sz)
                outer.append((cx + dx * s, cz + dz * s))
            for (qx, qz) in [(la, Z_DOOR1 - 0.004), (lb, Z_DOOR1 - 0.004), (lb, Z_DOOR0 + 0.004), (la, Z_DOOR0 + 0.004)]:
                kk = min(range(N), key=lambda i: (outer[i][0] - qx) ** 2 + (outer[i][1] - qz) ** 2)
                outer[kk] = (qx, qz)
            for y, o, slot in (((yo, side, S["Silver"]), (yi, -side, S["Lining"])) if DETAIL == 2 else ((yo, side, S["Silver"]),)):
                vi = [mb.vert((px, y, pz)) for px, pz in inner]
                vo = [mb.vert((px, y, pz)) for px, pz in outer]
                for i in range(N): mb.poly([vo[i], vo[(i + 1) % N], vi[(i + 1) % N], vi[i]], slot, (0, o, 0), None, code)
            # seal round the glass (through the leaf) and the glass, both faces
            gi = [mb.vert((px, side * (HW - 0.014), pz)) for px, pz in inner]
            go = [mb.vert((px, yo, pz)) for px, pz in inner]
            gb = [mb.vert((px, yi, pz)) for px, pz in inner]
            for i in range(N):
                mb.poly([go[i], go[(i + 1) % N], gi[(i + 1) % N], gi[i]], S["Rubber"], lambda c, cx=cx, cz=cz: Vector((cx - c.x, 0, cz - c.z)), None, code)
                mb.poly([gi[i], gi[(i + 1) % N], gb[(i + 1) % N], gb[i]], S["Rubber"], lambda c, cx=cx, cz=cz: Vector((cx - c.x, 0, cz - c.z)), None, code)
            mb.poly([mb.vert((px, side * (HW - 0.014), pz)) for px, pz in inner], GLASS(), (0, side, 0), None, code)
            if DETAIL == 2: mb.poly([mb.vert((px, side * (HW - 0.018), pz)) for px, pz in inner], S["Glass"], (0, -side, 0), None, code)
            # leaf edges (black rubber)
            for (p0, p1) in [((la, Z_DOOR0 + 0.004), (lb, Z_DOOR0 + 0.004)), ((lb, Z_DOOR0 + 0.004), (lb, Z_DOOR1 - 0.004)),
                             ((lb, Z_DOOR1 - 0.004), (la, Z_DOOR1 - 0.004)), ((la, Z_DOOR1 - 0.004), (la, Z_DOOR0 + 0.004))]:
                mb.poly([mb.vert((p0[0], yo, p0[1])), mb.vert((p1[0], yo, p1[1])), mb.vert((p1[0], yi, p1[1])), mb.vert((p0[0], yi, p0[1]))],
                        S["Rubber"], lambda c, cx=cx, cz=cz: Vector((c.x - cx, 0, c.z - cz)), None, code)
            # a small push button (green) is too small; the door-open lamp above the door (red) is on the band
        # door indicator lamp above the opening
        xm = (xa + xb) / 2
        lamp_disc(mb, Vector((xm, side * (HW + 0.002), Z_DOOR1 + 0.07)), Vector((0, side, 0)), 0.022, S["LampTail"], 8)

def lamp_disc(mb, c, nrm, r, slot, n=10, rim=None):
    nrm = Vector(nrm).normalized()
    u = ZUP if abs(nrm.z) < 0.9 else Vector((1, 0, 0))
    v = nrm.cross(u).normalized(); u = v.cross(nrm).normalized()
    ring = [mb.vert(c + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * r) for k in range(n)]
    mb.poly(ring, slot, nrm)
    if rim is not None:
        back = [mb.vert(c - nrm * 0.015 + (u * math.cos(2 * math.pi * k / n) + v * math.sin(2 * math.pi * k / n)) * (r + rim)) for k in range(n)]
        for k in range(n): mb.poly([ring[k], ring[(k + 1) % n], back[(k + 1) % n], back[k]], S["Rubber"], lambda cc, c=c: cc - c + nrm * 0.02)

def rounded_rect(cx, cz, l, h, r, n=4):
    pts = []
    for (qx, qz, a0) in [(cx + l / 2 - r, cz + h / 2 - r, 0), (cx - l / 2 + r, cz + h / 2 - r, 90), (cx - l / 2 + r, cz - h / 2 + r, 180), (cx + l / 2 - r, cz - h / 2 + r, 270)]:
        for k in range(n + 1):
            t = math.radians(a0 + 90 * k / n)
            pts.append((qx + r * math.cos(t), qz + r * math.sin(t)))
    return pts

def skirt(mb, x):
    """The pillow-shaped bogie cover on both sides over a bogie: three rings, each smaller and further out."""
    n = 5 if DETAIL else 2
    rings = [(1.0, 0.0), (0.97, 0.03), (0.90, 0.05)] if DETAIL else [(1.0, 0.0), (0.92, 0.045)]
    for side in (1, -1):
        prev = None
        for k, (s, out) in enumerate(rings):
            pts = rounded_rect(x, 0.40, 1.95 * s, 0.56 * s - (0.0 if k == 0 else 0.0), 0.22 * s, n)
            ring = [mb.vert((px, side * (HW - 0.012 + out), pz)) for px, pz in pts]
            if prev:
                m = len(ring)
                for i in range(m): mb.poly([prev[i], prev[(i + 1) % m], ring[(i + 1) % m], ring[i]], S["Silver"], lambda c, x=x, side=side: Vector((c.x - x, side * 1.5, c.z - 0.40)))
            prev = ring
        mb.poly(prev, S["Silver"], (0, side, 0))
        if DETAIL:   # the dark gap under the cover, toward the wheel
            pts = rounded_rect(x, 0.40, 1.95, 0.56, 0.22, n)
            low = [p for p in pts if p[1] < 0.30]

def side_disp(mb, xa, xb):
    """Side destination display at the top of the suspended module's window, behind the glass; UV 0..1."""
    z0, z1 = 2.27, 2.47
    for side in (1, -1):
        y = side * (HW - 0.027)                       # (just in front of the glass: the far LODs' glass is opaque)
        uv = [(0, 0), (1, 0), (1, 1), (0, 1)] if side > 0 else [(1, 0), (0, 0), (0, 1), (1, 1)]
        idx = [mb.vert((xa, y, z0)), mb.vert((xb, y, z0)), mb.vert((xb, y, z1)), mb.vert((xa, y, z1))]
        pts = [Vector(mb.v[i]) for i in idx]
        nrm = (pts[1] - pts[0]).cross(pts[2] - pts[1])
        if nrm.y * side < 0: idx, uv = list(reversed(idx)), list(reversed(uv))
        mb.f.append((idx, S["Display"], uv, NODOOR))
        # its dark housing behind
        yb = side * (HW - 0.12)
        quad(mb, (xa + 0.02, y * 0.999, z0 - 0.02), (xb - 0.02, y * 0.999, z0 - 0.02), (xb - 0.02, yb, z0 - 0.02), (xa + 0.02, yb, z0 - 0.02), S["Console"], (0, 0, -1))

# ------------------------------------------------------------------------------------------------ interior
def interior(mb, length, cab, doors, windows, X):
    """Lining (walls with the openings, coves with light strips and wooden panels, ceiling), floor, end walls, seats,
    poles, and the driver's cab. Seen through the glass; never casts much (the viewer may skip its shadow)."""
    f0 = (NOSE_LEN + 0.75) if cab else GAP + 0.02
    f1 = length - GAP - 0.02
    yi = HW - WALL
    stations = sorted(set([f0, f1] + [v for o in list(doors) + list(windows) for v in (o[0], o[1]) if f0 < v < f1]))
    zr = [FLOOR, Z_GL0, Z_GL1]
    cove = [(Z_GL1, yi), (Z_DOOR1 + 0.02, yi - 0.02), (2.80, yi - 0.12), (2.86, yi - 0.30), (2.88, yi - 0.38), (2.92, yi - 0.50), (CEIL, 0.0)]
    cove_slot = [S["Lining"], S["Wood"], S["Wood"], S["CeilingLight"], S["Lining"], S["Lining"]]
    for side in (1, -1):
        ds, ws = on(doors, side), on(windows, side)
        def opening(fc, zc):
            return any(a <= fc <= b for a, b in ws) and Z_GL0 <= zc <= Z_GL1 or any(a <= fc <= b for a, b in ds) and zc <= Z_DOOR1
        for i in range(len(stations) - 1):
            fa, fb = stations[i], stations[i + 1]
            fc = (fa + fb) / 2
            for j in range(len(zr) - 1):
                if opening(fc, (zr[j] + zr[j + 1]) / 2): continue
                quad(mb, (X(fa), side * yi, zr[j]), (X(fb), side * yi, zr[j]), (X(fb), side * yi, zr[j + 1]), (X(fa), side * yi, zr[j + 1]), S["Lining"], (0, -side, 0))
            if any(a <= fc <= b for a, b in ds):       # above the doors, the wall continues from the door head
                quad(mb, (X(fa), side * yi, Z_DOOR1), (X(fb), side * yi, Z_DOOR1), (X(fb), side * yi, Z_GL1), (X(fa), side * yi, Z_GL1), S["Lining"], (0, -side, 0))
        # cove + ceiling, along the whole saloon
        xa, xb = X(f0), X(f1)
        for k in range(len(cove) - 1):
            (za, ya), (zb, yb) = cove[k], cove[k + 1]
            quad(mb, (xa, side * ya, za), (xb, side * ya, za), (xb, side * yb, zb), (xa, side * yb, zb), cove_slot[k], lambda c: Vector((0, -c.y, 1.6 - c.z)))
        bar(mb, (xa - 0.05, side * (yi - 0.28), 2.50), (xb + 0.05, side * (yi - 0.28), 2.50), 0.018, S["Pole"], 6, False)    # grab rail
        # seats in this side's window bays (+Y: double seats, -Y: singles), rows facing each other in pairs
        width = 0.92 if side > 0 else 0.46
        for a, b in [(a + 0.15, b - 0.15) for a, b in ws]:
            n = max(1, int((b - a) / 0.78))
            pitch = (b - a) / n
            for k in range(n):
                fc = a + pitch * (k + 0.5)
                seat(mb, X(fc), side * (yi - 0.02 - width / 2), width, 1 if k % 2 == 0 else -1)
            for k in range(1, n, 2):                     # a pole on the aisle side between the pairs
                fc = a + pitch * k
                yy = side * (yi - width - 0.06)
                bar(mb, (X(fc), yy, FLOOR), (X(fc), yy, 2.54), 0.017, S["Pole"], 6, False)
        for a, b in ds:                                  # poles at the doors
            for f in (a + 0.12, b - 0.12):
                bar(mb, (X(f), side * (yi - 0.10), FLOOR + 0.05), (X(f), side * (yi - 0.10), 2.54), 0.017, S["Pole"], 6, False)
    # floor and the ends of the saloon
    quad(mb, (X(f0), yi, FLOOR), (X(f1), yi, FLOOR), (X(f1), -yi, FLOOR), (X(f0), -yi, FLOOR), S["Floor"], (0, 0, 1))
    for f, sgn in ((f1, 1), (f0, -1)):
        x = X(f)
        prof = [(FLOOR, yi), (Z_GL1, yi)] + cove[1:]
        ring = prof + [(z, -y) for z, y in reversed(prof[:-1])]
        c = mb.vert((x, 0, 1.4))
        vv = [mb.vert((x, y, z)) for z, y in ring]
        for k in range(len(vv) - 1): mb.poly([c, vv[k], vv[k + 1]], S["Lining"], (sgn, 0, 0))
        if not (cab and f == f0):      # the gangway: a dark arch in the end wall
            quad(mb, (x - sgn * 0.005, 0.62, FLOOR), (x - sgn * 0.005, -0.62, FLOOR), (x - sgn * 0.005, -0.62, 2.50), (x - sgn * 0.005, 0.62, 2.50), S["Console"], (-sgn, 0, 0))
    if cab: drivers_cab(mb, X)

def seat(mb, x, y, width, face):
    """A leather seat (pan + back + grab handle) on a grey plinth; face = +1 looks toward +x."""
    d = 0.46
    box(mb, x, y, FLOOR + 0.22, d - 0.08, width - 0.04, 0.44, S["Lining"], ("+x", "-x", "+y", "-y", "+z"))
    box(mb, x + face * 0.02, y, FLOOR + 0.47, d, width, 0.08, S["Seat"], ("+x", "-x", "+y", "-y", "+z"))
    bx = x - face * (d / 2 - 0.04)
    a = Vector((bx, y, FLOOR + 0.50)); b = Vector((bx - face * 0.08, y, FLOOR + 1.08))
    t = (b - a).normalized()
    nrm = Vector((face, 0, 0)).cross(Vector((0, 1, 0)))
    for s in (1, -1):
        pass
    # backrest: a slab from a to b, 7 cm thick
    hw = width / 2
    n = Vector((face * t.z, 0, -face * t.x)).normalized() * 0.07
    P = [a + Vector((0, -hw, 0)), a + Vector((0, hw, 0)), b + Vector((0, hw, 0)), b + Vector((0, -hw, 0))]
    Q = [p - n for p in P]
    quad(mb, *P, S["Seat"], Vector((face, 0, 0)))
    quad(mb, *Q, S["Seat"], Vector((-face, 0, 0)))
    quad(mb, P[2], P[3], Q[3], Q[2], S["Seat"], (0, 0, 1))
    quad(mb, P[1], P[2], Q[2], Q[1], S["Seat"], (0, 1, 0))
    quad(mb, P[3], P[0], Q[0], Q[3], S["Seat"], (0, -1, 0))
    if DETAIL == 2:
        hb = b - n * 0.5 + Vector((0, 0, 0.06))
        bar(mb, hb + Vector((0, -hw + 0.06, 0)), hb + Vector((0, hw - 0.06, 0)), 0.014, S["Console"], 4, False)

def drivers_cab(mb, X):
    """Behind the windscreen: the partition, the console, the seat (dark), seen through the cab glass."""
    xt = X(0)
    xp = xt - (NOSE_LEN + 0.75)                          # partition
    yi = HW - 0.11
    quad(mb, (xp, yi, FLOOR), (xp, -yi, FLOOR), (xp, -yi, 2.80), (xp, yi, 2.80), S["Console"], (1, 0, 0))
    for side in (1, -1):                                 # cab side walls (dark), from the partition to the nose corner
        quad(mb, (xp, side * yi, FLOOR), (xt - 0.75, side * yi, FLOOR), (xt - 0.75, side * yi, 3.2), (xp, side * yi, 3.2), S["Console"], (0, -side, 0))
    quad(mb, (xp, yi, 3.00), (xt - 0.65, yi * 0.8, 3.00), (xt - 0.65, -yi * 0.8, 3.00), (xp, -yi, 3.00), S["Console"], (0, 0, -1))      # cab ceiling
    quad(mb, (xp, yi, FLOOR + 0.6), (xt - 0.5, yi, FLOOR + 0.6), (xt - 0.5, -yi, FLOOR + 0.6), (xp, -yi, FLOOR + 0.6), S["Floor"], (0, 0, 1))
    # the destination display's housing behind the display band, so the band never shows the sky through the hood
    box(mb, xt - 0.90, 0, (ND0 + NH0) / 2, 0.50, 2 * yi * 0.80, NH0 - ND0, S["Console"], ("+x", "-z", "+y", "-y"))
    # console under the windscreen: a sloped desk
    rbox(mb, xt - 0.55, 0, 1.18, 0.50, 2 * yi * 0.86, 0.36, 0.08, S["Console"], 2)
    # the driver's seat (on the left of the cab when seen from inside, offset to +Y)
    box(mb, xt - 1.15, 0.0, 1.30, 0.50, 0.52, 0.12, S["Console"])
    box(mb, xt - 1.42, 0.0, 1.70, 0.10, 0.50, 0.70, S["Console"])

# ------------------------------------------------------------------------------------------------ the nose
def nose_keys():
    # z: (setback of the front face from the tip, plan corner radius)
    return [(0.20, 0.09, 0.30), (NB0 + 0.04, 0.035, 0.31), (0.32, 0.0, 0.32), (NBD0, 0.0, 0.33), (NBD0 + 0.005, 0.025, 0.33), (NBD1 - 0.005, 0.025, 0.34),
            (NBD1, 0.0, 0.34), (NB1, 0.006, 0.35), (NB1 + 0.005, 0.02, 0.35), (NG0 - 0.005, 0.02, 0.36), (NG0, 0.03, 0.36), (1.15, 0.045, 0.38),
            (NG1, 0.06, 0.40), (NG1 + 0.02, 0.075, 0.40), (NW0, 0.085, 0.40), (2.20, 0.20, 0.42), (NW1, 0.36, 0.44), (ND0, 0.37, 0.44),
            (NH0, 0.47, 0.45), (NH0 + 0.04, 0.52, 0.45), (NTOP - 0.03, 0.60, 0.44), (NTOP, 0.72, 0.42)]

def nose_shape(z):
    keys = nose_keys()
    if z <= keys[0][0]: return keys[0][1], keys[0][2]
    for (z0, s0, r0), (z1, s1, r1) in zip(keys, keys[1:]):
        if z <= z1:
            t = (z - z0) / (z1 - z0)
            return s0 + (s1 - s0) * t, r0 + (r1 - r0) * t
    return keys[-1][1], keys[-1][2]

def nose_bulge(z):
    """The front face bows forward in plan; the gold panel's middle a little more (its raised centre)."""
    return 0.06 + (0.02 if NG0 <= z <= 1.15 else 0.0)

def nose_outline(z, w, xtip):
    n_side, n_arc, n_front = ((2, 8, 6), (1, 4, 3), (1, 3, 2))[2 - DETAIL]
    W_REF = 0.66
    if w < W_REF:
        return [(x, y * w / W_REF, k) for x, y, k in nose_outline(z, W_REF, xtip)]
    s, rc = nose_shape(z)
    rc = min(rc, w * 0.985)
    xf = xtip - s
    x0 = xtip - NOSE_LEN
    pts = []
    xa = max(xf - rc, x0 + 0.01)
    wt = w - TAPER * min(w / HW, 1.0)                 # the nose narrows toward the tip
    for k in range(n_side): pts.append((x0 + (xa - x0) * k / n_side, w + (wt - w) * k / n_side, 0))
    fw = max(wt - rc, 0.0)
    for k in range(n_arc + 1):
        t = (math.pi / 2) * k / n_arc
        pts.append((xa + rc * math.sin(t), fw + rc * math.cos(t), 1))
    b = nose_bulge(z)
    for k in range(1, n_front + 1):
        y = fw * (1 - k / n_front)
        pts.append((xf + (b * (1 - (y / fw) ** 2) if fw > 1e-6 else 0), y, 2))
    return pts

def front_x(z, y, xtip):
    s, rc = nose_shape(z)
    fw = max(HW - TAPER - rc, 1e-6)
    if abs(y) <= fw: return xtip - s + nose_bulge(z) * (1 - (abs(y) / fw) ** 2)
    d = min(abs(y) - fw, rc)
    return xtip - s - rc + math.sqrt(rc * rc - d * d)

def front_point(z, y, xtip):
    """(point, normal) on the nose surface at height z, lateral y."""
    s, rc = nose_shape(z)
    fw = HW - TAPER - rc
    if abs(y) <= fw:
        return Vector((front_x(z, y, xtip), y, z)), Vector((1, 0, 0))
    t = math.asin(min((abs(y) - fw) / rc, 1.0))
    return Vector((xtip - s - rc + rc * math.cos(t), y, z)), Vector((math.cos(t), math.copysign(math.sin(t), y), 0))

def nose(mb, xtip):
    zs_k = [k[0] for k in nose_keys()]
    extra = zs_k + ([1.7, 2.1, 2.5, 2.8, 3.2, 3.35, NH0 + 0.03, NH0 + 0.055, NH0 + 0.075, NH0 + 0.095] if DETAIL else [NH0 + 0.06])
    if not DETAIL: zs_k = [0.20, 0.32, NBD0, NBD1, NB1, NG0, NG1, NW0, NW1, ND0, NH0, NTOP - 0.03, NTOP]; extra = zs_k
    side_rows = dict(profile_rows([z for z in extra if Z_DOOR0 < z < Z_SH], roof=False))
    zs = sorted(set([z for z in extra] + [z for z in side_rows if z <= Z_SH]))
    zs = [z for z in zs if z >= 0.20]
    def width(z):
        if z in side_rows: return side_rows[z]
        if z < 0.27: return HW - 0.07 + 0.04 * (z - 0.20) / 0.07
        if z < 0.31: return HW - 0.03 + 0.022 * (z - 0.27) / 0.04
        if z <= Z_SH: return HW
        if z <= NH0:
            for zz, ww in arc_rows(8):
                if z <= zz: return ww
            return Y_FAIR - 0.03
        t = (z - NH0) / (NTOP - NH0)                       # the hood crown: a rounded cap above the display band
        return max(0.28, (Y_FAIR - 0.03) * math.sqrt(max(0.0, 1 - t * t)))
    def slot_at(zc, kind, ycorner=0.0):
        if zc < NBD0: return S["Bumper"]
        if zc < NBD1: return S["BumperDark"]
        if zc < NB1: return S["Bumper"]
        if zc < NG0: return S["Rubber"]
        if zc < NG1: return S["Gold"]
        if zc < NW0: return S["Black"]
        # the glass is a rounded black field framed by the silver hood: the hood comes down round the corners of the
        # display band and the top of the windscreen (photos 3041 / 3097 / 3001)
        if zc < NW1 - 0.25: return GLASS(True)
        if zc < NW1: return S["Silver"] if kind == 1 and ycorner > 0.55 else GLASS(True)
        if zc < ND0: return S["Silver"] if kind == 1 and ycorner > 0.3 else S["Black"]
        if zc < NH0: return S["Silver"] if kind == 1 and ycorner > 0.3 else (GLASS(True) if kind == 2 else S["Silver"])
        return S["Silver"]
    for side in (1, -1):
        grid = []
        for z in zs:
            pts = nose_outline(z, width(z), xtip)
            grid.append([(mb.vert((x, side * y, z)), x, y, kind) for x, y, kind in pts])
        for j in range(len(zs) - 1):
            zc = (zs[j] + zs[j + 1]) / 2
            for i in range(len(grid[j]) - 1):
                a, b = grid[j][i], grid[j][i + 1]
                c, d = grid[j + 1][i + 1], grid[j + 1][i]
                kind = max(a[3], b[3])
                s_, rc_ = nose_shape(zc)
                fw_ = max(width(zc) - TAPER - rc_, 0.0)
                ycorner = min(max(((a[2] + b[2]) / 2 - fw_) / max(rc_, 1e-3), 0.0), 1.0)      # 0 front edge of the corner arc .. 1 the side
                slot = slot_at(zc, kind, ycorner)
                if kind == 0 and NBD0 <= zc < NBD1: slot = S["Bumper"]
                if kind == 0 and Z_GOLD0 <= zc < Z_SH + 0.15: slot = S["Silver"]
                mb.poly([a[0], b[0], c[0], d[0]], slot, lambda cc: cc - Vector((xtip - 2.0, 0, min(max(cc.z, 0.8), 2.4))))
        bot = grid[0]
        cen = mb.vert((xtip - 0.6, 0, 0.20))
        for i in range(len(bot) - 1): mb.poly([cen, bot[i][0], bot[i + 1][0]], S["Rubber"], (0, 0, -1))
        top = grid[-1]
        cen2 = mb.vert((xtip - 0.75, 0, NTOP + 0.005))
        for i in range(len(top) - 1): mb.poly([cen2, top[i][0], top[i + 1][0]], S["Silver"], (0, 0, 1))
        # the back of the hood crown, above the roof well's front wall (a step down to the fairings)
        back = [grid[j][0][0] for j in range(len(zs)) if zs[j] >= Z_FAIR - 0.031] + [top[0][0]]
        cb = mb.vert((xtip - NOSE_LEN, 0, Z_FAIR - 0.03))
        for i in range(len(back) - 1): mb.poly([cb, back[i], back[i + 1]], S["Silver"], (-1, 0, 0))
    # lamp pods: (z, y, radius, slot) on the gold panel's corners (photos 3041 / 3097)
    lamps = [(1.28, 0.80, 0.034, "LampTail"), (1.27, 0.93, 0.050, "LampTail"), (1.10, 0.925, 0.064, "LampHead"), (0.94, 0.915, 0.054, "LampHead"),
             (0.32, 0.94, 0.022, "LampTail")]
    for side in (1, -1):
        for z, y, r, sl in lamps[:5 if DETAIL else 3]:
            p, nrm = front_point(z, side * y, xtip)
            lamp_disc(mb, p + nrm * 0.004, nrm, r, S[sl], (12 if DETAIL else 6), 0.012 if DETAIL else None)
        if DETAIL:   # the vertical seam between the lamp pod and the centre of the gold panel
            ys = side * 0.72
            p0, n0 = front_point(NG0 + 0.02, ys, xtip); p1, n1 = front_point(NG1 - 0.02, ys, xtip)
            quad(mb, p0 + n0 * 0.002 + Vector((0, 0.003, 0)), p0 + n0 * 0.002 - Vector((0, 0.003, 0)), p1 + n1 * 0.002 - Vector((0, 0.003, 0)), p1 + n1 * 0.002 + Vector((0, 0.003, 0)), S["BumperDark"], n0)
        # marker lamps on the hood corners
        p, nrm = front_point(NH0 + 0.04, side * 0.78, xtip)
        lamp_disc(mb, p + nrm * 0.006 + Vector((0, 0, 0.0)), (nrm + ZUP * 0.6), 0.03, S["LampMarker"], 8, None)
    display_front(mb, xtip)
    for side in (1, -1): mirror(mb, xtip, side)
    if DETAIL:
        # wiper: one, parked diagonally
        a, _ = front_point(1.40, 0.15, xtip); b, _ = front_point(2.30, 0.62, xtip)
        bar(mb, a + Vector((0.015, 0, 0)), b + Vector((0.015, 0, 0)), 0.012, S["Rubber"], 4)
        # antenna / horn on the hood
        rbox(mb, xtip - 0.95, 0, NTOP + 0.02, 0.22, 0.10, 0.08, 0.02, S["Rubber"], 1)

def display_front(mb, xtip, half=0.80, z0=3.07, z1=3.43):
    n = (16, 8, 4)[2 - DETAIL]
    top, bot = [], []
    for k in range(n + 1):
        y = -half + 2 * half * k / n
        bot.append(mb.vert((front_x(z0, y, xtip) + 0.005, y, z0)))
        top.append(mb.vert((front_x(z1, y, xtip) + 0.005, y, z1)))
    for k in range(n):
        u0, u1 = k / n, (k + 1) / n
        mb.f.append(([bot[k], bot[k + 1], top[k + 1], top[k]], S["Display"], [(u0, 0), (u1, 0), (u1, 1), (u0, 1)], NODOOR))
    # check orientation (normal +x)
    idx = mb.f[-1][0]; pts = [Vector(mb.v[i]) for i in idx]
    if ((pts[1] - pts[0]).cross(pts[2] - pts[1])).x < 0:
        for j in range(n):
            ii, s, uv, d = mb.f[-1 - j]
            mb.f[-1 - j] = (list(reversed(ii)), s, list(reversed(uv)), d)

def mirror(mb, xtip, side):
    """Rear-view mirror on an arm from the hood corner: a black housing with the small kerb mirror under it."""
    base = Vector((xtip - 0.70, side * (HW - 0.06), 3.30))
    elbow = Vector((xtip - 0.45, side * (HW + 0.24), 3.27))
    if DETAIL:
        bar(mb, base, elbow, 0.018, S["Rubber"], 5)
        bar(mb, elbow, elbow + Vector((0, 0, -0.10)), 0.016, S["Rubber"], 5)
    rbox(mb, xtip - 0.45, side * (HW + 0.25), 2.96, 0.11, 0.24, 0.44, 0.04, S["Rubber"], (2 if DETAIL else 0))
    rbox(mb, xtip - 0.45, side * (HW + 0.25), 2.66, 0.10, 0.20, 0.10, 0.03, S["Rubber"], (1 if DETAIL else 0))
    if DETAIL:     # the mirror glass faces back (-x)
        quad(mb, (xtip - 0.51, side * (HW + 0.15), 2.77), (xtip - 0.51, side * (HW + 0.35), 2.77), (xtip - 0.51, side * (HW + 0.35), 3.15),
             (xtip - 0.51, side * (HW + 0.15), 3.15), S["GlassFar"], (-1, 0, 0))

# ------------------------------------------------------------------------------------------------ roof equipment
def roof_unit(mb, cx, length, width=1.10, height=0.20, grille=True):
    """An equipment box in the roof well: rounded edges, dark grille panels on its top."""
    rbox(mb, cx, 0, Z_DECK + height / 2, length, width, height, 0.05, S["Silver"], (2 if DETAIL else 0))
    if grille and DETAIL:
        n = max(1, int(length / 0.9))
        for k in range(n):
            gx = cx - length / 2 + (k + 0.5) * length / n
            quad(mb, (gx - length / n * 0.38, -width * 0.36, Z_DECK + height + 0.003), (gx + length / n * 0.38, -width * 0.36, Z_DECK + height + 0.003),
                 (gx + length / n * 0.38, width * 0.36, Z_DECK + height + 0.003), (gx - length / n * 0.38, width * 0.36, Z_DECK + height + 0.003), S["Metal"], (0, 0, 1))

# ------------------------------------------------------------------------------------------------ the pieces
def cab_piece():
    L = L_CAB
    mb = body(L, True, CAB_DOORS, CAB_WINDOWS, [L - BOGIE_CAB])
    roof_unit(mb, L / 2 - 3.9, 2.6, 1.15, 0.22)            # HVAC over the saloon
    roof_unit(mb, L / 2 - 1.55, 1.1, 1.0, 0.16)            # cab air conditioner
    roof_unit(mb, -L / 2 + 1.5, 2.2, 1.05, 0.18)           # traction converter over the bogie
    return mb

def susp_piece():
    L = L_SUSP
    mb = body(L, False, SUSP_DOORS, SUSP_WINDOWS, [], side_display=SIDE_DISPLAY)
    roof_unit(mb, L / 2 - 1.4, 1.9, 1.0, 0.10, grille=False)   # pantograph platform (the Panto piece stands on it)
    roof_unit(mb, -L / 2 + 1.6, 2.0, 1.05, 0.20)              # braking resistors
    return mb

def centre_piece():
    L = L_CEN
    mb = body(L, False, [], CEN_WINDOWS, [L / 2])
    roof_unit(mb, 0.0, 2.3, 1.15, 0.24)
    return mb

BELLOWS_HALF = 0.36
def bellows_piece():
    """Accordion bellows round the gangway from x=-0.36 to +0.36 (into each body, hidden inside): folds every 4 cm,
    end frames. The viewer bends it between the two module headings."""
    mb = MB()
    prof = [(z, w - 0.06) for z, w in profile_rows(roof=False) if z > Z_BOT + 0.05 and w > 0.2]
    prof = [(0.30, HW - 0.08)] + prof + [(Z_FAIR - 0.05, 0.40), (Z_FAIR - 0.03, 0.0)]
    ring = prof + [(z, -w) for z, w in reversed(prof[:-1])]
    nf = (9, 4, 2)[2 - DETAIL]
    rings = []
    for k in range(nf * 2 + 1):
        x = -BELLOWS_HALF + 2 * BELLOWS_HALF * k / (nf * 2)
        inset = 0.0 if k % 2 == 0 else 0.028
        rings.append([mb.vert((x, (abs(w) - inset) * (1 if w >= 0 else -1), z - (inset if z > 2.6 else 0))) for z, w in ring])
    for k in range(len(rings) - 1):
        for i in range(len(ring) - 1):
            mb.poly([rings[k][i], rings[k + 1][i], rings[k + 1][i + 1], rings[k][i + 1]], S["Bellows"], lambda c: Vector((0, c.y, c.z - 1.7)))
    quad(mb, (-BELLOWS_HALF, HW - 0.08, 0.30), (BELLOWS_HALF, HW - 0.08, 0.30), (BELLOWS_HALF, -HW + 0.08, 0.30), (-BELLOWS_HALF, -HW + 0.08, 0.30), S["Rubber"], (0, 0, -1))
    return mb

def bogie_piece():
    """Wheels with flanges, axle boxes, side frames with chevron springs, bolster, brake units."""
    mb = MB()
    for x in (BOGIE_WB / 2, -BOGIE_WB / 2):
        for side in (1, -1):
            cyl_y(mb, (x, side * (GAUGE / 2 + 0.03), WHEEL_R), WHEEL_R, 0.11, 16, S["Metal"])
            cyl_y(mb, (x, side * (GAUGE / 2 - 0.035), WHEEL_R), WHEEL_R + 0.02, 0.025, 16, S["Metal"])      # flange
            rbox(mb, x, side * (GAUGE / 2 + 0.17), WHEEL_R + 0.02, 0.26, 0.16, 0.22, 0.03, S["Rubber"], 1)     # axle box
        bar(mb, (x, GAUGE / 2, WHEEL_R), (x, -GAUGE / 2, WHEEL_R), 0.06, S["Metal"], 6)                        # axle
    for side in (1, -1):
        rbox(mb, 0, side * (GAUGE / 2 + 0.17), WHEEL_R + 0.18, BOGIE_WB - 0.2, 0.14, 0.24, 0.04, S["Metal"], 1)  # side frame
        for x in (BOGIE_WB / 2, -BOGIE_WB / 2):
            rbox(mb, x * 0.92, side * (GAUGE / 2 + 0.17), WHEEL_R + 0.13, 0.14, 0.18, 0.08, 0.02, S["Rubber"], 1)   # chevron spring
        rbox(mb, 0, side * (GAUGE / 2 + 0.05), WHEEL_R + 0.02, 0.5, 0.12, 0.20, 0.03, S["Rubber"], 1)           # brake / motor
    rbox(mb, 0, 0, WHEEL_R + 0.10, 0.55, GAUGE + 0.25, 0.20, 0.04, S["Metal"], 1)                             # bolster
    return mb

PANTO_BASE = Z_DECK + 0.10                             # on the pantograph platform
def panto_piece():
    """Single-arm pantograph raised to the wire: base frame on four insulators, lower arm (two tubes), knee, upper
    arm, head with two contact strips and horns. Its head touches WIRE above the rail top."""
    mb = MB()
    z0 = PANTO_BASE
    for x, y in [(0.55, 0.42), (0.55, -0.42), (-0.55, 0.42), (-0.55, -0.42)]:
        for k in range(3):    # insulator sheds
            rbox(mb, x, y, z0 + 0.03 + 0.04 * k, 0.07 - 0.01 * (k % 2), 0.07 - 0.01 * (k % 2), 0.035, 0.015, S["Lining"], 1)
    for y in (0.42, -0.42): bar(mb, (-0.62, y, z0 + 0.14), (0.62, y, z0 + 0.14), 0.03, S["Metal"], 6)
    for x in (0.55, -0.55): bar(mb, (x, 0.42, z0 + 0.14), (x, -0.42, z0 + 0.14), 0.03, S["Metal"], 6)
    hinge = Vector((-0.45, 0, z0 + 0.20))
    head_z = WIRE - 0.017          # contact strip top = the wire's underside (12 mm radius)
    knee = Vector((0.95, 0, z0 + (head_z - z0) * 0.47))
    head = Vector((-0.25, 0, head_z - 0.13))
    for y in (0.24, -0.24): bar(mb, hinge + Vector((0, y, 0)), knee + Vector((0, y * 0.2, 0)), 0.03, S["Metal"], 6)
    bar(mb, hinge + Vector((0.25, 0, -0.02)), knee + Vector((-0.05, 0, -0.05)), 0.012, S["Metal"], 4)             # push rod
    rbox(mb, -0.45, 0, z0 + 0.22, 0.30, 0.55, 0.10, 0.03, S["Metal"], 1)                                          # hinge shaft / spring box
    bar(mb, knee, head, 0.024, S["Metal"], 6)                                                                       # upper arm
    for y in (0.08, -0.08): bar(mb, knee + Vector((0, y, 0)), head + Vector((0, y * 4, 0)), 0.01, S["Metal"], 4)  # upper arm braces
    for y in (0.32, -0.32): bar(mb, head + Vector((0, y, 0)), head + Vector((0, y, 0.10)), 0.012, S["Metal"], 4)  # head springs
    bar(mb, head + Vector((0, -0.34, 0)), head + Vector((0, 0.34, 0)), 0.014, S["Metal"], 4)
    for dx in (0.12, -0.12):                                                                                       # contact strips
        rbox(mb, head.x + dx, 0, head_z - 0.01, 0.05, 1.24, 0.03, 0.01, S["Rubber"], 1)
        rbox(mb, head.x + dx, 0, head_z - 0.035, 0.035, 1.20, 0.025, 0.008, S["Metal"], 1)
    for y in (0.62, -0.62):                                                                                        # horns
        s = 1 if y > 0 else -1
        bar(mb, (head.x, y, head_z - 0.02), (head.x, y + s * 0.22, head_z - 0.15), 0.014, S["Metal"], 4)
        for dx in (0.12, -0.12): bar(mb, (head.x + dx, y, head_z - 0.025), (head.x, y, head_z - 0.025), 0.01, S["Metal"], 4)
    return mb

PANTO_ON_SUSP = L_SUSP / 2 - 1.4

# ------------------------------------------------------------------------------------------------ build
far_objs = {}
DETAIL = 1
far_objs["Cab_mid"] = to_object("Cab_mid", cab_piece())
far_objs["Susp_mid"] = to_object("Susp_mid", susp_piece())
far_objs["Centre_mid"] = to_object("Centre_mid", centre_piece())
DETAIL = 0
far_objs["Cab_far"] = to_object("Cab_far", cab_piece())
far_objs["Susp_far"] = to_object("Susp_far", susp_piece())
far_objs["Centre_far"] = to_object("Centre_far", centre_piece())
far_objs["Bellows_far"] = to_object("Bellows_far", bellows_piece(), sharp_deg=80)
DETAIL = 2
objs = {
    "Cab": to_object("Cab", cab_piece()),
    "Susp": to_object("Susp", susp_piece()),
    "Centre": to_object("Centre", centre_piece()),
    "Bellows": to_object("Bellows", bellows_piece(), sharp_deg=80),
    "Bogie": to_object("Bogie", bogie_piece(), sharp_deg=40),
    "Panto": to_object("Panto", panto_piece(), sharp_deg=40, merge=False),
}
ALL = {**objs, **far_objs}
def tris(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)
counts = {k: tris(o) for k, o in ALL.items()}
per_tram = 2 * counts["Cab"] + 2 * counts["Susp"] + counts["Centre"] + 4 * counts["Bellows"] + 3 * counts["Bogie"] + counts["Panto"]
print("TRAM2 tris", counts, "per tram", per_tram, f"{time.time() - T0:.1f}s", flush=True)

# ------------------------------------------------------------------------------------------------ lightmap UV1: every piece packed into ONE atlas
for o in scn.objects: o.select_set(False)
for o in ALL.values():
    uv1 = o.data.uv_layers.new(name="Lightmap"); o.data.uv_layers.active = uv1
    o.select_set(True)
bpy.context.view_layer.objects.active = objs["Cab"]
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.002, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
try: bpy.ops.uv.pack_islands(rotate=True, margin=0.003)
except Exception as e: print("pack_islands:", e)
bpy.ops.object.mode_set(mode="OBJECT")
for o in ALL.values():
    o.data.uv_layers.active = o.data.uv_layers["UVMap"]
    o.data.uv_layers["UVMap"].active_render = True
print(f"uv1 done {time.time() - T0:.1f}s", flush=True)

# ------------------------------------------------------------------------------------------------ assemble a whole tram for the AO bake and previews
layout = {
    "version": 2, "length": TOTAL, "width": W, "height": NTOP, "floor": FLOOR, "gap": GAP, "bellowsHalf": BELLOWS_HALF, "wire": WIRE,
    "pantoBase": PANTO_BASE, "pantoHead": WIRE - 0.017,
    "modules": [
        {"piece": "Cab", "front": 0.0, "length": L_CAB, "bogie": L_CAB - BOGIE_CAB, "flip": False},
        {"piece": "Susp", "front": L_CAB, "length": L_SUSP, "bogie": None, "flip": False, "panto": PANTO_ON_SUSP},
        {"piece": "Centre", "front": L_CAB + L_SUSP, "length": L_CEN, "bogie": L_CEN / 2, "flip": False},
        {"piece": "Susp", "front": L_CAB + L_SUSP + L_CEN, "length": L_SUSP, "bogie": None, "flip": True},
        {"piece": "Cab", "front": TOTAL - L_CAB, "length": L_CAB, "bogie": BOGIE_CAB, "flip": True},
    ],
    "slots": [s[0] for s in SLOTS],
    "tris": counts, "trisPerTram": per_tram,
    "measured": "length 31.85 m, width 2.30 m, floor 0.35 m, 5 sections, 3 bogies (STIB via techno-science.net; railjournal.com); 6 doors per side (2 single, 4 double: photos)",
    "estimated": "heights from the photos of 3041 / 3001 / 3097 (width 2.30 m, people, floor 0.35 m: hood 3.62 m, fairings 3.50 m, gold panel 0.79-1.38 m, windscreen 1.42-2.96 m, window band 1.14-2.74 m), module lengths, openings, roof equipment, colours, interior layout",
}
placed = []
def place(src, x, flip=False):
    o = src.copy(); o.data = src.data; scn.collection.objects.link(o); o.hide_render = False
    o.location = (x, 0, 0); o.rotation_euler = (0, 0, math.pi if flip else 0)
    placed.append(o); return o
def assemble(pieces, dx=0.0):
    out = []
    for m in layout["modules"]:
        cx = -(m["front"] + m["length"] / 2) + dx
        out.append((pieces[m["piece"]], cx, m["flip"]))
        if m["bogie"] is not None: out.append((pieces["Bogie"], -(m["front"] + m["bogie"]) + dx, False))
        if m.get("panto") is not None: out.append((pieces["Panto"], cx + m["panto"], False))
    for k in range(4): out.append((pieces["Bellows"], -[L_CAB, L_CAB + L_SUSP, L_CAB + L_SUSP + L_CEN, TOTAL - L_CAB][k] + dx, False))
    return out

gm = bpy.data.meshes.new("g"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=60); bm.to_mesh(gm); bm.free()
ground = bpy.data.objects.new("ground", gm); scn.collection.objects.link(ground); ground.location = (-16, 0, -0.005)
gmat = bpy.data.materials.new("setts"); gmat.use_nodes = True
gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.16, 0.15, 0.14, 1)
gmat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.85
gm.materials.append(gmat)

AO_PX = 2048
def write_grey_png(img, path):
    """The baked AO as an 8-bit greyscale PNG (half the size of Blender's RGB save; values untouched)."""
    import numpy as np, zlib, struct
    w, h = img.size
    px = np.empty(w * h * 4, dtype=np.float32); img.pixels.foreach_get(px)
    g = (np.clip(px.reshape(h, w, 4)[::-1, :, 0], 0, 1) * 255 + 0.5).astype(np.uint8)      # Blender rows are bottom-up
    raw = b"".join(b"\x00" + g[r].tobytes() for r in range(h))
    chunk = lambda t, d: struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    with open(path, "wb") as f:
        f.write(b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", struct.pack(">IIBBBBB", w, h, 8, 0, 0, 0, 0)) + chunk(b"IDAT", zlib.compress(raw, 9)) + chunk(b"IEND", b""))
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 1.2                 # AO reach (m): panel-scale occlusion, not the whole body
ao_img = bpy.data.images.new("t3000_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in MATS:
    n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; m.node_tree.nodes.active = n
if BAKE:
    scn.cycles.samples = 384
    t = time.time()
    # the near pieces in place, in one tram (the far variants are baked alone with the same layout)
    for o in ALL.values(): o.hide_render = True
    first = True
    for group in (objs, {"Cab": far_objs["Cab_mid"], "Susp": far_objs["Susp_mid"], "Centre": far_objs["Centre_mid"], "Bellows": objs["Bellows"], "Bogie": objs["Bogie"], "Panto": objs["Panto"]},
                  {"Cab": far_objs["Cab_far"], "Susp": far_objs["Susp_far"], "Centre": far_objs["Centre_far"], "Bellows": far_objs["Bellows_far"], "Bogie": objs["Bogie"], "Panto": objs["Panto"]}):
        for o in placed: bpy.data.objects.remove(o)
        placed.clear()
        for src, x, flip in assemble(group): place(src, x, flip).hide_render = False
        targets = [o for k, o in group.items() if (group is objs or (k not in ("Bogie", "Panto") and o not in objs.values()))]
        for target in targets:
            # bake the source object: put it where one of its copies is (the first) so it sees its neighbours
            copy = next(p for p in placed if p.data == target.data)
            target.location, target.rotation_euler = copy.location.copy(), copy.rotation_euler.copy()
            copy.hide_render = True; target.hide_render = False
            for o in scn.objects: o.select_set(False)
            target.select_set(True); bpy.context.view_layer.objects.active = target
            bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=6, use_clear=first)
            first = False
            target.hide_render = True; copy.hide_render = False
            target.location = (0, 0, 0); target.rotation_euler = (0, 0, 0)
    print(f"AO bake {time.time() - t:.1f}s", flush=True)
    write_grey_png(ao_img, os.path.join(OUT, "t3000_ao.png"))
for m in MATS: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in placed: bpy.data.objects.remove(o)
placed.clear()

with open(os.path.join(OUT, "t3000.json"), "w") as f: json.dump(layout, f, indent=1)
for o in scn.objects: o.select_set(o.name in ALL)
for o in ALL.values(): o.hide_render = False
glb = os.path.join(OUT, "t3000.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("EXPORTED", glb, os.path.getsize(glb) // 1024, "KB", f"{time.time() - T0:.1f}s", flush=True)

if not PREVIEW: sys.exit(0)
os.makedirs(PREVIEW, exist_ok=True)
for o in ALL.values(): o.hide_render = True
for src, x, flip in assemble(objs): place(src, x, flip)
world = scn.world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"]); bg.inputs["Strength"].default_value = 0.25
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.0; sun.rotation_euler = (math.radians(50), 0, math.radians(-30))
scn.cycles.samples = 40; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 1100, 720
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
def shot(fname, loc, look, lens=35):
    cam.location = Vector(loc); cam.data.lens = lens
    cam.rotation_euler = (Vector(look) - cam.location).to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREVIEW, fname)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)
shot("p_34front.png", (6.5, -7.5, 1.6), (-6.0, 0.0, 1.8), lens=28)
shot("p_front.png", (9.0, -1.0, 1.7), (0.0, 0.0, 1.8), lens=45)
shot("p_side.png", (-16.0, -34.0, 2.0), (-16.0, 0.0, 1.7), lens=40)
shot("p_close.png", (-3.0, -4.0, 1.6), (-5.0, 0.0, 1.5), lens=28)
print("DONE", flush=True)
