"""THE VILLA'S SEATING v3 (claude/villa3 job 2, docs/VILLA_V3_PLAN.md item 2): the owner's "better sofa".

Round 2's channel sofa was a radiator of 20-28 identical tubes on a soft slab, one plastic off-white, no seams, floating
on two black bars. This one is a low modular sofa built like a real one, in code:

  - a recessed black plinth (a 6 cm shadow gap), an upholstered deck, arms and a back frame (rounded soft boxes);
  - the SEAT CUSHIONS are Blender CLOTH SIMULATIONS with internal PRESSURE (headless, scripted): each a rounded box
    with a welted seam round its middle, a little shrunk, inflated and settled onto the deck between the arms, so
    it bulges, sags in the middle under its own weight and wrinkles at the corners like a filled cover;
  - the back cushions: loose, thick pinched-corner cushions (villa_bed.pillow) leaning on the back frame; scatter
    cushions in two sizes and fabrics;
  - every fabric in the `props` slot (the fabric scans' KTX2 array, a tint + a layer per code: viewer/villa/
    villaInterior.js PROPS), the plinth metal_black; the light is the cell's Cycles bake per corner.

    sofa_v3(w, seats, seed)  /  armchair_v3(seed)   -> [(bmesh in the KIT frame: x across, y up, z = the front), slot, code]
Budget: ~7-9k triangles a long sofa, ~2.5k an armchair; no new draw."""
import bpy, bmesh, math, random
from mathutils import Vector, Matrix
import interior_kit as K
import villa_bed as VB

# props codes (viewer/villa/villaInterior.js PROPS)
SOFA, SOFA_CUSH, SCATTER_A, SCATTER_B, CHAIR = 13, 5, 10, 9, 12

def _pressure(o, pressure=4.0, shrink=0.04, frames=40, gravity=1.0):
    md = o.modifiers.new("cloth", "CLOTH"); s = md.settings
    s.quality = 8; s.mass = 0.6; s.tension_stiffness = 15; s.compression_stiffness = 15; s.shear_stiffness = 8; s.bending_stiffness = 2.0
    s.air_damping = 3.0; s.use_pressure = True; s.uniform_pressure_force = pressure; s.shrink_min = shrink
    cs = md.collision_settings; cs.collision_quality = 4; cs.distance_min = 0.004; cs.use_self_collision = False
    md.point_cache.frame_start = 1; md.point_cache.frame_end = frames
    s.effector_weights.gravity = gravity
    return md

def _cushion_core(sx, sy, sz, seed):
    """a rounded box with its welt: the middle ring pushed out 5 mm (the seam the cover is sewn on)"""
    bm = K.soft(sx, sy, sz, r=min(0.05, sy * 0.4), n=(8, 3, 6), puff=0.0, seed=seed)     # (768 triangles a cushion)
    ymid = sy / 2
    for v in bm.verts:
        if abs(v.co.y - ymid) < sy * 0.12:
            d = Vector((v.co.x, 0, v.co.z)); L = d.length
            if L > 1e-6: v.co += d / L * 0.005
    return bm

def _sim_cushions(cores, colliders, frames=40, gravity=1.0):
    """cores: [(bmesh kit frame, pressure)] -> the settled bmeshes (kit frame)"""
    objs = []
    made = []
    for (bm_src, nm) in colliders:
        b2 = bm_src.copy(); VB._kit_to_blender(b2); made.append(VB._collider(VB._obj(nm, b2), friction=20.0))
    for k, (bm_src, pr) in enumerate(cores):
        b2 = bm_src.copy(); VB._kit_to_blender(b2)
        o = VB._obj(f"cush{k}", b2); _pressure(o, pressure=pr, frames=frames, gravity=gravity); objs.append(o)
    bpy.context.scene.frame_set(1)
    VB._simulate(frames)
    out = []
    dg = bpy.context.evaluated_depsgraph_get()
    for o in objs:
        me = bpy.data.meshes.new_from_object(o.evaluated_get(dg))
        bm = bmesh.new(); bm.from_mesh(me); bpy.data.meshes.remove(me)
        bmesh.ops.transform(bm, matrix=VB.R_KIT_INV, verts=bm.verts)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
        out.append(VB._outward(bm))
    for o in objs + made:
        me = o.data; bpy.data.objects.remove(o)
        if me and me.users == 0: bpy.data.meshes.remove(me)
    return out

def sofa_v3(w=3.0, seats=3, seed=0, depth=1.0, throw=False):
    rnd = random.Random(seed)
    parts = []
    arm = 0.2
    parts.append((K.box(w - 0.14, 0.06, depth - 0.14, bevel=0.004, seg=1, oy=0.0), "metal_black", 0))
    # (the deck BETWEEN the arms, 2 mm clear of them, 1 mm over the plinth: no shared plane (mesh audit coplanar / crossing))
    deck = K.soft(w - 2 * arm - 0.004, 0.2, depth, r=0.03, n=(8, 2, 4), oy=0.061)
    parts.append((deck, "props", SOFA))
    arms = []
    for sx in (-1, 1):
        a = K.xform(K.soft(arm, 0.42, depth, r=0.07, n=(3, 5, 6), seed=seed + sx, oy=0.06), K.T(sx * (w / 2 - arm / 2)))
        parts.append((a, "props", SOFA)); arms.append(a)
    inner = w - 2 * arm
    back = K.xform(K.soft(inner - 0.006, 0.36, 0.2, r=0.05, n=(8, 3, 2), oy=0.263), K.T(0, 0, -depth / 2 + 0.1))
    parts.append((back, "props", SOFA))
    # the seat cushions: settled cloth (pressure), 1 cm apart, on the deck (top 0.26)
    cw = inner / seats - 0.012
    cores = []
    for i in range(seats):
        x = -inner / 2 + inner / seats * (i + 0.5)
        c = _cushion_core(cw, 0.17, depth - 0.24, seed * 10 + i)
        bmesh.ops.transform(c, matrix=Matrix.Translation((x, 0.27, 0.1)), verts=c.verts)
        cores.append((c, 3.0 + rnd.uniform(-0.6, 0.6)))
    seat = _sim_cushions(cores, [(deck, "c_deck"), (arms[0], "c_armL"), (arms[1], "c_armR"), (back, "c_back")])
    for bm in seat: parts.append((bm, "props", SOFA_CUSH))
    # the back cushions: the same filled covers (pressure, no gravity: they stay leaning), 0.2 m thick, tipped back
    # ~14 degrees against the back frame, resting on the settled seat cushions
    bcores = []
    for i in range(seats):
        x = -inner / 2 + inner / seats * (i + 0.5)
        c = _cushion_core(cw - 0.02, 0.2, 0.5, seed * 13 + i)          # (lying: y = its thickness, z = its height)
        bmesh.ops.transform(c, matrix=Matrix.Translation((x + rnd.uniform(-0.01, 0.01), 0.7, -depth / 2 + 0.33)) @ Matrix.Rotation(math.radians(90 - 14 + rnd.uniform(-2, 2)), 4, "X") @ Matrix.Translation((0, -0.1, 0)), verts=c.verts)
        bcores.append((c, 2.5))
    for bm in _sim_cushions(bcores, [(back, "c_back"), (arms[0], "c_aL"), (arms[1], "c_aR")] + [(s_, f"c_s{k}") for k, s_ in enumerate(seat)], frames=25, gravity=0.0):
        parts.append((bm, "props", SOFA_CUSH))
    # scatter cushions at the ends (two fabrics, two sizes), leaning in the corners
    for sx in (-1, 1):
        p = VB.pillow(0.5, 0.15, 0.5, n=8, seed=seed * 3 + sx, slump=0.01)
        VB._xf(p, Matrix.Translation((sx * (inner / 2 - 0.28), 0.67, -depth / 2 + 0.67)) @ Matrix.Rotation(math.radians(sx * 8), 4, "Y")
               @ Matrix.Rotation(math.radians(90 - 26), 4, "X") @ Matrix.Translation((0, -0.075, 0)))
        parts.append((p, "props", SCATTER_A if sx < 0 else SCATTER_B))
    return parts

_CHAIR = {}
def armchair_v3(seed=0):
    """(simulated once per seed: the placements share copies)"""
    if seed not in _CHAIR: _CHAIR[seed] = _armchair(seed)
    return [(bm.copy(), s, c) for (bm, s, c) in _CHAIR[seed]]

def _armchair(seed=0):
    """a low lounge armchair: plinth, deck, arms, back, one settled seat cushion, a loose back cushion (kit frame)"""
    w, depth, arm = 0.86, 0.88, 0.14
    parts = [(K.box(w - 0.12, 0.06, depth - 0.12, bevel=0.004, seg=1, oy=0.0), "metal_black", 0)]
    deck = K.soft(w - 2 * arm - 0.004, 0.2, depth, r=0.03, n=(5, 2, 5), oy=0.061); parts.append((deck, "props", CHAIR))
    arms = []
    for sx in (-1, 1):
        a = K.xform(K.soft(arm, 0.36, depth, r=0.06, n=(3, 4, 5), seed=seed + sx, oy=0.06), K.T(sx * (w / 2 - arm / 2)))
        parts.append((a, "props", CHAIR)); arms.append(a)
    back = K.xform(K.soft(w - 2 * arm - 0.006, 0.42, 0.16, r=0.05, n=(5, 4, 2), oy=0.263), K.T(0, 0, -depth / 2 + 0.08)); parts.append((back, "props", CHAIR))
    c = _cushion_core(w - 2 * arm - 0.012, 0.15, depth - 0.2, seed)
    bmesh.ops.transform(c, matrix=Matrix.Translation((0, 0.27, 0.08)), verts=c.verts)
    seat = _sim_cushions([(c, 3.0)], [(deck, "c_deck"), (arms[0], "c_aL"), (arms[1], "c_aR"), (back, "c_b")])
    parts.append((seat[0], "props", CHAIR))
    b = _cushion_core(w - 2 * arm - 0.04, 0.17, 0.44, seed + 5)
    bmesh.ops.transform(b, matrix=Matrix.Translation((0, 0.66, -depth / 2 + 0.28)) @ Matrix.Rotation(math.radians(90 - 14), 4, "X") @ Matrix.Translation((0, -0.085, 0)), verts=b.verts)
    for bm in _sim_cushions([(b, 2.5)], [(back, "c_b2"), (seat[0], "c_s")], frames=25, gravity=0.0): parts.append((bm, "props", CHAIR))
    return parts
