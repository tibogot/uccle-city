"""Process the raw CC0 scans (tools/textures/fetch_textures.py -> data/raw/textures/) for the material library.

Per material, at 1024 px (the scans are 2k; 1-3 m per repeat -> 1-3 mm per texel, enough as DETAIL maps; the
library adds the macro variation so the repeat never shows):
  <mat>_albedo  RGB  (sRGB)                      -> KTX2 (tools/textures/encode_ktx2.mjs) or WebP fallback
  <mat>_nra     R,G = normal x,y (OpenGL, +y up), B = roughness, A = ambient occlusion (linear)
The raw RGBA is written to data/raw/textures/_work/ (git-ignored) for the KTX2 encoder; the WebP fallback goes to
viewer/materials/textures/ only with --webp. A manifest (viewer/materials/textures/scans.json) records each scan's
source, licence, real size per repeat, the mean linear albedo / roughness (the far-fade colour) and file sizes.

Run with:  python -E -P tools/textures/process_textures.py [--webp] [--size 1024]
(-E -P: no environment / no script-dir imports; the raw files are only read as images.)
"""
import json
import os
import sys

from PIL import Image

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fetch_textures import RAW, ROOT, SCANS  # noqa: E402

OUT = os.path.join(ROOT, "viewer", "materials", "textures")
WORK = os.path.join(RAW, "_work")
Image.MAX_IMAGE_PIXELS = 64_000_000


def srgb_to_lin(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def load(path, mode, size):
    if not os.path.exists(path):
        return None
    im = Image.open(path)
    im.load()
    return im.convert(mode).resize((size, size), Image.LANCZOS)


def main():
    size = int(sys.argv[sys.argv.index("--size") + 1]) if "--size" in sys.argv else 1024
    webp = "--webp" in sys.argv
    os.makedirs(OUT, exist_ok=True)
    os.makedirs(WORK, exist_ok=True)
    manifest = {}
    for mat, (src, aid, size_m) in SCANS.items():
        d = os.path.join(RAW, src, aid)
        alb = load(os.path.join(d, "albedo.jpg"), "RGB", size)
        nor = load(os.path.join(d, "normal.jpg"), "RGB", size)
        rough = load(os.path.join(d, "rough.jpg"), "L", size)
        ao = load(os.path.join(d, "ao.jpg"), "L", size) or Image.new("L", (size, size), 255)
        if alb is None or nor is None or rough is None:
            print(f"{mat}: missing raw maps in {d}, run fetch_textures.py")
            continue
        nr, ng, _ = nor.split()
        nra = Image.merge("RGBA", (nr, ng, rough, ao))
        # mean linear albedo / roughness (the colour the material fades to far away)
        small = alb.resize((64, 64), Image.BOX)
        px = list(small.getdata())
        mean = [sum(srgb_to_lin(p[k]) for p in px) / len(px) for k in range(3)]
        mean_r = sum(rough.resize((64, 64), Image.BOX).getdata()) / 4096 / 255
        entry = {"source": src, "id": aid, "licence": "CC0", "size_m": size_m, "px": size,
                 "mean_albedo_linear": [round(v, 4) for v in mean], "mean_roughness": round(mean_r, 3),
                 "url": f"https://{'polyhaven.com/a/' if src == 'polyhaven' else 'ambientcg.com/view?id='}{aid}"}
        for role, im in (("albedo", alb.convert("RGBA")), ("nra", nra)):
            raw = os.path.join(WORK, f"{mat}_{role}.rgba")
            open(raw, "wb").write(im.tobytes())
            json.dump({"width": size, "height": size}, open(raw + ".json", "w"))
            if webp:
                p = os.path.join(OUT, f"{mat}_{role}.webp")
                (im.convert("RGB") if role == "albedo" else im).save(p, "WEBP", quality=88, method=6)
                entry[f"{role}_webp_bytes"] = os.path.getsize(p)
        manifest[mat] = entry
        print(f"{mat}: {aid} mean {entry['mean_albedo_linear']} rough {entry['mean_roughness']}")
    mp = os.path.join(OUT, "scans.json")
    old = json.load(open(mp)) if os.path.exists(mp) else {}
    for k, v in manifest.items():
        v.update({kk: vv for kk, vv in old.get(k, {}).items() if kk.endswith("_ktx2_bytes")})
    json.dump(manifest, open(mp, "w"), indent=1)


if __name__ == "__main__":
    main()
