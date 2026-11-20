"""SHOP INTERIORS ATLAS (docs/assets/SHOPS.md): eight shop rooms rendered for INTERIOR MAPPING (no real geometry in the
city: every shop window shows one of these rooms through a ray-box intersection, viewer/shops/shopWindow.js).
Blender 5.0, headless (Cycles on the OptiX GPU, gpu_setup):

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/shopInteriors.py -- textures/shops [--samples=48] [--only=bakery,...]

V2 (Shops v2, the layered café / restaurant: see the V2 section below, docs/assets/SHOPS.md §3b), ~2 min on the RTX 4050:

    blender.exe --factory-startup -b -P tools/blender/shopInteriors.py -- textures/shops --v2 --samples=128 [--only=cafe] [--layers=L0,comp]
    python tools/shops/pack_v2.py
    node tools/shops/encode_array.mjs textures/shops/_work/v2/slices textures/shops/interiors_v2.ktx2      (~3 min, RDO)

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
from mathutils import Vector, Matrix, Euler
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


def gpu_setup(s):
    """Cycles on the OptiX GPU (RTX 4050; CUDA, then CPU as fallbacks). --factory-startup resets the preferences to the
    CPU, so every reset() sets the device again (the OptiX rule, memory blender-gpu-optix)."""
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    s.cycles.device = "GPU"; print("Cycles device:", kind); return
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    s.cycles.device = "CPU"; print("Cycles device: CPU (no OptiX / CUDA found)")


def reset():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    s = bpy.context.scene
    s.render.engine = "CYCLES"; gpu_setup(s); s.cycles.samples = SAMPLES; s.cycles.use_denoising = True
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

    def sphere(self, m, x, y, z, r, col=(1, 1, 1), scale=(1, 1, 1), segs=10, rot=None):
        b = bmesh.new()
        bmesh.ops.create_uvsphere(b, u_segments=segs, v_segments=max(4, segs // 2 + 1), radius=r)
        bmesh.ops.scale(b, vec=scale, verts=b.verts)
        if rot: bmesh.ops.rotate(b, verts=b.verts, matrix=rot.to_matrix())
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


# ================================================================================================ V2 (cafe / restaurant)
# Shops v2 (docs/SHOPS_V2_PLAN.md jobs 3-4, docs/assets/SHOPS.md §3b, rule shop-room-layers): the Forza Horizon 4
# layered interior. Per variant (a café, a brasserie / restaurant) and per lighting (day, night), FIVE renders by the
# same pinhole camera (F = 3 m in front of the 6 m wide x 3 m high window), the room RD2 = 6 m deep (the café's depth:
# viewer/shops/shopScale.js DEPTH.cafe, so the viewer's room = the render's room, no depth scaling):
#   L0  the room shell: walls, floor, ceiling, the bar and its back shelves, the wall banquette: everything that stands
#       against a wall. The free-standing tables / chairs / pendants are in the scene but INVISIBLE to the camera
#       (visible_camera = False): they still cast their shadows and AO on the floor, so the floor keeps its contact
#       shadows and no table is painted onto it.
#   L1  the mid card: the furniture whose group centre is 1.8-3.5 m deep (drawn by the viewer on a plane at 2.6 m)
#   L2  the near card: 0.6-1.8 m (plane 1.2 m)
#   L3  the window display: 0-0.6 m, below 1.45 m (plane 0.3 m): a menu board, plants, cakes; it projects into the
#       image's lower half only, so the packer (tools/shops/pack_v2.py) puts the COMPOSITE (everything visible, the
#       viewer's single fetch beyond 40 m) into the upper half at half height.
#   Cards: transparent film, every other object invisible to the camera but lighting / shadowing them.
# Day: a sun through the front (a sun patch on the floor, shaped by an invisible fascia / piers) + the sky through the
# glass + the shop lights; night: the lamps only.
V2 = any(a == "--v2" for a in ARGS)
RD2 = 6.0
V2_VARIANTS = ["cafe", "brasserie"]
V2_LIGHTS = ["day", "night"]
V2_SLABS = [(1.8, 3.5), (0.6, 1.8), (0.0, 0.6)]          # L1, L2, L3 (group centre depth, m)
V2_PLANES = [2.6, 1.2, 0.3]                               # where the viewer draws them (viewer/shops/shopScale.js V2)
V2_PX = (1024, 512)


class Layers:
    """one Acc per layer: L0 (the shell) and the three slabs; put(y) = the Acc for a free-standing group centred y deep"""
    def __init__(self):
        self.A = [Acc(), Acc(), Acc(), Acc()]

    def put(self, y):
        for k, (a, b) in enumerate(V2_SLABS):
            if a <= y < b: return self.A[k + 1]
        raise ValueError(f"no slab for a free-standing group at {y} m (keep them within 0-3.5 m)")


def v2_shell(A, wall, floor, ceil, back=None):
    A.box(floor, -RW / 2 - 0.2, RW / 2 + 0.2, -0.2, RD2 + 0.2, -0.1, 0.0)
    A.box(ceil, -RW / 2 - 0.2, RW / 2 + 0.2, -0.2, RD2 + 0.2, RH, RH + 0.1)
    A.box(back or wall, -RW / 2 - 0.2, RW / 2 + 0.2, RD2, RD2 + 0.1, 0, RH)
    A.box(wall, -RW / 2 - 0.1, -RW / 2, -0.2, RD2 + 0.2, 0, RH)
    A.box(wall, RW / 2, RW / 2 + 0.1, -0.2, RD2 + 0.2, 0, RH)
    # a moulded cornice under the ceiling
    cor = mat("cornice", (0.86, 0.84, 0.78), 0.6)
    A.box(cor, -RW / 2, RW / 2, RD2 - 0.08, RD2, RH - 0.12, RH, bevel=0.02)
    for s in (-1, 1):
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.08)))
        A.box(cor, xa, xb, 0, RD2, RH - 0.12, RH, bevel=0.02)


def v2_front_occluder():
    """the façade round the glass (a fascia over 2.45 m, piers at the sides, the sill): invisible to the camera, it
    shapes the daylight (the sun patch and the sky light come in through the glass only)"""
    A = Acc(); m = mat("facade_hidden", (0.4, 0.38, 0.35), 0.8)
    A.box(m, -RW / 2 - 1, RW / 2 + 1, -0.35, -0.05, 2.45, RH + 1.0)
    for s in (-1, 1): A.box(m, s * (RW / 2 + 0.6) - 0.6, s * (RW / 2 + 0.6) + 0.6, -0.35, -0.05, -0.2, RH + 1.0)
    A.box(m, -RW / 2 - 1, RW / 2 + 1, -0.35, -0.05, -0.3, 0.05)
    for x in (-1.5, 0.4, 1.9): A.box(m, x - 0.05, x + 0.05, -0.3, -0.1, 0, 2.45)      # glazing bars: the patch's stripes
    A.box(m, -RW / 2 - 1, RW / 2 + 1, -0.3, -0.1, 2.0, 2.08)                          # the transom
    return A.build("front", False)


def bentwood_chair(A, x, y, rot, wood=(0.12, 0.06, 0.03), seat=(0.16, 0.08, 0.04)):
    """a Thonet-like bistro chair: round seat, four tapered legs, a leg ring, two back posts and a bent top rail"""
    m = mat(f"bent_{wood}", wood, 0.35); s = mat(f"bentseat_{seat}", seat, 0.45)
    c, sn = math.cos(rot), math.sin(rot)
    P = lambda dx, dy: (x + dx * c - dy * sn, y + dx * sn + dy * c)
    for dx, dy in ((-0.17, -0.15), (0.17, -0.15), (-0.15, 0.16), (0.15, 0.16)):
        px, py = P(dx, dy); A.cyl(m, px, py, 0, 0.014, 0.46, r2=0.011, segs=8)
    A.cyl(m, x, y, 0.2, 0.17, 0.012, segs=20)
    A.cyl(s, x, y, 0.45, 0.21, 0.035, segs=24)
    for dx in (-0.16, 0.16):
        px, py = P(dx, 0.19); A.cyl(m, px, py, 0.46, 0.014, 0.4, segs=8)
    for k in range(17):                                     # the bent top rail: an arc of overlapping beads
        a0 = math.pi * k / 16
        px, py = P(-0.16 * math.cos(a0), 0.19 + 0.05 * math.sin(a0))
        A.sphere(m, px, py, 0.86 + 0.06 * math.sin(a0), 0.02, segs=8)
    for k in range(9):                                      # the second, lower rail
        a0 = math.pi * k / 8
        px, py = P(-0.16 * math.cos(a0), 0.19 + 0.03 * math.sin(a0))
        A.sphere(m, px, py, 0.68, 0.012, segs=6)


def marble_table(A, x, y, r=0.32, h=0.75, top=(0.86, 0.85, 0.82)):
    """a round marble bistro table on a cast-iron foot, a cup on its saucer"""
    foot = mat("cast_iron", (0.03, 0.03, 0.03), 0.45, 0.7); t = mat(f"marble_{top}", top, 0.18)
    A.cyl(mat("cast_iron_contact", (0.03, 0.03, 0.03), 0.45, 0.7), x, y, 0, 0.22, 0.025, segs=20, r2=0.18); A.cyl(foot, x, y, 0.02, 0.035, h - 0.06, r2=0.025, segs=12)
    A.cyl(foot, x, y, h - 0.06, 0.1, 0.03, segs=12)
    A.cyl(t, x, y, h - 0.03, r, 0.03, segs=32)
    cup = mat("porcelain", (0.92, 0.91, 0.88), 0.2)
    A.cyl(cup, x + 0.1, y - 0.06, h, 0.07, 0.008, segs=16); A.cyl(cup, x + 0.1, y - 0.06, h + 0.008, 0.04, 0.06, r2=0.033, segs=16)


def square_table(A, x, y, w=0.75, h=0.76):
    """a brasserie table: a white cloth with its drop, plates, cutlery, wine glasses, a bottle"""
    leg = mat("table_leg_contact", (0.08, 0.05, 0.03), 0.4)
    for dx in (-1, 1):
        for dy in (-1, 1): A.box(leg, x + dx * (w / 2 - 0.06) - 0.025, x + dx * (w / 2 - 0.06) + 0.025, y + dy * (w / 2 - 0.06) - 0.025, y + dy * (w / 2 - 0.06) + 0.025, 0, h - 0.03)
    c = mat("tablecloth", (0.9, 0.89, 0.86), 0.75)
    A.box(c, x - w / 2 - 0.01, x + w / 2 + 0.01, y - w / 2 - 0.01, y + w / 2 + 0.01, h - 0.02, h, bevel=0.008)
    for s in (-1, 1):
        A.box(c, x - w / 2 - 0.012, x + w / 2 + 0.012, y + s * (w / 2 + 0.006) - 0.004, y + s * (w / 2 + 0.006) + 0.004, h - 0.3, h)
        A.box(c, x + s * (w / 2 + 0.006) - 0.004, x + s * (w / 2 + 0.006) + 0.004, y - w / 2 - 0.012, y + w / 2 + 0.012, h - 0.3, h)
    pl = mat("porcelain", (0.92, 0.91, 0.88), 0.2); steel = mat("steel", (0.75, 0.75, 0.74), 0.2, 1.0)
    gl = mat("wineglass", (0.75, 0.8, 0.8), 0.05)
    wine = mat("wine_bottle", (0.05, 0.12, 0.06), 0.15)
    for dy in (-1, 1):
        A.cyl(pl, x, y + dy * 0.2, h, 0.12, 0.012, segs=24)
        for dx in (-1, 1): A.box(steel, x + dx * 0.16 - 0.006, x + dx * 0.16 + 0.006, y + dy * 0.2 - 0.09, y + dy * 0.2 + 0.09, h, h + 0.006)
        A.cyl(gl, x + 0.2, y + dy * 0.08, h, 0.03, 0.005, segs=12); A.cyl(gl, x + 0.2, y + dy * 0.08, h, 0.004, 0.1, segs=6)
        A.cyl(gl, x + 0.2, y + dy * 0.08, h + 0.1, 0.035, 0.07, r2=0.03, segs=12)
    A.cyl(wine, x - 0.05, y, h, 0.037, 0.22, segs=14); A.cyl(wine, x - 0.05, y, h + 0.22, 0.037, 0.06, r2=0.014, segs=14)


def pendant_globe(A, x, y, drop=0.9):
    """an opal glass globe on a brass rod; returns the bulb's position (a small point light goes there)"""
    body = mat("brass", (0.6, 0.45, 0.2), 0.3, 1.0)
    e = mat("globe_warm", (1.0, 0.86, 0.66), 0.4, emit=10.0, ecol=(1.0, 0.82, 0.6))
    A.cyl(body, x, y, RH - drop, 0.006, drop, segs=6)
    A.cyl(mat("brass_contact", (0.6, 0.45, 0.2), 0.3, 1.0), x, y, RH - 0.03, 0.05, 0.03, segs=12)
    A.cyl(body, x, y, RH - drop - 0.03, 0.035, 0.04, segs=12)
    A.sphere(e, x, y, RH - drop - 0.17, 0.15, segs=20)
    return x, y, RH - drop - 0.17


def v2_lights(globes, light):
    """the shop lights (both bakes): a warm point in each globe + two soft area fills; day: + the sun + the sky"""
    s = bpy.context.scene
    for (x, y, z) in globes:
        ld = bpy.data.lights.new("globe", "POINT"); ld.energy = 45; ld.shadow_soft_size = 0.16; ld.color = (1.0, 0.8, 0.58)
        lo = bpy.data.objects.new("globe", ld); lo.location = (x, y, z); lo.visible_camera = False; s.collection.objects.link(lo)
    for y in (1.5, 4.2):
        ld = bpy.data.lights.new("fill", "AREA"); ld.energy = 240; ld.size = 3.0; ld.color = (1.0, 0.84, 0.66)
        lo = bpy.data.objects.new("fill", ld); lo.location = (0, y, RH - 0.05)      # (an area light shines down its -Z)
        lo.visible_camera = False; lo.visible_glossy = False; s.collection.objects.link(lo)
    bg = s.world.node_tree.nodes["Background"]
    if light == "day":
        sd = bpy.data.lights.new("sun", "SUN"); sd.energy = 3.2; sd.angle = math.radians(1.5); sd.color = (1.0, 0.95, 0.86)
        so = bpy.data.objects.new("sun", sd); s.collection.objects.link(so)
        # from the street (-y), 34 deg up, 28 deg to the side: a slanted patch on the floor and the near chairs
        el, az = math.radians(34), math.radians(28)
        d = Vector((math.sin(az) * math.cos(el), math.cos(az) * math.cos(el), -math.sin(el)))      # the light's travel
        so.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        bg.inputs[0].default_value = (0.55, 0.65, 0.8, 1); bg.inputs[1].default_value = 1.6
    else:
        bg.inputs[0].default_value = (0.01, 0.012, 0.02, 1); bg.inputs[1].default_value = 1.0


def shelves_wall_v2(A, x0, x1, zs):
    """glass shelves with bottles (round, tapered necks) in front of the bar mirror"""
    gl = mat("glass_shelf", (0.7, 0.75, 0.75), 0.1); g = mat("goods", (1, 1, 1), 0.3, attr=True)
    for z in zs:
        A.box(gl, x0, x1, RD2 - 0.3, RD2 - 0.06, z - 0.015, z)
        x = x0 + 0.05
        while x < x1 - 0.08:
            r = R.uniform(0.032, 0.045); h = R.uniform(0.2, 0.3); c = jitter(pick(BOTTLE + [(0.7, 0.45, 0.1), (0.2, 0.3, 0.45)]))
            A.cyl(g, x + r, RD2 - 0.18, z, r, h * 0.7, c, 12); A.cyl(g, x + r, RD2 - 0.18, z + h * 0.7, r, h * 0.3, c, 12, r2=r * 0.35)
            x += 2 * r + R.uniform(0.01, 0.05)


def v2_cafe(L):
    """a Brussels café (bistro): dark wood wainscot, ochre walls with framed pictures, a long bar at the back with its
    mirror and bottle shelves, a chalkboard, marble bistro tables + bentwood chairs, opal globes"""
    A = L.A[0]
    panel = mat("wood_panel", (0.3, 0.17, 0.08), 0.45, wood=((0.2, 0.1, 0.04), (0.36, 0.2, 0.09)))
    wall = mat("wall_ochre", (0.55, 0.4, 0.23), 0.75)
    v2_shell(A, wall, mat("floor_wood", (0.3, 0.18, 0.09), 0.4, wood=((0.18, 0.1, 0.05), (0.34, 0.2, 0.1))), mat("ceil_dark", (0.42, 0.36, 0.28), 0.8))
    for s in (-1, 1):
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.03)))
        A.box(panel, xa, xb, 0, RD2, 0, 1.1)
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.05)))
        A.box(panel, xa, xb, 0, RD2, 1.1, 1.14, bevel=0.01)
    A.box(panel, -RW / 2, RW / 2, RD2 - 0.03, RD2, 0, 1.1)
    # the bar: a panelled front, a zinc top, the foot rail, the taps; behind: the mirror, three glass shelves of bottles
    bar0, bar1 = RD2 - 1.45, RD2 - 0.85
    A.box(panel, -2.7, 1.7, bar0, bar1, 0, 1.04, bevel=0.012)
    for x in np.arange(-2.5, 1.6, 0.55): A.box(panel, x, x + 0.4, bar0 - 0.015, bar0, 0.18, 0.92, bevel=0.01)
    zinc = mat("zinc", (0.62, 0.63, 0.62), 0.25, 1.0)
    A.box(zinc, -2.75, 1.75, bar0 - 0.05, bar1 + 0.02, 1.04, 1.09, bevel=0.012)
    brass = mat("brass", (0.6, 0.45, 0.2), 0.3, 1.0)
    A.cyl(brass, -2.7, bar0 - 0.15, 0.15, 0.022, 4.4, axis="X")
    for x in (-1.3, -1.05, -0.8): A.cyl(mat("chrome", (0.8, 0.8, 0.8), 0.15, 1.0), x, bar1 - 0.1, 1.09, 0.025, 0.38)
    mirror = mat("mirror", (0.8, 0.8, 0.8), 0.05, 1.0)
    A.box(panel, -2.6, 1.6, RD2 - 0.05, RD2 - 0.02, 1.25, 2.55, bevel=0.01)
    A.box(mirror, -2.5, 1.5, RD2 - 0.06, RD2 - 0.05, 1.3, 2.5)
    shelves_wall_v2(A, -2.5, 1.5, [1.4, 1.75, 2.1])
    cm = mat("coffee_machine", (0.7, 0.7, 0.7), 0.2, 1.0)
    A.box(cm, 0.6, 1.3, bar1 - 0.35, bar1 - 0.02, 1.09, 1.55, bevel=0.03)
    # the right side: a door to the back, the chalkboard; the left: framed pictures
    dk = mat("door_dark", (0.12, 0.07, 0.04), 0.5)
    A.box(dk, RW / 2 - 0.04, RW / 2, RD2 - 1.0, RD2 - 0.15, 0, 2.15)
    fr = mat("frame_black", (0.04, 0.04, 0.04), 0.4); ph = mat("goods", (1, 1, 1), 0.5, attr=True)
    for y in (0.9, 2.0, 3.1):
        xa, xb = -RW / 2 + 0.03, -RW / 2 + 0.05
        A.box(fr, xa, xb, y - 0.3, y + 0.3, 1.45, 2.05)
        A.box(ph, xb, xb + 0.003, y - 0.26, y + 0.26, 1.49, 2.01, jitter(pick([(0.55, 0.42, 0.25), (0.35, 0.3, 0.25), (0.6, 0.55, 0.45)])))
    board = mat("chalkboard", (0.05, 0.06, 0.055), 0.85); chalk = mat("chalk", (0.85, 0.85, 0.8), 0.9)
    A.box(fr, RW / 2 - 0.05, RW / 2 - 0.03, 1.4, 2.6, 1.3, 2.2)
    A.box(board, RW / 2 - 0.055, RW / 2 - 0.05, 1.45, 2.55, 1.35, 2.15)
    for k in range(9):
        w = R.uniform(0.4, 0.95); z = 2.05 - k * 0.08
        A.box(chalk, RW / 2 - 0.058, RW / 2 - 0.055, 1.55, 1.55 + w, z, z + 0.025)
    globes = []
    for x, y in ((-1.9, 2.7), (0.1, 2.9), (2.0, 2.6)):
        C = L.put(y); marble_table(C, x, y); bentwood_chair(C, x - 0.5, y, -math.pi / 2); bentwood_chair(C, x + 0.5, y + 0.05, math.pi / 2)
        bentwood_chair(C, x, y + 0.5, math.pi); globes.append(pendant_globe(C, x, y))
    for x, y in ((-1.4, 1.25), (1.1, 1.2)):
        C = L.put(y); marble_table(C, x, y); bentwood_chair(C, x - 0.5, y, -math.pi / 2); bentwood_chair(C, x + 0.5, y, math.pi / 2)
        bentwood_chair(C, x, y + 0.5, math.pi); globes.append(pendant_globe(C, x, y, drop=0.8))
    for x in (-1.6, 0.0, 1.2): globes.append(pendant_globe(A, x, RD2 - 1.15, drop=0.75))   # over the bar (L0)
    v2_display(L, "cafe")
    return globes


def v2_brasserie(L):
    """a brasserie / restaurant: cabochon tiled floor, cream walls with brass-framed mirrors, a red leather banquette
    along the left wall, white-clothed square tables, a service counter + the lit kitchen pass at the back, a wine rack"""
    A = L.A[0]
    wall = mat("wall_cream", (0.78, 0.72, 0.6), 0.7)
    floor = mat("floor_cabochon", (0.8, 0.78, 0.74), 0.3, tiles=(0.2, (0.82, 0.8, 0.75), (0.78, 0.76, 0.71), (0.08, 0.08, 0.08)))
    v2_shell(A, wall, floor, mat("ceil_cream", (0.82, 0.78, 0.7), 0.8), back=mat("wall_bordeaux", (0.32, 0.07, 0.07), 0.7))
    dado = mat("wood_dado", (0.25, 0.13, 0.06), 0.4, wood=((0.18, 0.09, 0.04), (0.32, 0.17, 0.08)))
    for s in (-1, 1):
        xa, xb = sorted((s * RW / 2, s * (RW / 2 - 0.03))); A.box(dado, xa, xb, 0, RD2, 0, 0.95)
    red = mat("leather_red", (0.38, 0.05, 0.04), 0.4)
    A.box(dado, -RW / 2, -RW / 2 + 0.55, 0.2, RD2 - 1.6, 0, 0.3, bevel=0.01)
    A.box(red, -RW / 2 + 0.02, -RW / 2 + 0.55, 0.2, RD2 - 1.6, 0.3, 0.46, bevel=0.04)
    A.box(red, -RW / 2 + 0.03, -RW / 2 + 0.16, 0.2, RD2 - 1.6, 0.46, 1.05, bevel=0.05)
    brass = mat("brass", (0.6, 0.45, 0.2), 0.3, 1.0); mirror = mat("mirror", (0.8, 0.8, 0.8), 0.05, 1.0)
    for y0, y1 in ((0.3, 2.1), (2.3, 4.2)):
        A.box(brass, -RW / 2 + 0.02, -RW / 2 + 0.05, y0, y1, 1.25, 2.55, bevel=0.01)
        A.box(mirror, -RW / 2 + 0.05, -RW / 2 + 0.06, y0 + 0.06, y1 - 0.06, 1.31, 2.49)
    rack = mat("rack_wood", (0.3, 0.17, 0.08), 0.5); g = mat("goods", (1, 1, 1), 0.3, attr=True)
    A.box(rack, RW / 2 - 0.4, RW / 2, 3.6, 5.0, 0, 2.2, bevel=0.01)
    for i in range(10):
        for j in range(8):
            A.cyl(g, RW / 2 - 0.42, 3.7 + i * 0.13, 0.15 + j * 0.25, 0.035, 0.03, jitter(pick(BOTTLE)), 10, axis="X")
    A.box(rack, -1.8, 2.2, RD2 - 1.3, RD2 - 0.75, 0, 1.05, bevel=0.012)
    A.box(mat("marble_top", (0.85, 0.84, 0.8), 0.2), -1.85, 2.25, RD2 - 1.35, RD2 - 0.72, 1.05, 1.1, bevel=0.01)
    kit = mat("kitchen_light", (0.95, 0.95, 0.9), 0.4, emit=3.0, ecol=(1.0, 0.95, 0.85))
    A.box(kit, -0.6, 1.4, RD2 - 0.02, RD2 + 0.0, 1.15, 1.95)
    steel = mat("steel", (0.75, 0.75, 0.74), 0.2, 1.0)
    A.box(steel, -0.65, 1.45, RD2 - 0.25, RD2 - 0.02, 1.13, 1.17)
    for x in (-0.4, 0.2, 0.9): A.cyl(mat("porcelain", (0.92, 0.91, 0.88), 0.2), x, RD2 - 0.14, 1.17, 0.13, 0.012, segs=24)
    A.box(mat("lamp_heat", (1, 0.5, 0.2), 0.4, emit=4.0), -0.6, 1.4, RD2 - 0.25, RD2 - 0.15, 1.97, 2.0)
    globes = []
    chairc = ((0.08, 0.04, 0.02), (0.3, 0.06, 0.05))
    for y in (1.0, 2.6):
        C = L.put(y); square_table(C, -RW / 2 + 0.95, y); bentwood_chair(C, -RW / 2 + 1.5, y, math.pi / 2, *chairc)
    for x, y in ((0.3, 1.25), (2.0, 1.15)):
        C = L.put(y); square_table(C, x, y); bentwood_chair(C, x - 0.55, y, -math.pi / 2, *chairc); bentwood_chair(C, x + 0.55, y, math.pi / 2, *chairc)
    for x, y in ((0.4, 2.9), (2.1, 2.7)):
        C = L.put(y); square_table(C, x, y); bentwood_chair(C, x - 0.55, y, -math.pi / 2, *chairc); bentwood_chair(C, x, y + 0.55, math.pi, *chairc)
    for x, y in ((-1.6, 1.2), (1.1, 1.3), (-1.4, 2.8), (1.3, 2.8)): globes.append(pendant_globe(L.put(y), x, y, drop=0.6))
    for x in (-1.0, 1.6): globes.append(pendant_globe(A, x, RD2 - 1.0, drop=0.6))
    v2_display(L, "brasserie")
    return globes


def v2_display(L, kind):
    """L3, the window display (0-0.6 m deep, below 1.45 m): a low oak ledge, a menu board on an easel, potted plants,
    cakes on stands (café) / wine bottles + a cake under a cloche (brasserie)"""
    C = L.A[3]
    oak = mat("ledge_oak", (0.4, 0.25, 0.12), 0.45, wood=((0.34, 0.2, 0.09), (0.5, 0.32, 0.16)))
    C.box(oak, -RW / 2 + 0.3, -0.4, 0.1, 0.5, 0.58, 0.62, bevel=0.008)          # a shelf board on two trestles
    tre = mat("ledge_oak_contact", (0.4, 0.25, 0.12), 0.45)
    for x in (-RW / 2 + 0.45, -0.55):
        C.box(tre, x - 0.03, x + 0.03, 0.14, 0.46, 0, 0.58, bevel=0.006)
        C.box(tre, x - 0.035, x + 0.035, 0.12, 0.48, 0, 0.05, bevel=0.006)
    fr = mat("frame_oak", (0.35, 0.2, 0.08), 0.5); board = mat("chalkboard", (0.05, 0.06, 0.055), 0.85); chalk = mat("chalk", (0.85, 0.85, 0.8), 0.9)
    bx = 1.7 if kind == "cafe" else 2.0
    for dx in (-0.28, 0.28): C.box(fr, bx + dx - 0.02, bx + dx + 0.02, 0.32, 0.36, 0, 1.4)
    C.box(fr, bx - 0.02, bx + 0.02, 0.4, 0.5, 0, 1.3)
    C.box(fr, bx - 0.33, bx + 0.33, 0.28, 0.31, 0.55, 1.42, bevel=0.01)
    C.box(board, bx - 0.29, bx + 0.29, 0.275, 0.28, 0.59, 1.38)
    C.box(chalk, bx - 0.2, bx + 0.2, 0.272, 0.275, 1.25, 1.31)
    for k in range(7):
        w = R.uniform(0.25, 0.48); z = 1.16 - k * 0.075
        C.box(chalk, bx - 0.24, bx - 0.24 + w, 0.272, 0.275, z, z + 0.018)
        C.box(chalk, bx + 0.17, bx + 0.23, 0.272, 0.275, z, z + 0.018)
    pot = mat("terracotta", (0.55, 0.25, 0.12), 0.7); leaf = mat("leaf", (0.06, 0.2, 0.05), 0.7)
    leaf2 = mat("leaf_light", (0.12, 0.3, 0.07), 0.7)
    for x, h in ((-2.55, 0.62), (-0.7, 0.62), (0.6, 0.0)):
        C.cyl(pot if h > 0 else mat("terracotta_contact", (0.55, 0.25, 0.12), 0.7), x, 0.3, h, 0.13, 0.24, r2=0.1, segs=18)
        C.cyl(pot, x, 0.3, h + 0.22, 0.14, 0.03, segs=18)                      # the rim
        plant(C, x, 0.3, h + 0.24, leaf, leaf2)
    g = mat("goods", (1, 1, 1), 0.45, attr=True); porc = mat("porcelain", (0.92, 0.91, 0.88), 0.2)
    if kind == "cafe":
        for x in (-1.9, -1.25):
            C.cyl(porc, x, 0.3, 0.62, 0.06, 0.012, segs=16); C.cyl(porc, x, 0.3, 0.63, 0.015, 0.14, segs=8)
            C.cyl(porc, x, 0.3, 0.77, 0.17, 0.012, segs=24)
            C.cyl(g, x, 0.3, 0.782, 0.14, 0.07, jitter(pick(PASTRY)), 24)
            C.cyl(g, x, 0.3, 0.852, 0.14, 0.012, jitter((0.85, 0.2, 0.25)), 24)
        for k in range(5):
            C.sphere(g, -1.55 + k * 0.08, 0.18, 0.66, 0.035, jitter(pick(PASTRY)), (1.2, 1.0, 0.7))
    else:
        wine = mat("wine_bottle", (0.05, 0.12, 0.06), 0.15)
        for k in range(5):
            x = -2.2 + k * 0.12
            C.cyl(wine, x, 0.3, 0.62, 0.037, 0.24, segs=14); C.cyl(wine, x, 0.3, 0.86, 0.037, 0.08, r2=0.014, segs=14)
            C.box(g, x - 0.03, x + 0.03, 0.262, 0.264, 0.7, 0.79, jitter((0.85, 0.8, 0.65)))
        C.cyl(porc, -1.3, 0.3, 0.62, 0.17, 0.015, segs=24)
        C.cyl(g, -1.3, 0.3, 0.635, 0.13, 0.09, jitter((0.35, 0.15, 0.08)), 24)
        C.sphere(mat("cloche", (0.8, 0.85, 0.85), 0.05), -1.3, 0.3, 0.64, 0.16, scale=(1, 1, 1.1), segs=20)


def plant(C, x, y, z, leaf, leaf2, n=46, h=0.5):
    """a leafy pot plant: stems fanning out of the pot, each with flattened, tilted leaves (no ball-shaped blobs)"""
    stem = mat("stem", (0.12, 0.2, 0.06), 0.7)
    for k in range(n):
        a = R.uniform(0, 2 * math.pi); t = R.uniform(0.15, 1.0)
        rr = 0.06 + 0.16 * t * R.uniform(0.6, 1.0); zz = z + 0.04 + h * (0.25 + 0.75 * t) * R.uniform(0.7, 1.0)
        px, py = x + rr * math.cos(a), y + rr * math.sin(a) * 0.8
        if k % 4 == 0: C.cyl(stem, (x + px) / 2, (y + py) / 2, z, 0.006, zz - z, segs=5)
        rot = Euler((R.uniform(-0.9, 0.9), R.uniform(-0.9, 0.9), a))
        C.sphere(leaf if k % 3 else leaf2, px, py, zz, 0.055, scale=(1.9, 0.75, 0.22), segs=8, rot=rot)


V2_BUILD = {"cafe": v2_cafe, "brasserie": v2_brasserie}


def v2_render(variant, light):
    s = reset(); _M.clear()
    s.render.resolution_x, s.render.resolution_y = V2_PX
    s.cycles.max_bounces = 8; s.cycles.diffuse_bounces = 4
    R.seed(sum(map(ord, variant)) * 7 + 1)                  # (Python's hash() is salted per run: a stable seed)
    L = Layers()
    globes = V2_BUILD[variant](L)
    objs = [L.A[k].build(f"{variant}_L{k}", True) for k in range(4)]
    v2_front_occluder()
    v2_lights(globes, light)
    camera()
    s.render.image_settings.file_format = "PNG"; s.render.image_settings.color_mode = "RGBA"
    s.view_settings.exposure = V2_EXPOSURE[light]
    def shot(tag, visible, transparent):
        for k in range(4):
            for o in objs[k]:
                o.visible_camera = k in visible
                # the pieces flush on the floor / ceiling (a table's foot plate, a pendant's canopy, the trestles, a
                # pot on the floor) are left out of the L0 shot: under an invisible plate the floor gets no light at all
                # and would show its black footprint; the rest of the group still casts the contact shadows
                o.hide_render = tag == "L0" and k > 0 and "_contact" in o.name
        s.render.film_transparent = transparent
        s.render.filepath = os.path.join(OUT, f"_work/v2/{variant}_{light}_{tag}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print(f"v2 {variant} {light} {tag} {time.time() - t:.0f}s")
    for tag, vis, tr in (("L0", {0}, False), ("L1", {1}, True), ("L2", {2}, True), ("L3", {3}, True), ("comp", {0, 1, 2, 3}, False)):
        if V2_ONLY and tag not in V2_ONLY: continue
        shot(tag, vis, tr)


V2_EXPOSURE = {"day": -0.2, "night": -0.6}
V2_ONLY = None
for a in ARGS:
    if a.startswith("--layers="): V2_ONLY = a[9:].split(",")
if V2:
    os.makedirs(os.path.join(OUT, "_work", "v2"), exist_ok=True)
    for v in V2_VARIANTS:
        if ONLY and v not in ONLY: continue
        for li in V2_LIGHTS: v2_render(v, li)
    print(f"v2 done {time.time() - T0:.0f}s: next python tools/shops/pack_v2.py && node tools/shops/encode_array.mjs textures/shops/_work/v2/slices textures/shops/interiors_v2.ktx2")
    sys.exit(0)

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
