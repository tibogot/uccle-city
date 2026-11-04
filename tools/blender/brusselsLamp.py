"""THE BRUSSELS SWAN-NECK STREET LAMP ("crosse"), as on the owner's photo of Place de Saint-Job (2026-11-04):
a slim dark-green cast-iron pole with a fluted base, a swan-neck arm curving out and down from the top with a small
scroll under it, and a little bell-shaped hood over a white opal globe.

Built entirely in code (no hand modelling), in the style of game-engine-v1's tools/blender kits: deterministic, re-run
to change it. Three LODs (the far ones by decimation, checked later by meshoptimizer in the pipeline), two materials
(painted cast iron, opal glass), glTF export, and preview renders to look at BEFORE the lamp goes into the city.

    blender -b -P tools/blender/brusselsLamp.py -- <out_dir>
      <out_dir>/brussels_lamp.glb               LOD0..2 as separate meshes (Lamp_LOD0, Lamp_LOD1, Lamp_LOD2)
      <out_dir>/preview_*.png                   front, side, the lantern close up, LOD0 vs LOD2

Units: metres, Blender Z up (glTF export turns it to Y up). The pole stands at the origin, the arm reaches toward -Y
(glTF +Z after export... see EXPORT below: the arm ends up along -Z in three.js, as the viewer's current lamps).
"""
import bpy, bmesh, math, os, sys
from mathutils import Vector, Matrix

OUT = sys.argv[sys.argv.index("--") + 1] if "--" in sys.argv else os.path.abspath("lamp_out")
os.makedirs(OUT, exist_ok=True)

# ---------------------------------------------------------------- scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def material(name, rgb, rough, metal=0.0, emit=None, emit_strength=0.0, transmission=0.0):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    p = m.node_tree.nodes["Principled BSDF"]
    p.inputs["Base Color"].default_value = (*rgb, 1)
    p.inputs["Roughness"].default_value = rough
    p.inputs["Metallic"].default_value = metal
    if emit:
        p.inputs["Emission Color"].default_value = (*emit, 1)
        p.inputs["Emission Strength"].default_value = emit_strength
    if transmission:
        p.inputs["Transmission Weight"].default_value = transmission
    return m

# Brussels lamp green (RAL 6009-ish fir green), satin paint over cast iron; opal white glass
IRON = material("LampIron", (0.018, 0.045, 0.032), 0.42, metal=0.35)
GLASS = material("LampGlass", (0.92, 0.91, 0.86), 0.25, emit=(1.0, 0.86, 0.62), emit_strength=0.0)

def obj_from_bm(name, bm, mat, smooth=True):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me)
    scn.collection.objects.link(o)
    o.data.materials.append(mat)
    for p in o.data.polygons: p.use_smooth = smooth
    return o

def lathe(name, profile, mat, segs=24, smooth=True):
    """A solid of revolution around Z: profile = [(r, z), ...] bottom to top."""
    bm = bmesh.new()
    rings = []
    for (r, z) in profile:
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            ring.append(bm.verts.new((r * math.cos(a), r * math.sin(a), z)))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(segs):
            a, b = rings[i][k], rings[i][(k + 1) % segs]
            c, d = rings[i + 1][(k + 1) % segs], rings[i + 1][k]
            bm.faces.new((a, b, c, d))
    if profile[0][0] > 1e-4: bm.faces.new(list(reversed(rings[0])))
    if profile[-1][0] > 1e-4: bm.faces.new(rings[-1])
    bm.normal_update()
    return obj_from_bm(name, bm, mat, smooth)

def fluted(name, z0, z1, r0, r1, flutes, depth, mat, segs_per=6, rings=8):
    """A tapered column with vertical flutes (the cast base)."""
    bm = bmesh.new()
    n = flutes * segs_per
    grid = []
    for j in range(rings + 1):
        t = j / rings
        z = z0 + (z1 - z0) * t
        r = r0 + (r1 - r0) * t
        ring = []
        for k in range(n):
            a = 2 * math.pi * k / n
            f = 0.5 - 0.5 * math.cos(2 * math.pi * (k % segs_per) / segs_per)   # 0 at the ridges, 1 mid-flute
            rr = r - depth * f
            ring.append(bm.verts.new((rr * math.cos(a), rr * math.sin(a), z)))
        grid.append(ring)
    for j in range(rings):
        for k in range(n):
            bm.faces.new((grid[j][k], grid[j][(k + 1) % n], grid[j + 1][(k + 1) % n], grid[j + 1][k]))
    bm.normal_update()
    return obj_from_bm(name, bm, mat)

def tube(name, pts, radii, mat, segs=12):
    """A tube along a polyline (parallel-transported rings), radius per point."""
    bm = bmesh.new()
    rings = []
    up = Vector((0, 0, 1))
    prev_n = None
    for i, p in enumerate(pts):
        t = (pts[min(i + 1, len(pts) - 1)] - pts[max(i - 1, 0)]).normalized()
        n = (up - t * up.dot(t)) if prev_n is None else (prev_n - t * prev_n.dot(t))
        if n.length < 1e-5: n = Vector((1, 0, 0)) - t * t.x
        n.normalize(); prev_n = n
        b = t.cross(n)
        ring = [bm.verts.new(p + (n * math.cos(2 * math.pi * k / segs) + b * math.sin(2 * math.pi * k / segs)) * radii[i]) for k in range(segs)]
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(segs):
            bm.faces.new((rings[i][k], rings[i][(k + 1) % segs], rings[i + 1][(k + 1) % segs], rings[i + 1][k]))
    bm.faces.new(list(reversed(rings[0]))); bm.faces.new(rings[-1])
    bm.normal_update()
    return obj_from_bm(name, bm, mat)

def bezier(p0, p1, p2, p3, n):
    out = []
    for i in range(n + 1):
        t = i / n; u = 1 - t
        out.append(p0 * u**3 + p1 * 3 * u * u * t + p2 * 3 * u * t * t + p3 * t**3)
    return out

# ---------------------------------------------------------------- the lamp (LOD0)
H = 6.4                     # top of the pole, m
parts = []
# a STRAIGHT pole, no rounded or fluted foot (owner, 2026-11-04: "the one in the screenshot is straight"):
# a plain tube from the ground, tapering slightly, a thin ring where it meets the pavement and a collar near the top
parts.append(lathe("shaft", [(0.0, 0.0), (0.085, 0.0), (0.085, 0.03), (0.08, 0.04), (0.06, H - 0.25), (0.07, H - 0.2), (0.07, H - 0.14), (0.05, H - 0.1)], IRON, segs=16))
parts.append(lathe("finial", [(0.05, H - 0.1), (0.035, H - 0.05), (0.045, H), (0.03, H + 0.06), (0.012, H + 0.14), (0.0, H + 0.16)], IRON, segs=12))

# swan-neck arm: from the shaft just under the top, up and out, then down to the lantern hanger (toward -Y)
reach = 1.05
P0 = Vector((0, -0.03, H - 0.32))
P1 = Vector((0, -0.25, H + 0.18))
P2 = Vector((0, -reach + 0.05, H + 0.32))
P3 = Vector((0, -reach, H + 0.02))
arm = bezier(P0, P1, P2, P3, 22)
parts.append(tube("arm", arm, [0.03 - 0.012 * (i / 22) for i in range(23)], IRON))
# the scroll under the arm: a spiral from the shaft out under the curve (the cast ornament)
scroll = []
for i in range(31):
    t = i / 30
    a = t * 2.4 * math.pi
    r = 0.13 * (1 - t) + 0.025
    scroll.append(Vector((0, -0.16 - 0.2 * t - r * math.sin(a) * 0.45, H - 0.42 + 0.3 * t + r * math.cos(a) * 0.45)))
parts.append(tube("scroll", scroll, [0.016 - 0.006 * (i / 30) for i in range(31)], IRON, segs=8))
# a straight brace from the shaft to the arm
parts.append(tube("brace", [Vector((0, -0.04, H - 0.75)), Vector((0, -0.5, H + 0.12))], [0.012, 0.012], IRON, segs=8))

# lantern at the arm's end: hanger, bell hood with a rim, the opal globe, a small bottom finial
L = P3
def at(o, v): o.location = v; return o
parts.append(at(lathe("hanger", [(0.018, -0.12), (0.022, -0.04), (0.03, 0.0)], IRON, segs=10), L))
hood = lathe("hood", [(0.0, -0.10), (0.05, -0.105), (0.16, -0.2), (0.22, -0.27), (0.235, -0.285), (0.235, -0.30), (0.2, -0.3)], IRON, segs=24)
parts.append(at(hood, L))
globe_prof = []
for i in range(17):                                   # an egg: widest a third of the way down
    t = i / 16
    a_ = math.pi * (0.1 + 0.9 * t)
    globe_prof.append((0.175 * math.sin(a_) * (1.0 - 0.12 * t), -0.3 - 0.31 * (1 - math.cos(math.pi * t)) / 2))
globe_prof[-1] = (0.0, globe_prof[-1][1])
globe = lathe("globe", globe_prof, GLASS, segs=32)
parts.append(at(globe, L))
parts.append(at(lathe("tip", [(0.0, -0.66), (0.012, -0.64), (0.02, -0.62), (0.025, -0.61)], IRON, segs=10), L))

for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = parts[0]
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
bpy.ops.object.join()
lod0 = bpy.context.view_layer.objects.active
lod0.name = "Lamp_LOD0"
bpy.ops.object.select_all(action="DESELECT")

def tris(o):
    return sum(len(p.vertices) - 2 for p in o.data.polygons)

# ---------------------------------------------------------------- LODs: decimated copies (meshoptimizer refines in the pipeline)
def lod(src, name, ratio):
    o = src.copy(); o.data = src.data.copy(); o.name = name
    scn.collection.objects.link(o)
    d = o.modifiers.new("dec", "DECIMATE"); d.ratio = ratio
    bpy.context.view_layer.objects.active = o
    bpy.ops.object.modifier_apply(modifier="dec")
    return o
lod1 = lod(lod0, "Lamp_LOD1", 0.35)
lod2 = lod(lod0, "Lamp_LOD2", 0.1)
print(f"LAMP tris LOD0 {tris(lod0)}  LOD1 {tris(lod1)}  LOD2 {tris(lod2)}", flush=True)

# ---------------------------------------------------------------- export (glTF, Y up; materials as PBR)
# only LOD0 ships: the far LODs are made by meshoptimizer in the viewer (viewer/lampModel.js); the Blender
# decimate below is for the preview only (it wrecked the lantern)
for o in scn.objects: o.select_set(o.name == "Lamp_LOD0")
bpy.ops.export_scene.gltf(filepath=os.path.join(OUT, "brussels_lamp.glb"), export_format="GLB", use_selection=True,
                          export_apply=True, export_yup=True)

# ---------------------------------------------------------------- previews (Cycles, a sunny afternoon and a sky)
for o in (lod1, lod2): o.hide_render = True
world = bpy.data.worlds.new("sky"); scn.world = world; world.use_nodes = True
bg = world.node_tree.nodes["Background"]
sky = world.node_tree.nodes.new("ShaderNodeTexSky")
world.node_tree.links.new(sky.outputs["Color"], bg.inputs["Color"])
bg.inputs["Strength"].default_value = 0.35
sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
sun.data.energy = 3.5; sun.rotation_euler = (math.radians(50), 0, math.radians(35))
ground = bpy.data.meshes.new("g"); bm = bmesh.new()
bmesh.ops.create_grid(bm, x_segments=1, y_segments=1, size=6); bm.to_mesh(ground)
g = bpy.data.objects.new("ground", ground); scn.collection.objects.link(g)
g.data.materials.append(material("pave", (0.16, 0.16, 0.17), 0.9))
scn.render.engine = "CYCLES"; scn.cycles.samples = 48; scn.cycles.use_denoising = True
scn.render.resolution_x, scn.render.resolution_y = 700, 1000
scn.view_settings.view_transform = "AgX"
cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam

def shot(fname, loc, look, lens=50):
    cam.location = Vector(loc); cam.data.lens = lens
    d = Vector(look) - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    scn.render.filepath = os.path.join(OUT, fname)
    bpy.ops.render.render(write_still=True)
    print("PREVIEW", scn.render.filepath, flush=True)

shot("preview_side.png", (10.5, -0.5, 3.4), (0, -0.45, 3.3), lens=40)
shot("preview_front.png", (-4.0, -10.0, 3.4), (0, -0.45, 3.3), lens=40)
scn.render.resolution_x, scn.render.resolution_y = 900, 700
shot("preview_lantern.png", (1.3, -2.2, H + 0.1), (0, -reach, H - 0.25), lens=60)
# LOD0 vs LOD2 side by side, as seen from the street at ~25 m
lod2.hide_render = False; lod2.location.x = 1.6
shot("preview_lods.png", (12.0, -10.0, 4.0), (0.8, -0.4, 3.4), lens=70)
print("DONE", OUT, flush=True)
