"""Roofs: slate (natural slate, lapped courses) and roof_tiles_red (Flemish S pantiles, 'Boomse pannen').

slate          rectangular natural slates (~ 30 x 20-25 cm, ~13 cm exposed), each its own width, half-bond stagger;
               the tail of each slate stands proud (thickness step 4-6 mm), cleavage ripples along the slate, chipped
               tails and corners, blue-black / grey / greenish / rusty slates, lichen spots. 2.1 m repeat, 16 courses.
roof_tiles_red S pantiles ~ 21 cm wide x 26 cm exposed, in straight columns: roll + trough profile across the tile,
               the nose step at the bottom, red-orange fired clay with firing variation, black and lichen patches,
               moss in the troughs. 2.1 m repeat, 10 x 8 tiles.
"""
import numpy as np

from tf.core import smoothstep, lerp, hexcol, f32, lichen
from tf.bake import finish
from tf.units import courses, random_lengths, fixed_count_lengths


def slate(T, P):
    nc = P["courses"]
    pitch = T.size / nc
    U = courses(T, nc, random_lengths(T.size, P["w_lo"], P["w_hi"]),
                lambda rng, c, l: (c % 2) * P["w_lo"] / 2 + rng.uniform(0, T.size), k=1,
                joint=P["gap"], joint_jit=0.0015, unit_h=pitch + 0.0, h_jit=0.0, dy_jit=0.0015, tilt_deg=0.8,
                corner_r=0.004)
    ids, n = U["id"], U["n"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)
    lx, ly, hx, hy = U["lx"], U["ly"], U["hx"], U["hy"]
    # the slate's visible part covers the whole course pitch; its tail (bottom, +ly) is chipped / ragged
    tail = ly / pitch + 0.5                                          # 0 at the top of the exposure, 1 at the tail
    rag = T.noise(0.02, 2, octaves=2) * 0.003 + T.noise(0.006, 3) * 0.0008
    cn = T.noise(0.03, 4, octaves=2)
    chip = smoothstep(0.0, 0.3, cn - 1.3 + 0.5 * pu(1) * P.get("chips", 0.5)) * 0.015 * smoothstep(0.5, 0.9, tail)
    d = np.maximum(np.abs(lx) - hx, 0) + T.noise(0.03, 5) * 0.0008
    d_tail = (ly - (pitch / 2 - 0.0015)) + rag + chip
    edge = np.maximum(np.abs(lx) - hx + T.noise(0.03, 5) * 0.0008, d_tail)
    inside = smoothstep(0.0006, -0.0006, edge)
    th = P.get("thick", 0.005)
    # height: the slate rises toward its tail (lies on the slates below), the visible step at the tail
    h_s = th * (0.4 + 0.6 * tail) + pu(2, "normal") * 0.0006 + pu(3, "normal") * 0.004 * lx
    # cleavage ripples: elongated along the slate (y), plus fine lamination steps
    rip = T.noise(0.05, 6, octaves=3)
    rip = T.blur(rip, 0.002)
    h_s = h_s + rip * P.get("ripple", 0.0004) + T.noise(0.004, 7) * 0.00008
    lam = smoothstep(0.55, 0.6, T.noise(0.08, 8, octaves=2) + 0.3 * pu(4)) * 0.0004
    h_s = h_s + lam
    # under the gaps: the slate below (dark, deeper)
    h_u = -0.002 + T.noise(0.01, 9) * 0.0002
    h = lerp(h_u, h_s, inside)

    pal = [(hexcol(c), w) for c, w in P["colors"]]
    w = np.array([p[1] for p in pal], f32)
    pick = np.searchsorted(np.cumsum(w / w.sum()), T.child(200).random(n + 1)).clip(0, len(pal) - 1)
    col = np.stack([p[0] for p in pal])[pick][ids] * np.exp(pu(5, "normal") * P.get("val_sd", 0.1))[..., None]
    col = col * (1 + rip[..., None] * 0.04 + T.noise(0.02, 10, octaves=2)[..., None] * 0.05)
    # weathered surface: grey bloom toward the tail (wetter, exposed), rust spots (pyrite)
    bloom = smoothstep(0.3, 1.0, tail) * P.get("bloom", 0.2) * (0.5 + pu(6))
    col = lerp(col, hexcol(P.get("bloom_col", "#7a7d80")), np.clip(bloom, 0, 0.7) * 0.5)
    rF1, _, rid, nr = T.worley(0.03, 11)
    rust = smoothstep(0.003, 0.0005, rF1) * (T.per_unit(rid, nr, 12) < P.get("rust", 0.06))
    col = lerp(col, hexcol("#7a4a2a"), rust * 0.7)
    # lichen: pale grey-green / yellow rosettes (thresholded, clumped), mostly near tails
    lic, lr_ = lichen(T, 13, 0.05, P.get("lichen", 0.15) * 2, 0.003, 0.012)
    lcol = lerp(hexcol("#8e9182"), hexcol("#a39a62"), (lr_ > 0.75)[..., None])
    col = lerp(col, lcol, lic * 0.75)
    h = h + lic * 0.0004
    chipm = smoothstep(0.0, 0.004, chip) * inside
    col = lerp(col, col * 1.25, chipm * 0.6)
    col = lerp(hexcol("#151618") * np.ones_like(col), col, inside)
    rough = lerp(np.full_like(h, 0.9), P.get("rough", 0.62) + rip * 0.04 + lic * 0.3 + bloom * 0.1, inside)
    return col, h, rough


SLATE = dict(courses=16, w_lo=0.2, w_hi=0.27, gap=0.004, thick=0.005, ripple=0.0004, chips=0.5, val_sd=0.08, bloom=0.2,
             rust=0.05, lichen=0.12, rough=0.62,
             colors=[("#3b3e44", 4), ("#33363b", 3), ("#43464b", 2), ("#3e4240", 1.0), ("#4a4740", 0.4), ("#2c2e33", 1.5)])


def make_slate(extra=None):
    def build(T):
        P = dict(SLATE, **(extra or {}))
        col, h, rough = slate(T, P)
        return finish(T, col, h, rough, ao_radius=0.015, ao_strength=1.0)
    return build


# ------------------------------------------------------------------------------------------------ pantiles
def pantiles(T, P):
    nc, nu = P["courses"], P["cols"]
    pitch = T.size / nc
    w = T.size / nu
    U = courses(T, nc, fixed_count_lengths(lambda c: nu, lambda c: w, 0.002), lambda rng, c, l: rng.uniform(-0.003, 0.003),
                k=1, joint=0.0, joint_jit=0.0, unit_h=pitch, h_jit=0.0, dy_jit=0.002, tilt_deg=0.6, corner_r=0.006)
    ids, n = U["id"], U["n"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)
    lx, ly, hx = U["lx"], U["ly"], U["hx"]
    s = lx / (hx + 1e-6)                                       # -1..1 across the tile
    # S profile: the roll (convex) on one side, the trough on the other (period = one tile)
    prof = np.sin((s * 0.5 + 0.25) * 2 * np.pi) * P.get("roll", 0.025)
    prof = np.sign(prof) * np.abs(prof) ** 1.0
    tail = ly / pitch + 0.5                                    # 0 top of the exposure, 1 the nose
    lift = tail * P.get("lift", 0.012)                         # each tile lies on the one below
    nose = smoothstep(0.93, 1.0, tail + T.noise(0.02, 2) * 0.01) * 0.0
    h_t = prof + lift + pu(1, "normal") * 0.001 + T.noise(0.01, 3, octaves=2) * 0.0002 + T.noise(0.08, 4) * 0.0005
    # rounded nose edge: the last ~1 cm falls off
    fall = smoothstep(0.96, 1.0, tail + T.noise(0.015, 5) * 0.006)
    h_t = h_t - fall * 0.006 - nose
    # the roll's edge laps over the next tile's trough: a visible step + shadow line on one side of every tile
    lap = smoothstep(0.86, 0.97, s + T.noise(0.02, 18) * 0.02)
    h_t = h_t + lap * 0.004
    h = h_t
    base = hexcol(P["color"])
    col = base * np.exp(pu(2, "normal") * P.get("val_sd", 0.12))[..., None] * (1 + pu(3, "normal")[..., None] * 0.2 * np.array([0.25, 0, -0.3], f32))
    col = col * (1 + T.noise(0.05, 6, octaves=3)[..., None] * 0.07 + T.noise(0.004, 7)[..., None] * 0.04)
    # the trough collects dirt / moss; the roll is sun-bleached; black (reduction) patches on some tiles
    trough = smoothstep(0.0, -P.get("roll", 0.025), prof)
    roll = smoothstep(0.0, P.get("roll", 0.025), prof)
    dirt = trough * smoothstep(-0.2, 1.0, T.noise(0.1, 8, octaves=3)) * P.get("dirt", 0.5)
    col = lerp(col, hexcol("#3d3328"), np.clip(dirt, 0, 0.8) * 0.6)
    moss = trough * smoothstep(0.6, 1.6, T.noise(0.15, 9, octaves=3)) * P.get("moss", 0.3) * smoothstep(0.3, 1.0, tail)
    col = lerp(col, hexcol("#4d5a2c"), np.clip(moss * 1.5, 0, 0.9))
    h = h + moss * 0.002 * smoothstep(-0.2, 0.8, T.noise(0.006, 10))
    col = lerp(col, col * 1.1 + 0.02, roll * P.get("bleach", 0.2))
    black = smoothstep(0.6, 1.2, T.noise(0.08, 11, octaves=2) + pu(4) * 0.8 - 0.4) * P.get("black", 0.3)
    col = col * (1 - black[..., None] * 0.6)
    lic, lr_ = lichen(T, 12, 0.06, P.get("lichen", 0.2) * 2, 0.004, 0.016)
    col = lerp(col, lerp(hexcol("#9c9a86"), hexcol("#b08a45"), (lr_ > 0.6)[..., None]), lic * 0.7)
    # the shadow line under each nose (the next tile's top, dark gap)
    gapm = np.maximum(smoothstep(0.985, 1.0, tail), smoothstep(0.97, 1.0, s) * 0.6)
    col = col * (1 - gapm[..., None] * 0.5)
    rough = 0.78 + T.noise(0.03, 17) * 0.04 + moss * 0.15 + lic * 0.1 - roll * 0.04
    return col, h, rough


TILES = dict(courses=8, cols=10, roll=0.022, lift=0.014, color="#9a4c33", val_sd=0.1, dirt=0.5, moss=0.3, bleach=0.15,
             black=0.25, lichen=0.18)


def make_tiles(extra=None):
    def build(T):
        P = dict(TILES, **(extra or {}))
        col, h, rough = pantiles(T, P)
        return finish(T, col, h, rough, ao_radius=0.04, ao_strength=1.0)
    return build


MATERIALS = {
    "slate": {"size_m": 2.1, "variants": {
        "a": {"seed": 101, "lattice": [1, 16], "note": "blue-black natural slate, lapped, chipped tails, lichen", "build": make_slate()},
        "b": {"seed": 102, "lattice": [1, 16], "note": "greyer, weathered, more lichen", "build": make_slate(dict(bloom=0.5, lichen=0.3, colors=[("#4a4d52", 4), ("#55585b", 2), ("#3f4247", 2), ("#4d4f48", 1)]))},
        "c": {"seed": 103, "lattice": [1, 16], "note": "regular, newer, darker (Belgian look)", "build": make_slate(dict(w_lo=0.22, w_hi=0.24, chips=0.2, lichen=0.03, bloom=0.08, rust=0.02))},
    }},
    "roof_tiles_red": {"size_m": 2.1, "variants": {
        "a": {"seed": 111, "lattice": [10, 8], "note": "Flemish S pantiles, red-orange, moss in troughs", "build": make_tiles()},
        "b": {"seed": 112, "lattice": [10, 8], "note": "darker red-brown, cleaner", "build": make_tiles(dict(color="#8c4430", moss=0.1, lichen=0.08, black=0.15))},
        "c": {"seed": 113, "lattice": [10, 8], "note": "old, blackened, lichen and moss", "build": make_tiles(dict(color="#9a4a30", moss=0.6, lichen=0.4, black=0.5, dirt=0.8))},
    }},
}
