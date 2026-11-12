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
                  vein_angle=1.0, leaf=0.115, per_twig=9, twigs=8, loose=18, petiole=0.1, zigzag=True, fold=0.35, cup=0.15,
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
    "horsechestnut": dict(shape="ovate", veins="pinnate", obovate=True, width=0.11, tip=0.6, taper=0.0, teeth=0.02, nteeth=24,
                          nveins=14, vein_angle=0.8, compound=7, leaf=0.15, per_twig=3, twigs=6, loose=5, petiole=0.6,
                          fold=0.3, cup=0.2,
                          summer=[(h("#3c5a20"), 3), (h("#466626"), 2), (h("#34501c"), 2)],
                          spring=[(h("#7ea23a"), 3), (h("#8db046"), 2)],
                          autumn=[(h("#a8642a"), 3), (h("#8a4f24"), 2), (h("#bf8a3a"), 1.5), (h("#6b4a2a"), 1.5)],
                          autumn_edge=h("#4a3020"), autumn_spots=0.6),
    "maple": dict(shape="palmate", veins="palmate", lobes=[(0.0, 1.0), (1.0, 0.9), (-1.0, 0.9), (1.9, 0.62), (-1.9, 0.62)],
                  body=0.38, lobe_k=2.4, lobe_p=1.2, teeth=0.16, nteeth=9, leaf=0.19, per_twig=4, twigs=6, loose=9,
                  petiole=0.5, fold=0.2, cup=0.15,
                  summer=[(h("#456a26"), 3), (h("#4f752c"), 2), (h("#3b5c20"), 2), (h("#5c8236"), 1)],
                  spring=[(h("#8cb244"), 3), (h("#9cc052"), 2)],
                  autumn=[(h("#d0a032"), 3), (h("#c9772a"), 2), (h("#b0442a"), 1.2), (h("#e0b844"), 1.5), (h("#8a6a2a"), 0.8)],
                  autumn_edge=h("#7a3a1e")),
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
        seasons = [("summer", sp["summer"], {}), ("spring", sp["spring"], {}),
                   ("autumn", sp["autumn"], {"edge": sp.get("autumn_edge"), "spots": sp.get("autumn_spots", 0.25)})]
        n_bytes = None
        if not quick:
            levels = [np.clip(np.round(l), 0, 255) for l in L.box_mips(nt8.astype(np.float32))]
            n_bytes = L.ktx_levels(levels, os.path.join(web, f"{name}_n.ktx2"), False, work)
        prev = []
        for season, pal, sk in seasons:
            albL = L.colour(C, table, pal, sp, sk)
            albL = cv2.resize(albL, (R, R), interpolation=cv2.INTER_AREA)
            srgb = np.clip(np.round(lin_to_srgb(albL) * 255), 0, 255).astype(np.float32)
            srgb = L.bleed(srgb, a8)
            rgba = np.dstack([srgb, a8.astype(np.float32)]).astype(np.uint8)
            tag = "" if season == "summer" else f"_{season}"
            cv2.imwrite(os.path.join(src, f"albedo{tag}.png"), cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
            onL = albL[a > 0.5]
            mean = [round(float(v), 4) for v in onL.mean(0)]
            e = {"material": name, "category": "tree", "kind": "leaf", "source": "texfactory", "id": f"tf_{name}{tag}",
                 "licence": "CC0 (generated)", "season": season, "px": R, "coverage": round(cov, 4),
                 "mean_albedo_linear": mean, "mean_thickness": round(float(th[a > 0.5].mean()), 3),
                 "files": f"generated/trees/{name}{tag}", "n_file": f"generated/trees/{name}_n.ktx2",
                 "url": f"tools/texturefactory (materials/leaves.py, seed {seed})"}
            if not quick:
                lv = [rgba]
                cm = L.coverage_mips(a8)
                cs = L.box_mips(srgb)
                lv = [np.dstack([np.clip(np.round(c), 0, 255), m.astype(np.float32)]) for c, m in zip(cs, cm)]
                e["a_ktx2_bytes"] = L.ktx_levels(lv, os.path.join(web, f"{name}{tag}_a.ktx2"), True, work)
                e["n_ktx2_bytes"] = n_bytes
            entries[e["id"]] = e
            # preview on a mid-grey / sky background
            bg = np.full((R, R, 3), 0.62, f32) * np.array([0.8, 0.9, 1.0], f32)
            pv = lin_to_srgb(albL * 1.6) * a[..., None] + bg * (1 - a[..., None])
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
