"""Brick materials (brick_red_brussels, brick_yellow, brick_dark): parameters for tf.masonry.brick_wall.

Scale: Belgian bricks ~21 x 10 x 6.5 cm (Boom / Rupel clay 'rode baksteen'), 1 cm lime joints -> 7.5 cm courses,
22.5 cm stretcher module. One repeat = 1.8 m = 24 courses x 8 stretchers (16 headers in a header course).
Colours (sRGB) picked by eye from look-only photo checks of Uccle streets (no image data stored or traced).
"""
from tf.masonry import brick_wall, grime
from tf.bake import finish

SIZE = 1.8
LAT_STRETCHER = [8, 24]
LAT_CROSS = [8, 12]          # cross bond repeats every 4 courses: the anti-tiling snaps to pairs of 'lattice' rows

BASE = dict(courses=24, units=8, joint=0.010, len_jit=0.004, h_jit=0.0012, dy_jit=0.0007, tilt=0.35, corner_r=0.002,
            edge_warp=0.0012, chips=0.55, chip_depth=0.011, arris_r=0.003, pillow=0.0008, proud=0.0008,
            recess=0.006, smear=0.35, pits=0.08, pit_depth=0.0006, wave_h=0.00022, creases=0.3, film=0.08)

RED = dict(BASE, palette=[("#7a3d2c", 4), ("#86472f", 3), ("#6b352a", 3), ("#93553b", 1.5), ("#5a2f2a", 1.0),
                          ("#a0623f", 0.7), ("#4a2a26", 0.5)],
           val_sd=0.10, warm_sd=0.22, flash=0.35, flash_p=0.3, clouds=0.06, mottle=0.04, fine=0.05,
           lime_specks=0.02, iron_specks=0.15, lime_col="#b9a58a", mortar="#8d8579", mortar_dirt=0.3, bloom=0.0, bleach=0.08,
           rough_brick=0.84, rough_mortar=0.95, chip_tint=[1.25, 1.12, 1.0])

YELLOW = dict(BASE, palette=[("#c9a46a", 4), ("#bf9a62", 3), ("#d2b07a", 2), ("#b48c58", 1.5), ("#a77f52", 0.8),
                             ("#d8bc8c", 0.8), ("#9c7a55", 0.4)],
              val_sd=0.08, warm_sd=0.25, flash=0.3, flash_p=0.25, clouds=0.06, mottle=0.05, fine=0.06,
              lime_specks=0.06, iron_specks=0.22, lime_col="#e9e0c9", mortar="#bdb6a8", mortar_dirt=0.3, bloom=0.0,
              bleach=0.06, rough_brick=0.86, rough_mortar=0.95, chip_tint=[1.08, 1.06, 1.02], pits=0.35)

DARK = dict(BASE, palette=[("#4a2c2c", 4), ("#3f2627", 3), ("#55332d", 2.5), ("#5d3a33", 1.2), ("#33211f", 1.5),
                           ("#6a4135", 0.6), ("#46302f", 1.0)],
            val_sd=0.12, warm_sd=0.3, flash=0.35, flash_p=0.35, clouds=0.08, mottle=0.05, fine=0.05,
            lime_specks=0.02, iron_specks=0.10, mortar="#9a948a", mortar_dirt=0.2, bloom=0.0, bleach=0.10,
            rough_brick=0.62, rough_mortar=0.93, glaze=0.45, chip_tint=[1.4, 1.25, 1.15], chips=0.35,
            arris_r=0.0022, pillow=0.0005, len_jit=0.002, h_jit=0.0008, pits=0.12)


def make(P, bond, grime_amt, extra=None):
    def build(T):
        Q = dict(P, bond=bond, **(extra or {}))
        if bond == "cross":
            Q["header_burn"] = Q.get("header_burn", 0.25)
        r = brick_wall(T, Q)
        m = finish(T, r["albedo"], r["height"], r["rough"], ao_radius=0.02)
        m["albedo"] = grime(T, m["albedo"], m["ao"], grime_amt, colour="#2b2522")
        return m
    return build


MATERIALS = {
    "brick_red_brussels": {
        "size_m": SIZE,
        "variants": {
            "a": {"seed": 11, "lattice": LAT_CROSS, "note": "cross bond (kruisverband), burnt headers, lime joints",
                  "build": make(RED, "cross", 0.25)},
            "b": {"seed": 12, "lattice": LAT_STRETCHER, "note": "stretcher bond, machine-made, cleaner",
                  "build": make(RED, "stretcher", 0.15, dict(chips=0.3, len_jit=0.002, tilt=0.2))},
            "c": {"seed": 13, "lattice": LAT_CROSS, "note": "cross bond, older and sooty, more chipped",
                  "build": make(RED, "cross", 0.5, dict(chips=0.7, mortar="#a49c8e", bloom=0.3))},
        },
    },
    "brick_yellow": {
        "size_m": SIZE,
        "variants": {
            "a": {"seed": 21, "lattice": LAT_STRETCHER, "note": "buff / yellow stretcher bond, grey lime joints",
                  "build": make(YELLOW, "stretcher", 0.25)},
            "b": {"seed": 22, "lattice": LAT_CROSS, "note": "cross bond, warmer ochre",
                  "build": make(YELLOW, "cross", 0.3, dict(header_burn=0.25, warm_sd=0.35))},
            "c": {"seed": 23, "lattice": LAT_STRETCHER, "note": "stretcher, soot-darkened, salt bloom",
                  "build": make(YELLOW, "stretcher", 0.55, dict(bloom=0.35, chips=0.6))},
        },
    },
    "brick_dark": {
        "size_m": SIZE,
        "variants": {
            "a": {"seed": 31, "lattice": LAT_STRETCHER, "note": "purple-brown clinker, part glazed, grey joints",
                  "build": make(DARK, "stretcher", 0.15)},
            "b": {"seed": 32, "lattice": LAT_STRETCHER, "note": "clinker, pale mortar, more glaze",
                  "build": make(DARK, "stretcher", 0.12, dict(mortar="#b9b2a5", glaze=0.65))},
            "c": {"seed": 33, "lattice": LAT_CROSS, "note": "cross bond clinker, burnt headers",
                  "build": make(DARK, "cross", 0.2, dict(header_burn=0.4))},
        },
    },
}
