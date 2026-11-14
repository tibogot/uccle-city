"""SHOP INTERIORS ATLAS (docs/assets/SHOPS.md): eight shop rooms rendered for INTERIOR MAPPING (no real geometry in the
city: every shop window shows one of these rooms through a ray-box intersection, viewer/shops/shopWindow.js).
Blender 5.0, headless (Cycles, CPU):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/shopInteriors.py -- textures/shops [--samples=48] [--only=bakery,...]

Each room: 6 m wide (x), 5 m deep (+y, into the shop), 3 m high, the shop window = its open front face (y = 0).
  ROOM image  rendered by a pinhole camera F = 3 m in FRONT of the window (on the street side) whose frustum is exactly
              the window rectangle: a point at depth y (m) and window coordinates (x, z) lands on the image at
              u = 0.5 + (x / 3) * s, v = 0.5 + ((z - 1.5) / 1.5) * s, s = F / (F + y). The viewer intersects the view ray
              with the room box and projects the hit point the same way (the "single texture" interior mapping: floor,
              ceiling, side and back walls in one image), so the walls and what stands against them parallax exactly.
  CARD image  the free-standing furniture (counters, tables, rails, a gondola) rendered ALONE by the same camera on a
              transparent film (the room still lights it and takes its shadows); the viewer draws it on a plane at
              CARD_Y (1.4 m in), in front of the room: the counter slides against the back shelves as you walk past.
The atlas (4096 x 2048, sRGB, RGBA): rooms in rows 0-1 (4 x 1024 x 512 each), cards in rows 2-3, same column / row
order; written as PNG, then textures/shops/interiors.ktx2 (UASTC + zstd, tools/shops/encode_interiors.mjs).
Lit as an open shop in the evening (warm or neutral ceiling lights, emissive fixtures): the viewer dims it by day.
Real shop types of Uccle's OSM points (docs/assets/SHOPS.md): bakery, pharmacy, cafe (restaurants / bars), boutique
(clothes / shoes / jewellery), grocery (supermarkets / convenience / greengrocers), office (banks / agencies),
salon (hairdressers / beauty), shop (everything else: books, gifts, florists, hardware).
No brand, no logo: the goods are coloured boxes, bottles, jars, loaves, garments.
"""
import bpy, bmesh, math, os, sys, time, random
from mathutils import Vector, Matrix
import numpy as np

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "textures/shops")
SAMPLES = 48
ONLY = None
for a in ARGS:
    if a.startswith("--samples="): SAMPLES = int(a[10:])
    if a.startswith("--only="): ONLY = a[7:].split(",")
os.makedirs(OUT, exist_ok=True)
T0 = time.time()

ROOMS = ["bakery", "pharmacy", "cafe", "boutique", "grocery", "office", "salon", "shop"]
RW, RD, RH, F, CARD_Y = 6.0, 5.0, 3.0, 3.0, 1.4
PX = (1024, 512)


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"; s.cycles.device = "CPU"; s.cycles.samples = SAMPLES; s.cycles.use_denoising = True
    s.cycles.max_bounces = 6; s.cycles.diffuse_bounces = 3; s.cycles.glossy_bounces = 2; s.cycles.transmission_bounces = 4
    s.view_settings.view_transform = "AgX"; s.view_settings.look = "AgX - Base Contrast"; s.view_settings.exposure = -0.6
    s.render.resolution_x, s.render.resolution_y = PX
    s.world = bpy.data.worlds.new("W"); s.world.use_nodes = True
    s.world.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.022, 0.025, 1)
    return s


# ------------------------------------------------------------------------------------------------ materials
_M = {}


def mat(name, col=(0.5, 0.5, 0.5), rough=0.5, metal=0.0, emit=0.0, ecol=None, alpha=1.0, trans=0.0, attr=False, tiles=None, wood=None):
    key = name
    if key in _M: return _M[key]
    m = bpy.data.materials.new(name); m.use_nodes = True
    nt = m.node_tree; b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*col, 1); b.inputs["Roughness"].default_value = rough; b.inputs["Metallic"].default_value = metal
    if emit > 0:
        b.inputs["Emission Color"].default_value = (*(ecol or col), 1); b.inputs["Emission Strength"].default_value = emit
    if trans > 0: b.inputs["Transmission Weight"].default_value = trans
    if attr:
        a = nt.nodes.new("ShaderNodeVertexColor"); a.layer_name = "Col"
        nt.links.new(a.outputs["Color"], b.inputs["Base Color"])
    if tiles:
        # floor / wall tiles: a brick texture with square bricks (tiles: (size m, colour a, colour b, grout))
        size, ca, cb, gr = tiles
        tc = nt.nodes.new("ShaderNodeTexCoord"); br = nt.nodes.new("ShaderNodeTexBrick")
        br.offset = 0.0; br.inputs["Scale"].default_value = 1.0 / size
        br.inputs["Color1"].default_value = (*ca, 1); br.inputs["Color2"].default_value = (*cb, 1); br.inputs["Mortar"].default_value = (*gr, 1)
        br.inputs["Mortar Size"].default_value = 0.004 / size * 0.5; br.inputs["Brick Width"].default_value = 1.0; br.inputs["Row Height"].default_value = 1.0
        mp = nt.nodes.new("ShaderNodeMapping")
        nt.links.new(tc.outputs["Object"], mp.inputs[0]); nt.links.new(mp.outputs[0], br.inputs["Vector"])
        nt.links.new(br.outputs["Color"], b.inputs["Base Color"])
    if wood:
        # wood planks: a wave texture with noise, stretched along x
        ca, cb = wood
        tc = nt.nodes.new("ShaderNodeTexCoord"); mp = nt.nodes.new("ShaderNodeMapping"); mp.inputs["Scale"].default_value = (0.6, 7.0, 1.0)
        nz = nt.nodes.new("ShaderNodeTexNoise"); nz.inputs["Scale"].default_value = 3.0; nz.inputs["Detail"].default_value = 8.0
        wv = nt.nodes.new("ShaderNodeTexWave"); wv.inputs["Scale"].default_value = 2.0; wv.inputs["Distortion"].default_value = 6.0
        ramp = nt.nodes.new("ShaderNodeValToRGB"); ramp.color_ramp.elements[0].color = (*ca, 1); ramp.color_ramp.elements[1].color = (*cb, 1)
        nt.links.new(tc.outputs["Object"], mp.inputs[0]); nt.links.new(mp.outputs[0], nz.inputs["Vector"]); nt.links.new(mp.outputs[0], wv.inputs["Vector"])
        mix = nt.nodes.new("ShaderNodeMath"); mix.operation = "MULTIPLY"
        nt.links.new(wv.outputs["Fac"], mix.inputs[0]); nt.links.new(nz.outputs["Fac"], mix.inputs[1])
        nt.links.new(mix.outputs[0], ramp.inputs[0]); nt.links.new(ramp.outputs[0], b.inputs["Base Color"])
    _M[key] = m
    return m


# ------------------------------------------------------------------------------------------------ mesh accumulator
class Acc:
    """one mesh per material, faces carrying a per-face colour (attribute 'Col')"""
    def __init__(self):
        self.parts = {}

    def bm(self, m):
        if m.name not in self.parts:
            b = bmesh.new(); b.loops.layers.color.new("Col")
            self.parts[m.name] = (b, m)
        return self.parts[m.name][0]

    def box(self, m, x0, x1, y0, y1, z0, z1, col=(1, 1, 1), bevel=0.0):
        b = bmesh.new()
        bmesh.ops.create_cube(b, size=1.0)
        bmesh.ops.scale(b, vec=(x1 - x0, y1 - y0, z1 - z0), verts=b.verts)
        if bevel > 0:
            bmesh.ops.bevel(b, geom=list(b.edges), offset=min(bevel, 0.45 * min(x1 - x0, y1 - y0, z1 - z0)), segments=2, affect="EDGES", clamp_overlap=True)
        bmesh.ops.translate(b, vec=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), verts=b.verts)
        self.merge(m, b, col)

    def cyl(self, m, x, y, z, r, h, col=(1, 1, 1), segs=12, r2=None, axis="Z"):
        b = bmesh.new()
        bmesh.ops.create_cone(b, cap_ends=True, segments=segs, radius1=r, radius2=r if r2 is None else r2, depth=h)
        if axis == "X": bmesh.ops.rotate(b, verts=b.verts, matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
        if axis == "Y": bmesh.ops.rotate(b, verts=b.verts, matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
        off = Vector((0, 0, h / 2)) if axis == "Z" else Vector((0, 0, 0))
        bmesh.ops.translate(b, vec=Vector((x, y, z)) + off, verts=b.verts)
        for f in b.faces: f.smooth = True
        self.merge(m, b, col)

    def sphere(self, m, x, y, z, r, col=(1, 1, 1), scale=(1, 1, 1), segs=10):
        b = bmesh.new()
        bmesh.ops.create_uvsphere(b, u_segments=segs, v_segments=max(4, segs // 2 + 1), radius=r)
        bmesh.ops.scale(b, vec=scale, verts=b.verts)
        bmesh.ops.translate(b, vec=(x, y, z), verts=b.verts)
        for f in b.faces: f.smooth = True
        self.merge(m, b, col)

    def merge(self, m, b, col):
        tgt = self.bm(m); cl = tgt.loops.layers.color["Col"]
        vm = {v: tgt.verts.new(v.co) for v in b.verts}
        for f in b.faces:
            try: nf = tgt.faces.new([vm[v] for v in f.verts])
            except ValueError: continue
            nf.smooth = f.smooth
            for l in nf.loops: l[cl] = (*col, 1)
        b.free()

    def build(self, name, camera_visible=True):
        objs = []
        for key, (b, m) in self.parts.items():
            me = bpy.data.meshes.new(f"{name}_{key}"); b.to_mesh(me); b.free()
            me.materials.append(m)
            o = bpy.data.objects.new(f"{name}_{key}", me); bpy.context.scene.collection.objects.link(o)
            o.visible_camera = camera_visible
            objs.append(o)
        self.parts = {}
        return objs


R = random.Random(7)


def pick(cols): return cols[R.randrange(len(cols))]


def jitter(c, k=0.12): return tuple(max(0, min(1, v * (1 + R.uniform(-k, k)))) for v in c)


GOODS = [(0.62, 0.08, 0.06), (0.08, 0.22, 0.55), (0.85, 0.75, 0.2), (0.9, 0.9, 0.86), (0.12, 0.45, 0.18), (0.75, 0.35, 0.08), (0.35, 0.12, 0.4), (0.06, 0.06, 0.07), (0.55, 0.62, 0.7), (0.9, 0.55, 0.6)]
PHARMA = [(0.92, 0.92, 0.9), (0.85, 0.88, 0.92), (0.1, 0.45, 0.25), (0.2, 0.35, 0.7), (0.9, 0.85, 0.4), (0.75, 0.2, 0.25), (0.6, 0.75, 0.85)]
FABRIC = [(0.05, 0.05, 0.06), (0.75, 0.72, 0.65), (0.15, 0.2, 0.35), (0.45, 0.08, 0.1), (0.55, 0.45, 0.32), (0.85, 0.83, 0.8), (0.2, 0.3, 0.22), (0.6, 0.5, 0.55)]
BREAD = [(0.62, 0.38, 0.14), (0.55, 0.3, 0.1), (0.7, 0.48, 0.22), (0.45, 0.25, 0.1)]
PASTRY = [(0.75, 0.45, 0.2), (0.85, 0.75, 0.6), (0.35, 0.15, 0.08), (0.8, 0.2, 0.25), (0.9, 0.85, 0.75), (0.6, 0.65, 0.2)]
BOTTLE = [(0.1, 0.25, 0.1), (0.35, 0.18, 0.06), (0.75, 0.7, 0.55), (0.12, 0.12, 0.14), (0.5, 0.08, 0.1)]


# ------------------------------------------------------------------------------------------------ the shell
def shell(A, wall, floor, ceil, back=None, skirting=(0.05, 0.05, 0.05)):
    A.box(floor, -RW / 2 - 0.2, RW / 2 + 0.2, -0.2, RD + 0.2, -0.1, 0.0)
    A.box(ceil, -RW / 2 - 0.2, RW / 2 + 0.2, -0.2, RD + 0.2, RH, RH + 0.1)
    A.box(back or wall, -RW / 2 - 0.2, RW / 2 + 0.2, RD, RD + 0.1, 0, RH)
    for s in (-1, 1):
        A.box(wall, s * RW / 2 if s > 0 else -RW / 2 - 0.1, RW / 2 + 0.1 if s > 0 else -RW / 2, -0.2, RD + 0.2, 0, RH)
    # skirting boards
    sk = mat("skirting", skirting, 0.4)
    A.box(sk, -RW / 2, RW / 2, RD - 0.012, RD, 0, 0.1)
    for s in (-1, 1): A.box(sk, s * RW / 2 - (0.012 if s > 0 else 0), s * RW / 2 + (0 if s > 0 else 0.012), 0, RD, 0, 0.1)


def ceiling_lights(A, kind="panels", warm=False):
    col = (1.0, 0.82, 0.6) if warm else (0.95, 0.97, 1.0)
    e = mat("lamp_warm" if warm else "lamp_cool", col, 0.4, emit=14.0 if kind == "pendants" else 9.0, ecol=col)
    body = mat("lamp_body", (0.06, 0.06, 0.06), 0.4, 0.6)
    if kind == "panels":
        for y in (1.2, 2.8, 4.3):
            for x in (-1.8, 0, 1.8):
                A.box(e, x - 0.3, x + 0.3, y - 0.3, y + 0.3, RH - 0.012, RH - 0.002)
    elif kind == "spots":
        for y in (0.9, 2.1, 3.3, 4.4):
            for x in (-2.2, -0.75, 0.75, 2.2):
                A.cyl(body, x, y, RH - 0.06, 0.045, 0.06)
                A.cyl(e, x, y, RH - 0.065, 0.032, 0.006)
    elif kind == "pendants":
        for y in (1.6, 3.4):
            for x in (-1.6, 0, 1.6):
                A.cyl(body, x, y, RH - 1.0, 0.004, 1.0)
                A.cyl(body, x, y, RH - 1.15, 0.2, 0.15, r2=0.04, segs=20)
                A.sphere(e, x, y, RH - 1.13, 0.06)
    # the real light: soft area lights under the ceiling (+ the emissive fixtures)
    for y in (1.3, 3.3):
        ld = bpy.data.lights.new("area", "AREA"); ld.energy = 520 if not warm else 430; ld.size = 2.2; ld.color = col
        lo = bpy.data.objects.new("area", ld); lo.location = (0, y, RH - 0.05); lo.rotation_euler = (math.pi, 0, 0); lo.visible_camera = False; lo.visible_glossy = False
        bpy.context.scene.collection.objects.link(lo)


def shelves_wall(A, wall_side, palette, x0, x1, y0, y1, z0=0.35, z1=2.3, n=5, depth=0.35, board=None, goods="boxes", density=0.85):
    """a shelving unit against the back wall (wall_side 'back', x0..x1) or a side wall ('left'/'right', y0..y1)"""
    board = board or mat("shelf_white", (0.85, 0.85, 0.83), 0.45)
    g = mat("goods", (1, 1, 1), 0.45, attr=True)
    for k in range(n):
        z = z0 + (z1 - z0) * k / (n - 1)
        if wall_side == "back":
            A.box(board, x0, x1, RD - depth, RD, z - 0.02, z)
        else:
            s = -1 if wall_side == "left" else 1
            xa, xb = sorted((s * RW / 2, s * (RW / 2 - depth)))
            A.box(board, xa, xb, y0, y1, z - 0.02, z)
        if k == n - 1: break
        span = (x0, x1) if wall_side == "back" else (y0, y1)
        t = span[0] + 0.03
        hmax = (z1 - z0) / (n - 1) - 0.05
        while t < span[1] - 0.08:
            w = R.uniform(0.06, 0.16)
            if R.random() < density:
                h = R.uniform(0.5, 0.95) * hmax; d = R.uniform(0.15, depth - 0.04); c = jitter(pick(palette))
                if goods == "bottles":
                    r = w * 0.4
                    if wall_side == "back": A.cyl(g, t + w / 2, RD - depth / 2, z, r, h, c, 10, r2=r * 0.4)
                    else: A.cyl(g, (-1 if wall_side == "left" else 1) * (RW / 2 - depth / 2), t + w / 2, z, r, h, c, 10, r2=r * 0.4)
                else:
                    if wall_side == "back": A.box(g, t, t + w - 0.01, RD - 0.02 - d, RD - 0.02, z, z + h, c)
                    else:
                        s = -1 if wall_side == "left" else 1
                        xa, xb = sorted((s * (RW / 2 - 0.02), s * (RW / 2 - 0.02 - d)))
                        A.box(g, xa, xb, t, t + w - 0.01, z, z + h, c)
            t += w
    # uprights
    up = mat("shelf_upright", (0.2, 0.2, 0.2), 0.4, 0.5)
    if wall_side == "back":
        for x in np.linspace(x0, x1, max(2, int((x1 - x0) / 1.0) + 1)):
            A.box(up, x - 0.015, x + 0.015, RD - depth, RD, z0 - 0.3, z1 + 0.05)
    else:
        s = -1 if wall_side == "left" else 1
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - depth)))
        for y in np.linspace(y0, y1, max(2, int((y1 - y0) / 1.0) + 1)):
            A.box(up, xa, xb, y - 0.015, y + 0.015, z0 - 0.3, z1 + 0.05)


def counter(A, x0, x1, y0, y1, top_col=(0.85, 0.84, 0.8), body_col=(0.3, 0.2, 0.12), h=0.95, glass=False, items=None):
    body = mat(f"counter_{body_col}", body_col, 0.45)
    top = mat(f"top_{top_col}", top_col, 0.25)
    A.box(body, x0, x1, y0, y1, 0.0, h - 0.04, bevel=0.01)
    A.box(top, x0 - 0.02, x1 + 0.02, y0 - 0.02, y1 + 0.02, h - 0.04, h, bevel=0.005)
    if glass:
        gl = mat("display_glass", (0.9, 0.95, 0.95), 0.02, trans=1.0)
        A.box(gl, x0, x1, y0, y0 + 0.01, h, h + 0.35)
        A.box(gl, x0, x1, y0, y1 - 0.25, h + 0.35, h + 0.36)
        lit = mat("display_light", (1, 0.9, 0.75), 0.4, emit=6.0)
        A.box(lit, x0 + 0.05, x1 - 0.05, y0 + 0.1, y1 - 0.3, h + 0.345, h + 0.35)
    if items: items(h)


def till(A, x, y, h):
    k = mat("till", (0.08, 0.08, 0.09), 0.3, 0.3)
    s = mat("screen_on", (0.3, 0.5, 0.7), 0.2, emit=3.0)
    A.box(k, x - 0.15, x + 0.15, y - 0.15, y + 0.15, h, h + 0.06)
    A.box(k, x - 0.02, x + 0.02, y + 0.05, y + 0.08, h + 0.06, h + 0.3)
    A.box(s, x - 0.15, x + 0.15, y + 0.02, y + 0.04, h + 0.25, h + 0.45)


def chair(A, x, y, rot, col=(0.05, 0.05, 0.05), seat=(0.35, 0.22, 0.1)):
    m = mat(f"chair_{col}", col, 0.4, 0.5); s = mat(f"seat_{seat}", seat, 0.6)
    c, sn = math.cos(rot), math.sin(rot)
    P = lambda dx, dy: (x + dx * c - dy * sn, y + dx * sn + dy * c)
    for dx, dy in ((-0.18, -0.18), (0.18, -0.18), (-0.18, 0.18), (0.18, 0.18)):
        px, py = P(dx, dy); A.cyl(m, px, py, 0, 0.012, 0.45)
    A.cyl(s, x, y, 0.45, 0.22, 0.03, segs=16)
    bx, by = P(0, 0.2); A.box(m, bx - 0.2, bx + 0.2, by - 0.015, by + 0.015, 0.45, 0.85)


def table(A, x, y, r=0.35, h=0.74, top=(0.75, 0.73, 0.68)):
    m = mat("table_foot", (0.04, 0.04, 0.04), 0.4, 0.6); t = mat(f"tabletop_{top}", top, 0.3)
    A.cyl(m, x, y, 0, 0.2, 0.03, segs=16); A.cyl(m, x, y, 0, 0.03, h)
    A.cyl(t, x, y, h - 0.03, r, 0.03, segs=24)
    # a glass, a candle
    g = mat("tumbler", (0.85, 0.9, 0.9), 0.05, trans=1.0)
    A.cyl(g, x + 0.1, y - 0.05, h, 0.03, 0.1)


# ------------------------------------------------------------------------------------------------ the rooms
def room_bakery():
    A, C = Acc(), Acc()
    shell(A, mat("tile_cream", (0.85, 0.8, 0.68), 0.3, tiles=(0.15, (0.86, 0.82, 0.7), (0.82, 0.78, 0.66), (0.6, 0.58, 0.55))),
          mat("floor_bw", (0.1, 0.1, 0.1), 0.35, tiles=(0.3, (0.08, 0.08, 0.08), (0.75, 0.74, 0.7), (0.3, 0.3, 0.3))),
          mat("ceil_white", (0.9, 0.9, 0.88), 0.8), back=mat("wood_back", (0.4, 0.25, 0.12), 0.5, wood=((0.35, 0.2, 0.1), (0.5, 0.32, 0.16))))
    rack = mat("rack_wood", (0.45, 0.28, 0.13), 0.5)
    g = mat("goods", (1, 1, 1), 0.55, attr=True)
    # bread racks on the back wall: slanted shelves with loaves, baguettes standing in baskets
    for k in range(4):
        z = 0.9 + k * 0.38
        A.box(rack, -2.6, 2.6, RD - 0.45, RD, z - 0.03, z)
        x = -2.5
        while x < 2.4:
            c = jitter(pick(BREAD), 0.15)
            if R.random() < 0.5: A.sphere(g, x + 0.1, RD - 0.22, z + 0.08, 0.12, c, (1.1, 1.0, 0.7))
            else: A.sphere(g, x + 0.12, RD - 0.22, z + 0.07, 0.09, c, (2.2, 0.9, 0.75))
            x += R.uniform(0.16, 0.24)
    for x in (-2.0, -0.6, 0.8, 2.1):
        A.box(rack, x - 0.25, x + 0.25, RD - 0.4, RD - 0.1, 0.4, 0.75)
        for k in range(9):
            A.cyl(g, x - 0.2 + (k % 5) * 0.1, RD - 0.3 + (k // 5) * 0.12, 0.75, 0.03, 0.55, jitter((0.65, 0.42, 0.18)), 8, axis="Z")
    A.box(mat("tile_cream", (0, 0, 0), 0), -2.6, 2.6, RD - 0.02, RD, 0.0, 0.0)  # (no-op keeps the material listed)
    ceiling_lights(A, "pendants", warm=True)
    # CARD: the glass counter with pastries, the till
    def items(h):
        for k in range(26):
            x = -2.2 + (k % 13) * 0.33; y = 1.2 + (k // 13) * 0.22
            C.sphere(g, x, y, h + 0.04, 0.06, jitter(pick(PASTRY)), (1.3, 1.0, 0.6))
        till(C, 2.3, 1.55, h)
    counter(C, -2.5, 2.7, 1.0, 1.75, (0.9, 0.9, 0.88), (0.85, 0.83, 0.78), glass=True, items=items)
    return A, C


def room_pharmacy():
    A, C = Acc(), Acc()
    wall = mat("wall_white", (0.88, 0.88, 0.87), 0.6)
    shell(A, wall, mat("floor_grey", (0.6, 0.6, 0.58), 0.3, tiles=(0.6, (0.62, 0.62, 0.6), (0.58, 0.58, 0.56), (0.45, 0.45, 0.45))), mat("ceil_white", (0.9, 0.9, 0.88), 0.8))
    for side in ("left", "right"): shelves_wall(A, side, PHARMA, 0, 0, 0.3, RD - 0.1, n=7, depth=0.4, density=0.95)
    shelves_wall(A, "back", PHARMA, -2.6, 2.6, 0, 0, n=7, depth=0.4, density=0.95)
    green = mat("pharma_green", (0.05, 0.5, 0.15), 0.3, emit=2.0)
    A.box(green, -0.4, 0.4, RD - 0.03, RD - 0.01, 2.45, 2.55); A.box(green, -0.05, 0.05, RD - 0.03, RD - 0.01, 2.15, 2.85)
    ceiling_lights(A, "panels")
    def items(h):
        till(C, -1.6, 1.6, h); till(C, 1.0, 1.6, h)
        g = mat("goods", (1, 1, 1), 0.45, attr=True)
        for k in range(10): C.box(g, -0.6 + k * 0.1, -0.52 + k * 0.1, 1.3, 1.4, h, h + R.uniform(0.08, 0.2), jitter(pick(PHARMA)))
    counter(C, -2.4, 2.4, 1.3, 1.9, (0.92, 0.92, 0.9), (0.9, 0.9, 0.88), items=items)
    # a free-standing gondola in front of the counter, left
    shelves_unit(C, -2.2, -1.0, 0.7, 1.0, PHARMA)
    return A, C


def shelves_unit(A, x0, x1, y0, y1, palette, n=4, h=1.4):
    b = mat("shelf_white", (0.85, 0.85, 0.83), 0.45); g = mat("goods", (1, 1, 1), 0.45, attr=True)
    A.box(b, x0, x1, y0, y1, 0, 0.12)
    A.box(b, x0, x1, (y0 + y1) / 2 - 0.02, (y0 + y1) / 2 + 0.02, 0, h)
    for k in range(n):
        z = 0.12 + k * (h - 0.12) / n
        A.box(b, x0, x1, y0, y1, z, z + 0.02)
        t = x0 + 0.02
        while t < x1 - 0.08:
            w = R.uniform(0.06, 0.14)
            A.box(g, t, t + w - 0.01, y0 + 0.02, y0 + 0.14, z + 0.02, z + 0.02 + R.uniform(0.12, 0.26), jitter(pick(palette)))
            t += w


def room_cafe():
    A, C = Acc(), Acc()
    panel = mat("wood_panel", (0.3, 0.17, 0.08), 0.45, wood=((0.22, 0.12, 0.05), (0.38, 0.22, 0.1)))
    wall = mat("wall_ochre", (0.62, 0.48, 0.32), 0.75)
    shell(A, wall, mat("floor_wood", (0.3, 0.18, 0.09), 0.4, wood=((0.2, 0.11, 0.05), (0.36, 0.21, 0.1))), mat("ceil_dark", (0.35, 0.3, 0.25), 0.8))
    for s in (-1, 1):                                       # wainscot
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.03)))
        A.box(panel, xa, xb, 0, RD, 0, 1.1)
    A.box(panel, -RW / 2, RW / 2, RD - 0.03, RD, 0, 1.1)
    # the bar along the back: counter, back shelves with bottles, a mirror
    counter(A, -2.6, 1.8, RD - 1.3, RD - 0.75, (0.12, 0.08, 0.05), (0.3, 0.17, 0.08), h=1.08)
    mirror = mat("mirror", (0.8, 0.8, 0.8), 0.05, 1.0)
    A.box(mirror, -2.4, 1.6, RD - 0.03, RD - 0.01, 1.35, 2.3)
    shelves_wall(A, "back", BOTTLE, -2.5, 1.7, 0, 0, z0=1.25, z1=2.15, n=3, depth=0.25, board=mat("glass_shelf", (0.7, 0.75, 0.75), 0.1), goods="bottles")
    tap = mat("chrome", (0.8, 0.8, 0.8), 0.15, 1.0)
    for x in (-1.2, -1.0, -0.8): A.cyl(tap, x, RD - 1.15, 1.08, 0.02, 0.35)
    # a few tables + chairs at the back (the card has the near ones)
    for x, y in ((2.3, 3.6), (2.3, 2.4)):
        table(A, x, y); chair(A, x - 0.45, y, -math.pi / 2); chair(A, x + 0.0, y + 0.5, math.pi)
    ceiling_lights(A, "pendants", warm=True)
    # wall lamps
    wl = mat("lamp_warm", (1.0, 0.82, 0.6), 0.4, emit=14.0)
    for y in (1.0, 2.5, 4.0):
        for s in (-1, 1): A.sphere(wl, s * (RW / 2 - 0.12), y, 1.9, 0.08)
    for x, y in ((-1.9, 1.3), (-0.2, 1.4), (1.6, 1.2)):
        table(C, x, y); chair(C, x - 0.45, y, -math.pi / 2); chair(C, x + 0.45, y, math.pi / 2); chair(C, x, y + 0.48, math.pi)
    return A, C


def room_boutique():
    A, C = Acc(), Acc()
    wall = mat("wall_warmwhite", (0.86, 0.84, 0.8), 0.7)
    shell(A, wall, mat("floor_oak", (0.55, 0.4, 0.25), 0.35, wood=((0.48, 0.34, 0.2), (0.62, 0.46, 0.3))), mat("ceil_white", (0.9, 0.9, 0.88), 0.8))
    rail = mat("chrome", (0.8, 0.8, 0.8), 0.15, 1.0)
    cloth = mat("fabric", (1, 1, 1), 0.85, attr=True)
    # hanging rails along both side walls + the back: garments as thin slabs (shoulders rounded)
    def rail_run(side):
        if side == "back":
            A.cyl(rail, -2.4, RD - 0.3, 1.65, 0.012, 4.8, axis="X")
            for k in range(30):
                x = -2.3 + k * 0.155; c = jitter(pick(FABRIC))
                A.box(cloth, x - 0.02, x + 0.02, RD - 0.55, RD - 0.05, 0.75 + R.uniform(0, 0.25), 1.6, c, bevel=0.015)
        else:
            s = -1 if side == "left" else 1
            A.cyl(rail, s * (RW / 2 - 0.3), 0.6, 1.65, 0.012, 3.8, axis="Y")
            for k in range(22):
                y = 0.7 + k * 0.17; c = jitter(pick(FABRIC))
                A.box(cloth, s * (RW / 2 - 0.55), s * (RW / 2 - 0.05), y - 0.02, y + 0.02, 0.8 + R.uniform(0, 0.3), 1.6, c, bevel=0.015)
    rail_run("left"); rail_run("right"); rail_run("back")
    shelves_wall(A, "back", FABRIC, -1.2, 1.2, 0, 0, z0=1.95, z1=2.6, n=2, depth=0.4)
    ceiling_lights(A, "spots", warm=True)
    # CARD: a display table with folded stacks + a mannequin
    t = mat("display_table", (0.7, 0.66, 0.6), 0.4)
    C.box(t, -1.0, 0.8, 1.1, 1.8, 0, 0.75, bevel=0.01)
    for k in range(8):
        x = -0.9 + (k % 4) * 0.42; y = 1.25 + (k // 4) * 0.3
        C.box(cloth, x, x + 0.32, y, y + 0.24, 0.75, 0.75 + R.uniform(0.08, 0.2), jitter(pick(FABRIC)), bevel=0.01)
    body = mat("mannequin", (0.85, 0.84, 0.82), 0.4)
    C.cyl(rail, 1.8, 1.4, 0, 0.15, 0.02); C.cyl(rail, 1.8, 1.4, 0, 0.012, 1.0)
    C.sphere(cloth, 1.8, 1.4, 1.3, 0.2, jitter(pick(FABRIC)), (1.0, 0.65, 1.6))
    C.sphere(body, 1.8, 1.4, 1.72, 0.09, (1, 1, 1), (0.9, 0.9, 1.2))
    return A, C


def room_grocery():
    A, C = Acc(), Acc()
    wall = mat("wall_white", (0.88, 0.88, 0.87), 0.6)
    shell(A, wall, mat("floor_vinyl", (0.55, 0.53, 0.5), 0.3, tiles=(0.4, (0.56, 0.54, 0.5), (0.5, 0.48, 0.45), (0.4, 0.4, 0.4))), mat("ceil_white", (0.9, 0.9, 0.88), 0.8))
    for side in ("left", "right"): shelves_wall(A, side, GOODS, 0, 0, 0.3, RD - 1.2, n=6, depth=0.45, density=0.95, board=mat("shelf_grey", (0.55, 0.56, 0.57), 0.4, 0.3))
    # fridges along the back: glass doors over lit shelves of drinks
    frame = mat("fridge_frame", (0.12, 0.12, 0.13), 0.35, 0.5)
    lit = mat("fridge_light", (0.95, 0.97, 1.0), 0.4, emit=5.0)
    g = mat("goods", (1, 1, 1), 0.45, attr=True)
    A.box(frame, -2.8, 2.8, RD - 0.7, RD, 0, 0.2); A.box(frame, -2.8, 2.8, RD - 0.7, RD, 2.1, 2.3)
    for k in range(5):
        z = 0.35 + k * 0.36
        A.box(lit, -2.7, 2.7, RD - 0.65, RD - 0.05, z - 0.015, z)
        x = -2.65
        while x < 2.6:
            A.cyl(g, x + 0.04, RD - 0.4, z, 0.035, R.uniform(0.18, 0.28), jitter(pick(BOTTLE + GOODS)), 8)
            x += 0.09
    for x in np.linspace(-2.8, 2.8, 7): A.box(frame, x - 0.03, x + 0.03, RD - 0.72, RD - 0.62, 0.2, 2.1)
    # greengrocer crates at the side front
    crate = mat("crate_wood", (0.5, 0.36, 0.2), 0.7)
    for k in range(3):
        y = 0.5 + k * 0.55
        A.box(crate, RW / 2 - 0.95, RW / 2 - 0.5, y, y + 0.5, 0.5, 0.75)
        for j in range(12):
            A.sphere(g, RW / 2 - 0.9 + (j % 4) * 0.1, y + 0.08 + (j // 4) * 0.15, 0.8, 0.05, jitter(pick([(0.7, 0.1, 0.05), (0.85, 0.6, 0.1), (0.3, 0.55, 0.15)])))
    ceiling_lights(A, "panels")
    # CARD: a gondola (double-sided shelf unit) running into the shop + the checkout
    shelves_unit(C, -1.6, 0.6, 1.2, 1.7, GOODS, n=5, h=1.6)
    def items(h): till(C, 2.2, 1.7, h)
    counter(C, 1.5, 2.8, 1.4, 2.0, (0.2, 0.2, 0.22), (0.35, 0.35, 0.37), items=items)
    return A, C


def room_office():
    A, C = Acc(), Acc()
    wall = mat("wall_cool", (0.82, 0.83, 0.84), 0.6)
    shell(A, wall, mat("carpet", (0.18, 0.19, 0.21), 0.95), mat("ceil_white", (0.9, 0.9, 0.88), 0.8))
    # back wall: a row of framed listings / posters (coloured panels), a screen
    fr = mat("frame_black", (0.04, 0.04, 0.04), 0.4)
    ph = mat("goods", (1, 1, 1), 0.45, attr=True)
    for row in range(2):
        for k in range(7):
            x = -2.55 + k * 0.73; z = 1.25 + row * 0.62
            A.box(fr, x, x + 0.6, RD - 0.03, RD - 0.01, z, z + 0.5)
            A.box(ph, x + 0.03, x + 0.57, RD - 0.035, RD - 0.03, z + 0.2, z + 0.47, jitter(pick([(0.45, 0.55, 0.65), (0.6, 0.5, 0.4), (0.35, 0.45, 0.3), (0.75, 0.72, 0.68)])))
            A.box(ph, x + 0.03, x + 0.57, RD - 0.035, RD - 0.03, z + 0.03, z + 0.18, (0.92, 0.92, 0.9))
    # side wall: brochure rack + a plant
    shelves_wall(A, "left", PHARMA, 0, 0, 1.0, 3.5, z0=0.8, z1=1.6, n=3, depth=0.25)
    pot = mat("pot", (0.15, 0.15, 0.15), 0.6); leaf = mat("leaf", (0.06, 0.18, 0.05), 0.7)
    A.cyl(pot, 2.5, 4.4, 0, 0.2, 0.4); A.sphere(leaf, 2.5, 4.4, 0.9, 0.35, (1, 1, 1), (1, 1, 1.4))
    ceiling_lights(A, "panels")
    # CARD: two desks with screens and chairs
    desk = mat("desk", (0.85, 0.85, 0.84), 0.4)
    scr = mat("screen_on", (0.3, 0.5, 0.7), 0.2, emit=3.0)
    blk = mat("till", (0.08, 0.08, 0.09), 0.3, 0.3)
    for x in (-1.5, 1.2):
        C.box(desk, x - 0.8, x + 0.8, 1.1, 1.85, 0.72, 0.75);
        for s in (-1, 1): C.box(desk, x + s * 0.75 - 0.02, x + s * 0.75 + 0.02, 1.1, 1.85, 0, 0.72)
        C.box(blk, x - 0.3, x + 0.3, 1.65, 1.68, 0.85, 1.2); C.box(scr, x - 0.28, x + 0.28, 1.645, 1.65, 0.87, 1.18)
        C.box(blk, x - 0.03, x + 0.03, 1.66, 1.7, 0.75, 0.86)
        chair(C, x, 2.2, math.pi, (0.05, 0.05, 0.05), (0.08, 0.08, 0.09))
        chair(C, x - 0.35, 0.8, 0, (0.05, 0.05, 0.05), (0.08, 0.08, 0.09))
    return A, C


def room_salon():
    A, C = Acc(), Acc()
    wall = mat("wall_grey", (0.55, 0.55, 0.53), 0.65)
    shell(A, wall, mat("floor_concrete", (0.4, 0.4, 0.39), 0.5), mat("ceil_white", (0.9, 0.9, 0.88), 0.8), back=mat("wall_dark", (0.08, 0.08, 0.085), 0.6))
    mirror = mat("mirror", (0.8, 0.8, 0.8), 0.05, 1.0)
    fr = mat("frame_brass", (0.55, 0.4, 0.15), 0.3, 1.0)
    for s in (-1, 1):                                      # mirror stations on both side walls with a shelf
        for k in range(3):
            y = 0.9 + k * 1.35
            xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.03)))
            A.box(fr, xa, xb, y - 0.4, y + 0.4, 0.95, 2.05)
            xa, xb = sorted((s * (RW / 2 - 0.03), s * (RW / 2 - 0.035)))
            A.box(mirror, xa, xb, y - 0.37, y + 0.37, 0.98, 2.02)
            xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.25)))
            A.box(fr, xa, xb, y - 0.4, y + 0.4, 0.88, 0.9)
            chair(A, s * (RW / 2 - 0.75), y, -s * math.pi / 2, (0.06, 0.06, 0.06), (0.06, 0.06, 0.065))
    shelves_wall(A, "back", PHARMA, -1.5, 1.5, 0, 0, z0=1.0, z1=2.0, n=3, depth=0.25)
    ceiling_lights(A, "spots", warm=True)
    # CARD: the reception desk + a washbasin chair
    def items(h): till(C, 1.4, 1.3, h)
    counter(C, 0.6, 2.2, 1.0, 1.55, (0.9, 0.9, 0.88), (0.08, 0.08, 0.085), h=1.05, items=items)
    pl = mat("leaf", (0.06, 0.18, 0.05), 0.7); pot = mat("pot", (0.15, 0.15, 0.15), 0.6)
    C.cyl(pot, -2.3, 1.2, 0, 0.18, 0.45); C.sphere(pl, -2.3, 1.2, 0.95, 0.3, (1, 1, 1), (1, 1, 1.5))
    return A, C


def room_shop():
    A, C = Acc(), Acc()
    wall = mat("wall_warmwhite", (0.86, 0.84, 0.8), 0.7)
    shell(A, wall, mat("floor_oak", (0.55, 0.4, 0.25), 0.35, wood=((0.48, 0.34, 0.2), (0.62, 0.46, 0.3))), mat("ceil_white", (0.9, 0.9, 0.88), 0.8))
    wood = mat("shelf_wood", (0.42, 0.27, 0.14), 0.5)
    for side in ("left", "right"): shelves_wall(A, side, GOODS, 0, 0, 0.3, RD - 0.2, n=6, depth=0.35, board=wood, density=0.9)
    shelves_wall(A, "back", GOODS, -2.7, 2.7, 0, 0, n=6, depth=0.35, board=wood, density=0.9)
    ceiling_lights(A, "spots", warm=True)
    t = mat("display_table", (0.42, 0.27, 0.14), 0.5)
    C.box(t, -1.4, 0.4, 1.2, 1.9, 0, 0.8, bevel=0.01)
    g = mat("goods", (1, 1, 1), 0.45, attr=True)
    for k in range(14):
        x = -1.35 + (k % 7) * 0.25; y = 1.3 + (k // 7) * 0.3
        C.box(g, x, x + 0.2, y, y + 0.22, 0.8, 0.8 + R.uniform(0.03, 0.18), jitter(pick(GOODS)), bevel=0.004)
    def items(h): till(C, 2.0, 1.6, h)
    counter(C, 1.2, 2.7, 1.3, 1.9, (0.42, 0.27, 0.14), (0.35, 0.22, 0.11), items=items)
    return A, C


BUILD = {"bakery": room_bakery, "pharmacy": room_pharmacy, "cafe": room_cafe, "boutique": room_boutique,
         "grocery": room_grocery, "office": room_office, "salon": room_salon, "shop": room_shop}


def camera():
    s = bpy.context.scene
    cd = bpy.data.cameras.new("cam"); cd.sensor_fit = "HORIZONTAL"; cd.sensor_width = 36.0
    cd.lens = 18.0 * F / (RW / 2)          # horizontal half-angle: tan = (RW / 2) / F
    cd.clip_start = 0.05; cd.clip_end = 50
    c = bpy.data.objects.new("cam", cd); s.collection.objects.link(c); s.camera = c
    c.location = (0, -F, RH / 2); c.rotation_euler = (math.pi / 2, 0, 0)   # looking +Y
    return c


def render_room(name):
    s = reset(); _M.clear()
    R.seed(hash(name) & 0xffff)
    A, C = BUILD[name]()
    room = A.build(name + "_room", True)
    card = C.build(name + "_card", True)
    camera()
    out = {}
    # ROOM: the card's furniture lights / shadows but is not seen
    for o in card: o.hide_render = True                     # (its own contact shadows would not follow the parallax)
    s.render.film_transparent = False
    s.render.image_settings.file_format = "PNG"; s.render.image_settings.color_mode = "RGBA"
    s.render.filepath = os.path.join(OUT, f"_work/{name}_room.png")
    t = time.time(); bpy.ops.render.render(write_still=True); print(f"{name} room {time.time() - t:.0f}s")
    # CARD: only the free-standing furniture, transparent film
    for o in card: o.hide_render = False; o.visible_camera = True
    for o in room: o.visible_camera = False; o.visible_transmission = False
    s.render.film_transparent = True
    s.render.filepath = os.path.join(OUT, f"_work/{name}_card.png")
    t = time.time(); bpy.ops.render.render(write_still=True); print(f"{name} card {time.time() - t:.0f}s")


os.makedirs(os.path.join(OUT, "_work"), exist_ok=True)
for n in ROOMS:
    if ONLY and n not in ONLY: continue
    render_room(n)

# ------------------------------------------------------------------------------------------------ the atlas
W, Hh = PX
atlas = np.zeros((Hh * 4, W * 4, 4), dtype=np.float32)
for i, n in enumerate(ROOMS):
    col, row = i % 4, i // 4
    for kind, r0 in (("room", 0), ("card", 2)):
        p = os.path.join(OUT, f"_work/{n}_{kind}.png")
        if not os.path.exists(p): continue
        img = bpy.data.images.load(p)
        a = np.array(img.pixels[:], dtype=np.float32).reshape(Hh, W, 4)       # bottom row first (Blender)
        y0 = (r0 + row) * Hh
        atlas[y0:y0 + Hh, col * W:(col + 1) * W] = a
        bpy.data.images.remove(img)
# Blender pixels: row 0 = the bottom; the atlas is written so that v = 0 is the BOTTOM of the image (the viewer flips)
im = bpy.data.images.new("interiors", W * 4, Hh * 4, alpha=True)
im.pixels.foreach_set(atlas.ravel())
im.filepath_raw = os.path.join(OUT, "interiors.png"); im.file_format = "PNG"
im.save()
print(f"atlas {os.path.join(OUT, 'interiors.png')}  done {time.time() - T0:.0f}s")
