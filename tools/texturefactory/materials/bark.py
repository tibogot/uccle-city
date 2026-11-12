"""Tree bark sets (category "tree"): tileable, image up = up the trunk, 1 m repeat, the scan format (albedo + NRA) of
viewer/trees/textures/bark_<id>_* so viewer/treeTextures.js scanBark() can take them like the CC0 bark scans.

plane          London plane (Platanus x acerifolia): the camouflage. Old olive / grey-brown plates (jigsaw outlines,
               3-12 cm) flaking off a pale buff / cream under-bark, fresh yellow-green patches where a plate just fell,
               plate edges raised and curled with a dark groove outside, a pale rim inside.
beech          beech (Fagus sylvatica): smooth silver-grey, fine horizontal lenticel dashes, soft mottling, green
               algae on one side, branch-scar 'eyes' (dark almond scars with a chevron brow), faint rings.
lime           lime (Tilia): grey-brown, a network of shallow longitudinal fissures and flat interlacing ridges.
horsechestnut  horse chestnut (Aesculus): grey-brown, breaking into thin squarish scales that lift, orange-brown below.
maple          Norway maple (Acer platanoides): fine, regular shallow longitudinal fissures, grey to dark grey.
oak            pedunculate oak (Quercus robur): deep longitudinal fissures, thick rugged ridges with cross-cracks.
birch          silver birch: white papery bark, black horizontal lenticels, dark rough diamonds, curling peel.
"""
import numpy as np

from tf.core import smoothstep, lerp, hexcol, f32, lichen
from tf.bake import finish


def plates(T, P):
    """jigsaw plates in generations (Substance: Cells + Flood Fill to random + warp), flaking"""
    wx = T.noise(P["cell"] * 1.2, 1, octaves=2, gain=0.35) * P["cell"] * P.get("jig", 0.3)
    wy = T.noise(P["cell"] * 1.2, 2, octaves=2, gain=0.35) * P["cell"] * P.get("jig", 0.3)
    F1, F2, ID, n = T.worley(P["cell"], 3, aniso=P.get("aniso", (1.0, 1.0)))
    e = T.warp(F2 - F1, wx, wy)                                        # distance to the plate edge (m)
    ID = T.warp(ID.astype(f32), wx, wy, interp=0).astype(np.int32)
    rng = T.child(9)
    # which layer shows here (age): per plate, clustered in big zones (old plates come off in patches)
    zone = T.noise(P["cell"] * 5, 4, octaves=2)
    gen = np.clip(rng.random(n + 1)[ID] * 0.45 + 0.55 * (zone * 0.25 + 0.5), 0, 1)
    rnd = rng.random(n + 1).astype(f32)[ID]
    return e, gen, rnd, ID


def plane_bark(T, P):
    e, gen, rnd, ID = plates(T, P)
    # a second, finer generation of plates inside the old ones (the plates break up as they age)
    e2, gen2, rnd2, _ = plates(T, dict(P, cell=P["cell"] * 0.4, jig=0.3))
    old = gen < P.get("old", 0.5)                                      # still covered by an old plate
    mid = (gen >= P.get("old", 0.5)) & (gen < P.get("old", 0.5) + P.get("mid", 0.25))
    edge_w = 0.0025
    plate_m = smoothstep(0.0, edge_w, e)                               # inside a plate (away from its outline)
    # height: old plates proud 1.5-3 mm with curled (raised) edges, a groove outside each outline
    curl = smoothstep(edge_w * 3, edge_w, e) * plate_m
    h_old = 0.002 * (0.6 + 0.8 * rnd) + curl * 0.0012 + T.noise(0.01, 10, octaves=2) * 0.0003
    h_old = h_old - smoothstep(0.004, 0.0, e2) * (gen2 < 0.4) * 0.0008     # cracks into the old plates
    h_mid = 0.0009 + T.noise(0.02, 11) * 0.0002 + curl * 0.0006
    h_new = T.noise(0.03, 12, octaves=3) * 0.0003 + T.noise(0.003, 13) * 0.00008
    groove = smoothstep(edge_w * 0.8, 0.0, e) * 0.0012
    h = np.where(old, h_old, np.where(mid, h_mid, h_new)) * plate_m + h_new * (1 - plate_m) - groove
    # colour
    c_old = lerp(hexcol(P["old_a"]), hexcol(P["old_b"]), rnd[..., None])
    c_old = c_old * (1 + T.noise(0.015, 14, octaves=2)[..., None] * 0.12)
    c_mid = lerp(hexcol(P["mid_a"]), hexcol(P["mid_b"]), rnd[..., None])
    c_new = lerp(hexcol(P["new_a"]), hexcol(P["new_b"]), smoothstep(-1, 1, T.noise(0.05, 15, octaves=2))[..., None])
    fresh = (gen > 1 - P.get("fresh", 0.12)).astype(f32)               # just exposed: yellow-green
    c_new = lerp(c_new, hexcol(P["fresh_col"]), fresh * 0.8 * plate_m)
    col = np.where(old[..., None], c_old, np.where(mid[..., None], c_mid, c_new))
    rim = smoothstep(edge_w * 2.5, edge_w * 0.8, e) * plate_m * (old | mid)
    col = lerp(col, hexcol(P["new_a"]) * 1.05, rim * 0.5)               # the pale rim inside a lifting plate
    col = col * (1 - smoothstep(edge_w * 0.8, 0.0, e)[..., None] * 0.45)  # the groove
    col = col * (1 + T.noise(0.2, 16, octaves=3)[..., None] * 0.08)
    # fine fibre (vertical) + speckle on the under-bark
    fib = T.blur(T.white(17) - 0.5, 0.0004)
    fib = T.warp(fib, np.zeros_like(fib), T.noise(0.05, 18) * 0.0)
    col = col * (1 + fib[..., None] * 0.1)
    rough = np.where(old, 0.82, np.where(mid, 0.72, 0.6)).astype(f32) + T.noise(0.03, 19) * 0.04
    return col, h, rough


def beech_bark(T, P):
    h = T.noise(0.15, 1, octaves=3) * 0.0006 + T.noise(0.02, 2, octaves=2) * 0.00012
    # horizontal lenticel dashes (short, thin, raised)
    lF1, lF2, lid, nl = T.worley(0.012, 3, aniso=(2.5, 0.6))
    dash = smoothstep(0.0012, 0.0004, lF1) * (T.per_unit(lid, nl, 4) < 0.35)
    h = h + dash * 0.0002
    # faint horizontal rings / creases
    ring = smoothstep(0.7, 1.0, np.abs(np.sin(T.yy * 2 * np.pi / 0.05 + T.noise(0.3, 5) * 3)).astype(f32)) * 0.6
    ring = ring * smoothstep(0.0, 0.8, T.noise(0.2, 6))
    h = h - ring * 0.00015
    # branch-scar eyes: an almond scar + a chevron brow above
    rng = T.child(7)
    eye = np.zeros_like(h)
    brow = np.zeros_like(h)
    for i in range(P.get("eyes", 3)):
        cx, cy = rng.random() * T.size, rng.random() * T.size
        w = rng.uniform(0.03, 0.09)
        hh = w * rng.uniform(0.25, 0.4)
        dx = (T.xx - cx + T.size / 2) % T.size - T.size / 2
        dy = (T.yy - cy + T.size / 2) % T.size - T.size / 2
        q = (dx / w) ** 2 + (dy / hh) ** 2
        eye = np.maximum(eye, smoothstep(1.0, 0.6, q + T.noise(0.01, 20 + i) * 0.15))
        # chevron brow: two arms rising from the scar's centre outward
        arm = np.abs(dy + hh * 1.3 + np.abs(dx) * rng.uniform(0.35, 0.6))
        reach = smoothstep(w * 2.2, w * 0.3, np.abs(dx)) * (np.abs(dx) > w * 0.15)
        brow = np.maximum(brow, smoothstep(0.004, 0.0, arm) * reach)
    h = h - eye * 0.002 + brow * 0.0005
    col = hexcol(P["color"]) * (1 + T.noise(0.08, 8, octaves=4)[..., None] * 0.1)
    col = lerp(col, hexcol(P["dark"]), smoothstep(0.4, 1.8, T.noise(0.06, 9, octaves=3)) * 0.35)
    col = lerp(col, hexcol("#6e6b63"), dash * 0.6)
    col = lerp(col, hexcol(P["dark"]) * 0.7, eye * 0.85)
    col = lerp(col, hexcol(P["dark"]), brow * 0.5)
    # algae: green on one side, in soft clouds
    alg = smoothstep(0.3, 1.5, T.noise(0.25, 10, octaves=3)) * P.get("algae", 0.4)
    col = lerp(col, hexcol("#6e7a4c"), np.clip(alg, 0, 0.7))
    lic, lr = lichen(T, 11, 0.08, P.get("lichen", 0.15) * 2, 0.004, 0.02)
    col = lerp(col, lerp(hexcol("#a9ad9a"), hexcol("#c0c3b2"), lr[..., None]), lic * 0.6)
    rough = 0.6 + alg * 0.2 + eye * 0.2 + T.noise(0.05, 12) * 0.04
    return col, h, rough


def fissured(T, P):
    """longitudinal fissures + ridges (lime, maple, oak): vertically stretched cells, their borders cut as fissures"""
    asp = P.get("stretch", 4.0)
    wx = T.noise(P["cell"] * 3.0, 1, octaves=2) * P["cell"] * 0.12
    wy = T.noise(P["cell"] * 3.0, 2, octaves=2) * P["cell"] * 0.3
    F1, F2, ID, n = T.worley(P["cell"], 3, aniso=(1.0 / np.sqrt(asp), np.sqrt(asp)))
    F2, F1 = F2 / np.sqrt(asp) * 1.0, F1 / np.sqrt(asp) * 1.0             # back to ~metres across the ridges
    e = T.warp(F2 - F1, wx, wy)
    e = e + T.noise(P["cell"] * 0.5, 13) * P["fis_w"] * 0.3
    fis = smoothstep(P["fis_w"], 0.0, e)                                 # 1 in a fissure
    ridge = smoothstep(0.0, P["cell"] * 0.25, e)
    depth = P["depth"]
    h = -fis * depth + ridge * depth * 0.3 + T.noise(0.01, 4, octaves=2) * depth * 0.08
    # cross-cracks on the ridges (oak)
    if P.get("cross"):
        cy = np.abs(np.sin(T.yy * 2 * np.pi / P["cross"] + T.noise(0.05, 5) * 4)).astype(f32)
        cut = smoothstep(0.08, 0.0, cy) * smoothstep(0.3, 0.8, T.noise(0.04, 6))
        h = h - cut * depth * 0.5
    fib = T.blur(T.white(7) - 0.5, 0.0006)
    fibv = T.warp(fib, np.zeros_like(fib), np.zeros_like(fib))
    h = h + T.blur(fibv, 0.0004) * depth * 0.05
    rnd = T.child(8).random(n + 1).astype(f32)[T.warp(ID.astype(f32), wx, wy, interp=0).astype(np.int32)]
    col = lerp(hexcol(P["ridge_a"]), hexcol(P["ridge_b"]), rnd[..., None])
    col = col * (1 + T.noise(0.05, 9, octaves=3)[..., None] * 0.1)
    col = lerp(col, hexcol(P["fis_col"]), fis * 0.85)
    col = lerp(col, hexcol(P["ridge_a"]) * 1.25, smoothstep(0.6, 1.0, ridge) * smoothstep(0.3, 1.2, T.noise(0.02, 10)) * 0.3)
    alg = smoothstep(0.5, 1.6, T.noise(0.3, 11, octaves=3)) * P.get("algae", 0.25)
    col = lerp(col, hexcol("#5f6b40"), np.clip(alg * (0.4 + fis), 0, 0.7))
    lic, lr = lichen(T, 12, 0.08, P.get("lichen", 0.1) * 2, 0.005, 0.02)
    col = lerp(col, hexcol("#9ea08a"), lic * 0.6)
    rough = 0.88 - ridge * 0.06 + fis * 0.05
    return col, h, rough


def scales(T, P):
    """horse chestnut: squarish thin scales lifting at their lower edge, orange-brown beneath"""
    e, gen, rnd, ID = plates(T, dict(P, aniso=(1.0, 1.4), jig=0.25))
    sc = smoothstep(0.0, 0.003, e)
    # each scale lifts: height rises toward its lower edge (local gradient approximated by the edge distance + y)
    lift = T.warp(e, np.zeros_like(e), np.full_like(e, -0.004)) - e
    h = sc * (0.0015 + 0.002 * rnd) + np.clip(-lift, 0, None) * 0.3 - smoothstep(0.002, 0.0, e) * 0.002
    h = h + T.noise(0.01, 20, octaves=2) * 0.0003
    col = lerp(hexcol(P["a"]), hexcol(P["b"]), rnd[..., None]) * (1 + T.noise(0.03, 21)[..., None] * 0.1)
    under = smoothstep(0.003, 0.0, e) + (gen > 0.85) * sc
    col = lerp(col, hexcol(P["under"]), np.clip(under, 0, 1) * 0.7)
    lic, lr = lichen(T, 22, 0.08, 0.2, 0.004, 0.015)
    col = lerp(col, hexcol("#9da08a"), lic * 0.5)
    rough = 0.85 - under * 0.05
    return col, h, rough


def birch(T, P):
    h = T.noise(0.1, 1, octaves=3) * 0.0003
    lF1, _, lid, nl = T.worley(0.03, 2, aniso=(3.0, 0.5))
    lent = smoothstep(0.004, 0.001, lF1) * (T.per_unit(lid, nl, 3) < 0.6)
    col = hexcol("#e3e1d9") * (1 + T.noise(0.05, 4, octaves=3)[..., None] * 0.05)
    col = lerp(col, hexcol("#d6cfbd"), smoothstep(0.2, 1.5, T.noise(0.15, 5, octaves=2)) * 0.6)
    col = lerp(col, hexcol("#2c2a28"), lent * 0.85)
    h = h - lent * 0.0006
    # dark rough diamonds / patches
    dia = smoothstep(0.8, 1.6, T.noise(0.2, 6, octaves=4) + 0.3 * T.noise(0.03, 7))
    col = lerp(col, hexcol("#3a3632"), dia * 0.9)
    h = h - dia * 0.002 + dia * T.noise(0.01, 8) * 0.001
    # peeling papery strips (curl at the edge)
    peel = smoothstep(0.85, 1.0, T.warp(T.noise(0.1, 9, octaves=2), T.noise(0.2, 10) * 0.02, np.zeros_like(h)))
    col = lerp(col, hexcol("#c79a6a"), peel * 0.5)
    h = h + peel * 0.0004
    rough = 0.55 + dia * 0.35
    return col, h, rough


PLANE = dict(cell=0.075, jig=0.45, old=0.42, mid=0.22, fresh=0.14, old_a="#6f6c50", old_b="#8a8061",
             mid_a="#9a9576", mid_b="#a8a07c", new_a="#cdc6a4", new_b="#ddd5b1", fresh_col="#c6c582")
BEECH = dict(color="#9c9c95", dark="#5d5d58", eyes=3, algae=0.35, lichen=0.12)
LIME = dict(cell=0.04, stretch=5.0, fis_w=0.004, depth=0.006, ridge_a="#6f665a", ridge_b="#857b6c", fis_col="#2f2a24", algae=0.25)
MAPLE = dict(cell=0.025, stretch=6.0, fis_w=0.0025, depth=0.004, ridge_a="#6c6862", ridge_b="#7d7870", fis_col="#2d2a27", algae=0.2)
OAK = dict(cell=0.06, stretch=3.5, fis_w=0.012, depth=0.02, cross=0.07, ridge_a="#6d675d", ridge_b="#857e72", fis_col="#211d19", algae=0.3)
CHESTNUT = dict(cell=0.06, a="#6a5e52", b="#7f7366", under="#8a5a3a")


def mk(fn, P, ao=0.02):
    def build(T):
        col, h, rough = fn(T, P)
        return finish(T, col, h - h.mean(), rough, ao_radius=ao)
    return build


MATERIALS = {
    "bark_plane": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 201, "note": "London plane camouflage: olive plates on a cream under-bark", "build": mk(plane_bark, PLANE, 0.015)},
        "b": {"seed": 202, "note": "plane, older trunk: more plates, darker", "build": mk(plane_bark, dict(PLANE, old=0.6, mid=0.2, fresh=0.08), 0.015)},
    }},
    "bark_beech": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 211, "note": "beech: smooth silver-grey, eyes, algae", "build": mk(beech_bark, BEECH, 0.02)},
        "b": {"seed": 212, "note": "beech, cleaner and paler", "build": mk(beech_bark, dict(BEECH, color="#a7a8a2", algae=0.15, eyes=2), 0.02)},
    }},
    "bark_lime": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 221, "note": "lime: shallow interlacing fissures", "build": mk(fissured, LIME)}}},
    "bark_horsechestnut": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 231, "note": "horse chestnut: lifting squarish scales", "build": mk(scales, CHESTNUT)}}},
    "bark_maple": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 241, "note": "Norway maple: fine regular fissures", "build": mk(fissured, MAPLE)}}},
    "bark_oak": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 251, "note": "oak: deep fissures, rugged ridges", "build": mk(fissured, OAK, 0.04)}}},
    "bark_birch": {"size_m": 1.0, "category": "tree", "variants": {
        "a": {"seed": 261, "note": "silver birch: white, lenticels, dark diamonds", "build": mk(birch, {})}}},
}
