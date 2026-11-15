"""THE PUBLIC ART KIT (Uccle): the first public artworks of the city, built entirely in code (no hand modelling) from real
data (models/publicart/site.json: tools/publicart/build_site.py) and photos (docs/publicart/PUBLIC_ART_KIT.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/publicart.py -- [--no-bake] [--previews] [--only a,b] [--samples 48]
    node tools/publicart_pack.mjs                 (LODs with meshoptimizer + the mesh audit -> models/publicart/publicart.glb)

Pieces (one object each, origin = the piece's ground point, front = Blender -Y = glTF +Z; site.json gives where):
  monolithes   the Dix Monolithes (Florence Freson, 1992-94): 7 standing + 3 lying blue-stone blocks at their UrbIS
               footprints / tops, split faces with rows of drill channels, rough arrises; the island's blue-stone kerb ring
               (r = the UrbIS median), its planted bed (a low dome over the DTM), the two hornbeam hedges
  evades       La Victoire, monument aux evades de guerre (Raymond Glorie, 2001): the stainless steel V (two square bars) on
               a dressed blue-stone block in a cairn of split blue-stone rubble, the broken iron chain, the laurel branch, the
               gravel circle, the two inscribed blue-stone slabs (FR / NL)
  gobert       Monument a Rene Gobert (Marcel Chabot arch. 1943, Joseph Witterwulghe sc.): the pier with the bronze portrait
               relief and the inscription, the two dated panels "1914-1918" / "1940-1943" (gilt figures), the forecourt
               flags, the flower beds, the flanking cream-stone walls
  milestone    the Austrian-period milestone ("Borne 5 km", Chaussee de Waterloo): square plinth, torus, round shaft with a
               domed top, the sunk medallion (its numeral is drawn by the city per instance: 5, 0, 1)
  boundary     a Charles V boundary stone (form not documented: a rough-dressed upright, the Burgundy cross drawn by the city)

Every stone part is SCULPTED (voxel remesh + displacement: split faces, drill channels, chips) and BAKED onto a light
shrink-wrapped low-poly: a tangent-space normal map + AO in the kit atlas (TEXCOORD_1): publicart_nrm.jpg, publicart_ao.png.
Hard parts (steel, iron, sawn stone) are modelled with real bevels; the bake gives them their AO (each piece alone on its
own ground plane: contact shadow).

GLB contract (raw, before tools/publicart_pack.mjs): nodes = pieces; one primitive per NAMED slot (no colour, no texture);
COLOR_0.r = code / 16 + 1/32 (CODES), .g .b = 1 / 0, .a = 1; TEXCOORD_0 = metres per face (grain), on lettered faces
1000 (cell + 1) + s, v = t in metres (models/publicart/publicart_letters.json cells); TEXCOORD_1 = the atlas.
"""
import bpy, bmesh, math, os, sys, json, time, random
from mathutils import Vector, Matrix, noise
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import kitlib as K

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def opt(name, default): return ARGS[ARGS.index(name) + 1] if name in ARGS else default
ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "models", "publicart")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
ONLY = [s for s in opt("--only", "").split(",") if s]
SAMPLES = int(opt("--samples", 48))
PX = int(opt("--px", 2048))
FAST = "--fast" in ARGS                     # coarser sculpts (tests)
SITE = json.load(open(os.path.join(OUT, "site.json"), encoding="utf-8"))
P = {p["id"]: p for p in SITE["pieces"]}
T0 = time.time()
sys.stdout.reconfigure(line_buffering=True)
def tick(s): print(f"[publicart] {s} {time.time() - T0:.0f}s")

scn = K.reset()
scn.render.threads_mode = "FIXED"; scn.render.threads = max(2, (os.cpu_count() or 4) // 2)    # half the CPU (shared laptop)

# ------------------------------------------------------------------------------------------------ slots + codes
SL = {
    "stone_blue": K.mat("stone_blue", (0.30, 0.32, 0.34), 0.75),       # petit granit: monoliths, cairn, slabs, milestones
    "stone_kerb": K.mat("stone_kerb", (0.30, 0.32, 0.34), 0.7),        # the island's sawn blue-stone kerb (the stone_blue look; its own slot so the far LOD keeps it apart from the bed)
    "stone_pale": K.mat("stone_pale", (0.62, 0.62, 0.60), 0.8),        # Gobert: the weathered pale stone of the pier + panels
    "stone_cream": K.mat("stone_cream", (0.72, 0.64, 0.48), 0.85),     # Gobert: the flanking walls (cream sandstone ashlar)
    "steel_stainless": K.mat("steel_stainless", (0.8, 0.8, 0.8), 0.25, 1.0),
    "iron_black": K.mat("iron_black", (0.04, 0.04, 0.04), 0.5, 0.6),
    "bronze": K.mat("bronze", (0.25, 0.2, 0.14), 0.45, 1.0),
    "gravel": K.mat("gravel", (0.6, 0.55, 0.45), 0.95),
    "bed_planting": K.mat("bed_planting", (0.22, 0.2, 0.14), 0.95),
    "hedge_hornbeam": K.mat("hedge_hornbeam", (0.2, 0.3, 0.1), 0.85),
}
CODES = ["plain", "split", "kerb", "letters", "medallion", "ashlar", "cross", "gilt", "relief", "coping", "step", "chain", "drill"]
C = {n: i for i, n in enumerate(CODES)}
CELLS = ["evades_fr", "evades_nl", "gobert_pier", "gobert_1914", "gobert_1940"]


class B:
    """a growing bmesh: per face slot, code, grain axis, lettering frame (cell, origin, s axis, t axis)"""
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new(); L = self.bm.faces.layers
        self.ls, self.lc, self.lg = L.int.new("slot"), L.int.new("code"), L.float_vector.new("grain")
        self.lcell, self.lo, self.lsx, self.ltx = L.int.new("cell"), L.float_vector.new("lo"), L.float_vector.new("lsx"), L.float_vector.new("ltx")
        self.lb = L.float.new("cb")                       # COLOR_0.b per face (the drilled faces: the channels' pitch)
        self.slots = []

    def add(self, other, slot, code="plain", grain=None, matrix=None, letters=None, smooth=None, face_codes=None, face_b=None):
        """letters = (cell name, origin, s axis, t axis) in the FINAL frame: faces facing along s x t get the lettering UVs"""
        if matrix is not None: other.transform(matrix)
        if slot not in self.slots: self.slots.append(slot)
        si = self.slots.index(slot)
        g = Vector((0, 0, 0)) if grain is None else ((matrix.to_3x3() @ Vector(grain)) if matrix is not None else Vector(grain)).normalized()
        vm = {v: self.bm.verts.new(v.co) for v in other.verts}
        other.normal_update()
        for f in other.faces:
            try: nf = self.bm.faces.new([vm[v] for v in f.verts])
            except ValueError: continue
            nf[self.ls] = si; nf[self.lc] = C[code] if isinstance(code, str) else code; nf[self.lg] = g
            nf[self.lcell] = -1
            if face_codes is not None: nf[self.lc] = C[face_codes[f.index]]
            nf[self.lb] = face_b[f.index] if face_b is not None else 0.0
            if letters is not None:
                cell, o, sx, tx = letters
                n = Vector(sx).cross(Vector(tx)).normalized()
                if f.normal.dot(n) > 0.9:
                    nf[self.lcell] = CELLS.index(cell); nf[self.lo] = Vector(o); nf[self.lsx] = Vector(sx); nf[self.ltx] = Vector(tx)
                    nf[self.lc] = C["gilt"] if cell.startswith("gobert_19") else C["letters"]       # (the dated panels' figures are gilt)
            nf.smooth = f.smooth if smooth is None else smooth
        other.free()

    def add_mesh(self, me, slot, code="split", matrix=None, face_codes=None, face_b=None):
        bm = bmesh.new(); bm.from_mesh(me); bm.faces.ensure_lookup_table()
        for f in bm.faces: f.smooth = True
        self.add(bm, slot, code, matrix=matrix, face_codes=face_codes, face_b=face_b)

    def to_object(self, sharp_angle=35):
        me = bpy.data.meshes.new(self.name)
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=0.0002)
        self.bm.normal_update(); self.bm.to_mesh(me)
        for n in self.slots: me.materials.append(SL[n])
        idx = [0] * len(me.polygons); me.attributes["slot"].data.foreach_get("value", idx); me.polygons.foreach_set("material_index", idx)
        o = bpy.data.objects.new(self.name, me); scn.collection.objects.link(o)
        if sharp_angle: me.set_sharp_from_angle(angle=math.radians(sharp_angle))
        uvs(me)
        for a in ("slot", "code", "grain", "cell", "lo", "lsx", "ltx", "cb"):
            if a in me.attributes: me.attributes.remove(me.attributes[a])
        self.bm.free()
        return o


def uvs(me):
    """TEXCOORD_0 metres (kitlib's grain rule); lettered faces: 1000 (cell + 1) + s, v = 1 - t (the glTF exporter flips v:
    the file then holds t); COLOR_0 "Col" (corner): r = code / 16 + 1/32, g = 1, b = 0, a = 1"""
    uv = me.uv_layers.new(name="UVMap")
    nP = len(me.polygons)
    def get(name, k):
        d = [0.0 if k else 0] * (nP * max(k, 1))
        me.attributes[name].data.foreach_get("vector" if k == 3 else "value", d); return d
    g, code, cell = get("grain", 3), get("code", 0), get("cell", 0)
    cbv = [0.0] * nP; me.attributes["cb"].data.foreach_get("value", cbv)
    lo, lsx, ltx = get("lo", 3), get("lsx", 3), get("ltx", 3)
    d = [0.0] * (2 * len(me.loops))
    col = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cd = [0.0] * (4 * len(me.loops))
    Z = Vector((0, 0, 1))
    for p in me.polygons:
        i = p.index; n = p.normal
        c = cell[i]
        if c >= 0:
            o, sx, tx = Vector(lo[3 * i:3 * i + 3]), Vector(lsx[3 * i:3 * i + 3]), Vector(ltx[3 * i:3 * i + 3])
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                d[2 * li] = 1000 * (c + 1) + (co - o).dot(sx); d[2 * li + 1] = 1 - (co - o).dot(tx)
        else:
            ga = Vector(g[3 * i:3 * i + 3])
            if ga.length > 0.5 and abs(n.dot(ga)) < 0.7: t = (ga - n * n.dot(ga)).normalized(); b = n.cross(t).normalized()
            elif abs(n.z) < 0.75: t = Z.cross(n).normalized(); b = Z
            else: t = Vector((1, 0, 0)); b = n.cross(t).normalized()
            for li in p.loop_indices:
                co = me.vertices[me.loops[li].vertex_index].co
                d[2 * li] = co.dot(t); d[2 * li + 1] = co.dot(b)
        r = code[i] / 16 + 1 / 32
        for li in p.loop_indices: cd[4 * li:4 * li + 4] = [r, 1.0, cbv[i], 1.0]
    # (a new attribute re-allocates the layers: fetch both by name now, or the UVs go to a stale reference)
    me.uv_layers["UVMap"].data.foreach_set("uv", d)
    me.color_attributes["Col"].data.foreach_set("color", cd)


# ------------------------------------------------------------------------------------------------ geometry helpers
def box(x0, x1, y0, y1, z0, z1, bevel=0.0, segs=2):
    b = K.bm_box(x1 - x0, y1 - y0, z1 - z0, bevel, segs)
    bmesh.ops.translate(b, vec=((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2), verts=b.verts)
    return b


def lathe(prof, segs, smooth=True):
    """profile [(r, z)] bottom -> top revolved about Z (r = 0 ends closed by a pole)"""
    b = bmesh.new(); rings = []
    for r, z in prof:
        if r < 1e-6: rings.append([b.verts.new((0, 0, z))])
        else: rings.append([b.verts.new((r * math.cos(2 * math.pi * k / segs), r * math.sin(2 * math.pi * k / segs), z)) for k in range(segs)])
    for a, c in zip(rings, rings[1:]):
        if len(a) == 1: [b.faces.new([a[0], c[(k + 1) % segs], c[k]]) for k in range(segs)]
        elif len(c) == 1: [b.faces.new([a[k], a[(k + 1) % segs], c[0]]) for k in range(segs)]
        else: [b.faces.new([a[k], a[(k + 1) % segs], c[(k + 1) % segs], c[k]]) for k in range(segs)]
    if len(rings[0]) > 1: b.faces.new(list(reversed(rings[0])))
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    for f in b.faces: f.smooth = smooth
    return b


def obj_from_bm(name, b):
    me = bpy.data.meshes.new(name); b.to_mesh(me); b.free()
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o); return o


def remesh(o, voxel):
    m = o.modifiers.new("rm", "REMESH"); m.mode = "VOXEL"; m.voxel_size = voxel; m.adaptivity = 0.0
    bpy.context.view_layer.objects.active = o; bpy.ops.object.modifier_apply(modifier="rm")


def fbm(p, oct=4, lac=2.0, gain=0.5):
    s, a, f = 0.0, 1.0, 1.0
    for _ in range(oct): s += a * noise.noise(p * f); a *= gain; f *= lac
    return s


def low_from(hp, voxel, smooth=0.5, cut_below=None):
    """the shipped low-poly: a coarse remesh of the sculpt, smoothed, shrink-wrapped onto it (its detail goes to the bake)"""
    lp = hp.copy(); lp.data = hp.data.copy(); scn.collection.objects.link(lp)
    remesh(lp, voxel)
    b = bmesh.new(); b.from_mesh(lp.data)
    if smooth: bmesh.ops.smooth_vert(b, verts=b.verts, factor=smooth, use_axis_x=True, use_axis_y=True, use_axis_z=True)
    b.to_mesh(lp.data); b.free()
    sw = lp.modifiers.new("sw", "SHRINKWRAP"); sw.target = hp; sw.wrap_method = "NEAREST_SURFACEPOINT"
    bpy.context.view_layer.objects.active = lp; bpy.ops.object.modifier_apply(modifier="sw")
    if cut_below is not None:
        b = bmesh.new(); b.from_mesh(lp.data); b.normal_update()
        bmesh.ops.delete(b, geom=[f for f in b.faces if f.normal.z < -0.7 and all(v.co.z < cut_below for v in f.verts)], context="FACES")
        bmesh.ops.delete(b, geom=[v for v in b.verts if not v.link_faces], context="VERTS")
        b.to_mesh(lp.data); b.free()
    return lp


def sculpt_block(name, sx, sy, z0, z1, rnd, style, voxel=0.025, chip=0.035):
    """a split blue-stone block (local: centred on x / y, z0..z1): voxel-remeshed, displaced along the normal.
    style per side face: 'drill' = rows of horizontal half-round drill channels (the plug-and-feather splits of the
    photos' "stacked" faces), 'rough' = a split face, 'tooled' = vertical point-tool striations"""
    b = box(-sx / 2, sx / 2, -sy / 2, sy / 2, z0, z1, bevel=min(sx, sy) * 0.06, segs=3)
    o = obj_from_bm(name, b)
    remesh(o, voxel if not FAST else voxel * 2.5)
    seed = Vector((rnd.uniform(0, 100), rnd.uniform(0, 100), rnd.uniform(0, 100)))
    pitch = rnd.uniform(0.115, 0.15)
    faces = {k: style[k] if isinstance(style, dict) else rnd.choice(style) for k in ("+x", "-x", "+y", "-y")}
    me = o.data
    nz = noise.noise
    for v in me.vertices:
        p, n = v.co.copy(), v.normal
        q = p + seed
        # (~7 noise calls a vertex: the loop runs over ~1.5 M vertices for the monoliths)
        d = 0.03 * (nz(q * 0.7) + 0.5 * nz(q * 1.4)) + 0.012 * (nz(q * 2.6) + 0.5 * nz(q * 5.2))
        ax = 0 if abs(n.x) >= abs(n.y) and abs(n.x) >= abs(n.z) else (1 if abs(n.y) >= abs(n.z) else 2)
        if ax < 2:
            st = faces[("+" if n[ax] > 0 else "-") + "xy"[ax]]
            if st == "drill":
                # (the rows of drill channels are drawn by the city's stone material, sharp at any distance: the
                # face here is the split face between them)
                d += 0.008 * nz(q * 3.0)
            elif st == "tooled":
                u = p.y if ax == 0 else p.x
                f = (u / 0.07 + 0.4 * nz(q * 2.1)) % 1.0
                d += -0.006 * math.exp(-((f - 0.5) ** 2) / 0.01) + 0.01 * nz(q * 4.5)
            else:
                d += 0.016 * (1 - abs(nz(q * 2.2) + 0.5 * nz(q * 4.4)))
        else:
            d += 0.012 * nz(q * 3.1)
        # rough, chipped arrises: two strong normal components = on an edge
        a_, b_, c_ = sorted((abs(n.x), abs(n.y), abs(n.z)))
        if b_ > 0.35: d -= chip * (0.5 + 0.5 * nz(q * 3.3)) * min(1, (b_ - 0.35) * 3)
        if p.z < z0 + 0.05: d = 0
        v.co = p + n * d
    o["faces"] = json.dumps(faces); o["pitch"] = pitch
    o.data.update()
    return o


def clear_parent_mesh(o):
    """mesh copy with the object's transform applied (for adding to a builder)"""
    me = o.data.copy(); me.transform(o.matrix_world); return me


# ------------------------------------------------------------------------------------------------ the pieces
HP = {}            # piece -> list of hp objects (sculpts + copies of the hard parts) for the normal bake
INFO = {}


def finish(name, lp_builder, hp_builder, hp_objs, sharp=35):
    lp = lp_builder.to_object(sharp)
    hp_h = hp_builder.to_object(sharp)
    for o in hp_objs:
        o.data.materials.clear(); o.data.materials.append(SL["stone_blue"])
    HP[name] = [hp_h] + hp_objs
    for o in HP[name]: o.name = o.name if o.name.startswith(name + "__hp") else f"{name}__hp_{o.name}"
    return lp


def both(lpb, hpb, b, *a, **kw):
    c = b.copy(); lpb.add(b, *a, **kw); hpb.add(c, *a, **kw)


def island_surface(S):
    """the island as the city draws it (models/publicart/monolithes_drawn.json, sampled in the viewer): H(x, y) = the
    highest drawn sample within 2.3 m + 5 cm (Blender frame, local metres), road(theta) and the drawn rim; the kerb top
    follows the road + 0.30 m, at least 6 cm over the drawn rim, smoothed round the ring"""
    D = json.load(open(os.path.join(OUT, "monolithes_drawn.json")))
    y0 = S["y"]
    G = [(dx, -dz, y - y0) for dx, dz, y in D["grid"]]
    def H(x, y):
        best = -9.0
        for gx, gy, gz in G:
            if (gx - x) ** 2 + (gy - y) ** 2 <= 2.3 ** 2 and gz > best: best = gz
        return best + 0.05
    rim = [(math.radians(a), yr - y0, yd - y0) for a, yr, yd in D["rim"]]       # (angle from +x toward +z (south))
    def sample(lst, th, k):
        # angles: city (x east, z south) -> Blender (x, y = -z): theta_blender = -theta_city
        a = (-th) % (2 * math.pi); n = len(lst); f = a / (2 * math.pi) * n; i0 = int(f) % n; t = f - int(f)
        return lst[i0][k] * (1 - t) + lst[(i0 + 1) % n][k] * t
    raw = lambda th: max(sample(rim, th, 2) + 0.30, sample(rim, th, 1) + 0.06)
    env = lambda th: max(raw(th + math.radians(d)) for d in range(-30, 31, 5))          # (>= the raw value: the window holds it)
    def kerb_top(th):
        # a level-looking kerb line: the upper envelope over +-30 deg, averaged over +-20 deg (the drawn rim is jagged)
        return sum(env(th + math.radians(d)) for d in range(-20, 21, 5)) / 9
    road = lambda th: sample(rim, th, 2)
    return H, kerb_top, road


STONE_CACHE = os.path.join(OUT, "work", "stones.blend")


def monolithes():
    S = P["monolithes"]; R = S["island"]["r"]
    rnd = random.Random(1994)
    lpb, hpb, hps = B("monolithes"), B("monolithes__hp_hard"), []
    H, kerb_top, road = island_surface(S)
    cached = {}
    if os.path.exists(STONE_CACHE) and "--rebuild-stones" not in ARGS:
        with bpy.data.libraries.load(STONE_CACHE) as (src, dst): dst.objects = [n for n in src.objects if n.startswith("stone")]
        for o in dst.objects: scn.collection.objects.link(o); cached[o.name] = o
        tick(f"stone sculpts from the cache {STONE_CACHE} ({len(cached)}: {sorted(cached)})")
    made = []
    # the stones (UrbIS footprints: centre, long side's direction, section, top)
    for i, st in enumerate(S["stones"]):
        L, W = st["len"], st["wid"]
        x, y = st["x"], -st["z"]
        a = st["axis_yaw"]; d = Vector((math.sin(a), -math.cos(a), 0))              # the long side, Blender frame
        ang = math.atan2(-d.x, d.y)
        z0 = H(x, y) - 0.5
        name = f"stone{i}_lying" if st["lying"] else f"stone{i}"
        if name in cached: hp = cached[name]
        else:
            if st["lying"]: hp = sculpt_block(name, W, L, z0, st["top"], rnd, {"+x": "drill", "-x": "rough", "+y": "rough", "-y": "rough"})
            else: hp = sculpt_block(name, W * 0.98, L * 0.98, z0, st["top"], rnd, ["drill", "drill", "rough", "rough", "tooled"])
            hp.matrix_world = Matrix.Translation((x, y, 0)) @ Matrix.Rotation(ang, 4, "Z")
            made.append(hp)
        lp = low_from(hp, 0.14, 0.25, cut_below=z0 + 0.06)
        # the drilled faces (by the low-poly's normal in the stone's frame): code "drill", the pitch in COLOR_0.b
        styles = json.loads(hp["faces"]); pitch = hp["pitch"]
        fc, fb = [], []
        for pg in lp.data.polygons:
            n = pg.normal; ax = 0 if abs(n.x) >= abs(n.y) else 1
            drill = abs(n.z) < 0.6 and styles[("+" if n[ax] > 0 else "-") + "xy"[ax]] == "drill"
            fc.append("drill" if drill else "split"); fb.append((pitch - 0.1) / 0.1 if drill else 0.0)
        lpb.add_mesh(clear_parent_mesh(lp), "stone_blue", "split", face_codes=fc, face_b=fb)
        bpy.data.objects.remove(lp, do_unlink=True)
        hps.append(hp)
        INFO.setdefault("stones", []).append({"urbis": st["urbis"], "size_m": [round(W, 2), round(L, 2), round(st["top"] - z0, 2)], "top_local": st["top"]})
    if made:
        stones = [h for h in hps if h.name.startswith("stone")]
        bpy.data.libraries.write(STONE_CACHE, set(stones), fake_user=True); tick(f"stone sculpts cached ({len(stones)}: {[h.name for h in stones]})")
    # the kerb ring: sawn blue stone, 0.20 wide, its top 0.30 over the road (and over the drawn rim), its face 0.5 m
    # into the ground (JOINS: a skirt)
    segs = 220
    b = bmesh.new(); rings = []
    for r_, kind, dz in ((R - 0.20, "in", -0.6), (R, "road", -0.5), (R, "top", -0.012), (R - 0.012, "top", 0.0), (R - 0.188, "top", 0.0), (R - 0.20, "top", -0.012)):
        ring = []
        for k in range(segs):
            th = 2 * math.pi * k / segs; kt = kerb_top(th)
            z = (road(th) + dz) if kind == "road" else (kt + dz if kind == "top" else kt - 0.75)
            ring.append(b.verts.new((r_ * math.cos(th), r_ * math.sin(th), z)))
        rings.append(ring)
    for j in range(len(rings)):
        a_, c_ = rings[j], rings[(j + 1) % len(rings)]
        for k in range(segs): b.faces.new([a_[k], a_[(k + 1) % segs], c_[(k + 1) % segs], c_[k]])
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    for f in b.faces: f.smooth = True
    both(lpb, hpb, b, "stone_kerb", "kerb", grain=None)
    # the planted bed: 5 cm over the island the city draws (never under it), down to 3 cm under the kerb top at its rim,
    # which runs 5 cm into the kerb
    rings_r = [0.0, 1.2, 2.6, 4.0, 5.5, 7.0, 8.5, 10.0, 11.5, 13.0, 14.5, 15.8, 17.0, 18.0, 18.8, 19.35, R - 0.15]
    segs_b = 112
    def hb(x, y):
        r = math.hypot(x, y); th = math.atan2(y, x)
        h = H(x, y)
        if r > R - 1.2: h = max(h * (R - 0.15 - r) / 1.05 + (kerb_top(th) - 0.06) * (1 - (R - 0.15 - r) / 1.05), kerb_top(th) - 0.06 if r >= R - 0.2 else -9)
        return min(h, kerb_top(th) - 0.06) if r > R - 0.6 else h
    b = bmesh.new(); rr = []
    for r in rings_r:
        if r == 0: rr.append([b.verts.new((0, 0, hb(0, 0)))])
        else: rr.append([b.verts.new((r * math.cos(2 * math.pi * k / segs_b), r * math.sin(2 * math.pi * k / segs_b), hb(r * math.cos(2 * math.pi * k / segs_b), r * math.sin(2 * math.pi * k / segs_b)))) for k in range(segs_b)])
    for j in range(len(rr) - 1):
        a_, c_ = rr[j], rr[j + 1]
        for k in range(segs_b):
            if len(a_) == 1: b.faces.new([a_[0], c_[k], c_[(k + 1) % segs_b]])
            else: b.faces.new([a_[k], c_[k], c_[(k + 1) % segs_b], a_[(k + 1) % segs_b]])
    bmesh.ops.recalc_face_normals(b, faces=b.faces)
    for f in b.faces: f.smooth = True
    for f in b.faces:
        if f.normal.z < 0: f.normal_flip()
    both(lpb, hpb, b, "bed_planting", "plain")
    # the two hornbeam hedges across the middle (heritage record: "deux haies de charmes"; aerial: E-W rows); clipped
    # body 1.2 wide, 1.7 tall, rounded top corners, ends inside the island
    for zc, x0, x1 in ((-7.3, -13.0, 14.4), (-1.2, -14.6, 16.3)):
        yb = -zc
        x0 = max(x0, -math.sqrt(max(0, (R - 1.6) ** 2 - yb * yb))); x1 = min(x1, math.sqrt(max(0, (R - 1.6) ** 2 - yb * yb)))
        hz = max(hb(x, yb) for x in [x0 + (x1 - x0) * t / 12 for t in range(13)])
        hp = obj_from_bm("hedge", box(x0, x1, yb - 0.6, yb + 0.6, hz - 0.3, hz + 1.7, bevel=0.35, segs=4))
        remesh(hp, 0.04 if not FAST else 0.1)
        seed = Vector((zc, 3.1, 7.7))
        for v in hp.data.vertices:
            q = v.co + seed
            v.co = v.co + v.normal * (0.05 * fbm(q * 1.1, 3) + 0.035 * (1 - abs(fbm(q * 4.5, 3))) - 0.02) * (0 if v.co.z < hz - 0.05 else 1)
        hp.data.update()
        lp = low_from(hp, 0.28, 0.6, cut_below=hz - 0.2)
        lpb.add_mesh(clear_parent_mesh(lp), "hedge_hornbeam", "plain")
        bpy.data.objects.remove(lp, do_unlink=True)
        hp.data.materials.clear(); hp.data.materials.append(SL["hedge_hornbeam"])
        hps.append(hp)
    o = finish("monolithes", lpb, hpb, hps, sharp=60)
    for h in HP["monolithes"]:
        if "hedge" in h.name: h.data.materials.clear(); h.data.materials.append(SL["hedge_hornbeam"])
    o["ao_weight"] = 0.55
    INFO["monolithes"] = {"kerb_top_local": [round(min(kerb_top(t / 10) for t in range(63)), 3), round(max(kerb_top(t / 10) for t in range(63)), 3)], "island_r": R}
    return o


def evades():
    rnd = random.Random(2001)
    lpb, hpb, hps = B("evades"), B("evades__hp_hard"), []
    # the gravel circle (photos: a ~5 m dolomite circle in the lawn): 3 cm proud, a 15 cm skirt into the ground
    b = lathe([(2.62, -0.18), (2.62, 0.004), (2.6, 0.016), (2.4, 0.022), (1.2, 0.026), (0, 0.026)], 72)
    both(lpb, hpb, b, "gravel", "plain")
    # the dressed blue-stone block the bars stand on (its top 0.62), the cairn of split rubble round it
    blk = 0.62
    both(lpb, hpb, box(-0.46, 0.46, -0.46, 0.46, -0.1, blk, bevel=0.012, segs=2), "stone_blue", "plain")
    cairn = bmesh.new()
    def rock(cx, cy, cz, sx, sy, sz, rz, tilt):
        r = box(-sx / 2, sx / 2, -sy / 2, sy / 2, -sz / 2, sz / 2, bevel=0.03, segs=1)
        # chopped corners: a split rubble stone
        for _ in range(3):
            nrm = Vector((rnd.uniform(-1, 1), rnd.uniform(-1, 1), rnd.uniform(-0.6, 1))).normalized()
            co = Vector((nrm.x * sx / 2, nrm.y * sy / 2, nrm.z * sz / 2)) * rnd.uniform(0.62, 0.8)
            bmesh.ops.bisect_plane(r, geom=list(r.verts) + list(r.edges) + list(r.faces), plane_co=co, plane_no=nrm, clear_outer=True)
            bmesh.ops.contextual_create(r, geom=[e for e in r.edges if e.is_boundary])
        r.transform(Matrix.Translation((cx, cy, cz)) @ Matrix.Rotation(rz, 4, "Z") @ Matrix.Rotation(tilt, 4, "X"))
        me = bpy.data.meshes.new("t"); r.to_mesh(me); r.free(); cairn.from_mesh(me); bpy.data.meshes.remove(me)
    for ring, n, rr, zc, sz in ((0, 17, 1.38, 0.1, (0.22, 0.3)), (1, 13, 1.04, 0.3, (0.2, 0.28)), (2, 10, 0.72, 0.48, (0.18, 0.26))):
        for k in range(n):
            a = 2 * math.pi * (k + rnd.uniform(-0.25, 0.25) + ring * 0.37) / n
            sx, sy, h = rnd.uniform(0.38, 0.62), rnd.uniform(0.22, 0.34), rnd.uniform(*sz)
            rock(math.cos(a) * rr, math.sin(a) * rr, zc + rnd.uniform(-0.04, 0.05), sx, sy, h, a + math.pi / 2 + rnd.uniform(-0.3, 0.3), rnd.uniform(-0.35, 0.1) - 0.2 * ring)
    hp = obj_from_bm("cairn", cairn)
    remesh(hp, 0.018 if not FAST else 0.04)
    seed = Vector((5, 1, 9))
    for v in hp.data.vertices:
        q = v.co + seed
        v.co = v.co + v.normal * (0.008 * fbm(q * 4.0, 3) + 0.006 * (1 - abs(fbm(q * 9, 2)))) * (0 if v.co.z < 0.02 else 1)
    hp.data.update()
    lp = low_from(hp, 0.075, 0.35, cut_below=0.05)
    lpb.add_mesh(lp.data, "stone_blue", "split"); bpy.data.objects.remove(lp, do_unlink=True)
    hps.append(hp)
    # the V: two square stainless bars 0.15 m, 4.3 m long, 19 deg off the vertical, feet set 0.08 into the block
    tilt = math.radians(19); Lb = 4.3; s = 0.15
    feet = []
    for sgn in (-1, 1):
        bar = box(-s / 2, s / 2, -s / 2, s / 2, 0, Lb, bevel=0.005, segs=2)
        m = Matrix.Translation((sgn * 0.125, 0, blk - 0.08)) @ Matrix.Rotation(sgn * tilt, 4, "Y")       # (the tops lean OUT: a V)
        both(lpb, hpb, bar, "steel_stainless", "plain", grain=(0, 0, 1), matrix=m)
        feet.append(m)
    def on_bar(sgn, h):             # a point on the bar's outer face at height h over the block's top
        t = (h - (blk - 0.08)) / math.cos(tilt)
        return feet[0 if sgn < 0 else 1] @ Vector((sgn * (s / 2 + 0.005), 0, t))
    # the broken chain (photos): from the left bar ~1.9 m up, hanging down onto the cairn; a stub of 3 links on the right
    def chain(p0, p1, n, sag):
        pts = [p0.lerp(p1, i / (n - 1)) - Vector((0, 0, sag * math.sin(math.pi * i / (n - 1)))) for i in range(n)]
        for i in range(n - 1):
            a, c = pts[i], pts[i + 1]; d = (c - a); L = d.length
            # interlocking links: each one reaches 3 cm past its neighbours' centres (turned 90 deg in turn)
            link = K.bm_torus(0.05, 0.016, 16, 6, sx=1.0)
            bmesh.ops.scale(link, vec=((L / 2 + 0.03) / 0.05, 1, 1), verts=link.verts)
            q = Vector((1, 0, 0)).rotation_difference(d.normalized())
            mm = Matrix.Translation((a + c) / 2) @ q.to_matrix().to_4x4() @ Matrix.Rotation((math.pi / 2) * (i % 2), 4, "X")
            both(lpb, hpb, link, "iron_black", "chain", matrix=mm)
    chain(on_bar(-1, 1.95) + Vector((-0.04, -0.06, 0)), Vector((-0.75, -0.35, 0.7)), 8, 0.12)
    chain(on_bar(1, 1.45) + Vector((0.04, -0.06, 0)), Vector((0.62, -0.25, 0.86)), 4, 0.03)
    # the laurel branch (bronze patinated black): a sagging stem across the V at ~2.5 m, leaves in pairs
    hL, hR = 2.45, 2.55
    p0, p1 = on_bar(-1, hL) - Vector((-0.02, 0.0, 0)), on_bar(1, hR) - Vector((0.02, 0.0, 0))
    stem = [p0.lerp(p1, i / 10) + Vector((0, -0.05 * math.sin(math.pi * i / 10), -0.07 * math.sin(math.pi * i / 10))) for i in range(11)]
    both(lpb, hpb, K.bm_tube_path(stem, 0.014, 8), "iron_black", "plain")
    # the leaves: flat lanceolate blades (15 cm x 5.6 cm, 6 mm thick) in pairs along the stem, pointing toward its
    # tip and out at 35-55 deg, up and down in turn, a little forward (the photos: a full laurel branch)
    leaf = lambda: lathe([(0, 0), (0.014, 0.018), (0.028, 0.06), (0.024, 0.1), (0.012, 0.13), (0, 0.15)], 8)
    sdir = (stem[-1] - stem[0]).normalized(); up = Vector((0, 0, 1)); fwd = Vector((0, -1, 0))
    for i in range(1, 26):
        t = i / 26; base = stem[0].lerp(stem[-1], t) + Vector((0, -0.05 * math.sin(math.pi * t), -0.07 * math.sin(math.pi * t)))
        for side in (-1, 1):
            lf = leaf(); bmesh.ops.scale(lf, vec=(1, 0.2, 1), verts=lf.verts)
            a = math.radians(rnd.uniform(35, 55))
            v = (sdir * math.cos(a) + up * side * math.sin(a) + fwd * rnd.uniform(0.1, 0.45)).normalized()
            q = Vector((0, 0, 1)).rotation_difference(v)
            m = Matrix.Translation(base) @ q.to_matrix().to_4x4() @ Matrix.Rotation(rnd.uniform(-0.6, 0.6) + (math.pi / 2 if side > 0 else 0), 4, "Z")
            both(lpb, hpb, lf, "iron_black", "plain", matrix=m)
    # the two inscribed slabs (FR on the left, NL on the right seen from the front), 1.05 x 0.62 x 0.1, tilted 15 deg
    for sgn, cell in ((-1, "evades_fr"), (1, "evades_nl")):
        cx, cy = sgn * 3.15, -0.9
        tilt_s = math.radians(15)
        m = Matrix.Translation((cx, cy, 0.52)) @ Matrix.Rotation(tilt_s, 4, "X")
        slab = box(-0.525, 0.525, -0.31, 0.31, -0.05, 0.05, bevel=0.006, segs=2)
        # the lettered top face: s along +X (the reader's right, from the front -Y), t up the slope
        o = m @ Vector((-0.525, -0.31, 0.05)); sx = (m.to_3x3() @ Vector((1, 0, 0))).normalized(); tx = (m.to_3x3() @ Vector((0, 1, 0))).normalized()
        both(lpb, hpb, slab, "stone_blue", "plain", matrix=m, letters=(cell, o, sx, tx))
        for px in (-0.33, 0.33):
            both(lpb, hpb, box(cx + px - 0.07, cx + px + 0.07, cy - 0.12, cy + 0.12, -0.25, 0.5, bevel=0.006, segs=1), "stone_blue", "plain")
    INFO["evades"] = {"bars": {"section_m": s, "length_m": Lb, "tilt_deg": 19}, "block_top_m": blk, "gravel_r_m": 2.62, "slabs": "1.05 x 0.62 x 0.10, 15 deg, x = +-3.15 m"}
    return finish("evades", lpb, hpb, hps)


def gobert():
    """frame: x along the memorial (OSM way: 6.61 m), front -Y (toward Avenue De Fre)"""
    rnd = random.Random(1943)
    lpb, hpb, hps = B("gobert"), B("gobert__hp_hard"), []
    PW, PD, PH = 1.2, 0.7, 2.45
    # the pier: lower stone (inscription), upper stone (the bronze portrait), the cap
    both(lpb, hpb, box(-PW / 2, PW / 2, -PD / 2, PD / 2, -0.35, 0.10, 0.01, 1), "stone_pale", "step")
    o = Vector((-0.45, -PD / 2 - 0.0001, 0.18))
    both(lpb, hpb, box(-PW / 2 + 0.02, PW / 2 - 0.02, -PD / 2 + 0.02, PD / 2 - 0.02, 0.10, PH, 0.008, 1), "stone_pale", "ashlar",
         letters=("gobert_pier", Vector((-0.45, -PD / 2 + 0.02, 0.2)), Vector((1, 0, 0)), Vector((0, 0, 1))))
    both(lpb, hpb, box(-0.69, 0.69, -0.42, 0.42, PH, PH + 0.17, 0.01, 2), "stone_pale", "coping")
    # the bronze portrait plaque in its recess (0.50 x 0.52, centre 2.0 m): a sculpted relief baked onto a flat plaque
    py = -PD / 2 + 0.02
    # (the low-poly plaque's face at the relief's highest point: the relief lies BEHIND it, inside the bake's ray reach)
    lpb.add(box(-0.25, 0.25, py - 0.052, py + 0.01, 1.74, 2.26, 0.004, 1), "bronze", "relief")     # (not in the hard copy: the relief is its high-poly)
    rel = bmesh.new()
    bmesh.ops.create_grid(rel, x_segments=100 if not FAST else 40, y_segments=104 if not FAST else 42, size=0.5)
    for v in rel.verts:
        x, z = v.co.x * 0.48, v.co.y * 0.50           # grid +-0.5 -> plaque metres (+-0.24, +-0.25)
        # head-and-shoulders, three-quarter low relief (photos): head oval, hair mass, ear, collar, tie, lapels
        hx, hz = x - 0.01, z - 0.07
        head = max(0.0, 1 - (hx / 0.085) ** 2 - (hz / 0.11) ** 2)
        neck = max(0.0, 1 - (x / 0.05) ** 2) * (1 if -0.09 < z < -0.02 else 0)
        sh = max(0.0, 1 - (x / 0.22) ** 2 - ((z + 0.25) / 0.17) ** 2)
        tie = max(0.0, 1 - (x / 0.018) ** 2) * (1 if -0.25 < z < -0.08 else 0)
        lap = max(0.0, 1 - ((abs(x) - 0.06) / 0.03) ** 2) * (1 if -0.25 < z < -0.1 else 0)
        hair = max(0.0, 1 - (hx / 0.088) ** 2 - ((hz - 0.05) / 0.07) ** 2) * (1 if hz > 0.02 else 0)
        nose = max(0.0, 1 - ((hx - 0.0) / 0.012) ** 2 - ((hz + 0.0) / 0.03) ** 2)
        h = 0.028 * math.sqrt(head) + 0.012 * neck + 0.02 * math.sqrt(sh) + 0.004 * tie + 0.003 * lap + 0.006 * hair + 0.008 * nose
        h += 0.0012 * noise.noise(Vector((x * 60, z * 60, 1)))
        v.co = Vector((x, py - 0.012 - h, z + 2.0))
    bmesh.ops.recalc_face_normals(rel, faces=rel.faces)
    for f in rel.faces:
        if f.normal.y > 0: f.normal_flip()
    rel_o = obj_from_bm("relief", rel); rel_o.data.materials.append(SL["bronze"]); hps.append(rel_o)
    # the two dated panels, coping, the figures (gilt) on their front
    for sgn, cell in ((-1, "gobert_1914"), (1, "gobert_1940")):
        x0, x1 = sorted((sgn * 0.6, sgn * 3.3))
        both(lpb, hpb, box(x0, x1, -0.21, 0.21, -0.35, 0.10, 0.01, 1), "stone_pale", "step")
        both(lpb, hpb, box(x0 + 0.01, x1 - 0.01, -0.2, 0.2, 0.10, 1.54, 0.006, 1), "stone_pale", "ashlar",
             letters=(cell, Vector((x0 + 0.01, -0.2, 1.0)), Vector((1, 0, 0)), Vector((0, 0, 1))))
        both(lpb, hpb, box(x0 - (0.04 if sgn > 0 else 0), x1 + (0.04 if sgn < 0 else 0), -0.245, 0.245, 1.54, 1.63, 0.01, 2), "stone_pale", "coping")
        # the flanking walls: cream sandstone ashlar, 1.25 m, coping
        w0, w1 = sorted((sgn * 3.3, sgn * 6.6))
        both(lpb, hpb, box(w0, w1, -0.18, 0.18, -0.35, 1.2, 0.006, 1), "stone_cream", "ashlar")
        both(lpb, hpb, box(w0 - 0.0, w1, -0.21, 0.21, 1.2, 1.27, 0.008, 2), "stone_cream", "coping")
        # the flower bed in front of the panel (photos: low planting), soil 13 cm over the ground
        bx0, bx1 = sorted((sgn * 0.68, sgn * 3.15))
        both(lpb, hpb, box(bx0, bx1, -0.80, -0.215, -0.2, 0.13, 0.02, 1), "bed_planting", "plain")
    # the forecourt flags (blue stone, one low step) in front of the beds, the full width
    both(lpb, hpb, box(-3.3, 3.3, -2.2, -0.80, -0.3, 0.10, 0.01, 1), "stone_blue", "step")
    both(lpb, hpb, box(-0.6, 0.6, -0.80, -0.35, -0.3, 0.10, 0.008, 1), "stone_blue", "step")
    INFO["gobert"] = {"pier_m": [PW, PD, PH + 0.17], "panels_m": [2.7, 0.42, 1.63], "walls_m": [3.3, 0.36, 1.27], "length_m": 13.2}
    return finish("gobert", lpb, hpb, hps)


def milestone():
    lpb, hpb = B("milestone"), B("milestone__hp_hard")
    both(lpb, hpb, box(-0.3, 0.3, -0.3, 0.3, -0.25, 0.19, 0.015, 2), "stone_blue", "plain")
    prof = [(0.255, 0.17), (0.255, 0.20), (0.262, 0.215), (0.262, 0.235), (0.255, 0.255), (0.24, 0.27), (0.22, 0.28), (0.20, 0.288),
            (0.19, 0.295), (0.172, 0.31), (0.17, 0.33), (0.17, 1.02), (0.165, 1.045), (0.15, 1.07), (0.12, 1.09), (0.07, 1.102), (0.0, 1.106)]
    b = lathe(prof, 40)
    both(lpb, hpb, b, "stone_blue", "medallion")
    INFO["milestone"] = {"height_m": 1.106, "shaft_d_m": 0.34, "plinth_m": 0.6, "medallion": {"r_m": 0.085, "centre_z_m": 0.83}}
    return finish("milestone", lpb, hpb, [])


def boundary():
    rnd = random.Random(1550)
    lpb, hpb = B("boundary"), B("boundary__hp_hard")
    hp = sculpt_block("bstone", 0.36, 0.26, -0.3, 0.72, rnd, {"+x": "rough", "-x": "rough", "+y": "tooled", "-y": "tooled"}, voxel=0.012, chip=0.02)
    for v in hp.data.vertices:                      # a rounded (worn) head
        if v.co.z > 0.55: v.co.x *= 1 - (v.co.z - 0.55) * 0.9; v.co.y *= 1 - (v.co.z - 0.55) * 0.5
    hp.data.update()
    lp = low_from(hp, 0.045, 0.4, cut_below=-0.25)
    lpb.add_mesh(lp.data, "stone_blue", "cross"); bpy.data.objects.remove(lp, do_unlink=True)
    INFO["boundary"] = {"size_m": [0.36, 0.26, 0.72], "note": "form not documented (no photo found): a rough-dressed upright"}
    return finish("boundary", lpb, hpb, [hp])


BUILD = {"monolithes": monolithes, "evades": evades, "gobert": gobert, "milestone": milestone, "boundary": boundary}
WORK = os.path.join(OUT, "work"); os.makedirs(WORK, exist_ok=True)
BLEND = os.path.join(WORK, "built.blend")
if "--reuse" in ARGS and os.path.exists(BLEND):
    # the sculpts take ~45 min (Python displacement over ~2.3 M vertices): --reuse starts from the last build's .blend
    bpy.ops.wm.open_mainfile(filepath=BLEND)
    scn = bpy.context.scene
    for n in SL: SL[n] = bpy.data.materials[n]; K._MATS[n] = SL[n]
    objs = [bpy.data.objects[n] for n in BUILD if n in bpy.data.objects and (not ONLY or n in ONLY)]
    HP = {o.name: [h for h in bpy.data.objects if h.get("hp_of") == o.name] for o in objs}
    INFO = json.loads(scn["pa_info"])
    tick(f"reused {BLEND}: {[o.name for o in objs]}")
else:
    objs = []
    for name, fn in BUILD.items():
        if ONLY and name not in ONLY: continue
        t = time.time(); o = fn(); objs.append(o)
        for h in HP[name]: h["hp_of"] = name
        tick(f"{name}: low-poly {K.tris(o)} tris, sculpt {sum(K.tris(h) for h in HP[name])} tris ({time.time() - t:.0f}s)")
    scn["pa_info"] = json.dumps(INFO)
    bpy.ops.wm.save_as_mainfile(filepath=BLEND, compress=True)
    tick(f"saved {BLEND}")


def lightmap_uv(o, region, margin=0.004):
    """TEXCOORD_1: the piece's own lightmap islands (smart projection: a remeshed sculpt or a lathe would crumble into
    one island per face from the metre UVs), equal texel density, packed into its atlas region"""
    me = o.data
    if "Lightmap" in me.uv_layers: me.uv_layers.remove(me.uv_layers["Lightmap"])
    lm = me.uv_layers.new(name="Lightmap"); me.uv_layers.active = me.uv_layers["Lightmap"]
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(62), island_margin=0.0, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    bpy.ops.uv.select_all(action="SELECT")
    bpy.ops.uv.average_islands_scale()
    # the big soft surfaces (the island's bed, the hedges, the gravel circle, the kerb) at 20-35 % of the stones' texel density
    bpy.ops.object.mode_set(mode="OBJECT")
    lm = me.uv_layers["Lightmap"]; d = [0.0] * (2 * len(me.loops)); lm.data.foreach_get("uv", d)
    soft = {i: {"bed_planting": 0.2, "hedge_hornbeam": 0.25, "gravel": 0.35, "stone_kerb": 0.35}[m.name] for i, m in enumerate(me.materials) if m.name in ("bed_planting", "gravel", "hedge_hornbeam", "stone_kerb")}
    for p in me.polygons:
        if p.material_index in soft:
            k = soft[p.material_index]
            for li in p.loop_indices: d[2 * li] *= k; d[2 * li + 1] *= k
    lm.data.foreach_set("uv", d)
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT"); bpy.ops.uv.select_all(action="SELECT")
    try: bpy.ops.uv.pack_islands(rotate=True, scale=True, margin=margin, shape_method="CONCAVE", margin_method="FRACTION")
    except Exception as e: print("pack_islands:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    x0, y0, s_ = region
    lm = me.uv_layers["Lightmap"]
    d = [0.0] * (2 * len(me.loops)); lm.data.foreach_get("uv", d)
    for i in range(0, len(d), 2): d[i] = x0 + d[i] * s_; d[i + 1] = y0 + d[i + 1] * s_
    lm.data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]


def fix_normals(o, crease=60.0, planar_area=0.2):
    """the shading normals every LOD0 ships with (and the normal map is baked against): a face inside a PLANAR region
    (flood-filled over edges within 1 deg, larger than 0.2 m2) is shaded flat; any other corner averages the area-weighted
    normals of the faces round its vertex within `crease` of its own face (the mesh checker's bentflat / streak rules;
    the packer's renormal does the same for LOD1 / LOD2)"""
    me = o.data
    b = bmesh.new(); b.from_mesh(me)                     # (triangles: what is exported and what the checker reads)
    bmesh.ops.triangulate(b, faces=[f for f in b.faces if len(f.verts) > 3], quad_method="BEAUTY", ngon_method="BEAUTY")
    b.to_mesh(me); b.free()
    P = me.polygons
    FN = [p.normal.copy() for p in P]; A = [p.area for p in P]
    par = list(range(len(P)))
    def fnd(x):
        while par[x] != x: par[x] = par[par[x]]; x = par[x]
        return x
    em = {}
    for p in P:
        for ek in p.edge_keys: em.setdefault(ek, []).append(p.index)
    c1 = math.cos(math.radians(1.0))
    for fs in em.values():
        for i in range(1, len(fs)):
            a, b = fs[0], fs[i]
            if FN[a].dot(FN[b]) > c1:
                ra, rb = fnd(a), fnd(b)
                if ra != rb: par[ra] = rb
    area = {}
    for i in range(len(P)): r = fnd(i); area[r] = area.get(r, 0.0) + A[i]
    flat = [area[fnd(i)] > planar_area for i in range(len(P))]
    vf = [[] for _ in me.vertices]
    for p in P:
        for v in p.vertices: vf[v].append(p.index)
    cc = math.cos(math.radians(crease))
    out = [None] * len(me.loops)
    for p in P:
        f = p.index
        for li in p.loop_indices:
            if flat[f]: out[li] = FN[f]; continue
            v = me.loops[li].vertex_index
            n = Vector((0, 0, 0))
            for g in vf[v]:
                if FN[g].dot(FN[f]) >= cc: n += FN[g] * A[g]
            out[li] = n.normalized() if n.length > 1e-12 else FN[f]
    # a stretched triangle whose corners diverge (a chamfer strip, a shrink-wrap fold) shades flat (the checker's streak)
    cs = math.cos(math.radians(25))
    for p in P:
        li = list(p.loop_indices)
        vs = [me.vertices[me.loops[l].vertex_index].co for l in li]
        el = [(vs[1] - vs[0]).length, (vs[2] - vs[1]).length, (vs[0] - vs[2]).length]; L = max(el)
        h = 2 * p.area / L if L > 0 else 0
        spread = min(out[li[0]].dot(out[li[1]]), out[li[1]].dot(out[li[2]]), out[li[0]].dot(out[li[2]]))
        if (L > 0.12 and h > 0 and L / h > 5 and spread < cs) or min(out[l].dot(FN[p.index]) for l in li) < 0.2:
            for l in li: out[l] = FN[p.index]
    me.normals_split_custom_set([tuple(n) for n in out])


for o in objs:
    fix_normals(o)
    for h in HP[o.name]:
        if "__hp_hard" in h.name: fix_normals(h)          # (the same geometry, the same normals: the map stays flat there)
tick("normals fixed (planar regions flat, crease 60)")

layout = K.atlas_layout(objs, margin=0.008)
for o in objs:
    t = time.time(); lightmap_uv(o, layout[o.name]); tick(f"lightmap {o.name} ({time.time() - t:.0f}s)")
ao_png, nrm_jpg = os.path.join(OUT, "publicart_ao.png"), os.path.join(OUT, "publicart_nrm.jpg")


def gpu_setup():
    """the bakes and previews on the laptop's RTX GPU (OptiX) when Blender sees it, else the CPU (half the cores)"""
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "OPTIX"; pr.get_devices()
        on = [d for d in pr.devices if d.type == "OPTIX"]
        for d in pr.devices: d.use = d.type == "OPTIX"
        scn.cycles.device = "GPU" if on else "CPU"
        tick(f"Cycles device: {scn.cycles.device} ({[d.name for d in on]})")
    except Exception as e:
        scn.cycles.device = "CPU"; tick(f"Cycles device: CPU ({e})")


def bake_maps(px=PX):
    """per piece ALONE on its own ground plane: the sculpt + the hard parts' copies (HP) baked onto the low-poly
    (selected -> active): tangent-space normals, then AO (the low-poly invisible to rays: the HP occludes)"""
    scn.render.engine = "CYCLES"; scn.cycles.samples = SAMPLES
    gpu_setup()
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.light_settings.distance = 1.5
    imgs = {"NORMAL": bpy.data.images.new("pa_nrm", px, px, alpha=False, float_buffer=False),
            "AO": bpy.data.images.new("pa_ao", px, px, alpha=False, float_buffer=False)}
    imgs["NORMAL"].generated_color = (0.5, 0.5, 1.0, 1.0); imgs["AO"].generated_color = (1, 1, 1, 1)
    for im in imgs.values(): im.colorspace_settings.name = "Non-Color"
    home = {o.name: o.location.copy() for o in objs}
    gm = bpy.data.materials.new("bake_ground"); planes = []
    flags = ("visible_camera", "visible_diffuse", "visible_glossy", "visible_shadow", "visible_transmission", "visible_volume_scatter")
    for i, o in enumerate(objs):
        p = Vector((i * 80.0, 0, 0)); o.location = p
        for h in HP[o.name]: h.location = p + (h.location - home[o.name])
        bpy.ops.mesh.primitive_plane_add(size=60, location=(p.x, p.y, -0.6 if o.name == "monolithes" else -0.002)); g = bpy.context.active_object; g.data.materials.append(gm); planes.append(g)
        for f in flags: setattr(o, f, False)
    t = time.time()
    for kind in ("NORMAL", "AO"):
        mats = set()
        for o in objs + [h for v in HP.values() for h in v]:
            for m in o.data.materials:
                if m in mats: continue
                n = m.node_tree.nodes.new("ShaderNodeTexImage"); n.image = imgs[kind]; n.name = "BAKE"; m.node_tree.nodes.active = n; mats.add(m)
        for o in objs:
            for x in scn.objects: x.select_set(False)
            # every other piece out of the way of the rays (alone)
            for q in objs:
                for h in HP[q.name]: h.hide_render = q is not o
            for h in HP[o.name]: h.select_set(True)
            o.select_set(True); bpy.context.view_layer.objects.active = o
            o.data.uv_layers.active = o.data.uv_layers["Lightmap"]
            # the cage: far enough out to catch the sculpt (stones +-2.5 cm, the relief up to 3 cm proud), short enough that a
            # ray from a hard part's concave corner does not start inside the next box (the Gobert boxes: 6 mm)
            ext, ray = {"monolithes": (0.05, 0.15), "evades": (0.05, 0.15), "boundary": (0.05, 0.15), "gobert": (0.006, 0.05), "milestone": (0.006, 0.03)}[o.name]
            kw = dict(type=kind, use_selected_to_active=True, cage_extrusion=ext, max_ray_distance=ray, uv_layer="Lightmap", margin=6, use_clear=False)
            if kind == "NORMAL": kw["normal_space"] = "TANGENT"
            # AO reach: the 6 m monoliths 1.5 m; the rubble cairn, the memorial, the small stones 0.5 m (a long reach
            # buried the cairn's stones in black)
            scn.world.light_settings.distance = 1.5 if o.name == "monolithes" else 0.5
            bpy.ops.object.bake(**kw)
            o.data.uv_layers.active = o.data.uv_layers["UVMap"]
            tick(f"  baked {kind} {o.name} ({time.time() - t:.0f}s)")
        for m in mats: m.node_tree.nodes.remove(m.node_tree.nodes["BAKE"])
    st = scn.render.image_settings
    st.file_format = "JPEG"; st.color_mode = "RGB"; st.quality = 92
    imgs["NORMAL"].save_render(nrm_jpg, scene=scn)
    st.file_format = "PNG"; st.color_mode = "BW"; st.color_depth = "8"; st.compression = 90
    imgs["AO"].save_render(ao_png, scene=scn)
    for g in planes: bpy.data.objects.remove(g)
    for o in objs:
        d = o.location - home[o.name]; o.location = home[o.name]
        for h in HP[o.name]: h.location = h.location - d; h.hide_render = False
        for f in flags: setattr(o, f, True)


if BAKE: bake_maps()
for v in HP.values():
    for h in v: h.hide_render = True; h.hide_set(True)
K.export_glb(objs, os.path.join(OUT, "publicart.raw.glb"), colors=True)
info = {
    "asset": "Public art kit (tools/blender/publicart.py): Dix Monolithes, La Victoire (the V), Monument Rene Gobert, milestone, Charles V boundary stone",
    "pieces": {o.name: {"triangles_raw": K.tris(o), "slots": [m.name for m in o.data.materials],
                        "size_m": [round(o.dimensions.x, 2), round(o.dimensions.y, 2), round(o.dimensions.z, 2)],
                        "atlas": [round(v, 4) for v in layout[o.name]]} for o in objs},
    "sculpt_triangles": {n: sum(K.tris(h) for h in v) for n, v in HP.items()},
    "codes": {"COLOR_0.r": "code / 16 + 1/32", "names": CODES},
    "cells": CELLS,
    "attributes": {"TEXCOORD_0": "metres per face (grain); lettered faces 1000 (cell + 1) + s, v = t (metres)",
                   "TEXCOORD_1": "the kit atlas: publicart_ao.png + tangent-space normals publicart_nrm.jpg"},
    "frame": "glTF Y up, origin = the piece's ground point (site.json x, y, z), front +Z",
    "details": INFO,
}
json.dump(info, open(os.path.join(OUT, "publicart.json"), "w"), indent=1)

if PREVIEWS:
    ao_img = bpy.data.images.load(ao_png, check_existing=False) if os.path.exists(ao_png) else bpy.data.images.new("blank", 8, 8)
    ao_img.colorspace_settings.name = "Non-Color"
    so, cam = K.preview_setup(ao_img, sun_elev=28, sun_az=300)
    gpu_setup(); scn.cycles.samples = 24; scn.cycles.use_denoising = True
    if os.path.exists(nrm_jpg):
        nimg = bpy.data.images.load(nrm_jpg, check_existing=False); nimg.colorspace_settings.name = "Non-Color"
        for m in SL.values():
            nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
            uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
            tx = nt.nodes.new("ShaderNodeTexImage"); tx.image = nimg; nt.links.new(uvn.outputs[0], tx.inputs[0])
            nm = nt.nodes.new("ShaderNodeNormalMap"); nm.uv_map = "Lightmap"; nt.links.new(tx.outputs["Color"], nm.inputs["Color"])
            nt.links.new(nm.outputs[0], bsdf.inputs["Normal"])
    PV = os.path.join(OUT, "previews"); os.makedirs(PV, exist_ok=True)
    x = 0.0
    for o in objs: o.location = (x, 0, 0); x += max(o.dimensions.x, 4) + 30
    for o in objs:
        c = o.location; d = max(o.dimensions.x, o.dimensions.y, o.dimensions.z)
        if o.name == "monolithes":
            K.render(cam, os.path.join(PV, "monolithes.jpg"), (c.x - 2, c.y - 34, 3.0), (c.x, c.y, 2.5), 35, (1400, 800))
            K.render(cam, os.path.join(PV, "monolithes_close.jpg"), (c.x - 9.5, c.y - 12.0, 1.7), (c.x - 7.4, c.y - 6.7, 2.5), 35, (1000, 1000))
        else:
            K.render(cam, os.path.join(PV, f"{o.name}.jpg"), (c.x + d * 0.35, c.y - d * 1.5 - 1.5, d * 0.45 + 0.6), (c.x, c.y, d * 0.3), 35, (1000, 1000))
tick("done")
