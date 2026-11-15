"""EGLISE SAINT-MARC / SINT-MARKUSKERK (Avenue De Fre 76, Uccle; wikidata Q62570700; inaugurated 6 June 1970, renovated
2002): the scripted landmark, built in code from MEASURED data (UrbIS solid 548515 + DSM / DTM 2021, OSM way 225781790)
and the Street View front (2009 and 2024, looked at only; docs/landmarks/SAINTMARC.md).

    "C:/Program Files/Blender Foundation/Blender 5.0/blender.exe" --factory-startup -b -P tools/blender/saintmarc.py -- models/saintmarc [--no-bake] [--fast] [--previews] [--views=a,b] [--checker] [--level=1]

THE CHURCH (nl.wikipedia "Sint-Markuskerk (Ukkel)": brick, on a square plan; the roof's four surfaces curve upward to the
centre, the two front ones lower than the two rear ones, the gap between them closed by a glass wall). Frame
(tools/landmark5_measure.py): u from the entrance front on Avenue De Fre (south) to the back (north), w to the EAST.
MEASURED: the box (UrbIS u -5.3..26.2, w -18.4..13.1; OSM ground floor u 0 / 5.1, walls w -17.6 / 12.2) and its rim
76.18 (UrbIS, 222 vertices; DSM 76.1-76.4 all round), the roof (DSM: the rear apex 85.4 at u 5.5, w -2.5, falling 0.49 m
per m to the back along the axis; the front surfaces 76.2 -> 80.4 at the glass wall; both families concave: rounded-
diamond contours, fitted with a superellipse p 1.6), the overhang's underside 69.92 over the entrance (UrbIS), the east
annex (UrbIS 75.08, u 2.85-22.89, w 13.1-17.2), the ground (DTM 67.5-68.4).
FROM THE PHOTOS (Street View 2009 / 2024): the brown-grey brick, the blank upper front cantilevered over the recessed
glazed entrance on square concrete columns, the concrete band under the brick, the dark metal cross right of the centre,
the clerestory: a band of vertical glazing under the rear roof's chevron overhang with its dark fascia, grey metal roofs.
ESTIMATED: every opening of the side and back walls and of the annex (not visible from the street), the columns' count
and spacing, the entrance screen's division, the cross's size (+-0.3 m), the floor level.
"""
import bpy, math, os, sys, json, time
from mathutils import Vector
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import stpierre_common as SC
import church_kit as CK
from stpierre_common import (K, P, hz, Z, fill2d, strip2d, rect, fbox, wbox, bar, face_dir, face_up, quad, ccw, OY)
from church_kit import (Seg, vwall, rect_window, roof_poly, ring_prism, rodc, iron_cross, offset_uw, ccw_uw, flat_group, segs,
                        FAR, XFAR, C_PLAIN, C_COPING, C_SUR, C_CORN, C_BAND, C_SILL, C_SCULPT, C_RIDGE, C_GUTTER, C_DOOR,
                        C_FRAME, C_LEAD)

ARGS = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
OUT = os.path.abspath(ARGS[0] if ARGS and not ARGS[0].startswith("--") else "models/saintmarc")
PREV = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "..", "docs", "landmarks", "landmark5")
T0 = time.time()
SITE, _g, _gd = SC.load_site(OUT)
G = SC.Ground(SITE, _g, _gd)
SLOTS = ["brick_dark", "stone_blue", "zinc_roof", "concrete_white", "wood_oak", "glass_window", "cast_iron_green"]
BRICK, BLUE, ROOF, CONC, WOOD, GLASS, IRON = range(7)

# ------------------------------------------------------------------------------------------------ THE PLAN (measured)
HB = 66.9; CK.KIT.HB = HB               # walls go this far down (DTM round the walls 67.5-68.4)
FLOOR = 68.45                           # the entrance floor (estimated: the DTM before the doors 68.2-68.4)
UF, UB, WW, WE = -5.0, 25.5, -17.8, 12.6    # the brick box's walls (UrbIS -5.3 / 26.2, -18.4 / 13.1 with the coping; OSM 12.2-12.5)
RIM = 76.05                             # wall tops under the coping (UrbIS rim 76.18, DSM 76.1-76.4)
COPE = 76.25
SOFFIT, BAND_TOP = 70.55, 71.25         # the overhang's underside (UrbIS 69.92 is its lowest LoD2 face) and the concrete band
U_GF, W_PORCH = 0.0, -13.0              # the ground-floor glazed front (OSM u 0, w -13 .. 12.9) and the west porch's side
U_PB = 5.1                              # the west porch's back wall (OSM)
WC = -2.5                               # the roof's axis (DSM apex w -2.2 .. -2.5)
U_GLASS, U_OVER = 4.8, 3.9              # the clerestory wall and the rear roof's front edge (the chevron overhang)
APEX_U, APEX_H = 5.5, 85.4              # the rear apex (DSM 85.2-85.6 at u 5-6)
FRONT_H = 80.4                          # the front surfaces at the glass wall (DSM 80.35 at u 3.75, axis)
P_SE = 1.6                              # the superellipse of the concave surfaces (rounded diamonds; DSM contours)
ANNEX = (2.9, 22.9, WE, 15.1, 75.0)     # the east annex (UrbIS 75.08)
TH = 0.16                               # roof slab thickness

def t_rear(u, w):
    a = max(u - APEX_U, 0.0) / (UB - 0.3 - APEX_U); b = abs(w - WC) / (WE - WC - 0.1 if w > WC else WC - WW - 0.1)
    return (a ** P_SE + b ** P_SE) ** (1 / P_SE)
def t_front(u, w):
    a = max(U_GLASS - u, 0.0) / (U_GLASS - UF); b = abs(w - WC) / (WE - WC - 0.1 if w > WC else WC - WW - 0.1)
    return (a ** P_SE + b ** P_SE) ** (1 / P_SE)
LOW = RIM - 0.08                        # the roofs' lowest (hidden behind the coping)
def soft(x, k=0.18):
    """the surfaces run out onto the rim level smoothly (no crease where they meet it, no planar cells with bent normals)"""
    d = (x - LOW) / k
    return LOW + (k * (d + math.log1p(math.exp(-d))) if d > 0 else k * math.log1p(math.exp(d)))
def h_rear(u, w): return soft(RIM + (APEX_H - RIM) * (1 - t_rear(u, w)))
def h_front(u, w): return soft(RIM + (FRONT_H - RIM) * (1 - t_front(u, w)))

# ------------------------------------------------------------------------------------------------ surfaces
def grid_vals(u0, u1, w0, w1, du, dw, crease, extra_u=()):
    us = [u0 + (u1 - u0) * i / max(1, round((u1 - u0) / du)) for i in range(max(1, round((u1 - u0) / du)) + 1)]
    for e in extra_u:
        us = sorted([u for u in us if abs(u - e) > 0.25] + [e])
    ws = sorted(set([w0 + (w1 - w0) * j / max(1, round((w1 - w0) / dw)) for j in range(max(1, round((w1 - w0) / dw)) + 1)] + [crease]))
    ws = [w for w in ws if w0 - 1e-6 <= w <= w1 + 1e-6]
    clean = [ws[0]]
    for w in ws[1:]:
        if w - clean[-1] > 0.2: clean.append(w)
        elif abs(w - crease) < 1e-6: clean[-1] = w
    return us, clean

def overhang_ok(w):
    """the chevron overhang (and its fascia, underside, glass under it) only where the rear roof stands clear of the front
    surfaces: elsewhere the rear roof starts at the glass line"""
    return h_rear(U_OVER, w) >= h_front(U_GLASS, w) + 0.45

def surface(u0, u1, w0, w1, hfun, du, dw, mat=ROOF, under=None, edges=("u0", "u1", "w0", "w1"), skip_flat_below=None, trim=None):
    """a curved roof surface over the (u, w) rectangle: a grid (one row on the crease w = WC) at h = hfun; its thickness
    TH as side faces on the listed edges; an underside where u < `under` (the overhang); flat cells (all four corners at
    the lowest level) are one construction group (flat), the curved cells another (smooth within, sharp at the crease)"""
    us, ws = grid_vals(u0, u1, w0, w1, du, dw, WC, extra_u=(trim,) if trim else ())
    H = [[hfun(u, w) for w in ws] for u in us]
    K.B.new_group(); g_curve = K.B.grp; flat_group()     # flat shaded: a curved zinc roof is laid in planar strips
    flat_cells = []
    for i in range(len(us) - 1):
        for j in range(len(ws) - 1):
            hs = (H[i][j], H[i + 1][j], H[i + 1][j + 1], H[i][j + 1])
            pts = [P(us[i], ws[j], hs[0]), P(us[i + 1], ws[j], hs[1]), P(us[i + 1], ws[j + 1], hs[2]), P(us[i], ws[j + 1], hs[3])]
            if trim and us[i] < trim - 1e-6 and not (overhang_ok(ws[j]) and overhang_ok(ws[j + 1])): continue
            if max(hs) <= LOW + 0.03:
                if skip_flat_below is None or us[i + 1] > skip_flat_below + 1e-6: flat_cells.append(pts)
                continue
            # the diagonal that runs toward the apex in this quadrant (the seams' direction): regular strips, no zig-zag
            uc, wc_ = (us[i] + us[i + 1]) / 2, (ws[j] + ws[j + 1]) / 2
            if (uc - APEX_U) * (wc_ - WC) > 0:
                face_dir([pts[0], pts[1], pts[2]], Z, mat, C_PLAIN); face_dir([pts[0], pts[2], pts[3]], Z, mat, C_PLAIN)
            else:
                face_dir([pts[0], pts[1], pts[3]], Z, mat, C_PLAIN); face_dir([pts[1], pts[2], pts[3]], Z, mat, C_PLAIN)
    if flat_cells:
        K.B.new_group(); flat_group()
        for pts in flat_cells: face_dir(pts, Z, mat, C_PLAIN)
    K.B.new_group(); flat_group()
    def side(row, sgn_out):
        for a, b in zip(row[:-1], row[1:]):
            if a.z + OY <= LOW + 0.05 or b.z + OY <= LOW + 0.05: continue       # at the rim: under the coping / the other surface
            face_dir([a, b, b - Z * TH, a - Z * TH], sgn_out, mat, C_RIDGE)
    if "u0" in edges and trim:            # the overhang's front edge where it exists, else the edge at the glass line runs into the glass
        rows, row = [], []
        for j, w in enumerate(ws):
            if overhang_ok(w): row.append(P(us[0], w, H[0][j]))
            else:
                if len(row) > 1: rows.append(row)
                row = []
        if len(row) > 1: rows.append(row)
        for r_ in rows: side(r_, Vector((-1, 0, 0)))
        # the overhang's lateral ends (where it stops, the roof steps back to the glass line)
        iu = us.index(trim)
        for j in range(len(ws) - 1):
            a_ok, b_ok = overhang_ok(ws[j]), overhang_ok(ws[j + 1])
            if a_ok == b_ok: continue
            jj = j if a_ok else j + 1
            out = Vector((0, -1, 0)) if a_ok else Vector((0, 1, 0))       # toward the trimmed side (Blender y = -w)
            row = [P(us[i], ws[jj], H[i][jj]) for i in range(iu + 1)]
            for a, b in zip(row[:-1], row[1:]):
                face_dir([a, b, b - Z * TH, a - Z * TH], out, mat, C_RIDGE)
    elif "u0" in edges: side([P(us[0], w, H[0][j]) for j, w in enumerate(ws)], Vector((-1, 0, 0)))
    if "u1" in edges: side([P(us[-1], w, H[-1][j]) for j, w in enumerate(ws)], Vector((1, 0, 0)))
    if "w0" in edges: side([P(u, ws[0], H[i][0]) for i, u in enumerate(us)], Vector((0, 1, 0)))
    if "w1" in edges: side([P(u, ws[-1], H[i][-1]) for i, u in enumerate(us)], Vector((0, -1, 0)))
    if under is not None:
        for i in range(len(us) - 1):
            if us[i] >= under - 1e-6: break
            ua, ub = us[i], min(us[i + 1], under)
            for j in range(len(ws) - 1):
                if min(hfun(ua, ws[j]), hfun(ua, ws[j + 1])) <= LOW + 0.05: continue
                if trim and not (overhang_ok(ws[j]) and overhang_ok(ws[j + 1])): continue
                q = [P(ua, ws[j], hfun(ua, ws[j]) - TH), P(ub, ws[j], hfun(ub, ws[j]) - TH), P(ub, ws[j + 1], hfun(ub, ws[j + 1]) - TH), P(ua, ws[j + 1], hfun(ua, ws[j + 1]) - TH)]
                face_dir(q, -Z, mat if mat != ROOF else WOOD, C_PLAIN)
    return us, ws, H

# ------------------------------------------------------------------------------------------------ the parts
def box_walls():
    """the brick box: the upper front over the porch (the concrete band at its foot), the sides and the back (ESTIMATED
    narrow windows), the copings"""
    sf = Seg((UF, WW), (UF, WE), (-1, 0))
    vwall(sf, RIM, bottom=BAND_TOP)
    fbox(sf.fr, -0.2, sf.L + 0.2, hz(SOFFIT), hz(BAND_TOP), 0.0, 0.08, CONC, C_BAND, skip=())
    # the cross (photo: right of the centre; dark metal, the upright 73.0-75.5, the bar at 74.4)
    s = sf.s(2.2 - WW)
    if not XFAR():
        fbox(sf.fr, s - 0.11, s + 0.11, hz(72.9), hz(75.55), 0.0, 0.12, IRON, C_SCULPT)
        fbox(sf.fr, s - 1.25, s - 0.11, hz(74.35), hz(74.6), 0.0, 0.13, IRON, C_SCULPT)
        fbox(sf.fr, s + 0.11, s + 1.25, hz(74.35), hz(74.6), 0.0, 0.13, IRON, C_SCULPT)
    else:
        fbox(sf.fr, s - 0.13, s + 0.13, hz(72.9), hz(75.55), 0.0, 0.12, IRON, C_SCULPT)
    for name, seg, n in (("W", Seg((UF, WW), (UB, WW), (0, -1)), 5), ("E", Seg((UF, WE), (UB, WE), (0, 1)), 5), ("N", Seg((UB, WW), (UB, WE), (1, 0)), 6)):
        L = seg.L
        holes = []
        if name == "E":      # the annex covers u 2.9 .. 22.9 up to 75
            for k in range(n):
                t = 2.0 + (L - 4.0) * (k + 0.5) / n
                u = UF + t
                if not (ANNEX[0] - 0.5 < u < ANNEX[1] + 0.5): holes.append(rect(seg.s(t) - 0.2, hz(69.2), seg.s(t) + 0.2, hz(74.8)))
        else:
            for k in range(n):
                t = 2.5 + (L - 5.0) * (k + 0.5) / n
                holes.append(rect(seg.s(t) - 0.2, hz(69.2), seg.s(t) + 0.2, hz(74.8)))
        vwall(seg, RIM, holes=holes)
        for h in holes:
            strip2d(seg.fr, h, 0.0, -0.22, CONC, C_SUR)
            fill2d(seg.fr, [h], -0.22, GLASS, C_LEAD)
            if not FAR():
                sc = (h[0][0] + h[1][0]) / 2
                fbox(seg.fr, sc - 0.26, sc + 0.26, h[0][1] - 0.1, h[0][1] + 0.002, -0.01, 0.06, CONC, C_SILL)
    outer = [(UF, WW), (UB, WW), (UB, WE), (UF, WE)]
    inner = offset_uw(outer, -0.32)
    if not XFAR():
        ring_prism(offset_uw(outer, 0.04), RIM, COPE, CONC, C_COPING, top=False, top_to=inner, bottom_to=outer); flat_group()
        CK_inner_wall(inner, RIM - 0.25, COPE, CONC, C_COPING); flat_group()
    else:
        ring_prism(offset_uw(outer, 0.04), RIM, COPE, CONC, C_COPING, top=False, top_to=inner); flat_group()

def CK_inner_wall(loop_uw, h0, h1, mat, code):
    K.B.new_group()
    L = ccw_uw(loop_uw); n = len(L)
    for i in range(n):
        a, b = L[i], L[(i + 1) % n]
        q = [P(a[0], a[1], h0), P(b[0], b[1], h0), P(b[0], b[1], h1), P(a[0], a[1], h1)]
        e = q[1] - q[0]
        face_dir(q, -Vector((e.y, -e.x, 0)), mat, code)

def porch():
    """the recessed entrance under the cantilevered front: the soffit, square concrete columns along the front, the glazed
    screen with three double doors at u 0, the west porch's walls, the paved floor"""
    # soffit and floor: one L-shaped slab each (u UF .. 0 across, and the west porch to U_PB)
    L_ = lambda u0: [(u0, WW), (U_PB, WW), (U_PB, W_PORCH), (U_GF, W_PORCH), (U_GF, WE), (u0, WE)]
    K.B.new_group(); face_dir([P(u, w, SOFFIT) for u, w in L_(UF)], -Z, CONC, C_PLAIN); flat_group()
    fl = [(UF - 0.6, WW), (UF, WW)] + L_(UF)[1:-1] + [(UF, WE), (UF - 0.6, WE)]      # split where the skirts meet (welded edges)
    K.B.new_group(); face_dir([P(u, w, FLOOR) for u, w in fl], Z, BLUE, C_PLAIN); flat_group()
    for a, b, out in (((UF - 0.6, WW), (UF - 0.6, WE), (-1, 0)), ((UF - 0.6, WW), (UF, WW), (0, -1)), ((UF - 0.6, WE), (UF, WE), (0, 1))):
        vwall(Seg(a, b, out), FLOOR, bottom=HB + 0.3, mat=BLUE)        # the slab's skirt in front of the box (its walls go down behind)
    # columns (photo: square, concrete, at the cantilever's edge; ESTIMATED spacing)
    for w in (-15.3, -8.9, -2.5, 3.9, 10.3):
        c = P(UF + 0.45, w, 0)
        wbox(c, Vector((1, 0, 0)), Vector((0, 1, 0)), 0.2, 0.2, hz(HB + 0.3), hz(SOFFIT), CONC, C_PLAIN, skip=())
    # the glazed screen at u 0 (w -13 .. WE): mullions every 1.5 m, three double doors, a brick pier each end
    seg = Seg((U_GF, W_PORCH), (U_GF, WE), (-1, 0))
    L = seg.L
    glass = rect(min(seg.s(0.5), seg.s(L - 0.5)), hz(FLOOR), max(seg.s(0.5), seg.s(L - 0.5)), hz(SOFFIT) - 0.25)
    vwall(seg, SOFFIT, holes=[glass])
    strip2d(seg.fr, glass, 0.0, -0.3, CONC, C_SUR)
    fill2d(seg.fr, [glass], -0.3, GLASS, C_PLAIN)
    if not XFAR():
        n = int((L - 1.0) / 1.5)
        doors = (L * 0.25, L * 0.5, L * 0.75)
        for k in range(n + 1):
            t = 0.5 + (L - 1.0) * k / n
            if any(abs(t - tc) < 1.05 for tc in doors): continue
            s = seg.s(t)
            bar(seg.fr, (s, hz(FLOOR)), (s, hz(SOFFIT) - 0.25), -0.3, 0.09, 0.08, IRON, C_FRAME)
        bar(seg.fr, (glass[0][0], hz(70.75 - 0.0)), (glass[1][0], hz(70.75)), -0.3, 0.08, 0.07, IRON, C_FRAME)
        for tc in doors:                                   # door leaves (oak, the glazed screen's three doors)
            s = seg.s(tc)
            fbox(seg.fr, s - 0.95, s + 0.95, hz(FLOOR), hz(70.6), -0.3, -0.24, WOOD, C_DOOR, skip=("back",))
            for sx in (s - 0.5, s + 0.5):
                fbox(seg.fr, sx - 0.33, sx + 0.33, hz(FLOOR) + 0.25, hz(70.35), -0.24, -0.23, GLASS, C_PLAIN, skip=("back", "bottom", "top", "left", "right"))
    # the west porch: its back wall (u U_PB, w WW .. -13) and the side toward the screen (w -13, u 0 .. U_PB)
    vwall(Seg((U_PB, WW), (U_PB, W_PORCH), (-1, 0)), SOFFIT, holes=[])
    vwall(Seg((U_GF, W_PORCH), (U_PB, W_PORCH), (0, -1)), SOFFIT)
    # a door in the west porch's back wall
    sd = Seg((U_PB, WW), (U_PB, W_PORCH), (-1, 0))
    if not XFAR(): fbox(sd.fr, sd.s(2.4) - 0.8, sd.s(2.4) + 0.8, hz(FLOOR), hz(70.6), -0.02, 0.03, WOOD, C_DOOR, skip=("back",))

def roofs():
    """the four concave surfaces: the front two (76.2 -> 80.4 at the glass wall), the rear two (the apex 85.4) running
    out over the glass as the chevron overhang; the clerestory glass wall between; the dark fascia"""
    inner = 0.3                                  # the roofs start inside the coping
    du = 0.55 if not FAR() else (1.6 if not XFAR() else 3.0)
    dw = 0.55 if not FAR() else (1.6 if not XFAR() else 3.0)
    surface(UF + inner, U_GLASS, WW + inner, WE - inner, h_front, du, dw, ROOF, edges=())     # its end meets the glass (no gap, no face in its plane)
    us, ws, H = surface(U_OVER, UB - inner, WW + inner, WE - inner, h_rear, du, dw, ROOF, under=U_GLASS, edges=("u0",), skip_flat_below=U_GLASS, trim=U_GLASS)
    # the clerestory glass: from the front surfaces' line up to the rear roof's underside, where there is a gap
    seg = Seg((U_GLASS, WW + inner), (U_GLASS, WE - inner), (-1, 0))
    wsg = [w for w in ws]
    bot = [(w - (WW + inner), h_front(U_GLASS, w) - TH - 0.02) for w in wsg]
    top = [(w - (WW + inner), max(h_front(U_GLASS, w) + 0.002, h_rear(U_GLASS, w) - (TH - 0.01 if overhang_ok(w) else 0.0))) for w in wsg]
    keep = list(range(len(wsg)))                 # the whole width: the glass also closes the front roof's end
    if keep:
        k0, k1 = max(keep[0] - 1, 0), min(keep[-1] + 1, len(wsg) - 1)
        b_ = bot[k0:k1 + 1]; t_ = top[k0:k1 + 1]
        loop = seg.st(b_ + list(reversed(t_)))
        fill2d(seg.fr, [ccw(loop)], 0.0, GLASS, C_PLAIN)
        if not XFAR():
            for k in range(k0, k1 + 1, 1 if FAR() is False else 2):
                if top[k][1] - bot[k][1] < 0.3 + TH: continue
                s = seg.s(bot[k][0])
                bar(seg.fr, (s, hz(bot[k][1])), (s, hz(top[k][1])), 0.0, 0.07, 0.09, IRON, C_FRAME)
            # a transom along the glass, 1.1 m over the front surfaces' line
            pts = [(seg.s(b[0]), hz(b[1] + 1.1)) for b, t in zip(b_, t_) if t[1] - b[1] > 1.3]
            if len(pts) > 1:
                sweep = sorted(pts)
                CK.sweep2d(seg.fr, sweep, [(0.0, -0.03), (0.08, -0.03), (0.08, 0.03), (0.0, 0.03)], IRON, C_FRAME, caps=True)
    # the dark fascia along the overhang's edge (the chevron)
    if not XFAR():
        edge = [P(U_OVER - 0.02, w, h_rear(U_OVER, w) + 0.01) for w in ws]
        for a, b in zip(edge[:-1], edge[1:]):
            wa, wb = -a.y, -b.y
            if not (overhang_ok(wa) and overhang_ok(wb)): continue
            face_dir([a, b, b - Z * (TH + 0.1), a - Z * (TH + 0.1)], Vector((-1, 0, 0)), IRON, C_FRAME)

def annex():
    u0, u1, w0, w1, top = ANNEX
    for a, b, out in (((u0, w0), (u0, w1), (-1, 0)), ((u0, w1), (u1, w1), (0, 1)), ((u1, w0), (u1, w1), (1, 0))):
        seg = Seg(a, b, out)
        holes = []
        if out == (0, 1):
            holes = [rect_window(seg, t, 1.2, 69.4, 70.9, sur_mat=CONC) for t in (3.0, 7.5, 12.5, 17.0)]
            holes.append(rect(seg.s(10.0) - 0.5, hz(FLOOR - 0.3), seg.s(10.0) + 0.5, hz(70.6)))
        vwall(seg, top, holes=holes)
        if out == (0, 1):
            h = holes[-1]
            strip2d(seg.fr, h, 0.0, -0.2, CONC, C_SUR); fill2d(seg.fr, [h], -0.2, WOOD, C_DOOR)
    lp = [(u0, w0), (u1, w0), (u1, w1), (u0, w1)]
    inner = offset_uw(lp, -0.25)
    face_up([P(u, w, top - 0.06) for u, w in ccw_uw(inner)], ROOF, C_PLAIN); flat_group()
    if not XFAR():
        ring_prism(offset_uw(lp, 0.04), top, top + 0.15, CONC, C_COPING, top=False, top_to=inner, bottom_to=lp); flat_group()
        CK_inner_wall(inner, top - 0.2, top + 0.15, CONC, C_COPING); flat_group()

def downpipes():
    if FAR(): return
    for u, w in ((UB + 0.1, WW + 1.5), (UB + 0.1, WE - 1.5), (24.0, WW - 0.1), (24.0, WE + 0.1)):
        rodc(P(u, w, G(u, w) - 0.3), P(u, w, RIM - 0.1), 0.05, ROOF, C_GUTTER, 8)

def build_all():
    box_walls(); porch(); roofs(); annex(); downpipes()

build_all()
B0 = K.B
print(f"LOD0: {len(B0.f)} faces in {time.time() - T0:.1f}s")
K.B = SC.Builder(); K.FAR = 1
build_all()
B1 = K.B
K.B = SC.Builder(); K.FAR = 2
build_all()
B2 = K.B
K.FAR = False

info = {
    "new_slot_names": {"wood_oak": "door leaves (temporary material)", "concrete_white": "the band, columns, soffit, copings (temporary material; vanbuuren / police use the name)"},
    "measured": {"frame": SITE["frame"], "footprint_osm": SITE["footprint_local"]["osm"], "solid_top": SITE["solid_top"]},
    "levels_taw": {"floor": FLOOR, "rim": RIM, "coping": COPE, "soffit": SOFFIT, "band_top": BAND_TOP, "front_surfaces_top": FRONT_H,
                   "apex": APEX_H, "annex": ANNEX[4]},
    "roof": f"h = rim + (top - rim) * (1 - t), t = superellipse (p {P_SE}) of the distances from the apex line to the rim (rear) / from the glass wall to the front",
    "estimated": "the side, back and annex openings (none visible from the street), the columns' spacing, the entrance screen's division and doors, "
                 "the cross's size (+-0.3 m), the floor level; the ivy on the front's east half is not modelled",
}
views = {"south": ((-34.0, -2.5, 69.8), (0.0, -2.5, 75.0), 22, (1200, 850)),
         "southeast": ((-26.0, 26.0, 70.5), (6.0, -2.5, 75.5), 22, (1200, 850)),
         "aerial": ((-30.0, 34.0, 110.0), (10.0, -2.5, 76.0), 26, (1100, 850)),
         "north": ((55.0, -10.0, 75.0), (10.0, -2.5, 77.0), 24, (1100, 850))}
cols = {"brick_dark": (0.22, 0.16, 0.14), "stone_blue": (0.35, 0.36, 0.37), "zinc_roof": (0.2, 0.21, 0.22), "concrete_white": (0.6, 0.58, 0.54),
        "wood_oak": (0.35, 0.16, 0.06), "glass_window": (0.02, 0.025, 0.03), "cast_iron_green": (0.03, 0.03, 0.03)}
CK.finish("saintmarc", "SaintMarc", OUT, PREV, ARGS, SLOTS, [B0, B1, B2], G, _g, SITE, info, ao_px=2048, views=views, cols=cols, sun=(42, 150), t0=T0)
