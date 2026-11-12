"""Leaf-spray atlases for the stylized trees' leaf cards, drawn in 2D (no Blender): one card = one spray filling the
unit square, twigs from the centre out, the cluster rounded off: the layout and the file format of
tools/blender/leafAtlas.py + tools/textures/process_tree_textures.py (claude/foundation), so the vendor's
params.leafAtlas takes them unchanged:

  <name>_a.ktx2   RGB albedo (sRGB) + A coverage, COVERAGE-PRESERVING alpha mips (each level keeps the share of texels
                  >= 0.5 of level 0: far crowns don't thin into dots / see-through), colour bled under alpha 0
  <name>_n.ktx2   R,G = the shading normal's x, y in the card frame (OpenGL, +y image up), B = thickness (light
                  through = 1 - B: the translucency map), A = 1
  seasons         <name>_spring_a / <name>_autumn_a: the same spray (same coverage, same _n) recoloured

Per leaf: an outline (polar, per species: lobes, teeth, cordate base, compound leaflets), its own size, angle,
foreshortening (squash across a random axis), colour (hue / value spread, darker toward the petiole, paler veins,
edge browning in autumn, spots), a normal from a fold along the midrib + cupping + vein grooves, thickness (blade 0.25,
veins 0.45, petiole 0.8, twig 1). Rasterised at 2x and area-downsampled (antialiased edges).
"""
import math
import os
import json
import subprocess

import cv2
import numpy as np

from .core import srgb_to_lin, lin_to_srgb, f32, hexcol

KTX = os.environ.get("KTX_EXE", "C:/Program Files/KTX-Software/bin/ktx.exe")


# ------------------------------------------------------------------------------------------------ outlines
def outline(sp, rng, n=180):
    """leaf outline in the leaf frame: x from the petiole end (0) to the tip (~1), y across; list of (x, y)"""
    pts = []
    if sp["shape"] == "palmate":                       # plane / maple: lobes radiating from the base
        lobes = sp["lobes"]
        cx = sp.get("cx", 0.45)
        for i in range(n):
            th = -math.pi + 2 * math.pi * i / n
            r = sp.get("body", 0.5) * (1 - 0.35 * (abs(th) / math.pi) ** 2)
            for a, L in lobes:
                x = th - a
                c = max(0.0, math.cos(x * sp.get("lobe_k", 1.9)))
                r = max(r, L * c ** sp.get("lobe_p", 1.5))
            r *= 1 + sp.get("teeth", 0.07) * max(0.0, math.sin(th * sp.get("nteeth", 13) + rng.uniform(0, 6))) ** 6
            if abs(abs(th) - math.pi) < 0.35:
                r *= 0.55 + 0.45 * (abs(abs(th) - math.pi) / 0.35)
            pts.append((cx + math.cos(th) * r * 0.62, math.sin(th) * r * 0.62))
        return pts, (cx - 0.62 * 0.11, 0.0)
    if sp["shape"] == "ovate":                         # beech / lime / leaflets: half-width profile along the midrib
        w, base, tipk = sp["width"], sp.get("cordate", 0.0), sp.get("tip", 0.75)
        ph = rng.uniform(0, 6)
        def half(t):
            s = math.sin(math.pi * min(1.0, t * 0.94 + 0.03)) ** tipk * (1 - sp.get("taper", 0.3) * t)
            if sp.get("obovate"):
                s = math.sin(math.pi * min(1.0, t ** 1.6 * 0.94 + 0.03)) ** tipk
            tooth = 1 + sp.get("teeth", 0.04) * (abs(math.sin(t * math.pi * sp.get("nteeth", 9) + ph)) ** 3 - 0.3)
            return w * s * tooth
        top = [(t, -half(t)) for t in np.linspace(0, 1, n // 2)]
        bot = [(t, half(t)) for t in np.linspace(1, 0, n // 2)]
        pts = top + bot
        if base > 0:                                   # heart-shaped base: two rounded lobes behind the petiole
            lobe_t = [(-base * 0.5 * math.sin(a), -w * 0.7 * math.cos(a) - w * 0.05) for a in np.linspace(math.pi / 2, 0, 6)]
            lobe_b = [(-base * 0.5 * math.sin(a), w * 0.7 * math.cos(a) + w * 0.05) for a in np.linspace(0, math.pi / 2, 6)]
            pts = lobe_t + top + bot + lobe_b
        return pts, (0.0, 0.0)
    raise ValueError(sp["shape"])


# ------------------------------------------------------------------------------------------------ the spray
class Canvas:
    def __init__(self, R):
        self.R = R
        self.alb = np.zeros((R, R, 3), f32)
        self.a = np.zeros((R, R), f32)
        self.n = np.zeros((R, R, 3), f32)
        self.n[..., 2] = 1
        self.t = np.zeros((R, R), f32)
        self.leaf = np.full((R, R), -1, np.int32)     # leaf index per texel (seasonal recolouring)
        self.u = np.zeros((R, R), f32)                # leaf-frame coordinates per texel
        self.v = np.zeros((R, R), f32)
        self.vein = np.zeros((R, R), f32)


def draw_leaf(C, idx, sp, rng, pos, ang, size, squash, kind="blade"):
    """rasterise one leaf (or leaflet) at pos (px), rotated ang (rad, the midrib's direction), size (px = midrib length)"""
    pts, att = outline(sp, rng)
    pts = np.array(pts, np.float64)
    pts[:, 0] -= att[0]
    pts[:, 1] -= att[1]
    ca, sa = math.cos(ang), math.sin(ang)
    sq_a = rng.uniform(0, math.pi)                      # foreshortening axis
    def to_canvas(p):
        x, y = p[:, 0] * size, p[:, 1] * size
        # squash across sq_a (the leaf seen at a slant)
        cs, sn = math.cos(sq_a), math.sin(sq_a)
        a = x * cs + y * sn
        b = -x * sn + y * cs
        a *= squash
        x, y = a * cs - b * sn, a * sn + b * cs
        return np.stack([pos[0] + x * ca - y * sa, pos[1] + x * sa + y * ca], -1)
    poly = to_canvas(pts)
    x0, y0 = np.floor(poly.min(0)).astype(int) - 2
    x1, y1 = np.ceil(poly.max(0)).astype(int) + 2
    x0, y0 = max(x0, 0), max(y0, 0)
    x1, y1 = min(x1, C.R), min(y1, C.R)
    if x1 <= x0 or y1 <= y0:
        return
    m = np.zeros((y1 - y0, x1 - x0), np.uint8)
    cv2.fillPoly(m, [np.round((poly - [x0, y0]) * 4).astype(np.int32)], 1, lineType=cv2.LINE_8, shift=2)
    sel = m > 0
    if not sel.any():
        return
    gy, gx = np.mgrid[y0:y1, x0:x1].astype(f32)
    # inverse transform to the leaf frame
    dx, dy = gx - pos[0], gy - pos[1]
    x = dx * ca + dy * sa
    y = -dx * sa + dy * ca
    cs, sn = math.cos(sq_a), math.sin(sq_a)
    a = (x * cs + y * sn) / squash
    b = -x * sn + y * cs
    lx = (a * cs - b * sn) / size + att[0]
    ly = (a * sn + b * cs) / size + att[1]
    reg = (slice(y0, y1), slice(x0, x1))
    C.leaf[reg][sel] = idx
    C.u[reg][sel] = lx[sel]
    C.v[reg][sel] = ly[sel]
    C.a[reg][sel] = 1
    # veins
    vw = sp.get("vein_w", 0.012)
    mid = np.exp(-(ly / vw) ** 2) * (lx > 0) * (lx < 0.95)
    if sp["veins"] == "palmate":
        r = np.sqrt((lx - 0.07) ** 2 + ly ** 2) + 1e-6
        th = np.arctan2(ly, lx - 0.07)
        lat = np.zeros_like(lx)
        for a0, L in sp["lobes"]:
            d = np.abs(np.sin(th - a0)) * r
            lat = np.maximum(lat, np.exp(-(d / vw) ** 2) * (r < L * 0.62 * 0.95) * (np.cos(th - a0) > 0))
        sec = np.abs(np.sin((r * 10 + np.abs(th) * 1.5) * math.pi))
        lat = np.maximum(lat, np.exp(-((1 - sec) / 0.08) ** 2) * 0.35)
    else:
        k = sp.get("vein_angle", 0.9)
        nv = sp.get("nveins", 8)
        ph = (lx - np.abs(ly) * k) * nv
        d = np.abs(ph - np.round(ph)) / nv * 1.0
        lat = np.exp(-(d / (vw * 0.7)) ** 2) * (lx > 0.05) * (lx < 0.92)
        sec = 0.0
    vein = np.clip(np.maximum(mid, lat * 0.75), 0, 1)
    C.vein[reg][sel] = vein[sel]
    # normal: fold along the midrib + cupping + vein grooves, in the leaf frame -> canvas
    fold = sp.get("fold", 0.35) * np.tanh(ly / 0.05)
    cup = sp.get("cup", 0.25) * (lx - 0.5)
    nlx = cup - vein * 0.0
    nly = fold + np.sign(ly) * vein * 0.15
    # leaf frame -> canvas (rotation by ang; the squash is ignored for the normal's direction)
    ncx = nlx * ca - nly * sa
    ncy = nlx * sa + nly * ca
    nz = np.ones_like(ncx)
    l = np.sqrt(ncx ** 2 + ncy ** 2 + nz ** 2)
    C.n[reg][sel] = np.stack([ncx / l, -ncy / l, nz / l], -1)[sel]       # image y down -> +y up
    C.t[reg][sel] = (0.25 + 0.2 * vein)[sel]


def draw_line(C, p0, p1, width, col, thick, idx=-2):
    m = np.zeros((C.R, C.R), np.uint8)
    cv2.line(m, (int(p0[0] * 4), int(p0[1] * 4)), (int(p1[0] * 4), int(p1[1] * 4)), 1, max(1, int(width)), cv2.LINE_AA, shift=2)
    sel = m > 0
    C.a[sel] = 1
    C.alb[sel] = col
    C.t[sel] = thick
    C.leaf[sel] = idx
    d = np.array(p1, f32) - np.array(p0, f32)
    d /= np.linalg.norm(d) + 1e-9
    C.n[sel] = [0, 0, 1]


def spray(sp, R, seed):
    """lay out a spray; returns the Canvas (geometry, per-leaf ids) and the per-leaf random table"""
    rng = np.random.default_rng(seed)
    C = Canvas(R)
    c = np.array([R / 2, R / 2])
    leaves = []
    ntw = sp.get("twigs", 6)
    twig_col = srgb_to_lin([x / 255 for x in (98, 86, 72)])
    base_ang = rng.uniform(0, 2 * math.pi)
    segs = []
    for t in range(ntw):
        ang = base_ang + 2 * math.pi * t / ntw + rng.uniform(-0.3, 0.3)
        L = R * rng.uniform(0.3, 0.42)
        p = c.copy()
        nseg = 5
        pts = [p.copy()]
        for s in range(nseg):
            ang += rng.uniform(-0.25, 0.25) + (0.18 * (1 if s % 2 else -1) if sp.get("zigzag") else 0)
            p = p + np.array([math.cos(ang), math.sin(ang)]) * L / nseg
            pts.append(p.copy())
        segs.append(pts)
        # leaves along the twig, alternate sides, smaller toward the tip
        nl = sp.get("per_twig", 5)
        for i in range(nl):
            f = (i + 0.6) / nl
            k = min(int(f * nseg), nseg - 1)
            q = pts[k] + (pts[k + 1] - pts[k]) * (f * nseg - k)
            tang = math.atan2(*(pts[k + 1] - pts[k])[::-1])
            side = 1 if i % 2 == 0 else -1
            la = tang + side * rng.uniform(0.6, 1.1)
            size = R * sp["leaf"] * rng.uniform(0.8, 1.15) * (1.1 - 0.35 * f)
            pet = size * sp.get("petiole", 0.15)
            base = q + np.array([math.cos(la), math.sin(la)]) * pet
            leaves.append(("leaf", base, la + rng.uniform(-0.25, 0.25), size, rng.uniform(0.6, 1.0), q))
    # loose leaves filling the gaps (seen end-on / from other twigs)
    for i in range(sp.get("loose", 6)):
        r = R * rng.uniform(0.1, 0.38)
        a = rng.uniform(0, 2 * math.pi)
        base = c + np.array([math.cos(a), math.sin(a)]) * r
        leaves.append(("leaf", base, a + rng.uniform(-0.8, 0.8), R * sp["leaf"] * rng.uniform(0.7, 1.0), rng.uniform(0.5, 0.9), None))
    rng.shuffle(leaves)
    # twigs first (under), then the petioles and the leaves on top
    for pts in segs:
        for a, b in zip(pts[:-1], pts[1:]):
            draw_line(C, a, b, R * 0.006, twig_col, 1.0)
    pet_col = srgb_to_lin(sp.get("petiole_col", [0.55, 0.58, 0.3]))
    for idx, (_, base, ang, size, squash, q) in enumerate(leaves):
        if q is not None:
            draw_line(C, q, base, R * 0.0035, pet_col, 0.8)
        if sp.get("compound"):                          # horse chestnut: leaflets radiating from the petiole's end
            nlf = sp["compound"]
            for j in range(nlf):
                off = (j - (nlf - 1) / 2) * (3.4 / nlf)
                s = size * (1 - 0.35 * abs(off) / 1.3)
                draw_leaf(C, idx, sp, rng, base, ang + off, s, squash)
        else:
            draw_leaf(C, idx, sp, rng, base, ang, size, squash)
    table = np.random.default_rng(seed + 1).random((len(leaves) + 2, 6)).astype(f32)
    return C, table


def colour(C, table, pal, sp, season_k):
    """the albedo per leaf from a palette (linear): base, hue / value spread, petiole darkening, veins, edge / spots"""
    R = C.R
    alb = C.alb.copy()
    on = C.leaf >= 0
    li = np.clip(C.leaf, 0, None)
    t = table[li]
    cols = np.stack([np.asarray(c, f32) for c, _ in pal])
    w = np.array([p[1] for p in pal], f32)
    pick = np.searchsorted(np.cumsum(w / w.sum()), t[..., 0]).clip(0, len(pal) - 1)
    base = cols[pick] * np.exp((t[..., 1, None] - 0.5) * 0.35)
    # darker toward the petiole, a little lighter toward the tip
    base = base * (0.78 + 0.3 * np.clip(C.u, 0, 1))[..., None]
    # the shade of the leaves above (a soft AO from the coverage around)
    occ = cv2.GaussianBlur(C.a, (0, 0), R * 0.01)
    base = base * (1.05 - 0.25 * occ)[..., None]
    base = base * (1 + 0.35 * C.vein[..., None] * np.array(sp.get("vein_tint", [1.1, 1.15, 0.6]), f32))
    if season_k.get("edge") is not None:
        # browned / yellowed margins and spots (autumn)
        edge = 1 - cv2.erode((C.leaf >= 0).astype(np.uint8), np.ones((5, 5), np.uint8), iterations=int(R * 0.004) + 1).astype(f32)
        edge = cv2.GaussianBlur(edge, (0, 0), R * 0.004)
        base = base * (1 - edge[..., None] * 0.25) + edge[..., None] * np.asarray(season_k["edge"], f32) * 0.25
    if season_k.get("spots"):
        sp_n = cv2.GaussianBlur(np.random.default_rng(7).random((R, R)).astype(f32), (0, 0), R * 0.004)
        sp_n = (sp_n - sp_n.mean()) / (sp_n.std() + 1e-6)
        spots = np.clip((sp_n - 2.0) * 2, 0, 1) * (t[..., 2] < season_k["spots"])
        base = base * (1 - spots[..., None] * 0.6)
    alb[on] = base[on]
    return alb


def coverage_mips(a0):
    """(process_tree_textures.py) level 0 alpha (uint8) -> levels keeping the share of texels >= 128"""
    target = (a0 >= 128).mean()
    out = [a0]
    src = a0.astype(np.float32)
    while src.shape[0] > 1:
        h = src.shape[0] // 2
        box = src.reshape(h, 2, h, 2).mean(axis=(1, 3))
        lo, hi = 0.5, 8.0
        for _ in range(18):
            k = (lo + hi) / 2
            if (box * k >= 128).mean() < target:
                lo = k
            else:
                hi = k
        mip = np.clip(np.round(box * (lo + hi) / 2), 0, 255)
        out.append(mip.astype(np.uint8))
        src = mip
    return out


def bleed(rgb, alpha):
    """(process_tree_textures.py) push-pull: the covered texels' colour spread under the empty ones"""
    w = (alpha > 8).astype(np.float32)[..., None]
    levels = [(rgb * w, w)]
    while levels[-1][0].shape[0] > 1:
        c, ww = levels[-1]
        h = c.shape[0] // 2
        levels.append((c.reshape(h, 2, h, 2, -1).sum(axis=(1, 3)), ww.reshape(h, 2, h, 2, 1).sum(axis=(1, 3))))
    fill = levels[-1][0] / np.maximum(levels[-1][1], 1e-6)
    for c, ww in reversed(levels[:-1]):
        up = np.repeat(np.repeat(fill, 2, axis=0), 2, axis=1)
        own = c / np.maximum(ww, 1e-6)
        k = np.clip(ww, 0, 1)
        fill = own * k + up * (1 - k)
    return np.where(w > 0, rgb, fill)


def box_mips(img):
    out = [img]
    while out[-1].shape[0] > 1:
        s = out[-1]
        h = s.shape[0] // 2
        out.append(s.reshape(h, 2, h, 2, s.shape[2]).mean(axis=(1, 3)))
    return out


def ktx_levels(levels, dst, srgb, work):
    paths = []
    base = os.path.splitext(os.path.basename(dst))[0]
    for i, lv in enumerate(levels):
        p = os.path.join(work, f"{base}_L{i}.png")
        cv2.imwrite(p, cv2.cvtColor(lv.astype(np.uint8), cv2.COLOR_RGBA2BGRA))
        paths.append(p)
    cmd = [KTX, "create", "--format", "R8G8B8A8_SRGB" if srgb else "R8G8B8A8_UNORM", "--assign-tf", "srgb" if srgb else "linear",
           "--encode", "uastc", "--uastc-quality", "2", "--zstd", "18", "--levels", str(len(levels)), *paths, dst]
    subprocess.run(cmd, check=True, capture_output=True)
    for p in paths:
        os.remove(p)
    return os.path.getsize(dst)


def finish_spray(C, out_R):
    """downsample 2x (antialiased), round the cluster off (10 % radial fade), return float maps at out_R"""
    rs = lambda a: cv2.resize(a, (out_R, out_R), interpolation=cv2.INTER_AREA)
    a = rs(C.a)
    yy, xx = np.mgrid[0:out_R, 0:out_R].astype(f32)
    r = np.sqrt((xx - out_R / 2 + 0.5) ** 2 + (yy - out_R / 2 + 0.5) ** 2) / (out_R / 2)
    a = a * np.clip((1.0 - r) / 0.1, 0, 1)
    n = rs(C.n)
    n /= np.linalg.norm(n, axis=-1, keepdims=True) + 1e-9
    return a, n, rs(C.t)
