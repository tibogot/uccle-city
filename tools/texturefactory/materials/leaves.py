"""Leaf-spray atlases (category "tree", kind "leaf"): plane, beech, lime, horse chestnut, maple; summer + spring +
autumn albedo per spray, one shared normal + thickness map. Format: tf/leaves.py (= tools/blender/leafAtlas.py +
process_tree_textures.py on claude/foundation). Colours: linear from sRGB picked by eye (look-only photo checks).
"""
import json
import os
import time

import cv2
import numpy as np

from tf import leaves as L
from tf.core import srgb_to_lin, lin_to_srgb, f32
from tf.bake import OUT_WEB, RAW

h = lambda s: srgb_to_lin([int(s[i:i + 2], 16) / 255 for i in (1, 3, 5)])

SPECIES = {
    "plane": dict(shape="palmate", veins="palmate", lobes=[(0.0, 1.0), (0.85, 0.82), (-0.85, 0.82), (1.6, 0.5), (-1.6, 0.5)],
                  leaf=0.2, per_twig=4, twigs=6, loose=9, petiole=0.3, fold=0.25, cup=0.2,
                  summer=[(h("#4f6b2a"), 3), (h("#5b7631"), 2), (h("#466024"), 2), (h("#6b8139"), 1)],
                  spring=[(h("#7f9c3c"), 3), (h("#8eaa46"), 2), (h("#73913a"), 1)],
                  autumn=[(h("#a88a3a"), 3), (h("#8c6a32"), 2), (h("#b39a4b"), 1.5), (h("#6f5a35"), 1.5), (h("#7d8a3a"), 1)],
                  autumn_edge=h("#5a4128")),
    "beech": dict(shape="ovate", veins="pinnate", width=0.3, tip=0.75, taper=0.3, teeth=0.045, nteeth=8, nveins=8,
                  vein_angle=1.0, leaf=0.135, per_twig=10, twigs=8, loose=30, petiole=0.1, zigzag=True, fold=0.35, cup=0.15,
                  summer=[(h("#3f5d22"), 3), (h("#4a6a28"), 2), (h("#36521d"), 2), (h("#58772e"), 1)],
                  spring=[(h("#8fb041"), 3), (h("#a3bf4c"), 2), (h("#7fa23a"), 1)],
                  autumn=[(h("#b0682a"), 3), (h("#9a5424"), 2), (h("#c48a3a"), 1.5), (h("#7a4a24"), 1.5), (h("#b39a3e"), 0.8)],
                  autumn_edge=h("#5e3a1e")),
    "lime": dict(shape="palmate", veins="palmate", lobes=[(0.0, 1.0), (0.6, 0.85), (-0.6, 0.85), (2.5, 0.62), (-2.5, 0.62)],
                 body=0.62, lobe_k=1.2, lobe_p=1.0, teeth=0.05, nteeth=40, cx=0.48,
                 leaf=0.15, per_twig=6, twigs=7, loose=12, petiole=0.3, fold=0.2, cup=0.2,
                 summer=[(h("#4b6a26"), 3), (h("#567430"), 2), (h("#425d21"), 2), (h("#62803a"), 1)],
                 spring=[(h("#8db043"), 3), (h("#9cbd50"), 2)],
                 autumn=[(h("#c2a43a"), 3), (h("#b08f33"), 2), (h("#d1b852"), 1.5), (h("#8f7a3a"), 1)],
                 autumn_edge=h("#6b5226")),
    # the horse chestnut (Aesculus hippocastanum): rosettes of big palmate leaves (7 obovate leaflets) at the shoot
    # tips, white candles in spring, early rust-brown autumn with leaf-miner blotches, bare stout twigs with sticky
    # buds and upturned tips in winter: its own spray (tf/chestnut.py, make_chestnut below; docs/trees/HORSE_CHESTNUT.md)
    "horsechestnut": dict(width=0.18, teeth=0.035, nteeth=22, nveins=16, vein_angle=1.25, vein_w=0.011, fold=0.3, cup=0.32,
                          leaf=0.13, rosettes=8, spacing=0.17, loose=10, droop=0.22, p7=0.75, candle_p=0.8,
                          vein_tint=[1.12, 1.15, 0.75], petiole_hex="#7d8a48", shoot_col="#6f5e4c",
                          summer=[(h("#3d5f22"), 3), (h("#466a27"), 2), (h("#35551d"), 2), (h("#52762e"), 1), (h("#2f4a1a"), 1)],
                          spring=[(h("#7aa53a"), 3), (h("#88b244"), 2), (h("#6c9732"), 2), (h("#97bd54"), 1)],
                          autumn=[(h("#b8973e"), 2), (h("#9c6a30"), 2.2), (h("#7e4c28"), 2), (h("#634328"), 1.5), (h("#a09a44"), 1.2),
                                  (h("#5a7230"), 0.9)],
                          autumn_edge=h("#4a3020"), autumn_keep=0.85,
                          under={"summer": (0.1, h("#6a8350")), "spring": (0.1, h("#9cba70")), "autumn": (0.1, h("#a08a50"))}),
    "maple": dict(shape="palmate", veins="palmate", lobes=[(0.0, 1.0), (1.0, 0.9), (-1.0, 0.9), (1.9, 0.62), (-1.9, 0.62)],
                  body=0.38, lobe_k=2.4, lobe_p=1.2, teeth=0.16, nteeth=9, leaf=0.19, per_twig=4, twigs=6, loose=9,
                  petiole=0.5, fold=0.2, cup=0.15,
                  summer=[(h("#456a26"), 3), (h("#4f752c"), 2), (h("#3b5c20"), 2), (h("#5c8236"), 1)],
                  spring=[(h("#8cb244"), 3), (h("#9cc052"), 2)],
                  autumn=[(h("#d0a032"), 3), (h("#c9772a"), 2), (h("#b0442a"), 1.2), (h("#e0b844"), 1.5), (h("#8a6a2a"), 0.8)],
                  autumn_edge=h("#7a3a1e")),
    # (last: the seeds below go by position)
    # the copper beech (Fagus sylvatica 'Atropunicea' / f. purpurea): the beech's leaf and spray, dark purple-red.
    # Young leaves ruby, summer leaves maroon to purple-brown with some bronze-green shade leaves, undersides paler
    # and greener (olive-bronze); autumn copper; winter: marcescent tan-brown leaves held on young / clipped trees
    # (a sparse spray: `winter_keep` of the leaves stay, the twigs show)
    "copperbeech": dict(shape="ovate", veins="pinnate", width=0.3, tip=0.75, taper=0.3, teeth=0.045, nteeth=8, nveins=8,
                        vein_angle=1.0, leaf=0.09, per_twig=15, twigs=10, loose=110, petiole=0.1, zigzag=True, fold=0.35, cup=0.15,
                        vein_tint=[1.25, 1.05, 0.95],
                        summer=[(h("#4b2026"), 3), (h("#5a2a2a"), 2), (h("#3e1c22"), 2), (h("#6a3530"), 1), (h("#4a3026"), 0.7)],
                        spring=[(h("#7e2a36"), 3), (h("#8e3540"), 2), (h("#6a2430"), 2), (h("#9a4a44"), 1)],
                        autumn=[(h("#8c4a24"), 3), (h("#a0602c"), 2), (h("#6e3a20"), 2), (h("#b8783a"), 1), (h("#5a3020"), 1)],
                        autumn_edge=h("#4a2a18"),
                        winter=[(h("#9a6b3e"), 3), (h("#87582f"), 2), (h("#b0814f"), 1.5), (h("#6e4526"), 1)],
                        winter_edge=h("#5a3a20"), winter_keep=0.05, twig_w=0.009,
                        under={"summer": (0.1, h("#4e4232")), "spring": (0.12, h("#8a4a4a")), "autumn": (0.12, h("#8a6a3c"))},
                        petiole_col=[0.42, 0.24, 0.2]),
}


def make_leaf(sp_name):
    sp = SPECIES[sp_name]

    def build(R, seed, quick=False):
        t0 = time.time()
        C, table = L.spray(sp, R * 2, seed)
        a, n, th = L.finish_spray(C, R)
        out = {}
        name = f"leaf_{sp_name}"
        web = os.path.join(OUT_WEB, "trees")
        os.makedirs(web, exist_ok=True)
        work = os.path.join(RAW, "_work")
        os.makedirs(work, exist_ok=True)
        src = os.path.join(RAW, "out", name)
        os.makedirs(src, exist_ok=True)
        a8 = np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
        cov = float((a8 >= 128).mean())
        # normal + thickness (shared by the seasons)
        nt = np.dstack([n[..., 0] * 0.5 + 0.5, n[..., 1] * 0.5 + 0.5, th, np.ones_like(th)])
        nt8 = np.clip(np.round(nt * 255), 0, 255).astype(np.uint8)
        nt8 = bleed(nt8, a8)
        cv2.imwrite(os.path.join(src, "normal_thick.png"), cv2.cvtColor(nt8, cv2.COLOR_RGBA2BGRA))
        entries = {}
        under = sp.get("under", {})
        seasons = [("summer", sp["summer"], {"under": under.get("summer")}), ("spring", sp["spring"], {"under": under.get("spring")}),
                   ("autumn", sp["autumn"], {"edge": sp.get("autumn_edge"), "spots": sp.get("autumn_spots", 0.25), "under": under.get("autumn")})]
        if sp.get("winter"):
            # winter (marcescent): only `winter_keep` of the leaves stay on (curled, tan), the twigs and petioles show;
            # its own coverage (the albedo's alpha), the shared normal + thickness
            hold = (C.leaf < 0) | (table[np.clip(C.leaf, 0, None)][..., 3] < sp["winter_keep"])
            seasons.append(("winter", sp["winter"], {"edge": sp.get("winter_edge"), "spots": 0.4, "hold": hold}))
        n_bytes = None
        if not quick:
            levels = [np.clip(np.round(l), 0, 255) for l in L.box_mips(nt8.astype(np.float32))]
            n_bytes = L.ktx_levels(levels, os.path.join(web, f"{name}_n.ktx2"), False, work)
        prev = []
        for season, pal, sk in seasons:
            a_s, a8_s = a, a8
            if sk.get("hold") is not None:
                Cw = L.Canvas(C.R)
                for k in vars(C):
                    setattr(Cw, k, getattr(C, k))
                Cw.a = C.a * sk["hold"]
                Cw.leaf = np.where(sk["hold"], C.leaf, -1)
                a_s = L.finish_spray(Cw, R)[0]
                a8_s = np.clip(np.round(a_s * 255), 0, 255).astype(np.uint8)
                albL = L.colour(Cw, table, pal, sp, sk)
            else:
                albL = L.colour(C, table, pal, sp, sk)
            albL = cv2.resize(albL, (R, R), interpolation=cv2.INTER_AREA)
            srgb = np.clip(np.round(lin_to_srgb(albL) * 255), 0, 255).astype(np.float32)
            srgb = L.bleed(srgb, a8_s)
            rgba = np.dstack([srgb, a8_s.astype(np.float32)]).astype(np.uint8)
            tag = "" if season == "summer" else f"_{season}"
            cv2.imwrite(os.path.join(src, f"albedo{tag}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
            onL = albL[a_s > 0.5]
            mean = [round(float(v), 4) for v in onL.mean(0)]
            e = {"material": name, "category": "tree", "kind": "leaf", "source": "texfactory", "id": f"tf_{name}{tag}",
                 "licence": "CC0 (generated)", "season": season, "px": R, "coverage": round(float((a8_s >= 128).mean()), 4),
                 "mean_albedo_linear": mean, "mean_thickness": round(float(th[a_s > 0.5].mean()), 3),
                 "files": f"generated/trees/{name}{tag}", "n_file": f"generated/trees/{name}_n.ktx2",
                 "url": f"tools/texturefactory (materials/leaves.py, seed {seed})"}
            if not quick:
                lv = [rgba]
                cm = L.coverage_mips(a8_s)
                cs = L.box_mips(srgb)
                lv = [np.dstack([np.clip(np.round(c), 0, 255), m.astype(np.float32)]) for c, m in zip(cs, cm)]
                e["a_ktx2_bytes"] = L.ktx_levels(lv, os.path.join(web, f"{name}{tag}_a.ktx2"), True, work)
                e["n_ktx2_bytes"] = n_bytes
            entries[e["id"]] = e
            # preview on a mid-grey / sky background
            bg = np.full((R, R, 3), 0.62, f32) * np.array([0.8, 0.9, 1.0], f32)
            pv = lin_to_srgb(albL * 1.6) * a_s[..., None] + bg * (1 - a_s[..., None])
            prev.append((np.clip(pv, 0, 1) * 255).astype(np.uint8))
        cv2.imwrite(os.path.join(src, "preview.png"), cv2.cvtColor(np.hstack(prev), cv2.COLOR_RGB2BGR))
        print(f"{name} {R}px coverage {cov:.3f} {time.time() - t0:.1f}s")
        return entries
    return build


def bleed(rgba8, a8):
    rgb = L.bleed(rgba8[..., :3].astype(np.float32), a8)
    return np.dstack([np.clip(np.round(rgb), 0, 255), rgba8[..., 3:]]).astype(np.uint8)


MATERIALS = {f"leaf_{k}": {"size_m": 0, "category": "tree", "kind": "leaf",
                           "variants": {"a": {"seed": 300 + i * 7, "note": f"{k} leaf spray (summer / spring / autumn)", "build": make_leaf(k)}}}
             for i, k in enumerate(SPECIES)}


def make_chestnut(sp_name="horsechestnut"):
    """the horse chestnut's spray (tf/chestnut.py): summer / autumn share the summer spray's normal + thickness; spring
    (its candles over the leaves) and winter (bare twigs) have their own (manifest field n_file)"""
    from tf import chestnut as HC
    sp = SPECIES[sp_name]

    def build(R, seed, quick=False):
        t0 = time.time()
        name = f"leaf_{sp_name}"
        web = os.path.join(OUT_WEB, "trees")
        work = os.path.join(RAW, "_work")
        src = os.path.join(RAW, "out", name)
        for d in (web, work, src):
            os.makedirs(d, exist_ok=True)
        C, table, ros = HC.rosettes(sp, R * 2, seed)
        rng = np.random.default_rng(seed + 9)
        # spring: the candles drawn over a copy of the spray
        Cs = L.Canvas(C.R)
        for k, v in vars(C).items():
            setattr(Cs, k, v.copy() if isinstance(v, np.ndarray) else v)
        HC.candles(Cs, ros, sp, rng)
        Cw = HC.winter_twigs(sp, R * 2, seed)
        # autumn: early leaf fall, `autumn_keep` of the leaves still on
        hold = (C.leaf < 0) | (table[np.clip(C.leaf, 0, None)][..., 3] < sp["autumn_keep"])
        Ca = L.Canvas(C.R)
        for k, v in vars(C).items():
            setattr(Ca, k, v)
        Ca.a = C.a * hold
        Ca.leaf = np.where(hold, C.leaf, -1)
        under = sp.get("under", {})
        seasons = [("summer", C, sp["summer"], {"under": under.get("summer"), "miner": 0.12, "miner_thr": 2.1, "leaflet_v": 0.1}, ""),
                   ("spring", Cs, sp["spring"], {"under": under.get("spring"), "leaflet_v": 0.08}, "_spring"),
                   ("autumn", Ca, sp["autumn"], {"edge": sp["autumn_edge"], "spots": 0.4, "under": under.get("autumn"), "miner": 0.6,
                                                 "miner_thr": 1.3, "leaflet_v": 0.22, "leaflet_hue": 0.2}, ""),
                   ("winter", Cw, [(h("#6b655d"), 1)], {}, "_winter")]
        normals = {}
        entries, prev = {}, []
        for season, Cx, pal, sk, ntag in seasons:
            a, n, th = L.finish_spray(Cx, R)
            a8 = np.clip(np.round(a * 255), 0, 255).astype(np.uint8)
            if ntag not in normals:
                nt = np.dstack([n[..., 0] * 0.5 + 0.5, n[..., 1] * 0.5 + 0.5, th, np.ones_like(th)])
                nt8 = bleed(np.clip(np.round(nt * 255), 0, 255).astype(np.uint8), a8)
                cv2.imwrite(os.path.join(src, f"normal_thick{ntag}.png"), cv2.cvtColor(nt8, cv2.COLOR_RGBA2BGRA))
                nb = None
                if not quick:
                    levels = [np.clip(np.round(l), 0, 255) for l in L.box_mips(nt8.astype(np.float32))]
                    nb = L.ktx_levels(levels, os.path.join(web, f"{name}{ntag}_n.ktx2"), False, work)
                normals[ntag] = (nb, float(th[a > 0.5].mean()))
            if season == "winter":
                albL = Cx.alb
            else:
                albL = HC.leaf_colour(Cx, table, pal, sp, sk, L.colour)
            albL = cv2.resize(albL, (R, R), interpolation=cv2.INTER_AREA)
            srgb = np.clip(np.round(lin_to_srgb(albL) * 255), 0, 255).astype(np.float32)
            srgb = L.bleed(srgb, a8)
            rgba = np.dstack([srgb, a8.astype(np.float32)]).astype(np.uint8)
            tag = "" if season == "summer" else f"_{season}"
            cv2.imwrite(os.path.join(src, f"albedo{tag}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
            onL = albL[a > 0.5]
            e = {"material": name, "category": "tree", "kind": "leaf", "source": "texfactory", "id": f"tf_{name}{tag}",
                 "licence": "CC0 (generated)", "season": season, "px": R, "coverage": round(float((a8 >= 128).mean()), 4),
                 "mean_albedo_linear": [round(float(v), 4) for v in onL.mean(0)], "mean_thickness": round(normals[ntag][1], 3),
                 "files": f"generated/trees/{name}{tag}", "n_file": f"generated/trees/{name}{ntag}_n.ktx2",
                 "url": f"tools/texturefactory (materials/leaves.py make_chestnut + tf/chestnut.py, seed {seed})"}
            if not quick:
                cm = L.coverage_mips(a8)
                cs = L.box_mips(srgb)
                lv = [np.dstack([np.clip(np.round(c), 0, 255), m.astype(np.float32)]) for c, m in zip(cs, cm)]
                e["a_ktx2_bytes"] = L.ktx_levels(lv, os.path.join(web, f"{name}{tag}_a.ktx2"), True, work)
                e["n_ktx2_bytes"] = normals[ntag][0]
            entries[e["id"]] = e
            bg = np.full((R, R, 3), 0.62, f32) * np.array([0.8, 0.9, 1.0], f32)
            pv = lin_to_srgb(albL * 1.6) * a[..., None] + bg * (1 - a[..., None])
            prev.append((np.clip(pv, 0, 1) * 255).astype(np.uint8))
        # (the preview as the card shows it: canvas row 0 at the card's bottom, so flipped upright here)
        cv2.imwrite(os.path.join(src, "preview.png"), cv2.cvtColor(np.hstack([p[::-1] for p in prev]), cv2.COLOR_RGB2BGR))
        print(f"{name} {R}px coverage " + ", ".join(f"{e['season']} {e['coverage']:.3f}" for e in entries.values()) + f" {time.time() - t0:.1f}s")
        return entries
    return build


MATERIALS["leaf_horsechestnut"]["variants"]["a"].update(note="horse chestnut: leaf rosettes, spring candles, autumn, bare winter twigs",
                                                         build=make_chestnut("horsechestnut"))
