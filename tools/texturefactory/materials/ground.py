"""Ground materials: asphalt, cobbles (Saint-Job setts), paving_concrete (Brussels 30 cm sidewalk tiles).

asphalt   Brussels dense asphalt concrete (AC-10 / AC-14 surface course): crushed porphyry (Quenast / Lessines:
          blue-grey, green-grey, pinkish grey) + limestone + sand in an aged bitumen binder. The traffic wears the
          binder off the tops (stones polished, binder dark in the gaps), voids, oil stains, sealed cracks. 2 m repeat.
cobbles   Place de Saint-Job setts: grey-blue porphyry / sandstone setts ~ 10-14 x 9-12 cm in rows with random
          lengths, domed and tilted, rounded worn arrises, sandy joints 1-1.5 cm with dirt and moss. 1.5 m repeat.
paving    Brussels grey concrete sidewalk tiles 30 x 30 cm, 2-3 mm joints, small chamfer, exposed fine aggregate,
          chipped corners, stains, chewing gum. 1.8 m repeat (6 x 6 tiles).
"""
import numpy as np

from tf.core import smoothstep, lerp, hexcol, f32
from tf.bake import finish
from tf.aggregate import stones, palette_pick
from tf.units import courses, random_lengths, fixed_count_lengths


# ------------------------------------------------------------------------------------------------ asphalt
def asphalt(T, P):
    pal = [(hexcol(c), w) for c, w in P["stones"]]
    big = stones(T, P.get("cell", 0.0085), 1, presence=P.get("presence", 0.62), dome_m=0.0016, flat=0.45)
    med = stones(T, 0.0042, 2, presence=0.6, dome_m=0.0009, flat=0.5)
    fine = stones(T, 0.0021, 3, presence=0.55, dome_m=0.0004, flat=0.6)
    # binder: dark bitumen with fines (sand + filler), pores
    bind_h = T.noise(0.003, 4, octaves=2) * 0.00025 + T.noise(0.05, 5, octaves=3) * 0.0006
    pF1, _, pid, npor = T.worley(0.006, 6)
    por_on = T.per_unit(pid, npor, 7) < P.get("voids", 0.22)
    pr = 0.0006 + 0.0012 * T.per_unit(pid, npor, 8)
    pores = smoothstep(pr, pr * 0.4, pF1) * por_on
    wear = P.get("wear", 0.6)                                # binder worn off: stones protrude
    h = bind_h - pores * 0.0012
    for s, lift in ((fine, 0.3), (med, 0.6), (big, 1.0)):
        h = np.maximum(h, s["height"] * (0.4 + wear) - (1 - lift) * 0.0003 + bind_h * 0.3 * s["mask"])
    m_any = np.clip(big["mask"] + med["mask"] + fine["mask"], 0, 1)

    binder = hexcol(P["binder"]) * (1 + 0.15 * T.noise(0.004, 9, octaves=2))[..., None]
    sand = smoothstep(0.2, 1.4, T.noise(0.0015, 10))
    binder = lerp(binder, hexcol(P.get("fines", "#6f6b66")), sand * P.get("fines_amt", 0.35))
    col = binder * (1 - pores[..., None] * 0.5)
    for s, k in ((fine, 11), (med, 12), (big, 13)):
        sc = palette_pick(s["rnd"], pal) * (0.85 + 0.3 * s["rnd2"])[..., None]
        # bitumen film left on stones that are not worn: darker, more on the lower parts of each stone
        film = (1 - smoothstep(0.2, 0.9, s["height"] / (s["height"].max() + 1e-9))) * (1 - wear * 0.6)
        sc = lerp(sc, binder, np.clip(film * 0.7, 0, 1))
        col = lerp(col, sc, s["mask"])
    # macro: lighter worn wheel paths / darker fresh zones, oil stains, dust
    macro = T.noise(0.5, 14, octaves=4, gain=0.55)
    col = col * (1 + macro[..., None] * P.get("macro", 0.1))
    oil = smoothstep(0.9, 2.0, T.noise(0.35, 15, octaves=3)) * P.get("oil", 0.4)
    col = col * (1 - oil[..., None] * 0.45)
    dust = smoothstep(-0.2, 1.5, T.noise(0.2, 16, octaves=3)) * P.get("dust", 0.25)
    col = lerp(col, hexcol(P.get("dust_col", "#7d786f")), dust * (1 - m_any * 0.6) * 0.5)
    # sealed cracks: meandering bitumen-sealed lines (wider, glossy)
    cF1, cF2, _, _ = T.worley(0.6, 17, jitter=1.0)
    w = T.warp(cF2 - cF1, T.noise(0.1, 18) * 0.02, T.noise(0.1, 19) * 0.02)
    crack = smoothstep(0.006, 0.002, w) * (T.noise(0.4, 20) > 0.6 - P.get("cracks", 0.3))
    col = lerp(col, hexcol("#1c1c1d"), crack * 0.9)
    h = h + crack * 0.0006
    rough = 0.9 - m_any * (0.12 + 0.12 * wear) + T.noise(0.01, 21) * 0.03 - oil * 0.15 - crack * 0.35
    return col, h, rough


ASPHALT = dict(binder="#2b2a29", fines="#6c6862", fines_amt=0.35, wear=0.6, voids=0.22, macro=0.1, oil=0.35, dust=0.3,
               cracks=0.25, stones=[("#6d6b69", 3), ("#5b5d61", 2.5), ("#706460", 1.5), ("#55534f", 2), ("#8a857c", 1.2),
                                    ("#62655e", 1.2), ("#a29d93", 0.3), ("#3f3f40", 1)])


def make_asphalt(extra=None):
    def build(T):
        P = dict(ASPHALT, **(extra or {}))
        col, h, rough = asphalt(T, P)
        return finish(T, col, h, rough, ao_radius=0.008, ao_strength=0.9)
    return build


# ------------------------------------------------------------------------------------------------ cobbles
def cobbles(T, P):
    nrow = P["rows"]
    pitch = T.size / nrow
    U = courses(T, nrow, random_lengths(T.size, P["len_lo"], P["len_hi"]), lambda rng, c, l: rng.uniform(0, T.size), k=1,
                joint=P["joint"], joint_jit=0.003, unit_h=pitch - P["joint"], h_jit=0.006, dy_jit=0.003,
                tilt_deg=P.get("tilt", 3.0), corner_r=0.012)
    ids, n = U["id"], U["n"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)
    d = U["d"] + T.noise(0.06, 2) * 0.002 + T.noise(0.012, 3) * 0.0002
    inside = smoothstep(0.0008, -0.0008, d)
    lx, ly, hx, hy = U["lx"], U["ly"], U["hx"], U["hy"]
    # domed, worn top + tilt + per-sett height; rounded arrises (r ~ 1.5 cm)
    r = P.get("arris", 0.015)
    t = np.clip(-d / r, 0, 1)
    arris = -r * 0.8 * (1 - np.sqrt(np.clip(1 - (1 - t) ** 2, 0, 1)))
    dome = -P.get("dome", 0.004) * ((lx / (hx + 1e-6)) ** 2 + (ly / (hy + 1e-6)) ** 2) * 0.5
    tilt = pu(1, "normal") * 0.03 * lx + pu(2, "normal") * 0.03 * ly + pu(3, "normal") * 0.003
    surf = T.noise(0.03, 4, octaves=2) * 0.0004 + T.noise(0.004, 5, octaves=2) * 0.00012
    # split / spalled faces on some setts (a sharp ledge)
    h_s = arris + dome + tilt + surf
    jn = T.noise(0.004, 7, octaves=2) * 0.001 + T.noise(0.03, 8) * 0.0015
    h_j = -P.get("joint_depth", 0.012) + jn
    h = lerp(h_j, h_s, inside)
    # colour: grey-blue porphyry / grey sandstone setts, each its own; polished tops lighter, edges darker with dirt
    pal = [(hexcol(c), w) for c, w in P["setts"]]
    w = np.array([p[1] for p in pal], f32)
    pick = np.searchsorted(np.cumsum(w / w.sum()), T.child(200).random(n + 1)).clip(0, len(pal) - 1)
    base = np.stack([p[0] for p in pal])[pick][ids]
    col = base * np.exp(pu(6, "normal") * 0.12)[..., None]
    col = col * (1 + T.noise(0.015, 9, octaves=3)[..., None] * 0.08 + T.noise(0.003, 10)[..., None] * 0.06)
    # mineral speckle (porphyry phenocrysts)
    sF1, _, sid, ns = T.worley(0.0035, 11)
    sp = smoothstep(max(0.0008, T.px), max(0.0003, 0.5 * T.px), sF1)
    sv = T.per_unit(sid, ns, 12)
    col = col * (1 + (sp * ((sv > 0.7) * 0.35 - (sv < 0.25) * 0.3))[..., None])
    top = smoothstep(-0.004, 0.0, dome + tilt * 0.3)
    col = col * (1 + top[..., None] * P.get("polish_light", 0.08))
    edge_dirt = smoothstep(-0.012, -0.002, d) * inside
    col = lerp(col, hexcol("#3a352e"), edge_dirt * 0.35)
    # joints: sand + dirt + a little moss
    jcol = hexcol(P["joint_col"]) * (1 + T.noise(0.006, 13, octaves=2) * 0.15)[..., None]
    moss = smoothstep(0.4, 1.4, T.noise(0.15, 14, octaves=3)) * P.get("moss", 0.3)
    jcol = lerp(jcol, hexcol("#3f4a2a"), moss * smoothstep(-0.2, 0.8, T.noise(0.01, 15)))
    gF1, _, gid, ng = T.worley(0.003, 16)
    grit = smoothstep(max(0.0012, T.px), max(0.0004, 0.5 * T.px), gF1)
    jcol = jcol * (1 + (grit * (T.per_unit(gid, ng, 17) - 0.4))[..., None] * 0.5)
    col = lerp(jcol, col, inside)
    rough = lerp(np.full_like(h, 0.95), 0.62 - top * P.get("polish", 0.12) + T.noise(0.02, 18) * 0.05, inside)
    return col, h, rough, U


COBBLES = dict(rows=12, len_lo=0.10, len_hi=0.16, joint=0.014, tilt=2.5, dome=0.005, arris=0.016, joint_depth=0.012,
               joint_col="#5b554b", moss=0.25, polish=0.15, polish_light=0.08,
               setts=[("#6a6a68", 3), ("#5d5e5f", 2.5), ("#75716a", 2), ("#545453", 1.5), ("#807a70", 1), ("#625b56", 1),
                      ("#4c4d4f", 0.8)])


def make_cobbles(extra=None):
    def build(T):
        P = dict(COBBLES, **(extra or {}))
        col, h, rough, U = cobbles(T, P)
        return finish(T, col, h, rough, ao_radius=0.03, ao_strength=1.0)
    return build


# ------------------------------------------------------------------------------------------------ paving_concrete
def paving(T, P):
    nt = P["tiles"]
    pitch = T.size / nt
    U = courses(T, nt, fixed_count_lengths(lambda c: nt, lambda c: pitch, 0.0005), lambda rng, c, l: rng.uniform(-0.001, 0.001),
                k=1, joint=P["joint"], joint_jit=0.0006, unit_h=pitch - P["joint"], h_jit=0.0008, dy_jit=0.0006,
                tilt_deg=0.12, corner_r=0.002)
    ids, n = U["id"], U["n"]
    pu = lambda k, dist="uniform": T.per_unit(ids, n, 100 + k, dist)
    lx, ly, hx, hy = U["lx"], U["ly"], U["hx"], U["hy"]
    # chipped corners / edges
    cn = T.noise(0.02, 2, octaves=2)
    corner = smoothstep(0.8, 1.0, np.minimum(np.abs(lx) / hx, 1) * np.minimum(np.abs(ly) / hy, 1))
    chip = smoothstep(0.0, 0.3, cn - 1.6 + 1.2 * corner + 0.4 * pu(1) * P.get("chips", 0.5)) * 0.02
    d = U["d"] + T.noise(0.01, 3) * 0.0006 + chip
    inside = smoothstep(0.0006, -0.0006, d)
    cham = P.get("chamfer", 0.004)
    t = np.clip(-d / cham, 0, 1)
    edge = -cham * (1 - t) * 0.8
    settle = pu(2, "normal") * 0.0015 + pu(3, "normal") * 0.004 * lx + pu(4, "normal") * 0.004 * ly   # rocked tiles
    # exposed fine aggregate (washed surface) + cement skin
    ag = stones(T, 0.0035, 5, presence=0.55, dome_m=0.00035, flat=0.7)
    surf = T.noise(0.01, 6, octaves=3) * 0.0002 + ag["height"]
    h_t = edge + settle + surf - smoothstep(0.0, 0.004, chip) * 0.003
    h = lerp(np.full_like(d, -0.006) + T.noise(0.003, 7) * 0.0005, h_t, inside)
    base = hexcol(P["color"])
    col = base * np.exp(pu(5, "normal") * P.get("tile_sd", 0.07))[..., None]
    col = col * (1 + T.noise(0.06, 8, octaves=4)[..., None] * 0.07 + T.noise(0.004, 9, octaves=2)[..., None] * 0.05)
    agc = palette_pick(ag["rnd"], [(hexcol("#8f8a82"), 3), (hexcol("#6d6964"), 2), (hexcol("#a8a298"), 1), (hexcol("#5b5a58"), 1)])
    col = lerp(col, agc, ag["mask"] * P.get("agg_show", 0.55))
    # stains: dark spills, rust spot, chewing gum (flat pale grey-black discs)
    stain = smoothstep(0.9, 2.2, T.noise(0.25, 10, octaves=3)) * P.get("stains", 0.4)
    col = col * (1 - stain[..., None] * 0.35)
    gF1, _, gid, ng = T.worley(0.12, 11)
    gr = 0.004 + 0.006 * T.per_unit(gid, ng, 12)
    gum = smoothstep(gr, gr * 0.8, gF1 + T.noise(0.004, 13) * 0.001) * (T.per_unit(gid, ng, 14) < P.get("gum", 0.12))
    col = lerp(col, hexcol("#3e3d3b") * (0.6 + T.per_unit(gid, ng, 15) * 0.9)[..., None], gum * 0.85)
    h = h + gum * 0.0006
    chipm = smoothstep(0.0, 0.003, chip) * inside
    col = lerp(col, hexcol("#8d8880"), chipm * 0.5)
    jcol = hexcol(P.get("joint_col", "#4b4740")) * (1 + T.noise(0.005, 16)[..., None] * 0.2)
    col = lerp(jcol, col, inside)
    rough = lerp(np.full_like(h, 0.95), 0.86 - gum * 0.25 + T.noise(0.03, 17) * 0.04, inside)
    return col, h, rough


PAVING = dict(tiles=6, joint=0.004, chamfer=0.004, color="#8b877f", tile_sd=0.07, chips=0.5, stains=0.4, gum=0.12,
              agg_show=0.5)


def make_paving(extra=None):
    def build(T):
        P = dict(PAVING, **(extra or {}))
        col, h, rough = paving(T, P)
        return finish(T, col, h, rough, ao_radius=0.015)
    return build


MATERIALS = {
    "asphalt": {"size_m": 2.0, "variants": {
        "a": {"seed": 41, "lattice": None, "note": "aged Brussels asphalt, porphyry chips, worn binder", "build": make_asphalt()},
        "b": {"seed": 42, "lattice": None, "note": "newer, darker binder, chips still coated", "build": make_asphalt(dict(binder="#232323", wear=0.25, dust=0.12, oil=0.2, cracks=0.0, macro=0.06))},
        "c": {"seed": 43, "lattice": None, "note": "old, pale and dusty, sealed cracks, oil", "build": make_asphalt(dict(binder="#363532", wear=0.85, dust=0.45, oil=0.5, cracks=0.45, macro=0.14))},
    }},
    "cobbles": {"size_m": 1.5, "variants": {
        "a": {"seed": 51, "lattice": [1, 12], "note": "Saint-Job setts, grey-blue porphyry, sandy joints", "build": make_cobbles()},
        "b": {"seed": 52, "lattice": [1, 12], "note": "warmer sandstone mix, mossy joints", "build": make_cobbles(dict(moss=0.6, setts=[("#7a746a", 3), ("#6b665e", 2), ("#857c70", 2), ("#5e5a55", 1.5), ("#706a63", 1)]))},
        "c": {"seed": 53, "lattice": [1, 12], "note": "darker, tighter joints, polished", "build": make_cobbles(dict(joint=0.010, polish=0.2, joint_col="#4f493f", setts=[("#55585c", 3), ("#4b4e52", 2), ("#636466", 2), ("#3f4144", 1)]))},
    }},
    "paving_concrete": {"size_m": 1.8, "variants": {
        "a": {"seed": 61, "lattice": [6, 6], "note": "Brussels grey 30 cm tiles, gum, stains", "build": make_paving()},
        "b": {"seed": 62, "lattice": [6, 6], "note": "newer, lighter, cleaner", "build": make_paving(dict(color="#9a958c", stains=0.2, gum=0.06, chips=0.3))},
        "c": {"seed": 63, "lattice": [6, 6], "note": "old, darker, chipped, more gum", "build": make_paving(dict(color="#7a766f", stains=0.6, gum=0.2, chips=0.9, tile_sd=0.1))},
    }},
}
