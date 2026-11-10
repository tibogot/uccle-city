"""VILLA VAN BUUREN: brick walls with raked bed joints as geometry (LOD0) or flat (far), for tools/blender/vanbuuren.py.

Every face is a LADDER of quads split where a neighbouring face has a vertex on the shared line: no T-junctions
between the course strips, the grooves, the reveals, the heads and the sills.
"""
from mathutils import Vector
from vanbuuren_kit import (K, Z, face_dir, course_bands, snap_course, BRICK, C_PLAIN, C_COURSE, C_JOINT, C_REVEAL,
                           GROOVE, COURSE_BASE)


class Opening:
    """a rectangular hole in a course field: s0..s1, h0..h1 (m TAW; snapped to the course lines: the sill on a brick
    face's top, the head under a brick face); depth = the reveal's depth; jambs / head / sill: 'brick' (course-split
    brick faces) or None (something else closes it: a concrete box frame, a sill block, a lintel)"""
    def __init__(self, s0, s1, h0, h1, depth=0.12, jambs="brick", head="brick", sill="brick", snap=True):
        if snap: h0, h1 = snap_course(h0, "j0"), snap_course(h1, "f0")
        self.__dict__.update(s0=s0, s1=s1, h0=h0, h1=h1, depth=depth, jambs=jambs, head=head, sill=sill)


def _bis(top, h, lo, hi, up):
    for _ in range(44):
        m = (lo + hi) / 2
        if (top(m) >= h) == up: hi = m
        else: lo = m
    return hi if up else lo


def _intervals(sr, ops, a, b):
    if sr is None: return []
    iv = [list(sr)]
    for o in ops:
        if o.h0 < b - 1e-6 and o.h1 > a + 1e-6:
            nxt = []
            for (x0, x1) in iv:
                if o.s1 <= x0 or o.s0 >= x1: nxt.append([x0, x1]); continue
                if o.s0 > x0: nxt.append([x0, o.s0])
                if o.s1 < x1: nxt.append([o.s1, x1])
            iv = nxt
    return [(x0, x1) for x0, x1 in iv if x1 - x0 > 1e-4]


def ladder(pa, pb, xa, xb, extra_a, extra_b, mat, code, want, uvf=None):
    """quads between a bottom chain and a top chain: pa(s) / pb(s) give the points, the bottom runs xa = (s0, s1), the
    top xb = (t0, t1) (other ends at rakes); extra_a / extra_b = vertices neighbours put on these lines; interior
    splits are straight across"""
    lo, hi = max(xa[0], xb[0]), min(xa[1], xb[1])
    inner = lambda x: lo + 1e-5 < x < hi - 1e-5
    cuts = sorted(set(round(x, 6) for x in list(extra_a) + list(extra_b) if inner(x)))
    ea = sorted(set(round(x, 6) for x in extra_a if xa[0] + 1e-5 < x < xa[1] - 1e-5 and not inner(x)))
    eb = sorted(set(round(x, 6) for x in extra_b if xb[0] + 1e-5 < x < xb[1] - 1e-5 and not inner(x)))
    xs = [None] + cuts + [None]
    for i in range(len(xs) - 1):
        a0 = xa[0] if xs[i] is None else xs[i]; a1 = xa[1] if xs[i + 1] is None else xs[i + 1]
        b0 = xb[0] if xs[i] is None else xs[i]; b1 = xb[1] if xs[i + 1] is None else xs[i + 1]
        bot = [a0] + [x for x in ea if a0 < x < a1] + [a1]
        tp = [b0] + [x for x in eb if b0 < x < b1] + [b1]
        pts = [pa(x) for x in bot] + [pb(x) for x in reversed(tp)]
        uvs = ([uvf(x, 0) for x in bot] + [uvf(x, 1) for x in reversed(tp)]) if uvf else None
        q, quv = [], []
        for k, pt in enumerate(pts):
            if q and (pt - q[-1]).length < 1e-6: continue
            q.append(pt); quv.append(uvs[k] if uvs else None)
        if len(q) > 3 and (q[0] - q[-1]).length < 1e-6: q.pop(); quv.pop()
        if len(q) >= 3: face_dir(q, want, mat, code, quv if uvs else None)


def wall_field(fr, s_a, s_b, h_bot, top, openings=(), ends=("convex", "convex"), mat=BRICK, far=None, region=None, mat_split=None):
    """A brick wall on frame fr between s_a and s_b, from h_bot up to the profile top(s) (callable, unimodal: an eave
    line, a gable, eave-gable-eave), minus the openings.
    LOD0: courses as geometry: brick faces at d = 0, the bed joints raked GROOVE deep (back face + the groove's top and
    bottom), perpends flush (material). Ends: 'convex' (the groove stops GROOVE short, capped: the corner brick is
    solid), 'concave' (the groove runs GROOVE past the end, capped: it meets the other wall's groove), 'concave2' (the
    other wall owns the corner: the groove starts at the end, no cap), 'free' (capped at the end). Jambs of brick
    openings are convex corners.
    FAR: flat faces (joints in the material), split only at the opening levels.
    mat_split = (h, slot): above h the field is in that slot (the gable tops' patterned brick).
    Returns the field's pieces (for heads / sills of things attached to it)."""
    far = K.FAR if far is None else far
    B = K.B; g = GROOVE; hb = COURSE_BASE
    sv_rw, sv_lp = B.rw_cur, B.lp_cur
    wide = region if region is not None else max(0.5, min(abs(s_b - s_a), 8.0))
    B.new_group()
    B.lp_cur = (B.grp, fr.O.copy(), fr.U.copy(), fr.N.copy())          # one planar lightmap island per field
    ops = list(openings)

    def s_range(h):
        n = 48
        xs = [s_a + (s_b - s_a) * i / n for i in range(n + 1)]
        ins = [top(x) >= h - 1e-9 for x in xs]
        if not any(ins): return None
        i0 = ins.index(True); i1 = n - ins[::-1].index(True)
        a = s_a if i0 == 0 else _bis(top, h, xs[i0 - 1], xs[i0], True)
        b = s_b if i1 == n else _bis(top, h, xs[i1], xs[i1 + 1], False)
        return a, b
    hmax = max(top(s_a + (s_b - s_a) * i / 400) for i in range(401))

    def kind_at(x, sr):
        for o in ops:
            if abs(x - o.s0) < 1e-5 or abs(x - o.s1) < 1e-5: return "convex" if o.jambs == "brick" else "free"
        if abs(x - s_a) < 1e-5 and abs(sr[0] - s_a) < 1e-5: return ends[0]
        if abs(x - s_b) < 1e-5 and abs(sr[1] - s_b) < 1e-5: return ends[1]
        return "rake"
    def slot_at(a): return mat_split[1] if (mat_split and a >= mat_split[0] - 1e-6) else mat
    if far:
        levels = sorted(set([h_bot, hmax] + [o.h0 for o in ops] + [o.h1 for o in ops] + ([mat_split[0]] if mat_split else [])))
        levels = [x for x in levels if h_bot - 1e-6 <= x <= hmax + 1e-6]
        bands = [(levels[i], levels[i + 1], "f") for i in range(len(levels) - 1)]
    else:
        bands = course_bands(h_bot, hmax)
        if mat_split:
            bands = [x for (a, b, k) in bands for x in ([(a, mat_split[0], k), (mat_split[0], b, k)] if a < mat_split[0] < b else [(a, b, k)])]
    # pass 1: the pieces of every band
    pieces = []
    for (a, b, kind) in bands:
        ra, rb = s_range(a + 1e-6), s_range(b - 1e-6)
        if ra is None: pieces.append((a, b, kind, [])); continue
        if rb is None: m_ = (ra[0] + ra[1]) / 2; rb = (m_, m_)
        lst = []
        for (x0, x1) in _intervals(ra, ops, a, b):
            k0, k1 = kind_at(x0, ra), kind_at(x1, ra)
            y0 = rb[0] if k0 == "rake" else x0
            y1 = rb[1] if k1 == "rake" else x1
            if y1 < y0: y0 = y1 = (y0 + y1) / 2
            lst.append(dict(x0=x0, x1=x1, y0=y0, y1=y1, k0=k0, k1=k1))
        pieces.append((a, b, kind, lst))
    sh = {"convex": g, "concave": -g}

    def verts(i, line):
        """the d = 0 vertices band i puts on its bottom (line 0) or top (line 1)"""
        a, b, kind, lst = pieces[i]; out = []
        for pc in lst:
            e0, e1 = (pc["x0"], pc["x1"]) if line == 0 else (pc["y0"], pc["y1"])
            out += [e0, e1]
            if not far:
                if pc["k0"] in sh: out.append(e0 + sh[pc["k0"]])
                if pc["k1"] in sh: out.append(e1 - sh[pc["k1"]])
        return out

    def line_verts(i, line):
        a, b, kind, lst = pieces[i]; h = a if line == 0 else b
        v = verts(i, line)
        j = i - 1 if line == 0 else i + 1
        if 0 <= j < len(pieces): v += verts(j, 1 if line == 0 else 0)
        for o in ops:
            if abs(o.h1 - h) < 1e-5 or abs(o.h0 - h) < 1e-5:
                v += [o.s0, o.s1]
        return v
    for i, (a, b, kind, lst) in enumerate(pieces):
        m = slot_at(a)
        Va, Vb = line_verts(i, 0), line_verts(i, 1)
        uvf = lambda x, t, a=a, b=b: (x, (a if t == 0 else b) - hb)
        pa0 = lambda x, a=a: fr.p(x, a, 0.0); pb0 = lambda x, b=b: fr.p(x, b, 0.0)
        for pc in lst:
            x0, x1, y0, y1, k0, k1 = pc["x0"], pc["x1"], pc["y0"], pc["y1"], pc["k0"], pc["k1"]
            B.rw_cur = wide
            if kind == "f" or far:
                ladder(pa0, pb0, (x0, x1), (y0, y1), Va, Vb, m, C_PLAIN if far else C_COURSE, fr.N, uvf)
                continue
            e0a, e1a = x0 + sh.get(k0, 0.0), x1 - sh.get(k1, 0.0)
            e0b, e1b = y0 + sh.get(k0, 0.0), y1 - sh.get(k1, 0.0)
            if e1a - e0a < 1e-4:            # too short for a groove: solid
                ladder(pa0, pb0, (x0, x1), (y0, y1), Va, Vb, m, C_COURSE, fr.N, uvf)
                continue
            if k0 == "convex": ladder(pa0, pb0, (x0, e0a), (y0, e0b), Va, Vb, m, C_COURSE, fr.N, uvf)
            if k1 == "convex": ladder(pa0, pb0, (e1a, x1), (e1b, y1), Va, Vb, m, C_COURSE, fr.N, uvf)
            ladder(lambda x, a=a: fr.p(x, a, -g), lambda x, b=b: fr.p(x, b, -g), (e0a, e1a), (e0b, e1b), Va, Vb, m, C_JOINT, fr.N, uvf)
            B.rw_cur = 0.02                  # the groove's top / bottom: thin (fade to the wall far away)
            ladder(pa0, lambda x, a=a: fr.p(x, a, -g), (e0a, e1a), (e0a, e1a), Va, Va, m, C_JOINT, Z, None)
            if e1b - e0b > 1e-5:
                ladder(pb0, lambda x, b=b: fr.p(x, b, -g), (e0b, e1b), (e0b, e1b), Vb, Vb, m, C_JOINT, -Z, None)
            for (kind_, e_a, e_b, sgn) in ((k0, e0a, e0b, -1), (k1, e1a, e1b, 1)):
                if kind_ in ("convex", "concave", "free"):
                    face_dir([fr.p(e_a, a, -g), fr.p(e_a, a, 0.0), fr.p(e_b, b, 0.0), fr.p(e_b, b, -g)], fr.U * (-sgn), m, C_JOINT)
    # reveals: jambs split at every course line, heads / sills split where the touching bands have vertices
    B.rw_cur = None; B.lp_cur = None
    for o in ops:
        d = o.depth
        if o.jambs == "brick":
            lv = sorted(set([o.h0, o.h1] + ([] if far else [x for (aa, bb, kk) in course_bands(o.h0, o.h1) for x in (aa, bb)])))
            lv = [x for x in lv if o.h0 - 1e-6 <= x <= o.h1 + 1e-6]
            for (s_, want) in ((o.s0, fr.U), (o.s1, -fr.U)):
                for i in range(len(lv) - 1):
                    a, b = lv[i], lv[i + 1]
                    face_dir([fr.p(s_, a, 0.0), fr.p(s_, b, 0.0), fr.p(s_, b, -d), fr.p(s_, a, -d)], want, mat, C_REVEAL,
                             [(0.0, a - hb), (0.0, b - hb), (d, b - hb), (d, a - hb)])
        for (h, want, ok) in ((o.h1, -Z, o.head == "brick"), (o.h0, Z, o.sill == "brick")):
            if not ok: continue
            vv = []
            for i, (a, b, kind, lst) in enumerate(pieces):
                if abs(a - h) < 1e-5: vv += verts(i, 0)
                if abs(b - h) < 1e-5: vv += verts(i, 1)
            vv = [x for x in vv if o.s0 < x < o.s1]
            ladder(lambda x, h=h: fr.p(x, h, 0.0), lambda x, h=h: fr.p(x, h, -d), (o.s0, o.s1), (o.s0, o.s1), vv, [], mat, C_REVEAL, want)
    B.rw_cur, B.lp_cur = sv_rw, sv_lp
    return pieces
