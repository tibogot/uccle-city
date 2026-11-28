"""
KID CANDIDATES from MakeHuman's MPFB (docs/KIDCHAR.md, phase 1: candidates for the owner to choose; no integration yet).

Blender 5.0 headless, MPFB 2.0.18 (extensions.blender.org / github.com/makehumancommunity/mpfb2) + the CC0 asset packs
makehuman_system_assets, hair01, shirts01, pants01 (static.makehumancommunity.org; unpacked into MPFB's user data dir).

    blender -b --factory-startup -P tools/blender/kidMakeHuman.py -- --cand a [--renders DIR] [--probe]

One candidate per run (a / b / c, the table CANDS below): an ~11-year-old white boy (MakeHuman age 0.1875 = 11 years,
gender 1, caucasian 1), the height set by the height macro to the target (~1.45 m), face targets per candidate, the
young_caucasian_male skin (GAMEENGINE material: one Principled BSDF per object), the game_engine rig (Unreal-mannequin
bone names: pelvis, spine_01..03, neck_01, head, clavicle_l, upperarm_l, ...: the UAL clips' names), low-poly eyes,
eyebrows, eyelashes, a hairstyle, a plain tee, jeans shorts, sneakers. The body faces under the clothes are deleted (the
assets' own delete groups), the images scaled to <= 1024 px, the export copy baked (shape keys + masks) and written as
models/kid/candidates/kid_<c>.raw.glb (tools/kid/kidCandPack.mjs makes the meshopt + KTX2 kid_<c>.glb from it).
--renders DIR: Cycles (OPTIX) renders front / q34 / side / face of the candidate in an A-pose into DIR.
"""
import bpy, sys, os, json, math, importlib, addon_utils
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(name, default=None):
    return argv[argv.index(name) + 1] if name in argv else default
CAND = arg("--cand", "a")
RENDERS = arg("--renders")
PROBE = "--probe" in argv
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "models", "kid", "candidates")

# ------------------------------------------------------------------------------------------------ the candidates
# targets: MPFB's bundled modelling targets (data/targets/<group>/<name>.target.gz) with a weight; L/R pairs as "l-|r-"
CANDS = {
    "a": {  # short messy hair, a round open face, a small upturned nose, blue eyes
        "label": "A: short tousled", "height": 1.44, "weight": 0.48, "muscle": 0.45, "proportions": 0.5,
        "hair": "short01", "hair_tint": (0.36, 0.25, 0.15), "eyes": "blue", "brows": "eyebrow010",
        "targets": {"head/head-round": 0.35, "nose/nose-point-up": 0.35, "nose/nose-scale-horiz-decr": 0.15,
                    "cheek/l-cheek-volume-incr|cheek/r-cheek-volume-incr": 0.25, "chin/chin-width-decr": 0.15,
                    "mouth/mouth-scale-horiz-decr": 0.1, "eyes/l-eye-scale-incr|eyes/r-eye-scale-incr": 0.15,
                    "mouth/mouth-angles-up": 0.3},
        "shirt": "elvs_crude_t-shirt_male", "shirt_tint": (0.95, 0.75, 0.18), "shorts_tint": (0.56, 0.50, 0.36), "shoes": "shoes05"},
    "b": {  # side-parted, an oval face, a straighter longer nose, brown eyes, a little taller and leaner
        "label": "B: side-parted", "height": 1.47, "weight": 0.42, "muscle": 0.45, "proportions": 0.55,
        "hair": "short02", "hair_tint": None, "eyes": "brown", "brows": "eyebrow006",
        "targets": {"head/head-oval": 0.45, "nose/nose-scale-vert-incr": 0.2, "nose/nose-point-width-decr": 0.2,
                    "chin/chin-prominent-incr": 0.2, "chin/chin-height-incr": 0.1,
                    "eyebrows/eyebrows-angle-down": 0.2, "mouth/mouth-lowerlip-volume-incr": 0.15, "mouth/mouth-angles-up": 0.2},
        "shirt": "namuhekam_male_polo_shirt", "shirt_tint": (0.78, 0.18, 0.16), "shorts_tint": (0.25, 0.33, 0.48), "shoes": "shoes06"},
    "c": {  # 90s curtains (middle-parted, longer), a squarer face, wider jaw, green-blue eyes, freckly feel
        "label": "C: 90s curtains (longer)", "height": 1.45, "weight": 0.52, "muscle": 0.5, "proportions": 0.5,
        "hair": "sonntag78_junglebook_hair", "hair_tint": (0.60, 0.46, 0.27), "eyes": "bluegreen", "brows": "eyebrow001",
        "targets": {"head/head-square": 0.3, "chin/chin-width-incr": 0.2, "nose/nose-scale-horiz-incr": 0.1,
                    "nose/nose-flaring-incr": 0.1, "mouth/mouth-scale-horiz-incr": 0.1,
                    "eyes/l-eye-trans-out|eyes/r-eye-trans-out": 0.1, "forehead/forehead-scale-vert-incr": 0.2,
                    "mouth/mouth-angles-up": 0.3}, "hair_trim": 0.015, "fringe_v": 0.03, "scalp": True, "hair_ratio": 0.6,
        "shirt": "elvs_crude_t-shirt_male", "shirt_tint": (0.18, 0.52, 0.55), "shorts_tint": (0.33, 0.35, 0.27), "shoes": "shoes05"},
}
# A v2 (the owner's pick, 2026-11-25: "A is cool but we will still have to fine tune it"): a relaxed smile, fuller
# cheeks, the 90s outfit (kidGame.py: windbreaker, high socks, cap; white tee, knee shorts, chunky white sneakers)
CANDS["a2"] = dict(CANDS["a"], label="A v2", targets=dict(CANDS["a"]["targets"], **{
    "mouth/mouth-angles-up": 0.5, "cheek/l-cheek-volume-incr|cheek/r-cheek-volume-incr": 0.45,
    "cheek/l-cheek-bones-decr|cheek/r-cheek-bones-decr": 0.15, "mouth/mouth-laugh-lines-in": 0.15,
    "eyes/l-eye-bag-decr|eyes/r-eye-bag-decr": 0.3}),
    shirt_tint=(0.93, 0.93, 0.90), shorts_tint=(0.58, 0.52, 0.38), shoes_tint=(0.95, 0.95, 0.93), hair_tint=(0.38, 0.26, 0.16),
    shorts_above_knee=0.01)
C = CANDS[CAND]
GAME = "--game" in argv
if GAME and CAND == "a2" and "--r1" not in argv:
    # ROUND 2 of the kid look (docs/KIDCHAR.md phase 7): a friendlier, more alive face in the same style: a little
    # larger, more open eyes with the outer corners up, brows raised, a shorter softer nose (younger), fuller lips with
    # a stronger smile at the corners and a cupid's bow, ears a touch bigger and out (a kid's)
    C = dict(C, targets=dict(C["targets"], **{
        "eyes/l-eye-scale-incr|eyes/r-eye-scale-incr": 0.3, "eyes/l-eye-height2-incr|eyes/r-eye-height2-incr": 0.25,
        "eyes/l-eye-corner1-up|eyes/r-eye-corner1-up": 0.2, "eyebrows/eyebrows-trans-up": 0.15, "eyebrows/eyebrows-angle-up": 0.2,
        "nose/nose-scale-vert-decr": 0.2, "nose/nose-volume-decr": 0.1, "nose/nose-point-up": 0.45,
        "mouth/mouth-angles-up": 0.65, "mouth/mouth-lowerlip-volume-incr": 0.25, "mouth/mouth-upperlip-volume-incr": 0.15,
        "mouth/mouth-cupidsbow-incr": 0.3, "mouth/mouth-dimples-in": 0.2,
        "ears/l-ear-flap-incr|ears/r-ear-flap-incr": 0.25, "ears/l-ear-scale-incr|ears/r-ear-scale-incr": 0.12}))
SHORTS = "cortu_cargo_pants"     # cut to knee-length 90s shorts (cut_shorts below); cortu_jeans_shorts are hot pants on a kid
AGE_11 = 0.1875          # MakeHuman's age macro: 0 = 1 year, 0.1875 = 11 years, 0.5 = 25 years, 1 = 90 years
MAX_TEX = 1024

# ------------------------------------------------------------------------------------------------ MPFB
bpy.ops.wm.read_factory_settings(use_empty=True)
mods = [m.__name__ for m in addon_utils.modules() if m.__name__.endswith(".mpfb")]
assert mods, "MPFB is not installed (docs/KIDCHAR.md: install from extensions.blender.org)"
bpy.ops.preferences.addon_enable(module=mods[0])
def mpfb(path, key):
    return getattr(importlib.import_module(mods[0] + "." + path), key)
HumanService = mpfb("services.humanservice", "HumanService")
TargetService = mpfb("services.targetservice", "TargetService")
AssetService = mpfb("services.assetservice", "AssetService")
LocationService = mpfb("services.locationservice", "LocationService")
ExportService = mpfb("services.exportservice", "ExportService")
ObjectService = mpfb("services.objectservice", "ObjectService")
HumanObjectProperties = mpfb("entities.objectproperties", "HumanObjectProperties")
print("MPFB", mods[0], "user data", LocationService.get_user_data())

def body_height(basemesh):
    """the body's height (m), helpers excluded (the 'body' vertex group), shape keys evaluated"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = basemesh.evaluated_get(dg)
    zs = [(basemesh.matrix_world @ v.co).z for v in ev.data.vertices]
    return max(zs) - min(zs), min(zs)

def macro(height):
    return {"gender": 1.0, "age": AGE_11, "muscle": C["muscle"], "weight": C["weight"], "proportions": C["proportions"],
            "height": height, "cupsize": 0.5, "firmness": 0.5, "race": {"asian": 0.0, "caucasian": 1.0, "african": 0.0}}

# the height macro: a few secant steps to the target (the mesh with the 'Hide helpers' mask = the body only)
h_lo, h_hi = 0.2, 0.8
basemesh = None
def build(hm):
    global basemesh
    for o in list(bpy.data.objects): bpy.data.objects.remove(o, do_unlink=True)
    basemesh = HumanService.create_human(macro_detail_dict=macro(hm))
    return body_height(basemesh)[0]
hm = 0.5
H = build(hm)
for it in range(4):
    if abs(H - C["height"]) < 0.004: break
    # local slope from a second sample
    H2 = build(hm + 0.05)
    slope = (H2 - H) / 0.05 or 0.3
    hm = min(1.0, max(0.0, hm + (C["height"] - H) / slope))
    H = build(hm)
print(f"height macro {hm:.3f} -> {H:.3f} m (target {C['height']})")

# face targets
TROOT = LocationService.get_mpfb_data("targets")
for k, w in C["targets"].items():
    for t in k.split("|"):
        TargetService.load_target(basemesh, os.path.join(TROOT, *t.split("/")) + ".target.gz", weight=w)
H, zmin = body_height(basemesh)
if abs(zmin) > 1e-4:                # targets can move the soles: feet back on the ground
    basemesh.location.z -= zmin
    bpy.context.view_layer.objects.active = basemesh
    basemesh.select_set(True)
    bpy.ops.object.transform_apply(location=True, rotation=False, scale=False)
print(f"after face targets: {H:.3f} m")

def asset(subdir, name):
    p = AssetService.find_asset_absolute_path(name + (".mhclo" if subdir != "skins" else ".mhmat"), asset_subdir=subdir)
    if p is None: raise RuntimeError(f"asset {subdir}/{name} not found: install the CC0 packs (docs/KIDCHAR.md)")
    return p

HumanService.set_character_skin(asset("skins", "young_caucasian_male"), basemesh, skin_type="GAMEENGINE")
HumanService.add_builtin_rig(basemesh, "game_engine")
rig = ObjectService.find_object_of_type_amongst_nearest_relatives(basemesh, "Skeleton")
parts = {}
for sub, nm, atype in [("eyes", "low-poly", "Eyes"), ("eyebrows", C["brows"], "Eyebrows"), ("eyelashes", "eyelashes01", "Eyelashes"),
                       ("hair", C["hair"], "Hair"), ("clothes", C["shirt"], "Clothes"), ("clothes", SHORTS, "Clothes"),
                       ("clothes", C["shoes"], "Clothes")]:
    parts[nm] = HumanService.add_mhclo_asset(asset(sub, nm), basemesh, asset_type=atype, material_type="GAMEENGINE", subdiv_levels=0)

# 90s shorts: the cargo pants cut just above the knee; the body's delete group (the skin hidden under the pants) shrunk
# to the same line (minus an overlap) so the shins come back
def cut_shorts(pants, above_knee=None, overlap=0.03):
    above_knee = C.get("shorts_above_knee", 0.035) if above_knee is None else above_knee
    import bmesh
    knee = min((rig.matrix_world @ rig.pose.bones[f"calf_{s}"].head).z for s in "lr")
    zc = knee + above_knee
    bm = bmesh.new(); bm.from_mesh(pants.data)
    mw = pants.matrix_world
    gone = [v for v in bm.verts if (mw @ v.co).z < zc]
    bmesh.ops.delete(bm, geom=gone, context="VERTS")
    bm.to_mesh(pants.data); bm.free(); pants.data.update()
    g = basemesh.vertex_groups.get("Delete." + SHORTS)
    if g:
        g.remove([v.index for v in basemesh.data.vertices if (basemesh.matrix_world @ v.co).z < zc - overlap])
    print(f"shorts cut at {zc:.3f} m (knee {knee:.3f}), {len(gone)} vertices off")
cut_shorts(parts[SHORTS])

def hair_fix(hair):
    """short hair rides the head rigidly (one bone: no stretching at the nape); "fringe_v": the fringe opened in an
    inverted V at the middle (curtains: `fringe_v` m over the brows at the middle, down to the brows at the temples);
    "hair_trim": longer hair cut to a length. (Tried and dropped: mirroring short03's side-swept half for a middle part:
    its cards cross the midline, the part came out torn.)"""
    import bmesh
    if C.get("fringe_v"):
        brows = parts[C["brows"]]
        bz = sum((brows.matrix_world @ v.co).z for v in brows.data.vertices) / len(brows.data.vertices)
        by = min((brows.matrix_world @ v.co).y for v in brows.data.vertices)
        mw = hair.matrix_world
        bm = bmesh.new(); bm.from_mesh(hair.data)
        cut = [v for v in bm.verts if (mw @ v.co).y < by + 0.03 and
               (mw @ v.co).z < bz + max(0.0, C["fringe_v"] - abs((mw @ v.co).x) * 0.7)]
        bmesh.ops.delete(bm, geom=cut, context="VERTS")
        bm.to_mesh(hair.data); bm.free(); hair.data.update()
        print(f"fringe opened: {len(cut)} vertices off")
    if C.get("hair_trim") is not None:
        # longer hair cut to a length: everything under (the head bone's base + trim) goes (the jungle-book mop -> a
        # chin-length 90s curtains cut)
        zc = (rig.matrix_world @ rig.pose.bones["head"].head).z + C["hair_trim"]
        bm = bmesh.new(); bm.from_mesh(hair.data)
        gone = [v for v in bm.verts if (hair.matrix_world @ v.co).z < zc]
        bmesh.ops.delete(bm, geom=gone, context="VERTS")
        bm.to_mesh(hair.data); bm.free(); hair.data.update()
        print(f"hair cut at {zc:.3f} m: {len(gone)} vertices off")
    for g in list(hair.vertex_groups):
        if g.name != "head": hair.vertex_groups.remove(g)
    g = hair.vertex_groups.get("head") or hair.vertex_groups.new(name="head")
    g.add(list(range(len(hair.data.vertices))), 1.0, "REPLACE")

def tuck_pants(pants, shirt, over=0.02):
    """the tee hangs over the shorts: the shorts' waistband above the tee's hem (+ an overlap) is deleted (it poked
    through the hem in a zigzag)"""
    import bmesh
    me = shirt.data
    cnt = {}
    for e in me.edges:
        cnt[e.key] = 0
    for p in me.polygons:
        for k in p.edge_keys: cnt[k] += 1
    hip = (rig.matrix_world @ rig.pose.bones["pelvis"].head).z
    hem = [ (shirt.matrix_world @ me.vertices[i].co).z for k, n in cnt.items() if n == 1 for i in k
            if (shirt.matrix_world @ me.vertices[i].co).z < hip + 0.25]
    top = max(hem) if hem else hip + 0.1
    bm = bmesh.new(); bm.from_mesh(pants.data)
    gone = [v for v in bm.verts if (pants.matrix_world @ v.co).z > top + over]
    bmesh.ops.delete(bm, geom=gone, context="VERTS")
    # under the hem the waistband is drawn in (8 mm along its normal): no poke-through of the shorts at the hem
    bm.normal_update()
    low = min(hem) if hem else top
    for v in bm.verts:
        if (pants.matrix_world @ v.co).z > low - 0.015: v.co -= v.normal * 0.008
    bm.to_mesh(pants.data); bm.free(); pants.data.update()
    print(f"shorts tucked under the tee: hem top {top:.3f} m, {len(gone)} vertices off")
tuck_pants(parts[SHORTS], parts[C["shirt"]])

hair_fix(parts[C["hair"]])

def scalp(rgb):
    """a scalp shell under the hair (the head's skin above a hairline, 2.5 mm out, the hair's mean colour darkened,
    rigid on the head): the mirrored hairstyle's cards leave gaps at the part where the bald skin showed"""
    import bmesh
    brows = parts[C["brows"]]
    bz = sum((brows.matrix_world @ v.co).z for v in brows.data.vertices) / len(brows.data.vertices)
    by = min((brows.matrix_world @ v.co).y for v in brows.data.vertices)
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(basemesh.evaluated_get(dg))
    bm = bmesh.new(); bm.from_mesh(me)
    mw = basemesh.matrix_world
    def above(v):
        p = mw @ v.co
        t = min(1.0, max(0.0, (p.y - by) / 0.17))
        return p.z > bz + 0.045 - t * 0.075 and abs(p.x) < 0.085
    keep = {f for f in bm.faces if all(above(v) for v in f.verts)}
    bmesh.ops.delete(bm, geom=[f for f in bm.faces if f not in keep], context="FACES")
    bmesh.ops.delete(bm, geom=[v for v in bm.verts if not v.link_faces], context="VERTS")
    bm.normal_update()
    for v in bm.verts: v.co += v.normal * 0.0025
    bm.to_mesh(me); bm.free()
    me.materials.clear()
    mat = bpy.data.materials.new("scalp"); mat.use_nodes = True
    mat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*[c * 0.5 for c in rgb], 1)
    mat.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.8
    me.materials.append(mat)
    for vg in []: pass
    o = bpy.data.objects.new(basemesh.name + ".scalp", me)
    bpy.context.scene.collection.objects.link(o)
    o.matrix_world = mw.copy()
    o.parent = rig; o.matrix_parent_inverse = rig.matrix_world.inverted()
    g = o.vertex_groups.new(name="head"); g.add(list(range(len(me.vertices))), 1.0, "REPLACE")
    m = o.modifiers.new("Armature", "ARMATURE"); m.object = rig
    print(f"scalp shell: {len(me.polygons)} faces")
if C.get("scalp"): scalp([c ** 2.2 for c in C["hair_tint"]])

# the eye colour: MPFB's low-poly eyes take an iris texture by material (eyes/materials/<colour>.mhmat)
try:
    eyes = parts["low-poly"]
    em = AssetService.find_asset_absolute_path(C["eyes"] + ".mhmat", asset_subdir="eyes")
    if em:
        MhMaterial = mpfb("entities.material.mhmaterial", "MhMaterial")
        NWGE = mpfb("entities.nodemodel.v2.materials.nodewrappergameengine", "NodeWrapperGameEngine")
        mat = eyes.data.materials[0]
        for n in list(mat.node_tree.nodes): mat.node_tree.nodes.remove(n)
        mh = MhMaterial(); mh.populate_from_mhmat(em)
        NWGE.create_instance(mat.node_tree, mhmat=mh)
        print("eyes", C["eyes"])
except Exception as e:
    print("eye colour kept (", e, ")")

# ------------------------------------------------------------------------------------------------ measures
def head_ratio():
    """height / head height: crown (top of the body mesh) to the chin (the lowest body vertex in front of the neck,
    above the neck bone's head: the jaw line)"""
    dg = bpy.context.evaluated_depsgraph_get()
    ev = basemesh.evaluated_get(dg)
    neck = rig.pose.bones.get("neck_01") or rig.pose.bones.get("neck")
    head = rig.pose.bones.get("head")
    hz = (rig.matrix_world @ head.head).z
    nz = (rig.matrix_world @ neck.head).z
    vs = [basemesh.matrix_world @ v.co for v in ev.data.vertices]
    top = max(v.z for v in vs)
    ys = [v.y for v in vs if v.z > hz]          # the front of the face (Blender front = -Y)
    front = min(ys)
    chin = min(v.z for v in vs if nz < v.z < hz + 0.05 and v.y < front + 0.06 and abs(v.x) < 0.03)
    return H / (top - chin), top - chin
ratio, hh = head_ratio()
print(f"MEASURE height {H:.3f} m head {hh:.3f} m ratio 1/{ratio:.2f}")

def tint(obj, rgb, soft=None):
    """recolour the asset's base-colour texture: its luminance (normalised to its mean over opaque texels) times the
    target colour (so a dark asset can become light brown); baked into a copy of the image (the glTF keeps the texture)"""
    if not rgb: return
    import numpy as np
    for m in obj.data.materials:
        if not m or not m.use_nodes: continue
        nt = m.node_tree
        bsdf = next((n for n in nt.nodes if n.type == "BSDF_PRINCIPLED"), None)
        if not bsdf: continue
        link = bsdf.inputs["Base Color"].links[0] if bsdf.inputs["Base Color"].links else None
        if link and link.from_node.type == "TEX_IMAGE":
            img = link.from_node.image
            px = np.empty(img.size[0] * img.size[1] * 4, dtype=np.float32); img.pixels.foreach_get(px); px = px.reshape(-1, 4)
            lum = px[:, 0] * 0.2126 + px[:, 1] * 0.7152 + px[:, 2] * 0.0722
            op = px[:, 3] > 0.5
            mean = float(lum[op].mean()) if op.any() else float(lum.mean())
            k = lum / max(mean, 1e-3)
            if soft: k = 1 + (k - 1) * soft          # clothes: keep only part of the texture's contrast
            for c in range(3): px[:, c] = np.clip(k * rgb[c], 0, 1)
            if soft is not None:                     # clothes are opaque (the polo's hem texture had alpha holes)
                px[:, 3] = 1.0
                try: m.blend_method = "OPAQUE"
                except Exception: pass
            new = bpy.data.images.new(img.name + "_tint_" + CAND, img.size[0], img.size[1], alpha=True)
            new.colorspace_settings.name = img.colorspace_settings.name
            new.pixels.foreach_set(px.ravel()); new.pack()
            link.from_node.image = new
        else:
            bsdf.inputs["Base Color"].default_value = (*rgb, 1)

def bake_tints():
    tint(parts[C["hair"]], C.get("hair_tint"))
    tint(parts[C["shirt"]], C.get("shirt_tint"), 0.6)
    tint(parts[SHORTS], C.get("shorts_tint"), 0.5)

# ------------------------------------------------------------------------------------------------ export copy
def tris_of(o):
    dg = bpy.context.evaluated_depsgraph_get()
    m = o.evaluated_get(dg).to_mesh()
    n = sum(len(p.vertices) - 2 for p in m.polygons)
    o.evaluated_get(dg).to_mesh_clear()
    return n

KEEP = ("head", "neck_01", "hand_", "thumb_", "index_", "middle_", "ring_", "pinky_")
def reduce(o, eb):
    """the triangle budget (<= ~25k): the body and the shoes decimated (collapse), the head, neck, hands kept full"""
    ratio = (0.68 if o == eb else 0.6 if "shoes" in o.name else C.get("hair_ratio", 1.0) if o.name.endswith(C["hair"] + "_export")
             else 0.75 if C["shirt"] in o.name and tris_of(o) > 3000 else 1.0)
    if ratio >= 1 or "--nobudget" in argv: return
    bpy.ops.object.select_all(action="DESELECT")
    o.select_set(True); bpy.context.view_layer.objects.active = o
    if o.data.shape_keys:
        bpy.ops.object.shape_key_remove(all=True, apply_mix=True)
    # the masks (helpers, the skin under the clothes) applied FIRST: a decimate under a mask spreads the delete groups'
    # weights by its collapses (the shins vanished) and folds the hidden helper geometry into wings (hips -> wrists)
    print("modifiers before the budget:", o.name, [(m.type, getattr(m, "vertex_group", "")) for m in o.modifiers])
    for m in [m for m in o.modifiers if m.type == "MASK"]:
        while o.modifiers.find(m.name) > 0: bpy.ops.object.modifier_move_up(modifier=m.name)
        bpy.ops.object.modifier_apply(modifier=m.name)
    mod = o.modifiers.new("budget", "DECIMATE"); mod.ratio = ratio
    mod.use_symmetry = True; mod.symmetry_axis = "X"
    if o == eb and "--keepgroup" in argv:
        keep = o.vertex_groups.new(name="_keep")
        idx = {g.index for g in o.vertex_groups if g.name.startswith(KEEP)}
        keep.add([v.index for v in o.data.vertices if any(e.group in idx and e.weight > 0.2 for e in v.groups)], 1.0, "REPLACE")
        mod.vertex_group = "_keep"; mod.invert_vertex_group = True; mod.vertex_group_factor = 1.0
    # (the armature modifier stays first: move the decimate to the top so it applies on the rest mesh)
    while o.modifiers.find("budget") > 0: bpy.ops.object.modifier_move_up(modifier="budget")
    bpy.ops.object.modifier_apply(modifier="budget")
    if "_keep" in o.vertex_groups: o.vertex_groups.remove(o.vertex_groups["_keep"])

def export():
    for img in bpy.data.images:
        if img.size[0] > MAX_TEX or img.size[1] > MAX_TEX:
            s = MAX_TEX / max(img.size)
            img.scale(max(1, int(img.size[0] * s)), max(1, int(img.size[1] * s)))
    bake_tints()
    root = ExportService.create_character_copy(basemesh, name_suffix="_export")
    eb = ObjectService.find_object_of_type_amongst_nearest_relatives(root, "Basemesh")
    ExportService.bake_modifiers_remove_helpers(eb, bake_masks=True, bake_subdiv=False, remove_helpers=True, also_proxy=True)
    objs = [root] + ObjectService.get_list_of_children(root)
    for o in objs:
        if o.type == "MESH": reduce(o, eb)
    counts = {o.name: tris_of(o) for o in objs if o.type == "MESH"}
    total = sum(counts.values())
    print("TRIS", total, counts)
    os.makedirs(OUT, exist_ok=True)
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = root
    dst = os.path.join(OUT, f"kid_{CAND}.raw.glb")
    bpy.ops.export_scene.gltf(filepath=dst, export_format="GLB", use_selection=True, export_apply=True, export_skins=True,
                              export_animations=False, export_morph=False, export_yup=True, export_image_format="AUTO",
                              export_def_bones=True)
    info = {"cand": CAND, "label": C["label"], "height": round(H, 4), "headRatio": round(ratio, 2), "head": round(hh, 4),
            "heightMacro": round(hm, 4), "age": AGE_11, "tris": total, "parts": counts, "spec": C,
            "assets": {"skin": "young_caucasian_male", "rig": "game_engine", "eyes": "low-poly", "eyelashes": "eyelashes01",
                       "brows": C["brows"], "hair": C["hair"], "shirt": C["shirt"], "shorts": SHORTS, "shoes": C["shoes"]},
            "bones": [b.name for b in rig.data.bones]}
    json.dump(info, open(os.path.join(OUT, f"kid_{CAND}.json"), "w"), indent=1)
    # the renders show what was exported (the decimated copy): the original hidden
    orig = ObjectService.find_object_of_type_amongst_nearest_relatives(basemesh, "Skeleton") or basemesh
    for o in [orig] + ObjectService.get_list_of_children(orig):
        if o not in objs: o.hide_render = True; o.hide_set(True)
    return info

# ------------------------------------------------------------------------------------------------ renders
def gpu_setup(scn):
    scn.render.engine = "CYCLES"
    try:
        prefs = bpy.context.preferences.addons["cycles"].preferences
        for kind in ("OPTIX", "CUDA"):
            try:
                prefs.compute_device_type = kind; prefs.get_devices()
                if any(d.type == kind for d in prefs.devices):
                    for d in prefs.devices: d.use = d.type == kind
                    scn.cycles.device = "GPU"; print("Cycles device:", kind); return
            except Exception as e: print("no", kind, e)
    except Exception as e: print("GPU setup failed:", e)
    scn.cycles.device = "CPU"

def renders(dirp):
    os.makedirs(dirp, exist_ok=True)
    scn = bpy.context.scene
    gpu_setup(scn)
    scn.cycles.samples = 96
    scn.cycles.use_denoising = True
    try: scn.cycles.denoiser = "OPTIX"
    except Exception: pass
    scn.render.resolution_x, scn.render.resolution_y = 800, 1100
    scn.render.film_transparent = False
    scn.view_settings.view_transform = "AgX"
    w = bpy.data.worlds.new("w"); scn.world = w; w.use_nodes = True
    bg = w.node_tree.nodes["Background"]; bg.inputs[0].default_value = (0.62, 0.70, 0.80, 1); bg.inputs[1].default_value = 0.6
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun)
    sun.data.energy = 3.2; sun.data.angle = math.radians(8); sun.rotation_euler = (math.radians(50), 0, math.radians(35))
    fill = bpy.data.objects.new("fill", bpy.data.lights.new("fill", "AREA")); scn.collection.objects.link(fill)
    fill.data.energy = 150; fill.data.size = 3; fill.location = (-2.5, -2.5, 1.6); fill.rotation_euler = (math.radians(70), 0, math.radians(-45))
    bpy.ops.mesh.primitive_plane_add(size=8); gp = bpy.context.active_object
    gm = bpy.data.materials.new("ground"); gm.use_nodes = True
    gm.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.42, 0.42, 0.40, 1); gp.data.materials.append(gm)
    # (the rest pose is MakeHuman's own A-pose: arms ~ 45 deg down)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    cam.data.lens = 85
    mid = Vector((0, 0, H * 0.52))
    views = {"front": (0, -1, 0.05), "q34": (0.75, -0.75, 0.08), "side": (1, 0, 0.05)}
    for nm, d in views.items():
        dv = Vector(d).normalized()
        cam.location = mid + dv * 4.3
        look(cam, mid)
        scn.render.filepath = os.path.join(dirp, f"kid_{CAND}_{nm}.png"); bpy.ops.render.render(write_still=True)
    # the face close-up (3/4 from the front)
    hb = rig.pose.bones["head"]
    face = rig.matrix_world @ ((hb.head + hb.tail) * 0.5)
    cam.data.lens = 100
    cam.location = face + Vector((0.35, -1.1, 0.04)).normalized() * 1.25
    look(cam, face)
    scn.render.resolution_x = scn.render.resolution_y = 900
    scn.render.filepath = os.path.join(dirp, f"kid_{CAND}_face.png"); bpy.ops.render.render(write_still=True)

def look(cam, target):
    d = target - cam.location
    cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler()

if PROBE:
    print("PROBE done"); sys.exit(0)
if GAME:
    exec(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "kidGame.py"), encoding="utf-8").read())
    sys.exit(0)
info = export()
if RENDERS: renders(RENDERS)
print("DONE", json.dumps({k: info[k] for k in ("cand", "height", "headRatio", "tris")}))
