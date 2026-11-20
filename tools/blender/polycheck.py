"""POLYGON-WITH-HOLES GUARD for the hero kits' fill2d (claude/heroshell 2026-11-18, QUALITY_RULES rule 29).

WHY: Saint-Pierre's south wall lost ~50 m2 of stone and brick (owner playtest 2026-11-18, screenshot 88) because two
holes handed to one fill2d overlapped (the porch bay's panel was cut at bay 4 while bay 4 also cut its own panel).
mathutils.geometry.tessellate_polygon does not fail on overlapping / crossing / outside holes: it silently returns a
broken triangulation, so whole wall pieces disappear and stray triangles appear, and nothing downstream noticed.

RULE: every polygon fill (outer loop + holes) is checked before it is triangulated: each hole lies inside the outer
loop, and no two holes cross or contain each other. A violation is an error at build time (POLYCHECK=raise, the
default) or a printed warning (POLYCHECK=warn, to survey an old script).

    from polycheck import check_fill
    check_fill(loops, where="south wall")          # loops[0] = outer, loops[1:] = holes, 2D (s, v) tuples
"""
import os

EPS = 1e-6
MODE = os.environ.get("POLYCHECK", "raise")
REPORT = []          # (where, problem) of every violation seen in this run (warn mode keeps going)


def _orient(a, b, c):
    return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0])


def _cross(p1, p2, q1, q2):
    """proper crossing of two segments (touching / collinear overlap is not a crossing)"""
    d1, d2 = _orient(q1, q2, p1), _orient(q1, q2, p2)
    d3, d4 = _orient(p1, p2, q1), _orient(p1, p2, q2)
    return ((d1 > EPS and d2 < -EPS) or (d1 < -EPS and d2 > EPS)) and ((d3 > EPS and d4 < -EPS) or (d3 < -EPS and d4 > EPS))


def _on_seg(p, a, b):
    if abs(_orient(a, b, p)) > EPS * max(1.0, abs(b[0] - a[0]) + abs(b[1] - a[1])): return False
    return min(a[0], b[0]) - EPS <= p[0] <= max(a[0], b[0]) + EPS and min(a[1], b[1]) - EPS <= p[1] <= max(a[1], b[1]) + EPS


def _where(p, loop):
    """1 inside, 0 on the boundary, -1 outside"""
    n = len(loop); inside = False
    for i in range(n):
        a, b = loop[i], loop[(i + 1) % n]
        if _on_seg(p, a, b): return 0
        if (a[1] > p[1]) != (b[1] > p[1]):
            x = a[0] + (p[1] - a[1]) * (b[0] - a[0]) / (b[1] - a[1])
            if x > p[0]: inside = not inside
    return 1 if inside else -1


def _bbox(l):
    xs = [p[0] for p in l]; ys = [p[1] for p in l]
    return min(xs), min(ys), max(xs), max(ys)


def _probes(l, off=2e-3):
    """points just inside a loop: each edge's midpoint moved off m along the inward normal (any winding)"""
    a2 = sum(l[i][0] * l[(i + 1) % len(l)][1] - l[(i + 1) % len(l)][0] * l[i][1] for i in range(len(l)))
    sg = 1.0 if a2 > 0 else -1.0
    out = []
    for i in range(len(l)):
        a, b = l[i], l[(i + 1) % len(l)]
        dx, dy = b[0] - a[0], b[1] - a[1]; L = (dx * dx + dy * dy) ** 0.5
        if L < 10 * off: continue
        out.append(((a[0] + b[0]) / 2 - sg * dy / L * off, (a[1] + b[1]) / 2 + sg * dx / L * off))
    return out


def _edges_cross(A, B):
    for i in range(len(A)):
        a1, a2 = A[i], A[(i + 1) % len(A)]
        for j in range(len(B)):
            if _cross(a1, a2, B[j], B[(j + 1) % len(B)]): return (a1, a2)
    return None


def problems(loops):
    out = []
    if len(loops) < 2: return out
    outer, holes = loops[0], loops[1:]
    for k, h in enumerate(holes):
        if any(_where(p, outer) < 0 for p in h + _probes(h)): out.append(f"hole {k + 1} goes outside the outer loop (bbox {_fmt(_bbox(h))})")
        elif _edges_cross(h, outer): out.append(f"hole {k + 1} crosses the outer loop (bbox {_fmt(_bbox(h))})")
    boxes = [_bbox(h) for h in holes]
    for i in range(len(holes)):
        for j in range(i + 1, len(holes)):
            bi, bj = boxes[i], boxes[j]
            if bi[2] < bj[0] - EPS or bj[2] < bi[0] - EPS or bi[3] < bj[1] - EPS or bj[3] < bi[1] - EPS: continue
            if (_edges_cross(holes[i], holes[j]) or any(_where(p, holes[j]) > 0 for p in holes[i] + _probes(holes[i]))
                    or any(_where(p, holes[i]) > 0 for p in holes[j] + _probes(holes[j]))):
                out.append(f"holes {i + 1} and {j + 1} overlap (bbox {_fmt(bi)} / {_fmt(bj)})")
    return out


def _fmt(b): return "(" + ", ".join(f"{v:.2f}" for v in b) + ")"


def check_fill(loops, where=""):
    pr = problems([[(float(p[0]), float(p[1])) for p in l] for l in loops])
    for p in pr:
        REPORT.append((where, p))
        msg = f"POLYCHECK {where}: {p}"
        if MODE == "raise": raise ValueError(msg)
        print(msg)
    return pr
