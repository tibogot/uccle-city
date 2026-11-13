"""EGLISE SAINT-AUGUSTIN (Place de l'Altitude Cent, Forest; Leon Guiannotte + Andre Watteyne, 1933-35, inaugurated 1936;
reinforced concrete, Art Deco; a Greek-cross plan under a 54 m central tower): built entirely in code (no hand modelling)
from MEASURED data + photos.

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/augustin.py -- models/augustin [--no-bake] [--previews] [--fast]
      models/augustin/augustin.raw.glb  node "Augustin" (LOD0) + "Augustin_far" (the scripted far variant); one primitive
                                        per NAMED material slot (SLOTS)
      models/augustin/augustin_ao.png   ambient occlusion (Cycles) in TEXCOORD_1 (LOD0 in v 0..AO_SPLIT, far above)
      models/augustin/augustin.json     measurements, slots, codes, placement, counts, what is estimated
      docs/landmarks/augustin/preview_*.png   Cycles renders (--previews)

INPUT: models/augustin/site.json + site_dtm.* (tools/augustin_measure.py: the UrbIS 3D solid 514999, DSM / DTM 2021).
THE MASSING IS MEASURED: every PART below is a prism whose plan and top come from the UrbIS solid's horizontal faces
(levels 106.36 ... 154.70, frame = the tower axis, u towards the entrance), symmetrised about the axes (the solid's two
halves differ by <= 0.3 m: digitising), the curved walls are circles FITTED to the solid's arc vertices (residual
<= 0.13 m). Walls are generated from the plan: every exterior edge gets a wall from the neighbour's height (or below the
ground) up to its top; copings, the plinth and bands follow the exterior chains.
THE ARCHITECTURE IS FROM PHOTOS (docs/landmarks/AUGUSTIN.md; Commons photos, Street View looked at only): the stepped
pilasters and three tall lights of the arm fronts, the quadrant wings' ring of square windows with a corbelled sill band
and a slab cornice, the apse drum's three tall windows, the tower's 3/4-light windows, louvre pairs, slits and the
winged relief, the open lantern with its fins and the cross. Openings' sizes and heights are ESTIMATED from the photos
(augustin.json "estimated").

SWAPPABLE MATERIALS: no colour, no texture in the GLB. COLOR_0.r = per-face code / 16 + 1/32, COLOR_0.g = per-vertex AO
of the thin parts; TEXCOORD_0 = world metres per face; TEXCOORD_1 = the baked AO's lightmap UV (lighting only).
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
SC.OY = 100.0                                         # this site's height offset (Blender z = TAW - 100)
from stpierre_common import K, P, hz, Z, Frame, rect, box, fbox, rod, lathe_axis, sweep3d, face_dir, quad, ccw, inside
OY = SC.OY

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/augustin")
BAKE = "--no-bake" not in ARGS
PREVIEWS = "--previews" in ARGS
AO_PX = 2048
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "augustin")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
FR = SITE["frame"]

SLOTS = ["concrete_white", "stone_blue", "roof_bitumen", "glass_window", "cast_iron_green", "wood_frame_dark"]
CONC, STONE, ROOF, GLASS, IRON, WOOD = range(6)
CODES = ["plain", "pilaster", "coping", "band", "sill", "reveal", "louvre", "relief", "plinth", "mullion", "door", "cross",
         "step", "rail", "lead", "soffit"]
(C_PLAIN, C_PIL, C_COPING, C_BAND, C_SILL, C_REVEAL, C_LOUVRE, C_RELIEF, C_PLINTH, C_MULL, C_DOOR, C_CROSS, C_STEP, C_RAIL,
 C_LEAD, C_SOFFIT) = range(16)
FAR = lambda: K.FAR
HB = 100.2                     # walls go this far down (the DTM round the walls: 101.56-102.29; the Place 100.3 at 30-45 m)
PLINTH_TOP = 102.55            # the rubble-stone plinth band (photos: a darker stone base, ~0.3-0.9 m over the sloping ground)

# ------------------------------------------------------------------------------------------------ THE PLAN (measured)
AE, AX, AA, TW = 5.45, 6.37, 5.71, 5.5        # entrance arm / crossing / apse arm half-widths; transept half-width (in u)
U_FRONT, U_PORCH, U_PSTEP = -18.5, -22.57, -19.95
W_TFRONT, W_TPORCH, TP_HALF = 18.86, 23.05, 4.8
CP_OUT = 7.6                                   # the entrance front's corner piers (116.43): |w| 5.45..7.6, u -18.5..U_CP
WING_C, WING_R = (7.4, 7.6), 9.13              # the quadrant wings: circle fitted to the 113.24 arcs (residual 0.05-0.13)
U_CP = -(WING_C[0] + WING_R)                   # -16.53: the corner piers' back = the wing circle's end (UrbIS -16.5)
DRUM_C, DRUM_R = 19.5, 5.71                    # the apse drum (117.15): fitted, residual 0.01
AMB_C, AMB_R = 19.35, 10.69                    # the ambulatory front (106.36): fitted, residual 0.04
U_AMB_BACK, W_SIDEBLK = 23.15, 10.4            # the low blocks (108.8) beside the drum
TC = 3.76                                      # tower core half (139.5)
PIER = (5.56, 2.57)                            # tower piers on the u faces (139.06): |u| 3.76..5.56, |w| <= 2.57
SHOULDER = (3.17, 5.36)                        # tower shoulders on the w faces (132.71): |u| <= 3.17, |w| 3.76..5.36
L_A_TOP = 144.3                                # the open lantern stage (estimated from photos: openings 139.5-144.3)
TOPS = dict(porch=106.36, side=108.8, wing=113.24, cp=116.43, transept=116.85, drum=117.15, arm=117.75, crossing=120.4,
            shoulder=132.71, pier=139.06, core=139.5, post=147.87, larm_w=148.68, larm_u=148.88, pedestal=150.46, cross=154.7)
GF = 101.9                                     # the church floor (estimated; the DTM round the doors 101.6-102.0)

def arc(c, r, a0, a1, step=math.radians(3.6), breaks=()):
    """points on a circle (u, w) from angle a0 to a1 (radians, in the u-w plane: angle 0 = +u, 90 deg = +w), facets <= step,
    with vertices exactly at `breaks` (window edges)"""
    lo, hi = min(a0, a1), max(a0, a1)
    angs = sorted({a0, a1} | {b for b in breaks if lo < b < hi})
    if a1 < a0: angs = angs[::-1]
    out = []
    for i in range(len(angs) - 1):
        x, y = angs[i], angs[i + 1]
        n = max(1, math.ceil(abs(y - x) / step - 1e-6))
        for k in range(n): out.append(x + (y - x) * k / n)
    out.append(angs[-1])
    return [(c[0] + r * math.cos(a), c[1] + r * math.sin(a)) for a in out]

# window layouts on the curved walls (angles, radians) -- needed by the plan's arc vertices
D = math.radians
def ring(a0, a1, n, half):
    return [((a0 + (a1 - a0) * (k + 0.5) / n) - half, (a0 + (a1 - a0) * (k + 0.5) / n) + half) for k in range(n)]
WING_WIN = 7                                   # photos: ~7 square windows on each wing's quarter circle
def wing_windows(): return ring(D(5), D(85), WING_WIN, (1.15 / 2) / WING_R)
DRUM_WIN = [(-D(5.6) * 1.9, D(5.6) * 1.9), (D(42) - 0.11, D(42) + 0.11), (-D(42) - 0.11, -D(42) + 0.11)]   # centre 2.1 m, sides 1.26 m
AMB_WIN = [(-0.075, 0.075), (D(19) - 0.07, D(19) + 0.07), (-D(19) - 0.07, -D(19) + 0.07)]

def mirror_u(loop): return [(-u, w) for u, w in loop][::-1]
def mirror_w(loop): return [(u, -w) for u, w in loop][::-1]

def build_plan(far):
    step = math.radians(5.0 if far else 2.5)
    parts = []
    def part(name, loops, top, bottom=HB, no_top=False, roof_holes=(), coping="std", tags=(), no_bottom=False):
        parts.append(dict(name=name, loops=[ccw(l) for l in loops], top=top, bottom=bottom, no_top=no_top, no_bottom=no_bottom,
                          roof_holes=[ccw(h) for h in roof_holes], coping=coping, tags=set(tags)))
    # the crossing (120.4) round the tower
    tower = [(-TC, -TC), (-TC, -PIER[1]), (-PIER[0], -PIER[1]), (-PIER[0], PIER[1]), (-TC, PIER[1]), (-TC, TC), (-SHOULDER[0], TC),
             (-SHOULDER[0], SHOULDER[1]), (SHOULDER[0], SHOULDER[1]), (SHOULDER[0], TC), (TC, TC), (TC, PIER[1]), (PIER[0], PIER[1]),
             (PIER[0], -PIER[1]), (TC, -PIER[1]), (TC, -TC), (SHOULDER[0], -TC), (SHOULDER[0], -SHOULDER[1]), (-SHOULDER[0], -SHOULDER[1]),
             (-SHOULDER[0], -TC)]
    part("crossing", [[(-AX, -AX), (AX, -AX), (AX, AX), (-AX, AX)], tower], TOPS["crossing"])
    # the tower
    lantern_a = []
    for su in (1, -1):
        for sw in (1, -1):
            q = [(0.6, 0.75), (3.02, 0.75), (3.02, 1.25), (2.78, 1.25), (2.78, 1.72)] + \
                arc((2.28, 1.72), 0.5, 0.0, math.pi / 2, step=math.radians(5.0))[1:] + [(1.8, 2.22), (1.8, 2.4), (0.6, 2.4)]
            lantern_a.append([(su * u, sw * w) for u, w in q])
    part("core", [rect_uw(-TC, -TC, TC, TC)], TOPS["core"], roof_holes=lantern_a, tags=("tower",))
    for s in (1, -1):
        part(f"pier{'+' if s > 0 else '-'}", [rect_uw(min(s * TC, s * PIER[0]), -PIER[1], max(s * TC, s * PIER[0]), PIER[1])], TOPS["pier"], tags=("tower",))
        part(f"shoulder{'+' if s > 0 else '-'}", [rect_uw(-SHOULDER[0], min(s * TC, s * SHOULDER[1]), SHOULDER[0], max(s * TC, s * SHOULDER[1]))], TOPS["shoulder"], tags=("tower",))
    for i, q in enumerate(lantern_a):
        part(f"lanternA{i}", [q], L_A_TOP, bottom=TOPS["core"], no_top=True, tags=("lantern",), no_bottom=True, coping=None)
    part("lantern_u", [rect_uw(-3.02, -1.25, 3.02, 1.25)], TOPS["larm_u"], bottom=L_A_TOP, roof_holes=[cross_plan(1.0, 0.38)], tags=("lantern",))
    for s in (1, -1):
        part(f"lantern_w{s:+d}", [rect_uw(-1.8, min(s * 1.25, s * 2.4), 1.8, max(s * 1.25, s * 2.4))], TOPS["larm_w"], bottom=L_A_TOP, tags=("lantern",), coping=None)
    for su in (1, -1):
        for sw in (1, -1):
            q = [(1.8, 1.25), (2.78, 1.25), (2.78, 1.72)] + arc((2.28, 1.72), 0.5, 0.0, math.pi / 2, step=math.radians(5.0))[1:] + [(1.8, 2.22)]
            part(f"post{su:+d}{sw:+d}", [[(su * u, sw * w) for u, w in q]], TOPS["post"], bottom=L_A_TOP, tags=("lantern",))
    part("pedestal", [cross_plan(1.0, 0.38)], TOPS["pedestal"], bottom=TOPS["larm_u"], roof_holes=[rect_uw(-0.38, -0.38, 0.38, 0.38)], tags=("lantern",), no_bottom=True)
    part("shaft", [rect_uw(-0.38, -0.38, 0.38, 0.38)], TOPS["cross"], bottom=TOPS["pedestal"], tags=("cross",), coping=None, no_bottom=True)
    # the entrance arm (117.75, widening to the crossing's width from u -10.29), its corner piers + strips (116.43), porch
    part("arm_e", [[(U_FRONT, -AE), (-10.29, -AE), (-10.29, -AX), (-AX, -AX), (-AX, AX), (-10.29, AX), (-10.29, AE), (U_FRONT, AE)]], TOPS["arm"])
    for s in (1, -1):
        cp = [(U_FRONT, AE), (-10.29, AE), (-10.29, AX), (U_CP, AX), (U_CP, CP_OUT), (U_FRONT, CP_OUT)]
        part(f"cp{s:+d}", [cp if s > 0 else mirror_w(cp)], TOPS["cp"], tags=("cp",))
    part("porch_e", [[(U_PORCH, -4.65), (U_PSTEP, -4.65), (U_PSTEP, -AE), (U_FRONT, -AE), (U_FRONT, AE), (U_PSTEP, AE), (U_PSTEP, 4.65), (U_PORCH, 4.65)]],
         TOPS["porch"], coping="slab_s", tags=("porch",))
    # the transepts (116.85) + their porches
    for s in (1, -1):
        part(f"tr{s:+d}", [rect_uw(-TW, min(s * AX, s * W_TFRONT), TW, max(s * AX, s * W_TFRONT))], TOPS["transept"])
        part(f"porch_t{s:+d}", [rect_uw(-TP_HALF, min(s * W_TFRONT, s * W_TPORCH), TP_HALF, max(s * W_TFRONT, s * W_TPORCH))], TOPS["porch"],
             coping="slab_s", tags=("porch",))
    # the apse arm (117.75), the drum (117.15), the side blocks (108.8), the ambulatory (106.36)
    part("arm_a", [rect_uw(AX, -AA, DRUM_C, AA)], TOPS["arm"])
    brk = [a for w_ in DRUM_WIN for a in w_]
    part("drum", [[(DRUM_C, -DRUM_R)] + arc((DRUM_C, 0.0), DRUM_R, -math.pi / 2, math.pi / 2, step, breaks=brk)[1:-1] + [(DRUM_C, DRUM_R)]],
         TOPS["drum"], coping="slab", tags=("drum",))
    th = math.acos((U_AMB_BACK - DRUM_C) / DRUM_R)          # where the drum meets the blocks' back line
    ta = math.acos((28.0 - AMB_C) / AMB_R)
    amb = [(U_AMB_BACK, -8.6), (28.0, -8.6)] + \
          arc((AMB_C, 0.0), AMB_R, -ta, ta, step, breaks=[a for w_ in AMB_WIN for a in w_]) + \
          [(28.0, 8.6), (U_AMB_BACK, 8.6)] + \
          arc((DRUM_C, 0.0), DRUM_R, th, -th, step)
    part("ambulatory", [amb], TOPS["porch"], coping="slab", tags=("amb",))
    # wing arc angles where the blocks meet it
    a_side = -math.asin((W_SIDEBLK - WING_C[1]) / WING_R)                                    # w = -10.4 on the (+u, -w) wing circle
    a_arm = math.asin((WING_C[1] - AA) / WING_R)                                            # w = -5.7
    for sw in (1, -1):
        blk = [(DRUM_C - 3.17, -AA), (DRUM_C, -DRUM_R)] + arc((DRUM_C, 0.0), DRUM_R, -math.pi / 2, -th, step)[1:] + [(U_AMB_BACK, -W_SIDEBLK)] + \
              arc((WING_C[0], -WING_C[1]), WING_R, a_side, a_arm, step)
        blk = [(u, w) for u, w in blk]
        # the first point: where the wing circle meets w = -AA (the arc's last point) -> drop the placeholder
        blk = blk[1:]
        part(f"side{sw:+d}", [blk if sw < 0 else mirror_w(blk)], TOPS["side"], coping="slab_s", tags=("side",))
    # the quadrant wings (113.24): straight inner edges + the fitted quarter circle with the window ring
    wbrk = [a for w_ in wing_windows() for a in w_]
    for su in (1, -1):
        for sw in (1, -1):
            cu, cw = WING_C
            if su < 0:
                # (-u, +w): inner corner (-5.5, 6.37) -> (-16.5, 6.37) -> (-16.5, 7.6) -> arc 180 -> 90 deg -> (-7.4, 16.73) -> (-5.5, 16.73)
                a_s = [(-TW, AX), (U_CP, AX)]
                ar = arc((-cu, cw), WING_R, math.pi, math.pi / 2, step, breaks=[math.pi - b for b in wbrk])
                loop = a_s + ar + [(-TW, cw + WING_R)]
            else:
                a_s = [(TW, AX), (AX, AX), (AX, AA)]
                a0 = math.asin((AA - cw) / WING_R)                                         # w = +5.7 on the circle
                a_blk = math.asin((W_SIDEBLK - cw) / WING_R)                              # where the side block (108.8) ends on the arc
                ar = arc((cu, cw), WING_R, a0, math.pi / 2, step, breaks=[b for b in wbrk if b > a0 + 0.02] + [a_blk])
                if su > 0:
                    # the side block (108.8) covers the arc from w 5.7 to 10.4: the wing's wall there rises from 108.8
                    pass
                loop = a_s + ar + [(TW, cw + WING_R)]
            if sw < 0: loop = mirror_w(loop)
            part(f"wing{su:+d}{sw:+d}", [loop], TOPS["wing"], coping="slab", tags=("wing",))
    return parts

def rect_uw(u0, w0, u1, w1): return [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
def cross_plan(a, b): return [(-a, -b), (-b, -b), (-b, -a), (b, -a), (b, -b), (a, -b), (a, b), (b, b), (b, a), (-b, a), (-b, b), (-a, b)]

# ------------------------------------------------------------------------------------------------ plan geometry
def in_part(p, q):
    if not inside(q, p["loops"][0]): return False
    return not any(inside(q, h) for h in p["loops"][1:])

def seg_hits(a, b, loops):
    """params t in (0, 1) where segment a->b crosses the loops' edges"""
    ts = []
    ax, ay = a; dx, dy = b[0] - a[0], b[1] - a[1]
    for l in loops:
        for i in range(len(l)):
            (cx, cy), (ex, ey) = l[i], l[(i + 1) % len(l)]
            fx, fy = ex - cx, ey - cy
            den = dx * fy - dy * fx
            if abs(den) < 1e-12: continue
            t = ((cx - ax) * fy - (cy - ay) * fx) / den
            s = ((cx - ax) * dy - (cy - ay) * dx) / den
            if 1e-6 < t < 1 - 1e-6 and -1e-9 <= s <= 1 + 1e-9: ts.append(t)
    return ts

def coverage(parts, me, q):
    return sorted((p["bottom"], p["top"]) for p in parts if p is not me and in_part(p, q))

def minus(iv, cov):
    """interval iv minus the union of cov intervals -> list"""
    out = [iv]
    for c0, c1 in cov:
        nxt = []
        for a, b in out:
            if c1 <= a + 1e-6 or c0 >= b - 1e-6: nxt.append((a, b)); continue
            if c0 > a + 1e-6: nxt.append((a, c0))
            if c1 < b - 1e-6: nxt.append((c1, b))
        out = nxt
    return [x for x in out if x[1] - x[0] > 0.01]

def exterior_segments(parts):
    """every part's wall pieces: dict(part, a, b, n (outward unit, u-w), ivs [(h0, h1)], loop index, edge index)"""
    segs = []
    for p in parts:
        for li, l in enumerate(p["loops"]):
            for ei in range(len(l)):
                a, b = l[ei], l[(ei + 1) % len(l)]
                du, dw = b[0] - a[0], b[1] - a[1]; L = math.hypot(du, dw)
                if L < 1e-4: continue
                n = (dw / L, -du / L)
                m = ((a[0] + b[0]) / 2 + n[0] * 0.02, (a[1] + b[1]) / 2 + n[1] * 0.02)
                if in_part(p, m): n = (-n[0], -n[1])
                off = (n[0] * 0.03, n[1] * 0.03)
                A, Bp = (a[0] + off[0], a[1] + off[1]), (b[0] + off[0], b[1] + off[1])
                ts = [0.0, 1.0]
                for o in parts:
                    if o is not p: ts += seg_hits(a, b, o["loops"])          # split points ON the edge (exact vertices)
                ts = sorted(set(round(t, 7) for t in ts))
                pieces = []
                for t0, t1 in zip(ts, ts[1:]):
                    if t1 - t0 < 1e-5: continue
                    tm = (t0 + t1) / 2
                    q = (A[0] + (Bp[0] - A[0]) * tm, A[1] + (Bp[1] - A[1]) * tm)
                    ivs = minus((p["bottom"], p["top"]), coverage(parts, p, q))
                    if pieces and pieces[-1][2] == ivs: pieces[-1][1] = t1
                    else: pieces.append([t0, t1, ivs])
                k = 0
                while len(pieces) > 1 and k < len(pieces):
                    if pieces[k][1] - pieces[k][0] < 0.004:
                        j = k - 1 if k > 0 else k + 1
                        if j < k: pieces[j][1] = pieces[k][1]
                        else: pieces[j][0] = pieces[k][0]
                        pieces.pop(k)
                        if 0 < k < len(pieces) and pieces[k - 1][2] == pieces[k][2]:
                            pieces[k - 1][1] = pieces[k][1]; pieces.pop(k)
                    else: k += 1
                for t0, t1, ivs in pieces:
                    if not ivs: continue
                    pa = (a[0] + du * t0, a[1] + dw * t0); pb = (a[0] + du * t1, a[1] + dw * t1)
                    segs.append(dict(part=p, a=pa, b=pb, n=n, ivs=ivs, li=li, ei=ei, L=L * (t1 - t0)))
    return segs

def frame_of(seg):
    a, n = seg["a"], seg["n"]
    fr = Frame(P(a[0], a[1], OY), Vector((n[0], -n[1], 0)))
    sa, sb = fr.s_of(*seg["a"]), fr.s_of(*seg["b"])
    return fr, min(sa, sb), max(sa, sb), sa > sb

# ------------------------------------------------------------------------------------------------ wall builders
def wall_grid(fr, s0, s1, v0, v1, holes, mat=CONC, code=C_PLAIN, d=0.0, extra=()):
    """a planar wall (facing +N) from s0..s1, v0..v1 (Blender z) with rectangular holes [(hs0, hv0, hs1, hv1)]: split on
    the holes' edges into a grid of quads (no fans round openings)"""
    S = sorted({s0, s1} | {x for h in holes for x in (h[0], h[2]) if s0 < x < s1})
    V = sorted({v0, v1} | {y for h in holes for y in (h[1], h[3]) if v0 < y < v1} | set(extra))
    K.B.new_group()
    for i in range(len(S) - 1):
        for j in range(len(V) - 1):
            cs, cv = (S[i] + S[i + 1]) / 2, (V[j] + V[j + 1]) / 2
            if any(h[0] < cs < h[2] and h[1] < cv < h[3] for h in holes): continue
            face_dir([fr.p(S[i], V[j], d), fr.p(S[i + 1], V[j], d), fr.p(S[i + 1], V[j + 1], d), fr.p(S[i], V[j + 1], d)], fr.N, mat, code)

def opening(fr, h, depth, kind="glass", mull=(0, 0), sides=(True, True), d0=0.0, mat=CONC):
    """the reveal of a rectangular hole h = (s0, v0, s1, v1) from d0 to d0 - depth, and what fills it at the back"""
    s0, v0, s1, v1 = h
    db = d0 - depth
    K.B.new_group()
    # sill (facing up), head soffit (facing down), jambs (facing in)
    face_dir([fr.p(s0, v0, d0), fr.p(s1, v0, d0), fr.p(s1, v0, db), fr.p(s0, v0, db)], Z, mat, C_REVEAL)
    face_dir([fr.p(s0, v1, d0), fr.p(s1, v1, d0), fr.p(s1, v1, db), fr.p(s0, v1, db)], -Z, mat, C_REVEAL)
    if sides[0]: face_dir([fr.p(s0, v0, d0), fr.p(s0, v1, d0), fr.p(s0, v1, db), fr.p(s0, v0, db)], fr.U, mat, C_REVEAL)
    if sides[1]: face_dir([fr.p(s1, v0, d0), fr.p(s1, v1, d0), fr.p(s1, v1, db), fr.p(s1, v0, db)], -fr.U, mat, C_REVEAL)
    if kind == "glass":
        face_dir([fr.p(s0, v0, db), fr.p(s1, v0, db), fr.p(s1, v1, db), fr.p(s0, v1, db)], fr.N, GLASS, C_LEAD)
        if not FAR() and (mull[0] or mull[1]):
            mullions(fr, h, db, mull)
    elif kind == "louvre":
        face_dir([fr.p(s0, v0, db), fr.p(s1, v0, db), fr.p(s1, v1, db), fr.p(s0, v1, db)], fr.N, IRON, C_LOUVRE)
        if not FAR():
            n = max(3, int((v1 - v0) / 0.32))
            for k in range(n):
                vm = v0 + (v1 - v0) * (k + 0.6) / n
                # a slat tilted ~40 deg, spanning the hole (ends on the jambs), from near the back to the front
                a0, a1 = fr.p(s0, vm - 0.13, db + 0.08), fr.p(s0, vm + 0.04, d0 - 0.05)
                b0, b1 = fr.p(s1, vm - 0.13, db + 0.08), fr.p(s1, vm + 0.04, d0 - 0.05)
                th = Vector((0, 0, 0.05))
                face_dir([a0 + th, b0 + th, b1 + th, a1 + th], Z + fr.N * 0.8, CONC, C_LOUVRE)
                face_dir([a0, a1, b1, b0], -Z - fr.N * 0.8, CONC, C_LOUVRE)
                face_dir([a1, b1, b1 + th, a1 + th], fr.N, CONC, C_LOUVRE)
    elif kind == "door":
        door_leaves(fr, s0, s1, v0, v1, db)
    elif kind == "dark":
        face_dir([fr.p(s0, v0, db), fr.p(s1, v0, db), fr.p(s1, v1, db), fr.p(s0, v1, db)], fr.N, IRON, C_LOUVRE)

def mullions(fr, h, db, mull, w=0.09, dep=0.11):
    """the concrete tracery of the big windows: nv vertical + nh horizontal bars on the glass (transoms slightly less
    proud: no coplanar faces where they cross)"""
    s0, v0, s1, v1 = h
    nv, nh = mull
    for k in range(1, nv + 1):
        s = s0 + (s1 - s0) * k / (nv + 1)
        fbox(fr, s - w / 2, s + w / 2, v0, v1, db, db + dep, CONC, C_MULL, skip=("back", "top", "bottom"))
    for k in range(1, nh + 1):
        v = v0 + (v1 - v0) * k / (nh + 1)
        fbox(fr, s0, s1, v - w / 2, v + w / 2, db, db + dep * 0.8, CONC, C_MULL, skip=("back", "left", "right"))

def door_leaves(fr, s0, s1, v0, v1, d):
    """two panelled leaves (dark wood) with a transom light above"""
    vt = v0 + (v1 - v0) * 0.78
    face_dir([fr.p(s0, vt, d), fr.p(s1, vt, d), fr.p(s1, v1, d), fr.p(s0, v1, d)], fr.N, GLASS, C_LEAD)
    face_dir([fr.p(s0, v0, d), fr.p(s1, v0, d), fr.p(s1, vt, d), fr.p(s0, vt, d)], fr.N, WOOD, C_DOOR)
    if FAR(): return
    fbox(fr, s0, s1, vt - 0.06, vt + 0.06, d, d + 0.08, CONC, C_MULL, skip=("back",))
    sm = (s0 + s1) / 2
    fbox(fr, sm - 0.025, sm + 0.025, v0, vt - 0.06, d, d + 0.03, WOOD, C_DOOR, skip=("back", "top"))
    for a, b in ((s0, sm), (sm, s1)):
        for k in range(3):
            pv0 = v0 + 0.25 + k * (vt - v0 - 0.4) / 3; pv1 = pv0 + (vt - v0 - 0.4) / 3 - 0.15
            fbox(fr, a + 0.14, b - 0.14, pv0, pv1, d, d + 0.03, WOOD, C_DOOR, skip=("back",))

def pilaster(fr, s, w, v0, v1, proud=0.3, top_steps=((0.0, 0.0),), wall_top=None):
    """a pilaster box with a stepped crown: top_steps [(inset, rise)]; its back is open against the wall (below
    wall_top) and closed above it (seen from the roof)"""
    fbox(fr, s - w / 2, s + w / 2, v0, v1, 0.0, proud, CONC, C_PIL, skip=("back", "bottom"))
    if wall_top is not None and wall_top < v1:
        face_dir([fr.p(s - w / 2, wall_top), fr.p(s + w / 2, wall_top), fr.p(s + w / 2, v1), fr.p(s - w / 2, v1)], -fr.N, CONC, C_PIL)
    vb = v1
    for inset, rise in top_steps:
        if rise <= 0: continue
        fbox(fr, s - w / 2 + inset, s + w / 2 - inset, vb, vb + rise, 0.0, proud - inset, CONC, C_PIL, skip=("bottom",))
        vb += rise

def hband(fr, s0, s1, v, h=0.16, proud=0.05, code=C_BAND, caps=True):
    """a short horizontal band on a planar wall (chamfered top)"""
    if FAR(): return
    fbox(fr, s0, s1, v - h / 2, v + h / 2, 0.0, proud, CONC, code, skip=("back",) if caps else ("back", "left", "right"))

# ------------------------------------------------------------------------------------------------ curved-wall facets
def arc_info(seg):
    """if the segment lies on one of the plan's circles: (name, centre, r, angle at a, angle at b)"""
    for name, c, r in (("wing", None, WING_R), ("drum", (DRUM_C, 0.0), DRUM_R), ("amb", (AMB_C, 0.0), AMB_R)):
        cs = [c] if c else [(su * WING_C[0], sw * WING_C[1]) for su in (1, -1) for sw in (1, -1)]
        for cc in cs:
            da = math.hypot(seg["a"][0] - cc[0], seg["a"][1] - cc[1]); db = math.hypot(seg["b"][0] - cc[0], seg["b"][1] - cc[1])
            if abs(da - r) < 0.02 and abs(db - r) < 0.02:
                return name, cc, r, math.atan2(seg["a"][1] - cc[1], seg["a"][0] - cc[0]), math.atan2(seg["b"][1] - cc[1], seg["b"][0] - cc[0])
    return None

def in_win(a, wins):
    for w0, w1 in wins:
        if w0 - 1e-6 <= a <= w1 + 1e-6: return (w0, w1)
    return None

def curved_windows(name, c):
    if name == "drum": return [(w0, w1, 108.6, 115.8, (1, 4) if (w1 - w0) > 0.3 else (0, 4)) for w0, w1 in DRUM_WIN]
    if name == "amb": return [(w0, w1, 103.1, 104.55, (1, 0)) for w0, w1 in AMB_WIN]
    if name == "wing":
        su, sw = (1 if c[0] > 0 else -1), (1 if c[1] > 0 else -1)
        base = wing_windows()
        if su > 0: base = [w for w in base if w[0] > math.asin((W_SIDEBLK - WING_C[1]) / WING_R) + 0.03]
        out = []
        for w0, w1 in base:                      # base angles are for the (+u, +w) quadrant (0..90 deg)
            ang = [w0, w1]
            if su < 0: ang = [math.pi - a for a in ang]
            if sw < 0: ang = [-a for a in ang]
            out.append((min(ang), max(ang), 108.6, 110.6, (1, 1)))
        return out
    return []

# ------------------------------------------------------------------------------------------------ the walls
def walls(parts):
    segs = exterior_segments(parts)
    for seg in segs:
        fr, s0, s1, rev = frame_of(seg)
        seg["fr"], seg["s0"], seg["s1"] = fr, s0, s1
        seg["rows"] = []
        ai = arc_info(seg)
        for h0, h1 in seg["ivs"]:
            v0, v1 = hz(h0), hz(h1)
            holes = []
            if ai:
                name, c, r, aa, ab = ai
                hit = None
                for w in curved_windows(name, c):
                    if w[0] - 1e-4 <= (aa + ab) / 2 <= w[1] + 1e-4: hit = w
                if hit and h0 < hit[2] and h1 > hit[3]:
                    holes = [(s0, hz(hit[2]), s1, hz(hit[3]))]
                    bnd = lambda a: min(abs(a - hit[0]), abs(a - hit[1])) < 1e-4
                    curved_opening(c, r, aa, ab, hit, 0.42 if name != "amb" else 0.3, bnd(aa), bnd(ab))
                # every facet of the circle carries the rows of all its windows
                for w in curved_windows(name, c):
                    seg.setdefault("lines", set()).update(x for x in (hz(w[2]), hz(w[3])) if v0 < x < v1)
            else:
                feat = FEATURES.get(feature_key(seg))
                if feat: holes = feat(seg, fr, s0, s1, h0, h1) or []
            seg["rows"].append((v0, v1, holes))
    # groups: segments meeting end to end at < 30 deg
    parent = list(range(len(segs)))
    def find(i):
        while parent[i] != i: parent[i] = parent[parent[i]]; i = parent[i]
        return i
    ends = {}
    for i, sg in enumerate(segs):
        for pt in (sg["a"], sg["b"]): ends.setdefault((round(pt[0], 3), round(pt[1], 3)), []).append(i)
    for idx in ends.values():
        for x in idx:
            for y in idx:
                if x < y and segs[x]["n"][0] * segs[y]["n"][0] + segs[x]["n"][1] * segs[y]["n"][1] > math.cos(math.radians(30)):
                    parent[find(x)] = find(y)
    lines = {}
    for i, sg in enumerate(segs):
        L = lines.setdefault(find(i), set())
        L.update(sg.get("lines", ()))
        for v0, v1, holes in sg["rows"]:
            L.update((v0, v1)); L.update(y for h in holes for y in (h[1], h[3]))
    for i, sg in enumerate(segs):
        extra = lines[find(i)]
        for v0, v1, holes in sg["rows"]:
            ex = [y for y in extra if v0 + 1e-5 < y < v1 - 1e-5]
            if arc_info(sg): wall_grid_curved(sg, sg["fr"], sg["s0"], sg["s1"], v0, v1, holes, ex)
            else: wall_grid(sg["fr"], sg["s0"], sg["s1"], v0, v1, holes, extra=ex)
    return segs

def wall_grid_curved(seg, fr, s0, s1, v0, v1, holes, extra=()):
    """a facet of a curved wall: the same grid, with arc-length UVs (continuous across facets)"""
    ai = arc_info(seg)
    name, c, r, aa, ab = ai
    ua, ub = r * aa, r * ab
    S = [s0, s1]; V = sorted({v0, v1} | {y for h in holes for y in (h[1], h[3]) if v0 < y < v1} | set(extra))
    K.B.new_group()
    for j in range(len(V) - 1):
        cv = (V[j] + V[j + 1]) / 2
        if any(h[1] < cv < h[3] for h in holes): continue
        A, B = fr.p(s0, V[j]), fr.p(s1, V[j]); C, Dd = fr.p(s1, V[j + 1]), fr.p(s0, V[j + 1])
        uA = ua if (fr.s_of(*seg["a"]) - s0) ** 2 < 1e-10 else ub; uB = ub if uA == ua else ua
        face_dir([A, B, C, Dd], fr.N, CONC, C_PLAIN, [(uA, V[j]), (uB, V[j]), (uB, V[j + 1]), (uA, V[j + 1])])

def Qp(c, rr, a, h): return P(c[0] + rr * math.cos(a), c[1] + rr * math.sin(a), h)
def radial(a): return Vector((math.cos(a), -math.sin(a), 0))
def tangent(a): return Vector((-math.sin(a), -math.cos(a), 0))

def curved_opening(c, r, aa, ab, win, depth, jamb_a, jamb_b):
    """one facet (angles aa..ab) of a window in a curved wall, in polar terms so the facets of the reveal, the glass and
    the transoms share their edges exactly (no cracks): sill, head, glass at r - depth, jambs at the window's ends"""
    w0, w1, hs, hh, mull = win
    rd = r - depth
    K.B.new_group()
    face_dir([Qp(c, r, aa, hs), Qp(c, r, ab, hs), Qp(c, rd, ab, hs), Qp(c, rd, aa, hs)], Z, CONC, C_REVEAL)
    face_dir([Qp(c, r, aa, hh), Qp(c, r, ab, hh), Qp(c, rd, ab, hh), Qp(c, rd, aa, hh)], -Z, CONC, C_REVEAL)
    for a, isj in ((aa, jamb_a), (ab, jamb_b)):
        if not isj: continue
        inward = tangent(a) if abs(a - min(w0, w1)) < 1e-4 else -tangent(a)
        face_dir([Qp(c, r, a, hs), Qp(c, r, a, hh), Qp(c, rd, a, hh), Qp(c, rd, a, hs)], inward, CONC, C_REVEAL)
    am = (aa + ab) / 2
    face_dir([Qp(c, rd, aa, hs), Qp(c, rd, ab, hs), Qp(c, rd, ab, hh), Qp(c, rd, aa, hh)], radial(am), GLASS, C_LEAD,
             [(rd * aa, hz(hs)), (rd * ab, hz(hs)), (rd * ab, hz(hh)), (rd * aa, hz(hh))])
    if FAR() or not mull[1]: return
    for k in range(1, mull[1] + 1):              # transoms: a ring of bars on the glass (front 9 cm proud)
        hm = hs + (hh - hs) * k / (mull[1] + 1)
        rf = rd + 0.09
        a0_, b0_ = hm - 0.045, hm + 0.045
        face_dir([Qp(c, rf, aa, a0_), Qp(c, rf, ab, a0_), Qp(c, rf, ab, b0_), Qp(c, rf, aa, b0_)], radial(am), CONC, C_MULL)
        face_dir([Qp(c, rf, aa, b0_), Qp(c, rf, ab, b0_), Qp(c, rd, ab, b0_), Qp(c, rd, aa, b0_)], Z, CONC, C_MULL)
        face_dir([Qp(c, rf, aa, a0_), Qp(c, rf, ab, a0_), Qp(c, rd, ab, a0_), Qp(c, rd, aa, a0_)], -Z, CONC, C_MULL)
    if mull[0]:                                  # a mullion at the window's middle angle (a radial bar, slightly prouder)
        mid = (w0 + w1) / 2
        if min(aa, ab) - 1e-6 <= mid <= max(aa, ab) + 1e-6:
            half = 0.045 / r
            ma, mb = mid - half, mid + half
            rf = rd + 0.11
            face_dir([Qp(c, rf, ma, hs), Qp(c, rf, mb, hs), Qp(c, rf, mb, hh), Qp(c, rf, ma, hh)], radial(mid), CONC, C_MULL)
            face_dir([Qp(c, rf, ma, hs), Qp(c, rf, ma, hh), Qp(c, rd, ma, hh), Qp(c, rd, ma, hs)], -tangent(ma), CONC, C_MULL)
            face_dir([Qp(c, rf, mb, hs), Qp(c, rf, mb, hh), Qp(c, rd, mb, hh), Qp(c, rd, mb, hs)], tangent(mb), CONC, C_MULL)

# ------------------------------------------------------------------------------------------------ features (straight walls)
FEATURES = {}
def feature_key(seg):
    p = seg["part"]["name"]; n = seg["n"]
    d = "+u" if n[0] > 0.9 else "-u" if n[0] < -0.9 else "+w" if n[1] > 0.9 else "-w" if n[1] < -0.9 else "?"
    return f"{p}:{d}"
def feature(*keys):
    def deco(fn):
        for k in keys: FEATURES[k] = fn
        return fn
    return deco

def arm_front(seg, fr, s0, s1, h0, h1, top):
    """an arm's front (entrance, transepts): four pilasters with stepped crowns, three tall recessed windows with a
    concrete grid, two bands across the parapet, a cross in relief at the top (photos: c01 / c02 / c10 / c11 / c17)"""
    if s1 - s0 < 8: return []
    sm = (s0 + s1) / 2
    win_top = top - 2.3; win_bot = TOPS["porch"] + 0.65
    holes = []
    for k, (c, w) in enumerate(((-3.1, 1.5), (0.0, 1.9), (3.1, 1.5))):
        h = (sm + c - w / 2, hz(win_bot), sm + c + w / 2, hz(win_top))
        holes.append(h)
        opening(fr, h, 0.45, "glass", (2, 5))
        if not FAR(): fbox(fr, h[0] - 0.12, h[2] + 0.12, h[1] - 0.22, h[1], 0.0, 0.12, CONC, C_SILL, skip=("back",))
    for c, pw in ((-4.35, 0.7), (-1.6, 0.8), (1.6, 0.8), (4.35, 0.7)):     # the outer ones stay over the porch (|s| <= 4.7)
        pilaster(fr, sm + c, pw, hz(h0), hz(top + 0.3), 0.32, ((0.12, 0.3), (0.24, 0.2)) if not FAR() else ((0.12, 0.4),), wall_top=hz(top))
    if not FAR():
        for v in (top - 1.55, top - 1.2):
            for a, b in ((-4.0, -2.0), (-1.2, 1.2), (2.0, 4.0)):
                hband(fr, sm + a, sm + b, hz(v), 0.12, 0.04)
        # the cross in relief over the middle light
        fbox(fr, sm - 0.17, sm + 0.17, hz(top - 2.0), hz(top + 0.55), 0.0, 0.1, CONC, C_RELIEF, skip=())
        fbox(fr, sm - 0.62, sm + 0.62, hz(top - 0.85), hz(top - 0.5), 0.0, 0.085, CONC, C_RELIEF, skip=("back",))
    return holes

@feature("arm_e:-u")
def f_entrance(seg, fr, s0, s1, h0, h1):
    return arm_front(seg, fr, s0, s1, h0, h1, TOPS["arm"])

@feature("tr+1:+w", "tr-1:-w")
def f_transept(seg, fr, s0, s1, h0, h1):
    if s1 - s0 < 8: return []
    return arm_front(seg, fr, s0, s1, h0, h1, TOPS["transept"])

def porch_front(seg, fr, s0, s1, h0, h1):
    """the porch: a wide doorway (two leaves, transom light), a carved panel above, two small windows, a slab cornice"""
    sm = (s0 + s1) / 2
    (u, w) = ((seg["a"][0] + seg["b"][0]) / 2, (seg["a"][1] + seg["b"][1]) / 2)
    g = G(u + seg["n"][0] * 1.0, w + seg["n"][1] * 1.0)
    thr = max(PLINTH_TOP + 0.02, g + 0.3)
    dh = (sm - 1.3, hz(thr), sm + 1.3, hz(thr + 3.3))
    opening(fr, dh, 0.55, "door")
    holes = [dh]
    if not FAR():
        fbox(fr, sm - 1.6, sm + 1.6, hz(thr + 3.55), hz(thr + 4.25), 0.0, 0.06, CONC, C_RELIEF, skip=("back",))
        steps(fr, sm, 3.4, g, thr)
    for c in (-3.2, 3.2):
        if abs(c) + 0.5 < (s1 - s0) / 2:
            h = (sm + c - 0.45, hz(103.2), sm + c + 0.45, hz(104.9))
            holes.append(h); opening(fr, h, 0.3, "glass", (1, 1))
    return holes

def steps(fr, sm, width, g, thr):
    """steps from the ground up to a threshold: boxes whose feet go 0.4 m into the ground (the JOINS rule)"""
    n = max(1, round((thr - g) / 0.16))
    rise = (thr - g) / n
    for k in range(n):
        top = thr - k * rise
        depth = 0.35 * (k + 1)
        fbox(fr, sm - width / 2 - 0.1 * k, sm + width / 2 + 0.1 * k, hz(g - 0.4), hz(top), 0.0, depth, STONE, C_STEP, skip=("back", "bottom"))

@feature("porch_e:-u", "porch_t+1:+w", "porch_t-1:-w")
def f_porch_front(seg, fr, s0, s1, h0, h1):
    if s1 - s0 < 5: return []
    return porch_front(seg, fr, s0, s1, h0, h1)

@feature("porch_e:+w", "porch_e:-w", "porch_t+1:+u", "porch_t+1:-u", "porch_t-1:+u", "porch_t-1:-u")
def f_porch_side(seg, fr, s0, s1, h0, h1):
    if s1 - s0 < 2.0: return []
    sm = (s0 + s1) / 2
    h = (sm - 0.45, hz(103.2), sm + 0.45, hz(104.9))
    opening(fr, h, 0.3, "glass", (1, 1))
    return [h]

@feature("cp+1:-u", "cp-1:-u")
def f_corner_pier(seg, fr, s0, s1, h0, h1):
    """the entrance front's corner piers: a tall slit light, three horizontal ribs at the crown (c11)"""
    sm = (s0 + s1) / 2
    h = (sm - 0.25, hz(103.0), sm + 0.25, hz(114.4))
    opening(fr, h, 0.35, "glass", (0, 6))
    return [h]

@feature("tr+1:+u", "tr+1:-u", "tr-1:+u", "tr-1:-u", "arm_e:+w", "arm_e:-w", "arm_a:+w", "arm_a:-w")
def f_arm_side(seg, fr, s0, s1, h0, h1):
    """the arms' long sides above the wings: tall narrow clerestory lights where the wall is tall enough"""
    if h1 - h0 < 6.0 or s1 - s0 < 2.5: return []
    holes = []
    n = int((s1 - s0) / 2.4)
    for k in range(n):
        sm = s0 + (s1 - s0) * (k + 0.5) / n
        h = (sm - 0.3, hz(h0 + 1.0), sm + 0.3, hz(h1 - 1.2))
        holes.append(h); opening(fr, h, 0.35, "glass", (0, 3))
    return holes

@feature("side+1:+w", "side-1:-w")
def f_side_block(seg, fr, s0, s1, h0, h1):
    holes = []
    for k in range(2):
        sm = s0 + (s1 - s0) * (k + 0.5) / 2
        h = (sm - 0.45, hz(106.5), sm + 0.45, hz(107.9))
        holes.append(h); opening(fr, h, 0.3, "glass", (1, 1))
    return holes

# the tower
def tower_lights(fr, sm, n, lw, mw, v0, v1, depth=0.45):
    """n tall lights of width lw between concrete mullion piers of width mw, set in one recess"""
    W = n * lw + (n - 1) * mw
    holes = []
    for k in range(n):
        a = sm - W / 2 + k * (lw + mw)
        h = (a, hz(v0), a + lw, hz(v1))
        holes.append(h); opening(fr, h, depth, "glass", (0, 7 if not FAR() else 0))
    if not FAR():
        fbox(fr, sm - W / 2 - 0.2, sm + W / 2 + 0.2, hz(v0) - 0.25, hz(v0), 0.0, 0.14, CONC, C_SILL, skip=("back",))
    return holes

def louvres(fr, centres, w, v0, v1):
    holes = []
    for c in centres:
        h = (c - w / 2, hz(v0), c + w / 2, hz(v1))
        holes.append(h); opening(fr, h, 0.55, "louvre")
    return holes

@feature("pier-:-u")
def f_pier_entrance(seg, fr, s0, s1, h0, h1):
    sm = (s0 + s1) / 2
    holes = tower_lights(fr, sm, 3, 0.8, 0.32, 122.0, 132.4)
    holes += louvres(fr, (sm - 0.95, sm + 0.95), 1.4, 134.1, 136.7)
    if not FAR(): ribs(fr, s0, s1, (137.6, 137.95, 138.3))
    return holes

@feature("pier+:+u")
def f_pier_apse(seg, fr, s0, s1, h0, h1):
    """the apse side (c09): three lights low, a small square window, the winged relief"""
    sm = (s0 + s1) / 2
    holes = tower_lights(fr, sm, 3, 0.7, 0.3, 121.6, 127.4)
    h = (sm - 0.45, hz(129.4), sm + 0.45, hz(130.3)); holes.append(h); opening(fr, h, 0.35, "glass", (1, 1))
    if not FAR():
        wings(fr, sm, hz(134.6))
        ribs(fr, s0, s1, (137.6, 137.95, 138.3))
    return holes

def wings(fr, sm, v):
    """the Art Deco winged relief: a chevron of stepped feathers either side of a small block (c09, c11, c17)"""
    fbox(fr, sm - 0.35, sm + 0.35, v - 0.9, v + 0.4, 0.0, 0.16, CONC, C_RELIEF, skip=("back",))
    for side in (-1, 1):
        for k in range(5):
            x0 = sm + side * (0.35 + 0.0); x1 = sm + side * (0.75 + 0.22 * k)
            y = v + 0.32 - k * 0.2
            fbox(fr, min(x0, x1), max(x0, x1), y - 0.07, y + 0.07, 0.0, 0.12 - 0.012 * k, CONC, C_RELIEF, skip=("back",))

def ribs(fr, s0, s1, vs, proud=0.06):
    for v in vs: hband(fr, s0, s1, hz(v), 0.14, proud, caps=True)

@feature("pier-:+w", "pier-:-w", "pier+:+w", "pier+:-w")
def f_pier_side(seg, fr, s0, s1, h0, h1):
    sm = (s0 + s1) / 2
    h = (sm - 0.18, hz(123.0), sm + 0.18, hz(134.0))
    opening(fr, h, 0.3, "glass", (0, 6))
    return [h]

@feature("shoulder+:+w", "shoulder-:-w")
def f_shoulder(seg, fr, s0, s1, h0, h1):
    sm = (s0 + s1) / 2
    holes = tower_lights(fr, sm, 4, 0.66, 0.28, 121.8, 130.4)
    if not FAR(): ribs(fr, s0, s1, (131.35, 131.7, 132.05))
    return holes

@feature("shoulder+:+u", "shoulder+:-u", "shoulder-:+u", "shoulder-:-u")
def f_shoulder_end(seg, fr, s0, s1, h0, h1):
    sm = (s0 + s1) / 2
    return louvres(fr, (sm,), 0.95, 128.4, 130.9)

@feature("core:+w", "core:-w")
def f_core_w(seg, fr, s0, s1, h0, h1):
    if h1 < 139 or s1 - s0 < 5: return []
    sm = (s0 + s1) / 2
    return louvres(fr, (sm - 1.3, sm + 1.3), 1.5, 134.6, 137.4)

@feature("core:+u", "core:-u")
def f_core_u(seg, fr, s0, s1, h0, h1):
    if h1 - h0 < 10 or s1 - s0 > 1.5: return []
    sm = (s0 + s1) / 2
    h = (sm - 0.2, hz(124.0), sm + 0.2, hz(137.0))
    opening(fr, h, 0.3, "glass", (0, 7))
    return [h]

@feature("lantern_u:+u", "lantern_u:-u")
def f_lantern_slot(seg, fr, s0, s1, h0, h1):
    sm = (s0 + s1) / 2
    h = (sm - 0.17, hz(145.3), sm + 0.17, hz(147.9))
    opening(fr, h, 0.3, "dark")
    return [h]

# ------------------------------------------------------------------------------------------------ roofs, copings, bands
COPING = {
    "std": [(-0.32, 0.0), (-0.32, 0.15), (0.06, 0.15), (0.08, 0.13), (0.08, -0.16), (-0.012, -0.16)],
    "slab": [(-0.32, 0.0), (-0.32, 0.14), (0.42, 0.14), (0.45, 0.11), (0.45, -0.14), (0.42, -0.17), (-0.012, -0.17)],
    "slab_s": [(-0.3, 0.0), (-0.3, 0.12), (0.24, 0.12), (0.27, 0.09), (0.27, -0.12), (0.24, -0.15), (-0.012, -0.15)],
    "far": [(-0.3, 0.0), (-0.3, 0.13), (0.08, 0.13), (0.08, -0.15), (-0.012, -0.15)],
}

def simplify(pts, closed):
    """drop the vertices where the path goes straight on (pieces split by neighbours), keep corners and arc facets"""
    out = list(pts)
    changed = True
    while changed and len(out) > (3 if closed else 2):
        changed = False
        n = len(out)
        rng = range(n) if closed else range(1, n - 1)
        for i in rng:
            a, b, c = out[i - 1], out[i], out[(i + 1) % n]
            d1 = (b[0] - a[0], b[1] - a[1]); d2 = (c[0] - b[0], c[1] - b[1])
            l1, l2 = math.hypot(*d1), math.hypot(*d2)
            if l1 < 1e-6 or l2 < 1e-6 or abs(d1[0] * d2[1] - d1[1] * d2[0]) / (l1 * l2) < 0.002 and d1[0] * d2[0] + d1[1] * d2[1] > 0:
                out.pop(i); changed = True; break
    return out

def closed_path(path):
    """a closed sweep path starting at the middle of its first edge (sweep3d mitres interior points only)"""
    m = (path[0] + path[1]) / 2
    return [m] + path[1:] + [path[0], m]

def chains(segs, pred, across=False):
    """consecutive segments (same part + loop, or any part when `across`, sharing end points) satisfying pred -> paths of
    (u, w) points; closed?"""
    by = {}
    for s in segs:
        if pred(s): by.setdefault(0 if across else (id(s["part"]), s["li"]), []).append(s)
    out = []
    for key, ss in by.items():
        ss = list(ss)
        while ss:
            cur = [ss.pop(0)]
            grown = True
            while grown:
                grown = False
                for s in list(ss):
                    if math.dist(s["a"], cur[-1]["b"]) < 1e-4 and s["n"] and same_dir(s, cur[-1]):
                        cur.append(s); ss.remove(s); grown = True
                    elif math.dist(s["b"], cur[0]["a"]) < 1e-4 and same_dir(s, cur[0]):
                        cur.insert(0, s); ss.remove(s); grown = True
            pts = [cur[0]["a"]] + [s["b"] for s in cur]
            closed = math.dist(pts[0], pts[-1]) < 1e-4
            out.append((pts[:-1] if closed else pts, closed, cur))
    return out

def same_dir(s, t): return True

def oriented(pts, segs):
    """the sweep's 'right' side must be OUTWARD: reverse the path if the first segment's outward normal is on its left"""
    a, b = pts[0], pts[1]
    du, dw = b[0] - a[0], b[1] - a[1]
    n = segs[0]["n"]
    # Blender: P(u, w) = (u, -w); right of the path direction t (with up = Z) is t x Z
    t = Vector((du, -dw, 0)).normalized(); right = t.cross(Z)
    out = Vector((n[0], -n[1], 0))
    return pts if right.dot(out) > 0 else pts[::-1]

def copings(parts, segs):
    for p in parts:
        if not p["coping"]: continue
        prof = COPING["far" if FAR() else p["coping"]]
        top = p["top"]
        for pts, closed, cs in chains(segs, lambda s, p=p: s["part"] is p and abs(s["ivs"][-1][1] - p["top"]) < 1e-6):
            if len(pts) < 2: continue
            fwd = oriented(pts if not closed else pts + [pts[0]], cs)
            if closed: fwd = fwd[:-1] if math.dist(fwd[0], fwd[-1]) < 1e-6 else fwd
            fwd = simplify(fwd, closed)
            path = [P(u, w, top) for u, w in fwd]
            if closed: path = closed_path(path)
            sweep3d(path, prof, Z, CONC, C_COPING, closed=closed, caps=not closed)

BAND_A = [(-0.012, 0.07), (0.05, 0.07), (0.07, 0.05), (0.07, -0.08), (-0.012, -0.08)]
BAND_B = [(-0.012, 0.07), (0.04, 0.07), (0.06, 0.05), (0.06, -0.08), (-0.012, -0.08)]

def bands_at(parts, segs, names, h, prof, code=C_BAND, mat=CONC):
    """a horizontal band along every exterior chain of the named parts whose wall spans height h"""
    for p in parts:
        if p["name"] not in names: continue
        pred = lambda s, p=p: s["part"] is p and any(a + 0.05 < h < b - 0.05 for a, b in s["ivs"])
        for pts, closed, cs in chains(segs, pred):
            if len(pts) < 2: continue
            fwd = oriented(pts if not closed else pts + [pts[0]], cs)
            if closed: fwd = fwd[:-1] if math.dist(fwd[0], fwd[-1]) < 1e-6 else fwd
            fwd = simplify(fwd, closed)
            path = [P(u, w, h) for u, w in fwd]
            if closed: path = closed_path(path)
            sweep3d(path, prof, Z, mat, code, closed=closed, caps=not closed)

def roofs(parts):
    from mathutils.geometry import tessellate_polygon
    for p in parts:
        if p["no_top"]: continue
        loops = p["loops"] + p["roof_holes"]
        K.B.new_group()
        flat = [q for l in loops for q in l]
        for t in tessellate_polygon([[Vector((u, -w, 0)) for u, w in l] for l in loops]):
            a, b, c = (P(*flat[i], p["top"]) for i in t)
            if ((b - a).cross(c - a)).length < 1e-9: continue
            mat = CONC if "cross" in p["tags"] else ROOF
            face_dir([a, b, c], Z, mat, C_CROSS if "cross" in p["tags"] else C_PLAIN)
        if p["bottom"] > HB + 1 and not p["no_bottom"]:
            for t in tessellate_polygon([[Vector((u, -w, 0)) for u, w in l] for l in p["loops"]]):
                a, b, c = (P(*flat[i], p["bottom"]) for i in t)
                if ((b - a).cross(c - a)).length < 1e-9: continue
                face_dir([a, b, c], -Z, CONC, C_SOFFIT)

def plinth(segs):
    if FAR(): return
    prof = [(-0.012, 0.0), (0.03, 0.0), (0.06, -0.03), (0.06, -(PLINTH_TOP - HB) + 0.02), (-0.012, -(PLINTH_TOP - HB) + 0.02)]
    for pts, closed, cs in chains(segs, lambda s: abs(s["ivs"][0][0] - HB) < 1e-6 and s["part"]["bottom"] == HB, across=True):
        if len(pts) < 2: continue
        fwd = oriented(pts if not closed else pts + [pts[0]], cs)
        if closed: fwd = fwd[:-1] if math.dist(fwd[0], fwd[-1]) < 1e-6 else fwd
        fwd = simplify(fwd, closed)
        path = [P(u, w, PLINTH_TOP) for u, w in fwd]
        if closed: path = closed_path(path)
        sweep3d(path, prof, Z, STONE, C_PLINTH, closed=closed, caps=not closed)

def wing_details(parts):
    """the quadrant wings (c10, c11, c17): the corbelled sill band under the window ring, a thin band over it"""
    if FAR(): return
    for su in (1, -1):
        for sw in (1, -1):
            c = (su * WING_C[0], sw * WING_C[1])
            wins = sorted(curved_windows("wing", c))
            a0, a1 = wins[0][0] - 0.05, wins[-1][1] + 0.05
            pts = arc(c, WING_R, a0, a1, math.radians(3.6))
            for h, prof in ((108.42, [(-0.012, 0.03), (0.12, 0.03), (0.14, 0.01), (0.14, -0.15), (-0.012, -0.15)]),
                            (111.05, [(-0.012, 0.06), (0.04, 0.06), (0.06, 0.04), (0.06, -0.08), (-0.012, -0.08)])):
                path = [P(u, w, h) for u, w in pts]
                # outward = away from the centre: make the path run so its right side faces out
                t = (path[1] - path[0]).normalized(); out = (path[0] - P(c[0], c[1], h)); out.z = 0
                if t.cross(Z).dot(out) < 0: path = path[::-1]
                sweep3d(path, prof, Z, CONC, C_SILL if h < 110 else C_BAND, caps=True)
            # corbels under the piers between the windows
            for i in range(len(wins) - 1):
                am = (wins[i][1] + wins[i + 1][0]) / 2
                cu, cw_ = c[0] + WING_R * math.cos(am), c[1] + WING_R * math.sin(am)
                n = (math.cos(am), math.sin(am))
                fr = Frame(P(cu, cw_, OY), Vector((n[0], -n[1], 0)))
                fbox(fr, -0.13, 0.13, hz(107.85), hz(108.27), -0.01, 0.12, CONC, C_SILL, skip=("back", "top"))

def railing():
    """the tower terrace's iron railing (photos c01, c15: a light balustrade round the top at 139.5)"""
    if FAR(): return
    h0 = TOPS["core"]
    e = TC - 0.45
    corners = [(-e, -e), (e, -e), (e, e), (-e, e)]
    for i in range(4):
        a, b = corners[i], corners[(i + 1) % 4]
        L = math.dist(a, b); n = int(L / 1.1)
        for k in range(n):
            t = k / n; u, w = a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t
            rod(P(u, w, h0 - 0.03), P(u, w, h0 + 1.1), 0.025, IRON, C_RAIL, segs=6)
        for hh in ((h0 + 1.08, h0 + 0.6) if i % 2 == 0 else (h0 + 1.095, h0 + 0.615)):
            rod(P(a[0], a[1], hh), P(b[0], b[1], hh), 0.02 if hh < h0 + 1.0 else 0.03, IRON, C_RAIL, segs=6)

def the_cross():
    """the cross on the pedestal (UrbIS 150.46 -> 154.70; the shaft 0.76 m square is the solid's top face); the arms
    across w (seen frontal from the axis, edge-on from the sides: photos c09 / c15 vs c01): estimated 2.6 m span"""
    fr = Frame(P(0.38, 0.0, OY), Vector((1, 0, 0)))
    fbox(fr, -1.3, -0.38, hz(152.75), hz(153.5), -0.76, 0.0, CONC, C_CROSS, skip=("right",))
    fbox(fr, 0.38, 1.3, hz(152.75), hz(153.5), -0.76, 0.0, CONC, C_CROSS, skip=("left",))

def lantern_fins(parts, segs):
    """the stacked horizontal fins on the lantern's rounded corner posts (c11, c15)"""
    if FAR(): return
    names = [p["name"] for p in parts if p["name"].startswith("post")]
    for k in range(7):
        h = L_A_TOP + 0.35 + k * 0.45
        bands_at(parts, segs, names, h, [(-0.012, 0.06), (0.09, 0.06), (0.12, 0.03), (0.12, -0.03), (0.09, -0.06), (-0.012, -0.06)], C_BAND)

def downpipes():
    if FAR(): return
    for su in (1, -1):
        for sw in (1, -1):
            for ang in (D(2.5), D(87.5)):
                a = ang if su > 0 else math.pi - ang
                a = a if sw > 0 else -a
                c = (su * WING_C[0], sw * WING_C[1])
                r = WING_R + 0.11
                u, w = c[0] + r * math.cos(a), c[1] + r * math.sin(a)
                top = P(u, w, TOPS["wing"] - 0.17)
                rod(P(u, w, G(u, w) - 0.3), top, 0.055, IRON, C_RAIL, segs=8)

def build_all():
    parts = build_plan(K.FAR)
    segs = walls(parts)
    roofs(parts)
    copings(parts, segs)
    plinth(segs)
    if not K.FAR:
        bands_at(parts, segs, ["cp+1", "cp-1"], 115.3, BAND_A)
        bands_at(parts, segs, ["cp+1", "cp-1"], 115.7, BAND_A)
        bands_at(parts, segs, ["crossing"], 119.6, BAND_B)
        bands_at(parts, segs, ["drum"], 116.2, BAND_B)
    wing_details(parts)
    railing()
    the_cross()
    lantern_fins(parts, segs)
    downpipes()
    return parts

PARTS = build_all()
B_MAIN = K.B
print(f"LOD0: {len(B_MAIN.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = True
build_all()
B_FAR = K.B
K.FAR = False
print(f"far: {len(B_FAR.f)} faces")

# ------------------------------------------------------------------------------------------------ mesh
bpy.ops.wm.read_factory_settings(use_empty=True)
scn = bpy.context.scene
mats = []
for name in SLOTS:
    m = bpy.data.materials.new(name); m.use_nodes = True; mats.append(m)
AO_SPLIT = 0.86
obj, ntri, per_slot, thin0 = SC.make_object(scn, mats, SLOTS, "Augustin", B_MAIN, 0.0, AO_SPLIT, AO_PX)
far, ntri_far, per_slot_far, thin1 = SC.make_object(scn, mats, SLOTS, "Augustin_far", B_FAR, AO_SPLIT + 0.005, 1.0, AO_PX)
print(f"uv done {time.time() - T0:.1f}s")

# ------------------------------------------------------------------------------------------------ ground (bake occluder + previews)
def load_ground():
    import numpy as np
    g = _g
    a = np.fromfile(os.path.join(OUT, "site_dtm.bin"), dtype="<u2").reshape(g["rows"], g["cols"]).astype(np.float64) / 100 + g["base"]
    st = 2
    a = a[::st, ::st]; step = g["step"] * st
    rows, cols = a.shape
    verts = []
    for r in range(rows):
        for c in range(cols):
            x, z = g["x0"] + c * step, g["z0"] + r * step
            u, w = G.local(x, z)
            verts.append((u, -w, a[r, c] - OY - 0.02))
    faces = [(r * cols + c, r * cols + c + 1, (r + 1) * cols + c + 1, (r + 1) * cols + c) for r in range(rows - 1) for c in range(cols - 1)]
    gm = bpy.data.meshes.new("Ground"); gm.from_pydata(verts, [], faces); gm.update()
    for p in gm.polygons:
        if p.normal.z < 0: p.flip()
    gm.update()
    go = bpy.data.objects.new("Ground", gm); scn.collection.objects.link(go)
    gmat = bpy.data.materials.new("GroundMat"); gmat.use_nodes = True
    gmat.node_tree.nodes["Principled BSDF"].inputs["Base Color"].default_value = (0.12, 0.16, 0.08, 1)
    gm.materials.append(gmat)
    return go
ground_obj = load_ground()

# ------------------------------------------------------------------------------------------------ AO bake (lighting only)
scn.render.engine = "CYCLES"
scn.cycles.device = "CPU"
if scn.world is None: scn.world = bpy.data.worlds.new("World")
scn.world.light_settings.distance = 4.0
ao_img = bpy.data.images.new("augustin_ao", AO_PX, AO_PX, alpha=False, float_buffer=False)
ao_img.colorspace_settings.name = "Non-Color"
for m in mats:
    nt = m.node_tree
    n = nt.nodes.new("ShaderNodeTexImage"); n.image = ao_img; n.name = "AO"; nt.nodes.active = n

def vertex_ao(o, thin):
    me = o.data
    aov = me.color_attributes.new("AOv", "FLOAT_COLOR", "CORNER")
    me.color_attributes.active_color = aov
    for x in scn.objects: x.select_set(False)
    o.select_set(True); bpy.context.view_layer.objects.active = o
    try:
        bpy.ops.object.bake(type="AO", target="VERTEX_COLORS")
    except Exception as e:
        print("vertex AO bake failed:", e); me.color_attributes.remove(aov); return
    a = [0.0] * (4 * len(me.loops)); aov.data.foreach_get("color", a)
    col = me.color_attributes["Col"]; c = [0.0] * (4 * len(me.loops)); col.data.foreach_get("color", c)
    n_set = 0
    for p in me.polygons:
        if not thin[p.index]: continue
        for li in p.loop_indices:
            c[4 * li + 1] = max(0.25, min(1.0, a[4 * li])); n_set += 1
    col.data.foreach_set("color", c)
    me.color_attributes.active_color = col
    me.color_attributes.remove(me.color_attributes["AOv"])
    print(f"  vertex AO: {n_set} corners of thin faces")

if BAKE:
    scn.cycles.samples = 96 if "--fast" not in ARGS else 24
    scn.render.threads_mode = "FIXED"; scn.render.threads = max(1, (os.cpu_count() or 4) - 2)   # leave the other agent some CPU
    t = time.time()
    objs = [obj, far]
    for i, target in enumerate(objs):
        for o in objs: o.hide_render = o is not target
        for o in scn.objects: o.select_set(False)
        target.select_set(True); bpy.context.view_layer.objects.active = target
        bpy.ops.object.bake(type="AO", uv_layer="Lightmap", margin=3, use_clear=(i == 0))
    print(f"AO bake {time.time() - t:.1f}s")
    t = time.time()
    for target, th in ((obj, thin0), (far, thin1)):
        for o in objs: o.hide_render = o is not target
        vertex_ao(target, th)
    for o in objs: o.hide_render = False
    print(f"vertex AO {time.time() - t:.1f}s")
    import numpy as np
    px = np.empty(AO_PX * AO_PX * 4, np.float32); ao_img.pixels.foreach_get(px)
    px = px.reshape(AO_PX, AO_PX, 4); px[:, int(0.9945 * AO_PX):, :3] = 1.0
    ao_img.pixels.foreach_set(px.ravel())
    ao_img.filepath_raw = os.path.join(OUT, "augustin_ao.png"); ao_img.file_format = "PNG"
    scn.render.image_settings.color_mode = "BW"
    ao_img.save()
else:
    p = os.path.join(OUT, "augustin_ao.png")
    if os.path.exists(p): ao_img.filepath = p; ao_img.source = "FILE"; ao_img.reload()

# ------------------------------------------------------------------------------------------------ export
for m in mats:
    if "AO" in m.node_tree.nodes: m.node_tree.nodes.remove(m.node_tree.nodes["AO"])
for o in scn.objects: o.select_set(False)
for o in (obj, far): o.select_set(True)
bpy.context.view_layer.objects.active = obj
glb = os.path.join(OUT, "augustin.raw.glb")
bpy.ops.export_scene.gltf(filepath=glb, export_format="GLB", use_selection=True, export_yup=True, export_apply=True,
                          export_texcoords=True, export_normals=True, export_vertex_color="NAME", export_vertex_color_name="Col",
                          export_all_vertex_colors=False, export_materials="EXPORT", export_image_format="NONE", export_extras=False)
print("exported", glb, os.path.getsize(glb) // 1024, "KB")

bx = [p.x for p in B_MAIN.v]; by = [p.y for p in B_MAIN.v]
corners = [G.city(u, -y) for u in (min(bx), max(bx)) for y in (min(by), max(by))]
S_ = SITE["solid"]
info = {
    "asset": "Eglise Saint-Augustin, Place de l'Altitude Cent, Forest (tools/blender/augustin.py)",
    "triangles_lod0": ntri, "triangles_far": ntri_far, "triangles_per_slot_lod0": per_slot, "triangles_per_slot_far": per_slot_far,
    "slots": SLOTS, "codes": {"COLOR_0.r": "code / 16 + 1/32", "COLOR_0.g": "per-vertex AO of the thin faces (1 elsewhere)", "names": CODES},
    "new_slot_names": {"roof_bitumen": "flat roofs: bituminous felt / roofing membrane on the concrete decks (not in the shared library: temporary material)"},
    "uv": {"TEXCOORD_0": "world metres, per face (walls u along / v up; curved walls arc length; swept parts path x profile)", "TEXCOORD_1": "AO lightmap (thin faces: u > 0.994, AO 1)"},
    "lightmap": {"px": AO_PX, "split_v": [AO_SPLIT, 1.0], "lod0_px_per_m": round(obj["px_per_m"], 1), "far_px_per_m": round(far["px_per_m"], 1),
                 "thin_faces_vertex_ao": [obj["thin"], far["thin"]]},
    "frame": "glTF Y up; three.js local (u, m TAW - OY, w); node at the city position of the frame origin, height OY, rotation.y = -rotation",
    "placement": {"city_local_position": [G.ox, OY, G.oz], "rotation_y_rad": -G.rot, "hides_solids": [], "hides_bu_ids": [],
                  "replaces": f"UrbIS solid {S_['id']} ({S_['bu']}): NOT in the city tiles (Forest, outside Uccle: the tiles keep Uccle's buildings only), so nothing is hidden"},
    "bounds_city": {"x": [round(min(c[0] for c in corners), 1), round(max(c[0] for c in corners), 1)],
                    "z": [round(min(c[1] for c in corners), 1), round(max(c[1] for c in corners), 1)],
                    "y": [round(min(p.z for p in B_MAIN.v) + OY, 1), round(max(p.z for p in B_MAIN.v) + OY, 1)]},
    "measured": {"frame": FR, "solid": {k: v for k, v in S_.items() if k != "footprint_city"}, "dsm": SITE["dsm"], "ground_taw": SITE["ground"],
                 "tops_taw": TOPS, "plan": {"entrance_arm_half": AE, "crossing_half": AX, "apse_arm_half": AA, "transept_half": TW,
                 "fronts_u": [U_PORCH, U_FRONT], "transept_fronts_w": [W_TFRONT, W_TPORCH], "wing_circle": [WING_C, WING_R], "drum": [DRUM_C, DRUM_R],
                 "ambulatory": [AMB_C, AMB_R], "tower": {"core_half": TC, "piers": PIER, "shoulders": SHOULDER}}},
    "estimated": "all openings (sizes, heights, counts: from the photos), the pilasters, bands, reliefs (the cross panels, the winged relief), "
                 "the louvres, the lantern's open stage height (144.3) and its fins, the cross arms (span 2.6 m at 152.75-153.5), the floor level "
                 "(101.9), the plinth top (102.55), the porch doors and steps, the railing; the symmetrisation of the solid (<= 0.3 m)",
}
json.dump(info, open(os.path.join(OUT, "augustin.json"), "w"), indent=1)

# ------------------------------------------------------------------------------------------------ previews
if PREVIEWS:
    cols = {"concrete_white": (0.55, 0.5, 0.4), "stone_blue": (0.2, 0.19, 0.17), "roof_bitumen": (0.08, 0.08, 0.08), "glass_window": (0.03, 0.035, 0.04),
            "cast_iron_green": (0.03, 0.03, 0.03), "wood_frame_dark": (0.06, 0.04, 0.03)}
    for m in mats:
        nt = m.node_tree; bsdf = nt.nodes["Principled BSDF"]
        uvn = nt.nodes.new("ShaderNodeUVMap"); uvn.uv_map = "Lightmap"
        tex = nt.nodes.new("ShaderNodeTexImage"); tex.image = ao_img; nt.links.new(uvn.outputs[0], tex.inputs[0])
        mul = nt.nodes.new("ShaderNodeMix"); mul.data_type = "RGBA"; mul.blend_type = "MULTIPLY"; mul.inputs["Factor"].default_value = 0.8
        mul.inputs[6].default_value = (*cols[m.name], 1); nt.links.new(tex.outputs["Color"], mul.inputs[7])
        nt.links.new(mul.outputs[2], bsdf.inputs["Base Color"])
        bsdf.inputs["Roughness"].default_value = 0.1 if m.name == "glass_window" else 0.85
    far.hide_render = True
    sun = bpy.data.lights.new("Sun", "SUN"); sun.energy = 4.0; sun.angle = math.radians(1.5)
    so = bpy.data.objects.new("Sun", sun); scn.collection.objects.link(so)
    so.rotation_euler = (math.radians(50), 0, math.radians(130))
    scn.world.use_nodes = True
    bg = scn.world.node_tree.nodes.get("Background")
    sky = scn.world.node_tree.nodes.new("ShaderNodeTexSky")
    scn.world.node_tree.links.new(sky.outputs[0], bg.inputs[0]); bg.inputs[1].default_value = 0.35
    scn.cycles.samples = 32 if "--fast" not in ARGS else 12; scn.cycles.use_denoising = True
    scn.render.image_settings.color_mode = "RGB"
    scn.view_settings.view_transform = "AgX"; scn.view_settings.exposure = -1.0
    cam_d = bpy.data.cameras.new("Cam"); cam = bpy.data.objects.new("Cam", cam_d); scn.collection.objects.link(cam); scn.camera = cam
    def look(name, pos, tgt, lens=28, res=(900, 1100)):
        cam.location = P(*pos); tg = P(*tgt)
        cam.rotation_euler = (tg - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_d.lens = lens
        scn.render.resolution_x, scn.render.resolution_y = res
        os.makedirs(PREV, exist_ok=True); scn.render.filepath = os.path.join(PREV, f"preview_{name}.png")
        t = time.time(); bpy.ops.render.render(write_still=True); print("render", name, f"{time.time() - t:.0f}s")
    only = [a.split("=", 1)[1] for a in ARGS if a.startswith("--only=")]
    views = {
        "entrance": ((-62.0, 0.0, 103.5), (0.0, 0.0, 122.0), 30),
        "transept": ((0.0, 60.0, 103.5), (0.0, 0.0, 122.0), 30),
        "apse": ((62.0, 0.0, 103.5), (0.0, 0.0, 122.0), 30),
        "diagonal": ((-40.0, 42.0, 103.0), (0.0, 0.0, 120.0), 28),
        "aerial": ((-55.0, 55.0, 160.0), (0.0, 0.0, 115.0), 30),
        "tower": ((-22.0, 14.0, 112.0), (0.0, 0.0, 140.0), 32),
    }
    for k, (pos, tgt, lens) in views.items():
        if only and k not in only[0].split(","): continue
        look(k, pos, tgt, lens, (900, 1100) if k not in ("aerial",) else (1100, 850))
print(f"done {time.time() - T0:.1f}s")
