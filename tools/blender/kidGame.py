"""THE MPFB KID, GAME BUILD (docs/KIDCHAR.md phase 2). Run by kidMakeHuman.py --game (exec'd there: its globals,
basemesh / rig / parts / C / H, are in scope). After the human is built:
  1. the 90s outfit made from the body (garment = the body's own faces of a region, offset out, solidified, the body's
     weights): a colour-block windbreaker (open zip, stand collar, cuffs), high white socks with two stripes, a cap
     (6-panel dome + a forward AND a backward brim: the viewer shows one, a slot toggle); the skin under them hidden by a
     delete group (no poke-through, fewer tris); the hair under the cap removed; the sneakers' own sock cut at the collar;
  2. the export copy (MPFB: shape keys + masks baked) TURNED INTO THE UAL T-POSE: every bone rotated so it points along
     the UAL bone (models/kid/ual_rest.json, from kid.glb) with the same twist (palm / foot / hip axes), the meshes
     baked in that pose, the pose applied as the rest; bones renamed to the UAL names (head -> Head, Root -> root). The
     UAL clips' local rotations then mean the same on him (tools/characters/kidABuild.mjs puts the UAL joints at his
     joints, like ualBuild.mjs --kid);
  3. ONE texture atlas (2048 x 1280: skin, hair, eyes, brows, lashes, tee, shorts, sneakers + a palette of flat colours
     for the scripted garments), every part's UVs moved into its cell, ONE mesh per LOD with a material per SLOT (the
     viewer: one draw, roughness / toggles per slot);
  4. AO per vertex (Cycles, OPTIX) -> COLOR_0; LOD0 ~20k / LOD1 ~8k / LOD2 ~2k tris (collapse, symmetric, uniform: a
     vertex-group weighted decimate folded the MakeHuman body into wings, docs/KIDCHAR.md);
  5. models/characters/kidA_src.glb (rig + 3 LODs, no clips) + kidA_rig.json + kidA_atlas.png (tools/kid/kidAtlas.py
     makes the KTX2), and --renders: day + night Cycles renders of LOD0 (arms down).
"""
import bmesh
import numpy as np
from mathutils import Vector, Matrix, Quaternion

GOUT = os.path.join(ROOT, "models", "characters")
REST = json.load(open(os.path.join(ROOT, "models", "kid", "ual_rest.json")))
gl2b = lambda p: Vector((p[0], -p[2], p[1]))
G = lambda p: [round(p.x, 6), round(p.z, 6), round(-p.y, 6)]          # Blender Z-up -> glTF Y-up
CAP_MODE = arg("--cap", "fwd")            # the renders' brim (the GLB has both)

def sel_only(o):
    bpy.ops.object.mode_set(mode="OBJECT") if bpy.context.object and bpy.context.object.mode != "OBJECT" else None
    for x in bpy.context.view_layer.objects: x.select_set(False)
    o.hide_set(False); o.select_set(True); bpy.context.view_layer.objects.active = o

# ------------------------------------------------------------------------------------------------ colours + garment cells
# (sRGB) the scripted garments' colours live in small generated atlas cells: bands along a garment's own coordinate
# (height, the length of the sleeve, the angle round the body), so a colour edge falls cleanly across faces (a per-face
# colour gave saw-tooth block edges: 2026-11-25 first try)
COL = {"teal": (0.13, 0.55, 0.58), "purple": (0.40, 0.25, 0.60), "navy": (0.12, 0.15, 0.30), "white": (0.93, 0.93, 0.90),
       "zip": (0.17, 0.17, 0.19), "sock": (0.95, 0.95, 0.93), "red": (0.80, 0.16, 0.16), "cap": (0.78, 0.17, 0.15)}
def band_tex(w, h, bands, axis="v", extra=None):
    """an RGBA cell: bands = [(t0, t1, colour)] along v (rows) or u (columns); extra(u, v) -> colour or None overrides"""
    A = np.ones((h, w, 4), np.float32)
    for j in range(h):
        for i in range(w):
            u, v = (i + 0.5) / w, (j + 0.5) / h
            t = v if axis == "v" else u
            c = next((c for t0, t1, c in bands if t0 <= t < t1), bands[-1][2])
            if extra:
                e = extra(u, v)
                if e: c = e
            A[j, i, :3] = COL[c]
    return A
GEN = {}            # cell -> RGBA array (painted into the atlas by build_atlas)
GARM = {}           # the garment being UV-mapped: its deform layer (a face's bone = its vertices' dominant bones)
def dom_bone(v):
    best, bw = None, 0.0           # (bones only: 'body', 'Left', the delete groups are vertex groups too)
    for gi, w in v[GARM["dl"]].items():
        n = gidx.get(gi)
        if n in BONES and w > bw: best, bw = n, w
    return best

def full_body():
    """the basemesh with every MASK off (same vertex indices as the basemesh), shape keys evaluated, as a new mesh"""
    states = [(m, m.show_viewport) for m in basemesh.modifiers if m.type == "MASK"]
    for m, _ in states: m.show_viewport = False
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(basemesh.evaluated_get(dg), preserve_all_data_layers=True, depsgraph=dg)
    for m, s in states: m.show_viewport = s
    return me

BONES = {b.name for b in rig.data.bones}
gidx = {g.index: g.name for g in basemesh.vertex_groups}
body_g = basemesh.vertex_groups["body"].index
def vinfo(me):
    """per vertex: dominant bone, in-body (not a helper)"""
    dom, inbody = [], []
    for v in me.vertices:
        best, bw, ib = None, 0.0, False
        for e in v.groups:
            n = gidx.get(e.group)
            if e.group == body_g and e.weight > 0.5: ib = True
            if n in BONES and e.weight > bw: best, bw = n, e.weight
        dom.append(best); inbody.append(ib)
    return dom, inbody

def bone_z(n, end="head"):
    b = rig.pose.bones[n]
    return (rig.matrix_world @ (b.head if end == "head" else b.tail)).z
def bone_p(n, end="head"):
    b = rig.pose.bones[n]
    return rig.matrix_world @ (b.head if end == "head" else b.tail)

def smooth_weights(o, reps, f=0.5):
    """the bone weights of a mesh relaxed toward their neighbours' (other vertex groups untouched)"""
    bones = {g.index for g in o.vertex_groups if g.name in BONES}
    bm = bmesh.new(); bm.from_mesh(o.data); dl = bm.verts.layers.deform.active
    bm.verts.ensure_lookup_table()
    for _ in range(reps):
        cur = [{gi: w for gi, w in v[dl].items() if gi in bones} for v in bm.verts]
        for v in bm.verts:
            nb = [cur[e.other_vert(v).index] for e in v.link_edges]
            if not nb: continue
            keys = set(cur[v.index]).union(*nb)
            new = {k: (1 - f) * cur[v.index].get(k, 0.0) + f * sum(n.get(k, 0.0) for n in nb) / len(nb) for k in keys}
            tot = sum(new.values()) or 1.0
            for k in list(v[dl].keys()):
                if k in bones: del v[dl][k]
            for k, w in new.items():
                if w / tot > 1e-3: v[dl][k] = w / tot
    bm.to_mesh(o.data); bm.free()

def delete_group(inner, name):
    g = basemesh.vertex_groups.get(name) or basemesh.vertex_groups.new(name=name)
    g.add(sorted(inner), 1.0, "REPLACE")
    m = basemesh.modifiers.new(name, "MASK"); m.vertex_group = name; m.invert_vertex_group = True

def garment(name, me, region, off, cuts, uv_of, thick, smooth=2, hide_inner=True, ratio=1.0):
    """the body's faces whose vertices are all in region(i) -> a garment: each vertex offset out along its normal by
    off(i, co, normal), smoothed (boundary pinned), then CUT by planes [(geom_ok(centre, normal) or None, point,
    normal)] (bisect, the outer side cleared: clean hems / cuffs / openings, no stair-step edges), the new vertices of
    the cuts given the weights of their nearest old vertex, UVs from uv_of(face, co, source index) in ATLAS space,
    solidified inward. Returns (object, basemesh vertices fully inside the uncut region: the skin to hide)"""
    from mathutils import kdtree
    bm = bmesh.new(); bm.from_mesh(me)
    src = bm.verts.layers.int.new("src")
    for v in bm.verts: v[src] = v.index
    keep = {f for f in bm.faces if all(region(v.index) for v in f.verts)}
    inner = {v.index for f in keep for v in f.verts if all(lf in keep for lf in v.link_faces)}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts: v.co = v.co + v.normal * off(v[src], v.co, v.normal)
    for _ in range(smooth):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    bm.normal_update()
    for cut in cuts:
        ok, co, no = cut[:3]
        geom = [f for f in bm.faces if (ok is None or ok(f.calc_center_median(), f.normal))]
        gv = {v for f in geom for v in f.verts}; ge = {e for f in geom for e in f.edges}
        # (a 4th item = a strip test: split only, then delete the faces whose centre passes it: the zip's gap)
        bmesh.ops.bisect_plane(bm, geom=list(gv) + list(ge) + geom, plane_co=co, plane_no=no, clear_outer=len(cut) < 4)
        if len(cut) == 4:
            bm.normal_update()
            bmesh.ops.delete(bm, geom=[f for f in bm.faces if cut[3](f.calc_center_median(), f.normal)], context="FACES")
        bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    dl = bm.verts.layers.deform.active
    has = [v for v in bm.verts if len(v[dl]) > 0]
    kd = kdtree.KDTree(len(has))
    for k, v in enumerate(has): kd.insert(v.co, k)
    kd.balance()
    for v in bm.verts:     # (inverse-distance blend of the 4 nearest: one nearest vertex could sit across a weight edge)
        if len(v[dl]) == 0:
            acc, tot = {}, 0.0
            for co, k, d in kd.find_n(v.co, 4):
                wk = 1.0 / max(d, 1e-4); tot += wk
                for gi, w in has[k][dl].items(): acc[gi] = acc.get(gi, 0.0) + w * wk
            for gi, w in acc.items(): v[dl][gi] = w / tot
    for lay in list(bm.loops.layers.uv.values()): bm.loops.layers.uv.remove(lay)
    bm.verts.layers.int.remove(src)
    me2 = bpy.data.meshes.new(name); bm.to_mesh(me2); bm.free()
    o = bpy.data.objects.new(name, me2); bpy.context.scene.collection.objects.link(o)
    for g in basemesh.vertex_groups: o.vertex_groups.new(name=g.name)
    o.matrix_world = basemesh.matrix_world.copy()
    if ratio < 1:   # the budget BEFORE the UVs: a collapse across the colour cells' seams smeared bands (flames)
        d = o.modifiers.new("budget", "DECIMATE"); d.ratio = ratio; d.use_symmetry = True; d.symmetry_axis = "X"
        sel_only(o); bpy.ops.object.modifier_apply(modifier="budget")
    # UVs (the body's own UV layer dropped: a new layer next to it got a ".001" name and the body's UVs won)
    bm = bmesh.new(); bm.from_mesh(o.data)
    GARM["dl"] = bm.verts.layers.deform.active
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops: l[uvl].uv = uv_of(f, l.vert.co, -1)
    bm.to_mesh(o.data); bm.free()
    if thick:
        sm = o.modifiers.new("solid", "SOLIDIFY"); sm.thickness = thick; sm.offset = -1; sm.use_rim = True
        sel_only(o); bpy.ops.object.modifier_apply(modifier="solid")
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    o["uv_atlas"] = True
    return o, (inner if hide_inner else set())

def build_outfit():
    me = full_body()
    dom, inbody = vinfo(me)
    P = lambda i: basemesh.matrix_world @ me.vertices[i].co
    pel = bone_z("pelvis"); hem = pel - 0.03
    neck0 = bone_z("neck_01"); head0 = bone_z("head"); collar = neck0 + 0.32 * (head0 - neck0)
    chest = bone_z("spine_03") - 0.015
    spine_y = bone_p("spine_02").y
    hands = {"hand_l", "hand_r"} | {b for b in BONES if b.split("_")[0] in ("thumb", "index", "middle", "ring", "pinky")}
    torso = {"pelvis", "spine_01", "spine_02", "spine_03", "clavicle_l", "clavicle_r"}
    arms = {"upperarm_l", "upperarm_r", "lowerarm_l", "lowerarm_r"}
    sh = {s: bone_p(f"upperarm_{s}") for s in "lr"}; wr = {s: bone_p(f"hand_{s}") for s in "lr"}
    # ---------------- the windbreaker
    def jk_region(i):
        d = dom[i]
        if not inbody[i] or d is None or d in hands: return False
        if d in torso: return P(i).z >= hem - 0.05
        if d in arms: return True
        if d == "neck_01": return P(i).z <= collar + 0.03
        return False
    def jk_off(i, co, n):
        d = dom[i]
        if d == "neck_01": return 0.010
        if d in ("lowerarm_l", "lowerarm_r"): return 0.013
        if d in ("upperarm_l", "upperarm_r"): return 0.016
        return 0.018
    front = lambda c, n: n.y < -0.2 and c.z > hem - 0.06
    torso_geom = lambda c, n: abs(c.x) < 0.2 and c.z < chest
    cuts = [(None, Vector((0, 0, collar)), Vector((0, 0, 1))),                       # the collar's top
            (torso_geom, Vector((0, 0, hem)), Vector((0, 0, -1))),                  # the hem (the torso only)
            (front, Vector((0.016, 0, 0)), Vector((1, 0, 0)), lambda c, n: False),  # the open zip: a 3.2 cm gap
            (front, Vector((-0.016, 0, 0)), Vector((1, 0, 0)), lambda c, n: abs(c.x) < 0.016 and front(c, n))]
    for s in "lr":   # the cuffs: a plane across the forearm 1.5 cm short of the wrist joint
        d = (wr[s] - bone_p(f"lowerarm_{s}")).normalized()
        cuts.append((None, wr[s] - d * 0.015, d))
    def is_sleeve(f):     # (by the bones that move it: a position test put inner forearm faces on the torso's bands)
        return sum(1 for v in f.verts if dom_bone(v) in arms) * 2 > len(f.verts)
    def jk_uv(f, co, i):
        if is_sleeve(f):
            s = "l" if co.x > 0 else "r"
            ax = wr[s] - sh[s]; t = (co - sh[s]).dot(ax) / ax.length_squared
            return cell_uv("jk_sleeve", 0.5, min(1, max(0, t)))
        ang = math.atan2(co.x, -(co.y - spine_y)) % (2 * math.pi)          # 0 = the front (the zip gap)
        return cell_uv("jk_torso", ang / (2 * math.pi), min(1, max(0, (co.z - hem) / (collar - hem))))
    vc = (chest - hem) / (collar - hem); vn = (neck0 - 0.02 - hem) / (collar - hem)
    GEN["jk_torso"] = band_tex(128, 128, [(0, 0.07, "navy"), (0.07, vc - 0.03, "purple"), (vc - 0.03, vc, "white"), (vc, vn, "teal"), (vn, 1.01, "navy")],
                               extra=lambda u, v: "zip" if (u < 0.035 or u > 0.965) and v < vn else None)
    GEN["jk_sleeve"] = band_tex(16, 128, [(0, 0.5, "teal"), (0.5, 0.86, "purple"), (0.86, 1.01, "navy")])
    jacket, inner_j = garment("kid_jacket", me, jk_region, jk_off, cuts, jk_uv, thick=0.004, smooth=3, ratio=0.45)
    # ---------------- the socks: knee-high-ish, two stripes under a white top
    knee = min(bone_z("calf_l"), bone_z("calf_r"))
    s_lo, s_hi = 0.065, knee - 0.07
    sk_region = lambda i: inbody[i] and dom[i] in ("calf_l", "calf_r", "foot_l", "foot_r") and s_lo - 0.03 <= P(i).z <= s_hi + 0.03
    sk_cuts = [(None, Vector((0, 0, s_hi)), Vector((0, 0, 1))), (None, Vector((0, 0, s_lo)), Vector((0, 0, -1)))]
    sk_uv = lambda f, co, i: cell_uv("socks", 0.5, min(1, max(0, (co.z - s_lo) / (s_hi - s_lo))))
    GEN["socks"] = band_tex(16, 128, [(0, 0.70, "sock"), (0.70, 0.75, "red"), (0.75, 0.79, "sock"), (0.79, 0.84, "navy"), (0.84, 1.01, "sock")])
    socks, inner_s = garment("kid_socks", me, sk_region, lambda i, co, n: 0.0035, sk_cuts, sk_uv, thick=0.002, smooth=1)
    # ---------------- the cap: the head's skin above a tilted rim plane, lifted over the hair (the hair stays: worn
    # backwards the fringe shows), a white centre panel, + a forward and a backward brim
    brows = parts[C["brows"]]
    bz = sum((brows.matrix_world @ v.co).z for v in brows.data.vertices) / len(brows.data.vertices)
    by = min((brows.matrix_world @ v.co).y for v in brows.data.vertices)
    k_rim = 0.055 / 0.17
    rim_z = lambda y: bz + 0.032 - k_rim * (y - by)
    hair = parts[C["hair"]]
    HV = np.array([tuple(hair.matrix_world @ v.co) for v in hair.data.vertices], np.float32)
    def cp_off(i, co, n):
        p = np.array(tuple(basemesh.matrix_world @ co), np.float32); nn = np.array(tuple(n), np.float32)
        d = HV - p; along = d @ nn; lat = np.linalg.norm(d - np.outer(along, nn), axis=1)
        m = along[(lat < 0.02) & (along > -0.01)]
        return float(min(0.045, max(0.012, (m.max() if m.size else 0) + 0.005)))
    cp_region = lambda i: inbody[i] and dom[i] == "head" and P(i).z > rim_z(P(i).y) - 0.03
    rim_n = Vector((0, k_rim, 1)).normalized()
    cp_cuts = [(None, Vector((0, by, bz + 0.032)), -rim_n)]
    cp_uv = lambda f, co, i: cell_uv("cap", min(1, max(0, (co.x + 0.11) / 0.22)), 0.5)
    GEN["cap"] = band_tex(64, 8, [(0, 0.40, "cap"), (0.40, 0.60, "white"), (0.60, 1.01, "cap")], axis="u")
    cap, _ = garment("kid_cap", me, cp_region, cp_off, cp_cuts, cp_uv, thick=0.003, smooth=3, hide_inner=False)
    rimv = [cap.matrix_world @ v.co for v in cap.data.vertices]
    low = [p for p in rimv if p.z < rim_z(p.y) + 0.012]
    yc = sum(p.y for p in low) / len(low)
    R = sum((p.x ** 2 + (p.y - yc) ** 2) ** 0.5 for p in low) / len(low)
    brims = [make_brim("kid_brim_f", yc, R, rim_z, +1), make_brim("kid_brim_b", yc, R, rim_z, -1)]
    # the hair hidden under the cap's crown goes (tris nobody sees); the fringe zone stays (worn backwards it shows)
    bm = bmesh.new(); bm.from_mesh(hair.data)
    gone_h = [v for v in bm.verts if (hair.matrix_world @ v.co).z > rim_z((hair.matrix_world @ v.co).y) + 0.012
              and (hair.matrix_world @ v.co).y > by + 0.035]
    bmesh.ops.delete(bm, geom=gone_h, context="VERTS"); bm.to_mesh(hair.data); bm.free()
    print(f"hair under the crown: {len(gone_h)} vertices off")
    # ---------------- the tee: only its front strip shows in the open zip (the rest under the jacket goes: nothing
    # can poke through the jacket, fewer tris); the sneakers' own sock above the collar goes; chunkier sneakers
    tee = parts[C["shirt"]]
    bm = bmesh.new(); bm.from_mesh(tee.data)
    gone_t = [v for v in bm.verts if not (abs((tee.matrix_world @ v.co).x) < 0.075 and (tee.matrix_world @ v.co).y < spine_y)]
    bmesh.ops.delete(bm, geom=gone_t, context="VERTS"); bm.to_mesh(tee.data); bm.free()
    shoes = parts[C["shoes"]]
    bm = bmesh.new(); bm.from_mesh(shoes.data)
    gone2 = [v for v in bm.verts if (shoes.matrix_world @ v.co).z > C.get("shoe_collar", 0.105)]
    bmesh.ops.delete(bm, geom=gone2, context="VERTS"); bm.to_mesh(shoes.data); bm.free()
    for v in shoes.data.vertices:
        p = shoes.matrix_world @ v.co
        fx = bone_p("foot_l" if p.x > 0 else "foot_r")
        p2 = Vector((fx.x + (p.x - fx.x) * 1.08, fx.y + (p.y - fx.y) * 1.06, p.z * 1.06))
        v.co = shoes.matrix_world.inverted() @ p2
    # the skin inside the shorts goes too (the pants' own delete group left the crotch: it tore at the hips in the
    # crouch / walk clips, hidden but counted, and wasted tris)
    zc = knee + C.get("shorts_above_knee", 0.035)
    inner_p = {i for i in range(len(me.vertices)) if inbody[i] and dom[i] in ("pelvis", "thigh_l", "thigh_r") and zc + 0.03 < P(i).z < pel + 0.06}
    delete_group(inner_j, "Delete.kid_jacket"); delete_group(inner_s, "Delete.kid_socks"); delete_group(inner_p, "Delete.kid_shorts")
    # cloth weights smoothed (the low-poly shorts' crotch and the jacket's shoulders stretched in strides / reaches)
    for o, rep in ((parts[SHORTS], 10), (jacket, 3)): smooth_weights(o, rep)
    print(f"outfit: jacket {len(jacket.data.polygons)} f, socks {len(socks.data.polygons)} f, cap {len(cap.data.polygons)} f, tee -{len(gone_t)} v, shoes -{len(gone2)} v")
    return {"kid_jacket": jacket, "kid_socks": socks, "kid_cap": cap, "kid_brim_f": brims[0], "kid_brim_b": brims[1]}

def make_brim(name, yc, R, rim_z, direction):
    """a D-shaped brim, 7 cm deep at the middle, curving down at the sides, 5 mm thick; direction +1 front, -1 back"""
    bm = bmesh.new()
    NA, NR = 17, 4
    rows = []
    for j in range(NR + 1):
        row = []
        for i in range(NA):
            th = math.radians(-72 + 144 * i / (NA - 1))
            depth = 0.068 * (math.cos(th) ** 0.8) * j / NR
            r = R - 0.004 + depth
            x = r * math.sin(th); y = yc - direction * r * math.cos(th)
            z0 = rim_z(yc - direction * R * math.cos(th)) - 0.002
            z = z0 - 0.16 * depth - 0.012 * (math.sin(th) ** 2) * j / NR
            row.append(bm.verts.new((x, y, z)))
        rows.append(row)
    for j in range(NR):
        for i in range(NA - 1):
            bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]) if direction > 0 else (rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]))
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops: l[uvl].uv = cell_uv("jk_sleeve", 0.5, 0.95)       # (the navy of the cuffs)
    me = bpy.data.meshes.new(name); bm.to_mesh(me); bm.free()
    o = bpy.data.objects.new(name, me); bpy.context.scene.collection.objects.link(o)
    sm = o.modifiers.new("solid", "SOLIDIFY"); sm.thickness = 0.005; sm.offset = 0; sm.use_rim = True
    sel_only(o); bpy.ops.object.modifier_apply(modifier="solid")
    for g in basemesh.vertex_groups: o.vertex_groups.new(name=g.name)
    o.vertex_groups["head"].add(list(range(len(me.vertices))), 1.0, "REPLACE")
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    o["uv_atlas"] = True
    return o

# ------------------------------------------------------------------------------------------------ 2. the UAL T-pose
FING = ("thumb", "index", "middle", "ring", "pinky")
def tpose_spec():
    """bone -> (MPFB child or None = its tail, UAL child, secondary pair (a, b) = vector a -> b, or None)"""
    S = {"pelvis": ("spine_01", "spine_01", ("thigh_r", "thigh_l")),
         "spine_01": ("spine_02", "spine_02", ("clavicle_r", "clavicle_l")),
         "spine_02": ("spine_03", "spine_03", ("clavicle_r", "clavicle_l")),
         "spine_03": ("neck_01", "neck_01", ("clavicle_r", "clavicle_l")),
         "neck_01": ("head", "Head", ("clavicle_r", "clavicle_l"))}
    for s in "lr":
        palm = (f"index_01_{s}", f"pinky_01_{s}")
        S[f"clavicle_{s}"] = (f"upperarm_{s}", f"upperarm_{s}", None)
        S[f"upperarm_{s}"] = (f"lowerarm_{s}", f"lowerarm_{s}", palm)
        S[f"lowerarm_{s}"] = (f"hand_{s}", f"hand_{s}", palm)
        S[f"hand_{s}"] = (f"middle_01_{s}", f"middle_01_{s}", palm)
        for fn in FING:
            S[f"{fn}_01_{s}"] = (f"{fn}_02_{s}", f"{fn}_02_{s}", None)
            S[f"{fn}_02_{s}"] = (f"{fn}_03_{s}", f"{fn}_03_{s}", None)
            S[f"{fn}_03_{s}"] = (None, f"{fn}_04_leaf_{s}", None)
        fwd = (f"foot_{s}", f"ball_{s}")
        S[f"thigh_{s}"] = (f"calf_{s}", f"calf_{s}", fwd)
        S[f"calf_{s}"] = (f"foot_{s}", f"foot_{s}", fwd)
        S[f"foot_{s}"] = (f"ball_{s}", f"ball_{s}", None)
        S[f"ball_{s}"] = (None, f"ball_leaf_{s}", None)
    return S
UALN = lambda n: {"head": "Head", "Root": "root"}.get(n, n)

def tpose(arm):
    S = tpose_spec()
    sel_only(arm); bpy.ops.object.mode_set(mode="POSE")
    mw = arm.matrix_world
    assert max(abs(mw.to_3x3()[i][j] - (1 if i == j else 0)) for i in range(3) for j in range(3)) < 1e-4, "the rig must have an identity rotation / scale"
    order = []
    def walk(b):
        order.append(b.name)
        for c in b.children: walk(c)
    for b in arm.data.bones:
        if b.parent is None: walk(b)
    def wp(n, end="head"):
        pb = arm.pose.bones[n]; return mw @ (pb.head if end == "head" else pb.tail)
    worst = 0.0
    head_rot0 = arm.pose.bones["head"].matrix.to_3x3().copy()
    for n in order:
        if n not in S: continue
        mc, uc, sec = S[n]
        if uc not in REST: continue
        d_cur = (wp(mc) if mc else wp(n, "tail")) - wp(n)
        d_tgt = gl2b(REST[uc]["p"]) - gl2b(REST[n if n in REST else UALN(n)]["p"])
        if d_cur.length < 1e-6 or d_tgt.length < 1e-6: continue
        R = d_cur.normalized().rotation_difference(d_tgt.normalized())
        if sec:
            s_cur = R @ (wp(sec[1]) - wp(sec[0]))
            s_tgt = gl2b(REST[sec[1]]["p"]) - gl2b(REST[sec[0]]["p"])
            ax = d_tgt.normalized()
            a = (s_cur - ax * s_cur.dot(ax)); b = (s_tgt - ax * s_tgt.dot(ax))
            if a.length > 1e-5 and b.length > 1e-5:
                ang = a.normalized().angle(b.normalized())
                if a.normalized().cross(b.normalized()).dot(ax) < 0: ang = -ang
                R = Quaternion(ax, ang) @ R
        pb = arm.pose.bones[n]
        h = pb.head.copy()
        pb.matrix = Matrix.Translation(h) @ R.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()
        d_new = (wp(mc) if mc else wp(n, "tail")) - wp(n)
        worst = max(worst, math.degrees(d_new.angle(d_tgt)))
    # the head: back to its own world orientation (face forward, as UAL's rest; the neck's correction tilted it up)
    pb = arm.pose.bones["head"]
    pb.matrix = Matrix.Translation(pb.head.copy()) @ head_rot0.to_4x4()
    bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    print(f"T-pose: {len(order)} bones, worst direction error {worst:.2f} deg")
    return worst

def bake_pose_as_rest(arm, meshes):
    for o in meshes:
        sel_only(o)
        if o.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for m in [m for m in o.modifiers if m.type != "ARMATURE"]: bpy.ops.object.modifier_apply(modifier=m.name)
        am = next((m for m in o.modifiers if m.type == "ARMATURE"), None)
        if am: bpy.ops.object.modifier_apply(modifier=am.name)
    sel_only(arm); bpy.ops.object.mode_set(mode="POSE")
    bpy.ops.pose.armature_apply(selected=False)
    bpy.ops.object.mode_set(mode="OBJECT")
    for o in meshes:
        m = o.modifiers.new("Armature", "ARMATURE"); m.object = arm

# ------------------------------------------------------------------------------------------------ 3. the atlas
AW, AH = 2048, 1280
CELLS = {"skin": (0, 256, 1024, 1024), "hair": (1024, 768, 512, 512), "tee": (1536, 768, 512, 512),
         "shorts": (1024, 256, 512, 512), "shoes": (1536, 256, 512, 512), "eyes": (0, 0, 256, 256),
         "brows": (256, 0, 256, 256), "lashes": (512, 0, 256, 256),
         "jk_torso": (1024, 0, 256, 256), "jk_sleeve": (1280, 0, 64, 256), "socks": (1344, 0, 64, 256), "cap": (1408, 0, 256, 64)}
def cell_uv(cell, u, v, inset=1.5):
    """a cell's (u, v) in ATLAS UVs (Blender: v up from the bottom row)"""
    x0, y0, w, h = CELLS[cell]
    return ((x0 + inset + u * (w - 2 * inset)) / AW, (y0 + inset + v * (h - 2 * inset)) / AH)

def obj_image(o):
    for m in o.data.materials:
        if not m or not m.use_nodes: continue
        b = next((n for n in m.node_tree.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if b and b.inputs["Base Color"].links and b.inputs["Base Color"].links[0].from_node.type == "TEX_IMAGE":
            return b.inputs["Base Color"].links[0].from_node.image
    return None

def img_array(img, w, h):
    im = img.copy(); im.scale(w, h)
    a = np.empty(w * h * 4, np.float32); im.pixels.foreach_get(a)
    bpy.data.images.remove(im)
    return a.reshape(h, w, 4)

def build_atlas(slots):
    """slots: {slot: (object, cell)} -> the atlas image (Blender pixel rows, bottom first) + the image parts' UVs moved
    into their cells (the scripted garments already wrote atlas UVs: uv_atlas)"""
    A = np.zeros((AH, AW, 4), np.float32); A[..., 3] = 1
    for cell, arr in GEN.items():
        x0, y0, w, h = CELLS[cell]
        a = np.repeat(np.repeat(arr, h // arr.shape[0], axis=0), w // arr.shape[1], axis=1)
        A[y0:y0 + h, x0:x0 + w] = a
    for slot, (o, cell) in slots.items():
        if o.get("uv_atlas"): continue
        x0, y0, w, h = CELLS[cell]
        img = obj_image(o)
        if img is None: print("no image for", slot); continue
        a = img_array(img, w, h)
        if cell == "eyes": a[..., :3] *= 0.9                       # (the whites a touch less bright: less glassy)
        if cell not in ("hair", "brows", "lashes"): a[..., 3] = 1
        A[y0:y0 + h, x0:x0 + w] = a
        uv = o.data.uv_layers.active
        d = np.empty(len(uv.data) * 2, np.float32); uv.data.foreach_get("uv", d); d = d.reshape(-1, 2)
        inset = 1.5
        d[:, 0] = (x0 + inset + np.clip(d[:, 0], 0, 1) * (w - 2 * inset)) / AW
        d[:, 1] = (y0 + inset + np.clip(d[:, 1], 0, 1) * (h - 2 * inset)) / AH
        uv.data.foreach_set("uv", d.ravel())
    img = bpy.data.images.new("kidA_atlas", AW, AH, alpha=True)
    img.pixels.foreach_set(A.ravel())
    p = os.path.join(GOUT, "kidA_atlas.png")
    img.filepath_raw = p; img.file_format = "PNG"; img.save()
    print("atlas", p)
    return img

# ------------------------------------------------------------------------------------------------ the game build
def game():
    outfit = build_outfit()
    for img in bpy.data.images:
        if img.size[0] > MAX_TEX or img.size[1] > MAX_TEX:
            s = MAX_TEX / max(img.size); img.scale(max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s)))
    bake_tints()
    tint(parts[C["shoes"]], C.get("shoes_tint"), 0.35)
    root = ExportService.create_character_copy(basemesh, name_suffix="_export")
    eb = ObjectService.find_object_of_type_amongst_nearest_relatives(root, "Basemesh")
    ExportService.bake_modifiers_remove_helpers(eb, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
    arm = root if root.type == "ARMATURE" else root.parent
    meshes = [o for o in ObjectService.get_list_of_children(arm) if o.type == "MESH"]
    # the slots (each export-copy object -> its slot + atlas cell)
    def slot_of(o):
        n = o.name.replace("_export", "")
        for key, cell in (("kid_jacket", "jk_torso"), ("kid_socks", "socks"), ("kid_cap", "cap"), ("kid_brim_f", "jk_sleeve"), ("kid_brim_b", "jk_sleeve")):
            if n.startswith(key): return key.replace("kid_", ""), cell
        if o == eb: return "skin", "skin"
        if n.endswith(C["hair"]): return "hair", "hair"
        if n.endswith(C["shirt"]): return "tee", "tee"
        if n.endswith(SHORTS): return "shorts", "shorts"
        if n.endswith(C["shoes"]): return "shoes", "shoes"
        if n.endswith("low-poly"): return "eyes", "eyes"
        if n.endswith(C["brows"]): return "brows", "brows"
        if "eyelashes" in n: return "lashes", "lashes"
        return None, None
    slots = {}
    for o in meshes:
        s, cell = slot_of(o)
        if s is None: print("dropped", o.name); bpy.data.objects.remove(o); continue
        slots[s] = (o, cell)
    meshes = [o for o, _ in slots.values()]
    # budget before the bind (per part): the body and the jacket and the shoes
    for s, ratio in (("skin", C.get("skin_ratio", 0.55)), ("shoes", 0.5)):
        if s not in slots: continue
        o = slots[s][0]; sel_only(o)
        if o.data.shape_keys: bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for m in [m for m in o.modifiers if m.type == "MASK"]: bpy.ops.object.modifier_apply(modifier=m.name)
        d = o.modifiers.new("budget", "DECIMATE"); d.ratio = ratio; d.use_symmetry = True; d.symmetry_axis = "X"
        while o.modifiers.find("budget") > 0: bpy.ops.object.modifier_move_up(modifier="budget")
        bpy.ops.object.modifier_apply(modifier="budget")
    # UV layers: one "UVMap" each
    for o in meshes:
        uvs = o.data.uv_layers
        if not len(uvs): uvs.new(name="UVMap")
        act = uvs.active
        for u in [u for u in uvs if u != act]: uvs.remove(u)
        uvs.active.name = "UVMap"
    atlas = build_atlas(slots)
    # T-pose + bind
    worst = tpose(arm)
    bake_pose_as_rest(arm, meshes)
    for b in arm.data.bones:
        if UALN(b.name) != b.name: b.name = UALN(b.name)
    for o in meshes:
        for g in o.vertex_groups:
            if UALN(g.name) != g.name: g.name = UALN(g.name)
    # one material per slot, joined
    mats = {}
    for s, (o, _) in slots.items():
        m = bpy.data.materials.new(s); m.use_nodes = True
        tex = m.node_tree.nodes.new("ShaderNodeTexImage"); tex.image = atlas
        bs = m.node_tree.nodes["Principled BSDF"]; m.node_tree.links.new(tex.outputs[0], bs.inputs["Base Color"])
        m.node_tree.links.new(tex.outputs[1], bs.inputs["Alpha"])
        bs.inputs["Roughness"].default_value = 0.7
        o.data.materials.clear(); o.data.materials.append(m); mats[s] = m
    for o in meshes:
        sel_only(o)
        # drop every vertex group that is not a bone (helpers, delete groups, masks)
        for g in [g for g in o.vertex_groups if g.name not in arm.data.bones]: o.vertex_groups.remove(g)
    sel_only(meshes[0])
    for o in meshes[1:]: o.select_set(True)
    bpy.context.view_layer.objects.active = slots["skin"][0]
    bpy.ops.object.join()
    kid = bpy.context.active_object; kid.name = "kid_LOD0"
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode="OBJECT")
    T0 = len(kid.data.polygons)
    print(f"LOD0 {T0} tris, slots {[m.name for m in kid.data.materials]}")
    bake_ao(kid)
    lods = [kid]
    for i, target in ((1, 8000), (2, 2000)):
        o = kid.copy(); o.data = kid.data.copy(); o.name = f"kid_LOD{i}"; bpy.context.scene.collection.objects.link(o)
        for m in list(o.modifiers): o.modifiers.remove(m)
        sel_only(o)
        dc = o.modifiers.new("Dec", "DECIMATE"); dc.ratio = target / T0; dc.use_collapse_triangulate = True; dc.use_symmetry = True; dc.symmetry_axis = "X"
        bpy.ops.object.modifier_apply(modifier="Dec")
        m = o.modifiers.new("Armature", "ARMATURE"); m.object = arm
        lods.append(o)
        print(f"LOD{i}: {len(o.data.polygons)} tris")
    # export (rig + LODs, no clips, UVs + AO, materials = slot names, no images)
    for o in list(bpy.context.scene.objects):
        if o.type == "MESH" and o not in lods: o.hide_set(True); o.hide_render = True
    for o in lods: o.parent = arm; o.matrix_parent_inverse = Matrix.Identity(4)
    for x in bpy.context.view_layer.objects: x.select_set(False)
    arm.select_set(True)
    for o in lods: o.select_set(True)
    bpy.context.view_layer.objects.active = arm
    glb = os.path.join(GOUT, "kidA_src.glb")
    bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=False,
        export_texcoords=True, export_normals=True, export_materials="EXPORT", export_image_format="NONE", export_skins=True,
        export_animations=False, export_vertex_color="NAME", export_vertex_color_name="AO", export_all_vertex_colors=False,
        export_extras=False, export_def_bones=False)
    UAL_PELVIS_Y = REST["pelvis"]["p"][1] / 0.79126          # (kid.json pelvisScale: the kid's pelvis / the UAL's)
    jo = {b.name: G(arm.matrix_world @ b.head_local) for b in arm.data.bones}
    zs = [(kid.matrix_world @ v.co).z for v in kid.data.vertices]
    rigj = {"source": "MakeHuman MPFB 2.0.18 (CC0 assets) by tools/blender/kidMakeHuman.py --game, T-posed onto the UAL rig",
            "height": round(max(zs) - min(zs), 4), "pelvisScale": round(jo["pelvis"][1] / UAL_PELVIS_Y, 5), "joints": jo,
            "tris": [len(o.data.polygons) for o in lods], "slots": [m.name for m in kid.data.materials],
            "tposeWorstDeg": round(worst, 3), "atlas": "kidA_atlas.ktx2", "sole": 0.0}
    json.dump(rigj, open(os.path.join(GOUT, "kidA_rig.json"), "w"), indent=1)
    print("GAME", json.dumps({k: rigj[k] for k in ("height", "pelvisScale", "tris", "tposeWorstDeg")}))
    return arm, lods

def bake_ao(o, samples=48, dist=0.18):
    scn = bpy.context.scene
    gpu_setup(scn); scn.cycles.samples = samples
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = dist
    ca = o.data.color_attributes.new("AO", "BYTE_COLOR", "POINT")
    o.data.color_attributes.active_color = ca
    bpy.ops.mesh.primitive_plane_add(size=6, location=(0, 0, -0.002)); g = bpy.context.active_object
    sel_only(o)
    scn.render.bake.target = "VERTEX_COLORS"
    bpy.ops.object.bake(type="AO")
    bpy.data.objects.remove(g)
    d = np.zeros(len(o.data.vertices) * 4); ca.data.foreach_get("color", d); d = d.reshape(-1, 4)
    d[:, :3] = 0.35 + 0.65 * d[:, :3]; ca.data.foreach_set("color", d.ravel())

def game_renders(arm, lod0, dirp):
    """day + night Cycles renders of LOD0 with the arms down (pose only) and the chosen brim"""
    os.makedirs(dirp, exist_ok=True)
    scn = bpy.context.scene
    for o in bpy.context.scene.objects:
        if o.type == "MESH" and o != lod0: o.hide_render = True
    gpu_setup(scn); scn.cycles.samples = 96; scn.cycles.use_denoising = True
    try: scn.cycles.denoiser = "OPTIX"
    except Exception: pass
    scn.view_settings.view_transform = "AgX"
    # the hidden brim: its faces' material made fully transparent for the render
    hide = "brim_b" if CAP_MODE == "fwd" else "brim_f"
    for m in lod0.data.materials:
        if m.name.startswith(hide):
            m.node_tree.nodes["Principled BSDF"].inputs["Alpha"].default_value = 0.0
            for l in list(m.node_tree.links):
                if l.to_socket.name == "Alpha": m.node_tree.links.remove(l)
    sel_only(arm); bpy.ops.object.mode_set(mode="POSE")
    for s, sg in (("l", 1), ("r", -1)):
        pb = arm.pose.bones[f"upperarm_{s}"]
        h = pb.head.copy()
        R = Quaternion(Vector((0, 1, 0)), sg * math.radians(68))
        pb.matrix = Matrix.Translation(h) @ R.to_matrix().to_4x4() @ Matrix.Translation(-h) @ pb.matrix
        bpy.context.view_layer.update()
    bpy.ops.object.mode_set(mode="OBJECT")
    hgt = max((lod0.matrix_world @ v.co).z for v in lod0.data.vertices)
    w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA")); scn.collection.objects.link(fill)
    lamp = bpy.data.objects.new("lamp", bpy.data.lights.new("lamp", "POINT")); scn.collection.objects.link(lamp)
    bpy.ops.mesh.primitive_plane_add(size=10); gp = bpy.context.active_object
    gm = bpy.data.materials.new("ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.36, 0.36, 0.34, 1); gp.data.materials.append(gm)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    hb = arm.pose.bones["Head"]; face = arm.matrix_world @ ((hb.head + hb.tail) * 0.5) + Vector((0, 0, 0.02))
    def light(mode):
        if mode == "day":
            bg.inputs[0].default_value = (0.62, 0.70, 0.80, 1); bg.inputs[1].default_value = 0.65
            sun.data.energy = 3.4; sun.data.color = (1.0, 0.96, 0.90); sun.data.angle = math.radians(6)
            sun.rotation_euler = (math.radians(48), 0, math.radians(30)); sun.hide_render = False
            fill.data.energy = 120; fill.data.size = 3; fill.location = (-2.5, -2.5, 1.6); fill.rotation_euler = (math.radians(70), 0, math.radians(-45)); fill.hide_render = False
            lamp.hide_render = True
        else:   # a blue night + a sodium street lamp 3 m up, 2 m to the side
            bg.inputs[0].default_value = (0.05, 0.07, 0.13, 1); bg.inputs[1].default_value = 0.35
            sun.data.energy = 0.08; sun.data.color = (0.6, 0.7, 1.0); sun.hide_render = False
            fill.hide_render = True
            lamp.hide_render = False; lamp.location = (1.6, -1.6, 3.0); lamp.data.energy = 260; lamp.data.color = (1.0, 0.72, 0.42); lamp.data.shadow_soft_size = 0.15
    mid = Vector((0, 0, hgt * 0.52))
    def look(target):
        d = target - cam.location; cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()
    for mode in ("day", "night"):
        light(mode)
        scn.render.resolution_x, scn.render.resolution_y = 800, 1100
        cam.data.lens = 85
        views = {"front": (0, -1, 0.05), "q34": (0.75, -0.75, 0.08), "side": (1, 0, 0.05), "back": (0, 1, 0.08)} if mode == "day" else {"q34": (0.75, -0.75, 0.08)}
        for nm, d in views.items():
            cam.location = mid + Vector(d).normalized() * 4.3; look(mid)
            scn.render.filepath = os.path.join(dirp, f"A_v2_{mode}_{nm}.png"); bpy.ops.render.render(write_still=True)
        cam.data.lens = 100
        scn.render.resolution_x = scn.render.resolution_y = 900
        cam.location = face + Vector((0.35, -1.1, 0.04)).normalized() * 1.25; look(face)
        scn.render.filepath = os.path.join(dirp, f"A_v2_{mode}_face.png"); bpy.ops.render.render(write_still=True)

arm_g, lods_g = game()
if RENDERS: game_renders(arm_g, lods_g[0], RENDERS)
print("GAME DONE")
