"""THE BRONZE GROUP on the war memorial of the Square des Heros (Leandre Grandmoulin, 1925; cast by Verbeyst; gilded):
a WINGED VICTORY (an angel, or the Fatherland) standing upright, her left arm raised high, two great wings rising behind
her, holding against her right side a NUDE DYING SOLDIER who sinks back, his head thrown back on her shoulder and his
right arm stretched out sideways; a long robe falls from her waist in deep folds to the rock they stand on, a cloth over
his loins. References (looked at, nothing traced): heritage.uccle.be "Monument aux Morts" (IMG_0059: the group from the
front, below; DSC_4594, IMG_0040), Commons "Square Heros Bxl 01" (the group seen from the 12 steps, gilded, 2010s) and
"Uccle-Ukkel - Heros-Helden x De Fre ..." (2025-11-05, autumn): see docs/landmarks/HEROS.md.

Everything is scripted (no hand modelling), with the method of tools/blender/stalle_statue.py (the Virgin of Stalle):
  1. bodies: metaball capsules along POSED skeletons (one closed smooth surface each), fingers on the hands;
  2. heads sculpted by script (a dense sphere displaced by facial features), hair masses;
  3. drapery sculpted by script: the robe (tubular folds widening to the hem, trailing on the rock behind), the band
     under her breast, his loincloth; wings: feathered surfaces (scapulars, coverts, long primaries with a scalloped
     trailing edge and quill ridges), thickened;
  4. a rock: a lumpy flattened ellipsoid;
  5. united into ONE watertight surface (voxel remesh), softened, a fine casting texture, written as
     models/heros/statue_raw.json; tools/stalle_statue_pack.mjs models/heros <tris> <err> simplifies it (meshoptimizer)
     to statue_mesh.json + statue_far.json, placed on the obelisk by tools/blender/heros.py.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heros_statue.py -- models/heros [--preview docs/landmarks/heros]

Frame (written): x = the monument's FRONT (toward the viewer standing south of it, the 12 steps), y = the viewer's RIGHT,
z up; origin = the top of the obelisk's cap (the rock's foot); metres (the design below is at 1/S scale: S = SCALE).
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix, Euler, noise

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/heros")
PREV = ARGS[ARGS.index("--preview") + 1] if "--preview" in ARGS else None
SCALE = 2.45                     # the design (Victory ~1.0 tall) -> the bronze (~2.45 m: over life size, photos: about
                                 # 1.9 x the cap's 1.25 m width from the Victory's feet to her crown)
VOXEL = 0.0032                   # remesh voxel (design units): ~8 mm on the bronze
T0 = time.time()
sys.stdout.reconfigure(line_buffering=True)
def tick(what): print(f"[heros statue] {what} {time.time() - T0:.1f}s")
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene

def link(o): scn.collection.objects.link(o); return o
def activate(o):
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
def apply_all(o):
    activate(o)
    for m in list(o.modifiers): bpy.ops.object.modifier_apply(modifier=m.name)
def V(x, y, z): return Vector((x, y, z))
def sstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a))); return t * t * (3 - 2 * t)

# ------------------------------------------------------------------------------------------------ bodies (metaballs)
def meta_body(name, J, edges, res=0.004, k=1.25):
    """metaball capsules along the posed skeleton (+ a ball per joint): one closed smooth surface (stalle_statue.py)"""
    mb = bpy.data.metaballs.new(name); mb.resolution = res; mb.render_resolution = res; mb.threshold = 0.6
    o = link(bpy.data.objects.new(name + "_mb", mb))
    rad = lambda n: (J[n][1][0] + J[n][1][1]) * 0.5
    for a, b in edges:
        pa, pb = J[a][0], J[b][0]; d = pb - pa; L = d.length
        if L < 1e-4: continue
        for t in (0.2, 0.4, 0.6, 0.8):
            r = rad(a) + (rad(b) - rad(a)) * t
            e = mb.elements.new(type="CAPSULE"); e.co = pa.lerp(pb, t); e.radius = r * k; e.size_x = L / 8
            e.rotation = Vector((1, 0, 0)).rotation_difference(d.normalized())
    for n in J:
        e = mb.elements.new(type="BALL"); e.co = J[n][0]; e.radius = rad(n) * k
    bpy.context.view_layer.update()
    activate(o); bpy.ops.object.convert(target="MESH")
    m = bpy.context.view_layer.objects.active; m.name = name
    return m

def fingers(name, wrist, hand, up, spread=1.0, curl=0.25, r=0.0058):
    """four fingers + a thumb as tapered capsule chains from the hand (metaballs), `up` = the back of the hand"""
    mb = bpy.data.metaballs.new(name); mb.resolution = 0.0022; mb.threshold = 0.6
    o = link(bpy.data.objects.new(name + "_mb", mb))
    ax = (hand - wrist).normalized(); side = ax.cross(up).normalized(); upn = side.cross(ax).normalized()
    for f in range(5):
        if f < 4:
            p = hand + side * ((f - 1.5) * 0.0105 * spread) + ax * 0.004
            Ls = [0.024, 0.017, 0.013]; d = ax.copy(); rr = r * (1.0 if f in (1, 2) else 0.88)
        else:
            p = wrist.lerp(hand, 0.55) + side * 0.016; Ls = [0.018, 0.014]; d = (ax * 0.6 + side * 0.7).normalized(); rr = r * 1.05
        for j, L in enumerate(Ls):
            d = (d - upn * curl * (j + 1) * 0.5).normalized()
            q = p + d * L
            e = mb.elements.new(type="CAPSULE"); e.co = p.lerp(q, 0.5); e.radius = rr * (0.9 ** j); e.size_x = L / 2
            e.rotation = Vector((1, 0, 0)).rotation_difference(d)
            p = q
    bpy.context.view_layer.update()
    activate(o); bpy.ops.object.convert(target="MESH")
    m = bpy.context.view_layer.objects.active; m.name = name
    return m

# ------------------------------------------------------------------------------------------------ heads (stalle_statue.py)
def g3(p, c, s):
    d = Vector(((p.x - c[0]) / s[0], (p.y - c[1]) / s[1], (p.z - c[2]) / s[2]))
    return math.exp(-d.length_squared)
def sculpt_head(name, k=1.0, male=False):
    """a head 0.136 * k tall, the face toward +y (stalle's frame), origin at its centre"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=72, v_segments=54, radius=1.0)
    for v in bm.verts:
        p = v.co.copy()
        sx, sy, sz = (0.05, 0.06, 0.068) if not male else (0.053, 0.062, 0.068)
        jaw = max(0.0, -p.z) ** 1.5
        q = Vector((p.x * sx * (1 - (0.3 if not male else 0.18) * jaw), p.y * sy * (1 - 0.1 * jaw), p.z * sz))
        if p.y > 0: q.y *= 1 - 0.22 * p.y ** 2
        if p.y < -0.3: q.y *= 1.06
        q *= k; s = k; fy = q.y; ez = 0.004 * s; F = 0.0
        for e in (-1, 1):
            F -= 0.011 * s * g3(q, (e * 0.02 * s, fy, ez + 0.002 * s), (0.012 * s, 1, 0.009 * s))
            F += 0.0045 * s * g3(q, (e * 0.02 * s, fy, ez - 0.0005 * s), (0.0075 * s, 1, 0.0042 * s))
            F += (0.0045 if not male else 0.007) * s * g3(q, (e * 0.022 * s, fy, ez + 0.014 * s), (0.016 * s, 1, 0.005 * s))
            F += 0.004 * s * g3(q, (e * 0.026 * s, fy, ez - 0.02 * s), (0.014 * s, 1, 0.013 * s))
        nz = ez - 0.006 * s
        F += 0.017 * s * g3(q, (0.0, fy, nz - 0.012 * s), (0.0045 * s, 1, 0.014 * s))
        F += 0.005 * s * g3(q, (0.0, fy, nz - 0.025 * s), (0.0085 * s, 1, 0.0055 * s))
        mz = nz - 0.041 * s
        F += 0.003 * s * g3(q, (0.0, fy, mz + 0.0035 * s), (0.011 * s, 1, 0.003 * s))
        F -= 0.0035 * s * g3(q, (0.0, fy, mz), (0.011 * s, 1, 0.0016 * s)) * (0.4 if male else 1.0)   # his mouth half open
        F -= (0.004 if male else 0.0) * s * g3(q, (0.0, fy, mz - 0.002 * s), (0.008 * s, 1, 0.003 * s))
        F += 0.0027 * s * g3(q, (0.0, fy, mz - 0.004 * s), (0.009 * s, 1, 0.0028 * s))
        F += (0.0065 if not male else 0.009) * s * g3(q, (0.0, fy, mz - 0.021 * s), (0.011 * s, 1, 0.008 * s))
        face = max(0.0, min(1.0, (p.y - 0.15) * 3.0))
        v.co = q + q.normalized() * F * face
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def hair_mass(name, k=1.0, male=False):
    """her hair waved back from the brow into a knot at the nape; his short and curly"""
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=64, v_segments=48, radius=1.0)
    for v in bm.verts:
        p = v.co.copy()
        q = Vector((p.x * 0.051, p.y * 0.061, p.z * 0.069)) * k
        face = max(0.0, min(1.0, (p.y + 0.05) * 4.0)) * max(0.0, min(1.0, (0.72 - p.z) * 5.0))
        if male:
            r = (0.003 + (noise.noise(p * 6.0) * 0.5 + 0.5) * 0.006) * k
        else:
            wave = 0.0025 * math.sin(p.z * 16 + abs(p.x) * 22) + 0.0018 * math.sin(math.atan2(p.z, abs(p.x) + 0.05) * 26)
            knot = 0.026 * math.exp(-((p.y + 0.85) ** 2 + (p.z + 0.05) ** 2 + p.x ** 2 * 0.6) / 0.07)
            r = (0.006 + wave) * k + knot * k
        v.co = q * (1.0 - 0.3 * face) + q.normalized() * r * (1 - face)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    return link(bpy.data.objects.new(name, me))

def place(o, loc, rot=(0, 0, 0)):
    o.data.transform(Euler(rot, "XYZ").to_matrix().to_4x4()); o.data.transform(Matrix.Translation(loc)); o.data.update()

def grid_surface(name, nu, nv, fn, wrap=False):
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
    s = o.modifiers.new("solid", "SOLIDIFY"); s.thickness = th; s.offset = -1.0; s.use_rim = True; s.use_even_offset = False
    apply_all(o); return o

def tube(name, pts, radii, segs=24, nv=None):
    """a closed tube along a polyline (radius per point), capped by its own taper"""
    nv = nv or len(pts) * 6
    def at(t):
        f = t * (len(pts) - 1); i = min(int(f), len(pts) - 2); a = f - i
        return pts[i].lerp(pts[i + 1], a), radii[i] + (radii[i + 1] - radii[i]) * a, (pts[i + 1] - pts[i]).normalized()
    def fn(u, v):
        p, r, T = at(v)
        X = T.cross(Vector((0, 0, 1))); X = X.normalized() if X.length > 1e-3 else Vector((1, 0, 0)); Y = T.cross(X)
        r *= math.sin(math.pi * min(1.0, 0.08 + v * 0.92)) ** 0.15 if v < 0.06 or v > 0.94 else 1.0
        th = 2 * math.pi * u
        return p + (X * math.cos(th) + Y * math.sin(th)) * r
    return grid_surface(name, segs, nv, fn, wrap=True)

# ------------------------------------------------------------------------------------------------ THE VICTORY
# design frame: x = front, y = the viewer's right, z up; feet on the rock top (z ~0.1). She faces the front, a little
# turned toward the soldier (the viewer's left, -y); weight on her right leg, her left knee forward under the robe.
VIC = {
    "pelvis": (V(-0.01, 0.04, 0.60), (0.088, 0.07)),
    "waist":  (V(-0.005, 0.04, 0.70), (0.068, 0.054)),
    "chest":  (V(0.0, 0.035, 0.81), (0.082, 0.06)),
    "bust":   (V(0.025, 0.035, 0.84), (0.07, 0.05)),
    "neck":   (V(0.006, 0.03, 0.935), (0.026, 0.026)),
    "hipL":   (V(-0.005, 0.095, 0.575), (0.06, 0.06)),  "kneeL": (V(0.045, 0.1, 0.34), (0.046, 0.046)),
    "ankL":   (V(0.01, 0.1, 0.13), (0.03, 0.03)),       "toeL":  (V(0.085, 0.105, 0.105), (0.024, 0.02)),
    "hipR":   (V(-0.01, -0.015, 0.575), (0.06, 0.06)),  "kneeR": (V(0.0, -0.025, 0.34), (0.046, 0.046)),
    "ankR":   (V(-0.015, -0.03, 0.13), (0.03, 0.03)),   "toeR":  (V(0.065, -0.035, 0.105), (0.024, 0.02)),
    # her LEFT arm (the viewer's right, +y) raised high, the hand open, palm forward
    "shL":    (V(-0.005, 0.12, 0.885), (0.04, 0.038)),  "elbL":  (V(-0.02, 0.17, 1.06), (0.03, 0.03)),
    "wriL":   (V(-0.015, 0.185, 1.215), (0.021, 0.019)),"handL": (V(-0.012, 0.188, 1.262), (0.02, 0.012)),
    # her RIGHT arm round the soldier's back, the hand on his far side (his chest)
    "shR":    (V(0.0, -0.05, 0.885), (0.04, 0.038)),    "elbR":  (V(-0.005, -0.16, 0.75), (0.03, 0.03)),
    "wriR":   (V(0.07, -0.215, 0.675), (0.021, 0.019)), "handR": (V(0.11, -0.225, 0.665), (0.02, 0.012)),
}
VIC_EDGES = [("pelvis", "waist"), ("waist", "chest"), ("chest", "bust"), ("chest", "neck"), ("pelvis", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"), ("ankL", "toeL"),
             ("pelvis", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"), ("ankR", "toeR"), ("chest", "shL"), ("shL", "elbL"), ("elbL", "wriL"), ("wriL", "handL"),
             ("chest", "shR"), ("shR", "elbR"), ("elbR", "wriR"), ("wriR", "handR")]
vic = meta_body("Victory", VIC, VIC_EDGES)
tick("Victory body")
fL = fingers("VicFingersL", VIC["wriL"][0], VIC["handL"][0], V(-1, 0, 0), spread=1.0, curl=0.1)
fR = fingers("VicFingersR", VIC["wriR"][0], VIC["handR"][0], V(0, 1, 0.3), spread=0.9, curl=0.45)
vhp = VIC["neck"][0] + V(0.006, -0.004, 0.062)
VIC_ROT = (math.radians(-14), math.radians(-6), math.radians(-90 - 22))  # face +x (x < 0 bows: stalle frame), turned toward him
vhead = sculpt_head("VicHead", k=0.9); place(vhead, vhp, VIC_ROT)
vhair = hair_mass("VicHair", k=0.9); place(vhair, vhp, VIC_ROT)

# her robe: from the band under the breast to the rock; deep folds, the left knee pressing through, a train behind
ROBE = [  # z, rx (front-back), ry (side), cx, cy
    (0.80, 0.064, 0.086, 0.01, 0.035), (0.74, 0.07, 0.084, 0.0, 0.037), (0.66, 0.074, 0.094, -0.005, 0.04), (0.58, 0.085, 0.118, -0.008, 0.04),
    (0.45, 0.092, 0.122, 0.0, 0.04), (0.3, 0.1, 0.128, -0.005, 0.035), (0.18, 0.118, 0.14, -0.02, 0.035), (0.1, 0.15, 0.16, -0.04, 0.035)]
def lerp_table(T, z):
    for i in range(len(T) - 1):
        z0, a0 = T[i][0], T[i][1:]; z1, a1 = T[i + 1][0], T[i + 1][1:]
        if z0 >= z >= z1:
            t = (z0 - z) / (z0 - z1); t = t * t * (3 - 2 * t)
            return [a0[k] + (a1[k] - a0[k]) * t for k in range(len(a0))]
    return list(T[0][1:] if z > T[0][0] else T[-1][1:])
KNEE = V(0.085, 0.1, 0.34)
def robe_fn(u, v):
    z = 0.80 - 0.70 * v
    rx, ry, cx, cy = lerp_table(ROBE, z)
    th = 2 * math.pi * u                                    # 0 = front (+x), toward +y
    d = Vector((math.cos(th), math.sin(th), 0.0))
    p = Vector((cx + rx * d.x, cy + ry * d.y, z))
    nrm = Vector((d.x / rx, d.y / ry, 0)).normalized()
    fall = sstep(0.7, 0.1, z)
    ph = 0.8 * math.sin(z * 6.0) + 0.5 * math.sin(th * 2 + z * 4)
    s1 = math.sin(8 * th + ph); s2 = math.sin(13 * th + 1.6 * ph + 1.1)
    fold = (0.85 * s1 + 0.35 * s1 * abs(s1) + 0.3 * s2) * (0.004 + 0.03 * fall)
    knee = 0.04 * math.exp(-((p - KNEE).length_squared) / 0.005)
    back = max(0.0, -math.cos(th))                          # the train: the back of the robe flows out over the rock
    train = 0.05 * back ** 2 * sstep(0.35, 0.1, z)
    band = 0.006 * math.exp(-((z - 0.79) ** 2) / 0.0002)
    return p + nrm * (fold + knee + train + band)
robe = thicken(grid_surface("Robe", 200, 120, robe_fn, wrap=True), 0.012); tick("robe")
# a fold of cloth thrown over her left shoulder and falling down her back (the photos: a dark mass behind the shoulder)
def scarf_fn(u, v):
    a = V(-0.01, 0.11, 0.9); b = V(-0.08, 0.08, 0.62)
    p = a.lerp(b, v) + V(-0.02 * math.sin(math.pi * v), 0, 0)
    w = (u - 0.5) * (0.07 + 0.06 * v)
    return p + V(0, w, 0) + V(math.sin(u * 12 + v * 3) * 0.006 * (0.3 + v), 0, 0)
scarf = thicken(grid_surface("Scarf", 30, 40, scarf_fn), 0.008)

# ------------------------------------------------------------------------------------------------ THE SOLDIER
# nude, dying: sinking back against her right side, his body a diagonal from his head on her shoulder (the viewer's
# left) down to his feet near hers; his right arm stretched out sideways to the viewer's left, palm up; his left arm
# hanging behind, along her robe; his head thrown back
SOL = {
    "pelvis": (V(0.15, -0.095, 0.47), (0.08, 0.066)),
    "waist":  (V(0.13, -0.12, 0.575), (0.068, 0.055)),
    "chest":  (V(0.095, -0.155, 0.695), (0.09, 0.066)),
    "neck":   (V(0.055, -0.19, 0.795), (0.03, 0.03)),
    "hipL":   (V(0.16, -0.045, 0.45), (0.06, 0.06)),    "kneeL": (V(0.255, -0.02, 0.3), (0.045, 0.045)),
    "ankL":   (V(0.17, 0.0, 0.13), (0.031, 0.03)),      "toeL":  (V(0.24, 0.005, 0.105), (0.024, 0.02)),
    "hipR":   (V(0.15, -0.145, 0.45), (0.06, 0.06)),    "kneeR": (V(0.265, -0.13, 0.29), (0.045, 0.045)),
    "ankR":   (V(0.2, -0.1, 0.13), (0.031, 0.03)),      "toeR":  (V(0.27, -0.11, 0.105), (0.024, 0.02)),
    "shR":    (V(0.075, -0.235, 0.755), (0.042, 0.04)), "elbR":  (V(0.105, -0.37, 0.785), (0.032, 0.031)),
    "wriR":   (V(0.13, -0.5, 0.805), (0.022, 0.02)),    "handR": (V(0.14, -0.545, 0.812), (0.022, 0.012)),
    "shL":    (V(0.06, -0.085, 0.745), (0.042, 0.04)),  "elbL":  (V(0.09, -0.04, 0.6), (0.032, 0.031)),
    "wriL":   (V(0.15, -0.025, 0.49), (0.022, 0.02)),   "handL": (V(0.175, -0.03, 0.45), (0.022, 0.012)),
}
SOL_EDGES = [("pelvis", "waist"), ("waist", "chest"), ("chest", "neck"), ("pelvis", "hipL"), ("hipL", "kneeL"), ("kneeL", "ankL"), ("ankL", "toeL"),
             ("pelvis", "hipR"), ("hipR", "kneeR"), ("kneeR", "ankR"), ("ankR", "toeR"), ("chest", "shR"), ("shR", "elbR"), ("elbR", "wriR"), ("wriR", "handR"),
             ("chest", "shL"), ("shL", "elbL"), ("elbL", "wriL"), ("wriL", "handL")]
sol = meta_body("Soldier", SOL, SOL_EDGES)
sfR = fingers("SolFingersR", SOL["wriR"][0], SOL["handR"][0], V(0, 0, -1), spread=1.0, curl=0.35)
sfL = fingers("SolFingersL", SOL["wriL"][0], SOL["handL"][0], V(-1, 0, 0), spread=0.9, curl=0.5)
tick("Soldier body")
shp = SOL["neck"][0] + V(-0.022, -0.026, 0.045)
SOL_ROT = (math.radians(42), math.radians(-20), math.radians(-90 + 25))  # thrown back and rolled toward her shoulder
shead = sculpt_head("SolHead", k=0.95, male=True); place(shead, shp, SOL_ROT)
shair = hair_mass("SolHair", k=0.95, male=True); place(shair, shp, SOL_ROT)
# the loincloth: a band round his hips with a fall at the front and a corner drawn up to her hand
def loin_fn(u, v):
    th = 2 * math.pi * u
    c = SOL["pelvis"][0] + V(0, 0, -0.01)
    rx, ry = 0.086, 0.072
    z = c.z + 0.04 + 0.025 * math.sin(th) - 0.12 * v * (0.35 + 0.65 * max(0.0, math.cos(th)) ** 2)
    p = Vector((c.x + rx * math.cos(th), c.y + ry * math.sin(th), z))
    n = Vector((math.cos(th) / rx, math.sin(th) / ry, 0)).normalized()
    return p + n * (0.008 + 0.01 * v + math.sin(th * 9 + v * 3) * 0.006 * v + 0.012 * max(0.0, math.cos(th)) * v)
loin = thicken(grid_surface("Loin", 96, 24, loin_fn, wrap=True), 0.008)

# ------------------------------------------------------------------------------------------------ THE WINGS
# Her left wing (the viewer's right) rises almost vertical beside the raised arm, higher than her hand; the right wing
# spreads lower behind the soldier's head toward the viewer's left. Each: a leading edge from the shoulder blade (wrist
# joint bent), a broad membrane of coverts, long primaries fanning to a scalloped trailing edge; quill ridges.
def wing(name, root, elbow, tip, back, span_n=60, chord_n=36, primaries=11):
    """root / elbow / tip: the leading edge (a bent polyline); back: the trailing direction (unit, roughly -x)"""
    lead = lambda t: (root.lerp(elbow, t / 0.42) if t < 0.42 else elbow.lerp(tip, (t - 0.42) / 0.58))
    def chord(t):                                            # trailing-edge depth along the span
        return 0.12 + 0.11 * math.sin(math.pi * min(1.0, t * 1.1)) - 0.05 * t
    def fn(u, v):
        t = u; L = lead(t)
        # the trailing edge: long primaries toward the tip, scalloped between feather tips
        ph = t * primaries
        scal = 0.5 + 0.5 * math.cos(2 * math.pi * ph)
        depth = chord(t) * (0.93 + 0.07 * math.sqrt(scal)) * (1 if t < 0.95 else max(0.15, (1 - t) * 20))
        d = back.copy()
        # the feathers sweep toward the tip near the end
        span = (lead(min(1.0, t + 0.01)) - lead(max(0.0, t - 0.01))).normalized()
        d = (d * (1 - 0.55 * t) + span * 0.55 * t).normalized()
        P = L + d * depth * v
        # camber + quill ridges (a groove every feather) + covert rows
        nrm = span.cross(d).normalized()
        P += nrm * (0.028 * math.sin(math.pi * v) * (1 - 0.5 * t) + 0.0028 * math.sin(2 * math.pi * ph) * v + 0.0018 * math.sin(v * 22) * (1 - v))
        return P
    return thicken(grid_surface(name, span_n, chord_n, fn), 0.011)
wingL = wing("WingL", V(-0.07, 0.07, 0.86), V(-0.1, 0.19, 1.07), V(-0.07, 0.29, 1.47), V(-0.55, 0.45, -0.7).normalized(), primaries=12)
wingR = wing("WingR", V(-0.07, 0.0, 0.86), V(-0.1, -0.13, 0.98), V(-0.12, -0.42, 1.12), V(-0.5, -0.15, -0.85).normalized(), primaries=10)
tick("wings")

# ------------------------------------------------------------------------------------------------ THE ROCK
bmr = bmesh.new(); bmesh.ops.create_icosphere(bmr, subdivisions=5, radius=1.0)
for v in bmr.verts:
    p = v.co.copy()
    q = Vector((p.x * 0.2, p.y * 0.24, p.z * 0.09))
    q += q.normalized() * (noise.noise(p * 2.2) * 0.03 + noise.noise(p * 6.0) * 0.012)
    v.co = q + Vector((-0.015, -0.03, 0.0))
rock = link(bpy.data.objects.new("Rock", bpy.data.meshes.new("Rock"))); bmr.to_mesh(rock.data); bmr.free()

# ------------------------------------------------------------------------------------------------ unite, finish, export
parts = [vic, fL, fR, vhead, vhair, robe, scarf, sol, sfR, sfL, shead, shair, loin, wingL, wingR, rock]
for x in scn.objects: x.select_set(False)
for o in parts: o.select_set(True)
bpy.context.view_layer.objects.active = vic
bpy.ops.object.join(); tick("joined")
statue = vic; statue.name = "Group"
statue.data.remesh_voxel_size = VOXEL
statue.data.use_remesh_fix_poles = True
activate(statue)
bpy.ops.object.voxel_remesh()
tick(f"remeshed: {len(statue.data.polygons)} faces")
sm = statue.modifiers.new("smooth", "CORRECTIVE_SMOOTH"); sm.iterations = 2; sm.smooth_type = "LENGTH_WEIGHTED"; sm.use_only_smooth = True
apply_all(statue)
me = statue.data
NRM = [v.normal.copy() for v in me.vertices]
CO = [v.co.copy() for v in me.vertices]
for v, p, n in zip(me.vertices, CO, NRM):           # a cast surface: a faint chasing texture (0.4 mm design = 1 mm bronze)
    v.co = p + n * (noise.noise(p * 140) * 0.0004)
me.update()
# design -> bronze: scale, the rock's lowest point on z = 0 (the cap); a little of the rock sinks into the cap
zmin = min(v.co.z for v in me.vertices)
verts = [(round(v.co.x * SCALE, 5), round(v.co.y * SCALE, 5), round((v.co.z - zmin) * SCALE - 0.04, 5)) for v in me.vertices]
me.calc_loop_triangles()
tris = [[t.vertices[0], t.vertices[1], t.vertices[2]] for t in me.loop_triangles]
z1 = max(v[2] for v in verts)
os.makedirs(OUT, exist_ok=True)
json.dump({"verts": verts, "faces": tris, "height": z1, "frame": "x = the monument's front, y = the viewer's right, z up; origin = the cap's top centre",
           "note": "tools/blender/heros_statue.py (raw, before meshopt)"}, open(os.path.join(OUT, "statue_raw.json"), "w"))
print(f"statue: {len(verts)} verts, {len(tris)} tris, height {z1:.3f} m -> statue_raw.json ({time.time() - T0:.1f}s)")

if PREV:
    mat = bpy.data.materials.new("bronze"); mat.use_nodes = True
    b = mat.node_tree.nodes["Principled BSDF"]; b.inputs["Base Color"].default_value = (0.55, 0.4, 0.16, 1)
    b.inputs["Metallic"].default_value = 0.9; b.inputs["Roughness"].default_value = 0.42
    statue.data.materials.append(mat)
    for p in statue.data.polygons: p.use_smooth = True
    statue.scale = (SCALE, SCALE, SCALE); statue.location = (0, 0, -zmin * SCALE)
    scn.render.engine = "CYCLES"; scn.cycles.samples = 40; scn.cycles.use_denoising = True
    scn.world = bpy.data.worlds.new("w"); scn.world.use_nodes = True
    scn.world.node_tree.nodes["Background"].inputs[0].default_value = (0.3, 0.45, 0.75, 1); scn.world.node_tree.nodes["Background"].inputs[1].default_value = 0.8
    sun = link(bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN"))); sun.data.energy = 4.0; sun.rotation_euler = (math.radians(40), math.radians(20), math.radians(60))
    cam = link(bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))); scn.camera = cam
    os.makedirs(PREV, exist_ok=True)
    for nm, pos, lens in (("front_below", (6.5, 0.3, -3.6), 50), ("front", (8.0, -0.4, 1.6), 50), ("side", (1.0, -8.0, 1.6), 50), ("back", (-8.0, 1.0, 2.0), 50)):
        cam.location = pos; tgt = Vector((0.1, -0.1, 1.75)); cam.data.lens = lens
        cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        scn.render.resolution_x, scn.render.resolution_y = 700, 900
        scn.render.filepath = os.path.join(PREV, f"statue_{nm}.png"); bpy.ops.render.render(write_still=True)
print(f"done {time.time() - T0:.1f}s")
