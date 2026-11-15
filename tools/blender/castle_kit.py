"""CASTLE KIT (branch claude/castle1): helpers for the brick-and-stone chateaux of Uccle (first: the Chateau Latour de Frein,
tools/blender/latourdefrein.py), on top of tools/blender/church_kit.py + stpierre_common.py (builder, frames, fills, sweeps).

  - Facade: a planar wall face RASTERISED from rectangles: openings (holes), stone bands, quoins, harped jambs ("harpes":
    stones alternately long and short), brick insets. All items in the wall plane (flush, no overlapping faces): the cell
    grid of every item edge is classified (the last item added wins, holes always win) and merged into rectangles
    (greedy: runs along each row, then identical runs up the rows). One construction group per facade (flat).
  - cross windows (croisees: a stone mullion + transom, four lights with painted frames and glazing bars), basement vents
    with louvres, gabled dormers on a roof plane, chimneys, roof faces from (u, w) polygons on planes.
Frame as church_kit: P(u, w, h) = Blender (u, -w, h - OY); heights m TAW. K.FAR: 0 LOD0, 1 LOD1 (far), 2 LOD2 (very far).
Slot indices (the script's SLOTS follow this order): BRICK 0, SW (white stone) 1, SLATE 2, ZINC 3, WOODW (white painted
wood) 4, GLASS 5, IRON 6, BS (blue stone) 7, WOODD (dark painted wood) 8, TERR (terrace tiles) 9.
"""
import math
from mathutils import Vector
from mathutils.geometry import tessellate_polygon
import stpierre_common as SC
from stpierre_common import K, P, hz, Z, fill2d, strip2d, rect, fbox, wbox, face_dir, OY
from church_kit import (Seg, FAR, XFAR, flat_group, C_PLAIN, C_COPING, C_SUR, C_CORN, C_PLINTH, C_BAND, C_SILL, C_SCULPT,
                        C_RIDGE, C_LOUVRE, C_GUTTER, C_GILT, C_DOOR, C_FRAME, C_LEAD)

BRICK, SW, SLATE, ZINC, WOODW, GLASS, IRON, BS, WOODD, TERR = range(10)
HOLE = -1
import random
_LIT = random.Random(1899)
LIT_P = 0.3
def lit_code():
    """the glass's code: C_GILT = this window glows at night (about LIT_P of them, fixed by the seed), else plain"""
    return C_GILT if _LIT.random() < LIT_P else C_PLAIN
CODE_OF = {BRICK: C_PLAIN, SW: C_SUR, BS: C_PLINTH}


class Facade:
    """a wall face of `seg` from t0..t1 (metres along a -> b) and h0..h1 (TAW); items are rectangles in (t, h)"""
    def __init__(self, seg, h0, h1, t0=0.0, t1=None, base=BRICK):
        self.seg, self.h0, self.h1, self.t0 = seg, h0, h1, t0
        self.t1 = seg.L if t1 is None else t1
        self.base, self.items, self.holes = base, [], []

    def add(self, kind, t0, t1, h0, h1):
        t0, t1 = max(t0, self.t0), min(t1, self.t1)
        h0, h1 = max(h0, self.h0), min(h1, self.h1)
        if t1 - t0 > 2e-3 and h1 - h0 > 2e-3: self.items.append((kind, t0, t1, h0, h1))

    def hole(self, t0, t1, h0, h1):
        self.add(HOLE, t0, t1, h0, h1)

    def band(self, h0, h1, kind=SW):
        self.add(kind, self.t0, self.t1, h0, h1)

    def quoins(self, at_a=True, at_b=True, h0=None, h1=None, course=0.33, long=0.5, short=0.27, kind=SW):
        """corner chains (alternately long and short stones) at the facade's ends"""
        if FAR() and XFAR(): return
        h0 = self.h0 if h0 is None else h0; h1 = self.h1 if h1 is None else h1
        n = max(1, int(round((h1 - h0) / course)))
        c = (h1 - h0) / n
        for k in range(n):
            ext = long if k % 2 == 0 else short
            if FAR(): ext = (long + short) / 2
            if at_a: self.add(kind, self.t0, self.t0 + ext, h0 + k * c, h0 + (k + 1) * c)
            if at_b: self.add(kind, self.t1 - ext, self.t1, h0 + k * c, h0 + (k + 1) * c)

    def harp(self, t_edge, side, h0, h1, frame=0.13, course=0.36, long=0.3, short=0.13, kind=SW):
        """a harped jamb along an opening's edge at t_edge: the frame strip + alternating blocks (side -1: toward t0)"""
        a, b = sorted((t_edge, t_edge + side * frame))
        self.add(kind, a, b, h0, h1)
        if FAR(): return
        n = max(1, int(round((h1 - h0) / course)))
        c = (h1 - h0) / n
        for k in range(n):
            ext = frame + (long if k % 2 == 0 else short)
            a, b = sorted((t_edge, t_edge + side * ext))
            self.add(kind, a, b, h0 + k * c, h0 + (k + 1) * c)

    def emit(self):
        import numpy as np
        if not self.items and self.base is None: return
        r4 = lambda v: round(v, 4)
        xs = sorted({r4(self.t0), r4(self.t1)} | {r4(v) for it in self.items for v in (it[1], it[2])})
        ys = sorted({r4(self.h0), r4(self.h1)} | {r4(v) for it in self.items for v in (it[3], it[4])})
        nx, ny = len(xs) - 1, len(ys) - 1
        cls = np.full((ny, nx), self.base, int)
        X, Y = np.array(xs), np.array(ys)
        order = [it for it in self.items if it[0] != HOLE] + [it for it in self.items if it[0] == HOLE]
        for kind, t0, t1, h0, h1 in order:
            i0, i1 = np.searchsorted(X, r4(t0)), np.searchsorted(X, r4(t1))
            j0, j1 = np.searchsorted(Y, r4(h0)), np.searchsorted(Y, r4(h1))
            cls[j0:j1, i0:i1] = kind
        def row_runs(j, cuts=()):
            runs, i = [], 0
            while i < nx:
                k = i
                while k + 1 < nx and cls[j, k + 1] == cls[j, i] and (k + 1) not in cuts: k += 1
                runs.append((i, k + 1, int(cls[j, i]))); i = k + 1
            return runs
        # the bottom row (the plinth, down in the ground) is cut where the row above changes: its top edge then shares
        # whole edges with the faces above (no T-junction = no open edge at the foot for the contact audit)
        cut0 = {r[0] for r in row_runs(1)} if ny > 1 else set()
        rects, active = [], {}
        for j in range(ny):
            runs = row_runs(j, cut0 if j == 0 else ())
            nxt = {}
            for r in runs:
                if r in active: nxt[r] = active.pop(r)
                else: nxt[r] = j
            for r, j0 in active.items(): rects.append((r, j0, j))
            active = nxt
        for r, j0 in active.items(): rects.append((r, j0, ny))
        seg, fr = self.seg, self.seg.fr
        # T-junctions: every rect corner lying on another rect's side becomes a vertex of that side too (the faces then
        # share whole edges: a watertight wall, no open edge for the contact / leak checks)
        on_row, on_col = {}, {}
        for (i0, i1, c), j0, j1 in rects:
            for i, j in ((i0, j0), (i1, j0), (i1, j1), (i0, j1)):
                on_row.setdefault(j, set()).add(i); on_col.setdefault(i, set()).add(j)
        K.B.new_group(); flat_group()
        for (i0, i1, c), j0, j1 in rects:
            if c == HOLE: continue
            loop = [(i, j0) for i in sorted(x for x in on_row.get(j0, ()) if i0 <= x < i1)]
            loop += [(i1, j) for j in sorted(y for y in on_col.get(i1, ()) if j0 <= y < j1)]
            loop += [(i, j1) for i in sorted((x for x in on_row.get(j1, ()) if i0 < x <= i1), reverse=True)]
            loop += [(i0, j) for j in sorted((y for y in on_col.get(i0, ()) if j0 < y <= j1), reverse=True)]
            pts = [(xs[i], ys[j]) for i, j in loop]
            code = CODE_OF.get(c, C_PLAIN)
            if len(pts) == 4 or FAR():               # (the far levels keep plain quads: T-junctions there are warnings only)
                if FAR(): pts = [(xs[i0], ys[j0]), (xs[i1], ys[j0]), (xs[i1], ys[j1]), (xs[i0], ys[j1])]
                face_dir([fr.p(seg.s(t), hz(h)) for t, h in pts], fr.N, c, code)
                continue
            # a rectangle with extra points on its sides: fan from its centre (every side point gets its own triangle)
            cen = ((xs[i0] + xs[i1]) / 2, (ys[j0] + ys[j1]) / 2)
            n = len(pts)
            for k in range(n):
                a_, b_ = pts[k], pts[(k + 1) % n]
                face_dir([fr.p(seg.s(t), hz(h)) for t, h in (cen, a_, b_)], fr.N, c, code)
        return len(rects)


def sloop(seg, t0, t1, h0, h1):
    a, b = sorted((seg.s(t0), seg.s(t1)))
    return rect(a, hz(h0), b, hz(h1))


def inset(l, d):
    (a, b), (c, e) = l[0], l[2]
    return rect(a + d, b + d, c - d, e - d)


def lights(fr, L, D, bars_v=1, bars_h=1, frame=0.055, bar=0.028):
    """one light at depth -D: the painted frame ring and the glazing bars (flat, 5 mm apart: no overlap)"""
    if FAR():
        return
    fill2d(fr, [L, inset(L, frame)], -D + 0.035, WOODW, C_FRAME)
    (s0, v0), (s1, v1) = L[0], L[2]
    s0 += frame; s1 -= frame; v0 += frame; v1 -= frame
    for k in range(1, bars_v + 1):
        s = s0 + (s1 - s0) * k / (bars_v + 1)
        fill2d(fr, [rect(s - bar / 2, v0, s + bar / 2, v1)], -D + 0.03, WOODW, C_FRAME)
    for k in range(1, bars_h + 1):
        v = v0 + (v1 - v0) * k / (bars_h + 1)
        fill2d(fr, [rect(s0, v - bar / 2, s1, v + bar / 2)], -D + 0.025, WOODW, C_FRAME)


def cross_window(F, tc, wd, h0, h1, ht=None, D=0.24, harp=True, sill=True, mullion=True, panes=(2, 1, 1, 1)):
    """a cross window (croisee) at t = tc in facade F, sill h0, head h1, transom at ht (None: no transom): the stone
    surround (lintel + harped jambs) rasterised into F, the reveal, the stone cross, four lights; panes = (lower lights'
    horizontal bars, vertical bars, upper lights' horizontal, vertical)"""
    seg, fr = F.seg, F.seg.fr
    t0, t1 = tc - wd / 2, tc + wd / 2
    if not XFAR():
        F.add(SW, t0 - 0.13, t1 + 0.13, h1, h1 + 0.24)                     # lintel
        if harp:
            F.harp(t0, -1, h0, h1); F.harp(t1, 1, h0, h1)
        else:
            F.add(SW, t0 - 0.13, t1 + 0.13, h0 - 0.02, h1)
    F.hole(t0, t1, h0, h1)
    hole = sloop(seg, t0, t1, h0, h1)
    if XFAR():
        strip2d(fr, hole, 0.0, -0.07, SW, C_SUR); fill2d(fr, [hole], -0.07, GLASS, lit_code()); return
    strip2d(fr, hole, 0.0, -D, SW, C_SUR)
    fill2d(fr, [hole], -D, GLASS, lit_code())
    (s0, v0), (s1, v1) = hole[0], hole[2]
    sc = (s0 + s1) / 2; mw = 0.13
    vt = hz(ht) if ht is not None else None
    if FAR():                       # LOD1: the cross as flat stone strips just in front of the glass
        if mullion: fill2d(fr, [rect(sc - mw / 2, v0, sc + mw / 2, v1)], -D + 0.04, SW, C_SUR)
        if vt is not None:
            fill2d(fr, [rect(s0, vt, sc - mw / 2, vt + mw)], -D + 0.035, SW, C_SUR)
            fill2d(fr, [rect(sc + mw / 2, vt, s1, vt + mw)], -D + 0.035, SW, C_SUR)
        return
    if mullion:
        fbox(fr, sc - mw / 2, sc + mw / 2, v0, v1, -D, -0.05, SW, C_SUR, skip=("back", "top", "bottom"))
    cols = [(s0, sc - mw / 2), (sc + mw / 2, s1)] if mullion else [(s0, s1)]
    if vt is not None:
        for a, b in cols:
            fbox(fr, a, b, vt, vt + mw, -D, -0.06, SW, C_SUR, skip=("back", "left", "right"))
        rows = [(v0, vt, panes[0], panes[1]), (vt + mw, v1, panes[2], panes[3])]
    else:
        rows = [(v0, v1, panes[0], panes[1])]
    for a, b in cols:
        for c, d, bh, bv in rows:
            lights(fr, rect(a, c, b, d), D, bars_v=bv, bars_h=bh)
    if sill:
        fbox(fr, s0 - 0.17, s1 + 0.17, v0 - 0.15, v0, 0.0, 0.07, SW, C_SILL)


def vent(F, tc, wd=0.95, h0=102.6, h1=103.4, D=0.14):
    """a basement vent: blue stone frame (rasterised), a dark louvred grille"""
    seg, fr = F.seg, F.seg.fr
    t0, t1 = tc - wd / 2, tc + wd / 2
    if not XFAR(): F.add(BS, t0 - 0.13, t1 + 0.13, h0 - 0.12, h1 + 0.12)
    F.hole(t0, t1, h0, h1)
    hole = sloop(seg, t0, t1, h0, h1)
    if XFAR():
        strip2d(fr, hole, 0.0, -0.06, BS, C_PLINTH); fill2d(fr, [hole], -0.06, WOODD, C_LOUVRE); return
    strip2d(fr, hole, 0.0, -D, BS, C_PLINTH)
    fill2d(fr, [hole], -D, WOODD, C_LOUVRE)
    if FAR(): return
    (s0, v0), (s1, v1) = hole[0], hole[2]
    n = 5; step = (v1 - v0) / n
    for k in range(n):
        v = v1 - k * step - 0.02
        face_dir([fr.p(s0, v, -0.03), fr.p(s1, v, -0.03), fr.p(s1, v - step * 0.9, -D + 0.02), fr.p(s0, v - step * 0.9, -D + 0.02)],
                 fr.N + Z * 0.8, WOODD, C_LOUVRE)


# ------------------------------------------------------------------------------------------------ roofs
def roof_face(pts_uw, hfun, mat=SLATE, code=C_PLAIN):
    """one planar roof face (top only) over (u, w) points (any simple polygon) at h = hfun(u, w), facing up"""
    K.B.new_group(); flat_group()
    vs = [Vector((u, -w, 0)) for u, w in pts_uw]
    for t in tessellate_polygon([vs]):
        tri = [P(pts_uw[i][0], pts_uw[i][1], hfun(*pts_uw[i])) for i in t]
        n = (tri[1] - tri[0]).cross(tri[2] - tri[0])
        if n.length < 1e-9: continue
        face_dir(tri, Z, mat, code)


def plane_h(h0, k, du, dw, u0, w0):
    """h = h0 + k * ((u - u0) * du + (w - w0) * dw) (du, dw: the unit uphill direction in plan)"""
    return lambda u, w: h0 + k * ((u - u0) * du + (w - w0) * dw)


def dormer(roof_h, k, n_in, c, uf, half, eave, apex, win=(0.9, 1.25), face=WOODW, ov=0.1, sill_h=None):
    """a gabled dormer on a roof plane. n_in = the plan direction INTO the roof (uphill): (1, 0), (-1, 0), (0, 1) or (0, -1);
    the front wall is the vertical plane at plan coordinate `uf` along that axis, centred on `c` (the other coordinate),
    half width `half`; cheeks (slate) down to the roof plane; a slate gable roof (eaves `eave`, ridge `apex`, overhang
    `ov`) running back into the roof. roof_h(u, w) = the main roof's height, k its slope (rise per metre uphill)."""
    du, dw = n_in
    sg = du + dw                                       # +1 / -1: uphill toward + / - of the axis
    def pt(a, x): return (a, c + x) if du != 0 else (c + x, a)
    def B(a, x, h):
        q = pt(a, x); return P(q[0], q[1], h)
    hb = roof_h(*pt(uf, 0.0))
    a_cheek = uf + sg * (eave - hb) / k                # the cheek tops (at the eave height) meet the roof here
    a_ridge = uf + sg * (apex - hb) / k
    out = Vector((-du, dw, 0))                         # Blender, against n_in
    inn = -out
    across = Vector((0, -1, 0)) if du != 0 else Vector((1, 0, 0))   # Blender direction of +x
    K.B.new_group()
    ww, wh = win
    w0 = hb + 0.2 if sill_h is None else sill_h
    loop = [(-half, hb), (half, hb), (half, eave), (0.0, apex), (-half, eave)]
    if XFAR():
        face_dir([B(uf, x, z) for x, z in loop], out, face, C_PLAIN)
    else:
        hole = [(-ww / 2, w0), (ww / 2, w0), (ww / 2, w0 + wh), (-ww / 2, w0 + wh)]
        flat = loop + hole
        for t in tessellate_polygon([[Vector((x, z, 0)) for x, z in loop], [Vector((x, z, 0)) for x, z in hole]]):
            face_dir([B(uf, flat[i][0], flat[i][1]) for i in t], out, face, C_PLAIN)
        D = 0.12 if not FAR() else 0.06
        hl = [B(uf, x, z) for x, z in hole]
        cen = sum(hl, Vector()) / 4
        for i in range(4):
            a_, b_ = hl[i], hl[(i + 1) % 4]
            face_dir([a_, b_, b_ + inn * D, a_ + inn * D], cen - (a_ + b_) / 2, face, C_SUR)
        face_dir([p + inn * D for p in hl], out, GLASS, lit_code())
        if not FAR():                                  # the frame's mullion + transom: flat bars in front of the glass
            ib = inn * (D - 0.03); m = 0.05; zt = w0 + wh * 0.62
            for (x0, z0, x1, z1) in ((-m / 2, w0, m / 2, w0 + wh), (-ww / 2, zt, -m / 2, zt + m), (m / 2, zt, ww / 2, zt + m)):
                face_dir([B(uf, x0, z0) + ib, B(uf, x1, z0) + ib, B(uf, x1, z1) + ib, B(uf, x0, z1) + ib], out, WOODW, C_FRAME)
    for x in (-half, half):                            # the cheeks down to the roof plane
        face_dir([B(uf, x, hb), B(uf, x, eave), B(a_cheek, x, eave)], across * (1 if x > 0 else -1), SLATE, C_PLAIN)
    kd = (apex - eave) / half
    e_ov = eave - kd * ov
    a_back = uf + sg * (e_ov - hb) / k                 # the overhang's edge meets the main roof here
    a_f = uf - sg * ov
    th = 0.07
    for x in (-1, 1):
        pts = [B(a_f, 0.0, apex), B(a_f, x * (half + ov), e_ov), B(a_back, x * (half + ov), e_ov), B(a_ridge, 0.0, apex)]
        up_ = across * x * kd + Z
        K.B.new_group(); flat_group()
        face_dir(pts, up_, SLATE, C_PLAIN)
        if XFAR(): continue
        face_dir([p - Z * th for p in pts], -up_, WOODW, C_FRAME)                       # the slab's underside (soffits)
        e1, e2 = pts[0], pts[1]
        face_dir([e1, e2, e2 - Z * th, e1 - Z * th], out, WOODW, C_FRAME)               # the barge board at the front
        s1, s2 = pts[1], pts[2]
        face_dir([s1, s2, s2 - Z * th, s1 - Z * th], across * x, ZINC, C_GUTTER)        # the side edge
    K.B.new_group()


def chimney(u, w, base, top, hw=0.48, hd=0.36, lvl_bands=(), cap=0.12):
    """a brick chimney stack (axis-aligned in u / w) from `base` (buried in the roof) to `top`: stone bands + a cap slab"""
    c = P(u, w, OY)
    ax, ay = Vector((1, 0, 0)), Vector((0, 1, 0))
    wbox(c, ax, ay, hd, hw, hz(base), hz(top - cap), BRICK, C_PLAIN, skip=("bottom",))
    if XFAR(): return
    for h in lvl_bands:
        wbox(c, ax, ay, hd + 0.04, hw + 0.04, hz(h), hz(h + 0.16), SW, C_BAND, skip=("bottom",) if FAR() else ())
    wbox(c, ax, ay, hd + 0.07, hw + 0.07, hz(top - cap), hz(top), SW, C_COPING)
    if not FAR():                      # two terracotta-coloured flue pots (brick slot)
        for s in (-hw * 0.45, hw * 0.45):
            SC.lathe(P(u, w + s, top), [(0.11, 0.0), (0.12, 0.05), (0.09, 0.32), (0.1, 0.36), (0.0, 0.36)], 8, BRICK, C_PLAIN)
