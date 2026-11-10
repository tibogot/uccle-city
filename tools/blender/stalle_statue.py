"""THE VIRGIN AND CHILD over the west door of the Chapelle de Stalle ('O.L. Vrouw der Nood', photo c03, Commons EmDee
2011): a standing Virgin ~1.08 m in weathered white stone, the Child seated on her left arm, her right hand in front
holding his leg, her head bowed and turned toward him; a long robe falling in deep folds to the feet, a mantle over the
shoulders drawn across the front in a diagonal swag up to the Child.

Everything is scripted (no hand modelling):
  1. bodies: skin-modifier skeletons (Mary, the Child) built in a REST pose, bound to ARMATURES (envelope weights) and
     POSED by bone constraints toward the photo's joint positions, the armature applied;
  2. heads sculpted by script: a dense sphere displaced by facial features (brow, eye sockets and lids, nose, cheeks,
     mouth, chin, jaw), hair masses with wave grooves; hands with fingers from the skin skeleton;
  3. drapery SCULPTED BY SCRIPT (a cloth simulation was tried first: headless it gave boxy shelves and crumpled hooks):
     the robe (deep tubular folds widening to the hem, a break over the bent knee, the girdle), sleeves on the posed
     arms, the mantle over the shoulders and back with its front edges at the sides, the diagonal swag (a rolled edge)
     with the apron of cloth below it, the fall over her left forearm; thickened into closed shells;
  4. all parts united into ONE watertight surface (voxel remesh, 4.5 mm: no intersections, no inner faces), smoothed,
     weathered (erosion noise 1 mm + softened crisp edges);
  5. written as models/stalle/statue_raw.json; tools/stalle_statue_pack.mjs simplifies it with meshoptimizer (JS) to
     models/stalle/statue_mesh.json, which tools/blender/stalle.py places on the pedestal.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stalle_statue.py -- models/stalle [--preview docs/stalle]

Frame (written): x = the viewer's LEFT, y = forward (out of the wall), z up (right-handed); origin = the plinth's top
centre. (The design tables put the Child at +x; the export mirrors x so that he sits on the viewer's right.)
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix, Euler, noise

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stalle")
PREV = ARGS[ARGS.index("--preview") + 1] if "--preview" in ARGS else None
T0 = time.time()
sys.stdout.reconfigure(line_buffering=True)
def tick(what): print(f"[statue] {what} {time.time() - T0:.1f}s")
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
scn.render.fps = 24

def link(o): scn.collection.objects.link(o); return o
def activate(o):
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
def apply_all(o):
    activate(o)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)

# ------------------------------------------------------------------------------------------------ skeletons
# joints: name -> (rest position, posed position, skin radius (x, y)); bones: (name, head joint, tail joint, parent)
def V(x, y, z): return Vector((x, y, z))
MARY = {
    # name: rest, posed, radius
    "root":   (V(0, 0, 0.50), V(0.012, 0.0, 0.50), (0.105, 0.075)),
    "waist":  (V(0, 0, 0.62), V(0.006, 0.004, 0.62), (0.075, 0.058)),
    "chest":  (V(0, 0, 0.76), V(-0.004, 0.008, 0.755), (0.085, 0.062)),
    "neck":   (V(0, 0, 0.86), V(0.0, 0.016, 0.85), (0.026, 0.026)),
    "headb":  (V(0, 0, 0.885), V(0.008, 0.024, 0.873), (0.03, 0.03)),
    "hipL":   (V(0.055, 0, 0.47), V(0.066, 0.0, 0.47), (0.06, 0.06)),
    "kneeL":  (V(0.055, 0, 0.25), V(0.058, 0.03, 0.25), (0.045, 0.045)),
    "ankL":   (V(0.055, 0, 0.04), V(0.06, 0.0, 0.04), (0.03, 0.03)),
    "toeL":   (V(0.055, 0.09, 0.015), V(0.075, 0.085, 0.015), (0.025, 0.02)),
    "hipR":   (V(-0.055, 0, 0.47), V(-0.045, 0.0, 0.47), (0.06, 0.06)),
    "kneeR":  (V(-0.055, 0, 0.25), V(-0.06, 0.06, 0.26), (0.045, 0.045)),
    "ankR":   (V(-0.055, 0, 0.04), V(-0.07, 0.04, 0.04), (0.03, 0.03)),
    "toeR":   (V(-0.055, 0.09, 0.015), V(-0.09, 0.12, 0.015), (0.025, 0.02)),
    "shL":    (V(0.1, 0, 0.82), V(0.098, 0.006, 0.81), (0.04, 0.04)),
    "elbL":   (V(0.12, 0, 0.6), V(0.15, 0.035, 0.632), (0.03, 0.03)),
    "wriL":   (V(0.13, 0, 0.42), V(0.118, 0.13, 0.69), (0.022, 0.018)),
    "handL":  (V(0.135, 0, 0.36), V(0.085, 0.165, 0.71), (0.022, 0.012)),
    "shR":    (V(-0.1, 0, 0.82), V(-0.098, 0.006, 0.81), (0.04, 0.04)),
    "elbR":   (V(-0.12, 0, 0.6), V(-0.13, 0.05, 0.622), (0.03, 0.03)),
    "wriR":   (V(-0.13, 0, 0.42), V(-0.02, 0.135, 0.645), (0.022, 0.018)),
    "handR":  (V(-0.135, 0, 0.36), V(0.04, 0.15, 0.66), (0.023, 0.012)),
}
MARY_BONES = [("spine0", "root", "waist", None), ("spine1", "waist", "chest", "spine0"), ("neck", "chest", "neck", "spine1"),
              ("head", "neck", "headb", "neck"),
              ("thighL", "hipL", "kneeL", "spine0"), ("shinL", "kneeL", "ankL", "thighL"), ("footL", "ankL", "toeL", "shinL"),
              ("thighR", "hipR", "kneeR", "spine0"), ("shinR", "kneeR", "ankR", "thighR"), ("footR", "ankR", "toeR", "shinR"),
              ("clavL", "chest", "shL", "spine1"), ("upperL", "shL", "elbL", "clavL"), ("foreL", "elbL", "wriL", "upperL"), ("handL", "wriL", "handL", "foreL"),
              ("clavR", "chest", "shR", "spine1"), ("upperR", "shR", "elbR", "clavR"), ("foreR", "elbR", "wriR", "upperR"), ("handR", "wriR", "handR", "foreR")]
MARY_EDGES = [("root", "waist"), ("waist", "chest"), ("chest", "neck"), ("neck", "headb"), ("root", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"), ("ankL", "toeL"),
              ("root", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"), ("ankR", "toeR"), ("chest", "shL"), ("shL", "elbL"), ("elbL", "wriL"), ("wriL", "handL"),
              ("chest", "shR"), ("shR", "elbR"), ("elbR", "wriR"), ("wriR", "handR")]

def fix_lengths(J, bones):
    """make every posed bone as long as its rest bone (constraints only rotate): walk the chains from the root"""
    for name, h, t, parent in bones:
        rest = (J[t][0] - J[h][0]).length
        d = (J[t][1] - J[h][1])
        J[t] = (J[t][0], J[h][1] + d.normalized() * rest, J[t][2])

def skin_body(name, J, edges, fingers=None):
    """a skin-modifier body in the REST pose (+ fingers on the hands), subdivided: returns the object"""
    verts, rad, idx = [], [], {}
    for k, (rest, _, r) in J.items():
        idx[k] = len(verts); verts.append(rest); rad.append(r)
    E = [(idx[a], idx[b]) for a, b in edges]
    for (hand, wrist, side, scale) in (fingers or []):
        # 4 fingers + a thumb: short chains from the hand node, curled
        hp, wp = J[hand][0], J[wrist][0]
        ax = (hp - wp).normalized(); sideax = Vector((1, 0, 0)) * side
        for f in range(5):
            if f < 4:
                base = hp + sideax * ((f - 1.5) * 0.008 * scale) + ax * 0.004 * scale
                L = [0.022, 0.016, 0.013][:3]
                Ls = [l * scale * (1.0 if f in (1, 2) else 0.85) for l in L]
                dirn = ax
            else:
                base = wp + ax * 0.012 * scale + sideax * (-0.014 * scale)
                Ls = [0.016 * scale, 0.013 * scale]
                dirn = (ax * 0.6 - sideax * 0.8).normalized()
            prev = idx[hand] if f < 4 else idx[wrist]
            p = base
            i0 = len(verts); verts.append(base); rad.append((0.0055 * scale, 0.0048 * scale)); E.append((prev, i0)); prev = i0
            for j, l in enumerate(Ls):
                p = p + dirn * l
                i = len(verts); verts.append(p); rad.append((0.0048 * scale * (0.92 ** j), 0.0042 * scale * (0.92 ** j))); E.append((prev, i)); prev = i
    me = bpy.data.meshes.new(name); me.from_pydata([tuple(v) for v in verts], E, []); me.update()
    o = link(bpy.data.objects.new(name, me))
    sk = o.modifiers.new("skin", "SKIN"); sk.use_smooth_shade = True; sk.branch_smoothing = 0.6
    for i, r in enumerate(rad):
        me.skin_vertices[0].data[i].radius = r
    me.skin_vertices[0].data[idx["root"]].use_root = True
    sub = o.modifiers.new("sub", "SUBSURF"); sub.levels = 2; sub.render_levels = 2
    apply_all(o)
    return o

def armature_pose(body, J, bones, name):
    """bind the rest-pose body to an armature (envelope weights) and pose it: each bone tracks its posed tail joint"""
    arm = bpy.data.armatures.new(name + "_arm"); ao = link(bpy.data.objects.new(name + "_rig", arm))
    activate(ao); bpy.ops.object.mode_set(mode="EDIT")
    eb = {}
    for bn, h, t, parent in bones:
        b = arm.edit_bones.new(bn); b.head = J[h][0]; b.tail = J[t][0]
        b.envelope_distance = 0.06; b.head_radius = J[h][2][0] * 0.8; b.tail_radius = J[t][2][0] * 0.8
        if parent: b.parent = eb[parent]; b.use_connect = (eb[parent].tail - b.head).length < 1e-6
        eb[bn] = b
    bpy.ops.object.mode_set(mode="OBJECT")
    for x in scn.objects: x.select_set(False)
    body.select_set(True); ao.select_set(True); bpy.context.view_layer.objects.active = ao
    bpy.ops.object.parent_set(type="ARMATURE_ENVELOPE")
    # the pose: a damped track per bone toward an empty at its posed tail (parents first: children follow)
    for bn, h, t, parent in bones:
        e = link(bpy.data.objects.new(f"{name}_{bn}_tgt", None)); e.location = J[t][1]
        c = ao.pose.bones[bn].constraints.new("DAMPED_TRACK"); c.target = e; c.track_axis = "TRACK_Y"
    # the root bone also moves to its posed head (a location offset on the rig)
    ao.location = J[bones[0][1]][1] - J[bones[0][1]][0]
    bpy.context.view_layer.update()
    activate(body)
    for m in list(body.modifiers):
        if m.type == "ARMATURE": bpy.ops.object.modifier_apply(modifier=m.name)
    body.parent = None
    body.matrix_world = Matrix.Identity(4)
    return body

# ------------------------------------------------------------------------------------------------ heads (sculpt by script)
def g3(p, c, s):
    d = Vector(((p.x - c[0]) / s[0], (p.y - c[1]) / s[1], (p.z - c[2]) / s[2]))
    return math.exp(-d.length_squared)
def sculpt_head(name, k=1.0, child=False):
    """a head (Mary: 0.135 m tall; the Child: k = 0.66 of it, rounder): a dense sphere shaped into a skull and a face,
    displaced by features. Local frame: the face toward +y, up +z, origin at the head's centre."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=72, radius=1.0)
    for v in bm.verts:
        p = v.co.copy()
        sx, sy, sz = (0.05, 0.06, 0.068) if not child else (0.05, 0.052, 0.054)
        jaw = max(0.0, -p.z) ** 1.5
        q = Vector((p.x * sx * (1 - (0.3 if not child else 0.1) * jaw), p.y * sy * (1 - 0.1 * jaw), p.z * sz))
        if p.y > 0: q.y *= 1 - 0.22 * p.y ** 2 * (0.4 if child else 1.0)          # the face plane
        if p.y < -0.3: q.y *= 1.06                                                # the occiput
        q *= k
        s = k                                                                     # feature scale
        ez = 0.004 * s if not child else -0.006 * s
        fy = q.y
        F = 0.0
        for e in (-1, 1):
            F -= 0.007 * s * g3(q, (e * 0.02 * s, fy, ez + 0.002 * s), (0.012 * s, 1, 0.009 * s))          # eye sockets
            F += 0.0032 * s * g3(q, (e * 0.02 * s, fy, ez), (0.0075 * s, 1, 0.0042 * s))                  # the lids (downcast)
            F -= 0.0012 * s * g3(q, (e * 0.02 * s, fy, ez - 0.0012 * s), (0.007 * s, 1, 0.0009 * s))      # the lid line
            if not child: F += 0.0032 * g3(q, (e * 0.024, fy, ez + 0.015), (0.017, 1, 0.0045))             # brow ridge
            F += 0.004 * s * g3(q, (e * 0.026 * s, fy, ez - 0.02 * s), (0.014 * s, 1, 0.013 * s))         # cheeks
            if child: F += 0.006 * s * g3(q, (e * 0.024 * s, fy, ez - 0.022 * s), (0.016 * s, 1, 0.014 * s))
        nz = ez - 0.006 * s
        F += (0.013 if not child else 0.007) * s * g3(q, (0.0, fy, nz - 0.011 * s), (0.0052 * s, 1, (0.016 if not child else 0.009) * s))   # nose
        F += (0.005 if not child else 0.004) * s * g3(q, (0.0, fy, nz - 0.025 * s), (0.0085 * s, 1, 0.0055 * s))                           # tip + wings
        F -= 0.0018 * s * sum(g3(q, (e * 0.0055 * s, fy, nz - 0.029 * s), (0.0025 * s, 1, 0.002 * s)) for e in (-1, 1))                  # nostrils
        mz = nz - (0.041 if not child else 0.034) * s
        F += 0.0016 * s * g3(q, (0.0, fy, mz + 0.0075 * s), (0.004 * s, 1, 0.0035 * s))      # philtrum
        F += 0.003 * s * g3(q, (0.0, fy, mz + 0.0035 * s), (0.011 * s, 1, 0.003 * s))        # upper lip
        F -= 0.0026 * s * g3(q, (0.0, fy, mz), (0.012 * s, 1, 0.0011 * s))                   # the mouth line
        F += 0.0027 * s * g3(q, (0.0, fy, mz - 0.004 * s), (0.009 * s, 1, 0.0028 * s))       # lower lip
        F -= 0.0026 * s * g3(q, (0.0, fy, mz - 0.011 * s), (0.01 * s, 1, 0.003 * s))         # under the lip
        F += 0.0045 * s * g3(q, (0.0, fy, mz - 0.022 * s), (0.012 * s, 1, 0.008 * s))        # chin
        face = max(0.0, min(1.0, (p.y - 0.15) * 3.0))                                          # features only on the face
        n = q.normalized()
        v.co = q + n * F * face
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def hair_mass(name, k=1.0, child=False):
    """Mary: hair parted in the middle, waves over the temples, gathered in a knot at the back; the Child: curls.
    A shell over the skull that never covers the face (it sinks inside the head there)."""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=80, v_segments=60, radius=1.0)
    for v in bm.verts:
        p = v.co.copy()
        if child:
            q = Vector((p.x * 0.05, p.y * 0.052, p.z * 0.054)) * k
            r = 0.002 + (noise.noise(p * 7.0) * 0.5 + 0.5) * 0.0045
            face = p.y > 0.25 and p.z < 0.45
            v.co = q * (0.9 if face else 1.0) + q.normalized() * (0.0 if face else r)
            continue
        q = Vector((p.x * 0.05, p.y * 0.06, p.z * 0.068))
        face = max(0.0, min(1.0, (p.y - 0.05) * 3.0)) * max(0.0, min(1.0, (0.62 - p.z) * 3.0))
        temple = math.exp(-((abs(p.x) - 0.75) ** 2) / 0.05) * max(0.0, p.y + 0.2)
        wave = 0.0022 * math.sin(p.z * 18 + abs(p.x) * 26) + 0.0015 * math.sin(math.atan2(p.z, abs(p.x) + 0.05) * 30)
        lift = (0.0045 + wave + 0.004 * temple) * (1 - face)
        if p.z > 0.55 and abs(p.x) < 0.07: lift -= 0.0018                                 # the parting
        knot = 0.02 * math.exp(-((p.y + 0.85) ** 2 + (p.z - 0.35) ** 2 + p.x ** 2 * 0.6) / 0.06)
        sink = 1.0 - 0.18 * face                                                          # inside the face
        v.co = q * sink + q.normalized() * (lift + knot)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def place(o, loc, rot=(0, 0, 0)):
    o.data.transform(Euler(rot, "XYZ").to_matrix().to_4x4()); o.data.transform(Matrix.Translation(loc)); o.data.update()

def grid_surface(name, nu, nv, fn, wrap=False):
    """a quad grid surface: fn(u, v) -> Vector, u in [0, 1] (wraps when `wrap`), v in [0, 1]"""
    bm = bmesh.new(); rows = []
    for j in range(nv + 1):
        rows.append([bm.verts.new(fn(i / nu, j / nv)) for i in range(nu if wrap else nu + 1)])
    n = nu if wrap else nu + 1
    for j in range(nv):
        for i in range(nu):
            a, b = i, (i + 1) % n
            if not wrap and b == 0: continue
            bm.faces.new((rows[j][a], rows[j][b], rows[j + 1][b], rows[j + 1][a]))
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def thicken(o, th):
    s = o.modifiers.new("solid", "SOLIDIFY"); s.thickness = th; s.offset = -1.0; s.use_rim = True; s.use_even_offset = True
    apply_all(o); return o

def sstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)
def lerp_table(T, z):
    for i in range(len(T) - 1):
        z0, a0 = T[i][0], T[i][1:]; z1, a1 = T[i + 1][0], T[i + 1][1:]
        if z0 >= z >= z1:
            t = (z0 - z) / (z0 - z1); t = t * t * (3 - 2 * t)
            return [a0[k] + (a1[k] - a0[k]) * t for k in range(len(a0))]
    return list(T[0][1:] if z > T[0][0] else T[-1][1:])

# ------------------------------------------------------------------------------------------------ build Mary
fix_lengths(MARY, MARY_BONES)
body = skin_body("Mary", MARY, MARY_EDGES, fingers=[("handL", "wriL", 1, 1.0), ("handR", "wriR", -1, 1.0)])
body = armature_pose(body, MARY, MARY_BONES, "Mary"); tick("Mary posed")
HEAD_ROT = (math.radians(-18), math.radians(9), math.radians(17))      # bowed, inclined and turned toward the Child
hp = MARY["headb"][1] + Vector((0.004, 0.012, 0.052))
head = sculpt_head("MaryHead"); place(head, hp, HEAD_ROT)
hair = hair_mass("MaryHair"); place(hair, hp, HEAD_ROT)
neck = link(bpy.data.objects.new("MaryNeck", bpy.data.meshes.new("MaryNeck")))
bmn = bmesh.new(); bmesh.ops.create_cone(bmn, cap_ends=True, segments=32, radius1=0.03, radius2=0.025, depth=0.075)
bmn.to_mesh(neck.data); bmn.free(); place(neck, MARY["neck"][1] + Vector((0.003, 0.012, 0.03)), (math.radians(-14), 0, 0))

# ------------------------------------------------------------------------------------------------ the Child (seated on her left arm)
CH = {
    "root":  (V(0, 0, 0.0), V(0.125, 0.118, 0.738), (0.05, 0.045)),
    "chest": (V(0, 0, 0.1), V(0.12, 0.112, 0.835), (0.047, 0.041)),
    "neck":  (V(0, 0, 0.14), V(0.118, 0.114, 0.873), (0.019, 0.019)),
    "hipL":  (V(0.03, 0, -0.008), V(0.15, 0.13, 0.735), (0.028, 0.028)),
    "kneeL": (V(0.03, 0, -0.085), V(0.105, 0.205, 0.728), (0.023, 0.023)),
    "ankL":  (V(0.03, 0, -0.16), V(0.07, 0.235, 0.67), (0.016, 0.016)),
    "hipR":  (V(-0.03, 0, -0.008), V(0.1, 0.13, 0.738), (0.028, 0.028)),
    "kneeR": (V(-0.03, 0, -0.085), V(0.03, 0.195, 0.718), (0.023, 0.023)),
    "ankR":  (V(-0.03, 0, -0.16), V(-0.01, 0.215, 0.648), (0.016, 0.016)),
    "shL":   (V(0.045, 0, 0.11), V(0.16, 0.108, 0.83), (0.021, 0.021)),
    "elbL":  (V(0.052, 0, 0.04), V(0.185, 0.13, 0.775), (0.017, 0.017)),
    "wriL":  (V(0.056, 0, -0.03), V(0.175, 0.175, 0.782), (0.013, 0.012)),
    "shR":   (V(-0.045, 0, 0.11), V(0.08, 0.118, 0.83), (0.021, 0.021)),
    "elbR":  (V(-0.052, 0, 0.04), V(0.035, 0.15, 0.818), (0.017, 0.017)),
    "wriR":  (V(-0.056, 0, -0.03), V(0.0, 0.192, 0.855), (0.013, 0.012)),
}
CH_BONES = [("spine", "root", "chest", None), ("neck", "chest", "neck", "spine"),
            ("thighL", "hipL", "kneeL", "spine"), ("shinL", "kneeL", "ankL", "thighL"), ("thighR", "hipR", "kneeR", "spine"), ("shinR", "kneeR", "ankR", "thighR"),
            ("upperL", "shL", "elbL", "spine"), ("foreL", "elbL", "wriL", "upperL"), ("upperR", "shR", "elbR", "spine"), ("foreR", "elbR", "wriR", "upperR")]
CH_EDGES = [("root", "chest"), ("chest", "neck"), ("root", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"), ("root", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"),
            ("chest", "shL"), ("shL", "elbL"), ("elbL", "wriL"), ("chest", "shR"), ("shR", "elbR"), ("elbR", "wriR")]
fix_lengths(CH, CH_BONES)
child = skin_body("Child", CH, CH_EDGES)
child = armature_pose(child, CH, CH_BONES, "Child"); tick("Child posed")
chp = CH["neck"][1] + Vector((-0.004, 0.008, 0.036))
CH_ROT = (math.radians(-6), math.radians(-6), math.radians(-22))         # he turns toward the viewer and his mother
chead = sculpt_head("ChildHead", k=0.7, child=True); place(chead, chp, CH_ROT)
chair = hair_mass("ChildHair", k=0.7, child=True); place(chair, chp, CH_ROT)

# ------------------------------------------------------------------------------------------------ drapery (sculpted by script)
# The robe: a surface around the body (ellipse radii per height, the figure faces +y), deep tubular folds below the
# girdle that widen toward the hem and fan out on the plinth, a break over her bent right knee (design -x), soft
# folds from the neckline; the mantle: over the shoulders and the back, its front edges falling at the sides, and
# the diagonal swag across her front (a rolled edge from her right hip up to the Child) with the apron of cloth below
# it. Thickened (1.2 cm) into closed shells, then united with the bodies by the voxel remesh.
ROBE = [  # z, rx, ry, cx, cy
    (0.865, 0.03, 0.028, 0.004, 0.018), (0.84, 0.072, 0.052, 0.004, 0.014), (0.81, 0.122, 0.066, 0.0, 0.01), (0.77, 0.118, 0.08, -0.002, 0.012),
    (0.72, 0.108, 0.08, 0.0, 0.012), (0.64, 0.096, 0.07, 0.004, 0.008), (0.6, 0.1, 0.072, 0.008, 0.008), (0.5, 0.128, 0.086, 0.012, 0.01),
    (0.38, 0.136, 0.094, 0.008, 0.02), (0.24, 0.15, 0.104, 0.0, 0.03), (0.1, 0.17, 0.12, -0.006, 0.035), (0.0, 0.188, 0.138, -0.01, 0.04)]
KNEE = Vector((-0.06, 0.1, 0.27))
def robe_fn(u, v):
    z = 0.865 - 0.865 * v
    rx, ry, cx, cy = lerp_table(ROBE, z)
    th = 2 * math.pi * u                                    # 0 = front (+y), toward +x
    d = Vector((math.sin(th), math.cos(th), 0.0))
    p = Vector((cx + rx * d.x, cy + ry * d.y, z))
    nrm = Vector((d.x / rx, d.y / ry, 0)).normalized()
    fall = sstep(0.62, 0.02, z)                             # folds grow from the girdle to the hem
    ph = 0.7 * math.sin(z * 5.0) + 0.4 * math.sin(th * 2 + z * 3)
    s1 = math.sin(9 * th + ph); s2 = math.sin(15 * th + 1.7 * ph + 1.3)
    fold = (0.85 * s1 + 0.35 * s1 * abs(s1) + 0.3 * s2) * (0.006 + 0.026 * fall)
    front = max(0.0, math.cos(th))                          # the front hangs straighter, the sides fold deeper
    fold *= 0.75 + 0.5 * (1 - front)
    upper = sstep(0.62, 0.8, z) * 0.0035 * math.sin(11 * th + 2.0) * (1 - sstep(0.82, 0.86, z))   # neckline folds
    bust = 0.012 * sum(math.exp(-((p.x - e * 0.045) ** 2 + (z - 0.735) ** 2) / 0.0012) for e in (-1, 1)) * max(0.0, d.y)
    knee = 0.034 * math.exp(-((p - KNEE).length_squared) / 0.0045)
    girdle = -0.004 * math.exp(-((z - 0.6) ** 2) / 0.0004)
    hem = 0.018 * sstep(0.06, 0.0, z) * (0.6 + 0.4 * s1)    # the hem spreads on the plinth
    return p + nrm * (fold + upper + bust + knee + girdle + hem)
robe = thicken(grid_surface("Robe", 220, 150, robe_fn, wrap=True), 0.012); tick("robe")
# a girdle cord
gird = grid_surface("Girdle", 64, 8, lambda u, v: (lambda th, a: Vector((0.008 + 0.104 * math.sin(th) + 0.007 * math.cos(a) * math.sin(th), 0.008 + 0.076 * math.cos(th) + 0.007 * math.cos(a) * math.cos(th), 0.603 + 0.007 * math.sin(a))))(2 * math.pi * u, 2 * math.pi * v), wrap=True)
gird = thicken(gird, 0.002)

def sleeve(name, a, b, c, r0, r1, rc):
    """a sleeve along the posed arm (shoulder a -> elbow b -> wrist c), ring folds, a flared cuff short of the wrist"""
    pts = [a, b, c]
    def at(t):
        if t < 0.5: return a.lerp(b, t * 2), (b - a).normalized()
        return b.lerp(c, (t - 0.5) * 2), (c - b).normalized()
    def fn(u, v):
        t = v * 0.93
        p, T = at(t)
        if 0.42 < t < 0.58: T = ((b - a).normalized() + (c - b).normalized()).normalized()
        X = T.cross(Vector((0, 0, 1))); X = X.normalized() if X.length > 1e-3 else Vector((1, 0, 0)); Y = T.cross(X)
        th = 2 * math.pi * u
        r = r0 + (r1 - r0) * t + (rc - r1) * sstep(0.8, 0.93, t) + 0.003 * math.sin(th * 5 + t * 9) + 0.0035 * math.sin(t * 40) * (1 - abs(math.cos(th)))
        return p + (X * math.cos(th) + Y * math.sin(th)) * r
    return thicken(grid_surface(name, 48, 60, fn, wrap=True), 0.006)
slL = sleeve("SleeveL", MARY["shL"][1], MARY["elbL"][1], MARY["wriL"][1], 0.04, 0.032, 0.04)
slR = sleeve("SleeveR", MARY["shR"][1], MARY["elbR"][1], MARY["wriR"][1], 0.04, 0.032, 0.04)

MANT = [  # z, rx, ry (the mantle's base surface outside the robe + sleeves)
    (0.86, 0.06, 0.052), (0.83, 0.115, 0.07), (0.8, 0.168, 0.085), (0.74, 0.178, 0.1), (0.62, 0.17, 0.1), (0.5, 0.17, 0.105),
    (0.3, 0.178, 0.118), (0.12, 0.195, 0.135)]
def mantle_fn(u, v):
    # u: from the front-right edge (th = -125 deg) around the BACK to the front-left edge (+125 deg); v: top -> hem
    th = math.radians(-125 + 250 * u)
    sideU = abs(u - 0.5) * 2                                # 0 at the back, 1 at the front edges
    hem = 0.13 + 0.2 * sideU ** 2.2                         # the hem rises toward the front edges
    z = 0.865 - (0.865 - hem) * v
    rx, ry = lerp_table(MANT, z)
    d = Vector((math.sin(th + math.pi), math.cos(th + math.pi), 0))   # th measured from the BACK here
    p = Vector((0.004 + rx * d.x, 0.004 + ry * d.y, z))
    nrm = Vector((d.x / rx, d.y / ry, 0)).normalized()
    fall = sstep(0.8, 0.2, z)
    ph = 0.5 * math.sin(z * 6.0)
    s1 = math.sin(6 * th + ph + 0.4); s2 = math.sin(11 * th + 2 * ph)
    fold = (0.8 * s1 + 0.3 * s1 * abs(s1) + 0.25 * s2) * (0.004 + 0.022 * fall)
    edge = sstep(0.85, 1.0, sideU)                          # the front edges roll inward a little
    return p + nrm * (fold - 0.01 * edge) + Vector((0, 0, -0.012 * edge * (1 - v)))
mant = thicken(grid_surface("Mantle", 170, 130, mantle_fn), 0.01); tick("mantle")

# the front swag: a rolled fold from her right hip (design -x) up to under the Child, and the apron below it
SW_A, SW_B = Vector((-0.15, 0.085, 0.49)), Vector((0.12, 0.165, 0.705))
def swag_top(t):
    p = SW_A.lerp(SW_B, t)
    sag = 0.05 * math.sin(math.pi * t)                     # a catenary-like sag
    out = 0.03 * math.sin(math.pi * t) ** 0.7               # it stands off the robe in front
    return p + Vector((0, out, -sag))
def apron_fn(u, v):
    top = swag_top(u)
    bot = Vector((-0.16 + 0.32 * u, 0.06 + 0.07 * math.sin(math.pi * u) + 0.04 * u, 0.36 + 0.18 * u * u))
    p = top.lerp(bot, v)
    th = math.atan2(p.x, p.y - 0.01)
    rx, ry, cx, cy = lerp_table(ROBE, p.z)
    base = Vector((cx + (rx + 0.02) * math.sin(th), cy + (ry + 0.02) * math.cos(th), p.z))
    p = Vector((p.x, max(p.y, base.y), p.z)) if abs(th) < 1.4 else p
    # diagonal folds radiating from the right hip, deepening toward the hem
    fold = math.sin(u * 22 + v * 3.0 + 0.6 * math.sin(v * 5)) * (0.004 + 0.012 * v) + math.sin(u * 9 - v * 2) * 0.005 * v
    return p + Vector((0, fold + 0.02 * math.sin(math.pi * u) * (1 - v) ** 2, 0))
apron = thicken(grid_surface("Apron", 120, 60, apron_fn), 0.01)
roll = grid_surface("SwagRoll", 140, 20, lambda u, v: swag_top(u) + Vector((0, math.cos(2 * math.pi * v), math.sin(2 * math.pi * v))) * (0.016 + 0.004 * math.sin(u * 30)), wrap=False)
roll = thicken(roll, 0.003)
# the mantle's fall over her left forearm beside the Child (it hangs from the arm in folds)
def armfall_fn(u, v):
    a = MARY["elbL"][1] + Vector((0.025, 0.0, 0.01)); b = MARY["wriL"][1] + Vector((0.02, 0.01, -0.005))
    top = a.lerp(b, u)
    p = top + Vector((0.02 + 0.02 * v, -0.01 * v, -0.2 * v))
    return p + Vector((math.sin(u * 14 + v * 2) * (0.004 + 0.012 * v), math.cos(u * 14) * 0.006 * v, 0))
armfall = thicken(grid_surface("ArmFall", 60, 40, armfall_fn), 0.009)
print(f"drapery sculpted {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ unite, weather, export
parts = [body, head, hair, neck, child, chead, chair, robe, gird, slL, slR, mant, apron, roll, armfall]
for o in scn.objects:
    if o.type == "MESH" and o not in parts: o.hide_set(True)
for o in parts:
    o.modifiers.clear() if hasattr(o.modifiers, "clear") else None
for x in scn.objects: x.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = body
bpy.ops.object.join(); tick("joined")
statue = body; statue.name = "Statue"
statue.data.remesh_voxel_size = 0.003
statue.data.use_remesh_fix_poles = True
activate(statue)
bpy.ops.object.voxel_remesh()
print(f"remeshed: {len(statue.data.polygons)} faces {time.time() - T0:.1f}s")
# weathering: soften, then a fine erosion (1 mm) and pitted spots
sm = statue.modifiers.new("smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 2; sm.smooth_type = "LENGTH_WEIGHTED"; sm.use_only_smooth = True
apply_all(statue)
rnd = random.Random(7)
me = statue.data; me.calc_loop_triangles() if hasattr(me, "calc_loop_triangles") else None
for v in me.vertices:
    p = v.co
    e = noise.noise(p * 90) * 0.0007 + noise.noise(p * 260) * 0.00035 - max(0.0, noise.noise(p * 40 + Vector((3, 1, 2))) - 0.45) * 0.004
    v.co = p + v.normal * e
me.update()
# keep only what stands on the plinth (the robe's hem never goes below 0)
# the design frame is mirrored for the wall: the figure faces +y with z up, so a right-handed frame puts HER left at -x;
# the design above put the Child at +x: mirror x (and reverse the winding) so that x = the viewer's LEFT... and the
# placement (stalle.py) uses x = -U (the viewer's left), y = out of the wall, z up: right-handed, nothing inside-out
verts = [(round(-v.co.x, 5), round(v.co.y, 5), round(max(v.co.z, 0.0), 5)) for v in me.vertices]
tris = []
me.calc_loop_triangles()
for t in me.loop_triangles: tris.append([t.vertices[0], t.vertices[2], t.vertices[1]])
z1 = max(v[2] for v in verts)
json.dump({"verts": verts, "faces": tris, "height": z1, "note": "tools/blender/stalle_statue.py (raw, before meshopt)"}, open(os.path.join(OUT, "statue_raw.json"), "w"))
print(f"statue: {len(verts)} verts, {len(tris)} tris, height {z1:.3f} m -> statue_raw.json ({time.time() - T0:.1f}s)")

if PREV:
    # a quick look against photo c03: front 3/4, the sun from the upper left, stone-white
    mat = bpy.data.materials.new("stone"); mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.62, 0.6, 0.55, 1); b.inputs["Roughness"].default_value = 0.85
    statue.data.materials.append(mat)
    for p in statue.data.polygons: p.use_smooth = True
    statue.scale = (-1, 1, 1)                     # as placed on the wall: the Child on the viewer's right
    scn.render.engine = "CYCLES"; scn.cycles.samples = 48; scn.cycles.use_denoising = True
    scn.world = bpy.data.worlds.new("w"); scn.world.use_nodes = True
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.35, 0.4, 0.5, 1); scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.6
    sun = link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))); sun.data.energy = 4.0; sun.rotation_euler = (math.radians(45), math.radians(-25), math.radians(-30))
    cam = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))); scn.camera = cam; cam.data.lens = 85
    os.makedirs(PREV, exist_ok=True)
    for nm, pos in (("front", (0.05, 2.6, 0.62)), ("threequarter", (1.0, 2.3, 0.4)), ("face", (0.22, 0.75, 0.93))):
        cam.location = pos; tgt = Vector((0.02, 0.05, 0.6 if nm != "face" else 0.93))
        cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        scn.render.resolution_x, scn.render.resolution_y = (700, 1000) if nm != "face" else (700, 700)
        scn.render.filepath = os.path.join(PREV, f"statue_{nm}.png"); bpy.ops.render.render(write_still=True)
print(f"done {time.time() - T0:.1f}s")
