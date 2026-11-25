# THE CAUGHT PIGEON (the falcon's held prey, viewer/falconFlight/heldPrey.js; rule falcon-catch-fun "round 4"):
# a feral pigeon posed LIMP as a falcon carries it, built by script (no hand modelling), Blender 5.0 headless:
#   body + neck + head   ONE lofted skin along a spine (rings of 14 round 26 stations, a feral pigeon's profile: the full
#                        breast, the small head, the neck bent back so the head hangs)
#   beak, cere, eyes     small primitives set into the head
#   wings                the right one FOLDED against the flank (laid on the body's own surface, its tip by the tail's),
#                        the left one half open and drooping (a pigeon's broad arm, pointed hand, cambered, 5 mm thick)
#   tail                 a closed fan, its dark terminal band
#   legs                 short, pink, tucked to the belly
#   colour               vertex colours only (no texture): the blue-grey body, the slate head, the iridescent green /
#                        purple neck, the two black wing bars, the dark primaries, the white rump, the pink feet
# Frame (glTF): nose -z, belly -y, the LIMP parts (the head, the drooping wing) toward +y: the falcon holds it rolled
# belly-up (falconBird.js holdPrey), so +y is down in the talons. Metres, life size: beak tip to tail tip 0.32 m.
#   blender --factory-startup -b -P tools/blender/heldPigeon.py -- --out models/bird/prey/pigeon_held.glb [--sheet <dir>]
import bpy, bmesh, math, sys, os
from mathutils import Vector, Matrix

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None):
    return argv[argv.index(k) + 1] if k in argv else d
OUT = arg("--out", "models/bird/prey/pigeon_held.glb")
SHEET = arg("--sheet")

bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

# Blender frame: nose +Y, back +Z, the bird's left +X (glTF: x, z, -y -> nose -z, back +y)
def srgb(h):
    h = h.lstrip("#"); c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
COL = {
    "body": srgb("#8d939d"), "back": srgb("#9aa0a9"), "head": srgb("#686c76"), "green": srgb("#4f8d66"), "purple": srgb("#7d5180"),
    "rump": srgb("#e9e9e6"), "wing": srgb("#a9afb7"), "bar": srgb("#26272a"), "prim": srgb("#4a4c52"),
    "tail": srgb("#7f858e"), "band": srgb("#2a2b2e"), "beak": srgb("#3a3433"), "cere": srgb("#ebe6de"),
    "foot": srgb("#cc6f70"), "eye": srgb("#d9772a"), "pupil": srgb("#101010"), "belly": srgb("#959ba4"),
}
def mix(a, b, t): t = max(0, min(1, t)); return [a[k] + (b[k] - a[k]) * t for k in range(3)]
DROOP = math.radians(86)            # the neck bent back, the head hanging (toward +Z: the ground in the talons)
PIVOT = Vector((0, 0.058, 0.022))   # the base of the neck
def droop_w(y): return max(0.0, min(1.0, (y - 0.058) / 0.03))
def droop(p, w):
    a = DROOP * w; q = p - PIVOT
    return PIVOT + Vector((q.x, q.y * math.cos(a) - q.z * math.sin(a), q.y * math.sin(a) + q.z * math.cos(a)))

def new_obj(name, bm):
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    ob = bpy.data.objects.new(name, me); scn.collection.objects.link(ob); return ob
def colour_layer(bm): return bm.loops.layers.float_color.new("Col")
def face_colour(f, lay, fn):
    for l in f.loops: c = fn(l.vert); l[lay] = (c[0], c[1], c[2], 1.0)

# ------------------------------------------------------------------------------------------------ the body (a loft)
# stations: y (along the body, straight), z (the spine), rx (half width), up / dn (half heights over / under the spine)
ST = [(-0.088, 0.012, 0.006, 0.004, 0.004), (-0.082, 0.012, 0.020, 0.014, 0.012), (-0.065, 0.010, 0.033, 0.026, 0.024),
      (-0.045, 0.008, 0.043, 0.035, 0.035), (-0.022, 0.006, 0.050, 0.041, 0.044), (0.000, 0.006, 0.053, 0.043, 0.050),
      (0.022, 0.008, 0.051, 0.041, 0.052), (0.040, 0.012, 0.045, 0.036, 0.047), (0.054, 0.016, 0.034, 0.028, 0.036),
      (0.064, 0.020, 0.024, 0.021, 0.025), (0.074, 0.025, 0.019, 0.018, 0.019), (0.084, 0.030, 0.018, 0.017, 0.017),
      (0.094, 0.034, 0.020, 0.019, 0.018), (0.104, 0.036, 0.021, 0.020, 0.019), (0.114, 0.036, 0.019, 0.018, 0.017),
      (0.122, 0.035, 0.014, 0.013, 0.012), (0.127, 0.034, 0.007, 0.007, 0.006), (0.129, 0.034, 0.002, 0.002, 0.002)]
NR = 14
HEADC = droop(Vector((0, 0.104, 0.036)), 1)
HEADF = droop(Vector((0, 1, 0)) + PIVOT, 1) - PIVOT        # the head's forward (unit)
HEADU = droop(Vector((0, 0, 1)) + PIVOT, 1) - PIVOT        # the head's up
def body_skin():
    bm = bmesh.new(); lay = colour_layer(bm); rings = []
    for (y, z, rx, up, dn) in ST:
        ring = []
        for k in range(NR):
            a = 2 * math.pi * k / NR; c, s = math.cos(a), math.sin(a)
            p = Vector((rx * c, y, z + (up if s > 0 else dn) * s))
            v = bm.verts.new(droop(p, droop_w(y)))
            ring.append((v, y, s, c))
        rings.append(ring)
    for i in range(len(rings) - 1):
        for k in range(NR):
            a, b = rings[i][k], rings[i][(k + 1) % NR]; c, d = rings[i + 1][(k + 1) % NR], rings[i + 1][k]
            f = bm.faces.new((a[0], b[0], c[0], d[0]))
            ym = (a[1] + c[1]) / 2; sm = (a[2] + b[2] + c[2] + d[2]) / 4; cm = (a[3] + b[3] + c[3] + d[3]) / 4
            col = body_col(ym, sm, cm)
            for l in f.loops: l[lay] = (col[0], col[1], col[2], 1.0)
    # caps
    for ring in (rings[0], rings[-1]):
        f = bm.faces.new([r[0] for r in (ring if ring is rings[-1] else ring[::-1])])
        col = body_col(ring[0][1], 0, 0)
        for l in f.loops: l[lay] = (col[0], col[1], col[2], 1.0)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return new_obj("pigeon_body", bm)
def body_col(y, s, c):
    if y > 0.088: return COL["head"]
    if y > 0.06:                                          # the neck: iridescent, green over purple, banded round it
        return COL["green"] if (s > -0.2 and (y > 0.072 or c > 0.3 or c < -0.3)) else COL["purple"]
    if y > 0.045 and s < 0.2: return mix(COL["purple"], COL["body"], (0.06 - y) / 0.015)   # the iridescence onto the breast
    if y < -0.05 and s > 0.25: return COL["rump"]        # the white rump over the tail's base
    if s < -0.5: return COL["belly"]
    return COL["back"] if s > 0.5 else COL["body"]
body = body_skin()

# ------------------------------------------------------------------------------------------------ beak, cere, eyes
def cone(name, tip, base, r0, r1, seg, col):
    bm = bmesh.new(); lay = colour_layer(bm)
    bmesh.ops.create_cone(bm, cap_ends=True, segments=seg, radius1=r0, radius2=r1, depth=(tip - base).length)
    d = (tip - base).normalized()
    bmesh.ops.transform(bm, matrix=Matrix.Translation((tip + base) / 2) @ d.to_track_quat("Z", "Y").to_matrix().to_4x4(), verts=bm.verts)
    for f in bm.faces: face_colour(f, lay, lambda v: col)
    return new_obj(name, bm)
def ball(name, co, r, col_fn, seg=8):
    bm = bmesh.new(); lay = colour_layer(bm)
    bmesh.ops.create_uvsphere(bm, u_segments=seg, v_segments=max(4, seg // 2), radius=r)
    bmesh.ops.translate(bm, vec=co, verts=bm.verts)
    for f in bm.faces: face_colour(f, lay, col_fn)
    return new_obj(name, bm)
bb0 = droop(Vector((0, 0.121, 0.034)), 1); bt = droop(Vector((0, 0.141, 0.031)), 1)
beak = cone("beak", bt, bb0, 0.0055, 0.001, 8, COL["beak"])
cere = ball("cere", droop(Vector((0, 0.121, 0.040)), 1), 0.0052, lambda v: COL["cere"], 8)
eyes = []
for sx in (-1, 1):
    e = droop(Vector((sx * 0.0165, 0.108, 0.041)), 1)
    eyes.append(ball(f"eye{sx}", e, 0.0042, lambda v, e=e, sx=sx: COL["pupil"] if (v.co.x - e.x) * sx > 0.0022 else COL["eye"], 8))

# ------------------------------------------------------------------------------------------------ the wings
def sheet(name, nu, nv, P, col_fn, thick=0.004):
    """a quad sheet: P(u, v) -> Vector, col_fn(u, v) -> colour, solidified"""
    bm = bmesh.new(); lay = colour_layer(bm)
    G = [[bm.verts.new(P(i / nu, j / nv)) for j in range(nv + 1)] for i in range(nu + 1)]
    for i in range(nu):
        for j in range(nv):
            f = bm.faces.new((G[i][j], G[i + 1][j], G[i + 1][j + 1], G[i][j + 1]))
            c = col_fn((i + 0.5) / nu, (j + 0.5) / nv)
            for l in f.loops: l[lay] = (c[0], c[1], c[2], 1.0)
    ob = new_obj(name, bm)
    m = ob.modifiers.new("solid", "SOLIDIFY"); m.thickness = thick; m.offset = 0
    return ob
def surf_x(y, z):
    """the body's half width at (y, z) (the loft's ellipse, straight part), for laying the folded wing on it"""
    for i in range(len(ST) - 1):
        if ST[i][0] <= y <= ST[i + 1][0]:
            t = (y - ST[i][0]) / (ST[i + 1][0] - ST[i][0]); s = [ST[i][k] + (ST[i + 1][k] - ST[i][k]) * t for k in range(5)]
            h = s[3] if z > s[1] else s[4]; q = min(0.98, abs(z - s[1]) / max(h, 1e-4))
            return s[2] * math.sqrt(1 - q * q)
    return 0.004
# the FOLDED right wing (-X): u along it, from the shoulder (y 0.04) back to its tip by the tail's (y -0.17); v down
# the flank from the back's edge; laid 3 mm off the body's surface where it covers the body, then free over the tail
def folded(u, v):
    y = 0.04 - u * 0.21
    top = 0.040 - 0.012 * u; z = top - v * (0.062 * (1 - 0.55 * u ** 1.5))
    x = -(surf_x(y, z) + 0.004) if y > -0.085 else -(0.012 + 0.01 * (1 - v))
    return Vector((x, y, z - (0.012 * max(0, -0.085 - y) / 0.085)))
def folded_col(u, v):
    if u > 0.78: return COL["prim"]
    if 0.40 < u < 0.47 or 0.55 < u < 0.62: return COL["bar"] if v < 0.8 else COL["wing"]   # the two black bars
    return COL["wing"]
wR = sheet("wing_R", 14, 5, folded, folded_col)
# the OPEN left wing (+X), half spread and drooping: u out along the leading edge (0.24 m), v back across the chord
def open_wing(u, v):
    L = 0.24
    chord = 0.095 * (1 - u) + 0.05 * u - 0.03 * u ** 4
    x, y = u * L, -0.16 * L * u ** 1.5 - v * chord
    z = 0.010 * math.sin(math.pi * v) * (1 - 0.5 * u)
    p = Vector((x, y, z))
    p = Matrix.Rotation(math.radians(-28), 3, "Z") @ (Matrix.Rotation(math.radians(-42), 3, "Y") @ p)   # back, then down (+Z)
    return p + Vector((0.040, 0.035, 0.024))
def open_col(u, v):
    if u > 0.55: return mix(COL["wing"], COL["prim"], (u - 0.55) / 0.15)
    if 0.08 < u < 0.42 and (0.58 < v < 0.64 or 0.74 < v < 0.80): return COL["bar"]          # the bars across the inner wing
    return COL["wing"]
wL = sheet("wing_L", 12, 10, open_wing, open_col)

# ------------------------------------------------------------------------------------------------ the tail
def tail_p(u, v):
    w = 0.036 + 0.026 * u
    return Vector(((v - 0.5) * w, -0.075 - u * 0.125, 0.014 + 0.012 * u))
tail = sheet("tail", 6, 5, tail_p, lambda u, v: COL["band"] if u > 0.76 else COL["tail"], 0.004)

# ------------------------------------------------------------------------------------------------ the legs (tucked)
legs = []
for sx in (-1, 1):
    hip = Vector((sx * 0.016, -0.004, -0.030)); foot = hip + Vector((0, 0.004, -0.016))      # (tucked: the feet no lower than the belly)
    legs.append(cone(f"tarsus{sx}", foot, hip, 0.0032, 0.0042, 6, COL["foot"]))
    for a in (-0.45, 0.0, 0.45):
        d = Vector((math.sin(a) * 0.6, math.cos(a), 0.45)).normalized()
        legs.append(cone(f"toe{sx}{a}", foot + d * 0.02, foot, 0.0011, 0.0022, 5, COL["foot"]))
    legs.append(cone(f"hallux{sx}", foot + Vector((0, -0.012, 0.004)), foot, 0.001, 0.002, 5, COL["foot"]))

# ------------------------------------------------------------------------------------------------ join, export
def apply_all(ob):
    for m in list(ob.modifiers):
        with bpy.context.temp_override(object=ob, active_object=ob): bpy.ops.object.modifier_apply(modifier=m.name)
for ob in [wL, wR, tail]: apply_all(ob)
bpy.ops.object.select_all(action="DESELECT")
parts = [body, wL, wR, tail, beak, cere, *eyes, *legs]
for ob in parts: ob.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join()
pig = bpy.context.active_object; pig.name = "pigeon_held"
for poly in pig.data.polygons: poly.use_smooth = True
wn = pig.modifiers.new("wn", "WEIGHTED_NORMAL"); wn.keep_sharp = True
pig.data.set_sharp_from_angle(angle=math.radians(50))
apply_all(pig)
tris = sum(len(p.vertices) - 2 for p in pig.data.polygons)
print(f"pigeon_held: {tris} triangles, {len(pig.data.vertices)} vertices")
mat = bpy.data.materials.new("pigeon_held")
mat.use_nodes = True
nt = mat.node_tree; bsdf = nt.nodes["Principled BSDF"]; vc = nt.nodes.new("ShaderNodeVertexColor"); vc.layer_name = "Col"
nt.links.new(vc.outputs["Color"], bsdf.inputs["Base Color"]); bsdf.inputs["Roughness"].default_value = 0.8
pig.data.materials.append(mat)
os.makedirs(os.path.dirname(os.path.abspath(OUT)), exist_ok=True)
pig.select_set(True)
bpy.ops.export_scene.gltf(filepath=OUT, export_format="GLB", use_selection=True, export_apply=True, export_normals=True,
                          export_texcoords=False, export_materials="EXPORT", export_vertex_color="ACTIVE")
print("wrote", OUT, tris)

# ------------------------------------------------------------------------------------------------ the check sheet
if SHEET:
    os.makedirs(SHEET, exist_ok=True)
    scn.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"; print("Cycles device:", kind); break
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.samples = 48; scn.render.resolution_x = 520; scn.render.resolution_y = 400
    world = bpy.data.worlds.new("w"); scn.world = world; world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = (0.55, 0.6, 0.68, 1); world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.7
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    sun.data.energy = 3.5; sun.rotation_euler = (math.radians(40), math.radians(15), math.radians(30))
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    cam.data.lens = 60
    views = [("upright_side", (0, 0, 0), (0.75, 0.0, 0.05)), ("upright_three", (0, 0, 0), (0.5, 0.45, 0.35)), ("upright_top", (0, 0, 0), (0.05, -0.02, 0.8)),
             ("held_side", (0, math.pi, 0), (0.75, 0.0, -0.05)), ("held_below", (0, math.pi, 0), (0.25, -0.1, -0.75)), ("held_front", (0, math.pi, 0), (0.1, 0.75, -0.1))]
    for name, rot, loc in views:
        pig.rotation_euler = rot; cam.location = loc
        d = Vector((0, -0.02, 0)) - Vector(loc); cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
        scn.render.filepath = os.path.join(SHEET, f"pigeon_{name}.png")
        bpy.ops.render.render(write_still=True)
    print("sheet", SHEET)
