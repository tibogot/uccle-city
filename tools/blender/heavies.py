"""THE TRAFFIC'S SERVICE VEHICLES (claude/trafmix, docs/TRAFMIX.md): the city bus, the ambulance, the fire engine, the
bin lorry and the patrol car with its light bar, scripted at the fleet's quality (tools/blender/cars2.py contract:
COLOR_0 = palette x baked AO, _KIND, one material, AUTHORED LODs Body / Wheel_* (LOD0), *_L1, *_L2).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/heavies.py -- models/cars [--only bus,fire] [--no-bake] [--samples 64]
      -> models/cars/heavy.glb
    Look: ... -P tools/blender/carSheet.py -- models/cars/heavy.glb docs/trafmix/sheet [--lod 1] [--night] [--close]

It runs cars2.py's definitions (palette, mesh builder, wheels, the police estate's body, normals, AO bake, the GLB
writer: everything above cars2.py's "main" line) and adds:
  - SHELL PARTS: boxes cut by planes at every region edge (windows, livery blocks, bands, arch limits), so every colour /
    glass edge is a real mesh edge on a FLAT panel (flat normals on planes: weighted normals keep them flat); the outer
    corners rounded by a 3-segment bevel (LOD0; 1 segment LOD1; none LOD2); openings (windows, door glass) as holes with
    a reveal down to an INNER shell (normals inward, interior colour), the glass set 15 mm in: the see-through glass
    shows a cab / saloon with seats, never the inside of a box; wheel arches as notches lined by a well (4 faces).
  - a light raked front (a smooth shear of the part's front metre), bonnet + windscreen rake for the ambulance's van cab;
  - lamps as small bevelled housings with a lens face (head kind 2, tail kind 3: the traffic's light bits light them),
    BEACONS as a new kind 9 (blue lens, flashed by the traffic shader when the vehicle runs with lights: bit 2), the
    bus's amber destination display (kind 2: lit at night like a lamp).
Liveries are plain colour schemes, no logo, no lettering: the Belgian ambulance (fluorescent yellow, green / yellow
Battenburg), the Brussels fire engine (red, white band, red / yellow rear blocks), the city bus (paint per instance:
the traffic gives STIB silver-grey or De Lijn yellow; dark window band, black skirt), the bin lorry (white, an orange
band, orange / white rear blocks), the police estate (cars2's) + a blue light bar.
"""
import bpy, bmesh, math, os, sys, random, time
import numpy as np
from mathutils import Vector

HERE = os.path.dirname(os.path.abspath(__file__))
SRC = open(os.path.join(HERE, "cars2.py"), encoding="utf8").read()
CUT = SRC.index("# ------------------------------------------------------------------------------------------------ main")
# the extra palette entries (before the material list is made)
EXTRA_PAL = '''    ("beacon", 9, (0.010, 0.040, 0.42)),           # blue beacon lens (kind 9: flashed by the traffic shader)
    ("amb_yellow", 0, (0.42, 0.62, 0.0)),          # Belgian ambulance: fluorescent yellow-green, kind 0 (no clear coat / metal sheen); trafmixGate checks it through grade + ACES
    ("amb_green", 0, (0.0, 0.32, 0.06)),           # its green
    ("fire_white", 0, (0.82, 0.82, 0.80)),         # reflective white band
    ("fire_yellow", 0, (0.85, 0.62, 0.01)),        # rear blocks
    ("shutter", 5, (0.42, 0.43, 0.44)),            # aluminium roller shutters (chrome kind: metal)
    ("shutter_gap", 0, (0.05, 0.05, 0.055)),       # their grooves
    ("orange", 0, (0.85, 0.30, 0.02)),             # bin lorry band / rear blocks
    ("dest", 2, (0.95, 0.55, 0.05)),               # bus destination display (amber LED, lit at night)
    ("bus_dark", 0, (0.018, 0.019, 0.021)),        # window band, skirt
    ("grab", 0, (0.75, 0.55, 0.03)),               # bus grab poles (yellow)
'''
mark = "]\nM = {n: i for i, (n, _, _) in enumerate(PAL)}"
assert mark in SRC
SRC = SRC[:CUT].replace(mark, EXTRA_PAL + mark)
SRC = SRC.replace('generator=f"uccle-city tools/blender/cars2.py"', 'generator="uccle-city tools/blender/heavies.py"')
G = {"__name__": "cars2_defs", "__file__": os.path.join(HERE, "cars2.py")}
exec(compile(SRC, "cars2.py", "exec"), G)
globals().update({k: v for k, v in G.items() if not k.startswith("__")})
NAME = arg("--name", "heavy")

# ------------------------------------------------------------------------------------------------ geometry helpers
def bl(p): return (p[0], -p[2], p[1])                   # car (x left, y up, z forward) -> Blender
def car(v): return (v[0], v[2], -v[1])                  # Blender -> car

def clamp01(t): return 0.0 if t < 0 else 1.0 if t > 1 else t
DETAIL = [0]                                            # the level being built (Shell.obj merges at 1 / 2)

class Shell:
    """One box part in car coords, cut at planes, its corner edges bevelled, regions coloured, openings / arches made.
    x0..x1 (x is the vehicle's LEFT), y0..y1, z0..z1. cuts: {"x": [...], "y": [...], "z": [...]} extra planes."""
    def __init__(self, x0, x1, y0, y1, z0, z1, cuts=None, bevel=0.06, segs=3, edges="vt", name="part"):
        self.b = (x0, x1, y0, y1, z0, z1); self.name = name
        bm = self.bm = bmesh.new()
        V = {}
        for ix, x in enumerate((x0, x1)):
            for iy, y in enumerate((y0, y1)):
                for iz, z in enumerate((z0, z1)):
                    V[(ix, iy, iz)] = bm.verts.new(bl((x, y, z)))
        F = [[(0,0,0),(0,1,0),(1,1,0),(1,0,0)], [(0,0,1),(1,0,1),(1,1,1),(0,1,1)], [(0,0,0),(1,0,0),(1,0,1),(0,0,1)],
             [(0,1,0),(0,1,1),(1,1,1),(1,1,0)], [(0,0,0),(0,0,1),(0,1,1),(0,1,0)], [(1,0,0),(1,1,0),(1,1,1),(1,0,1)]]
        fs = [bm.faces.new([V[k] for k in q]) for q in F]
        bmesh.ops.recalc_face_normals(bm, faces=fs)
        # the corner edges to round: "v" vertical (front / rear corners), "t" top (roof edges), "b" bottom, "f" front frame
        sel = []
        for e in bm.edges:
            a, c = car(e.verts[0].co), car(e.verts[1].co)
            d = [abs(a[k] - c[k]) for k in range(3)]
            ax = d.index(max(d))
            top = min(a[1], c[1]) > y1 - 1e-6; bot = max(a[1], c[1]) < y0 + 1e-6
            if ax == 1 and "v" in edges: sel.append(e)
            elif ax != 1 and top and "t" in edges: sel.append(e)
            elif ax != 1 and bot and "b" in edges: sel.append(e)
        if bevel > 0 and segs > 0 and sel:
            bmesh.ops.bevel(bm, geom=sel + list({v for e in sel for v in e.verts}), offset=bevel, segments=segs, affect="EDGES", profile=0.5, clamp_overlap=True)
        cuts = cuts or {}
        for k, vals in cuts.items():
            for c in sorted(set(round(v, 5) for v in vals)):
                if k == "x": co, no = (c, 0, 0), (1, 0, 0)
                elif k == "y": co, no = (0, 0, c), (0, 0, 1)
                else: co, no = (0, -c, 0), (0, 1, 0)
                geom = bm.verts[:] + bm.edges[:] + bm.faces[:]
                bmesh.ops.bisect_plane(bm, geom=geom, plane_co=co, plane_no=no, dist=1e-5)
        bm.normal_update()
        self.mat = {}
    def faces(self):
        for f in self.bm.faces:
            c = car(f.calc_center_median()); n = car(f.normal)
            yield f, c, n
    def paint(self, fn):
        """fn(centre, normal) -> palette name (or None: keep)"""
        for f, c, n in self.faces():
            m = fn(c, n)
            if m: f.material_index = M[m]
    def side(self, n, t=0.85):
        """which outer face a normal points to: 'L' (+x), 'R' (-x), 'T', 'B', 'F' (+z), 'K' (back)"""
        if n[0] > t: return "L"
        if n[0] < -t: return "R"
        if n[1] > t: return "T"
        if n[1] < -t: return "B"
        if n[2] > t: return "F"
        if n[2] < -t: return "K"
        return None
    def shear(self, fn):
        """move every vertex by fn(x, y, z) -> (dx, dy, dz) (car coords)"""
        for v in self.bm.verts:
            x, y, z = car(v.co); d = fn(x, y, z)
            v.co = Vector(bl((x + d[0], y + d[1], z + d[2])))
        self.bm.normal_update()
    def openings(self, is_open):
        """Faces where is_open(centre, normal, side): each connected group merged into one face, recorded (its loop +
        normal: the glass) and removed; obj(thick) gives the shell its wall thickness (the reveals = the rims)."""
        bm = self.bm
        hole = {f for f, c, n in self.faces() if is_open(c, n, self.side(n))}
        self.holes = getattr(self, "holes", [])
        while hole:
            f0 = hole.pop(); grp = [f0]; todo = [f0]
            while todo:
                f = todo.pop()
                for e in f.edges:
                    for g in e.link_faces:
                        if g in hole and g.normal.dot(f0.normal) > 0.999: hole.discard(g); grp.append(g); todo.append(g)
            if len(grp) > 1:
                r = bmesh.ops.dissolve_faces(bm, faces=grp, use_verts=False)
                grp = r["region"]
            for f in grp:
                self.holes.append(([v.co.copy() for v in f.verts], f.normal.copy()))
            bmesh.ops.delete(bm, geom=grp, context="FACES_ONLY")
    def _wall(self, axis, val, u, v, want):
        """an n-gon on the plane axis = val (car coords; axis 0 x, 1 y, 2 z) over the rectangle u = (a, b), v = (c, d) of
        the two other axes, through every existing vertex on its outline (no T-junction with the cut panels round it)"""
        bm = self.bm
        oth = [k for k in range(3) if k != axis]
        pts = {}
        for vv in bm.verts:
            p = car(vv.co)
            if abs(p[axis] - val) > 2e-4: continue
            pu, pv = p[oth[0]], p[oth[1]]
            inu = u[0] - 2e-4 <= pu <= u[1] + 2e-4; inv = v[0] - 2e-4 <= pv <= v[1] + 2e-4
            onb = (abs(pu - u[0]) < 2e-4 or abs(pu - u[1]) < 2e-4 or abs(pv - v[0]) < 2e-4 or abs(pv - v[1]) < 2e-4)
            if inu and inv and onb: pts[(round(pu, 4), round(pv, 4))] = vv
        for cu in u:
            for cv in v:
                k = (round(cu, 4), round(cv, 4))
                if k not in pts:
                    p = [0, 0, 0]; p[axis] = val; p[oth[0]] = cu; p[oth[1]] = cv
                    pts[k] = bm.verts.new(bl(p))
        W, H = u[1] - u[0], v[1] - v[0]
        def tpar(k):
            pu, pv = k
            if abs(pv - v[0]) < 2e-4: return (pu - u[0]) / W
            if abs(pu - u[1]) < 2e-4: return 1 + (pv - v[0]) / H
            if abs(pv - v[1]) < 2e-4: return 2 + (u[1] - pu) / W
            return 3 + (v[1] - pv) / H
        ring = [pts[k] for k in sorted(pts, key=tpar)]
        try: f = bm.faces.new(ring)
        except ValueError: return
        f.material_index = M[self.liner]; f.normal_update()
        if f.normal.dot(Vector(bl(want))) < 0: f.normal_flip()
    def notch(self, za, zb, ytop, sidew=0.40, liner="liner"):
        """a wheel arch: the side faces of both sides between za..zb under ytop are removed and the bottom's between
        x0 + sidew / x1 - sidew too (the cuts must exist: x at x0 + sidew, x1 - sidew, y at ytop, z at za / zb); a well of
        4 faces each side closes it (n-gons through the cut panels' vertices)."""
        x0, x1, y0, y1, z0, z1 = self.b
        bm = self.bm
        self.liner = liner
        dead = []
        for f, c, n in self.faces():
            if not (za - 1e-4 < c[2] < zb + 1e-4) or c[1] > ytop + 1e-4: continue
            s = self.side(n, 0.5)
            if s in ("L", "R"): dead.append(f)
            elif s == "B" and (c[0] > x1 - sidew - 1e-4 or c[0] < x0 + sidew + 1e-4): dead.append(f)
        bmesh.ops.delete(bm, geom=dead, context="FACES_ONLY")
        for sd in (1, -1):
            xo = x1 if sd > 0 else x0
            xi = xo - sd * sidew
            xa, xb = min(xo, xi), max(xo, xi)
            self._wall(1, ytop, (xa, xb), (za, zb), (0, -1, 0))          # ceiling, faces down
            self._wall(2, zb, (xa, xb), (y0, ytop), (0, 0, -1))          # front wall, faces back
            self._wall(2, za, (xa, xb), (y0, ytop), (0, 0, 1))           # rear wall, faces forward
            self._wall(0, xi, (y0, ytop), (za, zb), (sd, 0, 0))          # inner wall, faces out
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    def arch(self, za, zb, ytop, yc, mat="paint", lip="trim", n=None):
        """A ROUNDED wheel arch in a notch (claude/trafmix polish): on both sides, the notch's rectangle minus the arch
        opening (a semicircle over the wheel centre, radius Ra, straight sides down) is closed by ONE flat n-gon in the
        side plane through every vertex already on the notch's outline (no T-junction), in `mat` (the skirt follows the
        arch); a rounded lip (a half-round bead swept along the arc, ends capped) in `lip`. The well behind stays."""
        x0, x1, y0, y1, z0, z1 = self.b
        bm = self.bm
        d = DETAIL[0]
        n = n or (14 if d == 0 else 6 if d == 1 else 5)
        c = (za + zb) / 2
        Ra = min((zb - za) / 2 - 0.03, ytop - yc - 0.025)
        for sd in (1, -1):
            xo = x1 if sd > 0 else x0
            pts = {}
            for vv in bm.verts:
                p = car(vv.co)
                if abs(p[0] - xo) > 2e-4 or not (za - 2e-4 <= p[2] <= zb + 2e-4) or not (y0 - 2e-4 <= p[1] <= ytop + 2e-4): continue
                onL, onR, onT = abs(p[2] - za) < 2e-4, abs(p[2] - zb) < 2e-4, abs(p[1] - ytop) < 2e-4
                if onL or onR or onT: pts[(round(p[2], 4), round(p[1], 4))] = vv
            for k in [(round(za, 4), round(y0, 4)), (round(za, 4), round(ytop, 4)), (round(zb, 4), round(ytop, 4)), (round(zb, 4), round(y0, 4))]:
                if k not in pts: pts[k] = bm.verts.new(bl((xo, k[1], k[0])))
            L = sorted([k for k in pts if abs(k[0] - za) < 2e-4], key=lambda k: k[1])
            T = sorted([k for k in pts if abs(k[1] - ytop) < 2e-4 and za + 2e-4 < k[0] < zb - 2e-4], key=lambda k: k[0])
            Rr = sorted([k for k in pts if abs(k[0] - zb) < 2e-4], key=lambda k: -k[1])
            ring = [pts[k] for k in L + T + Rr]
            ring.append(bm.verts.new(bl((xo, y0, c + Ra))))
            arc = []
            for q in range(n + 1):
                t = math.pi * q / n
                v = bm.verts.new(bl((xo, yc + Ra * math.sin(t), c + Ra * math.cos(t)))); arc.append(v)
            ring += arc
            ring.append(bm.verts.new(bl((xo, y0, c - Ra))))
            try: f = bm.faces.new(ring)
            except ValueError: continue
            f.material_index = M[mat]; f.normal_update()
            if f.normal.dot(Vector(bl((sd, 0, 0)))) < 0: f.normal_flip()
            # the lip: a half-round bead on the panel round the arc (LOD2: none)
            if d < 2:
                if not hasattr(self, "lips"): self.lips = MB()
                bm = self.lips.bm
                prof = [(-0.004, 0.0), (0.006, 0.02), (0.03, 0.026), (0.05, 0.0)] if d == 0 else [(-0.004, 0.0), (0.02, 0.024), (0.05, 0.0)]
                rows = []
                for q in range(n + 1):
                    t = math.pi * q / n
                    rows.append([bm.verts.new(bl((xo + sd * hx, yc + (Ra + r) * math.sin(t), c + (Ra + r) * math.cos(t)))) for r, hx in prof])
                for q in range(n):
                    for k in range(len(prof) - 1):
                        g = bm.faces.new([rows[q][k], rows[q + 1][k], rows[q + 1][k + 1], rows[q][k + 1]]); g.material_index = M[lip]
                        g.normal_update()
                        mid = (rows[q][k].co + rows[q + 1][k + 1].co) / 2
                        if g.normal.dot(Vector(bl((sd, 0, 0)))) < -0.2: g.normal_flip()
                for row, t in ((rows[0], 0.0), (rows[-1], math.pi)):
                    g = bm.faces.new(row); g.material_index = M[lip]; g.normal_update()
                    want = Vector(bl((0, 0, -1 if t == 0 else 1))) if False else Vector(bl((0, -1, 0)))
                    if g.normal.dot(want) < 0: g.normal_flip()
                bm = self.bm
        bmesh.ops.remove_doubles(self.bm, verts=self.bm.verts, dist=1e-4)
    def drop(self, fn):
        """remove faces where fn(centre, normal, side)"""
        dead = [f for f, c, n in self.faces() if fn(c, n, self.side(n))]
        bmesh.ops.delete(self.bm, geom=dead, context="FACES_ONLY")
    def obj(self, thick=0.0, glass_in=0.012, glass="glass", reveal="rubber", inner="interior", merge=None):
        """-> [shell] or [shell, glass]: with thick > 0 the shell gets its wall (Solidify inward, even, with rims: the
        openings' reveals in `reveal`, the inside in `inner`, normals inward: the cab / saloon seen through the glass)"""
        bm = self.bm
        bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
        bmesh.ops.dissolve_degenerate(bm, dist=1e-6, edges=bm.edges[:])
        # LOD1 / LOD2: the cut grid's coplanar faces of one colour merged back into n-gons (LOD0 keeps the grid: its
        # vertices carry the baked AO)
        if merge if merge is not None else DETAIL[0] > 0:
            bmesh.ops.dissolve_limit(bm, angle_limit=math.radians(0.3), verts=bm.verts[:], edges=bm.edges[:], delimit={"MATERIAL"})
        me = bpy.data.meshes.new(self.name); bm.to_mesh(me); bm.free()
        for m in MATS: me.materials.append(m)
        o = bpy.data.objects.new(self.name, me); scn.collection.objects.link(o)
        out = [o]
        if thick > 0:
            o.vertex_groups.new(name="shell"); o.vertex_groups.new(name="rim")
            mod = o.modifiers.new("solid", "SOLIDIFY")
            mod.thickness = thick; mod.offset = -1; mod.use_even_offset = False; mod.use_rim = True; mod.use_quality_normals = True
            mod.shell_vertex_group = "shell"; mod.rim_vertex_group = "rim"
            with bpy.context.temp_override(object=o, active_object=o, selected_objects=[o], selected_editable_objects=[o]):
                bpy.ops.object.modifier_apply(modifier=mod.name)
            me = o.data
            gi_s = o.vertex_groups["shell"].index
            ins = np.zeros(len(me.vertices), bool)
            for v in me.vertices:
                for g in v.groups:
                    if g.weight > 0.5 and g.group == gi_s: ins[v.index] = True
            for p in me.polygons:
                vs = list(p.vertices)
                if all(ins[i] for i in vs): p.material_index = M[inner]
                elif any(ins[i] for i in vs): p.material_index = M[reveal]
            o.vertex_groups.clear()
        holes = getattr(self, "holes", [])
        if holes:
            mb = MB()
            for vs, n in holes:
                gl = [mb.bm.verts.new(v - n * glass_in) for v in vs]
                try: f = mb.bm.faces.new(gl)
                except ValueError: continue
                f.material_index = M[glass]; f.normal_update()
                if f.normal.dot(n) < 0: f.normal_flip()
            out.append(mb.obj(self.name + "_glass", weld=False))
        if getattr(self, "lips", None): out.append(self.lips.obj(self.name + "_lips", weld=True))
        return out


def box(mb, c, size, mat, bevel=0.0):
    """a small closed box (lamps, mirrors, seats) through cars2's rbox (one-segment chamfer)"""
    return rbox(mb, c, size, M[mat], bevel=bevel)


def lamp(mb, x, y, z, w, h, face, lens, detail, depth=0.05, bezel="gloss"):
    """a lamp module on a face at z (face +1 front / -1 back) or x (face 'L' / 'R'): housing + a lens face 3 mm proud"""
    if face in (1, -1):
        box(mb, (x, y, z + face * depth / 2), (w + 0.03, h + 0.03, depth), bezel, bevel=0.008 if detail == 0 else 0)
        zz = z + face * (depth + 0.003)
        mb.face([(x - w / 2, y - h / 2, zz), (x + w / 2, y - h / 2, zz), (x + w / 2, y + h / 2, zz), (x - w / 2, y + h / 2, zz)], M[lens], out=("dir", (0, 0, face)))
    else:
        sd = 1 if face == "L" else -1
        box(mb, (x + sd * depth / 2, y, z), (depth, h + 0.03, w + 0.03), bezel, bevel=0.008 if detail == 0 else 0)
        xx = x + sd * (depth + 0.003)
        mb.face([(xx, y - h / 2, z - w / 2), (xx, y - h / 2, z + w / 2), (xx, y + h / 2, z + w / 2), (xx, y + h / 2, z - w / 2)], M[lens], out=("dir", (sd, 0, 0)))


def beacon_bar(mb, x, y, z, w, detail, d=0.30):
    """a roof light bar: dark base, blue lens blocks at each end, a clear centre (LOD2: one box)"""
    if detail == 2:
        box(mb, (x, y + 0.05, z), (w, 0.10, d), "beacon"); return
    box(mb, (x, y + 0.025, z), (w, 0.05, d), "gloss", bevel=0.01 if detail == 0 else 0)
    seg = w * 0.36
    for sd in (1, -1):
        box(mb, (x + sd * (w / 2 - seg / 2), y + 0.085, z), (seg, 0.07, d * 0.86), "beacon", bevel=0.012 if detail == 0 else 0)
    box(mb, (x, y + 0.085, z), (w - 2 * seg, 0.07, d * 0.86), "glass", bevel=0.012 if detail == 0 else 0)


def mirrors(mb, z, y, xw, detail, drop=0.0):
    """two door mirrors on short arms (>= 4 cm thick: no thin feature)"""
    for sd in (1, -1):
        box(mb, (sd * (xw + 0.10), y - 0.05 - drop / 2, z), (0.16, 0.05, 0.05), "trim")
        box(mb, (sd * (xw + 0.20), y - drop, z - 0.02), (0.07, 0.34 if drop else 0.24, 0.20), "trim", bevel=0.012 if detail == 0 else 0)
        if detail == 0:
            mb.face([(sd * (xw + 0.165), y - drop - 0.15, z - 0.123), (sd * (xw + 0.235), y - drop - 0.15, z - 0.123),
                     (sd * (xw + 0.235), y - drop + 0.15, z - 0.123), (sd * (xw + 0.165), y - drop + 0.15, z - 0.123)], M["chrome"], out=("dir", (0, 0, -1)))


def seats_row(mb, x, z, detail, w=0.45, y0=0.42, h=0.45, back=0.62, mat="seat"):
    """a seat (cushion + back) facing +z"""
    box(mb, (x, y0 + h / 2, z), (w, h, 0.45), mat, bevel=0.02 if detail == 0 else 0)
    box(mb, (x, y0 + h + back / 2, z - 0.20), (w, back, 0.09), mat, bevel=0.02 if detail == 0 else 0)


def cab_interior(mb, x0, x1, zfront, ydash, detail, seats=2, rows=1, floor=0.6):
    """dashboard + seats behind a windscreen (the see-through glass shows them)"""
    box(mb, ((x0 + x1) / 2, ydash - 0.12, zfront - 0.30), (x1 - x0 - 0.10, 0.24, 0.55), "interior")
    if detail == 0:
        box(mb, (x1 - 0.45, ydash + 0.05, zfront - 0.52), (0.40, 0.40, 0.06), "trim")       # steering wheel (left-hand drive: +x)
    xs = [x1 - 0.45, x0 + 0.45] if seats == 2 else [x1 - 0.45, (x0 + x1) / 2, x0 + 0.45]
    for r in range(rows):
        for x in xs: seats_row(mb, x, zfront - 1.05 - r * 0.95, detail, y0=floor)


# ------------------------------------------------------------------------------------------------ the vehicles
# every spec: size, wheels, and a build(detail) -> [objects]. Origin: the wheelbase centre on the ground (the sim poses
# the front and rear axles on the path); a tandem's "rear axle" is the middle of its two.

def windows_side(c, n, s, zr, yr, sides="LR"):
    return s in sides and any(a < c[2] < b for a, b in zr) and yr[0] < c[1] < yr[1]


def build_bus(detail):
    """12 m low-floor city bus (Citaro / Urbino / Lion's City class): WB 5.95, overhangs 2.70 / 3.35, 2.55 wide,
    2.95 body + roof pod; three double doors on the right; big glass; dark window band and skirt; paint per instance."""
    X = 1.275; zF, zR = 5.675, -6.325; yb, yt = 0.32, 2.95; WZ = 2.975; RW = 0.50
    out = []
    seg = 3 if detail == 0 else 1 if detail == 1 else 0
    # window columns along the left / right sides (z ranges), doors on the right (-x)
    winL = [(4.15, 5.25), (2.75, 4.0), (1.30, 2.60), (-0.15, 1.15), (-1.60, -0.30), (-3.05, -1.75), (-4.50, -3.20), (-5.70, -4.65)]
    doors = [(4.10, 5.30), (-0.15, 1.10), (-4.62, -3.42)]
    winR = [(2.75, 3.95), (1.30, 2.60), (-1.60, -0.30), (-3.05, -1.75), (-5.70, -4.80)]
    yw = (1.18, 2.48)                        # the side window band (glass)
    zc = sorted({z for a, b in winL + doors + winR for z in (a, b)} | {WZ - 0.62, WZ + 0.62, -WZ - 0.62, -WZ + 0.62})
    yc = [yw[0], yw[1], 0.55, 1.12, 2.62, 2.85, 1.0]
    xc = [X - 0.42, -X + 0.42, 1.12, -1.12, 0.95, -0.95, 0.35, -0.35]
    S = Shell(-X, X, yb, yt, zR, zF, cuts={"x": xc, "y": yc, "z": zc} if detail < 2 else {"x": xc, "y": [yw[0], yw[1], 1.12, 2.62], "z": zc},
              bevel=0.14 if seg else 0, segs=seg, edges="vt", name="bus_shell")
    # the front: a slight rake over the windscreen (the top 6 cm back), the rear plain
    S.shear(lambda x, y, z: (0, 0, -0.06 * clamp01((y - 1.0) / 1.9) * clamp01((z - (zF - 0.5)) / 0.5)))
    def col(c, n):
        s = S.side(n, 0.5)
        if s == "B": return "under"
        if s in ("L", "R"):
            if c[1] < 0.55: return "bus_dark"                                   # skirt
            if yw[0] - 0.02 < c[1] < yw[1] + 0.16: return "bus_dark"           # the window band (frames between panes)
            return "paint"
        if s == "F":
            if c[1] < 0.55: return "bus_dark"
            if 2.62 < c[1] < 2.85 and abs(c[0]) < 1.12: return "bus_dark"
            return "paint"
        if s == "K":
            if c[1] < 0.55: return "bus_dark"
            if 1.45 < c[1] < 2.62 and abs(c[0]) < 0.95: return "bus_dark"
            return "paint"
        return "paint"
    S.paint(col)
    if detail < 2:
        def is_open(c, n, s):
            if s == "L" and windows_side(c, n, s, winL, yw, "L"): return True
            if s == "R" and windows_side(c, n, s, winR, yw, "R"): return True
            if s == "R" and any(a < c[2] < b for a, b in doors) and 0.55 < c[1] < 2.62: return True
            if s == "F" and 1.0 < c[1] < 2.62 and abs(c[0]) < 1.12: return True
            if s == "K" and 1.45 < c[1] < 2.62 and abs(c[0]) < 0.95: return True
            return False
        S.openings(is_open)
    else:
        def glassy(c, n):
            s = S.side(n, 0.5)
            if s == "L" and windows_side(c, n, s, winL, yw, "L"): return "glass_dark"
            if s == "R" and (windows_side(c, n, s, winR, yw, "R") or (any(a < c[2] < b for a, b in doors) and 0.55 < c[1] < 2.62)): return "glass_dark"
            if s == "F" and 1.0 < c[1] < 2.62 and abs(c[0]) < 1.12: return "glass_dark"
            if s == "K" and 1.45 < c[1] < 2.62 and abs(c[0]) < 0.95: return "glass_dark"
            return None
        S.paint(glassy)
    for zc in (WZ, -WZ): S.notch(zc - 0.62, zc + 0.62, 1.12, sidew=0.42); S.arch(zc - 0.62, zc + 0.62, 1.12, RW, mat="paint", lip="bus_dark")
    out += S.obj(thick=0.06 if detail < 2 else 0)
    dt = MB()
    # door leaves: a vertical black seal down the middle of each door, the lower panel dark (kick plates)
    if detail < 2:
        for a, b in doors:
            m = (a + b) / 2
            box(dt, (-X - 0.004, 1.58, m), (0.012, 2.05, 0.05), "rubber")
            box(dt, (-X - 0.004, 0.70, m), (0.012, 0.28, b - a - 0.04), "bus_dark")
        # seats in rows (both sides of the aisle) + the driver's place + grab poles (4 cm: no thin feature)
        rows = [3.4, 2.2, -0.9, -1.9, -3.0, -5.2, -6.0]
        for z in rows:
            sides = (1, -1) if z < 2.6 and not (-0.4 < z < 1.3) else (1,)
            for sd in sides:
                if detail == 0:
                    for x in (0.80, 0.33): seats_row(dt, sd * x, z, detail, w=0.42, y0=0.42 if z > -2.5 else 0.70, back=0.55, mat="seat")
                else: seats_row(dt, sd * 0.565, z, detail, w=0.90, y0=0.42 if z > -2.5 else 0.70, back=0.55, mat="seat")
        cab_interior(dt, 0.30, X - 0.08, zF - 0.10, 1.02, detail, seats=2)
        if detail == 0:
            for z in (4.0, 1.2, -0.3, -3.3):
                for x in (0.05, -0.62): box(dt, (x, 1.55, z), (0.04, 2.3, 0.04), "grab")
    # front: head lamps low in the corners, the destination display over the windscreen, a bumper, mirrors
    for sd in (1, -1):
        lamp(dt, sd * 0.98, 0.72, zF, 0.30, 0.13, 1, "head", detail)
        if detail < 2: lamp(dt, sd * 1.05, 0.50, zF, 0.14, 0.06, 1, "amber", detail, depth=0.03)
        lamp(dt, sd * 1.05, 1.02, zR, 0.20, 0.55, -1, "tail", detail)
        if detail < 2: lamp(dt, sd * 1.05, 0.66, zR, 0.16, 0.10, -1, "tail_dark", detail, depth=0.03)
    if detail < 2:
        fz = lambda y: zF - 0.06 * clamp01((y - 1.0) / 1.9) + 0.004          # the raked front face, 4 mm out
        dt.face([(-1.0, 2.66, fz(2.66)), (1.0, 2.66, fz(2.66)), (1.0, 2.82, fz(2.82)), (-1.0, 2.82, fz(2.82))], M["dest"], out=("dir", (0, 0, 1)))
        box(dt, (0, 0.42, zF + 0.03), (2.40, 0.20, 0.08), "bus_dark", bevel=0.02 if detail == 0 else 0)
        box(dt, (0, 0.40, zR - 0.03), (2.40, 0.20, 0.08), "bus_dark", bevel=0.02 if detail == 0 else 0)
        mirrors(dt, zF - 0.15, 2.30, X, detail, drop=0.30)
        # roof pod (air conditioning) and the rear engine tower
        box(dt, (0, yt + 0.12, -0.8), (1.90, 0.24, 3.6), "white", bevel=0.05 if detail == 0 else 0)
        box(dt, (0, yt + 0.09, -5.4), (2.20, 0.18, 1.5), "paint", bevel=0.04 if detail == 0 else 0)
        plate(dt, (0, 0.42, zF + 0.075), 0.0, 1, random.Random(51), detail)
        plate(dt, (0, 0.62, zR - 0.005), 0.0, -1, random.Random(52), detail)
    else:
        box(dt, (0, yt + 0.10, -0.8), (1.90, 0.20, 3.6), "white")
    out.append(dt.obj(f"bus_det{detail}", weld=False))
    return out, dict(wheelR=RW, tyreW=0.30, rimR=0.29, rim="6", wheels=[("F", WZ), ("R", -WZ)], wheelX=X - 0.24, size=(2.55, 3.07, zF - zR))


def build_ambulance(detail):
    """Belgian type C ambulance (5 t van chassis + box): WB 3.665, cab 2.0 wide with a bonnet and a raked windscreen,
    box 2.20 x 2.85 high; fluorescent yellow, two rows of green / yellow Battenburg on the box and the cab doors, blue
    beacons at the cab roof and the box's four top corners, grille flashers."""
    WZ = 1.8325; RW = 0.36; zF, zR = 2.83, -4.11
    seg = 3 if detail == 0 else 1 if detail == 1 else 0
    out = []
    # --- cab: 2.0 wide, y 0.42..2.55, z 0.55..zF; bonnet line 1.12; windscreen 1.22..2.40 raked back 0.95 m
    Xc = 1.0; zc0 = 0.55
    bands = [0.78, 1.02, 1.26]                                    # Battenburg rows (two rows of 0.24 m)
    zb = [zF - 0.95]
    cab_z = [zc0 + 0.06, 0.62 + 1.0, zF - 0.98, zF - 0.30, WZ - 0.46, WZ + 0.46] + [zc0 + 0.10 + k * 0.40 for k in range(5)]
    C = Shell(-Xc, Xc, 0.42, 2.55, zc0, zF, cuts={"x": [Xc - 0.38, -Xc + 0.38, 0.86, -0.86, 0.32, -0.32], "y": [0.80, 1.12, 1.22, 2.40, 0.62] + bands + [1.55],
              "z": cab_z}, bevel=0.10 if seg else 0, segs=seg, edges="vt", name="amb_cab")
    # the bonnet and windscreen: the front 1.3 m sheared back with height (bonnet slope to 1.12, screen 0.95 m back)
    def rake(x, y, z):
        u = clamp01((z - (zF - 1.30)) / 1.30)
        back = 0.10 * clamp01((y - 0.62) / 0.50) + 0.85 * clamp01((y - 1.12) / 1.28)
        drop = 0.0
        return (0, drop, -back * u)
    C.shear(rake)
    def ccol(c, n):
        s = C.side(n, 0.5)
        if s == "B": return "under"
        if c[1] < 0.62: return "trim"                                                     # bumper / sills
        if s in ("L", "R") and bands[0] < c[1] < bands[2] and zc0 + 0.1 < c[2] < zF - 0.98:
            k = int((c[2] - (zc0 + 0.10)) / 0.40) + int((c[1] - bands[0]) / 0.24)
            return "amb_green" if k % 2 == 0 else "amb_yellow"
        return "amb_yellow"
    C.paint(ccol)
    def cab_open(c, n, s):
        if s == "F" or (n[2] > 0.3 and n[1] > 0.2): return 1.22 < c[1] < 2.40 and abs(c[0]) < 0.86
        if s in ("L", "R"): return 1.55 < c[1] < 2.40 and zF - 0.98 - 0.0 > c[2] > 0.62 + 0.0 and c[2] < zF - 0.98
        return False
    if detail < 2: C.openings(cab_open)
    else: C.paint(lambda c, n: "glass" if cab_open(c, n, C.side(n, 0.5)) else None)
    C.notch(WZ - 0.46, WZ + 0.46, 0.80, sidew=0.38); C.arch(WZ - 0.46, WZ + 0.46, 0.80, RW, mat="trim", lip="trim")
    out += C.obj(thick=0.05 if detail < 2 else 0)
    # --- box: 2.20 wide, y 0.40..2.85, z zR..0.62; rear arch notch; Battenburg along both sides and the back
    Xb = 1.10
    zcuts = [zR + 0.02 + k * 0.40 for k in range(12)] + [-WZ - 0.48, -WZ + 0.48]
    B = Shell(-Xb, Xb, 0.40, 2.85, zR, 0.62, cuts={"x": [Xb - 0.40, -Xb + 0.40] + [-1.05 + k * 0.42 for k in range(6)], "y": [0.86] + bands + [2.55, 1.9],
              "z": zcuts}, bevel=0.07 if seg else 0, segs=seg, edges="vt", name="amb_box")
    def bcol(c, n):
        s = B.side(n, 0.5)
        if s == "B": return "under"
        if c[1] < 0.86 and s in ("L", "R", "K"): return "trim"
        if s in ("L", "R") and bands[0] < c[1] < bands[2]:
            k = int((c[2] - (zR + 0.02)) / 0.40) + int((c[1] - bands[0]) / 0.24)
            return "amb_green" if k % 2 == 0 else "amb_yellow"
        if s == "K" and bands[0] < c[1] < bands[2]:
            k = int((c[0] + 1.05) / 0.42) + int((c[1] - bands[0]) / 0.24)
            return "amb_green" if k % 2 == 0 else "amb_yellow"
        if s in ("L", "R") and 2.55 < c[1]: return "amb_green"                                 # a green band at the top
        return "amb_yellow"
    B.paint(bcol)
    if detail < 2:
        # side window (left, the patient compartment: frosted = dark glass) and the rear doors' windows
        def box_glass(c, n):
            s = B.side(n, 0.5)
            if s == "L" and 1.9 < c[1] < 2.55 and -1.0 < c[2] < 0.0: return "glass_dark"
            if s == "K" and 1.9 < c[1] < 2.55 and abs(c[0]) > 0.21 and abs(c[0]) < 0.84: return "glass_dark"
            return None
        B.paint(box_glass)
    B.notch(-WZ - 0.48, -WZ + 0.48, 0.86, sidew=0.40); B.arch(-WZ - 0.48, -WZ + 0.48, 0.86, RW, mat="trim", lip="trim")
    out += B.obj()
    dt = MB()
    for sd in (1, -1):
        lamp(dt, sd * 0.70, 0.98, zF - 0.10, 0.34, 0.14, 1, "head", detail)
        if detail < 2:
            lamp(dt, sd * 0.30, 0.86, zF - 0.06, 0.12, 0.05, 1, "beacon", detail, depth=0.03)          # grille flashers
            lamp(dt, sd * (Xb - 0.12), 2.60, zR, 0.10, 0.10, -1, "tail_dark", detail, depth=0.02)
        lamp(dt, sd * 0.98, 1.05, zR, 0.16, 0.50, -1, "tail", detail)
        # beacons: box top corners (front + rear) and the cab roof front
        for zz in (0.50, zR + 0.12):
            if detail < 2:
                box(dt, (sd * (Xb - 0.10), 2.93, zz), (0.14, 0.16, 0.14), "beacon", bevel=0.02 if detail == 0 else 0)
            else:
                box(dt, (sd * (Xb - 0.10), 2.93, zz), (0.14, 0.16, 0.14), "beacon")
    beacon_bar(dt, 0, 2.55 - 0.004, zF - 1.20, 1.50, detail, d=0.26)
    if detail < 2:
        box(dt, (0, 0.50, zF + 0.03), (2.02, 0.22, 0.10), "trim", bevel=0.02 if detail == 0 else 0)          # front bumper
        box(dt, (0, 0.47, zR - 0.04), (2.20, 0.16, 0.10), "trim", bevel=0.02 if detail == 0 else 0)          # rear step
        mirrors(dt, zF - 1.10, 2.0, Xc, detail, drop=0.18)
        box(dt, (0, 0.80, zF + 0.004 - 0.02), (0.70, 0.18, 0.02), "gloss")                                     # grille
        plate(dt, (0, 0.60, zF + 0.085), 0.0, 1, random.Random(61), detail)
        plate(dt, (0, 0.70, zR - 0.005), 0.0, -1, random.Random(62), detail)
        # the rear doors' shut lines + handles
        box(dt, (0, 1.6, zR - 0.004), (0.02, 2.2, 0.01), "paint_seam")
        cab_interior(dt, -Xc + 0.1, Xc - 0.1, zF - 0.90, 1.18, detail, seats=2, floor=0.62)
    out.append(dt.obj(f"amb_det{detail}", weld=False))
    return out, dict(wheelR=RW, tyreW=0.235, rimR=0.21, rim="cover", wheels=[("F", WZ), ("R", -WZ)], wheelX=0.86, size=(2.20, 3.02, zF - zR))


def build_fire(detail):
    """Brussels fire engine (autopompe on an 18 t 4x2 chassis, MAN TGM class): WB 4.20, crew cab 2.5 wide, body with
    roller-shutter lockers, a ladder on the roof; red, a white band, red / yellow rear blocks, a blue light bar on the
    cab, blue beacons at the rear corners."""
    WZ = 2.10; RW = 0.50; zF, zR = 3.50, -4.80; X = 1.25
    seg = 3 if detail == 0 else 1 if detail == 1 else 0
    out = []
    zc0 = 0.78
    cz = [zF - 0.90, zF - 1.80, zc0 + 0.10, WZ - 0.60, WZ + 0.60, 1.55]
    C = Shell(-X, X, 0.55, 3.00, zc0, zF, cuts={"x": [X - 0.42, -X + 0.42, 1.10, -1.10], "y": [0.95, 1.07, 1.10, 1.19, 1.70, 2.62, 1.45, 2.66], "z": cz},
              bevel=0.12 if seg else 0, segs=seg, edges="vt", name="fire_cab")
    C.shear(lambda x, y, z: (0, 0, -0.14 * clamp01((y - 1.5) / 1.5) * clamp01((z - (zF - 0.6)) / 0.6)))
    def ccol(c, n):
        s = C.side(n, 0.5)
        if s == "B": return "under"
        if c[1] < 0.95 and s in ("F", "L", "R"): return "trim"
        if 1.07 < c[1] < 1.19 and s in ("L", "R", "F"): return "fire_white"
        return "paint"
    C.paint(ccol)
    def cab_open(c, n, s):
        if s == "F" or (n[2] > 0.3 and n[1] > 0.1): return 1.70 < c[1] < 2.62 and abs(c[0]) < 1.10
        if s in ("L", "R"): return 1.70 < c[1] < 2.62 and ((zF - 0.90 < c[2] < zF - 0.25) or (zF - 1.80 < c[2] < zF - 0.95) or (zc0 + 0.10 < c[2] < 1.55))
        return False
    C2 = cab_open
    if detail < 2:
        # (the window columns need their own cuts: done by the z list above + a few more)
        C.openings(lambda c, n, s: C2(c, n, s))
    else: C.paint(lambda c, n: "glass" if C2(c, n, C.side(n, 0.5)) else None)
    C.notch(WZ - 0.60, WZ + 0.60, 1.10, sidew=0.42); C.arch(WZ - 0.60, WZ + 0.60, 1.10, RW, mat="paint", lip="trim")
    out += C.obj(thick=0.05 if detail < 2 else 0)
    # body: lockers (3 a side), the rear arch, rear face with a shutter and the chevron blocks
    lockers = [(-0.10, 0.65), (-1.45, -0.20), (-4.70, -2.85)]
    lz = [z for a, b in lockers for z in (a, b)] + [-WZ - 0.62, -WZ + 0.62]
    gy = [1.25 + k * 0.10 for k in range(16)] if detail == 0 else [1.25 + k * 0.40 for k in range(4)]
    B = Shell(-X, X, 0.62, 3.10, zR, 0.72, cuts={"x": [X - 0.42, -X + 0.42] + [-1.0 + k * 0.40 for k in range(6)], "y": [0.95, 1.07, 1.19, 2.88] + gy + [0.62 + 0.30],
              "z": lz}, bevel=0.06 if seg else 0, segs=seg, edges="vt", name="fire_body")
    def bcol(c, n):
        s = B.side(n, 0.5)
        if s == "B": return "under"
        if s in ("L", "R"):
            if 1.07 < c[1] < 1.19: return "fire_white"
            if c[1] > 1.19 and c[1] < 2.88 and any(a < c[2] < b for a, b in lockers):
                if detail < 2:
                    k = int(round((c[1] - 1.25) / (0.10 if detail == 0 else 0.40) - 0.5))
                    return "shutter_gap" if (detail == 0 and k % 3 == 2) else "shutter"
                return "shutter"
            return "paint"
        if s == "K":
            if c[1] < 1.19:
                k = int((c[0] + 1.0) / 0.40) + (1 if c[1] > 0.92 else 0)
                return "fire_yellow" if k % 2 == 0 else "paint"
            if 1.25 < c[1] < 2.88 and abs(c[0]) < 1.0: return "shutter"
            return "paint"
        return "paint"
    B.paint(bcol)
    B.notch(-WZ - 0.62, -WZ + 0.62, 1.19, sidew=0.42); B.arch(-WZ - 0.62, -WZ + 0.62, 1.19, RW, mat="paint", lip="trim")
    out += B.obj()
    dt = MB()
    for sd in (1, -1):
        lamp(dt, sd * 0.88, 0.80, zF, 0.32, 0.16, 1, "head", detail)
        lamp(dt, sd * 1.08, 1.02, zR, 0.14, 0.42, -1, "tail", detail)
        box(dt, (sd * (X - 0.10), 3.19, zR + 0.10), (0.15, 0.17, 0.15), "beacon", bevel=0.02 if detail == 0 else 0)
        if detail < 2: lamp(dt, sd * 0.40, 0.80, zF, 0.14, 0.06, 1, "beacon", detail, depth=0.03)
    beacon_bar(dt, 0, 3.00 - 0.004, zF - 0.40, 1.90, detail, d=0.30)
    if detail < 2:
        box(dt, (0, 0.62, zF + 0.04), (2.46, 0.30, 0.10), "trim", bevel=0.02 if detail == 0 else 0)
        box(dt, (0, 1.30, zF + 0.004), (1.40, 0.28, 0.02), "gloss")                            # grille
        mirrors(dt, zF - 0.35, 2.55, X, detail, drop=0.30)
        plate(dt, (0, 0.62, zF + 0.095), 0.0, 1, random.Random(71), detail)
        plate(dt, (0, 0.75, zR - 0.005), 0.0, -1, random.Random(72), detail)
        # the ladder on the roof (rails + rungs, 5-6 cm: no thin feature) and its rollers
        if detail == 0:
            for sd in (1, -1): box(dt, (sd * 0.24, 3.20, -2.0), (0.06, 0.08, 5.2), "shutter")
            for k in range(14): box(dt, (0, 3.20, -4.4 + k * 0.37), (0.48, 0.05, 0.05), "shutter")
        else:
            box(dt, (0, 3.20, -2.0), (0.54, 0.08, 5.2), "shutter")
        for z in (-4.3, 0.3): box(dt, (0, 3.13, z), (0.70, 0.06, 0.12), "trim")
        # locker handles (bars along the shutters' bottom)
        for a, b in lockers:
            for sd in (1, -1): box(dt, (sd * (X + 0.012), 1.30, (a + b) / 2), (0.025, 0.04, b - a - 0.20), "chrome")
        cab_interior(dt, -X + 0.15, X - 0.15, zF - 0.30, 1.62, detail, seats=3, rows=2, floor=0.95)
    out.append(dt.obj(f"fire_det{detail}", weld=False))
    return out, dict(wheelR=RW, tyreW=0.32, rimR=0.29, rim="6", wheels=[("F", WZ), ("R", -WZ)], wheelX=X - 0.26, size=(2.50, 3.28, zF - zR))


def build_bin(detail):
    """Brussels refuse lorry (26 t 6x2 rear loader, low-entry cab, Econic class): front axle + a rear tandem; white,
    an orange band, orange / white rear blocks, the compactor body and the rear hopper with its lifter."""
    WZ = 2.2875; T = 0.675; RW = 0.50; zF, zR = 3.74, -5.60; X = 1.25
    seg = 3 if detail == 0 else 1 if detail == 1 else 0
    out = []
    zc0 = 1.55
    cz = [WZ - 0.60, WZ + 0.60, zF - 0.85, zc0 + 0.10, 2.15, zF - 0.20]
    C = Shell(-X, X, 0.45, 2.95, zc0, zF, cuts={"x": [X - 0.42, -X + 0.42, 1.12, -1.12], "y": [0.78, 0.95, 1.08, 1.30, 2.60, 1.20], "z": cz},
              bevel=0.14 if seg else 0, segs=seg, edges="vt", name="bin_cab")
    C.shear(lambda x, y, z: (0, 0, -0.22 * clamp01((y - 1.3) / 1.6) * clamp01((z - (zF - 0.7)) / 0.7)))
    def ccol(c, n):
        s = C.side(n, 0.5)
        if s == "B": return "under"
        if c[1] < 0.78: return "trim"
        if 0.95 < c[1] < 1.08 and s in ("L", "R", "F"): return "orange"
        return "paint"
    C.paint(ccol)
    def cab_open(c, n, s):
        if s == "F" or (n[2] > 0.3 and n[1] > 0.1): return 1.30 < c[1] < 2.60 and abs(c[0]) < 1.12
        if s in ("L", "R"): return 1.30 < c[1] < 2.60 and ((zF - 0.85 < c[2] < zF - 0.20) or (zc0 + 0.10 < c[2] < 2.15))
        return False
    if detail < 2: C.openings(cab_open)
    else: C.paint(lambda c, n: "glass" if cab_open(c, n, C.side(n, 0.5)) else None)
    C.notch(WZ - 0.60, WZ + 0.60, 1.08, sidew=0.42); C.arch(WZ - 0.60, WZ + 0.60, 1.08, RW, mat="paint", lip="trim")
    out += C.obj(thick=0.05 if detail < 2 else 0)
    # compactor body over the tandem
    r0, r1 = -WZ - T, -WZ + T
    B = Shell(-X, X, 0.78, 3.40, -4.20, 1.48, cuts={"x": [X - 0.42, -X + 0.42], "y": [0.95, 1.08, 1.12, 1.20, 3.10], "z": [r0 - 0.58, r0 + 0.58, r1 - 0.58, r1 + 0.58]},
              bevel=0.10 if seg else 0, segs=seg, edges="vt" if detail < 2 else "", name="bin_body")
    def bcol(c, n):
        s = B.side(n, 0.5)
        if s == "B": return "under"
        if 0.95 < c[1] < 1.08 and s in ("L", "R"): return "orange"
        if s in ("L", "R") and c[1] > 3.10: return "skid"
        return "paint"
    B.paint(bcol)
    for zc in (r0, r1): B.notch(zc - 0.58, zc + 0.58, 1.20, sidew=0.42); B.arch(zc - 0.58, zc + 0.58, 1.20, RW, mat="paint", lip="trim")
    out += B.obj()
    # rear hopper: slightly narrower, its back raked; the loading mouth dark; orange / white blocks low
    H = Shell(-X + 0.03, X - 0.03, 0.55, 3.0, zR, -4.10, cuts={"x": [-1.0 + k * 0.40 for k in range(6)] + [1.0, -1.0], "y": [0.70, 0.95, 1.55, 2.0], "z": []},
              bevel=0.08 if seg else 0, segs=seg, edges="vt", name="bin_hopper")
    H.shear(lambda x, y, z: (0, 0, 0.35 * clamp01((y - 1.6) / 1.4) * clamp01((-4.3 - z) / 1.2)))
    def hcol(c, n):
        s = H.side(n, 0.5)
        if s == "B": return "under"
        if s == "K" or (n[2] < -0.3):
            if 0.95 < c[1] < 1.55 and abs(c[0]) < 1.0: return "bus_dark"                     # the mouth
            if c[1] < 0.95:
                k = int((c[0] + 1.0) / 0.40) + (1 if c[1] > 0.70 else 0)
                return "orange" if k % 2 == 0 else "white"
        return "paint"
    H.paint(hcol)
    out += H.obj()
    dt = MB()
    for sd in (1, -1):
        lamp(dt, sd * 0.92, 0.62, zF, 0.30, 0.14, 1, "head", detail)
        lamp(dt, sd * 1.10, 0.85, zR + 0.0, 0.12, 0.30, -1, "tail", detail)
        box(dt, (sd * (X - 0.12), 3.07, zR + 0.38), (0.14, 0.14, 0.14), "amber", bevel=0.02 if detail == 0 else 0)
    if detail < 2:
        box(dt, (0, 0.55, zF + 0.04), (2.46, 0.24, 0.10), "trim", bevel=0.02 if detail == 0 else 0)
        mirrors(dt, zF - 0.30, 2.50, X, detail, drop=0.32)
        plate(dt, (0, 0.55, zF + 0.095), 0.0, 1, random.Random(81), detail)
        plate(dt, (0, 0.60, zR - 0.005 + 0.0), 0.0, -1, random.Random(82), detail)
        # bin lifter (two arms + a comb bar) under the mouth, the crew steps / grab rails at the back
        box(dt, (0, 0.80, zR - 0.10), (1.70, 0.10, 0.12), "gloss", bevel=0.01 if detail == 0 else 0)
        for sd in (1, -1):
            box(dt, (sd * 0.80, 1.05, zR - 0.08), (0.08, 0.50, 0.08), "gloss")
            box(dt, (sd * 1.05, 0.50, zR - 0.20), (0.40, 0.05, 0.30), "shutter")
            box(dt, (sd * 1.20, 1.60, zR - 0.08 + 0.15), (0.05, 1.0, 0.05), "chrome")
        cab_interior(dt, -X + 0.15, X - 0.15, zF - 0.25, 1.20, detail, seats=3, floor=0.70)
    out.append(dt.obj(f"bin_det{detail}", weld=False))
    return out, dict(wheelR=RW, tyreW=0.32, rimR=0.29, rim="6", wheels=[("F", WZ), ("R", -WZ + T), ("Rb", -WZ - T)], wheelX=X - 0.26, size=(2.50, 3.42, zF - zR))


def build_police(detail):
    """cars2's police estate (TYPES['police'], unchanged) + a blue light bar on the clear roof (the yard's bar)"""
    sp = TYPES["police"]
    objs = [o for o in build_car("police", sp, detail) if len(o.data.polygons) or bpy.data.objects.remove(o)]
    # the roof height at the bar (rays down on the built body)
    from mathutils.bvhtree import BVHTree
    dg = bpy.context.evaluated_depsgraph_get()
    zb = -0.55
    y = 0
    for o in objs:
        t = BVHTree.FromObject(o, dg)
        hit = t.ray_cast(Vector(bl((0, 3, zb))), Vector((0, 0, -1)))
        if hit[0] is not None: y = max(y, hit[0].z)
    dt = MB()
    beacon_bar(dt, 0, y - 0.006, zb, 1.12, detail, d=0.26)
    objs.append(dt.obj(f"police_bar{detail}", weld=False))
    return objs, dict(wheelR=sp["wheelR"], tyreW=sp["tyreW"], rimR=sp["rimR"], rim=sp.get("rim", "5"), wheels=[("F", sp["wheelZ"]), ("R", -sp["wheelZ"])], wheelX=sp["wheelX"], size=(1.85, 1.58, 4.70))


HEAVY = {
    "police_t": dict(label="police estate + light bar (traffic patrol)", type="police", paint=(0.80, 0.80, 0.79), keepPaint=True, build=build_police),
    "ambulance": dict(label="Belgian ambulance (type C box)", type="ambulance", paint=(0.42, 0.62, 0.0), keepPaint=True, build=build_ambulance),
    "fire": dict(label="Brussels fire engine (autopompe)", type="fire", paint=(0.42, 0.012, 0.010), keepPaint=True, build=build_fire),
    "bus": dict(label="12 m city bus", type="bus", paint=(0.62, 0.64, 0.66), keepPaint=False, build=build_bus),
    "bin": dict(label="refuse lorry (rear loader)", type="bin", paint=(0.80, 0.80, 0.78), keepPaint=True, build=build_bin),
}

# ------------------------------------------------------------------------------------------------ main (as cars2.py's)
gpu_setup()
scn.cycles.samples = SAMPLES
scn.render.bake.target = "VERTEX_COLORS"
world = bpy.data.worlds.new("w"); scn.world = world
G["world"] = world                                   # (cars2's bake_ao reads its global `world`)
gme = bpy.data.meshes.new("ground"); gme.from_pydata([(-300, -300, 0), (300, -300, 0), (300, 300, 0), (-300, 300, 0)], [], [(0, 1, 2, 3)])
ground = bpy.data.objects.new("ground", gme); scn.collection.objects.link(ground)

results = []
t0 = time.time()
for cid, sp in HEAVY.items():
    if ONLY and cid not in ONLY: continue
    tc = time.time()
    parts, lodTris, size = {}, [], None
    for detail in (0, 1, 2):
        DETAIL[0] = detail
        objs, W = sp["build"](detail)
        objs = [o for o in objs if len(o.data.polygons) or bpy.data.objects.remove(o)]
        wsp = dict(wheelR=W["wheelR"], tyreW=W["tyreW"], rimR=W["rimR"], rim=W["rim"])
        wheel = build_wheel(wsp, detail)
        for o in objs: smooth_shade(o)
        smooth_shade(wheel, angle=math.radians(62 if detail == 0 else 50))
        RW, WX = W["wheelR"], W["wheelX"]
        wpos = {}
        for tag, z in W["wheels"]:
            wpos[f"{tag}L"] = (WX, RW, z); wpos[f"{tag}R"] = (-WX, RW, z)
        occl = []
        for k, (x, y, z) in wpos.items():
            o = wheel.copy(); o.data = wheel.data; scn.collection.objects.link(o)
            o.location = C((x, y, z)); o.scale = (1 if x > 0 else -1, 1, 1); occl.append(o)
        wheel.location = (0, 0, 80)
        bpy.context.view_layer.update()
        bake_ao(objs)
        bake_ao([wheel])
        body = tri_soup(objs)
        wl = tri_soup([wheel], origin=(0, 80, 0))
        wr = tri_soup([wheel], mirror_x=True, origin=(0, 80, 0))
        sfx = "" if detail == 0 else f"_L{detail}"
        parts["Body" + sfx] = (body, (0, 0, 0))
        for k, p in wpos.items():
            # names the fleets know: Wheel_F* steer, Wheel_R* roll only (a tandem's second axle: Wheel_RbL / Wheel_RbR)
            parts[f"Wheel_{k}" + sfx] = (wl if p[0] > 0 else wr, p)
        tris = len(body["idx"]) // 3 + sum((len(wl["idx"]) if p[0] > 0 else len(wr["idx"])) // 3 for p in wpos.values())
        lodTris.append(tris)
        if detail == 0:
            lo = body["pos"].min(0); hi = body["pos"].max(0)
            size = [round(float(hi[0] - lo[0]), 3), round(float(hi[1]), 3), round(float(hi[2] - lo[2]), 3)]
            if W.get("size"): size = [round(float(v), 3) for v in W["size"]]            # (the body, mirrors left out)
            zc = round(float(hi[2] + lo[2]) / 2, 3)
            wb = round(float(max(z for _, z in W["wheels"]) - min(z for t, z in W["wheels"] if t == "R")), 3) if any(t == "R" for t, _ in W["wheels"]) else 0
        print(f"[heavies] {cid} LOD{detail}: {tris} tris (body {len(body['idx']) // 3}, wheel {len(wl['idx']) // 3})")
        for o in objs + occl + [wheel]: bpy.data.objects.remove(o)
    # the sim's wheelbase: front axle to the rear axle (a tandem: to the middle of its two)
    rz = [z for t, z in W["wheels"] if t.startswith("R")]
    fz = [z for t, z in W["wheels"] if t == "F"][0]
    wb = round(fz - sum(rz) / len(rz), 3)
    results.append(dict(id=cid, label=sp["label"], type=sp["type"], paint=sp["paint"], keepPaint=bool(sp["keepPaint"]), size=size,
                        tris=lodTris[0], lodTris=lodTris, parts=parts, wb=wb, wheelR=W["wheelR"], zc=zc))
    print(f"[heavies] {cid}: LODs {lodTris}, size {size}, wb {wb}, body centre z {zc}, {time.time() - tc:.1f}s")

# the GLB (cars2's writer) + wb / wheelR / zc in each car's extras
_write = write_glb
def write_glb2(path, cars):
    import json as _j
    _write(path, cars)
    b = open(path, "rb").read()
    import struct as _s
    jl = _s.unpack_from("<I", b, 12)[0]; js = _j.loads(b[20:20 + jl]); rest = b[20 + jl:]
    byid = {c["id"]: c for c in cars}
    for n in js["nodes"]:
        if n.get("name") in byid and "extras" in n:
            c = byid[n["name"]]; n["extras"].update(wb=c["wb"], wheelR=c["wheelR"], zc=c["zc"])
    jb = _j.dumps(js, separators=(",", ":")).encode(); jb += b" " * ((4 - len(jb) % 4) % 4)
    with open(path, "wb") as fh:
        fh.write(_s.pack("<III", 0x46546C67, 2, 12 + 8 + len(jb) + len(rest)))
        fh.write(_s.pack("<II", len(jb), 0x4E4F534A)); fh.write(jb); fh.write(rest)
glb = os.path.join(OUT, f"{NAME}.glb")
write_glb2(glb, results)
print(f"[heavies] -> {glb} ({os.path.getsize(glb) / 1024:.0f} KB), {len(results)} vehicles, {time.time() - t0:.1f}s")
