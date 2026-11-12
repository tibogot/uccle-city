"""Texture CANDIDATES for the material library (labs/material-lab.html compares them side by side).

    python -E -P tools/textures/candidates.py fetch [id ...]      # download the CC0 candidates (2k JPG) -> data/raw/textures/
    python -E -P tools/textures/candidates.py process [id ...]    # 1k albedo + nra, lattice, mean colour -> cand/ + manifest
    python -E -P tools/textures/candidates.py megascans           # the owner's Fab downloads in data/raw/megascans/<asset>/
    cd tools/textures && node encode_ktx2.mjs --cand [id ...]     # KTX2 (UASTC + zstd) for every processed candidate

Sources:
  Poly Haven (CC0)  https://polyhaven.com     api.polyhaven.com/files/<id>: 2k JPG diffuse, nor_gl, rough, ao
  ambientCG  (CC0)  https://ambientcg.com     <id>_2K-JPG.zip: Color, NormalGL, Roughness, AmbientOcclusion
  Quixel Megascans  (Fab Standard License, NOT CC0): the owner downloads them from fab.com into
                    data/raw/megascans/<asset>/ (git-ignored); docs/materials/MEGASCANS_LIST.md says which asset is for
                    which material (also MEGASCANS below). They are only shown in the lab with a licence badge.

Everything downloaded is untrusted DATA: only read as images / JSON, zip members by base name, nothing executed.

Output (per candidate id, e.g. ph_red_brick):
  viewer/materials/textures/cand/<id>_albedo.{ktx2,webp}  RGB sRGB
  viewer/materials/textures/cand/<id>_nra.{ktx2,webp}     R,G normal x,y (OpenGL +y), B roughness, A AO (linear)
  (git-ignored: the candidate binaries are rebuilt from this script; the owner's chosen ones get promoted and committed)
  viewer/materials/candidates.json  (committed): per material its candidates with source, licence, size per repeat,
  lattice (the scan's brick / tile grid: [columns, rows] per repeat, for the anti-tiling offsets), mean colour,
  bytes on disk / on the GPU.
"""
import io
import json
import os
import sys
import urllib.request
import zipfile

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
RAW = os.path.join(ROOT, "data", "raw", "textures")
MEGA_RAW = os.path.join(ROOT, "data", "raw", "megascans")
CAND = os.path.join(ROOT, "viewer", "materials", "textures", "cand")
WORK = os.path.join(RAW, "_work")
MANIFEST = os.path.join(ROOT, "viewer", "materials", "candidates.json")
UA = {"User-Agent": "uccle-city-texture-fetch/1.1 (CC0 scans for a 3D city)"}

# Uccle brick: 6.5 cm course + 1 cm joint. Brick scans are re-scaled so one course = this (their own size is kept as
# 'size_native_m'); the lab's scanScale slider still scales them.
COURSE_M = {"brick_red_brussels": 0.075, "brick_yellow": 0.075, "brick_dark": 0.075}
# material -> [(source, asset, note)]  ('cur' = the scan the library already ships in viewer/materials/textures/)
CANDIDATES = {
    "brick_red_brussels": [("polyhaven", "red_brick", "cur: the owner's pick over procedural (2026-11-12)"),
                           ("polyhaven", "brick_wall_006", "rustic orange-red, uneven courses"),
                           ("polyhaven", "brick_wall_001", "mixed red / dark headers, Brussels terrace look"),
                           ("ambientcg", "Bricks085", "clean red-brown, pale mortar")],
    "brick_yellow": [("ambientcg", "Bricks105", "beige-yellow rough, running bond"),
                     ("ambientcg", "Bricks016", "clean flat yellow"),
                     ("polyhaven", "yellow_brick", "dirty ochre, deep joints")],
    "brick_dark": [("ambientcg", "Bricks055", "dark brown clinker, pale mortar"),
                   ("ambientcg", "Bricks057", "brown"),
                   ("polyhaven", "dark_brick_wall", "near-black, tinted to the clinker colour"),
                   ("ambientcg", "Bricks056", "dark grey-brown, glazed")],
    "mortar": [("polyhaven", "grey_plaster", "fine grey lime"), ("ambientcg", "Plaster001", "clean matte")],
    "stone_white": [("polyhaven", "sandstone_blocks_08", "cur"), ("ambientcg", "Bricks008", "white ashlar"),
                    ("ambientcg", "Bricks024", "porous white limestone"),
                    ("polyhaven", "white_sandstone_bricks_03", "small coursed white stone")],
    "stone_blue": [("polyhaven", "granite_tile_04", "cur"), ("polyhaven", "stone_tile_wall", "grey ashlar, tooled"),
                   ("polyhaven", "stone_wall_02", "dark tooled blocks")],
    "render_white": [("ambientcg", "Plaster002", "white rough lime"), ("ambientcg", "Plaster004", "white, trowel marks"),
                     ("polyhaven", "white_stucco", "fine stucco"), ("polyhaven", "painted_plaster_wall", "painted, fine")],
    "render_painted": [("polyhaven", "painted_plaster_wall", "neutral, takes the building colour"),
                       ("polyhaven", "beige_wall_002", "beige sand finish"),
                       ("ambientcg", "Plaster007", "white with broken paint")],
    "slate": [("polyhaven", "roof_slates_02", "cur"), ("polyhaven", "roof_slates_03", "blue-grey, regular (Belgian look)"),
              ("ambientcg", "RoofingTiles003", "square slates"), ("polyhaven", "grey_roof_tiles_02", "large slates")],
    "roof_tiles_red": [("polyhaven", "clay_roof_tiles_02", "orange S tiles"), ("polyhaven", "clay_roof_tiles_03", "flat interlocking red"),
                       ("ambientcg", "RoofingTiles014B", "pantile, dirty"), ("ambientcg", "RoofingTiles007", "red, mossy runs")],
    "roof_tiles_flat_dark": [("ambientcg", "RoofingTiles013A", "black flat interlocking"),
                             ("ambientcg", "RoofingTiles009", "dark modern"), ("polyhaven", "grey_roof_01", "dark grey small tiles")],
    "zinc_roof": [("ambientcg", "Metal032", "matte blue-grey"), ("ambientcg", "Metal049C", "dented rough silver")],
    "lead_roof": [("ambientcg", "Metal046B", "dark dirty"), ("ambientcg", "Metal055A", "grey iron, matte")],
    "copper_patina": [("ambientcg", "Metal058C", "cur"), ("ambientcg", "Metal058B", "patina over copper")],
    "painted_metal_white": [("ambientcg", "PaintedMetal012", "white, chipped"), ("ambientcg", "PaintedMetal010", "white, rust"),
                            ("ambientcg", "Metal016", "white rough paint")],
    "cast_iron_green": [("polyhaven", "green_metal_rust", "dark green paint"), ("ambientcg", "PaintedMetal006", "green, rust (tinted)")],
    "wood_frame_white": [("ambientcg", "Wood049", "fine grain (tinted white)"), ("polyhaven", "plywood", "fine grain")],
    "wood_frame_dark": [("ambientcg", "Wood051", "dark stained"), ("ambientcg", "Wood060", "brown hardwood")],
    "cobbles": [("polyhaven", "cobblestone_floor_08", "cur"), ("polyhaven", "cobblestone_floor_03", "grey setts in rows"),
                ("polyhaven", "cobblestone_square", "square setts"), ("ambientcg", "PavingStones070", "pale setts, moss joints")],
    "paving_concrete": [("polyhaven", "concrete_tiles", "cur"), ("polyhaven", "concrete_pavement", "grey slabs"),
                        ("polyhaven", "concrete_pavement_03", "small dark slabs")],
    "asphalt": [("polyhaven", "asphalt_02", "cur"), ("polyhaven", "asphalt_04", "light grey, fine"),
                ("ambientcg", "Asphalt015", "grey road"), ("ambientcg", "Asphalt020S", "dark smooth")],
    "concrete_white": [("ambientcg", "Concrete034", "light smooth"), ("ambientcg", "Concrete046", "white plain"),
                       ("polyhaven", "concrete_wall_008", "board-formed, warm")],
    "rockwork_concrete": [("ambientcg", "Rock030", "rough rock (tinted cream)"), ("ambientcg", "Rock023", "pale layered rock")],
}
# where the library already ships the scan (committed, viewer/materials/textures/<mat>_*)
CURRENT = {"red_brick": "brick_red_brussels", "sandstone_blocks_08": "stone_white", "granite_tile_04": "stone_blue",
           "roof_slates_02": "slate", "cobblestone_floor_08": "cobbles", "asphalt_02": "asphalt",
           "concrete_tiles": "paving_concrete", "Metal058C": "copper_patina"}
PH_MAPS = {"Diffuse": "albedo", "nor_gl": "normal", "Rough": "rough", "AO": "ao"}
ACG_MAPS = {"_Color": "albedo", "_NormalGL": "normal", "_Roughness": "rough", "_AmbientOcclusion": "ao"}


def cid(src, aid):
    return ("ph_" if src == "polyhaven" else "acg_") + aid


def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=180) as r:
        return r.read()


def fetch_one(src, aid):
    out = os.path.join(RAW, src, aid)
    os.makedirs(out, exist_ok=True)
    meta_p = os.path.join(out, "api.json")
    if src == "polyhaven":
        if not os.path.exists(os.path.join(out, "albedo.jpg")) or not os.path.exists(meta_p):
            files = json.loads(get(f"https://api.polyhaven.com/files/{aid}").decode("utf8"))
            for key, role in PH_MAPS.items():
                if key not in files:
                    continue
                dst = os.path.join(out, f"{role}.jpg")
                if not os.path.exists(dst):
                    open(dst, "wb").write(get(files[key]["2k"]["jpg"]["url"]))
            info = json.loads(get(f"https://api.polyhaven.com/info/{aid}").decode("utf8"))
            json.dump({"dimensions_mm": info.get("dimensions"), "name": info.get("name"), "authors": list((info.get("authors") or {}).keys())},
                      open(meta_p, "w"), indent=1)
    else:
        if not os.path.exists(os.path.join(out, "albedo.jpg")):
            z = zipfile.ZipFile(io.BytesIO(get(f"https://ambientcg.com/get?file={aid}_2K-JPG.zip")))
            for name in z.namelist():
                base = os.path.basename(name)
                if not base.lower().endswith(".jpg"):
                    continue
                for key, role in ACG_MAPS.items():
                    if key in base:
                        open(os.path.join(out, f"{role}.jpg"), "wb").write(z.read(name))
        if not os.path.exists(meta_p):
            j = json.loads(get(f"https://ambientcg.com/api/v2/full_json?id={aid}&include=dimensionsData").decode("utf8"))
            a = (j.get("foundAssets") or [{}])[0]
            json.dump({"dimensions_cm": [a.get("dimensionX"), a.get("dimensionY")], "name": a.get("displayName")}, open(meta_p, "w"), indent=1)
    print(f"  fetched {src}/{aid}")


# ------------------------------------------------------------------------------------------------ processing
def srgb_to_lin(a):
    import numpy as np
    a = a / 255.0
    return np.where(a <= 0.04045, a / 12.92, ((a + 0.055) / 1.055) ** 2.4)


def hps_peak(power, lo, hi):
    """fundamental of a pulse train: the peak of the harmonic product spectrum |X(f)| |X(2f)| |X(3f)| in [lo, hi]"""
    import numpy as np
    best, arg = 0.0, None
    for f in range(lo, hi + 1):
        if 3 * f >= len(power):
            break
        v = power[f] * power[2 * f] * power[3 * f]
        if v > best:
            best, arg = v, f
    # significance: the fundamental must stand out of the spectrum's median
    if arg is None or power[arg] < 6 * float(np.median(power[lo:hi + 1])):
        return None
    return arg


def lattice(sig):
    """The scan's grid [units across, courses up] per repeat, from a joint signal (AO, else luminance): the courses from
    the spectrum of the row means (the bed joints run right across), the units from the mean power spectrum of the rows
    (head joints; their phase changes per course, their period doesn't). None when there's no clear grid."""
    import numpy as np
    n = sig.shape[0]
    S = sig - sig.mean()
    py = np.abs(np.fft.rfft(S.mean(axis=1)))
    ny = hps_peak(py, 3, 80)
    if not ny:
        return None
    px = np.sqrt((np.abs(np.fft.rfft(S, axis=1)) ** 2).mean(axis=0))
    nx = hps_peak(px, 2, 40) or 0          # 0: not measured (head joints vary too much): free offsets across
    return [int(nx), int(ny)]


def load(path, mode, size):
    from PIL import Image
    if not os.path.exists(path):
        return None
    im = Image.open(path)
    im.load()
    return im.convert(mode).resize((size, size), Image.LANCZOS)


def process_dir(d, key, size, normal_dx=False):
    """-> (albedo RGBA image, nra RGBA image, stats) or None"""
    import numpy as np
    from PIL import Image
    alb = load(os.path.join(d, "albedo.jpg"), "RGB", size)
    nor = load(os.path.join(d, "normal.jpg"), "RGB", size)
    rough = load(os.path.join(d, "rough.jpg"), "L", size)
    ao = load(os.path.join(d, "ao.jpg"), "L", size) or Image.new("L", (size, size), 255)
    if alb is None or nor is None or rough is None:
        print(f"{key}: missing maps in {d}")
        return None
    nr, ng, _ = nor.split()
    if normal_dx:
        ng = ng.point(lambda v: 255 - v)
    nra = Image.merge("RGBA", (nr, ng, rough, ao))
    a = np.asarray(alb, dtype=np.float64)
    lin = srgb_to_lin(a)
    mean = lin.reshape(-1, 3).mean(axis=0)
    lum = (0.2126 * lin[..., 0] + 0.7152 * lin[..., 1] + 0.0722 * lin[..., 2])
    stats = {"mean_albedo_linear": [round(float(v), 4) for v in mean],
             "mean_roughness": round(float(np.asarray(rough, dtype=np.float64).mean() / 255), 3),
             "lum_std": round(float(lum.std() / max(lum.mean(), 1e-4)), 3),
             "lattice": lattice(np.asarray(ao, dtype=np.float64) if np.asarray(ao).std() > 4 else lum)}
    return alb.convert("RGBA"), nra, stats


def write_maps(key, alb, nra, entry):
    os.makedirs(CAND, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    for role, im in (("albedo", alb), ("nra", nra)):
        raw = os.path.join(WORK, f"cand_{key}_{role}.rgba")
        open(raw, "wb").write(im.tobytes())
        json.dump({"width": im.width, "height": im.height, "out": os.path.join(CAND, f"{key}_{role}.ktx2"), "perceptual": role == "albedo"},
                  open(raw + ".json", "w"))
        p = os.path.join(CAND, f"{key}_{role}.webp")
        (im.convert("RGB") if role == "albedo" else im).save(p, "WEBP", quality=86, method=5)
        entry[f"{role}_webp_bytes"] = os.path.getsize(p)


def size_for(mat, meta, stats):
    native = None
    dm = meta.get("dimensions_mm")
    dc = meta.get("dimensions_cm")
    if dm and dm[0] and dm[0] > 1:
        native = dm[0] / 1000
    elif dc and dc[0]:
        native = dc[0] / 100
    size = native
    lat = stats.get("lattice")
    if mat in COURSE_M and lat:
        size = round(lat[1] * COURSE_M[mat], 3)
    if not size:
        size = 2.0
    return round(size, 3), native


def load_manifest():
    return json.load(open(MANIFEST, encoding="utf8")) if os.path.exists(MANIFEST) else {"materials": {}}


def save_manifest(m):
    m["about"] = ("Texture candidates per library material (tools/textures/candidates.py). files: path under "
                  "viewer/materials/ without the _albedo / _nra suffix; kind cc0 | megascans (Fab licence: not for the "
                  "public site before the owner's licence check). lattice = [units across, courses up] per repeat "
                  "(anti-tiling offsets snap to it); size_m = metres per repeat.")
    json.dump(m, open(MANIFEST, "w", encoding="utf8"), indent=1)


def process(only, size=1024):
    man = load_manifest()
    for mat, lst in CANDIDATES.items():
        for src, aid, note in lst:
            key = cid(src, aid)
            if only and key not in only and aid not in only and mat not in only:
                continue
            d = os.path.join(RAW, src, aid)
            meta = json.load(open(os.path.join(d, "api.json"))) if os.path.exists(os.path.join(d, "api.json")) else {}
            r = process_dir(d, key, size)
            if not r:
                continue
            alb, nra, stats = r
            size_m, native = size_for(mat, meta, stats)
            cur = CURRENT.get(aid) == mat
            entry = {"id": key, "source": src, "asset": aid, "name": meta.get("name") or aid, "licence": "CC0", "kind": "cc0",
                     "url": f"https://polyhaven.com/a/{aid}" if src == "polyhaven" else f"https://ambientcg.com/view?id={aid}",
                     "size_m": size_m, "size_native_m": native, "px": size, "note": note, "current": cur, **stats}
            if cur:
                entry["files"] = f"textures/{mat}"
                old = json.load(open(os.path.join(ROOT, "viewer", "materials", "textures", "scans.json")))[mat]
                for k in ("albedo_webp_bytes", "nra_webp_bytes", "albedo_ktx2_bytes", "nra_ktx2_bytes"):
                    entry[k] = old.get(k)
            else:
                entry["files"] = f"textures/cand/{key}"
                write_maps(key, alb, nra, entry)
                prev = next((c for c in man["materials"].get(mat, []) if c["id"] == key), {})
                for k in ("albedo_ktx2_bytes", "nra_ktx2_bytes"):
                    if prev.get(k):
                        entry[k] = prev[k]
            lst2 = [c for c in man["materials"].get(mat, []) if c["id"] != key]
            lst2.append(entry)
            order = [cid(s, a) for s, a, _ in CANDIDATES[mat]]
            lst2.sort(key=lambda c: (c.get("kind") == "megascans", order.index(c["id"]) if c["id"] in order else 99))
            man["materials"][mat] = lst2
            print(f"{mat}: {key} size {size_m} m (native {native}) lattice {stats['lattice']} mean {stats['mean_albedo_linear']}")
    save_manifest(man)


# ------------------------------------------------------------------------------------------------ Megascans (owner's downloads)
# folder name (or the Megascans id in it) -> library material. Filled from docs/materials/MEGASCANS_LIST.md; a folder can
# also carry a 'material.txt' with the material name.
MEGASCANS = json.load(open(os.path.join(os.path.dirname(__file__), "megascans.json"), encoding="utf8")) \
    if os.path.exists(os.path.join(os.path.dirname(__file__), "megascans.json")) else {}


def find(d, *keys):
    for f in sorted(os.listdir(d)):
        fl = f.lower()
        if fl.endswith((".jpg", ".jpeg", ".png", ".exr", ".tif", ".tiff")) and any(k in fl for k in keys):
            return os.path.join(d, f)
    return None


def megascans(size=1024):
    """data/raw/megascans/<asset>/ with the Fab / Bridge export: *_Albedo|_BaseColor, *_Normal (OpenGL unless the name
    says DX / a meta says so), *_Roughness, *_AO; the asset's .json (Megascans metadata) gives the scan area."""
    import shutil
    if not os.path.isdir(MEGA_RAW):
        print(f"no {MEGA_RAW}: nothing to do (the owner drops the Fab downloads there)")
        return
    man = load_manifest()
    tmp = os.path.join(WORK, "_mega")
    for asset in sorted(os.listdir(MEGA_RAW)):
        d = os.path.join(MEGA_RAW, asset)
        if not os.path.isdir(d):
            continue
        # the export may sit one folder down
        subs = [os.path.join(d, s) for s in os.listdir(d) if os.path.isdir(os.path.join(d, s))]
        src_dir = d if find(d, "albedo", "basecolor", "base_color") else (subs[0] if subs else d)
        mat = None
        if os.path.exists(os.path.join(d, "material.txt")):
            mat = open(os.path.join(d, "material.txt"), encoding="utf8").read().strip()
        for k, v in MEGASCANS.items():
            if k.lower() in asset.lower():
                mat = mat or v["material"]
        if not mat:
            print(f"{asset}: which material? add it to tools/textures/megascans.json or a material.txt")
            continue
        alb = find(src_dir, "albedo", "basecolor", "base_color")
        nor = find(src_dir, "normal")
        rough = find(src_dir, "roughness", "rough")
        ao = find(src_dir, "_ao", "ambientocclusion", "occlusion", "cavity")
        if not (alb and nor and rough):
            print(f"{asset}: needs albedo + normal + roughness maps in {src_dir}")
            continue
        os.makedirs(tmp, exist_ok=True)
        for role, p in (("albedo", alb), ("normal", nor), ("rough", rough), ("ao", ao)):
            if p:
                shutil.copyfile(p, os.path.join(tmp, f"{role}.jpg" if p.lower().endswith((".jpg", ".jpeg")) else f"{role}.jpg"))
            elif os.path.exists(os.path.join(tmp, f"{role}.jpg")):
                os.remove(os.path.join(tmp, f"{role}.jpg"))
        dx = "dx" in os.path.basename(nor).lower() or MEGASCANS.get(asset, {}).get("normal") == "dx"
        size_m = None
        for f in os.listdir(src_dir):
            if f.lower().endswith(".json"):
                try:
                    j = json.load(open(os.path.join(src_dir, f), encoding="utf8"))
                    for m in j.get("meta", []):
                        if m.get("key") in ("scanArea", "scan_area", "size"):
                            size_m = float(str(m.get("value")).lower().split("x")[0].replace("m", "").strip())
                except Exception:  # noqa: BLE001 (metadata is optional)
                    pass
        key = "mega_" + "".join(c if c.isalnum() else "_" for c in asset)[:48]
        r = process_dir(tmp, key, size, normal_dx=dx)
        if not r:
            continue
        a, nra, stats = r
        if mat in COURSE_M and stats.get("lattice"):
            size_m = round(stats["lattice"][1] * COURSE_M[mat], 3)
        entry = {"id": key, "source": "megascans", "asset": asset, "name": asset, "licence": "Fab Standard License (NOT CC0)",
                 "kind": "megascans", "url": MEGASCANS.get(asset, {}).get("url", "https://www.fab.com/"), "size_m": size_m or 2.0,
                 "px": size, "note": "Megascans: licence check before public", "current": False, "files": f"textures/cand/{key}", **stats}
        write_maps(key, a, nra, entry)
        lst = [c for c in man["materials"].get(mat, []) if c["id"] != key] + [entry]
        man["materials"][mat] = lst
        print(f"{mat}: {key} (Megascans) size {entry['size_m']} m lattice {stats['lattice']}")
    save_manifest(man)
    print("now: cd tools/textures && node encode_ktx2.mjs --cand")


if __name__ == "__main__":
    cmd, args = (sys.argv[1] if len(sys.argv) > 1 else "process"), sys.argv[2:]
    if cmd == "fetch":
        for mat, lst in CANDIDATES.items():
            for src, aid, _ in lst:
                if args and cid(src, aid) not in args and aid not in args and mat not in args:
                    continue
                try:
                    fetch_one(src, aid)
                except Exception as e:  # noqa: BLE001
                    print(f"  FAILED {src}/{aid}: {e}")
    elif cmd == "process":
        process(set(args))
    elif cmd == "megascans":
        megascans()
