"""GARDEN PLANTS for the Foliage Lab, built in code (no hand modelling): shrubs, flower-bed plants, spring bulbs and the
window-box geranium of Uccle's front gardens.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/plants.py -- models/foliage

One GLB (models/foliage/plants.glb), one node per plant variant, origin at the plant's foot, glTF Y up, metres:
  box_ball       clipped box (Buxus) ball, 0.7 m: a lumpy clipped shell + 900 tiny leaves standing out of it
  laurel         cherry laurel (Prunus laurocerasus) shrub, 1.6 m: branching stems, ~650 big glossy leaves
  rhododendron   1.3 m: leaves in whorls at the twig tips, 9 pink flower trusses
  hydrangea      mophead hydrangea, 1.0 m mound: opposite leaves, 9 flower balls of 4-petal florets
  rose           bush rose, 0.9 m: canes, 5-leaflet leaves, 9 cupped blooms of layered petals
  lavender       a clump, 0.55 m: narrow grey leaves at the base, ~70 flower spikes on long stalks
  bulbs          a spring clump: 6 tulips (cup of 6 petals) + 6 daffodils (trumpet + 6 petals) with their leaves
  geranium       zonal pelargonium for window boxes, 0.3 m: kidney leaves, 6 red umbels
  *_far          the far variant of each shrub (a closed lumpy shell, no loose leaves; scripted, not decimated)
Materials (named slots, no baked colour; the viewer owns colours and seasons): leaf, leaf_mass (a shell surface),
stem, flower_a, flower_b, flower_centre.
Attributes: UV0 = metres (leaves: u along the leaf 0..len, v across); UV1 = (AO 0-1 baked by Cycles, a random per
leaf / flower 0-1); UV2 = (the leaf's / flower's base x, base y) and UV3 = (base z, kind: 0 stem, 1 leaf, 2 flower,
3 shell) in the glTF frame, so the viewer can shrink a leaf to its base (bare shrubs in winter, bulbs only in spring)
and sway it from there. LODs: meshoptimizer in JS (viewer/foliage/plants.js), never Blender decimate.
"""
import bpy, bmesh, math, os, sys, json, random
from mathutils import Vector, Matrix, noise
from mathutils.bvhtree import BVHTree

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS else "models/foliage")
os.makedirs(OUT, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
SLOTS = ["leaf", "leaf_mass", "stem", "flower_a", "flower_b", "flower_centre"]
MATS = {}
for s in SLOTS:
    m = bpy.data.materials.new(s); m.use_nodes = True; MATS[s] = m


class Builder:
    """faces with per-corner UV0, per-face slot, and per-vertex (random, base, kind) for UV1-3"""
    def __init__(self, name):
        self.name = name; self.bm = bmesh.new()
        self.uv0 = self.bm.loops.layers.uv.new("UVMap"); self.uv1 = self.bm.loops.layers.uv.new("AO")
        self.uv2 = self.bm.loops.layers.uv.new("Base"); self.uv3 = self.bm.loops.layers.uv.new("BaseKind")
        self.pid = self.bm.faces.layers.int.new("part"); self.npart = 0
    def face(self, pts, uvs, slot, rnd, base, kind, smooth=True):
        vs = [self.bm.verts.new(p) for p in pts]
        try:
            f = self.bm.faces.new(vs)
        except ValueError:
            return
        f.material_index = SLOTS.index(slot); f.smooth = smooth
        # glTF frame for the base: x, z(up), -y
        for l, uv in zip(f.loops, uvs):
            l[self.uv0].uv = uv; l[self.uv1].uv = (1.0, rnd); l[self.uv2].uv = (base.x, base.z); l[self.uv3].uv = (-base.y, kind)
        return f
    def part(self, P, U, tris, slot, rnd, base, kind, smooth=None):
        """an indexed piece: shared vertices (P), per-vertex UV0 (U), triangles / quads as index tuples"""
        vs = [self.bm.verts.new(p) for p in P]
        self.npart += 1
        for t in tris:
            try:
                f = self.bm.faces.new([vs[i] for i in t])
            except ValueError:
                continue
            # flat normals on leaves, petals and stems (thin open sheets and 3-5 sided stems: smooth groups across their
            # creases streak; the owner's no-bad-shading rule); only the closed shells are smooth
            f.material_index = SLOTS.index(slot); f.smooth = (kind == 3) if smooth is None else smooth
            f[self.pid] = self.npart
            for l, i in zip(f.loops, t):
                l[self.uv0].uv = U[i]; l[self.uv1].uv = (1.0, rnd); l[self.uv2].uv = (base.x, base.z); l[self.uv3].uv = (-base.y, kind)
    def tube(self, path, radii, slot="stem", sides=5, rnd=0.0, kind=0, avoid=0):
        # avoid = k: points path[k:] must keep clear of every other tube (radii + 6 mm): no shallow stem crossings
        tp = getattr(self, "tube_pts", [])
        if avoid:
            for p_, r_ in zip(path[avoid:], radii[avoid:]):
                if any((p_ - q).length < r_ + rq + 0.006 for q, rq in tp):
                    return False
        # no two tube starts closer than their radii + 4 mm (stalks from one point fight along their length)
        st = getattr(self, "starts", [])
        if any((path[0] - q).length < radii[0] + rq + 0.012 and (path[1] - path[0]).normalized().dot(dq) > 0.8 for q, rq, dq in st):
            return
        st.append((path[0].copy(), radii[0], (path[1] - path[0]).normalized())); self.starts = st
        tp.extend((p_.copy(), r_) for p_, r_ in zip(path, radii)); self.tube_pts = tp
        """a closed-ish tube along a polyline (open ends: they are buried or hidden in foliage)"""
        P, U, T = [], [], []
        s = 0.0
        a = None
        for i, p in enumerate(path):
            t = (path[min(i + 1, len(path) - 1)] - path[max(i - 1, 0)]).normalized()
            # parallel transport of the frame (t.orthogonal() jumps between rings: twisted, flipped quads)
            a = t.orthogonal().normalized() if a is None else (a - t * a.dot(t)).normalized()
            b = t.cross(a)
            if i: s += (path[i] - path[i - 1]).length
            for k in range(sides + 1):
                ang = 2 * math.pi * k / sides
                P.append(p + (a * math.cos(ang) + b * math.sin(ang)) * radii[i]); U.append((k / sides * 0.05, s))
        for i in range(len(path) - 1):
            for k in range(sides):
                a0 = i * (sides + 1) + k
                T.append((a0, a0 + 1, a0 + sides + 2, a0 + sides + 1))
        self.part(P, U, T, slot, rnd, path[0], kind)

    def leaf(self, base, direction, up, length, width, slot="leaf", droop=0.25, fold=0.18, rnd=None, kind=1, tip=0.55, group=None):
        """a leaf / petal: midrib folded (a shallow V), tip drooping; 7 vertices, 6 triangles; double-sided material.
        NO OVERLAPS (the mesh audit's coplanar / crossing / depth checks): a new leaf whose disc overlaps an earlier one
        at less than 25 degrees is turned about its stalk and retried (5 tries), then dropped. Petals of ONE flower
        (same rnd) skip that test; instead they alternate whorls: every other petal 2.5 mm out along the flower's axis
        and tilted 0.22 rad more, so neighbours never share a plane."""
        rnd = random.random() if rnd is None else rnd
        if kind == 2:
            self.petal_i = getattr(self, "petal_i", 0) + 1
            w = self.petal_i % 2
            base = base + up.normalized() * (0.003 * w)
            direction = (direction.normalized() + up.normalized() * (0.36 * w)).normalized()
        d0 = direction.normalized()
        rng_ = random.Random(hash((round(base.x, 4), round(base.y, 4), round(base.z, 4))) & 0xffffffff)
        for attempt in range(6):
            d = d0 if attempt == 0 else (Matrix.Rotation((rng_.random() - 0.5) * 1.4, 3, up) @ Matrix.Rotation((rng_.random() - 0.5) * 0.8, 3, d0.cross(up).normalized() if d0.cross(up).length > 1e-4 else Vector((1, 0, 0)))) @ d0
            side = d.cross(up)
            if side.length < 1e-5: side = d.orthogonal()
            side = side.normalized(); n = side.cross(d).normalized()
            c = base + d * (length * 0.5); r = max(length, width) * 0.55
            gid = (group if group is not None else rnd) if kind == 2 else None
            if self.free(c, n, r, gid) and all((c - q).length > r * 0.75 + rq + 0.003 for q, rq in getattr(self, "tube_pts", ()) if (q - base).length > 0.02):
                break
        else:
            return
        self.claim(c, n, r, gid)
        def at(t, s):
            w = math.sin(math.pi * (t ** tip)) * width * 0.5
            return base + d * (t * length) + side * (s * w) + n * (abs(s) * w * fold) - n * (droop * length * t * t)
        P = [at(0, 0), at(0.33, -1), at(0.33, 1), at(0.66, -1), at(0.66, 1), at(1.0, 0), at(0.5, 0)]
        U = [(0, 0), (length * 0.33, -width / 2), (length * 0.33, width / 2), (length * 0.66, -width / 2), (length * 0.66, width / 2), (length, 0), (length * 0.5, 0)]
        self.part(P, U, ((0, 1, 6), (0, 6, 2), (1, 3, 6), (2, 6, 4), (3, 5, 6), (6, 5, 4)), slot, rnd, base, kind)
    CELL = 0.06
    def _key(self, p): return (int(math.floor(p.x / self.CELL)), int(math.floor(p.y / self.CELL)), int(math.floor(p.z / self.CELL)))
    def free(self, c, n, r, group):
        g = getattr(self, "grid", None)
        if g is None: return True
        k = self._key(c); reach = int(math.ceil((r + 0.12) / self.CELL))
        for dx in range(-reach, reach + 1):
            for dy in range(-reach, reach + 1):
                for dz in range(-reach, reach + 1):
                    for (ci, ni, ri, gi) in g.get((k[0] + dx, k[1] + dy, k[2] + dz), ()):
                        lim = 0.9 if (group is not None and gi == group) else 0.766     # petals of one flower: only near-parallel ones
                        if (c - ci).length < (r + ri) * 0.95 and abs(n.dot(ni)) > lim:
                            return False
        return True
    def claim(self, c, n, r, group):
        if not hasattr(self, "grid"): self.grid = {}
        self.grid.setdefault(self._key(c), []).append((c, n, r, group))
    def prune_crossings(self):
        """the exact pass behind the cheap disc test: triangles of DIFFERENT parts that intersect at < 16 degrees (a band
        where they would z-fight) -> the later part (a leaf, a petal, a twig) is removed whole. Repeated until clean."""
        removed = 0
        for _ in range(4):
            bm = self.bm; bm.faces.ensure_lookup_table(); bm.normal_update()
            tree = BVHTree.FromBMesh(bm, epsilon=0.0015)
            kill = set()
            for i, j in tree.overlap(tree):
                if i >= j: continue
                fi, fj = bm.faces[i], bm.faces[j]
                pi, pj = fi[self.pid], fj[self.pid]
                if pi == pj or pi in kill or pj in kill: continue
                if set(fi.verts) & set(fj.verts): continue
                if abs(fi.normal.dot(fj.normal)) > math.cos(math.radians(16)):
                    kill.add(max(pi, pj))
            # coplanar overlaps are not intersections (the triangle test misses them): sample points of every face
            # against the faces within 1.5 mm
            cos16 = math.cos(math.radians(16))
            for f in bm.faces:
                pf = f[self.pid]
                if pf in kill: continue
                c = f.calc_center_median()
                for v in f.verts:
                    q = v.co.lerp(c, 0.25)
                    for (_, nrm, idx, dist) in tree.find_nearest_range(q, 0.0015):
                        g = bm.faces[idx]; pg = g[self.pid]
                        if pg == pf or pg in kill: continue
                        if abs(f.normal.dot(g.normal)) > cos16:
                            kill.add(max(pf, pg)); break
                    if pf in kill: break
            if not kill: break
            dead = [f for f in bm.faces if f[self.pid] in kill]
            bmesh.ops.delete(bm, geom=dead, context="FACES")
            removed += len(kill)
        print(self.name, "pruned parts:", removed)
    def finish(self, collection):
        self.prune_crossings()
        me = bpy.data.meshes.new(self.name); self.bm.to_mesh(me); self.bm.free()
        for s in SLOTS: me.materials.append(MATS[s])
        ob = bpy.data.objects.new(self.name, me); collection.objects.link(ob)
        return ob


def grow_branches(B, root, n_main, height, spread, rng, depth=2, leaf_fn=None, stem_r=0.012):
    """recursive branching: main stems from the root arching up and out, each with side twigs; leaf_fn(B, point,
    direction, twig_t) is called along the last-order twigs. Returns the twig tips."""
    tips = []
    def branch(p0, d0, L, r, level):
        pts, rad = [p0], [r]
        p, d = p0.copy(), d0.normalized()
        segs = max(3, int(L / 0.08))
        for i in range(segs):
            # phototropism up, noise wander
            wob = Vector((noise.noise(p * 3.1) , noise.noise(p * 3.1 + Vector((5, 1, 2))), noise.noise(p * 3.1 + Vector((1, 9, 4))) * 0.5))
            d = (d + Vector((0, 0, 0.12)) + wob * 0.35).normalized()
            p = p + d * (L / segs)
            pts.append(p.copy()); rad.append(r * (1 - 0.7 * (i + 1) / segs))
        if B.tube(pts, rad, "stem", sides=5 if level == 0 else 4, avoid=2 if level else 3) is False:
            return
        if level < depth:
            nkids = 3 + int(rng.random() * 3)
            for k in range(nkids):
                t = 0.35 + 0.6 * (k + rng.random() * 0.5) / nkids
                i = min(len(pts) - 2, int(t * (len(pts) - 1)))
                dd = (pts[i + 1] - pts[i]).normalized()
                out = dd.orthogonal().normalized(); out.rotate(Matrix.Rotation(rng.random() * 6.283, 3, dd))
                branch(pts[i] + out * rad[i] * 0.6, (dd * 0.45 + out * 0.9), L * (0.45 + 0.2 * rng.random()), rad[i] * 0.6, level + 1)
        if level == depth and leaf_fn:
            for i in range(1, len(pts)):
                leaf_fn(B, pts[i], (pts[i] - pts[i - 1]).normalized(), i / (len(pts) - 1))
            tips.append(pts[-1])
        elif level < depth:
            tips.append(pts[-1])
    for m in range(n_main):
        a = 2 * math.pi * (m + rng.random() * 0.6) / n_main
        d = Vector((math.cos(a) * spread, math.sin(a) * spread, 1.0))
        branch(root + Vector((math.cos(a), math.sin(a), 0)) * 0.06, d, height * (0.75 + 0.3 * rng.random()), stem_r, 0)
    return tips


def shell(B, centre, radii, lump, rng, slot="leaf_mass", subdiv=3, flat_bottom=0.0):
    """a lumpy closed crown surface (an icosphere displaced by noise), for box balls and the far variants"""
    bm = bmesh.new(); bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=1.0)
    seed = Vector((rng.random() * 50, rng.random() * 50, rng.random() * 50))
    for v in bm.verts:
        n = v.co.normalized()
        k = 1 + lump * (noise.noise(n * 2.3 + seed) + 0.5 * noise.noise(n * 5.7 + seed))
        p = Vector((n.x * radii[0], n.y * radii[1], n.z * radii[2])) * k
        if p.z < -radii[2] * (1 - flat_bottom): p.z = -radii[2] * (1 - flat_bottom) + (p.z + radii[2] * (1 - flat_bottom)) * 0.15
        v.co = centre + p
    bm.verts.index_update()
    P = [v.co.copy() for v in bm.verts]
    U = [((p.x - centre.x) + (p.y - centre.y) * 0.7, p.z - centre.z) for p in P]
    B.part(P, U, [tuple(v.index for v in f.verts) for f in bm.faces], slot, 0.5, centre, 3)
    bm.free()


def leaf_scatter_on_shell(B, centre, radii, n, rng, size, slot="leaf"):
    for i in range(n):
        u, v = rng.random() * 2 - 1, rng.random() * 6.283
        n_ = Vector((math.sqrt(1 - u * u) * math.cos(v), math.sqrt(1 - u * u) * math.sin(v), u))
        if n_.z < -0.5: continue
        p = centre + Vector((n_.x * radii[0], n_.y * radii[1], n_.z * radii[2])) * (1.0 + 0.04 * rng.random())
        d = (n_ + Vector((rng.random() - 0.5, rng.random() - 0.5, rng.random() - 0.5)) * 1.2).normalized()
        B.leaf(p - n_ * size * 0.1, d, n_ if abs(n_.z) < 0.95 else Vector((1, 0, 0)), size, size * 0.55, slot, droop=0.05, fold=0.1)


# --------------------------------------------------------------------------------------------- the plants
COL = bpy.data.collections.new("plants"); scn.collection.children.link(COL)
O = Vector((0, 0, 0))
made = {}

def box_ball():
    rng = random.Random(1); B = Builder("box_ball")
    c, r = Vector((0, 0, 0.36)), (0.36, 0.36, 0.33)
    shell(B, c, r, 0.05, rng, subdiv=4, flat_bottom=0.25)
    leaf_scatter_on_shell(B, c, r, 900, rng, 0.022)
    B.tube([Vector((0, 0, -0.02)), Vector((0, 0, 0.08))], [0.025, 0.02], "stem")
    return B.finish(COL)

def box_ball_far():
    rng = random.Random(1); B = Builder("box_ball_far")
    shell(B, Vector((0, 0, 0.36)), (0.37, 0.37, 0.34), 0.05, rng, subdiv=3, flat_bottom=0.25)
    return B.finish(COL)

def laurel():
    rng = random.Random(2); B = Builder("laurel")
    def lf(B, p, d, t):
        if rng.random() < 0.45: return
        for s in (-1, 1):
            if rng.random() < 0.3: continue
            side = d.orthogonal().normalized(); side.rotate(Matrix.Rotation(rng.random() * 6.28, 3, d))
            dd = (d * 0.5 + side * 0.9 + Vector((0, 0, 0.15))).normalized()
            B.leaf(p, dd, Vector((0, 0, 1)), 0.11 + 0.05 * rng.random(), 0.045, droop=0.15, fold=0.12)
    grow_branches(B, O, 7, 1.15, 0.55, rng, depth=2, leaf_fn=lf, stem_r=0.016)
    return B.finish(COL)

def rhododendron():
    rng = random.Random(3); B = Builder("rhododendron")
    tips = []
    def lf(B, p, d, t):
        if t > 0.8:
            for k in range(6):
                a = k / 6 * 6.283 + rng.random() * 0.3
                side = Vector((math.cos(a), math.sin(a), 0))
                B.leaf(p, (side + d * 0.3 + Vector((0, 0, 0.1))).normalized(), Vector((0, 0, 1)), 0.1 + 0.03 * rng.random(), 0.035, droop=0.2)
    tips = grow_branches(B, O, 6, 0.95, 0.6, rng, depth=2, leaf_fn=lf, stem_r=0.015)
    for k, tp in enumerate(tips):
        if k % 3: continue
        # a truss: 10 funnel flowers round a ball
        rr = rng.random()
        for f in range(10):
            u, v = rng.random() * 0.8 + 0.2, rng.random() * 6.283
            dn = Vector((math.sqrt(1 - u * u) * math.cos(v), math.sqrt(1 - u * u) * math.sin(v), u))
            fc = tp + dn * 0.06 + Vector((0, 0, 0.03))
            for pi in range(5):
                a = pi / 5 * 6.283
                side = dn.orthogonal().normalized(); side.rotate(Matrix.Rotation(a, 3, dn))
                B.leaf(fc, (dn * 0.6 + side).normalized(), dn, 0.035, 0.03, "flower_a", droop=-0.15, fold=0.3, rnd=rr, kind=2, group=(k, f))
    return B.finish(COL)

def hydrangea():
    rng = random.Random(4); B = Builder("hydrangea")
    def lf(B, p, d, t):
        if rng.random() < 0.55: return
        side = d.orthogonal().normalized(); side.rotate(Matrix.Rotation(rng.random() * 6.28, 3, d))
        for s in (-1, 1):
            B.leaf(p, (side * s + d * 0.3).normalized(), Vector((0, 0, 1)), 0.1 + 0.04 * rng.random(), 0.07, droop=0.25, fold=0.15)
    tips = grow_branches(B, O, 8, 0.7, 0.75, rng, depth=1, leaf_fn=lf, stem_r=0.012)
    for k, tp in enumerate(tips[:9]):
        rr = rng.random(); c = tp + Vector((0, 0, 0.05)); R = 0.09 + 0.03 * rng.random()
        for f in range(70):
            u, v = rng.random() * 1.6 - 0.6, rng.random() * 6.283
            dn = Vector((math.sqrt(max(0, 1 - u * u)) * math.cos(v), math.sqrt(max(0, 1 - u * u)) * math.sin(v), u)).normalized()
            fc = c + dn * R * (1.0 + 0.22 * (f % 5) / 4)          # florets in layers: none share a tangent plane
            for pi in range(4):
                side = dn.orthogonal().normalized(); side.rotate(Matrix.Rotation(pi / 4 * 6.283 + rng.random() * 0.2, 3, dn))
                B.leaf(fc, (side + dn * 0.45).normalized(), dn, 0.017, 0.016, "flower_a", droop=0.0, fold=0.2, rnd=rr, kind=2, tip=0.9, group=(k, f))
    return B.finish(COL)

def rose():
    rng = random.Random(5); B = Builder("rose")
    def lf(B, p, d, t):
        if rng.random() < 0.6: return
        side = d.orthogonal().normalized(); side.rotate(Matrix.Rotation(rng.random() * 6.28, 3, d))
        stalk = (side + d * 0.4).normalized()
        for j in range(5):          # pinnate leaf: 5 leaflets
            q = p + stalk * (0.015 * j)
            for s in ((-1, 1) if j < 4 else (0,)):
                dd = (stalk + side.cross(Vector((0, 0, 1))).normalized() * s * 0.9).normalized() if s else stalk
                B.leaf(q, dd, Vector((0, 0, 1)), 0.035, 0.022, droop=0.1, fold=0.15)
    tips = grow_branches(B, O, 6, 0.8, 0.4, rng, depth=1, leaf_fn=lf, stem_r=0.009)
    for k, tp in enumerate(tips[:9]):
        rr = rng.random(); c = tp + Vector((0, 0, 0.02))
        for ring, (n, L, up) in enumerate(((5, 0.04, 0.45), (5, 0.034, 1.0), (4, 0.027, 1.7), (3, 0.02, 2.9))):
            for pi in range(n):
                a = (pi + ring * 0.5) / n * 6.283
                side = Vector((math.cos(a), math.sin(a), 0))
                B.leaf(c + Vector((0, 0, 0.008 * ring)), (side + Vector((0, 0, up))).normalized(), Vector((0, 0, 1)), L, L * 0.95, "flower_a", droop=-0.2, fold=0.35, rnd=rr, kind=2, tip=0.8)
    return B.finish(COL)

def lavender():
    rng = random.Random(6); B = Builder("lavender")
    for i in range(140):        # basal leaves: narrow, grey
        a = rng.random() * 6.283; r = rng.random() * 0.12
        p = Vector((math.cos(a) * r, math.sin(a) * r, 0.02 + rng.random() * 0.15))
        d = Vector((math.cos(a) * 0.6, math.sin(a) * 0.6, 1.0)).normalized()
        B.leaf(p, d, Vector((0, 0, 1)) if abs(d.z) < 0.95 else Vector((1, 0, 0)), 0.05, 0.007, droop=0.1, fold=0.0)
    for i in range(70):         # spikes
        a = rng.random() * 6.283; r = rng.random() * 0.1; rr = rng.random()
        p0 = Vector((math.cos(a) * r, math.sin(a) * r, 0.12))
        top = p0 + Vector((math.cos(a) * (0.08 + r), math.sin(a) * (0.08 + r), 0.3 + rng.random() * 0.12))
        mid = (p0 + top) / 2 + Vector((0, 0, 0.03))
        B.tube([p0, mid, top], [0.0025, 0.002, 0.0018], "stem", sides=3, rnd=rr, kind=2)
        d = (top - mid).normalized()
        sp = [top + d * (0.012 * j) for j in range(7)]
        B.tube(sp, [0.006 + 0.002 * math.sin(j * 1.7) for j in range(6)] + [0.002], "flower_a", sides=5, rnd=rr, kind=2)
    return B.finish(COL)

def bulbs():
    rng = random.Random(7); B = Builder("bulbs")
    for i in range(12):
        tulip = i % 2 == 0
        a = rng.random() * 6.283; r = 0.04 + rng.random() * 0.14; rr = rng.random()
        p0 = Vector((math.cos(a) * r, math.sin(a) * r, 0))
        h = (0.38 if tulip else 0.33) + rng.random() * 0.06
        top = p0 + Vector((rng.random() * 0.04 - 0.02, rng.random() * 0.04 - 0.02, h))
        B.tube([p0, (p0 + top) / 2, top], [0.004, 0.0035, 0.003], "stem", sides=4, rnd=rr, kind=2)
        for k in range(2):      # leaves: broad (tulip) / strap (daffodil)
            la = a + k * 3.1 + rng.random()
            dd = Vector((math.cos(la) * 0.35, math.sin(la) * 0.35, 1)).normalized()
            B.leaf(p0, dd, Vector((0, 0, 1)), 0.2 + 0.06 * rng.random(), 0.06 if tulip else 0.018, droop=0.25, fold=0.3)
        slot = "flower_a" if tulip else "flower_b"
        if tulip:
            for pi in range(6):
                ang = pi / 6 * 6.283
                side = Vector((math.cos(ang), math.sin(ang), 0))
                B.leaf(top, (side * 0.35 + Vector((0, 0, 1))).normalized(), side, 0.055, 0.045, slot, droop=-0.08, fold=0.4, rnd=rr, kind=2, tip=0.8)
        else:
            nod = Vector((math.cos(a), math.sin(a), 0.4)).normalized()
            fc = top + nod * 0.01
            for pi in range(6):
                side = nod.orthogonal().normalized(); side.rotate(Matrix.Rotation(pi / 6 * 6.283, 3, nod))
                B.leaf(fc, (side + nod * 0.1).normalized(), nod, 0.035, 0.022, slot, droop=0.0, fold=0.1, rnd=rr, kind=2)
            ring = [fc + nod * (0.004 * j) for j in range(6)]
            B.tube(ring, [0.009, 0.01, 0.011, 0.012, 0.013, 0.014], "flower_centre", sides=7, rnd=rr, kind=2)
    return B.finish(COL)

def geranium():
    rng = random.Random(8); B = Builder("geranium")
    for i in range(45):
        a = rng.random() * 6.283; r = rng.random() * 0.13
        p = Vector((math.cos(a) * r * 0.5, math.sin(a) * r * 0.5, 0.03 + rng.random() * 0.1))
        tip = p + Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, 0.06))
        mid = (p - Vector((0, 0, 0.05)) + tip) / 2
        if B.tube([p - Vector((0, 0, 0.05)), mid, tip], [0.003, 0.0025, 0.002], "stem", sides=3, avoid=1) is False:
            continue
        d = Vector((math.cos(a), math.sin(a), -0.1 + 0.7 * rng.random())).normalized()
        up = Vector((-math.sin(a), math.cos(a), 0)).cross(d).normalized()
        B.leaf(tip, d, up, 0.06 + 0.02 * rng.random(), 0.075, droop=0.05, fold=0.3, tip=0.9)
    for u in range(6):
        a = u / 6 * 6.283 + rng.random() * 0.4; rr = rng.random()
        p0 = Vector((math.cos(a) * 0.04, math.sin(a) * 0.04, 0.08))
        top = Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.27 + rng.random() * 0.06))
        if B.tube([p0, (p0 + top) / 2 + Vector((0, 0, 0.02)), top], [0.0025, 0.002, 0.002], "stem", sides=3, rnd=rr, kind=2, avoid=1) is False:
            continue
        for f in range(14):
            uu, vv = rng.random() * 0.9 + 0.1, rng.random() * 6.283
            dn = Vector((math.sqrt(1 - uu * uu) * math.cos(vv), math.sqrt(1 - uu * uu) * math.sin(vv), uu))
            fc = top + dn * 0.025 * (1.0 + 0.3 * (f % 4) / 3)
            for pi in range(5):
                side = dn.orthogonal().normalized(); side.rotate(Matrix.Rotation(pi / 5 * 6.283, 3, dn))
                B.leaf(fc, (side + dn * 0.4).normalized(), dn, 0.012, 0.011, "flower_a", droop=0.0, fold=0.25, rnd=rr, kind=2, tip=0.9, group=(u, f))
    return B.finish(COL)

def far_shell(name, c, r, lump, seed):
    rng = random.Random(seed); B = Builder(name + "_far")
    shell(B, c, r, lump, rng, subdiv=3, flat_bottom=0.3)
    return B.finish(COL)

objs = [box_ball(), box_ball_far(), laurel(), far_shell("laurel", Vector((0, 0, 0.75)), (0.75, 0.75, 0.7), 0.12, 2),
        rhododendron(), far_shell("rhododendron", Vector((0, 0, 0.62)), (0.7, 0.7, 0.55), 0.12, 3),
        hydrangea(), far_shell("hydrangea", Vector((0, 0, 0.45)), (0.6, 0.6, 0.42), 0.1, 4),
        rose(), far_shell("rose", Vector((0, 0, 0.42)), (0.4, 0.4, 0.38), 0.15, 5),
        lavender(), far_shell("lavender", Vector((0, 0, 0.22)), (0.25, 0.25, 0.22), 0.1, 6),
        bulbs(), geranium()]

# --------------------------------------------------------------------------------------------- AO (Cycles) -> UV1.x
scn.render.engine = "CYCLES"; scn.cycles.device = "CPU"; scn.cycles.samples = 24
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 0.35
ground = bpy.data.meshes.new("g"); bmg = bmesh.new(); bmesh.ops.create_grid(bmg, x_segments=1, y_segments=1, size=3); bmg.to_mesh(ground); bmg.free()
gob = bpy.data.objects.new("ground_occ", ground); COL.objects.link(gob)
stats = {}
for ob in objs:
    me = ob.data
    for o in scn.objects: o.select_set(False)
    ob.select_set(True); bpy.context.view_layer.objects.active = ob
    for o2 in objs: o2.hide_render = o2 is not ob
    ao = me.color_attributes.new("AOc", "FLOAT_COLOR", "CORNER"); me.color_attributes.active_color = ao
    bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    a = [0.0] * (4 * len(me.loops)); ao.data.foreach_get("color", a)
    uv1 = me.uv_layers["AO"]
    for i, l in enumerate(uv1.data):
        l.uv = (0.25 + 0.75 * a[4 * i], l.uv[1])
    me.color_attributes.remove(ao)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    zs = [v.co.z for v in me.vertices]
    stats[ob.name] = {"triangles": tris, "height": round(max(zs), 3), "ao_mean": round(sum(a[0::4]) / max(1, len(a) // 4), 3)}
    print(ob.name, stats[ob.name])
bpy.data.objects.remove(gob)
for o2 in objs: o2.hide_render = False

# leaves and petals: smooth within a leaf (the fold reads as a soft crease); shells smooth; stems smooth
for o in scn.objects: o.select_set(False)
for ob in objs: ob.select_set(True)
glb = os.path.join(OUT, "plants.raw.glb")      # packed by tools/foliage_pack.mjs -> plants.glb
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_normals=True, export_texcoords=True, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
json.dump({"asset": "garden plants (tools/blender/plants.py)", "plants": stats,
           "attributes": "UV0 metres; UV1 = (AO, random per leaf); UV2 = (base x, base y); UV3 = (base z, kind 0 stem 1 leaf 2 flower 3 shell), glTF frame",
           "slots": SLOTS}, open(os.path.join(OUT, "plants.json"), "w"), indent=1)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")
