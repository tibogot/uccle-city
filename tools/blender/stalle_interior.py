"""CHAPELLE DE STALLE: THE INTERIOR CELL (nave, two very small aisles, the choir with its Baroque retable), built in code
from the plan of tools/blender/stalle.py (the same measured frame and openings) and lit in Cycles (all baked).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/stalle_interior.py -- models/stalle [--samples 256] [--no-bake] [--preview docs/stalle]
    node tools/stalle_pack.mjs models/stalle/interior.raw.glb models/stalle/interior.glb --nolod
      interior.raw.glb   nodes "Arch" (walls, floors, ceilings, piers, arches: lightmapped), "Props" (retable, altar,
                         statues, chairs...: per-corner baked light), "Glass", "DoorL" / "DoorR" (the west door's leaves,
                         origins on their hinges), "Collider" (the character's walls / floors / furniture blocks)
      lm_sky.png lm_sun.png lm_night.png   RGBM gamma 2 (lin = (rgb * a * 4)^2) lightmaps of "Arch" (TEXCOORD_1)
      interior.json      probes (ambient cubes), openings (portal), the room volume, door hinges, spawn, bake settings

REFERENCES (data/raw/refs/stalle/SOURCES.md): 2 interior photos (reflexcity 2007: the nave toward the choir and the
south aisle; the choir and its retable; reference only), the west door's glimpse (inventory P03: chequered floor), and
text: basilican plan with two very small aisles (fr.wikipedia), stucco ceiling 1693 and choir paving 1697 (fr.wikipedia,
Ucclensia 112), "an imposing Baroque altar housing a statue of the Virgin closes the choir" and the lepers' window (the
commune's panel), inner walls of brick faced outside with white stone (Ucclensia 167), no icons / iconostasis allowed
(La Libre 2015). Furniture layout and the lamps are estimated.

Materials: named slots only (no colour baked; the light is baked separately and multiplied in the viewer): brick_red_brussels,
stone_white, render_white, marble_chequer (NEW name: the black and white chequered floor), wood_frame_white (the painted
retable, gilt by code), wood_frame_dark (oak chairs by code), painted_wood_red, glass_window, cast_iron_green,
polychrome (NEW name: painted statues and the hatchments).
"""
import bpy, bmesh, math, os, sys, json, time
from mathutils import Vector, Matrix
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stalle_common as SC
from stalle_common import (K, P, hz, Z, Frame, fill2d, strip2d, rect, box, fbox, wbox, bar, rod, lathe, lathe_axis, sweep2d,
                           sweep3d, face_dir, face_up, quad, circle, pointed, offset_loop, foil, ccw, arc_pts, WC, A_OUT, NW, OY)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
def arg(k, d=None): return ARGS[ARGS.index(k) + 1] if k in ARGS else d
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/stalle")
BAKE = "--no-bake" not in ARGS
SAMPLES = int(arg("--samples", "256"))
PREVIEW = os.path.abspath(arg("--preview")) if arg("--preview") else None
LM = 1024
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)

SLOTS = ["brick_red_brussels", "stone_white", "render_white", "marble_chequer", "wood_frame_white", "wood_frame_dark",
         "painted_wood_red", "glass_window", "cast_iron_green", "polychrome"]
BRICK, STONE, RENDER, FLOORM, WHITE, WOOD, DOOR, GLASS, IRON, POLY = range(10)
CODES = ["plain", "arch", "capital", "base", "cove", "step", "gilt", "oak", "rush", "skin", "robe", "mantle", "hatch", "candle",
         "lead", "joint"]
(C_PLAIN, C_ARCH, C_CAP, C_BASE, C_COVE, C_STEP, C_GILT, C_OAK, C_RUSH, C_SKIN, C_ROBE, C_MANTLE, C_HATCH, C_CANDLE,
 C_LEAD, C_JOINT) = range(16)

# ------------------------------------------------------------------------------------------------ the interior plan
F0, F1 = SC.FLOOR, SC.CHOIR_FLOOR
AI = A_OUT - SC.T_AISLE            # aisles' outer walls, inner face |w - WC|
ARC_N, ARC_A = NW - SC.T_CLER, NW  # the arcade wall: nave face / aisle face
CH = NW - SC.T_CHOIR               # choir inner half-width
U_W = SC.T_WEST                    # west wall inner face
U_CA0, U_CA1 = SC.CHOIR_ARCH_U     # choir arch wall
U_AE = {-1: 10.6, 1: 10.45}        # aisles' east end inner faces
WALL_TOP, CEIL = 40.3, 40.85       # nave / choir: walls up to the cove, the stucco ceiling's flat (1693)
AISLE_HI, AISLE_LO = 39.08, 37.0   # the aisles' sloping ceilings (under their lean-to roofs, which meet the clerestory at 39.2)
SPRING = 36.8                      # arcade capitals' top (abaci)
PIER_R = 0.26
BAYS = [(SC.RESP_W, SC.COLS_U[0]), (SC.COLS_U[0], SC.COLS_U[1]), (SC.COLS_U[1], SC.COLS_U[2]), (SC.COLS_U[2], U_CA0)]
CHOIR_ARCH = dict(hw=1.45, spring=37.55, apex=39.85)

def apse_inner():
    """the choir + apse inner outline (plan, ccw from the north-west corner at the choir arch)"""
    ext = [(SC.U_APSE, -NW), (SC.U_EAST, -SC.APSE_HW), (SC.U_EAST, SC.APSE_HW), (SC.U_APSE, NW)]
    t = SC.T_CHOIR
    # offset each exterior segment inward by t, intersect consecutive ones
    lines = [((U_CA1, -NW), (SC.U_APSE, -NW))] + [(ext[i], ext[i + 1]) for i in range(3)] + [((SC.U_APSE, NW), (U_CA1, NW))]
    off = []
    for (a, b) in lines:
        du, dw = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dw)
        n = (-dw / L, du / L)                          # left normal; inward = toward the axis / west
        c = ((a[0] + b[0]) / 2 + n[0], (a[1] + b[1]) / 2 + n[1])
        if abs(c[1]) > abs((a[1] + b[1]) / 2) or c[0] > max(a[0], b[0]) + 0.01: n = (-n[0], -n[1])
        off.append(((a[0] + n[0] * t, a[1] + n[1] * t), (b[0] + n[0] * t, b[1] + n[1] * t)))
    pts = [off[0][0]]
    for i in range(len(off) - 1):
        (p1, p2), (p3, p4) = off[i], off[i + 1]
        d = (p2[0] - p1[0]) * (p4[1] - p3[1]) - (p2[1] - p1[1]) * (p4[0] - p3[0])
        if abs(d) < 1e-9: pts.append(p2); continue
        tt = ((p3[0] - p1[0]) * (p4[1] - p3[1]) - (p3[1] - p1[1]) * (p4[0] - p3[0])) / d
        pts.append((p1[0] + (p2[0] - p1[0]) * tt, p1[1] + (p2[1] - p1[1]) * tt))
    pts.append(off[-1][1])
    return [(u, w + WC) for u, w in pts]
CHOIR_IN = apse_inner()             # (u, w) absolute w

def fr_in(u, w, nu, nw):
    """a wall frame whose N points INTO the room (plan normal (nu, nw))"""
    return Frame(P(u, w, OY), Vector((nu, -nw, 0)))
def S(fr, u, w): return fr.s_of(u, w)

# ------------------------------------------------------------------------------------------------ helpers
def splay(fr, big, small, d_small, mat=STONE, code=C_PLAIN):
    """a window splay: from the `big` loop on the wall face (d = 0) to the `small` loop at depth d_small (< 0)"""
    big = ccw(big); small = ccw(small)
    n = len(big); assert n == len(small)
    K.B.new_group()
    cs = sum(p[0] for p in small) / n; cv = sum(p[1] for p in small) / n
    for i in range(n):
        a0, b0 = big[i], big[(i + 1) % n]; a1, b1 = small[i], small[(i + 1) % n]
        A0, B0, A1, B1 = fr.p(a0[0], a0[1], 0.0), fr.p(b0[0], b0[1], 0.0), fr.p(a1[0], a1[1], d_small), fr.p(b1[0], b1[1], d_small)
        mid = (A0 + B0 + A1 + B1) / 4; cen = fr.p(cs, cv, d_small / 2)
        face_dir([A0, B0, B1, A1], cen - mid, mat, code)

def window_inside(fr, s, spec, depth):
    """a pointed window seen from inside: splayed reveal to the tracery's back at `depth`, glass in the lights"""
    outline, lights, l_spring, mull = SC.window_lights(s, spec["sill"], spec["spring"], spec["apex"], spec["w"], spec["n"], spec["foils"])
    big = scale_loop(outline, s, hz(spec["sill"]), 1.3, 1.0, sill_drop=0.25)
    splay(fr, big, outline, -depth + 0.02)
    fill2d(fr, [outline] + lights, -depth + 0.02, STONE, C_PLAIN)
    for L in lights:
        strip2d(fr, L, -depth + 0.02, -depth - 0.01, STONE, C_PLAIN)
        KB, K.B = K.B, BG
        fill2d(fr, [L], -depth, GLASS, C_LEAD)
        K.B = KB
    return big

def scale_loop(loop, cs, v0, ks, kv, sill_drop=0.0):
    """widen a loop about its centre line (s) by ks; drop the points at its bottom by sill_drop"""
    out = []
    for (x, y) in loop:
        yy = y - sill_drop if abs(y - v0) < 1e-6 else y
        out.append((cs + (x - cs) * ks, yy))
    return out

def oculus_inside(fr, s, h, r_glass, depth, r_in=None):
    r_in = r_in or r_glass + 0.14
    big = circle(s, hz(h), r_in, 32); small = circle(s, hz(h), r_glass, 32)     # = the wall's hole (32): no slit
    splay(fr, big, small, -depth)
    KB, K.B = K.B, BG
    fill2d(fr, [small], -depth, GLASS, C_LEAD)                                    # the glass closes the splay's end
    K.B = KB
    return big

def cove_ceiling(loop, h0, inset, h1, mat=RENDER, n=5):
    """a stucco cove (quarter round) from the walls (plan loop, absolute w) at h0 up to a flat ceiling inset by `inset` at h1"""
    lp = ccw([(u, w) for u, w in loop])
    rings = []
    for k in range(n + 1):
        a = math.pi / 2 * k / n
        off = inset * (1 - math.cos(a)); h = h0 + (h1 - h0) * math.sin(a)
        rings.append([P(u, w, h) for u, w in offset_loop(lp, -off)] if off > 1e-6 else [P(u, w, h) for u, w in lp])
    cu = sum(p[0] for p in lp) / len(lp); cw = sum(p[1] for p in lp) / len(lp)
    cen = P(cu, cw, h0 - 1.0)
    m = len(rings[0])
    # one builder group per side, creased against its neighbours (stalle_common.make_object: K.B.crease): the mitres
    # stay sharp, so the 9 m quads along the nave keep their own normals (averaged across the corners they shaded the
    # whole cove in a gradient: the audit's streaks)
    for i in range(m):
        K.B.new_group(); K.B.crease.add(K.B.grp)
        for k in range(n):
            a, b = rings[k][i], rings[k][(i + 1) % m]; c, d = rings[k + 1][(i + 1) % m], rings[k + 1][i]
            mid = (a + b + c + d) / 4
            face_dir([a, b, c, d], cen - mid, mat, C_COVE)
    flat = offset_loop(lp, -inset)
    fill_plan(flat, h1, mat, C_PLAIN, down=True)
    # a moulded cornice under the cove (stucco)
    K.B.new_group()
    for (dh, do) in ((0.0, 0.0),):
        pass
    return flat

def fill_plan(loop, h, mat, code=C_PLAIN, down=False):
    """a horizontal polygon (plan loop (u, w)) at height h, facing up (or down)"""
    from mathutils.geometry import tessellate_polygon
    K.B.new_group()
    pts = [P(u, w, h) for u, w in loop]
    for t in tessellate_polygon([[Vector((p.x, p.y, 0)) for p in pts]]):
        tri = [pts[t[0]], pts[t[1]], pts[t[2]]]
        if ((tri[1] - tri[0]).cross(tri[2] - tri[0])).length < 1e-9: continue
        face_dir(tri, -Z if down else Z, mat, code)

def wall_plan(a, b, h0, h1, into, mat=BRICK, holes_fn=None, top=None):
    """a straight inner wall face from plan point a to b (absolute w), heights h0..h1 (or a top profile [(t, h)] along
    a->b, t 0..1), N toward the plan point `into`; holes_fn(fr) -> loops"""
    du, dw = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dw)
    n = (-dw / L, du / L)
    mid = ((a[0] + b[0]) / 2, (a[1] + b[1]) / 2)
    if (into[0] - mid[0]) * n[0] + (into[1] - mid[1]) * n[1] < 0: n = (-n[0], -n[1])
    fr = fr_in(a[0], a[1], n[0], n[1])
    sa, sb = S(fr, *a), S(fr, *b)
    if top is None: top = [(0.0, h1), (1.0, h1)]
    out = [(sa, hz(h0)), (sb, hz(h0))] + [(sa + (sb - sa) * t, hz(h)) for t, h in reversed(top)]
    holes = holes_fn(fr) if holes_fn else []
    fill2d(fr, [out] + holes, 0.0, mat, C_PLAIN)
    return fr

def _clip_s(loop, lo, hi):
    """clip a polygon (s, v) to lo <= s <= hi (Sutherland-Hodgman on two vertical lines)"""
    out = loop
    for x0, keep_ge in ((lo, True), (hi, False)):
        if x0 is None or not out: continue
        inp, out = out, []
        for i in range(len(inp)):
            p, q = inp[i], inp[(i + 1) % len(inp)]
            ip = p[0] >= x0 if keep_ge else p[0] <= x0
            iq = q[0] >= x0 if keep_ge else q[0] <= x0
            if ip: out.append(p)
            if ip != iq:
                t = (x0 - p[0]) / (q[0] - p[0]); out.append((x0, p[1] + (q[1] - p[1]) * t))
    return out
def voussoirs(fr, head, cs, spring_v, width=0.2, d=0.015, n=11, mat=STONE, s_lo=None, s_hi=None):
    """a ring of separate voussoirs (real joints) along an arch head (points above the spring line, left to right);
    s_lo / s_hi clip the ring (two neighbouring rings meet on the pier's axis: one springer, no overlapping fronts)"""
    pts = [p for p in head if p[1] >= spring_v - 1e-6]
    pts = sorted(pts, key=lambda p: p[0])
    acc = [0.0]
    for i in range(1, len(pts)): acc.append(acc[-1] + math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]))
    tot = acc[-1]
    def at(t):
        x = t * tot
        for i in range(1, len(pts)):
            if acc[i] >= x:
                f = (x - acc[i - 1]) / max(acc[i] - acc[i - 1], 1e-9)
                return (pts[i - 1][0] + (pts[i][0] - pts[i - 1][0]) * f, pts[i - 1][1] + (pts[i][1] - pts[i - 1][1]) * f)
        return pts[-1]
    cx, cy = cs, spring_v
    for k in range(n):
        t0, t1 = k / n + (0.003 if k else 0.0), (k + 1) / n - (0.003 if k < n - 1 else 0.0)
        q = [at(t0 + (t1 - t0) * j / 4) for j in range(5)]
        outer = []
        for (x, y) in reversed(q):
            dx, dy = x - cx, y - cy + 0.4; L = math.hypot(dx, dy) or 1
            outer.append((x + dx / L * width, max(spring_v, y + dy / L * width)))
        loop = _clip_s(q + outer, s_lo, s_hi)
        if len(loop) < 3: continue
        fill2d(fr, [loop], d, mat, C_ARCH); strip2d(fr, loop, d, 0.0, mat, C_ARCH, inward=False)

# ------------------------------------------------------------------------------------------------ architecture
def floors():
    nave = [(U_W, WC - AI), (U_AE[-1], WC - AI), (U_AE[-1], WC - ARC_A), (U_CA0, WC - ARC_A), (U_CA0, WC + AI), (U_W, WC + AI)]
    fill_plan(nave, F0, FLOORM)
    ch = [(U_CA0, WC - CHOIR_ARCH["hw"] - 0.02), (U_CA1, WC - CHOIR_ARCH["hw"] - 0.02)] + CHOIR_IN[:] + [(U_CA1, WC + CHOIR_ARCH["hw"] + 0.02), (U_CA0, WC + CHOIR_ARCH["hw"] + 0.02)]
    ch = [(U_CA0, WC - CHOIR_ARCH["hw"]), (U_CA1, WC - CHOIR_ARCH["hw"]), (U_CA1, WC - CH)] + CHOIR_IN[1:-1] + [(U_CA1, WC + CH), (U_CA1, WC + CHOIR_ARCH["hw"]), (U_CA0, WC + CHOIR_ARCH["hw"])]
    fill_plan(ch, F1, FLOORM)
    # the choir step (riser) in the arch
    fr = fr_in(U_CA0, WC, -1, 0)
    a, b = sorted((S(fr, U_CA0, WC - CHOIR_ARCH["hw"]), S(fr, U_CA0, WC + CHOIR_ARCH["hw"])))
    fill2d(fr, [rect(a, hz(F0 - 0.05), b, hz(F1))], 0.0, STONE, C_STEP)
    fbox(fr, a, b, hz(F1) - 0.04, hz(F1), 0.0, 0.03, STONE, C_STEP)

def west_wall():
    def holes(fr):
        sc = S(fr, U_W, WC)
        door = rect(sc - SC.DOOR_W / 2, hz(F0), sc + SC.DOOR_W / 2, hz(SC.DOOR_TOP))
        o, _, _, _ = SC.window_lights(sc, SC.WWIN_SILL, SC.WWIN_SPRING, SC.WWIN_APEX, SC.WWIN_W, 3)
        big = scale_loop(o, sc, hz(SC.WWIN_SILL), 1.3, 1.0, sill_drop=0.25)
        return [door, big]
    top = [(0.0, AISLE_LO), ((AI - ARC_A) / (2 * AI), AISLE_HI), ((AI - ARC_N) / (2 * AI), AISLE_HI),
           ((AI - ARC_N) / (2 * AI), WALL_TOP), ((AI + ARC_N) / (2 * AI), WALL_TOP), ((AI + ARC_N) / (2 * AI), AISLE_HI),
           ((AI + ARC_A) / (2 * AI), AISLE_HI), (1.0, AISLE_LO)]
    fr = wall_plan((U_W, WC - AI), (U_W, WC + AI), F0 - 0.05, None, (5.0, WC), holes_fn=holes, top=top)
    sc = S(fr, U_W, WC)
    window_inside(fr, sc, SC.WEST_WINDOW, SC.T_WEST - 0.2)
    # the door's reveal (stone) back to the oak frame (jambs + head) and the threshold under the leaves; the frame's
    # back face (the exterior model draws its front and inner sides: no face is drawn twice)
    W2, Tp, DF, DL = SC.DOOR_W / 2, hz(SC.DOOR_TOP), SC.DOOR_FRAME, SC.DOOR_LEAF
    dj = -(SC.T_WEST - DF["u1"])
    for (p0, p1, nrm) in (((sc - W2, hz(F0)), (sc - W2, Tp), fr.U), ((sc - W2, Tp), (sc + W2, Tp), -Z), ((sc + W2, Tp), (sc + W2, hz(F0)), -fr.U)):
        face_dir([fr.p(*p0, 0.0), fr.p(*p1, 0.0), fr.p(*p1, dj), fr.p(*p0, dj)], nrm, STONE, C_PLAIN)
    face_dir([fr.p(sc - W2, hz(F0), 0.0), fr.p(sc + W2, hz(F0), 0.0), fr.p(sc + W2, hz(F0), dj), fr.p(sc - W2, hz(F0), dj)], Z, STONE, C_STEP)
    f = DF["face"]
    fill2d(fr, [rect(sc - W2, hz(F0), sc + W2, Tp), rect(sc - W2 + f, hz(F0), sc + W2 - f, Tp - DF["head"])], dj, WOOD, C_PLAIN)
    fbox(fr, sc - SC.DOOR_W / 2 - 0.05, sc + SC.DOOR_W / 2 + 0.05, hz(SC.DOOR_TOP), hz(SC.DOOR_TOP) + 0.22, 0.0, 0.02, STONE, C_ARCH)
    # holy-water stoup north of the door (stone shell on a corbel)
    c = fr.p(sc - 1.25, hz(F0 + 0.95), 0.18)
    lathe(c, [(0.0, -0.2), (0.07, -0.17), (0.1, -0.08), (0.2, 0.0), (0.21, 0.04), (0.16, 0.05), (0.0, 0.0)], 12, STONE, C_PLAIN)

def arcade(side):
    """one arcade: the wall between the nave and an aisle, carried by round piers: pointed arches SPRING FROM THE ABACI
    (their intrados' feet on the abacus, S0 from the pier's axis), the wall above the springing only (below it: the
    piers and the open bays), the arches' soffits, voussoir rings on both faces meeting on each pier's axis in one
    springer joint; the clerestory oculi above (nave face), the aisle face up to the aisle ceiling"""
    wn, wa = WC + side * ARC_N, WC + side * ARC_A
    S0 = 0.17                                                  # the arch's foot from the pier's axis (abacus 0.43 inradius)
    feet = [(a + (0.0 if a == SC.RESP_W else S0), b - (0.0 if b == U_CA0 else S0)) for (a, b) in BAYS]
    def head(fr, ww, a, b):
        s0, s1 = sorted((S(fr, a, ww), S(fr, b, ww)))
        apex = min(38.98, SPRING + 0.86 * (BAYS[[f for f in feet].index((a, b))][1] - BAYS[[f for f in feet].index((a, b))][0]))
        return pointed(s0, s1, hz(SPRING), hz(apex), n=24)
    def outline(fr, ww, top):
        """the wall: from the west respond's foot, up its face, over every arch and springer, down the east end"""
        o = [(S(fr, U_W, ww), hz(F0 - 0.1)), (S(fr, SC.RESP_W, ww), hz(F0 - 0.1))]
        for (a, b) in feet:
            hd = head(fr, ww, a, b)
            pts = sorted([p for p in hd if p[1] >= hz(SPRING) - 1e-6], key=lambda p: p[0] * (1 if S(fr, b, ww) > S(fr, a, ww) else -1))
            o += pts
        o += [(S(fr, U_CA0, ww), hz(top)), (S(fr, U_W, ww), hz(top))]
        return o
    frN = fr_in(U_W, wn, 0, -side)          # nave face, N toward the axis
    frA = fr_in(U_W, wa, 0, side)           # aisle face, N toward the aisle
    ocN = [circle(S(frN, u, wn), hz(39.72), 0.3, 32) for u in SC.CLER_OCULI]
    fill2d(frN, [outline(frN, wn, WALL_TOP)] + ocN, 0.0, BRICK, C_PLAIN)
    for u in SC.CLER_OCULI: oculus_inside(frN, S(frN, u, wn), 39.72, 0.16, SC.T_CLER - 0.13, r_in=0.3)
    fill2d(frA, [outline(frA, wa, AISLE_HI + 0.02)], 0.0, BRICK, C_PLAIN)
    # the soffits (stone) under each arch between the two faces, the responds' faces below the springing
    for (a, b) in feet:
        L = head(frN, wn, a, b)
        arc = sorted([p for p in L if p[1] >= hz(SPRING) - 1e-6], key=lambda p: p[0])
        # at a respond the soffit's foot runs 3 cm INTO the end wall: the arch starts vertical, so its first quad lay 2 deg
        # off the chancel wall's face (the audit's coplanar strip at the east responds)
        for uu, into in ((SC.RESP_W, -1), (U_CA0, 1)):
            if uu not in (a, b): continue
            su = S(frN, uu, wn); j = min(range(len(arc)), key=lambda q: abs(arc[q][0] - su))
            sdir = 1 if S(frN, uu + into, wn) > su else -1
            arc[j] = (arc[j][0] + sdir * 0.03, arc[j][1])
        K.B.new_group()
        for i in range(len(arc) - 1):
            p0, p1 = arc[i], arc[i + 1]
            A0, B0 = frN.p(p0[0], p0[1], 0.0), frN.p(p1[0], p1[1], 0.0)
            A1, B1 = frN.p(p0[0], p0[1], -(ARC_A - ARC_N)), frN.p(p1[0], p1[1], -(ARC_A - ARC_N))
            mid = Vector(((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2)); cxs = (arc[0][0] + arc[-1][0]) / 2
            inward = frN.U * (cxs - mid.x) + Z * (hz(SPRING) - mid.y)
            face_dir([A0, B0, B1, A1], inward, STONE, C_ARCH)
        for fr, ww in ((frN, wn), (frA, wa)):
            hd = head(fr, ww, a, b)
            xs = [p[0] for p in hd]; cs = (min(xs) + max(xs)) / 2
            sa, sb = S(fr, a, ww), S(fr, b, ww)
            # clip at the piers' axes (S0 beyond the feet), not at the responds
            # at the responds the rings stop 1 cm short of the end walls (the arch starts vertical there: the ring's
            # intrados and end face lay in the chancel wall's face, a coplanar strip at the east responds)
            pa = S(fr, a - (S0 if a != SC.RESP_W else -0.01), ww); pb = S(fr, b + (S0 if b != U_CA0 else -0.01), ww)
            lo, hi = sorted((pa, pb))
            voussoirs(fr, hd, cs, hz(SPRING), 0.2, 0.015, 11 if b - a > 2 else 7, s_lo=lo, s_hi=hi)
    for uu, into in ((SC.RESP_W, 1), (U_CA0, -1)):
        a_, b_ = sorted((wn, wa))
        fr = Frame(P(uu, (wn + wa) / 2, OY), Vector((into, 0, 0)))
        sa, sb = sorted((fr.s_of(uu, a_), fr.s_of(uu, b_)))
        fill2d(fr, [rect(sa, hz(F0 - 0.1), sb, hz(SPRING))], 0.0, BRICK, C_PLAIN)
    # piers: base, round shaft, astragal, a moulded bell capital, a chamfered octagonal abacus (fine segments, smooth)
    KB, K.B = K.B, BP
    for u in SC.COLS_U:
        c = P(u, WC + side * (ARC_N + ARC_A) / 2, OY)
        wbox(c, Vector((1, 0, 0)), Vector((0, 1, 0)), 0.34, 0.34, hz(F0), hz(F0 + 0.18), STONE, C_BASE)
        lathe(c + Z * hz(F0 + 0.18), [(0.33, 0.0), (0.335, 0.02), (0.33, 0.045), (0.3, 0.07), (0.29, 0.09), (0.3, 0.11), (0.28, 0.14), (PIER_R, 0.16)], 64, STONE, C_BASE)
        lathe(c + Z * hz(F0 + 0.34), [(PIER_R, 0.0), (PIER_R, 0.6), (PIER_R, 1.2), (PIER_R * 0.985, 36.33 - F0 - 0.34)], 64, STONE, C_PLAIN)
        # astragal (a torus ring) + the bell: a smooth ogee from the shaft to the abacus
        ring = [(PIER_R * 0.985 + 0.024 * math.sin(math.pi * k / 10), 0.048 * k / 10) for k in range(11)]
        bell = []
        for k in range(1, 17):
            t = k / 16
            r = PIER_R * 0.985 + (0.39 - PIER_R * 0.985) * (3 * t * t - 2 * t * t * t) ** 1.15 + 0.012 * math.sin(math.pi * t)
            bell.append((r, 0.048 + 0.30 * t))
        lathe(c + Z * hz(36.33), ring + bell + [(0.392, 0.35)], 64, STONE, C_CAP)
        # abacus: octagonal slab, chamfered under (the ribs' springer lands on it)
        oct_ = [(0.0, 0.0), (0.424, 0.0), (0.47, 0.04), (0.47, 0.12), (0.0, 0.12)]    # the bell's rim is the octagon's incircle
        lathe(c + Z * hz(36.68), oct_, 8, STONE, C_CAP, a0=math.pi / 8)
    K.B = KB
    # responds: impost mouldings where the end arches spring from the walls
    for uu, sg in ((SC.RESP_W, 1), (U_CA0, -1)):
        for fr, ww in ((frN, wn), (frA, wa)):
            s = S(fr, uu, ww)
            fbox(fr, min(s, s + sg * 0.32 * (1 if S(fr, uu + 1, ww) > s else -1)), max(s, s + sg * 0.32 * (1 if S(fr, uu + 1, ww) > s else -1)), hz(36.68), hz(36.8), 0.0, 0.08, STONE, C_CAP)

def aisle(side):
    w_out = WC + side * AI
    u_end = U_AE[side]
    def holes(fr):
        L = []
        oc = SC.N_AISLE["oculi"] if side < 0 else SC.S_AISLE["oculi"]
        for u in oc: L.append(circle(S(fr, u, w_out), hz(SC.AISLE_OCULUS_H), 0.33, 32))
        if side < 0:
            u0, u1 = SC.N_AISLE["door"]; a, b = sorted((S(fr, u0, w_out), S(fr, u1, w_out)))
            L.append(rect(a, hz(F0), b, hz(36.78)))
            s = S(fr, SC.N_AISLE["leper"], w_out)
            L.append([(s - 0.3, hz(34.9)), (s + 0.3, hz(34.9)), (s + 0.3, hz(35.6)), (s, hz(35.95)), (s - 0.3, hz(35.6))])
        return L
    fr = wall_plan((U_W, w_out), (u_end, w_out), F0 - 0.05, AISLE_LO, (5.0, WC), holes_fn=holes)
    oc = SC.N_AISLE["oculi"] if side < 0 else SC.S_AISLE["oculi"]
    for u in oc: oculus_inside(fr, S(fr, u, w_out), SC.AISLE_OCULUS_H, 0.2, SC.T_AISLE - 0.12, r_in=0.33)
    if side < 0:
        u0, u1 = SC.N_AISLE["door"]; a, b = sorted((S(fr, u0, w_out), S(fr, u1, w_out)))
        dr = rect(a, hz(F0), b, hz(36.78))
        strip2d(fr, dr, 0.0, -(SC.T_AISLE - 0.18), STONE, C_PLAIN)
        KB, K.B = K.B, BP
        n = 6
        for k in range(n):
            fbox(fr, a + (b - a) * k / n + 0.004, a + (b - a) * (k + 1) / n - 0.004, hz(F0), hz(36.78), -(SC.T_AISLE - 0.18), -(SC.T_AISLE - 0.21), DOOR, C_PLAIN, skip=("back",))
        for v in (F0 + 0.3, 36.4):
            fbox(fr, a + 0.03, b - 0.03, hz(v), hz(v + 0.14), -(SC.T_AISLE - 0.21), -(SC.T_AISLE - 0.24), DOOR, C_PLAIN, skip=("back",))
        K.B = KB
        s = S(fr, SC.N_AISLE["leper"], w_out)
        lep_big = [(s - 0.3, hz(34.9)), (s + 0.3, hz(34.9)), (s + 0.3, hz(35.6)), (s, hz(35.95)), (s - 0.3, hz(35.6))]
        lep = [(s - 0.15, hz(35.0)), (s + 0.15, hz(35.0)), (s + 0.15, hz(35.6)), (s, hz(35.88)), (s - 0.15, hz(35.6))]
        splay(fr, lep_big, lep, -(SC.T_AISLE - 0.2))
        KB, K.B = K.B, BG
        fill2d(fr, [lep], -(SC.T_AISLE - 0.19), GLASS, C_LEAD)
        K.B = KB
    # east end wall of the aisle, sloped top (the aisle ceiling)
    def holes_e(fr):
        if side > 0:       # the door to the sacristy (estimated)
            s = S(fr, u_end, WC + side * 3.0)
            return [rect(s - 0.4, hz(F0), s + 0.4, hz(36.35))]
        return []
    fe = wall_plan((u_end, WC + side * ARC_A), (u_end, w_out), F0 - 0.05, None, (5.0, WC + side * 3.0), holes_fn=holes_e,
                   top=[(0.0, AISLE_HI + 0.02), (1.0, AISLE_LO)])
    if side > 0:
        s = S(fe, u_end, WC + side * 3.0)
        strip2d(fe, rect(s - 0.4, hz(F0), s + 0.4, hz(36.35)), 0.0, -0.1, STONE, C_PLAIN)
        KB, K.B = K.B, BP
        for k in range(5):
            fbox(fe, s - 0.4 + 0.16 * k + 0.004, s - 0.4 + 0.16 * (k + 1) - 0.004, hz(F0), hz(36.35), -0.1, -0.07, DOOR, C_PLAIN, skip=("back",))
        K.B = KB
    # the sloping ceiling (plastered boards)
    K.B.new_group()
    a, b = P(U_W, WC + side * ARC_A, AISLE_HI), P(u_end, WC + side * ARC_A, AISLE_HI)
    c, d = P(u_end, w_out, AISLE_LO), P(U_W, w_out, AISLE_LO)
    face_dir([a, b, c, d], -Z, RENDER, C_PLAIN)
    # timber wall plate along the outer wall (photo: a dark beam under the aisle ceiling)
    fr2 = fr_in(U_W, w_out, 0, -side)
    sa, sb = sorted((S(fr2, U_W, w_out), S(fr2, u_end, w_out)))
    fbox(fr2, sa, sb, hz(AISLE_LO - 0.18), hz(AISLE_LO), 0.0, 0.12, WOOD, C_OAK, skip=("back",))

def nave_ceiling():
    loop = [(U_W, WC - ARC_N), (U_CA0, WC - ARC_N), (U_CA0, WC + ARC_N), (U_W, WC + ARC_N)]
    cove_ceiling(loop, WALL_TOP, 0.5, CEIL)
    # a stucco frame (moulded rectangle) on the flat (1693)
    K.B.new_group()
    for (a, b) in (((U_W + 1.1, WC - 1.0), (U_CA0 - 1.1, WC - 1.0)), ((U_CA0 - 1.1, WC - 1.0), (U_CA0 - 1.1, WC + 1.0)),
                   ((U_CA0 - 1.1, WC + 1.0), (U_W + 1.1, WC + 1.0)), ((U_W + 1.1, WC + 1.0), (U_W + 1.1, WC - 1.0))):
        pa, pb = P(a[0], a[1], CEIL - 0.005), P(b[0], b[1], CEIL - 0.005)
        sweep3d([pa, pb], [(-0.05, 0.0), (-0.04, -0.03), (0.0, -0.045), (0.04, -0.03), (0.05, 0.0)], Z, RENDER, C_COVE, caps=False)
    # a rose in the middle (for the chandelier's hook)
    KB, K.B = K.B, BP                         # small and round: per-corner light
    lathe(P(SC.CHAND["u"], WC, CEIL - 0.1), [(0.0, 0.0), (0.04, 0.0), (0.12, 0.02), (0.22, 0.05), (0.3, 0.07), (0.32, 0.1)], 16, RENDER, C_COVE)
    K.B = KB

def choir():
    # the choir arch wall: nave face (u = U_CA0) and choir face (u = U_CA1), the pointed arch between
    ca = CHOIR_ARCH
    for uu, nu, half in ((U_CA0, -1, ARC_N), (U_CA1, 1, CH)):
        fr = fr_in(uu, WC, nu, 0)
        a, b = sorted((S(fr, uu, WC - half), S(fr, uu, WC + half)))
        sc = S(fr, uu, WC)
        hole = pointed(sc - ca["hw"], sc + ca["hw"], hz(ca["spring"]), hz(ca["apex"]), n=12, bottom=hz((F0 if nu < 0 else F1) - 0.05))
        fill2d(fr, [rect(a, hz(F0 - 0.1), b, hz(WALL_TOP)), hole], 0.0, BRICK, C_PLAIN)
        voussoirs(fr, hole, sc, hz(ca["spring"]), 0.24, 0.015, 13)
        for sg in (-1, 1):       # imposts
            fbox(fr, sc + sg * ca["hw"] - (0.3 if sg > 0 else 0.0), sc + sg * ca["hw"] + (0.3 if sg < 0 else 0.0), hz(ca["spring"] - 0.15), hz(ca["spring"]), 0.0, 0.08, STONE, C_CAP)
        if nu < 0:
            strip2d(fr, hole, 0.0, -(U_CA1 - U_CA0), STONE, C_ARCH)
    # choir walls + apse (inner faces), the north window, the cove ceiling
    pts = CHOIR_IN
    cen = (14.0, WC)
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        holes_fn = None
        if i == 0:
            def holes_fn(fr, a=a, b=b):
                o, _, _, _ = SC.window_lights(S(fr, SC.CHOIR_WIN_N, a[1]), **{k: SC.CHOIR_WINDOW[k] for k in ("sill", "spring", "apex", "w")}, n_lights=SC.CHOIR_WINDOW["n"])
                # the SAME loop as window_inside's splay (it was 1.35 / 0.3 against the splay's 1.3 / 0.25: a 2-5 cm gap
                # round the splay to the outside, the audit's choir-window leaks)
                return [scale_loop(o, S(fr, SC.CHOIR_WIN_N, a[1]), hz(SC.CHOIR_WINDOW["sill"]), 1.3, 1.0, sill_drop=0.25)]
        fr = wall_plan(a, b, F1 - 0.05, WALL_TOP, cen, holes_fn=holes_fn)
        if i == 0: window_inside(fr, S(fr, SC.CHOIR_WIN_N, a[1]), SC.CHOIR_WINDOW, SC.T_CHOIR - 0.2)
    cove_ceiling([(U_CA1, WC - CH)] + pts[1:-1] + [(U_CA1, WC + CH)], WALL_TOP, 0.45, CEIL)

# ------------------------------------------------------------------------------------------------ props (per-corner light)
def figure(c, fwd, side, height, prof, mat_code=C_ROBE, segs=20, head=True, crown=False):
    """a standing draped figure: rings with folds (code by height: robe / mantle / skin)"""
    rings = []
    # 3 rings between the profile's (the folds turn with the height: on the tall quads the corner normals diverged,
    # the audit's streaks on the polychrome figures)
    fine = []
    for i in range(len(prof) - 1):
        p0, p1 = prof[i], prof[i + 1]
        sub = 4 if p1[0] - p0[0] > 0.04 else 1
        for j in range(sub): t = j / sub; fine.append(tuple(p0[q] + (p1[q] - p0[q]) * t for q in range(4)) + (p0[4],))
    fine.append(prof[-1])
    for (h, ra, rf, rip, code) in fine:
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            r = 1.0 + rip * math.sin(7 * a + h * 4.0)
            ring.append(c + side * (math.cos(a) * ra * r * height) + fwd * (math.sin(a) * rf * r * height) + Z * (h * height))
        rings.append((ring, code))
    K.B.new_group()
    for i in range(len(rings) - 1):
        (r0, c0), (r1, _) = rings[i], rings[i + 1]
        for k in range(segs):
            quad(r0[k], r1[k], r1[(k + 1) % segs], r0[(k + 1) % segs], POLY, c0)   # outward (was inward: the statues read dark)
    face_dir(rings[0][0], -Z, POLY, prof[0][4])
    if head:
        hc = c + Z * (height * 0.9) + fwd * 0.01 * height
        lathe_axis(hc, Z, side, [(0.0, 0.0), (0.05, 0.015), (0.075, 0.07), (0.065, 0.12), (0.04, 0.15), (0.0, 0.16)], 10, POLY, C_SKIN)
        if crown:
            lathe_axis(hc + Z * 0.12, Z, side, [(0.06, 0.0), (0.07, 0.02), (0.075, 0.07), (0.065, 0.07), (0.06, 0.03), (0.055, 0.0)], 10, POLY, C_HATCH)
VIRGIN = [(0.0, 0.2, 0.15, 0.06, C_ROBE), (0.06, 0.21, 0.16, 0.07, C_ROBE), (0.35, 0.16, 0.13, 0.08, C_MANTLE), (0.6, 0.15, 0.12, 0.06, C_MANTLE),
          (0.75, 0.16, 0.12, 0.03, C_MANTLE), (0.85, 0.15, 0.1, 0.01, C_ROBE), (0.9, 0.06, 0.06, 0.0, C_SKIN), (0.91, 0.04, 0.04, 0.0, C_SKIN)]

def twisted_column(c, h0, h1, r, mat=WHITE, turns=3.0, segs=10, rings=24):
    """a Solomonic (twisted) column: rings with a 2-lobed section turning up the shaft"""
    K.B.new_group()
    R = []
    for j in range(rings + 1):
        t = j / rings; h = h0 + (h1 - h0) * t
        ring = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            rr = r * (1.0 + 0.22 * math.cos(2 * (a - t * turns * 2 * math.pi)))
            ring.append(c + Vector((math.cos(a) * rr, math.sin(a) * rr, hz(h))))
        R.append(ring)
    for j in range(rings):
        for k in range(segs):
            quad(R[j][k], R[j][(k + 1) % segs], R[j + 1][(k + 1) % segs], R[j + 1][k], mat, C_PLAIN)

def retable():
    """the Baroque retable that closes the choir (reflexcity photo): predella, the main storey with the Virgin's niche
    and a sunburst between twisted columns, an entablature with urns, the upper storey with an angel's niche, a crowning
    cartouche; the altar in front, two candle stands; painted white wood, gilt by code"""
    ue = CHOIR_IN[2][0] if abs(CHOIR_IN[2][1] - WC) < 1.6 else SC.U_EAST - SC.T_CHOIR
    ue = max(p[0] for p in CHOIR_IN) - 0.02
    fr = Frame(P(ue, WC, OY), Vector((-1, 0, 0)))            # facing west, s = w - WC
    fl = hz(F1)
    # altar platform (two steps)
    fbox(fr, -1.25, 1.25, fl, fl + 0.15, 0.0, 1.55, STONE, C_STEP, skip=("back",))
    fbox(fr, -1.1, 1.1, fl + 0.15, fl + 0.3, 0.0, 1.1, STONE, C_STEP, skip=("back",))
    b0 = fl + 0.3
    # predella
    fbox(fr, -0.98, 0.98, b0, b0 + 0.95, 0.0, 0.32, WHITE, C_PLAIN, skip=("back",))
    fbox(fr, -1.02, 1.02, b0 + 0.95, b0 + 1.05, 0.0, 0.38, WHITE, C_GILT, skip=("back",))
    for s in (-0.7, -0.25, 0.25, 0.7):
        fbox(fr, s - 0.16, s + 0.16, b0 + 0.25, b0 + 0.8, 0.32, 0.345, WHITE, C_PLAIN, skip=("back",))
    m0 = b0 + 1.05
    # main storey: back panel with the niche
    niche = [(-0.36, m0 + 0.25), (0.36, m0 + 0.25)] + [(0.36 * math.cos(math.pi * k / 10), m0 + 1.55 + 0.36 * math.sin(math.pi * k / 10)) for k in range(11)]
    niche = ccw(niche)
    fill2d(fr, [rect(-0.98, m0, 0.98, m0 + 2.05), niche], 0.05, WHITE, C_PLAIN)
    strip2d(fr, niche, 0.05, -0.2, WHITE, C_PLAIN)
    fill2d(fr, [niche], -0.2, WHITE, C_PLAIN)
    sweep2d(fr, [(-0.36, m0 + 0.25)] + [(0.36 * math.cos(math.pi * (10 - k) / 10), m0 + 1.55 + 0.36 * math.sin(math.pi * (10 - k) / 10)) for k in range(11)] + [(0.36, m0 + 0.25)],
            [(0.0, 0.0), (0.04, 0.0), (0.05, 0.02), (0.05, 0.07), (0.0, 0.08)], WHITE, C_GILT, d0=0.05)
    # the sunburst behind the Virgin (gilt rays)
    cR = fr.p(0.0, m0 + 1.1, -0.17)
    for k in range(25):
        a = math.pi * (-0.15 + 1.3 * k / 24)
        d_ = fr.U * math.cos(a) + Z * math.sin(a)
        L = 0.24 + 0.1 * (k % 2)
        tri_ = [cR + d_ * 0.2 + fr.N.cross(d_) * 0.025, cR + d_ * 0.2 - fr.N.cross(d_) * 0.025, cR + d_ * (0.2 + L)]
        face_dir([p_ + fr.N * (0.012 + 0.004 * (k % 2)) for p_ in tri_], fr.N, WHITE, C_GILT)   # odd rays 4 mm prouder: their bases overlap
    # the Virgin (polychrome) on a gilt cloud base
    lathe(fr.p(0.0, m0 + 0.25, -0.05), [(0.0, 0.0), (0.18, 0.0), (0.2, 0.06), (0.16, 0.12), (0.0, 0.13)], 12, WHITE, C_GILT)
    figure(fr.p(0.0, m0 + 0.38, -0.05), fr.N, fr.U, 1.05, VIRGIN, crown=True)
    figure(fr.p(-0.1, m0 + 0.38 + 0.62, 0.05), fr.N, fr.U, 0.32, [(0.0, 0.14, 0.14, 0.02, C_ROBE), (0.5, 0.15, 0.13, 0.0, C_ROBE), (0.85, 0.08, 0.08, 0.0, C_SKIN), (0.88, 0.05, 0.05, 0.0, C_SKIN)])
    # twisted columns on pedestals, gilt capitals
    for sg in (-1, 1):
        s = sg * 0.66
        fbox(fr, s - 0.13, s + 0.13, m0, m0 + 0.32, 0.05, 0.36, WHITE, C_PLAIN, skip=("back",))
        twisted_column(fr.p(s, 0.0, 0.2), m0 + 0.32 + OY, m0 + 1.82 + OY, 0.09, turns=4.0, segs=12, rings=40)
        vine = [fr.p(s, 0.0, 0.2) + Vector((math.cos(t) * 0.115, math.sin(t) * 0.115, m0 + 0.36 + 1.42 * t / (8 * math.pi))) for t in [8 * math.pi * k / 80 for k in range(81)]]
        sweep3d(vine, [(-0.012, -0.012), (0.012, -0.012), (0.012, 0.012), (-0.012, 0.012), (-0.012, -0.012)], Z, WHITE, C_GILT, caps=False)
        lathe(fr.p(s, m0 + 1.82, 0.2), [(0.09, 0.0), (0.13, 0.08), (0.15, 0.13), (0.15, 0.17), (0.0, 0.17)], 10, WHITE, C_GILT)
        # carved side scrolls (ailerons)
        for k in range(6):
            a = math.pi * k / 5
            x = sg * (0.98 + 0.12 * math.sin(a)); y = m0 + 0.4 + 0.25 * k
            fbox(fr, min(x, x + sg * 0.08), max(x, x + sg * 0.08), y, y + 0.22, 0.02, 0.12, WHITE, C_GILT if k % 2 else C_PLAIN)
    # entablature
    e0 = m0 + 1.99
    fbox(fr, -1.05, 1.05, e0, e0 + 0.14, 0.0, 0.42, WHITE, C_PLAIN, skip=("back",))
    fbox(fr, -1.0, 1.0, e0 + 0.14, e0 + 0.24, 0.0, 0.4, WHITE, C_GILT, skip=("back",))
    fbox(fr, -1.1, 1.1, e0 + 0.24, e0 + 0.36, 0.0, 0.48, WHITE, C_PLAIN, skip=("back",))
    for sg in (-1, 1):        # urns
        lathe(fr.p(sg * 0.9, e0 + 0.36, 0.3), [(0.0, 0.0), (0.07, 0.0), (0.05, 0.05), (0.11, 0.14), (0.1, 0.24), (0.05, 0.3), (0.07, 0.34), (0.03, 0.38), (0.0, 0.42)], 10, WHITE, C_GILT)
    # upper storey: angel niche between pilasters, side volutes, cartouche
    u0 = e0 + 0.36
    un = ccw([(-0.2, u0 + 0.15), (0.2, u0 + 0.15)] + [(0.2 * math.cos(math.pi * k / 8), u0 + 0.7 + 0.2 * math.sin(math.pi * k / 8)) for k in range(9)])
    fill2d(fr, [rect(-0.48, u0, 0.48, u0 + 1.05), un], 0.05, WHITE, C_PLAIN)
    strip2d(fr, un, 0.05, -0.1, WHITE, C_PLAIN); fill2d(fr, [un], -0.1, WHITE, C_PLAIN)
    figure(fr.p(0.0, u0 + 0.16, -0.03), fr.N, fr.U, 0.62, [(0.0, 0.14, 0.11, 0.05, C_ROBE), (0.5, 0.12, 0.1, 0.03, C_ROBE), (0.82, 0.13, 0.08, 0.0, C_ROBE), (0.86, 0.05, 0.05, 0.0, C_SKIN), (0.88, 0.04, 0.04, 0.0, C_SKIN)])
    for sg in (-1, 1):
        fbox(fr, sg * 0.42 - 0.06, sg * 0.42 + 0.06, u0, u0 + 1.0, 0.05, 0.14, WHITE, C_GILT)
        for k in range(5):
            a = math.pi / 2 * k / 4
            x = sg * (0.486 + 0.42 * math.cos(a)); y = u0 + 0.05 + 0.45 * math.sin(a)      # 6 mm off the pilasters' sides
            fbox(fr, min(x, x - sg * 0.1), max(x, x - sg * 0.1), y, y + 0.14, 0.02, 0.12, WHITE, C_PLAIN if k % 2 else C_GILT)
    fbox(fr, -0.55, 0.55, u0 + 1.05, u0 + 1.15, 0.0, 0.2, WHITE, C_PLAIN, skip=("back",))
    lathe_axis(fr.p(0.0, u0 + 1.42, 0.1), fr.N, Z, [(0.0, 0.0), (0.22, 0.0), (0.24, 0.04), (0.2, 0.08), (0.0, 0.09)], 14, WHITE, C_GILT)
    # the altar (sarcophagus front with a gilt cross, scrolled ends) and its cloth, two iron candle stands
    a0 = 1.15
    fbox(fr, -0.95, 0.95, b0 - 0.3 + 0.3, b0 + 0.72, a0 - 0.75, a0, WHITE, C_PLAIN, skip=("back",))
    fbox(fr, -1.0, 1.0, b0 + 0.72, b0 + 0.8, a0 - 0.8, a0 + 0.05, WHITE, C_PLAIN, skip=())
    fbox(fr, -1.02, 1.02, b0 + 0.6, b0 + 0.8, a0 + 0.05, a0 + 0.06, WHITE, C_PLAIN)       # the cloth's fall
    fbox(fr, -0.03, 0.03, b0 + 0.15, b0 + 0.55, a0, a0 + 0.02, WHITE, C_GILT); fbox(fr, -0.13, 0.13, b0 + 0.38, b0 + 0.44, a0, a0 + 0.024, WHITE, C_GILT)   # the cross bar 4 mm prouder
    for sg in (-1, 1):
        lathe(fr.p(sg * 1.35, fl + 0.0, 1.3), [(0.0, 0.0), (0.16, 0.0), (0.12, 0.05), (0.025, 0.12), (0.02, 1.25), (0.08, 1.28), (0.08, 1.3), (0.02, 1.31), (0.012, 1.45), (0.0, 1.46)], 8, IRON, C_PLAIN)
    return fr

def hatchments():
    """two diamond hatchments (funeral arms of the Roest d'Alkemade family?) on the apse's oblique walls (choir photo)"""
    pts = CHOIR_IN
    for i in (1, 3):
        a, b = pts[i], pts[i + 1]
        mu, mw = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        du, dw = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dw); n = (-dw / L, du / L)
        if (14.0 - mu) * n[0] + (WC - mw) * n[1] < 0: n = (-n[0], -n[1])
        fr = fr_in(mu, mw, n[0], n[1])
        sc = S(fr, mu, mw); v = hz(F1 + 3.1)
        dia = [(sc, v - 0.62), (sc + 0.62, v), (sc, v + 0.62), (sc - 0.62, v)]
        fill2d(fr, [dia], 0.06, POLY, C_HATCH)
        strip2d(fr, dia, 0.06, 0.0, POLY, C_HATCH, inward=False)
        fill2d(fr, [offset_loop(dia, 0.04), dia], 0.065, POLY, C_JOINT)
        strip2d(fr, offset_loop(dia, 0.04), 0.065, 0.0, POLY, C_JOINT, inward=False)

def chair(c, fwd):
    """a Flemish church chair: four turned legs (the back ones run up as uprights with finials), stretchers, a rush seat
    on a rail frame, a ladder back of three curved slats, a book shelf rail behind"""
    side = fwd.cross(Z).normalized()
    up = Z
    def leg(p, h, r=0.016):
        lathe_axis(p, up, side, [(r, 0.0), (r * 1.15, 0.03), (r * 0.9, 0.08), (r, h * 0.5), (r * 1.2, h * 0.52), (r, h * 0.56), (r * 0.9, h)], 6, WOOD, C_OAK)
    for sx in (-1, 1):
        leg(c + side * (sx * 0.19) + fwd * 0.17, 0.44)
        p = c + side * (sx * 0.19) - fwd * 0.17
        leg(p, 0.9)
        lathe_axis(p + up * 0.9, up, side, [(0.0, 0.0), (0.02, 0.0), (0.024, 0.02), (0.0, 0.05)], 6, WOOD, C_OAK)
        rod(p + up * 0.18, p + up * 0.18 + fwd * 0.34, 0.009, WOOD, C_OAK, 5)
    for f in (-0.17, 0.17):
        rod(c + fwd * f + up * 0.2 - side * 0.19, c + fwd * f + up * 0.2 + side * 0.19, 0.009, WOOD, C_OAK, 5)
    # seat: rail frame + woven rush (domed slightly)
    for sx in (-1, 1):
        box(c + side * (sx * 0.19) + up * 0.42, fwd, side, up, -0.19, 0.19, -0.014, 0.014, 0.0, 0.03, WOOD, C_OAK)
    for f in (-0.17, 0.17):
        box(c + fwd * f + up * 0.42, side, fwd, up, -0.176, 0.176, -0.014, 0.014, 0.0, 0.026, WOOD, C_OAK, skip=("left", "right"))
    K.B.new_group()
    g = [[c + side * (x * 0.18) + fwd * (y * 0.16) + up * (0.445 + 0.012 * (1 - x * x) * (1 - y * y)) for x in (-1, -0.5, 0, 0.5, 1)] for y in (-1, -0.5, 0, 0.5, 1)]
    for j in range(4):
        for i in range(4):
            face_dir([g[j][i], g[j][i + 1], g[j + 1][i + 1], g[j + 1][i]], up, WOOD, C_RUSH)
    # ladder back: three slats curved backwards
    for h in (0.58, 0.7, 0.82):
        pts = [c - fwd * (0.17 + 0.025 * (1 - (x / 0.19) ** 2)) + side * x + up * h for x in (-0.19, -0.1, 0.0, 0.1, 0.19)]
        sweep3d(pts, [(-0.008, 0.0), (0.008, 0.0), (0.008, 0.055), (-0.008, 0.055), (-0.008, 0.0)], up, WOOD, C_OAK, caps=True)
    # the shelf rail behind (for the next row's books)
    box(c - fwd * 0.2 + up * 0.62, side, fwd, up, -0.19, 0.19, -0.03, 0.0, 0.0, 0.02, WOOD, C_OAK)

def furniture():
    fwd = Vector((1, 0, 0))                       # chairs face the altar (east = +u)
    rows = [2.0 + 0.82 * k for k in range(9)]
    for u in rows:
        for w in (-1.3, -0.82, 0.82, 1.3):          # a 1.2 m central aisle
            chair(P(u, WC + w, F0), fwd)
        for side in (-1, 1):
            if u > 9.6 and side > 0: continue
            for w in (2.65, 3.2):
                chair(P(u, WC + side * w, F0), fwd)
    # side altar + statue on a corbel at the south aisle's east end (interior photo)
    fr = Frame(P(U_AE[1], WC + 3.0, OY), Vector((-1, 0, 0)))
    fbox(fr, -0.55, 0.55, hz(F0), hz(F0 + 0.92), 0.0, 0.55, WHITE, C_PLAIN, skip=("back",))
    fbox(fr, -0.6, 0.6, hz(F0 + 0.92), hz(F0 + 0.98), 0.0, 0.6, STONE, C_PLAIN, skip=())
    # statues on corbels against the last piers (both sides), facing the nave
    for side in (-1, 1):
        u = SC.COLS_U[2]
        c = P(u, WC + side * (ARC_N - 0.05), OY)
        nrm = Vector((0, side, 0)) * 1.0           # Blender: +y = north (w negative)
        fwd2 = Vector((0, 1 if side > 0 else -1, 0))  # toward the axis
        wbox(c + fwd2 * 0.1, Vector((1, 0, 0)), fwd2, 0.18, 0.14, hz(F0 + 2.25), hz(F0 + 2.4), STONE, C_CAP)
        figure(c + fwd2 * 0.12 + Z * hz(F0 + 2.4), fwd2, Vector((1, 0, 0)), 0.85, VIRGIN if side < 0 else
               [(0.0, 0.17, 0.13, 0.06, C_MANTLE), (0.4, 0.15, 0.12, 0.06, C_MANTLE), (0.75, 0.15, 0.11, 0.03, C_ROBE), (0.86, 0.14, 0.09, 0.0, C_ROBE),
                (0.9, 0.05, 0.05, 0.0, C_SKIN), (0.91, 0.04, 0.04, 0.0, C_SKIN)])
    # the chandelier (wrought iron: ring, six arms, candle bulbs) hung from the ceiling rose
    ch = SC.CHAND
    cc = P(ch["u"], WC, ch["h"])
    rod(cc, P(ch["u"], WC, CEIL - 0.1), 0.012, IRON)
    lathe(cc - Z * 0.15, [(0.0, 0.0), (0.06, 0.02), (0.05, 0.12), (0.02, 0.2), (0.0, 0.22)], 10, IRON, C_PLAIN)
    sweep3d([cc + Vector((math.cos(a) * 0.45, math.sin(a) * 0.45, 0)) for a in [2 * math.pi * k / 24 for k in range(25)]],
            [(-0.012, -0.012), (0.012, -0.012), (0.012, 0.012), (-0.012, 0.012), (-0.012, -0.012)], Z, IRON, C_PLAIN, closed=True)
    for k in range(6):
        a = 2 * math.pi * k / 6
        d = Vector((math.cos(a), math.sin(a), 0))
        rod(cc - Z * 0.1 + d * 0.04, cc + d * 0.45, 0.01, IRON)      # from inside the hub (six rods from one point overlapped)
        p = cc + d * 0.45
        lathe(p, [(0.0, 0.0), (0.035, 0.0), (0.035, 0.02), (0.012, 0.03)], 8, IRON, C_PLAIN)
        lathe(p + Z * 0.03, [(0.012, 0.0), (0.012, 0.12), (0.0, 0.13)], 6, WHITE, C_CANDLE)
        lathe(p + Z * 0.15, [(0.0, 0.0), (0.012, 0.01), (0.016, 0.03), (0.0, 0.06)], 6, WHITE, C_CANDLE)

def west_door_leaves():
    """the west door's two leaves seen from inside (ledged boards), origins on their hinges (the viewer swings them)"""
    out = {}
    DF, DL = SC.DOOR_FRAME, SC.DOOR_LEAF
    u_d = DL["u1"]                                                # the leaves' inner face; their outer face on the frame's back
    th = DL["u1"] - DL["u0"]
    hw = SC.DOOR_W / 2 - DF["face"] + DL["lap"]                   # the leaves' outer edges, behind the jambs (the rebate)
    vt = SC.DOOR_TOP - DF["head"] + DL["lap"]
    for side, name in ((-1, "DoorL"), (1, "DoorR")):
        b = SC.Builder(); KB, K.B = K.B, b
        hinge = (u_d, WC + side * hw)                             # the axis on the leaf's inner outer corner
        fr = Frame(P(u_d, WC, OY), Vector((1, 0, 0)))          # facing in (east), s = -(w - WC)
        sh = S(fr, *hinge); sm = S(fr, u_d, WC)
        a, c = sorted((sh, sm))
        c_ = c - 0.0015 if c > a and abs(c - sm) < 1e-6 else c
        a_ = a + 0.0015 if abs(a - sm) < 1e-6 else a
        a, c = a_, c_
        n = 5
        for k in range(n):
            fbox(fr, a + (c - a) * k / n + (0.0 if k == 0 else 0.002), a + (c - a) * (k + 1) / n - (0.0 if k == n - 1 else 0.002), hz(F0), hz(vt), -th, 0.0, DOOR, C_PLAIN, skip=())
        fill2d(fr, [rect(a, hz(F0), c, hz(vt))], -th / 2, DOOR, C_PLAIN)              # a backing inside the leaf: the
        fill2d(fr, [rect(a, hz(F0), c, hz(vt))], -th / 2, DOOR, C_PLAIN, flip=True)   # joints between boards are not slits
        for v in (F0 + 0.35, F0 + 1.1, SC.DOOR_TOP - 0.45):
            fbox(fr, a + 0.04, c - 0.04, hz(v), hz(v + 0.13), 0.0, 0.03, DOOR, C_PLAIN, skip=("back",))

        if side > 0:            # the cover strip over the meeting stiles (inner face of the right leaf): no slit between them
            fbox(fr, sm - 0.028, sm + 0.028, hz(F0 + 0.004), hz(vt) - 0.01, 0.0, 0.012, DOOR, C_PLAIN, skip=("back",))
        # iron bolt + ring
        if side > 0: lathe_axis(fr.p(sm + 0.08 * (1 if c > sm else -1), hz(F0 + 1.0), -0.002), fr.N, Z, [(0.04, 0.0), (0.04, 0.044), (0.03, 0.044), (0.03, 0.0)], 16, IRON)   # on the boards (it floated 3 cm off them)
        K.B = KB
        out[name] = (b, P(hinge[0], hinge[1], F0))
    return out

def colliders():
    """simple solids for the character: wall blocks (with the door gaps), piers, the arch walls, floors and steps,
    furniture blocks"""
    T = []
    def tri(a, b, c): T.extend([a, b, c])
    def quadc(a, b, c, d): tri(a, b, c); tri(a, c, d)
    def boxc(u0, u1, w0, w1, h0, h1):
        ps = [P(u, w, h) for h in (h0, h1) for w in (w0, w1) for u in (u0, u1)]
        F = [(0, 1, 3, 2), (4, 6, 7, 5), (0, 4, 5, 1), (2, 3, 7, 6), (0, 2, 6, 4), (1, 5, 7, 3)]
        for f in F: quadc(*[ps[i] for i in f])
    def prism(pts, h0, h1):
        n = len(pts)
        for i in range(n):
            a, b = pts[i], pts[(i + 1) % n]
            quadc(P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1))
    H1 = F0 + 2.6
    # west wall (door gap), aisle walls (north door closed), aisle ends, the west responds
    boxc(-0.0, U_W, WC - A_OUT, WC - SC.DOOR_W / 2, F0 - 1, H1); boxc(-0.0, U_W, WC + SC.DOOR_W / 2, WC + A_OUT, F0 - 1, H1)
    boxc(0.0, U_AE[-1] + 0.6, WC - A_OUT, WC - AI, F0 - 1, H1); boxc(0.0, U_AE[1] + 0.6, WC + AI, WC + A_OUT, F0 - 1, H1)
    for side in (-1, 1):
        boxc(U_AE[side], U_AE[side] + 0.6, *sorted((WC + side * ARC_N, WC + side * A_OUT)), F0 - 1, H1)
        boxc(U_W, SC.RESP_W, *sorted((WC + side * ARC_N, WC + side * ARC_A)), F0 - 1, H1)
        for u in SC.COLS_U: boxc(u - 0.3, u + 0.3, *sorted((WC + side * (ARC_N - 0.05), WC + side * (ARC_A + 0.05))), F0 - 1, H1)
        boxc(U_CA0, U_CA1, *sorted((WC + side * CHOIR_ARCH["hw"], WC + side * A_OUT)), F0 - 1, H1)
    # choir walls + apse
    pts = CHOIR_IN
    for i in range(len(pts) - 1):
        a, b = pts[i], pts[i + 1]
        du, dw = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dw); n = (-dw / L * 0.6, du / L * 0.6)
        if (14.0 - (a[0] + b[0]) / 2) * n[0] + (WC - (a[1] + b[1]) / 2) * n[1] > 0: n = (-n[0], -n[1])
        prism([a, b, (b[0] + n[0], b[1] + n[1]), (a[0] + n[0], a[1] + n[1])], F0 - 1, H1)
    # floors (walkable): nave + aisles, the choir (one step up), the altar steps
    quadc(P(-3.0, WC - 1.2, 33.9), P(0.0, WC - 1.2, F0 - 0.0), P(0.0, WC + 1.2, F0), P(-3.0, WC + 1.2, 33.9)) if False else None
    for (u0, u1, w0, w1, h) in ((0.0, U_CA0, WC - AI, WC + AI, F0), (U_CA0, max(p[0] for p in pts), WC - CH, WC + CH, F1)):
        quadc(P(u0, w0, h), P(u0, w1, h), P(u1, w1, h), P(u1, w0, h))
    ue = max(p[0] for p in pts) - 0.02
    boxc(ue - 1.55, ue, WC - 1.25, WC + 1.25, F1 - 0.5, F1 + 0.15); boxc(ue - 1.1, ue, WC - 1.1, WC + 1.1, F1, F1 + 0.3)
    boxc(ue - 1.2, ue, WC - 1.05, WC + 1.05, F1 + 0.3, F1 + 2.0)       # altar + retable
    boxc(U_CA0 - 0.02, U_CA1, WC - CHOIR_ARCH["hw"], WC + CHOIR_ARCH["hw"], F0 - 1, F1)
    # the outside steps up to the west door (the heightfield takes over beyond)
    boxc(-0.32, 0.0, WC - 0.95, WC + 0.95, 33.0, F0); boxc(-0.68, -0.3, WC - 1.1, WC + 1.1, 33.0, (F0 + G(-1.0, WC)) / 2)
    # chairs: one block per half-row
    for u in [2.0 + 0.82 * k for k in range(9)]:
        for (w0, w1) in ((-1.52, -0.6), (0.6, 1.52), (-3.42, -2.43), (2.43, 3.42)):
            boxc(u - 0.22, u + 0.22, WC + w0, WC + w1, F0, F0 + 0.9)
    boxc(U_AE[1] - 0.6, U_AE[1], WC + 2.4, WC + 3.6, F0, F0 + 1.0)
    return T

SC.CHAND = dict(u=8.9, h=38.3)

# ------------------------------------------------------------------------------------------------ build
BA = SC.Builder(); BP = SC.Builder(); BG = SC.Builder()
K.B = BA; K.FAR = False
floors(); west_wall(); arcade(-1); arcade(1); aisle(-1); aisle(1); nave_ceiling(); choir()
K.B = BP
retable(); hatchments(); furniture()
K.B = BA
DOORS = west_door_leaves()
COL = colliders()
print(f"interior: arch {len(BA.f)} faces, props {len(BP.f)}, glass {len(BG.f)}, collider {len(COL) // 3} tris ({time.time() - T0:.1f}s)")

# ------------------------------------------------------------------------------------------------ meshes
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Base Color"].default_value = {"brick_red_brussels": (0.3, 0.1, 0.06, 1), "stone_white": (0.62, 0.58, 0.5, 1), "render_white": (0.78, 0.77, 0.74, 1),
                                               "marble_chequer": (0.35, 0.35, 0.34, 1), "wood_frame_white": (0.75, 0.74, 0.7, 1), "wood_frame_dark": (0.25, 0.16, 0.08, 1),
                                               "painted_wood_red": (0.15, 0.04, 0.03, 1), "glass_window": (1, 1, 1, 1), "cast_iron_green": (0.03, 0.03, 0.03, 1),
                                               "polychrome": (0.35, 0.2, 0.15, 1)}[name]
    bsdf.inputs["Roughness"].default_value = 0.85
ob_arch, ntri_arch, per_arch, _ = SC.make_object(scn, mats, SLOTS, "Arch", BA, 0.0, 1.0, LM, thin_limit=0.0)
ob_props, ntri_props, per_props, _ = SC.make_object(scn, mats, SLOTS, "Props", BP, 0, 1, LM, smart=False)

def densify(o, maxlen=0.3):
    """per-corner light needs corners: split the props' long edges (the retable's panels, the altar) to <= maxlen"""
    me = o.data
    for _ in range(4):
        bm = bmesh.new(); bm.from_mesh(me)
        long = [e for e in bm.edges if e.calc_length() > maxlen]
        if not long: bm.free(); break
        bmesh.ops.subdivide_edges(bm, edges=long, cuts=1, use_grid_fill=True)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(me); bm.free(); me.validate()
    me.update()
    n = sum(len(p.vertices) - 2 for p in me.polygons)
    print(f"  {o.name}: densified to {n} triangles (edges <= {maxlen} m)")
    return n
ntri_props = densify(ob_props, 0.4)
ob_glass, ntri_glass, _, _ = SC.make_object(scn, mats, SLOTS, "Glass", BG, 0, 1, LM, smart=False)
door_objs = {}
for name, (b, hinge) in DOORS.items():
    o, n_, _, _ = SC.make_object(scn, mats, SLOTS, name, b, 0, 1, LM, smart=False)
    densify(o, 0.35)
    o.data.transform(Matrix.Translation(-hinge)); o.location = hinge
    door_objs[name] = o
# collider: plain triangles, its own material
cm = bpy.data.meshes.new("Collider")
cm.from_pydata([tuple(v) for v in COL], [], [(i, i + 1, i + 2) for i in range(0, len(COL), 3)]); cm.update()
ob_col = bpy.data.objects.new("Collider", cm); scn.collection.objects.link(ob_col)
mcol = bpy.data.materials.new("collider"); cm.materials.append(mcol)
print(f"meshes ({time.time() - T0:.1f}s): arch {ntri_arch} tris, props {ntri_props}, glass {ntri_glass}")

# ------------------------------------------------------------------------------------------------ bake
import numpy as np
SUN_EL, SUN_AZ = math.radians(32), math.radians(235)          # a late-afternoon sun from the WSW: into the west window
to_sun_city = Vector((math.sin(SUN_AZ) * math.cos(SUN_EL), math.sin(SUN_EL), -math.cos(SUN_AZ) * math.cos(SUN_EL)))   # city: x east, y up, z south
# city (x, z) -> building frame (u, w): u = x cos r + z sin r, w = -x sin r + z cos r
r_ = G.rot
su, sw = to_sun_city.x * math.cos(r_) + to_sun_city.z * math.sin(r_), -to_sun_city.x * math.sin(r_) + to_sun_city.z * math.cos(r_)
to_sun_local = [su, to_sun_city.y, sw]                          # three.js local (u, y, w)
LIGHTS = [  # night: the chandelier's six bulbs, two spots on the choir-arch piers toward the retable, a lantern in each aisle
    *[(f"bulb{k}", P(SC.CHAND["u"] + 0.45 * math.cos(2 * math.pi * k / 6), WC - 0.45 * math.sin(2 * math.pi * k / 6), SC.CHAND["h"] + 0.17), 10.0, (1.0, 0.72, 0.42), 0.02, None) for k in range(6)],
    ("spotN", P(U_CA0 - 0.1, WC - 1.6, 37.3), 90.0, (1.0, 0.82, 0.62), 0.05, P(16.0, WC, 36.2)),
    ("spotS", P(U_CA0 - 0.1, WC + 1.6, 37.3), 90.0, (1.0, 0.82, 0.62), 0.05, P(16.0, WC, 36.2)),
    ("aisleN", P(5.5, WC - 3.0, 36.6), 12.0, (1.0, 0.75, 0.48), 0.06, None), ("aisleS", P(5.5, WC + 3.0, 36.6), 12.0, (1.0, 0.75, 0.48), 0.06, None),
]
PROBES = [(u, w, h) for u in (2.2, 5.0, 8.0) for w in (0.0,) for h in (F0 + 0.9, F0 + 1.7)] + \
         [(u, side * 3.0, F0 + 1.2) for u in (2.5, 7.0) for side in (-1, 1)] + [(12.5, 0.0, F1 + 0.9), (12.5, 0.0, F1 + 1.7), (15.0, 0.0, F1 + 1.4), (-1.5, 0.0, 34.9)]
probe_data = []
if BAKE:
    # the exterior shell (tools/blender/stalle.py's LOD0) as the occluder: walls, roofs, tracery; its glass transparent
    bpy.ops.import_scene.gltf(filepath=os.path.join(OUT, "stalle.raw.glb"))
    ext = [o for o in scn.objects if o.type == "MESH" and o.name.startswith("Stalle")]
    for o in ext:
        if o.name.startswith("Stalle_far") or o.name.startswith("Stalle_door"): bpy.data.objects.remove(o)
    ext = [o for o in scn.objects if o.type == "MESH" and o.name.startswith("Stalle")]
    occ = bpy.data.materials.new("occ"); occ.use_nodes = True
    occ.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.45, 0.42, 0.36, 1)
    tr = bpy.data.materials.new("clear"); tr.use_nodes = True
    nt = tr.node_tree; nt.nodes.remove(nt.nodes["Principled BSDF"]); tb = nt.nodes.new("ShaderNodeBsdfTransparent")
    nt.links.new(tb.outputs[0], nt.nodes["Material Output"].inputs["Surface"])
    for o in ext:
        for i, s in enumerate(o.data.materials):
            o.data.materials[i] = tr if (s and s.name.startswith("glass")) else occ
    # the interior's own glass: clear in the bake
    ob_glass.data.materials.clear(); ob_glass.data.materials.append(tr)
    ob_col.hide_render = True
    # ground
    gm = bpy.data.meshes.new("Ground"); n_ = 40
    vs = [(x, y, hz(G(x, -y)) - 0.03) for y in range(-n_, n_ + 1, 4) for x in range(-n_, n_ + 1, 4)]
    m_ = 2 * n_ // 4 + 1
    gm.from_pydata(vs, [], [(j * m_ + i, j * m_ + i + 1, (j + 1) * m_ + i + 1, (j + 1) * m_ + i) for j in range(m_ - 1) for i in range(m_ - 1)]); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    go = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(go); gm.materials.append(occ)

    scn.render.engine = "CYCLES"
    prefs = bpy.context.preferences.addons["cycles"].preferences
    try:
        prefs.compute_device_type = "OPTIX"; prefs.get_devices()
        ok = False
        for d in prefs.devices: d.use = d.type == "OPTIX"; ok = ok or d.use
        scn.cycles.device = "GPU" if ok else "CPU"
    except Exception as e:
        print("GPU unavailable, CPU bake:", e); scn.cycles.device = "CPU"
    print("bake device", scn.cycles.device)
    if scn.world is None: scn.world = bpy.data.worlds.new("World")
    scn.world.use_nodes = True
    wbg = scn.world.node_tree.nodes["Background"]
    lamps = []
    for (name, p, watts, colour, radius, aim) in LIGHTS:
        ld = bpy.data.lights.new(name, "SPOT" if aim else "POINT"); ld.energy = watts; ld.color = colour; ld.shadow_soft_size = radius
        if aim: ld.spot_size = math.radians(48); ld.spot_blend = 0.6
        lo = bpy.data.objects.new(name, ld); lo.location = p; scn.collection.objects.link(lo); lamps.append(lo)
        if aim: lo.rotation_euler = (aim - p).to_track_quat("-Z", "Y").to_euler()
    sun_d = bpy.data.lights.new("sun", "SUN"); sun_d.energy = 6.0; sun_d.angle = math.radians(0.6); sun_d.color = (1.0, 0.93, 0.82)
    sun_o = bpy.data.objects.new("sun", sun_d); scn.collection.objects.link(sun_o)
    sun_o.rotation_euler = (-Vector((su, -sw, to_sun_city.y))).to_track_quat("-Z", "Y").to_euler()
    def set_mode(mode):
        for lo in lamps:
            lo.hide_render = not (mode == "night" or (mode == "sky" and lo.name.startswith("spot")))
            if lo.name.startswith("spot"): lo.data.energy = 45.0 if mode == "sky" else 90.0
        sun_o.hide_render = mode not in ("sun", "day")
        nt = scn.world.node_tree
        for n in list(nt.nodes):
            if n.type in ("TEX_COORD", "SEPXYZ", "SEPARATE_XYZ", "MAP_RANGE", "VALTORGB"): nt.nodes.remove(n)
        if mode in ("sky", "day"):
            tc = nt.nodes.new("ShaderNodeTexCoord"); sep = nt.nodes.new("ShaderNodeSeparateXYZ"); mr = nt.nodes.new("ShaderNodeMapRange"); ramp = nt.nodes.new("ShaderNodeValToRGB")
            nt.links.new(tc.outputs["Normal"], sep.inputs[0])
            mr.inputs["From Min"].default_value = -0.1; mr.inputs["From Max"].default_value = 1.0
            nt.links.new(sep.outputs["Z"], mr.inputs["Value"]); nt.links.new(mr.outputs["Result"], ramp.inputs["Fac"])
            ramp.color_ramp.elements[0].color = (1.05, 1.04, 1.0, 1); ramp.color_ramp.elements[1].color = (0.55, 0.68, 0.95, 1)
            nt.links.new(ramp.outputs["Color"], wbg.inputs["Color"]); wbg.inputs["Strength"].default_value = 1.0
        else:
            for l in list(nt.links):
                if l.to_node == wbg: nt.links.remove(l)
            wbg.inputs["Color"].default_value = (0, 0, 0, 1) if mode == "sun" else (0.008, 0.012, 0.025, 1)
            wbg.inputs["Strength"].default_value = 1.0
    def encode_rgbm(lin, path, rng=4.0, mask=None):
        """(h, w, 3) linear, bottom row first -> RGBM PNG, gamma 2. Denoise inside the charts (as the house pilot's
        tools/blender/interior.py): a 3x3 median (fireflies), then an edge-aware a-trous B3 filter, 4 passes"""
        h, w = lin.shape[:2]
        v = np.sqrt(np.clip(lin, 0, None)) / rng
        if mask is not None:
            mk = mask[..., None]
            st = np.stack([np.roll(np.roll(v, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
            ms = np.stack([np.roll(np.roll(mk, dy, 0), dx, 1) for dy in (-1, 0, 1) for dx in (-1, 0, 1)])
            lum = np.where(ms > 0, st.mean(axis=3, keepdims=True), np.nan)
            med = np.nanmedian(lum, axis=0)
            pick = np.nanargmin(np.abs(np.where(np.isnan(lum), np.inf, lum - med[None])), axis=0)
            out = np.where(mk > 0, np.take_along_axis(st, pick[None].repeat(3, axis=3), 0)[0], v)
            k1 = [(-2, 1 / 16), (-1, 1 / 4), (0, 3 / 8), (1, 1 / 4), (2, 1 / 16)]
            for it, sig in ((1, 0.35), (2, 0.25), (4, 0.18), (8, 0.12)):
                L = out.mean(axis=2, keepdims=True)
                acc = np.zeros_like(out); ws = np.zeros_like(L)
                for dy, ky in k1:
                    for dx, kx in k1:
                        sv = np.roll(np.roll(out, dy * it, 0), dx * it, 1); sl = np.roll(np.roll(L, dy * it, 0), dx * it, 1)
                        sm = np.roll(np.roll(mk, dy * it, 0), dx * it, 1)
                        wg = ky * kx * sm * np.exp(-np.abs(sl - L) / (sig * (L + 0.02)))
                        acc += sv * wg; ws += wg
                out = np.where(mk > 0, acc / np.maximum(ws, 1e-6), out)
            v = out
        m = np.clip(np.ceil(v.max(axis=2, keepdims=True) * 255) / 255, 1 / 255, 1)
        px = np.concatenate([np.clip(v / m, 0, 1), m], axis=2).astype(np.float32)
        im = bpy.data.images.new(os.path.basename(path), w, h, alpha=True, float_buffer=False)
        im.colorspace_settings.name = "Non-Color"; im.alpha_mode = "STRAIGHT"
        im.pixels.foreach_set(px.ravel()); im.filepath_raw = path; im.file_format = "PNG"
        scn.render.image_settings.color_mode = "RGBA"; scn.render.image_settings.color_depth = "8"
        im.save(); print("wrote", path, os.path.getsize(path) // 1024, "KB")
    img = bpy.data.images.new("lm", LM, LM, alpha=True, float_buffer=True)
    for m in mats:
        tn = m.node_tree.nodes.new("ShaderNodeTexImage"); tn.image = img; tn.name = "LM"; m.node_tree.nodes.active = tn
    scn.cycles.samples = SAMPLES; scn.cycles.max_bounces = 6; scn.cycles.diffuse_bounces = 5
    scn.render.bake.margin = 6; scn.render.bake.margin_type = "EXTEND"
    vl_objs = [ob_props] + list(door_objs.values())
    for ob in vl_objs:
        for mode in ("sky", "sun", "night"): ob.data.color_attributes.new("vl_" + mode, "FLOAT_COLOR", "CORNER")
    # probe cubes
    pb = bpy.data.meshes.new("pb"); pv, pf = [], []
    for (u, w, h) in PROBES:
        c = P(u, WC + w, h); s = 0.05; i0 = len(pv)
        pv += [tuple(c + Vector((x, y, z))) for z in (-s, s) for y in (-s, s) for x in (-s, s)]
        pf += [(i0 + a, i0 + b, i0 + c_, i0 + d) for a, b, c_, d in ((1, 3, 7, 5), (0, 4, 6, 2), (2, 6, 7, 3), (0, 1, 5, 4), (4, 5, 7, 6), (0, 2, 3, 1))]
    pb.from_pydata(pv, [], pf); pb.update()
    ob_pb = bpy.data.objects.new("ProbeCubes", pb); scn.collection.objects.link(ob_pb)
    mpb = bpy.data.materials.new("probe"); mpb.use_nodes = True; mpb.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (1, 1, 1, 1); pb.materials.append(mpb)
    for mode in ("sky", "sun", "night"): pb.color_attributes.new("pb_" + mode, "FLOAT_COLOR", "CORNER")
    probe_vals = {}
    for mode in ("sky", "sun", "night"):
        set_mode(mode); t = time.time()
        for o in scn.objects: o.select_set(False)
        ob_arch.select_set(True); bpy.context.view_layer.objects.active = ob_arch
        ob_arch.data.uv_layers.active = ob_arch.data.uv_layers["Lightmap"]
        bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, uv_layer="Lightmap", margin=6, use_clear=True, target="IMAGE_TEXTURES")
        a = np.array(img.pixels[:], dtype=np.float32).reshape(LM, LM, 4)
        encode_rgbm(a[..., :3], os.path.join(OUT, f"lm_{mode}.png"), mask=(a[..., 3] > 0.5).astype(np.float32))
        for ob in vl_objs + [ob_pb]:
            for o in scn.objects: o.select_set(False)
            ob.select_set(True); bpy.context.view_layer.objects.active = ob
            an = ("pb_" if ob is ob_pb else "vl_") + mode
            ob.data.color_attributes.active_color = ob.data.color_attributes[an]
            bpy.ops.object.bake(type="DIFFUSE", pass_filter={"DIRECT", "INDIRECT"}, target="VERTEX_COLORS")
        ca = pb.color_attributes["pb_" + mode]
        vals = []
        for k in range(len(PROBES)):
            faces = pb.polygons[k * 6:(k + 1) * 6]
            cube = {}
            for f in faces:
                c = [sum(ca.data[li].color[j] for li in f.loop_indices) / f.loop_total for j in range(3)]
                n = f.normal                      # Blender (x=u, y=-w, z=up) -> three local (u, up, w): (x, z, -y)
                key = "+x" if n.x > 0.5 else "-x" if n.x < -0.5 else "+y" if n.z > 0.5 else "-y" if n.z < -0.5 else "+z" if n.y < -0.5 else "-z"
                cube[key] = [round(v, 5) for v in c]
            vals.append([cube[k_] for k_ in ("+x", "-x", "+y", "-y", "+z", "-z")])
        probe_vals[mode] = vals
        print(f"bake {mode}: {time.time() - t:.1f}s")
    for k, (u, w, h) in enumerate(PROBES):
        probe_data.append({"pos": [u, h - OY, WC + w], "sky": probe_vals["sky"][k], "sun": probe_vals["sun"][k], "night": probe_vals["night"][k]})
    def smooth_corners(me, name, iters=3):
        """per-corner bake noise -> one value per (vertex, normal group), then a few Laplacian passes over the faces'
        corners (each face's corners share its normal: light does not bleed round sharp edges)"""
        ca = me.color_attributes[name]
        n = len(me.loops)
        d = np.zeros(n * 4, dtype=np.float32); ca.data.foreach_get("color", d); val = d.reshape(-1, 4).astype(np.float64)
        keys = np.zeros(n, dtype=np.int64)
        kmap = {}
        for f in me.polygons:
            nq = (round(f.normal.x * 3), round(f.normal.y * 3), round(f.normal.z * 3))
            for li in f.loop_indices:
                keys[li] = kmap.setdefault((me.loops[li].vertex_index, nq), len(kmap))
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
            nb = np.zeros_like(kv); np.add.at(nb, pa, kv[pb])
            kv = np.where(deg > 0, 0.5 * kv + 0.5 * nb / np.maximum(deg, 1), kv)
        ca.data.foreach_set("color", kv[keys].astype(np.float32).ravel())

    for ob in vl_objs:
        me = ob.data
        for mode in ("sky", "sun", "night"):
            smooth_corners(me, "vl_" + mode)
            ca = me.color_attributes["vl_" + mode]
            d = np.zeros(len(me.loops) * 4, dtype=np.float32); ca.data.foreach_get("color", d)
            at = me.attributes.new("_L" + mode.upper(), "FLOAT_VECTOR", "CORNER")
            at.data.foreach_set("vector", d.reshape(-1, 4)[:, :3].ravel())
            me.color_attributes.remove(me.color_attributes["vl_" + mode])
        me.color_attributes.active_color = me.color_attributes["Col"]
    for m in mats: m.node_tree.nodes.remove(m.node_tree.nodes["LM"])
    # previews (day + night) from the west door and in the choir
    if PREVIEW:
        os.makedirs(PREVIEW, exist_ok=True)
        cam_d = bpy.data.cameras.new("cam"); cam = bpy.data.objects.new("cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
        scn.render.resolution_x, scn.render.resolution_y = 960, 640
        scn.cycles.samples = 64; scn.cycles.use_denoising = True
        scn.render.image_settings.file_format = "PNG"; scn.render.image_settings.color_mode = "RGB"
        scn.view_settings.view_transform = "AgX"
        ob_pb.hide_render = True
        for name, eye, at, lens, mode, ev in (("blender_nave", (1.3, 0.6, 35.9), (14.0, 0.0, 36.8), 16, "day", 3.0),
                                              ("blender_choir", (11.0, -0.4, 35.9), (16.3, 0.1, 37.4), 18, "day", 3.0),
                                              ("blender_nave_night", (1.3, 0.6, 35.9), (14.0, 0.0, 36.8), 16, "night", 2.0)):
            set_mode(mode)
            cam.location = P(eye[0], WC + eye[1], eye[2]); d = P(at[0], WC + at[1], at[2]) - cam.location
            cam.rotation_euler = d.to_track_quat("-Z", "Y").to_euler(); cam_d.lens = lens
            scn.view_settings.exposure = ev
            scn.render.filepath = os.path.join(PREVIEW, f"{name}.png"); bpy.ops.render.render(write_still=True)
    # clean the bake helpers before export
    for o in list(scn.objects):
        if o.type in ("LIGHT", "CAMERA") or o.name.startswith("Stalle") or o.name in ("Ground", "ProbeCubes"): bpy.data.objects.remove(o)
    ob_glass.data.materials.clear(); ob_glass.data.materials.append(mats[GLASS])

# ------------------------------------------------------------------------------------------------ export
for o in scn.objects: o.select_set(False)
for o in [ob_arch, ob_props, ob_glass, ob_col] + list(door_objs.values()): o.select_set(True)
bpy.context.view_layer.objects.active = ob_arch
glb = os.path.join(OUT, "interior.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_attributes=True, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

def loc(u, w, h): return [u, h - OY, w]          # three.js local of the node (u, TAW - OY, w)
def box_l(u0, u1, w0, w1, h0, h1): return [loc(u0, w0, h0), loc(u1, w1, h1)]
openings = [{"name": "west door", "box": box_l(-0.1, 0.8, WC - 0.75, WC + 0.75, F0, SC.DOOR_TOP)},
            {"name": "west window", "box": box_l(-0.1, 0.8, WC - 1.1, WC + 1.1, SC.WWIN_SILL - 0.3, SC.WWIN_APEX)},
            {"name": "choir window", "box": box_l(SC.CHOIR_WIN_N - 0.7, SC.CHOIR_WIN_N + 0.7, WC - NW - 0.1, WC - CH + 0.05, 37.1, 39.8)}]
for side, oc in ((-1, SC.N_AISLE["oculi"]), (1, SC.S_AISLE["oculi"])):
    for u in oc: openings.append({"name": f"aisle oculus {u}", "box": box_l(u - 0.35, u + 0.35, *sorted((WC + side * (AI - 0.05), WC + side * (A_OUT + 0.05))), SC.AISLE_OCULUS_H - 0.35, SC.AISLE_OCULUS_H + 0.35)})
    for u in SC.CLER_OCULI: openings.append({"name": f"clerestory oculus {u}", "box": box_l(u - 0.32, u + 0.32, *sorted((WC + side * (ARC_N - 0.05), WC + side * (NW + 0.05))), 39.4, 40.05)})
openings.append({"name": "lepers' window", "box": box_l(0.65, 1.35, WC - A_OUT - 0.05, WC - AI + 0.05, 34.9, 35.95)})
room = [[U_W, WC - AI], [U_AE[-1], WC - AI], [U_AE[-1], WC - ARC_A], [U_CA1, WC - ARC_A]] + [[u, w] for u, w in CHOIR_IN[1:-1]] + [[U_CA1, WC + ARC_A], [U_AE[1], WC + ARC_A], [U_AE[1], WC + AI], [U_W, WC + AI]]
info = {
    "asset": "Chapelle de Stalle: the interior cell (tools/blender/stalle_interior.py)",
    "slots": SLOTS, "new_slot_names": {"marble_chequer": "black and white chequered stone floor (P03 + the interior photo; choir paving 1697)",
                                       "polychrome": "painted statues (the Virgin, the angel, saints) and the hatchments: colours by face code"},
    "codes": {"COLOR_0.r": "code / 16 + 1/32", "names": CODES},
    "triangles": {"arch": ntri_arch, "props": ntri_props, "glass": ntri_glass, "collider": len(COL) // 3, "per_slot_arch": per_arch, "per_slot_props": per_props},
    "lightmap": {"size": LM, "encoding": "RGBM gamma 2: lin = (rgb * a * 4)^2", "sky": "lm_sky.png", "sun": "lm_sun.png", "night": "lm_night.png",
                 "samples": SAMPLES, "sun_dir_local": to_sun_local, "props": "per corner: _LSKY / _LSUN / _LNIGHT (RGBM uint8 after the pack)",
                 "night_lights": [l[0] for l in LIGHTS]},
    "ambientCubes": {"order": "+x -x +y -y +z -z (node local: u, up, w)", "probes": probe_data},
    "openings": openings,
    "room": {"plan_local_uw": room, "y": [F0 - 0.3 - OY, CEIL + 0.1 - OY]},
    "doors": {name: {"hinge": loc(*(lambda v: (v.x, -v.y, v.z + OY))(h)), "opens": "about +y, the free edge swinging into the nave (+u)"} for name, (b, h) in DOORS.items()},
    "door_open_angle_deg": SC.DOOR_OPEN_DEG,
    "spawn": {"outside": loc(-3.2, WC, G(-3.2, WC)), "inside": loc(3.0, WC, F0)},
    "levels_taw": {"floor": F0, "choir": F1, "wall_top": WALL_TOP, "ceiling": CEIL, "aisle_ceiling": [AISLE_HI, AISLE_LO]},
    "estimated": "the furniture layout (chairs, side altar, statues on the piers, the chandelier, the night lamps), the north aisle and west wall "
                 "inside (no photo), the retable's upper storey details, the colours of the statues; the sun lightmap is baked for one "
                 "direction (late afternoon, WSW)",
}
json.dump(info, open(os.path.join(OUT, "interior.json"), "w"), indent=1)
print(f"done {time.time() - T0:.1f}s")
