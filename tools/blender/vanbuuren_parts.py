"""VILLA VAN BUUREN: joinery, concrete, boards, gutters, the chimney: the parts tools/blender/vanbuuren.py places.

Families (the photos): the upper floors' windows are VARNISHED TIMBER (orange-brown), the ground floor's French windows
and the leaded windows WHITE-painted; white concrete hoods, slabs and box frames, crisp, with a drip groove under
their free edges. Every part that sits on a wall starts INSIDE it (crosses it at 90 deg: no coplanar faces).
"""
import math
from mathutils import Vector
from vanbuuren_kit import (K, Z, P, OY, hz, face_dir, quad, Frame, box, fbox, hbox, lathe, pipe, rect, fill_rect_grid,
                           BRICK, BPAT, CONC, TILES, WOODV, WOODW, GLASS, LEAD, OAK, GREEN, ZINC, BLUE,
                           C_PLAIN, C_REVEAL, C_LATTICE, C_SILL, C_SOFFIT, C_DRIP, C_FRAME, C_BAR, C_PANE, C_LEAD,
                           C_PANEL, C_RIDGE, C_COPING, C_INT, COURSE, JOINT, COURSE_BASE)

# ------------------------------------------------------------------------------------------------ windows
def window(fr, s0, s1, h0, h1, family="wood", lights=2, rows=4, d=-0.06, glass=GLASS, transom=None, sill=True,
           frame_w=0.065, bar_w=0.028, lead_rows=0, deep=0.05, mullion_w=None):
    """a window filling the opening (s0..s1, h0..h1) of a wall on frame fr: the frame + sashes + glazing bars as ONE
    planar grid (cells between the bars' edges: no fans) at depth d, every pane's reveal back to the glass at d - deep,
    one glass face behind. The grid reaches 1 cm into the reveal on every side (crosses the jambs, head, sill).
    family 'wood' (varnished) / 'white'; rows = panes high per light; transom = (h, rows above) or None."""
    mat = WOODV if family == "wood" else WOODW
    fw, bw = frame_w, bar_w
    mw = mullion_w or fw
    if K.FAR:
        # far: the glass recessed + a frame ring + the mullions (no small bars)
        g0 = d - deep
        face_dir([fr.p(s0, h0, g0), fr.p(s1, h0, g0), fr.p(s1, h1, g0), fr.p(s0, h1, g0)], fr.N, glass, C_PANE)
        xs = [s0 - 0.01, s0 + fw] + [x for j in range(1, lights) for x in (s0 + (s1 - s0) * j / lights - mw / 2, s0 + (s1 - s0) * j / lights + mw / 2)] + [s1 - fw, s1 + 0.01]
        hs = [h0 - 0.01, h0 + fw, h1 - fw, h1 + 0.01]
        holes = [(xs[2 * j + 1], hs[1], xs[2 * j + 2], hs[2]) for j in range(lights)]
        fill_rect_grid(fr, xs, hs, d, mat, C_FRAME, holes)
        return
    # columns: frame, (pane, bar)*, mullion between lights
    xs = [s0 - 0.01, s0 + fw]
    light_edges = []
    for j in range(lights):
        a = s0 + fw if j == 0 else s0 + (s1 - s0) * j / lights + mw / 2
        b = s1 - fw if j == lights - 1 else s0 + (s1 - s0) * (j + 1) / lights - mw / 2
        light_edges.append((a, b))
    xs = [s0 - 0.01]
    for (a, b) in light_edges: xs += [a, b]
    xs.append(s1 + 0.01)
    # rows: frame, panes with bars (rows high), optional transom
    def row_cuts(lo, hi, n):
        cuts = []
        for r in range(n):
            y0 = lo + (hi - lo) * r / n + (bw / 2 if r > 0 else 0.0)
            y1 = lo + (hi - lo) * (r + 1) / n - (bw / 2 if r < n - 1 else 0.0)
            cuts.append((y0, y1))
        return cuts
    panes_h = []
    if transom:
        th, nr_top = transom
        panes_h = row_cuts(h0 + fw, th - fw / 2, rows) + row_cuts(th + fw / 2, h1 - fw, nr_top)
    else:
        panes_h = row_cuts(h0 + fw, h1 - fw, rows)
    hs = [h0 - 0.01] + [y for p in panes_h for y in p] + [h1 + 0.01]
    holes = [(a, y0, b, y1) for (a, b) in light_edges for (y0, y1) in panes_h]
    # the grid: all x cuts x all h cuts
    fill_rect_grid(fr, sorted(set(xs)), sorted(set(hs)), d, mat, C_FRAME, holes)
    # pane reveals (back to the glass) + the glass
    g0 = d - deep
    for (a, y0, b, y1) in holes:
        for (pa, pb, want) in (((a, y0), (b, y0), Z), ((b, y1), (a, y1), -Z), ((a, y1), (a, y0), fr.U), ((b, y0), (b, y1), -fr.U)):
            face_dir([fr.p(pa[0], pa[1], d), fr.p(pb[0], pb[1], d), fr.p(pb[0], pb[1], g0), fr.p(pa[0], pa[1], g0)], want, mat, C_BAR)
    face_dir([fr.p(s0, h0, g0), fr.p(s1, h0, g0), fr.p(s1, h1, g0), fr.p(s0, h1, g0)], fr.N, glass, C_LEAD if glass == LEAD else C_PANE,
             [(s0, h0), (s1, h0), (s1, h1), (s0, h1)])
    if sill:
        # a sloped brick-on-edge sill under the opening: proud 4 cm, wider than the opening (its ends cross the wall)
        sill_block(fr, s0 - 0.04, s1 + 0.04, h0, d)

def sill_block(fr, s0, s1, h0, d_back, slot=BRICK, out=0.045, hgt=0.075):
    """a sloped sill: top from (d_back, h0) to (out, h0 - 0.025); front face, ends, bottom; the back hidden"""
    B = K.B
    a = [(d_back, h0 + 0.005), (out, h0 - 0.025), (out, h0 - hgt), (-0.03, h0 - hgt)]
    # faces: top (sloped), front, bottom, two ends
    pts = lambda s: [fr.p(s, hh, dd) for (dd, hh) in a]
    L, R = pts(s0), pts(s1)
    face_dir([L[0], R[0], R[1], L[1]], Z + fr.N * 0.4, slot, C_SILL)
    face_dir([L[1], R[1], R[2], L[2]], fr.N, slot, C_SILL)
    face_dir([L[2], R[2], R[3], L[3]], -Z, slot, C_SILL)
    face_dir(L, -fr.U, slot, C_SILL); face_dir(R, fr.U, slot, C_SILL)

# ------------------------------------------------------------------------------------------------ concrete slabs
def slab(rects, h_top, thick, drip=True, slot=CONC, soffit_band=None):
    """a white concrete slab from plan rectangles (u0, u1, w0, w1, outer) that tile it without overlapping; `outer` = the
    sides that are free edges ('n' w0, 's' w1, 'w' u0, 'e' u1): they get side faces and, under them, a drip groove
    (1.5 cm wide, 1 cm deep, 3 cm in). Sides against a wall or another rect get no face (they start inside the wall).
    soffit_band: (slot, width) a thin painted band on the underside along the free edges (the orange soffit band)."""
    B = K.B; B.new_group()
    h0 = h_top - thick
    g_in, g_w, g_d = 0.03, 0.015, 0.01
    for (u0, u1, w0, w1, outer) in rects:
        # top
        face_dir([P(u0, w0, h_top), P(u1, w0, h_top), P(u1, w1, h_top), P(u0, w1, h_top)], Z, slot, C_PLAIN,
                 [(u0, w0), (u1, w0), (u1, w1), (u0, w1)])
        # sides on the free edges
        for side in outer:
            if side == "n": a, b = P(u1, w0, h0), P(u0, w0, h0); n = Vector((0, 1, 0))
            elif side == "s": a, b = P(u0, w1, h0), P(u1, w1, h0); n = Vector((0, -1, 0))
            elif side == "w": a, b = P(u0, w0, h0), P(u0, w1, h0); n = Vector((-1, 0, 0))
            else: a, b = P(u1, w1, h0), P(u1, w0, h0); n = Vector((1, 0, 0))
            face_dir([a, b, b + Z * thick, a + Z * thick], n, slot, C_PLAIN)
        # underside: a grid with the groove bands recessed
        if K.FAR or not drip:
            face_dir([P(u0, w0, h0), P(u1, w0, h0), P(u1, w1, h0), P(u0, w1, h0)], -Z, slot, C_SOFFIT)
            continue
        cu = [u0, u1]; cw = [w0, w1]
        if "w" in outer: cu += [u0 + g_in, u0 + g_in + g_w]
        if "e" in outer: cu += [u1 - g_in, u1 - g_in - g_w]
        if "n" in outer: cw += [w0 + g_in, w0 + g_in + g_w]
        if "s" in outer: cw += [w1 - g_in, w1 - g_in - g_w]
        cu = sorted(set(cu)); cw = sorted(set(cw))
        def in_groove(uc, wc):
            outer_strip = (("w" in outer and uc < u0 + g_in) or ("e" in outer and uc > u1 - g_in) or
                           ("n" in outer and wc < w0 + g_in) or ("s" in outer and wc > w1 - g_in))
            if outer_strip: return False
            return (("w" in outer and uc < u0 + g_in + g_w) or ("e" in outer and uc > u1 - g_in - g_w) or
                    ("n" in outer and wc < w0 + g_in + g_w) or ("s" in outer and wc > w1 - g_in - g_w))
        gr = {}
        for i in range(len(cu) - 1):
            for j in range(len(cw) - 1):
                a0, a1, b0, b1 = cu[i], cu[i + 1], cw[j], cw[j + 1]
                g = in_groove((a0 + a1) / 2, (b0 + b1) / 2); gr[(i, j)] = g
                hh = h0 + (g_d if g else 0.0)
                code = C_DRIP if g else C_SOFFIT
                face_dir([P(a0, b0, hh), P(a1, b0, hh), P(a1, b1, hh), P(a0, b1, hh)], -Z, slot, code)
        # the groove's walls between groove and non-groove cells
        for i in range(len(cu) - 1):
            for j in range(len(cw) - 1):
                if not gr[(i, j)]: continue
                for (di, dj) in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                    ni, nj = i + di, j + dj
                    if (ni, nj) in gr and gr[(ni, nj)]: continue
                    if not (0 <= ni < len(cu) - 1 and 0 <= nj < len(cw) - 1): continue
                    if di == 1: a, b = P(cu[i + 1], cw[j], h0), P(cu[i + 1], cw[j + 1], h0); want = Vector((-1, 0, 0))
                    elif di == -1: a, b = P(cu[i], cw[j + 1], h0), P(cu[i], cw[j], h0); want = Vector((1, 0, 0))
                    elif dj == 1: a, b = P(cu[i], cw[j + 1], h0), P(cu[i + 1], cw[j + 1], h0); want = Vector((0, 1, 0))
                    else: a, b = P(cu[i + 1], cw[j], h0), P(cu[i], cw[j], h0); want = Vector((0, -1, 0))
                    face_dir([a, b, b + Z * g_d, a + Z * g_d], want, slot, C_DRIP)
        if soffit_band and not K.FAR:
            pass

def hood(fr, s0, s1, h_top, depth, thick=0.15, ends=("free", "free")):
    """a cantilevered hood over a window on frame fr: from 3 cm inside the wall to `depth` out, s0..s1"""
    # converted to the building frame: the frame's U / N axes are axis-aligned in this plan
    pts = [fr.p(s0, h_top, -0.03), fr.p(s1, h_top, -0.03), fr.p(s1, h_top, depth), fr.p(s0, h_top, depth)]
    us = [p.x for p in pts]; ws = [-p.y for p in pts]
    u0, u1, w0, w1 = min(us), max(us), min(ws), max(ws)
    # which plan sides are free: all but the wall side
    N = fr.N
    wall_side = "e" if N.x < -0.5 else "w" if N.x > 0.5 else "s" if N.y > 0.5 else "n"
    outer = [x for x in "nswe" if x != wall_side]
    slab([(u0, u1, w0, w1, outer)], h_top, thick)

def box_frame(fr, s0, s1, h0, h1, band=0.16, proud=0.38, back=0.16):
    """a deep white concrete box frame around an opening: lintel and sill bands over the full width, the two sides
    between them; from `back` inside the wall to `proud` out. (s0..s1, h0..h1) = the OUTER rectangle."""
    K.B.new_group()
    fbox(fr, s0, s1, h1 - band, h1, -back, proud, CONC, C_FRAME, skip=("back",))
    fbox(fr, s0, s1, h0, h0 + band, -back, proud, CONC, C_FRAME, skip=("back",))
    for (a, b) in ((s0, s0 + band), (s1 - band, s1)):
        fbox(fr, a, b, h0 + band, h1 - band, -back, proud, CONC, C_FRAME, skip=("back", "top", "bottom"))

def grille(fr, s0, s1, h0, h1, d, slot=WOODV, n=14):
    """the folding security grille seen in the box frames (v00, v06): diagonal lattice of thin bars (LOD0 only)"""
    if K.FAR: return
    w, ht = s1 - s0, h1 - h0
    # verticals + a diagonal trellis (X)
    for k in range(n + 1):
        x = s0 + w * k / n
        fbox(fr, x - 0.008, x + 0.008, h0, h1, d - 0.01, d + 0.01, slot, C_BAR, skip=("back",))
    for (y0, y1) in ((h0 + 0.03, h0 + 0.08), (h1 - 0.08, h1 - 0.03)):
        fbox(fr, s0, s1, y0, y1, d + 0.01, d + 0.025, slot, C_BAR, skip=("back",))

# ------------------------------------------------------------------------------------------------ boards, gutters, pipes
def board(a, b, up, out, height, thick, slot=WOODV, code=C_PLAIN, cap_a=True, cap_b=True):
    """a straight board from a to b (Blender): its height along `up`, thickness along `out` (both unit, perpendicular to
    the run); the board spans up * [-height, 0] (hangs below the line a-b) ... out * [0, thick]"""
    d = (b - a); L = d.length
    if L < 1e-4: return
    d.normalize()
    pts = lambda p: [p, p - up * height, p - up * height + out * thick, p + out * thick]
    A, Bq = pts(a), pts(b)
    for i in range(4):
        n = (A[i] + A[(i + 1) % 4]) / 2 - (A[0] + A[2]) / 2
        face_dir([A[i], Bq[i], Bq[(i + 1) % 4], A[(i + 1) % 4]], n, slot, code)
    if cap_a: face_dir(A, -d, slot, code)
    if cap_b: face_dir(Bq, d, slot, code)

def gutter(a, b, out_dir, r=0.065, slot=ZINC):
    """a half-round zinc gutter hanging in front of an eave line a-b (Blender, horizontal), open top, smooth"""
    d = (b - a); L = d.length
    if L < 1e-3: return
    d.normalize()
    c0 = a + out_dir * (r + 0.01) - Z * 0.02
    B = K.B; B.new_group(); sv = B.smooth; B.smooth = True
    segs = 8
    ring = lambda base: [base + (out_dir * math.cos(math.pi * k / segs) - Z * math.sin(math.pi * k / segs)) * r for k in range(segs + 1)]
    ra, rb = ring(c0), ring(c0 + d * L)
    for k in range(segs):
        mid = (ra[k] + ra[k + 1]) / 2
        face_dir([ra[k], rb[k], rb[k + 1], ra[k + 1]], mid - c0, slot, C_PLAIN)
    B.smooth = sv
    # the rolled bead on the front lip
    pipe(ra[0] - d * 0.0, rb[0], 0.008, 6, slot)

def downpipe(u, w, h_top, h_bot, r=0.045, slot=ZINC):
    pipe(P(u, w, h_bot), P(u, w, h_top), r, 12, slot)

# ------------------------------------------------------------------------------------------------ the lattice (gable tops)
def lattice(fr, s_lo, s_hi, h0, top, cell_w=0.23, cell_h=4 * COURSE, gap=0.02, proud=0.018, d0=0.0):
    """projecting brick panels in a stack-bond lattice over a gable top: cells clipped inside the profile top(s) - 5 cm
    (whole cells only); every other row offset by half a cell (the photos' basket weave)"""
    if K.FAR: return
    K.B.new_group()
    hb = h0
    r = 0
    while hb + cell_h < max(top(s_lo + (s_hi - s_lo) * i / 50) for i in range(51)):
        off = (cell_w / 2) if r % 2 else 0.0
        x = s_lo - cell_w + off
        while x < s_hi:
            a, b = x + gap / 2, x + cell_w - gap / 2
            y0, y1 = hb + gap / 2, hb + cell_h - gap / 2
            if a > s_lo and b < s_hi and min(top(a), top(b)) > y1 + 0.05:
                fbox(fr, a, b, y0, y1, d0 - 0.01, d0 + proud, BPAT, C_LATTICE, skip=("back",))
            x += cell_w
        hb += cell_h; r += 1
