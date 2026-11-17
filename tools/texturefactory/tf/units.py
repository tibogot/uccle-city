"""Per-unit layouts (Substance's Tile Generator + Flood Fill, done exactly): bricks, ashlar, setts, slates, tiles.

`courses()` lays rows ("courses") across a tileable square; each course is cut into units of their OWN length (a
random partition of the tile width, so the pattern wraps), with a phase per course (running bond, cross bond, random
setts). For every texel it returns the unit id, the local coordinates in the unit (metres, centred, after the unit's
own tilt), its half size, and the signed distance to its (rounded, joint-shrunk) rectangle: < 0 inside the unit.
"""
import numpy as np

f32 = np.float32


def rounded_box(lx, ly, hx, hy, r):
    """signed distance (m) to a rounded rectangle of half size hx, hy and corner radius r (negative inside)"""
    qx = np.abs(lx) - (hx - r)
    qy = np.abs(ly) - (hy - r)
    out = np.sqrt(np.maximum(qx, 0) ** 2 + np.maximum(qy, 0) ** 2) + np.minimum(np.maximum(qx, qy), 0) - r
    return out.astype(f32)


def courses(T, n_courses, lengths, phase, k, joint=0.01, joint_jit=0.0015, unit_h=None, h_jit=0.0,
            dy_jit=0.0, tilt_deg=0.0, corner_r=0.002, kinds=None):
    """
    T          the Tex
    n_courses  number of courses per tile (course pitch = T.size / n_courses)
    lengths    f(rng, c) -> list of nominal unit lengths (pitch incl. joint) for course c (rescaled to sum to the width)
    phase      f(rng, c, lens) -> x offset (m) of the course's first joint
    joint      mean joint width (m); joint_jit: +- per unit edge
    unit_h     unit height (m, excl. joint) per course (default pitch - joint); h_jit: +- per unit
    dy_jit     +- vertical offset of a unit in its course (m); tilt_deg: +- rotation per unit
    kinds      f(c) -> int kind code of the course's units (e.g. 0 stretcher, 1 header)
    """
    N, W = T.N, T.size
    rng = T.child(k)
    pitch = W / n_courses
    xs = T.xx[0]
    ids = np.zeros((N, N), np.int32)
    lx = np.zeros((N, N), f32)
    ly = np.zeros((N, N), f32)
    hx = np.zeros((N, N), f32)
    hy = np.zeros((N, N), f32)
    row = np.zeros((N, N), np.int32)
    kind = np.zeros((N, N), np.int8)
    jl = np.zeros((N, N), f32)        # joint half widths: left/right and top/bottom of the unit
    jv = np.zeros((N, N), f32)
    nid = 0
    rows_y = T.yy[:, 0]
    info = []
    for c in range(n_courses):
        lens = np.array(lengths(rng, c), dtype=np.float64)
        lens *= W / lens.sum()
        off = phase(rng, c, lens) % W
        b = (np.concatenate([[0], np.cumsum(lens)[:-1]]) + off) % W
        order = np.argsort(b)
        b, L = b[order], lens[order]
        # x -> unit index in this course (periodic)
        i = np.searchsorted(b, xs, side="right") - 1
        i = np.where(i < 0, len(b) - 1, i)
        cx = b[i] + L[i] / 2
        dx = (xs - cx + W / 2) % W - W / 2                     # wrapped local x
        n = len(b)
        u_ids = nid + np.arange(n)
        nid += n
        # per-unit randoms
        uh = (unit_h if unit_h is not None else pitch - joint) + rng.uniform(-h_jit, h_jit, n)
        udy = rng.uniform(-dy_jit, dy_jit, n)
        ut = np.radians(rng.uniform(-tilt_deg, tilt_deg, n))
        ujl = joint / 2 + rng.uniform(-joint_jit, joint_jit, n)
        ujv = (pitch - uh) / 2
        y0 = c * pitch
        sel = (rows_y >= y0) & (rows_y < y0 + pitch)
        rr = np.nonzero(sel)[0]
        yl = (rows_y[rr] - (y0 + pitch / 2))[:, None] - udy[i][None, :]
        xl = np.broadcast_to(dx[None, :], yl.shape)
        ca, sa = np.cos(ut[i])[None, :], np.sin(ut[i])[None, :]
        lx[rr] = xl * ca + yl * sa
        ly[rr] = -xl * sa + yl * ca
        ids[rr] = u_ids[i][None, :]
        hx[rr] = (L[i] / 2 - ujl[i])[None, :]
        hy[rr] = (uh[i] / 2)[None, :]
        jl[rr] = ujl[i][None, :]
        jv[rr] = ujv[i][None, :]
        row[rr] = c
        kind[rr] = kinds(c) if kinds else 0
        info.append({"course": c, "n": n, "lengths": L.tolist()})
    d = rounded_box(lx, ly, hx, hy, corner_r)
    return {"id": ids, "n": nid, "lx": lx, "ly": ly, "hx": hx, "hy": hy, "d": d, "row": row, "kind": kind,
            "pitch": pitch, "info": info}


def fixed_count_lengths(count_fn, nominal_fn, jit):
    """lengths(rng, c): count_fn(c) units of nominal_fn(c) +- jit (later rescaled to the tile width exactly)"""
    def f(rng, c):
        return [nominal_fn(c) + rng.uniform(-jit, jit) for _ in range(count_fn(c))]
    return f


def random_lengths(W, lo, hi):
    """lengths(rng, c) for setts / ashlar / slates: random lengths in [lo, hi] filling the width W"""
    def f(rng, c):
        out, s = [], 0.0
        while True:
            l = rng.uniform(lo, hi)
            if s + l > W - lo * 0.5:
                break
            out.append(l)
            s += l
        if not out:
            out = [W]
        return out
    return f


def herringbone(T, n_w, joint=0.005, joint_jit=0.0008, dxy_jit=0.0008, corner_r=0.003):
    """2:1 HERRINGBONE (90 degrees, "keperverband"): bricks w x 2w, w = T.size / n_w (n_w a multiple of 4 so it tiles),
    laid in L-shaped steps: a horizontal brick [0, 2w] x [0, w] and a vertical one [0, w] x [w, 3w] per lattice cell
    (n + 2m, n - 2m) w (a fundamental domain of the tiling, area 4 w^2). Returns what courses() returns (id, n, lx / ly
    along / across the brick's own long axis, hx, hy, d < 0 inside, kind 0 horizontal / 1 vertical). The tile repeats
    by (n_w, 0) and (0, n_w) w; a sampler may shift it only by multiples of 4 w on each axis (X = Y mod 4 keeps the
    lattice): lattice [n_w / 4, n_w / 2] in streets.json."""
    assert n_w % 4 == 0
    N, W = T.N, T.size
    w = W / n_w
    rng = T.child(77)
    px = (T.xx / w).astype(np.float64)
    py = (T.yy / w).astype(np.float64)
    n0 = np.floor((px + py) / 2)
    m0 = np.floor((px - py) / 4)
    ids = np.full((N, N), -1, np.int32)
    lx = np.zeros((N, N), f32)
    ly = np.zeros((N, N), f32)
    kind = np.zeros((N, N), np.int8)
    for dn in (-1, 0):
        for dm in (0, 1):
            n = n0 + dn
            m = m0 + dm
            X = n + 2 * m
            Y = n - 2 * m
            qx = px - X
            qy = py - Y
            inH = (qx >= 0) & (qx < 2) & (qy >= 0) & (qy < 1) & (ids < 0)
            inV = (qx >= 0) & (qx < 1) & (qy >= 1) & (qy < 3) & (ids < 0) & ~inH
            key = (np.mod(X, n_w) * n_w + np.mod(Y, n_w)).astype(np.int32) * 2
            ids = np.where(inH, key, ids)
            ids = np.where(inV, key + 1, ids)
            lx = np.where(inH, (qx - 1) * w, np.where(inV, (qy - 2) * w, lx))
            ly = np.where(inH, (qy - 0.5) * w, np.where(inV, (qx - 0.5) * w, ly))
            kind = np.where(inV, 1, kind).astype(np.int8)
    assert (ids >= 0).all(), "herringbone: a texel in no brick"
    nid = 2 * n_w * n_w
    ujl = joint / 2 + rng.uniform(-joint_jit, joint_jit, nid)
    udx = rng.uniform(-dxy_jit, dxy_jit, nid)
    udy = rng.uniform(-dxy_jit, dxy_jit, nid)
    lx = (lx - udx[ids]).astype(f32)
    ly = (ly - udy[ids]).astype(f32)
    hx = (w - ujl[ids]).astype(f32)
    hy = (w / 2 - ujl[ids]).astype(f32)
    d = rounded_box(lx, ly, hx, hy, corner_r)
    return {"id": ids, "n": nid, "lx": lx, "ly": ly, "hx": hx, "hy": hy, "d": d, "row": np.zeros((N, N), np.int32),
            "kind": kind, "pitch": w, "info": []}
