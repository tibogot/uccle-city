"""Stone and render walls: stone_white (cream limestone ashlar), stone_blue (Belgian petit granit), render_white.

stone_white  white / cream limestone (Gobertange, Euville / Savonnieres type used for Brussels bands and dressings):
             courses ~25-33 cm, blocks 40-95 cm, fine 5 mm lime joints; oolitic grain, pores, shell fragments, fine
             claw-tool / sawn tooling, worn rounded arrises, chips, grey soiling in the recesses. 3 m repeat.
stone_blue   Belgian blue stone (petit granit, Soignies / Ecaussinnes): dark blue-grey honed or bush-hammered face
             inside a 2 cm chiselled margin (drafted margin), crinoid ossicles (pale rings / discs 1-5 mm), white
             calcite veins, paler and greyer where rain washes it. 2.4 m repeat.
render_white lime render, white-washed: sand grain, trowel waves, hairline crack network, patched repairs, soiling.
"""
import numpy as np

from tf.core import smoothstep, lerp, hexcol, f32
from tf.bake import finish
from tf.units import courses, random_lengths


def ashlar(T, P):
    nc = P["courses"]
    pitch = T.size / nc
    U = courses(T, nc, random_lengths(T.size, P["len_lo"], P["len_hi"]), lambda rng, c, l: rng.uniform(0, T.size), k=1,
                joint=P["joint"], joint_jit=0.001, unit_h=pitch - P["joint"], h_jit=0.0015, dy_jit=0.0008,
                tilt_deg=0.08, corner_r=0.003)
    ids, n = U["id"], U["n"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)
    lx, ly, hx, hy = U["lx"], U["ly"], U["hx"], U["hy"]
    cn = T.noise(0.03, 2, octaves=2) * 0.7 + T.noise(0.008, 3) * 0.3
    corner = smoothstep(0.85, 1.0, np.minimum(np.abs(lx) / hx, 1) * np.minimum(np.abs(ly) / hy, 1))
    chip = smoothstep(0.0, 0.3, cn - 1.5 + 0.8 * corner + P.get("chips", 0.4) * pu(1)) * P.get("chip_depth", 0.012)
    chip = chip * smoothstep(-0.02, -0.008, U["d"])
    d = U["d"] + T.noise(0.05, 4) * 0.0008 + chip
    inside = smoothstep(0.0005, -0.0005, d)
    r = P.get("arris", 0.004)
    t = np.clip(-d / r, 0, 1)
    arris = -r * 0.7 * (1 - np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1)))
    face = pu(2, "normal") * 0.0008 + pu(3, "normal") * 0.002 * lx + pu(4, "normal") * 0.003 * ly
    face = face + T.noise(0.08, 5, octaves=3) * P.get("wave", 0.0004)
    # tooling: fine parallel chisel strokes (diagonal per block) or the margin + bush-hammered field
    ang = (pu(5) - 0.5) * 0.6 + P.get("tool_angle", 0.9)
    u = lx * np.cos(ang) + ly * np.sin(ang)
    tool = (np.sin(u * 2 * np.pi / P.get("tool_pitch", 0.004) + T.noise(0.02, 6) * 2.0) * 0.5 + 0.5) ** 3
    tool = tool * P.get("tool_h", 0.00015) * smoothstep(-0.2, 0.8, T.noise(0.04, 7))
    grain = T.noise(0.002, 8, octaves=2) * P.get("grain_h", 0.00012)
    pF1, _, pid, npor = T.worley(P.get("pore_cell", 0.006), 9)
    pr = np.maximum(0.0003 + 0.0009 * T.per_unit(pid, npor, 10), 0.6 * T.px)
    pores = smoothstep(pr, pr * 0.3, pF1) * (T.per_unit(pid, npor, 11) < P.get("pores", 0.3))
    h_s = arris + face + tool + grain - pores * 0.0008 - smoothstep(0.0, 0.004, chip) * 0.004
    margin = None
    if P.get("margin"):
        # drafted margin: a 2 cm chiselled band along every edge, the field bush-hammered (stippled)
        mw = P["margin"]
        margin = smoothstep(-mw - 0.001, -mw + 0.001, d)                  # 1 in the margin
        bF1, _, _, _ = T.worley(P.get("stipple", 0.0035), 12)
        stip = smoothstep(max(0.0014, T.px * 1.2), 0.0, bF1)
        field = -stip * P.get("stipple_h", 0.0005) - 0.0004
        strokes = (np.sin((np.where(np.abs(lx) / hx > np.abs(ly) / hy, ly, lx)) * 2 * np.pi / 0.0035) * 0.5 + 0.5) * 0.00012
        h_s = h_s + lerp(field, strokes, margin)
    h_j = -P.get("recess", 0.003) + T.noise(0.002, 13) * 0.00015
    h = lerp(h_j, h_s, inside)

    base = hexcol(P["color"])
    col = base * np.exp(pu(6, "normal") * P.get("block_sd", 0.06))[..., None] * (1 + pu(7, "normal")[..., None] * P.get("warm_sd", 0.04) * np.array([1, 0.2, -0.8], f32))
    col = col * (1 + T.noise(0.06, 14, octaves=4)[..., None] * P.get("clouds", 0.06) + T.noise(0.003, 15)[..., None] * P.get("fine", 0.04))
    # bedding: faint layers along the block (sedimentary)
    bed = T.warp(np.sin(T.yy * 2 * np.pi / P.get("bed_pitch", 0.012)).astype(f32), T.noise(0.2, 16) * 0.01, T.noise(0.1, 17) * 0.003)
    col = col * (1 + bed[..., None] * P.get("bedding", 0.02))
    col = col * (1 - pores[..., None] * 0.3)
    # fossils / inclusions: pale (crinoid ossicles, shells) and dark
    fF1, _, fid, nf = T.worley(P.get("fossil_cell", 0.02), 18)
    fr = np.maximum(0.0006 + 0.0022 * T.per_unit(fid, nf, 19) ** 2, 0.8 * T.px)
    fon = T.per_unit(fid, nf, 20) < P.get("fossils", 0.2)
    ring = smoothstep(fr, fr * 0.75, fF1) * (1 - smoothstep(fr * 0.55, fr * 0.3, fF1) * P.get("ring", 0.0)) * fon
    col = lerp(col, hexcol(P.get("fossil_col", "#e8e2d4")), ring * P.get("fossil_amt", 0.5))
    # calcite veins
    if P.get("veins"):
        vF1, vF2, _, _ = T.worley(0.25, 21, aniso=(1.0, 0.5))
        vw = T.warp(vF2 - vF1, T.noise(0.05, 22) * 0.01, T.noise(0.05, 23) * 0.01)
        vein = smoothstep(max(0.0012, T.px), 0.0, vw) * (T.noise(0.2, 24) > 0.3) * P["veins"]
        col = lerp(col, hexcol("#c9c7c0"), vein * 0.7)
    if margin is not None:
        col = col * (1 + margin[..., None] * P.get("margin_light", 0.12))
        col = lerp(col, hexcol(P.get("field_col", P["color"])), (1 - margin) * P.get("field_mix", 0.0))
    chipm = smoothstep(0.0, 0.003, chip) * inside
    col = lerp(col, col * np.array(P.get("chip_tint", [1.15, 1.13, 1.1]), f32), chipm)
    jc = hexcol(P.get("joint_col", "#b9b2a4")) * (1 + T.noise(0.004, 25)[..., None] * 0.1)
    col = lerp(jc, col, inside)
    # rain-washed (pale) vs sheltered soiling (grey): vertical streaky macro
    wash = T.warp(T.noise(0.4, 26, octaves=3), T.noise(0.5, 27) * 0.05, np.zeros_like(T.xx))
    streak = T.noise(0.3, 28, octaves=2)
    streak = T.blur(streak, 0.004)
    soil = smoothstep(0.3, 1.6, wash + 0.4 * streak) * P.get("soil", 0.25)
    col = lerp(col, hexcol(P.get("soil_col", "#6f6a60")), soil * 0.6)
    rough = lerp(np.full_like(h, 0.92), P.get("rough", 0.8) + T.noise(0.03, 29) * 0.04, inside)
    if margin is not None:
        rough = rough - margin * inside * P.get("margin_gloss", 0.0)
    return col, h, rough


WHITE = dict(courses=10, len_lo=0.4, len_hi=0.95, joint=0.005, arris=0.004, chips=0.45, chip_depth=0.012, wave=0.0005,
             tool_pitch=0.004, tool_h=0.00012, tool_angle=1.0, grain_h=0.00012, pores=0.35, pore_cell=0.005,
             color="#cfc6b2", block_sd=0.05, warm_sd=0.05, clouds=0.06, fine=0.05, bedding=0.025, fossils=0.18,
             fossil_cell=0.025, fossil_col="#ebe5d5", fossil_amt=0.4, joint_col="#c2baa8", soil=0.3, soil_col="#7a7366",
             rough=0.82, recess=0.002)

BLUE = dict(courses=8, len_lo=0.45, len_hi=1.0, joint=0.006, arris=0.003, chips=0.3, chip_depth=0.01, wave=0.0002,
            tool_pitch=0.0035, tool_h=0.0, grain_h=0.00008, pores=0.05, pore_cell=0.01, color="#565a5d",
            block_sd=0.06, warm_sd=0.02, clouds=0.07, fine=0.05, bedding=0.0, fossils=0.55, fossil_cell=0.009,
            fossil_col="#a7a8a4", fossil_amt=0.55, ring=0.6, veins=0.6, margin=0.02, stipple=0.003, stipple_h=0.0006,
            margin_light=-0.12, field_col="#77797a", field_mix=0.35, margin_gloss=0.2, joint_col="#8d8a83", soil=0.15,
            soil_col="#8b8d8d", rough=0.7, recess=0.002, chip_tint=[1.4, 1.4, 1.4])


def make_ashlar(P0, extra=None):
    def build(T):
        P = dict(P0, **(extra or {}))
        col, h, rough = ashlar(T, P)
        return finish(T, col, h, rough, ao_radius=0.02, ao_strength=0.9)
    return build


# ------------------------------------------------------------------------------------------------ render
def render(T, P):
    # trowel waves (large, soft) + sand grain + float marks
    h = T.noise(0.4, 1, octaves=3) * P.get("waves", 0.0012) + T.noise(0.08, 2, octaves=2) * 0.0003
    swirl = T.warp(T.noise(0.025, 3, octaves=2), T.noise(0.15, 4) * 0.03, T.noise(0.15, 5) * 0.03)
    h = h + swirl * P.get("float", 0.00015)
    sF1, _, sid, ns = T.worley(0.0016, 6)
    sv = T.per_unit(sid, ns, 7)
    grain = smoothstep(max(0.0007, 0.9 * T.px), 0.0, sF1) * (sv > 0.4)
    h = h + grain * P.get("grain_h", 0.00025) + T.noise(0.0015, 8) * 0.00008
    # hairline crack network (craquelure + longer settlement cracks)
    cF1, cF2, _, _ = T.worley(P.get("crack_cell", 0.12), 9, jitter=1.0)
    cw = T.warp(cF2 - cF1, T.noise(0.03, 10) * 0.006, T.noise(0.03, 11) * 0.006)
    crack = smoothstep(max(0.0008, T.px), 0.0, cw) * smoothstep(0.1, 0.9, T.noise(0.2, 12, octaves=2) + P.get("cracks", 0.3))
    h = h - crack * 0.0008
    # patched repairs: flatter, slightly different colour
    patch = smoothstep(0.9, 1.2, T.noise(0.5, 13, octaves=3)) * P.get("patches", 0.5)
    h = h * (1 - patch * 0.5) + patch * 0.0004
    base = hexcol(P["color"])
    col = base * (1 + T.noise(0.3, 14, octaves=4)[..., None] * P.get("clouds", 0.04))
    col = col * (1 + (sv[..., None] - 0.5) * grain[..., None] * P.get("grain_col", 0.12))
    col = lerp(col, hexcol(P.get("patch_col", "#d9d4c8")), patch * 0.6)
    col = col * (1 - crack[..., None] * 0.35)
    # soiling: grey dust in the grain (AO-like) + vertical streaks
    dust = smoothstep(0.2, 1.8, T.warp(T.noise(0.5, 15, octaves=3), np.zeros_like(T.xx), T.noise(0.6, 16) * 0.2)) * P.get("soil", 0.2)
    col = lerp(col, hexcol(P.get("soil_col", "#8a867d")), dust * 0.5)
    rough = 0.9 + T.noise(0.05, 17) * 0.03 - patch * 0.04
    return col, h, rough


RENDER = dict(color="#e7e3d8", waves=0.0012, float=0.00015, grain_h=0.00025, cracks=0.25, crack_cell=0.12, patches=0.5,
              clouds=0.04, grain_col=0.12, soil=0.2)


def make_render(extra=None):
    def build(T):
        P = dict(RENDER, **(extra or {}))
        col, h, rough = render(T, P)
        return finish(T, col, h, rough, ao_radius=0.006, ao_strength=0.8)
    return build


MATERIALS = {
    "stone_white": {"size_m": 3.0, "variants": {
        "a": {"seed": 71, "lattice": [1, 10], "note": "cream limestone ashlar, fine tooling, lime joints", "build": make_ashlar(WHITE)},
        "b": {"seed": 72, "lattice": [1, 10], "note": "whiter, cleaner, sawn", "build": make_ashlar(WHITE, dict(color="#dcd6c8", tool_h=0.0, soil=0.15, warm_sd=0.03))},
        "c": {"seed": 73, "lattice": [1, 10], "note": "warmer, weathered, more soiling and chips", "build": make_ashlar(WHITE, dict(color="#c8b99c", soil=0.5, chips=0.8, pores=0.5))},
    }},
    "stone_blue": {"size_m": 2.4, "variants": {
        "a": {"seed": 81, "lattice": [1, 8], "note": "petit granit, bush-hammered field + chiselled margin", "build": make_ashlar(BLUE)},
        "b": {"seed": 82, "lattice": [1, 8], "note": "honed (polished) dark face, crinoids and veins", "build": make_ashlar(BLUE, dict(margin=0, field_mix=0.0, rough=0.5, color="#4a4e52", fossil_amt=0.65))},
        "c": {"seed": 83, "lattice": [1, 8], "note": "weathered pale grey, rain-washed", "build": make_ashlar(BLUE, dict(color="#6e7172", field_col="#8a8b8a", soil=0.35, soil_col="#a3a39f", rough=0.8))},
    }},
    "render_white": {"size_m": 2.0, "variants": {
        "a": {"seed": 91, "lattice": None, "note": "lime render, white-washed, hairline cracks, patches", "build": make_render()},
        "b": {"seed": 92, "lattice": None, "note": "fresh, fine float finish", "build": make_render(dict(color="#efece4", cracks=0.0, patches=0.15, soil=0.05, waves=0.0007))},
        "c": {"seed": 93, "lattice": None, "note": "old, coarse, grey soiling, cracked", "build": make_render(dict(color="#dcd7ca", cracks=0.6, patches=0.8, soil=0.5, grain_h=0.0004))},
    }},
}
