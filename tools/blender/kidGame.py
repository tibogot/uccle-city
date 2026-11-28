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
# ROUND 2 of the kid look (docs/KIDCHAR.md phase 7, owner 2026-11-28 "looks too much like plastic": geometry + clothes):
# 2-D atlas cells for the sleeves / socks / cap / brims (their folds baked by kidLookBake.py), hems and cuffs with real
# thickness and support loops (a separate hem band: ready for a later cloth sim), the shorts' waistband / pockets /
# turn-up cuff, the socks' rib, the sneakers' sole lip / laces / tongue, a smooth brim, a hair shell with chunky locks, a
# friendlier face. --r1 rebuilds round 1 exactly (models/characters/kidA_r1.* are that build, ?kidlook=r1 / old)
R2 = "--r1" not in argv

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
WN = {}             # (round 2) slot -> the vertices that take weighted normals (default: the whole garment)
LOD_R2 = ((1, 9800), (2, 2400))    # (round 2: LOD0 ~30k; LOD1 >= 30 % of it, LOD2 >= 20 % of LOD1: no popping)
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

def cut_above(o, z):
    from mathutils import kdtree
    bm = bmesh.new(); bm.from_mesh(o.data); mw = o.matrix_world; mwi = mw.inverted()
    co = mwi @ Vector((0, 0, z)); no = (mwi.to_3x3() @ Vector((0, 0, 1))).normalized()
    bmesh.ops.bisect_plane(bm, geom=bm.verts[:] + bm.edges[:] + bm.faces[:], plane_co=co, plane_no=no, clear_outer=True)
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    dl = bm.verts.layers.deform.active
    has = [v for v in bm.verts if len(v[dl]) > 0]
    kd = kdtree.KDTree(len(has))
    for k, v in enumerate(has): kd.insert(v.co, k)
    kd.balance()
    for v in bm.verts:
        if len(v[dl]) == 0:
            acc, tot = {}, 0.0
            for c, k, d in kd.find_n(v.co, 4):
                wk = 1.0 / max(d, 1e-4); tot += wk
                for gi, w in has[k][dl].items(): acc[gi] = acc.get(gi, 0.0) + w * wk
            for gi, w in acc.items(): v[dl][gi] = w / tot
    bm.to_mesh(o.data); bm.free()

def delete_group(inner, name):
    g = basemesh.vertex_groups.get(name) or basemesh.vertex_groups.new(name=name)
    g.add(sorted(inner), 1.0, "REPLACE")
    m = basemesh.modifiers.new(name, "MASK"); m.vertex_group = name; m.invert_vertex_group = True

def garment(name, me, region, off, cuts, uv_of, thick, smooth=2, hide_inner=True, ratio=1.0, shape=None, hem_in=None, post=None, band=None, uv_fix=None, keep_in=0.01):
    """(round 2: post(bm) shapes the cut garment before the solidify: hem stand-off, folds; band(co) -> 0..1 the
    solidify's thickness factor (1 = the full `thick` at the hems / cuffs, the rest at its 0 value: band(None)); uv_fix(bm,
    uvl): the UVs mended after uv_of (a wrap-around seam))"""
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
    # (kid A polish: the skin was hidden over the whole uncut region, but the cuts then trimmed the garment: holes in
    # the skin showed above the socks, at the wrists and inside the shorts. Only skin 1 cm inside every cut is hidden)
    def inside(v):
        for cut in cuts:
            if len(cut) == 4: continue
            ok, co, no = cut[:3]
            if (ok is None or ok(v.co, v.normal)) and (v.co - co).dot(no) > -keep_in: return False
        return True
    bm.verts.ensure_lookup_table()
    inner = {i for i in inner if inside(bm.verts[i])}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts: v.co = v.co + v.normal * off(v[src], v.co, v.normal)
    for _ in range(smooth):
        bmesh.ops.smooth_vert(bm, verts=[v for v in bm.verts if not v.is_boundary], factor=0.5, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    if shape: shape(bm)
    bm.normal_update()
    bm.verts.layers.int.remove(src)
    if ratio < 1:
        # the budget BEFORE the cuts (kid A polish: decimating after them collapsed the hem / cuff edges into a
        # ragged saw-tooth) and before the UVs (a collapse across the colour cells' seams smeared bands)
        tmp = bpy.data.meshes.new(name + "_tmp"); bm.to_mesh(tmp); bm.free()
        to = bpy.data.objects.new(name + "_tmp", tmp); bpy.context.scene.collection.objects.link(to)
        for g in basemesh.vertex_groups: to.vertex_groups.new(name=g.name)
        d = to.modifiers.new("budget", "DECIMATE"); d.ratio = ratio; d.use_symmetry = True; d.symmetry_axis = "X"
        sel_only(to); bpy.ops.object.modifier_apply(modifier="budget")
        bm = bmesh.new(); bm.from_mesh(to.data); bpy.data.objects.remove(to); bm.normal_update()
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
    me2 = bpy.data.meshes.new(name); bm.to_mesh(me2); bm.free()
    o = bpy.data.objects.new(name, me2); bpy.context.scene.collection.objects.link(o)
    for g in basemesh.vertex_groups: o.vertex_groups.new(name=g.name)
    o.matrix_world = basemesh.matrix_world.copy()
    # UVs (the body's own UV layer dropped: a new layer next to it got a ".001" name and the body's UVs won)
    bm = bmesh.new(); bm.from_mesh(o.data)
    GARM["dl"] = bm.verts.layers.deform.active
    if hem_in:
        # a TURNED-IN hem: the open edge above z hem_in[0] folds hem_in[1] m in toward its own loop's middle (per side)
        # and down: looking into the top, the eye meets the fabric, not a gap to the (decimated) skin
        zt, dep = hem_in
        edges = [e for e in bm.edges if e.is_boundary and all(v.co.z > zt for v in e.verts)]
        if edges:
            res = bmesh.ops.extrude_edge_only(bm, edges=edges)
            nv = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
            for side in (1, -1):
                vs = [v for v in nv if v.co.x * side > 0]
                if not vs: continue
                c = sum((v.co for v in vs), Vector()) / len(vs)
                for v in vs:
                    d = Vector((c.x - v.co.x, c.y - v.co.y, 0))
                    if d.length > 1e-6: v.co += d.normalized() * dep
                    v.co.z -= dep * 0.6
    uvl = bm.loops.layers.uv.new("UVMap")
    for f in bm.faces:
        for l in f.loops: l[uvl].uv = uv_of(f, l.vert.co, -1)
    if uv_fix: uv_fix(bm, uvl)
    if post: bm.normal_update(); post(bm)
    bm.to_mesh(o.data); bm.free()
    if thick:
        sm = o.modifiers.new("solid", "SOLIDIFY"); sm.thickness = thick; sm.offset = -1; sm.use_rim = True
        if band:
            vg = o.vertex_groups.new(name="_band")
            for v in o.data.vertices:
                w = band(basemesh.matrix_world @ v.co)
                if w > 1e-3: vg.add([v.index], min(1.0, w), "REPLACE")
            sm.vertex_group = "_band"; sm.thickness_vertex_group = band(None)
        sel_only(o); bpy.ops.object.modifier_apply(modifier="solid")
        if band: o.vertex_groups.remove(o.vertex_groups["_band"])
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    o["uv_atlas"] = True
    return o, (inner if hide_inner else set())

def build_outfit():
    me = full_body()
    dom, inbody = vinfo(me)
    P = lambda i: basemesh.matrix_world @ me.vertices[i].co
    pel = bone_z("pelvis"); hem = pel - 0.005       # (a 90s windbreaker: the elastic hem at the waist; lower, it folded with the thighs)
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
        # (kid A polish: the hips' sides are moved by the thighs: left out, the hem ended there above the cut line, a
        # ragged step at both sides)
        if d in ("thigh_l", "thigh_r"): return P(i).z >= hem - 0.05
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
    cuff_d = {}
    for s in "lr":   # the cuffs: a plane across the forearm 1.5 cm short of the wrist joint
        d = (wr[s] - bone_p(f"lowerarm_{s}")).normalized(); cuff_d[s] = d
        cuts.append((None, wr[s] - d * 0.015, d))
    if R2:
        # SUPPORT LOOPS (split only): the hem band (2.2 cm: the elastic, a separate loop for a later cloth sim), the
        # cuffs' bands (2.4 cm) and the collar's turn: clean edges for the thicker shell, no smeared shading
        nosplit = lambda c, n: False
        for z_ in (hem + 0.011, hem + 0.022, hem + 0.04):
            cuts.append((torso_geom, Vector((0, 0, z_)), Vector((0, 0, -1)), nosplit))
        for s in "lr":
            for k in (0.03,):
                cuts.append((None, wr[s] - cuff_d[s] * k, cuff_d[s], nosplit))
        cuts.append((None, Vector((0, 0, collar - 0.012)), Vector((0, 0, 1)), nosplit))
    def is_sleeve(f):     # (by the bones that move it: a position test put inner forearm faces on the torso's bands)
        return sum(1 for v in f.verts if dom_bone(v) in arms) * 2 > len(f.verts)
    def arm_frame(s):
        ax = (wr[s] - sh[s]).normalized(); r1 = (Vector((0, 0, 1)) - ax * ax.z).normalized()
        return ax, r1, ax.cross(r1)
    AF = {s: arm_frame(s) for s in "lr"}
    def wrap_u(us):
        """a face's u round a tube: across the seam (u 0 / 1) its small u go past 1 (the cell keeps a 10 % margin)"""
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]
        return [min(1.0, u / 1.1) for u in us]     # (clamped: a face spread round the axis must not reach the next cell)
    def jk_uv(f, co, i):
        if is_sleeve(f):
            s = "l" if co.x > 0 else "r"
            ax = wr[s] - sh[s]; t = (co - sh[s]).dot(ax) / ax.length_squared
            if not R2: return cell_uv("jk_sleeve", 0.5, min(1, max(0, t)))
            a_, r1, r2 = AF[s]
            ang = lambda p: (math.atan2((p - sh[s]).dot(r2), (p - sh[s]).dot(r1)) / (2 * math.pi) + 0.5) % 1.0   # the seam underneath
            us = wrap_u([ang(v.co) for v in f.verts])
            k = min(range(len(f.verts)), key=lambda j: (f.verts[j].co - co).length)
            return cell_uv("jk_sleeve", us[k], min(1, max(0, t)))
        ang = math.atan2(co.x, -(co.y - spine_y)) % (2 * math.pi)          # 0 = the front (the zip gap)
        return cell_uv("jk_torso", ang / (2 * math.pi), min(1, max(0, (co.z - hem) / (collar - hem))))
    vc = (chest - hem) / (collar - hem); vn = (neck0 - 0.02 - hem) / (collar - hem)
    # (the collar is teal like the yoke: a navy collar band cut by a HEIGHT ran across the near-flat shoulder tops in a
    # jagged edge - the face close-up; the zip tape runs up to the collar's top)
    GEN["jk_torso"] = band_tex(128, 128, [(0, 0.07, "navy"), (0.07, vc - 0.03, "purple"), (vc - 0.03, vc, "white"), (vc, 1.01, "teal")],
                               extra=lambda u, v: "zip" if (u < 0.035 or u > 0.965) else None)
    GEN["jk_sleeve"] = band_tex(16, 128, [(0, 0.5, "teal"), (0.5, 0.86, "purple"), (0.86, 1.01, "navy")])
    # the windbreaker HANGS from the chest (kid A polish: it followed his belly and flared at the hem: "full at the
    # belly in profile"): below the chest no front vertex comes further forward than the chest's front line
    drape = {}
    pec = neck0 - 0.11            # (the chest's front line: spine_03 sits low in MPFB's rig, at the belly's top)
    drape["z"] = pec
    def jk_shape(bm):
        ch = [v.co.y for v in bm.verts if abs(v.co.z - pec) < 0.025 and abs(v.co.x) < 0.07]
        if not ch: return
        fy = min(ch) + 0.004; drape["y"] = fy
        bel = [v.co.y for v in bm.verts if v.co.z < pec and abs(v.co.x) < 0.07]
        print(f"jacket drape: chest front y {fy:.3f}, belly front y {min(bel) if bel else 0:.3f}, chest z {pec:.3f}")
        for v in bm.verts:
            if v.co.z < pec and v.co.y < fy:
                t = min(1.0, (pec - v.co.z) / 0.06)          # (blended in over 6 cm under the chest line)
                v.co.y = v.co.y + (fy - v.co.y) * t
        # a FLAT front (owner: "he looks like he has breasts"): an 11-year-old's chest is flat and a windbreaker does
        # not follow the pectorals: the front panels' depth relaxed across (y only, 30 passes, the edges pinned) so the
        # mounds over the chest fill in to the straight line between the shoulders and the zip (never pulled forward)
        bm.normal_update()
        front = [v for v in bm.verts if v.normal.y < -0.25 and hem - 0.02 < v.co.z < collar - 0.015 and abs(v.co.x) < 0.17 and not v.is_boundary]
        for _ in range(30):
            ny = {v: sum(e.other_vert(v).co.y for e in v.link_edges) / max(1, len(v.link_edges)) for v in front}
            for v, y in ny.items(): v.co.y = max(v.co.y, 0.5 * v.co.y + 0.5 * y)
    def cuff_t(p, s):        # m back from the cuff's edge along the forearm (< 0: past it)
        return (p - (wr[s] - cuff_d[s] * 0.015)).dot(-cuff_d[s])
    def jk_band(p):
        """the solidify's thickness factor: the hem band, the cuffs and the collar's top get the full 7 mm (a real
        double-folded elastic edge), the panels half (3.5 mm)"""
        if p is None: return 0.6
        if abs(p.x) < 0.2 and p.z < hem + 0.022: return 1.0
        s = "l" if p.x > 0 else "r"
        if abs(p.x) > 0.17 and cuff_t(p, s) < 0.03: return 0.85
        if p.z > collar - 0.012: return 0.85
        return 0.0
    def jk_post(bm):
        """the shape of a windbreaker, not a skin-tight shell: the blouson puffs out over the elastic hem band (it stands
        off the body and overhangs the band), the cuffs' elastic gathers the sleeve, and the sleeves bunch at the elbow
        and stack above the cuffs (big folds in the mesh; the fine ones are baked into the 2-D cells)"""
        nb = 0
        for v in bm.verts:
            p = v.co; n = v.normal
            sleeve = dom_bone(v) in arms
            if not sleeve and abs(p.x) < 0.2:
                if p.z < hem + 0.022:
                    v.co = p + n * 0.0015                                    # the band hugs the waist
                else:
                    t = (p.z - (hem + 0.022)) / 0.08
                    if t < 1:
                        puff = math.sin(math.pi * min(1.0, max(0.0, t * 1.15 + 0.05))) * (1 - 0.5 * t)
                        v.co = p + n * (0.0065 * puff); nb += 1
            elif sleeve:
                s = "l" if p.x > 0 else "r"
                a_, r1, r2 = AF[s]
                L = (wr[s] - sh[s]).length; tl = (p - sh[s]).dot(a_)
                ang = math.atan2((p - sh[s]).dot(r2), (p - sh[s]).dot(r1))
                ct = cuff_t(p, s)
                if ct < 0.03: v.co = p - n * 0.001; continue                  # the cuff's elastic pulls in
                # the sleeve blouses over the cuff (a soft roll 4-8 cm up the forearm) and bunches a little at the elbow:
                # LONG shapes only (the mesh's ~1.2 cm spacing; a 2 cm fold wave aliased into a crumpled zig-zag at the
                # cuff, the grazing-light close-up); the short folds are baked into the sleeve cell
                te = tl / L
                roll = 0.0018 * math.exp(-((ct - 0.055) / 0.025) ** 2)
                el = 0.0012 * math.exp(-((te - 0.5) / 0.08) ** 2) * (0.5 + 0.5 * math.cos(ang - math.pi / 2))
                v.co = p + n * (roll + el)
        print(f"jacket: blouson stand-off on {nb} vertices")
    if R2:
        jacket, inner_j = garment("kid_jacket", me, jk_region, jk_off, cuts, jk_uv, thick=0.0055, smooth=3, ratio=0.8, shape=jk_shape,
                                  post=jk_post, band=jk_band)
    else:
        jacket, inner_j = garment("kid_jacket", me, jk_region, jk_off, cuts, jk_uv, thick=0.004, smooth=3, ratio=0.5, shape=jk_shape)
    # ---------------- the socks: knee-high-ish, two stripes under a white top
    knee = min(bone_z("calf_l"), bone_z("calf_r"))
    s_lo, s_hi = 0.065, knee - 0.07
    GARM["s_hi"] = s_hi
    sk_region = lambda i: inbody[i] and dom[i] in ("calf_l", "calf_r", "foot_l", "foot_r") and s_lo - 0.03 <= P(i).z <= s_hi + 0.03
    sk_cuts = [(None, Vector((0, 0, s_hi)), Vector((0, 0, 1))), (None, Vector((0, 0, s_lo)), Vector((0, 0, -1)))]
    sk_uv = lambda f, co, i: cell_uv("socks", 0.5, min(1, max(0, (co.z - s_lo) / (s_hi - s_lo))))
    GEN["socks"] = band_tex(16, 128, [(0, 0.70, "sock"), (0.70, 0.75, "red"), (0.75, 0.79, "sock"), (0.79, 0.84, "navy"), (0.84, 1.01, "sock")])
    # (the KNEE MARKS: the socks stood 3.5 mm off the leg up to their top edge: looking into the top you saw the dark gap
    # and the skin's cut edge. The top 2 cm grip the leg like an elastic cuff: 1 mm off, the 2 mm shell sinks into the skin)
    sk_off = lambda i, co, n: 0.0035 if co.z < s_hi - 0.02 else 0.0035 - 0.0025 * min(1.0, (co.z - (s_hi - 0.02)) / 0.012)
    if not R2:
        socks, inner_s = garment("kid_socks", me, sk_region, sk_off, sk_cuts, sk_uv, thick=0.002, smooth=1)     # (a turned-in hem was tried: folded into dark ticks at the sides once snapped)
    else:
        # round 2: u round the leg (the seam at the back), v up; support loops at the rib's foot; the rib cuff (top
        # 2.6 cm) a little proud of the leg, the ankle's slouch rings in the mesh (the knit's ribs baked)
        legc = {s: (bone_p(f"calf_{s}"), bone_p(f"foot_{s}")) for s in "lr"}
        def leg_c(p):
            k, a_ = legc["l" if p.x > 0 else "r"]
            t = min(1.0, max(0.0, (k.z - p.z) / max(1e-3, k.z - a_.z)))
            return k.lerp(a_, t)
        def sk_ang(p):
            c = leg_c(p); return (math.atan2(p.x - c.x, -(p.y - c.y)) / (2 * math.pi) + 0.5) % 1.0     # 0.5 = the front
        def sk_uv2(f, co, i):
            us = wrap_u([sk_ang(v.co) for v in f.verts])
            k = min(range(len(f.verts)), key=lambda j: (f.verts[j].co - co).length)
            return cell_uv("socks", us[k], min(1, max(0, (co.z - s_lo) / (s_hi - s_lo))))
        rib0 = s_hi - 0.026
        sk_cuts += [(None, Vector((0, 0, rib0)), Vector((0, 0, 1)), lambda c, n: False), (None, Vector((0, 0, rib0 - 0.006)), Vector((0, 0, 1)), lambda c, n: False)]
        GARM["rib0"] = rib0
        def sk_post(bm):
            for v in bm.verts:
                p = v.co
                if p.z > rib0: v.co = p + v.normal * 0.0008                         # the rib cuff proud of the leg
                elif p.z < 0.15:                                                     # the slouch over the ankle
                    a = sk_ang(p) * 2 * math.pi
                    w = math.exp(-((p.z - 0.11) / 0.03) ** 2)
                    v.co = p + v.normal * w * (0.0009 + 0.0011 * math.sin(2 * math.pi * p.z / 0.019 + 1.5 * math.sin(a * 2)))
        # (keep_in=0.035: the skin stays 3.5 cm down inside the sock's top: with only 1 cm, the gap behind the rib at the back of
        # the knee looked into the hidden leg: small dark marks, also in round 1)
        socks, inner_s = garment("kid_socks", me, sk_region, sk_off, sk_cuts, sk_uv2, thick=0.002, smooth=1, post=sk_post, keep_in=0.035)
    # ---------------- the cap: the head's skin above a tilted rim plane, lifted over the hair (the hair stays: worn
    # backwards the fringe shows), a white centre panel, + a forward and a backward brim
    brows = parts[C["brows"]]
    bz = sum((brows.matrix_world @ v.co).z for v in brows.data.vertices) / len(brows.data.vertices)
    by = min((brows.matrix_world @ v.co).y for v in brows.data.vertices)
    k_rim = 0.055 / 0.17
    rim_z = lambda y: bz + 0.026 - k_rim * (y - by)
    hair = parts[C["hair"]]
    HV = np.array([tuple(hair.matrix_world @ v.co) for v in hair.data.vertices], np.float32)
    def cp_off(i, co, n):        # (kid A polish: fitted to the HEAD, 1.2 cm over the scalp; the hair is pressed under it)
        return 0.012
    def cp_off_old(i, co, n):
        p = np.array(tuple(basemesh.matrix_world @ co), np.float32); nn = np.array(tuple(n), np.float32)
        d = HV - p; along = d @ nn; lat = np.linalg.norm(d - np.outer(along, nn), axis=1)
        m = along[(lat < 0.02) & (along > -0.01)]
        return float(min(0.045, max(0.012, (m.max() if m.size else 0) + 0.005)))
    cp_region = lambda i: inbody[i] and dom[i] == "head" and P(i).z > rim_z(P(i).y) - 0.03
    rim_n = Vector((0, k_rim, 1)).normalized()
    cp_cuts = [(None, Vector((0, by, bz + 0.026)), -rim_n)]
    cp_uv = lambda f, co, i: cell_uv("cap", min(1, max(0, (co.x + 0.11) / 0.22)), 0.5)
    GEN["cap"] = band_tex(64, 8, [(0, 0.40, "cap"), (0.40, 0.60, "white"), (0.60, 1.01, "cap")], axis="u")
    if not R2:
        cap, _ = garment("kid_cap", me, cp_region, cp_off, cp_cuts, cp_uv, thick=0.003, smooth=3, hide_inner=False)
    else:
        # round 2: u round the crown (0.5 = the front, the seam at the back), v up from the rim to the button: the white
        # front panel is a real 6-panel cap's front panel (a wedge to the button), the sweatband rim thicker
        hc = bone_p("head")
        cap_ang = lambda p: (math.atan2(p.x - hc.x, -(p.y - hc.y)) / (2 * math.pi) + 0.5) % 1.0
        ctop = max(P(i).z for i in range(len(me.vertices)) if inbody[i] and dom[i] == "head") + 0.012
        def cp_uv2(f, co, i):
            us = wrap_u([cap_ang(v.co) for v in f.verts])
            k = min(range(len(f.verts)), key=lambda j: (f.verts[j].co - co).length)
            return cell_uv("cap", us[k], min(1, max(0, (co.z - rim_z(co.y)) / max(0.02, ctop - rim_z(co.y)))))
        wf = (15.0 / 360.0) / 1.1              # the front panel's half width: +-15 deg round the crown (u units / 1.1)
        A_ = np.zeros((256, 256, 4), np.float32); A_[..., 3] = 1
        for j in range(256):
            v_ = (j + 0.5) / 256; half_w = wf     # (a constant angle: the seams of a 6-panel cap meet at the button;
            #  the first try narrowed it with v, off the baked seams (kidLookBake.py, constant +-15 deg))
            for i_ in range(256):
                u_ = (i_ + 0.5) / 256
                cov = min(1.0, max(0.0, (half_w - abs(u_ - 0.5 / 1.1)) * 256 + 0.5))      # (anti-aliased edge: no stair-steps)
                A_[j, i_, :3] = np.array(COL["white"]) * cov + np.array(COL["cap"]) * (1 - cov)
        GEN["cap"] = A_
        cp_band = lambda p: 0.6 if p is None else (1.0 if p.z < rim_z(p.y) + 0.014 else 0.0)
        cp_cuts2 = cp_cuts + [(None, Vector((0, by, bz + 0.026 + 0.014)), -rim_n, lambda c, n: False)]
        cap, _ = garment("kid_cap", me, cp_region, cp_off, cp_cuts2, cp_uv2, thick=0.005, smooth=3, hide_inner=False, band=cp_band)
    rimv = [cap.matrix_world @ v.co for v in cap.data.vertices]
    low = [p for p in rimv if p.z < rim_z(p.y) + 0.012]
    yc = sum(p.y for p in low) / len(low)
    R = sum((p.x ** 2 + (p.y - yc) ** 2) ** 0.5 for p in low) / len(low)
    if R2:
        GEN["brim"] = band_tex(16, 32, [(0, 1.01, "navy")])
        GEN["lace"] = band_tex(32, 32, [(0, 1.01, "sock")])
    brims = [make_brim("kid_brim_f", yc, R, rim_z, +1), make_brim("kid_brim_b", yc, R, rim_z, -1)]
    extra = {}
    if R2:
        extra["kid_hairshell"] = hair_shell(me, dom, inbody, P, HV, rim_z, by, bz)
    # the hair under the cap is PRESSED onto the scalp (kid A polish: the cap sat on top of the hair, roomy and
    # high): every hair vertex above the rim line (+ a 1.5 cm band under it) is pulled back along the scalp's normal to
    # at most 8 mm off the skin, so the 1.2 cm cap covers it; the fringe below the rim stays as it falls
    from mathutils import kdtree
    sk = [i for i in range(len(me.vertices)) if inbody[i] and dom[i] in ("head", "neck_01")]
    kd = kdtree.KDTree(len(sk))
    for k, i in enumerate(sk): kd.insert(P(i), k)
    kd.balance()
    nrm = [basemesh.matrix_world.to_3x3() @ me.vertices[i].normal for i in sk]
    hw = hair.matrix_world; hwi = hw.inverted(); pressed = 0
    for v in hair.data.vertices:
        p = hw @ v.co
        if p.z < rim_z(p.y) - 0.015: continue
        co, k, _ = kd.find(p)
        n = nrm[k].normalized(); d = (p - co).dot(n)
        if d > 0.008: v.co = hwi @ (p - n * (d - 0.008)); pressed += 1
    print(f"hair pressed under the cap: {pressed} vertices")
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
    gone_t = [v for v in bm.verts if not (abs((tee.matrix_world @ v.co).x) < 0.042 and (tee.matrix_world @ v.co).y < spine_y)]
    bmesh.ops.delete(bm, geom=gone_t, context="VERTS")
    # (the tee strip kept 6 mm behind the jacket's flattened front, wherever it is: no poke-through at the zip)
    from mathutils import kdtree as _kdt
    JV = [jacket.matrix_world @ v.co for v in jacket.data.vertices]
    kdj = _kdt.KDTree(len(JV))
    for k, p_ in enumerate(JV): kdj.insert(p_, k)
    kdj.balance()
    tw0 = tee.matrix_world; tw0i = tw0.inverted()
    for v in bm.verts:
        p_ = tw0 @ v.co
        near = [co_ for co_, k_, d_ in kdj.find_n(p_, 8) if abs(co_.z - p_.z) < 0.03]
        if near:
            fy_ = min(c.y for c in near) + 0.010
            if p_.y < fy_: p_.y = fy_; v.co = tw0i @ p_
    if "y" in drape:     # (the tee strip stays 6 mm behind the jacket's hanging front: no poke-through at the zip)
        tw = tee.matrix_world; twi = tw.inverted()
        for v in bm.verts:
            p = tw @ v.co
            if p.z < drape["z"] and p.y < drape["y"] + 0.006:
                t = min(1.0, (drape["z"] - p.z) / 0.06); p.y = p.y + (drape["y"] + 0.006 - p.y) * t; v.co = twi @ p
    bm.to_mesh(tee.data); bm.free()
    # the shorts end 1.2 cm under the jacket's hem (kid A polish: their dark belt stood out of the hem in a ragged
    # band at the hips): a clean bisect, the new vertices' weights blended from their neighbours
    cut_above(parts[SHORTS], hem + 0.012)
    if "y" in drape:     # (the shorts' waistband under the hanging jacket: the same, so it cannot poke through the front)
        sh_o = parts[SHORTS]; tw = sh_o.matrix_world; twi = tw.inverted()
        for v in sh_o.data.vertices:
            p = tw @ v.co
            if p.z > hem - 0.02 and p.y < drape["y"] + 0.01:
                t = min(1.0, (p.z - (hem - 0.02)) / 0.03); p.y = p.y + (drape["y"] + 0.01 - p.y) * t; v.co = twi @ p
    if R2: shorts_r2(parts[SHORTS], hem + 0.012, bone_z("calf_l"), spine_y)
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
    inner_p = {i for i in range(len(me.vertices)) if inbody[i] and dom[i] in ("pelvis", "thigh_l", "thigh_r") and zc + 0.06 < P(i).z < pel + 0.06}
    delete_group(inner_j, "Delete.kid_jacket"); delete_group(inner_s, "Delete.kid_socks"); delete_group(inner_p, "Delete.kid_shorts")
    # cloth weights smoothed (the low-poly shorts' crotch and the jacket's shoulders stretched in strides / reaches)
    # the jacket hangs from the torso: 80 % of any thigh weight moves to the pelvis (kid A polish: with the hip sides in
    # the jacket, its hem folded with the thigh in every stride: the hip tear row 0.8 -> 1.6 %)
    gi = {g.name: g.index for g in jacket.vertex_groups}
    pg = jacket.vertex_groups["pelvis"]
    for v in jacket.data.vertices:
        moved = 0.0
        for e in v.groups:
            if e.group in (gi.get("thigh_l"), gi.get("thigh_r")):
                m = e.weight * 0.8; e.weight -= m; moved += m
        if moved > 0: pg.add([v.index], moved, "ADD")
    for o, rep in ((parts[SHORTS], 18), (jacket, 3)): smooth_weights(o, rep)
    print(f"outfit: jacket {len(jacket.data.polygons)} f, socks {len(socks.data.polygons)} f, cap {len(cap.data.polygons)} f, tee -{len(gone_t)} v, shoes -{len(gone2)} v")
    return {"kid_jacket": jacket, "kid_socks": socks, "kid_cap": cap, "kid_brim_f": brims[0], "kid_brim_b": brims[1], **extra}

# ------------------------------------------------------------------------------------------------ round 2: shapes
def fill_weights(bm):
    """vertices a bisect / extrude left without bone weights take the inverse-distance blend of their 4 nearest"""
    from mathutils import kdtree
    dl = bm.verts.layers.deform.active
    has = [v for v in bm.verts if len(v[dl]) > 0]
    kd = kdtree.KDTree(len(has))
    for k, v in enumerate(has): kd.insert(v.co, k)
    kd.balance()
    for v in bm.verts:
        if len(v[dl]) == 0:
            acc, tot = {}, 0.0
            for c, k, d in kd.find_n(v.co, 4):
                wk = 1.0 / max(d, 1e-4); tot += wk
                for gi, w in has[k][dl].items(): acc[gi] = acc.get(gi, 0.0) + w * wk
            for gi, w in acc.items(): v[dl][gi] = w / tot

def split_plane(bm, co, no, faces=None):
    """a support loop: the faces (all by default) split along a plane, nothing cleared"""
    geom_f = list(bm.faces) if faces is None else faces
    gv = {v for f in geom_f for v in f.verts}; ge = {e for f in geom_f for e in f.edges}
    bmesh.ops.bisect_plane(bm, geom=list(gv) + list(ge) + geom_f, plane_co=co, plane_no=no)

def shorts_r2(o, ztop, knee, spine_y):
    """the 90s shorts as SHAPES (round 2): a waistband (a support loop 3.2 cm under the top, the band 1.6 mm proud),
    slanted front pocket openings (a cut along the pocket line, the edge sunk 2.5 mm, the front panel's lip raised),
    and a turned-up hem CUFF (the hem's loop extruded out 3 mm, up 2.6 cm and back onto the leg: a real fold with
    thickness, crisp edges)"""
    from mathutils.bvhtree import BVHTree
    mw = o.matrix_world; mwi = mw.inverted()
    bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(mw)
    uvl = bm.loops.layers.uv.active
    split_plane(bm, Vector((0, 0, ztop - 0.032)), Vector((0, 0, 1)))
    bm.normal_update()
    for v in bm.verts:
        if v.co.z > ztop - 0.032: v.co += v.normal * 0.0016
    # the pockets: A at the waist, B on the side seam
    npk = 0
    for sx in (1, -1):
        A = Vector((sx * 0.062, 0, ztop - 0.006)); B = Vector((sx * 0.118, 0, ztop - 0.092))
        d = (B - A); L = d.length; d.normalize()
        n = Vector((d.z, 0, -d.x)).normalized()
        par = lambda p: (p - A).dot(d) / L
        bm.normal_update()
        fs = [f for f in bm.faces if f.normal.y < -0.25 and f.calc_center_median().x * sx > 0.02 and -0.08 < par(f.calc_center_median()) < 1.08]
        split_plane(bm, A, n, fs)
        bm.normal_update()
        for v in bm.verts:
            p = v.co
            if v.normal.y > -0.2 or p.x * sx < 0.02: continue
            t = par(p); dist = (p - A).dot(n)
            if not (-0.02 < t < 1.0): continue
            fade = min(1.0, (1.0 - t) / 0.1, (t + 0.02) / 0.05)
            if abs(dist) < 0.0015: v.co = p - v.normal * 0.0025 * fade; npk += 1
            elif 0 < dist * sx < 0.009:
                # the front panel's side of the line (toward the fly, under it): its folded edge stands 0.8 mm proud
                v.co = p + v.normal * 0.0008 * fade
    # the turn-up cuff on each leg's hem
    bm.normal_update()
    bvh = BVHTree.FromBMesh(bm)
    hem_e = [e for e in bm.edges if e.is_boundary and all(v.co.z < knee + 0.12 for v in e.verts)]
    src_uv = {}
    for e in hem_e:
        for v in e.verts:
            if v not in src_uv and v.link_loops: src_uv[v] = v.link_loops[0][uvl].uv.copy()
    sharp = []
    def legc(vs):
        return sum((v.co for v in vs), Vector()) / len(vs)
    for sx in (1, -1):
        ring0 = [e for e in hem_e if e.verts[0].co.x * sx > 0]
        if not ring0: continue
        vs0 = list({v for e in ring0 for v in e.verts}); c = legc(vs0)
        rad = {v: Vector((v.co.x - c.x, v.co.y - c.y, 0)).normalized() for v in vs0}
        fs0 = {f for e in ring0 for f in e.link_faces}
        sg = 1.0 if sum(f.normal.dot(Vector((f.calc_center_median().x - c.x, f.calc_center_median().y - c.y, 0))) for f in fs0) >= 0 else -1.0
        print(f"shorts leg {sx}: the MPFB faces point {'out' if sg > 0 else 'IN'}: the cuff wound the same way")
        def extrude(edges, move):
            res = bmesh.ops.extrude_edge_only(bm, edges=edges)
            nv = [g for g in res["geom"] if isinstance(g, bmesh.types.BMVert)]
            ne = [g for g in res["geom"] if isinstance(g, bmesh.types.BMEdge) and all(v in nv for v in g.verts)]
            nf = [g for g in res["geom"] if isinstance(g, bmesh.types.BMFace)]
            return nv, ne, nf
        org = {}
        # (one band from the hem's fold up and out, then its top edge back onto the leg: a first try with a separate
        # 3 mm bottom lip made long thin triangles that folded, kidTest's spike row)
        nv1, ne1, nf1 = extrude(ring0, None)
        for v in nv1:
            v0 = min(vs0, key=lambda q: (q.co - v.co).length); org[v] = v0
            v.co = v0.co + rad[v0] * 0.0026 + Vector((0, 0, 0.026))
        nv2, ne2, nf2 = extrude(ne1, None)
        for v in nv2:
            v1 = min(nv1, key=lambda q: (q.co - v.co).length); org[v] = org[v1]
            hit, nrm, _, _ = bvh.find_nearest(v1.co - rad[org[v1]] * 0.0026 + Vector((0, 0, 0.0015)))
            v.co = (hit + nrm * 0.0004) if hit is not None else v1.co - rad[org[v1]] * 0.0024
        for nf, want in ((nf1, lambda f: rad[org[f.verts[0]]] if f.verts[0] in org else rad[f.verts[0]]), (nf2, lambda f: Vector((0, 0, 1)))):
            for f in nf:
                f.normal_update()
                if f.normal.dot(want(f)) * sg < 0: bmesh.ops.reverse_faces(bm, faces=[f])
                for l in f.loops:
                    l[uvl].uv = src_uv.get(org.get(l.vert, l.vert), Vector((0.5, 0.05)))
        sharp += ring0            # (the fold at the bottom crisp; the cuff's top rolls soft)
    for e in sharp: e.smooth = False
    fill_weights(bm)
    bm.transform(mwi); bm.to_mesh(o.data); bm.free()
    print(f"shorts: waistband + pockets ({npk} edge vertices) + turn-up cuffs")

def hair_shell(me, dom, inbody, P, HV, rim_z, by, bz):
    """CHUNKY STYLISED HAIR VOLUME (round 2): an opaque shell on the scalp where the MPFB short01 cards grow (their
    footprint: the scalp within 1.4 cm of a card vertex), 4.5 mm off under the cap and 6 mm round the sides / nape;
    locks as grooves round the head, their tips pointed at the lower edge, the edge tapered onto the skin (a soft
    hairline, no step); the cards stay on top for the fluffy edge (alpha-tested, no extra layers)"""
    from mathutils import kdtree
    kh = kdtree.KDTree(len(HV))
    for k, p in enumerate(HV): kh.insert(Vector(tuple(p)), k)
    kh.balance()
    hc = bone_p("head"); nk = bone_z("neck_01")
    head_i = [i for i in range(len(me.vertices)) if inbody[i] and dom[i] == "head"]
    earx = max(abs(P(i).x) for i in head_i)
    ztop = max(P(i).z for i in head_i)
    def region(i):
        if not inbody[i] or dom[i] not in ("head", "neck_01"): return False
        p = P(i)
        if p.y < by + 0.03 and p.z < bz + 0.035: return False                    # the face / forehead
        if abs(p.x) > earx - 0.016 and p.z < bz + 0.02: return False              # the ears
        if p.z < bz - 0.01 and not (p.y > hc.y + 0.015 and p.z > nk + 0.03): return False   # below: only the nape
        return kh.find(p)[2] < 0.014
    def off(i, co, n):
        return 0.0045 if co.z > rim_z(co.y) - 0.004 else 0.006
    zlo = nk + 0.02
    ang = lambda p: (math.atan2(p.x - hc.x, -(p.y - hc.y)) / (2 * math.pi) + 0.5) % 1.0
    def uv_(f, co, i):
        us = [ang(v.co) for v in f.verts]
        if max(us) - min(us) > 0.5: us = [u + 1 if u < 0.5 else u for u in us]
        us = [min(1.0, u / 1.1) for u in us]
        k = min(range(len(f.verts)), key=lambda j: (f.verts[j].co - co).length)
        return cell_uv("hairshell", us[k], min(1, max(0, (co.z - zlo) / (ztop + 0.01 - zlo))))
    def post(bm):
        ring = {v: 0 for v in bm.verts if v.is_boundary}
        front = list(ring)
        for r in range(1, 4):
            nxt = []
            for v in front:
                for e in v.link_edges:
                    o_ = e.other_vert(v)
                    if o_ not in ring: ring[o_] = r; nxt.append(o_)
            front = nxt
        for v in bm.verts:
            p = v.co.copy(); n = v.normal
            a = math.atan2(p.x - hc.x, -(p.y - hc.y))
            r = ring.get(v, 4); taper = (0.12, 0.45, 0.72, 0.9, 1.0)[r]
            capped = p.z > rim_z(p.y) - 0.004
            base = 0.0045 if capped else 0.006
            lock = 0.0 if capped else 0.0013 * math.sin(a * 23 + 40 * p.z + 1.7 * math.sin(a * 5))
            v.co = p - n * base * (1 - taper) + n * lock * taper
            if r == 0 and not capped:
                v.co.z -= 0.0045 * max(0.0, math.sin(a * 17 + 0.6)) ** 2        # the locks' short pointed tips (8 mm x 12 read as drips)
    o, inner = garment("kid_hairshell", me, region, off, [], uv_, thick=0, smooth=2, post=post)
    # its colour cell: the hair's brown with strand streaks along the locks (sRGB, like COL)
    hcol = np.array([0x63, 0x43, 0x2a], np.float32) / 255 * 0.92
    x0, y0, w, h = CELLS["hairshell"]
    rr = np.random.default_rng(11)
    lat = rr.standard_normal(97).astype(np.float32)
    A_ = np.ones((h, w, 4), np.float32)
    for i_ in range(w):
        t = i_ / w * 96; k = int(t); fr = t - k
        s = lat[k] * (1 - fr) + lat[(k + 1) % 97] * fr
        A_[:, i_, :3] = hcol * (0.86 + 0.13 * np.tanh(s))
    vv = (np.arange(h) + 0.5) / h
    A_[..., :3] *= (1.0 - 0.1 * vv)[:, None, None]                                # (the tips not darker: dark tips read as drips)
    GEN["hairshell"] = A_
    # (the scalp under the shell: single skin vertices left between hidden ones made 12-tri islands of skin under the
    # cap: kidTest's stray-piece row) fill them: a vertex whose neighbours are all but one hidden goes too
    nbr = {}
    for e in me.edges:
        a, b = e.vertices; nbr.setdefault(a, set()).add(b); nbr.setdefault(b, set()).add(a)
    done = set(inner); isl = 0
    for i0 in head_i:          # every small island of skin left among the hidden scalp (< 24 vertices) goes too
        if i0 in done: continue
        comp, stack, seen = [], [i0], {i0}        # (a full flood per start: a capped one with a shared "seen" set
        while stack:                              #  cut the face into fake islands: black holes on the cheeks)
            i = stack.pop(); comp.append(i)
            for q in nbr.get(i, ()):
                if q not in seen and q not in inner: seen.add(q); stack.append(q)
        done |= seen
        if len(comp) < 24: inner |= set(comp); isl += 1
    print(f"hair shell: {isl} skin islands under it hidden")
    print(f"hair shell: {len(o.data.polygons)} faces, {len(inner)} scalp vertices hidden under it")
    delete_group(inner, "Delete.kid_hairshell")
    return o

def shoes_r2(o, arm, sock):
    """the sneakers as SHAPES (round 2), on the export copy's decimated shoe: the cupsole's lip (two support loops,
    the sole 2.4 mm proud of the upper), LACES (5 bars across the instep + the crosses, on the shoe's top surface) and a
    TONGUE rising out of the collar in front of the sock (4 mm thick, rounded top); the extras are new objects in the
    lace cell, joined into the shoes slot after the atlas"""
    from mathutils.bvhtree import BVHTree
    mw = o.matrix_world; mwi = mw.inverted()
    bm = bmesh.new(); bm.from_mesh(o.data); bm.transform(mw)
    for z_ in (0.0235, 0.0275): split_plane(bm, Vector((0, 0, z_)), Vector((0, 0, 1)))
    for sx in (1, -1):
        vs = [v for v in bm.verts if v.co.x * sx > 0]
        c = sum((v.co for v in vs), Vector()) / len(vs)
        for v in vs:
            if v.co.z < 0.0255:
                d = Vector((v.co.x - c.x, (v.co.y - c.y) * 0.35, 0))
                if d.length > 1e-4: v.co += d.normalized() * 0.0024 * (1.0 if v.co.z < 0.0235 else 0.6)
    fill_weights(bm)
    bm.transform(mwi); bm.to_mesh(o.data); bm.free()
    dg = bpy.context.evaluated_depsgraph_get()
    bvh = BVHTree.FromObject(o, dg)
    bvs = BVHTree.FromObject(sock, dg) if sock else None
    out = []
    for s in "lr":
        ank = arm.matrix_world @ arm.pose.bones[f"foot_{s}"].head
        ball = arm.matrix_world @ arm.pose.bones[f"ball_{s}"].head
        fd = Vector((ball.x - ank.x, ball.y - ank.y, 0)).normalized()
        across = Vector((fd.y, -fd.x, 0))
        bm = bmesh.new()
        dl = bm.verts.layers.deform.verify()
        tops = []
        for k, t in enumerate((0.18, 0.31, 0.44, 0.57, 0.70)):
            q = ball.lerp(ank, t)
            hit = None
            for dz in (0.0, 0.004, -0.004):
                h_, n_, _, _ = bvh.ray_cast(Vector((q.x, q.y + dz, 0.25)), Vector((0, 0, -1)))
                if h_ is not None and h_.z > 0.04: hit = (h_, n_); break
            if hit: tops.append((hit[0], hit[1].normalized()))
        def box(c, ax, up, L, Wd, Ht, w_ank):
            ax = ax.normalized(); side = up.cross(ax).normalized(); up = ax.cross(side).normalized()
            vv = []
            for a in (-0.5, 0.5):
                for b in (-0.5, 0.5):
                    for e in (0.0, 1.0):
                        p = c + ax * (a * L) + side * (b * Wd) + up * (e * Ht)
                        v = bm.verts.new(p); vv.append(v)
            F = [(0, 2, 6, 4), (1, 5, 7, 3), (0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6)]
            for f in F: bm.faces.new([vv[i] for i in f])
            return vv
        def on_top(p):
            """the shoe's top surface over p (a ray straight down), or None"""
            for dz in (0.0, 0.003, -0.003):
                h_, n_, _, _ = bvh.ray_cast(Vector((p.x, p.y + dz, 0.25)), Vector((0, 0, -1)))
                if h_ is not None and h_.z > 0.035: return h_, n_.normalized()
            return None
        def strip(a, b, wd, h0, h1, seg=6):
            """a lace: a closed flat cord from a to b FOLLOWING the shoe's top (each section ray-cast onto it), h0..h1 m
            over the surface, wd wide (round 1 of this used straight boxes: their ends sank into the curved upper)"""
            secs = []
            for k in range(seg + 1):
                p = a.lerp(b, k / seg); hit = on_top(p)
                if hit is None: return
                secs.append(hit)
            dirv = (b - a); dirv.z = 0; dirv.normalize()
            rings = []
            for h_, n_ in secs:
                side = n_.cross(dirv).normalized()
                rings.append([bm.verts.new(h_ + n_ * hh + side * (ss * wd / 2)) for hh, ss in ((h0, -1), (h0, 1), (h1, 1), (h1, -1))])
            for r0, r1 in zip(rings, rings[1:]):
                for q in range(4): bm.faces.new((r0[q], r0[(q + 1) % 4], r1[(q + 1) % 4], r1[q]))
            bm.faces.new(rings[0][::-1]); bm.faces.new(rings[-1])
        bars = []
        for h_, n_ in tops:
            c = h_ + n_ * 0.0012
            bars.append((c, n_))
            strip(h_ - across * 0.016, h_ + across * 0.016, 0.005, 0.0008, 0.0034)
        for (c1, n1), (c2, n2) in zip(bars, bars[1:]):
            for sgn in (1, -1):
                strip(c1 + across * (sgn * 0.013), c2 - across * (sgn * 0.013), 0.0042, 0.001, 0.0032, seg=4)
        # the tongue: from the top lace up to 1.6 cm over the collar, in front of the sock, its top rounded
        if bars:
            cb, nb = bars[-1]
            z0, z1 = cb.z - 0.004, C.get("shoe_collar", 0.105) + 0.016
            rows = []
            NRw, NCl = 9, 13       # (6 x 9 read faceted in a close-up)
            for j in range(NRw + 1):
                z = z0 + (z1 - z0) * j / NRw
                yf = None
                if bvs:
                    h_, _, _, _ = bvs.ray_cast(Vector((cb.x, cb.y - 0.25, z)), Vector((0, 1, 0)))
                    if h_ is not None: yf = h_.y
                h2, _, _, _ = bvh.ray_cast(Vector((cb.x, cb.y - 0.25, z)), Vector((0, 1, 0)))
                cand = [y for y in (yf, h2.y if h2 is not None and z < z1 - 0.012 else None) if y is not None]
                y = (min(cand) if cand else cb.y) - 0.0035 - 0.004 * (j / NRw) ** 2
                tj = j / NRw
                hw = 0.019 * (1 - 0.55 * max(0.0, (tj - 0.7) / 0.3) ** 2)
                row = []
                for i in range(NCl):
                    u = -1 + 2 * i / (NCl - 1)
                    xo = across * (u * hw)
                    p = Vector((cb.x, y, z)) + xo + Vector((0, 0.004 * u * u, 0))     # (curved round the shin)
                    row.append(bm.verts.new(p))
                rows.append(row)
            tv = []
            for j in range(NRw):
                for i in range(NCl - 1):
                    bm.faces.new((rows[j][i], rows[j + 1][i], rows[j + 1][i + 1], rows[j][i + 1]))
            tongue_vs = {v: j / NRw for j, row in enumerate(rows) for v in row}
        bm.verts.ensure_lookup_table()
        me2 = bpy.data.meshes.new(f"kid_shoeextra_{s}")
        # solidify the tongue only (the boxes are closed already)
        if bars:
            tf = [f for f in bm.faces if all(v in tongue_vs for v in f.verts)]
            ext = bmesh.ops.solidify(bm, geom=tf, thickness=0.004)
        uvl = bm.loops.layers.uv.new("UVMap")
        for f in bm.faces:
            for l in f.loops: l[uvl].uv = cell_uv("lace", 0.5, 0.5)
        bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
        bm.normal_update()
        bm.to_mesh(me2); bm.free()
        ob = bpy.data.objects.new(f"kid_shoeextra_{s}", me2); bpy.context.scene.collection.objects.link(ob)
        for g in o.vertex_groups: ob.vertex_groups.new(name=g.name)
        fg, cg = ob.vertex_groups[f"foot_{s}"], ob.vertex_groups.get(f"calf_{s}")
        for v in me2.vertices:
            # the tongue's top half follows the shin a little (no poke into the sock when the ankle bends)
            k = min(1.0, max(0.0, (v.co.z - 0.07) / 0.04)) * 0.85     # (the shin pushes it: mostly the calf's at the top)
            fg.add([v.index], 1.0 - k, "REPLACE")
            if k > 0 and cg: cg.add([v.index], k, "REPLACE")
        ob.parent = arm; ob.matrix_parent_inverse = arm.matrix_world.inverted()
        m = ob.modifiers.new("Armature", "ARMATURE"); m.object = arm
        out.append(ob)
        print(f"shoe {s}: {len(tops)} lace bars, tongue, {len(me2.polygons)} faces")
    return out

def make_brim(name, yc, R, rim_z, direction):
    """a D-shaped brim, 7 cm deep at the middle, curving down at the sides, 5 mm thick; direction +1 front, -1 back"""
    bm = bmesh.new()
    NA, NR = (17, 4) if not R2 else (41, 6)     # (round 2: 17 x 4 showed facets in a grazing light)
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
    ij = {v: (i, j) for j, row in enumerate(rows) for i, v in enumerate(row)}
    for f in bm.faces:
        for l in f.loops:
            if R2: i, j = ij[l.vert]; l[uvl].uv = cell_uv("brim", i / (NA - 1), j / NR)     # (2-D: its stitching rows baked)
            else: l[uvl].uv = cell_uv("jk_sleeve", 0.5, 0.95)       # (the navy of the cuffs)
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

SPINE = ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01"]
def respine(arm, meshes):
    """POSTURE (owner, 2026-11-26: "his shoulders are far backward, he looks like he has breasts"). Root cause: MPFB's
    spine joints sit low (pelvis -> spine_01 -> 02 -> 03: 8.0 / 6.2 / 5.1 cm, then spine_03 -> neck_01 27.8 cm) where
    the UAL's are spread up the back (9.7 / 8.9 / 10.2 / 12.4 cm). The clips' spine_03 / neck rotation (the Idle's 14 deg
    thoracic curve, the walk's sway) then pivoted his WHOLE chest about the bottom of the ribs: the chest pushed out,
    the shoulders thrown back behind it, the head poking forward. Fix: the joints moved up his own back curve to the
    UAL's arc-length fractions (pelvis 0, spine_01 .235, spine_02 .451, spine_03 .699, neck 1), and the torso's spine
    weights re-made along that curve (hat functions on the bones' middles; the neck's, clavicles', arms', legs' weights
    untouched)."""
    # (round 2 of the root cause: re-spacing the joints was not enough. The T-pose turns every bone onto its UAL
    # direction, and the UAL's spine joints follow ITS back curve (pelvis -> spine_01 14 deg forward, 7, -2, -2, the
    # neck 11 forward) while MPFB's run straight up his torso: turning them bent his trunk forward at the lower back,
    # the neck forward (the head poked out) and the clavicles back (the shoulders behind the torso). So the joints are
    # PLACED along the UAL's own curve, scaled to his torso, ending at his neck: the spine and clavicles then need no
    # turn at the T-pose (his torso keeps its own upright shape) and the clips' rotations mean the same.)
    U = lambda n: gl2b(REST[n]["p"])
    sel_only(arm); bpy.ops.object.mode_set(mode="EDIT")
    eb = arm.data.edit_bones
    P0, N0, H0 = eb["pelvis"].head.copy(), eb["neck_01"].head.copy(), eb["head"].head.copy()
    seg = [(eb[SPINE[i + 1]].head - eb[SPINE[i]].head).length for i in range(4)]
    chain = ["pelvis", "spine_01", "spine_02", "spine_03", "neck_01"]
    d = [U(chain[i + 1]) - U(chain[i]) for i in range(4)]
    sc = (N0.z - P0.z) / sum(x.z for x in d)
    pts = [P0.copy()]
    for x in d: pts.append(pts[-1] + x * sc)
    err = N0 - pts[-1]
    L = [0.0]
    for i in range(4): L.append(L[-1] + (pts[i + 1] - pts[i]).length)
    new = [pts[i] + err * (L[i] / L[-1]) for i in range(5)]
    for i in (1, 2, 3):
        eb[SPINE[i]].head = new[i]; eb[SPINE[i - 1]].tail = new[i]
    eb["spine_03"].tail = new[4]
    # the head joint: the UAL's neck -> Head direction at his neck length
    dh = (U("Head") - U("neck_01")).normalized()
    eb["head"].head = N0 + dh * (H0 - N0).length; eb["neck_01"].tail = eb["head"].head
    # the clavicles: his shoulder joints stay; the clavicle's root placed so it already points the UAL's way
    for sd in "lr":
        c, u = eb[f"clavicle_{sd}"], eb[f"upperarm_{sd}"]
        dc = (U(f"upperarm_{sd}") - U(f"clavicle_{sd}")).normalized()
        Lc = (u.head - c.head).length
        c.head = u.head - dc * Lc; c.tail = u.head.copy()
    bpy.ops.object.mode_set(mode="OBJECT")
    print("respine: segments", [round(x, 3) for x in seg], "->", [round((new[i + 1] - new[i]).length, 3) for i in range(4)],
          "neck error", round(err.length, 3))
    # the re-weighting: each vertex's pelvis + spine weight (its share) spread along the new joints by its height on
    # the curve (projected on the polyline): hat functions centred on the bones' middles
    mw = arm.matrix_world
    P = [mw @ p for p in new]
    mids = [(P[i] + P[i + 1]) * 0.5 for i in range(4)]            # pelvis, spine_01, spine_02, spine_03
    def param(p):                                                     # arc parameter of p on the polyline of middles
        best, bt, acc = None, 0.0, 0.0
        for i in range(3):
            a, b = mids[i], mids[i + 1]; ab = b - a; L = ab.length
            t = max(0.0, min(1.0, (p - a).dot(ab) / (L * L)))
            d = (a + ab * t - p).length
            if best is None or d < best: best, bt = d, i + t
            if (p - a).dot(ab) < 0 and i == 0: bt_low = True
        # below the pelvis middle / above the spine_03 middle: clamp
        if (p - mids[0]).dot(mids[1] - mids[0]) < 0: return 0.0
        if (p - mids[3]).dot(mids[3] - mids[2]) > 0: return 3.0
        return bt
    for o in meshes:
        gi = {g.name: g.index for g in o.vertex_groups}
        if not all(n in gi for n in SPINE[:4]): continue
        idx = [gi[n] for n in SPINE[:4]]; groups = [o.vertex_groups[n] for n in SPINE[:4]]
        om = o.matrix_world
        for v in o.data.vertices:
            share = 0.0
            for e in v.groups:
                if e.group in idx: share += e.weight
            if share <= 1e-4: continue
            t = param(om @ v.co); k = min(2, int(t)); f = t - k
            w = [0.0] * 4; w[k] = (1 - f) * share; w[k + 1] = f * share
            for gidx_, wt in zip(range(4), w):
                if wt > 1e-4: groups[gidx_].add([v.index], wt, "REPLACE")
                else: groups[gidx_].remove([v.index])

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
if R2:
    # round 2: the 1-D strips became 2-D cells (u = round the limb / crown, v = along it), so kidLookBake.py bakes
    # their folds, ribs and seams (round 1 computed them in the material: no texels to bake into)
    CELLS.update({"jk_sleeve": (1664, 0, 128, 256), "socks": (1792, 0, 128, 256), "cap": (768, 0, 256, 256),
                  "brim": (1920, 0, 128, 256), "hairshell": (1408, 64, 256, 192), "lace": (1408, 0, 32, 32)})
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
        if n.startswith("kid_hairshell"): return "+hair", "hairshell"     # (round 2: joined into the hair slot after the atlas)
        return None, None
    slots = {}
    extras = []                      # (object, the slot it joins after the atlas: its UVs are atlas UVs already)
    for o in meshes:
        s, cell = slot_of(o)
        if s is None: print("dropped", o.name); bpy.data.objects.remove(o); continue
        if s.startswith("+"): extras.append((o, s[1:])); continue
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
    # the KNEE MARKS (owner): the socks were built on the full-resolution leg, the skin is then decimated (its facets sit
    # a few mm inside the old surface): a dark gap showed between the sock's top and the leg. The cuff (the top 2.5 cm)
    # is snapped onto the DECIMATED skin, 1 mm out, both shells: it grips the leg as drawn
    if "socks" in slots and "skin" in slots and "s_hi" in GARM:
        from mathutils.bvhtree import BVHTree
        sk_o, so = slots["skin"][0], slots["socks"][0]
        dg = bpy.context.evaluated_depsgraph_get()
        bvh = BVHTree.FromObject(sk_o, dg)
        n_s = 0
        for v in so.data.vertices:
            if v.co.z < GARM["s_hi"] - 0.025: continue
            hit, nrm, _, dist = bvh.find_nearest(v.co)
            if hit is not None and dist < 0.03:
                t = min(1.0, (v.co.z - (GARM["s_hi"] - 0.025)) / 0.012)
                # (round 2: the rib keeps its thickness: the outer shell 2.4 mm out, the inner 0.6 mm; round 1 put
                # both shells at 1 mm, a paper-thin top edge)
                gap = 0.001 if not R2 else (0.0024 if v.normal.dot(nrm) > 0 else 0.0006)
                v.co = v.co.lerp(hit + nrm * gap, t); n_s += 1
        print(f"sock cuffs snapped to the decimated leg: {n_s} vertices")
    if R2 and "shoes" in slots:
        extras += [(ob, "shoes") for ob in shoes_r2(slots["shoes"][0], arm, slots["socks"][0] if "socks" in slots else None)]
    # UV layers: one "UVMap" each
    for o in meshes:
        uvs = o.data.uv_layers
        if not len(uvs): uvs.new(name="UVMap")
        act = uvs.active
        for u in [u for u in uvs if u != act]: uvs.remove(u)
        uvs.active.name = "UVMap"
    atlas = build_atlas(slots)
    # (round 2) the extras join their slot's object now that its UVs are in the atlas (theirs already are)
    for ob, s in extras:
        tgt = slots[s][0]
        if ob.data.shape_keys or tgt.data.shape_keys:
            for x in (ob, tgt):
                if x.data.shape_keys: sel_only(x); bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
        for x in (ob, tgt):      # (the masks / helpers baked before the join: only the armature may stay)
            sel_only(x)
            for m in [m for m in x.modifiers if m.type != "ARMATURE"]: bpy.ops.object.modifier_apply(modifier=m.name)
        uvs = ob.data.uv_layers
        for u in [u for u in uvs if u != uvs.active]: uvs.remove(u)
        uvs.active.name = "UVMap"
        for g in tgt.vertex_groups:
            if g.name not in ob.vertex_groups: ob.vertex_groups.new(name=g.name)
        nm_ = ob.name
        sel_only(tgt); ob.select_set(True); bpy.context.view_layer.objects.active = tgt
        nv0 = len(tgt.data.vertices)
        bpy.ops.object.join()
        for p in tgt.data.polygons: p.material_index = 0
        if s == "shoes":      # the laces / tongue get weighted normals (hard-surface parts), the shoe's body not
            WN.setdefault(s, set()).update(range(nv0, len(tgt.data.vertices)))
        print(f"joined {nm_} into {s} (+{len(tgt.data.vertices) - nv0} vertices)")
    meshes = [o for o, _ in slots.values()]
    # the spine re-jointed to the UAL's proportions (+ the torso re-weighted), then the T-pose + bind
    respine(arm, meshes)
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
    if R2:
        # WEIGHTED NORMALS on the hard-ish garment parts (the brims, the cap, the jacket, the socks, the laces /
        # tongue): their flat panels shade flat and the thick rims round off cleanly (rule no-bad-shading-topology);
        # the skin, hair and the MPFB cloth keep their own smooth normals
        for s in ("jacket", "socks", "cap", "brim_f", "brim_b", "shoes"):
            if s not in slots: continue
            o = slots[s][0]; g = o.vertex_groups.new(name="_wn")
            idx = sorted(WN[s]) if s in WN else list(range(len(o.data.vertices)))
            if idx: g.add(idx, 1.0, "REPLACE")
    sel_only(meshes[0])
    for o in meshes[1:]: o.select_set(True)
    bpy.context.view_layer.objects.active = slots["skin"][0]
    bpy.ops.object.join()
    kid = bpy.context.active_object; kid.name = "kid_LOD0"
    if R2:
        bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode="OBJECT")
        wn = kid.modifiers.new("wn", "WEIGHTED_NORMAL"); wn.mode = "FACE_AREA"; wn.weight = 50; wn.keep_sharp = True
        wn.vertex_group = "_wn"
        bpy.ops.object.modifier_move_to_index(modifier="wn", index=0)
        bpy.ops.object.modifier_apply(modifier="wn")
        kid.vertex_groups.remove(kid.vertex_groups["_wn"])
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.vertex_group_limit_total(group_select_mode="ALL", limit=4)
    bpy.ops.object.vertex_group_normalize_all(group_select_mode="ALL", lock_active=False)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.mesh.quads_convert_to_tris(); bpy.ops.object.mode_set(mode="OBJECT")
    T0 = len(kid.data.polygons)
    print(f"LOD0 {T0} tris, slots {[m.name for m in kid.data.materials]}")
    bake_ao(kid)
    lods = [kid]
    for i, target in (((1, 8000), (2, 2000)) if not R2 else LOD_R2):
        o = kid.copy(); o.data = kid.data.copy(); o.name = f"kid_LOD{i}"; bpy.context.scene.collection.objects.link(o)
        for m in list(o.modifiers): o.modifiers.remove(m)
        sel_only(o)
        if R2:      # (the weighted normals are LOD0's: a collapse would smear them; the LODs take smooth ones)
            try: bpy.ops.mesh.customdata_custom_splitnormals_clear()
            except Exception as e: print("custom normals clear:", e)
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
    if R2:      # (kidLookBake.py bakes the 2-D garment cells from these: the round's layout)
        rigj["look"] = "r2"; rigj["cells"] = CELLS; rigj["sockRib"] = GARM.get("rib0")
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
    d[:, :3] = 0.35 + 0.65 * d[:, :3]
    if R2:
        # (round 2: the white tee strip in the open zip sat in a 1 cm slot behind the jacket: its AO near the 0.35 floor
        # drew a black stripe down his front in every look; a soft floor of 0.62 on the tee keeps it white in the shade)
        ti = next((k for k, m in enumerate(o.data.materials) if m and m.name.startswith("tee")), None)
        if ti is not None:
            tv = {v for p in o.data.polygons if p.material_index == ti for v in p.vertices}
            for v in tv: d[v, :3] = np.maximum(d[v, :3], 0.62)
    ca.data.foreach_set("color", d.ravel())

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
