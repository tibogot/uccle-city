"""THE CALEVOET PEDESTRIAN UNDERPASS U1 (Rue Engeland / Dieweg <-> Rue Egide Van Ophem, under line 124), built
entirely in code (no hand modelling) from the city's data (tools/underpass/site.mjs -> models/underpass/site.json: the
OSM ways, the two UrbIS kiosk solids, the DTM, the tracks) and estimates from photos / Street View (looked at only,
never traced, stored or shipped). Plan: docs/CALEVOET_UNDERPASS_PLAN.md (jobs 1 + 2).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/underpass.py -- [--no-bake] [--samples N] [--preview <abs dir>]

Writes (then `node tools/underpass/pack.mjs`: the mesh audit, meshopt, the mural's KTX2):
  models/underpass/calevoet.raw.glb    THE SURFACE, loaded with the tile: nodes
        Underpass_lod0       the two kiosks, full detail (bevelled corners, window reveals, frames, frosted panels, the
                             roof slab and fascia, the mouth's landing slab with its skirt, the yellow bollards)
        Underpass_lod1       the same without reveals / frames detail (panels 2 cm proud), scripted
        Underpass_lod2       boxes with the fascia, scripted (the far merge)
        Underpass_throat     the kiosks' inside as seen from the street before the inside streams in (inner walls,
                             soffit, the first steps, a dark card): hidden while the inside is shown
        Underpass_collision  the walker's low collision mesh (floors, stair ramps, walls, soffits): never drawn
     slots (one draw each): brick_painted_white, paint_fascia, painted_metal_grey, glass_frosted, concrete;
     UV0 metres, UV1 the AO lightmap (models/underpass/calevoet_ao.png, Cycles AO with the site's ground,
     neighbours and the kiosks); COLOR_0.r = the face code (code / 16 + 1/32), .g = 1, .b = 1.
  models/underpass/calevoet_in.raw.glb THE INSIDE, streamed (fetch < 80 m, show < 50 m): node Inside
     slots: concrete_step, floor_tile_grey, wall_mural, ceiling_paint, painted_metal_grey, lamp_glow (emissive);
     its light baked by Cycles PER CORNER: _LSKY (day: the sky through the mouths + the lamps) and _LNIGHT (the lamps)
     (hero_pack.mjs packs them RGBM); UV0 metres, the walls' UV0.x runs along the mural atlas (models/underpass/mural.png:
     OUR OWN invented underwater scene + tags, rendered here; never a copy of the real murals).
  models/underpass/calevoet.json       placement, the wells (the terrain cut), the walker's voids, the stairs, the
                                       kiosks, the bike gutters (kid game), the budgets the gate checks.

FRAME: (u, w, h) of site.json (u along the corridor east -> west, w = three local +z, h = m TAW);
Blender (X, Y, Z) = (u, -w, h - OY); glTF / three local (x, y, z) = (u, h - OY, w).
MEASURED [M]: the OSM ways, the kiosk solids (footprint, base, eaves), the DTM, the rail tops. ESTIMATED [E]: the floor
level, clear height, widths, risers, finishes (plan §1-2, the Street View look).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector
import numpy as np

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None): return ARGS[ARGS.index(k) + 1] if k in ARGS else d
BAKE = "--no-bake" not in ARGS
SAMPLES = int(arg("--samples", "256"))
PREVIEW = arg("--preview")
ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", ".."))
OUT = os.path.join(ROOT, "models", "underpass")
T0 = time.time()
SITE = json.load(open(os.path.join(OUT, "site.json")))
OY = SITE["frame"]["oy"]
TIMES = {}

# ================================================================================================ the numbers
G_ = SITE["ground"]
GH = np.array(G_["h"], dtype=np.float64).reshape(G_["nw"], G_["nu"])
def ground(u, w):
    """the city's drawn terrain (heightmap.js surface, sampled on site.json's 0.25 m grid), bilinear"""
    fi = (u - G_["u0"]) / G_["step"]; fj = (w - G_["w0"]) / G_["step"]
    i = min(max(int(math.floor(fi)), 0), G_["nu"] - 2); j = min(max(int(math.floor(fj)), 0), G_["nw"] - 2)
    a, b = fi - i, fj - j
    return float(GH[j, i] * (1 - a) * (1 - b) + GH[j, i + 1] * a * (1 - b) + GH[j + 1, i] * (1 - a) * b + GH[j + 1, i + 1] * a * b)

def rect_of(ring):
    """the kiosk's rectangle in the frame from its UrbIS ring (both kiosks are square to the corridor within 2 deg)"""
    us = sorted(p[0] for p in ring); ws = sorted(p[1] for p in ring)
    return (us[0] + us[1]) / 2, (us[2] + us[3]) / 2, (ws[0] + ws[1]) / 2, (ws[2] + ws[3]) / 2

FLOOR = 48.40        # [E] corridor floor (plan §1: rail top 52.15 - rail + sleeper 0.3 - ballast 0.5 - slab 0.5 - clear 2.45)
CLEAR = 2.45         # [E] clear height in the corridor
SOFFIT = FLOOR + CLEAR
SLAB = 0.30          # [E] the roof slab over the corridor (its top 51.15 m; the ground over it 51.65-52.36 [M])
WT = 0.25            # [E] kiosk wall thickness (UrbIS outline = the outer faces)
GOING = 0.30         # [E] tread going
ROOF_T = 0.25        # [E] kiosk roof slab
FASCIA = 0.22        # [E Street View 2024, west kiosk] a thin white fascia (top 0.04 over the roof)
OVER = 0.40          # [E Street View] the flat roof overhangs ~0.4 m all round
BEAM = 0.25          # [E] the lettered downstand beams over the stair mouths in the corridor (depth under the soffit)
GUT = 0.12           # [E] the bike gutters' width (both sides of each flight; the kid game rides them)
EK = rect_of(SITE["kiosks"]["east"]["ring_uw"]); WK = rect_of(SITE["kiosks"]["west"]["ring_uw"])
# the corridor (u along, w across): its east end wall = the east kiosk's inner east face, its west end = the west kiosk's
# inner west face; its north wall = the east kiosk's south inner face (the stair lands straight into it), 2.6 m clear
CU0, CU1 = EK[0] + WT, WK[1] - WT
CW1 = EK[2] + WT
CW0 = CW1 - 2.60     # [E] U1 "the wider one" (Wikipedia): 2.6 m clear (the west stair's width between the kiosk walls)
KIOSKS = {
    "east": {"u0": EK[0], "u1": EK[1], "w0": EK[2], "w1": EK[3], "mouth": +1, "eaves": SITE["kiosks"]["east"]["eaves"],
             "base": SITE["kiosks"]["east"]["base"], "solid": SITE["kiosks"]["east"]["solid"], "bu": SITE["kiosks"]["east"]["bu"]},
    "west": {"u0": WK[0], "u1": WK[1], "w0": WK[2], "w1": WK[3], "mouth": -1, "eaves": SITE["kiosks"]["west"]["eaves"],
             "base": SITE["kiosks"]["west"]["base"], "solid": SITE["kiosks"]["west"]["solid"], "bu": SITE["kiosks"]["west"]["bu"]},
}
for k in KIOSKS.values():
    k["iu0"], k["iu1"] = k["u0"] + WT, k["u1"] - WT
    k["soffit"] = k["eaves"] - ROOF_T
    mw = k["w1"] if k["mouth"] > 0 else k["w0"]
    k["mw"] = mw
    k["top"] = round(max(ground(u, mw + 0.15 * k["mouth"]) for u in np.linspace(k["iu0"], k["iu1"], 9)) + 0.02, 3)   # the landing slab at the mouth: >= the ground there
    k["gmin"] = min(ground(u, w) for u in np.linspace(k["u0"] - 0.1, k["u1"] + 0.1, 12) for w in np.linspace(k["w0"] - 0.1, k["w1"] + 0.1, 24)
                    if not (k["u0"] + 0.05 < u < k["u1"] - 0.05 and k["w0"] + 0.05 < w < k["w1"] - 0.05))
    k["skirt"] = k["gmin"] - 0.30       # the walls' feet: 0.3 m under the lowest ground round the kiosk (joins rule: a skirt)
E, Wk = KIOSKS["east"], KIOSKS["west"]
# THE STAIRS. East (Rue Engeland / Dieweg): down from its mouth (north end) to the corridor: 27 risers in two flights with
# a 1.5 m landing, all inside the kiosk. West (Rue Egide Van Ophem): 17 risers in one flight from its mouth (south end),
# the lowest 0.9 m under the kiosk's north wall and the ground (a soffit at SOFF_W), into the corridor's south side.
NE = 27; RE = (E["top"] - FLOOR) / NE
NW = 17; RW = (Wk["top"] - FLOOR) / NW
SOFF_W = 50.98       # [E] the soffit over the west flight's lowest treads (>= 2.05 m over their nosings, 0.6 m under the ground)
EAST_FLIGHTS = [{"w0": CW1, "dir": +1, "h0": FLOOR, "n": 14}, {"w0": CW1 + 13 * GOING + 1.5, "dir": +1, "h0": FLOOR + 14 * RE, "n": 13}]
WEST_FLIGHTS = [{"w0": CW0, "dir": -1, "h0": FLOOR, "n": NW}]
for f, R in [(f, RE) for f in EAST_FLIGHTS] + [(f, RW) for f in WEST_FLIGHTS]:
    f["R"] = R
    f["w1"] = f["w0"] + f["dir"] * (f["n"] - 1) * GOING          # the last riser's line (onto the landing above)
    f["h1"] = f["h0"] + f["n"] * R
E["flights"], Wk["flights"] = EAST_FLIGHTS, WEST_FLIGHTS
E["land_w"] = (EAST_FLIGHTS[0]["w1"], EAST_FLIGHTS[1]["w0"])       # the mid landing
E["top_w"] = EAST_FLIGHTS[1]["w1"]; Wk["top_w"] = WEST_FLIGHTS[0]["w1"]
assert abs(EAST_FLIGHTS[1]["h1"] - E["top"]) < 1e-6 and abs(WEST_FLIGHTS[0]["h1"] - Wk["top"]) < 1e-6
assert (E["mw"] - E["top_w"]) > 0.1 and (Wk["top_w"] - Wk["mw"]) > 0.1, "the top landings must fit inside the kiosks"
print(f"east kiosk u {E['u0']:.2f}..{E['u1']:.2f} w {E['w0']:.2f}..{E['w1']:.2f}, top {E['top']:.2f}, riser {RE * 100:.1f} cm; "
      f"west kiosk u {Wk['u0']:.2f}..{Wk['u1']:.2f} w {Wk['w0']:.2f}..{Wk['w1']:.2f}, top {Wk['top']:.2f}, riser {RW * 100:.1f} cm; "
      f"corridor u {CU0:.2f}..{CU1:.2f} w {CW0:.2f}..{CW1:.2f}")

def nosing_h(fl, w):
    """the line through a flight's nosings at w (clamped to the flight)"""
    t = (w - fl["w0"]) * fl["dir"] / GOING
    t = max(0.0, min(fl["n"] - 1, t))
    return fl["h0"] + fl["R"] * (t + 1)

# ================================================================================================ the mesh builder
def P(u, w, h): return Vector((u, -w, h - OY))
def N(nu, nw, nh): return Vector((nu, -nw, nh))
Zv = Vector((0, 0, 1))

def newell(pts):
    n = Vector((0, 0, 0))
    for i in range(len(pts)):
        a, b = pts[i], pts[(i + 1) % len(pts)]
        n.x += (a.y - b.y) * (a.z + b.z); n.y += (a.z - b.z) * (a.x + b.x); n.z += (a.x - b.x) * (a.y + b.y)
    return n

def planar_uv(pts):
    """UV0 metres, planar: walls (u along horizontally, v = m TAW - 40), level faces (x, y)"""
    n = newell(pts)
    n = n.normalized() if n.length > 1e-12 else Zv
    if abs(n.z) < 0.75:
        t = Zv.cross(n); t = t.normalized() if t.length > 1e-6 else Vector((1, 0, 0)); b = Zv
    else:
        t = Vector((1, 0, 0)); b = n.cross(t).normalized()
    return [(p.dot(t), p.dot(b)) for p in pts]

class MB:
    """faces with a slot, a code, UV0 (metres) and a smooth flag"""
    def __init__(self, slots):
        self.slots = slots; self.v, self.f, self.m, self.c, self.uv, self.sm = [], [], [], [], [], []
    def face(self, pts, slot, code=0, uv=None, want=None, smooth=False):
        pts = [Vector(p) for p in pts]
        if want is not None and newell(pts).dot(Vector(want)) < 0:
            pts = pts[::-1]; uv = uv[::-1] if uv is not None else None
        if newell(pts).length < 1e-10: return
        b = len(self.v); self.v += [tuple(p) for p in pts]
        self.f.append(tuple(range(b, b + len(pts)))); self.m.append(self.slots.index(slot)); self.c.append(code)
        self.uv.append(uv if uv is not None else planar_uv(pts)); self.sm.append(smooth)
    def grid(self, o, a, b, na, nb, slot, code=0, want=None, uvf=None, smooth=False):
        """a planar quad o + s a + t b split na x nb (the per-corner bake needs vertices every ~0.5 m)"""
        for i in range(na):
            for j in range(nb):
                q = [o + a * (i / na) + b * (j / nb), o + a * ((i + 1) / na) + b * (j / nb), o + a * ((i + 1) / na) + b * ((j + 1) / nb), o + a * (i / na) + b * ((j + 1) / nb)]
                self.face(q, slot, code, [uvf(p) for p in q] if uvf else None, want, smooth)
    def box(self, u0, u1, w0, w1, h0, h1, slot, code=0, skip=()):
        """axis-aligned in the frame; skip: 'b' 't' 'u0' 'u1' 'w0' 'w1'"""
        c = {(i, j, k): P((u0, u1)[i], (w0, w1)[j], (h0, h1)[k]) for i in (0, 1) for j in (0, 1) for k in (0, 1)}
        F = {"b": ([(0, 0, 0), (1, 0, 0), (1, 1, 0), (0, 1, 0)], N(0, 0, -1)), "t": ([(0, 0, 1), (1, 0, 1), (1, 1, 1), (0, 1, 1)], N(0, 0, 1)),
             "u0": ([(0, 0, 0), (0, 1, 0), (0, 1, 1), (0, 0, 1)], N(-1, 0, 0)), "u1": ([(1, 0, 0), (1, 1, 0), (1, 1, 1), (1, 0, 1)], N(1, 0, 0)),
             "w0": ([(0, 0, 0), (1, 0, 0), (1, 0, 1), (0, 0, 1)], N(0, -1, 0)), "w1": ([(0, 1, 0), (1, 1, 0), (1, 1, 1), (0, 1, 1)], N(0, 1, 0))}
        for k, (q, n) in F.items():
            if k in skip: continue
            self.face([c[x] for x in q], slot, code, want=n)
    def cyl(self, u, w, h0, h1, r, slot, code=0, segs=12, cap_top=True, rings=1):
        ring = [(u + r * math.cos(2 * math.pi * i / segs), w + r * math.sin(2 * math.pi * i / segs)) for i in range(segs)]
        for i in range(segs):
            a, b = ring[i], ring[(i + 1) % segs]
            nrm = N(math.cos(2 * math.pi * (i + 0.5) / segs), math.sin(2 * math.pi * (i + 0.5) / segs), 0)
            s0, s1 = 2 * math.pi * r * i / segs, 2 * math.pi * r * (i + 1) / segs
            for k in range(rings):
                za, zb = h0 + (h1 - h0) * k / rings, h0 + (h1 - h0) * (k + 1) / rings
                self.face([P(a[0], a[1], za), P(b[0], b[1], za), P(b[0], b[1], zb), P(a[0], a[1], zb)], slot, code,
                          [(s0, za - OY), (s1, za - OY), (s1, zb - OY), (s0, zb - OY)], want=nrm, smooth=True)
        if cap_top:
            # a domed cap (3 rings): no flat disc edge to sparkle
            prev = ring; ph = h1
            for k in (1, 2):
                f = math.cos(k * math.pi / 6); rr = [(u + (x - u) * f, w + (y - w) * f) for x, y in ring]; hh = h1 + r * 0.5 * math.sin(k * math.pi / 6)
                for i in range(segs):
                    a, b, c, d = prev[i], prev[(i + 1) % segs], rr[(i + 1) % segs], rr[i]
                    self.face([P(a[0], a[1], ph), P(b[0], b[1], ph), P(c[0], c[1], hh), P(d[0], d[1], hh)], slot, code, want=N(0, 0, 1), smooth=True)
                prev, ph = rr, hh
            self.face([P(x, y, ph) for x, y in prev], slot, code, want=N(0, 0, 1), smooth=True)
    def tube(self, pts, r, slot, code=0, segs=8):
        """a round tube along a polyline of (u, w, h) (parallel-transported frame), capped"""
        Q0 = [P(*p) for p in pts]
        # round every kink (a fillet of 3 points, ~4 cm): no shading across a sharp bend (mesh_audit streak / flipped)
        Q = [Q0[0]]
        for i in range(1, len(Q0) - 1):
            d1 = (Q0[i] - Q0[i - 1]); d2 = (Q0[i + 1] - Q0[i])
            if d1.length < 1e-6 or d2.length < 1e-6: continue
            ang = d1.normalized().angle(d2.normalized())
            if ang < math.radians(8): Q.append(Q0[i]); continue
            e = min(0.045, d1.length * 0.4, d2.length * 0.4)
            a_, b_ = Q0[i] - d1.normalized() * e, Q0[i] + d2.normalized() * e
            n_ = max(2, int(math.degrees(ang) / 10))
            for k in range(n_ + 1):
                t = k / n_
                Q.append(a_ * (1 - t) ** 2 + Q0[i] * 2 * t * (1 - t) + b_ * t * t)      # a quadratic Bezier round the corner
        Q.append(Q0[-1])
        tans = [(Q[min(i + 1, len(Q) - 1)] - Q[max(i - 1, 0)]).normalized() for i in range(len(Q))]
        ref = Zv if abs(tans[0].dot(Zv)) < 0.9 else Vector((1, 0, 0))
        nrm = tans[0].cross(ref).normalized()
        rings = []
        for i in range(len(Q)):
            if i:
                ax = tans[i - 1].cross(tans[i])
                if ax.length > 1e-8:
                    from mathutils import Matrix
                    nrm = (Matrix.Rotation(math.acos(max(-1, min(1, tans[i - 1].dot(tans[i])))), 3, ax.normalized()) @ nrm).normalized()
            bi = tans[i].cross(nrm).normalized()
            rings.append([Q[i] + (nrm * math.cos(2 * math.pi * k / segs) + bi * math.sin(2 * math.pi * k / segs)) * r for k in range(segs)])
        L = [0.0]
        for i in range(1, len(Q)): L.append(L[-1] + (Q[i] - Q[i - 1]).length)
        for i in range(len(Q) - 1):
            a, b = rings[i], rings[i + 1]
            for k in range(segs):
                c = (a[k] + a[(k + 1) % segs] + b[k] + b[(k + 1) % segs]) / 4
                self.face([a[k], a[(k + 1) % segs], b[(k + 1) % segs], b[k]], slot, code,
                          [(L[i], k * 0.02), (L[i], (k + 1) * 0.02), (L[i + 1], (k + 1) * 0.02), (L[i + 1], k * 0.02)], want=c - (Q[i] + Q[i + 1]) / 2, smooth=True)
        self.face(rings[0][::-1], slot, code, want=-tans[0]); self.face(rings[-1], slot, code, want=tans[-1])

def wall_face(mb, a, b, h0, h1, nrm, slot, code=0, holes=(), step=None, uv0=0.0, hb=None, ht=None, vref=None):
    """one side of a vertical wall from plan point a to b (u, w), between h0 and h1 (or the functions hb(s) / ht(s) of the
    distance s along it), facing nrm (u, w); holes = [(s0, s1, z0, z1)] cut out on a grid through their edges (support
    loops: every opening edge is a grid line, quads only); step = the bake grid (m). UV0 = (uv0 + s, h - floor)."""
    L = math.hypot(b[0] - a[0], b[1] - a[1]); d = ((b[0] - a[0]) / L, (b[1] - a[1]) / L)
    ss = {0.0, L}; zs = set()
    for s0, s1, z0, z1 in holes: ss |= {s0, s1}; zs |= {z0, z1}
    if step:
        n = max(1, int(math.ceil(L / step))); ss |= {L * i / n for i in range(n + 1)}
    ss = sorted(ss)
    lo = (lambda s: hb(s)) if hb else (lambda s: h0)
    hi = (lambda s: ht(s)) if ht else (lambda s: h1)
    vr = (lambda s: vref(s)) if callable(vref) else (lambda s: FLOOR if vref is None else vref)
    # the bake grid's levels: one set for the whole wall (no T-junction between columns)
    zall_lo, zall_hi = min(lo(s) for s in ss), max(hi(s) for s in ss)
    glev = set()
    if step:
        k0 = int(math.floor(zall_lo / step)) + 1; k1 = int(math.ceil(zall_hi / step))
        glev = {k * step for k in range(k0, k1)}
    for i in range(len(ss) - 1):
        sa, sb = ss[i], ss[i + 1]
        if sb - sa < 1e-4: continue
        # the vertical cuts of this column: the holes' z edges + the bake grid, between its bottom and top
        za, zb = min(lo(sa), lo(sb)), max(hi(sa), hi(sb))
        cuts = sorted({z for z in (zs | glev) if za + 1e-4 < z < zb - 1e-4})
        lv = [None] + cuts + [None]
        for k in range(len(lv) - 1):
            def hz(s, which):
                if which is None: return lo(s) if k == 0 else hi(s)
                return which
            z0a, z0b = (lo(sa), lo(sb)) if lv[k] is None else (lv[k], lv[k])
            z1a, z1b = (hi(sa), hi(sb)) if lv[k + 1] is None else (lv[k + 1], lv[k + 1])
            z0a, z0b = min(max(z0a, lo(sa)), hi(sa)), min(max(z0b, lo(sb)), hi(sb)); z1a, z1b = max(min(z1a, hi(sa)), z0a), max(min(z1b, hi(sb)), z0b)
            if z1a - z0a < 1e-4 and z1b - z0b < 1e-4: continue
            mid_s, mid_z = (sa + sb) / 2, (z0a + z0b + z1a + z1b) / 4
            if any(s0 - 1e-6 <= mid_s <= s1 + 1e-6 and z0 - 1e-6 <= mid_z <= z1 + 1e-6 for s0, s1, z0, z1 in holes): continue
            pa = (a[0] + d[0] * sa, a[1] + d[1] * sa); pb = (a[0] + d[0] * sb, a[1] + d[1] * sb)
            q = [P(pa[0], pa[1], z0a), P(pb[0], pb[1], z0b), P(pb[0], pb[1], z1b), P(pa[0], pa[1], z1a)]
            uv = [(uv0 + sa, z0a - vr(sa)), (uv0 + sb, z0b - vr(sb)), (uv0 + sb, z1b - vr(sb)), (uv0 + sa, z1a - vr(sa))]
            if z1a - z0a < 1e-4: q, uv = [q[0], q[1], q[2]], [uv[0], uv[1], uv[2]]          # a triangle (bottom meets top at sa)
            elif z1b - z0b < 1e-4: q, uv = [q[0], q[1], q[3]], [uv[0], uv[1], uv[3]]
            mb.face(q, slot, code, uv, want=N(nrm[0], nrm[1], 0))
    return L

# ================================================================================================ slots and codes
SURF_SLOTS = ["brick_painted_white", "paint_fascia", "painted_metal_grey", "glass_frosted", "concrete"]
IN_SLOTS = ["concrete_step", "floor_tile_grey", "wall_mural", "ceiling_paint", "painted_metal_grey", "lamp_glow", "glass_frosted"]
# codes (COLOR_0.r = code / 16 + 1 / 32), per slot (viewer/underground/underpassModel.js reads the same table)
CODES = {
    "brick_painted_white": {"upper": 0, "lower": 1, "plinth": 2, "inner": 3, "end": 4},
    "paint_fascia": {"fascia": 0, "roof": 1, "soffit": 2},
    "painted_metal_grey": {"frame": 0, "bollard": 1, "rail": 2, "gutter": 3, "housing": 4, "conduit": 5, "sign": 6, "grate": 7},
    "glass_frosted": {"panel": 0, "inside": 1},
    "concrete": {"slab": 0, "nosing": 1, "throat": 2, "tread": 3, "riser": 4},
    "concrete_step": {"tread": 0, "nosing": 1, "riser": 2, "landing": 3, "string": 4},
    "floor_tile_grey": {"tile": 0, "drain": 1},
    "wall_mural": {"mural": 0, "letters": 1, "paint": 2},
    "ceiling_paint": {"ceiling": 0, "beam": 1},
    "lamp_glow": {"lens": 0},
}
C = lambda slot, name: CODES[slot][name]

# ================================================================================================ THE KIOSKS
def kiosk_bays(k, side):
    """the window bays of a long wall (s along it from its mouth-far end): [(s0, s1)], piers 0.45, ends 0.35"""
    L = k["w1"] - k["w0"]
    n = max(1, int(round((L - 0.7) / 1.75)))          # [E Street View 2024] the west kiosk: 3 bays on 5.9 m, rendered piers between
    bw = (L - 0.7 - 0.30 * (n - 1)) / n
    return [(0.35 + i * (bw + 0.30), 0.35 + i * (bw + 0.30) + bw) for i in range(n)]

def build_kiosk(mb, k, lod):
    """one kiosk's outer shell at lod 0 / 1 / 2 (its inner faces: the throat and the inside)"""
    u0, u1, w0, w1, sk = k["u0"], k["u1"], k["w0"], k["w1"], k["skirt"]
    iu0, iu1 = k["iu0"], k["iu1"]
    so, ev = k["soffit"], k["eaves"]
    mouth = k["mouth"]
    base = k["base"]
    sill, head = base + 1.05, so - 0.16          # [E Street View] the window band: the lower wall (a painted mural) to ~1.05 m, wired frosted glass above
    plinth = base + 0.22
    wclosed = w0 if mouth > 0 else w1             # the closed end
    iw_closed = wclosed + WT * mouth
    BR, FA, MG, GL, CO = SURF_SLOTS
    # ---- the long walls (u0 side faces -u, u1 side faces +u): outer face, inner face (throat / inside), top under the
    # roof, the reveals and panels of the window bays
    for side in (0, 1):
        uo = u0 if side == 0 else u1; ui = iu0 if side == 0 else iu1; nu = -1 if side == 0 else 1
        a, b = (uo, w0), (uo, w1)
        bays = kiosk_bays(k, side) if lod < 2 else []
        holes = [(s0, s1, sill, head) for s0, s1 in bays] if lod == 0 else []
        # outer face: plinth / lower wall / upper wall bands (split at the band lines: codes per face)
        for (z0, z1, code) in ((sk, plinth, "plinth"), (plinth, sill, "lower"), (sill, ev - FASCIA, "upper")):
            hz = [(s0, s1, max(z0, sill), min(z1, head)) for s0, s1, _, _ in holes if min(z1, head) > max(z0, sill)]
            wall_face(mb, a, b, z0, z1, (nu, 0), BR, C(BR, code), hz)
        if lod == 1:
            for s0, s1 in bays:      # LOD1: the panels 2 cm proud, framed by nothing (a simple far read)
                q = [P(uo + nu * 0.02, w0 + s0, sill), P(uo + nu * 0.02, w0 + s1, sill), P(uo + nu * 0.02, w0 + s1, head), P(uo + nu * 0.02, w0 + s0, head)]
                mb.face(q, GL, C(GL, "panel"), want=N(nu, 0, 0))
        if lod == 0:
            for s0, s1 in bays:
                # reveals (the wall's thickness round the opening), the steel frame (5 cm), the frosted panel 6 cm in
                for (pa, pb, nr) in (((s0, sill), (s1, sill), (0, 0, 1)), ((s0, head), (s1, head), (0, 0, -1))):
                    q = [P(uo, w0 + pa[0], pa[1]), P(uo, w0 + pb[0], pb[1]), P(ui, w0 + pb[0], pb[1]), P(ui, w0 + pa[0], pa[1])]
                    mb.face(q, BR if nr[2] < 0 else CO, C(BR, "upper") if nr[2] < 0 else C(CO, "slab"), want=N(*nr))
                for s, nr in ((s0, (0, 1, 0)), (s1, (0, -1, 0))):
                    q = [P(uo, w0 + s, sill), P(ui, w0 + s, sill), P(ui, w0 + s, head), P(uo, w0 + s, head)]
                    mb.face(q, BR, C(BR, "upper"), want=N(*nr))
                um = (uo + ui) / 2
                fr = 0.05; fd = 0.06
                # the frame: a 5 cm steel section round the bay, with a mid mullion (blue paint: code frame)
                # [Street View] blue steel frames, three panes a bay (two mullions)
                m1, m2 = s0 + (s1 - s0) / 3, s0 + 2 * (s1 - s0) / 3
                for (aa, bb, zz0, zz1) in ((s0, s1, sill, sill + fr), (s0, s1, head - fr, head), (s0, s0 + fr, sill + fr, head - fr), (s1 - fr, s1, sill + fr, head - fr),
                                           (m1 - fr / 2, m1 + fr / 2, sill + fr, head - fr), (m2 - fr / 2, m2 + fr / 2, sill + fr, head - fr)):
                    mb.box(min(um - fd / 2, um + fd / 2), max(um - fd / 2, um + fd / 2), w0 + aa, w0 + bb, zz0, zz1, MG, C(MG, "frame"))
                # the frosted wired panels between the frame members (outside face here; the inside face: the inside)
                for (aa, bb) in ((s0 + fr, m1 - fr / 2), (m1 + fr / 2, m2 - fr / 2), (m2 + fr / 2, s1 - fr)):
                    q = [P(um, w0 + aa, sill + fr), P(um, w0 + bb, sill + fr), P(um, w0 + bb, head - fr), P(um, w0 + aa, head - fr)]
                    mb.face(q, GL, C(GL, "panel"), want=N(nu, 0, 0))
                # the sill: a dark grey steel ledge 4 cm proud
                mb.box(min(uo, uo + nu * 0.05), max(uo, uo + nu * 0.05), w0 + s0 - 0.03, w0 + s1 + 0.03, sill - 0.04, sill, MG, C(MG, "frame"), skip=("u1" if nu < 0 else "u0",))
        # the wall's end at the mouth (its inner face: the throat / the inside)
        wm = k["mw"]
        q = [P(uo, wm, sk), P(ui, wm, sk), P(ui, wm, ev - FASCIA), P(uo, wm, ev - FASCIA)]
        mb.face(q, BR, C(BR, "end"), want=N(0, mouth, 0))
    # ---- the closed end wall (outer face; no windows: tags on its lower part)
    wall_face(mb, (u0, wclosed), (u1, wclosed), sk, plinth, (0, -mouth), BR, C(BR, "plinth"))
    wall_face(mb, (u0, wclosed), (u1, wclosed), plinth, ev - FASCIA, (0, -mouth), BR, C(BR, "lower"))
    # ---- the roof: the slab (its top a bituminous membrane), the fascia round it (OVER beyond the walls), the soffit
    # over the mouth's overhang (the part outside the walls; the soffit inside is in throat / inside)
    ru0, ru1, rw0, rw1 = u0 - OVER, u1 + OVER, w0 - OVER, w1 + OVER
    ft = ev + 0.04
    mb.box(ru0, ru1, rw0, rw1, ev - FASCIA, ft, FA, C(FA, "fascia"), skip=("t", "b"))
    mb.face([P(ru0, rw0, ft), P(ru1, rw0, ft), P(ru1, rw1, ft), P(ru0, rw1, ft)], FA, C(FA, "roof"), want=N(0, 0, 1))
    # the fascia's underside between it and the walls (and the open mouth: up to the inner faces)
    fb = ev - FASCIA
    for (a0, a1, b0, b1) in ((ru0, u0, rw0, rw1), (u1, ru1, rw0, rw1), (u0, u1, rw0, w0), (u0, u1, w1, rw1)):
        mb.face([P(a0, b0, fb), P(a1, b0, fb), P(a1, b1, fb), P(a0, b1, fb)], FA, C(FA, "soffit"), want=N(0, 0, -1))
    # the inner fascia faces (from the soffit fb up to the slab's underside so) over the walls' tops: the wall tops are
    # inside the slab. The mouth: the slab's soffit over the opening between the side walls (iu0..iu1) from fb to so
    wm = k["mw"]
    mb.face([P(iu0, wm, fb), P(iu1, wm, fb), P(iu1, wm, so), P(iu0, wm, so)], FA, C(FA, "fascia"), want=N(0, -mouth, 0))
    # ---- the mouth: the top landing slab (concrete, a yellow nosing at its inner edge) with a skirt face down at the
    # mouth line, the two yellow bollards
    tw = k["top_w"]; top = k["top"]
    lw0, lw1 = (tw, wm) if mouth > 0 else (wm, tw)
    if lod < 2:
        nz = 0.05 * mouth       # the landing's nosing band (toward the stair)
        mb.face([P(iu0, tw + nz, top), P(iu1, tw + nz, top), P(iu1, wm, top), P(iu0, wm, top)], CO, C(CO, "slab"), want=N(0, 0, 1))
        mb.face([P(iu0, tw, top), P(iu1, tw, top), P(iu1, tw + nz, top), P(iu0, tw + nz, top)], CO, C(CO, "nosing"), want=N(0, 0, 1))
        mb.face([P(iu0, wm, top), P(iu1, wm, top), P(iu1, wm, top - 0.35), P(iu0, wm, top - 0.35)], CO, C(CO, "slab"), want=N(0, mouth, 0))
    else:
        mb.face([P(iu0, tw, top), P(iu1, tw, top), P(iu1, wm, top), P(iu0, wm, top)], CO, C(CO, "slab"), want=N(0, 0, 1))
    if lod >= 1:
        # LOD1 / LOD2: the mouth closed by a dark card (the inside is not drawn that far: heroes closed at every level)
        mb.face([P(iu0, wm - mouth * 0.02, top), P(iu1, wm - mouth * 0.02, top), P(iu1, wm - mouth * 0.02, fb), P(iu0, wm - mouth * 0.02, fb)], CO, C(CO, "throat"), want=N(0, mouth, 0))
    um = (iu0 + iu1) / 2
    if lod < 2:
        for du in (-0.5, 0.5):
            mb.cyl(um + du * (iu1 - iu0) / 2.84, wm + mouth * 0.45, ground(um + du * (iu1 - iu0) / 2.84, wm + mouth * 0.45) - 0.2, ground(um + du * (iu1 - iu0) / 2.84, wm + mouth * 0.45) + 1.0, 0.06, MG, C(MG, "bollard"), segs=16 if lod == 0 else 6, rings=6 if lod == 0 else 1)
    k["bollards"] = [(um + du * (iu1 - iu0) / 2.84, wm + mouth * 0.45) for du in (-0.5, 0.5)]

def kiosk_lod(lod):
    mb = MB(SURF_SLOTS)
    for k in KIOSKS.values(): build_kiosk(mb, k, lod)
    return mb

# ================================================================================================ THE INSIDE (streamed)
STEP = 0.5          # the bake grid on walls / floors / ceilings
mural_x = [0.0]     # the running position along the mural atlas (m)
MURAL_LEN = 30.0    # the atlas holds 30 m of mural (3 strips of 10 m), then [30, 40) the lettering + the signs

def mural_wall(mb, a, b, nrm, h0=None, h1=None, hb=None, ht=None, holes=(), code="mural", uv0=None, vref=None):
    """a mural-painted wall face (the bake grid, UV0.x = the atlas position)"""
    L = math.hypot(b[0] - a[0], b[1] - a[1])
    x0 = mural_x[0] if uv0 is None else uv0
    if uv0 is None:
        if x0 + L > MURAL_LEN: x0 = (x0 + 3.7) % (MURAL_LEN - L) if L < MURAL_LEN else 0.0
        mural_x[0] = x0 + L + 0.6
    wall_face(mb, a, b, h0, h1, nrm, "wall_mural", C("wall_mural", code), holes, STEP, x0, hb, ht, vref)

def stair_flight(mb, fl, u0, u1, col):
    """treads (a 5 cm yellow nosing band + the riser's top 3 cm), risers, the two steel bike gutters against the walls;
    the collision ramp through the risers' mid-heights"""
    d, R = fl["dir"], fl["R"]
    ga, gb = u0 + GUT, u1 - GUT
    for i in range(fl["n"]):
        wr = fl["w0"] + d * i * GOING                 # riser i's line
        hb, ht = fl["h0"] + i * R, fl["h0"] + (i + 1) * R
        # riser (faces -d), the top 3 cm yellow
        mb.face([P(ga, wr, hb), P(gb, wr, hb), P(gb, wr, ht - 0.03), P(ga, wr, ht - 0.03)], "concrete_step", C("concrete_step", "riser"), want=N(0, -d, 0))
        mb.face([P(ga, wr, ht - 0.03), P(gb, wr, ht - 0.03), P(gb, wr, ht), P(ga, wr, ht)], "concrete_step", C("concrete_step", "nosing"), want=N(0, -d, 0))
        if i == fl["n"] - 1: break                    # the last riser lands on the landing above (its own face)
        wt = wr + d * GOING
        mb.face([P(ga, wr, ht), P(gb, wr, ht), P(gb, wr + d * 0.05, ht), P(ga, wr + d * 0.05, ht)], "concrete_step", C("concrete_step", "nosing"), want=N(0, 0, 1))
        mb.face([P(ga, wr + d * 0.05, ht), P(gb, wr + d * 0.05, ht), P(gb, wt, ht), P(ga, wt, ht)], "concrete_step", C("concrete_step", "tread"), want=N(0, 0, 1))
    # the gutters: a steel plane through the nosings from the bottom riser's foot to the top nosing, against each wall;
    # its inner cheek down to each tread (a triangle per step)
    # the gutter: the line through the nosings, from the floor one going before the first riser to the last nosing
    wA, wB = fl["w0"] - d * GOING, fl["w1"]
    hA, hB = fl["h0"], fl["h1"]
    gl = lambda w: hA + (hB - hA) * (w - wA) / (wB - wA)
    for (ua, ub, inner, outer) in ((u0, ga, ga, u0), (gb, u1, gb, u1)):
        mb.face([P(ua, wA, hA), P(ub, wA, hA), P(ub, wB, hB), P(ua, wB, hB)], "painted_metal_grey", C("painted_metal_grey", "gutter"), want=N(0, -d * 0.5, 1))
        nu = 1 if inner == ga else -1
        # its cheek toward the stair: a triangle over each tread, the wedge in front of the first riser
        mb.face([P(inner, wA, hA), P(inner, fl["w0"], hA), P(inner, fl["w0"], gl(fl["w0"]))], "painted_metal_grey", C("painted_metal_grey", "gutter"), want=N(nu, 0, 0))
        mb.face([P(outer, wA, hA), P(outer, fl["w0"], hA), P(outer, fl["w0"], gl(fl["w0"]))], "painted_metal_grey", C("painted_metal_grey", "gutter"), want=N(-nu, 0, 0))
        for i in range(fl["n"] - 1):
            wr = fl["w0"] + d * i * GOING; ht = fl["h0"] + (i + 1) * R
            w2 = wr + d * GOING
            mb.face([P(inner, wr, ht), P(inner, w2, ht), P(inner, w2, gl(w2))], "painted_metal_grey", C("painted_metal_grey", "gutter"), want=N(nu, 0, 0))
    # the walker's ramp: through the risers' mid-heights, extended half a going each end (onto the floor / the landing)
    col.append(("ramp", u0, u1, fl["w0"] - d * GOING / 2, fl["h0"], fl["w1"] + d * GOING / 2, fl["h1"]))
    return {"a": [(u0 + ga) / 2, wA, hA], "b": [(u0 + ga) / 2, wB, hB]}, {"a": [(gb + u1) / 2, wA, hA], "b": [(gb + u1) / 2, wB, hB]}

def handrail(mb, u, fl_list, k):
    """a 42 mm steel tube 0.9 m over the nosing line along one wall (6 cm off it), level 0.3 m past each flight's ends,
    over the landings, ends turned down into the wall; brackets every ~1.4 m"""
    pts = []
    for fl in fl_list:
        d = fl["dir"]; hA = fl["h0"] + fl["R"]; hB = fl["h1"]
        wa = fl["w0"]; wb = fl["w1"]
        pts += [(u, wa - d * 0.30, hA + 0.9 - fl["R"]), (u, wa, hA + 0.9 - fl["R"] * 0.0), (u, wb, hB + 0.9 - fl["R"] * 0.0), (u, wb + d * 0.30, hB + 0.9)]
    clean = [pts[0]]
    for p in pts[1:]:
        if (Vector(p) - Vector(clean[-1])).length > 0.05: clean.append(p)
    wall_u = k["iu0"] if abs(u - k["iu0"]) < abs(u - k["iu1"]) else k["iu1"]
    out = clean[0]; end = clean[-1]
    path = [(u, out[1], out[2] - 0.10)] + clean + [(u, end[1], end[2] - 0.10)]          # the ends returned down 10 cm
    mb.tube(path, 0.021, "painted_metal_grey", C("painted_metal_grey", "rail"), segs=16)
    # brackets
    L = 0.0
    for i in range(1, len(clean)):
        a, b = Vector(clean[i - 1]), Vector(clean[i]); seg = (b - a).length
        n = max(1, int(seg / 1.4))
        for j in range(n):
            p = a + (b - a) * ((j + 0.5) / n)
            mb.tube([(wall_u, p.y if False else p[1], p[2] - 0.07), (u, p[1], p[2] - 0.07), (u, p[1], p[2] - 0.02)], 0.008, "painted_metal_grey", C("painted_metal_grey", "rail"), segs=16)

def box_light(mb, u, w, h, along_u=True, L=1.25, Wd=0.22):
    """a surface box light on the soffit: painted housing (8 cm) + the opal lens (lamp_glow, emissive in the city)"""
    hu, hw = (L / 2, Wd / 2) if along_u else (Wd / 2, L / 2)
    mb.box(u - hu, u + hu, w - hw, w + hw, h - 0.08, h, "painted_metal_grey", C("painted_metal_grey", "housing"), skip=("t", "b"))
    mb.box(u - hu, u + hu, w - hw, w + hw, h - 0.08, h - 0.08, "painted_metal_grey", C("painted_metal_grey", "housing"), skip=("t", "b", "u0", "u1", "w0", "w1"))
    mb.face([P(u - hu + 0.02, w - hw + 0.02, h - 0.081), P(u + hu - 0.02, w - hw + 0.02, h - 0.081), P(u + hu - 0.02, w + hw - 0.02, h - 0.081), P(u - hu + 0.02, w + hw - 0.02, h - 0.081)],
            "lamp_glow", C("lamp_glow", "lens"), want=N(0, 0, -1))
    # the housing's underside rim round the lens
    for (a0, a1, b0, b1) in ((u - hu, u + hu, w - hw, w - hw + 0.02), (u - hu, u + hu, w + hw - 0.02, w + hw), (u - hu, u - hu + 0.02, w - hw + 0.02, w + hw - 0.02), (u + hu - 0.02, u + hu, w - hw + 0.02, w + hw - 0.02)):
        mb.face([P(a0, b0, h - 0.08), P(a1, b0, h - 0.08), P(a1, b1, h - 0.08), P(a0, b1, h - 0.08)], "painted_metal_grey", C("painted_metal_grey", "housing"), want=N(0, 0, -1))
    return (u, w, h - 0.09, L, Wd, along_u)

def build_inside():
    """the streamed inside + the collision mesh + the throat; returns (inside MB, throat MB, collision tris, info)"""
    mb = MB(IN_SLOTS)
    col = []                                    # ("ramp" | "rect" | "wall", ...) primitives -> triangles below
    info = {"gutters": [], "lights": [], "stairs": {}}
    # ---- the corridor floor (grey tiles, a drain strip along the south wall), soffit, walls
    def floor_rect(u0, u1, w0, w1, h, slot, code):
        mb.grid(P(u0, w0, h), P(u1, w0, h) - P(u0, w0, h), P(u0, w1, h) - P(u0, w0, h), max(1, int(math.ceil((u1 - u0) / STEP))), max(1, int(math.ceil((w1 - w0) / STEP))), slot, code, want=N(0, 0, 1),
                uvf=lambda p: (p.x, -p.y))
    def ceil_rect(u0, u1, w0, w1, h, code="ceiling"):
        mb.grid(P(u0, w0, h), P(u1, w0, h) - P(u0, w0, h), P(u0, w1, h) - P(u0, w0, h), max(1, int(math.ceil((u1 - u0) / STEP))), max(1, int(math.ceil((w1 - w0) / STEP))), "ceiling_paint", C("ceiling_paint", code), want=N(0, 0, -1),
                uvf=lambda p: (p.x, -p.y))
    DR = 0.16                                   # [E] the drain strip
    floor_rect(CU0, CU1, CW0 + DR, CW1, FLOOR, "floor_tile_grey", C("floor_tile_grey", "tile"))
    floor_rect(CU0, CU1, CW0, CW0 + DR, FLOOR - 0.004, "floor_tile_grey", C("floor_tile_grey", "drain"))
    mb.face([P(CU0, CW0 + DR, FLOOR - 0.004), P(CU1, CW0 + DR, FLOOR - 0.004), P(CU1, CW0 + DR, FLOOR), P(CU0, CW0 + DR, FLOOR)], "floor_tile_grey", C("floor_tile_grey", "drain"), want=N(0, -1, 0))
    ceil_rect(CU0, CU1, CW0, CW1, SOFFIT)
    col.append(("rect", CU0, CU1, CW0, CW1, FLOOR)); col.append(("rect", CU0, CU1, CW0, CW1, SOFFIT))
    # the walls: north (w = CW1, the east stair's mouth u in [E.iu0, E.iu1] open), south (w = CW0, the west stair's mouth
    # open), the two ends
    eo, wo = (E["iu0"], E["iu1"]), (Wk["iu0"], Wk["iu1"])
    mural_wall(mb, (CU0, CW0), (CU1, CW0), (0, 1), FLOOR, SOFFIT, holes=[(wo[0] - CU0, wo[1] - CU0, FLOOR - 1, SOFFIT + 1)])
    mural_wall(mb, (CU1, CW1), (CU0, CW1), (0, -1), FLOOR, SOFFIT, holes=[(CU1 - eo[1], CU1 - eo[0], FLOOR - 1, SOFFIT + 1)])
    mural_wall(mb, (CU0, CW1), (CU0, CW0), (1, 0), FLOOR, SOFFIT)
    mural_wall(mb, (CU1, CW0), (CU1, CW1), (-1, 0), FLOOR, SOFFIT)
    col.append(("wall", (CU0, CW0), (wo[0], CW0), FLOOR, SOFFIT)); col.append(("wall", (wo[1], CW0), (CU1, CW0), FLOOR, SOFFIT))
    col.append(("wall", (CU0, CW1), (eo[0], CW1), FLOOR, SOFFIT)); col.append(("wall", (eo[1], CW1), (CU1, CW1), FLOOR, SOFFIT))
    col.append(("wall", (CU0, CW0), (CU0, CW1), FLOOR, SOFFIT)); col.append(("wall", (CU1, CW0), (CU1, CW1), FLOOR, SOFFIT))
    # ---- the lettered downstand beams over the two stair mouths ("CALEVOET · KALEVOET", atlas x 30..37)
    for (bu0, bu1, wface, sgn) in ((eo[0], eo[1], CW1, -1), (wo[0], wo[1], CW0, +1)):
        wb = wface + sgn * 0.24
        hb = SOFFIT - BEAM
        a, b = ((bu1, wb), (bu0, wb)) if sgn < 0 else ((bu0, wb), (bu1, wb))
        wall_face(mb, a, b, hb, SOFFIT, (0, sgn), "wall_mural", C("wall_mural", "letters"), (), STEP, 30.0 + (7.0 - (bu1 - bu0)) / 2, vref=hb)
        uf = bu1 if sgn < 0 else bu0                  # the beam's free end (the other is against the corridor's end wall)
        mb.face([P(uf, wb, hb), P(uf, wface, hb), P(uf, wface, SOFFIT), P(uf, wb, SOFFIT)], "ceiling_paint", C("ceiling_paint", "beam"), want=N(1 if sgn < 0 else -1, 0, 0))
        mb.face([P(bu0, min(wb, wface), hb), P(bu1, min(wb, wface), hb), P(bu1, max(wb, wface), hb), P(bu0, max(wb, wface), hb)], "ceiling_paint", C("ceiling_paint", "beam"), want=N(0, 0, -1))
        # the beam's ends against the side walls are the walls; its back face (toward the stair) continues the well wall
        col.append(("rect", bu0, bu1, min(wb, wface), max(wb, wface), hb))
    # ---- two direction signs on the north wall, mid corridor (atlas x 37.1..39.9: an invented panel, arrows + street names)
    for (uc, v0, v1) in ((CU0 + (CU1 - CU0) * 0.42, 0.05, 0.55), (CU0 + (CU1 - CU0) * 0.58, 0.65, 1.15)):
        hs0, hs1 = FLOOR + 1.95, FLOOR + 2.25; ws = CW1 - 0.02
        # a viewer facing the north wall has the east (-u) on the right: the atlas x runs toward -u
        mb.face([P(uc + 0.84, ws, hs0), P(uc - 0.84, ws, hs0), P(uc - 0.84, ws, hs1), P(uc + 0.84, ws, hs1)], "wall_mural", C("wall_mural", "letters"),
                [(37.1, v0), (39.9, v0), (39.9, v1), (37.1, v1)], want=N(0, -1, 0))
        mb.box(uc - 0.86, uc + 0.86, ws, CW1, hs0 - 0.01, hs0, "painted_metal_grey", C("painted_metal_grey", "sign"), skip=("w1",))
        mb.box(uc - 0.86, uc + 0.86, ws, CW1, hs1, hs1 + 0.01, "painted_metal_grey", C("painted_metal_grey", "sign"), skip=("w1",))
        for ue in (uc - 0.86, uc + 0.84):
            mb.box(ue, ue + 0.02, ws, CW1, hs0, hs1, "painted_metal_grey", C("painted_metal_grey", "sign"), skip=("w1",))
    # ---- the box lights on the corridor's axis (every ~3 m), conduit along the soffit
    wc = (CW0 + CW1) / 2
    nL = int((CU1 - CU0 - 1.5) / 3.0) + 1
    for i in range(nL):
        u = CU0 + 0.75 + (CU1 - CU0 - 1.5) * (i / max(1, nL - 1))
        info["lights"].append(box_light(mb, u, wc, SOFFIT))
    mb.tube([(CU0 + 0.05, wc + 0.18, SOFFIT - 0.02), (CU1 - 0.05, wc + 0.18, SOFFIT - 0.02)], 0.0125, "painted_metal_grey", C("painted_metal_grey", "conduit"), segs=16)
    # ---- each well: the walls from the stairs up to the kiosk's soffit, the stairs, rails, landings, lights
    for name, k in KIOSKS.items():
        fls = k["flights"]; m = k["mouth"]; iu0, iu1 = k["iu0"], k["iu1"]; so = k["soffit"]
        top, tw, wm = k["top"], k["top_w"], k["mw"]
        gut = []
        for fl in fls:
            g1, g2 = stair_flight(mb, fl, iu0, iu1, col); gut += [g1, g2]
        info["gutters"] += [{"stair": name, **g} for g in gut]
        # the landings (east: the mid landing; both: the top landing's under-mouth part is the surface's slab)
        if name == "east":
            l0, l1 = k["land_w"]; hl = fls[0]["h1"]
            floor_rect(iu0, iu1, l0 + 0.05, l1, hl, "concrete_step", C("concrete_step", "landing"))
            floor_rect(iu0, iu1, l0, l0 + 0.05, hl, "concrete_step", C("concrete_step", "nosing"))
            col.append(("rect", iu0, iu1, l0, l1, hl))
        # the side walls: bottom = the gutter plane (the stair line) along the flights, the landing between, up to the soffit
        def stair_line(w):
            for fl in fls:
                wA_ = fl["w0"] - fl["dir"] * GOING
                lo_, hi_ = sorted((wA_, fl["w1"]))
                if lo_ - 1e-6 <= w <= hi_ + 1e-6:
                    return fl["h0"] + (fl["h1"] - fl["h0"]) * (w - wA_) / (fl["w1"] - wA_)
            if name == "east" and k["land_w"][0] - 1e-6 <= w <= k["land_w"][1] + 1e-6: return fls[0]["h1"]
            if (w - tw) * m >= 0: return top
            return FLOOR
        # the well's extent along w: from the corridor's wall line to the mouth
        wa = CW1 if name == "east" else CW0
        # break points (the walls' bottom follows the stair line: a vertex at every flight end)
        brk = sorted({wa, wm} | {fl["w0"] for fl in fls} | {fl["w0"] - fl["dir"] * GOING for fl in fls} | {fl["w1"] for fl in fls} | ({k["land_w"][0], k["land_w"][1]} if name == "east" else set())
                     | ({k["w1"] - WT} if name == "west" else set()))
        brk = [b for b in brk if min(wa, wm) - 1e-6 <= b <= max(wa, wm) + 1e-6]
        for side in (0, 1):
            uw = iu0 if side == 0 else iu1; nu = 1 if side == 0 else -1
            # the wall's top: the kiosk soffit inside the kiosk; the west flight's soffit under the north wall + ground
            def top_at(w, k=k):
                if name == "west" and w > k["w1"] - WT + 1e-6: return SOFF_W
                return so
            for i in range(len(brk) - 1):
                b0, b1 = brk[i], brk[i + 1]
                if b1 - b0 < 1e-4: continue
                # split at the kiosk wall line for the west (the soffit steps there)
                for (s0, s1) in [(b0, b1)]:
                    a, b = ((uw, s0), (uw, s1)) if side == 1 else ((uw, s1), (uw, s0))
                    L = s1 - s0
                    hb = (lambda s, a=a, b=b, L=L: stair_line(a[1] + (b[1] - a[1]) * s / L))
                    tconst = top_at((s0 + s1) / 2)
                    ht = (lambda s, tconst=tconst: tconst)
                    # the window bays (the kiosk's frosted panels) as holes in the inner face
                    holes = []
                    for (wb0, wb1) in [(k["w0"] + s0_, k["w0"] + s1_) for s0_, s1_ in kiosk_bays(k, side)]:
                        lo_, hi_ = max(wb0, s0), min(wb1, s1)
                        if hi_ - lo_ > 0.01:
                            sa_, sb_ = sorted(((lo_ - a[1]) * (1 if b[1] > a[1] else -1), (hi_ - a[1]) * (1 if b[1] > a[1] else -1)))
                            holes.append((sa_, sb_, k["base"] + 1.05, so - 0.16))
                    mural_wall(mb, a, b, (nu, 0), hb=hb, ht=ht, holes=holes, vref=hb)
                    # the frosted panels' inside faces in the bays (the inside's own: they glow by day, the bake's sky)
                    for (sa_, sb_, z0_, z1_) in holes:
                        um_ = (uw + (k["u0"] if side == 0 else k["u1"])) / 2
                        pa_ = a[1] + (b[1] - a[1]) * sa_ / L; pb_ = a[1] + (b[1] - a[1]) * sb_ / L
                        mb.grid(P(um_, pa_, z0_), P(um_, pb_, z0_) - P(um_, pa_, z0_), P(um_, pa_, z1_) - P(um_, pa_, z0_), max(1, int(abs(pb_ - pa_) / 0.5)), 2,
                                "glass_frosted", C("glass_frosted", "inside"), want=N(nu, 0, 0))
            col.append(("wall", (uw, min(wa, wm)), (uw, max(wa, wm)), FLOOR - 0.2, so))
        # the window panels' inside faces (glowing by day: frosted glass), the reveals are the surface's
        # (added to the inside mesh in the glass's place: wall_mural code paint keeps the slot count; see the shader)
        # the end walls of the well: the closed kiosk end (inside), the corridor side (east: the kiosk's south wall over
        # the corridor beam; west: the soffit step at the corridor wall)
        iwc = (k["w0"] + WT) if m > 0 else (k["w1"] - WT)
        if name == "east":
            # the face over the beam: from the beam's bottom (SOFFIT - BEAM) up to the kiosk soffit, at w = CW1 (faces +w)
            mural_wall(mb, (iu1, CW1), (iu0, CW1), (0, 1), SOFFIT - BEAM, so, code="paint")
            col.append(("wall", (iu0, CW1), (iu1, CW1), SOFFIT - BEAM, so))
        else:
            # the soffit over the lowest treads (w from the kiosk's inner north face to the corridor's south wall)
            mb.grid(P(iu0, k["w1"] - WT, SOFF_W), P(iu1, k["w1"] - WT, SOFF_W) - P(iu0, k["w1"] - WT, SOFF_W), P(iu0, CW0, SOFF_W) - P(iu0, k["w1"] - WT, SOFF_W),
                    6, 2, "ceiling_paint", C("ceiling_paint", "ceiling"), want=N(0, 0, -1), uvf=lambda p: (p.x, -p.y))
            # the step down from SOFF_W to the beam's bottom at the corridor's south wall line (the beam's back face, faces -w)
            mural_wall(mb, (iu0, CW0), (iu1, CW0), (0, -1), SOFFIT - BEAM, SOFF_W, code="paint")
            # the kiosk's north wall inside face from SOFF_W up to the kiosk soffit (faces +w ... it faces the well: -w? the
            # well is at w < this face: it faces -w)
            mural_wall(mb, (iu0, k["w1"] - WT), (iu1, k["w1"] - WT), (0, -1), SOFF_W, so, code="paint")
            col.append(("rect", iu0, iu1, k["w1"] - WT, CW0, SOFF_W))
            col.append(("wall", (iu0, k["w1"] - WT), (iu1, k["w1"] - WT), SOFF_W, so))
        # the kiosk's soffit (the roof's underside inside) and the light fittings on it
        sw0, sw1 = sorted((wm, iwc if name == "east" else k["w1"] - WT))
        if name == "east": sw0 = CW1
        ceil_rect(iu0, iu1, sw0, sw1, so)
        col.append(("rect", iu0, iu1, sw0, sw1, so))
        for i in range(2 if name == "east" else 1):
            wl = sw0 + (sw1 - sw0) * ((i + 0.5) / (2 if name == "east" else 1))
            info["lights"].append(box_light(mb, (iu0 + iu1) / 2, wl, so, along_u=False))
        # handrails both sides
        for uu in (iu0 + 0.07, iu1 - 0.07):
            handrail(mb, uu, fls if m > 0 else fls, k)
        info["stairs"][name] = {"top_uw": [(iu0 + iu1) / 2, wm], "top_line_uw": [[iu0, wm], [iu1, wm]], "top_h": top, "risers": sum(f["n"] for f in fls), "riser_m": round(fls[0]["R"], 4), "going_m": GOING,
                                 "width_m": round(iu1 - iu0, 3), "foot_uw": [(iu0 + iu1) / 2, (CW0 + CW1) / 2]}
    return mb, col, info

def collision_tris(col):
    """the collision primitives -> a triangle soup in Blender coordinates"""
    T = []
    def quad(a, b, c, d): T.extend([a, b, c, a, c, d])
    for c in col:
        if c[0] == "rect":
            _, u0, u1, w0, w1, h = c
            quad(P(u0, w0, h), P(u1, w0, h), P(u1, w1, h), P(u0, w1, h))
        elif c[0] == "ramp":
            _, u0, u1, wa, ha, wb, hb = c
            quad(P(u0, wa, ha), P(u1, wa, ha), P(u1, wb, hb), P(u0, wb, hb))
        elif c[0] == "wall":
            _, a, b, h0, h1 = c
            quad(P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1))
    return T

# ================================================================================================ build the scene
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
PREV = {"brick_painted_white": (0.80, 0.78, 0.72), "paint_fascia": (0.85, 0.85, 0.83), "painted_metal_grey": (0.12, 0.2, 0.45), "glass_frosted": (0.6, 0.65, 0.62),
        "concrete": (0.45, 0.44, 0.42), "concrete_step": (0.5, 0.49, 0.47), "floor_tile_grey": (0.42, 0.42, 0.41), "wall_mural": (0.12, 0.28, 0.45),
        "ceiling_paint": (0.75, 0.75, 0.73), "lamp_glow": (1.0, 1.0, 0.95)}
MATS = {}
for nm in set(SURF_SLOTS + IN_SLOTS):
    m = bpy.data.materials.new(nm); m.use_nodes = True
    bs = m.node_tree.nodes["Principled BSDF"]; bs.inputs["Base Color"].default_value = (*PREV[nm], 1); bs.inputs["Roughness"].default_value = 0.85
    MATS[nm] = m

def make(name, mb, bevel=0.0, bevel_angle=35):
    me = bpy.data.meshes.new(name)
    me.from_pydata(mb.v, [], mb.f); me.update()
    for s in mb.slots: me.materials.append(MATS[s])
    me.polygons.foreach_set("material_index", mb.m)
    me.polygons.foreach_set("use_smooth", mb.sm)
    uvl = me.uv_layers.new(name="UVMap")
    d = [0.0] * (2 * len(me.loops))
    for pi, poly in enumerate(me.polygons):
        for k, li in enumerate(poly.loop_indices): d[2 * li], d[2 * li + 1] = mb.uv[pi][k]
    uvl.data.foreach_set("uv", d)
    # the face code -> a face attribute (to COLOR_0 after the bevel: new faces inherit their parent's)
    at = me.attributes.new("code", "INT", "FACE"); at.data.foreach_set("value", mb.c)
    at = me.attributes.new("sm0", "INT", "FACE"); at.data.foreach_set("value", [1 if x else 0 for x in mb.sm])
    o = bpy.data.objects.new(name, me); scn.collection.objects.link(o)
    bm = bmesh.new(); bm.from_mesh(me)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=0.0005)
    bmesh.ops.dissolve_degenerate(bm, edges=bm.edges, dist=0.0002)
    bm.to_mesh(me); bm.free(); me.update()
    if bevel:
        # the bevel only on the flat parts' hard edges (a weight per edge): the round parts (tubes, bollards) keep theirs
        bm = bmesh.new(); bm.from_mesh(me)
        sml = bm.faces.layers.int.get("sm0")
        bw = [0.0] * len(bm.edges)
        for e in bm.edges:
            lf = e.link_faces
            if (len(lf) == 2 and not lf[0][sml] and not lf[1][sml] and lf[0].material_index == lf[1].material_index
                    and min(lf[0].calc_area(), lf[1].calc_area()) > 4e-4
                    and all(len({f.material_index for f in v.link_faces}) == 1 for v in e.verts) and e.calc_face_angle(0) > math.radians(bevel_angle)): bw[e.index] = 1.0
        bm.free()
        wa = me.attributes.get("bevel_weight_edge") or me.attributes.new("bevel_weight_edge", "FLOAT", "EDGE"); wa.data.foreach_set("value", bw)
        md = o.modifiers.new("bevel", "BEVEL"); md.width = bevel; md.segments = 1; md.limit_method = "WEIGHT"
        md.use_clamp_overlap = True; md.harden_normals = False
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        bpy.ops.object.modifier_apply(modifier="bevel")
    # CLEAN SHADING (rule no-bad-shading-topology): flat on every plane; smooth only on the curved parts the builder
    # marks (tubes, bollards) across shallow edges; then WEIGHTED NORMALS (face area, keep sharp) on those
    sm0 = [0] * len(me.polygons); me.attributes["sm0"].data.foreach_get("value", sm0)
    me.polygons.foreach_set("use_smooth", [bool(x) for x in sm0]); me.attributes.remove(me.attributes["sm0"]); me.update()
    bm = bmesh.new(); bm.from_mesh(me)
    # a bevel can leave non-planar quads (a chamfer meeting a reveal's corner): those are split into two flat triangles,
    # each shaded by its own normal (mesh_audit bentflat)
    np_ = [f for f in bm.faces if len(f.verts) > 3 and not f.smooth and max(abs(f.normal.dot((v.co - f.verts[0].co))) for v in f.verts) > 1e-5]
    if np_: bmesh.ops.triangulate(bm, faces=np_)
    for e in bm.edges:
        lf = e.link_faces
        e.smooth = len(lf) == 2 and lf[0].smooth and lf[1].smooth and e.calc_face_angle(0) < math.radians(50)
    bm.to_mesh(me); bm.free(); me.update()
    if any(p.use_smooth for p in me.polygons) and os.environ.get("UP_NOWN") != "1":
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        md = o.modifiers.new("wn", "WEIGHTED_NORMAL"); md.mode = "FACE_AREA"; md.weight = 100; md.keep_sharp = True; md.thresh = 0.01
        bpy.ops.object.modifier_apply(modifier="wn")
    # COLOR_0: code / 16 + 1/32, AO 1, width 1
    codes = [0] * len(me.polygons); me.attributes["code"].data.foreach_get("value", codes)
    ca = me.color_attributes.new("Col", "FLOAT_COLOR", "CORNER")
    cols = []
    for p in me.polygons:
        r = codes[p.index] / 16 + 1 / 32
        for _ in p.loop_indices: cols += [r, 1.0, 1.0, 1.0]
    ca.data.foreach_set("color", cols)
    me.attributes.remove(me.attributes["code"])
    me.color_attributes.active_color = ca
    me.validate()
    return o

def tris_of(o): return sum(len(p.vertices) - 2 for p in o.data.polygons)

t = time.time()
lod_objs = []
for lod in (0, 1, 2):
    mb = kiosk_lod(lod)
    lod_objs.append(make(f"Underpass_lod{lod}", mb, bevel=0.012 if lod == 0 else 0.0))
inside_mb, COL, INFO = build_inside()
ob_in = make("Inside", inside_mb, bevel=0.008, bevel_angle=50)
# the throat: the kiosks' inner faces / soffit / the first 4 steps of each stair / a dark card, city-lit, shown until the
# inside is
th = MB(SURF_SLOTS)
for name, k in KIOSKS.items():
    iu0, iu1, so, m, wm, tw, top = k["iu0"], k["iu1"], k["soffit"], k["mouth"], k["mw"], k["top_w"], k["top"]
    iwc = (k["w0"] + WT) if m > 0 else (k["w1"] - WT)
    fl = k["flights"][-1] if m > 0 else k["flights"][0]
    # the first 4 steps down from the landing
    d = -fl["dir"]
    for i in range(4):
        wr = tw + d * i * GOING; hh = top - i * fl["R"]
        th.face([P(iu0, wr, hh - fl["R"]), P(iu1, wr, hh - fl["R"]), P(iu1, wr, hh), P(iu0, wr, hh)], "concrete", C("concrete", "riser"), want=N(0, -m, 0))
        th.face([P(iu0, wr, hh - fl["R"]), P(iu1, wr, hh - fl["R"]), P(iu1, wr + d * GOING, hh - fl["R"]), P(iu0, wr + d * GOING, hh - fl["R"])], "concrete", C("concrete", "tread"), want=N(0, 0, 1))
    wcard = tw + d * 4 * GOING; hcard = top - 4 * fl["R"]
    wfar = iwc if name == "west" else CW1
    th.face([P(iu0, wcard, hcard), P(iu1, wcard, hcard), P(iu1, wfar, hcard), P(iu0, wfar, hcard)], "concrete", C("concrete", "throat"), want=N(0, 0, 1))
    for (uw, nu) in ((iu0, 1), (iu1, -1)):
        holes = [(s0, s1, k["base"] + 1.05, so - 0.16) for s0, s1 in kiosk_bays(k, 0)]
        # the inner faces with the window bays open (the reveals are LOD0's), the frosted panels' inside faces in them
        bays = [(k["w0"] + s0 - min(wfar, wm), k["w0"] + s1 - min(wfar, wm)) for s0, s1 in kiosk_bays(k, 0)]
        wall_face(th, (uw, min(wfar, wm)), (uw, max(wfar, wm)), hcard, so, (nu, 0), "brick_painted_white", C("brick_painted_white", "inner"),
                  [(a_, b_, k["base"] + 1.05, so - 0.16) for a_, b_ in bays])
        um_ = (uw + (k["u0"] if nu > 0 else k["u1"])) / 2
        for s0, s1 in kiosk_bays(k, 0):
            th.face([P(um_, k["w0"] + s0, k["base"] + 1.05), P(um_, k["w0"] + s1, k["base"] + 1.05), P(um_, k["w0"] + s1, so - 0.16), P(um_, k["w0"] + s0, so - 0.16)],
                    "glass_frosted", C("glass_frosted", "inside"), want=N(nu, 0, 0))
    wall_face(th, (iu0, wfar), (iu1, wfar), hcard, so, (0, m), "brick_painted_white", C("brick_painted_white", "inner"))
    th.face([P(iu0, wfar, so), P(iu1, wfar, so), P(iu1, wm, so), P(iu0, wm, so)], "paint_fascia", C("paint_fascia", "soffit"), want=N(0, 0, -1))
ob_th = make("Underpass_throat", th)
# the collision mesh
ct = collision_tris(COL)
cm = bpy.data.meshes.new("Underpass_collision")
cm.from_pydata([tuple(v) for v in ct], [], [(i, i + 1, i + 2) for i in range(0, len(ct), 3)]); cm.update()
cm.materials.append(MATS["concrete"])
ob_col = bpy.data.objects.new("Underpass_collision", cm); scn.collection.objects.link(ob_col)
TIMES["build_s"] = round(time.time() - t, 1)
TRIS = {"lod0": tris_of(lod_objs[0]), "lod1": tris_of(lod_objs[1]), "lod2": tris_of(lod_objs[2]), "throat": tris_of(ob_th), "inside": tris_of(ob_in), "collision": len(ct) // 3}
print("triangles", TRIS, f"{time.time() - T0:.1f}s")

# ================================================================================================ the site (bake occluders)
def site_ground():
    """the city's terrain over the site, minus the wells (as the tile worker cuts it), for the bakes"""
    st = 0.5; us = np.arange(G_["u0"], G_["u1"] + 1e-6, st); ws = np.arange(G_["w0"], G_["w1"] + 1e-6, st)
    vs, fs = [], []
    idx = {}
    for j, w in enumerate(ws):
        for i, u in enumerate(us):
            idx[(i, j)] = len(vs); vs.append(tuple(P(u, w, ground(u, w))))
    def in_well(u, w):
        return any(k["iu0"] < u < k["iu1"] and min(k["mw"], (k["w0"] + WT) if k["mouth"] > 0 else (k["w1"] - WT)) < w < max(k["mw"], (k["w0"] + WT) if k["mouth"] > 0 else (k["w1"] - WT)) for k in KIOSKS.values())
    for j in range(len(ws) - 1):
        for i in range(len(us) - 1):
            if in_well(us[i] + st / 2, ws[j] + st / 2): continue
            fs.append((idx[(i, j)], idx[(i + 1, j)], idx[(i + 1, j + 1)], idx[(i, j + 1)]))
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(vs, [], fs); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    g = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(g)
    occ = bpy.data.materials.new("occ"); occ.use_nodes = True; occ.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.3, 0.29, 0.26, 1)
    gm.materials.append(occ)
    # the neighbours (boxes from their footprints) and the platforms
    nm = bpy.data.meshes.new("Neighbours"); vs, fs = [], []
    for b in SITE["neighbours"]:
        r = b["ring"]; n = len(r); i0 = len(vs)
        for (u, w) in r: vs.append(tuple(P(u, w, b["base"] - 1))); vs.append(tuple(P(u, w, b["top"])))
        for i in range(n):
            j2 = (i + 1) % n; fs.append((i0 + 2 * i, i0 + 2 * j2, i0 + 2 * j2 + 1, i0 + 2 * i + 1))
        fs.append(tuple(i0 + 2 * i + 1 for i in range(n)))
    nm.from_pydata(vs, [], fs); nm.update(); nm.materials.append(occ)
    nb = bpy.data.objects.new("Neighbours", nm); scn.collection.objects.link(nb)
    return [g, nb]

# ================================================================================================ the mural (OUR OWN design)
def make_mural(path, px=2048):
    """an invented underwater mural, three 10 m x 2.5 m strips (rows 0-2) + row 3: the lettering band 'CALEVOET ·
    KALEVOET' (x 0..7 m) and an invented arrow sign (x 7..10 m). Rendered orthographically (Cycles, emission only) from
    shapes made here: a sea gradient, light shafts, a sandy bottom, kelp, corals, fish shoals, a turtle, a diver's helmet, a
    wreck's bow, jellyfish, bubbles, and a few spray tags. Atlas y (scene) = row * 2.5 + height on the wall."""
    t0 = time.time()
    sc = bpy.data.scenes.new("Mural")
    sc.render.engine = "CYCLES"; gpu_optix(sc); sc.cycles.samples = 16; sc.cycles.use_denoising = False
    sc.render.resolution_x = sc.render.resolution_y = px; sc.render.film_transparent = False
    sc.view_settings.view_transform = "Standard"; sc.view_settings.look = "None"
    sc.world = bpy.data.worlds.new("mw"); sc.world.use_nodes = True; sc.world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0
    cam = bpy.data.objects.new("mcam", bpy.data.cameras.new("mcam")); sc.collection.objects.link(cam); sc.camera = cam
    cam.data.type = "ORTHO"; cam.data.ortho_scale = 10.0; cam.location = (5, 5, 10); cam.rotation_euler = (0, 0, 0)
    import random
    rnd = random.Random(1950)                    # (the year the level crossing was replaced)
    def emis(name, rgb, strength=1.0, alpha=1.0):
        m = bpy.data.materials.new(name); m.use_nodes = True; nt = m.node_tree
        for n in list(nt.nodes): nt.nodes.remove(n)
        e = nt.nodes.new("ShaderNodeEmission"); e.inputs["Color"].default_value = (*rgb, 1); e.inputs["Strength"].default_value = strength
        o = nt.nodes.new("ShaderNodeOutputMaterial")
        if alpha < 1:
            tr = nt.nodes.new("ShaderNodeBsdfTransparent"); mx = nt.nodes.new("ShaderNodeMixShader"); mx.inputs[0].default_value = alpha
            nt.links.new(tr.outputs[0], mx.inputs[1]); nt.links.new(e.outputs[0], mx.inputs[2]); nt.links.new(mx.outputs[0], o.inputs[0])
        else: nt.links.new(e.outputs[0], o.inputs[0])
        return m
    def srgb(h):
        c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
        return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)
    def poly2d(pts, z, mat):
        me = bpy.data.meshes.new("p"); bm = bmesh.new()
        vs = [bm.verts.new((x, y, z)) for x, y in pts]
        try: bm.faces.new(vs)
        except ValueError: pass
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(me); bm.free(); me.materials.append(mat)
        o = bpy.data.objects.new("p", me); sc.collection.objects.link(o); return o
    def disc(cx, cy, rx, ry, z, mat, n=28, rot=0.0):
        pts = [(cx + rx * math.cos(2 * math.pi * i / n) * math.cos(rot) - ry * math.sin(2 * math.pi * i / n) * math.sin(rot),
                cy + rx * math.cos(2 * math.pi * i / n) * math.sin(rot) + ry * math.sin(2 * math.pi * i / n) * math.cos(rot)) for i in range(n)]
        return poly2d(pts, z, mat)
    def ring2d(cx, cy, r0, r1, z, mat, n=24):
        me = bpy.data.meshes.new("r"); bm = bmesh.new()
        a = [bm.verts.new((cx + r0 * math.cos(2 * math.pi * i / n), cy + r0 * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
        b = [bm.verts.new((cx + r1 * math.cos(2 * math.pi * i / n), cy + r1 * math.sin(2 * math.pi * i / n), z)) for i in range(n)]
        for i in range(n): bm.faces.new([a[i], a[(i + 1) % n], b[(i + 1) % n], b[i]])
        bm.to_mesh(me); bm.free(); me.materials.append(mat); o = bpy.data.objects.new("r", me); sc.collection.objects.link(o); return o
    def stroke(pts, w, z, mat):
        """a ribbon of width w along a polyline (kelp, tags)"""
        me = bpy.data.meshes.new("s"); bm = bmesh.new(); L, R_ = [], []
        for i, (x, y) in enumerate(pts):
            a = pts[max(i - 1, 0)]; b = pts[min(i + 1, len(pts) - 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]; l = math.hypot(dx, dy) or 1
            ww = w(i / max(1, len(pts) - 1)) if callable(w) else w
            L.append(bm.verts.new((x - dy / l * ww / 2, y + dx / l * ww / 2, z))); R_.append(bm.verts.new((x + dy / l * ww / 2, y - dx / l * ww / 2, z)))
        for i in range(len(pts) - 1): bm.faces.new([L[i], R_[i], R_[i + 1], L[i + 1]])
        bm.to_mesh(me); bm.free(); me.materials.append(mat); o = bpy.data.objects.new("s", me); sc.collection.objects.link(o); return o
    def text(s, x, y, size, z, mat, rot=0.0, extrude=0.0, font=None, align="CENTER"):
        cu = bpy.data.curves.new("t", "FONT"); cu.body = s; cu.size = size; cu.align_x = align; cu.align_y = "CENTER"; cu.extrude = extrude
        if font: cu.font = font
        o = bpy.data.objects.new("t", cu); o.location = (x, y, z); o.rotation_euler = (0, 0, rot); sc.collection.objects.link(o)
        cu.materials.append(mat); return o
    # ---- the sea: per strip a vertical gradient (deep at the floor, light near the ceiling) as vertex-coloured quads
    sea = bpy.data.materials.new("sea"); sea.use_nodes = True; nt = sea.node_tree
    for n in list(nt.nodes): nt.nodes.remove(n)
    at = nt.nodes.new("ShaderNodeVertexColor"); at.layer_name = "Col"
    ns = nt.nodes.new("ShaderNodeTexNoise"); ns.inputs["Scale"].default_value = 1.2; ns.inputs["Detail"].default_value = 3
    tc = nt.nodes.new("ShaderNodeTexCoord"); nt.links.new(tc.outputs["Object"], ns.inputs["Vector"])
    mx = nt.nodes.new("ShaderNodeMix"); mx.data_type = "RGBA"; mx.blend_type = "OVERLAY"; mx.inputs["Factor"].default_value = 0.18
    nt.links.new(at.outputs["Color"], mx.inputs[6]); nt.links.new(ns.outputs["Color"], mx.inputs[7])
    em = nt.nodes.new("ShaderNodeEmission"); nt.links.new(mx.outputs[2], em.inputs["Color"])
    out = nt.nodes.new("ShaderNodeOutputMaterial"); nt.links.new(em.outputs[0], out.inputs[0])
    deep, mid, light = srgb("0e3a5c"), srgb("1f6f93"), srgb("6cc3cf")
    me = bpy.data.meshes.new("sea"); bm = bmesh.new()
    cl = bm.loops.layers.float_color.new("Col")
    for row in range(3):
        y0 = row * 2.5
        for j in range(10):
            ya, yb = y0 + 2.5 * j / 10, y0 + 2.5 * (j + 1) / 10
            def colat(y):
                t_ = (y - y0) / 2.5
                a, b, f = (deep, mid, t_ / 0.55) if t_ < 0.55 else (mid, light, (t_ - 0.55) / 0.45)
                return [a[i] + (b[i] - a[i]) * f for i in range(3)] + [1]
            v = [bm.verts.new((0, ya, 0)), bm.verts.new((10, ya, 0)), bm.verts.new((10, yb, 0)), bm.verts.new((0, yb, 0))]
            f = bm.faces.new(v)
            for lp, yy in zip(f.loops, (ya, ya, yb, yb)): lp[cl] = colat(yy)
    # row 3 (lettering + signs): a deep blue band
    v = [bm.verts.new((0, 7.5, 0)), bm.verts.new((10, 7.5, 0)), bm.verts.new((10, 10, 0)), bm.verts.new((0, 10, 0))]
    f = bm.faces.new(v)
    for lp in f.loops: lp[cl] = list(srgb("123f66")) + [1]
    bm.to_mesh(me); bm.free(); me.materials.append(sea); so_ = bpy.data.objects.new("sea", me); sc.collection.objects.link(so_)
    # ---- light shafts from the surface (pale, translucent-looking: lighter emission quads, tapering down)
    shaft = emis("shaft", srgb("9fe3e6"), 1.0, alpha=0.16)
    for row in range(3):
        for i in range(7):
            x = rnd.uniform(0.3, 9.7); wtop = rnd.uniform(0.25, 0.6); lean = rnd.uniform(-0.5, 0.2)
            y1 = row * 2.5 + 2.5; y0 = row * 2.5 + rnd.uniform(0.6, 1.3)
            poly2d([(x - wtop / 2, y1), (x + wtop / 2, y1), (x + lean + wtop * 0.9, y0), (x + lean - wtop * 0.1, y0)], 0.001, shaft)
    # (the shafts at partial strength: a second sea layer on top would wash them; their material is pale already)
    # ---- the sandy bottom with ripples, rocks
    sand, sand2, rock = emis("sand", srgb("c9a86a")), emis("sand2", srgb("a98a52")), emis("rock", srgb("4f5f66"))
    for row in range(3):
        y0 = row * 2.5
        pts = [(0, y0)] + [(x / 4, y0 + 0.24 + 0.06 * math.sin(x * 0.9 + row) + 0.03 * math.sin(x * 2.3)) for x in range(0, 41)] + [(10, y0)]
        poly2d(pts, 0.003, sand)
        for i in range(14):
            x = rnd.uniform(0, 10); poly2d([(x, y0 + 0.08), (x + 0.4, y0 + 0.1), (x + 0.8, y0 + 0.08), (x + 0.4, y0 + 0.12)], 0.004, sand2)
        for i in range(5):
            x = rnd.uniform(0.3, 9.7); disc(x, y0 + 0.2, rnd.uniform(0.15, 0.35), rnd.uniform(0.1, 0.2), 0.005, rock)
    # ---- kelp / seaweed (green ribbons swaying)
    kelp = [emis("kelp1", srgb("2f7d4a")), emis("kelp2", srgb("4c9a3c")), emis("kelp3", srgb("1f5e45"))]
    for row in range(3):
        y0 = row * 2.5
        for i in range(16):
            x = rnd.uniform(0.1, 9.9); h = rnd.uniform(0.7, 1.9); ph = rnd.uniform(0, 6.28); amp = rnd.uniform(0.05, 0.14)
            pts = [(x + amp * math.sin(ph + t_ * 5.0) * t_, y0 + 0.15 + h * t_) for t_ in np.linspace(0, 1, 22)]
            stroke(pts, lambda q: 0.09 * (1 - 0.7 * q), 0.006 + i * 1e-5, kelp[i % 3])
    # ---- corals: branching strokes (orange, coral pink, purple) and brain corals (discs with rings)
    corals = [emis("c1", srgb("e8743b")), emis("c2", srgb("e85d75")), emis("c3", srgb("9b59b6")), emis("c4", srgb("f2b134"))]
    def branch(x, y, ang, L, w, depth, mat, z):
        x2, y2 = x + L * math.cos(ang), y + L * math.sin(ang)
        stroke([(x, y), ((x + x2) / 2 + 0.02, (y + y2) / 2), (x2, y2)], w, z, mat)
        disc(x2, y2, w * 0.55, w * 0.55, z + 1e-5, mat, n=12)
        if depth:
            for da in (-0.5, 0.45):
                branch(x2, y2, ang + da + rnd.uniform(-0.15, 0.15), L * 0.72, w * 0.75, depth - 1, mat, z + 2e-5)
    for row in range(3):
        y0 = row * 2.5
        for i in range(6):
            branch(rnd.uniform(0.3, 9.7), y0 + 0.2, math.pi / 2 + rnd.uniform(-0.3, 0.3), rnd.uniform(0.18, 0.3), 0.06, 3, corals[i % 4], 0.008 + i * 1e-4)
        for i in range(3):
            x = rnd.uniform(0.4, 9.6); m_ = corals[(i + 1) % 4]
            disc(x, y0 + 0.28, 0.22, 0.16, 0.009, m_)
            for r_ in (0.06, 0.11, 0.16): ring2d(x, y0 + 0.28, r_, r_ + 0.012, 0.0095, emis(f"cr{row}{i}{r_}", [c * 0.7 for c in m_.node_tree.nodes[0].inputs["Color"].default_value[:3]]))
    # ---- fish shoals (an ellipse body, a tail, an eye, a stripe), facing left or right
    fishes = [("f1", "f5a623", "ffffff"), ("f2", "f8e71c", "2b2b2b"), ("f3", "ff6f61", "ffffff"), ("f4", "7ed6df", "1e3d59"), ("f5", "e056fd", "ffffff")]
    fm = {k: (emis(k, srgb(a)), emis(k + "s", srgb(b))) for k, a, b in fishes}
    eye_w, eye_b = emis("eyew", srgb("ffffff")), emis("eyeb", srgb("111111"))
    def fish(x, y, L, d, kind, z):
        body, strip = fm[kind]
        disc(x, y, L / 2, L / 4.2, z, body)
        poly2d([(x - d * L * 0.42, y), (x - d * L * 0.75, y + L * 0.22), (x - d * L * 0.7, y - L * 0.22)], z, body)
        stroke([(x - d * L * 0.05, y + L * 0.2), (x - d * L * 0.1, y - L * 0.2)], L * 0.07, z + 1e-5, strip)
        disc(x + d * L * 0.28, y + L * 0.05, L * 0.07, L * 0.07, z + 2e-5, eye_w, n=10); disc(x + d * L * 0.3, y + L * 0.05, L * 0.035, L * 0.035, z + 3e-5, eye_b, n=8)
    zf = 0.02
    for row in range(3):
        y0 = row * 2.5
        for s in range(3):
            cx, cy = rnd.uniform(0.8, 9.2), y0 + rnd.uniform(0.9, 2.1); d = rnd.choice((-1, 1)); kind = rnd.choice([f[0] for f in fishes])
            for i in range(rnd.randint(5, 9)):
                zf += 1e-4; fish(cx + rnd.uniform(-0.8, 0.8), cy + rnd.uniform(-0.3, 0.3), rnd.uniform(0.14, 0.22), d, kind, zf)
        for i in range(4):
            zf += 1e-4; fish(rnd.uniform(0.3, 9.7), y0 + rnd.uniform(0.6, 2.2), rnd.uniform(0.3, 0.45), rnd.choice((-1, 1)), rnd.choice([f[0] for f in fishes]), zf)
    # ---- the big pieces: a turtle (row 0), a diver's helmet with its air hose (row 1), a wreck's bow (row 2), jellyfish
    shell, skin = emis("shell", srgb("5d7a3a")), emis("skin", srgb("9fb86a"))
    tx, ty = 6.2, 1.45
    for (dx, dy, a) in ((0.42, 0.22, 0.6), (0.42, -0.22, -0.6), (-0.38, 0.2, 2.5), (-0.38, -0.2, -2.5)):
        disc(tx + dx, ty + dy, 0.26, 0.09, 0.05, skin, rot=a)
    disc(tx + 0.62, ty, 0.13, 0.1, 0.05, skin)
    disc(tx, ty, 0.5, 0.34, 0.051, shell)
    for (dx, dy) in ((0, 0), (0.22, 0.12), (-0.22, 0.12), (0.22, -0.12), (-0.22, -0.12)): disc(tx + dx, ty + dy, 0.1, 0.08, 0.052, skin, n=6)
    brass, glass_, dark = emis("brass", srgb("c58b3a")), emis("hglass", srgb("2a4d5e")), emis("hdark", srgb("3b2a1a"))
    hx, hy = 3.0, 2.5 + 1.3
    poly2d([(hx - 0.55, hy - 0.55), (hx + 0.55, hy - 0.55), (hx + 0.45, hy - 0.35), (hx - 0.45, hy - 0.35)], 0.05, dark)
    disc(hx, hy + 0.05, 0.5, 0.5, 0.051, brass)
    for (dx, dy, r_) in ((0, 0.05, 0.22), (-0.36, 0.08, 0.1), (0.36, 0.08, 0.1)):
        ring2d(hx + dx, hy + dy, r_, r_ + 0.05, 0.053, dark); disc(hx + dx, hy + dy, r_, r_, 0.052, glass_)
    stroke([(hx + 0.45, hy + 0.3), (hx + 1.0, hy + 0.7), (hx + 1.6, hy + 0.8), (hx + 2.4, hy + 1.1)], 0.05, 0.05, dark)
    wood, wood2 = emis("wreck", srgb("4a3426")), emis("wreck2", srgb("6b4c34"))
    wx, wy = 7.5, 5.0
    poly2d([(wx - 1.6, wy + 0.25), (wx + 1.1, wy + 0.25), (wx + 1.7, wy + 1.35), (wx + 0.9, wy + 1.0), (wx - 1.6, wy + 1.0)], 0.05, wood)
    for i in range(5): stroke([(wx - 1.5, wy + 0.4 + i * 0.13), (wx + 1.2 + i * 0.08, wy + 0.4 + i * 0.13)], 0.025, 0.051, wood2)
    stroke([(wx - 0.3, wy + 1.0), (wx - 0.1, wy + 2.25)], 0.08, 0.05, wood)
    jel, jel2 = emis("jel", srgb("f3c6e8")), emis("jel2", srgb("d08ac0"))
    for (jx, jy) in ((1.3, 1.9), (8.6, 4.6), (4.6, 6.8), (1.0, 6.4)):
        poly2d([(jx + 0.25 * math.cos(a), jy + 0.2 * math.sin(a)) for a in np.linspace(0, math.pi, 16)], 0.06, jel)
        for k_ in range(5):
            x_ = jx - 0.2 + 0.1 * k_
            stroke([(x_ + 0.03 * math.sin(q * 9 + k_), jy - q * 0.55) for q in np.linspace(0, 1, 10)], 0.012, 0.061, jel2)
    # ---- bubbles
    bub = emis("bub", srgb("d9f3f7"))
    for row in range(3):
        for i in range(40):
            r_ = rnd.uniform(0.015, 0.05); ring2d(rnd.uniform(0.1, 9.9), row * 2.5 + rnd.uniform(0.4, 2.45), r_, r_ * 1.35, 0.09 + i * 1e-5, bub, n=14)
    # ---- a few spray TAGS (invented names, our own lettering), outlined
    tagc = [("ffffff", "e2386f"), ("111111", "7bdc4a"), ("ffd23f", "2b2b2b"), ("e2386f", "ffffff")]
    names = ["KALV", "ZEBO", "MOKA 24", "R1F", "UCL", "NEMO"]
    for i, nm in enumerate(names):
        row = i % 3; x = 0.8 + (i * 3.1) % 8.4; y = row * 2.5 + rnd.uniform(0.55, 1.05)
        fill, line = tagc[i % 4]
        o = text(nm, x, y, rnd.uniform(0.28, 0.4), 0.2 + i * 0.01, emis(f"tagf{i}", srgb(fill)), rot=rnd.uniform(-0.12, 0.12))
        o.data.offset = 0.0; o.data.shear = 0.25
        o2 = text(nm, x, y, o.data.size, 0.195 + i * 0.01, emis(f"tagl{i}", srgb(line)), rot=o.rotation_euler.z); o2.data.shear = 0.25; o2.data.offset = 0.025
    # ---- row 3: the lettering band (x 0..7) and the sign (x 7..10)
    let = emis("let", srgb("f4f1e8")); let2 = emis("let2", srgb("e8b923"))
    poly2d([(0, 7.5 + 0.0), (7, 7.5), (7, 7.5 + 0.25), (0, 7.5 + 0.25)], 0.01, emis("band", srgb("0d2f4f")))
    text("CALEVOET · KALEVOET", 3.5, 7.5 + 0.125, 0.17, 0.02, let)
    for xx in np.linspace(0.15, 6.85, 2): disc(xx, 7.5 + 0.125, 0.04, 0.04, 0.021, let2, n=10)
    # the sign (invented, white panel, a dark blue arrow, "Quai / Perron" and the street names)
    sw = emis("signw", srgb("f2f2ee")); sb = emis("signb", srgb("1d3f8f"))
    poly2d([(7.1, 7.55), (9.9, 7.55), (9.9, 8.05), (7.1, 8.05)], 0.01, sw)
    poly2d([(7.25, 7.8), (7.45, 7.95), (7.45, 7.86), (7.75, 7.86), (7.75, 7.74), (7.45, 7.74), (7.45, 7.65)], 0.02, sb)
    text("Ch. d'Alsemberg · Van Ophem", 8.65, 7.8, 0.1, 0.02, sb)
    poly2d([(7.1, 8.15), (9.9, 8.15), (9.9, 8.65), (7.1, 8.65)], 0.01, sw)
    poly2d([(9.75, 8.4), (9.55, 8.55), (9.55, 8.46), (9.25, 8.46), (9.25, 8.34), (9.55, 8.34), (9.55, 8.25)], 0.02, sb)
    text("Rue Engeland · Dieweg", 8.35, 8.4, 0.11, 0.02, sb)
    sc.render.filepath = path; sc.render.image_settings.file_format = "PNG"; sc.render.image_settings.color_mode = "RGB"
    bpy.ops.render.render(write_still=True, scene=sc.name)
    TIMES["mural_s"] = round(time.time() - t0, 1)
    print("mural", path, TIMES["mural_s"], "s")

def gpu_optix(sc=None):
    """Cycles on the GPU through OptiX (--factory-startup leaves it on the CPU)"""
    sc = sc or bpy.context.scene
    try:
        pr = bpy.context.preferences.addons["cycles"].preferences
        pr.compute_device_type = "OPTIX"; pr.get_devices()
        on = [d for d in pr.devices if d.type == "OPTIX"]
        for d in pr.devices: d.use = d.type == "OPTIX"
        sc.cycles.device = "GPU" if on else "CPU"
    except Exception as e:
        sc.cycles.device = "CPU"; on = []; print("OptiX:", e)
    print("Cycles device:", sc.cycles.device, [d.name for d in on])
    return sc.cycles.device

MURAL = os.path.join(OUT, "mural.png")
if BAKE or not os.path.exists(MURAL): make_mural(MURAL)

# ================================================================================================ the bakes
scn.render.engine = "CYCLES"
DEVICE = gpu_optix(scn)
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.use_nodes = True
WBG = scn.world.node_tree.nodes["Background"]
site = site_ground()
# ---- the surface's AO into UV1 (one 1024 lightmap for the three levels + the throat: LOD0 / throat in the top 70 %)
AO_PX = 1024
for i, o in enumerate(lod_objs + [ob_th]):
    me = o.data
    lm = me.uv_layers.new(name="Lightmap"); me.uv_layers.active = me.uv_layers["Lightmap"]
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    bpy.ops.object.mode_set(mode="EDIT"); bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(50), island_margin=0.003, area_weight=0.0, correct_aspect=True, scale_to_bounds=False)
    try: bpy.ops.uv.pack_islands(rotate=True, margin=0.004)
    except Exception as e: print("pack:", e)
    bpy.ops.object.mode_set(mode="OBJECT")
    # regions: lod0 [0, 0.62] x [0, 1], throat [0.62, 0.84], lod1 [0.84, 0.95], lod2 [0.95, 1.0] (u)
    reg = {0: (0.0, 0.62), 3: (0.62, 0.84), 1: (0.84, 0.95), 2: (0.95, 1.0)}[i]
    d = [0.0] * (2 * len(me.loops)); me.uv_layers["Lightmap"].data.foreach_get("uv", d)
    for k in range(0, len(d), 2): d[k] = reg[0] + d[k] * (reg[1] - reg[0]) * 0.998
    me.uv_layers["Lightmap"].data.foreach_set("uv", d)
    me.uv_layers.active = me.uv_layers["UVMap"]
ao_img = bpy.data.images.new("calevoet_ao", AO_PX, AO_PX, alpha=False, float_buffer=False); ao_img.colorspace_settings.name = "Non-Color"
for s in SURF_SLOTS:
    nt = MATS[s].node_tree; n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO_BAKE"; nt.nodes.active = n
ao_path = os.path.join(OUT, "calevoet_ao.png")
if BAKE:
    scn.cycles.samples = min(SAMPLES, 192)
    scn.world.light_settings.distance = 3.0
    t = time.time()
    # each level baked with the others hidden (they stand in one place); the inside hidden (its own bake)
    ob_in.hide_render = True; ob_col.hide_render = True
    first = True
    for i, o in enumerate(lod_objs + [ob_th]):
        for j, q in enumerate(lod_objs + [ob_th]): q.hide_render = not (q is o or (o is ob_th and j == 0) or (i == 0 and q is ob_th))
        for x in scn.objects: x.select_set(False)
        o.select_set(True); bpy.context.view_layer.objects.active = o
        o.data.uv_layers.active = o.data.uv_layers["Lightmap"]
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=4, use_clear=first)
        o.data.uv_layers.active = o.data.uv_layers["UVMap"]; first = False
    for q in lod_objs + [ob_th]: q.hide_render = False
    TIMES["ao_bake_s"] = round(time.time() - t, 1)
    st = scn.render.image_settings; st.file_format = "PNG"; st.color_mode = "BW"; st.color_depth = "8"; st.compression = 90
    ao_img.save_render(ao_path, scene=scn)
    print("AO", TIMES["ao_bake_s"], "s")
for s in SURF_SLOTS:
    nt = MATS[s].node_tree; nt.nodes.remove(nt.nodes["AO_BAKE"])

# ---- the inside's light, PER CORNER: day (the sky through the mouths + the lamps at day strength) and night (lamps)
def smooth_corners(me, name, iters=8):
    """per-corner bake noise -> one value per (vertex, shading normal), Laplacian passes over the faces' corners (the
    villa's: light does not bleed round sharp edges)"""
    ca = me.color_attributes[name]; n = len(me.loops)
    d = np.zeros(n * 4, dtype=np.float32); ca.data.foreach_get("color", d); val = d.reshape(-1, 4).astype(np.float64)
    keys = np.zeros(n, dtype=np.int64); kmap = {}
    cnor = me.corner_normals
    lv = np.zeros(n, dtype=np.int64); me.loops.foreach_get("vertex_index", lv)
    for li in range(n):
        v_ = cnor[li].vector
        keys[li] = kmap.setdefault((int(lv[li]), round(v_.x * 20), round(v_.y * 20), round(v_.z * 20)), len(kmap))
    K_ = len(kmap)
    acc = np.zeros((K_, 4)); cnt = np.bincount(keys, minlength=K_).astype(np.float64)[:, None]
    np.add.at(acc, keys, val); kv = acc / np.maximum(cnt, 1)
    pa, pb = [], []
    for f in me.polygons:
        ks = [keys[li] for li in f.loop_indices]
        for i in range(len(ks)):
            pa.append(ks[i]); pb.append(ks[(i + 1) % len(ks)]); pa.append(ks[(i + 1) % len(ks)]); pb.append(ks[i])
    pa = np.array(pa); pb = np.array(pb)
    deg = np.bincount(pa, minlength=K_).astype(np.float64)[:, None]
    for _ in range(iters):
        nb_ = np.zeros_like(kv); np.add.at(nb_, pa, kv[pb])
        kv = np.where(deg > 0, 0.5 * kv + 0.5 * nb_ / np.maximum(deg, 1), kv)
    ca.data.foreach_set("color", kv[keys].astype(np.float32).ravel())

LAMP_W = 18.0       # [E] W per box light (a 1.2 m LED batten ~ 36 W electrical, ~4000 lm; Cycles area-light watts)
def bake_inside():
    t = time.time()
    me = ob_in.data
    # bake materials: plausible albedo for the bounces (the mural's mean blue, the floor's grey, the white ceiling)
    alb = {"concrete_step": 0.45, "floor_tile_grey": 0.38, "wall_mural": (0.16, 0.32, 0.42), "ceiling_paint": 0.72, "painted_metal_grey": 0.25, "lamp_glow": 0.9, "glass_frosted": 0.8}
    saved = list(me.materials)
    bm_ = {}
    for s in IN_SLOTS:
        m = bpy.data.materials.new("bake_" + s); m.use_nodes = True; c = alb[s]; c = (c, c, c) if isinstance(c, float) else c
        m.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (*c, 1); m.node_tree.nodes["Principled BSDF"].inputs["Roughness"].default_value = 0.9
        bm_[s] = m
    # the kiosks' shells (LOD0 + throat walls hidden: the inside has its own walls) occlude; the frosted panels glow by day
    lamps = []
    for (u, w, h, L, Wd, along) in INFO["lights"]:
        ld = bpy.data.lights.new("lamp", "AREA"); ld.shape = "RECTANGLE"; ld.energy = LAMP_W; ld.color = (1.0, 0.97, 0.92)
        ld.size, ld.size_y = (L - 0.05, Wd - 0.05) if along else (Wd - 0.05, L - 0.05)
        lo = bpy.data.objects.new("lamp", ld); lo.location = P(u, w, h); lo.rotation_euler = (math.pi, 0, 0)    # facing down
        scn.collection.objects.link(lo); lamps.append(lo)
    panels = []
    pm = bpy.data.meshes.new("panels"); pv, pf = [], []
    for k in KIOSKS.values():
        for side in (0, 1):
            uo = k["u0"] if side == 0 else k["u1"]; um = (uo + (k["iu0"] if side == 0 else k["iu1"])) / 2
            for s0, s1 in kiosk_bays(k, side):
                i0 = len(pv)
                for (ww, hh) in ((k["w0"] + s0, k["base"] + 1.05), (k["w0"] + s1, k["base"] + 1.05), (k["w0"] + s1, k["soffit"] - 0.16), (k["w0"] + s0, k["soffit"] - 0.16)):
                    pv.append(tuple(P(um, ww, hh)))
                pf.append((i0, i0 + 1, i0 + 2, i0 + 3))
    pm.from_pydata(pv, [], pf); pm.update()
    pmat = bpy.data.materials.new("panel_glow"); pmat.use_nodes = True; pnt = pmat.node_tree
    for n_ in list(pnt.nodes): pnt.nodes.remove(n_)
    pe = pnt.nodes.new("ShaderNodeEmission"); pe.inputs["Color"].default_value = (0.85, 0.9, 1.0, 1); po = pnt.nodes.new("ShaderNodeOutputMaterial"); pnt.links.new(pe.outputs[0], po.inputs[0])
    # the frosted panels' inside faces ARE the emitters by day (the sky through the wired glass)
    bm_["glass_frosted"] = pmat
    for i, s in enumerate(IN_SLOTS): me.materials[i] = bm_[s]
    for o in lod_objs[1:] + [ob_th, ob_col]: o.hide_render = True
    lod_objs[0].hide_render = False; ob_in.hide_render = False
    if "Col" in me.color_attributes: me.color_attributes.active_color = me.color_attributes["Col"]
    def bake_vc(attr):
        if attr not in me.color_attributes: me.color_attributes.new(attr, "FLOAT_COLOR", "CORNER")
        me.color_attributes.active_color = me.color_attributes[attr]
        for x in scn.objects: x.select_set(False)
        ob_in.select_set(True); bpy.context.view_layer.objects.active = ob_in
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, target="VERTEX_COLORS")
    scn.cycles.samples = SAMPLES; scn.cycles.max_bounces = 6; scn.cycles.diffuse_bounces = 4
    out = {}
    for mode in ("sky", "night"):
        tm = time.time()
        if mode == "sky":
            WBG.inputs["Color"].default_value = (0.75, 0.82, 1.0, 1); WBG.inputs["Strength"].default_value = 1.0
            pe.inputs["Strength"].default_value = 0.9
            for lo in lamps: lo.data.energy = LAMP_W * 0.6
        else:
            WBG.inputs["Color"].default_value = (0.01, 0.012, 0.025, 1); WBG.inputs["Strength"].default_value = 1.0
            pe.inputs["Strength"].default_value = 0.0
            for lo in lamps: lo.data.energy = LAMP_W
        bake_vc("vl_" + mode)
        TIMES[f"inside_bake_{mode}_s"] = round(time.time() - tm, 1)
        print("bake", mode, TIMES[f"inside_bake_{mode}_s"], "s")
    for lo in lamps: bpy.data.objects.remove(lo)
    for o in lod_objs + [ob_th]: o.hide_render = False
    # weld the builder's duplicate corners first (the per-corner smoothing needs shared vertices)
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.to_mesh(me); bm.free(); me.update()
    for mode in ("sky", "night"):
        smooth_corners(me, "vl_" + mode, 6)
        ca = me.color_attributes["vl_" + mode]
        d = np.zeros(len(me.loops) * 4, dtype=np.float32); ca.data.foreach_get("color", d)
        a = me.attributes.new("_L" + mode.upper(), "FLOAT_VECTOR", "CORNER"); a.data.foreach_set("vector", d.reshape(-1, 4)[:, :3].ravel())
        me.color_attributes.remove(ca)
    me.color_attributes.active_color = me.color_attributes["Col"]
    for i, s in enumerate(IN_SLOTS): me.materials[i] = saved[i]
    TIMES["inside_bake_s"] = round(time.time() - t, 1)

if BAKE: bake_inside()
else:
    me = ob_in.data
    bm = bmesh.new(); bm.from_mesh(me); bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4); bm.to_mesh(me); bm.free(); me.update()
    for mode in ("SKY", "NIGHT"):
        a = me.attributes.new("_L" + mode, "FLOAT_VECTOR", "CORNER"); a.data.foreach_set("vector", [0.4] * (len(me.loops) * 3))

# ================================================================================================ previews (Cycles)
if PREVIEW:
    os.makedirs(PREVIEW, exist_ok=True)
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam")); scn.collection.objects.link(cam); scn.camera = cam
    scn.render.resolution_x, scn.render.resolution_y = 1100, 700; scn.cycles.samples = 64; scn.cycles.use_denoising = True
    scn.view_settings.view_transform = "AgX"
    sun = bpy.data.objects.new("sun", bpy.data.lights.new("sun", "SUN")); scn.collection.objects.link(sun); sun.data.energy = 3.0
    sun.rotation_euler = (math.radians(45), 0, math.radians(-35))
    WBG.inputs["Color"].default_value = (0.7, 0.8, 1.0, 1); WBG.inputs["Strength"].default_value = 0.6
    for o in lod_objs[1:] + [ob_th, ob_col]: o.hide_render = True
    for (nm, eye, at_) in (("pre_east_street", (-1.9, 22.0, 54.6), (-1.9, 8.0, 53.6)), ("pre_inside", (21.0, -0.2, FLOOR + 1.6), (0.0, -0.2, FLOOR + 1.4)),
                           ("pre_east_stair", (-1.9, 10.2, E["top"] + 1.6), (-1.9, 1.0, FLOOR + 1.0)), ("pre_west_street", (22.5, -22.0, 52.8), (22.5, -6.0, 52.2))):
        cam.location = P(*eye); cam.rotation_euler = (P(*at_) - cam.location).to_track_quat("-Z", "Y").to_euler(); cam.data.lens = 20
        scn.render.filepath = os.path.join(PREVIEW, nm + ".png"); bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam); bpy.data.objects.remove(sun)

# ================================================================================================ export
for o in site: bpy.data.objects.remove(o)
def export(objs, path, attrs=False):
    for x in scn.objects: x.select_set(False)
    for o in objs: o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    bpy.ops.export_scene.gltf(filepath=path, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                              export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                              export_all_vertex_colors=False, export_attributes=attrs, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
    print("exported", path, os.path.getsize(path) // 1024, "KB")
export(lod_objs + [ob_th, ob_col], os.path.join(OUT, "calevoet.raw.glb"))
export([ob_in], os.path.join(OUT, "calevoet_in.raw.glb"), attrs=True)

# ================================================================================================ the notes
FR = SITE["frame"]
def city(u, w):
    O, U, W = FR["origin_city"], FR["u"], FR["w"]
    return [round(O[0] + U[0] * u + W[0] * w, 3), round(O[1] + U[1] * u + W[1] * w, 3)]
def ring_city(u0, u1, w0, w1): return [city(u0, w0), city(u1, w0), city(u1, w1), city(u0, w1)]
wells, voids = [], []
for name, k in KIOSKS.items():
    iwc = (k["w0"] + WT) if k["mouth"] > 0 else (k["w1"] - WT)
    w0_, w1_ = sorted((iwc, k["mw"]))
    wells.append({"name": name, "ring_uw": [[k["iu0"], w0_], [k["iu1"], w0_], [k["iu1"], w1_], [k["iu0"], w1_]], "ring": ring_city(k["iu0"], k["iu1"], w0_, w1_),
                  "rim": round(k["top"], 3), "mouth_w": k["mw"], "why": "the kiosk's inner wall faces (one wall with the well's) and, at the mouth, the landing slab's skirt face"})
    voids.append({"name": f"well_{name}", "ring": ring_city(k["iu0"], k["iu1"], w0_, w1_), "yTop": None})
# the corridor and the west flight's covered stretch: the field off only below yTop (a body on the ground over it is carried)
gmin_c = min(ground(u, w) for u in np.linspace(CU0, CU1, 60) for w in np.linspace(CW0, CW1, 8))
yTop = round(min(gmin_c - 0.4, SOFFIT + 0.45), 3)
assert yTop > SOFFIT + 0.2, f"the corridor void's top {yTop} must clear the soffit"
voids.append({"name": "corridor", "ring": ring_city(CU0, CU1, CW0, CW1), "yTop": yTop})
voids.append({"name": "west_covered", "ring": ring_city(Wk["iu0"], Wk["iu1"], CW0 - 0.01, Wk["w1"] - WT + 0.01), "yTop": yTop})
gut_city = [{"stair": g["stair"], "a": city(g["a"][0], g["a"][1]) + [round(g["a"][2], 3)], "b": city(g["b"][0], g["b"][1]) + [round(g["b"][2], 3)], "width": GUT} for g in INFO["gutters"]]
stairs = {}
for name, s in INFO["stairs"].items():
    stairs[name] = {**s, "top": city(*s["top_uw"]), "top_line": [city(*p) for p in s["top_line_uw"]], "osm": SITE["ways"][f"{name}_stair"]["osm"]}
notes = {
    "about": "tools/blender/underpass.py (claude/underpass1): the Calevoet pedestrian underpass U1 (OSM 30235696 / 640826544 / 640826545), kiosks + the streamed inside",
    "placement": {"city_local_position": [FR["origin_city"][0], OY, FR["origin_city"][1]], "rotation_y_rad": FR["rotation_y_rad"],
                  "hides_solids": [E["solid"], Wk["solid"]], "hides_bu_ids": [x for x in (E["bu"], Wk["bu"]) if x]},
    "frame": FR,
    "levels": {"floor": FLOOR, "soffit": SOFFIT, "slab_top": SOFFIT + SLAB, "corridor_uw": [[CU0, CU1], [CW0, CW1]], "corridor_clear_w": round(CW1 - CW0, 3)},
    "kiosks": {n: {"rect_uw": [k["u0"], k["u1"], k["w0"], k["w1"]], "ring": ring_city(k["u0"], k["u1"], k["w0"], k["w1"]), "eaves": k["eaves"], "top": k["top"], "skirt": round(k["skirt"], 3),
                   "solid": k["solid"], "bu": k["bu"], "bollards": [city(*b) for b in k["bollards"]]} for n, k in KIOSKS.items()},
    "wells": wells, "voids": voids, "stairs": stairs,
    "bike_gutters": {"note": "KID GAME (docs/KIDGAME.md): the bike rides these steel gutters down / up the stairs (owner 2026-11-24); a clean inclined plane each, 12 cm wide, against the walls; no bike code yet",
                     "gutters": gut_city},
    "lights": [{"at": city(u, w) + [round(h, 3)], "len": L} for (u, w, h, L, Wd, al) in INFO["lights"]],
    "stream": {"fetch_m": 80, "show_m": 50, "hide_m": 70, "unload_s": 20},
    "slots": {"surface": SURF_SLOTS, "inside": IN_SLOTS}, "codes": CODES,
    "tris": TRIS, "times": TIMES, "samples": SAMPLES, "device": DEVICE,
    "mural": {"file": "mural.png", "atlas": "rows 0-2: 10 m x 2.5 m mural strips (UV0.x 0..30 m), row 3: x 30..37 the lettering band, 37..40 the signs; texture v (bottom-up) = (row * 2.5 + v) / 10",
              "about": "OUR OWN invented underwater scene (sea, kelp, corals, fish, a turtle, a diver's helmet, a wreck, jellyfish, bubbles) + invented tags; never a copy of the real murals"},
    "measured": "OSM ways (site.json), the UrbIS kiosk solids 525169 / 519275 (footprint, base, eaves), the DTM (heightmap.js surface), rail.json",
    "estimated": "floor 48.40 m, clear height 2.45 m, corridor 2.6 m clear, risers / goings, the kiosk's finish (plan §1-2 + the Street View look)",
}
json.dump(notes, open(os.path.join(OUT, "calevoet.json"), "w"), indent=1)
print("DONE", round(time.time() - T0, 1), "s", TIMES)
