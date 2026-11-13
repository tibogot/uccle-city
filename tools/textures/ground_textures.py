"""GROUND textures for the terrain (viewer/ground.js, docs/materials/GROUND.md): one CC0 scan per land cover, packed
by viewer/materials/groundTex.js into two texture ARRAYS (albedo, nra) so the one shared ground shader stays within
WebGPU's 16 sampled textures.

    python -E -P tools/textures/ground_textures.py fetch [id ...]   # CC0 candidates (2k JPG) -> data/raw/textures/
    python -E -P tools/textures/ground_textures.py sheet            # contact sheet of the candidates -> scratch PNG
    python -E -P tools/textures/ground_textures.py build            # the PICKS -> 1k albedo + nra raw RGBA + ground.json
    cd tools/textures && node encode_ktx2.mjs --ground              # KTX2 (UASTC + RDO) -> viewer/materials/textures/ground/

Downloads are untrusted DATA: read as images / JSON only (candidates.fetch_one), nothing executed. The picks' KTX2 are
committed (viewer/materials/textures/ground/, like the library's shipped scans); the raw downloads are not
(data/raw/ is git-ignored) and can be deleted after `build`.
"""
import json
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import candidates as C  # noqa: E402

OUT = os.path.join(C.ROOT, "viewer", "materials", "textures", "ground")

# cover -> candidates (source, asset, note); the PICK is PICK_ID (chosen from the contact sheet next to
# Brussels reality, docs/materials/GROUND.md: PICK_ID below)
GROUND = {
    "lawn": [("ambientcg", "Grass004", "dense short garden lawn"), ("ambientcg", "Grass005", "clean short"), ("ambientcg", "Grass008", "lawn")],
    "rough": [("ambientcg", "Grass001", "dark dense"), ("ambientcg", "Grass007", "lawn with moss and weeds"), ("polyhaven", "leafy_grass", "leafy, clover"),
              ("ambientcg", "Grass002", "longer grass")],
    "dry": [("polyhaven", "sparse_grass", "thin grass over soil"), ("polyhaven", "grass_path_2", "trodden grass"),
            ("ambientcg", "Ground003", "grass and dirt")],
    "forest": [("polyhaven", "forest_leaves_02", "leaf litter"), ("polyhaven", "forest_leaves_03", "leaf litter, darker"),
               ("polyhaven", "brown_mud_leaves_01", "mud and leaves"), ("ambientcg", "Ground037", "damp forest, moss"),
               ("ambientcg", "ScatteredLeaves008", "autumn leaves")],
    "gravel": [("ambientcg", "Gravel038", "beige light gravel"), ("ambientcg", "Gravel037", "beige clean"),
               ("ambientcg", "Ground032", "gravel path"), ("polyhaven", "gravel_floor_02", "fine gravel"),
               ("polyhaven", "park_dirt", "park path dirt")],
    "soil": [("polyhaven", "brown_mud_02", "brown soil"), ("ambientcg", "Ground048", "brown soil"),
             ("polyhaven", "dirt_floor", "dirt")],
    "sand": [("polyhaven", "playground_sand", "playground sand"), ("polyhaven", "park_sand", "park sand"),
             ("ambientcg", "Ground054", "beach sand, mud")],
}
ORDER = list(GROUND)              # the array layer of each cover (viewer/materials/groundTex.js reads ground.json)
# the picks (2026-11-13, contact sheet at one scale next to Brussels lawns / Soignes beech litter / park paths):
#   lawn Grass004 (olive, not the saturated golf green of 005 / 008), rough Grass001 (darker, denser), dry Ground003
#   (thin grass over soil: verges, worn lawn), forest forest_leaves_02 (russet beech-like litter, moss, twigs), gravel
#   Gravel037 (pale beige: the dolomite paths), soil Ground048 (plain brown loam), sand Ground054 (beige sand).
PICK_ID = {"lawn": "Grass004", "rough": "Grass001", "dry": "Ground003", "forest": "forest_leaves_02",
           "gravel": "Gravel037", "soil": "Ground048", "sand": "Ground054"}
PICK = {k: next(c for c in v if c[1] == PICK_ID[k]) for k, v in GROUND.items()}


def raw_dir(src, aid):
    return os.path.join(C.RAW, src, aid)


def native_size(src, aid):
    p = os.path.join(raw_dir(src, aid), "api.json")
    meta = json.load(open(p)) if os.path.exists(p) else {}
    dm, dc = meta.get("dimensions_mm"), meta.get("dimensions_cm")
    if dm and dm[0] and dm[0] > 1:
        return dm[0] / 1000, meta
    if dc and dc[0]:
        return dc[0] / 100, meta
    return None, meta


def fetch(only):
    for cover, lst in GROUND.items():
        for src, aid, _ in lst:
            if only and aid not in only and cover not in only:
                continue
            try:
                C.fetch_one(src, aid)
            except Exception as e:  # noqa: BLE001
                print(f"  FAILED {src}/{aid}: {e}")


def sheet(path):
    """every candidate at the SAME scale (64 px per metre, a 4 x 4 m patch, tiled at its real size), name + size"""
    from PIL import Image, ImageDraw
    PPM, M = 64, 4
    rows = []
    for cover, lst in GROUND.items():
        row = []
        for src, aid, note in lst:
            d = raw_dir(src, aid)
            if not os.path.exists(os.path.join(d, "albedo.jpg")):
                continue
            size, _ = native_size(src, aid)
            size = size or 2.0
            px = max(8, int(round(size * PPM)))
            im = Image.open(os.path.join(d, "albedo.jpg")).convert("RGB").resize((px, px), Image.LANCZOS)
            tile = Image.new("RGB", (PPM * M, PPM * M + 30), (20, 20, 20))
            for y in range(0, PPM * M, px):
                for x in range(0, PPM * M, px):
                    tile.paste(im, (x, y))
            g = ImageDraw.Draw(tile)
            g.rectangle([0, PPM * M, PPM * M, PPM * M + 30], fill=(20, 20, 20))
            g.text((4, PPM * M + 2), f"{cover}: {aid}", fill=(255, 255, 255))
            g.text((4, PPM * M + 16), f"{size:.2f} m  {note[:30]}", fill=(190, 190, 190))
            row.append(tile)
        if row:
            rows.append(row)
    W = max(len(r) for r in rows) * (PPM * M + 6)
    H = len(rows) * (PPM * M + 36)
    out = Image.new("RGB", (W, H), (0, 0, 0))
    for j, r in enumerate(rows):
        for i, t in enumerate(r):
            out.paste(t, (i * (PPM * M + 6), j * (PPM * M + 36)))
    out.save(path)
    print(f"sheet -> {path} ({W}x{H})")


def build(size=1024):
    """the picks -> data/raw/textures/_work/ground_<cover>_{albedo,nra}.rgba (+ .json) and ground.json"""
    os.makedirs(C.WORK, exist_ok=True)
    os.makedirs(OUT, exist_ok=True)
    mp = os.path.join(OUT, "ground.json")
    old = json.load(open(mp, encoding="utf8")) if os.path.exists(mp) else {}
    layers = []
    for i, cover in enumerate(ORDER):
        src, aid, note = PICK[cover]
        r = C.process_dir(raw_dir(src, aid), cover, size)
        if not r:
            raise SystemExit(f"{cover}: {src}/{aid} not fetched")
        alb, nra, stats = r
        native, meta = native_size(src, aid)
        for role, im in (("albedo", alb), ("nra", nra)):
            raw = os.path.join(C.WORK, f"ground_{cover}_{role}.rgba")
            open(raw, "wb").write(im.tobytes())
            json.dump({"width": im.width, "height": im.height, "out": os.path.join(OUT, f"{cover}_{role}.ktx2")}, open(raw + ".json", "w"))
        prev = next((l for l in old.get("layers", []) if l.get("cover") == cover and l.get("asset") == aid), {})
        e = {"cover": cover, "layer": i, "source": src, "asset": aid, "name": meta.get("name") or aid, "licence": "CC0",
             "url": f"https://polyhaven.com/a/{aid}" if src == "polyhaven" else f"https://ambientcg.com/view?id={aid}",
             "authors": meta.get("authors"), "size_m": round(native or 2.0, 3), "px": size, "note": note,
             "mean_albedo_linear": stats["mean_albedo_linear"], "mean_roughness": stats["mean_roughness"], "lum_std": stats["lum_std"]}
        for k in ("albedo_ktx2_bytes", "nra_ktx2_bytes"):
            if prev.get(k):
                e[k] = prev[k]
        layers.append(e)
        print(f"{i} {cover}: {src}/{aid} {e['size_m']} m mean {e['mean_albedo_linear']} rough {e['mean_roughness']}")
    json.dump({"about": "Ground textures per land cover (tools/textures/ground_textures.py): layer = index in the albedo / nra "
                        "texture arrays (viewer/materials/groundTex.js); size_m = metres per repeat. CC0 sources, docs/materials/GROUND.md.",
               "px": size, "layers": layers}, open(mp, "w", encoding="utf8"), indent=1)


if __name__ == "__main__":
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else "sheet"), sys.argv[2:]
    if cmd == "fetch":
        fetch(set(args))
    elif cmd == "sheet":
        sheet(args[0] if args else os.path.join(C.RAW, "ground_sheet.png"))
    elif cmd == "build":
        build()
