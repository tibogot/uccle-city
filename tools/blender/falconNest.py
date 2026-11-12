"""THE SAINT-JOB PEREGRINE EYRIE: the scrape on the belfry floor behind the louvred arch, built in code (no hand
modelling), plus the prey an adult carries in.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/falconNest.py -- models/falcons [--preview docs/falcons]

What it is (from the reference photos of church / cathedral eyries, data/raw/refs/falcons/SOURCES.json: Derby
Cathedral's nest tray, the Allenberg tower box; the Brussels pairs nest in boxes the IRSNB put behind belfry openings):
  - a weathered wooden tray (three boards a side, bevelled, a lip) on the belfry floor, filled with pea gravel:
    rounded pebbles of 2-5 cm, grey-brown, each one its own irregular stone; the scrape: a shallow hollow in the middle
    with the gravel pushed to a rim
  - feathers: plucked pigeon contour feathers (grey, some with the dark wing bar), white down tufts, one barred falcon
    feather; most in the corners and against the walls, a few on the arch's reveal floor and sill (the plucking spot)
  - prey remains: a pigeon wing (fanned primaries with the two dark bars), a breastbone (keel), leg bones, dried scraps
  - droppings: chalky white splashes on the gravel rim, the tray lip and the reveal floor, drips over the sill edge
    (the streaks down the outer wall are in the church's masonry shader: viewer/stjobModel.js)
  - prey_carry: a whole pigeon (Columba livia) held in the talons: body, head, folded wings with the bars, tail
Colours are per-vertex (COLOR_0), multiplied by an ambient occlusion baked with Cycles INTO the vertex colours, with
the belfry chamber around it as an occluder (a 7.8 m room, the arch's 1.04 x 0.93 m gap the only opening), so the
scrape is as dark as it really is in there. One material, one draw call.

Frame (Blender, Z up): origin = the stjob.glb node "nest" (on the chamber floor, 1.05 m behind the outer wall face,
centred on the arch); +X = to the right seen from outside, +Y = into the chamber, Z up. glTF export (Y up): x, up,
z = OUTWARD (the tower face's normal). The arch's reveal floor is 0.50 m above the chamber floor from y -0.43 (the
inner wall face) to -1.10 (the sill's front); see tools/blender/stjob.py tower() and the PERCH table.
Nodes: nest_props (mesh), prey_carry (mesh), empties chick_0..2 (where the eyases sit), feed (the adult feeding),
scrape (the hollow's centre), hop (the gravel's edge toward the arch, where a fledgling jumps from).
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix, noise

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/falcons")
PREV = os.path.abspath(ARGS[ARGS.index("--preview") + 1]) if "--preview" in ARGS else None
os.makedirs(OUT, exist_ok=True)
rng = random.Random(7)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# --------------------------------------------------------------------------------------------- sizes
TRAY_W, TRAY_D = 1.10, 0.80          # along x, along y (y from -0.40, against the inner wall face at -0.43, to +0.40)
TRAY_H = 0.42                        # board top; the gravel surface at GRAVEL
GRAVEL = 0.36
BOARD_T = 0.03
REVEAL_Z, REVEAL_Y0, REVEAL_Y1 = 0.50, -0.43, -1.10   # the arch's reveal floor (stjob.py: sill 21.45 m, floor 20.95)
ARCH_HALF = 0.52                     # the arch is 1.04 m wide
SCRAPE = Vector((0.02, 0.02, GRAVEL))

def lin(hexrgb):
    c = [((hexrgb >> s) & 255) / 255 for s in (16, 8, 0)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
def jitter(c, a, r=rng):
    k = 1 + (r.random() - 0.5) * 2 * a
    return tuple(max(0.0, min(1.0, x * k)) for x in c)

class Mesh:
    """Triangles with a colour per corner (linear RGB)."""
    def __init__(self): self.v, self.f, self.c = [], [], []
    def add(self, verts, faces, cols):
        o = len(self.v); self.v += [tuple(v) for v in verts]
        for fi, f in enumerate(faces):
            self.f.append(tuple(o + i for i in f))
            self.c.append(cols[fi] if isinstance(cols[0], (list, tuple)) and isinstance(cols[0][0], (list, tuple)) else [cols[fi] if isinstance(cols[fi][0], float) else cols[fi]] * len(f))
    def add_bm(self, bm, colfn):
        """colfn(face, vert) -> colour"""
        bm.verts.ensure_lookup_table(); bm.verts.index_update()
        o = len(self.v)
        self.v += [tuple(v.co) for v in bm.verts]
        for f in bm.faces:
            self.f.append(tuple(o + v.index for v in f.verts))
            self.c.append([colfn(f, v) for v in f.verts])

def to_object(name, M):
    # two-sided pieces repeat a face with its corners reversed: give the copy its own vertices (a valid mesh)
    seen = set()
    for fi, f in enumerate(M.f):
        key = frozenset(f)
        if key in seen:
            o = len(M.v); M.v += [M.v[i] for i in f]; M.f[fi] = tuple(range(o, o + len(f)))
        else: seen.add(key)
    me = bpy.data.meshes.new(name)
    me.from_pydata(M.v, [], M.f); me.update()
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    data = []
    for poly, cs in zip(me.polygons, M.c):
        for k in range(len(poly.loop_indices)): data += [*cs[k][:3], 1.0]
    col.data.foreach_set("color", data)
    me.validate(clean_customdata=False)
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob)
    return ob

# --------------------------------------------------------------------------------------------- the tray
def bevel_box(cx, cy, cz, sx, sy, sz, seg=2, w=0.006):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    for v in bm.verts: v.co = Vector((cx + v.co.x * sx, cy + v.co.y * sy, cz + v.co.z * sz))
    bmesh.ops.bevel(bm, geom=list(bm.edges), offset=w, segments=seg, affect="EDGES", profile=0.5)
    return bm

def wood_col(seed):
    r = random.Random(seed)
    base = lin(0x6e5a45)                                  # weathered oak / OSB brown, grey-silvered
    base = tuple(b * 0.85 + 0.15 * g for b, g in zip(base, lin(0x6b665e)))
    return jitter(base, 0.18, r)

nest = Mesh()
def board(cx, cy, cz, sx, sy, sz, seed, splash=0.0):
    bm = bevel_box(cx, cy, cz, sx, sy, sz)
    c0 = wood_col(seed)
    r = random.Random(seed + 1)
    def colfn(f, v):
        p = v.co
        grain = 0.5 + 0.5 * noise.noise(Vector((p.x * 3.0 + seed, p.y * 3.0, p.z * 40.0)))
        c = tuple(x * (0.82 + 0.3 * grain) for x in c0)
        # whitewash: splashes on the top edge and drips down the inner face
        if splash > 0:
            s = noise.noise(Vector((p.x * 9 + seed, p.y * 9, p.z * 2)))
            drip = max(0.0, s - 0.25) * 2.2 * splash * max(0.0, 1 - (TRAY_H - p.z) * 4)
            c = tuple(x * (1 - min(1, drip)) + w * min(1, drip) for x, w in zip(c, lin(0xe9e6dc)))
        return c
    nest.add_bm(bm, colfn); bm.free()

hw, hd = TRAY_W / 2, TRAY_D / 2
for i, z0 in enumerate((0.0, 0.14, 0.28)):               # three boards a side, 1 cm gaps
    h = 0.13
    board(0, -hd + BOARD_T / 2, z0 + h / 2 + 0.01, TRAY_W, BOARD_T, h, 10 + i, splash=0.8 if i == 2 else 0.0)
    board(0, hd - BOARD_T / 2, z0 + h / 2 + 0.01, TRAY_W, BOARD_T, h, 20 + i, splash=0.6 if i == 2 else 0.0)
    board(-hw + BOARD_T / 2, 0, z0 + h / 2 + 0.01, BOARD_T, TRAY_D - 2 * BOARD_T, h, 30 + i, splash=0.5 if i == 2 else 0.0)
    board(hw - BOARD_T / 2, 0, z0 + h / 2 + 0.01, BOARD_T, TRAY_D - 2 * BOARD_T, h, 40 + i, splash=0.5 if i == 2 else 0.0)
for sx in (-1, 1):                                        # corner posts
    for sy in (-1, 1):
        board(sx * (hw - 0.025), sy * (hd - 0.025), TRAY_H / 2 + 0.005, 0.045, 0.045, TRAY_H - 0.01, 50 + sx + 2 * sy)
board(0, 0, 0.012, TRAY_W - 0.02, TRAY_D - 0.02, 0.022, 60)     # the bottom

# --------------------------------------------------------------------------------------------- gravel
def gravel_height(x, y):
    """the gravel surface: flat at GRAVEL, the scrape a 4 cm hollow (r 0.2 m) with a low rim, a slope at the walls"""
    d = math.hypot(x - SCRAPE.x, (y - SCRAPE.y) * 1.15)
    hollow = -0.045 * max(0.0, 1 - (d / 0.21) ** 2) ** 1.5
    rim = 0.014 * math.exp(-((d - 0.25) / 0.06) ** 2)
    wall = 0.02 * max(0.0, 1 - min(hw - abs(x), hd - abs(y)) / 0.08)
    return GRAVEL + hollow + rim + wall + 0.006 * noise.noise(Vector((x * 14, y * 14, 0.3)))

# the bed under the pebbles (fills the gaps): a displaced grid in a darker gravel tone
bm = bmesh.new()
GRAVEL_COLS = [lin(0x8a8072), lin(0x9b9282), lin(0x6f685e), lin(0xa89d8a), lin(0x7c776e), lin(0x5f5a54), lin(0xb0a692)]
# packed pea gravel as a displaced 9 mm grid: Voronoi cells of ~3 cm are the stones (a dome per cell, a dark crevice
# between them, a colour per cell); the loose pebbles on top give the silhouette
nx, ny = 92, 66
grid, gcol = {}, {}
CELL = 1 / 0.028
for j in range(ny + 1):
    for i in range(nx + 1):
        x = -hw + BOARD_T + (TRAY_W - 2 * BOARD_T) * i / nx
        y = -hd + BOARD_T + (TRAY_D - 2 * BOARD_T) * j / ny
        dist, pts = noise.voronoi(Vector((x * CELL, y * CELL, 0.37)), distance_metric="DISTANCE", exponent=2.5)
        e = dist[1] - dist[0]                             # 0 on a crevice, larger inside a stone
        dome = min(1.0, e / 0.45) ** 0.6
        cp = pts[0]
        hsh = (math.sin(cp.x * 12.9898 + cp.y * 78.233) * 43758.5453) % 1.0
        c = GRAVEL_COLS[int(hsh * len(GRAVEL_COLS)) % len(GRAVEL_COLS)] if "GRAVEL_COLS" in globals() else (0.5, 0.5, 0.5)
        c = tuple(v * (0.35 + 0.65 * dome) * (0.9 + 0.2 * ((hsh * 7.3) % 1.0)) for v in c)
        grid[i, j] = bm.verts.new((x, y, gravel_height(x, y) - 0.01 + 0.011 * dome))
        gcol[grid[i, j]] = c
for j in range(ny):
    for i in range(nx):
        bm.faces.new((grid[i, j], grid[i + 1, j], grid[i + 1, j + 1], grid[i, j + 1]))
nest.add_bm(bm, lambda f, v: gcol[v])
bm.free()

def pebble(p, size, col, flat=0.6, seed=0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=2, radius=1.0)
    r = random.Random(seed)
    sx, sy, sz = size * (0.8 + 0.4 * r.random()), size * (0.7 + 0.4 * r.random()), size * flat * (0.7 + 0.4 * r.random())
    rot = Matrix.Rotation(r.random() * 6.28, 3, "Z") @ Matrix.Rotation((r.random() - 0.5) * 0.6, 3, "X")
    for v in bm.verts:
        d = 1 + 0.18 * noise.noise(v.co * 1.7 + Vector((seed, 0, 0)))
        v.co = rot @ Vector((v.co.x * sx * d, v.co.y * sy * d, v.co.z * sz * d)) + p
    c = jitter(col, 0.12, r)
    nest.add_bm(bm, lambda f, v: tuple(x * (0.8 + 0.25 * max(0.0, (v.co.z - p.z) / max(sz, 1e-4))) for x in c))
    bm.free()

n_peb = 0
for k in range(5000):
    if n_peb >= 150: break
    x = rng.uniform(-hw + BOARD_T + 0.02, hw - BOARD_T - 0.02); y = rng.uniform(-hd + BOARD_T + 0.02, hd - BOARD_T - 0.02)
    d = math.hypot(x - SCRAPE.x, y - SCRAPE.y)
    if d < 0.17 and rng.random() < 0.75: continue        # the hollow: fewer, smaller stones
    s = rng.uniform(0.009, 0.018) * (0.7 if d < 0.2 else 1.0)
    pebble(Vector((x, y, gravel_height(x, y) - s * 0.2)), s, rng.choice(GRAVEL_COLS), seed=k)
    n_peb += 1
print("pebbles", n_peb)

# --------------------------------------------------------------------------------------------- feathers
def feather(p, yaw, length, kind, seed, tilt=0.0, bend=0.25):
    """A contour feather: a curved rachis with an asymmetric vane (outline sampled along it), two-sided."""
    r = random.Random(seed)
    n = 7
    w = length * (0.22 if kind != "primary" else 0.16)
    pts_l, pts_r, spine = [], [], []
    for i in range(n + 1):
        t = i / n
        z = bend * length * (t * t) * 0.25
        prof = math.sin(math.pi * min(1.0, t * 1.1)) ** 0.7 if t > 0.12 else t / 0.12 * 0.3
        a = Vector((0, t * length, z))
        spine.append(a)
        pts_l.append(a + Vector((-w * prof * (0.75 if kind == "primary" else 1.0), -0.1 * w * prof, 0.004 * prof)))
        pts_r.append(a + Vector((w * prof * (1.0 if kind == "primary" else 0.9), -0.12 * w * prof, 0.004 * prof)))
    M = Matrix.Translation(p) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(tilt, 4, "Y")
    verts = [M @ v for v in spine + pts_l + pts_r]
    faces = []
    for i in range(n):
        s0, s1, l0, l1, r0, r1 = i, i + 1, n + 1 + i, n + 2 + i, 2 * (n + 1) + i, 2 * (n + 1) + i + 1
        faces += [(s0, l0, l1, s1), (s0, s1, r1, r0)]
    faces += [tuple(reversed(f)) for f in faces]           # two-sided
    if kind == "pigeon": base = jitter(lin(0x8e939b), 0.08, r)
    elif kind == "pigeonbar": base = lin(0x8a8f97)
    elif kind == "down": base = jitter(lin(0xeeeae2), 0.03, r)
    elif kind == "falcon": base = lin(0x4f5662)
    else: base = jitter(lin(0x6d7079), 0.1, r)
    cols = []
    for f in faces:
        cs = []
        for vi in f:
            loc = (spine + pts_l + pts_r)[vi]
            t = loc.y / length
            c = base
            if kind == "pigeonbar" and 0.55 < t < 0.75: c = lin(0x24252a)
            if kind == "falcon" and int(t * 9) % 2 == 0: c = lin(0x262a31)
            if vi <= n: c = tuple(x * 1.15 + 0.05 for x in c)                 # the pale rachis
            if t < 0.2 and kind != "down": c = tuple(x * 0.6 + 0.4 * w_ for x, w_ in zip(c, lin(0xe4e0d8)))   # the downy base
            cs.append(c)
        cols.append(cs)
    nest.v += [tuple(v) for v in verts]
    o = len(nest.v) - len(verts)
    for f, cs in zip(faces, cols): nest.f.append(tuple(o + i for i in f)); nest.c.append(cs)

def down_tuft(p, size, seed):
    """A white down tuft: a few crossed soft barbs (thin quads) radiating from a point."""
    r = random.Random(seed)
    for k in range(5):
        a = r.random() * math.pi; e = (r.random() - 0.3) * 0.8
        d = Vector((math.cos(a) * math.cos(e), math.sin(a) * math.cos(e), math.sin(e))) * size
        side = d.cross(Vector((0, 0, 1))).normalized() * size * 0.25
        v = [p - d, p - side * 0.3, p + d, p + side * 0.3]
        c = jitter(lin(0xf2efe8), 0.04, r)
        nest.v += [tuple(x) for x in v]; o = len(nest.v) - 4
        nest.f += [(o, o + 1, o + 2, o + 3), (o + 3, o + 2, o + 1, o)]; nest.c += [[c] * 4, [c] * 4]

def on_gravel(x, y, lift=0.004): return Vector((x, y, gravel_height(x, y) + lift))
# along the walls and in the corners (the adults' plucking leftovers), a few in the hollow
for k, (x, y) in enumerate([(-0.45, -0.3), (-0.48, 0.1), (0.42, 0.3), (0.46, -0.25), (-0.2, 0.33), (0.25, 0.34), (0.1, -0.33),
                             (-0.32, -0.12), (0.33, 0.05), (0.0, 0.2), (-0.12, -0.05), (0.38, -0.32), (-0.4, 0.3)]):
    kind = ["pigeon", "pigeonbar", "pigeon", "down", "pigeon", "falcon" if k == 5 else "pigeon"][k % 6]
    L = 0.05 if kind == "down" else rng.uniform(0.07, 0.13)
    feather(on_gravel(x, y), rng.random() * 6.28, L, kind, 100 + k, tilt=(rng.random() - 0.5) * 0.5)
for k in range(16):
    x, y = rng.uniform(-0.5, 0.5), rng.uniform(-0.36, 0.36)
    down_tuft(on_gravel(x, y, 0.01), rng.uniform(0.012, 0.022), 300 + k)
# on the reveal floor and the sill: the plucking spot (outside light: these read from the street with binoculars)
for k, (x, y) in enumerate([(-0.3, -0.7), (0.25, -0.85), (0.05, -1.0), (-0.12, -0.55)]):
    feather(Vector((x, y, REVEAL_Z + 0.004)), rng.random() * 6.28, rng.uniform(0.08, 0.12), ["pigeon", "pigeonbar", "pigeon", "down"][k], 400 + k)
for k in range(6):
    down_tuft(Vector((rng.uniform(-0.4, 0.4), rng.uniform(-1.05, -0.5), REVEAL_Z + 0.01)), rng.uniform(0.012, 0.02), 450 + k)

# --------------------------------------------------------------------------------------------- prey remains
def pigeon_wing(p, yaw, seed):
    """A plucked-off pigeon wing: the bony leading edge and ten fanned primaries / secondaries with the two dark bars."""
    for i in range(10):
        a = yaw + 0.9 - i * 0.16
        base = p + Vector((math.cos(yaw) * i * 0.012, math.sin(yaw) * i * 0.012, 0.004 * i))
        feather(base, a - math.pi / 2, 0.13 - abs(i - 2) * 0.006, "pigeonbar" if 4 <= i <= 8 else "pigeon", seed + i, tilt=0.08, bend=0.15)
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=0.012, radius2=0.006, depth=0.12)
    for v in bm.verts: v.co = Matrix.Translation(p + Vector((math.cos(yaw) * 0.06, math.sin(yaw) * 0.06, 0.012))) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "Y") @ v.co
    nest.add_bm(bm, lambda f, v: lin(0x7a5148)); bm.free()

def bone(p, yaw, length, r0, col, seed):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=6, radius1=r0, radius2=r0 * 0.7, depth=length)
    for v in bm.verts:
        k = 1 + 0.5 * max(0.0, abs(v.co.z) / (length / 2) - 0.7)          # knobbly ends
        v.co.x *= k; v.co.y *= k
        v.co = Matrix.Translation(p) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(math.pi / 2, 4, "Y") @ v.co
    nest.add_bm(bm, lambda f, v: jitter(col, 0.05, random.Random(seed))); bm.free()

def keel(p, yaw):
    """A pigeon breastbone: a boat-shaped plate with the keel ridge, picked clean, a little dried meat."""
    bm = bmesh.new()
    pts = []
    for i in range(7):
        t = i / 6
        w = 0.035 * math.sin(math.pi * (0.15 + 0.85 * t)) ** 0.6
        y = (t - 0.5) * 0.09
        pts.append([Vector((-w, y, 0.01)), Vector((0, y, -0.004 - 0.018 * math.sin(math.pi * t))), Vector((w, y, 0.01))])
    vs = [[bm.verts.new(v) for v in row] for row in pts]
    for i in range(6):
        for k in range(2): bm.faces.new((vs[i][k], vs[i + 1][k], vs[i + 1][k + 1], vs[i][k + 1]))
    for v in bm.verts: v.co = Matrix.Translation(p + Vector((0, 0, 0.022))) @ Matrix.Rotation(yaw, 4, "Z") @ Matrix.Rotation(math.pi, 4, "X") @ v.co
    nest.add_bm(bm, lambda f, v: lin(0xd9cdb8) if v.co.z > p.z + 0.012 else lin(0x8a4a3c)); bm.free()

def scrap(p, size, seed):
    """a dried red-brown scrap of meat / skin"""
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=1, radius=1.0)
    r = random.Random(seed)
    for v in bm.verts: v.co = Vector((v.co.x * size * (1 + r.random() * 0.5), v.co.y * size, v.co.z * size * 0.35)) + p
    c = jitter(lin(0x5a2420), 0.15, r)
    nest.add_bm(bm, lambda f, v: c); bm.free()

pigeon_wing(on_gravel(-0.36, 0.2, 0.006), 0.4, 500)
keel(on_gravel(0.32, -0.18), 1.1)
bone(on_gravel(0.2, 0.26, 0.008), 0.3, 0.05, 0.004, lin(0xe2d6c2), 600)
bone(on_gravel(-0.15, -0.3, 0.008), 2.0, 0.04, 0.0035, lin(0xd8ccb6), 601)
bone(Vector((0.18, -0.75, REVEAL_Z + 0.006)), 1.3, 0.045, 0.004, lin(0xdcd0ba), 602)
for k, (x, y) in enumerate([(0.3, -0.12), (-0.25, 0.12), (0.12, 0.28), (-0.05, -0.22)]):
    scrap(on_gravel(x, y, 0.004), rng.uniform(0.008, 0.014), 700 + k)

# --------------------------------------------------------------------------------------------- droppings
def splash(p, r, seed, normal_z=True, drip=0.0):
    """A chalky splash: an irregular flat disc (12 lobes), white with a grey-cream centre; drip > 0 adds a run down."""
    rr = random.Random(seed)
    n = 14
    ring = []
    for i in range(n):
        a = 2 * math.pi * i / n
        k = r * (0.65 + 0.55 * rr.random())
        ring.append(p + Vector((math.cos(a) * k, math.sin(a) * k, 0.0015)))
    centre = p + Vector((0, 0, 0.0025))
    verts = [centre] + ring
    faces = [(0, 1 + i, 1 + (i + 1) % n) for i in range(n)]
    white, cream = lin(0xf1efe8), lin(0xb9b4a6)
    cols = [[cream, white, white] for _ in faces]
    o = len(nest.v); nest.v += [tuple(v) for v in verts]
    for f, c in zip(faces, cols): nest.f.append(tuple(o + i for i in f)); nest.c.append(c)

for k in range(22):                                      # round the rim of the hollow and against the walls
    a = rng.random() * 6.28; d = rng.uniform(0.24, 0.5)
    x, y = SCRAPE.x + math.cos(a) * d, SCRAPE.y + math.sin(a) * d * 0.7
    if abs(x) < hw - 0.05 and abs(y) < hd - 0.05: splash(on_gravel(x, y, 0.012), rng.uniform(0.008, 0.02), 800 + k)
for k in range(14):                                      # the reveal floor (they back out to the edge to mute)
    splash(Vector((rng.uniform(-0.45, 0.45), rng.uniform(-1.08, -0.6), REVEAL_Z)), rng.uniform(0.01, 0.03), 900 + k)
# tray lip splashes
for k in range(10):
    x = rng.uniform(-hw + 0.05, hw - 0.05); y = -hd + BOARD_T / 2 if k % 2 else hd - BOARD_T / 2
    splash(Vector((x, y, TRAY_H + 0.012)), rng.uniform(0.006, 0.012), 950 + k)
# drips over the sill's front edge (the sill ledge: stjob.py Arch.build, 0.16 m tall, 0.14 m proud, at w 0..0.14)
SILL_FRONT = REVEAL_Y1 - 0.09                            # y of the sill ledge's front face (w = +0.14 from the wall face)
for k in range(9):
    x = rng.uniform(-0.6, 0.6); L = rng.uniform(0.06, 0.16); wdt = rng.uniform(0.012, 0.03)
    top = REVEAL_Z + 0.002
    verts = [Vector((x - wdt, SILL_FRONT - 0.002, top)), Vector((x + wdt, SILL_FRONT - 0.002, top)),
             Vector((x + wdt * 0.4, SILL_FRONT - 0.002, top - L)), Vector((x - wdt * 0.4, SILL_FRONT - 0.002, top - L))]
    o = len(nest.v); nest.v += [tuple(v) for v in verts]
    nest.f.append((o, o + 3, o + 2, o + 1)); nest.c.append([lin(0xefede6)] * 3 + [lin(0xcfcbc0)])
    # and across the sill's top (0.14 deep)
    splash(Vector((x, SILL_FRONT + 0.06, REVEAL_Z - 0.0)), wdt * 1.4, 1000 + k)

props = to_object("nest_props", nest)

# --------------------------------------------------------------------------------------------- the carried pigeon
pg = Mesh()
def lathe_mesh(M, profile, segs, col_fn, xf):
    rings = []
    for (r, y) in profile:
        rings.append([xf @ Vector((r * math.cos(2 * math.pi * k / segs), y, r * math.sin(2 * math.pi * k / segs) * 0.85)) for k in range(segs)])
    o = len(M.v)
    for ring in rings: M.v += [tuple(v) for v in ring]
    for i in range(len(rings) - 1):
        for k in range(segs):
            a, b = o + i * segs + k, o + i * segs + (k + 1) % segs
            c, d = o + (i + 1) * segs + (k + 1) % segs, o + (i + 1) * segs + k
            M.f.append((a, d, c, b)); M.c.append([col_fn(M.v[x]) for x in (a, d, c, b)])
GREY, NECK, BAR, PALE = lin(0x8d939d), lin(0x55606a), lin(0x26272c), lin(0xb6bcc4)
body_prof = [(0.0, -0.13), (0.03, -0.12), (0.05, -0.09), (0.058, -0.04), (0.055, 0.02), (0.045, 0.06), (0.03, 0.09), (0.022, 0.11), (0.026, 0.135), (0.022, 0.16), (0.008, 0.175), (0.0, 0.18)]
def pg_col(v):
    y = v[1]
    if y > 0.085: return NECK if y < 0.12 else lin(0x6d7682)        # the iridescent neck, the head
    return GREY if v[2] > -0.01 else PALE
lathe_mesh(pg, body_prof, 12, pg_col, Matrix.Identity(4))
# beak
o = len(pg.v); pg.v += [(0, 0.178, 0.0), (0.006, 0.168, 0.004), (-0.006, 0.168, 0.004), (0, 0.168, -0.006), (0, 0.2, -0.003)]
for f in ((1, 4, 2), (2, 4, 3), (3, 4, 1)): pg.f.append(tuple(o + i for i in f)); pg.c.append([lin(0x3a3436)] * 3)
# folded wings (two sides) with the two dark bars, and the tail fan with its dark band
for s in (-1, 1):
    pts = [Vector((s * 0.05, 0.06, 0.02)), Vector((s * 0.058, -0.02, 0.03)), Vector((s * 0.045, -0.15, 0.02)), Vector((s * 0.02, -0.2, 0.012)),
           Vector((s * 0.035, -0.05, 0.04)), Vector((s * 0.02, 0.05, 0.035))]
    o = len(pg.v); pg.v += [tuple(v) for v in pts]
    tris = [(0, 1, 5), (1, 4, 5), (1, 2, 4), (2, 3, 4)]
    for f in tris:
        f2 = f if s > 0 else tuple(reversed(f))
        cs = [BAR if (pts[i].y < -0.0 and pts[i].y > -0.06) else GREY for i in f2]
        pg.f.append(tuple(o + i for i in f2)); pg.c.append(cs)
        pg.f.append(tuple(o + i for i in reversed(f2))); pg.c.append(list(reversed(cs)))
tail = [Vector((-0.03, -0.12, 0.0)), Vector((0.03, -0.12, 0.0)), Vector((0.05, -0.24, -0.005)), Vector((-0.05, -0.24, -0.005))]
o = len(pg.v); pg.v += [tuple(v) for v in tail]
pg.f += [(o, o + 1, o + 2, o + 3), (o + 3, o + 2, o + 1, o)]; pg.c += [[GREY, GREY, BAR, BAR], [BAR, BAR, GREY, GREY]]
prey = to_object("prey_carry", pg)
prey.location = (0, 0, 0)

# --------------------------------------------------------------------------------------------- AO with the chamber round it
occ = []
def occluder_box(c, s):
    bpy.ops.mesh.primitive_cube_add(size=1, location=c); o = bpy.context.object; o.scale = s; occ.append(o); return o
HI = 3.915                                                # stjob.py tower(): chamber half side (T_H - 0.62)
# the room: floor, ceiling, three walls; the front wall (y = -0.43) with the gap: blocks left / right / above
occluder_box((-1.5, HI - 0.43, -0.05), (2 * HI, 2 * HI, 0.1))                           # the floor (nest at u = 1.5 from the face centre)
occluder_box((-1.5, HI - 0.43, 7.4), (2 * HI, 2 * HI, 0.1))
occluder_box((-1.5, HI * 2 - 0.43 + 0.05, 3.5), (2 * HI, 0.1, 7.0))                   # back wall
occluder_box((-1.5 - HI - 0.05, HI - 0.43, 3.5), (0.1, 2 * HI, 7.0))
occluder_box((-1.5 + HI + 0.05, HI - 0.43, 3.5), (0.1, 2 * HI, 7.0))
# front wall (0.67 m thick from -0.43 to -1.10), its opening: x +-0.52, z 0.50 .. 1.43 (the gap; louvres above)
occluder_box((-(ARCH_HALF + HI + 1.5) / 2, -0.765, 3.5), (HI + 1.5 - ARCH_HALF, 0.67, 7.0))   # left of the gap (to the far corner)
occluder_box(((ARCH_HALF + HI - 1.5) / 2, -0.765, 3.5), (HI - 1.5 - ARCH_HALF, 0.67, 7.0))     # right of it
occluder_box((0, -0.765, REVEAL_Z / 2), (2 * ARCH_HALF, 0.67, REVEAL_Z))                # below the reveal floor
occluder_box((0, -0.765, 1.43 + (7.0 - 1.43) / 2), (2 * ARCH_HALF, 0.67, 7.0 - 1.43))  # the louvres above the gap (as solid)
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 64
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 0.3      # contact shading only: the chamber's darkness is a runtime uniform (falcons.js)
for ob in (props, prey):
    me = ob.data
    ao = me.color_attributes.new("AO", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = ao
    for o in scn.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    for o in occ: o.hide_render = True                      # (the room is a runtime factor; kept for a full-room bake if wanted)
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = [0.0] * (4 * len(me.loops)); ao.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    # keep a floor: the sky through the gap still reaches the gravel (AO 1.5 m inside a room is ~0)
    for i in range(len(me.loops)):
        k = 0.15 + 0.85 * a[4 * i]
        for j in range(3): c[4 * i + j] *= k
    col.data.foreach_set("color", c)
    me.color_attributes.remove(ao)
    me.color_attributes.active_color = me.color_attributes["Col"]
    print(ob.name, "AO baked, mean", round(sum(a[0::4]) / max(1, len(a) // 4), 3))
for o in occ: bpy.data.objects.remove(o)

# --------------------------------------------------------------------------------------------- empties + export
def empty(name, loc, yaw=0.0):
    e = bpy.data.objects.new(name, None); e.location = loc; e.rotation_euler = (0, 0, yaw); scn.collection.objects.link(e); return e
# the eyases: in and round the hollow, facing roughly the opening (-y), not all the same way
E = [empty("chick_0", on_gravel(-0.17, 0.02, -0.01), math.pi + 0.5), empty("chick_1", on_gravel(0.14, -0.05, -0.01), math.pi - 0.35),
     empty("chick_2", on_gravel(0.0, 0.15, -0.01), math.pi + 0.1),
     empty("feed", on_gravel(0.05, -0.27, 0.0), 0.0),      # an adult feeding: on the gravel near the front board, facing in (+y)
     empty("scrape", on_gravel(SCRAPE.x, SCRAPE.y, 0.0)), empty("hop", on_gravel(0.0, -0.3, 0.0), math.pi)]
mat = bpy.data.materials.new("Nest"); mat.use_nodes = True
for ob in (props, prey):
    ob.data.materials.append(mat)
    ob.data.shade_smooth(); ob.data.set_sharp_from_angle(angle=math.radians(38))   # rounded stones, crisp board edges
for o in scn.objects: o.select_set(False)
for o in (props, prey, *E): o.select_set(True)
glb = os.path.join(OUT, "nest.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col", export_all_vertex_colors=False,
                          export_materials="EXPORT", export_image_format="NONE", export_extras=False)
tris = {ob.name: sum(len(p.vertices) - 2 for p in ob.data.polygons) for ob in (props, prey)}
json.dump({"asset": "Saint-Job peregrine eyrie (tools/blender/falconNest.py)", "triangles": tris, "pebbles": n_peb,
           "frame": "origin = stjob.glb node 'nest'; glTF x = right seen from outside, y up, z = outward (tower face normal)",
           "gravel_top": GRAVEL, "reveal_floor": REVEAL_Z,
           "empties": {e.name: [round(e.location.x, 3), round(e.location.z, 3), round(-e.location.y, 3)] for e in E}},
          open(os.path.join(OUT, "nest.json"), "w"), indent=1)
print("exported", glb, os.path.getsize(glb) // 1024, "KB", tris)

# --------------------------------------------------------------------------------------------- preview (Cycles)
if PREV:
    os.makedirs(PREV, exist_ok=True)
    me_mat = mat.node_tree
    bsdf = me_mat.nodes["Principled BSDF"]; attr = me_mat.nodes.new("ShaderNodeVertexColor"); attr.layer_name = "Col"
    me_mat.links.new(attr.outputs["Color"], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = 0.85
    prey.location = (0.75, -0.75, REVEAL_Z + 0.04)
    world = scn.world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.6, 0.68, 0.8, 1)
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 1.0
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(200))
    scn.cycles.samples = 64; scn.cycles.use_denoising = True
    scn.render.resolution_x, scn.render.resolution_y = 1100, 700
    scn.view_settings.view_transform = "AgX"
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    cam.data.lens = 30
    cam.location = Vector((0.5, -1.25, 1.25)); d = Vector((0, 0.0, 0.3)) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(PREV, "nest_preview_blender.png"); bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath)
