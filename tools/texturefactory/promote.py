"""PROMOTE the chosen set of each material to the library's SHIPPED texture (the default the city uses):
copies its 1K KTX2 (+ a WebP fallback) to viewer/materials/textures/<mat>_{albedo,nra}.{ktx2,webp} (committed, like the
shipped scans: a fresh checkout / Vercel has them) and writes its entry in viewer/materials/textures/scans.json.

    python -E -P tools/texturefactory/promote.py [material ...]

PICKS (owner's decision 2026-11-13: ties go to the factory; the variant is ours, see docs/TEXTURE_FACTORY.md
"Shipped defaults"): a factory set ("tf_<mat>_<variant>_1k"), a CC0 candidate id (viewer/materials/candidates.json),
or "keep" (the shipped scan stays). `tint` = the default scanTint (0: the set's own colour; the CC0 scans keep the
lab's 0.35 pull toward the library colour).
"""
import json
import os
import shutil
import subprocess
import sys

import cv2

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from tf.bake import WT  # noqa: E402

MATDIR = os.path.join(WT, "viewer", "materials")
TEX = os.path.join(MATDIR, "textures")

PICKS = {
    "stone_blue": "tf_stone_blue_a_1k",                # bush-hammered petit granit, drafted margin
    "slate": "tf_slate_c_1k",                          # regular, dark Belgian slate
    "paving_concrete": "tf_paving_concrete_a_1k",      # grey 30 cm tiles, gum, stains
    "brick_dark": "tf_brick_dark_a_1k",                # purple-brown clinker, part glazed
    "brick_yellow": "tf_brick_yellow_a_1k",            # buff stretcher bond, grey lime joints
    "asphalt": "tf_asphalt_a_1k",                      # aged Brussels asphalt, porphyry chips (roads switch after roads2)
    "render_white": "tf_render_white_a_1k",            # white-washed lime render
    "roof_tiles_red": "acg_RoofingTiles014B",          # CC0 pantile scan (the factory pantiles read corrugated)
    "brick_red_brussels": "keep",                      # ph red_brick, the owner's pick
    "stone_white": "keep",                             # ph sandstone_blocks_08
    "cobbles": "keep",                                 # ph cobblestone_floor_08
    "copper_patina": "keep",
}
TINT_SCAN = 0.35
KEYS = ("source", "id", "licence", "size_m", "px", "lattice", "mean_albedo_linear", "mean_roughness", "url")


def main():
    only = sys.argv[1:]
    gen = json.load(open(os.path.join(MATDIR, "generated", "generated.json")))
    cands = {c["id"]: c for l in json.load(open(os.path.join(MATDIR, "candidates.json")))["materials"].values() for c in l}
    sp = os.path.join(TEX, "scans.json")
    scans = json.load(open(sp))
    for mat, pick in PICKS.items():
        if only and mat not in only:
            continue
        if pick == "keep":
            if mat in scans:
                c = next((c for c in cands.values() if c.get("current") and c["files"] == f"textures/{mat}"), None)
                if c and c.get("lattice") and not scans[mat].get("lattice"):
                    scans[mat]["lattice"] = c["lattice"]
                scans[mat].setdefault("tint", TINT_SCAN)
            continue
        e = gen.get(pick) or cands.get(pick)
        if not e:
            print(f"{mat}: {pick} not found")
            continue
        src = os.path.join(MATDIR, e["files"])
        for role in ("albedo", "nra"):
            k = src + f"_{role}.ktx2"
            if not os.path.exists(k):
                raise SystemExit(f"{mat}: {k} missing (build + encode first)")
            shutil.copyfile(k, os.path.join(TEX, f"{mat}_{role}.ktx2"))
            # the WebP fallback, lossy like the shipped scans' (process_textures.py: quality 88)
            im = cv2.imread(src + f"_{role}.webp", cv2.IMREAD_UNCHANGED)
            cv2.imwrite(os.path.join(TEX, f"{mat}_{role}.webp"), im, [cv2.IMWRITE_WEBP_QUALITY, 88])
        ent = {k: e[k] for k in KEYS if k in e}
        if e.get("source") == "texfactory":
            ent["id"] = pick
            ent["licence"] = "CC0 (generated)"
            ent["generator"] = f"tools/texturefactory ({e['url'].split('(')[-1].rstrip(')')})"
            ent["tint"] = 0.0
        else:
            ent["id"] = e.get("asset", pick)
            ent["tint"] = TINT_SCAN
        for role in ("albedo", "nra"):
            ent[f"{role}_webp_bytes"] = os.path.getsize(os.path.join(TEX, f"{mat}_{role}.webp"))
            ent[f"{role}_ktx2_bytes"] = os.path.getsize(os.path.join(TEX, f"{mat}_{role}.ktx2"))
        scans[mat] = ent
        print(f"{mat}: {pick} -> textures/{mat}_* ({(ent['albedo_ktx2_bytes'] + ent['nra_ktx2_bytes']) / 1048576:.2f} MB KTX2)")
    json.dump(scans, open(sp, "w"), indent=1)
    relink([m for m in PICKS if PICKS[m] != "keep" and (not only or m in only)])


def relink(mats):
    """candidates.json: the pick becomes `current`; a previously shipped scan (files textures/<mat>, now overwritten)
    gets its files back from git HEAD into textures/cand/ (git-ignored, like every candidate) and stays reviewable"""
    cp = os.path.join(MATDIR, "candidates.json")
    man = json.load(open(cp, encoding="utf8"))
    for mat in mats:
        pick = PICKS[mat]
        for c in man["materials"].get(mat, []):
            if c.get("files") == f"textures/{mat}" and c["id"] != pick:
                for role in ("albedo", "nra"):
                    for ext in ("ktx2", "webp"):
                        data = subprocess.run(["git", "-C", WT, "show", f"HEAD:viewer/materials/textures/{mat}_{role}.{ext}"], capture_output=True).stdout
                        if data:
                            open(os.path.join(TEX, "cand", f"{c['id']}_{role}.{ext}"), "wb").write(data)
                c["files"] = f"textures/cand/{c['id']}"
                c["note"] = (c.get("note", "") + " (shipped until 2026-11-13)").strip()
            c["current"] = c["id"] == pick
    json.dump(man, open(cp, "w", encoding="utf8"), indent=1)


if __name__ == "__main__":
    main()
