"""Brick walls: the shared generator behind brick_red_brussels / brick_yellow / brick_dark.

Substance-style pipeline, per texel, in metres:
  layout   units.courses(): stretcher or cross (Flemish 'kruisverband') bond, each brick its own length / height /
           vertical offset / tilt, joint widths jittered (per edge)
  shape    rounded rectangle SDF -> warped by a noise (hand-moulded edges) -> chips: a two-scale noise eats into the
           arrises where it is high (Substance: edge damage = SDF + grunge threshold), more at the corners
  relief   pillow (arris rounding), per-brick tilt + proud / sunk offset, sand-faced grain, pits, mortar recessed
           with its own sandy grain and smears onto the brick faces
  colour   per-brick firing colour (palette + log-normal value + warm / cool shift), kiln flash (one end burnt
           darker, headers burnt), firing clouds, lime / iron specks, chip interiors paler, sun-bleached macro patches,
           salt bloom near joints, soot / grime in recesses (AO x grunge)
  rough    brick, chips, mortar, glazed clinker each their own
"""
import numpy as np

from .core import smoothstep, lerp, hexcol, f32
from .units import courses, fixed_count_lengths


def brick_wall(T, P):
    N = T.N
    nc, nu = P["courses"], P["units"]
    pitch = T.size / nc
    module = T.size / nu
    cross = P.get("bond") == "cross"
    is_header = (lambda c: c % 2 == 1) if cross else (lambda c: False)

    def count(c):
        return nu * 2 if is_header(c) else nu

    def nominal(c):
        return module / 2 if is_header(c) else module

    def phase(rng, c, lens):
        if cross:
            if is_header(c):
                return module / 4 + rng.uniform(-0.004, 0.004)
            return (c // 2 % 2) * module / 2 + rng.uniform(-0.006, 0.006)
        return (c % 2) * module / 2 + rng.uniform(-P.get("bond_jit", 0.01), P.get("bond_jit", 0.01))

    U = courses(T, nc, fixed_count_lengths(count, nominal, P.get("len_jit", 0.004)), phase, k=1,
                joint=P["joint"], joint_jit=P.get("joint_jit", 0.0015), unit_h=pitch - P["joint"],
                h_jit=P.get("h_jit", 0.0015), dy_jit=P.get("dy_jit", 0.0008), tilt_deg=P.get("tilt", 0.35),
                corner_r=P.get("corner_r", 0.0025), kinds=lambda c: 1 if is_header(c) else 0)
    ids, n = U["id"], U["n"]
    lx, ly, hx, hy = U["lx"], U["ly"], U["hx"], U["hy"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)

    # ---------------------------------------------------------------- shape: warped edges + chips
    # hand-moulded outline: a wavy edge (3 cm) + a ragged one (4 mm)
    edge_n = T.noise(0.03, 2, octaves=2, gain=0.5) + P.get("ragged", 0.25) * T.noise(0.004, 30, octaves=2)
    d = U["d"] + edge_n * P.get("edge_warp", 0.0006)
    # chips: high where two noises agree, only near the arrises, more at corners
    cn = T.noise(0.018, 3, octaves=2, gain=0.6) * 0.7 + T.noise(0.006, 4, octaves=2) * 0.3
    corner = smoothstep(0.65, 1.0, np.minimum(np.abs(lx) / (hx + 1e-6), 1) * np.minimum(np.abs(ly) / (hy + 1e-6), 1))
    chip_amt = P.get("chips", 0.5) * (0.55 + 0.9 * pu(1) ** 2)      # some bricks much more damaged
    chip = smoothstep(0.0, 0.35, cn - (1.35 - 0.7 * corner) + chip_amt) * P.get("chip_depth", 0.012)
    # (d_eff > 0 = missing: a chip of strength 1 reaches chip_depth in from the arris); only the arris band chips
    cd = P.get("chip_depth", 0.012)
    chip = chip * smoothstep(-cd * 1.4, -cd * 0.7, d)
    d_eff = d + chip
    inside = smoothstep(0.0005, -0.0005, d_eff)                    # ~1 texel soft at 2K / 1.8 m

    # ---------------------------------------------------------------- relief (m)
    r = P.get("arris_r", 0.003)
    t = np.clip(-d_eff / r, 0, 1)
    arris = -r * 0.6 * (1 - np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1)))          # quarter-round arris
    pillow = -P.get("pillow", 0.0008) * ((lx / (hx + 1e-6)) ** 4 + (ly / (hy + 1e-6)) ** 4) * 0.5
    tilt = pu(2, "normal") * 0.008 * lx + pu(3, "normal") * 0.012 * ly
    proud = pu(4, "normal") * P.get("proud", 0.0009)
    grain = T.noise(0.0015, 5, octaves=2) * P.get("grain_h", 0.00012) + T.noise(0.02, 6, octaves=3) * P.get("wave_h", 0.0004)
    # fire cracks / creases of a hand-moulded face: thin, partial lines (Worley cell borders, masked)
    cF1, cF2, _, _ = T.worley(0.03, 31, jitter=1.0, aniso=(1.6, 1.0))
    crease = smoothstep(0.0009, 0.0, cF2 - cF1) * smoothstep(0.2, 1.0, T.noise(0.03, 32, octaves=2)) * P.get("creases", 0.5)
    grain = grain - crease * 0.0009
    F1, F2, pid, npits = T.worley(P.get("pit_cell", 0.012), 7, jitter=1.0)
    pit_on = (T.per_unit(pid, npits, 8) < P.get("pits", 0.25) * (0.2 + 1.6 * pu(29))).astype(f32)
    pit_r = np.maximum(0.0005 + 0.0012 * T.per_unit(pid, npits, 9), 0.8 * T.px)
    pits = -smoothstep(pit_r, pit_r * 0.3, F1) * pit_on * P.get("pit_depth", 0.0007)
    chip_floor = -smoothstep(0, 0.004, chip) * 0.0025 + T.noise(0.003, 10) * 0.0003 * (chip > 0)
    h_brick = arris + pillow + tilt + proud + grain + pits + chip_floor

    mrec = P.get("recess", 0.004)
    mgrain = T.noise(0.0012, 11, octaves=2) * 0.00025 + T.noise(0.008, 12, octaves=2) * 0.0004
    # tooled joint: slightly concave across the joint, rising to meet the brick (smears / 'buttering')
    across = np.clip(d / (P["joint"] * 0.5), 0, 1)
    h_mortar = -mrec - 0.0008 * (1 - (1 - across) ** 2) + mgrain
    smear = smoothstep(0.35, 0.8, T.noise(0.01, 13, octaves=2)) * P.get("smear", 0.4)
    h_mortar = h_mortar + smear * smoothstep(0.004, 0.0, d) * mrec * 0.6
    height = lerp(h_mortar, h_brick, inside)
    height = height - height.mean()

    # ---------------------------------------------------------------- colour
    pal = P["palette"]                                           # [(hex, weight), ...]
    w = np.array([p[1] for p in pal], f32)
    cdf = np.cumsum(w / w.sum())
    pick = np.searchsorted(cdf, T.child(200).random(n + 1)).clip(0, len(pal) - 1)
    pal_lin = np.stack([hexcol(p[0]) for p in pal])
    base = pal_lin[pick][ids]                                    # per-brick colour
    val = np.exp(pu(5, "normal") * P.get("val_sd", 0.12))
    warm = pu(6, "normal") * P.get("warm_sd", 0.25)
    col = base * val[..., None] * (1 + warm[..., None] * np.array([0.22, 0.0, -0.25], f32))
    # kiln flash: one end of some bricks burnt darker (headers more)
    side = np.sign(pu(7) - 0.5)
    flash = np.clip(side * lx / (hx + 1e-6), 0, 1) ** 1.5 * (pu(8) < P.get("flash_p", 0.35))
    flash = flash + (U["kind"] == 1) * P.get("header_burn", 0.0) * (0.5 + pu(9))
    col = col * (1 - np.clip(flash, 0, 1)[..., None] * P.get("flash", 0.4) * np.array([0.9, 1.0, 0.95], f32))
    # firing clouds + sand-faced grain inside the brick
    clouds = T.noise(0.05, 14, octaves=3, gain=0.6)
    rim = smoothstep(-0.008, -0.001, d) * P.get("rim", 0.12)            # weathered, paler arrises
    col = col * (1 + rim[..., None] * np.array([1.0, 0.9, 0.8], f32))
    mott = T.noise(0.006, 15, octaves=2)
    col = col * (1 + clouds[..., None] * P.get("clouds", 0.07) + mott[..., None] * P.get("mottle", 0.04))
    fine = T.noise(0.0013, 16)
    col = col * (1 + fine[..., None] * P.get("fine", 0.05))
    # dark blotches (manganese / reduction spots, 5-15 mm) and the creases darker
    bF1, _, bid, nb = T.worley(0.025, 33)
    br = 0.002 + 0.006 * T.per_unit(bid, nb, 34) ** 2
    blot = smoothstep(br, br * 0.3, bF1 + T.noise(0.004, 35) * 0.0015) * (T.per_unit(bid, nb, 36) < P.get("blotches", 0.3))
    col = col * (1 - blot[..., None] * 0.35) * (1 - crease[..., None] * 0.3)
    # specks: lime (pale) and iron / manganese (dark)
    sF1, _, sid, ns = T.worley(P.get("speck_cell", 0.006), 17)
    sp = T.per_unit(sid, ns, 18)
    sr = np.maximum(0.0003 + 0.0006 * T.per_unit(sid, ns, 19), 0.6 * T.px)
    dot = smoothstep(sr, sr * 0.4, sF1)
    lime = dot * (sp < P.get("lime_specks", 0.08))
    iron = dot * (sp > 1 - P.get("iron_specks", 0.12))
    col = lerp(col, hexcol(P.get("lime_col", "#d9cbb0")), lime * 0.8)
    col = col * (1 - iron[..., None] * 0.55)
    # chip interiors: fresh fired clay (paler / more saturated core)
    chipm = smoothstep(0.0, 0.002, chip) * inside
    col = lerp(col, col * np.array(P.get("chip_tint", [1.2, 1.1, 1.0]), f32), chipm * 0.8)
    # mortar
    mc = hexcol(P["mortar"])
    mn = T.noise(0.004, 20, octaves=2)
    sandF, _, sandid, nsand = T.worley(0.0016, 21)
    sv = T.per_unit(sandid, nsand, 22)
    sand = smoothstep(max(0.0007, 1.2 * T.px), max(0.0002, 0.4 * T.px), sandF) * (sv > 0.55)
    mcol = mc[None, None, :] * (1 + mn[..., None] * 0.08) * (1 + (sv[..., None] - 0.5) * sand[..., None] * 0.45)
    mdirt = smoothstep(-0.5, 1.5, T.noise(0.05, 23, octaves=3))
    mcol = mcol * (1 - mdirt[..., None] * P.get("mortar_dirt", 0.25))
    mcol = mcol * (1 + T.noise(0.02, 37, octaves=3)[..., None] * 0.1)
    col = lerp(mcol, col, inside)
    # salt bloom (efflorescence) near the joints of some areas
    bloom = smoothstep(0.7, 1.8, T.noise(0.25, 24, octaves=3)) * smoothstep(-0.01, 0.002, d) * P.get("bloom", 0.0)
    col = lerp(col, hexcol("#e4e0d6"), np.clip(bloom, 0, 0.6) * smoothstep(-0.3, 1.0, T.noise(0.004, 25)))
    # sun bleach (macro, desaturates and lightens) and soot / grime (macro x recess)
    macro = T.noise(0.6, 26, octaves=3)
    bleach = smoothstep(0.2, 1.5, macro) * P.get("bleach", 0.12)
    lum = (col * np.array([0.2126, 0.7152, 0.0722], f32)).sum(-1, keepdims=True)
    col = lerp(col, lum * 1.15 + col * 0.15, bleach)
    # dust / lime film: the faces of an old wall are greyed by a thin film (scans all show it)
    film = np.clip(P.get("film", 0.08) * (1 + 0.5 * T.noise(0.3, 38, octaves=2)), 0, 0.3) * inside
    col = lerp(col, hexcol(P.get("film_col", "#8a8178")), film)
    rough = np.where(inside > 0.5, P.get("rough_brick", 0.82), P.get("rough_mortar", 0.94)).astype(f32)
    rough = rough + T.noise(0.01, 27) * 0.04 + chipm * 0.05 - P.get("polish", 0.0) * smoothstep(-0.003, -0.012, d_eff)
    # roughness of glazed bricks (clinker): per brick
    if P.get("glaze"):
        g = (pu(28) < P["glaze"]).astype(f32) * inside
        rough = rough - g * 0.35
    return {"albedo": col.astype(f32), "height": height.astype(f32), "rough": rough.astype(f32), "inside": inside,
            "d": d_eff, "grime_mask": None, "units": U}


def grime(T, col, ao, amount, k=40, colour="#2a2420"):
    """soot / grime collected in the recesses (AO) and in macro patches"""
    g = smoothstep(0.85, 0.35, ao) * (0.5 + 0.5 * smoothstep(-0.8, 1.2, T.noise(0.15, k, octaves=4)))
    macro = smoothstep(0.3, 1.8, T.noise(0.4, k + 1, octaves=3)) * 0.35
    m = np.clip((g + macro) * amount, 0, 0.9)
    return lerp(col, hexcol(colour) * 1.0, m)
