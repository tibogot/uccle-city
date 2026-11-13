"""FRONT-GARDEN KIT, the ironwork (docs/assets/GARDENS.md): kit 7 "front gardens" of docs/assets/STREET_KITS.md. Blender 5.0,
headless:

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/gardenKit.py -- models/gardens [--no-bake] [--previews]

The boxy pieces (brick walls, copings, pillars and their caps) are procedural in JS (viewer/gardens/gardenGeom.js: the
owner's rule for boxy items); this script builds what needs real modelling: the railings and the gates, each in three
SCRIPTED LODs (no decimation):
  rail_spear    the classic Uccle wrought-iron railing on a low wall: square bars every 12.5 cm through a flat top rail,
                each ending in a cast lance finial with a collar, a flat bottom rail
  rail_flat     the modern (1960s - now) steel railing: flat bars on edge every 12.5 cm between a square-tube top rail and
                a bottom rail
  rail_rings    the Art Deco railing: square bars, a band of rings between a middle and the top rail
  gate_<type>   the pedestrian gate (1.0 m nominal leaf, 1.2 m high): tube frame, the type's infill, a latch box with a
                lever handle on the street side, two hinge knuckles at the hinge stile
  cargate_<type> one leaf of the double driveway gate (1.6 m nominal, 1.3 m high): frame, a middle rail, the infill, a drop
                bolt into the ground at the meeting stile
Frames (Blender; glTF exports Y up: Blender -Y = three.js +Z = the STREET side):
  railings      a MODULE: x 0 .. 1.0 (the viewer stretches it 0.88 - 1.12 to fit a bay; bars at x = 0.125 k, k = 0..7, so
                modules tile without a doubled bar), z = 0 the top of the wall's coping, height 1.0 (scaled to the style's
                railing height); bars run 3 cm into the coping (JOINS)
  gates         x 0 (the hinge, at the pillar's face) .. 1.0 / 1.6, z = 0 the ground (the viewer scales to the opening and
                height), the leaf centred on y = 0
Slots by NAME only (no baked colour): iron_paint (the railing colour: per-instance palette, black / anthracite / green),
iron_tip (finials: paint or gilded, per instance), steel_dark (latches, hinges). AO: Cycles, baked per VERTEX (COLOR_0) with
the piece standing on a coping / the ground (the bars carry extra rings at 4 / 12 cm so the contact darkening has
vertices to live on).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K
from kitlib import bm_box, bm_cyl, bm_torus, M, Part

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/gardens")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
os.makedirs(OUT, exist_ok=True)
T0 = time.time()
scn = K.reset()
X, Y, Zv = (1, 0, 0), (0, 1, 0), (0, 0, 1)

PAINT = K.mat("iron_paint", (0.025, 0.026, 0.028), 0.45, 0.5)
TIP = K.mat("iron_tip", (0.025, 0.026, 0.028), 0.4, 0.6)
STEEL = K.mat("steel_dark", (0.05, 0.05, 0.052), 0.4, 0.7)
PITCH = 0.125


# ------------------------------------------------------------------------------------------------ primitives
def bar(P, mat, x, y, z0, z1, w, d, lod, rings=(), cham=0.002, caps=True):
    """a vertical bar (w along x, d along y) from z0 to z1 with extra vertex rings at `rings` (AO); LOD0 chamfered
    (8 sides), LOD1 square with the rings, LOD2 square, ends only, no caps (a bar end is always buried or capped)"""
    bm = bmesh.new()
    hw, hd = w / 2, d / 2
    if lod == 0 and cham > 0:
        c = min(cham, hw * 0.4, hd * 0.4)
        sec = [(hw, -hd + c), (hw, hd - c), (hw - c, hd), (-hw + c, hd), (-hw, hd - c), (-hw, -hd + c), (-hw + c, -hd), (hw - c, -hd)]
    else:
        sec = [(hw, -hd), (hw, hd), (-hw, hd), (-hw, -hd)]
    zs = [z0] + ([r for r in rings if z0 < r < z1] if lod < 2 else []) + [z1]
    R = [[bm.verts.new((x + a, y + b, z)) for a, b in sec] for z in zs]
    n = len(sec)
    for i in range(len(R) - 1):
        for k in range(n):
            bm.faces.new([R[i][k], R[i][(k + 1) % n], R[i + 1][(k + 1) % n], R[i + 1][k]])
    if caps and lod < 2:
        bm.faces.new(list(reversed(R[0]))); bm.faces.new(R[-1])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, Zv)


def rail(P, mat, x0, x1, y, z0, z1, d, lod, bevel=0.002, caps=False):
    """a horizontal rail along x (d deep along y), open ends unless caps (modules tile: no hidden end faces)"""
    bm = bmesh.new()
    hd = d / 2
    if lod == 0 and bevel > 0:
        c = min(bevel, hd * 0.4, (z1 - z0) * 0.4)
        sec = [(y + hd, z0 + c), (y + hd, z1 - c), (y + hd - c, z1), (y - hd + c, z1), (y - hd, z1 - c), (y - hd, z0 + c), (y - hd + c, z0), (y + hd - c, z0)]
    else:
        sec = [(y + hd, z0), (y + hd, z1), (y - hd, z1), (y - hd, z0)]
    xs = [x0, x1]
    R = [[bm.verts.new((x, a, b)) for a, b in sec] for x in xs]
    n = len(sec)
    for k in range(n):
        bm.faces.new([R[0][k], R[0][(k + 1) % n], R[1][(k + 1) % n], R[1][k]])
    if caps:
        bm.faces.new(R[0]); bm.faces.new(list(reversed(R[1])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, mat, X)


def lance(P, x, y, z, lod, s=1.0):
    """the cast spear finial on a bar top at z: a collar, a neck, a four-sided lance head (LOD0 with a waist)"""
    if lod == 2: return
    if lod == 0:
        P.add_bm(bm_cyl(0.0135 * s, 0.018 * s, 12, 0.002, 1), TIP, Zv, M((x, y, z - 0.004)))
    bm = bmesh.new()
    if lod == 0:
        prof = [(0.007, 0.0), (0.006, 0.012), (0.017, 0.032), (0.009, 0.05), (0.0, 0.074)]
    else:
        prof = [(0.008, 0.0), (0.016, 0.03), (0.0, 0.07)]
    rings = []
    for r, h in prof:
        if r == 0: rings.append([bm.verts.new((x, y, z + 0.012 * s + h * s))]); continue
        rings.append([bm.verts.new((x + r * s * c, y + r * s * sn * 0.55, z + 0.012 * s + h * s)) for c, sn in ((1, 0), (0, 1), (-1, 0), (0, -1))])
    for i in range(len(rings) - 1):
        a, b = rings[i], rings[i + 1]
        if len(b) == 1:
            for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[0]])
        else:
            for k in range(4): bm.faces.new([a[k], a[(k + 1) % 4], b[(k + 1) % 4], b[k]])
    bm.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    for f in bm.faces: f.smooth = False
    P.add_bm(bm, TIP, Zv)


def ring(P, x, y, z, R, r, lod):
    if lod == 2: return
    P.add_bm(bm_torus(R, r, 16 if lod == 0 else 8, 6 if lod == 0 else 4), PAINT, X, M((x, y, z)))


# ------------------------------------------------------------------------------------------------ infill patterns
def infill(P, kind, x0, x1, z0, z1, lod, top_open=False, pitch=PITCH, start=None):
    """the vertical members of a railing type between x0 and x1, from z0 to z1 (bars at start + pitch k)"""
    xs = []
    x = (x0 + pitch / 2) if start is None else start
    while x < x1 - 1e-6:
        xs.append(x); x += pitch
    if kind == "spear":
        for x in xs:
            top = z1 + 0.09 if top_open else z1
            bar(P, PAINT, x, 0, z0, top, 0.016, 0.016, lod, (z0 + 0.04, z0 + 0.12))
            if top_open: lance(P, x, 0, top, lod)
    elif kind == "flat":
        for x in xs: bar(P, PAINT, x, 0, z0, z1, 0.008, 0.035, lod, (z0 + 0.04, z0 + 0.12), cham=0.0015)
    else:   # rings
        for x in xs: bar(P, PAINT, x, 0, z0, z1, 0.014, 0.014, lod, (z0 + 0.04, z0 + 0.12))
    return xs


def railing(kind, lod):
    """a 1.0 m module (x 0..1), z 0 = the coping top, 1.0 high"""
    P = Part(f"rail_{kind}_lod{lod}")
    xs = [PITCH * k for k in range(8)]
    if kind == "spear":
        for x in xs:
            bar(P, PAINT, x, 0, -0.03, 0.915, 0.016, 0.016, lod, (0.04, 0.12, 0.5))
            lance(P, x, 0, 0.915, lod)
        rail(P, PAINT, 0, 1.0, 0, 0.07, 0.10, 0.012, lod)
        rail(P, PAINT, 0, 1.0, 0, 0.80, 0.84, 0.012, lod)
    elif kind == "flat":
        for x in xs: bar(P, PAINT, x + 0.0625, 0, -0.03, 0.98, 0.008, 0.035, lod, (0.04, 0.12, 0.5), cham=0.0015)
        rail(P, PAINT, 0, 1.0, 0, 0.06, 0.09, 0.04, lod, 0.003)
        rail(P, PAINT, 0, 1.0, 0, 0.96, 1.0, 0.05, lod, 0.004)
    else:
        for x in xs: bar(P, PAINT, x, 0, -0.03, 0.97, 0.014, 0.014, lod, (0.04, 0.12, 0.5))
        rail(P, PAINT, 0, 1.0, 0, 0.07, 0.10, 0.012, lod)
        rail(P, PAINT, 0, 1.0, 0, 0.72, 0.75, 0.012, lod)
        rail(P, PAINT, 0, 1.0, 0, 0.95, 0.99, 0.014, lod)
        rail(P, PAINT, 0, 1.0, 0, 0.985, 1.005, 0.03, lod, 0.004)          # the flat capping bar on top
        for x in xs: ring(P, x + PITCH / 2, 0, 0.85, 0.046, 0.006, lod)
    return P.to_object(smooth_angle=20)


def gate(kind, lod, car=False):
    """a gate leaf: hinge at x = 0, width W (1.0 pedestrian / 1.6 car leaf), height H from the ground"""
    W, H = (1.6, 1.3) if car else (1.0, 1.2)
    P = Part(f"{'cargate' if car else 'gate'}_{kind}_lod{lod}")
    st = 0.04
    x0, x1 = 0.02, W - 0.01                       # 2 cm hinge gap, 1 cm at the latch side (the pillar / the other leaf)
    zb, zt = 0.06, H - (0.12 if kind == "spear" else 0.0)
    # stiles (square tube) and rails
    bar(P, PAINT, x0 + st / 2, 0, zb, zt, st, st, lod, (zb + 0.06,), cham=0.003)
    bar(P, PAINT, x1 - st / 2, 0, zb, zt, st, st, lod, (zb + 0.06,), cham=0.003)
    rail(P, PAINT, x0 + st, x1 - st, 0, zb, zb + 0.04, 0.03, lod, 0.003, caps=False)
    if kind == "spear":
        rail(P, PAINT, x0 + st, x1 - st, 0, zt - 0.04, zt, 0.03, lod, 0.003)
        infill(P, "spear", x0 + st, x1 - st, zb + 0.03, zt - 0.02, lod)
        # the bars run on through the top rail to lances (same as the railing)
        xs = []
        x = x0 + st + PITCH / 2
        while x < x1 - st - 1e-6: xs.append(x); x += PITCH
        for x in xs:
            bar(P, PAINT, x, 0, zt - 0.03, zt + 0.06, 0.016, 0.016, lod, ())
            lance(P, x, 0, zt + 0.06, lod)
        lance(P, x0 + st / 2, 0, zt, lod, 1.4); lance(P, x1 - st / 2, 0, zt, lod, 1.4)
    elif kind == "flat":
        rail(P, PAINT, x0 + st, x1 - st, 0, zt - 0.04, zt, 0.05, lod, 0.004)
        infill(P, "flat", x0 + st, x1 - st, zb + 0.03, zt - 0.02, lod, pitch=0.11)
    else:
        rail(P, PAINT, x0 + st, x1 - st, 0, zt - 0.04, zt, 0.03, lod, 0.003)
        zm = zt - 0.27
        rail(P, PAINT, x0 + st, x1 - st, 0, zm - 0.03, zm, 0.014, lod)
        xs = infill(P, "rings", x0 + st, x1 - st, zb + 0.03, zt - 0.02, lod)
        for a, b in zip(xs, xs[1:]): ring(P, (a + b) / 2, 0, zm + 0.11, 0.046, 0.006, lod)
    if car:
        zm = zb + 0.45
        rail(P, PAINT, x0 + st, x1 - st, 0, zm, zm + 0.03, 0.03, lod, 0.003)
        bar(P, STEEL, x1 - 0.06, -0.03, -0.1, zb + 0.3, 0.014, 0.014, lod, ())          # the drop bolt into the ground
        if lod < 2: P.add_bm(bm_box(0.03, 0.02, 0.03, 0.003 if lod == 0 else 0.0), STEEL, Zv, M((x1 - 0.06, -0.03, zb + 0.32)))
    # hinges: two knuckles on the hinge stile
    if lod < 2:
        for z in (zb + 0.12, zt - 0.12):
            P.add_bm(bm_cyl(0.012, 0.08, 12 if lod == 0 else 6, 0.002 if lod == 0 else 0.0, 1), STEEL, Zv, M((0.006, 0, z - 0.04)))
            P.add_bm(bm_box(0.03, 0.006, 0.05, 0.0), STEEL, Zv, M((0.024, 0, z)))
    # latch box + lever handle on the street side (-y) at 0.95 m (pedestrian) / the meeting stile (car)
    if lod < 2:
        zl = 0.95 if not car else 1.0
        P.add_bm(bm_box(0.09, 0.05, 0.14, 0.004 if lod == 0 else 0.0, 2), STEEL, Zv, M((x1 - st - 0.03, 0, zl)))
        P.add_bm(bm_cyl(0.008, 0.035, 10 if lod == 0 else 6, 0.0), STEEL, Y, M((x1 - st - 0.05, -0.025, zl + 0.03), (math.pi / 2, 0, 0)))
        P.add_bm(bm_box(0.11, 0.012, 0.016, 0.004 if lod == 0 else 0.0, 2), STEEL, X, M((x1 - st - 0.095, -0.065, zl + 0.03)))
    return P.to_object(smooth_angle=20)


# ------------------------------------------------------------------------------------------------ build
objs = []
for lod in (0, 1, 2):
    for kind in ("spear", "flat", "rings"):
        objs.append(railing(kind, lod))
        objs.append(gate(kind, lod))
        objs.append(gate(kind, lod, car=True))
for o in objs: print(f"{o.name}: {K.tris(o)} tris, size {tuple(round(v, 3) for v in o.dimensions)}")


def bake_vertex_ao(objs):
    """Cycles AO per vertex into the colour attribute 'Col' (exported as COLOR_0): each piece alone on its stand (a
    railing on a 30 cm coping box, a gate on the ground), so the contact darkening is real"""
    scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 96
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 0.6
    t = time.time()
    for o in objs:
        me = o.data
        me.color_attributes.new("Col", "BYTE_COLOR", "POINT")
        me.color_attributes.active_color = me.color_attributes["Col"]
        stand = []
        if o.name.startswith("rail_"):
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0.5, 0, -0.04)); c = bpy.context.active_object
            c.scale = (3.0, 0.32, 0.08); stand.append(c)
            bpy.ops.mesh.primitive_cube_add(size=1, location=(0.5, 0, -0.5)); c = bpy.context.active_object
            c.scale = (3.0, 0.25, 0.85); stand.append(c)
        else:
            bpy.ops.mesh.primitive_plane_add(size=8, location=(0.5, 0, 0)); stand.append(bpy.context.active_object)
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
        for c in stand: bpy.data.objects.remove(c)
    print(f"AO baked {time.time() - t:.0f}s")


if BAKE: bake_vertex_ao(objs)
K.export_glb(objs, os.path.join(OUT, "gardens.glb"), colors=BAKE)
info = {
    "asset": "Front-garden kit, ironwork: railings, pedestrian gates, driveway gate leaves (tools/blender/gardenKit.py)",
    "pieces": {o.name: {"slots": [m.name for m in o.data.materials], "triangles": K.tris(o),
                        "size_m": [round(o.dimensions.x, 3), round(o.dimensions.y, 3), round(o.dimensions.z, 3)]} for o in objs},
    "frame": "glTF Y up; railings: a 1 m module x 0..1, y 0 = the coping top; gates: x 0 = the hinge, y 0 = the ground; street side = +Z (three.js)",
    "ao": "COLOR_0 (Cycles AO per vertex, on a coping / the ground)" if BAKE else "none (--no-bake)",
}
json.dump(info, open(os.path.join(OUT, "gardens.json"), "w"), indent=1)

if PREVIEWS:
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.render.image_settings.color_mode = "RGB"
    blank = bpy.data.images.new("blank", 8, 8); blank.pixels = [1.0] * 256
    for m in K._MATS.values():
        if "preview" in m: pass
    so, cam = K.preview_setup(blank, sun_elev=34, sun_az=210)
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    for o in objs:
        lod = int(o.name[-1]); kind = o.name.split("_")[1]; base = o.name.split("_")[0]
        col = {"spear": 0, "flat": 1, "rings": 2}[kind]
        row = {"rail": 0, "gate": 1, "cargate": 2}[base]
        o.location = (col * 2.6 + row * 0.0 + (lod * 9.0), row * 1.6, 0)
    K.render(cam, os.path.join(PV, "gardens_lod0.jpg"), (2.6, -6.0, 1.6), (2.6, 1.4, 0.6), 30, (1800, 900))
    K.render(cam, os.path.join(PV, "gardens_close.jpg"), (0.5, -1.4, 1.05), (0.5, 0, 0.8), 40, (1400, 900))
    K.render(cam, os.path.join(PV, "gardens_lods.jpg"), (12.0, -14.0, 3.0), (12.0, 1.4, 0.6), 40, (1800, 900))
print(f"done {time.time() - T0:.0f}s")
